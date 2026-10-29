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
import { resolveFinal } from '../../engine/plantForms';
import type { ArtLook } from '../../engine/plantLooks';
import { plantArt as A0, plantLeaf, plantLine, plantTheme, type PlantLeafId, type PlantLeafPalette } from '../../theme/tokens';
import type { Anchors, Box, BuiltPlant, GNode, GroundResult, KeepsakePlacement, Lod, PNode, Paint, PathNode, PotKind } from './art';
import { drawForm, FORM_LINES, paint } from './forms';
import { glow, INSIDE, type Kids, type V2 } from './forms/kit';

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

// ── the build ───────────────────────────────────────────────────────────
/** The ground sizes per growth (art.ts GEO's ground): the meadow's soil lines are this wide. */
const GROUND_W = [0, 34, 46, 62];
const groundSize = (st: number) => (st <= 2 ? 1 : st <= 4 ? 2 : 3);
/** The masters' ground line: every form is drawn standing on y = 170. */
const FORM_BASE = 170;
/**
 * Growth 1 is Form I before its first leaves open: only these parts, and its
 * shoot a little smaller. Growth 4 is Form III a little smaller, before its
 * flowers and fruit (they open at Crown, as before).
 */
const SEED_PARTS = new Set(['seed', 'roots', 'sprout', 'stem', 'husk', 'pads', 'pads-front']);
const SEED_SHOOT = new Set(['sprout', 'stem']);
const SEED_K = 0.8;
const BOUGH_K = 0.88;
const BOUGH_DROPS = new Set(['fruit', 'blooms']);
/** The organ scale when no data is given (art.ts ORGAN_DEFAULT). */
const ORGAN_DEFAULT = 1.011;

const scaleAbout = (k: number) => `translate(100 ${FORM_BASE}) scale(${k}) translate(-100 ${-FORM_BASE})`;
const idOf = (n: PNode) => (n.t === 'g' ? n.id : null);

export function buildBotanical(o: BotanicalOpts, kit: BotanicalKit): BuiltPlant {
  const key = o.species;
  const line = FORM_LINES[key];
  const st = Math.max(1, Math.min(6, Math.round(o.stage)));
  const lod: Lod = o.lod || 'full';
  const theme = o.theme || 'light';
  const TL = plantLine[theme];
  const W = LINE_PT[lod];
  // UX review H1: resting, the plant sits on the dusk disc, a little darker than the page in
  // light, so the leaf, soil and star lines take a touch more ink there (≥ 3:1 on the disc).
  const restMix = o.resting ? TL.restLineMix : 0;
  const rest = (c: string) => (restMix ? kit.mix(c, TL.woodInk, restMix) : c);
  const lineOf = (p: PlantLeafPalette) => rest(p[TL.leaf]);

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
    groundBack = G('ground', [...arcs.map(([hw, y, sag, op]) => L(`M${f(100 - hw)} ${y}Q100 ${y - sag} ${f(100 + hw)} ${y}`, rest(TL.soil), W.main, { opacity: op })), ...look(gr.back, ['stone-ring'])]);
    const front: Maybe[] = [];
    if (lod !== 'icon') {
      const tuft = (x: number, s: number) =>
        L(`M${f(x - 2.4 * s)} 170.4q0.4 -3 -1 -5.4M${f(x)} 169.8q0 -4 1.4 -7M${f(x + 2.4 * s)} 170.4q0.2 -2.6 1.6 -4.2`, lineOf(plantLeaf.grove), W.main * 0.8, { opacity: 0.8 });
      front.push(tuft(100 - gw * 0.62, 1), tuft(100 + gw * 0.7, 0.8));
    }
    groundFront = G('ground-front', [...front, ...look(gr.front, ['stone-ring-front', 'trail-blaze'])]);
  } else {
    base = gr.top + 2;
    groundBack = { ...ink(gr.back, theme, W.main, kit.mix), id: 'ground' };
    groundFront = { ...ink(gr.front, theme, W.main, kit.mix), id: 'ground-front' };
  }

  // The form (components/plant/forms): the masters' parts, in this plant's colours and organs.
  const inPot = !meadow;
  const gb = inPot ? kit.bounds(groundBack) : null;
  const span = gb ? (gb.maxX - gb.minX) / 2 - 3 : 60;
  const keepsakes = o.look?.keepsakes ?? [];
  const clearDawn = keepsakes.includes('clear-dawn');
  const palKey = (o.look?.palette ?? line.pal) as PlantLeafId;
  const S = paint(theme, lod, {
    pal: palKey,
    fol: line.fol ?? palKey,
    mix: kit.mix,
    rest,
    sc: [0, 1, 2, 3, 4].map((i) => {
      const v = o.organs?.[i];
      return typeof v === 'number' && Number.isFinite(v) ? v : ORGAN_DEFAULT;
    }),
  });
  const final = resolveFinal(st, o.look?.final);
  const out = drawForm(key, st, final, { S, species: key, inPot, span, keeps: keepsakes.filter((k) => k !== 'clear-dawn').length });

  // Growth 1 and 4 are drawn from their form's master (see SEED_PARTS and BOUGH_K).
  let parts = flatKids(out.body);
  let shoot: PNode[] = [];
  let k = 1;
  if (st === 1) {
    parts = parts.filter((n) => SEED_PARTS.has(idOf(n) ?? ''));
    shoot = parts.filter((n) => SEED_SHOOT.has(idOf(n) ?? ''));
    parts = parts.filter((n) => !SEED_SHOOT.has(idOf(n) ?? ''));
  } else if (st === 4) {
    parts = parts.filter((n) => !BOUGH_DROPS.has(idOf(n) ?? ''));
    k = BOUGH_K;
  }
  // The masters stand on y = 170; this ground's top is `base`.
  const dy = base - FORM_BASE;
  const shift = Math.abs(dy) > 0.01 ? `translate(0 ${f(dy)})` : '';
  const placed = (extra: string) => [shift, extra].filter(Boolean).join(' ');
  const formT = placed(k !== 1 ? scaleAbout(k) : '');
  const body = G(null, [...parts, shoot.length ? G(null, shoot, { transform: scaleAbout(SEED_K) }) : null], formT ? { transform: formT } : {});
  const at = (p: V2 | undefined, kk = st === 1 ? SEED_K : k) => (p ? { x: f(100 + (p[0] - 100) * kk), y: f(FORM_BASE + (p[1] - FORM_BASE) * kk + dy) } : undefined);

  // Anchors: where the visitor perches, the crown's box (the resting moon, the clear dawn), the organs.
  const A: Anchors = { base: { x: 100, y: base }, organs: [] };
  const crownParts = body.children.filter((c) => idOf(c) === 'canopy');
  const cb = measure(crownParts.length ? { ...body, children: crownParts } : body, kit);
  A.canopyBox = { cx: (cb.minX + cb.maxX) / 2, cy: (cb.minY + cb.maxY) / 2, rx: Math.max(8, (cb.maxX - cb.minX) / 2), ry: Math.max(8, (cb.maxY - cb.minY) / 2) };
  const box = A.canopyBox;
  A.crown = { x: box.cx, y: box.cy - box.ry };
  A.perch = at(out.perch) ?? { x: box.cx - box.rx * 0.5, y: box.cy - box.ry * 0.6 };
  A.branchL = { x: box.cx - box.rx * 0.58, y: box.cy + box.ry * 0.62 };
  A.branchR = { x: box.cx + box.rx * 0.6, y: box.cy + box.ry * 0.62 };
  A.neck = { x: 100, y: base - 12, w: 6 };
  A.drift = { x: box.cx + box.rx * 0.7, y: box.cy + box.ry * 0.4 };
  if (st >= 4)
    for (const org of out.organs ?? []) {
      const i = org.dom - 1;
      if (i >= 0 && i < 5 && !A.organs[i]) A.organs[i] = at([org.x, org.y])!;
    }

  // Drift: a few leaves or petals on their way down (Form IV of the broadleaves), never at icon size.
  const drift: Maybe[] = o.drift !== false && st === 6 ? [G(null, flatKids(out.drift ?? []), shift ? { transform: shift } : {})] : [];
  // Resting: the dusk behind and a line moon. A small settle, never a droop, never a colour loss.
  const pose = o.resting ? `rotate(1.5 100 ${f(base)})` : null;
  let fx: GNode | null = null;
  if (o.resting && lod !== 'icon') {
    const { cx, cy, rx, ry } = box;
    const mx = Math.min(186, cx + rx * 0.7);
    const my = Math.max(14, cy - ry - 8);
    const moon = `M${f(mx)} ${f(my - 8)}A8 8 0 1 0 ${f(mx + 7)} ${f(my + 4)}A6.4 6.4 0 1 1 ${f(mx)} ${f(my - 8)}Z`;
    fx = G('fx', [P(moon, TL.moon, { opacity: TL.moonWashOp }), L(moon, TL.moon, W.main)]);
  }
  // An optional visitor (a look the learner picked): the storybook bird, inked, on this form's perch.
  const bird = o.look?.visitor && o.look.visitor !== 'no-visitor' ? kit.visitor(o.look.visitor, A, lod) : null;
  const visitor = bird ? { ...ink(bird, theme, W.main * 0.9, kit.mix), id: 'visitor' } : null;
  const tree = G('tree', [G('body', [body, visitor], pose ? { transform: pose } : {}), G('drift', drift), fx]);
  // The form's props: a frame, a boulder or stones behind (with Form I's soil cutaway, on the meadow), stones in front.
  const propsBack = G('props-back', [meadow ? (out.cutaway ?? null) : null, ...flatKids(out.back ?? [])], shift ? { transform: shift } : {});
  const propsFront = G('props-front', flatKids(out.front ?? []), shift ? { transform: shift } : {});

  // The shared 200 × 200 stage: a very full form settles a little smaller about its base, never clipped.
  const tb = measure(G(null, [tree, propsBack, propsFront]), kit);
  const M = 3;
  const fitK = Math.min(1, (base - M) / Math.max(1, base - tb.minY), (100 - M) / Math.max(1, 100 - tb.minX), (100 - M) / Math.max(1, tb.maxX - 100));
  if (fitK < 1) {
    const fit = `translate(100 ${f(base)}) scale(${fitK.toFixed(3)}) translate(-100 ${f(-base)})`;
    for (const g of [tree, propsBack, propsFront]) g.transform = g.transform ? `${fit} ${g.transform}` : fit;
  }
  // Form IV's light: three soft circles behind it. Never at icon size, while resting, or with the clear dawn.
  const glowNode = st === 6 && out.glow && !o.resting && !clearDawn ? glow(S, out.glow[0], out.glow[1] + dy, out.glow[2]) : null;

  // Optional keepsakes (picked by the learner): the storybook placement, inked.
  const ks = kit.keepsakes(o.look?.keepsakes, st, gr, tree, base, potKind, A, lod, theme);
  const keepBack = G('keepsakes-back', ks.back.map((x) => ink(x, theme, W.main * 0.9, kit.mix)));
  const keepFront = G('keepsakes', ks.front.map((x) => ink(x, theme, W.main * 0.9, kit.mix)));

  // The frame: the form's bounds are already known (scaled about its base when it was fitted),
  // so only the ground and keepsakes are measured again.
  const kk = Math.min(1, fitK);
  const gbox = kit.bounds(G(null, [groundBack, keepBack, groundFront, keepFront, ks.dawn]));
  const sx = (x: number) => 100 + (x - 100) * kk;
  const sy = (y: number) => base + (y - base) * kk;
  const frame = kit.frameFor({
    minX: Math.min(gbox.minX, sx(tb.minX)),
    maxX: Math.max(gbox.maxX, sx(tb.maxX)),
    minY: Math.min(gbox.minY, sy(tb.minY)),
    maxY: Math.max(gbox.maxY, sy(tb.maxY)),
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
  // Paint order (DESIGN_SYSTEM §8.10): the light and the props behind never move; the tree moves; the props in front never move.
  const root = G('mascot', [backdrop, ks.dawn, glowNode, groundBack, propsBack, keepBack, tree, propsFront, groundFront, keepFront]);
  // Points → viewBox units, from the real render size.
  const side = o.fit ? Number(frame.split(' ')[2]) : 200;
  scaleLines(root, side / (o.px || 200), 1);
  return { root, anchors: A, frame };
}

/** Children as one flat list (a form may nest them). */
function flatKids(xs: Kids, out: PNode[] = []): PNode[] {
  for (const x of xs) {
    if (Array.isArray(x)) flatKids(x, out);
    else if (x) out.push(x);
  }
  return out;
}
/** The drawn bounds of the form, padded by one unit for the line's half-width (a safe over-estimate). */
function measure(n: GNode, kit: BotanicalKit): Box {
  const prune = (x: PNode): PNode => (x.t === 'g' ? { ...x, children: x.children.filter((c) => !INSIDE.has(c)).map(prune) } : x);
  const b = kit.bounds(prune(n));
  return { minX: b.minX - 1, minY: b.minY - 1, maxX: b.maxX + 1, maxY: b.maxY + 1 };
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

