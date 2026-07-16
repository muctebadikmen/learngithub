# Phase 1: Foundation & Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed placeholder page plus the complete, differential-tested git engine for the
Topics 1–4 slice (spec §15 steps 0, 1, 1b).

**Architecture:** The engine is one pure function, `reduce(state, action) => { state, events }` —
no I/O, no clock, no randomness, no DOM (spec §10.2). Objects are content-addressed with a
deterministic hash that excludes timestamp and author (§10.1). Real git appears only in the test
suite: a differential harness replays the same action sequences against real `git` in a temp dir and
asserts equivalence.

**Tech Stack:** Vite + React + TypeScript (strict) + Tailwind; Vitest for tests; Node ≥ 20; real
`git` binary required for `tests/differential` only.

## Global Constraints

- Engine files (`src/engine/**`) import nothing from outside `src/engine/` and use no
  `Date.now()` / `Math.random()` / `console` / DOM APIs.
- Hash input is content only: blob content, tree entries, commit `tree + parents + message`.
  **Never** time or author. Identical content ⇒ identical oid — designed behaviour (an amend that
  changes nothing produces the *same* commit; the engine reports it as a no-op event).
- Every user-facing outcome is an `EngineEvent` carrying a `reasonKey` (i18n key), never an English
  sentence.
- The object store never deletes anything. "Unreachable" is a query result, not a removal.
- `state.insertionOrder` records commit oids in creation order — the layout tie-break (spec §10.5)
  depends on it; append exactly when a *new* commit object enters the store.
- TDD for every task: failing test → run → minimal code → run → commit.
- Commit messages: `feat(engine): …`, `test(engine): …`, `chore: …`.

## Known v1 simplifications (documented, deliberate)

- Paths are flat file names (no directories); one tree object per commit, entries `path → blob oid`.
- `.gitignore` matches exact file names only (no globs).
- `switch` refuses when tracked changes are uncommitted (`switch-dirty`); real git is more permissive.
  Untracked files are carried across `switch` and survive `reset --hard`, as in real git.
- HEAD reflog only (no per-branch reflogs); `HEAD@{n}` resolves against it.
- Differential sequences must use unique commit messages (messages are the hash-agnostic canonical
  ids), refer to commits only via branch names / `HEAD~n` / `HEAD@{n}` (never raw oids), and stay on
  the engine's stricter clean-tree rule for `switch`.

---

### Task 1: Scaffold, test runner, Netlify deploy (spec §15 step 0)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json` (via Vite template), `index.html`,
  `src/App.tsx`, `src/main.tsx`, `src/index.css`
- Create: `netlify.toml`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run dev`, `npm run build`, `npm test` (vitest run), `npm run test:diff`
  (differential suite only). Directory layout used by every later task.

- [ ] **Step 1: Scaffold the Vite app**

```bash
cd /Users/mustafa/Desktop/Projects/git-commit-game
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest @tailwindcss/vite tailwindcss
```

If `npm create vite` balks at the non-empty directory (docs/, .git), let it scaffold into `tmp-vite/`
and move the generated files up: `cp -R tmp-vite/. . && rm -rf tmp-vite` (never overwrite `docs/` or
`.gitignore` — merge `.gitignore` by hand if the template ships one).

- [ ] **Step 2: Wire Tailwind and Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

Add to `src/index.css` (first line): `@import "tailwindcss";`

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run --exclude tests/differential/**",
  "test:diff": "vitest run tests/differential",
  "test:all": "vitest run"
}
```

Note: `vite.config.ts` needs `/// <reference types="vitest/config" />` at the top for the `test` key
to typecheck.

- [ ] **Step 3: Placeholder page**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-100">
      <h1 className="text-2xl font-mono">git game — coming soon</h1>
    </main>
  );
}
```

- [ ] **Step 4: Write the smoke test**

```ts
// tests/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm test`
Expected: build emits `dist/`, vitest reports `1 passed`.

- [ ] **Step 6: Netlify config**

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
```

Deployment is connected once, by the owner, in the Netlify UI (Add new site → Import from git →
this repo, accept the netlify.toml settings). Every push to `main` then deploys. No secrets, no
functions.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite/React/TS/Tailwind app with Vitest and Netlify config"
```

---

### Task 2: Engine types and deterministic hashing

**Files:**
- Create: `src/engine/types.ts`, `src/engine/hash.ts`
- Test: `tests/engine/hash.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every type below (all later tasks import from `./types`), and
  `hashObject(obj: GitObject): Oid`.

- [ ] **Step 1: Write `src/engine/types.ts` (types only, no logic — no test needed)**

```ts
export type Oid = string; // 16 hex chars

export interface BlobObj { kind: 'blob'; content: string }
export interface TreeObj { kind: 'tree'; entries: Record<string, Oid> } // path -> blob oid
export interface CommitObj { kind: 'commit'; tree: Oid; parents: Oid[]; message: string }
export type GitObject = BlobObj | TreeObj | CommitObj;

export type Head =
  | { kind: 'branch'; name: string }
  | { kind: 'detached'; oid: Oid };

export interface ReflogEntry { from: Oid | null; to: Oid; action: string } // newest first

export interface RepoState {
  initialised: boolean;
  objects: Record<Oid, GitObject>;      // append-only; never GC'd
  branches: Record<string, Oid>;
  head: Head;
  index: Record<string, Oid>;           // the staged snapshot: path -> blob oid
  workingDir: Record<string, string>;   // path -> content
  reflog: ReflogEntry[];                // HEAD reflog, newest first (HEAD@{0} = current)
  insertionOrder: Oid[];                // commit oids, creation order (layout tie-break)
  ignored: string[];                    // parsed .gitignore (exact names, v1)
}

export type GitAction =
  | { cmd: 'init' }
  | { cmd: 'writeFile'; path: string; content: string }
  | { cmd: 'add'; paths: string[] }
  | { cmd: 'commit'; message: string; amend?: boolean; paths?: string[] }
  | { cmd: 'branch'; name: string }
  | { cmd: 'switch'; target: string; create?: boolean; detach?: boolean }
  | { cmd: 'reset'; mode: 'soft' | 'mixed' | 'hard'; target: string }
  | { cmd: 'restore'; paths: string[]; staged?: boolean };

export type EngineEvent =
  | { kind: 'repo-initialised' }
  | { kind: 'file-written'; path: string }
  | { kind: 'index-updated'; paths: string[] }
  | { kind: 'commit-created'; oid: Oid }
  | { kind: 'ref-moved'; ref: string; from: Oid | null; to: Oid }
  | { kind: 'head-moved'; head: Head }
  | { kind: 'worktree-updated'; paths: string[] }
  | { kind: 'staged-snapshot-lost'; oids: Oid[] }   // the Topic 4 trap (spec §8.4)
  | { kind: 'no-op'; reasonKey: string }
  | { kind: 'error'; reasonKey: string; params?: Record<string, string> };

export interface ReduceResult { state: RepoState; events: EngineEvent[] }
```

- [ ] **Step 2: Write the failing hash tests**

```ts
// tests/engine/hash.test.ts
import { describe, it, expect } from 'vitest';
import { hashObject } from '../../src/engine/hash';

describe('hashObject', () => {
  it('is deterministic', () => {
    expect(hashObject({ kind: 'blob', content: 'hello' }))
      .toBe(hashObject({ kind: 'blob', content: 'hello' }));
  });

  it('changes when one character changes', () => {
    expect(hashObject({ kind: 'blob', content: 'hello' }))
      .not.toBe(hashObject({ kind: 'blob', content: 'hellO' }));
  });

  it('ignores tree key insertion order', () => {
    expect(hashObject({ kind: 'tree', entries: { a: '1'.repeat(16), b: '2'.repeat(16) } }))
      .toBe(hashObject({ kind: 'tree', entries: { b: '2'.repeat(16), a: '1'.repeat(16) } }));
  });

  it('separates object kinds and commit fields', () => {
    const t = hashObject({ kind: 'tree', entries: {} });
    const c1 = hashObject({ kind: 'commit', tree: t, parents: [], message: 'm' });
    const c2 = hashObject({ kind: 'commit', tree: t, parents: [c1], message: 'm' });
    expect(c1).not.toBe(c2); // same content, different parents => different hash
    expect(hashObject({ kind: 'blob', content: '' })).not.toBe(t);
  });

  it('returns 16 hex chars', () => {
    expect(hashObject({ kind: 'blob', content: 'x' })).toMatch(/^[0-9a-f]{16}$/);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/engine/hash.test.ts`
Expected: FAIL — cannot resolve `../../src/engine/hash`.

- [ ] **Step 4: Implement `src/engine/hash.ts`**

```ts
import type { GitObject, Oid } from './types';

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function canonicalise(obj: GitObject): string {
  switch (obj.kind) {
    case 'blob':
      return `blob\0${obj.content}`;
    case 'tree':
      return 'tree\0' + Object.keys(obj.entries).sort()
        .map((p) => `${p}=${obj.entries[p]}`).join('\n');
    case 'commit':
      return `commit\0tree=${obj.tree}\nparents=${obj.parents.join(',')}\nmsg=${obj.message}`;
  }
}

/** Content-only, deterministic. No timestamp, no author — spec §10.1. */
export function hashObject(obj: GitObject): Oid {
  const s = canonicalise(obj);
  const a = fnv1a(s, 0x811c9dc5).toString(16).padStart(8, '0');
  const b = fnv1a(s, 0xdeadbeef).toString(16).padStart(8, '0');
  return a + b;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/engine/hash.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/hash.ts tests/engine/hash.test.ts
git commit -m "feat(engine): types and deterministic content-only hashing"
```

---

### Task 3: Object store, initial state, init, writeFile, reducer shell

**Files:**
- Create: `src/engine/store.ts`, `src/engine/actions/init.ts`, `src/engine/actions/worktree.ts`,
  `src/engine/reduce.ts`
- Test: `tests/engine/init.test.ts`

**Interfaces:**
- Consumes: `hashObject`, all types.
- Produces:
  - `store.ts`: `putObject(objects, obj) => { objects, oid, isNew }`,
    `getCommit(state, oid): CommitObj`, `getTree(state, oid): TreeObj`,
    `getBlob(state, oid): BlobObj`, `treeOf(state, commitOid: Oid | null): Record<string, Oid>`
  - `init.ts`: `initialState(): RepoState`, `init(state): ReduceResult`
  - `worktree.ts`: `writeFile(state, path, content): ReduceResult`, `parseGitignore(content): string[]`
  - `reduce.ts`: `reduce(state, action): ReduceResult` — **the only entry point the UI will ever
    call.** Guards `not-a-repo` centrally: before `init`, only `init` and `writeFile` are legal.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/init.test.ts
import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';

describe('init and writeFile', () => {
  it('starts uninitialised on an unborn main', () => {
    const s = initialState();
    expect(s.initialised).toBe(false);
    expect(s.head).toEqual({ kind: 'branch', name: 'main' });
    expect(s.branches).toEqual({});
  });

  it('rejects git actions before init', () => {
    const { state, events } = reduce(initialState(), { cmd: 'add', paths: ['a.txt'] });
    expect(events).toEqual([{ kind: 'error', reasonKey: 'not-a-repo' }]);
    expect(state).toEqual(initialState()); // unchanged
  });

  it('init initialises exactly once', () => {
    const r1 = reduce(initialState(), { cmd: 'init' });
    expect(r1.state.initialised).toBe(true);
    expect(r1.events).toEqual([{ kind: 'repo-initialised' }]);
    const r2 = reduce(r1.state, { cmd: 'init' });
    expect(r2.events).toEqual([{ kind: 'error', reasonKey: 'already-a-repo' }]);
  });

  it('writeFile works pre- and post-init and updates ignored on .gitignore', () => {
    const r1 = reduce(initialState(), { cmd: 'writeFile', path: 'a.txt', content: 'one' });
    expect(r1.state.workingDir).toEqual({ 'a.txt': 'one' });
    expect(r1.events).toEqual([{ kind: 'file-written', path: 'a.txt' }]);
    const r2 = reduce(r1.state, { cmd: 'writeFile', path: '.gitignore', content: 'secret.txt\n# c\n' });
    expect(r2.state.ignored).toEqual(['secret.txt']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/init.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

```ts
// src/engine/store.ts
import { hashObject } from './hash';
import type { BlobObj, CommitObj, GitObject, Oid, RepoState, TreeObj } from './types';

export function putObject(
  objects: Record<Oid, GitObject>,
  obj: GitObject,
): { objects: Record<Oid, GitObject>; oid: Oid; isNew: boolean } {
  const oid = hashObject(obj);
  if (objects[oid]) return { objects, oid, isNew: false };
  return { objects: { ...objects, [oid]: obj }, oid, isNew: true };
}

function get(state: RepoState, oid: Oid, kind: GitObject['kind']): GitObject {
  const o = state.objects[oid];
  if (!o || o.kind !== kind) throw new Error(`engine bug: ${oid} is not a ${kind}`);
  return o;
}
export const getCommit = (s: RepoState, oid: Oid) => get(s, oid, 'commit') as CommitObj;
export const getTree = (s: RepoState, oid: Oid) => get(s, oid, 'tree') as TreeObj;
export const getBlob = (s: RepoState, oid: Oid) => get(s, oid, 'blob') as BlobObj;

/** Tree entries of a commit, or {} for the null (unborn) commit. */
export function treeOf(state: RepoState, commitOid: Oid | null): Record<string, Oid> {
  if (commitOid === null) return {};
  return getTree(state, getCommit(state, commitOid).tree).entries;
}
```

```ts
// src/engine/actions/init.ts
import type { ReduceResult, RepoState } from '../types';

export function initialState(): RepoState {
  return {
    initialised: false,
    objects: {},
    branches: {},
    head: { kind: 'branch', name: 'main' }, // unborn branch, like real `git init -b main`
    index: {},
    workingDir: {},
    reflog: [],
    insertionOrder: [],
    ignored: [],
  };
}

export function init(state: RepoState): ReduceResult {
  if (state.initialised) {
    return { state, events: [{ kind: 'error', reasonKey: 'already-a-repo' }] };
  }
  return { state: { ...state, initialised: true }, events: [{ kind: 'repo-initialised' }] };
}
```

```ts
// src/engine/actions/worktree.ts
import type { ReduceResult, RepoState } from '../types';

export function parseGitignore(content: string): string[] {
  return content.split('\n').map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'));
}

export function writeFile(state: RepoState, path: string, content: string): ReduceResult {
  const workingDir = { ...state.workingDir, [path]: content };
  const ignored = path === '.gitignore' ? parseGitignore(content) : state.ignored;
  return { state: { ...state, workingDir, ignored }, events: [{ kind: 'file-written', path }] };
}
```

```ts
// src/engine/reduce.ts
import type { GitAction, ReduceResult, RepoState } from './types';
import { init } from './actions/init';
import { writeFile } from './actions/worktree';

export function reduce(state: RepoState, action: GitAction): ReduceResult {
  if (!state.initialised && action.cmd !== 'init' && action.cmd !== 'writeFile') {
    return { state, events: [{ kind: 'error', reasonKey: 'not-a-repo' }] };
  }
  switch (action.cmd) {
    case 'init': return init(state);
    case 'writeFile': return writeFile(state, action.path, action.content);
    default:
      return { state, events: [{ kind: 'error', reasonKey: 'not-implemented' }] };
  }
}
```

(The `default` arm shrinks task by task and is deleted in Task 8 when the union is fully covered.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/init.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine/init.test.ts
git commit -m "feat(engine): object store, initial state, init, writeFile, reducer shell"
```

---

### Task 4: `add` — staging writes blobs

**Files:**
- Create: `src/engine/actions/add.ts`
- Modify: `src/engine/reduce.ts` (add the `add` case)
- Test: `tests/engine/add.test.ts`

**Interfaces:**
- Consumes: `putObject`.
- Produces: `add(state, paths: string[]): ReduceResult`. After success, `state.index[path]` is the
  blob oid of the file's **current** working content, and the blob is in `state.objects` (this
  matters later: a clobbered staged blob stays in the store and becomes *dangling* — Task 9/10).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/add.test.ts
import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';
import type { GitAction, RepoState } from '../../src/engine/types';

export function run(actions: GitAction[], from?: RepoState): RepoState {
  let state = from ?? reduce(initialState(), { cmd: 'init' }).state;
  for (const a of actions) {
    const r = reduce(state, a);
    const err = r.events.find((e) => e.kind === 'error');
    if (err) throw new Error(`unexpected error: ${JSON.stringify(err)}`);
    state = r.state;
  }
  return state;
}

describe('add', () => {
  it('stages the current working content as a blob', () => {
    const s = run([
      { cmd: 'writeFile', path: 'a.txt', content: 'one' },
      { cmd: 'add', paths: ['a.txt'] },
    ]);
    const oid = s.index['a.txt'];
    expect(s.objects[oid]).toEqual({ kind: 'blob', content: 'one' });
  });

  it('keeps the staged snapshot when the file is edited again (spec §8.4 Topic 4)', () => {
    const s = run([
      { cmd: 'writeFile', path: 'a.txt', content: 'one' },
      { cmd: 'add', paths: ['a.txt'] },
      { cmd: 'writeFile', path: 'a.txt', content: 'two' },
    ]);
    expect(s.objects[s.index['a.txt']]).toEqual({ kind: 'blob', content: 'one' });
    expect(s.workingDir['a.txt']).toBe('two');
  });

  it('errors on a missing path without touching state', () => {
    const base = run([]);
    const r = reduce(base, { cmd: 'add', paths: ['nope.txt'] });
    expect(r.events).toEqual([
      { kind: 'error', reasonKey: 'pathspec-no-match', params: { path: 'nope.txt' } },
    ]);
    expect(r.state).toBe(base);
  });

  it('refuses to add an ignored path explicitly, like real git', () => {
    const base = run([
      { cmd: 'writeFile', path: '.gitignore', content: 'secret.txt' },
      { cmd: 'writeFile', path: 'secret.txt', content: 'shh' },
    ]);
    const r = reduce(base, { cmd: 'add', paths: ['secret.txt'] });
    expect(r.events).toEqual([
      { kind: 'error', reasonKey: 'path-is-ignored', params: { path: 'secret.txt' } },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/add.test.ts`
Expected: FAIL — `add.ts` missing / `not-implemented` error thrown by the `run` helper.

- [ ] **Step 3: Implement `src/engine/actions/add.ts` and wire into reduce**

```ts
import { putObject } from '../store';
import type { EngineEvent, Oid, ReduceResult, RepoState } from '../types';

export function add(state: RepoState, paths: string[]): ReduceResult {
  let objects = state.objects;
  let index: Record<string, Oid> = state.index;
  for (const path of paths) {
    if (!(path in state.workingDir)) {
      return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
    }
    if (state.ignored.includes(path)) {
      return { state, events: [{ kind: 'error', reasonKey: 'path-is-ignored', params: { path } }] };
    }
    const res = putObject(objects, { kind: 'blob', content: state.workingDir[path] });
    objects = res.objects;
    index = { ...index, [path]: res.oid };
  }
  const events: EngineEvent[] = [{ kind: 'index-updated', paths }];
  return { state: { ...state, objects, index }, events };
}
```

In `reduce.ts`, add: `case 'add': return add(state, action.paths);` (plus the import).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/add.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine/add.test.ts
git commit -m "feat(engine): add — staging writes content-addressed blobs"
```

---

### Task 5: `commit` — snapshot, ref move, reflog, insertion order

**Files:**
- Create: `src/engine/refs.ts` (just `headCommitOid` for now), `src/engine/actions/commit.ts`
- Modify: `src/engine/reduce.ts`
- Test: `tests/engine/commit.test.ts`

**Interfaces:**
- Consumes: `putObject`, `getCommit`, `treeOf`.
- Produces:
  - `refs.ts`: `headCommitOid(state): Oid | null` — the commit HEAD points at, `null` on an unborn
    branch.
  - `commit.ts`: `commit(state, message, opts?: { amend?: boolean; paths?: string[] }): ReduceResult`.
    Task 5 implements the plain path only; `amend` and `paths` land in Task 9 **through this same
    signature** — the reduce wiring done here never changes.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/commit.test.ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

describe('commit', () => {
  it('creates a commit from the index and moves the branch', () => {
    const s = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const oid = s.branches['main'];
    const c = s.objects[oid];
    expect(c).toMatchObject({ kind: 'commit', parents: [], message: 'c1' });
    expect(s.insertionOrder).toEqual([oid]);
    expect(s.reflog[0]).toEqual({ from: null, to: oid, action: 'commit' });
  });

  it('commits the STAGED version, not the working version (spec §8.4 Topic 4)', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'),
      write('a.txt', 'two'),                 // edit after staging
      commitM('c1'),
    ]);
    const tree = (s.objects[(s.objects[s.branches['main']] as any).tree] as any).entries;
    expect((s.objects[tree['a.txt']] as any).content).toBe('one');
    expect(s.workingDir['a.txt']).toBe('two');
  });

  it('chains parents', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    ]);
    const c2 = s.objects[s.branches['main']] as any;
    expect(c2.parents).toEqual([s.insertionOrder[0]]);
    expect(s.insertionOrder).toHaveLength(2);
  });

  it('errors with nothing-to-commit when the index matches HEAD', () => {
    const base = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const r = reduce(base, commitM('c2'));
    expect(r.events).toEqual([{ kind: 'error', reasonKey: 'nothing-to-commit' }]);
  });

  it('errors on an empty first commit', () => {
    const r = reduce(run([]), commitM('c1'));
    expect(r.events).toEqual([{ kind: 'error', reasonKey: 'nothing-to-commit' }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/commit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/engine/refs.ts
import type { Oid, RepoState } from './types';

export function headCommitOid(state: RepoState): Oid | null {
  if (state.head.kind === 'detached') return state.head.oid;
  return state.branches[state.head.name] ?? null;
}
```

```ts
// src/engine/actions/commit.ts
import { getCommit, putObject, treeOf } from '../store';
import { headCommitOid } from '../refs';
import type { EngineEvent, Oid, ReduceResult, RepoState } from '../types';

export function commit(
  state: RepoState,
  message: string,
  opts: { amend?: boolean; paths?: string[] } = {},
): ReduceResult {
  const parentOid = headCommitOid(state);
  const events: EngineEvent[] = [];
  let objects = state.objects;
  let index = state.index;

  // --- choose the snapshot ---
  let entries: Record<string, Oid>;
  if (opts.paths) {
    // `git commit <path>`: WORKING version of named paths over the HEAD tree — Task 9.
    entries = { ...treeOf(state, parentOid) };
    const lost: Oid[] = [];
    for (const path of opts.paths) {
      if (!(path in state.workingDir)) {
        return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
      }
      const res = putObject(objects, { kind: 'blob', content: state.workingDir[path] });
      objects = res.objects;
      if (index[path] !== undefined && index[path] !== res.oid) lost.push(index[path]);
      entries[path] = res.oid;
      index = { ...index, [path]: res.oid }; // staged snapshot CONSUMED, not bypassed (spec §8.4)
    }
    if (lost.length > 0) events.push({ kind: 'staged-snapshot-lost', oids: lost });
  } else {
    entries = { ...index };
  }

  // --- parents ---
  let parents: Oid[];
  if (opts.amend) {
    if (parentOid === null) return { state, events: [{ kind: 'error', reasonKey: 'no-commits-yet' }] };
    parents = getCommit(state, parentOid).parents;
  } else {
    parents = parentOid === null ? [] : [parentOid];
  }

  // --- build objects ---
  const t = putObject(objects, { kind: 'tree', entries });
  objects = t.objects;
  if (!opts.amend) {
    if (parentOid === null && Object.keys(entries).length === 0) {
      return { state, events: [{ kind: 'error', reasonKey: 'nothing-to-commit' }] };
    }
    if (parentOid !== null && t.oid === getCommit(state, parentOid).tree) {
      return { state, events: [{ kind: 'error', reasonKey: 'nothing-to-commit' }] };
    }
  }
  const c = putObject(objects, { kind: 'commit', tree: t.oid, parents, message });
  objects = c.objects;

  if (opts.amend && c.oid === parentOid) {
    // identical content => identical hash: honest content-addressing, surfaced as a no-op
    return { state, events: [{ kind: 'no-op', reasonKey: 'amend-identical' }] };
  }

  // --- move ref / HEAD, reflog, insertion order ---
  let branches = state.branches;
  let head = state.head;
  if (head.kind === 'branch') {
    branches = { ...branches, [head.name]: c.oid };
    events.push({ kind: 'ref-moved', ref: head.name, from: parentOid, to: c.oid });
  } else {
    head = { kind: 'detached', oid: c.oid };
    events.push({ kind: 'head-moved', head });
  }
  const insertionOrder = c.isNew ? [...state.insertionOrder, c.oid] : state.insertionOrder;
  const reflog = [
    { from: parentOid, to: c.oid, action: opts.amend ? 'amend' : 'commit' },
    ...state.reflog,
  ];
  events.unshift({ kind: 'commit-created', oid: c.oid });

  return { state: { ...state, objects, index, branches, head, insertionOrder, reflog }, events };
}
```

In `reduce.ts`, add:
`case 'commit': return commit(state, action.message, { amend: action.amend, paths: action.paths });`

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/commit.test.ts`
Expected: 5 passed. Also run `npm test` — everything still green.

- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine/commit.test.ts
git commit -m "feat(engine): commit — index snapshot, ref move, reflog, insertion order"
```

---

### Task 6: `branch` and `switch` (incl. `-c`, `--detach`, dirty guard)

**Files:**
- Create: `src/engine/actions/branch.ts`, `src/engine/actions/switch.ts`
- Modify: `src/engine/refs.ts` (add `resolveRef`, v1: HEAD | branch | oid | unique prefix ≥ 4),
  `src/engine/reduce.ts`
- Test: `tests/engine/switch.test.ts`

**Interfaces:**
- Consumes: `headCommitOid`, `treeOf`, `getBlob`.
- Produces:
  - `refs.ts`: `resolveRef(state, ref: string): Oid | null` (Task 7 extends it with `~n` / `@{n}`
    without changing the signature).
  - `branch.ts`: `branch(state, name): ReduceResult` — creates the label **and nothing else**
    (deliberately anticlimactic, spec §8.4 Topic 2).
  - `switch.ts`: `switchTo(state, target, opts?: { create?: boolean; detach?: boolean }): ReduceResult`,
    plus exported `isDirty(state): boolean` (reset tests reuse it).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/switch.test.ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

const twoCommits = () => run([
  write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
  write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
]);

describe('branch and switch', () => {
  it('branch creates a label at HEAD and moves nothing', () => {
    const base = twoCommits();
    const r = reduce(base, { cmd: 'branch', name: 'feature' });
    expect(r.state.branches['feature']).toBe(base.branches['main']);
    expect(r.state.head).toEqual({ kind: 'branch', name: 'main' });
    expect(r.state.workingDir).toEqual(base.workingDir);
  });

  it('switch to an older commit detaches and rebuilds files', () => {
    const base = twoCommits();
    const c1 = base.insertionOrder[0];
    const r = reduce(base, { cmd: 'switch', target: c1, detach: true });
    expect(r.state.head).toEqual({ kind: 'detached', oid: c1 });
    expect(r.state.workingDir['a.txt']).toBe('one');
    expect(r.state.index['a.txt']).toBeDefined();
  });

  it('switch to a commit oid without --detach is refused, like real git', () => {
    const base = twoCommits();
    const r = reduce(base, { cmd: 'switch', target: base.insertionOrder[0] });
    expect(r.events[0]).toMatchObject({ kind: 'error', reasonKey: 'detach-requires-flag' });
  });

  it('switch -c creates and moves in one step without touching files', () => {
    const base = twoCommits();
    const r = reduce(base, { cmd: 'switch', target: 'feature', create: true });
    expect(r.state.head).toEqual({ kind: 'branch', name: 'feature' });
    expect(r.state.branches['feature']).toBe(base.branches['main']);
  });

  it('refuses to switch with uncommitted tracked changes', () => {
    const base = run([write('a.txt', 'dirty')], twoCommits());
    const r = reduce(base, { cmd: 'switch', target: 'main' });
    expect(r.events).toEqual([{ kind: 'error', reasonKey: 'switch-dirty' }]);
  });

  it('carries untracked files across a switch', () => {
    let s = twoCommits();
    s = run([{ cmd: 'branch', name: 'feature' }, write('notes.md', 'todo')], s);
    const r = reduce(s, { cmd: 'switch', target: 'feature' });
    expect(r.state.workingDir['notes.md']).toBe('todo');
  });

  it('branch errors: duplicate name, no commits yet', () => {
    expect(reduce(twoCommits(), { cmd: 'branch', name: 'main' }).events[0])
      .toMatchObject({ kind: 'error', reasonKey: 'branch-exists' });
    expect(reduce(run([]), { cmd: 'branch', name: 'x' }).events[0])
      .toMatchObject({ kind: 'error', reasonKey: 'no-commits-yet' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/switch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/engine/refs.ts — add below headCommitOid
import type { Oid, RepoState } from './types';

export function resolveRef(state: RepoState, ref: string): Oid | null {
  if (ref === 'HEAD') return headCommitOid(state);
  if (state.branches[ref] !== undefined) return state.branches[ref];
  if (/^[0-9a-f]{16}$/.test(ref) && state.objects[ref]?.kind === 'commit') return ref;
  if (/^[0-9a-f]{4,15}$/.test(ref)) {
    const hits = Object.keys(state.objects)
      .filter((o) => o.startsWith(ref) && state.objects[o].kind === 'commit');
    return hits.length === 1 ? hits[0] : null;
  }
  return null;
}
```

```ts
// src/engine/actions/branch.ts
import { headCommitOid } from '../refs';
import type { ReduceResult, RepoState } from '../types';

export function branch(state: RepoState, name: string): ReduceResult {
  if (state.branches[name] !== undefined) {
    return { state, events: [{ kind: 'error', reasonKey: 'branch-exists', params: { name } }] };
  }
  const tip = headCommitOid(state);
  if (tip === null) return { state, events: [{ kind: 'error', reasonKey: 'no-commits-yet' }] };
  return {
    state: { ...state, branches: { ...state.branches, [name]: tip } },
    events: [{ kind: 'ref-moved', ref: name, from: null, to: tip }],
  };
}
```

```ts
// src/engine/actions/switch.ts
import { headCommitOid, resolveRef } from '../refs';
import { getBlob, treeOf } from '../store';
import type { Head, Oid, ReduceResult, RepoState } from '../types';

/** Tracked changes uncommitted? (untracked files never count) */
export function isDirty(state: RepoState): boolean {
  const headEntries = treeOf(state, headCommitOid(state));
  const idx = state.index;
  const same = (a: Record<string, Oid>, b: Record<string, Oid>) =>
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((k) => a[k] === b[k]);
  if (!same(idx, headEntries)) return true;
  for (const [path, blobOid] of Object.entries(headEntries)) {
    if (state.workingDir[path] !== getBlob(state, blobOid).content) return true;
  }
  return false;
}

export function switchTo(
  state: RepoState,
  target: string,
  opts: { create?: boolean; detach?: boolean } = {},
): ReduceResult {
  if (isDirty(state)) return { state, events: [{ kind: 'error', reasonKey: 'switch-dirty' }] };

  if (opts.create) {
    if (state.branches[target] !== undefined) {
      return { state, events: [{ kind: 'error', reasonKey: 'branch-exists', params: { name: target } }] };
    }
    const tip = headCommitOid(state);
    if (tip === null) return { state, events: [{ kind: 'error', reasonKey: 'no-commits-yet' }] };
    const head: Head = { kind: 'branch', name: target };
    return {
      state: {
        ...state,
        branches: { ...state.branches, [target]: tip },
        head,
        reflog: [{ from: tip, to: tip, action: 'switch' }, ...state.reflog],
      },
      events: [{ kind: 'ref-moved', ref: target, from: null, to: tip }, { kind: 'head-moved', head }],
    };
  }

  let head: Head;
  let targetOid: Oid;
  if (!opts.detach && state.branches[target] !== undefined) {
    head = { kind: 'branch', name: target };
    targetOid = state.branches[target];
  } else {
    const oid = resolveRef(state, target);
    if (oid === null) {
      return { state, events: [{ kind: 'error', reasonKey: 'unknown-ref', params: { ref: target } }] };
    }
    if (!opts.detach) {
      return { state, events: [{ kind: 'error', reasonKey: 'detach-requires-flag', params: { ref: target } }] };
    }
    head = { kind: 'detached', oid };
    targetOid = oid;
  }

  // rebuild tracked files from the target tree; carry untracked files
  const entries = treeOf(state, targetOid);
  const headEntries = treeOf(state, headCommitOid(state));
  const workingDir: Record<string, string> = {};
  for (const [path, content] of Object.entries(state.workingDir)) {
    if (!(path in headEntries)) workingDir[path] = content; // untracked survives
  }
  for (const [path, blobOid] of Object.entries(entries)) {
    workingDir[path] = getBlob(state, blobOid).content;
  }
  const from = headCommitOid(state);
  return {
    state: {
      ...state,
      head,
      index: { ...entries },
      workingDir,
      reflog: [{ from, to: targetOid, action: 'switch' }, ...state.reflog],
    },
    events: [
      { kind: 'head-moved', head },
      { kind: 'worktree-updated', paths: Object.keys(entries) },
    ],
  };
}
```

In `reduce.ts`, add:
`case 'branch': return branch(state, action.name);`
`case 'switch': return switchTo(state, action.target, { create: action.create, detach: action.detach });`

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/switch.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine/switch.test.ts
git commit -m "feat(engine): branch and switch with detach, -c, dirty guard, untracked carry"
```

---

### Task 7: ref suffixes (`HEAD~n`, `HEAD@{n}`) and `reset --soft/--mixed/--hard`

**Files:**
- Modify: `src/engine/refs.ts`
- Create: `src/engine/actions/reset.ts`
- Modify: `src/engine/reduce.ts`
- Test: `tests/engine/reset.test.ts`

**Interfaces:**
- Consumes: `resolveRef` (extended here), `treeOf`, `getBlob`, `isDirty` is NOT consulted — reset is
  legal on a dirty tree, that is its point.
- Produces: `reset(state, mode: 'soft' | 'mixed' | 'hard', target: string): ReduceResult`. The
  zone-depth semantics the whole of Topic 5 teaches (spec §8.4): soft = label only; mixed = label +
  index; hard = label + index + working dir. Untracked files survive `--hard` (real git).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/reset.test.ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { resolveRef } from '../../src/engine/refs';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

const threeCommits = () => run([
  write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
  write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
  write('a.txt', 'three'), addF('a.txt'), commitM('c3'),
]);

describe('ref suffixes', () => {
  it('resolves HEAD~n by first parent', () => {
    const s = threeCommits();
    expect(resolveRef(s, 'HEAD~1')).toBe(s.insertionOrder[1]);
    expect(resolveRef(s, 'HEAD~2')).toBe(s.insertionOrder[0]);
    expect(resolveRef(s, 'HEAD~9')).toBeNull();
  });

  it('resolves HEAD@{n} from the reflog', () => {
    const s = threeCommits();
    expect(resolveRef(s, 'HEAD@{0}')).toBe(s.insertionOrder[2]);
    expect(resolveRef(s, 'HEAD@{1}')).toBe(s.insertionOrder[1]);
  });
});

describe('reset', () => {
  it('--soft moves only the label', () => {
    const base = threeCommits();
    const r = reduce(base, { cmd: 'reset', mode: 'soft', target: 'HEAD~1' });
    expect(r.state.branches['main']).toBe(base.insertionOrder[1]);
    expect(r.state.index).toEqual(base.index);            // untouched
    expect(r.state.workingDir).toEqual(base.workingDir);  // untouched
  });

  it('--mixed (the real default) moves label + index', () => {
    const base = threeCommits();
    const r = reduce(base, { cmd: 'reset', mode: 'mixed', target: 'HEAD~1' });
    const s = r.state;
    expect((s.objects[s.index['a.txt']] as any).content).toBe('two'); // index reset
    expect(s.workingDir['a.txt']).toBe('three');                      // working dir untouched
  });

  it('--hard moves all three zones but spares untracked files', () => {
    const base = run([write('notes.md', 'keep me')], threeCommits());
    const r = reduce(base, { cmd: 'reset', mode: 'hard', target: 'HEAD~2' });
    expect(r.state.workingDir['a.txt']).toBe('one');
    expect(r.state.workingDir['notes.md']).toBe('keep me');
  });

  it('the commit survives a hard reset: unreachable is not gone (spec §8.4 Topic 3)', () => {
    const base = threeCommits();
    const c3 = base.insertionOrder[2];
    const r = reduce(base, { cmd: 'reset', mode: 'hard', target: 'HEAD~2' });
    expect(r.state.objects[c3]).toBeDefined();
    expect(r.state.reflog[0]).toMatchObject({ to: base.insertionOrder[0], action: 'reset' });
    // and the rescue path exists:
    expect(resolveRef(r.state, 'HEAD@{1}')).toBe(c3);
  });

  it('errors on an unknown target', () => {
    const r = reduce(threeCommits(), { cmd: 'reset', mode: 'hard', target: 'nope' });
    expect(r.events[0]).toMatchObject({ kind: 'error', reasonKey: 'unknown-ref' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/reset.test.ts`
Expected: FAIL — suffixes unresolved, reset unimplemented.

- [ ] **Step 3: Implement**

Replace `resolveRef` in `src/engine/refs.ts` with the suffix-aware version:

```ts
import { getCommit } from './store';

export function resolveRef(state: RepoState, ref: string): Oid | null {
  const tilde = ref.match(/^(.+)~(\d+)$/);
  if (tilde) {
    let oid = resolveRef(state, tilde[1]);
    for (let i = 0; i < Number(tilde[2]); i++) {
      if (oid === null) return null;
      const parents = getCommit(state, oid).parents;
      oid = parents.length > 0 ? parents[0] : null;
    }
    return oid;
  }
  const at = ref.match(/^HEAD@\{(\d+)\}$/);
  if (at) {
    const entry = state.reflog[Number(at[1])];
    return entry ? entry.to : null;
  }
  if (ref === 'HEAD') return headCommitOid(state);
  if (state.branches[ref] !== undefined) return state.branches[ref];
  if (/^[0-9a-f]{16}$/.test(ref) && state.objects[ref]?.kind === 'commit') return ref;
  if (/^[0-9a-f]{4,15}$/.test(ref)) {
    const hits = Object.keys(state.objects)
      .filter((o) => o.startsWith(ref) && state.objects[o].kind === 'commit');
    return hits.length === 1 ? hits[0] : null;
  }
  return null;
}
```

```ts
// src/engine/actions/reset.ts
import { headCommitOid, resolveRef } from '../refs';
import { getBlob, treeOf } from '../store';
import type { EngineEvent, ReduceResult, RepoState } from '../types';

export function reset(
  state: RepoState,
  mode: 'soft' | 'mixed' | 'hard',
  target: string,
): ReduceResult {
  const oid = resolveRef(state, target);
  if (oid === null) {
    return { state, events: [{ kind: 'error', reasonKey: 'unknown-ref', params: { ref: target } }] };
  }
  const from = headCommitOid(state);
  const events: EngineEvent[] = [];

  // zone 1: the label
  let branches = state.branches;
  let head = state.head;
  if (head.kind === 'branch') {
    branches = { ...branches, [head.name]: oid };
    events.push({ kind: 'ref-moved', ref: head.name, from, to: oid });
  } else {
    head = { kind: 'detached', oid };
    events.push({ kind: 'head-moved', head });
  }

  const entries = treeOf(state, oid);

  // zone 2: the index
  let index = state.index;
  if (mode === 'mixed' || mode === 'hard') {
    index = { ...entries };
    events.push({ kind: 'index-updated', paths: Object.keys(entries) });
  }

  // zone 3: the working directory (untracked files survive)
  let workingDir = state.workingDir;
  if (mode === 'hard') {
    const oldTracked = treeOf(state, from);
    const next: Record<string, string> = {};
    for (const [path, content] of Object.entries(state.workingDir)) {
      if (!(path in oldTracked) && !(path in state.index)) next[path] = content;
    }
    for (const [path, blobOid] of Object.entries(entries)) {
      next[path] = getBlob(state, blobOid).content;
    }
    workingDir = next;
    events.push({ kind: 'worktree-updated', paths: Object.keys(entries) });
  }

  const reflog = [{ from, to: oid, action: 'reset' }, ...state.reflog];
  return { state: { ...state, branches, head, index, workingDir, reflog }, events };
}
```

In `reduce.ts`, add: `case 'reset': return reset(state, action.mode, action.target);`

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/reset.test.ts`
Expected: 7 passed. Run `npm test` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine/reset.test.ts
git commit -m "feat(engine): HEAD~n / HEAD@{n} resolution and three-zone reset"
```

---

### Task 8: `restore` (worktree and `--staged`)

**Files:**
- Create: `src/engine/actions/restore.ts`
- Modify: `src/engine/reduce.ts` (add case; delete the `default: not-implemented` arm — the
  `GitAction` union is now fully covered and TypeScript's exhaustiveness check takes over)
- Test: `tests/engine/restore.test.ts`

**Interfaces:**
- Consumes: `treeOf`, `getBlob`, `headCommitOid`.
- Produces: `restore(state, paths: string[], opts?: { staged?: boolean }): ReduceResult`.
  Plain restore: working dir ← index. `--staged`: index ← HEAD tree (path removed from index if
  absent in HEAD). Exactly real git's two arrows, one zone-step each.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/restore.test.ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

describe('restore', () => {
  it('restore <path> copies index -> working dir', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'oops'),
    ]);
    const r = reduce(base, { cmd: 'restore', paths: ['a.txt'] });
    expect(r.state.workingDir['a.txt']).toBe('one');
    expect(r.events).toEqual([{ kind: 'worktree-updated', paths: ['a.txt'] }]);
  });

  it('restore --staged copies HEAD -> index and leaves the working dir alone', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'),
    ]);
    const r = reduce(base, { cmd: 'restore', paths: ['a.txt'], staged: true });
    const s = r.state;
    expect((s.objects[s.index['a.txt']] as any).content).toBe('one');
    expect(s.workingDir['a.txt']).toBe('two');
  });

  it('restore --staged removes a path that is not in HEAD', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('new.txt', 'n'), addF('new.txt'),
    ]);
    const r = reduce(base, { cmd: 'restore', paths: ['new.txt'], staged: true });
    expect(r.state.index['new.txt']).toBeUndefined();
  });

  it('errors on unknown path', () => {
    const base = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const r = reduce(base, { cmd: 'restore', paths: ['nope.txt'] });
    expect(r.events[0]).toMatchObject({ kind: 'error', reasonKey: 'pathspec-no-match' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/restore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/engine/actions/restore.ts`**

```ts
import { headCommitOid } from '../refs';
import { getBlob, treeOf } from '../store';
import type { Oid, ReduceResult, RepoState } from '../types';

export function restore(
  state: RepoState,
  paths: string[],
  opts: { staged?: boolean } = {},
): ReduceResult {
  if (opts.staged) {
    const headEntries = treeOf(state, headCommitOid(state));
    const index: Record<string, Oid> = { ...state.index };
    for (const path of paths) {
      if (path in headEntries) index[path] = headEntries[path];
      else if (path in index) delete index[path];
      else {
        return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
      }
    }
    return { state: { ...state, index }, events: [{ kind: 'index-updated', paths }] };
  }
  const workingDir = { ...state.workingDir };
  for (const path of paths) {
    const blobOid = state.index[path];
    if (blobOid === undefined) {
      return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
    }
    workingDir[path] = getBlob(state, blobOid).content;
  }
  return { state: { ...state, workingDir }, events: [{ kind: 'worktree-updated', paths }] };
}
```

In `reduce.ts`: add `case 'restore': return restore(state, action.paths, { staged: action.staged });`
and delete the `default` arm.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/restore.test.ts` then `npm test`.
Expected: 4 passed; suite green; `tsc -b` (via `npm run build`) confirms the action union is
exhaustively handled.

- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine/restore.test.ts
git commit -m "feat(engine): restore worktree and --staged; reducer covers full action union"
```

---

### Task 9: `commit --amend` and the `git commit <path>` trap

The code already landed in Task 5's `commit.ts` (the `opts.paths` and `opts.amend` branches). This
task **tests** those branches — they are the Topic 4 trap (spec §8.4) and the honest-hashing no-op,
and they must not ship untested.

**Files:**
- Test: `tests/engine/commit-variants.test.ts`
- Modify: `src/engine/actions/commit.ts` only if a test exposes a defect.

**Interfaces:**
- Consumes: `commit` via `reduce`.
- Produces: verified behaviour that Task 10's `danglingBlobs` and Phase 4's trap predicate depend on:
  after the trap, the old staged blob is in `state.objects`, absent from every tree, absent from the
  index.

- [ ] **Step 1: Write the failing-or-passing tests (characterisation)**

```ts
// tests/engine/commit-variants.test.ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

describe('commit --amend', () => {
  it('replaces the tip: new hash, same parents, old commit still in the store', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
      write('a.txt', 'two fixed'), addF('a.txt'),
    ]);
    const oldTip = base.branches['main'];
    const r = reduce(base, { cmd: 'commit', message: 'c2 fixed', amend: true });
    const newTip = r.state.branches['main'];
    expect(newTip).not.toBe(oldTip);
    expect((r.state.objects[newTip] as any).parents)
      .toEqual((r.state.objects[oldTip] as any).parents);   // sibling, not child
    expect(r.state.objects[oldTip]).toBeDefined();          // the old commit is not gone
    expect(r.state.reflog[0]).toMatchObject({ from: oldTip, to: newTip, action: 'amend' });
  });

  it('amend with zero changes is a no-op with the SAME hash (content addressing, honestly)', () => {
    const base = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const r = reduce(base, { cmd: 'commit', message: 'c1', amend: true });
    expect(r.events).toEqual([{ kind: 'no-op', reasonKey: 'amend-identical' }]);
    expect(r.state).toBe(base);
  });
});

describe('the git commit <path> trap (spec §8.4 Topic 4)', () => {
  const trapState = () => run([
    write('a.txt', 'one'), addF('a.txt'), commitM('c1: base'),
    write('a.txt', 'two'), addF('a.txt'),      // staged: "two"
    write('a.txt', 'three'),                   // working: "three"
  ]);

  it('commits the WORKING version, not the staged one', () => {
    const r = reduce(trapState(), { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] });
    const s = r.state;
    const tree = (s.objects[(s.objects[s.branches['main']] as any).tree] as any).entries;
    expect((s.objects[tree['a.txt']] as any).content).toBe('three');
  });

  it('CONSUMES the staged snapshot and reports the loss', () => {
    const base = trapState();
    const stagedOid = base.index['a.txt'];              // blob "two"
    const r = reduce(base, { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] });
    expect(r.events).toContainEqual({ kind: 'staged-snapshot-lost', oids: [stagedOid] });
    expect(r.state.index['a.txt']).not.toBe(stagedOid); // gone from the index
    expect(r.state.objects[stagedOid]).toEqual({ kind: 'blob', content: 'two' }); // but not from the store
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run tests/engine/commit-variants.test.ts`
Expected: PASS if Task 5's implementation is correct; any failure is a real defect in `commit.ts` —
fix it minimally and re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/engine/commit-variants.test.ts src/engine/actions/commit.ts
git commit -m "test(engine): amend semantics and the commit-<path> staged-snapshot trap"
```

---

### Task 10: Queries — reachability, ghosts, `fsck` (dangling blobs), log

**Files:**
- Create: `src/engine/queries.ts`
- Test: `tests/engine/queries.test.ts`

**Interfaces:**
- Consumes: `getCommit`, `getTree`, `headCommitOid`.
- Produces (all pure reads — Phase 2 renders ghosts from `unreachableCommits`; Phase 4's fsck
  exercise reads `danglingBlobs`; the inspector uses `log`):
  - `reachableCommits(state): Set<Oid>` — from all branch tips + detached HEAD, via parents.
  - `unreachableCommits(state): Oid[]` — insertion order, commits not in the reachable set.
  - `danglingBlobs(state): Oid[]` — blobs referenced by **no** commit tree in the store (reachable
    or not) and **not** in the index. This is what `git fsck --lost-found` shows.
  - `log(state): Oid[]` — reachable commits, newest-first by insertion order.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/engine/queries.test.ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { danglingBlobs, log, reachableCommits, unreachableCommits } from '../../src/engine/queries';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

describe('queries', () => {
  it('a hard reset makes the tip unreachable — but never gone', () => {
    let s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    ]);
    const c2 = s.insertionOrder[1];
    s = reduce(s, { cmd: 'reset', mode: 'hard', target: 'HEAD~1' }).state;
    expect(reachableCommits(s).has(c2)).toBe(false);
    expect(unreachableCommits(s)).toEqual([c2]);   // the ghost the renderer draws
    expect(s.objects[c2]).toBeDefined();
  });

  it('the trap blob is dangling; committed and staged blobs are not', () => {
    let s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1: base'),
      write('a.txt', 'two'), addF('a.txt'),
      write('a.txt', 'three'),
    ]);
    const stagedOid = s.index['a.txt'];
    expect(danglingBlobs(s)).toEqual([]);          // staged => referenced by the index
    s = reduce(s, { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] }).state;
    expect(danglingBlobs(s)).toEqual([stagedOid]); // consumed => dangling. fsck finds it.
  });

  it('log lists reachable commits newest-first', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    ]);
    expect(log(s)).toEqual([s.insertionOrder[1], s.insertionOrder[0]]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/engine/queries.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/engine/queries.ts`**

```ts
import { headCommitOid } from './refs';
import { getCommit, getTree } from './store';
import type { Oid, RepoState } from './types';

export function reachableCommits(state: RepoState): Set<Oid> {
  const seen = new Set<Oid>();
  const stack: Oid[] = [...Object.values(state.branches)];
  if (state.head.kind === 'detached') stack.push(state.head.oid);
  while (stack.length > 0) {
    const oid = stack.pop()!;
    if (seen.has(oid)) continue;
    seen.add(oid);
    stack.push(...getCommit(state, oid).parents);
  }
  return seen;
}

export function unreachableCommits(state: RepoState): Oid[] {
  const reachable = reachableCommits(state);
  return state.insertionOrder.filter((oid) => !reachable.has(oid));
}

/** Blobs no tree references and the index doesn't hold: what `git fsck --lost-found` finds. */
export function danglingBlobs(state: RepoState): Oid[] {
  const referenced = new Set<Oid>(Object.values(state.index));
  for (const commitOid of state.insertionOrder) {
    const tree = getTree(state, getCommit(state, commitOid).tree);
    for (const blobOid of Object.values(tree.entries)) referenced.add(blobOid);
  }
  return Object.keys(state.objects).filter(
    (oid) => state.objects[oid].kind === 'blob' && !referenced.has(oid),
  );
}

export function log(state: RepoState): Oid[] {
  const reachable = reachableCommits(state);
  return [...state.insertionOrder].reverse().filter((oid) => reachable.has(oid));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/engine/queries.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/queries.ts tests/engine/queries.test.ts
git commit -m "feat(engine): reachability, ghost commits, dangling blobs (fsck), log"
```

---

### Task 11: Differential harness — real git as the oracle (spec §15 step 1b)

**Files:**
- Create: `tests/differential/harness.ts`
- Test: `tests/differential/differential.test.ts`

**Interfaces:**
- Consumes: `reduce`, `initialState`, `queries`, `getBlob`, `getCommit`, `getTree`, `treeOf`,
  `headCommitOid`.
- Produces: `RealGit` (applies `GitAction`s to a temp real repo), `canonicalOfReal(rg): CanonicalRepo`,
  `canonicalOfEngine(state): CanonicalRepo`. Phase 4+ adds new differential sequences to the same
  table.

**Canonical form** (hash-agnostic, per spec §10.3 — messages are the ids, which is why differential
sequences require unique messages):

```ts
interface CanonicalRepo {
  commits: { message: string; parents: string[] }[]; // sorted by message
  branches: Record<string, string>;                  // name -> tip message
  head: string;                                      // 'branch:<name>' | 'detached:<message>'
  index: Record<string, string>;                     // path -> content
  worktree: Record<string, string>;                  // path -> content
  danglingBlobContents: string[];                    // sorted — the fsck cross-check
}
```

- [ ] **Step 1: Write the harness**

```ts
// tests/differential/harness.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GitAction, Oid, RepoState } from '../../src/engine/types';
import { getBlob, getCommit, getTree, treeOf } from '../../src/engine/store';
import { headCommitOid } from '../../src/engine/refs';
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
    return execFileSync('git', args, { cwd: this.dir, encoding: 'utf8' }).trim();
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
```

- [ ] **Step 2: Write the differential test table**

```ts
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
```

- [ ] **Step 3: Run the differential suite**

Run: `npm run test:diff`
Expected: 8 passed. The trap sequence is the critical one — it proves the engine's "consume"
semantics AND that real git's fsck sees the same lost content (`danglingBlobContents: ['two']` on
both sides). If real git reports an extra dangling blob somewhere, the engine is wrong, not the
test: investigate before touching the canonicaliser.

Known flake risk: none — no timestamps are compared anywhere, messages are the ids.

- [ ] **Step 4: Wire into CI intent**

Add to `package.json` if not present already (Task 1 defined it): `test:all` runs both suites.
Document in `README.md` (create it):

```markdown
# git game

Engine: `src/engine` — pure `reduce(state, action) => { state, events }`.
`npm test` — unit tests. `npm run test:diff` — differential tests against real git (needs `git` ≥ 2.40 on PATH).
```

- [ ] **Step 5: Commit**

```bash
git add tests/differential README.md package.json
git commit -m "test(engine): differential harness — engine vs real git incl. fsck cross-check"
```

---

## Self-review (done at plan-writing time)

- **Spec coverage (Phase 1 scope = §15 steps 0/1/1b):** step 0 → Task 1; engine list "objects,
  deterministic hashing, refs, HEAD, index, reflog, commit, branch, switch, reset, dangling-object
  tracking (fsck)" → Tasks 2–10; step 1b incl. index + dangling comparison → Task 11 (the canonical
  form compares index, worktree, and dangling blob contents, not just the DAG).
- **Deliberate scope exclusions:** merge/rebase/remotes are Topics 6–8, outside the slice; `revert`
  is Topic 5 content but not needed until Phase 4 exercises exist — it is one more action module
  added by a later phase through the same `reduce` switch.
- **Type consistency:** `ReduceResult` everywhere; `commit(state, message, opts)` signature fixed in
  Task 5 and reused by Task 9; `resolveRef` extended in Task 7 without a signature change; the `run`
  helper is exported from `add.test.ts` and reused.
- **Placeholder scan:** clean — every step has code or an exact command.
