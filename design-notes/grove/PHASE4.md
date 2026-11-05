# Grove Phase 4: Practice and Learn (spec)

Status: the build spec for Phase 4 on both builds, 5 Nov 2026. Website: `index.html` on `feature/grove-ui` (3474296). Phone: `mobile/` on `grove-phone-p1` (5b612e5). Sources: `GROVE_HANDOFF.md` §5 to §10, `TYPE_SCALE.md` (wins on every size), `DECISIONS.md` 1 to 16, the kit images `screens/02-phone-learn.png`, `03-phone-practice.png`, `04-phone-you.png`, `05-web-today.png` and their `reference/*.html`, the web and phone audits of 5 Nov (screenshots in the session scratchpad, `grove/p4/audit-web/` and `grove/p4/audit-phone/`), and two expert panels (sections 3 and 4).

Scope: the Practice hub, the question screen, the answer screen, set results, mock setup, mock results and Saved; the Learn hub, Study notes list and note page, Glossary, Principles, About the exam and Final review week; and the phone You tab rebuilt to the 04 board (owner, 5 Nov).

Owner rules that hold on every line below: presentation only; keep every piece of content and every feature (anything to remove goes to Sky first); web and phone consistent; both themes; WCAG AA; 44px web and 48pt phone targets; text grows with zoom and Dynamic Type; `TYPE_SCALE.md` roles only; no "Fig.", "Plate", "Field guide", "Field record" or "Herbarium" in learner text; no em or en dashes in any text, comment or commit; never "pass", "guarantee", "official", "you're ready", "evolve" or "runner-up" in learner text; never the total question count; never touch `data-l` or the letter mapping; never rename or remove a saved key (`cisa_*`, `aurivan_*`, `aurivan.*.v1`, `cisaMindsetExport`). The tab bar keeps a word under every tab (DECISIONS 4), not the kit's single active label.

---

## 1. Sky's question: "am I missing something, or is it built in the next phases?"

You are not missing anything. The phone Learn and Practice tabs still show the older layout because Phase 4 (Practice and Learn) has not been built yet on either branch. Phases 1 to 3 and the type pass are done; the newest commits on both branches are type fixes. This spec is Phase 4.

Three things will not appear by restyling alone, because nothing is behind them yet. They need your yes or no (section 2):

1. **The phone has no Glossary screen.** The kit's Glossary tile has nothing to open. The key-terms data exists on the phone (`mobile/src/content/terms.ts`); the screen does not.
2. **The website has no lessons.** Lessons are phone only (`docs/content/LESSONS_SCHEMA.md`), so the kit's "Up next" lesson card and Lessons card have nothing to show on kaisip.com. The web Learn tab also has no hub page: it opens Study notes.
3. **The phone You tab was built to the C2 spec** (DECISIONS 12), not the 04 board. Rebuilding it to 04 is in this phase (section 7.14).

A few kit items (Drills, Question bank, the Mindset tip on the phone) exist on one build only. Bringing them to the other build is a feature, not a restyle, and is listed for you in section 2.

---

## 2. Decisions for Sky (one line each, with the recommendation)

The experts have weighed in on each. Build proceeds on the recommendation unless Sky says otherwise; items marked **wait** are not built until Sky answers.

| # | Question | Recommendation | Until answered |
|---|---|---|---|
| O1 | Answer screen: show all three tips open after a miss, reversing the mobile 1.43 fold? | Yes (3 of 4 experts; section 4). | Build the fallback in 4.6. |
| O2 | Phone Glossary screen, built from the existing terms pack? | Yes: search, A to Z rows, each meaning and "Read the note". No flashcards this round. A "learned" mark needs one new saved field beside the old ones (`aurivan.glossary.v1`), never a rename. | **Wait.** The Glossary tile is hidden; never a tile that opens nothing. |
| O3 | Website Learn hub: a new page at `#learn` in the kit's order, without lesson parts (7.1 web)? | Yes. It is a navigation change, so it is yours. | Learn keeps opening Study notes; the inside pages are restyled anyway. |
| O4 | Website notes: open each note as its own reading page with a back link, like the phone? | Yes (7.2 web). | Keep the in-list note, restyled (fallback in 7.2). |
| O5 | Drills on the website? | Later, as its own feature after device sync. | The web jump bar has two segments, Questions and Mock exams (7.8 web). |
| O6 | Question bank on the website? | Later, with O5. | Not shown on the web; the phone keeps its row. |
| O7 | Mindset tips on the phone (the web's rotating list, added to the phone content pack)? | Yes: the owner's 03 board asks for the strip; the list is existing web content. | **Wait** for the content pack step; the strip is built and hidden when there are no tips. |
| O8 | Phone "Weak spots drill" across several areas (the web's `startWeakSpotsDrill` rule)? | Yes, same rule as the web: the owner's 03 board asks for the row. | **Wait**; the row is hidden. |
| O9 | The scaled score note says "passing mark" (kit wording; owner word list bans "pass"). | "ISACA reports scaled scores from 200 to 800. The score needed is 450." | Build that wording; the en dash goes either way. |
| O10 | Factual "pass" and "official" in About the exam and in glossary definitions ("You pass with 450 or more", "The official result follows"). | Content reviewers to propose wording; not changed in Phase 4. | Unchanged. |
| O11 | Phone Welcome line "A field guide to your CISA® exam study." (outside Phase 4, breaks DECISIONS 8). | "Your CISA® exam study, one small step at a time." on phone and web Welcome. | Unchanged in Phase 4; fixed in the release sweep. |
| O12 | The forest hero glyph tile repeats on Learn and Practice (same corner, same size). | Keep the kit as drawn (Sky asked for "exactly"); revisit after screenshots. | Kit as drawn. |
| O13 | Clay for pace attention in a mock ("About 4 min behind", the low clock): handoff says clay is for the streak, below-70 buds and the 80 marker only; phone DESIGN_SYSTEM §3 allows it. | Follow the handoff: pace attention uses `--text2` words with the clock glyph. | Handoff rule. |
| O14 | Study notes filters (All, To review, Read) and Expand all on the phone? | Later; the phone's note pages already show read state. | Phone unchanged. |

Owner-direction items already decided by Sky on 5 Nov and therefore built: the phone Learn and Practice tabs match 02 and 03, and the phone You tab matches 04 (section 7).

---

## 3. Expert panel: the kit's Learn layout

Sky asked the experts to challenge the kit's Learn layout. Four experts (premium web designer, mobile UX reviewer, product designer for a first-time candidate, behavioural scientist) voted **4 to 0: build the kit with changes**. The changes below are the ones a majority agreed on; ties are marked with how they were broken.

| Change | Votes | Built as |
|---|---|---|
| Kit order and look, at TYPE_SCALE sizes (display 36, row and tile titles `label` 16, sublines and counts `meta` 14, "Lessons" `title` 22, footnote `meta` 14, kicker 11 uppercase) | 4 of 4 | Yes |
| Hero: one forest card, Start lesson inside it as the only control; card not pressable; glyph decorative | 4 of 4 | Yes |
| Keep both reason lines ("picked where you can gain the most", "lesson 2 of 13"), the All caught up state with Go to Practice, `?domain=N` | 4 of 4 | Yes |
| Kicker "Up next · {area short name}" (one expert preferred "Next lesson") | 3 of 4 | "Up next" |
| Tiles in a fixed order (Study notes, Glossary, Principles, The {course} exam); hide a tile the course has no content for | 4 of 4 | Yes |
| Tiles become one column of full-width rows from text scale 1.3 (one expert said 1.15) | 3 of 4 | 1.3 |
| An odd last tile spans the full width | 3 of 4 | Yes |
| The lesson trail stays, inside the Lessons card, as disclosure rows (no new per-area page) | 4 of 4 | Yes |
| Which areas start open | 2 to 2 (Up next area open / all closed) | **All closed**, except the area a `?domain=N` link asks for. Tie broken by Sky's "exactly" (the kit shows all closed) and because the hero already gives the next lesson. |
| Area mark: the existing `DomainRing` drawn in the area colour (outline, arc, filled tick), not a plain dot | 3 of 4 | Yes |
| Keep the 3pt progress bar under a started area | 2 for, 1 against, 1 silent | Yes (keeps a current feature) |
| Area number before the name ("1  IS Audit"), as on Practice By domain and the web's D tabs | 3 of 4 | Yes |
| DI short names ("Info Protection", never "Information Protection") | 2 of 4, plus DECISIONS 13 Q3 | Yes |
| Lessons header meta "0 of 66 · in exam order · each ends with a check" | 2 explicit, 2 compatible | Yes; stacks under "Lessons" from text scale 1.2 |
| Next pill: always the same area as the hero; mint with ink text in both themes; the word is always there; wraps under the name when tight | 4 of 4 | Yes |
| Rows and the guided button at least 48pt, guided button edge at least 3:1 | 4 of 4 | Yes |
| Keep "Guided pairs each lesson with practice" under the guided button (and as its hint) | 4 of 4 | Yes |
| Search keeps its inline results (5, "See all results", the empty state, the spoken count) | 4 of 4 | Yes |
| A visible "Look it up" label over the search | 1 of 4 | No; the field's spoken label is "Search the study notes" |
| Glossary terms first in search results | 1 of 4 | No (later, with O2) |
| Final review week moves above the tiles near the exam | 2 of 4 (14 days / 7 days) | No; stays where the kit puts it |
| Website: no fake lesson parts; a "Read next" note hero, search, four tiles, Final review week, then a "Notes by domain" card | 4 of 4 on "no fake lessons"; 3 of 4 on the Read next hero; 2 of 4 on the notes card | Yes, behind O3 |
| Light theme specified and checked before building | 4 of 4 | Section 7.1 |
| Disclosure motion 200ms height and opacity, chevron turns; static under Reduce Motion | 4 of 4 | Yes |

Recorded in `DECISIONS.md` 15.

---

## 4. The answer screen (expert panel, 5 Nov 2026)

There is no kit image for the answer screen; this section is its design. Four experts (behavioural scientist, product manager, UX reviewer, first-time candidate) chose between A (restyle only), B (one calm screen) and C (stepped reveal).

### 4.1 Votes

- **Option B, 4 of 4.** A keeps today's changing order and five visual styles; C hides the feedback behind taps that an anxious learner skips.
- **All three tips open after a miss: 3 of 4** (behavioural scientist, UX reviewer, first-time candidate). The product manager voted "B-lite": keep the 1.43 fold so no owner decision reopens.
- **Only a long Why folds after a miss: 3 of 4** (the first-time candidate wanted no fold at all after a miss).
- **Tips open after a right answer: 3 of 4** (the first-time candidate wanted them folded after a right answer).
- **No tinted answer cards (state colour on the badge and words only): 3 of 4.**
- **Tips in the main column at every width (no margin card from 1240px): 3 of 4.**
- **Report a problem visible in the source row on both builds, and still in More: 3 of 4.**
- **Sticky Next question at every width: 4 of 4.** Focus to the verdict after 400ms, one label: 4 of 4. Hyphenation off: 4 of 4.
- **Tips before or after the Why: 2 to 2.** Tie broken by the rule for splits ("keeps every tip reachable with the least change"): tips first. That is today's order after a miss on both builds and the 1.43 order, and with the Why folded the tips stay highest.
- **"Time's up" colour: 1 for `--text2`, 2 for the miss tone.** Built in the miss tone (it is graded as a miss); never clay.
- **Heading for the tips: "How to think about it", 3 of 4** ("Three moves" breaks when a question has four tips).

Decision: **Option B, tips always open, one order in every state.** It reverses the mobile 1.43 fold, so it goes to Sky as O1. Until Sky answers, build the fallback in 4.6. Recorded in `DECISIONS.md` 16.

### 4.2 Order (right, miss and Time's up; web and phone; 320 to 1440)

Every letter shown is a display letter (`mapLettersInText`, the shuffle). Grading, the pick-aware coach line and the "closest wrong choice" notes compare original letters. `data-l`, `S.currentShuffle`, `originalToDisplay` and `displayToOriginal` are not touched.

0. **Unchanged:** the question recap (web "Show question"; phone header recap "Not quite · Best answer D"), Save and More in the header.
1. **Verdict.** No card, no tint. The leaf mark (correct tone with a tick, miss tone with a cross) and the word "Correct", "Not quite" or "Time's up" in `hero` (28/34), in its state colour. Under it the coach line in `aside` (TYPE_SCALE row 6: Fraunces 400 italic 16/22, `--text2`) with the review line after it ("You reached the final two: B against D. It comes back tomorrow."). The coach lines stay word for word (`verdictCoachLine` on the web, `pickCoach` on the phone), the slip coach wins as today. "Time's up" moves from clay to the miss tone.
2. **Answer card.** One Grove card (`--surface`, `--r-card` 24, 1px `--border` edge, padding 18 phone / 22 web), rows split by 1px dividers inset 16, **no tinted fills** (`--wrong-light` and `--correct-light` leave this card).
   - Miss: a "Your answer" row (miss-tone filled letter badge, caption "Your answer" in `--wrong`, option text `body` at Figtree 500, R8), then "Why not B" as a `caption` in `--text2` over the note in `small` `--text` (one stop, never a heading), a divider, then a "Best answer" row (correct-tone badge, caption "Best answer" in `--correct`, option text Figtree 600).
   - Right: one row, caption "Your answer · the best".
   - Time's up: the Best answer row only.
   - The other options stay out of view and remain one tap away in More, "Show all options", and in review.
3. **Key idea.** `caption` "Key idea" in `--accent-text` over the key concept in `quote` (Fraunces italic 18/26), with the 3px `--accent` left rule (the coach is speaking). Not a card.
4. **How to think about it.** `headline` heading (17/24, Figtree 600, never Fraunces, R4), then one card with one row per tip in this fixed order: Eliminate two, Final two, Exam cue. Each row is its `caption` label (from `tipParts`, words only, one colour `--accent-text`) over the tip in `small` `--text`, with 1px inset dividers. A small accent leaf marks each row; the vine is one stem down the card's left edge, drawn once in reading order (static under Reduce Motion). Colour never tells the tips apart; the label words do. A fourth tip, or an older "Mindset" tip with its principle link (`.principle-link`), adds a row; an unlabelled tip shows "Tip 1". The pick chip stays: "Your pick, B" on Final two when the pick was the other of the final two, on Eliminate two when the pick is one of the two to rule out. **Open in every state.**
5. **Why D.** `headline` heading, the explanation in `body`.
   - After a right answer: always in full.
   - After a miss or Time's up, when the text is over `WHY_FOLD_CHARS` (150, both builds): two lines, then a "Read more" button (44px web, 48pt phone; accessible name "Read more of the explanation", `aria-expanded`, `aria-controls` pointing at the paragraph only), which reads "Show less" when open. Focus stays on the button. No height animation.
   - The fold holds this paragraph and nothing else. Screen readers always get the full text (clamp with CSS `line-clamp` on the web and `numberOfLines` only on the visible copy on the phone, with the full text as the accessible label).
6. **Go deeper.** The existing rows in one card (36px icon badges, `label` over `meta`): Read the note, Take the lesson (phone), Read the principle, with the existing rules (never in a mock, never in the first set, never the principle a set started from). Then "Your note".
7. **Source row.** A hairline, "Original · Reviewed Oct 2026" and the main source in `meta` `--text2`, with a "Report a problem" text link at the right (`meta`, `--accent-text`, 44px / 48pt hit area) on **both** builds. It also stays in More. The phone keeps its code line.
8. **Next question.** One solid `--btn` button (`button` 17/22) in a sticky footer at every width, web and phone. On the web from 1240px it sticks to the bottom of the main column. The scroll content gets bottom padding of the footer height plus 24. Keys N and Enter stay.

**Web from 1240px:** one reading column (680px at most) holds 1 to 5 and 7. The rail holds only Go deeper and "Your note on this question", each a Grove card. `vrMovesMode`, the rail's "Three moves for this question" card (`.vm-plate`, `#srhMoves`) and the `.vr-skip-moves` link go. Acceptance: at 1280 by 900, after a miss with the longest explanation in the bank, Next question is in view without scrolling, in both themes.

**Exam-day rehearsal and mocks:** unchanged (no coach line, no tips; mocks show no answer screen). **First set:** the ordinary answer screen without Your note.

### 4.3 Screen reader (same on both builds)

No live announcement on Check answer. After 400ms focus moves to the verdict heading, whose single label is "Not quite. Best answer D. {coach line} {review line}", "Correct. {coach line}" or "Time's up. Best answer D. Time ran out on this one." The web drops "The question recap is above." to match the phone. Then, in the order seen:

1. "Your answer, B, not the best: {text}"
2. "Why not B: {note}" (one stop)
3. "Best answer, D: {text}"
4. "Key idea: {text}"
5. heading "How to think about it", then a list of 3: "Eliminate two: ...", "Final two, your pick B: ...", "Exam cue: ..."
6. heading "Why D", then the whole explanation
7. "Read more of the explanation, collapsed" (when folded)
8. Go deeper rows, Your note, "Original, reviewed Oct 2026, {source}", "Report a problem with this question", "Next question"

One Why heading per screen. Neither "Why not B" nor "Key idea" is a heading.

### 4.4 Motion

The verdict leaf scales in (phone keeps its spring and the notification haptic). The card and blocks fade in reading order, opacity only, 200ms, 30ms apart. The tips' stem draws once. Reduce Motion: everything appears drawn; the phone haptic stays.

### 4.5 Must not be lost

The verdict, coach line, slip coach and review line; the pick and its Why not note; the best answer; Key idea; all tips in order with their labels, the pick chip and principle links; the full explanation; Go deeper, lesson and principle rows; Your note (rail and More); Show all options; the source and reviewed date; Report a problem; Save; Next question; Time's up handling; exam-mode behaviour; the header recap; haptics. Trap Spotter, the slip coach and mindset growth keep reading the same tip data.

### 4.6 Fallback while O1 is open (keeps the 1.43 fold)

The same order and look. After a miss, Read more opens the long Why and the Eliminate two and Final two rows of the same tips card; Exam cue stays open. When the coach line names the final two, the Final two row stays outside the fold; when it names the two to rule out, Eliminate two stays outside. From 1240px nothing moves to the margin. The button's name lists what it opens ("Read more: the full explanation, Eliminate two and Final two"), as `data-what` does today.

### 4.7 Measures (on the device only, never sent)

Same wrong original letter picked again on a retry (should fall); share of misses that are final-two picks (`pickCoachKind` "final"), in 4-week bins; right on return for missed questions; "Sure" but wrong; median time on the answer screen after a miss (20 to 90 seconds; under 8 means skimming); how often Read more is opened. Compare in QA seeds; add no saved keys.

### 4.8 Do not build

A stepped reveal; a timer on the answer screen; guilt or streak copy in the coach line; a mood prompt before Next. A confidence-aware coach line ("You were sure; this one is worth a second look") is a later feature for Sky.

---

## 5. One selected look (chips, options, segmented controls, list rows)

**Selected is ink, never green** (DECISIONS 11, `--focus-ring` comment at `index.html:216`). One look on both builds: the control keeps its shape and fill family, and a **2px ink outline** (`--text` / `c.ink`) plus a **mark** shows the choice. Green means progress or correct only; a domain colour never means selected.

| State | Look | Web | Phone |
|---|---|---|---|
| Rest | `--surface` (raised) fill on the page, transparent on a card; 1.5px `--control` edge (3.65:1 light, 3.13:1 dark on surface); text `--text`, `chip` 15/20 or `label` 16/22 | base rule below | `c.raised`, `c.control` |
| Selected | Same fill; 2px `--text` edge drawn inside the box (no layout shift); the mark: a 14px tick before a chip's label, the filled ink letter badge on an option, a filled ink dot in a radio row, the ink thumb on a segment; text stays `--text`, weight 600 | `[aria-pressed="true"]`, `[aria-checked="true"]`, `[aria-selected="true"]`, `.selected`, `.picked` | `accessibilityState` `selected` or `checked` |
| Hover (web, pointer only) | Unselected: `--surface2` fill, edge `--text2`. Selected: no change. Never a transform. | `@media (hover:hover)` | none |
| Focus | 2px `--focus-ring` outline, 2px offset, outside the selected edge, so focus and selection never share one line. On a forest panel `--focus-ring` is `--on-forest` (as today). | `:focus-visible` | the system focus ring (Android keyboard, web build) |
| Pressed | `--surface2` fill for 120ms; phone press scale 0.98 with the soft tint (`usePressScale`) | `:active` | `usePressScale` |
| Disabled | Text `--muted`, edge `--border`, no hover; a selected and disabled control keeps its mark in `--muted`; `aria-disabled="true"` (web) / `disabled` state (phone); never opacity alone | `[aria-disabled="true"]`, `:disabled` | `accessibilityState.disabled` |

Sizes: chips and segments at least 44px tall on the web and 48pt (40 plus hit slop) on the phone; options at least 56. Colour is never the only signal: the mark and the spoken state carry it. Forced colours: the selected edge and mark use `Highlight`, the rest edge `ButtonBorder`.

**Web changes (one base rule replaces the variants):**
- `index.html:4506` group (`.ctrl-btn, .mock-chip, .ss-chip, .subtopic-chip, .fb-type, .gloss-chip, .bk-tag-chip, .notes-filter-btn`, plus `.ph-chip`, `.gt-chip`): `min-height: 44px`; selected (`.active`, `.selected`, `[aria-pressed="true"]`, line 4512 and 4810) changes from an ink fill to the selected look above, with a `::before` tick mask.
- `.gloss-chip` (2850 to 2864): drop the per-domain active colours (`--accent`, `--d3`, `--correct`, `--clay`) and the green hover.
- Glossary Browse buttons (`.gloss-mode-btn`, `setGlossView`): the forest selected fill becomes the selected look.
- `.gt-seg-btn` (4700 to 4721): selected keeps the raised thumb with a 2px ink edge at every width, including inside the narrow container query (no ink fill).
- `.opt.picked, .opt.selected, .opt.mock-selected` (4564): already the look; keep. `.opt:hover` gets `--surface2`.
- `.domain-card.selected` (4523): already ink; the edge goes from `--sh-sel` 1px to 2px.
- `.td-mind-opt[aria-pressed="true"]` (5231): already the look; keep.
- `.conf-seg .conf-btn` (5936): `min-height: 44px` (was 40) and the segment look; `#conf-tip` Dismiss 44 by 44.
- List rows that select (`.you-row[role="switch"]`, radio rows): the switch keeps its track; radio rows get the ink dot.

**Phone changes (`mobile/src/components/ui.tsx`):**
- `Chip` (1416): the ink fill becomes `c.raised` with a 2px `c.ink` edge and the `Check` mark in `c.ink`; label stays `c.ink`. The cross-fade at the half-way point stays.
- `Segmented` (2066): the selected edge goes from 1.5 to 2 (`borderWidth: 2`), and the transparent rest border to 2 so nothing jumps.
- `RadioRow` (1219), `CheckRow` (1275): the filled ink dot and tick as the mark; the row itself gets no fill.
- Answer options in `components/quiz.tsx` follow the web (`.opt.picked`).
- `Toggle` keeps its own on and off look (it is a switch, not a choice).

---

## 6. Shared parts for this phase

These exist from Phases 1 to 3 and are reused, never redrawn.

| Part | Web | Phone |
|---|---|---|
| Card | `.you-card` pattern: `--surface`, `--r-card`, `box-shadow: 0 0 0 1px var(--border)`, padding 18 / 22 | `groveCard(c)` with `grovePlate.pad` |
| Forest hero | `--hero-panel` plus `inset 0 1px 0 rgba(255,255,255,.07)`; inside it the forest token scope used by `.td-hero` (7372) | `HeroPanel` |
| Inset tile on forest | `--hero-inset`, `--r-tile` | `groveTile(c, true)` |
| Tile on paper | `--surface`, `--r-tile` 16, 1px edge | `groveTile(c)` |
| Mint button on forest | `--btn-hero` / `--on-btn-hero` (DECISIONS 11), `label` 16, 48px | `HeroPanel` `action` |
| Row | `label` over `meta` (R5), 36px icon badge (`--r-badge`), chevron in `--muted`, 1px divider inset 16 | `ListRow` with `IconCircle` |
| Section head on a tab home or list | `kicker` (R4), `--text2`, uppercase by CSS | `Section variant="head"` |
| Section head elsewhere | `headline` 17/24 | `T v="headline"` |
| Area mark | dot plus `DomainRing` look (outline `--leaf-line`, arc and tick in the area colour) | `DomainRing` with `outline={c.leafLine}` (was `c.track`, 1.2:1) |

New, both builds: the **glyph tile** (64pt rounded square, `--forest-track` fill, the kit's dandelion drawn in `--btn-hero`, decorative, hidden from screen readers; phone `Dandelion` in `components/glyphs.tsx`, web inline SVG with `aria-hidden="true"`) and the **jump bar** (7.8). The kit's dandelion paths are in `reference/02-phone-learn.html`.

---

## 7. Screens

Each screen lists the web change, the phone change and the audit gap it closes. "Keep" means the item stays exactly as it works today.

### 7.1 Learn hub

**Phone (`mobile/src/app/(tabs)/learn.tsx`), top to bottom, matching 02:**

1. `T v="display"` "Learn", then `meta` "Lessons start each topic. Notes go deeper." No running head (kit; recorded difference from the web frame).
2. **Up next hero** (`HeroPanel`, replacing the Plate at 205 to 232 and the separate full-width Start): `captionLead` the area dot, caption "Up next · IS Operations" (kicker, `--on-forest2`), title the lesson in `hero` 28/34, meta from `upNextMeta` ("5 min · picked where you can gain the most" or "5 min · lesson 2 of 13"), the glyph tile at top right, `action` "Start lesson" with the Play glyph leading, at least 48pt, its hint the lesson title. The panel itself is not pressable. At text scale 1.3 and up the glyph tile moves under the meta line so the title has the full width. Keep `upNextReason`, `?domain=`, and the All caught up branch (kicker "All caught up", its line, "Go to Practice") in the same card. A course with no lessons: kicker "Study notes", title the Read next note, action "Read note"; never "All caught up" for a course that never had lessons.
3. **Search** (`SearchField`, 358 to 368): no "Look it up" head; a raised field at `--r-tile`, 1px `c.line` edge, 48pt tall, `body` text, placeholder "Search notes, like RTO or SoD", spoken label "Search the study notes". Keep the inline results (`SEARCH_INLINE` 5, "See all results", the "No matching notes" state with "Try a shorter word, or an acronym like RTO or SoD.", the count spoken after 700ms). Results push the tiles down while there is text. Hidden when the course has no notes.
4. **Tiles** (from `lookUpItems`, 265 to 317; the numbered `KeyList` goes): Study notes ("Every topic, with traps", then "3 notes read · with traps", "1 note read · with traps"), Glossary ("Key terms, plain words"; only after O2), Principles ("How the exam thinks"), The {course} exam ("Booking to results"; spoken "About the CISA exam, booking to results"). Each tile: `groveTile(c)`, 36pt icon badge, title `label`, line `meta` (up to 2 lines), the whole tile one target with one label. Two columns while text scale is under 1.3 and each tile is at least 160pt wide, tiles in a row share a height; otherwise one column of full-width rows (badge, title, line, chevron). An odd last tile spans the full width. Keep the hide-when-missing flags and hints.
5. **Final review week** row: full-width tile, calendar badge, title "Final review week", line "Your last seven days, day by day", chevron. Hidden when the course has none.
6. **Lessons card** (`LessonGroups`, 420 to 532, inside one `groveCard`): head `T v="title"` "Lessons" with `meta` "0 of 66 · in exam order · each ends with a check" beside it, stacking under it from text scale 1.2. One disclosure row per area, at least 56pt: `DomainRing` in the area colour (16pt), the area number in `meta` tabular ("1"), the DI short name (`label`, wraps, never cut), a mint "Next" pill on the area of the Up next lesson (same area as the hero, also with `?domain=`), the count "0 of 13" in `meta` (an all-done area reads "All done" with the filled ring), a chevron that turns down when open. Row role button with `expanded` state, spoken "Domain 4, IS Operations, 0 of 17 lessons done, next lesson here". From text scale 1.5 (or when it does not fit) the count and pill go on a second line. All areas start closed except a `?domain=N` area. Opening a row shows today's trail inside the card under it (numbered rows, "5 min", done ticks, the walked line, the play disc on the next lesson, the tick that draws once, rows 30ms apart), the 3pt bar under a started area, 200ms height and opacity, static under Reduce Motion. Open state is kept for the session only (no saved key). At the card's foot: an outline button "Prefer a guided path?" (48pt, edge `c.control`, 3.1:1 or more in both themes, `label`) with `meta` "Guided pairs each lesson with practice" under it and as its hint. Hidden when the course has no lessons.
7. **Footnote** `meta` `ink2` (not `c.muted`, line 537): "Short lessons across every domain of the exam outline. IS means information systems. Original content, reviewed against public frameworks."

Light theme: the hero and mint button are the same in both themes (as Today); tiles and the Lessons card are `c.raised` with the `c.line` edge; icon badges `c.soft` with `c.accentText` glyphs (light 4.9:1); the Next pill is mint `#A9D9BA` with `#17231B` text (10.3:1; the word carries it, so the 1.58:1 pill edge on white is decoration).

**Web (behind O3): a new `#learn` page (`NAV_HOME.learn` becomes `'learn'`, 12807)**, sidebar and page bar unchanged; learners already inside Learn keep "reopen the last Learn page" (`navLastPage`); every deep link stays (`#notes`, `#glossary`, `#principles`, `#exam-guide`, `#final-week`):

1. display "Learn" and the same line.
2. **Read next hero** (forest, one per page): kicker "Read next · {area short name}" with the area dot, the note title in `hero`, meta "{n} min read" and the reason, mint "Read note"; Today's `r.focusId` area (DECISIONS 14), so Today and Learn agree. Inside it, a quiet link line "Lessons and the daily plan are in the KaiSip app" (existing copy and link).
3. Search across every domain's notes (reusing the per-domain matcher across all five), the same inline results rules; placeholder as the phone.
4. Tiles: four in a row from 1024px, 2 by 2 from 600 to 1023, one column below 600 or at 200% text.
5. Final review week row.
6. **Notes by domain** card in the Lessons card's shape: ring, number, short name, "{read} of {total} read" (the web already tracks it), chevron to that domain's notes.
7. The footnote, without the lessons sentence: "IS means information systems. Original content, reviewed against public frameworks."

From 1240px the rail holds the "Look up a term" card (as Study notes) and Today's principle (plain card, as Today). No fake lesson rows, no guided path on the web.

### 7.2 Study notes list and note page

**Web (`renderNotes`, `#topicsArea`; `.gt-*`):**
- Page title display "Study notes"; the domain switcher `.gt-seg` keeps D1 to D5 with short names ("D1 IS Audit") and the selected look (section 5) at every width (closes "filled at 390, outlined at 1280").
- Each part's topics sit in one card with inset dividers (`.gt-group-body` rows), not bare rows. The group head `.gt-group-h` is `label` (Figtree 600, not 700), with "7 notes · about 17 min" as `meta` outside the heading (`.gt-group-meta`).
- "Key terms for this domain" and "Exam strategy": section heads in `kicker` (R4, list screen), not the browser's 18.72px h3; each in its own card.
- The read mark (empty `--leaf-line` circle, filled accent with a tick, words in the label) shows at every width, not only 1280.
- Keep filters All / To review / Read, Expand all, "Think of it this way", the domain overview, the forest domain panel and "Practice Domain N".
- **Note page (O4):** `#note/<id>` opens the note as a reading page: a back link "Study notes" (page bar style), the title in `hero`, the note body as today, Previous and Next notes in one card. Fallback while O4 is open: the in-list note stays, its body inside the group card, its open title promoted to `headline`.

**Phone (`app/notes/index.tsx`, `[domain].tsx`, `subtopic/[id].tsx`):**
- A display title "Study notes" on the page (copy `settings.tsx:807`: `PushedHeader` with `showTitle` after scroll plus `T v="display"`). Same on Principles, Question bank, Saved and Mock start.
- Rows into Grove cards with inset dividers (`notes/index.tsx:114 to 145`, `[domain].tsx:165 to 260`); the domain cover stays a `HeroPanel`.
- Show the loaded but hidden content: the 8 exam strategy tips and the 5 cross-domain connections (`content/notes/types.ts:142 to 143`) as two cards after By domain (web parity; existing content).
- `ReadMark` outline `c.leafLine` (was `c.track`).
- "Think of it like this" becomes "Think of it this way" (`[domain].tsx:157`, web wording).

### 7.3 Glossary

**Web (`renderGlossary` 23229, `showGlossDetail` 23371, CSS 2762 to 2925):**
- Title out of the card: display "Glossary" on the page like every other page, the Glossary plant figure beside it (section 8). The intro becomes one plain sentence: "Key terms in plain words, each with the note that teaches it." (copy; Sky sees it at handoff).
- Progress: one `meta` line "{n} learned · {p}%" under the title, replacing the plain ring and the repeated "0 learned" (both numbers kept). The "Mastered" label overlap at 200% goes with the ring.
- Search: the Study notes search look (raised, 1px `--control` edge, `--text2` icon), not beige with a green icon.
- Browse and the other view buttons: the selected look. Domain chips read the DI short names ("IS Audit", "IT Governance", "IS Acquisition", "IS Operations", "Info Protection"; `GLOSS_DOMAINS`), 44px.
- Terms: one card per letter group with 1px inset dividers; each term a `<button>` row (keyboard reachable, replacing `div.gloss-card onclick`, 23343): term `label`, one-line meaning `meta`, a learned mark (empty `--leaf-line` circle or filled accent tick) whose state is in the row's name ("RTO, recovery time objective, learned"). The 4px domain left rule and the 2px border go (the left rule means only the coach is speaking).
- A to Z bar: 44px targets (carry item), even rows at 200% text (no lone Z), spacing on the 4px tokens (carry item).
- Term sheet: a bottom sheet below 768px, the same as the You and Settings sheets; "Mark as mastered" in sentence case (23396); meta as plain `meta` text "Info Protection · Control", not beige pills; "Domain: Protection" becomes the short name.
- `--muted` labels on the page move to `--text2` (TYPE_SCALE 6, carry item).

**Phone (after O2):** `app/glossary.tsx`, a pushed page: display "Glossary" with the plant figure, the same search, area chips, A to Z rows in cards, each with its meaning and "Read the note". Final review week's glossary task (`engine/finalWeek.ts:144`) opens it instead of notes search.

### 7.4 Principles list and principle page

**Web (`renderPrinciplesLibrary` 22206, principle page around 22501):** families as `kicker` heads (list screen, R4), each family's principles in one card with inset dividers; rows `label` over `meta` (the rule, 2 lines). Principle page: title `hero`, the Rule keeps the 3px accent rule in `quote` (it is the coach's voice, like Key idea), sections `headline`, Previous and Next as two rows in one card. From 1240px the rail holds "Look up a term" (as Study notes).

**Phone (`app/principles/index.tsx`):** display title (7.2); row subtitles `meta` not `small` (92 to 96, R5); meta colour `ink2` (107).

### 7.5 About the exam

**Web (`renderExamGuide` 22607, `.eg-h`, `.eg-sec`):** one display title "About the CISA exam"; section heads `headline` 17/24 (were 28px Fraunces, seven heroes on one page); "The exam at a glance" facts in one card with inset dividers; the other sections stay reading text. The running head shows the date only (DECISIONS 8); the body's checked line uses the app's format: "Last checked 19 Oct 2026". Source links get a 44px row height.

**Phone (`components/examGuide.tsx:89`):** meta colour `ink2`.

### 7.6 Final review week

**Web (`renderFinalWeek` 22731, `.fw-*`):** section heads `headline`; each day is one row in one card: `kicker` "Day 7" over `headline` "Full rehearsal" (the "DAY 7 : " colon goes, so a screen reader hears "Day 7, Full rehearsal"); today's day marked by `--surface2` fill and the word "Today", never colour alone; the cheat sheet in its own card.

**Phone (`app/exam-week.tsx`):** the seven `DayCard`s (230 to 256, 296) become rows in one `groveCard`, keeping today's highlight and the expand behaviour. Copy fix (owner word rule): "Your exam date has passed." becomes "Your exam date is behind you. Set a new one to plan again." (215).

### 7.7 Saved

**Web (`#screen-bookmarks` 8150, `.bk-*` 1624 to 1630, `bkDrill` 24004):** display "Saved" on the page (no card around the title); the drill button "Practice your 6 saved questions" (`--btn`, sentence case, 44px; was "Drill 6 Bookmarks" in a 40px forest bar); items as button rows in one card (question start in `label`, area short name and tag in `meta`, not "D1"); the tag select 44px; filter chips 44px with the selected look; hover is a fill only (the `translateX(4px)` goes).

**Phone (`app/saved.tsx`):** display title (7.2).

### 7.8 Practice hub

**Phone (`mobile/src/app/(tabs)/practice.tsx`), top to bottom, matching 03:**

1. display "Practice", `meta` "Every option explained, every trap named."
2. **Jump bar:** three equal buttons "Questions", "Drills", "Mock exams" in a `c.soft` track, each at least 48pt, `chip` role; the section in view gets the selected look (section 5) and `selected` state; role button with the hint "Jumps to Drills" (never role tab, which is the bottom bar's). Reuse Drills' `jumpKey` and `scrollToView`. Wraps to a column at text scale 1.3.
3. **Mindset strip** (after O7): a `groveCard` row with a compass badge, `label` "Mindset." then the tip in `small`. Hidden when the course has no tips.
4. **Picked for you hero** (`HeroPanel art="frond"`, replacing the Plate at 288 to 360): kicker "Picked for you", title the set ("A mixed set", "IS Operations"), meta "10 questions · about 12 min"; three inset tiles (`groveTile(c, true)`, at least 48pt): Domains ("All 5"), Count ("10"), Timed ("Off" or "On"; a switch in place, spoken "Timed, off"); Domains and Count open the existing `PathChooser` and pickers. Under them, `meta` on forest: "Timed counts up while you answer, never a countdown. The exam allows about 96 seconds a question." Then mint "Start" with the trailing arrow. Keep the mode titles, "Or 10 mixed questions", the pace offer and the mocks-first order.
5. **Pace offer** "Practice at exam pace?": `groveCard` (was `Card variant="plate"`, the only edgeless card, 1.13:1 on paper, 193).
6. **Focus next card:** kicker head; row 1 "Questions to revisit", meta "Ready today · oldest first", a count chip at the right ("8"), keeps `reviewSubtitle`, `startReview` and the caught-up route; row 2 the focus area by name with its clay badge, meta "Where you'll gain most" (DECISIONS 14: the label never says "weak spot" or "weakest"; "today's set" while today's set is unfinished), `startFocusPractice`.
7. **By domain card:** head kicker with meta "Starts a set in that domain"; five rows: number, area dot, short name, `meta` "18% of the exam · 2 seen" (`cert.domains[].weight`, `readiness.domains[].answered`), status at the right ("Not started", "Too few yet", or the score with its band word, from `domainBand` and `BAND_MIN_ANSWERS`), chevron; tap runs `startPractice({ domainId, count })`.
8. **Review and saved card:** All missed questions (the mistakes route), Weak spots drill (after O8), All saved questions (`startBookmarks`), Question bank, Build a set; 36pt badges, `label` over `meta` with the kit's lines.
9. **Drills card** (`components/drills.tsx:186` into a `groveCard`): head kicker "Drills" with meta "All at Seedling", intro `meta`, three numbered rows (Today's drill first: "Today's drill · Spot the trick answer", Snare Spotter; Signpost; Call It First) with minutes at the right, then "More drills open after 50 practice questions." "Go to Drills" becomes a `label` text button (R6 wins over row 13; carry item).
10. **Mock exams card:** head kicker "Mock exams", meta "Timed like the real exam"; two tiles in a wrap row: "50" (`numStat`) "Mini mock", "80 min · feedback at the end"; "150" "Full mock", "4 hours · weighted like the real CISA"; they stack at text scale 1.3 (`minWidth`). Then the scaled score note (O9): "ISACA reports scaled scores from 200 to 800. The score needed is 450." (`content/certifications.ts:52, 76, 101, 128`, the en dash goes). Keep the mock-start route and spoken labels.

Sections wrap in `groveCard` with the kicker inside (R4, not the kit's 19px serif). Comments at 2 and 283 to 284 lose the em dashes and "Fig." notes.

**Web (`#screen-practice` 8081, `renderPracticeHub` 16976):**

1. `#phTitle` display "Practice", then a new `meta` line "Every option explained, every trap named."
2. **Jump bar** (`.ph-jump`, new): "Questions" and "Mock exams" (Drills after O5), same rules as the phone, 44px, `aria-current="location"` on the section in view. The page bar (Practice, Mock exam, Saved) stays.
3. **Mindset strip:** `#msText` leaves the italic lead and becomes a card row: compass badge, `label` "Mindset.", the tip in `small`. Fix the spaced hyphen in the tip list ("When you see FIRST - eliminate" becomes "When you see FIRST, eliminate"; the `rotateMindset` source list at 16666).
4. **Picked for you hero** (`#phHero`): forest `--hero-panel` with the leaf badge at top right, kicker, title, meta, three `--hero-inset` tiles (Domains, Count, Timed), the two notes, mint Start. Domains and Count open `#phPanel` as a sheet (below 768px a bottom sheet; from 768px a dialog), focused on that group; the panel keeps Domain, Sub-topic, Length, Difficulty with its hint, Timed and Done, each group in one card (no loose chips on the page, which added about 1,100px at 390). Timed toggles in place (`toggleTimer`, role switch).
5. **Focus next card** (`#phFocus` 8116): as the phone; at 1240px it moves to the rail as a card (`#phmFocus`), not bare text.
6. **By domain card** (`ul#domainGrid`, `renderDomainGrid` 17083): rows as the phone, adding the exam weight from `DI[d].weight` ("18% of the exam"); the italic serif numbers, the bar with the dashed tick and the italic Fraunces state go; the band words stay as `meta` status ("Steady", "Building · below 70" keeps its clay badge for below 70 only). `#phBands` note stays under the card.
7. **Review and saved card** (`#phMore` 8121): rows with 36px badges: All missed questions, Weak spots drill (`startWeakSpotsDrill`), All saved questions, Build a set (opens `#phPanel`). The Mock exam row moves to the Mock exams card.
8. **Mock exams card** (new on the hub): the 50 and 150 tiles (opening `renderMockSetup` with that size chosen) and the scaled score note (O9).
9. From 1240px the rail holds Focus next and Today's principle as cards (Today's principle as on Today: plain card, no left rule; `#phmPrin`).

### 7.9 Question screen

**Both:** stems and options without automatic hyphenation (web `.q-text`, `.opt`: `hyphens: manual`, drop `hyphenate-limit-chars`; keep `overflow-wrap: anywhere`; phone: no `android_hyphenationFrequency` beyond `none`). Options keep the selected look (section 5).

**Web:** confidence buttons 44px (5936) and the tip's Dismiss 44 by 44; the keyboard hint "Keys: <strong>A to D</strong> pick · <strong>Enter</strong> check, then next" (19855, the en dash goes). At 1280, before an answer, the question sits in one centred reading column (680px at most) with no empty rail; the rail appears with the answer (4.2).

**Phone:** unchanged (confidence after a pick, collapsible scenario, sticky bar, 48pt targets all pass). The mock pause line: "Your answers are saved. The clock keeps running. Resume from Today." (`session.tsx:548`, em dash). Pace attention in `ink2` with the clock glyph (O13).

### 7.10 Answer screen

Section 4, on the web in `showResult` (20118), `verdictCoachLine` (20070), `.vr-*` and `.vine-*`; on the phone in `components/quiz.tsx` (`Verdict` 256, `KeyIdeaCue` 460, `Vine` 540, `WhyBlock` 638, `TrustLine` 773) and `app/session.tsx` (`splitMissTips` 719, which goes once O1 is yes). Update `docs/mobile/DESIGN_SYSTEM.md` §10.2 in the same change.

### 7.11 Set results

**Web (`rsGrowthPlate` 19616, the results page around 19684):**
- The one-area chart no longer draws "70 line": call `fgStemChart` with `lineInKey: true` at 19642 (the dashed line and the 70 tick stay).
- Key wording (19625, and the same for every area chart): "Dashed line: 70, the target for each area." (DECISIONS 13 Q1). Growth is shown by "↑" and the words "up 1" in `--accent-text`; clay marks only an area below 70 ("below 70"). The key reads "↑: growth from this set. Clay: an area below 70." plus the existing "No stem yet" sentence.
- The set's name shows once: the running head keeps "Set complete · IS Operations"; the strip says "10 answered".
- The Right, Accuracy and Time stats as Today's clearing tiles (caption labels, Fraunces numerals).
- From 1240px the actions sit in the rail, in view; below that, right under the stats.

**Phone (`app/results.tsx`, `components/fieldguide/StemChart.tsx`):** drop the "70 line" label views (`StemChart.tsx:331 to 340`, call at `results.tsx:370`), keep the dashed line and tick; the key text in `components/youReadiness.tsx` as the web; "too few yet" instead of "seed" in the chart (DECISIONS 13 Q2); "Readiness is 68 to 78%" (en dash today); "Continue today's plan" counts the live due count, not an empty review step's minutes (carry item).

### 7.12 Mock setup

**Web (`renderMockSetup` 20902):** display "Mock exam"; Mini first, then Full, as two tiles (numerals `numStat`, titles `title` 22, not two 28px heroes); the scaled score note under them (O9); past mocks' dates in the app's format ("3 Nov" becomes "Tue 3 Nov"). **Phone (`app/mock-start.tsx`):** display title (7.2).

### 7.13 Mock results

**Web (`showMockResults` 21286):** key at 21388 as 7.11 ("Dashed line: 70, the target for each area."); "Time's up" in the miss tone, not clay; the pace line in words: "Your pace: 800 seconds a question. Exam pace: about 96 seconds." (no bare "s"); Where to look next, Review answers (its segmented filter in the selected look) and Signs for your exam date each in a card with a `headline` head (results are not a tab home, R4).

**Phone:** caption "Your five areas after this mock" when `active.mode === 'mock'` (`results.tsx:336`); the chart as 7.11; `PacingPanel` (`components/pace.tsx:168`) as a card with label and value rows like set results.

### 7.14 Phone You, rebuilt to 04 (`mobile/src/app/(tabs)/you.tsx`)

Matches `screens/04-phone-you.png` and the web You already built, with the owner's later decisions winning over the board (DECISIONS 8, 11, 12, 13): the cog (never the sun), "Badges" (never "Herbarium"), the date in place of "Field record", no "Fig. 5", and no Settings or Help and about cards on You (decision 12).

1. Running head: the date, and the 44pt cog (as now, 260 to 270).
2. Profile row: initial avatar, name (or "Add your name"), "Studying for CISA since 16 Oct · about 20 min most days", "Started with: Some IT audit experience". Then, kept from Phase 3: the summary sentence (`YouSummaryLine`) and "Practice {area}" (DECISIONS 14 area).
3. **Your plant card** (forest `HeroPanel`-style card, replacing `PlantChip` at 296 and 324): the plant art, kicker "Your plant", the name ("Your oak"), "Seed · growth 1 of 6 · grows only from real progress, never wilts", chevron to the plant page. With nothing planted: "Pick your plant" with the existing pick and name flow. Settings → Show my plant off hides it.
4. **Stat tiles, 2 by 2** (replacing the stacked `SpecimenRow`s at 335 to 341): Answered, Correct (new tile, existing count), Accuracy (DECISIONS 1: "Not started", "Too few yet" with "Shows at 30 answers", then the percent), Streak (DECISIONS 3, with "N study days this week" under it). One column at text scale 1.3. Under them `meta`: "Each question counts once, at your latest try."
5. **Estimated readiness card:** the small ring (G31: 20 dots worth 2 answers each, then ticks), kicker "Estimated readiness", the range ("67 to 79") or "Not enough data yet", `meta` "12 of 40 answers for your first range. A study bar, not an exam score.", the ScaleBar once a range exists with the low-end sentence (DECISIONS 13 Q1, Q5; carry items), "See report" link (existing route).
6. **"Five areas, one scale" card:** the stem chart with "Built from your answers in this app.", its key in the Q1 and Q2 wording (no "70 line", "too few yet" not "seed"), Report link.
7. **Badges card:** the pressed badge tiles, "1 pressed · Fresh Start, 26 Oct", "All badges" (existing route). The row text "Your badges and field notes" stays: checked against DECISIONS 8 (carry item), "Field notes" is the name of an existing feature, not one of the banned book labels. Settings → Show badges off hides it.
8. **Study tools card:** Questions to revisit ("8 ready today"), Mistake journal, Saved questions, Share progress; kept: Milestones and Field notes rows where they exist today.
9. **Your progress card:** Your progress, Weak spots, Session summary (existing routes and lines).
10. **Mock exams card**, with "No mocks yet", its line and "Start a mini mock".
11. Kept: the account section (when sync is on), Help and feedback as a card, the Settings row near the end (`SETTINGS_ROW_NOTE`), the trademark footer "Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA." (the You and Settings wording; the Today line is decided at the release).

Every current phone You item stays; anything with no place in the board is listed above under "kept".

---

## 8. The Glossary plant figure

A small plant drawing at the head of the Glossary page, beside the display title. Decorative only.

- **Art:** the existing plant engine, never a new drawing. Web: `plantSafe(function () { return plantSvg({ species: 'oak', stage: 2, size: 64, quiet: true, theme: plantTheme() }); })` (18388). With no `label`, `plantSvg` already writes `aria-hidden="true" focusable="false"`. Phone: `<Plant species="oak" stage={2} size={56} quietLook theme={theme} />` inside `<View accessible={false} importantForAccessibility="no-hide-descendants">`.
- **Always the same plant** (oak, stage 2, the quiet look), not the learner's own: the learner's plant grows only from real progress, and drawing it on a reference page would suggest the glossary grows it.
- **Place:** to the right of the title, top-aligned; the title wraps first. Not drawn under 360px width or from text scale 1.3 (it is decoration, so it never pushes text). No breath, no sway, no motion. If the plant script has not loaded (`plantSafe`), nothing is drawn and no gap is left.
- **Both themes:** the engine's light and dark art; no new colours.

---

## 9. Carry-over items from `RELEASE_PENDING.md` that touch these screens

From "Carry into the next push":
- Glossary letter buttons 28px on phones: 44px (7.3).
- Glossary letter grid at 200% text: even rows, no orphan letter (7.3).
- Letter bar spacing off the 4px scale: spacing tokens (7.3).
- "Mastered" label overlapping the ring at 200% and two `--muted` labels: the ring goes, labels to `--text2` (7.3).
- Phone Results "Continue today's plan" counts an empty review step's minutes: pass the live due count (7.11). The widget half stays for the release.
- Phone "Go to Drills" ghost button at meta size: `label` per R6 (7.8).

From "Small nits to carry into the next web push":
- Phone Badges row "Your badges and field notes": checked against DECISIONS 8, kept (7.14).
- Footer wording Today versus You: You keeps its line; the choice for Today stays at the release.
- The three restore and backup announcement nits are Settings and Today, not Phase 4 screens: they stay in `RELEASE_PENDING.md`.

Also on these screens (from the follow-ups list): the phone Q1, Q2 and Q5 items land with 7.11 and 7.14; the dash sweep items on these screens (`results.tsx`, `session.tsx`) land with 7.9 and 7.11.

---

## 10. What stays exactly as is

- The quiz engine, scoring, readiness maths, the 40-answer threshold, `domainBand`, the review queue, mock timing and grading, `todayPlanV1`, every saved key and export marker.
- `data-l`, `S.currentShuffle`, `originalToDisplay`, `displayToOriginal`, `mapLettersInText`, display letters on screen.
- Every coach line, tip text, explanation, Why not note, Key idea, and every note, glossary, principle and exam-guide text (apart from the punctuation and banned-word fixes named in 7.6, 7.8, 7.9 and O9).
- The phone tab bar with a word under every tab (DECISIONS 4), the web sidebar and page bars, Today and Settings.
- Lessons: the player, the guided path, the check at the end, read state, the trail's data; `?domain=N` links.
- The question screen on the phone; exam-day rehearsal; the mock in progress apart from the two text fixes; the mock navigator's marks.
- Study notes' content and controls on the web (filters, Expand all, D tabs, forest panel, Practice Domain N).
- The version bump and What's New wait for the end of the uplift (DECISIONS 8). Draft line: "Practice and Learn have a calmer, clearer look, and the answer screen keeps every tip in view."

---

## 11. Build order and checks

1. Shared parts and the selected look (sections 5 and 6), web and phone.
2. Answer screen (section 4, fallback 4.6 until O1), question screen fixes (7.9).
3. Practice hub (7.8), then set results, mock setup, mock results, Saved (7.11 to 7.13, 7.7).
4. Learn hub (7.1; web behind O3), then Study notes, Glossary with its figure, Principles, About the exam, Final review week (7.2 to 7.6, section 8).
5. Phone You (7.14).

Each step is checked before the next:
- Screenshots: web 390 by 844 and 1280 by 900; phone 320, 375 and 390pt at text scale 1, 1.3 and 2; light and dark; plus a course with 3 reference tiles and 4 areas, and the `?domain=4` link. The phone screenshots go to Sky with each handoff (`npm run shots`).
- Contrast: every text pair 4.5:1 (3:1 for display, hero, numerals), marks and edges that carry meaning 3:1 (`--control` 3.65 / 3.13 on surface; `--leaf-line` 3.94 / 3.31 on surface).
- Targets 44px web, 48pt phone; no sideways scroll at 320 with 200% text; nothing clipped or truncated.
- Keyboard: every row and tile reachable, focus visible, reading order equals visual order.
- Reduce Motion: every motion above has its static path.
- Gates: `bash scripts/verify_repo.sh`, `(cd mobile && npm run check)`, the `cisa-ux-reviewer` and `mobile-ux-reviewer` passes, then `smoke-tester`.
- Text sweep before each commit: no em or en dashes, no banned words in learner text, no book labels, no total question count.
