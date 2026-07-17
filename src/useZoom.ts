import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

// Scene zoom & pan: ctrl/cmd+scroll zooms toward the cursor, drag pans,
// the overlay buttons zoom around the container center, dblclick/⤢ resets.

const MIN_SCALE = 0.12
const MAX_SCALE = 6
const BUTTON_ZOOM_STEP = 1.25
const WHEEL_SENSITIVITY = 0.0022

export type ZoomTransform = { scale: number; tx: number; ty: number }

const IDENTITY: ZoomTransform = { scale: 1, tx: 0, ty: 0 }

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

// Rescales `prev` by `factor` while keeping the content point under (cx, cy)
// (container-relative coordinates) visually fixed.
export function zoomToward(prev: ZoomTransform, cx: number, cy: number, factor: number): ZoomTransform {
  const scale = clampScale(prev.scale * factor)
  const k = scale / prev.scale
  return { scale, tx: cx - (cx - prev.tx) * k, ty: cy - (cy - prev.ty) * k }
}

// Centered fit: largest scale (× 0.94 breathing room) that fits the content
// in the container, clamped, then translate so content is centered.
export function fitTransform(
  containerW: number, containerH: number, contentW: number, contentH: number,
): ZoomTransform {
  const raw = Math.min(containerW / contentW, containerH / contentH) * 0.94
  const scale = clampScale(raw)
  return {
    scale,
    tx: (containerW - contentW * scale) / 2,
    ty: (containerH - contentH * scale) / 2,
  }
}

type DragState = { pointerId: number; startX: number; startY: number; startTx: number; startTy: number }

export function useZoom(contentW: number, contentH: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<ZoomTransform>(IDENTITY)
  const [animate, setAnimate] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  // Tracks whether the user has manually panned/zoomed since the last fit,
  // so container resizes don't yank a view they've adjusted.
  const adjustedRef = useRef(false)

  const fitToContainer = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTransform(fitTransform(rect.width, rect.height, contentW, contentH))
    adjustedRef.current = false
  }, [contentW, contentH])

  const zoomAtCenter = useCallback((factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    setAnimate(true)
    adjustedRef.current = true
    setTransform((prev) => zoomToward(prev, cx, cy, factor))
  }, [])

  const zoomIn = useCallback(() => zoomAtCenter(BUTTON_ZOOM_STEP), [zoomAtCenter])
  const zoomOut = useCallback(() => zoomAtCenter(1 / BUTTON_ZOOM_STEP), [zoomAtCenter])

  const reset = useCallback(() => {
    setAnimate(true)
    fitToContainer()
  }, [fitToContainer])

  // Initial framing + re-frame when the content grows — but only while the
  // user hasn't manually panned/zoomed since the last fit (adjustedRef false).
  // So history growth keeps everything in view automatically, yet never yanks
  // a view the user has adjusted (⤢ re-fits on demand). fitToContainer's deps
  // include contentW, so this re-runs whenever the scene widens.
  useLayoutEffect(() => {
    if (!adjustedRef.current) fitToContainer()
  }, [fitToContainer])

  // Re-fit on container resize, but only while the user hasn't manually
  // panned/zoomed since the last fit.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (!adjustedRef.current) fitToContainer()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitToContainer])

  // Non-passive wheel listener (React's onWheel is passive, which would
  // silently ignore preventDefault on ctrl/cmd+scroll and trackpad pinch).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY)
      setAnimate(false)
      adjustedRef.current = true
      setTransform((prev) => zoomToward(prev, cx, cy, factor))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      containerRef.current?.setPointerCapture(e.pointerId)
      dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startTx: transform.tx, startTy: transform.ty }
      setAnimate(false)
      setDragging(true)
    },
    [transform.tx, transform.ty],
  )

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const tx = drag.startTx + (e.clientX - drag.startX)
    const ty = drag.startTy + (e.clientY - drag.startY)
    adjustedRef.current = true
    setTransform((prev) => ({ ...prev, tx, ty }))
  }, [])

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    containerRef.current?.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setDragging(false)
  }, [])

  return {
    containerRef,
    transform,
    animate,
    dragging,
    zoomIn,
    zoomOut,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick: reset,
    },
  }
}
