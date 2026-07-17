# GitHub Rehberi v3 — Büyük Canvas + Branch'tan Branch + Takım/Pull + Çakışma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehber ve sandbox'ı tek geniş pan/zoom canvas + sol dikey ray düzenine taşımak; branch'tan branch açmayı, takım arkadaşı push + pull'u ve gerçek merge çakışması + çözümünü hem modele hem rehbere eklemek.

**Architecture:** Model (`model.ts`) tek gerçeklik kaynağı olarak kalır; saf reducer fonksiyonları büyür. `Scene.tsx` sahneyi modelden çizmeye devam eder. `App.tsx` her iki modda da sol ray + canvas'a döner. Yeni kavramlar `chapters.ts`'e bölüm olarak girer. Değişiklikler dosya-çakışması olmayacak şekilde 3 faza bölünür; her faz kendi başına çalışır ve test edilir.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind (util class'lar) + Vitest. SVG ile çizim. CSS değişkenleriyle tema.

## Global Constraints

- Dil: tüm kullanıcı-görünür metin **Türkçe**, mevcut ton (sade, doğrudan, hikâye anlatmadan).
- Model fonksiyonları **saf** kalır: `(state, ...args) => state`, mutasyon yok, guard'lar `return s` ile no-op döner.
- Her yeni git kavramı için buton `cmd`'si **gerçek** git komutu olmalı (mevcut dürüstlük kuralı).
- Yeni dosya açmadan mevcut 4 dosyada (model/Scene/App/chapters) çalış; gereksiz soyutlama ekleme (YAGNI).
- `oxlint` + `tsc` temiz; `vitest` yeşil geçmeli.
- Aktif yan branch üst sınırı **4** (lane 1..4).

---

## Dosya Yapısı

- `src/model.ts` — reducer'lar + türler. Faz 2 (branch parent) ve Faz 3 (remote/pull/conflict) burada büyür. **Tek yazar kuralı:** aynı anda tek subagent dokunur.
- `src/Scene.tsx` — SVG sahne. Faz 2 (nested fork çizimi) ve Faz 3 (remote commit + çakışma işareti) burada büyür.
- `src/App.tsx` — düzen + buton listeleri. Faz 1 (sol ray birleştirme), Faz 3 (pull/takım/çözüm butonları) burada.
- `src/chapters.ts` — rehber adımları. Sadece Faz 3 (yeni bölümler).
- `src/useZoom.ts` — Faz 1'de küçük ayar (zoom aralığı/fit).
- `tests/model.test.ts` — model testleri; Faz 2 ve 3'te yeni testler.

**Sıra:** Faz 1 → Faz 2 → Faz 3. Fazlar aynı dosyalara dokunduğu için **sıralı**; faz içinde model bittikten sonra görsel iş yapılır.

---

# FAZ 1 — Sol ray (iki mod) + büyük canvas

Model değişmez. Sadece `App.tsx` düzeni + `useZoom.ts` ince ayar.

### Task 1: İki modda da sol dikey ray

**Files:**
- Modify: `src/App.tsx` (`main` bloğu ve `footer` bloğu, ~162-251)

**Interfaces:**
- Consumes: mevcut `step`, `sandboxButtons`, `model`, `zoom`.
- Produces: guided modda footer yerine sol rayda `RailGuided`, sandbox'ta mevcut ray → ikisi de aynı `w-72` kolon.

- [ ] **Step 1: `footer` içeriğini sol raya taşı**

`main`'i her iki modda `flex gap-4` yap. Sol kolon her modda render edilir:

```tsx
<main className="relative min-h-0 flex-1 gap-4 px-4 flex">
  <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto py-2">
    <EventLine event={model.lastEvent} />
    {mode === 'guided' ? (
      <GuidedRail step={step} showCmds={showCmds} primaryRef={primaryRef} onPress={pressStepButton} />
    ) : (
      <SandboxRail buttons={sandboxButtons} showCmds={showCmds} model={model} setModel={setModel} />
    )}
  </aside>
  <div ref={zoom.containerRef} className="panel-card relative h-full min-w-0 flex-1 touch-none select-none overflow-clip rounded-3xl" ...>
    ... Scene + zoom butonları ...
  </div>
</main>
```

- [ ] **Step 2: `GuidedRail` bileşenini App.tsx içinde yaz**

Footer'daki içerik (step.text, cheatSheet grid, step.buttons, "boşluk/→" ipucu) dikey rayda. Cheat sheet dar rayda tek kolon (`grid-cols-1`). Buton `ref={i===0 ? primaryRef : undefined}` korunur (space/→ kısayolu bozulmasın).

- [ ] **Step 3: `SandboxRail` bileşenini çıkar** (mevcut sandbox ray JSX'i bileşene taşınır; davranış aynı).

- [ ] **Step 4: `footer` bloğunu tamamen kaldır** (artık ray içinde).

- [ ] **Step 5: Doğrula (build + preview)**

Run: `npm run build` → hata yok. `.claude/launch.json` ile preview aç, guided ve sandbox'ta ray solda, canvas tam yükseklik. Ekran görüntüsü al.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): unify controls into left rail for both modes"
```

### Task 2: Zoom gerçekten derinleşsin

**Files:**
- Modify: `src/useZoom.ts:7-9` (sabitler), `src/Scene.tsx:299-300` (SCENE boyutları)

**Interfaces:**
- Consumes: `SCENE_W`, `SCENE_H`.
- Produces: aynı isimler; daha büyük sahne + daha geniş zoom aralığı.

- [ ] **Step 1: Sahneyi büyüt** — `SCENE_W` ve panel/lane yerleşimini koruyarak canvas'ın iç nefes alanını artır: nodları/laneleri daha ferah yerleştirmek için `laneY` aralığını ve `timelineSlots` `gap` üst sınırını (92 → 120) büyüt. Küçük, görünür fark.

- [ ] **Step 2: Zoom aralığı** — `MAX_SCALE` 4 → 6 (bir paneli yakından incelemek için), `MIN_SCALE` 0.35 → 0.5 (aşırı küçülüp boş kalmayı önler).

- [ ] **Step 3: Doğrula** — preview'de ctrl/⌘+scroll ile bir panele yaklaş: nodlar okunur büyür; uzaklaş: iki panel birden görünür. `npm test` yeşil (zoom.test.ts).

- [ ] **Step 4: Commit**

```bash
git add src/useZoom.ts src/Scene.tsx
git commit -m "feat(canvas): deeper zoom range and roomier scene"
```

---

# FAZ 2 — Branch'tan branch

Önce model + testler (TDD), sonra Scene çizimi.

### Task 3: `Branch.parent` + herhangi bir branch'ten branch açma

**Files:**
- Modify: `src/model.ts` (`Branch` tür, `createBranch`, `mergeBranch`, `MAX`)
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: mevcut `tip`, `branchCommits`, `activeBranch`, `laneColor`.
- Produces:
  - `Branch = { name: string; forkId: string; laneIdx: number; parent: string }` (`parent` = 'main' ya da üst branch adı)
  - `createBranch(s, name?)` artık main dışında da çalışır; yeni branch `parent = s.currentBranch`.
  - `parentLaneIdx(s, branchName): number` (yeni export; child fork'unu üst lane'e bağlamak için Scene kullanır)
  - `MAX_BRANCHES = 4`, lane 1..4.

- [ ] **Step 1: Failing test — branch'tan branch açılır ve parent'ı kaydeder**

```ts
it('a branch can be opened from another branch and records its parent', () => {
  let s = createBranch(seeded(), 'a')          // a: parent main
  s = commit(aiImprove(s), 'A1')
  s = createBranch(s, 'a2')                     // a2: parent 'a'
  expect(s.currentBranch).toBe('a2')
  const a2 = s.branches.find((b) => b.name === 'a2')!
  expect(a2.parent).toBe('a')
  expect(a2.forkId).toBe(headCommit({ ...s, currentBranch: 'a' } as ModelState)?.id ?? a2.forkId)
})
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `npx vitest run tests/model.test.ts -t "from another branch"` → FAIL (createBranch main dışında `return s`).

- [ ] **Step 3: `createBranch`'i güncelle**

```ts
export const MAX_BRANCHES = 4

export function createBranch(s: ModelState, name?: string): ModelState {
  if (!s.hasRepo || s.branches.length >= MAX_BRANCHES || !s.headId) return s
  const activeNames = new Set(s.branches.map((b) => b.name))
  const resolvedName = name ?? DEFAULT_BRANCH_NAMES.find((n) => !activeNames.has(n))
  if (!resolvedName || resolvedName === 'main' || activeNames.has(resolvedName)) return s
  const usedLanes = new Set(s.branches.map((b) => b.laneIdx))
  const laneIdx = [1, 2, 3, 4].find((i) => !usedLanes.has(i))
  if (!laneIdx) return s
  const branch: Branch = { name: resolvedName, forkId: s.headId, laneIdx, parent: s.currentBranch }
  return {
    ...s,
    branches: [...s.branches, branch],
    currentBranch: resolvedName,
    pr: s.pr?.status === 'merged' ? null : s.pr,
    lastEvent: `“${resolvedName}” branch'i açıldı — “${s.currentBranch}” güvende.`,
  }
}
```

- [ ] **Step 4: `Branch` türüne `parent` ekle** (`src/model.ts:10`) ve mevcut `createBranch` testindeki `toEqual` beklentisini `parent: 'main'` içerecek şekilde güncelle (satır ~105, 132-143, 178-192).

- [ ] **Step 5: `parentLaneIdx` export et**

```ts
export function parentLaneIdx(s: ModelState, branchName: string): number {
  const b = s.branches.find((x) => x.name === branchName)
  if (!b || b.parent === 'main') return 0
  return s.branches.find((x) => x.name === b.parent)?.laneIdx ?? 0
}
```

- [ ] **Step 6: Testleri çalıştır** — Run: `npx vitest run tests/model.test.ts` → mevcut branch testleri `parent` eklenince güncellenip yeşil olmalı.

- [ ] **Step 7: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "feat(model): branches can fork from any branch (parent tracking)"
```

### Task 4: Merge, parent branch'e döner (main'e sabit değil)

**Files:**
- Modify: `src/model.ts` (`mergeBranch`, `deleteBranch` guard)
- Test: `tests/model.test.ts`

**Interfaces:**
- Consumes: `parentLaneIdx`, `branchCommits`, `tip`.
- Produces: `mergeBranch` child'ı `parent`'ına merge eder; guard: aktif alt branch'i olan bir branch merge/delete edilemez.

- [ ] **Step 1: Failing test — alt branch üst branch'e merge olur**

```ts
it('merging a sub-branch lands on its parent branch, not main', () => {
  let s = createBranch(seeded(), 'a')
  s = commit(aiImprove(s), 'A1')
  s = createBranch(s, 'a2')
  s = commit(aiImprove(s), 'A2')
  const merged = mergeBranch(s)                 // a2 -> a
  expect(merged.currentBranch).toBe('a')
  expect(headCommit(merged)?.isMerge).toBe(true)
  expect(merged.branches.map((b) => b.name)).toEqual(['a'])
  expect(merged.commits.some((c) => c.label === 'A2')).toBe(true)
})

it('a branch with an active child cannot be merged or deleted yet', () => {
  let s = createBranch(seeded(), 'a')
  s = commit(aiImprove(s), 'A1')
  s = createBranch(s, 'a2')                      // a has child a2
  s = switchBranch(s, 'a')
  expect(mergeBranch(s)).toBe(s)                 // guarded
  expect(deleteBranch(s)).toBe(s)               // guarded
})
```

- [ ] **Step 2: Kırmızı gör** — Run: `npx vitest run tests/model.test.ts -t "sub-branch"` → FAIL.

- [ ] **Step 3: `mergeBranch`'i parent-farkında yap**

```ts
function hasActiveChild(s: ModelState, name: string): boolean {
  return s.branches.some((b) => b.parent === name)
}

export function mergeBranch(s: ModelState): ModelState {
  if (s.currentBranch === 'main') return s
  const name = s.currentBranch
  if (hasActiveChild(s, name)) return s
  const own = branchCommits(s, name)
  if (!own.length) return s
  const branch = s.branches.find((b) => b.name === name)!
  const parent = branch.parent
  const branchTip = own[own.length - 1]
  const parentTip = tip(s, parent)
  const parentLane = parent === 'main' ? 0 : (s.branches.find((b) => b.name === parent)?.laneIdx ?? 0)
  const withHead = { ...s, currentBranch: parent, headId: parentTip?.id ?? null }
  const merged = addCommit(withHead, `Merge: ${name}`, parent, parentLane, parentTip?.id ?? null, branchTip.look, true, branchTip.id)
  return {
    ...merged,
    branches: s.branches.filter((b) => b.name !== name),
    currentBranch: parent,
    pr: s.pr?.from === name ? { ...s.pr, status: 'merged' } : s.pr,
    lastEvent: `“${name}” → “${parent}” birleşti.`,
  }
}
```

- [ ] **Step 4: `deleteBranch` guard'ı** — başına `if (hasActiveChild(s, s.currentBranch)) return s` ekle.

- [ ] **Step 5: Yeşil** — Run: `npx vitest run tests/model.test.ts` → tümü yeşil. Not: mevcut `deleteBranch only removes the current branch` testi hâlâ geçmeli (a'nın child'ı yok).

- [ ] **Step 6: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "feat(model): merge into parent branch; guard branches with children"
```

### Task 5: Nested fork'u sahnede çiz

**Files:**
- Modify: `src/Scene.tsx` (`GhostForks`, `BranchPills`)

**Interfaces:**
- Consumes: `parentLaneIdx(state, b.name)`.
- Produces: boş alt branch'in kesikli fork çizgisi + pill'i üst branch lane'inden çıkar.

- [ ] **Step 1: `GhostForks`'ta fork başlangıcını üst lane'e bağla** — `x1/y1` için `slot.laneY(0)` yerine `slot.laneY(parentLaneIdx(state, b.name))`; `x1 = slot.px(fork.x)` aynı (fork commit üst lane üstünde).

- [ ] **Step 2: `BranchPills` boş-branch dalında** fork pozisyonunu üst lane'e göre koy (pill hâlâ kendi renginde, `b.laneIdx`).

- [ ] **Step 3: Doğrula** — preview: main→a→a2 aç; a2'nin fork'u a lane'inden çıkıyor, a2 kendi lane'inde. Ekran görüntüsü.

- [ ] **Step 4: Commit**

```bash
git add src/Scene.tsx
git commit -m "feat(canvas): draw nested branch forks off their parent lane"
```

### Task 6: Sandbox'ta branch'tan branch butonu

**Files:**
- Modify: `src/App.tsx` (`sandboxActions`, ~276-283)

- [ ] **Step 1:** "🌿 Branch aç" guard'ını `s.currentBranch !== 'main'` → sadece `s.branches.length >= MAX_BRANCHES` yap; `cmd` mevcut branch'ten `git switch -c <isim>` üretsin. Etiket main dışındayken "🌿 Branch'ten branch aç" olsun.

- [ ] **Step 2: Doğrula** — sandbox'ta bir branch'e geç, "Branch'ten branch aç" çalışıyor. Commit:

```bash
git add src/App.tsx
git commit -m "feat(sandbox): open a branch from a branch"
```

---

# FAZ 3 — Takım arkadaşı + pull + çakışma + çözüm + yeni bölümler

En derin katman. Sıra: (a) remote/pull modeli → (b) çakışma modeli → (c) Scene → (d) App butonları → (e) rehber bölümleri.

### Task 7: Remote-ahead + pull (fast-forward)

**Files:**
- Modify: `src/model.ts` (`ModelState`, `initialModel`, yeni `teammatePush`, `pull`, `remoteMainTip`)
- Test: `tests/model.test.ts`

**Interfaces:**
- Produces:
  - `ModelState.remoteExtra: Commit[]` — GitHub'da olan ama local'de olmayan (takım arkadaşı) commit'ler.
  - `teammatePush(s, label?): ModelState` — remote main'i ilerletir.
  - `pull(s): ModelState` — remoteExtra'yı local main'e çeker (fast-forward), pushedIds'e ekler.
  - `remoteMainTip(s): Commit | null` — GitHub'daki main ucu.

- [ ] **Step 1: State alanı** — `remoteExtra: []` ekle (`ModelState` ve `initialModel`, ayrıca `restoreFromCloud`/`createRepo`'nun döndürdüğü nesneler `...s` yaydığı için otomatik korunur; `initialModel` içine ekle).

- [ ] **Step 2: Failing test — takım arkadaşı push'lar, sen pull'larsın (FF)**

```ts
it('a teammate push advances remote main; pull fast-forwards local main', () => {
  let s = push(seeded())                         // main pushed, remote == local
  s = teammatePush(s, 'Arkadaşın işi')
  expect(s.remoteExtra).toHaveLength(1)
  expect(headCommit(s)?.label).toBe('Özellik 1') // local unchanged yet
  const pulled = pull(s)
  expect(pulled.remoteExtra).toHaveLength(0)
  expect(headCommit(pulled)?.label).toBe('Arkadaşın işi')
  expect(pulled.pushedIds).toContain(headCommit(pulled)?.id)
})
```

- [ ] **Step 3: Kırmızı gör** — Run: `npx vitest run tests/model.test.ts -t "teammate push"` → FAIL.

- [ ] **Step 4: Implement**

```ts
export function remoteMainTip(s: ModelState): Commit | null {
  if (s.remoteExtra.length) return s.remoteExtra[s.remoteExtra.length - 1]
  const pushedMain = s.commits.filter((c) => c.branch === 'main' && s.pushedIds.includes(c.id))
  return pushedMain.length ? pushedMain[pushedMain.length - 1] : null
}

export function teammatePush(s: ModelState, label = 'Arkadaşın değişikliği'): ModelState {
  const base = remoteMainTip(s)
  if (!base) return s
  const maxX = Math.max(0, ...s.commits.map((c) => c.x), ...s.remoteExtra.map((c) => c.x))
  const look: AppLook = { ...base.look, theme: (base.look.theme + 1) % THEME_COUNT }
  const c: Commit = { id: `r${s.counter + 1}`, label, branch: 'main', laneIdx: 0, parentId: base.id, x: maxX + 1, look, isMerge: false }
  return { ...s, remoteExtra: [...s.remoteExtra, c], counter: s.counter + 1, lastEvent: '👥 Takım arkadaşın main’e push’ladı — senin local’in geride.' }
}

// FF only: local main not advanced past the teammate's base.
export function pull(s: ModelState): ModelState {
  if (!s.remoteExtra.length) return s
  const localMainTip = tip(s, 'main')
  const base = s.remoteExtra[0].parentId
  if (localMainTip && localMainTip.id !== base) return s // diverged pull out of scope; merge teaches conflict
  const brought = s.remoteExtra
  const onMain = s.currentBranch === 'main'
  const newTip = brought[brought.length - 1]
  return {
    ...s,
    commits: [...s.commits, ...brought],
    remoteExtra: [],
    pushedIds: [...new Set([...s.pushedIds, ...brought.map((c) => c.id)])],
    headId: onMain ? newTip.id : s.headId,
    workLook: onMain ? { ...newTip.look } : s.workLook,
    lastEvent: `☁️ Pull tamam — arkadaşının ${brought.length} commit’i artık sende.`,
  }
}
```

- [ ] **Step 5: Yeşil** — Run: `npx vitest run tests/model.test.ts`. `restoreFromCloud` remoteExtra'yı sıfırlamalı: içine `remoteExtra: []` ekle (bilgisayar çökünce çekilmemiş remote de gider… hayır — remote GitHub'da kalır; ama local restore sonrası temiz başlasın: `remoteExtra: []`). Ek test:

```ts
it('pull is a no-op with nothing on the remote', () => {
  const s = push(seeded())
  expect(pull(s)).toBe(s)
})
```

- [ ] **Step 6: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "feat(model): teammate push + pull (fast-forward)"
```

### Task 8: Divergence → çakışma → çözüm

**Files:**
- Modify: `src/model.ts` (`ModelState.merging`, `mergeBranch` divergence tespiti, yeni `resolveConflict`)
- Test: `tests/model.test.ts`

**Interfaces:**
- Produces:
  - `ModelState.merging: { from: string; into: string } | null`
  - `mergeBranch` — hedef fork'tan sonra ilerlediyse VE iki taraf da temayı farklı değiştirdiyse `merging` set eder (commit atmaz).
  - `resolveConflict(s, choice: 'ours' | 'theirs' | 'both'): ModelState` — merge commit'i seçilen look ile tamamlar.
  - `conflictsBetween(fork, ours, theirs): boolean` (iç yardımcı).

- [ ] **Step 1: `merging: null` alanı** — `ModelState` + `initialModel`.

- [ ] **Step 2: Failing test — ıraksamış merge çakışır, çözülür**

```ts
it('merge conflicts when both sides changed the theme since the fork; resolve completes it', () => {
  let s = createBranch(seeded(), 'a')            // fork at Özellik 1
  s = commit(aiRedesign(s), 'A tasarım')         // branch changes theme
  s = switchBranch(s, 'main')
  s = commit(aiRedesign(s), 'Main tasarım')      // main also changes theme -> diverged + both theme
  s = switchBranch(s, 'a')
  const attempted = mergeBranch(s)
  expect(attempted.merging).toEqual({ from: 'a', into: 'main' })
  expect(attempted.commits.some((c) => c.isMerge)).toBe(false) // not merged yet
  const done = resolveConflict(attempted, 'theirs')
  expect(done.merging).toBeNull()
  expect(headCommit(done)?.isMerge).toBe(true)
  expect(done.branches).toEqual([])
})

it('non-overlapping divergence auto-merges without a conflict', () => {
  let s = createBranch(seeded(), 'a')
  s = commit(aiImprove(s), 'A içerik')           // branch changes blocks, not theme
  s = switchBranch(s, 'main')
  s = commit(aiRedesign(s), 'Main tasarım')      // main changes theme
  s = switchBranch(s, 'a')
  const merged = mergeBranch(s)
  expect(merged.merging).toBeNull()
  expect(headCommit(merged)?.isMerge).toBe(true)
})
```

- [ ] **Step 3: Kırmızı gör** — Run: `npx vitest run tests/model.test.ts -t "conflict"` → FAIL.

- [ ] **Step 4: Implement divergence + conflict**

`mergeBranch` içine, `own`/`parentTip` hesaplandıktan sonra, merge commit'ten ÖNCE:

```ts
const fork = find(s, branch.forkId)
const diverged = !!parentTip && !!fork && parentTip.id !== fork.id
if (diverged && fork && conflictsBetween(fork.look, branchTip.look, parentTip!.look)) {
  return { ...s, currentBranch: name, merging: { from: name, into: parent }, lastEvent: `⚠️ Çakışma: “${name}” ile “${parent}” aynı yeri değiştirmiş. Çöz.` }
}
```

Yardımcı + çözüm:

```ts
function conflictsBetween(base: AppLook, ours: AppLook, theirs: AppLook): boolean {
  return ours.theme !== base.theme && theirs.theme !== base.theme && ours.theme !== theirs.theme
}

export function resolveConflict(s: ModelState, choice: 'ours' | 'theirs' | 'both'): ModelState {
  if (!s.merging) return s
  const { from, into } = s.merging
  const own = branchCommits(s, from)
  const branchTip = own[own.length - 1]
  const parentTip = tip(s, into)
  const parentLane = into === 'main' ? 0 : (s.branches.find((b) => b.name === into)?.laneIdx ?? 0)
  // ours = keep parent's look; theirs = keep branch's look; both = branch theme + max blocks
  const look: AppLook =
    choice === 'ours' ? { ...parentTip!.look }
    : choice === 'theirs' ? { ...branchTip.look }
    : { theme: branchTip.look.theme, blocks: Math.max(branchTip.look.blocks, parentTip!.look.blocks), broken: false }
  const withHead = { ...s, currentBranch: into, headId: parentTip?.id ?? null, merging: null }
  const merged = addCommit(withHead, `Merge: ${from}`, into, parentLane, parentTip?.id ?? null, look, true, branchTip.id)
  return {
    ...merged,
    branches: s.branches.filter((b) => b.name !== from),
    currentBranch: into,
    pr: s.pr?.from === from ? { ...s.pr, status: 'merged' } : s.pr,
    lastEvent: `✅ Çakışma çözüldü — “${from}” “${into}” ile birleşti.`,
  }
}
```

- [ ] **Step 5: Yeşil** — Run: `npx vitest run tests/model.test.ts`. Mevcut temiz-merge testleri (fork == parentTip, diverged=false) hâlâ çakışmasız merge etmeli.

- [ ] **Step 6: Commit**

```bash
git add src/model.ts tests/model.test.ts
git commit -m "feat(model): divergent merge conflict + resolve"
```

### Task 9: Remote commit + çakışma işareti sahnede

**Files:**
- Modify: `src/Scene.tsx` (`GitHubSide` remote çizimi, kök `Scene` çakışma katmanı)

**Interfaces:**
- Consumes: `state.remoteExtra`, `state.merging`.

- [ ] **Step 1: GitHub tarafına remote commit'leri çiz** — `GitHubSide`'da `cloudCommits = [...pushed, ...state.remoteExtra]` yap; `remoteExtra` düğümleri farklı bir kenarlıkla ("👥 arkadaşın") işaretle (küçük etiket ya da kesikli halka), böylece "senin local'inde yok" hissi verilsin.

- [ ] **Step 2: Çakışma katmanı** — `state.merging` doluysa bilgisayar panelinde iki uç (from tip, into tip) arasına kırmızı ⚡ "çakışma" işareti + kısa etiket çiz.

- [ ] **Step 3: Doğrula** — teammatePush sonrası GitHub'da arkadaş commit'i görünür; ıraksak merge denemesinde kırmızı çakışma işareti çıkar. Ekran görüntüsü.

- [ ] **Step 4: Commit**

```bash
git add src/Scene.tsx
git commit -m "feat(canvas): remote teammate commits + conflict marker"
```

### Task 10: Sandbox butonları — takım / pull / çözüm

**Files:**
- Modify: `src/App.tsx` (`sandboxActions`)

**Interfaces:**
- Consumes: `teammatePush`, `pull`, `resolveConflict`, `remoteMainTip`, `remoteExtra`, `merging`.

- [ ] **Step 1: Çakışma modunda ray'ı çözüm butonlarına indir** — `s.merging` doluysa `sandboxActions` sadece üç çözüm butonu döndürür: "🅐 Benimkini tut (ours)", "🅑 Onunkini tut (theirs)", "🔀 İkisini birleştir (both)", her biri `resolveConflict(m, choice)`; `cmd` sırasıyla `git checkout --ours .`, `git checkout --theirs .`, elle birleştir + `git add`.

- [ ] **Step 2: Normal modda iki buton ekle**
  - "👥 Takım arkadaşı push’lasın" → `teammatePush`, `disabled` repo yoksa.
  - "☁️ Çek (pull)" → `pull`, `disabled: pull(s) === s`, `cmd: 'git pull'`.

- [ ] **Step 3: Doğrula** — sandbox: teammate push → pull; sonra ıraksak merge → üç çözüm butonu → merge commit. Ekran görüntüsü. Commit:

```bash
git add src/App.tsx
git commit -m "feat(sandbox): teammate push, pull, conflict resolution buttons"
```

### Task 11: Yeni rehber bölümleri

**Files:**
- Modify: `src/chapters.ts` (`CHAPTERS`, `STEPS`)

**Interfaces:**
- Consumes: `createBranch`, `teammatePush`, `pull`, `mergeBranch`, `resolveConflict`, `pipe`.

- [ ] **Step 1: CHAPTERS'a iki başlık ekle** — mevcut "Pull Request" ile "Özet" arasına: `'Takım & pull'`, `'Çakışma & çözüm'` (chapter index'leri kaydığı için "Özet" son kalır; `summary.chapter` güncelle).

- [ ] **Step 2: "Takım & pull" adımları** — senaryo: repo push'lu → "👥 arkadaşın push’ladı" (`teammatePush`) → "senin local’in geride" → "Çek (pull)" (`pull`) → "artık sende". Her adım tek net cümle, gerçek `cmd`.

- [ ] **Step 3: "Çakışma & çözüm" adımları** — senaryo: branch aç → branch'te tasarımı değiştir (`aiRedesign`+commit) → main'e geç, main'de de tasarımı değiştir (arkadaş/pull ya da doğrudan commit) → branch'e dön, merge dene → çakışma → üç seçenekten biriyle çöz (`resolveConflict`). Karar adımı `branch-choice` gibi çok-butonlu.

- [ ] **Step 4: Adım id/next zincirini bağla** — `pr-done` → yeni ilk bölüm; son yeni bölüm → `summary`. `stepIndexById` zinciri kopmasın.

- [ ] **Step 5: Doğrula** — rehberi baştan sona tıkla; yeni bölümler akıyor, progress noktaları doğru, canvas doğru tepki veriyor. `npm run build` temiz. Ekran görüntüsü.

- [ ] **Step 6: Commit**

```bash
git add src/chapters.ts
git commit -m "feat(guide): add teammate/pull and conflict/resolve chapters"
```

### Task 12: Cilalama + tam doğrulama

- [ ] **Step 1:** `npm run build`, `npx vitest run`, `npx oxlint` — hepsi temiz.
- [ ] **Step 2:** Rehber baştan sona + sandbox'ta yeni akışların tümü el ile preview'de denenir (branch'tan branch, pull, çakışma çözümü, laptop çökme + restore çakışma/remote ile). Ekran görüntüleriyle kanıt.
- [ ] **Step 3:** `superpowers:requesting-code-review` ile diff'i gözden geçir; bulguları uygula.
- [ ] **Step 4:** README/plan durumunu güncelle, commit.

---

## Self-Review

**Spec coverage:**
- Sol ray iki modda ✓ (Task 1). Büyük canvas + gerçek zoom ✓ (Task 1 tam yükseklik + Task 2 aralık/ferahlık). Tek geniş canvas + birlikte zoom ✓ (mevcut shared zoom korunur).
- Branch'tan branch ✓ (Task 3-6). Merge parent'a ✓ (Task 4). Nested çizim ✓ (Task 5).
- Takım arkadaşı + pull ✓ (Task 7). Divergence + çakışma + çözüm ✓ (Task 8). Görsel ✓ (Task 9). Sandbox ✓ (Task 10). Rehber bölümleri ✓ (Task 11).

**Type consistency:** `Branch.parent` (Task 3) → `parentLaneIdx` (Task 3) → Scene (Task 5) ve `mergeBranch` (Task 4). `remoteExtra`/`remoteMainTip` (Task 7) → Scene (Task 9)/App (Task 10). `merging`/`resolveConflict('ours'|'theirs'|'both')` (Task 8) → App (Task 10). İsimler tutarlı.

**Riskler:** (1) `restoreFromCloud` ve `switchBranch` `merging`/`remoteExtra` durumunu bozmamalı — Task 7/8'de `initialModel`'e alan eklenince `...s` yayılımı korur; laptop restore `remoteExtra: []` ve `merging: null` set eder. (2) Lane 4 için `laneY` formülü (`Scene.tsx:15`) 4. lane'i desteklemeli — Task 5'te kontrol et; gerekiyorsa formülü genişlet. (3) Çakışma varken diğer aksiyonlar kilitli olmalı (Task 10 Step 1 ray'ı çözüme indirir).
