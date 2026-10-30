/**
 * Pine, coconut palm and bonsai: four forms each, plus the five Form IV
 * flavours adapted to each plant's own structure (a pine's Espalier is a
 * pole with ropes; a palm's Coppice is a mother palm with two young ones).
 * Ported from the art masters (scratchpad evolve/art13/src/others.cjs).
 */
import {
  A0,
  blossoms,
  boulder,
  crown,
  cutaway,
  D2R,
  disc,
  f,
  furrows,
  G,
  L,
  leaf,
  leafSet,
  leavesNode,
  limbs,
  lowerRim,
  LEAF,
  M,
  needles,
  oval,
  P,
  qa,
  qp,
  Q,
  rootTapers,
  scaleMasses,
  seedPart,
  stones,
  taper,
  trunk,
  upperRim,
  xf,
  type FormBuilder,
  type FormCtx,
  type FormLine,
  type FormOut,
  type Kids,
  type LeafSet,
  type Limb,
  type Mass,
  type Organ,
  type Paints,
  type Pal,
  type V2,
} from './kit';
import { green, habitBase, RECIPES, tree, type Habit } from './trees';
import type { FlavourId } from '../../../engine/plantForms';

// ── PINE ────────────────────────────────────────────────────────────────
function cones(S: Paints, pts: V2[]): GNodeOrNull {
  if (S.icon || !pts.length) return null;
  let d = '';
  let sc = '';
  for (const [x, y] of pts) {
    d += `M${f(x)} ${f(y)}C${f(x + 3)} ${f(y + 1)} ${f(x + 3.2)} ${f(y + 6)} ${f(x)} ${f(y + 8)}C${f(x - 3.2)} ${f(y + 6)} ${f(x - 3)} ${f(y + 1)} ${f(x)} ${f(y)}Z`;
    if (S.full) sc += `M${f(x - 2.4)} ${f(y + 3)}L${f(x + 2.4)} ${f(y + 4)}M${f(x - 2.6)} ${f(y + 5.4)}L${f(x + 2.6)} ${f(y + 6.4)}`;
  }
  return G('fruit', [P(d, S.giftFill(A0.gift.cone)), L(d + sc, S.gift(A0.gift.cone), S.hair * 1.7)]);
}
type GNodeOrNull = ReturnType<typeof G> | null;
const PINE: Habit = { bark: A0.bark.pine, kind: 'lens', ll: 8, aspect: 1, pads: true, needle: true, fruit: (S, ms) => cones(S, lowerRim(ms, 4, 7, 0.3, 0.7)) };
const pineForms: FormLine['forms'] = {
  // Starburst Pine: the winged seed; a starburst of seed-needles
  I: (c) => {
    const { S } = c;
    const set = leafSet();
    const lp = green(S.pal);
    for (let i = 0; i < 9; i++) set.add(leaf('long', 100, 140, 13, (-172 + i * 20.5) * D2R, S, 0.55));
    return {
      cutaway: cutaway(S, 64, 136, 171, 188, 10),
      body: [
        G('roots', [L('M99 170Q98 178 100 188M99 178l-4 3M100 183l4 2', S.wood(PINE.bark), S.fine * 1.5)]),
        seedPart(S, oval(84, 167, 4.6, 3.2) + ' M87 165C94 160 108 160 114 166C108 170 94 170 87 169Z', A0.seedLight, 'M90 166L112 166'),
        G('sprout', [L('M99 170Q98 154 100 140', S.lineOf(lp), S.main), P(set.wash(), S.washOf(lp), { opacity: S.washOp }), L(set.line(), S.lineOf(lp), S.fine * 1.4)]),
      ],
      perch: [70, 170],
    };
  },
  // Candle Pine: one leader in whorls, a pale new candle at its tip
  II: (c) => {
    const { S } = c;
    let nd = '';
    let tw = '';
    for (const [y, w] of [
      [140, 18],
      [112, 14],
      [86, 10],
    ])
      for (const s of [-1, 1]) {
        tw += `M100 ${y}Q${100 + s * w * 0.5} ${y - 2} ${100 + s * w} ${y - 6}`;
        nd += needles(100 + s * w, y - 6, 7, -Math.PI / 2 + s * 0.9, 5, 1.4) + needles(100 + s * w * 0.55, y - 3, 6, -Math.PI / 2 + s * 0.6, 4, 1.2);
      }
    nd += needles(100, 58, 7, -Math.PI / 2, 7, 2.6);
    const candle = 'M100 58C102.4 52 102.6 44 100 36C97.4 44 97.6 52 100 58Z';
    return {
      body: [
        G('stem', [L('M100 171L100 58', S.wood(PINE.bark), S.main * 1.6), L(tw, S.wood(PINE.bark), S.fine * 1.4)]),
        G('leaves', [L(nd, S.lineOf(S.pal), S.fine * 1.2)]),
        G('bud', [P(candle, LEAF[S.pal].hi), L(candle, S.lineOf(S.pal), S.fine * 1.3)]),
      ],
      perch: [82, 134],
    };
  },
  // Spire Pine: a tiered cone of whorls
  III: (c) =>
    tree(c, {
      ...habitBase(PINE),
      pal: c.S.pal,
      seed: 25,
      masses: [M(100, 140, 42, 16, 1), M(100, 118, 35, 15, 2), M(100, 96, 28, 14, 3), M(100, 74, 21, 13, 4), M(100, 52, 13, 12, 5)],
      trunk: [[100, 171], [100, 110], [100, 44], 9, 3, { furrows: 0 }],
      extras: () => [
        cones(c.S, [
          [72, 146],
          [124, 124],
        ]),
      ],
      perch: [64, 134],
    }),
  // Highcloud Pine: a tall, leaning bole and level cloud pads high up
  IV: (c) =>
    tree(c, {
      ...habitBase(PINE),
      pal: c.S.pal,
      seed: 35,
      masses: [M(44, 104, 26, 16, 1), M(156, 92, 24, 16, 5), M(64, 72, 26, 16, 2), M(140, 58, 26, 16, 4), M(108, 36, 32, 19, 3)],
      trunk: [[100, 171], [96, 110], [106, 44], 16, 7, { furrows: 6 }],
      limbs: [
        [[99, 130], [70, 114], [46, 106], 5, 1.8],
        [[102, 112], [130, 98], [152, 94], 5, 1.8],
        [[102, 94], [80, 78], [66, 74], 5, 1.8],
        [[104, 74], [124, 62], [140, 60], 5, 1.8],
      ],
      rootD: c.inPot ? null : 'M92 168Q82 171 72 173M108 168Q120 171 130 172',
      extras: () => [
        cones(c.S, [
          [50, 110],
          [70, 78],
          [148, 64],
          [112, 44],
        ]),
      ],
      glow: [104, 80, 80],
      perch: [140, 46],
    }),
};
/** Pine Espalier: a pole above the crown with ropes fanning down to level limbs. */
function pineEspalier(c: FormCtx): FormOut {
  const { S } = c;
  const post = A0.planter.post;
  const masses = [M(40, 120, 28, 12, 1, { flat: 0.6 }), M(160, 120, 28, 12, 5, { flat: 0.6 }), M(64, 92, 28, 12, 2, { flat: 0.6 }), M(136, 92, 28, 12, 4, { flat: 0.6 }), M(100, 66, 30, 13, 3, { flat: 0.6 })];
  const tops: V2[] = [
    [22, 116],
    [178, 116],
    [44, 88],
    [156, 88],
    [80, 62],
    [120, 62],
  ];
  const ropes = tops.map(([x, y]) => `M100 14Q${f((100 + x) / 2)} ${f((14 + y) / 2 + 6)} ${x} ${y}`).join('');
  return tree(c, {
    ...habitBase(PINE),
    pal: S.pal,
    seed: 45,
    masses,
    trunk: [[100, 171], [100, 120], [100, 64], 16, 7, { furrows: 5 }],
    limbs: [
      [[100, 128], [64, 124], [24, 120], 6, 2],
      [[100, 128], [136, 124], [176, 120], 6, 2],
      [[100, 100], [76, 96], [46, 92], 5, 1.8],
      [[100, 100], [124, 96], [154, 92], 5, 1.8],
    ],
    afterTrunk: [G('pole', [L('M100 66L100 14', S.wood(post), S.main * 1.3)])],
    extras: () => [
      S.icon ? null : G('ropes', [L(ropes, S.wood(post), S.hair * 1.4, { opacity: 0.9 })]),
      cones(S, [
        [48, 126],
        [152, 126],
      ]),
    ],
    glow: [100, 92, 84],
    perch: [40, 108],
  });
}
const pineFlavours: Record<FlavourId, FormBuilder> = {
  lookout: (c) => RECIPES.lookout(c, PINE, c.S.pal),
  moot: (c) => RECIPES.moot(c, PINE, c.S.pal),
  espalier: pineEspalier,
  coppice: (c) => RECIPES.coppice(c, PINE, c.S.pal),
  holdfast: (c) => RECIPES.holdfast(c, PINE, c.S.pal),
};

// ── COCONUT PALM ────────────────────────────────────────────────────────
const PB = A0.bark.coconut;
/** One pinnate frond into a leaf set; returns its rachis and where it is. */
function frond(S: Paints, set: LeafSet, p0: V2, ang: number, len: number, droop = 0.36, n?: number, ll?: number) {
  const a = ang * D2R;
  const p2: V2 = [p0[0] + Math.cos(a) * len, p0[1] + Math.sin(a) * len * 0.75 + len * 0.12 + Math.abs(Math.cos(a)) * len * droop];
  const p1: V2 = [p0[0] + Math.cos(a) * len * 0.62, p0[1] + Math.sin(a) * len * 0.75 * 0.62 - len * 0.12];
  const k = n ?? (S.full ? 9 : S.small ? 6 : 0);
  for (let i = 1; i <= k; i++) {
    const t = i / (k + 1);
    const p = qp(p0, p1, p2, t);
    const tn = qa(p0, p1, p2, t);
    const l = (ll || len * 0.3) * (1 - t * 0.55);
    const dr = Math.cos(tn) >= 0 ? 0.35 : -0.35;
    set.add(leaf('long', p[0], p[1], l, tn + 0.75 + dr, S)).add(leaf('long', p[0], p[1], l, tn - 0.75 + dr, S));
  }
  return { d: Q(p0, p1, p2), mid: qp(p0, p1, p2, 0.6), tip: p2, wedge: taper(p0, p1, p2, len * 0.2, 2).closed };
}
/** A crown of fronds [angle°, length, droop]; `doms`: each frond's domain (null = none). A frond's length follows its domain. */
function palmCrown(S: Paints, at: V2, fr: [number, number, number][], pal: Pal, doms?: (number | null)[]): { node: ReturnType<typeof G>; organs: Organ[] } {
  const organs: Organ[] = [];
  const gs = fr.map(([ang, len, droop], i) => {
    const dom = doms?.[i] ?? null;
    const set = leafSet();
    const r = frond(S, set, at, ang, len * (dom ? S.sc(dom) : 1), droop);
    if (dom) organs.push({ dom, x: r.mid[0], y: r.mid[1] });
    return G(dom ? `domain-${dom}` : null, [S.icon ? P(r.wedge, S.washOf(pal), { opacity: 0.85 }) : null, P(set.wash(), S.washOf(pal), { opacity: S.washOp }), L(r.d + ' ' + set.line(), S.lineOf(pal), S.icon ? S.main : S.fine * 1.4)]);
  });
  return { node: G('canopy', gs), organs };
}
function ringTrunk(S: Paints, p0: V2, pc: V2, p1: V2, w0: number, w1: number) {
  return trunk(S, p0, pc, p1, w0, w1, PB, {
    furrows: 0,
    extra: (t) => {
      let d = '';
      for (let i = 1; i < t.left.length - 1; i++) {
        const a = t.left[i];
        const b = t.right[i];
        d += `M${f(a[0])} ${f(a[1])}Q${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2 + 1.6)} ${f(b[0])} ${f(b[1])}`;
      }
      return d;
    },
  });
}
function nuts(S: Paints, at: V2, pts: [number, number, number?][], ripe: boolean, pal: Pal) {
  if (S.icon) return null;
  const col = pal === 'golden' ? A0.gift.coconutGolden : ripe ? A0.gift.coconutRipe : A0.gift.coconutGreen;
  const d = pts.map(([dx, dy, r]) => disc(at[0] + dx, at[1] + dy, r || 5.2)).join(' ');
  return G('fruit', [P(d, S.giftFill(col)), L(d, S.gift(col), S.fine * 1.4)]);
}
const FR5: [number, number, number][] = [
  [-168, 54, 0.36],
  [-130, 58, 0.3],
  [-92, 50, 0.1],
  [-54, 58, 0.3],
  [-12, 54, 0.36],
];
const palmForms: FormLine['forms'] = {
  // Husk Palm: the husked nut lying on the soil; a shoot from its eye
  I: (c) => {
    const { S } = c;
    const set = leafSet();
    const lp = S.pal;
    set.add(leaf('strap', 108, 140, 26, -104 * D2R, S, 1.4)).add(leaf('strap', 108, 140, 20, -66 * D2R, S, 1.4));
    return {
      cutaway: cutaway(S, 60, 140, 171, 188, 11),
      body: [
        G('roots', [L('M96 170Q94 180 97 189M100 170Q104 179 108 186', S.wood(PB), S.fine * 1.5)]),
        seedPart(S, 'M80 164C80 154 92 150 104 152C116 154 120 162 116 168C112 173 86 173 80 164Z', PB, 'M86 160Q98 156 112 158M84 166Q98 162 114 164'),
        G('sprout', [L('M107 154Q106 146 108 140', S.lineOf(lp), S.main * 1.3), P(set.wash(), S.washOf(lp), { opacity: S.washOp }), L(set.line(), S.lineOf(lp), S.main)]),
      ],
      perch: [70, 168],
    };
  },
  // Strapleaf Palm: whole, pleated young leaves in a fan from the nut
  II: (c) => {
    const { S } = c;
    const set = leafSet();
    let pleat = '';
    for (const [a, l] of [
      [-134, 50],
      [-110, 58],
      [-84, 58],
      [-58, 50],
    ]) {
      set.add(leaf('lens', 100, 162, l, a * D2R, S, 0.5));
      if (S.full)
        for (const u of [0.35, 0.55, 0.75]) {
          const x = 100 + Math.cos(a * D2R) * l * u;
          const y = 162 + Math.sin(a * D2R) * l * u;
          pleat += xf('M-4 2L0 0L4 2', x, y, (a + 90) * D2R, 0.9);
        }
    }
    return { body: [seedPart(S, 'M84 171C84 162 92 157 100 158C108 159 114 164 114 171Z', PB), leavesNode(S, 'leaves', set, S.pal, [pleat ? L(pleat, S.lineOf(S.pal), S.hair * 1.4) : null])], perch: [72, 160] };
  },
  // Ringed Palm: a short ringed trunk, five arching fronds, the first green nuts
  III: (c) => {
    const { S } = c;
    const at: V2 = [104, 104];
    const cr = palmCrown(
      S,
      at,
      FR5.map(([a, l, d]) => [a, l * 0.92, d]),
      S.pal,
      [1, 2, 3, 4, 5],
    );
    return {
      body: [
        ringTrunk(S, [100, 171], [99, 140], [104, 106], 13, 9),
        cr.node,
        nuts(
          S,
          at,
          [
            [-5, 8, 4.4],
            [5, 9, 4.4],
            [0, 13, 4.4],
          ],
          false,
          S.pal,
        ),
      ],
      perch: [70, 92],
      organs: cr.organs,
    };
  },
  // Shoreline Palm: a tall curving trunk, a full crown, heavy nuts, a nut sprouting at its foot
  IV: (c) => {
    const { S } = c;
    const at: V2 = [124, 40];
    const cr = palmCrown(
      S,
      at,
      [
        [-172, 66, 0.4],
        [-134, 66, 0.32],
        [-94, 54, 0.1],
        [-54, 66, 0.32],
        [-10, 62, 0.42],
      ],
      S.pal,
      [1, 2, 3, 4, 5],
    );
    const sprout = leafSet();
    sprout.add(leaf('strap', 64, 162, 16, -100 * D2R, S, 1.3)).add(leaf('strap', 64, 162, 12, -70 * D2R, S, 1.3));
    const nutD = 'M56 171C56 164 62 162 68 163C74 164 76 168 75 171Z';
    return {
      body: [
        c.inPot || S.icon ? null : G('roots', [L('M88 169Q80 171 74 174M92 170Q88 173 86 177M104 169Q112 171 118 174', S.wood(PB), S.fine * 1.5)]),
        ringTrunk(S, [96, 171], [88, 98], [124, 42], 16, 9),
        cr.node,
        nuts(
          S,
          at,
          [
            [-7, 9],
            [5, 10],
            [-1, 15],
            [-12, 15],
            [10, 16],
            [3, 20],
          ],
          true,
          S.pal,
        ),
        c.inPot || S.icon
          ? null
          : G('sprout', [P(nutD, S.woodFill(PB)), L(nutD, S.wood(PB), S.fine * 1.4), P(sprout.wash(), S.washOf(S.pal), { opacity: S.washOp }), L(sprout.line(), S.lineOf(S.pal), S.fine * 1.4)]),
      ],
      glow: [116, 66, 70],
      perch: [124, 28],
      organs: cr.organs,
    };
  },
};
const palmFlavours: Record<FlavourId, FormBuilder> = {
  lookout: (c) => {
    const { S } = c;
    const at: V2 = [100, 26];
    const cr = palmCrown(
      S,
      at,
      [
        [-176, 46, 0.5],
        [-136, 48, 0.3],
        [-90, 34, 0],
        [-44, 48, 0.3],
        [-4, 46, 0.5],
      ],
      S.pal,
      [1, 2, 3, 4, 5],
    );
    return {
      body: [
        ringTrunk(S, [100, 171], [100, 100], [100, 28], 12, 8),
        cr.node,
        nuts(
          S,
          at,
          [
            [-5, 8, 4.4],
            [5, 9, 4.4],
            [0, 13, 4.4],
          ],
          true,
          S.pal,
        ),
      ],
      glow: [100, 60, 64],
      perch: [100, 14],
      organs: cr.organs,
    };
  },
  moot: (c) => {
    const { S } = c;
    const at: V2 = [100, 70];
    const cr = palmCrown(
      S,
      at,
      [
        [-178, 76, 0.02],
        [-160, 66, 0.04],
        [-90, 30, 0],
        [-20, 66, 0.04],
        [-2, 76, 0.02],
      ],
      S.pal,
      [1, 2, 3, 4, 5],
    );
    const st = c.inPot
      ? { front: [stones(S, 'stones-front', [[88, 171, 2.6], [112, 171, 2.6], [100, 172.5, 2.4]])], back: [] }
      : { back: [stones(S, 'stones', [[54, 167, 7], [146, 167, 7]])], front: [stones(S, 'stones-front', [[72, 175, 6], [128, 175, 6], [100, 179, 5]])] };
    return {
      body: [
        ringTrunk(S, [100, 171], [100, 120], [100, 72], 14, 10),
        cr.node,
        nuts(
          S,
          at,
          [
            [-6, 8],
            [6, 8],
            [0, 13],
          ],
          true,
          S.pal,
        ),
      ],
      ...st,
      glow: [100, 96, 78],
      perch: [60, 62],
      organs: cr.organs,
    };
  },
  espalier: (c) => {
    const { S } = c;
    const at: V2 = [100, 62];
    const post = A0.planter.post;
    const cr = palmCrown(
      S,
      at,
      [
        [-162, 56, 0.3],
        [-126, 56, 0.2],
        [-90, 46, 0],
        [-54, 56, 0.2],
        [-18, 56, 0.3],
      ],
      S.pal,
      [1, 2, 3, 4, 5],
    );
    const w = c.inPot ? Math.min(40, c.span + 4) : 40;
    const poles = `M${100 - w} 171L97 112M${100 + w} 171L103 112M100 176L100 112`;
    return {
      body: [
        ringTrunk(S, [100, 171], [100, 116], [100, 64], 12, 9),
        G('frame', [L(poles.replace('M100 176L100 112', ''), S.wood(post), S.main * 1.5), S.icon ? null : L('M95 112L105 112M95 115.5L105 115.5', S.wood(post), S.fine * 1.4)]),
        cr.node,
        nuts(
          S,
          at,
          [
            [-5, 8, 4.6],
            [5, 9, 4.6],
            [0, 13, 4.6],
          ],
          true,
          S.pal,
        ),
      ],
      glow: [100, 84, 74],
      perch: [100, 50],
      organs: cr.organs,
    };
  },
  coppice: (c) => {
    const { S } = c;
    const main = palmCrown(
      S,
      [104, 46],
      [
        [-140, 52, 0.3],
        [-92, 44, 0.1],
        [-44, 52, 0.3],
      ],
      S.pal,
      [2, 3, 4],
    );
    const lc = palmCrown(
      S,
      [66, 100],
      [
        [-170, 34, 0.4],
        [-120, 34, 0.2],
        [-60, 30, 0.2],
      ],
      S.pal,
      [1, null, null],
    );
    const rc = palmCrown(
      S,
      [138, 108],
      [
        [-120, 30, 0.2],
        [-60, 34, 0.2],
        [-10, 34, 0.4],
      ],
      S.pal,
      [null, null, 5],
    );
    const t = (p0: V2, pc: V2, p1: V2, w0: number, w1: number) => ringTrunk(S, p0, pc, p1, w0, w1).children;
    return {
      body: [
        G('trunk', [...t([92, 171], [80, 136], [66, 102], 9, 6), ...t([108, 171], [124, 140], [138, 110], 9, 6), ...t([100, 171], [98, 110], [104, 48], 13, 9)]),
        G('canopy', [lc.node.children, rc.node.children, main.node.children]),
        nuts(
          S,
          [104, 46],
          [
            [-5, 8, 4.6],
            [5, 9, 4.6],
            [0, 13, 4.6],
          ],
          true,
          S.pal,
        ),
      ],
      glow: [100, 84, 80],
      perch: [66, 88],
      organs: [...main.organs, ...lc.organs, ...rc.organs],
    };
  },
  holdfast: (c) => {
    const { S } = c;
    const sc = c.inPot ? Math.min(1, (c.span + 8) / 44) : 1;
    const X = (x: number) => 100 + (x - 100) * sc;
    const top = 170 - 30 * sc;
    const rock = `M${f(X(60))} 171C${f(X(56))} ${f(170 - 16 * sc)} ${f(X(70))} ${f(top + 2)} ${f(X(90))} ${f(top)}C${f(X(110))} ${f(top - 2)} ${f(X(136))} ${f(top + 4)} ${f(X(141))} ${f(170 - 12 * sc)}L${f(X(140))} 171Z`;
    const at: V2 = [100, 84];
    const cr = palmCrown(
      S,
      at,
      [
        [-170, 46, 0.4],
        [-140, 50, 0.3],
        [-112, 44, 0.15],
        [-90, 36, 0],
        [-68, 44, 0.15],
        [-40, 50, 0.3],
        [-10, 46, 0.4],
      ],
      S.pal,
      [1, 2, null, 3, null, 4, 5],
    );
    return {
      back: [boulder(S, rock, 100, 170 - 15 * sc, 40 * sc, 15 * sc)],
      body: [
        rootTapers(
          S,
          [
            [[96, top + 6], [X(74), top + 8], [X(66), 171], 6, 2.2],
            [[98, top + 6], [X(88), top + 16], [X(88), 171], 5, 2.2],
            [[102, top + 6], [X(112), top + 16], [X(114), 171], 5, 2.2],
            [[104, top + 6], [X(128), top + 8], [X(136), 171], 6, 2.2],
          ],
          PB,
        ),
        ringTrunk(S, [100, top + 8], [100, 112], [100, 86], 20, 13),
        cr.node,
        nuts(
          S,
          at,
          [
            [-6, 8],
            [6, 8],
            [0, 13],
          ],
          true,
          S.pal,
        ),
      ],
      glow: [100, 76, 72],
      perch: [62, 74],
      organs: cr.organs,
    };
  },
};

// ── BONSAI (its own tray: the pot is the app's) ─────────────────────────
const BB = A0.bark.bonsai;
interface BonsaiSpec {
  trunks: Limb[];
  roots?: Limb[];
  limbs?: Limb[];
  wire?: string;
  masses: Mass[];
  seed?: number;
  dense?: boolean;
  ids?: boolean;
  fur?: boolean;
  blooms?: number;
  back?: Kids;
  front?: Kids;
  glow?: [number, number, number];
  perch?: V2;
}
function bonsaiTree(c: FormCtx, sp: BonsaiSpec): FormOut {
  const { S } = c;
  const body: Kids = [];
  if (sp.roots) body.push(rootTapers(S, sp.roots, BB));
  if (sp.limbs) body.push(limbs(S, sp.limbs, BB));
  const tr = sp.trunks.map(([p0, pc, p1, w0, w1]) => taper(p0, pc, p1, w0, w1, 14));
  body.push(
    G('trunk', [
      P(tr.map((t) => t.closed).join(' '), S.woodFill(BB)),
      S.full && sp.fur !== false ? L(tr.map((t) => furrows(t.left, t.right, 2, 5)).join(''), S.wood(BB), S.hair * 1.4, { opacity: 0.7 }) : null,
      L(tr.map((t) => t.sides).join(' '), S.wood(BB), S.main),
    ]),
  );
  if (sp.wire && !S.icon) body.push(G('wire', [L(sp.wire, S.wire, S.hair * 1.5)]));
  const ms = sp.masses.map((m) => ({ ...m, flat: m.flat ?? 0.62, n: m.n || Math.max(8, Math.round(m.rx / 2.6)) }));
  if (sp.ids !== false) scaleMasses(S, ms);
  const cr = crown(S, ms, { kind: 'lens', ll: 6, pal: S.pal, needle: true, seed: sp.seed || 5, dense: sp.dense, ids: sp.ids, rim: 1.4 });
  body.push(cr.node);
  if (sp.blooms && !S.icon) body.push(blossoms(S, upperRim(ms, sp.blooms, 3), 2.5, 'pearl'));
  return { body, back: sp.back || [], front: sp.front || [], glow: sp.glow || null, perch: sp.perch, organs: cr.organs };
}
const moss = (S: Paints, xs: number[]) =>
  S.icon
    ? null
    : G('moss', [L(xs.map((x) => `M${x - 3} 170.5Q${x} 166.5 ${x + 3} 170.5`).join(''), S.lineOf('grove'), S.fine * 1.5), P(xs.map((x) => `M${x - 3} 170.5Q${x} 166.5 ${x + 3} 170.5Z`).join(''), S.washOf('grove'), { opacity: S.washOp })]);
const bonsaiForms: FormLine['forms'] = {
  // First-bend Bonsai: a seedling taking its first bend
  I: (c) => {
    const { S } = c;
    let nd = '';
    for (const [x, y, a] of [
      [104, 128, -90],
      [96, 140, -150],
      [101, 146, -30],
    ])
      nd += needles(x, y, 8, a * D2R, 5, 1.6);
    return { body: [G('sprout', [L('M100 171Q92 158 98 148Q104 138 104 128M98 148L96 140M100 150L101 146', S.wood(BB), S.main * 1.3), L(nd, S.lineOf(S.pal), S.fine * 1.3)])], perch: [80, 168] };
  },
  // Upright Bonsai: a straight, tapering trunk; three pads in a triangle
  II: (c) =>
    bonsaiTree(c, {
      trunks: [[[100, 171], [100, 130], [100, 82], 11, 3]],
      ids: false,
      seed: 6,
      limbs: [
        [[100, 138], [86, 134], [76, 130], 3, 1.2],
        [[100, 120], [114, 116], [124, 114], 3, 1.2],
      ],
      masses: [M(74, 128, 20, 12, 1), M(126, 112, 18, 12, 2), M(100, 84, 20, 14, 3)],
      perch: [74, 118],
    }),
  // Winding Bonsai: the S-curved trunk and five cloud pads
  III: (c) =>
    bonsaiTree(c, {
      trunks: [
        [[100, 171], [116, 150], [96, 128], 15, 9],
        [[96, 129], [82, 110], [104, 88], 9, 4],
      ],
      seed: 7,
      limbs: [
        [[99, 134], [80, 128], [62, 124], 3.6, 1.2],
        [[92, 112], [80, 102], [70, 96], 3.4, 1.2],
        [[102, 140], [122, 132], [140, 126], 3.6, 1.2],
        [[100, 104], [118, 100], [134, 100], 3.4, 1.2],
      ],
      masses: [M(60, 124, 22, 13, 1), M(70, 96, 20, 13, 2), M(104, 76, 24, 16, 3), M(134, 100, 20, 13, 4), M(140, 126, 20, 13, 5)],
      perch: [60, 112],
    }),
  // Windswept Bonsai: the trunk leans with the wind; every pad streams one way
  IV: (c) =>
    bonsaiTree(c, {
      trunks: [
        [[92, 171], [96, 130], [138, 96], 17, 7],
        [[136, 97], [150, 88], [160, 84], 7, 3],
      ],
      seed: 8,
      limbs: [
        [[99, 140], [94, 128], [96, 122], 3.6, 1.2],
        [[110, 120], [116, 110], [124, 108], 3.6, 1.2],
        [[126, 104], [140, 108], [154, 110], 3.6, 1.2],
      ],
      masses: [M(94, 124, 14, 10, 1), M(120, 106, 22, 11, 2), M(156, 82, 30, 14, 3), M(156, 108, 24, 11, 4), M(170, 126, 18, 10, 5)],
      blooms: 6,
      glow: [128, 112, 62],
      perch: [120, 94],
      front: [moss(c.S, [80, 108, 116])],
    }),
};
const bonsaiFlavours: Record<FlavourId, FormBuilder> = {
  // literati: a tall, slender trunk; a few small pads high up
  lookout: (c) =>
    bonsaiTree(c, {
      trunks: [
        [[100, 171], [88, 130], [102, 96], 8, 5],
        [[102, 97], [114, 70], [108, 46], 5, 2.4],
      ],
      seed: 9,
      fur: false,
      limbs: [
        [[106, 66], [96, 70], [88, 72], 2.2, 1],
        [[109, 58], [118, 62], [126, 62], 2.2, 1],
      ],
      masses: [M(86, 72, 14, 8, 1), M(96, 56, 13, 8, 2), M(110, 42, 15, 9, 3), M(126, 60, 13, 8, 4), M(120, 76, 11, 7, 5)],
      blooms: 3,
      glow: [104, 96, 64],
      perch: [86, 62],
    }),
  // tabled: thick and short; level pads in calm tiers; pebbles on the soil
  moot: (c) =>
    bonsaiTree(c, {
      trunks: [[[100, 171], [100, 146], [100, 112], 18, 11]],
      seed: 10,
      limbs: [
        [[100, 136], [70, 132], [46, 130], 4, 1.4],
        [[100, 136], [130, 132], [154, 130], 4, 1.4],
        [[100, 120], [80, 114], [66, 112], 3.6, 1.2],
        [[100, 120], [120, 114], [134, 112], 3.6, 1.2],
      ],
      masses: [M(44, 130, 20, 9, 1, { flat: 0.45 }), M(156, 130, 20, 9, 5, { flat: 0.45 }), M(64, 112, 24, 9, 2, { flat: 0.45 }), M(136, 112, 24, 9, 4, { flat: 0.45 }), M(100, 94, 44, 12, 3, { flat: 0.45 })],
      blooms: 4,
      glow: [100, 116, 64],
      perch: [44, 118],
      front: [
        stones(c.S, 'stones-front', [
          [78, 170.5, 2.6],
          [88, 171.5, 2.2],
          [114, 171.5, 2.2],
          [124, 170.5, 2.6],
          [100, 172, 2],
        ]),
      ],
    }),
  // wired: branches trained into a flat fan, the wire coiled along them
  espalier: (c) => {
    const lim: [V2, V2, V2][] = [
      [[100, 150], [80, 140], [56, 136]],
      [[100, 132], [76, 116], [62, 104]],
      [[100, 132], [124, 116], [138, 104]],
      [[100, 150], [120, 140], [144, 136]],
    ];
    let wire = '';
    for (const [a, cc, b] of lim)
      for (let t = 0.1; t < 0.95; t += 0.1) {
        const p = qp(a, cc, b, t);
        wire += `M${f(p[0] - 1.4)} ${f(p[1] + 2)}L${f(p[0] + 1.4)} ${f(p[1] - 2)}`;
      }
    for (let y = 168; y > 96; y -= 6) wire += `M97 ${y + 2}L103 ${y - 2}`;
    return bonsaiTree(c, {
      trunks: [[[100, 171], [100, 130], [100, 88], 10, 4]],
      seed: 11,
      wire,
      limbs: lim.map(([a, cc, b]): Limb => [a, cc, b, 3.6, 1.2]),
      masses: [M(52, 134, 18, 10, 1), M(60, 100, 18, 10, 2), M(100, 80, 22, 12, 3), M(140, 100, 18, 10, 4), M(148, 134, 18, 10, 5)],
      blooms: 4,
      glow: [100, 112, 62],
      perch: [52, 122],
    });
  },
  // clump: three trunks from one root
  coppice: (c) =>
    bonsaiTree(c, {
      trunks: [
        [[94, 171], [86, 140], [78, 102], 9, 3],
        [[100, 171], [102, 128], [102, 78], 11, 3],
        [[106, 171], [116, 142], [124, 108], 8, 3],
      ],
      seed: 12,
      limbs: [
        [[86, 132], [74, 124], [64, 118], 2.6, 1],
        [[112, 140], [128, 132], [140, 122], 2.6, 1],
      ],
      masses: [M(64, 114, 18, 11, 1), M(78, 98, 17, 11, 2), M(102, 76, 22, 13, 3), M(124, 102, 17, 11, 4), M(140, 118, 17, 11, 5)],
      blooms: 4,
      glow: [102, 110, 62],
      perch: [64, 102],
    }),
  // root-over-rock: roots grip a stone set in the tray
  holdfast: (c) => {
    const rock = 'M72 171C70 160 76 148 88 144C96 141 106 141 114 144C124 148 130 160 128 171Z';
    return bonsaiTree(c, {
      trunks: [[[100, 146], [98, 126], [100, 104], 15, 8]],
      seed: 13,
      dense: true,
      roots: [
        [[96, 146], [80, 148], [76, 171], 4.4, 1.6],
        [[98, 147], [90, 158], [90, 171], 4, 1.6],
        [[102, 147], [110, 158], [110, 171], 4, 1.6],
        [[104, 146], [120, 148], [124, 171], 4.4, 1.6],
      ],
      limbs: [
        [[99, 116], [86, 110], [76, 106], 3.4, 1.2],
        [[101, 114], [114, 108], [124, 104], 3.4, 1.2],
      ],
      masses: [M(76, 104, 20, 14, 1), M(124, 102, 20, 14, 5), M(84, 88, 20, 14, 2), M(116, 86, 20, 14, 4), M(100, 76, 24, 16, 3)].map((m) => ({ ...m, flat: 0.75 })),
      blooms: 4,
      back: [boulder(c.S, rock, 100, 156, 28, 15)],
      glow: [100, 104, 62],
      perch: [76, 92],
    });
  },
};

export const CONIFER_LINES: Record<'pine' | 'coconut-palm' | 'bonsai', FormLine> = {
  pine: { pal: 'evergreen', forms: pineForms, flavours: pineFlavours },
  'coconut-palm': { pal: 'spring', forms: palmForms, flavours: palmFlavours },
  bonsai: { pal: 'grove', forms: bonsaiForms, flavours: bonsaiFlavours },
};
