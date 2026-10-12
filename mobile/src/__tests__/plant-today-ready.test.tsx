/**
 * PR #44 code review M1 (probe P8): Elder and the exam-ready panel arrive on
 * the same Today visit (both come from a readiness log held at 80%+ for 7
 * days). Decided: ONE moment. The panel keeps it; the growth is applied
 * silently (no growth sequence on the hidden plant, one haptic only), and
 * Your plant says it in a calm line next time.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { plantNew } from '../engine/plant';
import { haptic } from '../lib/haptics';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
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
// The exam-ready panel is due (its first showing).
let mockReady = true;
jest.mock('../lib/moments', () => ({
  useTodayMoments: () => ({ ready: mockReady, moment: null, reminders: null, pace: null, dismissReady: () => {} }),
}));

let r: ReactTestRenderer | undefined;
const DAY = 86_400_000;
const texts = () => {
  const out: string[] = [];
  const walk = (n: unknown) => (typeof n === 'string' ? out.push(n) : (n as { children: unknown[] }).children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const growingPlants = () => r!.root.findAll((n) => typeof n.type !== 'string' && typeof n.props.species === 'string' && n.props.growth && typeof n.props.growth === 'object');

beforeEach(() => {
  mockReady = true;
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, quietGrowth: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: undefined });
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  jest.mocked(haptic.success).mockClear();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

const elderToday = () => {
  const p = plantNew('oak', 'Kai', Date.now() - 3 * DAY, 5);
  act(() => {
    useProgress.getState().updatePlant('cisa', () => ({ ...p, growth: 6, reached: { ...p.reached, elder: Date.now() }, pending: 6 }));
  });
};

it('Elder with the exam-ready panel: one moment (the panel), one haptic, no growth sequence on a hidden plant', () => {
  elderToday();
  act(() => {
    r = create(<Today />);
  });
  expect(texts()).toContain('A quiet milestone');
  // One success haptic for one return to Today (DESIGN_SYSTEM §8.9).
  expect(jest.mocked(haptic.success).mock.calls.length).toBe(1);
  // No growth sequence, no growth line: the plant is hidden behind the panel.
  expect(growingPlants()).toHaveLength(0);
  expect(r!.root.findAll((n) => n.props.testID === 'plant-grew' && typeof n.type === 'string')).toHaveLength(0);
  // Applied silently: nothing pending on Today, and Your plant has its calm line waiting.
  expect(useProgress.getState().byCert.cisa!.plant!.pending).toBeUndefined();
  expect(useProgress.getState().byCert.cisa!.plant!.growth).toBe(6);
  expect(useSeen.getState().quietGrowth.cisa).toBe(6);
});

it('without the panel, the growth plays on Today as before (and nothing waits for Your plant)', () => {
  mockReady = false;
  elderToday();
  act(() => {
    r = create(<Today />);
  });
  expect(growingPlants()).toHaveLength(1);
  expect(jest.mocked(haptic.success).mock.calls.length).toBe(1);
  expect(useSeen.getState().quietGrowth.cisa).toBeUndefined();
});
