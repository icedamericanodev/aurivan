/**
 * Study notes, one subtopic: the reading page.
 *
 * Header line (domain dot · topic) and the subtopic name, then every v2
 * section in its fixed order (components/notes.tsx → NoteBody). At the end:
 *   - "Mark as read": a toggle saved on the phone (progress store,
 *     `notesRead`, keyed by subtopic id like "4B1.2");
 *   - "Practice this concept" (only when the note lists questions in
 *     `practiceIds`): exactly those questions, as a normal practice
 *     session, so answers count toward progress and spaced review;
 *   - "Practice this domain": 10 questions from this domain;
 *   - "Next: …": the next subtopic in reading order, so a learner can
 *     keep going without stepping back to the list.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Check, ICON_STROKE } from '../../../components/icons';
import { NoteBody } from '../../../components/notes';
import { Button, Enter, Gap, ICON_SIZE, PushedHeader, Screen, Tag, T } from '../../../components/ui';
import { EmptyScreen } from '../../../components/emptyScreen';
import { findQuestion } from '../../../content/loader';
import { findNote, noteDomain, noteSubtopics } from '../../../content/notes';
import { guardedStart, startFromIds, startPractice } from '../../../lib/sessions';
import { useActiveCert } from '../../../lib/useActiveCert';
import { useProgress } from '../../../store/progress';
import { space } from '../../../theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/notes'));

export default function NoteSubtopicScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? '');
  const { cert, progress } = useActiveCert();
  const setNoteRead = useProgress((s) => s.setNoteRead);
  const note = findNote(cert.id, id);
  const domain = note ? cert.domains.find((d) => d.id === note.domainId) : undefined;

  if (!note || !domain) {
    return (
      <EmptyScreen
        header="Study notes"
        title="Note not found"
        body="It may have moved in a content update."
        primary={{ label: 'All study notes', onPress: () => router.replace('/notes') }}
      />
    );
  }

  const topic = noteDomain(cert.id, domain.id)?.topics.find((t) => t.id === note.topicId);
  const isRead = progress.notesRead.includes(note.id);
  // The next subtopic in this domain's reading order (none after the last).
  const inDomain = noteSubtopics(cert.id, domain.id);
  const next = inDomain[inDomain.findIndex((s) => s.id === note.id) + 1];

  const practise = () =>
    guardedStart(
      () => startPractice(cert.id, { count: 10, domainId: domain.id, title: `${domain.short} practice` }),
      () => router.push('/session'),
    );

  // "Practice this concept": the questions this note lists, minus any a
  // content update removed. Empty → no button (most notes have some).
  const conceptIds = (note.practiceIds ?? []).filter((q) => findQuestion(cert.id, q));
  const n = conceptIds.length;
  const practiseConcept = () =>
    guardedStart(() => startFromIds(cert.id, conceptIds, note.name), () => router.push('/session'));

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={domain.short} onBack={goBack} />
      <Enter i={0}>
        <Tag domain={domain} label={topic ? `${topic.id} · ${topic.name}` : note.topicId} />
        <T v="hero" accessibilityRole="header" style={{ marginTop: space.sm }}>{note.name}</T>
        <Gap h={space.xl} />
      </Enter>

      <Enter i={1}>
        <NoteBody note={note} />
      </Enter>

      <Enter i={2} style={{ marginTop: space.section, gap: space.md }}>
        {/* A toggle: announced as "selected" once read; tap again to undo. */}
        <Button
          kind="secondary"
          label={isRead ? 'Marked as read' : 'Mark as read'}
          selected={isRead}
          accessibilityHint={isRead ? 'Marks this note as not read' : 'Saves that you have read this note'}
          icon={isRead ? (col) => <Check size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} /> : undefined}
          iconLeading
          onPress={() => setNoteRead(cert.id, note.id, !isRead)}
        />
        {n > 0 && (
          // The helper line sits right under its button, so they read as one.
          <View style={{ gap: space.xs }}>
            <Button
              label="Practice this concept"
              accessibilityHint={`Starts ${n} ${n === 1 ? 'question' : 'questions'} on ${note.name}`}
              onPress={practiseConcept}
            />
            <T v="meta" style={{ textAlign: 'center' }}>
              {`${n} ${n === 1 ? 'question that tests' : 'questions that test'} this idea. Answers count toward your progress.`}
            </T>
          </View>
        )}
        {/* One primary action per screen: the domain set steps back when
            the concept set is there. */}
        <Button
          kind={n > 0 ? 'secondary' : 'primary'}
          label="Practice this domain"
          accessibilityHint={`Starts 10 questions from ${domain.name}`}
          onPress={practise}
        />
        {next && (
          <Button
            kind="ghost"
            label={`Next: ${next.name}`}
            accessibilityHint="Opens the next note in this domain"
            onPress={() => router.replace(`/notes/subtopic/${encodeURIComponent(next.id)}`)}
          />
        )}
      </Enter>
    </Screen>
  );
}
