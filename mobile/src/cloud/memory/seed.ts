/**
 * Demo data for the memory backend in the screenshot build (SHOTS=cloud,
 * spec §1.7) and dev builds: one demo learner, maya@example.com, and a
 * second device's synced snapshot (for PR 7's screens).
 *
 * The screenshot script picks the starting state per page load through
 * localStorage key `aurivan.shots.cloud` (web only), JSON:
 *   { "signedIn": true, "authAgeMin": 30, "offline": false, "providers": ["email"], "remote": "progress", "syncFails": "server" }
 * Missing or unreadable = signed out. `authAgeMin` = how long ago Maya last
 * signed in (over 10 minutes, deleting her account asks her to confirm it's
 * her first). `providers` = her sign-in methods (default email and Google;
 * email only shows the delete screen's email code step). `remote` = what
 * Maya's account already holds from her other phone (Phase 7 sync shots):
 * "progress" (answers, a streak and an exam date), "newer" (written by a
 * newer app: sync pauses), "unreadable" (a copy the checker refuses: sync
 * pauses), or nothing extra (only her settings). `syncFails` = every sync
 * call fails with that code (a server problem: "We'll try again soon").
 *
 * The board's 12 posts, held post, report and staff account arrive with
 * PR 8, when the memory backend gains the board.
 */
import Constants from 'expo-constants';
import { getAllQuestions } from '../../content/loader';
import { ALL_PROVIDERS, TERMS_VERSION, type Provider } from '../../engine/account';
import { dayKey } from '../../engine/streak';
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
  remote?: 'progress' | 'newer' | 'unreadable';
  syncFails?: 'server';
}

const OTHER_PHONE = '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e';

/** Maya's other phone's progress: answers on a run of questions, a short streak, a few days ago. */
function otherPhoneProgress(now: number, count = 140) {
  const day = 86_400_000;
  const ids = getAllQuestions('cisa').map((q) => q.id).slice(40, 40 + count);
  const answers = Object.fromEntries(ids.map((id, i) => [id, { attempts: 1 + (i % 3), correctCount: Math.min(1 + (i % 3), 1 + (i % 2)), lastCorrect: i % 4 !== 0, lastAt: now - (3 + (i % 9)) * day }]));
  return {
    byCert: { cisa: { answers, lessonsDone: [], notesRead: [] } },
    streak: { current: 5, best: 5, lastDay: dayKey(now - 3 * day), recentDays: [7, 6, 5, 4, 3].map((k) => dayKey(now - k * day)) },
    changedAt: {},
  };
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
    ...(state.syncFails === 'server' ? { failSync: 'server' as const } : {}),
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
          deviceId: OTHER_PHONE,
          state: { activeCertId: 'cisa' },
        },
        ...(state.remote
          ? {
              progress: {
                store: 'progress' as const,
                rev: 7,
                appVersion: state.remote === 'newer' ? '9.0.0' : '1.17.0',
                storeVersion: 1,
                updatedAt: now - 3 * day,
                deviceId: OTHER_PHONE,
                // "unreadable": an exam this app doesn't know, which the checker refuses.
                state: state.remote === 'unreadable' ? { byCert: { zz9: {} }, streak: { current: 0, best: 0, lastDay: null } } : otherPhoneProgress(now),
              },
            }
          : {}),
      },
    },
  };
}
