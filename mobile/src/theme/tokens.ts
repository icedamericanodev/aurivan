/**
 * Aurivan design tokens for mobile: the "Forest" design system.
 *
 * Source of truth: docs/mobile/DESIGN_SYSTEM.md (locked 2026-10-06).
 * If this file and that doc disagree, the doc wins.
 *
 * Plain-English rules:
 * - `accentText` for green text, `accentFill` behind white text,
 *   `accent` only for bars, rings and borders (never small text).
 * - Green never means "selected". Selected uses `text` (the "ink").
 * - Screens never set fontSize/lineHeight/fontFamily or hex colours;
 *   they pick a `<T v="…">` variant and a palette token instead.
 */
import type { TextStyle } from 'react-native';

export interface Palette {
  bg: string; // screen background
  surface: string; // cards, options
  surface2: string; // icon tiles, pressed state, pills
  border: string; // decorative borders
  borderStrong: string; // control outlines (secondary button, chips)
  text: string; // primary text; also the "selected" ink
  text2: string; // secondary text, eyebrows
  muted: string; // tertiary text, dimmed options
  accent: string; // bars, rings, focus, emphasis border (never small text)
  accentText: string; // green text and links
  accentFill: string; // primary button fill (white text)
  onAccent: string; // text on accentFill
  clay: string; // warm secondary: streak, stage bar
  clayText: string; // warm text
  correct: string;
  correctBg: string;
  wrong: string;
  wrongBg: string;
  warning: string;
  warningBg: string;
  ink: string; // glyphs on clay/correct fills
}

export const light: Palette = {
  bg: '#F4F6F2',
  surface: '#FFFFFF',
  surface2: '#E9EFEA',
  border: '#D3DDD6',
  borderStrong: '#7C8D82',
  text: '#15201A',
  text2: '#3E5246',
  muted: '#5A6B60',
  accent: '#2F7A55',
  accentText: '#22603F',
  accentFill: '#22603F',
  onAccent: '#FFFFFF',
  clay: '#C0703F',
  clayText: '#8E4A22',
  correct: '#1C6E46',
  correctBg: '#DDF1E3',
  wrong: '#A8323E',
  wrongBg: '#FBE4E5',
  warning: '#7F5300',
  warningBg: '#FAEFD3',
  ink: '#15201A',
};

export const dark: Palette = {
  bg: '#0F1512',
  surface: '#161E1A',
  surface2: '#1D2722',
  border: '#2B3730',
  borderStrong: '#5E7064',
  text: '#ECF3EE',
  text2: '#AFC1B6',
  muted: '#8D9E93',
  accent: '#4FA57B',
  accentText: '#86D0A8',
  accentFill: '#2A6E4C',
  onAccent: '#FFFFFF',
  clay: '#E0915E',
  clayText: '#EBA97C',
  correct: '#74D69E',
  correctBg: '#13321F',
  wrong: '#FF9CA6',
  wrongBg: '#3B1519',
  warning: '#F0C566',
  warningBg: '#33290D',
  ink: '#0F1512',
};

/**
 * Domain tones (Lake, Moss, Ochre, Heather, Slate). Used for dots, bars and
 * ring segments only, never for text. Domains store a tone index 0–4.
 */
export const domainPalette = {
  light: ['#3F7F96', '#4E8A3E', '#B0802C', '#86689C', '#5E7482'],
  dark: ['#72B4CB', '#8CC474', '#DDB066', '#B99DCD', '#9AAFBB'],
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** One family, three weights. (Weight 500 and JetBrains Mono are gone.) */
export const font = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/** The six text styles. Every piece of text in the app uses one of these. */
export type TypeVariant = 'display' | 'title' | 'body' | 'label' | 'meta' | 'eyebrow';

export const type: Record<TypeVariant, TextStyle> = {
  display: { fontFamily: font.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  eyebrow: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.6, textTransform: 'uppercase' },
};
