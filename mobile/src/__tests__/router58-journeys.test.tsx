/**
 * Expo SDK 58: app start and leaving deep stacks, on the REAL router.
 *
 * Covers router-58 paths no other real-router test drives:
 * - the app entry (app/index.tsx <Redirect>) on a cold start, onboarded or not;
 * - a widget tap before onboarding (lib/widgetOpen.ts replaces to "/" → onboarding);
 * - onboarding's replace to Today; openSessionFromStack and openTab from deep stacks.
 */
import { Text } from 'react-native';
import { router, Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper (see widgets-router58.test.tsx).
import Index from '../app/index';
import WidgetOpen from '../app/widget';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { openSessionFromStack, openTab } from '../lib/actions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { act, renderRouter, type RenderRouterResult } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const page = (name: string) =>
  function StandIn() {
    return <Text>{name}</Text>;
  };
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
  index: Index,
  widget: WidgetOpen,
  onboarding: page('onboarding'),
  session: page('session'),
  results: page('results'),
  readiness: page('readiness'),
};

type Route = { name: string; state?: { routes: Route[] } };
const names = (r: RenderRouterResult): string[] =>
  ((r.getRouterState() as { routes: Route[] } | undefined)?.routes[0]?.state?.routes ?? []).map((x) => x.name);
const go = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
};
const settle = () => go(() => {});
const onboard = () =>
  useSettings.getState().completeOnboarding('cisa', addDays(dayKey(Date.now()), 21), { familiarity: 'some', dailyMinutes: 20 });

beforeEach(() => {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useSession.setState({ active: null });
});

describe('cold start entry (app/index.tsx) on router 58', () => {
  it('a first launch lands on onboarding, alone', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await settle();
    expect(r.getPathname()).toBe('/onboarding');
    expect(names(r)).toEqual(['onboarding']);
  });

  it('after onboarding, a launch lands on Today (one tab navigator)', async () => {
    onboard();
    const r = await renderRouter(APP, { initialUrl: '/' });
    await settle();
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('finishing onboarding replaces it with Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await settle();
    onboard();
    await go(() => router.replace('/home'));
    expect(names(r)).toEqual(['(tabs)']);
  });
});

it('a widget tap before onboarding opens onboarding, never the place', async () => {
  const r = await renderRouter(APP, { initialUrl: '/widget?kind=plant&go=plant&from=widget' });
  await settle();
  expect(r.getPathname()).toBe('/onboarding');
  expect(names(r)).toEqual(['onboarding']);
});

describe('leaving deep stacks on router 58', () => {
  beforeEach(onboard);

  it('openSessionFromStack clears the screens above Today, then opens the quiz', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => router.push('/readiness'));
    await go(() => router.push('/results'));
    await go(() => openSessionFromStack());
    expect(names(r)).toEqual(['(tabs)', 'session']);
  });

  it('openTab from Results (session replaced by results) returns to the one tab navigator', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => router.push('/readiness'));
    await go(() => router.push('/session'));
    await go(() => router.replace('/results'));
    await go(() => openTab('/learn'));
    expect(r.getPathname()).toBe('/learn');
    expect(names(r)).toEqual(['(tabs)']);
  });
});
