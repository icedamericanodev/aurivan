/**
 * ScaleBar (Field Guide §21.2): readiness as a map's scale bar. Ten
 * alternating segments from 0 to 100, the range as a bracket and a filled
 * band ("64 to 72", in words like the website: Grove has no dashes), and a tick at the app's study bar (80, the low end it
 * steers by), labelled 0 · 50 · 80 · 100. It replaces the readiness ring.
 *
 * The words are built in, so it can't ship without them: the range is
 * always followed by "a study estimate, not a prediction" (never "pass",
 * "ready" or "official"). Before the first range: "Not enough data yet" and
 * the countdown ("12 of 40 for your first range"), with no bracket.
 *
 * One screen-reader stop (or none, inside a button that says it): "Estimated
 * readiness 64 to 72 percent, a study estimate, not a prediction. The tick
 * marks this app's 80 percent study bar."
 *
 * Motion (premium round 2, #1): the ruler is the fixed reference, so it never
 * moves; the estimate does. When the range rose since the learner last looked,
 * the band and bracket slide and resize from the range last seen to now over
 * `grow` (600 ms, ease-out, the numeral's own roll), and the bracket's label
 * fades in as they land. On the day's first view (nothing seen yet) the band
 * opens from its centre (`openFrom` → 1 over `draw`, enter curve) and its end
 * ticks and label fade in to land with it. A fall never moves; when the low
 * end falls while the high end rises, the low edge moves at once and only the
 * high edge slides. Reduce Motion, or
 * nothing new: the finished bar.
 * At 200% text the numeral and its words stack; the bar keeps its labels at ×1.3.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { READY_LOW } from '../../engine/examReady';
import { RANGE_MIN_ANSWERS, type ReadinessRange } from '../../engine/readinessRange';
import { LARGE_TEXT, motion, percentSup, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ease, FadeIn, snap, tween, useMotion, type Growth } from '../motion';
import { BigNum, T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

/** The words that travel with every range. */
export const ESTIMATE_WORDS = 'a study estimate, not a prediction';

/**
 * "68 to 78": a range in words, as the website writes it (Grove: no dashes in
 * what a learner reads). Kept here, not in engine/readinessRange.ts, because
 * that file is compiled into the website's bundle.
 */
export const rangeWords = (r: { low: number; high: number }) => `${r.low} to ${r.high}`;

/**
 * The range as a figure: "68 to 78", two serif numbers with a small, muted "to"
 * between them (the website's You card: no % sign, no dash). Each number rolls
 * up from where it was last seen with `growth`; on a count-up from blank the
 * "to" fades in with the first digits, so it never waits there alone.
 * It says nothing to a screen reader itself: its group says "68 to 78 percent".
 */
export function RangeNum({ low, high, size, growth }: { low: number; high: number; size: 38 | 34 | 30 | 24 | 52; growth?: Growth }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  // Each number rolls from its own last-seen value (the pair, when there is one).
  const roll = (i: 0 | 1) => (growth ? { play: growth.play, from: growth.from.length === 2 ? String(growth.from[i]) : null, run: growth.run } : undefined);
  // The small serif "to": the type the % sign had (tokens.percentSup), in muted ink, like the website's "to".
  const word = (
    <Text maxFontSizeMultiplier={1.3} style={[percentSup(size), { color: c.ink2, marginHorizontal: Math.round(size * 0.15) }]}>
      to
    </Text>
  );
  const countUp = Boolean(growth?.play) && !reduced && growth?.from.length !== 2;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} testID="range-num">
      <BigNum value={String(low)} size={size} roll={roll(0)} />
      {countUp ? (
        <FadeIn key={growth?.run ?? 0} rise={false} dur="quick">
          {word}
        </FadeIn>
      ) : (
        word
      )}
      <BigNum value={String(high)} size={size} roll={roll(1)} />
    </View>
  );
}

/** How the bar is said. */
export function scaleSpoken(range: ReadinessRange, mark = READY_LOW): string {
  return range.enough
    ? `Estimated readiness ${range.low} to ${range.high} percent, ${ESTIMATE_WORDS}. The tick marks this app’s ${mark} percent study bar.`
    : `Not enough data yet. ${RANGE_MIN_ANSWERS - range.needed} of ${RANGE_MIN_ANSWERS} for your first range.`;
}

const H = 52;
const BAR_Y = 22;
const BAR_H = 5;
const LABEL_W = 56;
/** The bracket's "68 to 78" needs more room than one number (it still fits at ×1.3 text). */
const RANGE_LABEL_W = 84;
/** Where the numbers sit under the bar, and the extra line the tick's words take. */
const LABEL_Y = 32;
const MARK_LINE = 16;
/** The tick's words need this much bar (a phone in landscape split view, a narrow plate: the number alone). */
const MARK_MIN_W = 220;
const MARK_W = 80;
/** The bracket: a 2pt line 12pt from the top, its ends down to 16 (drawn as views, so a stroke never scales). */
const BRACKET_Y = 11;
const BRACKET_T = 2;
const BRACKET_TICK = 5;

/** How the estimate moves on this view: from the range last seen, open from its centre, or not at all. */
export type EstimateMotion =
  | { mode: 'still' }
  | { mode: 'open' }
  /** Start offsets (pt) and widths as shares of now, all going to 0 / 1. */
  | { mode: 'since'; dxLow: number; dxHigh: number; band: number; line: number };

/**
 * Where the estimate starts (pure, so tests pin it). `X` maps a percent to the bar. A rise since the
 * last look slides from the range last seen; the day's first view opens in place; a fall, Reduce
 * Motion or nothing new: still.
 */
export function estimateMotion(range: { low: number; high: number }, growth: Growth | undefined, reduced: boolean, X: (p: number) => number): EstimateMotion {
  if (!growth?.play || reduced) return { mode: 'still' };
  const [lo0, hi0] = growth.from;
  if (growth.since && growth.from.length === 2) {
    // Never animate a loss: a start above now (it can't come from useGrowth, which takes the lower) stays still.
    if (lo0 > range.low || hi0 > range.high || (lo0 === range.low && hi0 === range.high)) return { mode: 'still' };
    const w = Math.max(2, X(range.high) - X(range.low));
    const w0 = Math.max(2, X(hi0) - X(lo0));
    return { mode: 'since', dxLow: X(lo0) - X(range.low), dxHigh: X(hi0) - X(range.high), band: w0 / w, line: (w0 + BRACKET_T) / (w + BRACKET_T) };
  }
  return { mode: 'open' };
}

export function ScaleBar({
  range,
  mark = READY_LOW,
  markLabel,
  size = 38,
  growth,
  accessible = true,
  style,
}: {
  range: ReadinessRange;
  /** The study bar's tick (the app's 80). */
  mark?: number;
  /** The tick's words, set under its number ("study bar": Today reads "80 / study bar"). Left out (You), the number alone. */
  markLabel?: string;
  size?: 38 | 34 | 30;
  /** The range rolls, and the bar draws in, on the day's first view or when it changed. */
  growth?: Growth;
  /** false inside a button that already says `scaleSpoken`. */
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const large = useFontScale() >= LARGE_TEXT;
  const [w, setW] = useState(0);
  const x0 = 8;
  const x1 = Math.max(x0 + 10, w - 14);
  const X = (p: number) => x0 + ((x1 - x0) * Math.max(0, Math.min(100, p))) / 100;
  const move = range.enough ? estimateMotion(range, growth, reduced, X) : ({ mode: 'still' } as const);
  // One clock for the estimate (0 → 1) and one for what arrives after it (its ticks and label).
  const p = useSharedValue(move.mode === 'still' ? 1 : 0);
  const q = useSharedValue(move.mode === 'still' ? 1 : 0);
  // What a growth is: its start and end in percents (never in points, so a relayout or a width change
  // never replays it) and its run.
  const sig = move.mode === 'since' ? `since:${growth!.from.join(',')}>${range.enough ? `${range.low},${range.high}` : ''}` : move.mode;
  const started = useRef<string | null>(null);
  // Before paint (UX P5): a growth starts from its start pose in the very frame it is decided, so the
  // bar never shows its end for a frame and then snaps back to slide.
  useLayoutEffect(() => {
    if (move.mode === 'still') {
      started.current = null;
      p.set(1);
      q.set(1);
      return;
    }
    const key = `${sig}|${growth?.run ?? 0}`;
    if (started.current === key) return;
    started.current = key;
    p.set(withSequence(snap(0), move.mode === 'since' ? tween(1, 'grow', ease.out) : tween(1, 'draw', ease.enter)));
    // Its ends and label land with it: the label names where the band ends, never where it passes.
    const landsAt = (move.mode === 'since' ? motion.dur.grow : motion.dur.draw) - motion.dur.quick;
    q.set(withSequence(snap(0), withDelay(landsAt, tween(1, 'quick'))));
  }, [move.mode, sig, growth?.run, p, q]);
  const since = move.mode === 'since' ? move : null;
  const open = move.mode === 'open';
  const from = motion.openFrom;
  const bandStyle = useAnimatedStyle(() => {
    const v = p.value;
    if (since) return { transform: [{ translateX: since.dxLow * (1 - v) }, { scaleX: since.band + (1 - since.band) * v }] };
    if (open) return { opacity: v, transform: [{ scaleX: from + (1 - from) * v }] };
    return { opacity: 1, transform: [{ translateX: 0 }, { scaleX: 1 }] };
  });
  const lineStyle = useAnimatedStyle(() => {
    const v = p.value;
    if (since) return { transform: [{ translateX: since.dxLow * (1 - v) }, { scaleX: since.line + (1 - since.line) * v }] };
    if (open) return { opacity: v, transform: [{ scaleX: from + (1 - from) * v }] };
    return { opacity: 1, transform: [{ translateX: 0 }, { scaleX: 1 }] };
  });
  const lowTickStyle = useAnimatedStyle(() => (since ? { transform: [{ translateX: since.dxLow * (1 - p.value) }] } : { opacity: q.value }));
  const highTickStyle = useAnimatedStyle(() => (since ? { transform: [{ translateX: since.dxHigh * (1 - p.value) }] } : { opacity: q.value }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: q.value }));
  // Native origins are keywords: the slide grows from the band's left end, the opening from its centre.
  const origin = open ? 'center' : 'left';
  const ticks = [0, 50, mark, 100].filter((p, i, all) => all.indexOf(p) === i);
  // The tick's words go on a line of their own under its number, so "80" stays under the tick, on the
  // numbers' one baseline, and never crowds "100" (UX review P2). They take the room a second line needs.
  const named = Boolean(markLabel) && w >= MARK_MIN_W;
  const height = named ? H + MARK_LINE : H;
  const label = (p: number, text: string, top: number, color = c.ink2, width = LABEL_W) => (
    <View key={`${text}-${top}`} style={{ position: 'absolute', left: Math.max(0, Math.min(w - width, X(p) - width / 2)), top, width, alignItems: 'center' }}>
      <FieldText v="small" color={color} maxScale={1.3} numberOfLines={1}>{text}</FieldText>
    </View>
  );

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? scaleSpoken(range, mark) : undefined}
      style={style}
      testID="scale-bar"
    >
      <View style={{ flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center', columnGap: space.md, rowGap: space.xs }}>
        {range.enough ? <RangeNum low={range.low} high={range.high} size={size} growth={growth} /> : <T v="headline">Not enough data yet</T>}
        {range.enough ? (
          <FieldText v="sub" style={{ flexShrink: 1 }}>{ESTIMATE_WORDS}</FieldText>
        ) : (
          <T v="meta" style={{ flexShrink: 1 }}>{`${RANGE_MIN_ANSWERS - range.needed} of ${RANGE_MIN_ANSWERS} for your first range`}</T>
        )}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height, marginTop: space.sm }}
      >
        {w > 0 && (
          <>
            {/* The ruler: the fixed reference, drawn from the first frame (it never moves). */}
            <View testID="scale-ruler" style={{ position: 'absolute', left: 0, top: 0, width: w, height: H }}>
              <Svg width={w} height={H}>
                {Array.from({ length: 10 }, (_, i) => (
                  <Rect key={i} x={X(i * 10)} y={BAR_Y} width={X(10) - x0} height={BAR_H} fill={i % 2 ? c.raised : c.ink2} stroke={c.ink2} strokeWidth={0.8} />
                ))}
                {/* The study bar's tick runs through the bar, so it reads as a mark on the scale (UX review P2). */}
                <Path d={`M${X(mark)} ${BAR_Y - 3}V${BAR_Y + BAR_H + 6}`} stroke={c.ink} strokeWidth={1.4} />
              </Svg>
            </View>
            {range.enough && (
              <>
                {/* The estimate: childless views, so the bracket's 2pt stroke never scales while it moves. */}
                <Animated.View
                  testID="scale-band"
                  style={[{ position: 'absolute', left: X(range.low), top: BAR_Y, width: Math.max(2, X(range.high) - X(range.low)), height: BAR_H, backgroundColor: c.accent, transformOrigin: origin }, bandStyle]}
                />
                <Animated.View
                  testID="scale-bracket"
                  style={[{ position: 'absolute', left: X(range.low) - BRACKET_T / 2, top: BRACKET_Y, width: Math.max(2, X(range.high) - X(range.low)) + BRACKET_T, height: BRACKET_T, backgroundColor: c.accent, transformOrigin: origin }, lineStyle]}
                />
                <Animated.View style={[{ position: 'absolute', left: X(range.low) - BRACKET_T / 2, top: BRACKET_Y, width: BRACKET_T, height: BRACKET_TICK, backgroundColor: c.accent }, lowTickStyle]} />
                <Animated.View style={[{ position: 'absolute', left: X(range.high) - BRACKET_T / 2, top: BRACKET_Y, width: BRACKET_T, height: BRACKET_TICK, backgroundColor: c.accent }, highTickStyle]} />
                {/* The bracket's own label: at large text the range above says it (it would crowd the bar). */}
                {!large && <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: H }, labelStyle]}>{label((range.low + range.high) / 2, rangeWords(range), -4, c.accentText, RANGE_LABEL_W)}</Animated.View>}
              </>
            )}
            {/* One baseline for every number; the tick's words under its own. */}
            {ticks.map((p) => label(p, String(p), LABEL_Y))}
            {named ? label(mark, markLabel!, LABEL_Y + MARK_LINE, c.ink2, MARK_W) : null}
          </>
        )}
      </View>
    </View>
  );
}
