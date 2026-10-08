/**
 * Illustrations: make a notes SVG drawable by react-native-svg.
 *
 * WHY (plain English): the diagrams were drawn for the website, so their
 * colours are CSS variables like `var(--text)`. A browser fills those in
 * from the page's stylesheet; react-native-svg has no stylesheet, so it
 * cannot. Before drawing, we swap every variable for the matching colour
 * of the CURRENT theme (light or dark). The same swap also points the text
 * at a font the app has loaded, and drops `font-weight` (on Android a
 * custom font's weight comes from its file, so a weight would fall back to
 * the system font).
 *
 * Pure TypeScript: no React, no storage. Tested in __tests__/notes-svg.test.ts.
 */
import type { Palette } from '../theme/tokens';

/**
 * Website variable → app palette token. Chosen so every pair still reads:
 * `accent-fill` sits behind WHITE text on the web, so it becomes the forest
 * green (white text on forest passes AA in both themes), and the white text
 * itself becomes `onForest`.
 */
export const SVG_VAR_TOKENS: Record<string, keyof Palette> = {
  'accent-fill': 'forest',
  accent: 'accent',
  bg: 'bg',
  surface: 'raised',
  surface2: 'soft',
  border: 'line',
  border2: 'control', // diagram outlines carry meaning: ≥3:1 (WCAG 1.4.11)
  text: 'ink',
  text2: 'ink2',
  text3: 'muted',
  muted: 'muted',
  success: 'correct',
  danger: 'wrong',
  warning: 'tip',
};

/** Fonts to draw SVG text with (font family names the app has loaded). */
export interface SvgFonts {
  sans: string;
  mono: string;
}

/** Unknown variables fall back to secondary text: visible in both themes. */
const FALLBACK: keyof Palette = 'ink2';

/**
 * Return the SVG with theme colours and app fonts filled in.
 * Unknown `var(--x)` uses its CSS fallback (`var(--x, #123456)`) if it has one.
 */
export function themeSvg(svg: string, palette: Palette, fonts: SvgFonts): string {
  return (
    svg
      // Hard-coded white (text on the accent fill) → the text colour on forest.
      // FIRST, so a theme colour that happens to be white (light `raised`) is
      // never re-coloured by this rule.
      .replace(/\b(fill|stroke)=(['"])(#fff|#ffffff|white)\2/gi, (_m, attr: string, q: string) => `${attr}=${q}${palette.onForest}${q}`)
      // var(--name) or var(--name, fallback) → a real colour.
      .replace(/var\(\s*--([a-zA-Z0-9-]+)\s*(?:,\s*([^)]+?)\s*)?\)/g, (_m, name: string, fallback?: string) => {
        const token = SVG_VAR_TOKENS[name];
        if (token) return palette[token];
        return fallback ?? palette[FALLBACK];
      })
      // Fonts: monospace stays monospace, everything else uses the app's sans.
      .replace(/font-family=(['"])([^'"]*)\1/g, (_m, q: string, family: string) =>
        `font-family=${q}${/mono/i.test(family) ? fonts.mono : fonts.sans}${q}`,
      )
      .replace(/\s+font-weight=(['"])[^'"]*\1/g, '')
  );
}

/**
 * Drawing size for a diagram: as wide as the content column, height in
 * proportion. With large text it is drawn bigger (up to ×2) and the screen
 * lets the learner scroll sideways, so its labels grow with the text size.
 */
export function svgSize(
  viewBox: { width: number; height: number },
  columnWidth: number,
  zoom = 1,
): { width: number; height: number } {
  const width = Math.round(columnWidth * Math.min(Math.max(zoom, 1), 2));
  const height = Math.round((width * viewBox.height) / viewBox.width);
  return { width, height };
}
