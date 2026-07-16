# Git Learning Game — Implementation Roadmap

**Date:** 2026-07-16
**Spec:** `docs/superpowers/specs/2026-07-16-git-learning-game-design.md` (v4)
**Scope:** the vertical slice — spec §15 steps 0–9, Topics 1–4, EN + TR — ending at the gate (§15.1).
Nothing past the gate is planned; the spec forbids it.

This roadmap locks in the project file structure, the phase boundaries, and the interfaces between
phases. **Each phase gets its own detailed writing-plans document at phase start** — planning Phase 4
task-by-task before Phase 1's code exists would be fiction. Phase 1's detailed plan exists now:
[2026-07-16-phase-1-engine.md](2026-07-16-phase-1-engine.md).

## Global constraints (bind every phase)

- **The engine is pure.** No I/O, no `Date.now()`, no `Math.random()`, no DOM, no React imports —
  `reduce(state, action) => { state, events }` only (spec §10.2).
- **Hashing is content-only** — no timestamp, no author (spec §10.1). Same content ⇒ same hash, and
  that is designed behaviour, not a bug.
- **Real git appears only in the test suite** (differential harness), never in the runtime (§10.1).
- **Events carry i18n message keys + params, never English strings** — the ARIA live region (§12) and
  all UI text render from keys (§13).
- **Git terms stay in English in every locale**; no `text-transform` anywhere in CSS (§13).
- **Goal predicates assert over repo state, never graph geometry, and are hash-agnostic** (§10.3).
- **Every drag has a keyboard and menu equivalent** dispatching the same engine action (§9, §12).
- **No "reveal answer" affordance exists anywhere** (§7.1).
- SVG for the graph, not canvas (§10.5). TypeScript `strict: true`. Netlify static hosting, no
  backend. Node ≥ 20 for tooling and tests.

## Project file structure (locked in now)

```
git-commit-game/
├── index.html  package.json  vite.config.ts  tsconfig.json  netlify.toml  tailwind.config.js
├── src/
│   ├── engine/               # Phase 1 — pure TS, zero dependencies
│   │   ├── types.ts          # RepoState, GitAction, EngineEvent, objects
│   │   ├── hash.ts           # deterministic content-only hashing
│   │   ├── store.ts          # immutable object store helpers
│   │   ├── refs.ts           # ref resolution: branch | HEAD | HEAD~n | HEAD@{n} | oid
│   │   ├── reduce.ts         # the single reducer; dispatches to actions/
│   │   ├── queries.ts        # reachability, log, dangling objects (fsck)
│   │   └── actions/          # one file per command family
│   │       ├── init.ts  worktree.ts  add.ts  commit.ts  branch.ts
│   │       ├── switch.ts  reset.ts  restore.ts
│   ├── layout/               # Phase 2 — pure TS: RepoState -> LayoutModel
│   │   ├── layout.ts         # Kahn's topo rows, insertion-order tie-break, sticky lanes
│   │   └── types.ts          # LayoutModel: node/edge/tag positions, lane identity
│   ├── graph/                # Phase 2–3 — SVG rendering + d3 transitions keyed by oid
│   ├── ui/                   # Phase 3–4 — React: panels, inspector, composer, prompts
│   ├── levels/               # Phase 4 — schema, goal predicates, traps, beats engine
│   ├── content/              # Phase 6 — topics/exercises as data (locale-independent)
│   └── i18n/                 # Phase 5 — lingui setup, glossary, locale loaders
├── locales/                  # en/messages.po, tr/messages.po
└── tests/
    ├── engine/               # unit tests, one file per action family
    ├── layout/               # includes the stability property test (§10.5)
    ├── differential/         # real git in Node: harness.ts + differential.test.ts
    └── levels/               # predicate + trap tests per exercise
```

## Phases

| Phase | Spec steps | Deliverable (working software) |
|---|---|---|
| **1 — Foundation & engine** | 0, 1, 1b | Deployed placeholder page; complete slice engine (init, write, add, commit, amend, `commit <path>` trap, branch, switch, detach, reset ×3, restore ×2, reflog, fsck); differential harness proving it against real git. **Detailed plan exists.** |
| **2 — Layout & renderer** | 2 | `layout()` pure function + SVG graph: topo rows, sticky lanes, tags, HEAD marker, ghost nodes; **stability property test**: for any state S and single action a, `layout(reduce(S,a))` differs from `layout(S)` only at nodes the action created or re-pointed. |
| **3 — Animation & interaction** | 3, 4 | Event-driven d3 transitions (short, learner-paced, `prefers-reduced-motion`); drag gestures + keyboard/menu equivalents dispatching identical actions; working-dir/staging/inspector panels; constrained affordances. |
| **4 — Composer & level system** | 5, 6 | Composer with **typed holes (flag/path/ref/commit)** and backward fading; level schema (§10.3 fields, incl. real-repo hand-off); hash-agnostic goal predicates; misconception traps templated from the learner's Beat 1 answer; FCI-style anticipate prompts; conceptualise explain prompts; progressive hints; retrieval warm-ups + review queue; localStorage + export code. |
| **5 — i18n & accessibility** | 7, 8 | Lingui with EN+TR per-locale bundles, glossary files, missing-key = CI failure, 302 negotiation; ARIA live region from engine events; text graph (same order/lanes as SVG, standard tree pattern); keyboard completeness audit vs WCAG 2.2 §2.5.7. |
| **6 — Content & gate prep** | 9 | Topics 1–4 = 20 exercises × EN + TR, each with anticipate/explain/traps/hints/hand-off; gate instrumentation: per-topic drop-off, anticipate accuracy, time-on-task, fear survey, ≥1-week retest flow. Deployed. |
| **Spike (parallel, after 2)** | §14 risk | Throwaway conflict-UI prototype (Topic 6 risk) — de-risked before the gate, never merged. |

## Interfaces between phases

- Phase 1 → all: `reduce(state: RepoState, action: GitAction): { state, events }`, `queries.ts`
  (`reachable`, `dangling`, `log`), and the `EngineEvent` union. **Frozen after Phase 1** — later
  phases extend by adding event kinds, never by changing existing ones.
- Phase 2 → 3: `layout(state: RepoState, prev?: LayoutModel): LayoutModel` — deterministic, pure.
- Phase 3 → 4: a single `dispatch(action: GitAction)` UI entry point; every gesture, key, menu item,
  and composer submission goes through it (this is what makes §12 nearly free).
- Phase 4 → 6: the level schema is the content format; Phase 6 writes data, no code.
- Phase 5 → all: `t(key, params)` and the rule that no user-visible string bypasses it.

## Exit criterion

Stop at the end of Phase 6. Run the gate (§15.1): real users incl. one genuine git-non-knower and one
screen-reader user; measure §11.1 (retention at ≥1 week, time-on-task recorded). The four declared
bets decide what happens next — that decision is the owner's, not a plan's.
