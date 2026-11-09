/**
 * Hold a covered screen still (release bug hunt round 3).
 *
 * Plain English for the founder: a screen stays mounted under the screens pushed on top of it.
 * The badge case, left open under a "Study for this" session, rebuilt every badge and redrew about
 * 670 components on every Check answer, although nobody could see it. A screen wraps itself in
 * <HoldContext.Provider value={!focused}>, and the shared reads below (useActiveCert,
 * usePlantView) then keep the value they last read while it is covered. When it is in view again
 * they read the live store once more. Screens without the provider are never held (the default).
 */
import { createContext, useContext, useMemo } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

/** True while the screen around is covered: store reads keep the value last read. */
export const HoldContext = createContext(false);

/**
 * `useStore(select)`, held while the screen is covered. `key` names what `select` depends on (for
 * example the exam id): a new key reads afresh. While held, a store change re-renders nothing.
 */
export function useHeld<S, T>(useStore: UseBoundStore<StoreApi<S>>, select: (s: S) => T, key: string): T {
  return useHeldWhen(useContext(HoldContext), useStore, select, key);
}

/** The same, with the hold given directly (a screen that knows its own focus: Today). */
export function useHeldWhen<S, T>(hold: boolean, useStore: UseBoundStore<StoreApi<S>>, select: (s: S) => T, key: string): T {
  const pick = useMemo(() => {
    if (!hold) return select;
    // The value at the moment the screen was covered: the one it shows.
    const last = select(useStore.getState());
    return () => last;
    // `select` and `useStore` are fixed for a given key (they only close over what the key names).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold, key]);
  return useStore(pick);
}
