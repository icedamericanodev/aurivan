/** Path maths for components/motifs.tsx, the tab seals (mobile 1.43, tab header option C). No React, so it can be previewed in node. */
const f = (n: number) => n.toFixed(1);
type Pt = [number, number];

/** The same lens leaf as glyphs.tsx (`leafPath`): outline + midrib, from (x,y) at angle a. */
function lens(x: number, y: number, L: number, W: number, a: number): string {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const P = (u: number, v: number) => `${f(x + u * c - v * s)},${f(y + u * s + v * c)}`;
  return `M${f(x)},${f(y)} Q${P(L * 0.42, -W)} ${P(L, 0)} Q${P(L * 0.42, W)} ${f(x)},${f(y)} M${P(L * 0.12, 0)} L${P(L * 0.78, 0)}`;
}

/** A seed clock: a stem, a small receptacle, pappus rays each ending in a little fan, two seeds adrift. */
export function seedheadPath(): string {
  const cx = 104;
  const cy = 96;
  let d = `M150,250 Q118,176 ${cx + 2},${cy + 9}`;
  // The receptacle: a small dome (two arcs, no fill).
  d += ` M${cx - 7},${cy + 3} Q${cx},${cy - 6} ${cx + 7},${cy + 3}`;
  const ray = (x: number, y: number, a: number, r0: number, r1: number) => {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ex = x + r1 * ca;
    const ey = y + r1 * sa;
    let s = ` M${f(x + r0 * ca)},${f(y + r0 * sa)} L${f(ex)},${f(ey)}`;
    // The pappus: three short hairs fanning out from the ray's tip.
    for (const k of [-0.75, -0.35, 0.05, 0.45]) s += ` M${f(ex)},${f(ey)} L${f(ex + 8 * Math.cos(a + k))},${f(ey + 8 * Math.sin(a + k))}`;
    return s;
  };
  // Rays round the full circle except where the stem leaves (down and to the right).
  const n = 17;
  const gapFrom = 0.75; // radians: the stem side (about 43°–110°)
  const gapTo = 1.95;
  const span = 2 * Math.PI - (gapTo - gapFrom);
  for (let i = 0; i < n; i++) {
    const a = gapTo + (span * i) / (n - 1);
    const r1 = 54 + ((i * 37) % 9); // a little unevenness, fixed
    d += ray(cx, cy, a, 8, r1);
  }
  // Two seeds adrift, up and to the left.
  d += ray(40, 46, -2.3, 0, 20);
  d += ray(30, 150, 2.6, 0, 18);
  return d;
}

/** One broad leaf with its midrib and paired side veins, on a short stalk. */
export function leafveinPath(): string {
  const x0 = 214;
  const y0 = 232;
  const a = -2.25; // pointing up and to the left
  const L = 236;
  const W = 66;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const P = (u: number, v: number): Pt => [x0 + u * c - v * s, y0 + u * s + v * c];
  const S = (p: Pt) => `${f(p[0])},${f(p[1])}`;
  // Half-width of the lens at distance u along the midrib (sampled from its quadratic edge).
  const hw = (u: number) => {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 24; k++) {
      const t = (lo + hi) / 2;
      const x = 2 * t * (1 - t) * 0.42 * L + t * t * L;
      if (x < u) lo = t;
      else hi = t;
    }
    const t = (lo + hi) / 2;
    return 2 * t * (1 - t) * W;
  };
  let d = `M${S(P(-26, 4))} Q${S(P(-12, 3))} ${S(P(0, 0))}`; // the stalk
  d += ` M${S(P(0, 0))} Q${S(P(L * 0.42, -W))} ${S(P(L, 0))} Q${S(P(L * 0.42, W))} ${S(P(0, 0))}`; // the blade
  d += ` M${S(P(0, 0))} L${S(P(L * 0.93, 0))}`; // the midrib
  for (let k = 0; k < 7; k++) {
    const u = L * (0.1 + 0.11 * k);
    const u2 = u + L * 0.15;
    for (const sd of [1, -1]) {
      const reach = hw(u2) * 0.82 * sd;
      d += ` M${S(P(u, 0))} Q${S(P(u + L * 0.05, reach * 0.55))} ${S(P(u2, reach))}`;
    }
  }
  return d;
}

/** A short sprig hanging from above: a curved stem, alternate leaves, a small side twig. */
export function sprigPath(): string {
  const B = (p0: Pt, pc: Pt, p1: Pt, t: number): Pt => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * pc[0] + t * t * p1[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * pc[1] + t * t * p1[1],
  ];
  const T = (p0: Pt, pc: Pt, p1: Pt, t: number): number =>
    Math.atan2(2 * (1 - t) * (pc[1] - p0[1]) + 2 * t * (p1[1] - pc[1]), 2 * (1 - t) * (pc[0] - p0[0]) + 2 * t * (p1[0] - pc[0]));
  const stem = (p0: Pt, pc: Pt, p1: Pt, n: number, len: number, wid: number, ang: number, first: number) => {
    let d = ` M${p0.join(',')} Q${pc.join(',')} ${p1.join(',')}`;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const [x, y] = B(p0, pc, p1, t);
      const side = (i + first) % 2 ? 1 : -1;
      const sc = 1 - t * 0.35;
      d += ' ' + lens(x, y, len * sc, wid * sc, T(p0, pc, p1, t) + side * ang);
    }
    d += ' ' + lens(p1[0], p1[1], len * 0.6, wid * 0.55, T(p0, pc, p1, 1));
    return d;
  };
  let d = stem([150, -6], [138, 96], [58, 150], 5, 36, 12, 0.8, 0);
  return d;
}

