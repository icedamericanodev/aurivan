/**
 * "Your note" on a question: the pure rules (engine/questionNotes.ts), the
 * progress store action, the backup checker (export fit + restore), and the
 * sync merge (built OFF): newest edit wins per question, a deletion is a
 * tombstone so a union can't bring it back, and a wrong clock can't win.
 */
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { backupTooBig, buildBackup, fitForBackup, MAX_BACKUP_BYTES, readBackup, type KnownIds } from '../engine/backup';
import { saveBackup } from '../lib/backup';
import {
  capNoteText,
  noteFits,
  NOTES_TOTAL_MAX,
  pruneTombstones,
  TOMBSTONE_KEEP_DAYS,
  totalNoteChars,
  isLiveNote,
  liveNotes,
  mergeNote,
  mergeNotes,
  noteSnippet,
  noteTextOf,
  QNOTE_MAX,
  withNote,
  type QuestionNotes,
} from '../engine/questionNotes';
import { holdsStudy, mergeSides, stableStringify, type SyncedProgress } from '../engine/syncMerge';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const CERT_IDS = CERTIFICATIONS.map((c) => c.id);
const T0 = new Date(2026, 9, 12, 9).getTime();
const [q1, q2, q3] = getAllQuestions('cisa').map((q) => q.id);

describe('the note rules (engine)', () => {
  it('saves a note, and returns the same object when nothing changes', () => {
    const a = withNote(undefined, q1, 'Escalate first.', T0)!;
    expect(a[q1]).toEqual({ text: 'Escalate first.', ts: T0 });
    expect(withNote(a, q1, 'Escalate first.', T0 + 5)).toBe(a);
    const b = withNote(a, q1, 'Escalate first, then test.', T0 + 9)!;
    expect(b[q1]).toEqual({ text: 'Escalate first, then test.', ts: T0 + 9 });
  });

  it('caps a note at 1,000 characters (the web limit), never splitting an emoji', () => {
    expect(QNOTE_MAX).toBe(1000);
    const long = 'x'.repeat(1500);
    expect(withNote(undefined, q1, long, T0)![q1].text).toHaveLength(1000);
    // An emoji (two characters) across the limit is dropped whole.
    const edge = `${'a'.repeat(999)}🌱`;
    expect(capNoteText(edge)).toBe('a'.repeat(999));
  });

  it('empty or spaces-only text deletes the note, leaving a tombstone with the time', () => {
    const a = withNote(undefined, q1, 'Mine', T0)!;
    const gone = withNote(a, q1, '   \n ', T0 + 1)!;
    expect(gone[q1]).toEqual({ text: '', ts: T0 + 1 });
    expect(isLiveNote(gone[q1])).toBe(false);
    expect(noteTextOf(gone, q1)).toBe('');
    // Deleting again, or deleting a note that never existed: no change (no save).
    expect(withNote(gone, q1, '', T0 + 2)).toBe(gone);
    expect(withNote(undefined, q2, '', T0)).toBeUndefined();
  });

  it('ignores ids the web would refuse', () => {
    expect(withNote(undefined, '__proto__x y', 'hi', T0)).toBeUndefined();
    expect(withNote(undefined, '', 'hi', T0)).toBeUndefined();
  });

  it('merge: the newer edit wins, a newer deletion included, in either order', () => {
    const note = { text: 'Old idea', ts: T0 };
    const tomb = { text: '', ts: T0 + 10 };
    expect(mergeNote(note, tomb)).toBe(tomb);
    expect(mergeNote(tomb, note)).toBe(tomb);
    const newer = { text: 'Rewritten', ts: T0 + 20 };
    expect(mergeNote(tomb, newer)).toBe(newer);
    // The same moment: a fixed choice, whichever side is first.
    const x = { text: 'A', ts: T0 };
    const y = { text: 'B', ts: T0 };
    expect(mergeNote(x, y)).toEqual(mergeNote(y, x));
    expect(stableStringify(mergeNotes({ [q1]: note }, { [q1]: tomb, [q2]: newer }))).toBe(stableStringify(mergeNotes({ [q1]: tomb, [q2]: newer }, { [q1]: note })));
  });

  it('liveNotes: tombstones left out, newest first; snippets are one line, cut at a word', () => {
    const m: QuestionNotes = { [q1]: { text: 'first', ts: T0 }, [q2]: { text: '', ts: T0 + 5 }, [q3]: { text: 'third', ts: T0 + 9 } };
    expect(liveNotes(m).map((n) => n.id)).toEqual([q3, q1]);
    expect(noteSnippet('one\ntwo   three', 50)).toBe('one two three');
    expect(noteSnippet('alpha beta gamma delta', 12)).toBe('alpha beta…');
  });
});

describe('the total cap for all notes in one exam', () => {
  const full = (): QuestionNotes => {
    const m: QuestionNotes = {};
    getAllQuestions('cisa')
      .slice(10, 10 + NOTES_TOTAL_MAX / QNOTE_MAX)
      .forEach((q, i) => (m[q.id] = { text: 'n'.repeat(QNOTE_MAX), ts: T0 + i }));
    return m;
  };

  it('a new note, or a longer edit, past the cap is not saved (the same object back)', () => {
    const m = full();
    expect(totalNoteChars(m)).toBe(NOTES_TOTAL_MAX);
    expect(noteFits(m, q1, 'one more')).toBe(false);
    expect(withNote(m, q1, 'one more', T0)).toBe(m);
    const someId = Object.keys(m)[0];
    expect(withNote(m, someId, 'n'.repeat(QNOTE_MAX) + 'x', T0)).toBe(m); // already at 1,000: cut, so the same text
  });

  it('shortening or deleting always works, so a learner can make room', () => {
    const m = full();
    const someId = Object.keys(m)[0];
    const shorter = withNote(m, someId, 'short now', T0 + 1)!;
    expect(shorter[someId].text).toBe('short now');
    expect(withNote(shorter, q1, 'now it fits', T0 + 2)![q1].text).toBe('now it fits');
    expect(withNote(m, someId, '', T0 + 3)![someId].text).toBe('');
  });

  it('the store refuses a note past the cap too', () => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ byCert: { cisa: { ...selectCert(useProgress.getState(), 'cisa'), qNotes: full() } } });
    useProgress.getState().setQuestionNote('cisa', q1, 'no room');
    expect(selectCert(useProgress.getState(), 'cisa').qNotes![q1]).toBeUndefined();
    useProgress.getState().resetCert('cisa');
  });
});

describe('old tombstones', () => {
  const DAY = 86_400_000;
  it('pruneTombstones drops deletions older than 90 days and keeps notes and recent deletions', () => {
    const m: QuestionNotes = {
      [q1]: { text: '', ts: T0 - (TOMBSTONE_KEEP_DAYS + 1) * DAY },
      [q2]: { text: '', ts: T0 - 10 * DAY },
      [q3]: { text: 'kept, however old', ts: T0 - 900 * DAY },
    };
    expect(pruneTombstones(m, T0)).toEqual({ [q2]: m[q2], [q3]: m[q3] });
    const clean = { [q3]: m[q3] };
    expect(pruneTombstones(clean, T0)).toBe(clean); // nothing to drop: no new object
  });
});

describe('the progress store', () => {
  beforeEach(() => useProgress.getState().resetCert('cisa'));

  it('saves, edits and deletes a note (the deletion stays as a tombstone)', () => {
    const { setQuestionNote } = useProgress.getState();
    setQuestionNote('cisa', q1, 'Escalate first.');
    expect(noteTextOf(selectCert(useProgress.getState(), 'cisa').qNotes, q1)).toBe('Escalate first.');
    setQuestionNote('cisa', q1, '');
    const n = selectCert(useProgress.getState(), 'cisa').qNotes![q1];
    expect(n.text).toBe('');
    expect(n.ts).toBeGreaterThan(0);
  });

  it('the same text saves nothing (no new state object)', () => {
    useProgress.getState().setQuestionNote('cisa', q1, 'Same');
    const before = useProgress.getState().byCert;
    useProgress.getState().setQuestionNote('cisa', q1, 'Same');
    expect(useProgress.getState().byCert).toBe(before);
  });

  it('an old save with no notes loads and reads as "no notes", and a note can be added to it', () => {
    // The shape a save from before "Your note" has: no qNotes at all.
    useProgress.setState({ byCert: { cisa: { answers: {}, review: {}, bookmarks: [q2], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, gameRecent: {}, notesRead: [] } } });
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.qNotes).toBeUndefined();
    expect(liveNotes(cp.qNotes)).toEqual([]);
    useProgress.getState().setQuestionNote('cisa', q1, 'New');
    const after = selectCert(useProgress.getState(), 'cisa');
    expect(noteTextOf(after.qNotes, q1)).toBe('New');
    expect(after.bookmarks).toEqual([q2]); // nothing else changed
  });

  it('"Reset progress" deletes the notes', () => {
    useProgress.getState().setQuestionNote('cisa', q1, 'Gone after reset');
    useProgress.getState().resetCert('cisa');
    expect(selectCert(useProgress.getState(), 'cisa').qNotes).toBeUndefined();
  });
});

// ── Backups ──────────────────────────────────────────────────────────────
const SETTINGS = { onboarded: true, activeCertId: 'cisa', examDates: {}, theme: 'system', shuffleOptions: true, dailyGoal: 20, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [] };
const progressWith = (qNotes?: unknown) => ({
  byCert: { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, ...(qNotes === undefined ? {} : { qNotes }) } },
  streak: { current: 0, best: 0, lastDay: null },
  today: { day: '', answered: 0 },
  days: {},
});
const fileText = (progress: unknown) => JSON.stringify(buildBackup({ settings: SETTINGS as never, progress: progress as never }, { now: T0, appVersion: '1.0.0' }));
const known = (): KnownIds => ({ questions: new Set(getAllQuestions('cisa').map((q) => q.id)), lessons: new Set(), notes: new Set() });

describe('backups carry notes', () => {
  it('a backup FILE leaves out tombstones older than 90 days (sync keeps them)', () => {
    const DAY = 86_400_000;
    const notes = { [q1]: { text: '', ts: T0 - 200 * DAY }, [q2]: { text: '', ts: T0 - DAY }, [q3]: { text: 'Mine', ts: T0 - 300 * DAY } };
    const read = readBackup(fileText(progressWith(notes)), CERT_IDS, known);
    expect(read.progress.byCert.cisa.qNotes).toEqual({ [q2]: notes[q2], [q3]: notes[q3] });
  });

  it('a file over the 1 MB a restore accepts is flagged, and "Save a backup" makes none', async () => {
    // A save from before the cap (or one restored from elsewhere): far more note text than one file can hold.
    const many: QuestionNotes = {};
    getAllQuestions('cisa').slice(0, 1100).forEach((q, i) => (many[q.id] = { text: 'é'.repeat(QNOTE_MAX), ts: T0 + i }));
    const text = fileText(progressWith(many));
    expect(text.length).toBeGreaterThan(0);
    expect(backupTooBig(text)).toBe(true);
    expect(backupTooBig(fileText(progressWith({ [q1]: { text: 'small', ts: T0 } })))).toBe(false);
    expect(MAX_BACKUP_BYTES).toBe(1024 * 1024);
    useProgress.setState({ byCert: { cisa: { ...selectCert(useProgress.getState(), 'cisa'), qNotes: many } } });
    await expect(saveBackup(T0)).resolves.toBe('too-big');
    useProgress.getState().resetCert('cisa');
  });

  it('a note and a tombstone survive a backup and restore', () => {
    const notes = { [q1]: { text: 'Mine', ts: T0 }, [q2]: { text: '', ts: T0 + 1 } };
    const read = readBackup(fileText(progressWith(notes)), CERT_IDS, known);
    expect(read.progress.byCert.cisa.qNotes).toEqual(notes);
  });

  it('an old file with no notes restores as before (no qNotes key)', () => {
    const read = readBackup(fileText(progressWith()), CERT_IDS, known);
    expect(read.progress.byCert.cisa).not.toHaveProperty('qNotes');
  });

  it('export (fit mode) cuts an over-long note to 1,000, so the file always restores', () => {
    const fitted = fitForBackup({ settings: SETTINGS, progress: progressWith({ [q1]: { text: 'y'.repeat(3000), ts: T0 } }) }) as { progress: ReturnType<typeof progressWith> & { byCert: { cisa: { qNotes: QuestionNotes } } } };
    expect(fitted.progress.byCert.cisa.qNotes[q1].text).toHaveLength(QNOTE_MAX);
  });

  it('a hand-edited file with a too-long note is cut, not refused', () => {
    const file = JSON.parse(fileText(progressWith({ [q1]: { text: 'ok', ts: T0 } })));
    file.stores.progress.state.byCert.cisa.qNotes[q1].text = 'z'.repeat(5000);
    const read = readBackup(JSON.stringify(file), CERT_IDS, known);
    expect(read.progress.byCert.cisa.qNotes![q1].text).toHaveLength(QNOTE_MAX);
  });

  it('a note that is not text, or has no time, is damaged data (nothing changes)', () => {
    for (const bad of [{ text: 42, ts: T0 }, { text: 'hi' }, { text: 'hi', ts: 'soon' }]) {
      const file = JSON.parse(fileText(progressWith({ [q1]: { text: 'ok', ts: T0 } })));
      file.stores.progress.state.byCert.cisa.qNotes[q1] = bad;
      expect(() => readBackup(JSON.stringify(file), CERT_IDS, known)).toThrow(expect.objectContaining({ code: 'bad-data' }));
    }
  });

  it('notes on question ids this app does not have are dropped; unknown fields too', () => {
    const file = JSON.parse(fileText(progressWith({ [q1]: { text: 'ok', ts: T0 } })));
    file.stores.progress.state.byCert.cisa.qNotes.zz_999 = { text: 'made up', ts: T0 };
    file.stores.progress.state.byCert.cisa.qNotes[q1].extra = 'dropped';
    const read = readBackup(JSON.stringify(file), CERT_IDS, known);
    expect(read.progress.byCert.cisa.qNotes).toEqual({ [q1]: { text: 'ok', ts: T0 } });
  });
});

// ── Sync merge (built OFF) ──────────────────────────────────────────────
const ctx = { now: T0, knownCertIds: CERT_IDS };
const side = (qNotes: QuestionNotes) => ({ state: { byCert: { cisa: { answers: {}, qNotes } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} });

describe('sync merge', () => {
  it('a deletion on one phone is NOT brought back by the other phone’s older copy (tombstone)', () => {
    const phoneA = side({ [q1]: { text: 'Old note', ts: T0 - 5000 } });
    const phoneB = side({ [q1]: { text: '', ts: T0 - 1000 } });
    const ab = mergeSides('progress', phoneA, phoneB, ctx);
    const ba = mergeSides('progress', phoneB, phoneA, ctx);
    expect(ab.state.byCert.cisa.qNotes![q1]).toEqual({ text: '', ts: T0 - 1000 });
    expect(stableStringify(ab)).toBe(stableStringify(ba));
  });

  it('per question the latest edit wins; notes only on one side are kept', () => {
    const phoneA = side({ [q1]: { text: 'A newer', ts: T0 - 10 }, [q2]: { text: 'only on A', ts: T0 - 99 } });
    const phoneB = side({ [q1]: { text: 'B older', ts: T0 - 500 }, [q3]: { text: 'only on B', ts: T0 - 7 } });
    const m = mergeSides('progress', phoneA, phoneB, ctx).state.byCert.cisa.qNotes!;
    expect(m[q1].text).toBe('A newer');
    expect(m[q2].text).toBe('only on A');
    expect(m[q3].text).toBe('only on B');
  });

  it('a note stamped far in the future (wrong clock) is pulled back to now, so a later real edit can win', () => {
    const wrongClock = side({ [q1]: { text: 'From 2099', ts: Date.UTC(2099, 0, 1) } });
    const m = mergeSides('progress', wrongClock, null, ctx).state.byCert.cisa.qNotes!;
    expect(m[q1].ts).toBe(T0);
  });

  it('a written note counts as data to keep; a deleted one does not', () => {
    expect(holdsStudy(side({ [q1]: { text: 'Mine', ts: T0 } }).state, {})).toBe(true);
    expect(holdsStudy(side({ [q1]: { text: '', ts: T0 } }).state, {})).toBe(false);
  });

  it('the merged notes go through the backup checker (cap applied)', () => {
    const m = mergeSides('progress', side({ [q1]: { text: 'w'.repeat(2000), ts: T0 } }), null, ctx).state.byCert.cisa.qNotes!;
    expect(m[q1].text).toHaveLength(QNOTE_MAX);
  });
});
