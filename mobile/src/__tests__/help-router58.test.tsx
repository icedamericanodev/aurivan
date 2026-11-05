/**
 * Expo SDK 58: the Help deep link (kaisip://help?open=…) on the REAL router.
 *
 * Help opens the linked sheet once, then clears `open` so a later identical
 * link opens it again. Router 58 runs a pushed screen's mount effect while the
 * screen underneath is still in focus, so the global `router.setParams`
 * cleared Today's params and Help kept `open=support`. Help now clears the
 * param through its own navigation (app/help.tsx).
 */
import { Text } from 'react-native';
import { router, Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper: the helper registers its own
// Reanimated mock, and the screens must keep the project's shared one (jest/setup.ts).
import Help from '../app/help';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { useSettings } from '../store/settings';
import { act, renderRouter, type RenderRouterResult } from 'expo-router/testing-library';

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
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.54.0' } } }));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class { list() { return []; } }, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));

const page = (name: string) =>
  function StandIn() {
    return <Text>{name}</Text>;
  };
/** The app's shape: a root stack with the four tabs at its bottom and Help pushed above. */
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
  help: Help,
};

type Route = { name: string; params?: Record<string, unknown>; state?: { routes: Route[] } };
/** The root stack's screens, bottom to top. */
const stack = (r: RenderRouterResult): Route[] => {
  const top = r.getRouterState() as { routes: Route[] } | undefined;
  return top?.routes[0]?.state?.routes ?? [];
};
const settle = async () => {
  await act(async () => {});
};

beforeEach(() => {
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.getState().completeOnboarding('cisa', addDays(dayKey(Date.now()), 21), { familiarity: 'some', dailyMinutes: 20 });
});

it('clears the link param on Help itself, not on the screen underneath', async () => {
  const r = await renderRouter(APP, { initialUrl: '/home' });
  await settle();
  await act(async () => {
    router.push('/help?open=support');
  });
  await settle();
  const routes = stack(r);
  expect(routes.map((x) => x.name)).toEqual(['(tabs)', 'help']);
  const help = routes[1];
  expect(help.params?.open).toBeUndefined();
  // Today's tabs were left alone (router 58 had cleared their params instead).
  expect(routes[0].params ?? {}).not.toHaveProperty('open');
});
