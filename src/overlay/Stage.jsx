import { useEffect, useRef, useState } from 'react'
import { sim, q, start, stop, R } from '../story/runtime.js'
import { Tags } from './Tags.jsx'
import { ASSETS } from '../ui/assets.js'

function webglOK() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function Stage() {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('boot') // boot | live | fallback
  useEffect(() => {
    let world = null
    let lenis = null
    let cancelled = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.classList.toggle('reduced', reduced)
    if (!webglOK()) {
      setMode('fallback')
      return
    }
    ;(async () => {
      const [{ createWorld }, LenisMod] = await Promise.all([import('../three/world.js'), reduced ? Promise.resolve(null) : import('lenis')])
      if (cancelled) return
      const touch = window.matchMedia('(pointer: coarse)').matches
      world = createWorld({ canvas: canvasRef.current, sim, q, quality: { aa: (window.devicePixelRatio || 1) < 2 } })
      if (LenisMod && !touch) {
        const Lenis = LenisMod.default
        lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true })
        const tick = (t) => {
          lenis.raf(t)
          lenis._raf = requestAnimationFrame(tick)
        }
        lenis._raf = requestAnimationFrame(tick)
      }
      start({ world, reduced, lenis })
      setMode('live')
      document.documentElement.classList.add('is-live')
    })().catch((e) => {
      console.error(e)
      setMode('fallback')
    })
    return () => {
      cancelled = true
      stop()
      if (lenis) {
        cancelAnimationFrame(lenis._raf)
        lenis.destroy()
      }
      world && world.dispose()
    }
  }, [])
  return (
    <div className={`stage stage-${mode}`} aria-hidden="true">
      <canvas ref={canvasRef} className="stage-canvas" />
      {mode === 'fallback' && <img className="stage-fallback" src={ASSETS.interior} alt="" loading="eager" />}
      <div className="stage-vignette" />
      <div className="stage-grain" />
      <Tags />
    </div>
  )
}
