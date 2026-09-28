// One Friday dinner service, simulated once, deterministically.
// Every party, server, busser and host movement ends up in an event log. After that the renderer only reads the log,
// so scrubbing (forwards or backwards) is exact, and anything the page says about the room is true of the room.
//
// Clock: minutes after 5:00 PM.
import { TABLES, TABLE_BY_ID, SERVERS, STATIONS, QUEUE_SPOTS } from './layout.js'
import { route, pathLength, APPROACH } from './paths.js'

export const SIM = {
  start: 20,
  arrivalsEnd: 268,
  end: 420,
  // Shire's layer is present from scene 5, but it only starts *routing* tasks and balancing
  // sections from scene 7. Scene 9 turns it off (counterfactual) and scene 10 turns it back on.
  windows: [
    [112, 176],
    [196, 1e9],
  ],
}

export function shireOn(t) {
  for (const [a, b] of SIM.windows) if (t >= a && t < b) return true
  return false
}
function nextShireOn(t) {
  for (const [a] of SIM.windows) if (a > t) return a
  return null
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Heap
class Heap {
  constructor() {
    this.a = []
    this.n = 0
  }
  push(e) {
    e.seq = this.n++
    const a = this.a
    a.push(e)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (less(a[i], a[p])) {
        ;[a[i], a[p]] = [a[p], a[i]]
        i = p
      } else break
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < a.length && less(a[l], a[m])) m = l
        if (r < a.length && less(a[r], a[m])) m = r
        if (m === i) break
        ;[a[i], a[m]] = [a[m], a[i]]
        i = m
      }
    }
    return top
  }
  get size() {
    return this.a.length
  }
}
const less = (x, y) => (x.t === y.t ? x.seq < y.seq : x.t < y.t)

const SURNAMES = [
  'Martinez', 'Robinson', 'Patel', 'Harris', 'Chen', 'Rivera', 'Thompson', 'Nguyen', 'Brooks', 'Okafor', 'Sullivan', 'Delgado',
  'Kim', 'Bennett', 'Moreau', 'Alvarez', 'Price', 'Hughes', 'Ramos', 'Foster', 'Lin', 'Castillo', 'Ward', 'Reyes', 'Coleman',
  'Park', 'Gray', 'Silva', 'Jenkins', 'Ortiz', 'Hayes', 'Stone', 'Duarte', 'Wells', 'Ibarra', 'Lowe', 'Ferris', 'Khan', 'Boone',
  'Quinn', 'Marsh', 'Tate', 'Vega', 'Rhodes', 'Holt', 'Ellis', 'Nash', 'Crane', 'Pryor', 'Lamb', 'Noble', 'Frost', 'Sato', 'Webb',
]

// Parties we place on purpose so the story's key moments are guaranteed to happen.
// `hold` delays a need until Shire starts routing ('shire') or by n minutes.
const SCRIPTED = [
  // scene 2: things anyone could notice, if they looked
  { key: 'dirty', table: 'T05', size: 4, seatAt: 24, hold: { buss: 10, reset: 'shire' } },
  { key: 'dirty2', table: 'T08', size: 3, seatAt: 30, hold: { buss: 'shire' } },
  { key: 'check', table: 'T07', size: 4, seatAt: 34, hold: { check: 9 } },
  { key: 'order', table: 'T12', size: 4, seatAt: 84, hold: { order: 8 } },
  { key: 'greet', table: 'T09', size: 3, seatAt: 88, hold: { greet: 9 } },
  // scene 5: still waiting when Shire first sees the room
  { key: 'check2', table: 'T14', size: 4, seatAt: 50, hold: { check: 'shire' } },
  { key: 'order2', table: 'T11', size: 2, seatAt: 99, hold: { order: 'shire' } },
  { key: 'greet2', table: 'T16', size: 2, seatAt: 103, hold: { greet: 'shire' } },
  // Scene 7: a party of four arrives while two 4-tops are free: one in Maria's full section (nearest the host stand),
  // one in Fernando's lighter section. Shire suggests Fernando's.
  { key: 'hero', table: 'T08', size: 4, seatAt: 115.4, arriveAt: 114.4, name: 'Martinez', priority: true },
  { key: 'decoy', table: 'T05', size: 2, seatAt: 120.5, holdFrom: 111.5, name: 'Robinson' },
]

export function simulate(seed = 7) {
  const rnd = mulberry32(seed)
  const U = (a, b) => a + (b - a) * rnd()
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

  // ---------- parties ----------
  const parties = []
  const rate = (t) => (t < 60 ? 0.1 : t < 85 ? 0.2 : t < 125 ? 0.165 : t < 145 ? 0.17 : t < 215 ? 0.23 : t < 240 ? 0.16 : 0.1)
  let t = SIM.start
  const sizes = () => {
    const r = rnd()
    return r < 0.47 ? 2 : r < 0.62 ? 3 : r < 0.92 ? 4 : r < 0.96 ? 5 : 6
  }
  while (t < SIM.arrivalsEnd) {
    t += -Math.log(1 - rnd()) / rate(t)
    if (t >= SIM.arrivalsEnd) break
    parties.push({ arriveAt: t, size: sizes() })
  }
  for (const s of SCRIPTED) {
    parties.push({
      arriveAt: s.arriveAt ?? s.seatAt - 1.6,
      size: s.size,
      scripted: s.key,
      prefTable: s.table,
      seatTarget: s.seatAt,
      hold: s.hold || {},
      name: s.name,
      priority: !!s.priority,
      holdFrom: s.holdFrom,
    })
  }
  parties.sort((a, b) => a.arriveAt - b.arriveAt)
  const palette = ['#b8664a', '#3f5b7a', '#8a8f5a', '#d8c6a8', '#6b4b6e', '#2f3a40', '#a67c52', '#c9a0a0', '#5a7a6a', '#e0d8c8', '#7a3b35', '#445566', '#9aa0a8', '#b59a6a']
  const skins = ['#e8c4a8', '#d6a888', '#b98563', '#8d5e42', '#f0d2bd', '#6e4632', '#c79b7b']
  let nameIdx = 0
  parties.forEach((p, i) => {
    p.id = i
    if (!p.name) p.name = SURNAMES[nameIdx++ % SURNAMES.length]
    p.guests = Array.from({ length: p.size }, (_, k) => ({
      color: pick(palette),
      skin: pick(skins),
      h: U(0.94, 1.06),
      phase: rnd() * Math.PI * 2,
      k,
    }))
    const inPath = route(STATIONS.outside, STATIONS.door)
    p.inPath = inPath
    p.browse = U(3.5, 6.5)
    p.cook = U(11, 15)
    p.dine = p.size <= 2 ? U(22, 29) : U(25, 33)
    p.pay = U(2, 3.4)
    p.linger = U(0.7, 1.6)
    p.items = p.size + Math.floor(rnd() * 3)
    p.total = Math.round(p.size * U(26, 48) * 100) / 100
  })

  // ---------- agents ----------
  const mkAgent = (id, role, home, speed, extra = {}) => ({ id, role, home, speed, segs: [], pos: home.slice(), free: SIM.start, tasks: [], ...extra })
  const servers = SERVERS.map((s) => mkAgent(s.id, 'server', s.home, 84, { name: s.name, color: s.color }))
  const serverById = Object.fromEntries(servers.map((s) => [s.id, s]))
  const busser = mkAgent('busser', 'busser', STATIONS.busSpot, 80)
  const host = mkAgent('host', 'host', STATIONS.hostSpot, 70)
  const agents = [...servers, busser, host]

  const tables = TABLES.map((tb) => ({
    id: tb.id,
    meta: tb,
    party: null, // currently assigned party
    availableAt: SIM.start, // when host can use it again
    clean: true,
    hold: null,
    history: [],
  }))
  const tableById = Object.fromEntries(tables.map((x) => [x.id, x]))
  // scripted parties hold their table (a reservation, in effect) from a while before they're due
  for (const tb of tables) tb.holds = []
  for (const p of parties) if (p.prefTable) tableById[p.prefTable].holds.push({ party: p, from: p.holdFrom ?? p.seatTarget - 60 })
  for (const tb of tables) tb.holds.sort((a, b) => a.party.seatTarget - b.party.seatTarget)

  const heap = new Heap()
  const pos = []
  const tasks = []
  const waiting = []

  function posAt(agent, time) {
    const s = agent.segs[agent.segs.length - 1]
    if (!s) return agent.home.slice()
    if (time >= s.t1) return s.end.slice()
    if (s.type === 'walk') {
      // interruptible idle walk: truncate
      const u = (time - s.t0) / (s.t1 - s.t0)
      const L = pathLength(s.path) * u
      let acc = 0
      for (let i = 1; i < s.path.length; i++) {
        const [ax, az] = s.path[i - 1]
        const [bx, bz] = s.path[i]
        const l = Math.hypot(bx - ax, bz - az)
        if (acc + l >= L) {
          const f = l ? (L - acc) / l : 0
          return [ax + (bx - ax) * f, az + (bz - az) * f]
        }
        acc += l
      }
      return s.end.slice()
    }
    return s.end.slice()
  }

  function cutIdle(agent, time) {
    const s = agent.segs[agent.segs.length - 1]
    if (s && s.idle && time < s.t1) {
      const p = posAt(agent, time)
      if (time <= s.t0) agent.segs.pop()
      else {
        // shorten the path to where they are now
        const u = (time - s.t0) / (s.t1 - s.t0)
        const full = s.path
        const L = pathLength(full) * u
        const cut = [full[0]]
        let acc = 0
        for (let i = 1; i < full.length; i++) {
          const l = Math.hypot(full[i][0] - full[i - 1][0], full[i][1] - full[i - 1][1])
          if (acc + l >= L) break
          cut.push(full[i])
          acc += l
        }
        cut.push(p)
        s.path = cut
        s.t1 = time
        s.end = p
      }
    }
  }

  function walk(agent, t0, to, ignore = [], idle = false, act = null) {
    const from = posAt(agent, t0)
    const path = route(from, to, ignore)
    const L = pathLength(path)
    const dur = L / agent.speed
    if (dur < 0.004) return t0
    agent.segs.push({ t0, t1: t0 + dur, type: 'walk', path, end: to.slice(), idle, act })
    return t0 + dur
  }
  function stay(agent, t0, dur, act, tableId = null) {
    const at = posAt(agent, t0)
    agent.segs.push({ t0, t1: t0 + dur, type: 'stay', end: at, act, tableId })
    return t0 + dur
  }

  // ---------- policy ----------
  const RANGES = { greet: [1.4, 5.6], order: [1.0, 4.8], check: [2.4, 7.2], buss: [3.0, 8.6], reset: [1.4, 4.6] }
  // the counterfactual window (scene 9): same staff, same night, nobody routing anything
  const LATE = { greet: [3.5, 9], order: [2.5, 7], check: [3.5, 9.5], buss: [4.5, 11], reset: [3, 7.5] }
  function noticeAt(kind, time, party) {
    if (kind === 'food') return time + U(0.2, 0.7)
    const on = shireOn(time)
    const hold = party && party.hold && party.hold[kind]
    if (on) return time + U(0.12, 0.5)
    let n = time + U(...(time > SIM.windows[0][1] ? LATE : RANGES)[kind])
    if (typeof hold === 'number') n = time + hold
    const next = nextShireOn(time)
    if (hold === 'shire' && next !== null) n = next + U(0.05, 0.45)
    if (next !== null && n > next) n = next + U(0.05, 0.7)
    return n
  }

  let nowT = 0
  function activeCount(sectionId) {
    let n = 0
    for (const tb of tables) if (tb.meta.section === sectionId && tb.party && !(tb.party.leaveAt <= nowT)) n++
    return n
  }

  function chooseTable(party, time) {
    const waited = time - party.standAt
    const bigWaiting = waiting.some((q) => q !== party && q.size >= 5 && q.standAt <= time && q.pickAt == null)
    const ok = tables.filter((tb) => {
      if (tb.party || !tb.clean || tb.availableAt > time) return false
      if (tb.meta.seats < party.size) return false
      const h = tb.holds.find((x) => x.party.pickAt == null)
      if (h && h.party !== party && time >= h.from) return false
      if (tb.meta.seats === 6 && party.size <= 4 && (bigWaiting || waited < 8)) return false
      if (tb.meta.seats - party.size >= 2 && party.size <= 2 && waited < 6) return false
      return true
    })
    if (party.prefTable) {
      const pt = ok.find((tb) => tb.id === party.prefTable)
      return pt || null
    }
    if (!ok.length) return null
    const hs = STATIONS.hostStand
    const d = (tb) => Math.hypot(tb.meta.x - hs[0], tb.meta.z - hs[1])
    if (shireOn(time)) {
      // Shire: seat the section with room; waste as few seats as possible.
      ok.sort((a, b) => activeCount(a.meta.section) - activeCount(b.meta.section) || a.meta.seats - b.meta.seats || d(a) - d(b))
    } else {
      // Without it: nearest free table that fits. Sections fill unevenly.
      ok.sort((a, b) => a.meta.seats - b.meta.seats + (d(a) - d(b)) * 0.6)
    }
    return ok[0]
  }

  // ---------- task helpers ----------
  function addTask(agent, kind, party, needAt, extra = {}) {
    const notice = noticeAt(kind === 'buss' ? 'buss' : kind, needAt, party)
    const task = { kind, agent: agent.id, role: agent.role, party: party.id, table: party.table, needAt, notice, startAt: null, endAt: null, ...extra }
    tasks.push(task)
    agent.tasks.push(task)
    heap.push({ t: notice, type: 'wake', agent })
    return task
  }

  function startNext(agent, time) {
    if (agent.free > time + 1e-9) return
    const ready = agent.tasks.filter((k) => k.startAt === null && k.notice <= time + 1e-9)
    if (!ready.length) {
      const pending = agent.tasks.filter((k) => k.startAt === null)
      goHome(agent, time)
      if (pending.length) heap.push({ t: Math.min(...pending.map((k) => k.notice)), type: 'wake', agent })
      return
    }
    ready.sort((a, b) => (a.kind === 'food' ? -1 : 0) - (b.kind === 'food' ? -1 : 0) || a.notice - b.notice)
    const task = ready[0]
    cutIdle(agent, time)
    task.startAt = time
    const party = parties[task.party]
    const tb = party.table
    const ap = APPROACH[tb]
    let e = time
    switch (task.kind) {
      case 'greet':
        e = walk(agent, e, ap, [tb], false, 'toTable')
        e = stay(agent, e, 0.5, 'greet', tb)
        party.greetedAt = e
        party.readyAt = e + party.browse
        heap.push({ t: party.readyAt, type: 'need', kind: 'order', party })
        break
      case 'order':
        e = walk(agent, e, ap, [tb], false, 'toTable')
        e = stay(agent, e, 1.05, 'order', tb)
        party.orderTakenAt = e
        e = walk(agent, e, STATIONS.posSpot, [], false, 'toPos')
        e = stay(agent, e, 0.35, 'pos', tb)
        party.orderedAt = e
        pos.push({ t: e, kind: 'order', table: tb, party: party.id, items: party.items })
        party.foodReadyAt = e + party.cook
        heap.push({ t: party.foodReadyAt, type: 'need', kind: 'food', party })
        break
      case 'food':
        e = walk(agent, e, [STATIONS.passSpot[0] + U(-1.6, 1.6), STATIONS.passSpot[1]], [], false, 'toPass')
        e = stay(agent, e, 0.16, 'pickup', tb)
        party.pickupAt = e
        e = walk(agent, e, ap, [tb], false, 'carry')
        e = stay(agent, e, 0.3, 'food', tb)
        party.foodAt = e
        party.finishAt = e + party.dine
        heap.push({ t: party.finishAt, type: 'need', kind: 'check', party })
        break
      case 'check':
        e = walk(agent, e, STATIONS.posSpot, [], false, 'toPos')
        e = stay(agent, e, 0.25, 'pos', tb)
        party.checkPrintAt = e
        pos.push({ t: e, kind: 'check', table: tb, party: party.id, total: party.total })
        e = walk(agent, e, ap, [tb], false, 'toTable')
        e = stay(agent, e, 0.25, 'check', tb)
        party.checkAt = e
        party.paidAt = e + party.pay
        pos.push({ t: party.paidAt, kind: 'paid', table: tb, party: party.id, total: party.total })
        party.leaveAt = party.paidAt + party.linger
        heap.push({ t: party.leaveAt, type: 'leave', party })
        break
      case 'buss':
        e = walk(agent, e, ap, [tb], false, 'toTable')
        party.bussStartAt = e
        e = stay(agent, e, 1.2, 'buss', tb)
        party.bussedAt = e
        heap.push({ t: e, type: 'clean', table: tableById[tb], party })
        e = walk(agent, e, STATIONS.busSpot, [], false, 'toStation')
        e = stay(agent, e, 0.3, 'dump', null)
        break
    }
    task.endAt = e
    agent.free = e
    heap.push({ t: e, type: 'free', agent })
  }

  function goHome(agent, time) {
    const last = agent.segs[agent.segs.length - 1]
    const at = last ? last.end : agent.home
    if (Math.hypot(at[0] - agent.home[0], at[1] - agent.home[1]) < 0.3) return
    walk(agent, time, agent.home, [], true, 'home')
  }

  // ---------- host ----------
  function queueIndex(party, time) {
    let k = 0
    for (const q of waiting) if (q !== party && q.standAt < party.standAt && !(q.pickAt <= time)) k++
    return k
  }

  function hostTry(time) {
    if (host.free > time + 1e-9) return
    const standing = waiting.filter((p) => p.standAt <= time + 1e-9 && p.pickAt == null)
    if (!standing.length) {
      goHome(host, time)
      return
    }
    // reservations first once it's their time, then first come first served
    const prio = (p) => (p.priority ? 2 : 0) + (p.prefTable && time >= p.seatTarget ? 1 : 0)
    standing.sort((a, b) => prio(b) - prio(a) || a.standAt - b.standAt)
    for (const party of standing) {
      if (party.prefTable && time < party.seatTarget) continue
      const tb = chooseTable(party, time)
      if (!tb) continue
      cutIdle(host, time)
      party.pickAt = time
      party.table = tb.id
      party.server = tb.meta.section
      party.suggestedAt = time
      party.shireSeated = shireOn(time)
      party.queueSpot = QUEUE_SPOTS[Math.min(QUEUE_SPOTS.length - 1, queueIndex(party, time))]
      party.sectionLoad = Object.fromEntries(SERVERS.map((s) => [s.id, activeCount(s.id)]))
      tb.party = party
      tb.clean = false
      let e = time
      e = walk(host, e, party.queueSpot, [], false, 'fetch')
      e = stay(host, e, 0.12, 'fetch', tb.id)
      party.leadAt = e
      const ap = APPROACH[tb.id]
      const leadPath = route(party.queueSpot, ap, [tb.id])
      const dur = pathLength(leadPath) / host.speed
      host.segs.push({ t0: e, t1: e + dur, type: 'walk', path: leadPath, end: ap.slice(), idle: false, act: 'lead' })
      party.leadPath = leadPath
      e += dur
      party.seatedAt = e + 0.12
      e = stay(host, e, 0.28, 'seat', tb.id)
      host.free = e
      tb.history.push(party)
      heap.push({ t: party.seatedAt, type: 'need', kind: 'greet', party })
      heap.push({ t: e, type: 'hostFree' })
      return
    }
    goHome(host, time)
  }

  // ---------- run ----------
  for (const p of parties) heap.push({ t: p.arriveAt, type: 'arrive', party: p })
  let guard = 0
  while (heap.size && guard++ < 200000) {
    const ev = heap.pop()
    const now = ev.t
    nowT = now
    if (now > SIM.end) break
    switch (ev.type) {
      case 'arrive': {
        const p = ev.party
        p.inDur = pathLength(p.inPath) / 70 + 0.12
        p.standAt = now + p.inDur
        waiting.push(p)
        heap.push({ t: p.standAt, type: 'hostWake' })
        if (p.prefTable) heap.push({ t: p.seatTarget, type: 'hostWake' })
        break
      }
      case 'hostWake':
      case 'hostFree':
        hostTry(now)
        break
      case 'need': {
        const p = ev.party
        const agent = serverById[p.server]
        addTask(agent, ev.kind, p, now)
        break
      }
      case 'wake':
      case 'free':
        startNext(ev.agent, now)
        break
      case 'leave': {
        const p = ev.party
        const tb = tableById[p.table]
        const ap = APPROACH[p.table]
        p.outPath = route(ap, STATIONS.door, [p.table]).concat([STATIONS.outside])
        p.outDur = pathLength(p.outPath) / 72
        addTask(busser, 'buss', p, now)
        tb.dirtyAt = now
        break
      }
      case 'clean': {
        const tb = ev.table
        const p = ev.party
        tb.party = null
        tb.clean = true
        p.cleanAt = now
        const avail = noticeAt('reset', now, p)
        p.availableAt = avail
        tb.availableAt = avail
        tasks.push({ kind: 'reset', agent: 'host', role: 'host', party: p.id, table: tb.id, needAt: now, notice: avail, startAt: avail, endAt: avail + 0.2 })
        heap.push({ t: avail + 1e-6, type: 'hostWake' })
        break
      }
    }
  }

  // Parties that never got seated leave at close (shouldn't happen, but be safe)
  for (const p of parties) {
    if (p.seatedAt == null) {
      p.walkout = true
    }
  }

  const byTable = Object.fromEntries(tables.map((tb) => [tb.id, tb.history.slice().sort((a, b) => a.pickAt - b.pickAt)]))
  pos.sort((a, b) => a.t - b.t)
  for (const a of agents) a.segs.sort((x, y) => x.t0 - y.t0)
  const hero = parties.find((p) => p.scripted === 'hero')
  const scriptedMap = Object.fromEntries(parties.filter((p) => p.scripted).map((p) => [p.scripted, p]))
  return { parties, agents, servers, busser, host, byTable, pos, tasks, hero, scripted: scriptedMap }
}
