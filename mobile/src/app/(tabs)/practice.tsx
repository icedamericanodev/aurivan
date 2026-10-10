/**
 * Practice — every way to answer questions, in one place.
 * Spec: DESIGN_SYSTEM.md §11 "Practice":
 *   forest "Quick 10" → Spaced review / Weak area rows → "Build a set"
 *   (domain chips, serif segmented size, difficulty chips, Start) →
 *   "Mock exams" rows with a lead serif numeral.
 *
 * Build D: a "Timed" switch (count-up timer, never a countdown) for Quick 10
 * and Build a set, starting from Settings → Study defaults; and, once, a
 * "Practice at exam pace?" card close to the exam (engine/pace.ts).
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Crosshair, ICON_STROKE, Library, Play, RotateCcw } from '../../components/icons';
import { Button, Card, Chip, ChipRow, Enter, Gap, HeroPanel, ICON_SIZE, Lead, ListRow, Screen, Section, Segmented, T, ToggleRow, Trail } from '../../components/ui';
import type { Difficulty } from '../../content/types';
import { examPaceSeconds, MINUTES_PER_QUESTION, shouldOfferTimer } from '../../engine/pace';
import { REVIEW_UNIT } from '../../engine/srs';
import { guardedStart, reviewSubtitle, startPractice, startReview } from '../../lib/sessions';
import { useJourney } from '../../lib/useJourney';
import { useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZES = [10, 20, 50] as const;
const DIFFS: { label: string; value?: Difficulty }[] = [
  { label: 'Any difficulty' },
  { label: 'Foundational', value: 'foundational' },
  { label: 'Application', value: 'application' },
  { label: 'Analysis', value: 'analysis' },
];

export default function Practice() {
  const { c } = useTheme();
  const { cert, readiness, dueCount, daysLeft, stage } = useJourney();
  // Timed practice: starts from the Study default; this screen's switch can
  // change it for the next start without touching the default.
  const timerDefault = useSettings((s) => s.practiceTimer);
  const paceOffer = useSettings((s) => s.paceOffer);
  const [timedHere, setTimedHere] = useState<boolean | null>(null);
  const timed = timedHere ?? timerDefault;
  const offer = shouldOfferTimer({ daysLeft, stage, answered: paceOffer !== undefined, timerOn: timerDefault });
  const answerOffer = (choice: 'accepted' | 'dismissed') => {
    useSettings.getState().answerPaceOffer(choice);
    setTimedHere(null);
    if (choice === 'accepted') AccessibilityInfo.announceForAccessibility('Timed practice is on. Change it any time in Settings.');
  };
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState<number>(10);
  const [diff, setDiff] = useState(0);
  const open = () => router.push('/session');
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId);
  const mini = Math.round(cert.exam.questions / 3);
  const miniMinutes = Math.round((cert.exam.minutes / cert.exam.questions) * mini);
  const hours = cert.exam.minutes / 60;
  const icon = (G: typeof Crosshair) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Practice</T>
        <T v="meta" style={{ marginTop: space.xs }}>Every option explained, every trap named.</T>
      </Enter>

      {offer && (
        // Offered ONCE (behavioural review §2): close to the exam or at the
        // mock / ready stage. Never switched on without the learner's tap.
        <Enter i={1} style={{ marginTop: 18 }}>
          <Card>
            <T v="headline" accessibilityRole="header">Practice at exam pace?</T>
            <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
              {`The exam gives you about ${Math.round(examPaceSeconds(cert.exam))} s a question. A timer counts up while you answer, never down, and stops while you read the explanation.`}
            </T>
            <Gap h={space.md} />
            <View style={{ gap: space.sm }}>
              <Button label="Turn on Timed" onPress={() => answerOffer('accepted')} />
              <Button kind="ghost" label="Not now" accessibilityHint="Hides this card. You can turn the timer on in Settings." onPress={() => answerOffer('dismissed')} />
            </View>
          </Card>
        </Enter>
      )}

      <Enter i={1} style={{ marginTop: 18 }}>
        <HeroPanel
          caption="Quick 10"
          title="Ten mixed questions"
          meta={`New material first · about ${Math.round(10 * MINUTES_PER_QUESTION)} min${timed ? ' · timed' : ''}`}
          art="frond2"
          wideTitle
          action={{
            label: 'Start',
            icon: (col) => <Play size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />,
            hint: 'Ten mixed questions',
            onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10', timed }), open),
          }}
        />
        <Gap h={space.sm} />
        <ToggleRow
          title="Timed"
          subtitle="Quick 10 and Build a set. Counts up while you answer; never a countdown."
          value={timed}
          onValueChange={setTimedHere}
        />
        <ListRow
          icon={icon(RotateCcw)}
          title="Spaced review"
          subtitle={reviewSubtitle(dueCount)}
          trailing={dueCount ? <Trail value={String(dueCount)} unit={REVIEW_UNIT} /> : undefined}
          accessibilityLabel={`Spaced review, ${dueCount ? `${dueCount} ${REVIEW_UNIT}. ${reviewSubtitle(dueCount)}` : 'all caught up'}`}
          onPress={() => guardedStart(() => startReview(cert.id), open, () => router.push('/caught-up'))}
        />
        {focus && (
          <ListRow
            icon={icon(Crosshair)}
            title={`Weak area: ${focus.short}`}
            subtitle="Most points to gain"
            onPress={() => guardedStart(() => startPractice(cert.id, { count: 10, domainId: focus.id, title: focus.name }), open)}
          />
        )}
        {/* Browse every question by domain and topic (app/bank). Never shows bank size. */}
        <ListRow
          icon={icon(Library)}
          title="Question bank"
          subtitle="Browse by domain and topic"
          onPress={() => router.push('/bank')}
          last
        />
      </Enter>

      <Enter i={2}>
        <Section title="Build a set" style={{ marginTop: 22 }} />
        <Gap h={space.sm} />
        <ChipRow>
          <Chip label="All domains" selected={domainId === undefined} onPress={() => setDomainId(undefined)} />
          {cert.domains.map((d) => (
            <Chip key={d.id} label={d.short} selected={domainId === d.id} onPress={() => setDomainId(d.id)} />
          ))}
        </ChipRow>
        <Gap h={space.md} />
        <Segmented
          accessibilityLabel="Number of questions"
          value={count}
          onChange={setCount}
          options={SIZES.map((n) => ({ value: n, numeral: String(n), label: 'questions' }))}
        />
        <Gap h={space.md} />
        <ChipRow>
          {DIFFS.map((d, i) => (
            <Chip key={d.label} label={d.label} selected={diff === i} onPress={() => setDiff(i)} />
          ))}
        </ChipRow>
        <Gap h={space.md} />
        <Button
          kind="secondary"
          label={`Start ${count} questions${timed ? ', timed' : ''}`}
          onPress={() => {
            const domain = cert.domains.find((d) => d.id === domainId);
            guardedStart(
              () => startPractice(cert.id, { count, domainId, difficulty: DIFFS[diff].value, title: domain ? domain.name : 'Custom set', timed }),
              open,
            );
          }}
        />
      </Enter>

      <Enter i={3}>
        <Section title="Mock exams" style={{ marginTop: space.xl }} />
        <ListRow
          lead={<Lead value={String(mini)} unit="questions" />}
          title="Mini mock"
          subtitle={`${miniMinutes} min · feedback at the end`}
          accessibilityLabel={`Mini mock, ${mini} questions, ${miniMinutes} minutes, feedback at the end`}
          // The start sheet first: timing (standard, extra time, untimed) and "hide the clock".
          onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(mini) } })}
        />
        <ListRow
          lead={<Lead value={String(cert.exam.questions)} unit="questions" />}
          title="Full mock"
          subtitle={`${hours} hours · weighted like the real ${cert.name}`}
          accessibilityLabel={`Full mock, ${cert.exam.questions} questions, ${hours} hours`}
          onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(cert.exam.questions) } })}
          last
        />
        <Gap h={space.sm} />
        <T v="meta">{cert.exam.passingNote}</T>
      </Enter>
    </Screen>
  );
}
