/**
 * Release bug hunt round 3: on a fresh install, an outside link to a real screen (kaisip://home,
 * kaisip://settings?section=data…) opened that screen and skipped onboarding. Now:
 * - saved settings loaded: the link goes to "/" (app/index.tsx opens onboarding) until onboarding is
 *   done; "/", onboarding and the widget link (it checks on its own) pass through;
 * - a cold start (settings still loading): the link is noted, and the root layout's gate sends a
 *   learner who has not onboarded to "/" once settings and the router are ready;
 * - an onboarded learner's links pass through unchanged.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { redirectSystemPath } from '../app/+native-intent';
import { linkRoute, needsOnboardingFirst, redirectNotOnboardedPath } from '../lib/legacyLinks';
import { OutsideLinkGate } from '../lib/outsideLinkGate';
import { noteOutsideLink, outsideLinkPending, takeOutsideLink } from '../lib/outsideLinkNote';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useRootNavigationState: () => ({ key: 'root' }),
}));

const SCREENS = ['kaisip://home', 'kaisip://practice?section=drills', 'kaisip://settings?section=data', 'kaisip://glossary?q=RTO', 'kaisip://session'];
const OPEN = ['kaisip://', 'kaisip://onboarding', 'kaisip://widget?kind=plan&go=start', '/', 'exp://192.168.1.2:8081'];

beforeAll(async () => {
  await useSettings.persist.rehydrate();
});
beforeEach(() => {
  jest.mocked(router.replace).mockClear();
  takeOutsideLink();
});

describe('the pure rule', () => {
  it('reads the screen part of a link', () => {
    expect(linkRoute('kaisip://settings?section=data')).toBe('settings');
    expect(linkRoute('kaisip://')).toBe('');
    expect(linkRoute('exp://192.168.1.2:8081/--/Home/')).toBe('home');
    expect(linkRoute('/glossary#x')).toBe('glossary');
  });
  it('real screens need onboarding first; the start, onboarding and the widget link do not', () => {
    for (const p of SCREENS) expect([p, needsOnboardingFirst(p)]).toEqual([p, true]);
    for (const p of OPEN) expect([p, needsOnboardingFirst(p)]).toEqual([p, false]);
    expect(redirectNotOnboardedPath('kaisip://home', false)).toBe('/');
    expect(redirectNotOnboardedPath('kaisip://home', true)).toBe('kaisip://home');
  });
});

describe('the link hook (saved settings loaded)', () => {
  it('not onboarded: every link to a real screen goes to "/"', () => {
    useSettings.setState({ onboarded: false });
    expect(useSettings.persist.hasHydrated()).toBe(true);
    for (const p of SCREENS) expect([p, redirectSystemPath({ path: p, initial: true })]).toEqual([p, '/']);
    for (const p of OPEN) expect([p, redirectSystemPath({ path: p, initial: false })]).toEqual([p, p]);
    expect(outsideLinkPending()).toBe(false);
  });
  it('onboarded: links pass through unchanged', () => {
    useSettings.setState({ onboarded: true });
    for (const p of SCREENS) expect(redirectSystemPath({ path: p, initial: true })).toBe(p);
  });
});

describe('a cold start (saved settings still loading)', () => {
  it('the link is noted, and the gate sends a learner who has not onboarded to "/"', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(useSettings.persist, 'hasHydrated').mockReturnValue(false);
    try {
      useSettings.setState({ onboarded: false });
      expect(redirectSystemPath({ path: 'kaisip://settings?section=data', initial: true })).toBe('kaisip://settings?section=data');
      expect(outsideLinkPending()).toBe(true);
      spy.mockReturnValue(true);
      let r: ReactTestRenderer | undefined;
      act(() => {
        r = create(<OutsideLinkGate ready />);
      });
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(router.replace).toHaveBeenCalledWith('/');
      expect(outsideLinkPending()).toBe(false);
      act(() => r?.unmount());
    } finally {
      spy.mockRestore();
      jest.useRealTimers();
    }
  });
  it('an onboarded learner stays where the link went', () => {
    jest.useFakeTimers();
    try {
      useSettings.setState({ onboarded: true });
      noteOutsideLink();
      let r: ReactTestRenderer | undefined;
      act(() => {
        r = create(<OutsideLinkGate ready />);
      });
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(router.replace).not.toHaveBeenCalled();
      act(() => r?.unmount());
    } finally {
      jest.useRealTimers();
    }
  });
});
