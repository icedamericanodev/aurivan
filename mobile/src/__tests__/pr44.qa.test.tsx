/**
 * QA for PR #44, mobile 1.14.0 "Dress and Alive" (Phase 4b). Journey tests on
 * the real stores, screens and backup code, written by the QA pass.
 *
 * Journeys:
 *  J1  Look: pick a colour, a ground, a planter and a visitor; up to three
 *      keepsakes, a fourth refused politely, de-select works
 *  J2  earn a badge: its keepsake opens with its caption; the badge sheet says
 *      "On your plant: …"
 *  J3  complete a set: its planter opens, exactly once
 *  J4  Reset: back to a seed, the look and its unlocks kept
 *  J5  backup: round trip with a look; an old 1.13 file; tampered files
 *  J6  an unlock that vanishes after a restore falls back at render, and the
 *      stored choice comes back when it is re-earned
 *  J7  switching certification: one look per exam's plant
 *  J8  moods: one reaction per mood per day; a growth step is proud; Quiet
 *      look has no mood
 *  J9  the celebration budget: growth plus a milestone or the clearing is
 *      never a double moment
 *  J10 Reduce Motion: nothing moves, the end state shows
 *  J11 Show my plant OFF: no Look entry, no motion
 *  J12 never on question, mock, lesson or game screens
 *
 * The `// QA-BUG:` pins of this pass (QA_44.md) are flipped: each now
 * asserts the fixed behaviour and says which finding it closes ("Fixed").
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { act, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';

import { router } from 'expo-router';

import { setMockReducedMotion } from '../../jest/reanimated-mock';





import { pickCelebration, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import {   resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { BACKUP_APP, BACKUP_SCHEMA } from '../engine/backup';
import { withLook, type CertPlant } from '../engine/plant';
import {   resolveLook, unlockedLooks } from '../engine/plantLooks';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';

import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { haptic } from '../lib/haptics';

import { allCertMarks } from '../lib/plant';

import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

// Mobile 1.40: these tests check the storybook plant, so they plant as an app from before 1.40 did (no style).
import { legacyPlantNew as plantNew } from '../../jest/legacyPlant';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null, BadgeShareCard: () => null }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => '/tmp/card.png'), releaseCapture: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
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

// ── Helpers ──────────────────────────────────────────────────────────────
const DAY = 86_400_000;
let r: ReactTestRenderer | undefined;
/** A stand-in pack a test installed (removed after it). */
let undoPack: (() => void) | undefined;
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const cp = (cert = 'cisa') => selectCert(useProgress.getState(), cert);
const setPlant = (p: CertPlant | undefined, cert = 'cisa') =>
  act(() => {
    useProgress.getState().updatePlant(cert, () => p);
  });
const setWindow = (width: number, fontScale: number) =>
  act(() => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};
/** A plant grown some days ago (no growth today, so not proud). */
const grownAgo = (species: CertPlant['species'], name: string, growth: CertPlant['growth']) => plantNew(species, name, Date.now() - 5 * DAY, growth);
/** A backup file of our own shape, with a given byCert. */
const fileWith = (byCert: Record<string, unknown>, appVersion = '1.14.0') =>
  JSON.stringify({
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    appVersion,
    stores: {
      settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId: 'cisa' } },
      progress: { version: PROGRESS_VERSION, state: { byCert, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } },
    },
  });
const okRead = (text: string) => {
  const read = checkBackupText(text);
  if (read.kind !== 'ok') throw new Error(read.code);
  return read;
};

beforeEach(() => {
  setWindow(393, 1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.setState({ byCert: {}, plantSettings: undefined, reports: undefined, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  });
  useSession.getState().clear();
  useBackup.getState().setUndo(null);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' }, badgesHidden: false });
  jest.mocked(router.push).mockClear();
  jest.mocked(haptic.success).mockClear();
  jest.mocked(haptic.selection).mockClear();
});
afterEach(() => {
  unmount();
  undoPack?.();
  undoPack = undefined;
  jest.restoreAllMocks();
});

// ── J1 Look ──────────────────────────────────────────────────────────────

// ── J2 Badge → keepsake ──────────────────────────────────────────────────

// ── J3 Set → planter ─────────────────────────────────────────────────────

// ── J4 Reset ─────────────────────────────────────────────────────────────

// ── J5 Backup ────────────────────────────────────────────────────────────
describe('J5 backup with looks', () => {
  it('round trip: export, wipe, restore; the look and kept unlocks come back exactly', async () => {
    setPlant({ ...grownAgo('cactus', 'Spike', 2), look: { colourway: 'cactus-yellow', ground: 'meadow', planter: 'fieldstone', visitor: 'no-visitor', keepsakes: ['fox', 'clear-dawn'] }, kept: ['fieldstone', 'fox', 'clear-dawn', 'robin'] });
    const before = cp().plant!;
    const text = JSON.stringify(currentBackup());
    act(() => {
      useProgress.setState({ byCert: {}, plantSettings: undefined });
    });
    await act(async () => {
      expect((await restoreBackup(okRead(text).data, { fresh: true })).kind).toBe('ok');
    });
    expect(cp().plant!.look).toEqual(before.look);
    expect(cp().plant!.kept).toEqual(before.kept);
    // Kept unlocks still open everything it wore.
    const open = unlockedLooks(cp().plant!, allCertMarks(useProgress.getState().byCert));
    expect(resolveLook('cactus', cp().plant!.look, open)).toMatchObject({ planter: 'fieldstone', visitor: 'no-visitor', keepsakes: ['fox', 'clear-dawn'] });
  });

  it.each([
    ['an unknown keepsake id', { keepsakes: ['dragon'] }],
    ['a keepsake in the ground slot', { ground: 'lantern' }],
    ['a planter in the visitor slot', { visitor: 'terracotta' }],
    ['a colourway in the planter slot', { planter: 'oak-autumn' }],
    ['a ground among the keepsakes', { keepsakes: ['fox', 'meadow'] }],
    ['five keepsakes', { keepsakes: ['fox', 'jay', 'cairn', 'lantern', 'sundial'] }],
    ['four keepsakes', { keepsakes: ['fox', 'jay', 'cairn', 'lantern'] }],
    ['a repeated keepsake', { keepsakes: ['fox', 'fox'] }],
    ['a look id with markup', { colourway: '<img src=x>' }],
    ['a number for an id', { ground: 7 }],
    ['keepsakes as text', { keepsakes: 'fox' }],
  ])('a tampered look (%s) is refused, never a crash, and the phone is untouched', (_why, look) => {
    const mine = { ...grownAgo('oak', 'Kai', 2), look: { ground: 'meadow' } };
    setPlant(mine);
    let out: ReturnType<typeof checkBackupText> | undefined;
    expect(() => {
      out = checkBackupText(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, look } } }));
    }).not.toThrow();
    expect(out).toEqual({ kind: 'error', code: 'bad-data' });
    expect(cp().plant).toBe(mine);
  });

  it('an unknown slot in a look is dropped (repaired), never copied into the app', () => {
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, look: { hat: 'crown', ground: 'meadow' } } } }));
    expect(read.data.progress.byCert.cisa.plant!.look).toEqual({ ground: 'meadow' });
  });

  it('a tampered kept list (unknown id) is refused too', () => {
    expect(checkBackupText(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, kept: ['golden-crown'] } } }))).toEqual({ kind: 'error', code: 'bad-data' });
  });

  it('a hand-edited kept list can open every look with no evidence behind it (cosmetic only)', () => {
    // Observation, not a QA-BUG: `kept` is checked against the catalogue but
    // never against the restored badges or growth, so a file can open every
    // planter and keepsake. Cosmetics carry no readiness claim, so the harm
    // is nil; noted for the security pass.
    const all = ['fieldstone', 'five-stone', 'celadon', 'compass-rose', 'banded', 'root-woven', 'lantern', 'sundial', 'trail-blaze'];
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, kept: all } } }));
    const p = read.data.progress.byCert.cisa.plant!;
    expect(unlockedLooks(p, [])).toEqual(expect.arrayContaining(all));
  });
});

// ── J6 A vanished unlock ─────────────────────────────────────────────────

// ── J7 Cert switch ───────────────────────────────────────────────────────

// ── J8 Moods ─────────────────────────────────────────────────────────────
describe('J8 moods', () => {
});

// ── J9 Celebration budget ────────────────────────────────────────────────
describe('J9 the celebration budget', () => {

  it('growth is never fatigued (rare), but still keeps one full moment per session', () => {
    motionOn();
    useSeen.setState({ moments: { 'plant-growth': 9 } });
    expect(pickCelebration('plant-growth', false).mode).toBe('full');
    expect(pickCelebration('plant-growth', false).mode).not.toBe('full');
  });
});

// ── J10 Reduce Motion ────────────────────────────────────────────────────

// ── J11 Show my plant OFF ────────────────────────────────────────────────
// ── J12 Never on focus screens ───────────────────────────────────────────
describe('J12 never on question, mock, lesson or game screens (transitive imports)', () => {
  const SRC = join(__dirname, '..');
  const resolveImport = (from: string, spec: string): string | null => {
    const base = resolve(dirname(from), spec);
    for (const c of [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts'), base]) if (existsSync(c)) {
      try {
        readFileSync(c, 'utf8');
        return c;
      } catch {
        // a directory
      }
    }
    return null;
  };
  const reach = (entry: string): Set<string> => {
    const seen = new Set<string>();
    const todo = [entry];
    while (todo.length) {
      const f = todo.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      // Grove Phase 4b (PHASE4B 4.9): the first set's closing screen (shown by Results once, ever)
      // draws "Kai is planted" after "Plant a seed". That one block is its own check (plant-p4b test);
      // the walk does not follow it, so every other study screen part stays plant-free.
      if (f.endsWith('/components/firstSet.tsx')) continue;
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const to = resolveImport(f, m[1]);
        if (to && to.startsWith(SRC) && !to.includes('/content/generated/')) todo.push(to);
      }
    }
    return seen;
  };
  const screens = [
    'app/session.tsx',
    'app/mock-start.tsx',
    'app/results.tsx',
    'app/guided.tsx',
    ...readdirSync(join(SRC, 'app/game')).map((f) => `app/game/${f}`),
    ...readdirSync(join(SRC, 'app/lesson')).map((f) => `app/lesson/${f}`),
  ];
  it.each(screens)('%s never reaches the plant, its look or its motion', (f) => {
    const files = [...reach(join(SRC, f))].map((x) => x.slice(SRC.length + 1));
    expect(files.length).toBeGreaterThan(3);
    expect(files.filter((x) => x.startsWith('components/plant/'))).toEqual([]);
    for (const x of files.filter((y) => y !== 'lib/plant.ts' && y !== 'components/firstSet.tsx')) expect(readFileSync(join(SRC, x), 'utf8')).not.toMatch(/usePlantView\(|<LivePlant\b|<Plant\b|<PlantButton|<KeepsakeIcon|plantLookView\(/);
  });
});

// ── Store-level guards the journeys lean on ──────────────────────────────
describe('look guards', () => {
  it('withLook takes only catalogue ids of the right slot; null puts a slot back', () => {
    const p = grownAgo('oak', 'Kai', 3);
    expect(withLook(p, { ground: 'lantern' })).toBe(p);
    expect(withLook(p, { visitor: 'dragon' })).toBe(p);
    const a = withLook(p, { ground: 'stone-ring', keepsakes: ['fox', 'fox', 'jay', 'cairn', 'lantern'] });
    expect(a.look).toEqual({ ground: 'stone-ring', keepsakes: ['fox', 'jay', 'cairn'] });
    expect(withLook(a, { ground: null, keepsakes: null }).look).toBeUndefined();
  });
});
