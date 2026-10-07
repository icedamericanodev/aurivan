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
import { useMemo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

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

/** 22pt filled leaf with a midrib in the background colour (Key idea node). */
export function LeafBig({ color, rib }: { color: string; rib: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
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

export type BotanyKind = keyof typeof BOTANY;

/** Decorative line art (hidden from screen readers). */
export function Botany({ kind = 'frond', color }: { kind?: BotanyKind; color: string }) {
  const spec: FrondSpec = BOTANY[kind];
  const d = useMemo(() => frondPath(spec), [spec]);
  return (
    <Svg width={spec.w} height={spec.h} viewBox={`0 0 ${spec.w} ${spec.h}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}
