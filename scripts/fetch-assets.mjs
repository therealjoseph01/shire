// Copies Shire's official assets from its CDN into /public/shire so production can self-host them.
// Then build with VITE_SELF_HOST=1 (see src/ui/assets.js).
// For production, consider converting the two GIFs to MP4/WebM. They're the heaviest thing on the page.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = path.join(root, 'public/shire')
fs.mkdirSync(out, { recursive: true })

const files = {
  'logo-mark.png': 'https://framerusercontent.com/images/2mQFWY0zLs0tIFFu4dWopVNeiI.png',
  'cctv-table-zones.gif': 'https://framerusercontent.com/images/n9nzffySWhKrwpeAfRqoYr09w.gif',
  'host-floor.gif': 'https://framerusercontent.com/images/SoK4g0jTqQsok9lDFPTm92K2XAQ.gif',
  'interior.png': 'https://framerusercontent.com/images/WVhP02mVPhddMjD7s3YH1qRN2hw.png',
  'og.jpg': 'https://framerusercontent.com/assets/hGORGDrGpph9FCtuqfHHM8fldI.jpg',
}

for (const [name, url] of Object.entries(files)) {
  const res = await fetch(url)
  if (!res.ok) {
    console.error('failed', name, res.status)
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(path.join(out, name), buf)
  console.log(name.padEnd(24), (buf.length / 1024).toFixed(0), 'KB')
}
