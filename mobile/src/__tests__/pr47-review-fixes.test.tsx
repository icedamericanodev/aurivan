/**
 * PR #47 review fixes (mobile 1.16 "Proof"): the code review (CR_47), the
 * UX review (UX_47) and the code review's probes (P1–P8), ported as tests.
 * - Honest numbers: a recent fall is said plainly (M1); a 0-answer domain
 *   never reads "0%" (H2); a 0-question mock never reads "NaN" (M2).
 * - Large text: an open mock's domain names never break mid-word (H1).
 * - Exam week: a mini mock never ticks the full rehearsal (M4); "Hide" moves
 *   focus to the next heading (M3b); reviews read "Light review" (P6); the
 *   hero says the mock is optional (O9); online/centre is one slot (P4).
 * - The report: the newest 5 mocks then "Show all" (P8); a deep link to an
 *   older mock shows all; an array or unknown `?mock=` opens nothing (M5a);
 *   untimed is a dashed outline (O2); the checklist sits under the framing
 *   (O6); a hairline closes an open mock (O10).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { Path } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import ReadinessReport, { MOCKS_SHOWN } from '../app/readiness';
import { todayMinutes } from '../components/journey';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { activityMatches } from '../engine/dayPlan';
import { addDays } from '../engine/examDay';
import { EXAM_WEEK_SLOTS, examWeekCount, examWeekDoneSlots } from '../engine/examWeek';
import { todaysPlan, type PlanItem } from '../engine/planner';
import type { AnswerRecord } from '../engine/readiness';
import { mockTrend, MIXED_NOTE, trendWords } from '../engine/readinessReport';
import { dayKey } from '../engine/streak';
import { useProgress, type MockResult } from '../store/progress';
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
// Focus moves are asserted by the ref they target (the test renderer has no native views).
const mockMoveFocus = jest.fn();
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: (...a: unknown[]) => mockMoveFocus(...a) }));

const cisa = getCertification('cisa')!;
const DAY = 86_400_000;
const today = () => dayKey(Date.now());

function seedAnswers(perDomain: number, accuracy: number, domains = cisa.domains.map((d) => d.id)): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const id of domains) {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === id)
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
  byDomain: { '1': { total: 9, correct: 8 }, '4': { total: 13, correct: Math.round((pct / 100) * 13) } },
  timing: 'standard',
  medianSec: 88,
  unanswered: 0,
  ...extra,
});
/** Eight mocks, newest first (as the store keeps them): m7 … m0. m1 is untimed; m2 and m5 are full. */
const EIGHT = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => mock(`m${i}`, 40 - i * 5, i % 3 === 2 ? 150 : 50, 56 + i * 3, i === 1 ? { timing: 'untimed', medianSec: undefined } : {})).reverse();

const setCert = (cp: Record<string, unknown>) =>
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, ...cp } } }));
  });

let r: ReactTestRenderer | undefined;
/** Host refs get a fake node holding the element's props, so a focus target can be named. */
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el, { createNodeMock: (e) => ({ props: e.props }) });
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const allWords = () =>
  [allText(), ...root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string)].join(' ');
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const host = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const opened = () => root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('mock-domains-') && typeof n.type === 'string');
const flat = (style: unknown) => Object.assign({}, ...[style].flat(5).filter(Boolean)) as Record<string, unknown>;
/** The label of the node a focus move targeted. */
const focusedLabel = (call: unknown[] | undefined) => (call?.[0] as { current: { props: { accessibilityLabel?: string } } | null } | undefined)?.current?.props.accessibilityLabel;

const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 360, fontScale }, screen: { ...w, width: 360, fontScale } });
  });
};

beforeEach(() => {
  setFontScale(1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 30, examDates: { cisa: addDays(today(), 40) } });
  jest.mocked(router.push).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  mockMoveFocus.mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  setFontScale(1);
});

// ── Honest numbers ───────────────────────────────────────────────────────
describe('honest numbers', () => {
  it('M1: the trend says a recent fall plainly, on screen and spoken', () => {
    // 60 → 70 → 58: it once read "About level over your last 3 mocks."
    setCert({ answers: seedAnswers(30, 0.7), mocks: [mock('c', 1, 50, 58), mock('b', 5, 50, 70), mock('a', 9, 50, 60)] });
    mount(<ReadinessReport />);
    const words = 'Down 12 points since your last mock. One mock can swing; look at the domains below.';
    expect(allText()).toContain(words);
    expect(allWords()).toContain(`Your last 3 mocks, oldest first, in percent: 60 mini, 70 mini, 58 mini. ${words}`);
    expect(allText()).not.toContain('About level');
  });

  it('probe P5: a full mock after a mini says the fall, and that the kinds are mixed', () => {
    const t = mockTrend([mock('full', 1, 150, 60), mock('mini', 5, 50, 74)], 150);
    expect(trendWords(t)).toBe(`Down 14 points since your last mock. One mock can swing; look at the domains below. ${MIXED_NOTE}`);
  });

  it('H2: a domain with no answers says "Not started yet", never "0%", and draws an empty track', () => {
    setCert({ answers: seedAnswers(30, 0.7, ['2', '3', '4', '5']) });
    mount(<ReadinessReport />);
    const row = host('domain-row-1')[0];
    expect(row.props.accessibilityLabel).toBe('Domain 1, IS Audit, 18 percent of the exam. Not started yet.');
    const text = (() => {
      const out: string[] = [];
      const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
      walk(row);
      return out.join(' ');
    })();
    expect(text).toContain('18% of the exam · not started yet');
    expect(text).toContain('No answers here yet');
    expect(text).not.toMatch(/\b0%/);
    // The bar's track has no fill; an answered domain's does.
    expect(host('domain-bar-1')[0].children).toHaveLength(0);
    expect(host('domain-bar-2')[0].children).toHaveLength(1);
  });

  it('probe P2 / M2: a 0-question mock reads 0% on the report and on You, never NaN', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: [mock('zero', 1, 0, 0, { correct: 0, byDomain: {} })] });
    mount(<ReadinessReport />);
    expect(allWords()).not.toMatch(/NaN/);
    act(() => r!.unmount());
    mount(<You />);
    expect(allWords()).not.toMatch(/NaN/);
    expect(allWords()).toContain('0 questions, score 0 percent');
  });
});

// ── The report ───────────────────────────────────────────────────────────
describe('the readiness report', () => {
  it('H1: at large text an open mock drops its indent and puts the tally under the name; names may shrink, never break', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: 'm5' });
    setFontScale(2);
    mount(<ReadinessReport />);
    const box = host('mock-domains-m5')[0];
    expect(flat(box.props.style).paddingLeft).toBe(0);
    const rows = box.findAll((n) => n.props.accessible === true && typeof n.type === 'string');
    expect(rows).toHaveLength(cisa.domains.length);
    // A column (no row direction): the tally is under the name, lined up with it.
    expect(flat(rows[0].props.style).flexDirection).toBeUndefined();
    const texts = rows[0].findAll((n) => typeof n.type === 'string' && n.children.some((c) => typeof c === 'string'));
    const name = texts.find((n) => n.children.includes('IS Audit'))!;
    const tally = texts.find((n) => n.children.includes('8 of 9 (89%)'))!;
    expect(flat(name.props.style).flexShrink).toBe(1);
    expect(flat(tally.props.style).paddingLeft).toBe(16);
    expect(rows[0].props.accessibilityLabel).toBe('IS Audit, 8 of 9, 89 percent');
    // At the default size: the 66pt indent and one row.
    act(() => r!.unmount());
    setFontScale(1);
    mount(<ReadinessReport />);
    const small = host('mock-domains-m5')[0];
    expect(flat(small.props.style).paddingLeft).toBe(66);
    expect(flat(small.findAll((n) => n.props.accessible === true && typeof n.type === 'string')[0].props.style).flexDirection).toBe('row');
  });

  it('O10: an open mock is closed by a hairline when another mock follows; the last one has none', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT.slice(0, 3) });
    mount(<ReadinessReport />);
    const toggle = (id: string) => {
      const row = host(`mock-${id}`)[0].findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityState?.expanded !== undefined)[0];
      act(() => {
        row.props.onPress();
      });
    };
    toggle('m7');
    expect(flat(host('mock-domains-m7')[0].props.style).borderBottomWidth).toBe(1);
    toggle('m5');
    expect(flat(host('mock-domains-m5')[0].props.style).borderBottomWidth).toBe(0);
  });

  it('P8: the newest 5 mocks, then "Show all N mocks"; few mocks: no "Show all"', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    mount(<ReadinessReport />);
    expect(MOCKS_SHOWN).toBe(5);
    expect(host('mock-m7')).toHaveLength(1);
    expect(host('mock-m3')).toHaveLength(1);
    expect(host('mock-m2')).toHaveLength(0);
    press(/^Show all 8 mocks$/);
    expect(host('mock-m0')).toHaveLength(1);
    act(() => r!.unmount());
    setCert({ mocks: EIGHT.slice(0, 5) });
    mount(<ReadinessReport />);
    expect(allText()).not.toContain('Show all');
  });

  it('P8 + deep link: ?mock= to an older mock shows all, opens only it, and moves focus to it', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: 'm1' });
    mount(<ReadinessReport />);
    expect(host('mock-m1')).toHaveLength(1);
    expect(opened().map((n) => n.props.testID)).toEqual(['mock-domains-m1']);
    expect(mockMoveFocus).toHaveBeenCalledTimes(1);
    expect(focusedLabel(mockMoveFocus.mock.calls[0])).toMatch(/^50 questions, score 60 percent, .* untimed$/);
  });

  it.each([
    ['an unknown id (probe P1)', 'nope'],
    ['a repeated key, read as an array (probe P1b, M5a)', ['m3', 'm4']],
  ])('%s: renders, opens nothing, moves no focus', (_, param) => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: param as never });
    mount(<ReadinessReport />);
    expect(opened()).toHaveLength(0);
    expect(mockMoveFocus).not.toHaveBeenCalled();
    expect(allText()).toContain('Your mocks');
  });

  it('O2: an untimed mock of any length is a dashed OUTLINE on the chart, like the legend', () => {
    // m1 untimed mini; make the untimed one full-length too.
    const mocks = EIGHT.map((m) => (m.id === 'm1' ? { ...m, total: 150, correct: 90 } : m));
    setCert({ answers: seedAnswers(30, 0.7), mocks });
    mount(<ReadinessReport />);
    const chart = host('trend-chart')[0];
    const dashed = chart.findAllByType(Path).filter((p) => p.props.strokeDasharray);
    expect(dashed).toHaveLength(1);
    // Outline: the paper colour inside, never the accent fill.
    expect(dashed[0].props.fill).not.toBe(dashed[0].props.stroke);
    expect(dashed[0].props.fillOpacity).toBeUndefined();
  });

  it('O6 + probes P3/P4: in exam week the checklist sits right under the framing; after the exam there is none', () => {
    useSettings.setState({ examDates: { cisa: addDays(today(), 1) } });
    setCert({ answers: seedAnswers(30, 0.7) });
    mount(<ReadinessReport />);
    const t = allText();
    expect(t.indexOf('Exam-week checklist')).toBeGreaterThan(t.indexOf('How it’s worked out'));
    expect(t.indexOf('Exam-week checklist')).toBeLessThan(t.indexOf('What would raise your low end'));
    act(() => r!.unmount());
    useSettings.setState({ examDates: { cisa: addDays(today(), -3) } });
    mount(<ReadinessReport />);
    expect(allText()).not.toContain('Exam-week checklist');
    expect(allText()).toContain('After the exam');
  });

  it('P1 + O8: the path says where you are and why, with no step counter', () => {
    // Every domain under the mock floor: "Make it stick".
    setCert({ answers: seedAnswers(30, 0.5) });
    mount(<ReadinessReport />);
    const t = allText();
    expect(t).toContain('Now: Make it stick');
    expect(t).toContain('Until every domain is steady, practice leads.');
    expect(t).not.toMatch(/Step \d of \d/);
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /of 6/.test(n.props.accessibilityLabel))).toHaveLength(0);
  });
});

// ── Exam week ────────────────────────────────────────────────────────────
describe('exam week', () => {
  const full: PlanItem = { kind: 'mock', questions: 150, label: 'Full mock · 150 questions', why: 'final' };
  const session = (total: number, answered: number) => ({ kind: 'session' as const, mode: 'mock' as const, answered, total, minutes: 5 });

  it('M4 / probe P8: a mini mock never ticks the full rehearsal; a full-length one does; a weekly mock still ticks on any mock', () => {
    expect(activityMatches(full, session(50, 50))).toBe(false);
    expect(activityMatches(full, session(150, 3))).toBe(true);
    expect(activityMatches(full, session(150, 0))).toBe(false);
    const weekly: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions' };
    expect(activityMatches(weekly, session(50, 1))).toBe(true);
  });

  it('P6: exam-week reviews read "Light review · n questions", days 7 to 2; outside the week they keep their name', () => {
    const base = { stage: 'examDay' as const, dueReviews: 12, dailyMinutes: 30, answered: 200, examQuestions: 150, examMinutes: 240, lastFullMockAt: null, now: Date.now() };
    for (const daysLeft of [7, 6, 5, 4, 3, 2]) {
      const review = todaysPlan({ ...base, daysLeft }).find((i) => i.kind === 'review');
      expect(review && review.kind === 'review' && review.label).toBe(`Light review · ${review!.count} questions`);
    }
    const practice = todaysPlan({ ...base, stage: 'practice', daysLeft: 30 }).find((i) => i.kind === 'review');
    expect(practice && practice.kind === 'review' && practice.label).toBeFalsy();
  });

  it('O9 (mobile 1.21): the day\'s minutes leave a mock out, optional or not; the mock\'s own row says it is optional', () => {
    const top: PlanItem = { kind: 'practice', count: 20, label: 'Top-up: IS Operations' };
    const topMin = todayMinutes([top], [false]);
    expect(topMin).toBeGreaterThan(0);
    expect(todayMinutes([top, { ...full, minutes: 240 }], [false, false])).toBe(topMin);
    expect(todayMinutes([top, { ...full, minutes: 240 }], [true, false])).toBe(0);
    expect(todayMinutes([top, { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions' }], [false, false])).toBe(topMin);
  });

  it('probes P6/P7: one full mock 7–5 days out across a DST change; exam-focused gets no mini mock', () => {
    const now = new Date(2026, 10, 1, 7).getTime();
    const base = { stage: 'examDay' as const, dueReviews: 0, dailyMinutes: 30, answered: 200, daysLeft: 6, examQuestions: 150, examMinutes: 240, now };
    expect(todaysPlan({ ...base, lastFullMockAt: new Date(2026, 9, 18, 20).getTime() }).filter((i) => i.kind === 'mock')).toHaveLength(1);
    expect(todaysPlan({ ...base, lastFullMockAt: new Date(2026, 9, 19, 0, 30).getTime() }).filter((i) => i.kind === 'mock')).toHaveLength(0);
    const focused = todaysPlan({ ...base, examFocused: true, familiarity: 'experienced', lastMockAt: null, lastFullMockAt: null, now: Date.now() });
    expect(focused.filter((i) => i.kind === 'mock').map((i) => (i as { why?: string }).why)).toEqual(['final']);
  });

  it('P4: online or test centre is one slot: 5 in all', () => {
    expect(EXAM_WEEK_SLOTS).toBe(5);
    expect(examWeekDoneSlots(['online', 'centre'])).toBe(1);
    expect(examWeekCount(['booking', 'online', 'centre', 'pace', 'guide', 'sleep'])).toBe('5 of 5 done');
    expect(examWeekCount([])).toBe('0 of 5 done');
  });

  it('M3b: "Hide" moves screen-reader focus to the next heading after its announcement', () => {
    useSettings.setState({ examDates: { cisa: addDays(today(), 6) } });
    setCert({ answers: seedAnswers(30, 0.7) });
    mount(<Today />);
    expect(host('exam-week-card')).toHaveLength(1);
    press(/^Hide this card/);
    expect(host('exam-week-card')).toHaveLength(0);
    const call = mockMoveFocus.mock.calls.find((c) => focusedLabel(c) === 'Also today');
    expect(call).toBeDefined();
    // After the "Hidden…" announcement (350 ms), so the two don't talk over each other.
    expect(call![1]).toBeGreaterThan(350);
  });
});
