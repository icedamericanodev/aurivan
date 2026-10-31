/**
 * Leaving a finished set never stacks a second tab navigator (mobile 1.54.1).
 *
 * The bug (smoke test, 31 Oct 2026, on SDK 57 and 58 alike): Results "Done",
 * Session "End" / "Pause", the first set's "Done for today" and a few empty
 * states went to a tab with router.replace(). From a screen in the root stack
 * that REPLACES the screen with a NEW (tabs) navigator on top of the old one:
 * after three finished sets the page held four tab navigators (one visible),
 * Android Back from Today walked into old screens, and each set kept another
 * copy of the tabs in memory. They now use openTab (lib/actions.ts): dismiss
 * back to the tabs already there, or replace when nothing is underneath.
 *
 * Runs the REAL router (expo-router/testing-library) with the real screens
 * that hold those buttons; the tabs are stand-ins.
 */
import { Alert, Text } from 'react-native';
import { router, Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper: the helper registers its own
// Reanimated mock, and the screens must keep the project's shared one (jest/setup.ts).
import Results from '../app/results';
import Session from '../app/session';
import { GameUnavailable } from '../components/game';
import { getAllQuestions } from '../content/loader';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { openTab } from '../lib/actions';
import { finishSession } from '../lib/finishSession';
import { startFirstSet } from '../lib/firstSet';
import { startFromIds, startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
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
/** The app's shape: a root stack with the four tabs at its bottom, and the real screens above them. */
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
  'game/locked': () => <GameUnavailable game="trap" />,
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
/** One practice set, Today → Session → Results, the way the app moves (session.tsx replaces itself with Results). */
const finishASet = async (k: number) => {
  await go(() => {
    startFromIds('cisa', bank.slice(200 + k * 3, 203 + k * 3).map((q) => q.id), 'T');
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
});
afterEach(() => jest.restoreAllMocks());

describe('leaving a finished set keeps one tab navigator', () => {
  it('Results "Done", three sets in a row: Today, with one (tabs) under nothing', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    for (let k = 0; k < 3; k++) {
      await finishASet(k);
      expect(names(r)).toEqual(['(tabs)', 'results']);
      await go(() => fireEvent.press(screen.getAllByText('Done')[0]));
      expect(r.getPathname()).toBe('/home');
      // Before the fix: 2, 3, then 4 tab navigators.
      expect(names(r)).toEqual(['(tabs)']);
    }
    expect(useSession.getState().active).toBeNull();
  });

  it('Session "End" with nothing answered: back to the one Today', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'End')?.onPress?.());
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => {
      startFromIds('cisa', bank.slice(300, 303).map((q) => q.id), 'T');
      router.push('/session');
    });
    await go(() => fireEvent.press(screen.getByLabelText('End session')));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('a mock exam\'s "Pause": back to the one Today, the exam kept for later', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Pause')?.onPress?.());
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => {
      startMock('cisa', 10);
      router.push('/session');
    });
    await go(() => fireEvent.press(screen.getByLabelText('Pause exam')));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
    expect(useSession.getState().active?.mode).toBe('mock');
  });

  it('the first set\'s "Done for today", started from Today: back to the one Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => {
      startFirstSet('cisa');
      router.push('/session');
    });
    await go(() => {
      answerAll();
      finishSession({ celebrate: false });
    });
    await go(() => router.replace('/results'));
    await go(() => fireEvent.press(screen.getByText('Done for today')));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('a set started from the Practice tab: "Done" still lands on Today, in the same tab navigator', async () => {
    const r = await renderRouter(APP, { initialUrl: '/practice' });
    await finishASet(0);
    expect(names(r)).toEqual(['(tabs)', 'results']);
    await go(() => fireEvent.press(screen.getAllByText('Done')[0]));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('a game that can\'t be played yet: "Go to Practice" opens the Practice tab already there', async () => {
    const r = await renderRouter(APP, { initialUrl: '/practice' });
    await go(() => router.push('/game/locked'));
    await go(() => fireEvent.press(screen.getByText('Go to Practice')));
    expect(r.getPathname()).toBe('/practice');
    expect(names(r)).toEqual(['(tabs)']);
  });
});

describe('openTab, then a new set (Results "Continue" with today\'s plan)', () => {
  it('dismisses to the tabs first, then opens the session above them', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await finishASet(0);
    await go(() => {
      useSession.getState().clear();
      openTab('/home');
      startFromIds('cisa', bank.slice(400, 402).map((q) => q.id), 'Next');
      router.push('/session');
    });
    expect(names(r)).toEqual(['(tabs)', 'session']);
  });

  it('with nothing underneath (a cold start on Results), it replaces: one Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/results' });
    await go(() => openTab('/home'));
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });
});
