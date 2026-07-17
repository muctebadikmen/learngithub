import { describe, expect, it } from 'vitest'
import { aiImprove, commit, createRepo, initialModel, push, type ModelState } from '../src/model'
import { GAP, sceneLayout, SCENE_H } from '../src/sceneLayout'

// createRepo => 1 commit (x=0); each commit adds one (x = count-1).
const withCommits = (n: number): ModelState => {
  let s = createRepo(initialModel())
  for (let i = 1; i < n; i++) {
    s = aiImprove(s) // sets dirty so the next commit isn't a no-op
    s = commit(s, `c${i}`)
  }
  return s
}

describe('sceneLayout', () => {
  it('falls back to the exact current geometry when empty', () => {
    const l = sceneLayout(initialModel())
    expect(l).toMatchObject({
      computerPanelW: 744,
      computerPanelR: 768,
      repoBoxW: 696,
      ghPanelX: 800,
      ghPanelW: 456,
      dx: 0,
      sceneW: 1280,
      sceneH: SCENE_H,
      gap: GAP,
    })
  })

  it('stays at base size for a small history', () => {
    // maxLocalX 4 => 116 + 4*112 + 72 = 636 < 768, still base.
    expect(sceneLayout(withCommits(5)).sceneW).toBe(1280)
  })

  it('grows the computer panel and the scene once commits pass the base width', () => {
    const l = sceneLayout(withCommits(12)) // maxLocalX = 11
    expect(l.computerPanelR).toBe(116 + 11 * GAP + 72) // 1420
    expect(l.computerPanelW).toBe(l.computerPanelR - 24)
    expect(l.sceneW).toBeGreaterThan(1280)
  })

  it('keeps the GitHub panel to the right of the computer panel (no overlap)', () => {
    for (const n of [1, 5, 12, 25]) {
      const l = sceneLayout(withCommits(n))
      expect(l.ghPanelX).toBe(l.computerPanelR + 32)
      expect(l.dx).toBe(l.ghPanelX - 800)
      expect(l.sceneW).toBe(l.ghPanelX + l.ghPanelW + 24)
    }
  })

  it('is monotonic in commit count', () => {
    expect(sceneLayout(withCommits(20)).sceneW).toBeGreaterThan(sceneLayout(withCommits(10)).sceneW)
  })

  it('widens the GitHub panel when the cloud has many commits', () => {
    const local = sceneLayout(withCommits(12)).ghPanelW // nothing pushed => 456
    const pushed = sceneLayout(push(withCommits(12))).ghPanelW // 12 cloud commits
    expect(local).toBe(456)
    expect(pushed).toBeGreaterThan(456)
  })
})
