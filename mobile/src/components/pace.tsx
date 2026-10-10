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
import { useEffect, type Ref } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import type { Certification } from '../content/types';
import { checkpointText, durationSpoken, durationText, type MockPacing, type PaceStatus } from '../engine/pace';
import { LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Clock, Flag, Gauge, ICON_STROKE } from './icons';
import { ICON_SIZE, Row, Section, T, useFontScale } from './ui';

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
   * = behind pace. Both 0..1.
   */
  bar?: { done: number; used: number };
  /** Daylight: tap the strip to hear the pace again (announced by the screen). */
  onRequest?: () => void;
  /** For moving screen-reader focus to the strip (Daylight, after Resume). */
  ref?: Ref<View>;
}

export function PaceStrip({ clock, clockUnit, line, lineShort, bar, onRequest, ref }: PaceStripProps) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const attention = line && (line.tone === 'behind' || line.tone === 'cue' || line.tone === 'soon');
  const lineColor = attention ? c.clay : c.ink2;
  const LineIcon = !line ? null : line.tone === 'cue' ? Flag : line.tone === 'note' || line.tone === 'soon' ? Clock : Gauge;
  const clockText = clock === 'hidden' ? 'Clock hidden' : clock === 'untimed' ? 'Untimed' : clock.text;
  const clockSpoken =
    clock === 'hidden' ? 'Clock hidden. Pace checks only.' : clock === 'untimed' ? 'Untimed' : clock.spoken;
  // The 5-minute mark: clay, never the error colour.
  const clockColor = typeof clock === 'object' && clock.low ? c.clay : c.ink;
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
      {bar && <PaceBar done={bar.done} used={bar.used} />}
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
 * Motion it steps in tenths with no animation.
 */
function PaceBar({ done, used }: { done: number; used: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  // Reduce Motion: step to the nearest 10% instead of gliding every second.
  const tickAt = reduce ? Math.floor(clamp(used) * 10) / 10 : clamp(used);
  const tick = useSharedValue(tickAt);
  useEffect(() => {
    tick.value = reduce ? tickAt : withTiming(tickAt, { duration: 900, easing: Easing.linear });
  }, [tickAt, reduce, tick]);
  const tickStyle = useAnimatedStyle(() => ({ left: `${tick.value * 100}%` }));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 8, borderRadius: radius.sm, backgroundColor: c.track, marginTop: space.xs }}
    >
      <View style={{ width: `${clamp(done) * 100}%`, height: 8, borderRadius: radius.sm, backgroundColor: c.accent }} />
      {/* Ink, 4 wide with a 1px paper edge, so it stays visible on the accent fill (P5). */}
      <Animated.View
        style={[{ position: 'absolute', top: -3, width: 4, height: 14, marginLeft: -2, backgroundColor: c.ink, borderWidth: 1, borderColor: c.bg, borderRadius: 1 }, tickStyle]}
      />
    </View>
  );
}

/**
 * Results → Pacing (timed mocks). Hairline rows, no card: time used vs
 * allowed, median seconds, each checkpoint, unanswered at the end, the last
 * 10% of the time vs the rest, and the slowest domain.
 */
export function PacingPanel({ pacing, cert }: { pacing: MockPacing; cert: Certification }) {
  const { c } = useTheme();
  // [label, shown value, spoken value] (P7: "1 hour 20 minutes", not "1 h 20 min").
  const rows: [string, string, string][] = [];
  if (pacing.allowedMinutes !== null) {
    rows.push([
      'Time used',
      `${durationText(pacing.usedMinutes)} of ${durationText(pacing.allowedMinutes)}`,
      `${durationSpoken(pacing.usedMinutes)} of ${durationSpoken(pacing.allowedMinutes)}`,
    ]);
  }
  if (pacing.medianSec !== null) rows.push(['Median per question', `${pacing.medianSec} s`, `${pacing.medianSec} seconds`]);
  if (pacing.checkpoints.length) {
    const text = (sep: string) => pacing.checkpoints.map((k) => `${Math.round(k.at * 100)}%: ${checkpointText(k)}`).join(sep);
    rows.push(['Pace checks', text(' · '), text('; ').replace(/min/g, 'minutes').replace(/%/g, ' percent')]);
  }
  rows.push([pacing.timedOut ? 'Unanswered when time ran out' : 'Unanswered at submit', String(pacing.unanswered), String(pacing.unanswered)]);
  if (pacing.lastTenth && pacing.rest) {
    const pct = (t: { correct: number; total: number }) => Math.round((t.correct / t.total) * 100);
    rows.push([
      'Last 10% of the time',
      `${pct(pacing.lastTenth)}% right · the rest ${pct(pacing.rest)}%`,
      `${pct(pacing.lastTenth)} percent right; the rest ${pct(pacing.rest)} percent`,
    ]);
  }
  if (pacing.slowestDomain) {
    const d = cert.domains.find((x) => x.id === pacing.slowestDomain!.domainId);
    if (d) rows.push(['Slowest domain', `${d.short}, median ${pacing.slowestDomain.medianSec} s`, `${d.short}, median ${pacing.slowestDomain.medianSec} seconds`]);
  }
  return (
    <View>
      <Section title="Pacing" />
      {rows.map(([k, v, spokenV], i) => (
        <View
          key={k}
          accessible
          accessibilityLabel={`${k}: ${spokenV}`}
          style={{ paddingVertical: 12, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: c.line, gap: 2 }}
        >
          <T v="meta">{k}</T>
          <T v="label" num>{v}</T>
        </View>
      ))}
    </View>
  );
}
