/**
 * Mistake Journal — every miss filed automatically, with why.
 *
 * The learner tags the THINKING slip behind each miss (wrong role, missed
 * the priority word, chose tech before governance…). Patterns across tags
 * are the real coaching: they show HOW someone gets questions wrong, which
 * transfers to questions they've never seen. Answering a question correctly
 * later marks its mistake fixed.
 *
 * "Your pattern" (the slip coach, engine/slipCoach.ts): once 5+ mistakes
 * are tagged, it names the most frequent slip and offers the mini-game
 * that drills it in one tap. Below 5, a quiet line says when it appears.
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
import { Button, Chip, Gap, PushedHeader, Section, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { shortDate } from '../lib/format';
import { guardedStart, startFromIds, startPractice } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';
import { GAMES } from '../engine/games/registry';
import { slipCoach, type SlipInput } from '../engine/slipCoach';
import { useProgress, type ThinkingSlip } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const SLIPS: { id: ThinkingSlip; label: string }[] = [
  { id: 'role', label: 'Wrong role' },
  { id: 'priority', label: 'Missed FIRST/BEST' },
  { id: 'tech-first', label: 'Tech before governance' },
  { id: 'symptom', label: 'Fixed the symptom' },
  { id: 'misread', label: 'Misread' },
  { id: 'knowledge', label: 'Didn’t know it' },
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
  // The slip coach reads EVERY tagged mistake (fixed ones too: a habit is
  // still a habit), joined with its question for the runner-up and
  // priority-word checks. Letters stay ORIGINAL letters throughout.
  const pattern = useMemo(() => {
    const inputs: SlipInput[] = [];
    for (const [id, m] of Object.entries(progress.mistakes)) {
      const q = findQuestion(cert.id, id);
      if (q) inputs.push({ slip: m.slip, picked: m.picked, confidence: m.confidence, correct: q.correct, tips: q.tips, stem: q.stem });
    }
    return slipCoach(inputs);
  }, [cert.id, progress.mistakes]);

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

        {pattern.ready ? (
          // Not a card: a green left rule, like the key idea (spec §5).
          <View style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <T v="caption" color={c.accentText}>Your pattern</T>
            <T v="headline" accessibilityRole="header" style={{ marginTop: 2 }}>{pattern.title}</T>
            <T v="small" color={c.ink}>{pattern.coach}</T>
            <T v="meta" num style={{ marginTop: space.xs }}>{`Seen in ${pattern.count} of ${pattern.tagged} tagged mistakes`}</T>
            <Gap h={space.md} />
            {pattern.game ? (
              <Button
                kind="secondary"
                label={`Drill it: ${GAMES[pattern.game].name}`}
                accessibilityHint="Opens the mini-game that trains this slip"
                onPress={() => router.push(`/game/${pattern.game}`)}
              />
            ) : (
              open.length > 0 && <Button
                kind="secondary"
                label="Review these mistakes"
                onPress={() => guardedStart(() => startFromIds(cert.id, open.slice(0, 20).map(([id]) => id), 'Mistake journal'), openSession)}
              />
            )}
          </View>
        ) : (
          <T v="meta" style={{ marginTop: space.lg }}>
            {`Tag ${pattern.needed} more ${pattern.needed === 1 ? 'mistake' : 'mistakes'} to see your pattern.`}
          </T>
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
