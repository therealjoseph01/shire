# Shire: one dinner service

A landing page for Shire where the restaurant is the interface. Scroll runs one Friday dinner service. The room fills,
the rush builds, the existing cameras come into view, and then Shire's layer starts to understand the floor: table states,
section load, one table's whole evening, the counterfactual without Shire, the software itself, the Operations assistant,
the results, and the last table of the night.

- `STORYBOARD.md` covers the experience scene by scene: clock, camera, what happens and which copy is Shire's own.
- `FACTS.md` is the verified fact sheet from the live site. Every claim on the page is checked against it.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/ with prerendered HTML (SEO, no-JS readers)
npm run preview      # serve dist/
npm run build:single # one self-contained file in preview/index.html (loads Shire's images from its CDN)
npm run sim          # print what the simulated room looks like at the story's key moments
npm run assets       # copy Shire's official images into public/shire, then build with VITE_SELF_HOST=1
```

Node 20.19+.

## How it works

**The restaurant is simulated, not animated.** `src/sim/simulate.js` runs a small discrete-event model of the evening once at load
(about 50 ms): parties arrive, wait, get seated, and get greeted, served, checked and bussed by four servers, a busser and a host who
walk real aisles (`paths.js`). Before scene 7, staff only notice needs after a delay and the host seats the nearest free table.
Once Shire starts routing, needs are noticed within seconds and the host seats the section with room. Scene 9 turns that off again.
Every wait, pile-up and recovery you see comes out of that one policy switch.

A handful of parties are scripted (`SCRIPTED`) so the story's beats are guaranteed: a dirty table and an ignored check during the rush,
and the party of four in scene 7 who has a choice between the nearest table and the lighter section.

**Scroll is the clock.** `src/story/story.js` maps scroll position to scene, clock time and camera, and `layer.js` maps it to how much of
Shire's layer shows. Everything is a pure function of position, so scrolling backwards plays the evening backwards.
`runtime.js` is the single `requestAnimationFrame` loop. React renders the structure once, then widgets update the DOM directly.

**Two voices.** The room and the narrator use Instrument Serif with hairline captions pinned to real tables ("Seated 6 minutes ago. No one's been by.").
Shire uses Plus Jakarta Sans and cream ticket tags. Shire's layer first appears in scene 5 and never earlier. It labels **tables, never people**.
Server load belongs to sections, not to a tag following a person. There is no face or identity imagery anywhere.

**Stack.** React 19, Three.js (vanilla, lazy-loaded after first paint), Lenis for wheel smoothing, self-hosted fonts. All geometry and textures
are procedural (no model downloads). There are about 70 draw calls. Pixel ratio is capped at 1.5, or 1.25 on phones, and drops automatically if frames run long.
JS is about 250 KB gzipped, with Three.js as its own chunk that loads after the text is on screen.

## Accessibility, SEO, fallbacks

- `prefers-reduced-motion`: no cold open, no Lenis, no camera flights (each scene cuts to its key pose), no idle motion, no rotating word.
- No WebGL: a still of the room stands in, and the copy lays out as a normal readable page.
- All copy is real DOM in reading order and is prerendered into `dist/index.html`. The build includes meta, OG and JSON-LD (organization and plans).
- A "Skip the dinner service" link jumps straight to pricing.

## Assets

The page uses Shire's own assets from its CDN (`src/ui/assets.js`): the logo mark, the CCTV table-zone GIF and the Host floor GIF.
For production, run `npm run assets` and build with `VITE_SELF_HOST=1`. It's also worth converting both GIFs to MP4/WebM, since they're the heaviest items and
load only near scene 12.

## Where to tune

- Scene lengths, clock ranges, camera keys: `src/story/story.js` (`K(u, target, yaw, pitch, dist, fov)`, plus `sx` to shift the room away from copy)
- Layer intensities per scene: `src/story/layer.js`
- The evening itself: `SCRIPTED`, `SIM.windows` and the arrival rate in `src/sim/simulate.js`. Check the result with `npm run sim`.
- Copy: `src/scenes/*.jsx`. Anything new has to be checked against `FACTS.md`.
