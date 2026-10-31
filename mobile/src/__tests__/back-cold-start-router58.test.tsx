/**
 * Mobile 1.54.2: Back on a screen that a system link opened first, on the REAL router.
 *
 * A link such as kaisip://settings on a cold start makes that screen the
 * only one in the root stack. Its Back arrow called a plain router.back(),
 * which then did nothing: the learner was stuck. Back now opens the screen's
 * own tab (lib/actions.ts backOr), and so does EmptyScreen's Back (an empty
 * Mistake journal goes to You, not Today).
 *
 * The real screens run inside expo-router 58 (`renderRouter`) and the test
 * presses their own Back arrow. Checked by hand on a release build too
 * (a development build's launcher catches cold-start links first).
 */
import { Text } from 'react-native';
import { router, Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper (see widgets-router58.test.tsx).
import Fit from '../app/fit';
import Mistakes from '../app/mistakes';
import Settings from '../app/settings';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { act, fireEvent, renderRouter, type RenderRouterResult } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

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
  mistakes: Mistakes,
  settings: Settings,
  fit: Fit,
};

type Route = { name: string; state?: { routes: Route[] } };
/** The root stack's screens, bottom to top. */
const names = (r: RenderRouterResult): string[] =>
  ((r.getRouterState() as { routes: Route[] } | undefined)?.routes[0]?.state?.routes ?? []).map((x) => x.name);
const go = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
};
const pressBack = (r: RenderRouterResult) => go(() => fireEvent.press(r.getByLabelText('Back')));

beforeEach(() => {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', addDays(dayKey(Date.now()), 21), { familiarity: 'some', dailyMinutes: 20 });
});

describe('Back on a screen opened first by a system link lands on its tab', () => {
  it('kaisip://settings: Back opens You', async () => {
    const r = await renderRouter(APP, { initialUrl: '/settings' });
    expect(names(r)).toEqual(['settings']);
    await pressBack(r);
    expect(r.getPathname()).toBe('/you');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('kaisip://mistakes with an empty journal (the empty screen): Back opens You, not Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/mistakes' });
    expect(names(r)).toEqual(['mistakes']);
    await pressBack(r);
    expect(r.getPathname()).toBe('/you');
    expect(names(r)).toEqual(['(tabs)']);
  });

  it('kaisip://fit: Back opens Today', async () => {
    const r = await renderRouter(APP, { initialUrl: '/fit' });
    expect(names(r)).toEqual(['fit']);
    await pressBack(r);
    expect(r.getPathname()).toBe('/home');
    expect(names(r)).toEqual(['(tabs)']);
  });
});

it('opened from You as usual: Back still just goes back', async () => {
  const r = await renderRouter(APP, { initialUrl: '/you' });
  await go(() => router.push('/settings'));
  await pressBack(r);
  expect(r.getPathname()).toBe('/you');
  expect(names(r)).toEqual(['(tabs)']);
});
