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
 *
 * Mobile 1.15 (PHASE5.md J9–J13): the tags in plain words, and "What do
 * these mean?" opens one example for each, so a learner new to audit can tag
 * honestly. The stored slip ids never change (no migration). The button
 * says how many of the open mistakes one set takes ("Practice 20 of 55").
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { StickyFooter } from '../components/quiz';
import { ReportLink } from '../components/support';
import { useMotion } from '../components/motion';
import { Button, Chip, Gap, PushedHeader, Row, Section, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { shortDate } from '../lib/format';
import { guardedStart, startFromIds, startPractice } from '../lib/sessions';
import { questionTarget } from '../lib/support';
import { useActiveCert } from '../lib/useActiveCert';
import { GAMES } from '../engine/games/registry';
import { canPlay } from '../lib/games';
import { slipCoach, type SlipInput } from '../engine/slipCoach';
import { useProgress, type ThinkingSlip } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The tags, each with one example (the chip's spoken hint and the "What do these mean?" sheet). */
export const SLIPS: { id: ThinkingSlip; label: string; example: string }[] = [
  { id: 'role', label: 'Acted as the wrong person', example: 'The auditor fixes the control instead of reporting it.' },
  { id: 'priority', label: 'Missed FIRST or BEST', example: 'You picked a good step, but not the first one.' },
  { id: 'tech-first', label: 'Tool before policy', example: 'You picked a new tool before anyone agreed who owns the risk.' },
  { id: 'symptom', label: 'Fixed the symptom, not the cause', example: 'You restored the lost file but not the reason it was lost.' },
  { id: 'misread', label: 'Misread', example: 'You knew it, but missed a word in the question.' },
  { id: 'knowledge', label: 'Didn’t know it', example: 'The topic was new to you.' },
];
/** One practice set takes at most this many open mistakes. */
const SET_MAX = 20;

/** "Practice 20 of 55" when one set takes part of them, "Practice all 12" when it takes them all. */
export function practiceOpenLabel(open: number): { label: string; spoken: string } {
  if (open > SET_MAX) return { label: `Practice ${SET_MAX} of ${open}`, spoken: `Practice ${SET_MAX} of your ${open} open mistakes, ${SET_MAX} at a time` };
  if (open === 1) return { label: 'Practice this one', spoken: 'Practice your 1 open mistake' };
  return { label: `Practice all ${open}`, spoken: `Practice all ${open} open mistakes` };
}

/** The tags explained: one example each (a page sheet; a fade under Reduce Motion). */
function SlipTagsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  return (
    <Modal visible={visible} animationType={reduced ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.raised2 }}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxxl }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="hero" accessibilityRole="header" style={{ flex: 1 }}>What the tags mean</T>
            <Button kind="ghost" label="Close" onPress={onClose} accessibilityLabel="Close what the tags mean" />
          </Row>
          <T v="meta" style={{ marginTop: space.xs }}>Pick the one that fits best. Your pattern shows after a few.</T>
          {SLIPS.map((x, i) => (
            <View
              key={x.id}
              accessible
              accessibilityLabel={`${x.label}. For example: ${x.example}`}
              style={{ paddingVertical: space.md, borderBottomWidth: i === SLIPS.length - 1 ? 0 : 1, borderBottomColor: c.line }}
            >
              <T v="label">{x.label}</T>
              <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{x.example}</T>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function Mistakes() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const tagMistake = useProgress((s) => s.tagMistake);
  const [showFixed, setShowFixed] = useState(false);
  const [footerH, setFooterH] = useState(120);
  const [tagsOpen, setTagsOpen] = useState(false);
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
        art="pressed"
        title="Nothing open right now"
        body="Every question you miss lands here, tagged by the trap that caught you."
        // Effort, made visible: what the learner has already cleared (never a count of misses).
        next={fixedCount > 0 ? `${fixedCount} ${fixedCount === 1 ? 'mistake' : 'mistakes'} cleared so far` : undefined}
        tags={['Missed FIRST or BEST', 'Acted as the wrong person', 'Fixed the symptom, not the cause']}
        primary={{ label: 'Practice 10 questions', onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), openSession) }}
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
            {/* "Drill it" only when that game can be played for this exam (registry minPool). */}
            {pattern.game && canPlay(cert.id, pattern.game) ? (
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
              {/* No letters here, so the report names the pick by its ORIGINAL letter only.
                  Just the link (UX review O8): a meta block on every card was clutter. */}
              <ReportLink certId={cert.id} target={questionTarget(cert.id, q, 'Mistake journal', undefined, m.picked)} />
              {!m.resolved && (
                <>
                  <Gap h={space.md} />
                  <Row gap={space.xs} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <T v="meta">Why did you slip?</T>
                    <Button kind="ghost" label="What do these mean?" accessibilityHint="Shows one example for each tag" onPress={() => setTagsOpen(true)} style={{ marginRight: -space.sm }} />
                  </Row>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {SLIPS.map((s) => (
                      <Chip
                        key={s.id}
                        label={s.label}
                        accessibilityHint={`For example: ${s.example}`}
                        selected={m.slip === s.id}
                        onPress={() => tagMistake(cert.id, id, s.id)}
                      />
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
            label={practiceOpenLabel(open.length).label}
            accessibilityLabel={practiceOpenLabel(open.length).spoken}
            onPress={() => guardedStart(() => startFromIds(cert.id, open.slice(0, SET_MAX).map(([id]) => id), 'Mistake journal'), openSession)}
          />
        </StickyFooter>
      )}
      <SlipTagsSheet visible={tagsOpen} onClose={() => setTagsOpen(false)} />
    </SafeAreaView>
  );
}
