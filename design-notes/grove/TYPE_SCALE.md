# KaiSip type scale: one scale for web and phone

Status: the design lead's decision, 4 Nov 2026, from four audits of `index.html`
(feature/grove-ui at 20948e4) and `mobile/` (origin/grove-phone-p1 at de80d18).
Sky asked for "the font style and font size consistent across the entire app".
This file is the type source of truth for both builds. Where it differs from
`docs/mobile/DESIGN_SYSTEM.md` §1, §2, §10.4 and §21.3, or from a size written
in `DECISIONS.md` (for example the 32px range in decision 9), this file wins; fold
it into §2 when the first fix lands.

Revised 4 Nov 2026 after the type-scale review (web and phone). Where two
review changes conflicted, the more accessible one was kept: `title` stops
growing at 1.6x on both builds (not 1.3x), so it stays above `headline` and
`body` and below `hero` at 200% text; `num.value` keeps 1.3x.

Presentation only. No change to maths, scoring, readiness wording ("a study
estimate"), content, `data-l` or the letter mapping, or saved keys (`cisa_*`,
`aurivan_*`, `aurivan.*.v1`, `cisaMindsetExport`). Both themes use the same
type; light and dark change colour only. No new fonts: the six self-hosted
files stay (Fraunces 400, 400 italic, 500; Figtree 400, 500, 600), so the CSP
and font loading do not change.

The short version:

- **15 text roles on 11 word sizes** (section 1). Every word on screen uses one of them.
- **5 numeral steps** (section 2). Every serif number uses one of them.
- A handful of **allowed exceptions** (section 5), for charts, figures, the
  logo, widgets and the share image.
- On the web every size is in **rem**; on the phone in **pt** with the system
  font scale on.

---

## 1. The roles

Sizes run on one step scale: **11, 13, 14, 15, 16, 17, 18, 21, 22, 28, 36**
for words, plus **20, 22, 30, 38, 52** for serif numerals. Web rem assumes a
16px root. Phone pt equals web px. Line-heights are given as px at 1x; the web
uses rem (or the ratio in the token) so they grow with the text. Tracking is
given in px / pt here; the web writes the same tracking in em (section 3) so
it grows with the text, and the phone keeps pt.

| # | Role | Family, weight | Web size / line (rem, px) | Phone pt / line | Tracking | Case | Used for |
|---|---|---|---|---|---|---|---|
| 1 | `display` | Fraunces 500 | 2.25rem / 2.625rem (36 / 42) | 36 / 42 | -0.6px | Sentence | The one title of every full page: Today greeting, Learn, Practice, You (the name, or "You"), Study notes, Glossary, Principles, About the CISA exam, Final review week, Mock exam, Saved, Weak spots, Your progress, Settings (web page), About, FAQ and Help, onboarding, pushed list and account pages on the phone |
| 2 | `hero` | Fraunces 500 | 1.75rem / 2.125rem (28 / 34) | 28 / 34 | -0.4px | Sentence | Sheet and dialog titles; reading-page titles (a note, subtopic, principle, lesson, exam-guide section, exam-week day); panel titles; the verdict ("Correct" / "Not quite"); the mock result line; the clearing line ("One of one, done.") |
| 3 | `title` | Fraunces 500 | 1.375rem / 1.625rem (22 / 26) | 22 / 26 | -0.3px | Sentence | Card titles on Today ("Today's plan", "This week's twig", "If you have more time", "Save a backup"); a sheet's name (badge, plant); a label row's value in words; page-level empty-state headings (Saved, Weak spots) |
| 4 | `stem` | Fraunces 400 | 1.3125rem / 1.875rem (21 / 30); long stem 1.25rem / 1.8125rem (20 / 29) | 21 / 30; long 20 / 29 | -0.1px | As written (exam keywords FIRST, BEST stay caps) | Question stems (long step when the stem is over 200 characters, both builds); lesson scene prose; a note's "In one line" |
| 5 | `quote` | Fraunces 400 italic (coach); Fraunces 400 roman as `read` | 1.125rem / 1.625rem (18 / 26) | 18 / 26 | 0 | Sentence | Italic: key idea, a principle's quote, the stage line, the welcome subline. Roman (`read`): a question read in place (Today's Mindset check), the You status sentence |
| 6 | `aside` | Fraunces 400 italic | 1rem / 1.375rem (16 / 22) | 16 / 22 | 0 | Sentence | The verdict's coach line, italic sublines, key-list and plan-step numbers ("Why not B" is a `caption` over its note in `small` since Phase 4, PHASE4.md 4.2), the "grew to" line. Not for labels or units under a stat: those are `meta` (section 2.1, DESIGN_SYSTEM §10.4); a stat's value in words is `title` (rows 207 and 59c) |
| 7 | `headline` | Figtree 600 | 1.0625rem / 1.5rem (17 / 24) | 17 / 24 | -0.1px | Sentence | Section heads on every page that is not a tab home or a list (see rule R4) |
| 8 | `button` | Figtree 600 | 1.0625rem / 1.375rem (17 / 22) | 17 / 22 | 0 | Sentence | Solid buttons: primary, secondary, danger ("Check answer", "Next question", "Start fresh") |
| 9 | `label` | Figtree 600 | 1rem / 1.375rem (16 / 22) | 16 / 22 | 0 | Sentence | Row and list titles, menu items, sidebar section links, plate (forest) buttons and ghost or text buttons, toasts, the pushed-screen bar title |
| 10 | `chip` | Figtree 600 | 0.9375rem / 1.25rem (15 / 20) | 15 / 20 | 0 | Sentence | Chips, pills that are buttons, segmented controls, confidence buttons, jump links in a row of links |
| 11 | `body` | Figtree 400 | 1rem / 1.5rem (16 / 24) | 16 / 24 | 0 | Sentence | All running text: explanations, note paragraphs, answer options, FAQ answers, glossary definitions, dialog text, settings notes longer than one line |
| 12 | `small` | Figtree 400 | 0.9375rem / 1.375rem (15 / 22) | 15 / 22 | 0 | Sentence | Short secondary notes of one to three sentences: tips, wrong-answer notes, the consent text, an empty state's line |
| 13 | `meta` | Figtree 500 | 0.875rem / 1.25rem (14 / 20) | 14 / 20 | 0 | Sentence | Row subtitles, counts, units beside numbers ("of 20", "to", "min"), legal and trademark lines, standalone text links (a link inside running text inherits its parent's role and size), sub-page links in the sidebar |
| 14 | `caption` | Figtree 600 | 0.8125rem / 1.125rem (13 / 18) | 13 / 18 | +0.1px | **Sentence** | Small labels over content ("Key idea", "Best answer", "Eliminate", "Read next"), form labels, the keyboard hint |
| 15 | `kicker` / `tab` | Figtree 600 | 0.6875rem / 0.875rem (11 / 14) | 11 / 14 | kicker +1px; tab 0 | kicker **UPPERCASE**; tab sentence | Kicker: running heads, chart keys, section heads on tab homes and lists ("MOCK EXAMS", "TODAY'S PRINCIPLE"). Tab: the bottom-bar words only |

Rows 7 and 8 share size and weight; `button` is `headline` with a single-line
box and no tracking. Row 15's two names share one metric. So words use 11
sizes (11, 13, 14, 15, 16, 17, 18, 21, 22, 28, 36) plus the long stem's 20,
in 15 roles, against about 90 styles drawn on the web today and 52 named on
the phone.

### Rules that go with the roles

- **R1 Family.** If you tap it or scan it, it is Figtree. If you sit and read
  it, or it is the one big thing on the screen, it is Fraunces.
- **R2 Weights.** Figtree 400, 500, 600 only. Figtree 700 is not loaded (the
  browser draws it from the 600 file): every 700 becomes 600. Fraunces 400,
  400 italic and 500 only. Never a synthesised italic: Figtree has no italic
  file, so a Figtree line in italic becomes roman, or `aside` if it is the
  coach's voice.
- **R3 Titles by container.** One `display` per full page; at most one `hero`
  per view. A sheet or dialog title is always `hero`. A reading page (its
  title is a topic name that can run three lines) is `hero`. The Today
  greeting is `display`; it steps to `hero` only when the name would make it
  wrap to a third line, or under 360px / 360pt width, on both builds. Web: the
  width step is an `em` query (22.5em, section 6). Phone (home.tsx:738, row
  184a): `onTextLayout` with `lines.length > 2`, or
  `useWindowDimensions().width < 360`, switches `v` to `hero`. Keep
  `numberOfLines={4}` only as a safety stop, never as the way a long name is
  handled.
- **R4 Section heads.** On the four tab homes (Today, Learn, Practice, You)
  and their list screens (Study notes list, an area's list, the drills list),
  a section head is `kicker`. The Practice rail counts as part of the
  Practice tab home. Everywhere else (reading pages, pushed pages,
  Settings, results, sheets) it is `headline`. A card on Today has an
  optional `kicker` over a `title`. Never Fraunces for a section head, and
  never a heading smaller than 17px except a `kicker` or a figure caption
  (`fig`, section 5): a count or time next to a heading ("About 12 min") is
  `meta` beside the heading, outside the `h2`.
- **R5 Rows.** Every row is `label` over `meta`, on both builds (DESIGN_SYSTEM
  §2 and the phone's ListRow win over the kit's denser 15 / 13 / 12). One meta
  line per row.
- **R6 Buttons.** Solid buttons `button` 17/22. Plate (forest) buttons, ghost
  buttons and text buttons `label` 16/22, as on the phone. Never Fraunces on a
  button.
- **R7 Case.** Sentence case everywhere. Uppercase is the `kicker` only (with
  its 1px tracking) and exam keywords inside stems. This overrides
  DESIGN_SYSTEM §2 "No uppercase eyebrows anywhere" for the `kicker`. Caps come
  only from CSS `text-transform` (on the phone, the style's `textTransform`);
  source text stays sentence case, so screen readers and copy-paste get normal
  words. Typed caps (for example the "LATEST" badge, row 37b) become sentence
  case.
- **R8 Options.** Answer options are `body` 16/24 (the old 16/23 joins body).
  On the answer screen only, your pick may be Figtree 500 and the best answer
  Figtree 600 at the same size and line (16/24; `role.optionPick` and
  `role.optionBest` on the phone, section 3), always beside their words ("Your answer",
  "Best answer") and the icon, never weight or colour alone.

---

## 2. Number rules

### 2.1 Which numbers are Fraunces

Every number a learner reads as a result or a measure is a Fraunces 500
numeral on one of five steps. Line-height is the size x 1.08, rounded, for
`num.range`, `num.stat` and `num.inline`, so the phone's `serifNumeral()` and
the web agree; `num.score` is 1.0 (52/52) and `num.value` matches `title`
(22/26).

| Step | Size / line | Tracking | Web rem | Used for |
|---|---|---|---|---|
| `num.score` | 52 / 52 | -1.4px | 3.25rem / 3.25rem | The one big score: results score, Practice summary score, filter and domain complete scores, the share card, a game round score |
| `num.range` | 38 / 41 | -0.6px | 2.375rem / 2.5625rem | The readiness range "63 to 73" on Today (both widths, both builds), the readiness report and the scale bar's number |
| `num.stat` | 30 / 32 | -0.6px | 1.875rem / 2rem | Stat rows: You's Answered / Correct / Accuracy, results stats, the clearing card's stats, the Practice summary stats |
| `num.value` | 22 / 26 | -0.3px | 1.375rem / 1.625rem | Tile numbers, the ring's centre number, inline counts in a card ("59 due"); same metric as `title` |
| `num.inline` | 20 / 22 | -0.3px | 1.25rem / 1.375rem | A number inside a row or list: an area's %, a domain %, list counts, "#3" |

- Retired: 17, 24, 26 and 34 as numeral sizes; the `stat` 34/34 type; the
  64px and 72px scores; numerals at 14 to 17px. Each maps to a step above
  (section 4).
- The range steps down only when space runs out (font scale 1.3 and up, or
  under 360px / 360pt): 38, then 30, then 22. Never one number, never a dash
  between the ends: "63 to 73", and the words "a study estimate" stay.
- **Raised %**: Fraunces 500 at 0.48 of its numeral, never under 11px / 11pt
  (`percentSup(Math.max(size, 23))` on the phone, `max(0.48em, 0.6875rem)` on
  the web). The % is also in the accessible name ("72 percent").
- **"to" and units** beside or under a serif numeral, and a stat's label
  under its number, are Figtree `meta` (not Fraunces at 15, and not `aside`).
- Small values a learner scans in a list, a counter or a timer are Figtree,
  not Fraunces: "1 of 3", "12 / 20", the mock timer, "too few yet" in a list
  or row. A tile's or stat's value in words ("Too few yet" on a tile) is
  `title` (rows 52, 207, 59c).

### 2.2 Tabular figures

- **Figtree** has tabular figures (`tnum`). Turn them on for counters, timers,
  "N of M", %, dates in tables, and every Figtree value in a column:
  `font-variant-numeric: tabular-nums` on the web, `fontVariant:
  ['tabular-nums']` (the `num` prop on `T`) on the phone.
- **Fraunces** as shipped has no tabular figures (the static 500 file has no
  `tnum` feature; checked in `@expo-google-fonts/fraunces`). Do not rely on
  `tabular-nums` to line serif numbers up: give a column of them a fixed
  min-width and right-align it. Fraunces numerals are lining by default.
- On the web, `font:` resets `font-variant-numeric`. So the body-level
  `tabular-nums` (index.html:4443) goes, prose keeps proportional figures, and
  each number class sets `font-variant-numeric` **after** its `font:`
  declaration. A `.tnum` utility class is fine.
- In the same commit that removes the body-level `tabular-nums`, set it
  explicitly on every Figtree number spot that has tabular figures only
  through inheritance today, so none loses them: the legacy 13px number nodes
  in Glossary and the Practice summary, `.gloss-progress-pct`, the Practice
  summary counts, and the mock-confirm "50" (row 59i). Add it to the counters
  that have none today: `.pg-cn` (5460) and `.fg-sb-t` (5545), with the rest
  of row 147.

---

## 3. Names: web tokens and phone constants

Both builds use names, never literal sizes. The names match so a reviewer can
read one against the other. One tracking name per step.

| Role | Web (CSS custom properties, `:root`) | Phone constant (and its text-size limit) |
|---|---|---|
| display | `--t-display`, `--tr-display` | `type.display` (1.3) |
| hero | `--t-hero`, `--tr-hero` | `type.hero` (1.3) |
| title | `--t-title` (new; `--t-fg-value` becomes its alias), `--tr-title` | `role.title` (style `fieldType.value`, limit 1.6) |
| stem | `--t-stem`, `--t-stem-long` (new), `--tr-stem` (new) | `type.stem`, `stemLong` (2.0) |
| quote / read | `--t-quote`, `--t-read` | `type.quote`; `role.read` (new literal style, roman 18/26, 2.0) |
| aside | `--t-aside` (new; `--t-fg-sub` and `--t-fg-keyno` become aliases) | `role.aside` (style `fieldType.sub`, 2.0) |
| headline | `--t-headline`, `--tr-headline` (new) | `type.headline` (2.0) |
| button | `--t-button` (new) | `role.button` (was the inline `buttonLabel`, 2.0) |
| label | `--t-label` | `type.label` (2.0) |
| chip | `--t-chip` (new) | `role.chip` (was the inline `chipLabel`, 2.0) |
| body | `--t-body` | `type.body` (2.0) |
| small | `--t-small` | `type.small` (2.0) |
| meta | `--t-meta` | `type.meta` (2.0) |
| caption | `--t-caption`, `--tr-caption` (new) | `type.caption` (2.0) |
| kicker / tab | `--t-kicker` (new; `--t-fg-head` alias), `--tr-kicker`; `--t-tab` | `fieldType.head` (2.0), `type.tab` (1.2) |
| answer pick / best | `--t-body` with weight 500 / 600 | `role.optionPick` (Figtree 500 16/24), `role.optionBest` (Figtree 600 16/24), new literal styles (2.0) |
| option letter | `--t-badge` (E4) | `role.badgeLetter` (Figtree 600 14/18, 2.0, E4) |
| num.score | `--t-num-score` (`--t-number` alias), `--tr-num-score` | `role.numScore` (style `type.number`, 1.3) |
| num.range | `--t-num-range`, `--tr-num-range` | `role.numRange` (style `serifNumeral(38)`, 1.3) |
| num.stat | `--t-num-stat`, `--tr-num-stat` | `role.numStat` (style `serifNumeral(30)`, 1.3) |
| num.value | `--t-num-value` (own cap, same metric as `--t-title`), `--tr-num-value` | `role.numValue` (style `fieldType.value`, 1.3) |
| num.inline | `--t-num-inline`, `--tr-num-inline` | `role.numInline` (style `serifNumeral(20)`, 1.3) |
| % sign | `--t-num-sup` (a font-size, not a shorthand) | `percentSup()` with the 11pt floor |

Web token values (all in rem, tracking in em). The large roles cap growth
under a larger browser text setting, like the phone's
`maxFontSizeMultiplier`: display, hero and every numeral step at 1.3x of
their px size, `title` at 1.6x. Browser zoom still scales them fully.

```css
--t-display:    500 min(2.25rem, 46.8px)/1.1667 var(--f-serif);  --tr-display:    -0.0167em;
--t-hero:       500 min(1.75rem, 36.4px)/1.2143 var(--f-serif);  --tr-hero:       -0.0143em;
--t-title:      500 min(1.375rem, 35.2px)/1.1818 var(--f-serif); --tr-title:      -0.0136em;
--t-stem:       400 1.3125rem/1.875rem var(--f-serif);           --tr-stem:       -0.0048em;
--t-stem-long:  400 1.25rem/1.8125rem var(--f-serif);
--t-quote:      italic 400 1.125rem/1.625rem var(--f-serif);
--t-read:       400 1.125rem/1.625rem var(--f-serif);
--t-aside:      italic 400 1rem/1.375rem var(--f-serif);
--t-headline:   600 1.0625rem/1.5rem var(--f-sans);              --tr-headline:   -0.0059em;
--t-button:     600 1.0625rem/1.375rem var(--f-sans);
--t-label:      600 1rem/1.375rem var(--f-sans);
--t-chip:       600 0.9375rem/1.25rem var(--f-sans);
--t-body:       400 1rem/1.5rem var(--f-sans);
--t-small:      400 0.9375rem/1.375rem var(--f-sans);
--t-meta:       500 0.875rem/1.25rem var(--f-sans);
--t-caption:    600 0.8125rem/1.125rem var(--f-sans);            --tr-caption:     0.0077em;
--t-kicker:     600 0.6875rem/0.875rem var(--f-sans);            --tr-kicker:      0.0909em;
--t-tab:        600 0.6875rem/0.875rem var(--f-sans);
--t-badge:      600 0.875rem/1.125rem var(--f-sans);
--t-num-score:  500 min(3.25rem, 67.6px)/1 var(--f-serif);       --tr-num-score:  -0.0269em;
--t-num-range:  500 min(2.375rem, 49.4px)/1.0789 var(--f-serif); --tr-num-range:  -0.0158em;
--t-num-stat:   500 min(1.875rem, 39px)/1.0667 var(--f-serif);   --tr-num-stat:   -0.02em;
--t-num-value:  500 min(1.375rem, 28.6px)/1.1818 var(--f-serif); --tr-num-value:  -0.0136em;
--t-num-inline: 500 min(1.25rem, 26px)/1.1 var(--f-serif);       --tr-num-inline: -0.015em;
--t-num-sup:    max(0.48em, 0.6875rem);  /* font-size only */

/* E1 chart and figure values (section 5) */
--t-fg-tiny:    500 0.6875rem/0.875rem var(--f-sans);
--t-fg-small:   500 0.75rem/1rem var(--f-sans);
--t-fg-label:   500 0.8125rem/1.0625rem var(--f-sans);
--t-fg-name:    600 0.8125rem/1.0625rem var(--f-sans);
--t-fg-chart:   500 1.125rem/1.375rem var(--f-serif);
--t-fg-figsm:   italic 400 0.75rem/1rem var(--f-serif);
--t-fig:        italic 400 0.875rem/1.25rem var(--f-serif);

/* Aliases (old names kept while their callers move) */
--t-number:   var(--t-num-score);
--t-stage:    var(--t-quote);
--t-fg-value: var(--t-title);
--t-fg-sub:   var(--t-aside);
--t-fg-keyno: var(--t-aside);
--t-fg-head:  var(--t-kicker);
--t-fg-fig:   var(--t-fig);
```

Tracking in em keeps its designed proportion at every text size (a 1px
kicker tracking would be half its spacing at 200%). The phone keeps the pt
values in section 1.

**Phone: one `role` map.** The text-size limit on the phone comes from the
variant key, not the style: `T` uses `maxScale[v]` (ui.tsx:350) and
`FieldText` uses `fieldMaxScale[v]` (FieldText.tsx:38), and `TypeVariant`
lives in the bundled `tokens.ts`. A plain style object would end up as a raw
`<Text>` with a hand-set `maxFontSizeMultiplier`, the drift this file exists
to stop. So `mobile/src/theme/grove.ts` exports one map that carries both:

```ts
export const role = {
  read:        { style: { /* Fraunces 400 roman 18/26 */ }, max: 2 },
  title:       { style: fieldType.value, max: 1.6 },
  aside:       { style: fieldType.sub, max: 2 },
  button:      { style: { /* Figtree 600 17/22 */ }, max: 2 },
  chip:        { style: { /* Figtree 600 15/20 */ }, max: 2 },
  optionPick:  { style: { /* Figtree 500 16/24 */ }, max: 2 },
  optionBest:  { style: { /* Figtree 600 16/24 */ }, max: 2 },
  badgeLetter: { style: { /* Figtree 600 14/18 */ }, max: 2 },
  numScore:    { style: type.number, max: 1.3 },
  numRange:    { style: serifNumeral(38), max: 1.3 },
  numStat:     { style: serifNumeral(30), max: 1.3 },
  numValue:    { style: fieldType.value, max: 1.3 },
  numInline:   { style: serifNumeral(20), max: 1.3 },
} as const;
```

Then widen `T` in `ui.tsx` (not bundled): `v?: TypeVariant | keyof typeof
role`, take the style from `type[v] ?? role[v].style` and the limit from
`maxFontSizeMultiplier ?? (maxScale[v] ?? role[v].max)`. One namespace
(`role`), not three.

The `role` entries are aliases of `theme/tokens.ts` values, plus new literal
styles in `grove.ts` for `read`, `optionPick`, `optionBest`, `button`,
`chip` and `badgeLetter` (bundled `tokens.ts` has no 18/26 roman read, and
`fieldType.option` and `best` are 16/22 at tokens.ts:1050-1051). `grove.ts`
is not bundled into the web's `assets/kaisip-plant.js` or `kaisip-cloud.js`
(on de80d18 both list only `src/theme/tokens.ts` and
`src/engine/games/fieldGuide.ts` from the app), so this round needs no bundle
rebuild and no `?v=` bump. Nothing under `engine/`, `components/plant/`,
`cloud/`, `webcloud/` or `lib/syncCore` imports `theme/grove.ts` or
`components/ui.tsx`; the source-hash check in `verify_repo.sh` §4b/§4c
catches a breach, but only after the fact. `tokens.ts` keeps its values; at
the next bundle rebuild retire `type.stat`, `type.stage`,
`fieldType.verdict`, `optionText`, `numeralUnit` and `statUnit` (their
callers move first, section 4).

Guards to add with the first fix:
- `mobile/eslint.config.js:13`: also ban `fontWeight`, `letterSpacing` and
  `fontStyle` outside `ui.tsx` and the theme (no current hits).
- `scripts/check_token_parity.py`: it reads only `mobile/src/theme/tokens.ts`,
  by regex on `export const X = {...}`, so it cannot resolve `grove.ts`
  aliases (`= fieldType.value`, `serifNumeral(38)`) or a web `min(2.25rem,
  46.8px)`, and `grove.ts` does not exist on feature/grove-ui. The type pairs
  are added only after the phone branch with `theme/grove.ts` is on main.
  The script then also reads `theme/grove.ts`, compares resolved size / line
  pairs (px = pt) and strips the `min()` cap; until then it reports the type
  pairs as skipped, not failed.
- A web check in `verify_repo.sh`, outside `:root`, the SVG chart classes and
  the documented exceptions: no `font-size` or `font:` with a px or a
  half-pixel size; no `font-size` inside a JS template-string `style=`
  (13 cases today, web-css.md §8); no `font-weight: 700`; no
  `font-style: italic` on `--f-sans`.

---

## 4. Mapping: every outlier and stray value to its role

Lines are `index.html` on feature/grove-ui at 20948e4 unless a file is named;
`mobile/src/` paths are on origin/grove-phone-p1 at de80d18. Where an audit
gave an approximate line, the selector names the rule. "Token" means replace
the literal with the role's token (no visual change).

### 4.1 Web: page, sheet and panel titles

| # | Where | Now | Role |
|---|---|---|---|
| 1 | `.td-title` Today greeting from 768px, index.html:7609, 7630 | Fraunces 500 34/1.05 then 40/42, -.02em | display (R3) |
| 2 | `.td-head .td-title` Today greeting under 768px, 7805, 7806 | 28/34; 22/26 under 360px or a long name | display; hero only for a long name or under 360px (R3) |
| 3 | `#pgTitle.td-title` Your progress, 7609 | 34/35.7 at 390, 40/42 at 1280 | display |
| 4 | `.ob-title` welcome, 6936, 6937 | 40/46, -0.8px | display |
| 5 | `.gt-title` under 600px, 5075 | 32/38 | display |
| 6 | `.you-prof-n` / `.you-title` You, 7281, 7505, 7560 | 30/34 rem, 34/38 from 1240px | display |
| 7 | `.set-head .you-title` Settings, 7505 | 30/34 rem | display |
| 8 | `.gloss-title` Glossary, FAQ and Help, 2762, 2807 | 26/28.6 and 28/30.8 | display |
| 9 | `.bk-panel-title` Saved, 1625 | 20/30 | display |
| 10 | `.ws-title` Weak spots, 1645 | Fraunces 20 | display |
| 11 | Literal display copies, 4748 (`.gt-title`), 5088, 6232 (`.ph-title`) | 36/42 written by hand | display (token) |
| 12 | `.cl-title` What's New, Your data, plant sheet, Feedback, 4722 | 22/33 | hero |
| 13 | `.summary-title` Practice summary, 3346 | 24/36 | hero |
| 14 | `.gloss-detail-title` term sheet, 3024 | 24/28.8 | hero |
| 15 | `.mock-confirm-head` exam date, mock confirm, 6988 | 28/34 | hero (token) |
| 16 | `#fbTitle` Feedback dialog | Figtree 13/19.5 | hero |
| 17 | You near-hero, 7449 | 28/30 rem | hero |
| 18 | `.you-prof-i` avatar initial, 5842 | `--t-hero` with line-height 1 | exception E3 (a glyph in a disc), keep |
| 19 | Literal hero copies, 4646 (`.verdict`), 4783 (`.gt-panel-title`) | 28/34 by hand | hero (token) |
| 20 | Legacy serif titles 2154, 2204, 3025, 4004 | Fraunces 24 to 26 | hero if live; delete if dead |
| 21 | `.brand-card-title` About, 4173, 4182, 4270 | 26 and 32/36.8 | hero |
| 22 | `.tipjar-title` About, 4301 | Fraunces 19/28.5 | headline |
| 23 | `.td-clear-s` "One of one, done.", 7769, 7901 | Figtree 600 15/20 at 390, Fraunces 26/32 at 1280 | hero at every width |
| 24 | `.td-hero-t` Today hero card, 5185 | 22/28 | title |
| 25 | `.ph-hero-t` Practice hero card, 6246 | 28/34 | hero (token) |

### 4.2 Web: section heads and card titles

| # | Where | Now | Role |
|---|---|---|---|
| 26 | `.you-card-h` You (Mock exams, Study tools, In more detail), 7326 | Fraunces 500 19/24 rem | kicker (R4, as phone you.tsx:490, 538, 546) |
| 27 | `.you-card-h` on Settings (General, Your data, Reset, Help and about), 7568 | Fraunces 500 19/24 rem | headline (R4) |
| 28 | `.td-card-h` Today ("If you have more time", "This week's twig"), 7600, 7603 | Fraunces 18/24, 19/24 from 768px | title (as phone groveToday.tsx:329, 361) |
| 29 | `.td-planc-t` "Today's plan", 7738, 7885 | Fraunces 18/24 at 390, caps 11/14 at 1280 | title at every width |
| 30 | `h2#tdBkH.plnt-invite-h` "Save a backup", 5205 | Figtree 600 15/20 | title |
| 31 | `.td-planc-h.td-resume-h`, 7741 | Fraunces 20/26 | title |
| 32 | `.ph-h` Practice hub and Mock hub heads, 6287 | headline | kicker (tab home, R4; phone practice.tsx:209, 364) |
| 33 | `.ph-h` on mock and set results, 6287, 6556 | headline | headline (no change) |
| 34 | `.sr-cap` "Today's principle" in the Practice rail (`#srhPrin`, `#phmPrin`), 6625 | caption 13 | kicker (same label as Today's `.td-card-k`) |
| 34a | `.sr-cap` h2 on reading and results pages: `#srhCheck`, `#srhToc`, `#srhLook` (note page); `#srhDeeper`, `#srhTerms`, `#srhMine` (answer screen and set results); `#srhSigns`, `#mrmSigns` (mock results) | caption 13 | headline (R4) |
| 34b | `.sr-cap` `#srhFocus`, `#phmFocus` in the Practice rail | caption 13 | kicker (the rail is part of the tab home, R4) |
| 35 | `.gt-cap` used as a section head on Learn lists, 2635, 2660 | caption | kicker |
| 35a | `.gt-cap` h2s on the principle page ("Rule", "Why it matters"); `h3.gt-cap.eg-sub` on the exam guide | caption | headline (reading pages, R4) |
| 35b | `#egTocH`, `#fwTocH` "On this page" | caption | headline |
| 36 | `.gt-part-h`, 4808 | Figtree 600 13/18 in an h3 | kicker |
| 37 | `.fw-day-n` Final review week, 2672 | caption in a heading | kicker |
| 37a | `span.gt-of` "of 7 read" inside an h4 | in the heading | meta, moved out of the heading (as 38, 39) |
| 37b | `.cl-ver-label .cl-latest` What's New "LATEST" badge, 3570 (string at 26567) | typed caps | caption 13/18, text "Latest" (R7) |
| 38 | `span.td-planc-min` "About 12 min" inside the h2, 7739, 7886 | 13/18 | meta, moved out of the heading |
| 39 | `span.gt-group-meta` inside an h3, 4891 | 14/20 | meta, moved out of the heading |
| 40 | `.ws-sub-label` Weak spots, 5685 | 600 15/20 | headline |
| 41 | `.fg-fig` h2 figure captions, 5175, 5517 | italic 15/20 at 390, 14/20 elsewhere | `fig` 14/20 at every width (exception E1) |
| 42 | `.you-fig` `#youAreasH`, 7329 | italic 16/21 rem | aside |
| 43 | Literal headline copies, 4541, 4548, 4550, 4660, 4723, 4890, 5698 | 17/24 by hand | headline (token) |

### 4.3 Web: rows, body and small text

| # | Where | Now | Role |
|---|---|---|---|
| 44 | `.you-card .you-t` / `.you-m` You and Settings rows, 7339, 7340 | 600 15/20 over 400 13/18 | label over meta (R5) |
| 45 | `.td-next .you-t` / `.you-m`, `.td-mind-open`, 7959, 7960 | 600 15/20 over 400 12/16 | label over meta |
| 46 | `.you-mocks .empty-state`, 7489, 7490 | 600 15/20 over 13/18 | label over meta (an empty row) |
| 47 | `.es-heading` / `.es-body` Saved and Weak spots empty states, 1776, 1783, 6372, 7488 | Fraunces 22/27.5 over 14/23.1 | title over small |
| 48 | `.td-step-h`, `.td-step-m`, `.td-step-min`, 7752, 7753, 7754 | 15/20, 13/18, 12/16 | label, meta, meta |
| 49 | `.sr-toc-t`, 6689 | 600 15/20 | label |
| 50 | `.fg-key-t`, 5611; `.gt-trap-t`, 5031 | 600 15/22 | label |
| 51 | `.td-ready-s` Today readiness first line, 7979 | Figtree 600 15/20 | label (supersedes "Figtree 15 semibold" in DECISIONS 9) |
| 52 | `.td-tile-v`, `.td-tile-a`, 7722, 7831 | 600 15/22 | title for a value in words ("Too few yet", "Not started"; rows 207, 59c); num.value for a number; label for `.td-tile-a` |
| 53 | `.td-dname` readiness list, 7987 | 400 15/20 | small |
| 54 | `.td-dval` "too few yet", 7988 | 400 12/16 tabular | meta, tabular |
| 55 | `.td-intro`, 5161, 7613; `.set-sub`, 7507 | 14/20 | small (short intro) or body if over two lines |
| 56 | `.td-hero-q`, 5188 | meta | meta (no change) |
| 57 | `.td-ring-cap`, 7677 | 400 14/1.4 | meta |
| 58 | `.td-kicker` "Read next", "Mindset check", 5317, 7951; `.td-planc-k`, 7740 | 600 12/16 | caption |
| 59 | `.td-legal`, `.td-apps`, 5319, 7589 | 400 12/16, `--muted` | meta in `--text2` (section 6 contrast) |
| 59a | `.td-twig-days`, 7940 (96 nodes) | Figtree 400 11/14, `--muted` | fg tiny 500 11/14 in `--text2` (E1) |
| 59b | `.you-stg-n`, 7456 (its 700 state is row 149) | 400 0.6875rem on forest | fg tiny 500 11/14 in `--on-forest2` (E1) |
| 59c | `.you-num-w` a stat value in words, 7362 | 1.25rem/1.3 | title (the web twin of row 207) |
| 59d | `.gloss-card-acronym` 2969, `.gloss-card-domain` 2975 to 2985, `.gloss-detail-acronym`, `.gloss-detail-meta-pill` 3058, `.gloss-detail-section-label` 3042 (about 1,230 nodes) | 13 legacy | caption; `.gloss-card-domain.d0` (muted on surface2) moves to `--text2` |
| 59e | `.gloss-mastered-count`, 2799 | legacy | meta |
| 59f | `.pacing-badge`, 3954 | legacy | caption |
| 59g | `.fg-cap.td-platecap` | italic 14/18 | fig 14/20 (E1) |
| 59h | Notes table `th` / `td` | 15/22 and 15/21 | column heads caption, row heads label, cells small 15/22 (stacked under 600px: the row label is label in `--text`, each column name is caption in `--accent-text` above its small cell, as on the phone) |
| 59i | Mock-confirm `strong` "50" | Figtree 400 16, no tnum | same role, tabular figures (section 2.2) |
| 59j | `.principle-link`, 1512, 5083 | 0.92em | 1em / inherit (a link in running text keeps its parent's size) |
| 60 | `.you-foot`, 7344 | 400 12/18 rem, `--muted` | meta in `--text2` |
| 61 | `.td-tile-hint` 7725, `.td-twig-n` 7911, 7942, `.td-fig-stage` 7641, `.rail-sync-m` 7258, `.you-stat-h` 7365, `.you-al-n` 7431 | 400 12/16 | meta |
| 62 | `.set-card .you-sw-w` On / Off word, 7517; 600 12/16 at 6169, 7740 | 600 12/16 | caption |
| 63 | De facto 400 / 500 13/18 captions, 4473, 4598, 4607, 4609, 5004, 5637, 5679, 5690, 5702, 5984, 7096, 7284, 7327, 7330, 7341, 7364, 7367, 7500, 7688, 7739, 7742, 7753, 7757, 7779, 7881, 7980, 7981; 400 13/19 at 7390, 7423; 13/1.45 at 7968 | 400 or 500 13 | meta (a subtitle or count) or caption (a label over content), by what it labels |
| 64 | Meta variants 600 14/20 at 4477, 4590, 5017, 5691, 5694, 6535, 7429, 7553, 7620; 600 14/18 at 4626, 6044, 7296, 7464, 7492, 7494; `--t-meta` overridden to 600 at 2684, 2691, 2710, 6476 | 600 14 | meta (500); a current or selected item keeps 600 beside its marker |
| 65 | 400 14/20 at 4934, 5684, 5705, 7507, 7615, 7687, 7780, 7818 | 400 14/20 | meta |
| 66 | Token overridden in its own rule, 700 and 2602 (`--t-small` at 600 / 500), 5906 (`--t-caption` at 500) | changed weight | small (400) and caption (600) |
| 67 | `.q-keys` keyboard hint and its `strong`, 5984 | 500 13/18 with 700 | caption |
| 68 | `.consent-text` cookie bar, 1725, 1729 | 13/18 | small |
| 69 | `.fw-cue` Final review week, 2712 | synthesised Figtree italic 15/22 | small, roman (R2) |
| 70 | `.subtopic-no-match` 633, `.gt-muted` 4950 | synthesised Figtree italic | meta, roman |
| 71 | `.you-status` You sentence, 7290 | Fraunces 400 20/27 rem, 23/31 at 1280 | read 18/26 |
| 72 | `.q-text` question stem, 4613; `.gt-oneline`, 4947 | 21/30 by hand, no long step | stem (token); add the long step over 200 characters |
| 73 | Legacy stem, 1300, 1301 | Fraunces 500 17/28.9 | stem (or delete if dead) |
| 74 | `.opt` answer options, 4618, 4621 | 16/23 | body 16/24 (R8) |
| 75 | `.mr-ot` mock review option, 6539 | small 15/22 | body (R8) |

### 4.4 Web: italic and coach lines

| # | Where | Now | Role |
|---|---|---|---|
| 76 | `.gt-quote` Learn analogy, 5026, 5027 | italic 17/25 | quote |
| 77 | `.td-prin-q` Today principle, 8001 | italic 18/1.35 | quote |
| 78 | `.ob-sub` welcome subline, 6940 | italic 19/26 | quote |
| 79 | Stage line literal, 5089 | italic 19/25 | quote (stage folds in) |
| 80 | `.ms-text` 4507 and quote literals | 18/26 by hand | quote (token); Phase 4: the Practice Mindset tip is a card row, `label` "Mindset." then the tip in `small` (PHASE4.md 7.8) |
| 81 | `.you-streak-q` 7371, `.ph-dom-w` 6315, `.fg-sl-w` 5597, 7640 | italic 15/20 | aside |
| 82 | `.td-step` plan step number, 7745, 7747 | italic 15/1 | aside |
| 83 | `.gt-olist li::before` list numbers, 4957 | Fraunces 500 17/24 | aside (key number, as `.fg-key-n`) |
| 84 | `.rs-g-l` 6448, `fg-sub` literal 6448 | italic 16/22 by hand | aside (token) |
| 85 | `.you-pl-q` 7451, `.ws-band` 5680, `.fg-spec-gated .fg-spec-d` 5650 | italic 14/18 and 14/19 | fig 14/20 (E1). Observation: `.you-pl-q` is a plant sentence, not a figure caption; using E1 `fig` for non-figure text stretches E1 (`aside` is the alternative) |
| 86 | `fg-fig` literal, 7729 | 14/20 by hand | fig (token) |

### 4.5 Web: buttons, chips and navigation

| # | Where | Now | Role |
|---|---|---|---|
| 87 | `.td-go`, `.td-more` Today Start and "Do a little more", 7540, 7756, 7782, 7785 | Figtree 700 16/20 | label (plate button, R6) |
| 88 | `.ph-go` 6249, `.fg-btn` 5656, 5658 | 600 16/20 | label (plate button) |
| 89 | `.rs-btn`, 6421 | 16/22 | label (no change) |
| 90 | `#submitBtn`, `#vrNext`, `#obGo` and other solid buttons, 4559, 6151, 6952, 7065 | 17/22 by hand | button (token) |
| 91 | `.train-ws-btn` "Train my weak spots", 3872 | Fraunces 500 17 | button |
| 92 | `.gt-btn-ghost` 2699, 4815, 4817 | 600 15/20 | label |
| 93 | `.consent-btn`, 1732, 4728 | 600 15/20 | label |
| 94 | `.you-go` 7294, `.es-btn` 1806, `.td-datebtn` 7617 | 600 14/18 and 14/20 | label |
| 95 | `.act-btn` and the shared secondary group, 1559, 4565, 5072 | 13 to 15 by hand | label |
| 96 | `.tipjar-btn`, 4320 | 14/21 | label |
| 97 | `.gloss-chip` 2882, `.subtopic-chip` 523, `.topic-pill` 2198, `.bk-tag-chip` 3894 | 600 13/normal | chip |
| 98 | `.mock-chip`, 1582 | 500 13 | chip |
| 99 | `.pl-chip`, 2594 | 600 14/20 | chip |
| 100 | `.you-chip-t` 7302, 7307; `.you-pl-s` 7450 | 600 13.5 (0.8438rem) | chip (the button), meta (its second line) |
| 101 | `.you-chip-k` plant chip kicker, 7308 | caps 11 at .1em | kicker 1px |
| 102 | `.mr-seg-b` 6474, `.gt-seg-name` 4760, 4764, `.conf-seg .conf-btn` 5995, 5998 | 14/20; 13/18 at 1280 | chip at every width |
| 103 | `.gt-chip` 4852, 4855, `.ph-chips` buttons 6271, `.conf-btn` 4637 | 600 15/20 | chip (token) |
| 104 | `.dc-weight` domain weight tag, 468, 4598 | 500 13/18 | meta (not a button) |
| 105 | `.fw-jump`, 2689 | 14/20 | chip |
| 106 | `.nav-tab` 4526, `.sub-nav a` 5806, 5809 | 600 15/20 | chip |
| 107 | `#sideNav .sn-item`, 5766, 5768 | 600 15/20 | label |
| 108 | `.sn-subitem`, 5771, 5774 | 500 14/20, current 600 | meta; the current page keeps 600 beside its marker |
| 109 | `.hdr-menu-item` 4486, `.cp-strip-t` 5062, `.gt-zoom-title` 4999, row button 4873 | 600 15/20 | label |
| 110 | `.toast`, 4676 | 600 15/20 | label |
| 111 | Remaining 600 15/20 rows, 4760, 7227, 7752 (and rem 0.9375rem/1.333) | 600 15/20 | label for a row, chip for a pill |
| 112 | `#bottomNav .bnav-label`, 956, 4536 | tab 11/14 | tab (no change) |

### 4.6 Web: kickers and tracking

| # | Where | Now | Role |
|---|---|---|---|
| 113 | `.td-card-k` 7601, `.td-tile-k` 7721, `.td-clear-k` 7776, `.you-kick` 7328, `.you-pl-h` 7446, `.td-planc-t` at 1280 7885, 7887 | caps 11/14 at .12em (1.32px) | kicker, `--tr-kicker` (0.0909em, 1px at 11) |
| 114 | `.fg-kick`, `.fg-k`, `.fg-rh`, 5505, 5510 | caps 11/14 at 1px | kicker (token rename only), except row 114a |
| 114a | `h2.fg-kick#pgStandH` "Where you stand" (Your progress), `h3.fg-kick#rsMissH` "What you missed" (set results) | caps 11/14 | headline (not tab homes, R4); the count in `#rsMissH` is meta beside the heading |
| 115 | `--t-tab` and `--t-fg-head` same value, index.html:240, 244 | two tokens | tab and kicker, one metric, two names |
| 116 | Caption tracking set in only 8 of 52 rules, 4814, 6010, 6049, 6091, 6116, 6625, 6839, 7003 | +0.1px sometimes | caption with `--tr-caption` everywhere |
| 117 | Stem and headline tracking by hand, 4613, 4947, 4890, 7290, 7326 | -0.1px literal | `--tr-stem`, `--tr-headline` |
| 118 | Em tracking on serif numbers, 7609, 7679, 7685, 7723, 7777, 7879, 7901 | -.02em | the numeral step's `--tr-num-*` token (em, section 3) |
| 119 | Stat tracking -0.8px, 4515, 6417, 6937 | -0.8px | `--tr-num-stat` (stats), `--tr-display` (6937) |

### 4.7 Web: numbers

| # | Where | Now | Role |
|---|---|---|---|
| 120 | `.td-rcap-n` Today range, 7685, 7850, 7879 | 22/28 under 768px, 32/36 from 768px | num.range 38/41 (steps 30, 22 only when space runs out) |
| 121 | `.fg-scale-n` scale bar number, 5533 | 36/42 | num.range |
| 122 | `.summary-big-score`, 3354, 4416 | 64/64 | num.score |
| 123 | Dead 72px score, 1604 | 72/1 | delete (num.score if live) |
| 124 | JS inline Fraunces 40px and 48px scores, index.html:24578, 24627 | literal px | a class on num.score |
| 125 | `.you-num` You stats, 7355, 7356 | 30/34 | num.stat 30/32 |
| 126 | `.rs-stat-v` 6417, `.rs-g-big` 6445 | 30/34, 30/36 | num.stat |
| 127 | `.td-clear-v` clearing stat, 7777, 7904 | 24/28 | num.stat (phone clearing is 30) |
| 128 | `.summary-stat-num`, 3372 | 24/24 | num.stat |
| 129 | `.stat-num`, 895, 899, 4515 | 34/34 | num.stat if live; delete if dead |
| 130 | `.td-tile-num` 7723, 7847 | 24/28, 22/26 on small phones | num.value |
| 131 | `.you-ready-n`, 7387 | 24/28 rem | num.value |
| 132 | `.td-ring-big` ring number, 7679 | 24/1 (22 at phone width) | num.value |
| 133 | `.dc-num` 4589 | 24/28 | num.value |
| 134 | `.fg-v` 5525, `fg-value` literal 5783, `.fg-sheet-nm` 5635, 7499 | 22/26 by hand; 22/28 on Progress, 19/24 on You | num.value or title (token) |
| 135 | 22/28 serif at 5185, 5635 | 22/28 | title 22/26 |
| 136 | `.gt-num` Learn counts, 2655, 4750 | 22/20 and 20/20 | num.value / num.inline (line no longer under the size) |
| 137 | `.td-num` mock domain %, 5310; its `sup` | headline overridden to Fraunces 17/24; sup 8.5px | num.inline; sup at the 11px floor |
| 138 | `.td-dval.td-dnum` Today domain %, 7989 | Fraunces 16/20 | num.inline, right-aligned min-width |
| 139 | `.you-al-v` 7430, `.ws-pct` 1650, 5683, `.summary-domain-pct` 3399 | Fraunces 14 to 16 | num.inline |
| 140 | `.dc-pct` 4591, `.fg-sl-v` 5596 | 20/24 | num.inline 20/22 |
| 141 | `.fg-sheet-ct` 5636 | Fraunces 17/22 | num.inline |
| 142 | Practice summary confidence numbers | 20/30 | num.inline |
| 143 | JS inline Fraunces 16px "#N", index.html:24610, 24616 | literal | num.inline class |
| 144 | `.td-rcap-to` 7686, 7880, `.you-to` 7261, 7388 | Fraunces 15 | meta |
| 145 | `.bk-d-tag` "D1", 1637 | Fraunces 16/24 | caption (and check §21.9, no book labels) |
| 146 | `--t-number` (227), `--t-stem` (230), `--t-stage` (233) never used | unused | `--t-num-score`, used by 122 and 124; `--t-stem` by 72; stage folds into quote |
| 147 | Counters without tabular figures: `.pg-cn` 5460, `.fg-sb-t` 5545, `.td-rcap-n` at 1280, `.td-dnum` | `font:` reset tnum | tabular-nums after `font:` (section 2.2) |
| 148 | Body-level `tabular-nums`, 4443 | on for all prose | removed; set per number class, in the same commit as the inherited spots listed in section 2.2 |
| 149 | Figtree 700: `.pg-today .pg-cn` 5462, `.fg-key-x` 5612, 5613, `.you-stg-n` 7458, `.td-twig-days .today` 7941, legacy `strong` in FAQ, About, Feedback, Practice summary | 700 | 600 (R2) |

### 4.8 Web: legacy screens not yet on Grove type

| # | Where | Now | Role |
|---|---|---|---|
| 150 | `.gloss-card-def` Glossary cards, 2986 | 13/20.8 | body |
| 151 | `.gloss-detail-def` term sheet, 3047, 3048 | 14.5/25.4 | body |
| 152 | `.gloss-sub` 2768, 2770 | 13.5/22.3 | meta |
| 153 | `.gloss-filter-label` 2877, `.gloss-progress-label` 2792 | 13/19.5 | caption |
| 154 | `.gloss-progress-pct`, 2787 | 22/22 | num.value |
| 155 | `.gloss-detail-close`, 3035, 3040 | Arial 400 22 "x" | an icon button (SVG cross, 44px, named "Close"); no text glyph |
| 156 | `.faq-a`, 2856, 2858, 2860 | 13.5/22.95 | body |
| 157 | `.faq-q`, 2846 | 14/normal | label |
| 158 | `.faq-cat-label`, 2840 | 400 13 | caption |
| 159 | About and FAQ legal paragraphs, `.legal-disclaimer-head` | 13/22.1 with 700 strong | meta, strong at 600 |
| 160 | `.tipjar-desc`, `.tipjar-meta` | 13 to 14 | small, meta |
| 161 | `.summary-sub`, `.summary-*-label`, 3350 | Figtree 13/19.5 | meta (subtitles), caption (labels) |
| 162 | `.bk-item-text` Saved rows, 1636 | 500 13/20.8 | small |
| 163 | `.ws-rec-title` 1656, `.ws-rec-sub` 1657, `.ws-n` | 13 | label, meta, meta |
| 164 | `.fb-label` 3648, `.fb-helper` 3676, `label.fb-checkrow` 3681, `#fbMailtoLink` | 13/19.5 and 13/20.8 | caption (labels), meta (helpers), body (the message, the checkbox row), meta (the link) |
| 165 | `.exp-body` 1358, `.gloss-sub` 2770, 870 | 13.5 at 1.55 to 1.75 | body, or delete if dead |
| 166 | Legacy longhand `font-size: 13px` rules (125 rules, lines 460 to 4420; full list in web-css.md 5c), e.g. 501, 509, 620, 633, 668, 717, 731, 744, 809, 842, 848, 903, 934, 956, 981, 998, 1008, 1022 | 13/19.5, weight inherited | delete if dead (about 187 legacy rules look dead; check string-built classes first); else small or body for sentences (for example the What's New items `.cl-items li`, 3575), meta or caption for labels |
| 167 | Other legacy serif under 18px, 1637, 1650, 1848, 1974, 2011, 2025, 2102, 2233, 2340, 2655, 2678, 3005, 3400, 3713, 3801, 3876, 4225 | Fraunces 14 to 17 | num.inline for numbers, label or meta (Figtree) for words |
| 168 | JS inline 13px muted labels, index.html:23519, 23849, 23985, 24579, 24617, 24628, 24937, 24939, 24941; and the showFeedback paragraph, 26619 (13px/1.6, `--text2`) | 13px | a class on meta for the labels; small (or meta) for the 26619 paragraph |
| 169 | JS inline 600 13px banner (showSaveError), index.html:10852 | 600 13px | caption, or label if it is restyled as a toast like row 110 |
| 170 | `.empty-icon`, 1668 | 52px glyph | exception E3 (icon size, not text); prefer an SVG |
| 170a | `.td-avatar` initial 7625 (Fraunces 400 19/1); text glyphs sized by font-size at 601, 955 (`.bnav-icon`), 1747, 1934, 3155, 3290, 3414 (`.summary-focus-icon`) | glyph sizes | exception E3 |

### 4.9 Web: charts and figures (exception E1 values)

| # | Where | Now | Role |
|---|---|---|---|
| 171 | `.fg-st-t` 5557, 5566, 5567, 5568 | 500 / 600 11px, no line-height | fg tiny 11/14 |
| 172 | `.fg-st-l1`, `.fg-st-l2` (the area name), 5569 | 600 10.5px | fg name Figtree 600 13/17 at every width (row 176a). To make room, each area's label block may take two columns less 8 and every odd area's block drops one row below the deepest line beside it when two neighbours would come within 8 (the web's `clash` / `dy`; the phone's `stemLabelLayout`). The list floor stays 58 a column on both builds |
| 173 | `.fg-st-w`, 5570 | italic 11.5px | fg figSm italic 12/16 |
| 174 | `.fg-st-n` 5564 (18 at 390, 24 at 1280) | Fraunces 500 18 / 24, no line-height | fg chart 18/22 at every width |
| 175 | `.fg-st-n .u` % sign, 5565; `tspan.u` at 10 and 13 | 10px | % at the 11px floor |
| 176 | `.pg-axt` progress axis, 5411 | 500 13/1 | fg tiny 11/14, or caption if it must stay 13 |
| 176a | `.fg-wide` chart labels (`.fg-st-t`, `-l1`, `-l2`, `-x`, `-line`, `-up`, `-dn`), 5581 | 13px at wide widths only | fg label 500 13/17 at every width (E1; one size at every width, as row 174); the area name (`-l1`, `-l2`) is fg name 600 13/17 (row 172). The web's width guesses for the clash check measure 13px text (about 7.3px a character) |
| 177 | Notes diagrams in `data/cisa_notes.json`, styled by 4991 (`.gt-figure svg text`) | Plus Jakarta Sans and JetBrains Mono, 700, 7.5 to 16 viewBox units | Figtree 600: add `font-weight: 600` to the 4991 reset beside the family (CSS overrides the data's `font-weight="700"` attribute; today the browser draws 700 from the 600 file). CSS cannot guarantee a 13px smallest label, because labels are viewBox units scaled to the plate; so, as the phone's notes rule: when the fitted figure's smallest rendered label is under 13px, show "Tap to enlarge". The zoom (index.html ~11327) opens with the smallest label at 16px or more, and the figcaption carries the meaning, because SVG text does not follow the browser text-size setting. The data stays as is |
| 178 | rem only on You and Settings, index.html:7270 to 7577 (55 sizes); px everywhere else | mixed units | every token in rem (section 3); the You and Settings rem literals become the tokens |

### 4.10 Phone

| # | Where (`mobile/src/`) | Now | Role |
|---|---|---|---|
| 179 | `app/session.tsx:1148`, `components/yourData.tsx:268`, `components/support.tsx:396, 678, 755`, `components/webImport.tsx:69` (sheets) | display 36/42 | hero (R3) |
| 180 | `components/settings.tsx:350`, `shareCard.tsx:209, 327`, `app/mistakes.tsx:91`, `components/badges.tsx:560` (sheets) | hero | hero (no change) |
| 181 | `app/(cloud)/account/delete.tsx:172` | hero | display (its sibling pages are display) |
| 182 | `app/recovery.tsx:116`, `app/guided.tsx:135` | hero | display (full pages); hero only if the title is a topic name |
| 183 | `board/[id].tsx:245`, `notes/subtopic/[id].tsx:191`, `exam-guide.tsx:76`, `cheat-sheet.tsx:76`, `principles/[id].tsx:97`, `exam-week.tsx:203`, `lesson/[id].tsx:446` | hero | hero (reading pages, no change) |
| 184 | `components/studyProfile.tsx:99`, `app/(tabs)/you.tsx:275 to 282` You tab | name in headline 17 | display (the name, or "You") |
| 184a | `app/(tabs)/home.tsx:738` Today greeting | display, `numberOfLines` | display; `onTextLayout` with `lines.length > 2`, or `useWindowDimensions().width < 360`, switches `v` to hero (R3); `numberOfLines={4}` stays only as a safety stop |
| 185 | `components/youTop.tsx:32` You summary line | stem 21/30 | `role.read` 18/26 (the web's You sentence) |
| 186 | `components/moments.tsx:144` | stem reused | stem if it is a question or scene, else read |
| 187 | `components/notes.tsx:760` "In one line" | stem | stem (no change; web `.gt-oneline` matches) |
| 188 | `components/quiz.tsx:300` practice and mock verdict | fieldType.verdict 30/34 | hero 28/34 (the web and the lesson check) |
| 189 | `components/quiz.tsx:302`, `lesson.tsx:804` lesson verdict coach line | meta 14 | aside 16/22, as in practice |
| 190 | `components/quiz.tsx:198` and `432` option text | body at 23; 500 / 600 at 22 | body 16/24; `role.optionPick` / `role.optionBest` 16/24 on the answer screen (R8) |
| 191 | `components/quiz.tsx:178, 184, 191` option badge letter on caption (keeps +0.1, x2) vs `428` plain Text in a fixed 30 disc on the answer plate (x1.3) | two definitions | `role.badgeLetter` 600 14/18 at 2.0 in both; drop the caption carrier at 178, 184, 191 (no +0.1 tracking); the plate disc at 428 becomes `minWidth` / `minHeight` 30 and grows like the row badge (E4) |
| 192 | `components/ui.tsx:1634` buttonLabel | 17/22 inline | button (`role.button`) |
| 193 | `components/ui.tsx:494` forest and ghost buttons | label 16/22 | label (no change) |
| 194 | `components/ui.tsx:1707` chipLabel, `1451` Chip | 15/20 inline | chip (`role.chip`) |
| 195 | `components/ui.tsx:2118` Segmented labels | caption 13 | chip 15/20 |
| 196 | `components/ui.tsx:1397` Tag | meta 14 | meta (no change; a tag is not a button) |
| 197 | `components/ui.tsx:393, 404` serif emphasis spans | hand-set | the parent role's size; weight step only; a named helper in `theme/grove.ts` |
| 198 | `components/ui.tsx:1799, 1805` BigNum 52; `components/game.tsx:290` | serifNumeral(52) 52/56, -0.6 | num.score (`role.numScore` = `type.number`, 52/52, -1.4); check in `npm run shots` at 1x and 1.3x on Android that the tops of the Fraunces numerals do not clip at line-height 1.0 |
| 199 | `components/ui.tsx:1799, 1805` BigNum 34; `app/readiness.tsx:290`; `components/fieldguide/ScaleBar.tsx:57` | serifNumeral(34) 34/37 | num.range 38/41 |
| 200 | `theme/tokens.ts:249` `type.stat` | 34/34, never used | retire at the next bundle rebuild |
| 201 | Today range and its step-downs 38 / 34 / 30 / 24 | four sizes | 38, then 30, then 22 (section 2.1) |
| 202 | Stat component, clearing stats, and You's and Results' stat rows (`SpecimenLabel.tsx:72`, BigNum size 30) | serifNumeral(30) | num.stat 30/32 (no change) |
| 203 | serifNumeral 17, 24, 26 callers (Trail, Lead), `components/ui.tsx:1799 to 1847` | 17, 24, 26 | num.value 22 (24, 26). serifNumeral(17): step and list numbers (`notes.tsx:687`, `noteFigures.tsx:241`, `lesson.tsx:362, 382, 414`) become aside (`fieldType.keyNo`), as web rows 82 and 83; counts (`journey.tsx:616, 618`, `StemChart.tsx:459`, `notes.tsx:640` if it is a section number) become num.inline 20. Before the number grows, `lesson.tsx:382`'s fixed `width: 32, height: 32` disc becomes `minWidth: 32, minHeight: 32, padding: 2` (as `noteFigures.tsx:240`) |
| 203a | serifNumeral(22) and BigNum size 22 callers: `ui.tsx:1837`, `lesson.tsx:523`, `learn.tsx:601` | 22/24 | num.value 22/26 (`role.numValue`) |
| 204 | `components/ui.tsx:1818` Percent; callers `journey.tsx:616`, `StemChart.tsx:459` (17, gives 8pt), `StemChart.tsx:227, 420` (20, gives 10pt) | 8 to 10pt | `percentSup(Math.max(size, 23))`, 11pt floor |
| 205 | `theme/tokens.ts:308` numeralUnit 12/16, `310` statUnit 15/20 | two unit styles | meta 14/20 (units beside numbers) |
| 206 | `theme/tokens.ts:254` stage 19/25; `329` grewLine 17/22; fieldType sub, keyNo 16/22, why 15/21; share-card skill 16/22 (`319`) | five italic sizes | quote (stage), aside (grewLine, sub, keyNo, why); skill stays inside the share card (E5). keyNo moves to aside's 2.0 limit only after `KeyList.tsx:56` changes `width: 22` to `minWidth: 22` (and `groveToday.tsx:299`'s forced 1.3 goes) |
| 207 | `theme/tokens.ts:323` statWord 20/26 | Fraunces 20/26 | title 22/26 (a stat's value in words, `role.title`) |
| 208 | fieldType recap 17/24 (the recapped question) | Fraunces 17/24 | `role.read` 18/26 (web recap matches) |
| 209 | fieldType value used as card titles, `groveToday.tsx:329, 361`, `app/(tabs)/home.tsx:827` | 22/26 | title (no change) |
| 210 | `app/(tabs)/learn.tsx:205`, `practice.tsx:287` card titles | hero | hero (panel titles, no change) |
| 211 | `app/notes/index.tsx:86, 114`, `notes/[domain].tsx:165`, `components/drills.tsx:186` | head caps | kicker (lists, R4, no change) |
| 212 | `components/notes.tsx:769 to 842` note page section heads | headline | headline (reading page, R4, no change) |
| 213 | Caption 13/18 used as a header, 16 sites on de80d18. Labels over content: `lesson.tsx:253`, `lesson.tsx:754` "Quick check", `badges.tsx:623` "The rule", `badges.tsx:639` "How to earn it", `game/field.tsx:215` "Terms", `game/field.tsx:231` "Meanings", `notes.tsx:721`, `firstSet.tsx:550`, `beta.tsx:88`, `widgetSettings.tsx:228`, `game/canopy.tsx:173`. Real section heads on pushed screens: `settings.tsx:987` "The KaiSip way", `whats-new.tsx:57`, `support.tsx:234`, `webImport.tsx:75`, `webImport.tsx:91` | caption | keep caption for the 11 labels over content; headline for the 5 section heads (R4) |
| 214 | `components/ui.tsx:1927, 1933, 1936` PushedHeader title | label, 1 line | label, 2 lines at font scale 1.3 and up (cut at 200% today) |
| 215 | `components/groveToday.tsx:382` today's twig letter | tab, x1.2 | tab size with the twig's scale cap x1.3 (as 386) |
| 216 | Counters without `num`: `app/game/stones.tsx:198`, `game/field.tsx:263, 321`, `app/(tabs)/home.tsx:795`, `fieldguide/ScaleBar.tsx:230`, `components/firstSet.tsx:267` | proportional digits | same role with `num` (tabular) |
| 217 | Overridden variants: `studyProfile.tsx:46` (body as a serif number), `shareCard.tsx:282, 286` | `v` no longer shows the style | plain Text with the numeral or role style; the share card is E5 |
| 218 | `widgets/layouts.android.tsx:316, 317, 823, 869` | serif italic sz(12.5), sz(12) | `Math.max(SERIF_MIN, sz(...))`, 13 (E6) |
| 219 | `components/ui.tsx:944` comment "headline is 20"; `theme/tokens.ts:298` | out of date | fix the comments (17; the five numeral steps) |
| 220 | `motion.tsx:1576` rolling digits line-height | lint-exempt | keep: the numeral step's line-height, set once (E7) |
| 221 | `mobile/eslint.config.js:13`; `scripts/check_token_parity.py` | type not fully guarded | section 3 guards |

Rows 179 to 221 change no `theme/tokens.ts` value; row 200 and the retired
names in row 205 and 206 wait for the next bundle rebuild.

**Count: 242 mapping rows** (197 web, 45 phone), covering every
outlier in the four audits; several rows group many lines of one selector or
one value. Rows added in review carry a letter (for example 59a) so the
numbers other notes cite stay the same.

---

## 5. Allowed exceptions

| # | Exception | Values allowed | Why |
|---|---|---|---|
| E1 | **Charts and Field Guide figures** (SVG text, stem charts, scale bar, figure captions, specimen labels) | fg tiny Figtree 500 11/14, fg small Figtree 500 12/16, fg label Figtree 500 13/17 (the wide chart labels, row 176a), fg name Figtree 600 13/17, fg chart Fraunces 500 18/22, fg figSm Fraunces italic 12/16, `fig` Fraunces italic 14/20 | Labels sit on a drawn scale and must fit the drawing. Each figure also has a sentence-per-area text equivalent (`role="img"` plus a visible list that grows with text size), so no fact lives only in a chart label. Nothing under 11px. |
| E2 | **The logo** (Kasama mark and the lowercase "kaisip" wordmark) | its own drawn size and letterforms, inline SVG | It is a picture of a name, not text; it is scaled as an image and has an accessible name. |
| E3 | **Glyphs in fixed shapes** (avatar initials in their discs, `.you-prof-i` and `.td-avatar`; empty-state icons; text glyphs sized by font-size, row 170a) | the shape's size, line-height 1 | They are icons. Prefer SVG; a glyph used as a button carries an accessible name; otherwise the name is in the label. |
| E4 | **Option letter badge** | Figtree 600 14/18 in its 30px badge (`--t-badge`, `role.badgeLetter`), text-size limit 2.0 | A single letter in a circle; the option words carry the reading. The badge grows with its letter (§10.7): on the web its width, height and min-width are in em, so the 30px circle grows at 200% text instead of the letter overflowing it; on the phone both the row badge and the answer-plate disc use `minWidth` / `minHeight` 30 (row 191). |
| E5 | **Share card image** (phone share card, its name 21/26, skill 16/22, notice 11/15) | fixed sizes | It is rendered to a picture for other apps; system text size does not apply; it carries alt text. |
| E6 | **Android home-screen widgets** | `sz()` 11 to 26; serif at least 13 (`SERIF_MIN`) | The launcher sets the space; widgets cannot follow the app's font scale the same way. |
| E7 | **Rolling digits** | the numeral step's size with a fixed line box | The roll animation needs one exact line height; Reduce Motion shows the end value with no roll. |
| E8 | **Question text** | stem 21/30, and 20/29 over 200 characters | It is the one reading size of its own (a serif reading face at 21 reads like 18 to 19 Figtree); the long step keeps long scenarios on fewer screens. Options stay `body`. |
| E9 | **Tab labels at 11** | tab 11/14, phone cap 1.2x | The bar must keep four words in one row; iOS shows the large-content viewer on long-press (tabBar.tsx:135), and the bar grows taller rather than cutting a word (DECISIONS 4). Android: no large-content equivalent; the tab word stops at 13.2sp and the 1.2 limit is accepted. Web: there is no large-content viewer, so the tab grows with rem (no cap) and may wrap to two lines; check the bar at 320px with 200% text. |

Anything else that looks like an exception is a mapping in section 4.

---

## 6. Accessibility floors and zoom

**Floors**
- Reading text (anything a learner reads as a paragraph or over two lines) is
  at least 16px / 16pt: `body`, options, explanations, notes, FAQ answers,
  glossary definitions, dialog text. `small` 15 is only for one to three short
  sentences (tips, notes under an answer).
- At the default text size (browser 16px root; the phone's default system
  text size), nothing is under 12px / 12pt, except: `kicker` and `tab` at 11
  (uppercase kickers with their tracking; tab labels, E9), chart labels at 11
  (E1), and the % sign at its 11 floor; nothing is under 11. Below the default
  (for example iOS xSmall about 0.82x, Android 0.85x, or a smaller browser
  text setting) the app follows the learner's own setting.
- Fraunces floors: roman words at 18 or more (read, stem, title, hero,
  display); numerals at 20 or more outside charts (18 in E1); italic: quote
  at 18, asides at 16, figure captions at 14 (E1) and 12 in charts (figSm).
  Widgets 13 (E6). Never all caps, never bold.
- Contrast: every text pair at WCAG AA in both themes: 4.5:1 for every role
  under 24px at any weight (Figtree 600 is semibold, not bold, so it gets no
  large-text relief); 3:1 only for `display`, `hero`, `num.stat` and larger.
  `meta`, `caption`, `kicker`, `fig` and the legal lines use `--text2` /
  `ink2` (`--on-forest2` on forest). `--muted` is only for inactive tabs,
  disabled labels, placeholders and chevrons, and never as text on
  `--surface2` (`--muted` on `--surface2`, light, is 4.53:1 nominal and about
  4.2:1 at the worst case of the 3.5% grain). Web cases that move:
  `.gloss-card-domain.d0` (2985, muted 13px on surface2, row 59d), `.td-legal`
  / `.td-apps` (7589, row 59), `.you-foot` (7344, row 60) and `.td-twig-days`
  (7940, row 59a) go to `--text2` with their new roles. Measured pairs (light /
  dark), all passing: `--text2` on `--surface` 8.10 / 8.19; `--muted` on
  `--surface` 5.66 / 5.94; `--accent-text` on `--bg` 6.59 / 10.23;
  `--on-forest2` on forest 6.91 / 6.88; tip on tip-bg 5.83 / 9.19. Colour is
  never the only signal: a verdict has its word, a selected chip its tick or
  fill change and its state name.
- Line-height at least 1.3 for `body`, `small`, `meta`, `caption`, `label`,
  `chip`, `aside`, `quote`, `read` and `stem`. `display`, `hero` and `title`
  keep their section 1 line-heights; when they wrap, descenders must not clip
  (no `overflow: hidden` on titles). `button` and `kicker` may wrap at their
  section 1 values. Numerals keep their step values (section 2.1).

**Web zoom and text size**
- Every type token is in rem (section 3), so the browser's text size setting
  grows all text, not just You and Settings. Browser zoom (to 400%) scales
  everything, including the capped large roles.
- Under a larger text setting, `display`, `hero`, `title` and every numeral
  step stop growing (the same limits as the phone): display, hero and every
  numeral step at 1.3x of their px size, `title` at 1.6x (35.2px, so it stays
  above `headline` 34 and `body` 32 and below `hero` 36.4 at 200%). Every
  other role grows fully to 200%. `stem` may exceed `hero` from about 175%
  text; accepted, as on the phone.
- At 320px width with 200% text: no sideways scroll, no clipped or overlapped
  text, no `numberOfLines`-style truncation of titles. Long words wrap
  (`overflow-wrap: anywhere` on titles and names). Controls use `min-height`,
  never a fixed `height`. Stat rows become label-left, value-right lists,
  through the existing web switch: `fgLargeText()` / `FG_LARGE_PX = 20.8`
  (index.html ~15183, the `fg-large` class), so the web's 1.3x trigger is one
  mechanism.
- Layout queries that must follow text size are in `em` (as Study tools'
  narrow-card query already is). Today every web breakpoint is px (30 queries
  at 600px, 14 at 768px, 10 at 1240px, plus 580, 400, 420 and others). The
  ones that move: the R3 greeting step 360px becomes 22.5em, 768px becomes
  48em, and the 1240px margin column becomes 77.5em, so a 200% text setting
  drops the side column instead of squeezing the 640px main column.
- Never `-webkit-text-size-adjust: none` and never a viewport that blocks
  zoom. WCAG 1.4.12: text survives line-height 1.5, paragraph spacing 2x,
  letter-spacing 0.12em and word-spacing 0.16em without loss.

**Phone font scale and Dynamic Type**
- Every `T` and `FieldText` follows the system font scale. Limits
  (`maxFontSizeMultiplier`, from the variant key or the `role` entry, section
  3): 2.0 for stem, quote, read, aside, headline, button, label, chip, body,
  small, meta, caption, kicker and the option letter (E4); 1.6 for `title`
  (words that wrap; stays above headline and body at 2x); 1.3 for display,
  hero, every numeral step (`num.value` included) and chart labels; 1.2 for
  tab. Never 1.0, except E3 glyphs hidden from assistive tech
  (studyProfile.tsx:46) and E5 the share card (the `T` doc comment at
  ui.tsx:336 already allows both).
- React Native 0.88 on Android 14+ may scale large text less than the linear
  `useFontScale()` reports (nonlinear font scaling), so `LARGE_TEXT` and the
  reflow points can trip early there; the 2x shots (section 7 step 3) cover
  an Android 14+ emulator as well as iOS.
- §10.7 reflow rules stand: at 1.3 rows stack and chips wrap; at 1.6 the
  option badge grows and the question scrolls as one; every control uses
  `minHeight`. The pushed-screen bar title gets a second line at 1.3 (row
  214).
- Accessible names say numbers in words where a sign could be misread
  ("63 to 73, a study estimate", "72 percent").

**Motion**: type never animates its size. Rolling digits (E7) and the range
reveal fade in once; with Reduce Motion (OS setting or the app's Motion
setting) the final value shows at once.

---

## 7. Order of work (for the fix PRs)

1. Web tokens: add the new tokens and make every `--t-*` rem (one place,
   `:root`); replace the 106 literal token copies (no visual change). Ship
   with a What's New line ("Text now follows your browser's text size on
   every page.").
2. Web roles: titles (4.1), section heads (4.2), rows (4.3), buttons and
   chips (4.5), numbers (4.7), then the legacy screens (4.8) and charts
   (4.9). Re-measure Start's position on Today at 390 by 664 and 375 by 635
   (decision 6) with the 38 range and the 36 greeting; scrolling a little to
   Start is accepted (DECISIONS 7). Rows 2 (greeting 28 to 36 at 390px) and
   120 (range 22 to 38) change the sizes set in DECISIONS 9, which this file
   supersedes: send before and after Today screenshots at 390x664 and
   375x635, light and dark, at handoff (the DECISIONS 6 and 7 measuring
   method).
3. Phone: the `theme/grove.ts` `role` map and the widened `T`, then rows 179
   to 221 (with their lettered rows), with `npm run shots` light and dark at
   1x and 2x text. Take the 2x shots on an Android 14+ emulator as well as
   iOS (section 6).
4. Guards (section 3; the parity type pairs only once `theme/grove.ts` is on
   main), then fold this file into DESIGN_SYSTEM §1 and §2.

Checks at each step: `bash scripts/verify_repo.sh`, `cisa-ux-reviewer` and
`mobile-ux-reviewer`, pa11y with `STRICT_A11Y=1`, screenshots at 320, 390
and 1280 in light and dark, and 200% text on both builds.
