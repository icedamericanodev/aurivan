/**
 * Where the website keeps the sign-in session (accounts beta §1.2).
 *
 * Plain English for the founder:
 * - Normally in localStorage, under ONE new key, `kaisip_auth_v1`, so the
 *   learner stays signed in between visits.
 * - When they tick "This is a shared computer", in sessionStorage instead
 *   (same key): closing the tab forgets the session.
 * - Only one copy ever exists: saving to one storage removes the other.
 * - What is saved: the two tokens, when the access token expires, the
 *   account id and email (for the account screen), and nothing else.
 * - A damaged or odd-looking saved value reads as "signed out" and is
 *   removed, never half-used.
 *
 * Pure TypeScript: no React, no network. Storage comes in as ports.
 */
import { SESSION_KEY } from './config';
import type { BrowserStores, StoragePort } from './ports';

export interface StoredSession {
  v: 1;
  accessToken: string;
  refreshToken: string;
  /** When the access token expires (epoch ms). */
  expiresAt: number;
  userId: string;
  email: string | null;
  /** Sign-in methods on the account ("email", "google"), from the server's user record. */
  providers: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]{8,8192}$/;

/** A saved value checked field by field (null when anything is off). */
export function readSession(raw: string | null): StoredSession | null {
  if (!raw || raw.length > 20_000) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.accessToken !== 'string' || !TOKEN_RE.test(o.accessToken)) return null;
  if (typeof o.refreshToken !== 'string' || !TOKEN_RE.test(o.refreshToken)) return null;
  if (typeof o.expiresAt !== 'number' || !Number.isFinite(o.expiresAt) || o.expiresAt <= 0) return null;
  if (typeof o.userId !== 'string' || !UUID_RE.test(o.userId)) return null;
  const email = typeof o.email === 'string' && o.email.length <= 320 ? o.email : null;
  const providers = Array.isArray(o.providers) ? o.providers.filter((p): p is string => typeof p === 'string' && /^[a-z]{2,20}$/.test(p)).slice(0, 5) : [];
  return { v: 1, accessToken: o.accessToken, refreshToken: o.refreshToken, expiresAt: o.expiresAt, userId: o.userId, email, providers };
}

export interface SessionStore {
  /** The saved session (sessionStorage first: a shared-computer session), or null. */
  read(): StoredSession | null;
  /** True when the saved session lives in sessionStorage (a shared computer). */
  shared(): boolean;
  /** Save it in ONE storage: sessionStorage when `shared`, else localStorage. Throws if the browser refuses. */
  write(s: StoredSession, shared: boolean): void;
  /** Forget it everywhere. Never throws. */
  clear(): void;
}

function safeGet(s: StoragePort, key: string): string | null {
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}
function safeRemove(s: StoragePort, key: string): void {
  try {
    s.removeItem(key);
  } catch {
    // Storage blocked: nothing saved there to remove.
  }
}

export function createSessionStore(stores: BrowserStores): SessionStore {
  const pick = (): { s: StoredSession; shared: boolean } | null => {
    for (const [store, shared] of [
      [stores.session, true],
      [stores.local, false],
    ] as const) {
      const raw = safeGet(store, SESSION_KEY);
      if (raw === null) continue;
      const s = readSession(raw);
      if (s) return { s, shared };
      safeRemove(store, SESSION_KEY); // damaged: signed out, and never read again
    }
    return null;
  };
  return {
    read: () => pick()?.s ?? null,
    shared: () => pick()?.shared ?? false,
    write(s, shared) {
      const text = JSON.stringify(s);
      (shared ? stores.session : stores.local).setItem(SESSION_KEY, text);
      safeRemove(shared ? stores.local : stores.session, SESSION_KEY);
    },
    clear() {
      safeRemove(stores.local, SESSION_KEY);
      safeRemove(stores.session, SESSION_KEY);
    },
  };
}
