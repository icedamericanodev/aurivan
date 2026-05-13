# Mobile UX Test Plan — 375×667 viewport
> CISA exam prep app · Pre-launch checklist · ~30 min

**Setup:** Open DevTools → Toggle device toolbar → iPhone SE (375×667) → Disable CPU/network throttling → Enable touch simulation. Test in Chrome and Safari (iOS rendering differs).

Mark each item: ✓ pass · ✗ fail (note the issue) · — not applicable

---

## 1 — Navigation (4 min)

**Tabs / main nav**
- ☐ All tabs visible without horizontal scroll at 375px
- ☐ Active tab state is clearly distinguishable from inactive (not just colour — also weight or underline)
- ☐ Tab labels don't truncate (`text-overflow: ellipsis` hiding "Glossary" as "Glos…" is a real risk)
- ☐ Tab tap targets ≥ 44px height [WCAG 2.5.5]
- ☐ Switching tabs doesn't reset question state (mid-question → Glossary → back still shows same question)
- ☐ Bottom nav (if present) doesn't overlap page content — test with iOS Safari's address bar in its tall/short states

**Header / toolbar**
- ☐ Header height leaves ≥ 580px of usable content height (667 − 87px combined chrome)
- ☐ Question counter / timer in header doesn't wrap to a second line
- ☐ No `position: fixed` element obscures scrollable content on scroll

---

## 2 — Question rendering (6 min)

**Standard questions**
- ☐ Question stem wraps cleanly — no word breaks mid-word (check `overflow-wrap: break-word` or `word-break`)
- ☐ Option A–D buttons: minimum 44px height per option [critical]
- ☐ Options don't clip with `overflow: hidden` when text wraps to 3+ lines
- ☐ Selected state is visible on a 375px touch screen (not just a thin border change)
- ☐ Correct / incorrect feedback states readable — green/red must not rely on colour alone (add icon)
- ☐ Submit button reachable without scrolling OR clearly visible below options with obvious scroll affordance
- ☐ "Next question" button full-width — confirm it doesn't sit below the fold after tips reveal

**Analysis-tier questions (scenario context)**
- ☐ Scenario block renders before question stem — vertical order is context → question → options
- ☐ 140-word scenario (worst case) doesn't push the question stem completely off screen — user shouldn't need to scroll past a full screenful of prose to see the question
- ☐ Scenario text font-size ≥ 14px; line-height ≥ 1.6 for readability
- ☐ Scenario left-border accent (the sealed brief treatment) renders — test `border-left` isn't being collapsed by a `border-shorthand` override
- ☐ After scrolling through scenario + options, the submit button is still reachable via normal scroll (not blocked by a sticky element)

**Tips (post-answer)**
- ☐ Tips section appends below the options without layout shift pushing content off screen
- ☐ Sequential reveal: "tap to unlock" tap target ≥ 44px height
- ☐ Tip text (13px) meets contrast at ≥ 4.5:1 — `#9090aa` on `#1a1a28` passes (~6.3:1 ✓); `#505068` on `#0b0b14` FAILS at ~2.8:1 — don't use for readable tip body text

---

## 3 — Mock mode — timer and progress (3 min)

- ☐ Timer is always visible while answering (sticky or in header — not pushed off screen by long questions)
- ☐ Timer font readable at the header size — JetBrains Mono at `<12px` becomes hard to read
- ☐ Question counter (e.g. "Q 47 / 150") doesn't wrap at 375px
- ☐ Progress bar (if present) renders at full width — check it isn't `min-width: 300px` on a 375px screen
- ☐ "Pause" / "Resume" button tap target ≥ 44px
- ☐ Timer survives a tab switch and return (JS `setInterval` still running?)
- ☐ Screen lock / sleep: does the timer freeze? Open app after 2 min of sleep, confirm time elapsed correctly (use `Date.now()` delta, not tick counting)
- ☐ Mock exit / abandon confirmation modal appears and is usable (see Modals section)

---

## 4 — Results review screen (3 min)

- ☐ Score / percentage renders at correct size — `font-size: 4rem` becomes ~60px; confirm it doesn't overflow its container
- ☐ Domain breakdown bars scale to 375px width (check any `min-width` on bar containers)
- ☐ "Review answers" list is scrollable — 150 questions × ~48px = 7200px; confirm `overflow-y: auto` works
- ☐ Each review item shows correct/incorrect icon AND letter — colour-only is an accessibility failure
- ☐ Tapping a review item to re-read the question + explanation works
- ☐ "Retake" or "Back to practice" button reachable without excessive scroll
- ☐ Results page doesn't accidentally persist when navigating away and returning (check localStorage clearing logic)

---

## 5 — Topics and Glossary tabs (3 min)

**Topics**
- ☐ Long-form content reflows — no `pre` or `code` blocks forcing horizontal scroll
- ☐ Headings hierarchy (h2 → h3 → h4) preserved at 375px — nothing collapsing to same size
- ☐ Any tables: either scroll horizontally in a wrapper or reformatted for mobile (bare `<table>` at 375px will overflow)
- ☐ "Back to top" or section nav works if present

**Glossary**
- ☐ Alphabetical anchor nav (A–Z index) — tap targets ≥ 44px, or letters close enough together that tap is reliable
- ☐ Search input (if present): virtual keyboard opens without obscuring the input (see Keyboard section)
- ☐ Search results list scrollable and items tappable
- ☐ Term definitions wrap cleanly, no overflow

---

## 6 — Modals (4 min)

Test each modal: Flag, Feedback/Report, Bookmark.

- ☐ Modal height ≤ 80vh — modal content shouldn't force the user to scroll the modal AND the page
- ☐ Modal close button: ≥ 44×44px tap target — top-right `×` at 20px is a common failure [critical]
- ☐ Tapping backdrop (outside modal) closes it
- ☐ Body scroll is locked while modal is open (`overflow: hidden` on `body`) — test by trying to scroll the page behind the modal
- ☐ Modal content doesn't overflow horizontally at 375px
- ☐ Form fields inside modals (e.g. feedback textarea): confirm keyboard doesn't cover the field (test by tapping the field — it should scroll into view)
- ☐ Submit/confirm button inside modal is visible without scrolling the modal, OR the modal itself is scrollable
- ☐ After closing a modal, focus returns to the question area (not top of page)

---

## 7 — Keyboard / virtual keyboard (2 min)

Low priority for a mostly multiple-choice app, but test anywhere text input exists:

- ☐ Search inputs: when virtual keyboard opens (~270px keyboard height on iPhone SE), input + at least one result are still visible
- ☐ `viewport` meta tag: confirm it includes `width=device-width, initial-scale=1` — missing this causes 980px layout-width scaling on iOS
- ☐ `user-scalable=no` is NOT in the viewport meta tag — WCAG 1.4.4 prohibits preventing zoom
- ☐ No input has `font-size < 16px` — iOS Safari auto-zooms on focus if font-size < 16px (causes jarring viewport jump) [critical]
- ☐ After dismissing the keyboard, the viewport returns to its original scroll position (not snapped to top)

---

## 8 — Text legibility (3 min)

**Sizes**
- ☐ Body / option text ≥ 15px
- ☐ Scenario context text ≥ 14px
- ☐ Tip body text ≥ 13px (absolute floor — below this is inaccessible on a phone)
- ☐ Mono labels / question IDs: ≥ 11px and letter-spaced enough to be legible
- ☐ No text is set in `vw` units alone (e.g. `font-size: 3vw` = 11.25px at 375px)

**Contrast** (check against Aurivan palette)
- ☐ Primary text `#e8e8f2` on `#0b0b14`: ~16:1 ✓
- ☐ Secondary text `#9090aa` on `#0b0b14`: ~6.3:1 ✓
- ☐ Muted text `#505068` on `#0b0b14`: ~2.8:1 ✗ — use only for decorative non-readable elements (dividers, counters the user doesn't need to read)
- ☐ Accent `#8b6dff` on `#0b0b14`: ~5.4:1 ✓ (passes for normal text)
- ☐ Success `#4ade80` on `#1a1a28`: run through a contrast checker — estimated ~7:1 ✓
- ☐ Error `#f87171` on `#1a1a28`: estimated ~4.6:1 — borderline, verify with tool

**Line length**
- ☐ Scenario context at 375px: ~55–65 characters per line (ideal). If hitting > 75, consider slight padding increase. If < 45, text feels choppy.

---

## 9 — Tap target sizing — WCAG 2.5.5 (2 min)

Minimum: **44×44 CSS pixels** for any interactive element.

Use DevTools inspector on each element: check computed height in px.

- ☐ Answer option buttons (A–D): height ≥ 44px [critical — these are the primary interaction]
- ☐ Main nav tab items: height ≥ 44px
- ☐ Submit / Next button: full-width, height ≥ 44px ✓ (usually fine)
- ☐ Modal close button (`×`): frequently only 24–32px — wrap in a larger hit area
- ☐ Flag / bookmark / report icon buttons in question header: often 20–24px icons — add `padding` to expand hit area
- ☐ Glossary letter index items: letters are typically 20px wide — space them out or increase font-size
- ☐ "Skip tips" / "Skip question" text links: if these are `<a>` or `<span>` elements, their natural height is line-height (~18px) — wrap in a block with `padding: 13px 0`

---

## Quick-reference: pass/fail summary

After testing, tally:

| Category | Items | Pass | Fail |
|---|---|---|---|
| Navigation | 9 | | |
| Question rendering | 14 | | |
| Mock mode | 8 | | |
| Results review | 7 | | |
| Topics / Glossary | 9 | | |
| Modals | 8 | | |
| Keyboard | 5 | | |
| Text legibility | 12 | | |
| Tap targets | 8 | | |
| **Total** | **80** | | |

**Launch gate:** All `[critical]` items must pass. Recommended: < 5 non-critical failures.

---

## Known risks specific to a 9,000-line inline HTML/CSS/JS file

- **Inline styles may override responsive rules.** If something looks wrong, check for `style=""` attributes on the element before debugging CSS.
- **`position: fixed` elements at bottom** (e.g. submit button, progress bar) may overlap iOS Safari's home indicator — add `padding-bottom: env(safe-area-inset-bottom)`.
- **`vh` units on iOS Safari** — `100vh` is the full browser height including the address bar. Elements sized to `100vh` will be taller than the visible area. Use `100dvh` (dynamic viewport height) if supported, or `window.innerHeight` in JS.
