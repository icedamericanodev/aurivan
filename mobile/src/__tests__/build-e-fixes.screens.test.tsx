/**
 * Build E review fixes, on the screens (everything outside the Practice tab):
 * - Results: "Back to your Guided step" goes back to the Guided screen
 *   already in the stack (no second copy) and keeps the step's Timed choice.
 * - Root or Rumor (UX review H1, P7, O4): the Heartwood Why step is
 *   announced and grouped, the reveal is spoken with the verdict, and a
 *   missed myth offers its note.
 * - Call It First (UX review P5, P6; code review): principle cards are never
 *   spoken as "best answer", the step-1 caption doesn't repeat the card's
 *   tag, and the answer time counts only the time the options were shown.
 * - Session (UX review P3): at large text the reason-tag row wraps and the
 *   domain tag takes the full width.
 * - Notes domain page (UX review P4): "Practice this topic" names its topic.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { router } from 'expo-router';
import { AccessibilityInfo, AppState, Dimensions, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import CallItFirst from '../app/game/callit';
import RootOrRumor from '../app/game/rumor';
import NotesDomain from '../app/notes/[domain]';
import Results from '../app/results';
import SessionScreen from '../app/session';
import { OptionCard } from '../components/quiz';
import { Tag } from '../components/ui';
import { getNotes } from '../content/notes';
import { rumorStatements, type Statement } from '../engine/games/rootOrRumor';
import { finishSession } from '../lib/finishSession';
import { scopeTopics } from '../lib/outline';
import { startGuidedStep, startStudy } from '../lib/sessions';
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
let mockCanDismiss = true;
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, canDismiss: () => mockCanDismiss },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({ addListener: () => () => {} }),
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
const press = (label: string) =>
  act(() => {
    root().findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function')[0].props.onPress();
  });

beforeEach(() => {
  mockCanDismiss = true;
  mockParams = {};
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

describe('Root or Rumor: what a screen reader hears, and the note after a missed myth', () => {
  const all = rumorStatements(getNotes('cisa'));
  const shown = (): Statement => {
    const text = allText();
    const st = all.find((x) => text.includes(x.text));
    if (!st) throw new Error('statement not found on screen');
    return st;
  };
  const said = () => jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls.map((c) => c[0]);
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  /** Tap until a Rumor is on screen (Roots are answered right on the way). */
  const toRumor = () => {
    for (let k = 0; k < 12; k++) {
      if (shown().kind === 'rumor') return shown();
      press('Root, a sound principle');
      press('Next statement');
    }
    throw new Error('no Rumor in the round');
  };

  it('Heartwood: the Why step is announced with the verdict and grouped; the reveal is spoken with the verdict', () => {
    mount(<RootOrRumor />);
    press('Heartwood. All domains, plus “Why?” on each myth.');
    press('Start');
    const st = toRumor();
    press('Rumor, an exam myth');
    expect(said()).toContain('You said Rumor, right. Why is it a myth? Pick the reason.');
    const group = root().findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Why is it a myth?');
    expect(group.length).toBeGreaterThan(0);
    const choices = group[0].findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(choices).toHaveLength(3);
    act(() => {
      choices[0].props.onPress();
    });
    expect(said()).toContain('You said Rumor, right. Rumor: myth spotted');
    expect(st.kind).toBe('rumor');
  });

  it('a missed myth says what it really is and offers "Read the note"', () => {
    mount(<RootOrRumor />);
    press('Sapling. All domains, mixed.');
    press('Start');
    const st = toRumor();
    press('Root, a sound principle');
    expect(allText()).toContain('This one is a Rumor: a myth the exam counts on');
    expect(said()).toContain('You said Root, not quite. This one is a Rumor: a myth the exam counts on');
    press('Read the note');
    expect(router.push).toHaveBeenCalledWith(`/notes/subtopic/${encodeURIComponent(st.subtopicId)}`);
  });

  it('a myth spotted right needs no note button', () => {
    mount(<RootOrRumor />);
    press('Sapling. All domains, mixed.');
    press('Start');
    toRumor();
    press('Rumor, an exam myth');
    expect(root().findAll((n) => n.props.label === 'Read the note')).toHaveLength(0);
  });
});

describe('Call It First: principle cards, the step-1 caption, and the answer time', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const cards = () =>
    root()
      .findAllByType(OptionCard)
      .filter((n) => n.props.spokenSuffix !== undefined);
  const labelOf = (n: ReactTestInstance) => n.findAll((x) => typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.startsWith('Option '))[0].props.accessibilityLabel as string;

  it('principle cards say "the principle" / "your pick, not the principle", never "best answer"; the caption is "Step 1 · your call"', () => {
    mount(<CallItFirst />);
    press('Start');
    const first = root()
      .findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Which principle does it test?')[0]
      .findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(first).toHaveLength(3);
    act(() => {
      first[0].props.onPress();
    });
    const spoken = cards().map(labelOf);
    expect(spoken.length).toBeGreaterThanOrEqual(1);
    expect(spoken.some((l) => /, (your pick, )?the principle$/.test(l))).toBe(true);
    expect(spoken.every((l) => /, (your pick, )?(not )?the principle$/.test(l) && !l.includes('best answer'))).toBe(true);
    // Picked a decoy: both cards stay; picked the principle: one card says so.
    expect(spoken.length === 2 ? spoken.some((l) => l.endsWith(', your pick, not the principle')) : spoken[0].endsWith(', your pick, the principle')).toBe(true);
    expect(allText()).toContain('Step 1 · your call');
  });

  it('the answer time leaves out step 1: 30 s naming the principle, 5 s on the options = about 5 s', () => {
    jest.useFakeTimers({ now: Date.UTC(2026, 9, 10, 9) });
    // The app is in front (the clock pauses in the background).
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>);
    Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
    mount(<CallItFirst />);
    press('Start');
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    const pick = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    act(() => {
      pick[0].props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    const opts = root()
      .findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Answer options')[0]
      .findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    act(() => {
      opts[0].props.onPress();
    });
    const answers = Object.values(selectCert(useProgress.getState(), 'cisa').answers);
    expect(answers).toHaveLength(1);
    expect(answers[0].ms).toBeGreaterThanOrEqual(4_500);
    expect(answers[0].ms).toBeLessThan(6_000);
  });
});

describe('Session: the reason-tag row at large text', () => {
  const setScale = (fontScale: number) => {
    const w = Dimensions.get('window');
    act(() => {
      Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
    });
  };
  afterEach(() => setScale(1));
  /** The View holding the domain Tag, and the row around it. */
  const tagBox = () => root().findAllByType(Tag)[0].parent!;
  const flat = (st: unknown) => Object.assign({}, ...[st].flat(3).filter(Boolean)) as Record<string, unknown>;

  it('wraps at large text, with the domain tag on its own full-width line; one line at 100%', () => {
    startStudy('cisa', { mode: 'smart', count: 10 });
    expect(Object.keys(useSession.getState().active!.reasons ?? {}).length).toBeGreaterThan(0);
    setScale(2);
    mount(<SessionScreen />);
    expect(flat(tagBox().props.style)).toMatchObject({ flexBasis: '100%' });
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Why this question: ')).length).toBeGreaterThan(0);
    setScale(1);
    mount(<SessionScreen />);
    expect(flat(tagBox().props.style)).toMatchObject({ flex: 1 });
  });
});

describe('Notes domain page: "Practice this topic" names its topic', () => {
  it('each button is spoken with its topic name', () => {
    mockParams = { domain: '4' };
    mount(<NotesDomain />);
    const buttons = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Practice this topic: ') && typeof n.props.onPress === 'function');
    // (Each Button and its Pressable both carry the label: count distinct ones.)
    const labels = new Set(buttons.map((b) => b.props.accessibilityLabel as string));
    const names = scopeTopics('cisa', '4').map((t) => `Practice this topic: ${t.name}`);
    expect(labels.size).toBeGreaterThan(1);
    expect([...labels].every((l) => names.includes(l))).toBe(true);
  });
});
