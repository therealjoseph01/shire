// Editorial captions: what anyone standing in the room could notice. Italic serif and hairlines,
// deliberately a different voice from Shire's labels.
import { useEffect, useRef } from 'react'
import { onScene, R } from '../story/runtime.js'

export function Captions({ scene, pick, max = 6, variant = '' }) {
  const ref = useRef(null)
  const pickRef = useRef(pick)
  pickRef.current = pick
  useEffect(() => {
    const root = ref.current
    const pool = Array.from({ length: max }, () => {
      const el = document.createElement('div')
      el.className = `cap ${variant}`
      el.innerHTML = '<span class="cap-line"></span><span class="cap-text"></span>'
      root.appendChild(el)
      return { el, text: el.querySelector('.cap-text'), s: { t: '', o: -1, key: null } }
    })
    const P = { x: 0, y: 0, z: 0, vis: false }
    return onScene(scene, (st) => {
      const items = pickRef.current(st) || []
      const W = R.world
      pool.forEach((g, i) => {
        const it = items[i]
        const o = it && W ? Math.round((it.o ?? 1) * 100) / 100 : 0
        if (o !== g.s.o) {
          g.el.style.opacity = o
          g.el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
          g.s.o = o
        }
        if (!it || o < 0.01) return
        W.project(it.x, it.y ?? 1.2, it.z, P)
        if (P.x < R.vw * 0.03 || P.x > R.vw * 0.97 || P.y < 70 || P.y > R.vh - 20) {
          if (g.s.o !== 0) {
            g.el.style.opacity = 0
            g.el.style.visibility = 'hidden'
            g.s.o = 0
          }
          return
        }
        const lift = it.lift ?? 64
        g.el.style.transform = `translate3d(${P.x.toFixed(1)}px,${(P.y - lift).toFixed(1)}px,0)`
        g.el.style.setProperty('--lift', `${lift}px`)
        if (it.text !== g.s.t) {
          g.text.textContent = it.text
          g.s.t = it.text
        }
        const side = it.side || (P.x > R.vw * 0.62 ? 'l' : 'r')
        if (side !== g.s.side) {
          g.el.dataset.side = side
          g.s.side = side
        }
      })
    })
  }, [scene, max, variant])
  return <div className="caps" ref={ref} aria-hidden="true" />
}
