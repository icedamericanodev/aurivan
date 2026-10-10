/**
 * Snare Spotter screen: the dead end is gone. Tapping the BEST answer as
 * the snare used to disable it in step 2, so the question could not be
 * answered and scored 0 with no explanation. Now the screen says it is
 * the best answer, keeps it open, and a right answer still scores.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { OptionCard } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { trapLetter, trapPool } from '../engine/games/trapSpotter';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import TrapSpotter from '../app/game/trap';

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

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const options = () => root().findAllByType(OptionCard);
/** The question on screen: the snare question whose options are the ones shown. */
const current = (): PackQuestion => {
  const shown = new Set(options().map((o) => o.props.text as string));
  return trapPool(getAllQuestions('cisa')).find((q) => Object.values(q.options).every((t) => shown.has(t!)))!;
};
const optionWith = (text: string) => options().find((o) => o.props.text === text)!;
const tap = (o: ReactTestInstance) =>
  act(() => {
    o.props.onPress();
  });

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
  act(() => {
    r = create(<TrapSpotter />);
  });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Snare Spotter: picking the best answer as the snare', () => {
  it('explains it, keeps the best answer open, and still scores a right answer', () => {
    const q = current();
    const best = q.options[q.correct]!;
    tap(optionWith(best));
    expect(allText()).toContain('That’s the best answer, not the snare');
    // Not a dead end: the best answer can still be chosen in step 2.
    expect(optionWith(best).props.disabled).toBe(false);
    tap(optionWith(best));
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Score 1').length).toBeGreaterThan(0);
    expect(allText()).toContain('Best answer: correct');
    // We told them which option was best, so the answer counts as assisted.
    expect(selectCert(useProgress.getState(), 'cisa').answers[q.id].lastAssisted).toBe(true);
  });

  it('a wrong (non-best) snare pick is still closed in step 2', () => {
    const q = current();
    const other = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== trapLetter(q) && q.options[l])!;
    tap(optionWith(q.options[other]!));
    expect(allText()).not.toContain('That’s the best answer, not the snare');
    expect(optionWith(q.options[other]!).props.disabled).toBe(true);
    expect(optionWith(q.options[q.correct]!).props.disabled).toBe(false);
  });
});
