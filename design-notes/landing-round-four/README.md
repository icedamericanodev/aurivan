# Landing review, round four (unpublished)

Three revised directions built on the round two and three concepts, each with
the Grove Voices feedback row. Nothing in this folder is in the website build
(`scripts/build_site.sh` publishes an allowlist only).

| File | What it is |
|---|---|
| `index.html` | Picker with stills and a recording of each direction |
| `fieldwork.html`, `canopy.html`, `night.html` | The three working mockups |
| `landing.css`, `landing.js` | One shared stylesheet and script for all three |
| `img/` | Real Android screenshots from `marketing/kit/screenshots/phone/`, resized to 600 px WebP |
| `review/` | Hero stills and scroll-through recordings |
| `qa.cjs` | Review checks (dev only, needs Playwright) |

Preview from the repository root: `python3 -m http.server 8000`, then open
`http://localhost:8000/design-notes/landing-round-four/`.

## What changed from round three

- A scroll-through study session: five real screens cross-fade inside one sticky
  phone on wide screens. On phones, and with JavaScript off, each step shows its
  own screenshot. The page scrolls normally; nothing is hijacked.
- A feature grid made from close-ups of real screens.
- Hero motion: headline line reveal, panel and phone entrances. Section reveals
  use CSS scroll-driven animations where supported, with an observer fallback.
  Content is never hidden while waiting for a script.
- One stylesheet and one script replace the three stacked prototype layers.
- Night Study uses the app's real dark-mode screenshots.
- Feedback row fix: Resume now restarts the row while the button keeps focus.
  The row itself is a keyboard stop that pauses while focused.

## Still true

- Waitlist is a mockup. It validates in the browser and sends or saves nothing.
- Five quotes are fictional and labelled on every card. One is real tester
  feedback from Ken L., translated from Filipino and trimmed (the comparison
  with ISACA's own question product was left out). Confirm his permission to be
  quoted by name before any public use.
- Android first. Web and iOS are described as upcoming.
- No trackers, no dependencies, no remote fonts.
