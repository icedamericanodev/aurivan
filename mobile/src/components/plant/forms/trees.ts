/**
 * The five broadleaf lines (oak, maple, narra, cherry blossom, mango): four
 * forms each, plus the five Form IV flavour recipes (Lookout, Moot,
 * Espalier, Coppice, Holdfast) applied to each species' own habit.
 * Ported from the art masters (scratchpad evolve/art13/src/trees.cjs).
 *
 * Plain English: each form is a list of parts at fixed places on the
 * 200 × 200 stage (ground at y = 170, centre x = 100). A domain's crown
 * mass grows and shrinks with its mastery (kit.ts scaleMasses), the rest of
 * the drawing stays where the designer put it.
 */
import {
  A0,
  acorns,
  blossoms,
  crown,
  cutaway,
  D2R,
  disc,
  drift,
  f,
  G,
  goldSprays,
  hanging,
  hatchE,
  L,
  leaf,
  leafSet,
  leavesNode,
  limbs,
  lowerRim,
  M,
  oval,
  P,
  qa,
  qp,
  Q,
  rng,
  rootLines,
  rootTapers,
  samaras,
  scaleMasses,
  seedPart,
  stones,
  boulder,
  trunk,
  upperRim,
  xf,
  type CrownOpts,
  type FormBuilder,
  type FormCtx,
  type FormLine,
  type FormOut,
  type Kids,
  type LeafKind,
  type LeafSet,
  type Limb,
  type Mass,
  type Organ,
  type Paints,
  type Pal,
  type Taper,
  type TrunkOpts,
  type V2,
} from './kit';
import type { FlavourId } from '../../../engine/plantForms';

/** A seedling's first leaves are green, whatever the flower colour (a pink or gold colourway is the bloom's). */
export const green = (p: Pal): Pal =>
  p === 'ember' || p === 'gold' || p === 'golden' || p === 'lemon' ? 'spring' : p === 'blossom' || p === 'snow' || p === 'twilight' || p === 'rosewood' || p === 'pearl' ? 'grove' : p;

/** A species' habit: what every recipe keeps of it (its bark, leaf and fruit). */
export interface Habit {
  bark: string;
  kind: LeafKind;
  ll: number;
  aspect?: number;
  blossom?: boolean;
  bands?: boolean;
  pads?: boolean;
  needle?: boolean;
  fruit: (S: Paints, ms: Mass[]) => Kids[number];
}
/** One tree drawing (Forms III/IV and every flavour). */
export interface TreeSpec extends Omit<Habit, 'fruit'>, Omit<CrownOpts, 'kind' | 'll' | 'blossom' | 'needle' | 'pal'> {
  pal: Pal;
  masses: Mass[];
  trunk: [V2, V2, V2, number, number, TrunkOpts?];
  limbs?: Limb[];
  roots?: Limb[];
  rootD?: string | null;
  afterTrunk?: Kids;
  extras?: (cr: { organs: Organ[] }) => Kids;
  back?: Kids;
  front?: Kids;
  drift?: Kids;
  glow?: [number, number, number] | null;
  perch?: V2;
  fruit?: Habit['fruit'];
}

/** Builds a broadleaf tree from its spec. */
export function tree(c: FormCtx, sp: TreeSpec): FormOut {
  const { S } = c;
  const body: Kids = [];
  if (sp.rootD) body.push(rootLines(S, sp.rootD, sp.bark));
  if (sp.roots) body.push(rootTapers(S, sp.roots, sp.bark));
  if (sp.limbs) body.push(limbs(S, sp.limbs, sp.bark));
  const [p0, pc, p1, w0, w1, to] = sp.trunk;
  body.push(trunk(S, p0, pc, p1, w0, w1, sp.bark, to || {}));
  if (sp.afterTrunk) body.push(...sp.afterTrunk);
  // The organ scale sizes the masses first (in place), so fruit placed on them later sits on the sized crown.
  if (sp.ids !== false) scaleMasses(S, sp.masses);
  let masses = sp.masses;
  if (sp.pads) masses = masses.map((m) => ({ ...m, ry: Math.max(6.5, m.ry * 0.55), flat: Math.min(m.flat ?? 9, 0.62), n: m.n || Math.max(8, Math.round(m.rx / 3)) }));
  const cr = crown(S, masses, { kind: sp.kind, ll: sp.ll, pal: sp.pal, rim: sp.rim, blossom: sp.blossom, needle: sp.needle, seed: sp.seed, dense: sp.dense, ids: sp.ids });
  body.push(cr.node);
  if (sp.extras) body.push(...sp.extras(cr));
  const left = masses.reduce((a, m) => (m.x < a.x ? m : a));
  return {
    body,
    back: sp.back || [],
    front: sp.front || [],
    drift: sp.drift || [],
    glow: sp.glow || null,
    perch: sp.perch || [left.x + left.rx * 0.2, left.y - left.ry * 0.85],
    organs: cr.organs,
  };
}

function mangoes(S: Paints, pts: V2[]) {
  return hanging(S, pts, {
    color: A0.gift.mangoRipe,
    blush: A0.gift.mangoBlush,
    stalk: 7,
    rx: 3.2,
    ry: 4.4,
    shape: (x, y) => `M${f(x)} ${f(y - 4.6)}C${f(x + 4)} ${f(y - 4)} ${f(x + 3.6)} ${f(y + 4.4)} ${f(x - 0.4)} ${f(y + 4.6)}C${f(x - 3.6)} ${f(y + 4.4)} ${f(x - 3)} ${f(y - 1)} ${f(x)} ${f(y - 4.6)}Z`,
  });
}
export const HABIT: Record<'oak' | 'maple' | 'narra' | 'cherry-blossom' | 'mango', Habit> = {
  oak: { bark: A0.bark.oak, kind: 'oak', ll: 11, aspect: 1, fruit: (S, ms) => acorns(S, lowerRim(ms, 6, 3)) },
  maple: { bark: A0.bark.maple, kind: 'maple', ll: 11, aspect: 0.94, fruit: (S, ms) => samaras(S, lowerRim(ms, 6, 5)) },
  narra: { bark: A0.bark.narra, kind: 'ovate', ll: 9, aspect: 1.1, fruit: (S, ms) => goldSprays(S, upperRim(ms, 8, 9), 1.05) },
  'cherry-blossom': { bark: A0.bark.cherry, kind: 'lens', ll: 9, aspect: 1.05, blossom: true, bands: true, fruit: () => null },
  mango: { bark: A0.bark.mango, kind: 'long', ll: 13, aspect: 1.04, fruit: (S, ms) => mangoes(S, lowerRim(ms, 6, 4)) },
};
/** Cherry bark: its horizontal lenticel bands (a trunk extra). */
export const bands = (t: Taper) => {
  let d = '';
  const n = t.left.length - 1;
  for (let i = 2; i < n - 1; i += 2) {
    const a = t.left[i];
    const b = t.right[i];
    d += `M${f(a[0] + (b[0] - a[0]) * 0.22)} ${f(a[1] + (b[1] - a[1]) * 0.22)}L${f(a[0] + (b[0] - a[0]) * 0.5)} ${f(a[1] + (b[1] - a[1]) * 0.5)}`;
  }
  return d;
};
const ax = (H: Habit, x: number) => 100 + (x - 100) * (H.aspect ?? 1);

// ── the five flavour recipes ────────────────────────────────────────────
/** A habit as a tree spec's base (what the recipe keeps of the species). */
const base = (H: Habit) => ({ bark: H.bark, kind: H.kind, ll: H.ll, aspect: H.aspect, blossom: H.blossom, bands: H.bands, pads: H.pads, needle: H.needle });

/** Lookout (the audit overview): a high, open crown with a sightline through it; a leader above. */
function lookout(c: FormCtx, H: Habit, pal: Pal): FormOut {
  const k = (x: number) => ax(H, x);
  const masses = [M(k(60), 72, 20, 14, 1), M(k(70), 42, 19, 13, 2), M(k(130), 42, 19, 13, 4), M(k(140), 72, 20, 14, 5), M(100, 20, 17, 11, 3)];
  return tree(c, {
    ...base(H),
    pal,
    seed: 41,
    masses,
    trunk: [[100, 171], [100, 132], [100, 92], 16, 9, { furrows: 5, extra: H.bands ? bands : null }],
    limbs: [
      [[100, 104], [80, 96], [k(62), 76], 6, 2],
      [[100, 104], [120, 96], [k(138), 76], 6, 2],
      [[100, 96], [82, 70], [k(72), 46], 5, 1.8],
      [[100, 96], [118, 70], [k(128), 46], 5, 1.8],
      [[100, 96], [101, 60], [100, 24], 6, 1.6],
    ],
    extras: () => [H.fruit(c.S, masses)],
    glow: [100, 56, 70],
    perch: [100, 60],
    rootD: c.inPot ? null : 'M92 168Q82 171 74 173M108 168Q118 171 126 173',
  });
}
/** Pebbles in a pot mouth (Moot in a planter). */
function pebbles(c: FormCtx): { back: Kids; front: Kids } {
  const s = Math.min(c.span, 30);
  return {
    back: [],
    front: [
      stones(c.S, 'stones-front', [
        [100 - s * 0.8, 170.5, 3],
        [100 - s * 0.45, 171.5, 2.6],
        [100 + s * 0.45, 171.5, 2.6],
        [100 + s * 0.8, 170.5, 3],
        [100 + s * 0.05, 172, 2.4],
      ]),
    ],
  };
}
/** Moot (governance): level limbs make a roof; tabled tiers; a ring of meeting stones. */
function moot(c: FormCtx, H: Habit, pal: Pal): FormOut {
  const k = (x: number) => 100 + (x - 100) * Math.min(1, H.aspect ?? 1);
  const masses = [
    M(100, 66, 44, 11, 3, { flat: 0.55, n: 12 }),
    M(k(58), 88, 30, 10, 2, { flat: 0.55 }),
    M(k(142), 88, 30, 10, 4, { flat: 0.55 }),
    M(100, 86, 30, 11, 3, { flat: 0.55 }),
    M(k(26), 110, 22, 9, 1, { flat: 0.55 }),
    M(k(174), 110, 22, 9, 5, { flat: 0.55 }),
  ];
  masses.sort((a, b) => a.dom - b.dom);
  const one = (d: number) => masses.find((m) => m.dom === d)!;
  const order = [one(1), one(5), one(2), one(4), ...masses.filter((m) => m.dom === 3)];
  const st = c.inPot
    ? pebbles(c)
    : {
        back: [stones(c.S, 'stones', [[54, 167, 7], [146, 167, 7]])],
        front: [stones(c.S, 'stones-front', [[72, 175, 6], [128, 175, 6], [100, 179, 5]])],
      };
  return tree(c, {
    ...base(H),
    pal,
    seed: 51,
    masses: order,
    trunk: [[100, 171], [100, 150], [100, 126], 24, 17, { furrows: 6, extra: H.bands ? bands : null }],
    limbs: [
      [[100, 134], [62, 130], [k(22), 116], 8, 2.2],
      [[100, 134], [138, 130], [k(178), 116], 8, 2.2],
      [[100, 130], [76, 112], [k(52), 94], 7, 2],
      [[100, 130], [124, 112], [k(148), 94], 7, 2],
      [[100, 128], [100, 104], [100, 70], 7, 2],
    ],
    extras: () => [H.fruit(c.S, masses.slice(0, 4))],
    back: st.back,
    front: st.front,
    glow: [100, 92, 80],
    perch: [k(52), 80],
  });
}
/** Espalier (building to a design): limbs trained level along wires on a frame. */
function espalier(c: FormCtx, H: Habit, pal: Pal): FormOut {
  const { S } = c;
  const w = c.inPot ? Math.min(74, c.span + 34) : c.keeps ? 62 : 74;
  const X = (u: number) => 100 + u * w;
  const rows = [130, 98, 66];
  const ls: Limb[] = [];
  rows.forEach((y, i) => {
    const reach = 0.94 - i * 0.12;
    for (const s of [-1, 1]) ls.push([[100, y + 5], [100 + s * 10, y], [X(s * reach), y], 6 - i, 2]);
  });
  const masses = [
    M(X(-0.52), 124, w * 0.36, 7, 1, { flat: 0.6, n: 10 }),
    M(X(-0.46), 92, w * 0.32, 7, 2, { flat: 0.6, n: 10 }),
    M(100, 56, w * 0.46, 10, 3, { flat: 0.6, n: 12 }),
    M(X(0.46), 92, w * 0.32, 7, 4, { flat: 0.6, n: 10 }),
    M(X(0.52), 124, w * 0.36, 7, 5, { flat: 0.6, n: 10 }),
  ];
  const post = A0.planter.post;
  const px0 = X(-1);
  const px1 = X(1);
  const frameD = `M${f(px0)} 171L${f(px0)} 52M${f(px1)} 171L${f(px1)} 52`;
  const wires = rows.map((y) => `M${f(px0)} ${y}L${f(px1)} ${y}`).join('') + `M${f(px0)} 58L${f(px1)} 58`;
  const ties = S.icon ? '' : rows.flatMap((y) => [-0.94, -0.5, 0.5, 0.94].map((u) => `M${f(X(u) - 1.4)} ${y - 1.6}L${f(X(u) + 1.4)} ${y + 1.6}`)).join('');
  const posts = frameD.replace(/M(\S+) 171L\S+ 52/g, (_m, x: string) => `M${f(+x - 1.6)} 171L${f(+x - 1.4)} 52L${f(+x + 1.4)} 52L${f(+x + 1.6)} 171Z`);
  return tree(c, {
    ...base(H),
    pal,
    seed: 61,
    masses,
    trunk: [[100, 171], [100, 110], [100, 52], 12, 5, { furrows: 3, extra: H.bands ? bands : null }],
    limbs: ls,
    extras: () => [H.fruit(S, masses.slice(0, 2).concat(masses.slice(3))), ties ? G('ties', [L(ties, S.wood(post), S.hair * 1.6)]) : null],
    back: [G('frame', [P(posts, S.woodFill(post)), L(frameD, S.wood(post), S.main), S.icon ? null : L(wires, S.wood(post), S.hair * 1.4, { opacity: 0.85 })])],
    glow: [100, 96, 82],
    perch: [X(-0.9), 124],
  });
}
/** Coppice (steady running and recovery): several stems from one stool, regrowing. */
function coppice(c: FormCtx, H: Habit, pal: Pal): FormOut {
  const { S } = c;
  const k = (x: number) => ax(H, x);
  const masses = [M(k(56), 88, 19, 15, 1), M(k(72), 70, 18, 15, 2), M(100, 42, 22, 17, 3), M(k(128), 70, 18, 15, 4), M(k(144), 88, 19, 15, 5)];
  const stool = 'M80 171C80 160 86 152 100 152C114 152 120 160 120 171Z';
  const shoots = leafSet();
  for (const [x0, x1, y1, s] of [
    [86, 74, 140, -1],
    [114, 128, 142, 1],
  ]) {
    shoots.add(leaf(H.kind === 'maple' || H.kind === 'oak' ? H.kind : 'lens', x1, y1, 9, (-90 + s * 40) * D2R, S));
    shoots.add(leaf('lens', (x0 + x1) / 2, 152, 7, (-90 - s * 30) * D2R, S));
  }
  const g = green(pal);
  return tree(c, {
    ...base(H),
    pal,
    seed: 71,
    masses,
    trunk: [[100, 171], [100, 162], [100, 152], 40, 26, { furrows: 0 }],
    limbs: [
      [[92, 156], [80, 120], [k(64), 82], 10, 4],
      [[100, 154], [98, 100], [100, 46], 11, 4],
      [[108, 156], [120, 120], [k(136), 82], 10, 4],
      [[k(64), 84], [k(68), 78], [k(72), 70], 4, 2],
      [[k(136), 84], [k(132), 78], [k(128), 70], 4, 2],
    ],
    afterTrunk: [
      G('stool', [P(stool, S.woodFill(H.bark)), S.full ? L('M88 158Q100 154 112 158M84 165Q100 160 116 165', S.wood(H.bark), S.hair * 1.4, { opacity: 0.7 }) : null, L(stool.replace('Z', ''), S.wood(H.bark), S.main)]),
      S.icon ? null : G('shoots', [L('M86 160Q82 150 74 140M114 160Q120 152 128 142', S.lineOf(g), S.fine * 1.4), P(shoots.wash(), S.washOf(g), { opacity: S.washOp }), L(shoots.line(), S.lineOf(g), S.fine * 1.4)]),
    ],
    extras: () => [H.fruit(S, masses)],
    glow: [100, 76, 78],
    perch: [k(52), 72],
  });
}
/** Holdfast (protection): roots grip a stone; a short, thick trunk; a dense, closed dome. */
function holdfast(c: FormCtx, H: Habit, pal: Pal): FormOut {
  const { S } = c;
  const sc = c.inPot ? Math.min(1, (c.span + 8) / 44) : 1;
  const X = (x: number) => 100 + (x - 100) * sc;
  const top = 170 - 32 * sc;
  const rock = `M${f(X(58))} 171C${f(X(54))} ${f(170 - 14 * sc)} ${f(X(62))} ${f(170 - 26 * sc)} ${f(X(76))} ${f(170 - 30 * sc)}C${f(X(86))} ${f(top - 3)} ${f(X(96))} ${f(top + 1)} ${f(X(104))} ${f(top - 1)}C${f(X(120))} ${f(top - 3)} ${f(X(138))} ${f(170 - 24 * sc)} ${f(X(142))} ${f(170 - 10 * sc)}C${f(X(143))} 167 ${f(X(142))} 169 ${f(X(141))} 171Z`;
  const masses = [
    M(72, 72, 26, 20, 1, { dense: true }),
    M(128, 72, 26, 20, 5, { dense: true }),
    M(82, 50, 24, 20, 2, { dense: true }),
    M(118, 50, 24, 20, 4, { dense: true }),
    M(100, 40, 28, 22, 3, { dense: true }),
    M(100, 66, 28, 20, 3, { dense: true }),
  ];
  return tree(c, {
    ...base(H),
    pal,
    seed: 81,
    masses,
    dense: true,
    roots: [
      [[94, top + 2], [X(68), top + 6], [X(62), 171], 7, 2.4],
      [[97, top + 4], [X(86), top + 18], [X(86), 171], 6, 2.4],
      [[103, top + 4], [X(116), top + 18], [X(116), 171], 6, 2.4],
      [[106, top + 2], [X(134), top + 6], [X(140), 171], 7, 2.4],
    ],
    trunk: [[100, top + 4], [99, top - 20], [98, 92], 24, 15, { furrows: 6, extra: H.bands ? bands : null }],
    limbs: [
      [[99, 100], [84, 86], [72, 72], 6, 2],
      [[99, 98], [114, 86], [128, 72], 6, 2],
      [[98, 96], [98, 72], [100, 46], 6, 2],
    ],
    extras: () => [H.fruit(S, masses.slice(0, 2))],
    back: [boulder(S, rock, 100, 170 - 16 * sc, 42 * sc, 16 * sc)],
    glow: [100, 66, 74],
    perch: [74, 52],
  });
}
export type Recipe = (c: FormCtx, H: Habit, pal: Pal) => FormOut;
export const RECIPES: Record<FlavourId, Recipe> = { lookout, moot, espalier, coppice, holdfast };
/** The five flavours for one habit, drawn in the plant's own colourway. */
export const flavoursFor = (H: Habit): Record<FlavourId, FormBuilder> => ({
  lookout: (c) => lookout(c, H, c.S.pal),
  moot: (c) => moot(c, H, c.S.pal),
  espalier: (c) => espalier(c, H, c.S.pal),
  coppice: (c) => coppice(c, H, c.S.pal),
  holdfast: (c) => holdfast(c, H, c.S.pal),
});

// ── young forms (I and II) ──────────────────────────────────────────────
interface Young1 {
  seedColor: string;
  seedD: string;
  seedLine?: string;
  root: string;
  stem: string;
  /** [kind, x, y, len, angle°, x squash] */
  leaves: [LeafKind, number, number, number, number, number?][];
  seed?: number;
  extra?: Kids;
}
/** Form I: a seed in the soil's cutaway, a root, a stem and the first leaves (the `sprout` onboarding lifts). */
export function young1(c: FormCtx, o: Young1): FormOut {
  const { S } = c;
  const lp = green(S.pal);
  const set = leafSet();
  for (const [kind, x, y, len, a, sx] of o.leaves) set.add(leaf(kind, x, y, len, a * D2R, S, sx || 1));
  return {
    cutaway: cutaway(S, 64, 136, 171, 190, o.seed || 5),
    body: [
      G('roots', [L(o.root, S.wood(o.seedColor), S.fine * 1.5)]),
      seedPart(S, o.seedD, o.seedColor, o.seedLine),
      ...(o.extra || []),
      G('sprout', [L(o.stem, S.lineOf(lp), S.main), P(set.wash(), S.washOf(lp), { opacity: S.washOp }), L(set.line(), S.lineOf(lp), S.main)]),
    ],
    perch: [74, 170],
  };
}

// ── OAK ─────────────────────────────────────────────────────────────────
const oak: FormLine['forms'] = {
  // Acorn-cup Oak
  I: (c) =>
    young1(c, {
      seedColor: A0.gift.acorn,
      seedD: 'M86 163C86 156 92 152 97 152C103 152 107 157 106 163C105 169 100 172 96 172C90 172 86 169 86 163Z M84 160C84 151 104 149 107 158C100 162 90 163 84 160Z',
      seedLine: hatchE(95.5, 156.5, 10.5, 4.4, 151, 162, 1.6, 35, true) + hatchE(95.5, 156.5, 10.5, 4.4, 151, 162, 1.6, -35, true),
      root: 'M97 168Q95 178 99 189M96 176l-5 3M97 182l5 3M98 186l-4 3',
      stem: 'M98 154Q96 140 101 122',
      leaves: [
        ['oak', 101, 122, 16, -150],
        ['oak', 101, 122, 16, -30],
        ['lens', 101, 122, 6, -88],
      ],
    }),
  // Whip Oak: one straight leader, lobed leaves at each node
  II: (c) => {
    const { S } = c;
    const set = leafSet();
    const lp = green(S.pal);
    let tw = '';
    for (const [x, y, s] of [
      [100, 146, -1],
      [101, 128, 1],
      [99, 110, -1],
      [101, 94, 1],
    ]) {
      tw += `M${x} ${y}l${s * 8} -5`;
      set.add(leaf('oak', x + s * 8, y - 5, 20, (s > 0 ? -28 : -152) * D2R, S)).add(leaf('oak', x + s * 8, y - 5, 14, (s > 0 ? 18 : 162) * D2R, S));
    }
    for (const a of [-60, -120, -90]) set.add(leaf('oak', 100, 70, a === -90 ? 14 : 18, a * D2R, S));
    return {
      body: [
        G('stem', [L('M100 171L100 146L101 128L99 110L101 94L100 70', S.wood(A0.bark.oak), S.main * 1.5), L(tw, S.wood(A0.bark.oak), S.fine * 1.4)]),
        leavesNode(S, 'leaves', set, lp),
        S.icon ? null : G('bud', [P(oval(100, 66, 1.8, 2.6), S.woodFill(A0.bark.oak)), L(oval(100, 66, 1.8, 2.6), S.wood(A0.bark.oak), S.fine)]),
      ],
      perch: [80, 150],
    };
  },
  // Standard Oak: a clear stem, an upright oval crown, the first acorns
  III: (c) =>
    tree(c, {
      ...base(HABIT.oak),
      pal: c.S.pal,
      seed: 51,
      masses: [M(100, 56, 26, 22, 3), M(78, 80, 23, 19, 1), M(122, 80, 23, 19, 5), M(86, 102, 20, 13, 2), M(114, 102, 20, 13, 4)],
      trunk: [[100, 171], [100, 140], [100, 108], 10, 6],
      limbs: [
        [[100, 116], [88, 104], [80, 88], 4, 1.4],
        [[100, 112], [104, 96], [100, 70], 4, 1.4],
        [[100, 116], [114, 104], [122, 88], 4, 1.4],
      ],
      extras: () => [
        acorns(c.S, [
          [84, 106],
          [118, 102],
          [104, 84],
        ]),
      ],
      perch: [76, 62],
    }),
  // Broadcrown Oak: a short massive trunk, a burl, low sinuous limbs, a broad open dome
  IV: (c) => {
    const { S } = c;
    const masses = [M(32, 92, 24, 15, 1), M(168, 92, 24, 15, 5), M(58, 66, 26, 19, 2), M(142, 66, 26, 19, 4), M(100, 50, 31, 21, 3)];
    return tree(c, {
      ...base(HABIT.oak),
      pal: S.pal,
      seed: 61,
      masses,
      rootD: c.inPot ? null : 'M86 167Q70 170 52 172M88 168Q80 172 70 176M114 167Q130 170 150 172M112 168Q122 172 132 176',
      limbs: [
        [[100, 124], [62, 120], [30, 98], 8, 2.4],
        [[100, 120], [76, 98], [56, 70], 8, 2.4],
        [[100, 118], [96, 88], [100, 54], 9, 2.4],
        [[100, 120], [124, 98], [144, 70], 8, 2.4],
        [[100, 124], [138, 120], [170, 98], 8, 2.4],
      ],
      trunk: [[100, 171], [100, 144], [100, 118], 28, 18, { furrows: 7, seed: 8 }],
      afterTrunk: S.icon ? [] : [G('burl', [L(oval(108, 146, 4.5, 3.4) + oval(108, 146, 2.2, 1.6), S.wood(A0.bark.oak), S.fine)])],
      extras: () => [
        acorns(S, [
          [42, 104],
          [66, 84],
          [92, 66],
          [112, 64],
          [136, 84],
          [160, 104],
          [78, 74],
          [124, 74],
        ]),
      ],
      drift: drift(
        S,
        [
          [180, 126, 9, 60],
          [174, 148, 8, 120],
        ],
        S.pal,
        'oak',
      ),
      glow: [100, 74, 88],
      perch: [52, 52],
    });
  },
};

// ── MAPLE ───────────────────────────────────────────────────────────────
const WING = 'M0 0C1.5 1 4.5 1.8 7 1.2C6 3.4 2.6 3.8 0.6 2.4Z';
const maple: FormLine['forms'] = {
  // Samara Maple: the paired winged seed, two strap seed-leaves
  I: (c) =>
    young1(c, {
      seedColor: A0.gift.samara,
      seedD: xf(WING, 92, 168, -0.25, 3.2) + ' ' + xf(WING, 92, 168, Math.PI + 0.35, 3.2, -1),
      seedLine: 'M84 160L98 165M80 172L92 169',
      root: 'M96 168Q95 178 99 188M97 178l-4 3M98 183l4 2',
      stem: 'M96 165Q96 146 100 128',
      leaves: [
        ['narrow', 100, 128, 18, -150],
        ['narrow', 100, 128, 18, -30],
        ['maple', 100, 127, 12, -90],
      ],
      seed: 6,
    }),
  // Forked Maple: opposite leaf pairs, then an opposite fork
  II: (c) => {
    const { S } = c;
    const set = leafSet();
    const b = A0.bark.maple;
    let tw = '';
    for (const y of [146, 122])
      for (const s of [-1, 1]) {
        tw += `M100 ${y}l${s * 7} -4`;
        set.add(leaf('maple', 100 + s * 7, y - 4, 15, (s > 0 ? -30 : -150) * D2R, S));
      }
    for (const [x, y, s] of [
      [82, 64, -1],
      [118, 64, 1],
    ])
      for (const a of [-60, -120]) set.add(leaf('maple', x, y, 14, (a + s * 12) * D2R, S));
    set.add(leaf('maple', 92, 84, 12, -150 * D2R, S)).add(leaf('maple', 108, 84, 12, -30 * D2R, S));
    return {
      body: [G('stem', [L('M100 171L100 96M100 98Q92 86 82 64M100 98Q108 86 118 64', S.wood(b), S.main * 1.5), L(tw + 'M95 88l-3 -4M105 88l3 -4', S.wood(b), S.fine * 1.4)]), leavesNode(S, 'leaves', set, S.pal)],
      perch: [80, 150],
    };
  },
  // Flame Maple: a tall, pointed flame of a crown
  III: (c) =>
    tree(c, {
      ...base(HABIT.maple),
      pal: c.S.pal,
      seed: 52,
      masses: [M(100, 38, 17, 26, 3), M(84, 64, 20, 21, 2), M(116, 64, 20, 21, 4), M(82, 94, 22, 18, 1), M(118, 94, 22, 18, 5)],
      trunk: [[100, 171], [100, 142], [100, 112], 9, 5],
      limbs: [
        [[100, 118], [90, 106], [82, 94], 4, 1.4],
        [[100, 114], [110, 102], [118, 92], 4, 1.4],
        [[100, 112], [98, 84], [86, 64], 3.6, 1.3],
        [[100, 110], [102, 84], [114, 64], 3.6, 1.3],
        [[100, 108], [101, 70], [100, 40], 3.6, 1.3],
      ],
      extras: () => [
        samaras(c.S, [
          [86, 110],
          [114, 108],
          [94, 80],
        ]),
      ],
      perch: [80, 76],
    }),
  // Vaulted Maple: a tall open vase of limbs under a broad vault; samaras hanging
  IV: (c) => {
    const { S } = c;
    const masses = [M(38, 90, 26, 15, 1, { flat: 0.7 }), M(162, 90, 26, 15, 5, { flat: 0.7 }), M(64, 60, 30, 19, 2, { flat: 0.75 }), M(136, 60, 30, 19, 4, { flat: 0.75 }), M(100, 44, 32, 21, 3, { flat: 0.8 })];
    return tree(c, {
      ...base(HABIT.maple),
      pal: S.pal,
      seed: 62,
      masses,
      rootD: c.inPot ? null : 'M90 168Q80 171 70 172M110 168Q120 171 130 172',
      trunk: [[100, 171], [100, 152], [100, 132], 20, 14, { furrows: 5 }],
      limbs: [
        [[98, 138], [70, 116], [44, 90], 8, 2.4],
        [[99, 134], [80, 96], [68, 62], 8, 2.4],
        [[101, 134], [120, 96], [132, 62], 8, 2.4],
        [[102, 138], [130, 116], [156, 90], 8, 2.4],
        [[100, 134], [101, 92], [100, 48], 7, 2.2],
      ],
      extras: () => [
        samaras(S, [
          [28, 102],
          [46, 104],
          [58, 76],
          [76, 74],
          [124, 74],
          [142, 76],
          [154, 104],
          [172, 102],
        ]),
      ],
      drift: drift(
        S,
        [
          [178, 128, 10, 40],
          [24, 140, 9, 150],
        ],
        S.pal,
        'maple',
      ),
      glow: [100, 72, 86],
      perch: [56, 44],
    });
  },
};

// ── NARRA ───────────────────────────────────────────────────────────────
/** A pinnate (compound) leaf, added to a leaf set; returns the rachis line. */
export function pinnate(S: Paints, set: LeafSet, x: number, y: number, deg: number, len: number, n: number, ll: number, droop = 0.25): string {
  const a = deg * D2R;
  const p0: V2 = [x, y];
  const p1: V2 = [x + Math.cos(a) * len, y + Math.sin(a) * len + len * droop * 0.6];
  const pc: V2 = [x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.55 - len * 0.12];
  for (let i = 1; i <= n; i++) {
    const t = 0.18 + (i / n) * 0.78;
    const p = qp(p0, pc, p1, t);
    const ta = qa(p0, pc, p1, t);
    set.add(leaf('ovate', p[0], p[1], ll * (0.8 + 0.2 * Math.sin(Math.PI * t)), ta + (i % 2 ? -1 : 1) * 0.9, S, 0.8));
  }
  set.add(leaf('ovate', p1[0], p1[1], ll * 0.9, qa(p0, pc, p1, 1), S, 0.8));
  return Q(p0, pc, p1);
}
const narra: FormLine['forms'] = {
  // Coin Narra: the round winged pod, half settled; the first shoot and root
  I: (c) => {
    const { S } = c;
    const set = leafSet();
    const lp = green(S.pal);
    let veins = '';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      veins += `M${f(97 + Math.cos(a) * 6)} ${f(160 + Math.sin(a) * 5)}L${f(97 + Math.cos(a) * 14)} ${f(160 + Math.sin(a) * 10)}`;
    }
    set.add(leaf('ovate', 101, 126, 13, -160 * D2R, S)).add(leaf('ovate', 101, 126, 13, -20 * D2R, S));
    const rach = pinnate(S, set, 101, 126, -80, 14, 3, 6, 0.1);
    return {
      cutaway: cutaway(S, 64, 136, 171, 188, 7),
      body: [
        G('roots', [L('M98 168Q97 176 100 184M99 177l-4 4M100 181l4 3', S.wood(A0.bark.narra), S.fine * 1.5)]),
        seedPart(S, 'M80 166C78 152 92 144 104 148C116 152 116 166 106 171C96 175 82 174 80 166Z ' + oval(97, 160, 6, 4.6), A0.seedLight, veins),
        G('sprout', [L('M99 156Q94 140 101 126' + rach, S.lineOf(lp), S.main), P(set.wash(), S.washOf(lp), { opacity: S.washOp }), L(set.line(), S.lineOf(lp), S.main)]),
      ],
      perch: [70, 170],
    };
  },
  // Featherleaf Narra: an arching wand of compound leaves; the husk stays by it
  II: (c) => {
    const { S } = c;
    const set = leafSet();
    const p0: V2 = [100, 171];
    const cc: V2 = [93, 112];
    const p1: V2 = [106, 62];
    let r = '';
    for (const [t, a] of [
      [0.3, 200],
      [0.44, -22],
      [0.58, 196],
      [0.72, -28],
      [0.86, 206],
    ]) {
      const p = qp(p0, cc, p1, t);
      r += pinnate(S, set, p[0], p[1], a, 28 + (1 - t) * 14, S.icon ? 2 : 5, 7.5, 0.3);
    }
    r += pinnate(S, set, 120, 50, -10, 18, 3, 6.5, 0.4);
    const husk = 'M76 171C74 163 81 159 88 161C94 163 93 170 89 171Z';
    return {
      body: [
        G('husk', [P(husk, S.woodFill(A0.seedLight)), L(husk, S.wood(A0.seedLight), S.fine * 1.3)]),
        G('stem', [L('M100 171Q93 112 106 62Q110 52 120 50', S.wood(A0.bark.narra), S.main * 1.5)]),
        leavesNode(S, 'leaves', set, S.pal, [L(r, S.lineOf(S.pal), S.fine * 1.2)]),
      ],
      perch: [66, 104],
    };
  },
  // Parasol Narra: a flat, spreading umbrella on a clean stem; the first gold sprays
  III: (c) =>
    tree(c, {
      ...base(HABIT.narra),
      pal: c.S.pal,
      seed: 21,
      masses: [M(44, 86, 26, 13, 1), M(156, 86, 26, 13, 5), M(72, 74, 27, 15, 2), M(128, 74, 27, 15, 4), M(100, 68, 28, 16, 3)],
      trunk: [[100, 171], [100, 142], [100, 112], 11, 6.5],
      limbs: [
        [[100, 116], [70, 104], [42, 90], 5, 1.6],
        [[100, 116], [82, 96], [68, 80], 5, 1.6],
        [[100, 116], [100, 96], [100, 72], 5, 1.6],
        [[100, 116], [118, 96], [132, 80], 5, 1.6],
        [[100, 116], [130, 104], [158, 90], 5, 1.6],
      ],
      extras: () => [
        goldSprays(c.S, [
          [86, 58],
          [112, 56],
          [140, 64],
        ]),
      ],
      perch: [40, 72],
    }),
  // Gold-rain Narra: plank buttresses, a vast weeping umbrella, golden showers, hanging coins
  IV: (c) => {
    const { S } = c;
    const R = rng(44);
    const set = leafSet();
    let fr = '';
    if (!S.icon) {
      const n = S.small ? 7 : 13;
      for (let i = 0; i < n; i++) {
        const x = 22 + i * (156 / (n - 1));
        const y = 95 + Math.sin((i / (n - 1)) * Math.PI) * 4;
        const l = 10 + R() * 8;
        fr += `M${f(x)} ${f(y)}Q${f(x + 2)} ${f(y + l * 0.6)} ${f(x - 1)} ${f(y + l)}`;
        set.add(leaf('ovate', x - 1, y + l, 6, 95 * D2R, S, 0.8));
      }
    }
    const bt = c.inPot ? [] : ['M92 140C88 156 76 166 60 171L92 171Z', 'M96 146C95 158 88 166 80 171L96 171Z', 'M108 140C112 156 124 166 142 171L108 171Z', 'M104 148C106 160 112 166 120 171L104 171Z'];
    const masses = [M(30, 84, 26, 13, 1), M(170, 84, 26, 13, 5), M(58, 68, 30, 17, 2), M(142, 68, 30, 17, 4), M(100, 60, 32, 18, 3)];
    let coins = '';
    if (!S.icon)
      for (const [x, y] of [
        [58, 108],
        [140, 104],
        [152, 113],
      ])
        coins += disc(x, y, 3.4);
    const specks: V2[] = [
      [30, 130],
      [44, 150],
      [150, 136],
      [168, 154],
      [132, 158],
    ];
    const speckD = specks.map(([x, y]) => oval(x, y, 1.6, 1)).join(' ');
    return tree(c, {
      ...base(HABIT.narra),
      pal: S.pal,
      seed: 31,
      masses,
      limbs: [
        [[100, 112], [64, 104], [26, 88], 6.5, 2],
        [[100, 112], [76, 88], [54, 68], 7, 2],
        [[100, 112], [92, 86], [86, 58], 7, 2],
        [[100, 112], [108, 86], [116, 58], 7, 2],
        [[100, 112], [124, 88], [146, 68], 7, 2],
        [[100, 112], [136, 104], [174, 88], 6.5, 2],
      ],
      trunk: [[100, 171], [100, 140], [100, 108], 22, 12, { furrows: 6 }],
      afterTrunk: bt.length
        ? [G('buttress', [P(bt.join(' '), S.woodFill(A0.bark.narra)), S.icon ? null : L(hatchE(100, 166, 44, 10, 156, 171, 2, 30), S.wood(A0.bark.narra), S.hair, { opacity: 0.45 }), L(bt.join(' '), S.wood(A0.bark.narra), S.main)])]
        : [],
      extras: () => [
        fr ? G('fringe', [L(fr, S.lineOf(S.pal), S.fine * 1.1), P(set.wash(), S.washOf(S.pal), { opacity: S.washOp }), L(set.line(), S.lineOf(S.pal), S.fine * 1.1)]) : null,
        coins ? G('fruit', [L('M58 101V105M140 97V101M152 106V110', S.wood(A0.bark.narra), S.hair * 1.4), P(coins, S.woodFill(A0.seedLight)), L(coins, S.wood(A0.seedLight), S.fine)]) : null,
        goldSprays(
          S,
          [
            [44, 72],
            [66, 54],
            [88, 46],
            [112, 44],
            [134, 54],
            [158, 70],
            [80, 64],
            [122, 62],
            [26, 80],
            [176, 80],
            [100, 52],
          ],
          1.15,
        ),
      ],
      drift: S.full ? [P(speckD, S.goldWash, { opacity: 0.85 }), L(speckD, S.gold, S.hair)] : [],
      glow: [100, 74, 86],
      perch: [36, 70],
    });
  },
};

// ── CHERRY BLOSSOM ──────────────────────────────────────────────────────
const cherry: FormLine['forms'] = {
  // Cherry Stone: the round stone with its seam; the first serrated leaves
  I: (c) =>
    young1(c, {
      seedColor: A0.seedLight,
      seedD: oval(96, 163, 8.5, 7.4),
      seedLine: 'M88 162Q96 158 104 164',
      root: 'M98 170Q97 178 100 188M98 178l-4 3M99 183l4 2',
      stem: 'M98 156Q96 142 101 126',
      leaves: [
        ['ovate', 101, 126, 15, -155, 0.75],
        ['ovate', 101, 126, 15, -25, 0.75],
        ['ovate', 101, 126, 7, -90, 0.7],
      ],
      seed: 8,
    }),
  // Banded Cherry: a slim banded stem, alternate leaves, the first buds
  II: (c) => {
    const { S } = c;
    const set = leafSet();
    const lp = green(S.pal);
    const b = A0.bark.cherry;
    let bandD = '';
    for (let y = 160; y > 80; y -= 9) bandD += `M98.6 ${y}h2.8`;
    for (const [x, y, s] of [
      [100, 142, -1],
      [101, 124, 1],
      [100, 106, -1],
      [101, 90, 1],
      [101, 76, -1],
    ])
      set.add(leaf('ovate', x, y, 15, (-90 + s * 55) * D2R, S, 0.7));
    let bd = '';
    for (const [x, y] of [
      [104, 66],
      [96, 70],
      [101, 60],
      [108, 86],
    ])
      bd += oval(x, y, 2.2, 3);
    return {
      body: [
        G('stem', [L('M100 171L100 142L101 124L100 106L101 90L101 70', S.wood(b), S.main * 1.6), S.icon ? null : L(bandD, S.wood(b), S.hair * 1.6)]),
        leavesNode(S, 'leaves', set, lp),
        S.icon ? null : G('blooms', [L('M101 74L104 66M101 74L96 70M101 70L101 60M101 92L108 86', S.wood(b), S.hair * 1.4), P(bd, S.washOf(S.pal), { opacity: 0.9 }), L(bd, S.lineOf(S.pal), S.fine * 1.2)]),
      ],
      perch: [80, 150],
    };
  },
  // Spreading Cherry: wide, low-arched clouds of bud and blossom
  III: (c) =>
    tree(c, {
      ...base(HABIT['cherry-blossom']),
      pal: c.S.pal,
      seed: 23,
      masses: [M(46, 96, 26, 14, 1), M(154, 96, 26, 14, 5), M(70, 78, 28, 17, 2), M(130, 78, 28, 17, 4), M(100, 70, 28, 17, 3)],
      trunk: [[100, 171], [100, 144], [98, 118], 11, 7, { extra: bands }],
      limbs: [
        [[98, 122], [70, 114], [46, 100], 5, 1.6],
        [[98, 120], [80, 98], [70, 82], 5, 1.6],
        [[98, 120], [98, 96], [100, 74], 5, 1.6],
        [[99, 120], [118, 98], [130, 82], 5, 1.6],
        [[99, 122], [130, 114], [154, 100], 5, 1.6],
      ],
      perch: [44, 80],
    }),
  // Cascade Cherry: limbs rise, then fall in long curtains of blossom
  IV: (c) => {
    const { S } = c;
    const masses = [M(34, 92, 17, 12, 1), M(166, 92, 17, 12, 5), M(62, 70, 21, 15, 2), M(138, 70, 21, 15, 4), M(100, 54, 30, 20, 3)];
    let strands = '';
    const tips: V2[] = [];
    const R = rng(12);
    if (!S.icon)
      for (const [x0, y0, len] of [
        [22, 98, 50],
        [32, 102, 62],
        [44, 100, 54],
        [52, 80, 70],
        [64, 82, 64],
        [74, 78, 56],
        [86, 70, 48],
        [114, 70, 48],
        [126, 78, 56],
        [136, 82, 64],
        [148, 80, 70],
        [156, 100, 54],
        [168, 102, 62],
        [178, 98, 50],
      ]) {
        const x1 = x0 + (x0 < 100 ? -2 : 2);
        const y1 = Math.min(160, y0 + len);
        strands += `M${x0} ${y0}Q${f(x0 + (x0 < 100 ? 1 : -1))} ${f((y0 + y1) / 2)} ${x1} ${y1}`;
        for (let t = 0.3; t <= 1.01; t += S.small ? 0.35 : 0.22) tips.push([x0 + (x1 - x0) * t + (R() - 0.5) * 2, y0 + (y1 - y0) * t]);
      }
    return tree(c, {
      ...base(HABIT['cherry-blossom']),
      pal: S.pal,
      seed: 33,
      masses,
      rootD: c.inPot ? null : 'M90 168Q82 171 72 172M110 168Q118 171 128 172',
      limbs: [
        [[100, 112], [64, 60], [32, 92], 7, 2],
        [[100, 110], [80, 46], [60, 72], 7, 2],
        [[100, 108], [100, 70], [100, 50], 7, 2],
        [[100, 110], [120, 46], [140, 72], 7, 2],
        [[100, 112], [136, 60], [168, 92], 7, 2],
      ],
      trunk: [[100, 171], [100, 140], [100, 108], 20, 12, { extra: bands, furrows: 0 }],
      extras: () => [strands ? G('fringe', [L(strands, S.wood(A0.bark.cherry), S.hair * 1.5)]) : null, blossoms(S, tips, 2.4, S.pal)],
      drift: drift(
        S,
        [
          [16, 164, 9, 20],
          [184, 164, 9, 50],
          [150, 166, 8, 10],
        ],
        S.pal,
        'blossom',
      ),
      glow: [100, 84, 84],
      perch: [100, 32],
    });
  },
};

// ── MANGO ───────────────────────────────────────────────────────────────
const mango: FormLine['forms'] = {
  // Kernel Mango: the flat, fibred stone; a first flush of leaves
  I: (c) =>
    young1(c, {
      seedColor: A0.seedLight,
      seedD: 'M82 166C80 158 88 154 96 155C106 156 110 162 106 168C102 173 86 173 82 166Z',
      seedLine: 'M86 158l3 12M90 156l3 15M95 155l2 16M100 156l1 15M104 158l0 11',
      root: 'M96 170Q95 178 98 188M96 178l-4 3M97 183l4 2',
      stem: 'M97 156Q97 140 100 124',
      leaves: [
        ['long', 100, 124, 22, -140],
        ['long', 100, 124, 22, -40],
        ['long', 100, 124, 18, -90],
      ],
      seed: 9,
    }),
  // Whorl Mango: leaves gather in whorls at each flush; the new flush is bronze
  II: (c) => {
    const { S } = c;
    const old = leafSet();
    const flush = leafSet();
    for (let i = 0; i < 7; i++) old.add(leaf('long', 100, 112, 26, (-180 + i * 30) * D2R + 0.08, S));
    for (let i = 0; i < 5; i++) flush.add(leaf('long', 100, 64, 22, (55 + i * 17.5) * D2R, S));
    flush.add(leaf('long', 100, 64, 12, -90 * D2R, S));
    // The new flush is bronze whatever the colourway (botanical fact).
    return { body: [G('stem', [L('M100 171L100 66', S.wood(A0.bark.mango), S.main * 1.6)]), leavesNode(S, 'leaves', old, S.pal), leavesNode(S, 'flush', flush, 'ember')], perch: [72, 112] };
  },
  // Tassel Mango: a rounded crown, its flower tassels standing up like candles
  III: (c) => {
    const { S } = c;
    const masses = [M(68, 98, 24, 18, 1), M(132, 98, 24, 18, 5), M(80, 74, 24, 20, 2), M(120, 74, 24, 20, 4), M(100, 64, 26, 20, 3)];
    let tas = '';
    let dots = '';
    for (const [x, y, h] of [
      [76, 58, 18],
      [96, 46, 22],
      [118, 52, 20],
      [138, 74, 16],
      [60, 80, 15],
    ]) {
      tas += `M${x - 4} ${y}L${x} ${y - h}L${x + 4} ${y}Z`;
      if (S.full) for (let i = 0; i < 4; i++) dots += `M${f(x - 2 + (i % 2) * 4)} ${f(y - 3 - i * h * 0.2)}h0.01`;
    }
    return tree(c, {
      ...base(HABIT.mango),
      pal: S.pal,
      seed: 24,
      masses,
      trunk: [[100, 171], [100, 146], [100, 118], 12, 7],
      limbs: [
        [[100, 122], [82, 112], [70, 100], 5, 1.6],
        [[100, 120], [86, 96], [80, 76], 5, 1.6],
        [[100, 118], [100, 92], [100, 66], 5, 1.6],
        [[100, 120], [114, 96], [120, 76], 5, 1.6],
        [[100, 122], [118, 112], [130, 100], 5, 1.6],
      ],
      extras: () => [G('blooms', [P(tas, S.goldWash, { opacity: 0.7 }), L(tas, S.gold, S.fine * 1.2), dots ? L(dots, S.gold, 1.4) : null])],
      perch: [62, 76],
    });
  },
  // Laden Mango: a vast, low, dark dome, fruit hanging on long stalks
  IV: (c) => {
    const { S } = c;
    const masses = [M(30, 118, 26, 20, 1, { dense: true }), M(170, 118, 26, 20, 5, { dense: true }), M(56, 86, 32, 26, 2, { dense: true }), M(144, 86, 32, 26, 4, { dense: true }), M(100, 66, 40, 30, 3, { dense: true })];
    return tree(c, {
      ...base(HABIT.mango),
      pal: S.pal,
      seed: 34,
      masses,
      dense: true,
      rootD: c.inPot ? null : 'M88 168Q78 171 66 172M112 168Q122 171 134 172',
      limbs: [
        [[100, 146], [62, 140], [34, 124], 9, 3],
        [[100, 144], [74, 116], [58, 92], 9, 3],
        [[100, 142], [100, 104], [100, 70], 9, 3],
        [[100, 144], [126, 116], [142, 92], 9, 3],
        [[100, 146], [138, 140], [166, 124], 9, 3],
      ],
      trunk: [[100, 171], [100, 156], [100, 140], 26, 20, { furrows: 6 }],
      extras: () => [
        mangoes(S, [
          [24, 134],
          [44, 134],
          [66, 108],
          [86, 92],
          [114, 92],
          [134, 108],
          [156, 134],
          [176, 134],
          [100, 94],
        ]),
      ],
      glow: [100, 92, 88],
      perch: [100, 34],
    });
  },
};

export const TREE_LINES: Record<'oak' | 'maple' | 'narra' | 'cherry-blossom' | 'mango', FormLine> = {
  oak: { pal: 'grove', forms: oak, flavours: flavoursFor(HABIT.oak) },
  maple: { pal: 'ember', forms: maple, flavours: flavoursFor(HABIT.maple) },
  narra: { pal: 'spring', forms: narra, flavours: flavoursFor(HABIT.narra) },
  'cherry-blossom': { pal: 'blossom', forms: cherry, flavours: flavoursFor(HABIT['cherry-blossom']) },
  mango: { pal: 'evergreen', forms: mango, flavours: flavoursFor(HABIT.mango) },
};
export { base as habitBase };
