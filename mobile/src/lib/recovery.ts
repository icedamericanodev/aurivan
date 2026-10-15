/**
 * What the recovery screen's buttons do (components/recovery.tsx).
 *
 * Plain English for the founder:
 * - "Report this" opens the learner's own email app with a short support
 *   email. It names the app version and phone system (as every report does)
 *   and WHICH kind of saved data would not open, e.g. "progress". It never
 *   includes the saved data itself or anything personal.
 * - "Start fresh" erases ONLY the saved data that would not open (for
 *   example just the "already seen" record, or just the progress), and keeps
 *   everything that loaded fine: a damaged badge log must never cost months
 *   of study. The screen asks first, names exactly what will be erased, and
 *   says plainly that it cannot be undone. When nothing actually failed (the
 *   load was only slow, over 8 seconds), there is nothing to erase, so the
 *   button is not offered at all: Try again and Report this are.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSupportEmail } from '../engine/support';
import { clearHydrationFailures, failedStoreNames } from '../store/hydration';
import { hydratedStoresByName, type HydratedStoreName } from '../store/useHydrated';
import { appInfo, openEmail } from './support';

/** What startFresh needs from each store. */
interface ResettableStore {
  setState: (state: unknown, replace: true) => unknown;
  getInitialState: () => unknown;
  persist: { rehydrate: () => unknown };
}

/** Open the email app with a support note about the failure. No personal data. */
export async function reportLoadProblem(what: string): Promise<'opened' | 'failed'> {
  const names = failedStoreNames();
  const from = names.length > 0 ? `${what}: ${names.join(', ')}` : what;
  const email = buildSupportEmail({ topic: 'other', certName: 'CISA', app: appInfo(), from });
  return openEmail(email);
}

/** The stores whose load failed and that Start fresh can reset (empty after a pure timeout). */
export function freshTargets(): HydratedStoreName[] {
  return failedStoreNames().filter((n): n is HydratedStoreName => n in hydratedStoresByName);
}

/** freshTargets() as one string, so a screen can listen to it (useSyncExternalStore needs a stable value). */
export function freshTargetsKey(): string {
  return freshTargets().join(',');
}

/**
 * Erase the saved data of the stores that FAILED to load (and only those),
 * put each of them back to its starting state, and load again. Stores that
 * loaded fine keep their data. Nothing failed: nothing is erased. Throws if
 * the phone refuses (the screen then says so).
 */
export async function startFresh(): Promise<void> {
  const stores = freshTargets().map((n) => hydratedStoresByName[n]);
  if (stores.length === 0) return;
  const keys = stores.map((s) => s.persist.getOptions().name).filter((k): k is string => typeof k === 'string' && k.length > 0);
  await AsyncStorage.multiRemove(keys);
  clearHydrationFailures();
  // The stores have different state types; here they are only reset, so view them alike.
  for (const s of stores as unknown as ResettableStore[]) {
    // The in-memory copy goes back to its first state too, then loading finds nothing saved.
    s.setState(s.getInitialState(), true);
    await Promise.resolve(s.persist.rehydrate());
  }
}
