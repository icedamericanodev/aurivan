/**
 * Mobile 1.41 on screen ("beta tester helpers + calmer start"):
 * - Today: "Short on time? 5 questions" under the hero, only before the plan has started; it starts the
 *   plan's own item at five questions, so the answers count toward it; never on the first-set day or in
 *   exam week;
 * - Help: "I'm a beta tester", off by default;
 * - Today: the Tester question only with the switch on; "Share feedback" opens a mailto with the
 *   subject tag and the question, and nothing else is sent; "Maybe later" hides it until tomorrow; the
 *   week check-in shows the study-day count on screen only; one setup line per visit;
 * - Send feedback offers "Something confused me" first; Report a problem (app) offers "I couldn't find
 *   something".
 */
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Help from '../app/help';
import { TesterQuestionCard } from '../components/beta';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getAllQuestions } from '../content/loader';
import type { DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { daysBeforeKey, dayKey } from '../engine/streak';
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), setParams: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.41.0' } } }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
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
const buttons = (label: RegExp) => root().findAll((n) => typeof n.props.onPress === 'function' && label.test(String(n.props.accessibilityLabel)));
const press = async (label: RegExp) => {
  const n = buttons(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  await act(async () => {
    await n.props.onPress();
  });
};
const openUrl = Linking.openURL as jest.Mock;
const lastEmail = () => {
  const url = String(openUrl.mock.calls.at(-1)![0]);
  return {
    to: url.slice('mailto:'.length).split('?')[0],
    subject: decodeURIComponent(url.split('subject=')[1].split('&body=')[0]),
    body: decodeURIComponent(url.split('&body=')[1]).replace(/\r\n/g, '\n'),
  };
};

const NOW = new Date(2026, 9, 15, 9, 0, 0);
const today = () => dayKey(NOW.getTime());
const REVIEW: PlanItem = { kind: 'review', count: 12, due: 12 };
const LESSON: PlanItem = { kind: 'lesson', lessonId: 'cisa-l-d1-charter', title: 'Business impact analysis', minutes: 8 };
const FIRST: PlanItem = { kind: 'practice', count: 5, label: 'Your first five', why: 'first' };

const storePlan = (items: PlanItem[], done: boolean[] = items.map(() => false), credit?: number[]) => {
  const plan: DayPlan = { day: today(), certId: 'cisa', budget: 20, items, done, start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0, ...(credit ? { credit } : {}) };
  act(() => {
    useProgress.getState().startDay(plan);
  });
};
/** Twelve questions due in review, last answered wrong yesterday. */
const queueReviews = () => {
  const ids = getAllQuestions('cisa').slice(0, 12).map((q) => q.id);
  const yesterday = NOW.getTime() - 86_400_000;
  act(() => {
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: completeCert({
          ...selectCert(s, 'cisa'),
          answers: Object.fromEntries(ids.map((id) => [id, { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: yesterday }])),
          review: Object.fromEntries(ids.map((id) => [id, { box: 1, dueAt: yesterday, lastSeen: yesterday, reps: 1 }])),
          milestones: { earned: {}, days: 3, lastDay: daysBeforeKey(NOW.getTime(), 1) },
        }),
      },
    }));
  });
};
/** Study on these days back from today (0 = today). */
const studiedDaysAgo = (...ago: number[]) =>
  act(() => {
    const recentDays = ago.sort((a, b) => b - a).map((n) => daysBeforeKey(NOW.getTime(), n));
    useProgress.setState({ streak: { current: 1, best: 3, lastDay: recentDays[recentDays.length - 1] ?? null, recentDays } });
  });
const testerOn = (daysAgo: number) =>
  act(() => {
    useSeen.getState().setTester({ since: daysBeforeKey(NOW.getTime(), daysAgo) });
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
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: '2026-12-20' } });
  jest.mocked(router.push).mockClear();
  openUrl.mockReset().mockResolvedValue(true);
});
afterEach(() => {
  unmount();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Short on time? 5 questions', () => {
  it('shows under the hero before the plan starts, with its plain line, and starts five of the plan’s own reviews', async () => {
    queueReviews();
    storePlan([REVIEW, LESSON]);
    mount(<Today />);
    expect(byTestID('short-set')).toHaveLength(1);
    expect(allText()).toContain('Short on time? 5 questions');
    expect(allText()).toContain('About 6 min. Counts toward today’s plan.');
    const btn = buttons(/^Short on time\? 5 questions$/)[0];
    expect(btn.props.accessibilityHint).toBe('About 6 minutes. Counts toward today’s plan.');
    await press(/^Short on time\? 5 questions$/);
    const s = useSession.getState().active!;
    expect(s.mode).toBe('review');
    expect(s.questionIds).toHaveLength(5);
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('round 4: after the short set, the step shows what is left and Continue starts only that many', async () => {
    const PRACTICE: PlanItem = { kind: 'practice', count: 8, label: 'Practice: 8 mixed questions', why: 'weak' };
    // The saved plan after 5 short-set answers: credit [0, 5] on the 8-question step, lesson done.
    storePlan([LESSON, PRACTICE], [true, false], [0, 5]);
    mount(<Today />);
    const t = allText();
    expect(t).toContain('3 questions, most points to gain');
    expect(t).not.toContain('8 questions');
    expect(t).toMatch(/Today’s plan About.4.min/); // the card total: only the 3 questions left
    await press(/^Continue$/);
    expect(useSession.getState().active!.questionIds).toHaveLength(3);
  });

  it('hides once anything is done, on the first-set day and in exam week', () => {
    queueReviews();
    storePlan([REVIEW, LESSON], [false, true]);
    mount(<Today />);
    expect(byTestID('short-set')).toHaveLength(0);
    unmount();
    storePlan([FIRST]);
    mount(<Today />);
    expect(byTestID('short-set')).toHaveLength(0);
    unmount();
    useSettings.setState({ examDates: { cisa: daysBeforeKey(NOW.getTime(), -5) } });
    storePlan([REVIEW, LESSON]);
    mount(<Today />);
    expect(byTestID('short-set')).toHaveLength(0);
  });

  it('never says "streak"', () => {
    queueReviews();
    storePlan([REVIEW, LESSON]);
    mount(<Today />);
    expect(textOf(byTestID('short-set')[0])).not.toMatch(/streak/i);
  });
});

describe('Help: I’m a beta tester', () => {
  it('is off by default; on starts the test today; off forgets it', async () => {
    mount(<Help />);
    const toggle = () => root().findAll((n) => n.props.accessibilityLabel === 'I’m a beta tester' && typeof n.props.onValueChange === 'function')[0];
    expect(toggle().props.value).toBe(false);
    expect(allText()).toContain('A short question on Today on some days during the test. Turn it off any time.');
    act(() => {
      toggle().props.onValueChange(true);
    });
    expect(useSeen.getState().tester).toEqual({ since: today() });
    act(() => {
      toggle().props.onValueChange(false);
    });
    expect(useSeen.getState().tester).toEqual({});
  });

  it('opens one support form with an improvement category for confusing experiences', async () => {
    mount(<Help />);
    await press(/^Support and feedback/);
    await press(/^Improve something$/);
    expect(allText()).toContain('What could work better? Tell us how you use it.');
    expect(buttons(/^Improve something$/)[0].props.accessibilityState?.selected).toBe(true);
  });

  it('lets learners describe an app problem through the unified bug category', async () => {
    mount(<Help />);
    await press(/^Support and feedback/);
    await press(/^Bug or error$/);
    expect(allText()).toContain('What happened, and what did you expect? What steps led to it?');
    expect(buttons(/^Bug or error$/)[0].props.accessibilityState?.selected).toBe(true);
    expect(openUrl).not.toHaveBeenCalled();
  });
});

describe('the Tester question on Today', () => {
  it.each(['light', 'dark'] as const)('offers independent named feedback actions in %s mode', (theme) => {
    act(() => { useSettings.setState({ theme }); });
    mount(<TesterQuestionCard card={{ id: 'expect', day: 1, caption: 'Tester question', body: "What's one thing you expected KaiSip to do differently?" }} today={today()} />);
    const share = buttons(/^Share feedback$/).find((n) => n.props.accessibilityRole === 'button');
    const later = buttons(/^Maybe later$/).find((n) => n.props.accessibilityRole === 'button');
    expect(share).toBeDefined();
    expect(later).toBeDefined();
    expect(share).not.toBe(later);
    expect(share!.props.accessibilityHint).toContain('Nothing is sent until you press Send.');
    expect(later!.props.accessibilityHint).toBe('Hides this question until tomorrow');
    expect(allText()).toContain('Help shape KaiSip');
  });

  it('never shows with the switch off', () => {
    studiedDaysAgo(1, 0);
    storePlan([LESSON]);
    mount(<Today />);
    expect(byTestID('tester-card')).toHaveLength(0);
  });

  it('day 3: the question, below the day’s study; "Share feedback" opens a mailto with the tag and the question', async () => {
    testerOn(2);
    studiedDaysAgo(2, 1);
    storePlan([LESSON]);
    mount(<Today />);
    expect(byTestID('tester-card')).toHaveLength(1);
    expect(allText()).toContain('Help shape KaiSip');
    expect(allText()).toContain('Was today’s plan the right size for your day: too long, about right, or too short?');
    expect(allText()).not.toMatch(/Day \d+ of 14|of 14/);
    await press(/^Share feedback$/);
    const e = lastEmail();
    expect(e.to).toBe('certprep.support@gmail.com');
    expect(e.subject).toBe('[KaiSip beta D3]');
    expect(e.body).toContain('Tester question: Was today’s plan the right size for your day');
    expect(e.body).toContain('App: KaiSip 1.41.0');
    expect(allText()).toContain('Nothing is sent until you press Send.');
    expect(useSeen.getState().tester?.answered).toEqual(['size']);
    // Answered: gone on the next visit.
    unmount();
    mount(<Today />);
    expect(byTestID('tester-card')).toHaveLength(0);
  });

  it('"Maybe later" hides it until tomorrow; it never touches the streak, the plant or badges', async () => {
    testerOn(2);
    studiedDaysAgo(2, 1);
    storePlan([LESSON]);
    mount(<Today />);
    const before = { streak: useProgress.getState().streak, cert: selectCert(useProgress.getState(), 'cisa') };
    await press(/^Maybe later$/);
    expect(byTestID('tester-card')).toHaveLength(0);
    expect(useSeen.getState().tester?.skipped).toBe(today());
    expect(openUrl).not.toHaveBeenCalled();
    expect(useProgress.getState().streak).toBe(before.streak);
    expect(selectCert(useProgress.getState(), 'cisa').plant).toBe(before.cert.plant);
    expect(selectCert(useProgress.getState(), 'cisa').milestones).toBe(before.cert.milestones);
  });

  it('restores Maybe later after a restart using the existing saved preference', async () => {
    testerOn(0);
    studiedDaysAgo(0);
    storePlan([LESSON]);
    mount(<Today />);
    await press(/^Maybe later$/);
    unmount();
    const saved = await AsyncStorage.getItem('aurivan.seen.v1');
    expect(JSON.parse(saved!).state.tester.skipped).toBe(today());
    useSeen.setState({ tester: undefined });
    await AsyncStorage.setItem('aurivan.seen.v1', saved!);
    await act(async () => { await useSeen.persist.rehydrate(); });
    mount(<Today />);
    expect(byTestID('tester-card')).toHaveLength(0);
    expect(useSeen.getState().tester?.skipped).toBe(today());
  });

  it('keeps tester questions disabled after a restart', async () => {
    testerOn(0);
    studiedDaysAgo(0);
    storePlan([LESSON]);
    mount(<Today />);
    const card = byTestID('tester-card')[0];
    act(() => card.props.onAccessibilityAction({ nativeEvent: { actionName: 'stop' } }));
    unmount();
    const saved = await AsyncStorage.getItem('aurivan.seen.v1');
    useSeen.setState({ tester: { since: today() } });
    await AsyncStorage.setItem('aurivan.seen.v1', saved!);
    await act(async () => { await useSeen.persist.rehydrate(); });
    mount(<Today />);
    expect(useSeen.getState().tester).toEqual({});
    expect(byTestID('tester-card')).toHaveLength(0);
  });

  it('failed email opening preserves eligibility and offers the existing fallback', async () => {
    testerOn(0);
    studiedDaysAgo(0);
    storePlan([LESSON]);
    openUrl.mockRejectedValue(new Error('No email app'));
    mount(<Today />);
    await press(/^Share feedback$/);
    expect(useSeen.getState().tester?.answered).toBeUndefined();
    expect(allText()).toContain('No email app opened.');
    expect(buttons(/^Share instead$/).length).toBeGreaterThan(0);
    expect(buttons(/^Try again$/).length).toBeGreaterThan(0);
    expect(allText()).not.toContain('Your email app opened');
  });

  it('week 1 check-in: the study-day count on screen, never in the email', async () => {
    testerOn(6);
    studiedDaysAgo(6, 5, 3, 1, 0);
    storePlan([LESSON]);
    mount(<Today />);
    expect(allText()).toContain('Week 1 check-in');
    expect(allText()).toContain('You studied on 5 of the last 7 days.');
    expect(allText()).toContain('Counted on this phone only, and not put in the email.');
    await press(/^Share feedback$/);
    const e = lastEmail();
    expect(e.subject).toBe('[KaiSip beta D7]');
    expect(e.body).not.toMatch(/studied|of the last 7/);
  });

  it('after 3 or more days away it asks what got in the way', () => {
    testerOn(8);
    studiedDaysAgo(8, 4);
    storePlan([LESSON]);
    mount(<Today />);
    expect(allText()).toContain('Welcome back. What got in the way? A busy week, a bug, losing interest: anything helps.');
  });

  it('the screen-reader action "Stop tester questions" turns the switch off', () => {
    testerOn(2);
    studiedDaysAgo(2, 1);
    storePlan([LESSON]);
    mount(<Today />);
    const card = byTestID('tester-card')[0];
    expect(card.props.accessibilityActions).toEqual([{ name: 'stop', label: 'Stop tester questions' }]);
    act(() => {
      card.props.onAccessibilityAction({ nativeEvent: { actionName: 'stop' } });
    });
    expect(useSeen.getState().tester).toEqual({});
    expect(byTestID('tester-card')).toHaveLength(0);
  });

  it('one setup line per visit: the name ask goes first', () => {
    testerOn(2);
    studiedDaysAgo(2, 1);
    act(() => {
      useSeen.getState().setNameAsk('due');
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), milestones: { earned: {}, days: 2, lastDay: daysBeforeKey(NOW.getTime(), 1) } }) } }));
    });
    storePlan([LESSON]);
    mount(<Today />);
    expect(byTestID('name-ask')).toHaveLength(1);
    expect(byTestID('tester-card')).toHaveLength(0);
  });
});

describe('review 1.41 fixes on Today', () => {
  it('a week check-in never says "You studied on 0 of the last 7 days"', () => {
    const card = { id: 'week1', day: 7, caption: 'Week 1 check-in', body: 'How has your first week gone?' };
    mount(<TesterQuestionCard card={{ ...card, studiedOfLast7: 0 }} today={today()} />);
    expect(allText()).toContain('Week 1 check-in');
    expect(allText()).not.toMatch(/You studied on|Counted on this phone/);
    unmount();
    mount(<TesterQuestionCard card={{ ...card, studiedOfLast7: 3 }} today={today()} />);
    expect(allText()).toContain('You studied on 3 of the last 7 days.');
  });

  it('the tester card says where to turn the questions off', () => {
    testerOn(2);
    studiedDaysAgo(2, 1);
    storePlan([LESSON]);
    mount(<Today />);
    expect(textOf(byTestID('tester-card')[0])).toContain('Turn these off any time in Help.');
  });

  it('"Short on time?" waits while a Tester question is on Today', () => {
    queueReviews();
    testerOn(2);
    studiedDaysAgo(2, 1);
    // Already asked for a name (mobile 1.44 would otherwise ask an onboarded learner with none, first).
    act(() => {
      useSeen.getState().setNameAsk('shown');
    });
    storePlan([REVIEW, LESSON]);
    mount(<Today />);
    expect(byTestID('tester-card')).toHaveLength(1);
    expect(byTestID('short-set')).toHaveLength(0);
  });
});
