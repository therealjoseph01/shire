// Shire's labels. They're pinned to tables (never to people), and every word comes from the table's state at this minute.
import { useEffect, useRef } from 'react'
import { TABLES, SERVERS, SECTION_TABLES, TABLE_BY_ID } from '../sim/layout.js'
import { STATE_COLORS } from '../three/colors.js'
import { onFrame, q, R } from '../story/runtime.js'

export function dur(min) {
  if (min < 1) return `${Math.max(5, Math.round((min * 60) / 5) * 5)}s`
  return `${Math.floor(min)} min`
}

export function stateLine(st, clock) {
  const t = dur(Math.max(0, clock - st.since))
  switch (st.key) {
    case 'seating':
      return 'Seating'
    case 'seated':
    case 'notGreeted':
      return `Seated · ${t}`
    case 'browsing':
      return 'Greeted · menus open'
    case 'readyToOrder':
      return `Menus closed · ${t}`
    case 'ordered':
      return 'Order in'
    case 'dining':
      return 'Dining'
    case 'waitingCheck':
      return `Meal finished · ${t}`
    case 'checkDropped':
      return 'Check dropped'
    case 'paid':
      return 'Paid'
    case 'dirty':
      return `Party left · ${t}`
    case 'bussing':
      return 'Bussing'
    case 'reset':
    case 'readyNext':
      return 'Reset complete'
    default:
      return 'Open'
  }
}

export function Tags() {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current
    const P = { x: 0, y: 0, z: 0, vis: false }
    const tags = TABLES.map((t) => {
      const el = document.createElement('div')
      el.className = 'tag'
      el.innerHTML = `<span class="tag-pin"></span><span class="tag-body"><i class="tag-dot"></i><b class="tag-id">T${String(t.num).padStart(2, '0')}</b><span class="tag-more"><span class="tag-line"></span><span class="tag-flag"></span></span></span>`
      root.appendChild(el)
      return {
        t,
        el,
        body: el.querySelector('.tag-body'),
        more: el.querySelector('.tag-more'),
        line: el.querySelector('.tag-line'),
        flag: el.querySelector('.tag-flag'),
        dot: el.querySelector('.tag-dot'),
        s: { line: '', flag: '', cat: '', full: -1, o: -1, x: 0, y: 0, z: 0 },
      }
    })
    const secs = SERVERS.map((sv) => {
      const el = document.createElement('div')
      el.className = 'sec'
      el.innerHTML = `<i style="background:${sv.color}"></i><b>${sv.name}</b><span class="sec-n"></span><em class="sec-next">Next party</em>`
      root.appendChild(el)
      const ids = SECTION_TABLES[sv.id]
      const cx = ids.reduce((a, id) => a + TABLE_BY_ID[id].x, 0) / ids.length
      const cz = ids.reduce((a, id) => a + TABLE_BY_ID[id].z, 0) / ids.length
      return { sv, el, n: el.querySelector('.sec-n'), next: el.querySelector('.sec-next'), cx, cz, s: { n: '', o: -1, next: null } }
    })

    return onFrame((f) => {
      const T = f.tags
      const W = R.world
      if (!W || T.amount < 0.003) {
        if (root.style.opacity !== '0') root.style.opacity = '0'
        return
      }
      root.style.opacity = '1'
      const c = f.clock
      // who gets a full label: tables that need something, longest wait first
      const states = tags.map((g) => ({ g, st: q.tableState(g.t.id, c) }))
      const flagged = states.filter((x) => x.st.flag && x.st.key !== 'readyNext').sort((a, b) => a.st.since - b.st.since)
      const fullSet = new Set(flagged.slice(0, f.portrait ? Math.min(3, T.max) : T.max).map((x) => x.g.t.id))
      for (const { g, st } of states) {
        const id = g.t.id
        let full
        let o
        if (T.focus) {
          full = id === T.focus ? 1 : fullSet.has(id) ? T.full : 0
          o = id === T.focus ? T.amount : T.amount * Math.max(T.compact * 0.7, full)
        } else {
          full = fullSet.has(id) ? T.full : 0
          o = T.amount * Math.max(full, T.compact * (f.portrait ? 0.75 : 1))
        }
        W.project(g.t.x, 1.22, g.t.z, P)
        if (!P.vis) o = 0
        const s = g.s
        const or = Math.round(o * 100) / 100
        if (or !== s.o) {
          g.el.style.opacity = or
          g.el.style.visibility = or < 0.01 ? 'hidden' : 'visible'
          s.o = or
        }
        if (or < 0.01) continue
        g.el.style.transform = `translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`
        const z = Math.round((1 - P.z) * 10000)
        if (z !== s.z) {
          g.el.style.zIndex = z
          s.z = z
        }
        const fr = full > 0.5 ? 1 : 0
        if (fr !== s.full) {
          g.el.classList.toggle('is-full', !!fr)
          s.full = fr
        }
        if (fr) {
          const line = stateLine(st, c)
          if (line !== s.line) {
            g.line.textContent = line
            s.line = line
          }
          const flag = st.flag || ''
          if (flag !== s.flag) {
            g.flag.textContent = flag
            g.el.classList.toggle('has-flag', !!flag)
            s.flag = flag
          }
        }
        if (st.cat !== s.cat) {
          g.dot.style.background = STATE_COLORS[st.cat]
          s.cat = st.cat
        }
      }
      // sections
      const load = T.sections > 0.01 ? q.sectionLoad(c) : null
      let lightest = null
      if (load) {
        lightest = SERVERS.map((s) => s.id).sort((a, b) => load[a].active - load[b].active || load[a].active / load[a].tables - load[b].active / load[b].tables)[0]
      }
      const heaviest = load ? SERVERS.map((s) => s.id).sort((a, b) => load[b].active - load[a].active)[0] : null
      for (const g of secs) {
        // on a phone, only the busiest and the lightest section get a label
        const show = !f.portrait || g.sv.id === lightest || g.sv.id === heaviest
        const o = show ? Math.round(T.sections * 100) / 100 : 0
        if (o !== g.s.o) {
          g.el.style.opacity = o
          g.el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
          g.s.o = o
        }
        if (o < 0.01) continue
        W.project(g.cx, 0.1, g.cz, P)
        g.el.style.transform = `translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`
        const L = load[g.sv.id]
        const n = `${L.active} of ${L.tables} tables`
        if (n !== g.s.n) {
          g.n.textContent = n
          g.s.n = n
        }
        const isNext = g.sv.id === lightest
        if (isNext !== g.s.next) {
          g.el.classList.toggle('is-next', isNext)
          g.s.next = isNext
        }
      }
    })
  }, [])
  return <div className="tags" ref={ref} aria-hidden="true" />
}
