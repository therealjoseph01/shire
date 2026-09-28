# One dinner service: storyboard

The whole page is one Friday night at one restaurant. Scroll position is the service clock. Nothing about the
restaurant is pre-rendered: a deterministic simulation (`src/sim`) plays the entire evening once at load, logging every party,
server, busser and host movement. Each frame then just looks the scroll position up in that log, so scrolling back
reverses exactly, and every number on screen ("seated 6 min", "Maria · 5 tables") is read from the room at that moment.

**Protagonist:** the restaurant. **Intelligence layer:** Shire, which appears in scene 5 and never before.
**Rule:** Shire sees *tables*, not people (see FACTS.md). Guests are never labelled. Workload belongs to sections, not to a tag following a person.

## Where Shire's layer first appears
Scenes 1–4 carry no software, only the room and a little editorial narration (italic serif, lowercase, hairlines).
Shire's layer (cream ticket tags, cool-blue table zones, Plus Jakarta Sans) first appears at the start of **scene 5**. Those two visual languages never mix,
which is how the visitor can tell "what anyone could notice" from "what Shire knows".

The simulation respects the same line: before 6:52 PM (scene 7) staff only notice needs after a delay and the host seats the nearest table;
from 6:52 PM, needs get routed within seconds and the host seats the lightest section. Scene 9 switches Shire off again (a counterfactual)
and scene 10 switches it back on. Every wait, pile-up and resolution you see comes out of that policy change, not an animation.

| # | Scene | Clock | Camera | What happens | Copy (✱ = verbatim Shire) |
|---|---|---|---|---|---|
| 0 | Cold open | 6:00 → 6:10 PM, autoplays once | low, slow push-in | Room fills, pendants warm up | none |
| 1 | Dinner service | 6:10 → 6:16 | low, eye-level-ish | Parties talking, servers moving | "Friday. Dinner service." / *Your restaurant is already telling you what's happening.* |
| 2 | The rush | 6:16 → 6:44 | slow lateral glide | Arrivals ramp. Unnoticed needs pile up physically: menus down, empty plates, a check that never came, a left table still full of plates, a queue at the host stand | Editorial captions pinned to the real tables, with live minutes |
| 3 | What the POS can't see | 6:44 → 6:46 | into the POS terminal, then pull back | POS event stream (orders, checks, payments), then the floor with everything the stream missed | *Your POS knows what gets entered into it.* → ✱ "Shire knows what's actually happening." |
| 4 | The cameras are already there | 6:47 | wide, cameras in frame | Four existing dome cameras light up one by one; soft coverage fields fall on the floor | "The cameras are already there." / "No new cameras, and no staff tapping screens…" (from ✱ "existing CCTV" + Shire's own demo description) |
| 5 | Shire wakes up | 6:47 → 6:49 | medium-high | Table zones light up, then state tags: T16 · Seated 4 min · Not greeted, and so on | "Then Shire sees it." / ✱ "…automatically update the live state of every table" |
| 6 | See the whole floor | 6:49 → 6:52 | rises to overhead | Every table carries a state tint (Shire Host colours) and a live legend: Open · Seated · Dirty · Blocked | ✱ "See what's happening on the floor." |
| 7 | Server load | 6:52 → 6:56 | overhead | Sections tint in server colours with live counts. A party of 4 arrives; Shire's waitlist card suggests the lightest section's table; the host walks them there; counts rebalance | ✱ "Stop guessing. Seat smarter." |
| 8 | One table, full journey | 6:56 → 7:54, time-lapse | close orbit on that table | The same party's whole lifecycle ticks down a rail; then pull out: 18 lifecycles at once | ✱ "…from the moment a guest sits down to the second they're ready to pay." |
| 9 | Without Shire | 7:54 → 8:16 | same, handheld drift | Layer switched off. Needs accumulate as neutral captions with rising timers; the host queue grows | "Without Shire." |
| 10 | With Shire | 8:16 → 8:29 | smooth again | Layer returns; ✱ Suggested → Assigned → Completed cards move as staff actually walk; the room resynchronises | "With Shire." / ✱ "Guests will never sit idle." / ✱ Denise A. quote |
| 11 | The restaurant becomes a system | 8:29 → 8:32 | very high | The eight real modules sit where they live in the room (POS at the terminal, kitchen display at the pass, reservations at the host stand…) with quiet data flow | ✱ "Everything your restaurant needs. Working as one." |
| 12 | Floor → operating system | 8:32 → 8:34 | exact top-down | The 3D floor flattens into Shire Host: the same tables become map tiles in Shire's own colours; a live tag flies into the alert list. Then the official CCTV and Host assets side by side: camera → state → screen | ✱ "Live table states · balanced sections · smarter seating" |
| 13 | Ask your restaurant | 8:34 → 8:35 | kitchen and pass in view, dimmed | ✱ Menu / Labor / Sales prompts from Shire Operations; the answer lights the part of the room it's about (pass, prep, host stand) | ✱ "Find opportunity hiding in every shift." / ✱ Joey F. quote |
| 14 | Time accelerates | Mon → Sun → Week 1 → Month | slow orbit | The evening replays at speed; every turn drops a tick into a growing strip | "Every shift becomes operating data." |
| 15 | Results | 8:36 → 8:46 | background dolly | ✱ 7 min faster turns (the lifecycle bar loses its waits), ✱ 14% more guests (100 → 114 dots), ✱ $40K+ average annual savings, plus the Besim T. quote | verified numbers only |
| 16 | The whole floor at once | 8:46 → 8:58 | highest overhead | Everything running, very few tags; then the layer fades out completely while the room keeps running smoothly | ✱ "Run every shift" + rotating word |
| 17 | Close | 8:58 → 10:28 (the last hour passes quickly) | back down to the scene-1 angle | Last parties leave, bussers reset, pendants dim, the layer lingers, then goes | "Your restaurant." → ✱ "Let's build a smarter restaurant." → Get a demo |
| — | After close | page flow | — | Pricing typeset as a house menu, the kinds of places Shire is built for, and the footer | ✱ pricing and plan copy |

## Technology per layer
- **Restaurant**: Three.js (vanilla, one renderer, no post passes). Procedural geometry and canvas textures, so there are no model downloads.
  Light pools are additive floor decals rather than real lights, and shadows are blob sprites. Instanced people, chairs and table props.
- **Simulation**: plain JS discrete-event model, run once at load (~5 ms), then queried per frame (binary search, no state).
- **Intelligence layer**: DOM tags (crisp type, accessible), positioned each frame from projected 3D anchors; floor zones as meshes.
- **Scene widgets** (POS stream, waitlist card, lifecycle rail, alerts, system map, Host UI, Operations, results): React components updated
  imperatively from a single rAF director. There are no React re-renders per frame.
- **Scroll**: native scroll + Lenis smoothing, with sticky scene sections for semantics. Scroll maps to a global story position,
  which drives the clock, camera and layer.

## Desktop vs mobile
Desktop frames the room wide and uses a left or right text column. Portrait doesn't shrink the floor. Its camera travels *through* the room
(host stand → table → pass → table), holds closer, shows only the flagged tags, and moves copy to the bottom third.
Pixel ratio is capped at 1.5 on desktop and 1.25 on mobile, and adaptive quality drops it further if frames run long.

## Accessibility and performance
- `prefers-reduced-motion`: no autoplay, no camera flights (hard cuts to each scene's key pose), no idle motion, no rotating word, no Lenis.
- No WebGL: a static photo stands in for the room and every scene's text stays readable.
- All copy is real DOM (and prerendered into index.html at build time for SEO). JSON-LD covers the organization, product and plans.
- JS: React + Three core + Lenis, about 250 KB gzipped. Fonts are self-hosted. Official GIFs load lazily when you're near scene 12.
