/**
 * Practice redesign (Build E, beginner load): the hero is the one action;
 * one "Your path" row opens the mode / domain / length chooser in place;
 * Build a set is folded under its own row with labelled controls; a quick
 * mixed 10 stays one tap away; the why is said once; re-tapping the chosen
 * mode saves nothing; Segmented items are 48pt to the finger.
 */
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import Practice from '../app/(tabs)/practice';
import { pathSummary } from '../components/pathChooser';
import { SEG_HIT_SLOP } from '../components/ui';
import { MODE_INFO } from '../engine/studyModes';
import { router } from 'expo-router';

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
// The Pressable itself (it carries the role and state), not the components wrapping it.
const pressables = () => root().findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole !== undefined);
const byLabel = (label: string | RegExp) =>
  pressables().filter((n) => {
    const name = String(n.props.accessibilityLabel);
    return typeof label === 'string' ? name === label : label.test(name);
  });
const press = (label: string | RegExp) =>
  act(() => {
    byLabel(label)[0].props.onPress();
  });
const radios = () => root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
const radio = (name: RegExp) => radios().find((n) => name.test(String(n.props.accessibilityLabel)))!;
const pathRow = () => byLabel(/^Your path:/)[0];
const heroText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root().findAll((n) => n.props.testID === 'hero-content')[0]);
  return out.join(' ');
};

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, studyMode: undefined, studyDomain: undefined, studySize: undefined, practiceTimer: false });
  jest.mocked(router.push).mockClear();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('Practice: one action, one row', () => {
  it('starts folded: the hero, one summary row, no radios and no Build a set controls', () => {
    mount(<Practice />);
    expect(radios()).toHaveLength(0);
    expect(pathRow().props.accessibilityLabel).toBe('Your path: Random, All domains, 10 questions. Change');
    expect(pathRow().props.accessibilityState).toEqual({ expanded: false });
    expect(allText()).toContain('Random · All domains · 10 questions');
    expect(root().findAll((n) => n.props.testID === 'build-set')).toHaveLength(0);
    expect(byLabel(/^Start \d+ questions/)).toHaveLength(0);
    // The hero's Start is still one tap.
    press('Start');
    expect(useSession.getState().active).toMatchObject({ path: { mode: 'random' } });
  });

  it('the row opens the chooser in place, with named groups; Done folds it', () => {
    mount(<Practice />);
    act(() => {
      pathRow().props.onPress();
    });
    expect(pathRow().props.accessibilityState).toEqual({ expanded: true });
    const text = allText();
    for (const label of ['Mode', 'Domain', 'Length']) expect(text).toContain(label);
    expect(radios().filter((n) => n.props.accessibilityRole === 'radio' && /^(Smart|Guided|In order|Random)/.test(String(n.props.accessibilityLabel)))).toHaveLength(4);
    press('Done');
    expect(radios()).toHaveLength(0);
  });

  it('changing the mode updates the hero and the row, and Start uses it', () => {
    mount(<Practice />);
    act(() => {
      pathRow().props.onPress();
    });
    act(() => {
      radio(/^In order/).props.onPress();
    });
    expect(useSettings.getState().studyMode).toBe('inOrder');
    expect(heroText()).toContain('10 questions, topic by topic');
    expect(pathRow().props.accessibilityLabel).toMatch(/^Your path: In order, All domains, 10 questions/);
    press('Start');
    expect(useSession.getState().active).toMatchObject({ path: { mode: 'inOrder' } });
  });
});

describe('Practice: review fixes', () => {
  it('P2: re-tapping the mode already chosen saves nothing, so "Follow my stage" survives', () => {
    mount(<Practice />);
    act(() => {
      pathRow().props.onPress();
    });
    expect(radio(/^Random/).props.accessibilityState).toEqual({ checked: true });
    act(() => {
      radio(/^Random/).props.onPress();
    });
    expect(useSettings.getState().studyMode).toBeUndefined();
  });

  it('O2: the hero never repeats the mode\'s why, and the suggestion is said once', () => {
    for (const m of ['smart', 'guided', 'inOrder', 'random'] as const) {
      useSettings.setState({ studyMode: m });
      mount(<Practice />);
      expect(heroText()).not.toContain(MODE_INFO[m].why);
      act(() => {
        pathRow().props.onPress();
      });
      // Once on screen: under its radio.
      expect(allText().split(MODE_INFO[m].why).length - 1).toBe(1);
      act(() => r?.unmount());
    }
    useSettings.setState({ studyMode: undefined });
    mount(<Practice />);
    act(() => {
      pathRow().props.onPress();
    });
    expect(allText()).not.toContain('Suggested for your stage');
    expect(radios().filter((n) => String(n.props.accessibilityLabel).includes('Suggested'))).toHaveLength(1);
  });

  it('the hero meta says how long, and "· timed" when the switch is on', () => {
    useSettings.setState({ studyMode: 'smart', studySize: 20, practiceTimer: true });
    mount(<Practice />);
    expect(heroText()).toContain('About 24 min · timed');
    expect(heroText()).toContain('Your path');
  });
});

describe('Practice: a quick mixed 10 is one tap away for everyone', () => {
  it('Guided: "Or 10 mixed questions" starts a random 10 and leaves the path alone', () => {
    useSettings.setState({ studyMode: 'guided' });
    mount(<Practice />);
    expect(byLabel('Open step')).toHaveLength(1);
    press('Or 10 mixed questions');
    const s = useSession.getState().active!;
    expect(s.path).toMatchObject({ mode: 'random' });
    expect(s.questionIds).toHaveLength(10);
    expect(useSettings.getState().studyMode).toBe('guided');
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('shown when the hero is not already a 10-question mix across all domains', () => {
    const cases: [Partial<ReturnType<typeof useSettings.getState>>, boolean][] = [
      [{ studyMode: 'random' }, false],
      [{ studyMode: 'smart' }, false],
      [{ studyMode: 'inOrder' }, true],
      [{ studyMode: 'smart', studySize: 50 }, true],
      [{ studyMode: 'random', studyDomain: '4' }, true],
    ];
    for (const [settings, shown] of cases) {
      useSettings.setState({ studyMode: undefined, studyDomain: undefined, studySize: undefined, ...settings });
      mount(<Practice />);
      expect({ settings, shown: byLabel('Or 10 mixed questions').length === 1 }).toEqual({ settings, shown });
      act(() => r?.unmount());
    }
  });
});

describe('Practice: Build a set (P1, labelled and folded)', () => {
  it('opens under its own row with Domain, Topic, Length and Difficulty, and starts a one-off set', () => {
    mount(<Practice />);
    const row = byLabel(/^Build a set/)[0];
    expect(row.props.accessibilityState).toEqual({ expanded: false });
    act(() => {
      row.props.onPress();
    });
    const panel = root().findAll((n) => n.props.testID === 'build-set')[0];
    const text: string[] = [];
    const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? text.push(n) : n.children.forEach(walk));
    walk(panel);
    expect(text).toEqual(expect.arrayContaining(['Domain', 'Length', 'Difficulty']));
    expect(text).not.toContain('Topic');
    // Pick a domain: topics appear under their own label.
    act(() => {
      panel.findAll((n) => n.props.accessibilityLabel === 'IS Operations' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(allText()).toContain('Topic');
    // The path chooser is a different, folded group: Build a set never changes the path.
    expect(useSettings.getState().studyDomain).toBeUndefined();
    press('Start 10 questions');
    expect(useSession.getState().active).toMatchObject({ mode: 'practice', title: 'IS Operations & Business Resilience' });
  });
});

describe('Segmented (P9): 48pt to the finger', () => {
  it('each segment is at least 44 tall with a hitSlop that makes 48', () => {
    useSettings.setState({ studyMode: 'smart' });
    mount(<Practice />);
    act(() => {
      pathRow().props.onPress();
    });
    const segs = root().findAll((n) => n.props.accessibilityRole === 'radio' && /questions$/.test(String(n.props.accessibilityLabel)) && typeof n.props.onPress === 'function');
    expect(segs).toHaveLength(3);
    for (const s of segs) {
      const style = StyleSheet.flatten(s.props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
      expect(style.minHeight + 2 * s.props.hitSlop).toBeGreaterThanOrEqual(48);
    }
    expect(SEG_HIT_SLOP).toBe(2);
  });
});

it('pathSummary leaves the length out for Guided', () => {
  expect(pathSummary('guided', undefined, 20)).toBe('Guided · All domains');
  expect(pathSummary('smart', undefined, 20)).toBe('Smart · All domains · 20 questions');
});

describe('Practice at 200% text', () => {
  it('the summary row puts "Change" under the summary, and the length choice stacks', () => {
    const rn = jest.requireActual('react-native');
    const spy = jest.spyOn(rn, 'useWindowDimensions').mockReturnValue({ width: 393, height: 852, scale: 3, fontScale: 2 });
    try {
      useSettings.setState({ studyMode: 'smart' });
      mount(<Practice />);
      const rowStyle = StyleSheet.flatten(pathRow().props.style({ pressed: false }));
      expect(rowStyle.flexWrap).toBe('wrap');
      act(() => {
        pathRow().props.onPress();
      });
      const group = root().findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Questions per session' && n.props.style)[0];
      expect(StyleSheet.flatten(group.props.style).flexDirection).toBe('column');
    } finally {
      spy.mockRestore();
    }
  });
});
