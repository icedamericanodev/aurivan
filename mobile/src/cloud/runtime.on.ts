/**
 * The cloud runtime when the flag is ON. Only cloud/backend.ts loads it,
 * behind an inline build-time check, so it is not in an OFF build at all.
 *
 * Today (Phase 6, built OFF) the only backend is the in-memory one, and only
 * for a dev build (__DEV__) or the WEB screenshot build
 * (EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND=memory with EXPO_PUBLIC_AURIVAN_SHOTS=1,
 * exported for the web by scripts/screenshots/run.sh). A native release
 * binary can never build it, whatever an EAS environment sets: a release
 * build isn't __DEV__, and on a phone Platform.OS is never 'web'. Phase 9
 * (go-live) builds the Supabase adapter here (src/cloud/supabase/), with the
 * session in the phone's secure key store, Sign in with Apple and Google
 * Sign-In; app.config.ts then calls cloud/configGuard.ts.
 */
import { Platform } from 'react-native';
import type { CloudBackend } from './types';

function make(): CloudBackend | null {
  // The env values are build-time literals in a release build, so in a store
  // build without them this branch (and the memory backend with it) is removed;
  // with them, Platform.OS still keeps it off every phone.
  const shotsOnWeb = process.env.EXPO_PUBLIC_AURIVAN_SHOTS === '1' && Platform.OS === 'web';
  if (process.env.EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND === 'memory' && (__DEV__ || shotsOnWeb)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMemoryBackend } = require('./memory/backend') as typeof import('./memory/backend');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { shotsSeed } = require('./memory/seed') as typeof import('./memory/seed');
    return createMemoryBackend(shotsSeed());
  }
  // Phase 9: return the Supabase adapter here. Until then a cloud build has
  // no backend, and every cloud screen redirects to Today.
  return null;
}

export const backend: CloudBackend | null = make();
