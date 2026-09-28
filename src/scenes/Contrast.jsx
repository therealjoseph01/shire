// Scenes 9–10: the same room, the same staff. Shire off, then on again.
import { useRef } from 'react'
import { Scene, Beat, useScene } from '../ui/Scene.jsx'
import { Captions } from '../overlay/Captions.jsx'
import { q, story, sim } from '../story/runtime.js'
import { band, ss } from '../story/story.js'
import { STATIONS, TABLE_BY_ID, SERVER_BY_ID } from '../sim/layout.js'

const NICE = {
  notGreeted: 'not greeted',
  readyToOrder: 'ready to order',
  waitingCheck: 'waiting on the check',
  dirty: 'still dirty',
  reset: 'clean, nobody told the host',
}

function Without() {
  const pick = (st) => {
    const c = st.clock
    const flagged = q
      .allTables(c)
      .filter((x) => NICE[x.key] && c - x.since > 0.8)
      .sort((a, b) => a.since - b.since)
    const out = flagged.slice(0, 7).map((x, k) => ({
      x: x.table.x,
      z: x.table.z,
      y: 1.1,
      lift: 40 + (k % 2) * 14,
      text: `T${String(x.table.num).padStart(2, '0')} · ${NICE[x.key]} · ${Math.max(1, Math.floor(c - x.since))} min`,
      o: band(st.u, 0.34 + k * 0.05, 0.4 + k * 0.05, 0.94, 1),
    }))
    const w = q.waitingAt(c)
    if (w.length)
      out.push({
        x: STATIONS.hostStand[0] - 0.8,
        z: STATIONS.hostStand[1] - 1.4,
        y: 1.6,
        lift: 44,
        text: `${w.length} ${w.length === 1 ? 'party' : 'parties'} waiting at the door`,
        o: band(st.u, 0.42, 0.48, 0.94, 1),
      })
    return out
  }
  return (
    <Scene id="without" label="Without Shire">
      <div className="copy copy-center">
        <Beat at="0.04 0.12 0.36 0.46" as="h2" className="display display-xl">
          Without Shire.
        </Beat>
      </div>
      <div className="copy copy-left copy-bottom">
        <Beat at="0.5 0.58 0.9 0.98" as="p" className="lede">
          Same staff, same night. Everything still gets done, just later, and in whatever order someone happens to notice it.
        </Beat>
      </div>
      <Captions scene="without" pick={pick} max={8} variant="cap-neutral" />
    </Scene>
  )
}

const KIND = {
  greet: ['Attention', (n) => `Table ${n} has not been greeted`, (k, m) => `Seated ${m}m ago · no visit detected`, 'Server'],
  order: ['Order', (n) => `Table ${n} ready to order`, (k, m, s) => `Menus closed · ${s}`, 'Server'],
  check: ['Check', (n) => `Table ${n} waiting on check`, (k, m) => `Meal finished · ${m}m waiting`, 'Server'],
  buss: ['Ready', (n) => `Table ${n} ready for bussing`, (k, m) => `Party left · ${m}m ago`, 'Busser'],
  reset: ['Seating', (n) => `Table ${n} ready for next party`, () => 'Reset complete', 'Host'],
}

function Board() {
  const root = useRef(null)
  const listRef = useRef(null)
  const counts = useRef([])
  const since = story.onAgain - 0.4
  useScene('with', (st) => {
    const o = band(st.u, 0.08, 0.16, 0.9, 0.98)
    root.current.style.opacity = o
    root.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    if (o < 0.01) return
    const c = st.clock
    const tasks = q
      .taskBoard(c)
      .filter((k) => KIND[k.kind] && (k.endAt ?? Infinity) >= since && k.needAt <= c && k.notice <= Math.max(c, story.onAgain + 0.2))
    const sug = tasks.filter((k) => k.status === 'suggested').sort((a, b) => a.needAt - b.needAt)
    const asg = tasks.filter((k) => k.status === 'assigned').sort((a, b) => a.needAt - b.needAt)
    const done = tasks.filter((k) => k.status === 'completed').sort((a, b) => b.endAt - a.endAt)
    const n = [sug.length, asg.length, done.length]
    n.forEach((v, i) => {
      if (counts.current[i] && counts.current[i].textContent !== String(v)) counts.current[i].textContent = v
    })
    // keep the list varied: at most two of any one kind of task
    const show = []
    const perKind = {}
    for (const k of [...sug, ...asg, ...done]) {
      if ((perKind[k.kind] || 0) >= 2) continue
      perKind[k.kind] = (perKind[k.kind] || 0) + 1
      show.push(k)
      if (show.length === 5) break
    }
    const html = show
      .map((k) => {
        const [tag, title, detail, role] = KIND[k.kind]
        const num = String(TABLE_BY_ID[k.table].num).padStart(2, '0')
        const upTo = k.status === 'suggested' ? c : k.startAt
        const w = Math.max(0, upTo - k.needAt)
        const m = Math.max(1, Math.round(w))
        const s = w < 1 ? `${Math.max(5, Math.round((w * 60) / 5) * 5)}s` : `${Math.floor(w)}m`
        const who = k.role === 'server' ? SERVER_BY_ID[k.agent]?.name : k.role === 'busser' ? 'Busser' : 'Host'
        const status = k.status === 'suggested' ? '' : k.status === 'assigned' ? `<span class="al-st al-asg">Assigned · ${who}</span>` : `<span class="al-st al-done">Completed</span>`
        return `<li class="al al-${k.status}"><span class="al-ic">${k.kind === 'greet' ? '!' : '·'}</span><span class="al-main"><em>${tag}</em><b>${title(num)}</b><span>${detail(k, m, s)}</span></span><span class="al-side"><span class="al-role">${role}</span>${status}</span></li>`
      })
      .join('')
    if (listRef.current._h !== html) {
      listRef.current.innerHTML = html
      listRef.current._h = html
    }
  })
  return (
    <div className="ui-card board" ref={root} aria-hidden="true">
      <div className="board-tabs">
        {['Suggested', 'Assigned', 'Completed'].map((t, i) => (
          <span key={t} className={i === 0 ? 'is-on' : ''}>
            {t} <b ref={(el) => (counts.current[i] = el)}>0</b>
          </span>
        ))}
      </div>
      <ul ref={listRef} />
    </div>
  )
}

function With() {
  return (
    <Scene id="with" label="With Shire">
      <div className="copy copy-left">
        <Beat at="0.02 0.08 0.3 0.36" as="h2" className="display display-xl sans">
          With Shire.
        </Beat>
        <div className="stack">
          <Beat at="0.36 0.43 0.68 0.74" as="h3" className="display display-sm sans">
            Guests will never sit idle.
          </Beat>
          <Beat at="0.4 0.47 0.68 0.74" as="p" className="lede">
            Shire detects when a guest needs attention and routes the right task to the right host, server, or busser before service slows down.
          </Beat>
        </div>
        <Beat at="0.76 0.82 0.96 1" as="figure" className="quote">
          <blockquote>"The biggest thing is we catch stuff earlier. Dirty tables and waiting guests don't sit there unnoticed like they used to."</blockquote>
          <figcaption>
            Denise A. <span>Mimosas Southern Kitchen and Grill</span>
          </figcaption>
        </Beat>
      </div>
      <Board />
    </Scene>
  )
}

export function Contrast() {
  return (
    <>
      <Without />
      <With />
    </>
  )
}
