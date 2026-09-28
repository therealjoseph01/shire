// A single requestAnimationFrame "director". Scroll → story position → clock, camera, layer.
// React renders the structure once; everything per-frame is written straight to the DOM / WebGL from here.
import { simulate } from '../sim/simulate.js'
import { makeQuery, fmtClock } from '../sim/query.js'
import { buildStory, ss, clamp01, lerp } from './story.js'
import { frameLayer } from './layer.js'

export const sim = simulate(7)
export const q = makeQuery(sim)
export const story = buildStory(sim)
export { fmtClock }

const subs = new Map() // sceneId -> Set<fn>
const globalSubs = new Set()
const sceneEls = new Map() // sceneId -> { layer, section, beats: [] }

export function onScene(id, fn) {
  if (!subs.has(id)) subs.set(id, new Set())
  subs.get(id).add(fn)
  return () => subs.get(id).delete(fn)
}
export function onFrame(fn) {
  globalSubs.add(fn)
  return () => globalSubs.delete(fn)
}
export function registerScene(id, section, layer) {
  const beats = [...layer.querySelectorAll('[data-beat]')].map((el) => {
    const [a, b, c, d] = el.dataset.beat.split(' ').map(Number)
    return { el, a, b, c, d, last: -1 }
  })
  sceneEls.set(id, { section, layer, beats, visible: null })
  if (R.running) R.measure()
  return () => sceneEls.delete(id)
}

export const R = {
  running: false,
  world: null,
  P: 0,
  Ps: 0,
  vh: 800,
  vw: 1200,
  reduced: false,
  introT: 1,
  lenis: null,
  frame: null,
}

let raf = 0
let lastP = -1
let lastReal = 0
let frameSkip = 0
let introStart = 0

export function start({ world, reduced, lenis }) {
  if (typeof window !== 'undefined') window.__shire = { R, story, sim, q }
  R.world = world
  R.reduced = reduced
  R.lenis = lenis
  R.running = true
  R.introT = !reduced && window.scrollY < 4 ? 0 : 1
  introStart = performance.now()
  R.measure()
  window.addEventListener('resize', onResize)
  // layout can still shift while fonts land; check the width again shortly after start
  setTimeout(onResize, 600)
  setTimeout(onResize, 1800)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize)
  raf = requestAnimationFrame(loop)
}
export function stop() {
  R.running = false
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
}

let lastW = 0
let lastH = 0
const viewW = () => document.documentElement.clientWidth || window.innerWidth
function onResize() {
  const w = viewW()
  const h = window.innerHeight
  // ignore mobile URL-bar height wobble
  if (w === lastW && Math.abs(h - lastH) < 120 && lastH) return
  R.measure()
}

R.measure = function () {
  const w = viewW()
  const h = window.innerHeight
  lastW = w
  lastH = h
  R.vw = w
  R.vh = h
  for (const s of story.scenes) {
    const el = sceneEls.get(s.id)
    if (el) el.section.style.height = `${Math.round(s.len * h)}px`
  }
  const dpr = Math.min(window.devicePixelRatio || 1, w < 820 ? 1.25 : 1.5) * (R.quality || 1)
  R.world && R.world.resize(w, h, dpr)
  lastP = -1
}

function storyTop() {
  const first = sceneEls.get(story.scenes[0].id)
  return first ? first.section.offsetTop : 0
}

const frame = {
  clock: 0,
  real: 0,
  cam: null,
  env: null,
  layer: null,
  tags: null,
  P: 0,
  u: 0,
  scene: null,
  i: 0,
  portrait: false,
}
R.frame = frame

let perfAcc = 0
let perfN = 0
function loop(now) {
  raf = requestAnimationFrame(loop)
  const real = now / 1000
  const dt = Math.min(0.1, real - lastReal || 0.016)
  lastReal = real
  const y = R.lenis ? R.lenis.animatedScroll : window.scrollY
  const target = Math.max(0, (y - storyTop()) / R.vh)
  // light damping for touch/native scroll; Lenis already smooths the wheel
  R.Ps = R.reduced || R.lenis ? target : lerp(R.Ps, target, 1 - Math.pow(0.001, dt))
  if (Math.abs(R.Ps - target) < 0.0005) R.Ps = target
  const P = Math.min(R.Ps, story.total)

  // cold open
  if (R.introT < 1) {
    const elapsed = (now - introStart) / 1000
    R.introT = Math.max(R.introT, clamp01(elapsed / 9))
    if (P > 0.02) R.introT = Math.min(1, R.introT + dt * 2.2)
  }

  const past = y - storyTop() > (story.total + 0.2) * R.vh
  const moving = Math.abs(P - lastP) > 1e-5 || R.introT < 1
  if (past && !moving) return
  if (!moving) {
    if (R.reduced) return
    // idle: half rate is plenty for people chatting and candles
    frameSkip = (frameSkip + 1) % 2
    if (frameSkip) return
  }
  lastP = P

  const { i, s, u } = story.sceneAt(P)
  let clock = story.clockAt(P)
  const aspect = R.vw / R.vh
  const cam = story.cameraAt(P, aspect, R.reduced, real)
  if (R.introT < 1) {
    const e = ss(0, 1, R.introT)
    clock = lerp(clock - 10, clock, e)
    cam.pos = cam.pos.map((v, k) => lerp(v + [3.5, 1.2, 5][k], v, e))
    cam.fov = lerp(cam.fov - 3, cam.fov, e)
  }
  const F = frameLayer(story, P, clock, cam.pitch)
  F.layer.reduced = R.reduced
  if (R.introT < 1) {
    F.env.pendants *= ss(0, 0.55, R.introT) * 0.8 + 0.2
    F.env.exposure *= lerp(0.55, 1, ss(0, 0.7, R.introT))
  }
  frame.clock = clock
  frame.real = real
  frame.cam = cam
  frame.env = F.env
  frame.layer = F.layer
  frame.tags = F.tags
  frame.P = P
  frame.u = u
  frame.scene = s
  frame.i = i
  frame.portrait = aspect < 0.9
  frame.introT = R.introT

  const t0 = performance.now()
  R.world && R.world.update(frame)
  // adaptive quality: if the GPU is struggling, drop resolution once or twice
  perfAcc += performance.now() - t0
  if (++perfN === 90) {
    const avg = perfAcc / perfN
    if (avg > 22 && (R.quality || 1) > 0.6) {
      R.quality = (R.quality || 1) * 0.8
      R.measure()
    }
    perfAcc = 0
    perfN = 0
  }

  for (const fn of globalSubs) fn(frame)
  // scene layers + beats
  for (const sc of story.scenes) {
    const el = sceneEls.get(sc.id)
    if (!el) continue
    const on = P >= sc.start - 0.04 && P <= sc.start + sc.len + 0.04 && !past
    if (on !== el.visible) {
      el.layer.style.visibility = on ? 'visible' : 'hidden'
      el.layer.style.display = on ? '' : 'none'
      el.visible = on
      if (!on) for (const b of el.beats) b.last = -1
    }
    if (!on) continue
    const lu = clamp01((P - sc.start) / sc.len)
    const introK = sc.id === 'service' ? ss(0.45, 0.9, R.introT) : 1
    for (const b of el.beats) {
      const o = ss(b.a, b.b, lu) * (1 - ss(b.c, b.d, lu)) * introK
      const r = Math.round(o * 1000) / 1000
      if (r !== b.last) {
        b.last = r
        const dy = (1 - ss(b.a, b.b, lu)) * 14 - ss(b.c, b.d, lu) * 14
        b.el.style.opacity = r
        b.el.style.transform = R.reduced ? '' : `translate3d(0,${dy.toFixed(1)}px,0)`
        b.el.style.visibility = r < 0.002 ? 'hidden' : 'visible'
      }
    }
    const fns = subs.get(sc.id)
    if (fns) {
      const st = { ...frame, u: lu, sceneId: sc.id }
      for (const fn of fns) fn(st)
    }
  }
}

// helpers for widgets
export function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (R.lenis) R.lenis.scrollTo(el, { duration: R.reduced ? 0 : 1.6 })
  else el.scrollIntoView({ behavior: R.reduced ? 'auto' : 'smooth' })
}
