/**
 * Mobile 1.9 on the screens: Today's clearing (T2), Results' growth, You's
 * "+4" since the last look, and the milestone moment waiting until it is
 * on screen. Each in full motion and with Reduce Motion: the words are the
 * same, only the movement differs.
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Results from '../app/results';
import { MilestoneMomentView, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getAllQuestions } from '../content/loader';
import { flushSayLaterForTest } from '../lib/a11y';
import { finishSession } from '../lib/finishSession';
import { startFromIds } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
// The screens are on view: useFocusEffect runs its callback like a focused screen.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSuccess = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(r!.root);
/** Rolling digit columns on screen (only ever drawn while/after a number rolls). */
const columns = () => r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string' && n.props.children.startsWith(' \n0\n1'));

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  resetBadgeMomentsForTest();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true });
  mockSuccess.mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.restoreAllMocks();
});

/** Today with its plan done (not yet celebrated), and 31 questions, 81%, 24 minutes. */
function clearToday() {
  // Today makes the day's plan when it first opens; then, away from Today, it gets done.
  mount(<Today />);
  act(() => {
    r!.unmount();
  });
  act(() => {
    const d = useProgress.getState().days.cisa!;
    useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...d, done: d.done.map(() => true), celebrated: false, answered: 31, correct: 25, minutes: 24 } } }));
  });
  mockSuccess.mockClear();
}

describe('Today’s clearing (T2)', () => {
  it('full motion: plays once, its numbers roll, the words are there and spoken once, one success haptic', () => {
    setMockReducedMotion(false);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    clearToday();
    mount(<Today />);
    expect(allText()).toContain('Today’s clearing');
    expect(columns().length).toBeGreaterThan(0); // the day's numbers rolled
    flushSayLaterForTest(); // spoken after a short pause (a screen change must not cut it off)
    expect(say.mock.calls.filter(([t]) => String(t).startsWith('Today’s clearing.'))).toHaveLength(1);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(useProgress.getState().days.cisa!.celebrated).toBe(true);
    expect(useSeen.getState().moments.clearing).toBe(1);
    // Spoken as numbers, never as moving digits.
    expect(r!.root.findAll((n) => n.props.accessibilityLabel === '31 questions' && typeof n.type === 'string')).toHaveLength(1);
    // …and only once: the rolling digits inside the group are not a second stop.
    expect(r!.root.findAll((n) => n.props.accessible === true && typeof n.type === 'string' && /^\d+( percent)?$/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
  });

  it('Reduce Motion: the same words and numbers at once, nothing rolls; the haptic is kept', () => {
    clearToday();
    mount(<Today />);
    expect(allText()).toContain('Today’s clearing');
    expect(allText()).toContain('31');
    expect(columns()).toHaveLength(0);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('a later visit the same day shows it still (it never replays)', () => {
    setMockReducedMotion(false);
    clearToday();
    mount(<Today />);
    act(() => {
      r!.unmount();
    });
    mount(<Today />);
    expect(columns()).toHaveLength(0);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('Results growth', () => {
  const d1 = getAllQuestions('cisa').filter((q) => q.domainId === '1').slice(0, 3);
  const finish = (right: number) => {
    act(() => {
      startFromIds('cisa', d1.map((q) => q.id), 'Practice · IS Audit');
    });
    d1.forEach((q, i) => {
      act(() => {
        useSession.getState().answer(q.id, { display: 'A', correct: i < right, ms: 30_000 });
      });
    });
    act(() => {
      finishSession();
    });
  };

  it('a good session grows in: the score and "correct" roll (full motion)', () => {
    setMockReducedMotion(false);
    finish(2);
    mount(<Results />);
    expect(columns().length).toBeGreaterThan(0);
    expect(allText()).toContain('2/3');
  });

  it('never on a session that went badly: below 60% it is simply shown', () => {
    setMockReducedMotion(false);
    finish(1);
    mount(<Results />);
    expect(columns()).toHaveLength(0);
    expect(allText()).toContain('33');
  });
});

describe('You: what went up since the last look', () => {
  it('a domain that rose since You was last seen gets a quiet "+N" beside it; nothing else is marked', () => {
    // Some answers in IS Audit, seen at a lower value.
    const ids = getAllQuestions('cisa').filter((q) => q.domainId === '1').slice(0, 25).map((q) => q.id);
    act(() => {
      for (const id of ids) useProgress.getState().recordAnswer('cisa', id, true);
    });
    mount(<You />);
    const now = useSeen.getState().values['you:rings:cisa'];
    act(() => {
      r!.unmount();
    });
    useSeen.setState((s) => ({ values: { ...s.values, 'you:rings:cisa': now.map((v, i) => (i === 0 ? Math.max(0, v - 7) : v)) } }));
    mount(<You />);
    const tags = allText().match(/\+\d+/g) ?? [];
    expect(tags).toEqual(['+7']);
  });
});

describe('the milestone moment', () => {
  it('waits until it is on screen to move, its haptic with it; its words do not wait', () => {
    setMockReducedMotion(false);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const moment = { key: 'rooted:10', kind: 'milestone' as const, label: 'Rooted · 10 days', rule: 'Study on 10 days in all.', set: 'rooted', setName: 'Rooted', unlock: 'Ten study days.', tier: 1 };
    mount(<MilestoneMomentView moment={moment as never} once="s1" inView={false} />);
    expect(mockSuccess).not.toHaveBeenCalled();
    flushSayLaterForTest();
    expect(say.mock.calls.filter(([t]) => String(t).startsWith('A new badge, Rooted: Rooted · 10 days · Clay. Ten study days.'))).toHaveLength(1);
    expect(useSeen.getState().moments.milestone).toBeUndefined(); // not played yet
    act(() => {
      r!.update(<MilestoneMomentView moment={moment as never} once="s1" inView />);
    });
    expect(useSeen.getState().moments.milestone).toBe(1);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });
});
