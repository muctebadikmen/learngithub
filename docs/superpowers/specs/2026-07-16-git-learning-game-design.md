# Git Learning Game — Design Specification

**Date:** 2026-07-16
**Status:** v3 — rewritten against four research reports. Awaiting review.
**Deployment target:** Netlify (static, no backend)

---

## 1. Purpose

Most people learn git by memorising commands and never learn what happens underneath. When something
goes wrong they are stranded — they have a list of spells, not a picture.

The model is small enough to fit in one sentence:

> **A repository is a chain of complete snapshots. Branches are movable name tags pointing at one of
> those snapshots.**

But **installing that sentence is not sufficient**, and this spec's central discipline is taking that
seriously (§2).

### 1.1 Two goals, not one

**Goal A — the model.** Perez De Rosso & Jackson (Onward! 2013) found the root problem: git's concepts
*"have no a priori meaning."* Unlike a shopping cart or a folder, nothing in git maps to anything in
the physical world, so no intuition transfers and a learner cannot guess. Git *requires* an explicitly
constructed mental model.

**Goal B — calibrated confidence.** Church, Söderberg & Elango (PPIG 2014) studied Google and Autodesk
engineers and found something the model-transfer thesis cannot explain: **they understood git and were
still afraid of it.** They re-cloned entire repositories to recover. They made manual backups before
running commands. One asked a colleague to run an operation because *"it scares the [elided] out of
me."* The researchers explicitly ruled out conceptual gaps — these were expert abstraction workers who
could articulate the model correctly.

**Understanding is necessary and demonstrably not sufficient.** Confidence is a separate axis, built
only by safe, reversible practice on consequences. This is the tension between the two strongest
papers in the field, it is unresolved in the literature, and this product has to serve both sides of
it. It is a design constraint, not a compromise.

---

## 2. The governing law

Sorva (2012) built a program-simulation tool, measured what students actually learned, and found:

> **"Students appear to have learned about precisely what the requirements of the activity made
> focal, and not much else."**

The concept his tool *displayed* but did not *require* was learned by almost nobody — and he suspects
it was actively harmed, because attention went to the task instead. He states it against his own
thesis.

> ### **Whatever the tool forces the learner to generate is the only thing it teaches.**

**Applied to us, honestly: if the win condition is "drag the file into the box," learners will learn
dragging — not what the index is.** The visualisation cannot teach. Only the generation task can.

**This replaces the earlier design test.** Every exercise must answer: *what does this force the
learner to generate, and is that thing the lesson?* If the answer is "a gesture," the exercise is
decoration and does not ship.

### 2.1 The cautionary tale we are one bad decision away from

**Python Tutor: 25 million users, 500 million visualisations, 10,000+ schools, and no evidence it
teaches anyone anything.** No RCT exists. The best independent study (Karnalim & Ayub 2018, N=56,
14 weeks) found nothing in 12 weeks and **one week where it made students significantly worse**. Its
creator has stated this in print twice — 2013: *"numbers and anecdotes are no substitutes for a
rigorous evaluation of efficacy"*; 2021: *"this paper does not present a user evaluation."* In 2013 he
correctly diagnosed why — his tool sits at passive viewing, which the literature already said was the
dead zone — and proposed adding prompts and quizzes. **He never shipped it.**

That is the default outcome for a beautiful, honest git visualiser. **Popularity is not learning.**

---

## 3. What the evidence actually supports

Cited honestly, with the limits that usually get dropped.

### 3.1 Strong — build on these

| Finding | Evidence |
|---|---|
| **Self-explanation** — making the learner *generate* an explanation | **g = 0.55**, k=69, **N=5,917** (Bisra et al. 2018, meta-analysis). Fail-safe N = 6,028. **Computer science: g = 0.76** (k=9). **19 of 20 moderators didn't matter — the effect is hard to break.** |
| **Guided beats free self-explanation, ~2×** | RCT, N=88, code comprehension (Tamang et al., SIGCSE 2021): control 0.047 · free SE **0.30** · **Socratic 0.59**. F(2,85)=13.5, p=.001, η²=0.24. All pairwise contrasts significant. |
| **Feedback that names the misconception** | BTRecurTutor: exercises alone **d=0.5**; exercises + misconception-naming feedback **d=1.1**; the gap between them is itself **d=0.6**, p=.0001. |
| **Generation format matters enormously** | Fill-in-the-blank **g=0.895** · conceptualise **g=0.873** · interrogative **g=0.559** (k=36, the workhorse). |

### 3.2 Moderate — use, don't lean on

- **Subgoal labelling** (Margulieux et al. 2020, classroom, N=265): quizzes **d=0.44** (p=.001) but
  **exams d=0.20, p=.24 — not significant**. The real effect is **withdrawal and failure roughly
  halved (44% → 25% at-risk)** and **lower variance**. *Subgoals compress the left tail; they do not
  lift the mean.* See §11.
- **Scaffolding** is the only game augmentation whose confidence interval clears zero (g=0.41).
- **Multiple sessions** (g=0.44) beat single sessions (g=0.08, n.s.).
- **Schematic visuals g=0.48; realistic visuals −0.01.** This vindicates the clean, technical art
  direction on evidence rather than taste.

### 3.3 Weak, null, or actively negative — do not build on these

- **Passive visualisation.** Hundhausen et al.: *"studies in which students merely viewed
  visualizations did not demonstrate significant learning advantages."* **11 of 24 studies
  significant; one significant in the wrong direction** (text beat graphics).
- **Prediction alone.** Tamang's prediction-only control gained **0.047** — nothing.
- **Multiple-choice self-explanation: g = 0.24, not significant.** **Metacognitive prompts: g = 0.19,
  not significant.** *An earlier draft of this spec specified exactly the multiple-choice cell.*
- **"Reveal the answer" buttons destroy the effect** (Schworm & Renkl 2006): learners given
  self-explanation prompts *only* outperformed those also given explanations on demand.
- **Games as standalone**: d = −0.12. **As a supplement: d = 0.51.** (Sitzmann 2011.) Matched on
  activity, games score **d = −0.02**; against a computerised tutorial, **d = −0.70**. **Entertainment
  value was not a significant moderator**, and high-entertainment games scored numerically *lower*.
- **Pure discovery / sandbox-first** is, in Nicky Case's words after recanting his own founding
  premise, *"replicatably false"* for beginners.

### 3.4 Citations we will not overstate

- **Hundhausen et al. is not a meta-analysis.** The authors explicitly declined to pool: *"we
  considered using statistical meta-analytic techniques… but ultimately decided against them."* It is
  a vote-count review, 11–13 against. **No pooled effect size for program visualisation exists.**
- **The Naps engagement taxonomy is not a ladder.** The authors: *"we do not consider this to be an
  ordinal scale. The relationships among these six forms of engagement do not form a simple
  hierarchical relationship."* An earlier draft of this spec made "levels 4–6" the primary
  differentiator on exactly that misreading. When *constructing vs. viewing* was tested directly
  (Hundhausen & Douglas 2000), **there was no significant difference.** JFLAP sits at the
  constructing level and its only controlled comparison was **null**.
- **Chi's founding self-explanation studies are N=8 (correlational) and N=24 (26% vs 16% gain).** The
  effect survives on Bisra's replication base, not on its famous originals.
- **The newest, best-powered test is a null** — Harders & Ebersbach (2026), preregistered, N=208,
  active control: no self-explanation effect **on factual knowledge** (a category where Bisra already
  predicts weakness).
- **Time-on-task confounds the whole field.** Sorva's treatment group spent **28.3 min vs 15.5 min**
  (1.8×, p≈.000) and he volunteers that this *"explains in part"* his one significant result. Bisra:
  took-longer g=0.72 vs equal-time g=0.41; **47 of 69 studies never reported duration.** See §11.2.

---

## 4. Positioning

**A supplement, not a replacement.** This is the configuration with the strongest evidence (d=0.51 vs
−0.12 standalone) and the only one with a distribution story: instructors adopt it, which is how
Learn Git Branching actually spread.

Consequences that are design requirements, not marketing:
- **Per-topic entry points.** An instructor assigns "topics 3–4 before Thursday."
- **Resumable and multi-session** (g=0.44 vs 0.08 for single-session).
- **Anyone can still land on it cold** and work through from the start.
- It **pushes learners onto their own real repository**, explicitly. It does not pretend to replace
  practice.

---

## 5. Audience and scope

### 5.1 Audience

| Tier | Assumed knowledge | Served by |
|---|---|---|
| Total beginner | No terminal, no git | Topics 1–5 |
| CS student / junior | Codes, copy-pastes git, no model | All topics; scaffolding fades fast |
| Non-developer collaborator | Needs to follow branches and PRs | Topics 1, 4, 9 |
| **Instructor** | Teaching a course | Assigns topics; needs entry points |

**Scaffolding must fade on *demonstrated competence*, not on level number.** The expertise-reversal
effect is not a nicety: guidance that helps novices **actively harms** experts. §7.3 is how we measure
competence to fade against.

### 5.2 In scope
Git core plus GitHub collaboration: commits, staging, branches, HEAD, reachability, reflog, merge,
conflicts, reset, revert, restore, rebase, interactive rebase, cherry-pick, remotes, clone, push,
fetch, pull, fork, pull requests, review, merge strategies.

### 5.3 Out of scope (v1)
Actions/CI, Projects, Releases, Issues, protected branches, CODEOWNERS, submodules, LFS, hooks,
worktrees, bisect, blame. **`git stash` deferred** — note Perez De Rosso found stash *"maps to no
high-level purpose"* and exists only to patch flaws in branching; Gitless deleted it. Real
multiplayer, accounts, backend, leaderboards: out.

---

## 6. Product structure

**Learn** — nine topics (§8). **Sandbox** — free play, explicitly *not* the front door (§3.3).
**Reference** — every command with its animation. **Progress export** — §10.4.

---

## 7. The core loop

This section is the product. §2 governs it.

### 7.1 The three-beat exercise

**Beat 1 — Anticipate.** Before anything animates: *"Where will `main` be after this, and why?"*
Prediction **and** reason, fused into one act. This is not the engagement ladder; it is here because:
- **Prediction alone is worth ~nothing** (Tamang: 0.047). Prediction *plus* reason is
  "anticipatory self-explanation," **the highest cell in Bisra's table (g=1.37)** — a k=1 estimate the
  authors say can be discounted, but it is also **exactly what Hundhausen independently identified**
  as one of the few AV activities that worked, and **exactly the condition whose removal made Gurka's
  replication of Byrne collapse to null.** Three literatures, arrived at separately, pointing at the
  same mechanism. That convergence is the argument, not the k=1 effect size.
- **It surfaces fragmentary intuition and makes it fail visibly** — which §8.1 explains is the only
  thing that works on git's misconceptions.

**Beat 2 — Act.** Manipulate the model to reach the goal. **The win condition must require the
concept, never a gesture** (§2).

**Beat 3 — Explain, guided.** Not multiple choice (g=0.24, n.s.). **Fill-in-the-blank (g=0.895)** and
short constructed responses, Socratic-guided (0.59 vs 0.30 for free explanation). **There is no
"reveal answer" button** — it destroys the effect.

### 7.2 The command composer

**Replaces the read-only mirror**, which was passive viewing — Python Tutor's exact failure mode.

Commands appear with holes: `git reset --[?] [?]`. The learner **completes** them from valid choices.
This is fill-in-the-blank — the strongest legitimate generation format (g=0.895), gradeable with no
backend, and a **faded worked example**: the scaffold *is* the thing being taught, so it dissolves as
competence grows. Oh My Git!'s typed-hole cards are the existing proof this works as a game mechanic.

**The learner never types from scratch in v1.** The composer fades to a real prompt in expert mode
(§16) — the fade is now a designed path rather than a rewrite.

### 7.3 Misconception diagnosis, and the concept inventory

Every tool in the landscape grades with a binary predicate — LGB compares trees, Oh My Git! runs bash,
Githug returns booleans. Win or lose, no explanation of *why*.

We declare **misconception traps**: predicates matching known-wrong end states, each mapped to
feedback that **names the misconception**. This is the d=0.5 → **d=1.1** finding, the largest
intervention effect in the corpus.

**And it doubles as an instrument.** There is **no validated version-control concept inventory** —
confirmed gap. Our anticipate-beat data would be the first. We need it anyway: **expertise reversal
says scaffolding must fade on measured competence, and you cannot measure what you don't instrument.**

### 7.4 Subgoal labels
Every multi-step procedure is presented with labelled subgoals. Cheap, and the evidence is specific:
it won't lift the mean, it **halves failure and withdrawal** (§11).

---

## 8. Curriculum

### 8.1 Do not build refutation

Julia Evans polled ~2,500 developers: **50% said a commit is a diff, 42% said a snapshot** — and
people held **both beliefs simultaneously**: *"in my mind a commit is a diff, but I think it's
actually implemented as a snapshot."* That is fragmentary intuition (diSessa's "knowledge in pieces"),
not a stable wrong theory.

**So "this exercise kills misconception X" is the wrong frame** — you cannot refute a belief the
learner doesn't reliably hold. Refutation works in physics because the misconceptions there are
stable; git's are not. **Instead: engineer moments where the fragmentary intuition makes a prediction
that visibly fails.** That is Beat 1's real job.

### 8.2 The evidence base for what's hard

Julia Evans' polls (n≈1,000–2,500 each) — the best quantitative misconception data that exists:

| Question | Result |
|---|---|
| **What is a branch?** | **Only 15% correct** ("the commit at the end"); 58% "the commits that branch off" |
| **How do you think of HEAD?** | **67% wrong** ("pointer to the current commit"); 25% correct ("pointer to the current branch") |
| **Commit: diff or snapshot?** | **50% diff / 42% snapshot** |
| Conflict code-order differs merge vs rebase? | **69% didn't know** |
| **Confidence about what a commit is** | **82% confident — the one term people feel fine about** |
| Shipped a production bug from bad conflict resolution | **61%** |
| Lost work to git in the last year or two | **17%** |

**Two design consequences.** *Commit is our only solid ground — build outward from it, don't belabour
it.* And *branch and HEAD are worse than assumed* — 15% and 25% correct.

### 8.3 Undo is the spine

Three independent methods agree, and it isn't close:
- **17 of the top 50 Stack Overflow git questions are undo/recovery — 44% of 210M views.**
- The most-viewed git question ever: *"How do I undo the most recent local commits?"* — **16.7M views**.
- A study of **80,370** git questions: the five most-viewed commands are `revert`, `reflog`, `stash`,
  `clean`, `reset` — **all recovery**.
- **8 of 9 "Oh Shit, Git!?!" entries** are recovery.
- Church: the emergent experience is **fear**; professionals re-clone to recover.

**So recovery is not topic 5 of 8. It is topic 3 of 9, and a permanent guarantee running through every
later topic** — every topic has an undo path, and reflog is always reachable. This serves Goal B (§1.1)
directly, and **nobody teaches git this way.**

### 8.4 The topics

*Order: build from the solid ground (commit) → the minimum refs needed → the safety guarantee → then
everything else, each with an undo path.*

**Topic 1 — Commits and the chain** *(4)*
`init`; snapshot → node → chain; time-travel; anatomy (full tree + parent + hash, diff **computed** on
request). Commit is where 82% feel confident — establish, don't belabour. Kills: diff-vs-snapshot.
The three zones appear mechanically here; they are *understood* in topic 4.

**Topic 2 — Labels and HEAD** *(5)*
`main` is a sticky note — creating a branch does **nothing** (deliberately anticlimactic). HEAD is
"you are here". Switching moves the marker; files rebuild. Committing moves the label. Detached HEAD,
walked into on purpose. **Only 15% and 25% of developers get these right — this topic is doing more
work than its size suggests.**

**Topic 3 — Nothing is ever lost** *(4)* — **THE SPINE**
Moving a label doesn't delete a commit. Unreachable ≠ gone. **Reflog, early.** Recover from a
catastrophic reset before you have ever been asked to run one. Deliberate disasters, then rescue.
*This is the confidence axis (§1.1 Goal B) and the #1 documented problem, addressed together.*

**Topic 4 — Files and the index** *(6)*
The highest-confidence misconception in the literature — named in the 2012 survey's free-text hate
list; two of Perez De Rosso's misfits; Gitless deleted it and users called that *"a major reduction in
complexity"*; Hamano stated in **2006** that the three-level model is a prerequisite and that Cogito
hid the index from beginners.
- Why staging exists: two unrelated changes → two clean commits
- **The index holds a snapshot, not a pointer**: stage, edit again, commit — the **staged** version lands
- **`git commit <file>` commits the *working* version, bypassing what you staged** — the documented
  propriety misfit, walked into as a trap
- Tracked ≠ staged ≠ committed; `.gitignore`
- Amend: the old commit doesn't change; a new one is born and the label slides

**Topic 5 — Undoing** *(4)*
**Reset shown as which zones get dragged backwards**: soft = label; mixed = label + index; hard =
label + index + working dir. The three-zone layout makes this self-evident for free, and nobody
teaches it this way. **We default to `--mixed`, as real git does — LGB defaults to `--hard`, which is
wrong.** Then revert (the anti-commit), and `restore`.

**Topic 6 — Merging and conflicts** *(5)*
Fast-forward (the label slides — now the name means something); the two-parent diamond; **conflicts**.
**Promoted on evidence:** 61% have shipped a production bug from bad conflict resolution; 32% of
students called conflicts *the* difficulty and **re-cloned to escape**; Gitless's largest win was
conflicts (54.55% → 90.91%). **Conflicts are a three-way problem taught with two-way markers** — we
show the merge base always (this is what `zdiff3` does, and users call it *"totally indispensable"*).
Plus `--abort`.

**Topic 7 — Rebase** *(4)*
**Not "merge vs rebase"** — the data says that's a *preference* split (41% rebase / 29% merge), not a
knowledge gap. **Build "what rebase does to commit identity"**: originals ghost out, copies born with
**new hashes**. Then interactive rebase; cherry-pick; the golden rule, shown.

**Topic 8 — Remotes and GitHub** *(6)*
The graph splits into panels across a visible gap.
- Clone
- **`origin/main` is your *cached memory* of their label** — Church's "hidden dependency"; `git status`
  says *"up to date"* while hundreds of commits behind. **Show three things: local, the origin/ cache,
  and the actual remote.** The two-repo mental model is what breaks.
- Push; **fetch alone** (watch `origin/main` move while `main` sits still — one animation, the whole
  lesson); pull = fetch + merge
- Rejected push — note git's error is **identical** whether you're merely behind or actually diverged
- Force push; `--force-with-lease`

**Topic 9 — Working with others** *(5)*
Three panels: `You` | `GitHub` | `Another developer`. Simulated, deterministic, no plot.
Fork; **a PR is a request to move a label**; review with follow-up commits; **merge vs squash vs
rebase-merge as three graph shapes side by side** (taught well nowhere); `main` moving under an open
PR; syncing a fork.

**43 exercises.** Vocabulary throughout: **`switch`/`restore` first; `checkout` named once as legacy.**
This is settled by git's own maintainer — commit `d787d31`: *"'git checkout' doing too many things is
a source of confusion for many users (and it even bites old timers sometimes)."*

---

## 9. Interaction and screen

The screen is a spatial rendering of git's data model; actions are movements within it. **No generic
toolbar** — every action begins by pointing at the object it happens to, which is how git is organised.

**Layout:** working directory + staging (left, drag down between them) · the graph (centre) ·
inspector (right) · **command composer** (bottom, §7.2). Floating objective card with subgoal labels
(§7.4); anticipate/explain prompts appear inline.

**Gestures:** drag to stage · drag tag onto tag to merge · drag tag to an older node to reset (choose
zone depth) · drag node onto tag to cherry-pick · drag tag across the gap to push. Ambiguous gestures
resolve with a choice popover, never a guess. **Every drag has a keyboard and menu equivalent** —
required for §12, free because both dispatch the same engine action.

**Constrained affordances per exercise** (Oh My Git!'s `cards` idea): each exercise declares which
operations exist. Scaffolding, and it makes Beat 1 answerable.

---

## 10. Architecture

### 10.1 A purpose-built engine

Real in-browser git was evaluated and rejected on evidence: **isomorphic-git has no rebase**
([issue #189, open since 2018](https://github.com/isomorphic-git/isomorphic-git/issues/189)), **no
revert, no reflog** — exactly what topics 3, 5 and 7 teach. **Real SHAs include a timestamp and are
therefore nondeterministic**, breaking replay, snapshot tests, and goal checks. **Real GitHub I/O needs
a CORS proxy**, violating "no backend." wasm-git is GPL and ~1 MB; gitoxide has no wasm target; js-git
died in 2017.

**Hashing: content only, excluding timestamp and author.** Deterministic *and* honest — changing one
character still changes the hash, which is what makes topics 1 and 7 land.

Estimated 4,000–6,000 lines. LGB's engine is 3,448 **without** files, index, conflicts, or reflog.

### 10.2 The engine is a pure function

```
reduce(state: RepoState, action: GitAction) => { state: RepoState, events: Event[] }
```

No I/O, no clock, no randomness, no UI knowledge. Buys undo/rewind, event-driven animation, goal
checking, deterministic simulated collaborators, and a fully testable core.

### 10.3 Levels are data
Initial state · objective + **subgoal labels** · **anticipate prompt** · **explain prompt (fill-in
holes, no reveal)** · goal predicate · allowed actions · progressive hints (Githug's pattern — the only
tool with it) · **misconception traps** · collaborator script.

**Goal predicates assert over repo state, never graph geometry, and are hash-agnostic** — rebase and
cherry-pick legitimately produce different hashes.

### 10.4 Stack

| Concern | Choice |
|---|---|
| Build / UI | Vite · React · TypeScript · Tailwind |
| Graph | Custom layout + `d3-selection`/`d3-transition`, keyed by SHA (~17 KB gz) |
| i18n | `@lingui/core` (28 KB, ICU), per-locale bundles |
| Persistence | localStorage + **export code** — Safari ITP evicts after 7 days idle |
| Hosting | Netlify static |

Rejected: PixiJS (70 MB); gitgraph.js (archived 2024); dagre/elk (§10.5).

### 10.5 Graph layout — no layout engine

dagre and ELK globally optimise crossings, so **adding one commit relocates untouched nodes**, and
neither exposes a stability constraint. **In a teaching tool the animation is the claim** — a reflow
that moves commits the learner didn't touch asserts something false. This is a correctness objection,
not a performance one.

Row = **topological order** (Kahn's); column = **sticky per-branch lane**, identity persisted across
states. Stability by construction. **SVG, not canvas** — free hit-testing, theming, and real
accessibility. Ghost nodes for rebase originals and unreachable commits: how "nothing is destroyed" is
*shown* rather than claimed (§8.3).

---

## 11. Success criteria

**We measure the left tail, not the mean.** The subgoal classroom study (N=265) is the model: quizzes
improved (d=0.44) but **exams did not** (d=0.20, p=.24) — and yet **withdrawal and failure roughly
halved**, and variance dropped. *"Subgoals compress the left tail rather than lift the mean."* For a
product whose whole purpose is people who currently bounce off git, **that is the win condition.**

### 11.1 What we will measure at the gate
- **Completion and drop-off**, per topic — the primary metric
- Anticipate-beat accuracy over time (the concept inventory, §7.3)
- Whether a genuine non-git-knower finishes topics 1–4 unaided
- **Self-reported fear before/after** (Goal B, §1.1) — Church's axis, which no git tool has measured

### 11.2 The honesty clause

**Time-on-task confounds this entire literature and it will confound us.** Sorva's group spent 1.8× as
long and he credits that for part of his one significant result. Bisra: took-longer g=0.72 vs
equal-time g=0.41.

**If our learners do better only because they spent longer, we have not built a better teacher — we
have built a more attractive one, and the alternative could have bought that attention more cheaply.**
Any evaluation must record time-on-task. Sorva's warning stands over this whole project: *"Sometimes,
it is the discomfited learner who has made more progress than the one who 'likes it'."* **Liking is not
learning.** Entertainment value was not a significant moderator in Sitzmann's meta-analysis, and
high-entertainment games scored numerically *lower*.

---

## 12. Accessibility

**A differentiator, not compliance.** LGB [issue #960](https://github.com/pcottle/learnGitBranching/issues/960)
— the graph is unreachable by screen readers, and graph changes are unannounced — has been open since
2022. **LGB's entire pedagogy is invisible to blind learners.** An accessible git visualiser would be
the only one.

Keyboard equivalent for every drag (§9) · colour never the only channel · an ordered, navigable text
representation of the graph · **an ARIA live region announcing state changes**, which falls out of
§10.2's event stream · `prefers-reduced-motion` · WCAG AA in the dark theme. **Note WCAG 2.2 §2.5.7
(Dragging Movements) requires the non-drag path** — this is a requirement, not a nicety.

---

## 13. Internationalisation

**Git terms stay English; the prose around them is translated.** Turkish developers say *"branch'e
commit atmak"*; nobody says *"şube"*. Inventing equivalents teaches vocabulary nobody uses and leaves
learners unable to talk to other developers. LGB's Turkish does this correctly. Each language ships a
**glossary file** deciding this per term.

⚠️ **Open question for the gate:** this optimises for the developer tier. Whether a Turkish teenager
with no English parses *"commit'e"* is untested, and tier 1 is half our audience.

- **No sentence assembly.** Turkish is agglutinative and verb-final. Every sentence is one
  translatable unit with ICU placeholders. **Turkish has two cardinal plural categories (`one`,
  `other`)** — `{count} commit` cannot be collapsed. (Ordinals are `other`-only.)
- **Per-locale bundles, `/tr/` and `/en/` prefixes.** LGB inlines all 26 locales into every level file
  — a measured **15.1× tax**, a 3.06 MB bundle, and every Turkish learner downloads 25 languages they
  don't read.
- **Language negotiation uses 302, never 301.** A 301 permanently pins a user to a wrong guess.
- CSS logical properties throughout; **the graph is pinned `dir="ltr"` even in RTL locales** — git's
  arrow of time is universal.
- No `text-transform` anywhere — Turkish dotted/dotless İ/ı breaks under naive casing.
- Missing key → English fallback **and CI failure**.
- **LGB's Turkish has real errors** (`çalımanının` for *çalışmamın*; `hg summit` for `hg summary`). A
  reviewed translation is a cheap, visible quality edge.

---

## 14. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **We build Python Tutor** — a lovely visualisation that teaches nothing | **Critical** | §2 is the governing law; every win condition audited against it; §11.1 measures it |
| **The generation tasks feel like homework and people quit** | **High** | Drop-off is the primary metric; scaffolding fades on measured competence (§7.3) |
| Conflict UI (topic 6) is intrinsically hard | High | Prototype out of order, as a spike, before the slice |
| We win only by buying time-on-task | High | §11.2 — record it, or the result is uninterpretable |
| LGB [PR #1379](https://github.com/pcottle/learnGitBranching/pull/1379) closes the staging gap | Medium | Assumed. Differentiation is §7, undo-first, i18n and a11y — never staging alone. |
| Engine larger than 4–6k lines | Medium | It's step 1, test-first; overrun surfaces immediately |
| Turkish code-switching fails tier 1 | Medium | §13 open question; test at the gate |
| Translation drifts | Medium | Missing key = CI failure |

---

## 15. Build order

**Prove the risky things first; deployed from day one.**

| Step | Deliverable |
|---|---|
| 0 | Empty page live on Netlify |
| 1 | **Engine, standalone, test-first** — objects, deterministic hashing, refs, HEAD, index, **reflog**, commit, branch, switch, reset |
| 1b | **Differential harness**: same command sequences against **real `git` in Node**, assert our DAG matches. Real git in the test suite, never the runtime. |
| 2 | Graph renderer — topological rows, sticky lanes, tags, HEAD, ghosts |
| 3 | Event-driven animation |
| 4 | Interaction — drag to stage, context menus, constrained affordances |
| 5 | **Command composer** (§7.2) |
| 6 | Level system — goal-check, hints, subgoals, **anticipate/explain beats**, **misconception traps** |
| 7 | i18n harness, EN + TR, per-locale bundles |
| 8 | Accessibility — live region, keyboard paths, text graph |
| 9 | **Topics 1–4 complete, both languages, deployed** |

**The slice is topics 1–4, not 1–2.** Topic 3 is the spine and topic 4 is the hardest misconception;
a slice that omits either tests nothing that matters.

### 15.1 The gate

**Stop at step 9. Test with real people, including at least one who genuinely does not know git.**
Record time-on-task (§11.2).

Three bets are on the table:
1. That the generation tasks teach (§2, §7) — *the product*
2. That they don't feel like homework — *the drop-off risk*
3. That Turkish code-switching works for tier 1 (§13)

All three are cheap now and ruinous after nine topics are built on top of them. Everything after step 9
is content production, which is fast once the machine works.

**A named failure mode:** if the loop tests badly, §7 is wrong and the product needs rethinking —
before topics 5–9, not after.

---

## 16. Deferred

**Expert mode** — the composer fades to a real prompt; the engine already accepts actions from any
source, so this needs a parser and nothing else. **Designed for, not built.** Also: real multiplayer
(state model stays compatible); accounts; workflows (Git Flow, trunk-based); `git stash`; classroom
dashboard; shareable sandbox URLs.

---

## 17. Prior art and licensing

| Project | License | Borrowable |
|---|---|---|
| Learn Git Branching | **MIT** | Code, level design, hash-agnostic goal checking |
| **Oh My Git!** | **Blue Oak 1.0.0** | **The deepest curriculum available, trapped in a desktop app nobody installs. Its typed-hole cards are the proof for §7.2. Our best content source.** |
| GitHub Skills / Learn | **MIT** | PR + code-review curriculum (topic 9) |
| Githug | **MIT** | 55 level ideas + the progressive-hint pattern |
| visualizing-git / explain-git-with-d3 | **MIT** | d3 DAG rendering; it has reflog |
| gitexercises | **MIT** | 23 task ideas |
| **git-sim** | **GPL-2.0** | ⚠️ **Do not copy code.** Reference only. |
| Devlands | proprietary | ❌ Funded closed-source competitor |

**Possible evaluation partner:** Eray Tüzün's [BILSEN group](https://eraytuzun.com/) at **Bilkent
University** built and evaluated CRSG — a browser-based serious game teaching **code review** — with
132 students (ESEC/FSE 2020). The only rigorous prior art on the PR half of this idea, and it's local.

---

## 18. Decisions on record

| Decision | Choice | Rejected |
|---|---|---|
| **Governing law** | **Whatever the tool forces you to generate is what it teaches** | "Make the model visible and intuition follows" |
| Goals | Model **and** calibrated confidence | Model transfer alone |
| Positioning | **Supplement, course-friendly** | Standalone (d=−0.12) |
| **Primary mechanism** | **Guided self-explanation + misconception-naming feedback** | Engagement levels 4–6 (miscited); staging (LGB is shipping it) |
| Loop | Anticipate (predict **+** why) → act → guided explain | Predict alone (0.047); multiple-choice explain (g=0.24 n.s.) |
| Commands | **Fill-in-the-holes composer** | Read-only mirror (passive viewing); free typing |
| Curriculum spine | **Undo, at topic 3** | Undo at topic 5 |
| Framing | Predict-and-fail | Refutation ("you think X, actually Y") |
| Success metric | **Left-tail compression: completion, drop-off, fear** | Mean score |
| Sandbox | A mode, not the front door | Sandbox-first (*"replicatably false"*) |
| Vocabulary | `switch`/`restore` first | `checkout`-first (LGB) |
| Engine | Purpose-built, content-only hashing | isomorphic-git; wasm-git; gitoxide |
| Real git | Test suite (differential) | Runtime |
| Graph | Topological rows + sticky lanes; SVG | dagre/elk (unstable reflow); canvas |
| Art | Clean, technical, dark | Playful; retro pixel *(schematic 0.48 vs realistic −0.01)* |
| Git terms | Untranslated, code-switched | Localised terminology |
| First release | **Slice = topics 1–4** | Topics 1–2; full v1 |
