/** Behavioral regression coverage for the approved Today dashboard. */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getAllQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import type { PlanItem } from '../engine/planner';
import type { DayPlan } from '../engine/dayPlan';
import { lessonsFor } from '../content/lessons';
import { startMock } from '../lib/sessions';

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
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');

const NOW = new Date(2026, 9, 15, 9, 0, 0); // a Thursday morning
const today = () => dayKey(NOW.getTime());
const ALL = getAllQuestions('cisa');
const WARM: PlanItem = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };

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


/** Real screens, stores and actions: these checks protect learner-visible navigation contracts. */
const buttons = (scope: ReactTestInstance) => scope.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button');
const suggestions = () => byTestID('today-suggestions');
const suggestionButtons = () => buttons(suggestions()[0]);

it('offers at most two secondary suggestions and opens a real unfinished lesson', () => {
  seedAnswers(200, 146);
  storePlan([WARM], [false]);
  mount(<Today />);
  const rows = suggestionButtons();
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThanOrEqual(2);
  const lesson = rows.find((n) => String(n.props.accessibilityLabel).startsWith('Continue learning:'))!;
  expect(lesson).toBeDefined();
  act(() => { lesson.props.onPress(); });
  const href = jest.mocked(router.push).mock.calls.at(-1)![0] as { pathname: string; params: { id: string } };
  expect(href.pathname).toBe('/lesson/[id]');
  expect(lessonsFor('cisa').some((item) => item.id === href.params.id)).toBe(true);
  expect(useProgress.getState().byCert.cisa.lessonsDone).not.toContain(href.params.id);
});

it('focused practice starts real questions in the suggested domain and opens that session', () => {
  seedAnswers(200, 146);
  storePlan([WARM], [false]);
  mount(<Today />);
  const focus = suggestionButtons().find((n) => String(n.props.accessibilityLabel).startsWith('Practice '))!;
  expect(focus).toBeDefined();
  const domain = cisa.domains.find((d) => String(focus.props.accessibilityLabel).startsWith(`Practice ${d.short}.`))!;
  expect(domain).toBeDefined();
  act(() => { focus.props.onPress(); });
  const session = useSession.getState().active!;
  expect(session.certId).toBe('cisa');
  expect(session.questionIds.length).toBeGreaterThan(0);
  expect(session.questionIds.every((id) => ALL.find((q) => q.id === id)?.domainId === domain.id)).toBe(true);
  expect(router.push).toHaveBeenCalledWith('/session');
});

it('preserves a paused session, hides competing suggestions, and keeps Resume working', () => {
  seedAnswers(200, 146);
  storePlan([WARM], [false]);
  act(() => { startMock('cisa', 50); });
  const saved = useSession.getState().active!;
  mount(<Today />);
  expect(suggestions()).toHaveLength(0);
  const resume = buttons(root()).find((n) => String(n.props.accessibilityLabel).startsWith('Resume:'))!;
  expect(resume).toBeDefined();
  act(() => { resume.props.onPress(); });
  expect(useSession.getState().active!.id).toBe(saved.id);
  expect(router.push).toHaveBeenCalledWith('/session');
});

it('a suggestion already on screen still guards a session started before the tap', () => {
  seedAnswers(200, 146);
  storePlan([WARM], [false]);
  mount(<Today />);
  const onPress = suggestionButtons().find((n) => String(n.props.accessibilityLabel).startsWith('Practice '))!.props.onPress;
  act(() => { startMock('cisa', 50); });
  const saved = useSession.getState().active!;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  act(() => { onPress(); });
  expect(alert).toHaveBeenCalledWith('Replace your unfinished session?', expect.any(String), expect.arrayContaining([expect.objectContaining({ text: 'Keep it', style: 'cancel' })]));
  expect(useSession.getState().active!.id).toBe(saved.id);
  alert.mockRestore();
});

it.each(['first five', 'exam week'] as const)('keeps suggestions out of %s', (state) => {
  seedAnswers(200, 146);
  if (state === 'exam week') useSettings.setState({ examDates: { cisa: '2026-10-20' } });
  storePlan(state === 'first five' ? [{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }] : [WARM], [false]);
  mount(<Today />);
  expect(suggestions()).toHaveLength(0);
  expect(byTestID('today-weekly-activity')).toHaveLength(0);
});

it('labels saved study dates honestly and does not turn answer timestamps into daily question volumes', () => {
  seedAnswers(200, 146); // All latest answers yesterday; saved study day is today only.
  storePlan([WARM], [false]);
  mount(<Today />);
  const activity = byTestID('today-weekly-activity')[0];
  expect(textOf(activity)).toContain('1 study day this week');
  expect(textOf(activity)).not.toMatch(/200|hours|questions answered/i);
  const chart = activity.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'image')[0];
  expect(chart.props.accessibilityLabel).toContain('Studied on Thursday.');
  expect(chart.props.accessibilityLabel).toContain('not time or question count');
});

it('Set a target opens the existing exam-date settings without changing the plan or starting a session', () => {
  useSettings.setState({ examDates: {} });
  storePlan([WARM], [false]);
  mount(<Today />);
  const saved = useProgress.getState().days.cisa;
  const target = buttons(root()).find((n) => n.props.accessibilityLabel === 'Set a target')!;
  expect(target).toBeDefined();
  act(() => { target.props.onPress(); });
  expect(router.push).toHaveBeenCalledWith({ pathname: '/settings', params: { open: 'exam-date' } });
  expect(useProgress.getState().days.cisa).toBe(saved);
  expect(useSession.getState().active).toBeNull();
});
