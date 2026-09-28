// The restaurant, as a Three.js scene. It knows nothing about the story: each frame the director hands it
// a clock time, a camera and a few layer intensities, and it draws the room as the simulation says it is.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TABLES, TABLE_BY_ID, SERVERS, STATIONS, CAMERAS, FLOOR, KITCHEN } from '../sim/layout.js'
import { seatFor, seatIndex } from '../sim/query.js'
import { APPROACH } from '../sim/paths.js'
import { woodTexture, tileTexture, radialTexture, zoneTexture, ringTexture } from './textures.js'

import { STATE_COLORS } from './colors.js'
const C = (hex) => new THREE.Color(hex)

// A generic point-of-sale screen: ticket rows and a keypad. Deliberately unbranded.
function posScreenTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 176
  const g = c.getContext('2d')
  g.fillStyle = '#12161d'
  g.fillRect(0, 0, 256, 176)
  g.fillStyle = '#1d2430'
  g.fillRect(0, 0, 256, 18)
  g.fillStyle = '#e8edf5'
  for (let i = 0; i < 7; i++) {
    g.globalAlpha = i === 2 ? 0.95 : 0.55
    g.fillRect(10, 28 + i * 19, 70 + ((i * 37) % 40), 6)
    g.fillRect(118, 28 + i * 19, 18, 6)
  }
  g.globalAlpha = 1
  g.fillStyle = '#2b3442'
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) g.fillRect(156 + k * 32, 28 + r * 30, 28, 26)
  g.fillStyle = '#5f7fae'
  g.fillRect(156, 150, 92, 18)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createWorld({ canvas, sim, q, quality }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.aa, powerPreference: 'high-performance', stencil: false })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  const scene = new THREE.Scene()
  const BG = C('#0b0806')
  scene.background = BG
  scene.fog = new THREE.Fog(BG, 20, 70)
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500)

  // ---------- light ----------
  const hemi = new THREE.HemisphereLight('#ffe0bd', '#1a120c', 1.15)
  scene.add(hemi)
  const key = new THREE.DirectionalLight('#ffd6a8', 1.35)
  key.position.set(-6, 14, 9)
  scene.add(key)
  const fill = new THREE.DirectionalLight('#8aa4d6', 0.22)
  fill.position.set(10, 6, -8)
  scene.add(fill)
  const amb = new THREE.AmbientLight('#3a2a1e', 0.5)
  scene.add(amb)

  const glowTex = radialTexture([
    [0, 1],
    [0.25, 0.6],
    [0.6, 0.15],
    [1, 0],
  ])
  const blobTex = radialTexture([
    [0, 0.85],
    [0.5, 0.45],
    [1, 0],
  ])

  // ---------- materials ----------
  const wood = woodTexture(maxAniso)
  wood.repeat.set(4.2, 2.8)
  const M = {
    floor: new THREE.MeshLambertMaterial({ map: wood, color: '#c9a88c' }),
    tile: new THREE.MeshLambertMaterial({ map: tileTexture(), color: '#8a8580' }),
    wall: new THREE.MeshLambertMaterial({ color: '#2c231d' }),
    wainscot: new THREE.MeshLambertMaterial({ color: '#1e1813' }),
    kitchenWall: new THREE.MeshLambertMaterial({ color: '#3a3833' }),
    linen: new THREE.MeshLambertMaterial({ color: '#e9dfcd', emissive: '#3a2410', emissiveIntensity: 0.35 }),
    tableBase: new THREE.MeshLambertMaterial({ color: '#241d18' }),
    chair: new THREE.MeshLambertMaterial({ color: '#5b3e2b' }),
    steel: new THREE.MeshLambertMaterial({ color: '#9c9d9b' }),
    steelDark: new THREE.MeshLambertMaterial({ color: '#4c4d4c' }),
    counter: new THREE.MeshLambertMaterial({ color: '#3a2a20' }),
    barTop: new THREE.MeshLambertMaterial({ color: '#7a5436' }),
    body: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    head: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    plate: new THREE.MeshLambertMaterial({ color: '#f4f0e8' }),
    food: new THREE.MeshLambertMaterial({ color: '#c47a45' }),
    glass: new THREE.MeshLambertMaterial({ color: '#c9d3d6', transparent: true, opacity: 0.7 }),
    menu: new THREE.MeshLambertMaterial({ color: '#2a2724' }),
    presenter: new THREE.MeshLambertMaterial({ color: '#111010' }),
    napkin: new THREE.MeshLambertMaterial({ color: '#f1ece2' }),
    candle: new THREE.MeshBasicMaterial({ color: '#ffd394' }),
    shade: new THREE.MeshLambertMaterial({ color: '#2a2119', emissive: '#3a2410', emissiveIntensity: 0.6, transparent: true, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true }),
    cord: new THREE.MeshBasicMaterial({ color: '#0e0b09', transparent: true }),
    plant: new THREE.MeshLambertMaterial({ color: '#2f4a33' }),
    pot: new THREE.MeshLambertMaterial({ color: '#5a4636' }),
    screen: new THREE.MeshBasicMaterial({ color: '#ffffff', map: posScreenTexture() }),
    dome: new THREE.MeshLambertMaterial({ color: '#dcdcd8' }),
    domeGlass: new THREE.MeshLambertMaterial({ color: '#1b1d20' }),
    bottle: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    hood: new THREE.MeshLambertMaterial({ color: '#2a2a2a' }),
  }
  const addGlow = (color, opacity) =>
    new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, color: '#000', transparent: true, opacity: 0.55, depthWrite: false })

  const root = new THREE.Group()
  scene.add(root)
  const box = (w, h, d, mat, x, y, z, parent = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  const flat = (w, d, mat, x, y, z, parent = root) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
    m.rotation.x = -Math.PI / 2
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }

  // ---------- room ----------
  const fw = FLOOR.x1 - FLOOR.x0
  const fd = FLOOR.z1 - FLOOR.z0
  flat(fw, fd, M.floor, (FLOOR.x0 + FLOOR.x1) / 2, 0, (FLOOR.z0 + FLOOR.z1) / 2)
  // kitchen floor
  const kt = M.tile.map
  kt.repeat.set(3.2, 1.2)
  flat(KITCHEN.x1 - KITCHEN.x0, KITCHEN.z1 - KITCHEN.z0, M.tile, 0, 0.001, (KITCHEN.z0 + KITCHEN.z1) / 2)
  // outside darkness plane so the fog has something to eat
  flat(200, 200, new THREE.MeshBasicMaterial({ color: '#070504' }), 0, -0.02, 0)

  const H = 3.0
  // back wall with pass window
  box(10.7, H, 0.22, M.wall, -7.95, H / 2, -8.4)
  box(10.7, H, 0.22, M.wall, 7.95, H / 2, -8.4)
  box(5.2, H - 2.2, 0.22, M.wall, 0, 2.2 + (H - 2.2) / 2, -8.4)
  box(5.2, 1.02, 0.5, M.counter, 0, 0.51, -8.4) // pass counter
  box(5.3, 0.05, 0.62, M.steel, 0, 1.045, -8.4)
  // heat lamps
  box(4.8, 0.08, 0.14, new THREE.MeshBasicMaterial({ color: '#ffb35c' }), 0, 1.78, -8.3)
  // left wall with door
  box(0.22, H, 14.8, M.wall, -13.4, H / 2, -0.9)
  box(0.22, H, 1.1, M.wall, -13.4, H / 2, 8.65)
  box(0.22, H - 2.3, 1.6, M.wall, -13.4, 2.3 + (H - 2.3) / 2, 7.3)
  // right wall
  box(0.22, H, fd, M.wall, 13.4, H / 2, (FLOOR.z0 + FLOOR.z1) / 2)
  // wainscot
  box(26.8, 0.9, 0.05, M.wainscot, 0, 0.45, -8.27)
  box(0.05, 0.9, 17.5, M.wainscot, 13.27, 0.45, 0.45)
  box(0.05, 0.9, 14.6, M.wainscot, -13.27, 0.45, -1.0)
  // kitchen walls
  box(13.2, H, 0.2, M.kitchenWall, 0, H / 2, -13.3)
  box(0.2, H, 4.9, M.kitchenWall, -6.6, H / 2, -10.85)
  box(0.2, H, 4.9, M.kitchenWall, 6.6, H / 2, -10.85)
  // kitchen line
  box(11, 0.92, 0.8, M.steelDark, 0, 0.46, -11.0)
  box(11, 0.04, 0.82, M.steel, 0, 0.94, -11.0)
  box(11, 0.5, 1.0, M.hood, 0, 2.35, -11.1)
  box(11.4, 0.9, 0.7, M.steel, 0, 0.45, -12.8)
  box(4.8, 0.9, 0.6, M.steel, 0, 0.45, -9.05) // expo
  const lineGlow = flat(9.5, 0.6, addGlow('#ff8a3a', 0.28), 0, 0.97, -11.0)
  // stations on the floor side of the back wall
  box(1.8, 1.02, 0.55, M.counter, -6.2, 0.51, -7.95)
  box(1.8, 1.02, 0.55, M.counter, 6.3, 0.51, -7.95)
  // POS terminal
  const posStand = box(0.08, 0.25, 0.08, M.steelDark, -6.2, 1.15, -7.95)
  const posScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), M.screen)
  posScreen.position.set(-6.2, 1.36, -7.88)
  posScreen.rotation.x = -0.35
  root.add(posScreen)
  const posGlow = flat(1.6, 1.3, addGlow('#b8cfff', 0.0), -6.2, 1.06, -7.7)
  // bus tubs
  box(0.5, 0.18, 0.36, M.steelDark, 6.0, 1.11, -7.95)
  box(0.5, 0.18, 0.36, M.steelDark, 6.6, 1.11, -7.95)

  // bar
  box(0.9, 1.08, 9.6, M.counter, 10.4, 0.54, -1.5)
  box(1.0, 0.06, 9.7, M.barTop, 10.4, 1.1, -1.5)
  box(0.5, 2.3, 9.8, M.wainscot, 12.95, 1.15, -1.5)
  box(0.45, 0.04, 9.6, M.barTop, 12.8, 1.5, -1.5)
  box(0.45, 0.04, 9.6, M.barTop, 12.8, 2.05, -1.5)
  {
    const g = new THREE.CylinderGeometry(0.045, 0.05, 0.3, 6)
    const im = new THREE.InstancedMesh(g, M.bottle, 90)
    const m = new THREE.Matrix4()
    const cols = ['#5a7a4a', '#8a5a2a', '#c9b48a', '#3b4a5a', '#b88a4a', '#7a2f2a', '#d8d2c0']
    let i = 0
    for (let shelf = 0; shelf < 2; shelf++)
      for (let k = 0; k < 45; k++) {
        const z = -6.2 + k * 0.21 + (shelf ? 0.1 : 0)
        m.makeTranslation(12.8, shelf ? 2.22 : 1.67, z)
        im.setMatrixAt(i, m)
        im.setColorAt(i, C(cols[(k * 7 + shelf * 3) % cols.length]))
        i++
      }
    root.add(im)
  }
  const barGlow = flat(3.4, 11, addGlow('#ff9d52', 0.2), 11.4, 0.013, -1.5)
  // wall sconces: give the room some depth from the low angles
  const sconceMat = addGlow('#ffae62', 0.22)
  for (const x of [-11, -8.2, 4.2, 9.6]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), sconceMat)
    s.position.set(x, 2.0, -8.27)
    root.add(s)
  }
  for (const z of [-5, -1.2, 2.8]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), sconceMat)
    s.position.set(-13.27, 2.0, z)
    s.rotation.y = Math.PI / 2
    root.add(s)
  }
  // back bar wash
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.6), addGlow('#ffb06a', 0.18))
  wash.position.set(12.68, 1.7, -1.5)
  wash.rotation.y = -Math.PI / 2
  root.add(wash)

  // host stand + bench
  box(0.84, 1.08, 0.6, M.counter, STATIONS.hostStand[0], 0.54, STATIONS.hostStand[1])
  box(0.9, 0.05, 0.66, M.barTop, STATIONS.hostStand[0], 1.1, STATIONS.hostStand[1])
  const hostScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), M.screen.clone())
  hostScreen.material.color = C('#8fa7cf')
  hostScreen.position.set(STATIONS.hostStand[0], 1.14, STATIONS.hostStand[1] + 0.05)
  hostScreen.rotation.x = -1.2
  root.add(hostScreen)
  const hostGlow = flat(3.2, 3.2, addGlow('#ffb46a', 0.3), STATIONS.hostStand[0], 0.012, STATIONS.hostStand[1])
  box(0.6, 0.46, 2.8, M.counter, -12.75, 0.23, 4.6)
  // entrance light spill
  const doorGlow = flat(3.5, 2.8, addGlow('#ffcf9a', 0.25), -12.3, 0.012, 7.3)

  // plants
  for (const [x, z, s] of [
    [-12.7, -7.7, 1],
    [12.7, 7.9, 1.2],
    [-12.7, 2.6, 0.8],
    [8.4, 8.4, 1],
    [-8.9, 8.6, 0.9],
  ]) {
    box(0.5 * s, 0.5 * s, 0.5 * s, M.pot, x, 0.25 * s, z)
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 1), M.plant)
    f.position.set(x, 0.85 * s, z)
    f.scale.set(1, 1.25, 1)
    root.add(f)
  }

  // ---------- tables ----------
  const tableAnchors = []
  const tableBlobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), blobMat, TABLES.length)
  {
    const m = new THREE.Matrix4()
    const byShape = { round: [], square: [], rect: [] }
    TABLES.forEach((t) => byShape[t.shape].push(t))
    for (const [shape, list] of Object.entries(byShape)) {
      const t0 = list[0]
      const geo = shape === 'round' ? new THREE.CylinderGeometry(t0.w / 2, t0.w / 2, 0.05, 36) : new THREE.BoxGeometry(t0.w, 0.05, t0.d)
      const im = new THREE.InstancedMesh(geo, M.linen, list.length)
      list.forEach((t, k) => im.setMatrixAt(k, new THREE.Matrix4().makeTranslation(t.x, 0.75, t.z)))
      root.add(im)
    }
    const peds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), M.tableBase, TABLES.length)
    TABLES.forEach((t, k) => peds.setMatrixAt(k, new THREE.Matrix4().makeTranslation(t.x, 0.36, t.z)))
    root.add(peds)
    TABLES.forEach((t, i) => {
      m.makeRotationX(-Math.PI / 2)
      m.premultiply(new THREE.Matrix4().makeScale(t.w + 1.4, 1, t.d + 1.4))
      m.setPosition(t.x, 0.006, t.z)
      tableBlobs.setMatrixAt(i, m)
      tableAnchors.push(new THREE.Vector3(t.x, 1.3, t.z))
    })
    root.add(tableBlobs)
  }

  // chairs (instanced, they move a little when a party leaves)
  const chairGeo = mergeGeometries([
    new THREE.BoxGeometry(0.42, 0.05, 0.42).translate(0, 0.46, 0),
    new THREE.BoxGeometry(0.42, 0.42, 0.05).translate(0, 0.7, 0.19),
    new THREE.BoxGeometry(0.04, 0.44, 0.04).translate(-0.18, 0.22, -0.18),
    new THREE.BoxGeometry(0.04, 0.44, 0.04).translate(0.18, 0.22, -0.18),
    new THREE.BoxGeometry(0.04, 0.44, 0.04).translate(-0.18, 0.22, 0.18),
    new THREE.BoxGeometry(0.04, 0.44, 0.04).translate(0.18, 0.22, 0.18),
  ])
  const chairList = []
  TABLES.forEach((t) => t.chairs.forEach((c, k) => chairList.push({ t, k, x: c[0], z: c[1], a: Math.atan2(c[0] - t.x, c[1] - t.z) })))
  const chairs = new THREE.InstancedMesh(chairGeo, M.chair, chairList.length)
  root.add(chairs)
  // bar stools
  {
    const g = mergeGeometries([new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12).translate(0, 0.76, 0), new THREE.CylinderGeometry(0.03, 0.03, 0.74, 6).translate(0, 0.37, 0)])
    const im = new THREE.InstancedMesh(g, M.chair, 12)
    const m = new THREE.Matrix4()
    for (let i = 0; i < 12; i++) {
      m.makeTranslation(9.5, 0, -5.6 + i * 0.78)
      im.setMatrixAt(i, m)
    }
    root.add(im)
  }

  // pendants + light pools
  const pendantGroup = new THREE.Group()
  root.add(pendantGroup)
  const poolMat = addGlow('#ff9b4f', 0.4)
  const haloMat = addGlow('#ffc680', 0.5)
  // pendant lamps: shade, bulb, halo and cord, one instance per table
  const PEND = {
    shade: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.15, 0.16, 18, 1, true).translate(0, 2.2, 0), M.shade, TABLES.length),
    bulb: new THREE.InstancedMesh(new THREE.CircleGeometry(0.135, 18).rotateX(Math.PI / 2).translate(0, 2.125, 0), M.bulb, TABLES.length),
    cord: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 2.2, 4).translate(0, 3.38, 0), M.cord, TABLES.length),
    halo: new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.9), haloMat, TABLES.length),
  }
  for (const im of Object.values(PEND)) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    im.frustumCulled = false
    pendantGroup.add(im)
  }
  const _pm = new THREE.Matrix4()
  const _pv = new THREE.Vector3()
  const _ps = new THREE.Vector3()
  function updatePendants() {
    TABLES.forEach((t, i) => {
      // a lamp right in front of the lens just gets in the way
      const near = Math.hypot(t.x - camera.position.x, 2.2 - camera.position.y, t.z - camera.position.z) < 6.2
      const s = near ? 0 : 1
      _ps.set(s, s, s)
      _pv.set(t.x, 0, t.z)
      _pm.compose(_pv, qtnI, _ps)
      PEND.shade.setMatrixAt(i, _pm)
      PEND.bulb.setMatrixAt(i, _pm)
      PEND.cord.setMatrixAt(i, _pm)
      _pv.set(t.x, 2.1, t.z)
      _pm.compose(_pv, camera.quaternion, _ps)
      PEND.halo.setMatrixAt(i, _pm)
    })
    for (const im of Object.values(PEND)) im.instanceMatrix.needsUpdate = true
  }
  const qtnI = new THREE.Quaternion()
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), poolMat, TABLES.length)
  {
    const m = new THREE.Matrix4()
    TABLES.forEach((t, i) => {
      m.makeRotationX(-Math.PI / 2)
      m.premultiply(new THREE.Matrix4().makeScale(4.6, 1, 4.6))
      m.setPosition(t.x, 0.01, t.z)
      pools.setMatrixAt(i, m)
    })
  }
  root.add(pools)
  // table-top warmth
  const topGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), addGlow('#ffb86e', 0.22), TABLES.length)
  {
    const m = new THREE.Matrix4()
    TABLES.forEach((t, i) => {
      m.makeRotationX(-Math.PI / 2)
      m.premultiply(new THREE.Matrix4().makeScale(t.w + 0.9, 1, t.d + 0.9))
      m.setPosition(t.x, 0.785, t.z)
      topGlow.setMatrixAt(i, m)
    })
  }
  root.add(topGlow)

  // ---------- cameras (existing CCTV) ----------
  const camGroup = new THREE.Group()
  root.add(camGroup)
  const cones = []
  const coneMat = () =>
    new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uColor: { value: C('#9cc0ff') } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float h = vUv.y; float edge = pow(1.0-abs(dot(vN,vV)),1.6); float a = uOpacity * (0.25 + 0.75*edge) * (0.35 + 0.65*(1.0-h)); gl_FragColor=vec4(uColor*a, a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  const footMat = []
  CAMERAS.forEach((cam) => {
    const g = new THREE.Group()
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.domeGlass)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 18), M.dome)
    base.position.y = 0.03
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.4, 5), M.cord)
    rod.position.y = 0.73
    g.add(dome, base, rod)
    g.position.set(...cam.pos)
    camGroup.add(g)
    // field
    const [lx, , lz] = cam.look
    const h = cam.pos[1]
    const dx = lx - cam.pos[0]
    const dz = lz - cam.pos[2]
    const reach = Math.hypot(dx, dz)
    const len = Math.hypot(reach, h)
    const coneGeo = new THREE.ConeGeometry(4.2, len, 40, 1, true)
    coneGeo.translate(0, -len / 2, 0)
    const cone = new THREE.Mesh(coneGeo, coneMat())
    cone.position.set(...cam.pos)
    cone.lookAt(lx, 0, lz)
    cone.rotateX(-Math.PI / 2)
    root.add(cone)
    cones.push(cone)
    const fm = addGlow('#a8c6ff', 0)
    const foot = flat(9.8, 9.8, fm, lx, 0.02, lz)
    footMat.push(fm)
  })

  // ---------- intelligence layer (floor zones) ----------
  const zoneSq = new THREE.MeshBasicMaterial({ map: zoneTexture(false), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  const zoneRd = new THREE.MeshBasicMaterial({ map: zoneTexture(true), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  const sqTables = TABLES.filter((t) => t.shape !== 'round')
  const rdTables = TABLES.filter((t) => t.shape === 'round')
  const zonesSq = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), zoneSq, sqTables.length)
  const zonesRd = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), zoneRd, rdTables.length)
  const zoneIndex = {}
  {
    const m = new THREE.Matrix4()
    sqTables.forEach((t, i) => {
      m.makeRotationX(-Math.PI / 2)
      m.premultiply(new THREE.Matrix4().makeScale(t.w + 1.55, 1, t.d + 1.55))
      m.setPosition(t.x, 0.03, t.z)
      zonesSq.setMatrixAt(i, m)
      zonesSq.setColorAt(i, C('#000'))
      zoneIndex[t.id] = [zonesSq, i]
    })
    rdTables.forEach((t, i) => {
      m.makeRotationX(-Math.PI / 2)
      m.premultiply(new THREE.Matrix4().makeScale(t.w + 1.55, 1, t.d + 1.55))
      m.setPosition(t.x, 0.03, t.z)
      zonesRd.setMatrixAt(i, m)
      zonesRd.setColorAt(i, C('#000'))
      zoneIndex[t.id] = [zonesRd, i]
    })
  }
  root.add(zonesSq, zonesRd)
  // section tint discs
  const secMat = addGlow('#ffffff', 1)
  const secDiscs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), secMat, TABLES.length)
  {
    const m = new THREE.Matrix4()
    TABLES.forEach((t, i) => {
      m.makeRotationX(-Math.PI / 2)
      m.premultiply(new THREE.Matrix4().makeScale(t.w + 2.6, 1, t.d + 2.6))
      m.setPosition(t.x, 0.025, t.z)
      secDiscs.setMatrixAt(i, m)
      secDiscs.setColorAt(i, C('#000'))
    })
  }
  root.add(secDiscs)
  // focus rings
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  const rings = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), ringMat, 6)
  rings.count = 0
  root.add(rings)
  // wake wave
  const waveMat = new THREE.MeshBasicMaterial({ map: ringTexture(), color: '#9fc0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const waves = CAMERAS.map((cam) => {
    const w = flat(1, 1, waveMat, cam.look[0], 0.04, cam.look[2])
    return w
  })
  // highlight glows for "ask your restaurant"
  const hi = {
    pass: flat(6.5, 3.2, addGlow('#9fc0ff', 0), 0, 1.1, -9.2),
    prep: flat(11, 2.8, addGlow('#9fc0ff', 0), 0, 1.0, -12.2),
    line: flat(11, 2.4, addGlow('#9fc0ff', 0), 0, 1.0, -11.0),
    host: flat(4.6, 4.6, addGlow('#9fc0ff', 0), STATIONS.hostStand[0], 0.05, STATIONS.hostStand[1] - 0.6),
    door: flat(4.2, 4.2, addGlow('#9fc0ff', 0), -12.4, 0.05, 6.6),
    pos: flat(2.6, 2.4, addGlow('#9fc0ff', 0), -6.2, 1.1, -7.6),
    floor: flat(22, 13, addGlow('#9fc0ff', 0), -0.5, 0.05, -1.2),
  }

  // ---------- people ----------
  const bodyGeo = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.16, 0],
      [0.19, 0.07],
      [0.205, 0.42],
      [0.185, 0.78],
      [0.165, 1.0],
      [0.19, 1.14],
      [0.15, 1.25],
      [0.07, 1.31],
      [0.0, 1.32],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    14,
  )
  const headGeo = new THREE.SphereGeometry(0.112, 14, 10)
  const MAXP = 180
  const bodies = new THREE.InstancedMesh(bodyGeo, M.body, MAXP)
  const heads = new THREE.InstancedMesh(headGeo, M.head, MAXP)
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), M.body, MAXP)
  const arms = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.046, 0.34, 3, 7), M.body, MAXP * 2)
  const bands = new THREE.InstancedMesh(new THREE.TorusGeometry(0.205, 0.04, 6, 20).rotateX(Math.PI / 2), M.body, 24)
  const pBlobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), blobMat, MAXP)
  for (const im of [bodies, heads, hair, arms, bands, pBlobs]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    im.frustumCulled = false
    root.add(im)
  }
  bodies.setColorAt(0, C('#fff'))
  heads.setColorAt(0, C('#fff'))
  hair.setColorAt(0, C('#fff'))
  arms.setColorAt(0, C('#fff'))
  bands.setColorAt(0, C('#fff'))
  const HAIR = ['#1b1410', '#2b1d14', '#4a3222', '#6b4a2e', '#b08a5a', '#8a8580', '#141414', '#3a2a20'].map(C)

  // ---------- table props ----------
  const mkProps = (geo, mat, n) => {
    const im = new THREE.InstancedMesh(geo, mat, n)
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    im.frustumCulled = false
    root.add(im)
    return im
  }
  const P = {
    plate: mkProps(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 16), M.plate, 140),
    food: mkProps(new THREE.CylinderGeometry(0.075, 0.08, 0.035, 10), M.food, 140),
    glass: mkProps(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 8), M.glass, 140),
    menu: mkProps(new THREE.BoxGeometry(0.24, 0.012, 0.33), M.menu, 140),
    presenter: mkProps(new THREE.BoxGeometry(0.13, 0.02, 0.22), M.presenter, 24),
    napkin: mkProps(new THREE.BoxGeometry(0.11, 0.015, 0.2), M.napkin, 140),
    crumple: mkProps(new THREE.IcosahedronGeometry(0.06, 0), M.napkin, 90),
    candle: mkProps(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 8), M.candle, TABLES.length),
    passPlate: mkProps(new THREE.CylinderGeometry(0.14, 0.12, 0.03, 14), M.plate, 16),
  }
  const candleGlow = mkProps(new THREE.PlaneGeometry(1, 1), addGlow('#ffcf8a', 0.55), TABLES.length)

  // ---------- per-frame ----------
  const mtx = new THREE.Matrix4()
  const qtn = new THREE.Quaternion()
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const flatRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const tmpC = new THREE.Color()
  const agentTmp = { x: 0, z: 0, walking: false, act: null, table: null }
  const serverColor = Object.fromEntries(SERVERS.map((s) => [s.id, C(s.color)]))
  const staffBody = C('#1d1c1f')
  const hostBody = C('#262a33')
  const cookBody = C('#e6e3dc')
  const cookHat = C('#f2f0ea')
  const bandWhite = C('#d9d3c6')
  const bandGold = C('#c7a15c')
  const skinStaff = [C('#d9ae8e'), C('#8d5e42'), C('#e8c4a8'), C('#b98563'), C('#c79b7b'), C('#f0d2bd')]

  let pi = 0
  let bi = 0
  let ai = 0
  const qArm = new THREE.Quaternion()
  const L = new THREE.Vector3()
  // One figure. (fx,fz) is the way they face; `swing` is the walk cycle; `reach` lifts a seated arm (talking).
  function person(x, z, mode, h, bodyCol, headCol, bob, band, fx = 0, fz = 1, swing = 0, hairCol = null, reach = 0) {
    if (pi >= MAXP) return
    const seated = mode === 'sit'
    const sy = seated ? 0.6 : 1
    const baseY = seated ? 0.32 : 0
    pos.set(x, baseY + bob, z)
    scl.set(h, sy * h, h)
    qtn.identity()
    mtx.compose(pos, qtn, scl)
    bodies.setMatrixAt(pi, mtx)
    bodies.setColorAt(pi, bodyCol)
    const hy = baseY + bob + 1.32 * sy * h + 0.1 * h
    pos.set(x, hy, z)
    scl.set(h, h, h)
    mtx.compose(pos, qtn, scl)
    heads.setMatrixAt(pi, mtx)
    heads.setColorAt(pi, headCol)
    // hair sits up and slightly back
    pos.set(x - fx * 0.018 * h, hy + 0.012 * h, z - fz * 0.018 * h)
    mtx.compose(pos, qtn, scl)
    hair.setMatrixAt(pi, mtx)
    hair.setColorAt(pi, hairCol || HAIR[0])
    // arms
    L.set(fz, 0, -fx)
    const shoulderY = baseY + bob + (seated ? 1.12 * 0.6 : 1.16) * h
    for (let side = -1; side <= 1; side += 2) {
      if (ai >= MAXP * 2) break
      let theta
      if (seated) theta = -0.78 - (side > 0 ? reach : 0)
      else theta = swing * side
      qArm.setFromAxisAngle(L, theta)
      // arm hangs from the shoulder: direction = rotate (0,-1,0)
      const cx = Math.sin(-theta) * fx
      const cz = Math.sin(-theta) * fz
      const cy = -Math.cos(theta)
      const half = 0.22 * h
      pos.set(x + L.x * 0.215 * h * side + cx * half, shoulderY + cy * half, z + L.z * 0.215 * h * side + cz * half)
      scl.set(h, h, h)
      mtx.compose(pos, qArm, scl)
      arms.setMatrixAt(ai, mtx)
      arms.setColorAt(ai, bodyCol)
      ai++
    }
    pos.set(x, 0.008, z)
    scl.set(seated ? 0.8 : 0.72, 1, seated ? 0.8 : 0.72)
    mtx.compose(pos, flatRot, scl)
    pBlobs.setMatrixAt(pi, mtx)
    if (band && bi < 24) {
      pos.set(x, baseY + bob + (seated ? 0.4 : 0.62) * h, z)
      scl.set(h, h, h)
      mtx.compose(pos, qtn, scl)
      bands.setMatrixAt(bi, mtx)
      bands.setColorAt(bi, band)
      bi++
    }
    pi++
  }

  // facing from movement (kept between frames), falling back to a default
  function face(obj, x, z, dfx, dfz) {
    const px = obj._px
    const pz = obj._pz
    obj._px = x
    obj._pz = z
    if (px !== undefined) {
      const dx = x - px
      const dz = z - pz
      const d = Math.hypot(dx, dz)
      if (d > 0.004 && d < 1.5) {
        const k = Math.min(1, d * 6)
        obj._fx = (obj._fx ?? dfx) * (1 - k) + (dx / d) * k
        obj._fz = (obj._fz ?? dfz) * (1 - k) + (dz / d) * k
      }
    }
    let fx = obj._fx ?? dfx
    let fz = obj._fz ?? dfz
    const l = Math.hypot(fx, fz) || 1
    return [fx / l, fz / l]
  }

  const guestColors = new Map()
  const colorOf = (hex) => {
    let c = guestColors.get(hex)
    if (!c) {
      c = C(hex)
      guestColors.set(hex, c)
    }
    return c
  }

  const counts = {}
  function prop(name, x, y, z, rotY = 0, s = 1) {
    const im = P[name]
    const i = counts[name] || 0
    if (i >= im.instanceMatrix.count) return
    pos.set(x, y, z)
    qtn.setFromAxisAngle(up, rotY)
    scl.set(s, s, s)
    mtx.compose(pos, qtn, scl)
    im.setMatrixAt(i, mtx)
    counts[name] = i + 1
  }

  function updateTables(c, real, reduced) {
    for (const k in P) counts[k] = 0
    let ci = 0
    const chairOffset = {}
    TABLES.forEach((t, ti) => {
      const st = q.tableState(t.id, c)
      const p = st.party
      const ang = (x, z) => Math.atan2(x - t.x, z - t.z)
      // candle
      prop('candle', t.x, 0.8, t.z)
      pos.set(t.x, 0.83, t.z)
      scl.set(0.55, 0.55, 0.55)
      const flick = reduced ? 1 : 0.9 + Math.sin(real * 9 + ti * 3.1) * 0.06 + Math.sin(real * 23 + ti) * 0.04
      scl.multiplyScalar(flick)
      mtx.compose(pos, flatRot, scl)
      candleGlow.setMatrixAt(ti, mtx)

      const open = !p || c >= (p.bussedAt ?? Infinity) || c < p.seatedAt
      if (open) {
        // place settings
        t.chairs.forEach((ch) => {
          const x = t.x + (ch[0] - t.x) * 0.55
          const z = t.z + (ch[1] - t.z) * 0.55
          prop('napkin', x, 0.785, z, ang(ch[0], ch[1]))
        })
        return
      }
      const seats = []
      for (let k = 0; k < p.size; k++) seats.push(t.chairs[seatIndex(k, p.size, t.seats) % t.chairs.length])
      const toward = (ch, f) => [t.x + (ch[0] - t.x) * f, t.z + (ch[1] - t.z) * f]
      const left = c >= p.leaveAt
      if (left) chairOffset[t.id] = true
      seats.forEach((ch, k) => {
        const a = ang(ch[0], ch[1])
        if (c < p.readyAt) {
          const [x, z] = toward(ch, 0.6)
          prop('menu', x, 0.787, z, a + 0.15)
        }
        if (c >= p.greetedAt) {
          const [x, z] = toward(ch, 0.62)
          prop('glass', x + Math.cos(a) * 0.14, 0.84, z - Math.sin(a) * 0.14)
        }
        if (c >= p.foodAt) {
          const [x, z] = toward(ch, 0.5)
          prop('plate', x, 0.79, z)
          if (c < p.finishAt) prop('food', x, 0.805, z)
        }
        if (left) {
          const [x, z] = toward(ch, 0.35 + (k % 2) * 0.12)
          prop('crumple', x + 0.08, 0.8, z + 0.05, k)
        }
      })
      if (c >= p.readyAt && c < p.orderTakenAt) {
        // menus closed, stacked at the edge: the "ready to order" tell
        const ch = seats[0]
        const [x, z] = toward(ch, 0.35)
        for (let k = 0; k < Math.min(p.size, 4); k++) prop('menu', x, 0.787 + k * 0.014, z, 0.2)
      }
      if (c >= p.checkAt && c < p.leaveAt) {
        const ch = seats[0]
        const [x, z] = toward(ch, 0.25)
        prop('presenter', x + 0.1, 0.79, z, 0.4)
      }
    })
    // chairs
    chairList.forEach((ch, i) => {
      const push = chairOffset[ch.t.id] ? 0.16 : 0
      const dx = ch.x - ch.t.x
      const dz = ch.z - ch.t.z
      const l = Math.hypot(dx, dz) || 1
      pos.set(ch.x + (dx / l) * push, 0, ch.z + (dz / l) * push)
      qtn.setFromAxisAngle(up, ch.a + (push ? 0.25 : 0))
      scl.set(1, 1, 1)
      mtx.compose(pos, qtn, scl)
      chairs.setMatrixAt(i, mtx)
    })
    chairs.instanceMatrix.needsUpdate = true
    // pass plates
    const n = Math.min(16, Math.ceil(q.passPlates(c)))
    for (let k = 0; k < n; k++) prop('passPlate', -2.1 + k * 0.28, 1.08, -8.4 + (k % 2) * 0.12)
    for (const k in P) {
      P[k].count = counts[k]
      P[k].instanceMatrix.needsUpdate = true
    }
    candleGlow.instanceMatrix.needsUpdate = true
  }

  function updatePeople(c, real, reduced) {
    pi = 0
    bi = 0
    const idle = reduced ? 0 : 1
    // staff
    ai = 0
    const staff = [...sim.servers, sim.busser, sim.host]
    staff.forEach((a, k) => {
      q.agentAt(a, c, agentTmp)
      const walk = agentTmp.walking
      const bob = walk ? Math.abs(Math.sin(c * 95 + k)) * 0.035 * idle + Math.abs(Math.sin(real * 7 + k)) * 0.02 * idle : Math.sin(real * 1.3 + k) * 0.006 * idle
      const band = a.role === 'server' ? serverColor[a.id] : a.role === 'busser' ? bandWhite : bandGold
      let [fx, fz] = face(a, agentTmp.x, agentTmp.z, 0, -1)
      if (!walk && agentTmp.table) {
        // at a table: face it
        const t = TABLE_BY_ID[agentTmp.table]
        if (t && agentTmp.act !== 'pos' && agentTmp.act !== 'pickup') {
          const dx = t.x - agentTmp.x
          const dz = t.z - agentTmp.z
          const l = Math.hypot(dx, dz) || 1
          fx = dx / l
          fz = dz / l
        }
      }
      const swing = walk ? Math.sin(c * 95 + k) * 0.45 * (idle || 0.6) : 0.05
      person(agentTmp.x, agentTmp.z, 'stand', 1.02, a.role === 'host' ? hostBody : staffBody, skinStaff[k % skinStaff.length], bob, band, fx, fz, swing, HAIR[(k * 3) % HAIR.length])
    })
    // kitchen
    for (let k = 0; k < 4; k++) {
      const x = -4 + k * 2.6 + Math.sin(c * 0.9 + k * 1.7) * 1.1 + Math.sin(real * 0.8 + k) * 0.12 * idle
      const z = k === 3 ? -9.6 : -11.85 + Math.sin(c * 0.5 + k) * 0.18
      person(x, z, 'stand', 1.0, cookBody, skinStaff[(k + 2) % skinStaff.length], 0, null, 0, k === 3 ? 1 : 1, Math.sin(real * 2 + k) * 0.25 * idle, cookHat)
    }
    // bartender + bar guests
    person(11.55, -1.5 + Math.sin(c * 0.35) * 3 + Math.sin(real * 0.5) * 0.1 * idle, 'stand', 1.0, staffBody, skinStaff[4], 0, bandGold, -1, 0, 0.1, HAIR[1])
    for (let s = 0; s < 12; s++) {
      const slot = Math.floor((c + s * 13.7) / 41)
      const hsh = Math.sin(slot * 12.9898 + s * 78.233) * 43758.5453
      const on = hsh - Math.floor(hsh) > (c > 300 ? 0.8 : 0.42)
      if (on) person(9.5, -5.6 + s * 0.78, 'sit', 0.98, colorOf(['#3f5b7a', '#8a8f5a', '#b8664a', '#d8c6a8', '#6b4b6e'][s % 5]), skinStaff[s % skinStaff.length], Math.sin(real * 1.1 + s) * 0.008 * idle, null, 1, 0, 0, HAIR[s % HAIR.length], 0)
    }
    // guests
    q.forGuests(c, (g, x, z, mode, p) => {
      const bob = mode === 'walk' ? Math.abs(Math.sin(c * 80 + g.phase)) * 0.03 * idle + Math.abs(Math.sin(real * 6.5 + g.phase)) * 0.02 * idle : mode === 'sit' ? Math.sin(real * 1.2 + g.phase) * 0.01 * idle : Math.sin(real * 0.9 + g.phase) * 0.005 * idle
      let lx = x
      let lz = z
      let fx
      let fz
      let reach = 0
      if (mode === 'sit') {
        const t = TABLE_BY_ID[p.table]
        const dx = t.x - x
        const dz = t.z - z
        const l = Math.hypot(dx, dz) || 1
        fx = dx / l
        fz = dz / l
        g._px = undefined
        if (idle) {
          // lean in, and now and then a hand comes up mid-story
          const talk = Math.max(0, Math.sin(real * 0.45 + g.phase * 3))
          lx += fx * talk * 0.05
          lz += fz * talk * 0.05
          reach = Math.max(0, Math.sin(real * 0.9 + g.phase * 5)) * 0.55
        }
      } else {
        ;[fx, fz] = face(g, x, z, 1, 0)
      }
      const swing = mode === 'walk' ? Math.sin(c * 80 + g.phase) * 0.4 : 0.04
      person(lx, lz, mode, g.h, colorOf(g.color), colorOf(g.skin), bob, null, fx, fz, swing, HAIR[Math.floor(g.phase * 7) % HAIR.length], reach)
    })
    bodies.count = heads.count = pBlobs.count = hair.count = pi
    arms.count = ai
    bands.count = bi
    for (const im of [bodies, heads, hair, arms, bands, pBlobs]) im.instanceMatrix.needsUpdate = true
    for (const im of [bodies, heads, hair, arms, bands]) if (im.instanceColor) im.instanceColor.needsUpdate = true
  }

  const reveal = TABLES.map((t) => {
    // Distance to the nearest camera's look point decides when Shire "reaches" a table in the wake wave.
    let d = Infinity
    for (const cam of CAMERAS) d = Math.min(d, Math.hypot(t.x - cam.look[0], t.z - cam.look[2]))
    return d
  })
  const maxReveal = Math.max(...reveal)

  const SC = Object.fromEntries(Object.entries(STATE_COLORS).map(([k, v]) => [k, C(v)]))
  function updateLayer(c, real, L) {
    // zones
    const neutral = SC.neutral
    TABLES.forEach((t, i) => {
      const [im, k] = zoneIndex[t.id]
      const st = q.tableState(t.id, c)
      const r = Math.min(1, Math.max(0, (L.zones * (maxReveal + 3) - reveal[i]) / 2.2))
      const stateCol = SC[st.cat]
      tmpC.copy(neutral).lerp(stateCol, L.tint)
      let a = r * (L.zoneAlpha ?? 0.9)
      if (st.flag && L.tint > 0.5 && !L.reduced) a *= 0.8 + 0.35 * (0.5 + 0.5 * Math.sin(real * 3.2 + i))
      const f = L.focus && L.focus.find((x) => x.id === t.id)
      if (L.focusOnly && !f) a *= 0.25
      tmpC.multiplyScalar(a * 0.9)
      im.setColorAt(k, tmpC)
      // section tints
      const sc = serverColor[t.section]
      tmpC.copy(sc).multiplyScalar(0.22 * L.sections)
      secDiscs.setColorAt(i, tmpC)
    })
    zonesSq.instanceColor.needsUpdate = true
    zonesRd.instanceColor.needsUpdate = true
    secDiscs.instanceColor.needsUpdate = true
    // focus rings
    let n = 0
    for (const f of L.focus || []) {
      const t = TABLES.find((x) => x.id === f.id)
      if (!t || n >= 6) continue
      const pulse = L.reduced ? 1 : 1 + 0.06 * Math.sin(real * 3 + n)
      const s = (Math.max(t.w, t.d) + 2.3) * pulse
      pos.set(t.x, 0.05, t.z)
      scl.set(s, 1, s)
      mtx.compose(pos, flatRot, scl)
      rings.setMatrixAt(n, mtx)
      tmpC.set(f.color || '#cfe0ff').multiplyScalar(f.k)
      rings.setColorAt(n, tmpC)
      n++
    }
    rings.count = n
    rings.instanceMatrix.needsUpdate = true
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true
    // cameras
    cones.forEach((cone, i) => {
      const r = L.camReveal ? L.camReveal[i] : 0
      cone.material.uniforms.uOpacity.value = r * L.cones * 0.5
      cone.visible = r * L.cones > 0.002
      footMat[i].opacity = r * L.cones * 0.2
    })
    // wake wave
    const w = L.wave ?? 0
    waveMat.opacity = w > 0 && w < 1 ? Math.sin(w * Math.PI) * 0.55 : 0
    waves.forEach((m) => {
      const s = 0.5 + w * 26
      m.scale.set(s, s, 1)
      m.visible = waveMat.opacity > 0.001
    })
    // highlights
    for (const k in hi) hi[k].material.opacity = (L.hi && L.hi[k]) || 0
    posGlow.material.opacity = L.posGlow || 0
  }

  const _proj = new THREE.Vector3()
  function project(x, y, z, out) {
    _proj.set(x, y, z).project(camera)
    out.x = (_proj.x * 0.5 + 0.5) * size.w
    out.y = (-_proj.y * 0.5 + 0.5) * size.h
    out.z = _proj.z
    out.vis = _proj.z < 1 && _proj.x > -1.2 && _proj.x < 1.2 && _proj.y > -1.2 && _proj.y < 1.2
    return out
  }

  const size = { w: 1, h: 1 }
  function resize(w, h, dpr) {
    size.w = w
    size.h = h
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const look = new THREE.Vector3()
  function update(F) {
    const { clock: c, real, cam, env, layer } = F
    camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2])
    look.set(cam.look[0], cam.look[1], cam.look[2])
    camera.up.set(0, 1, 0)
    camera.lookAt(look)
    if (cam.roll) camera.rotateZ(cam.roll)
    const ox = -(cam.sx || 0) * size.w
    const oy = (cam.sy || 0) * size.h
    if (Math.abs(ox) > 0.5 || Math.abs(oy) > 0.5) camera.setViewOffset(size.w, size.h, ox, oy, size.w, size.h)
    else if (camera.view) camera.clearViewOffset()
    if (camera.fov !== cam.fov) {
      camera.fov = cam.fov
      camera.updateProjectionMatrix()
    }
    const dist = camera.position.distanceTo(look)
    scene.fog.near = dist * 0.85
    scene.fog.far = dist * 2.6 + 12
    renderer.toneMappingExposure = env.exposure
    const pend = env.pendants
    M.shade.opacity = env.pendantVis
    M.bulb.opacity = pend * env.pendantVis
    haloMat.opacity = 0.5 * pend * env.pendantVis
    if (pendantGroup.visible) updatePendants()
    M.cord.opacity = env.pendantVis
    pendantGroup.visible = env.pendantVis > 0.02
    poolMat.opacity = 0.34 * pend
    topGlow.material.opacity = 0.22 * pend
    M.linen.emissiveIntensity = 0.35 * pend
    barGlow.material.opacity = 0.2 * pend
    sconceMat.opacity = 0.22 * pend
    wash.material.opacity = 0.18 * pend
    hostGlow.material.opacity = 0.3 * pend
    doorGlow.material.opacity = 0.25 * pend
    lineGlow.material.opacity = 0.28 * (0.5 + 0.5 * pend)
    hemi.intensity = 1.15 * env.room
    key.intensity = 1.35 * env.room
    updateTables(c, real, layer.reduced)
    updatePeople(c, real, layer.reduced)
    updateLayer(c, real, layer)
    renderer.render(scene, camera)
  }

  function dispose() {
    renderer.dispose()
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material]
        ms.forEach((m) => {
          if (m.map) m.map.dispose()
          m.dispose()
        })
      }
    })
  }

  return { renderer, scene, camera, update, resize, project, dispose, tableAnchors, size }
}
