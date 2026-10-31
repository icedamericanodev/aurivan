/**
 * Mobile 1.23 Today (the owner's mockup A):
 * - header: the KaiSip lockup, a streak pill, the Settings gear;
 * - a meta line ("Thursday · 38 days to CISA"), then the greeting by the hour (with the learner's own name only when they gave one);
 * - the forest plan panel: "Today’s plan · about N min", the title, the REST of the plan as a checklist (done struck
 *   through, later quiet; mobile 1.24: the item you are on is the title, not also a row), one hugging pill ("Start", or
 *   "Continue" once something is done; Play only for a lesson);
 * - the readiness row (rings, the RANGE, "Estimated readiness"; mobile 1.24: the disclaimer lives on the report and on
 *   the first-range card, and the stage line rests unless it changed lately);
 * - mobile 1.24: no stat tiles (one quiet line names the weakest area once there is a range);
 * - never hours studied, never a single readiness percent;
 * - the screen-reader order: header, meta, greeting, plan, readiness.
 * The first-days states (Day 0, the first range, the reminder's second chance) are in today-first-days.test.tsx.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today, { greeting } from '../app/(tabs)/home';
import { KaisipLockup, KaisipMark } from '../components/brand';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { planCheckLabel } from '../components/journey';
import { getAllQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { dayKey } from '../engine/streak';
import { kaisip } from '../theme/tokens';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import type { PlanItem } from '../engine/planner';
import type { DayPlan } from '../engine/dayPlan';

const cisa = getCertification('cisa')!;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Each icon draws its own name, so a test can tell Play from ArrowRight inside the Start pill.
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
/** The screen reader's stops in reading order: every labelled accessible node, top to bottom. */
const stops = () =>
  root()
    .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel as string);
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const pill = () => root().findAll((n) => typeof n.props.onPress === 'function' && /^(Start|Continue)$/.test(String(n.props.accessibilityLabel)))[0];
const iconNames = (n: ReactTestInstance) => n.findAll((x) => (x.type as unknown) === 'Icon').map((x) => x.props.name as string);

const NOW = new Date(2026, 9, 15, 9, 0, 0); // a Thursday morning
const today = () => dayKey(NOW.getTime());
const ALL = getAllQuestions('cisa');
const WARM: PlanItem = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };
const REVIEW: PlanItem = { kind: 'review', count: 20, due: 20 };
const LESSON: PlanItem = { kind: 'lesson', lessonId: 'cisa-l-d1-charter', title: 'Business impact analysis', minutes: 5 };
const MOCK: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 };

const storePlan = (items: PlanItem[], done: boolean[]) => {
  const plan: DayPlan = { day: today(), certId: 'cisa', budget: 30, items, done, start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0 };
  act(() => {
    useProgress.getState().startDay(plan);
  });
};
/** `n` answered questions on real ids, `right` of them right (latest try). */
const seedAnswers = (n: number, right: number) => {
  const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
  ALL.slice(0, n).forEach((q, i) => {
    const ok = i < right;
    answers[q.id] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: NOW.getTime() - 86_400_000 };
  });
  // 20 review cards due an hour ago: the live queue the "Questions to revisit" line counts.
  const review: Record<string, { box: number; dueAt: number; lastSeen: number; reps: number }> = {};
  for (const q of ALL.slice(0, 20)) review[q.id] = { box: 1, dueAt: NOW.getTime() - 3_600_000, lastSeen: NOW.getTime() - 2 * 86_400_000, reps: 1 };
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, answers, review } } }));
  });
};
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  setScale(1);
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
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('the greeting', () => {
  it('follows the local hour, and carries a name only when the learner gave one (display-name-screens.test.tsx)', () => {
    expect(greeting(0)).toBe('Good morning');
    expect(greeting(11)).toBe('Good morning');
    expect(greeting(12)).toBe('Good afternoon');
    expect(greeting(17)).toBe('Good afternoon');
    expect(greeting(18)).toBe('Good evening');
    expect(greeting(23)).toBe('Good evening');
    expect(greeting(9)).not.toMatch(/,/);
  });
});

describe('the KaiSip mark and lockup', () => {
  it('are one image called "KaiSip", or hidden when a parent says the name', () => {
    mount(<KaisipLockup />);
    const img = root().findAll((n) => n.props.accessibilityRole === 'image')[0];
    expect(img.props.accessibilityLabel).toBe('KaiSip');
    unmount();
    mount(<KaisipMark />);
    expect(root().findAll((n) => n.props.accessibilityRole === 'image')[0].props.accessibilityLabel).toBe('KaiSip');
    unmount();
    mount(<KaisipLockup decorative />);
    expect(root().findAll((n) => n.props.accessibilityRole === 'image')).toHaveLength(0);
    expect(root().findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants').length).toBeGreaterThan(0);
  });

  it('draw the upright leaf and the companion pair in the theme tokens (ink on paper, paper in dark)', () => {
    const fills = () => root().findAll((n) => typeof n.props.fill === 'string' && n.props.d).map((n) => n.props.fill as string);
    mount(<KaisipLockup tone="light" />);
    expect(fills()).toEqual(expect.arrayContaining([kaisip.light.leaf, kaisip.light.pair, kaisip.light.word]));
    unmount();
    mount(<KaisipLockup tone="dark" />);
    expect(fills()).toEqual(expect.arrayContaining([kaisip.dark.leaf, kaisip.dark.pair, kaisip.dark.word]));
    // The tones are the Grove ones: forest on paper, sap beside paper in the dark.
    expect(kaisip.light).toEqual({ leaf: '#1E4A34', pair: '#2B6E4A', word: '#17231B' });
    expect(kaisip.dark.pair).toBe('#A9D9BA');
  });
});

describe('planCheckLabel: the plan as checklist lines, in the plan’s own words', () => {
  it('names each item with its real size', () => {
    expect(planCheckLabel(WARM)).toBe('Warm-up · 5 questions');
    expect(planCheckLabel(REVIEW, 20)).toBe('Questions to revisit · 20 ready');
    expect(planCheckLabel({ kind: 'review', count: 8, due: 56 }, 56)).toBe('Questions to revisit · 8 ready'); // never the 56 behind them
    expect(planCheckLabel(REVIEW, 0)).toBe('Questions to revisit · all caught up');
    expect(planCheckLabel(LESSON)).toBe('Lesson · Business impact analysis');
    expect(planCheckLabel({ kind: 'practice', count: 20, label: '20 questions · IS Audit' })).toBe('Practice: IS Audit · 20 questions');
    // A plan saved before 1.24 still says "Starting check": the learner reads the plain words now.
    expect(planCheckLabel({ kind: 'practice', count: 16, label: 'Starting check: 16 mixed questions', why: 'check' })).toBe('Mixed practice · 16 questions');
    expect(planCheckLabel({ kind: 'practice', count: 15, label: '15 mixed questions', why: 'check' })).toBe('Mixed practice · 15 questions');
    expect(planCheckLabel({ kind: 'practice', count: 5, label: 'Your first five', why: 'first' })).toBe('Your first five · 5 questions');
    expect(planCheckLabel({ kind: 'game', gameId: 'trap', label: 'Snare Spotter · 6 min' })).toMatch(/ · \d+ min$/);
    expect(planCheckLabel(MOCK)).toBe('Mini mock · about 80 min');
  });
});

describe('Today, top to bottom', () => {
  beforeEach(() => seedAnswers(200, 146));

  it('header (Grove): the head is the day said in full, no gear on Today, and the streak is on the twig', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    const s = stops();
    expect(s[0]).toBe('Thursday 15 October');
    expect(s.join(' ')).not.toMatch(/Field guide|Field record/);
    // Settings lives on You now (its header button); the exam date is the hero's Exam date tile.
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Settings' && typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(byTestID('week-twig')).toHaveLength(1);
    expect(allText()).toContain('6 day streak');
    expect(allText()).toContain('1 study day this week');
  });
  it('a learner with no streak has no pill', () => {
    act(() => {
      useProgress.setState({ streak: { current: 0, best: 0, lastDay: null } });
    });
    storePlan([REVIEW], [false]);
    mount(<Today />);
    expect(stops().some((l) => /-day streak/.test(l))).toBe(false);
  });

  it('the countdown is the title (the owner’s option A): the real days to the exam, the cert and its date under it, no name until the learner gives one', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(allText()).toContain('CISA exam 22 Nov');
    expect(allText()).not.toMatch(/Good morning/);
    // The countdown is the screen's heading.
    const heading = root().findAll((n) => n.props.accessibilityRole === 'header' && textOf(n) === '38 days to go');
    expect(heading.length).toBeGreaterThan(0);
  });

  it('no exam date, exam day and a past exam keep their own words', () => {
    storePlan([REVIEW], [false]);
    act(() => {
      useSettings.setState({ examDates: {} });
    });
    mount(<Today />);
    // No date: the greeting by the hour is the title, and the line says so.
    expect(allText()).toContain('Good morning');
    expect(allText()).toContain('No exam date set');
    unmount();
    act(() => {
      useSettings.setState({ examDates: { cisa: '2026-10-16' } });
    });
    mount(<Today />);
    expect(allText()).toContain('1 day to go');
  });

  it('the plan card: "Today’s plan" with the day’s minutes, then every step numbered, the one you are on first', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(allText()).toContain('Today’s plan');
    expect(allText()).toMatch(/About \d+ min/);
    expect(stops().some((l) => /^Today’s plan, about \d+ minutes, 0 of 3 done$/.test(l))).toBe(true);
    const steps = byTestID('plan-steps')[0];
    const lines = steps.findAll((n) => typeof n.type === 'string' && n.props.accessible === true).map((n) => n.props.accessibilityLabel as string);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^Step 1, Warm-up, 5 questions, \d+ minutes?, up next$/);
    expect(lines[1]).toMatch(/^Step 2, Questions to revisit, .*, later$/);
    expect(lines[2]).toMatch(/^Step 3, Business impact analysis, Lesson, 5 minutes, later$/);
  });
  it('done steps are struck through with a check and say "done"; the step you are on says "up next"', () => {
    storePlan([WARM, REVIEW, LESSON], [true, false, false]);
    mount(<Today />);
    const list = byTestID('plan-steps')[0];
    const lines = list.findAll((n) => typeof n.type === 'string' && n.props.accessible === true);
    expect(lines.map((n) => n.props.accessibilityLabel)).toEqual([
      expect.stringMatching(/^Step 1, Warm-up, .*, done$/),
      expect.stringMatching(/^Step 2, Questions to revisit, .*, up next$/),
      expect.stringMatching(/^Step 3, Business impact analysis, .*, later$/),
    ]);
    const title = (line: ReactTestInstance, t: string) => StyleSheet.flatten(line.findAll((n) => typeof n.type === 'string' && n.props.children === t)[0].props.style);
    expect(title(lines[0], 'Warm-up').textDecorationLine).toBe('line-through');
    expect(title(lines[1], 'Questions to revisit').textDecorationLine).toBeUndefined();
    // A check mark on the done step: never colour alone.
    expect(iconNames(lines[0])).toContain('Check');
    expect(iconNames(lines[1])).not.toContain('Check');
  });
  it('one pill: "Start" until something is done today, then "Continue"', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(pill().props.accessibilityLabel).toBe('Start');
    unmount();
    storePlan([WARM, REVIEW, LESSON], [true, false, false]);
    mount(<Today />);
    expect(pill().props.accessibilityLabel).toBe('Continue');
    expect(root().findAll((n) => typeof n.props.onPress === 'function' && /^(Start|Continue)$/.test(String(n.props.accessibilityLabel)))).toHaveLength(1);
  });

  it('the icon rule: Play only when the current item is a lesson, otherwise an arrow after the label', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(iconNames(pill())).toEqual(['ArrowRight']);
    unmount();
    storePlan([WARM, REVIEW, LESSON], [true, true, false]);
    mount(<Today />);
    expect(iconNames(pill())).toEqual(['Play']);
  });

  it('a day whose only open item is the optional mock says how long it is', () => {
    storePlan([MOCK], [false]);
    mount(<Today />);
    expect(allText()).toContain('50 questions · about 80 min');
    expect(allText()).not.toMatch(/Today’s plan · about/);
  });

  it('the ring: the range under it in words, the estimate line word for word, the 80 study bar; it opens the report', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(allText()).toMatch(/\d+ to \d+ estimated range/);
    expect(allText()).toContain('A study estimate, not a prediction.');
    expect(allText()).not.toMatch(/\d+\u2013\d+/);
    expect(allText()).not.toContain('a range not a promise');
    expect(byTestID('ring-ticks')).toHaveLength(1);
    expect(byTestID('ring-study-bar')).toHaveLength(1);
    expect(byTestID('ring-dots')).toHaveLength(0);
    // The journey's stage keeps its words, without a second numbered ladder beside the plant's "Stage 1 of 6".
    expect(allText()).not.toMatch(/Stage \d ·/);
    expect(allText()).toContain('Stage 1 of 6');
    const j = root().findAll((n) => n.props.testID === 'readiness-tap' && typeof n.props.onPress === 'function')[0];
    expect(j.props.accessibilityLabel).toMatch(/^Estimated readiness range \d+ to \d+ out of 100\. The study bar is 80\. A study estimate, not a prediction\.$/);
    act(() => {
      j.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/readiness');
    expect(byTestID('scale-bar')).toHaveLength(0);
  });
  it('the hero’s two tiles: Accuracy (latest tries, as on You) and the exam date; the weakest-area line stays', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(byTestID('today-tiles')).toHaveLength(0);
    expect(stops()).toContain('Accuracy, 73 percent, latest tries');
    expect(stops()).toContain('Exam date, 22 November');
    expect(allText()).not.toMatch(/Not yet/);
    const line = allText().match(/200 answered · weakest area: ([^A]+?)(?= Also|$)/);
    expect(line).not.toBeNull();
    // The domain's short name ("IS Operations"), never the tile abbreviation ("IS Ops"): UX review S6.
    expect(cisa.domains.some((d) => d.short === line![1].trim())).toBe(true);
  });
  it('never hours studied, and no single readiness percent', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(allText()).not.toMatch(/\bhours?\b|\bhrs?\b/i);
    expect(allText()).not.toMatch(/studied/i);
  });

  it('the screen-reader order follows the kit: head, title, meta line, the hero, the plan, the twig', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    const t = allText();
    const at = (x: string) => t.indexOf(x);
    const order = ['Thu 15 Oct', '38 days to go', 'CISA exam 22 Nov', 'Stage 1 of 6', 'estimated range', 'Accuracy', 'Today’s plan', 'This week’s twig', 'weakest area'];
    const idx = order.map(at);
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    const s = stops();
    const first = (re: RegExp) => s.findIndex((l) => re.test(l));
    const seq = [first(/^Thursday 15 October$/), first(/^Estimated readiness range/), first(/^Today’s plan/), first(/^Studied on /)];
    expect(seq.every((i) => i >= 0)).toBe(true);
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
  });
});

describe('Today: states with little data', () => {
  it('a brand-new learner (nothing answered): the seed, "Answer 40 questions", Accuracy not started, no range', () => {
    storePlan([LESSON, { kind: 'practice', count: 5, label: '5 questions · IS Audit', why: 'learn' }], [false, false]);
    mount(<Today />);
    expect(byTestID('today-tiles')).toHaveLength(0);
    expect(allText()).toContain('Answer 40 questions');
    expect(allText()).toContain('to see your first readiness range');
    expect(stops()).toContain('Accuracy, not started');
    expect(byTestID('ring-dots')).toHaveLength(1);
    expect(allText()).not.toMatch(/Not yet|Not enough data yet|\d+\u2013\d+|\d+ to \d+/);
  });
  it('with a few answers the ring counts them: "5 of 40 answers", seed dots, Accuracy "Too few yet"', () => {
    seedAnswers(5, 3);
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(allText()).toContain('5 of 40 answers');
    expect(allText()).toContain('until your first readiness range');
    expect(allText()).toContain('Too few yet');
    expect(allText()).toContain('Shows at 30 answers');
    expect(allText()).not.toMatch(/Stage \d ·/);
    expect(stops()).toContain('5 of 40 answers toward your first readiness range.');
    expect(byTestID('ring-dots')).toHaveLength(1);
  });
  it('a cleared day shows the clearing, not the checklist', () => {
    seedAnswers(200, 146);
    storePlan([WARM, REVIEW], [true, true]);
    mount(<Today />);
    expect(allText()).toContain('Today’s clearing');
    expect(byTestID('plan-steps')).toHaveLength(0);
    expect(byTestID('today-hero')).toHaveLength(0);
  });

  it('a past exam with no plan asks how it went, and still offers the rest', () => {
    act(() => {
      useSettings.setState({ examDates: { cisa: '2026-10-01' } });
    });
    mount(<Today />);
    expect(allText()).toContain('Exam done');
    expect(allText()).toContain('How did it go?');
    expect(byTestID('plan-checklist')).toHaveLength(0);
  });
});

describe('Today at large text (200%)', () => {
  it('keeps every line: the tiles stack and the steps wrap', () => {
    seedAnswers(200, 146);
    storePlan([WARM, REVIEW, LESSON], [true, false, false]);
    setScale(2);
    mount(<Today />);
    expect(allText()).toContain('estimated range');
    expect(allText()).toContain('200 answered · weakest area');
    // The steps still wrap rather than clip: no fixed heights or line caps.
    const lines = byTestID('plan-steps')[0].findAll((n) => typeof n.type === 'string' && n.props.accessible === true);
    expect(lines).toHaveLength(3);
    for (const l of lines) {
      for (const t of l.findAll((n) => typeof n.type === 'string' && n.props.numberOfLines !== undefined)) expect(t.props.numberOfLines).toBeUndefined();
    }
  });
});
