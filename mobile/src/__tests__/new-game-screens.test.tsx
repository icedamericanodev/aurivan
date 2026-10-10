/**
 * Build E game screens, rendered against the real stores.
 * Root or Rumor: pick a level, tap through a round, cards are recorded (not
 * answers), the recap uses the statement line. Call It First: principle
 * cards first with the options hidden, then the options; the hint makes the
 * answer assisted; answers never set a mastery date; Heartwood hides the
 * options for 10 seconds.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { OptionCard } from '../components/quiz';
import { findQuestion } from '../content/loader';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import RootOrRumor from '../app/game/rumor';
import CallItFirst from '../app/game/callit';

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
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const pressable = (label: string) => root().findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function');
const press = (label: string) =>
  act(() => {
    pressable(label)[0].props.onPress();
  });
const options = () => root().findAllByType(OptionCard);
const cp = () => selectCert(useProgress.getState(), 'cisa');

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('Root or Rumor screen', () => {
  it('plays a round: 12 statements, Root / Rumor buttons, cards recorded, never answers', () => {
    mount(<RootOrRumor />);
    expect(allText()).toContain('Tell a sound principle from an exam myth.');
    expect(allText()).toContain('Pick your level');
    press('Start');
    expect(allText()).toContain('1 of 12');
    expect(pressable('Root, a sound principle').length).toBeGreaterThan(0);
    expect(pressable('Rumor, an exam myth').length).toBeGreaterThan(0);
    for (let k = 0; k < 12; k++) {
      press(k % 2 ? 'Rumor, an exam myth' : 'Root, a sound principle');
      expect(allText()).toMatch(/Root: a sound principle|This one is a Root|Rumor: myth spotted|This one is a Rumor: a myth the exam counts on/);
      press(k === 11 ? 'See results' : 'Next statement');
    }
    expect(allText()).toContain('Round complete');
    expect(allText()).toContain('Longest run of right calls');
    expect(cp().gameBest.rumor).toBeGreaterThanOrEqual(0);
    // Statements are cards, not questions: no answers, no readiness.
    expect(Object.keys(cp().answers)).toHaveLength(0);
    expect(Object.keys(cp().cards ?? {}).length).toBeGreaterThan(0);
    if (cp().gameBest.rumor! < 12) expect(allText()).toContain('Missed statements come back in a later round.');
  });

  it('Heartwood asks "Why?" after a Rumor tap', () => {
    mount(<RootOrRumor />);
    press('Heartwood. All domains, plus “Why?” on each myth.');
    press('Start');
    // Tap Rumor until a statement really is a rumor (half of them are).
    for (let k = 0; k < 12; k++) {
      press('Rumor, an exam myth');
      if (allText().includes('Why is it a myth?')) break;
      press('Next statement');
    }
    expect(allText()).toContain('Why is it a myth?');
    expect(options()).toHaveLength(3);
    act(() => {
      options()[0].props.onPress();
    });
    expect(allText()).toContain('Rumor: myth spotted');
  });
});

describe('Call It First screen', () => {
  it('step 1 hides the options; picking a principle shows them; the answer is recorded without mastery', () => {
    mount(<CallItFirst />);
    expect(allText()).toContain('Name the principle before you see the options.');
    press('Start');
    expect(allText()).toContain('Step 1: which principle does it test?');
    // Only the 3 principle cards: the 4 answer options are hidden.
    expect(options()).toHaveLength(3);
    act(() => {
      options()[0].props.onPress();
    });
    expect(allText()).toContain('Step 2: pick the BEST answer');
    const answerRows = options().filter((o) => typeof o.props.onPress === 'function');
    expect(answerRows).toHaveLength(4);
    act(() => {
      answerRows[0].props.onPress();
    });
    const [id, rec] = Object.entries(cp().answers)[0];
    expect(findQuestion('cisa', id)).toBeDefined();
    expect(rec.lastAssisted).toBeUndefined();
    expect(cp().mastery ?? {}).toEqual({});
  });

  it('the hint (pre-read) makes the answer assisted', () => {
    mount(<CallItFirst />);
    press('Start');
    press('Show a hint');
    expect(allText()).toContain('Assisted. Counts half toward readiness.');
    act(() => {
      options()[0].props.onPress();
    });
    act(() => {
      options().filter((o) => typeof o.props.onPress === 'function')[0].props.onPress();
    });
    expect(Object.values(cp().answers)[0].lastAssisted).toBe(true);
  });

  it('Heartwood: no cards, options hidden for 10 seconds', () => {
    jest.useFakeTimers();
    mount(<CallItFirst />);
    press('Heartwood. No cards: think for 10 seconds, then answer.');
    press('Start');
    expect(allText()).toContain('Options hidden');
    expect(options()).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(10_500);
    });
    expect(options()).toHaveLength(4);
  });
});
