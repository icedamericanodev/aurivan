/**
 * Content packs, Phase A: the two backup fixes.
 *
 * Fix 1: keepKnownIds trims ids the app's content lacks. For an exam whose
 * content is NOT on this phone (a pack downloaded on another phone), there is
 * nothing to check against, and trimming would wipe that exam's progress. So
 * such an exam is kept exactly as it is.
 *
 * Fix 2: a well-formed cert id this app has no descriptor for
 * (/^[a-z0-9-]{2,20}$/, the database's own rule) no longer refuses the whole
 * backup or sync pull as `unknown-cert`: its data is kept as it is. A
 * malformed id still refuses, and every safety cap still applies.
 */
import { getAllQuestions } from '../content/loader';
import {
  BACKUP_SCHEMA,
  CERT_ID_RE,
  contentInstalled,
  keepKnownIds,
  keepSupportedPlants,
  readBackup,
  readStores,
  type BackupError,
  type BackupProgress,
  type KnownIds,
} from '../engine/backup';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { checkBackupText, currentBackup, knownIds } from '../lib/backup';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T = Date.UTC(2026, 9, 20);
const CERTS = ['cisa', 'cism', 'crisc', 'aaia', 'cissp'];
const ans = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T };

/** Progress on an exam whose content is somewhere else: every kind of id the trim touches. */
const elsewhere = () => ({
  answers: { zz9_001: ans, zz9_002: { ...ans, lastCorrect: false, correctCount: 0 } },
  review: { zz9_002: { box: 1, dueAt: T + 86_400_000, lastSeen: T, reps: 1 } },
  mistakes: { zz9_002: { at: T, picked: 'A' } },
  bookmarks: ['zz9_001'],
  lessonsDone: ['zz9-l-1'],
  notesRead: ['1A1.1'],
  notesViewed: ['1A1.1'],
});

const stores = (byCert: Record<string, unknown>, activeCertId = 'cisa') => ({
  settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId, examDates: { [activeCertId]: '2026-12-01' } } },
  progress: { version: PROGRESS_VERSION, state: { byCert, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } },
});
const file = (byCert: Record<string, unknown>, activeCertId = 'cisa') =>
  JSON.stringify({ app: 'kaisip', schema: BACKUP_SCHEMA, exportedAt: new Date(T).toISOString(), appVersion: '1.46.0', stores: stores(byCert, activeCertId) });

const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'ok';
  } catch (e) {
    return (e as BackupError).code;
  }
};

const EMPTY: KnownIds = { questions: new Set(), lessons: new Set(), notes: new Set() };
const cisaIds = (): KnownIds => ({ installed: true, questions: new Set(['d1_001']), lessons: new Set(['cisa-l-d1-charter']), notes: new Set(['1A1.1']) });

describe('fix 1: an exam with no content on this phone keeps its progress', () => {
  it('keepKnownIds leaves it untouched, and still trims an installed exam', () => {
    const progress = {
      byCert: {
        zz9: elsewhere(),
        cisa: { answers: { d1_001: ans, gone_1: ans }, lessonsDone: ['cisa-l-d1-charter', 'cisa-l-gone'] },
      },
      streak: { current: 0, best: 0, lastDay: null },
    } as unknown as BackupProgress;
    const out = keepKnownIds(progress, (id) => (id === 'cisa' ? cisaIds() : { ...EMPTY, installed: false }));
    expect(out.byCert.zz9).toBe(progress.byCert.zz9); // the very same object: not a field touched
    expect(Object.keys(out.byCert.cisa.answers!)).toEqual(['d1_001']);
    expect(out.byCert.cisa.lessonsDone).toEqual(['cisa-l-d1-charter']);
  });

  it('with no `installed` flag, an exam with no ids at all counts as not installed', () => {
    expect(contentInstalled(EMPTY)).toBe(false);
    expect(contentInstalled({ ...EMPTY, questions: new Set(['x']) })).toBe(true);
    expect(contentInstalled({ ...EMPTY, notes: new Set(['1A1.1']) })).toBe(true);
    expect(contentInstalled({ ...EMPTY, installed: true })).toBe(true);
    const progress = { byCert: { zz9: elsewhere() }, streak: { current: 0, best: 0, lastDay: null } } as unknown as BackupProgress;
    expect(keepKnownIds(progress, () => EMPTY).byCert.zz9).toEqual(elsewhere());
  });

  it('its plant is not clamped against an outline this phone does not have', () => {
    const plant = { growth: 5, reached: 5, pending: 0 };
    const progress = { byCert: { cism: { plant } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as BackupProgress;
    const out = keepSupportedPlants(progress, () => ({ ...EMPTY, installed: false }));
    expect(out.byCert.cism.plant).toBe(progress.byCert.cism.plant);
  });

  it('end to end: restoring a backup keeps CISM progress on a phone with no CISM content', () => {
    // lib/backup's knownIds says CISM is not installed here (it has a descriptor, no pack).
    expect(knownIds('cism').installed).toBe(false);
    expect(knownIds('cisa').installed).toBe(true);
    const f = JSON.parse(JSON.stringify(currentBackup(T)));
    const cism = { answers: { cism_d1_001: ans }, bookmarks: ['cism_d1_001'], lessonsDone: ['cism-l-d1-gov'], notesRead: ['1A1.1'] };
    f.stores.progress.state.byCert.cism = cism;
    const realId = getAllQuestions('cisa')[0].id;
    f.stores.progress.state.byCert.cisa = { ...(f.stores.progress.state.byCert.cisa ?? {}), answers: { [realId]: ans, gone_999: ans } };
    const out = checkBackupText(JSON.stringify(f));
    expect(out.kind).toBe('ok');
    if (out.kind !== 'ok') return;
    expect(out.data.progress.byCert.cism).toEqual(cism); // nothing wiped
    expect(Object.keys(out.data.progress.byCert.cisa.answers ?? {})).toEqual([realId]); // CISA still trimmed
  });
});

describe('fix 2: a well-formed unknown exam id is kept, a malformed one refused', () => {
  it('the id rule is the database’s', () => {
    for (const ok of ['cc', 'cisa', 'cissp', 'sec-plus', 'a1', 'x'.repeat(20)]) expect(CERT_ID_RE.test(ok)).toBe(true);
    for (const bad of ['c', 'CC', 'cc_1', 'cc 1', '__proto__', 'x'.repeat(21), '', 'cc!']) expect(CERT_ID_RE.test(bad)).toBe(false);
  });

  it('a backup file keeps an unknown exam’s data, active exam and exam date as they are', () => {
    const data = readBackup(file({ zz9: elsewhere() }, 'zz9'), CERTS);
    expect(data.progress.byCert.zz9).toEqual(elsewhere());
    expect(data.settings.activeCertId).toBe('zz9');
    expect(data.settings.examDates).toEqual({ zz9: '2026-12-01' });
  });

  it('with the content check on (a real restore), the unknown exam is still untouched (fix 1 + fix 2)', () => {
    const data = readBackup(file({ zz9: elsewhere(), cisa: {} }), CERTS, knownIds);
    expect(data.progress.byCert.zz9).toEqual(elsewhere());
  });

  it('a synced snapshot keeps it too (the same checker)', () => {
    const s = stores({ zz9: elsewhere() });
    const out = readStores(s, { appVersion: '1.46.0' }, CERTS, undefined, '1.46.0', { strict: true });
    expect(out.progress.byCert.zz9).toEqual(elsewhere());
  });

  it('a malformed id still refuses the whole file', () => {
    for (const bad of ['ZZ9', 'zz_9', 'z', 'x'.repeat(21)]) {
      expect(codeOf(() => readBackup(file({ [bad]: {} }), CERTS))).toBe('unknown-cert');
      expect(codeOf(() => readBackup(file({ cisa: {} }, bad), CERTS))).toBe('unknown-cert');
    }
    // A prototype key never gets that far.
    expect(codeOf(() => readStores(JSON.parse(JSON.stringify(stores({})).replace('"byCert":{}', '"byCert":{"__proto__":{}}')), { appVersion: '1.46.0' }, CERTS, undefined, undefined, { strict: true }))).toBe('bad-data');
  });

  it('every safety cap still applies to an unknown exam', () => {
    // Over the per-cert list cap (5,000 ids).
    const tooMany = { bookmarks: Array.from({ length: 5_001 }, (_, i) => `zz9_${i}`) };
    expect(codeOf(() => readBackup(file({ zz9: tooMany }), CERTS))).toBe('bad-data');
    // Wrong types are refused as for any exam.
    expect(codeOf(() => readBackup(file({ zz9: { answers: { zz9_001: { attempts: 'many' } } } }), CERTS))).toBe('bad-data');
    // At most 50 exams in one file.
    const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`ex-${i}`, {}]));
    expect(codeOf(() => readBackup(file(many), CERTS))).toBe('bad-data');
  });
});
