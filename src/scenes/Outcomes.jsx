// Scenes 14–17: the evening becomes data, the data becomes results, the room keeps running, and the night ends.
import { useEffect, useRef } from 'react'
import { Scene, Beat, useScene } from '../ui/Scene.jsx'
import { sim, R } from '../story/runtime.js'
import { band, ss, lerp } from '../story/story.js'
import { LINKS } from '../ui/assets.js'
import { Logo } from '../ui/Header.jsx'

// ---------------------------------------------------------------- 14 · time
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const turnsBefore = (c) => sim.parties.filter((p) => p.bussedAt && p.bussedAt <= c && p.bussedAt >= 90).length
const TURNS_DAY = turnsBefore(265)

function WeekStrip() {
  const root = useRef(null)
  const label = useRef(null)
  const cols = useRef([])
  const weeks = useRef([])
  useScene('time', (st) => {
    const u = st.u
    const o = band(u, 0.04, 0.1, 0.94, 1)
    root.current.style.opacity = o
    root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    if (o < 0.01) return
    let txt
    if (u < 0.62) {
      const d = u / 0.62
      const day = Math.min(6, Math.floor(d * 7))
      txt = DAYS[day]
      for (let i = 0; i < 7; i++) {
        const col = cols.current[i]
        const f = i < day ? 1 : i === day ? turnsBefore(st.clock) / TURNS_DAY : 0
        col.style.setProperty('--f', Math.min(1, f).toFixed(3))
      }
      root.current.classList.remove('is-weeks')
    } else {
      const w = (u - 0.62) / 0.38
      const blk = Math.min(3, Math.floor(w * 4))
      txt = u > 0.93 ? 'A month of service' : `Week ${blk + 1}`
      for (let i = 0; i < 7; i++) cols.current[i].style.setProperty('--f', 1)
      for (let i = 0; i < 4; i++) weeks.current[i].style.setProperty('--f', i < blk ? 1 : i === blk ? (w * 4 - blk).toFixed(3) : 0)
      root.current.classList.add('is-weeks')
    }
    if (label.current.textContent !== txt) label.current.textContent = txt
  })
  const ticks = Array.from({ length: 36 }, (_, i) => i)
  return (
    <div className="week" ref={root} aria-hidden="true">
      <div className="week-label" ref={label}>
        Monday
      </div>
      <div className="week-days">
        {DAYS.map((d, i) => (
          <div key={d} className="week-col" ref={(el) => (cols.current[i] = el)}>
            <div className="week-ticks">
              {ticks.map((t) => (
                <i key={t} style={{ '--i': t / ticks.length }} />
              ))}
            </div>
            <span>{d.slice(0, 3)}</span>
          </div>
        ))}
      </div>
      <div className="week-weeks">
        {[1, 2, 3, 4].map((w, i) => (
          <div key={w} className="week-bar" ref={(el) => (weeks.current[i] = el)}>
            <i />
            <span>Week {w}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Time() {
  return (
    <Scene id="time" label="Operations data accumulates">
      <div className="copy copy-left copy-top">
        <div className="stack">
          <Beat at="0.04 0.12 0.9 0.98" as="h2" className="display display-sm sans">
            Every shift becomes operating data.
          </Beat>
          <Beat at="0.12 0.2 0.9 0.98" as="p" className="lede">
            Live CCTV analytics to track employee efficiency, menu pricing, and scheduling.
          </Beat>
        </div>
      </div>
      <WeekStrip />
    </Scene>
  )
}

// ---------------------------------------------------------------- 15 · results
// The turn bar: the parts of a table's evening, with the waiting parts shrinking by exactly seven minutes.
// Segment lengths are this simulated restaurant's own no-Shire averages; only the 7 minutes is Shire's claim.
function avg(fn) {
  const xs = sim.parties.filter((p) => p.bussedAt && !p.shireSeated).map(fn).filter((x) => x > 0)
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
const SEG = [
  ['wait', 'Waiting to be greeted', avg((p) => p.greetedAt - p.seatedAt)],
  ['work', 'Menus', avg((p) => p.readyAt - p.greetedAt)],
  ['wait', 'Waiting to order', avg((p) => p.orderTakenAt - p.readyAt)],
  ['work', 'Kitchen', avg((p) => p.foodAt - p.orderTakenAt)],
  ['work', 'Dining', avg((p) => p.finishAt - p.foodAt)],
  ['wait', 'Waiting on the check', avg((p) => p.checkAt - p.finishAt)],
  ['work', 'Paying', avg((p) => p.leaveAt - p.checkAt)],
  ['wait', 'Waiting to be bussed', avg((p) => p.bussStartAt - p.leaveAt)],
]
const TOTAL = SEG.reduce((a, s) => a + s[2], 0)
const WAITS = SEG.filter((s) => s[0] === 'wait').reduce((a, s) => a + s[2], 0)

function TurnBar() {
  return (
    <div className="turn" aria-hidden="true">
      <div className="turn-bar">
        {SEG.map(([kind, name, d], i) => (
          <i key={i} className={`turn-${kind}`} style={{ flexGrow: d }} title={name} />
        ))}
        <span className="turn-cut">
          7 min
        </span>
      </div>
      <div className="turn-legend">
        <span>
          <i className="turn-work" /> service
        </span>
        <span>
          <i className="turn-wait" /> waiting
        </span>
      </div>
    </div>
  )
}

function Results() {
  const bar = useRef(null)
  const dots = useRef(null)
  const money = useRef(null)
  useEffect(() => {
    // build 114 dots once
    const el = dots.current
    let html = ''
    for (let i = 0; i < 114; i++) html += `<i class="${i >= 100 ? 'is-more' : ''}" style="--d:${i}"></i>`
    el.innerHTML = html
  }, [])
  useScene('results', (st) => {
    const u = st.u
    // turn bar: waits shrink so the whole turn is exactly 7 minutes shorter
    const k = ss(0.12, 0.26, u)
    const segs = bar.current.querySelectorAll('.turn-bar > i')
    const shrink = 7 / WAITS
    SEG.forEach(([kind, , d], i) => {
      const nd = kind === 'wait' ? d * (1 - shrink * k) : d
      segs[i].style.flexGrow = Math.max(0.01, nd)
    })
    const total = TOTAL - 7 * k
    bar.current.querySelector('.turn-bar').style.width = `${((total / TOTAL) * 100).toFixed(2)}%`
    bar.current.querySelector('.turn-cut').style.opacity = ss(0.2, 0.26, u)
    // dots
    const n = ss(0.4, 0.5, u) * 100 + ss(0.52, 0.6, u) * 14
    dots.current.style.setProperty('--n', n.toFixed(2))
    // money
    const m = ss(0.7, 0.8, u)
    money.current.textContent = `$${Math.round(lerp(0, 40, m))}K+`
  })
  return (
    <Scene id="results" label="Results">
      <div className="copy copy-left copy-top">
        <div className="stack">
          <Beat at="0 0.05 0.95 1" className="eyebrow">
            Real restaurant outcomes
          </Beat>
          <Beat at="0 0.05 0.95 1" as="h2" className="display display-sm sans">
            Customers grow with Shire.
          </Beat>
        </div>
      </div>
      <div className="results">
        <Beat at="0.06 0.12 0.32 0.36" className="result">
          <div className="result-num">7 min</div>
          <div className="result-label">faster table turns</div>
          <div ref={bar}>
            <TurnBar />
          </div>
          <p className="result-note">Illustration: the same table, turned seven minutes sooner.</p>
        </Beat>
        <Beat at="0.36 0.42 0.64 0.68" className="result">
          <div className="result-num">14%</div>
          <div className="result-label">more guests served per month</div>
          <div className="dots" ref={dots} aria-hidden="true" />
          <p className="result-note">Illustration: for every hundred guests you serve in a month, fourteen more.</p>
        </Beat>
        <Beat at="0.68 0.74 0.95 1" className="result">
          <div className="result-num" ref={money}>
            $40K+
          </div>
          <div className="result-label">average annual savings after switching to Shire</div>
          <figure className="quote quote-sm">
            <blockquote>"Shire saved us $65,000 on processing alone. We're serving more customers than ever while spending less on staff."</blockquote>
            <figcaption>
              Besim T. <span>Mathews Restaurant</span>
            </figcaption>
          </figure>
          <a className="link-arrow" href={LINKS.savings}>
            See how much you could save
          </a>
        </Beat>
      </div>
    </Scene>
  )
}

// ---------------------------------------------------------------- 16 · the whole floor
const WORDS = ['Efficiently.', 'Effortlessly.', 'Smarter.', 'Faster.']
function Rotator() {
  const ref = useRef(null)
  useEffect(() => {
    if (R.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let i = 2
    const id = setInterval(() => {
      i = (i + 1) % WORDS.length
      const el = ref.current
      if (!el) return
      el.classList.add('is-out')
      setTimeout(() => {
        el.textContent = WORDS[i]
        el.classList.remove('is-out')
      }, 260)
    }, 1900)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="rotator" ref={ref}>
      Smarter.
    </span>
  )
}

function Whole() {
  return (
    <Scene id="whole" label="The whole floor at once">
      <div className="copy copy-center">
        <div className="stack">
          <Beat at="0.1 0.2 0.62 0.72" as="h2" className="display display-xl sans">
            Run every shift <Rotator />
          </Beat>
          <Beat at="0.22 0.3 0.62 0.72" as="p" className="lede lede-center">
            A live floor view for every employee on shift, so everyone knows exactly where they're needed.
          </Beat>
        </div>
        <Beat at="0.74 0.8 0.95 1" as="p" className="display display-sm">
          When it's working, you barely notice it.
        </Beat>
      </div>
    </Scene>
  )
}

// ---------------------------------------------------------------- 17 · close
function Close() {
  return (
    <Scene id="close" label="Last table">
      <div className="copy copy-center">
        <Beat at="0.16 0.24 0.4 0.47" as="p" className="display display-xl">
          Your restaurant.
        </Beat>
        <Beat at="0.48 0.56 2 2" className="finale">
          <Logo className="logo-lg" />
          <h2 className="display sans">Let's build a smarter restaurant.</h2>
          <div className="cta-row">
            <a className="btn btn-lg" href={LINKS.demo}>
              Get a demo
            </a>
            <a className="btn btn-lg btn-ghost" href={LINKS.savings}>
              See how much you could save
            </a>
          </div>
        </Beat>
      </div>
    </Scene>
  )
}

export function Outcomes() {
  return (
    <>
      <Time />
      <Results />
      <Whole />
      <Close />
    </>
  )
}
