/**
 * Uplift Phase 6 (accounts, built OFF): with the flag off — every build
 * today — the app is exactly what it was. Spec PHASE6_8.md §1.6:
 * - G4: no network. fetch and XMLHttpRequest throw if touched; Today, Learn,
 *   Practice, Play, You, Settings, Help, What's new and a session render
 *   without touching either.
 * - G5: the (cloud) routes redirect to Today, and no backend method runs,
 *   even with a backend present (a deep link can't reach a cloud screen).
 * - No account UI anywhere, and the account store is never read or written.
 *
 * (A run with EXPO_PUBLIC_AURIVAN_CLOUD=1 skips this file: it is about OFF.)
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { CLOUD } from '../cloud/flag';
import { createMemoryBackend } from '../cloud/memory/backend';
import { getAllQuestions } from '../content/loader';
import { startFromIds } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

const mockRedirects: string[] = [];
jest.mock('expo-router', () => {
  const base = require('../../jest/perf/focusRouter').routerMock();
  const Stack = function MockStack() {
    return null;
  };
  Stack.Screen = function MockStackScreen() {
    return null;
  };
  return {
    ...base,
    Redirect: ({ href }: { href: string }) => {
      mockRedirects.push(href);
      return null;
    },
    Stack,
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
});
jest.mock('../components/brand', () => ({ BrandLockup: () => null, PillarList: () => null, BrandMark: () => null }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {}, medium: () => {} } }));

const offRun = process.env.EXPO_PUBLIC_AURIVAN_CLOUD !== '1';
const describeOff = offRun ? describe : describe.skip;

let r: ReactTestRenderer | undefined;
const mount = (el: ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};

// G4: any network use throws AND is counted (a swallowed throw still counts).
let netCalls = 0;
const realFetch = global.fetch;
const realXHR = global.XMLHttpRequest;
beforeAll(() => {
  global.fetch = jest.fn(() => {
    netCalls++;
    throw new Error('network used with the cloud flag off');
  }) as unknown as typeof fetch;
  global.XMLHttpRequest = function NoXHR() {
    netCalls++;
    throw new Error('network used with the cloud flag off');
  } as unknown as typeof XMLHttpRequest;
});
afterAll(() => {
  global.fetch = realFetch;
  global.XMLHttpRequest = realXHR;
});

beforeEach(() => {
  jest.useFakeTimers();
  netCalls = 0;
  mockRedirects.length = 0;
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ activeCertId: 'cisa', onboarded: true, theme: 'light' });
});
afterEach(() => {
  unmount();
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  setBackendForTests(undefined);
});

describeOff('the cloud flag is off', () => {
  it('CLOUD is false', () => {
    expect(CLOUD).toBe(false);
  });

  const SCREENS: Record<string, () => ComponentType> = {
    today: () => require('../app/(tabs)/home').default,
    learn: () => require('../app/(tabs)/learn').default,
    practice: () => require('../app/(tabs)/practice').default,
    play: () => require('../app/(tabs)/play').default,
    you: () => require('../app/(tabs)/you').default,
    settings: () => require('../app/settings').default,
    help: () => require('../app/help').default,
    'whats-new': () => require('../app/whats-new').default,
  };

  it.each(Object.keys(SCREENS))('G4: %s renders with no network and no account UI', async (name) => {
    const AS = require('@react-native-async-storage/async-storage');
    const storage = AS.default ?? AS;
    const getItem = jest.spyOn(storage, 'getItem');
    const setItem = jest.spyOn(storage, 'setItem');
    const Screen = SCREENS[name]();
    mount(<Screen />);
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(netCalls).toBe(0);
    const text = allText();
    for (const words of ['Sync across devices', 'Account and sync', 'Not signed in', 'Continue with', 'Delete account', 'Progress is stored on this device.']) {
      expect(text).not.toContain(words);
    }
    // The account store is never read or written with the flag off.
    expect(getItem.mock.calls.map((c) => c[0])).not.toContain('aurivan.account.v1');
    expect(setItem.mock.calls.map((c) => c[0])).not.toContain('aurivan.account.v1');
    if (name === 'settings') expect(text).toContain('Progress is stored only on this device.');
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('G4: a practice session renders and answers with no network', () => {
    const ids = getAllQuestions('cisa').slice(0, 3).map((q) => q.id);
    startFromIds('cisa', ids, 'T');
    const Session = require('../app/session').default as ComponentType;
    mount(<Session />);
    const option = r!.root.findAll((n) => typeof n.props.onPress === 'function' && /^Option [A-D]:/.test(String(n.props.accessibilityLabel)))[0];
    act(() => {
      option.props.onPress();
    });
    expect(netCalls).toBe(0);
  });

  it.each(['/account', '/account/delete', '/account/sign-in', '/account/email', '/board', '/board/0b9e7c1a-1111-4222-8333-444455556666', '/board/new'])(
    'G5: %s lands on Today, and no backend method runs',
    (path) => {
      // Even with a backend present, the flag decides (and a hostile link's params change nothing).
      const memory = createMemoryBackend();
      setBackendForTests(memory);
      const routeParams = require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>;
      Object.assign(routeParams, { confirm: 'DELETE', scope: 'global', path });
      const Layout = require('../app/(cloud)/_layout').default as ComponentType;
      mount(<Layout />);
      expect(mockRedirects).toEqual(['/']);
      expect(memory.control.calls).toEqual([]);
      for (const k of ['confirm', 'scope', 'path']) delete routeParams[k];
    },
  );

  it('account start-up does nothing, even with a backend present', async () => {
    const memory = createMemoryBackend();
    setBackendForTests(memory);
    const lib = require('../lib/account');
    expect(lib.cloudReady()).toBe(false);
    await expect(lib.initAccount()).resolves.toEqual(expect.any(Function));
    expect(memory.control.calls).toEqual([]);
  });
});
