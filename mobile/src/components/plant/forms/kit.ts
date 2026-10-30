/**
 * The plant FORMS' drawing kit (mobile 1.50). Ported from the art masters
 * (scratchpad evolve/art13/src/kit.cjs and parts.cjs), so every species'
 * four forms and five Form IV finals are drawn exactly as the designer drew
 * them, from the same few parts.
 *
 * Plain English for the founder:
 * - It makes the SAME node shapes as art.ts (g, path, circle): no clip
 *   paths, no gradients, no text. So <Plant>, <LivePlant>, the website and
 *   the widget draw a form with no change.
 * - Line widths are set in POINTS and turned into drawing units at the end
 *   (botanical.ts scaleLines), so a 1.5pt line is 1.5pt at any size.
 * - Colours come only from theme/tokens.ts (plantLeaf, plantArt, plantLine,
 *   plantForm). Fills are OPAQUE (the page colour mixed with the plant's),
 *   so overlapping trunk and limbs never show a darker "knot".
 * - Each part merges its shapes per paint (one fill path and one line path),
 *   which keeps a full Form IV under about 50 elements.
 *
 * Pure TypeScript: no React, no packages, and only TYPE imports from art.ts
 * (the website bundle compiles this file too; no import cycle).
 */
import type { FinalId } from '../../../engine/plantForms';
import type { PlantSpecies } from '../../../engine/plant';
import { plantArt, plantForm, plantLeaf, plantLine, type PlantLeafId } from '../../../theme/tokens';
import type { GNode, Lod, Paint, PathNode, PNode } from '../art';

export const A0 = plantArt;
export const LEAF = plantLeaf;
export type Pal = PlantLeafId;
export type V2 = [number, number];
export type Maybe = PNode | null | undefined | false;
/** Children may be nested lists (they are flattened), like the masters' `flat(9)`. */
export type Kids = (Maybe | Kids)[];

export const D2R = Math.PI / 180;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** One decimal (the masters' rounding, same as botanical.ts). */
export const f = (n: number) => Math.round(n * 10) / 10;

/** The masters' seeded random numbers (mulberry32): the same seed always draws the same plant. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── nodes ───────────────────────────────────────────────────────────────
function flat(xs: Kids, out: PNode[] = []): PNode[] {
  for (const x of xs) {
    if (Array.isArray(x)) flat(x, out);
    else if (x) out.push(x);
  }
  return out;
}
/**
 * Lines that lie inside a filled shape of their own group (a crown's outline
 * and hatch, a trunk's sides and furrows, a leaf's outline and midrib): the
 * fills already give the drawing's bounds, so measuring skips these (bounds()
 * reads every path: the costly part of a build). Padded by a unit for the
 * line's half-width when measured (botanical.ts measure).
 */
export const INSIDE = new WeakSet<PNode>();
/** Marks a line as inside its fills (see INSIDE). */
export function inside<T extends PNode | null>(n: T): T {
  if (n) INSIDE.add(n);
  return n;
}
/** A filled path (none when there is nothing to draw). */
export const P = (d: string, fill: string, extra: Paint = {}): PathNode | null => (d ? { t: 'path', d, fill, ...extra } : null);
/** A line, its width in POINTS. */
export const L = (d: string, stroke: string, pt: number, extra: Paint = {}): PathNode | null => (d ? { t: 'path', d, fill: 'none', stroke, sw: pt, ...extra } : null);
export const C = (cx: number, cy: number, r: number, fill: string, extra: Paint = {}): PNode => ({ t: 'circle', cx: f(cx), cy: f(cy), r: f(r), fill, ...extra });
export const G = (id: string | null, children: Kids = [], extra: Paint = {}): GNode => ({ t: 'g', id, children: flat(children), ...extra });

// ── the paint set for one drawing ───────────────────────────────────────
/** Line weights in POINTS (botanical.ts LINE_PT). Hairlines: 0.5pt at full detail, 0.6pt smaller. */
const LINE_PT: Record<Lod, { main: number; fine: number }> = { icon: { main: 1.25, fine: 0 }, small: { main: 1.3, fine: 0.7 }, full: { main: 1.5, fine: 0.75 } };

export interface Paints {
  theme: 'light' | 'dark';
  lod: Lod;
  full: boolean;
  icon: boolean;
  small: boolean;
  main: number;
  fine: number;
  hair: number;
  /** The colourway's palette (leaves, or a flower's blooms) and the foliage palette (flowers). */
  pal: Pal;
  fol: Pal;
  lightTheme: boolean;
  lineOf: (p: Pal) => string;
  washOf: (p: Pal) => string;
  washOp: number;
  massFill: (p: Pal, dense?: boolean) => string;
  wood: (c: string) => string;
  woodFill: (c: string) => string;
  gift: (c: string) => string;
  giftFill: (c: string) => string;
  soil: string;
  stone: string;
  stoneFill: string;
  glow: string;
  glowOps: readonly [number, number, number];
  glowRing: string;
  gold: string;
  goldWash: string;
  wire: string;
  /** The sampaguita's white stars' line (plantLine.starLine, with the resting ink). */
  starLine: string;
  /** A domain's organ scale (domain 1…5), from its mastery: 0.5–1.25. */
  sc: (dom: number) => number;
}

export interface PaintOpts {
  pal: Pal;
  fol?: Pal;
  mix: (a: string, b: string, t: number) => string;
  /** Resting (on the dusk disc): a line's colour with a touch more ink. */
  rest?: (c: string) => string;
  /** The five organ scales (D1…D5). */
  sc?: readonly number[];
}

export function paint(theme: 'light' | 'dark', lod: Lod, o: PaintOpts): Paints {
  const TL = plantLine[theme];
  const F = plantForm[theme];
  const W = LINE_PT[lod];
  const mix = o.mix;
  const rest = o.rest ?? ((c: string) => c);
  const lt = theme === 'light';
  const lineOf = (p: Pal) => {
    const c = LEAF[p][TL.leaf];
    return rest(TL.paleLineMix && (p === 'pearl' || p === 'snow') ? mix(c, TL.woodInk, TL.paleLineMix) : c);
  };
  const sc = o.sc;
  return {
    theme,
    lod,
    full: lod === 'full',
    icon: lod === 'icon',
    small: lod === 'small',
    main: W.main,
    fine: W.fine || W.main * 0.7,
    hair: lod === 'full' ? 0.5 : 0.6,
    pal: o.pal,
    fol: o.fol ?? o.pal,
    lightTheme: lt,
    lineOf,
    washOf: (p) => LEAF[p][TL.washLeaf],
    washOp: TL.washLeafOp,
    massFill: (p, dense) => mix(F.page, LEAF[p][F.massTone], dense ? F.massMixDense : F.massMix),
    wood: (c) => mix(c, TL.woodInk, TL.woodMix),
    woodFill: (c) => mix(F.page, c, F.woodFillMix),
    gift: (c) => mix(c, TL.propInk, TL.giftMix),
    giftFill: (c) => mix(F.page, c, F.giftFillMix),
    soil: rest(TL.soil),
    stone: mix(F.stoneBase, F.stoneInk, F.stoneMix),
    stoneFill: mix(F.page, A0.keepsake.stone, F.stoneFillMix),
    glow: LEAF.gold[F.glowTone],
    glowOps: F.glowOps,
    glowRing: LEAF.gold[F.glowRingTone],
    gold: LEAF.gold[F.goldTone],
    goldWash: LEAF.gold[F.goldWashTone],
    wire: F.wire,
    starLine: rest(TL.starLine),
    sc: (dom) => {
      const v = sc?.[dom - 1];
      return typeof v === 'number' && Number.isFinite(v) ? Math.max(0.5, Math.min(1.25, v)) : 1;
    },
  };
}

// ── geometry ────────────────────────────────────────────────────────────
/** A closed smooth path through points (quadratics through the midpoints). */
export function smooth(pts: V2[]): string {
  const n = pts.length;
  const m = (a: V2, b: V2): V2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = m(pts[n - 1], pts[0]);
  let d = `M${f(s[0])} ${f(s[1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = m(p, pts[(i + 1) % n]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(q[0])} ${f(q[1])}`;
  }
  return d + 'Z';
}
export const qp = (a: V2, c: V2, b: V2, t: number): V2 => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
export const qa = (a: V2, c: V2, b: V2, t: number) => Math.atan2(2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]), 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]));
export const Q = (a: V2, c: V2, b: V2) => `M${f(a[0])} ${f(a[1])}Q${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`;

export interface Taper {
  closed: string;
  sides: string;
  left: V2[];
  right: V2[];
}
/** A tapered limb along a quadratic: its closed outline and its two open sides (no cut at the base). */
export function taper(p0: V2, pc: V2, p1: V2, w0: number, w1: number, N = 12): Taper {
  const Lp: V2[] = [];
  const Rp: V2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = qp(p0, pc, p1, t);
    const a = qa(p0, pc, p1, t);
    const w = lerp(w0, w1, Math.pow(t, 0.85)) / 2;
    Lp.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
    Rp.push([x - Math.sin(a) * w, y + Math.cos(a) * w]);
  }
  const pl = (arr: V2[]) => arr.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('');
  const ta = qa(p0, pc, p1, 1);
  const tip = Lp[N];
  const closed =
    pl(Lp) +
    `Q${f(tip[0] + (Rp[N][0] - tip[0]) / 2 + Math.cos(ta) * w1 * 0.6)} ${f(tip[1] + (Rp[N][1] - tip[1]) / 2 + Math.sin(ta) * w1 * 0.6)} ${f(Rp[N][0])} ${f(Rp[N][1])}` +
    [...Rp]
      .reverse()
      .slice(1)
      .map((p) => `L${f(p[0])} ${f(p[1])}`)
      .join('') +
    'Z';
  return { closed, sides: pl(Lp) + pl(Rp), left: Lp, right: Rp };
}

/** A scalloped crown mass. `flat` < 1 clamps the underside into a level tier. */
export function massD(cx: number, cy: number, rx: number, ry: number, n = 9, seed = 1, bulge = 0.2, flatK = 9): string {
  const r = rng(seed);
  const ph = r() * Math.PI;
  const Pp: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * Math.PI * 2;
    const j = 0.93 + r() * 0.1;
    Pp.push([cx + Math.cos(a) * rx * j, Math.min(cy + ry * flatK, cy + Math.sin(a) * ry * j), a]);
  }
  let d = `M${f(Pp[0][0])} ${f(Pp[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p = Pp[(i + 1) % n];
    const a0 = Pp[i][2];
    const a1 = i + 1 < n ? Pp[i + 1][2] : Pp[0][2] + Math.PI * 2;
    const am = (a0 + a1) / 2;
    const k = 1 + bulge * (0.8 + r() * 0.5);
    d += `Q${f(cx + Math.cos(am) * rx * k)} ${f(Math.min(cy + ry * flatK + ry * 0.1, cy + Math.sin(am) * ry * k))} ${f(p[0])} ${f(p[1])}`;
  }
  return d + 'Z';
}

/** Engraved hatch inside an ellipse, worked out exactly (no clip path): slanted lines, closer toward the bottom. */
export function hatchE(cx: number, cy: number, rx: number, ry: number, y0: number, y1: number, gap: number, ang = -14, even = false): string {
  const tn = Math.tan(ang * D2R);
  let d = '';
  let y = y0;
  const A = 1 / (rx * rx) + (tn * tn) / (ry * ry);
  while (y < y1) {
    const a = y - cy;
    const B = (2 * a * tn) / (ry * ry);
    const Cc = (a * a) / (ry * ry) - 1;
    const disc = B * B - 4 * A * Cc;
    if (disc > 0) {
      const s = Math.sqrt(disc);
      const u0 = (-B - s) / (2 * A);
      const u1 = (-B + s) / (2 * A);
      if (u1 - u0 > 1.2) d += `M${f(cx + u0)} ${f(y + u0 * tn)}L${f(cx + u1)} ${f(y + u1 * tn)}`;
    }
    const k = (y - y0) / Math.max(1, y1 - y0);
    y += gap * (even ? 1 : 1.3 - 0.6 * k);
  }
  return d;
}

/** Bark furrows down a trunk, between its two side polylines. */
export function furrows(left: V2[], right: V2[], n: number, seed: number, side = 1): string {
  const r = rng(seed);
  let d = '';
  const N = left.length - 1;
  for (let k = 0; k < n; k++) {
    const u = side > 0 ? 0.55 + (k / n) * 0.38 : 0.07 + (k / n) * 0.38;
    const i0 = 1 + Math.floor(r() * 2);
    const i1 = N - 1 - Math.floor(r() * 3);
    const pt = (i: number): V2 => [lerp(left[i][0], right[i][0], u) + (r() - 0.5) * 0.8, lerp(left[i][1], right[i][1], u)];
    const a = pt(i0);
    const m = pt(Math.floor((i0 + i1) / 2));
    const b = pt(i1);
    d += `M${f(a[0])} ${f(a[1])}Q${f(m[0] + (r() - 0.5) * 2)} ${f(m[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return d;
}

interface Seg {
  c: string;
  n: number[];
}
const PARSED = new Map<string, Seg[]>();
/** Parses an absolute M/L/Q/C/Z path once; every later use is plain arithmetic. */
function parse(d: string): Seg[] {
  const hit = PARSED.get(d);
  if (hit) return hit;
  const segs: Seg[] = [];
  for (const t of d.match(/[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []) {
    if (/^[MLQCZ]$/i.test(t)) segs.push({ c: t.toUpperCase(), n: [] });
    else if (segs.length) segs[segs.length - 1].n.push(parseFloat(t));
  }
  PARSED.set(d, segs);
  return segs;
}
/** Scale s (and an extra x squash sx), rotate a (radians), then move to (x, y): a shape drawn about (0, 0). */
export function xf(d: string, x: number, y: number, a: number, s: number, sx = 1): string {
  const c = Math.cos(a);
  const sn = Math.sin(a);
  let out = '';
  for (const g of parse(d)) {
    out += g.c;
    for (let i = 0; i + 1 < g.n.length; i += 2) {
      const u = g.n[i] * s * sx;
      const v = g.n[i + 1] * s;
      out += `${f(x + u * c - v * sn)} ${f(y + u * sn + v * c)} `;
    }
  }
  return out.trim();
}

// ── leaf and flower shapes (base at 0,0; tip toward −y) ─────────────────
interface Shape {
  d: string;
  h: number;
  rib?: string;
}
export type LeafKind = 'lens' | 'narrow' | 'long' | 'ovate' | 'heart' | 'oak' | 'petal' | 'star' | 'strap' | 'maple';
const MAPLE: Shape = (() => {
  const tips: V2[] = [
    [-90, 7.2],
    [-142, 6.4],
    [-38, 6.4],
    [-208, 4.6],
    [28, 4.6],
  ];
  const order = [3, 1, 0, 2, 4];
  const pt = (a: number, r: number) => [r * Math.cos(a * D2R), -6 + r * Math.sin(a * D2R)];
  let d = 'M0 0L' + pt(-240, 2).map(f).join(' ');
  order.forEach((ti, i) => {
    const [a, r] = tips[ti];
    d += ' L' + pt(a, r).map(f).join(' ');
    if (i < order.length - 1) d += ' L' + pt((a + tips[order[i + 1]][0]) / 2, 2.4).map(f).join(' ');
  });
  return { d: d + ' L' + pt(60, 2).map(f).join(' ') + 'Z', h: 13.2, rib: 'M0 -0.5L0 -11M0 -5L-4.6 -9M0 -5L4.6 -9' };
})();
export const SH: Record<LeafKind, Shape> = {
  lens: { d: 'M0 0Q0.57 -0.46 0 -1Q-0.57 -0.46 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.86' },
  narrow: { d: 'M0 0Q0.3 -0.46 0 -1Q-0.3 -0.46 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.88' },
  long: { d: 'M0 0Q0.24 -0.5 0 -1Q-0.24 -0.5 0 0Z', h: 1, rib: 'M0 -0.06L0 -0.9' },
  ovate: { d: 'M0 0C0.42 -0.12 0.44 -0.62 0 -1C-0.44 -0.62 -0.42 -0.12 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.86' },
  heart: { d: 'M0 0C0.2 0.04 0.56 -0.1 0.52 -0.4C0.48 -0.68 0.2 -0.82 0 -1C-0.2 -0.82 -0.48 -0.68 -0.52 -0.4C-0.56 -0.1 -0.2 0.04 0 0Z', h: 1, rib: 'M0 -0.04L0 -0.9M0 -0.4L0.3 -0.56M0 -0.4L-0.3 -0.56' },
  oak: {
    d: 'M0 0C-2 -.6 -3.6 -1.6 -2.8 -3.4C-5 -3.4 -5.2 -5.8 -3.2 -6.6C-5.2 -7.6 -4.4 -10.2 -2.2 -10C-2.6 -12.2 -.6 -13 0 -13C.6 -13 2.6 -12.2 2.2 -10C4.4 -10.2 5.2 -7.6 3.2 -6.6C5.2 -5.8 5 -3.4 2.8 -3.4C3.6 -1.6 2 -.6 0 0Z',
    h: 13,
    rib: 'M0 -0.5L0 -11.5',
  },
  petal: { d: 'M0 0Q0.62 -0.55 0 -1Q-0.62 -0.55 0 0Z', h: 1 },
  star: { d: 'M0 0Q0.25 -0.5 0 -1Q-0.25 -0.5 0 0Z', h: 1 },
  strap: { d: 'M-0.07 0C-0.16 -0.4 -0.14 -0.8 0 -1C0.14 -0.8 0.16 -0.4 0.07 0Z', h: 1, rib: 'M0 -0.04L0 -0.94' },
  maple: MAPLE,
};

export interface LeafPair {
  wash: string;
  line: string;
}
/** One leaf: its wash and its line (with the midrib at full detail). `ang` = base → tip (radians). */
export function leaf(kind: LeafKind, x: number, y: number, len: number, ang: number, S: Paints, sx = 1): LeafPair {
  const g = SH[kind] ?? SH.lens;
  const s = len / g.h;
  const a = ang + Math.PI / 2;
  const shape = xf(g.d, x, y, a, s, sx);
  return { wash: shape, line: S.full && g.rib ? shape + ' ' + xf(g.rib, x, y, a, s, sx) : shape };
}
/** A five-petal blossom. */
export function blossom(x: number, y: number, r: number, rot: number): string {
  let d = '';
  for (let i = 0; i < 5; i++) d += xf(SH.petal.d, x, y, (i * 72 + rot) * D2R, r * 1.25) + ' ';
  return d.trim();
}
/** A star flower (sampaguita): eight narrow petals. */
export function star(x: number, y: number, r: number, rot: number): string {
  let d = '';
  for (let i = 0; i < 8; i++) d += xf(SH.star.d, x, y, (i * 45 + rot) * D2R, r) + ' ';
  return d.trim();
}
/** A pine fascicle: needles fanned from a point. */
export function needles(x: number, y: number, len: number, ang: number, n = 5, spread = 0.9): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    d += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * len)} ${f(y + Math.sin(a) * len)}`;
  }
  return d;
}
export const disc = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`;
export const oval = (x: number, y: number, rx: number, ry: number) => `M${f(x - rx)} ${f(y)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x + rx)} ${f(y)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x - rx)} ${f(y)}Z`;

/** Gathers leaves into one wash path and one line path (the merge-per-paint rule). */
export interface LeafSet {
  add: (lf: LeafPair) => LeafSet;
  wash: () => string;
  line: () => string;
  n: () => number;
}
export function leafSet(): LeafSet {
  const w: string[] = [];
  const l: string[] = [];
  const set: LeafSet = {
    add(lf) {
      w.push(lf.wash);
      l.push(lf.line);
      return set;
    },
    wash: () => w.join(' '),
    line: () => l.join(' '),
    n: () => w.length,
  };
  return set;
}

// ── shared part builders ────────────────────────────────────────────────
/** Leaves (one group): wash and line, in one palette. */
export function leavesNode(S: Paints, id: string | null, set: LeafSet, p: Pal = S.fol, extra: Kids = []): GNode {
  return G(id, [...extra, P(set.wash(), S.washOf(p), { opacity: S.washOp }), inside(L(set.line(), S.lineOf(p), S.main))]);
}
/** The cutaway soil band (Form I, meadow only): a stipple and one dashed floor. */
export function cutaway(S: Paints, x0: number, x1: number, y0 = 171, y1 = 190, seed = 5): GNode | null {
  if (S.icon) return null;
  const r = rng(seed);
  let d = '';
  const n = S.small ? 12 : 30;
  for (let i = 0; i < n; i++) {
    const x = x0 + 6 + r() * (x1 - x0 - 12);
    const y = y0 + 4 + r() * (y1 - y0 - 6);
    d += `M${f(x)} ${f(y)}h0.6`;
  }
  const floor = Array.from({ length: Math.floor((x1 - x0) / 4) }, (_, i) => `M${f(x0 + i * 4)} ${f(y1)}h2`).join('');
  return G('cutaway', [L(d, S.soil, S.hair * 2, { opacity: 0.6 }), L(floor, S.soil, S.hair, { opacity: 0.45 })]);
}
/** Form IV's light (never at icon size): three stacked circles and one hairline ring. Static. */
export function glow(S: Paints, cx: number, cy: number, r0: number): GNode | null {
  if (S.icon) return null;
  const r = Math.max(20, Math.min(r0, cy - 2, cx - 2, 198 - cx));
  const [a, b, c] = S.glowOps;
  return G('glow', [
    C(cx, cy, r, S.glow, { opacity: a }),
    C(cx, cy, r * 0.74, S.glow, { opacity: b }),
    C(cx, cy, r * 0.48, S.glow, { opacity: c }),
    S.full ? { t: 'circle', cx: f(cx), cy: f(cy), r: f(r * 0.86), fill: 'none', stroke: S.glowRing, sw: S.hair, opacity: 0.3 } : null,
  ]);
}
/** Meeting stones (Moot) or pebbles in a pot: [x, y, r] each. */
export function stones(S: Paints, id: string, pts: [number, number, number][]): GNode {
  let d = '';
  let h = '';
  for (const [x, y, r] of pts) {
    d += `M${f(x - r)} ${f(y)}Q${f(x - r)} ${f(y - r * 0.9)} ${f(x)} ${f(y - r * 0.95)}Q${f(x + r)} ${f(y - r * 0.9)} ${f(x + r)} ${f(y)}Z`;
    if (S.full) h += hatchE(x, y - r * 0.4, r * 0.8, r * 0.5, y - r * 0.45, y, 1.4, 0, true);
  }
  return G(id, [P(d, S.stoneFill), h ? inside(L(h, S.stone, S.hair, { opacity: 0.6 })) : null, inside(L(d, S.stone, S.fine * 1.6))]);
}
/** A boulder (Holdfast): its outline, with hatch on its lower half. */
export function boulder(S: Paints, d: string, cx: number, cy: number, rx: number, ry: number): GNode {
  return G('stone', [P(d, S.stoneFill), S.icon ? null : inside(L(hatchE(cx, cy, rx * 0.85, ry * 0.8, cy, cy + ry, 1.8, 8), S.stone, S.hair, { opacity: 0.6 })), inside(L(d, S.stone, S.main))]);
}

// ── crowns, trunks, limbs, fruit ────────────────────────────────────────
/** One crown mass: a domain's (`dom` 1…5) foliage. */
export interface Mass {
  x: number;
  y: number;
  rx: number;
  ry: number;
  dom: number;
  n?: number;
  flat?: number;
  dense?: boolean;
  bulge?: number;
  hatchFrom?: number;
  /** Already sized by its organ scale (so it is never scaled twice). */
  scaled?: boolean;
}
export const M = (x: number, y: number, rx: number, ry: number, dom: number, o: Partial<Mass> = {}): Mass => ({ x, y, rx, ry, dom, ...o });

/**
 * Sizes each mass by its domain's organ scale, about its own centre (a weak
 * domain is a smaller, younger mass, never a gap). It changes the masses IN
 * PLACE, so fruit and blooms placed on them later sit on the sized crown.
 */
export function scaleMasses(S: Paints, ms: Mass[]): Mass[] {
  for (const m of ms) {
    if (m.scaled) continue;
    const k = S.sc(m.dom);
    m.rx *= k;
    m.ry *= k;
    m.scaled = true;
  }
  return ms;
}

export interface Organ {
  dom: number;
  x: number;
  y: number;
}
export interface CrownOpts {
  kind?: LeafKind;
  ll?: number;
  pal?: Pal;
  rim?: number;
  rimMin?: number;
  blossom?: boolean;
  needle?: boolean;
  seed?: number;
  dense?: boolean;
  /** false: no domain-N ids (a young form). */
  ids?: boolean;
  hatchAng?: number;
}
/**
 * A crown of masses, in paint order. All masses of one domain merge into its
 * `domain-N` group: a fill, a hatch, the rim leaves' wash and one line.
 */
export function crown(S: Paints, masses: Mass[], o: CrownOpts = {}): { node: GNode; organs: Organ[] } {
  const pal = o.pal ?? S.pal;
  const r = rng(o.seed || 11);
  if (o.ids !== false) scaleMasses(S, masses);
  const byDom = new Map<number, Mass[]>();
  for (const m of masses) {
    if (!byDom.has(m.dom)) byDom.set(m.dom, []);
    byDom.get(m.dom)!.push(m);
  }
  const lw = S.icon ? S.main : S.fine * 1.45;
  const organs: Organ[] = [];
  const groups = [...byDom.entries()].map(([dom, ms]) => {
    let fill = '';
    let hatch = '';
    const set = leafSet();
    let marks = '';
    let needleD = '';
    ms.forEach((m, k) => {
      const d = massD(m.x, m.y, m.rx, m.ry, m.n || Math.max(7, Math.round(m.rx / 3.4)), (o.seed || 11) + dom * 13 + k * 7, m.bulge ?? 0.2, m.flat ?? 9);
      fill += d;
      if (!S.icon) {
        const fy = m.flat !== undefined && m.flat < 1 ? m.y + m.ry * m.flat : m.y + m.ry;
        hatch += hatchE(m.x, m.y + m.ry * 0.05, m.rx * 0.82, m.ry * 0.8, m.y + m.ry * (m.hatchFrom ?? 0.05), Math.min(fy, m.y + m.ry), S.small ? 3.4 : m.dense || o.dense ? 1.8 : 2.2, o.hatchAng ?? -14);
        const per = (o.rim ?? 1.2) * (S.small ? 0.5 : 1);
        const n = Math.max(o.rimMin ?? 2, Math.round((m.rx / 10) * per * 2));
        for (let j = 0; j < n; j++) {
          const a = (-170 + (j + 0.5) * (160 / n) + (r() - 0.5) * 12) * D2R;
          const x = m.x + Math.cos(a) * m.rx * 0.95;
          const y = m.y + Math.sin(a) * m.ry * 0.95;
          if (m.flat !== undefined && y > m.y + m.ry * m.flat) continue;
          if (o.needle) {
            needleD += needles(x, y + 1.5, S.small ? 7 : 6, a + (r() - 0.5) * 0.3, 3, 1.1);
            continue;
          }
          if (o.blossom) marks += blossom(x, y, (o.ll || 9) * 0.32 * (S.small ? 1.25 : 1), r() * 70) + ' ';
          else set.add(leaf(o.kind || 'lens', x, y, (o.ll || 10) * (S.small ? 1.25 : 1), a + (r() - 0.5) * 0.6, S));
        }
      }
      organs.push({ dom, x: m.x, y: m.y });
    });
    const dense = ms.some((m) => m.dense) || o.dense;
    return G(o.ids === false ? null : `domain-${dom}`, [
      P(fill, S.massFill(pal, dense)),
      hatch ? inside(L(hatch, S.lineOf(pal), S.hair, { opacity: 0.5 })) : null,
      set.n() ? P(set.wash(), S.washOf(pal), { opacity: S.washOp }) : null,
      marks ? P(marks, S.washOf(pal), { opacity: 0.85 }) : null,
      inside(L(fill + ' ' + set.line() + (marks ? ' ' + marks : ''), S.lineOf(pal), lw)),
      needleD ? L(needleD, S.lineOf(pal), S.fine * 1.2) : null,
    ]);
  });
  return { node: G('canopy', groups), organs };
}

/** One limb: [p0, pc, p1, w0, w1]. */
export type Limb = [V2, V2, V2, number, number];
/** Limbs as tapers: one fill and one line (the 'branches' group). */
export function limbs(S: Paints, list: Limb[], bark: string, id = 'branches'): GNode {
  const fills: string[] = [];
  for (const [p0, pc, p1, w0, w1] of list) fills.push(taper(p0, pc, p1, w0 * (S.icon ? 1.15 : 1), w1, 10).closed);
  return G(id, [P(fills.join(' '), S.woodFill(bark)), inside(L(fills.join(' '), S.wood(bark), S.icon ? S.main * 0.9 : S.fine * 1.5))]);
}
export interface TrunkOpts {
  furrows?: number;
  seed?: number;
  extra?: ((t: Taper) => string) | null;
}
/** A trunk: an opaque fill, its sides (no cut at the soil) and bark furrows at full detail. */
export function trunk(S: Paints, p0: V2, pc: V2, p1: V2, w0: number, w1: number, bark: string, o: TrunkOpts = {}): GNode {
  const t = taper(p0, pc, p1, w0, w1, 16);
  const fur = S.full && o.furrows !== 0 && w0 > 8 ? furrows(t.left, t.right, o.furrows || 4, o.seed || 3) : '';
  const extra = o.extra && !S.icon ? o.extra(t) : '';
  return G('trunk', [P(t.closed, S.woodFill(bark)), fur || extra ? inside(L(fur + extra, S.wood(bark), S.hair * 1.4, { opacity: 0.75 })) : null, inside(L(t.sides, S.wood(bark), S.main))]);
}
/** Surface roots drawn as lines. */
export const rootLines = (S: Paints, d: string, bark: string): GNode | null => (S.icon ? null : G('roots', [L(d, S.wood(bark), S.main * 1.1)]));
/** Roots as tapers (gripping a stone). */
export const rootTapers = (S: Paints, list: Limb[], bark: string) => limbs(S, list, bark, 'roots');

/** Points along the lower rim of the masses (hanging fruit). */
export function lowerRim(masses: Mass[], n: number, seed: number, from = 0.15, to = 0.85): V2[] {
  const r = rng(seed);
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const m = masses[i % masses.length];
    const a = lerp(from, to, (Math.floor(i / masses.length) + r()) / Math.max(1, Math.ceil(n / masses.length))) * 180 * D2R;
    out.push([m.x + Math.cos(a) * m.rx * 0.7, m.y + Math.sin(a) * m.ry * (m.flat !== undefined && m.flat < 1 ? Math.min(0.9, m.flat) : 0.86)]);
  }
  return out;
}
/** Points on the upper rim (blooms sit on the crown). */
export function upperRim(masses: Mass[], n: number, seed: number): V2[] {
  const r = rng(seed);
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const m = masses[i % masses.length];
    const a = (-160 + r() * 140) * D2R;
    out.push([m.x + Math.cos(a) * m.rx * 0.72, m.y + Math.sin(a) * m.ry * 0.72]);
  }
  return out;
}

export function acorns(S: Paints, pts: V2[]): GNode | null {
  if (S.icon || !pts.length) return null;
  let nut = '';
  let cup = '';
  for (const [x, y] of pts) {
    nut += oval(x, y + 3, 2.3, 3.1);
    cup += `M${f(x - 2.9)} ${f(y + 1.4)}Q${f(x)} ${f(y - 2.6)} ${f(x + 2.9)} ${f(y + 1.4)}Z`;
  }
  const c = A0.gift.acorn;
  return G('fruit', [P(nut, S.giftFill(c)), P(cup, S.woodFill(A0.bark.oak)), L(nut + cup, S.gift(c), S.hair * 1.8)]);
}
const WING = 'M0 0C1.5 1 4.5 1.8 7 1.2C6 3.4 2.6 3.8 0.6 2.4Z';
export function samaras(S: Paints, pts: V2[]): GNode | null {
  if (S.icon || !pts.length) return null;
  let d = '';
  let st = '';
  for (const [x, y] of pts) {
    st += `M${f(x)} ${f(y - 4)}L${f(x)} ${f(y)}`;
    d += xf(WING, x, y, 0.5, 1) + ' ' + xf(WING, x, y, Math.PI - 0.5, 1, -1) + ' ';
  }
  const c = A0.gift.samara;
  return G('fruit', [P(d, S.giftFill(c)), L(st + d, S.gift(c), S.hair * 1.6)]);
}
/** Narra's golden sprays (blooms). */
export function goldSprays(S: Paints, pts: V2[], s = 1): GNode | null {
  if (!pts.length) return null;
  let stem = '';
  let fl = '';
  const r = rng(77);
  for (const [x, y] of pts) {
    if (S.icon) {
      fl += disc(x, y, 2.4 * s);
      continue;
    }
    const dir = r() > 0.5 ? 1 : -1;
    const len = 7 * s;
    const tip: V2 = [x + dir * len, y - len * 0.35];
    const c: V2 = [x + dir * len * 0.4, y - len * 0.75];
    stem += Q([x, y], c, tip);
    const n = S.small ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const t = 0.2 + (i / (n - 1)) * 0.8;
      const p = qp([x, y], c, tip, t);
      fl += disc(p[0] + (i % 2 ? 1.1 : -1.1), p[1] + (i % 2 ? 0.8 : -0.8), (1.5 - t * 0.6) * s);
    }
  }
  return G('blooms', [P(fl, S.goldWash, { opacity: 0.85 }), L(stem + fl, S.gold, S.hair * 1.4)]);
}
/** Blossom clusters (cherry, bonsai). */
export function blossoms(S: Paints, pts: V2[], r0: number, pal: Pal, id = 'blooms'): GNode | null {
  if (S.icon || !pts.length) return null;
  const rr = rng(31);
  let d = '';
  for (const [x, y] of pts) d += blossom(x, y, r0 * (S.small ? 1.2 : 1), rr() * 70) + ' ';
  return G(id, [P(d, S.washOf(pal), { opacity: 0.9 }), L(d, S.lineOf(pal), S.hair * 1.6)]);
}
export interface HangOpts {
  color: string;
  blush?: string;
  stalk?: number;
  rx: number;
  ry: number;
  shape?: (x: number, y: number) => string;
  id?: string;
}
/** Hanging fruit on stalks. */
export function hanging(S: Paints, pts: V2[], o: HangOpts): GNode | null {
  if (S.icon || !pts.length) return null;
  let st = '';
  let fr = '';
  let blush = '';
  for (const [x, y] of pts) {
    const len = o.stalk || 6;
    st += `M${f(x)} ${f(y)}Q${f(x + 1)} ${f(y + len * 0.5)} ${f(x)} ${f(y + len)}`;
    const cy = y + len + o.ry;
    fr += o.shape ? o.shape(x, cy) : oval(x, cy, o.rx, o.ry);
    if (o.blush) blush += oval(x + o.rx * 0.3, cy - o.ry * 0.3, o.rx * 0.45, o.ry * 0.4);
  }
  return G(o.id || 'fruit', [P(fr, S.giftFill(o.color)), blush && o.blush ? P(blush, o.blush, { opacity: 0.35 }) : null, L(st, S.wood(A0.bark.mango), S.hair * 1.4), L(fr, S.gift(o.color), S.hair * 1.8)]);
}
/** Drifting leaves or petals (the drift group): [x, y, len, angle°] each. */
export function drift(S: Paints, items: [number, number, number, number][], pal: Pal, kind: LeafKind | 'blossom' = 'lens'): Kids {
  if (!S.full) return [];
  const set = leafSet();
  let marks = '';
  for (const [x, y, len, a] of items) {
    if (kind === 'blossom') marks += blossom(x, y, len * 0.3, a) + ' ';
    else set.add(leaf(kind, x, y, len, a * D2R, S));
  }
  return [P(set.wash() + marks, S.washOf(pal), { opacity: S.washOp }), L(set.line() + marks, S.lineOf(pal), S.fine * 1.3)];
}
/** A seed (any outline), with an optional engraved line inside. */
export function seedPart(S: Paints, d: string, color: string, extraLine = ''): GNode {
  return G('seed', [P(d, S.woodFill(color)), extraLine && !S.icon ? L(extraLine, S.wood(color), S.hair * 1.6, { opacity: 0.8 }) : null, inside(L(d, S.wood(color), S.main))]);
}

// ── one form's drawing ──────────────────────────────────────────────────
/** What every form builder is given. */
export interface FormCtx {
  S: Paints;
  species: PlantSpecies;
  /** In a pot or planter (the species' own, or a chosen one), not the meadow. */
  inPot: boolean;
  /** The pot mouth's half-width (60 on the meadow). */
  span: number;
  /** Keepsakes on show (the clear dawn not counted): an Espalier frame narrows to leave them room. */
  keeps: number;
}
/** What every form builder returns (on the 200 × 200 stage, ground at y = 170). */
export interface FormOut {
  body: Kids;
  /** Props behind the plant that never move (a frame, a boulder, stones). */
  back?: Kids;
  /** Props in front (the front meeting stones, pebbles). */
  front?: Kids;
  drift?: Kids;
  /** Form I: the soil cutaway (meadow only). */
  cutaway?: GNode | null;
  /** Form IV: where its light sits [cx, cy, r]. */
  glow?: [number, number, number] | null;
  /** Where a visitor perches. */
  perch?: V2;
  organs?: Organ[];
}
export type FormBuilder = (c: FormCtx) => FormOut;
export type FormKey = 'I' | 'II' | 'III' | 'IV';
export interface FormLine {
  /** The species' default colourway palette (the masters' `pal`) and its foliage palette. */
  pal: Pal;
  fol?: Pal;
  forms: Record<FormKey, FormBuilder>;
  flavours: Record<Exclude<FinalId, 'own'>, FormBuilder>;
}
