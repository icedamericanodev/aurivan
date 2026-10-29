/**
 * ScaleBar (Field Guide §21.2): readiness as a map's scale bar. Ten
 * alternating segments from 0 to 100, the range as a bracket and a filled
 * band ("64–72"), and a tick at the app's study bar (80, the low end it
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
 * Motion: the bar draws in from the left (`draw`, 400 ms), then the bracket
 * and band settle in (`fill`). Reduce Motion, or nothing new: the finished bar.
 * At 200% text the numeral and its words stack; the bar keeps its labels at ×1.3.
 */
import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { READY_LOW } from '../../engine/examReady';
import { rangeLabel, RANGE_MIN_ANSWERS, type ReadinessRange } from '../../engine/readinessRange';
import { LARGE_TEXT, motion, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { tween, useMotion, type Growth } from '../motion';
import { BigNum, T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

/** The words that travel with every range. */
export const ESTIMATE_WORDS = 'a study estimate, not a prediction';

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
/** Where the numbers sit under the bar, and the extra line the tick's words take. */
const LABEL_Y = 32;
const MARK_LINE = 16;
/** The tick's words need this much bar (a phone in landscape split view, a narrow plate: the number alone). */
const MARK_MIN_W = 220;
const MARK_W = 80;

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
  const play = Boolean(growth?.play) && !reduced;
  const draw = useSharedValue(play ? 0 : 1);
  const settle = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (!play) {
      draw.set(1);
      settle.set(1);
      return;
    }
    draw.set(0);
    settle.set(0);
    draw.set(tween(1, 'draw'));
    settle.set(withDelay(motion.dur.draw, tween(1, 'fill')));
  }, [play, growth?.run, draw, settle]);
  const drawStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: draw.value }] }));
  const settleStyle = useAnimatedStyle(() => ({ opacity: settle.value }));

  const x0 = 8;
  const x1 = Math.max(x0 + 10, w - 14);
  const X = (p: number) => x0 + ((x1 - x0) * Math.max(0, Math.min(100, p))) / 100;
  const roll = growth && range.enough ? { play: growth.play, from: growth.from.length === 2 ? `${growth.from[0]}–${growth.from[1]}` : null, run: growth.run } : undefined;
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
        {range.enough ? <BigNum value={rangeLabel(range)} pct size={size} roll={roll} /> : <T v="headline">Not enough data yet</T>}
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
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: H, transformOrigin: 'left' }, drawStyle]}>
              <Svg width={w} height={H}>
                {Array.from({ length: 10 }, (_, i) => (
                  <Rect key={i} x={X(i * 10)} y={BAR_Y} width={X(10) - x0} height={BAR_H} fill={i % 2 ? c.raised : c.ink2} stroke={c.ink2} strokeWidth={0.8} />
                ))}
                {/* The study bar's tick runs through the bar, so it reads as a mark on the scale (UX review P2). */}
                <Path d={`M${X(mark)} ${BAR_Y - 3}V${BAR_Y + BAR_H + 6}`} stroke={c.ink} strokeWidth={1.4} />
              </Svg>
            </Animated.View>
            {range.enough && (
              <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: H }, settleStyle]}>
                <Svg width={w} height={H}>
                  <Path d={`M${X(range.low)} 16V12H${X(range.high)}V16`} fill="none" stroke={c.accent} strokeWidth={2} />
                  <Rect x={X(range.low)} y={BAR_Y} width={Math.max(2, X(range.high) - X(range.low))} height={BAR_H} fill={c.accent} />
                </Svg>
                {/* The bracket's own label: at large text the range above says it (it would crowd the bar). */}
                {!large && label((range.low + range.high) / 2, `${range.low}–${range.high}`, -4, c.accentText)}
              </Animated.View>
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
