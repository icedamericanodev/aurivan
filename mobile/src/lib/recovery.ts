/**
 * What the recovery screen's buttons do (components/recovery.tsx).
 *
 * Plain English for the founder:
 * - "Report this" opens the learner's own email app with a short support
 *   email. It names the app version and phone system (as every report does)
 *   and WHICH kind of saved data would not open, e.g. "progress". It never
 *   includes the saved data itself or anything personal.
 * - "Start fresh" erases the saved data on this phone and starts like a new
 *   install. The screen asks first, and says plainly that it cannot be undone.
 *   Only the app's own saved keys are removed (every key shares the prefix of
 *   the stores' names, which was kept on purpose so nobody loses progress to the
 *   rename; the prefix is read from the store, not typed here).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSupportEmail } from '../engine/support';
import { clearHydrationFailures, failedStoreNames } from '../store/hydration';
import { useProgress } from '../store/progress';
import { hydratedStores } from '../store/useHydrated';
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

/**
 * Erase every saved key the app owns, put each store back to its starting
 * state, and load again. Throws if the phone refuses (the screen then says so).
 */
export async function startFresh(): Promise<void> {
  const prefix = `${(useProgress.persist.getOptions().name ?? '').split('.')[0]}.`;
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => prefix.length > 1 && k.startsWith(prefix));
  await AsyncStorage.multiRemove(keys);
  clearHydrationFailures();
  // The five stores have different state types; here they are only reset, so view them alike.
  for (const s of hydratedStores as unknown as ResettableStore[]) {
    // The in-memory copy goes back to its first state too (a store that DID load
    // would otherwise write its old data back), then loading finds nothing saved.
    s.setState(s.getInitialState(), true);
    await Promise.resolve(s.persist.rehydrate());
  }
}
