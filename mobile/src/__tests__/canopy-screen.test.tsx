/**
 * Canopy Call screen against the real stores: a decision, role rows in a
 * radio group, the why and the auditor's move, review cards (never
 * answers), and the round end's confusion pairs.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import CanopyCall from '../app/game/canopy';
import { getRoleDeck } from '../content/games';
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
const deck = getRoleDeck('cisa')!;
const cp = () => selectCert(useProgress.getState(), 'cisa');
/** The card on screen (its decision is the stem). */
const current = () => {
  const text = allText();
  return deck.cards.find((c) => text.includes(c.decision))!;
};
const roleLabel = (id: string) => deck.roles.find((x) => x.id === id)!.label;

beforeEach(() => {
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

it('plays ten decisions: right and wrong calls, reveal, cards, confusion pairs, level', () => {
  act(() => {
    r = create(<CanopyCall />);
  });
  expect(allText()).toContain('Choose who has the authority to decide.');
  pressLabel('Start');
  for (let k = 0; k < 10; k++) {
    const card = current();
    const rows = byLabel(/^Role \d of 4: /);
    expect(rows).toHaveLength(4);
    // Never a role the reviewers excluded for this card.
    for (const x of card.excludeChips) expect(rows.some((n) => n.props.accessibilityLabel.includes(roleLabel(x)))).toBe(false);
    // The first two calls go wrong on purpose.
    const target = k < 2 ? rows.find((n) => !n.props.accessibilityLabel.endsWith(roleLabel(card.role)))! : rows.find((n) => n.props.accessibilityLabel.endsWith(roleLabel(card.role)))!;
    press(target);
    expect(allText()).toContain(card.why);
    if (k < 2) expect(byLabel(/^Read the note$/).length + root().findAll((n) => n.props.label === 'Read the note').length).toBeGreaterThan(0);
    pressLabel(k === 9 ? 'See results' : 'Next decision');
  }
  expect(allText()).toContain('Round complete');
  expect(allText()).toContain('Where your calls went');
  expect(allText()).toMatch(/You gave one .+ decision to .+\./);
  expect(allText()).toContain('Missed decisions come back in a later round.');
  // The two misses are review cards due again (right first calls need no review).
  const cards = Object.entries(cp().cards ?? {});
  expect(cards).toHaveLength(2);
  expect(cards.every(([k, e]) => k.startsWith('role:') && e.box === 1)).toBe(true);
  expect(Object.keys(cp().answers)).toEqual([]);
  expect(cp().gameBest.canopy).toBe(8);
  expect(cp().gameGrowth?.canopy).toEqual(expect.objectContaining({ tier: 'seedling', up: 1 }));
});

it('Heartwood offers five roles and asks who acts first', () => {
  useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { canopy: { tier: 'heartwood', up: 0, down: 0 } } } } });
  act(() => {
    r = create(<CanopyCall />);
  });
  pressLabel('Start');
  expect(byLabel(/^Role \d of 5: /)).toHaveLength(5);
  expect(allText()).toContain('Who acts first?');
});

it('after the level grows, "Play again" plays the NEW level (code review)', () => {
  // One strong round at Sapling already: the next strong one grows it to Heartwood.
  useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { canopy: { tier: 'sapling', up: 1, down: 0 } } } } });
  act(() => {
    r = create(<CanopyCall />);
  });
  pressLabel('Start');
  for (let k = 0; k < 10; k++) {
    const card = current();
    const rows = byLabel(/^Role \d of \d: /);
    // A locked radio keeps its element after the answer, and the pick reads as checked.
    const target = rows.find((n) => n.props.accessibilityLabel.endsWith(roleLabel(card.role)))!;
    press(target);
    const after = byLabel(/^Role \d of \d: /).find((n) => n.props.accessibilityLabel.includes(roleLabel(card.role)))!;
    expect(after.props.accessibilityState).toEqual(expect.objectContaining({ checked: true, disabled: true }));
    pressLabel(k === 9 ? 'See results' : 'Next decision');
  }
  expect(cp().gameGrowth?.canopy?.tier).toBe('heartwood');
  expect(allText()).toContain('You’ve grown to Heartwood.');
  pressLabel('Play again');
  expect(byLabel(/^Role \d of 5: /)).toHaveLength(5);
});
