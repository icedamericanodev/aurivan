/**
 * Demo data for the memory backend in the screenshot build (SHOTS=cloud,
 * spec §1.7) and dev builds: one demo learner, maya@example.com, and a
 * second device's synced snapshot (for PR 7's screens).
 *
 * The screenshot script picks the starting state per page load through
 * localStorage key `aurivan.shots.cloud` (web only), JSON:
 *   { "signedIn": true, "authAgeMin": 30, "offline": false, "providers": ["email"] }
 * Missing or unreadable = signed out. `authAgeMin` = how long ago Maya last
 * signed in (over 10 minutes, deleting her account asks her to confirm it's
 * her first). `providers` = her sign-in methods (default email and Google;
 * email only shows the delete screen's email code step).
 *
 * The board's 12 posts, held post, report and staff account arrive with
 * PR 8, when the memory backend gains the board.
 */
import Constants from 'expo-constants';
import { ALL_PROVIDERS, TERMS_VERSION, type Provider } from '../../engine/account';
import type { MemoryOptions } from './backend';

export const DEMO_USER_ID = 'mem-user-maya';
export const DEMO_EMAIL = 'maya@example.com';
/** Every code the demo sends (so a screenshot can type it). */
export const DEMO_CODE = '246810';

interface ShotsState {
  signedIn?: boolean;
  authAgeMin?: number;
  offline?: boolean;
  providers?: Provider[];
}

function readShotsState(): ShotsState {
  try {
    const raw = (globalThis as { localStorage?: { getItem(k: string): string | null } }).localStorage?.getItem('aurivan.shots.cloud');
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === 'object' ? (v as ShotsState) : {};
  } catch {
    return {};
  }
}

/** Maya's sign-in methods: the known ones from the state, or email and Google. */
function demoProviders(raw: unknown): Provider[] {
  const list = Array.isArray(raw) ? ALL_PROVIDERS.filter((p) => raw.includes(p)) : [];
  return list.length ? list : ['email', 'google'];
}

export function shotsSeed(now = Date.now()): MemoryOptions {
  const state = readShotsState();
  const day = 86_400_000;
  return {
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    fixedCode: DEMO_CODE,
    offline: state.offline === true,
    users: [{ userId: DEMO_USER_ID, email: DEMO_EMAIL, providers: demoProviders(state.providers), termsVersion: TERMS_VERSION, createdAt: now - 30 * day }],
    signedIn: state.signedIn ? { userId: DEMO_USER_ID, authAt: now - (state.authAgeMin ?? 1) * 60_000 } : null,
    snapshots: {
      [DEMO_USER_ID]: {
        settings: {
          store: 'settings',
          rev: 3,
          appVersion: '1.17.0',
          storeVersion: 1,
          updatedAt: now - 2 * day,
          deviceId: '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e',
          state: { activeCertId: 'cisa' },
        },
      },
    },
  };
}
