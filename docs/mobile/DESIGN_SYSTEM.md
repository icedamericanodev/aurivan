# Aurivan mobile design system: "Forest" (locked 2026-10-06)

The maintainer chose **forest**: calm, clean, a place to study at your own pace.
One theme in light and dark, one font, and one set of components, so the app
feels like one app. This file is the source of truth for `mobile/`. Code that
disagrees with it is a bug.

## Palette

`teal` is renamed `clay`, `navy` is renamed `ink`, and `borderStrong` is new
(for interactive outlines).

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #F4F6F2 | #0F1512 | screen background |
| surface | #FFFFFF | #161E1A | cards, options |
| surface2 | #E9EFEA | #1D2722 | icon tiles, pressed state, pills |
| border | #D3DDD6 | #2B3730 | decorative borders |
| borderStrong | #7C8D82 | #5E7064 | control outlines (secondary button, chips) |
| text | #15201A | #ECF3EE | primary text; also the "selected" ink |
| text2 | #3E5246 | #AFC1B6 | secondary text, eyebrows |
| muted | #5A6B60 | #8D9E93 | tertiary text, dimmed options |
| accent | #2F7A55 | #4FA57B | bars, rings, focus, emphasis border (never small text) |
| accentText | #22603F | #86D0A8 | green text and links |
| accentFill | #22603F | #2A6E4C | primary button fill (white text) |
| onAccent | #FFFFFF | #FFFFFF | text on accentFill |
| clay | #C0703F | #E0915E | warm secondary: streak, stage bar |
| clayText | #8E4A22 | #EBA97C | warm text |
| correct / correctBg | #1C6E46 / #DDF1E3 | #74D69E / #13321F | answer feedback only |
| wrong / wrongBg | #A8323E / #FBE4E5 | #FF9CA6 / #3B1519 | answer feedback only |
| warning / warningBg | #7F5300 / #FAEFD3 | #F0C566 / #33290D | traps, tips |
| ink | #15201A | #0F1512 | glyphs on clay/correct fills |

All text pairs pass WCAG AA in both modes. The weakest is muted on surface2:
4.86 in light, 5.45 in dark.

**Domain tones** (dots, bars and ring segments only, never text). Domains
store a `tone` index 0–4, never a hex value. Certifications with more than
5 domains reuse the 5 tones, drawn as hollow dots.

| Tone | Light | Dark |
|---|---|---|
| 0 Lake | #3F7F96 | #72B4CB |
| 1 Moss | #4E8A3E | #8CC474 |
| 2 Ochre | #B0802C | #DDB066 |
| 3 Heather | #86689C | #B99DCD |
| 4 Slate | #5E7482 | #9AAFBB |

**Green never means "selected".** Selected-but-unsubmitted uses **ink**: a 2px
`text` border and a `text`-filled badge with a `surface` letter. Correct is a
`correctBg` card with ✓. Wrong is `wrongBg` with ✗. Dimmed options use `muted`
text with no opacity. Brand green appears only as solid buttons, bars and
rings, never as a tinted card.

## Typography

One family: **Plus Jakarta Sans**, weights 400 / 600 / 700. JetBrains Mono and
weight 500 are removed.

| Variant | Size | Weight | Line | Tracking | Case | Use |
|---|---|---|---|---|---|---|
| display | 32 | 700 | 38 | −0.5 | Sentence | screen titles, lesson titles, big stats |
| title | 20 | 600 | 28 | −0.2 | Sentence | question stems, card titles, section headers |
| body | 16 | 400 | 24 | 0 | Sentence | reading text: options, explanations, tips |
| label | 16 | 600 | 22 | 0 | Sentence | row titles, buttons, chips, option letters |
| meta | 14 | 400 | 20 | 0 | Sentence | subtitles, secondary lines, captions, counts |
| eyebrow | 13 | 600 | 18 | +0.6 | UPPER | max one per card, above a title |

- Eyebrows are always `text2`. The exceptions are tip/trap labels (`warning`) and Correct/Wrong (status colours).
- Section headers use `title`, never eyebrow. Pills use sentence case.
- Numbers (%, stats, counters, timers, "1/3") use tabular figures via `<T num>`.
- **No `fontSize`, `lineHeight`, `fontFamily` or hex colour in any style outside `components/ui.tsx` and `theme/`.** ESLint enforces this.

## Shape and space

- **Spacing:** 4, 8, 12, 16, 24, 32, 48. Gutter 16, card padding 16, gap between cards 12, gap between sections 32.
- **Radius:**
  - sm 8: badges, scenario, progress
  - md 12: options, buttons, icon tiles
  - lg 16: cards
  - pill: chips, pills, circles
- **Cards:** surface, 1px border, radius lg, no shadow. A pressed card fills with surface2. An emphasis card has a 1px accent border.
- **Buttons:** minHeight 52, radius md, `label` text.
  - primary: accentFill + white
  - secondary: surface + borderStrong + text
  - ghost: accentText
  - danger: wrongBg + wrong
  - disabled: surface2 + muted
- **Chips:** pill, minHeight 44 (hit area 48), `meta` 600. Idle is surface + borderStrong. Selected is ink fill + surface label + ✓. Practice filters sit in one horizontal row per facet.
- **Icons:** Lucide, stroke 1.75. Sizes are 16 (inline), 20 (rows and tiles) and 24 (tab bar and header). Icon tiles are 40×40, surface2, radius md.

## Voice

1. One line under a title, at most 8 words, or none.
2. Lead with the verb or the number ("Review 20").
3. Say each fact once per screen.
4. No em-dash asides.
5. Sentence case everywhere. UPPERCASE only for eyebrows and exam keywords (FIRST, BEST).

Dates are formatted as "6 Oct".
