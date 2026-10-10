/**
 * Build E screens: the mode picker on Practice (saved choice, suggestion,
 * the hero follows it) and the Guided step (topic, clear status, Next topic
 * is never locked, Start begins a 5 + 3 step).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import Practice from '../app/(tabs)/practice';
import GuidedStep from '../app/guided';
import { scopeTopics } from '../lib/outline';

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
    useSharedValue: (v: unknown) => ({ value: v }),
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const radios = () => root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
const radio = (name: RegExp) => radios().find((n) => name.test(String(n.props.accessibilityLabel)))!;
const press = (label: string) =>
  act(() => {
    root().findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function')[0].props.onPress();
  });

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, studyMode: undefined, studyDomain: undefined, studySize: undefined, practiceTimer: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

/** The mode picker sits behind the "Your path" row under the hero (practice redesign). */
const openPath = () =>
  act(() => {
    root().findAll((n) => String(n.props.accessibilityLabel).startsWith('Your path:') && typeof n.props.onPress === 'function')[0].props.onPress();
  });

describe('Practice: the mode picker', () => {
  it('suggests by stage, saves the choice, and the hero follows it', () => {
    mount(<Practice />);
    openPath();
    // A new learner is diagnosing: Random is suggested and selected.
    expect(radio(/^Random/).props.accessibilityState).toEqual({ checked: true });
    expect(String(radio(/^Random/).props.accessibilityLabel)).toContain('Suggested');
    expect(allText()).toContain('A mix like the real exam.');
    act(() => {
      radio(/^In order/).props.onPress();
    });
    expect(useSettings.getState().studyMode).toBe('inOrder');
    expect(radio(/^In order/).props.accessibilityState).toEqual({ checked: true });
    expect(allText()).toContain('10 questions, topic by topic');
    press('Start');
    expect(useSession.getState().active).toMatchObject({ path: { mode: 'inOrder' } });
  });

  it('Guided hides the size choice and opens the step screen', () => {
    useSettings.setState({ studyMode: 'guided' });
    mount(<Practice />);
    openPath();
    expect(allText()).toContain('Guided goes one topic at a time');
    expect(allText()).toContain('Next topic:');
  });
});

describe('Guided step screen', () => {
  it('shows the topic, its clear status, and Next topic is never locked', () => {
    mount(<GuidedStep />);
    const [first, second] = scopeTopics('cisa');
    expect(allText()).toContain(first.name);
    expect(allText()).toContain('Not clear yet');
    expect(allText()).toContain('You can move on at any time.');
    press(`Next topic: ${second.name}`);
    expect(selectCert(useProgress.getState(), 'cisa').studyPath?.guided?.all).toBe(second.id);
    expect(allText()).toContain(second.name);
    press('Start this step');
    const s = useSession.getState().active!;
    expect(s.path).toMatchObject({ mode: 'guided', topicId: second.id });
    expect(s.questionIds.length).toBeGreaterThanOrEqual(6);
  });
});
