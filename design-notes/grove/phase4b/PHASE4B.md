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
| Badges | **The pressed paper tile**: the press replaces the medallion strike; "Sheet I" becomes "set"; each set ends with its planter line; the after-exam album opens with the plant; Keepsake Trail's two grafts | **Web A. The disc**: three empty mounts, "Nothing here yet", badges are earned in the phone app |
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
| F3 | Title roles | Several big Fraunces lines per screen ("Kai" at 40, "Crown" at 28, set titles in Fraunces) | `TYPE_SCALE` R3: one `display` per page (on Your plant the plant's name, with the kicker "Your oak" over it; with no name, no kicker and the title "Your oak"), at most one `hero` per view (sheet titles, the verdict, the Turning's form name stays `title`), card titles `title` 22 |
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

### 2.1 Token names for the phone build

This file writes tokens in the web's names. On the phone, use these:

| Web name in this file | Phone |
|---|---|
| `--btn-hero` | `c.sap` |
| `--hero-leaf-line` | `heroInk[theme].dotEdge` (`theme/grove.ts`) |
| `--on-forest2` | `c.onForest2` |
| `--forest-track` | `c.forestTrack` |
| `--border` | `c.line` |
| `--text2` | `c.ink2` |
| `--surface2` | `c.soft` |
| `--leaf-line` | `g.leafLine` |
| `--soil` | `g.soil` |
| `--control` | `c.control` |
| `--accent` | `c.accent` |
| `groveTile` | from `components/ui` |

Buttons stay `grovePlate.button`, 54pt. 48pt is the floor for a target, not the size of a button.

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
| `how` (231) | "Tell us you passed" | "Tell us you got the score you needed" |
| howToOpen (391) | "Opens when you tell us you passed." | "Opens when you tell us you got the score you needed." |
| `caption` (231) | "The ribbon: you told us you passed." | "The ribbon: you got the score you needed." |

The ribbon opens only on a reported pass (`plantLooks.ts:299`), so the words name that, honestly, without the word "pass". "Your exam result" would promise it opens for any result, which it does not.

When the self-reported result flow is built later, its own words follow the same rule (for example "I got the score I needed"), never "pass". A learner who reports that they did not get the score they needed must never meet a locked reward in that flow (Sky to confirm when it is built).

In Look, the ribbon row stays out of "More to find" until the exam date has passed, so no reward tied to the result is in view while the learner is still preparing.

### 3.4 Other copy fixes from the decisions

| Where | Was | Now |
|---|---|---|
| Rest line (`engine/plant.ts:1203`, `app/plant.tsx:149`, and on the web the fallbacks at `index.html:19417` and `19495`) | "... Pick up whenever you're ready." | "... Pick up whenever you like." |
| Set keepsake howToOpen (`plantLooks.ts:389`) | "... set in the Herbarium." | "Opens when you finish the {set} set in Badges." |
| Stem date | "Now, since 3 Nov" | "Now · reached 3 Nov" |
| Badge set head | "Sheet I · Groundwork · 2 of 3 pressed" | "Groundwork" (`headline`) with "2 of 3 pressed" (`meta`) |
| Badges italic line | "Every sheet counts on its own; there's no ..." | "Every set counts on its own." |
| Badge dates | "Earned 2 Nov" and "Pressed 4 Nov" mixed | "Pressed 4 Nov" on tiles and sheets (spoken "Earned 4 Nov"); quiet back-fills keep "By 11 Oct" |
| Results button (learning-game mockups) | "Practise the ones you missed" | "Practice the ones you missed" |
| Drills step copy | (mockups paraphrase it) | the engine strings, word for word: "Step 1: tap the snare" and "Step 2: tap the BEST answer" (`app/game/trap.tsx:167`), "Step 2: pick the BEST answer" (`app/game/callit.tsx:240`). No graft rewrites game copy. ("enough content" is a code comment at `registry.ts:213`, not learner text, so it is not changed.) |
| Game name | "Field Guide" | "Term Match" (visible name only): `engine/games/registry.ts:150` and the report title `app/reports.tsx:40` (`kt: 'Term Match'`). Both in the step 1 bundle commit (section 11). The What's New history in `content/support` stays as shipped |
| Planter line examples | "terracotta pot" | built from data (5.1 item 5); for Groundwork it is the fieldstone planter (`plantLooks.ts:182`; the terracotta pot is free, `plantLooks.ts:181`) |
| "Badge sheet" | a learner-facing name | internal only |

---

## 4. Your plant

### 4.1 Phone: Your plant (`app/plant.tsx`)

Order, top to bottom. One column at every text size.

1. **Back row** "You" (F2).
2. **The plant on the page.** No card and no disc: the real art drawn on a `--soil` ground line across the full width, on the page background. The planter, keepsakes and visitor stand on the line. Art height steps with growth: about 180pt at Seed and Sprout, 240pt at Shoot, 300pt from Bough (capped by the width; at text scale 1.3 and up it stays at the step below, never taller than 40% of the screen). Breathing as today (once per session, You and Your plant only).
3. **State tag** beside the art's foot, only when one applies: "Plan cleared", "Resting" or "Exam day". Exam eve has no tag, because its line already starts "Rest day." (4.7). A static tag: `caption` in `--text2` on `--surface2`, radius `--r-step`, not a control, no edge. The art never carries a state alone (no window light, no dawn wash).
4. **Name block:** `kicker` "Your oak" (the species, lower case in source), the name in `display` ("Kai"). With no name, drop the kicker: the `display` title is "Your oak" (what `plantCallName` returns), never said twice. Then the form name in `quote` italic ("The Standard Oak") when there is one, else "Bough · growth 4 of 6" in `meta`. Then the form's one line in `small` `--text2`, then the visitor line (wren glyph and "A wren came by: you cleared today's plan.") in `meta`. The look line "A look is just for you: it never changes your growth." sits under Look (item 10), not here.
5. **The quiet grew line**, on the first visit after a growth that brings no new form: one `aside` line "Kai grew to Bough." above the stem, and the Bough leaf fills (4.6). Shown once (saved as seen, as `pending` is today). Today's grew line uses the same saved growth mark and clears it (`home.tsx:295-318`), so whichever screen shows the growth first uses it up; the other shows the leaf already filled, with no grew line and no haptic. One celebration per moment.
6. **How it has grown** (`headline`), with "Planted 27 Oct" in `meta` beside it. The stem:
   - One vertical line on the left, 2pt. Reached part `--accent` (5.41:1 light, 8.87:1 dark on the page); the part still to come dashed `--leaf-line` (3.49 light, 3.90 dark on the page; the stem sits on the page, not a card).
   - Order: Seed at the top, Elder at the bottom.
   - One row per growth: a leaf mark on the line, then `label` (the growth name) over `meta` ("reached 28 Oct", and "· grew into the Whip Oak" when that growth brought a form). Under it, in `small` `--text2`, the fact that earned it, word for word, from constants (the phone saves no per-growth fact; `CertPlant`, `engine/plant.ts:419-440`, keeps only `reached` times, `plantedAt` and `backfill`). On the rows where a form starts (3, 4, 6), and only when `view.forms` is true: `FORM_FACTS[g]` (`plant.ts:239`). On Sprout (2) and Crown (5): the web's `todayGrewFact` lines, word for word ("It grew from your first {SPROUT_ANSWERS} answers." / "You finished a mock of {CROWN_MOCK} questions or more."), held as constants in an unbundled phone file that reads the numbers from the engine, so web and phone show the same words (4.12). Seed shows no fact line, and with forms off rows 3, 4 and 6 show none. Never `GROWTH_RULES` (present-tense rules would read as orders, not as what earned the leaf). No engine change. A 56pt `groveTile` with the form's art at the right, only on rows that brought a form.
   - Leaf marks differ by shape as well as colour: reached = filled `--accent` leaf; now = filled leaf inside a 2pt `--accent` ring (the "Now" row also says "Now · reached 3 Nov"); later = dashed `--leaf-line` outline.
   - Dates only on reached leaves, from saved fields. A reached growth with no saved date (an older plant) shows no date, never a guessed one. No gaps, ranges or "days since".
   - **Keepsakes** sit on the stem as small dated leaves between growths, with their badge skill line word for word ("Pressed 4 Nov · Long Memory"), when the learner shows that keepsake.
   - **Earlier growth:** once the stem has more than 8 leaves, the leaves older than the current form fold under a closed "Earlier growth" disclosure row (48pt, chevron, the built disclosure motion). Now and Next always stay open.
   - Screen readers: the stem is a list; each row is one stop ("Shoot, reached 31 Oct, grew into the Whip Oak. {fact}"); the now row starts with "Now". Phone: no faked list position (as PHASE4 4.3).
7. **What grows it next**: the screen's one forest panel, on the stem's next row (the stem line runs beside it). `HeroCard` pattern: `kicker` "Next" in `--on-forest2`, the next growth's name in `title` ("Crown"), then one row per gate: the gate in `small` ("Your study estimate, without hints or games, reaches 65%", from `nextGrowthSteps(g, f, { forms: true })`, never readiness wording beside a form), its value in `num.inline` with raised % ("94%"), a 6pt bar in `--btn-hero` on `--forest-track`; a gate not started reads "Not yet" in `meta`. Under the gates, the two footnotes in `meta` `--on-forest2` (section 9 trims them). Hidden at Elder (the Elder row says "Fully grown. It keeps all of its growth."), on exam eve and on exam day.
8. **Later growths** after the panel: dashed leaves with `label` name and `meta` line ("Grows into the Broadcrown Oak at Elder.").
9. **Your domains** (`headline`, with "One part of the plant each" in `meta`): one row per area in the built area-dot style, the DI short name in `label`, "72% · lush" with the % as `num.inline`; the area the plant needs next carries the built "Next" pill (F10) with the word "Next to grow".
10. **Look** (`headline`), the line "A look is just for you: it never changes your growth." in `meta`, then three rows (F8): at Elder, first the row "Its final form" ("Now: the {form}. You choose.", as built at `plant.tsx:266-269`, opens Look) so the final form keeps its entry point; then Change its look ("Its style, colours and keepsakes"), Change plant ("Same growth, new look."), Rename ("Now: Kai"). Then a "Plant settings" text link (`label`, `--accent-text`, 48pt) to Settings' plant group (4.11).

Daily signals stay the engine's own drawing (first flower, part marks, undergrowth). Each one that carries meaning is also said in words in Your domains ("lush", "full"); none is new art.

### 4.2 Phone: Look (`app/plant-look.tsx`)

1. Back row "Your plant", `display` "Look".
2. **Sticky preview**, 160pt: the plant on its soil line at the top, under the back row; every change previews here in place. 120pt from text scale 1.3. At text scale 1.6 and up, or on a screen shorter than 700pt, it is 72pt and not sticky, so text never sits under it (keeps UX P9 as built, `plant-look.tsx:59-62`).
3. One column of rows, in this order, each with a `headline` group head: Style, Colour, Ground, Planter, Visitor, then Final form (only at Elder), then Keepsakes.
   - Style, Colour, Ground, Planter, Visitor and Final form are **radio rows**: a 48pt art thumbnail, `label` name over `meta` caption (Botanical: "A fine line drawing, like a botanist's sketch."; Storybook: "Rounded and colourful."; Storybook with a face: "A friendly face that shows its mood."), the radio mark at the right (filled ink dot when chosen, F9). Spoken "Botanical, A fine line drawing, like a botanist's sketch, selected", inside the radiogroup (the built `plant-look.tsx:133` already sets the group role). No faked list position (4.1 item 6).
   - Keepsakes are **checkbox rows**. The Section meta "Show up to three" / "Three on show" (`plant-look.tsx:256`) is the only place the limit is said. With three shown, the other rows are disabled and say just their caption, with `accessibilityState {disabled: true}` and the hint "Put one away to show this".
   - An item not open yet: its thumbnail as a dashed `--leaf-line` mount, the row disabled, its howToOpen line in `meta` (section 3). "More to find" stays one collapsed disclosure, as today. The ribbon row is not in it until the exam date has passed (3.3).
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

**Rename** is the spotlight, the name field and the sticky bar, with no grid (as built, `plant-pick.tsx:94`, `mode !== 'name'`). Keep the built keyboard handling (`useKeyboardShown`, `KeyboardAvoidingView`) so the stacked sticky bar never covers the field at text scale 1.3 and up.

1. **Spotlight:** the chosen species drawn on the soil line (paper, not a forest card), its name in `title` and its line in `aside`. 160pt art; 120pt from text scale 1.3.
2. **Name it** (New and Rename): the built text field (48pt, `--r-tile`), with "Another idea" as a text button (48pt) that suggests a name, as today. The field sits right under the spotlight so it is on the first or second screen.
3. **The grid:** all 13 species at Crown, 3 columns of `groveTile`s (art plus `label` name). Selected = the built selected look (F9). 2 columns from text scale 1.3 or under 360pt; from text scale 2, one column of rows (56pt art, name). Arrow order equals reading order.
4. **Sticky bar:** the main button (solid `--btn`, `button` 17) and the second button (ghost, `label` 16), each 48pt, in a bottom bar; stacked from text scale 1.3.
5. "Plant it" plays `plantIn` (820 ms) on Your plant only for a plant started from You or Today. The first set plants an oak at once and plays `plantIn` on its own closing screen (4.9); Pick is not in front of it.

### 4.4 Phone: the Turning and its waiting state

When a growth brings a new form, the Turning owns the visit; nothing else celebrates (no grew line, no badge moment, no leaf fill outside it).

- **Waiting state** (A): only when the session's one moment is already spent (as built in `FormReveal.tsx`); otherwise the Turning plays on arrival, as on the web. In the waiting state, on Your plant with a form pending, the art shows the old form, still. Under it the solid main button "See Kai's new form" and `meta` "It plays when you tap." The rest of the page is below as usual. A tapped Turning always plays in full. The waiting label is the built `seeNewFormLabel`.
- **Frame layout** (A): the fact that earned the form (`FORM_FACTS[g]`, 4.1 item 6) is on screen from 0 ms, above the art (`small`, `--text2`, word for word). The art is centred on the soil line. Under it the label: a 1px `--text2` rule from the plant side, `kicker` "New form", the form name in `title`.
- **Timeline** (medium form, 3000 ms; the tokens in `motion.turn` are kept): gather 180 to 900 (the light gathers, the old form inhales); five even half-swaps 900 to 2220 (about 264 ms each, 60% cross-fade, `turnLook.evenPace`); bloom 2220 to 2560 (the light lifts, the new form settles 0.97 to 1); the label rule scales in from the plant side 2500 to 2740; the form name fades in 2600 to 3000; the matching stem leaf fills once at `nameAt` (2500 to 2800, 4.6), never during the swaps. Small (2400 ms) and grand (3600 ms) shift by their own `nameAt` (1900, 3100); the halo is grand only.
- **Flash rate:** at most 2 flash pairs a second (264 ms half-swaps, `swapFloor` 200). Write this in the motion spec beside `motion.turn`.
- **Gold on paper:** `silGold` #C99A3A is 2.3:1 on the light page. It is decorative: the fact and the form name carry the moment. Record this in the motion spec.
- One success haptic at the bloom. Any tap or scroll after `playGuard` (400 ms) skips to the end (`skip` 120 ms). One spoken line at the end, the engine's `newFormLine` as built (`plantForms.ts:338`): "Kai grows into a new form: the Standard Oak."
- **Reduce Motion and screen readers:** no waiting button; the end state shows at once (`turnReduced` 120 ms cross-fade), the fact, the name and the filled leaf in place, and the one announcement.

### 4.5 Phone: Elder and the final form

At Elder the Look screen adds the Final form group (radio rows, with the sticky preview, 4.2). On the visit Elder is reached, the Turning plays (grand), then at most 8 leaves drift once down the art's own column (`celebrate.leaves`), never over words; Reduce Motion shows no drift. "Storybook with a face" stands on the same soil line as the other styles (no frame, no disc). Your plant at Elder: no forest panel; the Elder row reads "Fully grown. It keeps all of its growth."

### 4.6 Phone: the stem leaf fill

A growth reached on this visit (no new form): its leaf fills once, opacity 0 to 1 and scale 0.85 to 1, 300 ms (`dur.fill`), no overshoot; the stem's accent part extends with it (opacity only). One light haptic. Spoken with the grew line. Inside the Turning it plays at `nameAt` (4.4). Reduce Motion: filled at once. If Today showed the growth first, the saved growth mark is used up: the leaf is already filled, with no fill, no grew line and no haptic (4.1 item 5).

### 4.7 Phone: states

Each state keeps its words; on paper a state is a tag (4.1 item 3) and one `small` line under the name block, never a coloured alert and never a rule.

| State | Tag | Line |
|---|---|---|
| Resting | "Resting" | "Kai is resting. Pick up whenever you like." (a small moon on the art, never a wilt) |
| Back after 7 days or more | "Resting" | "Kai kept your place. Pick up where you left off." |
| Plan cleared | "Plan cleared" | the visitor line (4.1 item 4) |
| Exam eve | none (the line already starts "Rest day.") | "Rest day. Sleep and time off help memory settle." (`EXAM_REST_LINES.eve`, as built). What grows it next is hidden |
| Exam day | "Exam day" | "Good luck. You've done the work." What grows it next is hidden |
| Back-fill, once | none | "Your study so far grew Kai to Bough." (`backfillLine`, `plant.ts:1240`) alone, then the stem. On paper there is no `PlantNote` caption: drop the built caption "From your study so far" (`plant.tsx:215`), which says the same thing twice |
| New: forms (a plant past Form I when forms arrived) | none | "Your study so far brought Kai to the Standard Oak." once |
| Nothing planted | none | `title` "Nothing planted yet", `small` "It grows only from real progress, and never wilts.", main button "Plant yours" |
| Show my plant off | none | `title` "Your plant is hidden", `small` "Its growth is kept. Turn on Show my plant in Settings.", button "Open Settings" |

### 4.8 Phone: Today and You

- **Today:** unchanged apart from the word (3.2). Today's grew line and Your plant's grew line share one saved growth mark: whichever shows the growth first uses it up (4.1 item 5). The plant stays in the ring disc only; the plant row under the hero keeps its line ("Kai grows with your study." as built) and opens Your plant. No thumbnail, no sap ring. The grew line and the Turning do not play on Today; Today's existing "Kai grew to Shoot." line and fact stay (DECISIONS 11).
- **You:** the built forest plant card (PHASE4 7.14 item 3) with "Kai · Shoot · growth 3 of 6 · never wilts", chevron to Your plant. No strip added on the phone You (the stem on Your plant carries the growths).

### 4.9 Phone: first set, "Kai is planted"

The first set's closing screen (`components/firstSet.tsx`) keeps its invitation ("Want a plant that grows as you learn? It's optional." with "Plant a seed" and "Maybe later"). After "Plant a seed" (an oak, planted at once as built, `firstSet.tsx:12-13` and `506`), the closing screen plays `plantIn` on the soil line: the seed settles and the sprout pops (820 ms, 0 seed above the soil, 400 settled, 650 sprout pops, 820 planted), then `title` "{Name} is planted." and `small` "It grows as you learn." with a text button "Choose a different plant" (48pt, opens Pick in Change plant mode, as built at `firstSet.tsx:420`). No Pick step in front. Reduce Motion: the planted sprout at once.

### 4.10 Phone: Android home-screen widget

The built widget (`engine/widgets.ts`, `widgets/layouts.android.tsx`) restyled to paper: the plant on its soil line, always awake (no resting moon), no face (a face style draws as Storybook), static (no motion). Name in serif (E6, at least 13), "Growth 3 · Shoot" under it, or "Kai · Bough" and the form name once a form exists. Spoken "Your oak, at growth 4, bough. Standard Oak form." (as built). Tap opens Your plant. Light and dark follow the launcher. No count of questions, no readiness number.

### 4.11 Phone: Settings, "Badges and your plant"

As built (`settings.tsx:553-586` and `702`): Show badges, Show my plant, Change its look (shown while the plant is on). Copy trims only. Rows and switches 48pt, `label` over `meta`; each setting keeps its saved key and behaviour.

- Show badges: "Off: earned quietly." (the built meaning: badges are still earned, and turning it back on reports what arrived, `lib/badges.ts:152-174`).

There is no "Quiet look" switch: it was removed in mobile 1.40 and replaced by Look's Style choice (`settings.tsx:582-584`, `plant-look.tsx:5-6`); adding it back would clash with Storybook with a face.

### 4.12 Website: Your plant (Web B, The line, with Web A's dialogs)

Most of this is built from what `index.html` already has (the tokens, the dialogs, the nav: `NAV_HASH` has room for `#plant`, `plantOpen` and the `changelogModal` dialog manager, and `fgEmptyPlate` already says "Nothing here yet"). It needs one new saved field first (11.1); that goes to review before the web build starts.

- **Where:** a new sub-page of You at `#plant` (as `#settings`), opened from You's plant card, Today's plant row and the study rail. The page bar's back link is "You"; the phone tab bar marks You while it is open. Focus lands on the page title.
- **Name block:** as 4.1 item 4. With no name, drop the kicker: the display title is "Your oak" (`plantCallName`), never "Your oak" over "Your oak".
- **Layout from 48em:** two columns. Left, a plant bed (the art on its soil line, sized as 4.1 item 2 in px, the name block and state tag under it). The bed is sticky only with `@media (min-width:48em) and (min-height:40em)`; the art is at most 40vh, and the bed never runs taller than the viewport minus the header and page bar, so a laptop at 150% zoom (853 by 600 CSS px) can always reach its bottom. Right, How it has grown with the stem (4.1 item 6), What grows it next as the one forest panel, Your domains, then **Look inline** (the radio and checkbox rows of 4.2; from 48em the bed is the preview). Under 48em: one column in the phone's order, and the Look group starts with its own 120px preview of the plant on its soil line (the existing `#plLookPrev` pattern), sticky only when the viewport is at least 40em tall, so a tap on a Look row always changes something in view. Under two screens tall at 1280 by 900 for a learner at Bough.
- **Web Look has no Final form group.** On the phone the Form IV choice is saved only on the phone (`seen.ts` `plantFinal`, staged rollout), and the web has nowhere to save it. An Elder plant on the web draws its own form (`resolveFinal` own).
- **What grows it next** calls `K.plant.nextGrowthSteps(g, f, { forms: true })` (today `index.html:19516` calls it without options, which gives "The low end of your readiness, without hints or games"), so the gates read "Your study estimate ...", as in 4.1 item 7. No readiness wording beside a form.
- **Stem facts on the web:** `FORM_FACTS` for growth 3, 4 and 6, and `todayGrewFact` (`index.html:15538`) for growth 2 and 5, word for word. A form growth shows the `FORM_FACTS` line on both the stem and the Turning. The phone uses the same split (4.1 item 6), so the two builds show the same words. The web stem shows no keepsake leaves: the web has no badge dates.
- **Web states:** Resting, Back after 7 days, Rest day (exam eve, no tag, 4.7), Exam day, Back-fill, Forms note, Nothing planted (its "Plant yours" button opens today's dialog). There is no Plan cleared tag and no visitor line: the web has no day plan (`index.html:18938` to `18939` and `19260`). The web has no Show my plant setting in its own UI; if `showPlant: false` arrives in a backup (`index.html:24235`), `#plant` shows the 4.7 "Your plant is hidden" state without an Open Settings button.
- **Dialogs stay:** Plant yours, Change plant and Rename open today's dialogs (`plantOpen`, `changelogModal`). Only Look is inline. The pick grid in the dialogs is A's grid (4.3): native radio checked plus the F9 ink edge and tick. In Change plant mode the planted species shows the visible word "Now", which is also read aloud. Grid columns in em (for example `repeat(auto-fill, minmax(7.5em, 1fr))`), so 320px at 200% text gives 2 columns and then 1, matching the phone's 1.3 and 2 text-scale steps.
- **Weak spots drill** stays in Review and saved on Practice (it is not moved to this page).
- **You plant card:** keeps the built forest card, its name line in the growth wording (3.2), "Grows only from real progress, never wilts." and the six-growth strip, now drawn with the real species art for reached growths (`plantSvg`) and quiet dashed squares for later ones in `--hero-leaf-line` on the forest card (4.16:1), never future forms. Add `--leaf-line: var(--hero-leaf-line)` to `.you-plant` (`index.html:7832`), as `.td-hero` and `.td-fig` already do (`index.html:8044`); plain `--leaf-line` there would be 2.56:1 light and 2.34:1 dark, under the 3:1 floor. Move the hex literals in `.you-stg.done` and `.you-stg.locked` (`index.html:7854` and `7856`) onto tokens at the same time. In the strip, the now growth keeps `aria-current="step"`, as built (`index.html:19482`). Its "Look, plant and name" disclosure becomes one row, "Your plant" ("How it has grown"), to `#plant`, where all three actions now live. The Pick your plant state stays. The growth count shows once per screen: below 1240px the You chip carries "growth 3 of 6" and the card line drops it; from 1240px the card line keeps it and the chip's count stays hidden, as `.you-chip-dup` already does.
- **Today:** the plant row keeps its place and leaf glyph; its line becomes "How it has grown" and it opens `#plant`. Its aria-label (`index.html:19352`, "Opens your plant on You.") becomes "Opens Your plant." The "Plant a companion" invite stays as built ("Plant yours", "No thanks").
- **Study rail** and the **Glossary plant figure:** unchanged (PHASE4 8). `plantRailSections` and the `plantYouHtml('rail')` branch (`index.html:19386` to `19450` and `19546`) are not called from `railSync`, and once Look is inline the `plantOpen('look')` mode has no caller: remove them in the 4.12 build.
- **Web Turning (560 ms, under the web 600 ms cap),** in the phone's order: the fact is in place at 0; the gather wash 0 to 140 (opacity); the old form cross-fades to the new 140 to 320 (one cross-fade, no swaps); settle 320 to 420 (scale 0.97 to 1); the label rule scales in and the form name fades in 400 to 520; the stem leaf fills 420 to 560. It plays only on `#plant`, on the first visit with a form not yet shown (`S.plantForms`, 11.1); the You card simply shows the new form. No waiting button on the web. When it plays, the form is saved as shown. One `role="status"` line, the engine's `newFormLine`: "Kai grows into a new form: the Standard Oak." The live region is in the page before its text is set. Reduce Motion: the end state at once.
- **Web leaf fill:** 200 ms, opacity and scale 0.85 to 1.

---

## 5. Badges

### 5.1 Phone: the case (You, Badges; `app/milestones.tsx`)

1. Back row "You", `display` "Badges", `aside` "Every set counts on its own.", `meta` "Earned by what you've mastered. Once earned, a badge stays." The route keeps its name, so links from Results still work.
2. **New in your badges** panel and its line, once (as today), as a plain card.
3. The one-time catalogue line (the new tiers and Took Root their study already earned), once.
4. Filters All, Earned, Not yet (built chips, F9) and Sort (by set, recently earned, closest, effort), kept on the phone.
5. **One card per set**, in journey order. Head: the set name in `headline`, "2 of 3 pressed" in `meta` beside it. Then the tiles in rows, as built (`milestones.tsx:244-247`): 3 across, 2 from text scale 1.3, and from text scale 2 one column of rows (the tile at 56pt with its words beside it). Tile size = min(84, cell width - 12), never larger on dark (the card's inner width is 256, 311 and 326pt at 320, 375 and 390, so four across does not fit). Each tile has its name in `meta` under it and "Pressed 4 Nov" (earned) or the closeness ("31 of 75 remembered") under that. "Study for this" as a text link on a not-yet tile's row. Then **the planter line** as the set's last row: the planter drawn small (40pt) in the plant's own style, and a `small` line built from data. Take the planter item whose unlock is `{kind: 'set', set}` in `plantersFor(species)` and write `` `Completing ${SET_NAMES[set]} adds the ${item.name.toLowerCase()} to your plant's looks.` ``; once the set is complete, `` `The ${item.name.toLowerCase()} is in Look.` `` For Groundwork: "Completing Groundwork adds the fieldstone planter to your plant's looks." / "The fieldstone planter is in Look." (`plantLooks.ts:182`; the terracotta pot is free, `plantLooks.ts:181`). `SET_NAMES` is module-local in `plantLooks.ts` today: export it, unchanged, in the step 1 bundle commit. Leave the line out when that species has no planter for the set. No planter line on Moments or Field notes. Hidden when Show my plant is off.
6. **Ladders and tiers:** Clay, Lichen and Gold leaf as three tiles in a row, the reached ones pressed. "Stretch · beyond exam need" stays its own row under each ladder.
7. **Domain emblems:** the five domain badges keep their emblem, area dot and "% of the exam" line.
8. Moments (not counted) and Field notes (counted on their own) follow, as today. Never a total across sets, never a count of the question bank.

### 5.2 The pressed tile

- **Earned:** a cream paper tile (`g.specimen`, the same cream in both themes, like the plant's paper), the real emblem in its botanical inks, two tape strips (`specimenTape`) at opposite corners. Radius `--r-tile`. The tape is decoration only: the earned state is in words ("Pressed 4 Nov") and in the spoken label ("Long Memory, Evergreen, clay tier, earned 4 Nov").
- **Not yet:** a pencilled dashed mount, 1.5pt `c.control` as built (`HerbariumSheet.tsx:125`, `Specimen.tsx:86`; 3.65 light, 3.13 dark on the card) with the emblem's faint silhouette; the solid part of the outline, in `--accent`, shows how close (the same value as the words). Spoken "Not yet, 31 of 75 remembered".
- **Took Root** is pressed like every other badge.

### 5.3 The sheet (one badge)

The built sheet (`hero` title per R3). Order: the tile at 120pt; the name in `hero`; tier in `meta` ("Evergreen · Clay, tier 1 of 3"); "Pressed 2 Nov"; the badge's line in `aside`; **the earned-sheet vignette** (Keepsake Trail): the pressed tile beside the learner's plant wearing that badge's keepsake, with `meta` "On your plant: the jay." (only when the badge gives a keepsake and the learner shows it; never on Today); Tiers (5.1 item 6); "The rule" (`headline`) and the exact rule in `small`; how close; "Study for this" (solid, the sheet's one main button, when not yet earned); "Share this badge" (when earned and shareable). No roman number anywhere.

### 5.4 The unlock on Results (the press)

Same words, same place and the same limits as today on the built results screen (F13): `caption` "A new badge · Evergreen", the name in `label`, its line in `small`, "See it in your badges" link, the Next line. Only the tile moves, inside its own 76pt column; the words are there from the first frame.

| ms | Frame |
|---|---|
| 0 | The block is in place, words first. The mount is still pencilled. |
| 120 | A sheet of glassine lays over the mount (opacity 0 to 1, 200 ms); the emblem shows through. The cream specimen is already under it from 120 ms, so in dark the white sheet never lies over the dark pencilled mount as a bright patch. |
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

Your progress (Badges section) and You's Badges card: `headline` "Badges" (`kicker` on You), the built line "Labelled the day you earn them.", then a fixed set of three empty dashed `--leaf-line` mounts, never art (the web has no badge art: no `badgeArt`, no emblem), `aria-hidden`, in one row that wraps. Always three, so the number of mounts never hints at the size of the badge catalogue, and no outlines of badges a web-only learner can never earn (that would pull toward collecting; the app link already says where badges are earned). Then `aside` "Nothing here yet", `meta` "Badges are earned in the phone app for now.", and "Get the KaiSip app" (the existing app link). The link keeps its 44px min-height on You (`.you-badges .td-link`, `index.html:7895`) and gets the same 44px floor on Progress. Never a count. No press, no sheets, no album on the web.

---

## 6. Drills (phone only)

### 6.1 Drills card (Practice) and entry points

The built Drills card (`components/drills.tsx`, p4c `grove-practice-3`): `kicker` "Drills" with the level beside it ("All at Seedling"; once grown, the level leaf glyph before the word), the "From your misses" line, three rows with italic numerals and dotted leaders, each `caption` skill over `label` name and "best 7 · 6 min" in `meta`, then "More drills · 6 more" as a disclosure. The 3-then-unlock line word for word, no count, no lock icon. No glyph badges and no skill numbers on rows. The unlock variant "The other drills open after 50 practice questions." uses the same row. Kept: the Today plan item, the "as Drills" hint on Practice ("The games are here now, as Drills." with "Go to Drills"), "Drills arrive once ...", "This game is on the way", the `/play` redirect (no UI).

### 6.2 Intro

Pushed page: back row "Practice", the game glyph tile (decorative), `display` game name, `small` its line, `meta` "A strong round: 80% or more." (the one place "strong" is defined), "Pick your level" as the three-marker control, Start (solid).

**The three-marker level control** (Seedling, Sapling, Heartwood). It keeps the built picker's job (`components/game.tsx:516` Segmented lets the learner pick any level) and only changes its look:

- Reached: a solid `c.accent` outline with a tick (5.41:1 light, 8.87:1 dark). Current: a `c.btn` fill (forest in light, mint in dark, as the locked dark-mode rule keeps mint) with a `c.onBtn` leaf. Not reached: a dashed `c.control` outline (3.23 light, 3.68 dark on the page). The level name in `caption` under each marker. No hairline `--border` mark (1.21:1 light, 1.38:1 dark fails WCAG 1.4.11) and no forest fill in dark (1.66:1 on the page).
- On Intro it stays a radiogroup: each marker `accessibilityRole 'radio'` with its checked state, 48pt, and the selection shown with the F9 look (2pt ink edge plus a mark).
- On the recap (inside the forest band) it is one accessible element, read as "Level: Sapling. Heartwood not reached.", drawn in the forest tokens: reached a `--btn-hero` outline with a tick, current a `--btn-hero` fill with a forest leaf, not reached a dashed `--hero-leaf-line` outline. Daylight adds "Pick your light" with `meta` "Suggested: ... from your recent answer times."

### 6.3 Round screen

1. **Header** (tab bar hidden): close (X, 48pt), the twig, and the score as `caption` "Score" over a Figtree tabular number (F14), spoken "Score 2".
2. **The twig:** one `--soil` branch (decorative), one leaf per item. Right = filled `--accent` leaf. Missed = solid `--control` outline (3.23 light, 3.68 dark on the page) with its midrib and a small cross notch, never red. Still to come = dashed `--control` outline. The twig is one accessible element: "Question 2 of 5. 1 right, 0 to review."
3. **Fallback** to numbered tick and cross squares (`--r-step` 9, 30pt) at text scale 1.3 and up, and for rounds of more than 8 items (Root or Rumor has 12, `rootOrRumor.ts:40`; Canopy Call 10, `canopyCall.ts:31`). Twelve squares and their gaps are about 400pt, wider than a 320pt header that also holds the 48pt close and the score, so the squares wrap to a second row under the header; or the header shows a Figtree tabular "Question 3 of 12" counter and the squares move to the recap. Never scroll sideways.
4. **Game line:** glyph, name in `label`, `meta` "Beating distractors · 2 of 5".
5. **Step squares** (two-step games), engine copy word for word: "Step 1: tap the snare" and "Step 2: tap the BEST answer" (`app/game/trap.tsx:167`), "Step 2: pick the BEST answer" (`app/game/callit.tsx:240`). A done step is the ink done state with its result ("You marked D"), never accent green before the reveal.
6. **Seedling hint**, the first two rounds of each two-step game only: one `meta` line ("A snare is a wrong option built to look right."), then gone for good. Only Snare Spotter's hint is written; Signpost's and Call It First's come from engine copy, word for word, listed and checked before the drills build, or are left out.
7. **Options:** the built option rows (56pt, E4 letter badge, `body`).
8. **Call It First:** the options drawn as folded bars (`--surface2`, 16pt tall, not pressable) under the principle cards, with `meta` "The options open once you name the principle." One group for screen readers ("Options hidden until you name the principle"). Heartwood "Options hidden" stays.
9. **Daylight:** "Flag & move on" and "Pause" in the sticky footer row, each 48pt, stacked from text scale 1.3; "Add a minute" the same. The pace bar steps once a second with no tween. This replaces `motion.dur.tick` (900 ms linear glide) for this bar only, as a component value recorded in the motion spec; `tokens.ts` is not edited (it is bundled).
10. **Leaf Pairs / Term Match** (the renamed Field Guide) and other match boards: one column from text scale 1.3. Forecast segments stack at 1.5. The option letter badge scales with text (30pt times text scale, capped at 1.6).

### 6.4 Feedback (one grammar with the main answer screen)

The built answer screen (F12, `PHASE4.md` 4.2) with the drill's own content, in this order:

1. The stem folds to two lines with "Show question" (48pt); cross-fade, no height animation.
2. **Verdict:** the built Verdict component (leaf mark, the word in `hero` in its state colour, coach line `aside`). The drill's words: "Snare spotted", "Correct", "Not quite". A miss is calm: no shake, no flash, no sound; the twig leaf stays an outline.
3. **Two-half line** (Snare Spotter, Signpost, Call It First only; never Forecast, Daylight or one-step games): one `small` line at the top of the answer card, naming only what was earned, never repeating the verdict or the answer card. The four cases (Snare Spotter words; Signpost's and Call It First's half names come from engine copy, listed and checked before the drills build, or are left out):
   - Both halves earned: verdict "Snare spotted" (Signpost and Call It First: "Correct"); no line.
   - One half earned: verdict "Not quite"; the line names only the earned half: "Snare spotted, 1 point." or "Best answer picked, 1 point."
   - Neither half: verdict "Not quite"; no line.
   - The best answer tapped as the snare (revealed, 0 points, `trapSpotter.ts:84`): verdict "Not quite"; never credit the answer half; no line.
   - The twig leaf fills only when both halves are earned, so the twig, the verdict and What caught you agree. Never "No point".
4. **Answer card**, untinted: "Your answer", "Best answer", and a "Snare" row with why it tempts (`caption` label in `--text2`, outline letter badge, never clay); then "Other options" as the built muted list.
5. **How to think about it:** the built tips card, with the item's Final two and Exam cue rows (and Eliminate two where the item has it), word for word.
6. **"Why A, and the key idea"**: a closed disclosure (48pt, the built Read more pattern), holding the explanation and the key idea.
7. Next (solid, sticky footer). Focus moves to the verdict heading after 400 ms; announced once, matching the two-half line: both halves "Snare spotted. D was built to fool you, and A is the best. Two points."; one half "Not quite. Snare spotted, 1 point." (or "Not quite. Best answer picked, 1 point."); none "Not quite." The answer card is read as the learner moves through it.

### 6.5 Round recap

1. **One forest panel** (`HeroCard`): the game glyph, `kicker` "Round complete · Snare Spotter", the score in `num.score` 52 rolling from blank (300 ms, never a visible 0; a score of 0 or below, which Forecast can reach, shows still with no roll, as built), `meta` "out of 10 · best 8", `small` "This round: 4 of 5 snares spotted", one row of tick and cross squares (on forest: `--btn-hero` ticks, `--hero-leaf-line` cross outlines). "New personal best" is static `caption`.
2. **Level change** (inside the panel, as a `HeroTile` band): the three-marker control (6.2), `small` "You've grown to Sapling. Your next round starts there." and "What changes: decoys from nearby ideas." (each game's existing level line). No "Next, Heartwood: 0 of 2" on that round. A step back uses its existing line and never animates; the lost level is a plain unfilled marker, not a locked tile.
3. **What caught you** (card, when the round had misses), then `meta` "Missed questions are in your review."
4. **Last 5 rounds** (card): the real `glyphs.tsx` Sparkline (`sparkPoints`, straight segments, newest point as the filled leaf), with a `role="img"` label of the five scores. On rounds with no level change, the level line. The engine counts strong rounds in a row and resets (`growth.ts`), so it never shows a count that can silently drop: one strong round in a row, "One more strong round grows it to Sapling." with two dots (one filled, one outline, by shape); none in a row, "Two strong rounds in a row grow it to Sapling." with no dots. No line at Heartwood; never progress toward a step back.
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
| Field notes (You, drill levels) | a pushed list page: `display` "Field notes", one row per game (`label` name, `meta` level), the three-marker control in each row (6.2 look, one accessible element per row, as on the recap) |

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

All motion is opacity and transform only (the one exception is the phone's built disclosure motion, kept as built), written as `motion` tokens (phone `theme/tokens.ts` values are read, not changed; new values go in the component or `theme/grove.ts`) and as CSS custom properties on the web. Any tap or scroll skips a celebration to its end. Reduce Motion always shows the end state with the same words and haptics.

| Moment | Phone | Website (600 ms cap, GROVE_HANDOFF 7) | Reduce Motion end state |
|---|---|---|---|
| Turning | 2400 / 3000 / 3600 ms, 4.4 | 560 ms, 4.12, `#plant` only | 120 ms cross-fade to the new form, fact, name and filled leaf (web: at once); one announcement |
| Stem leaf fill | 300 ms | 200 ms | filled |
| Planting (`plantIn`) | 820 ms | none: the planted art at once | the planted sprout |
| Breathing, day's first look (happy 600, curious 900, proud 600) | as today | as built | still |
| Elder leaf drift | at most 8 leaves, once | none | none |
| Look preview change | 160 ms cross-fade | 160 ms cross-fade | instant |
| Earlier growth disclosure | the built disclosure motion, chevron turns | the built `<details>`, no height tween: the content fades in over 120 ms, the chevron turns | static |
| Badge press | 1080 ms, 5.4 | none (no badge press on the web) | taped tile at once, block 120 ms fade |
| Repeat badge moment | 200 ms cross-fade | none | same |
| Drill right answer | about 600 ms: press 0.98 (120); options fade 0 to 120 while the verdict leaf springs from 0.6 at 120 (`spring.pop`); answer card from 200, rows 30 ms apart (no empty frame over about 80 ms); twig leaf fills as a stacked layer (opacity, scale 0.85 to 1, 160 ms, no overshoot); the score rolls up over 300 ms (drops set at once); one success haptic | none (no drills on the web) | frame 5 at once (120 ms cross-fade at most), same haptic |
| Drill miss | nothing animates | none | same |
| Recap score roll | 300 ms from blank (still at 0 or below) | none | the number |
| Level-up | under 1.2 s: recap fades in, score rolls, then only the level marker cross-fades with the TierLeafMorph spring (`growAt` = celebrate minus LEAF_SETTLE_MS); one light haptic; one spoken line ("Score 8 out of 10. You've grown to Sapling. Your next round starts there.") | none | end state, same line and haptic |
| Daylight pace bar | steps once a second, no tween (a component value that replaces `motion.dur.tick`, 900 ms linear glide, for this bar; `tokens.ts` not edited); announces at start, Pause and when the light sets | none | same |

On the web all of it stops under the global reduced-motion rule (`index.html:90`), and the JS timelines also check `matchMedia`, as `index.html:17471` does.

The session limits stay: one full moment per app session, `celebrate.sessionMs` 3000 of decorative motion, a kind of moment in full its first three times. A Turning claims the session's one moment.

---

## 9. Short text (Sky's rule, for 4b lines)

New and changed interface lines in 4b, checked against the rule. Engine game copy (step names, level lines, end notes, coach lines) and saved facts stay word for word.

| Where | Line |
|---|---|
| Your plant footnote 1 (was "'Know the outline' counts: subtopics you've answered right, without a hint, on two different days, weighted like the exam.") | "Know the outline: topics right without a hint, on two separate days." On the web it is built from `K.plant.SPREAD_EXPLAINER` (`index.html:19436` and `19525`), from the bundle: add `SPREAD_EXPLAINER` to the copy fixes in the step 1 bundle commit (section 11), so web and phone change together. |
| Your plant footnote 2 (was "Only real progress grows it: never taps, minutes, streaks or games. It never shrinks.") | "Only real progress grows it, never taps, time, streaks or games. It never shrinks." (the app has a streak, so the word stays). On the web it is hard-coded at `index.html:19437` and `19526`. |
| Look line | "A look is just for you: it never changes your growth." |
| State lines | 4.7, each one sentence |
| First set | "{Name} is planted." / "It grows as you learn." |
| Settings, Show badges | "Off: earned quietly." (built meaning) |
| Badges head | "Every set counts on its own." / "Earned by what you've mastered. Once earned, a badge stays." |
| Planter line | Built from data (5.1 item 5): "Completing Groundwork adds the fieldstone planter to your plant's looks." / "The fieldstone planter is in Look." |
| Web badges | "Labelled the day you earn them." / "Nothing here yet" / "Badges are earned in the phone app for now." (built) |
| Web Today plant row | "How it has grown" |
| Turning waiting | "See Kai's new form" / "It plays when you tap." (only when the session's moment is spent, 4.4) |
| Turning spoken line | the engine's `newFormLine`, as built: "Kai grows into a new form: the Standard Oak." |
| Drill level line | "One more strong round grows it to Sapling." / "Two strong rounds in a row grow it to Sapling." / intro "A strong round: 80% or more." |
| Ribbon keepsake | "Tell us you got the score you needed" / "Opens when you tell us you got the score you needed." / "The ribbon: you got the score you needed." |
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
| Turning | full, with waiting state when the session's moment is spent | 560 ms, on `#plant` only, no waiting state |
| Look | its own screen with sticky preview | inline on `#plant` under the sticky plant bed |
| Pick, Change plant, Rename | screens (4.3) | today's dialogs, with A's grid |
| Six-growth strip | not on You | on You's plant card, real art |
| Today | plant in the ring, row to Your plant | plant in the ring, row to `#plant`, invite as built |
| Widget | yes (Android) | none |
| Settings plant group | as built, copy trims only (4.11) | the web's existing plant settings stay where they are |
| Badges | case, sheets, press, album, share | Web A disc only: three empty mounts, "Nothing here yet", the app link |
| Look, Final form group | at Elder | none: the web plant draws its own form |
| Stem keepsake leaves | yes | none (no badge dates on the web) |
| Saved forms shown | `seen.ts` `plantForms` (built) | new `S.plantForms` (11.1) |
| Drills | everything in section 6 | none; nothing new is added about drills (O5 later). "Weak spots drill" stays as built |

---

## 11. Data, bundles and what must not change

- **No engine or data change on the phone.** Every value is read from saved fields or engine constants: growth, `reached` times and `plantedAt` (`CertPlant`), `backfill`, `FORM_FACTS` (a constant, growth 3, 4 and 6), keepsakes and their badge dates, `passedOn`, game rounds and levels, `sparkPoints`. The phone saves no per-growth fact (4.1 item 6). Where a value is missing, the screen shows less, never a guess. The web needs one new saved field (11.1); any other one that turns out to be needed goes beside the old ones and to review first.
- **The bundle rebuild (build step 1).** The copy fixes in 3.1, 3.3 and 3.4 live in `engine/plant.ts` and `engine/plantLooks.ts`, which are bundled into the website (`mobile/scripts/web-plant-bundle.cjs` `ENTRIES`). The Term Match rename is bundled too: `engine/games/registry.ts` is in the web bundle graph (`engine/milestones.ts:28` imports `GAMES`, and `assets/kaisip-plant.js` on `grove-phone-p1` contains "Field Guide"); editing `registry.ts:150` outside the bundle commit fails `npm run check`, which runs `build-web-plant.mjs --check`. So one commit holds: the 3.1, 3.3 and 3.4 engine copy, the rename at `registry.ts:150` and in the report title `app/reports.tsx:40` (`kt: 'Term Match'`), `SPREAD_EXPLAINER` (section 9 footnote 1), the `SET_NAMES` export (5.1 item 5, no value change), the rebuild of `assets/kaisip-*.js` and the new `?v=` references in `index.html`, so web and phone change together; `npm run check` must pass. The What's New history in `content/support` stays as shipped. Built engine strings that are kept, not edited: `EXAM_REST_LINES.eve` (4.7), `newFormLine` (4.4), `backfillLine` (4.7). Every other phone change in 4b stays out of bundled files (PHASE4 6). `theme/grove.ts` is not in the bundle graph; `theme/tokens.ts` is, and is not edited.
- **Must not change:** scoring, readiness maths, the plant growth rules (`GROWTH_RULES`), the Turning's once-per-form-for-life rule, badge rules and tiers, game scoring and level rules, the celebration limits, `data-l` and the letter mapping, every saved key and export marker, game ids (`field` stays `field`), the medallion art data (kept for history; the share card stops using it), the quiz and mock screens, and every piece of course content.
- **Checked and buildable as written:** `motion.turn` (small, medium, grand; cross 0.6, `swapFloor` 200, `skip` 120, `playGuard` 400), `plant.plantIn` 820 and `turnReduced` 120, `celebrate.leaves` 8 and `sessionMs` 3000, `turnLook.evenPace`; `g.specimen`, `specimenTape`, `g.leafLine`, `g.soil`, `mintInk`; `HeroCard`, `HeroTile`, `ListRow`, `IconCircle`, `Verdict`, `StickyFooter`, `PushedHeader`, `groveTile`, `Sparkline` / `sparkPoints`, `TierLeafMorph` / `LEAF_SETTLE_MS`; `CertPlant.reached` and `plantedAt`; the 13 species; the set-to-planter unlocks; the Turning waiting label (`seeNewFormLabel`). Today's growth word lives only in unbundled files (`home.tsx:818` and `824`, `groveToday.ts:37`). Keep the testIDs (`today-stage`, `plant-hero`, `plant-form-reveal`) for `npm run shots`.

### 11.1 Web saved data (to review before the web build)

The web has no record of which forms it has shown: `index.html` uses no `formOf`, `plantForms` or `FORM_FACTS`, and Today's grow-up clears `S.plant.pending` (`index.html:19342` to `19347`), so `#plant` cannot use `pending` to find "the first visit with a new form". Without a new field, the Turning's once-per-form-for-life rule and the one-time 4.7 line "Your study so far brought Kai to the Standard Oak." cannot work on the web.

- Add `S.plantForms`, the same shape as the phone's `seen.ts` `plantForms` (`FormSeen`), next to `S.plant` and `S.plantSettings`. Never rename an existing key.
- Add it to the backup and export key list (`index.html:10500`) and the export object (`index.html:10754`).
- On restore, forget it as the phone's `forgetForms` does: a restored plant gets the quiet line, never a replay.
- On first load, set its baseline from `K.plant.baselineForms`, so existing plants past Form I get the quiet line, not a Turning.
- Save a form as shown when its Turning plays (4.12).

---

## 12. Build order and checks

1. Wording and the bundle (section 3, 11): the growth word on both builds, the engine copy fixes, the Term Match rename (`registry.ts:150` and `app/reports.tsx:40`), `SPREAD_EXPLAINER`, the `SET_NAMES` export, the rebuild with the new `?v=` in `index.html`, all in one commit; `DECISIONS.md` 18.
2. Phone Your plant, Look, Pick and the Turning (4.1 to 4.9); then the widget and Settings group (4.10, 4.11).
3. Web saved data (11.1) to review first; then web `#plant`, You card strip, Today row and the 560 ms Turning (4.12).
4. Phone badges (5.1 to 5.6), then the web disc (5.7).
5. Phone drills (section 6).

Checks at each step, as `PHASE4.md` 11:

- Screenshots: phone 320, 375 and 390pt at text scale 1, 1.3 and 2; web 390 by 844 and 1280 by 900 at 100% and 200% text; light and dark; one demo dataset (F19). Phone shots go to Sky at each handoff (`npm run shots`), with the Turning recording at the plant handoff.
- Contrast: text 4.5:1 (3:1 for display, hero, numerals 30 and up); marks that carry meaning 3:1, recorded light / dark: reached stem and reached level marker `--accent` 5.41 / 8.87; `--leaf-line` on the page 3.49 / 3.90 (the stem and the dashed later leaves, phone and web) and on a card 3.94 / 3.31; `--control` on the page 3.23 / 3.68 (twig, not-reached level marker) and on a card 3.65 / 3.13 (not-yet badge mount); `--hero-leaf-line` on the forest card 4.16; mint `--btn-hero` on flat `--forest` 6.39 / 6.98 and 6.77 to 8.63 across the `--hero-panel` stops. Decorative only, recorded: `--soil`, `silGold` 2.3:1, the tape, the glassine.
- Targets 44px web, 48pt phone; no sideways scroll at 320 with 200% text; nothing clipped.
- Screen readers: the stem as a list, the twig as one element, one announcement per moment, focus to the title or verdict.
- Reduce Motion: every row of section 8.
- Gates: `bash scripts/verify_repo.sh`, `(cd mobile && npm run check)`, `cisa-ux-reviewer`, `mobile-ux-reviewer`, `mobile-motion-designer` (section 8), then `smoke-tester`. Before drills build, `behavioral-scientist` confirms the tone of the two-half line and the level line ("One more strong round grows it to Sapling."), and Signpost's and Call It First's hint and two-half lines are listed from engine copy and checked (drills decision, wording calls).
- Text sweep before each commit: no em or en dashes, no banned words or book labels in learner text, no total question count, no "stage" for the plant. Add `content/brand.ts:47` `WELCOME_LINE` ("A field guide to your CISA® exam study.", a banned phrase) to the copy-trim round. Shipped What's New entries (web `index.html:26442` to `26444`, phone `content/support`) are history and stay as shipped, though the web one says "field guide"; recorded here for review.
- Release: the web version bump and What's New wait for the end of the uplift (DECISIONS 8); the phone bumps `expo.version` with its release. Web What's New draft (web only; the web gets no badge press and no drills): "Your plant has its own page, showing how it has grown and the form it grows into." Phone release notes draft: "Your plant now shows how it has grown, badges are pressed like keepsakes, and drills have a calmer look."
