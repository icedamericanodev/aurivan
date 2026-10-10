/**
 * Build D: Daylight through the real screen.
 * - pick a light (the suggestion is pre-selected), then 5 questions share it;
 * - answers feed progress with their time (never mastery);
 * - the light waits while the explanation shows, and while paused (the
 *   question is hidden then);
 * - flag & move on; Seedling's "Add a minute";
 * - when the light sets: unanswered questions are revealed, go to review
 *   WITHOUT counting as answered, and the round is saved;
 * - the pace is announced at half the light and 10% left, once each.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import DaylightScreen from '../app/game/daylight';
import { PaceStrip } from '../components/pace';
import { OptionCard } from '../components/quiz';
import { selectCert, useProgress } from '../store/progress';
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
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const S = 1000;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const press = (label: string) =>
  act(() => {
    root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0].props.onPress();
  });
const has = (label: string) => root().findAll((n) => n.props.label === label && typeof n.props.onPress === 'function').length > 0;
const tick = (ms: number) => {
  // One second at a time, like the real interval, so every step re-renders.
  for (let t = 0; t < ms; t += S) {
    act(() => {
      jest.advanceTimersByTime(S);
    });
  }
};
const strip = () => root().findByType(PaceStrip).props;
const cards = () => root().findAllByType(OptionCard);
const cp = () => selectCert(useProgress.getState(), 'cisa');
/** The stem on screen: the first option card's question is found through its text. */
const tapFirst = () =>
  act(() => {
    cards()[0].props.onPress();
  });
let announce: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(
    () => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>,
  );
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  announce.mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
  act(() => {
    r = create(<DaylightScreen />);
  });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('picking a light', () => {
  it('suggests Seedling to a new learner and explains the round', () => {
    expect(allText()).toContain('Answer at exam pace.');
    expect(allText()).toContain('Suggested: Seedling, from your recent answer times.');
    expect(allText()).toContain('120 s a question · 10 min of light · you can add time');
    const radios = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(radios.map((n) => n.props.accessibilityLabel)).toEqual([
      'Seedling, 120 seconds a question, suggested',
      'Sapling, 96 seconds a question',
      'Heartwood, 80 seconds a question',
    ]);
    act(() => {
      radios[2].props.onPress();
    });
    expect(allText()).toContain('80 s a question · 7 min of light');
  });
});

describe('a round', () => {
  it('answers feed progress with their time; the light waits while reading', () => {
    press('Heartwood, 80 seconds a question');
    press('Start');
    expect(strip().clock.text).toBe('06:40');
    tick(20 * S);
    expect(strip().clock.text).toBe('06:20');
    tapFirst();
    const answered = Object.entries(cp().answers);
    expect(answered).toHaveLength(1);
    expect(answered[0][1].ms).toBe(20 * S);
    // Daylight answers never count toward subtopic mastery dates.
    expect(cp().mastery ?? {}).toEqual({});
    // The explanation is open: the light does not move.
    tick(60 * S);
    expect(strip().clock.text).toBe('06:20');
    press('Next question');
    tick(5 * S);
    expect(strip().clock.text).toBe('06:15');
  });

  it('flag & move on parks the question; pause hides it and holds the light', () => {
    press('Start'); // Seedling
    const firstStem = cards()[0].props.text;
    tick(10 * S);
    press('Flag & move on');
    expect(cards()[0].props.text).not.toBe(firstStem);
    press('Pause');
    expect(cards()).toHaveLength(0); // hidden while paused
    expect(strip().line).toEqual({ text: 'Paused. The light holds.', tone: 'note' });
    const at = strip().clock.text;
    tick(120 * S);
    expect(strip().clock.text).toBe(at);
    press('Resume');
    expect(cards().length).toBeGreaterThan(0);
  });

  it('Seedling can add a minute', () => {
    press('Start');
    expect(strip().clock.text).toBe('10:00');
    press('Add a minute');
    expect(strip().clock.text).toBe('11:00');
  });

  it('Sapling and Heartwood have no "Add a minute"', () => {
    press('Sapling, 96 seconds a question');
    press('Start');
    expect(has('Add a minute')).toBe(false);
  });

  it('when the light sets: unanswered questions go to review unanswered, revealed on the end screen', () => {
    press('Sapling, 96 seconds a question');
    press('Start');
    tapFirst();
    const answeredId = Object.keys(cp().answers)[0];
    press('Next question');
    // Run out the light: 8 minutes.
    tick(480 * S);
    expect(allText()).toContain('The light set before these');
    expect(allText()).toContain('Shown, not marked wrong. They are in your review.');
    expect(allText()).toContain('This is where time went');
    const c = cp();
    // Only the one answered question counts as answered.
    expect(Object.keys(c.answers)).toEqual([answeredId]);
    // The other four are in review, due now, without an answer record.
    const queued = Object.keys(c.review).filter((id) => id !== answeredId);
    expect(queued).toHaveLength(4);
    for (const id of queued) expect(c.answers[id]).toBeUndefined();
    // The round is saved once.
    expect(c.gameRecent.daylight).toHaveLength(1);
    // Announcements wait ~350 ms so they don't cut off the tap's feedback (P8).
    tick(S);
    expect(announce).toHaveBeenCalledWith('The light has set. Unanswered questions are shown, not marked wrong.');
  });

  it('the pace is said at half the light and with 10% left, once each', () => {
    press('Sapling, 96 seconds a question');
    press('Start');
    tick(250 * S);
    const half = announce.mock.calls.filter(([t]) => String(t).startsWith('Half the light is gone.'));
    expect(half).toHaveLength(1);
    tick(190 * S); // 440 s of 480: under 10% left
    const tenth = announce.mock.calls.filter(([t]) => String(t).includes('of light left.'));
    expect(tenth).toHaveLength(1);
    tick(20 * S);
    expect(announce.mock.calls.filter(([t]) => String(t).startsWith('Half the light is gone.'))).toHaveLength(1);
  });

  it('the pace can be heard on request', () => {
    press('Start');
    act(() => {
      root().findAll((n) => n.props.accessibilityHint === 'Reads the pace aloud.' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(announce).not.toHaveBeenCalledWith('Light left 10 minutes. On pace');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    // Tap-to-hear keeps the precise time; the strip's own label speaks whole minutes.
    expect(announce).toHaveBeenCalledWith('Light left 10 minutes. On pace');
  });
});
