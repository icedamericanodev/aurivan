/**
 * Study notes, one subtopic: the reading page.
 *
 * Header line (domain dot · topic) and the subtopic name, then (mobile 1.20)
 * a "Lesson: …" row when a lesson teaches this subtopic, then every v2
 * section in its fixed order (components/notes.tsx → NoteBody). At the end:
 *   - "Mark as read": a toggle saved on the phone (progress store,
 *     `notesRead`, keyed by subtopic id like "4B1.2");
 *   - "Practice this concept" (only when the note lists questions in
 *     `practiceIds`): exactly those questions, as a normal practice
 *     session, so answers count toward progress and spaced review. Starting
 *     it marks the note read (mobile 1.20); the toggle above is the undo;
 *   - "Next: …": the next subtopic in reading order, so a learner can
 *     keep going without stepping back to the list.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ICON_STROKE, Play } from '../../../components/icons';
import { CheckDraw } from '../../../components/motion';
import { NoteBody } from '../../../components/notes';
import { ReportRow } from '../../../components/support';
import { Button, Enter, Gap, ICON_SIZE, ListRow, PushedHeader, Screen, Tag, T } from '../../../components/ui';
import { EmptyScreen } from '../../../components/emptyScreen';
import { lessonsForSubtopic } from '../../../content/lessons';
import { findQuestion } from '../../../content/loader';
import { findNote, noteDomain, noteSubtopics } from '../../../content/notes';
import { createRng, shuffled } from '../../../engine/random';
import { openSessionFromStack } from '../../../lib/actions';
import { guardedStart, startFromIds } from '../../../lib/sessions';
import { useActiveCert } from '../../../lib/useActiveCert';
import { useProgress } from '../../../store/progress';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/notes'));

export default function NoteSubtopicScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? '');
  const { cert, progress } = useActiveCert();
  const { c } = useTheme();
  const setNoteRead = useProgress((s) => s.setNoteRead);
  // Marked as read on this visit: its ✓ draws (a note opened already read shows it still).
  const [justRead, setJustRead] = useState(false);
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

  // The lesson that teaches this subtopic (the first in course order), if any.
  const lesson = lessonsForSubtopic(cert.id, note.id)[0];
  const lessonDone = lesson ? progress.lessonsDone.includes(lesson.id) : false;

  // "Practice this concept": the questions this note lists, minus any a
  // content update removed. Empty → no button (most notes have some).
  const conceptIds = (note.practiceIds ?? []).filter((q) => findQuestion(cert.id, q));
  const n = conceptIds.length;
  const practiseConcept = () =>
    guardedStart(
      // Shuffled each time, so a repeat run does not replay the same order.
      () => startFromIds(cert.id, shuffled(conceptIds, createRng(Date.now())), note.name),
      () => {
        // Practising the concept means the note was read: mark it, once the
        // set really starts (not if "Keep it" cancels). The toggle undoes it.
        if (!isRead) setNoteRead(cert.id, note.id, true);
        // A note can sit above an old session or Results: start clean (lib/actions.ts).
        openSessionFromStack();
      },
    );

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={domain.short} onBack={goBack} />
      <Enter i={0}>
        <Tag domain={domain} label={topic ? `${topic.id} · ${topic.name}` : note.topicId} />
        <T v="hero" accessibilityRole="header" style={{ marginTop: space.sm }}>{note.name}</T>
        {lesson && (
          // Mobile 1.20: the lesson for this idea (Play = lessons). One row, no hairline.
          <View style={{ marginTop: space.sm }}>
            <ListRow
              icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
              // The lesson's own title on screen (no double colon); the spoken label keeps "Lesson:".
              title={lesson.title}
              subtitle={`Lesson · ${lesson.minutes} min · ${lessonDone ? 'Done' : 'Not done yet'}`}
              accessibilityLabel={`Lesson: ${lesson.title}, ${lesson.minutes} minutes, ${lessonDone ? 'done' : 'not done yet'}`}
              accessibilityHint="Opens the short lesson on this topic"
              onPress={() => router.push(`/lesson/${lesson.id}`)}
              last
            />
          </View>
        )}
        <Gap h={space.xl} />
      </Enter>

      <Enter i={1}>
        <NoteBody note={note} />
      </Enter>

      <Enter i={2} style={{ marginTop: space.section, gap: space.md }}>
        {/* A toggle: announced as "selected" once read; tap again to undo. */}
        {/* Marking it read draws the ✓ (motion.md M4: what changed); opening a note already read just shows it. */}
        <Button
          // The page's one primary action: practice when the note lists questions, else this.
          kind={n > 0 ? 'secondary' : 'primary'}
          label={isRead ? 'Marked as read' : 'Mark as read'}
          selected={isRead}
          accessibilityHint={isRead ? 'Marks this note as not read' : 'Saves that you have read this note'}
          icon={isRead ? (col) => <CheckDraw play={justRead} size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} /> : undefined}
          iconLeading
          onPress={() => {
            setJustRead(!isRead);
            setNoteRead(cert.id, note.id, !isRead);
          }}
        />
        {n > 0 && (
          // The helper line sits right under its button, so they read as one.
          <View style={{ gap: space.xs }}>
            <Button
              label="Practice this concept"
              accessibilityHint={`Starts a practice set on ${note.name} and marks this note as read`}
              onPress={practiseConcept}
            />
            <T v="meta" center>
              {`${n} ${n === 1 ? 'question that tests' : 'questions that test'} this concept. Answers count toward your progress.`}
            </T>
          </View>
        )}
        {next && (
          <Button
            kind="ghost"
            label={`Next: ${next.name}`}
            accessibilityHint="Opens the next note in this domain"
            onPress={() => router.replace(`/notes/subtopic/${encodeURIComponent(next.id)}`)}
          />
        )}
      </Enter>
      {/* Report a problem with this note (mobile 1.7). Notes carry no review date, so only the code is shown. */}
      <View style={{ marginTop: space.xl }}>
        <ReportRow
          certId={cert.id}
          meta={`Code ${note.id}`}
          target={{ kind: 'note', id: note.id, name: note.name, where: 'Study note' }}
        />
      </View>
    </Screen>
  );
}
