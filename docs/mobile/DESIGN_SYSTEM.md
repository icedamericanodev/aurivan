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
| `raised` (was `surface`) | `#FFFFFF` | `#1A211C` | Option rows, sheets, inputs |
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
| `onForest` | `#F3F1EA` | `#EEF2EA` | Text and pill button on `forest` |
| `onForest2` | `#C9DACD` | **`#BCD2C2`** | Secondary text on `forest` |
| `forestLine` | **`#3A6B51`** | **`#3C6B51`** | Botanical line art on `forest` (decorative, exempt from contrast; v1 value was invisible in dark) |
| `forestTrack` (v2) | `#2F5C44` | `#2E5440` | Hairlines and ring tracks inside `forest` |
| `sap` (v2) | `#A9D9BA` | `#A9D9BA` | Leaf progress marks and the mini ring on `forest` (6.4:1 / 7.0:1) |
| `pill` / `onPill` (v2) | `#F3F1EA` / `#17231B` | `#EEF2EA` / `#0F1F16` | On-forest pill button (was hard-coded) |
| `grainOp` (v2) | `0.05` (warm-black noise) | `0.06` (white noise) | Paper grain overlay opacity. Never higher: at 5% the weakest pair (`muted`/`bg`) stays ≥ 4.7:1 |
| `clay` | `#9A4F26` | `#E9A07A` | Streak only |
| `correct` / `correctBg` | `#1D6A43` / `#E0EDE2` | `#8AD6A8` / `#173022` | Answer feedback only |
| `wrong` / `wrongBg` | `#A3333D` / `#F7E3E1` | `#FF9CA6` / `#3A1A1D` | Answer feedback only |
| `tip` / `tipBg` | `#7A5100` / `#F3EAD3` | `#E9C46A` / `#2C2715` | Trap warnings |

Domain tones unchanged (Lake, Moss, Ochre, Heather, Slate), dots and bars only.

Contrast (WCAG 2.x, all pass AA 4.5:1 for text; v2 re-run with `design/contrast_v2.py`, 54 text pairs, 0 fails; new pairs `sap`/`forest` 6.39 L / 6.98 D, `onPill`/`pill` 14.4 / 15.1, `bg`/`wrong` 6.00 / 9.20). v1 figures: weakest light pairs are `muted`/`soft` 4.68,
`wrong`/`wrongBg` 5.50, `correct`/`correctBg` 5.44, `muted`/`bg` 5.01; weakest dark pair is
`muted`/`soft` 5.66. Non-text: `control` on `bg` 3.23 (L) / 3.68 (D); `accent` on `track` 4.62 / 6.33.
Script: `design/contrast.py`.

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
- primary: height 56, radius pill, `btn` fill, `onBtn` label (Figtree 600 17), optional 18px trailing icon, pressed = scale .98 + opacity .92.
- secondary: height 56, radius pill, transparent, 1.5px `control` border, `ink` label.
- on-forest: height 48, padding 0 22, radius pill, `onForest` fill, `ink` (L) / `#0F1F16` (D) label, 16px leading icon.
- ghost/text: `accentText` label 16/600, min hit 44.
- danger: `wrongBg` fill, `wrong` label. Disabled: `soft` fill, `muted` label.
- Sticky footer button sits in a 20px-padded footer with a `bg` fade above (no hard divider).

**Option row** (quiz, lesson checks, games)
- `raised`, radius 16, padding 15/16, gap 10 between rows, letter badge 30 circle 1.5px `control` border, letter Figtree 600 14 `ink2`; text `body`. *(Deliberate change from the earlier `line` border: `control` clears 3:1 non-text contrast on `raised`, so the idle badge outline is visible to low-vision users — WCAG 1.4.11.)*
- selected: 2px `ink` border (padding −0.5 to avoid jump), badge filled `ink` with `bg` letter. Haptic `selection`.
- correct: `correctBg`, no border/shadow, badge `correct` with ✓. wrong pick: `wrongBg`, badge `wrong` with ✗. others after submit: text `muted`.

**Chip / tag**
- filter chip: height 40 (hitSlop to 48), radius pill, 1.5px `control`, `label` 15. Selected: `ink` fill, `bg` label, leading ✓.
- tag (non-interactive): no fill; `meta` with a domain dot ("● IS Audit · Analysis · 1 of 3").

**List row**: 40 icon circle (`soft`, icon 20 `accentText`), title `label`, subtitle `meta`, trailing chevron 18 `muted`, min height 64, hairline below.

**Progress**: quiz = segmented bar (one segment per question up to 20, else continuous), height 4, gap 3, done `accent`, current `ink2`, rest `track`. **Readiness = growth rings (see §10.1) — v2 replaces both the 5-segment domain bar and the Results ring.**

**Stat tile**: no box. `number` value + `meta` label, stacked and centred in its cell, in a row of 3 separated by hairlines. At large text sizes the row becomes a left-aligned vertical list.

**Hero panel**: `forest`, radius 24, padding 22, `caption` in `onForest2`, `hero` in `onForest`, `meta` in `onForest2`, on-forest button; **botanical line art** (§10.3, 1.5 stroke `forestLine`) bleeding off the top-right, replacing v1's topographic ellipses. Title may wrap to 3 lines; reserve the right 110pt for art only while the title is ≤ 2 lines (`maxWidth: 250`), otherwise text runs full width over the art (art is decorative and low-contrast).

**Header**: tab screens = 14px top meta line (countdown left, streak right) + `display` title, no nav bar. Pushed screens = 52pt bar: 44 hit icon left (X or ‹), centred progress or title `label`, icon right. No bottom border; content scroll reveals a 1px `line` only after scrolling (optional).

**Tab bar**: height 56 + safe area, `bg` fill, 1px `line` top border, 5 tabs, icons 24 stroke 1.75, label `tab`. Inactive `muted`; active label `ink` + icon `accentText` + **4px `accent` dot under the label** (v2, so active state isn't colour-only). **Custom glyphs (v2):** Journey = sprout, You = growth rings; Learn/Practice/Play stay Lucide.

**Feedback**: superseded by the **vine reveal**, §10.2.

## 7. Icons

Lucide (already installed, per-icon imports) plus 3 custom SVG glyphs in the same 24-grid / 1.75 stroke: `sprout` (Journey tab), `rings` (You tab), `sprig` (streak, replaces the flame). Keep them in `components/icons.ts` as `react-native-svg` components. Stroke **1.75** everywhere, 2.5 only for the ✓ inside a filled circle. Sizes 16 inline, 20 rows, 24 bar/header. Icons are `accentText` inside `soft` circles, otherwise `ink`/`muted`. Never put icons in square tiles.

## 8. Motion (react-native-reanimated, already installed)

- Screen content: fade + 8px rise, 240ms `Easing.out(Easing.cubic)`, stagger 40ms, max 4 groups. Respect `ReduceMotion.System`.
- Option select: border/badge colour 120ms; press scale .98 spring (damping 20, stiffness 300).
- Submit → feedback: verdict circle scales 0.6→1 spring + `Haptics.notificationAsync(Success|Error)`; explanation fades in 200ms after 120ms delay.
- Progress segments fill 300ms ease-out. Readiness number counts up 600ms on first view only.
- No confetti, no bounce loops, nothing longer than 600ms (except the vine draw, 520ms + leaf stagger, still under 900ms total). Calm.
- v2 motion signatures: see §10.6.

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
- Sizes: **Today 104** (`k .24`, `r0 13`, gap 3, **monochrome `accent`**, pith dot `r0×.32`) — shape only, the number sits beside it. **You 172** (`k .36`, `r0 34`, gap 4.2, domain tones, no pith, `70%` `stat` 30 inside + "ready" caption) with a legend listing domains outside-in, numbers in Fraunces 17. **Clearing mini 48** on forest (`sap` on `forestTrack`). **Results 200** same as You.
- **Exam-ready panel** (Phase 5b, on forest): the rings use `sap` on `forestTrack`, like the clearing mini; its text column keeps `maxWidth: 250` beside them so it never runs under the frond art.
- Component: `<GrowthRings size mastery={number[]} weights={number[]} tone="domains"|"mono"|"sap" />`, paths `useMemo`'d. Accessibility: `accessibilityRole="image"`, label "Readiness 70 percent. IS Audit 88, IT Governance 63, …".
- Motion: on first view per day, arcs grow from 0 to value over 600ms `Easing.out(cubic)`, outer ring first, 60ms stagger (animate `strokeDashoffset` via reanimated `useAnimatedProps`; pre-compute each arc's length). Reduce motion → static.

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
5. **Source row**: hairline, `meta` "Code d4_250 · COBIT DSS01" left, `Report an issue` ghost right.
6. Sticky footer "Next question →". **Scroll content gets `paddingBottom = footerHeight + 24`** so the last node never sits under the fade.
- Motion: verdict leaf scales .6→1 (spring damping 16, stiffness 260) + `notificationAsync(Success|Error)`; answer rows fade-rise 200ms; when the vine scrolls into view the stem **draws downward** 520ms (`scaleY` from top, origin top) and each leaf pops (scale .4→1, 160ms) as the stem reaches it, with `Haptics.selectionAsync()` on the Key idea leaf only. Reduce motion → all static, haptic kept.

### 10.3 Botanical line art
- One drawing style: single 1.5pt stroke, round caps/joins, no fills (except leaf marks), leaves = quadratic "lens" shapes with a midrib, arranged along one quadratic-bezier stem. Generator `frond({p0,p1,pc,n,len,wid,ang,alt,taper})` (≈25 lines, see mockup script) emits one SVG path; seeds are fixed per placement so art never changes between renders.
- Placements: Today panel = upright frond (9 pairs); Practice panel = shorter frond; Learn "Up next" cover = alternate-leaf branch (lesson covers; one variant per domain by changing `alt`/`ang`/`taper` — 5 presets, no images); clearing card = tall frond; empty states = seedling (stem, 2 cotyledons, 1 true leaf, 3 fading soil lines) at 170×176 in `accent`.
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
| Plan item done | leaf mark in panel fills (scale .6→1 + colour 200ms) | `impactAsync(Light)` |
| Clearing | panel fades in, mini ring grows +delta, stats count up 600ms | `notificationAsync(Success)` once per day |
All behind `ReduceMotion.System`; haptics respect the Settings toggle.

### 10.7 Large-text reflow rules (new, required)
- `PixelRatio.getFontScale() ≥ 1.3` → readiness row stacks (rings above number); hero title drops `maxWidth`; stat row on You goes 1-up (vertical list); chips and segmented control wrap instead of scrolling.
- `≥ 1.6` → option badge grows with its letter (`30 × min(scale,1.6)`), sticky footer stays but the question is a plain scroll (stem first, options after); question meta wraps onto 2 lines (allowed).
- Every fixed `height` on a control becomes `minHeight` (pill 48, button 56, chip 40, seg 40).

---

## 11. Component recipes for the extra screens (v2)

**Daily clearing card** (Today, when all plan items are done; replaces "Well done.")
- `forest` panel, tall frond art. Caption "Today's clearing" + 3 filled `sap` leaf marks. `hero` "Three of three, done." (count-aware: "Two of two, done.").
- Stat row of 3 (`stat` 30 `onForest` + Figtree 13 `onForest2`): questions, % correct, minutes, separated by 1px `forestTrack` verticals.
- Hairline `forestTrack`, then mini rings 48 (`sap`) + italic "Readiness grew to 72%" + `meta` "IS Operations ring +4" (biggest mover). If readiness fell or held, say "Readiness holding at 70%" — never a negative framing.
- Below the panel: `Tomorrow` section (headline + "about 15 min") with the next 2 plan items as non-tappable preview rows, then ghost "Keep going anyway".

**Today (in progress)**: meta row (weekday · days to exam | sprig streak in Fraunces 20 `clay`) → `display` → forest panel "Start here" with 3 leaf marks for the plan (filled = done, current outline) → readiness row (rings 104 mono + `number` + `meta` "ready, weighted by the blueprint" + italic `stage` "Stage 3 · Make it stick") → "Also today" list with real, unshortened titles (2 lines allowed).

**Question**: v1 recipe plus: progress segments `gap 3`, current segment `ink2`; meta "● IS Operations · Job scheduling · 4 of 10" (domain dot in tone, subtopic shortened to ≤ 3 words); `stem` steps down to 20/29 above 200 chars; option text line-height 1.42; scroll `paddingBottom` = footer + 24.

**Learn**: `display` + `meta` subtitle → forest "Up next" lesson cover (caption with domain dot + domain short name, `hero` full lesson title up to 3 lines, `meta` "3 min · 7 scenes", pill "Start lesson", domain branch art) → "By domain" headline + "1 of 5 done" → rows: Fraunces 22 `ink2` order numeral (lead 40), `label` title (2 lines OK), `meta` with domain dot + short name + state; trailing status 28 circle: done = `accent` fill + `bg` ✓, available = 1.5 `control` outline + play 12, locked = lock 16 `muted` and row text `muted`. "More lessons are on the way." as a final `meta` line, not a per-domain card.

**Practice**: `display` + subtitle → forest "Quick 10" (hero "Ten mixed questions") → list rows Spaced review (trailing Fraunces 22 count + "due") and Weak area → "Build a set": domain chips (scroll, right-edge fade mask 15%) → **serif segmented control** (`soft` track radius 22, 3pt inset, selected segment `raised` + shadow (dark `#2C372F`) **plus a 1.5px `ink` outline** (selected = ink; fill alone was ~1.1:1, failing WCAG 1.4.11; idle segments carry a transparent 1.5px border so nothing shifts), Fraunces 20 numeral + Figtree 13 "questions") → difficulty chips → secondary button "Start 10 questions" → "Mock exams" rows with a lead serif numeral (50 / 150) + `meta` unit.

**You**: `display` → rings 172 + legend (outer → inner, matching the visual) → one `meta` line explaining the rings → stat row (3 columns, hairline top/bottom and between, `stat` 34; streak numeral in `clay`) → "Study tools" rows with serif trailing counts → By domain bars removed (the rings + legend replace them) → mocks list.

**Empty state** (Mistake journal, Saved, Spaced review "all caught up", No mocks): pushed header → seedling art 170 in `accent`, 46 from header → `hero` centred one-line title ("Nothing open right now") → `body` `ink2` centred, ≤ 2 lines → optional teaching tags (non-interactive `soft` tags with a 6pt `clay` dot showing the trap types that will appear) → sticky primary action + ghost secondary. Copy is factual and forward-looking; no "Yay!".

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
Tagline "Master Modern Risk." · line "Grow your judgement, one ring at a time."
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
