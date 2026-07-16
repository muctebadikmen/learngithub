# Phase 3 — Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the game playable — a live repository the learner mutates through buttons and forms (never by typing git commands), with working-directory / staging panels, the full command surface (create/edit files, add, commit, branch, switch, reset, restore), a commit inspector, and an animated, accessible graph that updates on every action.

**Architecture:** One `useRepo` hook holds the live `RepoState` and exposes a single `dispatch(action: GitAction)` — every control routes through it (this is the Phase 3→4 interface). The graph is `layout(state)` re-rendered on each change; because layout is structurally stable, existing commits keep their positions and only new nodes/moved refs animate (CSS transforms, `prefers-reduced-motion` honored). All decision logic lives in small pure, unit-tested helpers; components are thin wiring verified by static-render tests plus manual browser checks.

**Tech Stack:** React 19 (hooks), TypeScript strict, Tailwind v4, SVG + CSS transitions (no d3, no drag-lib), Vitest + `react-dom/server` render tests. No new dependencies.

## Global Constraints

- **Every user-visible action dispatches a `GitAction` through the one `dispatch` entry point** — no control mutates state directly. This is what makes Phase 5's accessibility and Phase 4's level system nearly free.
- **No git commands are typed.** Actions are buttons, forms, dropdowns, and (later) menus. Typing commands is explicitly out of scope (a v2/settings idea).
- **No "reveal answer" affordance** anywhere (spec §7.1) — not relevant yet, but do not add hint/solution buttons.
- **The engine and layout are frozen** — Phase 3 only consumes `reduce`, `queries`, `layout`, and the engine helper exports. It must NOT modify `src/engine/**` or `src/layout/**`. (`src/graph/GitGraph.tsx` is extended in Task 4 for animation + interactivity — that is allowed; it is Phase 2/3 shared territory.)
- **Git terms (`HEAD`, `main`, branch names, `commit`, `branch`, `switch`, `reset`, `restore`) stay in English in every locale; no `text-transform`.** User-facing sentences (error messages, labels) go through `src/ui/messages.ts` now as an English map — a temporary shim Phase 5 replaces with real i18n. Do not scatter raw English sentences across components; put them in `messages.ts`.
- TypeScript `strict`, `noUnusedLocals`, `noUnusedParameters` on; `npm run build` must pass. Type-only imports use `import type`. Engine/layout imports carry no `.ts` extension.
- Tests live under `tests/ui/` and run in `npm test` (the vitest include already matches `tests/**/*.test.{ts,tsx}`).

## Engine facts the implementer must rely on (verified, do not re-derive)

- `reduce(state, action): { state, events }`. `initialState()` from `src/engine/actions/init`; `reduce(initialState(), {cmd:'init'})` gives an initialised empty repo (default branch `main`, unborn).
- `GitAction` union (exact): `{cmd:'init'}` | `{cmd:'writeFile'; path; content}` | `{cmd:'add'; paths}` | `{cmd:'commit'; message; amend?; paths?}` | `{cmd:'branch'; name}` | `{cmd:'switch'; target; create?; detach?}` | `{cmd:'reset'; mode:'soft'|'mixed'|'hard'; target}` | `{cmd:'restore'; paths; staged?}`.
- Error/no-op events carry `reasonKey` (+ optional `params`). All reasonKeys: `already-a-repo, amend-identical, branch-exists, detach-requires-flag, no-commits-yet, not-a-repo, nothing-to-commit, path-is-ignored, pathspec-no-match, switch-dirty, unknown-ref`. Params: `unknown-ref{ref}`, `pathspec-no-match{path}`, `path-is-ignored{path}`, `branch-exists{name}`.
- Helper exports to reuse: `headCommitOid(state)`, `resolveRef(state, ref)` from `src/engine/refs`; `treeOf(state, commitOid|null)`, `getBlob`, `getCommit` from `src/engine/store`; `isDirty(state)` from `src/engine/actions/switch`; `reachableCommits`, `log` from `src/engine/queries`.
- `RepoState` fields: `initialised, objects, branches, head, index, workingDir, reflog, insertionOrder, ignored`. `head` = `{kind:'branch';name}` | `{kind:'detached';oid}`.
- `layout(state): LayoutModel` with `nodes[{oid,row,lane,message,parents,reachable}]`, `edges[{child,parent}]`, `refs[{label,oid,isHead}]`, `headOid`, `detachedHead`, `rowCount`, `laneCount`.

## File Structure

```
src/ui/
  useRepo.ts          # live state + single dispatch entry point (Task 1)
  fileStatus.ts       # pure: working-dir + staging classification (Task 1)
  affordances.ts      # pure: canCommit, branch list, current branch, isDirty re-export (Task 1)
  messages.ts         # reasonKey -> English sentence (temporary i18n shim) (Task 1)
  WorkingDirPanel.tsx # working files + new/edit + stage (Task 1)
  StagingPanel.tsx    # staged files + unstage (Task 1)
  CommitBar.tsx       # message + Commit + Amend (Task 2)
  RefBar.tsx          # branch create / switch / detach controls (Task 2)
  Notice.tsx          # surfaces the last error/no-op event as a dismissible notice (Task 2)
  HistoryTools.tsx    # reset (soft/mixed/hard) + restore, targeting the selected commit (Task 3)
  CommitInspector.tsx # selected commit's message, parents, files (Task 3)
  liveRegion.ts       # pure: engine event -> short spoken sentence for ARIA (Task 4)
src/App.tsx           # composes the layout (modified across tasks)
src/graph/GitGraph.tsx# extended: onSelect(oid), selected highlight, CSS transitions, focusable nodes (Task 4)
tests/ui/*.test.ts(x) # unit tests for pure helpers; render tests for panels
```

---

## Task 1: Live repo + working-directory & staging panels

**Files:**
- Create: `src/ui/useRepo.ts`, `src/ui/fileStatus.ts`, `src/ui/affordances.ts`, `src/ui/messages.ts`, `src/ui/WorkingDirPanel.tsx`, `src/ui/StagingPanel.tsx`
- Modify: `src/App.tsx`
- Test: `tests/ui/fileStatus.test.ts`, `tests/ui/affordances.test.ts`

**Interfaces produced (Tasks 2–4 consume):**
- `useRepo(): { state, lastEvents, dispatch, reset }` — `dispatch(action): EngineEvent[]` returns the events synchronously.
- `workingFiles(state): { path, status }[]` where status ∈ `'untracked'|'modified'|'staged'|'clean'`.
- `stagedFiles(state): { path, kind }[]` where kind ∈ `'added'|'modified'`.
- `canCommit(state): boolean`, `currentBranch(state): string|null`, `branchNames(state): string[]`, `isDirty(state)`.
- `describeEvent(reasonKey, params?): string`.

- [ ] **Step 1: Write the failing pure-helper tests**

Create `tests/ui/fileStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { workingFiles, stagedFiles } from '../../src/ui/fileStatus';

describe('workingFiles', () => {
  it('marks a brand-new unstaged file untracked', () => {
    const s = run([write('a.txt', '1')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'untracked' }]);
  });
  it('marks a staged-but-uncommitted file staged', () => {
    const s = run([write('a.txt', '1'), addF('a.txt')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'staged' }]);
  });
  it('marks a committed-then-edited file modified', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), write('a.txt', '2')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'modified' }]);
  });
  it('marks a committed unchanged file clean', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'clean' }]);
  });
});

describe('stagedFiles', () => {
  it('lists an added file', () => {
    const s = run([write('a.txt', '1'), addF('a.txt')]);
    expect(stagedFiles(s)).toEqual([{ path: 'a.txt', kind: 'added' }]);
  });
  it('lists a modified-and-restaged file as modified', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), write('a.txt', '2'), addF('a.txt')]);
    expect(stagedFiles(s)).toEqual([{ path: 'a.txt', kind: 'modified' }]);
  });
  it('is empty right after a commit', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    expect(stagedFiles(s)).toEqual([]);
  });
});
```

Create `tests/ui/affordances.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { canCommit, currentBranch, branchNames } from '../../src/ui/affordances';

describe('canCommit', () => {
  it('is false on an empty repo', () => {
    expect(canCommit(run([]))).toBe(false);
  });
  it('is true when something is staged', () => {
    expect(canCommit(run([write('a.txt', '1'), addF('a.txt')]))).toBe(true);
  });
  it('is false right after committing', () => {
    expect(canCommit(run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]))).toBe(false);
  });
});

describe('branches', () => {
  it('reports the current branch and the branch list', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), { cmd: 'branch', name: 'feature' }]);
    expect(currentBranch(s)).toBe('main');
    expect(branchNames(s)).toEqual(['feature', 'main']);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/ui`
Expected: FAIL — modules `src/ui/fileStatus`, `src/ui/affordances` not found.

- [ ] **Step 3: Write `src/ui/fileStatus.ts`**

```ts
import { headCommitOid } from '../engine/refs';
import { getBlob, treeOf } from '../engine/store';
import type { RepoState } from '../engine/types';

export type WorkStatus = 'untracked' | 'modified' | 'staged' | 'clean';
export interface WorkingFile { path: string; status: WorkStatus }
export interface StagedFile { path: string; kind: 'added' | 'modified' }

/** Every file in the working directory, classified against the index and HEAD. */
export function workingFiles(state: RepoState): WorkingFile[] {
  const head = treeOf(state, headCommitOid(state));
  const idx = state.index;
  const rows: WorkingFile[] = [];
  for (const [path, content] of Object.entries(state.workingDir)) {
    if (!(path in idx)) { rows.push({ path, status: 'untracked' }); continue; }
    if (content !== getBlob(state, idx[path]).content) { rows.push({ path, status: 'modified' }); continue; }
    rows.push({ path, status: head[path] === idx[path] ? 'clean' : 'staged' });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

/** Index entries that differ from HEAD — i.e. what a commit would newly record. */
export function stagedFiles(state: RepoState): StagedFile[] {
  const head = treeOf(state, headCommitOid(state));
  const rows: StagedFile[] = [];
  for (const [path, oid] of Object.entries(state.index)) {
    if (head[path] === undefined) rows.push({ path, kind: 'added' });
    else if (head[path] !== oid) rows.push({ path, kind: 'modified' });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
```

- [ ] **Step 4: Write `src/ui/affordances.ts`**

```ts
import { headCommitOid } from '../engine/refs';
import { treeOf } from '../engine/store';
import { isDirty } from '../engine/actions/switch';
import type { RepoState } from '../engine/types';

/** Does the index differ from HEAD? (i.e. a commit would create a new snapshot) */
export function canCommit(state: RepoState): boolean {
  const head = treeOf(state, headCommitOid(state));
  const idx = state.index;
  const keys = new Set<string>([...Object.keys(head), ...Object.keys(idx)]);
  for (const k of keys) if (head[k] !== idx[k]) return true;
  return false;
}

export function currentBranch(state: RepoState): string | null {
  return state.head.kind === 'branch' ? state.head.name : null;
}

export function branchNames(state: RepoState): string[] {
  return Object.keys(state.branches).sort();
}

export { isDirty };
```

- [ ] **Step 5: Write `src/ui/messages.ts`**

```ts
/**
 * reasonKey -> human sentence. TEMPORARY English shim; Phase 5 replaces this file
 * with real i18n (the engine already speaks in keys, so only this map changes).
 */
export const REASONS: Record<string, string> = {
  'already-a-repo': 'This is already a repository.',
  'amend-identical': 'Nothing changed — the amended commit would be identical.',
  'branch-exists': 'A branch named "{name}" already exists.',
  'detach-requires-flag': '"{ref}" is a commit, not a branch.',
  'no-commits-yet': 'Make your first commit before doing that.',
  'not-a-repo': 'This folder is not a repository yet.',
  'nothing-to-commit': 'Nothing is staged to commit.',
  'path-is-ignored': '"{path}" is ignored.',
  'pathspec-no-match': 'There is no tracked file "{path}".',
  'switch-dirty': 'You have uncommitted changes — commit or discard them first.',
  'unknown-ref': 'There is no branch or commit named "{ref}".',
};

export function describeEvent(reasonKey: string, params?: Record<string, string>): string {
  const base = REASONS[reasonKey] ?? reasonKey;
  if (!params) return base;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), base);
}
```

- [ ] **Step 6: Write `src/ui/useRepo.ts`**

```ts
import { useCallback, useMemo, useRef, useState } from 'react';
import { initialState } from '../engine/actions/init';
import { reduce } from '../engine/reduce';
import type { EngineEvent, GitAction, RepoState } from '../engine/types';

export interface RepoApi {
  state: RepoState;
  lastEvents: EngineEvent[];
  dispatch: (action: GitAction) => EngineEvent[];
  reset: () => void;
}

const freshRepo = (): RepoState => reduce(initialState(), { cmd: 'init' }).state;

/** The single source of truth: live RepoState + the one dispatch entry point. */
export function useRepo(seed?: (s: RepoState) => RepoState): RepoApi {
  const [state, setState] = useState<RepoState>(() => (seed ? seed(freshRepo()) : freshRepo()));
  const [lastEvents, setLastEvents] = useState<EngineEvent[]>([]);
  const ref = useRef(state);
  ref.current = state;

  const dispatch = useCallback((action: GitAction): EngineEvent[] => {
    const r = reduce(ref.current, action);
    ref.current = r.state;
    setState(r.state);
    setLastEvents(r.events);
    return r.events;
  }, []);

  const reset = useCallback(() => {
    const fresh = freshRepo();
    ref.current = fresh;
    setState(fresh);
    setLastEvents([]);
  }, []);

  return useMemo(() => ({ state, lastEvents, dispatch, reset }), [state, lastEvents, dispatch, reset]);
}
```

- [ ] **Step 7: Write `src/ui/WorkingDirPanel.tsx`**

```tsx
import { useState } from 'react';
import type { GitAction } from '../engine/types';
import { workingFiles, type WorkStatus } from './fileStatus';
import type { RepoState } from '../engine/types';

const STATUS_STYLE: Record<WorkStatus, string> = {
  untracked: 'text-zinc-500',
  modified: 'text-amber-400',
  staged: 'text-emerald-400',
  clean: 'text-zinc-400',
};

export function WorkingDirPanel({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const files = workingFiles(state);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const openEditor = (path: string) => { setEditing(path); setEditContent(state.workingDir[path] ?? ''); };
  const saveEditor = () => { if (editing) { dispatch({ cmd: 'writeFile', path: editing, content: editContent }); setEditing(null); } };

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Working directory</h2>
      <ul className="space-y-1 mb-3">
        {files.length === 0 && <li className="text-sm text-zinc-600 italic">empty</li>}
        {files.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-2 text-sm font-mono">
            <button className={`truncate hover:underline ${STATUS_STYLE[f.status]}`} onClick={() => openEditor(f.path)} title="edit">
              {f.path}
            </button>
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-zinc-600">{f.status}</span>
              {f.status !== 'clean' && f.status !== 'staged' && (
                <button className="text-emerald-400 hover:text-emerald-300 text-xs" onClick={() => dispatch({ cmd: 'add', paths: [f.path] })} title="stage (git add)">
                  stage →
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="new-file.txt"
          className="flex-1 min-w-0 rounded bg-zinc-800 px-2 py-1 text-sm font-mono text-zinc-100 placeholder:text-zinc-600"
        />
        <button
          className="rounded bg-zinc-700 px-2 py-1 text-sm hover:bg-zinc-600 disabled:opacity-40"
          disabled={newName.trim() === ''}
          onClick={() => { dispatch({ cmd: 'writeFile', path: newName.trim(), content: '' }); openEditor(newName.trim()); setNewName(''); }}
        >
          + file
        </button>
      </div>

      {editing && (
        <div className="mt-3 rounded border border-zinc-700 bg-zinc-950 p-2">
          <div className="text-xs font-mono text-zinc-400 mb-1">{editing}</div>
          <textarea
            value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4}
            className="w-full rounded bg-zinc-900 p-2 text-sm font-mono text-zinc-100"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setEditing(null)}>cancel</button>
            <button className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600" onClick={saveEditor}>save</button>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Write `src/ui/StagingPanel.tsx`**

```tsx
import type { GitAction, RepoState } from '../engine/types';
import { stagedFiles } from './fileStatus';

export function StagingPanel({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const staged = stagedFiles(state);
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Staging area</h2>
      <ul className="space-y-1">
        {staged.length === 0 && <li className="text-sm text-zinc-600 italic">nothing staged</li>}
        {staged.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-2 text-sm font-mono text-emerald-400">
            <span className="truncate">{f.path}</span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-zinc-600">{f.kind}</span>
              <button className="text-zinc-400 hover:text-zinc-200 text-xs" onClick={() => dispatch({ cmd: 'restore', paths: [f.path], staged: true })} title="unstage (git restore --staged)">
                ← unstage
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 9: Rewire `src/App.tsx` to the interactive shell**

```tsx
import { useMemo } from 'react';
import { layout } from './layout/layout';
import { GitGraph } from './graph/GitGraph';
import { useRepo } from './ui/useRepo';
import { WorkingDirPanel } from './ui/WorkingDirPanel';
import { StagingPanel } from './ui/StagingPanel';

export default function App() {
  const repo = useRepo();
  const model = useMemo(() => layout(repo.state), [repo.state]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">git, visually</h1>
          <p className="text-sm text-zinc-500 font-mono">edit files · stage · commit · branch — watch the graph</p>
        </div>
        <button className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800" onClick={repo.reset}>
          reset repo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          <WorkingDirPanel state={repo.state} dispatch={repo.dispatch} />
          <StagingPanel state={repo.state} dispatch={repo.dispatch} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto min-h-[300px]">
          <GitGraph model={model} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 10: Run the pure-helper tests (green) and the full suite**

Run: `npx vitest run tests/ui` → PASS. Then `npm test` → full suite green. Then `npm run build` → clean.

- [ ] **Step 11: Commit**

```bash
git add src/ui src/App.tsx tests/ui
git commit -m "feat(ui): live repo + working-directory & staging panels (create/edit/stage/unstage)"
```

---

## Task 2: Commit, branch, and switch controls

**Files:**
- Create: `src/ui/CommitBar.tsx`, `src/ui/RefBar.tsx`, `src/ui/Notice.tsx`
- Modify: `src/App.tsx`
- Test: `tests/ui/notice.test.ts` (pure event→notice), `tests/ui/refbar.render.test.tsx`

**Interfaces produced:** `noticeFromEvents(events): { kind:'error'|'info', text } | null` (pure); `CommitBar`, `RefBar`, `Notice` components.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/notice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { EngineEvent } from '../../src/engine/types';
import { noticeFromEvents } from '../../src/ui/Notice';

describe('noticeFromEvents', () => {
  it('surfaces an error event as an error notice', () => {
    const ev: EngineEvent[] = [{ kind: 'error', reasonKey: 'switch-dirty' }];
    expect(noticeFromEvents(ev)).toEqual({ kind: 'error', text: 'You have uncommitted changes — commit or discard them first.' });
  });
  it('interpolates params', () => {
    const ev: EngineEvent[] = [{ kind: 'error', reasonKey: 'branch-exists', params: { name: 'feature' } }];
    expect(noticeFromEvents(ev)?.text).toBe('A branch named "feature" already exists.');
  });
  it('surfaces a no-op as an info notice', () => {
    const ev: EngineEvent[] = [{ kind: 'no-op', reasonKey: 'amend-identical' }];
    expect(noticeFromEvents(ev)).toEqual({ kind: 'info', text: 'Nothing changed — the amended commit would be identical.' });
  });
  it('returns null when nothing noteworthy happened', () => {
    const ev: EngineEvent[] = [{ kind: 'commit-created', oid: 'abc' }];
    expect(noticeFromEvents(ev)).toBeNull();
  });
});
```

Create `tests/ui/refbar.render.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { run, write, addF, commitM } from '../engine/helpers';
import { RefBar } from '../../src/ui/RefBar';

describe('RefBar render', () => {
  it('lists existing branches to switch to', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), { cmd: 'branch', name: 'feature' }]);
    const html = renderToStaticMarkup(<RefBar state={s} dispatch={() => []} />);
    expect(html).toContain('feature');
    expect(html).toContain('main');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/ui/notice.test.ts tests/ui/refbar.render.test.tsx`
Expected: FAIL — `src/ui/Notice`, `src/ui/RefBar` not found.

- [ ] **Step 3: Write `src/ui/Notice.tsx`**

```tsx
import type { EngineEvent } from '../engine/types';
import { describeEvent } from './messages';

export interface NoticeData { kind: 'error' | 'info'; text: string }

/** Turn the last dispatch's events into a single user-facing notice, or null. */
export function noticeFromEvents(events: EngineEvent[]): NoticeData | null {
  for (const e of events) {
    if (e.kind === 'error') return { kind: 'error', text: describeEvent(e.reasonKey, e.params) };
    if (e.kind === 'no-op') return { kind: 'info', text: describeEvent(e.reasonKey) };
  }
  return null;
}

export function Notice({ data, onDismiss }: { data: NoticeData | null; onDismiss: () => void }) {
  if (!data) return null;
  const tone = data.kind === 'error' ? 'border-rose-800 bg-rose-950/60 text-rose-200' : 'border-sky-800 bg-sky-950/60 text-sky-200';
  return (
    <div role="status" className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <span>{data.text}</span>
      <button className="text-xs opacity-70 hover:opacity-100" onClick={onDismiss} aria-label="dismiss">✕</button>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/ui/CommitBar.tsx`**

```tsx
import { useState } from 'react';
import type { GitAction, RepoState } from '../engine/types';
import { canCommit } from './affordances';

export function CommitBar({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const [message, setMessage] = useState('');
  const ready = canCommit(state) && message.trim() !== '';
  const commit = (amend?: boolean) => {
    dispatch({ cmd: 'commit', message: message.trim(), amend });
    setMessage('');
  };
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Commit</h2>
      <input
        value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="commit message"
        className="w-full rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 mb-2"
      />
      <div className="flex gap-2">
        <button
          className="flex-1 rounded bg-emerald-700 px-2 py-1 text-sm hover:bg-emerald-600 disabled:opacity-40"
          disabled={!ready} onClick={() => commit(false)}
        >
          commit
        </button>
        <button
          className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          disabled={message.trim() === ''} onClick={() => commit(true)}
          title="replace the last commit (git commit --amend)"
        >
          amend
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `src/ui/RefBar.tsx`**

```tsx
import { useState } from 'react';
import type { GitAction, RepoState } from '../engine/types';
import { branchNames, currentBranch } from './affordances';

export function RefBar({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const [name, setName] = useState('');
  const current = currentBranch(state);
  const branches = branchNames(state);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Branches</h2>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">
          on <span className="font-mono text-emerald-400">{current ?? 'detached HEAD'}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {branches.map((b) => (
            <button
              key={b}
              className={`rounded px-2 py-0.5 text-xs font-mono border ${b === current ? 'border-emerald-600 text-emerald-300' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
              disabled={b === current}
              onClick={() => dispatch({ cmd: 'switch', target: b })}
              title={`switch to ${b}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="new-branch"
          className="flex-1 min-w-0 rounded bg-zinc-800 px-2 py-1 text-sm font-mono text-zinc-100 placeholder:text-zinc-600"
        />
        <button
          className="rounded bg-zinc-700 px-2 py-1 text-xs hover:bg-zinc-600 disabled:opacity-40"
          disabled={name.trim() === ''}
          onClick={() => { dispatch({ cmd: 'branch', name: name.trim() }); setName(''); }}
          title="create a branch here (git branch)"
        >
          branch
        </button>
        <button
          className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600 disabled:opacity-40"
          disabled={name.trim() === ''}
          onClick={() => { dispatch({ cmd: 'switch', target: name.trim(), create: true }); setName(''); }}
          title="create and switch (git switch -c)"
        >
          branch + switch
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Wire into `src/App.tsx`** — add commit/ref controls to the left column and a notice above the graph.

Add imports and a dismissible notice derived from `repo.lastEvents`:

```tsx
import { useMemo, useState, useEffect } from 'react';
// ...existing imports...
import { CommitBar } from './ui/CommitBar';
import { RefBar } from './ui/RefBar';
import { Notice, noticeFromEvents, type NoticeData } from './ui/Notice';
```

In the component body, after `const model = ...`:

```tsx
  const [notice, setNotice] = useState<NoticeData | null>(null);
  useEffect(() => { setNotice(noticeFromEvents(repo.lastEvents)); }, [repo.lastEvents]);
```

Left column becomes:

```tsx
        <div className="space-y-4">
          <WorkingDirPanel state={repo.state} dispatch={repo.dispatch} />
          <StagingPanel state={repo.state} dispatch={repo.dispatch} />
          <CommitBar state={repo.state} dispatch={repo.dispatch} />
          <RefBar state={repo.state} dispatch={repo.dispatch} />
        </div>
```

Graph column gets the notice on top:

```tsx
        <div className="space-y-3">
          <Notice data={notice} onDismiss={() => setNotice(null)} />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto min-h-[300px]">
            <GitGraph model={model} />
          </div>
        </div>
```

- [ ] **Step 7: Tests + build**

Run: `npx vitest run tests/ui` → PASS. `npm test` → green. `npm run build` → clean.

- [ ] **Step 8: Commit**

```bash
git add src/ui src/App.tsx tests/ui
git commit -m "feat(ui): commit, branch, and switch controls with error notices"
```

---

## Task 3: Reset, restore, and the commit inspector

**Files:**
- Create: `src/ui/HistoryTools.tsx`, `src/ui/CommitInspector.tsx`, `src/ui/commitDetails.ts`
- Modify: `src/App.tsx` (selection state), `src/graph/GitGraph.tsx` (node click → onSelect, selected ring)
- Test: `tests/ui/commitDetails.test.ts`

**Interfaces produced:** `commitDetails(state, oid): { message, parents: string[], files: {path,content}[] }` (pure); `HistoryTools`, `CommitInspector` components; `GitGraph` gains optional `onSelect?: (oid)=>void` and `selectedOid?: string`.

- [ ] **Step 1: Write the failing test**

Create `tests/ui/commitDetails.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { commitDetails } from '../../src/ui/commitDetails';

describe('commitDetails', () => {
  it('reports message, parents, and files of a commit', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('b.txt', 'two'), addF('b.txt'), commitM('c2'),
    ]);
    const tip = s.branches['main'];
    const d = commitDetails(s, tip);
    expect(d.message).toBe('c2');
    expect(d.parents).toHaveLength(1);
    expect(d.files.map((f) => f.path).sort()).toEqual(['a.txt', 'b.txt']);
    expect(d.files.find((f) => f.path === 'a.txt')!.content).toBe('one');
  });
  it('reports no parents for the root commit', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    expect(commitDetails(s, s.branches['main']).parents).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/commitDetails.test.ts`
Expected: FAIL — `src/ui/commitDetails` not found.

- [ ] **Step 3: Write `src/ui/commitDetails.ts`**

```ts
import { getBlob, getCommit, getTree } from '../engine/store';
import type { Oid, RepoState } from '../engine/types';

export interface CommitDetails {
  oid: Oid;
  message: string;
  parents: Oid[];
  files: { path: string; content: string }[];
}

export function commitDetails(state: RepoState, oid: Oid): CommitDetails {
  const c = getCommit(state, oid);
  const tree = getTree(state, c.tree);
  const files = Object.entries(tree.entries)
    .map(([path, blobOid]) => ({ path, content: getBlob(state, blobOid).content }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return { oid, message: c.message, parents: c.parents, files };
}
```

- [ ] **Step 4: Write `src/ui/CommitInspector.tsx`**

```tsx
import type { RepoState } from '../engine/types';
import { commitDetails } from './commitDetails';

export function CommitInspector({ state, oid }: { state: RepoState; oid: string | null }) {
  if (!oid || !state.objects[oid] || state.objects[oid].kind !== 'commit') {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Commit</h2>
        <p className="text-sm text-zinc-600 italic">select a commit in the graph</p>
      </section>
    );
  }
  const d = commitDetails(state, oid);
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Commit</h2>
      <div className="text-sm font-mono text-zinc-100 mb-1">{d.message}</div>
      <div className="text-[11px] font-mono text-zinc-500 mb-2">
        {oid.slice(0, 8)} · {d.parents.length === 0 ? 'root' : `${d.parents.length} parent${d.parents.length > 1 ? 's' : ''}`}
      </div>
      <ul className="space-y-0.5">
        {d.files.map((f) => (
          <li key={f.path} className="text-xs font-mono text-zinc-400 truncate">{f.path}</li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Write `src/ui/HistoryTools.tsx`**

`reset` targets the selected commit (falls back to `HEAD`); `restore` discards working changes to the selected file set (here: all modified files, i.e. `restore .`). Constrained: reset needs a selected commit or defaults to HEAD; buttons disabled when not initialised.

```tsx
import type { GitAction, RepoState } from '../engine/types';
import { workingFiles } from './fileStatus';

export function HistoryTools({ state, dispatch, selectedOid }: {
  state: RepoState; dispatch: (a: GitAction) => unknown; selectedOid: string | null;
}) {
  const target = selectedOid ?? 'HEAD';
  const targetLabel = selectedOid ? selectedOid.slice(0, 8) : 'HEAD';
  const modified = workingFiles(state).filter((f) => f.status === 'modified').map((f) => f.path);

  const reset = (mode: 'soft' | 'mixed' | 'hard') => dispatch({ cmd: 'reset', mode, target });

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">History tools</h2>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">
          move current branch to <span className="font-mono text-zinc-300">{targetLabel}</span>
        </div>
        <div className="flex gap-1">
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800" onClick={() => reset('soft')} title="keep index + working tree">soft</button>
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800" onClick={() => reset('mixed')} title="reset index, keep working tree">mixed</button>
          <button className="rounded border border-rose-800 text-rose-300 px-2 py-0.5 text-xs hover:bg-rose-950" onClick={() => reset('hard')} title="discard index + working tree">hard</button>
        </div>
      </div>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">discard unstaged edits ({modified.length})</div>
        <button
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800 disabled:opacity-40"
          disabled={modified.length === 0}
          onClick={() => dispatch({ cmd: 'restore', paths: modified })}
          title="git restore <files>"
        >
          restore
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Extend `src/graph/GitGraph.tsx` for selection**

Add optional props `onSelect?: (oid: string) => void` and `selectedOid?: string`. Make each node's `<circle>` clickable (and keyboard-focusable via `tabIndex`/`role="button"` on the node group) and draw a highlight ring when `n.oid === selectedOid`. Change the signature to:

```tsx
export function GitGraph({ model, onSelect, selectedOid }: {
  model: LayoutModel;
  onSelect?: (oid: string) => void;
  selectedOid?: string;
}) {
```

Inside the node `<g>`, add a selection ring before the circle and wire interaction on the group:

```tsx
          <g key={n.oid} opacity={n.reachable ? 1 : 0.45}
             role={onSelect ? 'button' : undefined}
             tabIndex={onSelect ? 0 : undefined}
             aria-label={onSelect ? `commit ${n.message}` : undefined}
             style={onSelect ? { cursor: 'pointer' } : undefined}
             onClick={onSelect ? () => onSelect(n.oid) : undefined}
             onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(n.oid); } } : undefined}>
            {n.oid === selectedOid && (
              <circle cx={x} cy={y} r={NODE_R + 5} fill="none" stroke="#fafafa" strokeWidth={2} opacity={0.9} />
            )}
            <circle cx={x} cy={y} r={NODE_R} ... />
            ...
          </g>
```

(Keep the existing circle/text/pill children unchanged; only add the ring and the group-level interaction props. The render test counts `<circle>` per node — the selection ring adds a circle ONLY for the selected node, so update `tests/graph/render.test.tsx`'s count assertion is NOT needed because the existing tests pass `selectedOid=undefined`; confirm no test selects a node.)

- [ ] **Step 7: Wire selection + tools into `src/App.tsx`**

Add `const [selectedOid, setSelectedOid] = useState<string | null>(null);`, pass `onSelect={setSelectedOid} selectedOid={selectedOid ?? undefined}` to `<GitGraph>`, and add `<HistoryTools>` and `<CommitInspector>` to the left column:

```tsx
          <HistoryTools state={repo.state} dispatch={repo.dispatch} selectedOid={selectedOid} />
          <CommitInspector state={repo.state} oid={selectedOid} />
```

- [ ] **Step 8: Tests + build**

Run: `npx vitest run tests/ui tests/graph` → PASS (existing graph render tests still green — they don't pass `onSelect`, so no extra rings/circles). `npm test` → green. `npm run build` → clean.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/App.tsx src/graph/GitGraph.tsx tests/ui
git commit -m "feat(ui): reset/restore tools + clickable commit inspector"
```

---

## Task 4: Animated transitions, keyboard access & live region

**Files:**
- Modify: `src/graph/GitGraph.tsx` (position node/pill groups via `transform` with CSS transitions; respect `prefers-reduced-motion`)
- Create: `src/ui/liveRegion.ts`, `src/index.css` additions (transition + reduced-motion rules)
- Modify: `src/App.tsx` (ARIA live region reading `lastEvents`)
- Test: `tests/ui/liveRegion.test.ts`

**Design notes:**
- Move each node group and pill group to `transform={`translate(${x}, ${y})`}` (positions relative), so when a ref pill's target commit changes, React updates the transform and CSS animates it. Add a CSS class (e.g. `graph-animate`) whose `g` children get `transition: transform 320ms ease, opacity 320ms ease`. Under `@media (prefers-reduced-motion: reduce)`, set `transition: none`.
- The ARIA live region (`aria-live="polite"`) announces the last action in words via `liveRegion.ts` (pure: `EngineEvent[] -> string`), e.g. "Committed. HEAD now on main." — a first cut; Phase 5 hardens i18n/a11y.

- [ ] **Step 1: Write the failing test**

Create `tests/ui/liveRegion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { EngineEvent } from '../../src/engine/types';
import { announce } from '../../src/ui/liveRegion';

describe('announce', () => {
  it('describes a commit', () => {
    const ev: EngineEvent[] = [{ kind: 'commit-created', oid: 'abcd1234abcd1234' }];
    expect(announce(ev)).toBe('Created commit abcd1234.');
  });
  it('describes a head move', () => {
    const ev: EngineEvent[] = [{ kind: 'head-moved', head: { kind: 'branch', name: 'feature' } }];
    expect(announce(ev)).toBe('Now on branch feature.');
  });
  it('describes an error', () => {
    const ev: EngineEvent[] = [{ kind: 'error', reasonKey: 'switch-dirty' }];
    expect(announce(ev)).toBe('You have uncommitted changes — commit or discard them first.');
  });
  it('is empty for no events', () => {
    expect(announce([])).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/liveRegion.test.ts`
Expected: FAIL — `src/ui/liveRegion` not found.

- [ ] **Step 3: Write `src/ui/liveRegion.ts`**

```ts
import type { EngineEvent } from '../engine/types';
import { describeEvent } from './messages';

/** A short spoken sentence for the ARIA live region, from the last dispatch's events. */
export function announce(events: EngineEvent[]): string {
  const parts: string[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'commit-created': parts.push(`Created commit ${e.oid.slice(0, 8)}.`); break;
      case 'head-moved':
        parts.push(e.head.kind === 'branch' ? `Now on branch ${e.head.name}.` : `HEAD detached at ${e.head.oid.slice(0, 8)}.`);
        break;
      case 'ref-moved': parts.push(`Branch ${e.ref} moved.`); break;
      case 'staged-snapshot-lost': parts.push('Warning: a staged snapshot was replaced.'); break;
      case 'error': parts.push(describeEvent(e.reasonKey, e.params)); break;
      case 'no-op': parts.push(describeEvent(e.reasonKey)); break;
      default: break;
    }
  }
  return parts.join(' ');
}
```

(Note: `commit-created` should be announced before `head-moved` — but a commit emits both; joining in event order is fine. The test uses single-event arrays.)

- [ ] **Step 4: Animate the graph in `src/graph/GitGraph.tsx`**

Restructure node and pill rendering to position via a `transform` on a `<g className="graph-node">` (nodes) so children use coordinates relative to the node origin, OR keep absolute coordinates but wrap each node group with `transform={`translate(${x} ${y})`}` and make children relative. The minimal, low-risk change: wrap each node's `<g>` with `transform={`translate(${x}, ${y})`}` and rewrite its children to be relative to (0,0) — the dot at (0,0), message at (0, NODE_R+18), pills at (0, pillY(0,i)-y)… This is fiddly; INSTEAD, take the simpler approach that still animates: keep absolute coordinates and add `className="graph-node"` to each node `<g>` and `className="graph-pill"` to each pill `<g>`, and animate `opacity` for enter and rely on React keying for position — BUT absolute-coordinate SVG children can't CSS-transition x/y attributes reliably.

**Chosen approach (reliable): wrap the whole drawing in a `<g>` and position each node group with `transform`.** Replace the node loop so each node is:

```tsx
{nodes.map((n) => {
  const x = nodeX(n.row);
  const y = nodeY(n.lane);
  // ...compute color, nodeRefs...
  return (
    <g key={n.oid} className="graph-node" transform={`translate(${x} ${y})`} opacity={n.reachable ? 1 : 0.45} ...interaction props...>
      {n.oid === selectedOid && <circle cx={0} cy={0} r={NODE_R + 5} .../>}
      <circle cx={0} cy={0} r={NODE_R} .../>
      <text x={0} y={NODE_R + 18} textAnchor="middle" ...>{shortLabel(n.message)}</text>
      {nodeRefs.map((r, i) => { const py = pillY(0, i); /* relative */ ... })}
      {n.oid === detachedOid && (() => { const py = pillY(0, nodeRefs.length); ... })()}
    </g>
  );
})}
```

where `pillY(0, i) = -NODE_R - 12 - i*PILL_STEP` (relative to the node origin). Edges stay in absolute coordinates (they connect two moving points; edges are cheap to redraw without transition — acceptable, and matches how git graph tools animate: nodes/labels glide, edges snap). Keep the viewBox math unchanged (it already uses absolute `nodeX/nodeY`).

Add `className="graph-node"` so CSS can transition `transform`. The render test asserts `cx="320" cy="72"` for commit F — with translate-based positioning F's circle becomes `cx="0" cy="0"` inside a `translate(320 72)` group, so **update that one assertion** to `expect(svg).toContain('translate(320 72)')` (the orientation lock is preserved — a vertical re-flip would emit `translate(56 272)`).

- [ ] **Step 5: Add CSS transitions in `src/index.css`**

```css
@import "tailwindcss";

.graph-node { transition: transform 320ms ease, opacity 320ms ease; }
.graph-node circle, .graph-node text, .graph-node rect { transition: opacity 320ms ease; }

@media (prefers-reduced-motion: reduce) {
  .graph-node { transition: none; }
}
```

- [ ] **Step 6: Add the ARIA live region in `src/App.tsx`**

```tsx
import { announce } from './ui/liveRegion';
// ...
  const spoken = announce(repo.lastEvents);
// in JSX, near the top of <main>:
  <div aria-live="polite" className="sr-only">{spoken}</div>
```

Add a `.sr-only` utility if not present (Tailwind v4 provides `sr-only`).

- [ ] **Step 7: Update the graph render test's orientation assertion**

In `tests/graph/render.test.tsx`, change `expect(svg).toContain('cx="320" cy="72"')` to `expect(svg).toContain('translate(320 72)')` (commit F now positioned by a translate group). Keep all other assertions.

- [ ] **Step 8: Tests + build**

Run: `npx vitest run tests/ui tests/graph tests/layout` → PASS. `npm test` → green. `npm run build` → clean.

- [ ] **Step 9: Commit**

```bash
git add src/graph/GitGraph.tsx src/ui/liveRegion.ts src/index.css src/App.tsx tests/ui tests/graph
git commit -m "feat(ui): animated graph transitions, keyboard-selectable commits, ARIA live region"
```

---

## Self-Review (controller)

- **Coverage vs roadmap Phase 3** (steps 3–4): event-driven transitions ✓ (CSS, reduced-motion), working-dir/staging/inspector panels ✓, constrained affordances ✓ (disabled buttons, canCommit/isDirty gating, errors surfaced as notices), single `dispatch` entry point ✓. **Deferred (documented):** drag gestures — every action already has a button/keyboard path (the spec requires drags to have keyboard/menu equivalents; we ship the equivalents first and add drag as Phase 3 polish or later). Full menu (right-click) equivalents deferred with drag. Recorded as a scoping decision for the owner.
- **Placeholder scan:** all steps carry complete code. English sentences are centralized in `messages.ts`/`liveRegion.ts` (the Phase 5 i18n shim); git terms stay English by constraint.
- **Type consistency:** `dispatch(action): EngineEvent[]`, `workingFiles/stagedFiles/canCommit/commitDetails/announce/noticeFromEvents` signatures are identical across producer and consumer tasks. `GitGraph` gains only optional props (existing Phase 2 callers unaffected).
- **Purity:** engine/layout untouched; all decision logic in pure helpers with unit tests; components are thin. Interaction correctness verified in-browser by the controller after each task.
```
