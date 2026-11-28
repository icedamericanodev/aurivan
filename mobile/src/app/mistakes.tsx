/**
 * Mistake Journal with "Your mistake patterns" (code name Mistake DNA): reflect on recent saved misses, then
 * follow an existing principle, note, drill or independent practice set.
 * Analytics and thresholds live in engine/mistakeDNA.ts; no diagnostic
 * result is persisted. Stable slip ids, tagging/focus announcements,
 * fixed/open filtering, original-letter picks and review controls remain.
 * A virtualised list keeps a large journal usable. Even an empty or fully
 * corrected journal retains its honest evidence summary and next actions.
 */
import { router } from 'expo-router';
import { backOr } from '../lib/actions';
import { moveFocus, sayLater } from '../lib/a11y';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MistakeDNASummary } from '../components/mistakeDNA';
import { StickyFooter } from '../components/quiz';
import { BookOpen, Compass, ICON_STROKE } from '../components/icons';
import { ReportLink } from '../components/support';
import { useMotion } from '../components/motion';
import { Button, Chip, EmptyState, Gap, ICON_SIZE, PushedHeader, Row, Section, T } from '../components/ui';
import { findQuestion, getAllQuestions, isHeldBackOut } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { principleForSlip } from '../content/principles';
import { shortDate } from '../lib/format';
import { mistakePatternsFor } from '../lib/slipPattern';
import { guardedStart, startFromIds, startPractice } from '../lib/sessions';
import { questionTarget } from '../lib/support';
import { useActiveCert } from '../lib/useActiveCert';
import { GAMES } from '../engine/games/registry';
import { canPlay } from '../lib/games';
import { useAvailableGames } from '../components/drills';
import { patternCopy } from '../engine/slipCoach';
import { qualifierCopy } from '../engine/games/priorityLens';
import { getCertification } from '../content/certifications';
import type { QualifierCase } from '../content/types';
import { useProgress, type MistakeEntry, type ThinkingSlip } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ContentColumn } from '../components/layout';

/** The tags, each with one example (the chip's spoken hint and the "What do these mean?" sheet). */
export const SLIPS: { id: ThinkingSlip; label: string; example: string }[] = [
  { id: 'role', label: 'Acted as the wrong person', example: 'You fixed it yourself, when the auditor’s job is to report it.' },
  { id: 'priority', label: 'Missed FIRST or BEST', example: 'You picked a good step, but not the first one.' },
  { id: 'tech-first', label: 'Tool before policy', example: 'You picked a new tool before anyone agreed who owns the risk.' },
  { id: 'symptom', label: 'Fixed the symptom, not the cause', example: 'You restored the lost file but not the reason it was lost.' },
  { id: 'misread', label: 'Misread', example: 'You knew it, but missed a word in the question.' },
  { id: 'knowledge', label: 'Didn’t know it', example: 'The topic was new to you.' },
];
/** The tags for a lowercase course: "Missed “first” or “best”", as its questions write the words. */
const SLIPS_LOWER = SLIPS.map((x) => (x.id === 'priority' ? { ...x, label: qualifierCopy(x.label, 'lowercase', true) } : x));
/** The tags in the course's style (`qc`: its QualifierCase); capitals (CISA) = SLIPS, word for word. */
export const slipsFor = (qc?: QualifierCase) => (qc === 'lowercase' ? SLIPS_LOWER : SLIPS);
/** One practice set takes at most this many open mistakes. */
const SET_MAX = 20;

/** "Practice 20 of 55" when one set takes part of them, "Practice all 12" when it takes them all. */
export function practiceOpenLabel(open: number): { label: string; spoken: string } {
  if (open > SET_MAX) return { label: `Practice ${SET_MAX} of ${open}`, spoken: `Practice ${SET_MAX} of your ${open} open mistakes, ${SET_MAX} at a time` };
  if (open === 1) return { label: 'Practice this one', spoken: 'Practice your 1 open mistake' };
  return { label: `Practice all ${open}`, spoken: `Practice all ${open} open mistakes` };
}

/** The tags explained: one example each (a page sheet; a fade under Reduce Motion). */
function SlipTagsSheet({ visible, onClose, slips }: { visible: boolean; onClose: () => void; slips: typeof SLIPS }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  return (
    <Modal visible={visible} animationType={reduced ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.raised2 }}>
        <ContentColumn>
          <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxxl }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="hero" accessibilityRole="header" style={{ flex: 1 }}>What the tags mean</T>
              <Button kind="ghost" label="Close" onPress={onClose} accessibilityLabel="Close what the tags mean" />
            </Row>
            <T v="meta" style={{ marginTop: space.xs }}>Pick the one that fits best. Your pattern shows after a few.</T>
            {slips.map((x, i) => (
              <View
                key={x.id}
                accessible
                accessibilityLabel={`${x.label}. For example: ${x.example}`}
                style={{ paddingVertical: space.md, borderBottomWidth: i === slips.length - 1 ? 0 : 1, borderBottomColor: c.line }}
              >
                <T v="label">{x.label}</T>
                <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{x.example}</T>
              </View>
            ))}
          </ScrollView>
        </ContentColumn>
      </SafeAreaView>
    </Modal>
  );
}

const keyOf = ([id]: [string, MistakeEntry]) => id;

/**
 * One mistake (release bug hunt round 1: memoised). It gets plain values and stable callbacks,
 * so tapping "Tag why you slipped" or a tag redraws only this card. tagMistake swaps only the
 * tagged mistake's object, so every other card keeps its `m` and is skipped.
 */
const MistakeCard = memo(function MistakeCard({
  id,
  m,
  certId,
  isTagging,
  onToggleTag,
  onPickTag,
  onOpenTags,
}: {
  id: string;
  m: MistakeEntry;
  certId: string;
  isTagging: boolean;
  onToggleTag: (id: string) => void;
  onPickTag: (id: string, slip: ThinkingSlip) => void;
  onOpenTags: () => void;
}) {
  const { c } = useTheme();
  const q = useMemo(() => findQuestion(certId, id), [certId, id]);
  // The tags in the course's style (a constant list per style, so nothing is rebuilt per card).
  const slips = slipsFor(getCertification(certId)?.qualifierCase);
  // The study note remains available after the mistake is fixed, too.
  const note = useMemo(() => {
    const noteId = subtopicOfQuestion(certId, id);
    return noteId ? findNote(certId, noteId) : undefined;
  }, [certId, id]);
  const target = useMemo(() => (q ? questionTarget(certId, q, 'Mistake journal', undefined, m.picked) : null), [certId, q, m.picked]);
  // Release bug hunt round 3 (TalkBack): every press here removes the button that has focus (the tag
  // button, Change, a tag chip). So focus moves to what replaced it: the tags when they open, the
  // "Why you slipped" line once a tag is picked. Never on the first draw (the screen just opened).
  const groupRef = useRef<View>(null);
  const slipRef = useRef<View>(null);
  const wasTagging = useRef(isTagging);
  useEffect(() => {
    if (isTagging && !wasTagging.current) moveFocus(groupRef, 150);
    else if (!isTagging && wasTagging.current && m.slip) moveFocus(slipRef, 150);
    wasTagging.current = isTagging;
  }, [isTagging, m.slip]);
  if (!q || !target) return null;
  return (
    <View style={{ paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <T v="caption" num>{`${m.resolved ? 'Fixed · ' : ''}${shortDate(m.at)}`}</T>
      <Gap h={space.xs} />
      <T v="body">{q.stem}</T>
      <Gap h={space.md} />
      {m.picked && (
        <>
          <T v="caption" color={c.wrong}>Your pick</T>
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
      <ReportLink certId={certId} target={target} />
      {!m.resolved && (
        <>
          <Gap h={space.md} />
          {isTagging ? (
            <>
              <Row gap={space.xs} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <T v="meta">Why did you slip?</T>
                <Button kind="ghost" label="What do these mean?" accessibilityHint="Shows one example for each tag" onPress={onOpenTags} style={{ marginRight: -space.sm }} />
              </Row>
              {/* One group with a name, so a screen reader says which question the six tags are for. */}
              <View
                ref={groupRef}
                accessibilityRole="radiogroup"
                accessibilityLabel={`Why you slipped on this question: ${q.stem.split(/\s+/).slice(0, 6).join(' ')}`}
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}
              >
                {slips.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.label}
                    accessibilityLabel={`Tag: ${s.label}`}
                    accessibilityHint={`For example: ${s.example}`}
                    selected={m.slip === s.id}
                    onPress={() => onPickTag(id, s.id)}
                  />
                ))}
              </View>
            </>
          ) : m.slip ? (
            <Row gap={space.xs} style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <View ref={slipRef} accessible style={{ flexShrink: 1 }}>
                <T v="meta" color={c.ink}>{`Why you slipped: ${slips.find((x) => x.id === m.slip)?.label ?? ''}`}</T>
              </View>
              <Button kind="ghost" label="Change" accessibilityHint="Shows the tags again" onPress={() => onToggleTag(id)} style={{ marginRight: -space.sm }} />
            </Row>
          ) : (
            <Button
              kind="ghost"
              label="Tag why you slipped"
              accessibilityHint="Shows the tags to pick from"
              onPress={() => onToggleTag(id)}
              style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
            />
          )}
        </>
      )}
    </View>
  );
});

export default function Mistakes() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const certId = cert.id;
  // The drills open for this learner now (the same rule as Practice > Drills).
  const offered = useAvailableGames(certId);
  const tagMistake = useProgress((s) => s.tagMistake);
  // QA (2.2): "Show fixed" belongs to the exam it was turned on for, so switching exams starts closed.
  const [fixedFor, setFixedFor] = useState<string | null>(null);
  const showFixed = fixedFor === certId;
  const setShowFixed = (on: boolean) => setFixedFor(on ? certId : null);
  const [footerH, setFooterH] = useState(120);
  const [tagsOpen, setTagsOpen] = useState(false);
  // The mistakes whose six tag chips are open (tapped "Tag why you slipped" / "Change").
  const [tagging, setTagging] = useState<string[]>([]);
  const openSession = () => router.push('/session');

  // QA (2.2): only mistakes whose question is still in the pack are shown, so only those are counted
  // ("N open", the footer, "Show N fixed"); a retired id used to count with no card to show for it.
  // A held-back full exam question is left out too until its form is taken (content/loader.ts isHeldBackOut;
  // always false for CISA), so a count never names a mistake that cannot be practised yet.
  const heldBackTaken = progress.heldBackTaken;
  const known = useMemo(
    () => Object.entries(progress.mistakes).filter(([id]) => !!findQuestion(certId, id) && !isHeldBackOut(certId, id)),
    // heldBackTaken: taking the form brings its mistakes back (CISA: always undefined).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [certId, progress.mistakes, heldBackTaken],
  );
  const entries = useMemo(
    () => known.filter(([, m]) => showFixed || !m.resolved).sort(([, a], [, b]) => b.at - a.at),
    [known, showFixed],
  );
  const open = known.filter(([, m]) => !m.resolved);
  const fixedCount = known.length - open.length;
  // Saved mistakes already contain one latest miss per stable question id.
  // The clock is read inside the memo (2.2 reviews): Date.now() in render broke the memo, so each tag tap
  // re-analysed every saved mistake; a clock frozen at mount would leave out misses made in a practice
  // session opened from here (the journal stays mounted underneath). Now it moves exactly when the
  // saved mistakes change. Elsewhere the window's own ends (dna.from, dna.to) are the time.
  // The same summary Play and the final review week use (lib/slipPattern.ts), so they never disagree.
  // eslint-disable-next-line react-hooks/purity -- the window's clock, refreshed with the saved mistakes
  const dna = useMemo(() => mistakePatternsFor(certId, progress.mistakes, Date.now()), [certId, progress.mistakes]);
  // The tags and the pattern's copy in the course's style ("first" for a lowercase course; CISA unchanged).
  const slips = slipsFor(cert.qualifierCase);
  const pattern = dna.top ? { ready: true as const, pattern: dna.top.pattern, ...patternCopy(dna.top.pattern, cert.qualifierCase) } : { ready: false as const };
  // The principle that coaches this pattern (none for a content gap, or a cert without principles).
  const patternPrinciple = pattern.ready ? principleForSlip(cert.id, pattern.pattern) : undefined;

  const freshIds = useMemo(() => getAllQuestions(certId).filter((q) => !progress.mistakes[q.id]).map((q) => q.id), [certId, progress.mistakes]);
  const patternNote = useMemo(() => {
    if (dna.top?.pattern !== 'knowledge') return undefined;
    const supporting = Object.entries(progress.mistakes).filter(([, m]) => m.slip === 'knowledge' && m.at >= dna.from && m.at <= dna.to).sort((a, b) => b[1].at - a[1].at || a[0].localeCompare(b[0]));
    for (const [id] of supporting) {
      const noteId = subtopicOfQuestion(certId, id);
      const note = noteId ? findNote(certId, noteId) : undefined;
      if (note) return note;
    }
    return undefined;
  }, [certId, dna.top?.pattern, dna.from, dna.to, progress.mistakes]);

  // Stable callbacks, so a memoised card redraws only when its own values change.
  const onToggleTag = useCallback((id: string) => setTagging((t) => [...t, id]), []);
  const onPickTag = useCallback(
    (id: string, slip: ThinkingSlip) => {
      tagMistake(certId, id, slip);
      setTagging((t) => t.filter((x) => x !== id));
      // The chip just pressed goes away: say the saved choice (TalkBack, release bug hunt round 3).
      const label = slips.find((x) => x.id === slip)?.label;
      if (label) sayLater(`Tagged: ${label}`);
    },
    [certId, tagMistake, slips],
  );
  const onOpenTags = useCallback(() => setTagsOpen(true), []);
  const renderItem = useCallback(
    ({ item: [id, m] }: { item: [string, MistakeEntry] }) => (
      <MistakeCard id={id} m={m} certId={certId} isTagging={tagging.includes(id)} onToggleTag={onToggleTag} onPickTag={onPickTag} onOpenTags={onOpenTags} />
    ),
    [certId, tagging, onToggleTag, onPickTag, onOpenTags],
  );

  const header = (
    <View>
      <PushedHeader title="Mistake journal" onBack={() => backOr('/you')} />

      {known.length > 0 && <MistakeDNASummary dna={dna} qualifierCase={cert.qualifierCase} />}
      {pattern.ready && (
        // Keep remediation beside the summary, using existing content and access rules.
        // UX review (2.2): no extra "What to do next" heading; the actions follow the cue directly.
        <View style={{ marginTop: space.sm }}>
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
          {patternNote && <Button kind="ghost" label="Read a related study note" accessibilityLabel={`Read a related study note: ${patternNote.name}`} onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(patternNote.id)}`)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />}
          <Gap h={space.md} />
          {/* "Drill it" only when that game can be played for this exam (registry minPool) AND Drills has it open
              for this learner (release bug hunt round 2: the 50-answer unlock). Otherwise review the mistakes. */}
          {pattern.game && canPlay(cert.id, pattern.game) && offered.includes(pattern.game) ? (
            <Button
              kind="secondary"
              label={`Drill it: ${GAMES[pattern.game].name}`}
              accessibilityHint="Opens the mini-game that trains this slip"
              onPress={() => router.push(`/game/${pattern.game}`)}
            />
          ) : (
            open.length > 0 && <Button
              kind="secondary" label="Review these mistakes"
              onPress={() => guardedStart(() => startFromIds(cert.id, open.slice(0, 20).map(([id]) => id), 'Mistake journal'), openSession)}
            />
          )}
          {freshIds.length > 0 ? <Button kind="ghost" label="Practice other questions" accessibilityHint="Uses questions outside your mistake history to revisit your reasoning" onPress={() => guardedStart(() => startPractice(certId, { count: 10, ids: freshIds, title: 'Fresh practice' }), openSession)} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }} /> : <Button kind="ghost" label="Choose a practice activity" onPress={() => router.push('/practice')} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }} />}
        </View>
      )}

      {entries.length > 0 && <Section title={showFixed ? 'All mistakes' : `${open.length} open`} />}
      {fixedCount > 0 && entries.length > 0 && (
        <View style={{ alignSelf: 'flex-start', marginTop: space.sm }}>
          <Chip label={showFixed ? 'Hide fixed' : `Show ${fixedCount} fixed`} selected={showFixed} onPress={() => setShowFixed(!showFixed)} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Release bug hunt round 1: a FlatList draws only the cards near the screen (a large save had
          hundreds open, about 13,800 components at once), and each card is memoised, so a tag tap
          redraws only its own card. */}
      <FlatList
        data={entries}
        keyExtractor={keyOf}
        renderItem={renderItem}
        extraData={tagging}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ paddingVertical: space.lg }}>
            <EmptyState art="pressed" title="Nothing open right now" body="Every question you miss lands here, tagged by the trap that caught you." next={fixedCount > 0 ? `${fixedCount} ${fixedCount === 1 ? 'mistake' : 'mistakes'} cleared so far` : undefined} />
            <Button kind="secondary" label="Practice 10 questions" onPress={() => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), openSession)} style={{ marginTop: space.md }} />
            {fixedCount > 0 && <Button kind="ghost" label="See cleared mistakes" onPress={() => setShowFixed(true)} />}
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}
        initialNumToRender={8}
        windowSize={5}
      />
      {open.length > 0 && (
        <StickyFooter onHeight={setFooterH}>
          <Button
            label={practiceOpenLabel(open.length).label}
            accessibilityLabel={practiceOpenLabel(open.length).spoken}
            onPress={() => guardedStart(() => startFromIds(cert.id, open.slice(0, SET_MAX).map(([id]) => id), 'Mistake journal'), openSession)}
          />
        </StickyFooter>
      )}
      <SlipTagsSheet visible={tagsOpen} onClose={() => setTagsOpen(false)} slips={slips} />
    </SafeAreaView>
  );
}
