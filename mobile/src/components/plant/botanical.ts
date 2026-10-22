/**
 * The botanical plant (mobile 1.40): the faceless default look.
 *
 * Plain English for the founder:
 * - Owner decision, 22 Oct 2026: a new plant is a calm field-guide drawing
 *   with no face. The rounded "storybook" art (and its face) is still one
 *   tap away in Your plant › Change its look › Style.
 * - It is drawn in the Grove botanical line style (DESIGN_SYSTEM §10.3): one
 *   round-capped ink line, lens leaves with a midrib on quadratic stems, and
 *   a soft watercolour wash from the plant's own colours under the line.
 * - It returns the SAME part tree as art.ts buildPlant (same node types,
 *   group names, anchors and frame rule), so <Plant>, <LivePlant> (breath,
 *   reactions, the growth sequence, the three motion layers), the website
 *   and every test that walks group names work unchanged. There is never a
 *   `face` group.
 *
 * Groups: mascot › [dusk] ground keepsakes-back tree › body › (roots, trunk,
 * branches, canopy › domain-1…5, leaves, blooms, [visitor]), drift, fx;
 * ground-front, keepsakes. Young growths use trunk, stem and leaves (Seed:
 * `sprout`, which onboarding lifts); flowers use stem, leaves, head, flower.
 *
 * Line weight is set in POINTS and turned into viewBox units at the end from
 * the real render size (`px`, `fit`): a true 1.5pt line on the 200pt Your
 * plant screen and about 1.3pt in Today's tight 72pt frame, never a hairline
 * on a Seed or a smear on an Elder.
 *
 * Pure TypeScript, no React and no packages: the website's plant bundle
 * (scripts/web-plant-bundle.cjs) compiles this file too. art.ts passes its
 * own helpers in (`BotanicalKit`), so this module never imports art.ts at
 * run time (no import cycle). Colours come only from theme/tokens.ts.
 *
 * Performance: leaf and petal shapes are parsed into numbers ONCE (PARSED),
 * so building an Elder oak at full detail stays within about 3 ms (the
 * prototype parsed every leaf with a regex and took ~17 ms).
 */
import type { PlantSpecies } from '../../engine/plant';
import type { ArtLook } from '../../engine/plantLooks';
import { plantArt as A0, plantLeaf, plantLine, plantTheme, type PlantLeafPalette, type PlantLineTone } from '../../theme/tokens';
import type { Anchors, Box, BuiltPlant, GNode, GroundResult, KeepsakePlacement, Lod, PNode, Paint, PathNode, PotKind } from './art';

// ── what art.ts lends us ────────────────────────────────────────────────
export interface BotanicalKit {
  rng: (seed: number) => () => number;
  hash: (s: string) => number;
  mix: (a: string, b: string, t: number) => string;
  scallop: (o: { cx: number; cy: number; rx: number; ry: number; n: number; seed: number; jit?: number; bulge?: number; flat?: number }) => string;
  bounds: (n: PNode) => Box;
  frameFor: (b: Box) => string;
  /** The storybook ground for this species and look (its pot is inked here; a meadow becomes soil lines). */
  ground: (species: PlantSpecies, look: ArtLook | undefined, stage: number, lod: Lod, theme: 'light' | 'dark') => { gr: GroundResult; potKind: PotKind };
  /** The visitor bird on the perch anchor (null at icon size or with no visitor). */
  visitor: (id: string | undefined, A: Anchors, lod: Lod) => GNode | null;
  /** The keepsakes, placed exactly as the storybook plant places them. */
  keepsakes: (ids: readonly string[] | undefined, stage: number, gr: GroundResult, tree: GNode, base: number, potKind: PotKind, A: Anchors, lod: Lod, theme: 'light' | 'dark') => KeepsakePlacement;
}

export interface BotanicalOpts {
  species: PlantSpecies;
  stage: number;
  organs?: readonly number[];
  lod?: Lod;
  theme?: 'light' | 'dark';
  resting?: boolean;
  drift?: boolean;
  look?: ArtLook;
  /** The rendered size in points (default 200). Only sets the line weight. */
  px?: number;
  /** True when the tight frame is the viewBox (Plant.tsx `tight`). Only sets the line weight. */
  fit?: boolean;
}

type V2 = [number, number];
const D2R = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** One decimal, like art.ts f() (Math.round: cheaper than toFixed on the hot path). */
const f = (n: number) => Math.round(n * 10) / 10;

/** Line weights in POINTS at the rendered size. */
const LINE_PT: Record<Lod, { main: number; fine: number }> = { icon: { main: 1.25, fine: 0 }, small: { main: 1.3, fine: 0.7 }, full: { main: 1.5, fine: 0.75 } };

// ── nodes (the same shapes as art.ts) ───────────────────────────────────
type Maybe = PNode | null | undefined | false;
const P = (d: string, fill: string, extra: Paint = {}): PathNode => ({ t: 'path', d, fill, ...extra });
const C = (cx: number, cy: number, r: number, fill: string, extra: Paint = {}): PNode => ({ t: 'circle', cx: f(cx), cy: f(cy), r: f(r), fill, ...extra });
const G = (id: string | null, children: Maybe[], extra: Paint = {}): GNode => ({ t: 'g', id, children: children.filter(Boolean) as PNode[], ...extra });
/** A line. Its width is in POINTS until scaleLines() turns every stroke into units. */
const L = (d: string, stroke: string, pt: number, extra: Paint = {}): PathNode => ({ t: 'path', d, fill: 'none', stroke, sw: pt, ...extra });

// ── path maths ──────────────────────────────────────────────────────────
/** A parsed absolute path: commands and their numbers. */
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
/** Scale s, rotate a (radians), then move to (x, y): a shape drawn about (0, 0). */
function xf(d: string, x: number, y: number, a: number, s: number): string {
  const c = Math.cos(a) * s;
  const sn = Math.sin(a) * s;
  let out = '';
  for (const g of parse(d)) {
    out += g.c;
    const n = g.n;
    for (let i = 0; i + 1 < n.length; i += 2) {
      const u = n[i];
      const v = n[i + 1];
      out += `${f(x + u * c - v * sn)} ${f(y + u * sn + v * c)} `;
    }
  }
  return out.trim();
}
/** Point and tangent on a quadratic. */
const qpt = (p0: V2, pc: V2, p1: V2, t: number): V2 => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * pc[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * pc[1] + t * t * p1[1]];
const qtan = (p0: V2, pc: V2, p1: V2, t: number) => Math.atan2(2 * (1 - t) * (pc[1] - p0[1]) + 2 * t * (p1[1] - pc[1]), 2 * (1 - t) * (pc[0] - p0[0]) + 2 * t * (p1[0] - pc[0]));
const Q = (p0: V2, pc: V2, p1: V2) => `M${f(p0[0])} ${f(p0[1])}Q${f(pc[0])} ${f(pc[1])} ${f(p1[0])} ${f(p1[1])}`;

interface Curve {
  pt: (t: number) => V2;
  tan: (t: number) => number;
}
/** A cubic centreline (the bonsai's S). */
function cubic(p0: V2, c1: V2, c2: V2, p3: V2): Curve {
  const pt = (t: number): V2 => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]];
  };
  const tan = (t: number) => {
    const u = 1 - t;
    const dx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p3[0] - c2[0]);
    const dy = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p3[1] - c2[1]);
    return Math.atan2(dy, dx);
  };
  return { pt, tan };
}
/**
 * A tapered limb along a centreline: a closed outline (for a wash or a solid
 * ink taper) and its two open sides (an outline with no cut line at the base).
 */
function taper(p0: V2, pc: V2, p1: V2, w0: number, w1: number, N = 12, curve?: Curve) {
  const Lp: V2[] = [];
  const Rp: V2[] = [];
  const at = curve ? curve.pt : (t: number) => qpt(p0, pc, p1, t);
  const tanAt = curve ? curve.tan : (t: number) => qtan(p0, pc, p1, t);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = at(t);
    const a = tanAt(t);
    const w = lerp(w0, w1, Math.pow(t, 0.85)) / 2;
    Lp.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
    Rp.push([x - Math.sin(a) * w, y + Math.cos(a) * w]);
  }
  const pl = (arr: V2[]) => arr.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('');
  const tip = Lp[N];
  const ta = tanAt(1);
  const closed =
    pl(Lp) +
    `Q${f(tip[0] + (Rp[N][0] - tip[0]) / 2 + Math.cos(ta) * w1 * 0.6)} ${f(tip[1] + (Rp[N][1] - tip[1]) / 2 + Math.sin(ta) * w1 * 0.6)} ${f(Rp[N][0])} ${f(Rp[N][1])}` +
    [...Rp]
      .reverse()
      .slice(1)
      .map((p) => `L${f(p[0])} ${f(p[1])}`)
      .join('') +
    'Z';
  return { closed, sides: pl(Lp) + ' ' + pl(Rp) };
}

// ── leaf shapes (base at 0,0, tip up toward −y) ─────────────────────────
interface LeafShape {
  d: string;
  h: number;
  rib: string;
}
const MAPLE: LeafShape = (() => {
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
const OAK: LeafShape = {
  d: 'M0 0C-2 -.6 -3.6 -1.6 -2.8 -3.4C-5 -3.4 -5.2 -5.8 -3.2 -6.6C-5.2 -7.6 -4.4 -10.2 -2.2 -10C-2.6 -12.2 -.6 -13 0 -13C.6 -13 2.6 -12.2 2.2 -10C4.4 -10.2 5.2 -7.6 3.2 -6.6C5.2 -5.8 5 -3.4 2.8 -3.4C3.6 -1.6 2 -.6 0 0Z',
  h: 13,
  rib: 'M0 -0.5L0 -11.5',
};
const lensD = (W: number): LeafShape => ({ d: `M0 0Q${W * 1.9} -0.46 0 -1Q${-W * 1.9} -0.46 0 0Z`, h: 1, rib: 'M0 -0.08L0 -0.86' });
const BANYAN: LeafShape = { d: 'M0 0C0.46 -0.15 0.5 -0.68 0 -1C-0.5 -0.68 -0.46 -0.15 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.86' };
type LeafKind = 'lens' | 'olive' | 'long' | 'banyan' | 'oak' | 'maple';
const LEAF: Record<LeafKind, LeafShape> = { lens: lensD(0.3), olive: lensD(0.19), long: lensD(0.16), banyan: BANYAN, oak: OAK, maple: MAPLE };
// Parsed once, when the module loads (the leaves every build uses).
for (const g of Object.values(LEAF)) {
  parse(g.d);
  parse(g.rib);
}

interface Leaf {
  wash: string;
  line: string;
}
/** One leaf: its wash outline and its line (outline, plus the midrib at full detail). `ang` = base → tip (radians). */
function leaf(kind: LeafKind, x: number, y: number, len: number, ang: number, fine: boolean): Leaf {
  const g = LEAF[kind] ?? LEAF.lens;
  const s = len / g.h;
  const a = ang + Math.PI / 2; // the shapes point up (−y)
  const shape = xf(g.d, x, y, a, s);
  return { wash: shape, line: fine ? shape + ' ' + xf(g.rib, x, y, a, s) : shape };
}
const PETAL_BLOSSOM = 'M0 0Q0.62 -0.55 0 -1Q-0.62 -0.55 0 0Z';
const PETAL_STAR = 'M0 0Q0.25 -0.5 0 -1Q-0.25 -0.5 0 0Z';
/** A five-petal blossom (cherry, narra, the bonsai's moss): reads as a flower at 3pt, never a bead. */
function blossom(x: number, y: number, r: number, rot: number): string {
  let d = '';
  for (let i = 0; i < 5; i++) d += xf(PETAL_BLOSSOM, x, y, (i * 72 + rot) * D2R, r * 1.25) + ' ';
  return d.trim();
}
/** A star flower (sampaguita): eight narrow petals. */
function star(x: number, y: number, r: number, rot: number): string {
  let d = '';
  for (let i = 0; i < 8; i++) d += xf(PETAL_STAR, x, y, (i * 45 + rot) * D2R, r) + ' ';
  return d.trim();
}
/** A pine fascicle: needles fanned from a point, along `ang`. */
function needles(x: number, y: number, len: number, ang: number, n = 5, spread = 0.9): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    d += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * len)} ${f(y + Math.sin(a) * len)}`;
  }
  return d;
}

// ── species ─────────────────────────────────────────────────────────────
type Kind = 'cloud' | 'pine' | 'palm' | 'bonsai' | 'sunflower' | 'lotus' | 'sampaguita' | 'cactus' | 'bamboo';
interface Crown {
  sx: number;
  sy: number;
  a0: number;
  step: number;
  spread: number;
  dy?: number;
}
interface Sp {
  kind: Kind;
  /** The leaf (trees) or bloom (flowers) palette: the colourway's. */
  pal: keyof typeof plantLeaf;
  /** Flowers: the foliage palette. */
  fol?: keyof typeof plantLeaf;
  bark?: string;
  leaf: LeafKind | 'blossom' | 'needle';
  crown?: Crown;
  flare?: number;
  flourish?: 'acorn' | 'samara' | 'narra' | 'blossom' | 'mango' | 'cone' | 'coconut' | 'moss';
  fruitFrom?: number;
  seed?: string;
  stripe?: boolean;
  /** Its own pot (the storybook art's): never a meadow. */
  pot?: boolean;
}
const BARK = A0.bark;
const GIFT = A0.gift;
const SPECIES: Record<PlantSpecies, Sp> = {
  oak: { kind: 'cloud', pal: 'grove', bark: BARK.oak, leaf: 'oak', crown: { sx: 1.06, sy: 0.98, a0: 198, step: 36, spread: 0.56 }, flourish: 'acorn' },
  maple: { kind: 'cloud', pal: 'ember', bark: BARK.maple, leaf: 'maple', crown: { sx: 0.92, sy: 1.12, a0: 214, step: 28, spread: 0.5, dy: -4 }, flourish: 'samara' },
  narra: { kind: 'cloud', pal: 'spring', bark: BARK.narra, leaf: 'banyan', flare: 0.8, crown: { sx: 1.3, sy: 0.7, a0: 188, step: 41, spread: 0.6, dy: 4 }, flourish: 'narra' },
  'cherry-blossom': { kind: 'cloud', pal: 'blossom', bark: BARK.cherry, leaf: 'blossom', crown: { sx: 1.18, sy: 0.84, a0: 194, step: 38, spread: 0.58, dy: 4 }, flourish: 'blossom' },
  mango: { kind: 'cloud', pal: 'evergreen', bark: BARK.mango, leaf: 'long', crown: { sx: 1.22, sy: 0.78, a0: 192, step: 39, spread: 0.6, dy: 8 }, flourish: 'mango', fruitFrom: 5 },
  pine: { kind: 'pine', pal: 'evergreen', bark: BARK.pine, leaf: 'needle', flourish: 'cone' },
  'coconut-palm': { kind: 'palm', pal: 'spring', bark: BARK.coconut, leaf: 'olive', flourish: 'coconut', fruitFrom: 5, seed: GIFT.coconutRipe },
  bonsai: { kind: 'bonsai', pal: 'grove', bark: BARK.bonsai, leaf: 'needle', flourish: 'moss', pot: true },
  sunflower: { kind: 'sunflower', pal: 'gold', fol: 'spring', leaf: 'banyan', seed: A0.seed.sunflower, stripe: true },
  lotus: { kind: 'lotus', pal: 'blossom', fol: 'grove', leaf: 'banyan', seed: A0.seed.lotus, pot: true },
  sampaguita: { kind: 'sampaguita', pal: 'pearl', fol: 'grove', leaf: 'olive', seed: A0.seed.sampaguita },
  cactus: { kind: 'cactus', pal: 'blossom', fol: 'cactus', leaf: 'lens', seed: A0.seed.cactus, pot: true },
  bamboo: { kind: 'bamboo', pal: 'grove', fol: 'grove', leaf: 'olive' },
};

/** The canopy boxes per growth: the same as art.ts GEO, so anchors and keepsakes land in the same places. */
const GEO: Record<number, { top: number; cy: number; rx: number; ry: number; wb: number; wt: number; ground: 1 | 2 | 3 }> = {
  3: { top: 116, cy: 94, rx: 38, ry: 33, wb: 8, wt: 4, ground: 2 },
  4: { top: 108, cy: 79, rx: 54, ry: 42, wb: 12, wt: 6, ground: 2 },
  5: { top: 102, cy: 70, rx: 68, ry: 49, wb: 17, wt: 8, ground: 3 },
  6: { top: 98, cy: 64, rx: 78, ry: 52, wb: 22, wt: 10, ground: 3 },
};
const GROUND_W = [0, 34, 46, 62];
const groundSize = (st: number) => (st <= 2 ? 1 : GEO[st].ground);

interface Ctx {
  key: PlantSpecies;
  sp: Sp;
  st: number;
  lod: Lod;
  TL: PlantLineTone;
  dark: boolean;
  pal: PlantLeafPalette;
  fol: PlantLeafPalette;
  wood: (c: string) => string;
  lineOf: (p: PlantLeafPalette) => string;
  /** A gift's line: its colour mixed toward the page's ink. */
  giftLine: (c: string) => string;
  W: { main: number; fine: number };
  fine: boolean;
  seed: number;
  sc: number[];
  base: number;
  A: Anchors & { lobes?: Lobe[] };
  kit: BotanicalKit;
}
interface Res {
  body: Maybe[];
  behind?: Maybe[];
}
interface Lobe {
  i: number;
  s: number;
  x: number;
  y: number;
  R: number;
  th: number;
}

// ── the build ───────────────────────────────────────────────────────────
export function buildBotanical(o: BotanicalOpts, kit: BotanicalKit): BuiltPlant {
  const key = o.species;
  const sp = SPECIES[key];
  const st = Math.max(1, Math.min(6, Math.round(o.stage)));
  const lod: Lod = o.lod || 'full';
  const theme = o.theme || 'light';
  const TL = plantLine[theme];
  const pal = plantLeaf[o.look?.palette ?? sp.pal];
  const fol = sp.fol ? plantLeaf[sp.fol] : pal;
  const W = LINE_PT[lod];
  const fine = lod === 'full';
  const sc = [0, 1, 2, 3, 4].map((i) => {
    const v = o.organs?.[i];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0.5, Math.min(1.25, v)) : 1.011;
  });

  // The ground: a pot or planter is the storybook shape, inked; the meadow is three soil lines.
  const { gr, potKind } = kit.ground(key, o.look, st, lod, theme);
  const meadow = potKind === 'meadow';
  const gw = GROUND_W[groundSize(st)];
  let base: number;
  let groundBack: GNode;
  let groundFront: GNode;
  if (meadow) {
    base = 169.5;
    const arcs: [number, number, number, number][] = [
      [gw, 171, 5, 1],
      [gw * 0.66, 177.5, 3, 0.55],
      [gw * 0.36, 183.5, 2, 0.3],
    ];
    // A chosen ground look (stone ring, trail blaze) is kept, inked.
    const look = (g: GNode, ids: string[]) => g.children.filter((c) => c.t === 'g' && c.id !== null && ids.includes(c.id)).map((c) => ink(c, theme, W.main * 0.9, kit.mix));
    groundBack = G('ground', [...arcs.map(([hw, y, sag, op]) => L(`M${f(100 - hw)} ${y}Q100 ${y - sag} ${f(100 + hw)} ${y}`, TL.soil, W.main, { opacity: op })), ...look(gr.back, ['stone-ring'])]);
    const front: Maybe[] = [];
    if (lod !== 'icon') {
      const tuft = (x: number, s: number) =>
        L(`M${f(x - 2.4 * s)} 170.4q0.4 -3 -1 -5.4M${f(x)} 169.8q0 -4 1.4 -7M${f(x + 2.4 * s)} 170.4q0.2 -2.6 1.6 -4.2`, plantLeaf.grove[TL.leaf], W.main * 0.8, { opacity: 0.8 });
      front.push(tuft(100 - gw * 0.62, 1), tuft(100 + gw * 0.7, 0.8));
    }
    groundFront = G('ground-front', [...front, ...look(gr.front, ['stone-ring-front', 'trail-blaze'])]);
  } else {
    base = gr.top + 2;
    groundBack = { ...ink(gr.back, theme, W.main, kit.mix), id: 'ground' };
    groundFront = { ...ink(gr.front, theme, W.main, kit.mix), id: 'ground-front' };
  }

  const A: Ctx['A'] = { base: { x: 100, y: base }, organs: [] };
  const ctx: Ctx = {
    key,
    sp,
    st,
    lod,
    TL,
    dark: theme === 'dark',
    pal,
    fol,
    wood: (c) => kit.mix(c, TL.woodInk, TL.woodMix),
    lineOf: (p) => p[TL.leaf],
    giftLine: (c) => kit.mix(c, TL.propInk, TL.giftMix),
    W,
    fine,
    seed: kit.hash(key + st + 'b'),
    sc,
    base,
    A,
    kit,
  };
  const res = st <= 2 ? young(ctx) : BUILD[sp.kind](ctx);

  // Elder: two leaves on their way down.
  const drift: Maybe[] = [];
  if (st === 6 && o.drift !== false && lod !== 'icon' && A.drift && key !== 'pine') {
    const d = A.drift;
    const kind: LeafKind | 'blossom' = sp.kind === 'cloud' || sp.kind === 'palm' ? (sp.leaf === 'needle' ? 'lens' : sp.leaf) : 'lens';
    const low = base - 8;
    for (const [dx, dy, len, a] of [
      [14, 22, 9, 120],
      [4, 44, 8, -60],
    ]) {
      const y = Math.min(d.y + dy, low);
      const lf = kind === 'blossom' ? { wash: blossom(d.x + dx, y, 2.4, a), line: blossom(d.x + dx, y, 2.4, a) } : leaf(kind, d.x + dx, y, len, a * D2R, fine);
      drift.push(G(null, [P(lf.wash, pal[TL.washLeaf], { opacity: TL.washLeafOp }), L(lf.line, ctx.lineOf(pal), W.main * 0.9)]));
    }
  }
  // Resting: the dusk behind and a line moon. A small settle, never a droop, never a colour loss.
  const pose = o.resting ? `rotate(1.5 100 ${f(base)})` : null;
  let fx: GNode | null = null;
  if (o.resting && lod !== 'icon' && A.canopyBox) {
    const { cx, cy, rx, ry } = A.canopyBox;
    const mx = Math.min(186, cx + rx * 0.7);
    const my = Math.max(14, cy - ry - 8);
    const moon = `M${f(mx)} ${f(my - 8)}A8 8 0 1 0 ${f(mx + 7)} ${f(my + 4)}A6.4 6.4 0 1 1 ${f(mx)} ${f(my - 8)}Z`;
    fx = G('fx', [P(moon, TL.moon, { opacity: TL.moonWashOp }), L(moon, TL.moon, W.main)]);
  }
  // An optional visitor (a look the learner picked): the storybook bird, inked, on this drawing's perch.
  const bird = o.look?.visitor && o.look.visitor !== 'no-visitor' ? kit.visitor(o.look.visitor, A, lod) : null;
  const visitor = bird ? { ...ink(bird, theme, W.main * 0.9, kit.mix), id: 'visitor' } : null;
  const tree = G('tree', [G('body', [...(res.behind ?? []), ...res.body, visitor], pose ? { transform: pose } : {}), G('drift', drift), fx]);
  // The shared 200 × 200 stage: a very full Elder settles a little smaller about its base, never clipped.
  const tb = measure(tree, kit);
  const M = 3;
  const fitK = Math.min(1, (base - M) / Math.max(1, base - tb.minY), (100 - M) / Math.max(1, 100 - tb.minX), (100 - M) / Math.max(1, tb.maxX - 100));
  if (fitK < 1) tree.transform = `translate(100 ${f(base)}) scale(${fitK.toFixed(3)}) translate(-100 ${f(-base)})`;

  // Optional keepsakes (picked by the learner): the storybook placement, inked.
  const ks = kit.keepsakes(o.look?.keepsakes, st, gr, tree, base, potKind, A, lod, theme);
  const keepBack = G('keepsakes-back', ks.back.map((k) => ink(k, theme, W.main * 0.9, kit.mix)));
  const keepFront = G('keepsakes', ks.front.map((k) => ink(k, theme, W.main * 0.9, kit.mix)));

  // The frame: the tree's bounds are already known (scaled about its base when it was fitted),
  // so only the ground and keepsakes are measured again (bounds() reads every path: the costly part).
  const k = Math.min(1, fitK);
  const box = kit.bounds(G(null, [groundBack, keepBack, groundFront, keepFront, ks.dawn]));
  const sx = (x: number) => 100 + (x - 100) * k;
  const sy = (y: number) => base + (y - base) * k;
  const frame = kit.frameFor({
    minX: Math.min(box.minX, sx(tb.minX)),
    maxX: Math.max(box.maxX, sx(tb.maxX)),
    minY: Math.min(box.minY, sy(tb.minY)),
    maxY: Math.max(box.maxY, sy(tb.maxY)),
  });
  let backdrop: GNode | null = null;
  if (o.resting) {
    const T = plantTheme[theme];
    const [fx0, fy0, fs0] = frame.split(' ').map(Number);
    const dcx = fx0 + fs0 / 2;
    const dcy = fy0 + fs0 / 2;
    const dr = Math.max(8, Math.min(fs0 * 0.48, dcx - 1, dcy - 1, 199 - dcx, 199 - dcy));
    backdrop = G('dusk', [C(dcx, dcy, dr, T.dusk, { opacity: T.duskOpacity })]);
  }
  const root = G('mascot', [backdrop, ks.dawn, groundBack, keepBack, tree, groundFront, keepFront]);
  // Points → viewBox units, from the real render size.
  const side = o.fit ? Number(frame.split(' ')[2]) : 200;
  scaleLines(root, side / (o.px || 200), 1);
  return { root, anchors: A, frame };
}

/** The scale a transform applies (translate and rotate keep lengths; scale() multiplies). */
function scaleOf(t: string | undefined): number {
  if (!t || t.indexOf('scale(') < 0) return 1;
  let k = 1;
  for (const m of t.matchAll(/scale\(([-\d.e]+)/g)) k *= Math.abs(Number(m[1])) || 1;
  return k;
}
/**
 * Every line of the drawing was set in points: turn it into viewBox units
 * (unitsPerPt), divided by any scale its groups apply, so a keepsake drawn
 * at ×1.6 or a fitted Elder still gets the same true line weight.
 */
function scaleLines(n: PNode, upp: number, k: number) {
  if (n.t === 'g') {
    const kk = k * scaleOf(n.transform);
    for (const c of n.children) scaleLines(c, upp, kk);
  } else if (n.stroke && n.sw !== undefined) {
    n.sw = Math.round(((n.sw * upp) / k) * 100) / 100;
  }
}

/**
 * Inks a filled drawing (pots, planters, keepsakes, a visitor): each solid
 * shape becomes a soft wash of its own colour under a theme line. Shadows,
 * black and white highlights and soft overlays (opacity < 0.5) are dropped.
 * Exported for tests.
 */
export function ink(n: PNode, theme: 'light' | 'dark', pt: number, mix: BotanicalKit['mix']): GNode {
  const TL = plantLine[theme];
  const lineFor = (c: string) => mix(c, TL.propInk, TL.propMix);
  const walk = (x: PNode): PNode[] => {
    const op = x.opacity ?? 1;
    if (x.t === 'g') return op < 0.5 ? [] : [{ ...x, children: x.children.flatMap(walk) }];
    if (x.fill === A0.black || x.fill === A0.white || (op < 0.5 && !x.stroke)) return [];
    if (x.fill && x.fill !== 'none') {
      const { opacity: _o, stroke: _s, sw: _w, ...geo } = x;
      return [
        { ...geo, fill: x.fill, opacity: TL.propWashOp } as PNode,
        { ...geo, fill: 'none', stroke: lineFor(x.fill), sw: pt } as PNode,
      ];
    }
    if (x.stroke) return x.stroke === A0.white ? [] : [{ ...x, stroke: lineFor(x.stroke), sw: pt * 0.8 }];
    return [x];
  };
  const out = walk(n);
  return out.length === 1 && out[0].t === 'g' ? (out[0] as GNode) : G(null, out);
}

// ── shared pieces ───────────────────────────────────────────────────────
/** Lines that lie on their wash's outline (leaves): measuring the wash is enough. */
const INSIDE = new WeakSet<PNode>();
/**
 * The drawn bounds of a part, without re-reading the leaf lines (half the
 * path text of a crown): their wash has the same outline, so the box is the
 * same, padded by one unit for the line's half-width (a safe over-estimate).
 */
function measure(n: GNode, kit: BotanicalKit): Box {
  const prune = (x: PNode): PNode => (x.t === 'g' ? { ...x, children: x.children.filter((c) => !INSIDE.has(c)).map(prune) } : x);
  const b = kit.bounds(prune(n));
  return { minX: b.minX - 1, minY: b.minY - 1, maxX: b.maxX + 1, maxY: b.maxY + 1 };
}

/** One domain's (or twig's) leaves: ONE wash path and ONE line path (cheap to draw). */
function leafGroup(ctx: Ctx, id: string | null, list: Leaf[], palette: PlantLeafPalette = ctx.pal, extra: Maybe[] = []): GNode {
  const { TL, W } = ctx;
  let wash = '';
  let line = '';
  for (const l of list) {
    wash += l.wash + ' ';
    line += l.line + ' ';
  }
  const lineNode = line ? L(line.trim(), ctx.lineOf(palette), W.main) : null;
  // The line is the wash's outline plus midribs inside it: bounds() can skip it (see measure()).
  if (lineNode && wash) INSIDE.add(lineNode);
  return G(id, [...extra, wash ? P(wash.trim(), palette[TL.washLeaf], { opacity: TL.washLeafOp }) : null, lineNode]);
}
/** A woody limb: a solid ink taper (one confident pen stroke). */
const inkLimb = (p0: V2, pc: V2, p1: V2, w0: number, w1: number, color: string) => P(taper(p0, pc, p1, w0, w1).closed, color);
/** A trunk: a wash and its two sides (no cut line at the soil), with two bark lines at full detail. */
function trunk(ctx: Ctx, p0: V2, pc: V2, p1: V2, w0: number, w1: number, bark: string, lines = true): PNode[] {
  const { TL, W, fine } = ctx;
  const t = taper(p0, pc, p1, w0, w1, 16);
  const kids: PNode[] = [P(t.closed, bark, { opacity: TL.washWoodOp }), L(t.sides, ctx.wood(bark), W.main)];
  if (fine && lines && w0 > 9) {
    for (const [ta, tb, off] of [
      [0.18, 0.42, 0.18],
      [0.5, 0.72, -0.12],
    ]) {
      const a = qpt(p0, pc, p1, ta);
      const b = qpt(p0, pc, p1, tb);
      const w = lerp(w0, w1, ta) * off;
      kids.push(L(`M${f(a[0] + w)} ${f(a[1])}Q${f((a[0] + b[0]) / 2 + w + 1)} ${f((a[1] + b[1]) / 2)} ${f(b[0] + w)} ${f(b[1])}`, ctx.wood(bark), W.fine, { opacity: 0.7 }));
    }
  }
  return kids;
}
/** The root flare: short ink tapers into the soil. */
function roots(ctx: Ctx, n: number, wb: number, bark: string): GNode {
  const out: PNode[] = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const x0 = 100 + side * (wb * 0.32 + k * 2);
    const x1 = 100 + side * (wb * 0.7 + 9 + k * 7);
    out.push(inkLimb([x0, ctx.base - 3], [x0 + side * 4, ctx.base], [x1, ctx.base + 1.2 + k * 0.8], 3.2 - k * 0.8, 0.4, ctx.wood(bark)));
  }
  return G('roots', out);
}

// ── seed and sprout (every species) ─────────────────────────────────────
function young(ctx: Ctx): Res {
  const { key, sp, st, lod, TL, pal, fol, W, fine, base, A, kit } = ctx;
  if (key === 'bamboo') return youngBamboo(ctx);
  const body: Maybe[] = [];
  const barkC = sp.bark ?? A0.soil;
  const seedC = sp.seed ?? kit.mix(barkC, A0.seedLight, 0.35);
  // The first leaves are green (a pink or gold colourway is the flower's, not the seedling's).
  const leafPal = sp.fol ? fol : sp.kind === 'cloud' && sp.pal === 'blossom' ? plantLeaf.grove : pal === plantLeaf.ember || pal === plantLeaf.gold ? plantLeaf.spring : pal;
  // The seed: an almond, a third in the soil.
  const sw = st === 1 ? 15 : 12;
  const sh = st === 1 ? 19 : 15;
  const sx = st === 1 ? 100 : 91;
  const sy = base - sh * 0.32;
  const rot = (st === 1 ? 0 : -24) * D2R;
  const almond = xf(
    `M0 ${-sh / 2}C${sw * 0.42} ${-sh / 2} ${sw / 2} ${sh * 0.05} ${sw / 2} ${sh * 0.18}C${sw / 2} ${sh * 0.42} ${sw * 0.25} ${sh / 2} 0 ${sh / 2}C${-sw * 0.25} ${sh / 2} ${-sw / 2} ${sh * 0.42} ${-sw / 2} ${sh * 0.18}C${-sw / 2} ${sh * 0.05} ${-sw * 0.42} ${-sh / 2} 0 ${-sh / 2}Z`,
    sx,
    sy,
    rot,
    1,
  );
  const seedKids: PNode[] = [P(almond, seedC, { opacity: TL.washWoodOp * 2.2 }), L(almond, ctx.wood(seedC), W.main)];
  if (fine) seedKids.push(L(xf(`M0 ${-sh * 0.36}Q${sw * 0.12} 0 0 ${sh * 0.36}`, sx, sy, rot, 1), ctx.wood(seedC), W.fine, { opacity: 0.7 }));
  if (sp.stripe && lod !== 'icon') seedKids.push(L(xf(`M${-sw * 0.22} ${-sh * 0.3}L${-sw * 0.26} ${sh * 0.3}M${sw * 0.22} ${-sh * 0.3}L${sw * 0.26} ${sh * 0.3}`, sx, sy, rot, 1), ctx.wood(seedC), W.fine || W.main * 0.6, { opacity: 0.6 }));
  if (key === 'cactus' && st === 2) return youngCactus(ctx);
  if (st === 1) {
    // A first root-shoot and one folded leaf: the `sprout` onboarding lifts.
    const top: V2 = [sx, sy - sh / 2 + 1];
    const tip: V2 = [sx + 4, top[1] - 9];
    const lf = leaf('lens', tip[0], tip[1], 8, -40 * D2R, fine);
    body.push(G('trunk', seedKids));
    body.push(G('sprout', [L(Q(top, [sx - 1, top[1] - 6], tip), ctx.lineOf(leafPal), W.main), P(lf.wash, leafPal[TL.washLeaf], { opacity: TL.washLeafOp }), L(lf.line, ctx.lineOf(leafPal), W.main)]));
    A.crown = { x: 100, y: sy - sh / 2 - 1 };
    A.canopyBox = { cx: 100, cy: sy, rx: sw * 0.7, ry: sh * 0.6 };
    A.neck = { x: 100, y: sy - sh * 0.28, w: sw * 0.82 };
  } else {
    // The Grove seedling: one stem, two seed leaves and the species' first true leaf.
    const topY = 118;
    const p0: V2 = [100, base];
    const pc: V2 = [99, base - 26];
    const p1: V2 = [101, topY];
    const cot = [leaf('lens', 101, topY + 3, 22, -150 * D2R, fine), leaf('lens', 101, topY + 1, 24, -30 * D2R, fine)];
    const trueKind: LeafKind = sp.kind === 'cloud' && sp.leaf !== 'blossom' && sp.leaf !== 'needle' ? sp.leaf : sp.kind === 'palm' ? 'long' : sp.kind === 'pine' || sp.kind === 'bonsai' ? 'olive' : 'lens';
    const tl = leaf(trueKind, 101, topY - 1, trueKind === 'oak' || trueKind === 'maple' ? 15 : 13, -95 * D2R, fine);
    body.push(G('trunk', seedKids));
    body.push(G('stem', [L(`M${p0[0]} ${f(p0[1])}Q${pc[0]} ${f(pc[1])} ${p1[0]} ${p1[1]}`, ctx.lineOf(leafPal), W.main)]));
    body.push(leafGroup(ctx, 'leaves', [...cot, tl], leafPal));
    A.crown = { x: 100, y: topY - 14 };
    A.canopyBox = { cx: 100, cy: (topY + base) / 2, rx: 26, ry: (base - topY) / 2 + 8 };
    A.neck = { x: 100, y: base - 12, w: 6 };
  }
  A.perch = { x: 100 - 22, y: base + 1 };
  A.branchL = { x: 80, y: base - 10 };
  A.branchR = { x: 120, y: base - 10 };
  A.drift = A.crown;
  return { body };
}
function youngBamboo(ctx: Ctx): Res {
  const { st, base, W, TL, A } = ctx;
  const [w, h] = st === 1 ? [16, 20] : [18, 36];
  const sheath = A0.bamboo.sheathMid;
  const shoot = `M${100 - w / 2} ${f(base + 1)}Q${f(100 - w * 0.45)} ${f(base - h * 0.55)} 100 ${f(base - h)}Q${f(100 + w * 0.45)} ${f(base - h * 0.55)} ${100 + w / 2} ${f(base + 1)}`;
  const kids: PNode[] = [P(shoot + 'Z', sheath, { opacity: TL.washWoodOp * 2 }), L(shoot, ctx.wood(sheath), W.main)];
  kids.push(L(`M${f(100 - w * 0.3)} ${f(base - 2)}Q${f(100 - w * 0.1)} ${f(base - h * 0.45)} 100 ${f(base - h * 0.78)}M${f(100 + w * 0.32)} ${f(base - 3)}Q${f(100 + w * 0.12)} ${f(base - h * 0.4)} 101 ${f(base - h * 0.6)}`, ctx.wood(sheath), W.fine || W.main * 0.7, { opacity: 0.7 }));
  // Seed: the shoot is the `sprout` onboarding lifts; Sprout adds its first two leaves.
  const body: Maybe[] = [G(st === 1 ? 'sprout' : 'trunk', kids)];
  if (st === 2) body.push(leafGroup(ctx, 'leaves', [leaf('olive', 100, base - h + 1, 15, -55 * D2R, ctx.fine), leaf('olive', 100, base - h + 3, 13, -130 * D2R, ctx.fine)], plantLeaf.grove));
  A.crown = { x: 100, y: base - h - 3 };
  A.canopyBox = { cx: 100, cy: base - h * 0.5, rx: w * 0.8, ry: h * 0.6 };
  A.perch = { x: 100 - w * 0.95, y: base + 1 };
  A.neck = { x: 100, y: base - h * 0.55, w: w * 0.62 };
  A.drift = A.crown;
  return { body };
}
function youngCactus(ctx: Ctx): Res {
  const { base, W, TL, fol, A, fine } = ctx;
  const r = 12;
  const cy = base - r + 2;
  const ring = `M${100 - r} ${f(cy)}A${r} ${r} 0 1 1 ${100 + r} ${f(cy)}A${r} ${r} 0 1 1 ${100 - r} ${f(cy)}Z`;
  const kids: PNode[] = [P(ring, fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(ring, ctx.lineOf(fol), W.main)];
  if (fine) kids.push(L(`M100 ${f(cy - r)}Q96 ${f(cy)} 100 ${f(cy + r)}M100 ${f(cy - r)}Q105 ${f(cy)} 100 ${f(cy + r)}`, ctx.lineOf(fol), W.fine, { opacity: 0.7 }));
  let spines = '';
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 23) * D2R;
    spines += `M${f(100 + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}l${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3)}`;
  }
  kids.push(L(spines, ctx.lineOf(fol), W.main * 0.7, { opacity: 0.8 }));
  A.crown = { x: 100, y: cy - r - 3 };
  A.canopyBox = { cx: 100, cy, rx: r * 1.4, ry: r * 1.2 };
  A.perch = { x: 100 - r * 1.3, y: base + 1 };
  A.neck = { x: 100, y: cy - r * 0.55, w: r * 1.5 };
  A.drift = A.crown;
  return { body: [G('trunk', kids)] };
}

// ── trees with a leafy crown (oak, maple, narra, cherry, mango) ────────
/**
 * Shoot: a slim sapling with three twigs. From Bough on: five domain boughs
 * (D1 left-low → D3 the leader → D5 right-low, art.ts's arc), each ending in
 * a leaf cluster over a faint wash of foliage. A cluster's size and leaf
 * count follow its domain's organ scale, so a weak domain is young, never bare.
 */
function cloudTree(ctx: Ctx): Res {
  const { sp, st, lod, TL, pal, W, fine, seed, sc, base, A, kit } = ctx;
  const g = GEO[st];
  const cr = sp.crown!;
  const bark = sp.bark!;
  const woodC = ctx.wood(bark);
  const r = kit.rng(seed);
  const cx = 100;
  const cy = g.cy + (cr.dy ?? 0) * (st / 5);
  const rx = g.rx * cr.sx * (st >= 5 ? 1 : 0.95);
  const ry = g.ry * cr.sy;
  const isBlossom = sp.leaf === 'blossom';
  const leafKind: LeafKind = sp.leaf === 'blossom' || sp.leaf === 'needle' ? 'lens' : sp.leaf;
  const flare = sp.flare ?? 0.35;
  const top = st === 3 ? g.top : Math.min(g.top, cy + ry * 0.35);
  const tk = trunk(ctx, [100, base + 1], [100, (base + top) / 2], [100, top], g.wb * (1 + flare * 0.25), g.wt, bark);
  const branches: PNode[] = [];
  const domains: GNode[] = [];
  // Bigger, fewer leaves at small detail (Today's 72pt slot).
  const leafLen = { icon: st === 3 ? 22 : 0, small: 17, full: 12.5 }[lod] * (leafKind === 'maple' || leafKind === 'oak' ? 1.08 : leafKind === 'long' ? 1.35 : 1) * (st === 3 ? 0.9 : 1);
  const blossomR = { icon: 0, small: 3.8, full: 3.1 }[lod];
  const makeLeaf = (x: number, y: number, ang: number, s = 1): Leaf => {
    if (!isBlossom) return leaf(leafKind, x, y, leafLen * s, ang, fine);
    const d = blossom(x, y, blossomR * s, r() * 70);
    return { wash: d, line: d };
  };

  if (st === 3) {
    // The sapling: the leader and three alternate twigs, with leaves along them.
    branches.push(L(Q([100, top + 2], [98, top - 24], [101, top - 50]), woodC, W.main));
    const twigs: [V2, V2, V2, number][] = [
      [[100, top - 6], [86, top - 14], [74, top - 22], -1],
      [[100, top - 18], [114, top - 26], [126, top - 34], 1],
      [[100, top - 32], [88, top - 40], [80, top - 50], -1],
    ];
    const list: Leaf[] = [];
    for (const [p0, pc, p1, side] of twigs) {
      branches.push(L(Q(p0, pc, p1), woodC, W.main * 0.9));
      const n = lod === 'full' ? 3 : 2;
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 0.2);
        const [x, y] = qpt(p0, pc, p1, t);
        list.push(makeLeaf(x, y, qtan(p0, pc, p1, t) + (i % 2 ? -1 : 1) * 0.9 * side, 0.9));
      }
      list.push(makeLeaf(p1[0], p1[1], qtan(p0, pc, p1, 1), 1));
    }
    list.push(makeLeaf(101, top - 50, -90 * D2R, 1.05));
    list.push(makeLeaf(99, top - 42, -140 * D2R, 0.85), makeLeaf(100, top - 44, -40 * D2R, 0.85));
    domains.push(leafGroup(ctx, null, list));
    A.canopyBox = { cx, cy: top - 28, rx: 30, ry: 30 };
  } else {
    const lobes: Lobe[] = [0, 1, 2, 3, 4].map((i) => {
      const th = (cr.a0 + i * cr.step) * D2R;
      const s = sc[i];
      return { i, s, x: cx + rx * cr.spread * Math.cos(th), y: cy + ry * cr.spread * 0.95 * Math.sin(th), R: Math.min(rx, ry * 1.25) * (0.44 + 0.04 * (st - 4)) * s, th };
    });
    const limbW = { 4: 4.2, 5: 6, 6: 7.5 }[st as 4 | 5 | 6];
    // Boughs leave the trunk at different heights: the low side boughs first,
    // then the upper ones, and D3 continues the leader (never one fork point).
    const trunkLen = base - top;
    const leaveAt = [0.3, 0.12, 0, 0.12, 0.3].map((u) => top + trunkLen * u * (st === 4 ? 0.8 : 1));
    const massTone = ctx.dark && (pal === plantLeaf.snow || pal === plantLeaf.pearl) ? pal.deep : pal[TL.washMass];
    for (const k of [0, 4, 1, 3, 2]) {
      const Lb = lobes[k];
      const y0 = leaveAt[k];
      const half = lerp(g.wt, g.wb, (y0 - top) / trunkLen) / 2;
      const side = Math.sign(Math.cos(Lb.th)) || 0;
      const start: V2 = [100 + side * half * 0.55, y0 + 2];
      const end: V2 = [Lb.x - Math.cos(Lb.th) * Lb.R * 0.25, Lb.y + Lb.R * 0.15];
      const ctrl: V2 = k === 2 ? [100, lerp(start[1], end[1], 0.5)] : [lerp(start[0], end[0], 0.55), lerp(start[1], end[1], 0.2) - 2];
      const w0 = limbW * (k === 2 ? 1.05 : k === 0 || k === 4 ? 0.8 : 0.72);
      branches.push(inkLimb(start, ctrl, end, w0, 1.2, woodC));
      // Side twigs into the cluster.
      const nT = lod === 'full' ? 3 : 2;
      let twigs = '';
      const tips: { tip: V2; a: number }[] = [];
      for (let j = 0; j < nT; j++) {
        const a = Lb.th + (j - (nT - 1) / 2) * 0.9 + (r() - 0.5) * 0.3;
        const tip: V2 = [Lb.x + Math.cos(a) * Lb.R * 0.72, Lb.y + Math.sin(a) * Lb.R * 0.62];
        twigs += Q(end, [lerp(end[0], tip[0], 0.5) + (r() - 0.5) * 4, lerp(end[1], tip[1], 0.5) - 3], tip);
        tips.push({ tip, a });
      }
      if (lod !== 'icon') branches.push(L(twigs, woodC, W.main * 0.85));
      // Leaves round the cluster, pointing outward, a few inside.
      const nLeaf = Math.round((lod === 'full' ? 7 : lod === 'small' ? 5 : 0) * (0.75 + 0.3 * Lb.s) * (isBlossom ? 1.15 : 1));
      const list: Leaf[] = [];
      for (let j = 0; j < nLeaf; j++) {
        const a = Lb.th + ((j + 0.5) / nLeaf - 0.5) * Math.PI * 1.7 + (r() - 0.5) * 0.35;
        const d = (j % 3 === 2 ? 0.35 : 0.68) + r() * 0.18;
        const x = Lb.x + Math.cos(a) * Lb.R * d;
        const y = Lb.y + Math.sin(a) * Lb.R * d * 0.82;
        const down = Math.sin(a) > 0.55; // underside leaves droop a little
        list.push(makeLeaf(x, y, a + (r() - 0.5) * 0.5 + (down ? 0.35 * Math.sign(Math.cos(a) || 1) : 0), 0.85 + r() * 0.3));
      }
      for (const t of tips) list.push(makeLeaf(t.tip[0], t.tip[1], t.a + (r() - 0.5) * 0.3, 1.05));
      // The foliage wash: a soft, unlined mass (watercolour), so the crown reads at 72pt and 24pt.
      const mass = kit.scallop({ cx: Lb.x, cy: Lb.y, rx: Lb.R * 1.02, ry: Lb.R * 0.86, n: 7, seed: seed + k * 7, jit: 0.45, bulge: 0.5, flat: 0.2 });
      const massNode = P(mass, massTone, { opacity: lod === 'icon' ? 0.85 : TL.washMassOp + (isBlossom ? 0.08 : 0) + (lod === 'small' ? 0.1 : 0) });
      domains[k] = leafGroup(ctx, `domain-${k + 1}`, list, pal, [massNode, lod === 'icon' ? L(mass, ctx.lineOf(pal), W.main) : null]);
      A.organs[k] = { x: Lb.x + (Lb.x - cx) * 0.3, y: Lb.y + (Lb.y - cy) * 0.3 };
    }
    A.canopyBox = { cx, cy, rx: rx * 0.98, ry: ry * 0.95 };
    A.lobes = lobes;
  }
  const behind: Maybe[] = st >= 5 ? [roots(ctx, st === 6 ? 4 : 2, g.wb, bark)] : [];
  const order = st === 3 ? domains : [0, 4, 1, 3, 2].map((k) => domains[k]);
  const body: Maybe[] = [G('trunk', tk), G('branches', branches), G('canopy', order), G('leaves', [])];
  // The gift: at Elder for all; from Crown for fruit trees.
  if (st === 6 || (st === 5 && sp.fruitFrom === 5)) body.push(flourishCloud(ctx, r));
  const box = A.canopyBox!;
  A.crown = { x: box.cx + 4, y: box.cy - box.ry * 0.97 };
  A.perch = st === 3 ? { x: 86, y: top - 14 } : { x: box.cx - box.rx * 0.5, y: box.cy - box.ry * 0.62 };
  A.branchL = { x: box.cx - box.rx * 0.58, y: box.cy + box.ry * 0.62 };
  A.branchR = { x: box.cx + box.rx * 0.6, y: box.cy + box.ry * 0.62 };
  A.neck = { x: 100, y: top + 6, w: g.wt * 1.4 };
  A.drift = { x: box.cx + box.rx * 0.7, y: box.cy + box.ry * 0.4 };
  return { body, behind };
}

/** The gift, drawn in line: acorns, samaras, narra or cherry blossoms, mangoes. */
function flourishCloud(ctx: Ctx, r: () => number): GNode {
  const { sp, st, lod, W, A } = ctx;
  if (lod === 'icon' || !A.lobes) return G('blooms', []);
  const kids: PNode[] = [];
  const pts: V2[] = [];
  for (const Lb of A.lobes) {
    const n = lod === 'full' ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const a = Lb.th + (r() - 0.5) * 2.2;
      pts.push([Lb.x + Math.cos(a) * Lb.R * 0.5, Lb.y + Math.sin(a) * Lb.R * 0.45]);
    }
  }
  const washOp = 0.75;
  if (sp.flourish === 'acorn')
    for (const [x, y] of pts) {
      const nut = `M${f(x - 2.4)} ${f(y)}Q${f(x - 2.4)} ${f(y + 5.4)} ${f(x)} ${f(y + 5.8)}Q${f(x + 2.4)} ${f(y + 5.4)} ${f(x + 2.4)} ${f(y)}Z`;
      const cap = `M${f(x - 3)} ${f(y + 0.6)}Q${f(x)} ${f(y - 3.4)} ${f(x + 3)} ${f(y + 0.6)}Z`;
      kids.push(P(nut, GIFT.acorn, { opacity: washOp }), L(nut + cap + `M${f(x)} ${f(y - 2.2)}l0.6 -2`, ctx.giftLine(GIFT.acorn), W.main * 0.9));
    }
  if (sp.flourish === 'samara')
    for (const [x, y] of pts) {
      const d = xf('M0 0C-1 -3 -6 -6 -8 -4C-6 -2 -3 -1 0 0ZM0 0C1 -3 6 -6 8 -4C6 -2 3 -1 0 0Z', x, y, (r() - 0.5) * 0.8, 0.9);
      kids.push(P(d, GIFT.samara, { opacity: washOp }), L(d, ctx.giftLine(plantLeaf.ember.mid), W.main * 0.85));
    }
  if (sp.flourish === 'narra' || sp.flourish === 'blossom') {
    const narra = sp.flourish === 'narra';
    const fill = narra ? GIFT.narra : GIFT.cherryBloom;
    for (const [x, y] of pts.concat(pts.map(([x, y]): V2 => [x + 6, y - 4]))) {
      const d = blossom(x, y, 2.2, r() * 70);
      kids.push(P(d, fill, { opacity: 0.9 }), L(d, ctx.giftLine(narra ? GIFT.narraCore : GIFT.cherryCore), W.main * 0.8));
    }
  }
  if (sp.flourish === 'mango') {
    const ripe = st === 6;
    const { cx, cy, rx, ry } = A.canopyBox!;
    const xs = ripe ? [-0.62, -0.38, 0.38, 0.62, -0.8, 0.8] : [-0.55, -0.3, 0.3, 0.55];
    for (const dx of xs) {
      const x = cx + rx * dx;
      const y = cy + ry * 0.55 + 6 + r() * 4;
      const fr = xf('M0.6 -6.2C4.6 -6.4 6.2 -1.2 5.2 3C4.2 7 -0.6 8.6 -3.6 6.2C-6.2 4 -5.4 -6 0.6 -6.2Z', x, y + 6, (r() - 0.5) * 0.4, 1.05);
      kids.push(
        L(`M${f(x)} ${f(y - 4)}L${f(x)} ${f(y + 0.5)}`, ctx.wood(BARK.mango), W.main * 0.8),
        P(fr, ripe ? GIFT.mangoRipe : GIFT.mangoGreen, { opacity: washOp }),
        L(fr, ctx.giftLine(ripe ? GIFT.mangoBlush : GIFT.mangoGreen), W.main * 0.9),
      );
    }
  }
  return G('blooms', kids);
}

// ── pine: tiers of needle sprays (D1 the lowest tier, D5 the top) ───────
function pineTree(ctx: Ctx): Res {
  const { st, lod, TL, pal, W, seed, sc, base, A, kit } = ctx;
  const g = GEO[st];
  const bark = BARK.pine;
  const woodC = ctx.wood(bark);
  const count = st >= 4 ? 5 : 3;
  const topY = g.cy - g.ry * 0.95;
  const bottom = g.cy + g.ry * 0.62;
  const lean = 1 + st * 0.4;
  const trunkTop = topY + 4;
  const tk = trunk(ctx, [100, base + 1], [100 + lean * 0.3, (base + trunkTop) / 2], [100 + lean, trunkTop], g.wb * 0.85, 1.6, bark);
  const branches: PNode[] = [];
  const pads: { x: number; y: number; w: number; side: number; dom: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 = the top
    const dom = count - 1 - i;
    const s = st >= 4 ? sc[dom] : 1;
    const y = lerp(topY + 8, bottom, t);
    const side = i === 0 ? 0 : i % 2 ? -1 : 1;
    const w = lerp(g.rx * 0.32, g.rx * 0.92, t) * s * (st === 3 ? 1.15 : 1);
    pads.push({ x: 100 + lean * (1 - t) + side * w * 0.38, y, w, side, dom });
  }
  const groups: GNode[] = [];
  pads.forEach((p, k) => {
    const trunkX = 100 + lean * ((base - p.y) / (base - trunkTop));
    // The bough: out from the trunk, a little up at its tip.
    const p0: V2 = [trunkX, p.y + 5];
    const p1: V2 = [p.x + p.side * p.w * 0.45, p.y - 1];
    if (p.side !== 0) branches.push(inkLimb(p0, [lerp(p0[0], p1[0], 0.5), p.y + 4], p1, 2.6 + st * 0.3, 0.8, woodC));
    // A flat pad: a soft wash, needle fans along its top.
    const ry = Math.max(6, p.w * 0.28);
    const mass = kit.scallop({ cx: p.x, cy: p.y, rx: p.w * 0.6, ry, n: 9, seed: seed + k * 13, jit: 0.3, bulge: 0.55, flat: 0.55 });
    let nd = '';
    const n = lod === 'icon' ? 0 : Math.max(3, Math.round(p.w / (lod === 'full' ? 9 : 13)));
    for (let j = 0; j < n; j++) {
      const u = j / (n - 1);
      const x = p.x - p.w * 0.52 + u * p.w * 1.04;
      const yy = p.y - ry * 0.35 * Math.sin(Math.PI * u) + 2;
      nd += needles(x, yy, lod === 'full' ? 8 : 10, -Math.PI / 2 + (u - 0.5) * 1.6, lod === 'full' ? 4 : 3, 1.5);
    }
    const kids: PNode[] = [P(mass, pal[TL.washMass], { opacity: lod === 'icon' ? 0.85 : TL.washMassOp + 0.12 })];
    kids.push(lod === 'icon' ? L(mass, ctx.lineOf(pal), W.main) : L(nd, ctx.lineOf(pal), lod === 'full' ? W.fine * 1.3 : W.main * 0.8));
    groups.push(G(count === 5 ? `domain-${p.dom + 1}` : null, kids));
    if (count === 5) A.organs[p.dom] = { x: p.x, y: p.y };
  });
  const body: Maybe[] = [G('trunk', tk), G('branches', branches), G('canopy', groups), G('leaves', [])];
  // Cones under the lower pads at Elder.
  if (st === 6 && lod !== 'icon') {
    const kids: PNode[] = [];
    for (const p of pads.slice(1)) {
      const x = p.x + p.side * p.w * 0.3;
      const y = p.y + 9;
      const d = `M${f(x - 2.6)} ${f(y)}A2.6 4 0 1 0 ${f(x + 2.6)} ${f(y)}A2.6 4 0 1 0 ${f(x - 2.6)} ${f(y)}Z`;
      kids.push(P(d, GIFT.cone, { opacity: 0.7 }), L(d + `M${f(x - 2.2)} ${f(y - 1.2)}h4.4M${f(x - 2.4)} ${f(y + 1.2)}h4.8`, ctx.wood(GIFT.cone), W.main * 0.8));
    }
    body.push(G('blooms', kids));
  }
  A.canopyBox = { cx: 100, cy: (topY + bottom) / 2, rx: g.rx, ry: (bottom - topY) / 2 + 8 };
  A.crown = { x: pads[0].x, y: topY - 4 };
  A.perch = { x: pads[1].x - 4, y: pads[1].y - 6 };
  A.neck = { x: 100, y: bottom + 8, w: g.wb * 0.6 };
  A.branchL = { x: 70, y: bottom };
  A.branchR = { x: 130, y: bottom };
  A.drift = { x: 130, y: bottom };
  return { body, behind: st >= 5 ? [roots(ctx, 2, g.wb, bark)] : [] };
}

// ── coconut palm: the Grove frond itself ─────────────────────────────────
function palmTree(ctx: Ctx): Res {
  const { st, lod, pal, W, sc, base, A } = ctx;
  const bark = BARK.coconut;
  const lean = 4 + st * 2;
  const crown = { x: 100 + lean, y: { 3: 112, 4: 94, 5: 78, 6: 68 }[st as 3 | 4 | 5 | 6] };
  const tp0: V2 = [100, base + 1];
  const tpc: V2 = [98, (base + crown.y) / 2];
  const tp1: V2 = [crown.x, crown.y + 3];
  const tk = trunk(ctx, tp0, tpc, tp1, { 3: 9, 4: 11, 5: 13, 6: 14 }[st as 3 | 4 | 5 | 6], { 3: 6, 4: 7, 5: 8, 6: 8 }[st as 3 | 4 | 5 | 6], bark, false);
  // Ring marks up the trunk.
  if (lod !== 'icon') {
    let rings = '';
    for (let t = 0.12; t < 0.92; t += lod === 'full' ? 0.09 : 0.14) {
      const [x, y] = qpt(tp0, tpc, tp1, t);
      const w = lerp(10, 7, t) * 0.5;
      rings += `M${f(x - w)} ${f(y)}Q${f(x)} ${f(y + 2)} ${f(x + w)} ${f(y)}`;
    }
    tk.push(L(rings, ctx.wood(bark), (W.fine || W.main) * 0.9, { opacity: 0.75 }));
  }
  const angs = st >= 4 ? [-168, -132, -96, -58, -14] : [-150, -98, -36];
  const Lb = { 3: 40, 4: 56, 5: 68, 6: 76 }[st as 3 | 4 | 5 | 6];
  const order = st >= 4 ? [2, 1, 3, 0, 4] : [1, 0, 2];
  const fronds: GNode[] = [];
  for (const k of order) {
    const Ln = Lb * (st >= 4 ? sc[k] : 1);
    const a = angs[k] * D2R;
    const droop = Ln * 0.12 + Math.abs(Math.cos(a)) * Ln * 0.36;
    const p0: V2 = [crown.x, crown.y];
    const p2: V2 = [crown.x + Math.cos(a) * Ln, crown.y + Math.sin(a) * Ln * 0.75 + droop];
    const p1: V2 = [crown.x + Math.cos(a) * Ln * 0.62, crown.y + Math.sin(a) * Ln * 0.75 * 0.62 - Ln * 0.12];
    // Leaflets in pairs along the rachis, shorter toward the tip.
    const n = lod === 'full' ? 9 : lod === 'small' ? 6 : 0;
    const list: Leaf[] = [];
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const [x, y] = qpt(p0, p1, p2, t);
      const tan = qtan(p0, p1, p2, t);
      const len = Ln * 0.3 * (1 - t * 0.55);
      for (const sd of [1, -1]) list.push(leaf('long', x, y, len, tan + sd * 0.75 + 0.25, false));
    }
    const kids: Maybe[] = [];
    if (lod === 'icon') kids.push(P(taper(p0, p1, p2, Ln * 0.22, 2).closed, pal.mid, { opacity: 0.85 }));
    kids.push(L(Q(p0, p1, p2), ctx.lineOf(pal), W.main));
    fronds.push(leafGroup(ctx, st >= 4 ? `domain-${k + 1}` : null, list, pal, kids));
    if (st >= 4) {
      const [ox, oy] = qpt(p0, p1, p2, 0.6);
      A.organs[k] = { x: ox, y: oy };
    }
  }
  const body: Maybe[] = [G('trunk', tk), G('canopy', fronds), G('leaves', [])];
  if (st >= 5 && lod !== 'icon') {
    const m = st === 6 ? 5 : 3;
    const nut = pal === plantLeaf.golden ? GIFT.coconutGolden : st === 6 ? GIFT.coconutRipe : GIFT.coconutGreen;
    const kids: PNode[] = [];
    for (const [dx, dy] of [
      [-6, 9],
      [6, 10],
      [0, 15],
      [-12, 15],
      [11, 16],
    ].slice(0, m)) {
      const x = crown.x + dx;
      const y = crown.y + dy;
      const rr = st === 6 ? 6 : 5.4;
      const d = `M${f(x - rr)} ${f(y)}A${rr} ${rr} 0 1 0 ${f(x + rr)} ${f(y)}A${rr} ${rr} 0 1 0 ${f(x - rr)} ${f(y)}Z`;
      kids.push(P(d, nut, { opacity: 0.7 }), L(d, ctx.wood(nut), W.main * 0.9));
    }
    body.push(G('blooms', kids));
  }
  A.canopyBox = { cx: crown.x, cy: crown.y + 4, rx: Lb, ry: Lb * 0.55 };
  A.crown = { x: crown.x, y: crown.y - 6 };
  A.perch = { x: crown.x - 4, y: crown.y - 4 };
  A.neck = { x: 100, y: base - 30, w: 10 };
  A.drift = { x: crown.x + Lb * 0.5, y: crown.y + 20 };
  return { body };
}

// ── bonsai: an S-curved trunk and cloud-pruned pads ─────────────────────
function bonsaiTree(ctx: Ctx): Res {
  const { st, lod, TL, pal, W, seed, sc, base, A, kit } = ctx;
  const bark = BARK.bonsai;
  const woodC = ctx.wood(bark);
  const g = GEO[st];
  const k = st / 5;
  const r = kit.rng(seed);
  const wb = { 3: 9, 4: 12, 5: 15, 6: 18 }[st as 3 | 4 | 5 | 6];
  // The S: one tapered trunk along a cubic (no kinks).
  const pC: V2 = [104, base - 52 * k - 10];
  const S = cubic([100, base + 1], [112, base - 22 * k], [76, base - 34 * k - 4], pC);
  const t1 = taper([0, 0], [0, 0], [0, 0], wb, wb * 0.4, 24, S);
  const tk: PNode[] = [P(t1.closed, bark, { opacity: TL.washWoodOp }), L(t1.sides, woodC, W.main)];
  const spots =
    st >= 4
      ? [
          [-0.86, 0.55, 0.42, 0.2],
          [-0.42, -0.05, 0.4, 0.22],
          [0.2, -0.62, 0.42, 0.26],
          [0.56, 0.0, 0.4, 0.22],
          [0.86, 0.5, 0.44, 0.2],
        ]
      : [
          [0.12, -0.5, 0.55, 0.3],
          [-0.6, 0.3, 0.45, 0.24],
        ];
  const hx = Math.min(g.rx, 62);
  const branches: PNode[] = [];
  const groups: GNode[] = [];
  spots.forEach(([ox, oy, sx, sy], i) => {
    const s = st >= 4 ? sc[i] : 1;
    const p = { x: 100 + ox * hx, y: g.cy + 22 * (g.rx / 70) + oy * g.ry, rx: sx * hx * s, ry: Math.max(7, sy * g.ry * s) };
    branches.push(inkLimb([pC[0] + (ox < 0 ? -2 : 2), pC[1] + 10 + oy * 12], [lerp(pC[0], p.x, 0.5), pC[1] + 4 + oy * 10], [p.x, p.y + p.ry * 0.4], 2.6 + st * 0.35, 0.8, woodC));
    const mass = kit.scallop({ cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, n: 8, seed: seed + i * 13, jit: 0.3, bulge: 0.62, flat: 0.5 });
    // The pad's crown edge only, in needle fans: the cloud-pruned outline, never a closed bubble.
    let topLine = '';
    const n = lod === 'icon' ? 0 : lod === 'full' ? 5 : 4;
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n;
      const x = p.x - p.rx + u * p.rx * 2;
      const y = p.y - p.ry * 0.8 * Math.sin(Math.PI * u) + 1;
      topLine += needles(x, y + 2, lod === 'full' ? 7 : 9, -Math.PI / 2 + (u - 0.5) * 1.2, 3, 1.5);
    }
    const kids: PNode[] = [P(mass, pal[TL.washMass], { opacity: lod === 'icon' ? 0.85 : TL.washMassOp + 0.14 })];
    kids.push(lod === 'icon' ? L(mass, ctx.lineOf(pal), W.main) : L(topLine, ctx.lineOf(pal), lod === 'full' ? W.fine * 1.3 : W.main * 0.8));
    groups.push(G(st >= 4 ? `domain-${i + 1}` : null, kids));
    if (st >= 4) A.organs[i] = { x: p.x, y: p.y };
  });
  const body: Maybe[] = [G('trunk', tk), G('branches', branches), G('canopy', groups), G('leaves', [])];
  if (st === 6 && lod !== 'icon') {
    const kids: PNode[] = [];
    for (const o of A.organs) {
      const d = blossom(o.x + 4, o.y - 3, 2, r() * 60);
      kids.push(P(d, A0.white, { opacity: 0.9 }), L(d, ctx.lineOf(plantLeaf.pearl), W.main * 0.7));
    }
    body.push(G('blooms', kids));
  }
  A.canopyBox = { cx: 100, cy: g.cy + 10 * (g.rx / 70), rx: hx * 1.05, ry: g.ry * 0.75 };
  A.crown = { x: 104, y: g.cy - g.ry * 0.5 };
  A.perch = { x: (A.organs[0] ?? { x: 60 }).x + 4, y: (A.organs[0] ?? { y: 120 }).y - 6 };
  A.neck = { x: 92, y: base - 30, w: wb * 0.7 };
  A.drift = { x: 140, y: g.cy + 10 };
  return { body };
}

// ── flowers, succulents, grasses ────────────────────────────────────────
function stemLine(ctx: Ctx, p0: V2, pc: V2, p1: V2, w: number, palette: PlantLeafPalette): PNode[] {
  if (w < 3.2) return [L(Q(p0, pc, p1), ctx.lineOf(palette), ctx.W.main)];
  const t = taper(p0, pc, p1, w, w * 0.6);
  return [P(t.closed, palette[ctx.TL.washLeaf], { opacity: ctx.TL.washLeafOp }), L(t.sides, ctx.lineOf(palette), ctx.W.main)];
}
const disc = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`;
function sunflower(ctx: Ctx): Res {
  const { st, lod, TL, pal, fol, W, fine, sc, base, A } = ctx;
  const g4 = st as 3 | 4 | 5 | 6;
  const hy = { 3: 114, 4: 82, 5: 70, 6: 62 }[g4];
  const hx = 100 + (st >= 5 ? 4 : 2);
  const p0: V2 = [100, base];
  const pc: V2 = [98, base - (base - hy) * 0.45];
  const p1: V2 = [hx, hy];
  const body: Maybe[] = [G('stem', stemLine(ctx, p0, pc, p1, { 3: 3, 4: 4, 5: 4.6, 6: 5.4 }[g4], fol))];
  const leaves: GNode[] = [];
  const at = (t: number) => qpt(p0, pc, p1, t);
  if (st === 3) {
    const list = (
      [
        [-1, 0.2, 20],
        [1, 0.22, 20],
        [-1, 0.48, 15],
        [1, 0.5, 15],
      ] as const
    ).map(([s, t, len]) => {
      const [x, y] = at(t);
      return leaf('banyan', x, y, len, (-90 + s * 58) * D2R, fine);
    });
    leaves.push(leafGroup(ctx, null, list, fol));
  } else {
    // Five domain leaves up the stem.
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? 1 : -1;
      const [x, y] = at(0.1 + i * 0.15);
      const len = (17 + st * 2.4) * sc[i] * (1 - i * 0.05) * (lod === 'small' ? 1.1 : 1);
      leaves.push(leafGroup(ctx, `domain-${i + 1}`, [leaf('banyan', x, y, len, (-90 + side * (62 - i * 3)) * D2R, fine)], fol));
      A.organs[i] = { x: x + side * len * 0.5, y: y - len * 0.3 };
    }
  }
  body.push(G('leaves', leaves));
  // The head: a bud with sepals, opening, then a full head with its seed spiral.
  const head: PNode[] = [];
  if (st <= 4) {
    const rr = st === 3 ? 9 : 13;
    let sep = '';
    const nS = st === 3 ? 6 : 8;
    for (let i = 0; i < nS; i++) sep += xf('M0 0Q0.4 -0.6 0 -1Q-0.4 -0.6 0 0Z', hx, hy, (i / nS) * 2 * Math.PI, rr * 1.15) + ' ';
    head.push(P(sep, fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(sep, ctx.lineOf(fol), W.main));
    if (st === 4) {
      let pet = '';
      for (let i = 0; i < 12; i++) pet += xf('M0 0Q0.32 -0.55 0 -1Q-0.32 -0.55 0 0Z', hx + Math.cos(i * 0.5236) * rr * 0.55, hy + Math.sin(i * 0.5236) * rr * 0.55, i * 0.5236 + Math.PI / 2, rr * 0.75) + ' ';
      head.push(P(pet, pal[TL.washLeaf], { opacity: 0.8 }), L(pet, ctx.lineOf(pal), W.main * 0.9));
    }
    const d = disc(hx, hy, rr * 0.6);
    head.push(P(d, fol[TL.washLeaf], { opacity: 0.8 }), L(d, ctx.lineOf(fol), W.main));
    A.canopyBox = { cx: hx, cy: hy, rx: rr * 1.4, ry: rr * 1.4 };
  } else {
    const R = st === 5 ? 15 : 19;
    const pl = st === 5 ? 14 : 17;
    const np = st === 5 ? 16 : 20;
    let pet = '';
    let pet2 = '';
    for (let i = 0; i < np; i++) {
      const a = (i / np) * 2 * Math.PI;
      const d = xf('M0 0Q0.36 -0.5 0 -1Q-0.36 -0.5 0 0Z', hx + Math.cos(a) * R * 0.86, hy + Math.sin(a) * R * 0.86, a + Math.PI / 2, pl);
      if (i % 2) pet2 += d + ' ';
      else pet += d + ' ';
    }
    head.push(P(pet2, pal[TL.washLeaf], { opacity: 0.65 }), L(pet2, ctx.lineOf(pal), W.main * 0.9), P(pet, pal[TL.washLeaf], { opacity: 0.85 }), L(pet, ctx.lineOf(pal), W.main));
    const dc = A0.sunflower.discMid;
    const d = disc(hx, hy, R);
    head.push(P(d, dc, { opacity: ctx.dark ? 0.55 : 0.3 }), L(d, ctx.wood(dc), W.main));
    if (lod !== 'icon') {
      // A Fibonacci stipple: the seed spiral, as dots of ink.
      let dots = '';
      const n = lod === 'full' ? 34 : 14;
      for (let i = 1; i <= n; i++) {
        const rr = R * 0.82 * Math.sqrt(i / n);
        const a = i * 2.39996;
        dots += `M${f(hx + Math.cos(a) * rr)} ${f(hy + Math.sin(a) * rr)}h0.01`;
      }
      head.push(L(dots, ctx.wood(dc), 1.6));
    }
    A.canopyBox = { cx: hx, cy: hy, rx: R + pl, ry: R + pl };
  }
  body.push(G('head', head));
  A.crown = { x: hx, y: hy - A.canopyBox.ry };
  A.perch = { x: (A.organs[1] ?? { x: 86 }).x, y: (A.organs[1] ?? { y: 140 }).y - 4 };
  A.neck = { x: 100, y: hy + 30, w: 5 };
  A.drift = { x: hx + 20, y: hy + 10 };
  return { body };
}
function lotus(ctx: Ctx): Res {
  const { st, TL, pal, fol, W, fine, sc, base, A } = ctx;
  const wy = base - 1; // the water line in the bowl
  const pad = (x: number, y: number, rx: number, ry: number): Leaf => {
    // A round pad with its notch, seen a little from above; veins at full detail.
    const notch = `M${f(x)} ${f(y)}L${f(x + rx * 0.95)} ${f(y - ry * 0.25)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x + rx * 0.95)} ${f(y + ry * 0.25)}Z`;
    let veins = '';
    if (fine)
      for (let i = 1; i < 7; i++) {
        const a = 0.4 + i * 0.85;
        veins += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * rx * 0.85)} ${f(y + Math.sin(a) * ry * 0.85)}`;
      }
    return { wash: notch, line: notch + veins };
  };
  const petal = (x: number, y: number, len: number, ang: number, w = 0.34) => xf(`M0 0Q${f(w * 1.4)} -0.5 0 -1Q${f(-w * 1.4)} -0.5 0 0Z`, x, y, ang + Math.PI / 2, len);
  const body: Maybe[] = [];
  const behind: Maybe[] = [];
  const n = st >= 4 ? 5 : st === 3 ? 2 : 0;
  const spots = [
    [-0.62, 0.0, 13],
    [0.6, 0.05, 12],
    [-0.28, -0.6, 10],
    [0.3, -0.62, 10],
    [0.0, 0.1, 9],
  ];
  for (let i = 0; i < n; i++) {
    const [dx, dy, r0] = spots[i];
    const rr = r0 * (st >= 4 ? sc[i] : 1) * (0.85 + st * 0.08);
    const x = 100 + dx * (30 + st * 6);
    const y = wy - 2 + dy * 10;
    const kids: PNode[] = [];
    let shape: Leaf;
    let at: V2;
    if (dy < -0.3) {
      // A standing pad on its stalk.
      const top = y - 18 - st * 4;
      kids.push(L(Q([x, wy], [x - dx * 6, (wy + top) / 2], [x, top]), ctx.lineOf(fol), W.main));
      shape = pad(x, top, rr, rr * 0.42);
      at = [x, top];
    } else {
      shape = pad(x, y, rr, rr * 0.34);
      at = [x, y];
    }
    const grp = leafGroup(ctx, st >= 4 ? `domain-${i + 1}` : null, [shape], fol, kids);
    (kids.length ? behind : body).push(grp);
    if (st >= 4) A.organs[i] = { x: at[0], y: at[1] };
  }
  // The flower: a bud at Shoot and Bough, open at Crown, with its pod at Elder.
  const fh = { 3: 30, 4: 44, 5: 50, 6: 54 }[st as 3 | 4 | 5 | 6];
  const fy = wy - fh;
  body.push(G('stem', [L(Q([100, wy], [98, wy - fh * 0.5], [100, fy]), ctx.lineOf(fol), W.main)]));
  const fl: PNode[] = [];
  if (st <= 4) {
    const big = st === 3 ? 16 : 20;
    const side = st === 3 ? 13 : 16;
    const d = petal(100, fy + 2, big, -Math.PI / 2, 0.42) + ' ' + petal(100, fy + 2, side, -Math.PI / 2 - 0.45, 0.3) + ' ' + petal(100, fy + 2, side, -Math.PI / 2 + 0.45, 0.3);
    fl.push(P(d, pal[TL.washLeaf], { opacity: 0.75 }), L(d, ctx.lineOf(pal), W.main));
    A.canopyBox = { cx: 100, cy: fy - 8, rx: 16, ry: 14 };
  } else {
    const back = [-1.15, -0.7, -0.25, 0.25, 0.7, 1.15].map((a) => petal(100, fy, 22, -Math.PI / 2 + a, 0.34)).join(' ');
    const front = [-0.85, -0.3, 0.3, 0.85].map((a) => petal(100, fy + 2, 19, -Math.PI / 2 + a * 0.9, 0.36)).join(' ') + ' ' + petal(100, fy + 3, 21, -Math.PI / 2, 0.36);
    fl.push(P(back, pal[TL.washLeaf], { opacity: 0.55 }), L(back, ctx.lineOf(pal), W.main * 0.9), P(front, pal[TL.washLeaf], { opacity: 0.85 }), L(front, ctx.lineOf(pal), W.main));
    if (st === 6) {
      const pod = `M94 ${f(fy - 6)}Q100 ${f(fy - 11)} 106 ${f(fy - 6)}L104 ${f(fy - 1)}Q100 ${f(fy)} 96 ${f(fy - 1)}Z`;
      fl.push(P(pod, A0.lotus.podTop, { opacity: 0.85 }), L(pod, ctx.lineOf(fol), W.main * 0.9));
    }
    A.canopyBox = { cx: 100, cy: fy - 10, rx: 26, ry: 18 };
  }
  body.push(G('flower', fl));
  A.crown = { x: 100, y: fy - 24 };
  A.perch = { x: 74, y: wy - 4 };
  A.neck = { x: 100, y: fy + 10, w: 4 };
  A.drift = { x: 124, y: fy };
  return { body, behind };
}
function sampaguita(ctx: Ctx): Res {
  const { st, lod, TL, pal, fol, W, fine, sc, base, A, seed, kit } = ctx;
  const r = kit.rng(seed);
  const h = { 3: 34, 4: 52, 5: 62, 6: 70 }[st as 3 | 4 | 5 | 6];
  const n = st >= 4 ? 5 : 3;
  const angs = n === 5 ? [-150, -118, -90, -62, -30] : [-130, -90, -50];
  const stems: string[] = [];
  const groups: GNode[] = [];
  for (let i = 0; i < n; i++) {
    const s = st >= 4 ? sc[i] : 1;
    const a = angs[i] * D2R;
    const len = h * s * (i === (n - 1) / 2 ? 1 : 0.86);
    const p0: V2 = [100 + Math.cos(a) * 3, base - 2];
    const p1: V2 = [100 + Math.cos(a) * len * 0.7, base - 2 + Math.sin(a) * len];
    const pc: V2 = [lerp(p0[0], p1[0], 0.2), lerp(p0[1], p1[1], 0.6)];
    stems.push(Q(p0, pc, p1));
    const list: Leaf[] = [];
    const np = lod === 'full' ? 3 : 2;
    for (let j = 1; j <= np; j++) {
      if (j === 1 && i % 2) continue;
      const t = j / (np + 0.6);
      const [x, y] = qpt(p0, pc, p1, t);
      const tan = qtan(p0, pc, p1, t);
      const ll = (lod === 'full' ? 13 : 16) * (1 - t * 0.3);
      list.push(leaf('lens', x, y, ll, tan - 0.8, fine), leaf('lens', x, y, ll, tan + 0.8, fine));
    }
    groups.push(leafGroup(ctx, n === 5 ? `domain-${i + 1}` : null, list, fol));
    if (n === 5) A.organs[i] = { x: p1[0], y: p1[1] };
    // Star flowers at the tips from Bough; more at Elder.
    if (st >= 4 && lod !== 'icon') {
      const fr = st === 6 ? 4.6 : 4;
      const d = star(p1[0], p1[1] - 2, fr * 1.4, r() * 40);
      groups.push(G(null, [P(d, pal.light, { opacity: 0.95 }), L(d, TL.starLine, W.main * 0.8), C(p1[0], p1[1] - 2, 1, A0.sampaguita.core)]));
      if (st === 6 && i % 2 === 0) {
        const [x2, y2] = qpt(p0, pc, p1, 0.6);
        const d2 = star(x2 + 5, y2 - 3, 4.4, r() * 40);
        groups.push(G(null, [P(d2, pal.light, { opacity: 0.95 }), L(d2, TL.starLine, W.main * 0.8)]));
      }
    }
  }
  A.canopyBox = { cx: 100, cy: base - h * 0.6, rx: h * 0.7, ry: h * 0.55 };
  A.crown = { x: 100, y: base - h - 6 };
  A.perch = { x: 100 - h * 0.45, y: base - h * 0.75 };
  A.neck = { x: 100, y: base - 8, w: 8 };
  A.drift = { x: 100 + h * 0.5, y: base - h * 0.5 };
  return { body: [G('stem', [L(stems.join(' '), ctx.wood(A0.seed.sampaguita), W.main)]), G('canopy', groups)] };
}
function cactus(ctx: Ctx): Res {
  const { st, lod, TL, pal, fol, W, fine, sc, base, A } = ctx;
  const g4 = st as 3 | 4 | 5 | 6;
  const H = { 3: 34, 4: 50, 5: 60, 6: 66 }[g4];
  const w = { 3: 12, 4: 15, 5: 17, 6: 19 }[g4];
  const col = (x: number, y0: number, h: number, ww: number) => `M${f(x - ww / 2)} ${f(y0)}L${f(x - ww / 2)} ${f(y0 - h + ww / 2)}A${f(ww / 2)} ${f(ww / 2)} 0 0 1 ${f(x + ww / 2)} ${f(y0 - h + ww / 2)}L${f(x + ww / 2)} ${f(y0)}`;
  const arm = (side: number, y: number, len: number, up: number, ww: number) => {
    const x0 = 100 + side * w * 0.45;
    const x1 = 100 + side * (w * 0.5 + len);
    return `M${f(x0)} ${f(y)}L${f(x1 - (side * ww) / 2)} ${f(y)}Q${f(x1 + (side * ww) / 2)} ${f(y)} ${f(x1 + (side * ww) / 2)} ${f(y - ww)}L${f(x1 + (side * ww) / 2)} ${f(y - up)}A${f(ww / 2)} ${f(ww / 2)} 0 0 ${side > 0 ? 0 : 1} ${f(x1 - (side * ww) / 2)} ${f(y - up)}L${f(x1 - (side * ww) / 2)} ${f(y - ww)}L${f(x0)} ${f(y - ww)}`;
  };
  const groups: GNode[] = [];
  const mainH = H * (st >= 4 ? sc[2] : 1);
  const main = col(100, base, mainH, w);
  const ribs = fine ? `M100 ${f(base - 2)}L100 ${f(base - mainH + 4)}M${f(100 - w * 0.25)} ${f(base - 2)}L${f(100 - w * 0.25)} ${f(base - H * 0.86)}M${f(100 + w * 0.25)} ${f(base - 2)}L${f(100 + w * 0.25)} ${f(base - H * 0.86)}` : '';
  // The column is D3; the arms are the other domains.
  groups.push(G(st >= 4 ? 'domain-3' : null, [P(main + 'Z', fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(main, ctx.lineOf(fol), W.main), ribs ? L(ribs, ctx.lineOf(fol), W.fine, { opacity: 0.6 }) : null]));
  const arms: [number, number, number, number][] =
    st >= 4
      ? [
          [-1, 0.45, 0, 1],
          [1, 0.62, 3, 3],
          [-1, 0.78, 1, 1],
          [1, 0.35, 4, 0.8],
        ]
      : [[1, 0.5, -1, 0.8]];
  for (const [side, ty, dom, kk] of arms) {
    const s = st >= 4 ? sc[dom === -1 ? 0 : dom] : 1;
    const y = base - H * ty;
    const ww = w * 0.62;
    const d = arm(side, y, w * 0.55 * s * kk + 4, H * 0.28 * s, ww);
    groups.push(G(st >= 4 ? `domain-${dom + 1}` : null, [P(d + 'Z', fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(d, ctx.lineOf(fol), W.main)]));
    if (st >= 4) A.organs[dom] = { x: 100 + side * (w + 6), y: y - 8 };
  }
  A.organs[2] = { x: 100, y: base - H * 0.6 };
  // Spines: tiny ticks in pairs.
  if (lod !== 'icon') {
    let sp = '';
    for (let y = base - 8; y > base - H + 6; y -= lod === 'full' ? 7 : 10) for (const sd of [-1, 1]) sp += `M${f(100 + (sd * w) / 2)} ${f(y)}l${f(sd * 2.6)} -1.2`;
    groups.push(G(null, [L(sp, ctx.lineOf(fol), W.main * 0.6, { opacity: 0.75 })]));
  }
  const body: Maybe[] = [G('canopy', groups)];
  if (st >= 5 && lod !== 'icon') {
    const top = base - mainH;
    const bl = [0, 1, 2, 3, 4].map((i) => xf('M0 0Q0.42 -0.55 0 -1Q-0.42 -0.55 0 0Z', 100, top + 2, (-90 + (i - 2) * 30) * D2R + Math.PI / 2, st === 6 ? 10 : 8)).join(' ');
    body.push(G('blooms', [P(bl, pal[TL.washLeaf], { opacity: 0.85 }), L(bl, ctx.lineOf(pal), W.main)]));
  }
  A.canopyBox = { cx: 100, cy: base - H * 0.55, rx: w * 2.2, ry: H * 0.55 };
  A.crown = { x: 100, y: base - H - 6 };
  A.perch = { x: 100 - w * 1.8, y: base - H * 0.5 };
  A.neck = { x: 100, y: base - 10, w };
  A.drift = { x: 120, y: base - H * 0.6 };
  return { body };
}
function bamboo(ctx: Ctx): Res {
  const { st, lod, TL, W, fine, sc, base, A, seed, kit, pal } = ctx;
  const r = kit.rng(seed);
  const n = st >= 4 ? 5 : 2;
  const H = { 3: 62, 4: 96, 5: 112, 6: 124 }[st as 3 | 4 | 5 | 6];
  const xs = n === 5 ? [-22, -11, 0, 11, 22] : [-6, 7];
  const hs = n === 5 ? [0.66, 0.84, 1, 0.9, 0.72] : [1, 0.78];
  const groups: GNode[] = [];
  const culmLine = plantLeaf.spring;
  for (let i = 0; i < n; i++) {
    const h = H * hs[i] * (st >= 4 ? sc[i] : 1);
    const x = 100 + xs[i];
    const ww = { 3: 6, 4: 6.4, 5: 7, 6: 7.6 }[st as 3 | 4 | 5 | 6] * (i === 2 ? 1.1 : 1);
    const lean = (i - (n - 1) / 2) * 1.6;
    const top: V2 = [x + lean, base - h];
    const t = taper([x, base + 1], [x + lean * 0.3, base - h * 0.5], top, ww, ww * 0.8);
    let nodes = '';
    const seg = lod === 'full' ? 14 : 18;
    for (let y = base - seg; y > base - h + 6; y -= seg) {
      const tt = (base - y) / h;
      const cxn = x + lean * tt * tt;
      nodes += `M${f(cxn - ww * 0.55)} ${f(y)}Q${f(cxn)} ${f(y + 1.4)} ${f(cxn + ww * 0.55)} ${f(y)}`;
    }
    const kids: PNode[] = [P(t.closed, A0.bamboo.mid, { opacity: TL.washLeafOp * 0.8 }), L(t.sides, ctx.lineOf(culmLine), W.main)];
    if (lod !== 'icon') kids.push(L(nodes, ctx.lineOf(culmLine), W.main * 0.9));
    // Leafy twigs near the top.
    const list: Leaf[] = [];
    for (let j = 0; j < 2; j++) {
      const y = base - h * (0.62 + j * 0.15);
      const side = (i + j) % 2 ? 1 : -1;
      const cxn = x + lean * ((base - y) / h) ** 2;
      const tip: V2 = [cxn + side * 12, y - 6];
      kids.push(L(Q([cxn + side * ww * 0.4, y], [cxn + side * 7, y - 1], tip), ctx.lineOf(culmLine), W.main * 0.8));
      const ll = lod === 'full' ? 16 : 19;
      list.push(leaf('long', tip[0], tip[1], ll, (side > 0 ? -10 : -170) * D2R + (r() - 0.5) * 0.3, fine), leaf('long', tip[0], tip[1], ll * 0.85, (side > 0 ? 35 : 145) * D2R, fine));
    }
    list.push(leaf('long', top[0], top[1], lod === 'full' ? 12 : 15, -70 * D2R, fine), leaf('long', top[0], top[1], lod === 'full' ? 11 : 14, -120 * D2R, fine));
    groups.push(leafGroup(ctx, n === 5 ? `domain-${i + 1}` : null, list, pal, kids));
    if (n === 5) A.organs[i] = { x: top[0], y: top[1] + h * 0.2 };
  }
  const order = n === 5 ? [0, 4, 1, 3, 2].map((k) => groups[k]) : groups;
  A.canopyBox = { cx: 100, cy: base - H * 0.6, rx: 40, ry: H * 0.5 };
  A.crown = { x: 100, y: base - H - 6 };
  A.perch = { x: 72, y: base - H * 0.5 };
  A.neck = { x: 100, y: base - 10, w: 30 };
  A.drift = { x: 130, y: base - H * 0.5 };
  return { body: [G('canopy', order)] };
}

const BUILD: Record<Kind, (ctx: Ctx) => Res> = { cloud: cloudTree, pine: pineTree, palm: palmTree, bonsai: bonsaiTree, sunflower, lotus, sampaguita, cactus, bamboo };
