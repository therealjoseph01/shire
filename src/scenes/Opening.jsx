// Scenes 1–4: the room on its own. No Shire yet. Only what anyone could notice, and the limits of the POS.
import { useEffect, useRef } from 'react'
import { Scene, Beat, useScene } from '../ui/Scene.jsx'
import { Captions } from '../overlay/Captions.jsx'
import { q, R, fmtClock, onFrame } from '../story/runtime.js'
import { ss, band } from '../story/story.js'
import { TABLE_BY_ID, STATIONS, CAMERAS, SECTION_TABLES, SERVERS } from '../sim/layout.js'

const mins = (m) => {
  const n = Math.max(1, Math.round(m))
  return n === 1 ? 'a minute' : `${n} minutes`
}

// What a person standing in the room could notice, if they happened to look.
function noticeables(c) {
  const all = q.allTables(c)
  const by = (key) => all.filter((x) => x.key === key).sort((a, b) => a.since - b.since)[0]
  const out = []
  const ng = by('notGreeted')
  if (ng) out.push({ id: 'ng', t: ng.table, text: `Seated ${mins(c - ng.since)} ago. No one's been by.` })
  const wc = by('waitingCheck')
  if (wc) out.push({ id: 'wc', t: wc.table, text: `Finished ${mins(c - wc.since)} ago. Still no check.` })
  const d = by('dirty')
  if (d) out.push({ id: 'd', t: d.table, text: `They left ${mins(c - d.since)} ago. The plates are still there.` })
  const ro = by('readyToOrder')
  if (ro) out.push({ id: 'ro', t: ro.table, text: 'Menus closed. Ready to order.' })
  return out
}

function Service() {
  return (
    <Scene id="service" label="Dinner service">
      <div className="copy copy-left">
        <div className="stack">
          <Beat at="-1 0 0.5 0.7" className="eyebrow">
            Friday · Dinner service
          </Beat>
          <Beat at="-1 0 0.55 0.75" as="h1" className="display">
            Your restaurant is already telling you what's happening.
          </Beat>
          <Beat at="-1 0 0.3 0.5" className="scroll-cue">
            <span>Scroll to run the service</span>
            <i />
          </Beat>
        </div>
      </div>
    </Scene>
  )
}

function Rush() {
  const pick = (st) => {
    const c = st.clock
    const items = noticeables(c)
    const load = q.sectionLoad(c)
    const vals = SERVERS.map((s) => [s, load[s.id].active])
    vals.sort((a, b) => b[1] - a[1])
    const [hi, lo] = [vals[0], vals[vals.length - 1]]
    const waiting = q.waitingAt(c)
    const out = []
    const show = [0.2, 0.32, 0.44, 0.56]
    items.slice(0, 3).forEach((it, k) => {
      out.push({ x: it.t.x, z: it.t.z, y: 1.15, text: it.text, o: band(st.u, show[k], show[k] + 0.06, 0.9, 0.97) })
    })
    if (waiting.length >= 2)
      out.push({
        x: STATIONS.hostStand[0] - 0.8,
        z: STATIONS.hostStand[1] - 1.6,
        y: 1.7,
        text: `${waiting.length} parties waiting. The host has a guess.`,
        o: band(st.u, 0.6, 0.66, 0.9, 0.97),
      })
    if (hi[1] - lo[1] >= 2) {
      const ids = SECTION_TABLES[hi[0].id]
      const cx = ids.reduce((a, id) => a + TABLE_BY_ID[id].x, 0) / ids.length
      const cz = ids.reduce((a, id) => a + TABLE_BY_ID[id].z, 0) / ids.length
      out.push({ x: cx, z: cz, y: 0.4, lift: 36, text: `${hi[0].name} has ${hi[1]} tables. ${lo[0].name} has ${lo[1]}.`, o: band(st.u, 0.7, 0.76, 0.9, 0.97) })
    }
    return out
  }
  return (
    <Scene id="rush" label="The dinner rush">
      <div className="copy copy-left">
        <Beat at="0.02 0.08 0.18 0.26" as="h2" className="display">
          Then the rush.
        </Beat>
        <Beat at="0.78 0.84 0.95 1" as="p" className="lede">
          A dinner rush is a hundred small moments at once. Nobody on the floor can see all of them.
        </Beat>
      </div>
      <Captions scene="rush" pick={pick} max={5} />
    </Scene>
  )
}

function PosPanel() {
  const list = useRef(null)
  const root = useRef(null)
  useScene('pos', (st) => {
    const o = band(st.u, 0.16, 0.24, 0.5, 0.58)
    root.current.style.opacity = o
    root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    if (o < 0.01) return
    const ev = q.posEvents(st.clock, 7)
    const html = ev
      .map((e) => {
        const t = `T${e.table.slice(1)}`
        const what = e.kind === 'order' ? `Order sent · ${q_items(e)} items` : e.kind === 'check' ? `Check printed` : `Payment`
        const amt = e.kind === 'order' ? '' : `$${e.total.toFixed(2)}`
        return `<li><time>${fmtClock(e.t)}</time><b>${t}</b><span>${what}</span><em>${amt}</em></li>`
      })
      .join('')
    if (list.current._h !== html) {
      list.current.innerHTML = html
      list.current._h = html
    }
  })
  return (
    <div className="pos" ref={root} aria-hidden="true">
      <div className="pos-head">
        <span>POS</span>
        <span>Transactions</span>
      </div>
      <ul ref={list} />
      <div className="pos-foot">Orders · Checks · Payments</div>
    </div>
  )
}
const q_items = (e) => e.items

function Pos() {
  const pick = (st) => {
    if (st.u < 0.56) return []
    const items = noticeables(st.clock)
    const txt = {
      ng: 'seated, not greeted',
      wc: 'finished, waiting on the check',
      d: 'empty, still dirty',
      ro: 'menus closed',
    }
    const out = items.map((it, k) => ({ x: it.t.x, z: it.t.z, y: 1.15, lift: 48, text: txt[it.id], o: band(st.u, 0.6 + k * 0.05, 0.66 + k * 0.05, 0.93, 0.99) }))
    const waiting = q.waitingAt(st.clock)
    if (waiting.length)
      out.push({ x: STATIONS.hostStand[0] - 0.8, z: STATIONS.hostStand[1] - 1.4, y: 1.6, lift: 44, text: `${waiting.length} parties at the door`, o: band(st.u, 0.8, 0.86, 0.93, 0.99) })
    return out
  }
  return (
    <Scene id="pos" label="What your POS can't see">
      <PosPanel />
      <div className="copy copy-right">
        <Beat at="0.2 0.27 0.46 0.53" as="p" className="display display-sm">
          Your POS knows what gets entered into it.
        </Beat>
        <Beat at="0.62 0.7 0.92 0.99" as="p" className="display display-sm">
          Everything else happens out on the floor.
        </Beat>
      </div>
      <Captions scene="pos" pick={pick} max={5} variant="cap-quiet" />
    </Scene>
  )
}

export function CameraLabels() {
  const root = useRef(null)
  useEffect(() => {
    const els = [...root.current.children]
    const P = { x: 0, y: 0, z: 0, vis: false }
    let hidden = false
    return onFrame((st) => {
      const W = R.world
      const id = st.scene.id
      const on = id === 'cameras' || id === 'wake'
      if (!W || !on) {
        if (!hidden) els.forEach((el) => (el.style.visibility = 'hidden'))
        hidden = true
        return
      }
      hidden = false
      CAMERAS.forEach((cam, i) => {
        const r = st.layer.camReveal[i] * (id === 'wake' ? 1 - ss(0.1, 0.35, st.u) : 1)
        const el = els[i]
        el.style.opacity = r
        el.style.visibility = r < 0.01 ? 'hidden' : 'visible'
        if (r < 0.01) return
        W.project(cam.pos[0], cam.pos[1] + 0.1, cam.pos[2], P)
        el.style.transform = `translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`
      })
    })
  }, [])
  return (
    <div className="camlabels" ref={root} aria-hidden="true">
      {CAMERAS.map((c) => (
        <div key={c.id} className="camlabel">
          <i />
          Camera {c.id}
        </div>
      ))}
    </div>
  )
}

function Cameras() {
  return (
    <Scene id="cameras" label="The cameras are already there">
      <div className="copy copy-left copy-bottom">
        <Beat at="0 0.05 0.24 0.3" as="h2" className="display sans">
          Shire knows what's actually happening.
        </Beat>
        <div className="stack">
          <Beat at="0.3 0.37 0.95 1" as="p" className="display display-sm">
            The cameras are already there.
          </Beat>
          <Beat at="0.56 0.64 0.95 1" as="p" className="lede">
            Shire works through the CCTV you already have. No new cameras, and no staff tapping screens to keep the floor updated.
          </Beat>
        </div>
      </div>
    </Scene>
  )
}

export function Opening() {
  return (
    <>
      <Service />
      <Rush />
      <Pos />
      <Cameras />
    </>
  )
}
