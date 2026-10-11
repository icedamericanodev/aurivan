// Frame geometry on the shared 200-unit badge grid.
// Every frame is a convex, smooth outline sampled densely; insets are true
// normal offsets, then simplified (RDP) into short SVG paths for react-native-svg.

export const C = { x: 100, y: 94 }; // medallion centre (ribbon tails hang below)

const TAU = Math.PI * 2;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const len = (a) => Math.hypot(a.x, a.y);
const norm = (a) => mul(a, 1 / (len(a) || 1));

/** Rounded polygon → dense outline. radii[i] is the fillet at vertex i (clamped to fit). */
export function roundedPoly(pts, radii) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const u = norm(sub(p0, p1)), v = norm(sub(p2, p1));
    const th = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y)));
    let r = typeof radii === 'number' ? radii : radii[i];
    if (!r || th > Math.PI - 1e-3) { out.push(p1); continue; }
    let t = r / Math.tan(th / 2);
    const tmax = 0.5 * Math.min(len(sub(p0, p1)), len(sub(p2, p1)));
    if (t > tmax) { t = tmax; r = t * Math.tan(th / 2); }
    const a = add(p1, mul(u, t)), b = add(p1, mul(v, t));
    const bis = norm(add(u, v));
    const c = add(p1, mul(bis, r / Math.sin(th / 2)));
    let a0 = Math.atan2(a.y - c.y, a.x - c.x), a1 = Math.atan2(b.y - c.y, b.x - c.x);
    let d = a1 - a0;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const steps = Math.max(2, Math.ceil(Math.abs(d) * r / 0.6));
    for (let k = 0; k <= steps; k++) {
      const ang = a0 + (d * k) / steps;
      out.push({ x: c.x + r * Math.cos(ang), y: c.y + r * Math.sin(ang) });
    }
  }
  return resample(out, 0.8);
}

/** Uniform resample of a closed polyline. */
export function resample(pts, step = 0.8) {
  const P = [...pts, pts[0]];
  let total = 0;
  const segs = [];
  for (let i = 0; i < P.length - 1; i++) { const l = len(sub(P[i + 1], P[i])); segs.push(l); total += l; }
  const n = Math.max(12, Math.round(total / step));
  const out = [];
  let si = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (k * total) / n;
    while (si < segs.length - 1 && acc + segs[si] < target) { acc += segs[si]; si++; }
    const f = segs[si] ? (target - acc) / segs[si] : 0;
    out.push(add(P[si], mul(sub(P[si + 1], P[si]), f)));
  }
  return out;
}

function centroid(pts) {
  return mul(pts.reduce((s, p) => add(s, p), { x: 0, y: 0 }), 1 / pts.length);
}

/** Inward normal offset (positive d = inset). Works for convex outlines whose corner radii ≥ d. */
export function inset(pts, d) {
  const n = pts.length;
  const c = centroid(pts);
  // Decide which perpendicular points inward, from the top-most point.
  let top = 0;
  for (let i = 1; i < n; i++) if (pts[i].y < pts[top].y) top = i;
  const t0 = norm(sub(pts[(top + 1) % n], pts[(top - 1 + n) % n]));
  const nn = { x: -t0.y, y: t0.x };
  const sign = len(sub(add(pts[top], mul(nn, 1)), c)) < len(sub(pts[top], c)) ? 1 : -1;
  return pts.map((p, i) => {
    const t = norm(sub(pts[(i + 1) % n], pts[(i - 1 + n) % n]));
    return add(p, mul({ x: -t.y, y: t.x }, sign * d));
  });
}

/** Ramer–Douglas–Peucker on a closed outline. */
export function simplify(pts, tol = 0.12) {
  const rdp = (a, b, arr) => {
    let dmax = 0, idx = -1;
    const A = arr[a], B = arr[b];
    const ab = sub(B, A), L = len(ab) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((arr[i].x - A.x) * ab.y - (arr[i].y - A.y) * ab.x) / L;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > tol) return [...rdp(a, idx, arr).slice(0, -1), ...rdp(idx, b, arr)];
    return [A, B];
  };
  const half = Math.floor(pts.length / 2);
  const arr = [...pts, pts[0]];
  const r1 = rdp(0, half, arr), r2 = rdp(half, arr.length - 1, arr);
  return [...r1.slice(0, -1), ...r2.slice(0, -1)];
}

const f1 = (v) => (Math.round(v * 10) / 10).toString();
export function pathOf(pts, tol = 0.12) {
  const s = simplify(pts, tol);
  return 'M' + s.map((p) => `${f1(p.x)} ${f1(p.y)}`).join('L') + 'Z';
}

// ── The four frames ─────────────────────────────────────────────────────
function circlePts(r, cx = C.x, cy = C.y, from = -Math.PI / 2, to = from + TAU, n = 720) {
  const out = [];
  for (let k = 0; k < n; k++) { const a = from + ((to - from) * k) / n; out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }
  return out;
}

export const FRAMES = {
  /** Round seal: the Trail set. Milled edge (32 scallops) on the outermost two layers only. */
  seal: {
    label: 'Round seal',
    outer: () => circlePts(82),
    scallop: (d) => {
      const out = [];
      for (let k = 0; k < 2048; k++) {
        const a = -Math.PI / 2 + (TAU * k) / 2048;
        const r = 84 - d - 3.4 * (1 - Math.abs(Math.cos(16 * a)));
        out.push({ x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) });
      }
      return resample(out, 0.6);
    },
    emblem: { cx: 100, cy: 94, s: 1.02 },
  },
  /** Pointy-top hexagon: the Memory set. */
  hex: {
    label: 'Hex',
    outer: () => {
      const v = [];
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k * TAU) / 6; v.push({ x: C.x + 90 * Math.cos(a), y: C.y + 90 * Math.sin(a) }); }
      return roundedPoly(v, 24);
    },
    emblem: { cx: 100, cy: 94, s: 0.98 },
  },
  /** Heater shield: the Steady set. */
  shield: {
    label: 'Shield',
    outer: () => {
      const q = (t, p0, p1, p2) => ({ x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y });
      const R = [{ x: 177, y: 96 }, { x: 177, y: 146 }, { x: 100, y: 186 }];
      const L = [{ x: 23, y: 96 }, { x: 23, y: 146 }, { x: 100, y: 186 }];
      const v = [{ x: 23, y: 12 }, { x: 100, y: 7 }, { x: 177, y: 12 }, { x: 177, y: 96 }];
      const rad = [22, 0, 22, 0];
      for (const t of [0.25, 0.5, 0.75]) { v.push(q(t, ...R)); rad.push(80); }
      v.push({ x: 100, y: 186 }); rad.push(20);
      for (const t of [0.75, 0.5, 0.25]) { v.push(q(t, ...L)); rad.push(80); }
      v.push({ x: 23, y: 96 }); rad.push(0);
      return roundedPoly(v, rad);
    },
    emblem: { cx: 100, cy: 88, s: 0.98 },
  },
  /** Leaf-mark: the app's verdict leaf (a circle with its top-right corner squared). The skill set: pressed leaves. */
  leaf: {
    label: 'Leaf-mark',
    outer: () => {
      const r = 81;
      const v = [{ x: C.x, y: C.y - r }, { x: C.x + r, y: C.y - r }, { x: C.x + r, y: C.y }];
      const rad = [0, 26, 0];
      for (let k = 1; k < 90; k++) { const a = (k / 90) * 1.5 * Math.PI; v.push({ x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) }); rad.push(0); }
      return roundedPoly(v, rad);
    },
    emblem: { cx: 98, cy: 96, s: 1.02 },
  },
};

const cache = new Map();
/** Outline of a frame inset by d (memoised). */
export function frameAt(kind, d) {
  const key = kind + ':' + d;
  if (!cache.has(key)) {
    const base = FRAMES[kind].outer();
    cache.set(key, d === 0 ? base : resample(inset(base, d), 0.8));
  }
  return cache.get(key);
}

/** Point on an outline closest to a direction from the centre (deg, 0 = right, 90 = down). */
export function atAngle(pts, deg) {
  const a = (deg * Math.PI) / 180;
  let best = 0, bd = 1e9;
  pts.forEach((p, i) => {
    let d = Math.atan2(p.y - C.y, p.x - C.x) - a;
    d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

/** Index of the lowest point, and a walker along the outline by arc length. */
export function bottomIndex(pts) {
  let b = 0;
  pts.forEach((p, i) => { if (p.y > pts[b].y + 1e-6) b = i; });
  // Several points may tie (flat bottoms); take the middle of the run nearest x = 100.
  let best = b, bx = 1e9;
  pts.forEach((p, i) => { if (Math.abs(p.y - pts[b].y) < 0.6 && Math.abs(p.x - C.x) < bx) { bx = Math.abs(p.x - C.x); best = i; } });
  return best;
}
export function walk(pts, i0, dist) {
  // pts are ~0.8 apart after resample
  const n = pts.length;
  const step = len(sub(pts[1], pts[0])) || 0.8;
  const k = Math.round(dist / step);
  return ((i0 + k) % n + n) % n;
}
export function tangentAt(pts, i) {
  const n = pts.length;
  return norm(sub(pts[(i + 1) % n], pts[(i - 1 + n) % n]));
}
export function totalLength(pts) {
  let t = 0;
  for (let i = 0; i < pts.length; i++) t += len(sub(pts[(i + 1) % pts.length], pts[i]));
  return t;
}

/** The Grove growth-ring wobble (DESIGN_SYSTEM §10.1), as a closed path. */
export function wobbleRing(cx, cy, rm, n = 120) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * TAU;
    const r = rm * (1 + 0.022 * Math.sin(3 * t + 0.6) + 0.012 * Math.sin(5 * t + 1.9) + 0.008 * Math.sin(8 * t));
    out.push({ x: cx + r * Math.sin(t), y: cy - r * Math.cos(t) });
  }
  return out;
}
