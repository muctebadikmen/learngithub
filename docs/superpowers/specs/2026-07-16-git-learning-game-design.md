# Git Learning Game — Design Specification

**Date:** 2026-07-16
**Status:** Approved design, ready for implementation planning
**Deployment target:** Netlify (static, no backend)

---

## 1. Purpose

Most people learn git by memorising commands. They type `git add`, `git commit`, `git push` because
someone told them to, and never learn what happens underneath. The moment something goes wrong they
are stranded, because they have a list of spells rather than a picture.

The real idea is small enough to fit in one sentence:

> **A repository is a chain of complete snapshots. Branches are movable name tags pointing at one of
> those snapshots.**

Everything else in git — merging, rebasing, undoing, remotes, pull requests — is built from those two
things. A learner who holds that sentence can reason their way to behaviour nobody taught them. A
learner who does not will memorise commands forever.

**The product has one job: put that picture in the learner's head by letting them manipulate the
snapshots and the tags directly, and name the commands as they do it.**

### 1.1 The design test

Every proposed feature must answer: *does this make the model more visible, or is it decoration?*
Decoration is cut. This test is the primary defence against scope creep.

### 1.2 Explicitly not a story game

An earlier draft wrapped the curriculum in a narrative with named teammates and chapter arcs. This
was rejected: it added a second thing to understand on top of git. The product is **direct** — it
shows how git works and names the commands. Any character or scenario exists only as a labelled panel
("Another developer"), never as a plot.

---

## 2. Audience and scope

### 2.1 Audience — tiered, one product

| Tier | Assumed knowledge | Served by |
|---|---|---|
| Total beginner | No terminal, no git | Topics 1–4, heavy visualisation |
| CS student / junior | Codes, copy-pastes git commands, no mental model | Topics 1–8, can skip early exercises |
| Non-developer collaborator | Needs to follow branches and PRs | Topics 1, 3, 8 |

A single first-launch question (*"Used git before?"*) sets a suggested starting point. It is a
suggestion, not a lock — all topics are always reachable.

### 2.2 In scope

Git core plus GitHub collaboration: commits, staging, branches, HEAD, merge, conflicts, reset,
revert, reflog, rebase, interactive rebase, cherry-pick, remotes, clone, push, fetch, pull, fork,
pull requests, review, merge strategies.

### 2.3 Out of scope (v1)

- GitHub Actions / CI, Projects, Releases, Issues, protected branches, CODEOWNERS
- Submodules, LFS, hooks, worktrees, bisect, blame, stash *(stash is a candidate for v1.1)*
- Real multiplayer
- User accounts, backend, leaderboards, teacher dashboards
- Typing real commands as input (see §12.1)

---

## 3. Product structure

Three modes sharing one screen layout.

### 3.1 Learn
Eight topics in order. Each topic is a short **demo** (an animation you watch, ~20s) followed by
**exercises** (you do it). 40 exercises total across the eight topics.

### 3.2 Sandbox
Free play. Every operation available, no goal, no failure. A scenario picker can load any starting
state. This is where "visualise how git works" lives for people who want to poke rather than be led.

### 3.3 Reference
Every command taught, each with the animation of what it does to the graph. The thing learners return
to after finishing. Entries unlock as encountered but all are browsable.

---

## 4. Curriculum

Each exercise names the misconception it exists to kill. **An exercise without one does not ship.**

### Topic 1 — What git is (4 exercises)

| # | Exercise | Kills |
|---|---|---|
| 1.1 | The problem: `final_v2_FINAL_real.zip`. Then `git init` — a folder becomes a repository | "git is a backup tool / a cloud folder" |
| 1.2 | Take a snapshot. A node appears. Change a file, snapshot again. The chain forms | "git tracks files individually" |
| 1.3 | Time travel: click any node, files rebuild. Click back, they return | "going back loses my work" |
| 1.4 | Anatomy: open a node in the inspector — full file snapshot, parent, hash, author, message. Ask for the diff and watch it be **computed** against the parent | **"commits store changes"** — the single most damaging beginner belief |

`git init`, `git log`, `git show`

### Topic 2 — Commits (5 exercises)

| # | Exercise | Kills |
|---|---|---|
| 2.1 | Three zones appear. Edit → drag to staging → commit | "add and commit are one thing you always do together" |
| 2.2 | **Why staging exists**: two unrelated changes on the desk, ship them as two clean commits | "staging is pointless bureaucracy" |
| 2.3 | Unstage; stage part of a file | "staging is all-or-nothing" |
| 2.4 | Amend a bad message — the old commit does not change, a **new one is born** and the label slides | "history is edited in place" |
| 2.5 | Tracked vs untracked, `.gitignore` | "git sees every file automatically" |

`git status`, `git add`, `git restore --staged`, `git commit`, `git commit --amend`, `.gitignore`

**2.2 is the highest-risk exercise in the product.** See §11.

### Topic 3 — Branches (6 exercises)

| # | Exercise | Kills |
|---|---|---|
| 3.1 | `main` is just a label. Create a branch — **nothing happens**. Deliberately anticlimactic | **"a branch copies all my files"** |
| 3.2 | HEAD is "you are here". Switch branches; the marker moves and files rebuild | "checkout changes files as its purpose" |
| 3.3 | Commit on a branch — the label follows HEAD | "branches move on their own" |
| 3.4 | Divergence — two branches, two lines of work, one shared ancestor | "branches are folders" |
| 3.5 | Detached HEAD — walked into on purpose, then shown to be HEAD pointing at a commit instead of a label | "detached HEAD means broken" |
| 3.6 | Delete a branch — the commits are visibly still there | "deleting a branch deletes the work" |

`git branch`, `git switch`, `git checkout`, `git branch -d`

### Topic 4 — Merging (4 exercises)

| # | Exercise | Kills |
|---|---|---|
| 4.1 | Fast-forward: the label just slides. The name stops being a mystery | "merge always makes a commit" |
| 4.2 | True merge: one commit, **two parents**, the diamond | "merge picks a winner" |
| 4.3 | **Conflict** — base / ours / theirs, resolved hunk by hunk, ending on: the resolution is just a commit | **"a conflict means git broke / I lost work"** |
| 4.4 | Multi-file conflict, and `--abort` — you can always back out | "once conflicted, you're trapped" |

`git merge`, `git merge --abort`, `git diff`

**4.3 is the flagship exercise.** Conflicts are the #1 reason people fear git.

### Topic 5 — Undoing (4 exercises)

| # | Exercise | Kills |
|---|---|---|
| 5.1 | **Reset**, shown as *which of the three zones get dragged backwards*: soft = label only; mixed = label + staging; hard = label + staging + working directory | "soft/mixed/hard are arbitrary flags to memorise" |
| 5.2 | Revert: the anti-commit. History moves forward to undo | "revert and reset are the same" |
| 5.3 | Reflog: git never forgets. Recover from a hard reset | "I destroyed my work" |
| 5.4 | Restore a single file | "undo is all-or-nothing" |

`git reset --soft/--mixed/--hard`, `git revert`, `git reflog`, `git restore`

**5.1 is the design's best free win.** The three-zone layout makes reset self-evident at zero extra
cost. No existing tool teaches it this way.

### Topic 6 — Rebase (5 exercises)

| # | Exercise | Kills |
|---|---|---|
| 6.1 | Rebase is a **copy machine**: originals ghost out, copies born with **new hashes** (pays off 1.4) | **"rebase moves my commits"** |
| 6.2 | Merge vs rebase side by side — same goal, two shapes — then when to use which | "one of them is correct and the other is wrong" |
| 6.3 | Interactive rebase: drag a list, graph updates live — squash, reorder, drop | "history is immutable / rebase is black magic" |
| 6.4 | Cherry-pick one commit elsewhere | "you can only move whole branches" |
| 6.5 | The golden rule: never rebase shared history — shown, not stated | "rebase is always cleaner" |

`git rebase`, `git rebase -i`, `git cherry-pick`

### Topic 7 — Remotes and GitHub (6 exercises)

*The graph region splits into panels with a visible gap. Push and pull literally cross it.*

| # | Exercise | Kills |
|---|---|---|
| 7.1 | Clone — the whole graph copies across | "cloning downloads files" |
| 7.2 | **`origin/main` is your cached memory of their label**, not their label | **the single biggest remote misconception** |
| 7.3 | Push — objects cross the gap, their label moves | "push uploads my folder" |
| 7.4 | **Fetch alone**: watch `origin/main` move while `main` sits still. Then pull = fetch + merge | "fetch and pull are the same" |
| 7.5 | Rejected push (non-fast-forward) — and why | "git is refusing arbitrarily" |
| 7.6 | Force push — watch a teammate's commit get orphaned | "`--force` just makes it work" |

`git clone`, `git remote`, `git push`, `git fetch`, `git pull`, `git pull --rebase`, `git push --force-with-lease`

**7.4's single animation is the entire fetch/pull lesson.**

### Topic 8 — Working with others (6 exercises)

*Three panels: `You` | `GitHub` | `Another developer`. Simulated, deterministic, scripted. No plot.*

| # | Exercise | Kills |
|---|---|---|
| 8.1 | Fork — a copy on the server under a different owner | "fork and clone are the same" |
| 8.2 | Feature branch → push → open a PR. **A PR is a request to move a label** | "a PR is a magic GitHub thing unrelated to git" |
| 8.3 | Review: line comments, changes requested, push again, the PR updates live | "you must close and reopen a PR to change it" |
| 8.4 | Merge vs squash vs rebase-merge — **three resulting graph shapes, side by side** | "the merge button is one button" |
| 8.5 | `main` moved under your open PR — update your branch; resolve a PR conflict | "my PR is stale = start over" |
| 8.6 | Team scenario: two other developers push while you work. Ship a feature | "collaboration is just pushing harder" |

**8.4 is taught well nowhere.** It is a genuine differentiator.

### Topic 9 — Workflows (post-v1, stretch)
GitHub Flow, Git Flow, trunk-based development, hotfix-during-feature, tags and releases.

---

## 5. Core interaction model — "the honest machine"

The screen is a literal spatial rendering of git's real data model. Every action is a physical
movement within it.

**The rule: no generic toolbar.** Every action begins by pointing at the object it happens to,
because that is how git itself is organised — verbs act on objects.

### 5.1 Interaction inventory

| Action | Gesture | Mirrored command |
|---|---|---|
| Stage a file | Drag file card from working directory → staging zone | `git add <file>` |
| Unstage | Drag back up | `git restore --staged <file>` |
| Commit | Click commit button, type message | `git commit -m "…"` |
| Amend | Commit button → context → amend | `git commit --amend` |
| Create branch | Node context menu → "branch from here" | `git branch <n>` / `git checkout -b <n>` |
| Switch branch | Click branch tag → "switch", or drag HEAD marker onto tag | `git switch <n>` |
| Merge | Drag branch tag onto another branch tag | `git merge <n>` |
| Rebase | Branch tag context menu → "rebase onto…" | `git rebase <n>` |
| Cherry-pick | Drag a node onto a branch tag | `git cherry-pick <sha>` |
| Reset | Drag branch tag onto an older node → choose zone depth | `git reset --soft/--mixed/--hard <sha>` |
| Revert | Node context menu → "revert" | `git revert <sha>` |
| Checkout commit | Drag HEAD marker onto a node (→ detached) | `git checkout <sha>` |
| Delete branch | Branch tag context menu → "delete" | `git branch -d <n>` |
| Push | Drag branch tag across the gap → remote panel | `git push origin <n>` |
| Fetch | Click the gap / "fetch" affordance on remote panel | `git fetch` |
| Pull | Drag remote branch tag back across the gap | `git pull` |
| Clone | Drag whole remote repo panel → your side | `git clone <url>` |
| Open PR | Button on a pushed branch in the GitHub panel | *(GitHub UI, not a git command)* |

Ambiguous gestures (tag-onto-tag could mean merge or rebase) resolve with a small choice popover, not
a guess. The popover itself is a teaching moment.

### 5.2 Drag is never the only way
Every drag has an equivalent context-menu item. This is required for accessibility (§10) and for
touch, and it costs nothing because both paths dispatch the same engine action.

---

## 6. Screen layout

One layout, all three modes.

```
┌──────────────────────────────────────────────────────────────┐
│ topic · exercise n/m · progress    [TR▾] [restart] [settings]│
├────────────┬────────────────────────────────┬────────────────┤
│ WORKING    │                                │  INSPECTOR     │
│ DIRECTORY  │                                │                │
│ ┌────────┐ │        THE COMMIT GRAPH        │  hash          │
│ │app.js M│ │                                │  message       │
│ │notes  U│ │   newest at top                │  parent(s)     │
│ └────────┘ │   one column per branch        │  full snapshot │
│     ↓ drag │   tags stuck to nodes          │  diff (on ask) │
│ STAGING    │   HEAD as its own marker       │                │
│ ┌────────┐ │                                │  ── or ──      │
│ │login.js│ │                                │  PR / teammate │
│ └────────┘ │                                │  panel (T8)    │
│ [ Commit ] │                                │                │
├────────────┴────────────────────────────────┴────────────────┤
│ $ git checkout -b feature          (read-only command mirror)│
└──────────────────────────────────────────────────────────────┘
```

Plus a floating **objective card** (top-left of the graph region) holding the goal and a checklist
that ticks live, and an on-demand **hint** control.

### 6.1 Regions

**Left — the two places a file can be.** Working directory above, staging below, dragging downward
between them. The vertical drag *is* `git add`. Status shown per file (M/U/A/D) with icon + letter +
colour, never colour alone.

**Centre — the graph.** See §7.

**Right — the inspector.** Click any node: hash, message, author, parent(s), and the **complete file
snapshot** at that commit. Diff is available but presented as *computed on request*, which is what
makes exercise 1.4 land. In topics 7–8 this region also hosts the PR panel.

**Bottom — the command mirror.** Read-only, monospace. Every dispatched action writes its real
command here with a brief highlight. Scrollable history. The learner never types (see §12.1).

### 6.2 Remote layout (topics 7–8)
The centre region subdivides into 2–3 stacked panels — `You`, `GitHub`, `Another developer` — each
with its own independent graph and its own labels, separated by a visibly empty gap representing the
network. Objects animate **across** the gap. `origin/main` renders inside *your* panel as a
distinct, dimmer tag class — visually marking it as a memory, not a live thing.

---

## 7. Graph visualisation

**Orientation:** vertical, **newest at top**, time flowing upward. Chosen over left-to-right because
it stays readable at depth, matches real git tooling, and is direction-neutral for future RTL
languages.

**Layout:** custom column-assignment algorithm. Generic graph libraries (dagre, elk, react-flow) are
rejected — they do not know that commit history has a stable per-branch column structure, and fighting
their layout costs more than writing ours. Each branch holds a column; columns are reused once a
branch ends; the primary branch (`main`) holds the leftmost column and never moves.

**Rendering:** SVG for edges, real DOM for nodes and labels. Nodes must contain translatable text,
be focusable, and be readable by screen readers — all of which DOM gives free and `<text>` does not.

**Elements:**
- **Commit node** — circle, short hash, message on hover/select. Merge commits visibly distinct (two
  inbound edges, wider node).
- **Branch tag** — a label attached to its node, coloured per branch, always carrying its name as text.
- **HEAD** — its own marker, visually attached to a tag. When detached, visibly unmoored from any tag
  — the visual *is* the explanation.
- **Remote-tracking tag** (`origin/main`) — distinct dimmer class, marked as a memory.
- **Ghost node** — faded, for originals after a rebase and for unreachable commits. Ghosts are how
  "nothing is destroyed" is shown rather than claimed.

**Animation:** driven entirely by engine events (§8.2), never hand-authored per level. Node birth,
label slide, ghosting, files rebuilding, objects crossing the network gap. Every state change is
animated with a visible cause. All animation respects `prefers-reduced-motion`, degrading to instant
transitions with a persistent change highlight.

---

## 8. Architecture

### 8.1 A purpose-built engine, not a real git

Real in-browser git implementations exist (isomorphic-git, libgit2/wasm). **Rejected.** They provide
fidelity we do not need (packfiles, network protocols, thousands of edge cases no learner meets) and
obstruct everything we do need: instant undo, level rewind, goal checking, and animation cues.

We write a small model that is **honest about what it shows**: content-addressed objects (blob, tree,
commit), real parent pointers, real refs, a real index, and **real content hashing** — so changing one
character genuinely changes the hash. That fidelity is what makes 1.4, 2.4 and 6.1 work. Everything
the learner never sees is simply absent.

### 8.2 The engine is a pure function

```
reduce(state: RepoState, action: GitAction) => { state: RepoState, events: Event[] }
```

Immutable state in, new state plus an event list out. No I/O, no time, no randomness, no UI
knowledge. This single decision buys:

- **Undo / rewind** — keep prior states
- **Animation** — events describe what changed, so the renderer never re-derives it
- **Goal checking** — a predicate over `RepoState`
- **Simulated collaborators** — just scripted `GitAction`s, fully deterministic
- **Testability** — the entire engine is unit-testable with no DOM

Nothing outside the engine knows how git works.

### 8.3 Levels are data

A level is a declarative record: initial `RepoState`, objective text keys, goal predicate, allowed
actions, ordered hints, and (topics 7–8) a collaborator action script. **New levels require no
programmer, and translators never touch source.**

Goal predicates assert over repo *state*, not over graph geometry — "branch `feature` is merged into
`main` and no work is lost" rather than "node at x=2". Multiple valid solutions pass.

### 8.4 Stack

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite | Fast, static output, zero-config Netlify |
| UI | React + TypeScript | Types are load-bearing for the engine |
| Styling | Tailwind | Fast, consistent, logical properties available |
| State | Zustand | Small; engine holds the real state anyway |
| Animation | Motion (Framer Motion) | Layout animations do the graph work for free |
| Graph | Custom layout + SVG/DOM | §7 |
| i18n | react-i18next + ICU | §9 |
| Persistence | localStorage, versioned | §8.5 |
| Hosting | Netlify static | No backend, no cost |

### 8.5 Persistence
Versioned localStorage: completed exercises, current topic, language, settings, track choice. A
schema version field allows migration. Corrupt or unknown data resets to defaults rather than
crashing. No PII, no cookies, no analytics without an explicit later decision — which keeps GDPR/KVKK
obligations at zero.

---

## 9. Internationalisation

Designed in from day one, not retrofitted. English and Turkish are both first-class from the vertical
slice onward.

### 9.1 Git terminology is not translated

Turkish developers say *"branch'e commit atmak."* Inventing Turkish equivalents would teach vocabulary
nobody uses and leave learners unable to talk to other developers.

**Rule:** git terms (commit, branch, merge, push, rebase, HEAD, staging) stay English. The prose
around them is translated. Each language ships a **glossary file** deciding this per term, so a
language that *does* translate a term can, without a code change.

### 9.2 No sentence assembly

Turkish is agglutinative and verb-final; `"Commit " + n + " files"` produces garbage. **Every sentence
is one complete translatable unit** with ICU placeholders and proper plural categories. String
concatenation for user-facing text is a lint error.

### 9.3 Mechanics
- One namespace per topic, lazily loaded — adding Turkish must not slow the English site
- Language switch mid-exercise preserves all progress and state
- CSS logical properties throughout (`margin-inline-start`, never `margin-left`) so RTL stays possible
- No `text-transform` anywhere — Turkish dotted/dotless İ/ı breaks under naive casing
- All formatting via `Intl`
- A missing key falls back to English and fails CI, never renders a raw key
- Adding a language = adding JSON files. Contributor-friendly by construction.

---

## 10. Accessibility

Non-negotiable, and cheap if designed in now.

- **Every drag has a keyboard and menu equivalent** (§5.2) — same engine action, so no duplicated logic
- **Colour is never the only channel** — branch identity carries colour + text label + position
- **The graph has a text representation** for screen readers: an ordered, navigable list of commits
  with their relationships. This is why nodes are DOM, not `<text>`.
- `prefers-reduced-motion` honoured throughout
- Full keyboard navigation; visible focus rings; WCAG AA contrast in the dark theme
- Command mirror is a live region announcing each executed command

---

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **The core bet fails** — dragging into a box doesn't teach staging better than prose | **Critical** | The vertical slice (§13) exists purely to test this. Test on a real non-git-knowing human before building topics 3–8. |
| Conflict UI (4.3) is intrinsically hard to make clear | High | Prototype 4.3 early, out of order, as a spike |
| Graph layout gets ugly at depth (topic 8, many branches) | High | Layout algorithm proven against worst-case fixtures before content production |
| Scope creep back toward a story game | Medium | §1.1 test; §2.3 out-of-scope list |
| Translation drifts behind English | Medium | Missing key = CI failure; namespaces per topic |
| Content production is slower than expected | Medium | Levels are data (§8.3); slice proves the pipeline before mass production |

---

## 12. Deferred, deliberately

### 12.1 Typing real commands
The command mirror is read-only in v1. A later **expert mode** could flip it into a real input,
letting a learner graduate to typing within the same exercises. The engine already accepts actions
from any source, so this needs a parser and nothing else. **Designed for, not built.**

### 12.2 Other future candidates
Real multiplayer (state model stays compatible); accounts and cross-device sync; Topic 9 workflows;
`git stash`; classroom/teacher mode; shareable sandbox states via URL.

---

## 13. Build order

**Principle: prove the risky things first; be deployed from day one.**

| Step | Deliverable | Proves |
|---|---|---|
| 0 | Empty page live on Netlify | Pipeline is never a late surprise |
| 1 | **Engine, standalone, test-first** — objects, hashing, refs, HEAD, index, commit, branch, checkout | The foundation everything sits on. A bug here is invisible and poisonous. |
| 2 | Static graph renderer — nodes, edges, tags, HEAD | Layout algorithm survives real shapes |
| 3 | Event-driven animation | Animation is automatic, not per-level |
| 4 | Interaction — drag to stage, context menus | The core gesture feels right |
| 5 | Command mirror | Commands surface without typing |
| 6 | Level system — load, goal-check, hints | Levels are data |
| 7 | i18n harness, EN + TR wired through | Multilingual is structural, not bolted on |
| 8 | **Topics 1 + 2 complete, both languages, deployed** | **The vertical slice** |

### 13.1 The gate

**Stop at step 8 and test with real people, including at least one who genuinely does not know git.**

The entire design rests on the bet that dragging a file into a box teaches staging better than a
paragraph does. That bet is cheap to test after step 8 and ruinously expensive to test after all eight
topics are built. Everything after step 8 is content production, which is fast once the machine works.

### 13.2 After the gate
Topics 3→4→5→6→7→8 in order (each: content + any new engine ops + translations), then Sandbox, then
Reference. Sandbox and Reference are largely free by then — both reuse the same screen and engine.

---

## 14. Decisions on record

| Decision | Choice | Rejected |
|---|---|---|
| Audience | Tiered, one product | Single-tier |
| Scope | Git core + GitHub collaboration | Git-only; all-of-GitHub |
| Accounts | None, localStorage | Optional/required accounts |
| Collaboration | Simulated, deterministic | Real multiplayer |
| Framing | Direct visual teaching | Story campaign, plain-word prologue, boss levels |
| Interaction | The honest machine | Goal-graph puzzler; card battler |
| Commands | Read-only mirror | Typing input; post-hoc reveal; hidden |
| Art | Clean, technical, dark | Playful; retro pixel |
| Engine | Purpose-built | isomorphic-git; wasm-git |
| Graph | Custom layout | dagre / elk / react-flow |
| Git terms | Untranslated, glossary-controlled | Fully localised terminology |
| First release | Vertical slice (topics 1–2) | Full v1 |
