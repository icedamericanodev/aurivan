/**
 * Mistake Journal — every miss filed automatically, with why.
 *
 * The learner tags the THINKING slip behind each miss (wrong role, missed
 * the priority word, chose tech before governance…). Patterns across tags
 * are the real coaching: they show HOW someone gets questions wrong, which
 * transfers to questions they've never seen. Answering a question correctly
 * later marks its mistake fixed.
 *
 * Nothing open → the seedling empty state (spec §11), with teaching tags
 * that preview the trap types that will be filed here.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { StickyFooter } from '../components/quiz';
import { BigNum, Button, Chip, Gap, PushedHeader, Row, Section, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { shortDate } from '../lib/format';
import { guardedStart, startFromIds, startPractice } from '../lib/sessions';
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
  const [footerH, setFooterH] = useState(120);
  const openSession = () => router.push('/session');

  const entries = useMemo(
    () =>
      Object.entries(progress.mistakes)
        .filter(([, m]) => showFixed || !m.resolved)
        .sort(([, a], [, b]) => b.at - a.at),
    [progress.mistakes, showFixed],
  );
  const open = Object.entries(progress.mistakes).filter(([, m]) => !m.resolved);
  const fixedCount = Object.keys(progress.mistakes).length - open.length;
  const slipCounts = SLIPS.map((s) => ({ ...s, n: open.filter(([, m]) => m.slip === s.id).length })).filter((s) => s.n > 0);
  const topSlip = [...slipCounts].sort((a, b) => b.n - a.n)[0];

  if (entries.length === 0) {
    return (
      <EmptyScreen
        header="Mistake journal"
        title="Nothing open right now"
        body="Every question you miss lands here, tagged by the trap that caught you."
        tags={['Missed FIRST/BEST', 'Wrong role', 'Fixed the symptom']}
        primary={{ label: 'Practise 10 questions', onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), openSession) }}
        secondary={fixedCount > 0 ? { label: 'See cleared mistakes', onPress: () => setShowFixed(true) } : undefined}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title="Mistake journal" onBack={() => router.back()} />
        <T v="meta" style={{ marginTop: space.sm }}>Tag why you slipped. Find your pattern.</T>

        {topSlip && (
          <View style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <T v="caption" color={c.accentText}>Your pattern</T>
            <Row gap={space.sm} style={{ marginTop: 2 }}>
              <BigNum value={String(topSlip.n)} size={22} />
              <T v="headline" style={{ flexShrink: 1 }}>{topSlip.label}</T>
            </Row>
            <T v="small" color={c.ink}>{topSlip.coach}</T>
          </View>
        )}

        <Section title={showFixed ? 'All mistakes' : `${open.length} open`} />
        {fixedCount > 0 && (
          <View style={{ alignSelf: 'flex-start', marginTop: space.sm }}>
            <Chip label={showFixed ? 'Hide fixed' : `Show ${fixedCount} fixed`} selected={showFixed} onPress={() => setShowFixed(!showFixed)} />
          </View>
        )}

        {entries.map(([id, m]) => {
          const q = findQuestion(cert.id, id);
          if (!q) return null;
          return (
            <View key={id} style={{ paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <T v="caption" num>{`${m.resolved ? 'Fixed · ' : ''}${shortDate(m.at)}`}</T>
              <Gap h={space.xs} />
              <T v="body">{q.stem.length > 160 ? `${q.stem.slice(0, 160).trimEnd()}…` : q.stem}</T>
              <Gap h={space.md} />
              {m.picked && (
                <>
                  <T v="caption" color={c.wrong}>✗ Your answer</T>
                  <T v="small" numberOfLines={2}>{q.options[m.picked]}</T>
                  <Gap h={space.sm} />
                </>
              )}
              <T v="caption" color={c.correct}>✓ Best answer</T>
              <T v="small" numberOfLines={2}>{q.options[q.correct]}</T>
              {!m.resolved && (
                <>
                  <Gap h={space.md} />
                  <T v="meta">Why did you slip?</T>
                  <Gap h={space.xs} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {SLIPS.map((s) => (
                      <Chip key={s.id} label={s.label} selected={m.slip === s.id} onPress={() => tagMistake(cert.id, id, s.id)} />
                    ))}
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
      {open.length > 0 && (
        <StickyFooter onHeight={setFooterH}>
          <Button
            label={`Practise ${Math.min(open.length, 20)} open mistakes`}
            onPress={() => guardedStart(() => startFromIds(cert.id, open.slice(0, 20).map(([id]) => id), 'Mistake journal'), openSession)}
          />
        </StickyFooter>
      )}
    </SafeAreaView>
  );
}
