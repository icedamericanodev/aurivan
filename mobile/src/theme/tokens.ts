/**
 * Aurivan design tokens for mobile: the "Grove v2" design system.
 *
 * Source of truth: docs/mobile/DESIGN_SYSTEM.md (locked 2026-10-07).
 * If this file and that doc disagree, the doc wins.
 *
 * Plain-English rules:
 * - `accentText` for green text, `btn` behind `onBtn` text, `accent` only
 *   for bars, rings, rules and leaves (never small text).
 * - Green never means "selected". Selected uses `ink`.
 * - One `forest` panel per screen at most: it is the brand moment.
 * - Screens never set fontSize/lineHeight/fontFamily or hex colours;
 *   they pick a `<T v="…">` variant and a palette token instead.
 */
import type { TextStyle } from 'react-native';

export interface Palette {
  bg: string; // screen background (warm paper / forest night)
  raised: string; // option rows, inputs
  raised2: string; // the second surface tier: page sheets (one step above the screen behind them)
  soft: string; // icon circles, pressed rows, tags
  line: string; // hairlines, dark-mode option outline
  control: string; // idle chip / checkbox outlines (≥3:1)
  track: string; // progress and ring tracks
  ink: string; // primary text; also the "selected" colour
  ink2: string; // secondary text, meta
  muted: string; // inactive tabs, chevrons, dimmed options
  accent: string; // bars, rings, progress, key-idea rule (non-text)
  accentText: string; // green text, row icons, links
  btn: string; // primary button fill
  onBtn: string; // text on the primary button
  forest: string; // the hero panel
  forestTop: string; // the forest panel's lit top edge (a vertical gradient down to `forest`; = forest in light)
  onForest: string; // text on forest
  onForest2: string; // secondary text on forest
  forestLine: string; // botanical line art on forest (decorative)
  forestTrack: string; // hairlines and ring tracks inside forest
  sap: string; // leaf marks and the mini ring on forest
  pill: string; // on-forest pill button fill
  onPill: string; // label on the pill button
  clay: string; // streak + calm attention (pace behind, 2-min cue, last 5 min). Never for errors.
  correct: string;
  correctBg: string;
  wrong: string;
  wrongBg: string;
  tip: string; // trap warnings
  tipBg: string;
}

export const light: Palette = {
  bg: '#F3F1EA',
  raised: '#FFFFFF',
  raised2: '#F8F7F2',
  soft: '#E6EBE2',
  line: '#DFDCD1',
  control: '#7D897F',
  track: '#E2E0D6',
  ink: '#17231B',
  ink2: '#465349',
  muted: '#5E6A61',
  accent: '#2B6E4A',
  accentText: '#24603F',
  btn: '#1E4A34',
  onBtn: '#F7F5EF',
  forest: '#1E4A34',
  forestTop: '#1E4A34',
  onForest: '#F3F1EA',
  onForest2: '#C9DACD',
  forestLine: '#3A6B51',
  forestTrack: '#2F5C44',
  sap: '#A9D9BA',
  pill: '#F3F1EA',
  onPill: '#17231B',
  clay: '#9A4F26',
  correct: '#1D6A43',
  correctBg: '#E0EDE2',
  wrong: '#A3333D',
  wrongBg: '#F7E3E1',
  tip: '#7A5100',
  tipBg: '#F3EAD3',
};

export const dark: Palette = {
  bg: '#111613',
  raised: '#1A211C',
  raised2: '#1B231E',
  soft: '#202A23',
  line: '#29322B',
  control: '#66736A',
  track: '#2A332C',
  ink: '#ECEFE8',
  ink2: '#B4BFB6',
  muted: '#97A39A',
  accent: '#7FC39C',
  accentText: '#93CFAA',
  btn: '#A9D9BA',
  onBtn: '#0F1F16',
  forest: '#21432F',
  forestTop: '#285139',
  onForest: '#EEF2EA',
  onForest2: '#BCD2C2',
  forestLine: '#3C6B51',
  forestTrack: '#2E5440',
  sap: '#A9D9BA',
  pill: '#EEF2EA',
  onPill: '#0F1F16',
  clay: '#E9A07A',
  correct: '#8AD6A8',
  correctBg: '#173022',
  wrong: '#FF9CA6',
  wrongBg: '#3A1A1D',
  tip: '#E9C46A',
  tipBg: '#2C2715',
};

/**
 * Brand colours for the "True North" mark and lockup (DESIGN_SYSTEM.md, "Brand").
 * The lockup has two fixed tones that do NOT follow the theme:
 * - `light`: on paper (bg). Ring/book in accent, honey tip, forest needle half.
 * - `dark`: on forest or the dark bg. Ring/book in sap, light honey, paper half.
 * Honey appears once per mark, on the needle's north tip, and never carries meaning.
 */
export interface BrandTone {
  ring: string; // the growth-ring arc and the open book
  honey: string; // the needle's west (left) half: the north tip
  needle: string; // the needle's east (right) half
  word: string; // the "aurivan" wordmark
  leaf: string; // the leaf over the i
}
export const brand: { light: BrandTone; dark: BrandTone } = {
  light: { ring: '#2B6E4A', honey: '#7A5100', needle: '#1E4A34', word: '#17231B', leaf: '#2B6E4A' },
  dark: { ring: '#A9D9BA', honey: '#E9C46A', needle: '#F3F1EA', word: '#F3F1EA', leaf: '#A9D9BA' },
};

/** Pillar glyph leaf fill (welcome + About). The line colour is the theme's accentText. */
export const pillarGlyph = {
  light: { fill: '#A9D9BA' },
  dark: { fill: '#2E5440' },
} as const;

/**
 * Paper grain overlay opacity (spec §10.5). Never higher: at 5% the weakest
 * text pair (muted on bg) still passes 4.7:1. Dark is 4.5% (mobile 1.9; was
 * 6%): white specks over the forest night read as dust, and every light-on-
 * dark pair gains contrast with less of them.
 */
export const grainOp = { light: 0.05, dark: 0.045 } as const;

/** 1px inner top highlight on the dark forest panel, so it lifts off `bg`. */
export const forestHighlight = 'rgba(255,255,255,0.06)';

/** Soft shadow for raised rows (light mode only; dark uses a 1.5px `line` outline). */
export const raisedShadow = {
  shadowColor: '#17231B',
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

/**
 * Domain tones (Lake, Moss, Ochre, Heather, Slate). Used for dots, bars and
 * ring segments only, never for text. Domains store a tone index 0–4.
 */
export const domainPalette = {
  light: ['#3F7F96', '#4E8A3E', '#B0802C', '#86689C', '#5E7482'],
  dark: ['#72B4CB', '#8CC474', '#DDB066', '#B99DCD', '#9AAFBB'],
} as const;

/** Spacing scale 4…48. `gutter` is the screen side padding (20). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, gutter: 20, xl: 24, section: 28, xxl: 32, xxxl: 48 } as const;
/** sm = tags/progress, md = option rows/inputs, lg = hero panel, sheet = sheet top corners. */
export const radius = { sm: 8, md: 16, lg: 24, sheet: 28, pill: 999 } as const;

/**
 * Two families (spec §1). Weight is chosen by family name, never by
 * `fontWeight` (Android ignores fontWeight for custom fonts).
 * Fraunces = the moments you read; Figtree = everything you tap or scan.
 */
export const font = {
  serif400: 'Fraunces_400Regular',
  serif400Italic: 'Fraunces_400Regular_Italic',
  serif500: 'Fraunces_500Medium',
  sans400: 'Figtree_400Regular',
  sans500: 'Figtree_500Medium',
  sans600: 'Figtree_600SemiBold',
} as const;

/** The type scale (spec §2). Every piece of text in the app uses one of these. */
export type TypeVariant =
  | 'number'
  | 'stat'
  | 'display'
  | 'hero'
  | 'stem'
  | 'quote'
  | 'stage'
  | 'headline'
  | 'label'
  | 'body'
  | 'small'
  | 'meta'
  | 'caption'
  | 'tab';

export const type: Record<TypeVariant, TextStyle> = {
  number: { fontFamily: font.serif500, fontSize: 52, lineHeight: 52, letterSpacing: -1.4 },
  stat: { fontFamily: font.serif500, fontSize: 34, lineHeight: 34, letterSpacing: -0.8 },
  display: { fontFamily: font.serif500, fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
  hero: { fontFamily: font.serif500, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  stem: { fontFamily: font.serif400, fontSize: 21, lineHeight: 30, letterSpacing: -0.1 },
  quote: { fontFamily: font.serif400Italic, fontSize: 18, lineHeight: 26 },
  stage: { fontFamily: font.serif400Italic, fontSize: 19, lineHeight: 25 },
  headline: { fontFamily: font.sans600, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  label: { fontFamily: font.sans600, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.sans400, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.sans400, fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: font.sans500, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.sans600, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  tab: { fontFamily: font.sans600, fontSize: 11, lineHeight: 14 },
};

/** Long stems (> 200 characters) step down to 20/29 so they fit (spec §2). */
export const STEM_LONG_CHARS = 200;
export const stemLong: TextStyle = { fontSize: 20, lineHeight: 29 };

/**
 * How far each style may grow with the phone's text size (spec §1).
 * Titles and numerals cap at ×1.3 (fixed shapes hold them); reading styles
 * go to ×2.0 (WCAG 1.4.4); tab labels cap at ×1.2.
 */
export const maxScale: Record<TypeVariant, number> = {
  number: 1.3,
  stat: 1.3,
  display: 1.3,
  hero: 1.3,
  stem: 2,
  quote: 2,
  stage: 2,
  headline: 2,
  label: 2,
  body: 2,
  small: 2,
  meta: 2,
  caption: 2,
  tab: 1.2,
};

/** Option row text: body at line-height 1.42 (spec §11 "Question"). */
export const optionText: TextStyle = { lineHeight: 23 };
/** The letter inside an option badge: Figtree 600 14 (spec §6 "Option row"). */
export const badgeLetter: TextStyle = { fontFamily: font.sans600, fontSize: 14, lineHeight: 18 };

/**
 * Serif numeral system (spec §10.4): every number a learner reads as an
 * achievement or a quantity is Fraunces 500. Inline sizes: 17 (ring legend),
 * 20 (streak, segmented control), 22 (row counts, lesson numerals),
 * 26 (mock lead numerals), 30 (clearing stats). `number` 52 and `stat` 34
 * are full type variants above.
 */
export type NumeralSize = 17 | 20 | 22 | 24 | 26 | 30;
export function serifNumeral(size: NumeralSize | 34 | 52): TextStyle {
  return { fontFamily: font.serif500, fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: size >= 30 ? -0.6 : -0.3 };
}
/** The unit under or after a serif numeral ("due", "questions"): Figtree 500 12/16. */
export const numeralUnit: TextStyle = { fontFamily: font.sans500, fontSize: 12, lineHeight: 16 };
/** The raised % after a serif numeral: ~0.48em of the numeral. */
export function percentSup(size: number): TextStyle {
  return { fontFamily: font.serif500, fontSize: Math.round(size * 0.48), lineHeight: Math.round(size * 0.6) };
}
/** Clearing-card readiness line: Fraunces italic 17 (the coach's voice). */
export const grewLine: TextStyle = { fontFamily: font.serif400Italic, fontSize: 17, lineHeight: 22 };
/** Large text: at this font scale rows stack and chips wrap (spec §10.7). */
export const LARGE_TEXT = 1.3;

/**
 * Motion tokens (DESIGN_SYSTEM.md §8 "Motion"). Every duration, curve and
 * spring in the app comes from here; components/motion.tsx turns them into
 * Reanimated easings. Plain data, so the theme never depends on Reanimated.
 *
 * The budget (behavioural review §2): functional motion 120–300 ms, ease-out;
 * informational growth up to 600 ms; nothing loops on question or mock
 * screens; opacity and colour never bounce. Everyday UI moves like paper:
 * quick and soft. Only the verdict leaf (and, later, the plant) may spring.
 */
export const motion = {
  /** Durations in ms. */
  dur: {
    press: 120, // press-in: scale .98 / row tint (ease-out, so it reads as instant)
    select: 120, // option, chip and segment state; the exit half of a page turn
    quick: 160, // small fade or pop, a shake, a tint fading out
    reveal: 200, // answer rows, "Why", the Coach me wash
    enter: 240, // content groups fade in and rise 8pt
    screen: 280, // the arriving half of a page turn
    fill: 300, // progress bars and segments
    vine: 520, // the vine stem draws (signature)
    grow: 600, // growth rings and rolling numbers (signature: first view of the day, or what changed)
    celebrate: 1200, // the ceiling for a whole celebration (the clearing, a milestone), always skippable
    short: 200, // a repeated celebration: its end state cross-fades in, nothing else moves
    reduced: 120, // the cross-fade that replaces movement under Reduce Motion
    tick: 900, // the pace tick's linear glide, within each 1 s clock tick (the one linear motion)
  },
  /** Cubic-bezier control points (Material 3). "out" is Easing.out(cubic), our default. */
  curve: {
    enter: [0.05, 0.7, 0.1, 1], // emphasized decelerate: arriving
    exit: [0.3, 0, 0.8, 0.15], // emphasized accelerate: leaving
    standard: [0.2, 0, 0, 1], // on-screen moves (the segmented thumb, the tab fade)
  },
  /**
   * Springs. `duration` springs are perceptual (the real settle is ~1.5×).
   * Ratio 1 never overshoots. Only `pop` and `leaf` may overshoot, and only
   * on a mark, never on a control.
   */
  spring: {
    press: { duration: 160, dampingRatio: 1 }, // press release: back to rest, no bounce
    settle: { duration: 300, dampingRatio: 0.9 }, // the segmented thumb (M3 standard spatial)
    pop: { damping: 16, stiffness: 260 }, // the verdict leaf only (signature)
    leaf: { duration: 280, dampingRatio: 0.7 }, // small marks: the bookmark, plan leaves
  },
  /**
   * Stagger: content groups 40 ms apart (first 4), list rows 30 ms (first 6),
   * a rolling number's digits 30 ms (they finish right to left), growth
   * figures 60 ms (rings, stats), newly pressed leaves 80 ms (first 3).
   */
  stagger: { group: 40, maxGroups: 4, row: 30, maxRows: 6, digit: 30, stat: 60, leaf: 80, maxLeaves: 3 },
  /**
   * The celebration budget (behavioural review §2): a kind of moment plays in
   * full its first `fullTimes` times, then shortened; at most ONE plays in
   * full per app session; decorative motion stays under `sessionMs` in all;
   * a falling-leaf moment drifts at most `leaves` leaves, once.
   */
  celebrate: { fullTimes: 3, sessionMs: 3000, leaves: 8 },
  rise: 8, // pt: content enters this far below its place (y only)
  shift: 16, // pt: a page turn's sideways offset
  pressScale: 0.98,
  pressOpacity: 0.92, // the press under Reduce Motion (no scale)
} as const;

/**
 * Badge art (mobile 1.10, DESIGN_SYSTEM.md §11 "Badges"). An earned badge is
 * an OBJECT, struck once: its enamel and metal are the same in light and
 * dark (like the brand lockup), so these do not follow the theme. A badge not
 * yet earned is drawn in theme tokens instead (soft field, control dashed
 * outline, muted emblem, accent progress trace).
 *
 * Enamels: the medallion's field and its emblem's colour roles (E1 main, E2
 * second, E3 accent, D2/D3 shades, L3 light accent; `deep`/`lite` for the
 * field's cast shadow and growth rings; the ribbon). Each set is a frame
 * SHAPE plus one enamel (components/medallion.tsx SET_LOOK), so no two sets
 * differ by colour alone. Contrast (art spec §6, all ≥ 3:1 for graphics):
 * E1/E2/E3 on forest 8.91/6.39/6.03, on ink 14.37/10.31/9.72, on clay
 * 5.28/3.83/3.57, on paper 8.93/5.42/5.29.
 */
export interface BadgeEnamel {
  field: string;
  deep: string;
  lite: string;
  E1: string;
  E2: string;
  D2: string;
  E3: string;
  D3: string;
  L3: string;
  ribbon: string;
  ribbonDeep: string;
}
export const badgeEnamel: Record<'forest' | 'ink' | 'clay' | 'paper', BadgeEnamel> = {
  forest: { field: '#1E4A34', deep: '#123021', lite: '#2C5E44', E1: '#F3F1EA', E2: '#A9D9BA', D2: '#7DB592', E3: '#E9C46A', D3: '#B98A2E', L3: '#F4DE9E', ribbon: '#2B6E4A', ribbonDeep: '#1E4A34' },
  ink: { field: '#17231B', deep: '#0B130E', lite: '#25362B', E1: '#F3F1EA', E2: '#A9D9BA', D2: '#7DB592', E3: '#E9C46A', D3: '#B98A2E', L3: '#F4DE9E', ribbon: '#9A4F26', ribbonDeep: '#6E3417' },
  clay: { field: '#9A4F26', deep: '#6A3015', lite: '#A95C33', E1: '#F3F1EA', E2: '#F2C7A6', D2: '#D9A07A', E3: '#E9C46A', D3: '#C0912F', L3: '#F4DE9E', ribbon: '#A87A1F', ribbonDeep: '#7A5100' },
  paper: { field: '#F5F1E6', deep: '#D9D1BD', lite: '#E6DFCD', E1: '#1E4A34', E2: '#2B6E4A', D2: '#1E4A34', E3: '#9A4F26', D3: '#6E3417', L3: '#EFC6A8', ribbon: '#2B6E4A', ribbonDeep: '#1E4A34' },
};
export type BadgeEnamelId = keyof typeof badgeEnamel;

/**
 * The rim metal tells the TIER, three ways (metal, pip count, laurel), never
 * by colour alone; the tier's number is also printed beside the badge.
 * A badge with one mark is struck in Gold leaf with a beaded rim and no pips.
 * `leaf` / `leafRib`: Firm Footing's domain leaf on the rim (this domain).
 */
export interface BadgeMetal {
  name: string;
  light: string;
  mid: string;
  dark: string;
  edge: string;
  bead: string;
}
export const badgeMetal: Record<1 | 2 | 3, BadgeMetal> = {
  1: { name: 'Clay', light: '#F7D3B8', mid: '#D58A5C', dark: '#A2552B', edge: '#6B3216', bead: '#FBE5D3' },
  2: { name: 'Lichen', light: '#FAFBF8', mid: '#C9D5CC', dark: '#8E9C92', edge: '#46544A', bead: '#FFFFFF' },
  3: { name: 'Gold leaf', light: '#FBE9B4', mid: '#E2B653', dark: '#A87A1F', edge: '#7A5100', bead: '#FFF5D6' },
};
export const badgeLeafPip = { on: '#1E4A34', rib: '#A9D9BA' } as const;
/** The faint glaze across an earned badge's enamel (light from the top left). */
export const badgeGlaze = { color: '#FFFFFF', opacity: 0.035, paperOpacity: 0.3 } as const;
