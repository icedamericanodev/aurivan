/**
 * QA for mobile 1.20 and 1.51, on the REAL router: reaching a tab from a
 * screen pushed on the root stack must leave ONE tab navigator, never two.
 *
 * Until Expo SDK 57 this was checked against a model built on expo-router's
 * private StackRouter (`expo-router/build/...`). Router 58 changed that
 * private API (QA-120 broke), so these tests now run the real router through
 * its public test helper, `renderRouter` from `expo-router/testing-library`,
 * with the real Play and Readiness screens and stand-in tabs. They check the
 * root stack the router really ends with.
 *
 * Router 58 runs a navigation after the screen renders ("deferred dispatch"),
 * so every navigation here is awaited inside `act(async …)`.
 *
 * The other QA-120 journeys (note → back, resume, old saves, lessons, sets
 * started above a session) stay in qa-120.test.tsx, which mocks the router.
 */
import { Text } from 'react-native';
import { router, Stack, Tabs, useLocalSearchParams } from 'expo-router';
// The app's screens load BEFORE the router's test helper: the helper registers its own
// Reanimated mock, and the screens must keep the project's shared one (jest/setup.ts).
import PlayMoved from '../app/play';
import ReadinessReport from '../app/readiness';
import { getCertification } from '../content/certifications';
import { useProgress } from '../store/progress';
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

/** A stand-in tab: its name and the params it was opened with. */
const tab = (name: string) =>
  function StandInTab() {
    const params = useLocalSearchParams();
    return <Text>{`${name} tab ${JSON.stringify(params)}`}</Text>;
  };

/** The app's shape: a root stack, the four tabs at its bottom, Readiness and Play pushed above them. */
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
  '(tabs)/home': tab('home'),
  '(tabs)/learn': tab('learn'),
  '(tabs)/practice': tab('practice'),
  '(tabs)/you': tab('you'),
  readiness: ReadinessReport,
  play: PlayMoved,
};

type Route = { name: string; params?: Record<string, unknown>; state?: { index?: number; routes: Route[] } };
/** The ROOT stack (the router's own top level holds one navigator: app/_layout.tsx's Stack). */
const rootStack = (r: RenderRouterResult): Route[] => {
  const top = r.getRouterState() as { routes: Route[] } | undefined;
  return top?.routes[0]?.state?.routes ?? [];
};
const names = (r: RenderRouterResult) => rootStack(r).map((x) => x.name);
/** The tab showing inside a (tabs) entry of the root stack. */
const shownTab = (route: Route) => route.state?.routes[route.state.index ?? 0]?.name;

const go = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
};

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
});

describe('router 58: reaching a tab from a pushed screen (why openTab uses dismissTo)', () => {
  it('navigate stacks a SECOND (tabs) on top', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => router.push('/readiness'));
    expect(names(r)).toEqual(['(tabs)', 'readiness']);
    await go(() => router.navigate({ pathname: '/learn', params: { domain: '3' } }));
    expect(names(r)).toEqual(['(tabs)', 'readiness', '(tabs)']);
  });

  it('dismissTo returns to the (tabs) already there, on the asked tab and params', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => router.push('/readiness'));
    await go(() => router.dismissTo({ pathname: '/learn', params: { domain: '3' } }));
    expect(names(r)).toEqual(['(tabs)']);
    expect(shownTab(rootStack(r)[0])).toBe('learn');
    expect(r.getPathnameWithParams()).toBe('/learn?domain=3');
  });
});

describe('the old Play route → Practice at Drills (mobile 1.51)', () => {
  it('a pushed /play leaves ONE (tabs) in the root stack, on Practice with ?section=drills', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => router.push('/play'));
    // Play opens Practice by itself, once it has drawn: let its effect and the router run.
    await go(() => {});
    expect(names(r)).toEqual(['(tabs)']);
    expect(shownTab(rootStack(r)[0])).toBe('practice');
    expect(r.getPathnameWithParams()).toBe('/practice?section=drills');
    expect(screen.getByText('practice tab {"section":"drills"}')).toBeTruthy();
  });

  it('a cold /play link (nothing under it) lands on Practice at Drills, never a blank screen', async () => {
    const r = await renderRouter(APP, { initialUrl: '/play' });
    await go(() => {});
    expect(r.getPathnameWithParams()).toBe('/practice?section=drills');
    expect(names(r)).not.toContain('play');
    expect(names(r).filter((n) => n === '(tabs)')).toHaveLength(1);
  });
});

describe('readiness "Lessons and notes ›" → Learn', () => {
  it('leaves ONE (tabs) in the root stack, on Learn with ?domain=', async () => {
    const r = await renderRouter(APP, { initialUrl: '/home' });
    await go(() => router.push('/readiness'));
    const d = getCertification('cisa')!.domains[2];
    await go(() => fireEvent.press(screen.getByLabelText(`Lessons and notes for ${d.name}`)));
    expect(names(r)).toEqual(['(tabs)']);
    expect(shownTab(rootStack(r)[0])).toBe('learn');
    expect(r.getPathnameWithParams()).toBe(`/learn?domain=${d.id}`);
  });
});
