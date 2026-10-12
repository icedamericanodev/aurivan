/**
 * Mobile 1.16 (PHASE5.md §3.2, §3.4): the exam-week plan and checklist.
 * - Planner: 7…5 days out offer ONE full mock, only with none in 14 days and
 *   the starting check done; 4…2 days out never plan a mock and fit
 *   min(minutes, 20); the eve and the exam day are unchanged; the budget
 *   property still holds.
 * - The checklist: ticks belong to one exam date (a date change resets),
 *   Hide persists, an unknown id is dropped, and it round-trips a backup.
 * - Today's card shows only 7…2 days out; Open and Hide; the checklist
 *   screen ticks, and links to the readiness report.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import ExamWeekScreen from '../app/exam-week';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { readBackup } from '../engine/backup';
import { addDays } from '../engine/examDay';
import { cleanDone, EXAM_WEEK_ITEMS, examWeekCardDue, examWeekCount, examWeekOf, examWeekText, hideExamWeek, toggleExamWeek } from '../engine/examWeek';
import { DAILY_MINUTES, planTolerance } from '../engine/fit';
import { EVE_MAX, EXAM_WEEK_LIGHT_MINUTES, FULL_MOCK_GAP_DAYS, planMinutes, todaysPlan, WARM_UP, type PlanInput } from '../engine/planner';
import type { AnswerRecord } from '../engine/readiness';
import { dayKey } from '../engine/streak';
import { flushSayLaterForTest } from '../lib/a11y';
import { checkBackupText, currentBackup } from '../lib/backup';
import { selectCert, useProgress } from '../store/progress';
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

const cisa = getCertification('cisa')!;
const DAY = 86_400_000;
const NOW = new Date(2026, 9, 12, 9).getTime();

// ── The planner ──────────────────────────────────────────────────────────
describe('planner: exam week (days 7 to 2)', () => {
  const week = (daysLeft: number, p: Partial<PlanInput> = {}) =>
    todaysPlan({
      stage: 'examDay',
      dueReviews: 0,
      dailyMinutes: 30,
      answered: 200,
      focusDomain: { id: '4', short: 'IS Operations' },
      daysLeft,
      examQuestions: 150,
      examMinutes: 240,
      lastFullMockAt: null,
      now: NOW,
      ...p,
    });
  const mocks = (plan: ReturnType<typeof todaysPlan>) => plan.filter((i) => i.kind === 'mock');

  it('7, 6 and 5 days out: a top-up, then ONE optional full mock (never leading), at exam pace', () => {
    for (const d of [7, 6, 5]) {
      const plan = week(d);
      expect(plan[0]).toMatchObject({ kind: 'practice', label: 'Top-up: IS Operations', why: 'topup', domainId: '4' });
      expect(mocks(plan)).toEqual([{ kind: 'mock', questions: 150, label: 'Full mock · 150 questions', minutes: 240, why: 'final' }]);
    }
  });

  it('the full mock waits when one was finished in the last 14 calendar days', () => {
    expect(mocks(week(6, { lastFullMockAt: NOW - 3 * DAY }))).toEqual([]);
    expect(mocks(week(6, { lastFullMockAt: NOW - (FULL_MOCK_GAP_DAYS - 1) * DAY }))).toEqual([]);
    expect(mocks(week(6, { lastFullMockAt: NOW - FULL_MOCK_GAP_DAYS * DAY }))).toHaveLength(1);
    // A recent MINI mock doesn't count: only a full one does.
    expect(mocks(week(6, { lastMockAt: NOW - DAY }))).toHaveLength(1);
  });

  it('fewer than 20 answers: no full mock, and the practice is the starting check (sized like it)', () => {
    const plan = week(6, { answered: 12 });
    expect(mocks(plan)).toEqual([]);
    expect(plan[0]).toMatchObject({ kind: 'practice', why: 'check', label: 'Starting check: 8 mixed questions', count: 8 });
  });

  it('4, 3 and 2 days out: never a mock, and the day fits min(minutes, 20)', () => {
    for (const d of [4, 3, 2]) {
      for (const m of [...DAILY_MINUTES, 60]) {
        for (const due of [0, 6, 55]) {
          const plan = week(d, { dailyMinutes: m, dueReviews: due });
          expect(mocks(plan)).toEqual([]);
          const L = Math.min(m, EXAM_WEEK_LIGHT_MINUTES);
          expect(planMinutes(plan)).toBeLessThanOrEqual(L + planTolerance(L));
        }
      }
    }
    // 45 minutes, nothing due: a light top-up (10) and a short game.
    expect(week(3, { dailyMinutes: 45 }).map((i) => i.kind)).toEqual(['practice', 'game']);
  });

  it('reviews still come first in exam week', () => {
    expect(week(6, { dueReviews: 30 })[0]).toMatchObject({ kind: 'review' });
    expect(week(3, { dueReviews: 30 })[0]).toMatchObject({ kind: 'review' });
  });

  it('the eve and the exam day are unchanged', () => {
    expect(week(1, { dailyMinutes: 45 })).toEqual([{ kind: 'practice', count: EVE_MAX, label: 'Light review · 10 questions' }]);
    expect(week(0)).toEqual([{ kind: 'practice', count: WARM_UP, label: 'Optional warm-up · 5 questions' }]);
  });

  it('the budget property still holds for every exam-week day, minutes, queue and history', () => {
    const bad: string[] = [];
    for (const d of [7, 6, 5, 4, 3, 2]) {
      for (const m of [...DAILY_MINUTES, 5, 60]) {
        for (const due of [0, 3, 19, 55]) {
          for (const answered of [0, 12, 19, 20, 400]) {
            for (const lastFullMockAt of [null, NOW - 2 * DAY, NOW - 30 * DAY]) {
              const plan = week(d, { dailyMinutes: m, dueReviews: due, answered, lastFullMockAt });
              const B = d <= 4 ? Math.min(m, EXAM_WEEK_LIGHT_MINUTES) : m;
              const where = JSON.stringify({ d, m, due, answered, lastFullMockAt });
              if (planMinutes(plan) > B + planTolerance(B)) bad.push(`over ${where}`);
              if (plan.length < 1 || plan.length > 4) bad.push(`length ${where}`);
              if (plan[0]?.kind === 'mock') bad.push(`mock leads ${where}`);
              if (mocks(plan).length > (d >= 5 && answered >= 20 ? 1 : 0)) bad.push(`mock ${where}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

// ── The checklist rules ──────────────────────────────────────────────────
describe('the exam-week checklist (engine)', () => {
  const date = '2026-10-20';

  it('six items, in order, with the pace from the exam’s own facts', () => {
    expect(EXAM_WEEK_ITEMS).toEqual(['booking', 'guide', 'online', 'centre', 'pace', 'sleep']);
    expect(examWeekText('pace', cisa.exam)).toBe('Know your pace: about 96 seconds a question. Past 2 minutes, flag it and move on.');
    expect(examWeekText('guide', cisa.exam)).toBe('Read the official candidate guide for ID and test-day rules.');
    // Generic and true: no exam body named, no promise.
    for (const id of EXAM_WEEK_ITEMS) expect(examWeekText(id, cisa.exam)).not.toMatch(/ISACA|ISC2|guarantee|pass/i);
  });

  it('ticks belong to one exam date: moving the date starts fresh (the old ticks are ignored)', () => {
    let s = toggleExamWeek(undefined, date, 'booking');
    s = toggleExamWeek(s, date, 'pace');
    expect(examWeekOf(s, date).done).toEqual(['booking', 'pace']);
    expect(examWeekCount(examWeekOf(s, date).done)).toBe('2 of 6 done');
    expect(examWeekOf(s, '2026-10-27')).toEqual({ done: [], hidden: false });
    // A tick on the new date starts a new list.
    expect(toggleExamWeek(s, '2026-10-27', 'sleep')).toEqual({ for: '2026-10-27', done: ['sleep'] });
    // Untick.
    expect(examWeekOf(toggleExamWeek(s, date, 'booking'), date).done).toEqual(['pace']);
  });

  it('Hide persists for that date and keeps the ticks; a new date shows the card again', () => {
    const s = hideExamWeek(toggleExamWeek(undefined, date, 'guide'), date);
    expect(s).toEqual({ for: date, done: ['guide'], hidden: true });
    expect(examWeekOf(toggleExamWeek(s, date, 'sleep'), date)).toEqual({ done: ['guide', 'sleep'], hidden: true });
    expect(examWeekCardDue(5, s, date)).toBe(false);
    expect(examWeekCardDue(5, s, '2026-10-27')).toBe(true);
  });

  it('the card shows only 7 to 2 days out, and never without a date', () => {
    expect([8, 7, 6, 5, 4, 3, 2, 1, 0, -1].map((d) => examWeekCardDue(d, undefined, date))).toEqual([false, true, true, true, true, true, true, false, false, false]);
    expect(examWeekCardDue(null, undefined, date)).toBe(false);
    expect(examWeekCardDue(5, undefined, undefined)).toBe(false);
  });

  it('an unknown or repeated id is dropped, never kept', () => {
    expect(cleanDone(['sleep', 'nap', 'booking', 'sleep', 7, null])).toEqual(['booking', 'sleep']);
    expect(examWeekOf({ for: date, done: ['coffee' as never, 'pace'] }, date).done).toEqual(['pace']);
  });
});

// ── The store and the backup ─────────────────────────────────────────────
function seedAnswers(perDomain: number, accuracy: number): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === d.id)
      .slice(0, perDomain)
      .forEach((q, i) => {
        const right = i < Math.round(perDomain * accuracy);
        out[q.id] = { attempts: 1, correctCount: right ? 1 : 0, lastCorrect: right, lastAt: Date.now() - DAY };
      });
  }
  return out;
}
const today = () => dayKey(Date.now());

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
    useProgress.setState((s) => ({ plantSettings: { promptHidden: true }, days: {}, byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, moments: undefined } } }));
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: addDays(today(), 6) } });
  jest.mocked(router.push).mockClear();
});

describe('the store and backups', () => {
  it('ticks and Hide save per exam date; a Reset keeps them (they are about the exam, not study)', () => {
    const date = addDays(today(), 6);
    act(() => {
      useProgress.getState().tickExamWeek('cisa', date, 'booking');
      useProgress.getState().tickExamWeek('cisa', date, 'sleep');
      useProgress.getState().hideExamWeek('cisa', date);
    });
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: date, done: ['booking', 'sleep'], hidden: true });
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: date, done: ['booking', 'sleep'], hidden: true });
  });

  it('round-trips a backup exactly; an unknown id in a file is dropped, not refused', () => {
    const date = addDays(today(), 6);
    act(() => {
      useProgress.getState().tickExamWeek('cisa', date, 'pace');
      useProgress.getState().tickExamWeek('cisa', date, 'guide');
    });
    const file = currentBackup(Date.now());
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.moments?.examWeek).toEqual({ for: date, done: ['guide', 'pace'] });
    const tampered = JSON.parse(JSON.stringify(file));
    tampered.stores.progress.state.byCert.cisa.moments.examWeek.done = ['pace', 'coffee', 'pace', 'sleep'];
    expect(readBackup(JSON.stringify(tampered), ['cisa']).progress.byCert.cisa.moments?.examWeek).toEqual({ for: date, done: ['pace', 'sleep'] });
  });

  it('a file from before 1.16 (no checklist) restores as a fresh list; a broken date is refused', () => {
    const file = currentBackup(Date.now());
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.moments?.examWeek).toBeUndefined();
    const bad = JSON.parse(JSON.stringify(file));
    bad.stores.progress.state.byCert.cisa.moments = { examWeek: { for: 'next week', done: [] } };
    expect(checkBackupText(JSON.stringify(bad)).kind).toBe('error');
  });
});

// ── Screens ──────────────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});
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
const hasCard = () => root().findAll((n) => n.props.testID === 'exam-week-card').length > 0;

describe('Today: the Exam week card', () => {
  it('shows from 7 to 2 days out, with the count; never before, on the eve or the day', () => {
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, answers: seedAnswers(10, 0.7) } } }));
    });
    for (const [d, shown] of [[9, false], [8, false], [7, true], [6, true], [2, true], [1, false], [0, false]] as const) {
      act(() => {
        useSettings.setState({ examDates: { cisa: addDays(today(), d) } });
        useProgress.setState({ days: {} });
      });
      mount(<Today />);
      expect([d, hasCard()]).toEqual([d, shown]);
      act(() => {
        r?.unmount();
      });
    }
  });

  it('"Open checklist" opens it; "Hide" hides it for this exam date and says where it went', () => {
    mount(<Today />);
    expect(allText()).toContain('A calm week. A short checklist, then light review.');
    expect(allText()).toContain('0 of 6 done');
    press(/^Open checklist$/);
    expect(router.push).toHaveBeenCalledWith('/exam-week');
    const spoken = jest.spyOn(require('react-native').AccessibilityInfo, 'announceForAccessibility');
    press(/^Hide this card/);
    flushSayLaterForTest();
    expect(hasCard()).toBe(false);
    expect(spoken).toHaveBeenCalledWith('Hidden. The checklist stays in your readiness report.');
    // Moving the exam date shows it again (a fresh list for the new date).
    act(() => {
      useSettings.setState({ examDates: { cisa: addDays(today(), 5) } });
    });
    expect(hasCard()).toBe(true);
  });

  it('never red, never "overdue", never a notification word', () => {
    mount(<Today />);
    expect(allText()).not.toMatch(/overdue|late|missed|behind|reminder/i);
  });
});

describe('the Exam week screen', () => {
  const boxes = () => root().findAll((n) => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function');

  it('six checkbox rows (48pt+), ticked by tap, saved for this exam date', () => {
    mount(<ExamWeekScreen />);
    expect(boxes()).toHaveLength(6);
    expect(allText()).toContain('Use this week to settle in, not to cram.');
    act(() => {
      boxes()[0].props.onPress();
    });
    act(() => {
      boxes()[4].props.onPress();
    });
    expect(boxes().map((b) => b.props.accessibilityState.checked)).toEqual([true, false, false, false, true, false]);
    expect(allText()).toContain('2 of 6 done');
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: addDays(today(), 6), done: ['booking', 'pace'] });
    // The whole row is the target: the shared list-row style is at least 64pt tall.
    const flat = Object.assign({}, ...[boxes()[0].props.style].flat(3).filter(Boolean));
    expect(flat.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('"If you blank", and a link to the readiness report; no affiliation, no links out', () => {
    mount(<ExamWeekScreen />);
    expect(allText()).toContain('Breathe out slowly, flag the question and move on.');
    press(/^See your readiness report$/);
    expect(router.push).toHaveBeenCalledWith('/readiness');
    expect(allText()).not.toMatch(/ISACA says|official site|https?:/i);
  });

  it('no exam date: asks for one instead of a list it can’t save', () => {
    useSettings.setState({ examDates: {} });
    mount(<ExamWeekScreen />);
    expect(boxes()).toHaveLength(0);
    expect(allText()).toContain('Set your exam date first');
  });
});
