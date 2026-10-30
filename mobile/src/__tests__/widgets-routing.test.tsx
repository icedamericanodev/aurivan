/**
 * QA (widgets, tap routing): what a widget tap leaves in the navigation stack
 * and what it actually opens, checked with Expo Router's real stack and the
 * app's real widget screen (app/widget.tsx) and lib/widgetOpen.ts.
 *
 * Each `it` names a bug found in the 1.47 widget QA pass, written as the
 * behaviour we WANT (they were it.failing until the 1.47.1 fixes landed).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { parseWidgetTap, widgetFace, type WidgetSnapshot } from '../engine/widgets';
import { collectSnapshot } from '../lib/widgetData';
import { openFromWidget } from '../lib/widgetOpen';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

/**
 * A root stack that behaves like Expo Router's for the calls widgetOpen makes
 * (push adds a screen, replace swaps the top one, dismissAll keeps the first,
 * back pops). A deep link to /widget is a NAVIGATE, which pushes a new screen
 * unless /widget is already on top (expo-router StackRouter, NAVIGATE).
 */
const stack: string[] = [];
const path = (h: unknown) => (typeof h === 'string' ? h.split('?')[0] : String((h as { pathname: string }).pathname));
const mockRouter = {
  push: (h: unknown) => void stack.push(path(h)),
  replace: (h: unknown) => void (stack[stack.length - 1] = path(h)),
  canDismiss: () => stack.length > 1,
  dismissAll: () => void stack.splice(1),
  canGoBack: () => stack.length > 1,
  back: () => void stack.pop(),
  dismissTo: (h: unknown) => {
    const i = stack.lastIndexOf(path(h));
    if (i >= 0) stack.splice(i + 1);
    else stack[stack.length - 1] = path(h);
  },
};
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));
/** The link arrives: Expo Router pushes /widget, and app/widget.tsx runs openFromWidget once. */
function link(query: string) {
  if (stack[stack.length - 1] !== '/widget') stack.push('/widget');
  const params = Object.fromEntries(new URLSearchParams(query));
  openFromWidget(parseWidgetTap(params));
}

const NOW = new Date(2026, 9, 29, 9, 0).getTime();
const TODAY = dayKey(NOW);

function onboard(examDay = addDays(TODAY, 21)) {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', examDay, { familiarity: 'some', dailyMinutes: 20 });
}

/** An unfinished practice set (a quiz the learner left with Home, or a paused mock). */
function openQuiz() {
  useSession.setState({
    active: { id: 's', mode: 'practice', certId: 'cisa', title: 'x', questionIds: ['d1_003', 'd1_004'], perms: {}, index: 0, responses: {}, flagged: [], startedAt: NOW } as never,
  });
}

beforeEach(async () => {
  jest.useFakeTimers({ now: NOW });
  stack.splice(0);
  await AsyncStorage.clear();
});
afterEach(() => jest.useRealTimers());

describe('a widget tap while a quiz is open (busy path, lib/widgetOpen.ts)', () => {
  it('warm start: Back from the resumed quiz never lands on the blank widget screen', () => {
    onboard();
    openQuiz();
    stack.push('/home', '/session');
    link('kind=plan&go=start&from=widget');
    expect(stack[stack.length - 1]).toBe('/session');
    // Was a bug: [home, session, widget, session]: a second session screen, and the blank /widget under it.
    expect(stack).toEqual(['/home', '/session']);
    expect(stack).not.toContain('/widget');
  });

  it('cold start: the resumed quiz has Today under it, not the blank widget screen', () => {
    onboard();
    openQuiz();
    link('kind=question&go=question&id=d1_001&from=widget');
    expect(stack[stack.length - 1]).toBe('/session');
    mockRouter.back();
    // Was a bug: [widget, session] -> Back showed the blank widget screen (its effect never runs again).
    expect(stack[stack.length - 1]).toBe('/home');
  });

  it('a screen goal (Your plant) opened over a quiz: Back goes to the quiz, not a blank screen', () => {
    onboard();
    openQuiz();
    stack.push('/home', '/session');
    link('kind=plant&go=plant&from=widget');
    expect(stack[stack.length - 1]).toBe('/plant');
    mockRouter.back();
    expect(stack[stack.length - 1]).toBe('/session');
  });

  it('control: with no quiz open, /widget is replaced by Today and the place opens on top', () => {
    onboard();
    stack.push('/home', '/bank');
    link('kind=plant&go=plant&from=widget');
    expect(stack).toEqual(['/home', '/plant']);
  });
});

describe('a tap opens what the widget promised', () => {
  /** Plain study days before today, so the plan widget sees a 3+ day lapse. */
  function lapsed(daysAgo: number) {
    useProgress.setState((s) => ({ streak: { ...s.streak, lastDay: addDays(TODAY, -daysAgo), recentDays: [addDays(TODAY, -daysAgo - 1), addDays(TODAY, -daysAgo)] } }));
  }

  it('a revisit link (drawn by 1.47, or from the plan) starts the plan’s 6, not the whole queue (up to 20)', () => {
    onboard();
    // 25 questions answered wrong yesterday: all due for review now.
    const ids = Array.from({ length: 25 }, (_, i) => `d${(i % 5) + 1}_0${String(10 + i).padStart(2, '0')}`);
    jest.setSystemTime(NOW - 2 * 86_400_000);
    ids.forEach((id) => useProgress.getState().recordAnswer('cisa', id, false, 'sure'));
    jest.setSystemTime(NOW);
    const snap = collectSnapshot(NOW) as WidgetSnapshot;
    const promised = snap.plan?.back ?? 0;
    expect(promised).toBeGreaterThan(0);
    openFromWidget({ kind: 'revisit', go: 'review', id: null, fromWidget: true });
    const asked = useSession.getState().active?.questionIds.length ?? 0;
    // Was a bug: startReview(certId) used the 20-question cap, not the plan's count the widget showed.
    expect(asked).toBe(promised);
  });

  it('Today’s plan in the final week after a 3-day gap: no "5 questions" the tap can’t run, and Start runs the plan', () => {
    onboard(addDays(TODAY, 5));
    useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'sure');
    lapsed(4);
    const snap = collectSnapshot(NOW) as WidgetSnapshot;
    // The tap never runs the short set in exam week (shortSetItem with examWeek), so the plan has none on offer...
    expect(snap.plan?.shortSet).toBe(false);
    const face = widgetFace('plan', snap, { now: NOW });
    // ...and the widget no longer promises it (was a bug: "5 questions" led, and the tap ran the full item).
    expect(face.action?.label).not.toMatch(/5 questions/);
    expect(face.action?.link).toContain('go=start');
    expect(face.action2?.label ?? '').not.toMatch(/5 questions/);
    openFromWidget({ kind: 'plan', go: 'start', id: null, fromWidget: true });
    expect(useSession.getState().active?.questionIds.length).toBeGreaterThan(0);
  });

  it('control: after a 3-day gap with the exam far off, "5 questions" leads and starts 5', () => {
    onboard(addDays(TODAY, 40));
    useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'sure');
    lapsed(4);
    const snap = collectSnapshot(NOW) as WidgetSnapshot;
    const face = widgetFace('plan', snap, { now: NOW });
    expect(snap.plan?.shortSet).toBe(true);
    expect(face.action?.label).toMatch(/^5 questions/);
    openFromWidget({ kind: 'plan', go: 'short', id: null, fromWidget: true });
    expect(useSession.getState().active?.questionIds.length).toBeLessThanOrEqual(5);
  });
});
