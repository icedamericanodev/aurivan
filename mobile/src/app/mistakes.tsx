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
  { id: 'knowledge', label: 'Didn’t know it', coach: 'A content gap — a lesson or review session will close it.' },
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
      <T v="title">Mistake journal</T>
      <T color={c.text2}>Tag why you slipped. The pattern matters more than any single question.</T>
      <Gap />

      {topSlip && (
        <>
          <Card style={{ borderColor: c.accent }}>
            <T v="mono" color={c.accentText}>YOUR PATTERN</T>
            <T v="heading">{`${topSlip.label} · ${topSlip.n}`}</T>
            <T color={c.text2}>{topSlip.coach}</T>
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
        <T v="label" color={c.text2}>{showFixed ? 'All mistakes' : `${open.length} open`}</T>
        <Chip label={showFixed ? 'Hide fixed' : 'Show fixed'} selected={showFixed} onPress={() => setShowFixed(!showFixed)} />
      </Row>
      <Gap h={space.sm} />

      {entries.length === 0 ? (
        <Card>
          <T v="heading">Nothing here yet</T>
          <T v="caption">Questions you miss in practice, mocks and games are filed here automatically.</T>
        </Card>
      ) : (
        entries.map(([id, m]) => {
          const q = findQuestion(cert.id, id);
          if (!q) return null;
          return (
            <Card key={id} style={{ marginBottom: space.md, borderColor: m.resolved ? c.teal : c.border }}>
              <T v="mono" color={m.resolved ? c.tealText : c.text2}>
                {`${m.resolved ? 'FIXED · ' : ''}${new Date(m.at).toLocaleDateString()}`}
              </T>
              <Gap h={space.xs} />
              <T v="body">{q.stem.length > 160 ? `${q.stem.slice(0, 160)}…` : q.stem}</T>
              <Gap h={space.sm} />
              {m.picked && <T color={c.wrong}>{`You chose: ${q.options[m.picked]}`}</T>}
              <T color={c.correct}>{`Best answer: ${q.options[q.correct]}`}</T>
              {!m.resolved && (
                <>
                  <Gap h={space.md} />
                  <T v="caption">Why did you slip?</T>
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
