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
 *
 * Mobile 1.20: each open mistake whose question a study note covers gets a
 * small "Read the note" (BookOpen = notes), so the fix starts with the idea.
 *
 * Principles: "Your pattern" links to the exam-mindset principle that
 * coaches it ("Read the principle", Compass), looked up through the shared
 * file's slip map (content/principles principleForSlip). No link for "Didn't
 * know it": a content gap has no thinking rule to read.
 *
 * Mobile 1.24 (accessibility): the question is shown whole (the ask, FIRST or
 * BEST, is at the END of most stems, and the options are no longer cut to two
 * lines); "Your answer" / "Best answer" are plain words (no ✓ / ✗ glyphs read
 * aloud as "check mark"); and the six tag chips are not repeated under every
 * mistake: an untagged mistake has one "Tag why you slipped" button, a tagged
 * one shows its tag as a line with "Change", and the chips (one labelled radio
 * group, each spoken as "Tag: ...") open only on tap.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { StickyFooter } from '../components/quiz';
import { BookOpen, Compass, ICON_STROKE } from '../components/icons';
import { ReportLink } from '../components/support';
import { useMotion } from '../components/motion';
import { Button, Chip, Gap, ICON_SIZE, PushedHeader, Row, Section, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { principleForSlip } from '../content/principles';
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
  { id: 'role', label: 'Acted as the wrong person', example: 'You fixed it yourself, when the auditor’s job is to report it.' },
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
  // The mistakes whose six tag chips are open (tapped "Tag why you slipped" / "Change").
  const [tagging, setTagging] = useState<string[]>([]);
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
  // The principle that coaches this pattern (none for a content gap, or a cert without principles).
  const patternPrinciple = pattern.ready ? principleForSlip(cert.id, pattern.pattern) : undefined;

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
            {patternPrinciple && (
              // The thinking rule behind this slip. The ghost pads 8pt each side: pulled left so its icon lines up with the text.
              <Button
                kind="ghost"
                label="Read the principle"
                accessibilityLabel={`Read the principle: ${patternPrinciple.title}`}
                accessibilityHint="Opens the exam-mindset principle that fixes this slip"
                icon={(col) => <Compass size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
                iconLeading
                onPress={() => router.push({ pathname: '/principles/[id]', params: { id: patternPrinciple.id } })}
                style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
              />
            )}
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
          // The study note behind this question (open mistakes only).
          const noteId = m.resolved ? undefined : subtopicOfQuestion(cert.id, id);
          const note = noteId ? findNote(cert.id, noteId) : undefined;
          return (
            <View key={id} style={{ paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <T v="caption" num>{`${m.resolved ? 'Fixed · ' : ''}${shortDate(m.at)}`}</T>
              <Gap h={space.xs} />
              <T v="body">{q.stem}</T>
              <Gap h={space.md} />
              {m.picked && (
                <>
                  <T v="caption" color={c.wrong}>Your answer</T>
                  <T v="small">{q.options[m.picked]}</T>
                  <Gap h={space.sm} />
                </>
              )}
              <T v="caption" color={c.correct}>Best answer</T>
              <T v="small">{q.options[q.correct]}</T>
              {note && (
                // The ghost pads 8pt each side: pulled left so its icon lines up with the text above.
                <Button
                  kind="ghost"
                  label="Read the note"
                  accessibilityLabel={`Read the note: ${note.name}`}
                  accessibilityHint="Opens the study note on the idea this question tests"
                  icon={(col) => <BookOpen size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
                  iconLeading
                  onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(note.id)}`)}
                  style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
                />
              )}
              {/* No letters here, so the report names the pick by its ORIGINAL letter only.
                  Just the link (UX review O8): a meta block on every card was clutter. */}
              <ReportLink certId={cert.id} target={questionTarget(cert.id, q, 'Mistake journal', undefined, m.picked)} />
              {!m.resolved && (
                <>
                  <Gap h={space.md} />
                  {tagging.includes(id) ? (
                    <>
                      <Row gap={space.xs} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <T v="meta">Why did you slip?</T>
                        <Button kind="ghost" label="What do these mean?" accessibilityHint="Shows one example for each tag" onPress={() => setTagsOpen(true)} style={{ marginRight: -space.sm }} />
                      </Row>
                      {/* One group with a name, so a screen reader says which question the six tags are for. */}
                      <View
                        accessibilityRole="radiogroup"
                        accessibilityLabel={`Why you slipped on this question: ${q.stem.split(/\s+/).slice(0, 6).join(' ')}`}
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}
                      >
                        {SLIPS.map((s) => (
                          <Chip
                            key={s.id}
                            label={s.label}
                            accessibilityLabel={`Tag: ${s.label}`}
                            accessibilityHint={`For example: ${s.example}`}
                            selected={m.slip === s.id}
                            onPress={() => {
                              tagMistake(cert.id, id, s.id);
                              setTagging((t) => t.filter((x) => x !== id));
                            }}
                          />
                        ))}
                      </View>
                    </>
                  ) : m.slip ? (
                    <Row gap={space.xs} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      <T v="meta" color={c.ink} style={{ flexShrink: 1 }}>{`Why you slipped: ${SLIPS.find((x) => x.id === m.slip)?.label ?? ''}`}</T>
                      <Button kind="ghost" label="Change" accessibilityHint="Shows the tags again" onPress={() => setTagging((t) => [...t, id])} style={{ marginRight: -space.sm }} />
                    </Row>
                  ) : (
                    <Button
                      kind="ghost"
                      label="Tag why you slipped"
                      accessibilityHint="Shows the tags to pick from"
                      onPress={() => setTagging((t) => [...t, id])}
                      style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
                    />
                  )}
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
