/**
 * The plant's art, as data: a port of the Phase 0 generator
 * (scratchpad/uplift/mascot/src/mascot.mjs), cut to the 13 v1 species.
 *
 * `buildPlant(opts)` returns a PART TREE (plain groups with stable names,
 * holding path / circle / ellipse primitives) plus the anchors and a tight
 * frame. Plant.tsx maps it 1:1 onto react-native-svg. Pure and deterministic
 * (a seeded RNG per species + growth), so the same plant never changes
 * between renders, and the tree can be tested without React.
 *
 * Coordinates: viewBox 0 0 200 200, ground line y = 170, centre x = 100,
 * light from the top-left. Colours come only from theme/tokens.ts.
 *
 * Named groups (for motion later, motion.md §5): mascot › ground,
 * tree › body › (roots, trunk, branches, canopy › domain-1…5, leaves,
 * head, blooms, face), drift, fx, ground-front.
 */
import type { PlantSpecies } from '../../engine/plant';
import { lookItem, type ArtLook } from '../../engine/plantLooks';
import { plantArt as A0, plantLeaf, plantTheme, type PlantLeafPalette } from '../../theme/tokens';

// ── nodes ───────────────────────────────────────────────────────────────
export interface Paint {
  fill?: string;
  opacity?: number;
  transform?: string;
  stroke?: string;
  sw?: number;
}
export interface GNode extends Paint {
  t: 'g';
  id: string | null;
  children: PNode[];
}
export interface PathNode extends Paint {
  t: 'path';
  d: string;
}
export interface CircleNode extends Paint {
  t: 'circle';
  cx: number;
  cy: number;
  r: number;
}
export interface EllipseNode extends Paint {
  t: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
export type PNode = GNode | PathNode | CircleNode | EllipseNode;
type Maybe = PNode | null | undefined | false;

export const f = (n: number) => +n.toFixed(1);
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(str: string) {
  let h = 2166136261;
  for (const c of str) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function mix(hexA: string, hexB: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(hexA.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(hexB.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

const P = (d: string, fill: string, extra: Paint = {}): PathNode => ({ t: 'path', d, fill, ...extra });
const C = (cx: number, cy: number, r: number, fill: string, extra: Paint = {}): CircleNode => ({ t: 'circle', cx: f(cx), cy: f(cy), r: f(r), fill, ...extra });
const E = (cx: number, cy: number, rx: number, ry: number, fill: string, extra: Paint = {}): EllipseNode => ({ t: 'ellipse', cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry), fill, ...extra });
const G = (id: string | null, children: Maybe[], extra: Paint = {}): GNode => ({ t: 'g', id, children: children.filter(Boolean) as PNode[], ...extra });
const S = (d: string, stroke: string, w: number, extra: Paint = {}): PathNode => ({ t: 'path', d, fill: 'none', stroke, sw: w, ...extra });

// ── species art ─────────────────────────────────────────────────────────
type LeafGlyph = 'lens' | 'olive' | 'banyan' | 'oak' | 'maple' | 'blossom' | 'star' | 'pine';
interface CanopySpec {
  sx: number;
  sy: number;
  n: number;
  jit: number;
  bulge: number;
  dy: number;
  flat?: number;
  /**
   * 0..1: from Crown on, a lower, wider dome with a flat underside (mango),
   * so a fruit tree never reads as an oak (PR #43 UX review).
   */
  dome?: number;
  /**
   * Mobile 1.14: the crown's silhouette at icon size (24pt chips), so the
   * round-crown trees differ by SHAPE, not only colour: oak round, maple a
   * tall flame, narra a flat umbrella, cherry three puffs, mango a low dome
   * with fruit.
   */
  icon?: 'round' | 'flame' | 'umbrella' | 'puffs' | 'dome';
}
interface TreeArt {
  kind: 'tree';
  palette: PlantLeafPalette;
  bark: string;
  leaf: LeafGlyph;
  canopy: CanopySpec | { custom: 'tiers' | 'palm' | 'bonsai' };
  flourish: 'acorn' | 'samara' | 'narra' | 'blossom' | 'cone' | 'coconut' | 'mango' | 'moss';
  pot?: PotKind;
  flare?: number;
  trunkW?: number;
  fruitFrom?: number;
  seedColor?: string;
  driftGlyph?: LeafGlyph;
  driftFill?: string;
}
interface FlowerArt {
  kind: 'plant';
  build: 'sunflower' | 'lotus' | 'sampaguita' | 'cactus' | 'bamboo';
  palette: PlantLeafPalette;
  foliage: PlantLeafPalette;
  pot?: PotKind;
  seedColor?: string;
  seedStripe?: string;
  seedPatch?: boolean;
  leaf: LeafGlyph;
  driftGlyph: LeafGlyph;
  driftFill: string;
}
type SpeciesArt = TreeArt | FlowerArt;
type PotKind = 'meadow' | 'terracotta' | 'celadon' | 'bonsai' | 'pond' | 'basket' | 'stone' | 'fieldstone' | 'five-stone' | 'compass-rose' | 'banded' | 'root-woven';

const L = plantLeaf;
const B = A0.bark;
export const SPECIES_ART: Record<PlantSpecies, SpeciesArt> = {
  oak: { kind: 'tree', palette: L.grove, bark: B.oak, leaf: 'oak', canopy: { sx: 1.08, sy: 0.98, n: 9, jit: 0.55, bulge: 0.66, dy: 0, icon: 'round' }, flourish: 'acorn' },
  maple: { kind: 'tree', palette: L.ember, bark: B.maple, leaf: 'maple', canopy: { sx: 0.98, sy: 1.1, n: 11, jit: 0.25, bulge: 0.6, dy: -4, icon: 'flame' }, flourish: 'samara' },
  narra: { kind: 'tree', palette: L.spring, bark: B.narra, leaf: 'banyan', flare: 0.6, trunkW: 1.08, canopy: { sx: 1.3, sy: 0.72, n: 12, jit: 0.3, bulge: 0.56, dy: 2, flat: 0.25, icon: 'umbrella' }, flourish: 'narra' },
  'cherry-blossom': {
    kind: 'tree',
    palette: L.blossom,
    bark: B.cherry,
    leaf: 'blossom',
    canopy: { sx: 1.18, sy: 0.84, n: 13, jit: 0.3, bulge: 0.58, dy: 4, icon: 'puffs' },
    flourish: 'blossom',
    driftGlyph: 'blossom',
    driftFill: A0.gift.cherryDrift,
  },
  pine: { kind: 'tree', palette: L.evergreen, bark: B.pine, leaf: 'pine', canopy: { custom: 'tiers' }, flourish: 'cone' },
  'coconut-palm': { kind: 'tree', palette: L.spring, bark: B.coconut, leaf: 'olive', canopy: { custom: 'palm' }, flourish: 'coconut', fruitFrom: 5, seedColor: A0.gift.coconutRipe },
  mango: { kind: 'tree', palette: L.evergreen, bark: B.mango, leaf: 'olive', canopy: { sx: 1.22, sy: 0.84, n: 11, jit: 0.3, bulge: 0.6, dy: 6, flat: 0.35, dome: 1, icon: 'dome' }, flourish: 'mango', fruitFrom: 5 },
  bonsai: { kind: 'tree', palette: L.grove, bark: B.bonsai, leaf: 'pine', pot: 'bonsai', canopy: { custom: 'bonsai' }, flourish: 'moss', driftGlyph: 'blossom', driftFill: A0.white },
  sunflower: { kind: 'plant', build: 'sunflower', palette: L.gold, foliage: L.spring, seedColor: A0.seed.sunflower, seedStripe: A0.seed.sunflowerStripe, seedPatch: true, leaf: 'banyan', driftGlyph: 'lens', driftFill: A0.sunflower.drift },
  lotus: { kind: 'plant', build: 'lotus', palette: L.blossom, foliage: L.grove, pot: 'pond', seedColor: A0.seed.lotus, leaf: 'banyan', driftGlyph: 'lens', driftFill: A0.lotus.drift },
  sampaguita: { kind: 'plant', build: 'sampaguita', palette: L.pearl, foliage: L.grove, seedColor: A0.seed.sampaguita, leaf: 'banyan', driftGlyph: 'star', driftFill: L.pearl.light },
  cactus: { kind: 'plant', build: 'cactus', palette: L.blossom, foliage: L.cactus, pot: 'terracotta', seedColor: A0.seed.cactus, seedPatch: true, leaf: 'lens', driftGlyph: 'blossom', driftFill: L.blossom.light },
  bamboo: { kind: 'plant', build: 'bamboo', palette: L.grove, foliage: L.grove, leaf: 'olive', driftGlyph: 'olive', driftFill: L.grove.light },
};

// ── geometry per growth ─────────────────────────────────────────────────
interface Geo {
  body?: { cx: number; cy: number; w: number; h: number };
  stemTop?: number;
  trunk?: { wb: number; wt: number; top: number };
  canopy?: { cx: number; cy: number; rx: number; ry: number };
  faceY?: number;
  ground: 1 | 2 | 3;
  branches?: number;
  roots?: number;
}
const GEO: Record<number, Geo> = {
  1: { body: { cx: 100, cy: 157, w: 30, h: 32 }, ground: 1 },
  2: { body: { cx: 100, cy: 156, w: 32, h: 30 }, ground: 1, stemTop: 118 },
  3: { trunk: { wb: 30, wt: 18, top: 116 }, canopy: { cx: 100, cy: 94, rx: 38, ry: 33 }, faceY: 151, ground: 2 },
  4: { trunk: { wb: 36, wt: 20, top: 104 }, canopy: { cx: 100, cy: 79, rx: 54, ry: 42 }, faceY: 146, ground: 2, branches: 2 },
  5: { trunk: { wb: 42, wt: 22, top: 96 }, canopy: { cx: 100, cy: 70, rx: 68, ry: 49 }, faceY: 143, ground: 3, branches: 2, roots: 2 },
  6: { trunk: { wb: 48, wt: 25, top: 92 }, canopy: { cx: 100, cy: 64, rx: 78, ry: 52 }, faceY: 142, ground: 3, branches: 3, roots: 4 },
};

export type Lod = 'icon' | 'small' | 'full';
/** Level of detail from the rendered size (spec §5): icon ≤ 32pt, small ≤ 96pt, full above. */
export const lodFor = (size: number): Lod => (size <= 32 ? 'icon' : size <= 96 ? 'small' : 'full');

// ── shape helpers ───────────────────────────────────────────────────────
interface ScallopOpts {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  n: number;
  seed: number;
  jit?: number;
  bulge?: number;
  flat?: number;
}
/** Scalloped ellipse: a cloud canopy. One path, deterministic per seed. */
export function scallop({ cx, cy, rx, ry, n, seed, jit = 0.3, bulge = 0.6, flat = 0 }: ScallopOpts) {
  const r = rng(seed);
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + ((i + (r() - 0.5) * jit) * 2 * Math.PI) / n;
    const s = Math.sin(t);
    pts.push([cx + rx * Math.cos(t), cy + ry * s * (s > 0 ? 1 - flat : 1), s]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const Ln = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bottom = (a[2] + b[2]) / 2 > 0.5;
    const k = bottom ? bulge * 1.7 : bulge * (0.92 + r() * 0.22);
    const rad = Math.max(Ln / 2 + 0.05, Ln * k);
    d += ` A${f(rad)} ${f(rad)} 0 0 1 ${f(b[0])} ${f(b[1])}`;
  }
  return d + 'Z';
}

interface TrunkOpts {
  wb: number;
  wt: number;
  top: number;
  base?: number;
  lean?: number;
  twist?: number;
  flare?: number;
  band?: [number, number];
}
/** Tapered trunk with root flare; `band` draws a strip inside it (lit or shade side). */
export function trunkPath({ wb, wt, top, base = 170, lean = 0, twist = 0, flare = 0.35, band = [-1, 1] }: TrunkOpts) {
  const N = 14;
  const pts = (k: number) => {
    const out: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = lerp(top, base + 1, t);
      const c = 100 + lean * Math.pow(1 - t, 1.15) + twist * Math.sin(Math.PI * t) * 0.8;
      const h = lerp(wt / 2, wb / 2, Math.pow(t, 0.9)) + flare * wb * Math.pow(t, 7);
      out.push([c + k * h, y]);
    }
    return out;
  };
  const Lp = pts(band[0]);
  const R = pts(band[1]).reverse();
  const smooth = (arr: [number, number][]) => {
    let d = '';
    for (let i = 1; i < arr.length - 1; i++) {
      const m = [(arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2];
      d += `Q${f(arr[i][0])} ${f(arr[i][1])} ${f(m[0])} ${f(m[1])}`;
    }
    return d + `L${f(arr[arr.length - 1][0])} ${f(arr[arr.length - 1][1])}`;
  };
  const topR = R[R.length - 1];
  return `M${f(Lp[0][0])} ${f(Lp[0][1])}${smooth(Lp)}L${f(R[0][0])} ${f(R[0][1])}${smooth(R)}Q${f((Lp[0][0] + topR[0]) / 2)} ${f(top - 1.5)} ${f(Lp[0][0])} ${f(Lp[0][1])}Z`;
}

/** A tapered limb from (x0,y0) to (x1,y1), width w0 → w1. */
export function limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, bend = 0) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const Ln = Math.hypot(dx, dy);
  const nx = -dy / Ln;
  const ny = dx / Ln;
  const mx = (x0 + x1) / 2 + nx * bend;
  const my = (y0 + y1) / 2 + ny * bend;
  return `M${f(x0 + (nx * w0) / 2)} ${f(y0 + (ny * w0) / 2)} Q${f(mx + (nx * (w0 + w1)) / 4)} ${f(my + (ny * (w0 + w1)) / 4)} ${f(x1 + (nx * w1) / 2)} ${f(y1 + (ny * w1) / 2)} L${f(x1 - (nx * w1) / 2)} ${f(y1 - (ny * w1) / 2)} Q${f(mx - (nx * (w0 + w1)) / 4)} ${f(my - (ny * (w0 + w1)) / 4)} ${f(x0 - (nx * w0) / 2)} ${f(y0 - (ny * w0) / 2)}Z`;
}

// ── leaf glyphs (unit ~12 tall, base at 0,0, tip up) ────────────────────
const MAPLE_LEAF = (() => {
  const tips: [number, number][] = [
    [-90, 7.2],
    [-90 - 52, 6.4],
    [-90 + 52, 6.4],
    [-90 - 118, 4.6],
    [-90 + 118, 4.6],
  ];
  const order = [3, 1, 0, 2, 4];
  const pt = (a: number, r: number) => [r * Math.cos((a * Math.PI) / 180), -6 + r * Math.sin((a * Math.PI) / 180)];
  let d = 'M0 0L' + pt(-90 - 150, 2).map(f).join(' ');
  order.forEach((ti, i) => {
    const [a, r] = tips[ti];
    d += ' L' + pt(a, r).map(f).join(' ');
    if (i < order.length - 1) d += ' L' + pt((a + tips[order[i + 1]][0]) / 2, 2.4).map(f).join(' ');
  });
  return d + ' L' + pt(-90 + 150, 2).map(f).join(' ') + 'Z';
})();
const LEAF_GLYPHS: Record<string, string> = {
  lens: 'M0 0Q3.2 -6 0 -12Q-3.2 -6 0 0Z',
  olive: 'M0 0Q2.2 -7 0 -14Q-2.2 -7 0 0Z',
  banyan: 'M0 0C4.6 -2 5.6 -8.5 0 -13C-5.6 -8.5 -4.6 -2 0 0Z',
  oak: 'M0 0C-2 -.6 -3.6 -1.6 -2.8 -3.4C-5 -3.4 -5.2 -5.8 -3.2 -6.6C-5.2 -7.6 -4.4 -10.2 -2.2 -10C-2.6 -12.2 -.6 -13 0 -13C.6 -13 2.6 -12.2 2.2 -10C4.4 -10.2 5.2 -7.6 3.2 -6.6C5.2 -5.8 5 -3.4 2.8 -3.4C3.6 -1.6 2 -.6 0 0Z',
  maple: MAPLE_LEAF,
};

function glyph(kind: LeafGlyph, x: number, y: number, s: number, rot: number, fill: string, extra: Paint & { core?: string; edge?: string } = {}): PNode {
  const transform = `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`;
  if (kind === 'blossom') {
    const kids: PNode[] = [];
    for (let i = 0; i < 5; i++) {
      const a = ((i * 72 - 90) * Math.PI) / 180;
      kids.push(C(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 2.2, fill));
    }
    kids.push(C(0, 0, 1.1, extra.core || A0.gift.cherryCore));
    return G(null, kids, { transform });
  }
  if (kind === 'star') {
    const kids: PNode[] = [];
    for (let i = 0; i < 8; i++) kids.push(P('M0 0Q1.5 -3 0 -6Q-1.5 -3 0 0Z', fill, { transform: `rotate(${i * 45})`, stroke: extra.edge || L.pearl.deep, sw: 0.5 }));
    kids.push(C(0, 0, 1, extra.core || A0.sampaguita.core));
    return G(null, kids, { transform });
  }
  if (kind === 'pine') {
    const kids: PNode[] = [];
    for (let i = -2; i <= 2; i++) kids.push(S(`M0 0L${f(i * 2.2)} -9`, fill, 1.3));
    return G(null, kids, { transform });
  }
  const { core: _c, edge: _e, ...paint } = extra;
  return P(LEAF_GLYPHS[kind] || LEAF_GLYPHS.lens, fill, { transform, ...paint });
}

// ── anchors ─────────────────────────────────────────────────────────────
export interface Pt {
  x: number;
  y: number;
}
export interface Anchors {
  base: Pt;
  face?: Pt;
  neck?: Pt & { w: number };
  crown?: Pt;
  perch?: Pt;
  branchL?: Pt;
  branchR?: Pt;
  drift?: Pt;
  canopyBox?: { cx: number; cy: number; rx: number; ry: number };
  /** D1…D5 organ centres (from Bough on). */
  organs: Pt[];
}

interface Ctx {
  key: PlantSpecies;
  sp: SpeciesArt;
  st: number;
  lod: Lod;
  pal: PlantLeafPalette;
  fol: PlantLeafPalette | null;
  seed: number;
  sc: number[];
  base: number;
  A: Anchors;
  showFace: boolean;
}
interface FaceSpec {
  x: number;
  y: number;
  w: number;
  patch?: string | null;
  patchK?: number;
}
interface BodyResult {
  body: Maybe[];
  behind?: Maybe[];
  front?: Maybe[];
  faceSpec: FaceSpec | null;
}

// ── canopy builders ─────────────────────────────────────────────────────
interface CanopyResult {
  layers: GNode[];
  box: { cx: number; cy: number; rx: number; ry: number };
  organs: Pt[];
  pads?: { x: number; y: number; rx: number; ry: number; side: number }[];
}

function cloudCanopy(c: CanopySpec, st: number, pal: PlantLeafPalette, seed: number, lod: Lod, sc: number[]): CanopyResult {
  const g = GEO[st].canopy!;
  const dome = st >= 5 ? (c.dome ?? 0) : 0;
  const cx = g.cx;
  // A dome sits lower on the trunk, wider and shorter.
  const cy = g.cy + (c.dy || 0) * (st / 5) + dome * 8;
  const wide = g.rx * c.sx * (1 + 0.08 * dome);
  const rx = Math.min(wide, g.rx < 70 ? wide : 90 + 2 * dome);
  const ry = g.ry * c.sy * (1 - 0.06 * dome);
  const flat = c.flat || 0;
  const layers: Maybe[] = [];
  const organs: Pt[] = [];
  if (lod === 'icon' && c.icon) return iconCrown(c.icon, cx, cy, rx, ry, pal, seed, st);
  if (st < 4) {
    const base = { n: c.n, jit: c.jit, bulge: c.bulge, flat };
    layers.push(P(scallop({ cx, cy, rx, ry, seed, ...base }), pal.deep));
    layers.push(P(scallop({ cx: cx - rx * 0.05, cy: cy - ry * 0.09, rx: rx * 0.92, ry: ry * 0.88, seed, ...base }), pal.mid));
    if (lod !== 'icon') layers.push(P(scallop({ cx: cx - rx * 0.3, cy: cy - ry * 0.4, rx: rx * 0.34, ry: ry * 0.3, n: 6, seed: seed + 11, jit: 0.4, bulge: 0.6 }), pal.light));
  } else {
    // A core plus five domain lobes on an arc: D1 left-low → D3 top → D5 right-low.
    const core = { cx, cy: cy + ry * 0.14, rx: rx * (0.62 + 0.06 * dome), ry: ry * 0.6 };
    const cf = Math.max(flat, 0.3 + 0.3 * dome);
    layers.push(P(scallop({ ...core, n: 8, seed, jit: 0.3, bulge: 0.6, flat: cf }), pal.deep));
    layers.push(P(scallop({ cx: core.cx - rx * 0.03, cy: core.cy - ry * 0.06, rx: core.rx * 0.9, ry: core.ry * 0.85, n: 8, seed, jit: 0.3, bulge: 0.6, flat: cf }), pal.mid));
    const lobes = [0, 1, 2, 3, 4].map((i) => {
      // A dome spreads its lobes wider and flatter: D1 left → D3 top → D5 right.
      const th = ((200 - 5 * dome + i * (35 + 2.5 * dome)) * Math.PI) / 180;
      const s = sc[i];
      return {
        cx: cx + rx * (0.5 + 0.06 * dome) * Math.cos(th),
        cy: cy + ry * (0.46 - 0.06 * dome) * Math.sin(th),
        rx: rx * 0.5 * s * (1 + 0.06 * dome),
        ry: ry * 0.56 * s,
      };
    });
    const n = Math.max(6, Math.round(c.n * 0.62));
    for (const k of [0, 4, 1, 3, 2]) {
      const Lb = lobes[k];
      const s0 = seed + k * 7;
      const g2: Maybe[] = [
        P(scallop({ cx: Lb.cx, cy: Lb.cy, rx: Lb.rx, ry: Lb.ry, n, seed: s0, jit: c.jit, bulge: c.bulge, flat: flat * 0.5 }), pal.deep),
        P(scallop({ cx: Lb.cx - Lb.rx * 0.06, cy: Lb.cy - Lb.ry * 0.1, rx: Lb.rx * 0.88, ry: Lb.ry * 0.84, n, seed: s0, jit: c.jit, bulge: c.bulge, flat: flat * 0.5 }), pal.mid),
      ];
      if (lod !== 'icon' && k >= 1 && k <= 3) g2.push(P(scallop({ cx: Lb.cx - Lb.rx * 0.3, cy: Lb.cy - Lb.ry * 0.36, rx: Lb.rx * 0.4, ry: Lb.ry * 0.34, n: 5, seed: s0 + 3, jit: 0.3, bulge: 0.6 }), pal.light));
      layers.push(G(`domain-${k + 1}`, g2));
    }
    lobes.forEach((Lb) => organs.push({ x: Lb.cx + (Lb.cx - cx) * 0.55, y: Lb.cy + (Lb.cy - cy) * 0.55 }));
  }
  return { layers: [G('canopy', layers)], box: { cx, cy, rx, ry }, organs };
}

/**
 * A crown drawn for 24pt (mobile 1.14): one bold silhouette per species, in
 * two tones, so oak, maple, narra, cherry and mango read by shape alone.
 * The domain parts don't read at this size, so none are drawn.
 */
function iconCrown(kind: NonNullable<CanopySpec['icon']>, cx: number, cy: number, rx: number, ry: number, pal: PlantLeafPalette, seed: number, st: number): CanopyResult {
  const two = (d: string, lit: string): Maybe[] => [P(d, pal.deep), P(lit, pal.mid)];
  let parts: Maybe[];
  let box = { cx, cy, rx, ry };
  if (kind === 'round') {
    parts = two(scallop({ cx, cy, rx: rx * 0.92, ry: ry * 1.04, n: 16, seed, jit: 0, bulge: 0.52 }), scallop({ cx: cx - rx * 0.06, cy: cy - ry * 0.08, rx: rx * 0.8, ry: ry * 0.88, n: 16, seed, jit: 0, bulge: 0.52 }));
  } else if (kind === 'flame') {
    // Tall, with a pointed top (like the maple leaf's own tip).
    const w = rx * 0.82;
    const flame = (k: number, dx: number, dy: number) =>
      `M${f(cx + dx)} ${f(cy - ry * 1.42 * k + dy)}C${f(cx + dx + w * 0.75 * k)} ${f(cy - ry * 0.8 * k + dy)} ${f(cx + dx + w * k)} ${f(cy + ry * 0.4 * k + dy)} ${f(cx + dx)} ${f(cy + ry * 0.9 * k + dy)}C${f(cx + dx - w * k)} ${f(cy + ry * 0.4 * k + dy)} ${f(cx + dx - w * 0.75 * k)} ${f(cy - ry * 0.8 * k + dy)} ${f(cx + dx)} ${f(cy - ry * 1.42 * k + dy)}Z`;
    parts = two(flame(1, 0, 0), flame(0.84, -w * 0.08, -ry * 0.04));
    box = { cx, cy: cy - ry * 0.25, rx: w, ry: ry * 1.15 };
  } else if (kind === 'umbrella') {
    // Wide and flat on top of a tall trunk.
    const y0 = cy - ry * 0.2;
    const w = rx * 1.12;
    const dome = (k: number) => `M${f(cx - w * k)} ${f(y0 + ry * 0.2)}Q${f(cx - w * k)} ${f(y0 - ry * 0.75 * k)} ${f(cx)} ${f(y0 - ry * 0.78 * k)}Q${f(cx + w * k)} ${f(y0 - ry * 0.75 * k)} ${f(cx + w * k)} ${f(y0 + ry * 0.2)}Q${f(cx)} ${f(y0 + ry * 0.42)} ${f(cx - w * k)} ${f(y0 + ry * 0.2)}Z`;
    parts = two(dome(1), dome(0.86));
    box = { cx, cy: y0, rx: w, ry: ry * 0.6 };
  } else if (kind === 'puffs') {
    // Three round puffs side by side: a cherry's spreading cloud.
    const r = ry * 0.66;
    const puffs = [
      [cx - rx * 0.56, cy + ry * 0.08, r * 0.92],
      [cx, cy - ry * 0.22, r * 1.06],
      [cx + rx * 0.56, cy + ry * 0.08, r * 0.92],
    ];
    parts = [...puffs.map(([x, y, rr]) => C(x, y, rr, pal.deep)), ...puffs.map(([x, y, rr]) => C(x - rr * 0.08, y - rr * 0.1, rr * 0.8, pal.mid))];
  } else {
    // A low dome with a flat underside, and fruit hanging below it.
    const yb = cy + ry * 0.36;
    const dome = (k: number) => `M${f(cx - rx * k)} ${f(yb)}C${f(cx - rx * k)} ${f(yb - ry * 1.5 * k)} ${f(cx + rx * k)} ${f(yb - ry * 1.5 * k)} ${f(cx + rx * k)} ${f(yb)}Q${f(cx)} ${f(yb + 3)} ${f(cx - rx * k)} ${f(yb)}Z`;
    parts = two(dome(1), dome(0.85));
    if (st === 4) for (const dx of [-0.55, 0.55]) parts.push(E(cx + rx * dx, yb + 6, 5, 6.4, A0.gift.mangoRipe));
    box = { cx, cy: yb - ry * 0.5, rx, ry: ry * 0.75 };
  }
  return { layers: [G('canopy', parts)], box, organs: [] };
}

function tiersCanopy(bark: string, st: number, pal: PlantLeafPalette, seed: number, lod: Lod, sc: number[], lean: number): CanopyResult {
  // Pine: cloud-pruned pads on short limbs, tapering upward. D1 = lowest pad, D5 = top.
  const g = GEO[st].canopy!;
  // Shoot: three soft pads close together (a young pine, never a bare spike).
  // From Bough on: five pads, a little larger against a slimmer trunk (PR #43 UX review).
  const young = st === 3;
  const count = st >= 4 ? 5 : 3;
  const padK = st >= 4 ? 1.12 : 1.1;
  const top = g.cy - g.ry * 0.86;
  const bottom = g.cy + g.ry * 0.66;
  const pads: { x: number; y: number; rx: number; ry: number; side: number; dom: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 = top
    const dom = count - 1 - i;
    const s = st >= 4 ? sc[dom] : 1;
    const y = lerp(top + g.ry * 0.16, bottom, t);
    const side = i === 0 ? 0 : i % 2 ? -1 : 1;
    const w = lerp(g.rx * (young ? 0.62 : 0.4), g.rx * 0.95, t) * (i === 0 ? 1 : 0.8) * s * padK;
    const x = 100 + side * g.rx * (young ? 0.18 : 0.3) * (0.4 + t * 0.6) + (i === 0 ? lean : 0);
    pads.push({ x, y, rx: w, ry: Math.max(9, g.ry * (young ? 0.34 : 0.28) * s * (i === 0 ? 1.2 : 1) * padK), side, dom });
  }
  const limbs: PNode[] = [];
  const layers: PNode[] = [];
  pads.forEach((p) => {
    if (p.side !== 0) limbs.push(P(limb(100 + p.side * 3 + lean * 0.5, p.y + p.ry * 0.7 + 5, p.x - p.side * p.rx * 0.15, p.y + p.ry * 0.25, 5 + st * 0.6, 3), bark));
  });
  pads.forEach((p, k) => {
    const s = seed + k * 13;
    const g2: Maybe[] = [
      P(scallop({ cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, n: 9, seed: s, jit: 0.3, bulge: 0.62, flat: 0.55 }), pal.deep),
      P(scallop({ cx: p.x - p.rx * 0.05, cy: p.y - p.ry * 0.16, rx: p.rx * 0.9, ry: p.ry * 0.74, n: 9, seed: s, jit: 0.3, bulge: 0.62, flat: 0.55 }), pal.mid),
    ];
    if (lod !== 'icon') g2.push(P(scallop({ cx: p.x - p.rx * 0.28, cy: p.y - p.ry * 0.4, rx: p.rx * 0.4, ry: p.ry * 0.36, n: 6, seed: s + 3, jit: 0.3, bulge: 0.6 }), pal.light));
    layers.push(G(count === 5 ? `domain-${p.dom + 1}` : null, g2));
  });
  return {
    layers: [G('branches', limbs), G('canopy', layers)],
    box: { cx: 100, cy: (top + bottom) / 2, rx: g.rx, ry: (bottom - top) / 2 + g.ry * 0.3 },
    pads,
    organs: count === 5 ? [...pads].sort((a, b) => a.dom - b.dom).map((p) => ({ x: p.x, y: p.y })) : [],
  };
}

function bonsaiCanopy(bark: string, st: number, pal: PlantLeafPalette, seed: number, lod: Lod, sc: number[], trunkTop: Pt): CanopyResult {
  // Bonsai: informal upright, pads to the sides of an S-curved trunk.
  const g = GEO[st].canopy!;
  const k = g.rx / 70;
  const spots: [number, number, number, number][] =
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
  const layers: PNode[] = [];
  const limbs: PNode[] = [];
  const organs: Pt[] = [];
  spots.forEach(([ox, oy, sx, sy], i) => {
    const s = st >= 4 ? sc[i] : 1;
    // The spread stops growing after Crown, so an Elder bonsai stays inside the 200 × 200 stage.
    const hx = Math.min(g.rx, 62);
    const p = { x: 100 + ox * hx, y: g.cy + 22 * k + oy * g.ry, rx: sx * hx * s * (st === 6 ? 1.06 : 1), ry: Math.max(8, sy * g.ry * s) };
    limbs.push(P(limb(trunkTop.x + (ox < 0 ? -2 : 2), trunkTop.y + 10 + oy * 12, p.x, p.y + p.ry * 0.4, 5 + st * 0.5, 2.5, ox < 0 ? 3 : -3), bark));
    const ss = seed + i * 13;
    const g2: Maybe[] = [
      P(scallop({ cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, n: 8, seed: ss, jit: 0.3, bulge: 0.62, flat: 0.5 }), pal.deep),
      P(scallop({ cx: p.x - p.rx * 0.05, cy: p.y - p.ry * 0.16, rx: p.rx * 0.9, ry: p.ry * 0.74, n: 8, seed: ss, jit: 0.3, bulge: 0.62, flat: 0.5 }), pal.mid),
    ];
    if (lod !== 'icon') g2.push(P(scallop({ cx: p.x - p.rx * 0.28, cy: p.y - p.ry * 0.4, rx: p.rx * 0.4, ry: p.ry * 0.36, n: 6, seed: ss + 3, jit: 0.3, bulge: 0.6 }), pal.light));
    layers.push(G(st >= 4 ? `domain-${i + 1}` : null, g2));
    organs.push({ x: p.x, y: p.y });
  });
  return { layers: [G('branches', limbs), G('canopy', layers)], box: { cx: 100, cy: g.cy + 10 * k, rx: Math.min(g.rx, 62) * 1.05, ry: g.ry * 0.75 }, organs: st >= 4 ? organs : [], pads: [] };
}

function palmCanopy(st: number, pal: PlantLeafPalette, lod: Lod, sc: number[], crown: Pt): CanopyResult {
  // Coconut palm: feather fronds from the crown. Five domain fronds from Bough on.
  const angs = st >= 4 ? [-168, -132, -98, -58, -14] : [-150, -98, -36];
  const Lb = ({ 3: 40, 4: 56, 5: 68, 6: 76 } as Record<number, number>)[st];
  const layers: PNode[] = [];
  const organs: Pt[] = [];
  const order = st >= 4 ? [2, 1, 3, 0, 4] : [1, 0, 2];
  const fronds = angs.map((a, i) => {
    const s = st >= 4 ? sc[i] : 1;
    const Ln = Lb * s;
    const r = (a * Math.PI) / 180;
    const droop = Ln * 0.12 + Math.abs(Math.cos(r)) * Ln * 0.36;
    const p0: [number, number] = [crown.x, crown.y];
    const p2: [number, number] = [crown.x + Math.cos(r) * Ln, crown.y + Math.sin(r) * Ln * 0.75 + droop];
    const p1: [number, number] = [crown.x + Math.cos(r) * Ln * 0.62, crown.y + Math.sin(r) * Ln * 0.75 * 0.62 - Ln * 0.12];
    return { p0, p1, p2, L: Ln };
  });
  const bez = (fr: (typeof fronds)[number], t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * fr.p0[0] + 2 * u * t * fr.p1[0] + t * t * fr.p2[0], u * u * fr.p0[1] + 2 * u * t * fr.p1[1] + t * t * fr.p2[1]];
  };
  for (const k of order) {
    const fr = fronds[k];
    const N = 14;
    const top: [number, number][] = [];
    const bot: [number, number][] = [];
    const wmax = fr.L * 0.27;
    for (let j = 0; j <= N; j++) {
      const t = j / N;
      const [x, y] = bez(fr, t);
      const [x2, y2] = bez(fr, Math.min(1, t + 0.01));
      let nx = -(y2 - y);
      let ny = x2 - x;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const w = wmax * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.35);
      top.push([x - nx * w * 0.32, y - ny * w * 0.32]);
      const comb = lod === 'icon' ? 1 : j % 2 ? 1 : 0.62; // a comb edge for the leaflets
      bot.push([x + nx * w * comb, y + ny * w * comb]);
    }
    const d = 'M' + top.map((p) => p.map(f).join(' ')).join('L') + 'L' + bot.reverse().map((p) => p.map(f).join(' ')).join('L') + 'Z';
    const g2: Maybe[] = [P(d, k % 2 ? pal.deep : pal.mid)];
    if (lod !== 'icon') g2.push(S('M' + fr.p0.map(f).join(' ') + 'Q' + fr.p1.map(f).join(' ') + ' ' + fr.p2.map(f).join(' '), pal.light, 1.4));
    layers.push(G(st >= 4 ? `domain-${k + 1}` : null, g2));
  }
  fronds.forEach((fr) => {
    const [x, y] = bez(fr, 0.6);
    organs.push({ x, y });
  });
  return { layers: [G('canopy', layers)], box: { cx: crown.x, cy: crown.y + 4, rx: Lb, ry: Lb * 0.55 }, organs: st >= 4 ? organs : [] };
}

// ── ground and pots ─────────────────────────────────────────────────────
interface GroundResult {
  back: GNode;
  front: GNode;
  top: number;
  /** Mobile 1.14: where things standing beside the plant rest (the shelf line), and the ground's half-width. */
  floor: number;
  span: number;
}
/** The look's ground dressing (engine/plantLooks.ts grounds). */
export type GroundLook = 'meadow' | 'stone-ring' | 'trail-blaze';
interface GroundOpts {
  /** Lotus in a planter: water instead of soil. */
  water?: boolean;
  look?: GroundLook;
}
/** The keepsake and ground-mark scale per ground size (Seed … Elder grounds). */
const GROUND_K = [0, 0.72, 0.86, 1] as const;

function ground(kind: PotKind, size: 1 | 2 | 3, lod: Lod, theme: 'light' | 'dark', o: GroundOpts = {}): GroundResult {
  const T = plantTheme[theme];
  const PT = A0.pot;
  const PL = A0.planter;
  const w = [0, 34, 46, 62][size];
  const k = GROUND_K[size];
  const shadow = E(100, 172, w * 1.05, 6, T.shadow, { opacity: T.shadowOpacity });
  const back: Maybe[] = [];
  const front: Maybe[] = [];
  const look = lod === 'icon' ? 'meadow' : o.look || 'meadow';
  /** A ring of river stones around (cx, cy): the back half behind, the front half in front. */
  const stoneRing = (cx: number, cy: number, rx: number, ry: number) => {
    const n = 11;
    const behind: PNode[] = [];
    const ahead: PNode[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      const s = (i % 3 === 0 ? 1.2 : 1) * k * 1.25;
      const st = G(null, [E(x, y, 3.6 * s, 2.5 * s, i % 2 ? PL.stoneRing : mix(PL.stoneRing, A0.black, 0.12)), E(x - 0.9 * s, y - 0.8 * s, 1.6 * s, 0.9 * s, PL.stoneRingLit)]);
      (Math.sin(a) < 0 ? behind : ahead).push(st);
    }
    return { behind: G('stone-ring', behind), ahead: G('stone-ring-front', ahead) };
  };
  /** A small waymark post with a painted blaze (the True North chevron). */
  const waymark = (x: number, foot: number) => {
    // At the keepsakes' scale (UX review P15), so it reads as a real waymark beside them.
    const s = k * 1.6;
    return G('trail-blaze', [
      P(`M${f(x - 2.6 * s)} ${f(foot)}V${f(foot - 15 * s)}Q${f(x)} ${f(foot - 18 * s)} ${f(x + 2.6 * s)} ${f(foot - 15 * s)}V${f(foot)}Z`, PL.post),
      P(`M${f(x - 2.6 * s)} ${f(foot)}V${f(foot - 15 * s)}Q${f(x - 1.4 * s)} ${f(foot - 16.6 * s)} ${f(x - 0.6 * s)} ${f(foot - 16.9 * s)}V${f(foot)}Z`, PL.postLit),
      P(`M${f(x - 2.1 * s)} ${f(foot - 13 * s)}h${f(4.2 * s)}v${f(6 * s)}h${f(-4.2 * s)}Z`, PL.blaze),
      P(`M${f(x)} ${f(foot - 12.2 * s)}l${f(1.5 * s)} ${f(3.4 * s)}l${f(-1.5 * s)} ${f(-0.9 * s)}l${f(-1.5 * s)} ${f(0.9 * s)}Z`, PL.blazeMark),
    ]);
  };
  if (kind === 'meadow') {
    back.push(shadow);
    back.push(P(`M${100 - w} 174C${100 - w * 0.8} ${164 - size} ${100 + w * 0.8} ${164 - size} ${100 + w} 174Q100 ${181 + size} ${100 - w} 174Z`, A0.soil));
    back.push(P(`M${100 - w} 174C${100 - w * 0.8} ${164 - size} ${100 + w * 0.8} ${164 - size} ${100 + w} 174Q100 170 ${100 - w} 174Z`, A0.grass));
    if (look === 'stone-ring') {
      const ring = stoneRing(100, 172.5, w * 0.74, 3.6);
      back.push(ring.behind);
      front.push(ring.ahead);
    }
    if (lod !== 'icon') {
      const tuft = (x: number, s: number) =>
        P(
          `M${f(x - 4 * s)} 172Q${f(x - 3 * s)} ${f(166 - 2 * s)} ${f(x - 1.5 * s)} ${f(163 - 2 * s)}Q${f(x - 0.5 * s)} ${f(168 - s)} ${f(x)} ${f(161 - 3 * s)}Q${f(x + 1 * s)} ${f(167 - s)} ${f(x + 2.5 * s)} ${f(164 - 2 * s)}Q${f(x + 3 * s)} ${f(168 - s)} ${f(x + 4 * s)} 172Z`,
          A0.tuft,
        );
      front.push(tuft(100 - w * 0.62, 0.9 + size * 0.15), tuft(100 + w * 0.7, 0.8 + size * 0.12));
      if (size >= 2 && look !== 'stone-ring') front.push(C(100 + w * 0.42, 169.5, 1.6, A0.daisy), C(100 + w * 0.42, 169.5, 0.6, A0.daisyCore));
    }
    if (look === 'trail-blaze') front.push(waymark(100 - w * 0.72, 174));
    return { back: G('ground', back), front: G('ground-front', front), top: 168, floor: 175, span: w };
  }
  // Pots: the rim top at y = 168.
  const pw = w * 0.9;
  const ph = 14 + size * 4;
  const top = 168;
  const bot = top + ph;
  let soil: EllipseNode | null = E(100, top + 1, pw * 0.92, 3.4, A0.soilDeep);
  const potShadow = (bw: number, y: number) => E(100, y, bw, 4.5, T.shadow, { opacity: T.shadowOpacity });
  let floor = bot + 1;
  let span = pw;
  let rimTop = top;
  /** The classic tapered pot (terracotta's shape) in any material. */
  const tapered = (body: string, lit: string, rim: string, band?: string) => {
    back.push(P(`M${f(100 - pw * 0.86)} ${top + 4}L${f(100 - pw * 0.68)} ${bot}Q100 ${bot + 2} ${f(100 + pw * 0.68)} ${bot}L${f(100 + pw * 0.86)} ${top + 4}Z`, body));
    back.push(P(`M${f(100 - pw * 0.86)} ${top + 4}L${f(100 - pw * 0.68)} ${bot}Q${f(100 - pw * 0.5)} ${bot + 1} ${f(100 - pw * 0.4)} ${bot}L${f(100 - pw * 0.6)} ${top + 4}Z`, lit));
    front.push(P(`M${f(100 - pw)} ${top - 1}h${f(pw * 2)}v8q0 2 -2 2h${f(-pw * 2 + 4)}q-2 0 -2 -2Z`, rim));
    if (band) front.push(P(`M${f(100 - pw)} ${top + 5}h${f(pw * 2)}v2q0 2 -2 2h${f(-pw * 2 + 4)}q-2 0 -2 -2Z`, band));
  };
  // The front face of a tapered pot, under the rim: where a mark is painted.
  const faceY = top + 9 + (ph - 9) * 0.5;
  if (kind === 'terracotta') {
    back.push(shadow);
    tapered(PT.terracotta, PT.terracottaLit, PT.terracottaRim, PT.terracottaBand);
  } else if (kind === 'fieldstone') {
    back.push(shadow);
    tapered(PL.fieldstone, PL.fieldstoneLit, PL.fieldstoneLit);
    if (lod !== 'icon') {
      const r = rng(7 + size);
      for (let i = 0; i < 7; i++) {
        const x = 100 - pw * 0.6 + (i / 6) * pw * 1.2 + (r() - 0.5) * 4;
        const y = top + 11 + ((i * 5) % 3) * ((ph - 12) / 3) + r() * 2;
        back.push(E(x, y, 3 + r() * 2, 2 + r(), i % 2 ? PL.fieldstoneDark : PL.fieldstoneLit, { opacity: 0.85 }));
      }
    }
  } else if (kind === 'five-stone') {
    back.push(shadow);
    tapered(PL.fiveStone, mix(PL.fiveStone, A0.white, 0.3), PL.fiveStoneRim);
    // Five inset stones in a row: one per exam domain (the domain tones).
    if (lod !== 'icon') PL.fiveDots.forEach((c, i) => back.push(C(100 + (i - 2) * pw * 0.26, faceY, Math.max(1.6, pw * 0.075), c)));
  } else if (kind === 'compass-rose') {
    back.push(shadow);
    tapered(PL.compass, PL.compassLit, PL.compassRim);
    if (lod !== 'icon') {
      const s = Math.max(2.4, ph * 0.22);
      back.push(P(`M100 ${f(faceY - s * 1.5)}L${f(100 + s * 0.38)} ${f(faceY - s * 0.38)}L${f(100 + s * 1.5)} ${f(faceY)}L${f(100 + s * 0.38)} ${f(faceY + s * 0.38)}L100 ${f(faceY + s * 1.5)}L${f(100 - s * 0.38)} ${f(faceY + s * 0.38)}L${f(100 - s * 1.5)} ${f(faceY)}L${f(100 - s * 0.38)} ${f(faceY - s * 0.38)}Z`, PL.compassStar));
      back.push(C(100, faceY, s * 0.28, PL.compass));
    }
  } else if (kind === 'banded') {
    back.push(shadow);
    tapered(PL.banded, PL.bandedLit, PL.bandedRim, PL.bandedBand);
    if (lod !== 'icon') {
      back.push(P(`M${f(100 - pw * 0.8)} ${f(bot - 7)}L${f(100 + pw * 0.8)} ${f(bot - 7)}L${f(100 + pw * 0.76)} ${f(bot - 3.6)}L${f(100 - pw * 0.76)} ${f(bot - 3.6)}Z`, PL.bandedClay));
      back.push(P(`M${f(100 - pw * 0.83)} ${f(bot - 11)}L${f(100 + pw * 0.83)} ${f(bot - 11)}L${f(100 + pw * 0.82)} ${f(bot - 9.6)}L${f(100 - pw * 0.82)} ${f(bot - 9.6)}Z`, PL.bandedBand));
    }
  } else if (kind === 'celadon') {
    back.push(shadow);
    back.push(P(`M${f(100 - pw)} ${top}C${f(100 - pw)} ${bot - 2} ${f(100 - pw * 0.5)} ${bot} 100 ${bot}C${f(100 + pw * 0.5)} ${bot} ${f(100 + pw)} ${bot - 2} ${f(100 + pw)} ${top}Z`, PT.celadon));
    back.push(P(`M${f(100 - pw * 0.88)} ${top + 3}C${f(100 - pw * 0.86)} ${bot - 6} ${f(100 - pw * 0.6)} ${bot - 2} ${f(100 - pw * 0.4)} ${bot - 1.5}C${f(100 - pw * 0.66)} ${bot - 6} ${f(100 - pw * 0.7)} ${top + 6} ${f(100 - pw * 0.66)} ${top + 3}Z`, PT.celadonLit));
    if (lod !== 'icon') back.push(S(`M${f(100 + pw * 0.2)} ${top + 6}l4 4l-2 4l5 3`, PT.celadonLine, 0.8));
    back.push(P(`M${f(100 - pw * 0.4)} ${bot - 0.5}h${f(pw * 0.8)}v2.5h${f(-pw * 0.8)}Z`, PT.celadonLine));
    front.push(P(`M${f(100 - pw - 1)} ${top - 1}h${f(pw * 2 + 2)}v3q0 1.5 -1.5 1.5h${f(-pw * 2 + 1)}q-1.5 0 -1.5 -1.5Z`, PT.celadonRim));
  } else if (kind === 'bonsai') {
    const bw = pw * 1.25;
    const bh = 8 + size * 2;
    back.push(potShadow(bw, top + bh + 4));
    back.push(P(`M${f(100 - bw)} ${top}h${f(bw * 2)}l-3 ${bh}h${f(-bw * 2 + 6)}Z`, PT.tray));
    back.push(P(`M${f(100 - bw * 0.82)} ${top + bh}h7v3h-7Z M${f(100 + bw * 0.82 - 7)} ${top + bh}h7v3h-7Z`, PT.trayFoot));
    front.push(P(`M${f(100 - bw - 1)} ${top - 1.5}h${f(bw * 2 + 2)}v3h${f(-bw * 2 - 2)}Z`, PT.trayRim));
    soil = E(100, top + 1, bw * 0.95, 3.4, A0.soilDeep);
    if (lod !== 'icon') front.push(P(`M${f(100 + bw * 0.45)} ${top - 1}q4 -6 9 0Z`, PT.pebble), P(`M${f(100 - bw * 0.7)} ${top - 1}q5 -4 9 0Z`, A0.grass));
    floor = top + bh + 3;
    span = bw;
  } else if (kind === 'basket' || kind === 'root-woven') {
    back.push(shadow);
    back.push(P(`M${f(100 - pw * 0.95)} ${top}L${f(100 - pw * 0.78)} ${bot}h${f(pw * 1.56)}L${f(100 + pw * 0.95)} ${top}Z`, PT.basket));
    if (lod !== 'icon') {
      for (let y = top + 4; y < bot - 1; y += 4) back.push(S(`M${f(100 - pw * 0.92 + (y - top) * 0.17)} ${y}H${f(100 + pw * 0.92 - (y - top) * 0.17)}`, PT.basketWeave, 1.2));
      for (let i = -3; i <= 3; i++) back.push(S(`M${f(100 + i * pw * 0.26)} ${top + 1}L${f(100 + i * pw * 0.21)} ${bot - 1}`, PT.basketRib, 1.3));
      // Root-woven: living roots wound through the weave.
      if (kind === 'root-woven')
        for (const [x0, dir] of [
          [-0.7, 1],
          [0.15, -1],
          [0.55, 1],
        ] as const)
          back.push(S(`M${f(100 + x0 * pw)} ${top + 2}C${f(100 + (x0 + dir * 0.25) * pw)} ${f(top + ph * 0.35)} ${f(100 + (x0 - dir * 0.15) * pw)} ${f(top + ph * 0.65)} ${f(100 + (x0 + dir * 0.1) * pw)} ${bot - 1}`, PL.root, 2));
    }
    front.push(P(`M${f(100 - pw - 1)} ${top - 2}h${f(pw * 2 + 2)}v4h${f(-pw * 2 - 2)}Z`, kind === 'root-woven' ? PL.root : PT.basketRim));
    rimTop = top - 2;
  } else if (kind === 'pond') {
    const bw = pw * 1.3;
    const bh = 10 + size * 3;
    back.push(potShadow(bw, top + bh + 3));
    back.push(P(`M${f(100 - bw)} ${top}C${f(100 - bw)} ${top + bh} ${f(100 - bw * 0.6)} ${top + bh + 2} 100 ${top + bh + 2}C${f(100 + bw * 0.6)} ${top + bh + 2} ${f(100 + bw)} ${top + bh} ${f(100 + bw)} ${top}Z`, PT.bowl));
    back.push(P(`M${f(100 - bw * 0.9)} ${top + 3}C${f(100 - bw * 0.85)} ${top + bh - 2} ${f(100 - bw * 0.5)} ${top + bh} ${f(100 - bw * 0.3)} ${top + bh + 0.5}C${f(100 - bw * 0.62)} ${top + bh - 4} ${f(100 - bw * 0.7)} ${top + 6} ${f(100 - bw * 0.68)} ${top + 3}Z`, PT.bowlLit));
    back.push(E(100, top + 0.5, bw * 0.95, 4, PT.water));
    if (lod !== 'icon') back.push(S(`M${f(100 + bw * 0.3)} ${top + 0.5}h${f(bw * 0.3)} M${f(100 - bw * 0.5)} ${top + 1.6}h${f(bw * 0.2)}`, PT.ripple, 0.9));
    front.push(P(`M${f(100 - bw - 1)} ${top - 1.2}h${f(bw * 2 + 2)}v2.6h${f(-bw * 2 - 2)}Z`, PT.bowlRim));
    if (look === 'stone-ring') {
      const ring = stoneRing(100, top + bh, bw * 1.04, 2.8);
      back.unshift(ring.behind);
      front.push(ring.ahead);
    }
    if (look === 'trail-blaze') front.push(waymark(100 - bw - 7 * k, top + bh + 3));
    return { back: G('ground', back), front: G('ground-front', front), top: top - 1, floor: top + bh + 3, span: bw };
  } else if (kind === 'stone') {
    const sw = pw * 1.1;
    back.push(shadow);
    back.push(P(`M${f(100 - sw)} ${bot - 1}C${f(100 - sw * 1.05)} ${top + 2} ${f(100 - sw * 0.55)} ${top - 3} 100 ${top - 2}C${f(100 + sw * 0.6)} ${top - 3} ${f(100 + sw * 1.05)} ${top + 3} ${f(100 + sw)} ${bot - 1}Q100 ${bot + 2} ${f(100 - sw)} ${bot - 1}Z`, PT.stone));
    back.push(P(`M${f(100 - sw * 0.9)} ${bot - 3}C${f(100 - sw)} ${top + 4} ${f(100 - sw * 0.5)} ${top} ${f(100 - sw * 0.2)} ${top}C${f(100 - sw * 0.6)} ${top + 4} ${f(100 - sw * 0.7)} ${bot - 6} ${f(100 - sw * 0.5)} ${bot}Z`, PT.stoneLit));
    front.push(P(`M${f(100 - sw * 0.75)} ${top + 2}C${f(100 - sw * 0.5)} ${top - 4} ${f(100 + sw * 0.5)} ${top - 4} ${f(100 + sw * 0.78)} ${top + 2}Q${f(100 + sw * 0.4)} ${top + 6} ${f(100 + sw * 0.1)} ${top + 3}Q${f(100 - sw * 0.3)} ${top + 7} ${f(100 - sw * 0.75)} ${top + 2}Z`, A0.grass));
    return { back: G('ground', back), front: G('ground-front', front), top: top - 2, floor: bot, span: sw };
  }
  // Lotus in a planter: still water inside the rim (it lives in water).
  if (o.water) {
    soil = E(100, top + 1, pw * 0.92, 3.6, PT.water);
    if (lod !== 'icon') front.push(S(`M${f(100 + pw * 0.25)} ${top + 1}h${f(pw * 0.3)}`, PT.ripple, 0.9));
  }
  back.push(soil);
  // The ground look around a pot: the stone ring at its foot, the blaze painted on its face.
  if (look === 'stone-ring') {
    const ring = stoneRing(100, floor - 3.5, span * 0.98, 2.6);
    back.unshift(ring.behind);
    front.push(ring.ahead);
  }
  if (look === 'trail-blaze' && lod !== 'icon') {
    // ×1.6 (UX review P15), so the painted blaze reads at 104pt; never past the pot's face.
    const s = Math.min((ph - 8) / 10, Math.max(0.7, ph / 22) * 1.6);
    const y = kind === 'bonsai' ? top + 1 + (floor - top - 4) / 2 : faceY + (kind === 'celadon' ? 0 : 2);
    if (kind === 'bonsai') front.push(waymark(100 - span - 7 * k, floor));
    else
      front.push(
        G('trail-blaze', [
          P(`M${f(100 - 4 * s)} ${f(y - 4.5 * s)}h${f(8 * s)}v${f(9 * s)}h${f(-8 * s)}Z`, PL.blaze, { opacity: 0.95 }),
          P(`M100 ${f(y - 3.2 * s)}l${f(2.6 * s)} ${f(5.6 * s)}l${f(-2.6 * s)} ${f(-1.5 * s)}l${f(-2.6 * s)} ${f(1.5 * s)}Z`, PL.blazeMark),
        ]),
      );
  }
  return { back: G('ground', back), front: G('ground-front', front), top: Math.min(top, rimTop + 2), floor, span };
}

// ── face ────────────────────────────────────────────────────────────────
/** Moods draw the eyes and mouth only; posture and marks live elsewhere. Never sad. */
export const MOODS = ['idle', 'happy', 'curious', 'proud', 'resting', 'blink'] as const;
export type Mood = (typeof MOODS)[number];

function face(x: number, y: number, w: number, mood: Mood, lod: Lod): GNode {
  const INK = A0.ink;
  const sp = Math.min(Math.max(w * 0.4, 8), 17) / 2; // half the eye spacing
  const er = Math.min(Math.max(w * 0.1, 2.4), 4.2); // eye radius
  const kids: Maybe[] = [];
  const eyeL = x - sp;
  const eyeR = x + sp;
  const lw = Math.max(1.2, er * 0.55);
  if (mood === 'happy') {
    for (const ex of [eyeL, eyeR]) kids.push(S(`M${f(ex - er)} ${f(y + er * 0.3)}Q${f(ex)} ${f(y - er * 1.5)} ${f(ex + er)} ${f(y + er * 0.3)}`, INK, lw));
  } else if (mood === 'proud') {
    // Proud (UX review P3, option a): content half-lids, the eyes' lower
    // halves under a calm lid line. Clearly not happy's "^ ^".
    for (const ex of [eyeL, eyeR]) {
      kids.push(P(`M${f(ex - er * 0.92)} ${f(y - er * 0.05)}A${f(er * 0.92)} ${f(er * 1.05)} 0 0 0 ${f(ex + er * 0.92)} ${f(y - er * 0.05)}Z`, INK));
      kids.push(S(`M${f(ex - er * 1.15)} ${f(y - er * 0.05)}Q${f(ex)} ${f(y - er * 0.55)} ${f(ex + er * 1.15)} ${f(y - er * 0.05)}`, INK, lw));
    }
  } else if (mood === 'resting') {
    for (const ex of [eyeL, eyeR]) kids.push(S(`M${f(ex - er)} ${f(y + er * 0.2)}Q${f(ex)} ${f(y + er * 1.3)} ${f(ex + er)} ${f(y + er * 0.2)}`, INK, lw));
  } else if (mood === 'blink') {
    for (const ex of [eyeL, eyeR]) kids.push(S(`M${f(ex - er * 0.9)} ${f(y + er * 0.4)}H${f(ex + er * 0.9)}`, INK, lw));
  } else {
    const big = mood === 'curious' ? 1.28 : 1;
    for (const ex of [eyeL, eyeR]) {
      kids.push(E(ex, y, er * 0.86 * big, er * 1.12 * big, INK));
      if (lod === 'full') kids.push(C(ex - er * 0.3, y - er * 0.45, er * 0.34 * big, A0.white, { opacity: 0.9 }));
    }
    if (mood === 'curious') kids.push(S(`M${f(eyeR - er)} ${f(y - er * 2.5)}Q${f(eyeR)} ${f(y - er * 3.3)} ${f(eyeR + er * 1.1)} ${f(y - er * 2.4)}`, INK, lw * 0.85));
  }
  if (lod !== 'icon') {
    const co = mood === 'proud' ? 0.7 : mood === 'happy' ? 0.6 : 0.38;
    kids.unshift(E(eyeL - er * 0.9, y + er * 2.1, er * 1.3, er * 0.75, A0.blush, { opacity: co }), E(eyeR + er * 0.9, y + er * 2.1, er * 1.3, er * 0.75, A0.blush, { opacity: co }));
  }
  const my = y + er * 2.4;
  const mw = er * 1.05;
  if (mood === 'happy') kids.push(P(`M${f(x - mw * 1.25)} ${f(my - 0.6)}Q${f(x)} ${f(my + mw * 2)} ${f(x + mw * 1.25)} ${f(my - 0.6)}Z`, INK));
  else if (mood === 'curious') kids.push(E(x, my + 0.6, mw * 0.5, mw * 0.62, INK));
  else if (mood === 'resting') kids.push(S(`M${f(x - mw * 0.55)} ${f(my + 0.4)}Q${f(x)} ${f(my + 1.3)} ${f(x + mw * 0.55)} ${f(my + 0.4)}`, INK, lw * 0.85));
  // Proud: a wider closed smile (no open mouth: that is happy's).
  else if (mood === 'proud') kids.push(S(`M${f(x - mw * 1.65)} ${f(my - 1)}Q${f(x)} ${f(my + mw * 1.9)} ${f(x + mw * 1.65)} ${f(my - 1)}`, INK, lw * 1.05));
  else kids.push(S(`M${f(x - mw * 0.8)} ${f(my)}Q${f(x)} ${f(my + mw * 1.1)} ${f(x + mw * 0.8)} ${f(my)}`, INK, lw * 0.9));
  return G('face', kids);
}

// ── state marks ─────────────────────────────────────────────────────────
/**
 * Mobile 1.14: moods are expressions on the FACE only (Quiet look shows
 * none), so the only mark left is the resting look's small honey moon:
 * calm, no "z", no droop, no colour loss.
 */
function effects(mood: Mood, A: Anchors, lod: Lod, theme: 'light' | 'dark'): GNode | null {
  if (lod === 'icon' || !A.canopyBox || mood !== 'resting') return null;
  const T = plantTheme[theme];
  const { cx, cy, rx, ry } = A.canopyBox;
  const k = Math.min(2, Math.max(1, rx / 34));
  const about = (x: number, y: number) => `translate(${f(x)} ${f(y)}) scale(${f(k)}) translate(${f(-x)} ${f(-y)})`;
  const mx = cx + rx * 0.7;
  const my = cy - ry - 2 - 6 * k;
  return G('fx', [P(`M${f(mx)} ${f(my - 8)}A8 8 0 1 0 ${f(mx + 7)} ${f(my + 4)}A6.4 6.4 0 1 1 ${f(mx)} ${f(my - 8)}Z`, T.honey)], { transform: about(mx, my) });
}

// ── visitors (mobile 1.14: they perch on days you clear your plan) ──────
/** A small round songbird facing right, sitting at (x, y) (its feet). Original art. */
function bird(kind: 'wren' | 'robin', x: number, y: number, s: number, lod: Lod): GNode {
  const V = A0.visitor;
  const body = kind === 'wren' ? V.wren : V.robin;
  const dark = kind === 'wren' ? V.wrenDark : V.robinDark;
  const belly = kind === 'wren' ? V.wrenBelly : V.robinBreast;
  const kids: Maybe[] = [
    // The tail: a wren's cocks straight up; a robin's sits low.
    kind === 'wren' ? P('M-5 -6L-9 -16L-6.4 -16.6L-2.6 -7Z', dark) : P('M-6 -4L-13 -8L-11.6 -2Z', dark),
    E(0, -6, 7.6, 6.2, body),
    E(1.8, -4.2, 5, 4, belly, kind === 'robin' ? {} : { opacity: 0.95 }),
    C(4.8, -10.4, 4.3, body),
    kind === 'robin' ? E(5.4, -8.4, 3, 2.6, belly) : null,
    P('M8.7 -11.2l3.8 1.3l-3.8 1.1Z', V.beak),
    C(6.1, -11.3, 1, A0.ink),
    lod === 'full' ? C(5.8, -11.6, 0.35, A0.white) : null,
    P('M-4.6 -8Q0.4 -9 2 -5Q-3 -2.6 -4.6 -8Z', dark),
    kind === 'wren' && lod === 'full' ? S('M3.2 -12.6Q6 -13.6 8.6 -12.6', V.wrenBelly, 0.7) : null,
    S('M-1 0.2v1.8 M2 0.2v1.8', V.leg, 0.9),
  ];
  return G('visitor', kids, { transform: `translate(${f(x)} ${f(y)}) scale(${f(s)})` });
}

function visitorNode(id: string | undefined, A: Anchors, lod: Lod): GNode | null {
  if (lod === 'icon' || !A.perch || (id !== 'wren' && id !== 'robin')) return null;
  const k = Math.min(1.6, Math.max(0.85, (A.canopyBox ? A.canopyBox.rx : 30) / 40));
  return bird(id, A.perch.x, A.perch.y + 1, k, lod);
}

// ── keepsakes (mobile 1.14: each badge's emblem as a small object) ──────
/**
 * One keepsake, drawn about its foot at (0, 0), about 20 units tall and up
 * to ±11 wide. Simple shapes, so it still reads at 64pt. Original art.
 */
export function keepsakeShape(id: string, lod: Lod, theme: 'light' | 'dark' = 'light'): PNode[] {
  const parts = keepsakeParts(id, lod, theme);
  if (theme !== 'dark' || !parts.length) return parts;
  // Dark (UX review P12): a 1px cream rim at 35% round the object, so a
  // dark post or a dark bird never sinks into the night page.
  const rim = (n: PNode): PNode =>
    n.t === 'g'
      ? { ...n, children: n.children.map(rim) }
      : { ...n, fill: n.fill === 'none' ? 'none' : A0.keepsake.cream, stroke: A0.keepsake.cream, sw: (n.stroke ? (n.sw ?? 1) : 0) + 1.3, opacity: undefined };
  // The ground shade (the first, low ellipse of most) gets no rim.
  const body = parts.filter((n) => !(n.t === 'ellipse' && n.fill === A0.black));
  return [G(null, body.map(rim), { opacity: 0.35 }), ...parts];
}

function keepsakeParts(id: string, lod: Lod, theme: 'light' | 'dark'): PNode[] {
  // Dark: the darkest wood lifts to the mid wood (it would vanish on the night page).
  const K = theme === 'dark' ? { ...A0.keepsake, woodDark: A0.keepsake.wood, wood: A0.keepsake.woodLit } : A0.keepsake;
  const fine = lod === 'full';
  const shade = E(0, 0.4, 8.5, 1.8, A0.black, { opacity: 0.12 });
  switch (id) {
    case 'stepping-stone':
      return [shade, E(0, -2.6, 9.4, 3.6, K.stone), E(-2.4, -3.9, 4.6, 1.4, K.stoneLit), fine ? S('M3 -2.2q2 0.6 4 -0.2', K.stoneDark, 0.7) : null].filter(Boolean) as PNode[];
    case 'trail-post':
      return [shade, P('M-2.6 0V-17Q0 -20.4 2.6 -17V0Z', K.wood), P('M-2.6 0V-17Q-1.6 -18.6 -0.6 -19V0Z', K.woodLit), P('M-2.6 -14h5.2v3h-5.2Z', K.clay), P('M-2.6 -9.4h5.2v1.6h-5.2Z', K.cream)];
    case 'trail-board':
      return [shade, P('M-7.4 0V-12h2.4V0Z', K.woodDark), P('M5 0V-12h2.4V0Z', K.woodDark), P('M-10 -19.5h20v8.5h-20Z', K.wood), P('M-10 -19.5h20v2h-20Z', K.woodLit), S('M-7 -14.2h9 M-7 -12.6h6', K.cream, 1)];
    case 'compass-stone':
      return [shade, E(0, -6.2, 8.4, 6.6, K.stone), E(-2.4, -8.6, 3.6, 2.2, K.stoneLit), P('M0 -11.4L1.2 -7.4L5 -6.2L1.2 -5L0 -1L-1.2 -5L-5 -6.2L-1.2 -7.4Z', K.gold), C(0, -6.2, 0.9, K.stoneDark)];
    case 'jay':
      return [
        shade,
        P('M-6 -6L-12 -4.6L-11 -2.4L-5.4 -4Z', K.jayBlack),
        E(0, -6.4, 7.2, 5.6, K.jay),
        P('M-4.8 -8.4Q0 -10 2.2 -5.6Q-2.6 -3.6 -4.8 -8.4Z', K.jayBlue),
        S('M-3.6 -7.6l1.4 1.2 M-2 -8.3l1.4 1.2 M-0.4 -8.6l1.4 1.2', A0.white, 0.6),
        C(4.6, -11, 4, K.jay),
        P('M2.8 -14.6Q5 -16.6 7.4 -14.2Q5 -13.6 2.8 -14.6Z', K.cream),
        P('M8.3 -11.6l3.4 1.1l-3.4 1Z', K.jayBlack),
        C(5.8, -11.6, 0.95, A0.ink),
        S('M4.6 -9.6q1.6 1 3 0.4', K.jayBlack, 0.8),
        S('M-1 0.2v-1.8 M2 0.2v-1.8', A0.visitor.leg, 0.9),
      ];
    case 'empty-nest':
      return [
        shade,
        P('M-9 -6.4Q-8.4 0 0 0Q8.4 0 9 -6.4Z', K.wood),
        E(0, -6.4, 9, 2.6, K.woodDark),
        S('M-8.6 -5Q-2 -2 6 -5.6 M-7 -3Q0 -1 7.6 -3.6 M-6 -6.6l3 1.4 M2 -7l4 1', K.woodLit, 0.9),
      ];
    case 'woven-ring':
      return [
        shade,
        C(0, -8.6, 7.4, 'none', { stroke: K.wood, sw: 3 }),
        C(0, -8.6, 7.4, 'none', { stroke: K.woodLit, sw: 1, opacity: 0.85 }),
        fine ? S('M-5.6 -13.4l1.8 1.6 M4 -14.4l-1.4 1.8 M-7.6 -7.6h2.4 M5.2 -7.6h2.4', K.woodDark, 0.8) : null,
        C(0, -1.2, 1.7, K.clay),
      ].filter(Boolean) as PNode[];
    case 'fern':
      return [
        S('M-1 0Q-5 -8 -9 -14', K.fern, 1.4),
        S('M1 0Q4 -9 2 -18', K.fern, 1.4),
        ...[0.25, 0.45, 0.65, 0.85].flatMap((t) => [
          glyph('olive', -1 - 8 * t, -14 * t, 0.42, -100 + t * 40, K.fernLit),
          glyph('olive', -1 - 8 * t, -14 * t, 0.42, -10 + t * 30, K.fern),
          glyph('olive', 1 + 3 * t, -18 * t, 0.42, -60, K.fern),
          glyph('olive', 1 + 3 * t, -18 * t, 0.42, 60, K.fernLit),
        ]),
      ];
    case 'still-pond':
      return [E(0, -2.4, 11, 3.6, K.waterRim), E(0, -2.8, 9.6, 2.7, K.water), S('M-4 -2.8h4 M2 -2h3', A0.white, 0.7, { opacity: 0.7 }), S('M7 -3Q7.6 -10 9 -14', K.reed, 1.1), S('M8.4 -3Q8.2 -8 10.6 -11', K.reed, 1.1), E(9, -14.6, 0.9, 2, K.woodDark)];
    case 'dew-web': {
      const kids: PNode[] = [S('M-8 0L-7 -18', K.woodDark, 1.2), S('M8 0L7.4 -18', K.woodDark, 1.2)];
      for (const a of [-60, -20, 20, 60, 180]) kids.push(S(`M0 -10L${f(Math.cos((a * Math.PI) / 180) * 7.2)} ${f(-10 + Math.sin((a * Math.PI) / 180) * 7.2)}`, K.web, 0.6, { opacity: 0.9 }));
      kids.push(S('M-3.4 -10a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0 M-6 -10a6 6 0 1 0 12 0a6 6 0 1 0 -12 0', K.web, 0.6, { opacity: 0.85 }));
      kids.push(C(-3, -13, 1, K.dew), C(4.4, -7.6, 1.1, K.dew), C(1.2, -16, 0.8, K.dew));
      return kids;
    }
    case 'weather-vane':
      return [shade, S('M0 0V-19', K.woodDark, 1.4), S('M-7 -19H7', K.woodDark, 1.2), P('M7 -19l-3 -2.6v5.2Z', K.gold), P('M-7 -19l-1.6 -2.8h3.4l1.4 2.8l-1.4 2.8h-3.4Z', K.gold), C(0, -19, 1.2, K.goldLit), S('M-3 -14h6', K.woodDark, 0.9)];
    case 'lantern':
      return [
        shade,
        P('M-4.6 0h9.2v-2h-9.2Z', K.woodDark),
        P('M-4 -2Q-5.4 -8 -3.4 -13h6.8Q5.4 -8 4 -2Z', K.lanternGlow),
        E(-1.4, -8, 1.3, 3.6, A0.white, { opacity: 0.55 }),
        S('M-3.4 -13V-2 M3.4 -13V-2', K.woodDark, 0.8),
        P('M-4.6 -13h9.2l-1.6 -2.6h-6Z', K.woodDark),
        S('M-2.6 -15.6Q0 -19.4 2.6 -15.6', K.woodDark, 1),
      ];
    case 'sundial':
      return [shade, P('M-3 0V-9h6V0Z', K.stone), P('M-3 0V-9h2V0Z', K.stoneLit), E(0, -10, 8.4, 2.6, K.stoneDark), E(0, -10.6, 8, 2.2, K.stoneLit), P('M-1 -10.6L5 -10.6L-1 -16Z', K.gold), fine ? S('M-6 -10.6l1 0.4 M-3 -12.2l0.6 0.6 M4 -12l-0.6 0.6', K.stoneDark, 0.6) : null].filter(Boolean) as PNode[];
    case 'swallow':
      return [
        shade,
        P('M-5 -7L-13 -3.4L-10 -5.6L-12.6 -1.2L-4.4 -5Z', K.swallow),
        E(0, -6.6, 6.8, 5, K.swallow),
        E(1.6, -4.8, 4.6, 3.2, K.cream),
        C(4.2, -10.4, 3.6, K.swallow),
        C(5.2, -8.4, 1.8, K.swallowThroat),
        P('M7.6 -11l2.6 0.8l-2.6 0.8Z', K.jayBlack),
        C(5.4, -11.2, 0.9, A0.ink),
        S('M-1 0.2v-1.8 M1.8 0.2v-1.8', A0.visitor.leg, 0.9),
      ];
    case 'fox':
      return [
        shade,
        // The tail curls round in front of its feet.
        P('M-8 -2Q-13 -6 -9 -11Q-7 -6 -1 -1.6Q-4 0.2 -8 -2Z', K.fox),
        P('M-11.6 -8.2Q-12.6 -10.2 -10.4 -11.6Q-10.4 -9.6 -9.6 -8.8Z', K.cream),
        P('M-4.6 0Q-6 -9 -1 -12.6Q3.6 -12 4 -4Q4.4 0 1 0Z', K.fox),
        P('M0.6 -1Q-0.2 -7 2.6 -10Q4 -5 3.4 -1Z', K.cream),
        P('M-3.2 -11.6Q-2 -17.6 3.4 -16.6Q7 -16 9.6 -13.2Q6 -11.4 1 -10.6Z', K.fox),
        P('M-2.6 -14.4L-2.4 -19.6L0.4 -16.2Z', K.foxDark),
        P('M1.4 -16.4L2.8 -20.6L4.6 -16.2Z', K.foxDark),
        P('M9.6 -13.2Q6.4 -11.8 4 -12.6Q6.6 -13 9.6 -13.2Z', K.cream),
        C(10, -13.3, 0.9, A0.ink),
        C(3.6, -14.6, 0.8, A0.ink),
      ];
    case 'cairn':
      return [shade, E(0, -2.6, 8.4, 3, K.stoneDark), E(0.6, -7.4, 6.4, 2.6, K.stone), E(-0.4, -11.6, 4.6, 2.2, K.stoneLit), E(0.3, -15.2, 2.8, 1.8, K.stone), E(-1.6, -8.2, 2.6, 0.8, K.stoneLit)];
    case 'signpost':
      return [shade, P('M-1.2 0V-20h2.4V0Z', K.woodDark), P('M-1 -18.6h9l2.6 2.4l-2.6 2.4h-9Z', K.wood), P('M1 -12.4h-9l-2.6 2.4l2.6 2.4h9Z', K.woodLit), S('M0.8 -16.2h5', K.cream, 0.9), S('M-0.8 -10h-5', K.cream, 0.9)];
    case 'roe-deer':
      return [
        shade,
        S('M-5 -6V0 M-2.6 -6V0 M4.2 -6.4V0 M6.4 -6.6V0', K.deerDark, 1.3),
        E(0.6, -8.6, 7.6, 3.8, K.deer),
        E(-6.4, -8.2, 1.9, 2.2, K.cream),
        P('M5 -10Q6 -15 8.4 -16.6L10 -15Q8.4 -12.8 8 -9Z', K.deer),
        E(9.6, -16.2, 2.8, 1.9, K.deer),
        S('M8 -18.2l-0.6 -3.4 M9.4 -18.4l0.6 -3.4', K.deerDark, 0.9),
        P('M7.4 -18.4l-1.6 -1l1.8 -0.4Z', K.deerDark),
        C(10, -16.6, 0.65, A0.ink),
        C(12.2, -15.8, 0.6, A0.ink),
      ];
    case 'mushroom-ring':
      return [
        shade,
        ...([
          [-6.4, 0.9],
          [0.6, 1.2],
          [6.6, 0.8],
        ] as const).flatMap(([x, s]) => [
          P(`M${f(x - 1.4 * s)} 0V${f(-5 * s)}h${f(2.8 * s)}V0Z`, K.mushroomStem),
          P(`M${f(x - 5 * s)} ${f(-5 * s)}Q${f(x)} ${f(-12.6 * s)} ${f(x + 5 * s)} ${f(-5 * s)}Z`, K.mushroom),
          C(x - 1.6 * s, -7.4 * s, 0.8 * s, K.mushroomStem),
          C(x + 1.8 * s, -8.2 * s, 0.7 * s, K.mushroomStem),
        ]),
      ];
    case 'clear-dawn':
      // Only the icon draws it here; on the plant it is a soft sun behind the crown.
      return [C(0, -10, 8, K.dawn), C(0, -10, 5.4, K.goldLit), S('M-11 -1H11', K.stone, 1.4), S('M-8 1.6H8', K.stoneLit, 1.2)];
    case 'pebble-path':
      return [E(-7.6, -0.8, 3.2, 1.6, K.stone), E(-2.2, -2.6, 3.4, 1.7, K.stoneLit), E(3.2, -4.4, 3, 1.5, K.stone), E(7.6, -6.4, 2.6, 1.3, K.stoneLit), E(-7.6, -1.2, 1.4, 0.5, K.stoneLit)];
    case 'ribbon':
      return [shade, P('M-0.9 0V-13h1.8V0Z', K.woodDark), P('M-1.6 -13L-4.6 -3.4L-2.4 -4.6L-1 -2.6L0.4 -12Z', K.ribbonTail), P('M1.6 -13L4.6 -3.4L2.4 -4.6L1 -2.6L-0.4 -12Z', K.ribbon), C(0, -15, 4.6, K.ribbon), C(0, -15, 2.6, K.goldLit), C(0, -15, 1.4, K.gold)];
    default:
      return [];
  }
}

/** One keepsake standing at (x, foot) at scale k. */
function keepsakeAt(id: string, x: number, foot: number, k: number, lod: Lod, theme: 'light' | 'dark'): GNode {
  return G(`keepsake-${id}`, keepsakeShape(id, lod, theme), { transform: `translate(${f(x)} ${f(foot)}) scale(${f(k)})` });
}

/**
 * A square viewBox round a drawing: its height fills about 80% of the box
 * (its width at most 90%), centred (UX review: every icon reads the same size).
 */
function iconFrame(root: PNode): string {
  const b = bounds(root);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const side = Math.max(h / 0.8, w / 0.9, 1);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return `${f(cx - side / 2)} ${f(cy - side / 2)} ${f(side)} ${f(side)}`;
}

/** A keepsake alone, framed for a small icon (the Look screen's rows). */
export function keepsakeIcon(id: string, theme: 'light' | 'dark' = 'light'): { root: GNode; viewBox: string } {
  const root = G('mascot', keepsakeShape(id, 'small', theme));
  return { root, viewBox: iconFrame(root) };
}

/**
 * A planter as a small icon (the Look screen's planter rows, UX review P8):
 * the pot this species gets for it, with the plant's first sprout in it (a
 * bare pot is a thin sliver at 40pt; the sprout makes it read as a planter).
 * No face: it is a picture of the pot, not the companion.
 */
export function planterIcon(id: string, species: PlantSpecies, theme: 'light' | 'dark' = 'light'): { root: GNode; viewBox: string } {
  const built = buildPlant({ species, stage: 2, lod: 'small', theme, quietLook: true, drift: false, look: { planter: id } });
  return { root: built.root, viewBox: iconFrame(built.root) };
}

// ── the Elder gift (flowers or fruit) ───────────────────────────────────
/**
 * The gift marks are drawn larger at the small level: Today shows the plant
 * at 104pt with small detail, and an Elder must read as "in season" there
 * (PR #43 UX review: about 1.5× bigger and more of them).
 */
const GIFT_SCALE: Record<Lod, number> = { icon: 1.5, small: 1.75, full: 1.5 };

/** A hanging mango: a teardrop with a blush, on a short stalk (scaled about its stalk top). */
function mangoFruit(x: number, y: number, s: number, ripe: boolean, rot: number, lod: Lod): GNode {
  const g = A0.gift;
  const kids: Maybe[] = [
    S('M0 -9.5V-5', g.stalk, 1.1),
    P('M0.6 -6.2C4.6 -6.4 6.2 -1.2 5.2 3C4.2 7 -0.6 8.6 -3.6 6.2C-6.2 4 -5.4 -6 0.6 -6.2Z', ripe ? g.mangoRipe : g.mangoGreen),
  ];
  if (lod !== 'icon') kids.push(E(-1.8, -1.2, 1.9, 2.9, ripe ? g.mangoBlush : g.mangoGreenLit, { opacity: 0.7 }), E(2.2, -2.4, 0.9, 1.4, A0.white, { opacity: 0.35 }));
  if (ripe && lod === 'full') kids.push(glyph('olive', 0.4, -9.2, 0.55, 58, L.evergreen.mid));
  return G(null, kids, { transform: `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})` });
}

function flourish(sp: TreeArt, st: number, A: Anchors, lod: Lod, seed: number, can: CanopyResult, palmCrown: Pt, trunkW: number): GNode {
  const r = rng(seed + 99);
  const { cx, cy, rx, ry } = A.canopyBox!;
  const g = A0.gift;
  const kids: Maybe[] = [];
  const gs = GIFT_SCALE[lod];
  const pick = (): [number, number] => {
    // A random point in the upper part of the canopy ellipse.
    for (let guard = 0; guard < 200; guard++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.82;
      const x = cx + Math.cos(a) * rx * d;
      const y = cy + Math.sin(a) * ry * d * 0.85;
      if (y < cy + ry * 0.55) return [x, y];
    }
    return [cx, cy];
  };
  const n = lod === 'full' ? 9 : 5;
  const rot = (x: number, y: number, deg: number, sc = 1) => `translate(${f(x)} ${f(y)}) rotate(${f(deg)})${sc !== 1 ? ` scale(${f(sc)})` : ''}`;
  if (sp.flourish === 'blossom')
    for (let i = 0; i < n + 3; i++) {
      const [x, y] = pick();
      kids.push(glyph('blossom', x, y, lod === 'full' ? 1.05 : 1.5, r() * 70, g.cherryBloom, { core: g.cherryCore }));
    }
  if (sp.flourish === 'acorn')
    for (let i = 0; i < (lod === 'full' ? 10 : 7); i++) {
      const [x, y] = pick();
      kids.push(G(null, [E(0, 2.2, 3, 3.8, g.acorn), P('M-3.6 0.4Q0 -4 3.6 0.4Z', sp.bark), S('M0 -2.6v-1.6', sp.bark, 1)], { transform: rot(x, y, (r() - 0.5) * 40, gs) }));
    }
  if (sp.flourish === 'samara')
    for (let i = 0; i < (lod === 'full' ? 10 : 7); i++) {
      const [x, y] = pick();
      kids.push(G(null, [P('M0 0C-1 -3 -6 -6 -8 -4C-6 -2 -3 -1 0 0Z', g.samara), P('M0 0C1 -3 6 -6 8 -4C6 -2 3 -1 0 0Z', g.samara), C(0, 0, 1.4, L.ember.deep)], { transform: rot(x, y, (r() - 0.5) * 50, gs * 0.9) }));
    }
  if (sp.flourish === 'narra')
    for (let i = 0; i < n + 4; i++) {
      const [x, y] = pick();
      kids.push(glyph('blossom', x, y, lod === 'full' ? 0.75 : 1.2, r() * 70, g.narra, { core: g.narraCore }));
    }
  if (sp.flourish === 'mango') {
    // Mangoes HANG below the low dome on their stalks (UX review: a mango must
    // never read as an oak): green at Crown, ripe at Elder, clear of the trunk.
    const ripe = st === 6;
    const m = ripe ? 6 : 4;
    const hang = cy + ry * 0.36;
    const span = rx * 0.8;
    // Evenly spaced along the underside, the ones in front of the trunk left out, then the innermost dropped.
    const xs = Array.from({ length: m + 2 }, (_, i) => cx - span + (2 * span * i) / (m + 1))
      .filter((x) => Math.abs(x - 100) >= trunkW * 0.5 + 7)
      .sort((a, b) => Math.abs(b - cx) - Math.abs(a - cx))
      .slice(0, m);
    for (const x0 of xs) {
      const x = x0 + (r() - 0.5) * 4;
      const y = hang + 8 + r() * 5 - (Math.abs(x - cx) / span) * ry * 0.14;
      kids.push(mangoFruit(x, y, (ripe ? 1.15 : 1) * (lod === 'full' ? 1.05 : 1.3), ripe, -12 + r() * 24, lod));
    }
  }
  if (sp.flourish === 'coconut') {
    // A cluster under the fronds, in front of the crown, so the nuts read at 104pt.
    const m = st === 6 ? 5 : 3;
    const pts = [
      [-6, 9],
      [6, 10],
      [0, 15],
      [-12, 15],
      [11, 16],
    ];
    const rr = st === 6 ? 7 : 6;
    // The Golden colourway carries orange king coconuts (UX review P13).
    const nut = sp.palette === L.golden ? g.coconutGolden : st === 6 ? g.coconutRipe : g.coconutGreen;
    for (let i = 0; i < m; i++) {
      const [dx, dy] = pts[i];
      const x = palmCrown.x + dx;
      const y = palmCrown.y + dy;
      kids.push(C(x, y, rr, nut), C(x - rr * 0.35, y - rr * 0.35, rr * 0.3, A0.white, { opacity: 0.25 }));
      if (lod !== 'icon') kids.push(C(x + rr * 0.2, y + rr * 0.35, rr * 0.16, mix(nut, A0.black, 0.35)));
    }
  }
  if (sp.flourish === 'moss') for (const o of A.organs.slice(0, 5)) kids.push(glyph('blossom', o.x + 4, o.y - 3, lod === 'full' ? 1 : 1.25, r() * 60, A0.white, { core: g.mossBloomCore }));
  if (sp.flourish === 'cone' && can.pads)
    can.pads.slice(1).forEach((p, k) => {
      // Cones hang under the pads (two on the lower ones), never hidden inside them.
      const cone = (x: number, y: number) => G(null, [E(0, 0, 2.8, 4.2, g.cone), S('M-2.2 -1.4h4.4M-2.4 1h4.8', g.coneLine, 0.8)], { transform: rot(x, y, p.side * 8, gs) });
      kids.push(cone(p.x + p.side * p.rx * 0.38, p.y + p.ry * 0.82 + 4));
      if (k >= can.pads!.length - 3) kids.push(cone(p.x - p.side * p.rx * 0.2, p.y + p.ry * 0.78 + 4));
    });
  return G('blooms', kids);
}

// ── young growths (shared by every species unless it overrides them) ────
function youngStage(ctx: Ctx): BodyResult {
  const { sp, st, lod, pal, fol, base, A } = ctx;
  const b = GEO[st].body!;
  // In a deep pot the seed sits a little higher, so its face clears the rim.
  const by = base - b.h * 0.42 - (sp.pot === 'terracotta' ? 7 : 0);
  const bark = sp.kind === 'tree' ? sp.bark : A0.soil;
  const seedFill = sp.seedColor || mix(bark, A0.seedLight, 0.35);
  const seedPath = `M100 ${f(by - b.h / 2)}C${f(100 + b.w * 0.42)} ${f(by - b.h / 2)} ${f(100 + b.w / 2)} ${f(by + b.h * 0.05)} ${f(100 + b.w / 2)} ${f(by + b.h * 0.18)}C${f(100 + b.w / 2)} ${f(by + b.h * 0.42)} ${f(100 + b.w * 0.25)} ${f(by + b.h / 2)} 100 ${f(by + b.h / 2)}C${f(100 - b.w * 0.25)} ${f(by + b.h / 2)} ${f(100 - b.w / 2)} ${f(by + b.h * 0.42)} ${f(100 - b.w / 2)} ${f(by + b.h * 0.18)}C${f(100 - b.w / 2)} ${f(by + b.h * 0.05)} ${f(100 - b.w * 0.42)} ${f(by - b.h / 2)} 100 ${f(by - b.h / 2)}Z`;
  const kids: Maybe[] = [P(seedPath, seedFill)];
  const stripe = sp.kind === 'plant' ? sp.seedStripe : undefined;
  if (stripe && lod !== 'icon')
    for (const dx of [-0.26, 0.26]) kids.push(S(`M${f(100 + dx * b.w * 0.7)} ${f(by - b.h * 0.4)}Q${f(100 + dx * b.w * 1.05)} ${f(by - b.h * 0.3)} ${f(100 + dx * b.w * 1.15)} ${f(by - b.h * 0.18)}`, stripe, 1.1, { opacity: 0.5 }));
  if (lod !== 'icon')
    kids.push(
      P(
        `M${f(100 - b.w * 0.34)} ${f(by - b.h * 0.12)}C${f(100 - b.w * 0.3)} ${f(by - b.h * 0.36)} ${f(100 - b.w * 0.1)} ${f(by - b.h * 0.44)} ${f(100 + b.w * 0.02)} ${f(by - b.h * 0.42)}C${f(100 - b.w * 0.2)} ${f(by - b.h * 0.3)} ${f(100 - b.w * 0.28)} ${f(by - b.h * 0.2)} ${f(100 - b.w * 0.34)} ${f(by - b.h * 0.12)}Z`,
        A0.white,
        { opacity: 0.28 },
      ),
    );
  const body: Maybe[] = [];
  const leafPal = fol || pal;
  if (st === 1) {
    kids.push(G('sprout', [S(`M100 ${f(by - b.h / 2 + 1)}q-1 -6 3 -9`, leafPal.deep, 2.2), glyph('lens', 103, by - b.h / 2 - 7.5, 0.62, 52, leafPal.mid)]));
    A.crown = { x: 100, y: by - b.h / 2 - 1 };
  } else {
    const top = GEO[st].stemTop!;
    const leaf = (dir: number): Maybe[] => [
      P(`M100 ${top + 4}C${100 + dir * 4} ${top - 8} ${100 + dir * 18} ${top - 10} ${100 + dir * 24} ${top - 4}C${100 + dir * 18} ${top + 6} ${100 + dir * 6} ${top + 8} 100 ${top + 4}Z`, dir < 0 ? leafPal.mid : leafPal.light),
      lod === 'full' ? S(`M${100 + dir * 3} ${top + 3}Q${100 + dir * 12} ${top - 3} ${100 + dir * 20} ${top - 4}`, leafPal.deep, 0.9, { opacity: 0.6 }) : null,
    ];
    body.push(G('stem', [S(`M100 ${f(by - b.h / 2 + 2)}C99 ${f(by - b.h / 2 - 12)} 102 ${top + 16} 100 ${top + 3}`, leafPal.deep, 3.2)]));
    body.push(G('leaves', [...leaf(-1), ...leaf(1)]));
    if (lod !== 'icon') kids.push(S(`M95 ${f(by - b.h / 2 + 2.5)}l3 3l2.5 -2.5l3 3`, mix(seedFill, A0.black, 0.3), 1.1));
    A.crown = { x: 100, y: top - 9 };
  }
  body.unshift(G('trunk', kids));
  A.neck = { x: 100, y: by - b.h * 0.28, w: b.w * 0.82 };
  A.perch = { x: 100 - b.w * 0.95, y: base + 1 };
  A.branchR = { x: 100 + b.w * 0.9, y: by - b.h * 0.3 };
  A.branchL = { x: 100 - b.w * 0.9, y: by - b.h * 0.3 };
  A.canopyBox = st === 1 ? { cx: 100, cy: by, rx: b.w * 0.7, ry: b.h * 0.6 } : { cx: 100, cy: (GEO[st].stemTop! + by) / 2, rx: 26, ry: (by - GEO[st].stemTop!) / 2 + 8 };
  A.drift = A.crown;
  const patch = sp.kind === 'plant' && sp.seedPatch ? mix(seedFill, A0.facePatch, 0.55) : null;
  return { body, faceSpec: { x: 100, y: by + b.h * 0.08, w: b.w, patch, patchK: 0.78 } };
}

// ── trees ───────────────────────────────────────────────────────────────
function treeBody(ctx: Ctx, sp: TreeArt): BodyResult {
  const { st, lod, pal, base, A, seed, sc, showFace, key } = ctx;
  const geo = GEO[st];
  const t = geo.trunk!;
  const custom = 'custom' in sp.canopy ? sp.canopy.custom : null;
  const isPine = custom === 'tiers';
  const isPalm = custom === 'palm';
  const isBonsai = custom === 'bonsai';
  const lean = isPine ? 2 + st * 0.5 : isPalm ? 4 + st * 2 : 0;
  let wb = t.wb * (sp.trunkW || 1);
  let wt = t.wt * (sp.trunkW || 1);
  if (isPalm) {
    wb = t.wb * 0.8;
    wt = t.wt * 0.6;
  }
  const palmCrown = { x: 100 + lean, y: ({ 3: 112, 4: 94, 5: 78, 6: 68 } as Record<number, number>)[st] };
  const top = isPalm ? palmCrown.y + 4 : isPine ? geo.canopy!.cy - geo.canopy!.ry * 0.7 + 8 : t.top;
  if (isPine) {
    wt *= st === 3 ? 0.7 : 0.55;
    // From Bough on the pads carry the shape: a slimmer trunk under them.
    if (st >= 4) wb *= 0.84;
  }
  const flare = sp.flare ?? 0.35;
  const tk: Maybe[] = [];
  let trunkTop = { x: 100 + lean, y: top };
  if (isBonsai) {
    const k = st / 5;
    tk.push(P(trunkPath({ wb: wb * 1.05, wt: wb * 0.8, top: base - 12, base, flare: 0.3 }), sp.bark));
    tk.push(P(limb(100, base - 6, 88, base - 26 * k - 6, wb * 0.82, wb * 0.66, -5), sp.bark));
    tk.push(P(limb(88, base - 26 * k - 6, 104, base - 52 * k - 10, wb * 0.66, wt * 0.8, 7), sp.bark));
    trunkTop = { x: 104, y: base - 52 * k - 10 };
  } else {
    const tp = { wb, wt, top, base, lean, twist: 0, flare };
    tk.push(P(trunkPath(tp), sp.bark));
    if (lod !== 'icon') tk.push(P(trunkPath({ ...tp, top: top + 4, band: [0.38, 0.92] }), A0.black, { opacity: 0.12 }), P(trunkPath({ ...tp, top: top + 4, band: [-0.86, -0.4] }), A0.white, { opacity: 0.13 }));
  }
  const wAt = (y: number) => lerp(wt, wb, (y - top) / (base - top));
  let fy = geo.faceY! + (base - 170);
  if (isPalm) fy = base - 24;
  const fw = isBonsai ? wb * 0.82 : wAt(fy);
  let fx = 100 + lean * ((base - fy) / (base - top)) * 0.55;
  if (isBonsai) {
    fy = base - 25;
    fx = 95;
  }
  if (showFace) tk.push(E(fx, fy + 3, Math.min(fw * 0.5, 24), Math.min(fw * 0.4, 18), mix(sp.bark, A0.facePatch, 0.35)));
  if (lod === 'full') {
    const dk = mix(sp.bark, A0.black, 0.3);
    if (isPalm) {
      for (let y = base - 34; y > top + 6; y -= 9) {
        const xx = 100 + lean * ((base - y) / (base - top));
        const w2 = wAt(y) / 2;
        tk.push(S(`M${f(xx - w2 + 1)} ${f(y)}Q${f(xx)} ${f(y + 2.5)} ${f(xx + w2 - 1)} ${f(y)}`, dk, 1.1, { opacity: 0.55 }));
      }
    } else if (!isBonsai) {
      tk.push(S(`M${f(fx - fw * 0.28)} ${f(top + 10)}q2 5 0 9`, dk, 1.1, { opacity: 0.6 }));
      tk.push(S(`M${f(fx + fw * 0.3)} ${f(fy - 16)}q-2 4 0 8`, dk, 1.1, { opacity: 0.5 }));
      if (key === 'cherry-blossom') for (let k = 0; k < 3; k++) tk.push(S(`M${f(fx - 4)} ${f(top + 6 + k * 7)}h8`, dk, 1, { opacity: 0.45 }));
      if (st === 6) tk.push(E(fx - fw * 0.3, base - 9, 2.4, 3, dk, { opacity: 0.55 }));
    }
  }
  // Branches (cloud trees).
  const br: Maybe[] = [];
  if (!custom && geo.branches) {
    const cyTop = geo.canopy!.cy;
    br.push(P(limb(100 - wt * 0.2, top + 8, 100 - geo.canopy!.rx * 0.42, cyTop + 8, wt * 0.55, 4, -4), sp.bark));
    br.push(P(limb(100 + wt * 0.2, top + 6, 100 + geo.canopy!.rx * 0.46, cyTop + 2, wt * 0.55, 4, 4), sp.bark));
    if (geo.branches >= 3) br.push(P(limb(100, top + 4, 104, cyTop - 10, wt * 0.6, 4, 2), sp.bark));
  } else if (st === 3 && !custom) {
    br.push(P(limb(100, top + 4, 100, top - 14, wt * 0.8, 6, 0), sp.bark));
  }
  // Roots.
  const roots: Maybe[] = [];
  if (geo.roots && !isBonsai && !isPalm) {
    const nr = geo.roots + (flare > 0.45 ? 2 : 0);
    for (let i = 0; i < nr; i++) {
      const side = i % 2 ? 1 : -1;
      const k2 = Math.floor(i / 2);
      const x0 = 100 + side * (wb * 0.3 + k2 * 4);
      const x1 = 100 + side * (wb * 0.78 + 10 + k2 * 7);
      roots.push(P(limb(x0, base - 4, x1, base + 1.5 + k2, 8 - k2 * 2, 1.5, side * 2), mix(sp.bark, A0.black, 0.12)));
    }
  }
  // Canopy.
  let can: CanopyResult;
  if (isPine) can = tiersCanopy(sp.bark, st, pal, seed, lod, sc, lean);
  else if (isBonsai) can = bonsaiCanopy(sp.bark, st, pal, seed, lod, sc, trunkTop);
  else if (isPalm) can = palmCanopy(st, pal, lod, sc, palmCrown);
  else can = cloudCanopy(sp.canopy as CanopySpec, st, pal, seed, lod, sc);
  A.canopyBox = can.box;
  A.organs = can.organs;
  // Leaf marks.
  const marks: Maybe[] = [];
  if (lod !== 'icon' && !custom) {
    const r = rng(seed + 31);
    const n = Math.round(({ 3: 3, 4: 5, 5: 7, 6: 8 } as Record<number, number>)[st] * (lod === 'full' ? 1 : 0.5));
    const { cx, cy, rx, ry } = can.box;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + r() * 0.8);
      const d = 0.45 + r() * 0.42;
      const x = cx + Math.cos(a) * rx * d;
      const y = cy + Math.sin(a) * ry * d + ry * 0.15;
      if (sp.leaf === 'blossom') {
        marks.push(glyph('blossom', x, y, 0.85, r() * 70, pal.hi, { core: pal.deep }));
        continue;
      }
      marks.push(glyph(sp.leaf, x, y, sp.leaf === 'maple' ? 0.85 : 0.68, (r() - 0.5) * 70, pal.hi, { opacity: 0.95 }));
    }
  }
  if (lod === 'full' && isPine && can.pads)
    can.pads.forEach((p) => marks.push(glyph('pine', p.x - p.rx * 0.45, p.y - p.ry * 0.1, 0.7, -20, pal.hi), glyph('pine', p.x + p.rx * 0.35, p.y - p.ry * 0.25, 0.6, 15, pal.hi)));
  // Anchors.
  const { cx, cy, rx, ry } = can.box;
  const neckY = isPalm ? fy - 18 : isBonsai ? fy - 14 : Math.max(top + 6, cy + ry * 0.78);
  A.neck = { x: isBonsai ? 92 : 100 + lean * ((base - neckY) / (base - top)) * 0.55, y: neckY, w: isBonsai ? wb * 0.72 : wAt(neckY) };
  if (isPine && can.pads) {
    const lp = can.pads[can.pads.length - 1];
    A.neck.y = Math.max(lp.y + lp.ry + 3, A.neck.y);
    A.neck.w = wAt(A.neck.y);
  }
  A.crown = isPine && can.pads ? { x: can.pads[0].x, y: can.pads[0].y - can.pads[0].ry * 0.9 } : isPalm ? { x: palmCrown.x, y: palmCrown.y - 6 } : { x: cx + 4, y: cy - ry * 0.97 };
  if (isBonsai) {
    const top0 = can.organs[2] || { x: 108, y: cy - ry };
    A.crown = { x: top0.x, y: top0.y - 12 };
  }
  A.branchR = isPalm ? { x: palmCrown.x + 16, y: palmCrown.y + 8 } : { x: cx + rx * 0.6, y: cy + ry * 0.62 };
  A.branchL = isPalm ? { x: palmCrown.x - 16, y: palmCrown.y + 8 } : { x: cx - rx * 0.58, y: cy + ry * 0.62 };
  A.perch = isPine && can.pads ? { x: can.pads[1].x - 4, y: can.pads[1].y - can.pads[1].ry * 0.7 } : { x: cx - rx * 0.52, y: cy - ry * 0.74 };
  if (isPalm) A.perch = { x: palmCrown.x - 4, y: palmCrown.y - 4 };
  if (isBonsai) A.perch = { x: (can.organs[0] || { x: 60 }).x + 4, y: (can.organs[0] || { y: 120 }).y - 6 };
  A.drift = { x: cx + rx * 0.7, y: cy + ry * 0.4 };
  const body: Maybe[] = [G('trunk', tk), G('branches', br), ...can.layers, G('leaves', marks)];
  if (st === 6 || (st === 5 && sp.fruitFrom === 5)) body.push(flourish(sp, st, A, lod, seed, can, palmCrown, wb));
  return { body, behind: [G('roots', roots)], faceSpec: showFace ? { x: fx, y: fy, w: fw * 1.22 } : null };
}

// ── flowers, succulents, grasses ────────────────────────────────────────
/** Two-tone lens leaf. Base at (x,y); ang in degrees, 0 = up, + = clockwise. */
function leafBlade(x: number, y: number, len: number, wid: number, ang: number, pal: PlantLeafPalette, lod: Lod, id: string | null = null): GNode {
  const lit = `M0 0Q${f(-wid * 1.9)} ${f(-len * 0.48)} 0 ${f(-len)}Z`;
  const shade = `M0 0Q${f(wid * 1.9)} ${f(-len * 0.48)} 0 ${f(-len)}Z`;
  const up = ang > 0;
  const kids: Maybe[] = [P(up ? shade : lit, pal.mid), P(up ? lit : shade, pal.light)];
  if (lod === 'full') kids.push(S(`M0 0L0 ${f(-len * 0.86)}`, pal.deep, 0.9, { opacity: 0.55 }));
  return G(id, kids, { transform: `translate(${f(x)} ${f(y)}) rotate(${f(ang)})` });
}
const tipOf = (x: number, y: number, len: number, ang: number): Pt => ({ x: x + Math.sin((ang * Math.PI) / 180) * len, y: y - Math.cos((ang * Math.PI) / 180) * len });
const at = (x: number, y: number, len: number, ang: number, t: number): Pt => ({ x: x + Math.sin((ang * Math.PI) / 180) * len * t, y: y - Math.cos((ang * Math.PI) / 180) * len * t });

/** A soft foliage mound (shrub body) that carries the face. */
function mound(cx: number, cy: number, rx: number, ry: number, pal: PlantLeafPalette, seed: number, lod: Lod, n = 11): PNode[] {
  const kids: PNode[] = [
    P(scallop({ cx, cy, rx, ry, n, seed, jit: 0.3, bulge: 0.6, flat: 0.55 }), pal.deep),
    P(scallop({ cx: cx - rx * 0.04, cy: cy - ry * 0.1, rx: rx * 0.92, ry: ry * 0.82, n, seed, jit: 0.3, bulge: 0.6, flat: 0.55 }), pal.mid),
  ];
  if (lod !== 'icon') kids.push(P(scallop({ cx: cx - rx * 0.36, cy: cy - ry * 0.42, rx: rx * 0.36, ry: ry * 0.3, n: 6, seed: seed + 4, jit: 0.3, bulge: 0.6 }), pal.light));
  return kids;
}
const MOUND: Record<number, [number, number]> = { 3: [23, 14], 4: [34, 23], 5: [42, 28], 6: [50, 32] };
const arcPos = (cx: number, cy: number, rx: number, ry: number, i: number): Pt => {
  const th = ((200 + i * 35) * Math.PI) / 180;
  return { x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) };
};

type Builder = (ctx: Ctx, sp: FlowerArt) => BodyResult;
const PLANTS: Record<FlowerArt['build'], Builder> = {
  sunflower(ctx, sp) {
    const { st, lod, base, A, sc } = ctx;
    const pal = sp.palette;
    const fol = sp.foliage;
    const SF = A0.sunflower;
    const topY = ({ 3: 114, 4: 82, 5: 70, 6: 62 } as Record<number, number>)[st];
    const hx = 100 + (st >= 5 ? 4 : 2);
    const hy = topY;
    const sw = ({ 3: 4, 4: 5, 5: 5.5, 6: 6.5 } as Record<number, number>)[st];
    const stemX = (y: number) => lerp(100, hx, (base - y) / (base - hy));
    const body: Maybe[] = [
      G('stem', [
        S(`M100 ${base}C99 ${f(base - (base - hy) * 0.4)} ${f(hx + 3)} ${f(hy + (base - hy) * 0.4)} ${f(hx)} ${f(hy)}`, fol.deep, sw),
        S(`M99.4 ${base - 2}C98.6 ${f(base - (base - hy) * 0.4)} ${f(hx + 2)} ${f(hy + (base - hy) * 0.4)} ${f(hx - 0.6)} ${f(hy + 6)}`, fol.mid, sw * 0.4),
      ]),
    ];
    const leaves: Maybe[] = [];
    const tips: Pt[] = [];
    if (st === 3) {
      (
        [
          [-1, 0.18, 21],
          [1, 0.2, 21],
          [-1, 0.46, 16],
          [1, 0.48, 16],
        ] as const
      ).forEach(([side, tt, len]) => {
        const y = base - (base - hy) * tt;
        leaves.push(leafBlade(stemX(y), y, len, len * 0.48, side * 60, fol, lod));
      });
    } else {
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 1 : -1;
        const y = base - (base - hy) * (0.1 + i * 0.15);
        const len = (19 + st * 2.4) * sc[i] * (1 - i * 0.05);
        const ang = side * (60 - i * 2);
        leaves.push(leafBlade(stemX(y), y, len, len * 0.5, ang, fol, lod, `domain-${i + 1}`));
        A.organs.push(at(stemX(y), y, len, ang, 0.55));
        tips.push(tipOf(stemX(y), y, len, ang));
      }
    }
    body.push(G('leaves', leaves));
    const head: Maybe[] = [];
    let Rt: number;
    let faceSpec: FaceSpec;
    if (st <= 4) {
      const r = st === 3 ? 12 : 17;
      Rt = r + 3;
      if (st === 4)
        for (let i = 0; i < 14; i++)
          head.push(P('M0 0C-3 -3 -2.2 -7 0 -8.5C2.2 -7 3 -3 0 0Z', i % 2 ? pal.light : pal.mid, { transform: `translate(${f(hx)} ${f(hy)}) rotate(${f(i * (360 / 14))}) translate(0 ${f(-r + 1)})` }));
      const nS = st === 3 ? 6 : 9;
      for (let i = 0; i < nS; i++) head.push(P(`M0 0C-7 -2 -6.5 ${f(-r * 0.8)} 0 ${f(-r - 1.5)}C6.5 ${f(-r * 0.8)} 7 -2 0 0Z`, fol.deep, { transform: `translate(${f(hx)} ${f(hy)}) rotate(${f((i / nS) * 360 + 20)})` }));
      head.push(C(hx, hy, r * 0.92, fol.mid), E(hx - r * 0.3, hy - r * 0.35, r * 0.42, r * 0.32, fol.light, { opacity: 0.8 }));
      faceSpec = { x: hx, y: hy + 1, w: r * 2 };
    } else {
      const r = st === 5 ? 17 : 22;
      const pl = st === 5 ? 15 : 18;
      const np = st === 5 ? 16 : 20;
      Rt = r + pl;
      const petal = (Lp: number, Wp: number) => `M0 0C${f(-Wp)} ${f(-Lp * 0.35)} ${f(-Wp * 0.5)} ${f(-Lp * 0.9)} 0 ${f(-Lp)}C${f(Wp * 0.5)} ${f(-Lp * 0.9)} ${f(Wp)} ${f(-Lp * 0.35)} 0 0Z`;
      const hd: Maybe[] = [];
      for (let i = 0; i < np; i++) hd.push(P(petal(pl * 0.95, 6.5), pal.mid, { transform: `rotate(${f((i + 0.5) * (360 / np))}) translate(0 ${f(-r + 2)})` }));
      for (let i = 0; i < np; i++) hd.push(P(petal(pl, 6.2), i % 3 === 0 ? pal.hi : pal.light, { transform: `rotate(${f(i * (360 / np))}) translate(0 ${f(-r + 1)})` }));
      hd.push(C(0, 0, r, SF.disc), C(0, 0, r * 0.8, SF.discMid), C(-r * 0.12, -r * 0.14, r * 0.55, SF.discLit));
      if (st === 6 && lod !== 'icon')
        for (let k = 0; k < 44; k++) {
          const a = k * 2.39996;
          const rr = r * (0.84 + (0.12 * ((k * 7) % 11)) / 11);
          hd.push(C(Math.cos(a) * rr, Math.sin(a) * rr, 1, SF.seeds));
        }
      head.push(G('head', hd, { transform: `translate(${f(hx)} ${f(hy)})${st === 6 ? ' rotate(-6)' : ''}` }));
      if (st === 6) {
        for (const side of [-1, 1]) {
          const y0 = base - (base - hy) * 0.55;
          const bx = hx + side * 30;
          const by = y0 - 18;
          body.push(S(`M${f(stemX(y0))} ${f(y0)}Q${f(stemX(y0) + side * 18)} ${f(y0 - 2)} ${f(bx)} ${f(by)}`, fol.deep, 2.4));
          const sm: Maybe[] = [];
          for (let i = 0; i < 12; i++) sm.push(P(petal(7.5, 3.4), pal.light, { transform: `rotate(${i * 30}) translate(0 -5)` }));
          sm.push(C(0, 0, 5.4, SF.sideDisc));
          head.unshift(G(null, sm, { transform: `translate(${f(bx)} ${f(by)})` }));
        }
      }
      faceSpec = { x: hx, y: hy + 1, w: r * 1.9 };
    }
    body.push(G('flower', head));
    A.crown = { x: hx, y: hy - Rt - 1 };
    A.neck = { x: hx, y: hy + Rt * (st >= 5 ? 0.62 : 1) + 5, w: sw + 2 };
    const t3 = tips[2] || { x: 78, y: base - 20 };
    const t4 = tips[3] || { x: 122, y: base - 30 };
    const t5 = tips[4] || t3;
    A.perch = { x: t3.x + 4, y: t3.y + 2 };
    A.branchR = { x: t4.x - 3, y: t4.y + 2 };
    A.branchL = { x: t5.x + 3, y: t5.y + 2 };
    A.canopyBox = { cx: hx, cy: hy, rx: Rt + 4, ry: Rt };
    A.drift = { x: hx + Rt * 0.5, y: hy + Rt * 0.4 };
    return { body, faceSpec };
  },

  lotus(ctx, sp) {
    const { st, lod, base, A, sc } = ctx;
    const pal = sp.palette;
    const fol = sp.foliage;
    const LT = A0.lotus;
    const wy = base - 1; // the water line
    const floatPad = (x: number, w: number, id: string | null = null) =>
      G(id, [
        E(x, wy, w, w * 0.27, fol.deep),
        E(x - w * 0.06, wy - w * 0.05, w * 0.9, w * 0.2, fol.mid),
        lod !== 'icon' ? P(`M${f(x)} ${f(wy - w * 0.04)}L${f(x + w * 0.85)} ${f(wy - w * 0.12)}L${f(x + w * 0.8)} ${f(wy + w * 0.06)}Z`, fol.deep) : null,
        lod === 'full' ? E(x - w * 0.35, wy - w * 0.1, w * 0.3, w * 0.07, fol.light) : null,
      ]);
    const standPad = (x0: number, x: number, y: number, w: number, id: string | null = null) =>
      G(id, [
        S(`M${f(x0)} ${f(wy)}Q${f(x0)} ${f((wy + y) / 2)} ${f(x)} ${f(y + 2)}`, fol.deep, lod === 'icon' ? 5 : 2.2),
        P(`M${f(x - w)} ${f(y)}Q${f(x)} ${f(y + w * 0.62)} ${f(x + w)} ${f(y)}Z`, fol.deep),
        E(x, y - 0.4, w, w * 0.26, fol.mid),
        lod !== 'icon' ? E(x - w * 0.3, y - w * 0.08, w * 0.42, w * 0.1, fol.light) : null,
      ]);
    const bud = (x: number, y: number, s: number) =>
      G(null, [
        P(`M${f(x)} ${f(y + s * 0.55)}C${f(x - s * 0.8)} ${f(y + s * 0.3)} ${f(x - s * 0.62)} ${f(y - s * 0.5)} ${f(x)} ${f(y - s * 1.05)}C${f(x + s * 0.62)} ${f(y - s * 0.5)} ${f(x + s * 0.8)} ${f(y + s * 0.3)} ${f(x)} ${f(y + s * 0.55)}Z`, pal.mid),
        P(`M${f(x - s * 0.1)} ${f(y + s * 0.55)}C${f(x - s * 0.66)} ${f(y + s * 0.25)} ${f(x - s * 0.5)} ${f(y - s * 0.45)} ${f(x - s * 0.05)} ${f(y - s * 0.92)}C${f(x + s * 0.1)} ${f(y - s * 0.4)} ${f(x + s * 0.12)} ${f(y + s * 0.2)} ${f(x - s * 0.1)} ${f(y + s * 0.55)}Z`, pal.light),
        P(`M${f(x)} ${f(y - s * 0.78)}C${f(x - s * 0.12)} ${f(y - s * 0.9)} ${f(x - s * 0.06)} ${f(y - s)} ${f(x)} ${f(y - s * 1.05)}C${f(x + s * 0.1)} ${f(y - s * 0.95)} ${f(x + s * 0.14)} ${f(y - s * 0.86)} ${f(x)} ${f(y - s * 0.78)}Z`, pal.deep),
        P(`M${f(x - s * 0.42)} ${f(y + s * 0.42)}Q${f(x)} ${f(y + s * 0.2)} ${f(x + s * 0.42)} ${f(y + s * 0.42)}L${f(x)} ${f(y + s * 0.68)}Z`, fol.mid),
      ]);
    const petal = (h: number, w: number) => `M0 0C${f(-w)} ${f(-h * 0.3)} ${f(-w * 0.62)} ${f(-h * 0.88)} 0 ${f(-h)}C${f(w * 0.62)} ${f(-h * 0.88)} ${f(w)} ${f(-h * 0.3)} 0 0Z`;
    const flower = (x: number, y: number, h: number) => {
      const w = h * 0.42;
      const tr = (a: number) => `translate(${f(x)} ${f(y)}) rotate(${a})`;
      const k: Maybe[] = [];
      for (const a of [-74, 74]) k.push(P(petal(h * 0.8, w * 0.9), pal.deep, { transform: tr(a) }));
      for (const a of [-50, -24, 24, 50]) k.push(P(petal(h * 0.95, w), pal.mid, { transform: tr(a) }));
      k.push(E(x, y - h * 0.58, w * 0.95, h * 0.09, LT.stamen), lod !== 'icon' ? E(x, y - h * 0.62, w * 0.62, h * 0.05, LT.stamenDeep) : null);
      for (const a of [-30, 30]) k.push(P(petal(h * 0.82, w * 0.95), pal.light, { transform: tr(a) }));
      k.push(P(petal(h * 0.86, w * 1.15), pal.hi, { transform: `translate(${f(x)} ${f(y)})` }));
      if (lod === 'full') k.push(S(`M${f(x)} ${f(y - 2)}V${f(y - h * 0.3)}`, pal.light, 0.8, { opacity: 0.8 }));
      k.push(P(`M${f(x - w * 0.6)} ${f(y - 1)}Q${f(x)} ${f(y + h * 0.12)} ${f(x + w * 0.6)} ${f(y - 1)}Z`, fol.mid));
      return G('flower', k);
    };
    const body: Maybe[] = [];
    const behind: Maybe[] = [];
    let faceSpec: FaceSpec;
    if (lod === 'icon' && st >= 4) {
      // 24pt (mobile 1.14): one bold bloom low over the bowl and two pads, so
      // the chip reads as a lotus, not a bowl.
      const h = st === 4 ? 40 : 52;
      const top = wy - 14;
      behind.push(floatPad(70, 18), floatPad(130, 18));
      if (st === 4) body.push(G('flower', [bud(100, top - 10, 24)]));
      else body.push(flower(100, top, h));
      A.canopyBox = { cx: 100, cy: top - h * 0.5, rx: h * 0.9, ry: h * 0.6 };
      A.crown = { x: 100, y: top - h };
      A.neck = { x: 100, y: top, w: 6 };
      A.drift = { x: 120, y: top - 20 };
      return { body, behind, faceSpec: null };
    }
    if (st === 3) {
      behind.push(floatPad(126, 13), standPad(84, 78, wy - 30, 15));
      body.push(floatPad(70, 15));
      const top = wy - 50;
      body.push(S(`M102 ${wy}Q104 ${f(wy - 20)} 100 ${f(top + 6)}`, fol.deep, lod === 'icon' ? 5 : 2.4));
      body.push(G('flower', [bud(100, top, 12)]));
      faceSpec = { x: 100, y: top - 2, w: 18 };
      A.canopyBox = { cx: 100, cy: top - 4, rx: 30, ry: 22 };
    } else {
      const k = st / 5;
      const P1 = { x: 66, w: 15 * k * sc[0] + 4 };
      const P2 = { x0: 82, x: 74, y: wy - 32 * k - 6, w: 15 * k * sc[1] + 3 };
      const P3 = { x: 136, w: 13 * k * sc[2] + 3 };
      const P4 = { x0: 118, x: 126, y: wy - 48 * k - 8, w: 16 * k * sc[3] + 3 };
      const P5 = { x: 116, w: 10 * k * sc[4] + 3 };
      behind.push(floatPad(P3.x, P3.w, 'domain-3'), standPad(P4.x0, P4.x, P4.y, P4.w, 'domain-4'), standPad(P2.x0, P2.x, P2.y, P2.w, 'domain-2'));
      body.push(floatPad(P1.x, P1.w, 'domain-1'));
      A.organs.push({ x: P1.x, y: wy }, { x: P2.x, y: P2.y }, { x: P3.x, y: wy }, { x: P4.x, y: P4.y }, { x: P5.x, y: wy });
      const top = ({ 4: 96, 5: 104, 6: 100 } as Record<number, number>)[st];
      body.push(S(`M101 ${wy}Q104 ${f((wy + top) / 2)} 100 ${f(top + 2)}`, fol.deep, lod === 'icon' ? 6 : 2.8));
      if (st === 6) {
        // A seed pod and a second bud.
        body.unshift(
          S(`M110 ${wy}Q114 ${f(wy - 30)} 134 ${f(wy - 58)}`, fol.deep, 2.2),
          G('pod', [P(`M125 ${f(wy - 60)}h18l-3 9h-12Z`, LT.pod), E(134, wy - 60, 9, 2.6, LT.podTop), lod !== 'icon' ? G(null, [C(130, wy - 60, 1, LT.podSeed), C(134, wy - 60.4, 1, LT.podSeed), C(138, wy - 60, 1, LT.podSeed)]) : null]),
        );
        body.unshift(S(`M90 ${wy}Q86 ${f(wy - 18)} 70 ${f(wy - 34)}`, fol.deep, 1.8), bud(70, wy - 38, 8));
      }
      if (st === 4) {
        body.push(G('flower', [bud(100, top - 4, 19)]));
        faceSpec = { x: 100, y: top - 6, w: 24 };
        A.canopyBox = { cx: 100, cy: top - 10, rx: 30, ry: 26 };
      } else {
        const h = st === 5 ? 40 : 46;
        body.push(flower(100, top, h));
        faceSpec = { x: 100, y: top - h * 0.36, w: 22 };
        A.canopyBox = { cx: 100, cy: top - h * 0.5, rx: h * 0.9, ry: h * 0.6 };
      }
      body.push(floatPad(P5.x, P5.w, 'domain-5'));
      A.branchL = { x: P2.x - P2.w * 0.7, y: P2.y };
      A.branchR = { x: P4.x + P4.w * 0.7, y: P4.y };
      A.perch = { x: P2.x - 2, y: P2.y - 2 };
    }
    const cb = A.canopyBox!;
    A.crown = { x: 100, y: cb.cy - cb.ry - 2 };
    A.neck = { x: 100, y: cb.cy + cb.ry * 0.8, w: 6 };
    A.perch = A.perch || { x: 72, y: wy - 32 };
    A.branchL = A.branchL || { x: 66, y: wy - 30 };
    A.branchR = A.branchR || { x: 130, y: wy - 20 };
    A.drift = { x: cb.cx + cb.rx * 0.5, y: wy - 46 };
    return { body, behind, faceSpec };
  },

  sampaguita(ctx, sp) {
    const { st, lod, base, A, sc, seed } = ctx;
    const pal = sp.palette;
    const fol = sp.foliage;
    const [rx, ry] = MOUND[st];
    const my = base - ry * 0.5;
    const body: Maybe[] = [];
    const front: Maybe[] = [];
    if (lod === 'icon' && st >= 3) {
      // 24pt (mobile 1.14): a rounder mound crowned with three big white
      // stars, so the chip reads as a flowering shrub, not a flat blob.
      const iy = base - ry * 0.7;
      body.push(G('mound', mound(100, iy, rx * 0.9, ry * 1.3, fol, seed, lod, 10)));
      for (const [dx, dy, s] of [
        [-0.42, -0.62, 2],
        [0, -1.05, 2.3],
        [0.42, -0.62, 2],
      ] as const)
        body.push(glyph('star', 100 + rx * dx, iy + ry * 1.3 * dy, s, 0, pal.light, { edge: pal.deep }));
      A.canopyBox = { cx: 100, cy: iy - ry * 0.5, rx: rx + 4, ry: ry * 1.3 + 4 };
      A.crown = { x: 100, y: iy - ry * 1.4 };
      A.neck = { x: 100, y: iy, w: rx };
      A.drift = { x: 100 + rx * 0.7, y: iy };
      return { body, faceSpec: null };
    }
    body.push(G('mound', mound(100, my, rx, ry, fol, seed, lod, 12)));
    if (lod !== 'icon') {
      const r = rng(seed + 9);
      for (let i = 0; i < 4 + st; i++) {
        const a = -Math.PI * (0.08 + r() * 0.84);
        body.push(glyph('banyan', 100 + Math.cos(a) * rx * 0.86, my + Math.sin(a) * ry * 0.78 + 5, 0.6, (r() - 0.5) * 90, fol.light, { opacity: 0.9 }));
      }
    }
    const pearl = (x: number, y: number, s: number) => G(null, [E(x, y, 2.3 * s, 3.2 * s, pal.light, { stroke: pal.deep, sw: 0.6 }), E(x - 0.7 * s, y - 1 * s, 0.8 * s, 1.1 * s, A0.white, { opacity: 0.9 })]);
    if (st >= 4) {
      for (let i = 0; i < 5; i++) {
        const p = arcPos(100, my, rx * 0.9, ry * 0.92, i);
        const s = sc[i] * (st === 6 ? 1.15 : 1);
        const k: Maybe[] = [];
        if (st === 4) k.push(pearl(p.x - 3.5 * s, p.y + 1, s), pearl(p.x + 3.5 * s, p.y + 0.5, s), pearl(p.x, p.y - 3.5 * s, s));
        else {
          k.push(pearl(p.x + 6 * s, p.y - 2 * s, s * 0.9), pearl(p.x - 6 * s, p.y + 1 * s, s * 0.85));
          if (st === 6) k.push(glyph('star', p.x - 4 * s, p.y - 4 * s, 1.0 * s, 15, pal.light, { edge: pal.deep }));
          k.push(glyph('star', p.x + (st === 6 ? 3 : 0) * s, p.y, 1.15 * s, 0, pal.light, { edge: pal.deep }));
        }
        body.push(G(`domain-${i + 1}`, k));
        A.organs.push({ x: p.x, y: p.y });
      }
      if (st === 6 && lod !== 'icon') {
        // A sampaguita garland draped across the front.
        const g: Maybe[] = [];
        const x0 = 100 - rx * 0.86;
        const x1 = 100 + rx * 0.86;
        const y0 = my - ry * 0.02;
        const sag = ry * 0.58;
        for (let t = 0; t <= 1.0001; t += 1 / 16) g.push(E(lerp(x0, x1, t), y0 + sag * 4 * t * (1 - t), 2.2, 1.8, pal.light, { stroke: pal.deep, sw: 0.5 }));
        g.push(P(`M100 ${f(y0 + sag + 1)}l-3 8h6Z`, A0.sampaguita.tassel), C(100, y0 + sag + 1, 2.2, pal.light, { stroke: pal.deep, sw: 0.5 }));
        front.push(G('garland', g));
      }
    } else {
      // Shoot: a small shrub, not a blob (PR #43 UX review). Three leafy
      // sprigs rise out of the low leafy base, the middle one with a first bud.
      const sprigs: Maybe[] = [];
      const y0 = my - ry * 0.2;
      for (const [side, len, ang] of [
        [-1, 25, -34],
        [0, 32, 4],
        [1, 24, 36],
      ] as const) {
        const x0 = 100 + side * 7;
        const tip = tipOf(x0, y0, len, ang);
        const mid = at(x0, y0, len, ang, 0.5);
        sprigs.push(S(`M${f(x0)} ${f(y0)}Q${f(mid.x - side * 2)} ${f(mid.y)} ${f(tip.x)} ${f(tip.y)}`, fol.deep, 1.9));
        for (const [t, l] of [
          [0.5, 9.5],
          [0.8, 8.5],
          [1, 6.5],
        ] as const) {
          const q = at(x0, y0, len, ang, t);
          sprigs.push(leafBlade(q.x, q.y, l, l * 0.42, ang - 48, fol, lod), leafBlade(q.x, q.y, l, l * 0.42, ang + 48, fol, lod));
        }
        if (side === 0) body.push(pearl(tip.x, tip.y - 3, 1.05));
      }
      body.unshift(G('leaves', sprigs));
    }
    A.canopyBox = { cx: 100, cy: my - ry * 0.4, rx: rx + 6, ry: ry + 6 };
    A.crown = { x: 104, y: my - ry - 4 };
    A.neck = { x: 100, y: my - ry * 0.55, w: rx * 1.3 };
    A.perch = { x: 100 - rx * 0.55, y: my - ry * 0.85 };
    A.branchL = { x: 100 - rx * 0.88, y: my };
    A.branchR = { x: 100 + rx * 0.88, y: my };
    A.drift = { x: 100 + rx * 0.7, y: my - ry * 0.3 };
    return { body, front, faceSpec: { x: 100, y: my - ry * 0.26, w: Math.min(rx * 0.95, 34), patch: fol.light } };
  },

  cactus(ctx, sp) {
    const { st, lod, base, A, sc } = ctx;
    const pal = sp.palette;
    const fol = sp.foliage;
    const [W, H] = ({ 3: [28, 46], 4: [32, 66], 5: [36, 82], 6: [40, 94] } as Record<number, [number, number]>)[st];
    const topY = base - H;
    const cap = (x: number, w: number, y0: number, y1: number) => `M${f(x - w / 2)} ${f(y0)}V${f(y1 + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w / 2)} ${f(y1 + w / 2)}V${f(y0)}Z`;
    const body: Maybe[] = [];
    const behind: Maybe[] = [];
    const front: Maybe[] = [];
    const fy = base - Math.min(H * 0.42, 30);
    if (st >= 4) {
      const aw = W * 0.56;
      const arms: [number, number, number][] = [
        [-1, 0.3, 0],
        [-1, 0.58, 1],
        [1, 0.52, 3],
        [1, 0.26, 4],
      ];
      for (const [side, hf, dI] of arms) {
        const s = sc[dI];
        const y0 = base - H * hf;
        // Each arm leaves the column sideways, turns up through a rounded
        // elbow, then rises: one cactus, never five (PR #43 UX review).
        const dx = W / 2 + aw * 0.95;
        const up = (8 + st * 5.5) * s;
        const x1 = 100 + side * dx;
        const bend = Math.min(aw * 0.75, up * 0.5);
        const d = `M${f(100 + side * W * 0.2)} ${f(y0)}H${f(x1 - side * bend)}Q${f(x1)} ${f(y0)} ${f(x1)} ${f(y0 - bend)}V${f(y0 - up)}`;
        const k: Maybe[] = [S(d, fol.deep, aw), S(d, fol.mid, aw - 3.5, { transform: 'translate(-0.8 -0.6)' })];
        // The elbow's lit top edge and the arm's lit side, so the turn reads at 64pt.
        if (lod !== 'icon')
          k.push(
            S(`M${f(100 + side * (W / 2 + 1))} ${f(y0 - aw * 0.3)}H${f(x1 - side * bend * 1.1)}`, fol.light, aw * 0.16, { opacity: 0.55 }),
            S(`M${f(x1 - aw * 0.22)} ${f(y0 - bend - 1)}V${f(y0 - up)}`, fol.light, aw * 0.22, { opacity: 0.8 }),
          );
        if (lod === 'full') for (let j = 0; j < 3; j++) k.push(S(`M${f(x1 + side * aw * 0.5)} ${f(y0 - bend - j * 6 - 3)}l${f(side * 2.2)} -1`, fol.hi, 0.9));
        if (st === 6) k.push(glyph('blossom', x1, y0 - up - aw * 0.45, 1.05, 20, pal.light, { core: pal.deep }));
        behind.push(G(`domain-${dI + 1}`, k));
        A.organs[dI] = { x: x1, y: y0 - up * 0.5 };
      }
    }
    const col: Maybe[] = [P(cap(100, W, base + 1, topY), fol.deep), P(cap(99.2, W - 3.5, base, topY + 1.2), fol.mid)];
    if (lod !== 'icon') col.push(P(cap(100 - W * 0.28, W * 0.18, base - 3, topY + 4), fol.light, { opacity: 0.85 }));
    if (lod === 'full') {
      for (const dx of [-0.22, 0.22])
        col.push(S(`M${f(100 + dx * W)} ${f(topY + 7)}V${f(fy - W * 0.36)}`, fol.deep, 1.1, { opacity: 0.45 }), S(`M${f(100 + dx * W)} ${f(fy + W * 0.36)}V${f(base - 3)}`, fol.deep, 1.1, { opacity: 0.45 }));
      for (let y = topY + 9; y < base - 4; y += 9) for (const dx of [-0.5, 0.5]) if (Math.abs(y - fy) > W * 0.32) col.push(S(`M${f(100 + dx * W)} ${f(y)}l${f(dx * 4)} -1.4`, fol.hi, 0.9));
    }
    body.push(G('trunk', col));
    // D3: the crown of the column.
    if (st >= 4) {
      const s = sc[2];
      const k: Maybe[] =
        st === 4
          ? [E(100, topY + 1, 4 * s, 3.4 * s, pal.mid), E(99, topY, 2.4 * s, 2 * s, pal.light)]
          : [
              glyph('blossom', 100, topY + 1, 1.25 * s, 0, pal.light, { core: pal.deep }),
              st === 6 ? glyph('blossom', 92, topY + 4, 0.95 * s, 30, pal.mid, { core: pal.deep }) : null,
              st === 6 ? glyph('blossom', 108, topY + 4, 0.95 * s, 50, pal.mid, { core: pal.deep }) : null,
            ];
      front.push(G('domain-3', k));
      A.organs[2] = { x: 100, y: topY + 2 };
    }
    A.crown = { x: 100, y: topY - (st >= 5 ? 6 : 1) };
    A.neck = { x: 100, y: fy - W * 0.55, w: W };
    A.perch = A.organs[1] ? { x: A.organs[1].x, y: A.organs[1].y - (8 + st * 5.5) * 0.5 * sc[1] - W * 0.25 } : { x: 100 - W * 0.6, y: base + 1 };
    A.branchL = A.organs[0] ? { x: A.organs[0].x - W * 0.2, y: A.organs[0].y + 2 } : { x: 100 - W * 0.4, y: topY + 10 };
    A.branchR = A.organs[4] ? { x: A.organs[4].x + W * 0.2, y: A.organs[4].y + 2 } : { x: 100 + W * 0.4, y: topY + 10 };
    A.canopyBox = { cx: 100, cy: topY + H * 0.3, rx: W * 1.6, ry: H * 0.5 };
    A.drift = { x: 100 + W, y: topY + 10 };
    return { body, behind, front, faceSpec: { x: 100, y: fy, w: W * 0.95 } };
  },

  bamboo(ctx, sp) {
    const { st, lod, base, A, sc } = ctx;
    const pal = sp.palette;
    const CU = A0.bamboo;
    const xs = [64, 82, 100, 118, 136];
    const Wd = [10, 12, 15, 12, 10];
    const Hb = ({ 3: 74, 4: 94, 5: 120, 6: 140 } as Record<number, number>)[st];
    const culms = st === 3 ? [2] : [0, 4, 1, 3, 2];
    const body: Maybe[] = [];
    const spray = (x: number, y: number, side: number, s: number, n = 3) => {
      const k: PNode[] = [];
      for (let j = 0; j < n; j++) k.push(glyph('olive', x, y, s * (1.25 - j * 0.12), side * (62 + j * 26), j === 1 ? pal.light : j === 2 ? pal.deep : pal.mid));
      return G(null, k);
    };
    for (const i of culms) {
      const s = st === 3 ? 1 : sc[i];
      const H = Hb * s * (i === 2 ? 1 : 0.9 - Math.abs(i - 2) * 0.04);
      const w = Wd[i] * (st >= 5 ? 1.1 : 1);
      const x = xs[i];
      const lean = (i - 2) * 2.4;
      const top = base - H;
      const fill = i !== 2 ? mix(CU.mid, CU.deep, Math.abs(i - 2) * 0.3) : CU.mid;
      const k: Maybe[] = [];
      k.push(P(`M${f(x - w / 2)} ${base + 1}L${f(x - w * 0.36 + lean)} ${f(top + 4)}Q${f(x + lean)} ${f(top - 2)} ${f(x + w * 0.36 + lean)} ${f(top + 4)}L${f(x + w / 2)} ${base + 1}Z`, fill));
      if (lod !== 'icon') k.push(P(`M${f(x - w * 0.36)} ${base}L${f(x - w * 0.22 + lean)} ${f(top + 6)}L${f(x - w * 0.08 + lean)} ${f(top + 6)}L${f(x - w * 0.18)} ${base}Z`, CU.light, { opacity: 0.7 }));
      const seg = Math.max(15, H / 6);
      const sprays: { x: number; y: number; side: number; w: number }[] = [];
      for (let y = base - seg, n = 0; y > top + 8; y -= seg, n++) {
        const tt = (base - y) / H;
        const xx = x + lean * tt;
        const ww = lerp(w, w * 0.72, tt);
        if (i === 2 && Math.abs(y - (base - 24)) < 10) continue; // keep the face clear
        k.push(P(`M${f(xx - ww / 2 - 0.6)} ${f(y - 1.2)}h${f(ww + 1.2)}v2.4h${f(-ww - 1.2)}Z`, CU.node));
        if (tt > 0.45) sprays.push({ x: xx, y, side: n % 2 ? 1 : -1, w: ww });
      }
      if (lod !== 'icon') sprays.forEach((q) => k.push(spray(q.x + (q.side * q.w) / 2, q.y, q.side, 0.95 + st * 0.08, st >= 5 ? 4 : 3)));
      k.push(spray(x + lean, top + 2, 1, 0.9 + st * 0.06, 2), spray(x + lean, top + 2, -1, 0.85 + st * 0.06, 2));
      body.push(G(st === 3 ? 'trunk' : `domain-${i + 1}`, k));
      if (st >= 4) A.organs[i] = { x: x + lean * 0.8, y: top + 22 };
      if (i === 2) A.crown = { x: x + lean, y: top - 4 };
    }
    // Elder: new shoots at the foot of the grove, large enough to read at 104pt (PR #43 UX review).
    if (st === 6)
      for (const [sx, s] of [
        [71, 1.1],
        [129, 1.25],
        [148, 0.85],
      ])
        body.push(
          G('shoot', [
            P(`M${f(sx - 7 * s)} ${base + 1}Q${f(sx - 5 * s)} ${f(base - 14 * s)} ${sx} ${f(base - 24 * s)}Q${f(sx + 5 * s)} ${f(base - 14 * s)} ${f(sx + 7 * s)} ${base + 1}Z`, CU.shoot),
            S(`M${f(sx - 5 * s)} ${f(base - 6 * s)}L${f(sx + 5 * s)} ${f(base - 10 * s)}`, CU.shootLine, 1),
            lod !== 'icon' ? S(`M${f(sx - 4 * s)} ${f(base - 13 * s)}L${f(sx + 3.5 * s)} ${f(base - 16 * s)}`, CU.shootLine, 1) : null,
            lod !== 'icon' ? P(`M${sx} ${f(base - 24 * s)}l-1.6 ${f(5 * s)}h3.2Z`, CU.mid) : null,
          ]),
        );
    A.neck = { x: 100, y: base - 42, w: 15 };
    A.perch = st >= 4 ? { x: A.organs[1].x, y: A.organs[1].y - 18 } : { x: 92, y: base - Hb + 20 };
    A.branchL = st >= 4 ? { x: A.organs[0].x - 4, y: A.organs[0].y + 6 } : { x: 92, y: base - Hb * 0.6 };
    A.branchR = st >= 4 ? { x: A.organs[4].x + 4, y: A.organs[4].y + 6 } : { x: 108, y: base - Hb * 0.6 };
    A.canopyBox = { cx: 100, cy: base - Hb * 0.75, rx: st === 3 ? 26 : 50, ry: Hb * 0.35 };
    A.drift = { x: 128, y: base - Hb * 0.5 };
    return { body, faceSpec: { x: 100, y: base - 24, w: 15 * (st >= 5 ? 1.1 : 1) } };
  },
};

/** Young growths for species that don't start from a seed (bamboo shoots, a cactus globe). */
function youngOverride(ctx: Ctx): BodyResult | null {
  const { key, st, lod, base, A } = ctx;
  if (key === 'bamboo' && st <= 2) {
    const CU = A0.bamboo;
    const [w, h] = st === 1 ? [24, 24] : [28, 44];
    const sh = (k: number, c: string) =>
      P(`M${f(100 - (w / 2) * k)} ${base + 1}Q${f(100 - (w / 2) * k * 0.9)} ${f(base - h * k * 0.55)} 100 ${f(base - h * k)}Q${f(100 + (w / 2) * k * 0.9)} ${f(base - h * k * 0.55)} ${f(100 + (w / 2) * k)} ${base + 1}Z`, c);
    const kids: Maybe[] = [sh(1, CU.sheath), sh(0.84, CU.sheathMid), sh(0.6, CU.sheathLit)];
    if (lod !== 'icon') kids.push(S(`M${f(100 - w * 0.36)} ${f(base - 4)}Q${f(100 - w * 0.32)} ${f(base - h * 0.4)} ${f(100 - w * 0.12)} ${f(base - h * 0.68)}`, CU.sheathLine, 1.2, { opacity: 0.8 }));
    kids.push(P(`M100 ${f(base - h - 1)}l-2.4 ${f(h * 0.2)}h4.8Z`, CU.mid));
    if (st === 2) kids.push(glyph('olive', 101, base - h + 2, 0.75, 34, L.grove.light), glyph('olive', 99, base - h + 4, 0.7, -40, L.grove.mid));
    A.crown = { x: 100, y: base - h - 3 };
    A.neck = { x: 100, y: base - h * 0.55, w: w * 0.62 };
    A.perch = { x: 100 - w * 0.95, y: base + 1 };
    A.branchL = { x: 100 - w * 0.7, y: base - h * 0.4 };
    A.branchR = { x: 100 + w * 0.7, y: base - h * 0.4 };
    A.canopyBox = { cx: 100, cy: base - h * 0.5, rx: w * 0.8, ry: h * 0.6 };
    A.drift = A.crown;
    return { body: [G('trunk', kids)], faceSpec: { x: 100, y: base - h * (st === 1 ? 0.32 : 0.27), w: w * 0.9 } };
  }
  if (key === 'cactus' && st === 2) {
    const fol = (SPECIES_ART.cactus as FlowerArt).foliage;
    const r = 15;
    const cy = base - r + 2;
    const kids: Maybe[] = [C(100, cy, r, fol.deep), C(99.2, cy - 0.8, r - 1.8, fol.mid)];
    if (lod !== 'icon') kids.push(E(94, cy - 6, 4, 5, fol.light, { opacity: 0.85 }));
    if (lod === 'full')
      for (let i = 0; i < 9; i++) {
        const a = ((-160 + i * 17.5) * Math.PI) / 180;
        kids.push(S(`M${f(100 + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}l${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3)}`, fol.hi, 0.9));
      }
    kids.push(E(96, cy - r - 1, 3, 2, fol.light), E(104, cy - r - 1, 3, 2, fol.light));
    A.crown = { x: 100, y: cy - r - 3 };
    A.neck = { x: 100, y: cy - r * 0.55, w: r * 1.5 };
    A.perch = { x: 100 - r * 1.3, y: base + 1 };
    A.branchL = { x: 100 - r, y: cy - 4 };
    A.branchR = { x: 100 + r, y: cy - 4 };
    A.canopyBox = { cx: 100, cy, rx: r * 1.4, ry: r * 1.2 };
    A.drift = A.crown;
    return { body: [G('trunk', kids)], faceSpec: { x: 100, y: cy + 2, w: r * 1.7 } };
  }
  return null;
}

// ── main ────────────────────────────────────────────────────────────────
/** An organ never draws below this or above that, whatever the inputs (the art stays whole). */
export const ORGAN_DRAW_MIN = 0.5;
export const ORGAN_DRAW_MAX = 1.25;
/** The organ scale when no data is given: equal weight at 85% mastery (0.62 + 0.46 × 0.85). */
export const ORGAN_DEFAULT = 1.011;

export interface BuildOpts {
  species: PlantSpecies;
  /** Growth 1..6. */
  stage: number;
  /** D1…D5 organ scales (engine/plant.ts organScales). Missing values use ORGAN_DEFAULT. */
  organs?: readonly number[];
  /** True: no face ("Quiet look"). */
  quietLook?: boolean;
  lod?: Lod;
  theme?: 'light' | 'dark';
  /** The face's expression (mobile 1.14: the face only; no posture or marks). */
  mood?: Mood;
  /** The resting look: a calm dusk backdrop and a small moon. */
  resting?: boolean;
  /** Falling leaves at Elder (off for static renders that should stay still-looking). */
  drift?: boolean;
  /**
   * Mobile 1.14: the look, already resolved (engine/plantLooks.ts
   * resolveLook: unknown or locked choices have fallen back). Unset = the
   * species' own look.
   */
  look?: ArtLook;
}

export type { ArtLook };

export interface BuiltPlant {
  root: GNode;
  anchors: Anchors;
  /** A tight square viewBox "x y w h" around the real content, for 24/64pt renders. */
  frame: string;
}

/**
 * Built plants, shared (code review M6a): the picker's 13 previews, Today,
 * You and Your plant reuse a build instead of redoing ~3 ms of geometry each
 * (more on a low-end phone). Keyed by every option, the look included
 * (species, growth, look and theme: the path cache of the 4b brief); a part
 * tree is never changed after it is built, so sharing it is safe. Small and
 * bounded: the oldest entry goes first.
 */
const BUILT = new Map<string, BuiltPlant>();
// 32 (code review M8c): about 13 previews and 4 screens are ever live, and keys churn as organs move.
const BUILT_MAX = 32;
const lookKey = (l: ArtLook | undefined) => (l ? [l.palette ?? '', l.ground ?? '', l.planter ?? '', l.visitor ?? '', (l.keepsakes ?? []).join('+')].join('/') : '');
const buildKey = (o: BuildOpts) =>
  [o.species, Math.round(o.stage), o.lod ?? 'full', o.theme ?? 'light', o.quietLook ? 1 : 0, o.resting ? 1 : 0, o.mood ?? '', o.drift === false ? 0 : 1, (o.organs ?? []).join(','), lookKey(o.look)].join('|');

export function buildPlant(o: BuildOpts): BuiltPlant {
  const k = buildKey(o);
  const hit = BUILT.get(k);
  if (hit) {
    // Most recently used goes to the back, so the plants on screen stay cached.
    BUILT.delete(k);
    BUILT.set(k, hit);
    return hit;
  }
  const built = buildUncached(o);
  if (BUILT.size >= BUILT_MAX) BUILT.delete(BUILT.keys().next().value as string);
  BUILT.set(k, built);
  return built;
}
/** Tests: how many builds are cached (the cache is bounded). */
export const builtCacheSize = () => BUILT.size;

/** The pot a planter id draws for this species ("native" = the species' own ground). */
function potFor(sp: SpeciesArt, planter: string | undefined): PotKind {
  switch (planter) {
    case 'terracotta':
    case 'celadon':
    case 'fieldstone':
    case 'five-stone':
    case 'compass-rose':
    case 'banded':
    case 'root-woven':
      return planter;
    default:
      return sp.pot || 'meadow';
  }
}

function buildUncached(o: BuildOpts): BuiltPlant {
  const key = o.species;
  const base0 = SPECIES_ART[key];
  const look = o.look;
  // A colourway swaps the leaf (trees) or bloom (flowers) palette; the art is otherwise the species'.
  const pal = look?.palette ? plantLeaf[look.palette] : base0.palette;
  const sp: SpeciesArt = { ...base0, palette: pal } as SpeciesArt;
  const st = Math.max(1, Math.min(6, Math.round(o.stage)));
  const lod = o.lod || 'full';
  const theme = o.theme || 'light';
  // Quiet look has no face, so no expression; resting keeps its calm look.
  const mood: Mood = o.resting && (!o.mood || o.mood === 'idle') ? 'resting' : o.mood || 'idle';
  const showFace = !o.quietLook && lod !== 'icon';
  const seed = hash(key + st);
  const sc = [0, 1, 2, 3, 4].map((i) => {
    const v = o.organs?.[i];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(ORGAN_DRAW_MIN, Math.min(ORGAN_DRAW_MAX, v)) : ORGAN_DEFAULT;
  });
  const potKind = potFor(base0, look?.planter);
  const gr = ground(potKind, GEO[st].ground, lod, theme, { water: key === 'lotus' && potKind !== 'pond', look: (look?.ground as GroundLook) || 'meadow' });
  const base = gr.top + 2;
  const A: Anchors = { base: { x: 100, y: base }, organs: [] };
  // A cactus' own pot is deep; in any other planter the young seed sits the same way.
  const potted = potKind !== 'meadow' && potKind !== 'pond' && potKind !== 'bonsai' && potKind !== 'stone';
  const spAdj: SpeciesArt = { ...sp, pot: potted ? 'terracotta' : sp.pot } as SpeciesArt;
  const ctx: Ctx = { key, sp: spAdj, st, lod, pal, fol: sp.kind === 'plant' ? sp.foliage : null, seed, sc, base, A, showFace };

  const res = youngOverride(ctx) ?? (st <= 2 ? youngStage(ctx) : sp.kind === 'tree' ? treeBody(ctx, sp) : PLANTS[sp.build](ctx, sp));

  const fs = res.faceSpec;
  const patch =
    showFace && fs && fs.patch ? E(fs.x, fs.y + fs.w * 0.1, Math.min(fs.w * 0.4, 19) * (fs.patchK || 1), Math.min(fs.w * 0.3, 14) * (fs.patchK || 1), fs.patch, { opacity: 0.85 }) : null;
  const faceNode = showFace && fs ? face(fs.x, fs.y, fs.w, mood, lod) : null;
  if (fs) A.face = { x: fs.x, y: fs.y };

  // Drifting leaves (Elder only, and never at icon size).
  const drift: Maybe[] = [];
  if (st === 6 && o.drift !== false && lod !== 'icon' && A.drift && key !== 'pine') {
    const d = A.drift;
    const kind = sp.driftGlyph || sp.leaf || 'lens';
    const fill = sp.driftFill || sp.palette.light;
    const core = key === 'cherry-blossom' ? A0.gift.cherryCore : key === 'bonsai' ? A0.gift.mossBloomCore : L.twilight.deep;
    // Two leaves (or petals) on their way down, always above the ground line.
    const low = base - 8;
    drift.push(glyph(kind, d.x + 14, Math.min(d.y + 22, low - 14), 0.8, 120, fill, { core }));
    drift.push(glyph(kind, d.x + 4, Math.min(d.y + 44, low), 0.7, -60, fill, { core }));
  }

  // Posture belongs to motion now (mobile 1.14): only the resting look keeps its small tilt.
  const pose = mood === 'resting' ? `rotate(2.5 100 ${base})` : null;
  const fx = effects(mood, A, lod, theme);
  // The visitor perches on the plant (it sways with it), on the clearing day.
  const visitor = visitorNode(look?.visitor, A, lod);
  const tree = G('tree', [G('body', [...(res.behind || []), ...res.body, patch, faceNode, visitor, ...(res.front || [])], pose ? { transform: pose } : {}), G('drift', drift), fx]);
  // The hero stage is a shared 200 × 200, so growth reads from one size to the
  // next. A very full Elder (big organs, a tall crown) can reach past it: then
  // the whole plant settles a little smaller about its base, never clipped.
  const tb = bounds(tree);
  const M = 3;
  const fit = Math.min(1, (base - M) / Math.max(1, base - tb.minY), (100 - M) / Math.max(1, 100 - tb.minX), (100 - M) / Math.max(1, tb.maxX - 100));
  if (fit < 1) tree.transform = `translate(100 ${f(base)}) scale(${fit.toFixed(3)}) translate(-100 ${f(-base)})`;

  // Keepsakes (mobile 1.14): up to three, on the shelf beside the plant. Two
  // base slots (left, right) and one behind it; the clear dawn is always the
  // backdrop. Never at icon size (a 24pt chip is the silhouette only).
  // UX review H2: flat ones (a stone, a pond, a ring) take the base slots
  // first, since behind the plant the trunk would hide them; a flat third
  // lies in front instead, and the slot behind stands clear of the trunk.
  const keepBack: Maybe[] = [];
  const keepFront: Maybe[] = [];
  let dawn: GNode | null = null;
  if (lod !== 'icon' && look?.keepsakes?.length) {
    // Big enough to read at 104pt, kept on the 200 × 200 stage.
    const k = GROUND_K[GEO[st].ground] * 1.6;
    const gap = 3 + 9 * k;
    const half = 11 * k;
    const base2 = [
      { x: Math.max(2 + half, 100 - gr.span - gap), foot: gr.floor },
      { x: Math.min(198 - half, 100 + gr.span + gap), foot: gr.floor },
    ];
    const items = [...new Set(look.keepsakes)].slice(0, 3);
    if (items.includes('clear-dawn')) {
      // A soft sun behind the crown: the mist has lifted.
      const T = plantTheme[theme];
      const box = A.canopyBox ?? { cx: 100, cy: 120, rx: 30, ry: 30 };
      const r = Math.min(26, Math.max(12, box.rx * 0.42));
      const cx = Math.min(196 - r, box.cx + box.rx * 0.62);
      const cy = Math.max(r + 2, box.cy - box.ry * 0.7);
      dawn = G('keepsake-clear-dawn', [C(cx, cy, r, A0.keepsake.dawn, { opacity: T.dawnOpacity }), C(cx, cy, r * 0.66, A0.keepsake.dawn, { opacity: Math.min(1, T.dawnOpacity + 0.2) })]);
    }
    const flat = (id: string) => lookItem(id)?.shape === 'flat';
    const standing = items.filter((id) => id !== 'clear-dawn');
    const order = [...standing.filter(flat), ...standing.filter((id) => !flat(id))];
    const trunkHalf = bandHalfWidth({ ...tree, children: [tree.children[0]] }, base - 16, base - 1);
    order.forEach((id, i) => {
      if (i < 2) keepFront.push(keepsakeAt(id, base2[i].x, base2[i].foot, k, lod, theme));
      else if (flat(id)) {
        // A flat third lies in front, just right of the trunk (never over its face).
        const kf = k * 0.8;
        keepFront.push(keepsakeAt(id, Math.min(198 - 11 * kf, 100 + Math.max(gr.span * 0.5, trunkHalf + 9 * kf)), gr.floor + 2, kf, lod, theme));
      } else {
        // Behind the plant, clear of the trunk: on the mound, or in a pot's soil like a garden figurine (the rim overlaps its foot).
        const kb = k * (potKind === 'meadow' ? 0.8 : 0.68);
        const x = Math.min(198 - 11 * kb, 100 + Math.max(trunkHalf + 11 * kb, gr.span * (potKind === 'meadow' ? 0.62 : 0.76)));
        keepBack.push(keepsakeAt(id, x, potKind === 'meadow' ? gr.floor - 3 : gr.top + 1.5, kb, lod, theme));
      }
    });
  }
  const frame = frameFor(bounds(G(null, [gr.back, ...(keepBack as PNode[]), tree, gr.front, ...(keepFront.filter(Boolean) as PNode[]), dawn ?? null].filter(Boolean) as PNode[])));
  // The resting dusk: a soft disc behind the whole plant, filling the frame.
  let backdrop: GNode | null = null;
  if (o.resting) {
    const T = plantTheme[theme];
    const [fx0, fy0, fs0] = frame.split(' ').map(Number);
    // Kept inside the shared 200 × 200 stage too, so the 200pt hero (which
    // draws the whole stage, not the tight frame) never clips the disc.
    const dcx = fx0 + fs0 / 2;
    const dcy = fy0 + fs0 / 2;
    const dr = Math.max(8, Math.min(fs0 * 0.48, dcx - 1, dcy - 1, 199 - dcx, 199 - dcy));
    backdrop = G('dusk', [C(dcx, dcy, dr, T.dusk, { opacity: T.duskOpacity })]);
  }
  // Paint order, and the three motion layers (PlantLayers): back (dusk, the
  // dawn, the ground, a keepsake behind) · the plant (`tree`, which moves) ·
  // front (the pot's rim, grass, the keepsakes beside it). Never moves: the
  // ground grounds the character (motion.md §5).
  const root = G('mascot', [backdrop, dawn, gr.back, G('keepsakes-back', keepBack), tree, gr.front, G('keepsakes', keepFront)]);
  return { root, anchors: A, frame };
}

/** The motion layers of a built plant, in paint order: back and front never move; the plant does. */
export interface PlantLayers {
  back: GNode;
  plant: GNode;
  front: GNode;
}
/** Splits a built plant into its three motion layers (cached per build: never rebuilt per frame). */
const LAYERS = new WeakMap<GNode, PlantLayers>();
export function plantLayers(root: GNode): PlantLayers {
  const hit = LAYERS.get(root);
  if (hit) return hit;
  const i = root.children.findIndex((c) => c.t === 'g' && c.id === 'tree');
  const layers = {
    back: G('back', root.children.slice(0, i)),
    plant: G('plant', [root.children[i]]),
    front: G('front', root.children.slice(i + 1)),
  };
  LAYERS.set(root, layers);
  return layers;
}

/**
 * Lifts one named group out of a part tree into its own layer (the
 * onboarding sprout pops on its own): returns the tree without it, and the
 * group alone with its ancestors' transforms composed, so it draws in the
 * same place. Null when the tree has no such group.
 */
export function liftGroup(root: GNode, id: string): { rest: GNode; part: GNode } | null {
  let found: { node: GNode; chain: string[] } | null = null;
  const strip = (n: PNode, chain: string[]): PNode | null => {
    if (n.t !== 'g') return n;
    if (n.id === id && !found) {
      found = { node: n, chain };
      return null;
    }
    const next = n.transform ? [...chain, n.transform] : chain;
    return { ...n, children: n.children.map((c) => strip(c, next)).filter(Boolean) as PNode[] };
  };
  const rest = strip(root, []) as GNode;
  if (!found) return null;
  const { node, chain } = found as { node: GNode; chain: string[] };
  return { rest, part: G(`lift-${id}`, [node], chain.length ? { transform: chain.join(' ') } : {}) };
}

/**
 * A tight square viewBox around the drawn plant (its real bounds, marks
 * included), with a small margin. The ground sits on the bottom edge, like a
 * plant on a shelf, and the plant is centred left to right.
 */
export function frameFor(box: Box, pad = 0): string {
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const s = Math.max(w, h) * (1.06 + pad) + 4;
  const cx = (box.minX + box.maxX) / 2;
  const yb = box.maxY + 2 + Math.max(0, s - h - 4) * 0.12; // a hair of floor below a wide plant
  return `${f(cx - s / 2)} ${f(yb - s)} ${f(s)} ${f(s)}`;
}

// ── bounds ──────────────────────────────────────────────────────────────
/** A 2D affine matrix [a b c d e f] (x' = a·x + c·y + e, y' = b·x + d·y + f). */
type Mat = [number, number, number, number, number, number];
const ID: Mat = [1, 0, 0, 1, 0, 0];
const mul = (m: Mat, n: Mat): Mat => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Parses the transform strings the art uses: translate, rotate (with an optional centre) and scale. */
function parseTransform(s: string | undefined): Mat {
  let m: Mat = ID;
  if (!s) return m;
  for (const [, op, args] of s.matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (op === 'translate') m = mul(m, [1, 0, 0, 1, v[0] || 0, v[1] || 0]);
    else if (op === 'scale') m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
    else {
      const a = ((v[0] || 0) * Math.PI) / 180;
      const r: Mat = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
      m = v.length >= 3 ? mul(mul(mul(m, [1, 0, 0, 1, v[1], v[2]]), r), [1, 0, 0, 1, -v[1], -v[2]]) : mul(m, r);
    }
  }
  return m;
}

/** The points that bound a path (end and control points; an arc adds its bulge). Over-estimates slightly, never under. */
function pathPoints(d: string): [number, number][] {
  const out: [number, number][] = [];
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const num = () => Number(toks[i++]);
  const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      x = sx;
      y = sy;
      continue;
    }
    if (!isNum()) continue;
    const pt = (px: number, py: number): [number, number] => (rel ? [x + px, y + py] : [px, py]);
    if (C === 'M' || C === 'L') {
      [x, y] = pt(num(), num());
      if (C === 'M') {
        sx = x;
        sy = y;
        cmd = rel ? 'l' : 'L';
      }
      out.push([x, y]);
    } else if (C === 'H') {
      x = rel ? x + num() : num();
      out.push([x, y]);
    } else if (C === 'V') {
      y = rel ? y + num() : num();
      out.push([x, y]);
    } else if (C === 'Q' || C === 'C') {
      const n = C === 'Q' ? 2 : 3;
      let p: [number, number] = [x, y];
      for (let k = 0; k < n; k++) {
        p = pt(num(), num());
        out.push(p);
      }
      [x, y] = p;
    } else if (C === 'A') {
      const r = Math.abs(num());
      num(); // ry (the art's arcs are circular)
      num(); // rotation
      num(); // large-arc
      num(); // sweep
      const [nx, ny] = pt(num(), num());
      const L2 = Math.hypot(nx - x, ny - y) / 2;
      const h = r - Math.sqrt(Math.max(0, r * r - L2 * L2)) || 0;
      const mx = (x + nx) / 2;
      const my = (y + ny) / 2;
      const ux = L2 ? -(ny - y) / (2 * L2) : 0;
      const uy = L2 ? (nx - x) / (2 * L2) : 0;
      // A small arc bulges at most its sagitta on one side; both sides are a safe bound. A large one, a full circle.
      const b = Math.max(h, r > L2 * 1.01 ? 0 : r);
      out.push([nx, ny], [mx + ux * b, my + uy * b], [mx - ux * b, my - uy * b]);
      for (const [px, py] of [[x, y], [nx, ny]]) out.push([px + ux * b, py + uy * b], [px - ux * b, py - uy * b]);
      x = nx;
      y = ny;
    } else {
      i++; // an unknown command's argument: skip it
    }
  }
  return out;
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
/** The drawn bounds of a part tree, in viewBox units (transforms and stroke widths included). */
export function bounds(n: PNode, m: Mat = ID, box: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }): Box {
  const mm = n.transform ? mul(m, parseTransform(n.transform)) : m;
  const add = (x: number, y: number, pad = 0) => {
    const [px, py] = apply(mm, x, y);
    const k = Math.hypot(mm[0], mm[1]) * pad;
    box.minX = Math.min(box.minX, px - k);
    box.maxX = Math.max(box.maxX, px + k);
    box.minY = Math.min(box.minY, py - k);
    box.maxY = Math.max(box.maxY, py + k);
  };
  if (n.t === 'g') n.children.forEach((c) => bounds(c, mm, box));
  else if (n.t === 'circle') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]]) add(n.cx + dx * n.r, n.cy + dy * n.r);
  else if (n.t === 'ellipse') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]]) add(n.cx + dx * n.rx, n.cy + dy * n.ry);
  else for (const [x, y] of pathPoints(n.d)) add(x, y, n.stroke ? (n.sw ?? 1) / 2 : 0);
  return box;
}

/** Every named group in a part tree, depth-first (tests and motion use the names). */
/** How far a drawing reaches from the centre line (x = 100) between two heights: the trunk's half-width at its base. */
export function bandHalfWidth(n: PNode, yLo: number, yHi: number, m: Mat = ID): number {
  const mm = n.transform ? mul(m, parseTransform(n.transform)) : m;
  let hw = 0;
  const add = (x: number, y: number) => {
    const [px, py] = apply(mm, x, y);
    if (py >= yLo && py <= yHi) hw = Math.max(hw, Math.abs(px - 100));
  };
  if (n.t === 'g') for (const c of n.children) hw = Math.max(hw, bandHalfWidth(c, yLo, yHi, mm));
  else if (n.t === 'circle') {
    add(n.cx - n.r, n.cy);
    add(n.cx + n.r, n.cy);
  } else if (n.t === 'ellipse') {
    add(n.cx - n.rx, n.cy);
    add(n.cx + n.rx, n.cy);
  } else for (const [x, y] of pathPoints(n.d)) add(x, y);
  return hw;
}

export function groupNames(n: PNode, out: string[] = []): string[] {
  if (n.t === 'g') {
    if (n.id) out.push(n.id);
    n.children.forEach((c) => groupNames(c, out));
  }
  return out;
}

/** Counts the drawn primitives (the render-cost budget: a full Crown stays well under 200). */
export function countShapes(n: PNode): number {
  return n.t === 'g' ? n.children.reduce((s, c) => s + countShapes(c), 0) : 1;
}
