// How much of Shire's layer (and the room's light) is showing at each point in the story.
// Rule: nothing of Shire exists before scene 5.
import { ss, band, lerp, clamp01 } from './story.js'
import { UI } from './ui-state.js'

// Which parts of the room the Operations answer is about.
const ASK_HI = {
  menu: { pass: 0.55, line: 0.5, prep: 0.35 },
  labor: { prep: 0.55, floor: 0.16, line: 0.25 },
  sales: { host: 0.6, door: 0.5, floor: 0.12 },
}

const BASE = () => ({
  layer: {
    zones: 0,
    tint: 0,
    zoneAlpha: 0.9,
    sections: 0,
    cones: 0,
    camReveal: [0, 0, 0, 0],
    wave: 0,
    focus: [],
    focusOnly: false,
    hi: {},
    posGlow: 0,
  },
  env: { exposure: 1.05, pendants: 1, room: 1, pendantVis: 1, dim: 0 },
  tags: { amount: 0, full: 0, compact: 0, focus: null, sections: 0, max: 18 },
})

export function frameLayer(story, P, clock, pitch) {
  const { s, u } = story.sceneAt(P)
  const F = BASE()
  const L = F.layer
  const E = F.env
  const T = F.tags
  const hero = story.hero
  switch (s.id) {
    case 'service':
    case 'rush':
      break
    case 'pos':
      L.posGlow = band(u, 0.12, 0.26, 0.5, 0.64) * 0.55
      break
    case 'cameras':
      for (let i = 0; i < 4; i++) L.camReveal[i] = ss(0.14 + i * 0.13, 0.26 + i * 0.13, u)
      L.cones = 1 - ss(0.85, 1, u) * 0.4
      break
    case 'wake':
      L.camReveal = [1, 1, 1, 1]
      L.cones = 0.6 * (1 - ss(0.0, 0.35, u))
      L.wave = ss(0.02, 0.62, u)
      L.zones = ss(0.04, 0.55, u)
      L.tint = ss(0.5, 0.8, u)
      T.amount = ss(0.42, 0.56, u)
      T.full = ss(0.42, 0.56, u)
      T.compact = ss(0.72, 0.9, u)
      break
    case 'floor':
      L.zones = 1
      L.tint = 1
      T.amount = 1
      T.full = 1
      T.compact = 1
      break
    case 'load': {
      L.zones = 1
      L.tint = 1 - band(u, 0.08, 0.2, 0.86, 1) * 0.55
      L.sections = band(u, 0.06, 0.22, 0.88, 1)
      T.amount = 1
      T.full = 1 - band(u, 0.06, 0.2, 0.9, 1) * 0.7
      T.compact = 1
      T.sections = band(u, 0.1, 0.24, 0.88, 1)
      const seated = clock >= hero.seatedAt
      if (clock >= hero.standAt - 0.2)
        L.focus = [{ id: hero.table, k: seated ? 0.9 : 0.6 + 0.4 * Math.abs(Math.sin(clock * 3)), color: '#bcd4ff' }]
      break
    }
    case 'journey':
      L.zones = 1
      L.tint = 1
      L.focusOnly = band(u, 0.05, 0.14, 0.86, 0.98) > 0.5
      L.zoneAlpha = 0.9
      L.focus = [{ id: hero.table, k: band(u, 0.04, 0.12, 0.84, 0.95) * 0.8, color: '#cfe0ff' }]
      T.amount = 1
      T.focus = hero.table
      T.full = ss(0.88, 0.98, u)
      T.compact = ss(0.86, 0.98, u)
      break
    case 'without':
      L.zones = 1 - ss(0.02, 0.12, u)
      L.tint = 1
      T.amount = 1 - ss(0.0, 0.1, u)
      T.full = T.amount
      T.compact = T.amount
      E.exposure = lerp(1.05, 0.9, ss(0.1, 0.9, u))
      E.room = lerp(1, 0.86, ss(0.1, 0.9, u))
      break
    case 'with':
      L.zones = ss(0.02, 0.12, u)
      L.tint = 1
      T.amount = ss(0.04, 0.14, u)
      T.full = T.amount
      T.compact = T.amount
      E.exposure = lerp(0.9, 1.05, ss(0.0, 0.3, u))
      E.room = lerp(0.86, 1, ss(0.0, 0.3, u))
      break
    case 'system':
      L.zones = 1 - ss(0.1, 0.5, u) * 0.4
      L.tint = 1
      T.amount = 1 - ss(0.05, 0.3, u)
      T.compact = 1
      T.full = 0
      L.hi = {}
      break
    case 'os':
      L.zones = 0.6 + ss(0.05, 0.2, u) * 0.4
      L.tint = 1
      E.exposure = lerp(1.05, 0.62, ss(0.18, 0.4, u))
      T.amount = band(u, 0.0, 0.04, 0.12, 0.2)
      T.compact = 1
      T.full = 0
      break
    case 'ask': {
      L.zones = 0.25 * (1 - ss(0.1, 0.3, u))
      L.tint = 1
      const dim = band(u, 0.12, 0.3, 0.9, 1)
      E.exposure = lerp(0.62, 0.5, dim) + ss(0.9, 1, u) * 0.3
      E.dim = dim
      const k = band(u, 0.5, 0.58, 0.9, 0.98)
      const h = ASK_HI[UI.askTab] || ASK_HI.menu
      for (const key in h) L.hi[key] = h[key] * k
      break
    }
    case 'time':
      L.zones = 0.7
      L.tint = 1
      T.amount = 0.5
      T.compact = 1
      E.exposure = 1.0
      break
    case 'results':
      L.zones = 0.35
      L.tint = 1
      E.exposure = 0.82
      break
    case 'whole':
      L.zones = 1 - ss(0.55, 0.9, u)
      L.tint = 1
      T.amount = band(u, 0.2, 0.35, 0.5, 0.75)
      T.full = 1
      T.compact = 0
      T.max = 4
      E.exposure = lerp(0.82, 1.05, ss(0, 0.3, u))
      break
    case 'close':
      L.zones = 0.5 * band(u, 0.04, 0.12, 0.3, 0.44)
      L.tint = 1
      T.amount = 0.8 * band(u, 0.04, 0.12, 0.28, 0.4)
      T.compact = 1
      E.pendants = lerp(1, 0.4, ss(0.3, 0.7, u))
      E.room = lerp(1, 0.55, ss(0.3, 0.7, u))
      E.exposure = lerp(1.05, 0.72, ss(0.3, 0.7, u))
      break
  }
  // pendants would clutter the overhead views and the labels
  E.pendantVis = 1 - ss(48, 66, pitch)
  return F
}
