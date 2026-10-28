/**
 * QA for PR #45, mobile 1.15.0 "Fit" (Phase 5a). Journey tests on the real
 * stores, screens, planner and backup code, written by the QA pass.
 *
 * Journeys:
 *  J1  a new learner, for every starting point (new / some / experienced /
 *      skipped) at every minutes choice: onboarding completes, Today's day-1
 *      plan matches the spec, and "About N min today" is honest (it is the
 *      sum of the items, and never more than the budget plus its tolerance)
 *  J2  Exam-focused: no lessons on Today, a weekly mini mock (checked across
 *      the 7-day boundary), Mock exams first on Practice; switching it off
 *      in Settings brings lessons back
 *  J3  an existing 1.14 learner upgrading: the old goal becomes minutes, the
 *      "Fit your plan" card shows once, "Not now" or Save hides it for good,
 *      never in exam week, and a plan saved before the upgrade is kept
 *  J4  Settings → Your study: a change takes effect on the next plan
 *  J5  edge cases: no exam date, exam tomorrow, exam today, a huge review
 *      backlog, zero reviews due, a single-domain certification
 *  J6  backup: 1.15 → 1.15, a 1.14-shaped file, tampered minutes
 *  J7  the plant and the badges are unaffected by the fit
 *
 * `// QA-BUG:` marks a pin of CURRENT wrong behaviour (see QA_45.md). When a
 * bug is fixed, flip the pin to assert the fixed behaviour.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Practice from '../app/(tabs)/practice';
import FitScreen from '../app/fit';
import Onboarding from '../app/onboarding';
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { Certification } from '../content/types';
import { addDays } from '../engine/examDay';
import { DAILY_MINUTES, minutesFromGoal, planTolerance, questionsFor, type DailyMinutes, type Familiarity } from '../engine/fit';
import { planComplete } from '../engine/dayPlan';
import { itemMinutes, planMinutes, type PlanItem } from '../engine/planner';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import type { ReviewEntry } from '../engine/srs';
import { dayKey } from '../engine/streak';
import { changeFit } from '../lib/activity';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { badgeCase } from '../lib/milestones';
import { plantFactsFor, plantFor } from '../lib/plant';
import { buildJourney } from '../lib/useJourney';
import { completeCert, selectCert, useProgress, type MockResult } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { dailyMinutesOf, useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null, BadgeShareCard: () => null }));
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
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));

// ── Helpers ──────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const cisa = getCertification('cisa')!;
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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const toggle = (name: string, value: boolean) => {
  const n = root().findAll((x) => typeof x.props.onValueChange === 'function' && x.props.accessibilityLabel === name)[0];
  if (!n) throw new Error(`no switch ${name}`);
  act(() => {
    n.props.onValueChange(value);
  });
};
const sectionOrder = (names: string[]) => {
  const t = allText();
  return names.map((n) => t.indexOf(n));
};

const today = () => dayKey(Date.now());
const storedPlan = () => useProgress.getState().days.cisa;
const budgetCap = (m: number) => m + planTolerance(m);
/** The day's minutes in the panel's caption ("Today’s plan · about N min", mobile 1.21), as a number (null when absent). */
const todayMinutesShown = () => {
  const m = allText().match(/Today’s plan · about (\d+) min/);
  return m ? Number(m[1]) : null;
};

/** Real CISA question ids, `perDomain` from each domain, answered at `accuracy`. */
function seedAnswers(perDomain: number, accuracy: number, at = Date.now() - DAY): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    const qs = getAllQuestions('cisa').filter((q) => q.domainId === d.id).slice(0, perDomain);
    qs.forEach((q, i) => {
      const right = i < Math.round(perDomain * accuracy);
      out[q.id] = { attempts: 1, correctCount: right ? 1 : 0, lastCorrect: right, lastAt: at };
    });
  }
  return out;
}
/** `n` review cards due an hour ago, on real question ids. */
function seedDue(n: number): Record<string, ReviewEntry> {
  const now = Date.now();
  const out: Record<string, ReviewEntry> = {};
  for (const q of getAllQuestions('cisa').slice(0, n)) out[q.id] = { box: 1, dueAt: now - 3_600_000, lastSeen: now - 2 * DAY, reps: 1 };
  return out;
}
const mock = (finishedAt: number, total = 50): MockResult => ({ id: `m${finishedAt}`, finishedAt, total, correct: Math.round(total * 0.7), minutesUsed: 60, byDomain: {} });
const setCert = (patch: Parameters<typeof completeCert>[0]) =>
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), ...patch }) } }));
  });

/** A 1.14 day plan (no budget, no lesson minutes), stored for today. */
const plan114 = (): Parameters<ReturnType<typeof useProgress.getState>['startDay']>[0] => ({
  day: today(),
  certId: 'cisa',
  items: [
    { kind: 'review', count: 20, capped: true },
    { kind: 'practice', count: 20, label: '20 questions · IS Operations', domainId: '4' },
  ],
  done: [false, false],
  start: { score: 0, domains: {} },
  answered: 0,
  correct: 0,
  minutes: 0,
});

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    // The plant's setup line is hidden by default: these journeys are about the fit.
    // byCert emptied too: a reset keeps the plant (4b), and J7 plants one.
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, byCert: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: addDays(today(), 120) } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

// ── J1 A new learner, every starting point × every minutes choice ─────────
type Start = Familiarity | 'skipped';
const STARTS: Start[] = ['new', 'some', 'experienced', 'skipped'];
const ROW: Record<Familiarity, RegExp> = { new: /^New to audit/, some: /^Some IT audit experience/, experienced: /^Experienced practitioner/ };

function onboard(start: Start, minutes: DailyMinutes) {
  useSettings.setState({ onboarded: false, examDates: {} });
  mount(<Onboarding />);
  press(/^Get started$/);
  // Mobile 1.24: no exam step (CISA is chosen) and no plant step; the last button starts the first set.
  if (start === 'skipped') press(/^Skip this question$/);
  else {
    press(ROW[start]);
    press(/^Continue$/);
  }
  press(new RegExp(`^${minutes} minutes a day$`));
  press(/^Start my first questions$/);
  unmount();
  // The first set is under way (Today lists it as paused work); these journeys look at the plan, so start clean.
  useSession.getState().clear();
}

describe('J1 a new learner: onboarding, then an honest day 1', () => {
  const cases = STARTS.flatMap((s) => DAILY_MINUTES.map((m) => [s, m] as const));

  it.each(cases)('%s at %i min: onboarding saves the fit, and day 1 is the same first five for everyone', (start, minutes) => {
    onboard(start, minutes);
    const st = useSettings.getState();
    expect(st).toMatchObject({ onboarded: true, activeCertId: 'cisa', dailyMinutes: minutes, fitPrompt: 'answered' });
    expect(st.familiarity).toBe(start === 'skipped' ? undefined : start);
    // Straight into the first five questions.
    expect(router.replace).toHaveBeenCalledWith('/session');

    mount(<Today />);
    const plan = storedPlan();
    expect(plan.budget).toBe(minutes);
    // Mobile 1.24: no lesson first, no 20-question check, whatever the start and the minutes.
    expect(plan.items).toEqual([{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }]);
    expect(allText()).toContain('Your first five');
    expect(allText()).toContain('5 questions, no timer');
    expect(allText()).not.toMatch(/\bcheck\b|diagnos/i);
    // No score and no empty tiles on day 1: nothing about the range until there is an answer.
    expect(allText()).not.toMatch(/Not yet|until your readiness range|for your first range/);
    // "About N min today" is the sum of what is listed, and fits the day.
    const sum = plan.items.reduce((n, i) => n + itemMinutes(i), 0);
    expect(todayMinutesShown()).toBe(sum);
    expect(sum).toBeLessThanOrEqual(budgetCap(minutes));
    // The Start pill's spoken hint agrees with the item it shows (the minutes are said once, in the caption).
    const hero = plan.items[0];
    const hint = root().findAll((n) => typeof n.props.accessibilityHint === 'string' && /Start|Continue/.test(String(n.props.accessibilityLabel))).map((n) => n.props.accessibilityHint as string)[0] ?? '';
    expect(todayMinutesShown()).toBe(itemMinutes(hero));
    expect(hint).not.toMatch(/About \d+ minutes ·/);
    // A learner who just answered never sees the existing-learner card.
    expect(byTestID('fit-card')).toHaveLength(0);
  });

  it('the experienced learner gets Mock exams first on Practice from day 1; the others do not', () => {
    onboard('experienced', 20);
    mount(<Practice />);
    let [mocks, more] = sectionOrder(['Mock exams', 'More ways to practice']);
    expect(mocks).toBeGreaterThan(-1);
    expect(mocks).toBeLessThan(more);
    unmount();
    onboard('some', 20);
    mount(<Practice />);
    [mocks, more] = sectionOrder(['Mock exams', 'More ways to practice']);
    expect(mocks).toBeGreaterThan(more);
  });

  it('day 1 is short on purpose (about 6 minutes at any length); from day 2 the plan uses the minutes they chose', () => {
    onboard('new', 45);
    mount(<Today />);
    expect(todayMinutesShown()).toBeLessThan(10);
    unmount();
    // Day 2: five answers are in, so the lesson and questions fit the 45-minute day (it used to wait four days).
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), answers: seedAnswers(1, 1) }) } }));
      useProgress.setState({ days: {} });
    });
    mount(<Today />);
    expect(storedPlan().items.map((i) => i.kind)).toEqual(['lesson', 'practice']);
    expect(todayMinutesShown()).toBeGreaterThanOrEqual(12);
  });
});

// ── J2 Exam-focused ───────────────────────────────────────────────────────
describe('J2 the Exam-focused path', () => {
  /** Past the starting check, every domain still weak, no lessons done. */
  const weakLearner = () => setCert({ answers: seedAnswers(10, 0.4) });

  it('no lesson on Today, "Weak spots" practice leads, and an optional mini mock follows when none was taken', () => {
    weakLearner();
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'experienced', dailyMinutes: 20 });
    mount(<Today />);
    const items = storedPlan().items;
    expect(items.some((i) => i.kind === 'lesson')).toBe(false);
    // UX review P2 (decided): a mock never leads the hero; it comes right after the first timed item.
    expect(items[0]).toMatchObject({ kind: 'practice', why: 'weak', label: expect.stringMatching(/^Weak spots: /) });
    expect(items[1]).toMatchObject({ kind: 'mock', questions: 50, minutes: 80 });
    expect(allText()).toContain('Mini mock');
    expect(allText()).toContain('Optional this week · about 80 min');
    expect(allText()).toMatch(/Today’s plan · about \d+ min/);
    // The mock is exempt; everything else fits the day.
    expect(planMinutes(items)).toBeLessThanOrEqual(budgetCap(20));
    // The stage is never "Learn the concepts" for the Exam-focused plan.
    expect(allText()).not.toContain('Learn the concepts');
  });

  it('the same learner WITHOUT Exam-focused is sent to lessons (the control case)', () => {
    weakLearner();
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'some', dailyMinutes: 20 });
    mount(<Today />);
    expect(storedPlan().items.some((i) => i.kind === 'lesson')).toBe(true);
    expect(storedPlan().items.some((i) => i.kind === 'mock')).toBe(false);
  });

  it('weekly mini mock: none 6 calendar days after the last, one at 7 (any size of mock counts)', () => {
    // Midday, so a calendar day is never confused with 24 hours.
    const now = new Date(2026, 9, 12, 12).getTime();
    const plan = (mocks: MockResult[]) => {
      const cp = completeCert({ answers: seedAnswers(10, 0.4), mocks });
      return buildJourney({ cert: cisa, progress: cp, readiness: computeReadiness(cisa, cp.answers), dueCount: 0, daysLeft: 90, dailyMinutes: 20, familiarity: 'experienced', streak: useProgress.getState().streak, now }).plan;
    };
    const hasMock = (p: PlanItem[]) => p.some((i) => i.kind === 'mock');
    expect(hasMock(plan([]))).toBe(true);
    expect(hasMock(plan([mock(now - 3 * DAY)]))).toBe(false);
    expect(hasMock(plan([mock(new Date(2026, 9, 6, 23, 59).getTime())]))).toBe(false);
    expect(hasMock(plan([mock(new Date(2026, 9, 5, 0, 1).getTime())]))).toBe(true);
    // A full mock counts as this week's mock too.
    expect(hasMock(plan([mock(now - 2 * DAY, 150), mock(now - 30 * DAY)]))).toBe(false);
  });

  it('weekly mini mock across a calendar week: a Monday-evening mock is offered again the next Monday morning', () => {
    const lastMonday7pm = new Date(2026, 9, 12, 19).getTime();
    const nextMonday8am = new Date(2026, 9, 19, 8).getTime();
    const nextTuesday8am = new Date(2026, 9, 20, 8).getTime();
    const plan = (now: number) => {
      const cp = completeCert({ answers: seedAnswers(10, 0.4, lastMonday7pm - DAY), mocks: [mock(lastMonday7pm)] });
      return buildJourney({ cert: cisa, progress: cp, readiness: computeReadiness(cisa, cp.answers), dueCount: 0, daysLeft: 90, dailyMinutes: 20, familiarity: 'experienced', streak: useProgress.getState().streak, now }).plan;
    };
    // Fixed (QA B1 / code review M1): the 7-day gap is counted in calendar days, so the mock taken
    // on Monday evening is offered again the next Monday morning, every week, never a day later.
    expect(plan(nextMonday8am).some((i) => i.kind === 'mock')).toBe(true);
    expect(plan(nextTuesday8am).some((i) => i.kind === 'mock')).toBe(true);
    // And six days on (the Sunday), not yet.
    expect(plan(new Date(2026, 9, 18, 21).getTime()).some((i) => i.kind === 'mock')).toBe(false);
  });

  it('a skipped weekly mock is optional: the day clears without it, and it is offered again the next day', () => {
    // Decided (QA observation O1): the weekly mini mock is OPTIONAL. The day clears when the
    // timed items are done; the mock row reads "Optional this week" until it is taken.
    weakLearner();
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'experienced', dailyMinutes: 20 });
    mount(<Today />);
    const items = storedPlan().items;
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, done: items.map((i) => i.kind !== 'mock') } } }));
    });
    expect(planComplete(storedPlan())).toBe(true);
    // The clearing counts only what the day needed: the skipped mock is not "one of N".
    const required = items.filter((i) => i.kind !== 'mock').length;
    expect(allText()).toContain(['', 'One', 'Two', 'Three'][required] + ' of ');
    // The next day, with still no mock taken: it is offered again, never leading.
    unmount();
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, day: addDays(today(), -1) } } }));
    });
    mount(<Today />);
    expect(storedPlan().items[0]).toMatchObject({ kind: 'practice' });
    expect(storedPlan().items.some((i) => i.kind === 'mock')).toBe(true);
    expect(allText()).toContain('Optional this week');
  });

  it('exam week wins over Exam-focused: no mini mock in the last 7 days (1.16: only the optional full rehearsal, 7 to 5 days out)', () => {
    const cp = completeCert({ answers: seedAnswers(10, 0.4) });
    for (const daysLeft of [7, 4, 2, 1, 0]) {
      const p = buildJourney({ cert: cisa, progress: cp, readiness: computeReadiness(cisa, cp.answers), dueCount: 0, daysLeft, dailyMinutes: 45, familiarity: 'experienced', streak: useProgress.getState().streak, now: Date.now() }).plan;
      expect(p.filter((i) => i.kind === 'mock').every((i) => daysLeft >= 5 && i.kind === 'mock' && i.questions === cisa.exam.questions)).toBe(true);
      expect(p.some((i) => i.kind === 'lesson')).toBe(false);
    }
  });

  it('switching Exam-focused off in Settings brings lessons back to Today, and Mock exams back down on Practice', () => {
    weakLearner();
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'experienced', dailyMinutes: 20 });
    mount(<Today />);
    expect(storedPlan().items.some((i) => i.kind === 'lesson')).toBe(false);
    unmount();
    mount(<Settings />);
    toggle('Exam-focused plan', false);
    expect(useSettings.getState().examFocused).toBe(false);
    // Nothing ticked yet: today's plan is rebuilt now.
    expect(storedPlan().items.some((i) => i.kind === 'lesson')).toBe(true);
    expect(storedPlan().items.some((i) => i.kind === 'mock')).toBe(false);
    unmount();
    mount(<Today />);
    // Mobile 1.24: the lesson leads the plan, so it is the panel's title (not repeated as a checklist row).
    const lesson = storedPlan().items.find((i) => i.kind === 'lesson')!;
    expect(allText()).toContain((lesson as { title: string }).title);
    unmount();
    mount(<Practice />);
    const [mocks, more] = sectionOrder(['Mock exams', 'More ways to practice']);
    expect(mocks).toBeGreaterThan(more);
  });

  it('an explicit Exam-focused ON beats "New to audit" (no lessons; day 1 is the first five, day 2 the rest of the first 20)', () => {
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'new', examFocused: true, dailyMinutes: 20 });
    mount(<Today />);
    expect(storedPlan().items).toEqual([{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }]);
    unmount();
    // Day 2: five answers in, the day is sized to the minutes, with a plain label and still no lesson.
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), answers: seedAnswers(1, 1) }) } }));
      useProgress.setState({ days: {} });
    });
    mount(<Today />);
    expect(storedPlan().items).toEqual([{ kind: 'practice', count: 15, label: '15 mixed questions', why: 'check' }]);
  });
});

// ── J3 An existing 1.14 learner upgrades ────────────────────────────────────
describe('J3 an existing 1.14 learner upgrades', () => {
  /** Onboarded on 1.14: a daily goal, none of the 1.15 keys. */
  const learner114 = (dailyGoal: number) => useSettings.setState({ onboarded: true, dailyGoal });

  it.each([
    [10, 10],
    [20, 20],
    [40, 45],
  ])('a daily goal of %i questions becomes %i minutes, with no setup', (goal, minutes) => {
    learner114(goal);
    expect(useSettings.getState().dailyMinutes).toBeUndefined();
    expect(dailyMinutesOf(useSettings.getState())).toBe(minutes);
    expect(minutesFromGoal(goal)).toBe(minutes);
    mount(<Today />);
    expect(storedPlan().budget).toBe(minutes);
    expect(planMinutes(storedPlan().items)).toBeLessThanOrEqual(budgetCap(minutes));
  });

  it('a 1.14 save on disk (no fit keys) rehydrates with derived minutes and no answers', async () => {
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    // Reset first: a store write would overwrite the 1.14 row.
    useSettings.setState(useSettings.getInitialState(), true);
    await AsyncStorage.setItem(
      'aurivan.settings.v1',
      JSON.stringify({ state: { onboarded: true, activeCertId: 'cisa', examDates: {}, theme: 'dark', shuffleOptions: true, dailyGoal: 40, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [], practiceTimer: false, badgesHidden: false }, version: 1 }),
    );
    await act(async () => {
      await useSettings.persist.rehydrate();
    });
    const st = useSettings.getState();
    expect(st).toMatchObject({ onboarded: true, dailyGoal: 40, theme: 'dark' });
    expect([st.familiarity, st.dailyMinutes, st.examFocused, st.fitPrompt]).toEqual([undefined, undefined, undefined, undefined]);
    expect(dailyMinutesOf(st)).toBe(45);
  });

  it('the plan saved before the upgrade is kept that day; the card shows once; tomorrow is sized', () => {
    learner114(20);
    act(() => {
      useProgress.getState().startDay(plan114());
    });
    mount(<Today />);
    // Kept exactly (frozen for the day), with no "today" total (it has no budget).
    expect(storedPlan().items).toEqual(plan114().items);
    expect(storedPlan().budget).toBeUndefined();
    expect(todayMinutesShown()).toBeNull();
    expect(byTestID('fit-card')).toHaveLength(1);
    unmount();
    // The next day: a fresh plan, sized to 20 minutes.
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, day: addDays(today(), -1) } } }));
    });
    mount(<Today />);
    expect(storedPlan().day).toBe(today());
    expect(storedPlan().budget).toBe(20);
    expect(planMinutes(storedPlan().items)).toBeLessThanOrEqual(budgetCap(20));
  });

  it('"Not now" hides the card for good (across visits and after an app restart)', async () => {
    learner114(20);
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(1);
    press(/^Not now/);
    expect(byTestID('fit-card')).toHaveLength(0);
    expect(useSettings.getState().fitPrompt).toBe('dismissed');
    unmount();
    // A restart: the store reloads from disk.
    await act(async () => {
      await useSettings.persist.rehydrate();
    });
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
    unmount();
    // A later change in Settings never brings it back.
    mount(<Settings />);
    press(/^Daily time, /); // mobile 1.17: the row opens its sheet
    press(/^30 minutes a day$/);
    unmount();
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
  });

  it('"Set it up" → Save hides the card for good, even when Save changes nothing visible', () => {
    learner114(20);
    mount(<Today />);
    press(/^Set it up$/);
    expect(router.push).toHaveBeenCalledWith('/fit');
    unmount();
    mount(<FitScreen />);
    press(/^Save$/);
    expect(useSettings.getState()).toMatchObject({ fitPrompt: 'answered', dailyMinutes: 20 });
    unmount();
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
  });

  it('a Save on the fit screen with nothing ticked rebuilds the 1.14 plan in minutes (by §2.3)', () => {
    learner114(20);
    act(() => {
      useProgress.getState().startDay(plan114());
    });
    mount(<FitScreen />);
    press(/^10 minutes a day$/);
    press(/^Save$/);
    expect(storedPlan().budget).toBe(10);
    expect(planMinutes(storedPlan().items)).toBeLessThanOrEqual(budgetCap(10));
  });

  it.each([
    [0, false],
    [1, false],
    [7, false],
    // CISA has a final review week, whose card shows from 8 days out: the Fit card rests from 8
    // too (QA review of the final week; engine rule in final-week-engine.test.ts). 9 is the first day it may show.
    [8, false],
    [9, true],
    [30, true],
  ])('with the exam %i days away, the card shows: %s (never in exam week)', (days, shows) => {
    learner114(20);
    useSettings.setState({ examDates: { cisa: addDays(today(), days) } });
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(shows ? 1 : 0);
  });

  it('with no exam date, the card may show; after the exam, it never does', () => {
    learner114(20);
    useSettings.setState({ examDates: {} });
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(1);
    unmount();
    useSettings.setState({ examDates: { cisa: addDays(today(), -3) } });
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
  });
});

// ── J4 Settings → Your study takes effect on the next plan ─────────────────
describe('J4 Settings → Your study changes the next plan', () => {
  it('with something ticked: today stays, the next day uses the new minutes and start', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20, familiarity: 'some' });
    // Five answers are in (day 1 is done), so the next day is a normal, sized plan.
    setCert({ answers: seedAnswers(1, 1) });
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [{ kind: 'practice', count: 8, label: '8 mixed questions', why: 'check' }, { kind: 'practice', count: 8, label: '8 mixed questions' }],
        done: [true, false], start: { score: 0, domains: {} }, answered: 8, correct: 5, minutes: 9,
      });
    });
    mount(<Settings />);
    press(/^Daily time, /);
    press(/^10 minutes a day$/);
    press(/^Starting point, /);
    press(/^New to audit/);
    expect(allText()).toContain('Today’s plan stays as it is. Tomorrow’s will fit.');
    expect(storedPlan().budget).toBe(20);
    expect(storedPlan().done).toEqual([true, false]);
    expect(useSettings.getState()).toMatchObject({ dailyMinutes: 10, dailyGoal: 10, familiarity: 'new', fitChanges: 2 });
    unmount();
    // The next day.
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, day: addDays(today(), -1) } } }));
    });
    mount(<Today />);
    expect(storedPlan().budget).toBe(10);
    expect(storedPlan().items[0]).toMatchObject({ kind: 'lesson' });
    expect(todayMinutesShown()).toBeLessThanOrEqual(budgetCap(10));
  });

  it('with nothing ticked: the plan is rebuilt now, and today’s numbers carry over', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 45 });
    mount(<Today />);
    expect(storedPlan().budget).toBe(45);
    unmount();
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, answered: 3, correct: 2, minutes: 4 } } }));
    });
    mount(<Settings />);
    press(/^Daily time, /);
    press(/^10 minutes a day$/);
    expect(storedPlan()).toMatchObject({ budget: 10, answered: 3, correct: 2, minutes: 4 });
    // Nothing answered yet: day 1 is the first five, whatever the minutes.
    expect(storedPlan().items).toEqual([{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }]);
  });

  it('answers banked toward an unticked item are kept when the fit changes', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20 });
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [{ kind: 'practice', count: 16, label: 'Starting check: 16 mixed questions', why: 'check' }],
        done: [false], credit: [10], start: { score: 0, domains: {} }, answered: 10, correct: 6, minutes: 12,
      });
    });
    const r = changeFit('cisa', { dailyMinutes: 10 });
    expect(storedPlan().answered).toBe(10);
    // Fixed (QA B2 / code review M2): banked answers mean today's plan has started, so it stays
    // (with its credit) and tomorrow's fits; the screen says so in one line.
    expect(r.keptToday).toBe(true);
    expect(storedPlan().credit).toEqual([10]);
    expect(storedPlan().items).toEqual([{ kind: 'practice', count: 16, label: 'Starting check: 16 mixed questions', why: 'check' }]);
    expect(useSettings.getState().dailyMinutes).toBe(10);
  });
});

// ── J5 Edge cases ───────────────────────────────────────────────────────────
describe('J5 edge cases', () => {
  it('no exam date: a sized plan, no countdown needed', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 30, examDates: {} });
    // Past day 1 (five answers in): the rest of the first 20 fills the day, 15 questions.
    setCert({ answers: seedAnswers(1, 1) });
    mount(<Today />);
    expect(storedPlan().budget).toBe(30);
    expect(todayMinutesShown()).toBe(18);
  });

  it.each([
    [10, 0, 'Light review · 8 questions'],
    [45, 0, 'Light review · 10 questions'],
    [10, 55, 'Light review · 8 questions'],
    [45, 3, 'Light review · 3 questions'],
  ])('exam tomorrow at %i min with %i due: one light item (%s), never a cram', (minutes, due, planLabel) => {
    // Mobile 1.23: the panel's title never holds a count ("Light review"); mobile 1.24: the count is on the meta line under it.
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: minutes as DailyMinutes, familiarity: 'experienced', examDates: { cisa: addDays(today(), 1) } });
    if (due) setCert({ review: seedDue(due) });
    mount(<Today />);
    expect(storedPlan().items).toHaveLength(1);
    const [title, count] = planLabel.split(' · ');
    expect(allText()).toContain(title);
    expect(allText()).toContain(count);
    expect(todayMinutesShown()).toBeLessThanOrEqual(budgetCap(minutes));
  });

  it('exam today: only the optional 5-question warm-up, about 6 min', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 45, examDates: { cisa: today() } });
    setCert({ review: seedDue(40) });
    mount(<Today />);
    expect(storedPlan().items).toEqual([{ kind: 'practice', count: 5, label: 'Optional warm-up · 5 questions' }]);
    expect(todayMinutesShown()).toBe(6);
  });

  it('a huge backlog at 10 min: reviews only, 8 of them, oldest first (never the 300 total)', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 10 });
    setCert({ review: seedDue(300) });
    mount(<Today />);
    expect(storedPlan().items).toEqual([{ kind: 'review', count: 8, due: 300, capped: true }]);
    // The title names the activity; today's share of the queue and the order are the line under it
    // (mobile 1.24), and the minutes are said once (the caption's, this item's alone).
    expect(allText()).toContain('Questions to revisit');
    expect(allText()).toContain('8 ready to revisit · oldest first');
    expect(allText()).not.toMatch(/\b300\b/);
    expect(todayMinutesShown()).toBe(10);
  });

  it.each(STARTS.flatMap((s) => DAILY_MINUTES.map((m) => [s, m] as const)))('a huge backlog, %s at %i min: reviews lead and the day still fits', (start, minutes) => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: minutes, familiarity: start === 'skipped' ? undefined : start });
    setCert({ review: seedDue(300), answers: seedAnswers(10, 0.6) });
    mount(<Today />);
    const items = storedPlan().items;
    expect(items[0]).toMatchObject({ kind: 'review', due: 300 });
    expect(items[0].kind === 'review' && items[0].count).toBeLessThanOrEqual(20);
    expect(planMinutes(items)).toBeLessThanOrEqual(budgetCap(minutes));
    expect(items.length).toBeLessThanOrEqual(4);
  });

  it('zero reviews due: no review item, and the cleared day previews a Tomorrow within budget', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20 });
    setCert({ answers: seedAnswers(10, 0.6) });
    mount(<Today />);
    expect(storedPlan().items.some((i) => i.kind === 'review')).toBe(false);
    unmount();
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, done: s.days.cisa!.items.map(() => true) } } }));
    });
    mount(<Today />);
    const m = allText().match(/Tomorrow About (\d+) min/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(budgetCap(20));
  });

  it('a single-domain certification plans a sized day for every start (no lessons: "new" falls back to the plain mixed set)', () => {
    const solo = { ...cisa, id: 'solo', domains: [{ ...cisa.domains[0], weight: 100 }] } as Certification;
    for (const familiarity of ['new', 'some', 'experienced', undefined] as const) {
      for (const minutes of DAILY_MINUTES) {
        const cp = completeCert({});
        const j = buildJourney({ cert: solo, progress: cp, readiness: computeReadiness(solo, cp.answers), dueCount: 0, daysLeft: 60, dailyMinutes: minutes, familiarity, streak: useProgress.getState().streak, now: Date.now() });
        expect(j.stage).toBe('diagnose');
        // Nothing answered: the first five. With five answers in: the rest of the first 20, sized to the day.
        expect(j.plan).toEqual([{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }]);
        const five: Record<string, AnswerRecord> = {};
        getAllQuestions('cisa').filter((q) => q.domainId === '1').slice(0, 5).forEach((q) => (five[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: Date.now() - DAY }));
        const cp5 = completeCert({ answers: five });
        const j5 = buildJourney({ cert: solo, progress: cp5, readiness: computeReadiness(solo, five), dueCount: 0, daysLeft: 60, dailyMinutes: minutes, familiarity, streak: useProgress.getState().streak, now: Date.now() });
        const n = Math.min(15, questionsFor(minutes));
        expect(j5.plan).toEqual([{ kind: 'practice', count: n, label: `${n} mixed questions`, why: 'check' }]);
      }
      // Past the check: one domain, weak.
      const answers: Record<string, AnswerRecord> = {};
      getAllQuestions('cisa').filter((q) => q.domainId === '1').slice(0, 30).forEach((q, i) => (answers[q.id] = { attempts: 1, correctCount: i % 2, lastCorrect: i % 2 === 1, lastAt: Date.now() - DAY }));
      const cp = completeCert({ answers });
      const j = buildJourney({ cert: solo, progress: cp, readiness: computeReadiness(solo, answers), dueCount: 0, daysLeft: 60, dailyMinutes: 20, familiarity, streak: useProgress.getState().streak, now: Date.now() });
      expect(j.plan.length).toBeGreaterThan(0);
      expect(planMinutes(j.plan)).toBeLessThanOrEqual(budgetCap(20));
      expect(j.plan.some((i) => i.kind === 'lesson')).toBe(false);
    }
  });
});

// ── J6 Backup ───────────────────────────────────────────────────────────────
describe('J6 backup and restore', () => {
  const NOW = Date.now();
  const file = () => JSON.parse(JSON.stringify(currentBackup(NOW))) as { stores: { settings: { state: Record<string, unknown> } } };
  const read = (f: unknown) => checkBackupText(JSON.stringify(f));

  it('a 1.15 export restores into 1.15 with the fit intact (and the old goal beside it)', async () => {
    setCert({ answers: seedAnswers(5, 0.6) });
    useSettings.setState({ fitPrompt: 'answered' });
    useSettings.getState().setFit({ dailyMinutes: 45, familiarity: 'experienced', examFocused: false });
    const r1 = read(file());
    if (r1.kind !== 'ok') throw new Error(r1.code);
    useSettings.getState().setFit({ dailyMinutes: 10, familiarity: 'new', examFocused: true });
    await act(async () => {
      await restoreBackup(r1.data, NOW);
    });
    expect(useSettings.getState()).toMatchObject({ dailyMinutes: 45, dailyGoal: 40, familiarity: 'experienced', examFocused: false, fitPrompt: 'answered', fitChanges: 1 });
    // Today rebuilds from the restored fit.
    mount(<Today />);
    expect(storedPlan().budget).toBe(45);
    expect(byTestID('fit-card')).toHaveLength(0);
  });

  it('a 1.14-shaped file restores: minutes from its goal, no fit, and the card may ask', async () => {
    useSettings.setState({ dailyGoal: 10 });
    const f = file();
    for (const k of ['familiarity', 'dailyMinutes', 'examFocused', 'fitPrompt', 'fitChanges']) delete f.stores.settings.state[k];
    const r1 = read(f);
    if (r1.kind !== 'ok') throw new Error(r1.code);
    useSettings.getState().setFit({ dailyMinutes: 45, familiarity: 'new' });
    await act(async () => {
      await restoreBackup(r1.data, NOW);
    });
    const st = useSettings.getState();
    expect([st.familiarity, st.dailyMinutes, st.examFocused, st.fitPrompt]).toEqual([undefined, undefined, undefined, undefined]);
    expect(dailyMinutesOf(st)).toBe(10);
    mount(<Today />);
    expect(storedPlan().budget).toBe(10);
    expect(byTestID('fit-card')).toHaveLength(1);
  });

  it.each([
    [0, 10],
    [-5, 10],
    [1000, 45],
    [12.5, 10],
    [26, 30],
  ])('a tampered dailyMinutes of %p is repaired to %i', (bad, fixed) => {
    const f = file();
    f.stores.settings.state.dailyMinutes = bad;
    const r1 = read(f);
    if (r1.kind !== 'ok') throw new Error(r1.code);
    expect(r1.data.settings.dailyMinutes).toBe(fixed);
  });

  it.each([['20'], ['lots'], [true], [[20]], [{ m: 20 }]])('a tampered dailyMinutes of %p is refused, and nothing changes', async (bad) => {
    useSettings.getState().setFit({ dailyMinutes: 30 });
    const f = file();
    f.stores.settings.state.dailyMinutes = bad;
    expect(read(f)).toMatchObject({ kind: 'error', code: 'bad-data' });
    expect(useSettings.getState().dailyMinutes).toBe(30);
  });

  it('a null dailyMinutes reads as "not set" (the goal decides)', () => {
    const f = file();
    f.stores.settings.state.dailyMinutes = null;
    f.stores.settings.state.dailyGoal = 40;
    const r1 = read(f);
    if (r1.kind !== 'ok') throw new Error(r1.code);
    expect(r1.data.settings.dailyMinutes).toBeUndefined();
    expect(dailyMinutesOf(r1.data.settings as { dailyGoal: number })).toBe(45);
  });

  it('a repaired file restores to a sane, sized plan', async () => {
    const f = file();
    f.stores.settings.state.dailyMinutes = 1000;
    const r1 = read(f);
    if (r1.kind !== 'ok') throw new Error(r1.code);
    await act(async () => {
      await restoreBackup(r1.data, NOW);
    });
    mount(<Today />);
    expect(storedPlan().budget).toBe(45);
    expect(planMinutes(storedPlan().items)).toBeLessThanOrEqual(budgetCap(45));
  });

  it('other tampered fit keys are refused (familiarity, prompt, count, switch)', () => {
    for (const [k, v] of [['familiarity', 'guru'], ['fitPrompt', 'later'], ['fitChanges', -1], ['fitChanges', 1e6], ['examFocused', 'yes']] as const) {
      const f = file();
      f.stores.settings.state[k] = v;
      expect(read(f).kind).toBe('error');
    }
  });
});

// ── J7 The plant and the badges are unaffected ──────────────────────────────
describe('J7 the plant and the badges are unaffected by the fit', () => {
  it('growth facts, the plant itself and the badge case are the same whatever the fit', () => {
    setCert({ answers: seedAnswers(12, 0.75) });
    act(() => {
      plantFor('cisa', 'oak', 'Fern');
    });
    const now = Date.now();
    const snapshot = () => {
      const cp = selectCert(useProgress.getState(), 'cisa');
      return JSON.stringify({ facts: plantFactsFor('cisa', cp, now), plant: cp.plant, badges: badgeCase('cisa', cp, now), milestones: cp.milestones });
    };
    const before = snapshot();
    for (const f of [
      { dailyMinutes: 10 as const, familiarity: 'new' as const },
      { dailyMinutes: 45 as const, familiarity: 'experienced' as const },
      { examFocused: true },
      { examFocused: null, familiarity: null },
    ]) {
      changeFit('cisa', f);
      expect(snapshot()).toBe(before);
    }
  });

  it('the plant’s setup line still goes first; the fit card waits for another visit', () => {
    useSettings.setState({ onboarded: true, dailyGoal: 20 });
    act(() => {
      useProgress.setState({ plantSettings: undefined });
    });
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(1);
    expect(byTestID('fit-card')).toHaveLength(0);
  });

  it('onboarding saves the fit in one tap and asks nothing about a plant (a seed comes after the first set)', () => {
    useSettings.setState({ onboarded: false, examDates: {} });
    mount(<Onboarding />);
    press(/^Get started$/);
    press(/^Experienced practitioner/);
    press(/^Continue$/);
    press(/^45 minutes a day$/);
    press(/^Start my first questions$/);
    expect(useSettings.getState()).toMatchObject({ onboarded: true, familiarity: 'experienced', dailyMinutes: 45, fitPrompt: 'answered' });
    expect(selectCert(useProgress.getState(), 'cisa').plant).toBeUndefined();
  });

});
