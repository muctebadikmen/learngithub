# Git Learning Game — Design Specification

**Date:** 2026-07-16
**Status:** Revised against competitive and pedagogical research; awaiting review
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
things.

### 1.1 Why this is worth building at all

Perez De Rosso & Jackson (*"What's Wrong with Git?"*, Onward! 2013) identified the root problem:

> Git's concepts — "tracked file," "staging area," "local repository" — **"have no *a priori*
> meaning."**

Unlike a shopping cart or a folder, **nothing in git maps to anything in the physical world.** No
intuition transfers. A learner cannot guess. This means git does not merely *benefit* from an
explicitly constructed mental model — it **requires** one, and that is precisely what a visual,
manipulable model provides. This paper is the strongest available justification for the project.

### 1.2 The correction: visualisation is not the active ingredient

An earlier draft of this spec bet everything on *"make the model visible and intuition follows."*
That bet is half wrong, and the evidence is direct. Hundhausen, Douglas & Stasko's meta-study of
algorithm-visualisation effectiveness (JVLC 2002) concluded:

> **"The activities performed by students and their engagement matter more than the subject content
> or the graphic elements of the visualization."**

**A prettier graph does not teach. What the learner does teaches.** The visualisation is necessary
but not sufficient — it is the medium, not the mechanism. This finding is load-bearing for
everything below and is the reason for §5.

### 1.3 The design test

Every proposed feature must answer: *does this make the model more visible **and give the learner
something to do with it**, or is it decoration?* Decoration is cut.

### 1.4 Explicitly not a story game

An earlier draft wrapped the curriculum in a narrative with named teammates and chapter arcs. This
was rejected: it added a second thing to understand on top of git. The product is **direct** — it
shows how git works and names the commands. Any character or scenario exists only as a labelled panel
("Another developer"), never as a plot.

---

## 2. Competitive position

### 2.1 The landscape has an empty centre

| | Web / zero-install | Visualises internals | Files, index, conflicts, PRs |
|---|---|---|---|
| Learn Git Branching (33,730★) | ✅ | ✅ DAG only | ❌ |
| Oh My Git! (2,840★) | ❌ desktop | ✅ real object DB | ✅ |
| GitHub Skills / Learn | ✅ real GitHub | ❌ none | ✅ PRs only |
| Githug, gitexercises, Git-it | ❌ CLI | ❌ none | ✅ |
| git-sim (GPL) | ❌ Python CLI | ✅ static image | ✅ |
| **This project** | ✅ | ✅ | ✅ |

Fidelity-maximalism has failed twice: Oh My Git! shells out to a real `git` binary and is therefore
permanently desktop-only; its browser successor (real git inside an x86 VM) died at 23★, dormant
since 2024-02-29. Learn Git Branching, which fakes git entirely, has 33,730★. **The lesson is not
subtle.**

### 2.2 What is *not* our differentiator

**Staging.** LGB [PR #1379](https://github.com/pcottle/learnGitBranching/pull/1379), opened
2026-07-14, adds working directory, staging, conflicts, and PR levels (+1516/−27, mergeable, maintainer
engaged). The maintainer independently described our exact intended animation. **"We have a staging
panel" is not a strategy.**

Why it remains survivable, not fatal:
- The new levels are **English-only** (3 `en_US` keys, zero of 25 other locales). Under LGB's inline
  i18n architecture — a measured **15.1× translation tax** — and its volunteer translation model,
  Turkish coverage of new content will lag by years. Arabic has sat at 0% for years.
- It is an **opt-in side panel on 7 bonus levels**. The core 34 levels remain DAG-only. It is a
  bolt-on, not a rearchitecture.
- The maintainer has just started a new job and has asked for the PR to be split.

### 2.3 What *is* our differentiator

1. **Engagement levels 4–6.** See §5. Unoccupied by every git tool in any medium.
2. **Misconception diagnosis, not binary grading.** See §8.4. Nobody does this.
3. **Turkish as a first-class language from day one**, not a lagging volunteer translation.
4. **Accessibility.** LGB [issue #960](https://github.com/pcottle/learnGitBranching/issues/960) —
   the graph is unreachable by screen readers — has been open since 2022. LGB's entire pedagogy is
   invisible to blind learners. See §11.

---

## 3. Audience and scope

### 3.1 Audience — tiered, one product

| Tier | Assumed knowledge | Served by |
|---|---|---|
| Total beginner | No terminal, no git | Topics 1–4, heavy visualisation |
| CS student / junior | Codes, copy-pastes git commands, no mental model | Topics 1–8, can skip early exercises |
| Non-developer collaborator | Needs to follow branches and PRs | Topics 1, 3, 8 |

A single first-launch question (*"Used git before?"*) sets a suggested starting point. It is a
suggestion, not a lock — all topics are always reachable. **All tiers use real git vocabulary
throughout**; there is no plain-word track (§16).

### 3.2 In scope

Git core plus GitHub collaboration: commits, staging, branches, HEAD, merge, conflicts, reset,
revert, reflog, rebase, interactive rebase, cherry-pick, remotes, clone, push, fetch, pull, fork,
pull requests, review, merge strategies.

### 3.3 Out of scope (v1)

- GitHub Actions / CI, Projects, Releases, Issues, protected branches, CODEOWNERS
- Submodules, LFS, hooks, worktrees, bisect, blame
- `git stash` — *deferred to v1.1; note Gitless removed it entirely as needless complexity*
- Real multiplayer; accounts; backend; leaderboards; teacher dashboards
- Typing real commands as input (see §14.1)

---

## 4. Product structure

Three modes sharing one screen layout.

### 4.1 Learn
Eight topics in order. Each topic is a short **demo** (§5.1 — never passive) followed by
**exercises**. 40 exercises total.

### 4.2 Sandbox
Free play. Every operation available, no goal, no failure. A scenario picker can load any starting
state. This is engagement level 4 (*changing*) by construction and is therefore a pedagogical
component, not a bonus.

### 4.3 Reference
Every command taught, each with the animation of what it does to the graph. Entries unlock as
encountered but all are browsable.

---

## 5. The engagement model

This section exists because of §1.2 and is **the primary differentiator**.

### 5.1 The taxonomy, and where everyone sits

Naps et al. (2002) rank learner engagement with a visualisation:

| Level | Every existing git tool | This project |
|---|---|---|
| 1. No viewing | — | — |
| 2. **Viewing** | ✅ LGB: 915 prose modals | ✅ demos |
| 3. **Responding** | ⚠️ LGB: typing a command is not *predicting* | ✅ predict step |
| 4. **Changing** | ❌ nobody | ✅ exercises + Sandbox |
| 5. **Constructing** | ❌ nobody | ✅ inverse exercises |
| 6. **Presenting** | ❌ nobody | ✅ explain step |

**LGB — the category winner — operates at levels 2–3 of 6.** The top three levels are completely
unoccupied by every tool in this landscape. This is defensible in a way a staging panel is not.

### 5.2 The four-beat exercise structure

Every exercise runs the same four beats. This is the product's core loop.

1. **Predict** *(level 3)* — before anything animates, the learner is asked a single concrete
   question with a *pointing* answer: *"After this merge, where will `main` be?"* → click a node.
   No typing, no multiple choice. Predict-observe-explain has a deep evidence base and costs us
   almost nothing, because the engine already knows the answer.
2. **Observe** *(level 2)* — the animation plays. A prediction that was wrong is not scored; it is
   **contrasted**: the learner's predicted node and the real one are shown together. Being wrong here
   is the point — it is what makes the correction stick.
3. **Do** *(level 4)* — the exercise proper. Manipulate the model to reach the goal.
4. **Explain** *(level 6)* — one question: *"What did rebase do to the original commits?"* with
   distractors drawn from **the documented misconception list (§6.1)**. This teaches and diagnoses in
   the same click.

**Inverse exercises** *(level 5, ~1 per topic)*: given a target graph, *construct* a repository state
that produces it. There are many valid solutions; the goal predicate accepts all of them (§8.3).

### 5.3 Predict is skippable, once
An "I know this" control skips the predict beat for the current topic. The CS-student tier must not
be forced through it. Skipping is remembered per topic, never globally.

---

## 6. Curriculum

Each exercise names the misconception it kills. **An exercise without one does not ship.**

### 6.1 The ranked misconception list

Derived from Perez De Rosso & Jackson (2013), the 2012 Git User's Survey (n≈4,100), and the
structure of existing tools. Confidence is labelled honestly; the top rows are measured, the bottom
rows are reasoned inference.

| # | Misconception | Confidence |
|---|---|---|
| 1 | **The staging area: what it is for, and that it holds a *snapshot*, not a file reference** | **Very high** |
| 2 | **Working dir / index / repo are coupled, not independent** | **Very high** |
| 3 | **Branches are pointers, not folders or copies** | **Very high** |
| 4 | `checkout` is overloaded (branch vs file vs commit) | High |
| 5 | `reset` vs `revert` vs `restore` | High |
| 6 | Detached HEAD | High |
| 7 | Remote-tracking branches: `origin/main` ≠ `main`; fetch ≠ pull | High |
| 8 | Commits are snapshots, not diffs | High |
| 9 | Tracked ≠ staged ≠ committed | High |
| 10 | Merge vs rebase | Medium (inferred) |
| 11 | Lost commits are recoverable (reflog) | Medium (inferred) |

This table is the source of truth for exercise design **and** for the `Explain` beat's distractors.

### 6.2 Order: files before branches

Oh My Git! teaches `intro → files → branches → merge → index → remotes → changing-the-past →
shit-happens → workflows`. LGB does the opposite (branches first, files never). **The misconception
evidence backs Oh My Git!** — misconceptions #1 and #2 are both about files and the index. We teach
files first.

### Topic 1 — What git is (4 exercises)

| # | Exercise | Kills |
|---|---|---|
| 1.1 | The problem: `final_v2_FINAL_real.zip`. Then `git init` | "git is a backup tool / a cloud folder" |
| 1.2 | Take a snapshot. A node appears. Change a file, snapshot again. The chain forms | "git tracks files individually" |
| 1.3 | Time travel: click any node, files rebuild. Click back, they return | "going back loses my work" |
| 1.4 | Anatomy: open a node — full file snapshot, parent, hash, message. Ask for the diff, watch it be **computed** against the parent | **#8** — commits store changes |

`git init`, `git log`, `git show`

### Topic 2 — Files, staging, commits (6 exercises)

**This topic carries misconceptions #1, #2 and #9 — the three highest-confidence items on the list.
It gets the most exercises and the most care.**

| # | Exercise | Kills |
|---|---|---|
| 2.1 | Three zones appear. Edit → drag to staging → commit | "add and commit are one thing" |
| 2.2 | **Why staging exists**: two unrelated changes on the desk, ship them as two clean commits | **#1** — "staging is pointless bureaucracy" |
| 2.3 | **The index holds a snapshot, not a pointer**: stage a file, edit it again — now the *same file* exists in two versions at once. Commit, and the **staged** version is what lands | **#1, #2** — the orthogonality misfit, demonstrated rather than described |
| 2.4 | **`git commit <file>` commits the *working* version, bypassing what you staged** — the documented propriety misfit, shown as a trap the learner walks into | **#2** — "commit always commits what I staged" |
| 2.5 | Amend a bad message — the old commit does not change, a **new one is born**, the label slides | "history is edited in place" |
| 2.6 | Tracked vs untracked vs ignored | **#9** |

`git status`, `git add`, `git restore --staged`, `git commit`, `git commit --amend`, `.gitignore`

**2.3 and 2.4 are drawn directly from the Gitless misfit analysis and exist nowhere else in the
landscape.** They are the sharpest available answer to misconception #1.

### Topic 3 — Branches (6 exercises)

**Vocabulary: teach `switch` and `restore` first. `checkout` is taught once, as legacy, in 3.5.**
This addresses misconception #4 directly and removes the objection that blocks LGB's workplace
adoption ([issue #1095](https://github.com/pcottle/learnGitBranching/issues/1095)).

| # | Exercise | Kills |
|---|---|---|
| 3.1 | `main` is just a label. Create a branch — **nothing happens**. Deliberately anticlimactic | **#3** — "a branch copies my files" |
| 3.2 | HEAD is "you are here". `git switch`; the marker moves, files rebuild | "checkout changes files as its purpose" |
| 3.3 | Commit on a branch — the label follows HEAD | "branches move on their own" |
| 3.4 | **One working directory, one index, shared by all branches** — switch with uncommitted changes and meet the surprise | **#2** — the generality misfit |
| 3.5 | Detached HEAD — walked into on purpose. Here `checkout` is named as the legacy overloaded verb | **#6, #4** |
| 3.6 | Delete a branch — the commits are visibly still there | "deleting a branch deletes the work" |

`git branch`, `git switch`, `git switch -c`, `git branch -d`, *(`git checkout` as legacy)*

### Topic 4 — Merging (4 exercises)

| # | Exercise | Kills |
|---|---|---|
| 4.1 | Fast-forward: the label just slides | "merge always makes a commit" |
| 4.2 | True merge: one commit, **two parents**, the diamond | "merge picks a winner" |
| 4.3 | **Conflict** — base / ours / theirs, resolved hunk by hunk, ending on: the resolution is just a commit | **"a conflict means git broke / I lost work"** |
| 4.4 | Multi-file conflict, and `--abort` | "once conflicted, you're trapped" |

`git merge`, `git merge --abort`, `git diff`

**4.3 is the flagship exercise** and the highest-risk UI in the product (§12).

### Topic 5 — Undoing (4 exercises)

| # | Exercise | Kills |
|---|---|---|
| 5.1 | **Reset**, shown as *which of the three zones get dragged backwards*: soft = label; mixed = label + index; hard = label + index + working dir | **#5** — "the flags are arbitrary" |
| 5.2 | Revert: the anti-commit. History moves forward to undo | **#5** |
| 5.3 | Reflog: recover from a hard reset | **#11** — "I destroyed my work" |
| 5.4 | `git restore` a single file | "undo is all-or-nothing" |

`git reset --soft/--mixed/--hard`, `git revert`, `git reflog`, `git restore`

**5.1 is the design's best free win** — the three-zone layout makes soft/mixed/hard self-evident at
zero extra cost. No existing tool teaches it this way. **We default `reset` to `--mixed`, as real git
does. LGB defaults it to `--hard`, which is wrong and which LGB itself warns about in-app.**

### Topic 6 — Rebase (5 exercises)

| # | Exercise | Kills |
|---|---|---|
| 6.1 | Rebase is a **copy machine**: originals ghost out, copies born with **new hashes** (pays off 1.4) | **#10** — "rebase moves my commits" |
| 6.2 | Merge vs rebase side by side — same goal, two shapes — then when to use which | "one is correct, one is wrong" |
| 6.3 | Interactive rebase: drag a list, graph updates live — squash, reorder, drop | "rebase is black magic" |
| 6.4 | Cherry-pick one commit elsewhere | "you can only move whole branches" |
| 6.5 | The golden rule: never rebase shared history — **shown**, not stated | "rebase is always cleaner" |

`git rebase`, `git rebase -i`, `git cherry-pick`

### Topic 7 — Remotes and GitHub (6 exercises)

*The graph region splits into panels with a visible gap. Push and pull literally cross it.*

**Note on weighting:** LGB spends **16 of its 34 levels** on remotes — by far its largest block. That
is a strong signal this material is harder than it looks. Six exercises is the floor; expect to add
more after the §13.1 gate rather than fewer.

| # | Exercise | Kills |
|---|---|---|
| 7.1 | Clone — the whole graph copies across | "cloning downloads files" |
| 7.2 | **`origin/main` is your cached memory of their label**, not their label | **#7** — the biggest remote misconception |
| 7.3 | Push — objects cross the gap, their label moves | "push uploads my folder" |
| 7.4 | **Fetch alone**: `origin/main` moves, `main` sits still. Then pull = fetch + merge | **#7** — "fetch and pull are the same" |
| 7.5 | Rejected push (non-fast-forward) — and why | "git is refusing arbitrarily" |
| 7.6 | Force push — a teammate's commit is orphaned. Then `--force-with-lease` | "`--force` just makes it work" |

`git clone`, `git remote`, `git push`, `git fetch`, `git pull`, `git pull --rebase`,
`git push --force-with-lease`

**7.4's single animation is the entire fetch/pull lesson.**

### Topic 8 — Working with others (5 exercises)

*Three panels: `You` | `GitHub` | `Another developer`. Simulated, deterministic, scripted. No plot.*

**This is the only serious PR/code-review curriculum in the landscape that will have pictures.**
GitHub's own materials (MIT-licensed, borrowable) teach this well and visualise nothing.

| # | Exercise | Kills |
|---|---|---|
| 8.1 | Fork — a copy on the server under a different owner | "fork and clone are the same" |
| 8.2 | Feature branch → push → open a PR. **A PR is a request to move a label** | "a PR is magic, unrelated to git" |
| 8.3 | Review: line comments, changes requested, push again, the PR updates live | "you must reopen a PR to change it" |
| 8.4 | Merge vs squash vs rebase-merge — **three resulting graph shapes, side by side** | "the merge button is one button" |
| 8.5 | `main` moved under your open PR; resolve a PR conflict; sync your fork | "my PR is stale = start over" |

**8.4 is taught well nowhere.**

### Topic 9 — Workflows (post-v1)
GitHub Flow, Git Flow, trunk-based development, hotfix-during-feature, tags and releases.

---

## 7. Core interaction model — "the honest machine"

The screen is a literal spatial rendering of git's real data model. Every action is a physical
movement within it.

**The rule: no generic toolbar.** Every action begins by pointing at the object it happens to,
because that is how git itself is organised — verbs act on objects.

### 7.1 Interaction inventory

| Action | Gesture | Mirrored command |
|---|---|---|
| Stage a file | Drag file card from working directory → staging zone | `git add <file>` |
| Unstage | Drag back up | `git restore --staged <file>` |
| Commit | Click commit button, type message | `git commit -m "…"` |
| Amend | Commit button → context → amend | `git commit --amend` |
| Create branch | Node context menu → "branch from here" | `git branch <n>` / `git switch -c <n>` |
| Switch branch | Click branch tag → "switch", or drag HEAD marker onto tag | `git switch <n>` |
| Merge | Drag branch tag onto another branch tag | `git merge <n>` |
| Rebase | Branch tag context menu → "rebase onto…" | `git rebase <n>` |
| Cherry-pick | Drag a node onto a branch tag | `git cherry-pick <sha>` |
| Reset | Drag branch tag onto an older node → choose zone depth | `git reset --soft/--mixed/--hard <sha>` |
| Revert | Node context menu → "revert" | `git revert <sha>` |
| Checkout commit | Drag HEAD marker onto a node (→ detached) | `git checkout <sha>` |
| Delete branch | Branch tag context menu → "delete" | `git branch -d <n>` |
| Push | Drag branch tag across the gap → remote panel | `git push origin <n>` |
| Fetch | "Fetch" affordance on the remote panel | `git fetch` |
| Pull | Drag remote branch tag back across the gap | `git pull` |
| Clone | Drag whole remote repo panel → your side | `git clone <url>` |
| Open PR | Button on a pushed branch in the GitHub panel | *(GitHub UI, not a git command)* |

Ambiguous gestures (tag-onto-tag could mean merge or rebase) resolve with a small choice popover,
never a guess. The popover is itself a teaching moment.

### 7.2 Constrained affordances per exercise
Borrowed from Oh My Git!'s `cards` mechanic: **each exercise declares which operations are
available.** Constraining the affordance space is scaffolding, it prevents flailing, and it makes the
`Predict` beat answerable. Sandbox enables everything.

### 7.3 Drag is never the only way
Every drag has an equivalent context-menu item — required for accessibility (§11) and touch, and free
because both paths dispatch the same engine action.

---

## 8. Architecture

### 8.1 A purpose-built engine, not a real git

Real in-browser git implementations were evaluated and **rejected on evidence**:

- **isomorphic-git** (MIT, 8,283★) **has no rebase** ([issue #189, open since 2018](https://github.com/isomorphic-git/isomorphic-git/issues/189)),
  **no revert, no reflog** — precisely the concepts topics 5 and 6 exist to teach. We would hand-write
  them anyway, inside someone else's data model.
- **Real SHAs are content + timestamp + author addressed, therefore nondeterministic**, which breaks
  replay, snapshot tests, and goal checking.
- **Any real GitHub I/O needs a CORS proxy** — GitHub sends no CORS headers on git endpoints. That
  violates "static, no backend."
- **wasm-git** is GPLv2+linking-exception, still `0.0.16`, ~1 MB WASM. **gitoxide/gix has no wasm
  target** (maintainer estimate: *"a year or two"*). **js-git is dead** (frozen 2017-01-24).

We write a small model that is **honest about what it shows**: content-addressed objects (blob, tree,
commit), real parent pointers, real refs, a real index, a real reflog.

**Hashing — the resolution of the determinism/fidelity tension.** We hash **content only**, excluding
timestamp and author. This is deterministic (replay, snapshot tests, and level checks all work) *and*
pedagogically honest (changing one character genuinely changes the hash, which is what makes 1.4 and
6.1 land). Real git's nondeterminism buys us nothing and costs us everything.

Estimated **4,000–6,000 lines**. For reference, LGB's engine is 3,448 lines *without* an index,
files, conflicts, or reflog.

### 8.2 The engine is a pure function

```
reduce(state: RepoState, action: GitAction) => { state: RepoState, events: Event[] }
```

Immutable state in, new state plus an event list out. No I/O, no clock, no randomness, no UI
knowledge. This single decision buys:

- **Undo / rewind / time-travel** — keep prior states
- **Animation** — events describe what changed, so the renderer never re-derives it
- **Goal checking** — a predicate over `RepoState`
- **Simulated collaborators** — scripted `GitAction`s, fully deterministic
- **Testability** — the entire engine is unit-testable with no DOM

Nothing outside the engine knows how git works.

### 8.3 Levels are data

A level is a declarative record: initial `RepoState`, objective text keys, **predict prompt**,
**explain prompt + distractors**, goal predicate, **allowed actions** (§7.2), ordered progressive
hints (borrowed from Githug, which is the only tool that does this), **misconception traps** (§8.4),
and — for topics 7–8 — a collaborator action script.

**New levels require no programmer, and translators never touch source.**

**Goal predicates assert over repo *state*, never over graph geometry** — *"`feature` is merged into
`main` and no work is lost"*, not *"node at column 2"*. Multiple valid solutions pass. Comparison is
**hash-agnostic** (LGB's `compareAllBranchesHashAgnostic` is the right idea and the right name):
rebase and cherry-pick legitimately produce different hashes, and a goal check that cares about hash
identity would reject correct answers.

### 8.4 Misconception diagnosis — not binary grading

**Every tool in the landscape grades with a binary predicate** (LGB compares trees, Oh My Git! runs
bash, Githug returns booleans). Win or lose, with no explanation of *why*.

Because we own the model, a level can declare **misconception traps**: predicates that match
*known-wrong* end states, each mapped to targeted feedback.

> *"You merged where a rebase was wanted. Look at the shape — here's the difference."*
> *"You reset `--hard` and the working directory went with it. That work isn't gone; here's reflog."*

The `Explain` beat (§5.2) feeds the same system: distractors are drawn from §6.1, so choosing one is
itself a diagnosis. **This is a differentiator nobody in the landscape has, and it is cheap because
the model is ours.**

### 8.5 Stack

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite | Fast, static output, zero-config Netlify |
| UI | React + TypeScript | Types are load-bearing for the engine |
| Styling | Tailwind | Fast, consistent, logical properties available |
| State | Zustand | Small; the engine holds the real state |
| Graph | `d3-selection` + `d3-transition` + `d3-path` (~17 KB gz) | Keyed by SHA — enter/update/exit maps 1:1 onto git semantics |
| Layout | Custom (§9) | No layout engine — see §9 |
| i18n | `@lingui/core` (28 KB, MIT, ICU) | Compile-time extraction; per-locale bundles |
| Persistence | localStorage + export code | §8.6 |
| Hosting | Netlify static | No backend, no cost |

Rejected: **PixiJS** (70 MB unpacked, absurd here); **gitgraph.js** (archived 2024-07-13);
**d3-hierarchy** (trees, not DAGs).

### 8.6 Persistence

Versioned localStorage: completed exercises, current topic, language, settings, predict-skip flags. A
schema version field allows migration; corrupt data resets to defaults rather than crashing.

**Safari ITP evicts localStorage after 7 days without interaction.** A learner returning after a
fortnight would silently lose everything. Mitigation: an **export/import progress code** (a short
encoded string), offered proactively at topic boundaries. No PII, no cookies, no analytics without an
explicit later decision — which keeps GDPR/KVKK obligations at zero.

---

## 9. Graph visualisation

**Orientation:** vertical, **newest at top**. Chosen over left-to-right because it stays readable at
depth and matches real git tooling.

### 9.1 No layout engine — and the reason is pedagogical

dagre and ELK globally optimise edge crossings, so **adding one commit can relocate untouched nodes.**
Neither exposes a stability constraint.

**In a teaching game the animation *is* the lesson.** A reflow that moves commits the learner did not
touch actively teaches something false. This is not a performance objection; it is a correctness one.

Git DAGs are trivial to lay out anyway:
- **Row = topological order** (Kahn's algorithm, ~15 lines)
- **Column = sticky per-branch lane**, with lane identity persisted across states

Stability by construction. `main` holds the leftmost lane and never moves.

### 9.2 Rendering
**SVG, not canvas.** Fifty nodes is nothing, and SVG gives free hit-testing, CSS theming, and **real
accessibility** — the thing LGB has failed at for four years. Nodes and labels are DOM/SVG elements
carrying real text, keyed by SHA.

### 9.3 Elements
- **Commit node** — circle, short hash, message on hover/select. Merge commits visibly distinct.
- **Branch tag** — attached to its node, coloured per branch, always carrying its name as text.
- **HEAD** — its own marker, attached to a tag. When detached, visibly unmoored — **the visual is the
  explanation**.
- **Remote-tracking tag** (`origin/main`) — distinct, dimmer class, marked as a *memory*.
- **Ghost node** — faded; rebase originals and unreachable commits. Ghosts are how "nothing is
  destroyed" is *shown* rather than claimed. Ghosts are why we implement reflog (which LGB and
  isomorphic-git both lack).
- **Predicted node** — the learner's §5.2 prediction, rendered alongside the truth during Observe.

### 9.4 Animation
Driven entirely by engine events (§8.2), never hand-authored per level. All animation respects
`prefers-reduced-motion`, degrading to instant transitions with a persistent change highlight.

---

## 10. Internationalisation

English and Turkish are both first-class from the vertical slice onward.

### 10.1 Git terminology: code-switch, never translate

Turkish developers say *"branch'e commit atmak."* Nobody says *"şube."* Inventing Turkish equivalents
teaches vocabulary nobody uses and leaves learners unable to talk to other developers. LGB's Turkish
localisation does this correctly — `branch'ler (dallar)`, `commit'e` — glossing once, then
code-switching with agglutinative suffixes.

**Rule:** git terms stay English; surrounding prose is translated. Each language ships a **glossary
file** deciding this per term, so a language that *does* translate a term can, without a code change.

**Quality note:** LGB's Turkish contains real errors (`çalımanının` for *çalışmamın*; `hg summit` for
`hg summary`). A reviewed translation is a cheap, visible quality edge.

### 10.2 No sentence assembly

Turkish is agglutinative and verb-final; `"Commit " + n + " files"` produces garbage. **Every sentence
is one complete translatable unit** with ICU placeholders. String concatenation for user-facing text
is a lint error.

**Turkish has two cardinal plural categories (`one`, `other`)** — `{count} commit` cannot be
collapsed to a single form. (Turkish *ordinals* are `other`-only, so *"3. seviye"* needs no
branching.)

### 10.3 Mechanics
- **Per-locale route prefixes** (`/tr/`, `/en/`) with per-locale bundles. LGB inlines all 26 locales
  into every level file — a measured 15.1× tax, and a 3.06 MB bundle where every Turkish learner
  downloads all 26 languages. We ship 1/26th of that.
- **Language negotiation on the bare root uses 302, never 301.** A 301 permanently pins a user to a
  wrongly-guessed language. (An HN commenter complains about exactly this on LGB.)
- Language switch mid-exercise preserves all progress and state.
- CSS logical properties throughout, so RTL stays possible.
- **The graph container is pinned `dir="ltr"` even in RTL locales.** Git's arrow of time is
  universal; mirroring the DAG would confuse Arabic-speaking developers, not help them.
- No `text-transform` anywhere — Turkish dotted/dotless İ/ı breaks under naive casing.
- All formatting via `Intl`.
- A missing key falls back to English **and fails CI**; it never renders a raw key.
- Adding a language = adding files. Contributor-friendly by construction.

---

## 11. Accessibility

**This is a differentiator, not just compliance.** LGB issue #960 — *"if the graph changes (e.g. `git
commit`), the change should be announced"* — has been open since 2022. **LGB's entire pedagogy is
invisible to blind learners.** An accessible git visualiser would be the only one in existence.

- **Every drag has a keyboard and menu equivalent** (§7.3) — same engine action, no duplicated logic
- **Colour is never the only channel** — branch identity carries colour + text label + lane position
- **The graph has a real text representation**: an ordered, navigable list of commits and their
  relationships. This is why nodes are DOM/SVG with real text (§9.2).
- **An ARIA live region announces every state change** — this is exactly what LGB lacks, and it falls
  out of §8.2's event stream for free
- `prefers-reduced-motion` honoured throughout
- Full keyboard navigation; visible focus rings; WCAG AA contrast in the dark theme

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **The core bet fails** — manipulating the model doesn't teach better than prose | **Critical** | The vertical slice (§13) exists to test this. Test on a real non-git-knowing human before building topics 3–8. |
| **LGB PR #1379 lands and closes the staging gap** | **High** | Already assumed (§2.2). Differentiation rests on §5, §8.4, i18n and a11y — not on staging. |
| Conflict UI (4.3) is intrinsically hard to make clear | High | Prototype 4.3 early, out of order, as a spike |
| Engine is larger than estimated (4–6k lines) | Medium | It is step 1 and test-first; overrun surfaces immediately, not late |
| Graph layout gets ugly at depth (topic 8) | Medium | Sticky lanes (§9.1) make this structural; prove against worst-case fixtures before content production |
| The predict/explain beats feel like homework | Medium | §5.3 skip control; test at the gate |
| Scope creep back toward a story game | Medium | §1.3 test; §3.3 out-of-scope list |
| Translation drifts behind English | Medium | Missing key = CI failure; per-locale bundles |
| Safari silently evicts progress | Low | §8.6 export code |

---

## 13. Build order

**Principle: prove the risky things first; be deployed from day one.**

| Step | Deliverable | Proves |
|---|---|---|
| 0 | Empty page live on Netlify | The pipeline is never a late surprise |
| 1 | **Engine, standalone, test-first** — objects, deterministic hashing, refs, HEAD, index, reflog, commit, branch, switch | The foundation. A bug here is invisible and poisonous. |
| 1b | **Differential test harness**: run identical command sequences against **real `git` in Node**, assert our DAG matches | Fidelity, mechanically, forever |
| 2 | Static graph renderer — topological rows, sticky lanes, tags, HEAD | Layout survives real shapes |
| 3 | Event-driven animation | Animation is automatic, not per-level |
| 4 | Interaction — drag to stage, context menus, constrained affordances | The core gesture feels right |
| 5 | Command mirror | Commands surface without typing |
| 6 | Level system — load, goal-check (hash-agnostic), hints, **predict/explain beats**, **misconception traps** | The four-beat loop and the differentiator |
| 7 | i18n harness, EN + TR wired through, per-locale bundles | Multilingual is structural |
| 8 | Accessibility pass: live region, keyboard paths, text graph | The a11y differentiator is structural, not retrofitted |
| 9 | **Topics 1 + 2 complete, both languages, deployed** | **The vertical slice** |

**Step 1b is cheap and worth more than it looks.** Keeping real git in the *test suite* rather than
the *runtime* gives us fidelity without any of §8.1's costs.

### 13.1 The gate

**Stop at step 9 and test with real people, including at least one who genuinely does not know git.**

Two bets are being tested, not one:
1. That manipulating the model teaches staging better than a paragraph does (§1).
2. That the predict/explain beats improve retention without feeling like homework (§5).

Both are cheap to test after step 9 and ruinously expensive to test after eight topics are built on
top of them. **Everything after step 9 is content production**, which is fast once the machine works.

The gate has a real failure mode worth naming: if the four-beat loop tests badly, §5 — the primary
differentiator — is wrong, and the product needs rethinking before, not after, topics 3–8.

### 13.2 After the gate
Topics 3→4→5→6→7→8 in order, then Sandbox, then Reference. Sandbox and Reference are largely free by
then — both reuse the same screen and engine. Expect topic 7 to grow (§6, Topic 7 note).

---

## 14. Deferred, deliberately

### 14.1 Typing real commands
The command mirror is read-only in v1. A later **expert mode** could flip it into a real input,
letting a learner graduate to typing within the same exercises. The engine already accepts actions
from any source, so this needs a parser and nothing else. **Designed for, not built.**

### 14.2 Other future candidates
Real multiplayer (the state model stays compatible); accounts and cross-device sync; Topic 9
workflows; `git stash`; classroom/teacher mode; shareable sandbox states via URL.

---

## 15. Prior art and licensing

| Project | License | Borrowable |
|---|---|---|
| Learn Git Branching | **MIT** | Code + level design + `hashAgnostic` goal-checking idea |
| **Oh My Git!** | **Blue Oak 1.0.0** (OSI, MIT-equivalent) | **Level design — the deepest curriculum available, and trapped in a desktop app nobody installs. Our single best content source.** |
| GitHub Skills / Learn | **MIT** (GitHub, Inc.) | PR + code-review curriculum (topic 8) |
| Githug | **MIT** | 55 level ideas + the progressive-hint pattern |
| visualizing-git / explain-git-with-d3 | **MIT** | d3 DAG rendering; it has reflog, which LGB lacks |
| gitexercises | **MIT** | 23 task ideas |
| Git-it | **BSD-2** | 11 challenge ideas |
| **git-sim** | **GPL-2.0** | ⚠️ **Do not copy code** into a permissive project. Reference only. |
| Devlands | proprietary | ❌ Closed-source commercial competitor (2025, 3D voxel, funded) |

**Porting Oh My Git!'s curriculum shape to the web is the highest-leverage content move available.**

### 15.1 Possible evaluation partner
Eray Tüzün's [BILSEN group](https://eraytuzun.com/) at **Bilkent University (Turkey)** built and
empirically evaluated CRSG, a browser-based serious game for teaching **code review**, with 132
students (ESEC/FSE 2020). It is the only rigorous prior art on the PR-teaching half of this idea, and
it is local. Worth contacting for evaluation at the §13.1 gate.

---

## 16. Decisions on record

| Decision | Choice | Rejected |
|---|---|---|
| Audience | Tiered, one product | Single-tier |
| Scope | Git core + GitHub collaboration | Git-only; all-of-GitHub |
| Accounts | None; localStorage + export code | Optional/required accounts |
| Collaboration | Simulated, deterministic | Real multiplayer |
| Framing | Direct visual teaching | Story campaign; plain-word prologue; boss levels |
| Interaction | The honest machine | Goal-graph puzzler; card battler |
| **Primary differentiator** | **Engagement levels 4–6 + misconception diagnosis** | **Staging (LGB is shipping it)** |
| Pedagogy | Four-beat loop: predict → observe → do → explain | Passive demo + binary grading |
| Curriculum order | Files before branches | Branches first (LGB) |
| Vocabulary | `switch`/`restore` first; `checkout` as legacy | `checkout`-first (LGB) |
| Commands | Read-only mirror | Typing input; post-hoc reveal; hidden |
| Art | Clean, technical, dark | Playful; retro pixel |
| Engine | Purpose-built, deterministic content-only hashing | isomorphic-git; wasm-git; gitoxide; js-git |
| Real git | In the test suite (differential), not the runtime | In the runtime |
| Graph | Custom: topological rows + sticky lanes | dagre / elk / react-flow (unstable reflow) |
| Renderer | SVG + d3-selection/transition, keyed by SHA | Canvas; PixiJS; gitgraph.js |
| i18n | Lingui, per-locale bundles, `/tr/` `/en/` prefixes | Inlined all-locale bundles (LGB's 15.1× tax) |
| Git terms | Untranslated, code-switched, glossary-controlled | Fully localised terminology |
| First release | Vertical slice (topics 1–2) | Full v1 |
