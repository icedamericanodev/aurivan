# Grove Phase 4b: your plant, badges and drills (build spec)

Status: the build spec for Phase 4b on both builds, 5 Nov 2026. Website: `index.html` on `feature/grove-ui`. Phone: `mobile/` on `grove-phone-p1`.

Sky approved the panel picks and said: "pick the recommended one but make sure it fits the new design". This file turns the three decisions into one build list and fits them to the Grove screens that are already built. Where this file and a mockup differ, this file wins. Where this file is silent, the built screens win.

Sources: `phase4b/plant-decision.md`, `phase4b/badges-decision.md`, `phase4b/drills-decision.md`, `phase4b/p4-owner-answers.md`, the boards (`scratchpad/grove/p4b/board-plant.png`, `board-badges.png`, `board-drills.png` and the mockups they cite), `DECISIONS.md` 1 to 17, `TYPE_SCALE.md` (wins on every size), `PHASE4.md` (shared parts, selected look, answer screen, short text), and the built screens (`scratchpad/grove/p4c/`, `p4/final-web/`, `p4/final-phone/`, `type/final-web2/`, `type/final-phone3/`).

Owner rules on every line below: presentation only unless an owner answer adds a feature; keep every piece of content and every feature; web and phone consistent; both themes; WCAG 2.2 AA; 44px web and 48pt phone targets; text grows with zoom and Dynamic Type; `TYPE_SCALE.md` roles only; Reduce Motion shows the end state; no "Fig.", "Plate", "Field guide", "Field record" or "Herbarium" in learner text; no em or en dashes anywhere; never "pass", "guarantee", "official", "you're ready", "evolve" or "runner-up" in learner text; never the total question count; never touch `data-l` or the letter mapping; never rename or remove a saved key (`cisa_*`, `aurivan_*`, `aurivan.*.v1`, `cisaMindsetExport`), new fields only beside old ones. Short text (Sky, 5 Nov): one idea per line, sublines about 6 words, notes one short sentence, nothing said twice on a screen. Course content (questions, options, explanations, tips, notes, glossary, lessons, principles, exam guide, final review week) stays word for word.

---

## 1. What gets built

| Area | Phone | Website |
|---|---|---|
| Your plant | **B. Paper garden, merged**: the plant drawn on the page, a growth stem where each leaf carries the fact that earned it (D3), Specimen's Turning layout and waiting state (A), A's Pick grid, Growth Line's one-column Look (D3) | **Web B. The line** with **Web A's dialogs**: a Your plant sub-page of You (sticky plant bed, the same stem), Look inline; Plant yours, Change plant and Rename stay today's dialogs; a 560 ms Turning |
| Badges | **The pressed paper tile**: the press replaces the medallion strike; "Sheet I" becomes "set"; each set ends with its planter line; the after-exam album opens with the plant; Keepsake Trail's two grafts | **Web A. The disc**, as drawn: waiting tile shapes, "Nothing here yet", badges are earned in the phone app |
| Drills | **Twig merged with Quiet Round**, with every panel fix (section 6) | None this phase (O5: drills on the web come later, after device sync) |

Sky's three smaller confirmations in `plant-decision.md` ("For Sky") are taken as approved with the picks: web gets forms, form names and the short Turning; the stem shows saved dates, never durations; the ribbon wording drops "passed" (section 3.3). The drills question ("rename Field Guide to Term Match") is approved: the game shows as **Term Match**; its id, saved rounds and levels are unchanged.

Claude Design is not used. Every drawing comes from the app's own art code (`components/plant/art.ts`, `assets/kaisip-plant.js`, `badgeArt.json`, `components/glyphs.tsx`).

---

## 2. Fit to the built Grove screens

The mockups were drawn before the type pass, Phase 4 and the owner-answers round. Each row below is a place where a mockup differs from what is built. **Follow the built screen in every row.**

| # | Topic | Mockups show | Built Grove (follow this) |
|---|---|---|---|
| F1 | Tokens | Hex values, a soil-brown reached stem, gold silhouettes, green selection | Theme tokens only, no hex in `app/` or `components/` (phone) and no hex outside `:root` (web). Reached stem `--accent` / `c.accent`; later stem and empty marks `--leaf-line` / `g.leafLine`; ground line `--soil` / `g.soil` (decorative only); cream tile `g.specimen` with `specimenTape` (phone `theme/grove.ts`). No new brand colours. One new decorative constant on the phone, `glassine` (`rgba(255,255,255,0.55)`), in `theme/grove.ts`, never in the bundled `theme/tokens.ts` |
| F2 | Pushed page header | Status bar "9:41", a centred bar title ("Your plant", "Look"), a "..." menu | The built pushed page (Settings, Study note): a back chevron row named for where it goes ("You"), then the page's one `display` title, left aligned. No status bar in shots. Keep a menu only where the screen has one today |
| F3 | Title roles | Several big Fraunces lines per screen ("Kai" at 40, "Crown" at 28, set titles in Fraunces) | `TYPE_SCALE` R3: one `display` per page (on Your plant the plant's name, with the kicker "Your oak" over it), at most one `hero` per view (sheet titles, the verdict, the Turning's form name stays `title`), card titles `title` 22 |
| F4 | Section heads | Mixed: "How it has grown" in Figtree, set heads in Fraunces, "STILL TO COLLECT" kickers on pushed pages | R4: `kicker` only on tab homes and their lists (Practice Drills card, You Badges card). Everywhere else (Your plant, Look, Pick, Badges case, a badge sheet, a drill round, the recap) `headline` 17/24 Figtree 600. A count beside a head is `meta`, outside the heading |
| F5 | Small text | Italic sublines and notes at 11 to 13px, tiny captions under tiles | Floors: `aside` 16/22 for italic lines, `meta` 14/20 for row sublines and dates, `caption` 13/18 for labels, `kicker` 11 uppercase only. Chart and figure text uses exception E1 (never under 11). Reading text 16 |
| F6 | Cards | Some blocks on bare paper, some in rounded cards, some forest | The built card: `--surface`, `--r-card` 24, 1px `--border` edge, pad `grovePlate.pad` (phone) and 18 / 22 (web). Rows inside one card with 1px dividers inset 16, never a card per row. Inset tiles `--r-tile` 16 |
| F7 | Forest panel | Forest on the plant hero, Look header, Pick spotlight, the You chip, badge panels, the recap | One forest panel per screen at most, used where it means something: Your plant spends it on **What grows it next** only; the drill recap spends it on the **score**; Badges, Look, Pick and the album have none. Today's hero and the You plant card stay forest as built (unchanged). Forest parts are the built `HeroCard` / `HeroTile` (phone) and `--hero-panel` / `--hero-inset` (web), mint button `--btn-hero` |
| F8 | Rows | Dense 15 / 12 rows, grey square icons | R5: `label` 16 over one `meta` 14 line, 36pt icon badge (`--r-badge`), chevron in `--muted`, at least 56pt tall on the phone (`ListRow` with `IconCircle`), 44px on the web |
| F9 | Selection | Green tick tiles, green outlines | `PHASE4.md` 5: selected is ink, never green. 2px `--text` edge inside the box, plus a mark (a tick on a tile, a filled ink dot in a radio row, an ink tick in a checkbox). Focus ring outside it |
| F10 | Pills | Grey "Next to grow" pill | The built Learn "Next" pill: mint fill with ink text in both themes (`mintInk`), the word always there |
| F11 | Tab bar | Some boards draw the old single-label bar | `components/tabBar.tsx` and the web `#bottomNav` as built: a word under every tab (DECISIONS 4), hidden in a drill round as in any quiz |
| F12 | Answer card | Tinted rows, green "Snare spotted" in Fraunces, a 3px rule on the Exam cue, a clay snare letter | The built answer screen (`PHASE4.md` 4.2, `components/quiz.tsx` Verdict): leaf mark and the verdict word in `hero` in its state colour, coach line `aside`; one untinted answer card with `caption` labels ("Your answer", "Best answer"); tips as rows in the "How to think about it" card; the 3px `--accent` rule belongs to Key idea only. No clay in drills (clay is for the streak, below-70 buds, the 80 mark and the focus badge) |
| F13 | Results | A big "8 of 10 right" score block | The built set results (`results.tsx`, web `#results`): title, stats, domains, then the badge unlock block where it sits today |
| F14 | Numbers | Fraunces at 14 to 17, numbers in Figtree where they are measures | `TYPE_SCALE` 2.1: a result or measure is a Fraunces numeral step (`num.score` 52 for the round score, `num.inline` 20 for a % in a row); a counter you scan ("2 of 5", the drill header score, a timer) is Figtree with tabular figures |
| F15 | Spacing | 12 and 20pt gaps, 24pt gutters | The 4pt scale as built: 16 gutter, 12 between cards, 24 above a section head, card pad as F6 |
| F16 | Boxes that hold text | Fixed heights | `minHeight` on the phone and `min-height` in `em` on the web, so 200% text grows the box (PHASE4 6) |
| F17 | Today | B adds a plant thumbnail on the Today row; A adds a sap ring round the disc | Today keeps one plant, in the ring disc, and only the readiness ticks are a ring. The plant row keeps its leaf glyph, line and chevron, no thumbnail |
| F18 | Words | "stage", "Sheet I", "Herbarium", "Practise", "passed", "like a field guide" | Section 3 |
| F19 | Demo data | Different numbers per board | Shots use one dataset: Bough reached 3 Nov; one IS Audit value; You shows all its stat rows |

---

## 3. Wording, resolved

### 3.1 The botanical style caption

"A fine line drawing, like a botanist's sketch." (`engine/plantLooks.ts:103`, was "A fine line drawing, like a field guide."). Same on web and phone (the web reads it from the plant bundle).

### 3.2 One word for plant progress: "growth"

Checked in the built code (5 Nov):

| Where | Word today |
|---|---|
| Phone You plant card (`components/groveYou.tsx`, `components/youTop.tsx`) | growth ("Kai · Shoot · growth 3 of 6") |
| Phone Your plant and the plant engine status line (`app/plant.tsx`, `engine/plant.ts:1255`) | growth ("Bough · growth 4 of 6") |
| Phone widget (`engine/widgets.ts:1251`, `widgets/layouts.android.tsx`) | growth ("Growth 3 · Shoot") |
| Plant engine names (`GROWTH_NAMES`, `MAX_GROWTH`, "What grows it next") | growth |
| Phone Today hero (`app/(tabs)/home.tsx:80, 674, 818, 824, 935`, `engine/groveToday.ts:37`) | stage ("Stage 1 of 6") |
| Web Today hero, You chip, You plant card and strip (`index.html` `todayFigHtml` 15706 to 15720, `youChipHtml` 14346, `plantYouCardHtml` 19477 to 19483) | stage |
| Phone Today study journey ("Stage 4 · Rehearse the exam", `home.tsx:201`) | stage, for the study plan, not the plant |

**Decision: "growth", never "stage", for the plant, on both builds.** The phone uses it on three of its four plant surfaces and in its engine, the panel chose it (plant-decision fix 4), and "stage" already names the study journey's steps on the phone's Today, so two meanings would sit on one screen. This amends DECISIONS 8's Today line ("Stage 1 of 6"); add it to `DECISIONS.md` as entry 18 in the first build commit.

- Phone Today hero: "Shoot" (italic, left) and "Growth 3 of 6" (right). Spoken "Shoot, growth 3 of 6".
- Web Today from 768px: "Shoot · growth 3 of 6", spoken "Shoot, growth 3 of 6". Phones: as the phone app.
- You chip and card: "Kai · Shoot · growth 3 of 6". Web strip spoken "Shoot, growth 3 of 6, now"; its list name "Your oak's six growths" (was "Six stages of your oak").
- **No count on a line that shows a form name.** Once a form exists the line reads "Your oak · Bough" with the form name ("The Standard Oak") on its own line.
- "Stage" stays only for the study journey. Drill progress is "level" (Seedling, Sapling, Heartwood).

### 3.3 The ribbon keepsake (no "pass")

The feature stays: the ribbon opens from the saved `passedOn` date, exactly as today (no logic change, no new field). Only the words change, in `engine/plantLooks.ts`:

| Field | Was | Now |
|---|---|---|
| `how` (231) | "Tell us you passed" | "Tell us how your exam went" |
| howToOpen (391) | "Opens when you tell us you passed." | "Opens when you tell us your exam result." |
| `caption` (231) | "The ribbon: you told us you passed." | "The ribbon: you shared your exam result." |

When the self-reported result flow is built later, its own words follow the same rule (for example "I got the score I needed"), never "pass".

### 3.4 Other copy fixes from the decisions

| Where | Was | Now |
|---|---|---|
| Rest line (`engine/plant.ts:1203`, `app/plant.tsx:149`, any web copy) | "... Pick up whenever you're ready." | "... Pick up whenever you like." |
| Set keepsake howToOpen (`plantLooks.ts:389`) | "... set in the Herbarium." | "Opens when you finish the {set} set in Badges." |
| Stem date | "Now, since 3 Nov" | "Now · reached 3 Nov" |
| Badge set head | "Sheet I · Groundwork · 2 of 3 pressed" | "Groundwork" (`headline`) with "2 of 3 pressed" (`meta`) |
| Badges italic line | "Every sheet counts on its own; there's no ..." | "Every set counts on its own." |
| Badge dates | "Earned 2 Nov" and "Pressed 4 Nov" mixed | "Pressed 4 Nov" on tiles and sheets (spoken "Earned 4 Nov"); quiet back-fills keep "By 11 Oct" |
| Results button (learning-game mockups) | "Practise the ones you missed" | "Practice the ones you missed" |
| Drills grafts | "enough content"; "Pick the best" | "enough practice questions"; "Tap the BEST answer" (engine copy, word for word) |
| Game name | "Field Guide" | "Term Match" (visible name only) |
| "Badge sheet" | a learner-facing name | internal only |

---

## 4. Your plant

### 4.1 Phone: Your plant (`app/plant.tsx`)

Order, top to bottom. One column at every text size.

1. **Back row** "You" (F2).
2. **The plant on the page.** No card and no disc: the real art drawn on a `--soil` ground line across the full width, on the page background. The planter, keepsakes and visitor stand on the line. Art height steps with growth: about 180pt at Seed and Sprout, 240pt at Shoot, 300pt from Bough (capped by the width; at text scale 1.3 and up it stays at the step below, never taller than 40% of the screen). Breathing as today (once per session, You and Your plant only).
3. **State tag** beside the art's foot, only when one applies: "Plan cleared", "Resting", "Rest day" or "Exam day". A static tag: `caption` in `--text2` on `--surface2`, radius `--r-step`, not a control, no edge. The art never carries a state alone (no window light, no dawn wash).
4. **Name block:** `kicker` "Your oak" (the species, lower case in source), the name in `display` ("Kai"), the form name in `quote` italic ("The Standard Oak") when there is one, else "Bough · growth 4 of 6" in `meta`. Then the form's one line in `small` `--text2`, then the visitor line (wren glyph and "A wren came by: you cleared today's plan.") in `meta`. The look line "A look is just for you: it never changes your growth." sits under Look (item 8), not here.
5. **The quiet grew line**, on the first visit after a growth that brings no new form: one `aside` line "Kai grew to Bough." above the stem, and the Bough leaf fills (4.6). Shown once (saved as seen, as `pending` is today).
6. **How it has grown** (`headline`), with "Planted 27 Oct" in `meta` beside it. The stem:
   - One vertical line on the left, 2pt. Reached part `--accent` (5.4:1 light, 8.9:1 dark on the page); the part still to come dashed `--leaf-line` (3.94 / 3.31).
   - Order: Seed at the top, Elder at the bottom.
   - One row per growth: a leaf mark on the line, then `label` (the growth name) over `meta` ("reached 28 Oct", and "· grew into the Whip Oak" when that growth brought a form). Under it, in `small` `--text2`, the saved fact that earned it, word for word (the grew facts and `FORM_FACTS` already saved). A 56pt `groveTile` with the form's art at the right, only on rows that brought a form.
   - Leaf marks differ by shape as well as colour: reached = filled `--accent` leaf; now = filled leaf inside a 2pt `--accent` ring (the "Now" row also says "Now · reached 3 Nov"); later = dashed `--leaf-line` outline.
   - Dates only on reached leaves, from saved fields. A reached growth with no saved date (an older plant) shows no date, never a guessed one. No gaps, ranges or "days since".
   - **Keepsakes** sit on the stem as small dated leaves between growths, with their badge skill line word for word ("Pressed 4 Nov · Long Memory"), when the learner shows that keepsake.
   - **Earlier growth:** once the stem has more than 8 leaves, the leaves older than the current form fold under a closed "Earlier growth" disclosure row (48pt, chevron, the built disclosure motion). Now and Next always stay open.
   - Screen readers: the stem is a list; each row is one stop ("Shoot, reached 31 Oct, grew into the Whip Oak. {fact}"); the now row starts with "Now". Phone: no faked list position (as PHASE4 4.3).
7. **What grows it next**: the screen's one forest panel, on the stem's next row (the stem line runs beside it). `HeroCard` pattern: `kicker` "Next" in `--on-forest2`, the next growth's name in `title` ("Crown"), then one row per gate: the gate in `small` ("Your study estimate, without hints or games, reaches 65%"), its value in `num.inline` with raised % ("94%"), a 6pt bar in `--btn-hero` on `--forest-track`; a gate not started reads "Not yet" in `meta`. Under the gates, the two footnotes in `meta` `--on-forest2` (section 8 trims them). Hidden at Elder (the Elder row says "Fully grown. It keeps all of its growth."), on exam eve and on exam day.
8. **Later growths** after the panel: dashed leaves with `label` name and `meta` line ("Grows into the Broadcrown Oak at Elder.").
9. **Your domains** (`headline`, with "One part of the plant each" in `meta`): one row per area in the built area-dot style, the DI short name in `label`, "72% · lush" with the % as `num.inline`; the area the plant needs next carries the built "Next" pill (F10) with the word "Next to grow".
10. **Look** (`headline`), the line "A look is just for you: it never changes your growth." in `meta`, then three rows (F8): Change its look ("Its style, colours and keepsakes"), Change plant ("Same growth, new look."), Rename ("Now: Kai"). Then a "Plant settings" text link (`label`, `--accent-text`, 48pt) to Settings' plant group (4.11).

Daily signals stay the engine's own drawing (first flower, part marks, undergrowth). Each one that carries meaning is also said in words in Your domains ("lush", "full"); none is new art.

### 4.2 Phone: Look (`app/plant-look.tsx`)

1. Back row "Your plant", `display` "Look".
2. **Sticky preview**, 160pt: the plant on its soil line at the top, under the back row; every change previews here in place. From text scale 1.3 it is 120pt and stops being sticky when the screen is shorter than 640pt, so text never sits under it.
3. One column of rows, in this order, each with a `headline` group head: Style, Colour, Ground, Planter, Visitor, then Final form (only at Elder), then Keepsakes.
   - Style, Colour, Ground, Planter, Visitor and Final form are **radio rows**: a 48pt art thumbnail, `label` name over `meta` caption (Botanical: "A fine line drawing, like a botanist's sketch."; Storybook: "Rounded and colourful."; Storybook with a face: "A friendly face that shows its mood."), the radio mark at the right (filled ink dot when chosen, F9). Spoken "Botanical, A fine line drawing, like a botanist's sketch, selected, 1 of 3".
   - Keepsakes are **checkbox rows**, at most three shown; the fourth is disabled with "Up to three at once" in `meta`.
   - An item not open yet: its thumbnail as a dashed `--leaf-line` mount, the row disabled, its howToOpen line in `meta` (section 3). "More to find" stays one collapsed disclosure, as today.
   - Text wraps at 200%; no sideways rail, no sideways scroll.
4. No Done button (each tap applies), as today.

### 4.3 Phone: Pick and name (`app/plant-pick.tsx`)

Modes, each its own screen state with the same layout:

| Mode | Title (`display`) | Line (`meta`) | Main button | Second |
|---|---|---|---|---|
| New (from You or the first set) | "Choose what you'll grow" | "Grows from real progress, never from taps or time." | "Plant it" | "Not now" |
| New from Today | same | adds "Not now hides this on Today. Plant one any time from You." | "Plant it" | "Not now" (hides Today's row, as today) |
| Change plant | "Change plant" | "Same growth, new look. Each is shown at Crown." | "Use this plant" | "Cancel" |
| Rename | "Rename" | none | "Save name" | "Cancel" |

1. **Spotlight:** the chosen species drawn on the soil line (paper, not a forest card), its name in `title` and its line in `aside`. 160pt art; 120pt from text scale 1.3.
2. **Name it** (New and Rename): the built text field (48pt, `--r-tile`), with "Another idea" as a text button (48pt) that suggests a name, as today. The field sits right under the spotlight so it is on the first or second screen.
3. **The grid:** all 13 species at Crown, 3 columns of `groveTile`s (art plus `label` name). Selected = the built selected look (F9). 2 columns from text scale 1.3 or under 360pt; from text scale 2, one column of rows (56pt art, name). Arrow order equals reading order.
4. **Sticky bar:** the main button (solid `--btn`, `button` 17) and the second button (ghost, `label` 16), each 48pt, in a bottom bar; stacked from text scale 1.3.
5. The first "Plant it" plays `plantIn` (820 ms) on the host screen (4.9 for the first set; Your plant otherwise).

### 4.4 Phone: the Turning and its waiting state

When a growth brings a new form, the Turning owns the visit; nothing else celebrates (no grew line, no badge moment, no leaf fill outside it).

- **Waiting state** (A): on Your plant with a form pending, the art shows the old form, still. Under it the solid main button "See Kai's new form" and `meta` "It plays when you tap." The rest of the page is below as usual.
- **Frame layout** (A): the saved fact that earned the form is on screen from 0 ms, above the art (`small`, `--text2`, word for word). The art is centred on the soil line. Under it the label: a 1px `--text2` rule from the plant side, `kicker` "New form", the form name in `title`.
- **Timeline** (medium form, 3000 ms; the tokens in `motion.turn` are kept): gather 180 to 900 (the light gathers, the old form inhales); five even half-swaps 900 to 2220 (about 264 ms each, 60% cross-fade, `turnLook.evenPace`); bloom 2220 to 2560 (the light lifts, the new form settles 0.97 to 1); the label rule scales in from the plant side 2500 to 2740; the form name fades in 2600 to 3000; the matching stem leaf fills once at `nameAt` (2500 to 2800, 4.6), never during the swaps. Small (2400 ms) and grand (3600 ms) shift by their own `nameAt` (1900, 3100); the halo is grand only.
- **Flash rate:** at most 2 flash pairs a second (264 ms half-swaps, `swapFloor` 200). Write this in the motion spec beside `motion.turn`.
- **Gold on paper:** `silGold` #C99A3A is 2.3:1 on the light page. It is decorative: the fact and the form name carry the moment. Record this in the motion spec.
- One success haptic at the bloom. Any tap or scroll after `playGuard` (400 ms) skips to the end (`skip` 120 ms). One spoken line at the end: "Kai has a new form: the Standard Oak."
- **Reduce Motion and screen readers:** no waiting button; the end state shows at once (`turnReduced` 120 ms cross-fade), the fact, the name and the filled leaf in place, and the one announcement.

### 4.5 Phone: Elder and the final form

At Elder the Look screen adds the Final form group (radio rows, with the sticky preview, 4.2). On the visit Elder is reached, the Turning plays (grand), then at most 8 leaves drift once down the art's own column (`celebrate.leaves`), never over words; Reduce Motion shows no drift. "Storybook with a face" stands on the same soil line as the other styles (no frame, no disc). Your plant at Elder: no forest panel; the Elder row reads "Fully grown. It keeps all of its growth."

### 4.6 Phone: the stem leaf fill

A growth reached on this visit (no new form): its leaf fills once, opacity 0 to 1 and scale 0.85 to 1, 300 ms (`dur.fill`), no overshoot; the stem's accent part extends with it (opacity only). One light haptic. Spoken with the grew line. Inside the Turning it plays at `nameAt` (4.4). Reduce Motion: filled at once.

### 4.7 Phone: states

Each state keeps its words; on paper a state is a tag (4.1 item 3) and one `small` line under the name block, never a coloured alert and never a rule.

| State | Tag | Line |
|---|---|---|
| Resting | "Resting" | "Kai is resting. Pick up whenever you like." (a small moon on the art, never a wilt) |
| Back after 7 days or more | "Resting" | "Kai kept your place. Pick up where you left off." |
| Plan cleared | "Plan cleared" | the visitor line (4.1 item 4) |
| Exam eve | "Rest day" | "Sleep and time off help memory settle." What grows it next is hidden |
| Exam day | "Exam day" | "Good luck. You've done the work." What grows it next is hidden |
| Back-fill, once | none | "From your study so far: your study so far grew Kai to Bough." as today, then the stem |
| New: forms (a plant past Form I when forms arrived) | none | "Your study so far brought Kai to the Standard Oak." once |
| Nothing planted | none | `title` "Nothing planted yet", `small` "It grows only from real progress, and never wilts.", main button "Plant yours" |
| Show my plant off | none | `title` "Your plant is hidden", `small` "Its growth is kept. Turn on Show my plant in Settings.", button "Open Settings" |

### 4.8 Phone: Today and You

- **Today:** unchanged apart from the word (3.2). The plant stays in the ring disc only; the plant row under the hero keeps its line ("Kai grows with your study." as built) and opens Your plant. No thumbnail, no sap ring. The grew line and the Turning do not play on Today; Today's existing "Kai grew to Shoot." line and fact stay (DECISIONS 11).
- **You:** the built forest plant card (PHASE4 7.14 item 3) with "Kai · Shoot · growth 3 of 6 · never wilts", chevron to Your plant. No strip added on the phone You (the stem on Your plant carries the growths).

### 4.9 Phone: first set, "Kai is planted"

The first set's closing screen (`components/firstSet.tsx`) keeps its invitation ("Want a plant that grows as you learn? It's optional." with "Plant a seed" and "Maybe later"). After "Plant it" in Pick, the closing screen is the `plantIn` host: the seed settles and the sprout pops on the soil line (820 ms, 0 seed above the soil, 400 settled, 650 sprout pops, 820 planted), then `title` "Kai is planted." and `small` "It grows as you learn." with a text button "Choose a different plant" (48pt, opens Pick in Change plant mode). Reduce Motion: the planted sprout at once.

### 4.10 Phone: Android home-screen widget

The built widget (`engine/widgets.ts`, `widgets/layouts.android.tsx`) restyled to paper: the plant on its soil line, always awake (no resting moon), no face (a face style draws as Storybook), static (no motion). Name in serif (E6, at least 13), "Growth 3 · Shoot" under it, or "Kai · Bough" and the form name once a form exists. Spoken "Your oak, at growth 4, bough. Standard Oak form." (as built). Tap opens Your plant. Light and dark follow the launcher. No count of questions, no readiness number.

### 4.11 Phone: Settings, "Badges and your plant"

One group card on the built Settings page (the group pattern of "Appearance" and "Exam"), headed "Badges and your plant":

- Show my plant (switch, "Hidden everywhere when off.")
- Change its look (row, opens Look)
- Quiet look (switch, its existing line)
- Show badges (switch, "Hidden everywhere when off.")

Rows and switches 48pt, `label` over `meta`. Moving Show badges into this group is a regroup only; each setting keeps its saved key and behaviour.

### 4.12 Website: Your plant (Web B, The line, with Web A's dialogs)

- **Where:** a new sub-page of You at `#plant` (as `#settings`), opened from You's plant card, Today's plant row and the study rail. The page bar's back link is "You"; the phone tab bar marks You while it is open. Focus lands on the page title.
- **Layout from 48em:** two columns. Left, a sticky plant bed (the art on its soil line, sized as 4.1 item 2 in px, the name block and state tag under it). Right, How it has grown with the stem (4.1 item 6), What grows it next as the one forest panel, Your domains, then **Look inline** (the radio and checkbox rows of 4.2; the sticky bed is the preview). Under 48em: one column in the phone's order. Under two screens tall at 1280 by 900 for a learner at Bough.
- **Dialogs stay:** Plant yours, Change plant and Rename open today's dialogs (`plantOpen`, `changelogModal`). Only Look is inline. The pick grid in the dialogs is A's 3-column grid (4.3), selected look F9, coins differ by shape, the current one has `aria-current="step"`.
- **Weak spots drill** stays in Review and saved on Practice (it is not moved to this page).
- **You plant card:** keeps the built forest card, its name line in the growth wording (3.2), "Grows only from real progress, never wilts." and the six-growth strip, now drawn with the real species art for reached growths (`plantSvg`) and quiet dashed `--leaf-line` squares for later ones, never future forms. Its "Look, plant and name" disclosure becomes one row, "Your plant" ("How it has grown"), to `#plant`, where all three actions now live. The Pick your plant state stays.
- **Today:** the plant row keeps its place and leaf glyph; its line becomes "How it has grown" and it opens `#plant`. The "Plant a companion" invite stays as built ("Plant yours", "No thanks").
- **Study rail** and the **Glossary plant figure:** unchanged (PHASE4 8).
- **Web Turning (560 ms, under the web 600 ms cap),** in the phone's order: the fact is in place at 0; the gather wash 0 to 140 (opacity); the old form cross-fades to the new 140 to 320 (one cross-fade, no swaps); settle 320 to 420 (scale 0.97 to 1); the label rule scales in and the form name fades in 400 to 520; the stem leaf fills 420 to 560. It plays on `#plant` (or the You card, if that is where the learner is) on the first visit with a new form; no waiting button on the web. One `role="status"` line: "Kai has a new form: the Standard Oak." Reduce Motion: the end state at once.
- **Web leaf fill:** 200 ms, opacity and scale 0.85 to 1.

---

## 5. Badges

### 5.1 Phone: the case (You, Badges; `app/milestones.tsx`)

1. Back row "You", `display` "Badges", `aside` "Every set counts on its own.", `meta` "Earned by what you've mastered. Once earned, a badge stays." The route keeps its name, so links from Results still work.
2. **New in your badges** panel and its line, once (as today), as a plain card.
3. The one-time catalogue line (the new tiers and Took Root their study already earned), once.
4. Filters All, Earned, Not yet (built chips, F9) and Sort (by set, recently earned, closest, effort), kept on the phone.
5. **One card per set**, in journey order. Head: the set name in `headline`, "2 of 3 pressed" in `meta` beside it. Then the tiles in rows (at most four in a row, each 76 to 84pt, never larger on dark), each with its name in `meta` under it and "Pressed 4 Nov" (earned) or the closeness ("31 of 75 remembered") under that. "Study for this" as a text link on a not-yet tile's row. Then **the planter line** as the set's last row: the planter drawn small (40pt) in the plant's own style, and `small` "Completing Groundwork adds the terracotta pot to your plant's looks." Once the set is complete: "The terracotta pot is in Look." No planter line on Moments or Field notes. Hidden when Show my plant is off.
6. **Ladders and tiers:** Clay, Lichen and Gold leaf as three tiles in a row, the reached ones pressed. "Stretch · beyond exam need" stays its own row under each ladder.
7. **Domain emblems:** the five domain badges keep their emblem, area dot and "% of the exam" line.
8. Moments (not counted) and Field notes (counted on their own) follow, as today. Never a total across sets, never a count of the question bank.

### 5.2 The pressed tile

- **Earned:** a cream paper tile (`g.specimen`, the same cream in both themes, like the plant's paper), the real emblem in its botanical inks, two tape strips (`specimenTape`) at opposite corners. Radius `--r-tile`. The tape is decoration only: the earned state is in words ("Pressed 4 Nov") and in the spoken label ("Long Memory, Evergreen, clay tier, earned 4 Nov").
- **Not yet:** a pencilled dashed mount, 1.5pt `--leaf-line` (3.94 / 3.31 on the card) with the emblem's faint silhouette; the solid part of the outline, in `--accent`, shows how close (the same value as the words). Spoken "Not yet, 31 of 75 remembered".
- **Took Root** is pressed like every other badge.

### 5.3 The sheet (one badge)

The built sheet (`hero` title per R3). Order: the tile at 120pt; the name in `hero`; tier in `meta` ("Evergreen · Clay, tier 1 of 3"); "Pressed 2 Nov"; the badge's line in `aside`; **the earned-sheet vignette** (Keepsake Trail): the pressed tile beside the learner's plant wearing that badge's keepsake, with `meta` "On your plant: the jay." (only when the badge gives a keepsake and the learner shows it; never on Today); Tiers (5.1 item 6); "The rule" (`headline`) and the exact rule in `small`; how close; "Study for this" (solid, the sheet's one main button, when not yet earned); "Share this badge" (when earned and shareable). No roman number anywhere.

### 5.4 The unlock on Results (the press)

Same words, same place and the same limits as today on the built results screen (F13): `caption` "A new badge · Evergreen", the name in `label`, its line in `small`, "See it in your badges" link, the Next line. Only the tile moves, inside its own 76pt column; the words are there from the first frame.

| ms | Frame |
|---|---|
| 0 | The block is in place, words first. The mount is still pencilled. |
| 120 | A sheet of glassine lays over the mount (opacity 0 to 1, 200 ms); the emblem shows through. |
| 320 | Pressed: the tile settles flat, scale 1.06 to 1 (`curve.enter`, 240 ms). One success haptic. |
| 560 | The glassine lifts away and fades (opacity, 200 ms). |
| 760 | The first strip of tape lands (opacity and scale 0.9 to 1, 120 ms). |
| 960 | The second strip lands. Done by 1080 ms. |

Opacity and scale only. No confetti, no sound, no medallion strike (the strike layer in `components/medallion.tsx` is no longer used for unlocks). Any tap or scroll jumps to the last frame. Limits as today: one full moment a session and three in seven days, then the quiet line; a repeat plays `dur.short` (200 ms cross-fade of the end state). Reduce Motion: the taped tile at once, the block fades in over 120 ms, the words never move. Spoken once: "A new badge, Evergreen: Took Root. {line}".

### 5.5 The after-exam album

After the exam date the case becomes the keepsake album. It opens with the learner's own plant on its soil line, as it is now, wearing the keepsakes the learner chose to show (real art, `kaisip-plant.js`), with its name in `title`; then the sets. No Next panel, no progress, no Closest sort (as today). With Show my plant off, it opens with the sets.

### 5.6 You badge row and the share card

- **You Badges card:** as built (the newest pressed tiles, "9 pressed · Firm Footing · IS Audit, 5 Nov", the "new" dot by shape and in words, "All badges"). Only the tiles' look changes (5.2). The count is earned only, never "of N". Show badges off hides it and You keeps a Field notes row.
- **Share card** (E5): the pressed tile replaces the medallion; "Share this badge"; only what is on the card is shared; the KaiSip mark; "Not affiliated with or endorsed by ISACA®". Moments and Fresh Start stay unshareable.

### 5.7 Website: The disc (Web A)

Your progress (Badges section) and You's Badges card: `headline` "Badges" (`kicker` on You), the built line "Labelled the day you earn them.", a row of waiting tile shapes (dashed `--leaf-line` mounts, the emblem silhouettes only where the web already has the art; otherwise empty mounts, never new art), `aside` "Nothing here yet", `meta` "Badges are earned in the phone app for now.", and "Get the KaiSip app" (the existing app link, 44px). Never a count. No press, no sheets, no album on the web.

---

## 6. Drills (phone only)

### 6.1 Drills card (Practice) and entry points

The built Drills card (`components/drills.tsx`, p4c `grove-practice-3`): `kicker` "Drills" with the level beside it ("All at Seedling"; once grown, the level leaf glyph before the word), the "From your misses" line, three rows with italic numerals and dotted leaders, each `caption` skill over `label` name and "best 7 · 6 min" in `meta`, then "More drills · 6 more" as a disclosure. The 3-then-unlock line word for word, no count, no lock icon. No glyph badges and no skill numbers on rows. The unlock variant "The other drills open after 50 practice questions." uses the same row. Kept: the Today plan item, the "as Drills" hint on Practice ("The games are here now, as Drills." with "Go to Drills"), "Drills arrive once ...", "This game is on the way", the `/play` redirect (no UI).

### 6.2 Intro

Pushed page: back row "Practice", the game glyph tile (decorative), `display` game name, `small` its line, "Pick your level" as the three-marker control (reached = hairline `--border`, current = forest fill with sap leaf, not reached = dashed `--text2`), Start (solid). Daylight adds "Pick your light" with `meta` "Suggested: ... from your recent answer times."

### 6.3 Round screen

1. **Header** (tab bar hidden): close (X, 48pt), the twig, and the score as `caption` "Score" over a Figtree tabular number (F14), spoken "Score 2".
2. **The twig:** one `--soil` branch (decorative), one leaf per item. Right = filled `--accent` leaf. Missed = solid `--control` outline (3.65 / 3.13) with its midrib and a small cross notch, never red. Still to come = dashed `--control` outline. The twig is one accessible element: "Question 2 of 5. 1 right, 0 to review."
3. **Fallback** to numbered tick and cross squares (`--r-step` 9, 30pt) at text scale 1.3 and up, and for rounds of more than 8 items (Root or Rumor, Canopy Call).
4. **Game line:** glyph, name in `label`, `meta` "Beating distractors · 2 of 5".
5. **Step squares** (two-step games), engine copy word for word: "Tap the snare", "Tap the BEST answer". A done step is the ink done state with its result ("You marked D"), never accent green before the reveal.
6. **Seedling hint**, the first two rounds of each two-step game only: one `meta` line ("A snare is a wrong option built to look right."), then gone for good.
7. **Options:** the built option rows (56pt, E4 letter badge, `body`).
8. **Call It First:** the options drawn as folded bars (`--surface2`, 16pt tall, not pressable) under the principle cards, with `meta` "The options open once you name the principle." One group for screen readers ("Options hidden until you name the principle"). Heartwood "Options hidden" stays.
9. **Daylight:** "Flag & move on" and "Pause" in the sticky footer row, each 48pt, stacked from text scale 1.3; "Add a minute" the same. The pace bar steps once a second with no tween.
10. **Leaf Pairs / Term Match** (the renamed Field Guide) and other match boards: one column from text scale 1.3. Forecast segments stack at 1.5. The option letter badge scales with text (30pt times text scale, capped at 1.6).

### 6.4 Feedback (one grammar with the main answer screen)

The built answer screen (F12, `PHASE4.md` 4.2) with the drill's own content, in this order:

1. The stem folds to two lines with "Show question" (48pt); cross-fade, no height animation.
2. **Verdict:** the built Verdict component (leaf mark, the word in `hero` in its state colour, coach line `aside`). The drill's words: "Snare spotted", "Correct", "Not quite". A miss is calm: no shake, no flash, no sound; the twig leaf stays an outline.
3. **Two-half line** (Snare Spotter, Signpost, Call It First only; never Forecast, Daylight or one-step games): one `small` line at the top of the answer card naming only what was earned: "Snare spotted, 1 point. Best answer picked, 1 point." / "Snare spotted, 1 point. The best answer was A." / "The snare was D. The best answer was A." Never "No point".
4. **Answer card**, untinted: "Your answer", "Best answer", and a "Snare" row with why it tempts (`caption` label in `--text2`, outline letter badge, never clay); then "Other options" as the built muted list.
5. **How to think about it:** the built tips card, with the item's Final two and Exam cue rows (and Eliminate two where the item has it), word for word.
6. **"Why A, and the key idea"**: a closed disclosure (48pt, the built Read more pattern), holding the explanation and the key idea.
7. Next (solid, sticky footer). Focus moves to the verdict heading after 400 ms; announced once ("Snare spotted. D was built to fool you, and A is the best. Two points.").

### 6.5 Round recap

1. **One forest panel** (`HeroCard`): the game glyph, `kicker` "Round complete · Snare Spotter", the score in `num.score` 52 rolling from blank (300 ms, never a visible 0), `meta` "out of 10 · best 8", `small` "This round: 4 of 5 snares spotted", one row of tick and cross squares (on forest: `--btn-hero` ticks, `--hero-leaf-line` cross outlines). "New personal best" is static `caption`.
2. **Level change** (inside the panel, as a `HeroTile` band): the three-marker control (6.2), `small` "You've grown to Sapling. Your next round starts there." and "What changes: decoys from nearby ideas." (each game's existing level line). No "Next, Heartwood: 0 of 2" on that round. A step back uses its existing line and never animates; the lost level is a plain unfilled marker, not a locked tile.
3. **What caught you** (card, when the round had misses), then `meta` "Missed questions are in your review."
4. **Last 5 rounds** (card): the real `glyphs.tsx` Sparkline (`sparkPoints`, straight segments, newest point as the filled leaf), with a `role="img"` label of the five scores. On rounds with no level change, the level line "Seedling · 1 of 2 strong rounds toward Sapling" with two dots (filled and outline, by shape).
5. The game's own end note (`aside`), then Play again (solid) and Done (ghost) in a sticky footer, 48pt each; one "Report a problem" text link.
6. **One celebration per round end** (as `gameRounds.ts` does): on a level-up the badge InviteRow is dropped and the badge waits (the You dot, then a quiet InviteRow on the next round end with no level change). A recap with a badge and no level change shows the InviteRow under the panel.

### 6.6 Game states still to draw (built patterns, no new parts)

| State | Built pattern |
|---|---|
| Daylight "Pick your light" intro | 6.2 with the three-marker control and the suggested line |
| "Add a minute" | Daylight footer button (6.3 item 9) |
| Daylight end, "This is where time went" | `headline` plus the Last 5 rounds card pattern for the time bars |
| Signpost step 2, the word marked, its coaching line | step squares (6.3 item 5), the marked word underlined in ink, the line `aside` |
| Root or Rumor reveal with "Read the note" | the answer card plus a Go deeper row (PHASE4 4.2 item 6) |
| Forecast "How scoring works" open | a closed disclosure row, `small` text inside |
| Term Match Heartwood recall and "First-try matches" | the match board, one column at 1.3; first-try count in `meta` |
| Stepping Stones "Perfect path", the Heartwood missing step, step notes, "Open the lesson" | numbered step rows (`--r-step` squares), notes `small`, "Open the lesson" a Go deeper row |
| "The other drills open after 50 practice questions." | Drills card row (6.1) |
| Recap with a badge and no level change | 6.5 item 6 |
| Field notes (You, drill levels) | a pushed list page: `display` "Field notes", one row per game (`label` name, `meta` level), the three-marker control in each row |

---

## 7. Screens still to draw, and where they are specified

| Screen (from the decisions' "still to draw") | Spec |
|---|---|
| Exam eve and exam day on Your plant | 4.7 |
| The quiet "Your plant grew" line | 4.1 item 5, 4.6 |
| Daily signals (first flower, part marks, undergrowth) | 4.1, last paragraph |
| First set "Kai is planted" with "Choose a different plant" | 4.9 |
| Picker modes: Change plant, Rename, Another idea, Today-origin Not now | 4.3 |
| Settings "Badges and your plant" | 4.11 |
| Android widget | 4.10 |
| Elder leaf drift and Storybook with a face on the soil line | 4.5 |
| Your plant, Look and Pick at 200% text and 320 width | 4.1 to 4.3 and section 10 checks |
| Web "Plant a companion" invite, study-rail plant, Glossary plant figure | 4.12 |
| Turning prototype at real timings | Replaced by the device build: a screen recording of the Turning and the leaf fill at real timings goes to Sky with the first plant handoff |
| Drills rarer states | 6.6 |
| Badges after-exam album, earned-sheet vignette | 5.5, 5.3 |

---

## 8. Motion summary

All motion is opacity and transform only, written as `motion` tokens (phone `theme/tokens.ts` values are read, not changed; new values go in the component or `theme/grove.ts`) and as CSS custom properties on the web. Any tap or scroll skips a celebration to its end. Reduce Motion always shows the end state with the same words and haptics.

| Moment | Full | Reduce Motion end state |
|---|---|---|
| Turning (phone) | 2400 / 3000 / 3600 ms, 4.4 | 120 ms cross-fade to the new form, fact, name and filled leaf; one announcement |
| Turning (web) | 560 ms, 4.12 | end state at once |
| Stem leaf fill | 300 ms phone, 200 ms web | filled |
| Planting (`plantIn`) | 820 ms | the planted sprout |
| Breathing, day's first look (happy 600, curious 900, proud 600) | as today | still |
| Elder leaf drift | at most 8 leaves, once | none |
| Look preview change | 160 ms cross-fade | instant |
| Earlier growth disclosure | 200 ms height and opacity, chevron turns | static |
| Badge press | 1080 ms, 5.4 | taped tile at once, block 120 ms fade |
| Repeat badge moment | 200 ms cross-fade | same |
| Drill right answer | about 600 ms: press 0.98 (120); options fade 0 to 120 while the verdict leaf springs from 0.6 at 120 (`spring.pop`); answer card from 200, rows 30 ms apart (no empty frame over about 80 ms); twig leaf fills as a stacked layer (opacity, scale 0.85 to 1, 160 ms, no overshoot); the score rolls up over 300 ms (drops set at once); one success haptic | frame 5 at once (120 ms cross-fade at most), same haptic |
| Drill miss | nothing animates | same |
| Recap score roll | 300 ms from blank | the number |
| Level-up | under 1.2 s: recap fades in, score rolls, then only the level marker cross-fades with the TierLeafMorph spring (`growAt` = celebrate minus LEAF_SETTLE_MS); one light haptic; one spoken line ("Score 8 out of 10. You've grown to Sapling. Your next round starts there.") | end state, same line and haptic |
| Daylight pace bar | steps once a second, no tween; announces at start, Pause and when the light sets | same |

The session limits stay: one full moment per app session, `celebrate.sessionMs` 3000 of decorative motion, a kind of moment in full its first three times. A Turning claims the session's one moment.

---

## 9. Short text (Sky's rule, for 4b lines)

New and changed interface lines in 4b, checked against the rule. Engine game copy (step names, level lines, end notes, coach lines) and saved facts stay word for word.

| Where | Line |
|---|---|
| Your plant footnote 1 (was "'Know the outline' counts: subtopics you've answered right, without a hint, on two different days, weighted like the exam.") | "Know the outline: topics right without a hint, on two days." |
| Your plant footnote 2 (was "Only real progress grows it: never taps, minutes, streaks or games. It never shrinks.") | "Only real progress grows it, never taps, time or games. It never shrinks." |
| Look line | "A look is just for you: it never changes your growth." |
| State lines | 4.7, each one sentence |
| First set | "Kai is planted." / "It grows as you learn." |
| Settings group lines | "Hidden everywhere when off." |
| Badges head | "Every set counts on its own." / "Earned by what you've mastered. Once earned, a badge stays." |
| Planter line | "Completing Groundwork adds the terracotta pot to your plant's looks." / "The terracotta pot is in Look." |
| Web badges | "Labelled the day you earn them." / "Nothing here yet" / "Badges are earned in the phone app for now." (built) |
| Web Today plant row | "How it has grown" |
| Turning waiting | "See Kai's new form" / "It plays when you tap." |
| Drill hint | "A snare is a wrong option built to look right." |
| Call It First | "The options open once you name the principle." |

Nothing is said twice on a screen: the growth count shows once per screen (hero or chip), the honesty lines ("A study estimate, not a prediction.") stay where they are.

---

## 10. Web and phone

| | Phone | Website |
|---|---|---|
| Your plant page | 4.1 | `#plant`, 4.12 |
| Stem with facts and dates | yes | yes |
| Forms and form names | yes | yes (Sky, item 1) |
| Turning | full, with waiting state | 560 ms, no waiting state |
| Look | its own screen with sticky preview | inline on `#plant` under the sticky plant bed |
| Pick, Change plant, Rename | screens (4.3) | today's dialogs, with A's grid |
| Six-growth strip | not on You | on You's plant card, real art |
| Today | plant in the ring, row to Your plant | plant in the ring, row to `#plant`, invite as built |
| Widget | yes (Android) | none |
| Settings plant group | yes (4.11) | the web's existing plant settings stay where they are |
| Badges | case, sheets, press, album, share | Web A disc only: waiting shapes, "Nothing here yet", the app link |
| Drills | everything in section 6 | none; nothing new is added about drills (O5 later). "Weak spots drill" stays as built |

---

## 11. Data, bundles and what must not change

- **No engine or data change.** Every value is read from saved fields: growth, reached dates, grew facts and `FORM_FACTS`, keepsakes and their badge dates, `passedOn`, game rounds and levels, `sparkPoints`. Where a value is missing, the screen shows less, never a guess. No new saved field is needed; if one turns out to be, it goes beside the old ones and to review first.
- **The bundle rebuild.** The copy fixes in 3.1, 3.3 and 3.4 live in `engine/plant.ts` and `engine/plantLooks.ts`, which are bundled into the website (`mobile/scripts/web-plant-bundle.cjs` `ENTRIES`). Make them in one commit that rebuilds `assets/kaisip-*.js` and updates the `?v=` references in `index.html`, so web and phone change together; `npm run check` must pass. Every other phone change in 4b stays out of bundled files (PHASE4 6). The Term Match rename is in `engine/games/registry.ts`; confirm it is not in the bundle graph before editing.
- **Must not change:** scoring, readiness maths, the plant growth rules (`GROWTH_RULES`), the Turning's once-per-form-for-life rule, badge rules and tiers, game scoring and level rules, the celebration limits, `data-l` and the letter mapping, every saved key and export marker, game ids (`field` stays `field`), the medallion art data (kept for history; the share card stops using it), the quiz and mock screens, and every piece of course content.

---

## 12. Build order and checks

1. Wording and the bundle (section 3, 11): the growth word on both builds, the engine copy fixes, the rebuild; `DECISIONS.md` 18.
2. Phone Your plant, Look, Pick and the Turning (4.1 to 4.9); then the widget and Settings group (4.10, 4.11).
3. Web `#plant`, You card strip, Today row and the 560 ms Turning (4.12).
4. Phone badges (5.1 to 5.6), then the web disc (5.7).
5. Phone drills (section 6).

Checks at each step, as `PHASE4.md` 11:

- Screenshots: phone 320, 375 and 390pt at text scale 1, 1.3 and 2; web 390 by 844 and 1280 by 900 at 100% and 200% text; light and dark; one demo dataset (F19). Phone shots go to Sky at each handoff (`npm run shots`), with the Turning recording at the plant handoff.
- Contrast: text 4.5:1 (3:1 for display, hero, numerals 30 and up); marks that carry meaning 3:1: reached stem `--accent` 5.4 / 8.9; `--leaf-line` 3.94 / 3.31; `--control` 3.65 / 3.13; mint on forest 10.3. Decorative only, recorded: `--soil`, `silGold` 2.3:1, the tape.
- Targets 44px web, 48pt phone; no sideways scroll at 320 with 200% text; nothing clipped.
- Screen readers: the stem as a list, the twig as one element, one announcement per moment, focus to the title or verdict.
- Reduce Motion: every row of section 8.
- Gates: `bash scripts/verify_repo.sh`, `(cd mobile && npm run check)`, `cisa-ux-reviewer`, `mobile-ux-reviewer`, `mobile-motion-designer` (section 8), then `smoke-tester`. Before drills build, `behavioral-scientist` confirms the tone of the two-half line and "1 of 2 strong rounds toward Sapling" (drills decision, wording calls).
- Text sweep before each commit: no em or en dashes, no banned words or book labels in learner text, no total question count, no "stage" for the plant.
- Release: the web version bump and What's New wait for the end of the uplift (DECISIONS 8); the phone bumps `expo.version` with its release. Draft line: "Your plant now shows how it has grown, badges are pressed like keepsakes, and drills have a calmer look."
