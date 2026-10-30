/**
 * QA for PR #47, mobile 1.16.0 "Proof" (PHASE5.md §3). Journeys:
 *   1. The readiness report: no data, one mock, many mocks (cap at 10),
 *      rising / falling / level trend words, each "raise your low end"
 *      action starts the right session, a past mock opens on tap, and a
 *      `?mock=` deep link with a bad id is harmless.
 *   2. The ways in: Today's readiness words, You ("See your readiness
 *      report", "See report", each mock row), the exam-week screen. The
 *      plant on Today still opens Your plant.
 *   3. Exam week: the Today card only 7…2 days out; ticks persist per exam
 *      date; a new exam date is a fresh checklist; the taper plans (an
 *      optional full mock that never leads; no mock from 4 days out).
 *   4. Backups: a round-trip with a checklist, a tampered checklist repaired,
 *      a Reset keeps the checklist.
 *   5. Practice's hero sized from the daily minutes; a chosen length wins.
 *   6. Copy: never a pass prediction, never the bank size.
 *
 * Final review week (Oct 2026): CISA now has a final-week plan, which turns
 * the exam-week card, screen and report row into the plan (8 days out to the
 * eve; final-week-screens.test.tsx). The checklist journeys below switch the
 * plan off (getFinalWeek → null): that checklist-only path is what an exam
 * without a plan still gets, and it must behave exactly as before.
 *
 * The three bugs QA found (B1, B2: a junk or missing checklist list refused
 * the whole backup; B3: "NaN%" on You for a 0-question mock) are fixed and
 * the tests here now assert the fixed behaviour ("Fixed (QA Bn)").
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Practice from '../app/(tabs)/practice';
import You from '../app/(tabs)/you';
import ExamWeekScreen from '../app/exam-week';
import ReadinessReport from '../app/readiness';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { planText } from '../components/journey';
import { getCertification } from '../content/certifications';
import * as examContent from '../content/exam';
import { getAllQuestions } from '../content/loader';
import { readBackup } from '../engine/backup';
import { addDays } from '../engine/examDay';
import { examWeekCardDue, examWeekOf, toggleExamWeek } from '../engine/examWeek';
import { DAILY_MINUTES, planTolerance } from '../engine/fit';
import { EXAM_WEEK_LIGHT_MINUTES, planMinutes, todaysPlan, type PlanInput } from '../engine/planner';
import type { AnswerRecord } from '../engine/readiness';
import { mockTrend, trendWords, TREND_MAX } from '../engine/readinessReport';
import { dayKey } from '../engine/streak';
import { sessionSize } from '../engine/studyModes';
import { studyFor } from '../lib/badges';
import { checkBackupText, currentBackup } from '../lib/backup';
import { selectCert, useProgress, type MockResult } from '../store/progress';
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
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const cisa = getCertification('cisa')!;
const DAY = 86_400_000;
const today = () => dayKey(Date.now());

function seedAnswers(perDomain: number, accuracy: number, skip: string[] = []): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    if (skip.includes(d.id)) continue;
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
const mock = (id: string, daysAgo: number, total: number, pct: number, extra: Partial<MockResult> = {}): MockResult => ({
  id,
  finishedAt: Date.now() - daysAgo * DAY,
  total,
  correct: Math.round((pct / 100) * total),
  minutesUsed: total === 150 ? 226 : 74,
  byDomain: { '1': { total: 9, correct: 7 }, '4': { total: 13, correct: Math.round((pct / 100) * 13) } },
  timing: 'standard',
  medianSec: 88,
  unanswered: 0,
  ...extra,
});
/** `pcts` oldest → newest; saved newest first, as the store keeps them. */
const series = (pcts: number[], total = 50) => pcts.map((p, i) => mock(`q${i}`, (pcts.length - i) * 3, total, p)).reverse();

const setCert = (cp: Record<string, unknown>) =>
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, ...cp } } }));
  });

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
const allWords = () =>
  [
    allText(),
    ...root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string),
    ...root().findAll((n) => typeof n.props.accessibilityHint === 'string').map((n) => n.props.accessibilityHint as string),
  ].join(' ');
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const opened = () => root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('mock-domains-') && typeof n.type === 'string');

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
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: addDays(today(), 40) } });
  jest.mocked(router.push).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

// ── 1. The readiness report ──────────────────────────────────────────────
describe('QA 1: the readiness report in every state', () => {
  it('no data at all: the honest framing, "Not enough data yet", no mocks, no low line, and only the unlock action', () => {
    mount(<ReadinessReport />);
    const t = allText();
    expect(t).toContain('Not enough data yet');
    expect(t).toMatch(/\d+ more answers until your readiness range/);
    expect(t).toContain('A study estimate, not a prediction.');
    expect(t).toContain('No mocks yet');
    expect(t).toContain('This fills in as you study on more days.');
    expect(t).not.toContain('Your mocks');
    expect(byTestID('raise-unlock')).toHaveLength(1);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && /^raise-/.test(n.props.testID) && typeof n.type === 'string')).toHaveLength(1);
    // Domain rows still show; with no answers each says so, never "0%" (UX review H2).
    expect(t.match(/No answers here yet/g)).toHaveLength(cisa.domains.length);
    expect(t.match(/not started yet/g)).toHaveLength(cisa.domains.length);
    expect(t).not.toMatch(/domain readiness 0%/);
    // Before there is a range, the headings say what gets one (UX review P3).
    expect(t).toContain('What your range will be');
    expect(t).toContain('What gets you a range');
    expect(t).not.toContain('What would raise your low end');
    // "Start a mini mock" opens the timing choices for a third of the exam.
    press(/^Start a mini mock$/);
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/mock-start', params: { questions: '50' } });
  });

  it('one mock: its score and kind, no trend words, its row folded', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: [mock('only', 2, 150, 71)] });
    mount(<ReadinessReport />);
    const t = allText();
    expect(t).toContain('Full mock · ');
    expect(t).not.toMatch(/Up \d+ points|About level|Down \d+ points/);
    expect(byTestID('mock-only')).toHaveLength(1);
    expect(opened()).toHaveLength(0);
  });

  it('many mocks (14): the trend shows the newest 10, oldest first; every mock is still listed', () => {
    const pcts = [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66];
    setCert({ answers: seedAnswers(30, 0.7), mocks: series(pcts) });
    mount(<ReadinessReport />);
    const newest10 = pcts.slice(-TREND_MAX);
    expect(allText()).toContain(`Oldest first: ${newest10.map((p) => `${p}%`).join(' · ')}`);
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`Your last ${TREND_MAX} mocks, oldest first, in percent: ${newest10.map((p) => `${p} mini`).join(', ')}.`) && typeof n.type === 'string')).toHaveLength(1);
    // The newest 5 are listed; "Show all 14 mocks" lists every one (UX review P8).
    expect(root().findAll((n) => typeof n.props.testID === 'string' && /^mock-q\d+$/.test(n.props.testID) && typeof n.type === 'string')).toHaveLength(5);
    press(/^Show all 14 mocks$/);
    for (let i = 0; i < pcts.length; i++) expect(byTestID(`mock-q${i}`)).toHaveLength(1);
  });

  it.each([
    ['rising', [60, 64, 70], 'Up 10 points over your last 3 mocks.', 50],
    // A fall since the last mock is said first (code review M1).
    ['falling', [72, 70, 66], 'Down 4 points since your last mock. One mock can swing; look at the domains below.', 50],
    ['falling over 3 (each step small)', [72, 70, 68], 'Down 4 points over your last 3 mocks. One mock can swing; look at the domains below.', 50],
    ['a rise, then a fall', [60, 70, 62], 'Down 8 points since your last mock. One mock can swing; look at the domains below.', 50],
    ['level (+2)', [60, 63, 62], 'About level over your last 3 mocks.', 50],
    ['level (−2)', [62, 50, 60], 'About level over your last 3 mocks.', 50],
    ['just past level (+3)', [60, 40, 63], 'Up 3 points over your last 3 mocks.', 150],
    ['two mocks, falling', [70, 66], 'Down 4 points since your last mock. One mock can swing; look at the domains below.', 50],
    ['two mocks, rising', [50, 56], 'Up 6 points since your last mock.', 50],
  ] as [string, number[], string, number][])('%s: the trend in words, on screen and spoken', (_, pcts, words, total) => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: series(pcts, total) });
    mount(<ReadinessReport />);
    expect(allText()).toContain(words);
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.endsWith(words) && typeof n.type === 'string')).toHaveLength(1);
  });

  it('the trend compares the newest with the one before, then the third newest, whatever order the mocks were saved in', () => {
    const shuffledSave = [mock('b', 6, 50, 64), mock('c', 3, 50, 70), mock('a', 9, 50, 60)];
    expect(trendWords(mockTrend(shuffledSave, 150))).toBe('Up 10 points over your last 3 mocks.');
  });
});

describe('QA 1: what would raise the low end, each button', () => {
  const sessionTitle = () => useSession.getState().active?.title;

  it('not enough data: "Practice a mixed set" starts a mixed session sized from the minutes', () => {
    useSettings.setState({ dailyMinutes: 30 });
    setCert({ answers: seedAnswers(2, 0.5) });
    mount(<ReadinessReport />);
    press(/^Practice a mixed set$/);
    expect(router.push).toHaveBeenLastCalledWith('/session');
    expect(useSession.getState().active?.questionIds).toHaveLength(20);
  });

  it('a thin domain, then the focus domain ("Weak spots"), then the reviews; each starts its own session', () => {
    // Domain 3 thin (3 answers); domain 4 weakest of the rest (weighted most to gain); 4 reviews due.
    const answers = seedAnswers(30, 0.8);
    for (const id of Object.keys(answers).filter((k) => k.startsWith('d3_')).slice(3)) delete answers[id];
    for (const id of Object.keys(answers).filter((k) => k.startsWith('d4_'))) answers[id] = { ...answers[id], correctCount: 0, lastCorrect: false };
    const review = Object.fromEntries(Object.keys(answers).slice(0, 4).map((id) => [id, { box: 1, dueAt: Date.now() - 3600_000, lastSeen: Date.now() - DAY, reps: 1 }]));
    setCert({ answers, review });
    mount(<ReadinessReport />);
    const kinds = root().findAll((n) => typeof n.props.testID === 'string' && /^raise-/.test(n.props.testID) && typeof n.type === 'string').map((n) => n.props.testID);
    expect(kinds).toEqual(['raise-answer', 'raise-focus', 'raise-review']);
    expect(allText()).toContain('Answer 7 more in IS Acquisition to firm up your range');
    expect(allText()).toContain('IS Operations has the most to gain: 26% of the exam');
    expect(allText()).toContain('Clear 4 reviews: revisiting steadies your range');

    press(/^Practice IS Acquisition$/);
    expect(sessionTitle()).toBe('IS Acquisition');
    const s1 = useSession.getState().active!;
    expect(s1.questionIds.every((id) => id.startsWith('d3_'))).toBe(true);
    act(() => {
      useSession.getState().clear();
    });

    press(/^Practice weak spots$/);
    expect(sessionTitle()).toBe('Weak spots: IS Operations');
    expect(useSession.getState().active!.questionIds.every((id) => id.startsWith('d4_'))).toBe(true);
    act(() => {
      useSession.getState().clear();
    });

    press(/^Start review$/);
    expect(useSession.getState().active).toMatchObject({ mode: 'review' });
    expect(useSession.getState().active!.questionIds).toHaveLength(4);
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('nothing stands out: the steady-mix line, with no button', () => {
    setCert({ answers: seedAnswers(30, 1) });
    mount(<ReadinessReport />);
    expect(byTestID('raise-mix')).toHaveLength(1);
    expect(allText()).toContain('Keep a steady mix: reviews first, then your weakest domain.');
    expect(byTestID('raise-mix')[0].findAll((n) => typeof n.props.onPress === 'function')).toHaveLength(0);
  });
});

describe('QA 1: past mocks open, and ?mock= deep links', () => {
  const FIVE = series([60, 62, 64, 66, 68]);

  it('a tap on a past mock opens its domains; a second tap closes it', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: FIVE });
    mount(<ReadinessReport />);
    press(/^50 questions, score 60 percent/);
    expect(opened().map((n) => n.props.testID)).toEqual(['mock-domains-q0']);
    press(/^50 questions, score 60 percent/);
    expect(opened()).toHaveLength(0);
  });

  it('?mock=<a real id> opens that mock and only that one', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: FIVE });
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: 'q2' });
    mount(<ReadinessReport />);
    expect(opened().map((n) => n.props.testID)).toEqual(['mock-domains-q2']);
  });

  it('?mock=<an id that does not exist>: no crash, nothing opened, the rest of the report intact', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: FIVE });
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: 'deleted-or-bogus' });
    mount(<ReadinessReport />);
    expect(opened()).toHaveLength(0);
    expect(allText()).toContain('Your mocks');
    expect(allText()).toContain('Domain by domain');
    // The real mocks still open by tap.
    press(/^50 questions, score 68 percent/);
    expect(opened().map((n) => n.props.testID)).toEqual(['mock-domains-q4']);
  });

  it('?mock= with no mocks at all (after a Reset): the empty state, no crash', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: 'q1' });
    mount(<ReadinessReport />);
    expect(allText()).toContain('No mocks yet');
    expect(opened()).toHaveLength(0);
  });
});

// ── 2. The ways in ───────────────────────────────────────────────────────
describe('QA 2: entry points', () => {
  it('Today: the readiness words open the report; with a plant, the plant still opens Your plant', () => {
    setCert({ answers: seedAnswers(30, 0.7), plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - 3 * DAY, growth: 2 } });
    mount(<Today />);
    const words = root().findAll((n) => n.props.testID === 'readiness-tap' && typeof n.props.onPress === 'function')[0];
    act(() => {
      words.props.onPress();
    });
    expect(router.push).toHaveBeenLastCalledWith('/readiness');
    // The plant is NOT inside the report's tap target (two separate stops).
    expect(words.findAll((n) => n.props.testID === 'today-plant')).toHaveLength(0);
    const plant = root().findAll((n) => n.props.testID === 'today-plant' && typeof n.props.onPress === 'function')[0];
    expect(plant).toBeDefined();
    act(() => {
      plant.props.onPress();
    });
    expect(router.push).toHaveBeenLastCalledWith('/plant');
  });

  it('You: "See report" on the Readiness section (mobile 1.21: the one way in, no duplicate on Mock exams), and a mock row with its id', () => {
    const mocks = series([60, 66]);
    setCert({ answers: seedAnswers(30, 0.7), mocks });
    mount(<You />);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'See report, your readiness report' && typeof n.type === 'string')).toHaveLength(1);
    const handlers = [...new Set(root().findAll((n) => n.props.accessibilityLabel === 'See report, your readiness report' && typeof n.props.onPress === 'function').map((n) => n.props.onPress as () => void))];
    expect(handlers.length).toBeGreaterThanOrEqual(1);
    for (const onPress of handlers) {
      jest.mocked(router.push).mockClear();
      act(() => {
        onPress();
      });
      expect(router.push).toHaveBeenCalledWith('/readiness');
    }
    const rows = root().findAll((n) => n.props.accessibilityHint === 'Opens your readiness report with this mock’s domains' && typeof n.props.onPress === 'function' && typeof n.props.title === 'string');
    expect(rows).toHaveLength(2);
    act(() => {
      rows[0].props.onPress();
    });
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/readiness', params: { mock: mocks[0].id } });
  });

  it('a restored mock with 0 questions: the report and You both say 0%, never NaN', () => {
    // A backup may hold a mock with total 0 (backup.ts mockResult: total is `count`, 0 allowed).
    setCert({ answers: seedAnswers(30, 0.7), mocks: [mock('empty', 1, 0, 0, { correct: 0, byDomain: {} })] });
    mount(<ReadinessReport />);
    expect(allText()).not.toContain('NaN');
    unmount();
    mount(<You />);
    // Fixed (QA B3): You uses mockPct(), like the report.
    expect(allWords()).not.toContain('NaN');
    expect(allWords()).toContain('score 0 percent');
    expect(allText()).toContain('0%');
  });

  it('the exam-week screen links to the report; the report links back to the checklist in exam week', () => {
    // The checklist-only path (an exam without a final-week plan; see the header).
    jest.spyOn(examContent, 'getFinalWeek').mockReturnValue(null);
    useSettings.setState({ examDates: { cisa: addDays(today(), 5) } });
    mount(<ExamWeekScreen />);
    press(/^See your readiness report$/);
    expect(router.push).toHaveBeenLastCalledWith('/readiness');
    unmount();
    mount(<ReadinessReport />);
    press(/^Exam-week checklist/);
    expect(router.push).toHaveBeenLastCalledWith('/exam-week');
  });

  it('the report shows no checklist link outside exam week', () => {
    mount(<ReadinessReport />);
    expect(allText()).not.toContain('Exam-week checklist');
  });
});

// ── 3. Exam week ─────────────────────────────────────────────────────────
describe('QA 3: the Today card and the checklist', () => {
  // The checklist-only path (an exam without a final-week plan; see the header). Restored after each test.
  beforeEach(() => {
    jest.spyOn(examContent, 'getFinalWeek').mockReturnValue(null);
  });
  const hasCard = () => root().findAll((n) => n.props.testID === 'exam-week-card').length > 0;

  it('the card shows only from 7 to 2 days out (engine, every day from 10 to −3)', () => {
    const date = '2026-10-20';
    expect([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -3].map((d) => examWeekCardDue(d, undefined, date))).toEqual([
      false, false, false, true, true, true, true, true, true, false, false, false, false,
    ]);
  });

  it('on Today: 8 out no card; 3 out the card; the eve no card', () => {
    setCert({ answers: seedAnswers(10, 0.7) });
    for (const [d, shown] of [[8, false], [3, true], [1, false]] as const) {
      act(() => {
        useSettings.setState({ examDates: { cisa: addDays(today(), d) } });
        useProgress.setState({ days: {} });
      });
      mount(<Today />);
      expect([d, hasCard()]).toEqual([d, shown]);
      unmount();
    }
  });

  it('ticks persist per exam date (re-mount reads them back); a new date is a fresh list; the old date’s ticks come back with it', () => {
    const d1 = addDays(today(), 6);
    const d2 = addDays(today(), 4);
    useSettings.setState({ examDates: { cisa: d1 } });
    mount(<ExamWeekScreen />);
    const boxes = () => root().findAll((n) => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function');
    act(() => {
      boxes()[1].props.onPress();
    });
    act(() => {
      boxes()[5].props.onPress();
    });
    unmount();
    mount(<ExamWeekScreen />);
    expect(boxes().map((b) => b.props.accessibilityState.checked)).toEqual([false, true, false, false, false, true]);
    expect(allText()).toContain('2 of 5 done');
    // Move the exam date: fresh.
    act(() => {
      useSettings.setState({ examDates: { cisa: d2 } });
    });
    expect(boxes().every((b) => b.props.accessibilityState.checked === false)).toBe(true);
    expect(allText()).toContain('0 of 5 done');
    // Move it back without ticking anything: the old ticks were kept under the old date.
    act(() => {
      useSettings.setState({ examDates: { cisa: d1 } });
    });
    expect(allText()).toContain('2 of 5 done');
    // A tick on a NEW date replaces the old list (only one date is kept).
    act(() => {
      useSettings.setState({ examDates: { cisa: d2 } });
    });
    act(() => {
      boxes()[0].props.onPress();
    });
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: d2, done: ['booking'] });
    act(() => {
      useSettings.setState({ examDates: { cisa: d1 } });
    });
    expect(allText()).toContain('0 of 5 done');
  });

  it('the Today card counts ticks for this date; Hide hides it, and a new date shows it again', () => {
    const d1 = addDays(today(), 6);
    useSettings.setState({ examDates: { cisa: d1 } });
    act(() => {
      useProgress.getState().tickExamWeek('cisa', d1, 'guide');
      useProgress.getState().tickExamWeek('cisa', d1, 'pace');
    });
    mount(<Today />);
    expect(allText()).toContain('2 of 5 done');
    press(/^Hide this card/);
    expect(hasCard()).toBe(false);
    // The ticks survive the Hide.
    expect(examWeekOf(selectCert(useProgress.getState(), 'cisa').moments?.examWeek, d1)).toEqual({ done: ['guide', 'pace'], hidden: true });
    act(() => {
      useSettings.setState({ examDates: { cisa: addDays(today(), 5) } });
    });
    expect(hasCard()).toBe(true);
    expect(allText()).toContain('0 of 5 done');
  });
});

describe('QA 3: the exam-week taper plans', () => {
  const NOW = new Date(2026, 9, 12, 9).getTime();
  const plan = (daysLeft: number, p: Partial<PlanInput> = {}) =>
    todaysPlan({
      stage: 'examDay',
      dueReviews: 0,
      dailyMinutes: 30,
      answered: 300,
      focusDomain: { id: '4', short: 'IS Operations' },
      daysLeft,
      examQuestions: 150,
      examMinutes: 240,
      lastFullMockAt: null,
      lastMockAt: null,
      now: NOW,
      ...p,
    });

  it('7…5 days out: at most one mock, always a FULL one, optional in its words, never first', () => {
    for (const d of [7, 6, 5]) {
      for (const m of [...DAILY_MINUTES, 5]) {
        for (const due of [0, 8, 80]) {
          const items = plan(d, { dailyMinutes: m, dueReviews: due });
          const mocks = items.filter((i) => i.kind === 'mock');
          expect(mocks).toHaveLength(1);
          expect(mocks[0]).toMatchObject({ questions: 150, why: 'final' });
          expect(items[0].kind).not.toBe('mock');
          expect(planText(mocks[0]).meta).toBe('About 4 h · a last long rehearsal; skip it if you’d rather rest');
        }
      }
    }
  });

  it('7…5 days out: an Exam-focused learner gets no weekly MINI mock (only the full-mock rule applies)', () => {
    for (const d of [7, 6, 5]) {
      const items = plan(d, { examFocused: true, familiarity: 'experienced', lastFullMockAt: NOW - 3 * DAY, lastMockAt: NOW - 30 * DAY });
      expect(items.filter((i) => i.kind === 'mock')).toEqual([]);
    }
  });

  it('4…2 days out: never a mock (even with no full mock ever), and the day fits min(minutes, 20)', () => {
    for (const d of [4, 3, 2]) {
      for (const m of [...DAILY_MINUTES, 60]) {
        for (const due of [0, 8, 80]) {
          for (const examFocused of [false, true]) {
            const items = plan(d, { dailyMinutes: m, dueReviews: due, examFocused });
            expect(items.some((i) => i.kind === 'mock')).toBe(false);
            const L = Math.min(m, EXAM_WEEK_LIGHT_MINUTES);
            expect(planMinutes(items)).toBeLessThanOrEqual(L + planTolerance(L));
            expect(items.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('on Today 6 days out: the top-up leads (the hero), the full mock follows as optional', () => {
    useSettings.setState({ examDates: { cisa: addDays(today(), 6) }, dailyMinutes: 30 });
    setCert({ answers: seedAnswers(30, 0.7) });
    mount(<Today />);
    const t = allText();
    // The caption gives the day's minutes; the mock's own row says it is optional (UX review O9; mobile 1.21).
    expect(t).toContain('Today’s plan · about\u00A030\u00A0min');
    // While the mock sits in "Also today" its row reads "Optional this week · about 4 h";
    // the "a last long rehearsal; skip it if you’d rather rest" meta only shows once it
    // becomes the hero (after the top-up). Observation, not a bug: both say optional.
    expect(t).toContain('Full mock Optional this week · about 4 h');
    expect(t).not.toContain('a last long rehearsal');
    expect(t.indexOf('Top-up:')).toBeGreaterThanOrEqual(0);
    expect(t.indexOf('Top-up:')).toBeLessThan(t.indexOf('Full mock'));
  });

  it('on Today 3 days out: no mock row at all', () => {
    useSettings.setState({ examDates: { cisa: addDays(today(), 3) }, dailyMinutes: 45 });
    setCert({ answers: seedAnswers(30, 0.7) });
    mount(<Today />);
    expect(allText()).not.toMatch(/Full mock|Mini mock/);
  });
});

// ── 4. Backups and Reset ─────────────────────────────────────────────────
describe('QA 4: the checklist in backups, and Reset', () => {
  const date = () => addDays(today(), 6);

  it('round-trip: a ticked, hidden checklist reads back exactly', () => {
    act(() => {
      useProgress.getState().tickExamWeek('cisa', date(), 'sleep');
      useProgress.getState().tickExamWeek('cisa', date(), 'booking');
      useProgress.getState().hideExamWeek('cisa', date());
    });
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.moments?.examWeek).toEqual({ for: date(), done: ['booking', 'sleep'], hidden: true });
  });

  it('a tampered checklist is repaired: unknown and repeated ids dropped, order restored, unknown keys ignored', () => {
    act(() => {
      useProgress.getState().tickExamWeek('cisa', date(), 'pace');
    });
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    file.stores.progress.state.byCert.cisa.moments.examWeek = { for: date(), done: ['sleep', 'nap', 'booking', 'sleep', 'BOOKING'], hidden: false, extra: 'x' };
    const back = readBackup(JSON.stringify(file), ['cisa']).progress.byCert.cisa.moments?.examWeek;
    expect(back).toEqual({ for: date(), done: ['booking', 'sleep'], hidden: false });
    expect(examWeekOf(back, date())).toEqual({ done: ['booking', 'sleep'], hidden: false });
  });

  it('a checklist whose "done" holds a non-string: the junk is dropped and the file restores', () => {
    act(() => {
      useProgress.getState().tickExamWeek('cisa', date(), 'pace');
    });
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    file.stores.progress.state.byCert.cisa.moments.examWeek.done = ['pace', 7, null, { id: 'sleep' }];
    // Fixed (QA B1): one checklist value never refuses the learner's whole backup.
    expect(checkBackupText(JSON.stringify(file)).kind).not.toBe('error');
    expect(readBackup(JSON.stringify(file), ['cisa']).progress.byCert.cisa.moments?.examWeek).toEqual({ for: date(), done: ['pace'] });
  });

  it('a checklist with a long junk "done" list still restores, with only the known ids', () => {
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    file.stores.progress.state.byCert.cisa.moments = { examWeek: { for: date(), done: [...Array.from({ length: 40 }, (_, i) => `x${i}`), 'sleep', 'guide'] } };
    expect(readBackup(JSON.stringify(file), ['cisa']).progress.byCert.cisa.moments?.examWeek).toEqual({ for: date(), done: ['guide', 'sleep'] });
  });

  it('a checklist with no "done" list (or a broken one) restores as an empty list', () => {
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    file.stores.progress.state.byCert.cisa.moments = { examWeek: { for: date(), hidden: true } };
    // Fixed (QA B2): PHASE5.md §3.2 makes `done` optional; a missing list reads as [].
    expect(checkBackupText(JSON.stringify(file)).kind).not.toBe('error');
    expect(readBackup(JSON.stringify(file), ['cisa']).progress.byCert.cisa.moments?.examWeek).toEqual({ for: date(), done: [], hidden: true });
    file.stores.progress.state.byCert.cisa.moments = { examWeek: { for: date(), done: 'pace' } };
    expect(readBackup(JSON.stringify(file), ['cisa']).progress.byCert.cisa.moments?.examWeek).toEqual({ for: date(), done: [] });
  });

  it('Reset progress keeps the checklist (ticks and Hide), and Today still honours the Hide', () => {
    useSettings.setState({ examDates: { cisa: date() } });
    act(() => {
      useProgress.getState().tickExamWeek('cisa', date(), 'guide');
      useProgress.getState().hideExamWeek('cisa', date());
      useProgress.getState().resetCert('cisa');
    });
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: date(), done: ['guide'], hidden: true });
    // Everything else is fresh.
    expect(selectCert(useProgress.getState(), 'cisa').mocks).toEqual([]);
    expect(selectCert(useProgress.getState(), 'cisa').moments?.readiness).toBeUndefined();
    mount(<ExamWeekScreen />);
    expect(allText()).toContain('1 of 5 done');
    unmount();
    mount(<Today />);
    expect(root().findAll((n) => n.props.testID === 'exam-week-card')).toHaveLength(0);
  });

  it('Reset after the report: the report reads as fresh (empty states)', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: series([60, 64, 70]) });
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    mount(<ReadinessReport />);
    expect(allText()).toContain('Not enough data yet');
    expect(allText()).toContain('No mocks yet');
  });

  it('engine: toggling on a stale date never resurrects the stale ticks', () => {
    const s = toggleExamWeek({ for: '2026-01-01', done: ['booking', 'guide'], hidden: true }, '2026-02-01', 'sleep');
    expect(s).toEqual({ for: '2026-02-01', done: ['sleep'] });
  });
});

// ── 5. Practice's hero ───────────────────────────────────────────────────
describe('QA 5: Practice sized from the minutes; a chosen length wins', () => {
  it.each([
    [10, 10],
    [20, 10],
    [30, 20],
    [45, 20],
  ])('%i minutes a day, no length chosen: the hero is %i questions', (minutes, n) => {
    useSettings.setState({ familiarity: 'some', studyMode: 'smart', studySize: undefined, dailyMinutes: minutes as never });
    mount(<Practice />);
    // Mobile 1.21: the hero title never holds a count; the count leads its meta line.
    expect(allText()).toContain(`Picked for you ${n} questions · `);
  });

  it.each([10, 20, 50])('a chosen length (%i) wins at every minutes setting', (size) => {
    for (const minutes of DAILY_MINUTES) {
      useSettings.setState({ familiarity: 'some', studyMode: 'smart', studySize: size, dailyMinutes: minutes });
      mount(<Practice />);
      expect(allText()).toContain(`Picked for you ${size} questions · `);
      unmount();
    }
  });

  it('an old save with only a daily goal (no minutes) still sizes sensibly', () => {
    useSettings.setState({ familiarity: 'some', studyMode: 'smart', studySize: undefined, dailyMinutes: undefined, dailyGoal: 40 } as never);
    mount(<Practice />);
    expect(allText()).toMatch(/Picked for you (10|20) questions · /);
  });

  it('Start uses the same size the hero shows', () => {
    useSettings.setState({ familiarity: 'some', studyMode: 'smart', studySize: undefined, dailyMinutes: 30 });
    setCert({ answers: seedAnswers(10, 0.7) });
    mount(<Practice />);
    press(/^Start/);
    expect(useSession.getState().active?.questionIds).toHaveLength(20);
  });

  it('the badge "study for" path uses the same minutes-based size', () => {
    useSettings.setState({ studySize: undefined, dailyMinutes: 30 });
    expect(sessionSize(undefined, 30)).toBe(20);
    studyFor({ kind: 'smart' }, 'cisa', 0);
    expect(useSession.getState().active?.questionIds).toHaveLength(20);
  });
});

// ── 6. Honest copy ───────────────────────────────────────────────────────
describe('QA 6: never a pass prediction, never the bank size', () => {
  const BANNED = /\bpass\b|\bpasses\b|\bpassed\b|\bfail|guarantee|predict your score|will pass|chance of passing|likely to pass|forecast/i;
  const bank = getAllQuestions('cisa').length;
  const domainBank = cisa.domains.map((d) => getAllQuestions('cisa').filter((q) => q.domainId === d.id).length);
  const scan = () => {
    const words = allWords().split(cisa.exam.passingNote).join(' ');
    expect(words).not.toMatch(BANNED);
    expect(words).not.toMatch(new RegExp(`\\b${bank}\\b`));
    expect(words).not.toMatch(/questions in this domain|of \d{3,} questions|\d{3,} questions in/i);
    for (const n of domainBank) expect(words).not.toMatch(new RegExp(`of ${n}\\b(?! ?%)`));
  };

  it('the report in the many-mocks, falling and exam-week states', () => {
    useSettings.setState({ examDates: { cisa: addDays(today(), 4) } });
    setCert({ answers: seedAnswers(30, 0.5), mocks: series([72, 70, 50, 48, 46, 44, 60, 58, 56, 54, 52, 50], 150) });
    mount(<ReadinessReport />);
    scan();
    // The passing note appears exactly once, next to "Practice scores are not scaled exam scores."
    expect(allText().split(cisa.exam.passingNote)).toHaveLength(2);
    expect(allText()).toContain(`Practice scores are not scaled exam scores. ${cisa.exam.passingNote}`);
  });

  it('Today in exam week (card and full-mock row), the exam-week screen and You', () => {
    useSettings.setState({ examDates: { cisa: addDays(today(), 6) } });
    setCert({ answers: seedAnswers(30, 0.7), mocks: series([60, 64]) });
    mount(<Today />);
    scan();
    unmount();
    mount(<ExamWeekScreen />);
    scan();
    unmount();
    mount(<You />);
    scan();
  });
});
