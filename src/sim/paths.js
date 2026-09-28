// Aisle routing. People walk along the aisles between tables, never through them.
import { TABLES, OBSTACLES, STATIONS, QUEUE_SPOTS, SERVERS } from './layout.js'

const AISLE_X = [-9.2, -5.2, -1.3, 2.9, 6.9]
const AISLE_Z = [-7.0, -4.0, -0.8, 2.6, 6.2]

// Obstacles: [cx, cz, hx, hz, tableId|null]
const BOXES = [
  ...TABLES.map((t) => [t.x, t.z, t.hx, t.hz, t.id]),
  ...OBSTACLES.map((o) => [...o, null]),
]

function segClear(ax, az, bx, bz, ignore, inflate = 0.04) {
  for (const [cx, cz, hx, hz, id] of BOXES) {
    if (ignore && id && ignore.includes(id)) continue
    // slab test
    const minx = cx - hx - inflate
    const maxx = cx + hx + inflate
    const minz = cz - hz - inflate
    const maxz = cz + hz + inflate
    let t0 = 0
    let t1 = 1
    const dx = bx - ax
    const dz = bz - az
    let hit = true
    for (const [p, d, lo, hi] of [
      [ax, dx, minx, maxx],
      [az, dz, minz, maxz],
    ]) {
      if (Math.abs(d) < 1e-9) {
        if (p < lo || p > hi) {
          hit = false
          break
        }
      } else {
        let u0 = (lo - p) / d
        let u1 = (hi - p) / d
        if (u0 > u1) [u0, u1] = [u1, u0]
        t0 = Math.max(t0, u0)
        t1 = Math.min(t1, u1)
        if (t0 > t1) {
          hit = false
          break
        }
      }
    }
    if (hit) return false
  }
  return true
}

// Where staff stand to serve a table: the front corner nearest an aisle.
function approachFor(t) {
  const left = AISLE_X.filter((x) => x < t.x).pop()
  const right = AISLE_X.find((x) => x > t.x)
  let sx
  if (left === undefined) sx = 1
  else if (right === undefined) sx = -1
  else sx = t.x - left < right - t.x ? -1 : 1
  if (t.x < -10) sx = 1
  const ox = sx * (t.w / 2 + 0.42)
  const oz = t.shape === 'rect' ? 0.62 : 0.5
  return [t.x + ox, t.z + oz]
}
export const APPROACH = Object.fromEntries(TABLES.map((t) => [t.id, approachFor(t)]))

// Graph nodes
const nodes = []
const owner = [] // table id that a node belongs to (ignored when testing its own edges)
for (const x of AISLE_X) for (const z of AISLE_Z) {
  nodes.push([x, z])
  owner.push(null)
}
const extra = [
  [-11.3, 6.3],
  [-12.3, 6.9],
  STATIONS.door,
  STATIONS.hostSpot,
  STATIONS.posSpot,
  STATIONS.passSpot,
  STATIONS.busSpot,
  [-2.2, -7.0],
  [2.2, -7.0],
  [-11.25, 2.6],
  [-11.25, -0.8],
  [-11.25, -4.0],
  [-11.25, -7.0],
  [6.9, -6.4],
  [8.2, 2.9],
  [8.2, -6.4],
]
for (const p of extra) {
  nodes.push(p)
  owner.push(null)
}
for (const t of TABLES) {
  nodes.push(APPROACH[t.id])
  owner.push(t.id)
}
for (const s of SERVERS) {
  nodes.push(s.home)
  owner.push(null)
}
const N = nodes.length
const INF = 1e9
const dist = Array.from({ length: N }, () => new Float64Array(N).fill(INF))
const next = Array.from({ length: N }, () => new Int16Array(N).fill(-1))
for (let i = 0; i < N; i++) {
  dist[i][i] = 0
  next[i][i] = i
  for (let j = i + 1; j < N; j++) {
    const [ax, az] = nodes[i]
    const [bx, bz] = nodes[j]
    const d = Math.hypot(bx - ax, bz - az)
    if (d > 7.5) continue
    const ignore = [owner[i], owner[j]].filter(Boolean)
    if (segClear(ax, az, bx, bz, ignore)) {
      dist[i][j] = dist[j][i] = d
      next[i][j] = j
      next[j][i] = i
    }
  }
}
for (let k = 0; k < N; k++)
  for (let i = 0; i < N; i++) {
    const dik = dist[i][k]
    if (dik >= INF) continue
    for (let j = 0; j < N; j++) {
      const v = dik + dist[k][j]
      if (v < dist[i][j]) {
        dist[i][j] = v
        next[i][j] = next[i][k]
      }
    }
  }

function nodePath(i, j) {
  if (next[i][j] < 0) return null
  const out = [i]
  let k = i
  while (k !== j) {
    k = next[k][j]
    out.push(k)
  }
  return out
}

function visibleNodes(p, ignore) {
  const res = []
  for (let i = 0; i < N; i++) {
    const [x, z] = nodes[i]
    const d = Math.hypot(x - p[0], z - p[1])
    if (d > 9) continue
    const ig = ignore ? [...ignore, owner[i]].filter(Boolean) : [owner[i]].filter(Boolean)
    if (segClear(p[0], p[1], x, z, ig)) res.push([i, d])
  }
  res.sort((a, b) => a[1] - b[1])
  return res.slice(0, 8)
}

const cache = new Map()
// Returns a polyline [[x,z],...] from a to b. `ignore` lists table ids the endpoints sit inside.
export function route(a, b, ignore = []) {
  const key = `${a[0].toFixed(2)},${a[1].toFixed(2)}>${b[0].toFixed(2)},${b[1].toFixed(2)}|${ignore.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  let pts
  if (segClear(a[0], a[1], b[0], b[1], ignore)) pts = [a, b]
  else {
    const va = visibleNodes(a, ignore)
    const vb = visibleNodes(b, ignore)
    let best = INF
    let bi = -1
    let bj = -1
    for (const [i, di] of va)
      for (const [j, dj] of vb) {
        const v = di + dist[i][j] + dj
        if (v < best) {
          best = v
          bi = i
          bj = j
        }
      }
    if (bi < 0) pts = [a, b]
    else pts = [a, ...nodePath(bi, bj).map((k) => nodes[k]), b]
  }
  pts = smooth(dedupe(pts))
  cache.set(key, pts)
  return pts
}

function dedupe(pts) {
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const p = out[out.length - 1]
    if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) > 0.05) out.push(pts[i])
  }
  if (out.length === 1) out.push(pts[pts.length - 1])
  return out
}

// Cut corners a little so people don't turn like robots.
function smooth(pts) {
  if (pts.length < 3) return pts
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, pz] = pts[i - 1]
    const [cx, cz] = pts[i]
    const [nx, nz] = pts[i + 1]
    const l1 = Math.hypot(cx - px, cz - pz)
    const l2 = Math.hypot(nx - cx, nz - cz)
    const r = Math.min(0.45, l1 / 2, l2 / 2)
    out.push([cx - ((cx - px) / l1) * r, cz - ((cz - pz) / l1) * r])
    out.push([cx + ((nx - cx) / l2) * r, cz + ((nz - cz) / l2) * r])
  }
  out.push(pts[pts.length - 1])
  return out
}

export function pathLength(pts) {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return L
}

// Position along a polyline at fraction u ∈ [0,1]
export function along(pts, u, out = [0, 0]) {
  if (u <= 0) {
    out[0] = pts[0][0]
    out[1] = pts[0][1]
    return out
  }
  const total = pts._len ?? (pts._len = pathLength(pts))
  let target = Math.min(1, u) * total
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1]
    const [bx, bz] = pts[i]
    const l = Math.hypot(bx - ax, bz - az)
    if (target <= l || i === pts.length - 1) {
      const f = l > 0 ? Math.min(1, target / l) : 1
      out[0] = ax + (bx - ax) * f
      out[1] = az + (bz - az) * f
      return out
    }
    target -= l
  }
  return out
}

export function debugGraph() {
  let unreachable = 0
  const tableNodes = TABLES.map((t, k) => N - SERVERS.length - TABLES.length + k)
  const door = AISLE_X.length * AISLE_Z.length + 2
  for (const i of tableNodes) if (dist[door][i] >= INF) unreachable++
  return { nodes: N, unreachable, queue: QUEUE_SPOTS.length }
}
