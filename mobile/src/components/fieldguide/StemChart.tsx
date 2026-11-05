/**
 * StemChart and StemList (Field Guide §21.2): the five areas as five stems
 * on ONE scale, so they compare at a glance (no rings, no tiles).
 *
 * - One scale, 0 to 100, with a dashed line at the area line (70) labelled
 *   "70 line". Leaves mark every 9 points up a stem.
 * - A measured stem (30 answers or more) is drawn to its percent, with the
 *   number above it.
 * - Too few yet (1 to 29 answers): a seed in the soil with a dashed outline
 *   of a shoot, the words "too few yet" above it (no number, and no dash; "seed"
 *   names the plant only: Grove panel Q2) and "18 of 30" over "answers" under the soil,
 *   as the list rows say it, so "too few yet" is said once. It
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
 * itself is hidden. From ×1.3 text, or when a column is under MIN_COLUMN or its words would still
 * meet after the stagger (stemLabelLayout), the chart hands over to StemList: one row per area with
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
import { THIN_WORDS, thinFigure, type Stem } from '../../engine/fieldGuide';
import { chartLabel, chartName, grovePlate } from '../../theme/grove';
import { fieldInk, fieldType, LARGE_TEXT, motion, plate, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ease, tween, useMotion } from '../motion';
import { BigNum, T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

export type { Stem };

/** "too few yet", "not started", or the word, as written under a stem. */
export const stemWord = (s: Stem) => (s.answered <= 0 ? 'not started' : s.thin ? 'too few yet' : s.word.toLowerCase());
/**
 * The chart's form: "not started" on two lines, like the names, so five never run into one line. A thin
 * area reads like the list rows, "22 of 30" over "answers" (chartLines), so "too few yet" is said once,
 * over its seed.
 */
const chartWord = (s: Stem) => (s.answered <= 0 ? 'not\nstarted' : s.thin ? thinFigure(s.answered) : stemWord(s));
/** The lines under a chart column's word: a thin column's count is its word, so "answers" takes its line. */
const chartLines = (s: Stem, line: number) => stemLines(s, line).map((l) => (s.thin && l === `${s.answered} answered` ? 'answers' : l));
/** The extra lines under a stem's word. */
export function stemLines(s: Stem, line: number): string[] {
  return [s.thin ? `${s.answered} answered` : null, !s.thin && s.pct !== null && s.below ? `below ${line}` : null, s.note ?? null].filter((x): x is string => Boolean(x));
}

/**
 * The left strip that holds the scale's numbers. Type pass: the numbers are the 13pt chart label
 * now (was 11), so the strip is wide enough for "100" at that size, and grows with the text up to
 * x1.3 (where the list takes over): 32pt at 1x.
 */
export const gutterFor = (fs: number) => 12 + Math.ceil(20 * fs);

/**
 * Results (a stem with the set's note, "2 of 3 this set"): the number over the stem is the area's score
 * OVERALL, not the set's, so a column wide enough says "88% overall" (a one-area set, or two or three
 * areas on a wide phone). Narrower columns leave the word to the plate's title ("Your areas after this
 * set"), as the website's chart does, so neighbours never meet. `gap`: the column's width.
 */
export const OVERALL_COLUMN = 120;
export const saysOverall = (s: Stem, gap: number, fs: number) => Boolean(s.note) && s.pct !== null && gap >= OVERALL_COLUMN * fs;
/** The number's box over a stem: 80 wide, or the column less 4 (at most 160) when it says "overall". */
const numberBox = (overall: boolean, gap: number) => (overall ? Math.min(gap - 4, 160) : 80);
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
  // The words' line height (the chart label's 17, grown with the text).
  const band = Math.ceil(chartLabel.lineHeight * fs);
  if (lastPct === null) return { beside: false, top: below };
  const top = y(lastPct);
  const near = top >= y(line) - 2 && top - 11 <= below + band;
  if (!near) return { beside: false, top: below };
  // The number above a stem ends about 12pt over its top: the words start under it.
  // Never narrower than "line" at the chart label's size, so the word is never broken.
  return { beside: true, top: Math.max(below, top - 10), width: Math.max(0, gap / 2 - 8, Math.ceil(22 * fs)) };
}
/**
 * A column narrower than this hands over to the list (the web's floor too). The labels under the soil
 * no longer have to fit one column: they take two columns less 8 and every other area's labels drop
 * below their neighbours' (stemLabelLayout), so "Governance" at 13pt (about 72pt) fits here.
 */
export const MIN_COLUMN = 58;

/**
 * Width guesses for one line of the chart's words, in points a character at x1 (measured from the
 * shipped fonts, rounded up so a guess is never short): Figtree 500 or 600 at 13pt is 7.3 (as the
 * web's est() for 13px), the figSm italic at 12pt is 6.2.
 */
const CHAR_LABEL = 7.3;
const CHAR_FIG = 6.2;
/** The least space between two neighbours' words (the web's 8px rule). */
const LABEL_SPACE = 8;

/** One line of words under the soil: its text, its kind (sets the type), its centre and top, its guessed width. */
export type StemLabelLine = { t: string; kind: 'name' | 'word' | 'line'; x: number; y: number; w: number; lh: number };

/**
 * Where every word under the soil goes (pure, so it is tested on its own). It follows the web's
 * method (index.html fgStemSvg, `clash` / `dy`):
 * - Each area's block is its name, its word, then its extra lines, centred on its column. A name or
 *   a line wraps at spaces only when it is wider than two columns less 8 (less at the chart's two
 *   ends, so a line never leaves the chart).
 * - When two neighbours' lines would sit on the same row closer than 8pt, every odd area's block drops
 *   one small space below the deepest line beside it. Names on the same row are then two columns
 *   apart, so they never meet or read across as one phrase.
 * - If the words still meet (a very narrow chart), it gives `null`: the list takes over.
 * `x` is from the chart's left edge; `y` from the top of the words (8pt under the soil).
 */
export function stemLabelLayout({ stems, line, gap, gutter, w, fs }: { stems: readonly Stem[]; line: number; gap: number; gutter: number; w: number; fs: number }): {
  columns: StemLabelLine[][];
  /** The words' total height, deepest block included. */
  height: number;
  staggered: boolean;
} | null {
  const nameH = chartName.lineHeight * fs;
  const labelH = chartLabel.lineHeight * fs;
  const figH = (fieldType.figSm.lineHeight ?? 16) * fs;
  const est = (t: string, per: number) => t.length * per * fs;
  const blocks = stems.map((s, i) => {
    const centre = gutter + gap * i + gap / 2;
    // The widest a line may be: two columns less 8, and never past either end of the chart.
    const room = Math.min(2 * gap - LABEL_SPACE, 2 * centre, 2 * (w - centre));
    const place = (t: string, kind: StemLabelLine['kind'], y: number, lh: number): StemLabelLine => {
      const lw = est(t, kind === 'word' ? CHAR_FIG : CHAR_LABEL);
      // A line wider than its room (one long word at an end) moves in just enough to stay inside the chart.
      const x = Math.max(lw / 2, Math.min(w - lw / 2, centre));
      return { t, kind, x, y, w: lw, lh };
    };
    // A name or a line on one line when it fits its room, else wrapped at spaces (never mid-word).
    const wrap = (text: string) => {
      const rows: string[] = [];
      for (const word of text.split(' ')) {
        const last = rows[rows.length - 1];
        if (last !== undefined && est(`${last} ${word}`, CHAR_LABEL) <= room) rows[rows.length - 1] = `${last} ${word}`;
        else rows.push(word);
      }
      return rows;
    };
    const out: StemLabelLine[] = [];
    let y = 0;
    for (const t of wrap(s.name)) {
      out.push(place(t, 'name', y, nameH));
      y += nameH;
    }
    for (const t of chartWord(s).split('\n')) {
      out.push(place(t, 'word', y, figH));
      y += figH;
    }
    for (const t of chartLines(s, line).flatMap(wrap)) {
      out.push(place(t, 'line', y, labelH));
      y += labelH;
    }
    return { lines: out, bottom: y };
  });
  // Two lines meet when they share a row (their boxes overlap by more than the 4pt of air a line box
  // keeps above and below its letters) and come closer than 8pt across.
  const meet = (a: StemLabelLine, b: StemLabelLine, dy: number) =>
    Math.min(a.y + dy + a.lh, b.y + b.lh) - Math.max(a.y + dy, b.y) > 4 * fs && Math.abs(a.x - b.x) - a.w / 2 - b.w / 2 < LABEL_SPACE;
  const clash = (i: number, j: number, di: number, dj: number) => blocks[i].lines.some((a) => blocks[j].lines.some((b) => meet(a, b, di - dj)));
  const staggered = blocks.some((_, i) => i > 0 && clash(i - 1, i, 0, 0));
  // Each odd block's drop: one small space under the deepest line of the blocks beside it.
  const drop = blocks.map((_, i) => (staggered && i % 2 === 1 ? Math.max(blocks[i - 1].bottom, blocks[i + 1]?.bottom ?? 0) + 4 * fs : 0));
  // Any two blocks that still meet (after the drop) hand the chart over to the list.
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) if (clash(i, j, drop[i], drop[j])) return null;
  return {
    columns: blocks.map((b, i) => b.lines.map((l) => ({ ...l, y: l.y + drop[i] }))),
    height: Math.max(0, ...blocks.map((b, i) => b.bottom + drop[i])),
    staggered,
  };
}

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
  const gap = stems.length ? (w - gutterFor(fs)) / stems.length : 0;
  // The words under the soil: placed once here, so a chart whose words would still meet shows the list.
  const labels = w > 0 && gap >= MIN_COLUMN * fs ? stemLabelLayout({ stems, line, gap, gutter: gutterFor(fs), w, fs }) : null;
  const list = large || (w > 0 && !labels);
  return (
    <View testID={testID} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {list ? <StemList stems={stems} line={line} /> : w > 0 && labels ? <Chart stems={stems} line={line} play={play} run={run} delay={delay} w={w} fs={fs} labels={labels} /> : <View style={{ height: plate.chart }} />}
    </View>
  );
}

function Chart({
  stems,
  line,
  play,
  run,
  delay,
  w,
  fs,
  labels,
}: {
  stems: readonly Stem[];
  line: number;
  play: StemPlay;
  run: number;
  delay: number;
  w: number;
  /** The text size, up to ×1.3. */
  fs: number;
  /** Where the words under the soil go (stemLabelLayout). */
  labels: NonNullable<ReturnType<typeof stemLabelLayout>>;
}) {
  const { c, isDark } = useTheme();
  const ink = fieldInk[isDark ? 'dark' : 'light'];
  const { reduced } = useMotion();
  // trace: every stem from the soil; growth: only the stems that grew, from where they stood.
  const moving = (play === true || play === 'trace') && !reduced;
  const growing = play === 'growth' && !reduced ? growingStems(stems) : [];
  const GUTTER = gutterFor(fs);
  const gap = (w - GUTTER) / stems.length;
  const soil = TOP + PLOT;
  const y = (p: number) => soil - (Math.max(0, Math.min(100, p)) / 100) * PLOT;
  const last = stems[stems.length - 1];
  const spot = lineLabelSpot({ lastPct: last && !last.thin ? last.pct : null, line, gap, fs });
  // The words under the soil start 8 below it; the deepest block (a dropped one included) sets the height.
  const h = soil + 8 + Math.ceil(labels.height) + 6;
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
    <View key={`s${p}`} style={{ position: 'absolute', left: 0, width: GUTTER - 6, top: y(p) - Math.round((chartLabel.lineHeight * fs) / 2), alignItems: 'flex-end' }}>
      <FieldText v="tiny" color={c.ink2} style={chartLabel}>{String(p)}</FieldText>
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
            <FieldText v="tiny" color={c.ink2} style={[chartLabel, { textAlign: 'right' }]}>{`${line}\nline`}</FieldText>
          </View>
        ) : (
          <View testID="line-label" style={{ position: 'absolute', right: 0, top: spot.top, backgroundColor: c.raised2, paddingLeft: 3 }}>
            <FieldText v="tiny" color={c.ink2} style={chartLabel}>{`${line} line`}</FieldText>
          </View>
        )}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h }, settleStyle]} pointerEvents="none">
          {stems.map((s, i) => {
            const cx = GUTTER + gap * i + gap / 2;
            // A thin stem's two small lines sit just over its dashed shoot (which ends 27 above the soil), grown with the text.
            const top = s.pct !== null ? y(s.pct) - 34 : s.thin ? soil - 30 - Math.ceil(2 * chartLabel.lineHeight * fs) : null;
            // A growing stem's number rides its tip (GrowNumber, below).
            if (growing.includes(s.key)) return null;
            const overall = saysOverall(s, gap, fs);
            const box = numberBox(overall, gap);
            return top === null ? null : (
              <View key={s.key} style={{ position: 'absolute', left: cx - box / 2, width: box, top, alignItems: 'center' }}>
                {s.pct !== null ? (
                  // A paper halo (the plate's own surface) under the number, so the dashed line never strikes through it.
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.raised2, paddingHorizontal: 3, borderRadius: 3 }}>
                    <BigNum value={String(s.pct)} pct size={20} />
                    {/* The chart's ↑ and ↓ are chart labels too (fg label 500 13/17, TYPE_SCALE row 176a), like its other words. */}
                    {s.up ? <FieldText v="tiny" color={c.clay} style={[chartLabel, { marginLeft: 2, marginTop: 6 }]}>{`↑${Math.round(s.up)}`}</FieldText> : null}
                    {s.down ? <FieldText v="tiny" color={c.ink2} style={[chartLabel, { marginLeft: 2, marginTop: 6 }]}>{`↓${Math.round(s.down)}`}</FieldText> : null}
                    {overall ? <FieldText v="tiny" color={c.ink2} style={[chartLabel, { marginLeft: 4, marginTop: 6 }]}>overall</FieldText> : null}
                  </View>
                ) : (
                  // Too few yet: words where the number will grow (Grove has no dashes; "seed" is the plant's word only).
                  <View style={{ backgroundColor: c.raised2, paddingHorizontal: 3 }}>
                    <FieldText v="tiny" color={c.ink2} center style={chartLabel}>{'too few\nyet'}</FieldText>
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
        {stems.map((s, i) =>
          growing.includes(s.key) && s.pct !== null ? (
            <GrowNumber key={`n${s.key}`} s={s} cx={GUTTER + gap * i + gap / 2} top={y(s.pct) - 34} drop={growthDrop(s, y)} order={growing.indexOf(s.key)} run={run} delay={delay} overall={saysOverall(s, gap, fs)} box={numberBox(saysOverall(s, gap, fs), gap)} />
          ) : null,
        )}
        {stems.map((s, i) => {
          const red = !s.thin && s.pct !== null && s.below;
          return labels.columns[i].map((l, k) => (
            // Each line on its own, centred where stemLabelLayout put it, in a box wider than the line
            // so it never wraps (the name was already wrapped at spaces, if it had to be).
            <View key={`${s.key}-${k}`} style={{ position: 'absolute', left: l.x - 100 * fs, width: 200 * fs, top: soil + 8 + l.y, alignItems: 'center' }}>
              {l.kind === 'name' ? (
                <FieldText v="tiny" color={c.ink} center style={chartName}>{l.t}</FieldText>
              ) : l.kind === 'word' ? (
                <FieldText v="figSm" color={red ? c.clay : c.ink2} center>{l.t}</FieldText>
              ) : (
                <FieldText v="tiny" color={red && l.t.startsWith('below') ? c.clay : c.ink2} center style={chartLabel}>{l.t}</FieldText>
              )}
            </View>
          ));
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
function GrowNumber({ s, cx, top, drop, order, run, delay, overall, box }: { s: Stem; cx: number; top: number; drop: number; order: number; run: number; delay: number; overall: boolean; box: number }) {
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
    <Animated.View testID={`area-number-${s.key}`} style={[{ position: 'absolute', left: cx - box / 2, width: box, top, alignItems: 'center' }, rideStyle]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.raised2, paddingHorizontal: 3, borderRadius: 3 }}>
        <BigNum value={String(pct)} pct size={20} roll={{ play: true, from: String(pct - up), run, delay: delay + order * motion.stagger.stat }} />
        <Animated.View style={arrowStyle}>
          <FieldText v="tiny" color={c.clay} style={[chartLabel, { marginLeft: 2, marginTop: 6 }]}>{`↑${up}`}</FieldText>
        </Animated.View>
        {overall ? <FieldText v="tiny" color={c.ink2} style={[chartLabel, { marginLeft: 4, marginTop: 6 }]}>overall</FieldText> : null}
      </View>
    </Animated.View>
  );
}

/**
 * The list's figure and words, as the website's area rows write them (Grove panel Q2): before any answer
 * "Not started"; from 1 to 29 answers the figure is "22 of 30" and the line under it "answers, too few yet
 * for a score" (never a dash, never "seed": that word is the plant's). The count is in the figure, so the
 * "22 answered" line is left out of a thin row.
 */
export const listFigure = (s: Stem) => (s.answered <= 0 ? 'Not started' : thinFigure(s.answered));
export const listWord = (s: Stem) => (s.answered <= 0 ? null : s.thin ? THIN_WORDS : stemWord(s));
/** A row's extra lines: a thin row's count is already its figure. */
const listLines = (s: Stem, line: number) => stemLines(s, line).filter((l) => !(s.thin && l === `${s.answered} answered`));

/** The list (large text, narrow screens): one row per area, a ruler bar with the line, the word and the figure. */
export function StemList({ stems, line = 70 }: { stems: readonly Stem[]; line?: number }) {
  const { c } = useTheme();
  return (
    <View testID="stem-list">
      {stems.map((s, i) => {
        const red = !s.thin && s.pct !== null && s.below;
        const extra = listLines(s, line);
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
                {s.pct !== null ? <BigNum value={String(s.pct)} pct size={20} /> : <T v="meta">{listFigure(s)}</T>}
                {/* On Results (a stem with the set's note, "2 of 3 this set") the number is the area's score
                    overall, not the set's: "88% overall", the unit beside a numeral in meta (TYPE_SCALE 2.1). */}
                {s.pct !== null && s.note ? <T v="meta">overall</T> : null}
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
