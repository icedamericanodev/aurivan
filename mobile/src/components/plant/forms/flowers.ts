/**
 * Sunflower, lotus, sampaguita, cactus and bamboo: four forms each, plus the
 * five Form IV flavours adapted to each plant. Ported from the art masters
 * (scratchpad evolve/art13/src/others2.cjs).
 *
 * A domain's part grows with its mastery here too: a sunflower's leaf, a
 * lotus pad, a sampaguita mass, a cactus arm and a bamboo culm.
 */
import {
  A0,
  boulder,
  crown,
  cutaway,
  D2R,
  disc,
  f,
  G,
  L,
  leaf,
  leafSet,
  leavesNode,
  lerp,
  LEAF,
  M,
  oval,
  P,
  qa,
  qp,
  Q,
  rng,
  rootTapers,
  smooth,
  star,
  stones,
  taper,
  upperRim,
  xf,
  type FormBuilder,
  type FormCtx,
  type FormLine,
  type Kids,
  type Limb,
  type Mass,
  type Organ,
  type Paints,
  type Pal,
  type V2,
} from './kit';
import type { FlavourId } from '../../../engine/plantForms';
import type { GNode } from '../art';

const POST = A0.planter.post;
type Stones = { back: Kids; front: Kids };
const groundStones = (c: FormCtx): Stones =>
  c.inPot
    ? {
        back: [],
        front: [
          stones(c.S, 'stones-front', [
            [100 - Math.min(c.span, 28) * 0.8, 170.5, 2.8],
            [100 - Math.min(c.span, 28) * 0.4, 171.5, 2.4],
            [100 + Math.min(c.span, 28) * 0.4, 171.5, 2.4],
            [100 + Math.min(c.span, 28) * 0.8, 170.5, 2.8],
            [100, 172, 2.2],
          ]),
        ],
      }
    : { back: [stones(c.S, 'stones', [[54, 167, 7], [146, 167, 7]])], front: [stones(c.S, 'stones-front', [[72, 175, 6], [128, 175, 6], [100, 179, 5]])] };
const rockAt = (c: FormCtx, w = 42, h = 30) => {
  const sc = c.inPot ? Math.min(1, (c.span + 6) / w) : 1;
  const X = (x: number) => 100 + (x - 100) * sc;
  const top = 170 - h * sc;
  const d = `M${f(X(100 - w))} 171C${f(X(100 - w - 3))} ${f(170 - h * 0.5 * sc)} ${f(X(100 - w * 0.6))} ${f(top + 2)} ${f(X(96))} ${f(top)}C${f(X(100 + w * 0.5))} ${f(top - 1)} ${f(X(100 + w))} ${f(170 - h * 0.45 * sc)} ${f(X(100 + w - 1))} 171Z`;
  return { node: boulder(c.S, d, 100, 170 - h * 0.5 * sc, w * sc, h * 0.5 * sc), top, X };
};
const ties = (S: Paints, pts: [number, number, number][]) =>
  S.icon ? null : G('ties', [L(pts.map(([x0, x1, y]) => `M${x0} ${y}Q${f((x0 + x1) / 2)} ${y - 2.6} ${x1} ${y}Q${f((x0 + x1) / 2)} ${y + 2.6} ${x0} ${y}`).join(''), S.wood(POST), S.hair * 1.6)]);

// ── SUNFLOWER ───────────────────────────────────────────────────────────
function stalk(S: Paints, p0: V2, pc: V2, p1: V2, w0: number, w1: number, pal: Pal): GNode {
  if (w0 < 3.2) return G('stem', [L(Q(p0, pc, p1), S.lineOf(pal), S.main)]);
  const t = taper(p0, pc, p1, w0, w1);
  return G('stem', [P(t.closed, S.massFill(pal, true)), L(t.sides, S.lineOf(pal), S.main)]);
}
/** A head: two rings of petals, the disc and its seed spiral. sx, sy squash it (a 3/4 or upturned face); rot tilts it. */
function sunHead(S: Paints, x: number, y: number, R: number, o: { sx?: number; sy?: number; rot?: number } = {}): GNode {
  const sx = o.sx ?? 1;
  const sy = o.sy ?? 1;
  const rot = o.rot ?? 0;
  const pal = S.pal;
  const at = (u: number, v: number): V2 => [x + u * sx * Math.cos(rot) - v * sy * Math.sin(rot), y + u * sx * Math.sin(rot) + v * sy * Math.cos(rot)];
  const np = R > 16 ? 22 : 16;
  const pl = R * 0.78;
  let back = '';
  let front = '';
  for (let i = 0; i < np; i++) {
    const a = (i / np) * Math.PI * 2;
    const b0 = at(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
    const b1 = at(Math.cos(a) * (R + pl), Math.sin(a) * (R + pl));
    const ang = Math.atan2(b1[1] - b0[1], b1[0] - b0[0]);
    const len = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
    const d = xf('M0 0Q0.36 -0.5 0 -1Q-0.36 -0.5 0 0Z', b0[0], b0[1], ang + Math.PI / 2, len, Math.max(0.55, Math.min(1, len / pl)));
    if (i % 2) back += d + ' ';
    else front += d + ' ';
  }
  const ring: V2[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ring.push(at(Math.cos(a) * R, Math.sin(a) * R));
  }
  const discD = smooth(ring);
  let dots = '';
  if (!S.icon) {
    const n = S.full ? Math.round(R * 2.2) : Math.round(R * 0.8);
    for (let i = 1; i <= n; i++) {
      const rr = R * 0.82 * Math.sqrt(i / n);
      const a = i * 2.39996;
      const p = at(Math.cos(a) * rr, Math.sin(a) * rr);
      dots += `M${f(p[0])} ${f(p[1])}h0.01`;
    }
  }
  const dc = A0.sunflower.discMid;
  return G('head', [
    P(back.trim(), S.washOf(pal), { opacity: 0.65 }),
    L(back.trim(), S.lineOf(pal), S.fine * 1.3),
    P(front.trim(), S.washOf(pal), { opacity: 0.9 }),
    L(front.trim(), S.lineOf(pal), S.fine * 1.4),
    P(discD, S.giftFill(dc)),
    L(discD, S.wood(dc), S.main),
    dots ? L(dots, S.wood(A0.sunflower.seeds), 1.7) : null,
  ]);
}
/** The domain leaves up a stem: [t, side, len, angle°?]. A leaf's length follows its domain. */
function sunLeaves(S: Paints, p0: V2, pc: V2, p1: V2, spec: [number, number, number, number?][], fol: Pal, o: { ids?: boolean } = {}): { node: GNode; organs: Organ[] } {
  const organs: Organ[] = [];
  const gs = spec.map(([t, side, len0, ang], i) => {
    const len = len0 * (o.ids === false ? 1 : S.sc(i + 1));
    const p = qp(p0, pc, p1, t);
    const a = (ang ?? -90 + side * 60) * D2R;
    const pet: V2 = [p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 5];
    const set = leafSet().add(leaf('heart', pet[0], pet[1], len * (S.small ? 1.1 : 1), a, S));
    organs.push({ dom: i + 1, x: pet[0] + Math.cos(a) * len * 0.5, y: pet[1] + Math.sin(a) * len * 0.5 });
    return G(o.ids === false ? null : `domain-${i + 1}`, [P(set.wash(), S.washOf(fol), { opacity: S.washOp }), L(`M${f(p[0])} ${f(p[1])}L${f(pet[0])} ${f(pet[1])} ` + set.line(), S.lineOf(fol), S.fine * 1.4)]);
  });
  return { node: G('leaves', gs), organs };
}
const SEPAL = 'M0 0Q0.4 -0.6 0 -1Q-0.4 -0.6 0 0Z';
const sunflower: FormLine = {
  pal: 'gold',
  fol: 'spring',
  forms: {
    I: (c) => {
      const { S } = c;
      const set = leafSet();
      const fol = S.fol;
      set.add(leaf('ovate', 100, 140, 16, -150 * D2R, S, 1.25)).add(leaf('ovate', 100, 140, 16, -30 * D2R, S, 1.25));
      const sd = A0.seed.sunflower;
      const cap = 'M0 -6C3 -6 3.6 -2 3.6 0C3.6 3 2 6 0 6C-2 6 -3.6 3 -3.6 0C-3.6 -2 -3 -6 0 -6Z';
      return {
        cutaway: cutaway(S, 64, 136, 171, 188, 12),
        body: [
          G('roots', [L('M100 171Q99 179 101 189M100 179l-4 3M100 184l4 2', S.wood(sd), S.fine * 1.5)]),
          G('sprout', [L('M100 171Q99 156 100 140', S.lineOf(fol), S.main), P(set.wash(), S.washOf(fol), { opacity: S.washOp }), L(set.line(), S.lineOf(fol), S.main)]),
          G('seed', [
            P(xf(cap, 86, 129, -0.9, 1), S.woodFill(sd)),
            S.icon ? null : L(xf('M-1.4 -4.6L-1.6 4.6M1.4 -4.6L1.6 4.6', 86, 129, -0.9, 1), A0.seed.sunflowerStripe, S.hair * 2),
            L(xf(cap, 86, 129, -0.9, 1), S.wood(sd), S.main),
          ]),
        ],
        perch: [72, 170],
      };
    },
    II: (c) => {
      const { S } = c;
      const fol = S.fol;
      const p0: V2 = [100, 171];
      const pc: V2 = [99, 120];
      const p1: V2 = [100, 64];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.2, -1, 24],
          [0.2, 1, 24],
          [0.45, -1, 21],
          [0.45, 1, 21],
          [0.7, -1, 17],
          [0.7, 1, 17],
        ],
        fol,
        { ids: false },
      );
      let sep = '';
      for (let i = 0; i < 8; i++) sep += xf(SEPAL, 100, 58, (i / 8) * Math.PI * 2, 10) + ' ';
      return { body: [stalk(S, p0, pc, p1, 3.4, 2.6, fol), lv.node, G('head', [P(sep, S.washOf(fol), { opacity: S.washOp }), L(sep + disc(100, 58, 4), S.lineOf(fol), S.fine * 1.4)])], perch: [76, 128] };
    },
    III: (c) => {
      const { S } = c;
      const p0: V2 = [100, 171];
      const pc: V2 = [97, 112];
      const p1: V2 = [104, 64];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.12, -1, 26],
          [0.26, 1, 25],
          [0.42, -1, 23],
          [0.56, 1, 21],
          [0.7, -1, 18],
        ],
        S.fol,
      );
      return { body: [stalk(S, p0, pc, p1, 5, 3.6, S.fol), lv.node, sunHead(S, 110, 52, 14, { sx: 0.6, rot: -0.15 })], perch: [76, 112], organs: lv.organs };
    },
    IV: (c) => {
      const { S } = c;
      const p0: V2 = [100, 171];
      const pc: V2 = [95, 104];
      const p1: V2 = [103, 66];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.1, -1, 32],
          [0.24, 1, 31],
          [0.4, -1, 28],
          [0.56, 1, 25],
          [0.72, -1, 21],
        ],
        S.fol,
      );
      const bud = qp(p0, pc, p1, 0.5);
      let sep = '';
      for (let i = 0; i < 7; i++) sep += xf(SEPAL, 80, 100, (i / 7) * Math.PI * 2, 6) + ' ';
      return {
        body: [
          stalk(S, p0, pc, p1, 7, 5, S.fol),
          G('stem', [L(`M${f(bud[0])} ${f(bud[1])}Q86 104 80 100`, S.lineOf(S.fol), S.main)]),
          lv.node,
          S.icon ? null : G('bud', [P(sep, S.washOf(S.fol), { opacity: S.washOp }), L(sep, S.lineOf(S.fol), S.fine * 1.3)]),
          sunHead(S, 104, 44, 21),
        ],
        glow: [104, 50, 60],
        perch: [72, 128],
        organs: lv.organs,
      };
    },
  },
  flavours: {
    lookout: (c) => {
      const { S } = c;
      const p0: V2 = [100, 171];
      const pc: V2 = [99, 100];
      const p1: V2 = [102, 34];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.06, -1, 24],
          [0.14, 1, 24],
          [0.23, -1, 22],
          [0.31, 1, 21],
          [0.39, -1, 19],
        ],
        S.fol,
      );
      return { body: [stalk(S, p0, pc, p1, 4.6, 3.2, S.fol), lv.node, sunHead(S, 108, 26, 13, { sx: 0.58, rot: -0.3 })], glow: [104, 40, 40], perch: [80, 132], organs: lv.organs };
    },
    moot: (c) => {
      const { S } = c;
      const p0: V2 = [100, 171];
      const pc: V2 = [100, 120];
      const p1: V2 = [100, 70];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.18, -1, 30, -178],
          [0.18, 1, 30, -2],
          [0.46, -1, 26, -176],
          [0.46, 1, 26, -4],
          [0.74, 1, 20, -30],
        ],
        S.fol,
      );
      return { body: [stalk(S, p0, pc, p1, 6.4, 5, S.fol), lv.node, sunHead(S, 100, 54, 19, { sy: 0.5 })], ...groundStones(c), glow: [100, 76, 66], perch: [64, 136], organs: lv.organs };
    },
    espalier: (c) => {
      const { S } = c;
      const p0: V2 = [100, 171];
      const pc: V2 = [100, 110];
      const p1: V2 = [100, 62];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.18, -1, 28, -172],
          [0.18, 1, 28, -8],
          [0.46, -1, 25, -174],
          [0.46, 1, 25, -6],
          [0.72, -1, 20, -166],
        ],
        S.fol,
      );
      return {
        back: [G('frame', [L('M113 171L113 40', S.wood(POST), S.main * 1.6)])],
        body: [
          stalk(S, p0, pc, p1, 6, 4.4, S.fol),
          lv.node,
          ties(S, [
            [100, 113, 146],
            [100, 113, 114],
            [100, 113, 82],
          ]),
          sunHead(S, 100, 46, 17),
        ],
        glow: [100, 66, 60],
        perch: [116, 38],
        organs: lv.organs,
      };
    },
    coppice: (c) => {
      const { S } = c;
      const p0: V2 = [100, 171];
      const pc: V2 = [99, 116];
      const p1: V2 = [100, 66];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.1, -1, 26],
          [0.22, 1, 25],
          [0.6, -1, 18],
          [0.72, 1, 17],
          [0.84, -1, 15],
        ],
        S.fol,
      );
      return {
        body: [
          stalk(S, p0, pc, p1, 6, 4, S.fol),
          G('stem', [L('M100 136Q84 120 70 94M100 126Q118 112 132 90', S.lineOf(S.fol), S.main * 1.3)]),
          lv.node,
          sunHead(S, 68, 84, 10, { sx: 0.7, rot: 0.35 }),
          sunHead(S, 134, 80, 10, { sx: 0.7, rot: -0.35 }),
          sunHead(S, 100, 52, 15),
        ],
        glow: [100, 76, 70],
        perch: [62, 140],
        organs: lv.organs,
      };
    },
    holdfast: (c) => {
      const { S } = c;
      const r = rockAt(c, 40, 28);
      const top = r.top + 4;
      const p0: V2 = [100, top];
      const pc: V2 = [98, 104];
      const p1: V2 = [112, 80];
      const lv = sunLeaves(
        S,
        p0,
        pc,
        p1,
        [
          [0.06, -1, 32, -168],
          [0.1, 1, 32, -12],
          [0.3, -1, 28, -142],
          [0.34, 1, 28, -38],
          [0.56, -1, 22, -118],
        ],
        S.fol,
      );
      return {
        back: [r.node],
        body: [
          rootTapers(
            S,
            [
              [[97, top], [r.X(74), top + 4], [r.X(66), 171], 4, 1.6],
              [[99, top], [r.X(90), top + 14], [r.X(90), 171], 3.6, 1.6],
              [[101, top], [r.X(112), top + 14], [r.X(114), 171], 3.6, 1.6],
              [[103, top], [r.X(128), top + 4], [r.X(134), 171], 4, 1.6],
            ],
            A0.seed.sunflower,
          ),
          stalk(S, p0, pc, p1, 9, 7, S.fol),
          lv.node,
          sunHead(S, 122, 90, 16, { sy: 0.42, rot: 0.75 }),
        ],
        glow: [106, 92, 62],
        perch: [66, 112],
        organs: lv.organs,
      };
    },
  },
};

// ── LOTUS (its own bowl; the water line is the base) ─────────────────────
function floatPad(S: Paints, x: number, y: number, rx: number, ry: number) {
  const d = `M${f(x)} ${f(y)}L${f(x + rx * 0.95)} ${f(y - ry * 0.25)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x + rx * 0.95)} ${f(y + ry * 0.25)}Z`;
  let v = '';
  if (S.full)
    for (let i = 1; i < 7; i++) {
      const a = 0.4 + i * 0.85;
      v += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * rx * 0.85)} ${f(y + Math.sin(a) * ry * 0.85)}`;
    }
  return { wash: d, line: d + v, stalk: '' };
}
function raisedPad(S: Paints, x: number, top: number, rx: number, bend = 0) {
  const ry = rx * 0.42;
  const d = `M${f(x - rx)} ${f(top)}Q${f(x)} ${f(top + ry * 1.5)} ${f(x + rx)} ${f(top)}Q${f(x)} ${f(top - ry * 0.7)} ${f(x - rx)} ${f(top)}Z`;
  const v = S.full ? `M${f(x)} ${f(top + ry * 0.4)}L${f(x - rx * 0.6)} ${f(top + ry * 0.1)}M${f(x)} ${f(top + ry * 0.4)}L${f(x + rx * 0.6)} ${f(top + ry * 0.1)}` : '';
  return { wash: d, line: d + v, stalk: `M${f(x + bend)} 170Q${f(x + bend * 0.4)} ${f((170 + top) / 2)} ${f(x)} ${f(top + ry * 0.55)}` };
}
/** Lotus pads as domain groups: [kind ('f' floating, 'r' raised), x, y or top, rx, domain]. A pad's size follows its domain. */
function pads(S: Paints, spec: ['f' | 'r', number, number, number, number?][]) {
  const organs: Organ[] = [];
  const back: GNode[] = [];
  const front: GNode[] = [];
  for (const [kind, x, y, rx0, dom] of spec) {
    const fol = S.fol;
    const rx = rx0 * (dom ? S.sc(dom) : 1);
    const p = kind === 'f' ? floatPad(S, x, y, rx, rx * 0.32) : raisedPad(S, x, y, rx, (x - 100) * 0.12);
    const g = G(dom ? `domain-${dom}` : null, [p.stalk ? L(p.stalk, S.lineOf(fol), S.fine * 1.5) : null, P(p.wash, S.massFill(fol)), P(p.wash, S.washOf(fol), { opacity: 0.3 }), L(p.line, S.lineOf(fol), S.fine * 1.4)]);
    (kind === 'f' ? front : back).push(g);
    if (dom) organs.push({ dom, x, y });
  }
  return { back: G('pads', back), front: G('pads-front', front), organs };
}
const petal = (x: number, y: number, len: number, ang: number, w = 0.34) => xf(`M0 0Q${f(w * 1.4)} -0.5 0 -1Q${f(-w * 1.4)} -0.5 0 0Z`, x, y, ang + Math.PI / 2, len);
function lotusBloom(S: Paints, x: number, y: number, R: number, o: { bud?: boolean; cup?: boolean } = {}): GNode {
  const pal = S.pal;
  if (o.bud) {
    const d = petal(x, y + 2, R * 1.1, -Math.PI / 2, 0.42) + ' ' + petal(x, y + 2, R * 0.85, -Math.PI / 2 - 0.42, 0.3) + ' ' + petal(x, y + 2, R * 0.85, -Math.PI / 2 + 0.42, 0.3);
    return G('flower', [P(d, S.washOf(pal), { opacity: 0.8 }), L(d, S.lineOf(pal), S.fine * 1.5)]);
  }
  const open = o.cup ? 0.55 : 1;
  const back = [-1.2, -0.72, -0.24, 0.24, 0.72, 1.2].map((a) => petal(x, y, R, -Math.PI / 2 + a * open, 0.34)).join(' ');
  const front = [-0.9, -0.32, 0.32, 0.9].map((a) => petal(x, y + 2, R * 0.86, -Math.PI / 2 + a * 0.9 * open, 0.36)).join(' ') + ' ' + petal(x, y + 3, R * 0.95, -Math.PI / 2, 0.36);
  const kids: Kids = [P(back, S.washOf(pal), { opacity: 0.55 }), L(back, S.lineOf(pal), S.fine * 1.3), P(front, S.washOf(pal), { opacity: 0.88 }), L(front, S.lineOf(pal), S.fine * 1.5)];
  if (!o.cup && !S.icon) {
    const w = R * 0.26;
    const pod = `M${f(x - w)} ${f(y - R * 0.3)}Q${f(x)} ${f(y - R * 0.46)} ${f(x + w)} ${f(y - R * 0.3)}L${f(x + w * 0.7)} ${f(y - R * 0.06)}Q${f(x)} ${f(y)} ${f(x - w * 0.7)} ${f(y - R * 0.06)}Z`;
    let st = '';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      st += `M${f(x + Math.cos(a) * w * 1.1)} ${f(y - R * 0.18)}l${f(Math.cos(a) * 2.4)} ${f(Math.sin(a) * 2.4 - 1)}`;
    }
    kids.push(
      L(st, S.gold, S.fine * 1.2),
      P(pod, S.giftFill(A0.lotus.podTop)),
      L(pod + (S.full ? `M${f(x - w * 0.4)} ${f(y - R * 0.33)}h0.01M${f(x + w * 0.4)} ${f(y - R * 0.33)}h0.01M${f(x)} ${f(y - R * 0.35)}h0.01` : ''), S.lineOf(S.fol), S.fine * 1.4),
    );
  }
  return G('flower', kids);
}
const stems = (S: Paints, list: string[]) => G('stem', [L(list.join(''), S.lineOf(S.fol), S.main)]);
function seedHead(S: Paints, x: number, y: number) {
  if (S.icon) return null;
  const d = `M${f(x - 7)} ${f(y)}L${f(x + 7)} ${f(y)}L${f(x + 3.5)} ${f(y + 9)}L${f(x - 3.5)} ${f(y + 9)}Z`;
  return G('fruit', [
    P(d, S.giftFill(A0.lotus.pod)),
    L(d + `M${f(x - 3.5)} ${f(y + 3)}h0.01M${f(x)} ${f(y + 3)}h0.01M${f(x + 3.5)} ${f(y + 3)}h0.01M${f(x - 1.8)} ${f(y + 6)}h0.01M${f(x + 1.8)} ${f(y + 6)}h0.01`, S.lineOf(S.fol), S.fine * 1.4),
  ]);
}
const lotus: FormLine = {
  pal: 'blossom',
  fol: 'grove',
  forms: {
    I: (c) => {
      const { S } = c;
      const pd = pads(S, [['f', 112, 169, 13]]);
      const set = leafSet().add(leaf('narrow', 92, 150, 18, -84 * D2R, S, 0.6));
      return { body: [pd.back, G('sprout', [L('M92 170Q90 160 92 150', S.lineOf(S.fol), S.main), P(set.wash(), S.washOf(S.fol), { opacity: S.washOp }), L(set.line(), S.lineOf(S.fol), S.main)]), pd.front], perch: [74, 166] };
    },
    II: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 86, 128, 12],
        ['r', 118, 114, 13],
        ['f', 68, 169, 14],
        ['f', 132, 170, 12],
      ]);
      const set = leafSet().add(leaf('narrow', 104, 140, 16, -88 * D2R, S, 0.6));
      return { body: [pd.back, G('sprout', [L('M104 170Q103 154 104 140', S.lineOf(S.fol), S.main), P(set.wash(), S.washOf(S.fol), { opacity: S.washOp }), L(set.line(), S.lineOf(S.fol), S.main)]), pd.front], perch: [72, 120] };
    },
    III: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 80, 128, 14, 2],
        ['r', 124, 122, 14, 4],
        ['r', 92, 108, 11, 3],
        ['f', 62, 169, 15, 1],
        ['f', 140, 169, 14, 5],
      ]);
      return { body: [pd.back, stems(S, ['M100 170Q98 130 100 94']), lotusBloom(S, 100, 94, 24, { bud: true }), pd.front], perch: [66, 116], organs: pd.organs };
    },
    IV: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 72, 132, 15, 2],
        ['r', 130, 128, 16, 4],
        ['r', 100, 148, 12, 3],
        ['f', 56, 169, 16, 1],
        ['f', 146, 169, 15, 5],
      ]);
      return {
        body: [pd.back, stems(S, ['M100 170Q97 136 100 106', 'M112 170Q122 130 138 96', 'M90 170Q80 140 70 116']), seedHead(S, 138, 90), lotusBloom(S, 70, 116, 16, { bud: true }), lotusBloom(S, 100, 104, 26), pd.front],
        glow: [100, 100, 62],
        perch: [56, 120],
        organs: pd.organs,
      };
    },
  },
  flavours: {
    lookout: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 78, 146, 14, 2],
        ['r', 122, 142, 14, 4],
        ['r', 100, 156, 10, 3],
        ['f', 60, 169, 15, 1],
        ['f', 142, 169, 14, 5],
      ]);
      return { body: [pd.back, stems(S, ['M100 170Q96 104 100 44']), lotusBloom(S, 100, 44, 20), pd.front], glow: [100, 52, 48], perch: [64, 132], organs: pd.organs };
    },
    moot: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 56, 136, 14, 1],
        ['r', 78, 130, 14, 2],
        ['r', 122, 130, 14, 4],
        ['r', 144, 136, 14, 5],
        ['f', 100, 169, 16, 3],
      ]);
      const st = groundStones(c);
      return { body: [pd.back, stems(S, ['M100 170Q99 140 100 114']), lotusBloom(S, 100, 114, 24), pd.front], back: st.back, front: st.front, glow: [100, 112, 62], perch: [56, 124], organs: pd.organs };
    },
    espalier: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 60, 138, 11, 1],
        ['r', 80, 138, 11, 2],
        ['r', 100, 144, 10, 3],
        ['r', 120, 138, 11, 4],
        ['r', 140, 138, 11, 5],
      ]);
      const w = c.inPot ? Math.min(34, c.span) : 34;
      return {
        back: [G('frame', [L(`M${100 - w} 171L${100 - w} 70M${100 + w} 171L${100 + w} 70`, S.wood(POST), S.main * 1.5), S.icon ? null : L(`M${100 - w} 76L${100 + w} 76M${100 - w} 112L${100 + w} 112`, S.wood(POST), S.fine * 1.4)])],
        body: [
          pd.back,
          stems(S, ['M100 170Q100 120 100 70']),
          ties(S, [
            [100, 100, 76],
            [100, 100, 112],
          ]),
          lotusBloom(S, 100, 70, 22),
          pd.front,
        ],
        glow: [100, 84, 60],
        perch: [100 - w, 66],
        organs: pd.organs,
      };
    },
    coppice: (c) => {
      const { S } = c;
      const pd = pads(S, [
        ['r', 66, 140, 14, 2],
        ['r', 136, 136, 14, 4],
        ['r', 100, 152, 11, 3],
        ['f', 52, 169, 14, 1],
        ['f', 150, 169, 13, 5],
      ]);
      return {
        body: [
          pd.back,
          G('rhizome', [L('M84 170Q100 166 118 170', S.lineOf(S.fol), S.main)]),
          stems(S, ['M100 168Q97 130 100 92', 'M90 169Q78 140 72 112', 'M112 169Q126 136 130 104']),
          lotusBloom(S, 72, 112, 15, { bud: true }),
          lotusBloom(S, 130, 104, 18, { cup: true }),
          lotusBloom(S, 100, 92, 24),
          pd.front,
        ],
        glow: [100, 96, 66],
        perch: [52, 128],
        organs: pd.organs,
      };
    },
    holdfast: (c) => {
      const { S } = c;
      const r = rockAt(c, 30, 22);
      const pd = pads(S, [
        ['r', 66, 126, 16, 1],
        ['r', 82, 112, 15, 2],
        ['r', 118, 112, 15, 4],
        ['r', 134, 126, 16, 5],
        ['r', 100, 132, 14, 3],
      ]);
      return {
        back: [r.node],
        body: [
          rootTapers(
            S,
            [
              [[96, r.top + 2], [r.X(78), r.top + 6], [r.X(72), 171], 3.6, 1.4],
              [[104, r.top + 2], [r.X(122), r.top + 6], [r.X(128), 171], 3.6, 1.4],
            ],
            A0.seed.lotus,
          ),
          stems(S, ['M100 150Q99 126 100 100']),
          pd.back,
          lotusBloom(S, 100, 100, 22, { cup: true }),
          pd.front,
        ],
        glow: [100, 104, 60],
        perch: [66, 114],
        organs: pd.organs,
      };
    },
  },
};

// ── SAMPAGUITA ──────────────────────────────────────────────────────────
const SW = A0.seed.sampaguita;
function stars(S: Paints, pts: [number, number, number?][], r0 = 4.4, id = 'blooms'): GNode | null {
  if (S.icon || !pts.length) return null;
  const R = rng(19);
  let d = '';
  let core = '';
  for (const [x, y, s] of pts) {
    d += star(x, y, r0 * (s || 1) * (S.small ? 1.2 : 1), R() * 40) + ' ';
    core += `M${f(x)} ${f(y)}h0.01`;
  }
  return G(id, [P(d, LEAF[S.pal].light, { opacity: 0.95 }), L(d, S.starLine, S.fine * 1.1), L(core, A0.sampaguita.core, 2)]);
}
const sprigs = (S: Paints, list: string[], id = 'stem') => G(id, [L(list.join(''), S.wood(SW), S.main)]);
function leafPairs(S: Paints, curves: [V2, V2, V2][], n: number, len: number, pal: Pal, id = 'leaves') {
  const set = leafSet();
  for (const [a, cc, b] of curves)
    for (let j = 1; j <= n; j++) {
      const t = j / (n + 0.4);
      const p = qp(a, cc, b, t);
      const tn = qa(a, cc, b, t);
      set.add(leaf('ovate', p[0], p[1], len * (1 - t * 0.3), tn - 0.9, S, 0.8)).add(leaf('ovate', p[0], p[1], len * (1 - t * 0.3), tn + 0.9, S, 0.8));
    }
  return leavesNode(S, id, set, pal);
}
function shrub(c: FormCtx, masses: Mass[], o: { seed?: number; stems?: string[]; stars?: [number, number, number?][]; nStars?: number } = {}) {
  const { S } = c;
  const cr = crown(S, masses, { kind: 'ovate', ll: 8, rim: 1.6, pal: S.fol, seed: o.seed || 3, dense: true });
  const nodes: Kids = [o.stems ? sprigs(S, o.stems) : null, cr.node, stars(S, o.stars || upperRim(masses, o.nStars || 8, o.seed || 4))];
  return { cr, nodes };
}
const sampaguita: FormLine = {
  pal: 'pearl',
  fol: 'grove',
  forms: {
    I: (c) => {
      const { S } = c;
      const set = leafSet();
      set
        .add(leaf('ovate', 101, 152, 14, -155 * D2R, S, 0.8))
        .add(leaf('ovate', 101, 152, 14, -25 * D2R, S, 0.8))
        .add(leaf('ovate', 103, 140, 10, -120 * D2R, S, 0.8))
        .add(leaf('ovate', 103, 140, 10, -60 * D2R, S, 0.8));
      return {
        cutaway: cutaway(S, 64, 136, 171, 190, 13),
        body: [G('roots', [L('M95 180Q90 184 86 188M96 181Q98 186 104 189M95 181L93 189', S.wood(SW), S.fine * 1.4)]), G('stem', [L('M95 181L103 138', S.wood(SW), S.main * 1.7)]), leavesNode(S, 'sprout', set, S.fol)],
        perch: [74, 170],
      };
    },
    II: (c) => {
      const { S } = c;
      const cv: [V2, V2, V2][] = [
        [[100, 171], [86, 124], [70, 96]],
        [[100, 171], [114, 116], [128, 84]],
      ];
      const bud = leafSet()
        .add(leaf('narrow', 70, 96, 9, -130 * D2R, S))
        .add(leaf('narrow', 66, 100, 7, -160 * D2R, S))
        .add(leaf('narrow', 128, 84, 9, -60 * D2R, S))
        .add(leaf('narrow', 132, 90, 7, -20 * D2R, S));
      return {
        body: [sprigs(S, cv.map(([a, cc, b]) => Q(a, cc, b))), leafPairs(S, cv, 3, 14, S.fol), S.icon ? null : G('bud', [P(bud.wash(), LEAF[S.pal].light, { opacity: 0.95 }), L(bud.line(), S.starLine, S.fine * 1.2)])],
        perch: [80, 150],
      };
    },
    III: (c) => {
      const ms = [M(66, 148, 18, 14, 1), M(134, 148, 18, 14, 5), M(80, 128, 20, 16, 2), M(120, 128, 20, 16, 4), M(100, 116, 22, 17, 3)];
      const s = shrub(c, ms, { stems: ['M100 171L80 140M100 171L100 124M100 171L120 140'], nStars: 6 });
      return { body: s.nodes, perch: [62, 136], organs: s.cr.organs };
    },
    IV: (c) => {
      const { S } = c;
      const ms = [M(46, 140, 22, 16, 1), M(154, 140, 22, 16, 5), M(66, 112, 26, 20, 2), M(134, 112, 26, 20, 4), M(100, 96, 30, 22, 3)];
      const s = shrub(c, ms, { stems: ['M100 171L60 140M100 171L100 100M100 171L140 140'], nStars: 12, seed: 5 });
      const sp = leafSet();
      for (const [x, y, a] of [
        [26, 126, -160],
        [174, 126, -20],
        [30, 116, -140],
        [170, 116, -40],
      ])
        sp.add(leaf('ovate', x, y, 12, a * D2R, S, 0.8));
      const g0: V2 = [58, 132];
      const gc: V2 = [100, 168];
      const g1: V2 = [142, 132];
      const gp: [number, number, number][] = [];
      for (let t = 0.08; t < 0.95; t += 0.12) gp.push([...qp(g0, gc, g1, t), 0.8]);
      return {
        body: [
          leavesNode(S, 'sprays', sp, S.fol, [L('M40 136Q32 128 26 126M160 136Q168 128 174 126', S.wood(SW), S.fine * 1.4)]),
          ...s.nodes,
          S.icon ? null : G('garland', [L(Q(g0, gc, g1) + `M${g0[0]} ${g0[1]}l-1 8M${g1[0]} ${g1[1]}l1 8`, S.starLine, S.fine * 1.2)]),
          stars(S, gp, 3.4, 'garland-flowers'),
        ],
        glow: [100, 116, 74],
        perch: [100, 72],
        organs: s.cr.organs,
      };
    },
  },
  flavours: {
    lookout: (c) => {
      const ms = [M(78, 78, 16, 13, 1), M(122, 78, 16, 13, 5), M(86, 60, 16, 13, 2), M(114, 60, 16, 13, 4), M(100, 50, 18, 14, 3), M(100, 72, 20, 14, 3)];
      const s = shrub(c, ms, { stems: ['M100 171L100 80'], nStars: 8, seed: 6 });
      s.nodes[0] = G('trunk', [L('M100 171L100 80', c.S.wood(SW), c.S.main * 2.2)]);
      return { body: s.nodes, glow: [100, 68, 52], perch: [100, 34], organs: s.cr.organs };
    },
    moot: (c) => {
      const fl = { flat: 0.45 };
      const ms = [M(62, 150, 28, 12, 1, fl), M(138, 150, 28, 12, 5, fl), M(100, 148, 30, 13, 2, fl), M(86, 112, 22, 10, 3, fl), M(114, 112, 22, 10, 4, fl)];
      const s = shrub(c, ms, { stems: ['M100 160L100 112'], nStars: 7, seed: 7 });
      const st = groundStones(c);
      return { body: s.nodes, back: st.back, front: st.front, glow: [100, 130, 66], perch: [62, 136], organs: s.cr.organs };
    },
    espalier: (c) => {
      const { S } = c;
      const angs = [-154, -122, -90, -58, -26];
      const R0 = c.inPot ? Math.min(78, c.span + 50) : 78;
      const slats = angs.map((a) => `M100 171L${f(100 + Math.cos(a * D2R) * R0)} ${f(171 + Math.sin(a * D2R) * R0)}`).join('');
      // A stem's length follows its domain (the trellis slats stay where they are).
      const cv = angs.map((a, i): [V2, V2, V2] => {
        const k = S.sc(i + 1);
        return [
          [100, 171],
          [100 + Math.cos(a * D2R) * R0 * 0.4 * k, 171 + Math.sin(a * D2R) * R0 * 0.5 * k],
          [100 + Math.cos(a * D2R) * R0 * 0.86 * k, 171 + Math.sin(a * D2R) * R0 * 0.86 * k],
        ];
      });
      const gs = cv.map((cc, i) => leafPairs(S, [cc], 3, 12, S.fol, `domain-${i + 1}`));
      return {
        back: [G('frame', [L(slats, S.wood(POST), S.fine * 1.6)])],
        body: [
          sprigs(S, cv.map(([a, cc, b]) => Q(a, cc, b))),
          G('canopy', gs),
          ties(
            S,
            cv.map(([a, cc, b]): [number, number, number] => {
              const p = qp(a, cc, b, 0.6);
              return [f(p[0] - 3), f(p[0] + 3), f(p[1])];
            }),
          ),
          stars(S, cv.map(([, , b]): [number, number, number] => [b[0], b[1] - 2, 1.1]).concat(cv.map(([a, cc, b]): [number, number, number] => [...qp(a, cc, b, 0.7), 0.8]))),
        ],
        glow: [100, 120, 74],
        perch: [40, 120],
        organs: cv.map(([, , b], i) => ({ dom: i + 1, x: b[0], y: b[1] })),
      };
    },
    coppice: (c) => {
      const { S } = c;
      const tips: V2[] = [
        [64, 106],
        [80, 92],
        [100, 84],
        [120, 92],
        [136, 106],
      ];
      const ms = tips.map(([x, y], i) => M(x, y, 13, 11, i + 1));
      const s = shrub(c, ms, { stems: tips.map(([x, y]) => `M${f(96 + (x - 100) * 0.08)} 160Q${f((x + 100) / 2)} ${f((y + 160) / 2 + 6)} ${x} ${y + 6}`), nStars: 7, seed: 8 });
      const stool = 'M84 171C84 162 90 158 100 158C110 158 116 162 116 171Z';
      const shoot = leafPairs(
        S,
        [
          [[90, 162], [84, 148], [78, 136]],
          [[110, 162], [118, 150], [124, 140]],
        ],
        2,
        10,
        S.fol,
        'shoots',
      );
      return { body: [G('stool', [P(stool, S.woodFill(SW)), L(stool, S.wood(SW), S.main)]), shoot, ...s.nodes], glow: [100, 112, 68], perch: [56, 94], organs: s.cr.organs };
    },
    holdfast: (c) => {
      const { S } = c;
      const r = rockAt(c, 36, 26);
      const ms = [M(72, 116, 22, 16, 1, { dense: true }), M(128, 116, 22, 16, 5, { dense: true }), M(82, 98, 22, 16, 2, { dense: true }), M(118, 98, 22, 16, 4, { dense: true }), M(100, 90, 26, 18, 3, { dense: true }), M(100, 114, 26, 18, 3, { dense: true })];
      const s = shrub(c, ms, { nStars: 6, seed: 9 });
      return {
        back: [r.node],
        body: [
          rootTapers(
            S,
            [
              [[96, r.top + 2], [r.X(76), r.top + 6], [r.X(70), 171], 4, 1.4],
              [[99, r.top + 2], [r.X(90), r.top + 14], [r.X(92), 171], 3.4, 1.4],
              [[101, r.top + 2], [r.X(112), r.top + 14], [r.X(110), 171], 3.4, 1.4],
              [[104, r.top + 2], [r.X(124), r.top + 6], [r.X(130), 171], 4, 1.4],
            ],
            SW,
          ),
          G('trunk', [L(`M100 ${f(r.top + 3)}L100 124`, S.wood(SW), S.main * 2.4)]),
          ...s.nodes,
        ],
        glow: [100, 104, 64],
        perch: [64, 102],
        organs: s.cr.organs,
      };
    },
  },
};

// ── CACTUS (its own terracotta pot) ─────────────────────────────────────
const colD = (x: number, y0: number, h: number, w: number) => `M${f(x - w / 2)} ${f(y0)}L${f(x - w / 2)} ${f(y0 - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w / 2)} ${f(y0 - h + w / 2)}L${f(x + w / 2)} ${f(y0)}Z`;
/** An arm: out from the column, an elbow, then up. side ±1; y = the arm's lower edge. */
function armD(cx: number, cw: number, side: number, y: number, len: number, up: number, ww: number): string {
  const x0 = cx + side * cw * 0.4;
  const x1 = cx + side * (cw * 0.5 + len);
  const o = (side * ww) / 2;
  if (up <= ww) return `M${f(x0)} ${f(y)}L${f(x1)} ${f(y)}A${f(ww / 2)} ${f(ww / 2)} 0 0 ${side > 0 ? 0 : 1} ${f(x1)} ${f(y - ww)}L${f(x0)} ${f(y - ww)}Z`;
  return `M${f(x0)} ${f(y)}L${f(x1 - o)} ${f(y)}Q${f(x1 + o)} ${f(y)} ${f(x1 + o)} ${f(y - ww)}L${f(x1 + o)} ${f(y - up)}A${f(ww / 2)} ${f(ww / 2)} 0 0 ${side > 0 ? 0 : 1} ${f(x1 - o)} ${f(y - up)}L${f(x1 - o)} ${f(y - ww)}L${f(x0)} ${f(y - ww)}Z`;
}
function spines(S: Paints, segs: [number, number, number, number, number][]): string {
  if (S.icon) return '';
  let d = '';
  for (const [x0, y0, x1, y1, side] of segs)
    for (let t = 0.1; t < 0.95; t += S.full ? 0.1 : 0.16) {
      const x = lerp(x0, x1, t);
      const y = lerp(y0, y1, t);
      d += `M${f(x)} ${f(y)}l${f(side * 2.6)} -1.2`;
    }
  return d;
}
/** A cactus body: the column (D3) and its arms [side, yFrac, len, up, domain]. An arm's reach follows its domain. */
function cactusBody(c: FormCtx, H: number, w: number, arms: [number, number, number, number, number?][], o: { armW?: number; ids?: boolean } = {}) {
  const { S } = c;
  const fol = S.fol;
  const base = 171;
  const col = colD(100, base, H, w);
  const gs: GNode[] = [];
  const organs: Organ[] = [{ dom: 3, x: 100, y: base - H * 0.6 }];
  const ribs = S.full ? `M100 ${base - 2}L100 ${f(base - H + 5)}M${f(100 - w * 0.25)} ${base - 2}L${f(100 - w * 0.25)} ${f(base - H + w * 0.5)}M${f(100 + w * 0.25)} ${base - 2}L${f(100 + w * 0.25)} ${f(base - H + w * 0.5)}` : '';
  const sp0 = spines(S, [
    [100 - w / 2, base - 6, 100 - w / 2, base - H + 6, -1],
    [100 + w / 2, base - 6, 100 + w / 2, base - H + 6, 1],
  ]);
  arms.forEach(([side, ty, len0, up0, dom]) => {
    const k = dom ? S.sc(dom) : 1;
    const len = len0 * k;
    const up = up0 * k;
    const ww = w * (o.armW || 0.62);
    const y = base - H * ty;
    const d = armD(100, w, side, y, len, up, ww);
    const x1 = 100 + side * (w * 0.5 + len);
    const sp = spines(S, [[x1 + (side * ww) / 2, y - ww, x1 + (side * ww) / 2, y - up + 2, side]]);
    gs.push(
      G(dom ? `domain-${dom}` : null, [
        P(d, S.massFill(fol, true)),
        L(d + (S.full && up > ww ? `M${f(x1)} ${f(y - ww)}L${f(x1)} ${f(y - up + 2)}` : ''), S.lineOf(fol), S.icon ? S.main : S.fine * 1.5),
        sp ? L(sp, S.lineOf(fol), S.hair * 1.4, { opacity: 0.8 }) : null,
      ]),
    );
    if (dom) organs.push({ dom, x: x1, y: y - up * 0.6 });
  });
  const main = G(o.ids === false ? null : 'domain-3', [
    P(col, S.massFill(fol, true)),
    ribs ? L(ribs, S.lineOf(fol), S.hair * 1.4, { opacity: 0.7 }) : null,
    L(col, S.lineOf(fol), S.icon ? S.main : S.fine * 1.6),
    sp0 ? L(sp0, S.lineOf(fol), S.hair * 1.4, { opacity: 0.8 }) : null,
  ]);
  return { node: G('canopy', [main, ...gs]), organs, top: base - H };
}
function cactusBlooms(S: Paints, pts: [number, number, number?][], len = 9): GNode | null {
  if (!pts.length) return null;
  let d = '';
  for (const [x, y, a0] of pts) for (let i = 0; i < 5; i++) d += xf('M0 0Q0.42 -0.55 0 -1Q-0.42 -0.55 0 0Z', x, y, ((a0 || -90) + (i - 2) * 30) * D2R + Math.PI / 2, len) + ' ';
  return G('blooms', [P(d, S.washOf(S.pal), { opacity: 0.88 }), L(d, S.lineOf(S.pal), S.fine * 1.4)]);
}
const cactus: FormLine = {
  pal: 'blossom',
  fol: 'cactus',
  forms: {
    I: (c) => {
      const { S } = c;
      const r = 9;
      const cy = 162;
      const ring = disc(100, cy, r);
      let sp = '';
      if (!S.icon)
        for (let i = 0; i < 7; i++) {
          const a = (-160 + i * 23) * D2R;
          sp += `M${f(100 + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}l${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3)}`;
        }
      return {
        body: [G('sprout', [P(ring, S.massFill(S.fol, true)), L(ring + (S.full ? `M100 ${cy - r}Q96 ${cy} 100 ${cy + r}M100 ${cy - r}Q104 ${cy} 100 ${cy + r}` : ''), S.lineOf(S.fol), S.main), sp ? L(sp, S.lineOf(S.fol), S.fine * 1.2) : null])],
        perch: [84, 168],
      };
    },
    II: (c) => {
      const b = cactusBody(c, 56, 16, [], { ids: false });
      return { body: [b.node], perch: [86, 150] };
    },
    III: (c) => {
      const { S } = c;
      const b = cactusBody(c, 72, 18, [
        [-1, 0.42, 8, 13, 1],
        [1, 0.56, 8, 14, 4],
        [-1, 0.7, 6, 10, 2],
        [1, 0.3, 7, 10, 5],
      ]);
      const bud = leafSet().add(leaf('lens', 100, b.top + 2, 10, -90 * D2R, S, 0.7));
      return { body: [b.node, S.icon ? null : G('bud', [P(bud.wash(), S.washOf(S.pal), { opacity: 0.85 }), L(bud.line(), S.lineOf(S.pal), S.fine * 1.4)])], perch: [76, 120], organs: b.organs };
    },
    IV: (c) => {
      const b = cactusBody(c, 98, 20, [
        [-1, 0.32, 16, 46, 1],
        [1, 0.44, 14, 40, 4],
        [-1, 0.6, 11, 30, 2],
        [1, 0.24, 20, 34, 5],
      ]);
      // The left arm's flower sits on its tip, wherever the arm's domain has grown it to.
      const k1 = c.S.sc(1);
      const tipX = 100 - 18 - 16 * k1;
      const tipY = 171 - 98 * 0.32 - 46 * k1 + 2;
      return {
        body: [
          b.node,
          cactusBlooms(
            c.S,
            [
              [94, b.top + 4, -110],
              [106, b.top + 4, -70],
              [100, b.top + 1, -90],
              [tipX, tipY, -90],
            ],
            10,
          ),
        ],
        glow: [100, 104, 66],
        perch: [64, 110],
        organs: b.organs,
      };
    },
  },
  flavours: {
    lookout: (c) => {
      const b = cactusBody(c, 122, 16, [
        [-1, 0.2, 6, 10, 1],
        [1, 0.26, 6, 10, 4],
        [-1, 0.33, 5, 8, 2],
        [1, 0.4, 5, 8, 5],
      ]);
      return { body: [b.node, cactusBlooms(c.S, [[100, b.top + 1, -90]], 11)], glow: [100, 72, 52], perch: [86, 64], organs: b.organs };
    },
    moot: (c) => {
      const st = groundStones(c);
      const b = cactusBody(
        c,
        80,
        20,
        [
          [-1, 0.34, 22, 0, 1],
          [1, 0.34, 22, 0, 5],
          [-1, 0.62, 16, 0, 2],
          [1, 0.62, 16, 0, 4],
        ],
        { armW: 0.6 },
      );
      return { body: [b.node, cactusBlooms(c.S, [[100, b.top + 1, -90]], 10)], back: st.back, front: st.front, glow: [100, 120, 60], perch: [70, 132], organs: b.organs };
    },
    espalier: (c) => {
      const { S } = c;
      const b = cactusBody(c, 96, 18, [
        [-1, 0.36, 14, 44, 1],
        [1, 0.36, 14, 44, 5],
        [-1, 0.62, 8, 22, 2],
        [1, 0.62, 8, 22, 4],
      ]);
      const tipY = (dom: number) => 171 - 96 * 0.36 - 44 * S.sc(dom) + 2;
      const tipX = (dom: number, side: number) => 100 + side * (17 + 14 * S.sc(dom));
      return {
        back: [G('frame', [L('M100 171L100 52', S.wood(POST), S.main * 1.3), L(oval(100, 100, 36, 34), S.wood(POST), S.fine * 1.5)])],
        body: [
          b.node,
          ties(S, [
            [66, 72, 114],
            [128, 134, 114],
          ]),
          cactusBlooms(
            S,
            [
              [100, b.top + 1, -90],
              [tipX(1, -1), tipY(1), -90],
              [tipX(5, 1), tipY(5), -90],
            ],
            9,
          ),
        ],
        glow: [100, 100, 62],
        perch: [64, 110],
        organs: b.organs,
      };
    },
    coppice: (c) => {
      const { S } = c;
      const sp = c.inPot ? Math.min(c.span - 6, 30) : 34;
      const b = cactusBody(c, 64, 18, []);
      const pups: [number, number, number, 'g' | 'c'][] = [
        [100 - sp, 9, 1, 'g'],
        [100 - sp * 0.55, 30, 2, 'c'],
        [100 + sp * 0.55, 34, 4, 'c'],
        [100 + sp, 8, 5, 'g'],
      ];
      const gs = pups.map(([x, s0, dom, k]) => {
        const s = s0 * S.sc(dom);
        const d = k === 'g' ? disc(x, 171 - s, s) : colD(x, 171, s, 11);
        const segs: [number, number, number, number, number][] =
          k === 'g'
            ? [
                [x - s, 171 - s, x - s * 0.4, 171 - s * 1.8, -1],
                [x + s, 171 - s, x + s * 0.4, 171 - s * 1.8, 1],
              ]
            : [
                [x - 5.5, 168, x - 5.5, 171 - s + 4, -1],
                [x + 5.5, 168, x + 5.5, 171 - s + 4, 1],
              ];
        return G(`domain-${dom}`, [P(d, S.massFill(S.fol, true)), L(d, S.lineOf(S.fol), S.icon ? S.main : S.fine * 1.5), L(spines(S, segs), S.lineOf(S.fol), S.hair * 1.4, { opacity: 0.8 })]);
      });
      return {
        body: [
          G('canopy', [...b.node.children, ...gs]),
          cactusBlooms(
            S,
            [
              [96, b.top + 3, -110],
              [104, b.top + 3, -70],
            ],
            9,
          ),
        ],
        glow: [100, 130, 56],
        perch: [100 - sp, 156],
        organs: [...b.organs, ...pups.map(([x, s, dom]) => ({ dom, x, y: 171 - s }))],
      };
    },
    holdfast: (c) => {
      const { S } = c;
      const r = rockAt(c, 30, 26);
      const cx = 92;
      const cy = 140;
      const rx = 26;
      const ry = 26;
      const barrel = oval(cx, cy, rx, ry);
      let ribs = '';
      if (!S.icon) for (const u of [-0.6, -0.25, 0.1, 0.45]) ribs += `M${f(cx + u * rx)} ${f(cy - ry + 3)}Q${f(cx + u * rx * 1.25)} ${f(cy)} ${f(cx + u * rx)} ${f(cy + ry - 3)}`;
      let sp = '';
      if (!S.icon)
        for (let i = 0; i < (S.full ? 22 : 12); i++) {
          const a = (-180 + i * (360 / (S.full ? 22 : 12))) * D2R;
          sp += `M${f(cx + Math.cos(a) * rx)} ${f(cy + Math.sin(a) * ry)}l${f(Math.cos(a) * 5)} ${f(Math.sin(a) * 5)}`;
        }
      // One barrel: it is every domain, so D1, D2, D4 and D5 are empty groups and every organ is the barrel.
      const dom = (k: number) => G(`domain-${k}`, []);
      return {
        back: [G('stone', [r.node.children[0], r.node.children[1], r.node.children[2]], { transform: 'translate(22 0)' })],
        body: [
          G('canopy', [
            G('domain-3', [P(barrel, S.massFill(S.fol, true)), ribs ? L(ribs, S.lineOf(S.fol), S.hair * 1.4, { opacity: 0.7 }) : null, L(barrel, S.lineOf(S.fol), S.icon ? S.main : S.fine * 1.6), sp ? L(sp, S.lineOf(S.fol), S.hair * 1.6) : null]),
            dom(1),
            dom(2),
            dom(4),
            dom(5),
          ]),
          cactusBlooms(
            S,
            [
              [82, 116, -120],
              [92, 113, -95],
              [102, 114, -70],
            ],
            9,
          ),
        ],
        glow: [96, 126, 56],
        perch: [124, 130],
        organs: [1, 2, 3, 4, 5].map((d) => ({ dom: d, x: cx, y: cy })),
      };
    },
  },
};

// ── BAMBOO ──────────────────────────────────────────────────────────────
function culm(S: Paints, p0: V2, pc: V2, p1: V2, w0: number, w1: number, nodes = 8) {
  const t = taper(p0, pc, p1, w0, w1, 12);
  let nd = '';
  if (!S.icon)
    for (let i = 1; i < nodes; i++) {
      const u = i / nodes;
      const p = qp(p0, pc, p1, u);
      const a = qa(p0, pc, p1, u);
      const n: V2 = [-Math.sin(a), Math.cos(a)];
      const w = lerp(w0, w1, u) / 2 + 0.5;
      nd += `M${f(p[0] - n[0] * w)} ${f(p[1] - n[1] * w)}L${f(p[0] + n[0] * w)} ${f(p[1] + n[1] * w)}`;
    }
  return { fill: t.closed, sides: t.sides, nodes: nd };
}
function spray(S: Paints, set: ReturnType<typeof leafSet>, x: number, y: number, deg: number, n: number, l: number, spread = 24) {
  for (let i = 0; i < n; i++) {
    const a = deg + ((i - (n - 1) / 2) * (spread * 2)) / Math.max(1, n - 1);
    set.add(leaf('long', x, y, l * (0.85 + (0.15 * (((i * 7) % 3) / 2))), a * D2R, S));
  }
}
type CulmSpec = [V2, V2, V2, number, number, (number | null)?, number[]?];
/** Culms as domain groups: [p0, pc, p1, w0, w1, domain, spray positions]. A culm's height follows its domain. */
function culms(S: Paints, list: CulmSpec[], o: { nodes?: number; iconBare?: boolean } = {}) {
  const pal = S.pal;
  const organs: Organ[] = [];
  const gs = list.map(([p0, pc0, p10, w0, w1, dom, ts]) => {
    const k = dom ? S.sc(dom) : 1;
    const pc: V2 = [p0[0] + (pc0[0] - p0[0]) * k, p0[1] + (pc0[1] - p0[1]) * k];
    const p1: V2 = [p0[0] + (p10[0] - p0[0]) * k, p0[1] + (p10[1] - p0[1]) * k];
    const cm = culm(S, p0, pc, p1, w0, w1, o.nodes || 9);
    const set = leafSet();
    if (!(S.icon && o.iconBare))
      for (const t of ts || [0.66, 0.82, 0.96]) {
        const p = qp(p0, pc, p1, t);
        const out = p[0] < 100 ? -1 : p[0] > 100 ? 1 : t > 0.8 ? 1 : -1;
        spray(S, set, p[0], p[1], out < 0 ? 200 : -20, S.icon ? 2 : 3, S.small ? 17 : 14, 24);
      }
    if (dom) organs.push({ dom, x: p1[0], y: p1[1] });
    return G(dom ? `domain-${dom}` : null, [
      P(cm.fill, S.massFill(pal)),
      L(cm.sides, S.lineOf('spring'), S.icon ? S.main : S.fine * 1.5),
      cm.nodes ? L(cm.nodes, S.lineOf('spring'), S.hair * 1.6) : null,
      set.n() ? P(set.wash(), S.washOf(pal), { opacity: S.washOp }) : null,
      set.n() ? L(set.line(), S.lineOf(pal), S.fine * 1.3) : null,
    ]);
  });
  return { node: G('canopy', gs), organs };
}
function sheathCone(S: Paints, x: number, yb: number, h: number, w: number) {
  const d = `M${f(x - w / 2)} ${f(yb)}C${f(x - w / 2)} ${f(yb - h * 0.5)} ${f(x - w * 0.12)} ${f(yb - h * 0.85)} ${f(x)} ${f(yb - h)}C${f(x + w * 0.12)} ${f(yb - h * 0.85)} ${f(x + w / 2)} ${f(yb - h * 0.5)} ${f(x + w / 2)} ${f(yb)}Z`;
  let sc = '';
  if (!S.icon)
    for (let i = 1; i < 4; i++) {
      const y = yb - h * i * 0.23;
      const hw = (w / 2) * (1 - i * 0.2);
      sc += `M${f(x - hw)} ${f(y + 2)}Q${f(x)} ${f(y - 3)} ${f(x + hw * 0.7)} ${f(y - 4)}`;
    }
  return { d, sc };
}
function shoots(S: Paints, list: [number, number, number][], id = 'shoot') {
  let d = '';
  let sc = '';
  for (const [x, h, w] of list) {
    const s = sheathCone(S, x, 171, h, w);
    d += s.d;
    sc += s.sc;
  }
  const col = A0.bamboo.sheathMid;
  return G(id, [P(d, S.woodFill(col)), L(d + sc, S.wood(col), S.fine * 1.4)]);
}
const V5: CulmSpec[] = [
  [[90, 171], [84, 110], [58, 62], 6.5, 4, 1],
  [[95, 171], [90, 100], [80, 42], 6.5, 4, 2],
  [[100, 171], [100, 96], [102, 32], 7, 4, 3],
  [[105, 171], [110, 100], [124, 46], 6.5, 4, 4],
  [[110, 171], [116, 112], [144, 66], 6.5, 4, 5],
];
const bamboo: FormLine = {
  pal: 'grove',
  forms: {
    I: (c) => {
      const { S } = c;
      const s = sheathCone(S, 100, 171, 40, 26);
      const set = leafSet()
        .add(leaf('long', 100, 132, 13, -112 * D2R, S))
        .add(leaf('long', 100, 132, 11, -70 * D2R, S));
      const col = A0.bamboo.sheathMid;
      return {
        cutaway: cutaway(S, 62, 138, 171, 190, 14),
        body: [
          G('roots', [L('M70 180L130 180', S.wood(col), S.main), S.icon ? null : L('M84 177L84 183M100 177L100 183M116 177L116 183M78 180l-3 5M92 180l2 6M108 180l-2 6M124 180l3 5', S.wood(col), S.fine)]),
          G('sprout', [P(s.d, S.woodFill(col)), L(s.d + s.sc, S.wood(col), S.main)]),
          leavesNode(S, 'leaves', set, S.pal),
        ],
        perch: [74, 170],
      };
    },
    II: (c) => {
      const { S } = c;
      const cm = culms(S, [[[98, 171], [96, 100], [108, 40], 7, 4.5, null, [0.55, 0.66, 0.77, 0.88, 0.99]]]);
      return { body: [cm.node, shoots(S, [[122, 16, 10]])], perch: [76, 150] };
    },
    III: (c) => {
      const cm = culms(c.S, V5);
      return { body: [cm.node], perch: [62, 96], organs: cm.organs };
    },
    IV: (c) => {
      const { S } = c;
      const Lc: [V2, V2, V2][] = [
        [[58, 171], [26, 44], [99, 26]],
        [[66, 171], [38, 60], [97, 40]],
        [[74, 171], [56, 100], [84, 64]],
      ];
      const Cs: [V2, V2, V2][] = [...Lc, ...Lc.map(([a, cc, b]): [V2, V2, V2] => [[200 - a[0], a[1]], [200 - cc[0], cc[1]], [200 - b[0], b[1]]])];
      const doms = [1, 2, 3, 5, 4, 3];
      const cm = culms(
        S,
        [0, 3, 1, 4, 2, 5].map((i): CulmSpec => [...Cs[i], 7, 4, doms[i], i % 3 === 2 ? [0.95] : [0.72, 0.86, 0.98]]),
      );
      return {
        body: [S.icon ? null : G('roots', [L('M60 171q6 -4 12 0q6 -4 12 0M116 171q6 -4 12 0q6 -4 12 0', S.wood(A0.bamboo.sheathMid), S.fine * 1.4)]), cm.node, shoots(S, [[92, 10, 7], [110, 8, 6]])],
        glow: [100, 104, 52],
        perch: [100, 22],
        organs: cm.organs,
      };
    },
  },
  flavours: {
    lookout: (c) => {
      const cm = culms(c.S, [
        [[90, 171], [86, 130], [72, 88], 6, 4, 1],
        [[95, 171], [92, 124], [86, 72], 6, 4, 2],
        [[105, 171], [108, 124], [114, 72], 6, 4, 4],
        [[110, 171], [114, 130], [128, 88], 6, 4, 5],
        [[100, 171], [100, 90], [102, 14], 7, 4, 3, [0.8, 0.9, 0.99]],
      ]);
      return { body: [cm.node], glow: [100, 76, 58], perch: [102, 6], organs: cm.organs };
    },
    moot: (c) => {
      const { S } = c;
      const xs = [80, 90, 100, 110, 120];
      const cm = culms(
        S,
        xs.map((x, i): CulmSpec => [[x, 171], [x, 110], [x, 40 + Math.abs(i - 2) * 6], 6, 4.2, null, []]),
      );
      const fl = { flat: 0.5 };
      const cr = crown(S, [M(58, 102, 24, 9, 1, fl), M(142, 102, 24, 9, 5, fl), M(72, 70, 24, 9, 2, fl), M(128, 70, 24, 9, 4, fl), M(100, 44, 30, 10, 3, fl)], { kind: 'long', ll: 9, pal: S.pal, seed: 17 });
      const st = groundStones(c);
      return {
        body: [G('culms', cm.node.children), G('branches', [L('M80 106L60 102M120 106L140 102M90 74L74 70M110 74L126 70', S.lineOf('spring'), S.fine * 1.4)]), cr.node],
        back: st.back,
        front: st.front,
        glow: [100, 92, 72],
        perch: [58, 90],
        organs: cr.organs,
      };
    },
    espalier: (c) => {
      const { S } = c;
      const w = c.inPot ? Math.min(46, c.span + 14) : 46;
      const xs = [-1, -0.5, 0, 0.5, 1].map((u) => 100 + u * w * 0.85);
      const cm = culms(
        S,
        xs.map((x, i): CulmSpec => [[x, 171], [x, 120], [x, 54 - (i === 2 ? 10 : 0)], 6, 4.2, i + 1, [0.8, 0.94]]),
      );
      return {
        back: [G('frame', [L(`M${100 - w} 171L${100 - w} 70M${100 + w} 171L${100 + w} 70`, S.wood(POST), S.main * 1.5), S.icon ? null : L(`M${100 - w} 124L${100 + w} 124M${100 - w} 84L${100 + w} 84`, S.wood(POST), S.fine * 1.5)])],
        body: [cm.node, ties(S, xs.flatMap((x): [number, number, number][] => [[f(x - 3), f(x + 3), 124], [f(x - 3), f(x + 3), 84]]))],
        glow: [100, 96, 66],
        perch: [100 - w, 66],
        organs: cm.organs,
      };
    },
    coppice: (c) => {
      const { S } = c;
      const L9: [number, number, number][] = [
        [86, 66, -26],
        [91, 54, -14],
        [96, 76, -6],
        [100, 48, 2],
        [104, 72, 8],
        [109, 58, 16],
        [114, 70, 28],
        [82, 98, -36],
        [118, 96, 36],
      ];
      const doms = [1, 2, 2, 3, 3, 4, 4, 1, 5];
      const cm = culms(
        S,
        L9.map(([x, top, lean], i): CulmSpec => [[x, 171], [x + lean * 0.2, (171 + top) / 2], [x + lean, top], 5.4, 3.6, doms[i], [0.8, 0.97]]),
      );
      return {
        body: [
          cm.node,
          shoots(S, [
            [78, 14, 8],
            [92, 18, 9],
            [108, 12, 7],
            [122, 16, 8],
          ]),
        ],
        glow: [100, 92, 66],
        perch: [64, 80],
        organs: cm.organs,
      };
    },
    holdfast: (c) => {
      const { S } = c;
      const r = rockAt(c, 40, 24);
      const col = A0.bamboo.sheathMid;
      const xs = [86, 92, 98, 104, 110, 116];
      const cm = culms(
        S,
        xs.map((x, i): CulmSpec => [[x, r.top + 6], [x, 100], [x + (i - 2.5) * 2, 30 + Math.abs(i - 2.5) * 6], 6, 4, [1, 2, 3, 3, 4, 5][i], [0.62, 0.78, 0.94]]),
      );
      const roots: Limb[] = [
        [[88, r.top + 6], [r.X(70), r.top + 8], [r.X(64), 171], 4, 1.6],
        [[96, r.top + 7], [r.X(88), r.top + 18], [r.X(88), 171], 3.6, 1.6],
        [[106, r.top + 7], [r.X(114), r.top + 18], [r.X(114), 171], 3.6, 1.6],
        [[114, r.top + 6], [r.X(132), r.top + 8], [r.X(138), 171], 4, 1.6],
      ];
      return { back: [r.node], body: [rootTapers(S, roots, col), cm.node], glow: [100, 84, 66], perch: [70, 70], organs: cm.organs };
    },
  },
};

export const FLOWER_LINES: Record<'sunflower' | 'lotus' | 'sampaguita' | 'cactus' | 'bamboo', FormLine> = { sunflower, lotus, sampaguita, cactus, bamboo };
export type { FormBuilder, FlavourId };
