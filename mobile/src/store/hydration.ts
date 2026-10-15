/**
 * Knowing when saved data FAILED to load.
 *
 * Plain English for the founder: when the app opens, each store reads its
 * saved data from the phone. If that read (or the upgrade of an old save)
 * throws an error, the zustand library never says "done" and, before this
 * file, the app sat on the splash screen forever with no message.
 *
 * Now every persisted store passes `onRehydrateStorage: watchHydration(name)`
 * in its options. When a load fails, the store's name is noted here, and
 * `useHydration()` (useHydrated.ts) shows the recovery screen instead of
 * waiting. A later successful load clears the note.
 *
 * No React, no storage: just a small list and a way to listen to it.
 */

/** Stores whose last load failed, with the error each one threw. */
const failed = new Map<string, unknown>();
const listeners = new Set<() => void>();

const tell = () => listeners.forEach((cb) => cb());

/**
 * Put this in a persisted store's options:
 *   onRehydrateStorage: watchHydration('progress')
 * zustand calls it when a load starts and the inner function when the load
 * ends, with an error if it failed.
 */
// The result is typed `any` on purpose: if it carried a state type, TypeScript would use it to
// guess each store's state type (and guess wrong). The store files stay fully typed.
export function watchHydration(name: string): any {
  return () => (_state?: unknown, error?: unknown) => {
    if (error) failed.set(name, error);
    else failed.delete(name);
    tell();
  };
}

/** True when at least one store failed to load. */
export function hasHydrationFailure(): boolean {
  return failed.size > 0;
}

/** The names of the stores that failed (for a support email: names only, never the data). */
export function failedStoreNames(): string[] {
  return [...failed.keys()];
}

/** Forget past failures (before "Try again", or after "Start fresh"). */
export function clearHydrationFailures(): void {
  if (failed.size === 0) return;
  failed.clear();
  tell();
}

/** Listen for changes (for useSyncExternalStore). Returns the unsubscribe function. */
export function subscribeHydration(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
