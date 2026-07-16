import { describe, expect, it } from 'vitest'
import {
  aiBreak,
  aiImprove,
  approvePR,
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
  switchLane,
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

  it('branch → work → merge lands on main; branch commits survive', () => {
    let s = createBranch(seeded())
    expect(s.currentLane).toBe('branch')
    s = commit(aiImprove(s), 'Deneme işi')
    const merged = mergeBranch(s)
    expect(merged.branchName).toBeNull()
    expect(merged.currentLane).toBe('main')
    expect(headCommit(merged)?.isMerge).toBe(true)
    expect(merged.commits.some((c) => c.lane === 'branch')).toBe(true)
  })

  it('deleteBranch removes branch commits and returns to main tip', () => {
    let s = createBranch(seeded())
    s = commit(aiImprove(s), 'Deneme işi')
    const dropped = deleteBranch(s)
    expect(dropped.commits.every((c) => c.lane === 'main')).toBe(true)
    expect(headCommit(dropped)?.label).toBe('Özellik 1')
    expect(dropped.workLook.broken).toBe(false)
  })

  it('switchLane moves head between lane tips', () => {
    let s = createBranch(seeded())
    s = commit(aiImprove(s), 'Deneme işi')
    const onMain = switchLane(s)
    expect(onMain.currentLane).toBe('main')
    expect(headCommit(onMain)?.label).toBe('Özellik 1')
    expect(switchLane(onMain).currentLane).toBe('branch')
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

  it('PR flow: open → approve → merge marks the PR merged', () => {
    let s = createBranch(seeded())
    s = push(commit(aiImprove(s), 'Yeni özellik'))
    s = approvePR(openPR(s))
    expect(s.pr?.status).toBe('approved')
    const merged = mergeBranch(s)
    expect(merged.pr?.status).toBe('merged')
  })

  it('openPR/approvePR guard against wrong states', () => {
    const s = seeded()
    expect(openPR(s)).toBe(s) // no branch
    expect(approvePR(s)).toBe(s) // no PR
  })
})
