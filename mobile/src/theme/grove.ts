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
import type { TextStyle } from 'react-native';
import { dark, fieldType, font, LARGE_TEXT, light, maxScale, percentSup, radius, serifNumeral, type, type FieldVariant } from './tokens';

/** Grove colours, per theme (`g` from useTheme()). Hex only, like the Palette. */
export interface GroveInk {
  navFloat: string; // the floating tab bar (kit --nav-float)
  seed: string; // a seed in the plant charts (kit --seed)
  seedEdge: string; // a seed's outline (kit --seed-edge)
  soil: string; // ground lines: the week twig's branch, a chart's baseline (kit --soil). Decorative: under 3:1, words carry the state
  leafEmpty: string; // empty leaf outlines and locked stages (kit --leaf-empty, the web's --border2). Decorative, like soil
  // Grove Phase 4 (PHASE4.md section 6): the outline of an area ring or a read mark that is still empty
  // (the web's --leaf-line). It means "not started", so it keeps 3:1 or more (3.94 light, 3.31 dark).
  leafLine: string;
  // The light paper sheet a pressed badge sits on, on You's badge shelf (kit 04 `.spec`). Light in
  // BOTH themes, as the kit draws it: the art keeps its light-sheet inks (E3 #24603F is about 6:1 on
  // it), and in dark the sheet stands well clear of the card (#1D2621).
  specimen: string;
}
export const groveLight: GroveInk = { navFloat: '#FFFFFF', seed: '#8A6A48', seedEdge: '#5B4B3C', soil: '#A89B83', leafEmpty: '#CDC9BC', leafLine: '#86806F', specimen: '#E9E6DC' };
export const groveDark: GroveInk = { navFloat: '#1A231D', seed: '#8A6A48', seedEdge: '#E9D9C4', soil: '#6B5844', leafEmpty: '#39443C', leafLine: '#6A776D', specimen: '#E9E2D2' };

/**
 * The pale paper tape across the top of a pressed badge on the shelf (kit 04, the strip on `.spec`).
 * One value for both themes, because the sheet under it is light in both. Kept out of GroveInk,
 * which holds hex values only.
 */
export const specimenTape = 'rgba(214,205,182,0.85)';

/**
 * Grove Phase 4 (PHASE4.md section 6): the ink on a mint fill (the hero kind button, the "Next" pill).
 * The same dark ink in both themes, because mint is the same in both (#A9D9BA with #17231B, 10.3:1).
 * Never `c.ink`: in dark that is a light colour, which fails on mint.
 */
export const mintInk = light.onPill;

/**
 * Grove Phase 4: the glyph tile at the top right of the Learn and Practice heroes. 64pt, the hero's
 * track colour, the glyph in mint. Decorative only, and not drawn from text scale 1.3.
 */
export const glyphTile = { size: 64, radius: 18, glyph: 44 } as const;

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
 * summary, the web's bold; the Coach me word in a stem). The size and line height come from the
 * sentence's own variant: only the weight steps up (TYPE_SCALE.md row 197).
 */
export const groveEmphasis = { fontFamily: font.serif500 } as const;
/**
 * The sans twin: a link inside a Figtree sentence ("Go to Drills" after a meta line) keeps the
 * sentence's size and line and steps up to Figtree 600 only, so it reads as a link (TYPE_SCALE.md
 * row 13 and R2).
 */
export const groveEmphasisSans = { fontFamily: font.sans600 } as const;

// ── The type scale's extra roles (design-notes/grove/TYPE_SCALE.md section 3) ──────────────────
//
// Plain English: every word in the app uses one of 15 text roles, and every serif number one of
// five numeral steps. Most roles already exist as `type.*` in theme/tokens.ts (display, hero,
// headline, label, body, small, meta, caption, tab ...). The rest are defined here, ONCE, each
// with how far it may grow when the learner turns up the phone's text size (`max`, the
// maxFontSizeMultiplier). `<T v="...">` in components/ui.tsx takes these names too, so a screen
// writes `<T v="numStat">` and never a size of its own.
//
// Why here and not in tokens.ts: tokens.ts is compiled into the website's bundles, so editing it
// rewrites index.html. These are aliases of tokens.ts values plus six new literal styles.

/** One role: its style and how far it grows with the phone's text size. */
export interface TypeRole {
  style: TextStyle;
  max: number;
}

export const role = {
  /** Fraunces 400 roman 18/26: a question read in place, You's summary sentence, a recapped question. */
  read: { style: { fontFamily: font.serif400, fontSize: 18, lineHeight: 26 }, max: 2 },
  /** Fraunces 500 22/26: card titles, a sheet's name, a stat's value in words. Stops at x1.6 so it stays under hero. */
  title: { style: fieldType.value, max: 1.6 },
  /** Fraunces 400 italic 16/22: the coach's line, italic sublines, "Why not B", key and step numbers. */
  aside: { style: fieldType.sub, max: 2 },
  /** Figtree 600 17/22: solid buttons (primary, secondary, danger). */
  button: { style: { fontFamily: font.sans600, fontSize: 17, lineHeight: 22 }, max: 2 },
  /** Figtree 600 15/20: chips, segmented controls, pills that are buttons. */
  chip: { style: { fontFamily: font.sans600, fontSize: 15, lineHeight: 20 }, max: 2 },
  /** Figtree 500 16/24: your pick on the answer screen (always beside "Your pick" and its mark). */
  optionPick: { style: { fontFamily: font.sans500, fontSize: 16, lineHeight: 24 }, max: 2 },
  /** Figtree 600 16/24: the best answer on the answer screen (always beside "Best answer" and its mark). */
  optionBest: { style: { fontFamily: font.sans600, fontSize: 16, lineHeight: 24 }, max: 2 },
  /** Figtree 600 14/18: the letter in an option badge (exception E4; the badge grows with it). */
  badgeLetter: { style: { fontFamily: font.sans600, fontSize: 14, lineHeight: 18 }, max: 2 },
  /** Fraunces 500 52/52: the one big score (results, a game round). */
  numScore: { style: type.number, max: 1.3 },
  /** Fraunces 500 38/41: the readiness range "63 to 73". */
  numRange: { style: serifNumeral(38), max: 1.3 },
  /** Fraunces 500 30/32: stat rows (Answered, Correct, Accuracy; results stats). */
  numStat: { style: serifNumeral(30), max: 1.3 },
  /** Fraunces 500 22/26: tile numbers, inline counts in a card ("59 due"); the same metric as title. */
  numValue: { style: fieldType.value, max: 1.3 },
  /** Fraunces 500 20/22: a number inside a row or list (an area's %, a list count). */
  numInline: { style: serifNumeral(20), max: 1.3 },
} as const satisfies Record<string, TypeRole>;
export type RoleName = keyof typeof role;

/**
 * A chart's scale and line labels (TYPE_SCALE.md exception E1, `fg label`, row 176a): Figtree 500
 * 13/17, the size the web's charts use, at every width. The axis numbers (0, 50, 70, 100) and the
 * "70 line" words use it, so they no longer look tiny beside the chart's other words. It is a
 * style for `FieldText v="tiny"`, which keeps the chart's x1.3 cap (its list takes over after).
 */
export const chartLabel = { fontFamily: font.sans500, fontSize: 13, lineHeight: 17 } as const satisfies TextStyle;
/** The area name under a chart column: fg name, Figtree 600 13/17 (TYPE_SCALE.md row 176a, E1). */
export const chartName = { fontFamily: font.sans600, fontSize: 13, lineHeight: 17 } as const satisfies TextStyle;

/** The five numeral steps, by size (52 score, 38 range, 30 stat, 22 value, 20 inline). Nothing else. */
export type NumStep = 52 | 38 | 30 | 22 | 20;
export const numRole: Record<NumStep, TypeRole> = { 52: role.numScore, 38: role.numRange, 30: role.numStat, 22: role.numValue, 20: role.numInline };

/** The raised % after a serif numeral: 0.48 of the numeral, never under 11pt (TYPE_SCALE.md section 2.1). */
export function percentFor(size: NumStep): TextStyle {
  return percentSup(Math.max(size, 23));
}

/**
 * The readiness range's numeral step: 38, stepping down only when space runs out (TYPE_SCALE.md
 * section 2.1). Large text (x1.3 and up) or a narrow phone (under 360pt) is one step (30); both
 * together are two (22). Always "63 to 73", never one number.
 */
export function rangeStep(fontScale: number, width: number): 38 | 30 | 22 {
  const tight = (fontScale >= LARGE_TEXT ? 1 : 0) + (width < 360 ? 1 : 0);
  return tight === 0 ? 38 : tight === 1 ? 30 : 22;
}

/**
 * The Field Guide cuts the type scale retired (TYPE_SCALE.md rows 188, 190, 206, 207, 208): each now
 * draws its role, so `FieldText` callers keep their variant names and get the scale's size. The
 * old cuts stay in tokens.ts (bundled into the website) until the next bundle rebuild.
 * - value: a card title, a sheet's name, a value in words: title (x1.6). Numbers use `<T v="numValue">`.
 * - verdict: "Correct" / "Not quite" is hero 28/34 (was 30/34).
 * - recap: the recapped question is read 18/26 (was 17/24).
 * - option / best: the answer screen's rows are 16/24 (were 16/22).
 * - sub, keyNo, why: aside 16/22 at x2 (why was 15/21; keyNo stopped at x1.3).
 */
export const fieldRole: Partial<Record<FieldVariant, TypeRole>> = {
  value: role.title,
  verdict: { style: type.hero, max: maxScale.hero },
  recap: role.read,
  option: role.optionPick,
  best: role.optionBest,
  sub: role.aside,
  keyNo: role.aside,
  why: role.aside,
};
