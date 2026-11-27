/**
 * Mock start sheet (Build D) — chosen BEFORE a mock begins:
 *   - timing: Standard (default), +25%, +50% or Untimed. These match the
 *     extra time ISACA grants as an accommodation, and WCAG 2.2.1 (a time
 *     limit the learner can turn off or extend);
 *   - "Hide the clock (checkpoints only)" for anxious learners. The time
 *     limit still applies; only the ticking numbers go.
 *
 * Every mock starts here (Practice → Mini / Full mock, and Today's plan),
 * so the choice is never skipped. Route param: `questions` (the mock length).
 *
 * Mobile 1.24: "Start mock" sits in a sticky footer (it was at the end of the
 * scroll, below the fold on a small phone or at large text), like every other
 * flow's main action.
 *
 * First-try courses (`readinessRule: 'firstTry'`, CIA_BANK_PLAN.md section 11
 * item 7): a mock shorter than the exam is drawn for this learner from
 * questions they have not seen (engine/shortMock.ts). The sheet draws it once
 * (a fixed seed), says BEFORE the start when it has to reuse seen questions
 * ("This mock reuses 4 questions you have seen; those won't count toward
 * readiness"), and starts that very mock. Every other course: unchanged.
 */
import { PageTitle } from '../components/groveHub';
import { router, useLocalSearchParams } from 'expo-router';
import { backOr } from '../lib/actions';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ICON_STROKE } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, Gap, ICON_SIZE, PushedHeader, Section, T, ToggleRow } from '../components/ui';
import { durationSpoken, durationText, mockPace, MOCK_TIMINGS, TIMING_FACTOR, TIMING_LABEL, targetPaceWords, type MockTiming } from '../engine/pace';
import { guardedStart, planShortMock, startMock } from '../lib/sessions';
import { reusedLine } from '../engine/shortMock';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** One line under each timing option. */
const TIMING_NOTE: Record<MockTiming, string> = {
  standard: 'The real exam’s pace.',
  plus25: 'Extra time, as an exam accommodation allows.',
  plus50: 'Extra time, as an exam accommodation allows.',
  untimed: 'No clock. Left out of your pacing stats.',
};

/** A radio row: the whole row is the 48pt+ target; the dot shows the choice by shape, not colour alone. */
function TimingRow({
  label,
  detail,
  detailSpoken,
  note,
  selected,
  onPress,
  last,
}: {
  label: string;
  detail: string;
  /** The length read aloud ("1 hour 40 minutes"); empty for Untimed. */
  detailSpoken: string;
  note: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      // No stray ", ." when a row has no length (Untimed, P10).
      accessibilityLabel={`${label}${detailSpoken ? `, ${detailSpoken}` : ''}. ${note}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 64,
        paddingVertical: space.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
        backgroundColor: pressed ? c.soft : 'transparent',
      })}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? c.ink : c.control, alignItems: 'center', justifyContent: 'center' }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.ink }} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm }}>
          <T v="label">{label}</T>
          <T v="label" num color={c.ink2}>{detail}</T>
        </View>
        <T v="meta">{note}</T>
      </View>
    </Pressable>
  );
}

export default function MockStart() {
  const { cert } = useActiveCert();
  const params = useLocalSearchParams<{ questions?: string }>();
  // Unknown or missing length: the full mock. Never more than the real exam.
  const asked = Number(params.questions);
  const wanted = Number.isInteger(asked) && asked > 0 ? Math.min(asked, cert.exam.questions) : cert.exam.questions;
  const full = wanted === cert.exam.questions;
  // First-try courses: this learner's short mock, drawn once for this visit (null for every other course).
  const [seed] = useState(() => Date.now());
  const short = useMemo(() => planShortMock(cert.id, wanted, seed), [cert.id, wanted, seed]);
  // The length as drawn: a short mock can come out shorter when the pool is small (never for CISA).
  const questions = short && short.ids.length > 0 ? short.ids.length : wanted;
  const [timing, setTiming] = useState<MockTiming>('standard');
  const [hideClock, setHideClock] = useState(false);
  const [footerH, setFooterH] = useState(96);
  const { c } = useTheme();
  const pace = mockPace(cert.exam, questions, timing);
  const detail = (t: MockTiming, say = false) => {
    const m = mockPace(cert.exam, questions, t).minutesAllowed;
    return m === null ? '' : say ? durationSpoken(m) : durationText(m);
  };

  const start = () =>
    guardedStart(
      () => startMock(cert.id, wanted, { timing, hideClock, ...(short ? { seed } : {}) }),
      () => router.replace('/session'),
    );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title={full ? 'Full mock' : 'Mini mock'} showTitle={false} onBack={() => backOr('/practice')} icon="close" />
        <PageTitle title={full ? 'Full mock' : 'Mini mock'} />
        <T
          v="meta"
          num
          style={{ marginTop: space.xs }}
          accessibilityLabel={`${questions} questions, ${pace.minutesAllowed === null ? 'no time limit' : durationSpoken(pace.minutesAllowed)}, feedback at the end`}
        >
          {`${questions} questions · ${pace.minutesAllowed === null ? 'no time limit' : durationText(pace.minutesAllowed)} · feedback at the end`}
        </T>
        {/* First-try courses: said before the start, never after (behavioral notes, short mock). */}
        {short && short.reused > 0 && (
          <View testID="mock-reuses-seen" style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <T v="small">{reusedLine(short.reused)}</T>
          </View>
        )}

        <Section title="Timing" />
        <View accessibilityRole="radiogroup" accessibilityLabel="Timing">
          {MOCK_TIMINGS.map((t, i) => (
            <TimingRow
              key={t}
              label={TIMING_LABEL[t]}
              detail={detail(t)}
              detailSpoken={detail(t, true)}
              note={TIMING_NOTE[t]}
              selected={timing === t}
              onPress={() => setTiming(t)}
              last={i === MOCK_TIMINGS.length - 1}
            />
          ))}
        </View>

        <Gap h={space.md} />
        <ToggleRow
          title="Hide the clock (checkpoints only)"
          subtitle={timing === 'untimed' ? 'An untimed mock has no clock.' : 'The time limit still applies. You see pace checks, not ticking numbers.'}
          value={hideClock && timing !== 'untimed'}
          disabled={timing === 'untimed'}
          onValueChange={setHideClock}
          last
        />

        <Gap h={space.md} />
        <T v="small">
          {timing === 'untimed'
            ? 'Your answers still count toward readiness.'
            : // Seconds, the same words as Practice and the exam-eve card (mobile 1.15, PHASE5.md C2).
              `Pace checks at 25, 50 and 75% of the time. ${targetPaceWords(cert.exam, TIMING_FACTOR[timing])}`}
        </T>
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button
          label="Start mock"
          onPress={start}
          icon={(col) => <ArrowRight size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
        />
      </StickyFooter>
    </SafeAreaView>
  );
}
