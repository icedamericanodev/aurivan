/**
 * Practice — choose a domain, difficulty and length, then go.
 * Also the home of Saved (bookmarked) questions.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Gap, ProgressBar, Row, Screen, T } from '../../components/ui';
import type { Difficulty } from '../../content/types';
import { guardedStart, startBookmarks, startPractice } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZES = [10, 20, 50];
const DIFFS: { label: string; value?: Difficulty }[] = [
  { label: 'Any' },
  { label: 'Foundational', value: 'foundational' },
  { label: 'Application', value: 'application' },
  { label: 'Analysis', value: 'analysis' },
];

export default function Practice() {
  const { c } = useTheme();
  const { cert, readiness, progress } = useActiveCert();
  const [domainId, setDomainId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState(10);
  const [diff, setDiff] = useState(0);

  const start = () => {
    const domain = cert.domains.find((d) => d.id === domainId);
    guardedStart(
      () =>
        startPractice(cert.id, {
          count,
          domainId,
          difficulty: DIFFS[diff].value,
          title: domain ? domain.name : 'Mixed practice',
        }),
      () => router.push('/session'),
    );
  };

  return (
    <Screen>
      <T v="title">Practice</T>
      <T color={c.text2}>Instant feedback, tips, and spaced review for anything you miss.</T>
      <Gap />

      <T v="label" color={c.text2}>Domain</T>
      <Gap h={space.sm} />
      <Card
        onPress={() => setDomainId(undefined)}
        accessibilityLabel="All domains, mixed"
        style={{ marginBottom: space.sm, borderColor: domainId === undefined ? c.accent : c.border, borderWidth: domainId === undefined ? 2 : 1 }}
      >
        <T v="heading">All domains (mixed)</T>
      </Card>
      {cert.domains.map((d) => {
        const dm = readiness.domains.find((x) => x.domainId === d.id);
        const selected = domainId === d.id;
        return (
          <Card
            key={d.id}
            onPress={() => setDomainId(d.id)}
            accessibilityLabel={`Domain ${d.id}, ${d.name}, ${d.weight} percent of the exam`}
            style={{ marginBottom: space.sm, borderColor: selected ? c.accent : c.border, borderWidth: selected ? 2 : 1 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                <T v="mono" color={c.text2}>DOMAIN {d.id} · {d.weight}%</T>
              </Row>
              <T v="caption">{dm?.answered ?? 0} answered</T>
            </Row>
            <T v="heading">{d.name}</T>
            <Gap h={space.sm} />
            <ProgressBar value={dm?.mastery ?? 0} color={d.color} height={6} />
          </Card>
        );
      })}
      <Gap h={space.sm} />

      <T v="label" color={c.text2}>Difficulty</T>
      <Gap h={space.sm} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {DIFFS.map((d, i) => (
          <Chip key={d.label} label={d.label} selected={diff === i} onPress={() => setDiff(i)} />
        ))}
      </View>
      <Gap />

      <T v="label" color={c.text2}>Questions</T>
      <Gap h={space.sm} />
      <Row gap={space.sm}>
        {SIZES.map((n) => (
          <Chip key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} />
        ))}
      </Row>
      <Gap h={space.xl} />
      <Button label={`Start ${count} questions`} onPress={start} />

      <Gap h={space.xl} />
      <Card>
        <T v="heading">Saved questions</T>
        <T v="caption">
          {progress.bookmarks.length === 0
            ? 'Tap ☆ Save on any question to build your own revision set.'
            : `${progress.bookmarks.length} saved`}
        </T>
        {progress.bookmarks.length > 0 && (
          <>
            <Gap h={space.md} />
            <Button
              kind="secondary"
              label="Practise saved questions"
              onPress={() => guardedStart(() => startBookmarks(cert.id), () => router.push('/session'))}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
