// Badge art (mobile 1.10): turns the artist's geometry and emblems into ONE
// data file the app draws with react-native-svg (components/medallion.tsx).
//
//   node scripts/badge-art/build.mjs     → src/content/badgeArt.json
//
// geometry.mjs and emblems.mjs are the artist's sources, copied as they are
// (badge art spec, 2026-10-11). This script only measures: frame outlines at
// each rim inset, the progress trace, where the rim beads, tier pips and
// laurel sit, the growth rings and the ribbon. Colours are NOT here: they
// are roles ("E1", "M.edge", "field") the app resolves from theme/tokens.ts
// (badgeEnamel, badgeMetal) and, for not-yet badges, from the theme.
//
// Do not edit the JSON by hand; edit the sources and run this again.
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { C, FRAMES, frameAt, pathOf, atAngle, bottomIndex, walk, tangentAt, totalLength, wobbleRing } from './geometry.mjs';
import { EMBLEMS } from './emblems.mjs';

// An output path as the first argument writes there instead (the drift test builds to a temp file and compares).
const OUT = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../../src/content/badgeArt.json');
const RIM = { edge: 0, metal: 2.4, center: 7.6, innerEdge: 12.6, field: 14.4, locked: 1.6 };
const f = (v) => Math.round(v * 10) / 10;
const lensD = (l, w) => `M0 0C${f(w * 0.66)} ${f(-l * 0.16)} ${f(w * 0.66)} ${f(-l * 0.72)} 0 ${f(-l)}C${f(-w * 0.66)} ${f(-l * 0.72)} ${f(-w * 0.66)} ${f(-l * 0.16)} 0 0Z`;

function outer(kind, d) {
  if (kind === 'seal' && d < 6) return pathOf(FRAMES.seal.scallop(d), 0.08);
  return pathOf(frameAt(kind, d));
}

/** The progress trace: the outline from the top centre, clockwise. */
function trace(kind) {
  const pts = frameAt(kind, RIM.locked);
  let top = 0;
  let bx = 1e9;
  const minY = Math.min(...pts.map((p) => p.y));
  pts.forEach((p, i) => {
    if (p.y < minY + 1.2 && Math.abs(p.x - C.x) < bx) {
      bx = Math.abs(p.x - C.x);
      top = i;
    }
  });
  const rot = [...pts.slice(top), ...pts.slice(0, top)];
  return { d: 'M' + rot.filter((_, i) => i % 3 === 0).map((p) => `${f(p.x)} ${f(p.y)}`).join('L') + 'Z', length: f(totalLength(pts)) };
}

/** Tier pips (or Firm Footing's domain leaves) along the bottom of the rim: [x, y, angle]. */
function pips(kind, count, domains) {
  const line = frameAt(kind, RIM.center);
  const b = bottomIndex(line);
  const gap = domains ? 13.5 : 12.5;
  const out = [];
  for (let k = 0; k < count; k++) {
    const i = walk(line, b, ((count - 1) / 2 - k) * gap);
    const p = line[i];
    const ang = (Math.atan2(C.y - p.y, C.x - p.x) * 180) / Math.PI + 90;
    const t = tangentAt(line, i);
    const nx = -t.y;
    const ny = t.x;
    const s = nx * (C.x - p.x) + ny * (C.y - p.y) > 0 ? -1 : 1;
    const push = domains ? 5.8 : 4.6;
    out.push([f(p.x + s * nx * push), f(p.y + s * ny * push), f(ang)]);
  }
  return { at: out, span: f(((count - 1) * gap) / 2 + 9) };
}

/** Rim beads (as one path), leaving room for `skip` units either side of the bottom (the pips). */
function beads(kind, skip) {
  const line = frameAt(kind, RIM.center);
  const L = totalLength(line);
  const n = Math.round(L / 10.5);
  const b = bottomIndex(line);
  const out = [];
  for (let k = 0; k < n; k++) {
    const along = Math.min((k * L) / n, L - (k * L) / n);
    if (skip && along < skip) continue;
    const p = line[walk(line, b, (k * L) / n)];
    out.push([f(p.x), f(p.y)]);
  }
  // One path of small circles (two arcs each): 45 beads draw as ONE element, not 90.
  const r = 1.75;
  return out.map(([x, y]) => `M${f(x - r)} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('');
}

/** The Gold-leaf laurel (tier 3): one side's stem and leaves; the app mirrors it. */
function laurel(kind) {
  const ring = frameAt(kind, 0);
  const angles = [116, 131, 146, 161, 176, 191, 204];
  const stem = [];
  const leaves = [];
  angles.forEach((a, j) => {
    const i = atAngle(ring, a);
    const p = ring[i];
    let t = tangentAt(ring, i);
    if (t.y > 0) t = { x: -t.x, y: -t.y };
    const ox = p.x - C.x;
    const oy = p.y - C.y;
    const ol = Math.hypot(ox, oy);
    const bx = p.x + (ox / ol) * 5;
    const by = p.y + (oy / ol) * 5;
    stem.push([f(bx), f(by)]);
    const base = (Math.atan2(t.y, t.x) * 180) / Math.PI + 90;
    if (j === angles.length - 1) {
      leaves.push({ x: f(bx), y: f(by), r: f(base - 6), d: lensD(11, 6.4), rib: null });
      return;
    }
    const l = 17 - j * 1.1;
    const w = 9 - j * 0.45;
    for (const tilt of [-34, 26]) leaves.push({ x: f(bx), y: f(by), r: f(base + tilt), d: lensD(l, w), rib: `M0 -2.5L0 ${f(-l * 0.72)}` });
  });
  return { stem: 'M' + stem.map(([x, y]) => `${x} ${y}`).join('L'), leaves };
}

const frames = {};
for (const kind of Object.keys(FRAMES)) {
  const tr = trace(kind);
  frames[kind] = {
    edge: outer(kind, RIM.edge),
    metal: outer(kind, RIM.metal),
    metalLine: outer(kind, RIM.metal + 1.4),
    innerEdge: outer(kind, RIM.innerEdge),
    field: outer(kind, RIM.field),
    locked: outer(kind, RIM.locked),
    trace: tr.d,
    traceLength: tr.length,
    emblem: FRAMES[kind].emblem,
    // Pips for tiers 1–3 and the five domain leaves; beads around the rest of the rim.
    pips: { 1: pips(kind, 1), 2: pips(kind, 2), 3: pips(kind, 3) },
    domainPips: Object.fromEntries([3, 4, 5, 8].map((n) => [n, pips(kind, n, true)])),
    beads: {
      0: beads(kind, 0),
      1: beads(kind, pips(kind, 1).span),
      2: beads(kind, pips(kind, 2).span),
      3: beads(kind, pips(kind, 3).span),
      ...Object.fromEntries([3, 4, 5, 8].map((n) => [`d${n}`, beads(kind, pips(kind, n, true).span)])),
    },
    laurel: laurel(kind),
  };
}

const emblems = {};
for (const id of Object.keys(EMBLEMS)) {
  if (id === 'rooted') for (const t of [1, 2, 3]) emblems[`rooted:${t}`] = EMBLEMS.rooted(t);
  else emblems[id] = EMBLEMS[id]();
}

// The field's four growth rings (DESIGN_SYSTEM §10.1 wobble) and the ribbon tail (mirrored for the other side).
const rings = [22, 37, 52, 67].map((r) => pathOf(wobbleRing(C.x + 6, C.y + 14, r), 0.1));
const ribbon = { tail: 'M60 138L92 150L80 197L69.5 187L57 194Z', fold: 'M84 148.5L92 150L80 197L76.8 193.6Z', shine: 'M58.6 141L63 142.4L59.2 193Z' };
const leafPip = { on: lensD(14, 10), off: lensD(11.5, 8), rib: 'M0 -2.5L0 -10' };

writeFileSync(OUT, JSON.stringify({ centre: C, rim: RIM, frames, emblems, rings, ribbon, leafPip }));
console.log('badge art →', OUT);
