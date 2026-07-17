// Display-state for the scene. NOT a git model — just enough state to draw
// the picture: save points on lanes, a pointer, a cloud mirror, a few flags.

export type AppLook = {
  theme: number // index into the mockup color themes
  blocks: number // how many feature rows the app mockup shows
  broken: boolean
}

export type Branch = { name: string; forkId: string; laneIdx: number; parent: string } // laneIdx ∈ 1..4; parent = 'main' or the branch it forked from

export type Commit = {
  id: string
  label: string
  branch: string // 'main' or the branch name it was created on
  laneIdx: number // 0 for main, else the creating branch's laneIdx — stored forever
  parentId: string | null
  x: number // slot on the timeline, assigned at creation, never changes
  look: AppLook
  isMerge: boolean
  mergeFromId?: string // for a merge commit: the branch tip it merged in
}

export type PR = { status: 'open' | 'approved' | 'merged'; from: string }

export type ModelState = {
  hasRepo: boolean
  commits: Commit[]
  branches: Branch[] // active side branches (max 3)
  currentBranch: string // 'main' or an active branch name
  headId: string | null
  workLook: AppLook // how the app looks right now (possibly uncommitted)
  dirty: boolean
  pushedIds: string[]
  laptopDead: boolean
  pr: PR | null
  counter: number
  lastEvent: string | null
  remoteExtra: Commit[] // commits a teammate pushed to GitHub that local hasn't pulled yet
  merging: { from: string; into: string } | null // a merge blocked on an unresolved conflict
}

export const THEME_COUNT = 5
export const MAX_BLOCKS = 5
export const MAX_BRANCHES = 4

export const DEFAULT_BRANCH_NAMES = ['deneme', 'tasarim', 'ozellik', 'yenilik']

export function initialModel(): ModelState {
  return {
    hasRepo: false,
    commits: [],
    branches: [],
    currentBranch: 'main',
    headId: null,
    workLook: { theme: 0, blocks: 1, broken: false },
    dirty: false,
    pushedIds: [],
    laptopDead: false,
    pr: null,
    counter: 0,
    lastEvent: null,
    remoteExtra: [],
    merging: null,
  }
}

const find = (s: ModelState, id: string | null) => s.commits.find((c) => c.id === id) ?? null

export function headCommit(s: ModelState): Commit | null {
  return find(s, s.headId)
}

// Last commit of `name`'s CURRENT lifetime (a merged branch leaves its old
// commits behind under the same name — those must not count when the name is
// reused); for an active branch with no commits yet, its fork commit; null
// when neither exists.
export function tip(s: ModelState, name: string): Commit | null {
  const own = branchCommits(s, name)
  if (own.length) return own[own.length - 1]
  const branch = s.branches.find((b) => b.name === name)
  return branch ? find(s, branch.forkId) : null
}

export function activeBranch(s: ModelState): Branch | null {
  if (s.currentBranch === 'main') return null
  return s.branches.find((b) => b.name === s.currentBranch) ?? null
}

// Commits that belong to the currently-open lifetime of `name` (older,
// already-merged/deleted arcs of a reused lane number don't count). For
// 'main' that's simply every main commit.
export function branchCommits(s: ModelState, name: string): Commit[] {
  if (name === 'main') return s.commits.filter((c) => c.branch === 'main')
  const branch = s.branches.find((b) => b.name === name)
  if (!branch) return []
  const fork = find(s, branch.forkId)
  if (!fork) return []
  return s.commits.filter((c) => c.branch === name && c.x > fork.x)
}

function nextX(s: ModelState): number {
  return s.commits.length ? Math.max(...s.commits.map((c) => c.x)) + 1 : 0
}

// Commits on the head's branch that come after the head (reachable only by
// going forward). Drawn dimmed; dropped when a new commit is made — unless
// an active branch depends on them (see protectedForkAncestors).
export function abandonedIds(s: ModelState): string[] {
  const head = headCommit(s)
  if (!head) return []
  const ids: string[] = []
  let t = tip(s, head.branch)
  while (t && t.id !== head.id) {
    ids.push(t.id)
    t = find(s, t.parentId)
  }
  if (!t) return []
  const protectedIds = protectedForkAncestors(s)
  return ids.filter((id) => !protectedIds.has(id))
}

function addCommit(
  s: ModelState,
  label: string,
  branch: string,
  laneIdx: number,
  parentId: string | null,
  look: AppLook,
  isMerge = false,
  mergeFromId?: string,
): ModelState {
  const abandoned = new Set(abandonedIds(s))
  const commits = s.commits.filter((c) => !abandoned.has(c.id))
  const id = `c${s.counter + 1}`
  const commit: Commit = { id, label, branch, laneIdx, parentId, x: nextX(s), look: { ...look }, isMerge, mergeFromId }
  return {
    ...s,
    commits: [...commits, commit],
    pushedIds: s.pushedIds.filter((p) => !abandoned.has(p)),
    headId: id,
    workLook: { ...look },
    dirty: false,
    counter: s.counter + 1,
  }
}

export function createRepo(s: ModelState): ModelState {
  if (s.hasRepo) return s
  const withRepo = { ...s, hasRepo: true }
  return { ...addCommit(withRepo, 'Başlangıç', 'main', 0, null, s.workLook), lastEvent: 'Repo hazır — ilk kayıt noktası atıldı.' }
}

export function aiImprove(s: ModelState): ModelState {
  const grow = s.workLook.blocks < MAX_BLOCKS
  const workLook: AppLook = {
    theme: grow ? s.workLook.theme : (s.workLook.theme + 1) % THEME_COUNT,
    blocks: grow ? s.workLook.blocks + 1 : s.workLook.blocks,
    broken: false,
  }
  return { ...s, workLook, dirty: true, lastEvent: 'AI yeni bir şey ekledi — henüz kaydedilmedi.' }
}

export function aiRedesign(s: ModelState): ModelState {
  const workLook: AppLook = { ...s.workLook, theme: (s.workLook.theme + 2) % THEME_COUNT, broken: false }
  return { ...s, workLook, dirty: true, lastEvent: 'AI tasarımı değiştirdi — henüz kaydedilmedi.' }
}

export function aiBreak(s: ModelState): ModelState {
  return { ...s, workLook: { ...s.workLook, broken: true }, dirty: true, lastEvent: 'AI uygulamayı bozdu!' }
}

export function commit(s: ModelState, label: string): ModelState {
  if (!s.hasRepo || !s.dirty) return s
  const laneIdx = s.currentBranch === 'main' ? 0 : (activeBranch(s)?.laneIdx ?? 0)
  return { ...addCommit(s, label, s.currentBranch, laneIdx, s.headId, s.workLook), lastEvent: `Kayıt noktası: “${label}”` }
}

// One "geri dön" button, two honest meanings:
// dirty → throw away the uncommitted change; clean → step back one commit.
export function goBack(s: ModelState): ModelState {
  const head = headCommit(s)
  if (!head) return s
  if (s.dirty) {
    return { ...s, workLook: { ...head.look }, dirty: false, lastEvent: 'Kaydedilmemiş değişiklik atıldı — son kayıt noktasına dönüldü.' }
  }
  const parent = find(s, head.parentId)
  if (!parent) return s
  if (parent.branch !== head.branch && !head.isMerge) return s
  return { ...s, headId: parent.id, workLook: { ...parent.look }, dirty: false, lastEvent: `“${parent.label}” commit'ine geri dönüldü.` }
}

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
    pr: s.pr?.status === 'merged' ? null : s.pr, // a finished PR belongs to the previous branch; clear the card
    lastEvent: `“${resolvedName}” branch'i açıldı — “${s.currentBranch}” güvende.`,
  }
}

// Lane of `branchName`'s parent — 0 for main, else the parent branch's own
// lane. Used to draw a nested fork's line off the parent's lane, not main's.
export function parentLaneIdx(s: ModelState, branchName: string): number {
  const b = s.branches.find((x) => x.name === branchName)
  if (!b || b.parent === 'main') return 0
  return s.branches.find((x) => x.name === b.parent)?.laneIdx ?? 0
}

export function switchBranch(s: ModelState, name: string): ModelState {
  if (name !== 'main' && !s.branches.some((b) => b.name === name)) return s
  const target = tip(s, name)
  if (!target) return s
  const wasDirty = s.dirty
  return {
    ...s,
    currentBranch: name,
    headId: target.id,
    workLook: { ...target.look },
    dirty: false,
    lastEvent: `“${name}” hattına geçildi.${wasDirty ? ' (kaydedilmemiş değişiklik atıldı)' : ''}`,
  }
}

// A branch with a live child forked off it can't be merged or deleted yet —
// that would orphan the child's parent lane and its fork ancestry story.
function hasActiveChild(s: ModelState, name: string): boolean {
  return s.branches.some((b) => b.parent === name)
}

// Real conflict only when BOTH sides changed the same thing (the theme) away
// from the shared fork, and landed on different values. If only one side
// touched the theme — or both touched different things — there's nothing to
// fight over and the merge auto-resolves.
function conflictsBetween(base: AppLook, ours: AppLook, theirs: AppLook): boolean {
  return ours.theme !== base.theme && theirs.theme !== base.theme && ours.theme !== theirs.theme
}

// Shared tail of a merge, clean or conflict-resolved: drop a merge commit on
// `into` with the chosen `look`, retire the `from` branch, close out its PR.
function completeMerge(s: ModelState, from: string, into: string, look: AppLook): ModelState {
  const parentTip = tip(s, into)
  const parentLane = into === 'main' ? 0 : (s.branches.find((b) => b.name === into)?.laneIdx ?? 0)
  const branchTip = branchCommits(s, from).slice(-1)[0]
  const withHead = { ...s, currentBranch: into, headId: parentTip?.id ?? null, merging: null }
  const merged = addCommit(withHead, `Merge: ${from}`, into, parentLane, parentTip?.id ?? null, look, true, branchTip.id)
  return {
    ...merged,
    branches: s.branches.filter((b) => b.name !== from),
    currentBranch: into,
    pr: s.pr?.from === from ? { ...s.pr, status: 'merged' } : s.pr,
  }
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
  const fork = find(s, branch.forkId)
  const diverged = !!parentTip && !!fork && parentTip.id !== fork.id
  if (diverged && fork && conflictsBetween(fork.look, branchTip.look, parentTip!.look)) {
    return {
      ...s,
      currentBranch: name,
      merging: { from: name, into: parent },
      lastEvent: `⚠️ Çakışma: “${name}” ile “${parent}” aynı yeri değiştirmiş. Çöz.`,
    }
  }
  return { ...completeMerge(s, name, parent, branchTip.look), lastEvent: `“${name}”, “${parent}” ile birleşti.` }
}

// Finish a conflicted merge with the chosen resolution: 'ours' keeps the
// PARENT's look (git convention — "ours" is the branch you merge INTO),
// 'theirs' keeps the incoming branch's look, 'both' takes the branch's theme
// plus the larger block count from either side.
export function resolveConflict(s: ModelState, choice: 'ours' | 'theirs' | 'both'): ModelState {
  if (!s.merging) return s
  const { from, into } = s.merging
  const own = branchCommits(s, from)
  const branchTip = own[own.length - 1]
  const parentTip = tip(s, into)
  const look: AppLook =
    choice === 'ours'
      ? { ...parentTip!.look }
      : choice === 'theirs'
        ? { ...branchTip.look }
        : { theme: branchTip.look.theme, blocks: Math.max(branchTip.look.blocks, parentTip!.look.blocks), broken: false }
  return { ...completeMerge(s, from, into, look), lastEvent: `✅ Çakışma çözüldü — “${from}”, “${into}” ile birleşti.` }
}

export function deleteBranch(s: ModelState): ModelState {
  if (s.currentBranch === 'main') return s
  if (hasActiveChild(s, s.currentBranch)) return s
  const name = s.currentBranch
  const branch = s.branches.find((b) => b.name === name)!
  const parent = branch.parent
  const doomed = new Set(branchCommits(s, name).map((c) => c.id))
  const parentTip = tip(s, parent)
  return {
    ...s,
    commits: s.commits.filter((c) => !doomed.has(c.id)),
    pushedIds: s.pushedIds.filter((id) => !doomed.has(id)),
    branches: s.branches.filter((b) => b.name !== name),
    currentBranch: parent,
    headId: parentTip?.id ?? null,
    workLook: parentTip ? { ...parentTip.look } : s.workLook,
    dirty: false,
    pr: s.pr?.from === name ? null : s.pr,
    lastEvent: `“${name}” silindi — “${parent}” olduğu gibi duruyor.`,
  }
}

// Reachable set from a commit: walk the parent chain, and through merge
// commits, also walk the merged-in branch's chain.
function reachableFrom(s: ModelState, startId: string | null): Set<string> {
  const ids = new Set<string>()
  const stack: string[] = startId ? [startId] : []
  while (stack.length) {
    const id = stack.pop()!
    if (ids.has(id)) continue
    const c = find(s, id)
    if (!c) continue
    ids.add(id)
    if (c.parentId) stack.push(c.parentId)
    if (c.mergeFromId) stack.push(c.mergeFromId)
  }
  return ids
}

// Every active branch's fork commit and all its ancestors. A branch's fork
// is its dependency anchor — tip() falls back to it when the branch has no
// commits of its own yet, so dropping it as "abandoned" would orphan the
// branch forever (it could never be switched to, merged, or deleted).
// A branch can fork off any branch now, not just main — this protects
// whichever commit each active branch depends on, wherever it lives.
// A branch's own forward commits are never in another branch's abandoned
// list and are free to be dropped by its own goBack+commit (unaffected here).
function protectedForkAncestors(s: ModelState): Set<string> {
  const ids = new Set<string>()
  for (const b of s.branches) {
    for (const id of reachableFrom(s, b.forkId)) ids.add(id)
  }
  return ids
}

export function push(s: ModelState): ModelState {
  if (!s.hasRepo || !s.headId) return s
  const abandoned = new Set(abandonedIds(s))
  const reachable = [...reachableFrom(s, s.headId)].filter((id) => !abandoned.has(id))
  const fresh = reachable.filter((id) => !s.pushedIds.includes(id))
  if (!fresh.length) return s
  return {
    ...s,
    pushedIds: [...new Set([...s.pushedIds, ...reachable])],
    lastEvent: `“${s.currentBranch}” push'landı — ${fresh.length} yeni commit GitHub'da.`,
  }
}

// GitHub's main tip: a teammate's not-yet-pulled commit if there is one,
// otherwise the last main commit local has actually pushed.
export function remoteMainTip(s: ModelState): Commit | null {
  if (s.remoteExtra.length) return s.remoteExtra[s.remoteExtra.length - 1]
  const pushedMain = s.commits.filter((c) => c.branch === 'main' && s.pushedIds.includes(c.id))
  return pushedMain.length ? pushedMain[pushedMain.length - 1] : null
}

// A teammate commits straight to GitHub's main — local doesn't see it until pull().
export function teammatePush(s: ModelState, label = 'Arkadaşın değişikliği'): ModelState {
  const base = remoteMainTip(s)
  if (!base) return s
  const maxX = Math.max(0, ...s.commits.map((c) => c.x), ...s.remoteExtra.map((c) => c.x))
  const look: AppLook = { ...base.look, theme: (base.look.theme + 1) % THEME_COUNT }
  const c: Commit = { id: `r${s.counter + 1}`, label, branch: 'main', laneIdx: 0, parentId: base.id, x: maxX + 1, look, isMerge: false }
  return { ...s, remoteExtra: [...s.remoteExtra, c], counter: s.counter + 1, lastEvent: '👥 Takım arkadaşın main’e push’ladı — senin local’in geride.' }
}

// Fast-forward only: if local main has moved past the teammate's base, this
// is a no-op — a real divergence is taught at merge time, not here.
export function pull(s: ModelState): ModelState {
  if (!s.remoteExtra.length) return s
  const localMainTip = tip(s, 'main')
  const base = s.remoteExtra[0].parentId
  if (localMainTip && localMainTip.id !== base) return s
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

export function laptopDie(s: ModelState): ModelState {
  return { ...s, laptopDead: true, lastEvent: 'Bilgisayar çöktü.' }
}

export function restoreFromCloud(s: ModelState): ModelState {
  if (!s.laptopDead) return s
  const kept = s.commits.filter((c) => s.pushedIds.includes(c.id))
  // A branch survives only if its CURRENT lifetime has a pushed commit —
  // pushed commits left behind by an older merged branch of the same name
  // don't count.
  const keptBranches = s.branches.filter((b) => branchCommits(s, b.name).some((c) => s.pushedIds.includes(c.id)))
  const mainKept = kept.filter((c) => c.branch === 'main')
  const t = mainKept.length ? mainKept[mainKept.length - 1] : null
  return {
    ...s,
    laptopDead: false,
    commits: kept,
    branches: keptBranches,
    currentBranch: 'main',
    headId: t?.id ?? null,
    workLook: t ? { ...t.look } : { theme: 0, blocks: 1, broken: false },
    dirty: false,
    remoteExtra: [],
    merging: null,
    lastEvent: t ? "Proje GitHub'dan geri indirildi — hiçbir şey kaybolmadı." : 'GitHub boştu… push’lamadığın her şey gitti.',
  }
}

export function openPR(s: ModelState): ModelState {
  if (s.currentBranch === 'main') return s
  const own = branchCommits(s, s.currentBranch)
  if (!own.length) return s
  if (!own.every((c) => s.pushedIds.includes(c.id))) return s
  if (s.pr && s.pr.status !== 'merged') return s
  return { ...s, pr: { status: 'open', from: s.currentBranch }, lastEvent: 'Pull Request açıldı — değişiklikler incelemede.' }
}

export function approvePR(s: ModelState): ModelState {
  if (s.pr?.status !== 'open') return s
  return { ...s, pr: { ...s.pr, status: 'approved' }, lastEvent: 'Pull Request onaylandı.' }
}
