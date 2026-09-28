import { useEffect, useRef } from 'react'
import { onFrame, fmtClock, story, scrollToId } from '../story/runtime.js'
import { ASSETS, LINKS } from './assets.js'

export function Logo({ className = '' }) {
  const img = useRef(null)
  useEffect(() => {
    // the image may have failed before hydration attached onError
    const el = img.current
    if (el && el.complete && el.naturalWidth === 0) el.style.display = 'none'
  }, [])
  return (
    <span className={`logo ${className}`}>
      <img ref={img} src={ASSETS.logo} alt="" width="22" height="23" className="logo-mark" onError={(e) => (e.currentTarget.style.display = 'none')} />
      <span className="logo-word">Shire</span>
    </span>
  )
}

export function Header() {
  const clock = useRef(null)
  const bar = useRef(null)
  const prog = useRef(null)
  useEffect(() => {
    let last = ''
    let lastLight = null
    return onFrame((f) => {
      const txt = f.scene.id === 'time' ? '' : fmtClock(f.clock)
      if (txt !== last) {
        clock.current.textContent = txt
        clock.current.parentNode.style.opacity = txt ? 1 : 0
        last = txt
      }
      prog.current.style.transform = `scaleX(${(f.P / story.total).toFixed(4)})`
      const light = f.P > story.total - 0.35
      if (light !== lastLight) {
        bar.current.classList.toggle('is-light', light)
        lastLight = light
      }
    })
  }, [])
  return (
    <header className="hdr" ref={bar}>
      <a href="#top" className="hdr-home" aria-label="Shire home" onClick={(e) => (e.preventDefault(), scrollToId('top'))}>
        <Logo />
      </a>
      <div className="hdr-clock" aria-hidden="true">
        <span className="hdr-day">Friday</span>
        <span className="hdr-time" ref={clock}>
          6:15 PM
        </span>
      </div>
      <nav className="hdr-nav" aria-label="Main">
        <a href="#pricing" className="hdr-link" onClick={(e) => (e.preventDefault(), scrollToId('pricing'))}>
          Pricing
        </a>
        <a href={LINKS.demo} className="btn btn-sm">
          Get a demo
        </a>
      </nav>
      <div className="hdr-prog" aria-hidden="true">
        <i ref={prog} />
      </div>
    </header>
  )
}
