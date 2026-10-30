/**
 * Expo SDK 58: a home-screen widget tap, on the REAL router.
 *
 * widgets-routing.test.tsx checks what lib/widgetOpen.ts asks for, on a
 * hand-made stack. This file runs the app's real landing screen
 * (app/widget.tsx) inside expo-router 58 (`renderRouter`), because router 58
 * runs navigation after the screen draws: from a plain mount effect, a cold
 * start threw (the router wasn't ready yet) and a warm one left a second tab
 * navigator under the place it opened. The landing screen now waits for its
 * first focus (lib/useOnceOnFocus.ts).
 *
 * Each test checks the ROOT stack the router really ends with: Today (the
 * tabs) at the bottom, then the place, and never the blank /widget screen.
 */
import { Text } from 'react-native';
import { router, Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper: the helper registers its own
// Reanimated mock, and the screens must keep the project's shared one (jest/setup.ts).
import WidgetOpen from '../app/widget';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';
import { act, renderRouter, type RenderRouterResult } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const page = (name: string) =>
  function StandIn() {
    return <Text>{name}</Text>;
  };
/** The app's shape: a root stack with the four tabs at its bottom; the widget's landing screen and a few places above. */
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
  widget: WidgetOpen,
  plant: page('plant'),
  bank: page('bank'),
  session: page('session'),
};

type Route = { name: string; state?: { routes: Route[] } };
/** The root stack's screens, bottom to top. */
const names = (r: RenderRouterResult): string[] => {
  const top = r.getRouterState() as { routes: Route[] } | undefined;
  return (top?.routes[0]?.state?.routes ?? []).map((x) => x.name);
};
/** Let the landing screen focus and the router run what it asked for. */
const settle = async () => {
  await act(async () => {});
};

const PLANT = '/widget?kind=plant&go=plant&from=widget';
const TODAY = dayKey(Date.now());

beforeEach(() => {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', addDays(TODAY, 21), { familiarity: 'some', dailyMinutes: 20 });
});

/** An unfinished practice set (a quiz the learner left with Home). */
function openQuiz() {
  useSession.setState({
    active: { id: 's', mode: 'practice', certId: 'cisa', title: 'x', questionIds: ['d1_003', 'd1_004'], perms: {}, index: 0, responses: {}, flagged: [], startedAt: Date.now() } as never,
  });
}

describe('a widget tap on expo-router 58 (app/widget.tsx)', () => {
  it('cold start (app closed): opens the place with Today under it, and never throws', async () => {
    const r = await renderRouter(APP, { initialUrl: PLANT });
    await settle();
    expect(names(r)).toEqual(['(tabs)', 'plant']);
    expect(r.getPathname()).toBe('/plant');
  });

  it('warm start (app open on another screen): ONE tab navigator, the place on top, no blank screen', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await act(async () => {
      router.push('/bank');
    });
    // A system link reaches the router as a navigate.
    await act(async () => {
      router.navigate(PLANT);
    });
    await settle();
    expect(names(r)).toEqual(['(tabs)', 'plant']);
  });

  it('"Today" from a widget lands on Today, with nothing above it', async () => {
    const r = await renderRouter(APP, { initialUrl: '/widget?kind=plan&go=today&from=widget' });
    await settle();
    expect(names(r)).toEqual(['(tabs)']);
    expect(r.getPathname()).toBe('/home');
  });

  it('a quiz is open (cold start): Today, then the quiz, then the place: Back goes place → quiz → Today', async () => {
    openQuiz();
    const r = await renderRouter(APP, { initialUrl: PLANT });
    await settle();
    expect(names(r)).toEqual(['(tabs)', 'session', 'plant']);
  });
});
