/**
 * PR #47 review fixes (mobile 1.16 "Proof"): the code review (CR_47), the
 * UX review (UX_47) and the code review's probes (P1–P8), ported as tests.
 * - Exam week: a mini mock never ticks the full rehearsal (M4); "Hide" moves
 *   focus to the next heading (M3b); reviews read "Light review" (P6); the
 *   hero says the mock is optional (O9); online/centre is one slot (P4).
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import { todayMinutesLine } from '../components/journey';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { activityMatches } from '../engine/dayPlan';
import { addDays } from '../engine/examDay';
import { EXAM_WEEK_SLOTS, examWeekCount, examWeekDoneSlots } from '../engine/examWeek';
import { todaysPlan, type PlanItem } from '../engine/planner';
import type { AnswerRecord } from '../engine/readiness';
import { dayKey } from '../engine/streak';
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
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const host = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
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

  it('O9: the hero says "+ optional mock" when the mock is the last rehearsal', () => {
    const top: PlanItem = { kind: 'practice', count: 20, label: 'Top-up: IS Operations' };
    expect(todayMinutesLine([top, { ...full, minutes: 240 }], [false, false])).toMatch(/^About \d+ min today \+ optional mock$/);
    expect(todayMinutesLine([top, { ...full, minutes: 240 }], [true, false])).toBe('An optional mock today');
    expect(todayMinutesLine([top, { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions' }], [false, false])).toMatch(/today \+ mock$/);
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
