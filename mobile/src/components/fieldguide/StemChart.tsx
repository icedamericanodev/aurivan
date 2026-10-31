/**
 * StemChart and StemList (Field Guide §21.2): the five areas as five stems
 * on ONE scale, so they compare at a glance (no rings, no tiles).
 *
 * - One scale, 0 to 100, with a dashed line at the area line (70) labelled
 *   "70 line". Leaves mark every 9 points up a stem.
 * - A measured stem (30 answers or more) is drawn to its percent, with the
 *   number above it.
 * - Too few yet (1 to 29 answers): a seed in the soil with a dashed outline
 *   of a shoot, the word "seed" above it (no number, and no dash: Grove) and the
 *   words "too few yet · 18 answered". It
 *   never claims a height the data hasn't earned (the web draws the same).
 * - Not started: the seed alone and the words "not started".
 * - Below the line: the status word in `clay` AND the words "below 70" (clay
 *   is never the only signal).
 * - Growth (what went up since the learner last looked, or in this set): the
 *   top of the stem in `clay` with "↑3" beside the number (words and shape too).
 *   A drop in a set is said as plainly, in calm ink: "↓2" (`ink2`, never the
 *   answer-feedback red), spoken "2 points lower".
 *
 * Every column is its own screen-reader stop, left to right ("IS Audit:
 * Strong, 84 percent on latest tries, at or above the 70 line"); the drawing
 * itself is hidden. From ×1.3 text, or when a column would be narrower than
 * its longest name, the chart hands over to StemList: one row per area with
 * a ruler bar (the outline for too few yet), the word and the figure.
 *
 * Motion:
 * - `trace` (the day's first view): stems trace up from the soil (`draw`,
 *   400 ms, 60 ms apart), then the numbers settle in.
 * - `growth` (premium round 2, #2: Results' set, or what rose since the last
 *   look on You): only what grew moves. Each stem stands at where it started;
 *   its clay top grows up out of it (`grow`, 600 ms, ease-out, 60 ms apart,
 *   once the plate's own entrance is done: `delay`),
 *   the bud and the number ride the tip while the number rolls up from the
 *   start, and "↑3" fades in as the tip lands. A stem that didn't move, or
 *   fell, is simply there (a loss never animates).
 * Reduce Motion: the finished plate.
 */
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import type { Stem } from '../../engine/fieldGuide';
import { grovePlate } from '../../theme/grove';
import { fieldInk, LARGE_TEXT, motion, plate, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ease, tween, useMotion } from '../motion';
import { BigNum, T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

export type { Stem };

/** "too few yet", "not started", or the word, as written under a stem. */
export const stemWord = (s: Stem) => (s.answered <= 0 ? 'not started' : s.thin ? 'too few yet' : s.word.toLowerCase());
/** The chart's form: the two-word states on two lines, like the names, so five "not started" never run into one line. */
const chartWord = (s: Stem) => (s.answered <= 0 ? 'not\nstarted' : s.thin ? 'too few\nyet' : stemWord(s));
/** The extra lines under a stem's word. */
export function stemLines(s: Stem, line: number): string[] {
  return [s.thin ? `${s.answered} answered` : null, !s.thin && s.pct !== null && s.below ? `below ${line}` : null, s.note ?? null].filter((x): x is string => Boolean(x));
}

const GUTTER = 24;
const TOP = 40;
const PLOT = 150;

/**
 * Where the "70 line" words go (UX follow-up to H1, mobile 1.51). By default under the dashed line at its
 * right end, one line, on a paper halo. But when the LAST column's top (its top leaf reaches ~11pt above it)
 * sits in or just under that band, the halo would hide the top of that stem, and just above the line is
 * taken by the same stem's own number. Then the words go beside the line's end, on two lines ("70" /
 * "line"), in the clear strip right of that stem (right-aligned, no halo so no leaf tip is hidden), pushed
 * down below the number when a low top brings it under the line. Pure, so it is tested on its own.
 */
export function lineLabelSpot({ lastPct, line, gap, fs }: { /** The last column's measured percent, or null. */ lastPct: number | null; line: number; gap: number; fs: number }): {
  beside: boolean;
  top: number;
  /** The box's width from the plot's right edge (beside only). */
  width?: number;
} {
  const y = (p: number) => TOP + PLOT - (Math.max(0, Math.min(100, p)) / 100) * PLOT;
  const below = y(line) + 2;
  const band = Math.ceil(14 * fs);
  if (lastPct === null) return { beside: false, top: below };
  const top = y(lastPct);
  const near = top >= y(line) - 2 && top - 11 <= below + band;
  if (!near) return { beside: false, top: below };
  // The number above a stem ends about 12pt over its top: the words start under it.
  return { beside: true, top: Math.max(below, top - 10), width: Math.max(0, gap / 2 - 8) };
}
/** A column narrower than this hands over to the list (the longest names need it at 11pt). */
export const MIN_COLUMN = 58;

/** Five stems on one scale, or the list at large text. */
/** How a chart arrives: `true` / `'trace'` from the soil, `'growth'` only what grew, `false` still. */
export type StemPlay = boolean | 'trace' | 'growth';

/** The stems that grow in `growth` mode (a measured stem with a rise), in drawing order. */
export function growingStems(stems: readonly Stem[]): string[] {
  return stems.filter((s) => !s.thin && s.pct !== null && (s.up ?? 0) > 0).map((s) => s.key);
}

/** Where a growing stem's top starts: the height it grew from, in points below its tip (pure, for tests). */
export function growthDrop(s: Stem, y: (p: number) => number): number {
  if (s.thin || s.pct === null) return 0;
  const up = Math.max(0, Math.min(s.pct, s.up ?? 0));
  return y(s.pct - up) - y(s.pct);
}

/**
 * The chart's width before its first layout: the window (capped at 560) less the gutters and a
 * tight plate's edge and padding (Grove Phase 1: one 1pt edge and 4pt across, was the double mount).
 */
export const chartFirstWidth = (screen: number) => Math.max(0, Math.min(screen, 560) - 2 * space.gutter - 2 * (grovePlate.edge + grovePlate.padTight));

export function StemChart({
  stems,
  line = 70,
  play = false,
  run = 1,
  delay = 0,
  testID,
}: {
  stems: readonly Stem[];
  line?: number;
  play?: StemPlay;
  /** Restart key for a growth (You: each new rise). */
  run?: number;
  /** A growth waits this long (ms) for the plate's own entrance (Results' group, You's tab fade), so it is seen. */
  delay?: number;
  testID?: string;
}) {
  const scale = useFontScale();
  const large = scale >= LARGE_TEXT;
  // The chart's own words grow with the text size up to ×1.3 (then the list takes over): its columns and height
  // grow (or shrink) with them, so a name never truncates between ×1.15 and ×1.29 (UX review H2).
  const fs = Math.min(scale, LARGE_TEXT);
  // A first guess before layout (the phone's width less the gutters and a tight plate's edge and padding), so the first frame is drawn.
  const { width: screen } = useWindowDimensions();
  const [w, setW] = useState(() => chartFirstWidth(screen));
  const gap = stems.length ? (w - GUTTER) / stems.length : 0;
  const list = large || (w > 0 && gap < MIN_COLUMN * fs);
  return (
    <View testID={testID} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {list ? <StemList stems={stems} line={line} /> : w > 0 ? <Chart stems={stems} line={line} play={play} run={run} delay={delay} w={w} fs={fs} /> : <View style={{ height: plate.chart }} />}
    </View>
  );
}

function Chart({ stems, line, play, run, delay, w, fs }: { stems: readonly Stem[]; line: number; play: StemPlay; run: number; delay: number; w: number; /** The text size, up to ×1.3. */ fs: number }) {
  const { c, isDark } = useTheme();
  const ink = fieldInk[isDark ? 'dark' : 'light'];
  const { reduced } = useMotion();
  // trace: every stem from the soil; growth: only the stems that grew, from where they stood.
  const moving = (play === true || play === 'trace') && !reduced;
  const growing = play === 'growth' && !reduced ? growingStems(stems) : [];
  const gap = (w - GUTTER) / stems.length;
  const soil = TOP + PLOT;
  const y = (p: number) => soil - (Math.max(0, Math.min(100, p)) / 100) * PLOT;
  const extras = Math.max(0, ...stems.map((s) => stemLines(s, line).length));
  const last = stems[stems.length - 1];
  const spot = lineLabelSpot({ lastPct: last && !last.thin ? last.pct : null, line, gap, fs });
  // The words under the soil: a two-line name, the word (two lines for not started and too few yet) and its
  // extra lines, grown with the text size.
  const twoLineWord = stems.some((s) => s.answered <= 0 || s.thin) ? 16 : 0;
  const h = soil + 10 + Math.ceil((30 + 16 + twoLineWord + extras * 14) * fs);
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
        {stems.map((s, i) => (
          <StemColumn key={s.key} s={s} i={i} left={GUTTER + gap * i} gap={gap} soil={soil} y={y} moving={moving} order={growing.indexOf(s.key)} run={run} delay={delay} ink={ink} />
        ))}
        {/* After the stems, so the last column's stem never paints over it (UX review H1); beside the line's
            end instead when the last stem's top would sit under it (lineLabelSpot). */}
        {spot.beside ? (
          <View testID="line-label" style={{ position: 'absolute', right: 0, top: spot.top, width: spot.width, alignItems: 'flex-end' }}>
            <FieldText v="tiny" color={c.ink2} style={{ textAlign: 'right' }}>{`${line}\nline`}</FieldText>
          </View>
        ) : (
          <View testID="line-label" style={{ position: 'absolute', right: 0, top: spot.top, backgroundColor: c.raised2, paddingLeft: 3 }}>
            <FieldText v="tiny" color={c.ink2}>{`${line} line`}</FieldText>
          </View>
        )}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h }, settleStyle]} pointerEvents="none">
          {stems.map((s, i) => {
            const cx = GUTTER + gap * i + gap / 2;
            const top = s.pct !== null ? y(s.pct) - 34 : s.thin ? soil - 54 : null;
            // A growing stem's number rides its tip (GrowNumber, below).
            if (growing.includes(s.key)) return null;
            return top === null ? null : (
              <View key={s.key} style={{ position: 'absolute', left: cx - 40, width: 80, top, alignItems: 'center' }}>
                {s.pct !== null ? (
                  // A paper halo (the plate's own surface) under the number, so the dashed line never strikes through it.
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.raised2, paddingHorizontal: 3, borderRadius: 3 }}>
                    <BigNum value={String(s.pct)} pct size={20} />
                    {s.up ? <T v="caption" color={c.clay} style={{ marginLeft: 2, marginTop: 6 }}>{`↑${Math.round(s.up)}`}</T> : null}
                    {s.down ? <T v="caption" color={c.ink2} style={{ marginLeft: 2, marginTop: 6 }}>{`↓${Math.round(s.down)}`}</T> : null}
                  </View>
                ) : (
                  // Too few yet: a word where the number will grow (Grove has no dashes), naming the seed drawn below.
                  <View style={{ backgroundColor: c.raised2, paddingHorizontal: 3 }}>
                    <FieldText v="chart" color={c.ink2}>seed</FieldText>
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
        {stems.map((s, i) =>
          growing.includes(s.key) && s.pct !== null ? (
            <GrowNumber key={`n${s.key}`} s={s} cx={GUTTER + gap * i + gap / 2} top={y(s.pct) - 34} drop={growthDrop(s, y)} order={growing.indexOf(s.key)} run={run} delay={delay} />
          ) : null,
        )}
        {stems.map((s, i) => {
          const lines = stemLines(s, line);
          const red = !s.thin && s.pct !== null && s.below;
          return (
            <View key={s.key} style={{ position: 'absolute', left: GUTTER + gap * i - 4, width: gap + 8, top: soil + 8, alignItems: 'center' }}>
              <FieldText v="tiny" color={c.ink} center numberOfLines={2}>{s.name.replace(' ', '\n')}</FieldText>
              <FieldText v="figSm" color={red ? c.clay : c.ink2} center>{chartWord(s)}</FieldText>
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
  order,
  run,
  delay,
  ink,
}: {
  s: Stem;
  i: number;
  left: number;
  gap: number;
  soil: number;
  y: (p: number) => number;
  moving: boolean;
  /** Its place among the stems that grow (growth mode), or -1: still. */
  order: number;
  run: number;
  delay: number;
  ink: (typeof fieldInk)['light'];
}) {
  const { c } = useTheme();
  const tip = useGrowClock(order >= 0, order, run, delay);
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
    const top = (
      <>
        {up > 0 && <Path d={`M${x} ${y(base)}V${y(s.pct)}`} stroke={c.clay} strokeWidth={2.6} strokeLinecap="round" />}
        <Ellipse cx={x} cy={y(s.pct) - 5} rx={3} ry={5.6} fill={ink.leaf} stroke={s.below || up > 0 ? c.clay : c.accent} strokeWidth={0.9} />
      </>
    );
    const stem = (
      <>
        <Path d={`M${x} ${soil}V${y(base)}`} stroke={ink.stem} strokeWidth={2} strokeLinecap="round" />
        {leaves}
      </>
    );
    if (order >= 0 && up > 0) {
      // Growth: the stem stands where it started; its clay top and bud rise out of it, clipped at the old tip,
      // so the top is never seen below it (transform only, no opacity on the clipped group).
      const drop = y(base) - y(s.pct);
      return (
        <View style={{ position: 'absolute', left, top: 0, width: gap, height: h }} testID={`area-growth-${s.key}`}>
          <Svg width={gap} height={h} style={{ position: 'absolute' }}>
            {stem}
          </Svg>
          <View style={{ position: 'absolute', left: 0, top: 0, width: gap, height: y(base), overflow: 'hidden' }}>
            <GrowTop drop={drop} tip={tip}>
              <Svg width={gap} height={y(base)}>
                {top}
              </Svg>
            </GrowTop>
          </View>
        </View>
      );
    }
    art = (
      <G>
        {stem}
        {top}
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

/**
 * One growing stem's clock, 0 → 1 over `grow` (ease-out, the odometer's own duration and curve, so the tip
 * and the rolling number land together), `stagger.stat` apart in drawing order. Still (1) when not growing.
 */
function useGrowClock(active: boolean, order: number, run: number, delay: number) {
  const p = useSharedValue(active ? 0 : 1);
  useEffect(() => {
    if (!active) {
      p.set(1);
      return;
    }
    p.set(0);
    p.set(withDelay(delay + order * motion.stagger.stat, tween(1, 'grow', ease.out)));
  }, [active, order, run, delay, p]);
  return p;
}

/** The rising top of a growing stem: drawn at its place, it starts `drop` points lower and rises into it. */
function GrowTop({ drop, tip, children }: { drop: number; tip: ReturnType<typeof useSharedValue<number>>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: drop * (1 - tip.value) }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A growing stem's number: rides the tip, rolls up from where the set began, and "↑3" arrives as the tip lands. */
function GrowNumber({ s, cx, top, drop, order, run, delay }: { s: Stem; cx: number; top: number; drop: number; order: number; run: number; delay: number }) {
  const { c } = useTheme();
  const tip = useGrowClock(true, order, run, delay);
  const arrow = useSharedValue(0);
  useEffect(() => {
    arrow.set(0);
    arrow.set(withDelay(delay + order * motion.stagger.stat + motion.dur.grow, tween(1, 'quick')));
  }, [order, run, delay, arrow]);
  const rideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop * (1 - tip.value) }] }));
  const arrowStyle = useAnimatedStyle(() => ({ opacity: arrow.value }));
  const pct = s.pct ?? 0;
  const up = Math.round(Math.max(0, Math.min(pct, s.up ?? 0)));
  return (
    <Animated.View testID={`area-number-${s.key}`} style={[{ position: 'absolute', left: cx - 40, width: 80, top, alignItems: 'center' }, rideStyle]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.raised2, paddingHorizontal: 3, borderRadius: 3 }}>
        <BigNum value={String(pct)} pct size={20} roll={{ play: true, from: String(pct - up), run, delay: delay + order * motion.stagger.stat }} />
        <Animated.View style={arrowStyle}>
          <T v="caption" color={c.clay} style={{ marginLeft: 2, marginTop: 6 }}>{`↑${up}`}</T>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/**
 * The list's figure and words, as the website's list writes them (fgStemChart): before 30 answers the
 * figure is words ("Not started", "Too few yet"), never a dash, and the line under it says "not measured
 * yet" (or nothing before any answer), so the state is never said twice in one row.
 */
export const listFigure = (s: Stem) => (s.answered <= 0 ? 'Not started' : 'Too few yet');
export const listWord = (s: Stem) => (s.answered <= 0 ? null : s.thin ? 'not measured yet' : stemWord(s));

/** The list (large text, narrow screens): one row per area, a ruler bar with the line, the word and the figure. */
export function StemList({ stems, line = 70 }: { stems: readonly Stem[]; line?: number }) {
  const { c } = useTheme();
  return (
    <View testID="stem-list">
      {stems.map((s, i) => {
        const red = !s.thin && s.pct !== null && s.below;
        const extra = stemLines(s, line);
        const word = listWord(s);
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
                {s.pct !== null ? <BigNum value={String(s.pct)} pct size={17} /> : <T v="meta">{listFigure(s)}</T>}
                {s.up ? <T v="caption" color={c.clay}>{`↑${Math.round(s.up)}`}</T> : null}
                {s.down ? <T v="caption" color={c.ink2}>{`↓${Math.round(s.down)}`}</T> : null}
              </View>
            </View>
            {/* The ruler: a filled bar for a measured area, an outline for too few yet, the track alone before any answer. */}
            <View
              style={{
                height: 8,
                borderRadius: 2,
                backgroundColor: s.thin ? 'transparent' : c.track,
                ...(s.thin ? { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: c.control } : null),
                marginVertical: 4,
              }}
            >
              {s.pct !== null && <View style={{ width: `${Math.max(2, s.pct)}%`, height: 8, borderRadius: 2, backgroundColor: c.accent }} />}
              <View style={{ position: 'absolute', left: `${line}%`, top: -4, width: 4, height: 16, marginLeft: -2, backgroundColor: c.raised2, alignItems: 'center' }}>
                <View style={{ width: 2, height: 16, backgroundColor: c.ink2 }} />
              </View>
            </View>
            {word || extra.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space.sm }}>
                {word ? <FieldText v="fig" color={red ? c.clay : c.ink2}>{word}</FieldText> : null}
                {extra.map((l, k) => (
                  // The first line under a figure with no word has no leading dot (nothing before it to join).
                  <FieldText key={l} v="small" color={red && l.startsWith('below') ? c.clay : c.ink2}>{word || k > 0 ? `· ${l}` : l}</FieldText>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
