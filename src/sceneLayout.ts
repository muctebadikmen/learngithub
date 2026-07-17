import type { ModelState } from './model'

// Fixed horizontal spacing between timeline nodes. Never compresses, so
// labels can't collide no matter how many commits there are — the scene
// grows sideways instead (useZoom then frames/inspects it).
export const GAP = 112

// The scene only grows horizontally; height is fixed.
export const SCENE_H = 720

export type SceneLayout = {
  gap: number
  computerPanelW: number
  computerPanelR: number
  repoBoxW: number
  ghPanelX: number
  ghPanelW: number
  dx: number
  sceneW: number
  sceneH: number
}

const maxX = (cs: { x: number }[]): number => (cs.length ? Math.max(...cs.map((c) => c.x)) : 0)

// Panel geometry derived from commit counts. Base case (empty/small history)
// reproduces the original fixed layout: computer panel x=24..768, GitHub
// panel x=800..1256, sceneW 1280.
export function sceneLayout(s: ModelState): SceneLayout {
  // Computer side: rightmost local node + label/📍pin padding (72).
  const computerContentR = 116 + maxX(s.commits) * GAP + 72
  const computerPanelR = Math.max(768, computerContentR)
  const computerPanelW = computerPanelR - 24
  const repoBoxW = computerPanelW - 48

  // GitHub side, authored in its original 800-based local space then shifted
  // right by dx. cloud = pushed local commits + teammate's remoteExtra.
  const cloud = [...s.commits.filter((c) => s.pushedIds.includes(c.id)), ...s.remoteExtra]
  const ghContentRLocal = Math.max(1256, 852 + maxX(cloud) * GAP + 60)
  const ghPanelW = ghContentRLocal - 800
  const ghPanelX = computerPanelR + 32
  const dx = ghPanelX - 800

  const sceneW = ghPanelX + ghPanelW + 24

  return { gap: GAP, computerPanelW, computerPanelR, repoBoxW, ghPanelX, ghPanelW, dx, sceneW, sceneH: SCENE_H }
}
