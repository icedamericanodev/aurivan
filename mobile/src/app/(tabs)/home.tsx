/**
 * Journey — "where am I, and what's my one next step?"
 *
 * Top to bottom: countdown + stage, readiness ring, today's plan (tap to
 * start), the domain route, and a calm week strip. One accent-filled
 * element per screen: the first plan item.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { ActionRow, DomainRoute, ReadinessRing, WeekStrip } from '../../components/journey';
import {
  BookOpen,
  Sprig,
  Gamepad2,
  ICON_STROKE,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
} from '../../components/icons';
import { Button, Card, Gap, ICON_SIZE, Pill, ProgressBar, Row, Screen, T } from '../../components/ui';
import type { PlanItem } from '../../engine/planner';
import { runPlanItem } from '../../lib/actions';
import { useJourney } from '../../lib/useJourney';
import { useSession } from '../../store/session';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const enter = (i: number) => FadeInDown.duration(320).delay(i * 80).reduceMotion(ReduceMotion.System);

function planIcon(item: PlanItem, color: string) {
  const p = { size: ICON_SIZE.row, color, strokeWidth: ICON_STROKE };
  switch (item.kind) {
    case 'review':
      return <RotateCcw {...p} />;
    case 'lesson':
      return <BookOpen {...p} />;
    case 'practice':
      return <Target {...p} />;
    case 'game':
      return <Gamepad2 {...p} />;
    case 'mock':
      return <Timer {...p} />;
  }
}

function planTitle(item: PlanItem): { title: string; subtitle?: string } {
  switch (item.kind) {
    case 'review':
      return { title: `Review ${item.count} due`, subtitle: 'Due for review' };
    case 'lesson':
      return { title: item.title, subtitle: 'Lesson · about 3 minutes' };
    case 'practice':
      return { title: item.label, subtitle: 'Practice' };
    case 'game':
      return { title: item.label, subtitle: 'Play' };
    case 'mock':
      return { title: item.label, subtitle: 'Timed, at real exam pace' };
  }
}

export default function Journey() {
  const { c } = useTheme();
  const j = useJourney();
  const active = useSession((s) => s.active);
  const countdown =
    j.daysLeft === null ? 'No exam date' : j.daysLeft < 0 ? 'Exam done' : `${j.daysLeft} day${j.daysLeft === 1 ? '' : 's'}`;

  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="caption" num>{`${j.cert.name} · ${countdown}`}</T>
          {j.streak > 0 && (
            <Row gap={space.xs} style={{ minHeight: 24 }}>
              <Sprig size={ICON_SIZE.row} color={c.clay} strokeWidth={ICON_STROKE} />
              <T v="label" num color={c.clay} accessibilityLabel={`${j.streak}-day streak`}>{String(j.streak)}</T>
            </Row>
          )}
        </Row>
        <Gap h={space.sm} />
        <T v="display">{j.plan.length ? 'Today' : 'Well done.'}</T>
      </Animated.View>
      <Gap />

      {active && !active.finishedAt && (
        <Animated.View entering={enter(1)}>
          <Card onPress={() => router.push('/session')} accessibilityLabel="Resume your session" emphasis>
            <T v="headline">Resume: {active.title}</T>
            <T v="meta" num>Question {active.index + 1} of {active.questionIds.length}</T>
          </Card>
          <Gap />
        </Animated.View>
      )}

      {/* Hero: readiness + journey stage */}
      <Animated.View entering={enter(2)}>
        <Card>
          <Row gap={space.lg}>
            <ReadinessRing score={j.readiness.score} />
            <View style={{ flex: 1 }}>
              <T v="caption">Stage</T>
              <T v="headline">{j.stageLabel}</T>
              <Gap h={space.sm} />
              <ProgressBar value={j.stageProgress} color={c.clay} height={6} />
              <Gap h={space.sm} />
              <T v="meta">
                {j.readiness.reliable
                  ? 'Weighted by the official exam blueprint.'
                  : 'Readiness firms up as you practise every domain.'}
              </T>
            </View>
          </Row>
        </Card>
      </Animated.View>
      <Gap />

      {/* Today's plan */}
      <Animated.View entering={enter(3)}>
        {j.plan.length === 0 ? (
          <Card>
            <T v="headline">Exam done. How did it go?</T>
            <T v="meta">Set a new date to plan what’s next.</T>
            <Gap h={space.md} />
            <Button kind="secondary" label="Open settings" onPress={() => router.push('/settings')} />
          </Card>
        ) : (
          <Card>
            {j.plan.map((item, i) => {
              const { title, subtitle } = planTitle(item);
              if (i === 0) {
                return (
                  <View key={i} style={{ marginBottom: j.plan.length > 1 ? space.sm : 0 }}>
                    <T v="caption">Start here</T>
                    <Gap h={space.xs} />
                    <T v="headline">{title}</T>
                    {subtitle && <T v="meta">{subtitle}</T>}
                    <Gap h={space.md} />
                    <Button label="Start" onPress={() => runPlanItem(item, j.cert.id)} accessibilityHint={title} />
                  </View>
                );
              }
              return (
                <ActionRow
                  key={i}
                  icon={planIcon(item, c.accentText)}
                  title={title}
                  subtitle={subtitle}
                  onPress={() => runPlanItem(item, j.cert.id)}
                />
              );
            })}
          </Card>
        )}
      </Animated.View>
      <Gap />

      {j.stage === 'ready' && (
        <>
          <Animated.View entering={enter(4)}>
            <Card style={{ borderColor: c.clay }}>
              <Row gap={space.sm}>
                <Sparkles size={ICON_SIZE.row} color={c.clay} strokeWidth={ICON_STROKE} />
                <T v="headline" color={c.clay}>Exam-ready</T>
              </Row>
              <T v="body">Above target in every domain. Short sessions keep it warm until exam day.</T>
            </Card>
          </Animated.View>
          <Gap />
        </>
      )}

      {/* Domain route */}
      <Animated.View entering={enter(5)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="headline">Your route</T>
          <Pill label={`${j.cert.domains.length} domains`} />
        </Row>
        <Gap h={space.md} />
        <DomainRoute
          domains={j.cert.domains}
          mastery={j.readiness.domains}
          focusId={j.focus?.id}
          onPress={(domainId) => router.push({ pathname: '/(tabs)/learn', params: { domain: domainId } })}
        />
      </Animated.View>
      <Gap />

      {/* Week strip */}
      <Animated.View entering={enter(6)}>
        <Card>
          <T v="headline">This week</T>
          <T v="meta">One rest day a week keeps your streak.</T>
          <Gap h={space.md} />
          <WeekStrip days={j.week} />
        </Card>
      </Animated.View>
    </Screen>
  );
}
