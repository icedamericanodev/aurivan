/**
 * Mobile 1.24, Today in the first days ("first five minutes"):
 * - Day 0: the first five questions is the whole plan: a title, "5 questions, no timer", one Start pill that
 *   starts the SAME five questions; no checklist, no tiles, no readiness row, nothing that says "Not yet";
 * - the title is never repeated as the first checklist row, and the optional weekly mock is an "Also today"
 *   row, never a checklist row;
 * - the Start pill hugs its label (left aligned), the same in light and dark;
 * - the readiness row before the range is a goal ("5 of 40 for your first range"); the daily disclaimer is gone;
 * - the stage line shows only for a few days after the stage changes, and never for the first stage;
 * - "Your first readiness range": one calm card the first time the range appears, then never again;
 * - the reminder ask's one second chance: the day the 3rd study day is done, once, never after "no".
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getAllQuestions } from '../content/loader';
import { firstSetIds } from '../content/firstSet';
import type { DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { dayKey } from '../engine/streak';
import { completeCert, selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

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
const mockEnsure = jest.fn(async () => true);
const mockSchedule = jest.fn(async () => {});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: () => mockEnsure(),
  scheduleReminders: (...a: unknown[]) => (mockSchedule as (...x: unknown[]) => Promise<void>)(...a),
  cancelReminders: async () => {},
  initNotifications: () => {},
}));

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
const pill = () => root().findAll((n) => typeof n.props.onPress === 'function' && /^(Start|Continue)$/.test(String(n.props.accessibilityLabel)))[0];
const button = (label: RegExp) => root().findAll((n) => typeof n.props.onPress === 'function' && label.test(String(n.props.accessibilityLabel)))[0];
const press = async (label: RegExp) => {
  const n = button(label);
  if (!n) throw new Error(`no button ${label}`);
  await act(async () => {
    n.props.onPress();
  });
};

const NOW = new Date(2026, 9, 15, 9, 0, 0); // a Thursday morning
const today = () => dayKey(NOW.getTime());
const DAY = 86_400_000;
const FIRST: PlanItem = { kind: 'practice', count: 5, label: 'Your first five', why: 'first' };
const REVIEW: PlanItem = { kind: 'review', count: 20, due: 20 };
const LESSON: PlanItem = { kind: 'lesson', lessonId: 'cisa-l-d1-charter', title: 'Business impact analysis', minutes: 5 };
const WARM: PlanItem = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };
const MOCK: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 };

const storePlan = (items: PlanItem[], done: boolean[]) => {
  const plan: DayPlan = { day: today(), certId: 'cisa', budget: 20, items, done, start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0 };
  act(() => {
    useProgress.getState().startDay(plan);
  });
};
/** `perDomain` real answers in each domain, `right` of each domain's right (latest try). */
const seed = (perDomain: number, rightPerDomain: number) => {
  const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
  for (const d of ['1', '2', '3', '4', '5']) {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === d)
      .slice(0, perDomain)
      .forEach((q, i) => {
        const ok = i < rightPerDomain;
        answers[q.id] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: NOW.getTime() - DAY };
      });
  }
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), answers }) } }));
  });
};
const setMilestones = (days: number, lastDay: string) =>
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), milestones: { earned: {}, days, lastDay } }) } }));
  });

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState(useSeen.getInitialState(), true);
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, byCert: {}, streak: { current: 0, best: 0, lastDay: null } });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: '2026-11-26' } });
  jest.mocked(router.push).mockClear();
  mockEnsure.mockReset().mockResolvedValue(true);
  mockSchedule.mockClear();
});
afterEach(() => {
  unmount();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Day 0: the first five is the whole plan', () => {
  it('a title, one plain line, one pill; no checklist, no tiles, no readiness row, nothing that says "Not yet"', () => {
    storePlan([FIRST], [false]);
    mount(<Today />);
    const t = allText();
    expect(t).toContain('Today’s plan · about 6 min');
    expect(t).toContain('Your first five 5 questions, no timer');
    expect(byTestID('plan-checklist')).toHaveLength(0);
    expect(byTestID('today-tiles')).toHaveLength(0);
    expect(byTestID('readiness-tap')).toHaveLength(0);
    expect(t).not.toMatch(/Not yet|Not enough data|Also today|Stage \d|accuracy/i);
    expect(t).not.toMatch(/\bcheck\b|diagnos/i);
    expect(pill().props.accessibilityLabel).toBe('Start');
  });

  it('Start begins the SAME five questions, in the same order, with no timer', async () => {
    storePlan([FIRST], [false]);
    mount(<Today />);
    await act(async () => {
      pill().props.onPress();
    });
    const s = useSession.getState().active!;
    expect(s.questionIds).toEqual([...firstSetIds('cisa')]);
    expect(s.firstSet).toBe(true);
    expect(s.timed).toBeFalsy();
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('a paused first set is listed under "Also today" as the one thing to resume', async () => {
    storePlan([FIRST], [false]);
    mount(<Today />);
    await act(async () => {
      pill().props.onPress();
    });
    unmount();
    mount(<Today />);
    expect(allText()).toMatch(/Resume: Your first five/);
  });
});

describe('the Start pill hugs its label', () => {
  it.each(['light', 'dark'] as const)('left aligned, never a full-width bar (%s)', (theme) => {
    useSettings.setState({ theme });
    storePlan([WARM, REVIEW], [false, false]);
    mount(<Today />);
    const style = StyleSheet.flatten(pill().props.style);
    expect(style.alignSelf).toBe('flex-start');
    expect(style.minHeight).toBeGreaterThanOrEqual(52);
  });
});

describe('the title is said once, and the optional mock is not a checklist row', () => {
  it('the item you are on is the title; the checklist lists only what follows', () => {
    storePlan([REVIEW, LESSON, WARM], [false, false, false]);
    mount(<Today />);
    const lines = byTestID('plan-checklist')[0]
      .findAll((n) => typeof n.type === 'string' && n.props.accessible === true)
      .map((n) => n.props.accessibilityLabel as string);
    expect(lines).toEqual(['Lesson · Business impact analysis, later', 'Warm-up · 5 questions, later']);
    // "Spaced review" is the panel's title once; it is not a first row too.
    expect(lines.some((l) => /^Spaced review/.test(l))).toBe(false);
    expect(root().findAll((n) => n.props.accessibilityRole === 'header' && textOf(n) === 'Spaced review').length).toBeGreaterThan(0);
  });

  it('the weekly mini mock is an "Also today" row, with its length, and not part of "N of N done"', () => {
    storePlan([WARM, MOCK], [false, false]);
    mount(<Today />);
    // With one required item there is no checklist at all.
    expect(byTestID('plan-checklist')).toHaveLength(0);
    expect(allText()).toContain('Also today');
    expect(allText()).toContain('Mini mock Optional this week · about 80 min');
    const caption = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Today’s plan/.test(n.props.accessibilityLabel))[0];
    expect(caption.props.accessibilityLabel).toMatch(/0 of 1 done$/);
  });
});

describe('the readiness row', () => {
  it('before the range exists it is the goal, with no disclaimer', () => {
    seed(1, 1); // five answers
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(allText()).toContain('5 of 40 for your first range');
    expect(allText()).not.toMatch(/range not a promise|not a prediction/);
  });

  it('assisted answers count half toward the goal, as they do toward the range', () => {
    // Five answers, all after a hint: they count as 2.5 toward the 40, so the goal line says 2 of 40 (rounded down).
    act(() => {
      const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number; lastAssisted: boolean }> = {};
      getAllQuestions('cisa').slice(0, 6).forEach((q) => (answers[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NOW.getTime() - DAY, lastAssisted: true }));
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), answers }) } }));
    });
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(allText()).toMatch(/\b[1-3] of 40 for your first range/);
  });
});

describe('the stage line rests unless it is new', () => {
  const stageKey = 'stage:cisa';
  const dayNum = () => Math.floor(Date.parse(`${today()}T00:00:00Z`) / DAY);

  it('shows for a few days after the stage changes, then rests', () => {
    seed(40, 30); // 200 answers: a stage past the first
    storePlan([WARM, REVIEW], [false, false]);
    mount(<Today />);
    expect(allText()).toMatch(/Stage \d · /);
    unmount();
    // Seen on the same stage 2 days ago: still shown. 3 days ago: rests.
    const idx = Number(allTextStageIndex());
    useSeen.setState({ values: { [stageKey]: [idx, dayNum() - 2] } });
    mount(<Today />);
    expect(allText()).toMatch(/Stage \d · /);
    unmount();
    useSeen.setState({ values: { [stageKey]: [idx, dayNum() - 3] } });
    mount(<Today />);
    expect(allText()).not.toMatch(/Stage \d · /);
  });

  /** The stage number the first mount showed (read from the saved note), as a zero-based index. */
  function allTextStageIndex(): number {
    return (useSeen.getState().values[stageKey]?.[0] ?? 0) as number;
  }

  it('a changed stage starts the count again', () => {
    seed(40, 30);
    storePlan([WARM, REVIEW], [false, false]);
    useSeen.setState({ values: { [stageKey]: [0, dayNum() - 30] } }); // seen on the first stage a month ago
    mount(<Today />);
    expect(allText()).toMatch(/Stage \d · /);
    expect(useSeen.getState().values[stageKey]?.[1]).toBe(dayNum());
  });
});

describe('"Your first readiness range"', () => {
  it('appears once, when the range first shows, under the range: what it is, the strongest and the weakest domain, no confetti', () => {
    // 10 answers per domain: 50 in all, enough for a range; domain 1 strong, domain 2 weak.
    act(() => {
      const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
      for (const d of ['1', '2', '3', '4', '5']) {
        getAllQuestions('cisa')
          .filter((q) => q.domainId === d)
          .slice(0, 10)
          .forEach((q, i) => {
            const ok = d === '1' ? true : d === '2' ? i < 3 : i < 6;
            answers[q.id] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: NOW.getTime() - DAY };
          });
      }
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), answers }) } }));
    });
    storePlan([WARM, REVIEW], [false, false]);
    mount(<Today />);
    const t = allText();
    expect(t).toContain('Your first readiness range');
    expect(t).toContain('not a prediction of your exam result');
    expect(t).toContain('Strongest so far: Information System Auditing Process');
    expect(t).toContain('Needs the most work: Governance and Management of IT');
    // The range itself is the readiness row just above the card, shown once (never repeated in the card).
    expect(t.match(/\d+–\d+/g)).toHaveLength(1);
    expect(t.indexOf('Estimated readiness')).toBeLessThan(t.indexOf('Your first readiness range'));
    expect(byTestID('readiness-tap')).toHaveLength(1);
  });

  it('"Got it" hides it for good, and the readiness row returns without the disclaimer', async () => {
    seed(10, 6);
    storePlan([WARM, REVIEW], [false, false]);
    mount(<Today />);
    expect(allText()).toContain('Your first readiness range');
    await press(/^Got it/);
    expect(allText()).not.toContain('Your first readiness range');
    expect(byTestID('readiness-tap')).toHaveLength(1);
    expect(allText()).not.toMatch(/range not a promise|not a prediction/);
    unmount();
    mount(<Today />);
    expect(allText()).not.toContain('Your first readiness range');
  });

  it('"See the report" opens the readiness report', async () => {
    seed(10, 6);
    storePlan([WARM, REVIEW], [false, false]);
    mount(<Today />);
    await press(/^See the report$/);
    expect(router.push).toHaveBeenCalledWith('/readiness');
  });

  it('a learner restoring a long history never gets a "first" moment', () => {
    seed(40, 30); // 200 answers
    storePlan([WARM, REVIEW], [false, false]);
    mount(<Today />);
    expect(allText()).not.toContain('Your first readiness range');
    expect(useSeen.getState().moments['first-range:cisa']).toBeGreaterThan(0);
  });

  it('not before there is a range', () => {
    seed(1, 1);
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(allText()).not.toContain('Your first readiness range');
  });
});

describe('the reminder ask, second chance', () => {
  beforeEach(() => {
    seed(1, 1);
    storePlan([WARM], [true]);
  });

  it('shows the day the 3rd study day is done, once, with the same one-button ask', async () => {
    setMilestones(3, today());
    mount(<Today />);
    expect(allText()).toContain('A study time can help');
    expect(allText()).toMatch(/Tomorrow I’ll study at/);
    expect(useSeen.getState().reminderAsk.second).toBe(true);
    // Nothing is asked of the phone until the button is tapped.
    expect(mockEnsure).not.toHaveBeenCalled();
    await press(/^Tomorrow I’ll study at /);
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(useSettings.getState().reminder).toMatchObject({ enabled: true, hour: 9, minute: 0 });
  });

  it('once shown it never comes back, even without an answer', () => {
    setMilestones(3, today());
    mount(<Today />);
    expect(allText()).toContain('A study time can help');
    unmount();
    mount(<Today />);
    expect(allText()).not.toContain('A study time can help');
  });

  it('"Not now" is respected', async () => {
    setMilestones(3, today());
    mount(<Today />);
    await press(/^Not now$/);
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(useSettings.getState().reminder.enabled).toBe(false);
    expect(allText()).not.toContain('A study time can help');
  });

  it.each([
    ['only 2 study days', () => setMilestones(2, today())],
    ['no study today', () => setMilestones(3, dayKey(NOW.getTime() - DAY))],
    ['reminders already on', () => { setMilestones(3, today()); useSettings.setState({ reminder: { enabled: true, hour: 8, minute: 0, days: [0, 1, 2, 3, 4, 5, 6] } }); }],
    ['the phone said no before', () => { setMilestones(3, today()); useSeen.setState({ reminderAsk: { first: 'blocked' } }); }],
  ])('not shown: %s', (_name, arrange) => {
    arrange();
    mount(<Today />);
    expect(allText()).not.toContain('A study time can help');
  });
});

describe('the next week of reminders is kept fresh', () => {
  it('Today re-plans them when reminders are on, skipping today once the plan is cleared', () => {
    useSettings.setState({ reminder: { enabled: true, hour: 19, minute: 0, days: [0, 1, 2, 3, 4, 5, 6] } });
    seed(1, 1);
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(mockSchedule).toHaveBeenCalled();
    const first = mockSchedule.mock.calls[0] as unknown as [unknown, string, { skipToday: boolean; minutes: number }];
    expect(first[2]).toMatchObject({ skipToday: false, minutes: 20 });
    unmount();
    mockSchedule.mockClear();
    storePlan([WARM], [true]);
    mount(<Today />);
    const cleared = mockSchedule.mock.calls[0] as unknown as [unknown, string, { skipToday: boolean }];
    expect(cleared[2].skipToday).toBe(true);
  });

  it('and does nothing when reminders are off', () => {
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
