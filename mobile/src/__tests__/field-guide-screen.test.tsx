/**
 * Field Guide screen against the real stores: tap a term then its meaning
 * (no drag), a wrong pair stays open and loses its first-try point, each
 * term is a review card (never an answer), and the round ends through the
 * shared recap with the game's level saved.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import FieldGuide from '../app/game/field';
import { getNotes } from '../content/notes';
import { fieldTerms } from '../engine/games/fieldGuide';
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
const byLabel = (re: RegExp) => buttons().filter((n) => re.test(n.props.accessibilityLabel));
const press = (n: ReactTestInstance) => act(() => n.props.onPress());
const pressLabel = (label: string) => press(root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0]);
const defOf = new Map(fieldTerms(getNotes('cisa')).map((t) => [t.term, t.definition]));
const cp = () => selectCert(useProgress.getState(), 'cisa');

beforeEach(() => {
  // Fake timers: the wrong-pair state clears after 900 ms, and announcements wait a moment (sayLater).
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

/** The term text of a "Term k of 4: …" tile. */
const termText = (n: ReactTestInstance) => (n.props.accessibilityLabel as string).replace(/^Term \d of \d: /, '').replace(/, (selected|matched)$/, '');
const meaningFor = (term: string) => byLabel(/^Meaning /).find((m) => (m.props.accessibilityLabel as string).includes(defOf.get(term)!))!;

it('matches by tapping (term, then meaning), and a slip costs the first-try point only', () => {
  act(() => {
    r = create(<FieldGuide />);
  });
  expect(allText()).toContain('Match each term to what it means.');
  pressLabel('Start');
  const terms = byLabel(/^Term \d of 4: /);
  expect(terms).toHaveLength(4);
  // A wrong pair first: term 1 with term 2's meaning. Both stay open.
  const t1 = termText(terms[0]);
  const t2 = termText(terms[1]);
  press(terms[0]);
  // "Selected" is the tile's state, not part of its name (never "selected, selected").
  expect(byLabel(/^Term 1 of 4: /)[0].props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  expect(byLabel(/selected/)).toHaveLength(0);
  expect(allText()).toContain(`Now tap what “${t1}” means.`);
  // The meanings say what a tap will do while a term is picked.
  expect(meaningFor(t2).props.accessibilityHint).toBe(`Matches it to ${t1}.`);
  press(meaningFor(t2));
  expect(byLabel(/, matched$/)).toHaveLength(0);
  // A wrong pair: a static ✗ on both tiles and a line in words, not only a shake.
  expect(allText()).toContain('Not a match. Try again.');
  act(() => jest.advanceTimersByTime(900));
  expect(allText()).toContain('Tap a term, then what it means.');
  // Then right: meaning first, term second works too.
  press(meaningFor(t1));
  press(byLabel(/^Term 1 of 4: /)[0]);
  expect(byLabel(/^Term 1 of 4: .*, matched$/)).toHaveLength(1);
  // A matched tile isn't "dimmed": it stays enabled, and its name carries "matched".
  expect(byLabel(/^Term 1 of 4: .*, matched$/)[0].props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
  // A missed first try is a card due again, never a question answer.
  const card = Object.entries(cp().cards ?? {}).find(([k]) => k.startsWith('kt:'))!;
  expect(card[1].box).toBe(1);
  expect(Object.keys(cp().answers)).toEqual([]);
  // The other three on the first try.
  for (const k of [1, 2, 3]) {
    const t = termText(byLabel(new RegExp(`^Term ${k + 1} of 4: `))[0]);
    press(byLabel(new RegExp(`^Term ${k + 1} of 4: `))[0]);
    press(meaningFor(t));
  }
  expect(allText()).toContain('4 of 4 matched · 3 on the first try');
  expect(allText()).toContain('Next board');
});

it('plays a whole round to the shared recap and saves the level', () => {
  act(() => {
    r = create(<FieldGuide />);
  });
  pressLabel('Start');
  for (let board = 0; board < 3; board++) {
    for (let k = 0; k < 4; k++) {
      const tile = byLabel(new RegExp(`^Term ${k + 1} of 4: `))[0];
      const t = termText(tile);
      press(tile);
      press(meaningFor(t));
    }
    pressLabel(board === 2 ? 'See results' : 'Next board');
  }
  expect(allText()).toContain('Round complete');
  expect(allText()).toContain('First-try matches: 12 of 12');
  expect(cp().gameBest.field).toBe(12);
  expect(cp().gameGrowth?.field).toEqual(expect.objectContaining({ tier: 'seedling', up: 1 }));
});

it('Heartwood: one meaning at a time, pick its term from six', () => {
  useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { field: { tier: 'heartwood', up: 0, down: 0 } } } } });
  act(() => {
    r = create(<FieldGuide />);
  });
  expect(allText()).toContain('Your level:');
  pressLabel('Start');
  const choices = byLabel(/^Choice \d of 6: /);
  expect(choices).toHaveLength(6);
  expect(allText()).toContain('meaning 1 of 4');
});
