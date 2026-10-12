/**
 * The cloud runtime when the flag is ON. Only cloud/backend.ts loads it,
 * behind an inline build-time check, so it is not in an OFF build at all.
 *
 * Today (Phase 6, built OFF) the only backend is the in-memory one, and only
 * for a dev build or the screenshot build
 * (EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND=memory with EXPO_PUBLIC_AURIVAN_SHOTS=1
 * or __DEV__). Phase 9 (go-live) builds the Supabase adapter here
 * (src/cloud/supabase/), with the session in the phone's secure key store,
 * Sign in with Apple and Google Sign-In; app.config.ts then calls
 * cloud/configGuard.ts so a store build can never use the memory backend.
 */
import type { CloudBackend } from './types';

function make(): CloudBackend | null {
  // Both sides are build-time literals in a release build, so in a store
  // build this branch (and the memory backend with it) is removed.
  if (process.env.EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND === 'memory' && (process.env.EXPO_PUBLIC_AURIVAN_SHOTS === '1' || __DEV__)) {
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
