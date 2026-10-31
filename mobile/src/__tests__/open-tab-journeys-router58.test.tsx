/**
 * Leaving Results and Session through openTab (mobile 1.54.1), on the REAL router:
 * the paths stacked-tabs-router58.test.tsx does not drive.
 *
 * - Results "Continue" (today's plan) with REAL plan items: openTab, then
 *   runPlanItem's push. The new screen (session, caught-up, a lesson, a game)
 *   must land straight above the one tab navigator, never above Results.
 * - A cold start on Results (a link with nothing under it): Done, Android Back,
 *   the empty state, and "Continue".
 * - A mock's Pause, then Resume from Today, then Pause again (Android Back).
 * - The first set's "Do 5 more" (Results replaces itself with the new set), from
 *   Today and from onboarding (where the set is the only screen).
 * - Results above Guided: "Done" goes to Today, "Back to your Guided step" to Guided.
 * - "Practice the N you missed" and Session's "Back to Today" empty state.
 *
 * Real Session and Results screens; the tabs and the other screens are stand-ins.
 */
import { Alert, BackHandler, Text } from 'react-native';
import { router, Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper: the helper registers its own
// Reanimated mock, and the screens must keep the project's shared one (jest/setup.ts).
import Results from '../app/results';
import Session from '../app/session';
import { getAllQuestions } from '../content/loader';
import type { DayPlan } from '../engine/dayPlan';
import { addDays } from '../engine/examDay';
import type { PlanItem } from '../engine/planner';
import { dayKey } from '../engine/streak';
import { finishSession } from '../lib/finishSession';
import { startFirstSet } from '../lib/firstSet';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { act, fireEvent, renderRouter, screen, type RenderRouterResult } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const page = (name: string) =>
  function StandIn() {
    return <Text>{`${name} page`}</Text>;
  };
/** The app's shape: a root stack with the four tabs at its bottom, and the screens above them. */
const APP = {
  _layout: () => <Stack />,
  '(tabs)/_layout': () => (
    <Tabs>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="practice" />
      <Tabs.Screen name="you" />
    </Tabs>
  ),
  '(tabs)/home': page('home'),
  '(tabs)/learn': page('learn'),
  '(tabs)/practice': page('practice'),
  '(tabs)/you': page('you'),
  session: Session,
  results: Results,
  'caught-up': page('caught-up'),
  'mock-start': page('mock-start'),
  guided: page('guided'),
  'lesson/[id]': page('lesson'),
  'game/trap': page('trap'),
};

type Route = { name: string; state?: { index?: number; routes: Route[] } };
/** The root stack's screens, bottom to top. */
const names = (r: RenderRouterResult): string[] =>
  ((r.getRouterState() as { routes: Route[] } | undefined)?.routes[0]?.state?.routes ?? []).map((x) => x.name);
const go = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
};

// Android's Back: the newest listener first, until one handles it (as the phone does).
type BackListener = () => boolean | null | undefined;
let backs: BackListener[] = [];
const pressBack = () => {
  for (const h of [...backs].reverse()) if (h()) return;
};
/** Alert buttons are pressed by their label (the dialog is the phone's own). */
const answerAlerts = (label: string) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === label)?.onPress?.());

const bank = getAllQuestions('cisa');
/** Answer every question of the active set (the first right, the rest wrong), saved to progress as the app does. */
const answerAll = () => {
  const s = useSession.getState().active!;
  for (const [i, id] of s.questionIds.entries()) {
    const q = bank.find((x) => x.id === id)!;
    const display = (['A', 'B', 'C', 'D'] as const).find((d, k) => (s.perms[id][k] === q.correct) === (i === 0))!;
    useSession.getState().answer(id, { display, correct: i === 0, ms: 20_000 });
    useProgress.getState().recordAnswer('cisa', id, i === 0);
  }
};
/** Answer the first `n` questions wrong (a mock: no feedback, answers saved on the session). */
const answerFirst = (n: number) => {
  const s = useSession.getState().active!;
  for (const id of s.questionIds.slice(0, n)) {
    const q = bank.find((x) => x.id === id)!;
    const display = (['A', 'B', 'C', 'D'] as const).find((_, k) => s.perms[id][k] !== q.correct)!;
    useSession.getState().answer(id, { display, correct: false, ms: 20_000 });
  }
};

/** Today's plan with one item to do (and the same day as the set that just finished). */
const planWith = (item: PlanItem): DayPlan => ({
  day: dayKey(Date.now()),
  certId: 'cisa',
  items: [item],
  done: [false],
  start: { score: 0, domains: {} },
  answered: 0,
  correct: 0,
  minutes: 0,
});
/** Questions due for review now (past due), so a review item has something to ask. */
const makeDue = (ids: string[]) =>
  useProgress.setState((s) => ({
    byCert: {
      ...s.byCert,
      cisa: {
        ...selectCert(s, 'cisa'),
        review: Object.fromEntries(ids.map((id) => [id, { box: 1, dueAt: Date.now() - 60_000, lastSeen: Date.now() - 86_400_000, reps: 1 }])),
      },
    },
  }));
/**
 * A finished "Quick question" (the widget's one-question set, the only kind Results hands back to
 * today's plan), with `item` left in today's plan, shown on Results the way Session opens it.
 */
const quickQuestionDone = async (item: PlanItem, opts: { cold?: boolean; due?: string[] } = {}) => {
  startFromIds('cisa', [bank[500].id], 'Quick question');
  answerAll();
  finishSession({ celebrate: false });
  makeDue(opts.due ?? []);
  useProgress.setState({ days: { cisa: planWith(item) } });
  if (opts.cold) return renderRouter(APP, { initialUrl: '/results' });
  const r = await renderRouter(APP, { initialUrl: '/home' });
  await go(() => router.push('/results'));
  return r;
};
/** One practice set from the current screen: Session, answered, then Results (session.tsx replaces itself with Results). */
const finishSet = async (ids: string[], extra: Parameters<typeof startFromIds>[3] = {}) => {
  await go(() => {
    startFromIds('cisa', ids, 'T', extra);
    router.push('/session');
  });
  await go(() => {
    answerAll();
    finishSession({ celebrate: false });
  });
  await go(() => router.replace('/results'));
};

beforeEach(() => {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', addDays(dayKey(Date.now()), 21), { familiarity: 'some', dailyMinutes: 20 });
  backs = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h) => {
    backs.push(h as BackListener);
    return { remove: () => (backs = backs.filter((x) => x !== h)) };
  });
});
afterEach(() => jest.restoreAllMocks());

describe('Results "Continue" (today\'s plan): openTab, then the next item above the one tab navigator', () => {
  it('a review item with questions due: the review session sits straight on the tabs', async () => {
    const due = bank.slice(600, 604).map((q) => q.id);
    const r = await quickQuestionDone({ kind: 'review', count: 3 }, { due });
    expect(names(r)).toEqual(['(tabs)', 'results']);
    await go(() => fireEvent.press(screen.getByText('Continue')));
    expect(names(r)).toEqual(['(tabs)', 'session']);
    expect(r.getPathname()).toBe('/session');
    const s = useSession.getState().active!;
    expect(s.mode).toBe('review');
    // The card's count, never the whole due queue (lib/actions.ts runPlanItem).
    expect(s.questionIds).toHaveLength(3);
    expect(s.finishedAt).toBeUndefined();
  });

  it('a review item whose queue was cleared elsewhere: "caught up" on the tabs, no session', async () => {
    const r = await quickQuestionDone({ kind: 'review', count: 3 });
    await go(() => fireEvent.press(screen.getByText('Continue')));
    expect(names(r)).toEqual(['(tabs)', 'caught-up']);
    expect(useSession.getState().active).toBeNull();
  });

  it('a lesson item: the lesson on the tabs, Results gone', async () => {
    const r = await quickQuestionDone({ kind: 'lesson', lessonId: 'L-1', title: 'A lesson' });
    await go(() => fireEvent.press(screen.getByText('Continue')));
    expect(names(r)).toEqual(['(tabs)', 'lesson/[id]']);
    expect(screen.getByText('lesson page')).toBeTruthy();
  });

  it('a practice item: a new practice set on the tabs', async () => {
    const r = await quickQuestionDone({ kind: 'practice', count: 5, label: 'Mixed practice' });
    await go(() => fireEvent.press(screen.getByText('Continue')));
    expect(names(r)).toEqual(['(tabs)', 'session']);
    expect(useSession.getState().active?.questionIds).toHaveLength(5);
  });

  it('a game item: the game on the tabs', async () => {
    const r = await quickQuestionDone({ kind: 'game', gameId: 'trap', label: 'Trap Spotter' });
    await go(() => fireEvent.press(screen.getByText('Continue')));
    expect(names(r)).toEqual(['(tabs)', 'game/trap']);
  });

  it('then Back from the new screen lands on Today (the one tab navigator), never on Results', async () => {
    const r = await quickQuestionDone({ kind: 'lesson', lessonId: 'L-1', title: 'A lesson' });
    await go(() => fireEvent.press(screen.getByText('Continue')));
    await go(() => router.back());
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
  });

  it('on a cold start (Results opened by a link, nothing under it): one Today, then the session above it', async () => {
    const due = bank.slice(600, 603).map((q) => q.id);
    const r = await quickQuestionDone({ kind: 'review', count: 2 }, { cold: true, due });
    expect(names(r)).toEqual(['results']);
    await go(() => fireEvent.press(screen.getByText('Continue')));
    expect(names(r)).toEqual(['(tabs)', 'session']);
    await go(() => router.back());
    expect(r.getPathname()).toBe('/home');
  });

  it('"Done for now": back to the one Today, nothing started', async () => {
    const r = await quickQuestionDone({ kind: 'practice', count: 5, label: 'Mixed practice' });
    await go(() => fireEvent.press(screen.getByText('Done for now')));
    expect(names(r)).toEqual(['(tabs)']);
    expect(useSession.getState().active).toBeNull();
  });
});

describe('a cold start on Results (a link with nothing under it)', () => {
  const coldResults = async () => {
    startFromIds('cisa', bank.slice(700, 703).map((q) => q.id), 'T');
    answerAll();
    finishSession({ celebrate: false });
    return renderRouter(APP, { initialUrl: '/results' });
  };

  it('"Done": Today replaces Results, one tab navigator', async () => {
    const r = await coldResults();
    expect(names(r)).toEqual(['results']);
    await go(() => fireEvent.press(screen.getAllByText('Done')[0]));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
    expect(useSession.getState().active).toBeNull();
  });

  it('Android Back does the same as "Done"', async () => {
    const r = await coldResults();
    await go(pressBack);
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('nothing to show: "Back to Today" opens one Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/results' });
    await go(() => fireEvent.press(screen.getByText('Back to Today')));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('"Practice the N you missed": the new set replaces Results', async () => {
    const r = await coldResults();
    await go(() => fireEvent.press(screen.getByText('Practice the 2 you missed')));
    expect(names(r)).toEqual(['session']);
    expect(useSession.getState().active?.title).toBe('Missed questions');
  });
});

describe('a mock exam: Pause, Resume from Today, Pause again', () => {
  it('started from Practice (via the start sheet): each Pause leaves one Today, the exam and its answers kept', async () => {
    answerAlerts('Pause');
    const r = await renderRouter(APP, { initialUrl: '/practice' });
    await go(() => router.push('/mock-start'));
    // The start sheet starts the mock and replaces itself with the session (app/mock-start.tsx).
    await go(() => {
      startMock('cisa', 10);
      router.replace('/session');
    });
    await go(() => answerFirst(2));
    expect(names(r)).toEqual(['(tabs)', 'session']);
    await go(() => fireEvent.press(screen.getByLabelText('Pause exam')));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
    expect(router.canGoBack()).toBe(false);
    const paused = useSession.getState().active!;
    expect(paused.mode).toBe('mock');
    expect(Object.keys(paused.responses)).toHaveLength(2);
    // Today's "Resume" row pushes the session (app/(tabs)/home.tsx).
    await go(() => router.push('/session'));
    expect(names(r)).toEqual(['(tabs)', 'session']);
    expect(screen.getByLabelText('Pause exam')).toBeTruthy();
    expect(useSession.getState().active?.id).toBe(paused.id);
    // Android Back asks the same "Pause exam?" and leaves the same way.
    await go(pressBack);
    expect(names(r)).toEqual(['(tabs)']);
    expect(useSession.getState().active?.id).toBe(paused.id);
    expect(Object.keys(useSession.getState().active!.responses)).toHaveLength(2);
  });

  it('a paused mock opened by a link on a cold start: Pause gives one Today', async () => {
    answerAlerts('Pause');
    startMock('cisa', 10);
    const r = await renderRouter(APP, { initialUrl: '/session' });
    expect(names(r)).toEqual(['session']);
    await go(() => fireEvent.press(screen.getByLabelText('Pause exam')));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
    expect(useSession.getState().active?.mode).toBe('mock');
  });
});

describe('the first set\'s "Do 5 more"', () => {
  const firstSetDone = async (r: RenderRouterResult) => {
    await go(() => {
      answerAll();
      finishSession({ celebrate: false });
    });
    await go(() => router.replace('/results'));
    expect(screen.getByText('Done for today')).toBeTruthy();
    return r;
  };

  it('from Today: the five more replace the closing screen; their Results "Done" leaves one Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => {
      startFirstSet('cisa');
      router.push('/session');
    });
    await firstSetDone(r);
    await go(() => fireEvent.press(screen.getByText('Do 5 more')));
    expect(names(r)).toEqual(['(tabs)', 'session']);
    expect(useSession.getState().active?.title).toBe('Five more');
    await go(() => {
      answerAll();
      finishSession({ celebrate: false });
    });
    await go(() => router.replace('/results'));
    expect(names(r)).toEqual(['(tabs)', 'results']);
    await go(() => fireEvent.press(screen.getAllByText('Done')[0]));
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
  });

  it('from onboarding (the set is the only screen): "Done for today" gives one Today', async () => {
    // Onboarding replaces itself with the first set (app/onboarding.tsx finish).
    startFirstSet('cisa');
    const r = await renderRouter(APP, { initialUrl: '/session' });
    await firstSetDone(r);
    expect(names(r)).toEqual(['results']);
    await go(() => fireEvent.press(screen.getByText('Done for today')));
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
  });

  it('from onboarding: "Do 5 more", then "End" with nothing answered, gives one Today', async () => {
    answerAlerts('End');
    startFirstSet('cisa');
    const r = await renderRouter(APP, { initialUrl: '/session' });
    await firstSetDone(r);
    await go(() => fireEvent.press(screen.getByText('Do 5 more')));
    expect(names(r)).toEqual(['session']);
    await go(() => fireEvent.press(screen.getByLabelText('End session')));
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
  });

  it('Android Back on the closing screen means "Done for today": one Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => {
      startFirstSet('cisa');
      router.push('/session');
    });
    await firstSetDone(r);
    await go(pressBack);
    expect(names(r)).toEqual(['(tabs)']);
    expect(useSession.getState().active).toBeNull();
  });
});

describe('Results above Guided (Practice → Guided → a step)', () => {
  const guidedResults = async () => {
    const r = await renderRouter(APP, { initialUrl: '/practice' });
    await go(() => router.push('/guided'));
    await finishSet(bank.slice(800, 803).map((q) => q.id), { path: { mode: 'guided', scope: 'all' } });
    expect(names(r)).toEqual(['(tabs)', 'guided', 'results']);
    return r;
  };

  it('"Back to your Guided step": back to the Guided screen already there', async () => {
    const r = await guidedResults();
    await go(() => fireEvent.press(screen.getByText('Back to your Guided step')));
    expect(names(r)).toEqual(['(tabs)', 'guided']);
  });

  it('"Done": Today, with Guided closed too (one tab navigator, nothing above it)', async () => {
    const r = await guidedResults();
    await go(() => fireEvent.press(screen.getByText('Done')));
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
    // Nothing behind Today: Android Back leaves the app (the tabs go back to their first tab, Today).
    expect(router.canGoBack()).toBe(false);
  });
});

describe('Session\'s "Back to Today" (nothing to continue)', () => {
  it('from Today: back to the one Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/learn' });
    await go(() => router.push('/session'));
    expect(screen.getByText('No session in progress.')).toBeTruthy();
    await go(() => fireEvent.press(screen.getByText('Back to Today')));
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
    expect(router.canGoBack()).toBe(false);
  });

  it('a one-question set opened by a link on a cold start: leaving it gives one Today', async () => {
    startFromIds('cisa', [bank[900].id], 'Quick question');
    const r = await renderRouter(APP, { initialUrl: '/session' });
    await go(() => fireEvent.press(screen.getByLabelText('End session')));
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
  });
});
