/**
 * Mobile 1.13 (Phase 4a) "Your plant" on the real stores and the backup:
 * - old saves load with NO plant (never one made up for them);
 * - planting: a seed for a new learner; an existing learner's study sets the
 *   growth quietly (a back-fill line, never a moment);
 * - growth only from real learning: clean answers grow it, game answers
 *   don't; it never goes down; a grow-up waits as `pending` for Today;
 * - Reset sends it back to a seed and keeps name, species, look and unlocks;
 * - backup: the plant and its settings round-trip; a broken plant in a file
 *   is refused; a restored plant is clamped to what the data supports; an
 *   older file with no plant keeps the phone's plant and settings.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDomainQuestions } from '../content/loader';
import { BACKUP_APP, BACKUP_SCHEMA, readBackup } from '../engine/backup';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { isValidPlantState, type CertPlant } from '../engine/plant';
import { checkBackupText, currentBackup, knownIds, restoreBackup } from '../lib/backup';
import { checkPlant, plantFactsFor, plantFor, seeGrowth, seePlantBackfill } from '../lib/plant';
import { selectCert, useProgress } from '../store/progress';
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
const cp = () => selectCert(useProgress.getState(), 'cisa');
/** `n` correct, clean answers spread over the five domains. */
function answerClean(n: number, opts: { game?: boolean } = {}) {
  const per = Math.ceil(n / 5);
  let k = 0;
  for (let d = 1; d <= 5 && k < n; d++) {
    for (const q of getDomainQuestions('cisa', String(d)).slice(0, per)) {
      if (k++ >= n) break;
      useProgress.getState().recordAnswer('cisa', q.id, true, undefined, opts.game ? { mastery: false } : {});
    }
  }
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, plantSettings: undefined, reports: undefined });
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' } });
});
afterEach(() => jest.useRealTimers());

describe('old saves and planting', () => {
  it('an old save (no plant fields) loads with no plant and default settings', async () => {
    const old = {
      state: {
        byCert: { cisa: { answers: { d1_001: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 } }, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } },
        streak: { current: 1, best: 1, lastDay: '2026-10-12' },
        today: { day: '2026-10-12', answered: 1 },
        days: {},
      },
      version: PROGRESS_VERSION,
    };
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(old));
    await useProgress.persist.rehydrate();
    expect(cp().answers.d1_001).toBeDefined();
    expect(cp().plant).toBeUndefined();
    expect(useProgress.getState().plantSettings).toBeUndefined();
    // Nothing grows a plant that isn't there.
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant).toBeUndefined();
  });

  it('a new learner plants a seed; Today’s prompt is then done', () => {
    plantFor('cisa', 'sunflower', '  Sunny  ');
    expect(cp().plant).toEqual({ species: 'sunflower', name: 'Sunny', plantedAt: T0, growth: 1, look: { style: 'botanical' } });
    expect(useProgress.getState().plantSettings?.promptHidden).toBe(true);
    // A second tap never replaces it.
    plantFor('cisa', 'oak', 'Kai');
    expect(cp().plant!.species).toBe('sunflower');
  });

  it('an existing learner’s study sets the growth quietly: a back-fill line, no moment', () => {
    answerClean(25);
    plantFor('cisa', 'oak', 'Kai');
    const p = cp().plant!;
    expect(p.growth).toBe(2);
    expect(p.backfill).toEqual({ at: T0, growth: 2 });
    expect(p.pending).toBeUndefined();
    seePlantBackfill('cisa');
    expect(cp().plant!.backfill!.seen).toBe(true);
  });
});

describe('growth only from real learning, never down', () => {
  it('clean answers grow it; the grow-up waits for Today, once', () => {
    plantFor('cisa', 'lotus', 'Padma');
    answerClean(19);
    expect(checkPlant('cisa')).toBeNull();
    // Five hours later: answering the same questions again within 4 hours is a retest, not a clean answer (mobile 1.24).
    jest.setSystemTime(T0 + 5 * 3_600_000);
    answerClean(21);
    expect(checkPlant('cisa')).toBe(2);
    expect(cp().plant!.pending).toBe(2);
    expect(cp().plant!.reached).toEqual({ sprout: T0 + 5 * 3_600_000 });
    seeGrowth('cisa');
    expect(cp().plant!.pending).toBeUndefined();
    expect(checkPlant('cisa')).toBeNull(); // nothing new: no second moment
  });

  it('game answers, however many, never grow it', () => {
    plantFor('cisa', 'cactus', 'Pico');
    answerClean(60, { game: true });
    expect(plantFactsFor('cisa', cp(), T0)!.cleanAnswered).toBe(0);
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant!.growth).toBe(1);
  });

  it('a dip in the data never lowers it', () => {
    plantFor('cisa', 'pine', 'Summit');
    answerClean(25);
    checkPlant('cisa');
    expect(cp().plant!.growth).toBe(2);
    // Every answer turns wrong (and hinted): the facts fall, the plant stays.
    for (const id of Object.keys(cp().answers)) useProgress.getState().recordAnswer('cisa', id, false, undefined, { assisted: true });
    expect(plantFactsFor('cisa', cp(), T0)!.cleanAnswered).toBe(0);
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant!.growth).toBe(2);
  });

  it('a finished session checks the plant (lib/finishSession → checkPlant)', () => {
    const src = readFileSync(join(__dirname, '../lib/finishSession.ts'), 'utf8');
    expect(src).toMatch(/checkPlant\(s\.certId\)/);
    // Games never check it (their answers can't count anyway).
    const games = readFileSync(join(__dirname, '../lib/gameRounds.ts'), 'utf8');
    expect(games).not.toMatch(/checkPlant/);
  });
});

describe('Reset', () => {
  it('back to a seed; name, species, look, planted date and unlocks are kept', () => {
    answerClean(25);
    plantFor('cisa', 'cherry-blossom', 'Hana');
    useProgress.getState().updatePlant('cisa', (p) => ({ ...p!, look: { ground: 'meadow' }, kept: ['robin'] }));
    jest.setSystemTime(T0 + 5000);
    useProgress.getState().resetCert('cisa');
    const p = cp().plant!;
    expect(p).toMatchObject({ species: 'cherry-blossom', name: 'Hana', plantedAt: T0, growth: 1, replantedAt: T0 + 5000, look: { ground: 'meadow' }, kept: ['robin'] });
    expect(p.reached).toBeUndefined();
    expect(Object.keys(cp().answers)).toHaveLength(0);
    expect(isValidPlantState(p)).toBe(true);
  });

  it('a cert with no plant stays without one after Reset', () => {
    useProgress.getState().resetCert('cisa');
    expect(cp().plant).toBeUndefined();
  });
});

describe('backup', () => {
  const fileWith = (plant: unknown, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      exportedAt: new Date(T0).toISOString(),
      appVersion: '1.13.0',
      stores: {
        settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId: 'cisa' } },
        progress: {
          version: PROGRESS_VERSION,
          state: { byCert: { cisa: { answers: {}, ...(plant === undefined ? {} : { plant }) } }, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, ...extra },
        },
      },
    });

  it('the plant and its settings round-trip exactly', () => {
    answerClean(25);
    plantFor('cisa', 'bamboo', 'Reed 🎋');
    checkPlant('cisa');
    useProgress.getState().setPlantSettings({ quietLook: true });
    const read = checkBackupText(JSON.stringify(currentBackup(T0)));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.plant).toEqual(cp().plant);
    expect(read.data.progress.plantSettings).toEqual({ promptHidden: true, quietLook: true });
  });

  it.each([
    ['an unknown species', { species: 'rose', name: 'R', plantedAt: T0, growth: 1 }],
    ['a name with a bidi mark', { species: 'oak', name: 'Kai‮', plantedAt: T0, growth: 1 }],
    ['growth 7', { species: 'oak', name: 'Kai', plantedAt: T0, growth: 7 }],
    ['reached above growth', { species: 'oak', name: 'Kai', plantedAt: T0, growth: 2, reached: { crown: T0 } }],
    ['duplicate keepsakes', { species: 'oak', name: 'Kai', plantedAt: T0, growth: 1, look: { keepsakes: ['fox', 'fox'] } }],
    ['a pending Seed', { species: 'oak', name: 'Kai', plantedAt: T0, growth: 1, pending: 1 }],
    ['a plant that is not an object', 'oak'],
  ])('a file with %s is refused, and nothing changes', (_why, plant) => {
    expect(checkBackupText(fileWith(plant))).toEqual({ kind: 'error', code: 'bad-data' });
  });

  it('a restored plant is clamped to what the restored data supports', () => {
    const elder = { species: 'mango', name: 'Amber', plantedAt: T0, growth: 6, reached: { sprout: T0, shoot: T0, bough: T0, crown: T0, elder: T0 }, pending: 6, backfill: { at: T0, growth: 5 } };
    const read = readBackup(fileWith(elder), ['cisa'], knownIds);
    const p = read.progress.byCert.cisa.plant as CertPlant;
    // No answers, no mocks: only a seed is supported. Identity is kept.
    expect(p).toEqual({ species: 'mango', name: 'Amber', plantedAt: T0, growth: 1, reached: {}, backfill: { at: T0, growth: 1 } });
  });

  it('settings in a file: switches only', () => {
    expect(checkBackupText(fileWith(undefined, { plantSettings: { showPlant: false } })).kind).toBe('ok');
    expect(checkBackupText(fileWith(undefined, { plantSettings: { showPlant: 'no' } }))).toEqual({ kind: 'error', code: 'bad-data' });
  });

  it('restoring an older file with no plant keeps this phone’s plant and plant settings', async () => {
    plantFor('cisa', 'narra', 'Tala');
    useProgress.getState().setPlantSettings({ showPlant: false, quietLook: true });
    const read = checkBackupText(fileWith(undefined));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect((await restoreBackup(read.data, { now: T0, fresh: true })).kind).toBe('ok');
    const p = cp().plant!;
    expect(p).toMatchObject({ species: 'narra', name: 'Tala', plantedAt: T0, growth: 1 });
    expect(useProgress.getState().plantSettings).toEqual({ promptHidden: true, showPlant: false, quietLook: true });
  });

  it('a file WITH a plant replaces the phone’s', async () => {
    plantFor('cisa', 'narra', 'Tala');
    const read = checkBackupText(fileWith({ species: 'sampaguita', name: 'Perla', plantedAt: T0 - 1000, growth: 1 }));
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, { now: T0, fresh: true });
    expect(cp().plant).toEqual({ species: 'sampaguita', name: 'Perla', plantedAt: T0 - 1000, growth: 1 });
  });
});
