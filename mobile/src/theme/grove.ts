/**
 * Grove design tokens for the phone (Grove Phase 1, design-notes/grove/GROVE_HANDOFF.md section 4).
 *
 * Plain English: Grove is the owner's newest look (rounded cards, a floating tab bar, progress
 * drawn as a plant). This file holds ONLY what Grove adds. Nothing in theme/tokens.ts is renamed
 * or removed: every old name keeps working, and screens read the Grove additions from here.
 *
 * Why its own file and not tokens.ts: tokens.ts is compiled into the website's plant and cloud
 * bundles (scripts/web-plant-bundle.cjs), so ANY change there rebuilds those bundles and
 * rewrites index.html's `?v=` reference. This phase must not touch index.html, so the phone's
 * Grove additions live beside tokens.ts instead. They can move into tokens.ts in the release
 * that regenerates the website bundles anyway.
 *
 * Every colour here is the kit's value, matched to the web's CSS (index.html, the "Grove
 * uplift tokens" blocks). Contrast notes are in docs/mobile/DESIGN_SYSTEM.md section 21.9.
 */
import { dark, font, light, radius } from './tokens';

/** Grove colours, per theme (`g` from useTheme()). Hex only, like the Palette. */
export interface GroveInk {
  navFloat: string; // the floating tab bar (kit --nav-float)
  seed: string; // a seed in the plant charts (kit --seed)
  seedEdge: string; // a seed's outline (kit --seed-edge)
  soil: string; // ground lines: the week twig's branch, a chart's baseline (kit --soil). Decorative: under 3:1, words carry the state
  leafEmpty: string; // empty leaf outlines and locked stages (kit --leaf-empty, the web's --border2). Decorative, like soil
}
export const groveLight: GroveInk = { navFloat: '#FFFFFF', seed: '#8A6A48', seedEdge: '#5B4B3C', soil: '#A89B83', leafEmpty: '#CDC9BC' };
export const groveDark: GroveInk = { navFloat: '#1A231D', seed: '#8A6A48', seedEdge: '#E9D9C4', soil: '#6B5844', leafEmpty: '#39443C' };

/**
 * Grove corners: card = cards and plates, tile = inner tiles, buttons and the search field,
 * badge = 36pt icon badges, step = 30pt numbered step squares, square = 44pt square buttons
 * (You's Settings), bar = the floating tab bar. card and tile equal the old radius.lg and radius.md.
 */
export const groveRadius = { card: radius.lg, tile: radius.md, badge: 11, step: 9, square: 14, bar: 22 } as const;

/**
 * The Grove card and button measures. The plate (theme/tokens.ts `plate`) becomes the kit's card:
 * one 1pt `line` edge, `pad` inside (`padTight` across for a chart that wants the width),
 * `groveRadius.card` corners, no shadow. A label or stat tile has `groveRadius.tile` corners;
 * every plate-shaped button is 54 tall with `groveRadius.tile` corners (was 52 and 12).
 */
export const grovePlate = { edge: 1, pad: 16, padTight: 4, labelRadius: groveRadius.tile, button: 54, buttonRadius: groveRadius.tile } as const;

/**
 * The hero panel (--hero-panel). Dark: the kit's 165 degree gradient, darkest from 70% down.
 * Light: the existing forest panel (forestTop to forest, straight down), as the kit asks.
 * Drawn by components/ui.tsx ForestLight (SVG), never by a CSS gradient string.
 */
export interface HeroGradient {
  from: string;
  to: string;
  /** Where `to` is reached (0 to 1); it holds to the end after that. */
  toAt: number;
  /** CSS degrees: 180 = straight down, 165 = down and a little to the right. */
  angle: number;
}
export const heroPanel: { light: HeroGradient; dark: HeroGradient } = {
  light: { from: light.forestTop, to: light.forest, toAt: 1, angle: 180 },
  dark: { from: '#24452F', to: '#1A3324', toAt: 0.7, angle: 165 },
};
/** The hero's 1px top highlight (the kit's inset 0 1px 0 at 7% in dark; light keeps its 8%). */
export const heroHighlight = { light: 'rgba(255,255,255,0.08)', dark: 'rgba(255,255,255,0.07)' } as const;
/**
 * Small tiles inside a hero panel (--hero-inset). Light differs from the kit's suggestion
 * (white at 12%, which left onForest2 at 4.03:1): the dark inset's own ink at 20% instead,
 * onForest2 6.69:1 and sap 6.19:1 on it.
 */
export const heroInset = { light: 'rgba(17,22,19,0.2)', dark: 'rgba(17,22,19,0.35)' } as const;
/**
 * The floating tab bar's lift: the one shadow outside light-mode L2 cards (it must read as
 * above the page). Drawn with boxShadow; Android 7 and 8 fall back to elevation
 * (components/tabBar.tsx navLiftFor).
 */
export const navShadow = {
  light: '0 1px 2px rgba(23,35,27,0.06), 0 10px 28px -6px rgba(23,35,27,0.18)',
  dark: '0 14px 34px rgba(0,0,0,0.5)',
} as const;

/**
 * Marks drawn on the forest hero (Today's readiness ring), the same in both themes because the
 * hero is forest in both (the web's --hero-tick-* tokens):
 * - tickOn: a lit tick, and an answered seed dot (sap);
 * - tickOff: an unlit tick (forestTrack). Decorative: the caption says the numbers;
 * - dotEdge: an unanswered seed dot is an OUTLINE in this colour (3.9:1 or more on the panel),
 *   so answered and unanswered dots differ by shape, not by colour alone;
 * - tickRange: the ticks inside the readiness range (the kit's tip gold);
 * - mark: the clay marker at the 80 study bar;
 * - disc: the dark disc behind the plant;
 * - soil / seedEdge / seedLine: the kit's seed drawing, on the disc.
 */
export interface HeroInk {
  tickOn: string;
  tickOff: string;
  dotEdge: string;
  tickRange: string;
  mark: string;
  disc: string;
  soil: string;
  seedEdge: string;
  seedLine: string;
}
export const heroInk: { light: HeroInk; dark: HeroInk } = {
  light: { tickOn: light.sap, tickOff: light.forestTrack, dotEdge: '#8FBFA0', tickRange: '#E9C46A', mark: '#E9A07A', disc: '#1A402D', soil: '#6B5844', seedEdge: '#E9D9C4', seedLine: '#4E3A26' },
  dark: { tickOn: dark.sap, tickOff: dark.forestTrack, dotEdge: '#8FBFA0', tickRange: '#E9C46A', mark: '#E9A07A', disc: '#1A3324', soil: '#6B5844', seedEdge: '#E9D9C4', seedLine: '#4E3A26' },
};

/**
 * A word inside a reading-serif sentence, a weight heavier (Grove You C2: the focus area in You's
 * summary, the web's bold). The size and line height come from the sentence's own variant.
 */
export const groveEmphasis = { fontFamily: font.serif500 } as const;
