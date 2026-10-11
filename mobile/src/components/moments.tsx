/**
 * Signature moments (Phase 5b) — three calm, quiet cards. No confetti, no
 * motion over 600ms, nothing that promises a pass.
 *
 * - ExamReadyPanel  (Today, forest panel, once per cert): the readiness
 *   range's lower bound held at 80%+ for 7 days. Rings grow in (600ms,
 *   static under Reduce Motion). Replaces "Start here" until dismissed.
 * - ExamEveCard     (Today, on paper): the day before the exam and exam day.
 * - MindsetGrowthCard (You, on paper): first weeks vs lately, runner-up picks.
 *
 * The two paper cards are not boxes (spec §5): a 3px accent rule on the
 * left, like the key idea and "Your pattern".
 */
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Certification } from '../content/types';
import type { ExamMoment } from '../engine/examDay';
import { READY_DAYS, READY_LOW } from '../engine/examReady';
import type { Readiness } from '../engine/readiness';
import { haptic } from '../lib/haptics';
import { LARGE_TEXT, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GrowthRings, PlanLeaf } from './glyphs';
import { ringsSpoken } from './journey';
import { Check, ICON_STROKE, Timer } from './icons';
import { Celebrate, FadeIn, Pop, useOncePerDay, type Celebration } from './motion';
import { HeroPanel, ICON_SIZE, Row, T, useFontScale } from './ui';

// ── 1. Exam-ready panel ────────────────────────────────────────────────
/**
 * Mobile 1.9 (T3): when it first comes into view, the rings grow in, the
 * frond takes ONE slow breath and the words follow (≤ 1.2 s; a tap ends
 * it). No particles. Later views, and Reduce Motion, show it still. One
 * success haptic, the first time it ever shows.
 */
export function ExamReadyPanel({
  cert,
  readiness,
  onDismiss,
  celebration,
}: {
  cert: Certification;
  readiness: Readiness;
  onDismiss: () => void;
  celebration?: Celebration;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const held = `Your readiness range has stayed at ${READY_LOW}% or more for ${READY_DAYS} days.`;
  const full = celebration?.mode === 'full';
  const run = celebration?.run ?? 0;
  // One success tap, the first time it ever shows (not on every visit until it is dismissed).
  const first = celebration?.first ?? false;
  useEffect(() => {
    if (run > 0 && first) haptic.success();
  }, [run, first]);
  const panel = (
    <HeroPanel
      caption="A quiet milestone"
      // Two short lines, each clear of the frond art.
      // Never implies a pass (brand rule): it names what held, not an outcome.
      title={'Your readiness is holding.\nKeep it light.'}
      titleLabel="Your readiness is holding. Keep it light."
      art="clearing"
      sway={false}
      // One breath while the moment plays; a tap (settled) stops it upright.
      breathe={full && !celebration?.settled}
      action={{
        label: 'Show today’s plan',
        onPress: onDismiss,
        hint: 'Closes this note. It will not show again.',
        icon: (col) => <Check size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
      }}
    >
      <View
        style={{
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'flex-start' : 'center',
          gap: 16,
          marginTop: 18,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: c.forestTrack,
        }}
      >
        {/* The rings grow in with the moment (600ms; static under Reduce Motion). */}
        <GrowthRings
          preset="today"
          grow={{ play: full, run }}
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={c.sap}
          track={c.forestTrack}
          // Same spoken summary as the rings on You: "IS Audit 88, IT Governance 63, …".
          accessibilityLabel={`Readiness rings. ${ringsSpoken(cert, readiness.domains.map((d) => (d.answered ? d.mastery : null)))}.`}
        />
        {/* Side by side, the text column stops at 250pt so it never runs under the frond art. */}
        <FadeIn key={run} delay={full ? motion.dur.grow : 0} rise={false} style={stacked ? undefined : { flex: 1, maxWidth: 250 }}>
          <T v="small" color={c.onForest}>{held}</T>
          {/* `small`, not `meta`: spec §2 caps meta lines at 6 words. */}
          <T v="small" color={c.onForest2} style={{ marginTop: 6 }}>
            Light review most days, one mock a week.
          </T>
        </FadeIn>
      </View>
    </HeroPanel>
  );
  return celebration ? <Celebrate celebration={celebration}>{panel}</Celebrate> : panel;
}

// ── 2. Exam eve / exam day card ────────────────────────────────────────
export function ExamEveCard({
  moment,
  reminders,
  pace,
}: {
  moment: ExamMoment;
  /** The eve's reminder lines; `own` = from the learner's mistake journal. */
  reminders: { own: boolean; lines: string[] } | null;
  pace: string;
}) {
  const { c } = useTheme();
  const eve = moment === 'eve';
  const caption = eve ? 'Exam eve' : 'Exam day';
  // Mobile 1.9: calm over celebration. On the first view of the day the
  // reminders arrive one by one, each leaf pressing in, then the closing
  // line; never particles. Later views, and Reduce Motion, show it still.
  const play = useOncePerDay(`exam-${moment}`);
  const at = (k: number) => motion.dur.enter + k * motion.stagger.leaf;
  const title = eve ? 'Tomorrow. You’ve done the work.' : 'Good luck today.';
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      {/* The caption is read as part of the heading below, so it is hidden here. */}
      <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <T v="caption" color={c.accentText}>{caption}</T>
      </View>
      {/* `stem`, one step below `hero`: Today already has its one hero (the forest panel). */}
      <T v="stem" accessibilityRole="header" accessibilityLabel={`${caption}. ${title}`} style={{ marginTop: 2 }}>
        {title}
      </T>

      {eve && reminders && (
        <View style={{ marginTop: space.md }}>
          <T v="caption" color={c.ink2}>{reminders.own ? 'Your three gentle reminders' : 'Three gentle reminders'}</T>
          {reminders.lines.map((line, k) => (
            <Arrive key={line} play={play} delay={at(k)}>
              <View
                accessible
                accessibilityLabel={line}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.sm }}
              >
                <Pop mount={play} delay={at(k)} style={{ paddingTop: 5 }}>
                  <PlanLeaf color={c.accent} filled />
                </Pop>
                <T v="small" color={c.ink} style={{ flex: 1 }}>{line}</T>
              </View>
            </Arrive>
          ))}
        </View>
      )}

      <Row gap={space.sm} style={{ marginTop: space.md, alignItems: 'flex-start' }}>
        <View style={{ paddingTop: 2 }}>
          <Timer size={ICON_SIZE.inline} color={c.accentText} strokeWidth={ICON_STROKE} />
        </View>
        <T v="meta" color={c.ink2} style={{ flex: 1 }}>{pace}</T>
      </Row>

      <T v="quote" color={c.ink} style={{ marginTop: space.md }}>
        {eve
          ? 'Rest tonight rather than cram. A calm, early night does more than one more set.'
          : 'Read each stem to the last line, find the priority word, and take your time.'}
      </T>
    </View>
  );
}

/** Fades in after `delay` when `play`; otherwise simply there. */
function Arrive({ play, delay, children }: { play: boolean; delay: number; children: ReactNode }) {
  if (!play) return <View>{children}</View>;
  return (
    <FadeIn delay={delay} rise={false}>
      {children}
    </FadeIn>
  );
}

// ── 3. Mindset growth (You) ────────────────────────────────────────────
/** Dot size and the outline on empty dots (pt). */
const DOT = 9;
const DOT_RING = 1.5;

/**
 * Ten small dots, `n` of them filled: "4 in 10" as a picture (decorative;
 * the card's label says it in words). Empty dots are an outline in the same
 * colour, so they stay visible on paper in light and dark.
 */
function TenDots({ n, color }: { n: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <View
          key={i}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            borderWidth: DOT_RING,
            borderColor: color,
            backgroundColor: i < n ? color : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

export function MindsetGrowthCard({
  earlyIn10,
  lateIn10,
  line,
  spoken,
}: {
  earlyIn10: number;
  lateIn10: number;
  line: string;
  spoken: string;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const rows: [string, number][] = [
    ['First weeks', earlyIn10],
    ['Lately', lateIn10],
  ];
  return (
    <View
      accessible
      accessibilityLabel={`Mindset growth. ${spoken}`}
      style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}
    >
      <T v="caption" color={c.accentText}>Mindset growth</T>
      <T v="quote" color={c.ink} style={{ marginTop: 4 }}>{line}</T>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {rows.map(([label, n]) => (
          <View
            key={label}
            style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: stacked ? 4 : space.md }}
          >
            <T v="meta" style={{ minWidth: stacked ? undefined : 92 }}>{label}</T>
            <TenDots n={n} color={c.ink2} />
            {/* The number, in words, at the end of the row. */}
            <T v="meta">{`${n} in 10`}</T>
          </View>
        ))}
      </View>
      <T v="meta" style={{ marginTop: space.sm }}>Runner-up picks on first tries, out of 10.</T>
    </View>
  );
}
