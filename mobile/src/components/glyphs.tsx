/**
 * Grove v2 custom drawings (docs/mobile/DESIGN_SYSTEM.md §7, §10.2, §10.3).
 *
 * - Tab/streak glyphs drawn on Lucide's 24 grid with a 1.75 stroke, so they
 *   sit next to Lucide icons without looking different: Sprout (Today tab),
 *   Rings (You tab), Pinwheel (Play tab, mobile 1.22), Sprig (streak).
 * - Leaf marks used by the answer screen: the verdict leaf, the big Key idea
 *   leaf and the small tip leaves on the vine.
 * - Botanical line art for the forest panel: one quadratic stem with
 *   lens-shaped leaves. Paths are pure maths with fixed inputs, so the art
 *   never changes between renders.
 *
 * Colours always come in as props (palette tokens); nothing here is hard-coded.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
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
import type { GameId } from '../engine/games/registry';
import type { GameTier } from '../engine/games/growth';
import { Pop, useCelebrationSettled, useMotion, useOncePerDay } from './motion';

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

/**
 * Mobile 1.22: the Play tab. Four leaves turning about one centre like a
 * pinwheel: a toy, so "play", drawn from the house's leaf (the same lens
 * leaves as Sprout and the vine), not a borrowed game controller. Stroke
 * only, like the other tab glyphs; rotationally balanced so it sits in the
 * bar at the same visual weight as Sprout and Rings.
 */
export function Pinwheel({ size = 24, color, strokeWidth = 1.75 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 12C12 8 13.5 4.5 17 3.5C17.5 7 15.5 10.5 12 12Z" />
      <Path d="M12 12C16 12 19.5 13.5 20.5 17C17 17.5 13.5 15.5 12 12Z" />
      <Path d="M12 12C12 16 10.5 19.5 7 20.5C6.5 17 8.5 13.5 12 12Z" />
      <Path d="M12 12C8 12 4.5 10.5 3.5 7C7 6.5 10.5 8.5 12 12Z" />
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

/**
 * A game level that changes in front of the learner (mobile 1.12, motion.md
 * M5): the old leaf fades out (160 ms) while the new one springs in from .6
 * (`leaf`), so Seedling → Sapling → Heartwood reads as growth. Nothing moves
 * on mount. `grow` is the round end's level-up while its moment plays
 * (RoundEnd passes it only for a FULL celebration): the leaf shows the level
 * before (`from`) and grows once after `delay`. When `grow` goes away first
 * (skipped, or the moment ended), the new level just shows. Either way
 * `onGrown` runs once, after that commit (the round end's one haptic: a
 * skip never loses it). The old leaf always fades out (the morph, and the
 * level-up's grow). Reduced: the new leaf fades in (120 ms). Decorative: the
 * level's name is always written beside it.
 */
export function TierLeafMorph({
  tier,
  color,
  rib,
  size = 16,
  grow,
  onGrown,
}: {
  tier: GameTier;
  color: string;
  rib?: string;
  size?: number;
  /** The round end's level-up, while its moment plays: start on `from`, grow to `tier` after `delay`. */
  grow?: { from: GameTier; delay: number };
  /** The level-up has arrived (grown, or skipped to): once per level-up. */
  onGrown?: () => void;
}) {
  const [shown, setShown] = useState<GameTier>(grow ? grow.from : tier);
  const [moved, setMoved] = useState(0);
  const [last, setLast] = useState(tier);
  // A level-up waiting to grow, and whether it has (it grows once).
  const [growing, setGrowing] = useState(Boolean(grow));
  const [grew, setGrew] = useState(false);
  // All decided while rendering, so no frame shows a level it shouldn't.
  if (last !== tier) {
    // A new level chosen while on screen (the intro's picker): morph to it.
    setLast(tier);
    setShown(tier);
    setMoved((m) => m + 1);
  } else if (grow && !growing && !grew) {
    // The level-up moment has started: back to the level it grew from.
    setGrowing(true);
    setShown(grow.from);
  } else if (!grow && growing) {
    // Skipped or over before it grew: the new level, still.
    setGrowing(false);
    setGrew(true);
    setShown(tier);
  }
  const growDelay = grow?.delay ?? 0;
  useEffect(() => {
    if (!growing) return;
    const t = setTimeout(() => {
      setShown(tier);
      setMoved((m) => m + 1);
      setGrowing(false);
      setGrew(true);
    }, growDelay);
    return () => clearTimeout(t);
    // Once per start of the level-up (the delay is fixed for the round end's life).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growing]);
  // The level-up has arrived (it grew, or a skip settled it): tell the round end once.
  const grownRef = useRef(onGrown);
  useLayoutEffect(() => {
    grownRef.current = onGrown;
  });
  useEffect(() => {
    if (grew) grownRef.current?.();
  }, [grew]);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Animated.View
        key={`${shown}:${moved}`}
        // The leaf on screen fades out when it is replaced: a morph (moved), or the level-up's
        // `from` leaf as it grows (Reanimated reads `exiting` from the element's last render).
        exiting={moved || growing ? FadeOut.duration(motion.dur.quick).reduceMotion(ReduceMotion.Never) : undefined}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Pop mount={moved > 0} from={0.6} spring="leaf">
          <TierLeaf tier={shown} color={color} rib={rib} size={size} />
        </Pop>
      </Animated.View>
    </View>
  );
}

// ── Game glyphs (mobile 1.12, ui.md G1) ────────────────────────────────
/**
 * One original glyph per game, on Lucide's 24 grid with the 1.75 stroke, so
 * a game is told apart at a glance on Play, in its header, its intro and its
 * recap. Botanical and calm, and none of them repeats a badge emblem (no
 * signpost, sundial, book, cairn or footprint; those belong to badges):
 * - trap (Snare Spotter): a flytrap, a plant built to fool;
 * - sprint (Forecast): a cloud with the sun behind it, a forecast of your own answer;
 * - priority (Signpost): a path that forks, one way marked;
 * - daylight: the sun on its day's arc over the ground (its sun can rise once);
 * - rumor (Root or Rumor): a dandelion, its seeds blowing away like a rumor;
 * - callit (Call It First): a bellflower, the call;
 * - field (Field Guide): a leaf beside its entry lines (a term and its meaning);
 * - canopy (Canopy Call): one broad tree crown, who decides at the top;
 * - stones (Stepping Stones): stones across water, one after another.
 * Fills are a 22% tint of the stroke (like the streak sprig), so the glyph
 * works on paper, on `soft` and on the forest panel. Decorative.
 */
type GlyphPart = { d: string; fill?: 'tint' | 'solid'; dash?: string; opacity?: number; width?: number; sun?: boolean };
export const GAME_GLYPHS: Record<GameId, GlyphPart[]> = {
  trap: [
    { d: 'M12 21.5V14.2' },
    { d: 'M12 14.2C8.6 14 5.4 11.6 4.6 7.2C8.4 7 11.4 9.6 12 14.2Z', fill: 'tint' },
    { d: 'M12 14.2C15.4 14 18.6 11.6 19.4 7.2C15.6 7 12.6 9.6 12 14.2Z', fill: 'tint' },
    { d: 'M4.6 7.2L3.6 5.3M6.9 7.2L6.6 5.1M9.1 7.9L9.6 6.1' },
    { d: 'M19.4 7.2L20.4 5.3M17.1 7.2L17.4 5.1M14.9 7.9L14.4 6.1' },
    { d: 'M12 19.2Q9.41 19.87 7.83 17.26Q10.84 16.78 12 19.2Z' },
  ],
  sprint: [
    { d: 'M12.5 10.33A3.3 3.3 0 1 1 18.7 10.33' },
    { d: 'M15.6 3.2V4.4M20.1 5L19.2 5.9M21.7 9.2H20.5' },
    { d: 'M7.2 19.5H16.6A3.4 3.4 0 0 0 16.9 12.7A5 5 0 0 0 7.4 14.2A2.7 2.7 0 0 0 7.2 19.5Z', fill: 'tint' },
  ],
  priority: [
    { d: 'M12 21.5V14' },
    { d: 'M12 14C12 11 9.6 9.4 5.6 8.2' },
    { d: 'M12 14C12 11 14.4 9.4 18.6 8.2' },
    { d: 'M15.4 6.8L18.6 8.2L17.2 11.4' },
    { d: 'M8.8 21.5H15.2' },
  ],
  daylight: [
    { d: 'M10.4 9.2A8.5 8.5 0 0 1 20.5 17.5', dash: '0.1 2.7' },
    { d: 'M2.5 20.5H21.5' },
    { d: 'M7 10.6m-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0Z', fill: 'tint', sun: true },
    { d: 'M3.5 17.5A8.5 8.5 0 0 1 3.8 15.3', dash: '0.1 2.7' },
  ],
  rumor: [
    { d: 'M10.5 21.5V12.6' },
    { d: 'M10.5 17.4C8.7 17.4 7.1 16.4 6.5 14.6C8.4 14.4 9.9 15.5 10.5 17.4Z', fill: 'tint' },
    { d: 'M10.5 9m-1.3 0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0Z', fill: 'solid' },
    { d: 'M9.18 10.88L7.63 13.1M8.28 9.6L5.67 10.29M8.42 8.03L5.97 6.89M9.53 6.92L8.39 4.47M11.1 6.78L11.79 4.17' },
    { d: 'M7.35 13.51h.01M5.19 10.42h.01M5.52 6.68h.01M8.18 4.02h.01M11.92 3.69h.01', width: 2.6 },
    { d: 'M15 6.4L17.2 4.4M15.6 10.6L18.4 10' },
    { d: 'M18 3.7h.01M19.3 9.8h.01', width: 2.6 },
  ],
  callit: [
    { d: 'M5.5 21.5C5.5 13 8.6 6 15.4 5.6C16.4 5.5 17.2 6 17.2 7' },
    { d: 'M13.9 8.3C13.7 10.3 13.1 11.8 12.4 12.9C13.4 12.5 14.4 12.7 15 13.3C15.8 12.5 17.2 12.3 18 12.9C18.6 12.4 19.8 12.4 21 12.9C20.3 11.8 19.7 10.3 19.5 8.3C19 6.7 14.4 6.7 13.9 8.3Z', fill: 'tint' },
    { d: 'M16.7 13.4V15.2' },
    { d: 'M6.4 15.4Q6.96 12.71 10.08 12.31Q9.15 15.31 6.4 15.4Z', fill: 'tint' },
  ],
  field: [
    { d: 'M4 19.4Q3.04 12.26 10.1 7.92Q10.45 16.21 4 19.4Z', fill: 'tint' },
    { d: 'M5.2 17.2L8.4 11.2' },
    { d: 'M13.4 7.6H20.6M13.4 11.6H20.6M13.4 15.6H18' },
  ],
  canopy: [
    { d: 'M4.4 12C2.6 11.8 2.4 9 4.4 8.6C4.2 6 7 4.6 9 5.6C10 3.4 14 3.4 15 5.6C17 4.6 19.8 6 19.6 8.6C21.6 9 21.4 11.8 19.6 12C15 12.9 9 12.9 4.4 12Z', fill: 'tint' },
    { d: 'M12 21.5V15.6M12 15.6L8.6 12.6M12 15.6L15.4 12.6' },
    { d: 'M8.5 21.5H15.5' },
  ],
  stones: [
    { d: 'M3 18.2a3.2 1.7 0 1 0 6.4 0a3.2 1.7 0 1 0-6.4 0Z', fill: 'tint' },
    { d: 'M9 13.4a3.2 1.7 0 1 0 6.4 0a3.2 1.7 0 1 0-6.4 0Z', fill: 'tint' },
    { d: 'M15 8.6a3.2 1.7 0 1 0 6.4 0a3.2 1.7 0 1 0-6.4 0Z', fill: 'tint' },
    { d: 'M12.4 21.4q1.4-1 2.8 0t2.8 0M2.5 11.2q1.4-1 2.8 0t2.8 0', opacity: 0.6 },
  ],

};

function glyphPart(p: GlyphPart, k: number, color: string) {
  return (
    <Path
      key={k}
      d={p.d}
      fill={p.fill ? color : 'none'}
      fillOpacity={p.fill === 'tint' ? 0.22 : 1}
      strokeDasharray={p.dash}
      opacity={p.opacity}
      strokeWidth={p.width}
    />
  );
}

const glyphSvg = (size: number, color: string) =>
  ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const;

/**
 * A game's glyph: a plain SVG (no animated nodes: Play shows nine, and every
 * round header and recap one). `rise` (Daylight's intro): its sun rises once
 * into place, 4 points over `grow`, as the screen opens (RisingGlyph, the
 * only animated form). Reduced: the sun is simply there.
 */
export function GameGlyph({ game, size = 24, color, rise = false }: { game: GameId; size?: number; color: string; rise?: boolean }) {
  const parts = GAME_GLYPHS[game];
  const { reduced } = useMotion();
  if (rise && !reduced && parts.some((p) => p.sun)) return <RisingGlyph parts={parts} size={size} color={color} />;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg {...glyphSvg(size, color)}>{parts.map((p, k) => glyphPart(p, k, color))}</Svg>
    </View>
  );
}

/** Daylight's intro glyph: the ground and arc still, the sun rising once (4pt over `grow`) and fading in. */
function RisingGlyph({ parts, size, color }: { parts: GlyphPart[]; size: number; color: string }) {
  const y = useSharedValue((4 * size) / 24);
  const o = useSharedValue(0);
  useEffect(() => {
    y.set(withTiming(0, { duration: motion.dur.grow, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
    o.set(withTiming(1, { duration: motion.dur.enter, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
  }, [y, o]);
  const sunStyle = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  const svgProps = glyphSvg(size, color);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Svg {...svgProps}>{parts.map((p, k) => (p.sun ? null : glyphPart(p, k, color)))}</Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, sunStyle]}>
        <Svg {...svgProps}>{parts.map((p, k) => (p.sun ? glyphPart(p, k, color) : null))}</Svg>
      </Animated.View>
    </View>
  );
}

// ── Sparkline (mobile 1.12, ui.md G4) ──────────────────────────────────
/** The sparkline's box, and the inset of its first and last points (labels line up under them). */
export const SPARK = { width: 168, height: 44, pad: 6 } as const;

/** Points for a sparkline in a w × h box (a flat run sits in the middle). Exported for tests. */
export function sparkPoints(values: number[], w: number, h: number, pad: number = SPARK.pad): [number, number][] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const n = values.length;
  // More room on top: the last point carries a leaf that stands 9pt above it.
  const top = pad + 8;
  return values.map((v, i) => [
    pad + (n > 1 ? (i * (w - 2 * pad)) / (n - 1) : (w - 2 * pad) / 2),
    max === min ? (top + h - pad) / 2 : top + (1 - (v - min) / (max - min)) * (h - top - pad),
  ]);
}

/**
 * A quiet trend line (a game's last few round scores): `accent` 1.75
 * stroke, small open points, and the last point a filled leaf. Static (the
 * round's own score already rolled). Decorative: the caller speaks the trend
 * in one sentence and prints the numbers.
 */
export function Sparkline({ values, color, paper, width = SPARK.width, height = SPARK.height }: { values: number[]; color: string; paper: string; width?: number; height?: number }) {
  const pts = useMemo(() => sparkPoints(values, width, height), [values, width, height]);
  if (pts.length < 2) return null;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)},${f1(y)}`).join('');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <Path d={d} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        {pts.slice(0, -1).map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.4} fill={paper} stroke={color} strokeWidth={1.5} />
        ))}
        {/* The latest round: a filled leaf standing on its point. */}
        <Path d={`M${f1(lx)},${f1(ly + 4)}C${f1(lx - 5)},${f1(ly + 1)} ${f1(lx - 5)},${f1(ly - 6)} ${f1(lx)},${f1(ly - 9)}C${f1(lx + 5)},${f1(ly - 6)} ${f1(lx + 5)},${f1(ly + 1)} ${f1(lx)},${f1(ly + 4)}Z`} fill={color} />
      </Svg>
    </View>
  );
}

// ── Learn: a domain's status ring (mobile 1.12, ui.md L1) ──────────────
/**
 * Before a Learn domain's name: its lessons as a small ring, in the domain's
 * tone. None done = a quiet `track` ring (mobile 1.21: no centre dot and no
 * `control` outline, which read as a radio button); some done = the ring
 * fills that far round in the tone (an arc); all done = a filled disc with a
 * ✓. Shape, not colour alone. Decorative: the row says "2 of 7".
 */
export function DomainRing({ done, total, tone, track, outline, paper, size = 20 }: { done: number; total: number; tone: string; track: string; outline: string; paper: string; size?: number }) {
  const c = size / 2;
  const rad = c - 2;
  const share = total > 0 ? Math.min(1, done / total) : 0;
  const full = total > 0 && done >= total;
  const a = -Math.PI / 2 + share * Math.PI * 2;
  const arc = `M${f1(c)},${f1(c - rad)}A${f1(rad)},${f1(rad)} 0 ${share > 0.5 ? 1 : 0} 1 ${f1(c + rad * Math.cos(a))},${f1(c + rad * Math.sin(a))}`;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        {full ? (
          <>
            <Circle cx={c} cy={c} r={c - 0.5} fill={tone} />
            <Path d={`M${f1(c - 4)},${f1(c + 0.2)}L${f1(c - 1.2)},${f1(c + 3)}L${f1(c + 4.2)},${f1(c - 2.6)}`} stroke={paper} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            {/* A status, not a control (mobile 1.21, spec §5 "One meaning per device"):
                a quiet ring with no centre dot, so it never reads as a radio button. */}
            <Circle cx={c} cy={c} r={rad} stroke={share > 0 ? track : outline} strokeWidth={2} />
            {share > 0 && <Path d={arc} stroke={tone} strokeWidth={2.4} strokeLinecap="round" />}
          </>
        )}
      </Svg>
    </View>
  );
}

// ── Lesson complete: the domain's branch, one leaf per lesson ──────────
/** Where each lesson's leaf sits on the branch (fixed maths, so it never changes between renders). Exported for tests. */
export function branchLeaves(total: number, w: number, h: number): { d: string; stem: string } {
  // The stem runs low-left to mid-right, with a leaf's length clear of every edge.
  const p0: Pt = [6, h - 30];
  const p1: Pt = [w - 6, 30];
  const pc: Pt = [w * 0.45, h - 22];
  const B = (t: number): Pt => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * pc[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * pc[1] + t * t * p1[1]];
  const T = (t: number): Pt => [2 * (1 - t) * (pc[0] - p0[0]) + 2 * t * (p1[0] - pc[0]), 2 * (1 - t) * (pc[1] - p0[1]) + 2 * t * (p1[1] - pc[1])];
  const n = Math.max(1, total);
  const leaves: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6) / (n + 0.4);
    const [x, y] = B(t);
    const [tx, ty] = T(t);
    const side = i % 2 ? 1 : -1;
    leaves.push(leafPath(x, y, Math.min(24, (w / n) * 1.2), Math.min(8.5, (w / n) * 0.4), Math.atan2(ty, tx) + side * 0.95));
  }
  return { d: leaves.join('|'), stem: `M${p0.join(',')} Q${pc.map(f1).join(',')} ${p1.join(',')}` };
}

const AnimatedLeaf = Animated.createAnimatedComponent(Path);

/**
 * Lesson complete (mobile 1.12, ui.md LP6): the domain's lessons as leaves
 * on one branch. Done = filled, still to do = outline. `fresh` is the
 * lesson just finished: with `play` its leaf fills in (over `grow`, after
 * `delay`), the one thing that moves; inside a settled celebration, or
 * reduced, it is simply filled. Decorative: the line under it says it in words.
 */
export function LessonBranch({ total, done, fresh, play, delay = 0, color, width = 280, height = 112 }: { total: number; done: boolean[]; fresh: number | null; play: boolean; delay?: number; color: string; width?: number; height?: number }) {
  const geo = useMemo(() => branchLeaves(total, width, height), [total, width, height]);
  const leaves = geo.d.split('|');
  const { reduced } = useMotion();
  const settled = useCelebrationSettled();
  const grows = play && !reduced && !settled && fresh !== null;
  const p = useSharedValue(grows ? 0 : 1);
  // Before paint: the celebration decides its mode in a layout effect, so the
  // fresh leaf must empty itself in the same frame (never shown full, then emptied).
  useLayoutEffect(() => {
    if (!grows) {
      cancelAnimation(p);
      p.set(1);
      return;
    }
    p.set(
      withSequence(
        withTiming(0, { duration: 0, reduceMotion: ReduceMotion.Never }),
        withDelay(delay, withTiming(1, { duration: motion.dur.grow, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never })),
      ),
    );
  }, [grows, delay, p]);
  const freshProps = useAnimatedProps(() => ({ fillOpacity: p.value }));
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d={geo.stem} />
        {leaves.map((d, i) =>
          i === fresh ? (
            <AnimatedLeaf key={i} d={d} fill={color} animatedProps={freshProps} />
          ) : (
            <Path key={i} d={d} fill={done[i] ? color : 'none'} />
          ),
        )}
      </Svg>
    </View>
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
      // Starts once the tab's fade-through has ended (performance, 1.15.x):
      // the first 240 ms of a 4 s sway are invisible anyway, and starting it
      // in the switch's own frames made the UI thread do both at once.
      angle.set(
        withDelay(
          motion.dur.enter,
          withRepeat(
            withSequence(
              withTiming(1.5, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
              withTiming(-1.5, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
              withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
          ),
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
    // Ended early (a tap skips the moment): upright at once, never left tilted.
    return () => {
      cancelAnimation(angle);
      angle.set(0);
    };
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

/** The herbarium sheet behind the pressed leaf: a page with one corner folded down. */
const HERBARIUM_SHEET = 'M24,22 L136,22 L148,34 L148,170 L24,170 Z M136,22 L136,34 L148,34';

const EMPTY_ART: Record<EmptyArtKind, { d: string; knock?: string; sheet?: string; ground: string[] }> = (() => {
  const pressed = pressedPaths();
  return {
    seedling: { d: `M80,150 C80,128 80,112 82,96 ${leafPath(82, 98, 44, 15, -2.55)} ${leafPath(82, 92, 50, 16, -0.5)} ${leafPath(81, 124, 22, 7, -2.2)}`, ground: SOIL },
    fern: { d: `${koruPath()} ${frondPath({ w: 0, h: 0, p0: [84, 150], p1: [40, 78], pc: [70, 102], n: 5, len: 22, wid: 6.5, ang: 0.95 })}`, ground: SOIL },
    bookmark: {
      d: `M66,44 L104,44 L104,144 L85,129 L66,144 Z ${frondPath({ w: 0, h: 0, p0: [85, 116], p1: [86, 60], pc: [80, 88], n: 4, len: 14, wid: 4.5, ang: 0.95, alt: true })} M118,150 C117,134 120,118 128,104 ${leafPath(119, 132, 16, 5, -0.5)} ${leafPath(121, 122, 14, 4.5, -2.6)} ${leafPath(128, 104, 12, 4, -1.1)}`,
      ground: SOIL,
    },
    pressed: { d: pressed.d, knock: pressed.knock, sheet: HERBARIUM_SHEET, ground: [] },
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
      {/* The sheet sits behind, quieter than the leaf it holds. */}
      {a.sheet ? <Path d={a.sheet} opacity={0.45} /> : null}
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
  /** Mobile 1.21: Today's condensed readiness row (one line of numbers beside it, not a block). */
  row: { size: 60, k: 0.13, r0: 6, gap: 1.5, pith: true },
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
  // The growth that last started: a new one starts only when `run` changes
  // (a new start value alone, e.g. mastery moving while the screen is hidden, never replays it).
  const startedRun = useRef<number | null>(null);
  // Before paint, so a returning screen never shows the full arc for a frame and then snaps back.
  useLayoutEffect(() => {
    if (!animate || settled || start >= 1) {
      cancelAnimation(p);
      p.set(1);
      return;
    }
    if (startedRun.current === run) return;
    startedRun.current = run;
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
