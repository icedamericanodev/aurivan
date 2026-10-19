/**
 * "Your note" on a question: the learner's own words, written AFTER the
 * answer is checked (design spec phone-note-gloss §5.2).
 *
 * Plain English:
 * - No note yet: a quiet "Add a note" text button (pencil, left at the gutter).
 * - A saved note: a quiet plate in the same place, "Your note" + "Edit", then
 *   the note in full. It is shown every time the question's answer shows
 *   (practice, review, Mistakes, Saved, the mock review on Results).
 * - Tapping either opens a bottom sheet with one multi-line field. It saves
 *   as you type (600 ms after typing stops, like the web) and again on EVERY
 *   way out: Done, a tap on the dim, Android Back, VoiceOver's escape.
 * - Deleting a saved note always asks first: "Delete note", or closing the
 *   sheet with the field emptied (UX review). Typing never deletes: an empty
 *   field is not autosaved, so nothing is lost before the learner confirms.
 * - All notes in one exam together are capped (engine NOTES_TOTAL_MAX); a
 *   change past it is not saved, and the sheet says so.
 * - Screens decide WHERE it may show: never before the answer is checked and
 *   never during a live mock (session.tsx only renders it on a checked
 *   practice / review answer; results.tsx in the review list).
 * - Privacy: the note lives only in the progress store (and the learner's
 *   own backup file). It is never put in a report email, a share card or
 *   analytics (the question-notes-privacy test keeps it that way).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, type TextInput, View } from 'react-native';
import { moveFocus, sayLater } from '../lib/a11y';
import { useKeyboardShown } from '../lib/useKeyboardShown';
import { CLOUD } from '../cloud/flag';
import { NOTES_FULL_LINE, QNOTE_MAX, isLiveNote, noteFits } from '../engine/questionNotes';
import { useProgress } from '../store/progress';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, PencilLine } from './icons';
import { Rise } from './quiz';
import { Sheet } from './settings';
import { Button, Card, ICON_SIZE, NoteField, Row, T, useFontScale } from './ui';

/** The words on screen, in one place so tests and screens agree. */
export const ADD_NOTE = 'Add a note';
export const NOTE_TITLE = 'Your note';
/** Said once, in the sheet: where the note is kept (the PM's privacy line). */
export const NOTE_INTRO = 'Kept on this phone and in backups you save. It shows here each time you answer this question.';
/**
 * The same, in builds that can sync to an account (cloud builds only): the note goes there too
 * while sync is on. Chosen by build, not by reading the sync store: that store pulls the sync
 * engine into the answer screen's imports, which the plant-free-screen guard forbids.
 */
export const NOTE_INTRO_SYNC = 'Kept on this phone, in backups you save, and in your account if sync is on. It shows here each time you answer this question.';
/** The web's wording: it asks for self-explanation, which helps memory more than copying. */
export const NOTE_PLACEHOLDER = 'Why is the best answer best? Say it in your own words.';
/** Save this long after typing stops (the web's railNoteInput uses 600 ms too). */
export const NOTE_SAVE_MS = 600;
/** The "800 / 1000" counter shows only near the limit. */
export const NOTE_COUNTER_FROM = 800;

export function QuestionNote({ certId, questionId }: { certId: string; questionId: string }) {
  const { c } = useTheme();
  // The saved note (a tombstone or nothing reads as no note).
  const saved = useProgress((s) => s.byCert[certId]?.qNotes?.[questionId]);
  const text = isLiveNote(saved) ? saved.text.trim() : '';
  // True while the typed text can't be saved because all notes together are at the cap.
  const [full, setFull] = useState(false);

  const [open, setOpen] = useState(false);
  // What is in the field. The ref copy is read on close and on unmount (never stale).
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  // Was there a note when the sheet opened? Decides "Note saved." / "Note deleted." and the Delete button.
  const [hadNote, setHadNote] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plateRef = useRef<View>(null);
  const addRef = useRef<View>(null);
  const fieldRef = useRef<TextInput>(null);
  // At ×1.3 text and above, the intro line hides while the keyboard is up, so the field keeps room.
  const keyboard = useKeyboardShown();
  const large = useFontScale() >= LARGE_TEXT;

  /** Write the text to the store now (empty = delete). The store skips a save when nothing changed. */
  const commit = useCallback(
    (value: string) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const st = useProgress.getState();
      const fits = noteFits(st.byCert[certId]?.qNotes, questionId, value);
      setFull(!fits);
      if (fits) st.setQuestionNote(certId, questionId, value);
    },
    [certId, questionId],
  );

  // If this block goes away with a save still waiting, save it now (never a deletion: that asks first).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        if (draftRef.current.trim() !== '') useProgress.getState().setQuestionNote(certId, questionId, draftRef.current);
      }
    },
    [certId, questionId],
  );

  // Sighted learners get the keyboard at once (one tap to type). With a screen
  // reader on, focus stays on the sheet's title and the field comes next.
  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(() => {
      AccessibilityInfo.isScreenReaderEnabled()
        .then((on) => {
          if (live && !on) fieldRef.current?.focus();
        })
        .catch(() => {});
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open]);

  // Said once when the limit is reached (the line under the field is a polite live region on Android too).
  useEffect(() => {
    if (full) sayLater(NOTES_FULL_LINE);
  }, [full]);

  const openSheet = () => {
    draftRef.current = text;
    setDraft(text);
    setHadNote(text !== '');
    setFull(false);
    setOpen(true);
  };

  const change = (value: string) => {
    draftRef.current = value;
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    // An emptied field is never autosaved: deleting a saved note asks first (on close).
    if (value.trim() === '') return;
    timer.current = setTimeout(() => commit(value), NOTE_SAVE_MS);
  };

  /** Every way out of the sheet saves first. Emptying a note that was saved asks before deleting it. */
  const close = () => {
    if (hadNote && draftRef.current.trim() === '') {
      askDelete();
      return;
    }
    finish();
  };

  /** Save what is in the field and close. */
  const finish = () => {
    const value = draftRef.current;
    commit(value);
    setOpen(false);
    const has = value.trim() !== '';
    // Said once, politely; typing itself never announces anything.
    if (has && !hadNote) sayLater('Note saved.');
    if (!has && hadNote) sayLater('Note deleted.');
    // Focus lands on what is now in this place: the note (read aloud), or "Add a note".
    moveFocus(has ? plateRef : addRef, 400);
  };

  /** Ask before deleting a saved note. Cancel keeps it, and the sheet stays open with the note back in the field. */
  const askDelete = () =>
    Alert.alert('Delete your note?', 'This can’t be undone.', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          if (draftRef.current.trim() !== '') return; // "Delete note" with text: nothing to put back
          draftRef.current = text;
          setDraft(text);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          draftRef.current = '';
          setDraft('');
          finish();
        },
      },
    ]);

  return (
    <View style={{ marginTop: space.md }}>
      {text ? (
        // A plate means "quiet, yours": no tint (tints mean feedback), no green rule (the coach's voice).
        <Rise>
          <Card variant="plate">
            <Row gap={space.sm} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* The caption is read as part of the note below ("Your note: …"), so it is not a stop of its own. */}
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <T v="caption" color={c.ink2}>{NOTE_TITLE}</T>
              </View>
              <Button kind="ghost" label="Edit" accessibilityLabel="Edit your note" onPress={openSheet} style={{ marginRight: -space.sm }} />
            </Row>
            {/* The whole note, never cut: the learner wrote it, and it is at most 1,000 characters. */}
            <View ref={plateRef} accessible accessibilityLabel={`${NOTE_TITLE}: ${text}`}>
              <T v="body">{text}</T>
            </View>
          </Card>
        </Rise>
      ) : (
        <Button
          ref={addRef}
          kind="ghost"
          label={ADD_NOTE}
          accessibilityHint="Write a note to yourself on this question."
          icon={(col) => <PencilLine size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          iconLeading
          onPress={openSheet}
          // Left at the gutter, like the other ghost links after content.
          style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
        />
      )}
      <Sheet visible={open} onClose={close} title={NOTE_TITLE} closeLabel="Done" intro={keyboard && large ? undefined : CLOUD ? NOTE_INTRO_SYNC : NOTE_INTRO}>
        <NoteField
          ref={fieldRef}
          value={draft}
          onChangeText={change}
          placeholder={NOTE_PLACEHOLDER}
          accessibilityLabel="Your note on this question"
          maxLength={QNOTE_MAX}
          counterFrom={NOTE_COUNTER_FROM}
        />
        {/* All notes together are at their limit: this change is not saved (said once, politely). */}
        <View accessibilityLiveRegion="polite">{full ? <T v="meta" color={c.tip} style={{ marginTop: space.xs }}>{NOTES_FULL_LINE}</T> : null}</View>
        {/* Only for a note that was already saved. Accent, never red: red means a wrong answer. */}
        {hadNote && (
          <Button kind="ghost" label="Delete note" accessibilityHint="Asks you to confirm before deleting." onPress={askDelete} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.sm }} />
        )}
      </Sheet>
    </View>
  );
}
