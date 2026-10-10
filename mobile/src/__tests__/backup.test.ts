/**
 * Build C, part 2: backup and restore.
 *
 * - Round trip: save a backup, restore it, and the stores are deep-equal.
 * - A bad file is refused with a clear reason and changes NOTHING: wrong
 *   app, unknown schema, too big, not JSON, wrong types, unknown exam.
 * - Unknown keys are ignored; lists are capped.
 * - Undo restore brings back the data from before, and expires after 7 days.
 * - Reminders are put back after a restore (permission asked only if missing).
 * - Older formats are upgraded (the progress store's v1 → v2 path).
 */
import { getAllQuestions } from '../content/loader';
import {
  BACKUP_ERROR_COPY,
  BACKUP_SCHEMA,
  BackupError,
  backupFileName,
  FILE_MIGRATIONS,
  MAX_BACKUP_BYTES,
  migrateFile,
  previewRows,
  readBackup,
  UNDO_DAYS,
  utf8Bytes,
  type BackupFile,
} from '../engine/backup';
import { DAILY_ID, weeklyId } from '../engine/reminders';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { canUndo, checkBackupText, currentBackup, pickBackup, pruneUndo, restoreBackup, saveBackup, undoRestore } from '../lib/backup';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.3.0' } } }));

// expo-notifications: an in-memory schedule and a permission we control.
const mockScheduled = new Map<string, { identifier: string; trigger?: unknown }>();
const mockPermission = { granted: true, grantOnAsk: true, asked: 0 };
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: mockPermission.granted }),
  requestPermissionsAsync: async () => {
    mockPermission.asked += 1;
    mockPermission.granted = mockPermission.grantOnAsk;
    return { granted: mockPermission.granted };
  },
  getAllScheduledNotificationsAsync: async () => [...mockScheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => {
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (req: { identifier: string; trigger: unknown }) => {
    mockScheduled.set(req.identifier, req);
    return req.identifier;
  },
}));

// expo-file-system / expo-sharing / expo-document-picker: tiny fakes.
const mockFiles = new Map<string, string>();
const mockShared: string[] = [];
let mockPick: { canceled: boolean; assets: { uri: string; name: string; size?: number; lastModified: number }[] | null } = { canceled: true, assets: null };
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create() {
      mockFiles.set(this.uri, '');
    }
    write(text: string) {
      mockFiles.set(this.uri, text);
    }
    get size() {
      return (mockFiles.get(this.uri) ?? '').length;
    }
    async text() {
      const t = mockFiles.get(this.uri);
      if (t === undefined) throw new Error('missing');
      return t;
    }
  }
  return { File: MockFile, Paths: { cache: { uri: 'file:///cache' } } };
});
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async (uri: string) => {
    mockShared.push(uri);
  },
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => mockPick }));

const CERTS = ['cisa', 'cism', 'crisc', 'aaia', 'cissp'];
const NOW = new Date(2026, 9, 10, 9, 0, 0).getTime(); // 10 Oct 2026, 09:00 local
const DAY = 24 * 3_600_000;

const settingsData = () => {
  const s = useSettings.getState();
  return { onboarded: s.onboarded, activeCertId: s.activeCertId, examDates: s.examDates, theme: s.theme, shuffleOptions: s.shuffleOptions, dailyGoal: s.dailyGoal, reminder: s.reminder, haptics: s.haptics, gameRulesSeen: s.gameRulesSeen };
};
/** Progress without today's plans (`days`): a restore never brings those back. */
const progressData = () => {
  const p = useProgress.getState();
  return { byCert: p.byCert, streak: p.streak, today: p.today };
};

/** Back to a brand-new install. */
function freshInstall() {
  useSettings.setState(useSettings.getInitialState());
  useProgress.setState(useProgress.getInitialState());
  useBackup.setState({ lastBackupAt: null, undo: null });
}

/** A learner with real-looking data in every part of both stores. */
function studiedLearner() {
  freshInstall();
  useSettings.getState().completeOnboarding('cisa', '2026-12-01');
  useSettings.setState({ theme: 'dark', shuffleOptions: false, dailyGoal: 40, haptics: false, gameRulesSeen: ['sprint'], reminder: { enabled: true, hour: 7, minute: 30, days: [1, 2, 3, 4, 5] } });
  const p = useProgress.getState();
  const qs = getAllQuestions('cisa').slice(0, 6);
  p.recordAnswer('cisa', qs[0].id, true, 'sure', { ms: 42_000 });
  p.recordAnswer('cisa', qs[1].id, false, 'unsure', { ms: 95_000 });
  p.recordMistake('cisa', qs[1].id, 'B', 'unsure');
  p.tagMistake('cisa', qs[1].id, 'priority');
  p.recordAnswer('cisa', qs[2].id, true, undefined, { assisted: true });
  p.toggleBookmark('cisa', qs[3].id);
  p.completeLesson('cisa', 'cisa-l-d1-engagement');
  p.setNoteRead('cisa', '4B1.2', true);
  p.recordGame('cisa', 'trap', 8);
  p.recordMock('cisa', { id: 'mock-1', finishedAt: NOW - DAY, total: 10, correct: 7, minutesUsed: 14, byDomain: { '1': { total: 4, correct: 3 } } });
  p.dismissReady('cisa');
  p.startDay({ day: '2026-10-10', certId: 'cisa', items: [{ kind: 'review', count: 2 }, { kind: 'game', gameId: 'trap', label: 'Snare Spotter' }], done: [true, false], start: { score: 31, domains: { '1': 40 } }, answered: 3, correct: 2, minutes: 6 });
  useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, mastery: { '4B1.2': { firstDay: '2026-10-01', masteredAt: '2026-10-04' } } } } }));
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockScheduled.clear();
  mockFiles.clear();
  mockShared.length = 0;
  Object.assign(mockPermission, { granted: true, grantOnAsk: true, asked: 0 });
});
afterEach(() => jest.useRealTimers());

// ── Save, then restore ───────────────────────────────────────────────────
describe('round trip', () => {
  it('save → restore gives deep-equal stores', async () => {
    studiedLearner();
    const before = { settings: settingsData(), progress: progressData() };
    expect(await saveBackup(NOW)).toBe('shared');
    // The file is named by date and opened in the share sheet.
    expect(mockShared).toEqual(['file:///cache/aurivan-backup-2026-10-10.json']);
    expect(useBackup.getState().lastBackupAt).toBe(NOW);
    const text = mockFiles.get(mockShared[0])!;

    freshInstall();
    // The new phone went through the welcome screen (onboarded is the phone's own, never the file's).
    useSettings.setState({ onboarded: true });
    const read = checkBackupText(text);
    expect(read.kind).toBe('ok');
    if (read.kind !== 'ok') return;
    await restoreBackup(read.data, NOW);
    expect(settingsData()).toEqual(before.settings);
    expect(progressData()).toEqual(before.progress);
    // Today's plan is rebuilt by the planner, never taken from a file.
    expect(useProgress.getState().days).toEqual({});
  });

  it('the file holds the envelope and both stores, and nothing about the device', () => {
    studiedLearner();
    const file = currentBackup(NOW);
    expect(file).toMatchObject({ app: 'aurivan', schema: BACKUP_SCHEMA, appVersion: '1.3.0', exportedAt: new Date(NOW).toISOString() });
    expect(file.stores.settings.version).toBe(SETTINGS_VERSION);
    expect(file.stores.progress.version).toBe(PROGRESS_VERSION);
    expect(Object.keys(file).sort()).toEqual(['app', 'appVersion', 'exportedAt', 'schema', 'stores']);
    expect(JSON.stringify(file)).not.toMatch(/device|installation|deviceId/i);
    // Plain data only: no store actions.
    expect(JSON.stringify(file)).not.toMatch(/recordAnswer|setTheme/);
  });

  it('the store versions in the file match the stores', () => {
    expect(useProgress.persist.getOptions().version).toBe(PROGRESS_VERSION);
    expect(useSettings.persist.getOptions().version).toBe(SETTINGS_VERSION);
  });

  it('a restore replaces: settings the backup leaves out go back to defaults', async () => {
    studiedLearner();
    const file = currentBackup(NOW);
    delete (file.stores.settings.state as Partial<typeof file.stores.settings.state>).haptics;
    useSettings.setState({ haptics: false });
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    expect(useSettings.getState().haptics).toBe(true);
  });

  it('a restore replaces optional settings too: ones the backup has none of are cleared on this phone', async () => {
    studiedLearner();
    const file = currentBackup(NOW); // no study defaults, no pace-offer answer
    expect(JSON.stringify(file)).not.toMatch(/studyMode|studyDomain|studySize|paceOffer/);
    useSettings.setState({ studyMode: 'inOrder', studyDomain: '3', studySize: 50, paceOffer: 'dismissed' });
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    expect(useSettings.getState()).toMatchObject({ studyMode: undefined, studyDomain: undefined, studySize: undefined, paceOffer: undefined });
    // Undo puts this phone's own choices back.
    expect((await undoRestore(NOW)).kind).toBe('ok');
    expect(useSettings.getState()).toMatchObject({ studyMode: 'inOrder', studyDomain: '3', studySize: 50, paceOffer: 'dismissed' });
  });
});

// ── Bad files ────────────────────────────────────────────────────────────
describe('a bad file is refused and changes nothing', () => {
  const good = () => {
    studiedLearner();
    return JSON.parse(JSON.stringify(currentBackup(NOW))) as BackupFile & Record<string, unknown>;
  };
  const codeOf = (text: string) => {
    try {
      readBackup(text, CERTS);
      return 'ok';
    } catch (e) {
      return (e as BackupError).code;
    }
  };

  it('wrong app', () => {
    expect(codeOf(JSON.stringify({ ...good(), app: 'other' }))).toBe('not-aurivan');
    expect(codeOf('[1,2,3]')).toBe('not-aurivan');
  });

  it('unknown or newer schema', () => {
    expect(codeOf(JSON.stringify({ ...good(), schema: 0 }))).toBe('unknown-schema');
    expect(codeOf(JSON.stringify({ ...good(), schema: '1' }))).toBe('unknown-schema');
    expect(codeOf(JSON.stringify({ ...good(), schema: BACKUP_SCHEMA + 1 }))).toBe('newer');
    const f = good();
    f.stores.progress.version = PROGRESS_VERSION + 1;
    expect(codeOf(JSON.stringify(f))).toBe('newer');
  });

  it('oversize file (text and picker size)', async () => {
    const huge = JSON.stringify({ ...good(), pad: 'x'.repeat(MAX_BACKUP_BYTES) });
    expect(codeOf(huge)).toBe('too-big');
    mockPick = { canceled: false, assets: [{ uri: 'file:///picked/huge.json', name: 'huge.json', size: MAX_BACKUP_BYTES + 1, lastModified: NOW }] };
    expect(await pickBackup()).toEqual({ kind: 'error', code: 'too-big' });
  });

  it('bad JSON', () => {
    expect(codeOf('{"apps":[1,2')).toBe('not-json');
    expect(codeOf('')).toBe('not-json');
    // Cut off, but clearly ours: "damaged", not "not an Aurivan backup".
    expect(codeOf('{"app":"aurivan",')).toBe('bad-data');
  });

  it('wrong types, anywhere in the file', () => {
    const cases: ((f: BackupFile) => void)[] = [
      (f) => ((f.stores.progress.state.byCert.cisa.answers as Record<string, unknown>)[Object.keys(f.stores.progress.state.byCert.cisa.answers!)[0]] = { attempts: '3', correctCount: 1, lastCorrect: true, lastAt: 1 }),
      (f) => ((f.stores.progress.state.streak as unknown as Record<string, unknown>).best = -1),
      (f) => ((f.stores.settings.state as unknown as Record<string, unknown>).theme = 'neon'),
      (f) => ((f.stores.settings.state as unknown as Record<string, unknown>).reminder = { enabled: true, hour: 25, minute: 0 }),
      (f) => ((f.stores.progress.state as unknown as Record<string, unknown>).byCert = []),
      (f) => (f.stores.progress.state.byCert.cisa.mocks![0].correct = 99), // more right than asked
      (f) => (Object.values(f.stores.progress.state.byCert.cisa.answers!)[0].correctCount = 9), // more right than tries
      (f) => (f.stores.settings.state.examDates = { cisa: '2026-02-31' }), // no such day
      (f) => (f.stores.settings.state.examDates = { cisa: '1999-12-01' }), // before 2000
      (f) => (Object.values(f.stores.progress.state.byCert.cisa.answers!)[0].lastAt = Date.UTC(2150, 0, 1)),
      (f) => (f.stores.progress.state.byCert.cisa.mocks![0].minutesUsed = 5000),
      (f) => (f.stores.progress.state.byCert.cisa.moments = { readiness: [{ day: '2026-10-01', min: 140, last: 50 }] }),
      (f) => (f.stores.progress.state.byCert.cisa.gameBest = { trap: 1e9 }),
      (f) => ((f.stores as unknown as Record<string, unknown>).settings = 'nope'),
    ];
    for (const change of cases) {
      const f = good();
      change(f);
      expect(codeOf(JSON.stringify(f))).toBe('bad-data');
    }
    // JSON's 1e999 parses as Infinity: not a real number.
    const text = JSON.stringify(good()).replace('"lastAt":', '"lastAt":1e999,"x":');
    expect(codeOf(text)).toBe('bad-data');
  });

  it('an exam this app does not know', () => {
    const f = good();
    (f.stores.progress.state.byCert as Record<string, unknown>).cmmc = {};
    expect(codeOf(JSON.stringify(f))).toBe('unknown-cert');
    const g = good();
    g.stores.settings.state.activeCertId = 'cmmc';
    expect(codeOf(JSON.stringify(g))).toBe('unknown-cert');
  });

  it('caps every list, and refuses prototype keys', () => {
    const f = good();
    f.stores.progress.state.byCert.cisa.bookmarks = Array.from({ length: 5_001 }, (_, i) => `d1_${i}`);
    expect(codeOf(JSON.stringify(f))).toBe('bad-data');
    const text = JSON.stringify(good()).replace('"answers":{', '"answers":{"__proto__":{"attempts":1,"correctCount":1,"lastCorrect":true,"lastAt":1},');
    expect(codeOf(text)).toBe('bad-data');
  });

  it('ignores keys it does not know', () => {
    const f = good() as BackupFile & { extra?: unknown };
    f.extra = { hello: 1 };
    (f.stores.settings.state as unknown as Record<string, unknown>).secretFlag = true;
    (f.stores.progress.state.byCert.cisa as unknown as Record<string, unknown>).unknownList = [1, 2];
    const data = readBackup(JSON.stringify(f), CERTS);
    expect('secretFlag' in data.settings).toBe(false);
    expect('unknownList' in data.progress.byCert.cisa).toBe(false);
  });

  it('nothing changes on the phone, and the learner gets a clear message', async () => {
    studiedLearner();
    const before = { settings: settingsData(), progress: progressData() };
    mockFiles.set('file:///picked/bad.json', '{"app":"other"}');
    mockPick = { canceled: false, assets: [{ uri: 'file:///picked/bad.json', name: 'bad.json', size: 15, lastModified: NOW }] };
    const out = await pickBackup();
    expect(out).toEqual({ kind: 'error', code: 'not-aurivan' });
    expect(settingsData()).toEqual(before.settings);
    expect(progressData()).toEqual(before.progress);
    expect(useBackup.getState().undo).toBeNull();
    for (const copy of Object.values(BACKUP_ERROR_COPY)) expect(copy).toMatch(/Nothing was changed\.$/);
  });

  it('a cancelled pick does nothing', async () => {
    mockPick = { canceled: true, assets: null };
    expect(await pickBackup()).toEqual({ kind: 'cancel' });
  });
});

// ── Preview ──────────────────────────────────────────────────────────────
describe('the preview', () => {
  it('shows exam, date, answered, last studied and best streak, and marks what changes', () => {
    studiedLearner();
    const file = currentBackup(NOW);
    freshInstall();
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.backup).toMatchObject({ exam: 'CISA', examDate: '1 Dec 2026', answered: '3 questions', lastStudied: '10 Oct 2026', bestStreak: '1 day' });
    expect(read.backup.reminder).toMatch(/^Weekdays at 7:30/);
    expect(read.now.reminder).toBe('Off');
    const rows = previewRows(read.now, read.backup);
    expect(rows.map((r) => r.label)).toEqual(['Exam', 'Exam date', 'Questions answered', 'Last studied', 'Best streak', 'Study reminder']);
    expect(rows.find((r) => r.label === 'Exam')!.changes).toBe(false); // CISA → CISA
    expect(rows.find((r) => r.label === 'Questions answered')).toMatchObject({ now: '0 questions', changes: true });
  });

  it('never shows the size of the question bank', () => {
    studiedLearner();
    const read = checkBackupText(JSON.stringify(currentBackup(NOW)));
    if (read.kind !== 'ok') throw new Error(read.code);
    const bank = String(getAllQuestions('cisa').length);
    expect(Object.values(read.backup).join(' ')).not.toContain(bank);
    expect(Object.values(read.backup).join(' ')).not.toMatch(/\bof\b/);
  });

  it('file name and byte size helpers', () => {
    expect(backupFileName(NOW)).toBe('aurivan-backup-2026-10-10.json');
    expect(utf8Bytes('aé€😀')).toBe(1 + 2 + 3 + 4);
  });
});

// ── Undo restore ─────────────────────────────────────────────────────────
describe('undo restore', () => {
  async function restoreOther() {
    // Backup A: an earlier, smaller history.
    freshInstall();
    useSettings.getState().completeOnboarding('cisa', '2027-03-01');
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    const fileA = currentBackup(NOW);
    // The phone now: a learner with more data.
    studiedLearner();
    const before = { settings: settingsData(), progress: progressData() };
    const read = checkBackupText(JSON.stringify(fileA));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    expect(selectCert(useProgress.getState(), 'cisa').answers).toHaveProperty('d1_001');
    expect(useSettings.getState().examDates.cisa).toBe('2027-03-01');
    return before;
  }

  it('brings back exactly what was there before, once', async () => {
    const before = await restoreOther();
    expect(canUndo(NOW + DAY)).toBe(true);
    expect(await undoRestore(NOW + DAY)).toMatchObject({ kind: 'ok' });
    expect(settingsData()).toEqual(before.settings);
    expect(progressData()).toEqual(before.progress);
    // ONE snapshot: used up.
    expect(useBackup.getState().undo).toBeNull();
    expect(canUndo(NOW + DAY)).toBe(false);
  });

  it('expires after 7 days, and an expired undo changes nothing', async () => {
    await restoreOther();
    const restored = progressData();
    expect(canUndo(NOW + UNDO_DAYS * DAY - 1)).toBe(true);
    expect(canUndo(NOW + UNDO_DAYS * DAY)).toBe(false);
    expect(await undoRestore(NOW + UNDO_DAYS * DAY)).toEqual({ kind: 'none' });
    expect(progressData()).toEqual(restored);
    expect(useBackup.getState().undo).toBeNull();
  });

  it('a second restore keeps only the newest snapshot; pruning drops an old one', async () => {
    await restoreOther();
    const first = useBackup.getState().undo!;
    const read = checkBackupText(JSON.stringify(currentBackup(NOW + 1000)));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW + 1000);
    expect(useBackup.getState().undo!.takenAt).toBe(NOW + 1000);
    expect(useBackup.getState().undo).not.toBe(first);
    pruneUndo(NOW + 1000 + UNDO_DAYS * DAY);
    expect(useBackup.getState().undo).toBeNull();
  });
});

// ── Reminders ────────────────────────────────────────────────────────────
describe('reminders after a restore', () => {
  async function restoreWithReminder(reminder: { enabled: boolean; hour: number; minute: number; days?: number[] }) {
    studiedLearner();
    useSettings.setState({ reminder });
    const file = currentBackup(NOW);
    freshInstall();
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    return restoreBackup(read.data, NOW);
  }

  it('are scheduled the way the backup has them, without asking again', async () => {
    expect(await restoreWithReminder({ enabled: true, hour: 7, minute: 30, days: [1, 3, 5] })).toEqual({ kind: 'ok', reminders: 'on' });
    expect([...mockScheduled.keys()].sort()).toEqual([weeklyId(1), weeklyId(3), weeklyId(5)].sort());
    expect(mockScheduled.get(weeklyId(1))!.trigger).toMatchObject({ type: 'weekly', hour: 7, minute: 30 });
    expect(mockPermission.asked).toBe(0); // already allowed: no prompt
  });

  it('ask for permission only when it is missing; a "no" turns the switch off', async () => {
    Object.assign(mockPermission, { granted: false, grantOnAsk: true });
    expect(await restoreWithReminder({ enabled: true, hour: 19, minute: 0 })).toEqual({ kind: 'ok', reminders: 'on' });
    expect(mockPermission.asked).toBe(1);
    expect([...mockScheduled.keys()]).toEqual([DAILY_ID]);

    mockScheduled.clear();
    Object.assign(mockPermission, { granted: false, grantOnAsk: false, asked: 0 });
    expect(await restoreWithReminder({ enabled: true, hour: 19, minute: 0 })).toEqual({ kind: 'ok', reminders: 'blocked' });
    expect(useSettings.getState().reminder.enabled).toBe(false);
    expect(mockScheduled.size).toBe(0);
  });

  it('a backup with reminders off clears ours and never asks', async () => {
    mockScheduled.set(DAILY_ID, { identifier: DAILY_ID });
    Object.assign(mockPermission, { granted: false });
    expect(await restoreWithReminder({ enabled: false, hour: 19, minute: 0 })).toEqual({ kind: 'ok', reminders: 'off' });
    expect(mockScheduled.size).toBe(0);
    expect(mockPermission.asked).toBe(0);
  });
});

// ── Older formats ────────────────────────────────────────────────────────
describe('older formats are upgraded', () => {
  it('a backup whose progress store is version 1 (one `day` plan) is upgraded (and its plan not restored)', () => {
    studiedLearner();
    const f = JSON.parse(JSON.stringify(currentBackup(NOW))) as BackupFile;
    const state = f.stores.progress.state as unknown as Record<string, unknown>;
    const plan = (state.days as Record<string, unknown>).cisa;
    delete state.days;
    state.day = plan;
    f.stores.progress.version = 1;
    const data = readBackup(JSON.stringify(f), CERTS);
    expect(plan).toBeTruthy();
    // Upgraded (day → days), then today's plans are left out like any backup's.
    expect('day' in data.progress).toBe(false);
    expect('days' in data.progress).toBe(false);
    expect(Object.keys(data.progress.byCert.cisa.answers!)).toHaveLength(3);
  });

  it('file-format upgrades run step by step to the current schema', () => {
    // Today schema 1 is current, so there are no steps yet.
    expect(FILE_MIGRATIONS).toEqual({});
    expect(migrateFile({ schema: 1, a: 1 })).toEqual({ schema: 1, a: 1 });
    // A pretend schema 2 that renamed a key: an old file is upgraded.
    const steps = { 1: (f: Record<string, unknown>) => ({ ...f, b: f.a }) };
    expect(migrateFile({ schema: 1, a: 1 }, steps, 2)).toEqual({ schema: 2, a: 1, b: 1 });
    // A gap in the steps is an unknown schema, never a guess.
    expect(() => migrateFile({ schema: 1 }, {}, 2)).toThrow(BackupError);
  });
});

// ── Review fixes (security, code, UX) ────────────────────────────────────
describe('hardening from the reviews', () => {
  const fileOf = () => JSON.parse(JSON.stringify(currentBackup(NOW))) as BackupFile;

  it('keeps only ids that exist in the app (questions, lessons, notes)', () => {
    studiedLearner();
    const f = fileOf();
    const cp = f.stores.progress.state.byCert.cisa;
    const real = Object.keys(cp.answers!)[0];
    cp.answers!.d9_999 = { ...cp.answers![real] };
    cp.review!.made_up = { box: 1, dueAt: NOW, lastSeen: NOW, reps: 1 };
    cp.bookmarks = [...cp.bookmarks!, 'nope'];
    cp.lessonsDone = [...cp.lessonsDone!, 'cisa-l-fake'];
    cp.notesRead = [...cp.notesRead!, '9Z9.9'];
    cp.mastery = { ...cp.mastery, '9Z9.9': { firstDay: '2026-10-01' } };
    const read = checkBackupText(JSON.stringify(f));
    if (read.kind !== 'ok') throw new Error(read.code);
    const out = read.data.progress.byCert.cisa;
    expect(out.answers).toHaveProperty(real);
    expect(out.answers).not.toHaveProperty('d9_999');
    expect(out.review).not.toHaveProperty('made_up');
    expect(out.bookmarks).not.toContain('nope');
    expect(out.lessonsDone).toEqual(['cisa-l-d1-engagement']);
    expect(out.notesRead).toEqual(['4B1.2']);
    expect(Object.keys(out.mastery!)).toEqual(['4B1.2']);
  });

  it('a daily goal outside 10 / 20 / 40 moves to the nearest; mastery may carry firstAt', () => {
    studiedLearner();
    const f = fileOf();
    f.stores.settings.state.dailyGoal = 33;
    f.stores.progress.state.byCert.cisa.mastery = { '4B1.2': { firstDay: '2026-10-01', firstAt: NOW - 9 * DAY } };
    const data = readBackup(JSON.stringify(f), CERTS);
    expect(data.settings.dailyGoal).toBe(40);
    expect(data.progress.byCert.cisa.mastery!['4B1.2'].firstAt).toBe(NOW - 9 * DAY);
  });

  it('a file over the new 1 MB cap is refused, even when every list is within its own cap', () => {
    studiedLearner();
    const f = fileOf();
    // Few keys, long values: ~1.3 MB. (The 1.5 M-character progress cap is a second guard behind this one.)
    f.stores.progress.state.byCert.cisa.mocks = Array.from({ length: 200 }, (_, i) => ({
      id: `m${i}`.padEnd(120, 'x'),
      finishedAt: NOW,
      total: 10,
      correct: 5,
      minutesUsed: 10,
      byDomain: Object.fromEntries(Array.from({ length: 50 }, (_, d) => [`${d}`.padEnd(100, 'd'), { total: 1, correct: 1 }])),
    }));
    expect(utf8Bytes(JSON.stringify(f))).toBeGreaterThan(MAX_BACKUP_BYTES);
    expect(() => readBackup(JSON.stringify(f), CERTS)).toThrow(expect.objectContaining({ code: 'too-big' }));
  });

  it('strips an invisible byte-order mark before reading', () => {
    studiedLearner();
    expect(readBackup('﻿' + JSON.stringify(fileOf()), CERTS).settings.activeCertId).toBe('cisa');
  });

  it('a file from a newer minor version asks to update; a newer patch only when it can’t be read', () => {
    studiedLearner();
    const minor = { ...fileOf(), appVersion: '1.4.0' };
    expect(() => readBackup(JSON.stringify(minor), CERTS, undefined, '1.3.0')).toThrow(expect.objectContaining({ code: 'newer' }));
    const patch = { ...fileOf(), appVersion: '1.3.5' };
    expect(readBackup(JSON.stringify(patch), CERTS, undefined, '1.3.0').settings.activeCertId).toBe('cisa');
    (patch.stores.settings.state as unknown as Record<string, unknown>).theme = 'sepia';
    expect(() => readBackup(JSON.stringify(patch), CERTS, undefined, '1.3.0')).toThrow(expect.objectContaining({ code: 'newer' }));
    // An older or equal app's file with the same problem is just damaged.
    const older = { ...patch, appVersion: '1.3.0' };
    expect(() => readBackup(JSON.stringify(older), CERTS, undefined, '1.3.0')).toThrow(expect.objectContaining({ code: 'bad-data' }));
  });

  it('a file can’t skip or redo onboarding: the phone keeps its own `onboarded`', async () => {
    studiedLearner();
    const f = fileOf();
    f.stores.settings.state.onboarded = false;
    const read = checkBackupText(JSON.stringify(f));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    expect(useSettings.getState().onboarded).toBe(true);
    // The welcome screen's restore finishes onboarding.
    useSettings.setState({ onboarded: false });
    await restoreBackup(read.data, { now: NOW, onboard: true });
    expect(useSettings.getState().onboarded).toBe(true);
  });

  it('writes everything in ONE multiSet; if it fails, the old data is written back and nothing changes', async () => {
    const multiSet = (jest.requireMock('@react-native-async-storage/async-storage') as { multiSet: jest.Mock }).multiSet;
    studiedLearner();
    const file = currentBackup(NOW);
    freshInstall();
    useSettings.setState({ onboarded: true });
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    const before = { settings: settingsData(), progress: progressData() };
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    const first = multiSet.mock.calls.length;
    multiSet.mockImplementationOnce(async () => {
      throw new Error('disk full');
    });
    expect(await restoreBackup(read.data, NOW)).toEqual({ kind: 'failed' });
    const calls = multiSet.mock.calls.slice(first).map(([rows]) => (rows as [string, string][]).map(([k]) => k).sort());
    expect(calls[0]).toEqual(['aurivan.backup.v1', 'aurivan.progress.v1', 'aurivan.session.v1', 'aurivan.settings.v1']);
    expect(calls).toHaveLength(2); // the failed write, then the old rows back
    expect(settingsData()).toEqual(before.settings);
    expect(progressData()).toEqual(before.progress);
    expect(useBackup.getState().undo).toBeNull();
  });

  it('refuses to restore when the phone’s own data couldn’t be undone to', async () => {
    studiedLearner();
    const read = checkBackupText(JSON.stringify(currentBackup(NOW)));
    if (read.kind !== 'ok') throw new Error(read.code);
    // Damage this phone's own data with a wrong TYPE. (Out-of-range numbers
    // and broken totals are now fitted at export, Build D C1; a type error
    // can't be fitted, so the snapshot check must still catch it.)
    const damaged = { id: 'x', finishedAt: NOW, total: 1, correct: 1, minutesUsed: 'long' as unknown as number, byDomain: {} };
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, mocks: [damaged] } } }));
    const before = progressData();
    expect(await restoreBackup(read.data, NOW)).toEqual({ kind: 'no-snapshot' });
    expect(progressData()).toEqual(before);
  });

  it('a damaged undo snapshot is "invalid", not "expired"; a future-dated one is still offered', async () => {
    studiedLearner();
    const read = checkBackupText(JSON.stringify(currentBackup(NOW)));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    // The clock moved back a day: still offered, not deleted.
    expect(canUndo(NOW - DAY)).toBe(true);
    pruneUndo(NOW - DAY);
    expect(useBackup.getState().undo).not.toBeNull();
    // Damage the snapshot.
    const snap = useBackup.getState().undo!;
    useBackup.setState({ undo: { ...snap, file: { ...snap.file, app: 'other' as 'aurivan' } } });
    expect(await undoRestore(NOW + DAY)).toEqual({ kind: 'invalid' });
    expect(useBackup.getState().undo).toBeNull();
  });

  it('remembers when the restored backup was saved, and forgets it on undo', async () => {
    studiedLearner();
    const file = currentBackup(NOW - 3 * DAY);
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    expect(useBackup.getState().restoredSavedAt).toBe(NOW - 3 * DAY);
    await undoRestore(NOW + 1000);
    expect(useBackup.getState().restoredSavedAt).toBeNull();
  });
});

describe('when the app does not know its own version', () => {
  it('never refuses a file as "newer" (the web build has no version)', () => {
    const constants = jest.requireMock('expo-constants') as { default: { expoConfig: { version?: string } } };
    studiedLearner();
    const text = JSON.stringify({ ...currentBackup(NOW), appVersion: '9.9.9' });
    const saved = constants.default.expoConfig.version;
    constants.default.expoConfig.version = undefined;
    try {
      expect(checkBackupText(text).kind).toBe('ok');
      // Files made then say "unknown", which any app can compare safely.
      expect(currentBackup(NOW).appVersion).toBe('unknown');
    } finally {
      constants.default.expoConfig.version = saved;
    }
  });
});
