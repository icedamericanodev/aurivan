/**
 * Mobile 1.14 (Phase 4b "Dress and Alive") on the real screens:
 * - Look: a live preview and five sections (Colour, Ground, Planter,
 *   Visitor, Keepsakes); a tap changes the look at once; a locked choice
 *   says how to open it and can't be picked; keepsakes up to three; one
 *   column at large text; hidden and no-plant states; no counters;
 * - Your plant: "Change its look", and the visitor's line on a cleared day;
 * - Today: the growth sequence is a real moment (one success haptic), and
 *   the plant's mood is in its spoken label;
 * - Milestones' badge sheet: one quiet "On your plant: the lantern." line;
 * - data: a look survives Reset and switching exams; a badge on one exam
 *   dresses the other exam's plant.
 */
/**
 * Mobile 1.14 (Phase 4b "Dress and Alive") on the real screens:
 * - Look: a live preview and five sections (Colour, Ground, Planter,
 *   Visitor, Keepsakes); a tap changes the look at once; a locked choice
 *   says how to open it and can't be picked; keepsakes up to three; one
 *   column at large text; hidden and no-plant states; no counters;
 * - Your plant: "Change its look", and the visitor's line on a cleared day;
 * - Today: the growth sequence is a real moment (one success haptic), and
 *   the plant's mood is in its spoken label;
 * - Milestones' badge sheet: one quiet "On your plant: the lantern." line;
 * - data: a look survives Reset and switching exams; a badge on one exam
 *   dresses the other exam's plant.
 */
import { act, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';



import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { resetPlantReactionsForTest } from '../components/plant/LivePlant';

import {  type CertPlant } from '../engine/plant';
import {  unlockedLooks, resolveLook } from '../engine/plantLooks';
import { allCertMarks } from '../lib/plant';
import { haptic } from '../lib/haptics';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
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

let r: ReactTestRenderer | undefined;
const cp = () => selectCert(useProgress.getState(), 'cisa');
const setPlant = (p: CertPlant | undefined) =>
  act(() => {
    useProgress.getState().updatePlant('cisa', () => p);
  });
const setWindow = (width: number, fontScale: number) =>
  act(() => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
const earn = (key: string, certId = 'cisa') =>
  act(() => {
    useProgress.setState((s) => {
      const c = selectCert(s, certId);
      const m = { ...(c.milestones ?? { earned: {} }), earned: { ...(c.milestones?.earned ?? {}), [key]: Date.now() } };
      return { byCert: { ...s.byCert, [certId]: { ...c, milestones: m } } };
    });
  });

beforeEach(() => {
  setWindow(393, 1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.getState().resetCert('cism');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
    useProgress.getState().updatePlant('cism', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(haptic.success).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Look', () => {
});

describe('Your plant', () => {
});

describe('Today', () => {
});

describe('the badge sheet', () => {
});

describe('data safety', () => {
  it('a badge on one exam dresses the other exam’s plant; Reset keeps the look and its unlocks', () => {
    earn('dress-rehearsal', 'cisa');
    act(() => {
      useProgress.getState().updatePlant('cism', () => ({ ...plantNew('lotus', 'Lumi', Date.now(), 2), look: { keepsakes: ['lantern'] } }));
    });
    const cism = selectCert(useProgress.getState(), 'cism').plant!;
    const open = unlockedLooks(cism, allCertMarks(useProgress.getState().byCert));
    expect(resolveLook('lotus', cism.look, open).keepsakes).toEqual(['lantern']);
    // Reset CISA: its badges go, the CISA plant keeps its look and every unlock it had.
    setPlant({ ...plantNew('oak', 'Kai', Date.now(), 5), look: { ground: 'stone-ring', keepsakes: ['lantern'] } });
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const after = cp().plant!;
    expect(after.growth).toBe(1);
    expect(after.look).toEqual({ ground: 'stone-ring', keepsakes: ['lantern'] });
    expect(after.kept).toEqual(expect.arrayContaining(['stone-ring', 'lantern', 'robin', 'oak-autumn']));
    const r2 = resolveLook('oak', after.look, unlockedLooks(after, allCertMarks(useProgress.getState().byCert)));
    expect(r2).toMatchObject({ ground: 'stone-ring', keepsakes: ['lantern'] });
  });
});

// ── Mobile 1.40: Style (it replaced Settings' Quiet look) ───────────────────
describe('Look › Style', () => {
});
