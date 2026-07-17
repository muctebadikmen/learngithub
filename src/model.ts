// Display-state for the scene. NOT a git model — just enough state to draw
// the picture: save points on lanes, a pointer, a cloud mirror, a few flags.

export type AppLook = {
  theme: number // index into the mockup color themes
  blocks: number // how many feature rows the app mockup shows
  broken: boolean
}

export type Branch = { name: string; forkId: string; laneIdx: number } // laneIdx ∈ 1..3

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
}

export const THEME_COUNT = 5
export const MAX_BLOCKS = 5

export const DEFAULT_BRANCH_NAMES = ['deneme', 'tasarim', 'ozellik']

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
  if (!s.hasRepo || s.currentBranch !== 'main' || s.branches.length >= 3 || !s.headId) return s
  const activeNames = new Set(s.branches.map((b) => b.name))
  const resolvedName = name ?? DEFAULT_BRANCH_NAMES.find((n) => !activeNames.has(n))
  if (!resolvedName || resolvedName === 'main' || activeNames.has(resolvedName)) return s
  const usedLanes = new Set(s.branches.map((b) => b.laneIdx))
  const laneIdx = [1, 2, 3].find((i) => !usedLanes.has(i))
  if (!laneIdx) return s
  const branch: Branch = { name: resolvedName, forkId: s.headId, laneIdx }
  return {
    ...s,
    branches: [...s.branches, branch],
    currentBranch: resolvedName,
    pr: s.pr?.status === 'merged' ? null : s.pr, // a finished PR belongs to the previous branch; clear the card
    lastEvent: `“${resolvedName}” branch'i açıldı — main artık güvende.`,
  }
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

export function mergeBranch(s: ModelState): ModelState {
  if (s.currentBranch === 'main') return s
  const mergedName = s.currentBranch
  const own = branchCommits(s, mergedName)
  if (!own.length) return s
  const branchTip = own[own.length - 1]
  const mainTip = tip(s, 'main')
  const withHead = { ...s, currentBranch: 'main', headId: mainTip?.id ?? null }
  const merged = addCommit(withHead, `Merge: ${mergedName}`, 'main', 0, mainTip?.id ?? null, branchTip.look, true, branchTip.id)
  return {
    ...merged,
    branches: s.branches.filter((b) => b.name !== mergedName),
    currentBranch: 'main',
    pr: s.pr?.from === mergedName ? { ...s.pr, status: 'merged' } : s.pr,
    lastEvent: `“${mergedName}” main'e katıldı.`,
  }
}

export function deleteBranch(s: ModelState): ModelState {
  if (s.currentBranch === 'main') return s
  const name = s.currentBranch
  const doomed = new Set(branchCommits(s, name).map((c) => c.id))
  const mainTip = tip(s, 'main')
  return {
    ...s,
    commits: s.commits.filter((c) => !doomed.has(c.id)),
    pushedIds: s.pushedIds.filter((id) => !doomed.has(id)),
    branches: s.branches.filter((b) => b.name !== name),
    currentBranch: 'main',
    headId: mainTip?.id ?? null,
    workLook: mainTip ? { ...mainTip.look } : s.workLook,
    dirty: false,
    pr: s.pr?.from === name ? null : s.pr,
    lastEvent: `“${name}” branch'i silindi — main'e hiçbir şey olmadı.`,
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
// Branches only ever fork off main, so this only ever protects main commits;
// a branch's own forward commits are never in another branch's abandoned
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
