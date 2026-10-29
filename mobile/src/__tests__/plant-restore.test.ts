/**
 * PR #43 review, the restore principle: a restore must NEVER lower growth an
 * honest file earned. It only blocks a claim beyond what the file's evidence
 * could support (engine/plant.ts maxSupportedGrowth: the live gates on the
 * best-case facts).
 *
 * - The property: random honest study histories on the real stores (clean,
 *   Coach me and game answers on many days, mocks of every size, more than
 *   the 50 the history keeps, the exam-ready panel, long breaks that scroll
 *   the readiness log): export → read → restore keeps the plant EXACTLY, and
 *   the next check never replays a "grew to …" for a growth already reached.
 * - The review's probes as regression cases: P1a (Elder with one domain at
 *   12 answers), P1b (the 50+ mock scrolled out of the newest 50), P1c (a
 *   notes rewrite renamed subtopic ids), P2 (a file with no entry for the
 *   exam keeps the phone's plant) and P3b (games can't open Elder).
 */
import { getAllQuestions, getDomainQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { BACKUP_APP, BACKUP_SCHEMA, readBackup } from '../engine/backup';
import { MAX_MOCKS } from '../engine/journey';
import { growthFor, isValidPlantState, plantFacts, type PlantMock } from '../engine/plant';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { dayKey } from '../engine/streak';
import { checkBackupText, currentBackup, knownIds, restoreBackup } from '../lib/backup';
import { checkPlant, plantFactsFor, plantFor, plantSubtopics } from '../lib/plant';
import { selectCert, useProgress, type MockResult } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, AppState: { addEventListener: () => ({ remove: () => {} }) } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.13.0' } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const DAY = 86_400_000;
const cert = getCertification('cisa')!;
const cp = () => selectCert(useProgress.getState(), 'cisa');
const byDomain = (d: string) => getDomainQuestions('cisa', d);

function mock(total: number, at: number, extra: Partial<MockResult> = {}): MockResult {
  return { id: `m${at}-${total}`, finishedAt: at, total, correct: Math.round(total * 0.8), minutesUsed: 10, byDomain: {}, timing: 'standard', unanswered: 0, ...extra };
}
/** Clean, correct answers: `perDomain[i]` questions in domain i+1. */
function answerClean(perDomain: number[], at = T0 - 20 * DAY) {
  perDomain.forEach((n, i) => {
    for (const q of byDomain(String(i + 1)).slice(0, n)) useProgress.getState().recordAnswer('cisa', q.id, true, undefined, { at });
  });
}
/** Every outline subtopic with practice questions, mastered long ago (two days apart). */
function masterAll() {
  const mastery: Record<string, { firstDay: string; masteredAt: string }> = {};
  for (const s of plantSubtopics('cisa').flat()) mastery[s] = { firstDay: '2026-09-01', masteredAt: '2026-09-03' };
  // Mobile 1.50: a learner this far along also recalled questions a week after seeing them (the later forms' gate).
  setCert({ mastery, milestones: { ...(cp().milestones ?? { earned: {} }), longIds: Object.keys(cp().answers).slice(0, 40) } });
}
function setCert(patch: Record<string, unknown>) {
  const c = cp();
  useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: { ...c, ...patch } } }));
}
/** Export this phone and read the file back, as the restore preview does. */
function roundTrip() {
  const read = checkBackupText(JSON.stringify(currentBackup()));
  if (read.kind !== 'ok') throw new Error(read.code);
  return read;
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, plantSettings: undefined, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2027-06-01' } });
});
afterEach(() => jest.useRealTimers());

// ── The property ─────────────────────────────────────────────────────────
describe('export → restore never changes an honest plant', () => {
  const RUNS = 14;
  const seeds = Array.from({ length: RUNS }, (_, k) => 101 + k * 37);
  const reached: number[] = [];

  afterAll(() => {
    // The histories really reach the high growths (otherwise the property says little).
    expect(Math.max(...reached)).toBe(6);
    expect(new Set(reached).size).toBeGreaterThanOrEqual(4);
  });

  it.each(seeds)('random honest history (seed %i)', async (seed) => {
    let s = seed;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const bank = getAllQuestions('cisa');
    const skill = 0.55 + 0.43 * rnd(); // how often this learner is right
    plantFor('cisa', 'oak', 'Kai');
    let now = T0;
    const checks: { day: number; growth: number }[] = [];
    const studyDay = (right: number, answers: number) => {
      for (let k = 0; k < answers; k++) {
        const q = bank[Math.floor(rnd() * bank.length)];
        const r = rnd();
        // Mostly clean answers; some with Coach me, some in games.
        const opts = r < 0.1 ? { assisted: true } : r < 0.2 ? { mastery: false } : {};
        useProgress.getState().recordAnswer('cisa', q.id, rnd() < right, undefined, opts);
      }
    };
    const days = 6 + Math.floor(rnd() * 64);
    for (let day = 0; day < days; day++) {
      now += DAY;
      jest.setSystemTime(now);
      if (rnd() < 0.8) studyDay(skill, 10 + Math.floor(rnd() * 40));
      if (rnd() < 0.5) useProgress.getState().logReadinessNow('cisa'); // Today opened
      if (rnd() < 0.15) {
        const total = [10, 50, cert.exam.questions][Math.floor(rnd() * 3)];
        useProgress.getState().recordMock('cisa', mock(total, now, { timing: rnd() < 0.8 ? 'standard' : 'untimed', unanswered: rnd() < 0.8 ? 0 : 3, correct: Math.round(total * skill) }));
      }
      if (rnd() < 0.05) useProgress.getState().dismissReady('cisa');
      const g = checkPlant('cisa');
      if (g) checks.push({ day, growth: g });
    }
    // Then, for half the learners, a long tail that scrolls the evidence out
    // of the save: many mini mocks (past the newest MAX_MOCKS) and weeks away
    // (past the readiness log), with weaker answers on return.
    if (rnd() < 0.5) {
      for (let k = 0; k < MAX_MOCKS + 5; k++) useProgress.getState().recordMock('cisa', mock(10, now + k * 60_000));
      now += 45 * DAY;
      jest.setSystemTime(now);
      studyDay(0.4, 30);
      checkPlant('cisa');
    }
    const live = cp().plant!;
    reached.push(live.growth);
    if (process.env.PLANT_RESTORE_DEBUG) console.log(`seed ${seed}: skill ${skill.toFixed(2)}, ${days} days → growth ${live.growth}`);
    expect(isValidPlantState(live)).toBe(true);

    // Export → read: the same plant, nothing lowered.
    const read = roundTrip();
    expect(read.data.progress.byCert.cisa.plant).toEqual(live);

    // Restore on a fresh phone, then the next check: nothing replays.
    useProgress.setState({ byCert: {} });
    await restoreBackup(read.data, { fresh: true });
    expect(cp().plant).toEqual(live);
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant!.pending).toBe(live.pending);
  });
});

// ── The review's probes, as regression cases ─────────────────────────────
describe('code review B1: the clamp is never stricter than the live gates', () => {
  it('P1a: a plant grown live to Elder with one domain at 12 clean answers keeps Elder through its own backup', () => {
    // 12 answers in IS Acquisition (12%), 40 elsewhere: mastery = credit / max(n, 10) reaches 0.65 with 10.
    answerClean([40, 40, 12, 40, 40]);
    masterAll();
    setCert({ mocks: [mock(150, T0 - DAY)], moments: { ...(cp().moments ?? {}), readySeenAt: T0 - 2 * DAY } });
    plantFor('cisa', 'oak', 'Kai');
    expect(cp().plant!.growth).toBe(6);
    expect(roundTrip().data.progress.byCert.cisa.plant!.growth).toBe(6);
  });

  it('P1b: a 50+ mock that scrolled out of the newest 50 never clamps a Crown', () => {
    answerClean([40, 40, 40, 40, 40]);
    masterAll();
    setCert({ mocks: [mock(50, T0 - 40 * DAY)] });
    plantFor('cisa', 'mango', 'Amber');
    const g = cp().plant!.growth;
    expect(g).toBeGreaterThanOrEqual(5);
    for (let k = 0; k < MAX_MOCKS; k++) useProgress.getState().recordMock('cisa', mock(10, T0 - (39 - k / 2) * DAY));
    expect(cp().mocks).toHaveLength(MAX_MOCKS);
    expect(cp().mocks.some((m) => m.total >= 50)).toBe(false);
    expect(roundTrip().data.progress.byCert.cisa.plant!.growth).toBe(g);
  });

  it('P1c: a notes rewrite that renamed subtopic ids never clamps a restored plant', () => {
    answerClean([40, 40, 40, 40, 40]);
    masterAll();
    setCert({ mocks: [mock(50, T0 - DAY)] });
    plantFor('cisa', 'lotus', 'Padma');
    const file = JSON.stringify(currentBackup(T0));
    // The same file read by an app whose outline renamed 70% of its subtopic ids.
    const outline = plantSubtopics('cisa').map((ids) => ids.map((id, k) => (k % 10 < 7 ? `${id}-v2` : id)));
    const data = readBackup(file, ['cisa'], (id) => ({ ...knownIds(id), plantOutline: outline }));
    expect(data.progress.byCert.cisa.plant!.growth).toBe(cp().plant!.growth);
  });

  it('still lowers a claim the file cannot support (a tampered Elder with a few answers)', () => {
    answerClean([5, 5, 5, 5, 5]);
    plantFor('cisa', 'oak', 'Kai');
    const file = currentBackup(T0) as unknown as { stores: { progress: { state: { byCert: { cisa: { plant: Record<string, unknown> } } } } } };
    file.stores.progress.state.byCert.cisa.plant = { ...file.stores.progress.state.byCert.cisa.plant, growth: 6, pending: 6 };
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.plant).toMatchObject({ growth: 2 });
    expect(read.data.progress.byCert.cisa.plant!.pending).toBeUndefined();
  });
});

describe('QA 7 / P2: a file with no entry for the exam keeps the phone’s plant', () => {
  it('the plant comes back as itself, grown quietly from the (empty) restored data', async () => {
    plantFor('cisa', 'narra', 'Tala');
    const file = JSON.stringify({
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      exportedAt: new Date(T0).toISOString(),
      appVersion: '1.12.0',
      stores: {
        settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId: 'cisa' } },
        progress: { version: PROGRESS_VERSION, state: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } },
      },
    });
    const read = checkBackupText(file);
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, { now: T0, fresh: true });
    expect(cp().plant).toMatchObject({ species: 'narra', name: 'Tala', growth: 1 });
    expect(cp().plant!.pending).toBeUndefined();
  });
});

describe('code review B2 / P3b: games can never open Elder', () => {
  it('a week of 80+ in the (game-inclusive) log with a clean low end under 80 stays below Elder', () => {
    const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
    for (const d of ['1', '2', '3', '4', '5'])
      byDomain(d)
        .slice(0, 40)
        .forEach((q, k) => {
          const ok = k % 4 !== 0; // 75% right
          answers[q.id] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: T0 };
        });
    const mastery = Object.fromEntries(plantSubtopics('cisa').flat().map((s) => [s, { firstDay: '2026-09-01', masteredAt: '2026-09-03' }]));
    const readinessLog = Array.from({ length: 8 }, (_, k) => ({ day: `2026-10-${String(5 + k).padStart(2, '0')}`, min: 81, last: 81 }));
    const mocks: PlantMock[] = [{ total: 150, correct: 110, day: '2026-10-10', timing: 'standard', unanswered: 0 }];
    const f = plantFacts({ cert, answers: answers as never, mastery: mastery as never, subtopicsByDomain: plantSubtopics('cisa'), mocks, readinessLog, readySeenAt: T0, today: '2026-10-12' });
    expect(f.low!).toBeLessThan(80);
    expect(f.readyHeld).toBe(false);
    expect(growthFor(f)).toBe(5);
  });

  it('on the store: game rounds that lift the logged low over 80 for a week never grow Elder', () => {
    answerClean([40, 40, 40, 40, 40]);
    // Wrong clean answers keep the CLEAN low end under 80…
    for (const d of ['1', '2', '3', '4', '5']) for (const q of byDomain(d).slice(40, 52)) useProgress.getState().recordAnswer('cisa', q.id, false, undefined, { at: T0 - 20 * DAY });
    masterAll();
    setCert({ mocks: [mock(150, T0 - 2 * DAY)] });
    plantFor('cisa', 'oak', 'Kai');
    const before = cp().plant!.growth;
    expect(before).toBeLessThan(6);
    expect(plantFactsFor('cisa', cp(), T0)!.low!).toBeLessThan(80);
    // …while game rounds, right every time, lift the logged readiness for 8 days.
    let now = T0;
    for (let day = 0; day < 8; day++) {
      now += DAY;
      jest.setSystemTime(now);
      for (const d of ['1', '2', '3', '4', '5']) for (const q of byDomain(d).slice(60, 72)) useProgress.getState().recordAnswer('cisa', q.id, true, undefined, { mastery: false });
      useProgress.getState().noteReadiness('cisa', dayKey(now), 85);
      checkPlant('cisa');
    }
    expect(plantFactsFor('cisa', cp(), now)!.low!).toBeLessThan(80);
    expect(cp().plant!.growth).toBeLessThan(6);
  });
});
