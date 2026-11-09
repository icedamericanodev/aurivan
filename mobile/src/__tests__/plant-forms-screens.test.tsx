/**
 * Mobile 1.50 plant forms on the real screens:
 * - Your plant names the form under the plant's name, with its look line and the next form;
 * - a form reached since the last visit plays its reveal ONCE (learning fact first, then the
 *   form), full motion (The Turning), or the Reduce Motion cross-fade;
 * - a plant already past Form I when forms arrived gets one quiet note, never a reveal;
 * - at Elder the learner chooses the final form on the Look screen (never before Elder);
 * - Today's grow-up line points to Your plant when a new form came; the widget says "growth".
 */
/**
 * Mobile 1.50 plant forms on the real screens:
 * - Your plant names the form under the plant's name, with its look line and the next form;
 * - a form reached since the last visit plays its reveal ONCE (learning fact first, then the
 *   form), full motion (The Turning), or the Reduce Motion cross-fade;
 * - a plant already past Form I when forms arrived gets one quiet note, never a reveal;
 * - at Elder the learner chooses the final form on the Look screen (never before Elder);
 * - Today's grow-up line points to Your plant when a new form came; the widget says "growth".
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions } from 'react-native';
import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';



import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { FORM_FACTS } from '../engine/plant';


import { FormReveal } from '../components/plant/FormReveal';
import { flushSayLaterForTest } from '../lib/a11y';
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
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));

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
const byTestID = (id: string) => r!.root.findAll((n) => n.props.testID === id && typeof n.type === 'string');

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, plantForms: {}, plantFinal: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});


describe('UX review fixes (1.50 forms)', () => {

  const revealProps = {
    species: 'oak' as const,
    from: 2 as const,
    to: 3 as const,
    theme: 'light' as const,
    size: 200,
    accessibilityLabel: 'Kai, your oak. Whip Oak form. Growth: Shoot.',
    fact: FORM_FACTS[3],
    name: 'Whip Oak',
    lookLine: 'One straight leader with lobed leaves at each node.',
    announce: 'Kai grows into a new form: the Whip Oak.',
    testID: 'rv',
  };
  const words = () => byTestID('rv-words')[0];

  it('P5: mid-motion, the words are hidden from screen readers and nothing is announced yet', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    // Hold every animation mid-way (the mock normally finishes them at once).
    setMockHoldAnimations(true);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    say.mockClear(); // jest/setup.ts's mock keeps earlier tests' calls
    mount(<FormReveal {...revealProps} />);
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(words().props.accessibilityElementsHidden).toBe(true);
    expect(words().props.importantForAccessibility).toBe('no-hide-descendants');
    act(() => flushSayLaterForTest());
    expect(say).not.toHaveBeenCalled();
  });

  it('P5: once the motion ends the words are readable, and the form is announced exactly once', async () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    say.mockClear(); // jest/setup.ts's mock keeps earlier tests' calls
    mount(<FormReveal {...revealProps} />);
    // Full motion starts its clock on the frame after mount (review O6).
    await act(async () => {
      await new Promise((res) => setTimeout(res, 0));
    });
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(words().props.accessibilityElementsHidden).toBe(false);
    expect(words().props.importantForAccessibility).toBe('auto');
    act(() => flushSayLaterForTest());
    expect(say).toHaveBeenCalledTimes(1);
    expect(say).toHaveBeenCalledWith('Kai grows into a new form: the Whip Oak.');
  });

  it('P5: Reduce Motion shows the words at once, never hidden', () => {
    setSystemReducedMotionForTest(true);
    mount(<FormReveal {...revealProps} />);
    expect(byTestID('rv-reduced')).toHaveLength(1);
    expect(words().props.accessibilityElementsHidden).toBe(false);
  });
});
