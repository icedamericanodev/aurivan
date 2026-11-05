/**
 * Release bug hunt round 1: a link to a screen the app does not have (kaisip://course,
 * /nope) and Expo Router's /_sitemap land on Today, on the REAL router, never on
 * the developer "Unmatched Route" page or the list of screen files.
 */
import { Text } from 'react-native';
import { Stack, Tabs } from 'expo-router';
// The app's screens load BEFORE the router's test helper (see open-tab-journeys-router58.test.tsx).
import NotFound from '../app/+not-found';
import NoSitemap from '../app/_sitemap';
import Index from '../app/index';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { useSettings } from '../store/settings';
import { act, renderRouter, screen } from 'expo-router/testing-library';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const page = (name: string) =>
  function StandIn() {
    return <Text>{`${name} page`}</Text>;
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
  onboarding: page('onboarding'),
  help: page('help'),
  '+not-found': NotFound,
  _sitemap: NoSitemap,
};

beforeEach(() => {
  useSettings.setState(useSettings.getInitialState(), true);
});

describe('unknown links land on Today', () => {
  it.each(['/nope', '/course', '/game/flashcards', '/_sitemap'])('%s: Today, no "Unmatched Route" or Sitemap', async (url) => {
    useSettings.getState().completeOnboarding('cisa', addDays(dayKey(Date.now()), 21), { familiarity: 'some', dailyMinutes: 20 });
    const r = await renderRouter(APP, { initialUrl: url });
    await act(async () => {});
    expect(r.getPathname()).toBe('/home');
    expect(screen.getByText('home page')).toBeTruthy();
    expect(screen.queryByText('Unmatched Route')).toBeNull();
    expect(screen.queryByText('Sitemap')).toBeNull();
  });

  it('before onboarding is done: onboarding, through the index route', async () => {
    const r = await renderRouter(APP, { initialUrl: '/nope' });
    await act(async () => {});
    expect(r.getPathname()).toBe('/onboarding');
    expect(screen.queryByText('Unmatched Route')).toBeNull();
  });
});
