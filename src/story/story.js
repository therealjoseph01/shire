// The dinner service as data: how long each scene is (in screen heights), what time it is, where the camera is,
// and how much of Shire's layer is showing. Everything is a pure function of the story position P,
// so scrolling back plays the evening backwards.
import { TABLE_BY_ID } from '../sim/layout.js'
import { SIM } from '../sim/simulate.js'

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const ss = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const lerp = (a, b, t) => a + (b - a) * t
export const band = (u, a, b, c, d) => ss(a, b, u) * (1 - ss(c, d, u))

const K = (u, tgt, yaw, pitch, dist, fov = 32, o = {}) => ({ u, tgt, yaw, pitch, dist, fov, ...o })

export function buildStory(sim) {
  const hero = sim.hero
  const T08 = TABLE_BY_ID[hero.table]
  const [offAt, onAgain] = [SIM.windows[0][1], SIM.windows[1][0]]
  const lastClean = Math.max(...sim.parties.map((p) => p.bussedAt || 0))

  const scenes = [
    {
      id: 'service',
      len: 1.8,
      sx: 0.14,
      clock: [70, 76],
      cam: [K(0, [-3.6, 0.8, -2.4], 16, 15, 11.5, 30), K(1, [-3.4, 0.8, -2.5], 11, 16, 10.4, 30)],
      camM: [K(0, [-9.6, 1.0, 3.6], 34, 11, 7.6, 34), K(1, [-8.2, 1.0, 2.4], 28, 12, 7.2, 34)],
    },
    {
      id: 'rush',
      len: 3.0,
      sx: 0.06,
      clock: [76, 104],
      cam: [
        K(0, [-3.4, 0.8, -2.5], 11, 16, 10.4, 30),
        K(0.3, [-2.4, 0.8, -1.2], -6, 19, 13.5, 31),
        K(0.66, [-4.8, 0.7, 0.8], 18, 24, 15.5, 32),
        K(1, [-5.0, 0.8, -3.2], 12, 21, 12.5, 31),
      ],
      camM: [
        K(0, [-8.2, 1.0, 2.4], 28, 12, 7.2, 34),
        K(0.3, [-3.4, 0.8, 0.6], 12, 22, 7.4, 34),
        K(0.66, [-9.4, 0.8, 4.0], 24, 30, 12.5, 34),
        K(1, [-3.2, 0.8, -5.0], 6, 22, 7.6, 34),
      ],
    },
    {
      id: 'pos',
      len: 2.4,
      clock: [104, 106],
      cam: [
        K(0, [-5.0, 0.8, -3.2], 12, 21, 12.5, 31),
        K(0.24, [-5.9, 1.2, -7.8], 14, 19, 4.4, 28),
        K(0.44, [-5.85, 1.2, -7.8], 8, 20, 4.1, 28),
        K(0.74, [-3.0, 0.6, -1.4], 0, 30, 18, 32),
        K(1, [-2.6, 0.5, -1.2], 2, 32, 20.5, 32),
      ],
      camM: [
        K(0, [-3.2, 0.8, -5.0], 6, 22, 7.6, 34),
        K(0.24, [-6.2, 1.25, -7.9], 10, 17, 3.1, 34),
        K(0.44, [-6.15, 1.25, -7.9], 6, 18, 2.9, 34),
        K(0.74, [-3.4, 0.6, -1.0], 0, 34, 19, 34),
        K(1, [-3.2, 0.5, -0.8], 2, 36, 21, 34),
      ],
    },
    {
      id: 'cameras',
      len: 2.0,
      sx: 0.1,
      clock: [106, 107.5],
      cam: [K(0, [-2.6, 0.5, -1.2], 2, 32, 20.5, 32), K(0.35, [-2.2, 1.3, -1.0], -2, 26, 23, 32), K(1, [-2.2, 0.9, -1.0], -8, 33, 24, 32)],
    },
    {
      id: 'wake',
      len: 2.4,
      sx: 0.15,
      clock: [107.5, 109.5],
      cam: [K(0, [-2.2, 0.9, -1.0], -8, 33, 24, 32), K(0.5, [-2.6, 0.4, -1.3], -3, 40, 20.5, 32), K(1, [-2.6, 0.4, -1.2], 4, 44, 19.5, 32)],
    },
    {
      id: 'floor',
      len: 1.8,
      sx: 0.17,
      clock: [109.5, 112],
      cam: [K(0, [-2.6, 0.4, -1.2], 4, 44, 19.5, 32), K(0.65, [-2.6, 0, -0.6], 2, 63, 27, 32), K(1, [-2.6, 0, -0.4], 0, 70, 29, 32)],
    },
    {
      id: 'load',
      len: 2.8,
      sx: 0.17,
      clock: [112, hero.seatedAt + 0.7],
      cam: [K(0, [-2.6, 0, -0.4], 0, 70, 29, 32), K(0.35, [-3.8, 0, 0.6], 0, 67, 28, 32), K(1, [-4.0, 0, 0.8], 5, 63, 26.5, 32)],
    },
    {
      id: 'journey',
      len: 3.4,
      sx: 0.08,
      clock: [hero.seatedAt + 0.7, hero.availableAt + 1.4],
      clockEase: (u) => (u < 0.08 ? u * 0.4 : u < 0.86 ? 0.032 + (u - 0.08) * (0.94 / 0.78) : 0.972 + (u - 0.86) * 0.2),
      cam: [
        K(0, [-4.0, 0, 0.8], 5, 63, 26.5, 32),
        K(0.1, [T08.x, 0.8, T08.z], 26, 38, 6.4, 30),
        K(0.5, [T08.x, 0.8, T08.z], 52, 41, 6.1, 30),
        K(0.84, [T08.x, 0.8, T08.z], 78, 43, 6.3, 30),
        K(1, [-2.6, 0, -0.9], 20, 57, 26, 32),
      ],
      camM: [
        K(0, [-4.0, 0, 0.8], 5, 63, 26.5, 32),
        K(0.1, [T08.x, 0.8, T08.z + 0.6], 26, 44, 6.6, 34),
        K(0.5, [T08.x, 0.8, T08.z + 0.6], 52, 46, 6.4, 34),
        K(0.84, [T08.x, 0.8, T08.z + 0.6], 78, 48, 6.6, 34),
        K(1, [-2.6, 0, -0.9], 20, 57, 26, 34),
      ],
    },
    {
      id: 'without',
      len: 2.2,
      sx: 0.04,
      clock: [hero.availableAt + 1.4, onAgain],
      jitter: true,
      cam: [K(0, [-2.6, 0, -0.9], 20, 57, 26, 32), K(0.3, [-2.6, 0.3, -0.8], 8, 46, 22, 32), K(1, [-2.8, 0.3, -0.6], -5, 48, 21, 32)],
    },
    {
      id: 'with',
      len: 2.8,
      clock: [onAgain, onAgain + 13],
      cam: [K(0, [-2.8, 0.3, -0.6], -5, 48, 21, 32), K(0.5, [-2.6, 0.3, -0.8], 0, 52, 22, 32), K(1, [-2.6, 0.3, -0.8], 5, 53, 22.5, 32)],
    },
    {
      id: 'system',
      len: 2.2,
      clock: [onAgain + 13, onAgain + 16],
      cam: [K(0, [-2.6, 0.3, -0.8], 5, 53, 22.5, 32), K(0.5, [-0.6, 0, -1.2], 0, 76, 76, 30, { sy: 0.1 }), K(1, [-0.6, 0, -1.2], 0, 80, 80, 30, { sy: 0.1 })],
    },
    {
      id: 'os',
      len: 3.0,
      clock: [onAgain + 16, onAgain + 18],
      cam: [K(0, [-1.0, 0, -2.6], 0, 80, 62, 30), K(0.2, [-1.2, 0, -1.6], 0, 89.2, 44, 30), K(1, [-1.2, 0, -1.6], 0, 89.2, 43, 30)],
    },
    {
      id: 'ask',
      len: 3.0,
      sx: -0.13,
      clock: [onAgain + 18, onAgain + 19],
      cam: [K(0, [-1.2, 0, -1.6], 0, 89.2, 43, 30), K(0.22, [-1.0, 0.6, -6.6], -8, 34, 17.5, 32), K(1, [-1.0, 0.6, -6.4], 6, 36, 16.5, 32)],
    },
    {
      id: 'time',
      len: 2.2,
      clock: (u) => {
        // Monday → Sunday replays the evening at speed, then weeks go by faster still.
        if (u < 0.62) {
          const d = u / 0.62
          const day = Math.min(6, Math.floor(d * 7))
          const f = d * 7 - day
          return 90 + f * 175
        }
        const w = (u - 0.62) / 0.38
        const blk = Math.min(3, Math.floor(w * 4))
        const f = w * 4 - blk
        return u > 0.985 ? onAgain + 20 : 100 + ((f * 3) % 1) * 150
      },
      cam: [K(0, [-1.0, 0.6, -6.4], 6, 36, 16.5, 32), K(0.2, [-2.2, 0, -1.4], -18, 58, 30, 32), K(1, [-2.2, 0, -1.4], 32, 62, 32, 32)],
    },
    {
      id: 'results',
      len: 3.2,
      clock: [onAgain + 20, onAgain + 30],
      cam: [K(0, [-2.2, 0, -1.4], 32, 62, 32, 32), K(0.2, [-3.2, 0.5, -1.0], 30, 40, 22, 32), K(1, [-3.0, 0.5, -1.0], 8, 38, 20.5, 32)],
    },
    {
      id: 'whole',
      len: 2.2,
      clock: [onAgain + 30, onAgain + 42],
      cam: [K(0, [-3.0, 0.5, -1.0], 8, 38, 20.5, 32), K(0.35, [-1.0, 0, -1.6], 0, 82, 48, 30), K(1, [-1.0, 0, -1.6], -12, 84, 46, 30)],
    },
    {
      id: 'close',
      len: 3.0,
      clock: [onAgain + 42, lastClean + 1.5],
      clockEase: (u) => (u < 0.4 ? (u / 0.4) * 0.85 : 0.85 + Math.min(1, (u - 0.4) / 0.35) * 0.15),
      cam: [K(0, [-1.0, 0, -1.6], -12, 84, 46, 30), K(0.3, [-3.0, 0.6, -1.5], 10, 30, 15.5, 31), K(0.7, [-3.6, 0.8, -2.4], 15, 14, 10.4, 30)],
      camM: [K(0, [-1.0, 0, -1.6], -12, 84, 46, 30), K(0.3, [-3.0, 0.6, -1.0], 10, 32, 16, 34), K(0.7, [-8.2, 1.0, 2.4], 28, 12, 7.4, 34)],
    },
  ]

  let acc = 0
  for (const s of scenes) {
    s.start = acc
    acc += s.len
  }
  const total = acc

  // Global camera key list (landscape & portrait), keyed by P
  const keysL = []
  const keysP = []
  for (const s of scenes) {
    for (const k of s.cam) keysL.push({ sx: s.sx || 0, sy: 0, ...k, P: s.start + k.u * s.len, id: s.id })
    for (const k of s.camM || s.cam) keysP.push({ sx: 0, sy: s.syM ?? 0.1, ...k, P: s.start + k.u * s.len, id: s.id })
  }
  const dedupe = (keys) => keys.filter((k, i) => i === 0 || k.P - keys[i - 1].P > 1e-4)
  const KL = dedupe(keysL)
  const KP = dedupe(keysP)

  function sceneAt(P) {
    let i = 0
    while (i < scenes.length - 1 && P >= scenes[i + 1].start) i++
    const s = scenes[i]
    return { i, s, u: clamp01((P - s.start) / s.len) }
  }

  function clockAt(P) {
    const { s, u } = sceneAt(Math.min(P, total - 1e-6))
    if (typeof s.clock === 'function') return s.clock(u)
    const e = s.clockEase ? s.clockEase(u) : u
    return lerp(s.clock[0], s.clock[1], e)
  }

  const V = (k) => [k.tgt[0], k.tgt[1], k.tgt[2], k.yaw, k.pitch, k.dist, k.fov, k.sx, k.sy]
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t
    const t3 = t2 * t
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  }
  function camParams(keys, P) {
    if (P <= keys[0].P) return V(keys[0])
    if (P >= keys[keys.length - 1].P) return V(keys[keys.length - 1])
    let i = 0
    while (i < keys.length - 2 && P > keys[i + 1].P) i++
    const a = keys[i]
    const b = keys[i + 1]
    const t0 = (P - a.P) / (b.P - a.P)
    const t = t0 * t0 * (3 - 2 * t0) * 0.55 + t0 * 0.45 // a little ease at each key without stopping dead
    const p0 = V(keys[Math.max(0, i - 1)])
    const p1 = V(a)
    const p2 = V(b)
    const p3 = V(keys[Math.min(keys.length - 1, i + 2)])
    const out = []
    for (let k = 0; k < 9; k++) {
      // Catmull-Rom for the target, plain ease for angles/zoom (avoids overshoot)
      out[k] = k < 3 ? cr(p0[k], p1[k], p2[k], p3[k], t) : lerp(p1[k], p2[k], t)
    }
    return out
  }

  // Reduced motion: snap to each scene's middle key instead of flying between them.
  function camParamsReduced(keys, P) {
    const { s } = sceneAt(P)
    const mine = keys.filter((k) => k.id === s.id)
    const k = mine[Math.floor((mine.length - 1) / 2) + (mine.length > 2 ? 1 : 0)] || mine[0]
    return V(k)
  }

  function cameraAt(P, aspect, reduced, real = 0) {
    const portrait = aspect < 0.9
    const keys = portrait ? KP : KL
    const v = reduced ? camParamsReduced(keys, P) : camParams(keys, P)
    let [tx, ty, tz, yaw, pitch, dist, fov, sx, sy] = v
    if (portrait) {
      // keep wide shots wide enough on a tall screen
      const f = Math.min(2.0, Math.max(1, 1.2 / Math.pow(aspect, 0.72)))
      dist *= dist < 9 ? 1 + (f - 1) * 0.12 : f * 0.92
    } else if (aspect > 2.1) dist *= 0.94
    const { s, u } = sceneAt(P)
    if (s.jitter && !reduced) {
      const k = band(u, 0.05, 0.25, 0.85, 1)
      yaw += (Math.sin(real * 1.7) * 0.9 + Math.sin(real * 3.1 + 1) * 0.4) * k
      pitch += Math.sin(real * 2.3 + 2) * 0.6 * k
      tx += Math.sin(real * 1.1) * 0.12 * k
    }
    const yr = (yaw * Math.PI) / 180
    const pr = (Math.min(89.4, pitch) * Math.PI) / 180
    const pos = [tx + Math.sin(yr) * Math.cos(pr) * dist, ty + Math.sin(pr) * dist, tz + Math.cos(yr) * Math.cos(pr) * dist]
    return { pos, look: [tx, ty, tz], fov, pitch, dist, yaw, sx, sy }
  }

  return { scenes, total, sceneAt, clockAt, cameraAt, hero, offAt, onAgain, lastClean }
}
