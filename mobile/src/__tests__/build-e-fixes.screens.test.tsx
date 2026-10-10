/**
 * Build E review fixes, on the screens (everything outside the Practice tab):
 * - Results: "Back to your Guided step" goes back to the Guided screen
 *   already in the stack (no second copy) and keeps the step's Timed choice.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { router } from 'expo-router';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Results from '../app/results';
import { finishSession } from '../lib/finishSession';
import { scopeTopics } from '../lib/outline';
import { startGuidedStep } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v, set: () => {} }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockCanDismiss = true;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, canDismiss: () => mockCanDismiss },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
export const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const mount = (el: React.ReactElement) =>
  act(() => {
    r?.unmount();
    r = create(el);
  });
const press = (label: string) =>
  act(() => {
    root().findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function')[0].props.onPress();
  });

beforeEach(() => {
  mockCanDismiss = true;
  jest.mocked(router.dismissTo).mockClear();
  jest.mocked(router.replace).mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, practiceTimer: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('Results: back to the Guided step', () => {
  const finishStep = (timed?: boolean) => {
    const t = scopeTopics('cisa', '2')[1];
    const s = startGuidedStep('cisa', t.id, '2', timed)!;
    act(() => {
      useSession.getState().answer(s.questionIds[0], { display: 'A', correct: true, ms: 30_000 });
      finishSession();
    });
    mount(<Results />);
  };

  it('goes back to the Guided screen in the stack, keeping the domain and the Timed choice', () => {
    finishStep(true);
    press('Back to your Guided step');
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/guided', params: { domain: '2', timed: '1' } });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('with nothing to go back to, it replaces Results with the Guided screen (untimed kept as "0")', () => {
    mockCanDismiss = false;
    finishStep(false);
    press('Back to your Guided step');
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/guided', params: { domain: '2', timed: '0' } });
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
