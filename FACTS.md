# Shire: verified fact sheet

Everything the experience says or shows is checked against this file. Sources:
shireintelligence.com (home, /benefits, /contact-us, /privacy-policy, /terms-of-use, Framer search index), inspected 28 Sep 2026,
plus Shire's own YouTube demo ("Shire Demo", @ShireIntelligence, 19 Jun 2026) for product UI and one line of copy.
If a statement is not in this file, it does not go on the page.

## What Shire is
- Meta: "Shire is an AI restaurant operations platform combining POS, CCTV-powered floor intelligence, reservations, scheduling, kitchen workflows, online ordering, and analytics."
- H1: "Run every shift" + rotating word: **Efficiently. / Effortlessly. / Smarter. / Faster.**
- Hero sub: "Shire manages your floor through existing CCTV from the moment a guest sits down to the second they're ready to pay."
- H2: "See what's happening on the floor." / "Shire uses live CCTV to smarter staff coordination, and real-time performance insights." (sic, grammar is broken on the live site, so we don't quote it word for word)
- H2: "Shire knows what's actually happening."
- Footer tagline: "Your personal restaurant operations system"
- YouTube description (Shire's own words): "Shire turns the cameras your restaurant already owns into a live operating layer, so you see every table, every guest, and every bottleneck the moment it happens. No new hardware. No tablets. No staff tapping screens to keep anything updated."

## Who buys it
- Restaurant owners/operators (pricing toggle "Owner"), multi-location groups (Enterprise), and resellers.
- Reseller panel (verbatim, from the live pricing toggle): "For technology and regional partners" / "Bring Shire to your market." /
  "Access preferred Datacap and PayBright rates, protected regional product opportunities, and flexible reseller economics with room to build margin."
  Chips: Preferred processing rates · Regional product exclusivity · Flexible reseller markup · Sales and onboarding support. CTA: "Connect with our team".
- Built for: Full Service, Quick Service, Bar & Lounge, Pizzeria, Bakery, Drive-Thru, Fast Casual, Food Truck, Fine Dining, Hotel Restaurant.

## How the cameras are used (represent exactly this)
- "Shire uses existing cameras to automatically update the live state of every table, balance covers across servers,
  prevent double-seating, and help hosts keep sections fair, guests moving, and staff happy."
- Official CCTV asset: a 2×2 grid labelled CAMERA 1–4, with a **polygon zone per table** and a label per zone, like
  `T2: clean (70%)`, `T5: occupied (99%)`, `T5: dirty (57%)`.
- CV table states seen in the official asset: **clean / occupied / dirty**, each with a confidence score.
- Shire detects **server visits** ("Seated 4m ago · no visit detected"), **menus closed**, **meal finished**, **plates cleared**.
- Nothing on the site claims facial recognition, guest identification or tracking individuals.
  → We show **table zones only**. No boxes on people, no IDs, no face graphics. Server workload is shown **per section**, never as a tag following a person.

## Table states (the language of the product)
Host UI (floor map legend + table panel): **Open · Seated · Dirty · Blocked**. Table panel buttons: Open / Seated / Dirty / Block.
Map colours: Open = soft green, Seated = blue, Dirty = tan/brown, Blocked = grey. Small server-coloured badge on each table.

Live Team Coordination (tabs: **Suggested · Assigned · Completed**), verbatim:
| Tag | Title | Detail | Routed to |
|---|---|---|---|
| ATTENTION | Table 09 has not been greeted | Seated 4m ago · no visit detected | SERVER |
| READY | Table 04 ready for bussing | Plates cleared · aisle open | BUSSER |
| CHECK | Table 07 waiting on check | Meal finished · 6m waiting | SERVER |
| ORDER | Table 12 ready to order | Menus closed · 40s | SERVER |
| SEATING | Table 18 ready for next party | Reset complete · section balanced | HOST |

"Shire detects when a guest needs attention and routes the right task to the right host, server, or busser before service slows down."
Demo analytics also use "Open now", "Check-ready" ("Camera sees cleared plates and payment posture"), "Dirty 6m".

Lifecycle we're allowed to show (camera-observed table states plus POS events, which Shire combines; the camera sees *tables* (occupied, clean, dirty), while party size comes from the waitlist):
Open → party arrives → Seated → not greeted (no visit detected) → greeted (visit detected) → ready to order (menus closed)
→ ordered (POS) → dining → waiting on check (meal finished) → paid (POS) → left → ready for bussing (plates cleared) → ready for next party (reset complete).

## Host system and server load
- Server strip: server name + section colour dot + table chips; a **NEXT PARTY** pill marks whose turn it is.
- Waitlist card: `Suggested T5 · Fits 4 · Maria next`, guest surname, party size, wait, quote (~14M), notes ("Prefers booth").
- Header: `SHIRE Host`, `Search guests, tables…`, `Synced · CCTV · Mode: Sections`. Rail: Floor · Stats · Queue · RSV.
  Left panel: Waitlist / Reservations tabs, Open · Dirty · Seated counts, `+ Add Walk-in`. Footer: `All Rooms` and `46 Open · 5 Seated · 3 Dirty · 0 Blocked`.
- Server names in Shire's own demo UI: Maria, Fernando, Lola, Kiersten (also Joe, Tyler, Alex, Sarah, Makayla).
- Demo analytics card "Waiter Load" is subtitled **"Operational view, not rankings"**.
- Section: "Stop guessing. Seat smarter." · "help hosts keep sections fair, guests moving, and staff happy."

## AI operations assistant (verbatim examples from the site)
Header "Shire Operations", pill "4 sources live", tabs **Menu · Labor · Sales**, with the subtitles "Menu performance" / "Labor planning" / "Tomorrow's forecast".
After thinking: "3 steps completed". Answer sub-headings: "Recommended change" (Menu), "Shift preparation" (Labor, Sales).
"Shire combines visual activity, POS, reservation, and staffing data to explain what is slowing the restaurant down—and what to change."
- **Menu**: "Which menu items are slowing down service, and what should I change?"
  Steps: Comparing item-level prep times across recent dinner rushes / Reviewing kitchen movement, ticket times, and handoff delays / Checking margin and repeat-order performance before recommending a change.
  Answer: "Dinner bottleneck found. Pork shoulder bowls are adding the most avoidable time during the dinner rush."
  Slowest window 6:30–8:00 PM · Average delay +6 minutes per ticket · Primary constraint: Protein prep before the line.
  What to change: Prep the pork sous-vide before service and move garnish beside expo. Expected impact: Shorter handoffs without changing the recipe or adding labor.
- **Labor**: "How should I staff Friday's rush?" Friday rush coverage: Demand will peak from 6:30–8:15 PM, when your current plan is short one prep cook.
  Peak demand 6:30–8:15 PM · Strongest floor lead Angelica · Coverage gap Prep after 7:00 PM.
  Staffing alert: Your baseline schedule is safe until dinner demand accelerates. Recommendation: Move Angelica to 6:00 PM and add one prep cook from 5:30–8:30 PM.
- **Sales**: "What are my projected sales for tomorrow, and how should I prepare?"
  Steps: Analyzing recent weekday sales and week-over-week trends / Comparing reservations, local events, and tomorrow's weather / Calculating the safest labor-to-sales coverage for each hour.
  Answer: Shire projects $8,040 in sales, about 15% above your weekday average. Peak window 5:00–8:00 PM.
  Driver: Warm weather and a nearby concert are raising reservations and walk-in demand. Recommendation: Add one server for the dinner spike from 5:00–8:00 PM.
These are Shire's own illustrative examples, so we label them "Example from Shire Operations".

## The eight connected tools (verbatim)
"Everything your restaurant needs. Working as one." / "Eight connected tools for every shift—from the first reservation to the final report."
1. Point of sale: Built for scale with 1,000+ features.
2. CCTV coordination: Alerts every role where attention is needed.
3. Kitchen display: Every order and station, in sync.
4. Marketing: Loyalty, gift cards, SEO, and more.
5. AI operations: Live insights. Smarter decisions.
6. Staff & scheduling: Build better shifts in less time.
7. AI reservations: Answers calls and books tables, 24/7.
8. Online ordering: Own every digital order, end to end.
Plus: Offline mode ("If internet or network service is disrupted, Shire's offline mode keeps orders, kitchen tickets, receipts, and supported card payments moving until the connection returns."), 24/7 support, Quick setup.

## Verified results (the "Customers grow with Shire." section)
- **$40K+** average annual savings after switching to Shire
- **14%** more guests served per month
- **7 min** faster table turns
- **Live floor view** for every employee on shift, so everyone knows exactly where they are needed
- **Live CCTV** analytics to track employee efficiency, menu pricing, and scheduling
- Savings calculator (/benefits) compares processing rates: Toast 3.34%, Square 2.85%, Other POS 3.47%.
- Not used: "~13% turn time" and "$0.10 margin lift per cover". Those appear only in an older site shown in the YouTube demo, not the live site.

## Testimonials (verbatim)
- Besim T., Mathews Restaurant: "Shire saved us $65,000 on processing alone. We're serving more customers than ever while spending less on staff."
- Denise A., Mimosas Southern Kitchen and Grill: "The biggest thing is we catch stuff earlier. Dirty tables and waiting guests don't sit there unnoticed like they used to."
- Joey F., Vine Bistro: "Shire caught little menu patterns we would've missed. A couple cents per cover sounds tiny until you realize how many covers you do in a month."

## Pricing (Owner)
| Plan | Price | Line | Includes |
|---|---|---|---|
| Shire Intelligence ("Works with your current POS") | Starting at $150 / month | Add Shire's live floor intelligence without replacing the systems you already use. | CCTV-powered host optimization · Live server and busser alerts · Automated staff scheduling · AI operations assistant · Staff efficiency analytics. CTA **Get started** |
| Shire POS ("Complete operating system") | Free install | Bring payments, service, staffing, and restaurant operations into one connected system. | Everything in Shire Intelligence · Point of sale and reservations · Lower transaction fees · Menu pricing recommendations · Marketing, loyalty, and reviews. CTA **Try Shire free** |
| Shire Enterprise ("For multi-location groups") | Custom | Tailored infrastructure, analytics, and support for growing restaurant organizations. | Everything in Shire POS · Custom data migration · Advanced onboarding · AI marketing engine · Kitchen optimization software. CTA **Contact sales** |

## Integrations
- The only integration claim is "Works with your current POS" (Shire Intelligence). No POS brands are named as integrations.
- Datacap and PayBright come up only as reseller processing rates. Subprocessors (privacy policy): Sakari (SMS), Supabase (auth/db). None of these are marketed.
- → We name no integrations beyond "works with your current POS" and "existing CCTV".

## Logos / proof
Marquee: NVIDIA Inception ("Premier AI startup program"), Y Combinator ("Premier startup accelerator"), Carolina Seafood & Steak,
Bell Tower (venture capital), Mimosas, NexHacks (hackathon), Matthew's Pancake House, AllClear ("Trusted process systems partner").
→ Not every entry is a customer, so we never label the list "customers". We mention backers (Y Combinator, NVIDIA Inception) in text only.

## Conversion
Primary: **Get a demo** (nav) → /contact-us. Also "Try Shire", "Get started", "Try Shire free", "Contact sales" → /contact-us; "Calculate savings" → /benefits.
Closing line on the live site: "Ready to grow with Shire?" Contact page H1: "Let's build a smarter restaurant."
Contact: Alex Tabaku · alex@shireintelligence.com · 843-582-8486 · 174 Beach Dr SC · LinkedIn /company/shireintelligence · X @ShireIntel.

## Brand
Plus Jakarta Sans (site), serif accents in the product (guest names, "SHIRE Host"). Off-white #F7F6F3, near-black, dusty blue accent (~#5F7FAE),
navy product cards. Logo mark: a four-seat table inside camera-viewfinder corners (official PNG on Shire's CDN).

## Official assets referenced (Shire CDN)
- Logo mark: framerusercontent.com/images/2mQFWY0zLs0tIFFu4dWopVNeiI.png (344×360)
- CCTV table-zone grid GIF: framerusercontent.com/images/n9nzffySWhKrwpeAfRqoYr09w.gif (820×474)
- Host floor map GIF: framerusercontent.com/images/SoK4g0jTqQsok9lDFPTm92K2XAQ.gif (800×600)
- Interior photo (empty dining room): framerusercontent.com/images/WVhP02mVPhddMjD7s3YH1qRN2hw.png
- OG image: framerusercontent.com/assets/hGORGDrGpph9FCtuqfHHM8fldI.jpg
