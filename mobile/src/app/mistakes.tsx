/**
 * Mistake Journal — every miss filed automatically, with why.
 *
 * The learner tags the THINKING slip behind each miss (wrong role, missed
 * the priority word, chose tech before governance…). Patterns across tags
 * are the real coaching: they show HOW someone gets questions wrong, which
 * transfers to questions they've never seen. Answering a question correctly
 * later marks its mistake fixed.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Chip, Gap, Row, Screen, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { shortDate } from '../lib/format';
import { guardedStart, startFromIds } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress, type ThinkingSlip } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const SLIPS: { id: ThinkingSlip; label: string; coach: string }[] = [
  { id: 'role', label: 'Wrong role', coach: 'Ask who you are in the question: auditor, manager or board?' },
  { id: 'priority', label: 'Missed FIRST/BEST', coach: 'Find the priority word before reading the options.' },
  { id: 'tech-first', label: 'Tech before governance', coach: 'Policy, ownership and approval usually come before tools.' },
  { id: 'symptom', label: 'Fixed the symptom', coach: 'Prefer the option that removes the root cause.' },
  { id: 'misread', label: 'Misread', coach: 'Slow down on the last line of the stem.' },
  { id: 'knowledge', label: 'Didn’t know it', coach: 'A content gap. A lesson or review will close it.' },
];

export default function Mistakes() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const tagMistake = useProgress((s) => s.tagMistake);
  const [showFixed, setShowFixed] = useState(false);

  const entries = useMemo(
    () =>
      Object.entries(progress.mistakes)
        .filter(([, m]) => showFixed || !m.resolved)
        .sort(([, a], [, b]) => b.at - a.at),
    [progress.mistakes, showFixed],
  );
  const open = Object.entries(progress.mistakes).filter(([, m]) => !m.resolved);
  const slipCounts = SLIPS.map((s) => ({ ...s, n: open.filter(([, m]) => m.slip === s.id).length })).filter((s) => s.n > 0);
  const topSlip = [...slipCounts].sort((a, b) => b.n - a.n)[0];

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        <T v="label" color={c.accentText}>‹ Back</T>
      </Pressable>
      <Gap h={space.sm} />
      <T v="display">Mistake journal</T>
      <T v="meta">Tag why you slipped. Find your pattern.</T>
      <Gap />

      {topSlip && (
        <>
          <Card emphasis>
            <T v="caption">Your pattern</T>
            <T v="headline" num>{`${topSlip.label} · ${topSlip.n}`}</T>
            <T v="meta">{topSlip.coach}</T>
          </Card>
          <Gap />
        </>
      )}

      {open.length > 0 && (
        <>
          <Button
            label={`Practise ${Math.min(open.length, 20)} open mistakes`}
            onPress={() =>
              guardedStart(
                () => startFromIds(cert.id, open.slice(0, 20).map(([id]) => id), 'Mistake journal'),
                () => router.push('/session'),
              )
            }
          />
          <Gap />
        </>
      )}

      <Row style={{ justifyContent: 'space-between' }}>
        <T v="headline" num>{showFixed ? 'All mistakes' : `${open.length} open`}</T>
        <Chip label={showFixed ? 'Hide fixed' : 'Show fixed'} selected={showFixed} onPress={() => setShowFixed(!showFixed)} />
      </Row>
      <Gap h={space.sm} />

      {entries.length === 0 ? (
        <Card>
          <T v="headline">Nothing here yet</T>
          <T v="meta">Missed questions land here.</T>
        </Card>
      ) : (
        entries.map(([id, m]) => {
          const q = findQuestion(cert.id, id);
          if (!q) return null;
          return (
            <Card key={id} style={{ marginBottom: space.md }}>
              <T v="caption" num>{`${m.resolved ? 'Fixed · ' : ''}${shortDate(m.at)}`}</T>
              <Gap h={space.xs} />
              <T v="body">{q.stem.length > 160 ? `${q.stem.slice(0, 160)}…` : q.stem}</T>
              <Gap h={space.md} />
              {m.picked && (
                <>
                  <T v="caption" color={c.wrong}>✗ Your answer</T>
                  <T v="meta" numberOfLines={2}>{q.options[m.picked]}</T>
                  <Gap h={space.sm} />
                </>
              )}
              <T v="caption" color={c.correct}>✓ Best answer</T>
              <T v="meta" numberOfLines={2}>{q.options[q.correct]}</T>
              {!m.resolved && (
                <>
                  <Gap h={space.md} />
                  <T v="meta">Why did you slip?</T>
                  <Gap h={space.xs} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                    {SLIPS.map((s) => (
                      <Chip key={s.id} label={s.label} selected={m.slip === s.id} onPress={() => tagMistake(cert.id, id, s.id)} />
                    ))}
                  </View>
                </>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
