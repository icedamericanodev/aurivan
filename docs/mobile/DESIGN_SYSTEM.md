# KaiSip mobile — "Grove v2" design spec

Status: **locked 2026-10-07** by the maintainer. Supersedes "Forest". This file is the source of truth for `mobile/`; code that disagrees with it is a bug.

Maintainer decisions: first tab is named **Today**; readiness is shown as an honest **range** (e.g. 62–70%), with "not enough data" below ~40 answers.
Mockups: `docs/mobile/design/grove_v2.html` (light, dark, edge cases incl. ×1.6 text; the old PNG render is in `archive/design/grove_v2.png`). Real content: `d4_250`.
Fonts in the mockup are the static TTFs `@expo-google-fonts/*` ships. Contrast: `docs/mobile/design/contrast_v2.py`.

Idea in one line: **warm paper, one deep-forest panel per screen, a soft serif for the moments that
matter, a clean sans for everything you tap — and a grove that visibly grows as you study.**

---

## 0. Critique of Grove v1 (why v2 exists)

**Still generic**
- Forest card + concentric "topo" ellipses is the standard fintech hero; nothing says *growth* or *study*.
- Icon-in-circle + chevron rows and a 5-segment colour bar are iOS-settings boilerplate; the domain colours are unlabelled, so the bar is decoration, not information.
- Verdict = check-in-circle + word, the same as every quiz app. The answer moment, the app's most repeated beat, has no signature.
- Stock Lucide tab icons (compass, target, gamepad) and a flame streak (borrowed from Duolingo).

**Breaks at real content lengths**
- The mock used a 190-char stem and shortened rows ("What makes MFA real"). Real D4 stems run 240+ chars (8 lines at 21/30); with four 2-line options the last option sits under the sticky "Check answer" fade. No scroll-end padding was specified.
- Feedback with 3 tips + key idea + source is ~2.5 screens. v1 showed 1 tip and the fade already clipped it. Key idea sitting under a long explanation reads as a repeat.
- Real lesson titles ("Change control: why developers don't ship to production") wrap to 3 lines in `hero` 28 inside the panel, colliding with the decoration.
- Option badge `margin-top:-3` only aligns for 1–2 line options.

**Breaks at large Dynamic Type**
- `maxFontSizeMultiplier` 1.6 fails WCAG 1.4.4 (200%).
- Readiness row (44pt number + label + bar side by side) squeezes the bar to nothing at ×1.3+.
- Fixed heights: pill button 48, option badge 30, tab label 11 in a 64pt column ("Practice" overflows at ×1.4).

**Breaks in dark mode**
- `forest` `#1D3A2A` on `#111613` is 1.5:1 apart; the panel reads as a muddy smear and `forestLine` is invisible.
- `correctBg` `#173022` ≈ `forest`: correct feedback and the brand panel look like the same thing.
- Mint primary button + near-white on-forest pill = two brightest objects competing on one screen.
- No grain/shadow means `raised` rows vs `bg` (1.2:1) lean entirely on the 1.5px outline.

## 0.1 What changed from v1 (summary)

| Area | v1 | v2 |
|---|---|---|
| Readiness | `number` + 5-segment bar; ring on Results | **Growth rings** everywhere (Today mono, You + Results in domain tones with legend) |
| Hero art | Topographic ellipses | **Botanical line art** (procedural fronds/branches, seedling for empty states) |
| Numbers | Fraunces only for the big %, Figtree elsewhere | **Serif numeral system**: every stat and inline count in Fraunces |
| Coach voice | Fraunces roman key idea with left rule | **Fraunces italic** key idea + stage name (+1 font file) |
| Answer screen | Check-circle verdict, numbered tips list | **Leaf-mark verdict + vine reveal**; chosen-wrong option shows its own note inline; correct option labelled "Best answer" |
| Daily done | "Well done." title swap | **Clearing card** (summary + ring growth) |
| Texture | Flat paper | **Paper grain** 5–6% |
| Tabs / streak | Lucide compass/user, flame | Custom sprout / rings tab glyphs, sprig streak, active dot |
| Dark | `forest` #1D3A2A | `forest` #21432F + inner highlight, brighter `forestLine` |
| Type a11y | ×1.6 cap | ×2.0 cap for reading styles, layout reflow rules (§10.7) |

---

## 1. Fonts

| Role | Family | Weights loaded | Package export |
|---|---|---|---|
| Display / reading moments | **Fraunces** (SIL OFL) | 400, 400 italic, 500 | `Fraunces_400Regular`, `Fraunces_400Regular_Italic`, `Fraunces_500Medium` |
| UI and body | **Figtree** (SIL OFL) | 400, 500, 600 | `Figtree_400Regular`, `Figtree_500Medium`, `Figtree_600SemiBold` |

Six files total (~350 KB). **v2 adds `Fraunces_400Regular_Italic` (86 KB) for the coaching voice**, same package, no new dependency. Plus Jakarta Sans is removed.

**Why two families when the owner asked for one:** the "one font" wish was really a wish for
*consistency*. Today's single family at 600 everywhere is what reads as template. A serif used only
in four fixed roles (screen title, hero title, question stem, key idea) gives every screen one
focal point and a recognisable voice, while Figtree does all the work in rows, buttons and body.
The rule that keeps it consistent: **if you can tap it or scan it, it's Figtree. If you sit and read
it or it's the one big thing on screen, it's Fraunces.** No other mixing. If the owner still wants
one family, Direction 3 (Geist only) is the fallback; Direction 2 (Bricolage only) is the playful one.

Implementation rules
- Always select weight by `fontFamily` (e.g. `font.sans600`), never `fontWeight` (Android ignores it for custom fonts).
- Fraunces never below 18px, never bold (600+), never all caps. **Exception (v2): inline serif numerals** in list rows and segmented controls may go to 20px.
- **Fraunces italic** is the coach's voice and is used in exactly three places: Key idea, stage name ("Make it stick"), and the clearing card's "grew to" line. Never for UI labels, never for whole paragraphs > 4 lines.
- Figtree 700 is not loaded. Emphasis = 600. Hierarchy comes from size + family, not from more weight.
- `fontVariant: ['tabular-nums']` on Figtree for counters, timers, %, "1 of 3".
- `maxFontSizeMultiplier` (**changed in v2**): 1.3 for `display`/`hero`/`number`/`stat`; **2.0** for `stem`/`quote`/`body`/`small`/`meta`/`label`/`caption` (WCAG 1.4.4 needs 200%; v1's 1.6 failed it); **1.2** for `tab` (iOS shows the large-content viewer on long-press via `accessibilityShowsLargeContentViewer`). Never 1.0.

## 2. Type scale (the only 13 styles allowed)

| Token | Family / weight | Size / line | Tracking | Use |
|---|---|---|---|---|
| `number` | Fraunces 500 | **52 / 52** | −1.4 | Readiness % on Today, results score. `%` at 0.48em raised (superscript), not baseline |
| `stat` (v2) | Fraunces 500 | 34 / 34 (30 on forest) | −0.8 | Stat row on You and the clearing card; inline count 22–26 in rows ("59 due", "50 questions") |
| `display` | Fraunces 500 | 36 / 42 | −0.6 | Screen titles: Today, Learn, Practice, Play, You |
| `hero` | Fraunces 500 | 28 / 34 | −0.4 | Hero panel title, verdict ("Correct" / "Not quite"), lesson title, mock result |
| `stem` | Fraunces 400 | 21 / 30 (**20 / 29 when stem > 200 chars**) | −0.1 | Question stems, lesson scene prose |
| `quote` | **Fraunces 400 italic** | 18 / 26 | 0 | Key idea / key concept, lesson takeaway |
| `stage` (v2) | Fraunces 400 italic | 19 / 25 | 0 | Journey stage line under readiness |
| `headline` | Figtree 600 | 17 / 24 | −0.1 | Section headers ("Also today", "Why D", "Exam tips") |
| `label` | Figtree 600 | 16 / 22 | 0 | Row titles, button labels (buttons use 17/22) |
| `body` | Figtree 400 | 16 / 24 | 0 | Options, explanations, settings text |
| `small` | Figtree 400 | 15 / 22 | 0 | Tip text, wrong-answer notes |
| `meta` | Figtree 500 | 14 / 20 | 0 | Subtitles, counts, captions. Colour `ink2` |
| `caption` | Figtree 600 | 13 / 18 | +0.1 | Small labels over content ("Start here", "Key idea", "Eliminate"). **Sentence case.** |
| `tab` | Figtree 600 | 11 / 14 | 0 | Tab bar labels only |

Rules
- No uppercase eyebrows anywhere. UPPERCASE stays only for exam keywords inside stems (FIRST, BEST).
- One `display` per screen, at most one `hero`. Meta lines: max one per row, max 6 words.
- Reading measure: stems and explanations run full width at 390pt (≈ 36–42 characters/line in
  Fraunces 21, ≈ 45–55 in Figtree 16) — no extra side padding needed; never wider on tablets (cap content at 560).

## 3. Colour tokens

Names keep the current `Palette` keys where the meaning is the same, so screens barely change.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F3F1EA` | `#111613` | Screen background (warm paper / forest night) |
| `raised` (was `surface`) | `#FFFFFF` | `#1A211C` | Option rows, inputs |
| `raised2` (1.9) | `#F8F7F2` | `#1B231E` | The page-sheet tier (Report a problem, Share progress, Restore preview, the mock navigator): a tier BETWEEN `bg` and `raised`, not a second lift above `raised`. It separates a sheet from the screen behind it (dark: `raised2` vs `bg` 1.14; light sits just above `bg` and below `raised`). Don't stack `raised` cards on it expecting lift (dark: 1.02 against `raised`). Dark keeps the `soft` pressed tint visible on it, which `#212A24` would not |
| `soft` (was `surface2`) | **`#E9E6DC`** (1.21; was `#E6EBE2`) | `#202A23` | Icon circles, pressed rows, tags, disabled buttons. Neutral warm paper-grey since 1.21: the old mint-grey was ~1.03:1 from `correctBg`, so a `soft` row read as a correct answer. Green surfaces mean feedback only |
| `line` (was `border`) | `#DFDCD1` | `#29322B` | Hairlines, dark-mode option outline |
| `control` (was `borderStrong`) | `#7D897F` | `#66736A` | Idle chip / checkbox outlines (≥3:1) |
| `track` | `#E2E0D6` | `#2A332C` | Progress and ring tracks |
| `ink` (was `text`) | `#17231B` | `#ECEFE8` | Primary text; the "selected" colour |
| `ink2` (was `text2`) | `#465349` | `#B4BFB6` | Secondary text, meta |
| `muted` | `#5E6A61` | `#97A39A` | Inactive tabs, chevrons, dimmed options |
| `accent` | `#2B6E4A` | `#7FC39C` | Bars, rings, progress, key-idea rule (non-text) |
| `accentText` | `#24603F` | `#93CFAA` | Green text, row icons, links |
| `btn` (was `accentFill`) | `#1E4A34` | `#A9D9BA` | Primary button fill |
| `onBtn` (was `onAccent`) | `#F7F5EF` | `#0F1F16` | Text on primary button |
| `forest` | `#1E4A34` | **`#21432F`** | The hero panel (one per screen max). Dark lifted from `#1D3A2A` so it separates from `bg` and from `correctBg`. A 1px inner top highlight (`forestHighlight`): `rgba(255,255,255,.06)` dark, `.08` light (1.21) |
| `forestTop` (1.9; light 1.21) | **`#245A40`** (1.21; was = forest) | `#285139` | The panel's lit top edge: a vertical gradient `forestTop` → `forest` under the art, in BOTH themes since 1.21 (light was flat, so dark looked the more finished of the two) |
| `onForest` | `#F3F1EA` | `#EEF2EA` | Text and pill button on `forest` |
| `onForest2` | `#C9DACD` | **`#BCD2C2`** | Secondary text on `forest` |
| `forestLine` | **`#3A6B51`** | **`#3C6B51`** | Botanical line art on `forest` (decorative, exempt from contrast; v1 value was invisible in dark) |
| `forestTrack` (v2) | `#2F5C44` | `#2E5440` | Hairlines and ring tracks inside `forest` |
| `sap` (v2) | `#A9D9BA` | `#A9D9BA` | Leaf progress marks and the mini ring on `forest` (6.4:1 / 7.0:1) |
| `pill` / `onPill` (v2) | `#F3F1EA` / `#17231B` | `#EEF2EA` / `#0F1F16` | On-forest pill button (was hard-coded) |
| `grainOp` (v2) | **`0.035`** (warm-black noise; 0.05 before 1.21) | `0.045` (white noise; 0.06 before 1.9) | Paper grain overlay opacity. Never higher: at 5% the weakest pair (`muted`/`bg`) stays ≥ 4.7:1. Dark went down in 1.9: white specks over the forest night read as dust. Light went down in 1.21: white cards read speckled, like slightly dirty paper |
| `clay` | `#9A4F26` | `#E9A07A` | Streak + calm attention (pace behind, 2-min cue, last 5 min). Never for errors |
| `correct` / `correctBg` | `#1D6A43` / `#E0EDE2` | `#8AD6A8` / `#173022` | Answer feedback only |
| `wrong` / `wrongBg` | `#A3333D` / `#F7E3E1` | `#FF9CA6` / **`#2C1A1D`** (1.43; was `#3A1A1D`) | Answer feedback only (and the danger button, the game tiles' wrong state). Dark went calmer in 1.43 (owner decision): a learner who is already wrong does not need a shouting slab. Dark `wrong` on it 8.30, `ink` 14.56 (both up); it sits closer to the page (ΔE 13.3 from `bg`), and the row's words carry the meaning. Fallback if the danger pill gets lost on a dim LCD: `#301B1E` |
| `tip` / `tipBg` | `#7A5100` / `#F3EAD3` | `#E9C46A` / **`#2B2418`** (1.21; was `#2C2715`, which read muddy olive) | Trap warnings. Dark `tip` on `tipBg` 9.19, `ink` 13.21 |
| `scrim` + `scrimOp` (1.17) | `#17231B` at 0.4 | `#000000` at 0.6 | The dim behind a bottom sheet (§16). Never full strength: the screen the sheet came from still shows, so the learner knows they haven't gone anywhere. Not for text |

Domain tones unchanged (Lake, Moss, Ochre, Heather, Slate), dots and bars only.

**Badge art (mobile 1.10, `badgeEnamel`, `badgeMetal`, `badgeLeafPip`, `badgeGlaze` in `theme/tokens.ts`).** An earned badge is an object, struck once: its enamel and metal are fixed hex colours, the same in light and dark (like the brand lockup). Enamels `forest` `#1E4A34`, `ink` `#17231B`, `clay` `#9A4F26`, `paper` `#F5F1E6`, each with emblem roles E1/E2/E3 (≥ 3.5:1 on its field, tested), shades, a `deep` cast shadow, a `lite` growth-ring tone and a ribbon. Metals tell the tier: Clay, Lichen, Gold leaf (edge ≥ 3:1 on light `bg`, mid ≥ 3:1 on dark `bg`, pips ≥ 3:1 on the rim, tested). A badge with ONE mark has no tier and is struck in `badgeStruck`, a calm unnamed sage (`#AFC2B2` mid, `#3A4A3F` edge; same contrast tests), so Gold leaf only ever means the top of a ladder. A badge not yet earned uses theme tokens only: `soft` field, `control` stitched outline (3.23 L / 3.68 D on `bg`; 2.92 / 2.98 against the `soft` field it edges since 1.21, pinned at ≥ 2.9), `muted` emblem (4.53 / 5.66 on `soft` since 1.21; was 4.68 light), `accent` progress trace. On the forest panel it switches to the on-forest inks: `forestTrack` field, `onForest2` outline and emblem (6.91 / 6.88 on `forest`, 5.26 / 5.34 on `forestTrack`), `sap` trace (tested). No `gilt` token (mobile 1.11 decision): a Stretch tier is told by words and place, not a colour: its own row under the set ("Stretch · beyond exam need · 1 of 5"), the word "Stretch" in the cell line, the sheet and the ladder, and spoken "Stretch, beyond exam need". Its rim is simply its tier's metal.

Contrast (WCAG 2.x, all pass AA 4.5:1 for text; v2 re-run with `design/contrast_v2.py`, 54 text pairs, 0 fails; new pairs `sap`/`forest` 6.39 L / 6.98 D, `onPill`/`pill` 14.4 / 15.1, `bg`/`wrong` 6.00 / 9.20). v1 figures: weakest light pairs are `muted`/`soft` 4.68,
`wrong`/`wrongBg` 5.50, `correct`/`correctBg` 5.44, `muted`/`bg` 5.01; weakest dark pair is
`muted`/`soft` 5.66. Non-text: `control` on `bg` 3.23 (L) / 3.68 (D); `accent` on `track` 4.62 / 6.33.
Script: `design/contrast.py`.
Mobile 1.9 (dark depth) adds to the tested pairs (`__tests__/design-tokens.test.ts`), all AA: on `raised2` — `ink` 15.15 L / 13.85 D, `ink2` 7.55 / 8.48, `muted` 5.28 / 6.14, `accentText` 6.94 / 9.00, `wrong` 6.32 / 8.09, `tip` 6.52 / 9.63, `clay` 5.56 / 7.49, non-text `control` 3.40 / 3.24; on `forestTop` (dark) — `onForest` 7.96, `onForest2` 5.65, `sap` 5.73. Dark grain worst case (one full white speck under a glyph, at 4.5%): `muted`/`bg` 6.29, `ink2`/`bg` 8.68, `onForest2`/`forest` 6.06, `onForest2`/`forestTop` 4.97 (6% would have been 5.79 / 4.81).

**Mobile 1.21 re-run** (the premium pass changed `soft`, light `forestTop` and light `grainOp`; `__tests__/design-tokens.test.ts` carries every pair). Light `soft` `#E9E6DC` (decided 15 Oct 2026): `accentText` 5.96, `ink2` 6.48, `ink` 13.01, `muted` 4.53 (disabled labels); non-text `control` on `soft` 2.92 (the not-yet badge outline edges the field but is judged on the page, 3.23; its pin moved from ≥ 2.95 to ≥ 2.9 with this decision). Light `forestTop` `#245A40`: `onForest` 7.12, `onForest2` 5.51, `sap` 5.10 (all AA for `meta` 14 and up). The L1 plate (`raised2`): `ink` 15.15 L / 13.85 D, `ink2` 7.55 / 8.48, `accentText` 6.94 / 9.00; every notes-diagram label on the plate (the drawing themed with `bg` = `raised2`) stays ≥ 4.5:1 in both themes (tested, `notes-svg.test.ts`). 0 text fails.

Colour rules
- Green = progress, primary action, correct. **Never "selected"** (selected = `ink`).
- Green **surfaces** (`correctBg`, a green tint) mean feedback only. A row that is "the one to pick" is an L2 card, never a green fill (1.21).
- In dark mode the primary button flips to a light mint fill with dark text (calmer than a dark-green slab).
- One `forest` panel per screen, maximum. It is the brand moment; don't spend it on secondary content.

## 4. Space and radius

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. **Gutter 20** (was 16). Every margin, padding and gap in `ui.tsx` and the screens comes from the scale (1.21 snapped the strays: hero padding 22 → 24, its pill's 22 → 24, its action gap 18 → 20, its meta gap 6 → 4; `Section` 30/2 → 32/4; list rows gap 14 → 12 and padding 13 → 12; empty state 46/22 → 48/24).
- **The rhythm rule (1.21):** 4 inside a text group (a title and its meta) · 12 between a label and its content · 24 between blocks in a section · 32 between sections (`Section`'s own top margin) · 48 between page movements (the notes subtopic page). A first heading right under a kicker sits 16 below it.
- Radius: `sm 8` (tags, progress), `md 16` (option rows, inputs), `lg 24` (hero panel, L1 plates, sheets top corners 28), `pill` (buttons, chips, icon circles).
- **Shadow (1.21): one real shadow, `cardShadow`**, light mode only, on L2 cards (a sheet sits on its scrim and needs none): `0 0 0 1px rgba(23,35,27,.05), 0 1px 2px rgba(23,35,27,.06), 0 8px 20px -6px rgba(23,35,27,.10)` — a crisp 1px contact ring plus an ambient lift. Drawn with RN `boxShadow` (New Architecture; iOS, Android and web alike), so it never takes Android `elevation` and draw order stays as written. Dark: no shadow, a 1.5px `line` outline instead. The old `raisedShadow` (opacity .06, radius 6) is kept only for the Segmented thumb. Android 7–8 (API < 28) draws no outset `boxShadow`, so L2 cards there take `elevation: 1` instead (`CARD_LIFT` / `cardLiftFor` in `ui.tsx`; every L2 site uses it).

## 5. Surface rules (when to use a card)

**The surface model (1.21).** Four levels plus the brand panel; each means one thing.

| Level | Use | Light | Dark |
|---|---|---|---|
| L0 Paper | the screen | `bg` + grain | `bg` + grain |
| L1 Plate | figures, the notes compare grid, quiet offers (Practice's "Practice at exam pace?") | `raised2`, radius 24, padding 16, no shadow, no border (`Card variant="plate"`) | `raised2`, no border |
| L2 Card | things you choose between: answer options, mock types, the Learn "Up next" lesson, plant and look pickers | `raised` + `cardShadow` | `raised` + 1.5 `line` |
| L3 Sheet | bottom sheets | `raised2`, 28 corners, over the scrim (no shadow) | as light, 1.5 `line` edge |
| Brand | the forest panel, one per screen | `forest`, lit from the top (`forestTop`), 1px highlight | same |

A plate is tonal, not boxed (about 1.05:1 against the paper in light): it gathers a figure or a grid, it is never something to tap.

**One meaning per device (1.21).** The same device never does two jobs:
- The **3px `accent` left rule** + `quote` is the coach's voice only: Key idea, The IS auditor’s lens, Exam-day shortcut (and the exam-eve card, which is the coach speaking). Invitations, awards and small notices are an **InviteRow** (§6): the plant invitation, "Your plant grew", the badge back-fill line, "Updated after your report".
- **`control`** is for interactive outlines only (chips, radios, checkboxes, inputs, the secondary button). A **status** mark uses `track` for "not started" (a 2pt ring, no centre dot), a tone or `accent` arc for progress and a filled ✓ for done: Learn's domain rings, the bank's "Not tried" ring. A grey hollow `control` circle read as a radio button.
- **The notes read mark fills the circle** (no ✓; web and mobile). Three states by shape, 24pt, decorative (`aria-hidden`), never tappable, trailing the row just before the chevron:
  - **Not read yet:** a 2pt `track` ring (r 11).
  - **Started** (the note has been open 10 s in all while on screen): the ring in `accent` plus a right-half pie, clockwise from 12 o'clock (a pie that reaches into the ring so no seam shows: r 5.5, stroke 11, half its 34.558 length drawn, rotated −90°).
  - **Read:** a full `accent` disc with no seam (the whole pie drawn, or one filled circle r 12).
  - The row's meta line says the state in words ("Not read yet", "Started", "Read") in `ink2`; screen readers hear "{name}, not read yet / started, not finished / read".
  - Only becoming Read moves: the pie sweeps to full, 300 ms `cubic-bezier(.33,1,.68,1)`, once, the next time the row is on screen; Reduce Motion gets a 120 ms cross-fade. No scale, bounce or haptic. Read outranks Started, and "Mark as not read" goes back to Started.
- **Ghost links:** left at the gutter when they follow content; centred only directly under a centred primary in a footer; right only as a `Section` action or in the source row.
- **Trailing marks in rows:** a chevron (it navigates) or nothing (the row is the button). Learn shows only two meaningful marks: the filled ✓ on done lessons and the filled play disc on Up next.

1. **Default is no card.** Content sits on `bg`; groups are separated by whitespace and a section `headline`.
2. **Lists** = rows on `bg` with 1px `line` hairlines between them (inset to text start). No container border.
3. **Raised rows** (L2: white, radius 16, `cardShadow`) only for things you choose between: answer options, mock types, chip-less pickers, Learn's Up next lesson. Never for content nobody chooses between (onboarding's pillars are plain rows since 1.21).
4. **Forest panel**: one per screen for the single most important action (Today's first plan item, lesson start, results score).
5. **Tinted block** (`correctBg`, `wrongBg`, `tipBg`): feedback only.
6. **Key idea** is never a card: a 3px `accent` rule on the left + `quote` text (and that rule means only the coach's voice, above).
7. **Never nest** a surface inside a surface. Never outline a card with 1px border in light mode (the notes compare table was the last one; it is an L1 plate since 1.21).

## 6. Component recipes

**Button**
- primary: height 56, radius pill, `btn` fill, `onBtn` label (Figtree 600 17), optional 18px trailing icon, pressed = scale .98 + opacity .92 (eased on the UI thread, §8.4).
- secondary: height 56, radius pill, transparent, 1.5px `control` border, `ink` label.
- on-forest: height 48, padding 0 24 (1.21; was 22), radius pill, `onForest` fill, `ink` (L) / `#0F1F16` (D) label, 16px leading icon.
- ghost/text: `accentText` label 16/600, min hit 48.
- danger: `wrongBg` fill, `wrong` label. Disabled: `soft` fill, `muted` label.
- Sticky footer button sits in a 20px-padded footer with a `bg` fade above (no hard divider).

**Option row** (quiz, lesson checks, games)
- `raised`, radius 16, padding 15/16, gap 10 between rows, letter badge 30 circle 1.5px `control` border, letter Figtree 600 14 `ink2`; text `body`. *(Deliberate change from the earlier `line` border: `control` clears 3:1 non-text contrast on `raised`, so the idle badge outline is visible to low-vision users — WCAG 1.4.11.)*
- selected: a 2px `ink` ring layer over the row's own border and a badge filled `ink` with a `bg` letter, both cross-fading in (120 ms, §8.4), so the row never changes size. Haptic `selection`.
- correct: `correctBg`, no border/shadow, badge `correct` with ✓. wrong pick: `wrongBg`, badge `wrong` with ✗. others after submit: text `muted`.
- **Answer rows (mobile 1.43, the answer screen and the Results review):** `mark="letter"`: the badge keeps the DISPLAY letter, filled `wrong` / `correct` with a `bg` letter, instead of the ✓ / ✗ disc, so the verdict leaf is the screen's only ✗ (WCAG 1.4.1 holds: the tag words "Your answer" / "Best answer" carry the meaning). The tag is the words alone (no "· B" after them: the badge shows it); the spoken label keeps the letter, "Your answer, B, not correct: …" and "Best answer, D: …". The pick's own note is no longer inside the red block: it sits right under the red row as `PickNote`, a `caption` "Why not B" in `ink2` over the note in `small` `ink` (16 in, lined up with the row's edge; 16 below it), ONE screen-reader stop "Why not B: …" and never a header, so "Why D" stays the screen's one Why heading. Games and lesson checks keep the ✓ / ✗ badge (their rows can have no tag).

**Chip / tag**
- filter chip: height 40 (hitSlop to 48), radius pill, 1.5px `control`, `label` 15. Selected: `ink` fill, `bg` label, leading ✓.
- tag (non-interactive): no fill; `meta` with a domain dot ("● IS Audit · Analysis · 1 of 3").
- checkbox chip (`checkbox`): for independent on/off choices (reminder days). Same look as a filter chip; spoken as checkbox, checked / not checked, with a full name ("Remind on Monday" for "Mon") and an optional hint.

**IconButton** (`ui.tsx`): 48pt round target (above the 44pt minimum) holding one 24 icon in `ink` (`muted` when disabled); pressed = a `soft` circle that grows in behind the icon. `outline` (mobile 1.22): a 56pt round SECONDARY button with the secondary pill's 1.5 `control` ring (3.23:1 light, 3.68:1 dark), for a footer beside a primary pill (the lesson's "Previous step"). Always has a spoken `label`. State props: `selected` for on/off toggles, `expanded` for a button that shows or hides a panel (the game info button), `disabled`. `leaves` (mobile 1.43): it opens another screen (the Settings gear), so its pressed circle is set to rest at once on press (`usePressScale().settle`), never left fading on the screen underneath. Never a square tile.

**Stepper** (`ui.tsx`): `caption` label above `−  value  +`: two 48pt IconButtons around a `label` numeral (tabular, min width 48). Screen readers get ONE adjustable control (`spokenLabel`, e.g. "Reminder hour", value spoken in full, e.g. "7:00 PM"); the inner buttons are hidden from them, and only increment / decrement are handled. Used in pairs for a time (hour, then minutes in 15-minute steps), in the phone's own time format ("7 PM" / "19"). No date-picker dependency.

**Settings group and row** (`components/settings.tsx`, mobile 1.17; §16): `SettingsGroup` = (mobile 1.43) a letter-spaced `caption` title in `accentText` (a header; never row-like), an optional `meta` intro, then rows on the paper with hairlines (no card) between a full-width hairline above and below, 32 between groups. `SettingsRow` = `label` title (optional `meta` subtitle under it) · the CURRENT value in `body` `ink2`, right-aligned, up to half the row and allowed to wrap · chevron 18 `muted` (none on an action row such as Save a backup or Restore from a backup: a chevron promises somewhere to go); min height 56, full-width hairline. At ×1.3+ text the value drops under the title. Spoken as one button, "Exam date, Friday 8 January 2027" (`spokenValue` gives the full form of a short value), with a hint that says what opens. A status belongs in the spoken name, not only the hint ("Save a backup, Last backup file made: 6 Oct 2026"; "Undo restore, available until …"), because hints can be turned off. On/off settings are never rows: they stay `ToggleRow`s in the group.

**Bottom sheet** (`Sheet`, `components/settings.tsx`, mobile 1.17): for a short choice or a small tool opened from a row. The screen behind stays and dims (`scrim` at `scrimOp`); the sheet is `raised2` with 28 top corners (dark: a 1.5 `line` edge, no shadow), at most the screen's height under the status bar. Header: `hero` title (one screen-reader header stop that takes focus on open) + a ghost "Close" (choices that save as you tap), "Cancel" (when there is a Save) or "Done" (a tool). Content scrolls; an optional footer (Save) stays in reach. Closes with its button, a tap on the dim (hidden from screen readers), Android Back or VoiceOver's escape gesture; focus returns to the row that opened it. Motion: the Modal fades and the panel rises 8pt (`FadeIn`); under Reduce Motion it only fades. No spring, no drag handle (nothing to drag). **`ChoiceSheet`**: a Sheet holding one `radiogroup` of `RadioRow`s; a choice saves at once and closes the sheet, like a dropdown. Full-screen page sheets stay for longer flows (Restore preview, Report a problem, Share progress).

**Calendar** (`CalendarSheet`, `components/calendar.tsx`, mobile 1.17; §16): a bottom sheet, pure React Native (no date-picker library, so it ships over the air). `caption` "Quick choice" + chips In 1 month · In 2 months · In 3 months · Not sure yet (the one way to clear a date) → the month header (48pt "Previous month" / "Next month" IconButtons around a `headline` "January 2027") → two-letter weekday headings (Mo first, like the reminder chips; hidden from screen readers) → a 7-column grid of **always six week rows** (blank rows pad 4- and 5-row months, so the sheet keeps its height and the month arrows stay under the thumb). Cells: `floor((width − 2·gutter) / 7)` square when that is 48pt or more (50 at 393 dp); otherwise the headings and grid reach into the gutters, keeping `space.sm` at each edge, `floor((width − 2·sm) / 7)` wide and never under 48pt tall (49 × 49 at 360 dp, 43 × 48 at 320 dp), so no column is cut off. At ×1.3 text and up the grid comes before the quick choices (the wrapped chips would push it out of view). A day: `label` tabular numeral, capped at ×1.5 so it never clips; today = a 1.5 `accent` ring; chosen = an `ink` disc with the paper numeral riding inside it (both cross-fade, 120 ms); days before today and after two years are `muted` at .55 and disabled. Footer: `small` `ink` "Fri 8 Jan 2027 · In 88 days" ("Sun 1 Mar 2026 · Date passed" for a saved date already gone, or "No date yet. Your plan works without one."; not capped, it wraps) + primary "Save". "In N months" lands on the same day number, or the target month's last day when it is shorter (31 Jan + 1 month = 28 Feb). Nothing changes until Save; Cancel or the dim keeps the saved date. Each day is a button spoken "Friday 8 January 2027" (+ ", today") with selected / disabled states; a new month and a picked day are announced (`sayLater`). The grid fades (160 ms) when the month changes, never on open.

**List row**: 40 icon circle (`soft`, icon 20 `accentText`), optional `kicker` (mobile 1.22: a `caption` in `accentText` ABOVE the title that says what the row is or does, "Read the note", "Take the lesson", "Lesson · 5 min · Not done yet", "Next note"; it leads the default spoken label), title `label`, subtitle `meta`, trailing chevron 18 `muted`, min height 64, gap 12, padding 12, hairline below (inset 52 with an icon). `onHide` (1.21): a row that can be put away without a visible button (Today's plant row) hides through a named screen-reader action ("Hide from Today"), on a button row or a plain one. No long press (a hidden gesture nobody finds; review decision). `reading` (1.21): the title is something you READ (a question stem, a search hit), so it is `body` 400 in `ink`, at most 2 lines: reading text is never 600 (Saved, the notes search results on Learn and in Study notes; the bank's rows already were). Titles that NAME a thing (a setting, a domain, a game) stay `label`.

**InviteRow** (`ui.tsx`, 1.21): an invitation or a small award, on the paper. A 40 icon circle (the relevant glyph: sprout, badge, inbox), a `label` title, a `small` `ink2` line, then ghost actions under the words, left at the gutter ("Plant yours" · "No thanks"); or, with one destination and no actions, the whole row is a button with a chevron. The words are one screen-reader stop; each action stays its own. It replaces the green left rule for everything that is not the coach's voice (`PlantNote` is built on it).

**Inputs** (`SearchField`, `TextField`, `NoteField`; 1.21): idle = a 1.5 `control` outline in BOTH themes (dark `line` was 1.24:1, failing WCAG 1.4.11); focused = the same 1.5 outline in `ink`, the app's "selected" colour (no layout shift); a `TextField` with a problem keeps its `tip` outline while focused. On the web the browser's own focus ring is off (`outlineWidth: 0`), so it never draws a square box inside the rounded field. `SearchField` leads with a `search` glyph 20 `muted` (hidden from screen readers; the field's label says what it is), 48 min height, a 48pt clear ✕ once there is text, and an optional spoken hint.

**Progress**: quiz = segmented bar (one segment per question up to 20, else continuous), height 4, gap 3, done `accent`, current `ink2`, rest `track`. **Readiness = growth rings (see §10.1) — v2 replaces both the 5-segment domain bar and the Results ring.**

**Stat** (mobile 1.11, "readable at a glance"): no box. A plain one-word `caption` LABEL first ("Correct", "Missed", "Time", "Answered", "Accuracy", "Streak", "Questions"), then a value that means something on its own: a Fraunces 30 number with its unit in Figtree 15/20 `ink2` on the same baseline ("14 of 20", "24 min", "6 days", "73%"), or a short phrase in one size, Fraunces 20/26 (`statWord`: "None", "3 h 35 min", "Not yet", "Starts today"). Under a minute is the numeral form "<1" + "min" since 1.21 (spoken "under a minute"): the phrase "Under 1 min" wrapped in a 3-up row at 360 dp, so the three cells lost their shared baseline. A time of an hour or more is always a phrase, never a big "3" with "h 35 min" in small print (it read as "3"). Never a bare number whose meaning needs thought ("0", "1 minute" for 5 seconds, "0 days" for no streak). **Naming:** "Accuracy" for a percentage everywhere (You, Today's clearing); "Correct" is a count ("Correct 3 of 5", Today's clearing; since 1.43 Results says its count once, in the headline, and has no Correct or Missed cell); on a mock the misses count blanks too, said in one `meta` line, "20 missed, 10 of them left blank: a blank counts as not correct." An optional `note` (1.43) is one `meta` line under the value ("Per question 42 s", then "Exam pace: about 96 s"), said in the stat's spoken phrase too; listed at large text it takes its own line. **Time** reads the same everywhere (`durationWords` in `engine/pace.ts`: Results, the pacing panel, Today, You → Mock exams): "Under 1 min" in a sentence (the pacing panel, You → Mock exams) and "<1 min" in a stat cell (Results, Today's clearing; the numeral form since 1.21, because the phrase wrapped at 360 dp), always spoken "under a minute"; then "24 min", "3 h 31 min". Practice and review time is the answer time added up, each answer at most 3 minutes (a session left open overnight never reads "10 h"); a timed mock uses the exam clock; Today's plan keeps it to the second and rounds only to show it. Each stat is left-aligned and full width in its cell (`alignSelf: stretch`), so a label never shrink-wraps, wraps mid-phrase or clips on a narrow Android cell; a long value wraps to a second line and the row grows. A row of 3 is separated by hairlines (`line`; `forestTrack` on the clearing card). At large text (≥ 1.3) the row becomes a list: each stat one row, label left and value right, hairlines between. Spoken as one phrase per stat: "Correct: 14 of 20", "Missed: none", "Time: under a minute", "Missed: 20, 10 of them left blank", "Streak: starts today, with your first answer". The number keeps its roll (only the number; "of 20" stays put).

**Hero panel**: `forest`, radius 24, padding 24 (1.21; was 22), `caption` in `onForest2`, `hero` in `onForest`, `meta` in `onForest2`, on-forest button; **botanical line art** (§10.3, 1.5 stroke `forestLine`) bleeding off the top-right, replacing v1's topographic ellipses. Title may wrap to 3 lines; reserve the right 110pt for art only while the title is ≤ 2 lines (`maxWidth: 250`), otherwise text runs full width over the art (art is decorative and low-contrast). The `meta` line keeps the same `maxWidth: 250` (it wraps rather than running under the art), except with `wideTitle` or large text. Build: the art sits in its own absolutely-filled layer that does the rounded clipping, in a box of explicit size with a pivot in points; the text and button sit in a layer above it (zIndex 1). The panel itself doesn't clip (Android blank-panel fix). Dark mode (1.9) and light mode (1.21): the art layer first draws the panel's top light, one SVG gradient `forestTop` → `forest`, so the panel reads lit from above with its 1px highlight (`forestHighlight`, 6% dark / 8% light) instead of a flat slab. **Hero titles** (1.21): at most about 28 characters and never a count; the count goes to the `meta` line ("Picked for you" / "10 questions · about 12 min"; "Spaced review" / "16 of 55 due · most overdue first"). A short title keeps clear of the art, so `wideTitle` is for the clearing card only.

**Header**: tab screens = 14px top meta line (countdown left, streak right) + `display` title, no nav bar. **Today and You** put a Settings gear on the title row (`ScreenTitle`): an `IconButton` with Lucide `settings` 24, spoken "Settings" with the hint "Exam date, reminders and more", aligned to the gutter edge (the 48pt target overhangs by 10). Settings is reached only through this gear; You has no separate Settings row (removed 2026-10 as redundant). Pushed screens = 52pt bar: 44 hit icon left (X or ‹), centred progress or title `label`, icon right. No bottom border; content scroll reveals a 1px `line` only after scrolling (optional). **Title collapse (mobile 1.22)**: a reading page with its own `hero` title (the study note) passes `showTitle` to `PushedHeader` and keeps the bar above its scroll (`Screen`'s `header` slot): the bar holds only the back chevron until the hero title has scrolled under it, then the title (`label`, one line) cross-fades in (`CrossFade`, 120 ms on the standard curve; at once under Reduce Motion) and back out when the hero returns. The collapsed title is never read by screen readers, shown or not: it only repeats the hero, which is the page's heading. It shows past the hero's bottom edge and hides only 8pt back above it (hysteresis, so a scroll resting on the line never flickers), and a layout pass (a rotation) reports the last scroll offset, never 0 (`Screen`).

**Tab bar**: height 56 + safe area, `bg` fill, 1px `line` top border, 5 tabs, icons 24 stroke 1.75, label `tab`. Inactive `muted`; active label `ink` + icon `accentText` + **4px `accent` dot under the label** (v2, so active state isn't colour-only). **Custom glyphs (v2):** Journey = sprout, You = growth rings, **Play = pinwheel (mobile 1.22**: four of the house's lens leaves turning about one centre, stroke only like the other tab glyphs; it replaced Lucide's gamepad, which said "game app" rather than "practice, Grove-style"). Learn and Practice stay Lucide.

**Feedback**: superseded by the **vine reveal**, §10.2.

## 7. Icons

Lucide (already installed, per-icon imports) plus 4 custom SVG glyphs in the same 24-grid / 1.75 stroke: `sprout` (Journey tab), `rings` (You tab), `pinwheel` (Play tab and a plan's game item, mobile 1.22), `sprig` (streak, replaces the flame). **What a Start pill shows (mobile 1.22, the 1.20 icon rule):** Play (▷) only when the pill opens a lesson; a review, practice set, Guided step or mock goes forward with `arrow-right` (Today's forest pill picks by the plan item; Practice, Guided and the mock sheet always use the arrow). The arrow TRAILS the label ("Start →", like "Next question →"; the forest pill's `iconTrailing`); a Play glyph leads. **Mobile 1.6** adds `TierLeaf` (16 grid, `glyphs.tsx`): a game level by SHAPE — Seedling = a small sprout, Sapling = an outline leaf with midrib, Heartwood = the leaf filled — always beside the level's name, never alone; filled vs outline is also a skill badge's "pressed leaf" (earned vs not yet). New Lucide icons: `milestone` (You → Milestones; mobile 1.10: `badge`, the scalloped seal, for You → Badges), `leaf` (Field notes), `book-a` (Field Guide), `tree-deciduous` (Canopy Call), `footprints` (Stepping Stones). **Mobile 1.7** (Help and feedback): `circle-question-mark`, `mail`, `life-buoy`, `inbox`, `map` (exported as `MapIcon`). Keep them in `components/icons.ts` as `react-native-svg` components. **Game glyphs (mobile 1.12, `GameGlyph` in `glyphs.tsx`):** one original botanical glyph per game on the same 24 grid and 1.75 stroke, fills a 22% tint of the stroke: Snare Spotter a flytrap, Forecast a cloud with the sun behind it, Signpost a path that forks with one way marked, Daylight the sun on its day's arc over the ground, Root or Rumor a dandelion losing its seeds, Call It First a bellflower, Field Guide a leaf beside its entry lines, Canopy Call one broad tree crown, Stepping Stones stones across water. None repeats a badge emblem (the signpost, sundial, book, cairn and footprint belong to badges). Used at 20–22 in Play's rows and the round header (in a `soft` circle), 20 in `sap` on the featured panel's caption, 48 on a game's intro and 40 on its recap. They replace the Lucide icons Play used before (scale, sparkles, sunrise, sprout, crosshair, eye-off, book-a, tree-deciduous, footprints). Stroke **1.75** everywhere, 2.5 only for the ✓ inside a filled circle. Sizes 16 inline, 20 rows, 24 bar/header. Icons are `accentText` inside `soft` circles, otherwise `ink`/`muted`. Never put icons in square tiles.

## 8. Motion (mobile 1.8–1.12; Reanimated 4, no other animation library)

The idea in one line: **everyday UI moves like paper** (quick, soft, never bouncy); **growth moves like a plant** (slower, earned, rare). Every animation explains one of three things: where something came from or went, what changed, or that the app heard the tap. Decoration is for rare, earned moments only.

Code: tokens in `theme/tokens.ts` (`motion`), primitives in `components/motion.tsx`. Screens never write a raw duration, curve or spring.

**Native transform origins (1.15 hotfix).** `transformOrigin` on native must be keywords or whole non-negative px (use `originPx`); React Native misreads decimals ("Transform origin must have exactly 3 values").

### 8.1 Tokens

| Token | Value | Use |
|---|---|---|
| `dur.press` | 120 ms | Press-in (ease-out, so it reads as instant) |
| `dur.select` | 120 ms | Option, chip, radio and segment state; the leaving half of a page turn |
| `dur.quick` | 160 ms | Small fades and pops, the tab dot, a game-tile shake |
| `dur.reveal` | 200 ms | Answer rows, "Why", the Coach me wash |
| `dur.enter` | 240 ms | Content groups (fade + 8pt rise); the tab fade-through |
| `dur.screen` | 280 ms | The arriving half of a page turn; stack dissolves |
| `dur.fill` | 300 ms | Progress bars and quiz segments |
| `dur.vine` / `dur.grow` | 520 / 600 ms | Signatures: the vine stem; the growth rings and rolling numbers (first view of the day, or what went up) |
| `dur.celebrate` / `dur.short` | 1200 / 200 ms | The ceiling for a whole celebration (the clearing, a milestone); a shortened one's cross-fade |
| `dur.reduced` | 120 ms | The cross-fade that replaces movement under Reduce Motion |
| `dur.tick` | 900 ms | The Daylight pace tick's linear glide within each 1 s clock tick (the one linear motion) |
| `dur.draw` (1.12) | 400 ms | A lesson diagram's line drawing itself (a short vine); a timeline rail spans its whole build instead |
| `curve.enter` / `exit` / `standard` | M3 `(.05,.7,.1,1)` / `(.3,0,.8,.15)` / `(.2,0,0,1)` | Arriving / leaving / moving on screen. The default is `Easing.out(cubic)` |
| `spring.press` | 160 ms, ratio 1 | Press release: back to rest, never overshoots |
| `spring.settle` | 300 ms, ratio .9 | The segmented thumb (no visible overshoot) |
| `spring.pop` | damping 16, stiffness 260 | The verdict leaf only (signature) |
| `spring.leaf` | 280 ms, ratio .7 | Small marks: the saved bookmark (later: plan leaves) |
| `stagger` | groups 40 ms (first 4), rows 30 ms (first 6), digits 30, growth figures 60, pressed leaves 80 (first 3), a lesson scene's parts 120 ms (first 6, 1.12) | Entrances; a number's digits finish right to left; rings and stats 60 ms apart |
| `celebrate` | `fullTimes` 3, `sessionMs` 3000, `leaves` 8 | The celebration budget (§8.9) |
| `rise` / `shift` | 8 / 16 pt | Enter offset (y) / page-turn offset (x) |
| `pressScale` / `pressOpacity` | .98 / .92 | Press; the reduced press is the dim alone |

Budget (behavioural review §2): functional motion 120–300 ms, ease-out; informational growth ≤ 600 ms; **no confetti, no particles, no looping motion on question or mock screens, no screen shake** (only the ±6 pt game-tile shake). **Opacity and colour never bounce**; only `pop` and `leaf` may overshoot, and only on a mark.

### 8.2 Primitives (`components/motion.tsx`)

| Primitive | What it does | Reduced |
|---|---|---|
| `useMotion()` | `{ reduced }`: the phone's Reduce Motion **live** (its event, plus a re-check when the app returns to the foreground; Android "Remove animations" counts) OR Settings → Motion → Reduced. One listener for the whole app | — |
| `MotionRoot` | Mounted once at the root: mirrors `useMotion()` into Reanimated (`ReducedMotionConfig`), so anything still on `ReduceMotion.System` follows the in-app choice and live changes | — |
| `FadeIn` | Fade + 8pt rise over `enter`, staggered by group `i`, optional `delay` and `when`. `Enter` (screens) and `Rise` (the answer reveal) are built on it. A group that mounts WITH a page a `PageTurn` brings in starts in place (the page's arrival is its entrance, so nothing moves twice); one added later on that page (the answer reveal) still plays | 120 ms opacity only, no stagger |
| `usePressScale` | Press feedback for an `AnimatedPressable`: scale .98 in 120 ms, spring back; optional dim, tint (rows), a tint that grows from .9 (icon buttons), `follow` (the hero lift). A hook, so the Pressable alone carries the role and the handler. The tint's animated style exists only when there is a tint, and a static `Card` builds none (long lists on low-end Android) | No scale; a short dim (tints stay) |
| `StateLayer` | An always-mounted layer whose opacity follows `on` (the option's ink ring, a chip's fill, a segment marker, the radio dot), so nothing reflows. `step` flips at half-way, for a letter whose colours invert (a linear cross-fade would pass through zero contrast) | Same (a cross-fade is already calm) |
| `ProgressFill` | A full-width bar slid by translateX inside a clipping track (keeps the rounded end round, which scaleX would squash). Changes ease over `fill`; nothing grows on mount | New value at once, 120 ms brighten |
| `Pop` | Springs a mark from .6 on a new truthy trigger (or on mount) | 120 ms fade-in |
| `Shake` | One ±6 → 0 shake over 160 ms on a new trigger (game tiles) | Nothing moves; the words and colour carry it |
| `PageTurn` | Shared axis X: the page drifts 16pt out the way you're going and fades (120 ms, `exit`); `onSwap` runs before the new page is painted (reset the scroll, announce, move focus); the new page arrives from the other side (280 ms, `enter`). Every page is a fresh subtree (re-keyed on `id`), so no state from the old page (a selection ring, a pressed tint) shows on the new one. The leaving page can't be tapped but **stays readable** (hiding it pushed screen-reader focus off the button just used). `onTurning` reports the page still on screen, so the parent's header and footer follow it. `calm` takes the reduced path with motion on (mocks) | No drift, no wait: the new page fades in over 120 ms (a Reanimated entering fade, so it never flashes at full strength for a frame first) |
| `useOncePerDay(key)` | True on the first mount of the day only (in memory: a screen opened on purpose, like Results or the exam-eve card) | — |
| `claimFirstView` / `isFirstViewToday` (1.9) | A surface's first VIEW of the day, saved in `store/seen.ts` (`days`), so a cold relaunch the same day doesn't count Today or You up again | — |
| `useScreenFocus()` (1.9) | A tab's focus as state, starting from the navigator's own answer at mount, so a screen that opens in view decides its growth in its first frame | — |
| `useGrowth(key, values, { active, firstOfDay })` (1.9) | Decides, when a surface comes into view (`active`: a tab's focus, from `useScreenFocus`) or its numbers change while on view, whether they grow and from where: UP since the learner last saw them → from those (remembered across launches in `store/seen.ts`, per surface and cert, not in backups; a restore forgets them, so restored progress is never "+N"); else with `firstOfDay` the day's first view grows from 0; else they just show. A value that fell is never animated (a fallen one starts where it is). Out of view nothing plays (a session on top changes the numbers after every answer). Re-entering never replays | — |
| `RollingText`, `BigNum roll` (1.9) | An odometer: each digit is a column (blank, 0–9, 0–9) on translateY, one Text per column, the final characters laid out invisibly first so the width never jitters; digits finish right to left 30 ms apart; a rise always rolls up (wrapping through 9). The rows sit a blank gap apart (`ROLL.gap`, .42 em) in a window trimmed to the figures (`ROLL.trim`, .07 em top and bottom), and the column dims between rows (`ROLL.dip`, up to .6 half way, fully opaque on every row), so a frame caught mid-roll shows one digit leaving and the next arriving, softly, never two glyphs stacked. A count-up's "%" fades in with its first digit (never a lone "%"). Plain text until it plays, and plain text again once the roll has ended (or its celebration was skipped): no animated nodes stay behind. A text-size change mid-roll re-places it. `step` (the Stepper): each changed digit rolls one row from its neighbour, the way the value moved, so a wrap (12 → 1, :45 → :00) is one step. Screen readers hear the final value only (the columns are hidden) | A changed value brightens in (120 ms); nothing rolls |
| `GrowthRings grow` (1.9) | The caller decides: grow now, each arc from `from` (the value last seen) to now, after `delay`, outer ring first 60 ms apart. An arc starts a growth only for a new `run` (a new start value alone never replays it), placed before paint so it never shows its end for a frame first. A zero-length arc hides its round cap (no stray dot) | Static |
| `ProgressFill from` (1.9) | A bar that starts at the value last seen and grows to now over `grow`, after `delay` (Milestones' "closest next") | The value at once |
| `useCelebration(kind, run, line, id, once)` + `Celebrate` (1.9) | One celebration per occasion `id` (the clearing passes its plan's day, since Today stays mounted overnight): decided once when `run` turns true (§8.9); `once` = once EVER (saved in `store/seen.ts`, e.g. `exam-ready:cisa`). `line` is announced once per occasion in every mode, after a short pause (`sayLater`, so the screen change it arrives with doesn't cut it off). `Celebrate` frames it: anything inside reads `settled` and jumps to its end state; any touch inside skips it (the touch still reaches the button under it); 'short' cross-fades a block that is new on screen in over 200 ms, and only brightens one that was already drawn (from .55; never a blink out) | 'static': the end state at once, same words; haptic kept |
| `LeafFall` (1.9) | ≤ 8 small leaves drift down once (1.2 s, transform and opacity, fixed positions) inside an area the caller gives them, which holds no text. Gone when skipped | None |
| `ThemeFade` (1.9) | Mounted once at the root, under the grain: when Light ⇄ Dark flips, a veil in the OLD paper is drawn in the very commit that changes the theme, then fades out (240 ms) as an exit animation, so the app dissolves instead of flashing. Cheap: one view, only during a switch | The same dissolve, 120 ms |
| `FadeIn build` / `drop` / `play` (1.12) | `build`: a part of a lesson diagram that builds in reading order, even inside a page a PageTurn is bringing in (the build-up IS the content). `drop`: arrives from 8pt above (a layer settling onto a stack). `play={false}`: shown in place at once | 120 ms opacity, all at once |
| `Collapse` (1.12) | Shows or hides a small group (a Learn domain's lessons, the Practice path picker, Build a set, a notes domain's key terms). **No height animation** (that would be layout): the rest of the screen moves at once and what just opened arrives (fade + 8pt rise; with `rows`, each row 30 ms apart, the first 6). Closing is immediate; the chevron turning says it. A group already open when its screen opened is simply there | 120 ms fade |
| `Turn` (1.12) | A chevron that turns to its new direction (`quick`, standard curve) when its state changes, never on mount | Points the new way at once |
| `DrawLine` (1.12) | A line in a lesson diagram that draws from its start (scaleY from the top, or scaleX from the left) over `draw` or a length made of tokens | Simply drawn |
| `CheckDraw` (1.12) | A ✓ that draws itself, short stroke then long (`reveal`), when it means news: a lesson finished in the player since Learn was last on view, a note just marked as read. One animated SVG path, only while it plays or waits (`hold`: empty until it plays); a ✓ that is not news is a plain SVG | Fades in (120 ms), also when it plays after mount |
| `TierLeafMorph` (1.12, `glyphs.tsx`) | A game level changing in front of the learner: the old leaf fades out (160 ms) and the new one springs in from .6 (`leaf`). With `grow` (the round end's level-up, passed only while that moment plays in full): starts on the level before and grows once, after the score has rolled, with one `light` haptic; if the moment is skipped or ends first, the new level just shows | The new leaf fades in |
| `PageTurn pageStyle` (1.12) | A style for each page (a lesson scene fills the scroll's height, so a short scene can be composed) | — |
| `tween(to, dur, ease)` | A token-timed `withTiming` that passes `ReduceMotion.Never`: our components already chose their reduced path, and Reanimated's global switch would otherwise skip even the cross-fade | — |

### 8.3 Choreography rules

1. **Enter**: content groups fade in and rise 8pt (y only), 40 ms apart, at most 4 groups; tap to settled ≤ 450 ms. Tab screens play it on first mount only (tabs stay mounted).
2. **Exit**: fade only, faster than the entrance, accelerating; never staggered.
3. **Direction follows hierarchy**: deeper = the platform push; into a focused task (lesson, game, mock start) = `fade_from_bottom`; sideways inside a task (question → question in practice, Guided topic → topic) = `PageTurn`; between tabs = **fade-through** over `enter` (240 ms) on the `standard` curve, which front-loads it: the old tab is gone by about 55 ms and the new one is about 85% in by about 130 ms, so it reads as roughly 150 ms and two screens are never on screen together; session → Results = a dissolve (the quiz becomes its outcome, not a new place).
4. **Mocks turn calmly.** In a mock, question → question is `PageTurn calm`: a 120 ms fade with no drift and no leaving phase, with motion on or off. A timed exam should feel like the real test (behavioural review §2: no motion on mock screens beyond what's needed).
5. **What changed moves; what didn't stays.** On an answer only the verdict, the rows, the vine and one segment move. During a page turn the header and footer stay still and **follow the page on screen, not the tap**: for the 120 ms the answer page is leaving, the footer still reads "Next question" and the bookmark is that question's. The footer is ONE keyed button whose label changes, so screen-reader focus stays on it.
6. **Never block input, never act ahead of the screen.** Everything can be interrupted; buttons work during entrances. For a page turn's 120 ms leaving phase the leaving page isn't tappable, and the controls that belong to a question (the footer, Flag, ‹, the bookmark, Guided's "Start this step") ignore taps, so a tap can never act on a question the learner hasn't seen. They don't change look for it (no flash of a disabled state).
7. **Focus order never depends on animation.** Content is mounted, and readable by screen readers, from the first frame, including a leaving page; announcements are sent at once; nothing uses a live region to time motion. Labels, roles and states are the same with motion on or off. After a turn: a session announces "Question 3 of 10"; Guided moves focus to the new topic's title; a lesson's Back that takes you to the first scene (where Back is hidden) hands focus to Next.
8. **One signature per screen**: at most one expressive thing moves at a time (the verdict leaf, the vine, the rings).
9. **No shared-element transitions yet** (Reanimated's are experimental); continuity comes from matching geometry and the hero lift.
10. **Growth shows what changed, once (1.9).** Numbers roll and rings grow on the first view of the day, or when they went UP since the learner last saw that surface, and only while it is on view (Today and You use their tab focus: a session on top changes them off-screen). Never on a fall (readiness that dropped, a reset streak, a bad session: below 60% Results is simply shown), never on question or mock screens, never on every focus. Where it plays:
    - **Today:** the readiness range rolls and the mono rings grow; the streak numeral rolls +1 on a new day's first study and the sprig pops; a plan leaf done since Today was last on view fills as you come back (a `leaf` spring from .6, one `light` haptic per item).
    - **You:** (mobile 1.43: ONE readiness ring) its solid arc grows from the low end you last saw (from 0 on the day's first view) and the range beside it rolls; what went up is said once in the change line under the areas ("Since you last looked: IS Operations +4", only for a real last look) and in each area row's label; any stat that went up rolls, 60 ms apart.
    - **Results:** once per session, after the dissolve: the session's rings grow from 0 to the score and the score in the centre rolls (mobile 1.43: there is no "Correct" cell any more, and a one-domain set, with no ring, has nothing that grows; the leaf strip never animates). Three growths at most.
    - **Round recap:** the score rolls up from 0 (never a score at or below 0), then "New personal best" fades in.
    - **Badges (1.10):** medallions earned since the case was last opened press in (from .4 on the `leaf` spring, 80 ms apart, the first 3); the "Next for your exam" bars grow from where you last saw them, once the screen has arrived. A new badge presses in once per visit (switching the sort or a filter never replays it). The detail sheet's medallion turns in once as it opens, from edge-on to facing you (rotateY 90° → 0 over 400 ms, so a mirrored back is never shown; still under Reduce Motion). Nothing idles: no shimmer, no shine loop, no parallax.
    - **Stepper:** the value rolls one step the way the time moved (160 ms): the hour that moves because the minutes wrapped past :00 rolls with them, and a wrap (12 → 1) is still one step.
11. **Celebrations are rare, short and skippable (1.9).** See §8.9.
12. **Learn and Play (1.12, motion.md M4/M5).**
    - **Lesson scenes turn like pages** (`PageTurn`: Next drifts left, Back drifts right), and the footer and "3/7" follow the page on screen, not the tap (for the 120 ms the old scene is leaving, its buttons ignore taps). After a turn screen readers hear "Scene 3 of 7" (`sayLater`). Each scene is a fresh subtree.
    - **Scenes build in reading order** (`SceneBuild`, `components/lesson.tsx`): parts arrive 120 ms apart (the first 6), fade + 8pt rise. Steps: each numbered stop arrives with its step and the path draws down to the next stop in the time that stop takes to arrive (nothing springs as a scene mounts; the only spring in a lesson is the check's verdict leaf, on the learner's tap). Layers: bands settle onto the stack from above. Timeline: one rail draws down the whole build and ends in an arrow; each phase's ring fills (a 160 ms fade) just after it arrives. One signature at a time: a scene never has the verdict and a build moving together.
    - **Learn:** a domain opens with its rows arriving 30 ms apart and its chevron turning (no height animation). A lesson finished in the player (this app session) since Learn was last on view draws its ✓ as you come back (decided while rendering, so it never shows the ✓ for a frame first); out of view its ✓ waits empty, so the back transition never shows it drawn, emptied, then drawn again. No haptic here: Lesson complete gave the moment's one. A lesson that arrives any other way (a restore, a certification switch) is simply done. Nothing else on Learn moves on return.
    - **Lesson complete** is ONE calm moment (T1, `useCelebration('lesson-done', …)` per lesson, so the budget, the fatigue and skip apply): the domain's lessons as leaves on one branch, the one just finished filling in over `grow` once the page has arrived. A lesson finished before is just shown (no moment, no haptic). Reduced: the end state, the same words. The Finish button is gone at the swap, so screen-reader focus moves to the moment itself: one header stop that says it all ("Lesson complete: The audit charter. A new leaf on your IS Audit branch: 2 of 7 lessons."), with no separate announcement talking over it.
    - **Notes:** "Mark as read" draws its ✓; More / Less and the key terms turn their chevrons (the text itself just reflows; no blink of text already on screen).
    - **Play:** the round's score rolls up (300 ms, no stagger; a fall just shows); a matched pair, a right place or a wrong one tints in over 160 ms (both tiles of a pair together) and its ✓ / ✗ springs in (when the state changes on screen; a tile drawn so on the first paint just shows it); a placed stone settles into its slot (fade + 8pt rise, 160 ms), and a stone taken back arrives back under Stones the same way; the level picker's leaf morphs; the round end's level-up is a T1 moment through `useCelebration('level-up', …)` (the budget, fatigue and skip apply; never beside a milestone moment, never for a step back): in full it grows the leaf once late in the score's roll (settled within the 1.2 s ceiling; the old leaf fades out), otherwise the new level just shows, with one `light` haptic either way, also when the learner skips before the leaf grew; Daylight's sun rises 4pt into place once as its intro opens (`grow`). No travel between columns, no confetti.

### 8.4 Touch (what each control does)

| Control | Press | Select / state |
|---|---|---|
| Button (primary, secondary, danger, on-forest) | .98 + dim .92 | — |
| Ghost button | dim only (never scale text alone) | — |
| Hero panel | the pill .98 and the panel .99 (the lift) | — |
| Card (tappable) | .98 | — |
| ListRow, RadioRow | a `soft` tint fades in under the row (no scale: rows are wide) | Radio: the ink ring and dot cross-fade (120 ms) |
| IconButton | a `soft` circle grows in (.9 → 1) and fades | — |
| OptionCard, MatchTile | .98 | a 2px ink ring layer + the badge fill cross-fade (120 ms), the letter flips at half-way; the row's own border and padding never change |
| Chip | .98 + a `soft` tint | the ink fill layer (covering the outline) cross-fades; the label and ✓ swap colour at the fill's half-way point (flipping at the tap put paper-coloured text on a still-clear fill); the ✓ sits above the fill |
| Segmented | — | ONE thumb slides (translateX, `spring.settle`) only when the learner chooses: it is placed in segments and drawn from the measured width, so a screen that opens on a later option, or a rotation, shows it in place from the first frame. Stacked at ×1.3+ text or reduced, each segment cross-fades in place. The thumb and the per-segment layer sit under the labels, so they carry the iOS shadow only, never Android `elevation` (which would lift them over the label) |
| Tab bar | — | fade-through 240 ms; the 4pt dot pops in (scale 0 → 1, 160 ms); no icon bounce |
| Bottom sheet (1.17) | — | opens: the dim fades in and the panel rises 8pt (`FadeIn`); reduced: fade only. Closes with a fade. No spring, no drag |
| Calendar day (1.17) | a `soft` circle tint | the `ink` disc and its paper numeral cross-fade (120 ms); a new month fades the grid in (160 ms) |
| Disabled | nothing moves (a shake would read as an error) | — |

Icons that sit above a state layer are wrapped in a View, so they always draw on top (on the web build a bare SVG painted under an absolutely positioned layer).

### 8.5 Reduce Motion and Settings → Motion

Settings → Appearance → **Motion** (a row showing "Match my phone" or "Reduced"; since 1.17 its choices open in a sheet): a radio group, "Match my phone" (the default; it names the phone's own setting, "Reduce Motion" on iOS and "Remove animations" on Android, and says so when it is already on) or "Reduced" ("Short fades instead of slides; growth shows its end state." This app only, WCAG 2.3.3). Kept in backups like the theme; restoring a file from before 1.8 (no Motion key) keeps this phone's choice, because Reduced is an accessibility setting. **Reduced never means a hard cut for a meaningful change** (Apple's criteria ask for a dissolve). The one named exception is switching tabs: the tab bar's own selection already says where you are, and an instant switch is what the platforms do under their reduce settings:

| Full motion | Reduced (same information) |
|---|---|
| Fade + rise, page-turn drift | Opacity cross-fade, 120 ms |
| Lesson scenes building up, a milestone moment, a game's answer reveal | The same parts fade in (120 ms), all at once (never a cut) |
| Press squeeze | Dim only |
| Segmented thumb slide | The segment cross-fades in place |
| Segment / bar fill | Final state; the segment fades in, the bar brightens |
| Verdict pop, bookmark pop | 120 ms fade-in |
| Coach me wash (200 ms) | The same wash, 120 ms (it is colour, not movement) |
| Vine draw, leaf pops, ring growth | Static (haptics kept) |
| Rolling numbers | The final number; a changed one brightens in (120 ms) |
| The clearing, a milestone moment, Exam-ready (1.9) | The end state at once, with the same words (announced once); haptic kept; no leaves |
| Light ⇄ Dark switch (1.9) | The same dissolve, 120 ms (opacity only) |
| Lesson scene turn and build-up, a group opening (1.12) | The new scene, or group, fades in (120 ms), all its parts at once; lines are simply drawn |
| A ✓ drawing, a level leaf morphing, a tile's mark springing (1.12) | Fades in (120 ms) |
| Lesson complete (1.12) | The branch with the new leaf filled at once, the same words; haptic kept |
| Daylight's sun rising (1.12) | The sun is simply there |
| Game-tile shake | None; the static wrong state and the words "Not a match" |
| Tab fade-through | Instant (the named exception above) |
| Stack push / rise, page sheets | Dissolve (`fade`) |
| Frond sway | Off |
| Daylight pace tick glide | Steps in tenths |

### 8.6 Performance

Transform and opacity only, never layout (the Daylight pace tick used to animate `left` every second; it now slides on translateX across the measured track). Worklets on the UI thread; a press never re-renders the screen; a one-shot `setTimeout` only for a phase change (the page turn's swap, a roll that has ended), never a per-frame JS timer. No entrance animation inside virtualised lists. SVG motion stays on `strokeDashoffset` for ≤ 6 paths at a time (the rings). Loops pause off-screen (`useFocusEffect`), and nothing grows on a hidden screen. A rolling number goes back to plain text when it stops, so You and Today keep no odometer mappers alive. A scroll position that only decides whether something is in view lives in a ref: a scroll event never re-renders a screen (Results with a long mock review).

### 8.7 Testing and screenshots

One Reanimated jest mock for the whole suite (`mobile/jest/reanimated-mock.ts`, registered in `jest/setup.ts`; Reduce Motion on by default, `setMockReducedMotion(false)` turns it off; React Native's `isReduceMotionEnabled` gives the same answer). Shared values persist and `useAnimatedStyle` runs, so a re-render after effects shows an animation's END state: `motion.test.tsx` renders every primitive reduced and asserts its final static state; `motion-touch.test.tsx` pins that selection never reflows a row. `SHOTS=motion npm run shots` captures the changed screens plus slow-motion frame strips (the page clock runs at 1/10 speed) of the press, select, segment fill, page turn (with its footer), segmented thumb (sliding, and reopened on a later option), a mock's calm turn and the tab fade. `phase2-review-fixes.test.tsx` runs a mock and a practice session with motion ON and fake timers, so the page turn's real leaving phase is on screen (the footer, the bookmark, the announcements). Mobile 1.9: `motion-growth.test.tsx` pins the odometer maths, `useGrowth` (up only, from what was seen, never on a fall, not while out of view), the celebration budget and fatigue, skip, `LeafFall`, `ThemeFade`, `ProgressFill from`, the plan leaf fill and the Stepper roll; `phase3-growth-screens.test.tsx` runs the clearing, Results and You in full motion and reduced (same words, only the movement differs); `phase3-review-fixes.test.tsx` pins occasions, once-ever moments, the 30-minute session, the short form's brighten, no growth off screen, the odometer's gap, re-placing and swap back, and the Stepper's one-step wrap; `phase3.qa.test.tsx` runs the learner journeys on real content. Celebration lines are said after a short pause (`sayLater`): tests call `flushSayLaterForTest()` before counting announcements, and `jest/after-env.ts` drops any still waiting when a test ends. Mobile 1.10: `badge-catalog.test.ts` pins the sets, per-set counts, gates, effort, sorts, "Next for your exam" by stage and "Study for this"; `badge-restore.test.ts` pins tier-safe restores and planters; `badges-screens.test.tsx` runs the case (grid, ×1.3, ×1.6), the sheet, the new dot, Show badges, the moment's 3-a-week cap and the review fixes (on-forest medallion, Sort focus and expanded state, open at a shelf or a sheet, the after-exam album, back-fill dates, press once, the tab's ring); `badges.qa.test.tsx` runs the learner journeys; mobile 1.11: `badge-tiers.test.ts` pins every tier, the gates, Stretch rows, "New in", Took Root, the quiet catalogue fill and that the catalogue and the restore check accept exactly the same keys, `badge-share-screens.test.tsx` the share flow, `share-card.test.ts` the card's words, and `SHOTS=badgesC npm run shots` captures the ladders, the domain emblems, Took Root, "New in", the catalogue line and the share card (`FONT_SCALE=2`: the sheet, its ladder and the share panel at about 200% text; the card itself stays a fixed picture); `stretch-copy.test.tsx` pins that a Stretch tier is never the next step; `badge-art-drift.test.ts` rebuilds the art and compares it byte for byte with `badgeArt.json`; `SHOTS=badges npm run shots` (with `REDUCED=1`, or `FONT_SCALE=1.3` / `2` for the large-text case, shelf and sheets; the web build reports a font scale of 1, so the page sets it and the harness zooms the text) captures the case, each shelf, the sheet, Results with a new badge, You's dot, Show badges and a strip of the unlock moment. Mobile 1.12: `learn-play.test.tsx` pins the new primitives' end states (Collapse, Turn, DrawLine, CheckDraw, TierLeafMorph), that every scene of every lesson renders with motion on and off, the cover's map and reason, Lesson complete (a fresh lesson has its one moment and haptic, a repeat has none), Learn's trail states, one glyph per game and the round header; `SHOTS=learnplay npm run shots` (with `REDUCED=1`, `NARROW=1` or `FONT_SCALE=2`) captures Learn, the lesson cover, the three templates, a check, Lesson complete, Mark as read, Play, each game's header, a recap with its sparkline and a level up, plus strips of the scene turn, the step line, the timeline, the lesson ✓, Lesson complete, a match, a stone and the level-leaf morph. `SHOTS=growth npm run shots` (with `REDUCED=1` for the reduced set) captures Today (normal, cleared, exam-ready, exam eve), Results, You, Milestones, the empty states, the bank grouping and a sheet, plus strips of a number roll, ring growth, the clearing, the milestone moment, You's "+N" and the theme fade.

### 8.8 The plant (mobile 1.14)

Shipped in 1.14 as `components/plant/LivePlant.tsx` (§13 "Motion"): the Breathe idle burst, one reaction per occasion, the growth sequence and the onboarding planting, on the `motion.plant` tokens. Reduce Motion stills all of it (the in-app Motion setting covers it; no separate "Companion moves" switch was needed). (Lessons, Learn and Play shipped in 1.12, §8.3 rule 12.)

### 8.9 Celebrations (mobile 1.9; behavioural review §2)

| Moment | Tier | Full (≤ 1.2 s, any tap ends it) | Words (every mode, announced once) |
|---|---|---|---|
| **Today's clearing** (all plan items done), as Today comes back into view, once a day | T2 | the last plan leaf fills; the day's three numbers roll up 60 ms apart (from 120 ms); the mini ring grows from this morning's readiness to now (from 240 ms); then "Readiness grew to …" and "IS Audit ring +4" fade in (from 840 ms). One `success` haptic | "Today's clearing. Two of two, done. Readiness grew to 67–77%." |
| **A badge** (Results after the review actions, a round recap; mobile 1.10) | T3 | the badge's 64pt medallion presses in (.4 → 1 on the `leaf` spring, from 120 ms) in its own 64pt column; its rim catches the light once (a glint runs round the frame, 200–600 ms) and its emblem fills from its one-tone outline (fades out 400–600 ms); six leaves drift down that column, never over the words. The words are there from the first frame (the block may already be on screen). On Results it waits until it is scrolled into view AND the rings have settled, and its one haptic comes with it; its words don't wait. A higher tier (Rooted · 30 days, Long Memory · 75, Dress Rehearsal · 2, an 80% tier) always plays short. At most THREE full badge moments in any 7 days (`seen.badgeMoments`, noted when a moment actually plays in full, never when it is only drawn; a short, static or never-scrolled-to moment is not counted): past that the block is replaced by one quiet `meta` line, "New in your badges: Rooted · 30 days", with no haptic | "A new badge, Evergreen: Long Memory. You recalled 25 questions… That's what holds on exam day." |
| **Exam-ready** (the readiness-holding panel), once ever per cert | T3 | the sap rings grow, the frond takes ONE slow breath (1.5° out and back over 1.2 s) and the words follow. One `success` haptic, the first time it ever shows | "A quiet milestone. Your readiness is holding." |
| **The plant grows** (Today, once per growth; mobile 1.14) | T3 | in the plant's own slot: the old growth swells to 1.04, then fades (40–66% of the way) while the new one, fully there by 45%, settles from 0.94 (900 ms, from the plant's base). One `success` haptic, silent if the clearing's played within 5 s. Never fatigued (rare: once per growth), but it IS the session's one full moment: a milestone that played on Results first leaves it the short form. It is also that day's proud moment: no reaction plays with it or later that day. **With the exam-ready panel on the same visit** (Elder and "Your readiness is holding" come from the same week): the panel is the one moment and the one haptic; the growth is applied silently (never a sequence on the hidden plant) and Your plant says it in one calm line next time | "Kai grew to Crown." |
| **Exam eve / exam day** | calm, not a celebration | on the day's first view the reminders arrive one by one (80 ms apart), each leaf pressing in. No particles, ever | the card itself |

Rules: there is no confetti, no sound, no full-screen takeover and no "Congrats!". At most ONE celebration plays in full per app session; the next is the short form. A session is one launch, or the time since the app came back after more than 30 minutes in the background (`SESSION_GAP_MS`): Today can stay open for days, and tomorrow's clearing gets its full form. A kind plays in full its first three times, then short (its end state cross-fades in over 200 ms), so it never wears out its welcome. Each occasion plays once: the clearing once per plan day (even with Today left open overnight), Exam-ready once ever per cert (later launches show the panel still and don't announce it), a milestone once per session. Any tap ends a moment; on Results a new scroll drag does too; a skipped Exam-ready breath stands the frond upright at once. The milestone's one `success` haptic comes with its motion (when it is scrolled into view); its words are announced as Results opens. Nothing ever celebrates a loss. Under Reduce Motion it is the end state with the same words. Counts live in `store/seen.ts`, on this phone only.

The budget: decorative motion stays within 3 s per session (`claimDecor`). Only celebrations are charged: the full form 1.2 s, the short form 200 ms; past the budget even the short form is skipped (the end state just shows). Informational growth (a number rolling to what changed, a ring growing to its value, ≤ 600 ms) is not decoration: it is the news itself, carries the same words without it, and is never charged (behavioural review §2 treats it separately).

## 9. Library decision

**Keep our own primitives. Adopt no UI kit.**

| Option (checked Oct 2026) | Verdict |
|---|---|
| gluestack-ui (core 5.0.x; v4.1 Uniwind is Expo-only alpha) | Requires Tailwind/NativeWind or Uniwind build layer; shadcn look is exactly the "template" feel we are escaping; churned v2→v3→v4→v5 in 18 months. |
| Tamagui 2.7 | Excellent perf, but a compiler + its own token/theme system to learn; heavy migration for ~12 primitives. |
| React Native Reusables (shadcn + NativeWind/Uniwind, @rn-primitives) | Copy-paste is nice, but adds Tailwind toolchain and PortalHost; default visuals = shadcn = generic. |
| HeroUI Native 1.0.x (supports Expo 57 / RN 0.86) | Polished, but peers on Uniwind, gesture-handler, bottom-sheet, worklets, expo-blur, tailwind-variants; brings its own look. |
| react-native-paper 5.15 | Material 3 look fights a calm iOS-first study app. |
| Unistyles 3.5 | A styling engine, not components; Nitro + babel plugin to solve a problem `useTheme()` already solves. |

Why: the app has ~12 primitives, a typed `<T v>` scale and an ESLint rule banning raw font/colour
styles, which is already a stronger consistency guarantee than any kit gives. The "AI slop" is a
design-decision problem (fonts, weights, cards everywhere), not a component-tech problem. A kit would
add a styling toolchain, 5–8 native peers and its own default look, and we'd still restyle every
component. Only add `@gorhom/bottom-sheet` later if a real sheet (filters, report issue) is needed.

### Install plan

```bash
cd mobile
npx expo install @expo-google-fonts/fraunces @expo-google-fonts/figtree
npm uninstall @expo-google-fonts/plus-jakarta-sans
```
Nothing else: `react-native-svg`, `reanimated`, `expo-haptics`, `lucide-react-native` are already in place. **v2 adds no dependency.** Grain is a bundled 256×256 PNG (~20 KB) tiled with `<Image resizeMode="repeat">`; rings and botany are `react-native-svg` paths computed once with `useMemo`.

### Migration order (each step is one PR, screenshots light+dark via `npm run shots`)

1. **Tokens + fonts** — `theme/tokens.ts`: new palette values (keep old key names as aliases for one release), `font` map (`serif400/500`, `sans400/500/600`), the 11-style `type` map; `_layout.tsx` `useFonts` swap. Update `docs/mobile/DESIGN_SYSTEM.md`. Old variant names map: `display→display`, `title→headline` (or `stem` in quiz), `label→label`, `body→body`, `meta→meta`, `eyebrow→caption`.
2. **ui.tsx primitives** — `T` gains the new variants; `Button` pill + kinds; `Card` loses its border and gains `variant: 'plain' | 'raised' | 'forest'`; new `ListRow`, `Section` (headline + optional meta), `HeroPanel`, `SegmentBar`; `IconTile` → `IconCircle`; `Pill` → `Tag`; tab bar styles.
3. **quiz.tsx** — `OptionCard` recipe, `ResultBanner` → verdict row, `TipsReveal` → numbered tips, key-idea rule, session header with segmented progress. (Highest-traffic screen; biggest perceived win.)
4. **Journey (home)** — HeroPanel for first plan item, readiness number + domain bar, plan as `ListRow`s, drop nested cards.
5. **Learn + lesson.tsx** — lesson title `hero`, scenes `stem`, checks reuse `OptionCard`.
6. **Practice, Play, game.tsx** — list rows instead of card stacks; chips recipe.
7. **You, Mistakes, Results, Settings, Onboarding** — stat row, lists, results uses `number` + ring.
8. **Motion pass + a11y pass** — reduce-motion, font scaling at 200%, VoiceOver labels, contrast script in CI.
9. **v2 signatures** (can interleave with 3–7): `GrowthRings` + `Botany` + `Grain` components first (one PR, used by steps 4 and 7), then vine reveal inside step 3, clearing card inside step 4.


---

## 10. Signature elements (v2)

Five, all calm. Each one must appear on at least two screens so it becomes recognisable, and none
may ever appear twice on one screen.

### 10.1 Growth rings — readiness as a tree cross-section
- One ring per domain, **inner = D1 → outer = D5** (blueprint order). **Ring thickness ∝ exam weight** (`w = weight × k`), so heavy domains (26%) literally carry more of the trunk. **Arc length = domain mastery** (0–1), starting at 12 o'clock, clockwise, round caps. Track = full ring in `track`.
- Rings share one gentle wobble so they read as wood, not a chart: `r(θ) = rm·(1 + .022·sin(3θ+.6) + .012·sin(5θ+1.9) + .008·sin(8θ))`, sampled at 120 points/turn into an SVG path. Same phase for every ring, so they never touch.
- **You (mobile 1.43) draws ONE readiness ring, not the five domain rings** (§11 "You, readiness"); the rings below stay on Today and Results.
- Sizes: **Today 104** (`k .24`, `r0 13`, gap 3, **monochrome `accent`**, pith dot `r0×.32`) — shape only, the number sits beside it. **You 172** (`k .36`, `r0 34`, gap 4.2, domain tones, no pith, `70%` `stat` 30 inside + "ready" caption) with a legend listing domains outside-in, numbers in Fraunces 17. **Clearing mini 48** on forest (`sap` on `forestTrack`). **Results 200**, only for a mixed-domain set or a mock (mobile 1.39): same as You, but only the session's domains get rings (mobile 1.8). A one-domain MOCK is one thick ring in its tone, centred, with NO legend (a one-row legend was stranded at the right edge) and one centred `meta` line under it, "All IS Audit · 12 of 15" (mobile 1.22). A one-domain practice or review set (mobile 1.39) has no ring: one left-aligned `meta` line 8 under the headline, "All IS Audit" (mobile 1.43: no percent, and no "Correct" cell; the headline "8 of 10 right" is the count, said once), and none for a handful of questions (under 8, which get the "Most missed" fact instead). A one-domain mock's line under its ring is also just "All IS Audit".Mobile 1.11: on a phone narrower than 380 dp (most 360 dp Android phones), and at large text, the legend sits UNDER the rings (You and Results); its numbers never shrink (`flexShrink: 0`) and the domain name gives way (`minWidth: 0`, it may wrap), so "26/38" is never cut off.
- **Exam-ready panel** (Phase 5b, on forest): the rings use `sap` on `forestTrack`, like the clearing mini; its text column keeps `maxWidth: 250` beside them so it never runs under the frond art.
- Component: `<GrowthRings size mastery={number[]} weights={number[]} tone="domains"|"mono"|"sap" />`, paths `useMemo`'d. Accessibility: `accessibilityRole="image"`, label "Readiness 70 percent. IS Audit 88, IT Governance 63, …".
- Motion: on first view per day, arcs grow from 0 to value over 600ms `Easing.out(cubic)`, outer ring first, 60ms stagger (animate `strokeDashoffset` via reanimated `useAnimatedProps`; pre-compute each arc's length). Since 1.9 they also grow from the value last SEEN to now (Today, You, the clearing mini ring from this morning's readiness), never shrink, and Results grows the session's score once (§8.3 rule 10). Reduce motion → static.

### 10.2 Vine reveal — the answer moment
Order on the feedback screen:
1. **Verdict row**: leaf-mark (38pt teardrop: a circle with its top-right corner squared, `M35.5 2.5V19A16.5 16.5 0 1 1 19 2.5z`) in `correct`/`wrong`, white ✓/✗ 20 @2.5 stroke, + `hero` "Correct"/"Not quite" in the same colour. Under it a one-line `meta` coach line at left 50: correct → "Clean read."; wrong pick of the runner-up → "You picked the runner-up. That's the trap."; other wrong → "Check the role in the stem." At ×1.3 text and up (mobile 1.43) the coach line, and the hint / retest lines under it, start at the gutter (left 0) and wrap under the verdict, not in a narrow column beside the leaf.
2. **Answer rows** (mobile 1.43, §6 "Answer rows"): if wrong, the chosen option in `wrongBg` with a `caption` tag "Your answer" in `wrong` and its letter in a `wrong` badge; under it, its own note as "Why not C" (`PickNote`). Then the correct option in `correctBg` tagged "Best answer", its letter in a `correct` badge. If correct, only the correct row. Other options are hidden (not dimmed) on this screen; the full list stays in review. Every letter is a DISPLAY letter and every note goes through `renderText` (grading stays on original letters).
3. **"Why B"** `headline` + `correct_explanation` `body`. After a miss (1.24, 1.43) it comes AFTER the Key idea and Exam cue, folded: two lines and "Read more" (48pt). **The fold holds Eliminate two and Final two (owner decision, 1.43)**: "Read more" opens the whole explanation and then the second vine with both tips (spoken "Read more: the full explanation, Eliminate two and Final two"); "Show less" closes all three. No height animation (`Collapse`: what opens fades in; the vine inside draws as it opens, and is simply drawn under Reduce Motion). The Final two tip is never dropped, even after a runner-up pick (Trap Spotter, the slip coach and mindset growth read it). After a right answer nothing folds: Why, then the whole vine.
4. **The vine**: a 1.5pt `accent` stem at 55% opacity, x = 10 from the gutter, content indented 34. Nodes sit on the stem as leaves (on a `bg` knock-out so the stem appears to pass behind):
   - Key idea — 22pt filled `accent` leaf with `bg` midrib; `caption` "Key idea" `accentText`; text `quote` (italic) `ink`.
   - Eliminate — 16pt outline leaf, 18% fill, `tip` colour; caption `tip`.
   - Final two — same, `ink2`.
   - Exam cue — same, `accent`/`accentText`.
   - Tip text is `small` in **`ink`** (v1 used `ink2`; tips are the payload, not metadata). Labels are parsed from the tip prefix ("Eliminate:", "Final two:", "Exam cue:"); fall back to "Tip 1…" with `ink2` leaves. A 4th tip just adds a node.
5. **After an answer** (mobile 1.20, recomposed 1.22, 1.31): a hairline, then up to three `ListRow`s whose verb is on screen as a kicker. After a miss: "Read the note" over the note's name, `meta` "About 3 min · the idea this question tests" (BookOpen); "Take the lesson" over the lesson title, `meta` "5 min · Not done yet" (Play; spoken "Take the lesson: <title>, 5 minutes, not done yet"; only a lesson not done yet is offered, so it is never "Replay"). After ANY checked practice or review answer whose question carries a `principleId`: "Read the principle" over the principle's title, `meta` "How to think it through" (Compass; spoken "Read the principle: <title>, how to think it through"). Never in a mock, never in the first set, never inside a set started from that same principle. See "Lessons and notes are linked", §11.
6. **Source row**: hairline, `meta` "Original · Reviewed Oct 2026" left with the `Report a problem` link right (see "Report a problem", §11), then `meta` "Code d4_250 · COBIT DSS01".
7. **Header recap (mobile 1.22)**: once the verdict has scrolled under the header, the progress segments cross-fade (`CrossFade`, 120 ms; at once under Reduce Motion) to an 18pt disc (`wrong` with ✗, or `correct` with ✓, the ✓/✗ in `bg`) and one `meta` `ink` line "Not quite · Best answer D" (or "Correct · Best answer D"; at ×1.3 text and above the short "Not quite · D"), capped at ×1.3 and one line; one screen-reader stop with every word ("Not quite. Best answer D"). Scrolling back up brings the segments back, 8pt above the verdict's edge (hysteresis). Its words belong to the page on screen, so at a turn they fade out with the old answer instead of vanishing. Never in a mock (a mock shows no answer screen).
8. Sticky footer "Next question →". **Scroll content gets `paddingBottom = footerHeight + 24`** so the last node never sits under the fade.
- Motion: verdict leaf scales .6→1 (spring damping 16, stiffness 260) + `notificationAsync(Success|Error)`; answer rows fade-rise 200ms; when the vine scrolls into view the stem **draws downward** 520ms (`scaleY` from top, origin top) and each leaf pops (scale .4→1, 160ms) as the stem reaches it, with `Haptics.selectionAsync()` on the Key idea leaf only. Reduce motion → all static, haptic kept.

### 10.3 Botanical line art
- One drawing style: single 1.5pt stroke, round caps/joins, no fills (except leaf marks), leaves = quadratic "lens" shapes with a midrib, arranged along one quadratic-bezier stem. Generator `frond({p0,p1,pc,n,len,wid,ang,alt,taper})` (≈25 lines, see mockup script) emits one SVG path; seeds are fixed per placement so art never changes between renders.
- Placements: Today panel = upright frond (9 pairs); Practice panel = shorter frond; Learn "Up next" cover = alternate-leaf branch (lesson covers; one variant per domain by changing `alt`/`ang`/`taper` — 5 presets, no images); clearing card = tall frond; empty states = their own drawing (1.9, `EmptyArt`, 170×176 in `accent`): seedling (stem, 2 cotyledons, 1 true leaf, 3 fading soil lines; something new will grow here), fern (a fiddlehead uncurling beside one open frond: review brings questions back around), bookmark (a ribbon standing in the soil with a sprig drawn on it, a sprig growing beside it), pressed (a leaf taped to a herbarium sheet, the tape knocked out on paper, with its label), fieldbook (an open field book: a sprig on the left page, notes on the right).
- On `forest` it's `forestLine` (decorative, ~1.7:1 on purpose). On paper it's `accent`. Never behind body text on paper.
- **The plant, botanical (mobile 1.40; the default for new plants).** Your plant drawn in the same hand (`components/plant/botanical.ts`): one round-capped ink line, lens leaves with a midrib on quadratic stems, plus a soft watercolour wash of the plant's own colourway under the line, like a field-guide plate. No face, ever. Seed: an almond a third in the soil with a first curled shoot; Sprout: the Grove seedling (one stem, two seed leaves, the species' first true leaf); Shoot: a slim sapling; Bough on: five domain boughs leaving the trunk at different heights, each ending in a leaf cluster over a faint unlined wash; Crown: thicker limbs and root flare; Elder: the gift in line (acorns, samaras, blossoms, ripe mangoes) and two drifting leaves. The meadow is three soil lines; pots, planters, a chosen visitor and keepsakes are **inked** (a wash of their own colour under a theme line; shadows and highlights dropped). The line is set in POINTS (1.5pt at full detail, 1.3pt small, 1.25pt icon) and converted from the real render size, so it is a true 1.5pt on the 200pt screen and about 1.3pt in Today's tight 72pt frame. Colours: the `plantLine` token (the ink follows the theme: the palette's `deep` tone on paper, `light` on the night page; wood is bark mixed toward the page's ink; soil lines are `control`).
- Optional, low priority: a 4s ±1.5° sway on the panel frond (reanimated, `withRepeat`), paused when off-screen and under reduce motion.

### 10.4 Serif numeral system + italic voice
- **Every number a learner reads as an achievement or a quantity is Fraunces 500**: readiness `number` 52, `stat` 34 (You), 30 (clearing), inline counts 22–26 right-aligned in rows ("59 / due", "59 / open"), lead numerals 26 for mock sizes ("50 / questions"), segmented control numerals 20 ("10 questions"), lesson order numerals 22 in `ink2`. The unit sits under or after in Figtree `meta` 12–14. `%` is always a raised 0.48–0.5em superscript.
- Counters, timers and "4 of 10" stay **Figtree tabular** (they change while you watch; serif digits would jitter).
- Italic Fraunces = the coach speaking (Key idea, stage name, clearing "grew to" line). Nothing else is italic.

### 10.5 Paper and grain
- `bg` gets a tiled 256×256 monochrome noise PNG over the whole screen, `pointerEvents="none"`, absolutely positioned **above** content (so sticky bars, panels and rows share one texture) at `grainOp` (3.5% warm-black light since 1.21, was 5%; 4.5% white dark since 1.9, was 6%). It stays an overlay (decided 15 Oct 2026; moving it under the ink was considered and not taken). Generated once (`sharp`/any tool, offline) and committed as `assets/grain-light.png` / `grain-dark.png`.
- Contrast re-checked with grain worst-case: `muted`/`bg` ≥ 4.7:1. Grain is off in screenshots mode if it causes diff noise (flag in `npm run shots`).
- Hairlines stay `line`; no new cards. Dark-mode separation comes from `forest` lift + inner highlight, not shadows.

### 10.6 Haptics and motion signature (summary)
| Moment | Motion | Haptic |
|---|---|---|
| Select option | border/badge 120ms, press .98 | `selectionAsync` |
| Submit | leaf-mark spring | `notificationAsync` Success / Error |
| Vine | stem draws 520ms, leaves pop 160ms each | `selectionAsync` on Key idea leaf |
| Readiness rings (first view/day) | arcs grow 600ms, outer first | none |
| Next question | page turn: out 120 ms, in 280 ms (§8.3) | none |
| Save a question | filled bookmark pops (`spring.leaf`) | `impactAsync(Light)` |
| Plan item done | leaf mark in panel fills (scale .6→1 + colour 200ms) | `impactAsync(Light)` |
| Clearing | panel fades in, mini ring grows +delta, stats count up 600ms | `notificationAsync(Success)` once per day |
Reduced paths per §8.5 (the phone's Reduce Motion, live, or Settings → Motion); haptics respect the Settings toggle.

### 10.7 Large-text reflow rules (new, required)
- `PixelRatio.getFontScale() ≥ 1.3` → readiness row stacks (rings above number); hero title drops `maxWidth`; every stat row becomes a list (label left, value right); chips and segmented control wrap instead of scrolling.
- `≥ 1.6` → option badge grows with its letter (`30 × min(scale,1.6)`), sticky footer stays but the question is a plain scroll (stem first, options after); question meta wraps onto 2 lines (allowed).
- Every fixed `height` on a control becomes `minHeight` (pill 48, button 56, chip 40, seg 40).

---

## 11. Component recipes for the extra screens (v2)

**Game frame** (Play's games): `PushedHeader` with ✕, a segment bar per question and the running score (Figtree tabular, never shown below 0 during a round; the recap shows the real total with a true minus "−5") → the game's own header row (mobile 1.12, ui.md G1; one screen-reader stop "Forecast, 3 of 8", a header): its `GameGlyph` 22 in a 36pt `soft` circle, `label` name over `meta` "3 of 8", so a round never looks like a Practice question; it may carry a 48pt info `IconButton` ("How scoring works", `expanded` state) on the right → content in a scroll padded for the sticky footer. Opening the info panel scrolls to the top and moves screen-reader focus to its heading. A game an exam can't play yet (too few questions) shows an Empty state "This game is on the way" with "Go to Practice"; Play shows "Games are on the way" when none can be played. Never a number.

**Game rules block** (Forecast, called Sure Footing before 1.12): no card. On the FIRST play it sits in the game's intro (ui.md G3: never on top of the first question; "Start" counts as seeing it); after that it opens from the info button above the question, with "Got it". `headline` heading "How scoring works" → `small` `ink2` intro → hairline rows, one per level: `label` name left, points right ("+3 right · −5 wrong", tabular) and a `meta` description below ("You would put your name to it."). Each row is one screen-reader stop that speaks points and description. Rows wrap; at ×1.3+ the points drop under the name, left-aligned. Secondary "Got it" (behind the info button only); it closes when moving to the next question. The level choice itself is a `Segmented` radio group (Guess / Lean / Sure, no points on the pills, nothing selected at first), with the chosen level's points once underneath as a centred `meta` line ("+3 if right · −5 if wrong"). No betting words ("bet", "stake").

**Round recap** (every game's end): the game's glyph 40 in a 72pt `soft` circle (mobile 1.12; was a seedling 96) → `caption` "Round complete · Snare Spotter" in `accentText` → `number` 52 score → `meta` "out of 24 · best 14" → when there are 2+ rounds, `caption` "Last 5 rounds" over a 168 × 44 sparkline (mobile 1.12, ui.md G4: `accent` 1.75 stroke, open points on paper, the latest round a filled leaf on its point) and the scores under it, each centred under its own point (a row of equal slots as wide as the point spacing; at ×1.3+ text one compact tabular `meta` line "4 · 6 · 5 · 7 · 8") (one spoken sentence for both: "Your last 5 rounds: …. Best 8.") → a level change: the leaf (a level-up grows from the level before, once, after the score) beside "You've grown to Sapling. Your next round starts there." (the header score above is always one stop "Score 4", rolling or still) → "What caught you" `headline` → one hairline row per miss: `meta` stem start (≈90 chars), `caption` tag in `tip` ("Snare: …" / "Signpost word: FIRST"), one `small` line on why → `meta` "Missed questions are in your review." when any answer was wrong → the game's own note → primary "Play again", ghost "Done". Negative scores use a true minus.

**Snare Spotter reveal**: the best answer ✓ tagged "Best answer"; the learner's own wrong pick ✗ tagged "Your answer"; the real snare tagged "Snare" in the `tip` tone, never a ✗ unless it was their answer ("Snare · your answer"). Tapping the best answer in step 1 shows a `tipBg` block "That's the best answer, not the snare" naming the letter; the answer then earns no point and reads "Best answer: B (shown above)".

**Signpost step 1**: stem (priority word not marked yet) → `headline` heading "Step 1: what does this question ask for?" → four stacked secondary buttons, one per meaning (never the capital word). The footer repeats the step as a visual reminder only (hidden from screen readers). After a choice, the word is marked in the stem and a feedback block explains what it asks for ("MOST appropriate works like BEST").

**Settings → Study reminder** (since 1.17: Settings → Reminders, §16): `ToggleRow` "Study reminder" ("At most one a day. Turn it off any time.") and a row "Time and days" with the summary as its subtitle ("Weekdays at 7:30 AM"), which opens a sheet ("Done") with: two Steppers (Hour, Minutes) side by side, wrapping at large text → `caption` "Days" → seven checkbox chips Mon–Sun (wrap) → `meta` "At most one reminder a day. Turn it off any time." (or, while off, "Applies when reminders are on. At most one a day."). Permission is asked only when the switch is turned on; controls are disabled while it saves.

**Settings → Your data** (backup and restore, added in mobile 1.3; since 1.17 a `SettingsGroup` of rows: "Save a backup" with the status as its subtitle, "Restore from a backup" ("You see what changes before anything is replaced."), and "Undo restore" ("Available until 17 Oct 2026.") while it applies; the result block sits under the rows; "Reset CISA progress" follows, set apart by 32pt with its own `meta` line, "Deletes this exam's progress on this phone. It asks first."). Before 1.17: sits after the Study toggles and above "Reset progress". `Section` "Your data" with the `meta` "Last backup file made: 6 Oct 2026" ("made", not "saved": the share sheet can't tell us where the file went), "Restored from a backup saved on 3 Oct 2026" after a restore (until a newer file is made), or "No backup file yet". No nag notifications. → `small` `ink2` "Your progress is kept only on this phone. A backup file keeps it safe and moves it to a new phone. You choose where the file goes." → two full-width secondary buttons, "Save a backup" (opens the share sheet) and "Restore from a backup" (opens the file picker), each with a spoken hint; both disabled while one runs, label "Saving…" / "Opening…" → the result as a tinted feedback block (radius 16, padding 12): `caption` title + `small` `ink` text (4pt apart), `correctBg` / `correct` for "Backup file ready" ("If you saved it, you're set. On a new phone, choose "Restore from a backup" and pick this file."), "Restored" and "Restore undone"; `tipBg` / `tip` for problems ("Couldn't restore", "Restore didn't finish", "Can't undo"). Problems are calm and give a next step; read-time problems end "Nothing was changed." Never `wrongBg` (nothing went wrong with the learner's answer). The block is NOT a live region: it is announced once, ~600 ms after it appears (queued behind other speech on iOS). → after a restore, a ghost "Undo restore" (left edge lined up with the text below) and the `meta` "Available until 17 Oct 2026." for 7 days; it asks first with a system alert: "Your progress goes back to how it was on <date>, before the restore. Anything you studied since then will be replaced." (destructive "Undo restore"). Free, offline, no account: never behind a paywall. **Section headers** (every `Section`) stack the title over the meta at ×1.3+ text, both allowed to wrap.

**Restore preview** (a page sheet, slides up; fades in under Reduce Motion; swipe-down and Back do nothing while it saves): `display` "Restore this backup?" → `meta` "Saved on 7 Oct 2026" → `body` `ink2` "The progress on this phone will be replaced by the backup. You can undo this for 7 days." → when the backup looks older than the phone (fewer answers, or an earlier last study day), a `tipBg` block: `caption` "Older backup" + "This backup is older than this phone. Restoring it replaces the newer progress here. You can undo this for 7 days." → when a quiz is paused, a `small` line "Your paused session will end." → six hairline rows (1px `line` above the first and below each): `label` name (Exam, Exam date, Questions answered, Last studied, Best streak, Study reminder), then two columns, `meta` "This phone" / "Backup" over the values. The current value is `body` `ink2`; a backup value that changes is `label` `ink` (bold), one that stays reads "CISA (same)" in `body` `ink2`. Never the bank size ("200 questions", never "200 of …"). At ×1.3+ text the two columns stack (This phone, then Backup), so nothing is cut off at 200%. Each row is ONE screen-reader stop: "Exam date. On this phone: 17 Nov 2026. In the backup: 24 Dec 2026." (plus "No change." when equal) → danger "Replace my progress" (hint: "Replaces the progress on this phone with the backup. You can undo this for 7 days.") → secondary "Cancel". The buttons sit at the end of the scroll, not in a sticky footer, so the facts are read first. The confirmation is drawn in the sheet (not a system alert) so it reads the same on every platform. **Fresh variant** (the welcome screen, when the phone has no progress yet): body "This puts the progress from your backup on this phone.", each row shows only the backup's value, and the button is primary "Restore my progress"; no undo snapshot is kept (there is nothing to go back to). In Settings the preview always compares, even on a new phone, because the exam date and reminders chosen there would be replaced.

**Pace strip** (mobile 1.4, `components/pace.tsx` `PaceStrip`; the ONE timer/pace component for mock exams, timed practice and Daylight): sits under the screen's header, outside the scroll, padded `gutter`, min height 48. Row 1: a 16 clock icon + the clock in Figtree tabular `label` `ink` ("12:04") + `meta` unit ("left"; in practice "so far", or "paused" while the explanation shows); "Clock hidden" or "Untimed" instead of numbers when chosen. Row 2 (beside it when it fits, below at ×1.3+ text or when it wraps): an icon + `meta` pace line. Tones: a pace status (gauge icon), `cue` (flag icon, only where a Flag button exists), `soon` (clock icon, clay: the practice 2-minute line "Over 2 minutes on this one. On the exam, flag it and move on.", "Less than 5 minutes left." with the clock hidden, Daylight's "About a minute of light left."), `note` (clock icon, `ink2`). Colours: `ink2` for "On pace", "Ahead…" and notes; `clay` for "About N min behind. Flag anything past 2 minutes and move on.", `soon` lines and the mock clock's last 5 minutes. **Never `wrong`, never pulsing.** At ×1.3+ text the strip shows a short line ("About 6 min behind", "Behind pace") so it never crowds the question; screen readers still get the full advice. The whole strip is one screen-reader stop, and its clock is spoken in whole minutes ("Time left 12 minutes. On pace"), then 10-second steps under a minute ("30 seconds or less"), so the label doesn't change every second. "Less than 5 minutes left." is announced once, clock shown or hidden. Mock pace lines change ONLY at the 25 / 50 / 75% checks, and each check is announced once. Daylight adds a pace bar (8pt `track`, `accent` fill = questions answered, a 4×14 `ink` tick with a 1px `bg` edge = where an on-pace learner would be, visible on the fill; the tick glides, and steps in tenths under Reduce Motion) and makes the strip a button ("Reads the pace aloud.").

**Mock start sheet** (`app/mock-start.tsx`, before every mock: Practice's Mini / Full mock rows and Today's mock item): pushed header with ✕ and "Mini mock" / "Full mock" → `meta` "50 questions · 1 h 20 min · feedback at the end" → `Section` "Timing" → a radio group of 4 hairline rows (64pt; 22pt ring, filled `ink` dot when chosen, so the choice is shape not colour): `label` name + tabular `ink2` length ("+25% time  1 h 40 min", spoken "1 hour 40 minutes"; the Untimed row has no length) over a `meta` note ("Extra time, as an exam accommodation allows.", "No clock. Left out of your pacing stats.") → `ToggleRow` "Hide the clock (checkpoints only)" ("The time limit still applies…"; disabled for Untimed) → `small` line with the checks and the target pace from the exam facts ("Aim for about 90 s a question…") → primary "Start mock". Standard is preselected; extra time stretches every pace by the same factor.

**Results, mobile 1.43 (board 2, owner decisions; supersedes the 1.24 actions and the 1.20 notes expander below)**, top to bottom:
- `meta` set title → `display` headline, ALWAYS the count ("8 of 10 right", "All 8 right"; never "Strong work." before it) → the "Most missed" fact (under 8) or "All IS Audit" (one domain, no ring).
- Rings for a mixed set or a mock, as before.
- **Leaf strip** (`components/leafStrip.tsx`, practice and review sets of up to 20, never a mock): one 14×22 leaf per question in the order shown, `ResultLeaf`: right = filled `correct` with a `bg` midrib; missed = an open `wrong` leaf with an ✗ (shape and colour); not answered = a `muted` outline. Rows of 10 (rows of 5 under 380 dp or at ×1.3 text), the number in `caption` `wrong` ONLY under a missed leaf (the slot stays, so rows align). ONE screen-reader image, "Right: 1, 2, 4, 5, 6, 8, 9 and 10. Missed: 3 and 7." It never animates (the rings are the one growth). Above 20, and on every mock, one `meta` line instead: "12 missed. Each one is in Review answers below." / "20 missed, 10 of them left blank: a blank counts as not correct."
- Stat row: Time, and "Per question" ("42 s", note "Exam pace: about 96 s"; 3+ timed answers; not on a timed mock, whose Pacing panel already has it). No "Correct" or "Missed" cell. Then the mock lines, "How sure you felt", the Pacing panel, as before.
- **What happens next**, an `InviteRow` on the paper (sprout; never a plate): "The 2 you missed come back tomorrow" / "In your review, spaced so they stick. Nothing to redo now." Shown only when the misses were scheduled as they were answered (practice, review, Guided); never on a mock. It is true: a fresh miss is due at the start of the next local day (`engine/srs.ts`, the web's rule too). A set with nothing missed gets "A clean set" / "Nothing to redo. Your review brings questions back when they are due."
- **What you missed** (`Section`, with a "See answers" action that scrolls to Review answers and moves screen-reader focus to its heading; the learner wants the questions, not only the notes): up to three note rows, OPEN (no expander), grouped by note, most-missed first, each with the kicker "Read the note · questions 3 and 7", the note's name and "About 2 min"; then `meta` "And 2 more in your review." (a mock: "…in Review answers below.") for misses no row covers.
- Primary "Done" (or "Back to your Guided step"), then "Practice the N you missed" as a centred ghost (48pt): a retest minutes later earns no spacing credit, and the misses come back tomorrow anyway. Guided adds the ghost "Done".
- Badge moment, then "Review answers" (every question, the full answer rows, unchanged; for a mock the only way to see answers).

**Results actions (mobile 1.24: "Done" is now the one solid button and "Practice the N you missed" is secondary, because an immediate re-answer no longer counts as learning it; the 1.22 text follows for history) (mobile 1.22, design spec §8)**: ONE primary ("Practice the one you missed" / "Practice the N you missed"; for a Guided step "Back to your Guided step" follows as a secondary), then "Done" as a centred ghost (48pt, at least 120 wide) under it, no longer a second full-width outlined pill. With nothing missed and no Guided step, "Done" is the primary. The badge moment follows, then the notes expander ("Notes for what you missed") just above "Review answers".

**Results, honest counts (mobile 1.24)**: under 8 answers the `display` headline is the count ("3 of 4 right", "All 5 right", "Right"), never a verdict ("Strong work." needs 8+), with one `small` `ink2` fact beneath ("Most missed: <topic>."; "Missed: <topic>." after a single miss). The count is said ONCE: the ring's centre names the domain (one domain; the "All IS Audit · 2 of 3" line is left out) or stays empty, and the stat row leaves out "Correct" (Missed and Time stay). When 5+ answers were rated, one `meta` line under the pace line: "How sure you felt: Sure 7 of 9 right · Unsure 2 of 4 right" (the lead-in says what "Sure" refers to; only the levels used). A review row's quiet notes ("You used a hint.", the pace advice) are separate `meta` lines, so the hint never reads as the cause of the advice.

**Results → Pacing** (timed mocks): `Section` "Pacing" under the stat row, then hairline rows, each `meta` label over a tabular `label` value, one screen-reader stop each: "Time used" ("1 h 11 min of 1 h 20 min"), "Median per question", "Pace checks" ("25%: on pace · 50%: on pace · 75%: 9 min behind"), "Unanswered when time ran out" / "Unanswered at submit", "Last 10% of the time" ("50% right (69% before that)"), "Slowest domain" ("IS Operations, median 140 s"). No card, no colour. Values are spoken in words ("1 hour 11 minutes of 1 hour 20 minutes", "about 60 seconds"). Mobile 1.11: no jargon: "Typical time per question" ("About 74 seconds", never "Median 74 s"), "Slowest domain" ("IS Operations, about 140 seconds per question"), and no unanswered reads "None". An untimed mock instead gets a `meta` line ("Untimed mock: your answers count toward readiness, and pacing stats leave it out."), and its title and history row say "· untimed" (extra time says "· +25% time"). Practice and review results show one plain `meta` sentence under the stats, only when there are 3 or more timed answers (a 1-question session says nothing about pace): "About 74 seconds per question. The exam allows about 96 seconds." (both figures carry their unit, the same unit; past two minutes, rounded first, both in minutes: "About 2.7 minutes per question. The exam allows about 1.6 minutes."). The pacing panel's "Time used" says "Under 1 min of 1 h 20 min" like the Time stat above it. You → Mock exams: "In your 2 timed mocks you took about 90 seconds per question. You answered every question in 1 of 2."

**Coaching tags** (Results review rows only): a quiet `Tag` beside the status ("Quick pick" under 30 s and wrong; "Took its time" over 3 min and right) and a `meta` line under it ("Slow down on the stem." / "You knew it; trust the first pass."), included in the row's spoken label. Only on those two cases; coaching, never a penalty colour.

**Practice → Timed** (mobile 1.4; since 1.5 it sits under the path row and reads "Your path and Build a set. Counts up while you answer; never a countdown."): a `ToggleRow` "Timed" right under the Quick 10 panel ("Quick 10 and Build a set. Counts up while you answer; never a countdown."). It starts from Settings → Study defaults; flipping it here changes only the next start. When on, the Quick 10 meta ends "· timed" and Build a set's button reads "Start 20 questions, timed". **Offer card** (once): a raised card above Quick 10 when the exam is 21 days away or less, or at the mock / ready stage: `headline` "Practice at exam pace?" → `small` `ink2` line with the exam pace → secondary "Turn on Timed" (an offer, never a primary push), ghost "No thanks" (hint: "Hides this card. You can turn the timer on in Settings."). Either answer hides it for good, and so does choosing in Settings; only "Turn on Timed" switches the timer on (announced), and screen-reader focus then moves to the Timed switch. The card never shows while the switch is on.

**Settings → Study defaults** (mobile 1.4; mode added in 1.5; since 1.17 the "Practice" group, §16: a "Default mode" row whose choices open in a sheet, then the Timed practice and Shuffle switches). Before 1.17: a `Section` after the Study toggles and above Your data: `ToggleRow` "Timed practice" (off by default; since 1.5 it starts EVERY non-mock practice session timed, and Practice's own switch can change it for one set), then `caption` "Default mode" over a radio list (`RadioRow`): "Follow my stage" (the app's suggestion: Random, then Guided, then Smart) and the four modes with their one-line whys. It is the same saved choice Practice remembers.

**RadioRow** (`ui.tsx`, mobile 1.5): one choice in a radio list. `disabled` (1.17, an exam that is coming soon): `muted` text, a `line` ring, spoken dimmed; the badge says why ("Coming soon"). 22pt ring (2pt `control` outline; chosen = `ink` outline + 10pt `ink` dot: shape AND colour), `label` title with an optional `caption` badge in `accentText` ("Suggested") beside it, `meta` line under it, hairline inset 36. The whole row (64pt min) is the target, spoken as a radio with its checked state, inside a `radiogroup` View.

**Practice → Choose your path** (mobile 1.5): the forest hero now starts the learner's path instead of Quick 10: `caption` "Smart · All domains", `hero` "10 questions picked for you" / "10 questions, topic by topic" / "10 mixed questions" / "Next topic: <topic>" (Guided), `meta` the mode's why + "About 12 min" (+ " · timed"), pill "Start" (Guided: "Open step"). Under it, `Section` "Choose your path" (`meta` "Suggested for your stage" until the learner picks) → four `RadioRow`s (Smart, Guided, In order, Random; the stage's suggestion carries the "Suggested" badge) → domain chips (All domains + each domain) → serif `Segmented` 10 / 20 / 50 questions (Guided shows the `meta` "Guided goes one topic at a time, so each step has its own length." instead). Every tap is saved at once. Then the Timed switch ("Your path and Build a set…"), the review / weak area / bank rows, Build a set, mocks. **Build a set** gains a second chip row once a domain is picked: "All topics" + one chip per outline topic (name before its first comma, cut near 28 characters with "…"; the chip's spoken label is the full name).

**Practice → one action, one row** (mobile 1.5, beginner-load redesign; supersedes the layout above, `app/(tabs)/practice.tsx` + `components/pathChooser.tsx`). Who: a beginner with ten minutes. The one job: start the next useful set in one tap. Order: `display` + subtitle → offer card (once) → forest hero → [ghost link] → path row → Timed → `Section` "More ways to practice" → `Section` "Mock exams".
- **Hero:** `caption` "Your path" (never the mode name: the row below says it), `hero` naming the path, never a count (1.21: Smart "Picked for you", In order "Topic by topic", Random "A mixed set", Guided "Next topic: …"; short, so it keeps clear of the frond without `wideTitle`), `meta` the count, length and timing ("10 questions · about 12 min · timed"; Guided: "Learn it, practice it, then mix it with earlier topics."). The one-time "Practice at exam pace?" offer is an L1 plate (an offer, not a choice). Sections use `Section`'s own 32 top margin. The mode's one-line why is said once, under its radio, never in the hero. Pill "Start" / "Open step".
- **"Or 10 mixed questions"**: a ghost button (48pt, text aligned to the gutter) right under the hero. It starts Random · All domains · 10 (timed if the switch is on) and leaves the saved path alone. It shows whenever the hero isn't already a 10-question mix across all domains: always in Guided, and for In order, a single domain, or 20 / 50 questions. So a quick mixed 10 is one tap for everyone, and it never doubles a hero that already does it.
- **Path row** (`DisclosureRow`): 56pt min, no icon. `label` summary "Smart · All domains · 10 questions" (Guided: "Guided · All domains"), and on the right `label` "Change" in `accentText` with an 18 chevron-down (flipped, and "Close", while open). Spoken "Your path: Smart, All domains, 10 questions. Change", a button with `expanded` state and the hint "Shows the study mode, domain and length the Start button uses." At ×1.3+ text "Change ⌄" drops under the summary. It starts closed on every visit.
- **Path chooser** (opens in place under the row, so the row and the hero just above update as you tap; 1px `line` rule under it): `caption` field label **Mode** → the four `RadioRow`s with their whys and the "Suggested" badge on the stage's mode (no "Suggested for your stage" meta, the badge says it) → **Domain** → chips → **Length** → serif `Segmented` 10 / 20 / 50 (Guided: the `meta` note instead) → secondary "Done" (closes, and screen-reader focus returns to the row). Every tap saves at once, except that **tapping the mode already chosen saves nothing**, so "Follow my stage" (Settings) survives a stray tap.
- **Timed** stays visible under the path row (it covers the path and Build a set, and the offer card moves focus to it).
- **More ways to practice:** Spaced review, Weak area, Question bank, then **Build a set** as the last row (`DisclosureRow` with a ListChecks icon, "Pick a domain, topic and difficulty", chevron only). Opened, it shows its own labelled groups: **Domain** chips → **Topic** chips (once a domain is picked) → **Length** `Segmented` → **Difficulty** chips → secondary "Start 10 questions[, timed]". It is a one-off: it saves nothing and never changes the path. It stays separate from the path chooser on purpose. The path is remembered and drives the hero every day; Build a set is the only place with topic and difficulty, which the study modes don't take. Both start closed, so their look-alike controls are never on screen together by default, and every group carries a visible name.
- **Segmented** (all screens): items 44pt min with a 2pt `hitSlop` (48pt to the finger), radius 22, inside a `soft` track with radius 25 and a 3pt inset.
- Screenshots: `SHOTS=practice bash scripts/screenshots/run.sh <out> <light|dark>` (first screen, whole tab, Guided, path open, Build a set open, approximate 200% text).

**Reason tag** (session, mobile 1.5): Smart questions show why they are here — "Due", "Weak spot", "New", "Refresher" — and In order / Guided tail questions "Mixed review": a `caption` in `accentText`, right-aligned on the domain meta row (beside "Flagged"), spoken "Why this question: Weak spot". When Smart's recent accuracy is under 55%, a missed weak-spot question adds a `ListRow` "Read the note: <subtopic>" (BookOpen icon) above the trust line, unless the lesson row is already there.

**Guided step** (`app/guided.tsx`, mobile 1.5): pushed header "Guided" → `Tag` (domain dot + "1A1 · IS Audit") → `hero` topic name → `meta` the Guided why → `Section` "1 · Learn it" (`meta` Done / Lesson / Study notes) with the topic's lesson rows (or its subtopic notes) and a 28 read circle → `Section` "2 · Practice it" + `body` `ink2` "5 questions on this topic, foundational first, then application." → `Section` "3 · Mix it" + `body` `ink2` line (first topic: "From your second topic on, …") → a note block (radius 16, padding 16): `soft` with `caption` "Not clear yet" in `accentText`, or `correctBg` with a ✓ and "Topic clear" in `correct`, then `small` "Lesson done. To clear it, get 4 of your last 5 answers here right (so far 2 of 2). You can move on at any time." → primary "Start this step" (arrow-right since mobile 1.22: Play means a lesson) → ghost "Next topic: <name>", always enabled (never a lock). Results for a Guided step adds "Back to your Guided step".

**Study notes → Practice this topic** (mobile 1.5): on a notes domain page, a secondary full-width "Practice this topic" button after each topic's subtopic rows (only when its notes list questions). It starts the topic's questions, its subtopics interleaved, up to 20.

**Game intro with levels** (Root or Rumor, Call It First; `GameIntro` in `components/game.tsx`, mobile 1.5): Daylight's pattern — pushed header with the game name → 48 line icon in `accent` → `caption` "<skill> · about N min" → `hero` tagline → `body` `ink2` rules → `Section` "Pick your level" → `Segmented` Seedling / Sapling / Heartwood (spoken with what each level does) → centred `meta` line for the chosen level → primary "Start".

**Root or Rumor** (Play, mobile 1.5): the game frame; `caption` "Sound principle, or exam myth?" in `accentText` → `meta` "From the note: <subtopic>" → the statement in `stem` → `meta` "Root: a sound principle. Rumor: an exam myth." Footer: two secondary buttons "Root" and "Rumor" side by side (full width each at ×1.3+), spoken "Root, a sound principle" / "Rumor, an exam myth"; text labels, never colour alone; no swipe. After a tap: `caption` "You said Root · right" (`correct` / `wrong`), then a `RevealCard`: "Rumor: myth spotted" / "This one is a Rumor: a myth the exam counts on" with the trap's why, or "Root: a sound principle" / "This one is a Root: a sound principle" with "A true principle you can lean on in the exam." A ghost "Read the note" follows every Root and every missed Rumor. The card is spoken with the verdict first ("You said Rumor, right. Rumor: myth spotted"). Heartwood asks "Why is it a myth? Pick the reason." first: announced with the verdict when the buttons give way ("You said Rumor, right. Why is it a myth? Pick the reason."), three option rows A–C in a `radiogroup` "Why is it a myth?", then marked. Footer "Next statement" / "See results". End: the shared recap with "Missed statements come back in a later round.", `small` "Longest run of right calls: N", Heartwood's "“Why?” right: N of M", and a "Read again" list (BookOpen rows) for any subtopic with 2+ missed statements.

**Call It First** (Play, mobile 1.5): step 1 shows the stem only (no options) and three principle cards as option rows A–C; footer label "Step 1: which principle does it test?". A quiet "Show a hint · A hint counts half." control (Lightbulb, like Coach me) reveals the pre-read line with "Assisted. Counts half toward readiness." After a pick, a `caption` "Step 1 · your call" heads the cards, and only the real principle (✓, tag "The principle") and a wrong pick (✗, "Your pick") stay. They are spoken ", the principle" / ", your pick, the principle" / ", your pick, not the principle" (`OptionCard` `spokenSuffix`), never "best answer". A `caption` says "Principle named. Now find the option that matches it." (or "The principle is marked above…") and the four options appear under it, scrolled into view; footer "Step 2: pick the BEST answer". Heartwood: no cards; a `soft` block with the EyeOff icon, `headline` "Options hidden", "Name the principle in your own words first." and `meta` "Options in N s" for 10 seconds (screen-reader focus moves to it), then the options (announced "The options are ready."). The answer time counts only the time the options are on screen. The reveal is the usual `RevealCard` with the explanation. Recap tags read "Principle: …".

**Daylight** (Play, mobile 1.4): (1) Pick a light: pushed header "Daylight" → the Daylight glyph 48 in `accent`, its sun rising 4pt into place once as the intro opens (mobile 1.12) → `caption` "Pacing" → `hero` "Answer at exam pace." → `body` `ink2` rules → `Section` "Pick your light" → `Segmented` Seedling / Sapling / Heartwood (spoken with seconds and "suggested") → `meta` "96 s a question · 8 min of light" + "Suggested: Sapling, from your recent answer times." → primary "Start". (2) Round: the game frame plus the pace strip with the pace bar; footer "Pause" + "Flag & move on" (secondary, side by side; full width at ×1.3+), and on Seedling a ghost "Add a minute" (up to 10 times, then it goes). With 10% of the light left the strip line becomes `soon` "About a minute of light left." (+ " You can add a minute." where allowed); on the last question "behind" reads just "Behind pace." (nothing to flag). Announcements wait ~350 ms. After Pause, focus moves to Resume; after Resume, back to the strip (tap it to hear the exact time). Answering shows the usual reveal block with the seconds taken and `meta` "The light waits while you read this." Paused hides the question (the Daylight glyph, `hero` "Paused", "The light holds until you resume.") with a primary "Resume". (3) End: the shared round recap, then `headline` "This is where time went" (light used, average seconds vs the light's seconds, the slowest question) and, when the light set, `headline` "The light set before these" with `meta` "Shown, not marked wrong. They are in your review." and one hairline row per question with its best answer. No red, no pulsing.

**Badge moment** (Results and a game's round end; mobile 1.6, redesigned 1.10): at most ONE per session. On Results it sits AFTER the score, the stats and the review actions ("Practice the ones you missed", "Done"), before "Review answers", so learning feedback comes first; on a round end, under the score. No card: the key-idea recipe — 3px `accent` rule on the left, the badge's 64pt medallion in its own column, `caption` "A new badge · Evergreen" in `accentText`, `headline` badge name (a tier names its metal: "Rooted · 30 days · Lichen"), `small` `ink2` unlock line (what the learner can now do, never the rule again), `meta` "That completes Evergreen." only when it does. Under it: ghost "See it in your badges ›" (opens the case with this badge's sheet up) and, on Results only, one `meta` "Next: Firm Footing · IS Operations, 62% → 70% · 14 of 20 answered". Never "Unlocked!", "Collected!" or "Congrats". One `notificationAsync(Success)` (Settings can silence it); announced once. No confetti, no sound, no push notification. Any other badge earned waits for a later session. With Settings → Show badges off, there is no moment.

**Round end, mobile 1.6 lines**: under the trend, centred: `meta` "New personal best" in `accentText` (a text line, never a badge), then a `TierLeaf` + `small` line when the level moved: "You've grown to Sapling. Your next round starts there." or "Back to Sapling. Two strong rounds grow it again." (never "lose", never a warning colour). The milestone moment, if any, follows, but never after a level-up: one celebration per round end, so the milestone waits in the queue for a later session. "Play again" starts on the new level.

**Badges** (You → Badges, `app/milestones.tsx`; the route keeps its name, mobile 1.10, badges_game.md §4): pushed header "Badges" → `meta` "Earned by what you've mastered. Once earned, a badge stays." → the one-time back-fill block (key-idea recipe, `quote` "You'd already earned 4 badges.") → **Next for your exam** (hidden after the exam date): slot 1 in the screen's one `forest` HeroPanel (`caption` "Next for your exam", `hero` badge name, spoken "Next for your exam: <name>", `meta` "26% of the exam · 62% → 70%" or the rule, a row of the 56pt medallion (`surface="forest"`: on-forest inks) beside a 6pt `sap` bar on `forestTrack` and its answer count, or the effort fact when there is nothing to fill; pill "Study for this", hint "Studies for <name>") then slots 2–3 as hairline rows (40pt compact medallion, `label` name, `meta` progress, 6pt bar, ghost "Study for this ›" spoken "Study for <name>"; a `meta` note when it matters: "Nothing due today. Smart mixes in older questions.") → filter chips All / Earned / Not yet (this visit; spoken "All badges", "Earned badges", "Badges not yet earned") and a ghost "Sort: By set ▾" (spoken with its expanded / collapsed state) that opens RadioRows in place (By set, Recently earned, Closest, Effort; kept on this phone in `store/seen.ts`); picking one closes the menu and returns screen-reader focus to the Sort button. Closest and Effort list the exam's own core badges first, then its Stretch tiers, then Field notes (a game skill or a Stretch tier never outranks what the exam needs). Mobile 1.11: slot 1 is never a Stretch tier (it is "Best for your exam"); slots 2–3 put any core badge before a Stretch tier; and when nothing fits slot 1 (its rules are all done), a `caption` "Next for your exam" header in `accentText` still names the rows, unless every row left is a Stretch tier: then the header reads "If you want to go further", a `meta` line in `ink2` adds "These go beyond what the exam needs. Entirely optional.", and each row's ghost button reads "Go further ›" (spoken "Go further: <name>. Optional, beyond exam need"). "Next for your exam" never labels depth beyond exam need. A Stretch row's `meta` line starts "Stretch · ". → the shelves, in journey order: Groundwork, The Five Domains (named for the exam's count), Evergreen, Sound Judgement, Exam Day, Rooted, Moments (only once something on it happened: an unearned Fresh Start is never shown, in any sort or filter, so a week away never reads as a goal), a hairline, Field notes (+ ghost "See game levels ›"). Each shelf: `headline` name, `meta` count ("2 of 3", "3 of 3 · Complete · 2 Nov" in `accentText`; Moments has none; never a grand total; the count is the set's CORE marks only), `meta` purpose line ("Cover the exam as it's weighted."), then a grid. **Mobile 1.11:** a set that was complete (it gave its planter) and has since gained badges adds one `meta` line in `accentText` under its purpose: "New in Evergreen: 2 badges added since you completed it." (news, never a task or a loss: the planter stays). It shows for 14 days from the first time this phone showed it (`seen.values["badges:grown:<cert>:<set>"]`), then goes; hidden after the exam. A set with Stretch tiers ends with its **Stretch row**: a 1px `line` rule, a `caption` header "Stretch · beyond exam need · 1 of 5" in `ink2` (spoken "…, Extra, never needed to feel done."), then its own grid. **The catalogue line** (once, the first visit after a newer catalogue filled in what the study already earned): the key-idea recipe above the Next panel, `caption` "New in your badges", `quote` "Badges now have higher tiers, plus a new one: Took Root. Your study so far already earned 2 of them." (counted like the back-fill: milestone badges, each once) Those badges are stamped with the fill's time and read "By 11 Oct" like back-filled ones, never "new". **Grid**: 3 columns with 88pt medallions (2 columns with 104pt at ×1.3 text; at ×1.6 a list of 48pt `BadgeListRow`s), 8pt gaps; each cell is ONE button (hint "Opens its details"): medallion → `label` caption ("First Foothold"; Firm Footing: the domain's short name, then a `DomainDot` + `meta` "26% of exam"; Rooted on its shelf: "10 days") → `meta` line: earned date in `accentText` (tiers prefix the metal: "Clay · 11 Oct"; Firm Footing's 80% Stretch row shows `DomainDot` + "80% mastery" in place of the weight; a badge the back-fill or the catalogue fill saved reads "By 11 Oct", spoken "Earned by 11 Oct", and a set it completed "Complete · by 11 Oct"), or progress ("14 of 20 answered", "62% → 70%") in `ink2`, or "Opens later" when gated; flat sorts add the set's name in `muted`, and a Stretch tier adds the word there ("Evergreen · Stretch"), since a flat sort has no Stretch row header (Firm Footing keeps its name: "Firm Footing · IS Operations"). Spoken: name, state ("Earned 11 Oct" / "Not yet"), the rule, progress or the gate ("62% now, aiming for 70%": never the arrow), the domain's weight, the set. Filters keep shelves and say "Nothing earned here yet." / "All earned." when empty. In the final three weeks it opens scrolled to Exam Day; from Field notes (`?shelf=fieldNotes`) at that shelf, by set for that visit (the saved sort is untouched); the jump measures the shelf's outer view in the scroll content. After the exam it is a keepsake album (no Next panel, no progress lines or traces, no Closest sort). Footer `meta` "Answers after Coach me and game answers don't count toward study badges. Nothing here is ever taken away." No bank size anywhere.

**Medallion** (`components/medallion.tsx`, art built by `scripts/badge-art/build.mjs` into `content/badgeArt.json`): one 200-unit grid; full cut ≥ 48pt (ribbon, beads, pips, laurel, growth rings), compact ≤ 47pt (emblem ×1.08, none of those). The SET is a frame shape plus an enamel, so no two sets differ by colour alone: Groundwork round seal + forest; The Five Domains hex + paper; Evergreen hex + forest; Sound Judgement shield + ink; Exam Day shield + clay; Rooted round seal + clay; Moments the round seal as a passport stamp (paper, a dashed postmark ring, no ribbon); Field notes the leaf-mark + paper. The TIER is the rim metal, pip count and (Gold leaf) a laurel, with beads from tier 2: tier 1 Clay, tier 2 Lichen, tier 3 Gold leaf, always by number (mobile 1.11 ladders: Rooted 10 / 30 / 60 days, Long Memory 25 / 75 / 150 recalls (150 Stretch), Dress Rehearsal 1 / 2 / 3 mocks (3 Stretch), Firm Footing 70% Clay / 80% Lichen per domain (80% Stretch)); one-mark badges have no tier: the calm `badgeStruck` sage, a plain rim, no pips, no beads, no name. Light cut ≤ 64pt: no growth rings and no cast emblem shadow (fewer SVG nodes). `surface="forest"` draws a not-yet badge in the on-forest inks. Props are primitives (`domainIndex`, `domainCount`), so the memo holds. Firm Footing's five domain leaves sit on the rim in blueprint order, this domain's filled forest with a `sap` midrib. **Mobile 1.11 emblems:** each domain wears its own (`DomainInfo.emblem`, prop `emblem`; an exam without one keeps the tree-ring slice): IS Audit a balance weighing the evidence, IT Governance a ship's helm with its king spoke in clay (to govern: to steer), IS Acquisition a staked sapling with its label tied on, IS Operations a windmill, Info Protection a chestnut in its husk, split open so the nut shows (two husk halves with five long spines each: never a ring of spikes, which read as a sun or a virus at 32pt). An emblem's `fine` detail (the windmill sails' lattice) is left out at 47pt and under, where it turned to noise: the sails are solid there. **Took Root** (Evergreen) is a fern rooted in the ground: one frond open and one still furled as a spiral fiddlehead (wound twice, so it never reads as a hook or "?"). All drawn to the art rules (one silhouette, ≤ 3 tones, knock-out detail), checked at 32–200pt, earned and not yet, light and dark. Not yet: stitched dashed `control` outline, flat `soft` field, `muted` one-tone emblem, an `accent` trace from the top by progress; gated: a dotted outline, no trace. Never a padlock, "?" or silhouette, and never a padlock, tick or check emblem on a shield. Frames are generic heraldic shapes (round seal, hex, heater shield, leaf) with botanical emblems; no cups, trophies, gym-badge shapes, platinum or points. Decorative to screen readers (the button around it speaks). Unique gradient and clip ids per instance (`useId`). A completed counted set saves its planter (`milestones.planters`, for the Phase 4 plant; nothing shows it yet), and a set that later gains a badge never takes a planter back. `syncPlanters` (idempotent) also runs at launch and after a restore, so a set completed before planters existed gets one. A save from before 1.11 (even a 1.9 save that skips 1.10) also gets, once, the planter of every set whose 1.10 list (`PLANTER_NEEDS`, frozen) it had completed, dated when the last of those badges was earned; a learner who starts on 1.11 gets a planter only for the set as 1.11 has it. **Took Root** is in an exam's catalogue only when its pack has a study-notes topic with questions (it is Evergreen core, so an exam without notes would otherwise never complete Evergreen). **Dress Rehearsal · 2 and · 3** count only full mocks finished on or after the day Whole Map was saved, so the session that first reaches Whole Map never earns them with it.

**Badge sheet** (tap a medallion): a `pageSheet` Modal on `raised2` (dissolves under Reduce Motion), ghost "Close" (spoken "Close <name>"), the 160pt medallion turning in once, a header group (`hero` name, `meta` "Rooted · Lichen, tier 2 of 3" / "The Five Domains · 26% of the exam") that takes focus. Earned: the key-idea block (`caption` "Earned 11 Oct", or "Already earned when badges arrived (by 11 Oct)" for a back-filled badge; `quote` unlock line; `meta` "This completed Groundwork on 2 Nov." on the ONE badge that did: of two earned together, the later in catalogue order, and never on a back-filled badge). Every tiered badge (mobile 1.11: Rooted, Long Memory, Dress Rehearsal, each Firm Footing domain) shows its ladder: a "Tiers" row of 56pt medallions, each with the metal name (`label`), the tier in words (`meta` "30 days", "75 recalls", "2 mocks", "80%"), its state on a line of its own ("Earned" in `accentText`, "Next", "Not yet", "Opens later") and "Stretch" (`caption`) under a Stretch tier; spoken "30 days, Lichen: earned 2 Nov. 75 recalls, Lichen: 52 of 75 remembered, next. 150 recalls, Gold leaf, Stretch: 52 of 150 remembered" ("next" is the first unearned CORE tier, whichever was opened; a Stretch tier is never "Next", even when it is the only one left). A Stretch badge's header adds `caption` "Stretch: beyond exam need" in `accentText`. Then `caption` "The rule" + `body` rule + bar and progress (or the gate line), `caption` "How to earn it" + `body` (open only; mock badges before their stage add "Best once every domain reaches 65%. It counts whenever you do it."), the effort fact in `meta` (never rarity), and a primary "Study for this" (spoken with the name) for open badges; it opens its session only once the sheet has slid away (iOS `onDismiss`, else a short wait). After the exam: no "How to earn it", no Study button, no progress.

**Badge share card** (mobile 1.11, slice D; compliance review §5, mandatory): an earned badge's sheet ends with a secondary "Share" (share icon, spoken "Share <name>", hint "Shows a card you can share. Nothing is shared until you choose."). Never on a badge not yet earned, a Moment (Fresh Start, and the planned self-reported "Passed"), a badge on the never-share list (`NEVER_SHARED_BADGES`, empty since mobile 1.18: "Graduate" was renamed "Flown the Nest", a name for the questions leaving review rather than the learner, so it no longer reads like a credential and shares like any other badge with the skill line "Moved 50 questions out of spaced review"; its saved id stays `graduate`), or one whose words fail the honesty guard; never offered or opened automatically; sharing earns nothing. The sheet builds the card's words before it offers Share, inside a try: if they fail, there is simply no Share (never a crash). It swaps the sheet's content (never a sheet over a sheet): `hero` "Share this badge" (takes focus), `meta` "Only what is on the card is shared.", the card (preview scaled to fit, its corners rounded by an outer box that is not captured; the PNG itself has square corners), primary "Share image" (react-native-view-shot 1080 × 1350 → the system share sheet; web: the share text), ghost "Back to the badge" (Android back does the same: it returns to the badge, never closes the sheet), `meta` "Nothing is posted for you. You choose where it goes." **The card** (320 × 400 pt, a fixed picture: text never scales, and its colours are FIXED, `cardInk` in `theme/tokens.ts`: the badge forest enamel `#1E4A34` with the light theme's on-forest inks, so the PNG is the same in light and dark; the progress card on You uses them too): the KaiSip lockup (22pt, top left, no cert name beside it) → the 124pt medallion → `caption` "KaiSip study badge · Earned 3 Nov 2026" in `cardInk.ink2` (so it reads as ours, never an issuer's credential) → the plain badge name in `cardType.name` (Fraunces 21/26) `cardInk.ink` ("Firm Footing", "Long Memory": never "Firm Footing · IS Operations · 80%") → the tier line `caption` "Lichen · tier 2 of 3" in `cardInk.sap` → the skill line in `cardType.skill` (Fraunces italic 16/22), which carries the domain and the number ("Reached 70% in IS Operations in practice", "Recalled 75 answers a week or more later", "Thirty days of steady study") → a `cardInk.line` hairline → `caption` "Studying for the CISA® exam" (built from the cert: the mark as an adjective, ® only when registered) → the cert's full `trademarkNotice` in `cardType.notice` (Figtree 11/15, `cardInk.ink2`). The cert name is never on, in or directly above the medallion; no issuer logo, colours or fonts; no verification id or URL, no "add to profile", no Open Badges format. The share text carries the same words and the notice, plus a plain store link once one exists (`content/storeLinks.ts`, no referral or tracking codes; none yet). The spoken label is the whole card. Every line we write passes `isHonestShareText` (now also refusing certificate/certification/credential/accredited/official/graduated), the badge's name included; only the notice is exempt (it says "not … endorsed"), and the never-share list (empty today) is the only way a badge name stays off a card. The progress share card (You) now prints the full notice too.

**Field notes** (You → Field notes, `app/field-notes.tsx`): pushed header → `meta` "Your level in each game, and how it grows." → `Section` "Game levels": one hairline row per playable game, `label` name left and `TierTag` (leaf + `meta` level name) right (wraps under at large text), `meta` how it grows → `meta` the step-back rule → (badges shown) `Section` "Skill badges" with one ListRow "Your skill badges" ("2 of 7 earned, in your badges") that opens the case at its Field notes shelf.

**You → Study tools** has "Badges" (the `badge` icon, subtitle "What you've mastered, and what's next for your exam", trailing serif count + "earned" (a count only, never "of N"; the case's earned medallions, so a kept key the case doesn't show never adds one), spoken "Badges, none yet…" at 0) and "Field notes" (leaf icon, "Game levels and skill badges") after Saved questions; the back-fill block (same recipe as on Badges, with a ghost "See your badges") sits above Study tools on the first visit after the back-fill (then marked seen). Only its text is one screen-reader stop; the button stays its own stop, outside the group. **The "new" dot (1.10):** while a badge earned since the case was last opened waits, an 8pt `accent` dot sits before the row's count (spoken "Badges, new badge, …") and a 10pt RING (2pt `accent` outline, `bg` inside) sits at the You tab icon's top right (spoken "You, new badge"): a different shape from the filled selected-tab dot under the label. A badge the back-fill saved, or a kept key the case doesn't show, never lights it; it clears only while the case is on screen. Never a number, never red, never on the app icon or in a notification. Badges held when 1.10 first opens never count as new. **Settings → Study → Show badges** (a ToggleRow, on by default, "A short moment when you earn one, and Badges on You. Off: you still earn them, quietly."): off hides the moments, the Badges row, the dot and the back-fill line, and badges are still earned; back on clears the waiting moments (no burst) and counts the active exam's waiting moments (never badges a back-fill or restore saved quietly), showing, for that visit and announced once, one `meta` line in `accentText`: "Badges are on again. 2 badges arrived while they were hidden: see You → Badges." It travels in backups; a file from before it keeps this phone's choice. **Badges, its sheet, Field notes and You** are the only places badges are listed; no medallion art on question, lesson, mock or game-round screens.

**Play, Today's drill (mobile 1.24, panel decision D5):** the tab opens with `Section` "Today’s drill" and one `meta` line ("Picked from your mistakes. You miss priority words like FIRST and BEST." or, for a new learner, "A good place to start…"), then the forest hero for that game (the one the Mistake journal's slip coach names; Snare Spotter with no pattern), then `Section` "Also good for this" / "Also try" with two related games as hairline rows (name, a plain `meta` subtitle such as "Spot the trick answer", level tag once grown, best), then ONE `DisclosureRow` "More games · 6 more…" (folded; the other six rows open under it). Three games in sight; nine in all (frozen). Rows are spoken "<Name>. <plain subtitle>. Your level…". The "All at Seedling" meta sits on the "Also try" section. The picks live in `engine/games/todaysDrill.ts`; the plain subtitles are `plain` in the game registry. **Mobile 1.40 (a simpler list):** a new learner sees only the three core games (`CORE_GAMES`: Snare Spotter, Signpost, Call It First), with ONE quiet `meta` line under them, "More games open after 50 answers." (no count of the games waiting, no locks); "More games" appears once the learner has answered 50 practice questions (distinct questions on this exam). A game the learner already played stays, so nobody loses one. A mistake pattern that names a game still waiting falls back to a core game. **Game recap (1.40):** a new badge shows only when THIS round earned it, as an `InviteRow` (badge glyph, "A new badge: Snare-wise", what it means; the row opens it in Badges), never the ruled quote; an older queued badge stays for You's badge dot. "What caught you" rows carry no link; ONE "Report a problem" sits at the foot of the recap (one miss: that question or card; otherwise the round, naming the missed items).

**Play levels** (mobile 1.6; 1.8): each "More games" row's subtitle is the tagline, plus a `TierTag` (leaf + level name) once that game has grown past Seedling; while every game is at Seedling the `Section` meta says "All at Seedling" once. Every row is still spoken "…Your level: Sapling.". The featured hero carries the level after its caption: a `sap` leaf on forest + `caption` level name in `onForest2`. Game intros (`GameIntro`, Daylight's picker) start on the learner's own level and add a centred "Your level: [leaf] Sapling" line with how it grows.

**MatchTile** (`components/game.tsx`, mobile 1.6): the tappable item of Field Guide, Canopy Call and Stepping Stones. A raised row like an answer option (radius 16, 48pt min, padding 12/14, `body` text that wraps), optional tabular `label` lead ("2" for a place on the path). Selected = 2px `ink` border (never green); matched / right = `correctBg` + ✓; wrong = `wrongBg` + ✗ (shape and colour); dimmed = `muted` text. A wrong try shakes once (±6pt, about 160 ms; none under Reduce Motion). Spoken as a button with its full name ("Term 2 of 4: Snapshot, matched"); "selected" comes from the state, never the name. A matched tile is not disabled (never "dimmed"); its name says "matched". In a radio group (Canopy Call, the Heartwood recall and missing-step picks) it is a radio; the learner's pick is `checked`, and after the answer the group LOCKS in place (`locked`: disabled, same element), never remounting, so screen-reader focus stays put. A tile that can never be tapped (Stepping Stones' given first step, the Heartwood path) is flat: `soft` fill, no shadow, so it never passes for a stone you can move. **Wrong pair (Field Guide)**: both tiles show the static `wrong` state for about 900 ms, and the footer says "Not a match. Try again." in words (works with Reduce Motion, where there is no shake).

**Field Guide** (Play, mobile 1.6): game intro with levels → each board: `caption` "Board 1 of 3", Sapling `meta` "One topic: <topic>", then two columns of `MatchTile`s, "Terms" (2 parts) beside "Meanings" (3 parts), each under a `caption` that is a screen-reader header; at ×1.3+ text, or when a term has a single word over 12 letters ("Microsegmentation"), they stack (terms first; each list only as tall as its tiles, no blank gap). Tap a term then a meaning, or a meaning then a term: right = both tint green together (160 ms, mobile 1.12) with their ✓ springing in ("Matched: Snapshot, first try." announced); wrong = both shake and stay open ("Not a match. Both stay open: try again."). `meta` "3 of 4 matched · 2 on the first try". Footer: "Tap a term, then what it means." → with a term picked, "Now tap what "Snapshot" means." (the meanings' hint: "Matches it to Snapshot.") → after a wrong pair, "Not a match. Try again." → "Next board" / "See results". Announcements wait ~350 ms (`sayLater`), so the tile's own label isn't cut off. Heartwood: `caption` "Board 1 of 3 · meaning 2 of 4" → the meaning in `stem` → six `MatchTile`s in a radio group → `RevealCard` ("Snapshot: first try" / "It's Snapshot") and, after a miss, ghost "Read the note". End: the round recap (misses: the term, `caption` "Meaning", its definition), "Missed terms come back in a later round.", `small` "First-try matches: 9 of 12".

**Canopy Call** (Play, mobile 1.6): game intro with levels → `caption` "Who has the authority to decide?" (Heartwood cards: "Who acts first?") → the decision in `stem` → 4 role `MatchTile`s (5 at Heartwood) with the deck's full role labels ("Change authority (the CAB advises)") in a radio group "Who decides?" (the caption above is a header, so iOS, with no radio-group role, still hears the question first) → after a tap: ✓ on the right role, ✗ on a wrong pick, others dimmed → `RevealCard` "Right: Audit committee decides" / "This is Audit committee's call", body the why + "The auditor's move: …" → ghost "Read the note" after a miss. Footer "Who decides?" → "Next decision" / "See results". End: recap (tag "Decides: Data owner"), "Missed decisions come back in a later round.", `headline` "Where your calls went" with up to 3 `small` confusion lines ("You gave 2 Data owner decisions to Custodian."), then a `small` `ink2` principle line.

**Stepping Stones** (Play, mobile 1.6): game intro with levels → `caption` "Process 1 of 3" + `headline` the process title → `meta` "Tap the steps in order. Tap a placed step to take it back." → `Section` "Your path": numbered `MatchTile`s (a given first step on Seedling; placed stones tap to take back) and dashed 48pt empty slots with their number → `Section` "Stones": the unplaced stones ("Place next: …"). Placing moves screen-reader focus to the next stone, or to "Check the order" when the path is full; taking a stone back moves focus to it under "Stones"; each is announced after a short pause. A process never plays below its deck tier. Footer "Tap the 2nd step" → "Check the order" → "Next process" / "See results". After checking, each stone ✓ or ✗ with "· goes 3rd", then a `RevealCard` ("Perfect path" / "2 of 4 steps in place") whose body lists the right order with each step's note and the caption; after a miss, ghost "Open the lesson" or "Read the note". Heartwood: the path (flat, untappable tiles) with one dashed "3 · missing" slot → `Section` "Which step is missing?" → three `MatchTile`s in a radio group → reveal. No drag anywhere.

**Report a problem** (mobile 1.7, `components/support.tsx`; ONE look for every entry point). *Link:* `label` "Report a problem" in `accentText`, 48pt target, spoken "Report a problem with question d4_217" (note 4A2.3 / this lesson step / this card / the app), hint "Opens a short form, then your email app". Once this phone has a report about the item: a 14 ✓ + `label` "Report started 11 Oct" in `muted`, still tappable (spoken "Report started 11 Oct. Report a problem with question d4_217"). Never "Reported": the learner may have closed the draft or the fallback without sending. *Placement:* the trust line under an answer ("Original · Reviewed Oct 2026" left, link right; wraps under at large text; then `meta` "Code d4_250 · COBIT DSS01" in `muted`); the same row with "Code 4B1.2" under a study note's buttons; in a lesson, a flag `IconButton` in the header on every scene (mobile 1.22) plus the left-aligned link on an answered check and on Lesson complete; right-aligned under each "What caught you" row in a game recap (cards by their stable review-card id); the link alone, right-aligned, on each Mistake journal card (no meta lines: a list of cards); a ghost "Something not working? Report a bug" at the end of Results. Never during a live mock: the navigator sheet says "To report a question, open it in the review after you submit." *Sheet* (the restore-preview page sheet; a fade under Reduce Motion; buttons at the end of the scroll): ✕ → `display` "Report a problem" → `meta` "Question d4_217 · IS Audit" → (`small` `ink2` "You started a report about this on 11 Oct. Send another if something else is wrong.") → `caption` "Which part? (optional)" + checkbox chips → `caption` "What's wrong?" + `RadioRow`s (the kind's reasons) → for a disputed key, where letters were on screen: `caption` "Which answer do you think is best? (optional)" + `RadioRow`s "I'm not sure", "A. <option as shown>"… → `caption` "Add a note (optional)" + `NoteField` + `meta` "Please don't include questions from the real exam." → (the app only: `ToggleRow` "Include display details", on) → a ghost-style disclosure "What we'll send" (chevron flips) opening a box (radius 16, 1.5 `control` outline, `raised`) with the exact `meta` lines, selectable → `small` `ink2` disclosure → primary "Write the email" (disabled until a reason, with a centred `meta` "Choose what's wrong to continue." under it until then) → secondary "Cancel" (keeps the note) → ghost "Copy or share instead" (always there, also disabled until a reason; opens the message panel below with `headline` "Send it your own way"). One send at a time (a ref guard): a double tap opens one email. *After the email app opens* (`SentNote`): a `soft` block (radius 16, padding 12) under the row: `caption` "Finished in your email app?" + `small` "If you sent it, thank you. We read every report, and fixes show up in What's new." Announced once when the learner comes back; no timer; never `correctBg` (we can't know it was sent) and never `wrongBg`. *No email app*: the sheet's lower part becomes `headline` "We couldn't open an email app." (screen-reader focus moves to it) → `small` "Send it from any email account to:" → selectable `label` address in `accentText` → `small` "Tap "Share details" to send the message through the app you use, or select the text below." → the whole message, selectable, in the same box → primary "Share details" (system Share sheet) → secondary "Try again" ("Back to the form" after "Copy or share instead"; everything chosen is kept, the report is logged once) → ghost "Close". After Close, the link opens a fresh form, never the old panel. Never "Sent".

**NoteField** (`ui.tsx`): the SearchField look (raised, 1.5 `control` outline in BOTH themes, radius 16, `body`, ×2 cap), multi-line, 112 min height, `meta` "61 / 1000" right-aligned under it (spoken "61 of 1000 characters"). Its visible `caption` above is its name. Dark `line` was 1.24:1 on the fill, too faint for a control (WCAG 1.4.11); `control` is 3.31:1 dark, 3.65:1 light. Reaching the limit is announced once ("That's the limit, 1000 characters.").

**Send feedback / Contact support sheets**: same frame, the same "Copy or share instead" and message panel, and they stay mounted once opened, so Cancel, a swipe down or Android back keeps the typed message (a new kind, topic or place, or a sent message, starts fresh). Feedback: `display` ("Suggest an idea" when opened from that row, else "Send feedback") → `body` `ink2` "Tell us what helps, what's missing, or what feels off…" → `caption` "What kind?" + chips (An idea · Something I like · Something else) → NoteField → exam line → `ToggleRow` "Include display details" (off) → disclosure → primary / secondary. Support: `display` → `body` `ink2` "We're a small independent team. We read every message." → `caption` "What's it about?" + `RadioRow`s (A study question or topic · Backup, restore or a new phone · Reminders · Your data and privacy · Something else) → `small` + exam line → primary "Write the email" (disabled until a topic, with a centred `meta` "Choose what it's about to continue." until then) → `meta` "Or write to us at" + selectable address → `meta` "Found a problem in a question or note? Use "Report a problem" under it…" → secondary "Cancel". After sending: the same `SentNote` ("…We read every message."), under the row or answer that opened the sheet.

**Help and feedback** (the `help` screen; reached from ONE row, "Get help or send feedback" (`life-buoy`), in Settings (the "Help and about" group, beside "About KaiSip") and in You): two `Section`s of `ListRow`s with icon circles. *Get help*: Common questions (`circle-question-mark`), Contact support (`mail`), Report a problem with the app (`flag`), Suggest an idea (`lightbulb`). *Updates*: Your reports (`inbox`, "3 started on this phone · 1 updated"), What's new (`sparkles`, "Version 1.7", or "Something you reported was updated" until seen; the last row). There is no What's next row (removed in 1.17.1). "Finished in your email app?" sits under the row that opened the sheet. Then `small` `ink2` "Write to us any time at" → the address alone as a selectable `label` in `accentText` (iOS copies a whole Text, so the address is its own) → `small` `ink2` "KaiSip is independent and not affiliated with or endorsed by ISACA."

**What's new** (`whats-new`): pushed header → once, the key-idea recipe (3px `accent` rule, `caption` "Updated after your report" in `accentText`, `small` "Something you reported has been updated since. Thank you for telling us." ("Things…" only for two or more different items), ghost "See your reports") → `Section` "Fixed after learner reports": hairline rows (`body` note + `meta` date) and `meta` "Thanks to the learners who reported these.", or a `meta` line explaining the loop while there are none. It sits ABOVE the versions, so a fix never reads as part of the latest release → per version a `Section` "Version 1.7" with `meta` "Latest · 11 Oct 2026" → `caption` New / Improved / Fixed over `Bullets` → after the oldest release, one `meta` line (`xl` above): "We improve the app regularly based on learner feedback. Have an idea? Send it from Help." Plain text, not a link (an inline word can't be a 48pt target; Help is one Back away). One benefit sentence per item: no codes, no counts, no version numbers inside an item, no design-spec detail (how something moves, how long it lasts, internal names). Never "Your report helped": another learner's report may have led to the same fix. **Today** shows the same recipe ONCE ("Updated after your report" / "Something you reported was updated." / ghost "See your reports" + ghost "Dismiss") under Also today: it is marked seen as soon as it shows and kept for that visit, so What's new only repeats it if the learner went there first. No haptic, no growth, no badge.

**What's next**: removed in mobile 1.17.1 (owner decision). Plans stay internal (kept outside this public repo, never bundled), so the app shows no planned or in-progress work beyond the labelled "Coming soon" exam choices; learners see a change once it ships, in What's new. An old `kaisip://whats-next` link opens Help (`src/app/+native-intent.tsx`).

**Common questions** (`faq`): `meta` "Tap a question to read the answer." → `DisclosureRow` per question; open = `body` paragraphs + ghost "Still stuck? Email us" (opens Contact support with the entry's topic chosen). One open at a time.

**Your reports** (`reports`): `meta` intro → hairline rows, one screen-reader stop each: `label` title by name ("Question in IS Audit", "Note: …", "Lesson: …, step 4", "Game card: Root or Rumor", "The app") → `small` `ink2` reason → when updated: 14 ✓ + `caption` "Updated after your report · 30 Oct 2026" in `accentText` + `small` `ink2` public note → ONE `meta` `muted` line "Started 11 Oct · Code d1_010 · Ref R-7K2Q" ("No longer in the app" for a retired question) → ghost "Clear this list" (asks first). Empty: the seedling empty screen "No reports yet".

**Welcome → Restore from a backup**: on onboarding step 0, a ghost "Restore from a backup" sits under the primary "Get started" ("Start my plan" before 1.24) in the sticky footer (hint: "Studied on another phone, or in the old Aurivan app? Pick your backup file to bring your progress here."). Since 1.23 a `meta` line sits above it, in the same footer: "Moving from Aurivan? In the old app: Settings → Your data → Save a backup. Then restore that file here." (`MOVING_LINE`, `content/brand.ts`; the same words are in Settings → Your data, About and Help). **Mobile 1.24:** the line is gone from the welcome (a first-time learner read it as noise); it stays in Settings → Your data, About and Help, and "Restore from a backup" stays on the welcome because it is also how you move to a new phone. The new package id makes KaiSip a NEW app on the phone, so progress moves by backup file.

**Welcome → "What should we call you?"** (mobile 1.23, the owner's personalise decision; 1.24: "Get started" opens it, before "Step 1 of 2", and it is not counted in "of 2"): "Start my plan" opens ONE optional step before "Step 1 of 4" (it is not counted in "of 4"): `caption` "Optional", `display` header "What should we call you?", `meta` "A first name or a nickname, whatever you like.", one text field (placeholder "Your first name", 48+ tall, `raised` fill, `control` border, 24 characters at most), `meta` helper "Only on this phone. It just helps us say hello." (`NAME_HELPER`). Footer: primary "Continue" (saves the tidied name with the rest in the last tap), ghost "Back" and a clear ghost "Skip" (an empty field is just as fine). The keyboard's Done also moves on. Nothing is saved before the last step. The rule for what may be kept is `engine/displayName.ts` (`cleanDisplayName`: trim, collapse spaces, 24 characters, no control or bidi characters, no web addresses or emails; empty = none). The name is on Today and in the learner's own backup file only: never in an email, a share card, the board handle, a link or sync.. A bad file's message (the same feedback block) appears above the two buttons. A successful restore finishes onboarding and goes straight to Today.

**Onboarding (mobile 1.24, "first five minutes"; supersedes the 1.15–1.23 step list where they differ)**: four screens, then straight into the first questions. (0) **Welcome**: the forest panel with the `KaisipLockup` (dark tone), `display` header "Think like an IS auditor.", one tagline line under it, then four literal fact rows (a 28pt `soft` disc with an `accentText` ✓, `body` text; each row one screen-reader stop) and the `meta` `muted` trademark line. No metaphors, no moving line. Footer: primary "Get started", ghost "Restore from a backup". (1) **Name** (optional, not counted): as above. (2) **Step 1 of 2** "Where are you starting from?" (`FamiliarityRows`, no preselected answer, ghost "Skip this question"). (3) **Step 2 of 2**: the exam date presets + ghost "Pick the exact date", then `caption` "Daily time" (`space.xl` above it, not `xxl`: a bigger gap after the ghost read as a page break), `headline` "How long can you study most days?", `MinutesControl`, a `meta` reassurance, then ONE `body` line saying what the two choices add up to ("13 weeks: 20 min a day adds up to about 30 hours of study."; "about" said once; no date: "No date yet: your plan starts at about 20 min a day…"). Its primary, "Start my first questions", saves everything in one tap and opens the first set. Gone in 1.24: the exam step (CISA is chosen for you), the plant step and the "Planted" screen (a seed is planted after the first set).

**The first set (mobile 1.24)**: the same five questions for everyone, in the same order, untimed. **Recorded exception to the confidence rule:** the first set shows NO confidence chips (the rule elsewhere stays: chips after an option is selected, before "Check answer"). Why: on the first five questions the learner has no feel yet for "sure / unsure / guessing", and a third control on the first screen slowed the first answer; the chips arrive with the next set (including "Do 5 more"). The "A right answer after a hint counts as half." line is also left out. The answer screen is the ordinary one.

**Answer screen, screen reader (mobile 1.24)**: "Check answer" makes no separate announcement. Focus moves to the verdict (400 ms), whose ONE label carries everything: "Correct. <coach line>" or "Not quite. Best answer D. <coach line>" (the DISPLAY letter of the original key). An announcement as well was cut off by the focus move on iOS (the letter was lost) and said twice on Android.

**Day-1 closing screen** (`FirstSetDone`, `components/firstSet.tsx`; replaces Results for the first set only): `caption` "Your first five" in `accentText` → `display` header "3 of 5 right" (one screen-reader stop; ended early: "2 answered" plus a `body` line "3 left. Continue them from Today when you are ready.") → ONE fact in Results' style, `small` `ink2` ("Most missed: <topic>.", "Missed: <topic>." after a single miss, or "All five right."; never the italic `quote` voice, which stays with Key idea, the stage name and the clearing's "grew to") → `meta` "5 of 40 for your first range" → an **L1 plate** (not a raised card: a summary, nothing to choose between) with `caption` "Tomorrow", one `body` line ("A 12-minute lesson on <topic>, then 5 questions"), "The 2 you missed come back then." (never "tomorrow" twice), the seed row (a 64pt `Seedling` in `accent`, decorative and hidden from both screen readers, `small` "Oak is planted. It grows as you learn." and a ghost "Choose a different plant") and the reminder ask. Sticky footer: primary "Done for today" ("Back to Today" when ended early), ghost "Do 5 more" (not when ended early). No percent ring, no "Practice the ones you missed" (a miss comes back tomorrow), no badge moment, never "check" or "diagnose". Android Back = "Done for today".

**Reminder ask** (`ReminderAsk`; on the Day-1 closing plate, and once more on Today): ONE secondary button with the emphasis, "Tomorrow I'll study at 9:00 PM" (the hour the learner is studying now, in the phone's time format), then a wrapping row of three ghosts: "Earlier" / "Later" (spoken "One hour earlier" / "One hour later"; each says the new time aloud, "Study time 10:00 PM", and keeps focus) and "Not now". The phone's permission box appears only after the main button is tapped. Outcomes replace the ask with one `small` `ink2` line: "Done. I'll remind you at 9:00 PM. You can change this in Settings." / "Notifications are off for KaiSip on this phone…" (both announced). "Not now" removes the ask, says "No reminder set. You can choose one in Settings." and moves focus to something still on screen ("Done for today" on the closing screen; the next section heading on Today). Nothing where reminders cannot work or are already on. **Second chance** (`SecondAskCard`, Today, below the day's study): the day the learner finishes their 3rd study day, reminders still off, only for learners onboarded on 1.24+, never after the phone said no, after a yes, or after reminders were turned off in Settings; shown once (showing it counts). An L1 plate: `label` "A study time can help", `small` `ink2` "Studying at about the same time each day makes it easier to keep going.", then the same ask. "Not now" takes the whole plate away, with the same announcement and focus move.

**Reminder ask, mobile 1.39** (supersedes the button + three ghosts above): ONE wrapping row read as a sentence, a secondary button "Remind me tomorrow at" ("tomorrow at" joined by a no-break space, so a wrap is "Remind me / tomorrow at", never a lone "at"; spoken as the whole sentence, "Remind me tomorrow at 9:00 PM") and a time chip beside it (an outlined `control` pill, 56 tall, the time in `label` tabular + a `ChevronDown` in `ink2`; spoken "Reminder time, 9:00 PM", hint "Opens the time picker."). The chip opens a `Sheet` "Study time" with the same Hour and Minutes `Stepper`s as Settings (hours and 15-minute steps); nothing is saved until the button is tapped, and closing the sheet returns focus to the chip, which says the new time itself ("Reminder time, 8:15 PM"; no separate announcement, review P2). Then one ghost "Not now" at the gutter. The button takes 16 a side and the chip 12 (not 32 / 16) so the pair fits one row at 393pt; the row never wraps at normal text sizes (on a narrower screen the button's words wrap inside their pill, the chip never shrinks), and at large text (×1.3+) the chip drops under the button. On the Day-1 closing screen the ask is its own block UNDER the plate (24 below it; the plate keeps Tomorrow and the seed row), so it has the full width. Outcomes, "Not now" and the second chance are unchanged.

**Your first readiness range** (`FirstRangePanel`, Today, right under the readiness row, the first time the range appears; skipped for a restore with 100+ answers): an L1 plate (a notice, not a choice): `caption` header "Your first readiness range" → `small` `ink2` "It is an estimate of where you stand today, not a prediction of your exam result. It narrows as you answer more." → `body` "Strongest so far: IS Audit" / "Needs the most work: IT Governance" (domain SHORT names, as the rings use) → ghosts "See the report" and "Got it" (spoken "Got it, hide this note"). Static: no motion, no confetti, no single percent. While it shows, the "weakest area" line waits.

**Today in the first days (mobile 1.24)**: Day 0 is one forest panel: caption "Today's plan · about 6 min", `hero` "Your first five", `meta` "5 questions, no timer", one "Start" pill; no checklist, no readiness row, nothing that says "Not yet". Day 2+: the readiness row is a goal ("5 of 40 for your first range"), and a mixed set's meta is plain ("15 questions, mixed across the domains"; never "no score yet, just a starting point" after the learner has seen "3 of 5"). The stage line shows only for a few days after the stage changes, never for the first stage. Once a range exists: one `meta` line "200 answered · weakest area: IS Operations" (the domain's short name, never the tile abbreviation "IS Ops", which a screen reader spells out).

*Mobile 1.39:* on Day 0 one `meta` line sits under the panel, "After your first five: a daily plan built around your date" ("…built around you" with no exam date), until the first five are done.

**Recovery screen** (`RecoveryScreen`, `components/recovery.tsx`; saved data would not open, or loading took over 8 s; the same layout for a screen that crashed): `bg`, content centred in a scroll, the `KaisipLockup` 32 → `hero` header "We couldn't open your saved progress" ("Something went wrong on this screen") → `body` what to do → an optional `small` note → three buttons: primary "Try again", secondary "Report this" (opens the email app with the app version and phone system only), ghost "Start fresh" (only when a store FAILED; it asks first, names exactly what it erases and says it cannot be undone). Every note it shows is also announced (above all "We couldn't open an email app. You can write to us at …", the learner's only way out). While "Try again" reads the data, the screen stays up and the button reads "Trying again…" (disabled, announced "Trying again"): never a blank page.

**Daily clearing card** (Today, when all plan items are done; replaces "Well done.")
- `forest` panel, tall frond art. Caption "Today's clearing" + 3 filled `sap` leaf marks. `hero` "Three of three, done." (count-aware: "Two of two, done.").
- Stat row of 3 (the shared Stat, mobile 1.11: `caption` labels in `onForest2` over `stat` 30 `onForest` values): "Questions 31", "Accuracy 81%", "Time 24 min" (or "<1 min", since 1.21), separated by 1px `forestTrack` verticals; a list at large text. The readiness line "Readiness grew to 67–77%" has a word joiner after the dash, so the range never breaks across lines.
- Hairline `forestTrack`, then mini rings 48 (`sap`) + italic "Readiness grew to 72%" + `meta` "IS Operations ring +4" (biggest mover). If readiness fell or held, say "Readiness holding at 70%" — never a negative framing.
- **Mobile 1.24, a handful of answers (under 8, as on Day 1):** the middle stat is "Correct 3 of 5" (Results' word for a count, one line, the row's shared baseline), never a percent. Before the first range exists the line reads "Readiness takes shape as you answer" and the `meta` under it "Every answer feeds the rings": no "IS Audit ring +10", which would read as a score on the day Today says "Not enough data yet".
- Below the panel: `Tomorrow` section (headline + "about 15 min") with the next 2 plan items as non-tappable preview rows, then ghost "Do a little more" (1.21; was "Keep going anyway").
- Time under a minute shows as "<1 min" (1.21), like Results.

**Today (mobile 1.23, the owner's mockup A; supersedes the 1.21 layout below where they differ)**: top to bottom, in screen-reader order: header → meta line → greeting → plan panel → readiness row → three tiles → (below the fold) the plant row, the quiet cards, "Also today".
- **Header**: the `KaisipLockup` (height 28, theme-aware, spoken "KaiSip") at the left; at the right the **streak pill** (`StreakPill`, `components/today.tsx`: a 40pt outlined pill, `raised` + `cardShadow` in light, `raised` + 1.5 `line` in dark; a `clay` sprig, a Fraunces 20 `clay` numeral that rolls, `meta` "day streak"; spoken "6-day streak"; none at 0) and the 48pt **Settings gear** (the 1.15 "Settings one tap from Today" rule stands; the mockup has no gear, this is a deliberate addition). The row wraps at large text.
- **Meta line** (`meta`): "Thursday · 38 days to CISA" (the real weekday, real days, `cert.name`); no exam date: "No exam date set"; past: "Exam done"; the day: "Exam day". **Greeting** (`display`, a heading): "Good morning" before 12:00, "Good afternoon" before 18:00, else "Good evening", by local time. Since 1.23 it adds the learner's own name when they gave one: "Good morning, Maya" (onboarding's optional step or Settings → Your name); nothing is invented when there is none. The heading is one screen-reader stop reading the whole greeting; a long name (24 characters at most) wraps and stops at three lines at 200% text.
- **Plan panel** (the one forest panel, `HeroPanel`): caption "Today’s plan · about 19 min" (the open items' minutes, mocks left out; spoken with "minutes" and ", 1 of 3 done"; just "Today’s plan" on a plan saved before 1.15) → `hero` title = the current item's own planner title with no count ("Spaced review", "Business impact analysis", "Light review") → the **checklist** (`PlanChecklist`, `components/journey.tsx`) → ONE hugging pill, left aligned, minHeight 52, the same in light and dark (mobile 1.24 dropped `action.full`; full width is kept only for sticky footer CTAs): **"Start"**, or **"Continue"** once anything is done today; the icon rule of 1.22 stands: **Play only when the current item is a lesson, otherwise a trailing arrow** (`HeroPanel` `action.full` / `action.trailing`). The botanical frond stays. A `meta` line sits under the title ONLY when it says something the checklist does not: a mock's length and "longer than your usual day", and the mixed set's "15 questions, mixed across the domains" (1.24; it said "no score yet, just a starting point" before, which contradicted the "3 of 5" the learner had already seen). Mobile 1.24: the meta always shows, since the current item is no longer also the first checklist row. Otherwise the item's minutes and why are the pill's spoken hint ("Weak spots: IS Operations, 16 questions, most points to gain").

*Mobile 1.39 (§5, a hollow circle reads as a radio button):* when the only item left after the current one is a single item not yet done (Day 1: the lesson, then practice), the checklist is one `body` line in `sap`, "Then: IS Operations practice · 12 questions", with no ring. With a done item the checklist keeps its ✓ rows.
- **Checklist lines** (`planCheckLabel`, the plan's own words with their real size): "Warm-up · 5 questions", "Spaced review · 20 due" (or "8 of 56 due" when today takes part of the queue; "all caught up" at 0), "Lesson · Business impact analysis", "Practice: IS Audit · 20 questions", "Snare Spotter · 6 min", "Mini mock · about 80 min". Marker 24: **done** = a filled `sap` disc with a `forest` check, text struck through in `onForest2`; **current** = a 2.5 `sap` ring, `label` (600) in `onForest`; **later** = a 1.5 `onForest2` ring at 70% (about 4:1 on forest, over 3:1 on the lit top edge too) and `body` in `onForest2`. State is never colour alone (the check, the strike and the weight), and each line is one stop spoken "Warm-up · 5 questions, done / next / later". A line done since Today was last on view presses in (the plan leaves' small spring and one light haptic). The lines are not buttons: the pill is the one control ("Also today" below still launches the other items).
- **Readiness row** (`ReadinessRow`): the growth rings (preset `row`, now 88: the Grove wobble stays) at the left; the range as a Fraunces **38** numeral with the raised `%` (the number is a RANGE, never one percent); `meta` "Estimated readiness, a range not a promise"; the stage as the accent italic serif `stage` in `accentText`: "Stage 4 · Rehearse the exam" (the stage's real index in `STAGE_ORDER`, 1 to 7, and its name). Below 40 answers: "Not enough data yet", the countdown line and the stage. The whole row is one button to the readiness report ("Opens your readiness report"); no chevron. While the Exam-ready panel shows the rings the row draws none. The plant no longer replaces the rings (it moved, see below).
- **Tiles**: removed in mobile 1.24 (accuracy beside the readiness range read as a second score). Once a range exists, one quiet `meta` line says "200 answered · weakest area: IS Operations". No hours studied, no single readiness percent.
- **Below the fold** (unchanged in behaviour): "Also today" (resume, then the open plan items), the plant (a learner with a plant gets a quiet row under the tiles: the plant at 72 with its name, or the visitor line; without one, the invitation row), the grow-up note, the exam-week card, "Fit your plan", "Updated after your report", the exam-eve card above the panel, the exam-ready panel in the panel's place, the clearing card (no checklist and no tiles on a cleared day), "Tomorrow", and "How did it go?" with no plan.

**Today (mobile 1.21, one focal element; the panel, readiness row and header below are replaced by 1.23 above)**: the panel's caption carries the day's minutes on one line, "Start here · about 19 min", then the plan leaves (spoken "Start here, about 19 minutes"); mocks are left out of the sum, and their own row says "Optional this week · about 80 min" (no "+ mock" line). A mock-only day's caption is just "Start here". The forest panel's `hero` names the activity and never holds a count ("Spaced review", "Practice: IS Audit", "Light review"; `planHero` in `components/journey.tsx`); counts and minutes go to its `meta` ("16 of 55 due · most overdue first": today's share of the same live queue You and Practice show). The day's minutes are said once: when the caption's "About 19 min today" is this item's alone (every other open item is a mock), the meta leaves the minutes out. "Also today" rows keep their titles. The **readiness row** is one condensed row under the panel: mono rings 60 (preset `row`) or the plant at 72 → the range as a Fraunces 30 numeral with `meta` "estimated readiness" on its baseline → `meta` "A study estimate, not a prediction." (the short form; the full sentence is in the spoken label and on the report, decided 15 Oct 2026) → `caption` "Your stage" + italic `stage` "Rehearse the exam" on one wrapping line → chevron (opens the report). The plant invitation is ONE plain `ListRow` (sprout circle, "Your plant", `meta` "A companion that grows with your study", chevron), with no ghost pair beside the panel's Start (design spec §5). It opens the picker (`?from=today`), which says under its intro "Not now also hides the plant row on Today. You can plant one from You." and does so; the screen-reader action "Hide from Today" hides it at once (no long press). Hint: "Opens the plant picker". It sits 24 below the list above it, so it never reads as a third "Also today" item. "Updated after your report" stays an InviteRow with its two ghosts. The clearing's ghost reads "Do a little more" (was "Keep going anyway", which sounded apologetic).

**Today (in progress, before 1.21)**: meta row (weekday · days to exam | sprig streak in Fraunces 20 `clay`) → `display` → forest panel "Start here" with 3 leaf marks for the plan (filled = done, current outline) → readiness row (rings 104 mono + `number` + `meta` "ready, weighted by the blueprint" + italic `stage` "Make it stick" (no number since mobile 1.13); no rings while the Exam-ready panel shows them) → "Also today" list with real, unshortened titles (2 lines allowed) under `Section` "Also today" + `meta` "about 64 minutes" (the time, not a count: the list always shows every item; spelled out like the items' own "About 24 minutes"). A paused timed mock counts its unanswered questions at study pace, but never more than its clock has left. A capped review reads "Review 55 due" / "About 24 minutes · 20 at a time, most overdue first" in the panel, and "Spaced review · 20 at a time" as an "Also today" row: the same count and line as You and Practice. The count is the LIVE queue (the day's plan is frozen in the morning, the number is not), and an empty queue reads "Review · all caught up".

**Question**: v1 recipe plus: progress segments `gap 3`, current segment `ink2`; meta "● IS Operations · 4 of 10" (domain dot in tone; mobile 1.39: no subtopic before the answer, in any mode, since it named the idea being tested; it appears after the reveal in "Read the note", and never in a mock); `stem` steps down to 20/29 above 200 chars; option text line-height 1.42; scroll `paddingBottom` = footer + 24.

**Learn (mobile 1.21, course + reference; decided 15 Oct 2026)**: lessons are the course you follow, study notes the reference you look things up in, and the screen says so once. Top to bottom:
- `display` "Learn" → `meta`, one line: "Lessons are the course. Study notes are the reference." (without notes: "Short lessons, in exam order.").
- Forest "Up next" cover: caption (domain dot + "Up next · IS Operations"), `hero` lesson title, ONE `meta` line running full width over the faint branch art (`wideMeta`): length + why ("5 min · picked where you can gain the most" for the readiness focus; otherwise its place on the trail, "5 min · lesson 2 of 7", since the caption already names the domain), pill "Start lesson" (Play glyph). All done: "Every lesson done" / "Revisit any lesson anytime, or look a topic up in the notes."
- `Section` **Look it up** (hidden while the notes pack is empty): `SearchField` "Search the notes, like RTO or SoD" → from 2 characters (on a deferred copy of the query, over the pack's normalized index, built once per pack: `notesIndex` in `engine/notesSearch.ts`; the search block is its own memoised component, so a keystroke never re-renders the hero or the lessons), results inline (the first 5 as `reading` rows: name, a 2-line `meta` snippet, `caption` domain; then "See all results" → Study notes with the same search, `?q=`), "No matching notes" as a compact empty state; the count is announced after typing pauses ("5 notes found") → the **Study notes** `ListRow` (BookOpen), one line: "Every topic, with traps and key terms", once any are read "12 notes read · every topic, with traps". No "x of N" meter here: a reference has no finish line, and the screen keeps ONE progress meter.
- `Section` **Lessons** + `meta` "1 of 41 done" → `meta` role line, one line: "In exam order. Each ends with a quick check." → the domain groups: status ring (a `track` ring for none, a tone arc, a filled tone disc with ✓; never `control`), `label` "Domain 1 · IS Audit", `meta` "1 of 7" (the section says "done" once; spoken "1 of 7 done"), chevron; a 3pt tone track only once a lesson there is done.
- Lesson rows (the trail, unchanged): no trailing mark on ordinary rows (the whole row is the button); done = filled `accent` ✓; **Up next = a filled `accent` play disc only** (mobile 1.24: no raised card and no caption any more; the forest cover above already says "Up next", and the card used to repeat it and bleed past the gutter), with the lesson's length as its `meta`. Never a `soft`/green fill: that read as a correct answer.
- Footer: a `ListRow` "Prefer a step-by-step path?" / "Guided pairs each lesson with practice" (opens Guided), then `meta` "Short lessons across every domain of the exam outline. IS means information systems." (the one IS gloss lives here, so the role line stays one line) and `muted` "Original content, reviewed against public frameworks." Never "a lesson for every topic": one outline topic (1B6) has none.
- Lessons use the Play glyph and notes BookOpen everywhere (Learn, Today's plan rows). Spoken order: title → subtitle → cover → Look it up → search → results → notes row → Lessons → groups → Guided → footer. `?domain=` still opens that domain's next lesson on the cover (the readiness report sends it).

*(Mobile 1.12–1.20, ui.md L1–L3:)* the cover adds one `meta` line under "5 min · 10 scenes" saying why this lesson ("Picked where you can gain the most": the readiness focus, once there are answers; else "Next in IS Audit"). Each domain header leads with a 20pt status ring in the domain's tone, read by SHAPE: none done = an outline ring (`control`) round the tone dot, some = an arc that far round, all = a filled disc with a `bg` ✓; a 3pt progress track only once a lesson there is done. The lessons are a trail, not a list: the numeral column carries a 1.5pt path joining each lesson to the next (`accent` at 70% where walked, `track` ahead), no hairlines between rows; done = `accent` ✓ circle and the title in `ink2` with `meta` "Done"; up next = a `soft` row (radius 16, bleeding 8pt into the gutter) with the `caption` "Up next" in `accentText`; others = an outline circle with ▶ and "5 min". Spoken as before ("IS Audit lesson 2: …, up next"). *(Before 1.12:)* `display` + `meta` subtitle → forest "Up next" lesson cover (caption with domain dot + domain short name, `hero` full lesson title up to 3 lines, `meta` "3 min · 7 scenes", pill "Start lesson", domain branch art) → "Lessons by domain" headline + "1 of 5 done" (subtitle "Lessons and study notes") → rows: Fraunces 22 `ink2` order numeral (lead 40), `label` title (2 lines OK), `meta` with domain dot + short name + state; trailing status 28 circle: done = `accent` fill + `bg` ✓, available = 1.5 `control` outline + play 12, locked = lock 16 `muted` and row text `muted`. "More lessons are on the way." as a final `meta` line, not a per-domain card.

**Lesson player (mobile 1.12, ui.md LP1–LP6)**: pushed header (✕, a segment per scene, "3/7": `meta` tabular capped at ×1.3, spoken "Scene 3 of 7"; the header's right slot is at least 44pt and grows with it, never a fixed width) → the scene, in a scroll that fills the page → thumb-reach footer (Back hidden on the cover, so Next is full width there; one keyed Next / Finish lesson button). Scene recipes:
- *Cover* (the title scene): the forest panel (domain dot + kicker, kept on one line with the dot and clear of the art like the title; at large text the kicker wraps beside the dot, `hero` title, `meta` "5 min · 7 scenes", the subtitle in `small` `onForest`, the domain's branch, still: no sway on a focus screen) → `headline` "In this lesson" → the lesson's map: each scene's label once, in order, after a small outline leaf ("What a charter does", "The reporting lines", "The exam trap", "Exam-day shortcut", "Quick check"); one screen-reader stop.
- **Mobile 1.22 (design spec §4, DECISION 3, 5):** the header's right slot holds the counter and a 48pt **flag** `IconButton` (Lucide `flag` 20 in `muted`, spoken "Report a problem with this step", hint "Opens a short form, then your email app") on every scene, so reporting is one tap away and never sits in the reading column. The full "Report a problem" row still shows on an answered check and on Lesson complete (not the flag there). Every scene starts on **one anchor line**, 44pt under the header (the cover and Lesson complete keep 24), so a page turn lands on the same y each time. *(1.39 centred short scenes below it; 1.43 puts every scene back on it.)* Each scene opens with a **kicker** (`caption` `accentText`; honey `tip` for the trap) naming its kind: "The idea", "Think of it like" ("An analogy" when the heading already says "Think of…"), "How it flows", "The layers", "Side by side", "The trap", "Exam-day shortcut", "Quick check" (`sceneKicker`), then 6pt, then the heading in **`hero`** (Fraunces 28/34; was `headline` 17), then 16 to the body. A heading that only repeats its kicker ("The core idea", "The exam trap") is left out and the body leads; kicker and heading are one screen-reader heading ("The idea: What a charter does"). The footer is the shared `StickyFooter` with its 22pt `bg` fade (the last scene's sources line, "Last reviewed Oct 2026", never sits under it); Back is a 56pt round outlined "Previous step" (`ChevronLeft` 24) beside a flex "Next", halving the bright area in dark mode, and stays a full "Back" pill on a check, where it means "the scene before the check". Both shapes share one ref: when Back changes shape on a turn (a check ↔ another scene), screen-reader focus moves to the new Back once the page is placed. The check's "Quick check" caption is a screen-reader heading. Compare scenes use the notes' bullet dot, never a typed "·".
- **Mobile 1.39:** a short scene (every type but the cover and a check) is centred in the space between the anchor line and the footer, so the lower half is not empty; a long scene fills the space and scrolls from the anchor line. Checks stay at the top (they grow when answered). *(Undone in 1.43: centring floated an idea scene a third of the way down an empty page and broke the one anchor line, so every scene starts ON the anchor line again.)*
- **Mobile 1.43, an idea that lists parallel items (board 6):** opt-in per scene (`list` on the idea scene: `lead`, `items`, optional `close`, `plainAnd`), only where the body truly lists 3–5 parallel parts (the charter's purpose, responsibility, authority, accountability; a QA program's four parts; the forensics rules). Same words, only split: a content test checks that `ideaListText(list)` is the original `body`. The lead stays in the scene's prose (a lead that runs on into the list ends in "…"); then the figure on paper (no plate, no path, never the steps template: parts of a whole are not a sequence, and "Step 1 of 4" would teach the wrong model): one row per item, a 32 disc in `raised2` with a hairline `line` ring (so it shows on light paper) holding a `serifNumeral(17)` in `accentText`, the label (`label`, the item's first words, an item marks where with "|") and the rest of its words in `meta`, hairlines between rows; then the closing line in prose, 32 below, on its own beat ("Without it, an auditor is a guest who can be shown the door."). The figure is ONE screen-reader stop, "A list of 4: Purpose; Responsibility; Authority, to access people and records; Accountability, including where it reports." Rows arrive 120 ms apart in reading order (all at once under Reduce Motion); the scene scrolls under the pinned footer at large text.
- *(1.20–1.21:)* the quiet "Report a problem" link showed only on a check scene (after the answer) and on Lesson complete. *(1.12–1.21:)* text scenes (idea, analogy, tip) sat about a third of the way down the page.
- *The IS auditor’s lens* and the *Exam-day shortcut* are the key-idea recipe: a 22pt `LeafBig` and a `caption` in `accentText`, then `quote` on a 3px `accent` rule (as on the vine and in notes), never a bold serif paragraph.
  - **Mobile 1.39 (§1: italic never for paragraphs over 4 lines):** the `quote` holds at most the first two sentences and about 140 characters (four lines at 393pt; `splitCoachText`, `components/lesson.tsx`); the rest follows in `body`, 24 below, lined up with the quote's text. A second sentence that is a question ("Missing a skill?") is never pulled into the quote, so the quote never ends on a question whose answer sits apart. Every lens and every Exam-day shortcut fits the cap (tested in `mobile-139.test.tsx`; a first sentence over the cap would stand alone in the quote, and none does).
- *Steps* (`flow`): numbered 32pt `soft` discs (Fraunces 17 `accentText`) on a 1.5pt `accent` path at 55%, `label` + `meta`; each step is one screen-reader stop, "Step 2 of 4: label. note".
- *Layers* (`stack`): `soft` bands 4pt apart, radius 16 at the stack's ends and 4 at the joins, so they read as one stack; Fraunces 22 numeral (the top layer in `accentText`), `label` + `meta`; each layer is one screen-reader stop, "Layer 1 of 4: label. note".
- *Timeline* (`flow` with `layout: 'timeline'`: life cycles, cutovers, closure): one 2pt `accent` rail at 55% ending in an arrow, a 14pt ring per phase (2pt `accent`, filling with an `accent` dot), `label` + `meta`; no numbers (a phase is a stretch of time, not a checklist step).
- *Check*: `caption` "Quick check", the question in `stem`, `OptionCard`s; on an answer the session's `Verdict` (the leaf springs, "Correct" / "Not quite" in `hero`, a `meta` coach line: "That's the answer the exam wants." / "The best answer is D.") then the explanation in `body`. On an answer (mobile 1.37) the page scrolls just enough that the explanation clears the Back / Next bar (never past the verdict's top less `space.lg`, never backwards, once per pick; at once under Reduce Motion), and screen-reader focus moves to the verdict 400 ms after that scroll (no separate announcement), as on the answer screen.
- *Lesson complete*: `caption` "Lesson complete" → `hero` lesson title → the domain's lessons as leaves on one branch (`accent` 1.5 stroke; done leaves filled; at most 340 wide) → `body` `ink2` "A new leaf on your IS Audit branch: 2 of 7 lessons." (a repeat: "IS Audit: 2 of 7 lessons done."; all done: "Every IS Audit lesson is done.") → footer: primary "Practice this topic" (the questions the notes list for the lesson's outline topics, plus the bank items it prepares for; "Practice IS Audit" when there are none) then (mobile 1.20) ghost "Read the note: …" with a leading BookOpen, then ghost "Next lesson →" (or "Back to Learn").

**Practice** (before 1.5; see "Practice → Choose your path" above for the current hero and picker): `display` + subtitle → forest "Quick 10" (hero "Ten mixed questions") → list rows Spaced review (trailing Fraunces 22 count + "due") and Weak area → "Build a set": domain chips (scroll, right-edge fade mask 15%) → **serif segmented control** (`soft` track radius 25 since the 1.5 redesign, 3pt inset, 44pt segments + 2pt hitSlop, selected segment `raised` + shadow (dark `#2C372F`) **plus a 1.5px `ink` outline** (selected = ink; fill alone was ~1.1:1, failing WCAG 1.4.11; idle segments carry a transparent 1.5px border so nothing shifts), Fraunces 20 numeral + Figtree 13 "questions") → difficulty chips → secondary button "Start 10 questions" → "Mock exams" rows with a lead serif numeral (50 / 150) + `meta` unit.

**You, readiness (mobile 1.43, board 3; owner decision "one ring"; supersedes the rings and legend below)**: `Section` "Readiness" + "See report" (a 48pt ghost) → ONE readiness ring (`components/youReadiness.tsx`, 112pt): a single wobbly growth ring, 12pt, on its `track`; the solid `accent` arc runs to the LOW end of the range, a lighter band (`accent` at .35) covers the range itself, and a notch at the 80% study bar (a 2pt `ink` tick on a paper halo, 4pt past the ring each side). No five domain rings, no separate 0–100 line: the figure is drawn once. Beside it (stacked above it at ×1.3 text): the range in `serifNumeral(38)` with its raised %, `label` "Estimated readiness", `small` `ink2` "A study estimate, not a prediction." The ring and its words are ONE screen-reader image, "Estimated readiness 68 to 78 percent. The notch is the 80 percent study bar." (before the range: "Not enough data yet. 5 of 40 for your first range."). Then `meta` `STUDY_BAR_LINE`: "The notch marks 80%, this app’s study bar for your low end. Each area has its own 70% line. A study bar, not an exam score." (never "pass"). Then the **areas**: `caption` "Right on your latest tries" left and "Area line 70%" right (stacked at ×1.3), then one hairline row per area (minHeight 48): 8pt tone dot, `small` name (`flex: 1, minWidth: 0`, it may wrap), an 80pt bar (6pt, `track`, the area's tone; 8 between bar, word and figure, so "IT Governance" keeps one line at 393 dp; the area's 70% line a 2pt `ink2` tick with a 1pt paper gap each side, 4pt above and below the bar), the WORD (every area: "Not started", "Building", "Steady", "Strong"; `small` `ink2`, or for an area below its 70 line `label` in `clay`, so it stands out by weight and word, never by colour alone and never in the answer red), and the figure: `serifNumeral(17)` with % from 30 answers (`BAND_MIN_ANSWERS`); below that "N answered" in `meta` and the bar drawn at .45 (thin data looks thin); "–" with no answers. Each row is ONE stop: "IS Audit: Steady, 74 percent on latest tries, at or above the 70 line" / "Info Protection: Building, from 12 answers, below the 70 line", plus "Up 4 since you last looked" after a real rise. At ×1.3 text a row drops to two lines (name, then bar, word and figure; the bar keeps at least 96pt). The change line ("Since you last looked: IS Operations +4") and, while any area is thin, the bands line follow. Motion: the ring's solid arc grows from the low end last seen (the day's first view from 0) and the range rolls; the band, the notch and the bars are still; static under Reduce Motion. The stat row (streak in `clay`), the plant row, badges and Study tools follow unchanged.

**You (mobile 1.21; decided 15 Oct 2026: an exam app leads with readiness)**: `display` (with the Settings gear) → `Section` "Readiness" with its right-aligned action "See report" (spoken "See report, your readiness report": WCAG 2.5.3, the name starts with the visible words) → rings 172 + legend as ONE aligned row (20 apart; 28pt legend rows: 8pt tone dot, `small` name, serif 17 numerals in one right-aligned column). **Mobile 1.24:** under 30 answers a domain shows a band WORD (`label` "Building" / "Steady" / "Strong") instead of a number, explained once by a `meta` line under the rings note; whenever ANY row shows a word, the legend goes UNDER the rings, full width (as below 380 dp and at large text), because beside the rings "Building" left the name ~70pt and "IT Governance" ended in an ellipsis. What went up since the last look is said once, as a `caption` `accentText` change line under the rings ("Since you last looked: IS Operations +4 · Info Protection +2"; a banded domain gets no "+N"), never a "+N" on each row → the rings note → stat row → accuracy note → the plant row (or "Plant yours" / "Grows only with your study", one line) BELOW the stats → Mindset growth → the back-fill line as an InviteRow (badge glyph; no green rule, no italic) → Study tools (Spaced review, Mistake journal, Saved, **Badges and field notes** (mobile 1.24: one row, "What you've mastered, and your level in each game"; with badges hidden it is just "Field notes"), **Share progress** as the last row, Share2 glyph, "A card with one honest number"; it was a full-width button mid-screen) → Mock exams (no section action any more: the Readiness section's is the one, and each mock row opens the report) → Help and feedback.

*(Before 1.21:)* **You**: `display` (with the Settings gear) → your plant row → rings 172 (mobile 1.17: no appearance switch; the theme lives only in Settings → Appearance → Theme, because the owner found the copy on You redundant once Settings was tidy) + legend (outer → inner, matching the visual) → one `meta` line explaining the rings → stat row (3 columns, hairline top/bottom and between: "Answered 340", "Accuracy 72%" or "Not yet", "Streak 6 days" or, with no streak, "Starts today" in words; streak in `clay`) → "Study tools" rows with serif trailing counts → By domain bars removed (the rings + legend replace them) → mocks list.

**Study notes, the subtopic body (mobile 1.21, `components/notes.tsx` `NoteBody`)**: it opens with **"On this page"** (design spec §3.4): one 48pt row, hairline below, 24 under it, of three buttons spaced across, each a serif 17 `accentText` numeral + `meta` `ink` name, "1 Understand · 2 Think like the IS auditor · 3 Keep it" (only the movements the note has). A tap scrolls to that movement (smooth; instant under Reduce Motion) and moves screen-reader focus to its heading; spoken "On this page: 2 of 3, Think like the IS auditor". They stack as 48pt rows at ×1.3 text, and whenever one line would not fit the column (`onThisPageFits`: an estimate from Figtree `meta` 14 at about 6.4pt a character, the capped numerals, 12pt gaps and 5% slack; it overflowed between ×1.1 and ×1.3 before). It shows only inside a scrolling `Screen` (`useScreenScroll` in `ui.tsx`, which measures the target against the scroll content and, at the jump, the window and content heights, so it never scrolls past the content's end: `scrollTarget`). After "In one line" (`caption` + `stem`) the page reads in **three movements**, each opened by the same serif numeral, a `caption` kicker in `ink2` and a hairline running to the edge (`1  Understand ───`), 48 above it, one screen-reader heading: **Understand** (Why it matters, How it works, Compare, Types, Diagram, Example) · **Think like the IS auditor** (The IS auditor’s lens, Exam traps) · **Keep it** (Key terms, Analogy and memory aid; left out when the note has none of them). The first heading in a movement sits 16 under its kicker; the others keep `Section`'s 32. The memory aid is `body` (was `label` 600). **Compare** is one L1 plate: up to 3 items below ×1.3 text, when each column gets at least 96pt (a 390pt phone, not a 360dp one), a real grid (item names as a `caption` `accentText` header row, hidden from screen readers; each dimension's name in `meta` `ink2`, then the cells side by side in `small`, hairlines between); 4+ items or large text, stacked on the same plate (dimension `label`, then each item's `caption` name and cell). No 1px boxes. **Diagram** (was "Illustration"): on an L1 plate, themed with the plate as its page colour, and always FITTED to the plate's width: the whole figure shows, no label is ever clipped, nothing scrolls sideways. When fitting puts its smallest label under 13pt (`MIN_LABEL_PT`, ×1.5 with large text; `svgSize` in `engine/notesSvg.ts`), the figure is a button with a quiet `accentText` "Tap to enlarge" (maximize glyph 16) under it, spoken "Enlarge diagram. <its description>" (WCAG 2.5.3: the name starts with what it does) with the hint "Opens the diagram full screen, larger". The viewer is a full-screen Modal on `raised2`, a modal for screen readers: a 48pt ✕ "Close diagram", the header "Diagram", the drawing at its readable size (smallest label 13pt), scrolling both ways when larger than the screen with a `meta` line saying so; on iOS it pinches from the whole figure (fitted) to 3× ("Drag to see all of it, or pinch to zoom."), elsewhere it opens on the figure's centre ("Drag sideways to see all of it."); the caption under it. ✕, Android Back and VoiceOver's escape close it; focus returns to the figure when the Modal reports it is gone (iOS) or after its fade (550 ms, Android). It stays mounted while its figure is small, and closes by itself if the figure fits again (a rotation, a smaller text size). It fades (none under Reduce Motion). The web diagrams' monospace labels draw in Figtree 600 (no third typeface). About 61 of today's 75 web diagrams need the viewer. **Native diagrams (mobile 1.22, `components/noteFigures.tsx`)**: a note listed in the `nativeFigureFor` registry shows a figure drawn for the phone in place of its FIRST web diagram, on the same plate with the note's own caption under it (a caption that describes the web layout is adapted: 4A7.2's "An operational incident runs left to right:" reads "Read the steps top to bottom. In an operational incident,"; 4B1.2's reads "RPO, RTO and MTD on one timeline." and ends "The MTD is the outer limit, and the RTO must fit inside it."; the web data is unchanged). Lines and marks are react-native-svg in Grove tokens (rails in `accent` at 80%, spans in `ink2`, outer limits dashed in `muted`); labels are real Figtree text (`caption` 13 and up, never mono or uppercase) that wrap in the column; a label pinned to a mark's position grows to ×1.3, then wraps, and the caption carries the rest. One screen-reader stop per figure, its own sentence. Nothing scrolls sideways and nothing needs the viewer. Drawn so far: **4B1.2** recovery timeline, drawn at exactly the plate's inner width (last good backup ring → a dashed disruption line running down the whole figure, past on its left and future on its right → service restored dot → a dashed MTD tick; spans "Data lost ≤ RPO" looking back, "Downtime ≤ RTO" looking forward, and "MTD: the outer limit" under them; every label sits on its own side of the dashed line, so none can collide at any width), and four step figures in the lesson's steps vocabulary (`FlowFigure`: `soft` discs of at least 28pt (they grow with a large numeral, never clip) with serif numerals on a 1.5 `accent` path at 80%, `label` + optional `meta`, still, no build): **4A7.2** incident handling, **4A8.3** the patch cycle, **4A6.2** the capacity cycle (ends in a return mark, "Then monitor again"), **4B5.4** plan tests (from "Least thorough" to "Most thorough", with a short note on what each test moves). Still the web SVG + viewer (the D4/D5 queue, by practice-set size): 5A7.2 (two figures), 4A8.4, 4B4.1, 5A2.3, 4A9.1, 4A1.1, 4B3.1, 4A1.4, 4A11.5, 5A3.6, 5A6.2, 5A2.1, 5A3.1, 5A3.5, 5A5.1, 5A1.3, 5A3.3, 5A4.1, 5A4.2, 5A4.7, 5A7.1, 5A8.3, 5A8.4, 4A11.1, 5A4.4, 4A1.2, 5A6.1, 5A6.4, 5A8.5, and every D1–D3 diagram.

**Study notes, the top of the page (mobile 1.43, board 4; quick wins only, no sticky part tracker)**: the `Tag` names the domain and topic in WORDS, "IS Operations · Business Impact Analysis" (no "4B1": a code is noise to a newcomer; it stays in the source row, "Code 4B1.2") → `hero` name → "About 3 min read" → **"The letters in the title"**, an L1 plate (`AcronymPlate`, only when the title has acronyms other than IS / IT AND every one is spelled out in the note): `caption` `ink2` header, then one pair per acronym, the acronym in `label` `accentText` in a column at least 56 wide (`flexShrink: 0`), its meaning in `small` `ink`; at ×1.3 text the acronym sits over its meaning; each pair is ONE stop ("RPO, Recovery point objective"). No hand-kept list: `engine/noteAcronyms.ts` reads the note's own text, key terms first, for "recovery point objective (RPO)" or "TOGAF (The Open Group Architecture Framework)", and accepts an expansion only when its words' first letters spell the acronym (joining words like "and" may be skipped); sentence case unless the note only writes it as a name. 27 of the 34 titles with acronyms get a plate (the rest are not spelled out in their notes yet: ISACA, KPIs/KRIs/KCIs, CI/CD, TCP/IP, CMDB, DBMS, ISO/IEC). → 32 → **"In one line"** (`caption` + `stem`) on the first screen → the lesson row (hairlines above and below) → "On this page" (24 above) → the movements, as below.

**Study notes, the subtopic screen (mobile 1.22, design spec §3, `app/notes/subtopic/[id].tsx`)**: header = the back chevron, with the note's name collapsing in only once the hero title is under the bar (see "Header", §6) → `Tag`, ONE line (ellipsis) below ×1.3 text, wrapping at large text: domain dot + "IS Operations · 4B1 Business Impact Analysis" (the header no longer repeats the domain: two levels of wayfinding, not three) → `hero` name → `meta` "About 3 min read" (the note's `minutes`), plus "· Read" in `accentText` and a 14 ✓ that draws when marked on this visit (one stop: "About 3 minutes to read. Marked as read") → the lesson row between full-width hairlines: Play in a `soft` circle, kicker "Lesson · 5 min · Not done yet" (or "· Done"), the lesson's title in `label`, chevron (spoken "Lesson: <title>, 5 minutes, not done yet") → "On this page" and the body (above) → the ending, 32 under the body: ONE primary "Practice this concept" with its centred `meta` "10 questions on this idea. Your answers count toward your progress." (only when the note lists questions; starting it marks the note read) → 24 → a quiet `ListRow` "Next note" (kicker) over the next note's name, chevron, no icon → the source row: "Code 4B1.2 · Mark as not read" left (the toggle is a 48pt `accentText` text button; "Mark as read" when unread), "Report a problem" right. **Reading to the end marks the note read**: once the ending's top comes into view, only after the learner's OWN drag (a jump link or an iOS bounce on a short note never marks it), once per visit (a learner who taps "Mark as not read" keeps it unread). It is announced: "Note marked as read. Mark as not read is at the end of the note."; the toggle says "Marked as read" / "Marked as not read". Four stacked pills became one pill, one row and one source line.

**Study notes** (added 2026-10-08; since 1.21 reached from Learn's "Look it up" section; hidden while the notes pack is empty): *Home* = pushed header "Study notes" → `meta` line → search field (`raised`, 1.5 `control` outline, 48 min, body text, 48pt clear ✕; the result count is announced to screen readers after typing pauses; an empty pack shows an empty screen) → "By domain" + "3 of 120 read" → rows: domain dot (lead 16) · `label` name · `meta` "26% of the exam · 3 of 24 read" · 28 read circle. Search replaces the rows with results (title + 2-line `meta` snippet + `caption` domain). *Domain* = the one forest panel (domain dot + "Domain 4 · 26% of the exam", `hero` name, `meta` read count, `small` overview in `onForest` clamped to 3 lines + 48pt "More"/"Less" toggle) → "Think of it like this" `caption` + `body` `ink2` analogy on the paper, so the first topic shows on the first screen → "Part A · name" headlines → per topic: `caption` code in `accentText`, `headline` name, `body` `ink2` overview, "You should be able to" bullets (6pt `accent` dots), subtopic rows with read circle → "Domain key terms" folded. *Subtopic (before 1.21; the body is now described in "Study notes, the subtopic body" above, and the screen around it in PR #58's lesson row and ending)* = `Tag` (domain dot + topic) → `hero` name → sections in schema-v2 order, each a `Section` headline: "In one line" in `stem`; bullets for How it works; Compare table side by side only when it fits (label column 100 + columns ≥120: 2 columns on a phone, 3 on wider screens), otherwise and at ×1.3+ text stacked as one bordered block per row (1px `line`, radius 16: row label, then each column name in `accentText` `caption` + cell); Illustration drawn so its smallest label is ≥13pt (×1.5 with large text, max 4 columns wide), scrolling sideways with a `meta` hint and a `bg` right-edge fade that clears at the end, `meta` caption; "The IS auditor’s lens" = key-idea recipe (3px `accent` rule + `quote`); Exam traps = `tipBg` blocks with `tip` captions "Trap" / "Why it's wrong"; Key terms and Types = hairline term lists → footer: secondary "Mark as read" (toggle, ✓ + "Marked as read", selected state) → when the note lists `practiceIds` that still exist: primary "Practice this concept" (questions shuffled) with a centred `meta` helper 4pt below ("N questions that test this concept. Answers count toward your progress."), then secondary "Practice this domain"; with none, "Practice this domain" is the primary → ghost "Next: …". Diagram colours: web CSS variables map to palette tokens in `engine/notesSvg.ts` (`accent-fill` → `forest` for box fills, `accentText` for text, `accent` for lines/icons; white text → `onForest`; every label ≥4.5:1 in both themes, tested; `surface` → `raised`, `border2` → `control`, `text`/`text2` → `ink`/`ink2`).

**Lessons and notes are linked (mobile 1.20)**: lessons are the course you follow, study notes the reference you look things up in, and each points at the other per topic. Icons never cross: Play (▷) always means a lesson and BookOpen always means a study note (session rows, Guided "Learn it", Today's plan, notes pages, game recaps); a resumed set on Today uses the plan's practice / mock icons (Target / Timer), never Play. The links are computed from the lessons (`lessonsForSubtopic`: a lesson's `notes` ids first, else the note's outline topic), never stored on a note. No double colons: a row's title is the lesson's or note's own name, its kind goes in the `meta` line, and the spoken label keeps the verb ("Lesson: …", "Read the note: …"). Each note carries a reading time (`minutes`, 200 words a minute over its text, set by the notes build) shown as "about N min".
- *After a miss* (practice, review and Guided; never inside a mock; nothing after a right answer): a hairline, then at most two `ListRow`s between the vine and the trust line. Row 1, whenever a note lists the question: BookOpen, kicker "Read the note" over the note's name, `meta` "About 2 min · the idea this question tests" (the note's own `minutes`; spoken "Read the note: <name>, about 2 minutes, the idea this question tests"). Row 2, only while the lesson is not done: Play, kicker "Take the lesson" over the lesson title, `meta` "5 min · Not done yet" (spoken "Take the lesson: …"). The lesson is the first one not done yet among the one that prepares the question and (mobile 1.22) the ones that teach its note (`lessonsForSubtopic`, as the note page offers them: d4_062 → 4B1.2 → "RPO and RTO"); none left = no row. Both push, so Back lands on the same answer with its explanation.
- *Results*: (mobile 1.43) "What you missed", open under the notice: up to three BookOpen rows grouped by note, most-missed first, kicker "Read the note · questions 3 and 7"; the limit applies after notes that do not resolve are dropped. It is the only notes path for a mock's misses. (1.20–1.42: a ghost "Notes for what you missed" expander.)
- *Mistake journal*: each open mistake a note covers gets a small leading-BookOpen ghost "Read the note" (spoken with the note's name).
- *Lesson cover*: under the map, a `caption` "Goes deeper in the notes" and one `meta` line per note name (one stop, names joined by ";"). *Lesson complete*: ghost "Read the note" (leading BookOpen; spoken "Read the note: <name>") between the primary and "Next lesson". At ×1.6 text and above the three actions scroll with the page instead of a pinned footer. "Back to Learn" goes to the Learn tab, not Back.
- *Note page* (mobile 1.22, design spec §3): see "Study notes, the subtopic screen" below. *(1.20–1.21:)* a Play row with the lesson title / "Lesson · 5 min · Done"; the footer was "Mark as read", "Practice this concept" and "Next: …".
- *Notes domain page*: each topic is a collapsible group like Learn's domain groups (56pt header: `caption` code, `label` name, `meta` "2 of 5 read" or "All read" (dropping under the name at ×1.3+), a chevron that turns; `expanded` state). The topic open by default, the first with something unread, is chosen once when the page opens. Inside: the overview, "You should be able to", a Play lesson row when a lesson teaches the topic, the subtopic rows, "Practice this topic". Headers are buttons (one role each), so the Part titles are the headings to jump between.
- *Readiness report*: each domain row ends in a ghost, its own stop: "Lessons and notes ›" (spoken "Lessons and notes for <domain>") switches to Learn on that domain; once every lesson there is done it reads "Study notes ›" and opens that domain's notes.
- *Navigation*: a set started from a note, a notes domain page or Lesson complete goes back to the tabs first, then opens the session (`openSessionFromStack`), because those screens can sit on top of an old session or its Results; only the session screen in view ever opens Results. A tab reached from a root-stack screen (Learn from the readiness report, Today or Play from Badges, "Back to Learn") dismisses back to the tabs (`openTab`), never pushing a second tab bar.

**Empty state** (Mistake journal, Saved, Spaced review "all caught up", No mocks): pushed header → its own drawing 170 in `accent` (1.9: Spaced review = fern, Saved = bookmark, Mistake journal = pressed leaf, Your reports and the notes search = field book, the bank's filters = what that filter would show (Saved bookmark, Missed pressed leaf, Not yet answered field book), games and anything still to come = seedling), 46 from header → `hero` centred one-line title ("Nothing open right now") → `body` `ink2` centred, ≤ 2 lines → optional **next line** (1.9): a sentence, not a pill (the pills below are teaching tags): a small `accentText` leaf and a `meta` `ink` line about what happens here next, from the learner's own data only ("Next review: tomorrow · 6 questions", "12 mistakes cleared so far"). The Mistake journal's pressed leaf is taped to a herbarium sheet (a page with a folded corner, drawn quieter than the leaf) → optional teaching tags (non-interactive `soft` tags with a 6pt `clay` dot showing the trap types that will appear) → sticky primary action + ghost secondary. Copy is factual and forward-looking; no "Yay!".

**Question bank → a domain** (1.9, ui.md E3): a topic header (`caption` `accentText` + the learner's own counts) only when the topic shows 2 rows or more under the current filter; a lone row names its topic itself in a `caption` `ink2` line above its stem (and says it, after its status). A lone row right after a grouped topic's rows is set `space.lg` apart, the gap a header would open, so it never reads as that group's last row. The "not yet answered" mark is a small 12pt open ring in `control`, centred in the 24pt mark (a full-size ring read as a radio button); ✓ and ✗ stay filled 24pt circles.

## 12. Brand: KaiSip "Kasama" (the owner's choice, 15 Oct 2026; True North is retired)

The app is called **KaiSip** (written exactly "KaiSip" in running text; the lowercase wordmark "kaisip" appears only inside the logo). It was called Aurivan until mobile 1.22; the "True North" mark (a compass needle over an open book) and its `BrandMark` / `BrandLockup` code are gone.

**Mark.** Kasama is a K built from three leaves: the upright leaf (with its vein) is you; the pair growing toward it is your kasama (companion). It reads as a letter at 29 px, which makes it the strongest app-icon shape. The vein is a real cut-out (an SVG mask), so the mark works on any background.

**Lockup.** Mark + lowercase "kaisip" in Fraunces 600 (outlined, with the wordmark's own small leaf as the dot of the i). The wordmark never wraps; the lockup is never recoloured, stretched or re-set in another font.

**Masters.** `design-notes/brand-kaisip/`: `icon.svg`, `foreground.svg`, `monochrome.svg`, `splash_light.svg`, `splash_dark.svg`, `lockup_light.svg`, `lockup_dark.svg`, `sheet.png` (usage), `png/` (renders) and `web/` (favicons, apple-touch-icon, icon-512 and the lockups for the website). All store assets are re-rendered from these SVGs, never redrawn by hand.

**In the app.** `KaisipMark` and `KaisipLockup` in `components/brand.tsx` are the only brand drawings (react-native-svg; paths copied from the masters, the wordmark already outlined, so no font has to load). Colours are the `kaisip` tones in `theme/tokens.ts`: on paper the upright leaf is forest `#1E4A34`, the pair and the dot of the i are `accent` `#2B6E4A`, the wordmark is `ink`; in dark the leaf and wordmark are paper `#F3F1EA` and the pair is `sap` `#A9D9BA` (contrast 8.91 / 5.41 / 14.37 on paper, 16.19 / 11.6 / 16.19 on the dark bg; 3:1 is needed for a mark, 4.5:1 for text). `tone="auto"` (default) follows the theme; `light` / `dark` force one (the welcome forest panel and the share cards use `dark`). Spoken "KaiSip" as one image; pass `decorative` when a parent already says it. Used on Today's header (height 28), the welcome panel (34), Settings → About (28) and the share cards (30, badge card 22).

**Vision (Set A "Rings").** *Mobile 1.39 (owner decision, 22 Oct 2026): Settings → About leads with the welcome's words, "Think like an IS auditor." (`hero`) and "CISA exam prep, taught the way the exam thinks." (`quote`), then the pillars, then two `meta` lines: "Starting with CISA. More certifications later." and the one provenance line, "Original questions and notes, written with AI assistance and checked against ISACA’s published exam outline and standards." (`PROVENANCE_LINE`, the same words in the ISACA FAQ answer). The old tagline and vision line are retired; the Certification picker lists only CISA.* Copy lives only in `content/brand.ts`. Pillars: See the path / Grow deep roots / Grow with the seasons / Stand tall, in Settings → About under the caption "The KaiSip way" (the web's About uses the same caption); the welcome screen states the same lead plainly. The pillars are plain rows on the paper in both places (`PillarList` `rows`, 16 apart): they are not choices, so they are never raised cards.

**Store assets** (`mobile/assets`, same file names and sizes as before the rename):

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024 | Forest gradient square, paper upright leaf, sap pair. iOS `ios.icon.light` and the default icon. Full-bleed, no pre-rounded corners (the OS rounds it) |
| `icon-dark.png` | 1024 | iOS dark: the same mark on a transparent background |
| `icon-tinted.png` | 1024 | iOS tinted: grayscale on black (white upright leaf, light-gray pair) |
| `android-icon-foreground.png` | 512 | Transparent; the mark spans about 47% of the canvas, inside the 66 dp safe circle (61%) |
| `android-icon-background.png` | 512 | Solid forest `#1E4A34` (also `adaptiveIcon.backgroundColor`) |
| `android-icon-monochrome.png` | 432 | Android 13+ themed icon: one colour, alpha only |
| `splash-icon.png` / `splash-icon-dark.png` | 1024 | Transparent mark + wordmark; splash bg paper `#F3F1EA` / forest `#1E4A34`, `imageWidth` 200 |
| `favicon.png` | 48 | Web |

There is no separate notification icon configured (`expo-notifications` runs with its defaults).

**Never alpha on the main iOS icon.** `icon.png` and `icon-tinted.png` must be opaque RGB (PNG colour type 2); App Store Connect rejects an icon with an alpha channel. `icon-dark.png` is the one iOS icon allowed to be transparent. `src/__tests__/brand.test.tsx` checks the opaque ones.

**Old marks.** The navy compass-A logo (`#0B1E3D`, web only, before v11) and the Aurivan True North mark no longer appear in the mobile app or its store assets.

## 13. Your plant (mobile 1.13–1.14, Phase 4a and 4b)

One optional plant companion that grows only from real learning. No cartoon
mascot, no needs, no guilt. Rules: `mobile/src/engine/plant.ts`; art:
`mobile/src/components/plant/` (react-native-svg, ported from the Phase 0
generator, original art); colours: the `plantLeaf`, `plantArt` and
`plantTheme` tokens (§3 rules apply: the plant is an object, so its leaf and
material colours are fixed; only the ground shadow, marks and the resting
dusk follow the theme).

**What it is.** 13 species (oak, maple, narra, cherry blossom, pine, coconut
palm, mango, bonsai, sunflower, lotus, sampaguita, cactus, bamboo), each at
six growths: Seed · Sprout · Shoot · Bough · Crown · Elder. From Bough on,
each exam domain is one part of the plant (a limb, a pad, a leaf, a culm),
sized half by blueprint weight and half equal, and full from 62% to 108% with
domain mastery: a weak domain looks young, never bare or brown. Certs with
more or fewer than five domains map onto the five drawn slots (extra domains
merge into the nearest slot; missing slots show young).

**Growth.** Only from clean answers (no Coach me, no games), the readiness low
end (clean answers only), how much of the outline is known (mastered on two
different days, weighted like the exam), mocks and the exam-ready hold. Never
taps, minutes, streaks or games. Growth never goes down; only the learner's
Reset (back to a seed, name, species and look kept) or a restore clamp lowers it.

**Words.** Always "growth", never "stage" ("Bough · growth 4 of 6"). The
journey line carried no number from PR #43 ("Rehearse the exam"), so Today
never showed two numbered ladders side by side. Mobile 1.23 (the owner's
mockup A, decided) says "Stage 4 · Rehearse the exam" on Today's readiness
row again; the plant no longer sits beside it (its row is under the tiles
and shows only its name), so the two ladders are still never side by side
and `copy-consistency.test.ts` allows "Stage N" in `home.tsx` only; Phase 5's numbered "Step 3 of 6" belongs only to the Your path
list, where no plant appears. The rules say where their numbers come from:
"The low end of your readiness, without hints or games, reaches 55%", and
Elder's "The low end of your readiness holds at 80% or more for a week". Never a guilt or needs word (wilting, thirsty, misses you). Never the
bank size. Never "Pokémon".

**Where it lives (and never).** Keepsakes show on Your plant and in the Look preview only; Today and You draw the plant, its colours, planter and (on a cleared day) its visitor, never the keepsakes, so Today stays study-first.

| Place | What | Size |
|---|---|---|
| Today | In the slot beside the readiness range, replacing the small mono rings, with its name in `meta` under it (the tap affordance, inside the same target); tap opens Your plant. Its own screen-reader stop; the readiness words keep theirs. Drawn at the small detail level. On a cleared day (the readiness row gives way to the clearing) it sits under the clearing at a modest size, happy, with its visitor and "A wren came by: you cleared today's plan." | 104pt (88pt cleared) |
| Today, below | One calm line when it grows (`PlantNote`, "Your plant grew", right under the readiness row). With no plant, one quiet "Plant a companion…" line with Plant yours / No thanks (dismissed for good), BELOW the Also today / Tomorrow block: never ahead of the day's study | — |
| You | Header row under the title: the plant (in its colours and planter, no keepsakes), its name, its growth; or "Plant yours". One slow breath the first time You comes into view in a session, after the rings have grown | 64pt |
| Your plant | The plant on the shared 200 × 200 stage (`fit={false}`), name, growth and its look in italic; the back-fill line once; the resting line; What grows it next (rule steps with bars, "Not yet" / "Done"); Your domains as text rows with "Next to grow"; Change species and Rename | 200pt |
| Picker (onboarding step 3 of 3, Plant yours, Change plant) | A radio grid of the 13 species, each previewed at Crown; the columns come from the measured width and text size (a tile needs 112pt × the text scale, up to ×1.3): three when they fit, else two (a 360 dp phone), and one row per species (56pt plant beside its name and line) at ×1.6 text; names wrap to two lines, never mid-word; selected = 2px ink border. The name field starts empty with an idea as its placeholder ("Another idea" fills one in; empty = "Your oak"); the keyboard never covers it (the footer hides while typing) | 56–96pt |
| Look (mobile 1.14) | A live preview pinned under the header (it stays in view while the choices scroll; small detail level, so a tap rebuilds quickly; its label names the style, visitor, planter and keepsakes it draws), then Style (1.40: three radio rows, each a 56pt drawing of this plant in that style), Colour (swatches), Ground and Visitor two across when two fit (the width is known from the first frame), Planter (a 40pt planter icon with a sprout in it) and Keepsakes always one column of rows (an icon, the name, the skill line); one column for everything at ×1.3+ text. Planter and Keepsakes list only what is open; the planters and keepsakes still to earn wait in ONE closed "More to find" group at the end (no count; "Badges and finished badge sets add more. Each one says how."; rows arrive 30 ms apart, a 120 ms fade reduced). Colour, Ground and Visitor keep their one locked choice inline. Selected = a 2px ink ring that cross-fades in (an always-mounted state layer, nothing reflows) and, for a keepsake, a ✓; the press is the soft tint. Keepsakes say "Show up to three", or "Three on show" with "Tap one that's on show to put it away, then pick another." while the others are drawn muted. Radio groups, keepsakes checkboxes; a tap applies at once (selection haptic) | 140pt; 96pt at ×1.3+ text; 72pt at ×1.6+ or on a phone under 700pt tall |
| Question, mock, lesson, game and Results screens | **Never**: no plant, face or looping art while answering (practice, review, mock, lesson steps, games in play, answer feedback). Tests walk each screen's imports, and check that its hero panels are still (`plant-proud-118.test.tsx`) | — |

The rings stay on You and Results as the numeric view.

**Settings → Badges and your plant** (called Your plant before 1.17; the plant screens' "Open Settings" / "Plant settings" open Settings scrolled to this group, `?section=plant`). Show my plant (off: no plant and no prompts
anywhere; growth is still kept, so turning it on shows the truth) and, while
the plant shows, one row "Change its look" that opens the Look screen.

**Style (mobile 1.40, owner decision 22 Oct 2026).** How the plant is drawn is
a per-plant look slot, `look.style`: **Botanical** (the faceless line drawing,
§10.3), **Storybook** (the rounded art, no face) or **Storybook with a face**.
All free, listed first on the Look screen; each card draws THIS plant that way
at 56pt. The rule (`engine/plantLooks.ts resolveStyle`), with no migration and
no renamed key: a plant with `look.style` uses it; a plant saved BEFORE 1.40
has none and keeps exactly the art it had (the face, or no face if the old
Settings switch Quiet look was on; `plantSettings.quietLook` is still read and
kept in backups). `plantNew` writes `botanical` at birth, so every new plant,
and an existing learner's first plant after the update, is botanical. Quiet
look moved from Settings into this choice. Only "Storybook with a face" draws
a face and says its mood ("Looking proud."); the face is never sad: calm, or
sleepy while resting. A botanical plant shows **no visitor and no keepsakes
until the learner picks them** (the visitor defaults to "No visitor"); picked
ones are drawn in line. The storybook styles keep the wren and the first three
earned. The Look preview's label says the style ("Kai, your oak, botanical
style."). Resting, botanical: the dusk disc, a line moon and a 1.5° settle. The dusk is a Grove neutral for both styles (1.40 UX review: `#E6E7DE` light, `#1B2820` dark; it was lavender and navy), and resting lines take `plantLine.restLineMix` more ink in light so leaf, soil and star lines stay ≥ 3:1 on it.

**Resting.** After 3 days without study, or on the exam eve and exam day, the
plant sits on a soft dusk disc with a small moon and closed eyes, and Your plant
says "Kai is resting. Pick up whenever you're ready." (after 7+ days: "Kai kept
your place."). The exam eve says "Rest day. Sleep and time off help memory
settle." and exam day "Good luck. You've done the work." It never counts the
days and never changes the plant itself.

**Names.** Cleaned on save: whitespace (newlines too) becomes one space, every
invisible control or format character goes (a name of only those is no name),
emoji joiners and script joiners stay between visible characters, and a name
is at most 20 characters, never cut inside an emoji or an accent. A
right-to-left name is bidi-isolated where a sentence shows it.

**Restore.** A restore never lowers growth an honest file earned: the clamp
runs the same gates as live growth on the most generous facts the file
allows, and evidence a save can lose (mocks past the newest 50, readiness days
past the log, renamed subtopics) never counts against the plant.

**Look (mobile 1.14, Phase 4b).** Catalogue and rules: `mobile/src/engine/plantLooks.ts`.
Six slots, chosen on the Look screen (Your plant → Change its look, or Settings → Change its look): Style first (1.40, above), then:

| Slot | Free | Opens with |
|---|---|---|
| Colour | two colourways per species | the third at Bough. None reads as dying or grey: Frost and Silver leaf are a cool blue-green, white blossom is snow with a blush shadow, the coconut's third is Golden (green-gold fronds, orange nuts) |
| Ground | Meadow | Stone ring at Crown; Trail blaze (a painted True North waymark) at Elder |
| Planter | its usual home (meadow soil, the lotus' water bowl, the bonsai tray, the cactus' clay pot); a terracotta pot | one per completed counted badge set (`milestones.planters`): Fieldstone, Five-stone, Celadon, Compass-rose, Banded, Root-woven. All the same width and depth (the compass-rose rim is lifted like the others') |
| Visitor | the wren; "No visitor" | the robin at Shoot. It perches only on days the plan is cleared ("A robin came by: you cleared today's plan.") |
| Keepsakes (show up to three) | — | each badge's emblem as a small object (the lantern, the sundial, the jay, the fox…), at any tier on any exam; the ribbon when a pass is reported. Firm Footing and Rooted give part marks and undergrowth later instead. Until the learner chooses, the first three EARNED are on show (derived, never stored); their own list, even an empty one, then wins |

Rules: unlocks are derived, never stored (free OR growth OR a badge on any
exam OR a completed set OR `kept`; the ribbon only with a reported pass,
whatever `kept` says). Game levels unlock nothing; nothing is paid; there is
no "n of m". A locked choice is a dashed outline that says what to do, then
the badge ("Finish a timed mock on pace (the On Pace badge)."; with Show
badges off, only what to do), never a guilt line, and can't be picked. A look
carries no readiness claim (the screen says so; captions are past tense:
"every domain reached 65% or more"). A choice whose unlock vanished (a
restore) draws the slot's default and stays stored, so it returns when
re-earned. Reset copies every open unlock it can carry into `kept` (growth,
badge and set unlocks: never a free item, never the ribbon, whose pass date
survives anyway), writes down the default keepsakes on show as the plant's
own choice, and carries the reset exam's badge and set unlocks into every
OTHER exam's plant too, so no plant loses a keepsake or a planter (a property
test checks each plant draws exactly what it drew before). Backups accept only
catalogue ids in their own slot, and a `kept` of keepable ids only.
Keepsakes stand on the shelf line: two base slots beside the plant and one
behind it, clear of the trunk (in a pot: in its soil, the rim over its foot).
Flat ones (a stone, a pond, a ring, a nest, a path) take the base slots first;
a flat third lies in front at 80%. In dark mode the darkest wood lifts a step
and each keepsake has a 1px cream rim at 35%. The clear dawn is a soft sun
behind the crown. Each icon is fitted to about 80% of its square, centred.
The badge sheet adds one quiet line to an earned badge: "On your plant: the
lantern." only when it is on show; otherwise "A keepsake for your plant: the
lantern. Show it from Your plant, Change its look."

**Moods.** Idle, happy (the plan is cleared), curious (a new topic opened
today), proud and resting, on the FACE only (no posture, no marks; the resting look keeps its
moon). Proud (redrawn in mobile 1.18: the old half-lids read as smug or
sleepy; then, after the PR #51 review, made distinct from happy at 64 and
104pt) is drawn only in lines: eyes closed in FLAT, WIDE lids (about 1.3×
wider than happy's eyes and well under half their height, still bowed
upward, slightly thicker), a wide STROKED smile (a line, never a filled
shape; about twice rest's smile) and the warmest blush, in the plant's own
`plantArt.ink` and `plantArt.blush` only. It reads content and pleased,
not smug or sleepy. Happy is the tall, pointed "^ ^" with a small FILLED open
grin, resting the downward "u u", blink a flat line. The two cues (eye shape,
line vs filled mouth) keep happy and proud apart even at 64pt. Checked on all
13 species in both themes (`proud-light/dark` in `plant_sheet.sh`), with
happy beside proud at 64 and 104pt in `happy-vs-proud-light/dark`. Quiet look shows none. Spoken in the
label ("Looking proud.").

**Motion (mobile 1.14).** `LivePlant` draws three layers (back, plant, front)
and moves only the plant layer's wrapper, transform and opacity, pivoting on
its base; the SVG is built once per species, growth, look and theme and the
elements are cached, so no path is rebuilt per frame (low-end Android).
- **Breathe**: one slow breath (2 s in, 2.4 s out; about 2pt deep:
  `breathDepth` = clamp(2 / size, 1.2%, 2.0%), so 2.0% at 64pt, 1.9% at
  104pt, 1.4% at 140pt, 1.2% at 200pt; a 0.7° sway either side of upright) the first time You or Your
  plant comes into view in an app session, then still. It waits for a
  reaction to finish, and on You for the rings. Stopped (and back at rest)
  off screen and in the background. Never on Today or onboarding (the plant
  there is still), never a loop. Quiet look keeps the breath.
- **Reactions**: happy stretches up from its base (3.5% taller, 1.2% narrower;
  no hop: it stays rooted), curious leans 3° and holds a look (900 ms,
  charged its whole length), proud stands 4% taller (180 ms up, 420 ms
  back), once per occasion EVER wherever the plant is first seen, charged
  to the 3 s decorative budget. Happy and curious are keyed `cert:mood:day`;
  proud by its earned occasions (below). Played occasions are saved in
  `store/seen.ts` (`reactions`, two weeks kept), so a relaunch never replays
  one (mobile 1.18, fixes QA BUG-4). Never with the growth sequence, nor
  later on a growth day; on Today it waits while the clearing plays.
  Anything that cuts one short (the screen loses focus, Reduce Motion turns
  on) puts the plant back at rest at once. Mobile 1.40: the posture plays for
  EVERY style (a faceless botanical or storybook plant still stands tall on a
  good day); only the face style draws the mood and says it.
- **Proud (mobile 1.18, expert panel)**, rules in `engine/proud.ts`: only for
  something earned today: a growth step (never a back-filled one), or a NEW
  keepsake from a LEARNING badge (the first tier, on any exam, of a badge in
  the six counted sets; never a game-only Field notes badge such as Whole
  Grove, never Fresh Start, never a mark saved by a quiet fill). Never for a
  visit, a tap or a streak; no random rewards. Each occasion is written down
  in `store/seen.ts` (`proud`); keepsake occasions are capped at 3 in any
  rolling 7 days (a 4th is noted as capped and changes nothing), growth
  always counts. The proud face lasts until local midnight, then idle.
  Occasions are written down only while the proud moment really shows: with
  the plant hidden or resting, nothing is written, so an unseen moment never
  uses up one of the 3 (PR #51 review). Since 1.40 the proud posture shows for
  every style, so a faceless plant's moment counts like any other. After a
  Reset, re-earning a badge whose keepsake the plant kept (`CertPlant.kept`)
  is no new keepsake, so no proud. A reaction is saved as played only if it
  really played: when the session's 3 s budget is spent, the occasion can
  still play on a later visit. What is seen (`store/seen.ts`) is not in the
  backup, so restoring today's backup on a new phone can show today's proud
  face and stand-tall once more there; that is accepted (it is still one
  earned occasion, on a phone that never showed it).
- **Growth sequence**: see §8.9; `useCelebration('plant-growth')`.
- **Planting** (after onboarding's last step, "Plant it", M8): once the page has arrived (`dur.screen`),
  the seed settles 14pt into the soil, then the first sprout pops from 0.3
  (820 ms); one light haptic; screen-reader focus moves to the "Planted"
  header; then "Start studying".
- **Cost**: while anything moves, the moving layer is one cached bitmap
  (Android `renderToHardwareTextureAndroid`, iOS `shouldRasterizeIOS`), so a
  low-end phone never re-draws ~200 shapes per frame; at most 32 builds are
  cached.
- **Reduce Motion**: nothing moves; the end state shows at once with the same
  words. The plant is one image stop from its first frame.

**24pt chips.** At the icon level the round-crown trees differ by silhouette
(oak round, maple a flame, narra a flat umbrella, cherry three puffs, mango a
low dome with fruit); lotus draws one bold bloom over its bowl, sampaguita a
round mound with three big white stars.

**Large text and narrow phones.** Today stacks the plant above the range at
×1.3+ (the ReadinessRow rule). Your plant's rule steps stack their status under
the rule at ×1.3+. Checked at 360 dp and about 200% text (`SHOTS=plant`).

**On the website (web v12.11).** The web draws the same plant from the same
code: `mobile/scripts/build-web-plant.mjs` compiles `engine/plant.ts`,
`engine/plantLooks.ts`, `components/plant/art.ts` and the outline code into
`assets/kaisip-plant.js` (never edited by hand; `npm run check` fails when it
is stale), and `index.html` draws the part tree as SVG. What differs from the
app, and why:

| Place | App | Web |
|---|---|---|
| Today | Beside the readiness range at 104pt (88 cleared); "Plant a companion" row below Also today | Inside the readiness plate, under the domains: a 72px plant row (name, growth, opens You); the invitation sits in the same spot. The plate is the web's readiness column, so the plant stays beside the readiness it reads from |
| You | 64pt header row; the full Your plant screen is its own route | From 1180px: the study rail's right column holds the whole Your plant content (200px shared stage, what grows it next, look actions). Below 1180px: a compact row near the top (112px, framed tight) with the rules and the look behind one disclosure, so progress still leads on a phone |
| Picker, rename, change plant, look | Pushed screens | One dialog (the shared popup holder, so Esc, the focus trap and focus return behave like every web popup); the look preview is sticky like the app's pinned preview |
| Motion | Breathe burst, reactions, the growth sequence, planting | The Breathe burst only (CSS, once per visit on You, none under reduced motion); the grow-up is one calm line on Today |
| First plant | Planted for you (an oak) after the first set | Picked by the learner from Today's invitation or You (species, optional name) |
| Keepsakes, badge-set planters | From badges | Closed (the web has no badges yet); growth unlocks all work |
| Visitor, happy face | On a cleared day plan | No day plan on the web: the visitor shows in the look preview only |
| Elder's week | The readiness log | Logged on the web from v12.11 on, so an existing learner's week starts then |
| Settings: Show my plant, Change its look | Settings → Badges and your plant | Not on the web yet |
| Style (1.40; web v12.31) | Look → Style: Botanical, Storybook, Storybook with a face; new plants botanical; a plant with no style keeps storybook | The same rule and the same Style group, first in the look editor; the species picker previews a new plant botanical |

## 14. Fit your plan (mobile 1.15, Phase 5a)

Two answers shape Today: where the learner is starting from, and how long
they can study most days. Rules: `mobile/src/engine/fit.ts` and
`engine/planner.ts`; controls: `components/fit.tsx` (the same words in
onboarding, Settings → Your study and the fit screen).

**Onboarding (4 steps).** Step 1 the exam · step 2 "Where are you starting
from?" · step 3 the date, then "Daily time" (10 · 20 · 30 · 45 min, 20 to
start) on the same screen · step 4 the plant. Step 2 uses step 1's raised
choice rows; no row is preselected, Continue waits for one (its spoken hint
says "Choose one, or skip this question."), and the ghost "Skip this
question" sits beside Back. "Step N of 4" appears only in onboarding.
Nothing is saved until the last step. The exam date starts on "Not sure yet"
(a date is never invented for the learner; the spec's "In 3 months" default
was dropped on review). Each step's question is one header stop, and
screen-reader focus moves to it on every step change (never waiting on the
entrance).

**Minutes everywhere (C1).** One style: "About 12 min" at the start of a line,
"about 6 min" mid-line, and from two hours in hours ("About 4 h"); screen
readers hear "minutes" and "hours" in full: every shown minutes line has a
spoken twin through `engine/pace.ts spokenMin` (HeroPanel `captionMetaLabel`
/ `metaLabel`, Section `metaLabel`, row labels). `engine/pace.ts aboutMin`. The exam pace is always in seconds, as two named
facts: "The exam allows about 96 seconds a question." and "Aim for about 90
seconds a question, so there's time to revisit flagged ones." Never a bare "s".

**Today.**
- Under the hero's leaf marks, one `meta` line: "About 20 min today" (the open
  items; a mock adds "+ mock"). Plans saved before 1.15 have no budget and show
  no total.
- "Also today" and "Tomorrow" carry "About N min" as their Section meta; a mock
  is left out of the sum (its row says how long it is).
- A review that takes part of the queue: "Review 55 due" / "About 10 min · 8
  today, most overdue first" / row "Spaced review · 8 today". In the Tomorrow
  preview the row is titled "Spaced review" (tomorrow's queue isn't known yet),
  "Review · 8 tomorrow".
- The weekly mini mock is **optional** and **never leads**: the planner puts it
  right after the first timed item, so the hero always matches "About N min
  today". Its row reads "Optional this week · about 80 min". The day clears
  when the timed items are done ("Two of two, done."; a mock taken anyway
  counts), and the mock is offered again each day until taken. It is due again
  7 calendar days after the last mock (Monday evening → next Monday), never in
  exam week, and exempt from the budget. A day with nothing but a mock is that
  mock: the hero shows it and the line says "A mock today".
- A new learner's starting days: day 1 is the next lesson + 5 questions; later
  days add up to 10 questions that fit the minutes. Exam week's light review
  keeps its size (10), whatever the minutes.
- The journey line stays numberless ("Rehearse the exam"); the plant beside it
  counts its growth.

**The "Fit your plan" card** (learners from before 1.15 only). The key-idea
recipe (3px `accent` rule, no shadow), `caption` "Fit your plan", `small` line,
ghost "Set it up" and "Not now". Below the day's study, never above the hero;
on at most 3 separate days (the third lasts all day), then hidden for good,
answered or not (`settings.fitAskDays`); never in exam week, beside the eve
card or the ready panel, or on a visit that showed the plant's setup line (one
setup line on Today at a time). The fit screen's intro: "Tell us how long you
have and where you're starting from, so Today's plan fits your time. You can
change these any time in Settings."
"Set it up" pushes the fit screen ("Your study": minutes, the three radio
rows, the Exam-focused switch, then Save / Cancel in a sticky footer).

**Settings → Your study** (after Exam; since 1.17 rows, §16): "Daily time ·
20 min" opens a sheet ("Most days. Your daily plan fits this." + four radio
rows, "20 minutes a day"); "Starting point · Some experience" opens the three
familiarity rows ("Not set" when none is chosen, which is allowed); the
"Exam-focused plan" toggle stays a switch. Before 1.17: caption "Daily time" +
the segmented minutes; caption "Where you're starting from" + the radio rows;
the toggle. A change rebuilds today's plan when nothing in it
is done yet (no tick, and no answers banked on an item); otherwise one
`accentText` meta says "Today's plan stays as it is. Tomorrow's will fit.",
announced once as it appears (`sayLater`, plus a polite live region).
(Since 1.17 the groups are Exam, Your study, Practice, Reminders, Appearance,
Badges and your plant, Your data, Help and about: §16.)

**Practice.** With the Exam-focused plan, or at the mock and ready stages,
"Mock exams" comes straight after the Timed switch, with the one-time
"Practice at exam pace?" card after it; otherwise the card sits under the
Timed switch. Never above the hero. The focus row reads "Weak spots: IS
Operations", like Today's Exam-focused item.

**Lists of domains (C9).** Title "Domain 4 · IS Operations", the full name as
the subtitle (`domainLabel`). Chips, legends, plan items and session titles
use the short name only. The You legend lists domains 1 → 5 with "Domain 1 is
the inner ring. Thicker rings weigh more on the exam."

**Mistake tags.** Acted as the wrong person · Missed FIRST or BEST · Tool
before policy · Fixed the symptom, not the cause · Misread · Didn't know it.
A ghost "What do these mean?" beside "Why did you slip?" opens a page sheet
with one example per tag; each chip's spoken hint carries the same example.
A chip is never wider than its row (`maxWidth: '100%'`, the label shrinks):
at 200% text a long tag wraps inside its pill.

**Hints.** Before an answer: "You used a hint, so a right answer counts as
half." After a RIGHT hinted answer: "You used a hint, so this counts as half a
right answer." After a wrong one: nothing (it counts nothing anyway).

**Switches in dark mode.** Off, the thumb is `ink2` (the dark `onBtn` thumb sank
into the grey track); on, it stays `onBtn` on `btn`.

**Large text and narrow phones.** Onboarding step 3 scrolls under the sticky
footer at about 200% text, with both groups reachable; the segmented minutes
stack at ×1.3+ (the Segmented rule). Checked at 360 dp and about 200% text
(`SHOTS=fit`). Nothing new animates; Reduce Motion changes nothing here.


## 15. Proof: the readiness report and exam week (mobile 1.16, Phase 5b)

A data screen and a calm checklist. Rules: `mobile/src/engine/readinessReport.ts`
and `engine/examWeek.ts`; drawing: `components/readinessReport.tsx`; screens:
`app/readiness.tsx`, `app/exam-week.tsx`.

**Readiness report** (`PushedHeader "Readiness report"`). No plant, no
celebration, nothing grows or draws in (motion on or off). Top to bottom:
1. The range (`BigNum` 52 + "estimated readiness"), or "Not enough data yet"
   with "12 more answers until your readiness range". One stop.
2. **What this number is** (key-idea recipe, always shown): `quote` "A study
   estimate, not a prediction." + `small` `ink2` limits line. Before there is
   a range the caption reads "What your range will be". "How it's worked
   out" is a `DisclosureRow` + `Collapse` right under it. Mobile 1.39: only
   the caption and the quote stay in view; the limits line, the yardstick
   (80% low end, 70% per domain) and how it is worked out are all inside
   that one expander, so the first action is not three explanations down. In exam week the
   "Exam-week checklist" row (a `ListRow` with its "2 of 5 done") follows
   straight after.
3. **What would raise your low end** ("What gets you a range" before there is
   one; "low end" is the number's one name on this screen): up to 3 rows
   (`label` text + a ghost button, each its own stop), in a stable order: the
   thinnest domain under 10 answers ("Answer 6 more in IS Acquisition to firm
   up your range"), the domain with the most to gain (skipped when it is the
   same one), the reviews due (one session's 20 at most). Nothing stands out:
   "Keep a steady mix…" with no button. Before there is a range: only "Answer
   N more questions to see your range".
4. **Your low end over time** (`caption` "The cautious end of your range, last
   30 days"): carried forward over gaps, on a static `ScoreChart` (`accent`
   1.75 line, the newest day a filled leaf, a `line` hairline floor). The
   scale is at least 20 points tall, so a 2-point wobble never reads as a
   cliff. Under it "From 58% to 66% over 30 days." (spoken "Your low end went
   from…"). Fewer than 3 days with a reading: "This fills in as you study on
   more days."
5. **Mock trend**: up to 10 mocks, oldest → newest. By SHAPE: a filled leaf =
   full mock, an outline leaf = mini mock, a small ring = another length, a
   dashed outline = untimed (any length, exactly as the legend draws it); a
   legend names only the kinds shown. Then the scores in one tabular line
   ("Oldest first: 56% · 58% · …") and the trend in words. The newest mock is
   compared with the one before FIRST, so a recent fall is never smoothed
   over: "Down 12 points since your last mock. One mock can swing; look at the
   domains below." Otherwise the last 3: "Up 6 points over your last 3
   mocks." / "About level…" (±2) / "Down 4 points over…". When mini and full
   mocks are both in the comparison: "Mini and full mocks are mixed here; a
   mini mock swings more." A fall is plain words: never red, never a warning
   icon. Spoken: each score with its kind ("56 mini, 59 mini untimed, 62
   full"), then the words. Always: "Practice scores are not scaled exam
   scores." + the exam's passing note. 0 mocks: `EmptyState` "No mocks yet" +
   ghost "Start a mini mock"; 1 mock: its score (`BigNum` 34) and kind, no
   trend words.
6. **Domain by domain**, 1 → n: `label` "Domain 4 · IS Operations"; `meta`
   "26% of the exam · domain readiness 68%", "Based on 120 answers" (under 10:
   "…: still firming up"), "Last mock 14 of 20 (70%) · the one before 11 of 18
   (61%)" ("–" for an older mock with no entry); a static 3px bar in the
   domain tone. A domain with no answers never reads "0%": "26% of the exam ·
   not started yet", "No answers here yet", the bar's empty track, spoken
   "Not started yet.". One stop per domain. Never "of N questions in this
   domain".
7. **Pacing** (timed mocks only): the You line, then up to 5 rows "11 Oct ·
   about 88 seconds a question · every question answered".
8. **Your path**: `stage` "Now: Make it stick" (no "Step N of 6": the plan can
   move back a step, and a counter that goes down reads like a score), then
   the six steps, each a `label` "3. Make it stick" + one `meta` line; the
   current one a filled `PlanLeaf` and "Now" (shape and word, never colour
   alone) with an `ink` reason line under it ("Until every domain is steady,
   practice leads."), the rest outline leaves. Under the list: "The plan moves
   between these as you go. If a domain slips, practice leads again for a
   while; mocks and lessons are always one tap away." Spoken per step: "3.
   Make it stick. Practice and spaced review. You are here. <reason>". With
   the Exam-focused plan, step 2 says the plan skips it. After the exam the
   line reads "After the exam" with no number. (Today's stage line stays
   numberless: the plant counts its own growth.)
9. **Your mocks**: the newest 5 as on You, then a `DisclosureRow` "Show all N
   mocks" with the older ones under it. Each is a `DisclosureRow` (`lead`
   score) that opens its per-domain results (dot, short name, "8 of 9 (89%)"
   or "–", spoken "8 of 9, 89 percent"), closed by a hairline when another
   mock follows. At large text the 66pt indent goes and the tally drops under
   the name (names shrink, never break mid-word). `?mock=<id>` opens that one
   (showing all first when it is older), scrolls it into view (following it
   while the layout settles, until the learner scrolls) and moves
   screen-reader focus to it. An unknown or repeated id opens nothing.
10. The trademark notice.

**Ways in.** Today: the readiness words are a button (`ReadinessRow onPress`;
a trailing chevron, a `soft` pressed tint, an `ink` ring while it has keyboard
focus; 6pt of room taken back by the margin, so nothing moves). With a plant
the plant still opens Your plant: two stops. You: a ghost "See your readiness
report" under the rings; "Mock exams" gets a trailing ghost "See report"
(`Section action`, stacked under the title at large text); each mock row opens
the report with that mock's domains. The exam-week screen links back.

**Exam week.** The planner tapers (PHASE5.md §3.2): 7–5 days out reviews, a
"Top-up: IS Operations" and ONE optional full mock ("About 4 h · a last long
rehearsal; skip it if you'd rather rest"; never leading, "Optional this week"
in its row) when none was finished in 14 days and the starting check is done;
4–2 days out no mock, the day fits min(minutes, 20) with a light top-up (≤ 10)
and a short game if it fits; the eve and the day are unchanged. Only a
full-length mock ticks the rehearsal (a mini mock doesn't). In exam week the
reviews read "Light review · 8 questions" (as on the eve), and Today's hero
meta says "About 30 min today + optional mock" while the rehearsal is open.
- **Today card** (7–2 days out, under the readiness row, above "Also today"):
  key-idea recipe, `caption` "This week" (the stage line already says Exam
  week), `small` "A calm week. A short checklist, then light review.", `meta`
  "2 of 5 done", ghost "Open checklist" and "Hide" (announces where the list
  stays, then moves screen-reader focus to the next heading, "Also today").
  Never red, never "overdue", never a notification.
- **Checklist screen**: `quote` "Use this week to settle in, not to cram.",
  the count, six `CheckRow`s (a 22pt rounded square, `ink` fill and a paper ✓
  that cross-fade in; the whole 64pt row is the target, spoken as a checkbox),
  with `meta` "Tick the one that fits you." above the online and test-centre
  rows (one choice, one slot: the count is out of 5), then "If you blank"
  (key-idea recipe) and "See your readiness report". Ticks belong to one exam
  date: a new date shows a fresh list (only one list is kept). Generic, true
  wording ("the official candidate guide"), no links out. No exam date: an
  empty screen asking for one.

**Practice (UX review O8).** A learner who never picked a length gets one sized
from their daily minutes, never past the day: 10 min → 10, 20 → 10, 30 → 20,
45 → 20. A chosen length always wins.

**Large text and narrow phones.** Charts keep their size (decorative; the words
carry them) and sit above their words; the legend wraps; the Section's ghost
drops under its title; an open mock's domains stack (name, then tally).
Checked at 360 dp and about 200% text (`SHOTS=proof`).


## 16. A tidy Settings (mobile 1.17)

The owner: "fix the settings screen, it's a bit messy. Categorize appropriately,
use dropdown or something so it would look neat and clean." Settings was one
long scroll of chip rows (five exam chips, six exam-date chips, segmented
minutes, radio lists, steppers, day chips) with every choice open at once.

**Mobile 1.43 (board 5 and the owner's feedback, 26 Oct 2026).** The owner, on 1.42.1 dark: "it's hard to distinguish the categories" (the group titles were `headline` in `ink`, the same white and nearly the same size as the rows), "if I want to change the theme I cannot see it easily" (Theme was in the 6th group), and a round gear floating over "Your name". Now:
- **Group titles never look like rows**: a `caption` (13/600) in `accentText`, letter-spaced 0.8 (sentence case: no uppercase eyebrows), 8 above the group, still `accessibilityRole="header"`. Rows stay `label` in `ink`. 32 above each group (16 above the first), and each group's rows sit between two full-width `line` hairlines, so every group has a clear start and end. Rows on the paper, no plates and no icon circles (the reviewers' choice; Grove §0 calls icon-in-circle rows iOS boilerplate).
- **Appearance moves up, right after You**, and **Theme is one tap**: a `label` "Theme", `meta` "System follows your phone’s light or dark setting.", then a `Segmented` radio group System / Light / Dark (spoken "Theme", each choice a radio with its checked state). Motion and Haptics stay with it. The Theme sheet is gone.
- Exam date shows how far away it is as its subtitle ("In 36 days", "Tomorrow", "Today", "Date passed"), also spoken. Starting point and Default mode get one-line hints ("How much audit you know; it shapes your first weeks", "How Practice picks your questions"). The Exam-focused plan reads "Mocks and weak spots lead Today" on screen and says "… Lessons stay in Learn." aloud. "Reset reading progress" shows only when there is reading progress to reset (the real read state); greyed out, it read like a heading.
- **The floating gear** (owner report): nothing on Settings draws a gear; it was the pressed gear of the screen underneath, whose press-out fade was still running while Settings was pushed (Android can leave that layer drawn over the new screen). The gears that open Settings (Today's and `ScreenTitle`'s) are `IconButton leaves`: on press their pressed circle is cancelled and set to rest at once, before navigating. Not reproducible on the web build; to confirm on a phone.
- The owner is choosing between four layouts (shot 26 Oct 2026: (a) rows on paper with these headers, shipped; (b) grouped plates; (c) icon-led headers; (d) a quick-settings strip). The other three were screenshot-only and are not in the code.

**The pattern.** Titled groups of rows (`SettingsGroup`, `SettingsRow`, §6).
Each row shows its current value and opens a bottom sheet with the choices
(`ChoiceSheet`; the calendar for the date). On/off settings stay switches in
place. Rarely needed things move behind one row (About KaiSip). Nothing a
learner set before was lost, and no saved setting changed shape.

| Group | Rows (value shown) | Switches |
|---|---|---|
| You (mobile 1.23) | Your name · Maya / Not set (a sheet with the text field, Save, Cancel and "Clear my name") | — |
| Appearance (1.43: moved up from 6th) | Theme (a one-tap System / Light / Dark control on the screen); Motion · Match my phone | Haptics |
| Exam | Certification · CISA; Exam date · 8 Jan 2027 (calendar) | — |
| Your study | Daily time · 20 min; Starting point · Some experience | Exam-focused plan (+ the "Today's plan stays…" line) |
| Practice | Default mode · Let the app choose | Timed practice; Shuffle answer options |
| Reminders | Time and days (summary as subtitle; Steppers and day chips in a sheet) | Study reminder |
| Badges and your plant | Change its look (opens the Look screen; 1.40, it replaced Quiet look) | Show badges (+ its "on again" line); Show my plant |
| Your data | Save a backup; Restore from a backup; Undo restore (while it applies) | — |
| (set apart) | danger "Reset CISA progress" + `meta` line | — |
| Help and about | Get help or send feedback; About KaiSip (vision and pillars in a sheet); Privacy policy and Terms of use when configured; Check for updates (mobile 1.19, installed apps only) | — |

Then the version line, the "Update … · …" stamp (mobile 1.19, installed apps
only) and the combined trademark notice, always visible.

**Check for updates (mobile 1.19).** Small updates reach an installed APK
over the air, but only when the app starts cold (`checkAutomatically:
ON_LOAD`), and even then the new code is used on the *next* cold start
(`fallbackToCacheTimeout: 0`). A phone brought back from the recent-apps list
for days can stay behind, and until 1.19 there was no way to check by hand or
to see which update was running. So the last row of Help and about is an
action row (no chevron), "Check for updates", shown only where
`expo-updates` is enabled and not on the web (hidden in Expo Go, development
builds and the web build). One tap is one check: nothing runs on its own,
nothing polls. The row's VALUE is the state, so it is spoken with the row
even with hints off, and a `meta` note under the title says why or what to
do: idle "Small updates usually arrive on their own when the app opens. Tap to
look now." → **Checking…** → **Downloading…** → **Ready to restart** ("The
update is downloaded. Tap Restart to update below; your progress stays as it is.")
with a primary "Restart to update" under the group; or **Up to date** ("This
is the latest version."); or **Couldn't check** / **Couldn't download** ("You
may be offline. Try again later."); or, after a failed restart, **Couldn't
restart** ("Close the app fully and open it again to finish the update."). Raw
error text is never shown. The row is disabled while checking or downloading,
and once the update is downloaded (a re-check would say "Up to date" while
the old code still runs; only Restart, or a cold start, finishes it). Each new
state is announced once, a moment after it shows, queued behind other speech.
No animation is involved, so Reduce Motion changes nothing; at ×1.3+ text the
state drops under the title like any row value. Under the version line, a
`meta` stamp "Update 1a2b3c4d · 5e26d4b" gives the first 8 characters of the
running update's id ("built-in" when the phone runs the code shipped inside
the APK) and the first 7 of the runtime (the native fingerprint), so support
can tell which update a phone runs. The ids are the same on every phone with
that update: no personal data. The "KaiSip v…" line keeps reading the
running update's version (`Constants.expoConfig.version`). The web
screenshot build draws the states with a demo client (`SHOTS=settings`,
`src/lib/updates.ts`); a phone never runs it.

**Values.** Short on the row, full when spoken: "8 Jan 2027" / "Friday 8
January 2027"; "20 min" / "20 minutes a day"; "Some experience" / "Some IT
audit experience"; "Not set" for no date or no starting point. Coming-soon
exams are listed but disabled, with a "Coming soon" badge and one `meta` line,
"More exams are on the way. We are writing original questions for them now."

**Exam date.** The calendar (§6) replaces the old "1 week earlier / 1 day
earlier / 1 day later / 1 week later" chips. The date is still saved as
"YYYY-MM-DD"; Save calls the same `changeExamDate` (it rebuilds today's plan;
exam week and the eve card follow it). Onboarding step 3 keeps its quick chips
and adds a ghost "Pick the exact date" that opens the same calendar; a picked
day that no chip gives is said under it ("Fri 20 Nov 2026 · In 39 days").

**Ways in.** `?open=exam-date` opens Settings with the calendar up (Today's and
the exam-week screen's "Set exam date"). On iOS it opens once the push
transition ends (a sheet presented mid-transition can be dropped). Its Save or
Cancel goes back to where the learner came from. "Now" is read each time the
calendar opens, so a screen left open past midnight never offers yesterday. `?section=plant` opens it scrolled to
Badges and your plant (the plant screens). The gear on Today and You is
unchanged. The fit screen keeps its own "Your study" screen.

**Theme.** Only in Settings → Appearance → Theme (System, "Follows your phone's
light or dark setting."; Light; Dark). The switch on You is gone, and the
`ThemeSwitch` component with it.

**Large text and narrow phones.** Row values drop under their titles at ×1.3+.
Sheets scroll inside and keep Save in reach; at ×1.3 text and up the
calendar's grid comes before the quick choices, nothing clips, and each day
stays at least 48pt tall (48 × 48 or more from 360 dp; on 320 dp phones the
grid uses the gutters, 43 wide). Checked at 360 dp and about 200% text, light
and dark (`SHOTS=settings`).

## 17. Accounts (Uplift Phase 6, built OFF)

Accounts are built and switched OFF in every build (ARCHITECTURE.md §3
"Cloud (built OFF)"). With the flag off, no screen below is reachable and
You and Settings look exactly as in §11 and §16 (`off-*` shots). Copy:
`content/cloud/copy.ts` only, held to the cloud copy rules by
`cloud-copy.test.ts` (no bank size, no "ISACA" outside the trademark notice,
no "official / certified / endorsed / forum" near an exam name, no reply-time
promise, no guilt, urgency or "!", curly apostrophes).

**Optional, never pushy.** Two ways in only: You → its own "Account"
section, just before Help and feedback (Phase 7, UX review O3: syncing isn't
help; it was Help and feedback's first row in Phase 6), one row (Lucide
`refresh-cw` in the usual `soft` circle: "Sync across devices ·
Optional. Keep your progress on your other phone or tablet." signed out,
"Account and sync · Signed in as j•••@gmail.com" signed in, "Sign in again to
keep syncing" on a restored phone), and Settings → an "Account" group with one
`SettingsRow`, "Your account", whose value is the masked email or "Not signed
in". Never at launch, in onboarding, before the first question, in a session
or as a pop-up (tested).

**Sign-in sheet** (`/account` while signed out, and `/account/sign-in`): a
pushed screen with a close (X) header, the one `display` title "Keep your
progress on every device" (takes screen-reader focus on open), two `body`
lines, one `meta` line ("We store your email…"), ghost links to Privacy
policy and Terms of Use (a build with the real backend can't be made without
both https links: `configGuard.ts`; a dev build without them hides the
row), then a `CheckRow` "I'm 16 or
older and I agree to the Terms of Use." (unticked). Until it is ticked every
sign-in button is disabled (the `soft` / `muted` disabled look) and a `meta`
hint says "Tick the box above to continue." (also each button's spoken
hint). Buttons: `secondary`, full width, 8pt apart: Continue with Apple
(iOS only; Phase 9 swaps in Apple's own system button), Continue with Google,
Continue with email; then a ghost "Not now". A cancelled Apple or Google
sheet shows nothing; other problems show one notice (below).

**Email** (`/account/email`, pushed, title in the bar). `TextField` (see
below) "Email address" with the help line "We'll send you a 6-digit code. No
password needed."; a bad address shows "Enter an email address like
name@example.com." in `tip` under the field (announced once). Primary "Send
code" (with a `meta` "Sending your code…" under it while it sends). The
code step: a `body` line "Enter the code we sent to m•••@example.com"
(focus moves to it), the "6-digit code" field (number pad, one-time-code
autofill, tabular digits), primary "Sign in" (disabled until 6 digits, and
after 5 wrong codes), then the resend line. While the 60-second wait runs it
is a quiet `meta` line "Send a new code in 0:42" (spoken "in 42 seconds"),
NOT a greyed button, in a 48pt row so nothing jumps when it becomes the ghost
"Send a new code" (a new code is confirmed to a screen reader: "Code sent to
m•••@example.com"). Ghost "Use a different email".

**TextField** (`ui.tsx`): the NoteField look on one line: `raised`, 1.5
`control` outline in both themes, radius 16, min height 56, `body` text up to
×2; the visible `label` above is also its spoken name; a problem in `tip`
under it, with the outline in `tip` too (red stays for wrong answers), else
an optional `meta` help line. The field speaks its label (name) and its
problem or help (hint), so the visible label, problem and help lines are
hidden from screen readers and never read twice.

**Account** (`/account` signed in): pushed, "Account" in the bar; `body`
"Signed in as m•••@example.com" (Apple's hidden email: "Signed in with Apple
(your email is hidden)"); `Section` "Your account data" → action row
"Download my data" (no chevron; its subtitle turns into "Preparing your
data…" while busy); `Section` "Where you're signed in" → "Sign out on this
phone" (opens the sign-out sheet, §18) and "Sign out on all devices" (asks
first with a system alert); a 48pt gap,
then "Delete account" with its subtitle and a chevron, and the `meta` foot
"Progress on this phone works with or without an account." No red on this
screen: Grove keeps red for wrong answers, so the only destructive style is
the delete screen's last button. The Sync section sits under the email (§18).

**Delete** (`/account/delete`, no swipe-back; Android back does nothing
while it deletes and goes to You once it is done): `hero` title "Delete your
KaiSip account?" (focus moves to it at each step), the `body` explanation,
a `CheckRow` "Also remove my progress from this phone" (unticked), primary
"Continue" ("One moment…" in `meta` while it checks), ghost "Cancel". Step 2:
either "For your security, confirm it's you first." with ONE `secondary`
button for the same method (Continue with Google / Apple, or "Send a code to
m•••@example.com" then the code field and "Confirm it's you"), or, once
confirmed or when the sign-in is under 10 minutes old, a `meta` line
restating the step 1 choice ("Your progress on this phone stays here." /
"…will be removed too."), the field "Type DELETE to confirm" (capitals
keyboard; any case counts) and the `danger` "Delete account", disabled until
the word matches; "Deleting your account…" in `meta` while it runs. An
account linked to Apple, on an iPhone, always confirms with Apple, even just
after signing in (a fresh Apple code lets the server revoke Apple's token).
The email code step: a wrong code shows on the field (which takes focus); an
expired code or five wrong tries go back to "Send a code to …" with a notice
saying why, so a new code is always one tap away; a sent code is confirmed to
a screen reader. A sign-in that ended meanwhile: back to step 1 with "Your
sign-in has ended, so nothing was deleted. Sign in again, then delete your
account." Done: `hero` "Your account is deleted", the `body` line (it adds
"Your progress on this phone was removed too." when the box was ticked),
primary "Done" (back to You).

**Notices.** One calm block after an action (`AccountNotice`): `tipBg` with
`small` `ink` text for a problem ("You're offline. Connect to the internet to
delete your account. Nothing was deleted."), `correctBg` for a done ("Your
data file is ready…"); said once by the screen reader, never a live region.

**Motion.** No new animation: pushes use the root stack's push, the sign-in
sheet rises like the other sheets-as-screens (`fade_from_bottom`), and all
of them dissolve under Reduce Motion (Settings → Motion or the phone's). No
`transformOrigin` is involved.

**Large text.** Everything stacks and wraps; at about 200% text the sheet
scrolls and the buttons stay full width (`acct-signin-xl`, `acct-home-xl`).

**Shots.** `SHOTS=cloud bash scripts/screenshots/run.sh <out> <light|dark>`:
`acct-you-out`, `acct-signin`, `acct-email-err`, `acct-code`, `acct-home`,
`acct-settings`, `acct-del-1`, `acct-del-2`, `acct-del-3`, `acct-del-done`,
`acct-del-code` (a wrong code on the field), `acct-del-resend` (after too
many tries), `acct-about`, `acct-signin-xl`, `acct-home-xl`, and the flag-OFF
`off-you`, `off-settings`. The cloud export uses placeholder `example.com`
Privacy and Terms links so the sheet's link row is in the shots.

## 18. Sync (Uplift Phase 7, built OFF)

Sync is built and switched OFF with accounts (ARCHITECTURE.md §3 "Cloud
(built OFF) — Uplift Phase 7, sync"). With the flag off nothing below is
reachable, and Settings → Your data and About read exactly as before (the
`off-*` shots). Copy: `content/cloud/copy.ts` only, under the same rules as
§17 (tested in `cloud-copy.test.ts`).

**Account → Sync** (under "Signed in as …"): `Section` "Sync"; a
`ToggleRow` "Sync this phone · Your progress and study settings, on every
device you sign in on." (on only after the first-sync preview; switching it
off just stops, and switching it on again shows the preview again); one
`meta` status line, never a pop-up: "Synced just now", "Synced 4 min ago",
"Synced today at 7:05", "Synced 9 Oct", "Syncing…", "Will sync when you're
online" (a lost connection only), "Couldn't sync just now. We'll try again
soon." (any other failure; UX review P1), "Sync is off", "Sign in again to
keep syncing", or the full paused sentence (a newer app wrote the account's
copy; the copy couldn't be read, "so your phone's progress is unchanged. If
this keeps happening, contact us from Help."; too large, with where to save
a backup). After the learner taps the switch or "Sync now", a screen reader
hears the line when what it says changes, and the result once Sync now is
done ("Synced just now", "Sync is off"); the quiet 30-second "n min ago"
refresh is never announced (UX review H3, O4). While on: a `secondary`
"Sync now" ("Try again" when paused). Then two `SettingsRow`s: "What syncs
›" and "Delete synced progress" (subtitle: "Removes the copy in your
account. This phone keeps its progress."). No red on this screen.

**The first-sync preview** (`/account/first-sync`, rises like a sheet,
close (X) header): the `display` title takes focus ("Bring your progress
together?", "Add this phone's progress to your account?" or "Bring your
progress to this phone?"), a `body` line that always names the masked
account, then four rows (Answered, Last studied, Best streak, Exam date),
each a hairline-ruled block like the restore preview: the row's `label`,
then three columns, This phone · Account · After, each a `meta` heading over
the value; After is in `label` weight and `ink` (the result). At large text
the columns stack. Each row is one spoken sentence ("Answered: this phone
312 questions, account 140 questions, after 361 questions"). Counts read
"312 questions": never the bank size. Combine adds `meta` "Questions
answered on both count once." (UX review O1). Then `meta` "You can undo
this for 7 days in Settings → Your data." (whenever the phone holds
anything, an exam date or a saved question included, or an earlier Undo
sync copy still applies) and, when an Undo restore is waiting, "This
replaces the earlier "Undo restore"." The primary button names the action
(Combine / Sync this phone / Bring it here); "Syncing your progress…" in
`meta` while it runs (also announced); a ghost "Not now". Opened by a link
or stale, it goes back to Account.

**A different account on this phone** (`/account/switch`, a sheet):
`display` "This phone has progress from another account", the `body` naming
the new masked account, two `RadioRow`s ("Start fresh with this account ·
This phone switches to this account's progress. What's here now is kept for
7 days in Settings → Your data → Undo sync." checked by default, and "Keep
this phone's progress · It will be added to this account, even if it's
someone else's."; UX review P3, P4), with Start fresh chosen and an undo
copy already waiting, `meta` "This replaces the earlier undo copy kept on
this phone.", primary "Continue", ghost "Not now". "Not now" and the close
(X) turn sync off on this phone (nothing syncs into either account until
the learner chooses here). It also opens at launch when the signed-in
account isn't the one this phone syncs with.

**What syncs** (`/account/what-syncs`, a sheet): the `body` list of what
travels (as the privacy notice lists it: answer times, the mistake journal,
study days, game levels, the readiness log, reports…) and what stays on the
phone, one `meta` line on the v1 limit ("Removals don't sync yet: …"), one
`meta` "Turning sync off stops syncing. The copy in your account stays
until you use Delete synced progress.", a `secondary` "Done".

**Sign out** (`/account/sign-out`, a sheet): `display` "Sign out?", the
`body` (it adds "Sync stops until you sign in again." while syncing), a
`CheckRow` "Remove my progress from this phone (for shared devices)",
UNticked; primary "Sign out on this phone", which becomes the `danger`
"Remove and sign out" when ticked (UX review H1). A tap first sends this
phone's latest to the account while it syncs ("Syncing your progress…" in
`meta`, announced), then asks once more with a system alert: "This removes
all your study progress, your plant and your study settings from this
phone. Your account's copy isn't affected." or, when something is only on
this phone (sync off, paused, or the last changes didn't arrive), "Some of
this phone's progress isn't in your account yet. Removing it deletes it for
good. Save a backup first if you might want it."; ghost Cancel.

**Delete synced progress** (`/account/delete-synced`, a sheet rather than an
alert so it reads the same on every platform): `display` "Delete synced
progress?", the `body`, a `meta` line on the other devices ("Your other
devices stop syncing the next time they connect. If you turn sync on again
before that, their progress is added back."; UX review P2, worded to what
they do), the `danger` button "Delete synced progress"
("Deleting synced progress…" in `meta`), ghost Cancel; afterwards the
`correctBg` notice "Synced progress deleted." and a primary "Done".
Offline or a server problem: the `tipBg` notice, and nothing is deleted.

**Settings → Your data** (cloud builds): the intro reads "Your progress is
kept on this phone. …" (never "only") and, while syncing, "Your progress is
kept on this phone and syncs to your KaiSip account. A backup file is a
copy you keep yourself. …" (UX review O2). The copy taken before a first
sync shows as an action row "Undo sync · Put back this phone's progress
from before it first synced (until 19 Oct).", which asks first ("Undo
sync?") and turns sync off; its result is the usual tinted message. About's
last sentence becomes "Progress is stored on this device and syncs to your
KaiSip account." while syncing. While syncing, the Reset alert adds "Sync
is on: progress removed here can come back from another device that syncs
with your account. To start fresh everywhere, first use Delete synced
progress in Account." (true with one phone too), plus "This also removes
the Undo sync copy kept on this phone." when one is waiting; the restore
preview adds the same sync sentence (UX review H2, O2). With the flag off
both are exactly as before.

**Motion.** No new animation: the sheets rise like the other
sheets-as-screens and dissolve under Reduce Motion.

**Shots.** `SHOTS=cloud bash scripts/screenshots/run.sh <out> <light|dark>`
adds `sync-status-just`, `sync-status-offline`, `sync-status-newer`,
`sync-status-unreadable`, `sync-first-both`, `sync-first-phone`,
`sync-first-account`, `sync-switch`, `sync-undo`, `sync-signout`,
`sync-what`, `sync-delete`, `sync-you` and `sync-first-both-xl` (about
200% text); since the Phase 7 review also `sync-status-retry`,
`sync-signout-unsynced` (the warning alert), `sync-reset` (Settings with
the Reset alert while syncing) and `sync-restore` (the restore preview's
sync line).

## 19. The feedback board (Uplift Phase 8, built OFF)

The board is built and switched OFF with accounts and sync (ARCHITECTURE.md
§3 "Cloud (built OFF) — Uplift Phase 8"). With the flag off no screen below
is reachable, and You, Settings, Help, What's new and the Send feedback
sheet read exactly as before (the `off-*` shots). Copy:
`content/cloud/copy.ts` only, every key starting `board.`, under §17's rules
(`cloud-copy.test.ts`); "We review reports within 24 hours" is the one
reply-time line, allowed only in board strings. There is **no What's next
tab or feed** (12 Oct addendum).

**Ways in.** You → Help and feedback: a "Feedback board" row (Lucide
`messages-square` in the usual `soft` circle; "Ideas, app problems and
questions from learners") above "Get help or send feedback"; Settings → a
"Feedback board" group (Your activity, Blocked learners); and in the Send
feedback sheet, for "An idea" and signed in, a ghost "Post publicly instead
›" under the email buttons. A question's report never offers it. What's new
ends (cloud builds) with one `meta` line thanking learners whose ideas
shipped, no names or counts.

**The board** (`/board`): pushed, "Feedback board" in the bar with a ghost
"+ Post" on the right (at 150% text and above it moves into the page, a
`secondary` under the intro); a `body` intro ("Ideas, app problems and
questions from learners. We read the posts.", or, with the `author_staff` read scope,
"…Only you and the team see your posts."); signed out, a `small` line ("Sign
in to read the board, and to post, vote and comment." or, when anyone may
read, "…Reading is open to everyone.") and a `secondary` Sign in; signed in,
rows for Your activity ("New" when there's an unread notice) and, for staff,
Moderation. Then a `Segmented` Top · New · Shipped, kind `Chip`s (All,
Content, Ideas, App problems, Questions), a `SearchField`, and the posts.

**A post row.** The **vote pill** on the left: 52 wide, at least 56 tall,
radius `md`, a 1.5 `line` outline, ▲ over the count in `label` (tabular);
voted, it fills with `ink` and the text turns `bg` (shape AND colour, never
green). Spoken "Vote for: {title}. {n} votes. Voted." / "Not voted yet."; its
hint is "Takes your vote back." once voted; off (a locked or waiting post) it
fades to 50%. Then
the title (`headline`), a `meta` line "Idea · ◑ Planned · Quiet Cedar 214"
("KaiSip team" for staff) and a `meta` comments line ("12 comments · Team
replied"). Rows are hairline-ruled, no cards. Your own post waiting for
review says "Waiting for review" in place of its status (never "○ Open"
beside it).

**Statuses** are glyph + words, never the correct green or wrong red: Open ○,
Under review ◔, Planned ◑, In progress ◕, Shipped ● ("Shipped in 1.18"),
Answered ✓, Not planned –, Duplicate ⇢. On a post they're a `soft` pill
(`StatusTag`, `meta` in `ink`). Screen readers hear the words only, never the
glyph.

**A post** (`/board/<id>`): the ⋯ button (48pt, spoken "More options") on
the bar's right opens a `Sheet` of full-width buttons: Report post · Report
{handle} · Block {handle} on someone else's (no Block on the team or
yourself); Edit · Withdraw (`danger`) on your own. Report and Block need
only an account (no guidelines gate). The chosen action runs once the sheet
has closed (≈350 ms), so iOS never drops the Report sheet or the Block
alert. Then the
`hero` title, the meta row (kind, `StatusTag`, handle or the "KaiSip team"
badge), the body as plain `body` Text, the vote pill beside a full-width
`secondary` Follow / Following, the **official response** (a 3pt
`accentText` left rule, `caption` "KaiSip team · official response", the
`body`), "Status history" (`small` "Planned · 9 Oct" with a `meta` note), and
the comments: `meta` "handle · date", the words, a ghost Reply on top-level
comments, replies indented with a `line` rule (one level), each with its own
⋯ (spoken "More options, comment by {handle}"). The header counts every
comment, replies included. A post about a practice question's answer is
folded in a `soft` block ("This post talks about the answer to a practice
question." + ghost "Show it", its own focusable button: a `BoardCard` groups
its content for screen readers only when it holds words alone). Your own
waiting post shows a `tipBg` "Waiting for review" block. The comment field
is a `NoteField` with a primary Send.

**Report** (a `Sheet`): "Report this post / comment / learner", eight
`RadioRow` reasons (Shares real exam content first), an optional note, and
Send report (disabled until a reason). After sending, the sheet says
"Thanks. We review reports within 24 hours. You won't see this post while
it's reviewed." and the item is already gone behind it. **Block** asks with
a system alert ("Block Quiet Cedar 214?" and what it does; "They won't be
told."). The menu never offers to block a team member.

**The composer** (`/board/new`, rises like a sheet): close (X), "New post";
"What is it about?" with four `Chip`s; `TextField`s Title ("Short and
specific"; under 8 characters, the problem in `tip`) and Link an item (a
code like q:d4_217); Details in a `NoteField`; "Similar posts. Vote
instead?" with up to three rows; the **leak card** in `tipBg` (a `label`
title "This looks like text from one of KaiSip's practice questions", the
`small` explanation, a `secondary` "Report it privately" that opens the
private report on that question, and a ghost "Edit my post"), or the recall
warning, or the words/links line; "Posting as Misty Rowan 77 · Change"; the
primary Post (off while checking, on a bank match, when paused, or with a
short title); then the `meta` rules line, Community guidelines, and the
not-affiliated line. The leak card and the recall warning are announced when
they appear; "Edit my post" goes to the field the match is in. Held: "Waiting
for review" (`display`, focus moves to it) with why, and Done. Offline: "You're offline. Your post is saved here as a draft." Paused:
the `tipBg` notice at the top.

**The guidelines gate** (`/board/guidelines`, a sheet): `display` "Before you
post" (focus moves to it), the intro, seven rules as `body` bullets with an
`accentText` dot, "We review reports within 24 hours…", the not-affiliated
line, the full guidelines link; then `Section` "Choose how you appear":
`RadioRow` "Quiet Cedar 214 (a pseudonym)" with a ghost "New name", and
`RadioRow` "A name you choose" with a `TextField` (a refused name shows why
in `tip`); `meta` "Your email address is never shown."; the `CheckRow` "I
agree to the community guidelines" (unticked); primary "I agree, continue"
(off until ticked and the name is fine); ghost "Not now". Read from the
board's foot when already agreed, it's the rules and a `secondary` Done.

**Your activity** (`/board/activity`): Notices first (an 8pt `accentText`
dot for new, `meta` date, the `body` sentence written on the phone: a status,
the team's reply, a reply, a removal with its reason and who decided, a
warning, a suspension with its end date, an appeal's outcome), with a
`secondary` "Ask us to look again" on a removal (14 days, once; a `Sheet`
with "Tell us why (optional)" and Send) and a ghost "Open the post"; then
Your posts (a waiting one with its `tipBg` block). **Blocked learners**: each
name with a `secondary` Unblock.

**Moderation** (`/board/moderation`, staff only; anyone else is sent back):
"Moderation" with "3 waiting" (`meta`) on the right; `Chip`s Held · Reported
· Appeals · Members · Log; each item a `label` line ("Held · exam recall · 2
h ago", "Reported ×3 · harassment or hate · 40 min ago"), the title, the first
two lines in quotes (`small`), `meta` "Quiet Oak 9 · new member · 0 prior
actions", then `secondary` Approve · Remove · Remove + warn and a ⋯ (Delete
exam content, Hide, Fold it / Unfold it, Dismiss reports). A report shows
the words as they are now; edited after the first report, it adds `meta`
"Edited after it was reported" and `small` "First reported as: “…”" (and
"Last reported as: “…”" when different). A Dismiss of words edited since
they loaded is refused: the list reloads with "These words changed while you
were looking. Here is what it says now." Remove, Remove + warn, Suspend and Ban
ask why with a `ChoiceSheet`; Ban and Delete exam content then ask again in a
system alert. Each button's spoken name says which item ("Approve: Timer
keeps running…"), and "Done." is said after an action. Appeals: Keep removed
/ Put back; Members: Suspend 7 days, Ban / Unban, Rename (asks first); a
reported member in Reported: Suspend 7 days, Ban, Dismiss reports. Empty:
"Nothing waiting." with "Held posts, reports and appeals show up here." At
the foot: "Posting: Open" and Pause posting (asks first) / Reopen posting.

**Motion.** No new animation: pushes and sheets as elsewhere, dissolving
under Reduce Motion.

**Large text.** Rows wrap; chips wrap to new lines; the vote pill keeps its
size while the title and meta lines wrap beside it; at about 200% text the
composer's leak card and buttons stack full width (`board-top-xl`,
`compose-bank-xl`).

**Shots.** `SHOTS=cloud bash scripts/screenshots/run.sh <out> <light|dark>`
(`CLOUD_PART=board` for only these): `board-top`, `board-new`,
`board-shipped`, `board-out`, `board-out-everyone`, `board-own`,
`board-post`, `board-spoiler`, `compose-empty`, `compose-bank`,
`compose-recall`, `compose-draft`, `board-gate`, `board-handle`, `ugc-menu`,
`ugc-report`, `ugc-report-done`, `ugc-block`, `ugc-blocked`,
`board-activity`, `board-held`, `board-paused`, `mod-held`, `mod-reported`,
`mod-appeals`, `mod-members`, `mod-log`, `mod-pause`, `board-you`,
`board-settings`, `board-feedback-public`, `board-whatsnew`, `board-top-xl`,
`compose-bank-xl`, and the flag-OFF `off-help`, `off-whatsnew`.
