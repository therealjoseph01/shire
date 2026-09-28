// Scenes 11–13: the restaurant as a system, the floor becoming Shire's software, and asking the operation a question.
import { useEffect, useRef, useState } from 'react'
import { Scene, Beat, useScene } from '../ui/Scene.jsx'
import { q, R, sim, story, fmtClock, onFrame } from '../story/runtime.js'
import { band, ss, lerp } from '../story/story.js'
import { TABLES, SERVERS, SERVER_BY_ID, MODULE_ANCHORS, TABLE_BY_ID, STATIONS } from '../sim/layout.js'
import { ASSETS } from '../ui/assets.js'
import { UI } from '../story/ui-state.js'

// ---------------------------------------------------------------- 11 · system
const MODULES = [
  ['pos', 'Point of sale', 'Built for scale with 1,000+ features.', 202.5],
  ['kitchen', 'Kitchen display', 'Every order and station, in sync.', 247.5],
  ['cctv', 'CCTV coordination', 'Alerts every role where attention is needed.', 292.5],
  ['staff', 'Staff & scheduling', 'Build better shifts in less time.', 337.5],
  ['ops', 'AI operations', 'Live insights. Smarter decisions.', 22.5],
  ['marketing', 'Marketing', 'Loyalty, gift cards, SEO, and more.', 67.5],
  ['reservations', 'AI reservations', 'Answers calls and books tables, 24/7.', 112.5],
  ['ordering', 'Online ordering', 'Own every digital order, end to end.', 157.5],
]

function SystemMap() {
  const svg = useRef(null)
  const nodes = useRef([])
  const hub = useRef(null)
  useScene('system', (st) => {
    const W = R.world
    const on = band(st.u, 0.3, 0.42, 0.92, 1)
    svg.current.style.opacity = on
    svg.current.parentNode.style.visibility = on < 0.01 ? 'hidden' : 'visible'
    if (!W || on < 0.01) return
    const P = { x: 0, y: 0, z: 0, vis: false }
    const C = { x: 0, y: 0, z: 0, vis: false }
    W.project(-1.2, 0.1, -1.4, C)
    const vw = R.vw
    const vh = R.vh
    const portrait = vw / vh < 0.9
    const rx = portrait ? vw * 0.34 : Math.min(vw * 0.36, 560)
    const ry = portrait ? vh * 0.2 : vh * 0.25
    const cx = vw / 2
    const cy = vh * (portrait ? 0.44 : 0.41)
    hub.current.style.transform = `translate3d(${C.x.toFixed(1)}px,${C.y.toFixed(1)}px,0)`
    MODULES.forEach(([id, , , deg], i) => {
      const n = nodes.current[i]
      if (!n) return
      const a = (deg * Math.PI) / 180
      const nw = portrait ? 130 : 210
      const nx = Math.min(vw - 12 - (Math.cos(a) > 0.2 ? nw : 0), Math.max(12 + (Math.cos(a) < -0.2 ? nw : 0), cx + Math.cos(a) * rx))
      const ny = cy + Math.sin(a) * ry
      const an = MODULE_ANCHORS[id]
      W.project(an[0], an[1], an[2], P)
      const k = ss(0.34 + i * 0.035, 0.46 + i * 0.035, st.u)
      n.el.style.transform = `translate3d(${nx.toFixed(1)}px,${ny.toFixed(1)}px,0)`
      n.el.style.opacity = k
      n.el.dataset.side = Math.cos(a) < -0.2 ? 'l' : Math.cos(a) > 0.2 ? 'r' : 'c'
      // node → anchor (curved), anchor → hub
      const mx = (nx + P.x) / 2 + (cy - ny) * 0.08
      const my = (ny + P.y) / 2
      n.a.setAttribute('d', `M${nx.toFixed(1)},${ny.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${P.x.toFixed(1)},${P.y.toFixed(1)}`)
      n.b.setAttribute('d', `M${P.x.toFixed(1)},${P.y.toFixed(1)} L${C.x.toFixed(1)},${C.y.toFixed(1)}`)
      n.a.style.opacity = k * 0.9
      n.b.style.opacity = k * 0.5
      const dash = R.reduced ? 0 : -((st.real * 26 + i * 9) % 40)
      n.a.style.strokeDashoffset = dash
      n.b.style.strokeDashoffset = dash
      n.dot.setAttribute('cx', P.x.toFixed(1))
      n.dot.setAttribute('cy', P.y.toFixed(1))
      n.dot.style.opacity = k
    })
  })
  return (
    <div className="sysmap" aria-hidden="true">
      <svg ref={svg} className="sysmap-svg" width="100%" height="100%">
        {MODULES.map(([id], i) => (
          <g key={id} ref={(el) => el && (nodes.current[i] = { ...(nodes.current[i] || {}), g: el, a: el.children[0], b: el.children[1], dot: el.children[2] })}>
            <path className="sys-a" />
            <path className="sys-b" />
            <circle r="3.2" className="sys-dot" />
          </g>
        ))}
      </svg>
      <div className="sys-hub" ref={hub}>
        <span>Shire</span>
      </div>
      {MODULES.map(([id, name, line], i) => (
        <div key={id} className="sys-node" ref={(el) => el && (nodes.current[i] = { ...(nodes.current[i] || {}), el })}>
          <b>{name}</b>
          <span>{line}</span>
        </div>
      ))}
    </div>
  )
}

function System() {
  return (
    <Scene id="system" label="The restaurant becomes a system">
      <div className="copy copy-center copy-bottom">
        <div className="stack">
          <Beat at="0.06 0.16 0.9 0.98" as="h2" className="display display-sm sans">
            Everything your restaurant needs. Working as one.
          </Beat>
          <Beat at="0.16 0.26 0.9 0.98" as="p" className="lede lede-center">
            Eight connected tools for every shift, from the first reservation to the final report.
          </Beat>
        </div>
      </div>
      <SystemMap />
    </Scene>
  )
}

// ---------------------------------------------------------------- 12 · floor → Shire Host
const TILE = {
  open: ['#e2eedf', '#a7cea4'],
  seated: ['#c9d8ef', '#8eafe0'],
  dirty: ['#dccab3', '#b79e7e'],
}
const initials = (name) => name.slice(0, 2).toUpperCase()

function hostLayout(vw, vh) {
  const portrait = vw / vh < 0.9
  const w = Math.min(1180, vw * (portrait ? 0.94 : 0.88))
  const h = Math.min(700, vh * (portrait ? 0.7 : 0.74))
  const x0 = (vw - w) / 2
  const y0 = (vh - h) / 2 + (portrait ? 30 : 34)
  const rail = portrait ? 0 : 54
  const left = portrait ? 0 : Math.round((w - rail) * 0.25)
  const top = 44 + (portrait ? 58 : 70)
  const map = { x: x0 + rail + left + 14, y: y0 + top + 10, w: w - rail - left - 28, h: h - top - 56 }
  return { x0, y0, w, h, rail, left, top, map, portrait }
}

// world (x,z) → map pixel, preserving the room's aspect
const WX = [-12.4, 6.1]
const WZ = [-6.9, 5.4]
function toMap(L, x, z) {
  const sx = L.map.w / (WX[1] - WX[0])
  const sz = L.map.h / (WZ[1] - WZ[0])
  const s = Math.min(sx, sz)
  const ox = L.map.x + (L.map.w - (WX[1] - WX[0]) * s) / 2
  const oz = L.map.y + (L.map.h - (WZ[1] - WZ[0]) * s) / 2
  return [ox + (x - WX[0]) * s, oz + (z - WZ[0]) * s, s]
}

function HostUI() {
  const frame = useRef(null)
  const tiles = useRef([])
  const strip = useRef([])
  const wl = useRef(null)
  const cnt = useRef({})
  const foot = useRef({})
  const time = useRef(null)
  const flyer = useRef(null)
  useScene('os', (st) => {
    const W = R.world
    if (!W) return
    const L = hostLayout(R.vw, R.vh)
    const u = st.u
    const tileO = band(u, 0.05, 0.12, 0.5, 0.58)
    const morph = ss(0.14, 0.32, u)
    const chrome = band(u, 0.22, 0.34, 0.5, 0.58)
    const f = frame.current
    f.style.left = `${L.x0}px`
    f.style.top = `${L.y0}px`
    f.style.width = `${L.w}px`
    f.style.height = `${L.h}px`
    f.style.opacity = chrome
    f.style.visibility = chrome < 0.01 ? 'hidden' : 'visible'
    f.style.transform = `scale(${lerp(0.97, 1, chrome)})`
    f.style.setProperty('--rail', `${L.rail}px`)
    f.style.setProperty('--left', `${L.left}px`)
    const c = st.clock
    const P = { x: 0, y: 0, z: 0, vis: false }
    const load = q.sectionLoad(c)
    TABLES.forEach((t, i) => {
      const el = tiles.current[i]
      if (!el) return
      el.style.opacity = tileO
      el.style.visibility = tileO < 0.01 ? 'hidden' : 'visible'
      if (tileO < 0.01) return
      const st2 = q.tableState(t.id, c)
      W.project(t.x, 0.78, t.z, P)
      const [mx, my, s] = toMap(L, t.x, t.z)
      // projected size of the table top (camera is straight down here)
      const Pe = { x: 0, y: 0, z: 0, vis: false }
      W.project(t.x + t.w / 2, 0.78, t.z, Pe)
      const projScale = Math.abs(Pe.x - P.x) / (t.w / 2)
      const sc = lerp(projScale, s, morph)
      const w = Math.max(18, (t.w + (t.shape === 'rect' ? 0.2 : 0.35)) * sc)
      const h = Math.max(18, (t.d + (t.shape === 'rect' ? 0.35 : 0.35)) * sc)
      const x = lerp(P.x, mx, morph)
      const y = lerp(P.y, my, morph)
      el.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px,0)`
      el.style.width = `${w.toFixed(1)}px`
      el.style.height = `${h.toFixed(1)}px`
      const [bg, bd] = TILE[st2.cat]
      if (el._cat !== st2.cat) {
        el.style.background = bg
        el.style.borderColor = bd
        el._cat = st2.cat
      }
    })
    if (chrome > 0.01) {
      time.current.textContent = `${fmtClock(c)}  Fri`
      const n = q.counts(c)
      for (const k of ['open', 'dirty', 'seated']) if (cnt.current[k]) cnt.current[k].textContent = n[k]
      for (const k of ['open', 'seated', 'dirty', 'blocked']) if (foot.current[k]) foot.current[k].textContent = n[k]
      // server strip
      const lightest = SERVERS.map((s) => s.id).sort((a, b) => load[a].active - load[b].active)[0]
      SERVERS.forEach((sv, i) => {
        const el = strip.current[i]
        if (!el) return
        const act = TABLES.filter((t) => t.section === sv.id && q.tableState(t.id, c).cat === 'seated').map((t) => `T${t.num}`)
        const html = act.map((x) => `<span>${x}</span>`).join('')
        const chips = el.querySelector('.hs-chips')
        if (chips._h !== html) {
          chips.innerHTML = html
          chips._h = html
        }
        el.classList.toggle('is-next', sv.id === lightest)
      })
      // waitlist: the parties actually waiting right now, with the table Shire gave them
      const waiting = q.waitingAt(c).slice(0, L.portrait ? 1 : 3)
      const html = waiting
        .map((p) => {
          const w = Math.max(0, c - p.standAt)
          const sv = p.server ? SERVER_BY_ID[p.server] : null
          const sug = p.table ? `<div class="wc-sug"><span class="wc-spark">✦</span> Suggested T${TABLE_BY_ID[p.table].num}</div><div class="wc-fit">Fits ${p.size} · ${sv.name} next</div>` : ''
          const quote = p.pickAt > c ? `<span class="wc-pill">~${Math.max(1, Math.round(p.pickAt - c))}M</span>` : '<span class="wc-pill wc-arrived">Seating</span>'
          return `<div class="wl-card">${sug}<div class="wc-row"><span class="wc-name">${p.name}</span>${quote}</div><div class="wc-meta"><span>${p.size} guests</span><span>${Math.floor(w)}m</span></div></div>`
        })
        .join('')
      if (wl.current._h !== html) {
        wl.current.innerHTML = html || '<div class="wl-empty">No one waiting</div>'
        wl.current._h = html
      }
    }
    // one live label lifts off its table and lands in the interface
    const fly = flyer.current
    const fo = band(u, 0.04, 0.1, 0.3, 0.36)
    fly.style.opacity = fo
    fly.style.visibility = fo < 0.01 ? 'hidden' : 'visible'
    if (fo > 0.01) {
      const all = q.allTables(c)
      const target = all.find((x) => x.key === 'waitingCheck') || all.find((x) => x.flag) || all.find((x) => x.key === 'checkDropped') || all[7]
      const t = target.table
      W.project(t.x, 1.25, t.z, P)
      const [mx, my] = toMap(L, t.x, t.z)
      const x = lerp(P.x, mx, morph)
      const y = lerp(P.y - 26, my - 26, morph)
      fly.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`
      const txt = `T${String(t.num).padStart(2, '0')} · ${target.flag || target.label}`
      if (fly._t !== txt) {
        fly.querySelector('b').textContent = txt
        fly._t = txt
      }
    }
  })
  return (
    <div className="hostui-wrap" aria-hidden="true">
      {TABLES.map((t, i) => (
        <div key={t.id} className={`htile htile-${t.shape}`} ref={(el) => (tiles.current[i] = el)}>
          <b>{t.num}</b>
          <span>{t.seats}p</span>
          <i style={{ background: SERVER_BY_ID[t.section].color }}>{initials(SERVER_BY_ID[t.section].name)}</i>
        </div>
      ))}
      <div className="flytag tag is-full" ref={flyer}>
        <span className="tag-body">
          <i className="tag-dot" style={{ background: '#6c9be6' }} />
          <b className="tag-id">T07</b>
        </span>
      </div>
      <div className="hostui" ref={frame}>
        <div className="hu-top">
          <span className="hu-time" ref={time} />
          <span className="hu-brand">
            <span className="hu-word">SHIRE</span> Host
          </span>
          <span className="hu-search">Search guests, tables…</span>
          <span className="hu-pills">
            <span>
              <i className="hu-live" /> Synced
            </span>
            <span>CCTV</span>
            <span className="hu-mode">Mode: Sections</span>
          </span>
        </div>
        <div className="hu-rail">
          {['Floor', 'Stats', 'Queue', 'RSV'].map((x, i) => (
            <span key={x} className={i === 0 ? 'is-on' : ''}>
              <i />
              {x}
            </span>
          ))}
        </div>
        <div className="hu-strip">
          {SERVERS.map((sv, i) => (
            <div key={sv.id} className="hs" ref={(el) => (strip.current[i] = el)}>
              <div className="hs-name">
                <i style={{ background: sv.color }} />
                {sv.name}
                <em>Next party</em>
              </div>
              <div className="hs-chips" />
            </div>
          ))}
        </div>
        <div className="hu-left">
          <div className="hu-tabs">
            <span className="is-on">Waitlist</span>
            <span>Reservations</span>
          </div>
          <div className="hu-counts">
            <span>
              <b ref={(el) => (cnt.current.open = el)}>0</b>Open
            </span>
            <span>
              <b ref={(el) => (cnt.current.dirty = el)}>0</b>Dirty
            </span>
            <span>
              <b ref={(el) => (cnt.current.seated = el)}>0</b>Seated
            </span>
          </div>
          <div className="hu-wl" ref={wl} />
          <div className="hu-add">+ Add Walk-in</div>
        </div>
        <div className="hu-foot">
          <span className="hu-rooms">All Rooms</span>
          <span className="hu-legend">
            <span>
              <i style={{ background: '#5cc58e' }} />
              <b ref={(el) => (foot.current.open = el)}>0</b> Open
            </span>
            <span>
              <i style={{ background: '#6c9be6' }} />
              <b ref={(el) => (foot.current.seated = el)}>0</b> Seated
            </span>
            <span>
              <i style={{ background: '#b89f80' }} />
              <b ref={(el) => (foot.current.dirty = el)}>0</b> Dirty
            </span>
            <span>
              <i style={{ background: '#9a9da3' }} />
              <b ref={(el) => (foot.current.blocked = el)}>0</b> Blocked
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

function Official() {
  const root = useRef(null)
  const [load, setLoad] = useState(false)
  useEffect(
    () =>
      onFrame((f) => {
        if (!load && f.P > story.scenes.find((s) => s.id === 'os').start - 2.5) setLoad(true)
      }),
    [load],
  )
  useScene('os', (st) => {
    const o = band(st.u, 0.58, 0.66, 0.94, 1)
    root.current.style.opacity = o
    root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
  })
  return (
    <div className="official" ref={root}>
      <figure>
        <div className="official-frame" style={{ aspectRatio: '820 / 474' }}>{load && <img src={ASSETS.cctv} alt="Shire's camera view: existing CCTV feeds with each table outlined and labelled clean, occupied or dirty" width="820" height="474" decoding="async" />}</div>
        <figcaption>
          <b>What the cameras see</b> Every table outlined and labelled, on the CCTV you already have.
        </figcaption>
      </figure>
      <span className="official-arrow" aria-hidden="true" />
      <figure>
        <div className="official-frame" style={{ aspectRatio: '820 / 474' }}>{load && <img src={ASSETS.host} alt="Shire Host floor map updating table and seating status" width="800" height="600" decoding="async" />}</div>
        <figcaption>
          <b>What your host sees</b> Live table states · balanced sections · smarter seating
        </figcaption>
      </figure>
    </div>
  )
}

function OS() {
  return (
    <Scene id="os" label="From the floor to Shire">
      <HostUI />
      <div className="copy copy-center copy-top">
        <Beat at="0.03 0.1 0.2 0.26" as="p" className="display display-sm">
          The table disappears. Its state stays.
        </Beat>
        <Beat at="0.3 0.36 0.5 0.56" as="h2" className="display display-sm sans">
          Your floor, the way your team sees it.
        </Beat>
        <Beat at="0.58 0.64 0.94 1" as="h2" className="display display-sm sans">
          This is Shire, in service.
        </Beat>
      </div>
      <Official />
    </Scene>
  )
}

// ---------------------------------------------------------------- 13 · ask
const ASK = {
  menu: {
    tab: 'Menu',
    sub: 'Menu performance',
    q: 'Which menu items are slowing down service, and what should I change?',
    steps: ['Comparing item-level prep times across recent dinner rushes', 'Reviewing kitchen movement, ticket times, and handoff delays', 'Checking margin and repeat-order performance before recommending a change'],
    title: 'Dinner bottleneck found',
    lead: 'Pork shoulder bowls are adding the most avoidable time during the dinner rush.',
    rows: [
      ['Slowest window', '6:30–8:00 PM'],
      ['Average delay', '+6 minutes per ticket'],
      ['Primary constraint', 'Protein prep before the line'],
    ],
    after: 'Recommended change',
    recs: [
      ['What to change', 'Prep the pork sous-vide before service and move garnish beside expo.'],
      ['Expected impact', 'Shorter handoffs without changing the recipe or adding labor.'],
    ],
    pins: [
      { at: [0, 1.3, -8.6], text: 'Slowest window · 6:30–8:00 PM' },
      { at: [-2.6, 1.2, -11.0], text: '+6 minutes per ticket' },
      { at: [2.8, 1.1, -12.6], text: 'Protein prep before the line' },
    ],
  },
  labor: {
    tab: 'Labor',
    sub: 'Labor planning',
    q: 'How should I staff Friday’s rush?',
    steps: null,
    title: 'Friday rush coverage',
    lead: 'Demand will peak from 6:30–8:15 PM, when your current plan is short one prep cook.',
    rows: [
      ['Peak demand', '6:30–8:15 PM'],
      ['Strongest floor lead', 'Angelica'],
      ['Coverage gap', 'Prep after 7:00 PM'],
    ],
    after: 'Shift preparation',
    recs: [
      ['Staffing alert', 'Your baseline schedule is safe until dinner demand accelerates.'],
      ['Recommendation', 'Move Angelica to 6:00 PM and add one prep cook from 5:30–8:30 PM.'],
    ],
    pins: [
      { at: [0.5, 1.1, -12.6], text: 'Coverage gap · prep after 7:00 PM' },
      { at: [-3, 1.0, -1.5], text: 'Peak demand · 6:30–8:15 PM' },
    ],
  },
  sales: {
    tab: 'Sales',
    sub: 'Tomorrow’s forecast',
    q: 'What are my projected sales for tomorrow, and how should I prepare?',
    steps: ['Analyzing recent weekday sales and week-over-week trends', 'Comparing reservations, local events, and tomorrow’s weather', 'Calculating the safest labor-to-sales coverage for each hour'],
    title: 'Tomorrow’s revenue forecast',
    lead: 'Shire projects $8,040 in sales, about 15% above your weekday average.',
    rows: [
      ['Projected sales', '$8,040'],
      ['Expected lift', '+15%'],
      ['Peak window', '5:00–8:00 PM'],
    ],
    after: 'Shift preparation',
    recs: [
      ['What’s driving it', 'Warm weather and a nearby concert are raising reservations and walk-in demand.'],
      ['Recommendation', 'Add one server for the dinner spike from 5:00–8:00 PM.'],
    ],
    pins: [
      { at: [STATIONS.hostStand[0], 1.4, STATIONS.hostStand[1]], text: 'Peak window · 5:00–8:00 PM' },
      { at: [-12.4, 1.2, 6.4], text: 'Expected lift · +15%' },
    ],
  },
}

function Ops() {
  const [tab, setTab] = useState('menu')
  const root = useRef(null)
  const stepsRef = useRef([])
  const think = useRef(null)
  const ans = useRef(null)
  const pins = useRef([])
  const d = ASK[tab]
  const choose = (k) => {
    UI.askTab = k
    setTab(k)
  }
  useScene(
    'ask',
    (st) => {
      const o = band(st.u, 0.16, 0.24, 0.9, 0.97)
      root.current.style.opacity = o
      root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      const steps = d.steps || []
      steps.forEach((_, i) => {
        const el = stepsRef.current[i]
        if (!el) return
        const k = ss(0.28 + i * 0.06, 0.32 + i * 0.06, st.u)
        el.style.opacity = 0.25 + 0.75 * k
        el.classList.toggle('is-done', k > 0.95)
      })
      const done = ss(0.47, 0.52, st.u)
      think.current.classList.toggle('is-done', done > 0.5)
      ans.current.style.opacity = done
      ans.current.style.transform = `translate3d(0,${((1 - done) * 10).toFixed(1)}px,0)`
      // the restaurant answers too
      const W = R.world
      const P = { x: 0, y: 0, z: 0, vis: false }
      d.pins.forEach((p, i) => {
        const el = pins.current[i]
        if (!el || !W) return
        const k = band(st.u, 0.54 + i * 0.03, 0.6 + i * 0.03, 0.9, 0.97)
        el.style.opacity = k
        el.style.visibility = k < 0.01 ? 'hidden' : 'visible'
        W.project(p.at[0], p.at[1], p.at[2], P)
        el.style.transform = `translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`
      })
    },
    [tab],
  )
  return (
    <>
      <div className="askpins" aria-hidden="true">
        {d.pins.map((p, i) => (
          <div key={tab + i} className="askpin" ref={(el) => (pins.current[i] = el)}>
            <i />
            <span>{p.text}</span>
          </div>
        ))}
      </div>
      <div className="ui-card ops" ref={root}>
        <div className="ops-tabs" role="tablist" aria-label="Example questions">
          {Object.entries(ASK).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => choose(k)}>
              {v.tab}
            </button>
          ))}
        </div>
        <div className="ops-head">
          <span className="ops-av">S</span>
          <span>
            <b>Shire Operations</b>
            <em>{d.sub}</em>
          </span>
          <span className="ops-live">4 sources live</span>
        </div>
        <div className="ops-body">
          <p className="ops-q">{d.q}</p>
          <div className="ops-think" ref={think}>
            <div className="ops-think-h">
              <span className="ops-dots" />
              <span className="ops-thinking">Thinking…</span>
              <span className="ops-done">3 steps completed</span>
            </div>
            {d.steps && (
              <ol>
                {d.steps.map((s, i) => (
                  <li key={s} ref={(el) => (stepsRef.current[i] = el)}>
                    {s}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="ops-ans" ref={ans}>
            <h4>{d.title}</h4>
            <p>{d.lead}</p>
            <table>
              <tbody>
                {d.rows.map(([a, b]) => (
                  <tr key={a}>
                    <th>{a}</th>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h5>{d.after}</h5>
            {d.recs.map(([a, b]) => (
              <p key={a} className="ops-rec">
                <b>{a}:</b> {b}
              </p>
            ))}
          </div>
        </div>
        <div className="ops-foot">Example from Shire Operations</div>
      </div>
    </>
  )
}

function Ask() {
  return (
    <Scene id="ask" label="Ask your restaurant">
      <div className="copy copy-left">
        <div className="stack">
          <Beat at="0.03 0.1 0.84 0.9" as="h2" className="display display-sm sans">
            Find opportunity hiding in every shift.
          </Beat>
          <Beat at="0.08 0.16 0.84 0.9" as="p" className="lede">
            Shire combines visual activity, POS, reservation, and staffing data to explain what's slowing the restaurant down, and what to change.
          </Beat>
        </div>
        <Beat at="0.86 0.91 0.99 1" as="figure" className="quote">
          <blockquote>"Shire caught little menu patterns we would've missed. A couple cents per cover sounds tiny until you realize how many covers you do in a month."</blockquote>
          <figcaption>
            Joey F. <span>Vine Bistro</span>
          </figcaption>
        </Beat>
      </div>
      <Ops />
    </Scene>
  )
}

export function Systems() {
  return (
    <>
      <System />
      <OS />
      <Ask />
    </>
  )
}
