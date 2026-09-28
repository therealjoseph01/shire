function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}
// Grain for the film look (used as a CSS overlay, not in WebGL)
export function grainDataURL() {
  const [c, g] = canvas(160)
  const img = g.createImageData(160, 160)
  const r = rng(3)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (r() * 255) | 0
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 22
  }
  g.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}
