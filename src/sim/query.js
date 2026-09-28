// Read-only views of the simulated evening at any clock time. Nothing here mutates the log.
import { TABLES, TABLE_BY_ID, QUEUE_SPOTS, STATIONS } from './layout.js'
import { along, pathLength, APPROACH } from './paths.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (v) => {
  v = clamp01(v)
  return v * v * (3 - 2 * v)
}

export function fmtClock(c) {
  const total = Math.round(c) + 17 * 60
  const h24 = Math.floor(total / 60) % 24
  const m = total % 60
  const h = ((h24 + 11) % 12) + 1
  return `${h}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`
}

export function makeQuery(sim) {
  const { parties, byTable, agents, pos, tasks } = sim

  // ---- tables ----
  const S = {
    open: { cat: 'open', label: 'Open' },
    seating: { cat: 'seated', label: 'Seating' },
    seated: { cat: 'seated', label: 'Seated' },
    notGreeted: { cat: 'seated', label: 'Seated', flag: 'Not greeted', need: 'greet' },
    browsing: { cat: 'seated', label: 'Greeted' },
    readyToOrder: { cat: 'seated', label: 'Seated', flag: 'Ready to order', need: 'order' },
    ordered: { cat: 'seated', label: 'Ordered' },
    dining: { cat: 'seated', label: 'Dining' },
    waitingCheck: { cat: 'seated', label: 'Dining', flag: 'Waiting on check', need: 'check' },
    checkDropped: { cat: 'seated', label: 'Check dropped' },
    paid: { cat: 'seated', label: 'Paid' },
    dirty: { cat: 'dirty', label: 'Dirty', flag: 'Ready for bussing', need: 'buss' },
    bussing: { cat: 'dirty', label: 'Bussing' },
    reset: { cat: 'open', label: 'Open', flag: 'Ready for next party', need: 'reset' },
    readyNext: { cat: 'open', label: 'Open', flag: 'Ready for next party' },
  }

  function partyAtTable(id, c) {
    const list = byTable[id]
    let found = null
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].pickAt <= c) {
        found = list[i]
        break
      }
    }
    return found
  }

  const stateCache = new Map()
  function tableState(id, c) {
    const p = partyAtTable(id, c)
    if (!p) return { key: 'open', ...S.open, since: 0, party: null }
    const done = (x) => x != null && c >= x
    let key
    let since
    if (!done(p.seatedAt)) [key, since] = ['seating', p.pickAt]
    else if (!done(p.greetedAt)) [key, since] = [c - p.seatedAt > 1.0 ? 'notGreeted' : 'seated', p.seatedAt]
    else if (!done(p.readyAt)) [key, since] = ['browsing', p.seatedAt]
    else if (!done(p.orderTakenAt)) [key, since] = ['readyToOrder', p.readyAt]
    else if (!done(p.foodAt)) [key, since] = ['ordered', p.orderTakenAt]
    else if (!done(p.finishAt)) [key, since] = ['dining', p.foodAt]
    else if (!done(p.checkAt)) [key, since] = ['waitingCheck', p.finishAt]
    else if (!done(p.paidAt)) [key, since] = ['checkDropped', p.checkAt]
    else if (!done(p.leaveAt)) [key, since] = ['paid', p.paidAt]
    else if (!done(p.bussStartAt)) [key, since] = ['dirty', p.leaveAt]
    else if (!done(p.bussedAt)) [key, since] = ['bussing', p.bussStartAt]
    else if (!done(p.availableAt)) [key, since] = ['reset', p.bussedAt]
    else if (c - p.availableAt < 2.2) [key, since] = ['readyNext', p.bussedAt]
    else [key, since] = ['open', p.availableAt]
    return { key, ...S[key], since, party: p }
  }

  function allTables(c) {
    return TABLES.map((t) => ({ table: t, ...tableState(t.id, c) }))
  }

  function counts(c) {
    const out = { open: 0, seated: 0, dirty: 0, blocked: 0 }
    for (const t of TABLES) out[tableState(t.id, c).cat]++
    return out
  }

  function sectionLoad(c) {
    const out = {}
    for (const t of TABLES) {
      const st = tableState(t.id, c)
      out[t.section] = out[t.section] || { active: 0, tables: 0, covers: 0 }
      out[t.section].tables++
      // a server's load is the tables with guests at them; a dirty table is the busser's
      if (st.cat === 'seated') {
        out[t.section].active++
        if (st.party) out[t.section].covers += st.party.size
      }
    }
    return out
  }

  // ---- agents ----
  function agentAt(agent, c, out = { x: 0, z: 0, walking: false, act: null, table: null }) {
    const segs = agent.segs
    let lo = 0
    let hi = segs.length - 1
    let idx = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (segs[mid].t0 <= c) {
        idx = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    out.walking = false
    out.act = null
    out.table = null
    if (idx < 0) {
      out.x = agent.home[0]
      out.z = agent.home[1]
      return out
    }
    const s = segs[idx]
    if (s.type === 'walk' && c < s.t1) {
      const p = along(s.path, (c - s.t0) / (s.t1 - s.t0), _tmp)
      out.x = p[0]
      out.z = p[1]
      out.walking = true
      out.act = s.act
      return out
    }
    out.x = s.end[0]
    out.z = s.end[1]
    if (s.type === 'stay' && c < s.t1) {
      out.act = s.act
      out.table = s.tableId
    }
    return out
  }
  const _tmp = [0, 0]

  // ---- guests ----
  // Calls fn(guest, x, z, mode, party) for every guest on the floor at clock c.
  // mode: 'walk' | 'stand' | 'sit'
  const _p = [0, 0]
  function forGuests(c, fn) {
    for (const p of parties) {
      if (c < p.arriveAt) continue
      const outEnd = p.leaveAt != null ? p.leaveAt + (p.outDur || 0.3) : Infinity
      if (c >= outEnd) continue
      if (p.seatedAt == null && c > 400) continue
      const tb = p.table ? TABLE_BY_ID[p.table] : null
      if (c < p.standAt) {
        // walking in
        const u = (c - p.arriveAt) / (p.standAt - p.arriveAt)
        const spot = queueSpot(p, p.standAt)
        const inLen = pathLength(p.inPath)
        const L2 = Math.hypot(spot[0] - p.inPath[p.inPath.length - 1][0], spot[1] - p.inPath[p.inPath.length - 1][1])
        const f = inLen / (inLen + L2)
        for (const g of p.guests) {
          const ug = clamp01(u - g.k * 0.035)
          let x
          let z
          if (ug < f) {
            along(p.inPath, ug / f, _p)
            x = _p[0]
            z = _p[1]
          } else {
            const w = (ug - f) / (1 - f)
            const d = p.inPath[p.inPath.length - 1]
            x = d[0] + (spot[0] - d[0]) * w
            z = d[1] + (spot[1] - d[1]) * w
          }
          const [ox, oz] = cluster(g.k, p.size)
          fn(g, x + ox * clamp01(ug * 3), z + oz * clamp01(ug * 3), 'walk', p)
        }
        continue
      }
      if (p.leadAt == null || c < p.leadAt) {
        const spot = p.pickAt != null && c >= p.pickAt ? p.queueSpot : queueSpot(p, c)
        for (const g of p.guests) {
          const [ox, oz] = cluster(g.k, p.size)
          fn(g, spot[0] + ox, spot[1] + oz, 'stand', p)
        }
        continue
      }
      if (c < p.seatedAt + 0.18) {
        // following the host to the table, then into chairs
        const leadDur = p.seatedAt - 0.12 - p.leadAt
        for (const g of p.guests) {
          const lag = 0.05 + g.k * 0.045
          const u = clamp01((c - p.leadAt - lag) / leadDur)
          const chair = seatFor(tb, g.k, p.size)
          if (u < 1) {
            along(p.leadPath, u, _p)
            const [ox, oz] = cluster(g.k, p.size)
            const k = u < 0.15 ? 1 - u / 0.15 : 0
            fn(g, _p[0] + ox * k, _p[1] + oz * k, 'walk', p)
          } else {
            const w = smooth((c - (p.leadAt + lag + leadDur)) / 0.14)
            const ap = APPROACH[p.table]
            fn(g, ap[0] + (chair[0] - ap[0]) * w, ap[1] + (chair[1] - ap[1]) * w, w > 0.85 ? 'sit' : 'walk', p)
          }
        }
        continue
      }
      if (c < p.leaveAt || p.leaveAt == null) {
        for (const g of p.guests) {
          const chair = seatFor(tb, g.k, p.size)
          fn(g, chair[0], chair[1], 'sit', p)
        }
        continue
      }
      // leaving
      const u = (c - p.leaveAt) / p.outDur
      for (const g of p.guests) {
        const ug = clamp01(u - g.k * 0.03)
        const chair = seatFor(tb, g.k, p.size)
        if (ug < 0.06) {
          const w = ug / 0.06
          const ap = APPROACH[p.table]
          fn(g, chair[0] + (ap[0] - chair[0]) * w, chair[1] + (ap[1] - chair[1]) * w, 'walk', p)
        } else {
          along(p.outPath, (ug - 0.06) / 0.94, _p)
          fn(g, _p[0], _p[1], 'walk', p)
        }
      }
    }
  }

  function queueIndexAt(p, c) {
    let k = 0
    for (const q of parties) {
      if (q === p || q.standAt == null) continue
      if (q.standAt >= p.standAt) continue
      if (q.arriveAt > c) continue
      // still waiting?
      const leftAt = q.leadAt ?? Infinity
      k += 1 - smooth((c - leftAt) / 0.3)
    }
    return k
  }
  function queueSpot(p, c) {
    const k = Math.min(QUEUE_SPOTS.length - 1, queueIndexAt(p, c))
    const i = Math.floor(k)
    const f = k - i
    const a = QUEUE_SPOTS[i]
    const b = QUEUE_SPOTS[Math.min(QUEUE_SPOTS.length - 1, i + 1)]
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
  }

  function waitingAt(c) {
    return parties.filter((p) => p.standAt != null && p.arriveAt <= c && (p.leadAt == null || c < p.leadAt))
  }

  // ---- misc ----
  function posEvents(c, n = 6) {
    const out = []
    for (let i = pos.length - 1; i >= 0 && out.length < n; i--) if (pos[i].t <= c) out.push(pos[i])
    return out
  }
  function passPlates(c) {
    let n = 0
    for (const p of parties) if (p.foodReadyAt != null && p.foodReadyAt <= c && (p.pickupAt == null || c < p.pickupAt)) n += p.size
    return n
  }
  // Tasks Shire would show as Suggested / Assigned / Completed at clock c (only the ones that needed attention)
  function taskBoard(c, since) {
    const res = []
    for (const k of tasks) {
      if (k.kind === 'food') continue
      if (k.needAt > c) continue
      if (since != null && (k.endAt ?? Infinity) < since) continue
      let status
      if (k.startAt == null || c < Math.max(k.notice, k.startAt)) status = 'suggested'
      else if (c < k.endAt) status = 'assigned'
      else status = 'completed'
      res.push({ ...k, status })
    }
    return res
  }

  return { tableState, allTables, counts, sectionLoad, agentAt, forGuests, waitingAt, posEvents, passPlates, taskBoard, partyAtTable, STATES: S }
}

function cluster(k, n) {
  const a = (k / Math.max(1, n)) * Math.PI * 2 + 0.6
  const r = n <= 1 ? 0 : 0.32
  return [Math.cos(a) * r, Math.sin(a) * r]
}

// which chair each guest takes (spread small parties across the table)
export function seatIndex(k, size, seats) {
  if (seats === 4 && size === 2) return [0, 2][k]
  if (seats === 6 && size <= 3) return [0, 3, 2][k]
  if (seats === 6 && size === 4) return [0, 1, 3, 4][k]
  return k
}
export function seatFor(tb, k, size) {
  const ch = tb.chairs[seatIndex(k, size, tb.seats) % tb.chairs.length]
  // tuck in a little toward the table
  const dx = tb.x - ch[0]
  const dz = tb.z - ch[1]
  const l = Math.hypot(dx, dz) || 1
  return [ch[0] + (dx / l) * 0.08, ch[1] + (dz / l) * 0.08]
}
