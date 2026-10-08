> **Superseded on 2026-10-08.** The web app moved to the mobile app's
> **Grove** design system and the **True North** logo, so web and mobile look
> like one product. The source of truth is now
> [`docs/mobile/DESIGN_SYSTEM.md`](../docs/mobile/DESIGN_SYSTEM.md) (tokens in
> `mobile/src/theme/tokens.ts`). This file is kept as history only; its
> navy/blue variant locks no longer apply.

# MASTER HANDOFF — Aurivan v9.0
> Single source of truth for Claude Code.
> This file supersedes HANDOFF.md.
> Last updated: May 2026

---

## ✅ LOCKED VARIANT SELECTIONS
> These are final. Do not ask — implement exactly these.

| Feature | Chosen variant | Reference file |
|---|---|---|
| Scenario context layout | **A — Sealed Brief** (left-border block) | `Scenario Context Treatments.html` → Treatment A |
| Principles Library layout | **C — Two-Pane Master-Detail** | `Principles Library Designs.html` → Tab C |
| Tips reveal UX | **C — Sequential** (Trap → Mindset → Exam-day, strict 1→2→3) | `Tips Reveal UX Designs.html` → Treatment C |
| First-time user experience | **A — Instant question** (dismissible banner only) | `FTUE Designs.html` → Approach A |
| Confidence button timing | **After answer selection, before submit** | `FTUE Designs.html` — all approaches |
| Visual identity | **Navy/Blue** (logo confirmed May 2026) | `assets/logo.svg` / `assets/logo-light.svg` |
| Mobile scenario block | **Collapsible** (2-line truncate + expand) | `MASTER_HANDOFF.md` → Decision 10 |

---

## HOW TO USE THIS HANDOFF

1. **Read this file top to bottom first.**
2. **Read reference files** in this order — they contain copy-paste CSS/JS:
   - `colors_and_type.css` — all tokens
   - `assets/logo.svg` — logo (dark bg) · `assets/logo-light.svg` (light bg)
   - `Scenario Context Treatments.html` → Treatment A
   - `Principles Library Designs.html` → PRINCIPLES array (all 15 definitions)
   - `Tips Reveal UX Designs.html` → Treatment C
   - `FTUE Designs.html` → Approach A
   - `relaunch-copy-v9.md` — relaunch copy
3. **Implement phases in order** (Phase 1 → 6 below).
4. **Do NOT invent designs.** Every component, colour, and copy string is specified. Check the reference file before asking.

---

## THE SITUATION IN ONE PARAGRAPH

There is an existing single-page CISA exam-prep web app (~9,000 lines of inline HTML/CSS/JS). It is being relaunched as **v9.0** after a major rebuild. The rebuild includes: a brand-new original 1,004-question bank (authored from ISACA/NIST/ISO primary sources, not recycled exam banks), a new brand identity (Aurivan), and a set of UX improvements designed in this project. Your job is to integrate everything in this handoff into the existing app. You are not building from scratch — you are uplifting an existing working app.

---

## WHAT THIS PROJECT CONTAINS

This design system project (the one you are reading from) contains:

| File/Folder | What it is |
|---|---|
| `colors_and_type.css` | Full design token file — all colours, type, spacing, shadows, radii, motion tokens |
| `assets/logo.svg` | Aurivan logo — three-arc continuous-cycle mark + lowercase wordmark |
| `preview/` | 12 design reference cards (colours, type, spacing, components) |
| `ui_kits/web_app/index.html` | Interactive web app prototype — Dashboard, Practice, Flashcards, Progress |
| `ui_kits/mobile_app/index.html` | Mobile prototype — iOS frame, 5 screens |
| `ui_kits/marketing/index.html` | Marketing site prototype |
| `slides/index.html` | Slide deck template (7 layouts) |
| `Scenario Context Treatments.html` | 5 interactive treatments for analysis-tier question layout |
| `Principles Library Designs.html` | 3 layout options for the Principles Library feature |
| `Tips Reveal UX Designs.html` | 4 treatments for post-answer tip disclosure |
| `FTUE Designs.html` | 3 first-time user experience approaches |
| `Empty States and Identity.html` | 7 empty/error states + 3 visual identity directions |
| `relaunch-copy-v9.md` | All 4 relaunch copy pieces (email, What's New, hero, social) |
| `mobile-ux-test-plan.md` | 80-item mobile QA checklist for 375×667 viewport |
| `audit-mobile.js` | DevTools console script — auto-detects contrast/tap/zoom issues |
| `fix-mobile.js` | Node.js script — auto-applies 3 mechanical CSS fixes to the source file |

---

## BRAND IDENTITY

**Name:** Aurivan
**Logo files:** `assets/logo.svg` (dark bg) · `assets/logo-light.svg` (light bg)
**Brand pillars:** Navigate with clarity · Master with confidence · Adapt to change · Lead the future
**Positioning:** "A continuous learning and readiness platform for IT Audit, Cyber Risk, and AI Governance professionals."
**Tagline:** "Master Modern Risk."

**Decision: Evolve to Navy/Blue — final brand logo confirmed**
The Aurivan logo (compass + A mark, uploaded May 2026) uses a navy/blue palette, not purple. Update `--acc` from `#8b6dff` → `#3B82F6` and `--acc2` from `#ff7eb3` → `#14B8A6` across the app. Deep dark backgrounds stay unchanged — only the accent colours shift.

### Fonts — Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

| Role | Font | Weights |
|---|---|---|
| Headings, display | Playfair Display | 700, 600, 400, italic |
| Body, UI, buttons | Plus Jakarta Sans | 400, 500, 600, 700 |
| Labels, IDs, code, keys | JetBrains Mono | 400, 500, 600 |

### Core colour tokens
```css
--bg:     #0b0b14;   /* page canvas */
--sf:     #14141f;   /* default surface / cards */
--sf2:    #1a1a28;   /* raised / hover surface */
--sf3:    #20202e;   /* overlay / pressed */
--acc:    #3B82F6;   /* primary blue — interactive elements (was #8b6dff purple) */
--acc2:   #14B8A6;   /* teal — streak, social, celebrations (was #ff7eb3 pink)   */
/* Brand nav palette (from logo): */
--brand-navy:   #0B1E3D;  /* deep navy */
--brand-blue:   #1D4ED8;  /* compass blue */
--brand-light:  #60A5FA;  /* light blue */
--t1:     #e8e8f2;   /* primary text */
--t2:     #9090aa;   /* secondary text / labels */
--t3:     #505068;   /* muted — decorative only, never readable body text */
--ok:     #4ade80;   /* success */
--warn:   #fbbf24;   /* warning */
--err:    #f87171;   /* error */
--bdr:    rgba(255,255,255,.07);  /* default border */
--bdr2:   rgba(255,255,255,.13); /* hover border */
--acc-bdr:rgba(139,109,255,.35); /* accent selection border */
```

**IMPORTANT:** `#505068` (--t3) must NEVER be used on readable text. It fails WCAG AA contrast (~2.8:1). Use only for dividers, decorative dots, and non-readable chrome. Use `#9090aa` (--t2) for any text the user needs to read.

Full token reference: `colors_and_type.css`

---

## THE QUESTION BANK

- **1,004 original questions** authored directly from ISACA, NIST, and ISO public standards
- **No exam-bank citations** in the authorship chain — each question traces to a primary source document
- **Two tiers:**
  - Recall tier — standard 4-option MCQ
  - Analysis tier (~401 questions) — includes `scenario_context` field (80–160 words) before the question stem
- **Per-question data structure:**
```js
{
  id: 'Q-0042',
  domain: 'D4',           // D1=IS Audit, D2=IT Governance, D3=IS Acquisition, D4=IS Operations, D5=Asset Protection
  tier: 'analysis',       // 'recall' | 'analysis'
  scenario_context: '…', // present on analysis tier only
  stem: '…',
  options: [
    { key: 'A', text: '…', correct: true },
    { key: 'B', text: '…', correct: false },
    { key: 'C', text: '…', correct: false },
    { key: 'D', text: '…', correct: false },
  ],
  explanation: '…',       // shown after answer
  principles: ['CONTAIN-FIRST', 'FORENSIC-IMAGING-BEFORE-WIPE'], // tags to Principles Library
  tips: [
    { type: 'trap',  text: '…' }, // amber #fbbf24 — what the wrong options exploit
    { type: 'mind',  text: '…' }, // purple #8b6dff — which principle(s) apply
    { type: 'exam',  text: '…' }, // green #4ade80 — exam-day pattern/shortcut
  ],
}
```

---

## ALL DESIGN DECISIONS — IMPLEMENTATION READY

### Decision 1 — Scenario Context Rendering (analysis-tier questions)

**Render `scenario_context` BEFORE the question stem, in a visually distinct block.**

```html
<!-- Only present when question.tier === 'analysis' -->
<div class="scenario-block">
  <div class="sc-label">Scenario</div>
  <p class="sc-text">{{ question.scenario_context }}</p>
</div>
<p class="q-stem">{{ question.stem }}</p>
```

```css
.scenario-block {
  background: #1a1a28;
  border: 1px solid rgba(255,255,255,.07);
  border-left: 3px solid #8b6dff;
  border-radius: 0 8px 8px 0;
  padding: 14px 18px;
  margin-bottom: 22px;
}
.sc-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #8b6dff;
  margin-bottom: 8px;
}
.sc-text {
  font-size: 14px;
  line-height: 1.72;
  color: #9090aa; /* --t2, NOT --t3 */
}
```

Reference: `Scenario Context Treatments.html` → Treatment A (Sealed Brief)

---

### Decision 2 — Principles Library

**Build as a new tab alongside (not replacing) Topics.**
- Topics = domain study notes
- Principles Library = 15 auditor-mindset mental models
- These are different content types — keep them separate

**UI layout: Two-Pane Master-Detail**
- Left panel 300px: searchable list of all 15 principles, colour-coded by domain
- Right panel flex-1: detail view for selected principle
- Progress bar at top of list
- Prev/Next navigation in detail panel

Reference: `Principles Library Designs.html` → Tab C (Two-Pane)

**Data structure per principle:**
```js
{
  id: 'CONTAIN-FIRST',      // ALL-CAPS-WITH-HYPHENS — this IS the name
  tagline: 'Stop the spread before you investigate the cause.',
  domain: 'D4',
  definition: '2–3 sentences from primary standards.',
  applies: ['trigger condition 1', 'trigger condition 2', '…'], // 3–5 items
  distinctFrom: 'Explains adjacent principles by ID in prose.',
  qCount: 12,               // questions tagged to this principle
}
```

**All 15 principle IDs in display order:**
```
CONTAIN-FIRST
REVOCATION-FIRST
METHODOLOGY-RIGOR-FIRST
BACKUP-IMMUTABILITY-FIRST
CHAIN-OF-CUSTODY-FIRST
SCOPE-BEFORE-FIELDWORK
RISK-BEFORE-CONTROLS
LEAST-PRIVILEGE-ALWAYS
SEGREGATION-OF-DUTIES-FIRST
GOVERNANCE-OVER-MANAGEMENT
IMPACT-BEFORE-LIKELIHOOD
AUDIT-INDEPENDENCE-FIRST
BUSINESS-CONTINUITY-OVER-RECOVERY
EVIDENCE-BEFORE-CONCLUSION
CONTINUOUS-MONITORING-OVER-PERIODIC
```

Full definitions + applies + distinctFrom content: `Principles Library Designs.html` → `PRINCIPLES` array in the script.

---

### Decision 3 — Tips Reveal UX

**Sequential reveal — user unlocks one tip at a time in strict order.**

Order is ALWAYS: Trap → Mindset → Exam-day (1→2→3, strict, cannot skip ahead).
Reason: Trap is highest-value tip (especially when wrong); Mindset builds on understanding the trap; Exam-day is the mnemonic reward at the end.

**State rules:**
- User got it **wrong**: tip 1 (Trap) auto-expands on reveal
- User got it **correct**: all 3 tips start collapsed (quick-win path respected)
- "Skip tips" link always visible — user can advance without reading any

**Tip type → colour mapping:**
```js
trap: { color: '#fbbf24', bg: 'rgba(251,191,36,.07)'  } // amber
mind: { color: '#8b6dff', bg: 'rgba(139,109,255,.08)' } // purple
exam: { color: '#4ade80', bg: 'rgba(74,222,128,.07)'  } // green
```

**Principle ID linking (Decision 3a — resolved):**
YES — in the Mindset tip, every principle ID (e.g. CONTAIN-FIRST) should be a clickable link that opens the Principles Library entry for that principle. This creates the learning loop: answer wrong → read Trap → understand Mindset principle → click to read full principle definition → come back.

```html
<!-- In tip[1].text, principle IDs are linked -->
<a href="#principles/CONTAIN-FIRST" class="principle-link">CONTAIN-FIRST</a>
```

Reference: `Tips Reveal UX Designs.html` → Treatment C (Sequential)

---

### Decision 4 — First-Time User Experience

**Instant question: load Q1 on page load. One-time dismissible welcome banner for new users only.**

```js
// On page load — check if new or returning user
const isNewUser = !localStorage.getItem('aurivan_session');

if (isNewUser) {
  showWelcomeBanner(); // see HTML below
}
// Render Q1 immediately regardless
renderQuestion(getNextQuestion());
```

**Welcome banner HTML** (new users only):
```html
<div id="welcome-banner">
  <div class="wb-dot"></div>
  <span>Welcome to Aurivan — <strong>no account needed.</strong>
    Progress saves automatically in your browser.</span>
  <button onclick="dismissBanner()">×</button>
</div>
```

```js
function dismissBanner() {
  document.getElementById('welcome-banner').remove();
  localStorage.setItem('aurivan_welcome_seen', '1');
}
// Skip banner for returning users:
if (localStorage.getItem('aurivan_welcome_seen')) {
  document.getElementById('welcome-banner')?.remove();
}
```

No tour. No onboarding modal. The only explained element is the confidence buttons (see Decision 5).

Reference: `FTUE Designs.html` → Approach A

---

### Decision 5 — Confidence Button Timing

**Show Sure / Educated Guess / Guessing AFTER answer selection, BEFORE submit.**

```
User sees Q → selects option → [confidence buttons appear] → selects confidence → submit enabled
```

Submit button states:
- No answer selected → `disabled`
- Answer selected, no confidence → `disabled`, label: `"Select confidence to submit"`
- Answer + confidence → `enabled`, label: `"Submit answer"`

**One-time confidence tooltip** (first question only, stored in localStorage):
```html
<div id="conf-tip">
  Rate your confidence — it affects how often this question resurfaces in your review queue.
  <button onclick="dismissConfTip()">×</button>
</div>
```
```js
if (localStorage.getItem('aurivan_conf_tip_seen')) {
  document.getElementById('conf-tip')?.remove();
}
function dismissConfTip() {
  document.getElementById('conf-tip').remove();
  localStorage.setItem('aurivan_conf_tip_seen', '1');
}
```

Reference: `FTUE Designs.html` → any approach (all use same confidence logic)

---

### Decision 6 — Visual Identity Direction

**Keep and refine the current palette. Do not change it for v9.0.**

What to do:
- Apply Playfair Display to all headings (replacing whatever heading font is currently in the app)
- Apply Plus Jakarta Sans to all body/UI text (replacing current body font)
- Apply JetBrains Mono to all labels, IDs, chips, keyboard keys, mono data
- Confirm `#505068` is removed from all readable text (it fails WCAG AA)
- Confine `#ff7eb3` (pink) strictly to: streak counters, daily goal celebrations, social/community features

What NOT to do: Do not change the purple accent, dark backgrounds, or overall palette. The identity is working.

---

### Decision 7 — Empty & Error States

Apply these copy + icon + action patterns to each state. Full visual reference in `Empty States and Identity.html`.

| State | Icon | Heading | Body copy | Action |
|---|---|---|---|---|
| (a) Loading | animated spinner `#8b6dff` | Fetching questions… | The question bank is loading. This usually takes less than a second. | none |
| (b) Network error | wifi-off `#f87171` | Couldn't load the question bank. | This usually means the file was opened directly in a browser rather than served over HTTP. | show code chips: `python3 -m http.server` / `npx serve .` |
| (c) Filter → 0 results | filter-x `#fbbf24` | No questions match. | The current domain filter returned zero results. Try another domain or clear the filter to see all 1,004 questions. | Clear filter (ghost) |
| (d) Mock mode, no answers yet | clock `#8b6dff` | Ready when you are. | Your 4-hour clock starts with your first answer. 150 questions, all five domains, weighted to CISA exam distribution. | Answer question 1 → (primary) |
| (e) Review tab, no sessions | bar-chart `#9090aa` | No practice data yet. | Complete a practice session or mock exam to see your performance breakdown, domain scores, and weak areas here. | Start a practice session (primary) |
| (f) Bookmarks empty | bookmark `#9090aa` | No bookmarked questions. | While answering, tap the bookmark icon to save questions you want to revisit. They appear here. | Go to practice (ghost) |
| (g) History empty | calendar `#9090aa` | No sessions recorded yet. | Your session history and streak data appear here after your first practice session. | Start practicing (primary) |

Icons: Lucide icon set, stroke 1.75px, 32px for empty states.

---

## MOBILE FIXES — APPLY BEFORE LAUNCH

Three can be done automatically. Run from terminal:
```bash
node fix-mobile.js path/to/your-app.html
```
This fixes: `#505068` contrast, `100vh` iOS Safari, sub-16px input font-size. Creates timestamped backup first.

Four manual fixes still needed:
1. `env(safe-area-inset-bottom)` on all `position: fixed` bottom elements
2. Viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1">` — remove any `user-scalable=no`
3. Tap targets: run `audit-mobile.js` in DevTools console to find elements < 44px
4. Revert any `#505068` on purely decorative borders/dividers if the script over-replaced

Full 80-item QA checklist: `mobile-ux-test-plan.md`

---

## RELAUNCH COPY — v9.0

All four pieces written and ready to paste. Full text in `relaunch-copy-v9.md`.

| Piece | Location | Status |
|---|---|---|
| Notify-me email | Subject: "It's back — and we rebuilt everything." | Ready |
| In-app What's New (v9.0) | 5 bullet points | Ready |
| Landing page hero | Headline: "Built from the source." | Ready |
| Twitter + LinkedIn post | Two versions (long/short) | Ready |

**Note:** Copy uses "CISA Mindset" as the app name — update to "Aurivan" or whichever final name is confirmed before sending.

---

## IMPLEMENTATION PRIORITY ORDER

Work through this in sequence. Each phase is independently deployable.

### Phase 1 — Foundation (do first, everything depends on this)
- [ ] Add Google Fonts link to `<head>` (Playfair Display + Plus Jakarta Sans + JetBrains Mono)
- [ ] Add CSS variables from `colors_and_type.css` to the app's existing `<style>` block
- [ ] Run `fix-mobile.js` against the source file (auto-fixes contrast + 100vh + input zoom)
- [ ] Replace all heading font-family with Playfair Display
- [ ] Replace all body/UI font-family with Plus Jakarta Sans
- [ ] Replace all label/chip/code font-family with JetBrains Mono
- [ ] Fix `#505068` on any readable text → `#9090aa`
- [ ] Update `<title>` to "Aurivan"
- [ ] Add logo SVG from `assets/logo.svg` to the header

### Phase 2 — Question rendering (highest user-facing impact)
- [ ] Add `scenario-block` rendering for analysis-tier questions (Decision 1)
- [ ] Move question `class="q-text"` to render BELOW scenario block
- [ ] Implement confidence buttons timing (Decision 5) — after option selected, before submit
- [ ] Add one-time confidence tooltip (localStorage gate)
- [ ] Implement sequential tips reveal (Decision 3) — Trap → Mindset → Exam-day
- [ ] Link principle IDs in Mindset tips to Principles Library anchor (Decision 3a)

### Phase 3 — FTUE + empty states
- [ ] Add FTUE welcome banner with localStorage gate (Decision 4)
- [ ] Replace all empty state placeholders with new copy + icon + action (Decision 7)
- [ ] Implement network error state (b) with HTTP server code chips
- [ ] Implement loading state (a) with spinner

### Phase 4 — New features
- [ ] Build Principles Library tab (Two-Pane layout, Decision 2)
- [ ] Populate all 15 principles with content from `Principles Library Designs.html` → PRINCIPLES array
- [ ] Add tab to navigation: Practice · Mock Exam · Topics · Principles · Glossary

### Phase 5 — Mobile QA
- [ ] Run `audit-mobile.js` in DevTools at 375×667 — fix all failures
- [ ] Apply 4 manual mobile fixes (safe-area, viewport meta, tap targets, decorative colours)
- [ ] Walk through `mobile-ux-test-plan.md` — all [critical] items must pass

### Phase 6 — Launch
- [ ] Swap in `relaunch-copy-v9.md` content: hero, What's New, email, social
- [ ] Final pass: search for any remaining "CISAPath" or "CISAPATH" strings

---

## Decision 8 — Exam Date + Countdown (PM Critical Fix #1)

**The highest-leverage single change in the product.**

On first visit, show an inline exam-date prompt — not a modal, a dismissible card:

```js
function setExamDate() {
  const d = document.getElementById('exam-date-input').value;
  if (!d) return;
  localStorage.setItem('aurivan_exam_date', d);
  document.getElementById('exam-date-prompt')?.remove();
  updateCountdown();
}
function getDaysToExam() {
  const d = localStorage.getItem('aurivan_exam_date');
  if (!d) return null;
  return Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));
}
function updateCountdown() {
  const days = getDaysToExam();
  if (days === null) return;
  // Replace static topbar title with countdown
  const el = document.querySelector('.topbar-title');
  if (el) el.textContent = `${days} days to exam`;
}
updateCountdown(); // call on every page load
```

**Where countdown surfaces:**
- **Topbar (web):** replace static page title → `"28 days to exam · 72% ready"`
- **Dashboard subheading:** make dynamic (not hardcoded "28 days")
- **Primary CTA:** if ≤14 days → add urgency: `"Focus: Asset Protection — 14 days left"`
- **Mobile home:** small mono label below daily goal → `"28 DAYS · 72% READY"`

---

## Decision 9 — Session Boundary: Intent → Practice → Debrief (PM Critical Fix #2)

**Sessions need a start, a goal, and an end screen.**

### Session start
When Practice is opened, show an inline card (not a modal) at top of practice area:

```html
<div id="session-start">
  <div>How many questions?</div>
  <button onclick="startSession(10)">10</button>
  <button onclick="startSession(20)">20 ← default</button>
  <button onclick="startSession(30)">30</button>
  <button onclick="startSession(null)">Open-ended</button>
  <select id="session-domain">
    <option value="all">All domains</option>
    <option value="D5">Asset Protection ← weakest</option>
    <!-- other domains -->
  </select>
</div>
```

```js
let sessionGoal = 20, sessionAnswered = 0, sessionCorrect = 0;
function startSession(n) {
  sessionGoal = n;
  sessionAnswered = 0;
  sessionCorrect = 0;
  document.getElementById('session-start')?.remove();
  loadNextQuestion();
}
// After each answer, check if session is complete:
function onAnswerSubmitted(wasCorrect) {
  sessionAnswered++;
  if (wasCorrect) sessionCorrect++;
  if (sessionGoal && sessionAnswered >= sessionGoal) showDebrief();
}
```

### Session debrief
Replaces the question card inline when session goal is reached:

```html
<div class="session-debrief">
  <div class="sd-score">{{ sessionCorrect }}/{{ sessionGoal }}</div>
  <div class="sd-pct">{{ pct }}% correct this session</div>
  <!-- compare to domain rolling average if available -->
  <button onclick="startSession(20)">Practice again →</button>
  <button onclick="goToDashboard()">Back to dashboard</button>
</div>
```

Persist last session to localStorage for the "Resume" CTA on dashboard:
```js
localStorage.setItem('aurivan_last_session', JSON.stringify({
  date: new Date().toISOString(),
  domain: selectedDomain,
  answered: sessionAnswered,
  correct: sessionCorrect,
}));
```

---

## Decision 10 — Mobile Collapsible Scenario (PM Critical Fix #3)

**On mobile only: truncate scenario to 2 lines with "Read scenario ▾" expander.**
**On desktop: always show full scenario (no change needed).**

```css
@media (max-width: 600px) {
  .sc-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sc-text.expanded {
    display: block;
    -webkit-line-clamp: unset;
  }
  .sc-expand-btn {
    display: flex;
    margin-top: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: .1em;
    color: #8b6dff;
    background: none;
    border: none;
    cursor: pointer;
    padding: 17px 0; /* min 44px tap target */
  }
  .sc-expand-btn.open { display: none; }
}
@media (min-width: 601px) {
  .sc-expand-btn { display: none; }
}
```

```js
function expandScenario(qId) {
  document.getElementById('sc-text-' + qId).classList.add('expanded');
  document.getElementById('sc-btn-' + qId).classList.add('open');
}
// Reset on each new question load:
function resetScenario(qId) {
  document.getElementById('sc-text-' + qId)?.classList.remove('expanded');
  document.getElementById('sc-btn-' + qId)?.classList.remove('open');
}
```

**Rules:**
- Resets to collapsed on every new question load
- Once expanded, stays expanded for that question
- Analysis-tier questions only — no toggle needed for recall-tier
- Expand button tap target: minimum 44px height

---

## QUESTIONS RESOLVED

All previously open questions are now answered above. Nothing is blocking Code from starting.

| Question | Answer |
|---|---|
| Tip 2 auto-link principle IDs? | Yes — link PRINCIPLE-ID text to Principles Library anchor |
| Sequential tip unlock: strict or any order? | Strict 1→2→3 |
| Principles Library: replace or alongside Topics? | Alongside — they are different content types |
| Relaunch copy written? | Yes — `relaunch-copy-v9.md` |
| Visual identity change for v9.0? | No — keep current palette, refine execution |

---

## KEY FILES TO READ FIRST (in this order)

1. `MASTER_HANDOFF.md` — this file
2. `colors_and_type.css` — all design tokens
3. `ui_kits/web_app/index.html` — reference for component patterns, interactions
4. `Scenario Context Treatments.html` → Treatment A — copy the CSS
5. `Principles Library Designs.html` → PRINCIPLES array — copy the content data
6. `Tips Reveal UX Designs.html` → Treatment C — copy the interaction logic
7. `FTUE Designs.html` → Approach A — copy the banner logic
8. `relaunch-copy-v9.md` — paste the copy

---

## THINGS CODE DOES NOT NEED TO BUILD FROM SCRATCH

Everything is already designed and prototyped. Code's job is integration, not invention:

- ✓ All colours/tokens defined in `colors_and_type.css`
- ✓ All component patterns prototyped in `ui_kits/web_app/index.html`
- ✓ Scenario block CSS ready to copy from this document
- ✓ Principles Library content (all 15 principles, full definitions) in `Principles Library Designs.html`
- ✓ Tips interaction logic prototyped in `Tips Reveal UX Designs.html`
- ✓ FTUE logic prototyped in `FTUE Designs.html`
- ✓ Empty state copy written above
- ✓ Relaunch copy in `relaunch-copy-v9.md`
- ✓ Mobile fixes scripted in `fix-mobile.js` and `audit-mobile.js`

---

## NATIVE MOBILE APP (`mobile/`) — LOCKED DECISIONS

Added with Experience v1. The sections above describe the web app; these lock
the native app's information architecture.

| Decision | Selection |
|---|---|
| Tab bar (5 tabs, in order) | **Journey · Learn · Practice · Play · You** |
| Mock exams | Live inside **Practice** (no separate tab) |
| Settings | Pushed screen opened from **You** (not a tab) |
| Accent rule | One accent-filled element per screen; everything else outlined |
| Touch targets | 48×48 minimum |
| Motion | 180–320ms ease-out, always honours Reduce Motion |
| Visual identity (mobile) | **Forest — see `docs/mobile/DESIGN_SYSTEM.md`.** Replaces the navy/blue identity for `mobile/` only; the web app keeps navy. One theme (light + dark), one font (Plus Jakarta Sans 400/600/700), six text styles |
| Selected state | **Ink** (the text colour), never green. Green = primary buttons, bars, rings; ✓ on `correctBg` = correct answer |
| Style guard | No `fontSize` / `lineHeight` / `fontFamily` / hex colours outside `components/ui.tsx` and `theme/`. ESLint enforces it in `npm run check` and CI |

These earlier mobile rules still hold under Forest: tips are revealed one at a
time, confidence is asked after selecting (before submitting), answer options
are at least 56px tall, primary actions sit in the bottom thumb-zone bar, and
correct/wrong are shown by shape (✓ / ✗) as well as colour.

**Documented exception — Calibrated Sprint.** The "answer first, then rate
confidence" rule used in practice sessions is reversed in this one game: the
learner stakes 1–3 points *before* answering. Committing the stake first is
the whole point of the game (it measures calibration), so this is intentional.
