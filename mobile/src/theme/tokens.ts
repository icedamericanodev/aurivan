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
  raised: string; // option rows, sheets, inputs
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
 * text pair (muted on bg) still passes 4.7:1.
 */
export const grainOp = { light: 0.05, dark: 0.06 } as const;

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
