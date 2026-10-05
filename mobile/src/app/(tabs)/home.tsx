/**
 * Home — "what should I do today?" at a glance.
 * Readiness on top (UX panel pattern #5), then today's goal, reviews due,
 * and a one-tap "continue" that picks the most valuable domain.
 */
import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, Card, Gap, Pill, ProgressBar, Row, Screen, Stat, T } from '../../components/ui';
import { getDomain } from '../../content/certifications';
import { startPractice, startReview } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { useSession } from '../../store/session';
import { useSettings } from '../../store/settings';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function Home() {
  const { c } = useTheme();
  const { cert, readiness, dueCount, daysLeft, streak, answeredToday } = useActiveCert();
  const dailyGoal = useSettings((s) => s.dailyGoal);
  const active = useSession((s) => s.active);
  const focus = readiness.focusDomainId ? getDomain(cert, readiness.focusDomainId) : undefined;

  const go = (started: unknown) => {
    if (started) router.push('/session');
    else Alert.alert('Nothing to show yet', 'Answer a few practice questions first.');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="mono" color={c.accent}>{cert.name} · {cert.issuer}</T>
        {streak > 0 && <Pill label={`🔥 ${streak}-day streak`} color={c.tealText} />}
      </Row>
      <Gap h={space.sm} />
      <T v="title">Ready when you are.</T>
      <Gap />

      {active && !active.finishedAt && (
        <>
          <Card onPress={() => router.push('/session')} accessibilityLabel="Resume your session" style={{ borderColor: c.accent }}>
            <T v="heading">Resume: {active.title}</T>
            <T v="caption">
              Question {active.index + 1} of {active.questionIds.length}
            </T>
          </Card>
          <Gap />
        </>
      )}

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <T v="label" color={c.text2}>Exam readiness</T>
            <T v="hero" color={c.accent}>{readiness.score}%</T>
            <T v="caption">
              {readiness.reliable ? 'Weighted by the official blueprint.' : 'Keep practising every domain to firm this up.'}
            </T>
          </View>
          {daysLeft !== null && daysLeft >= 0 && (
            <Stat value={String(daysLeft)} label={daysLeft === 1 ? 'day to go' : 'days to go'} color={daysLeft <= 14 ? c.warning : c.text} />
          )}
        </Row>
        <Gap h={space.md} />
        {cert.domains.map((d) => {
          const dm = readiness.domains.find((x) => x.domainId === d.id);
          return (
            <View key={d.id} style={{ marginBottom: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="caption">{d.short}</T>
                <T v="caption">{Math.round((dm?.mastery ?? 0) * 100)}%</T>
              </Row>
              <ProgressBar value={dm?.mastery ?? 0} color={d.color} height={6} />
            </View>
          );
        })}
      </Card>
      <Gap />

      <Card>
        <T v="label" color={c.text2}>Today</T>
        <Gap h={space.sm} />
        <T v="heading">{Math.min(answeredToday, dailyGoal)} / {dailyGoal} questions</T>
        <Gap h={space.sm} />
        <ProgressBar value={answeredToday / dailyGoal} color={c.teal} />
        <Gap />
        <Button
          label={focus ? `Practise ${focus.short} (10)` : 'Start practising'}
          accessibilityHint="Starts 10 questions in the domain with the most room to improve"
          onPress={() => go(startPractice(cert.id, { count: 10, domainId: focus?.id, title: focus?.name }))}
        />
      </Card>
      <Gap />

      <Card>
        <T v="label" color={c.text2}>Spaced review</T>
        <Gap h={space.sm} />
        <T v="heading">{dueCount === 0 ? 'All caught up ✓' : `${dueCount} question${dueCount === 1 ? '' : 's'} due`}</T>
        <T v="caption">Questions you missed come back at the right moment until they stick.</T>
        {dueCount > 0 && (
          <>
            <Gap h={space.md} />
            <Button kind="secondary" label="Start review" onPress={() => go(startReview(cert.id))} />
          </>
        )}
      </Card>
    </Screen>
  );
}
