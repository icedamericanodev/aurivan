/**
 * QA Build E (PR #34), on the screens:
 * - Timer: Practice's own Timed switch says it covers "Your path", so it
 *   must reach a Guided step started from Practice too.
 * - Root or Rumor: the score is out of 12, every tap gets its feedback
 *   line, "Read again" shows after 2 misses in one subtopic, and the round
 *   never touches answers, readiness or mastery.
 * - Call It First, Heartwood: EVERY question opens with the 10-second think
 *   pause (options hidden and not tappable), then the options.
 *
 * Bugs are pinned with `it.failing` (passes while the bug is there).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { OptionCard } from '../components/quiz';
import { getNotes } from '../content/notes';
import { rumorStatements, type Statement } from '../engine/games/rootOrRumor';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import Practice from '../app/(tabs)/practice';
import GuidedStep from '../app/guided';
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
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
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
    r?.unmount();
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
  mockParams = {};
  jest.mocked(router.push).mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, studyMode: undefined, studyDomain: undefined, studySize: undefined, practiceTimer: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('Timer: Practice’s Timed switch ("Your path and Build a set")', () => {
  const flipTimed = (on: boolean) =>
    act(() => {
      root().findAll((n) => n.props.title === 'Timed' && typeof n.props.onValueChange === 'function')[0].props.onValueChange(on);
    });

  it('overrides the default for Smart / In order / Random started from the hero', () => {
    useSettings.setState({ practiceTimer: true, studyMode: 'random' });
    mount(<Practice />);
    flipTimed(false);
    press('Start');
    expect(useSession.getState().active?.timed).toBeUndefined();
  });

  // BUG (Minor): Guided ignores the switch. With the Settings default on and
  // the Practice switch turned off, "Open step" → "Start this step" is still
  // timed (and the other way round: default off + switch on = untimed).
  // practice.tsx startPath pushes /guided without the switch, and
  // startGuidedStep has no `timed` option, so the default always wins.
  it('reaches a Guided step opened from the hero', () => {
    useSettings.setState({ practiceTimer: true, studyMode: 'guided' });
    mount(<Practice />);
    flipTimed(false);
    press('Open step');
    const call = jest.mocked(router.push).mock.calls.at(-1)![0] as { pathname: string; params?: Record<string, string> };
    expect(call.pathname).toBe('/guided');
    mockParams = call.params ?? {};
    mount(<GuidedStep />);
    press('Start this step');
    expect(useSession.getState().active?.timed).toBeUndefined();
  });
});

describe('Root or Rumor: score, feedback, Read again, no readiness', () => {
  const all = rumorStatements(getNotes('cisa'));
  const shown = (): Statement => {
    const text = allText();
    const s = all.find((x) => text.includes(x.text));
    if (!s) throw new Error('statement not found on screen');
    return s;
  };
  const playRound = (right: (s: Statement) => boolean) => {
    const feedback: string[] = [];
    for (let k = 0; k < 12; k++) {
      const s = shown();
      const ok = right(s);
      const tapRoot = ok ? s.kind === 'root' : s.kind !== 'root';
      press(tapRoot ? 'Root, a sound principle' : 'Rumor, an exam myth');
      // Heartwood is not used here, so the reveal comes straight away.
      // (Longest lines first: "Root: a sound principle" is inside "This one is a Root…".)
      const line = ['This one is a Root: a sound principle', 'Root: a sound principle', 'This one is a Rumor: a myth the exam counts on', 'Rumor: myth spotted'].find((t) => allText().includes(t));
      feedback.push(`${s.kind}:${ok ? 'right' : 'wrong'}:${line}`);
      expect(allText()).toContain(ok ? '· right' : '· not quite');
      press(k === 11 ? 'See results' : 'Next statement');
    }
    return feedback;
  };
  const untouched = () => JSON.stringify({ a: cp().answers, m: cp().mastery, rv: cp().review, mk: cp().mistakes, mo: cp().moments });

  it('all right: 12 out of 12, the right feedback line for each kind, nothing to read again', () => {
    const before = untouched();
    mount(<RootOrRumor />);
    press('Sapling. All domains, mixed.');
    press('Start');
    const fb = playRound(() => true);
    for (const f of fb) expect(f).toMatch(/^root:right:Root: a sound principle$|^rumor:right:Rumor: myth spotted$/);
    expect(allText()).toContain('Round complete');
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Score 12 out of 12').length).toBeGreaterThan(0);
    expect(allText()).not.toContain('Read again');
    expect(allText()).not.toContain('Missed statements come back');
    expect(untouched()).toBe(before);
    expect(cp().gameBest.rumor).toBe(12);
  });

  it('all wrong: 0 out of 12, the "missed" feedback for each kind, Read again for paired subtopics', () => {
    const before = untouched();
    mount(<RootOrRumor />);
    press('Start');
    const fb = playRound(() => false);
    for (const f of fb) expect(f).toMatch(/^root:wrong:This one is a Root: a sound principle$|^rumor:wrong:This one is a Rumor: a myth the exam counts on$/); // UX review P7 copy
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Score 0 out of 12').length).toBeGreaterThan(0);
    expect(allText()).toContain('Missed statements come back in a later round.');
    // A Seedling round pairs a Root and a Rumor per subtopic: 2 misses there.
    expect(allText()).toContain('Read again');
    expect(root().findAll((n) => /^Read again: /.test(String(n.props.accessibilityLabel))).length).toBeGreaterThan(0);
    expect(untouched()).toBe(before);
  });

  it('one miss in a subtopic is not enough for Read again', () => {
    mount(<RootOrRumor />);
    press('Start');
    let missedOnce = false;
    playRound(() => {
      if (missedOnce) return true;
      missedOnce = true;
      return false;
    });
    expect(allText()).toContain('Missed statements come back in a later round.');
    expect(allText()).not.toContain('Read again');
  });
});

describe('Call It First, Heartwood: the think pause on every question', () => {
  it('each of the 5 questions hides its options for 10 s; nothing can be picked meanwhile; scored out of 5', () => {
    jest.useFakeTimers();
    mount(<CallItFirst />);
    press('Heartwood. No cards: think for 10 seconds, then answer.');
    press('Start');
    for (let k = 0; k < 5; k++) {
      expect(allText()).toContain(`${k + 1} of 5`);
      expect(allText()).toContain('Options hidden');
      expect(options()).toHaveLength(0);
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(options()).toHaveLength(0);
      act(() => {
        jest.advanceTimersByTime(5_500);
      });
      expect(options()).toHaveLength(4);
      act(() => {
        options()[0].props.onPress();
      });
      press(k === 4 ? 'See results' : 'Next question');
    }
    expect(allText()).toContain('Round complete');
    expect(allText()).toContain('out of 5');
    expect(Object.keys(cp().answers)).toHaveLength(5);
    expect(Object.values(cp().answers).every((a) => !a.lastAssisted)).toBe(true);
  });
});
