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
 * `accent-fill` sits behind WHITE text on the web, so as a box fill it
 * becomes the forest green (white text on forest passes AA in both themes),
 * and the white text itself becomes `onForest`.
 *
 * `accent-fill` is also used for other things, where forest would vanish on
 * the dark background (1.66:1). See ACCENT_FILL_BY_ROLE below.
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

/**
 * `accent-fill` depends on WHAT it colours:
 * - text            → `accentText` (green text, ≥4.5:1 on paper and on raised);
 * - a box's fill    → `forest` (the box holds white text);
 * - anything else   → `accent` (lines, outlines, icons: ≥3:1, WCAG 1.4.11).
 */
const ACCENT_FILL_BY_ROLE = { text: 'accentText', box: 'forest', mark: 'accent' } as const satisfies Record<string, keyof Palette>;
const TEXT_TAGS = new Set(['text', 'tspan']);

/** Swap var(--accent-fill) inside one tag, by the role it plays there. */
function accentFillByRole(tag: string, attrs: string, palette: Palette): string {
  return attrs.replace(/\b(fill|stroke)=(['"])var\(\s*--accent-fill\s*\)\2/g, (_m, attr: string, q: string) => {
    const role = TEXT_TAGS.has(tag) ? 'text' : tag === 'rect' && attr === 'fill' ? 'box' : 'mark';
    return `${attr}=${q}${palette[ACCENT_FILL_BY_ROLE[role]]}${q}`;
  });
}

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
      // accent-fill by role (text / box / mark), before the generic swap.
      .replace(/<([a-zA-Z]+)\b([^>]*)>/g, (_m, tag: string, attrs: string) => `<${tag}${accentFillByRole(tag.toLowerCase(), attrs, palette)}>`)
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

/** The smallest label in a diagram, in viewBox units (SVG's default is 16). */
export function svgMinFontSize(svg: string): number {
  const sizes = [...svg.matchAll(/<(?:text|tspan)\b[^>]*\bfont-size=(['"])([\d.]+)(?:px)?\1/g)].map((m) => Number(m[2]));
  const valid = sizes.filter((n) => Number.isFinite(n) && n > 0);
  return valid.length ? Math.min(...valid) : 16;
}

/** The smallest label a learner should have to read, in points (spec: caption 13). */
export const MIN_LABEL_PT = 13;

/**
 * Drawing size for a diagram. It is drawn wide enough that its SMALLEST
 * label is at least 13pt (×1.5 at most with large text), never narrower
 * than the content column; anything wider than the column scrolls sideways.
 * `maxColumns` caps the width so a tiny label can't make a huge drawing.
 */
export function svgSize(
  viewBox: { width: number; height: number },
  columnWidth: number,
  opts: { minFont?: number; fontScale?: number; maxColumns?: number } = {},
): { width: number; height: number; labelPt: number } {
  const minFont = opts.minFont ?? 16;
  const target = MIN_LABEL_PT * Math.min(Math.max(opts.fontScale ?? 1, 1), 1.5);
  const needed = (viewBox.width * target) / minFont;
  const width = Math.round(Math.min(Math.max(columnWidth, needed), columnWidth * (opts.maxColumns ?? 4)));
  const height = Math.round((width * viewBox.height) / viewBox.width);
  // What the smallest label actually measures once drawn.
  const labelPt = Math.round(((minFont * width) / viewBox.width) * 10) / 10;
  return { width, height, labelPt };
}
