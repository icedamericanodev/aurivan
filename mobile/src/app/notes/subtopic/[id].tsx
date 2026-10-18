/**
 * Study notes, one subtopic: the reading page.
 *
 * Mobile 1.22 (design spec §3, UI_premium S2):
 * - Header: the back chevron alone; the note's name cross-fades into it only
 *   once the page's own title has scrolled under the bar (at once under
 *   Reduce Motion; never read by screen readers, it repeats the hero). The
 *   tag above the title reads "IS Operations · 4B1 Business Impact
 *   Analysis" on one line (it wraps at large text), so the page has two
 *   levels of wayfinding, not three.
 * - Under the title: "About 3 min read" (the note's own `minutes`), plus
 *   "· Read ✓" once read. Then the lesson for this idea (mobile 1.20), its
 *   status in a kicker ("Lesson · 5 min · Not done yet"), hairlines above
 *   and below. Then every v2 section (components/notes.tsx → NoteBody).
 * - ONE ending: the primary "Practice this concept" (only when the note
 *   lists questions in `practiceIds`, which count toward progress and spaced
 *   review; starting it marks the note read), then a quiet "Next note" row,
 *   then the source row: "Code 4B1.2 · Mark as not read" and "Report a
 *   problem". Reaching the end of the page marks the note read (once per
 *   visit, only after the learner's own drag); the source row's toggle is
 *   the undo. Both are announced to screen readers.
 *
 * Mobile 1.25 ("fill the circle", engine/noteReadState.ts):
 * - After 10 seconds open on screen with the app in front, the note is
 *   STARTED (saved in notesViewed; its row shows a half-filled circle). The
 *   time adds up across visits in the same app session (lib/useNoteDwell.ts).
 * - Reaching the end marks it read only once the note has been open for 20
 *   seconds on this visit, so a quick flick to the bottom does not count.
 *   "Mark as read" and "Practice this concept" are not held back. A jump
 *   link that lands at the end is not the learner's own drag: it never counts.
 * - Each time it becomes read here, its list row (and its domain row, when
 *   this was the domain's last note) fills its circle once, the next time
 *   that row is on screen (lib/noteNews.ts, in memory only).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ICON_STROKE, Play } from '../../../components/icons';
import { CheckDraw, useScreenFocus } from '../../../components/motion';
import { NoteBody } from '../../../components/notes';
import { ReportRow } from '../../../components/support';
import { Button, Enter, Gap, ICON_SIZE, ListRow, PushedHeader, Row, Screen, Tag, T, useFontScale } from '../../../components/ui';
import { EmptyScreen } from '../../../components/emptyScreen';
import { lessonsForSubtopic } from '../../../content/lessons';
import { findQuestion } from '../../../content/loader';
import { findNote, noteDomain, noteSubtopics } from '../../../content/notes';
import { aboutMin, spokenMin } from '../../../engine/pace';
import { createRng, shuffled } from '../../../engine/random';
import { openSessionFromStack } from '../../../lib/actions';
import { guardedStart, startFromIds } from '../../../lib/sessions';
import { sayLater } from '../../../lib/a11y';
import { forgetJustRead, noteJustRead, readMarkKey } from '../../../lib/noteNews';
import { useNoteDwell } from '../../../lib/useNoteDwell';
import { canAutoRead, groupReadState, READ_FILL, noteReadState } from '../../../engine/noteReadState';
import { useActiveCert } from '../../../lib/useActiveCert';
import { useProgress } from '../../../store/progress';
import { LARGE_TEXT, space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

/** The header title's hysteresis (pt): it shows past the line, and hides only 8pt back above it. */
const HYSTERESIS = 8;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/notes'));

export default function NoteSubtopicScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? '');
  const { cert, progress } = useActiveCert();
  const { c } = useTheme();
  const setNoteRead = useProgress((s) => s.setNoteRead);
  const markNoteViewed = useProgress((s) => s.markNoteViewed);
  // Marked as read on this visit: its ✓ draws (a note opened already read shows it still).
  const [justRead, setJustRead] = useState(false);
  // Title collapse: the hero title has scrolled under the header.
  const [titleUnder, setTitleUnder] = useState(false);
  // Where the hero title ends and where the page's ending starts, in the scroll.
  const titleBottom = useRef(0);
  const endTop = useRef(0);
  // The page marks itself read at most once per visit (so "Mark as not read" sticks).
  const autoRead = useRef(false);
  // The learner has dragged the page themselves (auto-read waits for this).
  const dragged = useRef(false);
  const fontScale = useFontScale();
  const note = findNote(cert.id, id);
  const domain = note ? cert.domains.find((d) => d.id === note.domainId) : undefined;
  // Mobile 1.25: time open on screen (paused out of view or in the background).
  // 10 s marks the note started; the auto-read below waits for 20 s.
  const focused = useScreenFocus();
  const openMs = useNoteDwell(id, focused && Boolean(note), () => markNoteViewed(cert.id, id));

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
  const minutes = note.minutes ?? 2;
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
  // Mobile 1.25: tell the list rows this note just became read (or not), so
  // its circle fills once when the learner sees it. The domain row fills too
  // when this was the last unread note of the domain.
  const tellRows = (read: boolean) => {
    const noteKey = readMarkKey(cert.id, 'note', note.id);
    const domainKey = readMarkKey(cert.id, 'domain', domain.id);
    if (!read) {
      forgetJustRead(noteKey);
      forgetJustRead(domainKey);
      return;
    }
    noteJustRead(noteKey, READ_FILL[noteReadState(note.id, progress.notesRead, progress.notesViewed)]);
    const others = inDomain.filter((s) => s.id !== note.id);
    // From the domain's real state before this note (half, or empty for a one-note domain never started).
    const before = groupReadState(inDomain.map((s) => s.id), progress.notesRead, progress.notesViewed);
    if (others.every((s) => progress.notesRead.includes(s.id))) noteJustRead(domainKey, READ_FILL[before]);
  };
  // `say`: what a screen reader hears (mobile 1.22 review H1): the change is never silent.
  const markRead = (read: boolean, say = read ? 'Marked as read' : 'Marked as not read') => {
    setJustRead(read);
    if (read !== isRead) tellRows(read);
    setNoteRead(cert.id, note.id, read);
    sayLater(say);
  };
  const practiseConcept = () =>
    guardedStart(
      // Shuffled each time, so a repeat run does not replay the same order.
      () => startFromIds(cert.id, shuffled(conceptIds, createRng(Date.now())), note.name),
      () => {
        // Practising the concept means the note was read: mark it, once the
        // set really starts (not if "Keep it" cancels). The source row undoes it.
        if (!isRead) {
          tellRows(true);
          setNoteRead(cert.id, note.id, true);
        }
        // A note can sit above an old session or Results: start clean (lib/actions.ts).
        openSessionFromStack();
      },
    );
  const onScroll = (y: number, height: number) => {
    // 8pt of hysteresis, so a scroll that rests on the line never flickers the title.
    const edge = titleBottom.current;
    const under = edge > 0 && (titleUnder ? y > edge - HYSTERESIS : y > edge);
    if (under !== titleUnder) setTitleUnder(under);
    // Reaching the ending reads the note as read, once, and only after the learner's own drag (a
    // jump link or an iOS bounce on a short note never marks it). Mobile 1.25: and only once the
    // note has been open for 20 s (a quick flick to the bottom does not count; a later scroll
    // at the end, after 20 s, still does).
    if (!autoRead.current && dragged.current && endTop.current > 0 && y + height >= endTop.current && canAutoRead(openMs())) {
      autoRead.current = true;
      if (!isRead) markRead(true, 'Note marked as read. Mark as not read is at the end of the note.');
    }
  };
  const readLine = `${aboutMin(minutes)} read`;
  const large = fontScale >= LARGE_TEXT;

  return (
    <Screen
      edges={['top', 'bottom']}
      onScroll={onScroll}
      onScrollBeginDrag={() => (dragged.current = true)}
      // A jump link ("On this page") scrolls for the learner: it never counts as their own drag,
      // so landing at the end that way never marks the note read (only a later drag of theirs).
      onJump={() => (dragged.current = false)}
      header={<PushedHeader title={note.name} showTitle={titleUnder} onBack={goBack} />}
    >
      <Enter i={0}>
        {/* The tag and the title: the header's title appears once this has scrolled under it. */}
        <View onLayout={(e) => (titleBottom.current = space.lg + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <Tag domain={domain} numberOfLines={large ? undefined : 1} label={topic ? `${domain.short} · ${topic.id} ${topic.name}` : `${domain.short} · ${note.topicId}`} />
          <T v="hero" accessibilityRole="header" style={{ marginTop: space.sm }}>{note.name}</T>
        </View>
        <View accessible accessibilityLabel={`${spokenMin(aboutMin(minutes))} to read${isRead ? '. Marked as read' : ''}`} style={{ marginTop: space.xs }}>
          <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
            <T v="meta">{readLine}</T>
            {isRead && (
              <>
                <T v="meta">·</T>
                <T v="meta" color={c.accentText}>Read</T>
                {/* Marking it read draws the ✓ (motion.md M4: what changed); a note opened already read just shows it. */}
                <CheckDraw play={justRead} size={14} color={c.accentText} strokeWidth={2.25} />
              </>
            )}
          </Row>
        </View>
        {lesson ? (
          // Mobile 1.20: the lesson for this idea (Play = lessons). 1.22: its status in a kicker over its own title.
          <View style={{ marginTop: space.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
            <ListRow
              icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
              kicker={`Lesson · ${lesson.minutes} min · ${lessonDone ? 'Done' : 'Not done yet'}`}
              title={lesson.title}
              accessibilityLabel={`Lesson: ${lesson.title}, ${lesson.minutes} minutes, ${lessonDone ? 'done' : 'not done yet'}`}
              accessibilityHint="Opens the short lesson on this topic"
              onPress={() => router.push(`/lesson/${lesson.id}`)}
              last
            />
          </View>
        ) : (
          <Gap h={space.md} />
        )}
      </Enter>

      <Enter i={1}>
        <NoteBody note={note} />
      </Enter>

      {/* The ending: one primary, one quiet row, the source row (design spec §3.9). */}
      <View onLayout={(e) => (endTop.current = e.nativeEvent.layout.y)} style={{ marginTop: space.xxl }}>
        {n > 0 && (
          // The helper line sits right under its button, so they read as one.
          <View style={{ gap: space.xs }}>
            <Button
              label="Practice this concept"
              accessibilityHint={`Starts a practice set on ${note.name} and marks this note as read`}
              onPress={practiseConcept}
            />
            <T v="meta" center>
              {`${n} ${n === 1 ? 'question' : 'questions'} on this idea. Your answers count toward your progress.`}
            </T>
          </View>
        )}
        {next && (
          <View style={{ marginTop: n > 0 ? space.xl : 0 }}>
            <ListRow
              kicker="Next note"
              title={next.name}
              accessibilityLabel={`Next note: ${next.name}`}
              accessibilityHint="Opens the next note in this domain"
              onPress={() => router.replace(`/notes/subtopic/${encodeURIComponent(next.id)}`)}
              last
            />
          </View>
        )}
        {/* Report a problem with this note (mobile 1.7), and the read toggle (1.22). Notes carry no review date. */}
        <View style={{ marginTop: next ? space.xs : space.xl }}>
          <ReportRow
            certId={cert.id}
            meta={`Code ${note.id}`}
            action={{
              label: isRead ? 'Mark as not read' : 'Mark as read',
              hint: isRead ? 'Your study notes will show this note as not read' : 'Saves that you have read this note',
              onPress: () => markRead(!isRead),
            }}
            target={{ kind: 'note', id: note.id, name: note.name, where: 'Study note' }}
          />
        </View>
      </View>
    </Screen>
  );
}
