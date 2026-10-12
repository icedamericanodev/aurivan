/**
 * Uplift Phase 7 (sync, built OFF): the pure sync engine. Spec PHASE6_8.md
 * §3.1 S1, §3.4, §3.6 and §3.8 (Jest 1–2).
 *
 * - The validator refactor: a backup file and a synced snapshot go through
 *   ONE checker (readStores); the file reads exactly as before, and the sync
 *   path refuses hostile states.
 * - The merge (engine/syncMerge.ts), as properties over 300 seeded random
 *   pairs and 100 triples: commutative, idempotent, absorbing, associative,
 *   monotone (nothing answered, done, read or earned is lost), and every
 *   result passes the strict checker within the size cap.
 * - Wrong clocks, two phones on alternate days, older app versions.
 * - The planner (engine/syncPlan.ts).
 */
import { CERTIFICATIONS } from '../content/certifications';
import { BackupError, MAX_PROGRESS_CHARS, readBackup, readStores, type BackupProgress, type BackupSettings, type KnownIds } from '../engine/backup';
import { createRng } from '../engine/random';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { dayKey } from '../engine/streak';
import {
  clampFuture,
  DEVICE_LOCAL_PROGRESS,
  DEVICE_LOCAL_SETTINGS,
  fnv1a,
  localSide,
  mergeSides,
  readSnapshot,
  readStamps,
  stableStringify,
  SYNCED_SETTINGS,
  toPayload,
  type Side,
  type Stamps,
  type SyncedProgress,
  type SyncedSettings,
} from '../engine/syncMerge';
import { firstCase, plan, type PlanInput } from '../engine/syncPlan';
import { fitForBackup } from '../engine/backup';
import { DAY, ids, randomCert, randomPlant, randomReports, T0 } from '../../jest/randomState';

// The shared random states import store types (and the stores load AsyncStorage).
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const CERT_IDS = CERTIFICATIONS.map((c) => c.id);
const ctx = { now: T0, knownCertIds: CERT_IDS };
const canon = (x: unknown) => stableStringify(x);
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof BackupError ? e.code : `other: ${String(e)}`;
  }
  return 'ok';
};

// ── Random devices ──────────────────────────────────────────────────────
/** A small pool, so two phones' answers overlap (the realistic case). */
const POOL = ids.slice(0, 80);

/** A random phone: its settings and progress as the stores hold them, plus its stamps. */
function phone(seed: number, base?: number) {
  const rng = createRng(seed * 7919 + 13);
  const n = (k: number) => Math.floor(rng() * k);
  const pickOne = <T,>(xs: readonly T[]) => xs[n(xs.length)];
  // Two phones of one learner share a past (base), then each studies on its own.
  const cert = randomCert(base ?? seed);
  const remap = (qid: string) => (POOL.includes(qid) ? qid : POOL[Math.abs(hash(qid + (base ?? seed))) % POOL.length]);
  cert.answers = Object.fromEntries(Object.entries(cert.answers).map(([k, v]) => [remap(k), v]));
  for (let i = 0; i < n(12); i++) {
    const q = pickOne(POOL);
    const prev = cert.answers[q];
    const attempts = (prev?.attempts ?? 0) + 1 + n(3);
    cert.answers[q] = { attempts, correctCount: n(attempts + 1), lastCorrect: rng() < 0.5, lastAt: T0 - n(20) * DAY - n(1000), ...(rng() < 0.3 ? { lastConfidence: pickOne(['sure', 'unsure', 'guessing'] as const) } : {}) };
  }
  cert.bookmarks = [...new Set(Array.from({ length: n(6) }, () => pickOne(POOL)))];
  cert.lessonsDone = ['cisa-l-d1-engagement', 'cisa-l-d1-charter'].filter(() => rng() < 0.5);
  cert.notesRead = ['1A1.1', '1A1.2', '4B1.2', '5A1.1'].filter(() => rng() < 0.5);
  cert.mistakes = Object.fromEntries(
    Object.keys(cert.answers)
      .slice(0, n(6))
      .map((q) => [q, { at: T0 - n(9) * DAY, ...(rng() < 0.4 ? { slip: pickOne(['role', 'priority', 'misread'] as const) } : {}), ...(rng() < 0.4 ? { resolved: true } : {}) }]),
  );
  cert.mocks = cert.mocks.map((m, i) => ({ ...m, id: `${seed % 3}-m${i}` }));
  cert.review = Object.fromEntries(Object.keys(cert.answers).slice(0, n(10)).map((q) => [q, { box: 1 + n(4), dueAt: T0 + n(9) * DAY, lastSeen: T0 - n(9) * DAY, reps: 1 + n(5) }]));
  if (rng() < 0.5) cert.mastery = { '1A1.1': { firstDay: dayKey(T0 - n(30) * DAY), ...(rng() < 0.5 ? { masteredAt: dayKey(T0 - n(5) * DAY) } : {}) } };
  if (rng() < 0.6) cert.moments = { ...cert.moments, readiness: Array.from({ length: n(5) }, (_, k) => ({ day: dayKey(T0 - k * DAY), min: rng() < 0.2 ? null : 40 + n(40), last: rng() < 0.2 ? null : 40 + n(40) })), ...(rng() < 0.3 ? { readySeenAt: T0 - n(5) * DAY } : {}) };
  const plant = randomPlant(base ?? seed);
  if (plant && rng() < 0.4) plant.name = pickOne(['Kai', 'Ledger', 'Hana']);
  const days = Array.from({ length: n(10) }, (_, k) => dayKey(T0 - (k + n(3)) * DAY));
  const lastDay = days.length ? [...days].sort().pop()! : null;
  const settings = {
    onboarded: true,
    activeCertId: 'cisa',
    examDates: { cisa: pickOne(['2026-12-01', '2027-01-15', '2026-11-20']) },
    theme: pickOne(['system', 'dark', 'light'] as const),
    motion: pickOne(['system', 'reduced'] as const),
    shuffleOptions: rng() < 0.5,
    dailyGoal: pickOne([10, 20, 40]),
    reminder: { enabled: rng() < 0.5, hour: n(24), minute: n(60) },
    haptics: rng() < 0.5,
    gameRulesSeen: ['trap', 'sprint', 'daylight', 'stones'].filter(() => rng() < 0.5),
    practiceTimer: rng() < 0.5,
    ...(rng() < 0.5 ? { studyMode: pickOne(['smart', 'guided', 'inOrder', 'random'] as const) } : {}),
    ...(rng() < 0.5 ? { studySize: pickOne([10, 20, 50]) } : {}),
    badgesHidden: rng() < 0.3,
    ...(rng() < 0.5 ? { familiarity: pickOne(['new', 'some', 'experienced'] as const) } : {}),
    ...(rng() < 0.5 ? { dailyMinutes: pickOne([10, 20, 30, 45] as const) } : {}),
    ...(rng() < 0.3 ? { fitChanges: n(9) } : {}),
  };
  const progress = {
    byCert: { cisa: { ...cert, ...(plant ? { plant } : {}) } },
    streak: { current: n(9), best: 9 + n(20), lastDay, ...(rng() < 0.3 ? { restDay: dayKey(T0 - 3 * DAY) } : {}), recentDays: [...new Set(days)].sort() },
    today: { day: dayKey(T0), answered: n(30) },
    days: {},
    reports: randomReports(seed).slice(0, 6),
    plantSettings: { showPlant: rng() < 0.8 },
  };
  const stamp = () => T0 - n(40) * DAY - n(100_000);
  const stamps = {
    settings: Object.fromEntries(SYNCED_SETTINGS.filter(() => rng() < 0.5).map((f) => [f === 'examDates' ? 'examDates.cisa' : f, stamp()])) as Stamps,
    progress: (rng() < 0.5 ? { 'plant.cisa': stamp() } : {}) as Stamps,
  };
  return { settings, progress, stamps };
}
function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}
/** A phone's two stores as synced sides (fitted and checked, like lib/sync.ts does). */
function sides(p: ReturnType<typeof phone>) {
  const fitted = fitForBackup({ settings: p.settings, progress: p.progress }) as { settings: object; progress: object };
  return {
    settings: localSide<SyncedSettings>('settings', fitted.settings, p.stamps.settings, ctx),
    progress: localSide<SyncedProgress>('progress', fitted.progress, p.stamps.progress, ctx),
  };
}
const M = <T extends SyncedSettings | SyncedProgress>(store: 'settings' | 'progress', a: Side<T>, b: Side<T> | null) => mergeSides<T>(store, a, b, ctx);

// ── §3.6 The validator refactor ─────────────────────────────────────────
describe('readStores: one checker for a backup file and a synced snapshot', () => {
  const settingsState = { onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' } };
  const progressState = (extra: Record<string, unknown> = {}) => ({
    byCert: { cisa: { answers: { [ids[0]]: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: T0 } } } },
    streak: { current: 1, best: 3, lastDay: '2026-10-11' },
    today: { day: '', answered: 0 },
    ...extra,
  });
  const blobs = (p: unknown, s: unknown = settingsState) => ({ settings: { version: SETTINGS_VERSION, state: s }, progress: { version: PROGRESS_VERSION, state: p } });
  const strict = { strict: true } as const;

  it('reads the stores a backup file holds, the same as readBackup', () => {
    const file = { app: 'aurivan', schema: 1, exportedAt: 'x', appVersion: '1.17.0', stores: blobs(progressState()) };
    const viaFile = readBackup(JSON.stringify(file), CERT_IDS);
    const viaStores = readStores(file.stores, { appVersion: '1.17.0' }, CERT_IDS);
    expect(viaStores).toEqual({ settings: viaFile.settings, progress: viaFile.progress });
  });

  it('a pulled state with a __proto__ key is refused (the file reader only drops it)', () => {
    const hostile = JSON.parse(`{"__proto__":{"polluted":true},${JSON.stringify(progressState()).slice(1)}`) as object;
    expect(code(() => readStores(blobs(hostile), { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, strict))).toBe('bad-data');
    // Deep inside a map too.
    const deep = progressState();
    (deep.byCert.cisa as Record<string, unknown>).answers = JSON.parse(`{"__proto__":{"attempts":1}}`);
    expect(code(() => readStores(blobs(deep), { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, strict))).toBe('bad-data');
    // A backup FILE with the same top-level key reads as before (unknown keys are dropped).
    const file = `{"app":"aurivan","schema":1,"exportedAt":"x","appVersion":"1.17.0","stores":${JSON.stringify(blobs(progressState())).replace('"byCert"', '"__proto__":{"x":1},"byCert"')}}`;
    expect(code(() => readBackup(file, CERT_IDS))).toBe('ok');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('a 1.6 M-character state is refused, not cut down', () => {
    const huge = progressState({ junk: 'x'.repeat(1_600_000) });
    expect(code(() => readStores(blobs(huge), { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, strict))).toBe('too-big');
  });

  it('an unknown cert is refused', () => {
    const p = progressState();
    (p.byCert as Record<string, unknown>).cism9 = {};
    expect(code(() => readStores(blobs(p), { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, strict))).toBe('unknown-cert');
  });

  it('a newer app_version gives "newer" (minor); damage from a newer patch reads as "newer" too', () => {
    expect(code(() => readStores(blobs(progressState()), { appVersion: '1.99.0' }, CERT_IDS, undefined, '1.18.0', strict))).toBe('newer');
    const odd = progressState();
    (odd.streak as Record<string, unknown>).best = 'many';
    expect(code(() => readStores(blobs(odd), { appVersion: '1.18.4' }, CERT_IDS, undefined, '1.18.0', strict))).toBe('newer');
    expect(code(() => readStores(blobs(odd), { appVersion: '1.18.0' }, CERT_IDS, undefined, '1.18.0', strict))).toBe('bad-data');
  });

  it('correct > total, and a timestamp past 2100, are refused', () => {
    const p = progressState();
    p.byCert.cisa.answers[ids[0]] = { attempts: 1, correctCount: 3, lastCorrect: true, lastAt: T0 };
    expect(code(() => readStores(blobs(p), { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, strict))).toBe('bad-data');
    const q = progressState();
    q.byCert.cisa.answers[ids[0]] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: Date.UTC(2101, 0, 1) };
    expect(code(() => readStores(blobs(q), { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, strict))).toBe('bad-data');
  });

  it('unknown ids are dropped when the content is given (keepKnownIds), kept when not', () => {
    const p = progressState();
    p.byCert.cisa.answers.d9_999 = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 };
    const known = (): KnownIds => ({ questions: new Set(ids), lessons: new Set(), notes: new Set() });
    expect(Object.keys(readStores(blobs(p), { appVersion: '1.17.0' }, CERT_IDS, known).progress.byCert.cisa.answers!)).toEqual([ids[0]]);
    expect(Object.keys(readStores(blobs(p), { appVersion: '1.17.0' }, CERT_IDS).progress.byCert.cisa.answers!)).toContain('d9_999');
  });

  it('only: one store at a time (a pull fetches the store whose rev changed)', () => {
    const out = readStores({ progress: { version: PROGRESS_VERSION, state: progressState() } }, { appVersion: '1.17.0' }, CERT_IDS, undefined, undefined, { only: 'progress' });
    expect(out.progress.byCert.cisa).toBeDefined();
    expect(out.settings).toBeUndefined();
  });
});

// ── What syncs ──────────────────────────────────────────────────────────
describe('what syncs and what stays on the phone (§3.4)', () => {
  it('every saved setting is either synced or device-local, never both, never neither', () => {
    const all = ['onboarded', 'activeCertId', 'examDates', 'theme', 'motion', 'shuffleOptions', 'dailyGoal', 'reminder', 'haptics', 'gameRulesSeen', 'practiceTimer', 'paceOffer', 'studyMode', 'studyDomain', 'studySize', 'badgesHidden', 'familiarity', 'dailyMinutes', 'examFocused', 'fitPrompt', 'fitChanges', 'fitAskDays'];
    const synced = new Set<string>(SYNCED_SETTINGS);
    const local = new Set<string>(DEVICE_LOCAL_SETTINGS);
    for (const k of all) expect(`${k}: ${Number(synced.has(k)) + Number(local.has(k))}`).toBe(`${k}: 1`);
    for (const k of ['reminder', 'theme', 'motion', 'haptics', 'onboarded']) expect(local.has(k)).toBe(true);
    expect([...DEVICE_LOCAL_PROGRESS].sort()).toEqual(['days', 'plantSettings', 'today']);
  });

  it('a synced side carries no device-local field', () => {
    const s = sides(phone(4));
    for (const k of DEVICE_LOCAL_SETTINGS) expect(s.settings.state).not.toHaveProperty(k);
    for (const k of DEVICE_LOCAL_PROGRESS) expect(s.progress.state).not.toHaveProperty(k);
    expect(toPayload(s.settings)).toHaveProperty('changedAt');
  });
});

// ── §3.1 S1: merge properties ───────────────────────────────────────────
describe('merge properties over 300 seeded random pairs (S1)', () => {
  const PAIRS = 300;
  // Half the pairs share a past (two phones of one learner), half are strangers.
  const pairs = Array.from({ length: PAIRS }, (_, i) => {
    const seed = i + 1;
    const base = i % 2 === 0 ? 1000 + Math.floor(i / 2) : undefined;
    return [sides(phone(seed * 2, base)), sides(phone(seed * 2 + 1, base))] as const;
  });

  it('commutative: M(a, b) ≡ M(b, a)', () => {
    for (const [a, b] of pairs) {
      expect(canon(M('settings', a.settings, b.settings))).toBe(canon(M('settings', b.settings, a.settings)));
      expect(canon(M('progress', a.progress, b.progress))).toBe(canon(M('progress', b.progress, a.progress)));
    }
  });

  it('idempotent: M(a, a) ≡ fit(a)', () => {
    for (const [a] of pairs) {
      expect(canon(M('settings', a.settings, a.settings))).toBe(canon(M('settings', a.settings, null)));
      expect(canon(M('progress', a.progress, a.progress))).toBe(canon(M('progress', a.progress, null)));
    }
  });

  it('absorbing: M(M(a, b), b) ≡ M(a, b)', () => {
    for (const [a, b] of pairs) {
      const ab = M('progress', a.progress, b.progress);
      expect(canon(M('progress', ab, b.progress))).toBe(canon(ab));
      const sab = M('settings', a.settings, b.settings);
      expect(canon(M('settings', sab, b.settings))).toBe(canon(sab));
    }
  });

  it('associative over 100 triples: M(M(a, b), c) ≡ M(a, M(b, c))', () => {
    for (let i = 0; i < 100; i++) {
      const base = 5000 + Math.floor(i / 3);
      const [a, b, c] = [1, 2, 3].map((k) => sides(phone(9000 + i * 3 + k, i % 3 === 0 ? undefined : base)));
      for (const store of ['settings', 'progress'] as const) {
        const left = M(store, M(store, a[store] as Side<SyncedProgress>, b[store] as Side<SyncedProgress>), c[store] as Side<SyncedProgress>);
        const right = M(store, a[store] as Side<SyncedProgress>, M(store, b[store] as Side<SyncedProgress>, c[store] as Side<SyncedProgress>));
        expect(`${i} ${store}: ${canon(left)}`).toBe(`${i} ${store}: ${canon(right)}`);
      }
    }
  });

  it('monotone: nothing answered, done, read or earned is lost; attempts are at least the max', () => {
    for (const [a, b] of pairs) {
      const m = M('progress', a.progress, b.progress).state.byCert.cisa;
      for (const side of [a.progress.state.byCert.cisa, b.progress.state.byCert.cisa]) {
        if (!side) continue;
        for (const [q, rec] of Object.entries(side.answers ?? {})) {
          expect(m.answers?.[q]).toBeDefined();
          expect(m.answers![q].attempts).toBeGreaterThanOrEqual(rec.attempts);
          expect(m.answers![q].correctCount).toBeGreaterThanOrEqual(Math.min(rec.correctCount, m.answers![q].attempts));
        }
        for (const l of side.lessonsDone ?? []) expect(m.lessonsDone).toContain(l);
        for (const nId of side.notesRead ?? []) expect(m.notesRead).toContain(nId);
        for (const bId of side.bookmarks ?? []) expect(m.bookmarks).toContain(bId);
        // The inputs went through the checker, so every mark they hold is supported by their own data.
        for (const k of Object.keys(side.milestones?.earned ?? {})) expect(`${k}: ${m.milestones?.earned[k] !== undefined}`).toBe(`${k}: true`);
        for (const g of Object.keys(side.gameBest ?? {}) as (keyof NonNullable<typeof side.gameBest>)[]) expect(m.gameBest?.[g]).toBeGreaterThanOrEqual(side.gameBest![g]!);
        if (side.plant && m.plant && m.plant.plantedAt === side.plant.plantedAt && m.plant.replantedAt === side.plant.replantedAt) {
          expect(m.plant.growth).toBeGreaterThanOrEqual(side.plant.growth);
        }
      }
      const s = M('progress', a.progress, b.progress).state.streak;
      expect(s.best).toBeGreaterThanOrEqual(Math.max(a.progress.state.streak.best, b.progress.state.streak.best));
    }
  });

  it('every result passes the strict checker, within the size cap', () => {
    for (const [a, b] of pairs) {
      const p = M('progress', a.progress, b.progress);
      const s = M('settings', a.settings, b.settings);
      const st = { settings: { version: SETTINGS_VERSION, state: { ...s.state, onboarded: true } }, progress: { version: PROGRESS_VERSION, state: { ...p.state, today: { day: '', answered: 0 } } } };
      expect(code(() => readStores(st, { appVersion: '1.18.0' }, CERT_IDS, undefined, '1.18.0', { strict: true }))).toBe('ok');
      expect(JSON.stringify(p.state).length).toBeLessThanOrEqual(MAX_PROGRESS_CHARS);
    }
  });
});

// ── The rules, one by one ───────────────────────────────────────────────
describe('merge rules (§3.4)', () => {
  const side = <T,>(state: T, stamps: Stamps = {}): Side<T> => ({ state, stamps });
  const prog = (cisa: Record<string, unknown>, streak: Record<string, unknown> = { current: 0, best: 0, lastDay: null }) => ({ byCert: { cisa }, streak }) as unknown as SyncedProgress;
  const set = (s: Record<string, unknown>) => ({ activeCertId: 'cisa', ...s }) as unknown as SyncedSettings;

  it('settings: last writer wins per field; a missing stamp counts as 0; ties go by value', () => {
    const a = side(set({ dailyGoal: 10, examDates: { cisa: '2026-12-01' } }), { dailyGoal: T0 - DAY, 'examDates.cisa': T0 });
    const b = side(set({ dailyGoal: 40, examDates: { cisa: '2027-01-15' } }), { dailyGoal: T0 });
    const m = M('settings', a, b);
    expect(m.state.dailyGoal).toBe(40);
    expect(m.state.examDates).toEqual({ cisa: '2026-12-01' });
    expect(m.stamps).toEqual({ dailyGoal: T0, 'examDates.cisa': T0 });
    // No stamps anywhere (two phones from before sync): the same answer both ways.
    expect(M('settings', side(set({ dailyGoal: 10 })), side(set({ dailyGoal: 20 }))).state.dailyGoal).toBe(M('settings', side(set({ dailyGoal: 20 })), side(set({ dailyGoal: 10 }))).state.dailyGoal);
  });

  it('answers: attempts and correct take the max (never inflated); "last" fields from the later answer', () => {
    const q = ids[0];
    const a = side(prog({ answers: { [q]: { attempts: 3, correctCount: 1, lastCorrect: false, lastAt: T0 - DAY, lastConfidence: 'sure' } } }));
    const b = side(prog({ answers: { [q]: { attempts: 2, correctCount: 2, lastCorrect: true, lastAt: T0 } } }));
    expect(M('progress', a, b).state.byCert.cisa.answers![q]).toEqual({ attempts: 3, correctCount: 2, lastCorrect: true, lastAt: T0 });
  });

  it('review and cards: the later one whole; mistakes: the later one, "fixed" OR-ed at the same moment, a slip tag kept', () => {
    const q = ids[1];
    const a = side(prog({ review: { [q]: { box: 4, dueAt: T0 + 9 * DAY, lastSeen: T0 - DAY, reps: 5 } }, mistakes: { [q]: { at: T0, resolved: true, slip: 'role' } } }));
    const b = side(prog({ review: { [q]: { box: 1, dueAt: T0 + DAY, lastSeen: T0, reps: 6 } }, mistakes: { [q]: { at: T0, fixedLater: true } } }));
    const m = M('progress', a, b).state.byCert.cisa;
    expect(m.review![q]).toEqual({ box: 1, dueAt: T0 + DAY, lastSeen: T0, reps: 6 });
    expect(m.mistakes![q]).toEqual({ at: T0, resolved: true, fixedLater: true, slip: 'role' });
    // Missed again later on the other phone: the new miss wins (not "fixed"), the slip tag stays.
    const c = side(prog({ mistakes: { [q]: { at: T0 + 1000 } } }));
    expect(M('progress', a, c).state.byCert.cisa.mistakes![q]).toEqual({ at: T0 + 1000, slip: 'role' });
  });

  it('mocks: union by id, newest first, at most 50', () => {
    const mock = (id: string, at: number) => ({ id, finishedAt: at, total: 10, correct: 5, minutesUsed: 10, byDomain: {} });
    const a = side(prog({ mocks: Array.from({ length: 30 }, (_, i) => mock(`a${i}`, T0 - i * 1000)) }));
    const b = side(prog({ mocks: Array.from({ length: 30 }, (_, i) => mock(`b${i}`, T0 - i * 1000 - 500)) }));
    const m = M('progress', a, b).state.byCert.cisa.mocks!;
    expect(m).toHaveLength(50);
    expect(m[0].id).toBe('a0');
    expect(m.map((x) => x.finishedAt)).toEqual([...m.map((x) => x.finishedAt)].sort((x, y) => y - x));
  });

  it('the streak: two phones on alternate days make one streak; best is the max', () => {
    const days = (ks: number[]) => ks.map((k) => dayKey(T0 - k * DAY));
    const a = side(prog({}, { current: 1, best: 4, lastDay: dayKey(T0), recentDays: days([4, 2, 0]).sort() }));
    const b = side(prog({}, { current: 1, best: 2, lastDay: dayKey(T0 - DAY), recentDays: days([3, 1]).sort() }));
    const s = M('progress', a, b).state.streak;
    expect(s.lastDay).toBe(dayKey(T0));
    expect(s.current).toBe(5);
    expect(s.best).toBe(5);
    expect(s.recentDays).toEqual(days([4, 3, 2, 1, 0]).sort());
  });

  it('the plant: the later planting wins; the same plant keeps the higher growth and the last-edited name', () => {
    const plant = (o: Record<string, unknown>) => ({ species: 'oak', name: 'Kai', plantedAt: T0 - 30 * DAY, growth: 1, ...o });
    const answers = Object.fromEntries(ids.slice(0, 60).map((q) => [q, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - DAY }]));
    const a = side(prog({ answers, plant: plant({ growth: 2, name: 'Kai' }) }), { 'plant.cisa': T0 - DAY });
    const b = side(prog({ answers, plant: plant({ growth: 1, name: 'Ledger' }) }), { 'plant.cisa': T0 });
    const m = M('progress', a, b).state.byCert.cisa.plant!;
    expect(m.name).toBe('Ledger');
    expect(m.growth).toBe(Math.min(2, M('progress', a, null).state.byCert.cisa.plant!.growth));
    // Replanted on one phone later: that plant, whole.
    const c = side(prog({ answers, plant: plant({ species: 'lotus', name: 'Hana', replantedAt: T0 - DAY }) }));
    expect(M('progress', a, c).state.byCert.cisa.plant!.species).toBe('lotus');
  });

  it('reports: one per ref, newest first; "your report helped" seen on either phone counts', () => {
    const r = (ref: string, at: number, seen?: boolean) => ({ ref, item: 'q:d1_001', reason: 'key', at, cert: 'cisa', ...(seen ? { creditSeen: true } : {}) });
    const a = side({ ...prog({}), reports: [r('R-AAAA', T0), r('R-BBBB', T0 - DAY)] } as SyncedProgress);
    const b = side({ ...prog({}), reports: [r('R-BBBB', T0 - DAY, true), r('R-CCCC', T0 - 2 * DAY)] } as SyncedProgress);
    expect(M('progress', a, b).state.reports).toEqual([r('R-AAAA', T0), r('R-BBBB', T0 - DAY, true), r('R-CCCC', T0 - 2 * DAY)]);
  });
});

// ── Wrong clocks ─────────────────────────────────────────────────────────
describe('clock skew', () => {
  it('a time more than a day ahead is pulled back to now before merging (a wrong clock can’t win forever)', () => {
    const q = ids[2];
    const ahead = T0 + 30 * DAY;
    const skewed: Side<SyncedProgress> = { state: { byCert: { cisa: { answers: { [q]: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: ahead } } } }, streak: { current: 1, best: 1, lastDay: dayKey(ahead) } } as SyncedProgress, stamps: { 'plant.cisa': ahead } };
    const c = clampFuture('progress', skewed, T0);
    expect(c.state.byCert.cisa.answers![q].lastAt).toBe(T0);
    expect(c.state.streak.lastDay).toBe(dayKey(T0));
    // A stamp from the future counts as "unknown" (0): it loses to any real change.
    expect(c.stamps['plant.cisa']).toBeUndefined();
    // An honest later answer (an hour from now, inside the slack) is not touched.
    const soon = { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: T0 + 3_600_000 };
    const honest = clampFuture('progress', { state: { ...skewed.state, byCert: { cisa: { answers: { [q]: soon } } } } as SyncedProgress, stamps: {} }, T0);
    expect(honest.state.byCert.cisa.answers![q].lastAt).toBe(T0 + 3_600_000);
  });

  it('settings: a stamp from a phone set a year ahead does not beat a real change made today', () => {
    const set = (g: number) => ({ activeCertId: 'cisa', dailyGoal: g }) as unknown as SyncedSettings;
    const wrong = { state: set(10), stamps: { dailyGoal: T0 + 365 * DAY } };
    const today = { state: set(40), stamps: { dailyGoal: T0 + 1000 } };
    expect(mergeSides('settings', wrong, today, ctx).state.dailyGoal).toBe(40);
  });
});

// ── Pulled snapshots: older apps, stamps ─────────────────────────────────
describe('readSnapshot', () => {
  it('a snapshot from an older app (no newer fields) merges with this phone’s newer fields kept', () => {
    const local = sides(phone(41));
    const old = { byCert: { cisa: { answers: { [ids[5]]: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 } }, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } }, streak: { current: 1, best: 1, lastDay: dayKey(T0) } };
    const remote = readSnapshot<SyncedProgress>('progress', { state: old, storeVersion: PROGRESS_VERSION, appVersion: '1.1.0' }, { ...ctx, thisApp: '1.18.0' });
    const m = M('progress', local.progress, remote).state.byCert.cisa;
    expect(m.answers![ids[5]]).toBeDefined();
    if (local.progress.state.byCert.cisa.plant) expect(m.plant).toBeDefined();
  });

  it('a snapshot from a newer minor app is "newer"; stamps are checked and hostile ones dropped', () => {
    expect(code(() => readSnapshot('settings', { state: { activeCertId: 'cisa' }, storeVersion: SETTINGS_VERSION, appVersion: '1.30.0' }, { ...ctx, thisApp: '1.18.0' }))).toBe('newer');
    expect(readStamps({ dailyGoal: T0, 'bad key': T0, huge: Date.UTC(2200, 0, 1), neg: -1, str: 'x' })).toEqual({ dailyGoal: T0 });
    expect(readStamps('nope')).toEqual({});
  });

  it('device-local fields in a pulled snapshot are ignored', () => {
    const r = readSnapshot<SyncedSettings>('settings', { state: { activeCertId: 'cisa', theme: 'dark', reminder: { enabled: true, hour: 3, minute: 0 }, onboarded: false }, storeVersion: SETTINGS_VERSION, appVersion: '1.18.0' }, ctx);
    expect(r.state).toEqual({ activeCertId: 'cisa' });
  });
});

describe('hashing', () => {
  it('equal data gives an equal fingerprint whatever the key order', () => {
    expect(fnv1a(stableStringify({ a: 1, b: [1, { c: 2, d: 3 }] }))).toBe(fnv1a(stableStringify({ b: [1, { d: 3, c: 2 }], a: 1 })));
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });
});

// ── engine/syncPlan.ts ──────────────────────────────────────────────────
describe('syncPlan', () => {
  const base: PlanInput = { head: { rev: 4, appVersion: '1.18.0' }, meta: { lastRev: 4, lastPushedHash: 'h1' }, setUp: true, switchPending: false, localHash: 'h1', localEmpty: false, thisApp: '1.18.0' };
  const p = (o: Partial<PlanInput>) => plan({ ...base, ...o });

  it('idle, push, pull and merge', () => {
    expect(p({})).toEqual({ kind: 'idle' });
    expect(p({ localHash: 'h2' })).toEqual({ kind: 'push', expectedRev: 4 });
    expect(p({ head: { rev: 5, appVersion: '1.18.0' } })).toEqual({ kind: 'pull' });
    expect(p({ head: { rev: 5, appVersion: '1.18.0' }, localHash: 'h2' })).toEqual({ kind: 'merge', expectedRev: 5 });
  });

  it('first sync on this phone: the preview’s case', () => {
    expect(p({ setUp: false })).toEqual({ kind: 'first', case: 'both' });
    expect(p({ setUp: false, head: null })).toEqual({ kind: 'first', case: 'phone' });
    expect(p({ setUp: false, localEmpty: true })).toEqual({ kind: 'first', case: 'account' });
    expect(p({ setUp: false, localEmpty: true, head: null })).toEqual({ kind: 'first', case: 'none' });
    expect(firstCase(true, false)).toBe('none');
  });

  it('pauses: a newer app wrote it, an account switch is waiting, the account’s copy was deleted', () => {
    expect(p({ head: { rev: 9, appVersion: '1.19.0' }, localHash: 'h2' })).toEqual({ kind: 'pause', reason: 'newer' });
    expect(p({ head: { rev: 9, appVersion: '2.0.0' } })).toEqual({ kind: 'pause', reason: 'newer' });
    // A newer PATCH is fine to read (the checker decides).
    expect(p({ head: { rev: 5, appVersion: '1.18.3' } })).toEqual({ kind: 'pull' });
    expect(p({ switchPending: true })).toEqual({ kind: 'pause', reason: 'switch' });
    expect(p({ head: null })).toEqual({ kind: 'pause', reason: 'remote_deleted' });
  });

  it('an empty phone is never pushed over the account’s progress (#3)', () => {
    expect(p({ localEmpty: true, localHash: 'h-empty' })).toEqual({ kind: 'merge', expectedRev: 4 });
    // With nothing on the account, an empty phone may push (there is nothing to overwrite).
    expect(p({ localEmpty: true, localHash: 'h-empty', head: null, meta: { lastRev: null, lastPushedHash: null } })).toEqual({ kind: 'push', expectedRev: null });
  });
});

// Settings types are used above through the generator; keep the compiler honest about the shapes.
void ({} as BackupSettings | BackupProgress);
