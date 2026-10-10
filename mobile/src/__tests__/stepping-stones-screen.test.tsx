/**
 * Stepping Stones screen against the real stores: tap to place, tap a
 * placed stone to take it back (no drag), check marks each stone and says
 * where a misplaced one goes, review cards (never answers), Heartwood's
 * missing step, and the shared round end with the level saved.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import SteppingStones from '../app/game/stones';
import { getStepSequences } from '../content/games';
import { selectCert, useProgress } from '../store/progress';
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
// Focus and announcements (UX review H3, P1): record where focus is sent and what is said.
const mockFocus: unknown[] = [];
const mockSaid: string[] = [];
jest.mock('../lib/a11y', () => ({
  moveFocus: (ref: unknown) => mockFocus.push(ref),
  sayLater: (text: string) => mockSaid.push(text),
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
const buttons = () => root().findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string');
const press = (n: ReactTestInstance) => act(() => n.props.onPress());
const pressLabel = (label: string) => press(root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0]);
const placeStone = (label: string) => press(buttons().find((n) => n.props.accessibilityLabel === `Place next: ${label}`)!);
const all = getStepSequences('cisa');
const cp = () => selectCert(useProgress.getState(), 'cisa');
/** The process on screen (its title is the headline). */
const current = () => {
  const text = allText();
  return all.filter((s) => text.includes(s.title)).sort((a, b) => b.title.length - a.title.length)[0];
};

beforeEach(() => {
  // Fake timers: placing a stone announces and moves focus after a short pause (lib/a11y.ts).
  jest.useFakeTimers();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it('Seedling: the first step given, tap to place, tap again to take back, check and explain', () => {
  act(() => {
    r = create(<SteppingStones />);
  });
  expect(allText()).toContain('Put each process in the right order.');
  pressLabel('Start');
  for (let p = 0; p < 3; p++) {
    const seq = current();
    expect(seq.steps).toHaveLength(4);
    expect(buttons().some((n) => n.props.accessibilityLabel === `Place next: ${seq.steps[0].label}`)).toBe(false);
    expect(allText()).toContain(seq.steps[0].label); // given
    if (p === 0) {
      // Place one, take it back: it returns to the stones.
      placeStone(seq.steps[2].label);
      press(buttons().find((n) => n.props.accessibilityLabel === `Step 2: ${seq.steps[2].label}. Tap to take it back.`)!);
      expect(buttons().some((n) => n.props.accessibilityLabel === `Place next: ${seq.steps[2].label}`)).toBe(true);
      // Then a wrong order: 3rd and 2nd swapped.
      placeStone(seq.steps[2].label);
      placeStone(seq.steps[1].label);
      placeStone(seq.steps[3].label);
    } else {
      for (const k of [1, 2, 3]) placeStone(seq.steps[k].label);
    }
    pressLabel('Check the order');
    if (p === 0) {
      expect(allText()).toContain('1 of 3 steps in place');
      expect(allText()).toContain(`${seq.steps[2].label} · goes 3rd`);
    } else {
      expect(allText()).toContain('Perfect path');
    }
    // The notes in order, and the caption.
    expect(allText()).toContain(`1. ${seq.steps[0].label}: ${seq.steps[0].note}`);
    pressLabel(p === 2 ? 'See results' : 'Next process');
  }
  expect(allText()).toContain('Round complete');
  // 1 + (3 + 2) + (3 + 2) = 11 of 15.
  expect(cp().gameBest.stones).toBe(11);
  const cards = Object.entries(cp().cards ?? {});
  expect(cards).toHaveLength(1);
  expect(cards[0][0]).toMatch(/^(seq|flow):/);
  expect(Object.keys(cp().answers)).toEqual([]);
  expect(cp().gameGrowth?.stones).toEqual(expect.objectContaining({ tier: 'seedling' }));
});

it('Heartwood: which step is missing, from three', () => {
  useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { stones: { tier: 'heartwood', up: 0, down: 0 } } } } });
  act(() => {
    r = create(<SteppingStones />);
  });
  pressLabel('Start');
  const seq = current();
  const missing = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Step \d is missing$/.test(n.props.accessibilityLabel));
  expect(missing.length).toBeGreaterThan(0);
  const k = Number(/Step (\d)/.exec(missing[0].props.accessibilityLabel)![1]) - 1;
  const choices = buttons().filter((n) => /^Choice \d of 3: /.test(n.props.accessibilityLabel));
  expect(choices).toHaveLength(3);
  press(choices.find((n) => n.props.accessibilityLabel.endsWith(seq.steps[k].label))!);
  expect(allText()).toContain('Found the missing step');
});

it('placing and taking back move screen-reader focus on purpose, and speak after the tap', () => {
  mockFocus.length = 0;
  mockSaid.length = 0;
  act(() => {
    r = create(<SteppingStones />);
  });
  pressLabel('Start');
  const seq = current();
  // The element focus is sent to, by its spoken name (the test renderer's View is a component instance).
  const focusName = () => (mockFocus[mockFocus.length - 1] as { current: { props?: { accessibilityLabel?: string } } | null }).current?.props?.accessibilityLabel;
  // Place the 2nd step: focus goes to the next stone still to place.
  placeStone(seq.steps[1].label);
  expect(mockSaid).toEqual([`Placed 2nd: ${seq.steps[1].label}.`]);
  expect(focusName()).toMatch(/^Place next: /);
  // Take it back: focus follows the stone back under "Stones".
  press(buttons().find((n) => n.props.accessibilityLabel === `Step 2: ${seq.steps[1].label}. Tap to take it back.`)!);
  expect(mockSaid[mockSaid.length - 1]).toBe(`Taken back: ${seq.steps[1].label}.`);
  expect(focusName()).toBe(`Place next: ${seq.steps[1].label}`);
  // Place all three: focus lands on "Check the order".
  for (const k of [1, 2, 3]) placeStone(seq.steps[k].label);
  expect(focusName()).toBe('Check the order');
  // Checking says nothing itself: the reveal card announces "Perfect path" once.
  const before = mockSaid.length;
  pressLabel('Check the order');
  expect(mockSaid.length).toBe(before);
  // Placed stones stay the same tappable element after the check, locked.
  const placed = buttons().find((n) => (n.props.accessibilityLabel as string).startsWith('Step 2: '))!;
  expect(placed.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
});
