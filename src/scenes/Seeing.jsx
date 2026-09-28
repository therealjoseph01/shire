// Scenes 5–8: Shire's layer appears. Table states, the whole floor, section load, and one table's whole evening.
import { useRef } from 'react'
import { Scene, Beat, useScene } from '../ui/Scene.jsx'
import { q, R, sim, story, fmtClock } from '../story/runtime.js'
import { ss, band } from '../story/story.js'
import { STATE_COLORS } from '../three/colors.js'
import { SERVER_BY_ID, TABLE_BY_ID, STATIONS } from '../sim/layout.js'

function Wake() {
  return (
    <Scene id="wake" label="Shire sees the floor">
      <div className="copy copy-left">
        <Beat at="0.03 0.1 0.34 0.42" as="h2" className="display">
          Then Shire sees it.
        </Beat>
        <Beat at="0.44 0.52 0.9 0.98" as="p" className="lede">
          Shire uses your existing cameras to update the live state of every table, automatically: seated, greeted, ready to order, waiting on the check, ready for bussing.
        </Beat>
      </div>
    </Scene>
  )
}

function Legend({ scene, at }) {
  const ref = useRef(null)
  const nums = useRef([])
  useScene(scene, (st) => {
    const [a, b, c, d] = at
    const o = band(st.u, a, b, c, d)
    ref.current.style.opacity = o
    ref.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    if (o < 0.01) return
    const n = q.counts(st.clock)
    const v = [n.open, n.seated, n.dirty, n.blocked]
    v.forEach((x, i) => {
      const el = nums.current[i]
      if (el && el.textContent !== String(x)) el.textContent = x
    })
  })
  const items = [
    ['Open', STATE_COLORS.open],
    ['Seated', STATE_COLORS.seated],
    ['Dirty', STATE_COLORS.dirty],
    ['Blocked', '#8a8f98'],
  ]
  return (
    <div className="legend" ref={ref} aria-hidden="true">
      {items.map(([l, col], i) => (
        <span key={l}>
          <i style={{ background: col }} />
          <b ref={(el) => (nums.current[i] = el)}>0</b> {l}
        </span>
      ))}
    </div>
  )
}

function Floor() {
  return (
    <Scene id="floor" label="See the whole floor">
      <div className="copy copy-left">
        <div className="stack">
          <Beat at="0.04 0.14 0.86 0.96" as="h2" className="display sans">
            See what's happening on the floor.
          </Beat>
          <Beat at="0.2 0.3 0.86 0.96" as="p" className="lede">
            Every table has a state, and nobody had to enter it.
          </Beat>
        </div>
      </div>
      <Legend scene="floor" at={[0.1, 0.2, 0.9, 1]} />
    </Scene>
  )
}

// Shire Host's waitlist card, with the party that just walked in.
function WaitCard() {
  const root = useRef(null)
  const refs = useRef({})
  const P = { x: 0, y: 0, z: 0, vis: false }
  const hero = sim.hero
  useScene('load', (st) => {
    const c = st.clock
    const vis = c >= hero.standAt - 0.1 && c < hero.seatedAt + 0.5
    const o = vis ? band(st.u, 0.02, 0.06, 0.95, 1) * (1 - ss(hero.seatedAt - 0.1, hero.seatedAt + 0.5, c)) * ss(hero.standAt - 0.1, hero.standAt + 0.25, c) : 0
    root.current.style.opacity = o
    root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    if (o < 0.01 || !R.world) return
    R.world.project(STATIONS.hostStand[0] + 0.4, 1.6, STATIONS.hostStand[1] - 0.2, P)
    const x = Math.min(R.vw - 300, Math.max(16, P.x - 40))
    const y = Math.max(90, P.y - 250)
    root.current.style.transform = `translate3d(${x.toFixed(0)}px,${y.toFixed(0)}px,0)`
    const w = Math.max(0, c - hero.standAt)
    const t = w < 1 ? `${Math.round(w * 60)}s` : `${Math.floor(w)}m`
    if (refs.current.wait.textContent !== t) refs.current.wait.textContent = t
    const picked = c >= hero.pickAt
    root.current.classList.toggle('is-seating', picked)
  })
  const sv = SERVER_BY_ID[hero.server]
  const tnum = String(TABLE_BY_ID[hero.table].num).padStart(2, '0')
  return (
    <div className="ui-card waitcard" ref={root} aria-hidden="true">
      <div className="wc-sug">
        <span className="wc-spark">✦</span> Suggested T{tnum}
      </div>
      <div className="wc-fit">
        Fits {hero.size} · {sv.name} next
      </div>
      <div className="wc-row">
        <span className="wc-name">{hero.name}</span>
        <span className="wc-pill wc-arrived">Arrived</span>
      </div>
      <div className="wc-meta">
        <span>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.5 13c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>{' '}
          {hero.size}
        </span>
        <span>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.5V8l2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>{' '}
          <b ref={(el) => (refs.current.wait = el)}>0s</b>
        </span>
        <span className="wc-seat">Seat</span>
      </div>
    </div>
  )
}

function Load() {
  const hero = sim.hero
  const sv = SERVER_BY_ID[hero.server]
  return (
    <Scene id="load" label="Server load">
      <div className="copy copy-left">
        <div className="stack">
          <Beat at="0.02 0.1 0.9 0.98" as="h2" className="display sans">
            Stop guessing. Seat smarter.
          </Beat>
          <div className="swap">
            <Beat at="0.12 0.2 0.5 0.58" as="p" className="lede">
              Shire balances covers across servers and prevents double-seating, which keeps sections fair, guests moving, and staff happy.
            </Beat>
            <Beat at="0.62 0.7 0.9 0.98" as="p" className="lede">
              A party of {hero.size} goes to {sv.name}, who has room, instead of the table nearest the door.
            </Beat>
          </div>
        </div>
      </div>
      <WaitCard />
    </Scene>
  )
}

// One table's whole evening, stamped by what saw it happen.
function Rail() {
  const hero = sim.hero
  const list = sim.byTable[hero.table]
  const next = list[list.indexOf(hero) + 1]
  const rows = [
    ['Open', 'reset complete', 'camera', hero.pickAt - 0.2],
    ['Party arrives', `party of ${hero.size} · waitlist`, 'host', hero.standAt],
    ['Seated', 'table occupied', 'camera', hero.seatedAt],
    ['Waiting for a greeting', 'no visit detected', 'camera', hero.seatedAt + 0.6],
    ['Greeted', 'visit detected', 'camera', hero.greetedAt],
    ['Ready to order', 'menus closed', 'camera', hero.readyAt],
    ['Ordered', 'order sent', 'POS', hero.orderedAt],
    ['Dining', 'occupied', 'camera', hero.foodAt],
    ['Waiting on check', 'meal finished', 'camera', hero.finishAt],
    ['Check dropped', 'check printed', 'POS', hero.checkAt],
    ['Paid', 'check closed', 'POS', hero.paidAt],
    ['Left', 'table empty', 'camera', hero.leaveAt],
    ['Ready for bussing', 'table dirty', 'camera', hero.leaveAt + 0.05],
    ['Bussed', 'table clean', 'camera', hero.bussedAt],
    ['Next party', next ? `party of ${next.size}` : 'seated', 'host', next ? next.seatedAt : hero.availableAt + 1],
  ]
  const root = useRef(null)
  const lis = useRef([])
  const fill = useRef(null)
  const last = useRef(-2)
  useScene('journey', (st) => {
    const o = band(st.u, 0.06, 0.14, 0.86, 0.94)
    root.current.style.opacity = o
    root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    if (o < 0.01) return
    const c = st.clock
    let cur = -1
    rows.forEach((r, i) => {
      if (c >= r[3]) cur = i
    })
    if (cur !== last.current) {
      lis.current.forEach((li, i) => {
        li.classList.toggle('is-past', i < cur)
        li.classList.toggle('is-now', i === cur)
      })
      last.current = cur
      if (R.frame.portrait) root.current.style.setProperty('--shift', `${Math.max(0, cur - 1) * -45.5}px`)
    }
    fill.current.style.transform = `scaleY(${Math.max(0, cur) / (rows.length - 1)})`
  })
  return (
    <div className="rail" ref={root} aria-hidden="true">
      <div className="rail-head">
        <span>
          Table {String(TABLE_BY_ID[hero.table].num).padStart(2, '0')}
        </span>
        <span>{hero.name} · {hero.size}</span>
      </div>
      <div className="rail-list">
      <ol>
        <span className="rail-track">
          <i ref={fill} />
        </span>
        {rows.map((r, i) => (
          <li key={r[0]} ref={(el) => (lis.current[i] = el)}>
            <i />
            <b>{r[0]}</b>
            <span>{r[1]}</span>
            <em>{r[2]}</em>
            <time>{fmtClock(r[3])}</time>
          </li>
        ))}
      </ol>
      </div>
    </div>
  )
}

function Journey() {
  return (
    <Scene id="journey" label="One table, full journey">
      <div className="copy copy-right copy-top">
        <Beat at="0.03 0.1 0.4 0.48" as="h2" className="display display-sm sans">
          From the moment a guest sits down to the second they're ready to pay.
        </Beat>
        <Beat at="0.5 0.58 0.8 0.86" as="p" className="lede">
          The cameras cover what happens at the table. The POS covers what gets rung in. Shire puts the two together, and nobody updates the floor by hand.
        </Beat>
        <Beat at="0.88 0.93 0.99 1" as="p" className="display display-sm">
          Now picture every table, all night.
        </Beat>
      </div>
      <Rail />
    </Scene>
  )
}

export function Seeing() {
  return (
    <>
      <Wake />
      <Floor />
      <Load />
      <Journey />
    </>
  )
}
