/**
 * "The Turning": one pure timeline for a plant's form change (mobile 1.50,
 * DESIGN_SYSTEM §8.10; components/plant/FormReveal.tsx plays it).
 *
 * Plain English for the founder:
 * - The plant gathers warm light, its old and new shapes take turns in that
 *   light (slowly, then faster), the light lifts off and the new form is
 *   simply there. The learning fact is on screen from the first frame; the
 *   form's name settles in under it at the end.
 * - Three sizes by how far the plant came: small (Form I → II, 2.4 s),
 *   medium (II → III, 3.0 s), grand (III → IV, 3.6 s; Form IV's ring draws
 *   itself once). It plays once per form, for life.
 * - Safe for people sensitive to flashing: the shapes change at most 2.5
 *   times a second (WCAG 2.3.1 allows 3), and the incoming shape covers
 *   before the outgoing one uncovers, so the light never dips in between.
 *
 * How it runs: ONE clock `t` (ms) runs 0 → total, linear, on the UI thread.
 * Every value on screen is a pure function of `t` (these helpers are
 * worklets: no closures over React, no Date, no Math.random), so React never
 * re-renders while it plays. A skip mixes every value toward the end state.
 * Ported line for line from the motion spec's preview timeline.
 */
import { motion, turnLook } from '../theme/tokens';
import { formOf } from './plantForms';

export type TurnTier = 'small' | 'medium' | 'grand';

/** The tier's timings as plain numbers (built on the JS thread once, read by the worklets). */
export interface TurnPhases {
  tier: TurnTier;
  total: number;
  /** The gather: from g0 to g1. */
  g0: number;
  g1: number;
  /** Each half-swap's start, and its length. */
  starts: number[];
  swaps: number[];
  /** The bloom: from b0 (the new form appears) to b1. */
  b0: number;
  b1: number;
  nameAt: number;
  inhale: number;
  motes: number;
  moteLife: number;
  glowMax: number;
  glowR: number;
  settleFrom: number;
  settleDur: number;
  settleRatio: number;
  halo: boolean;
  cross: number;
}

/**
 * The tier for a change from one growth to another: the NEW form decides,
 * so a plant that skipped a form (a restore) plays the higher tier once.
 */
export function tierOf(toGrowth: number): TurnTier {
  const f = formOf(toGrowth);
  return f >= 4 ? 'grand' : f === 3 ? 'medium' : 'small';
}

/**
 * The tier's timings. `even` (the owner's E1 option, theme/tokens.ts turnLook):
 * every half-swap the same length, the alternation's total unchanged.
 */
export function phases(tier: TurnTier, { even = turnLook.evenPace }: { even?: boolean } = {}): TurnPhases {
  const T = motion.turn[tier];
  const [g0, g1] = T.gather;
  const sum = T.swaps.reduce((a, b) => a + b, 0);
  const swaps = even ? T.swaps.map(() => Math.max(motion.turn.swapFloor, Math.round(sum / T.swaps.length))) : [...T.swaps];
  const starts: number[] = [];
  let s = g1;
  for (const d of swaps) {
    starts.push(s);
    s += d;
  }
  return {
    tier,
    total: T.total,
    g0,
    g1,
    starts,
    swaps,
    b0: s,
    b1: s + T.bloom,
    nameAt: T.nameAt,
    inhale: T.inhale,
    motes: Math.min(T.motes, motion.celebrate.leaves),
    moteLife: T.moteLife,
    glowMax: T.glowMax,
    glowR: T.glowR,
    settleFrom: T.settle.from,
    settleDur: T.settle.duration,
    settleRatio: T.settle.dampingRatio,
    halo: T.halo,
    cross: motion.turn.cross,
  };
}

// ── Easings (motion.curve; outCubic is Grove's default "out") ───────────
export function clamp01(x: number): number {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function seg(t: number, a: number, b: number): number {
  'worklet';
  return clamp01((t - a) / (b - a));
}
export function outCubic(p: number): number {
  'worklet';
  return 1 - (1 - p) * (1 - p) * (1 - p);
}
export function inOutSine(p: number): number {
  'worklet';
  return -(Math.cos(Math.PI * p) - 1) / 2;
}
function outSine(p: number): number {
  'worklet';
  return Math.sin((p * Math.PI) / 2);
}
/** motion.curve.enter, cubic-bezier(0.05, 0.7, 0.1, 1) (M3 emphasized decelerate), solved by Newton steps. */
export function enterEase(x: number): number {
  'worklet';
  const cx = 0.15;
  const bx = 3 * (0.1 - 0.05) - cx;
  const ax = 1 - cx - bx;
  const cy = 2.1;
  const by = 3 * (1 - 0.7) - cy;
  const ay = 1 - cy - by;
  let u = x;
  for (let i = 0; i < 8; i++) {
    const e = ((ax * u + bx) * u + cx) * u - x;
    const d = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
    u -= e / d;
  }
  u = clamp01(u);
  return ((ay * u + by) * u + cy) * u;
}
/** A duration spring (Reanimated { duration, dampingRatio }) as a 0 → 1 step response, ~98% there at `duration`. */
export function springStep(ms: number, duration: number, ratio: number): number {
  'worklet';
  if (ms <= 0) return 0;
  const w = 5.8 / (duration / 1000);
  const s = ms / 1000;
  if (ratio >= 1) return 1 - (1 + w * s) * Math.exp(-w * s);
  const wd = w * Math.sqrt(1 - ratio * ratio);
  return 1 - Math.exp(-ratio * w * s) * (Math.cos(wd * s) + ((ratio * w) / wd) * Math.sin(wd * s));
}

// ── The values, one helper per layer (each style reads only its own) ──
/** A line of words: 0 → 1 over 240 ms from `at` (motion.dur.enter, curve.enter). It rises 8pt as it comes. */
const WORDS_IN = motion.dur.enter;
export function wordsIn(t: number, at: number): number {
  'worklet';
  return enterEase(seg(t, at, at + WORDS_IN));
}
/** The old form inhales on its base during the gather (its tree and its silhouette alike). */
export function oldScale(t: number, P: TurnPhases): number {
  'worklet';
  return 1 + P.inhale * inOutSine(seg(t, P.g0, P.g1));
}
/** The old drawing shows until the gather ends (by then its silhouette covers it). */
export function oldTreeOp(t: number, P: TurnPhases): number {
  'worklet';
  return t < P.g1 ? 1 : 0;
}
/**
 * The silhouettes during the alternation: [old, new]. NOT a plain cross-fade
 * (two same-colour shapes cross-faded dim where they overlap halfway, which
 * doubles the flashes): the incoming shape covers first, then the outgoing
 * one uncovers, so each pixel makes at most ONE change per half-swap.
 */
function silPair(t: number, P: TurnPhases): [number, number] {
  'worklet';
  let o = 1;
  let n = 0;
  for (let i = 0; i < P.starts.length; i++) {
    if (t < P.starts[i]) break;
    const q = clamp01((t - P.starts[i]) / (P.swaps[i] * P.cross));
    const inc = inOutSine(clamp01(q * 2));
    const out = 1 - inOutSine(clamp01(q * 2 - 1));
    if (i % 2 === 0) {
      n = inc;
      o = out;
    } else {
      o = inc;
      n = out;
    }
  }
  return [o, n];
}
export function oldSilOp(t: number, P: TurnPhases): number {
  'worklet';
  if (t < P.g1) return inOutSine(seg(t, P.g0 + 0.35 * (P.g1 - P.g0), P.g1));
  return t < P.b0 ? silPair(t, P)[0] : 0;
}
export function newSilOp(t: number, P: TurnPhases): number {
  'worklet';
  if (t < P.g1) return 0;
  if (t < P.b0) return silPair(t, P)[1];
  // The bloom: the light lifts off the new form.
  return 1 - outCubic(seg(t, P.b0, P.b1));
}
/** The new drawing is there from the bloom on (under its lifting light). */
export function newTreeOp(t: number, P: TurnPhases): number {
  'worklet';
  return t < P.b0 ? 0 : 1;
}
/** The new form settles on its base from `settleFrom` (a duration spring). */
export function newScale(t: number, P: TurnPhases): number {
  'worklet';
  if (t < P.b0) return P.settleFrom;
  return P.settleFrom + (1 - P.settleFrom) * springStep(t - P.b0, P.settleDur, P.settleRatio);
}
/** The props behind and in front (and the ground) cross-fade old → new during the bloom. */
export function propsMix(t: number, P: TurnPhases): number {
  'worklet';
  return outCubic(seg(t, P.b0, P.b1));
}
/** The gathered light: [opacity, scale]. Steady through the alternation (it never pulses), one swell at the bloom. */
export function glowAt(t: number, P: TurnPhases): [number, number] {
  'worklet';
  if (t < P.g1) {
    const g = outCubic(seg(t, P.g0, P.g1));
    return [0.8 * P.glowMax * g, 0.7 + 0.3 * g];
  }
  if (t < P.b0) {
    const s = seg(t, P.g1, P.b0);
    return [P.glowMax * (0.8 + 0.2 * inOutSine(s)), 1 + 0.04 * s];
  }
  const bloom = P.b1 - P.b0;
  const up = seg(t, P.b0, P.b0 + 0.3 * bloom);
  const down = seg(t, P.b0 + 0.3 * bloom, P.b1 + 300);
  // Clamped (review P6): the swell must stay below full opacity to be seen at all.
  return [Math.min(1, P.glowMax * (1 + 0.12 * outCubic(up))) * (1 - outCubic(down)), 1.04 + 0.1 * outCubic(seg(t, P.b0, P.b1 + 300))];
}
/** Form IV's own glow fades in as the gathered light leaves (grand); otherwise it is simply there. */
export function artGlowOp(t: number, P: TurnPhases): number {
  'worklet';
  return P.halo ? outCubic(seg(t, P.b0 + 60, P.b1 + 260)) : 1;
}
/** Form IV's ring draws itself once (grand): 0 → 1. */
export function haloDraw(t: number, P: TurnPhases): number {
  'worklet';
  return P.halo ? outCubic(seg(t, P.b0 - 120, P.b0 + 480)) : 1;
}

export interface Mote {
  /** Offset from the light's centre, in 200-unit stage coordinates. */
  x: number;
  y: number;
  op: number;
  /** 0 → 1 over its life (a samara turns 540°, a petal 120°). */
  spin: number;
  /** −1 … 1: a leaf's slow rock. */
  sway: number;
  /** −1 … 1: a coin seed turning edge-on (scaleX), 1.2 turns. */
  flip: number;
  scale: number;
  /** 0 → 1 over its life (null-free: 0 before and after it lives, with op 0). */
  p: number;
}
/** When mote k starts (deterministic: the last one is gone 200 ms after the bloom). */
export function moteStart(k: number, P: TurnPhases): number {
  'worklet';
  const first = P.g0 + 150;
  const spacing = P.motes > 1 ? (P.b1 + 200 - P.moteLife - first) / (P.motes - 1) : 0;
  return first + k * spacing;
}
/**
 * Mote k at time t. Positions come from golden-ratio hashes of its index:
 * the same every play, never Math.random. op is 0 outside its life.
 */
export function moteAt(t: number, k: number, P: TurnPhases): Mote {
  'worklet';
  const p = (t - moteStart(k, P)) / P.moteLife;
  const h1 = (k * 0.618034) % 1;
  const h2 = (k * 0.381966 + 0.2) % 1;
  const h3 = (k * 0.754878 + 0.1) % 1;
  const live = p > 0 && p < 1;
  const q = clamp01(p);
  const rise = 70 + h3 * 30;
  return {
    x: (h1 * 2 - 1) * 46 + 6 * Math.sin(2 * Math.PI * q + k),
    y: -h2 * 40 - rise * outSine(q),
    op: live ? 0.9 * Math.min(1, q / 0.15) * Math.min(1, (1 - q) / 0.3) : 0,
    spin: q,
    sway: Math.sin(2 * Math.PI * q * 0.8 + k),
    flip: Math.cos(2 * Math.PI * 1.2 * q + k),
    scale: 0.85 + 0.15 * h2,
    p: q,
  };
}

// ── The whole frame (tests, the docs and the shots read it) ─────────────
export interface TurnFrame {
  t: number;
  beat: 'fact' | 'gather' | 'alternate' | 'bloom' | 'name' | 'rest' | 'crossfade';
  factOp: number;
  nameOp: number;
  lookOp: number;
  oldTreeOp: number;
  oldScale: number;
  oldSilOp: number;
  newSilOp: number;
  newTreeOp: number;
  newScale: number;
  propsMix: number;
  glowOp: number;
  glowScale: number;
  artGlowOp: number;
  haloDraw: number;
  /** The motes alive now. */
  motes: Mote[];
  done: boolean;
}
export function frame(t: number, P: TurnPhases): TurnFrame {
  const [glowOp, glowScale] = glowAt(t, P);
  const motes: Mote[] = [];
  for (let k = 0; k < P.motes; k++) {
    const m = moteAt(t, k, P);
    if (m.op > 0) motes.push(m);
  }
  return {
    t,
    beat: t < P.g0 ? 'fact' : t < P.g1 ? 'gather' : t < P.b0 ? 'alternate' : t < P.nameAt ? 'bloom' : t < P.total ? 'name' : 'rest',
    factOp: wordsIn(t, 0),
    nameOp: wordsIn(t, P.nameAt),
    lookOp: wordsIn(t, P.nameAt + 80),
    oldTreeOp: oldTreeOp(t, P),
    oldScale: oldScale(t, P),
    oldSilOp: oldSilOp(t, P),
    newSilOp: newSilOp(t, P),
    newTreeOp: newTreeOp(t, P),
    newScale: newScale(t, P),
    propsMix: propsMix(t, P),
    glowOp,
    glowScale,
    artGlowOp: artGlowOp(t, P),
    haloDraw: haloDraw(t, P),
    motes,
    done: t >= P.total,
  };
}
/** Reduce Motion: one 120 ms cross-fade old → new; every word there at once; no light, no motes. */
export function frameReduced(t: number): TurnFrame {
  const x = clamp01(t / motion.plant.turnReduced);
  return {
    t,
    beat: x < 1 ? 'crossfade' : 'rest',
    factOp: 1,
    nameOp: 1,
    lookOp: 1,
    oldTreeOp: 1 - x,
    oldScale: 1,
    oldSilOp: 0,
    newSilOp: 0,
    newTreeOp: x,
    newScale: 1,
    propsMix: x,
    glowOp: 0,
    glowScale: 1,
    artGlowOp: 1,
    haloDraw: 1,
    motes: [],
    done: x >= 1,
  };
}

export type TurnEvent = { at: number; kind: 'haptic'; haptic: 'success' | 'selection' } | { at: number; kind: 'done' };
/**
 * What fires while it plays: ONE success haptic at the bloom (the moment the
 * new form appears), then `done` (announce once, onDone). `ticks` (off by
 * default, grand only): a selection tick on each of the last two half-swaps.
 */
export function events(P: TurnPhases, { ticks = false }: { ticks?: boolean } = {}): TurnEvent[] {
  const ev: TurnEvent[] = [{ at: P.b0, kind: 'haptic', haptic: 'success' }];
  if (ticks && P.tier === 'grand') {
    ev.push({ at: P.starts[P.starts.length - 2], kind: 'haptic', haptic: 'selection' });
    ev.push({ at: P.starts[P.starts.length - 1], kind: 'haptic', haptic: 'selection' });
  }
  ev.push({ at: P.total, kind: 'done' });
  return ev.sort((a, b) => a.at - b.at);
}

/**
 * WCAG 2.3.1: every luminance change on the stage (each half-swap and the
 * bloom's lift) counts as one transition and a flash is a PAIR. The worst
 * count of flashes in any 1 s window.
 */
export function maxFlashesPerSecond(P: TurnPhases): number {
  const changes = [...P.starts, P.b0];
  let worst = 0;
  for (const a of changes) worst = Math.max(worst, changes.filter((c) => c >= a && c < a + 1000).length / 2);
  return worst;
}

/**
 * The same check per PIXEL CLASS (review P5), with each change placed where
 * it really happens inside its half-swap (cover-then-uncover puts the
 * incoming shape's change in the first half and the outgoing one's in the
 * second):
 * - old: pixels only the old shape covers (filled at the gather; each swap
 *   toggles them once; the gathered light around them leaves after the bloom);
 * - new: pixels only the new shape covers (each swap toggles them; the light lifts at the bloom);
 * - both: pixels inside both shapes (lit once at the gather, lifted once at the bloom);
 * - glow: the gathered light around them (it rises, swells once, fades).
 * Returns the worst count of flashes (pairs of changes) in any 1 s, over every class.
 */
export function flashTimes(P: TurnPhases): Record<'old' | 'new' | 'both' | 'glow', number[]> {
  const fillMid = P.g0 + 0.675 * (P.g1 - P.g0);
  const liftMid = P.b0 + (P.b1 - P.b0) / 2;
  const first = (i: number) => P.starts[i] + P.swaps[i] * P.cross * 0.25;
  const second = (i: number) => P.starts[i] + P.swaps[i] * P.cross * 0.75;
  const old: number[] = [fillMid];
  const nu: number[] = [];
  P.starts.forEach((_, i) => {
    // Even half-swaps go old → new (new covers first, old uncovers second); odd ones go back.
    old.push(i % 2 === 0 ? second(i) : first(i));
    nu.push(i % 2 === 0 ? first(i) : second(i));
  });
  const bloom = P.b1 - P.b0;
  const fadeMid = P.b0 + 0.3 * bloom + (P.b1 + 300 - P.b0 - 0.3 * bloom) / 2;
  // After its last uncover an old-only pixel next changes when the gathered light around it leaves.
  old.push(fadeMid);
  nu.push(liftMid);
  return {
    old,
    new: nu,
    both: [fillMid, liftMid],
    glow: [(P.g0 + P.g1) / 2, P.b0 + 0.15 * bloom, fadeMid],
  };
}
export function maxFlashesPerPixel(P: TurnPhases): number {
  let worst = 0;
  for (const changes of Object.values(flashTimes(P)))
    for (const a of changes) worst = Math.max(worst, changes.filter((c) => c >= a && c < a + 1000).length / 2);
  return worst;
}
