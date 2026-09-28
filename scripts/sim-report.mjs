// Prints what the simulated room looks like at the story's key moments. Use it when tuning src/sim.
import { simulate, SIM } from '../src/sim/simulate.js'
import { makeQuery, fmtClock } from '../src/sim/query.js'
import { debugGraph } from '../src/sim/paths.js'

const seed = Number(process.argv[2] || 7)
const t0 = performance.now()
const sim = simulate(seed)
const ms = (performance.now() - t0).toFixed(1)
const q = makeQuery(sim)
console.log('graph', debugGraph(), 'sim ms', ms, 'parties', sim.parties.length, 'unseated', sim.parties.filter((p) => p.seatedAt == null).length)

const at = (c, label) => {
  const cnt = q.counts(c)
  const load = q.sectionLoad(c)
  const wait = q.waitingAt(c)
  const flags = q
    .allTables(c)
    .filter((s) => s.flag)
    .map((s) => `${s.table.id}:${s.flag}(${(c - s.since).toFixed(1)}m)`)
  console.log(
    `\n[${label}] ${fmtClock(c)} c=${c}  open ${cnt.open} seated ${cnt.seated} dirty ${cnt.dirty} | queue ${wait.length} (${wait.map((p) => p.size).join(',')})`,
  )
  console.log('  load', Object.entries(load).map(([k, v]) => `${k}:${v.active}/${v.tables}`).join('  '))
  console.log('  flags', flags.join('  '))
}

const marks = process.argv.slice(3).map(Number)
const def = [75, 80, 95, 105, 112, 116, 120, 125, 127, 130, 150, 180, 205, 210, 214, 218, 222, 224, 226, 230, 240, 250, 262, 290, 320, 340]
for (const c of marks.length ? marks : def) at(c, 'mark')

const h = sim.hero
console.log('\nhero', h && { table: h.table, arrive: h.arriveAt.toFixed(1), pick: h.pickAt?.toFixed(1), seated: h.seatedAt?.toFixed(1), greeted: h.greetedAt?.toFixed(1), ready: h.readyAt?.toFixed(1), ordered: h.orderedAt?.toFixed(1), food: h.foodAt?.toFixed(1), finish: h.finishAt?.toFixed(1), check: h.checkAt?.toFixed(1), paid: h.paidAt?.toFixed(1), leave: h.leaveAt?.toFixed(1), bussed: h.bussedAt?.toFixed(1), avail: h.availableAt?.toFixed(1), load: h.sectionLoad })
for (const [k, p] of Object.entries(sim.scripted)) console.log('scripted', k, p.table, 'seated', p.seatedAt?.toFixed(1), 'greet', p.greetedAt?.toFixed(1), 'ready', p.readyAt?.toFixed(1), 'order', p.orderTakenAt?.toFixed(1), 'finish', p.finishAt?.toFixed(1), 'check', p.checkAt?.toFixed(1), 'leave', p.leaveAt?.toFixed(1), 'bussed', p.bussedAt?.toFixed(1))
const lastLeave = Math.max(...sim.parties.map((p) => p.leaveAt || 0))
const lastClean = Math.max(...sim.parties.map((p) => p.bussedAt || 0))
console.log('last leave', fmtClock(lastLeave), lastLeave.toFixed(1), 'last clean', lastClean.toFixed(1))
// average turn (seat → clean) by mode
const turns = sim.parties.filter((p) => p.bussedAt).map((p) => ({ t: p.seatedAt, d: p.bussedAt - p.seatedAt, shire: p.shireSeated }))
const avg = (a) => (a.reduce((s, x) => s + x.d, 0) / a.length).toFixed(1)
console.log('turn avg all', avg(turns), 'seated w/ shire', avg(turns.filter((x) => x.shire)), 'without', avg(turns.filter((x) => !x.shire)))
