import { describe, expect, it } from 'vitest'
import {
  abandonedIds,
  aiBreak,
  aiImprove,
  aiRedesign,
  approvePR,
  branchCommits,
  commit,
  createBranch,
  createRepo,
  deleteBranch,
  goBack,
  headCommit,
  initialModel,
  laptopDie,
  mergeBranch,
  openPR,
  push,
  restoreFromCloud,
  switchBranch,
  tip,
  type ModelState,
} from '../src/model'

const seeded = (): ModelState => commit(aiImprove(createRepo(initialModel())), 'Özellik 1')

describe('model', () => {
  it('createRepo makes the first commit and is idempotent', () => {
    const s = createRepo(initialModel())
    expect(s.hasRepo).toBe(true)
    expect(s.commits).toHaveLength(1)
    expect(s.headId).toBe(s.commits[0].id)
    expect(createRepo(s).commits).toHaveLength(1)
  })

  it('commit requires dirty work and clears the dirty flag', () => {
    const s = createRepo(initialModel())
    expect(commit(s, 'x')).toBe(s) // nothing to save
    const dirty = aiImprove(s)
    const done = commit(dirty, 'Özellik 1')
    expect(done.commits).toHaveLength(2)
    expect(done.dirty).toBe(false)
    expect(headCommit(done)?.label).toBe('Özellik 1')
  })

  it('goBack discards dirty work first, then steps back a commit', () => {
    const s = seeded()
    const broken = aiBreak(s)
    const discarded = goBack(broken)
    expect(discarded.workLook.broken).toBe(false)
    expect(discarded.headId).toBe(s.headId) // pointer did not move

    const stepped = goBack(discarded)
    expect(headCommit(stepped)?.label).toBe('Başlangıç')
  })

  it('committing after goBack drops the abandoned future commits', () => {
    const s = commit(aiBreak(seeded()), 'Bozuk')
    const back = goBack(s)
    expect(back.commits).toHaveLength(3) // broken commit still drawn (dimmed)
    const fixed = commit(aiImprove(back), 'Temiz devam')
    expect(fixed.commits.map((c) => c.label)).toEqual(['Başlangıç', 'Özellik 1', 'Temiz devam'])
  })

  it('push mirrors everything; laptop death only keeps pushed commits', () => {
    const s = push(seeded())
    expect(s.pushedIds).toHaveLength(s.commits.length)

    const more = commit(aiImprove(s), 'Push’lanmamış')
    const revived = restoreFromCloud(laptopDie(more))
    expect(revived.laptopDead).toBe(false)
    expect(revived.commits.map((c) => c.label)).toEqual(['Başlangıç', 'Özellik 1'])
  })

  it('push skips abandoned commits, so a cloud restore is never broken', () => {
    const s = goBack(commit(aiBreak(seeded()), 'Bozuk')) // broken commit abandoned
    const pushed = push(s)
    expect(pushed.pushedIds).toHaveLength(2) // Başlangıç + Özellik 1
    const revived = restoreFromCloud(laptopDie(pushed))
    expect(headCommit(revived)?.label).toBe('Özellik 1')
    expect(revived.workLook.broken).toBe(false)
  })

  it('laptop death with nothing pushed loses everything', () => {
    const revived = restoreFromCloud(laptopDie(seeded()))
    expect(revived.commits).toHaveLength(0)
    expect(revived.workLook.blocks).toBe(1)
  })

  it('openPR/approvePR guard against wrong states', () => {
    const s = seeded()
    expect(openPR(s)).toBe(s) // no branch
    expect(approvePR(s)).toBe(s) // no PR
  })

  // --- branching ---

  it('createBranch guards: needs a repo, must be on main, room for 3, no name clash', () => {
    const s = seeded()
    const noRepo = initialModel()
    expect(createBranch(noRepo)).toBe(noRepo) // no repo
    const a = createBranch(s) // default name
    expect(a.currentBranch).toBe('deneme')
    expect(a.branches).toEqual([{ name: 'deneme', forkId: s.headId, laneIdx: 1 }])
    expect(createBranch(a, 'tasarim')).toBe(a) // not on main anymore
    expect(createBranch(s, 'deneme')).not.toBe(s) // fine, no clash yet
    expect(createBranch(s, 'main')).toBe(s) // reserved name
  })

  it('branch → work → merge lands on main; branch commits survive under the old branch name', () => {
    let s = createBranch(seeded(), 'deneme')
    expect(s.currentBranch).toBe('deneme')
    s = commit(aiImprove(s), 'Deneme işi')
    const merged = mergeBranch(s)
    expect(merged.branches).toEqual([])
    expect(merged.currentBranch).toBe('main')
    expect(headCommit(merged)?.isMerge).toBe(true)
    expect(merged.commits.some((c) => c.branch === 'deneme')).toBe(true)
  })

  it('deleteBranch removes only that branch commits and returns to main tip', () => {
    let s = createBranch(seeded(), 'deneme')
    s = commit(aiImprove(s), 'Deneme işi')
    const dropped = deleteBranch(s)
    expect(dropped.commits.every((c) => c.branch === 'main')).toBe(true)
    expect(dropped.branches).toEqual([])
    expect(headCommit(dropped)?.label).toBe('Özellik 1')
    expect(dropped.workLook.broken).toBe(false)
  })

  it('deleteBranch only removes the current branch, leaving other active branches intact', () => {
    let s = createBranch(seeded(), 'a')
    s = commit(aiImprove(s), 'A1')
    s = switchBranch(s, 'main')
    s = createBranch(s, 'b')
    s = commit(aiImprove(s), 'B1')
    const dropped = deleteBranch(s) // deletes 'b' (current)
    expect(dropped.branches.map((b) => b.name)).toEqual(['a'])
    expect(dropped.commits.some((c) => c.branch === 'a')).toBe(true)
    expect(dropped.commits.some((c) => c.label === 'B1')).toBe(false)
    expect(dropped.currentBranch).toBe('main')
  })

  it('switchBranch moves head between branch tips', () => {
    let s = createBranch(seeded(), 'deneme')
    s = commit(aiImprove(s), 'Deneme işi')
    const onMain = switchBranch(s, 'main')
    expect(onMain.currentBranch).toBe('main')
    expect(headCommit(onMain)?.label).toBe('Özellik 1')
    expect(switchBranch(onMain, 'deneme').currentBranch).toBe('deneme')
  })

  it('switchBranch discards dirty uncommitted work and notes it in the event', () => {
    let s = createBranch(seeded(), 'deneme')
    s = commit(aiImprove(s), 'Deneme işi')
    const dirty = aiImprove(s) // uncommitted change on 'deneme'
    expect(dirty.dirty).toBe(true)
    const switched = switchBranch(dirty, 'main')
    expect(switched.dirty).toBe(false)
    expect(switched.workLook).toEqual(headCommit(switched)?.look)
    expect(switched.lastEvent).toContain('kaydedilmemiş değişiklik atıldı')
  })

  it('two concurrent branches keep independent looks', () => {
    let s = createBranch(seeded(), 'a')
    s = commit(aiImprove(s), 'A1') // blocks grows
    s = switchBranch(s, 'main')
    s = createBranch(s, 'b')
    s = commit(aiRedesign(s), 'B1') // theme shifts, blocks unchanged

    const onA = switchBranch(s, 'a')
    const onB = switchBranch(s, 'b')
    expect(onA.workLook.blocks).not.toBe(onB.workLook.blocks)
    expect(onA.workLook.theme).not.toBe(onB.workLook.theme)
  })

  it('lane assignment goes 1, 2, 3 and reuses the smallest unused number after a delete', () => {
    let s = seeded()
    s = createBranch(s, 'a')
    s = switchBranch(s, 'main')
    s = createBranch(s, 'b')
    s = switchBranch(s, 'main')
    s = createBranch(s, 'c')
    expect(s.branches.map((b) => b.laneIdx)).toEqual([1, 2, 3])
    expect(createBranch(s, 'd')).toBe(s) // no room left

    s = switchBranch(s, 'b')
    s = deleteBranch(s) // frees lane 2
    s = createBranch(s, 'd')
    expect(s.branches.find((b) => b.name === 'd')?.laneIdx).toBe(2)
  })

  it('push is per-branch ancestry: pushing branch A does not push branch B', () => {
    let s = seeded()
    s = createBranch(s, 'a')
    s = commit(aiImprove(s), 'A1')
    const aTipId = headCommit(s)?.id
    s = switchBranch(s, 'main')
    s = createBranch(s, 'b')
    s = commit(aiImprove(s), 'B1')
    const bTipId = headCommit(s)?.id

    s = switchBranch(s, 'a')
    const pushed = push(s)
    expect(pushed.pushedIds).toContain(aTipId)
    expect(pushed.pushedIds).not.toContain(bTipId)
    // main commits below the fork (Başlangıç, Özellik 1) are included
    expect(pushed.pushedIds.length).toBe(3)
  })

  it('push after merge carries the merged branch commits via the mergeFromId walk', () => {
    let s = createBranch(seeded(), 'a')
    s = commit(aiImprove(s), 'A1')
    const aTipId = headCommit(s)?.id
    s = mergeBranch(s)
    const mergeId = headCommit(s)?.id
    const pushed = push(s)
    expect(pushed.pushedIds).toContain(aTipId)
    expect(pushed.pushedIds).toContain(mergeId)
  })

  it('openPR is refused until every commit on the branch is pushed', () => {
    let s = createBranch(seeded(), 'a')
    s = commit(aiImprove(s), 'A1')
    expect(openPR(s)).toBe(s) // not pushed yet
    s = push(s)
    const withPr = openPR(s)
    expect(withPr.pr).toEqual({ status: 'open', from: 'a' })
  })

  it('PR flow: open → approve → merge marks the PR merged', () => {
    let s = createBranch(seeded(), 'a')
    s = push(commit(aiImprove(s), 'Yeni özellik'))
    s = approvePR(openPR(s))
    expect(s.pr?.status).toBe('approved')
    const merged = mergeBranch(s)
    expect(merged.pr?.status).toBe('merged')
  })

  it('restoreFromCloud drops a branch that has no pushed commits', () => {
    let s = push(seeded()) // main fully pushed
    s = createBranch(s, 'a')
    s = commit(aiImprove(s), 'A1') // never pushed
    const revived = restoreFromCloud(laptopDie(s))
    expect(revived.branches).toEqual([])
    expect(revived.currentBranch).toBe('main')
    expect(headCommit(revived)?.label).toBe('Özellik 1')
  })

  // --- name reuse after merge (old commits stay under the old name) ---

  const reusedDeneme = (): ModelState => {
    let s = createBranch(seeded(), 'deneme')
    s = commit(aiImprove(s), 'Eski deneme işi')
    s = mergeBranch(s) // old 'deneme' commit survives in history
    s = commit(aiImprove(s), 'Main devam') // main moves past the merge
    return createBranch(s, 'deneme') // same name, new lifetime, empty
  }

  it('switchBranch to a reused name lands on its fork, not the stale merged commit', () => {
    let s = reusedDeneme()
    const forkId = s.branches[0].forkId
    s = switchBranch(s, 'main')
    s = switchBranch(s, 'deneme')
    expect(s.headId).toBe(forkId)
    expect(headCommit(s)?.label).toBe('Main devam')
  })

  it('commit on a reused name chains from the fork, not the stale merged commit', () => {
    let s = reusedDeneme()
    const forkId = s.branches[0].forkId
    s = switchBranch(s, 'main')
    s = switchBranch(s, 'deneme')
    s = commit(aiImprove(s), 'Yeni deneme işi')
    expect(headCommit(s)?.parentId).toBe(forkId)
    // the old merged commit is untouched history, not part of the new branch
    expect(branchCommits(s, 'deneme').map((c) => c.label)).toEqual(['Yeni deneme işi'])
  })

  it('restoreFromCloud drops an empty reused-name branch even if the old lifetime was pushed', () => {
    let s = createBranch(seeded(), 'deneme')
    s = push(commit(aiImprove(s), 'Eski deneme işi')) // old lifetime pushed
    s = push(mergeBranch(s))
    s = createBranch(s, 'deneme') // new empty lifetime, nothing pushed
    const revived = restoreFromCloud(laptopDie(s))
    expect(revived.branches).toEqual([])
    expect(revived.currentBranch).toBe('main')
  })

  it('branchCommits returns only the live arc of a branch, and all main commits for "main"', () => {
    let s = createBranch(seeded(), 'a')
    s = commit(aiImprove(s), 'A1')
    expect(branchCommits(s, 'a')).toHaveLength(1)
    expect(branchCommits(s, 'main')).toHaveLength(2)
  })

  // --- protecting a live branch's fork from being dropped as "abandoned" ---

  it('rewriting main history after goBack does not orphan an active branch forked from the rewritten commit', () => {
    let s = createBranch(seeded(), 'deneme') // forkId = Özellik 1 (c2)
    s = commit(aiImprove(s), 'Deneme işi') // c3 on deneme
    const forkId = s.branches[0].forkId
    s = switchBranch(s, 'main')
    s = goBack(s) // main head back to Başlangıç (c1); c2 would normally be "abandoned"
    s = commit(aiImprove(s), 'Temiz devam') // new main commit off c1

    // c2 (deneme's fork) must survive — it's still in the DAG...
    expect(s.commits.some((c) => c.id === forkId)).toBe(true)
    // ...and is not rendered as abandoned/dimmed either.
    expect(abandonedIds(s)).not.toContain(forkId)
    // ...so deneme is still fully usable: switchable, mergeable.
    expect(tip(s, 'deneme')?.label).toBe('Deneme işi')
    expect(switchBranch(s, 'deneme').currentBranch).toBe('deneme')
    const merged = mergeBranch(switchBranch(s, 'deneme'))
    expect(merged.branches).toEqual([])
    expect(merged.commits.some((c) => c.label === 'Deneme işi')).toBe(true)
  })

  it('the same rewrite does not strand a pushed branch with an open PR — the PR always stays attached to a live branch', () => {
    let s = createBranch(seeded(), 'deneme')
    s = push(commit(aiImprove(s), 'Deneme işi'))
    s = openPR(s) // requires currentBranch === 'deneme' and everything pushed
    expect(s.pr).toEqual({ status: 'open', from: 'deneme' })

    s = switchBranch(s, 'main')
    s = goBack(s)
    s = commit(aiImprove(s), 'Temiz devam')

    // Invariant: a non-merged PR's `from` branch is always still active.
    const prBranchIsActive = !s.pr || s.pr.status === 'merged' || s.branches.some((b) => b.name === s.pr!.from)
    expect(prBranchIsActive).toBe(true)
    expect(s.pr).toEqual({ status: 'open', from: 'deneme' }) // survives, still usable
    expect(tip(s, 'deneme')).not.toBeNull()

    // Survives a laptop death + cloud restore too, since it was pushed.
    const revived = restoreFromCloud(laptopDie(s))
    const revivedPrOk = !revived.pr || revived.pr.status === 'merged' || revived.branches.some((b) => b.name === revived.pr!.from)
    expect(revivedPrOk).toBe(true)
    expect(revived.pr).toEqual({ status: 'open', from: 'deneme' })
    expect(revived.branches.some((b) => b.name === 'deneme')).toBe(true)
  })
})
