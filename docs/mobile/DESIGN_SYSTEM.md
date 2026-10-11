# Aurivan mobile — "Grove v2" design spec

Status: **locked 2026-10-07** by the maintainer. Supersedes "Forest". This file is the source of truth for `mobile/`; code that disagrees with it is a bug.

Maintainer decisions: first tab is named **Today**; readiness is shown as an honest **range** (e.g. 62–70%), with "not enough data" below ~40 answers.
Mockups: `docs/mobile/design/grove_v2.html` / `grove_v2.png` (light, dark, edge cases incl. ×1.6 text). Real content: `d4_250`.
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
- **Fraunces italic** is the coach's voice and is used in exactly three places: Key idea, stage name ("Stage 3 · Make it stick"), and the clearing card's "grew to" line. Never for UI labels, never for whole paragraphs > 4 lines.
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
| `soft` (was `surface2`) | `#E6EBE2` | `#202A23` | Icon circles, pressed rows, tags |
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
| `forest` | `#1E4A34` | **`#21432F`** | The hero panel (one per screen max). Dark lifted from `#1D3A2A` so it separates from `bg` and from `correctBg`; add a 1px inner top highlight `rgba(255,255,255,.06)` |
| `forestTop` (1.9) | `#1E4A34` (= forest) | `#285139` | The panel's lit top edge: a vertical gradient `forestTop` → `forest` under the art (dark only; light stays flat, so no layer is drawn). `forest` + 4% lightness |
| `onForest` | `#F3F1EA` | `#EEF2EA` | Text and pill button on `forest` |
| `onForest2` | `#C9DACD` | **`#BCD2C2`** | Secondary text on `forest` |
| `forestLine` | **`#3A6B51`** | **`#3C6B51`** | Botanical line art on `forest` (decorative, exempt from contrast; v1 value was invisible in dark) |
| `forestTrack` (v2) | `#2F5C44` | `#2E5440` | Hairlines and ring tracks inside `forest` |
| `sap` (v2) | `#A9D9BA` | `#A9D9BA` | Leaf progress marks and the mini ring on `forest` (6.4:1 / 7.0:1) |
| `pill` / `onPill` (v2) | `#F3F1EA` / `#17231B` | `#EEF2EA` / `#0F1F16` | On-forest pill button (was hard-coded) |
| `grainOp` (v2) | `0.05` (warm-black noise) | `0.045` (white noise; 0.06 before 1.9) | Paper grain overlay opacity. Never higher: at 5% the weakest pair (`muted`/`bg`) stays ≥ 4.7:1. Dark went down in 1.9: white specks over the forest night read as dust |
| `clay` | `#9A4F26` | `#E9A07A` | Streak + calm attention (pace behind, 2-min cue, last 5 min). Never for errors |
| `correct` / `correctBg` | `#1D6A43` / `#E0EDE2` | `#8AD6A8` / `#173022` | Answer feedback only |
| `wrong` / `wrongBg` | `#A3333D` / `#F7E3E1` | `#FF9CA6` / `#3A1A1D` | Answer feedback only |
| `tip` / `tipBg` | `#7A5100` / `#F3EAD3` | `#E9C46A` / `#2C2715` | Trap warnings |

Domain tones unchanged (Lake, Moss, Ochre, Heather, Slate), dots and bars only.

**Badge art (mobile 1.10, `badgeEnamel`, `badgeMetal`, `badgeLeafPip`, `badgeGlaze` in `theme/tokens.ts`).** An earned badge is an object, struck once: its enamel and metal are fixed hex colours, the same in light and dark (like the brand lockup). Enamels `forest` `#1E4A34`, `ink` `#17231B`, `clay` `#9A4F26`, `paper` `#F5F1E6`, each with emblem roles E1/E2/E3 (≥ 3.5:1 on its field, tested), shades, a `deep` cast shadow, a `lite` growth-ring tone and a ribbon. Metals tell the tier: Clay, Lichen, Gold leaf (edge ≥ 3:1 on light `bg`, mid ≥ 3:1 on dark `bg`, pips ≥ 3:1 on the rim, tested). A badge with ONE mark has no tier and is struck in `badgeStruck`, a calm unnamed sage (`#AFC2B2` mid, `#3A4A3F` edge; same contrast tests), so Gold leaf only ever means the top of a ladder. A badge not yet earned uses theme tokens only: `soft` field, `control` stitched outline (3.23 L / 3.68 D on `bg`; 3.01 / 2.98 against the `soft` field it edges, pinned), `muted` emblem (4.68 / 5.66 on `soft`), `accent` progress trace. On the forest panel it switches to the on-forest inks: `forestTrack` field, `onForest2` outline and emblem (6.91 / 6.88 on `forest`, 5.26 / 5.34 on `forestTrack`), `sap` trace (tested). No `gilt` token yet: the Stretch rims it was for arrive with the tiers (next release).

Contrast (WCAG 2.x, all pass AA 4.5:1 for text; v2 re-run with `design/contrast_v2.py`, 54 text pairs, 0 fails; new pairs `sap`/`forest` 6.39 L / 6.98 D, `onPill`/`pill` 14.4 / 15.1, `bg`/`wrong` 6.00 / 9.20). v1 figures: weakest light pairs are `muted`/`soft` 4.68,
`wrong`/`wrongBg` 5.50, `correct`/`correctBg` 5.44, `muted`/`bg` 5.01; weakest dark pair is
`muted`/`soft` 5.66. Non-text: `control` on `bg` 3.23 (L) / 3.68 (D); `accent` on `track` 4.62 / 6.33.
Script: `design/contrast.py`.
Mobile 1.9 (dark depth) adds to the tested pairs (`__tests__/design-tokens.test.ts`), all AA: on `raised2` — `ink` 15.15 L / 13.85 D, `ink2` 7.55 / 8.48, `muted` 5.28 / 6.14, `accentText` 6.94 / 9.00, `wrong` 6.32 / 8.09, `tip` 6.52 / 9.63, `clay` 5.56 / 7.49, non-text `control` 3.40 / 3.24; on `forestTop` (dark) — `onForest` 7.96, `onForest2` 5.65, `sap` 5.73. Dark grain worst case (one full white speck under a glyph, at 4.5%): `muted`/`bg` 6.29, `ink2`/`bg` 8.68, `onForest2`/`forest` 6.06, `onForest2`/`forestTop` 4.97 (6% would have been 5.79 / 4.81).

Colour rules
- Green = progress, primary action, correct. **Never "selected"** (selected = `ink`).
- In dark mode the primary button flips to a light mint fill with dark text (calmer than a dark-green slab).
- One `forest` panel per screen, maximum. It is the brand moment; don't spend it on secondary content.

## 4. Space and radius

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. **Gutter 20** (was 16). Section gap 28–32. Row vertical padding 13.
- Radius: `sm 8` (tags, progress), `md 16` (option rows, inputs), `lg 24` (hero panel, sheets top corners 28), `pill` (buttons, chips, icon circles).
- Shadow (light only, raised rows): `0 1 2 rgba(23,35,27,.05)` + `0 2 8 rgba(23,35,27,.04)` → RN: `shadowColor:'#17231B', shadowOpacity:.06, shadowRadius:6, shadowOffset:{0,2}, elevation:1`. Dark: no shadow, 1.5px `line` outline instead.

## 5. Surface rules (when to use a card)

1. **Default is no card.** Content sits on `bg`; groups are separated by whitespace and a section `headline`.
2. **Lists** = rows on `bg` with 1px `line` hairlines between them (inset to text start). No container border.
3. **Raised rows** (white, radius 16, soft shadow) only for things you choose between: answer options, mock types, chip-less pickers.
4. **Forest panel**: one per screen for the single most important action (Today's first plan item, lesson start, results score).
5. **Tinted block** (`correctBg`, `wrongBg`, `tipBg`): feedback only.
6. **Key idea** is never a card: a 3px `accent` rule on the left + `quote` text.
7. **Never nest** a surface inside a surface. Never outline a card with 1px border in light mode.

## 6. Component recipes

**Button**
- primary: height 56, radius pill, `btn` fill, `onBtn` label (Figtree 600 17), optional 18px trailing icon, pressed = scale .98 + opacity .92 (eased on the UI thread, §8.4).
- secondary: height 56, radius pill, transparent, 1.5px `control` border, `ink` label.
- on-forest: height 48, padding 0 22, radius pill, `onForest` fill, `ink` (L) / `#0F1F16` (D) label, 16px leading icon.
- ghost/text: `accentText` label 16/600, min hit 48.
- danger: `wrongBg` fill, `wrong` label. Disabled: `soft` fill, `muted` label.
- Sticky footer button sits in a 20px-padded footer with a `bg` fade above (no hard divider).

**Option row** (quiz, lesson checks, games)
- `raised`, radius 16, padding 15/16, gap 10 between rows, letter badge 30 circle 1.5px `control` border, letter Figtree 600 14 `ink2`; text `body`. *(Deliberate change from the earlier `line` border: `control` clears 3:1 non-text contrast on `raised`, so the idle badge outline is visible to low-vision users — WCAG 1.4.11.)*
- selected: a 2px `ink` ring layer over the row's own border and a badge filled `ink` with a `bg` letter, both cross-fading in (120 ms, §8.4), so the row never changes size. Haptic `selection`.
- correct: `correctBg`, no border/shadow, badge `correct` with ✓. wrong pick: `wrongBg`, badge `wrong` with ✗. others after submit: text `muted`.

**Chip / tag**
- filter chip: height 40 (hitSlop to 48), radius pill, 1.5px `control`, `label` 15. Selected: `ink` fill, `bg` label, leading ✓.
- tag (non-interactive): no fill; `meta` with a domain dot ("● IS Audit · Analysis · 1 of 3").
- checkbox chip (`checkbox`): for independent on/off choices (reminder days). Same look as a filter chip; spoken as checkbox, checked / not checked, with a full name ("Remind on Monday" for "Mon") and an optional hint.

**IconButton** (`ui.tsx`): 48pt round target (above the 44pt minimum) holding one 24 icon in `ink` (`muted` when disabled); pressed = a `soft` circle that grows in behind the icon. Always has a spoken `label`. State props: `selected` for on/off toggles, `expanded` for a button that shows or hides a panel (the game info button), `disabled`. Never a square tile.

**Stepper** (`ui.tsx`): `caption` label above `−  value  +`: two 48pt IconButtons around a `label` numeral (tabular, min width 48). Screen readers get ONE adjustable control (`spokenLabel`, e.g. "Reminder hour", value spoken in full, e.g. "7:00 PM"); the inner buttons are hidden from them, and only increment / decrement are handled. Used in pairs for a time (hour, then minutes in 15-minute steps), in the phone's own time format ("7 PM" / "19"). No date-picker dependency.

**List row**: 40 icon circle (`soft`, icon 20 `accentText`), title `label`, subtitle `meta`, trailing chevron 18 `muted`, min height 64, hairline below.

**Progress**: quiz = segmented bar (one segment per question up to 20, else continuous), height 4, gap 3, done `accent`, current `ink2`, rest `track`. **Readiness = growth rings (see §10.1) — v2 replaces both the 5-segment domain bar and the Results ring.**

**Stat tile**: no box. `number` value + `meta` label, stacked and centred in its cell, in a row of 3 separated by hairlines. At large text sizes the row becomes a left-aligned vertical list.

**Hero panel**: `forest`, radius 24, padding 22, `caption` in `onForest2`, `hero` in `onForest`, `meta` in `onForest2`, on-forest button; **botanical line art** (§10.3, 1.5 stroke `forestLine`) bleeding off the top-right, replacing v1's topographic ellipses. Title may wrap to 3 lines; reserve the right 110pt for art only while the title is ≤ 2 lines (`maxWidth: 250`), otherwise text runs full width over the art (art is decorative and low-contrast). The `meta` line keeps the same `maxWidth: 250` (it wraps rather than running under the art), except with `wideTitle` or large text. Build: the art sits in its own absolutely-filled layer that does the rounded clipping, in a box of explicit size with a pivot in points; the text and button sit in a layer above it (zIndex 1). The panel itself doesn't clip (Android blank-panel fix). Dark mode (1.9): the art layer first draws the panel's top light, one SVG gradient `forestTop` → `forest`, so the panel reads lit from above with its 1px highlight instead of a flat grey-green; light mode has no gradient layer.

**Header**: tab screens = 14px top meta line (countdown left, streak right) + `display` title, no nav bar. **Today and You** put a Settings gear on the title row (`ScreenTitle`): an `IconButton` with Lucide `settings` 24, spoken "Settings" with the hint "Exam date, reminders and more", aligned to the gutter edge (the 48pt target overhangs by 10). Settings is reached only through this gear; You has no separate Settings row (removed 2026-10 as redundant). Pushed screens = 52pt bar: 44 hit icon left (X or ‹), centred progress or title `label`, icon right. No bottom border; content scroll reveals a 1px `line` only after scrolling (optional).

**Tab bar**: height 56 + safe area, `bg` fill, 1px `line` top border, 5 tabs, icons 24 stroke 1.75, label `tab`. Inactive `muted`; active label `ink` + icon `accentText` + **4px `accent` dot under the label** (v2, so active state isn't colour-only). **Custom glyphs (v2):** Journey = sprout, You = growth rings; Learn/Practice/Play stay Lucide.

**Feedback**: superseded by the **vine reveal**, §10.2.

## 7. Icons

Lucide (already installed, per-icon imports) plus 3 custom SVG glyphs in the same 24-grid / 1.75 stroke: `sprout` (Journey tab), `rings` (You tab), `sprig` (streak, replaces the flame). **Mobile 1.6** adds `TierLeaf` (16 grid, `glyphs.tsx`): a game level by SHAPE — Seedling = a small sprout, Sapling = an outline leaf with midrib, Heartwood = the leaf filled — always beside the level's name, never alone; filled vs outline is also a skill badge's "pressed leaf" (earned vs not yet). New Lucide icons: `milestone` (You → Milestones; mobile 1.10: `badge`, the scalloped seal, for You → Badges), `leaf` (Field notes), `book-a` (Field Guide), `tree-deciduous` (Canopy Call), `footprints` (Stepping Stones). **Mobile 1.7** (Help and feedback): `circle-question-mark`, `mail`, `life-buoy`, `inbox`, `map` (exported as `MapIcon`). Keep them in `components/icons.ts` as `react-native-svg` components. Stroke **1.75** everywhere, 2.5 only for the ✓ inside a filled circle. Sizes 16 inline, 20 rows, 24 bar/header. Icons are `accentText` inside `soft` circles, otherwise `ink`/`muted`. Never put icons in square tiles.

## 8. Motion (mobile 1.8 and 1.9; Reanimated 4, no other animation library)

The idea in one line: **everyday UI moves like paper** (quick, soft, never bouncy); **growth moves like a plant** (slower, earned, rare). Every animation explains one of three things: where something came from or went, what changed, or that the app heard the tap. Decoration is for rare, earned moments only.

Code: tokens in `theme/tokens.ts` (`motion`), primitives in `components/motion.tsx`. Screens never write a raw duration, curve or spring.

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
| `curve.enter` / `exit` / `standard` | M3 `(.05,.7,.1,1)` / `(.3,0,.8,.15)` / `(.2,0,0,1)` | Arriving / leaving / moving on screen. The default is `Easing.out(cubic)` |
| `spring.press` | 160 ms, ratio 1 | Press release: back to rest, never overshoots |
| `spring.settle` | 300 ms, ratio .9 | The segmented thumb (no visible overshoot) |
| `spring.pop` | damping 16, stiffness 260 | The verdict leaf only (signature) |
| `spring.leaf` | 280 ms, ratio .7 | Small marks: the saved bookmark (later: plan leaves) |
| `stagger` | groups 40 ms (first 4), rows 30 ms (first 6), digits 30, growth figures 60, pressed leaves 80 (first 3) | Entrances; a number's digits finish right to left; rings and stats 60 ms apart |
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
    - **You:** the rings grow from what you last saw (from 0 on the day's first view), and a domain that went up gets a quiet `caption` "+6" in `accentText` beside its legend value, fading in after its arc settles (only for a real last look, never the day's count-up); the range in the middle and any stat that went up roll, 60 ms apart.
    - **Results:** once per session, after the dissolve: the session's rings grow from 0 to the score, the score in the centre and the "correct" numerator roll (the "/20" stays put). Three growths at most.
    - **Round recap:** the score rolls up from 0 (never a score at or below 0), then "New personal best" fades in.
    - **Badges (1.10):** medallions earned since the case was last opened press in (from .4 on the `leaf` spring, 80 ms apart, the first 3); the "Next for your exam" bars grow from where you last saw them, once the screen has arrived. A new badge presses in once per visit (switching the sort or a filter never replays it). The detail sheet's medallion turns in once as it opens, from edge-on to facing you (rotateY 90° → 0 over 400 ms, so a mirrored back is never shown; still under Reduce Motion). Nothing idles: no shimmer, no shine loop, no parallax.
    - **Stepper:** the value rolls one step the way the time moved (160 ms): the hour that moves because the minutes wrapped past :00 rolls with them, and a wrap (12 → 1) is still one step.
11. **Celebrations are rare, short and skippable (1.9).** See §8.9.

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
| Disabled | nothing moves (a shake would read as an error) | — |

Icons that sit above a state layer are wrapped in a View, so they always draw on top (on the web build a bare SVG painted under an absolutely positioned layer).

### 8.5 Reduce Motion and Settings → Motion

Settings → **Motion** (after Appearance): a radio group, "Match my phone" (the default; it names the phone's own setting, "Reduce Motion" on iOS and "Remove animations" on Android, and says so when it is already on) or "Reduced" ("Short fades instead of slides; growth shows its end state." This app only, WCAG 2.3.3). Kept in backups like the theme; restoring a file from before 1.8 (no Motion key) keeps this phone's choice, because Reduced is an accessibility setting. **Reduced never means a hard cut for a meaningful change** (Apple's criteria ask for a dissolve). The one named exception is switching tabs: the tab bar's own selection already says where you are, and an instant switch is what the platforms do under their reduce settings:

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
| Game-tile shake | None; the static wrong state and the words "Not a match" |
| Tab fade-through | Instant (the named exception above) |
| Stack push / rise, page sheets | Dissolve (`fade`) |
| Frond sway | Off |
| Daylight pace tick glide | Steps in tenths |

### 8.6 Performance

Transform and opacity only, never layout (the Daylight pace tick used to animate `left` every second; it now slides on translateX across the measured track). Worklets on the UI thread; a press never re-renders the screen; a one-shot `setTimeout` only for a phase change (the page turn's swap, a roll that has ended), never a per-frame JS timer. No entrance animation inside virtualised lists. SVG motion stays on `strokeDashoffset` for ≤ 6 paths at a time (the rings). Loops pause off-screen (`useFocusEffect`), and nothing grows on a hidden screen. A rolling number goes back to plain text when it stops, so You and Today keep no odometer mappers alive. A scroll position that only decides whether something is in view lives in a ref: a scroll event never re-renders a screen (Results with a long mock review).

### 8.7 Testing and screenshots

One Reanimated jest mock for the whole suite (`mobile/jest/reanimated-mock.ts`, registered in `jest/setup.ts`; Reduce Motion on by default, `setMockReducedMotion(false)` turns it off; React Native's `isReduceMotionEnabled` gives the same answer). Shared values persist and `useAnimatedStyle` runs, so a re-render after effects shows an animation's END state: `motion.test.tsx` renders every primitive reduced and asserts its final static state; `motion-touch.test.tsx` pins that selection never reflows a row. `SHOTS=motion npm run shots` captures the changed screens plus slow-motion frame strips (the page clock runs at 1/10 speed) of the press, select, segment fill, page turn (with its footer), segmented thumb (sliding, and reopened on a later option), a mock's calm turn and the tab fade. `phase2-review-fixes.test.tsx` runs a mock and a practice session with motion ON and fake timers, so the page turn's real leaving phase is on screen (the footer, the bookmark, the announcements). Mobile 1.9: `motion-growth.test.tsx` pins the odometer maths, `useGrowth` (up only, from what was seen, never on a fall, not while out of view), the celebration budget and fatigue, skip, `LeafFall`, `ThemeFade`, `ProgressFill from`, the plan leaf fill and the Stepper roll; `phase3-growth-screens.test.tsx` runs the clearing, Results and You in full motion and reduced (same words, only the movement differs); `phase3-review-fixes.test.tsx` pins occasions, once-ever moments, the 30-minute session, the short form's brighten, no growth off screen, the odometer's gap, re-placing and swap back, and the Stepper's one-step wrap; `phase3.qa.test.tsx` runs the learner journeys on real content. Celebration lines are said after a short pause (`sayLater`): tests call `flushSayLaterForTest()` before counting announcements, and `jest/after-env.ts` drops any still waiting when a test ends. Mobile 1.10: `badge-catalog.test.ts` pins the sets, per-set counts, gates, effort, sorts, "Next for your exam" by stage and "Study for this"; `badge-restore.test.ts` pins tier-safe restores and planters; `badges-screens.test.tsx` runs the case (grid, ×1.3, ×1.6), the sheet, the new dot, Show badges, the moment's 3-a-week cap and the review fixes (on-forest medallion, Sort focus and expanded state, open at a shelf or a sheet, the after-exam album, back-fill dates, press once, the tab's ring); `badges.qa.test.tsx` runs the learner journeys; `badge-art-drift.test.ts` rebuilds the art and compares it byte for byte with `badgeArt.json`; `SHOTS=badges npm run shots` (with `REDUCED=1`, or `FONT_SCALE=1.3` / `2` for the large-text case, shelf and sheets; the web build reports a font scale of 1, so the page sets it and the harness zooms the text) captures the case, each shelf, the sheet, Results with a new badge, You's dot, Show badges and a strip of the unlock moment. `SHOTS=growth npm run shots` (with `REDUCED=1` for the reduced set) captures Today (normal, cleared, exam-ready, exam eve), Results, You, Milestones, the empty states, the bank grouping and a sheet, plus strips of a number roll, ring growth, the clearing, the milestone moment, You's "+N" and the theme fade.

### 8.8 Planned (later phases, same primitives)

Lesson scenes as page turns with a step line that draws; the Learn accordion; game identity and game motion (the TierLeaf morph, match and stone motions); the plant companion's idle bursts and reactions (off with Reduce Motion or "Companion moves" off), which will take its place in the celebration budget below.

### 8.9 Celebrations (mobile 1.9; behavioural review §2)

| Moment | Tier | Full (≤ 1.2 s, any tap ends it) | Words (every mode, announced once) |
|---|---|---|---|
| **Today's clearing** (all plan items done), as Today comes back into view, once a day | T2 | the last plan leaf fills; the day's three numbers roll up 60 ms apart (from 120 ms); the mini ring grows from this morning's readiness to now (from 240 ms); then "Readiness grew to …" and "IS Audit ring +4" fade in (from 840 ms). One `success` haptic | "Today's clearing. Two of two, done. Readiness grew to 67–77%." |
| **A badge** (Results after the review actions, a round recap; mobile 1.10) | T3 | the badge's 64pt medallion presses in (.4 → 1 on the `leaf` spring, from 120 ms) in its own 64pt column; its rim catches the light once (a glint runs round the frame, 200–600 ms) and its emblem fills from its one-tone outline (fades out 400–600 ms); six leaves drift down that column, never over the words. The words are there from the first frame (the block may already be on screen). On Results it waits until it is scrolled into view AND the rings have settled, and its one haptic comes with it; its words don't wait. A higher tier (Rooted · 30 days) always plays short. At most THREE full badge moments in any 7 days (`seen.badgeMoments`, noted when a moment actually plays in full, never when it is only drawn; a short, static or never-scrolled-to moment is not counted): past that the block is replaced by one quiet `meta` line, "New in your badges: Rooted · 30 days", with no haptic | "A new badge, Evergreen: Long Memory. You recalled 25 questions… That's what holds on exam day." |
| **Exam-ready** (the readiness-holding panel), once ever per cert | T3 | the sap rings grow, the frond takes ONE slow breath (1.5° out and back over 1.2 s) and the words follow. One `success` haptic, the first time it ever shows | "A quiet milestone. Your readiness is holding." |
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
- Sizes: **Today 104** (`k .24`, `r0 13`, gap 3, **monochrome `accent`**, pith dot `r0×.32`) — shape only, the number sits beside it. **You 172** (`k .36`, `r0 34`, gap 4.2, domain tones, no pith, `70%` `stat` 30 inside + "ready" caption) with a legend listing domains outside-in, numbers in Fraunces 17. **Clearing mini 48** on forest (`sap` on `forestTrack`). **Results 200** same as You, but only the session's domains get rings (mobile 1.8); a one-domain session is one thick ring in its tone with a `meta` line "This session was all IS Audit: the ring is your score."
- **Exam-ready panel** (Phase 5b, on forest): the rings use `sap` on `forestTrack`, like the clearing mini; its text column keeps `maxWidth: 250` beside them so it never runs under the frond art.
- Component: `<GrowthRings size mastery={number[]} weights={number[]} tone="domains"|"mono"|"sap" />`, paths `useMemo`'d. Accessibility: `accessibilityRole="image"`, label "Readiness 70 percent. IS Audit 88, IT Governance 63, …".
- Motion: on first view per day, arcs grow from 0 to value over 600ms `Easing.out(cubic)`, outer ring first, 60ms stagger (animate `strokeDashoffset` via reanimated `useAnimatedProps`; pre-compute each arc's length). Since 1.9 they also grow from the value last SEEN to now (Today, You, the clearing mini ring from this morning's readiness), never shrink, and Results grows the session's score once (§8.3 rule 10). Reduce motion → static.

### 10.2 Vine reveal — the answer moment
Order on the feedback screen:
1. **Verdict row**: leaf-mark (38pt teardrop: a circle with its top-right corner squared, `M35.5 2.5V19A16.5 16.5 0 1 1 19 2.5z`) in `correct`/`wrong`, white ✓/✗ 20 @2.5 stroke, + `hero` "Correct"/"Not quite" in the same colour. Under it a one-line `meta` coach line at left 50: correct → "Clean read."; wrong pick of the runner-up → "You picked the runner-up. That's the trap."; other wrong → "Check the role in the stem."
2. **Answer rows**: if wrong, the chosen option in `wrongBg` with a `caption` tag "Your answer · C" in `wrong` and that option's `wrong_explanations` note inline (`small`, `ink`). Then the correct option in `correctBg` tagged "Best answer · B". If correct, only the correct row. Other options are hidden (not dimmed) on this screen; the full list stays in review.
3. **"Why B"** `headline` + `correct_explanation` `body`.
4. **The vine**: a 1.5pt `accent` stem at 55% opacity, x = 10 from the gutter, content indented 34. Nodes sit on the stem as leaves (on a `bg` knock-out so the stem appears to pass behind):
   - Key idea — 22pt filled `accent` leaf with `bg` midrib; `caption` "Key idea" `accentText`; text `quote` (italic) `ink`.
   - Eliminate — 16pt outline leaf, 18% fill, `tip` colour; caption `tip`.
   - Final two — same, `ink2`.
   - Exam cue — same, `accent`/`accentText`.
   - Tip text is `small` in **`ink`** (v1 used `ink2`; tips are the payload, not metadata). Labels are parsed from the tip prefix ("Eliminate:", "Final two:", "Exam cue:"); fall back to "Tip 1…" with `ink2` leaves. A 4th tip just adds a node.
5. **Source row**: hairline, `meta` "Original · Reviewed Oct 2026" left with the `Report a problem` link right (see "Report a problem", §11), then `meta` "Code d4_250 · COBIT DSS01".
6. Sticky footer "Next question →". **Scroll content gets `paddingBottom = footerHeight + 24`** so the last node never sits under the fade.
- Motion: verdict leaf scales .6→1 (spring damping 16, stiffness 260) + `notificationAsync(Success|Error)`; answer rows fade-rise 200ms; when the vine scrolls into view the stem **draws downward** 520ms (`scaleY` from top, origin top) and each leaf pops (scale .4→1, 160ms) as the stem reaches it, with `Haptics.selectionAsync()` on the Key idea leaf only. Reduce motion → all static, haptic kept.

### 10.3 Botanical line art
- One drawing style: single 1.5pt stroke, round caps/joins, no fills (except leaf marks), leaves = quadratic "lens" shapes with a midrib, arranged along one quadratic-bezier stem. Generator `frond({p0,p1,pc,n,len,wid,ang,alt,taper})` (≈25 lines, see mockup script) emits one SVG path; seeds are fixed per placement so art never changes between renders.
- Placements: Today panel = upright frond (9 pairs); Practice panel = shorter frond; Learn "Up next" cover = alternate-leaf branch (lesson covers; one variant per domain by changing `alt`/`ang`/`taper` — 5 presets, no images); clearing card = tall frond; empty states = their own drawing (1.9, `EmptyArt`, 170×176 in `accent`): seedling (stem, 2 cotyledons, 1 true leaf, 3 fading soil lines; something new will grow here), fern (a fiddlehead uncurling beside one open frond: review brings questions back around), bookmark (a ribbon standing in the soil with a sprig drawn on it, a sprig growing beside it), pressed (a leaf taped to a herbarium sheet, the tape knocked out on paper, with its label), fieldbook (an open field book: a sprig on the left page, notes on the right).
- On `forest` it's `forestLine` (decorative, ~1.7:1 on purpose). On paper it's `accent`. Never behind body text on paper.
- Optional, low priority: a 4s ±1.5° sway on the panel frond (reanimated, `withRepeat`), paused when off-screen and under reduce motion.

### 10.4 Serif numeral system + italic voice
- **Every number a learner reads as an achievement or a quantity is Fraunces 500**: readiness `number` 52, `stat` 34 (You), 30 (clearing), inline counts 22–26 right-aligned in rows ("59 / due", "59 / open"), lead numerals 26 for mock sizes ("50 / questions"), segmented control numerals 20 ("10 questions"), lesson order numerals 22 in `ink2`. The unit sits under or after in Figtree `meta` 12–14. `%` is always a raised 0.48–0.5em superscript.
- Counters, timers and "4 of 10" stay **Figtree tabular** (they change while you watch; serif digits would jitter).
- Italic Fraunces = the coach speaking (Key idea, stage name, clearing "grew to" line). Nothing else is italic.

### 10.5 Paper and grain
- `bg` gets a tiled 256×256 monochrome noise PNG over the whole screen, `pointerEvents="none"`, absolutely positioned **above** content (so sticky bars, panels and rows share one texture) at `grainOp` (5% warm-black light, 6% white dark). Generated once (`sharp`/any tool, offline) and committed as `assets/grain-light.png` / `grain-dark.png`.
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
- `PixelRatio.getFontScale() ≥ 1.3` → readiness row stacks (rings above number); hero title drops `maxWidth`; stat row on You goes 1-up (vertical list); chips and segmented control wrap instead of scrolling.
- `≥ 1.6` → option badge grows with its letter (`30 × min(scale,1.6)`), sticky footer stays but the question is a plain scroll (stem first, options after); question meta wraps onto 2 lines (allowed).
- Every fixed `height` on a control becomes `minHeight` (pill 48, button 56, chip 40, seg 40).

---

## 11. Component recipes for the extra screens (v2)

**Game frame** (Play's games): `PushedHeader` with ✕, a segment bar per question and the running score (Figtree tabular, never shown below 0 during a round; the recap shows the real total with a true minus "−5") → a `meta` title line ("Sure Footing · 3 of 8") that may carry a 48pt info `IconButton` ("How scoring works", `expanded` state) on the right → content in a scroll padded for the sticky footer. Opening the info panel scrolls to the top and moves screen-reader focus to its heading. A game an exam can't play yet (too few questions) shows an Empty state "This game is on the way" with "Go to Practice"; Play shows "Games are on the way" when none can be played. Never a number.

**Game rules block** (Sure Footing): no card. `headline` heading "How Sure Footing scores" → `small` `ink2` intro → hairline rows, one per level: `label` name left, points right ("+3 right · −5 wrong", tabular) and a `meta` description below ("You would put your name to it."). Each row is one screen-reader stop that speaks points and description. Rows wrap; at ×1.3+ the points drop under the name, left-aligned. Secondary "Got it". Shown on the first play (it counts as seen once the learner answers), then behind the info button; it closes when moving to the next question. The level choice itself is a `Segmented` radio group (Guess / Lean / Sure, no points on the pills, nothing selected at first), with the chosen level's points once underneath as a centred `meta` line ("+3 if right · −5 if wrong"). No betting words ("bet", "stake").

**Round recap** (every game's end): seedling 96 → `caption` "Round complete" in `accentText` → `number` 52 score → `meta` "out of 24 · best 14" → when there are 2+ rounds, `caption` "Last 5 rounds" over a tabular `label` row "4 · 6 · 5 · 7 · 8" (one spoken sentence: "Your last 5 rounds: …. Best 8.") → "What caught you" `headline` → one hairline row per miss: `meta` stem start (≈90 chars), `caption` tag in `tip` ("Snare: …" / "Signpost word: FIRST"), one `small` line on why → `meta` "Missed questions are in your review." when any answer was wrong → the game's own note → primary "Play again", ghost "Done". Negative scores use a true minus.

**Snare Spotter reveal**: the best answer ✓ tagged "Best answer"; the learner's own wrong pick ✗ tagged "Your answer"; the real snare tagged "Snare" in the `tip` tone, never a ✗ unless it was their answer ("Snare · your answer"). Tapping the best answer in step 1 shows a `tipBg` block "That's the best answer, not the snare" naming the letter; the answer then earns no point and reads "Best answer: B (shown above)".

**Signpost step 1**: stem (priority word not marked yet) → `headline` heading "Step 1: what does this question ask for?" → four stacked secondary buttons, one per meaning (never the capital word). The footer repeats the step as a visual reminder only (hidden from screen readers). After a choice, the word is marked in the stem and a feedback block explains what it asks for ("MOST appropriate works like BEST").

**Settings → Study reminder**: `ToggleRow` "Study reminder" with the summary subtitle ("Weekdays at 7:30 AM") → two Steppers (Hour, Minutes) side by side, wrapping at large text → `caption` "Days" → seven checkbox chips Mon–Sun (wrap) → `meta` "At most one reminder a day. Turn it off any time." (or, while off, "Applies when reminders are on. At most one a day."). Permission is asked only when the switch is turned on; controls are disabled while it saves.

**Settings → Your data** (backup and restore, added in mobile 1.3): sits after the Study toggles and above "Reset progress". `Section` "Your data" with the `meta` "Last backup file made: 6 Oct 2026" ("made", not "saved": the share sheet can't tell us where the file went), "Restored from a backup saved on 3 Oct 2026" after a restore (until a newer file is made), or "No backup file yet". No nag notifications. → `small` `ink2` "Your progress is kept only on this phone. A backup file keeps it safe and moves it to a new phone. You choose where the file goes." → two full-width secondary buttons, "Save a backup" (opens the share sheet) and "Restore from a backup" (opens the file picker), each with a spoken hint; both disabled while one runs, label "Saving…" / "Opening…" → the result as a tinted feedback block (radius 16, padding 12): `caption` title + `small` `ink` text (4pt apart), `correctBg` / `correct` for "Backup file ready" ("If you saved it, you're set. On a new phone, choose "Restore from a backup" and pick this file."), "Restored" and "Restore undone"; `tipBg` / `tip` for problems ("Couldn't restore", "Restore didn't finish", "Can't undo"). Problems are calm and give a next step; read-time problems end "Nothing was changed." Never `wrongBg` (nothing went wrong with the learner's answer). The block is NOT a live region: it is announced once, ~600 ms after it appears (queued behind other speech on iOS). → after a restore, a ghost "Undo restore" (left edge lined up with the text below) and the `meta` "Available until 17 Oct 2026." for 7 days; it asks first with a system alert: "Your progress goes back to how it was on <date>, before the restore. Anything you studied since then will be replaced." (destructive "Undo restore"). Free, offline, no account: never behind a paywall. **Section headers** (every `Section`) stack the title over the meta at ×1.3+ text, both allowed to wrap.

**Restore preview** (a page sheet, slides up; fades in under Reduce Motion; swipe-down and Back do nothing while it saves): `display` "Restore this backup?" → `meta` "Saved on 7 Oct 2026" → `body` `ink2` "The progress on this phone will be replaced by the backup. You can undo this for 7 days." → when the backup looks older than the phone (fewer answers, or an earlier last study day), a `tipBg` block: `caption` "Older backup" + "This backup is older than this phone. Restoring it replaces the newer progress here. You can undo this for 7 days." → when a quiz is paused, a `small` line "Your paused session will end." → six hairline rows (1px `line` above the first and below each): `label` name (Exam, Exam date, Questions answered, Last studied, Best streak, Study reminder), then two columns, `meta` "This phone" / "Backup" over the values. The current value is `body` `ink2`; a backup value that changes is `label` `ink` (bold), one that stays reads "CISA (same)" in `body` `ink2`. Never the bank size ("200 questions", never "200 of …"). At ×1.3+ text the two columns stack (This phone, then Backup), so nothing is cut off at 200%. Each row is ONE screen-reader stop: "Exam date. On this phone: 17 Nov 2026. In the backup: 24 Dec 2026." (plus "No change." when equal) → danger "Replace my progress" (hint: "Replaces the progress on this phone with the backup. You can undo this for 7 days.") → secondary "Cancel". The buttons sit at the end of the scroll, not in a sticky footer, so the facts are read first. The confirmation is drawn in the sheet (not a system alert) so it reads the same on every platform. **Fresh variant** (the welcome screen, when the phone has no progress yet): body "This puts the progress from your backup on this phone.", each row shows only the backup's value, and the button is primary "Restore my progress"; no undo snapshot is kept (there is nothing to go back to). In Settings the preview always compares, even on a new phone, because the exam date and reminders chosen there would be replaced.

**Pace strip** (mobile 1.4, `components/pace.tsx` `PaceStrip`; the ONE timer/pace component for mock exams, timed practice and Daylight): sits under the screen's header, outside the scroll, padded `gutter`, min height 48. Row 1: a 16 clock icon + the clock in Figtree tabular `label` `ink` ("12:04") + `meta` unit ("left"; in practice "so far", or "paused" while the explanation shows); "Clock hidden" or "Untimed" instead of numbers when chosen. Row 2 (beside it when it fits, below at ×1.3+ text or when it wraps): an icon + `meta` pace line. Tones: a pace status (gauge icon), `cue` (flag icon, only where a Flag button exists), `soon` (clock icon, clay: the practice 2-minute line "Over 2 minutes on this one. On the exam, flag it and move on.", "Less than 5 minutes left." with the clock hidden, Daylight's "About a minute of light left."), `note` (clock icon, `ink2`). Colours: `ink2` for "On pace", "Ahead…" and notes; `clay` for "About N min behind. Flag anything past 2 minutes and move on.", `soon` lines and the mock clock's last 5 minutes. **Never `wrong`, never pulsing.** At ×1.3+ text the strip shows a short line ("About 6 min behind", "Behind pace") so it never crowds the question; screen readers still get the full advice. The whole strip is one screen-reader stop, and its clock is spoken in whole minutes ("Time left 12 minutes. On pace"), then 10-second steps under a minute ("30 seconds or less"), so the label doesn't change every second. "Less than 5 minutes left." is announced once, clock shown or hidden. Mock pace lines change ONLY at the 25 / 50 / 75% checks, and each check is announced once. Daylight adds a pace bar (8pt `track`, `accent` fill = questions answered, a 4×14 `ink` tick with a 1px `bg` edge = where an on-pace learner would be, visible on the fill; the tick glides, and steps in tenths under Reduce Motion) and makes the strip a button ("Reads the pace aloud.").

**Mock start sheet** (`app/mock-start.tsx`, before every mock: Practice's Mini / Full mock rows and Today's mock item): pushed header with ✕ and "Mini mock" / "Full mock" → `meta` "50 questions · 1 h 20 min · feedback at the end" → `Section` "Timing" → a radio group of 4 hairline rows (64pt; 22pt ring, filled `ink` dot when chosen, so the choice is shape not colour): `label` name + tabular `ink2` length ("+25% time  1 h 40 min", spoken "1 hour 40 minutes"; the Untimed row has no length) over a `meta` note ("Extra time, as an exam accommodation allows.", "No clock. Left out of your pacing stats.") → `ToggleRow` "Hide the clock (checkpoints only)" ("The time limit still applies…"; disabled for Untimed) → `small` line with the checks and the target pace from the exam facts ("Aim for about 90 s a question…") → primary "Start mock". Standard is preselected; extra time stretches every pace by the same factor.

**Results → Pacing** (timed mocks): `Section` "Pacing" under the stat row, then hairline rows, each `meta` label over a tabular `label` value, one screen-reader stop each: "Time used" ("1 h 11 min of 1 h 20 min"), "Median per question", "Pace checks" ("25%: on pace · 50%: on pace · 75%: 9 min behind"), "Unanswered when time ran out" / "Unanswered at submit", "Last 10% of the time" ("50% right · the rest 69%"), "Slowest domain" ("IS Operations, median 140 s"). No card, no colour. Values are spoken in words ("1 hour 11 minutes of 1 hour 20 minutes", "60 seconds"). An untimed mock instead gets a `meta` line ("Untimed mock: your answers count toward readiness, and pacing stats leave it out."), and its title and history row say "· untimed" (extra time says "· +25% time"). Practice and review results always show one tabular `meta` line under the stats: "Median 74 s per question · exam pace 96 s".

**Coaching tags** (Results review rows only): a quiet `Tag` beside the status ("Quick pick" under 30 s and wrong; "Took its time" over 3 min and right) and a `meta` line under it ("Slow down on the stem." / "You knew it; trust the first pass."), included in the row's spoken label. Only on those two cases; coaching, never a penalty colour.

**Practice → Timed** (mobile 1.4; since 1.5 it sits under the path row and reads "Your path and Build a set. Counts up while you answer; never a countdown."): a `ToggleRow` "Timed" right under the Quick 10 panel ("Quick 10 and Build a set. Counts up while you answer; never a countdown."). It starts from Settings → Study defaults; flipping it here changes only the next start. When on, the Quick 10 meta ends "· timed" and Build a set's button reads "Start 20 questions, timed". **Offer card** (once): a raised card above Quick 10 when the exam is 21 days away or less, or at the mock / ready stage: `headline` "Practice at exam pace?" → `small` `ink2` line with the exam pace → secondary "Turn on Timed" (an offer, never a primary push), ghost "No thanks" (hint: "Hides this card. You can turn the timer on in Settings."). Either answer hides it for good, and so does choosing in Settings; only "Turn on Timed" switches the timer on (announced), and screen-reader focus then moves to the Timed switch. The card never shows while the switch is on.

**Settings → Study defaults** (mobile 1.4; mode added in 1.5): a `Section` after the Study toggles and above Your data: `ToggleRow` "Timed practice" (off by default; since 1.5 it starts EVERY non-mock practice session timed, and Practice's own switch can change it for one set), then `caption` "Default mode" over a radio list (`RadioRow`): "Follow my stage" (the app's suggestion: Random, then Guided, then Smart) and the four modes with their one-line whys. It is the same saved choice Practice remembers.

**RadioRow** (`ui.tsx`, mobile 1.5): one choice in a radio list. 22pt ring (2pt `control` outline; chosen = `ink` outline + 10pt `ink` dot: shape AND colour), `label` title with an optional `caption` badge in `accentText` ("Suggested") beside it, `meta` line under it, hairline inset 36. The whole row (64pt min) is the target, spoken as a radio with its checked state, inside a `radiogroup` View.

**Practice → Choose your path** (mobile 1.5): the forest hero now starts the learner's path instead of Quick 10: `caption` "Smart · All domains", `hero` "10 questions picked for you" / "10 questions, topic by topic" / "10 mixed questions" / "Next topic: <topic>" (Guided), `meta` the mode's why + "About 12 min" (+ " · timed"), pill "Start" (Guided: "Open step"). Under it, `Section` "Choose your path" (`meta` "Suggested for your stage" until the learner picks) → four `RadioRow`s (Smart, Guided, In order, Random; the stage's suggestion carries the "Suggested" badge) → domain chips (All domains + each domain) → serif `Segmented` 10 / 20 / 50 questions (Guided shows the `meta` "Guided goes one topic at a time, so each step has its own length." instead). Every tap is saved at once. Then the Timed switch ("Your path and Build a set…"), the review / weak area / bank rows, Build a set, mocks. **Build a set** gains a second chip row once a domain is picked: "All topics" + one chip per outline topic (name before its first comma, cut near 28 characters with "…"; the chip's spoken label is the full name).

**Practice → one action, one row** (mobile 1.5, beginner-load redesign; supersedes the layout above, `app/(tabs)/practice.tsx` + `components/pathChooser.tsx`). Who: a beginner with ten minutes. The one job: start the next useful set in one tap. Order: `display` + subtitle → offer card (once) → forest hero → [ghost link] → path row → Timed → `Section` "More ways to practice" → `Section` "Mock exams".
- **Hero:** `caption` "Your path" (never the mode name: the row below says it), `hero` as above, `meta` only the length and timing ("About 12 min · timed"; Guided: "Learn it, practice it, then mix it with earlier topics."). The mode's one-line why is said once, under its radio, never in the hero. Pill "Start" / "Open step".
- **"Or 10 mixed questions"**: a ghost button (48pt, text aligned to the gutter) right under the hero. It starts Random · All domains · 10 (timed if the switch is on) and leaves the saved path alone. It shows whenever the hero isn't already a 10-question mix across all domains: always in Guided, and for In order, a single domain, or 20 / 50 questions. So a quick mixed 10 is one tap for everyone, and it never doubles a hero that already does it.
- **Path row** (`DisclosureRow`): 56pt min, no icon. `label` summary "Smart · All domains · 10 questions" (Guided: "Guided · All domains"), and on the right `label` "Change" in `accentText` with an 18 chevron-down (flipped, and "Close", while open). Spoken "Your path: Smart, All domains, 10 questions. Change", a button with `expanded` state and the hint "Shows the study mode, domain and length the Start button uses." At ×1.3+ text "Change ⌄" drops under the summary. It starts closed on every visit.
- **Path chooser** (opens in place under the row, so the row and the hero just above update as you tap; 1px `line` rule under it): `caption` field label **Mode** → the four `RadioRow`s with their whys and the "Suggested" badge on the stage's mode (no "Suggested for your stage" meta, the badge says it) → **Domain** → chips → **Length** → serif `Segmented` 10 / 20 / 50 (Guided: the `meta` note instead) → secondary "Done" (closes, and screen-reader focus returns to the row). Every tap saves at once, except that **tapping the mode already chosen saves nothing**, so "Follow my stage" (Settings) survives a stray tap.
- **Timed** stays visible under the path row (it covers the path and Build a set, and the offer card moves focus to it).
- **More ways to practice:** Spaced review, Weak area, Question bank, then **Build a set** as the last row (`DisclosureRow` with a ListChecks icon, "Pick a domain, topic and difficulty", chevron only). Opened, it shows its own labelled groups: **Domain** chips → **Topic** chips (once a domain is picked) → **Length** `Segmented` → **Difficulty** chips → secondary "Start 10 questions[, timed]". It is a one-off: it saves nothing and never changes the path. It stays separate from the path chooser on purpose. The path is remembered and drives the hero every day; Build a set is the only place with topic and difficulty, which the study modes don't take. Both start closed, so their look-alike controls are never on screen together by default, and every group carries a visible name.
- **Segmented** (all screens): items 44pt min with a 2pt `hitSlop` (48pt to the finger), radius 22, inside a `soft` track with radius 25 and a 3pt inset.
- Screenshots: `SHOTS=practice bash scripts/screenshots/run.sh <out> <light|dark>` (first screen, whole tab, Guided, path open, Build a set open, approximate 200% text).

**Reason tag** (session, mobile 1.5): Smart questions show why they are here — "Due", "Weak spot", "New", "Refresher" — and In order / Guided tail questions "Mixed review": a `caption` in `accentText`, right-aligned on the domain meta row (beside "Flagged"), spoken "Why this question: Weak spot". When Smart's recent accuracy is under 55%, a missed weak-spot question adds a `ListRow` "Read the note: <subtopic>" (BookOpen icon) above the trust line, unless the lesson row is already there.

**Guided step** (`app/guided.tsx`, mobile 1.5): pushed header "Guided" → `Tag` (domain dot + "1A1 · IS Audit") → `hero` topic name → `meta` the Guided why → `Section` "1 · Learn it" (`meta` Done / Lesson / Study notes) with the topic's lesson rows (or its subtopic notes) and a 28 read circle → `Section` "2 · Practice it" + `body` `ink2` "5 questions on this topic, foundational first, then application." → `Section` "3 · Mix it" + `body` `ink2` line (first topic: "From your second topic on, …") → a note block (radius 16, padding 16): `soft` with `caption` "Not clear yet" in `accentText`, or `correctBg` with a ✓ and "Topic clear" in `correct`, then `small` "Lesson done. To clear it, get 4 of your last 5 answers here right (so far 2 of 2). You can move on at any time." → primary "Start this step" (play icon) → ghost "Next topic: <name>", always enabled (never a lock). Results for a Guided step adds "Back to your Guided step".

**Study notes → Practice this topic** (mobile 1.5): on a notes domain page, a secondary full-width "Practice this topic" button after each topic's subtopic rows (only when its notes list questions). It starts the topic's questions, its subtopics interleaved, up to 20.

**Game intro with levels** (Root or Rumor, Call It First; `GameIntro` in `components/game.tsx`, mobile 1.5): Daylight's pattern — pushed header with the game name → 48 line icon in `accent` → `caption` "<skill> · about N min" → `hero` tagline → `body` `ink2` rules → `Section` "Pick your level" → `Segmented` Seedling / Sapling / Heartwood (spoken with what each level does) → centred `meta` line for the chosen level → primary "Start".

**Root or Rumor** (Play, mobile 1.5): the game frame; `caption` "Sound principle, or exam myth?" in `accentText` → `meta` "From the note: <subtopic>" → the statement in `stem` → `meta` "Root: a sound principle. Rumor: an exam myth." Footer: two secondary buttons "Root" and "Rumor" side by side (full width each at ×1.3+), spoken "Root, a sound principle" / "Rumor, an exam myth"; text labels, never colour alone; no swipe. After a tap: `caption` "You said Root · right" (`correct` / `wrong`), then a `RevealCard`: "Rumor: myth spotted" / "This one is a Rumor: a myth the exam counts on" with the trap's why, or "Root: a sound principle" / "This one is a Root: a sound principle" with "A true principle you can lean on in the exam." A ghost "Read the note" follows every Root and every missed Rumor. The card is spoken with the verdict first ("You said Rumor, right. Rumor: myth spotted"). Heartwood asks "Why is it a myth? Pick the reason." first: announced with the verdict when the buttons give way ("You said Rumor, right. Why is it a myth? Pick the reason."), three option rows A–C in a `radiogroup` "Why is it a myth?", then marked. Footer "Next statement" / "See results". End: the shared recap with "Missed statements come back in a later round.", `small` "Longest run of right calls: N", Heartwood's "“Why?” right: N of M", and a "Read again" list (BookOpen rows) for any subtopic with 2+ missed statements.

**Call It First** (Play, mobile 1.5): step 1 shows the stem only (no options) and three principle cards as option rows A–C; footer label "Step 1: which principle does it test?". A quiet "Show a hint · A hint counts half." control (Lightbulb, like Coach me) reveals the pre-read line with "Assisted. Counts half toward readiness." After a pick, a `caption` "Step 1 · your call" heads the cards, and only the real principle (✓, tag "The principle") and a wrong pick (✗, "Your pick") stay. They are spoken ", the principle" / ", your pick, the principle" / ", your pick, not the principle" (`OptionCard` `spokenSuffix`), never "best answer". A `caption` says "Principle named. Now find the option that matches it." (or "The principle is marked above…") and the four options appear under it, scrolled into view; footer "Step 2: pick the BEST answer". Heartwood: no cards; a `soft` block with the EyeOff icon, `headline` "Options hidden", "Name the principle in your own words first." and `meta` "Options in N s" for 10 seconds (screen-reader focus moves to it), then the options (announced "The options are ready."). The answer time counts only the time the options are on screen. The reveal is the usual `RevealCard` with the explanation. Recap tags read "Principle: …".

**Daylight** (Play, mobile 1.4): (1) Pick a light: pushed header "Daylight" → 48 sunrise line icon in `accent` → `caption` "Pacing" → `hero` "Answer at exam pace." → `body` `ink2` rules → `Section` "Pick your light" → `Segmented` Seedling / Sapling / Heartwood (spoken with seconds and "suggested") → `meta` "96 s a question · 8 min of light" + "Suggested: Sapling, from your recent answer times." → primary "Start". (2) Round: the game frame plus the pace strip with the pace bar; footer "Pause" + "Flag & move on" (secondary, side by side; full width at ×1.3+), and on Seedling a ghost "Add a minute" (up to 10 times, then it goes). With 10% of the light left the strip line becomes `soon` "About a minute of light left." (+ " You can add a minute." where allowed); on the last question "behind" reads just "Behind pace." (nothing to flag). Announcements wait ~350 ms. After Pause, focus moves to Resume; after Resume, back to the strip (tap it to hear the exact time). Answering shows the usual reveal block with the seconds taken and `meta` "The light waits while you read this." Paused hides the question (sunrise icon, `hero` "Paused", "The light holds until you resume.") with a primary "Resume". (3) End: the shared round recap, then `headline` "This is where time went" (light used, average seconds vs the light's seconds, the slowest question) and, when the light set, `headline` "The light set before these" with `meta` "Shown, not marked wrong. They are in your review." and one hairline row per question with its best answer. No red, no pulsing.

**Badge moment** (Results and a game's round end; mobile 1.6, redesigned 1.10): at most ONE per session. On Results it sits AFTER the score, the stats and the review actions ("Practice the ones you missed", "Done"), before "Review answers", so learning feedback comes first; on a round end, under the score. No card: the key-idea recipe — 3px `accent` rule on the left, the badge's 64pt medallion in its own column, `caption` "A new badge · Evergreen" in `accentText`, `headline` badge name (a tier names its metal: "Rooted · 30 days · Lichen"), `small` `ink2` unlock line (what the learner can now do, never the rule again), `meta` "That completes Evergreen." only when it does. Under it: ghost "See it in your badges ›" (opens the case with this badge's sheet up) and, on Results only, one `meta` "Next: Firm Footing · IS Operations, 62% → 70% · 14 of 20 answered". Never "Unlocked!", "Collected!" or "Congrats". One `notificationAsync(Success)` (Settings can silence it); announced once. No confetti, no sound, no push notification. Any other badge earned waits for a later session. With Settings → Show badges off, there is no moment.

**Round end, mobile 1.6 lines**: under the trend, centred: `meta` "New personal best" in `accentText` (a text line, never a badge), then a `TierLeaf` + `small` line when the level moved: "You've grown to Sapling. Your next round starts there." or "Back to Sapling. Two strong rounds grow it again." (never "lose", never a warning colour). The milestone moment, if any, follows, but never after a level-up: one celebration per round end, so the milestone waits in the queue for a later session. "Play again" starts on the new level.

**Badges** (You → Badges, `app/milestones.tsx`; the route keeps its name, mobile 1.10, badges_game.md §4): pushed header "Badges" → `meta` "Earned by what you've mastered. Once earned, a badge stays." → the one-time back-fill block (key-idea recipe, `quote` "You'd already earned 4 badges.") → **Next for your exam** (hidden after the exam date): slot 1 in the screen's one `forest` HeroPanel (`caption` "Next for your exam", `hero` badge name, spoken "Next for your exam: <name>", `meta` "26% of the exam · 62% → 70%" or the rule, a row of the 56pt medallion (`surface="forest"`: on-forest inks) beside a 6pt `sap` bar on `forestTrack` and its answer count, or the effort fact when there is nothing to fill; pill "Study for this", hint "Studies for <name>") then slots 2–3 as hairline rows (40pt compact medallion, `label` name, `meta` progress, 6pt bar, ghost "Study for this ›" spoken "Study for <name>"; a `meta` note when it matters: "Nothing due today. Smart mixes in older questions.") → filter chips All / Earned / Not yet (this visit; spoken "All badges", "Earned badges", "Badges not yet earned") and a ghost "Sort: By set ▾" (spoken with its expanded / collapsed state) that opens RadioRows in place (By set, Recently earned, Closest, Effort; kept on this phone in `store/seen.ts`); picking one closes the menu and returns screen-reader focus to the Sort button. Closest and Effort list the exam's own sets first, then Field notes (a game skill never outranks a study badge). → the shelves, in journey order: Groundwork, The Five Domains (named for the exam's count), Evergreen, Sound Judgement, Exam Day, Rooted, Moments (only once something on it happened: an unearned Fresh Start is never shown, in any sort or filter, so a week away never reads as a goal), a hairline, Field notes (+ ghost "See game levels ›"). Each shelf: `headline` name, `meta` count ("2 of 3", "3 of 3 · Complete · 2 Nov" in `accentText`; Moments has none; never a grand total), `meta` purpose line ("Cover the exam as it's weighted."), then a grid. **Grid**: 3 columns with 88pt medallions (2 columns with 104pt at ×1.3 text; at ×1.6 a list of 48pt `BadgeListRow`s), 8pt gaps; each cell is ONE button (hint "Opens its details"): medallion → `label` caption ("First Foothold"; Firm Footing: the domain's short name, then a `DomainDot` + `meta` "26% of exam"; Rooted on its shelf: "10 days") → `meta` line: earned date in `accentText` (tiers prefix the metal: "Clay · 11 Oct"; a badge the back-fill saved reads "By 11 Oct", spoken "Earned by 11 Oct", and a set it completed "Complete · by 11 Oct"), or progress ("14 of 20 answered", "62% → 70%") in `ink2`, or "Opens later" when gated; flat sorts add the set's name in `muted` (and Firm Footing keeps its name: "Firm Footing · IS Operations"). Spoken: name, state ("Earned 11 Oct" / "Not yet"), the rule, progress or the gate ("62% now, aiming for 70%": never the arrow), the domain's weight, the set. Filters keep shelves and say "Nothing earned here yet." / "All earned." when empty. In the final three weeks it opens scrolled to Exam Day; from Field notes (`?shelf=fieldNotes`) at that shelf, by set for that visit (the saved sort is untouched); the jump measures the shelf's outer view in the scroll content. After the exam it is a keepsake album (no Next panel, no progress lines or traces, no Closest sort). Footer `meta` "Answers after Coach me and game answers don't count toward study badges. Nothing here is ever taken away." No bank size anywhere.

**Medallion** (`components/medallion.tsx`, art built by `scripts/badge-art/build.mjs` into `content/badgeArt.json`): one 200-unit grid; full cut ≥ 48pt (ribbon, beads, pips, laurel, growth rings), compact ≤ 47pt (emblem ×1.08, none of those). The SET is a frame shape plus an enamel, so no two sets differ by colour alone: Groundwork round seal + forest; The Five Domains hex + paper; Evergreen hex + forest; Sound Judgement shield + ink; Exam Day shield + clay; Rooted round seal + clay; Moments the round seal as a passport stamp (paper, a dashed postmark ring, no ribbon); Field notes the leaf-mark + paper. The TIER is the rim metal, pip count and (Gold leaf) a laurel, with beads from tier 2; one-mark badges have no tier: the calm `badgeStruck` sage, a plain rim, no pips, no beads, no name. Light cut ≤ 64pt: no growth rings and no cast emblem shadow (fewer SVG nodes). `surface="forest"` draws a not-yet badge in the on-forest inks. Props are primitives (`domainIndex`, `domainCount`), so the memo holds. Firm Footing's five domain leaves sit on the rim in blueprint order, this domain's filled forest with a `sap` midrib. Not yet: stitched dashed `control` outline, flat `soft` field, `muted` one-tone emblem, an `accent` trace from the top by progress; gated: a dotted outline, no trace. Never a padlock, "?" or silhouette, and never a padlock, tick or check emblem on a shield. Frames are generic heraldic shapes (round seal, hex, heater shield, leaf) with botanical emblems; no cups, trophies, gym-badge shapes, platinum or points. Decorative to screen readers (the button around it speaks). Unique gradient and clip ids per instance (`useId`). A completed counted set saves its planter (`milestones.planters`, for the Phase 4 plant; nothing shows it yet), and a set that later gains a badge never takes a planter back. `syncPlanters` (idempotent) also runs at launch and after a restore, so a set completed before planters existed gets one.

**Badge sheet** (tap a medallion): a `pageSheet` Modal on `raised2` (dissolves under Reduce Motion), ghost "Close" (spoken "Close <name>"), the 160pt medallion turning in once, a header group (`hero` name, `meta` "Rooted · Lichen, tier 2 of 3" / "The Five Domains · 26% of the exam") that takes focus. Earned: the key-idea block (`caption` "Earned 11 Oct", or "Already earned when badges arrived (by 11 Oct)" for a back-filled badge; `quote` unlock line; `meta` "This completed Groundwork on 2 Nov." on the ONE badge that did: of two earned together, the later in catalogue order, and never on a back-filled badge). Rooted: a "Tiers" row of three 56pt medallions with the metal name and "10 days · earned" / "30 days · next" ("next" is the first unearned tier, whichever was opened). Then `caption` "The rule" + `body` rule + bar and progress (or the gate line), `caption` "How to earn it" + `body` (open only; mock badges before their stage add "Best once every domain reaches 65%. It counts whenever you do it."), the effort fact in `meta` (never rarity), and a primary "Study for this" (spoken with the name) for open badges; it opens its session only once the sheet has slid away (iOS `onDismiss`, else a short wait). After the exam: no "How to earn it", no Study button, no progress.

**Field notes** (You → Field notes, `app/field-notes.tsx`): pushed header → `meta` "Your level in each game, and how it grows." → `Section` "Game levels": one hairline row per playable game, `label` name left and `TierTag` (leaf + `meta` level name) right (wraps under at large text), `meta` how it grows → `meta` the step-back rule → (badges shown) `Section` "Skill badges" with one ListRow "Your skill badges" ("2 of 7 earned, in your badges") that opens the case at its Field notes shelf.

**You → Study tools** has "Badges" (the `badge` icon, subtitle "What you've mastered, and what's next for your exam", trailing serif count + "earned" (a count only, never "of N"; the case's earned medallions, so a kept key the case doesn't show never adds one), spoken "Badges, none yet…" at 0) and "Field notes" (leaf icon, "Game levels and skill badges") after Saved questions; the back-fill block (same recipe as on Badges, with a ghost "See your badges") sits above Study tools on the first visit after the back-fill (then marked seen). Only its text is one screen-reader stop; the button stays its own stop, outside the group. **The "new" dot (1.10):** while a badge earned since the case was last opened waits, an 8pt `accent` dot sits before the row's count (spoken "Badges, new badge, …") and a 10pt RING (2pt `accent` outline, `bg` inside) sits at the You tab icon's top right (spoken "You, new badge"): a different shape from the filled selected-tab dot under the label. A badge the back-fill saved, or a kept key the case doesn't show, never lights it; it clears only while the case is on screen. Never a number, never red, never on the app icon or in a notification. Badges held when 1.10 first opens never count as new. **Settings → Study → Show badges** (a ToggleRow, on by default, "A short moment when you earn one, and Badges on You. Off: you still earn them, quietly."): off hides the moments, the Badges row, the dot and the back-fill line, and badges are still earned; back on clears the waiting moments (no burst) and counts the active exam's waiting moments (never badges a back-fill or restore saved quietly), showing, for that visit and announced once, one `meta` line in `accentText`: "Badges are on again. 2 badges arrived while they were hidden: see You → Badges." It travels in backups; a file from before it keeps this phone's choice. **Badges, its sheet, Field notes and You** are the only places badges are listed; no medallion art on question, lesson, mock or game-round screens.

**Play levels** (mobile 1.6; 1.8): each "More games" row's subtitle is the tagline, plus a `TierTag` (leaf + level name) once that game has grown past Seedling; while every game is at Seedling the `Section` meta says "All at Seedling" once. Every row is still spoken "…Your level: Sapling.". The featured hero carries the level after its caption: a `sap` leaf on forest + `caption` level name in `onForest2`. Game intros (`GameIntro`, Daylight's picker) start on the learner's own level and add a centred "Your level: [leaf] Sapling" line with how it grows.

**MatchTile** (`components/game.tsx`, mobile 1.6): the tappable item of Field Guide, Canopy Call and Stepping Stones. A raised row like an answer option (radius 16, 48pt min, padding 12/14, `body` text that wraps), optional tabular `label` lead ("2" for a place on the path). Selected = 2px `ink` border (never green); matched / right = `correctBg` + ✓; wrong = `wrongBg` + ✗ (shape and colour); dimmed = `muted` text. A wrong try shakes once (±6pt, about 160 ms; none under Reduce Motion). Spoken as a button with its full name ("Term 2 of 4: Snapshot, matched"); "selected" comes from the state, never the name. A matched tile is not disabled (never "dimmed"); its name says "matched". In a radio group (Canopy Call, the Heartwood recall and missing-step picks) it is a radio; the learner's pick is `checked`, and after the answer the group LOCKS in place (`locked`: disabled, same element), never remounting, so screen-reader focus stays put. A tile that can never be tapped (Stepping Stones' given first step, the Heartwood path) is flat: `soft` fill, no shadow, so it never passes for a stone you can move. **Wrong pair (Field Guide)**: both tiles show the static `wrong` state for about 900 ms, and the footer says "Not a match. Try again." in words (works with Reduce Motion, where there is no shake).

**Field Guide** (Play, mobile 1.6): game intro with levels → each board: `caption` "Board 1 of 3", Sapling `meta` "One topic: <topic>", then two columns of `MatchTile`s, "Terms" (2 parts) beside "Meanings" (3 parts), each under a `caption` that is a screen-reader header; at ×1.3+ text, or when a term has a single word over 12 letters ("Microsegmentation"), they stack (terms first). Tap a term then a meaning, or a meaning then a term: right = both turn green with ✓ ("Matched: Snapshot, first try." announced); wrong = both shake and stay open ("Not a match. Both stay open: try again."). `meta` "3 of 4 matched · 2 on the first try". Footer: "Tap a term, then what it means." → with a term picked, "Now tap what "Snapshot" means." (the meanings' hint: "Matches it to Snapshot.") → after a wrong pair, "Not a match. Try again." → "Next board" / "See results". Announcements wait ~350 ms (`sayLater`), so the tile's own label isn't cut off. Heartwood: `caption` "Board 1 of 3 · meaning 2 of 4" → the meaning in `stem` → six `MatchTile`s in a radio group → `RevealCard` ("Snapshot: first try" / "It's Snapshot") and, after a miss, ghost "Read the note". End: the round recap (misses: the term, `caption` "Meaning", its definition), "Missed terms come back in a later round.", `small` "First-try matches: 9 of 12".

**Canopy Call** (Play, mobile 1.6): game intro with levels → `caption` "Who has the authority to decide?" (Heartwood cards: "Who acts first?") → the decision in `stem` → 4 role `MatchTile`s (5 at Heartwood) with the deck's full role labels ("Change authority (the CAB advises)") in a radio group "Who decides?" (the caption above is a header, so iOS, with no radio-group role, still hears the question first) → after a tap: ✓ on the right role, ✗ on a wrong pick, others dimmed → `RevealCard` "Right: Audit committee decides" / "This is Audit committee's call", body the why + "The auditor's move: …" → ghost "Read the note" after a miss. Footer "Who decides?" → "Next decision" / "See results". End: recap (tag "Decides: Data owner"), "Missed decisions come back in a later round.", `headline` "Where your calls went" with up to 3 `small` confusion lines ("You gave 2 Data owner decisions to Custodian."), then a `small` `ink2` principle line.

**Stepping Stones** (Play, mobile 1.6): game intro with levels → `caption` "Process 1 of 3" + `headline` the process title → `meta` "Tap the steps in order. Tap a placed step to take it back." → `Section` "Your path": numbered `MatchTile`s (a given first step on Seedling; placed stones tap to take back) and dashed 48pt empty slots with their number → `Section` "Stones": the unplaced stones ("Place next: …"). Placing moves screen-reader focus to the next stone, or to "Check the order" when the path is full; taking a stone back moves focus to it under "Stones"; each is announced after a short pause. A process never plays below its deck tier. Footer "Tap the 2nd step" → "Check the order" → "Next process" / "See results". After checking, each stone ✓ or ✗ with "· goes 3rd", then a `RevealCard` ("Perfect path" / "2 of 4 steps in place") whose body lists the right order with each step's note and the caption; after a miss, ghost "Open the lesson" or "Read the note". Heartwood: the path (flat, untappable tiles) with one dashed "3 · missing" slot → `Section` "Which step is missing?" → three `MatchTile`s in a radio group → reveal. No drag anywhere.

**Report a problem** (mobile 1.7, `components/support.tsx`; ONE look for every entry point). *Link:* `label` "Report a problem" in `accentText`, 48pt target, spoken "Report a problem with question d4_217" (note 4A2.3 / this lesson step / this card / the app), hint "Opens a short form, then your email app". Once this phone has a report about the item: a 14 ✓ + `label` "Report started 11 Oct" in `muted`, still tappable (spoken "Report started 11 Oct. Report a problem with question d4_217"). Never "Reported": the learner may have closed the draft or the fallback without sending. *Placement:* the trust line under an answer ("Original · Reviewed Oct 2026" left, link right; wraps under at large text; then `meta` "Code d4_250 · COBIT DSS01" in `muted`); the same row with "Code 4B1.2" under a study note's buttons; a quiet left-aligned link at the end of each lesson step (on a check only after it's answered); right-aligned under each "What caught you" row in a game recap (cards by their stable review-card id); the link alone, right-aligned, on each Mistake journal card (no meta lines: a list of cards); a ghost "Something not working? Report a bug" at the end of Results. Never during a live mock: the navigator sheet says "To report a question, open it in the review after you submit." *Sheet* (the restore-preview page sheet; a fade under Reduce Motion; buttons at the end of the scroll): ✕ → `display` "Report a problem" → `meta` "Question d4_217 · IS Audit" → (`small` `ink2` "You started a report about this on 11 Oct. Send another if something else is wrong.") → `caption` "Which part? (optional)" + checkbox chips → `caption` "What's wrong?" + `RadioRow`s (the kind's reasons) → for a disputed key, where letters were on screen: `caption` "Which answer do you think is best? (optional)" + `RadioRow`s "I'm not sure", "A. <option as shown>"… → `caption` "Add a note (optional)" + `NoteField` + `meta` "Please don't include questions from the real exam." → (the app only: `ToggleRow` "Include display details", on) → a ghost-style disclosure "What we'll send" (chevron flips) opening a box (radius 16, 1.5 `control` outline, `raised`) with the exact `meta` lines, selectable → `small` `ink2` disclosure → primary "Write the email" (disabled until a reason, with a centred `meta` "Choose what's wrong to continue." under it until then) → secondary "Cancel" (keeps the note) → ghost "Copy or share instead" (always there, also disabled until a reason; opens the message panel below with `headline` "Send it your own way"). One send at a time (a ref guard): a double tap opens one email. *After the email app opens* (`SentNote`): a `soft` block (radius 16, padding 12) under the row: `caption` "Finished in your email app?" + `small` "If you sent it, thank you. We read every report, and fixes show up in What's new." Announced once when the learner comes back; no timer; never `correctBg` (we can't know it was sent) and never `wrongBg`. *No email app*: the sheet's lower part becomes `headline` "We couldn't open an email app." (screen-reader focus moves to it) → `small` "Send it from any email account to:" → selectable `label` address in `accentText` → `small` "Tap "Share details" to send the message through the app you use, or select the text below." → the whole message, selectable, in the same box → primary "Share details" (system Share sheet) → secondary "Try again" ("Back to the form" after "Copy or share instead"; everything chosen is kept, the report is logged once) → ghost "Close". After Close, the link opens a fresh form, never the old panel. Never "Sent".

**NoteField** (`ui.tsx`): the SearchField look (raised, 1.5 `control` outline in BOTH themes, radius 16, `body`, ×2 cap), multi-line, 112 min height, `meta` "61 / 1000" right-aligned under it (spoken "61 of 1000 characters"). Its visible `caption` above is its name. Dark `line` was 1.24:1 on the fill, too faint for a control (WCAG 1.4.11); `control` is 3.31:1 dark, 3.65:1 light. Reaching the limit is announced once ("That's the limit, 1000 characters.").

**Send feedback / Contact support sheets**: same frame, the same "Copy or share instead" and message panel, and they stay mounted once opened, so Cancel, a swipe down or Android back keeps the typed message (a new kind, topic or place, or a sent message, starts fresh). Feedback: `display` ("Suggest an idea" when opened from that row, else "Send feedback") → `body` `ink2` "Tell us what helps, what's missing, or what feels off…" → `caption` "What kind?" + chips (An idea · Something I like · Something else) → NoteField → exam line → `ToggleRow` "Include display details" (off) → disclosure → primary / secondary. Support: `display` → `body` `ink2` "We're a small independent team. We read every message." → `caption` "What's it about?" + `RadioRow`s (A study question or topic · Backup, restore or a new phone · Reminders · Your data and privacy · Something else) → `small` + exam line → primary "Write the email" (disabled until a topic, with a centred `meta` "Choose what it's about to continue." until then) → `meta` "Or write to us at" + selectable address → `meta` "Found a problem in a question or note? Use "Report a problem" under it…" → secondary "Cancel". After sending: the same `SentNote` ("…We read every message."), under the row or answer that opened the sheet.

**Help and feedback** (the `help` screen; reached from ONE row, "Get help or send feedback" (`life-buoy`), in Settings (its "Help and feedback" section before About) and in You): two `Section`s of `ListRow`s with icon circles. *Get help*: Common questions (`circle-question-mark`), Contact support (`mail`), Report a problem with the app (`flag`), Suggest an idea (`lightbulb`). *Updates*: Your reports (`inbox`, "3 started on this phone · 1 updated"), What's new (`sparkles`, "Version 1.7", or "Something you reported was updated" until seen), What's next (`map`). "Finished in your email app?" sits under the row that opened the sheet. Then `small` `ink2` "Write to us any time at" → the address alone as a selectable `label` in `accentText` (iOS copies a whole Text, so the address is its own) → `small` `ink2` "Aurivan is independent and not affiliated with or endorsed by ISACA."

**What's new** (`whats-new`): pushed header → once, the key-idea recipe (3px `accent` rule, `caption` "Updated after your report" in `accentText`, `small` "Something you reported has been updated since. Thank you for telling us." ("Things…" only for two or more different items), ghost "See your reports") → `Section` "Fixed after learner reports": hairline rows (`body` note + `meta` date) and `meta` "Thanks to the learners who reported these.", or a `meta` line explaining the loop while there are none. It sits ABOVE the versions, so a fix never reads as part of the latest release → per version a `Section` "Version 1.7" with `meta` "Latest · 11 Oct 2026" → `caption` New / Improved / Fixed over `Bullets`. No codes, no counts. Never "Your report helped": another learner's report may have led to the same fix. **Today** shows the same recipe ONCE ("Updated after your report" / "Something you reported was updated." / ghost "See your reports" + ghost "Dismiss") under Also today: it is marked seen as soon as it shows and kept for that visit, so What's new only repeats it if the learner went there first. No haptic, no growth, no badge.

**What's next** (`whats-next`): `meta` "What we're working on. There are no dates…" → `Section`s In progress / Planned / Recently shipped with hairline `ListRow`s (no icon; shipped rows end "Version 1.7." and open What's new; the others are one screen-reader stop that says their group, "Planned: An optional account. …") → `Section` "Have an idea?" + `small` "Tell us what would help your study." + secondary "Suggest an idea".

**Common questions** (`faq`): `meta` "Tap a question to read the answer." → `DisclosureRow` per question; open = `body` paragraphs + ghost "Still stuck? Email us" (opens Contact support with the entry's topic chosen). One open at a time.

**Your reports** (`reports`): `meta` intro → hairline rows, one screen-reader stop each: `label` title by name ("Question in IS Audit", "Note: …", "Lesson: …, step 4", "Game card: Root or Rumor", "The app") → `small` `ink2` reason → when updated: 14 ✓ + `caption` "Updated after your report · 30 Oct 2026" in `accentText` + `small` `ink2` public note → ONE `meta` `muted` line "Started 11 Oct · Code d1_010 · Ref R-7K2Q" ("No longer in the app" for a retired question) → ghost "Clear this list" (asks first). Empty: the seedling empty screen "No reports yet".

**Welcome → Restore from a backup**: on onboarding step 0, a ghost "Restore from a backup" sits under the primary "Start my plan" in the sticky footer (hint: "Studied on another phone? Pick your Aurivan backup file to bring your progress here."). A bad file's message (the same feedback block) appears above the two buttons. A successful restore finishes onboarding and goes straight to Today.

**Daily clearing card** (Today, when all plan items are done; replaces "Well done.")
- `forest` panel, tall frond art. Caption "Today's clearing" + 3 filled `sap` leaf marks. `hero` "Three of three, done." (count-aware: "Two of two, done.").
- Stat row of 3 (`stat` 30 `onForest` + Figtree 13 `onForest2`): questions, % correct, minutes, separated by 1px `forestTrack` verticals.
- Hairline `forestTrack`, then mini rings 48 (`sap`) + italic "Readiness grew to 72%" + `meta` "IS Operations ring +4" (biggest mover). If readiness fell or held, say "Readiness holding at 70%" — never a negative framing.
- Below the panel: `Tomorrow` section (headline + "about 15 min") with the next 2 plan items as non-tappable preview rows, then ghost "Keep going anyway".

**Today (in progress)**: meta row (weekday · days to exam | sprig streak in Fraunces 20 `clay`) → `display` → forest panel "Start here" with 3 leaf marks for the plan (filled = done, current outline) → readiness row (rings 104 mono + `number` + `meta` "ready, weighted by the blueprint" + italic `stage` "Stage 3 · Make it stick"; no rings while the Exam-ready panel shows them) → "Also today" list with real, unshortened titles (2 lines allowed) under `Section` "Also today" + `meta` "about 64 minutes" (the time, not a count: the list always shows every item; spelled out like the items' own "About 24 minutes"). A paused timed mock counts its unanswered questions at study pace, but never more than its clock has left. A capped review reads "Review 55 due" / "About 24 minutes · 20 at a time, most overdue first" in the panel, and "Spaced review · 20 at a time" as an "Also today" row: the same count and line as You and Practice. The count is the LIVE queue (the day's plan is frozen in the morning, the number is not), and an empty queue reads "Review · all caught up".

**Question**: v1 recipe plus: progress segments `gap 3`, current segment `ink2`; meta "● IS Operations · Job scheduling · 4 of 10" (domain dot in tone, subtopic shortened to ≤ 3 words); `stem` steps down to 20/29 above 200 chars; option text line-height 1.42; scroll `paddingBottom` = footer + 24.

**Learn**: `display` + `meta` subtitle → forest "Up next" lesson cover (caption with domain dot + domain short name, `hero` full lesson title up to 3 lines, `meta` "3 min · 7 scenes", pill "Start lesson", domain branch art) → "Lessons by domain" headline + "1 of 5 done" (subtitle "Lessons and study notes") → rows: Fraunces 22 `ink2` order numeral (lead 40), `label` title (2 lines OK), `meta` with domain dot + short name + state; trailing status 28 circle: done = `accent` fill + `bg` ✓, available = 1.5 `control` outline + play 12, locked = lock 16 `muted` and row text `muted`. "More lessons are on the way." as a final `meta` line, not a per-domain card.

**Practice** (before 1.5; see "Practice → Choose your path" above for the current hero and picker): `display` + subtitle → forest "Quick 10" (hero "Ten mixed questions") → list rows Spaced review (trailing Fraunces 22 count + "due") and Weak area → "Build a set": domain chips (scroll, right-edge fade mask 15%) → **serif segmented control** (`soft` track radius 25 since the 1.5 redesign, 3pt inset, 44pt segments + 2pt hitSlop, selected segment `raised` + shadow (dark `#2C372F`) **plus a 1.5px `ink` outline** (selected = ink; fill alone was ~1.1:1, failing WCAG 1.4.11; idle segments carry a transparent 1.5px border so nothing shifts), Fraunces 20 numeral + Figtree 13 "questions") → difficulty chips → secondary button "Start 10 questions" → "Mock exams" rows with a lead serif numeral (50 / 150) + `meta` unit.

**You**: `display` → the System / Light / Dark appearance switch (on purpose in BOTH places, You and Settings → Appearance: the owner asked for it on You after not finding dark mode in Settings; both write the same setting) → rings 172 + legend (outer → inner, matching the visual) → one `meta` line explaining the rings → stat row (3 columns, hairline top/bottom and between, `stat` 34; streak numeral in `clay`) → "Study tools" rows with serif trailing counts → By domain bars removed (the rings + legend replace them) → mocks list.

**Study notes** (added 2026-10-08; Learn → one `ListRow` under the cover, BookOpen icon, hidden while the notes pack is empty): *Home* = pushed header "Study notes" → `meta` line → search field (`raised`, 1.5 `control` outline, 48 min, body text, 48pt clear ✕; the result count is announced to screen readers after typing pauses; an empty pack shows an empty screen) → "By domain" + "3 of 120 read" → rows: domain dot (lead 16) · `label` name · `meta` "26% of the exam · 3 of 24 read" · 28 read circle. Search replaces the rows with results (title + 2-line `meta` snippet + `caption` domain). *Domain* = the one forest panel (domain dot + "Domain 4 · 26% of the exam", `hero` name, `meta` read count, `small` overview in `onForest` clamped to 3 lines + 48pt "More"/"Less" toggle) → "Think of it like this" `caption` + `body` `ink2` analogy on the paper, so the first topic shows on the first screen → "Part A · name" headlines → per topic: `caption` code in `accentText`, `headline` name, `body` `ink2` overview, "You should be able to" bullets (6pt `accent` dots), subtopic rows with read circle → "Domain key terms" folded. *Subtopic* = `Tag` (domain dot + topic) → `hero` name → sections in schema-v2 order, each a `Section` headline: "In one line" in `stem`; bullets for How it works; Compare table side by side only when it fits (label column 100 + columns ≥120: 2 columns on a phone, 3 on wider screens), otherwise and at ×1.3+ text stacked as one bordered block per row (1px `line`, radius 16: row label, then each column name in `accentText` `caption` + cell); Illustration drawn so its smallest label is ≥13pt (×1.5 with large text, max 4 columns wide), scrolling sideways with a `meta` hint and a `bg` right-edge fade that clears at the end, `meta` caption; "How ISACA thinks" = key-idea recipe (3px `accent` rule + `quote`); Exam traps = `tipBg` blocks with `tip` captions "Trap" / "Why it's wrong"; Key terms and Types = hairline term lists → footer: secondary "Mark as read" (toggle, ✓ + "Marked as read", selected state) → when the note lists `practiceIds` that still exist: primary "Practice this concept" (questions shuffled) with a centred `meta` helper 4pt below ("N questions that test this concept. Answers count toward your progress."), then secondary "Practice this domain"; with none, "Practice this domain" is the primary → ghost "Next: …". Diagram colours: web CSS variables map to palette tokens in `engine/notesSvg.ts` (`accent-fill` → `forest` for box fills, `accentText` for text, `accent` for lines/icons; white text → `onForest`; every label ≥4.5:1 in both themes, tested; `surface` → `raised`, `border2` → `control`, `text`/`text2` → `ink`/`ink2`).

**Empty state** (Mistake journal, Saved, Spaced review "all caught up", No mocks): pushed header → its own drawing 170 in `accent` (1.9: Spaced review = fern, Saved = bookmark, Mistake journal = pressed leaf, Your reports and the notes search = field book, the bank's filters = what that filter would show (Saved bookmark, Missed pressed leaf, Not yet answered field book), games and anything still to come = seedling), 46 from header → `hero` centred one-line title ("Nothing open right now") → `body` `ink2` centred, ≤ 2 lines → optional **next line** (1.9): a sentence, not a pill (the pills below are teaching tags): a small `accentText` leaf and a `meta` `ink` line about what happens here next, from the learner's own data only ("Next review: tomorrow · 6 questions", "12 mistakes cleared so far"). The Mistake journal's pressed leaf is taped to a herbarium sheet (a page with a folded corner, drawn quieter than the leaf) → optional teaching tags (non-interactive `soft` tags with a 6pt `clay` dot showing the trap types that will appear) → sticky primary action + ghost secondary. Copy is factual and forward-looking; no "Yay!".

**Question bank → a domain** (1.9, ui.md E3): a topic header (`caption` `accentText` + the learner's own counts) only when the topic shows 2 rows or more under the current filter; a lone row names its topic itself in a `caption` `ink2` line above its stem (and says it, after its status). A lone row right after a grouped topic's rows is set `space.lg` apart, the gap a header would open, so it never reads as that group's last row. The "not yet answered" mark is a small 12pt open ring in `control`, centred in the 24pt mark (a full-size ring read as a radio button); ✓ and ✗ stay filled 24pt circles.

## 12. Brand: "True North" (mobile app, chosen 2026-10-07)

**Mark.** A compass needle rising from an open book, under one growth-ring
arc, with a honey north tip: your direction comes from the study. The gaps
between needle, ring and book are real cut-outs (SVG masks), so the mark works
on any background. Honey appears once per mark and never carries meaning.

**Lockup.** Mark + "aurivan" in Fraunces 600 lowercase (outlined, with a leaf
over the i). Two fixed tones that do not follow the theme: `light` on paper,
`dark` on forest or the dark bg. Code: `components/brand.tsx`
(`BrandMark`, `BrandLockup`, `PillarGlyph`, `PillarList`); colours:
`brand` and `pillarGlyph` in `theme/tokens.ts`.

**Vision (Set A "Rings").** Copy lives only in `content/brand.ts`.
Tagline "Master Modern Risk." · line "Grow your judgment, one ring at a time."
· pillars See the path / Grow deep roots / Grow with the seasons / Stand tall.
Shown on the welcome screen (onboarding step 0, the screen's one forest panel)
and in Settings → About ("Our vision"). The share card carries the dark lockup.

**Store assets** (`mobile/assets`, rendered from the master SVGs):

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024 | Forest icon. iOS `ios.icon.light` and the default icon |
| `icon-dark.png` / `icon-tinted.png` | 1024 | iOS 18 dark and tinted (white mark on black) |
| `android-icon-foreground.png` | 512 | Transparent, mark inside the 66% safe zone |
| `android-icon-background.png` | 512 | Solid forest `#1E4A34` |
| `android-icon-monochrome.png` | 432 | Android 13+ themed icon (alpha only) |
| `splash-icon.png` / `splash-icon-dark.png` | 1024 | Transparent mark + wordmark; splash bg paper `#F3F1EA` / forest `#1E4A34`, `imageWidth` 200 |
| `favicon.png` | 48 | Web |

**Never alpha on iOS icons.** `icon.png`, `icon-dark.png` and `icon-tinted.png`
must be opaque RGB (PNG colour type 2); App Store Connect rejects an icon with
an alpha channel. `src/__tests__/brand.test.tsx` checks this.

**Contrast (all pass).** Mark on forest: paper needle 7.16:1, sap 5.13:1,
honey 4.84:1. Mark on paper: forest needle 8.91:1, ring 5.41:1, honey 6.18:1.
Lockup wordmark: ink on paper 14.37:1, paper on forest 8.91:1. Pillar glyph
stroke on its soft circle: 6.15:1 light, 8.29:1 dark (3:1 needed for graphics).

**Old navy compass-A logo (`#0B1E3D`).** Web app only. It no longer appears
anywhere in the mobile app or its store assets.
