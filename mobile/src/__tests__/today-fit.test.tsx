/**
 * Mobile 1.15 on Today and the fit screen (PHASE5.md §2.3–2.5):
 * - "About N min today" under the leaf marks (a mock adds "+ mock");
 * - a new learner's day 1 is a lesson, then 5 questions on it;
 * - the Exam-focused plan leads with a mini mock (once a week);
 * - the one "Fit your plan" card for learners from before 1.15: once, below
 *   the day's study; "Not now" hides it for good; never with the plant's
 *   line, in exam week, or for a learner who onboarded on 1.15;
 * - the fit screen saves, rebuilds an untouched plan, and answers the card.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import FitScreen from '../app/fit';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { planText } from '../components/journey';
import { lessonsFor } from '../content/lessons';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { startMock } from '../lib/sessions';
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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const pressable = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = pressable(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const switchValue = (name: string) => root().findAll((x) => typeof x.props.onValueChange === 'function' && x.props.accessibilityLabel === name)[0]?.props.value;
const checkedRadio = (group: string) => {
  const g = root().findAll((x) => x.props.accessibilityRole === 'radiogroup' && x.props.accessibilityLabel === group && typeof x.type !== 'string')[0];
  if (!g) throw new Error(`no radiogroup ${group}`);
  return g.findAll((x) => x.props.accessibilityRole === 'radio' && x.props.accessibilityState?.checked && typeof x.props.onPress === 'function').map((x) => x.props.accessibilityLabel as string);
};

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
    // No plant prompt by default: these tests are about the fit.
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

const today = () => dayKey(Date.now());
const storedPlan = () => useProgress.getState().days.cisa;
/** A learner from before 1.15: onboarded, no fit answered. */
const oldLearner = () => useSettings.setState({ onboarded: true, dailyGoal: 20 });

describe('Today: the day in minutes', () => {
  it('"About N min today" sums the open items (a 20-minute starting check: about 19 min)', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20 });
    mount(<Today />);
    expect(allText()).toContain('About 19 min today');
    expect(allText()).toContain('Starting check: 16 mixed questions');
    expect(allText()).toContain('About 19 min · no score yet, just a starting point');
    expect(storedPlan().budget).toBe(20);
  });

  it('new to audit: day 1 is the first lesson, then 5 questions on its domain', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20, familiarity: 'new' });
    mount(<Today />);
    const first = lessonsFor('cisa')[0];
    expect(storedPlan().items).toEqual([
      { kind: 'lesson', lessonId: first.id, title: first.title, minutes: first.minutes },
      { kind: 'practice', count: 5, label: '5 questions · IS Audit', domainId: '1', why: 'learn' },
    ]);
    expect(allText()).toContain(`Lesson · ${first.minutes} min`);
    expect(allText()).toContain(`About ${first.minutes + 6} min today`);
    expect(allText()).not.toMatch(/Starting check/);
    // Still no score on day 1: the 40-answer countdown stays.
    expect(allText()).toMatch(/more answers until your readiness range/);
  });

  it('a plan saved before 1.15 (no budget) shows no "today" total, and is kept for the day', () => {
    useSettings.setState({ fitPrompt: 'answered' });
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', items: [{ kind: 'practice', count: 20, label: 'Diagnostic: 20 mixed questions' }], done: [false],
        start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0,
      });
    });
    mount(<Today />);
    expect(allText()).not.toMatch(/min today/);
    expect(storedPlan().items[0]).toMatchObject({ label: 'Diagnostic: 20 mixed questions' });
  });

  it('Exam-focused: a saved plan with the mock first still leads with the timed item; the mock is optional, "+ mock" in the total', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20, familiarity: 'experienced' });
    // Past the starting check, every domain still weak: the practice stage, never "learn".
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [
          { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 },
          { kind: 'practice', count: 16, label: 'Weak spots: IS Operations', domainId: '4', why: 'weak' },
        ],
        done: [false, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0,
      });
    });
    mount(<Today />);
    // UX review P2: a mock never leads the hero (even in a plan saved with it first).
    expect(allText()).toContain('Start here About 19 min today + mock Weak spots: IS Operations');
    expect(allText()).toContain('About 19 min · 16 questions, most points to gain');
    // Its row says it is optional this week, and how long it is.
    expect(allText()).toContain('Mini mock Optional this week · about 80 min');
  });
});

describe('the plan items in minutes (C1, C7)', () => {
  it('a review of part of the queue says how many today, and "tomorrow" in the Tomorrow preview', () => {
    const item = { kind: 'review' as const, count: 8, due: 55 };
    expect(planText(item, 55)).toEqual({ title: 'Review 55 due', meta: 'About 10 min · 8 today, most overdue first', short: 'Spaced review · 8 today' });
    // UX review O5: tomorrow's queue isn't known yet, so the preview names the habit.
    expect(planText(item, undefined, 'tomorrow')).toMatchObject({ title: 'Spaced review', short: 'Review · 8 tomorrow' });
  });
  it('one minutes style on every kind of item', () => {
    expect(planText({ kind: 'lesson', lessonId: 'x', title: 'X' }).meta).toBe('Lesson · 5 min');
    expect(planText({ kind: 'practice', count: 16, label: 'x', why: 'weak' }).meta).toBe('About 19 min · 16 questions, most points to gain');
    expect(planText({ kind: 'practice', count: 5, label: 'x', why: 'learn' }).meta).toBe('About 6 min · on what you just learned');
    expect(planText({ kind: 'game', gameId: 'trap', label: 'x' }).meta).toBe('Game · about 6 min');
    expect(planText({ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions' }).short).toBe('Mock · about 80 min');
  });
});

describe('a paused untimed mock on Today (C4)', () => {
  it('"Also today" counts its questions at exam pace: 50 left is about 80 min, as Practice says', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20 });
    act(() => {
      startMock('cisa', 50, { timing: 'untimed' });
    });
    mount(<Today />);
    // The starting check (19 min) is the hero; Also today = the paused mock.
    expect(allText()).toMatch(/Also today About 80 min/);
    useSession.getState().clear();
  });
});

describe('Today: the one "Fit your plan" card', () => {
  it('shows once for a learner from before 1.15, below the day’s study; Set it up opens the fit screen', () => {
    oldLearner();
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(1);
    expect(allText()).toContain('Tell us how long you have and where you’re starting from, and Today’s plan will fit.');
    // Below "Also today" / the hero: after the readiness words in reading order.
    expect(allText().indexOf('Fit your plan')).toBeGreaterThan(allText().indexOf('more answers until your readiness range'));
    press(/^Set it up$/);
    expect(router.push).toHaveBeenCalledWith('/fit');
  });

  it('"Not now" hides it for good', () => {
    oldLearner();
    mount(<Today />);
    press(/^Not now/);
    expect(useSettings.getState().fitPrompt).toBe('dismissed');
    expect(byTestID('fit-card')).toHaveLength(0);
    unmount();
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
  });

  it('never for a learner who onboarded on 1.15, in exam week, or with the plant’s line', () => {
    useSettings.setState({ onboarded: true, fitPrompt: 'answered' });
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
    unmount();

    oldLearner();
    useSettings.setState({ fitPrompt: undefined, examDates: { cisa: addDays(today(), 5) } });
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(0);
    unmount();

    // No plant yet and the prompt not hidden: the plant's line goes first, the card waits.
    useSettings.setState({ examDates: { cisa: '2027-06-01' } });
    act(() => {
      useProgress.setState({ plantSettings: undefined });
    });
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(1);
    expect(byTestID('fit-card')).toHaveLength(0);
    // "No thanks" on the plant's line: still not on the same visit (one setup line per visit).
    press(/^No thanks/);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    expect(byTestID('fit-card')).toHaveLength(0);
    unmount();
    // The next visit may ask.
    mount(<Today />);
    expect(byTestID('fit-card')).toHaveLength(1);
  });
});

describe('the fit screen (Your study)', () => {
  it('starts from the saved choices (40 a day reads 45 min), saves, rebuilds an untouched plan, and answers the card', () => {
    oldLearner();
    useSettings.setState({ dailyGoal: 40 });
    mount(<Today />);
    expect(storedPlan().budget).toBe(45);
    unmount();
    mount(<FitScreen />);
    expect(allText()).toContain('Your study');
    expect(checkedRadio('Daily time')).toEqual(['45 minutes a day']);
    expect(checkedRadio('Where are you starting from?')).toEqual([]);
    expect(switchValue('Exam-focused plan')).toBe(false);
    press(/^10 minutes a day$/);
    press(/^Experienced practitioner/);
    // The switch follows the row until the learner flips it.
    expect(switchValue('Exam-focused plan')).toBe(true);
    // Nothing is saved before Save.
    expect(useSettings.getState().familiarity).toBeUndefined();
    press(/^Save$/);
    expect(useSettings.getState()).toMatchObject({ dailyMinutes: 10, dailyGoal: 10, familiarity: 'experienced', fitPrompt: 'answered' });
    expect(useSettings.getState().examFocused).toBeUndefined();
    expect(storedPlan().budget).toBe(10);
    expect(router.back).toHaveBeenCalled();
  });

  it('with something ticked today, it says today’s plan stays, and Save keeps it', () => {
    oldLearner();
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [{ kind: 'lesson', lessonId: 'x', title: 'X' }, { kind: 'practice', count: 16, label: '16 mixed questions' }],
        done: [true, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0,
      });
    });
    mount(<FitScreen />);
    expect(allText()).toContain('Today’s plan stays as it is. Tomorrow’s will fit.');
    press(/^45 minutes a day$/);
    press(/^Save$/);
    expect(useSettings.getState().dailyMinutes).toBe(45);
    expect(storedPlan().budget).toBe(20);
    expect(storedPlan().done).toEqual([true, false]);
  });

  it('Cancel changes nothing and leaves the card to ask again', () => {
    oldLearner();
    mount(<FitScreen />);
    press(/^30 minutes a day$/);
    press(/^Cancel$/);
    expect(useSettings.getState().dailyMinutes).toBeUndefined();
    expect(useSettings.getState().fitPrompt).toBeUndefined();
    expect(router.back).toHaveBeenCalled();
  });
});
