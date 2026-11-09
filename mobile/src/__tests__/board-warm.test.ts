/**
 * Expo SDK 58: React Native 0.88 removed InteractionManager, which the board's
 * composer used to build the leak guard's fingerprint "after the screen has
 * opened" (lib/board.ts warmLeakGuard, CR N9). It now waits for the phone's
 * next idle moment (requestIdleCallback), or a short timer where there is none.
 *
 * - With an idle callback: nothing is built until the phone is idle; then it is.
 * - Leaving the composer first (cancel) stops it, through cancelIdleCallback.
 * - Without one (an older runtime): a timer builds it, and cancel stops that too.
 */
import { clearContentCaches } from '../content/packs/registry';
import { warmLeakGuard } from '../lib/board';
import { bankFingerprintReady } from '../lib/leakIndex';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Idle = { requestIdleCallback?: unknown; cancelIdleCallback?: unknown };
const g = globalThis as Idle;
const saved = { request: g.requestIdleCallback, cancel: g.cancelIdleCallback };

beforeEach(() => {
  clearContentCaches(); // a fresh fingerprint cache for each test
});
afterEach(() => {
  g.requestIdleCallback = saved.request;
  g.cancelIdleCallback = saved.cancel;
  jest.useRealTimers();
});

describe('warmLeakGuard (no InteractionManager since React Native 0.88)', () => {
  it('builds the fingerprint at the next idle moment, not before', () => {
    const pending: { cb: () => void; opts: unknown }[] = [];
    g.requestIdleCallback = jest.fn((cb: () => void, opts: unknown) => pending.push({ cb, opts }));
    g.cancelIdleCallback = jest.fn();
    warmLeakGuard('cisa');
    expect(bankFingerprintReady('cisa')).toBe(false);
    expect(pending).toHaveLength(1);
    expect(pending[0].opts).toEqual({ timeout: 1500 }); // never waits forever on a busy phone
    pending[0].cb();
    expect(bankFingerprintReady('cisa')).toBe(true);
  });

  it('leaving the composer first cancels the idle callback', () => {
    g.requestIdleCallback = jest.fn(() => 42);
    g.cancelIdleCallback = jest.fn();
    warmLeakGuard('cisa').cancel();
    expect(g.cancelIdleCallback).toHaveBeenCalledWith(42);
    expect(bankFingerprintReady('cisa')).toBe(false);
  });

  it('without an idle callback, a timer builds it, and cancel stops the timer', () => {
    g.requestIdleCallback = undefined;
    g.cancelIdleCallback = undefined;
    jest.useFakeTimers();
    warmLeakGuard('cisa').cancel();
    jest.runAllTimers();
    expect(bankFingerprintReady('cisa')).toBe(false);
    warmLeakGuard('cisa');
    expect(bankFingerprintReady('cisa')).toBe(false);
    jest.runAllTimers();
    expect(bankFingerprintReady('cisa')).toBe(true);
  });
});
