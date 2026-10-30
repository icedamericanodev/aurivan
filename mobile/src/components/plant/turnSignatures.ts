/**
 * The Turning's species signatures (mobile 1.50, DESIGN_SYSTEM §8.10): one
 * small touch per line. The motes that rise during the change are the
 * species' own seeds, petals or pollen, never generic dots. Static data:
 * each mote is a plain disc (a View) or a tiny drawing of at most 3 SVG
 * elements, built once; only its transform and opacity move.
 *
 * Colours come from theme/tokens.ts `turnMote` (fixed per theme: warm,
 * botanical, never saturated red) and are decorative: the reveal's words
 * carry the moment.
 */
import type { PlantSpecies } from '../../engine/plant';
import { turnMote as M } from '../../theme/tokens';

/** How a mote moves over its life (components/plant/TurnMotes.tsx reads it on the UI thread). */
export type MoteMove =
  | 'rock' // a leaf rocking ±25° as it rises
  | 'spin' // a samara turning 540°
  | 'flip' // a coin seed turning edge-on (scaleX)
  | 'turn' // a slow 120° turn
  | 'turn60' // a slower 60° turn (a star floret)
  | 'drift' // no rotation
  | 'grow' // a pollen puff growing 0.8 → 1.2 while it fades
  | 'spiral' // seeds placed on a golden-angle spiral, no spin
  | 'ring' // a ring on the ground or the water, scaling out and fading (no rise)
  | 'node' // a bamboo node ring rising straight up the culm
  | 'rimGlint' // one glint running along the tray's rim, once
  | 'tipGlint'; // one slow glint on the crown's tip, opacity only

type Two = readonly [light: string, dark: string];
export type MotePart =
  | { t: 'path'; d: string; fill: Two | 'none'; stroke?: Two; sw?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: Two | 'none'; stroke?: Two; sw?: number }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: Two | 'none'; stroke?: Two; sw?: number };
export interface MoteShape {
  move: MoteMove;
  /** A plain disc (radius in stage units), drawn as a View: the cheapest mote. */
  disc?: { r: number; fill: Two };
  /** Or a tiny drawing in a 12 × 12 box centred on 0,0 (stage units), ≤ 3 parts. */
  parts?: readonly MotePart[];
  /** The drawing's box side, in stage units (default 12). */
  box?: number;
}

const POLLEN: Two = M.pollen;
const SPECK: Two = M.speck;
const WATER: Two = M.water;
const GLINT: Two = M.glint;

const OAK_LEAF: MoteShape = {
  move: 'rock',
  parts: [
    {
      t: 'path',
      d: 'M0 -5C2.6 -4 1.4 -2 3.2 -1.2C1.6 0 3.4 1.6 1.4 2.4C.8 3.6 .4 4.6 0 5.2C-.4 4.6 -.8 3.6 -1.4 2.4C-3.4 1.6 -1.6 0 -3.2 -1.2C-1.4 -2 -2.6 -4 0 -5Z',
      fill: M.oakLeaf,
      stroke: M.oakLeafLine,
      sw: 0.5,
    },
  ],
};
const pollen = (move: MoteMove = 'drift', r = 1.6): MoteShape => ({ move, disc: { r, fill: POLLEN } });
const SAMARA: MoteShape = {
  move: 'spin',
  parts: [
    { t: 'path', d: 'M-.6 2.6C-1.9 1.9 -1.8 .4 -1 -.6L2 -4.6C2.8 -5.4 4 -4.8 3.6 -3.7L1.2 2C.8 2.8 0 3 -.6 2.6Z', fill: M.samara, stroke: M.samaraLine, sw: 0.45 },
    { t: 'circle', cx: -0.4, cy: 2.2, r: 1.4, fill: M.samaraSeed },
  ],
};
const COIN: MoteShape = {
  move: 'flip',
  parts: [
    { t: 'circle', cx: 0, cy: 0, r: 4.2, fill: M.coin, stroke: M.coinLine, sw: 0.5 },
    { t: 'circle', cx: 0, cy: 0, r: 1.6, fill: M.coinEye },
  ],
};
const SPRAY: MoteShape = {
  move: 'turn',
  parts: [
    { t: 'circle', cx: 0, cy: 0, r: 1.3, fill: M.spray },
    { t: 'circle', cx: 2.2, cy: 1, r: 0.9, fill: M.spray },
    { t: 'circle', cx: -1.8, cy: 1.4, r: 0.8, fill: M.spray },
  ],
};
const PETAL: MoteShape = {
  move: 'turn',
  parts: [{ t: 'path', d: 'M0 -4.4C2.5 -3 2.9 1.4 .7 4.2L0 3.4L-.7 4.2C-2.9 1.4 -2.5 -3 0 -4.4Z', fill: M.petal, stroke: M.petalLine, sw: 0.4 }],
};
const FLORET: MoteShape = {
  move: 'drift',
  parts: [
    { t: 'circle', cx: 0, cy: -1.4, r: 1.3, fill: M.floret },
    { t: 'circle', cx: -1.3, cy: 0.8, r: 1.1, fill: M.floret },
    { t: 'circle', cx: 1.3, cy: 0.8, r: 1.1, fill: M.floretDeep },
  ],
};
const PUFF: MoteShape = { move: 'grow', disc: { r: 2.2, fill: M.puff } };
const ring = (move: 'ring' | 'node', rx: number, ry: number, stroke: Two): MoteShape => ({
  move,
  box: rx * 2 + 2,
  parts: [{ t: 'ellipse', cx: 0, cy: 0, rx, ry, fill: 'none', stroke, sw: 0.6 }],
});
const ROUND_LEAF: MoteShape = { move: 'drift', disc: { r: 1.9, fill: M.roundLeaf } };
const SEED: MoteShape = { move: 'spiral', parts: [{ t: 'ellipse', cx: 0, cy: 0, rx: 1.1, ry: 1.8, fill: M.seed }] };
const DROPLET: MoteShape = { move: 'drift', disc: { r: 1.5, fill: M.droplet } };
/** A five-point star floret (white, with a soft line so it reads on paper). */
const STAR_D = (() => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 4 : 1.7;
    d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
})();
const STAR: MoteShape = { move: 'turn60', parts: [{ t: 'path', d: STAR_D, fill: M.star, stroke: M.starLine, sw: 0.45 }] };
const glint = (move: 'rimGlint' | 'tipGlint'): MoteShape => ({ move, disc: { r: 1.8, fill: GLINT } });

/**
 * Mote k of n for a species. Each line has one signature; the anchored ones
 * (a tide ring, water rings, a rim or spine glint, node rings) count as motes,
 * so no tier ever draws more than its mote budget.
 */
export function moteShape(species: PlantSpecies, k: number, n: number): MoteShape {
  switch (species) {
    case 'oak':
      return k % 2 === 0 ? OAK_LEAF : pollen();
    case 'maple':
      return k % 2 === 0 ? SAMARA : pollen();
    case 'narra':
      return k % 2 === 0 ? COIN : SPRAY;
    case 'cherry-blossom':
      return PETAL;
    case 'mango':
      return FLORET;
    case 'pine':
      return PUFF;
    case 'coconut-palm':
      return k === 0 ? ring('ring', 14, 2.6, WATER) : { move: 'drift', disc: { r: 1.2, fill: M.salt } };
    case 'bonsai':
      return k === n - 1 ? glint('rimGlint') : ROUND_LEAF;
    case 'sunflower':
      return SEED;
    case 'lotus':
      return k < 2 ? ring('ring', 16, 3, WATER) : DROPLET;
    case 'sampaguita':
      return STAR;
    case 'cactus':
      return k === n - 1 ? glint('tipGlint') : { move: 'drift', disc: { r: 1.2, fill: SPECK } };
    case 'bamboo':
      return k < 3 ? ring('node', 5, 1.4, M.node) : pollen('drift', 1.3);
  }
}
