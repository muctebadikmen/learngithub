import { describe, expect, it } from 'vitest'
import { clampScale, fitTransform, zoomToward } from '../src/useZoom'

describe('clampScale', () => {
  it('clamps below MIN to 0.12', () => {
    expect(clampScale(0)).toBe(0.12)
    expect(clampScale(0.05)).toBe(0.12)
  })

  it('clamps above MAX to 6', () => {
    expect(clampScale(10)).toBe(6)
    expect(clampScale(6.01)).toBe(6)
  })

  it('passes through 1 unchanged', () => {
    expect(clampScale(1)).toBe(1)
  })
})

describe('zoomToward', () => {
  it('keeps the point under (cx, cy) fixed', () => {
    const result = zoomToward({ scale: 1, tx: 0, ty: 0 }, 100, 100, 2)
    expect(result).toEqual({ scale: 2, tx: -100, ty: -100 })

    // The content point that mapped to (100, 100) before the zoom still
    // maps to (100, 100) after it: screen = content * scale + t.
    const contentX = (100 - 0) / 1
    const contentY = (100 - 0) / 1
    expect(contentX * result.scale + result.tx).toBe(100)
    expect(contentY * result.scale + result.ty).toBe(100)
  })
})

describe('fitTransform', () => {
  it('fits a wide container by the binding (height) ratio, centered', () => {
    const result = fitTransform(1248, 436, 1280, 720)
    // min(1248/1280, 436/720) * 0.94 = min(0.975, 0.6055...) * 0.94 ≈ 0.569
    const expectedScale = clampScale(Math.min(1248 / 1280, 436 / 720) * 0.94)
    expect(expectedScale).toBeCloseTo(0.569, 3)
    expect(result.scale).toBeCloseTo(expectedScale, 10)
    expect(result.tx).toBeCloseTo((1248 - 1280 * expectedScale) / 2, 10)
    expect(result.ty).toBeCloseTo((436 - 720 * expectedScale) / 2, 10)
    expect(result.tx).toBeGreaterThanOrEqual(0)
    expect(result.ty).toBeGreaterThanOrEqual(0)
  })

  it('uses the width ratio when width is the binding dimension', () => {
    // width/content ratio (700/1280 = 0.5469) is smaller than
    // height/content ratio (900/720 = 1.25), so width binds. Raw scale
    // (0.5469 * 0.94 ≈ 0.514) stays above MIN_SCALE (0.12), so this exercises
    // the unclamped width-bound path, not the min clamp.
    const result = fitTransform(700, 900, 1280, 720)
    const expectedScale = clampScale((700 / 1280) * 0.94)
    expect(expectedScale).toBeGreaterThan(0.12)
    expect(result.scale).toBeCloseTo(expectedScale, 5)
    expect(result.tx).toBeCloseTo((700 - 1280 * expectedScale) / 2, 5)
    expect(result.ty).toBeCloseTo((900 - 720 * expectedScale) / 2, 5)
  })

  it('clamps to MIN_SCALE for a tiny container', () => {
    const result = fitTransform(50, 50, 1280, 720)
    expect(result.scale).toBe(0.12)
  })

  it('fits a very wide scene below the old 0.5 floor (zoom-out now shows everything)', () => {
    // 2600-wide scene in a ~900px container needs ~0.33 — impossible under the
    // old MIN_SCALE 0.5, possible now.
    const result = fitTransform(900, 700, 2600, 720)
    const expectedScale = clampScale(Math.min(900 / 2600, 700 / 720) * 0.94)
    expect(result.scale).toBeCloseTo(expectedScale, 10)
    expect(result.scale).toBeLessThan(0.5)
    expect(result.scale).toBeGreaterThan(0.12)
  })
})
