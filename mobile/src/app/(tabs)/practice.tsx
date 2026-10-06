/**
 * Practice — every way to answer questions, in one place:
 * quick start, spaced review, a custom set, and timed mock exams.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ActionRow } from '../../components/journey';
import { Crosshair, ICON_STROKE, RotateCcw, Target, Timer } from '../../components/icons';
import { Button, Card, Chip, Gap, ICON_SIZE, Pill, Row, Screen, T } from '../../components/ui';
import type { Difficulty } from '../../content/types';
import { guardedStart, startMock, startPractice, startReview } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZES = [10, 20, 50];
// Chips sit in a single scrollable line that runs to the screen edges
// (the negative margin cancels the page padding, so chips aren't cut off
// mid-screen); the vertical padding keeps the 48px touch area unclipped.
const facetScroll = { marginHorizontal: -space.lg } as const;
const facetRow = { gap: space.sm, paddingVertical: 2, paddingHorizontal: space.lg } as const;
const DIFFS: { label: string; value?: Difficulty }[] = [
  { label: 'Any' },
  { label: 'Foundational', value: 'foundational' },
  { label: 'Application', value: 'application' },
  { label: 'Analysis', value: 'analysis' },
];

export default function Practice() {
  const { c } = useTheme();
  const { cert, readiness, dueCount } = useActiveCert();
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState(10);
  const [diff, setDiff] = useState(0);
  const open = () => router.push('/session');
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId);
  const mini = Math.round(cert.exam.questions / 3);
  const miniMinutes = Math.round((cert.exam.minutes / cert.exam.questions) * mini);
  const icon = (G: typeof Target) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;

  return (
    <Screen>
      <T v="display">Practice</T>
      <T v="meta">Every option explained, every trap named.</T>
      <Gap />

      <Card style={{ paddingVertical: space.xs }}>
        <ActionRow
          icon={icon(Target)}
          title="Quick 10"
          subtitle="Mixed questions, new material first"
          onPress={() => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), open)}
        />
        {focus && (
          <ActionRow
            icon={icon(Crosshair)}
            title={`Weak area: ${focus.short}`}
            subtitle="Most points to gain"
            onPress={() =>
              guardedStart(() => startPractice(cert.id, { count: 10, domainId: focus.id, title: focus.name }), open)
            }
          />
        )}
        <ActionRow
          icon={icon(RotateCcw)}
          title="Spaced review"
          subtitle={dueCount ? 'Missed questions, due now' : 'All caught up'}
          right={dueCount ? String(dueCount) : undefined}
          onPress={() => guardedStart(() => startReview(cert.id), open)}
        />
      </Card>
      <Gap />

      <T v="title">Build a set</T>
      <Gap h={space.sm} />
      {/* One horizontal row per facet: domain, difficulty, size. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={facetScroll} contentContainerStyle={facetRow}>
        <Chip label="All domains" selected={domainId === undefined} onPress={() => setDomainId(undefined)} />
        {cert.domains.map((d) => (
          <Chip key={d.id} label={d.short} selected={domainId === d.id} onPress={() => setDomainId(d.id)} />
        ))}
      </ScrollView>
      <Gap h={space.sm} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={facetScroll} contentContainerStyle={facetRow}>
        {DIFFS.map((d, i) => (
          <Chip key={d.label} label={d.label} selected={diff === i} onPress={() => setDiff(i)} />
        ))}
      </ScrollView>
      <Gap h={space.sm} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={facetScroll} contentContainerStyle={facetRow}>
        {SIZES.map((n) => (
          <Chip key={n} label={`${n} Qs`} selected={count === n} onPress={() => setCount(n)} />
        ))}
      </ScrollView>
      <Gap h={space.md} />
      <Button
        kind="secondary"
        label={`Start ${count} questions`}
        onPress={() => {
          const domain = cert.domains.find((d) => d.id === domainId);
          guardedStart(
            () =>
              startPractice(cert.id, {
                count,
                domainId,
                difficulty: DIFFS[diff].value,
                title: domain ? domain.name : 'Custom set',
              }),
            open,
          );
        }}
      />
      <Gap h={space.xl} />

      <Row style={{ justifyContent: 'space-between' }}>
        <T v="title">Mock exams</T>
        <Timer size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
      </Row>
      <Gap h={space.sm} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="title">Mini mock</T>
          <Pill label={`${miniMinutes} min`} />
        </Row>
        <T v="meta" num>{`${mini} questions at exam pace. Feedback at the end.`}</T>
        <Gap h={space.md} />
        <Button kind="secondary" label="Start mini mock" onPress={() => guardedStart(() => startMock(cert.id, mini), open)} />
      </Card>
      <Gap h={space.sm} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="title">Full mock</T>
          <Pill label={`${cert.exam.minutes / 60} hrs`} />
        </Row>
        <T v="meta" num>{`${cert.exam.questions} questions, weighted like the real ${cert.name}.`}</T>
        <Gap h={space.md} />
        <Button kind="secondary" label="Start full mock" onPress={() => guardedStart(() => startMock(cert.id), open)} />
      </Card>
      <Gap h={space.sm} />
      <T v="meta">{cert.exam.passingNote}</T>
    </Screen>
  );
}
