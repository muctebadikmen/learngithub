# GitHub Rehberi v2 — design

Approved by owner on 2026-07-17. Replaces the entire v1 git-simulator approach.

## One sentence

A single-page, Turkish, click-through visual explainer — one big animated scene,
one big button per step — that teaches a vibe coder the six GitHub ideas they
actually need in ~8 minutes, followed by a free-play sandbox on the same scene.

## Audience & purpose

- YouTube viewers (tech/AI channel) who "vibe code" with AI tools and have never
  used git or GitHub.
- Used two ways: driven on camera during a video, and shared as a link viewers
  play themselves.
- Turkish only. Real terms always shown with plain Turkish in parentheses:
  Commit (kayıt noktası), Push (buluta yedekle), Branch (deneme hattı),
  Pull Request (birleştirme isteği).

## What it is NOT (v1 mistakes being fixed)

- No files, folders, staging, or working directory. The unit is always "your
  project" as a whole.
- No git engine, commands, detached HEAD, or reset modes.
- No goal predicates or checklists. Guided mode is linear (forward / restart).
- No text walls: max 2–3 short sentences per step. Plain, direct language —
  no narrative fluff. The animation does the teaching.

## The one persistent scene

A single SVG scene that evolves through the whole app:

- Left — "Senin bilgisayarın": the vibe-coded app as a small mockup card whose
  visible content changes with each commit; below it a horizontal timeline of
  save points (commits) like game save slots. Branch = a second parallel lane
  forking off; merge = lanes joining.
- Right — "GitHub (bulut)": empty at first; push mirrors the timeline there.
  PRs appear as a card on this side.

## Modes

### Guided (7 chapters, linear)

1. **Repo nedir?** App appears; "Repo oluştur" wraps it in a repo box, first
   commit "Başlangıç" drops on the timeline.
2. **Commit.** Press "Commit at" 3×; app visibly gains a feature before each
   save point.
3. **Geri dönme.** AI breaks the app (card glitches red). "Geri dön" slides the
   pointer back to the last good save point. Emotional core of the video.
4. **Push.** Push mirrors commits to the GitHub side; then the laptop "dies"
   (left side goes dark) — everything survives in the cloud; restore.
5. **Branch.** Fork "deneme" lane, risky commits on it, main stays green.
   Two-way choice: merge into main, or delete the lane harmlessly.
6. **Pull Request.** PR card on the GitHub side (what changed + reviewer
   approve), then merge animates.
7. **Özet + kopya kağıdı.** Fully labeled scene + the exact Turkish sentences
   to tell your AI tool ("Değişiklikleri commit'le", "GitHub'a push'la", …).
   Button leads to sandbox.

### Sandbox (free play)

Same scene, same tiny state machine, but free buttons: AI'ya geliştir,
AI bozdu!, Commit at, Geri dön, Branch aç, Branch'e geç, Merge et, Branch'i sil,
Push'la, Sıfırla. Dynamic and game-like; no goals, no failure.

## Architecture (deliberately tiny)

- `src/model.ts` — display-state + pure actions. NOT a git model: just what the
  picture needs (commits with a visual app-snapshot, one optional side branch
  lane, current pointer, pushed set, broken/dead flags). Unit-tested.
- `src/chapters.ts` — guided script: array of steps `{ text, buttons: [{label,
  action}] }` driving the same model actions the sandbox uses.
- `src/Scene.tsx` — the SVG scene rendering a model state with CSS-transition
  animations (~600ms).
- `src/App.tsx` — mode switch (guided / sandbox), step progression, progress
  dots, keyboard advance (Space/→) for hands-free screen recording.
- `src/main.tsx`, `src/index.css` (Tailwind v4).

Kept from v1: Vite/React/TypeScript/Tailwind toolchain, Netlify config, repo.
Deleted: engine, layout, graph, levels, i18n, ui modules and all v1 tests.

## Video ergonomics

Dark theme, big typography, 16:9-friendly layout, one primary button per step,
progress dots, restart anytime, animations fast enough not to bore but slow
enough to read on camera.

## Testing & verification

- Vitest unit tests for `model.ts` actions (commit/goBack/branch/merge/push
  invariants).
- Manual browser verification of the full guided flow + sandbox before ship.

## Deploy

Push to `main` on github.com/muctebadikmen/learngithub → Netlify builds
`npm run build` → publishes `dist`.
