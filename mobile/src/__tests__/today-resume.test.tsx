/**
 * Mobile 1.54.3: a paused session can always be resumed from Today.
 *
 * Before, the only way back into a paused, unfinished session was the first row of "Also today", and that
 * whole list sat in the "plan not done yet" branch. So once today's plan was cleared, a learner who paused a
 * Mini mock (Session ✕ → Pause) had no way back into it from the app that day. Now, on a cleared day, one
 * "Also today" row with the Resume entry sits under the clearing, above "Tomorrow"; on an open day it stays
 * the first "Also today" row, said once.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { startMock } from '../lib/sessions';
import { startFirstSet } from '../lib/firstSet';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import type { PlanItem } from '../engine/planner';
import type { DayPlan } from '../engine/dayPlan';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const React = jest.requireActual('react');
  const cache: Record<string, unknown> = {};
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k in t) return t[k];
      return (cache[k] ??= () => React.createElement('Icon', { name: k }));
    },
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
/** Every Resume row: the outermost pressable whose spoken label starts with "Resume:" (one per row). */
const resumeRows = () =>
  root().findAll((n) => typeof n.props.onPress === 'function' && /^Resume: /.test(String(n.props.accessibilityLabel)) && !(n.parent && /^Resume: /.test(String(n.parent.props.accessibilityLabel))));

const NOW = new Date(2026, 9, 15, 9, 0, 0); // a Thursday morning
const today = () => dayKey(NOW.getTime());
const WARM: PlanItem = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };
const REVIEW: PlanItem = { kind: 'review', count: 4, due: 4 };
const MINI: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions' };

const storePlan = (items: PlanItem[], done: boolean[]) => {
  const plan: DayPlan = { day: today(), certId: 'cisa', budget: 30, items, done, start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0 };
  act(() => {
    useProgress.getState().startDay(plan);
  });
};
/** Start a Mini mock, answer its first question, then leave it (Session ✕ → Pause keeps `active` as it is). */
const pauseMiniMock = () => {
  act(() => {
    startMock('cisa', 50);
  });
  const s = useSession.getState().active!;
  act(() => {
    useSession.setState({ active: { ...s, index: 1, responses: { [s.questionIds[0]]: { display: 'A', correct: true } } } });
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  const w = Dimensions.get('window');
  Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, streak: { current: 6, best: 9, lastDay: today() } });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 30, examDates: { cisa: '2026-11-22' } });
  jest.mocked(router.push).mockClear();
});
afterEach(() => {
  unmount();
  useSession.getState().clear();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Today: a paused session can always be resumed', () => {
  it('a cleared plan still offers the paused Mini mock, above "Tomorrow", and the row opens the session', () => {
    storePlan([REVIEW, WARM], [true, true]);
    pauseMiniMock();
    mount(<Today />);
    const t = allText();
    // The day is cleared: the clearing and the Tomorrow preview show.
    expect(t).toContain('Today’s clearing');
    expect(t).toContain('Tomorrow');
    // ONE Resume entry, in the plan's own words.
    const rows = resumeRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].props.accessibilityLabel).toBe('Resume: Mini mock, Question 2 of 50');
    expect(t).toContain('Resume: Mini mock');
    expect(t).toContain('Question 2 of 50');
    // It sits above Tomorrow (reading order), in the same "Also today" list as on an open day.
    expect(byTestID('also-today')).toHaveLength(1);
    expect(t.indexOf('Resume: Mini mock')).toBeLessThan(t.indexOf('Tomorrow'));
    // Only the paused session is listed there on a cleared day.
    expect(textOf(byTestID('also-today')[0])).not.toMatch(/Warm-up|Questions to revisit/);
    act(() => {
      rows[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('an open plan lists Resume once, as the first "Also today" row (unchanged)', () => {
    storePlan([REVIEW, WARM], [true, false]);
    pauseMiniMock();
    mount(<Today />);
    expect(resumeRows()).toHaveLength(1);
    expect(byTestID('also-today')).toHaveLength(1);
    expect(allText()).not.toContain('Today’s clearing');
    expect(allText()).not.toContain('Tomorrow');
  });

  it('a cleared plan with nothing paused shows no "Also today" (Today stays calm)', () => {
    storePlan([REVIEW, WARM], [true, true]);
    mount(<Today />);
    expect(resumeRows()).toHaveLength(0);
    expect(allText()).not.toContain('Also today');
    expect(allText()).toContain('Tomorrow');
  });

  it('a finished session is not offered', () => {
    storePlan([REVIEW, WARM], [true, true]);
    pauseMiniMock();
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, finishedAt: NOW.getTime() } }));
    });
    mount(<Today />);
    expect(resumeRows()).toHaveLength(0);
  });
  it('a cleared plan with an optional mock still open lists only the paused session, not the mock', () => {
    // The mini mock beside timed items is optional: the day clears without it, and it is not listed under the clearing.
    storePlan([REVIEW, MINI, WARM], [true, false, true]);
    pauseMiniMock();
    mount(<Today />);
    expect(allText()).toContain('Today’s clearing');
    const list = byTestID('also-today');
    expect(list).toHaveLength(1);
    expect(resumeRows()).toHaveLength(1);
    // Only the Resume row: the open optional mock ("Mini mock · 50 questions") is not offered again.
    expect(textOf(list[0])).not.toContain('Mini mock · 50');
  });

  it('a paused mock whose time already ran out is still offered on a cleared day (the session screen submits it)', () => {
    storePlan([REVIEW, WARM], [true, true]);
    pauseMiniMock();
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, deadline: NOW.getTime() - 60_000 } }));
    });
    mount(<Today />);
    const rows = resumeRows();
    expect(rows).toHaveLength(1);
    // The heading's minutes never go to zero or below for an expired clock.
    expect(allText()).not.toMatch(/About (0|-\d+) min/);
    act(() => {
      rows[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('a paused first set on a cleared day is offered (there is no first-set Start left to pick it up)', () => {
    storePlan([REVIEW, WARM], [true, true]);
    act(() => {
      startFirstSet('cisa');
    });
    expect(useSession.getState().active?.firstSet).toBe(true);
    mount(<Today />);
    expect(resumeRows()).toHaveLength(1);
  });

  it('a paused first set is NOT listed while the first set is the open plan item (its Start resumes it)', () => {
    storePlan([{ kind: 'practice', count: 5, label: 'First set', why: 'first' } as PlanItem], [false]);
    act(() => {
      startFirstSet('cisa');
    });
    mount(<Today />);
    expect(resumeRows()).toHaveLength(0);
  });

  it('"Do a little more" on a cleared day never silently replaces the paused session', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    storePlan([REVIEW, WARM], [true, true]);
    pauseMiniMock();
    const paused = useSession.getState().active!;
    mount(<Today />);
    const more = root().findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Do a little more');
    expect(more.length).toBeGreaterThan(0);
    act(() => {
      more[0].props.onPress();
    });
    // It asks first (guardedStart) and, until the learner picks "Discard and start", the paused session stays.
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('Replace your unfinished session?');
    expect(useSession.getState().active?.id).toBe(paused.id);
    expect(useSession.getState().active?.finishedAt).toBeUndefined();
    alert.mockRestore();
  });
});

