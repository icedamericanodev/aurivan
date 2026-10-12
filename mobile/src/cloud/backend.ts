/**
 * Where screens and lib/ code get the cloud backend from (spec §1.2).
 *
 * - Flag OFF (every build today): `getBackend()` is null.
 * - Flag ON: the backend runtime.on.ts builds (the memory backend in dev and
 *   screenshot builds; Supabase from Phase 9).
 * - Tests: `setBackendForTests(memoryBackend)`.
 *
 * The check below reads the env variable INLINE on purpose: it becomes a
 * literal at build time, and the bundler drops the `require` of the ON
 * runtime when the flag is off. (Reading `CLOUD` from flag.ts here would
 * keep it, because the bundler doesn't fold values across files.)
 */
import type { CloudBackend } from './types';

/** undefined = not loaded yet. */
let loaded: CloudBackend | null | undefined;
/** undefined = no test override. */
let override: CloudBackend | null | undefined;

function load(): CloudBackend | null {
  if (process.env.EXPO_PUBLIC_AURIVAN_CLOUD === '1') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./runtime.on') as typeof import('./runtime.on')).backend;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./runtime.off') as typeof import('./runtime.off')).backend;
}

/** The cloud backend, or null when this build has none (always, with the flag off). */
export function getBackend(): CloudBackend | null {
  if (override !== undefined) return override;
  if (loaded === undefined) loaded = load();
  return loaded;
}

/** Tests: use this backend (null = none); undefined goes back to the real one. */
export function setBackendForTests(b: CloudBackend | null | undefined) {
  override = b;
}
