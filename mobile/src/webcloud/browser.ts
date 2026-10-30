/**
 * The browser's own ports for the website client (accounts beta §1.1).
 * Each takes the browser object it wraps as an argument (never reads a
 * global itself), so Jest can hand in fakes.
 *
 * Pure TypeScript: no React. Nothing here runs until index.html calls it.
 */
import type { ClockPort, LockPort, RandomPort, StoragePort } from './ports';

/** navigator.locks, or (older Safari without it) a queue inside this page only. */
export function browserLocks(locks?: { request(name: string, cb: () => Promise<unknown>): Promise<unknown> } | null): LockPort {
  if (locks && typeof locks.request === 'function') {
    return { request: <T>(name: string, fn: () => Promise<T>) => locks.request(name, fn) as Promise<T> };
  }
  return pageLocks();
}

/** One holder at a time per name, within this page (the fallback, and the tests' "one tab"). */
export function pageLocks(): LockPort {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const prev = tails.get(name) ?? Promise.resolve();
      const run = prev.then(fn, fn);
      tails.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    },
  };
}

/** crypto.getRandomValues as a RandomPort. */
export function browserRandom(crypto: { getRandomValues(a: Uint8Array): Uint8Array }): RandomPort {
  return { bytes: (n) => crypto.getRandomValues(new Uint8Array(n)) };
}

/** Date.now as a ClockPort. */
export const browserClock: ClockPort = { now: () => Date.now() };

/** A storage that is always empty and refuses writes (storage blocked by the browser). */
export const noStorage: StoragePort = {
  getItem: () => null,
  setItem: () => {
    throw new Error('storage unavailable');
  },
  removeItem: () => {},
};

/** localStorage / sessionStorage, or noStorage when reading them throws (blocked cookies). */
export function browserStorage(get: () => StoragePort | null | undefined): StoragePort {
  try {
    return get() ?? noStorage;
  } catch {
    return noStorage;
  }
}
