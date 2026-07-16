// tests/differential/harness.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GitAction, Oid, RepoState } from '../../src/engine/types';
import { getBlob, getCommit } from '../../src/engine/store';
import { danglingBlobs } from '../../src/engine/queries';

export interface CanonicalRepo {
  commits: { message: string; parents: string[] }[];
  branches: Record<string, string>;
  head: string;
  index: Record<string, string>;
  worktree: Record<string, string>;
  danglingBlobContents: string[];
}

export class RealGit {
  readonly dir: string;
  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), 'gitgame-diff-'));
  }
  git(...args: string[]): string {
    // Force the C locale: on some machines (notably macOS with a non-English system
    // locale) git's NLS-translated output (e.g. "dangling blob" -> "sarkan blob" under
    // a Turkish locale) breaks the English-only parsing below even though no LANG/
    // LC_ALL env var is set — git falls back to the OS locale in that case. This is an
    // invocation detail, not a change to the canonical-form parsing logic itself.
    return execFileSync('git', args, {
      cwd: this.dir,
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C', LANG: 'C', LANGUAGE: 'C' },
    }).trim();
  }
  dispose(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
  apply(a: GitAction): void {
    switch (a.cmd) {
      case 'init':
        this.git('init', '-b', 'main');
        this.git('config', 'user.email', 'diff@test');
        this.git('config', 'user.name', 'Diff');
        break;
      case 'writeFile': writeFileSync(join(this.dir, a.path), a.content); break;
      case 'add': this.git('add', '--', ...a.paths); break;
      case 'commit': {
        const args = ['commit', '-m', a.message];
        if (a.amend) args.splice(1, 0, '--amend');
        if (a.paths) args.push('--', ...a.paths);
        this.git(...args);
        break;
      }
      case 'branch': this.git('branch', a.name); break;
      case 'switch':
        if (a.create) this.git('switch', '-c', a.target);
        else if (a.detach) this.git('switch', '--detach', a.target);
        else this.git('switch', a.target);
        break;
      case 'reset': this.git('reset', `--${a.mode}`, a.target); break;
      case 'restore':
        this.git('restore', ...(a.staged ? ['--staged'] : []), '--', ...a.paths);
        break;
    }
  }
}

export function canonicalOfReal(rg: RealGit): CanonicalRepo {
  const msgOf = new Map<string, string>();      // sha -> message
  const parentsOf = new Map<string, string[]>();
  const logOut = rg.git('log', '--all', '--reflog', '--format=%H|%P|%s');
  for (const line of logOut.split('\n').filter(Boolean)) {
    const [h, p, s] = line.split('|');
    msgOf.set(h, s);
    parentsOf.set(h, p ? p.split(' ').filter(Boolean) : []);
  }
  const commits = [...msgOf.keys()]
    .map((h) => ({ message: msgOf.get(h)!, parents: parentsOf.get(h)!.map((ph) => msgOf.get(ph)!) }))
    .sort((a, b) => a.message.localeCompare(b.message));

  const branches: Record<string, string> = {};
  const refsOut = rg.git('for-each-ref', 'refs/heads', '--format=%(refname:short)|%(objectname)');
  for (const line of refsOut.split('\n').filter(Boolean)) {
    const [name, sha] = line.split('|');
    branches[name] = msgOf.get(sha)!;
  }

  let head: string;
  try {
    head = 'branch:' + rg.git('symbolic-ref', '--short', 'HEAD');
  } catch {
    head = 'detached:' + msgOf.get(rg.git('rev-parse', 'HEAD'))!;
  }

  const index: Record<string, string> = {};
  const lsOut = rg.git('ls-files', '--stage');
  for (const line of lsOut.split('\n').filter(Boolean)) {
    const [meta, path] = line.split('\t');
    const blobSha = meta.split(' ')[1];
    index[path] = rg.git('cat-file', 'blob', blobSha);
  }

  const worktree: Record<string, string> = {};
  for (const f of readdirSync(rg.dir)) {
    if (f === '.git') continue;
    worktree[f] = readFileSync(join(rg.dir, f), 'utf8');
  }

  const danglingBlobContents: string[] = [];
  let fsckOut = '';
  try { fsckOut = rg.git('fsck', '--dangling'); } catch { /* clean repo: exit 0 anyway */ }
  for (const line of fsckOut.split('\n')) {
    const m = line.match(/^dangling blob ([0-9a-f]+)$/);
    if (m) danglingBlobContents.push(rg.git('cat-file', 'blob', m[1]));
  }
  danglingBlobContents.sort();

  return { commits, branches, head, index, worktree, danglingBlobContents };
}

export function canonicalOfEngine(state: RepoState): CanonicalRepo {
  const msgOf = (oid: Oid) => getCommit(state, oid).message;
  const commits = state.insertionOrder
    .map((oid) => ({
      message: msgOf(oid),
      parents: getCommit(state, oid).parents.map(msgOf),
    }))
    .sort((a, b) => a.message.localeCompare(b.message));

  const branches: Record<string, string> = {};
  for (const [name, oid] of Object.entries(state.branches)) branches[name] = msgOf(oid);

  const head =
    state.head.kind === 'branch' ? 'branch:' + state.head.name : 'detached:' + msgOf(state.head.oid);

  const index: Record<string, string> = {};
  for (const [path, blobOid] of Object.entries(state.index)) {
    index[path] = getBlob(state, blobOid).content;
  }

  return {
    commits,
    branches,
    head,
    index,
    worktree: { ...state.workingDir },
    danglingBlobContents: danglingBlobs(state).map((o) => getBlob(state, o).content).sort(),
  };
}
