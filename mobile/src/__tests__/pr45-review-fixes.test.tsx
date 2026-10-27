/**
 * PR #45 (mobile 1.15 "Fit") review fixes: the code review's probes
 * (scratchpad probes15/p15.test.ts) made into real tests, plus the UX
 * review's HARD and PRECISION items and the decided observations.
 *
 *  - planner: random-input property (budget, count, labels, a mock never
 *    leads), the weekly mock in CALENDAR days (M1), exam week's light review
 *    keeps its size (M5), a new learner after day 1 (O4)
 *  - day plan: the weekly mock is optional (QA O1, decided), and a re-plan
 *    keeps banked credit and done items (M2)
 *  - store: setDailyGoal moves the minutes (M6); the fit card on at most 3
 *    separate days (M4), and its days round-trip a backup
 *  - words: spoken minutes (M7a, O9), hours past two hours (M9a)
 *  - screens: the mock row "Optional this week", Practice's order (P3),
 *    Settings' order and the spoken kept line (P6, P8, M7b), onboarding
 *    focus (P7), chips that wrap at 200% (H2), the dark-mode switch (O6)
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, StyleSheet, Switch } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Practice from '../app/(tabs)/practice';
import Onboarding from '../app/onboarding';
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { Chip, Toggle } from '../components/ui';
import { DAILY_MINUTES, FIT_ASK_DAYS, planTolerance, shouldAskFit, type Familiarity } from '../engine/fit';
import { clearingTitle, countedDone, currentIndex, isOptional, newDayPlan, planComplete, replanDay, type DayPlan } from '../engine/dayPlan';
import { addDays } from '../engine/examDay';
import { STAGE_ORDER, type Stage } from '../engine/journey';
import { aboutMin, spokenMin } from '../engine/pace';
import { EXAM_WEEK_LIGHT_MINUTES, itemMinutes, planMinutes, todaysPlan, type PlanInput, type PlanItem } from '../engine/planner';
import type { Readiness } from '../engine/readiness';
import { REVIEW_SESSION_CAP } from '../engine/srs';
import { dayKey } from '../engine/streak';
import * as a11y from '../lib/a11y';
import { flushSayLaterForTest } from '../lib/a11y';
import { changeFit, planUntouched } from '../lib/activity';
import { checkBackupText, currentBackup } from '../lib/backup';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { dark } from '../theme/tokens';

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

const DAY = 86_400_000;
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
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const today = () => dayKey(Date.now());
const readiness = { score: 0, domains: [] } as unknown as Readiness;

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
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, byCert: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: addDays(today(), 120) } });
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

// ── Planner ───────────────────────────────────────────────────────────────
/** A small seeded random source, so a failure always reproduces. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 2 ** 32;
  };
}

describe('planner: property over random inputs (code review P1)', () => {
  it('stays in budget, at most 4 items, honest labels, no lesson when focused, no mock in exam week, and a mock never leads', () => {
    const r = rng(45);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
    const NOW = new Date(2026, 9, 12, 9).getTime();
    const bad: string[] = [];
    for (let k = 0; k < 20_000; k++) {
      const B = pick([...DAILY_MINUTES, 1, 5, 60, 90] as number[]);
      const rawStage = pick(STAGE_ORDER as Stage[]);
      const due = pick([0, 1, 4, 5, 7, 8, 19, 20, 21, 55, 400, 5000]);
      const familiarity = pick([undefined, 'new', 'some', 'experienced'] as (Familiarity | undefined)[]);
      const examFocused = pick([undefined, true, false]);
      const daysLeft = pick([null, 0, 1, 2, 3, 4, 6, 7, 8, 30, 200]);
      // The stage journeyStage would give for this date (exam week and after win).
      const stage: Stage = daysLeft !== null && daysLeft <= 7 ? 'examDay' : rawStage === 'examDay' || rawStage === 'afterExam' ? 'practice' : rawStage;
      const nextLesson = r() < 0.8 ? { id: 'l', title: 'L', minutes: pick([3, 5, 8, 12]), domainId: '1', domainShort: 'IS Audit' } : undefined;
      const lastMockAt = pick([null, NOW - DAY, NOW - 6 * DAY, NOW - 7 * DAY, NOW - 30 * DAY]);
      const examQuestions = pick([150, 90, 125]);
      const p: PlanInput = {
        stage,
        dueReviews: due,
        dailyMinutes: B,
        familiarity,
        examFocused,
        // Mobile 1.16: past the starting check too (exam week's full mock needs 20 answers).
        answered: r() < 0.6 ? Math.floor(r() * 20) : pick([20, 21, 200]),
        lastFullMockAt: pick([null, NOW - 3 * DAY, NOW - 13 * DAY, NOW - 14 * DAY, NOW - 40 * DAY]),
        focusDomain: r() < 0.8 ? { id: '4', short: 'IS Operations' } : undefined,
        nextLesson,
        lastMockAt,
        now: NOW,
        daysLeft,
        examQuestions,
        examMinutes: examQuestions === 150 ? 240 : examQuestions === 90 ? 150 : 180,
        playable: () => r() < 0.7,
      };
      const plan = todaysPlan(p);
      const where = JSON.stringify({ B, stage, due, familiarity, examFocused, daysLeft, lastMockAt });
      const T = planTolerance(B);
      const focused = examFocused ?? familiarity === 'experienced';
      if (B >= 5 && planMinutes(plan) > B + T) bad.push(`over budget ${where}`);
      // Mobile 1.16: from 4 days out the day tapers to at most 20 minutes.
      const L = Math.min(B, EXAM_WEEK_LIGHT_MINUTES);
      if (B >= 5 && daysLeft !== null && daysLeft >= 2 && daysLeft <= 4 && planMinutes(plan) > L + planTolerance(L)) bad.push(`exam week grew ${where}`);
      if (B >= 5 && planMinutes(plan.slice(0, 2)) > B + T) bad.push(`tomorrow over ${where}`);
      if (plan.length > 4) bad.push(`>4 items ${where}`);
      if (plan.length === 0 && daysLeft !== 0 && daysLeft !== 1) bad.push(`empty ${where}`);
      if (focused && plan.some((i) => i.kind === 'lesson')) bad.push(`lesson while focused ${where}`);
      if (plan[0]?.kind === 'mock' && plan.some((i) => i.kind !== 'mock')) bad.push(`mock leads ${where}`);
      for (const i of plan) {
        if ((i.kind === 'review' || i.kind === 'practice') && (!Number.isInteger(i.count) || i.count < 1)) bad.push(`bad count ${where}`);
        if (i.kind === 'review' && (i.count > due || i.count > REVIEW_SESSION_CAP)) bad.push(`review ${i.count} of ${due} ${where}`);
        if ((i.kind === 'practice' || i.kind === 'review') && i.label) {
          const n = i.label.match(/(\d+) (mixed )?questions/);
          if (n && Number(n[1]) !== i.count) bad.push(`label ${i.label} vs ${i.count} ${where}`);
        }
        // Mobile 1.16: exam week's only mock is the optional full rehearsal, 7 to 5 days out.
        if (i.kind === 'mock' && daysLeft !== null && daysLeft <= 7 && !(daysLeft >= 5 && i.why === 'final' && i.questions === examQuestions)) bad.push(`mock in exam week ${where}`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

describe('planner: the weekly mock counts CALENDAR days (code review M1, QA B1)', () => {
  const mockPlan = (lastMockAt: number, now?: number) =>
    todaysPlan({ stage: 'mock', dueReviews: 0, dailyMinutes: 20, daysLeft: 60, examQuestions: 150, examMinutes: 240, lastMockAt, now });
  const hasMock = (p: PlanItem[]) => p.some((i) => i.kind === 'mock');

  it('a mock last Monday 20:00 is due again next Monday 07:00 (7 calendar days, 6 days 11 hours)', () => {
    expect(hasMock(mockPlan(new Date(2026, 9, 5, 20).getTime(), new Date(2026, 9, 12, 7).getTime()))).toBe(true);
    // Six calendar days on, late at night: not yet.
    expect(hasMock(mockPlan(new Date(2026, 9, 5, 0, 5).getTime(), new Date(2026, 9, 11, 23, 55).getTime()))).toBe(false);
  });
  it('a DST spring-forward week: the same wall-clock time a week later (7 × 24 h − 1 h) is due', () => {
    expect(hasMock(mockPlan(Date.UTC(2026, 2, 22, 9), Date.UTC(2026, 2, 29, 8)))).toBe(true);
  });
  it('no `now` from the caller: the clock is used, so a mock is never lost for good', () => {
    expect(hasMock(mockPlan(Date.now() - 60 * DAY))).toBe(true);
  });
  it('never in exam week, whatever the stage says (code review M9c)', () => {
    expect(hasMock(todaysPlan({ stage: 'mock', dueReviews: 0, dailyMinutes: 20, daysLeft: 3, examQuestions: 150, lastMockAt: null, now: Date.now() }))).toBe(false);
  });
});

describe('planner: sizes that respect the learner', () => {
  it('exam week tapers: from 4 days out the day is at most 20 minutes (mobile 1.16 replaces the 5a cap of 10)', () => {
    for (const m of DAILY_MINUTES) {
      const plan = todaysPlan({ stage: 'examDay', dueReviews: 0, dailyMinutes: m, daysLeft: 4, answered: 200, focusDomain: { id: '4', short: 'IS Operations' }, examQuestions: 150, examMinutes: 240 });
      const top = plan.find((i): i is Extract<PlanItem, { kind: 'practice' }> => i.kind === 'practice')!;
      expect(planMinutes(plan)).toBeLessThanOrEqual(Math.min(m, EXAM_WEEK_LIGHT_MINUTES) + planTolerance(Math.min(m, EXAM_WEEK_LIGHT_MINUTES)));
      expect(top.label).toBe('Top-up: IS Operations');
    }
  });

  it('a new learner after day 1: a lesson plus up to 10 questions that fit the minutes (UX review O4)', () => {
    const lesson = { id: 'l1', title: 'Audit basics', minutes: 5, domainId: '1', domainShort: 'IS Audit' };
    const day = (answered: number, dailyMinutes: number) =>
      todaysPlan({ stage: 'diagnose', dueReviews: 0, dailyMinutes, familiarity: 'new', answered, nextLesson: lesson, daysLeft: 90, examQuestions: 150 });
    // Day 1 is the first five, with no lesson before it (mobile 1.24).
    expect(day(0, 45)).toEqual([{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }]);
    // Later: the chosen minutes are respected, up to 10, and never past the 20 that end the stage.
    expect(day(5, 45)[1]).toMatchObject({ count: 10, label: '10 questions · IS Audit' });
    expect(day(5, 10)[1]).toMatchObject({ count: 5 });
    expect(day(17, 45)[1]).toMatchObject({ count: 5 });
    for (const m of DAILY_MINUTES) expect(planMinutes(day(5, m))).toBeLessThanOrEqual(m + planTolerance(m));
  });
});

// ── Day plan ──────────────────────────────────────────────────────────────
describe('day plan: the weekly mock is optional (QA O1, decided)', () => {
  const items: PlanItem[] = [
    { kind: 'practice', count: 16, label: 'Weak spots: IS Operations', domainId: '4', why: 'weak' },
    { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 },
    { kind: 'game', gameId: 'trap', label: 'Snare Spotter · 6 min' },
  ];
  const plan = (done: boolean[]): DayPlan => ({ ...newDayPlan('2026-10-12', 'cisa', items, readiness, 20), done });

  it('the day clears when the timed items are done; the mock is never the item "to do now"', () => {
    expect(isOptional(items, 1)).toBe(true);
    expect(currentIndex(plan([true, false, false]))).toBe(2);
    expect(planComplete(plan([true, false, true]))).toBe(true);
    expect(clearingTitle(plan([true, false, true]))).toBe('Two of two, done.');
    expect(countedDone(plan([true, false, true]))).toEqual([true, true]);
    // Taken anyway: it counts.
    expect(clearingTitle(plan([true, true, true]))).toBe('Three of three, done.');
  });
  it('a day with nothing but a mock is that mock', () => {
    const only = { ...newDayPlan('2026-10-12', 'cisa', [items[1]], readiness, 20) };
    expect(isOptional(only.items, 0)).toBe(false);
    expect(currentIndex(only)).toBe(0);
    expect(planComplete(only)).toBe(false);
  });
});

describe('day plan: a re-plan keeps what was done (code review M2, QA B2)', () => {
  const day = '2026-10-12';
  it('banked answers on an unticked item mean the plan has started: a fit change keeps it', () => {
    const old = { ...newDayPlan(day, 'cisa', [{ kind: 'practice', count: 16, label: '16 mixed questions' }], readiness, 20), answered: 10, credit: [10] };
    expect(planUntouched(old, day)).toBe(false);
    expect(planUntouched({ ...old, credit: [0] }, day)).toBe(true);
  });
  it('replanDay (an exam-date change) carries credit to the item it counts for, and ticks it when it is enough', () => {
    const old: DayPlan = {
      ...newDayPlan(day, 'cisa', [
        { kind: 'practice', count: 16, label: '16 mixed questions' },
        { kind: 'lesson', lessonId: 'l1', title: 'L1' },
      ], readiness, 20),
      done: [false, true],
      answered: 10,
      credit: [10, 0],
    };
    const fresh = newDayPlan(day, 'cisa', [
      { kind: 'lesson', lessonId: 'l1', title: 'L1' },
      { kind: 'practice', count: 8, label: '8 mixed questions' },
    ], readiness, 10);
    const re = replanDay(old, fresh);
    expect(re.credit).toEqual([0, 10]);
    // 10 ≥ 7 (80% of 8): ticked. The lesson already done stays done.
    expect(re.done).toEqual([true, true]);
    expect(re.answered).toBe(10);
  });
  it('answers from no particular domain never count for a domain item', () => {
    const old: DayPlan = { ...newDayPlan(day, 'cisa', [{ kind: 'practice', count: 16, label: '16 mixed questions' }], readiness, 20), credit: [10] };
    const fresh = newDayPlan(day, 'cisa', [{ kind: 'practice', count: 8, label: '8 questions · IS Operations', domainId: '4' }], readiness, 10);
    expect(replanDay(old, fresh).credit).toBeUndefined();
  });
});

// ── Store ─────────────────────────────────────────────────────────────────
describe('settings: never a silent no-op (code review M6)', () => {
  it('setDailyGoal moves the minutes the planner reads', () => {
    useSettings.setState({ dailyMinutes: 10, dailyGoal: 10 });
    useSettings.getState().setDailyGoal(40);
    expect(dailyMinutesOf(useSettings.getState())).toBe(45);
  });
});

describe('the "Fit your plan" card: on at most 3 separate days (code review M4, decided)', () => {
  const base = { onboarded: true, daysLeft: 60, examMoment: false, readyPanel: false, plantLine: false };
  it('shouldAskFit: the third day lasts all day, then never again', () => {
    expect(FIT_ASK_DAYS).toBe(3);
    expect(shouldAskFit({ ...base, askedDays: ['2026-10-01', '2026-10-02'], today: '2026-10-03' })).toBe(true);
    expect(shouldAskFit({ ...base, askedDays: ['2026-10-01', '2026-10-02', '2026-10-03'], today: '2026-10-03' })).toBe(true);
    expect(shouldAskFit({ ...base, askedDays: ['2026-10-01', '2026-10-02', '2026-10-03'], today: '2026-10-04' })).toBe(false);
  });

  it('Today counts the days it showed, and after the third it stays away (Settings keeps the controls)', () => {
    for (let k = 0; k < 4; k++) {
      // A different day each visit (the stored plan from the visit before is "yesterday's").
      useSettings.setState({ fitAskDays: (useSettings.getState().fitAskDays ?? []).map((d) => addDays(d, -1)) });
      act(() => {
        useProgress.setState({ days: {} });
      });
      mount(<Today />);
      const shown = root().findAll((n) => n.props.testID === 'fit-card' && typeof n.type === 'string').length > 0;
      expect(shown).toBe(k < 3);
      unmount();
    }
    expect(useSettings.getState().fitAskDays).toHaveLength(3);
    // The same day again: still counted once.
    useSettings.getState().noteFitAsked(useSettings.getState().fitAskDays![2]);
    expect(useSettings.getState().fitAskDays).toHaveLength(3);
  });

  it('the days round-trip a backup; a bad value is refused', () => {
    useSettings.setState({ fitAskDays: ['2026-10-01', '2026-10-02'] });
    const file = currentBackup();
    expect(file.stores.settings.state).toMatchObject({ fitAskDays: ['2026-10-01', '2026-10-02'] });
    const ok = checkBackupText(JSON.stringify(file));
    expect(ok.kind).toBe('ok');
    if (ok.kind === 'ok') expect(ok.data.settings.fitAskDays).toEqual(['2026-10-01', '2026-10-02']);
    for (const bad of [['2026-02-31'], ['x'], ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], 'soon']) {
      const f = JSON.parse(JSON.stringify(file));
      f.stores.settings.state.fitAskDays = bad;
      expect(checkBackupText(JSON.stringify(f)).kind).not.toBe('ok');
    }
  });
});

// ── Words ─────────────────────────────────────────────────────────────────
describe('minutes, read and heard (code review M7a, M9a; UX review O9)', () => {
  it('spokenMin says units in full', () => {
    expect(spokenMin('About 20 min today + mock')).toBe('About 20 minutes today + mock');
    expect(spokenMin('Optional this week · about 1 min')).toBe('Optional this week · about 1 minute');
    expect(spokenMin('about 2.5 min')).toBe('about 2.5 minutes');
    expect(spokenMin('About 3 h 31 min')).toBe('About 3 hours 31 minutes');
  });
  it('aboutMin reads in hours from two hours; a mini mock stays "About 80 min"', () => {
    expect(aboutMin(80)).toBe('About 80 min');
    expect(aboutMin(119)).toBe('About 119 min');
    expect(aboutMin(240)).toBe('About 4 h');
    expect(aboutMin(211, true)).toBe('about 3 h 31 min');
  });
});

// ── Screens ───────────────────────────────────────────────────────────────
describe('Today: the weekly mock beside the day', () => {
  const start = () =>
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [
          { kind: 'practice', count: 16, label: 'Weak spots: IS Operations', domainId: '4', why: 'weak' },
          { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 },
        ],
        done: [false, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0,
      });
    });

  it('the hero is the timed item; the mock row says "Optional this week" and its length, spoken in full', () => {
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'experienced', dailyMinutes: 20 });
    start();
    mount(<Today />);
    expect(allText()).toContain('Weak spots: IS Operations');
    expect(allText()).toContain('Mini mock Optional this week · about 80 min');
    const row = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Mini mock, '))[0];
    expect(row.props.accessibilityLabel).toBe('Mini mock, Optional this week · about 80 minutes');
    // The caption meta and the hero meta are spoken with "minutes" (O9, M7a).
    const labels = root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
    // The optional mock is not one of the day's items (mobile 1.24): "0 of 1 done".
    expect(labels).toContain('Today’s plan · about 19 minutes, 0 of 1 done');
    // Mobile 1.21: the minutes are said once. The hero is the day's only timed item, so the
    // caption's total carries them. Mobile 1.24: the count and the why are the line under the title; the pill's hint is the title.
    const hints = root().findAll((n) => typeof n.props.accessibilityHint === 'string').map((n) => n.props.accessibilityHint as string);
    expect(hints).toContain('Weak spots: IS Operations');
    expect(allText()).toContain('16 questions, most points to gain');
    expect(hints.join('|')).not.toContain('About 19 minutes');
  });

  it('with the timed item done, the day clears, the skipped mock aside', () => {
    useSettings.setState({ fitPrompt: 'answered', familiarity: 'experienced', dailyMinutes: 20 });
    start();
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, done: [true, false] } } }));
    });
    mount(<Today />);
    expect(allText()).toContain('One of one, done.');
  });

  it('a mock-only day says "A mock today" (UX review P1)', () => {
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20 });
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [{ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 }],
        done: [false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0,
      });
    });
    mount(<Today />);
    // Mobile 1.21: no day minutes in the caption (a mock is longer than any day); the mock is the hero and says its own length.
    expect(allText()).toMatch(/Today’s plan Mini mock 50 questions · about 80 min/);
  });
});

describe('Practice: when mocks lead, they come straight after Timed, then the pace offer (UX review P3, P4)', () => {
  it('Timed → Mock exams → Practice at exam pace? → More ways to practice', () => {
    useSettings.setState({ familiarity: 'experienced', examDates: { cisa: addDays(today(), 14) } });
    mount(<Practice />);
    const t = allText();
    const at = ['Timed', 'Mock exams', 'Practice at exam pace?', 'More ways to practice'].map((s) => t.indexOf(s));
    expect(at.every((n) => n > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});

describe('Settings: Your study and Practice together; the kept line is said (UX review P6, P8; code review M7b)', () => {
  it('section order (mobile 1.46: one page, in the order learners change things; two doors at the end)', () => {
    mount(<Settings />);
    const t = allText();
    const at = ['Appearance', 'Your study', 'Reminders', 'Practice', 'Badges and your plant', 'Your data', 'Help and about'].map((s) => t.indexOf(s));
    expect(at.every((n) => n > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('a change that keeps today’s plan says so once', () => {
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    useSettings.setState({ fitPrompt: 'answered', dailyMinutes: 20 });
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [{ kind: 'practice', count: 16, label: 'Starting check: 16 mixed questions', why: 'check' }],
        done: [false], credit: [4], start: { score: 0, domains: {} }, answered: 4, correct: 2, minutes: 5,
      });
    });
    mount(<Settings />);
    // Mobile 1.17: Daily time is a row; each choice closes its sheet.
    press(/^Daily time, /);
    press(/^10 minutes a day$/);
    press(/^Daily time, /);
    press(/^30 minutes a day$/);
    act(() => flushSayLaterForTest());
    expect(say.mock.calls.map((c) => c[0])).toEqual(['Today’s plan stays as it is. Tomorrow’s will fit.']);
    expect(allText()).toContain('Today’s plan stays as it is. Tomorrow’s will fit.');
    expect(changeFit('cisa', { dailyMinutes: 45 }).keptToday).toBe(true);
  });
});

describe('Onboarding: each step\u2019s header takes focus (UX review P7, O7)', () => {
  it('focus moves to the new header on every step change, and the header is there from its first frame', () => {
    const focus = jest.spyOn(a11y, 'moveFocus').mockImplementation(() => {});
    useSettings.setState({ onboarded: false, examDates: {} });
    mount(<Onboarding />);
    const header = (title: string) => root().findAll((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === title && n.props.accessible === true);
    expect(focus).not.toHaveBeenCalled();
    const steps: [RegExp, string][] = [
      // Mobile 1.41: no name step.
      [/^Get started$/, 'Where are you starting from?'],
      [/^Skip this question$/, 'When is your exam?'],
    ];
    steps.forEach(([button, title], k) => {
      press(button);
      expect(header(title)).not.toHaveLength(0);
      expect(focus).toHaveBeenCalledTimes(k + 1);
      // The ref points at a mounted header (never at something still animating in).
      expect((focus.mock.calls[k][0] as { current: unknown }).current).toBeTruthy();
    });
    // No role-less label on the date chips' wrapper (it was never spoken).
    press(/^Back$/);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Exam date' && !n.props.accessibilityRole)).toHaveLength(0);
  });
});

describe('UI details', () => {
  it('a chip never runs wider than its row: it wraps at 200% text (UX review H2)', () => {
    mount(<Chip label="Fixed the symptom, not the cause" selected={false} onPress={() => {}} />);
    const pill = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type !== 'string')[0];
    const style = StyleSheet.flatten(pill.props.style);
    expect(style.maxWidth).toBe('100%');
    const label = root().findAll((n) => n.children.includes('Fixed the symptom, not the cause') && n.props.style)[0];
    expect(StyleSheet.flatten(label.props.style).flexShrink).toBe(1);
  });

  it('the switch thumb, off in dark mode, is light enough to see (UX review O6)', () => {
    useSettings.setState({ theme: 'dark' });
    mount(<Toggle value={false} onValueChange={() => {}} accessibilityLabel="x" />);
    expect(root().findByType(Switch).props.thumbColor).toBe(dark.ink2);
    unmount();
    mount(<Toggle value onValueChange={() => {}} accessibilityLabel="x" />);
    expect(root().findByType(Switch).props.thumbColor).toBe(dark.onBtn);
  });
});

// The planner's minutes for a mock item stay its exam-pace length (C4).
it('itemMinutes(mini mock) is its exam-pace minutes for every exam size (code review P6)', () => {
  const mm = (q: number, m: number) => todaysPlan({ stage: 'mock', dueReviews: 0, dailyMinutes: 20, daysLeft: 60, examQuestions: q, examMinutes: m, now: 0 })[0];
  expect([mm(150, 240), mm(90, 150), mm(125, 180)].map(itemMinutes)).toEqual([80, 50, 60]);
});
