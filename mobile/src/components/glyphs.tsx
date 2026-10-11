/**
 * Grove v2 custom drawings (docs/mobile/DESIGN_SYSTEM.md §7, §10.2, §10.3).
 *
 * - Tab/streak glyphs drawn on Lucide's 24 grid with a 1.75 stroke, so they
 *   sit next to Lucide icons without looking different: Sprout (Today tab),
 *   Rings (You tab), Sprig (streak).
 * - Leaf marks used by the answer screen: the verdict leaf, the big Key idea
 *   leaf and the small tip leaves on the vine.
 * - Botanical line art for the forest panel: one quadratic stem with
 *   lens-shaped leaves. Paths are pure maths with fixed inputs, so the art
 *   never changes between renders.
 *
 * Colours always come in as props (palette tokens); nothing here is hard-coded.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { motion } from '../theme/tokens';
import { useCelebrationSettled, useMotion, useOncePerDay } from './motion';

type GlyphProps = { size?: number; color: string; strokeWidth?: number };

// ── Tab and streak glyphs ───────────────────────────────────────────────
export function Sprout({ size = 24, color, strokeWidth = 1.75 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21v-8.5" />
      <Path d="M12 12.5C12 8.6 9.6 6.2 5 6.2c0 3.9 2.6 6.3 7 6.3z" />
      <Path d="M12 10.5c0-3.6 2.5-6.1 7-6.1 0 3.8-2.6 6.1-7 6.1z" />
      <Path d="M7.5 21h9" />
    </Svg>
  );
}

export function Rings({ size = 24, color, strokeWidth = 1.75 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.2c5.6 0 9.9 4.3 9.7 9.9-.2 5.3-4.5 9.8-9.9 9.7C6.5 21.7 2.2 17.4 2.3 12 2.4 6.6 6.6 2.2 12 2.2z" />
      <Path d="M12 6.4c3.2 0 5.7 2.4 5.6 5.7-.1 3.1-2.6 5.6-5.7 5.5-3.1-.1-5.5-2.6-5.4-5.7.1-3 2.5-5.5 5.5-5.5z" />
      <Circle cx={12} cy={12} r={1.6} />
    </Svg>
  );
}

export function Sprig({ size = 24, color, strokeWidth = 1.75 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 21c.2-5 1.5-9.4 5-13" />
      <Path d="M12.2 14.5C8.6 15 5.6 13.4 4.6 10c3.6-.6 6.6.9 7.6 4.5z" fill={color} fillOpacity={0.22} />
      <Path d="M14.5 10.5c-.6-3.6 1-6.6 4.9-8 .6 3.7-1.2 6.8-4.9 8z" fill={color} fillOpacity={0.22} />
    </Svg>
  );
}

// ── Leaf marks (answer screen) ──────────────────────────────────────────
/** 38pt teardrop behind the ✓/✗ verdict: a circle with its top-right corner squared. */
export function VerdictLeaf({ size = 38, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38">
      <Path d="M35.5 2.5V19A16.5 16.5 0 1 1 19 2.5z" fill={color} />
    </Svg>
  );
}

/** 22pt filled leaf with a midrib in the background colour (Key idea node; the milestone's pressed leaf at 32). */
export function LeafBig({ color, rib, size = 22 }: { color: string; rib: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Path d="M11 21C3.5 16 3 7.5 11 1c8 6.5 7.5 15 0 20z" fill={color} />
      <Path d="M11 6v11" stroke={rib} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** 16pt outline leaf at 18% fill (tip nodes on the vine). */
export function LeafSmall({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Path d="M8 15C3 11.5 2.5 5.5 8 1c5.5 4.5 5 10.5 0 14z" fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.4} />
      <Path d="M8 4.5v8.5" stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}

/** 11×13 plan leaf for the forest panel ("Start here" progress). Filled = done. */
export function PlanLeaf({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <Svg width={11} height={13} viewBox="0 0 11 13">
      <Path d="M5.5 12.5C1.5 9.5 1 5 5.5 .8 10 5 9.5 9.5 5.5 12.5z" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}

/**
 * Build F game levels: one leaf, three stages, so the level reads by SHAPE
 * as well as by its text label (never colour alone).
 * - Seedling: a small sprout (stem + one outline leaf).
 * - Sapling: a full outline leaf with its midrib.
 * - Heartwood: the same leaf, filled.
 * Also the "pressed leaf" of a skill badge: filled = earned, outline = not yet.
 */
export function TierLeaf({ tier, color, size = 16, rib }: { tier: 'seedling' | 'sapling' | 'heartwood'; color: string; size?: number; rib?: string }) {
  if (tier === 'seedling') {
    return (
      <Svg width={size} height={size} viewBox="0 0 16 16">
        <Path d="M8 15V9" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        <Path d="M8 9.5C8 6.5 9.8 4.5 13 4.3c0 3-1.9 5-5 5.2z" fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.3} strokeLinejoin="round" />
      </Svg>
    );
  }
  const filled = tier === 'heartwood';
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 15C3 11.5 2.5 5.5 8 1c5.5 4.5 5 10.5 0 14z" fill={color} fillOpacity={filled ? 1 : 0.18} stroke={color} strokeWidth={1.4} />
      <Path d="M8 4.5v8.5" stroke={filled ? (rib ?? 'transparent') : color} strokeWidth={1.2} />
    </Svg>
  );
}

// ── Botanical line art ──────────────────────────────────────────────────
type Pt = [number, number];
interface FrondSpec {
  w: number;
  h: number;
  p0: Pt; // stem base
  p1: Pt; // stem tip
  pc: Pt; // bezier control point
  n: number; // leaf positions along the stem
  len: number; // leaf length at the base
  wid: number; // leaf half-width at the base
  ang: number; // leaf angle from the stem (radians)
  alt?: boolean; // alternate leaves instead of pairs
  taper?: number; // how much leaves shrink toward the tip
}

const f1 = (n: number) => n.toFixed(1);

/** One lens-shaped leaf with a midrib, starting at (x,y), pointing at angle a. */
function leafPath(x: number, y: number, L: number, W: number, a: number): string {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const P = (u: number, v: number) => `${f1(x + u * c - v * s)},${f1(y + u * s + v * c)}`;
  return `M${f1(x)},${f1(y)} Q${P(L * 0.42, -W)} ${P(L, 0)} Q${P(L * 0.42, W)} ${f1(x)},${f1(y)} M${P(L * 0.12, 0)} L${P(L * 0.78, 0)}`;
}

/** The frond generator from the mockup: one SVG path for stem + leaves. */
export function frondPath({ p0, p1, pc, n, len, wid, ang, alt = false, taper = 0.75 }: FrondSpec): string {
  const B = (t: number): Pt => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * pc[0] + t * t * p1[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * pc[1] + t * t * p1[1],
  ];
  const T = (t: number): Pt => [2 * (1 - t) * (pc[0] - p0[0]) + 2 * t * (p1[0] - pc[0]), 2 * (1 - t) * (pc[1] - p0[1]) + 2 * t * (p1[1] - pc[1])];
  let d = `M${p0.join(',')} Q${pc.join(',')} ${p1.join(',')}`;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const [x, y] = B(t);
    const [tx, ty] = T(t);
    const base = Math.atan2(ty, tx);
    const L = len * (1 - t * taper);
    const W = wid * (1 - t * taper * 0.8);
    const sides = alt ? [i % 2 ? 1 : -1] : [1, -1];
    for (const sd of sides) d += ' ' + leafPath(x, y, L, W, base + sd * ang);
  }
  const [tx, ty] = T(1);
  d += ' ' + leafPath(p1[0], p1[1], len * (1 - taper) * 1.1, wid * 0.35, Math.atan2(ty, tx));
  return d;
}

/** Fixed placements (spec §10.3). Same inputs → same drawing, every time. */
export const BOTANY = {
  frond: { w: 190, h: 230, p0: [185, 236], p1: [70, 20], pc: [120, 140], n: 9, len: 46, wid: 10, ang: 1.0 },
  frond2: { w: 170, h: 190, p0: [180, 196], p1: [60, 10], pc: [90, 130], n: 8, len: 40, wid: 9, ang: 0.95 },
  branch: { w: 160, h: 250, p0: [170, 250], p1: [88, 6], pc: [96, 150], n: 7, len: 44, wid: 14, ang: 0.85, alt: true, taper: 0.5 },
  clearing: { w: 200, h: 250, p0: [200, 250], p1: [62, 22], pc: [150, 110], n: 11, len: 44, wid: 9, ang: 1.05 },
} satisfies Record<string, FrondSpec>;

/**
 * Lesson-cover branches, one variant per domain tone (spec §10.3: "5 presets,
 * no images"): the same alternate-leaf branch with a different leaf angle,
 * taper and leaf count, so each domain's cover has its own silhouette.
 */
export const BRANCHES: FrondSpec[] = [
  BOTANY.branch,
  { ...BOTANY.branch, ang: 0.7, taper: 0.4, n: 8 },
  { ...BOTANY.branch, ang: 1.0, taper: 0.6, alt: false, n: 5, wid: 11 },
  { ...BOTANY.branch, ang: 0.9, taper: 0.35, pc: [130, 150], n: 6 },
  { ...BOTANY.branch, ang: 0.78, taper: 0.55, pc: [70, 140], n: 7, len: 40 },
];

export type BotanyKind = keyof typeof BOTANY | 'branch0' | 'branch1' | 'branch2' | 'branch3' | 'branch4';

function specFor(kind: BotanyKind): FrondSpec {
  const m = /^branch(\d)$/.exec(kind);
  return m ? BRANCHES[Number(m[1]) % BRANCHES.length] : BOTANY[kind as keyof typeof BOTANY];
}

/** The drawing's box in points, so a parent can size its art slot exactly (no "size from children"). */
export function botanySize(kind: BotanyKind): { width: number; height: number } {
  const spec = specFor(kind);
  return { width: spec.w, height: spec.h };
}

/**
 * The sway pivot (the stem base) in POINTS, e.g. "185px 236px".
 * Points, not percentages: a percentage pivot is resolved against the view's
 * measured size, and on Android the first frames can be applied before
 * layout. A pixel pivot is the same on every platform from the first frame.
 */
export function swayOrigin(kind: BotanyKind): string {
  const spec = specFor(kind);
  return `${Math.round(spec.p0[0])}px ${Math.round(spec.p0[1])}px`;
}

/**
 * Decorative line art (hidden from screen readers). With `sway`, the frond
 * rocks ±1.5° over 4 s from its stem base, only while the screen is focused
 * and never under Reduce Motion (spec §10.3). With `breathe`, it takes ONE
 * slow breath (1.2 s) and stays still: the Exam-ready moment.
 */
export function Botany({ kind = 'frond', color, sway = false, breathe = false }: { kind?: BotanyKind; color: string; sway?: boolean; breathe?: boolean }) {
  const spec = specFor(kind);
  const d = useMemo(() => frondPath(spec), [spec]);
  const { reduced: reduce } = useMotion();
  const angle = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      if (!sway || reduce) return;
      angle.set(
        withRepeat(
        withSequence(
          withTiming(1.5, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1.5, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      );
      // Paused when the screen loses focus (off-screen).
      return () => {
        cancelAnimation(angle);
        angle.set(0);
      };
    }, [sway, reduce, angle]),
  );
  // One slow breath (the Exam-ready moment): out to 1.5° and back, once, never a loop.
  useEffect(() => {
    if (!breathe || sway || reduce) return;
    angle.set(
      withSequence(
        withTiming(1.5, { duration: motion.dur.celebrate / 2, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
        withTiming(0, { duration: motion.dur.celebrate / 2, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
      ),
    );
    return () => cancelAnimation(angle);
  }, [breathe, sway, reduce, angle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  const art = (
    <Svg width={spec.w} height={spec.h} viewBox={`0 0 ${spec.w} ${spec.h}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
  if (!sway && !breathe) return art;
  // Rotate around the stem base (bottom-right), like a frond in a breeze.
  // Explicit width/height + a pixel pivot: the rotating view never depends on
  // measuring its child first (Android hardening, see HeroPanel in ui.tsx).
  return (
    <Animated.View style={[{ width: spec.w, height: spec.h, transformOrigin: swayOrigin(kind) }, style]}>{art}</Animated.View>
  );
}

/** The empty-state seedling (spec §10.3): stem, two seed leaves, one true leaf, fading soil. */
export function Seedling({ color, size = 170 }: { color: string; size?: number }) {
  const d = useMemo(
    () => `M80,150 C80,128 80,112 82,96 ${leafPath(82, 98, 44, 15, -2.55)} ${leafPath(82, 92, 50, 16, -0.5)} ${leafPath(81, 124, 22, 7, -2.2)}`,
    [],
  );
  return (
    <Svg width={size} height={(size * 176) / 170} viewBox="0 0 170 176" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
      <Path d="M28 151 Q80 143 136 151" />
      <Path d="M46 160 Q80 155 116 160" opacity={0.55} />
      <Path d="M62 168 Q80 165 100 168" opacity={0.3} />
    </Svg>
  );
}

// ── Empty-state art (mobile 1.9, ui.md E1) ─────────────────────────────
/**
 * One drawing per empty place, in the seedling's hand (1.5 stroke, round
 * caps, lens leaves), so a learner can tell where they are at a glance:
 * - seedling: something new will grow here (the default);
 * - fern: a fiddlehead uncurling (spaced review: questions come back around);
 * - bookmark: a ribbon standing in the soil with a sprig on it (saved questions);
 * - pressed: a leaf taped to a herbarium sheet, with its label (the mistake journal);
 * - fieldbook: an open field book, a sprig and notes (the question bank, reports).
 * Paths are fixed maths, built once. Decorative: hidden from screen readers.
 */
export type EmptyArtKind = 'seedling' | 'fern' | 'bookmark' | 'pressed' | 'fieldbook';

const SOIL = ['M28 151 Q80 143 136 151', 'M46 160 Q80 155 116 160', 'M62 168 Q80 165 100 168'];
const SOIL_OPACITY = [1, 0.55, 0.3];

/** A fiddlehead: a stem from the soil that winds inward 1.7 turns, with folded leaflets. */
function koruPath(): string {
  const cx = 92;
  const cy = 66;
  const a0 = Math.atan2(86 - cy, 104 - cx);
  const r0 = Math.hypot(104 - cx, 86 - cy);
  let d = 'M92,150 C90,128 98,108 104,86';
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const a = a0 - t * Math.PI * 3.4;
    const r = r0 * Math.exp(-1.84 * t);
    d += `${i ? 'L' : ' M'}${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))}`;
  }
  return `${d} ${leafPath(96, 126, 14, 4, -2.5)} ${leafPath(97, 118, 14, 4, -0.55)} ${leafPath(100, 104, 11, 3.2, -2.45)} ${leafPath(101, 98, 11, 3.2, -0.6)}`;
}

/** A pressed leaf (midrib, veins), its label, and the two strips of tape that hold it (drawn on paper). */
function pressedPaths(): { d: string; knock: string } {
  const [x, y, L, W, a] = [42, 132, 108, 30, -0.88];
  const c = Math.cos(a);
  const s = Math.sin(a);
  const P = (u: number, v: number): Pt => [x + u * c - v * s, y + u * s + v * c];
  const p = (u: number, v: number) => P(u, v).map(f1).join(',');
  let d = `M${p(0, 0)} Q${p(L * 0.42, -W)} ${p(L, 0)} Q${p(L * 0.42, W)} ${p(0, 0)} M${p(-10, 0)} L${p(L * 0.9, 0)}`;
  for (const u of [0.22, 0.38, 0.54, 0.7]) {
    for (const sd of [1, -1]) d += ` M${p(L * u, 0)} Q${p(L * (u + 0.06), sd * W * 0.45)} ${p(L * (u + 0.13), sd * W * 0.62 * (1 - u * 0.5))}`;
  }
  d += ' M104,140 L148,140 L148,162 L104,162 Z M110,148 L140,148 M110,155 L130,155';
  const tape = (u: number, len: number, w: number) => `M${[P(u - w, -len), P(u + w, -len), P(u + w, len), P(u - w, len)].map((q) => q.map(f1).join(',')).join(' L')} Z`;
  return { d, knock: `${tape(-3, 10, 5.5)} ${tape(L * 0.64, 20, 5.5)}` };
}

const EMPTY_ART: Record<EmptyArtKind, { d: string; knock?: string; ground: string[] }> = (() => {
  const pressed = pressedPaths();
  return {
    seedling: { d: `M80,150 C80,128 80,112 82,96 ${leafPath(82, 98, 44, 15, -2.55)} ${leafPath(82, 92, 50, 16, -0.5)} ${leafPath(81, 124, 22, 7, -2.2)}`, ground: SOIL },
    fern: { d: `${koruPath()} ${frondPath({ w: 0, h: 0, p0: [84, 150], p1: [40, 78], pc: [70, 102], n: 5, len: 22, wid: 6.5, ang: 0.95 })}`, ground: SOIL },
    bookmark: {
      d: `M66,44 L104,44 L104,144 L85,129 L66,144 Z ${frondPath({ w: 0, h: 0, p0: [85, 116], p1: [86, 60], pc: [80, 88], n: 4, len: 14, wid: 4.5, ang: 0.95, alt: true })} M118,150 C117,134 120,118 128,104 ${leafPath(119, 132, 16, 5, -0.5)} ${leafPath(121, 122, 14, 4.5, -2.6)} ${leafPath(128, 104, 12, 4, -1.1)}`,
      ground: SOIL,
    },
    pressed: { d: pressed.d, knock: pressed.knock, ground: [] },
    fieldbook: {
      d: `M85,62 C70,54 48,54 26,60 L26,134 C48,128 70,128 85,136 Z M85,62 C100,54 122,54 144,60 L144,134 C122,128 100,128 85,136 ${frondPath({ w: 0, h: 0, p0: [55, 124], p1: [58, 66], pc: [48, 96], n: 5, len: 15, wid: 4.6, ang: 0.95, alt: true })} M98,76 L132,73 M98,86 L132,83 M98,96 L126,94 M98,106 L130,104 M98,116 L118,115`,
      ground: ['M30 148 Q85 141 140 148', 'M52 157 Q85 153 118 157'],
    },
  };
})();

/** An empty state's drawing (170 × 176 at full size). `paper` knocks out the tape over the pressed leaf. */
export function EmptyArt({ art, color, paper, size = 170 }: { art: EmptyArtKind; color: string; paper: string; size?: number }) {
  const a = EMPTY_ART[art];
  return (
    <Svg width={size} height={(size * 176) / 170} viewBox="0 0 170 176" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d={a.d} />
      {a.knock ? <Path d={a.knock} fill={paper} /> : null}
      {a.ground.map((d, i) => (
        <Path key={i} d={d} opacity={SOIL_OPACITY[i]} />
      ))}
    </Svg>
  );
}

// ── Growth rings: readiness as a tree cross-section (spec §10.1) ─────────
/**
 * One ring per domain, inner = Domain 1 → outer = last domain. Ring
 * thickness ∝ exam weight; arc length = mastery (0–1) from 12 o'clock,
 * clockwise. All rings share one gentle wobble so they read as wood.
 */
export type RingTone = 'mono' | 'domains' | 'sap';
export const RING_PRESETS = {
  today: { size: 104, k: 0.24, r0: 13, gap: 3, pith: true },
  /** You and Results: a wider core (38, mockup 34) so a range like "62–70%" fits inside; thinner rings keep it ~178pt. */
  you: { size: 172, k: 0.32, r0: 38, gap: 3.6, pith: false },
  mini: { size: 48, k: 0.13, r0: 5, gap: 1.2, pith: true },
} as const;
export type RingPreset = keyof typeof RING_PRESETS;

const wobble = (rm: number, t: number) => rm * (1 + 0.022 * Math.sin(3 * t + 0.6) + 0.012 * Math.sin(5 * t + 1.9) + 0.008 * Math.sin(8 * t));

/** SVG path for a wobbly ring arc and its length (for the grow animation). */
export function ringArc(c: number, rm: number, a0: number, a1: number): { d: string; length: number } {
  const n = Math.max(12, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 120));
  let d = '';
  let length = 0;
  let prev: [number, number] | null = null;
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    const r = wobble(rm, t);
    const p: [number, number] = [c + r * Math.cos(t), c + r * Math.sin(t)];
    d += `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    if (prev) length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return { d, length };
}

/** Each ring's stroke width and mid radius, inner → outer, plus its full track path. */
function ringGeometry(weights: number[], k: number, r0: number, gap: number, c: number) {
  const out: { w: number; rm: number; track: string }[] = [];
  let r = r0;
  for (const wt of weights) {
    const w = wt * k;
    out.push({ w, rm: r + w / 2, track: ringArc(c, r + w / 2, 0, Math.PI * 2).d });
    r += w + gap;
  }
  return out;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function GrowthRings({
  preset,
  mastery,
  weights,
  colors,
  track,
  accessibilityLabel,
  replay = false,
  grow,
}: {
  preset: RingPreset;
  /** 0..1 per domain, blueprint order (inner → outer). */
  mastery: number[];
  weights: number[];
  /** One colour per ring (domain tones), or a single colour for all. */
  colors: string[] | string;
  track: string;
  accessibilityLabel?: string;
  /** Grow the arcs on mount even if this preset already grew today (a signature moment). */
  replay?: boolean;
  /**
   * Mobile 1.9: the caller decides (motion.tsx useGrowth / a celebration):
   * grow now when `play`, each arc from `from` (0..1, the value last seen)
   * to its mastery, after `delay`; `run` restarts it. Replaces the
   * once-a-day rule. Arcs never shrink: a lower value just shows.
   */
  grow?: { play: boolean; from?: number[]; run?: number; delay?: number };
}) {
  const { k, r0, gap, pith } = RING_PRESETS[preset];
  // The box fits the outer ring plus its wobble (+4.2% at most), so nothing clips.
  const outer = r0 + weights.reduce((s, w) => s + w * k, 0) + gap * Math.max(0, weights.length - 1);
  const size = Math.max(RING_PRESETS[preset].size, Math.ceil(outer * 1.045) * 2 + 2);
  const c = size / 2;
  const rings = useMemo(() => ringGeometry(weights, k, r0, gap, c), [weights, k, r0, gap, c]);
  const arcs = useMemo(
    () => rings.map((ring, i) => ringArc(c, ring.rm, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, Math.min(1, mastery[i] ?? 0)))),
    [rings, mastery, c],
  );
  // Grows on the first view of each day per preset (spec §10.1), or every
  // mount when `replay` asks for it. Static under Reduce Motion.
  const { reduced } = useMotion();
  const first = useOncePerDay(`rings:${preset}`);
  const animate = !reduced && (grow ? grow.play : replay || first);
  const colorAt = (i: number) => (typeof colors === 'string' ? colors : colors[i % colors.length]);
  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => (
          <Path key={`t${i}`} d={`${ring.track}Z`} fill="none" stroke={track} strokeWidth={ring.w} />
        ))}
        {rings.map((ring, i) =>
          // Nothing yet in this domain: just the track, no stray round-cap dot.
          (mastery[i] ?? 0) <= 0 ? null : (
          <RingArc
            key={`a${i}`}
            d={arcs[i].d}
            length={arcs[i].length}
            width={ring.w}
            color={colorAt(i)}
            animate={animate}
            // Where this arc starts, as a share of its own length (an arc never shrinks).
            start={grow?.from ? Math.max(0, Math.min(1, (grow.from[i] ?? 0) / Math.max(0.001, mastery[i] ?? 0))) : 0}
            run={grow?.run ?? 0}
            // Outer ring first, 60ms apart.
            delay={(grow?.delay ?? 0) + (rings.length - 1 - i) * motion.stagger.stat}
          />
          ),
        )}
        {pith && <Circle cx={c} cy={c} r={r0 * 0.32} fill={colorAt(0)} />}
      </Svg>
    </View>
  );
}

function RingArc({
  d,
  length,
  width,
  color,
  animate,
  start,
  run,
  delay,
}: {
  d: string;
  length: number;
  width: number;
  color: string;
  animate: boolean;
  start: number;
  run: number;
  delay: number;
}) {
  // Inside a celebration that was skipped or has ended: drawn in full now.
  const settled = useCelebrationSettled();
  const p = useSharedValue(animate ? start : 1);
  useEffect(() => {
    if (!animate || settled || start >= 1) {
      cancelAnimation(p);
      p.set(1);
      return;
    }
    p.set(withSequence(withTiming(start, { duration: 0, reduceMotion: ReduceMotion.Never }), withDelay(delay, withTiming(1, { duration: motion.dur.grow, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }))));
  }, [animate, settled, start, run, delay, p]);
  // At (almost) 0 the dash is empty but its round cap would still draw a dot: hide it until it grows.
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value), strokeOpacity: p.value < 0.01 ? 0 : 1 }));
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={`${length} ${length}`}
      animatedProps={props}
    />
  );
}
