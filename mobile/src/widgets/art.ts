/**
 * Home-screen widget colours and drawings, as plain values and SVG strings.
 *
 * No widget library here (it loads only from `.android.ts(x)` files), so this
 * file is tested in Jest and can feed an iOS widget later.
 *
 * - Colours are the Grove tokens (theme/tokens.ts), light and dark, one set per
 *   card (1.48 "Study card": forest, paper, ruled card, plate, ink). Material
 *   You wallpaper colours are a later option (they need a small native module).
 * - The Kasama mark, the leaves, the growth rings and the plant are the app's
 *   own drawings: the same paths (theme/kasama.ts), the same ring maths
 *   (engine/ringGeometry.ts) and the same plant art (components/plant/art.ts).
 * - The plant is ALWAYS drawn awake: never the resting look, never a face.
 */
import { isPlantSpecies } from '../engine/plant';
import { ringArc, ringGeometry } from '../engine/ringGeometry';
import type { FaceTone, PlantSnap } from '../engine/widgets';
import { buildPlant, plantLayers, type ArtLook, type PNode } from '../components/plant/art';
import { KAI_LEAF, KAI_PAIR_DOWN, KAI_PAIR_UP, KAI_VEIN } from '../theme/kasama';
import { dark, font, kaisip, light } from '../theme/tokens';

export type WidgetTheme = 'light' | 'dark';

/** The colours one widget face uses. Hex only (the widget library takes no theme attributes). */
export interface WidgetColors {
  bg: `#${string}`;
  ink: `#${string}`;
  ink2: `#${string}`;
  accentText: `#${string}`;
  accent: `#${string}`;
  line: `#${string}`;
  track: `#${string}`;
  btn: `#${string}`;
  onBtn: `#${string}`;
  soft: `#${string}`;
  /** The Kasama mark's two tones on this surface. */
  markLeaf: `#${string}`;
  markPair: `#${string}`;
  /** The ruled card's lines and its clay margin line and "Q." / "Rule" label (decorative; the label passes AA). */
  rule: `#${string}`;
  margin: `#${string}`;
  /** A 1 dp outline, so a dark card doesn't vanish on a dark wallpaper (dark theme only). */
  border?: `#${string}`;
  /** The forest panel's lit top edge (a gradient down to `bg`), forest faces only. */
  bgTop?: `#${string}`;
  /** Botanical line art on the forest panel (decorative). */
  frond?: `#${string}`;
}

type Hex = `#${string}`;
const h = (s: string) => s as Hex;

/**
 * The colours for a card (1.48 "Study card"), in light or dark, all Grove tokens:
 * - forest: Today's plan only (forestTop → forest), the "do this now" signal;
 * - paper: the raised sheet colour; card: the same paper, ruled like an index card;
 * - plate: the plant's warm botanical plate (tipBg in light, soft in dark);
 * - ink: Road to exam's dark card (ink in light; the night bg with an outline in dark).
 * Dark paper, card, plate and ink cards carry a 1 dp `line` outline.
 */
export function widgetColors(tone: FaceTone, theme: WidgetTheme): WidgetColors {
  const p = theme === 'dark' ? dark : light;
  const darkBorder = theme === 'dark' ? { border: h(dark.line) } : {};
  if (tone === 'forest') {
    return {
      bg: h(p.forest),
      bgTop: h(p.forestTop),
      ink: h(p.onForest),
      ink2: h(p.onForest2),
      accentText: h(p.sap),
      accent: h(p.sap),
      line: h(p.forestTrack),
      track: h(p.forestTrack),
      btn: h(p.pill),
      onBtn: h(p.onPill),
      soft: h(p.forestTrack),
      markLeaf: h(kaisip.dark.leaf),
      markPair: h(kaisip.dark.pair),
      rule: h(p.forestTrack),
      margin: h(p.sap),
      frond: h(p.forestLine),
    };
  }
  if (tone === 'ink') {
    // Light: the ink colour as the card; dark: the night background, outlined.
    return {
      bg: h(theme === 'dark' ? dark.bg : light.ink),
      ink: h(theme === 'dark' ? dark.ink : light.bg),
      ink2: h(theme === 'dark' ? dark.ink2 : light.onForest2),
      accentText: h(dark.sap),
      accent: h(dark.sap),
      line: h(theme === 'dark' ? dark.line : light.forestTrack),
      track: h(theme === 'dark' ? dark.track : light.forestTrack),
      btn: h(dark.pill),
      onBtn: h(dark.onPill),
      soft: h(dark.soft),
      markLeaf: h(kaisip.dark.leaf),
      markPair: h(kaisip.dark.pair),
      rule: h(dark.line),
      margin: h(dark.clay),
      // Dark: the night-coloured card gets a visible 1 dp edge (the control outline, ≥ 3:1), or it melts into a dark wallpaper.
      ...(theme === 'dark' ? { border: h(dark.control) } : {}),
    };
  }
  return {
    // Paper: the raised sheet colour, a step above the wallpaper-facing screen colour. The plate is warmer.
    bg: h(tone === 'plate' ? (theme === 'dark' ? p.soft : p.tipBg) : theme === 'dark' ? p.raised : p.raised2),
    ink: h(p.ink),
    ink2: h(p.ink2),
    accentText: h(p.accentText),
    accent: h(p.accent),
    line: h(p.line),
    track: h(p.track),
    btn: h(p.ink),
    onBtn: h(theme === 'dark' ? p.raised : p.raised2),
    soft: h(p.soft),
    markLeaf: h(kaisip[theme].leaf),
    markPair: h(kaisip[theme].pair),
    rule: h(p.line),
    margin: h(p.clay),
    ...darkBorder,
  };
}

/** The app's own fonts, bundled into the widget build (app.json plugin `fonts`). */
export const WIDGET_FONTS = {
  serif: font.serif500,
  serifItalic: font.serif400Italic,
  sans: font.sans400,
  sansMedium: font.sans500,
  sansBold: font.sans600,
} as const;

const attr = (v: unknown) => String(v).replace(/[<>&"]/g, '');

/** The Kasama mark (three leaves), on its own. The vein is drawn in the surface colour. */
export function markSvg(c: Pick<WidgetColors, 'markLeaf' | 'markPair' | 'bg'>): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="52 30 102 140">` +
    `<path d="${KAI_LEAF}" fill="${c.markLeaf}"/>` +
    `<path d="${KAI_VEIN}" stroke="${c.bg}" stroke-width="4" stroke-linecap="round" fill="none"/>` +
    `<path d="${KAI_PAIR_UP}" fill="${c.markPair}"/>` +
    `<path d="${KAI_PAIR_DOWN}" fill="${c.markPair}"/>` +
    `</svg>`
  );
}

/** One week leaf: filled (a study day) or an outline (any other day). Today's leaf is drawn a little bolder. */
export function leafSvg(filled: boolean, today: boolean, c: Pick<WidgetColors, 'accent' | 'ink' | 'ink2' | 'line'>): string {
  const d = 'M12 30 C19 23 19 9 12 2 C5 9 5 23 12 30Z';
  const stroke = today ? c.ink : filled ? c.accent : c.ink2;
  const fill = filled ? c.accent : 'none';
  const width = today ? 2.2 : 1.4;
  const vein = filled ? `<path d="M12 26 V9" stroke="${c.line}" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"${filled ? '' : ' opacity="0.7"'}/>${vein}</svg>`;
}

/** A soft frond for the forest panel's corner (decorative, the Today hero's motif). */
export function frondSvg(color: string): string {
  const leaves = [0, 1, 2, 3, 4]
    .map((i) => {
      const y = 18 + i * 22;
      return `<path d="M60 ${y} C72 ${y - 10} 84 ${y - 8} 92 ${y - 2} C82 ${y + 6} 70 ${y + 6} 60 ${y}Z" fill="none" stroke="${attr(color)}" stroke-width="1.4"/>` + `<path d="M60 ${y + 4} C48 ${y - 6} 36 ${y - 4} 28 ${y + 2} C38 ${y + 10} 50 ${y + 10} 60 ${y + 4}Z" fill="none" stroke="${attr(color)}" stroke-width="1.4"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><path d="M60 140 C58 100 62 50 66 4" fill="none" stroke="${attr(color)}" stroke-width="1.6"/>${leaves}</svg>`;
}

/**
 * The growth rings (the Today and You ring maths): one ring per domain, inner =
 * domain 1, arc length = mastery (0–100). One colour (the accent), so the widget
 * reads as wood, not as a chart to decode. `faint`: before the first estimate,
 * tracks only, drawn softly.
 */
export function ringsSvg(rings: readonly number[], weights: readonly number[], c: Pick<WidgetColors, 'track' | 'accent'>, faint = false): string {
  const k = 0.24;
  const r0 = 13;
  const gap = 3;
  const w = weights.length ? weights : [18, 18, 12, 26, 26];
  const outer = r0 + w.reduce((s, x) => s + x * k, 0) + gap * Math.max(0, w.length - 1);
  const size = Math.ceil(outer * 1.045) * 2 + 2;
  const cx = size / 2;
  const geo = ringGeometry(w, k, r0, gap, cx);
  let body = '';
  geo.forEach((ring) => {
    body += `<path d="${ring.track}Z" fill="none" stroke="${c.track}" stroke-width="${ring.w.toFixed(2)}"/>`;
  });
  if (faint) {
    // Before the first estimate: the tracks at full strength and a dashed outer edge, so the hero still shows (1.48).
    const last = geo[geo.length - 1];
    if (last) body += `<circle cx="${cx}" cy="${cx}" r="${(last.rm + last.w / 2 + 1.5).toFixed(2)}" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
  }
  if (!faint) {
    geo.forEach((ring, i) => {
      const m = Math.max(0, Math.min(100, rings[i] ?? 0)) / 100;
      if (m <= 0) return;
      const arc = ringArc(cx, ring.rm, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, m)).d;
      body += `<path d="${arc}" fill="none" stroke="${c.accent}" stroke-width="${ring.w.toFixed(2)}" stroke-linecap="round"/>`;
    });
    body += `<circle cx="${cx}" cy="${cx}" r="${(r0 * 0.32).toFixed(2)}" fill="${c.accent}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>`;
}

/**
 * The index card's ruling (1.48): a clay margin line under the card's top row
 * and faint rules every 22 dp below it. Decorative, drawn behind the words.
 */
export function ruledSvg(width: number, height: number, top: number, c: Pick<WidgetColors, 'rule' | 'margin'>): string {
  const w = Math.max(1, Math.round(width));
  const hgt = Math.max(1, Math.round(height));
  let lines = `<path d="M0 ${top} H${w}" stroke="${c.margin}" stroke-opacity="0.55" stroke-width="1.2"/>`;
  for (let y = top + 22; y < hgt - 4; y += 22) lines += `<path d="M0 ${y} H${w}" stroke="${c.rule}" stroke-width="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}">${lines}</svg>`;
}

/** The play mark inside Today's plan's round button on a 2×1 (the whole widget is the Start tap). */
export function playSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path d="M3.2 1.6 L10.4 6 L3.2 10.4Z" fill="${attr(color)}"/></svg>`;
}

function nodeSvg(n: PNode | null | undefined): string {
  if (!n) return '';
  let a = '';
  if (n.fill !== undefined) a += ` fill="${attr(n.fill)}"`;
  if (n.opacity !== undefined) a += ` opacity="${attr(n.opacity)}"`;
  if (n.transform) a += ` transform="${attr(n.transform)}"`;
  if (n.stroke) a += ` stroke="${attr(n.stroke)}" stroke-width="${attr(n.sw)}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (n.t) {
    case 'g':
      return `<g${a}>${n.children.map(nodeSvg).join('')}</g>`;
    case 'path':
      return `<path d="${attr(n.d)}"${a}/>`;
    case 'circle':
      return `<circle cx="${n.cx}" cy="${n.cy}" r="${n.r}"${a}/>`;
    case 'ellipse':
      return `<ellipse cx="${n.cx}" cy="${n.cy}" rx="${n.rx}" ry="${n.ry}"${a}/>`;
  }
}

/**
 * The learner's plant at its growth, in its look, as one SVG. Always awake
 * (resting is never passed), never a face, no visitor and no keepsakes: a
 * widget shows the plant, not a mood. Null for a species this build doesn't know.
 */
export function plantSvg(p: PlantSnap, theme: WidgetTheme): string | null {
  if (!isPlantSpecies(p.species)) return null;
  const look: ArtLook = {
    ...(p.style === 'botanical' || p.style === 'storybook' ? { style: p.style } : {}),
    ...(p.palette ? { palette: p.palette as ArtLook['palette'] } : {}),
    ...(p.ground ? { ground: p.ground } : {}),
    ...(p.planter ? { planter: p.planter } : {}),
    keepsakes: [],
  };
  const built = buildPlant({ species: p.species, stage: Math.max(1, Math.min(6, p.growth)), quietLook: true, lod: 'small', theme, resting: false, mood: 'idle', drift: false, look, px: 120, fit: true });
  const L = plantLayers(built.root);
  const kids = (g: { children: PNode[] }) => g.children.map(nodeSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${attr(built.frame)}">${kids(L.back)}${kids(L.plant)}${kids(L.front)}</svg>`;
}
