// Renders the page's HTML at build time so every line of copy is in the document for search engines and no-JS readers.
import fs from 'node:fs'
import path from 'node:path'
import { build } from 'vite'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
await build({ root, logLevel: 'warn', build: { ssr: 'src/entry-server.jsx', outDir: 'dist-ssr', emptyOutDir: true } })
const { render } = await import(path.join(root, 'dist-ssr/entry-server.js'))
const file = path.join(root, 'dist/index.html')
const html = fs.readFileSync(file, 'utf8').replace('<!--app-->', render())
fs.writeFileSync(file, html)
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
console.log('prerendered', (html.length / 1024).toFixed(0), 'KB of HTML')
