/**
 * Saved data loads from the phone asynchronously. `useHydration()` tells the
 * root layout where that stands, so the app never flashes the onboarding
 * screen at someone who already finished it, AND never waits forever.
 *
 * Plain English for the founder - three possible answers:
 *   'loading'  still reading saved data (the splash screen stays up)
 *   'ready'    every store has loaded: show the app
 *   'failed'   a store threw while loading (a damaged value, a failed upgrade,
 *              a storage error), or loading took longer than 8 seconds:
 *              show the recovery screen (components/recovery.tsx)
 *
 * `retry()` is "Try again": it forgets the old failure and asks every store
 * that is not loaded to read its data again.
 *
 * (Why the 8 seconds: zustand never says "done" if a read throws, so before
 * this the app sat on the splash screen forever. See store/hydration.ts.)
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useBackup } from './backup';
import { clearHydrationFailures, hasHydrationFailure, subscribeHydration } from './hydration';
import { useProgress } from './progress';
import { useSeen } from './seen';
import { useSession } from './session';
import { useSettings } from './settings';

// useBackup too: the undo snapshot must be loaded before anything can restore.
// useSeen (mobile 1.9): numbers grow from what was last shown, so it loads first too.
export const hydratedStores = [useSettings, useProgress, useSession, useBackup, useSeen];

/**
 * The same stores, by the name each one passes to watchHydration (store/hydration.ts).
 * "Start fresh" (lib/recovery.ts) uses it to reset ONLY the stores that failed to load.
 */
export const hydratedStoresByName = { settings: useSettings, progress: useProgress, session: useSession, backup: useBackup, seen: useSeen } as const;
export type HydratedStoreName = keyof typeof hydratedStoresByName;

/** How long loading may take before the recovery screen is offered. */
export const HYDRATION_TIMEOUT_MS = 8000;

export type HydrationStatus = 'loading' | 'ready' | 'failed';

const allHydrated = () => hydratedStores.every((s) => s.persist.hasHydrated());

export function useHydration(): { status: HydrationStatus; retry: () => void } {
  const [ready, setReady] = useState(allHydrated);
  const [timedOut, setTimedOut] = useState(false);
  // Counts "Try again" taps, so the 8 second timer starts over each time.
  const [attempt, setAttempt] = useState(0);
  const failed = useSyncExternalStore(subscribeHydration, hasHydrationFailure, hasHydrationFailure);

  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (allHydrated()) setReady(true);
    };
    const unsubs = hydratedStores.map((s) => s.persist.onFinishHydration(check));
    check();
    const timer = setTimeout(() => setTimedOut(true), HYDRATION_TIMEOUT_MS);
    return () => {
      unsubs.forEach((u) => u());
      clearTimeout(timer);
    };
  }, [ready, attempt]);

  const retry = useCallback(() => {
    clearHydrationFailures();
    setTimedOut(false);
    setAttempt((a) => a + 1);
    // Only the stores that have not loaded read again; a loaded store keeps its data.
    for (const s of hydratedStores) {
      if (!s.persist.hasHydrated()) Promise.resolve(s.persist.rehydrate()).catch(() => {});
    }
  }, []);

  const status: HydrationStatus = ready ? 'ready' : failed || timedOut ? 'failed' : 'loading';
  return { status, retry };
}

/** True once ALL stores have finished loading (kept for callers that only need this). */
export function useHydrated(): boolean {
  return useHydration().status === 'ready';
}
