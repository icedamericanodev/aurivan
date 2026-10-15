/**
 * Mobile 1.24, stream S3b: the app no longer hangs on the splash screen when
 * saved data cannot be loaded.
 *
 * Plain English for the founder: before, a damaged value or a failed upgrade
 * in saved data left the app on a blank splash screen forever. These tests
 * make the phone's storage THROW (or never answer) and check that:
 *   - the failure is noticed (store/hydration.ts),
 *   - the app shows the recovery screen after the error, or after 8 seconds,
 *   - "Try again" loads the data once storage works,
 *   - "Report this" opens an email with no personal data,
 *   - "Start fresh" always asks first, and only then erases.
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { create as createStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { RecoveryScreen, RECOVERY_COPY } from '../components/recovery';
import { startFresh } from '../lib/recovery';
import { clearHydrationFailures, hasHydrationFailure, watchHydration } from '../store/hydration';
import { useProgress } from '../store/progress';
import { persistStorage } from '../store/storage';
import { HYDRATION_TIMEOUT_MS, useHydration, type HydrationStatus } from '../store/useHydrated';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.24.0' } } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const press = (label: string) => {
  const b = r!.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && textOf(n) === label)[0];
  act(() => {
    b.props.onPress();
  });
};
/** Let pending promises (the stores' reads) finish. */
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
};

let seen: HydrationStatus[] = [];
let retryFn: () => void = () => {};
function Probe() {
  const { status, retry } = useHydration();
  // Written in an effect (not while drawing) so the test helpers see the latest values.
  useEffect(() => {
    seen.push(status);
    retryFn = retry;
  });
  return null;
}
const last = () => seen[seen.length - 1];

beforeEach(async () => {
  seen = [];
  clearHydrationFailures();
  await flush();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.restoreAllMocks();
  jest.useRealTimers();
  clearHydrationFailures();
});

describe('a failed load is noticed', () => {
  it('a store whose storage throws is recorded as failed, and never says it is loaded', async () => {
    const broken = {
      getItem: () => {
        throw new Error('disk read failed');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const store = createStore<{ n: number }>()(persist(() => ({ n: 1 }), { name: 'broken', storage: broken, onRehydrateStorage: watchHydration('broken') }));
    await flush();
    expect(hasHydrationFailure()).toBe(true);
    expect(store.persist.hasHydrated()).toBe(false);
    // A later good load clears the note.
    store.persist.setOptions({ storage: { ...broken, getItem: () => null } });
    await store.persist.rehydrate();
    expect(store.persist.hasHydrated()).toBe(true);
    expect(hasHydrationFailure()).toBe(false);
  });

  it('a damaged save that cannot be upgraded is a failure too', async () => {
    const old = { getItem: () => ({ state: { n: 1 }, version: 0 }), setItem: () => undefined, removeItem: () => undefined };
    createStore<{ n: number }>()(
      persist(() => ({ n: 1 }), {
        name: 'old',
        storage: old,
        version: 2,
        migrate: () => {
          throw new Error('cannot migrate');
        },
        onRehydrateStorage: watchHydration('old'),
      }),
    );
    await flush();
    expect(hasHydrationFailure()).toBe(true);
  });
});

describe('useHydration: the recovery path', () => {
  it('ready when every store has loaded', async () => {
    mount(<Probe />);
    await flush();
    expect(last()).toBe('ready');
  });

  it('a storage read that throws shows "failed" at once; Try again loads it once storage works', async () => {
    const spy = jest.spyOn(persistStorage, 'getItem').mockImplementation(() => {
      throw new Error('AsyncStorage read failed');
    });
    await act(async () => {
      await useProgress.persist.rehydrate();
    });
    expect(useProgress.persist.hasHydrated()).toBe(false);
    mount(<Probe />);
    expect(last()).toBe('failed');
    // Storage is back: Try again.
    spy.mockRestore();
    act(() => {
      retryFn();
    });
    await flush();
    expect(last()).toBe('ready');
    expect(hasHydrationFailure()).toBe(false);
  });

  it('loading that takes over 8 seconds also becomes "failed", and a slow load that finishes after that is ready again', async () => {
    jest.useFakeTimers();
    let release: (v: null) => void = () => {};
    jest.spyOn(persistStorage, 'getItem').mockImplementation(() => new Promise((res) => (release = res)));
    act(() => {
      void useProgress.persist.rehydrate();
    });
    mount(<Probe />);
    expect(last()).toBe('loading');
    act(() => {
      jest.advanceTimersByTime(HYDRATION_TIMEOUT_MS - 1);
    });
    expect(last()).toBe('loading');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(last()).toBe('failed');
    // The slow read finally answers: the recovery screen goes away by itself.
    await act(async () => {
      release(null);
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(last()).toBe('ready');
  });
});

describe('the recovery screen', () => {
  it('is branded, names the problem in plain words and offers three ways out, the first one solid', () => {
    mount(<RecoveryScreen kind="load" onTryAgain={() => {}} />);
    const text = textOf(r!.root);
    expect(text).toContain(RECOVERY_COPY.loadTitle);
    for (const label of ['Try again', 'Report this', 'Start fresh']) {
      const b = r!.root.findAll((n) => n.props.accessibilityRole === 'button' && textOf(n) === label);
      expect(b.length).toBeGreaterThan(0);
    }
    expect(r!.root.findAll((n) => n.props.accessibilityLabel === 'KaiSip').length).toBeGreaterThan(0);
    expect(text).not.toMatch(/ISACA/);
  });

  it('a crashed screen gets the same layout, with no "Start fresh" (the saved data is fine)', () => {
    const retry = jest.fn();
    mount(<RecoveryScreen kind="crash" onTryAgain={retry} />);
    expect(textOf(r!.root)).toContain(RECOVERY_COPY.crashTitle);
    expect(textOf(r!.root)).not.toContain('Start fresh');
    press('Try again');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('"Report this" opens the email app with the app version only: no saved data, nothing personal', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    mount(<RecoveryScreen kind="load" onTryAgain={() => {}} />);
    await act(async () => {
      press('Report this');
    });
    expect(open).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(String(open.mock.calls[0][0]));
    expect(url).toMatch(/^mailto:/);
    expect(url).toContain('KaiSip');
    expect(url).toContain('Saved data would not open');
    expect(url).toContain('1.24.0');
    expect(textOf(r!.root)).toContain('Your email app is open');
  });

  it('"Start fresh" asks first and erases nothing until the learner confirms', async () => {
    await AsyncStorage.setItem('aurivan.progress.v1', '{"state":{"streak":{"current":9}},"version":2}');
    await AsyncStorage.setItem('someone-elses-key', 'keep');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount(<RecoveryScreen kind="load" onTryAgain={() => {}} />);
    press('Start fresh');
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = alert.mock.calls[0];
    expect(title).toBe(RECOVERY_COPY.freshTitle);
    expect(body).toMatch(/cannot be undone/);
    expect(await AsyncStorage.getItem('aurivan.progress.v1')).toContain('"current":9');
    // Cancel changes nothing.
    expect(buttons![0].text).toBe('Cancel');
    expect(await AsyncStorage.getItem('aurivan.progress.v1')).toContain('"current":9');
    // Confirm erases the app's own saved data (and only that).
    await act(async () => {
      buttons![1].onPress!();
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    expect(await AsyncStorage.getItem('aurivan.progress.v1')).not.toContain('"current":9');
    expect(await AsyncStorage.getItem('someone-elses-key')).toBe('keep');
  });
});

describe('startFresh', () => {
  it('puts every store back to its first state and leaves them loaded', async () => {
    await act(async () => {
      useProgress.setState({ streak: { current: 7, best: 7, lastDay: '2026-10-14' } });
    });
    await act(async () => {
      await startFresh();
    });
    expect(useProgress.getState().streak.current).toBe(0);
    expect(useProgress.persist.hasHydrated()).toBe(true);
  });
});
