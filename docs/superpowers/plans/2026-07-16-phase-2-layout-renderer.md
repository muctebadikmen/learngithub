# Phase 2 — Layout & Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the invisible Phase 1 engine into a visible commit graph: a pure `layout()` function that maps `RepoState` to grid positions, and an SVG renderer that draws it on screen.

**Architecture:** `layout(state)` is a pure function (no DOM, no React) producing a `LayoutModel` — commit nodes with `(row, lane)` grid coordinates, parent edges, and ref labels. Rows are longest-path topological depth (oldest at top); lanes are per-branch-line columns assigned once in insertion order, so an existing commit's position never moves when later actions run. A React `GitGraph` component maps the grid to pixels and draws circles, edges, branch labels, and a HEAD marker. This phase renders statically; animation and interaction are Phase 3.

**Tech Stack:** TypeScript (strict), React 19, SVG (no canvas, no d3 yet), Vitest, `react-dom/server` for a dependency-free render test.

## Global Constraints

Copied from the roadmap; every task's requirements implicitly include these:

- **The layout is pure.** `src/layout/**` imports nothing from React or the DOM — `layout(state) => LayoutModel` only. No `Date.now()`, no `Math.random()`.
- **Goal predicates / layout assert over repo state, never graph geometry, and are hash-agnostic.** Layout consumes `RepoState`; it never invents ordering the engine didn't give it (it uses `state.insertionOrder` for tie-breaks).
- **Git terms stay in English in every locale** — the literal string `HEAD` and branch names are identifiers, not translatable UI chrome, so they are rendered verbatim. No `text-transform` anywhere in CSS.
- **SVG for the graph, not canvas.** TypeScript `strict: true`, `noUnusedLocals`, `noUnusedParameters` all on — no dead imports or unused params (this broke the build once in Phase 1).
- **The engine API is frozen** (`reduce`, `queries.ts`, `EngineEvent`). Phase 2 only *reads* it; it must not modify `src/engine/**`.
- Use `import type { ... }` for type-only imports (`verbatimModuleSyntax` is on). Import engine modules **without** a `.ts` extension, matching existing tests (e.g. `from '../../src/engine/queries'`).

## Stability property (the Phase 2 acceptance gate, from the roadmap)

> For any state `S` and single action `a`, `layout(reduce(S,a))` differs from `layout(S)` only at nodes the action created (or refs it re-pointed). Every commit present in **both** layouts keeps an identical `(row, lane)`.

This falls out of the design: rows are longest-path depth (adding a child never changes an ancestor's depth) and lanes are assigned once per commit in insertion order and never reused (an existing commit's lane is immutable). Task 2 proves it with a property test; Task 1 must not violate it.

---

## File Structure

- `src/layout/types.ts` — `LayoutNode`, `LayoutEdge`, `LayoutRef`, `LayoutModel` (pure data).
- `src/layout/layout.ts` — the `layout(state)` function.
- `src/graph/geometry.ts` — grid→pixel constants and helpers (pure).
- `src/graph/GitGraph.tsx` — the SVG React component.
- `src/App.tsx` — modified to build a sample repo and render `GitGraph` (the visible milestone).
- `tests/layout/layout.test.ts` — unit tests for `layout()`.
- `tests/layout/stability.test.ts` — the stability property test.
- `tests/graph/render.test.tsx` — dependency-free SVG render smoke test.
- `vite.config.ts` — modified: test `include` also matches `.test.tsx`.

---

## Task 1: `layout()` — the pure grid model

**Files:**
- Create: `src/layout/types.ts`
- Create: `src/layout/layout.ts`
- Test: `tests/layout/layout.test.ts`

**Interfaces:**
- Consumes (from Phase 1, frozen): `reachableCommits(state): Set<Oid>` from `src/engine/queries`; `getCommit(state, oid): CommitObj` from `src/engine/store`; types `Oid`, `RepoState`, `Head` from `src/engine/types`. Test helpers `run`, `write`, `addF`, `commitM` from `tests/engine/helpers`.
- Produces (Tasks 2–3 rely on these exact shapes):
  - `LayoutNode { oid: Oid; row: number; lane: number; message: string; parents: Oid[]; reachable: boolean }`
  - `LayoutEdge { child: Oid; parent: Oid }`
  - `LayoutRef { label: string; oid: Oid; isHead: boolean }`
  - `LayoutModel { nodes: LayoutNode[]; edges: LayoutEdge[]; refs: LayoutRef[]; headOid: Oid | null; detachedHead: boolean; rowCount: number; laneCount: number }`
  - `layout(state: RepoState): LayoutModel`

**Design notes (why the algorithm is what it is):**
- `state.insertionOrder` lists commit oids in creation order, and a parent commit is always created before its child — so iterating it visits parents before children. That lets rows and lanes each compute in a single forward pass.
- **Row** = longest path from a root: `row(c) = 0` if `c` has no parents, else `1 + max(row(parent))`. Oldest commit at row 0 (top); children below.
- **Lane** = branch-line column: a commit inherits its **first parent's** lane if that parent has not already handed its lane to an earlier child; otherwise it opens the next free lane. This keeps a linear chain in one column and gives each divergence its own column, breaking ties by insertion order. Because a lane is assigned once and never reassigned, existing commits never move — this is what makes the stability property hold.
- Merge commits (parents.length > 1) cannot occur via Phase 1 actions (there is no merge command yet), but `layout` handles them defensively: first parent for lane inheritance, an edge to every parent. Task 1 covers this with a hand-built merge state.

- [ ] **Step 1: Write the failing tests**

Create `tests/layout/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { reduce } from '../../src/engine/reduce';
import type { CommitObj, RepoState } from '../../src/engine/types';
import { layout } from '../../src/layout/layout';

/** Build a linear 3-commit history on main. */
const linear = (): RepoState =>
  run([
    write('a.txt', '1'), addF('a.txt'), commitM('c1'),
    write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    write('a.txt', '3'), addF('a.txt'), commitM('c3'),
  ]);

describe('layout — rows', () => {
  it('stacks a linear history in one lane, oldest at row 0', () => {
    const m = layout(linear());
    expect(m.nodes).toHaveLength(3);
    expect(m.rowCount).toBe(3);
    expect(m.laneCount).toBe(1);
    expect(m.nodes.every((n) => n.lane === 0)).toBe(true);
    const byMsg = Object.fromEntries(m.nodes.map((n) => [n.message, n.row]));
    expect(byMsg).toEqual({ c1: 0, c2: 1, c3: 2 });
  });

  it('emits one edge per parent, child->parent', () => {
    const m = layout(linear());
    expect(m.edges).toHaveLength(2); // c2->c1, c3->c2
    for (const e of m.edges) {
      const child = m.nodes.find((n) => n.oid === e.child)!;
      const parent = m.nodes.find((n) => n.oid === e.parent)!;
      expect(child.row).toBe(parent.row + 1);
    }
  });
});

describe('layout — lanes / branching', () => {
  it('puts a divergent branch in its own lane on the same row', () => {
    // c1, c2 on main; branch `feature` off c2 commits F; back on main commit G.
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
      { cmd: 'switch', target: 'feature', create: true },
      write('b.txt', 'f'), addF('b.txt'), commitM('F'),
      { cmd: 'switch', target: 'main' },
      write('a.txt', '3'), addF('a.txt'), commitM('G'),
    ]);
    const m = layout(s);
    expect(m.nodes).toHaveLength(4);
    expect(m.laneCount).toBe(2);
    const F = m.nodes.find((n) => n.message === 'F')!;
    const G = m.nodes.find((n) => n.message === 'G')!;
    expect(F.row).toBe(2);
    expect(G.row).toBe(2);
    expect(F.lane).not.toBe(G.lane); // side by side, different columns
    // F was created first, so it inherits c2's trunk lane (0); G opens lane 1.
    expect(F.lane).toBe(0);
    expect(G.lane).toBe(1);
  });
});

describe('layout — refs and HEAD', () => {
  it('reports branch refs and marks the one HEAD is on', () => {
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      { cmd: 'switch', target: 'feature', create: true },
    ]);
    const m = layout(s);
    const feature = m.refs.find((r) => r.label === 'feature')!;
    const main = m.refs.find((r) => r.label === 'main')!;
    expect(feature.isHead).toBe(true);
    expect(main.isHead).toBe(false);
    expect(m.detachedHead).toBe(false);
    expect(m.headOid).toBe(s.branches['feature']);
  });

  it('reports a detached HEAD', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const tip = s0.branches['main'];
    const s = reduce(s0, { cmd: 'switch', target: tip, detach: true }).state;
    const m = layout(s);
    expect(m.detachedHead).toBe(true);
    expect(m.headOid).toBe(tip);
    expect(m.refs.every((r) => r.isHead === false)).toBe(true);
  });
});

describe('layout — ghosts (unreachable commits)', () => {
  it('keeps a reset-away commit as a node with reachable=false', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const droppedTip = s0.branches['main'];
    const s = reduce(s0, { cmd: 'reset', mode: 'hard', target: 'HEAD~1' }).state;
    const m = layout(s);
    expect(m.nodes).toHaveLength(2); // nothing deleted
    const ghost = m.nodes.find((n) => n.oid === droppedTip)!;
    expect(ghost.reachable).toBe(false);
    expect(m.nodes.filter((n) => n.reachable)).toHaveLength(1);
  });
});

describe('layout — merge commit (defensive; no merge action exists yet)', () => {
  it('inherits the first parent lane and edges to every parent', () => {
    // Hand-build a state with a 2-parent commit to exercise the merge path.
    const base = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    const p1 = base.insertionOrder[0];
    const c2: CommitObj = { kind: 'commit', tree: (base.objects[p1] as CommitObj).tree, parents: [p1], message: 'c2' };
    const c2oid = 'aaaaaaaaaaaaaaaa';
    const merge: CommitObj = { kind: 'commit', tree: c2.tree, parents: [p1, c2oid], message: 'M' };
    const moid = 'bbbbbbbbbbbbbbbb';
    const s: RepoState = {
      ...base,
      objects: { ...base.objects, [c2oid]: c2, [moid]: merge },
      branches: { main: moid },
      insertionOrder: [p1, c2oid, moid],
    };
    const m = layout(s);
    const M = m.nodes.find((n) => n.oid === moid)!;
    expect(M.row).toBe(2); // 1 + max(row(c1)=0, row(c2)=1)
    const mergeEdges = m.edges.filter((e) => e.child === moid);
    expect(mergeEdges.map((e) => e.parent).sort()).toEqual([c2oid, p1].sort());
  });
});

describe('layout — empty repo', () => {
  it('returns an empty model with a null HEAD before the first commit', () => {
    const s = reduce({ ...run([]) }, { cmd: 'init' }).state; // init-only, no commits
    const m = layout(s);
    expect(m.nodes).toHaveLength(0);
    expect(m.edges).toHaveLength(0);
    expect(m.rowCount).toBe(0);
    expect(m.laneCount).toBe(0);
    expect(m.headOid).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/layout/layout.test.ts`
Expected: FAIL — `Cannot find module '../../src/layout/layout'` (not created yet).

- [ ] **Step 3: Write `src/layout/types.ts`**

```ts
import type { Oid } from '../engine/types';

/** A commit placed on the grid. row 0 = oldest (top); lane 0 = leftmost column. */
export interface LayoutNode {
  oid: Oid;
  row: number;
  lane: number;
  message: string;
  parents: Oid[];
  reachable: boolean; // false => ghost (unreachable) commit; still drawn, faded
}

/** A parent link, drawn from the child down/across to its parent. */
export interface LayoutEdge {
  child: Oid;
  parent: Oid;
}

/** A branch label. `isHead` when HEAD is attached to this branch. */
export interface LayoutRef {
  label: string;
  oid: Oid;
  isHead: boolean;
}

export interface LayoutModel {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  refs: LayoutRef[];
  headOid: Oid | null;   // commit HEAD resolves to, or null when unborn
  detachedHead: boolean; // HEAD points straight at a commit (no branch)
  rowCount: number;
  laneCount: number;
}
```

- [ ] **Step 4: Write `src/layout/layout.ts`**

```ts
import { reachableCommits } from '../engine/queries';
import { getCommit } from '../engine/store';
import type { Oid, RepoState } from '../engine/types';
import type { LayoutEdge, LayoutModel, LayoutNode, LayoutRef } from './types';

/**
 * Pure mapping from repo state to grid positions.
 *
 * Rows are longest-path topological depth (oldest at row 0). Lanes are
 * per-branch-line columns: a commit inherits its first parent's lane unless
 * that parent already handed its lane to an earlier child, in which case it
 * opens the next free lane. Assignments are made once, in insertion order, and
 * never change — so an existing commit keeps its (row, lane) across actions.
 */
export function layout(state: RepoState): LayoutModel {
  const commits = state.insertionOrder; // parents precede children
  const reachable = reachableCommits(state);

  const row: Record<Oid, number> = {};
  for (const oid of commits) {
    const parents = getCommit(state, oid).parents;
    row[oid] = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((p) => row[p] ?? 0));
  }

  const lane: Record<Oid, number> = {};
  const handedDown = new Set<Oid>();
  let nextLane = 0;
  for (const oid of commits) {
    const first = getCommit(state, oid).parents[0];
    if (first !== undefined && lane[first] !== undefined && !handedDown.has(first)) {
      lane[oid] = lane[first];
      handedDown.add(first);
    } else {
      lane[oid] = nextLane++;
    }
  }

  const nodes: LayoutNode[] = commits.map((oid) => {
    const c = getCommit(state, oid);
    return {
      oid,
      row: row[oid],
      lane: lane[oid],
      message: c.message,
      parents: c.parents,
      reachable: reachable.has(oid),
    };
  });

  const edges: LayoutEdge[] = [];
  for (const oid of commits) {
    for (const parent of getCommit(state, oid).parents) {
      edges.push({ child: oid, parent });
    }
  }

  const headBranch = state.head.kind === 'branch' ? state.head.name : null;
  const refs: LayoutRef[] = Object.entries(state.branches).map(([label, oid]) => ({
    label,
    oid,
    isHead: label === headBranch,
  }));

  const headOid =
    state.head.kind === 'detached'
      ? state.head.oid
      : headBranch !== null
        ? (state.branches[headBranch] ?? null)
        : null;

  return {
    nodes,
    edges,
    refs,
    headOid,
    detachedHead: state.head.kind === 'detached',
    rowCount: commits.length === 0 ? 0 : Math.max(...commits.map((o) => row[o])) + 1,
    laneCount: nextLane,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/layout/layout.test.ts`
Expected: PASS — all layout tests green, output pristine.

- [ ] **Step 6: Run the full unit suite to confirm no regressions**

Run: `npm test`
Expected: all prior engine tests still green (45) plus the new layout tests.

- [ ] **Step 7: Commit**

```bash
git add src/layout tests/layout/layout.test.ts
git commit -m "feat(layout): pure RepoState -> grid LayoutModel (rows, lanes, refs, ghosts)"
```

---

## Task 2: Stability property test

**Files:**
- Test: `tests/layout/stability.test.ts`

**Interfaces:**
- Consumes: `layout` from `src/layout/layout`; `reduce` from `src/engine/reduce`; `initialState` from `src/engine/actions/init`; types `GitAction`, `RepoState` from `src/engine/types`.

**Design notes:** No `Math.random` — sequences are hand-scripted and deterministic. After each action, compare the layout before and after: every commit oid present in **both** must have an identical `(row, lane)`. Reachability is allowed to change (a reset turns a commit into a ghost — that is the action's intended effect, not a layout instability). Refs are allowed to move. Only positions are asserted invariant.

- [ ] **Step 1: Write the property test**

Create `tests/layout/stability.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';
import type { GitAction, RepoState } from '../../src/engine/types';
import { layout } from '../../src/layout/layout';

/** Positions of every commit, keyed by oid, from a layout. */
function positions(state: RepoState): Map<string, string> {
  const m = layout(state);
  return new Map(m.nodes.map((n) => [n.oid, `${n.row}:${n.lane}`]));
}

/**
 * Apply each action one at a time; after every step assert that no commit that
 * existed before the step changed its (row, lane). New commits may appear;
 * reachability and refs may change; positions of survivors must not.
 */
function assertStable(actions: GitAction[]) {
  let state = initialState();
  for (const action of actions) {
    const before = positions(state);
    const next = reduce(state, action);
    const err = next.events.find((e) => e.kind === 'error');
    expect(err, `unexpected error on ${JSON.stringify(action)}: ${JSON.stringify(err)}`).toBeUndefined();
    const after = positions(next.state);
    for (const [oid, pos] of before) {
      if (after.has(oid)) {
        expect(after.get(oid), `commit ${oid} moved on ${JSON.stringify(action)}`).toBe(pos);
      }
    }
    state = next.state;
  }
}

describe('layout stability: layout(reduce(S,a)) moves only created/re-pointed nodes', () => {
  it('linear growth never moves earlier commits', () => {
    assertStable([
      { cmd: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: '1' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2' },
      { cmd: 'writeFile', path: 'a.txt', content: '3' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c3' },
    ]);
  });

  it('branching and switching back never move existing commits', () => {
    assertStable([
      { cmd: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: '1' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2' },
      { cmd: 'switch', target: 'feature', create: true },
      { cmd: 'writeFile', path: 'b.txt', content: 'f' }, { cmd: 'add', paths: ['b.txt'] }, { cmd: 'commit', message: 'F' },
      { cmd: 'switch', target: 'main' },
      { cmd: 'writeFile', path: 'a.txt', content: '3' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'G' },
    ]);
  });

  it('reset (creating a ghost) and amend never move survivors', () => {
    assertStable([
      { cmd: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: '1' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2' },
      { cmd: 'reset', mode: 'hard', target: 'HEAD~1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2b' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2b' },
      { cmd: 'commit', message: 'c2b-amended', amend: true },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it passes**

Run: `npx vitest run tests/layout/stability.test.ts`
Expected: PASS — the layout from Task 1 already satisfies the property. If any test fails, it is a real defect in `layout()`; fix `layout.ts` (do not weaken the test).

- [ ] **Step 3: Commit**

```bash
git add tests/layout/stability.test.ts
git commit -m "test(layout): stability property — survivors keep (row, lane) across actions"
```

---

## Task 3: SVG renderer + visible demo

**Files:**
- Create: `src/graph/geometry.ts`
- Create: `src/graph/GitGraph.tsx`
- Modify: `src/App.tsx` (replace the placeholder)
- Modify: `vite.config.ts` (test `include` also matches `.test.tsx`)
- Test: `tests/graph/render.test.tsx`

**Interfaces:**
- Consumes: `LayoutModel`, `LayoutNode` from `src/layout/types`; `layout` from `src/layout/layout`; the engine (`reduce`, `initialState`) for the App demo.
- Produces: `GitGraph({ model }: { model: LayoutModel })` React component; geometry helpers `nodeX(lane)`, `nodeY(row)`, and constants.

**Design notes (visual intent — the owner wants this as visual as possible, clean and direct, no narrative chrome):**
- Dark canvas (keep `bg-zinc-950`). Each lane gets a distinct accent color from a small palette (cycled by `lane % palette.length`).
- Commit = filled circle in its lane color, with the commit message to the right of the node. Ghost (unreachable) commits: dashed outline, muted gray, ~40% opacity.
- Edges = thin paths from child to parent; same-lane edges are straight vertical lines, cross-lane edges are gentle vertical cubic curves. Ghost edges (either endpoint unreachable) are muted/dashed.
- Branch labels = small rounded pills to the right of their commit, in the branch's lane color. The pill for the branch HEAD is on carries a `HEAD →` prefix (literal `HEAD`, never translated). A detached HEAD draws a distinct outlined `HEAD` pill at `headOid`.
- The SVG uses a `viewBox` sized to the model (`width = MARGIN_X*2 + laneCount*LANE_W + LABEL_W`, `height = MARGIN_Y*2 + rowCount*ROW_H`) and `width="100%"` so it scales to its container. Empty repo: render a centered muted hint `no commits yet` (this string is a placeholder for Phase 5 i18n; acceptable now).

- [ ] **Step 1: Write the failing render test**

Create `tests/graph/render.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { run, write, addF, commitM } from '../engine/helpers';
import { reduce } from '../../src/engine/reduce';
import { layout } from '../../src/layout/layout';
import { GitGraph } from '../../src/graph/GitGraph';

describe('GitGraph render', () => {
  it('draws one circle per commit and one path per edge', () => {
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
      { cmd: 'switch', target: 'feature', create: true },
      write('b.txt', 'f'), addF('b.txt'), commitM('F'),
    ]);
    const model = layout(s);
    const svg = renderToStaticMarkup(<GitGraph model={model} />);
    const circles = svg.match(/<circle/g) ?? [];
    const paths = svg.match(/<path/g) ?? [];
    expect(circles.length).toBe(model.nodes.length);
    expect(paths.length).toBe(model.edges.length);
    expect(svg).toContain('c1');
    expect(svg).toContain('feature');
    expect(svg).toContain('HEAD');
  });

  it('marks a ghost commit with reduced opacity', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const s = reduce(s0, { cmd: 'reset', mode: 'hard', target: 'HEAD~1' }).state;
    const svg = renderToStaticMarkup(<GitGraph model={layout(s)} />);
    expect(svg).toMatch(/opacity/); // ghost styling present
  });

  it('renders a hint for an empty repo without throwing', () => {
    const s = reduce(run([]), { cmd: 'init' }).state;
    const svg = renderToStaticMarkup(<GitGraph model={layout(s)} />);
    expect(svg).toContain('no commits yet');
  });
});
```

- [ ] **Step 2: Enable `.test.tsx` in the vitest include glob**

Modify `vite.config.ts` — change the test include line:

```ts
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
```

- [ ] **Step 3: Run the render test to verify it fails**

Run: `npx vitest run tests/graph/render.test.tsx`
Expected: FAIL — `Cannot find module '../../src/graph/GitGraph'`.

- [ ] **Step 4: Write `src/graph/geometry.ts`**

```ts
/** Grid→pixel geometry for the commit graph. Pure; no DOM. */
export const ROW_H = 76;   // vertical distance between rows
export const LANE_W = 60;  // horizontal distance between lanes
export const NODE_R = 13;  // commit circle radius
export const MARGIN_X = 44;
export const MARGIN_Y = 44;
export const LABEL_W = 220; // reserved space to the right for messages + pills

export const nodeX = (lane: number): number => MARGIN_X + lane * LANE_W;
export const nodeY = (row: number): number => MARGIN_Y + row * ROW_H;

/** Lane accent palette (Tailwind-ish hex), cycled by lane index. */
export const LANE_COLORS = [
  '#34d399', // emerald
  '#60a5fa', // blue
  '#fbbf24', // amber
  '#c084fc', // violet
  '#f472b6', // pink
  '#22d3ee', // cyan
];
export const laneColor = (lane: number): string => LANE_COLORS[lane % LANE_COLORS.length];
```

- [ ] **Step 5: Write `src/graph/GitGraph.tsx`**

```tsx
import type { LayoutModel, LayoutNode } from '../layout/types';
import { LABEL_W, LANE_W, MARGIN_X, MARGIN_Y, NODE_R, ROW_H, laneColor, nodeX, nodeY } from './geometry';

const GHOST = '#6b7280'; // muted gray for unreachable commits

function edgePath(cx: number, cy: number, px: number, py: number): string {
  if (cx === px) return `M ${cx} ${cy} L ${px} ${py}`; // straight, same lane
  const midY = (cy + py) / 2;
  return `M ${cx} ${cy} C ${cx} ${midY}, ${px} ${midY}, ${px} ${py}`; // gentle S-curve across lanes
}

export function GitGraph({ model }: { model: LayoutModel }) {
  const { nodes, edges, refs } = model;
  const byOid = new Map<string, LayoutNode>(nodes.map((n) => [n.oid, n]));

  const width = MARGIN_X * 2 + Math.max(0, model.laneCount - 1) * LANE_W + LABEL_W;
  const height = MARGIN_Y * 2 + Math.max(0, model.rowCount - 1) * ROW_H;

  if (nodes.length === 0) {
    return (
      <svg viewBox="0 0 400 200" width="100%" role="img" aria-label="commit graph">
        <text x="200" y="100" textAnchor="middle" fill="#6b7280" fontFamily="ui-monospace, monospace" fontSize="16">
          no commits yet
        </text>
      </svg>
    );
  }

  // refs grouped by the commit they point at, so multiple labels stack.
  const refsByOid = new Map<string, typeof refs>();
  for (const r of refs) {
    const list = refsByOid.get(r.oid) ?? [];
    list.push(r);
    refsByOid.set(r.oid, list);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="commit graph"
         fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
      {/* edges under nodes */}
      <g strokeWidth={2} fill="none">
        {edges.map((e) => {
          const c = byOid.get(e.child)!;
          const p = byOid.get(e.parent)!;
          const ghost = !c.reachable || !p.reachable;
          return (
            <path
              key={`${e.child}->${e.parent}`}
              d={edgePath(nodeX(c.lane), nodeY(c.row), nodeX(p.lane), nodeY(p.row))}
              stroke={ghost ? GHOST : laneColor(c.lane)}
              strokeDasharray={ghost ? '4 4' : undefined}
              opacity={ghost ? 0.4 : 0.9}
            />
          );
        })}
      </g>

      {/* nodes + messages + ref pills */}
      {nodes.map((n) => {
        const x = nodeX(n.lane);
        const y = nodeY(n.row);
        const color = n.reachable ? laneColor(n.lane) : GHOST;
        const nodeRefs = refsByOid.get(n.oid) ?? [];
        return (
          <g key={n.oid} opacity={n.reachable ? 1 : 0.4}>
            <circle
              cx={x} cy={y} r={NODE_R}
              fill={n.reachable ? color : '#18181b'}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={n.reachable ? undefined : '3 3'}
            />
            <text x={x + NODE_R + 10} y={y + 4} fill="#e4e4e7" fontSize="13">
              {n.message}
            </text>
            {nodeRefs.map((r, i) => {
              const label = r.isHead ? `HEAD → ${r.label}` : r.label;
              const px = x + NODE_R + 10;
              const py = y - NODE_R - 6 - i * 20;
              return (
                <g key={r.label}>
                  <rect x={px} y={py - 12} rx={6} ry={6}
                        width={label.length * 7.6 + 14} height={17}
                        fill="none" stroke={laneColor(n.lane)} strokeWidth={1.5} opacity={0.9} />
                  <text x={px + 7} y={py} fill={laneColor(n.lane)} fontSize="11">{label}</text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* detached HEAD marker */}
      {model.detachedHead && model.headOid && byOid.get(model.headOid) && (() => {
        const n = byOid.get(model.headOid)!;
        const x = nodeX(n.lane);
        const y = nodeY(n.row);
        return (
          <g>
            <rect x={x + NODE_R + 10} y={y - NODE_R - 18} rx={6} ry={6}
                  width={52} height={17} fill="none" stroke="#e4e4e7" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={x + NODE_R + 17} y={y - NODE_R - 6} fill="#e4e4e7" fontSize="11">HEAD</text>
          </g>
        );
      })()}
    </svg>
  );
}
```

- [ ] **Step 6: Run the render test to verify it passes**

Run: `npx vitest run tests/graph/render.test.tsx`
Expected: PASS — circle/path counts match, `c1`, `feature`, `HEAD`, `no commits yet`, and `opacity` all present.

- [ ] **Step 7: Wire the visible demo into `src/App.tsx`**

Replace the placeholder with a scripted sample repo so `npm run dev` shows a real graph:

```tsx
import { useMemo } from 'react';
import { initialState } from './engine/actions/init';
import { reduce } from './engine/reduce';
import type { GitAction, RepoState } from './engine/types';
import { layout } from './layout/layout';
import { GitGraph } from './graph/GitGraph';

const DEMO: GitAction[] = [
  { cmd: 'init' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init project' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project\nhello' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'add greeting' },
  { cmd: 'switch', target: 'feature', create: true },
  { cmd: 'writeFile', path: 'feature.txt', content: 'wip' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'start feature' },
  { cmd: 'switch', target: 'main' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project\nhello world' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'polish greeting' },
];

function buildDemo(): RepoState {
  let state = initialState();
  for (const action of DEMO) state = reduce(state, action).state;
  return state;
}

export default function App() {
  const model = useMemo(() => layout(buildDemo()), []);
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-lg font-mono text-zinc-400 mb-4">git graph</h1>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto">
        <GitGraph model={model} />
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Type-check and build (catches unused imports / strict errors before review)**

Run: `npm run build`
Expected: `tsc -b` passes with no errors, `vite build` succeeds.

- [ ] **Step 9: Run the full unit suite**

Run: `npm test`
Expected: engine (45) + layout unit + stability + graph render tests all green, output pristine.

- [ ] **Step 10: Commit**

```bash
git add src/graph src/App.tsx vite.config.ts tests/graph/render.test.tsx
git commit -m "feat(graph): SVG commit-graph renderer + visible demo in App"
```

---

## Self-Review (controller runs this after the plan is written)

- **Spec/roadmap coverage:** Phase 2 deliverable = `layout()` + SVG graph (topo rows, sticky lanes, ref labels, HEAD marker, ghost nodes) + stability property test. ✓ Task 1 (layout, rows, lanes, refs, ghosts), Task 2 (stability), Task 3 (SVG renderer, HEAD marker, ghosts, visible demo). "Tags" in the roadmap = ref/branch labels (the engine has no tag objects); rendered as branch pills.
- **Placeholder scan:** every code step contains complete code; no TBD. The only English UI string is `no commits yet` (flagged for Phase 5 i18n); `HEAD` and branch names are identifiers that stay English by global constraint.
- **Type consistency:** `LayoutModel`/`LayoutNode`/`LayoutEdge`/`LayoutRef` field names are identical across types.ts, layout.ts, GitGraph.tsx, and all tests. `layout(state)` takes one argument everywhere (the roadmap's `prev?` param is deferred to Phase 3 as a non-breaking optional addition, since lane stability is structural and needs no prior model — recorded as a deviation).
- **Purity:** `src/layout/**` imports only engine types/queries/store, never React/DOM. ✓
```

