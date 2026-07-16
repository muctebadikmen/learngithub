# Phase 4 — Level / Game System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the Phase 3 sandbox into a focused game: a sequence of hands-on levels, each with a short goal and a live checklist that auto-detects success from repo state; complete a level to unlock the next; progress saved to localStorage. A free-play "sandbox" mode remains available.

**Architecture:** Levels are pure data — `{ id, title, goal, checks: {label, done(state)}[], seed? }`. Goal predicates (`done`) assert over `RepoState` only, hash-agnostic (never over graph geometry). A thin progress module (pure reducer + localStorage) tracks the current level and completed set. `App` runs the current level's `seed` into the existing `useRepo`, renders the sandbox, and marks the level complete when every check passes. No learning-science apparatus (anticipate prompts, traps, spaced review) — the owner chose the focused version.

**Tech Stack:** TypeScript strict, React 19, Tailwind v4, localStorage, Vitest. No new dependencies.

## Global Constraints

- **Goal predicates assert over `RepoState`, never over graph geometry, and are hash-agnostic** (spec §10.3). They read `branches`, `head`, `index`, commit messages, reachability — never oids-as-identity or `(row,lane)`.
- **Every level must be solvable using only the existing UI controls** (create/edit file, stage/unstage, commit/amend, branch, switch, reset soft/mixed/hard, restore, checkout-detached) — no new engine actions. The engine and layout stay frozen; `src/engine/**` and `src/layout/**` must not change.
- **No "reveal answer" / solution affordance** anywhere (spec §7.1). A short instructional hint inside a level's `goal` text is fine; a button that performs or shows the solution is not.
- Git terms (`HEAD`, `main`, `commit`, `branch`, `reset`, …) stay English in every locale; no `text-transform`. User-facing sentences (level goals, check labels, buttons) are English now — Phase 5 i18n will extract them; keep them as plain strings in the level data / components (they are content, like commit messages).
- TypeScript strict, `noUnusedLocals`, `noUnusedParameters`; `npm run build` must pass. `import type` for types; no `.ts` extensions on internal imports. Tests under `tests/levels/`.
- localStorage access must be guarded (wrap in try/catch; tolerate it being unavailable) so the app never crashes if storage is disabled.

## Engine/UI facts to rely on (verified)

- `reduce(state, action)`, `initialState()`; a fresh initialised repo = `reduce(initialState(), {cmd:'init'}).state` (branch `main`, unborn).
- `headCommitOid(state)` (refs), `getCommit(state, oid)` (store), `reachableCommits(state)` (queries), `canCommit(state)` (`src/ui/affordances`).
- `RepoState`: `branches: Record<name,Oid>`, `head: {kind:'branch';name}|{kind:'detached';oid}`, `index: Record<path,Oid>`, `workingDir: Record<path,string>`, `insertionOrder`, `objects`.
- `useRepo()` returns `{ state, lastEvents, dispatch, reset }`; `reset` is currently `() => void` and will be extended this phase to `reset(seed?)`.
- `GitAction` union (for seeds/solutions): `init | writeFile{path,content} | add{paths} | commit{message,amend?,paths?} | branch{name} | switch{target,create?,detach?} | reset{mode,target} | restore{paths,staged?}`.

## File Structure

```
src/levels/
  seed.ts        # freshRepo() + applyActions(state, actions) — build repo states from action lists
  predicates.ts  # pure helpers over RepoState: ancestorsOf, uniqueTo, headBranch, commitCountOnHead, hasReachableMessage, tipMessage
  types.ts       # Level, Check
  levels.ts      # the LEVELS array (data + seeds + checks)
  progress.ts    # Progress type, pure clamp/advance, localStorage load/save (guarded)
  LevelPanel.tsx # level header, goal, live checklist, complete + next/restart controls, level selector
src/App.tsx      # add mode (levels|sandbox), seed on level change, completion detection
src/ui/useRepo.ts# reset(seed?) — small backward-compatible extension
tests/levels/
  levels.test.ts   # every level: starts incomplete, solved by its reference solution
  progress.test.ts # pure progress logic
```

---

## Task 1: Level schema, predicates, levels, and per-level solvability tests

**Files:**
- Create: `src/levels/seed.ts`, `src/levels/predicates.ts`, `src/levels/types.ts`, `src/levels/levels.ts`
- Test: `tests/levels/levels.test.ts`

**Interfaces produced (Task 2 consumes):** `LEVELS: Level[]`; `Level { id, title, goal, checks: Check[], seed?: (s)=>RepoState }`; `Check { label, done: (s)=>boolean }`; `freshRepo()`, `applyActions(state, actions)`.

- [ ] **Step 1: Write `src/levels/seed.ts`**

```ts
import { initialState } from '../engine/actions/init';
import { reduce } from '../engine/reduce';
import type { GitAction, RepoState } from '../engine/types';

/** A fresh, initialised, unborn repo on branch `main`. */
export const freshRepo = (): RepoState => reduce(initialState(), { cmd: 'init' }).state;

/** Apply a list of actions in order (used by level seeds and reference solutions). */
export function applyActions(state: RepoState, actions: GitAction[]): RepoState {
  let s = state;
  for (const a of actions) s = reduce(s, a).state;
  return s;
}
```

- [ ] **Step 2: Write `src/levels/predicates.ts`**

```ts
import { reachableCommits } from '../engine/queries';
import { headCommitOid } from '../engine/refs';
import { getCommit } from '../engine/store';
import type { Oid, RepoState } from '../engine/types';

/** All ancestor commits of `oid` (inclusive), following every parent. */
export function ancestorsOf(state: RepoState, oid: Oid | null): Set<Oid> {
  const seen = new Set<Oid>();
  const stack: Oid[] = oid ? [oid] : [];
  while (stack.length) {
    const o = stack.pop()!;
    if (seen.has(o)) continue;
    seen.add(o);
    stack.push(...getCommit(state, o).parents);
  }
  return seen;
}

export const tipOf = (state: RepoState, branch: string): Oid | null => state.branches[branch] ?? null;

/** Commits reachable from `branch` that are not reachable from `other`. */
export function uniqueTo(state: RepoState, branch: string, other: string): Oid[] {
  const a = ancestorsOf(state, tipOf(state, branch));
  const b = ancestorsOf(state, tipOf(state, other));
  return [...a].filter((o) => !b.has(o));
}

export const headBranch = (state: RepoState): string | null =>
  state.head.kind === 'branch' ? state.head.name : null;

export const commitCountOnHead = (state: RepoState): number =>
  ancestorsOf(state, headCommitOid(state)).size;

/** Message of the commit HEAD points at, or null if unborn/detached-on-nothing. */
export function tipMessage(state: RepoState): string | null {
  const h = headCommitOid(state);
  return h === null ? null : getCommit(state, h).message;
}

/** Is there any reachable commit (from any branch or detached HEAD) with this message? */
export const hasReachableMessage = (state: RepoState, message: string): boolean =>
  [...reachableCommits(state)].some((o) => getCommit(state, o).message === message);
```

- [ ] **Step 3: Write `src/levels/types.ts`**

```ts
import type { RepoState } from '../engine/types';

export interface Check {
  label: string;
  done: (state: RepoState) => boolean;
}

export interface Level {
  id: string;
  title: string;
  goal: string;                          // short instruction shown to the player
  checks: Check[];                       // level is complete when ALL pass
  seed?: (fresh: RepoState) => RepoState; // starting repo (defaults to a fresh empty repo)
}
```

- [ ] **Step 4: Write `src/levels/levels.ts`**

```ts
import { canCommit } from '../ui/affordances';
import type { Level } from './types';
import { applyActions } from './seed';
import {
  commitCountOnHead, hasReachableMessage, headBranch, tipMessage, uniqueTo,
} from './predicates';

export const LEVELS: Level[] = [
  {
    id: 'first-commit',
    title: 'Your first commit',
    goal: 'Create a file, stage it (git add), then make your first commit.',
    checks: [{ label: 'at least one commit exists', done: (s) => commitCountOnHead(s) >= 1 }],
  },
  {
    id: 'commit-again',
    title: 'Commit again',
    goal: 'Edit a file, stage the change, and make a second commit.',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'start' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'start' },
    ]),
    checks: [{ label: 'two commits in history', done: (s) => commitCountOnHead(s) >= 2 }],
  },
  {
    id: 'stage-selectively',
    title: 'Stage selectively',
    goal: 'Two new files exist: a.txt and b.txt. Stage ONLY a.txt (leave b.txt unstaged).',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: 'aaa' },
      { cmd: 'writeFile', path: 'b.txt', content: 'bbb' },
    ]),
    checks: [
      { label: 'a.txt is staged', done: (s) => 'a.txt' in s.index },
      { label: 'b.txt is NOT staged', done: (s) => !('b.txt' in s.index) },
    ],
  },
  {
    id: 'branch',
    title: 'Make a branch',
    goal: "Create a branch named 'feature' and make a commit on it.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
    ]),
    checks: [
      { label: "branch 'feature' exists", done: (s) => 'feature' in s.branches },
      { label: "'feature' has a commit main doesn't", done: (s) => uniqueTo(s, 'feature', 'main').length >= 1 },
    ],
  },
  {
    id: 'switch',
    title: 'Switch branches',
    goal: "You're on 'feature'. Switch back to the main branch.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'switch', target: 'feature', create: true },
      { cmd: 'writeFile', path: 'feature.txt', content: 'wip' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'feature work' },
    ]),
    checks: [{ label: 'HEAD is on main', done: (s) => headBranch(s) === 'main' }],
  },
  {
    id: 'diverge',
    title: 'Diverge two branches',
    goal: "main and 'feature' point at the same commit. Commit once on each so they diverge.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'branch', name: 'feature' },
    ]),
    checks: [
      { label: 'main has its own commit', done: (s) => uniqueTo(s, 'main', 'feature').length >= 1 },
      { label: "'feature' has its own commit", done: (s) => uniqueTo(s, 'feature', 'main').length >= 1 },
    ],
  },
  {
    id: 'undo-soft',
    title: 'Undo a commit, keep the work',
    goal: 'Undo your most recent commit but keep its changes staged. Select the earlier commit, then reset (soft).',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'first' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'second' },
    ]),
    checks: [
      { label: 'history is back to one commit', done: (s) => commitCountOnHead(s) === 1 },
      { label: 'the change is still staged', done: (s) => canCommit(s) },
    ],
  },
  {
    id: 'amend',
    title: 'Fix the last commit message',
    goal: "Your last commit says 'tpyo'. Amend it to say 'add readme'.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'tpyo' },
    ]),
    checks: [{ label: "the last commit says 'add readme'", done: (s) => tipMessage(s) === 'add readme' }],
  },
  {
    id: 'detach',
    title: 'Detach HEAD',
    goal: 'Check out an earlier commit directly (detached HEAD): select it, then "checkout (detached)".',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'one' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'two' },
    ]),
    checks: [{ label: 'HEAD is detached', done: (s) => s.head.kind === 'detached' }],
  },
  {
    id: 'rescue-ghost',
    title: 'Rescue a lost commit',
    goal: "You reset too far — 'important work' is now a ghost (faded, unreachable). Point main back at it: select the ghost, then reset (hard).",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'one' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'two' },
      { cmd: 'writeFile', path: 'readme.md', content: '3' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'important work' },
      { cmd: 'reset', mode: 'hard', target: 'HEAD~1' },
    ]),
    checks: [{ label: "'important work' is reachable again", done: (s) => hasReachableMessage(s, 'important work') }],
  },
];
```

- [ ] **Step 5: Write the failing solvability test**

Create `tests/levels/levels.test.ts`. Each level starts incomplete (not trivially solved) and is completed by its reference solution (actions a player could perform via the UI). Solutions live in the test, not in the Level data.

```ts
import { describe, it, expect } from 'vitest';
import type { GitAction } from '../../src/engine/types';
import { LEVELS } from '../../src/levels/levels';
import { applyActions, freshRepo } from '../../src/levels/seed';

// A commit oid helper: resolve a message to its oid in a given state (for reset/detach targets).
import { getCommit } from '../../src/engine/store';
import { reachableCommits } from '../../src/engine/queries';
const oidOf = (s: import('../../src/engine/types').RepoState, message: string): string =>
  [...reachableCommits(s)].find((o) => getCommit(s, o).message === message) ??
  Object.keys(s.objects).find((o) => s.objects[o].kind === 'commit' && getCommit(s, o).message === message)!;

const SOLUTIONS: Record<string, (start: import('../../src/engine/types').RepoState) => GitAction[]> = {
  'first-commit': () => [
    { cmd: 'writeFile', path: 'readme.md', content: 'hi' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'first' },
  ],
  'commit-again': () => [
    { cmd: 'writeFile', path: 'readme.md', content: 'more' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'second' },
  ],
  'stage-selectively': () => [{ cmd: 'add', paths: ['a.txt'] }],
  'branch': () => [
    { cmd: 'switch', target: 'feature', create: true },
    { cmd: 'writeFile', path: 'f.txt', content: 'x' }, { cmd: 'add', paths: ['f.txt'] }, { cmd: 'commit', message: 'feat' },
  ],
  'switch': () => [{ cmd: 'switch', target: 'main' }],
  'diverge': () => [
    { cmd: 'writeFile', path: 'm.txt', content: 'm' }, { cmd: 'add', paths: ['m.txt'] }, { cmd: 'commit', message: 'on main' },
    { cmd: 'switch', target: 'feature' },
    { cmd: 'writeFile', path: 'f.txt', content: 'f' }, { cmd: 'add', paths: ['f.txt'] }, { cmd: 'commit', message: 'on feature' },
  ],
  'undo-soft': (start) => [{ cmd: 'reset', mode: 'soft', target: oidOf(start, 'first') }],
  'amend': () => [{ cmd: 'commit', message: 'add readme', amend: true }],
  'detach': (start) => [{ cmd: 'switch', target: oidOf(start, 'one'), detach: true }],
  'rescue-ghost': (start) => [{ cmd: 'reset', mode: 'hard', target: oidOf(start, 'important work') }],
};

describe.each(LEVELS)('level $id', (level) => {
  const start = level.seed ? level.seed(freshRepo()) : freshRepo();

  it('does not start already complete', () => {
    expect(level.checks.every((c) => c.done(start))).toBe(false);
  });

  it('is solved by its reference solution', () => {
    const solved = applyActions(start, SOLUTIONS[level.id](start));
    for (const c of level.checks) expect(c.done(solved), c.label).toBe(true);
  });
});

it('every level has a reference solution', () => {
  for (const l of LEVELS) expect(SOLUTIONS[l.id], l.id).toBeTypeOf('function');
});
```

- [ ] **Step 6: Run tests (RED then implement then GREEN)**

Run: `npx vitest run tests/levels/levels.test.ts` — first FAIL (modules missing), then after Steps 1–4 exist, PASS. Every level must pass both assertions; if a level starts already complete or its solution doesn't satisfy the checks, fix the level/seed/predicate (do NOT weaken the test). Then `npm test` (full suite) and `npm run build` clean.

- [ ] **Step 7: Commit**

```bash
git add src/levels tests/levels/levels.test.ts
git commit -m "feat(levels): level schema, goal predicates, 10 levels, solvability tests"
```

---

## Task 2: Progress persistence, level UI, and app integration

**Files:**
- Create: `src/levels/progress.ts`, `src/levels/LevelPanel.tsx`
- Modify: `src/ui/useRepo.ts` (`reset(seed?)`), `src/App.tsx`
- Test: `tests/levels/progress.test.ts`

**Interfaces:** `Progress { currentIndex: number; completed: string[] }`; pure `clampProgress(raw, count)`, `withCompleted(p, id)`; guarded `loadProgress(count)`, `saveProgress(p)`.

- [ ] **Step 1: Write the failing progress test**

Create `tests/levels/progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clampProgress, withCompleted } from '../../src/levels/progress';

describe('clampProgress', () => {
  it('defaults a missing/invalid value to a safe start', () => {
    expect(clampProgress(null, 10)).toEqual({ currentIndex: 0, completed: [] });
    expect(clampProgress({ currentIndex: 99, completed: 'x' }, 10)).toEqual({ currentIndex: 9, completed: [] });
  });
  it('keeps a valid value and clamps the index into range', () => {
    expect(clampProgress({ currentIndex: 3, completed: ['a', 'b'] }, 10)).toEqual({ currentIndex: 3, completed: ['a', 'b'] });
    expect(clampProgress({ currentIndex: -2, completed: [] }, 10)).toEqual({ currentIndex: 0, completed: [] });
  });
});

describe('withCompleted', () => {
  it('adds an id once (idempotent)', () => {
    const p = { currentIndex: 0, completed: [] as string[] };
    const a = withCompleted(p, 'first');
    expect(a.completed).toEqual(['first']);
    expect(withCompleted(a, 'first').completed).toEqual(['first']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/levels/progress.test.ts` → FAIL (module missing).

- [ ] **Step 3: Write `src/levels/progress.ts`**

```ts
export interface Progress {
  currentIndex: number;
  completed: string[];
}

const STORAGE_KEY = 'git-game-progress-v1';

/** Coerce arbitrary parsed JSON into a valid Progress for a `count`-level game. */
export function clampProgress(raw: unknown, count: number): Progress {
  const max = Math.max(0, count - 1);
  const r = (raw ?? {}) as Partial<Progress>;
  const idx = typeof r.currentIndex === 'number' && Number.isFinite(r.currentIndex)
    ? Math.min(max, Math.max(0, Math.floor(r.currentIndex)))
    : 0;
  const completed = Array.isArray(r.completed) ? r.completed.filter((x): x is string => typeof x === 'string') : [];
  return { currentIndex: idx, completed };
}

/** Add a completed level id (idempotent). */
export function withCompleted(p: Progress, id: string): Progress {
  return p.completed.includes(id) ? p : { ...p, completed: [...p.completed, id] };
}

export function loadProgress(count: number): Progress {
  try {
    return clampProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'), count);
  } catch {
    return { currentIndex: 0, completed: [] };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — progress just won't persist */
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/levels/progress.test.ts` → PASS.

- [ ] **Step 5: Extend `src/ui/useRepo.ts` — `reset(seed?)`**

Change the `RepoApi.reset` type and the `reset` implementation to accept an optional seed (backward compatible — existing `reset()` calls still work):

```ts
  reset: (seed?: (s: RepoState) => RepoState) => void;
```
```ts
  const reset = useCallback((seed?: (s: RepoState) => RepoState) => {
    const base = reduce(initialState(), { cmd: 'init' }).state;
    const next = seed ? seed(base) : base;
    ref.current = next;
    setState(next);
    setLastEvents([]);
  }, []);
```

- [ ] **Step 6: Write `src/levels/LevelPanel.tsx`**

```tsx
import type { RepoState } from '../engine/types';
import type { Level } from './types';

export function LevelPanel({
  level, index, total, state, complete, onNext, onRestart, onSelect, unlockedCount,
}: {
  level: Level;
  index: number;
  total: number;
  state: RepoState;
  complete: boolean;
  onNext: () => void;
  onRestart: () => void;
  onSelect: (i: number) => void;
  unlockedCount: number; // levels 0..unlockedCount-1 are selectable
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Level {index + 1} / {total}
        </h2>
        <button className="text-[11px] text-zinc-500 hover:text-zinc-300" onClick={onRestart} title="restart this level">restart</button>
      </div>

      <div className="text-sm font-medium text-zinc-100 mb-1">{level.title}</div>
      <p className="text-sm text-zinc-400 mb-3">{level.goal}</p>

      <ul className="space-y-1 mb-3">
        {level.checks.map((c) => {
          const ok = c.done(state);
          return (
            <li key={c.label} className={`flex items-center gap-2 text-sm ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>
              <span aria-hidden>{ok ? '✓' : '○'}</span>
              <span>{c.label}</span>
            </li>
          );
        })}
      </ul>

      {complete && (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/50 p-2 mb-3">
          <div className="text-sm text-emerald-300 mb-2">Level complete! 🎉</div>
          {index + 1 < total
            ? <button className="w-full rounded bg-emerald-700 px-2 py-1 text-sm hover:bg-emerald-600" onClick={onNext}>next level ▸</button>
            : <div className="text-sm text-emerald-300">You finished every level.</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-1" role="group" aria-label="levels">
        {Array.from({ length: total }, (_, i) => {
          const locked = i >= unlockedCount;
          return (
            <button
              key={i}
              disabled={locked}
              onClick={() => onSelect(i)}
              className={`h-6 w-6 rounded text-[11px] ${i === index ? 'bg-emerald-700 text-white' : locked ? 'bg-zinc-900 text-zinc-700' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              title={locked ? 'locked' : `level ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Wire levels into `src/App.tsx`**

Add a `mode` ('levels' | 'sandbox'), seed the repo on level change, detect completion, and persist. The existing sandbox panels/graph stay; in levels mode the `LevelPanel` sits on top of the left column. Reference structure (integrate with the existing App — keep all current panels/imports):

```tsx
import { useEffect, useMemo, useState } from 'react';
import { LEVELS } from './levels/levels';
import { LevelPanel } from './levels/LevelPanel';
import { loadProgress, saveProgress, withCompleted, type Progress } from './levels/progress';
// ...existing imports (useRepo, layout, GitGraph, panels, Notice, announce)...

export default function App() {
  const repo = useRepo();
  const model = useMemo(() => layout(repo.state), [repo.state]);
  const [mode, setMode] = useState<'levels' | 'sandbox'>('levels');
  const [progress, setProgress] = useState<Progress>(() => loadProgress(LEVELS.length));
  const [selectedOid, setSelectedOid] = useState<string | null>(null);

  const index = progress.currentIndex;
  const level = LEVELS[index];
  const complete = mode === 'levels' && level.checks.every((c) => c.done(repo.state));
  const unlockedCount = Math.min(LEVELS.length, progress.completed.length + 1 >= index + 1 ? Math.max(index + 1, progress.completed.length + 1) : index + 1);

  // (re)seed the repo whenever the active level changes or we enter levels mode
  const levelKey = mode === 'levels' ? level.id : '__sandbox__';
  useEffect(() => {
    setSelectedOid(null);
    repo.reset(mode === 'levels' ? level.seed : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey]);

  // persist completion
  useEffect(() => {
    if (complete && !progress.completed.includes(level.id)) {
      const next = withCompleted(progress, level.id);
      setProgress(next);
      saveProgress(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  const goTo = (i: number) => { const next = { ...progress, currentIndex: i }; setProgress(next); saveProgress(next); };

  // ...notice effect + announce as before...

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div aria-live="polite" className="sr-only">{/* announce(repo.lastEvents) */}</div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">git, visually</h1>
          <p className="text-sm text-zinc-500 font-mono">learn git by doing — watch the graph</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-zinc-700 overflow-hidden text-sm">
            <button className={`px-3 py-1 ${mode === 'levels' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`} onClick={() => setMode('levels')}>levels</button>
            <button className={`px-3 py-1 ${mode === 'sandbox' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`} onClick={() => setMode('sandbox')}>sandbox</button>
          </div>
          <button className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800" onClick={() => { setSelectedOid(null); repo.reset(mode === 'levels' ? level.seed : undefined); }}>
            {mode === 'levels' ? 'restart level' : 'reset repo'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          {mode === 'levels' && (
            <LevelPanel
              level={level} index={index} total={LEVELS.length} state={repo.state}
              complete={complete}
              onNext={() => goTo(Math.min(LEVELS.length - 1, index + 1))}
              onRestart={() => { setSelectedOid(null); repo.reset(level.seed); }}
              onSelect={goTo}
              unlockedCount={unlockedCount}
            />
          )}
          <WorkingDirPanel state={repo.state} dispatch={repo.dispatch} />
          <StagingPanel state={repo.state} dispatch={repo.dispatch} />
          <CommitBar state={repo.state} dispatch={repo.dispatch} />
          <RefBar state={repo.state} dispatch={repo.dispatch} />
          <HistoryTools state={repo.state} dispatch={repo.dispatch} selectedOid={selectedOid} />
          <CommitInspector state={repo.state} oid={selectedOid} />
        </div>
        <div className="space-y-3">
          {/* Notice as before */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto min-h-[300px]">
            <GitGraph model={model} onSelect={setSelectedOid} selectedOid={selectedOid ?? undefined} />
          </div>
        </div>
      </div>
    </main>
  );
}
```

Notes for the implementer integrating this: preserve the existing `Notice`/`announce` wiring from Phase 3 (the snippet elides it with comments — keep the real code). Keep `unlockedCount` simple: a level is unlocked if its index ≤ the number of completed levels (so completing level N unlocks N+1). If the `unlockedCount` expression above is awkward, replace it with: `const unlockedCount = Math.max(index + 1, progress.completed.length + 1);` clamped to `LEVELS.length`.

- [ ] **Step 8: Manual + automated verification**

Run: `npm test` → all green (levels + progress + prior). `npm run build` → clean. Then confirm in the browser (controller will do this): level 1 shows a goal + checklist; doing the actions ticks the checks and reveals "next level"; switching to sandbox gives free play; reload preserves the current level.

- [ ] **Step 9: Commit**

```bash
git add src/levels/progress.ts src/levels/LevelPanel.tsx src/ui/useRepo.ts src/App.tsx tests/levels/progress.test.ts
git commit -m "feat(levels): progress persistence, level panel, mode toggle, app integration"
```

---

## Self-Review (controller)

- **Coverage:** focused level system with concrete goals ✓, auto-detected success via pure hash-agnostic predicates ✓, progression + unlock ✓, localStorage persistence ✓, sandbox/free-play mode ✓. Deferred by owner decision: anticipate/explain prompts, misconception traps, hints beyond inline goal text, spaced review, export codes.
- **Predicates over state, not geometry** ✓ (branches/head/index/messages/reachability only).
- **Solvable with existing controls** ✓ — the reference solutions in the test use only shipped UI actions; every level proven start-incomplete + solution-complete.
- **Frozen engine/layout** ✓ — only `useRepo.reset` gains an optional param (additive).
- **Type consistency:** `Level`/`Check`/`Progress` and helper signatures identical across producer/consumer. Levels' English strings are content (Phase-5 i18n extracts them).
```
