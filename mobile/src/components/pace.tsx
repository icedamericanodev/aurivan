/**
 * The ONE timer / pace component (Build D), shared by mock exams, timed
 * practice and the Daylight game, plus the mock results' pacing panel.
 *
 * PaceStrip sits under a screen's header:
 *   [clock icon] 12:04 left            ← the clock (or "Clock hidden", "Untimed")
 *   [gauge icon] On pace               ← the pace line (only changes at checkpoints)
 *   ▬▬▬▬▬▬▬▬▬|▭▭▭▭                     ← Daylight only: a calm pace bar
 *
 * Calm on purpose (behavioural review §2): neutral ink2 text, clay for
 * "behind" and the 2-minute cue, NEVER the error colour, no pulsing. The
 * screens decide WHAT to say (engine/pace.ts); this only draws it.
 */
import { useEffect, useState, type Ref } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Certification } from '../content/types';
import { aboutSeconds, checkpointText, durationSpoken, durationText, durationWords, spokenMin, type MockPacing, type PaceStatus } from '../engine/pace';
import { LARGE_TEXT, motion, radius, space } from '../theme/tokens';
import { grovePlate } from '../theme/grove';
import { useTheme } from '../theme/useTheme';
import { Clock, Flag, Gauge, ICON_STROKE } from './icons';
import { ProgressFill, useMotion } from './motion';
import { groveCard, ICON_SIZE, Row, T, useFontScale } from './ui';

/**
 * What the pace line says: a status (gauge icon), a cue to flag (flag icon,
 * mocks only, where a Flag button exists), 'soon' for time running short
 * or a long question in practice (clock icon, clay), or a plain note
 * (clock icon, ink2).
 */
export type PaceTone = PaceStatus | 'cue' | 'soon' | 'note';

export interface PaceStripProps {
  /**
   * The clock: its text ("12:04") and what a screen reader says ("Time left
   * 12 minutes 4 seconds"); 'hidden' when the learner chose checkpoints only;
   * 'untimed' for an untimed mock.
   */
  clock: { text: string; spoken: string; low?: boolean } | 'hidden' | 'untimed';
  /** Small word after the clock: "left" or "session". */
  clockUnit?: string;
  /** The pace line, or nothing yet. */
  line?: { text: string; tone: PaceTone } | null;
  /**
   * A short form of the line, shown instead at very large text (P6) so the
   * fixed strip never crowds out the question. Screen readers still hear
   * the full line.
   */
  lineShort?: string;
  /**
   * Daylight's pace bar: `done` = share of items answered (the fill),
   * `used` = share of the time budget gone (the tick). Fill behind the tick
   * = behind pace. Both 0..1. `step` (Grove 4b, PHASE4B 6.3 item 9): the tick steps once a second
   * with no tween (Daylight's clock moves it once a second), in place of the 900 ms linear glide.
   */
  bar?: { done: number; used: number; step?: boolean };
  /** Daylight: tap the strip to hear the pace again (announced by the screen). */
  onRequest?: () => void;
  /** For moving screen-reader focus to the strip (Daylight, after Resume). */
  ref?: Ref<View>;
}

export function PaceStrip({ clock, clockUnit, line, lineShort, bar, onRequest, ref }: PaceStripProps) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  // Grove Phase 4 (PHASE4.md O13): pace attention is said in words in ink2, never clay (the handoff keeps
  // clay for the streak, below-70 marks and the focus area's badge).
  const lineColor = c.ink2;
  const LineIcon = !line ? null : line.tone === 'cue' ? Flag : line.tone === 'note' || line.tone === 'soon' ? Clock : Gauge;
  const clockText = clock === 'hidden' ? 'Clock hidden' : clock === 'untimed' ? 'Untimed' : clock.text;
  const clockSpoken =
    clock === 'hidden' ? 'Clock hidden. Pace checks only.' : clock === 'untimed' ? 'Untimed' : clock.spoken;
  // The low clock: its words ("left", the 5-minute line) carry it; the numerals stay ink.
  const clockColor = c.ink;
  const spoken = [clockSpoken, line?.text].filter(Boolean).join('. ');

  const body = (
    <View style={{ gap: space.xs }}>
      {/* Clock and line side by side; stacked at large text so neither is squeezed. */}
      <View style={{ flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center', gap: large ? space.xs : space.md, flexWrap: 'wrap' }}>
        <Row gap={space.xs}>
          <Clock size={ICON_SIZE.inline} color={clockColor} strokeWidth={ICON_STROKE} />
          <T v="label" num color={clockColor}>{clockText}</T>
          {clockUnit && typeof clock === 'object' && <T v="meta">{clockUnit}</T>}
        </Row>
        {line && LineIcon && (
          <Row gap={space.xs} style={{ flexShrink: 1, alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 2 }}>
              <LineIcon size={ICON_SIZE.inline} color={lineColor} strokeWidth={ICON_STROKE} />
            </View>
            <T v="meta" color={lineColor} style={{ flexShrink: 1 }}>{large && lineShort ? lineShort : line.text}</T>
          </Row>
        )}
      </View>
      {bar && <PaceBar done={bar.done} used={bar.used} step={bar.step} />}
    </View>
  );

  const pad = { paddingHorizontal: space.gutter, paddingVertical: space.sm, minHeight: 48, justifyContent: 'center' as const };
  if (onRequest) {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint="Reads the pace aloud."
        onPress={onRequest}
        style={({ pressed }) => [pad, pressed && { backgroundColor: c.soft }]}
      >
        {body}
      </Pressable>
    );
  }
  // One screen-reader stop for the clock and the line together.
  return (
    <View ref={ref} accessible accessibilityLabel={spoken} style={pad}>
      {body}
    </View>
  );
}

/**
 * The calm pace bar (Daylight). The fill is the work done; the thin tick is
 * where a learner exactly on pace would be. The tick glides; under Reduce
 * Motion it steps in tenths with no animation. Both move on transforms only
 * (mobile 1.8): the tick slides with translateX across the measured track,
 * and the fill is a ProgressFill, so nothing triggers a layout pass each
 * second (the tick used to animate `left`).
 */
function PaceBar({ done, used, step = false }: { done: number; used: number; step?: boolean }) {
  const { c } = useTheme();
  const { reduced: reduce } = useMotion();
  // PHASE4B 6.3 item 9 and section 8: a component value that replaces `motion.dur.tick` for this bar
  // only (theme/tokens.ts is bundled into the website and is not edited). Read, not changed.
  const glide = !step;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  // Reduce Motion: step to the nearest 10% instead of gliding every second.
  const tickAt = reduce && !step ? Math.floor(clamp(used) * 10) / 10 : clamp(used);
  const [width, setWidth] = useState(0);
  const tick = useSharedValue(tickAt);
  useEffect(() => {
    // The clock's own pace: a linear glide over most of each 1 s tick (the one linear motion in the app).
    tick.set(reduce || !glide ? tickAt : withTiming(tickAt, { duration: motion.dur.tick, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
  }, [tickAt, reduce, glide, tick]);
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tick.value * width }] }));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 8, marginTop: space.xs }}
    >
      <View style={{ height: 8, borderRadius: radius.sm, backgroundColor: c.track, overflow: 'hidden' }}>
        <ProgressFill value={clamp(done)} color={c.accent} radius={radius.sm} />
      </View>
      {/* Ink, 4 wide with a 1px paper edge, so it stays visible on the accent fill (P5).
          Hidden until the track is measured, so it never flashes at the start. */}
      <Animated.View
        style={[
          { position: 'absolute', top: -3, left: 0, width: 4, height: 14, marginLeft: -2, backgroundColor: c.ink, borderWidth: 1, borderColor: c.bg, borderRadius: 1, opacity: width > 0 ? 1 : 0 },
          tickStyle,
        ]}
      />
    </View>
  );
}

/**
 * Results → Pacing (timed mocks): time used vs allowed, median seconds, each
 * checkpoint, unanswered at the end, the last 10% of the time vs the rest, and
 * the slowest domain. Grove Phase 4 (PHASE4.md 7.13): one card with label and
 * value rows like set results, headed by a `headline` (results are not a tab
 * home, R4). Every row and its spoken words are as before.
 */
export function PacingPanel({ pacing, cert }: { pacing: MockPacing; cert: Certification }) {
  const { c } = useTheme();
  // [label, shown value, spoken value] (P7: "1 hour 20 minutes", not "1 h 20 min").
  const rows: [string, string, string][] = [];
  if (pacing.allowedMinutes !== null) {
    // The same words as Results' Time stat ("Under 1 min", "3 h 31 min").
    const used = durationWords(pacing.usedMs ?? pacing.usedMinutes * 60_000);
    rows.push(['Time used', `${used.text} of ${durationText(pacing.allowedMinutes)}`, `${used.spoken} of ${durationSpoken(pacing.allowedMinutes)}`]);
  }
  // The typical (median) answer: plain words, never "median" or a bare "s".
  if (pacing.medianSec !== null) {
    const about = aboutSeconds(pacing.medianSec);
    rows.push(['Typical time per question', `${about[0].toUpperCase()}${about.slice(1)}`, spokenMin(about)]);
  }
  if (pacing.checkpoints.length) {
    const text = (sep: string) => pacing.checkpoints.map((k) => `${Math.round(k.at * 100)}%: ${checkpointText(k)}`).join(sep);
    rows.push(['Pace checks', text(' · '), text('; ').replace(/min/g, 'minutes').replace(/%/g, ' percent')]);
  }
  const left = pacing.unanswered ? String(pacing.unanswered) : 'None';
  rows.push([pacing.timedOut ? 'Unanswered when time ran out' : 'Unanswered at submit', left, left.toLowerCase()]);
  if (pacing.lastTenth && pacing.rest) {
    const pct = (t: { correct: number; total: number }) => Math.round((t.correct / t.total) * 100);
    rows.push([
      'Last 10% of the time',
      `${pct(pacing.lastTenth)}% right (${pct(pacing.rest)}% before that)`,
      `${pct(pacing.lastTenth)} percent right, against ${pct(pacing.rest)} percent before that`,
    ]);
  }
  if (pacing.slowestDomain) {
    const d = cert.domains.find((x) => x.id === pacing.slowestDomain!.domainId);
    if (d) {
      const line = `${d.short}, ${aboutSeconds(pacing.slowestDomain.medianSec)} per question`;
      rows.push(['Slowest domain', line, spokenMin(line)]);
    }
  }
  return (
    <View testID="pacing-card" style={[groveCard(c), { paddingHorizontal: grovePlate.pad, paddingTop: space.md, paddingBottom: space.xs }]}>
      <T v="headline" accessibilityRole="header">Pacing</T>
      {rows.map(([k, v, spokenV], i) => (
        <View
          key={k}
          accessible
          accessibilityLabel={`${k}: ${spokenV}`}
          // A hairline between rows only; the first row sits under the heading.
          style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line, gap: 2 }}
        >
          <T v="meta">{k}</T>
          <T v="label" num>{v}</T>
        </View>
      ))}
    </View>
  );
}
