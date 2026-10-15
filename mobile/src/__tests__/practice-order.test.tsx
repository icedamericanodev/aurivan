/**
 * Mobile 1.15 Practice order (PHASE5.md §2.4, ui.md P1–P2, C2): Mock exams
 * move under the hero for the Exam-focused plan (and the mock / ready
 * stages); the one-time pace offer sits under the Timed switch, in seconds.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Practice from '../app/(tabs)/practice';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

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
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    // No plant prompt by default: these tests are about the fit.
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

const today = () => dayKey(Date.now());
const sectionOrder = () => {
  const t = allText();
  return (names: string[]) => names.map((n) => t.indexOf(n));
};

describe('Practice: mocks first for the exam-focused, the pace offer under Timed', () => {
  it('Mock exams sit under the hero for the Exam-focused plan, and last otherwise', () => {
    useSettings.setState({ familiarity: 'experienced' });
    mount(<Practice />);
    let [mocks, more] = sectionOrder()(['Mock exams', 'More ways to practice']);
    expect(mocks).toBeGreaterThan(-1);
    expect(mocks).toBeLessThan(more);
    unmount();
    useSettings.setState({ familiarity: 'some' });
    mount(<Practice />);
    [mocks, more] = sectionOrder()(['Mock exams', 'More ways to practice']);
    expect(mocks).toBeGreaterThan(more);
  });

  it('the one-time pace offer sits under the Timed switch, never above the hero, and says seconds', () => {
    // Close to the exam: the offer is due.
    useSettings.setState({ examDates: { cisa: addDays(today(), 14) } });
    mount(<Practice />);
    const [hero, timed, offer] = sectionOrder()(['Your path', 'Timed', 'Practice at exam pace?']);
    expect(offer).toBeGreaterThan(timed);
    expect(timed).toBeGreaterThan(hero);
    expect(allText()).toContain('The exam allows about 96 seconds a question. A timer counts up while you answer, never down, and stops while you read the explanation.');
    expect(allText()).not.toMatch(/\d s a question/);
  });
});


describe('Practice: the hero sized from the daily minutes (mobile 1.16, UX review O8)', () => {
  it('no length chosen: 30 minutes a day starts 20 questions; 20 minutes, 10 (never past the day)', () => {
    useSettings.setState({ familiarity: 'some', studyMode: 'smart', studySize: undefined, dailyMinutes: 30 });
    mount(<Practice />);
    expect(allText()).toContain('Picked for you 20 questions · ');
    unmount();
    useSettings.setState({ dailyMinutes: 20 });
    mount(<Practice />);
    expect(allText()).toContain('Picked for you 10 questions · ');
  });

  it('a length the learner chose always wins', () => {
    useSettings.setState({ familiarity: 'some', studyMode: 'smart', studySize: 50, dailyMinutes: 10 });
    mount(<Practice />);
    expect(allText()).toContain('Picked for you 50 questions · ');
  });
});
