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
import { STAGE_LABEL, STAGE_ORDER } from '../engine/journey';
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

  it('header (mobile 1.51, Field Guide): the running head with the day said in full, the gear, and the streak under the title', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    const s = stops();
    expect(s[0]).toBe('Field guide, Today');
    expect(s).toContain('Thursday 15 October');
    expect(s).toContain('6-day streak');
    expect(allText()).toContain('day streak');
    const gear = root().findAll((n) => n.props.accessibilityLabel === 'Settings' && typeof n.props.onPress === 'function')[0];
    act(() => {
      gear.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/settings');
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

  it('the plan panel: caption with the day’s minutes, the title, and a checklist of the REST of the plan', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(allText()).toMatch(/Today’s plan · about \d+ min/);
    const list = byTestID('plan-checklist')[0];
    const lines = list.findAll((n) => typeof n.type === 'string' && n.props.accessible === true).map((n) => n.props.accessibilityLabel as string);
    // Mobile 1.24: the item you are on is the title (with its detail under it), not also the first row.
    expect(lines).toEqual(['Questions to revisit · 20 ready, later', 'Lesson · Business impact analysis, later']);
    expect(allText()).toContain('5 questions');
    // The title is the current item's own, with no count in it.
    expect(root().findAll((n) => n.props.accessibilityRole === 'header' && textOf(n) === 'Warm-up').length + root().findAll((n) => n.props.accessibilityRole === 'header' && /^(Warm-up|Optional warm-up)/.test(textOf(n))).length).toBeGreaterThan(0);
  });

  it('done lines are struck through and say "done"; later lines are quiet; the item you are on is the title, not a row', () => {
    storePlan([WARM, REVIEW, LESSON], [true, false, false]);
    mount(<Today />);
    const list = byTestID('plan-checklist')[0];
    const lines = list.findAll((n) => typeof n.type === 'string' && n.props.accessible === true);
    expect(lines.map((n) => n.props.accessibilityLabel)).toEqual(['Warm-up · 5 questions, done', 'Lesson · Business impact analysis, later']);
    const style = (line: ReactTestInstance) => StyleSheet.flatten(line.findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string' && n.props.children.includes('·'))[0].props.style);
    expect(style(lines[0]).textDecorationLine).toBe('line-through');
    expect(style(lines[1]).textDecorationLine).toBeUndefined();
    expect(style(lines[1]).fontFamily).toBe('Figtree_400Regular');
    // A check mark on the done line: never colour alone.
    expect(iconNames(lines[0])).toContain('Check');
    expect(iconNames(lines[1])).not.toContain('Check');
    // The current item (the review) is the panel's title, said once.
    const heading = root().findAll((n) => n.props.accessibilityRole === 'header' && textOf(n) === 'Questions to revisit');
    expect(heading.length).toBeGreaterThan(0);
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

  it('the readiness row: the range, "Estimated readiness", the stage by number and name; it opens the report', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(allText()).toMatch(/\d+–\d+/);
    expect(allText()).toContain('Estimated readiness');
    // The longer disclaimer is on the report and on the first-range card, not on every day's Today.
    expect(allText()).not.toContain('a range not a promise');
    const j = root().findAll((n) => n.props.testID === 'readiness-tap')[0];
    const stageText = allText().match(/Stage (\d) · ([A-Za-z ]+?)(?= \d| Also| answered|$)/);
    expect(stageText).not.toBeNull();
    const stage = STAGE_ORDER[Number(stageText![1]) - 1];
    expect(stageText![2].startsWith(STAGE_LABEL[stage])).toBe(true);
    act(() => {
      j.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/readiness');
    // Mobile 1.51: the scale bar (its words built in), never a single readiness percent.
    expect(byTestID('scale-bar').length).toBeGreaterThan(0);
    expect(allText()).toContain('a study estimate, not a prediction');
  });

  it('no stat tiles any more: one quiet line names the weakest area once there is a range, and no accuracy sits beside the range', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    expect(byTestID('today-tiles')).toHaveLength(0);
    expect(allText()).not.toMatch(/accuracy|Not yet/i);
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

  it('the screen-reader order: running head, title, meta line, plan, readiness', () => {
    storePlan([WARM, REVIEW, LESSON], [false, false, false]);
    mount(<Today />);
    const t = allText();
    const at = (s: string) => t.indexOf(s);
    const order = ['Field guide · Today', '38 days to go', 'CISA exam 22 Nov', 'Today’s plan · about', 'Estimated readiness', 'weakest area'];
    const idx = order.map(at);
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    const s = stops();
    const first = (re: RegExp) => s.findIndex((l) => re.test(l));
    const seq = [first(/^Field guide, Today$/), first(/^Today’s plan/), first(/^Estimated readiness/)];
    expect(seq.every((i) => i >= 0)).toBe(true);
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
  });
});

describe('Today: states with little data', () => {
  it('a brand-new learner (nothing answered): no readiness row, no tiles, nothing that says "Not yet"', () => {
    storePlan([LESSON, { kind: 'practice', count: 5, label: '5 questions · IS Audit', why: 'learn' }], [false, false]);
    mount(<Today />);
    expect(byTestID('today-tiles')).toHaveLength(0);
    expect(byTestID('readiness-tap')).toHaveLength(0);
    expect(allText()).not.toMatch(/Not yet|Not enough data yet|\d+–\d+/);
  });

  it('with a few answers the row is the goal, "5 of 40 for your first range", with no stage line for the first stage', () => {
    seedAnswers(5, 3);
    storePlan([WARM], [false]);
    mount(<Today />);
    expect(allText()).toContain('Not enough data yet');
    expect(allText()).toContain('5 of 40 for your first range');
    expect(allText()).not.toMatch(/Stage \d/);
    expect(stops().some((l) => /^Not enough data yet\. 5 of 40 for your first range/.test(l))).toBe(true);
  });

  it('a cleared day shows the clearing, not the checklist', () => {
    seedAnswers(200, 146);
    storePlan([WARM, REVIEW], [true, true]);
    mount(<Today />);
    expect(allText()).toContain('Today’s clearing');
    expect(byTestID('plan-checklist')).toHaveLength(0);
    expect(byTestID('today-tiles')).toHaveLength(0);
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
  it('keeps every line: the readiness row stacks and the checklist wraps', () => {
    seedAnswers(200, 146);
    storePlan([WARM, REVIEW, LESSON], [true, false, false]);
    setScale(2);
    mount(<Today />);
    expect(allText()).toContain('Estimated readiness');
    expect(allText()).toContain('200 answered · weakest area');
    // The checklist lines still wrap rather than clip: no fixed heights or line caps.
    const lines = byTestID('plan-checklist')[0].findAll((n) => typeof n.type === 'string' && n.props.accessible === true);
    expect(lines).toHaveLength(2);
    for (const l of lines) {
      for (const t of l.findAll((n) => typeof n.type === 'string' && n.props.numberOfLines !== undefined)) expect(t.props.numberOfLines).toBeUndefined();
    }
  });
});
