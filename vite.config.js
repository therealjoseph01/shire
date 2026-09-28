import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`        → production build in /dist, prerendered HTML for SEO (scripts/prerender.mjs)
// `npm run build:single` → one self-contained preview HTML in /preview (double-click to open; loads Shire's assets from its CDN)
export default defineConfig(({ mode, isSsrBuild }) => {
  const single = mode === 'single'
  return {
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    base: single ? './' : '/',
    build: single
      ? { outDir: 'preview', emptyOutDir: true, assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000, copyPublicDir: false }
      : isSsrBuild
        ? { outDir: 'dist-ssr', emptyOutDir: true }
        : {
            chunkSizeWarningLimit: 1200,
            rollupOptions: {
              output: {
                manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : id.includes('node_modules') ? 'vendor' : undefined),
              },
            },
          },
  }
})
