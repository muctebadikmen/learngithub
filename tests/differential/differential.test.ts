// tests/differential/differential.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';
import type { GitAction, RepoState } from '../../src/engine/types';
import { canonicalOfEngine, canonicalOfReal, RealGit } from './harness';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

// CONSTRAINTS on sequences (see plan header): unique commit messages; targets are
// branch names / HEAD~n / HEAD@{n} only; tree is clean before every `switch`.
const SEQUENCES: Record<string, GitAction[]> = {
  'linear commits': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    write('a.txt', 'two'), write('b.txt', 'bee'), addF('a.txt', 'b.txt'), commitM('c2'),
  ],
  'branch, switch, commit on branch, switch back': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    { cmd: 'switch', target: 'feature', create: true },
    write('a.txt', 'feat'), addF('a.txt'), commitM('c2 on feature'),
    { cmd: 'switch', target: 'main' },
  ],
  'detached HEAD via HEAD~1': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    { cmd: 'switch', target: 'HEAD~1', detach: true },
  ],
  'reset soft / mixed / hard': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    write('a.txt', 'three'), addF('a.txt'), commitM('c3'),
    { cmd: 'reset', mode: 'soft', target: 'HEAD~1' },
    { cmd: 'reset', mode: 'mixed', target: 'HEAD~1' },
    { cmd: 'reset', mode: 'hard', target: 'main' },
  ],
  'reflog rescue after hard reset': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    { cmd: 'reset', mode: 'hard', target: 'HEAD~1' },
    { cmd: 'switch', target: 'HEAD@{1}', detach: true },
  ],
  'amend': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    write('a.txt', 'two fixed'), addF('a.txt'),
    { cmd: 'commit', message: 'c2 fixed', amend: true },
  ],
  'restore worktree and --staged': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
    write('a.txt', 'oops'), { cmd: 'restore', paths: ['a.txt'] },
    write('a.txt', 'two'), addF('a.txt'), { cmd: 'restore', paths: ['a.txt'], staged: true },
  ],
  'THE TRAP: commit <path> consumes the staged snapshot (fsck cross-check)': [
    { cmd: 'init' },
    write('a.txt', 'one'), addF('a.txt'), commitM('c1: base'),
    write('a.txt', 'two'), addF('a.txt'),
    write('a.txt', 'three'),
    { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] },
  ],
};

describe('differential: engine vs real git', () => {
  let rg: RealGit | undefined;
  afterEach(() => { rg?.dispose(); rg = undefined; });

  for (const [name, actions] of Object.entries(SEQUENCES)) {
    it(name, () => {
      rg = new RealGit();
      let state: RepoState = initialState();
      for (const a of actions) {
        const r = reduce(state, a);
        const err = r.events.find((e) => e.kind === 'error');
        if (err) throw new Error(`engine error on ${JSON.stringify(a)}: ${JSON.stringify(err)}`);
        state = r.state;
        rg.apply(a);
      }
      expect(canonicalOfEngine(state)).toEqual(canonicalOfReal(rg));
    });
  }
});
