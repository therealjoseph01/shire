// The restaurant. World units are metres; y is up, the camera starts on the +z (front) side.
// Floor runs x ∈ [-13.3, 13.3], z ∈ [-8.3, 9]. The kitchen sits behind the back wall (z < -8.3).

export const FLOOR = { x0: -13.3, x1: 13.3, z0: -8.3, z1: 9.2 }
export const KITCHEN = { x0: -6.5, x1: 6.5, z0: -13.2, z1: -8.3 }

// Server names and dot colours follow Shire's own demo Host UI (Maria purple, Fernando green, Lola orange, Kiersten blue).
export const SERVERS = [
  { id: 'maria', name: 'Maria', color: '#9b8cf2', home: [-9.2, -2.2] },
  { id: 'fernando', name: 'Fernando', color: '#5fbf92', home: [-1.3, -4.0] },
  { id: 'lola', name: 'Lola', color: '#e8906a', home: [2.9, -0.8] },
  { id: 'kiersten', name: 'Kiersten', color: '#6fa0e8', home: [6.9, -2.0] },
]
export const SERVER_BY_ID = Object.fromEntries(SERVERS.map((s) => [s.id, s]))

// id, x, z, shape, seats, section
const T = [
  ['T01', -11.25, -5.7, 'square', 4, 'maria'],
  ['T02', -11.25, -2.6, 'square', 4, 'maria'],
  ['T03', -11.25, 0.5, 'square', 4, 'maria'],
  ['T04', -7.2, -5.6, 'square', 4, 'maria'],
  ['T05', -7.2, -2.4, 'square', 4, 'maria'],
  ['T06', -7.2, 0.8, 'round', 2, 'maria'],
  ['T07', -3.2, -5.6, 'square', 4, 'fernando'],
  ['T08', -3.2, -2.4, 'square', 4, 'fernando'],
  ['T09', -3.2, 0.8, 'square', 4, 'fernando'],
  ['T10', 0.85, -5.6, 'rect', 6, 'lola'],
  ['T11', 0.85, -2.3, 'round', 2, 'lola'],
  ['T12', 0.85, 0.85, 'square', 4, 'lola'],
  ['T13', 4.8, -5.6, 'square', 4, 'kiersten'],
  ['T14', 4.8, -2.4, 'square', 4, 'kiersten'],
  ['T15', 4.8, 0.8, 'round', 2, 'kiersten'],
  ['T16', -6.0, 4.4, 'round', 2, 'fernando'],
  ['T17', -1.4, 4.4, 'rect', 6, 'lola'],
  ['T18', 3.6, 4.4, 'square', 4, 'kiersten'],
]

function chairsFor(shape) {
  if (shape === 'round') return [[-0.72, 0], [0.72, 0]]
  if (shape === 'square') return [[0, -0.8], [0.8, 0], [0, 0.8], [-0.8, 0]]
  // rect 2.0 × 0.95 six-top
  return [[-0.5, -0.8], [0.5, -0.8], [1.35, 0], [0.5, 0.8], [-0.5, 0.8], [-1.35, 0]]
}

function sizeFor(shape) {
  if (shape === 'round') return { w: 0.82, d: 0.82 }
  if (shape === 'square') return { w: 1.08, d: 1.08 }
  return { w: 2.0, d: 0.95 }
}

export const TABLES = T.map(([id, x, z, shape, seats, section], index) => {
  const { w, d } = sizeFor(shape)
  const chairs = chairsFor(shape).map(([cx, cz]) => [x + cx, z + cz])
  const hx = w / 2 + 0.58
  const hz = d / 2 + 0.58
  return { id, index, num: parseInt(id.slice(1), 10), x, z, shape, seats, section, w, d, chairs, hx, hz }
})
export const TABLE_BY_ID = Object.fromEntries(TABLES.map((t) => [t.id, t]))

export const SECTION_TABLES = Object.fromEntries(SERVERS.map((s) => [s.id, TABLES.filter((t) => t.section === s.id).map((t) => t.id)]))

export const STATIONS = {
  outside: [-15.6, 7.4],
  door: [-12.9, 7.3],
  hostStand: [-10.5, 7.25],
  hostSpot: [-10.05, 7.95],
  pos: [-6.2, -7.62],
  posSpot: [-6.2, -6.95],
  pass: [0, -8.3],
  passSpot: [0, -7.05],
  bus: [6.3, -7.62],
  busSpot: [6.3, -6.95],
  bar: [10.4, -1.5],
}

// Where waiting parties stand, nearest to the host stand first.
export const QUEUE_SPOTS = [
  [-11.9, 6.0],
  [-12.3, 5.0],
  [-11.3, 5.15],
  [-12.3, 4.0],
  [-11.3, 4.1],
  // the rest wait just outside the door
  [-14.4, 7.6],
  [-15.0, 6.9],
  [-15.2, 8.1],
  [-15.8, 7.3],
  [-16.2, 8.2],
  [-16.4, 6.6],
  [-17.0, 7.5],
]

// Fixed obstacles besides tables (axis-aligned boxes: cx, cz, hx, hz)
export const OBSTACLES = [
  [-10.5, 7.25, 0.42, 0.34], // host stand
  [10.4, -1.5, 0.45, 4.8], // bar counter
  [9.35, -1.5, 0.32, 4.8], // bar stools
  [-12.6, 4.6, 0.35, 1.4], // waiting bench
]

// The existing ceiling cameras. They're just "already there", nothing new is installed.
export const CAMERAS = [
  { id: 1, pos: [-8.6, 3.35, -4.2], look: [-7.5, 0, -1.4] },
  { id: 2, pos: [3.6, 3.35, -4.6], look: [3.0, 0, -2.2] },
  { id: 3, pos: [-7.8, 3.35, 3.6], look: [-6.5, 0, 2.6] },
  { id: 4, pos: [4.6, 3.35, 3.4], look: [3.2, 0, 1.8] },
]

// The eight real Shire tools, pinned to where they live in the room.
export const MODULE_ANCHORS = {
  pos: [-6.2, 1.1, -7.6],
  cctv: [3.6, 3.35, -4.6],
  kitchen: [0, 1.2, -9.6],
  reservations: [-10.5, 1.1, 7.25],
  ordering: [-13.2, 1.0, 7.3],
  staff: [6.3, 1.0, -7.4],
  marketing: [-3.2, 0.9, 0.8],
  ops: [0, 0.8, -1.5],
}
