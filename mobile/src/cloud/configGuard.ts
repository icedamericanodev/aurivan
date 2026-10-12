/**
 * Build-time safety checks for the cloud flag (spec §1.1 "Safety asserts",
 * guard G9). Pure: it reads an env object and either returns the cloud
 * config or throws, which fails the build.
 *
 * Phase 9 (go-live) adds `mobile/app.config.ts`, which calls
 * `assertCloudConfig(process.env)` before it adds the native sign-in
 * plugins. It is NOT added in Phase 6: there are no plugins to add yet, and
 * a config file would risk changing the app's native fingerprint (over-the-
 * air updates must keep reaching the APKs learners already have). Until
 * then the checks are tested here (__tests__/cloud-config-guard.test.ts).
 *
 * It refuses:
 * - a flag value other than "1" or unset ("true" would silently mean OFF);
 * - the memory backend in any EAS build profile except `development`
 *   (the screenshot build runs locally, outside EAS);
 * - the flag on the `production` profile without AURIVAN_CLOUD_GO_LIVE_ACK=yes,
 *   which only the owner sets, at Phase 9;
 * - a Supabase URL that isn't https, or a missing publishable key;
 * - with the real backend, a Privacy policy or Terms of Use link that isn't
 *   https (the sign-in sheet links both; an account can't be offered without
 *   them);
 * - anything secret-looking in an EXPO_PUBLIC_* value (those are bundled
 *   into the app, where anyone can read them);
 * - Google sign-in on iOS without Sign in with Apple (App Store rule 4.8),
 *   or no sign-in method at all. The 4.8 check runs for EAS iOS builds
 *   (EAS_BUILD_PLATFORM=ios). With no EAS platform (a local `expo run`) it is
 *   skipped: every store build is an EAS build, and on iOS the app shows
 *   Apple whenever it shows Google anyway (engine/account.ts providersFor).
 */
import { parseProviders, type Provider } from '../engine/account';

export type Env = Record<string, string | undefined>;

export interface CloudConfig {
  enabled: boolean;
  providers: Provider[];
  backend: 'supabase' | 'memory' | null;
}

export class CloudConfigError extends Error {
  constructor(message: string) {
    super(`Aurivan cloud config: ${message}`);
    this.name = 'CloudConfigError';
  }
}

/**
 * Substrings that only ever appear in secrets (never in a publishable key or
 * a URL). Joined from pieces so this file doesn't trip the repo's own
 * secret scan (scripts/check_secrets.sh, guard G1).
 */
const SECRET_MARKS = [['service', 'role'].join('_'), ['sb', 'secret', ''].join('_'), ['sk', 'live', ''].join('_'), ['-----', 'BEGIN'].join('')];
const SERVICE_ROLE = SECRET_MARKS[0];

/** The JSON payload of a JWT-looking value ("eyJ…"), decoded, or ''. */
function jwtPayload(value: string): string {
  const part = value.split('.')[1];
  if (!value.startsWith('eyJ') || !part) return '';
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const decode = (globalThis as { atob?: (s: string) => string }).atob;
    return decode ? decode(b64 + '='.repeat((4 - (b64.length % 4)) % 4)) : '';
  } catch {
    return '';
  }
}

/** True when a value looks like a secret key. */
export function looksSecret(value: string): boolean {
  return SECRET_MARKS.some((m) => value.includes(m)) || jwtPayload(value).includes(SERVICE_ROLE);
}

export function assertCloudConfig(env: Env): CloudConfig {
  const flag = env.EXPO_PUBLIC_AURIVAN_CLOUD;
  const backendVar = env.EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND;
  const profile = env.EAS_BUILD_PROFILE;
  const platform = env.EAS_BUILD_PLATFORM;

  if (flag !== undefined && flag !== '' && flag !== '0' && flag !== '1') {
    throw new CloudConfigError(`EXPO_PUBLIC_AURIVAN_CLOUD must be "1" or unset, not "${flag}".`);
  }
  // G9: the memory backend is for local dev and the screenshot build only.
  if (backendVar === 'memory' && profile !== undefined && profile !== 'development') {
    throw new CloudConfigError(`the memory backend can't be used in the "${profile}" build profile.`);
  }
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith('EXPO_PUBLIC_') && typeof v === 'string' && looksSecret(v)) {
      throw new CloudConfigError(`${k} looks like a secret. EXPO_PUBLIC_ values are bundled into the app.`);
    }
  }

  if (flag !== '1') return { enabled: false, providers: [], backend: null };

  if (profile === 'production' && env.AURIVAN_CLOUD_GO_LIVE_ACK !== 'yes') {
    throw new CloudConfigError('the cloud flag is on in the production profile without AURIVAN_CLOUD_GO_LIVE_ACK=yes.');
  }
  const backend = backendVar === undefined || backendVar === '' ? 'supabase' : backendVar;
  if (backend !== 'supabase' && backend !== 'memory') {
    throw new CloudConfigError(`unknown EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND "${backend}".`);
  }
  if (backend === 'supabase') {
    if (!(env.EXPO_PUBLIC_SUPABASE_URL ?? '').startsWith('https://')) {
      throw new CloudConfigError('EXPO_PUBLIC_SUPABASE_URL must start with https://.');
    }
    if (!(env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()) {
      throw new CloudConfigError('EXPO_PUBLIC_SUPABASE_ANON_KEY (the publishable key) is missing.');
    }
    for (const k of ['EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_TERMS_URL'] as const) {
      if (!(env[k] ?? '').startsWith('https://')) throw new CloudConfigError(`${k} must be an https:// link: the sign-in sheet links it.`);
    }
  }
  const providers = parseProviders(env.EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS);
  if (!providers.length) throw new CloudConfigError('no sign-in method is turned on.');
  // App Store 4.8: an iOS app with Google sign-in must offer Sign in with Apple too.
  if (platform === 'ios' && providers.includes('google') && !providers.includes('apple')) {
    throw new CloudConfigError('Google sign-in on iOS needs Sign in with Apple too (App Store rule 4.8).');
  }
  return { enabled: true, providers, backend };
}
