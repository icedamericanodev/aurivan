/**
 * Mobile 1.25, "fill the circle": a study note is not read yet, started or read.
 *
 * Plain English for the founder, what this file checks:
 * - the rules (engine/noteReadState.ts): read outranks started; a domain is
 *   none / started / read; the 20-second auto-read minimum; the words;
 * - the progress store: an OLD save without `notesViewed` loads with nothing
 *   started and keeps everything else; "Mark as not read" goes back to
 *   started; started is never cleared by reading; the new "Reset reading
 *   progress" clears only the notes (answers and scores stay), for one exam;
 * - backups: started notes survive a backup and restore, unknown ids are
 *   dropped, an over-long list is cut to its cap, an old file still loads;
 * - sync: two phones' started notes are joined (a union).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CERTIFICATIONS } from '../content/certifications';
import { noteSubtopics } from '../content/notes';
import { buildBackup, fitForBackup, readBackup } from '../engine/backup';
import {
  AUTO_READ_MIN_MS,
  canAutoRead,
  groupReadState,
  noteReadState,
  READ_FILL,
  readStateLabel,
  readStateWords,
  STARTED_AFTER_MS,
  withNoteRead,
  withNoteViewed,
} from '../engine/noteReadState';
import { holdsStudy, mergeSides, type SyncedProgress } from '../engine/syncMerge';
import { clearJustRead, justReadFrom, noteJustRead, readMarkKey, takeJustRead } from '../lib/noteNews';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const CERT_IDS = CERTIFICATIONS.map((c) => c.id);
const T0 = new Date(2026, 9, 18, 9).getTime();
const cert = (id = 'cisa') => selectCert(useProgress.getState(), id);
// zustand's persist writes after the current tick.
const flush = () => new Promise((r) => setTimeout(r, 0));
const SETTINGS = {
  onboarded: true,
  activeCertId: 'cisa',
  examDates: {},
  theme: 'system',
  shuffleOptions: true,
  dailyGoal: 20,
  reminder: { enabled: false, hour: 19, minute: 0 },
  haptics: true,
  gameRulesSeen: [],
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useProgress.setState({ byCert: {} });
  clearJustRead();
});

// ── The rules ──────────────────────────────────────────────────────────
describe('engine: note read state', () => {
  it('one note: read outranks started; nothing saved is none', () => {
    expect(noteReadState('1A1.1', [], [])).toBe('none');
    expect(noteReadState('1A1.1', [], ['1A1.1'])).toBe('started');
    expect(noteReadState('1A1.1', ['1A1.1'], [])).toBe('read');
    expect(noteReadState('1A1.1', ['1A1.1'], ['1A1.1'])).toBe('read');
    // An old save has no viewed list at all.
    expect(noteReadState('1A1.1', [], undefined)).toBe('none');
  });

  it('a group (a domain): none, then started while anything is touched, read when every note is read', () => {
    const ids = ['a', 'b', 'c'];
    expect(groupReadState(ids, [], [])).toBe('none');
    expect(groupReadState(ids, [], ['b'])).toBe('started');
    expect(groupReadState(ids, ['a'], [])).toBe('started');
    expect(groupReadState(ids, ['a', 'b'], ['c'])).toBe('started');
    expect(groupReadState(ids, ['a', 'b', 'c'], [])).toBe('read');
    // Notes of OTHER domains never count.
    expect(groupReadState(ids, ['x'], ['y'])).toBe('none');
    expect(groupReadState([], ['a'], ['a'])).toBe('none');
  });

  it('the words on screen and for screen readers', () => {
    expect(readStateWords('none')).toBe('Not read yet');
    expect(readStateWords('started')).toBe('Started');
    expect(readStateWords('read')).toBe('Read');
    expect(readStateLabel('The Audit Charter', 'none')).toBe('The Audit Charter, not read yet');
    expect(readStateLabel('The Audit Charter', 'started')).toBe('The Audit Charter, started, not finished');
    expect(readStateLabel('The Audit Charter', 'read')).toBe('The Audit Charter, read');
  });

  it('the 10 s and 20 s rules, and how full each circle is', () => {
    expect(STARTED_AFTER_MS).toBe(10_000);
    expect(AUTO_READ_MIN_MS).toBe(20_000);
    expect(canAutoRead(0)).toBe(false);
    expect(canAutoRead(19_999)).toBe(false);
    expect(canAutoRead(20_000)).toBe(true);
    expect(READ_FILL).toEqual({ none: 0, started: 0.5, read: 1 });
  });

  it('unmarking a read note makes it started; marking twice changes nothing (same arrays)', () => {
    const read = ['a'];
    const viewed: string[] = [];
    const same = withNoteRead(read, viewed, 'a', true);
    expect(same.read).toBe(read);
    expect(same.viewed).toBe(viewed);
    const off = withNoteRead(read, viewed, 'a', false);
    expect(off).toEqual({ read: [], viewed: ['a'] });
    const on = withNoteRead([], ['a'], 'a', true);
    // Reading never clears started.
    expect(on).toEqual({ read: ['a'], viewed: ['a'] });
    const v = ['a'];
    expect(withNoteViewed(v, 'a')).toBe(v);
    expect(withNoteViewed(v, 'b')).toEqual(['a', 'b']);
  });
});

// ── The progress store ─────────────────────────────────────────────────
describe('store: started notes', () => {
  it('an old save without notesViewed loads with nothing started, and keeps its read notes and other progress', async () => {
    await AsyncStorage.setItem(
      'aurivan.progress.v1',
      JSON.stringify({
        state: {
          byCert: { cisa: { answers: {}, review: {}, bookmarks: ['d1_001'], mocks: [], lessonsDone: ['l1'], mistakes: {}, gameBest: {}, notesRead: ['1A1.1'] } },
          streak: { current: 0, best: 0, lastDay: null },
          today: { day: '', answered: 0 },
          days: {},
        },
        version: 2,
      }),
    );
    await useProgress.persist.rehydrate();
    expect(cert().notesViewed).toEqual([]);
    expect(cert().notesRead).toEqual(['1A1.1']);
    expect(cert().bookmarks).toEqual(['d1_001']);
    expect(noteReadState('1A1.1', cert().notesRead, cert().notesViewed)).toBe('read');
    useProgress.getState().markNoteViewed('cisa', '4B1.2');
    expect(cert().notesViewed).toEqual(['4B1.2']);
    expect(cert().lessonsDone).toEqual(['l1']);
  });

  it('started is saved once, survives an app kill, and is per certification', async () => {
    useProgress.getState().markNoteViewed('cisa', '4B1.2');
    const before = useProgress.getState().byCert;
    useProgress.getState().markNoteViewed('cisa', '4B1.2');
    expect(useProgress.getState().byCert).toBe(before); // no new state, no save
    expect(cert('cism').notesViewed ?? []).toEqual([]);
    await flush();
    const raw = (await AsyncStorage.getItem('aurivan.progress.v1'))!;
    expect(JSON.parse(raw).state.byCert.cisa.notesViewed).toEqual(['4B1.2']);
    // The old key is untouched (never renamed).
    expect(JSON.parse(raw).state.byCert.cisa.notesRead).toEqual([]);
    useProgress.setState({ byCert: {} });
    await flush();
    await AsyncStorage.setItem('aurivan.progress.v1', raw);
    await useProgress.persist.rehydrate();
    expect(cert().notesViewed).toEqual(['4B1.2']);
  });

  it('"Mark as not read" goes back to started; reading never clears started', () => {
    const p = useProgress.getState();
    p.setNoteRead('cisa', '4B1.2', true);
    expect(noteReadState('4B1.2', cert().notesRead, cert().notesViewed)).toBe('read');
    p.setNoteRead('cisa', '4B1.2', false);
    expect(cert().notesRead).toEqual([]);
    expect(cert().notesViewed).toEqual(['4B1.2']);
    expect(noteReadState('4B1.2', cert().notesRead, cert().notesViewed)).toBe('started');
    p.setNoteRead('cisa', '4B1.2', true);
    expect(cert().notesViewed).toEqual(['4B1.2']);
    // Unmarking a note that was never read changes nothing (not even started).
    const before = useProgress.getState().byCert;
    p.setNoteRead('cisa', '1A1.1', false);
    expect(useProgress.getState().byCert).toBe(before);
  });

  it('Reset reading progress clears read and started for ONE exam; answers, lessons and other exams stay', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', 'd1_001', true);
    p.completeLesson('cisa', 'cisa-l-d1-engagement');
    p.setNoteRead('cisa', '4B1.2', true);
    p.markNoteViewed('cisa', '1A1.1');
    p.setNoteRead('cism', '1A1.1', true);
    p.resetNotesReading('cisa');
    expect(cert().notesRead).toEqual([]);
    expect(cert().notesViewed).toEqual([]);
    expect(cert().answers).toHaveProperty('d1_001');
    expect(cert().lessonsDone).toEqual(['cisa-l-d1-engagement']);
    expect(cert('cism').notesRead).toEqual(['1A1.1']);
    // Nothing left to reset: no new state, no save.
    const before = useProgress.getState().byCert;
    useProgress.getState().resetNotesReading('cisa');
    useProgress.getState().resetNotesReading('crisc');
    expect(useProgress.getState().byCert).toBe(before);
  });

  it('the full exam reset clears started too', () => {
    useProgress.getState().markNoteViewed('cisa', '4B1.2');
    useProgress.getState().resetCert('cisa');
    expect(cert().notesViewed ?? []).toEqual([]);
  });
});

// ── Backup and restore ─────────────────────────────────────────────────
describe('backup: started notes', () => {
  const real = noteSubtopics('cisa').map((s) => s.id);
  const progressWith = (cp: Record<string, unknown>) => ({
    byCert: { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, gameRecent: {}, notesRead: [], ...cp } },
    streak: { current: 0, best: 0, lastDay: null },
    today: { day: '', answered: 0 },
    days: {},
  });
  const known = () => ({ questions: new Set<string>(), lessons: new Set<string>(), notes: new Set(real) });
  const roundTrip = (progress: object) =>
    readBackup(JSON.stringify(buildBackup({ settings: SETTINGS, progress }, { now: T0, appVersion: '1.25.0' })), CERT_IDS, known, '1.25.0').progress.byCert.cisa;

  it('a round trip keeps started and read notes exactly; ids not in the app are dropped', () => {
    const out = roundTrip(progressWith({ notesRead: [real[0]], notesViewed: [real[0], real[1], '9Z9.9'] }));
    expect(out.notesRead).toEqual([real[0]]);
    expect(out.notesViewed).toEqual([real[0], real[1]]);
  });

  it('an older file with no notesViewed restores with nothing started (and stays without the field)', () => {
    const out = roundTrip(progressWith({ notesRead: [real[2]] }));
    expect(out.notesRead).toEqual([real[2]]);
    expect(out.notesViewed).toBeUndefined();
  });

  it('a list over the cap is cut on export (so the file still restores), and refused in a file', () => {
    const many = Array.from({ length: 5_001 }, (_, i) => `x${i}`);
    const fitted = fitForBackup({ settings: SETTINGS, progress: progressWith({ notesViewed: many }) }).progress as ReturnType<typeof progressWith>;
    expect((fitted.byCert.cisa as unknown as { notesViewed: string[] }).notesViewed).toHaveLength(5_000);
    const file = buildBackup({ settings: SETTINGS, progress: progressWith({}) }, { now: T0, appVersion: '1.25.0' });
    (file.stores.progress.state.byCert.cisa as { notesViewed?: unknown }).notesViewed = many;
    expect(() => readBackup(JSON.stringify(file), CERT_IDS)).toThrow();
    // Not a list of ids: refused, never half-read.
    (file.stores.progress.state.byCert.cisa as { notesViewed?: unknown }).notesViewed = [42];
    expect(() => readBackup(JSON.stringify(file), CERT_IDS)).toThrow();
  });
});

// ── Review fix (1.25 QA): a reading reset never costs a badge ─────────
describe('badges survive Reset reading progress (notesEverRead)', () => {
  // The reviewer's repro: 4 correct answers, one note read, no lessons, Topic Clear earned.
  const earnTopicClear = () => {
    const p = useProgress.getState();
    for (const id of ['d1_001', 'd1_002', 'd1_003', 'd1_004']) p.recordAnswer('cisa', id, true);
    p.setNoteRead('cisa', '4B1.2', true);
    p.updateMilestones('cisa', (m) => ({ milestones: { ...m, earned: { ...m?.earned, 'topic-clear': T0 } } }));
    expect(cert().milestones?.earned).toHaveProperty('topic-clear');
  };
  const restoredEarned = () => {
    const s = useProgress.getState();
    const file = buildBackup({ settings: SETTINGS, progress: { byCert: s.byCert, streak: s.streak, today: s.today, days: s.days } }, { now: T0, appVersion: '1.25.0' });
    return readBackup(JSON.stringify(file), CERT_IDS).progress.byCert.cisa.milestones?.earned;
  };

  it('after the reset, a backup and restore keeps Topic Clear', () => {
    earnTopicClear();
    useProgress.getState().resetNotesReading('cisa');
    expect(cert().notesRead).toEqual([]);
    expect(Object.keys(restoredEarned() ?? {})).toEqual(['topic-clear']);
    // The count of notes ever read is kept (it only ever goes up).
    expect(cert().notesEverRead).toBe(1);
  });

  it('after the reset, a sync merge keeps it too, and takes the higher count', () => {
    earnTopicClear();
    useProgress.getState().resetNotesReading('cisa');
    const ctx = { now: T0, knownCertIds: CERT_IDS };
    const mine = { state: { byCert: useProgress.getState().byCert, streak: useProgress.getState().streak } as unknown as SyncedProgress, stamps: {} };
    const other = { state: { byCert: { cisa: { notesEverRead: 3 } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} };
    const m = mergeSides('progress', mine, other, ctx).state.byCert.cisa;
    expect(m.milestones?.earned).toHaveProperty('topic-clear');
    expect(m.notesEverRead).toBe(3);
    expect(mergeSides('progress', other, mine, ctx).state.byCert.cisa.notesEverRead).toBe(3);
  });

  it('the count: kept through unmarking, filled from notesRead for an old save, capped in a file', () => {
    const p = useProgress.getState();
    p.setNoteRead('cisa', '4B1.2', true);
    p.setNoteRead('cisa', '1A1.1', true);
    p.setNoteRead('cisa', '1A1.1', false);
    expect(cert().notesEverRead).toBe(2);
    // An old save has no count: the loader reads it from the notes read.
    useProgress.setState({ byCert: { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, gameRecent: {}, notesRead: ['1A1.1', '4B1.2'] } } });
    expect(cert().notesEverRead).toBe(2);
    // In a file it is a whole count within the cap.
    const file = buildBackup({ settings: SETTINGS, progress: { byCert: { cisa: { notesRead: [], notesEverRead: 2 } }, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} } }, { now: T0, appVersion: '1.25.0' });
    expect(readBackup(JSON.stringify(file), CERT_IDS).progress.byCert.cisa.notesEverRead).toBe(2);
    for (const bad of [-1, 1.5, 'x', 5_001]) {
      (file.stores.progress.state.byCert.cisa as { notesEverRead?: unknown }).notesEverRead = bad;
      expect(() => readBackup(JSON.stringify(file), CERT_IDS)).toThrow();
    }
  });
});

// ── Sync ───────────────────────────────────────────────────────────────
describe('sync: started notes', () => {
  const ctx = { now: T0, knownCertIds: CERT_IDS };
  const side = (cp: object) => ({ state: { byCert: { cisa: cp }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} });

  it('two phones: started notes are joined (a union), in either order', () => {
    const a = side({ notesViewed: ['1A1.1', '4B1.2'], notesRead: ['1A1.1'] });
    const b = side({ notesViewed: ['2A1.1'] });
    const m = mergeSides('progress', a, b, ctx).state.byCert.cisa;
    expect([...(m.notesViewed ?? [])].sort()).toEqual(['1A1.1', '2A1.1', '4B1.2']);
    expect(m.notesRead).toEqual(['1A1.1']);
    const m2 = mergeSides('progress', b, a, ctx).state.byCert.cisa;
    expect([...(m2.notesViewed ?? [])].sort()).toEqual(['1A1.1', '2A1.1', '4B1.2']);
    // Only one side has the list: it is kept.
    expect(mergeSides('progress', side({ notesViewed: ['1A1.1'] }), side({}), ctx).state.byCert.cisa.notesViewed).toEqual(['1A1.1']);
  });

  it('a phone that only started a note holds study (a first sync keeps an undo copy)', () => {
    expect(holdsStudy(side({ notesViewed: ['1A1.1'] }).state, {})).toBe(true);
  });
});

// ── The session-only "just read" memory ───────────────────────────────
describe('noteNews: a fill plays once per row', () => {
  it('remembers where the circle was, per row, until the row takes it', () => {
    const k = readMarkKey('cisa', 'note', '4B1.2');
    expect(k).toBe('cisa:note:4B1.2');
    expect(justReadFrom(k)).toBeUndefined();
    noteJustRead(k, 0.5);
    expect(justReadFrom(k)).toBe(0.5);
    // Another exam's row with the same note id is not this one.
    expect(justReadFrom(readMarkKey('cism', 'note', '4B1.2'))).toBeUndefined();
    takeJustRead(k);
    expect(justReadFrom(k)).toBeUndefined();
    expect(justReadFrom(undefined)).toBeUndefined();
  });
});
