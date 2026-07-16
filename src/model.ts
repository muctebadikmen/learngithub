// Display-state for the scene. NOT a git model — just enough state to draw
// the picture: save points on lanes, a pointer, a cloud mirror, a few flags.

export type Lane = 'main' | 'branch'

export type AppLook = {
  theme: number // index into the mockup color themes
  blocks: number // how many feature rows the app mockup shows
  broken: boolean
}

export type Commit = {
  id: string
  label: string
  lane: Lane
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
  branchName: string | null
  branchFromId: string | null // fork commit of the currently open branch
  currentLane: Lane
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

export function initialModel(): ModelState {
  return {
    hasRepo: false,
    commits: [],
    branchName: null,
    branchFromId: null,
    currentLane: 'main',
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

export function laneTip(s: ModelState, lane: Lane): Commit | null {
  const inLane = s.commits.filter((c) => c.lane === lane)
  return inLane.length ? inLane[inLane.length - 1] : null
}

// Commits of the branch that is currently open (older, already-merged branch
// arcs stay on the lane as history but don't belong to the open branch).
export function currentBranchCommits(s: ModelState): Commit[] {
  const fork = find(s, s.branchFromId)
  if (!fork) return []
  return s.commits.filter((c) => c.lane === 'branch' && c.x > fork.x)
}

function nextX(s: ModelState): number {
  return s.commits.length ? Math.max(...s.commits.map((c) => c.x)) + 1 : 0
}

// Commits on the head's lane that come after the head (reachable only by
// going forward). Drawn dimmed; dropped when a new commit is made.
export function abandonedIds(s: ModelState): string[] {
  const head = headCommit(s)
  if (!head) return []
  const ids: string[] = []
  let tip = laneTip(s, head.lane)
  while (tip && tip.id !== head.id) {
    ids.push(tip.id)
    tip = find(s, tip.parentId)
  }
  return tip ? ids : []
}

function addCommit(s: ModelState, label: string, lane: Lane, parentId: string | null, look: AppLook, isMerge = false, mergeFromId?: string): ModelState {
  const abandoned = new Set(abandonedIds(s))
  const commits = s.commits.filter((c) => !abandoned.has(c.id))
  const id = `c${s.counter + 1}`
  const commit: Commit = { id, label, lane, parentId, x: nextX(s), look: { ...look }, isMerge, mergeFromId }
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
  return { ...addCommit(withRepo, 'Başlangıç', 'main', null, s.workLook), lastEvent: 'Repo hazır — ilk kayıt noktası atıldı.' }
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
  return { ...addCommit(s, label, s.currentLane, s.headId, s.workLook), lastEvent: `Kayıt noktası: “${label}”` }
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
  if (parent.lane !== head.lane && !head.isMerge) return s
  return { ...s, headId: parent.id, workLook: { ...parent.look }, dirty: false, lastEvent: `“${parent.label}” commit'ine geri dönüldü.` }
}

export function createBranch(s: ModelState, name = 'deneme'): ModelState {
  if (!s.hasRepo || s.branchName || s.currentLane !== 'main' || !s.headId) return s
  return {
    ...s,
    branchName: name,
    branchFromId: s.headId,
    currentLane: 'branch',
    pr: null, // a finished PR belongs to the previous branch; clear the card
    lastEvent: `“${name}” branch'i açıldı — main artık güvende.`,
  }
}

export function switchLane(s: ModelState): ModelState {
  if (!s.branchName) return s
  const target: Lane = s.currentLane === 'main' ? 'branch' : 'main'
  const branch = currentBranchCommits(s)
  const tip = target === 'branch' ? (branch[branch.length - 1] ?? find(s, s.branchFromId)) : laneTip(s, 'main')
  if (!tip) return s
  return {
    ...s,
    currentLane: target,
    headId: tip.id,
    workLook: { ...tip.look },
    dirty: false,
    lastEvent: target === 'branch' ? `“${s.branchName}” branch'ine geçildi.` : "main'e geçildi.",
  }
}

export function mergeBranch(s: ModelState): ModelState {
  const branch = currentBranchCommits(s)
  const branchTip = branch[branch.length - 1]
  if (!s.branchName || !branchTip) return s
  const mainTip = laneTip(s, 'main')
  const merged = addCommit(
    { ...s, currentLane: 'main', headId: mainTip?.id ?? null },
    `Merge: ${s.branchName}`,
    'main',
    mainTip?.id ?? null,
    branchTip.look,
    true,
    branchTip.id,
  )
  return {
    ...merged,
    branchName: null,
    branchFromId: null,
    currentLane: 'main',
    pr: s.pr ? { ...s.pr, status: 'merged' } : null,
    lastEvent: `“${s.branchName}” main'e katıldı.`,
  }
}

export function deleteBranch(s: ModelState): ModelState {
  if (!s.branchName) return s
  const doomed = new Set(currentBranchCommits(s).map((c) => c.id))
  const mainTip = laneTip(s, 'main')
  return {
    ...s,
    commits: s.commits.filter((c) => !doomed.has(c.id)),
    pushedIds: s.pushedIds.filter((id) => !doomed.has(id)),
    branchName: null,
    branchFromId: null,
    currentLane: 'main',
    headId: mainTip?.id ?? null,
    workLook: mainTip ? { ...mainTip.look } : s.workLook,
    dirty: false,
    pr: null,
    lastEvent: "Branch silindi — main'e hiçbir şey olmadı.",
  }
}

export function push(s: ModelState): ModelState {
  if (!s.hasRepo) return s
  const abandoned = new Set(abandonedIds(s)) // a stepped-past mistake never reaches GitHub
  const reachable = s.commits.filter((c) => !abandoned.has(c.id))
  const fresh = reachable.filter((c) => !s.pushedIds.includes(c.id)).length
  if (!fresh) return s
  return { ...s, pushedIds: reachable.map((c) => c.id), lastEvent: `${fresh} commit GitHub'a yüklendi.` }
}

export function laptopDie(s: ModelState): ModelState {
  return { ...s, laptopDead: true, lastEvent: 'Bilgisayar çöktü.' }
}

export function restoreFromCloud(s: ModelState): ModelState {
  if (!s.laptopDead) return s
  const kept = s.commits.filter((c) => s.pushedIds.includes(c.id))
  const tip = kept.length ? kept[kept.length - 1] : null
  return {
    ...s,
    laptopDead: false,
    commits: kept,
    headId: tip?.id ?? null,
    workLook: tip ? { ...tip.look } : { theme: 0, blocks: 1, broken: false },
    dirty: false,
    lastEvent: tip ? "Proje GitHub'dan geri indirildi — hiçbir şey kaybolmadı." : 'GitHub boştu… push’lamadığın her şey gitti.',
  }
}

export function openPR(s: ModelState): ModelState {
  if (!s.branchName || !currentBranchCommits(s).length || s.pr) return s
  return { ...s, pr: { status: 'open', from: s.branchName }, lastEvent: 'Pull Request açıldı — değişiklikler incelemede.' }
}

export function approvePR(s: ModelState): ModelState {
  if (s.pr?.status !== 'open') return s
  return { ...s, pr: { ...s.pr, status: 'approved' }, lastEvent: 'Pull Request onaylandı.' }
}
