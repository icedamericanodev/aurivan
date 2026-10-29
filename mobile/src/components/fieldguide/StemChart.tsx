/**
 * StemChart and StemList (Field Guide §21.2): the five areas as five stems
 * on ONE scale, so they compare at a glance (no rings, no tiles).
 *
 * - One scale, 0 to 100, with a dashed line at the area line (70) labelled
 *   "70 line". Leaves mark every 9 points up a stem.
 * - A measured stem (30 answers or more) is drawn to its percent, with the
 *   number above it.
 * - Too few yet (1 to 29 answers): a seed in the soil with a dashed outline
 *   of a shoot, a "—" above it and the words "too few yet · 18 answered". It
 *   never claims a height the data hasn't earned (the web draws the same).
 * - Not started: the seed alone and the words "not started".
 * - Below the line: the status word in `clay` AND the words "below 70" (clay
 *   is never the only signal).
 * - Growth (what went up since the learner last looked, or in this set): the
 *   top of the stem in `clay` with "↑3" beside the number (words and shape too).
 *
 * Every column is its own screen-reader stop, left to right ("IS Audit:
 * Strong, 84 percent on latest tries, at or above the 70 line"); the drawing
 * itself is hidden. From ×1.3 text, or when a column would be narrower than
 * its longest name, the chart hands over to StemList: one row per area with
 * a ruler bar (the outline for too few yet), the word and the figure.
 *
 * Motion: stems trace up from the soil (`draw`, 400 ms, 60 ms apart), then
 * the numbers and leaves settle in. Reduce Motion: the finished plate.
 */
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import type { Stem } from '../../engine/fieldGuide';
import { fieldInk, LARGE_TEXT, motion, plate, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { tween, useMotion } from '../motion';
import { BigNum, T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

export type { Stem };

/** "too few yet", "not started", or the word, as written under a stem. */
export const stemWord = (s: Stem) => (s.answered <= 0 ? 'not started' : s.thin ? 'too few yet' : s.word.toLowerCase());
/** The extra lines under a stem's word. */
export function stemLines(s: Stem, line: number): string[] {
  return [s.thin ? `${s.answered} answered` : null, !s.thin && s.pct !== null && s.below ? `below ${line}` : null, s.note ?? null].filter((x): x is string => Boolean(x));
}

const GUTTER = 26;
const TOP = 40;
const PLOT = 150;
/** A column narrower than this hands over to the list (the longest names need it at 11pt). */
export const MIN_COLUMN = 56;

/** Five stems on one scale, or the list at large text. */
export function StemChart({ stems, line = 70, play = false, testID }: { stems: readonly Stem[]; line?: number; play?: boolean; testID?: string }) {
  const large = useFontScale() >= LARGE_TEXT;
  // A first guess before layout (the phone's width less the gutters and a plate's mount), so the first frame is drawn.
  const { width: screen } = useWindowDimensions();
  const [w, setW] = useState(() => Math.max(0, Math.min(screen, 560) - 2 * space.gutter - 2 * (2 + plate.mount + space.md)));
  const gap = stems.length ? (w - GUTTER) / stems.length : 0;
  const list = large || (w > 0 && gap < MIN_COLUMN);
  return (
    <View testID={testID} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {list ? <StemList stems={stems} line={line} /> : w > 0 ? <Chart stems={stems} line={line} play={play} w={w} /> : <View style={{ height: plate.chart }} />}
    </View>
  );
}

function Chart({ stems, line, play, w }: { stems: readonly Stem[]; line: number; play: boolean; w: number }) {
  const { c, isDark } = useTheme();
  const ink = fieldInk[isDark ? 'dark' : 'light'];
  const { reduced } = useMotion();
  const moving = play && !reduced;
  const gap = (w - GUTTER) / stems.length;
  const soil = TOP + PLOT;
  const y = (p: number) => soil - (Math.max(0, Math.min(100, p)) / 100) * PLOT;
  const extras = Math.max(0, ...stems.map((s) => stemLines(s, line).length));
  const h = soil + 10 + 30 + 16 + extras * 14;
  const settle = useSharedValue(moving ? 0 : 1);
  useEffect(() => {
    if (!moving) {
      settle.set(1);
      return;
    }
    settle.set(0);
    settle.set(withDelay(motion.dur.draw + (stems.length - 1) * motion.stagger.stat, tween(1, 'fill')));
  }, [moving, settle, stems.length]);
  const settleStyle = useAnimatedStyle(() => ({ opacity: settle.value }));
  const scaleLabel = (p: number) => (
    <View key={`s${p}`} style={{ position: 'absolute', left: 0, width: GUTTER - 6, top: y(p) - 7, alignItems: 'flex-end' }}>
      <FieldText v="tiny" color={c.ink2}>{String(p)}</FieldText>
    </View>
  );
  return (
    <View style={{ height: h }}>
      {/* The drawing and its words: hidden from screen readers (each column's stop below says it all). */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
        <Svg width={w} height={h} style={{ position: 'absolute' }}>
          <Path d={`M${GUTTER - 2} ${soil}V${y(100)}`} stroke={c.control} strokeWidth={1} />
          {[0, 50, line, 100].map((p) => (
            <Path key={p} d={`M${GUTTER - 6} ${y(p)}h5`} stroke={c.control} strokeWidth={1} />
          ))}
          <Path d={`M${GUTTER} ${y(line)}H${w}`} stroke={c.ink2} strokeWidth={1} strokeDasharray="4 4" />
          <Path d={`M${GUTTER} ${soil}H${w}`} stroke={c.control} strokeWidth={1} />
        </Svg>
        {[0, 50, line, 100].filter((p, i, a) => a.indexOf(p) === i).map(scaleLabel)}
        <View style={{ position: 'absolute', right: 0, top: y(line) + 2, backgroundColor: c.raised2, paddingLeft: 3 }}>
          <FieldText v="tiny" color={c.ink2}>{`${line} line`}</FieldText>
        </View>
        {stems.map((s, i) => (
          <StemColumn key={s.key} s={s} i={i} left={GUTTER + gap * i} gap={gap} soil={soil} y={y} moving={moving} ink={ink} />
        ))}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h }, settleStyle]} pointerEvents="none">
          {stems.map((s, i) => {
            const cx = GUTTER + gap * i + gap / 2;
            const top = s.pct !== null ? y(s.pct) - 34 : s.thin ? soil - 54 : null;
            return top === null ? null : (
              <View key={s.key} style={{ position: 'absolute', left: cx - 40, width: 80, top, alignItems: 'center' }}>
                {s.pct !== null ? (
                  // A paper halo (the plate's own surface) under the number, so the dashed line never strikes through it.
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.raised2, paddingHorizontal: 3, borderRadius: 3 }}>
                    <BigNum value={String(s.pct)} pct size={20} />
                    {s.up ? <T v="caption" color={c.clay} style={{ marginLeft: 2, marginTop: 6 }}>{`↑${Math.round(s.up)}`}</T> : null}
                  </View>
                ) : (
                  <View style={{ backgroundColor: c.raised2, paddingHorizontal: 3 }}>
                    <FieldText v="chart" color={c.ink2}>—</FieldText>
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
        {stems.map((s, i) => {
          const lines = stemLines(s, line);
          const red = !s.thin && s.pct !== null && s.below;
          return (
            <View key={s.key} style={{ position: 'absolute', left: GUTTER + gap * i - 4, width: gap + 8, top: soil + 8, alignItems: 'center' }}>
              <FieldText v="tiny" color={c.ink} center numberOfLines={2}>{s.name.replace(' ', '\n')}</FieldText>
              <FieldText v="figSm" color={red ? c.clay : c.ink2} center>{stemWord(s)}</FieldText>
              {lines.map((l) => (
                <FieldText key={l} v="tiny" color={red && l.startsWith('below') ? c.clay : c.ink2} center>{l}</FieldText>
              ))}
            </View>
          );
        })}
      </View>
      {/* One stop per area, left to right. */}
      <View style={{ position: 'absolute', left: GUTTER, top: 0, height: h, flexDirection: 'row' }}>
        {stems.map((s) => (
          <View key={s.key} accessible accessibilityLabel={s.spoken} testID={`area-column-${s.key}`} style={{ width: gap, height: h }} />
        ))}
      </View>
    </View>
  );
}

function StemColumn({
  s,
  i,
  left,
  gap,
  soil,
  y,
  moving,
  ink,
}: {
  s: Stem;
  i: number;
  left: number;
  gap: number;
  soil: number;
  y: (p: number) => number;
  moving: boolean;
  ink: (typeof fieldInk)['light'];
}) {
  const { c } = useTheme();
  const grow = useSharedValue(moving ? 0 : 1);
  useEffect(() => {
    if (!moving) {
      grow.set(1);
      return;
    }
    grow.set(0);
    grow.set(withDelay(i * motion.stagger.stat, tween(1, 'draw')));
  }, [moving, grow, i]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  const x = gap / 2;
  const h = soil + 4;
  let art: React.ReactNode;
  const seed = <Ellipse cx={x} cy={soil - 4} rx={7} ry={4.5} fill={ink.seed} stroke={ink.stem} strokeWidth={1} />;
  if (s.answered <= 0) {
    art = seed;
  } else if (s.thin || s.pct === null) {
    // Too few yet: a seed with a dashed ghost of a shoot, never its true height (no number it hasn't earned).
    art = (
      <G>
        {seed}
        <Path d={`M${x} ${soil - 9}v-18`} stroke={c.control} strokeWidth={1.2} strokeDasharray="2 3" />
      </G>
    );
  } else {
    const up = Math.max(0, Math.min(s.pct, s.up ?? 0));
    const base = s.pct - up;
    const leaves: React.ReactNode[] = [];
    for (let k = 1; k * 9 < base; k++) {
      const side = k % 2 ? -1 : 1;
      leaves.push(
        <G key={k} transform={`translate(${x} ${y(k * 9)}) rotate(${side * 58})`}>
          <Ellipse cx={0} cy={-6} rx={3.2} ry={6.4} fill={ink.leaf} stroke={c.accent} strokeWidth={0.9} />
        </G>,
      );
    }
    art = (
      <G>
        <Path d={`M${x} ${soil}V${y(base)}`} stroke={ink.stem} strokeWidth={2} strokeLinecap="round" />
        {leaves}
        {up > 0 && <Path d={`M${x} ${y(base)}V${y(s.pct)}`} stroke={c.clay} strokeWidth={2.6} strokeLinecap="round" />}
        <Ellipse cx={x} cy={y(s.pct) - 5} rx={3} ry={5.6} fill={ink.leaf} stroke={s.below || up > 0 ? c.clay : c.accent} strokeWidth={0.9} />
      </G>
    );
  }
  return (
    <Animated.View style={[{ position: 'absolute', left, top: 0, width: gap, height: h, transformOrigin: 'bottom' }, anim]}>
      <Svg width={gap} height={h}>
        {art}
      </Svg>
    </Animated.View>
  );
}

/** The list (large text, narrow screens): one row per area, a ruler bar with the line, the word and the figure. */
export function StemList({ stems, line = 70 }: { stems: readonly Stem[]; line?: number }) {
  const { c } = useTheme();
  return (
    <View testID="stem-list">
      {stems.map((s, i) => {
        const red = !s.thin && s.pct !== null && s.below;
        const extra = stemLines(s, line);
        return (
          <View
            key={s.key}
            accessible
            accessibilityLabel={s.spoken}
            style={{ minHeight: 48, paddingVertical: space.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line, gap: space.xs }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: space.md }}>
              <T v="label" style={{ flexShrink: 1 }}>{s.name}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                {s.pct !== null ? <BigNum value={String(s.pct)} pct size={17} /> : <T v="meta">–</T>}
                {s.up ? <T v="caption" color={c.clay}>{`↑${Math.round(s.up)}`}</T> : null}
              </View>
            </View>
            {/* The ruler: a filled bar for a measured area, an outline for too few yet, the track alone before any answer. */}
            <View
              style={{
                height: 8,
                borderRadius: 2,
                backgroundColor: s.thin ? 'transparent' : c.track,
                borderWidth: s.thin ? 1 : 0,
                borderStyle: 'dashed',
                borderColor: c.control,
                marginVertical: 4,
              }}
            >
              {s.pct !== null && <View style={{ width: `${Math.max(2, s.pct)}%`, height: 8, borderRadius: 2, backgroundColor: c.accent }} />}
              <View style={{ position: 'absolute', left: `${line}%`, top: -4, width: 4, height: 16, marginLeft: -2, backgroundColor: c.bg, alignItems: 'center' }}>
                <View style={{ width: 2, height: 16, backgroundColor: c.ink2 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm }}>
              <FieldText v="fig" color={red ? c.clay : c.ink2}>{stemWord(s)}</FieldText>
              {extra.map((l) => (
                <FieldText key={l} v="small" color={red && l.startsWith('below') ? c.clay : c.ink2}>{`· ${l}`}</FieldText>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
