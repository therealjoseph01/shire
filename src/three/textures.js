import * as THREE from 'three'

function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Dark walnut planks
export function woodTexture(maxAniso = 4) {
  const [c, g] = canvas(1024)
  const r = rng(11)
  g.fillStyle = '#35271d'
  g.fillRect(0, 0, 1024, 1024)
  const rows = 8
  const rh = 1024 / rows
  for (let i = 0; i < rows; i++) {
    let x = -r() * 300
    while (x < 1024) {
      const w = 260 + r() * 360
      const l = 0.82 + r() * 0.3
      const base = [53 * l, 39 * l, 29 * l]
      g.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`
      g.fillRect(x, i * rh, w, rh)
      // grain
      for (let k = 0; k < 16; k++) {
        const y = i * rh + r() * rh
        g.strokeStyle = `rgba(${r() < 0.5 ? '20,12,8' : '90,66,48'},${0.08 + r() * 0.1})`
        g.lineWidth = 0.6 + r() * 1.4
        g.beginPath()
        g.moveTo(x, y)
        for (let s = 0; s <= 8; s++) g.lineTo(x + (w * s) / 8, y + Math.sin(s * 1.3 + k) * (1 + r() * 2))
        g.stroke()
      }
      g.fillStyle = 'rgba(8,5,3,0.55)'
      g.fillRect(x, i * rh, 2, rh)
      x += w
    }
    g.fillStyle = 'rgba(8,5,3,0.6)'
    g.fillRect(0, i * rh, 1024, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = maxAniso
  return t
}

export function tileTexture() {
  const [c, g] = canvas(256)
  g.fillStyle = '#6d6a64'
  g.fillRect(0, 0, 256, 256)
  const r = rng(5)
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const l = 96 + r() * 14
      g.fillStyle = `rgb(${l},${l - 2},${l - 6})`
      g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30)
    }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function radialTexture(stops = [[0, 1], [0.35, 0.55], [1, 0]]) {
  const [c, g] = canvas(128)
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (const [o, a] of stops) grad.addColorStop(o, `rgba(255,255,255,${a})`)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  return t
}

// A soft rounded-rect or circle outline used for the table "zones" Shire understands.
export function zoneTexture(round) {
  const S = 256
  const [c, g] = canvas(S)
  const pad = 26
  const rr = round ? (S - pad * 2) / 2 : 46
  const path = () => {
    g.beginPath()
    if (round) g.arc(S / 2, S / 2, rr, 0, Math.PI * 2)
    else g.roundRect(pad, pad, S - pad * 2, S - pad * 2, rr)
  }
  // outer glow
  g.save()
  g.shadowColor = 'rgba(255,255,255,0.9)'
  g.shadowBlur = 18
  g.lineWidth = 4
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  path()
  g.stroke()
  g.restore()
  // fill
  g.fillStyle = 'rgba(255,255,255,0.16)'
  path()
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255,255,255,1)'
  path()
  g.stroke()
  const t = new THREE.CanvasTexture(c)
  return t
}

export function ringTexture() {
  const S = 256
  const [c, g] = canvas(S)
  g.lineWidth = 5
  g.strokeStyle = 'rgba(255,255,255,1)'
  g.shadowColor = 'rgba(255,255,255,1)'
  g.shadowBlur = 16
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2 - 22, 0, Math.PI * 2)
  g.stroke()
  return new THREE.CanvasTexture(c)
}

