/**
 * The website's sign-in client (accounts beta §1.1–§1.2): a small fetch
 * client for Supabase Auth (GoTrue), using only its documented endpoints.
 *
 * Plain English for the founder:
 * - Email code: `sendEmailCode` asks the server to email an 8-digit code
 *   (with the Turnstile token when captcha is on); `verifyEmailCode` trades
 *   the code for a session.
 * - Google: `googleSignInUrl` makes a PKCE secret, keeps it in this tab only
 *   (sessionStorage) and returns Google's address to open. When Google sends
 *   the learner back to https://kaisip.com/?code=…, `finishGoogleSignIn`
 *   trades the code plus the secret for a session, and deletes the secret.
 * - The session is saved by session.ts (localStorage, or sessionStorage on a
 *   shared computer). The access token lasts an hour; `accessToken()`
 *   refreshes it shortly before it runs out. Refreshing happens ONLY inside
 *   the browser lock 'kaisip-auth', and the saved session is read again
 *   inside the lock: if another tab already refreshed, this tab uses that
 *   session instead of spending the same refresh token twice (the server
 *   treats a reused refresh token as theft and signs everyone out).
 * - Every call that needs the account sends the token; a 401 refreshes once
 *   and tries once more, then reads as "signed out".
 * - Sign out "on this browser" always forgets the session here, even
 *   offline. "Everywhere" needs the server, and keeps the session if the
 *   server can't be reached (nothing changes).
 *
 * Pure TypeScript: no React. Network, storage, random, lock and clock are ports.
 */
import { maskEmail, normalizeEmail, validEmail } from '../engine/account';
import { CloudError, type AccountInfo, type Provider } from '../cloud/types';
import { AUTH_LOCK, PKCE_KEY, PUBLISHABLE_KEY, REDIRECT_URL, REFRESH_MARGIN_MS, SUPABASE_URL } from './config';
import { bodyObject, toCloudError, type Call } from './errors';
import { challengeFor, isVerifier, lastSignInAt, makeVerifier, tokenClaims } from './pkce';
import type { BrowserStores, ClockPort, FetchPort, HttpResponse, LockPort, RandomPort } from './ports';
import { createSessionStore, type SessionStore, type StoredSession } from './session';

export interface WebAuthDeps {
  fetch: FetchPort;
  stores: BrowserStores;
  random: RandomPort;
  lock: LockPort;
  clock: ClockPort;
  /** Defaults: the public values in config.ts (tests point them at a fake server). */
  url?: string;
  apiKey?: string;
  redirectTo?: string;
}

/** The Edge Functions the website may call (no other name is ever sent). */
export type FunctionName = 'delete-account' | 'export-my-data';
const FUNCTIONS: ReadonlySet<string> = new Set<FunctionName>(['delete-account', 'export-my-data']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_RE = /^\d{6,10}$/;
const KNOWN_PROVIDERS: readonly Provider[] = ['email', 'google', 'apple'];

export interface WebAuth {
  sendEmailCode(email: string, opts?: { captchaToken?: string }): Promise<void>;
  verifyEmailCode(email: string, code: string, opts?: { shared?: boolean }): Promise<AccountInfo>;
  /** Google's sign-in address. Keeps the PKCE secret in this tab (sessionStorage) until the learner comes back. */
  googleSignInUrl(opts?: { shared?: boolean }): string;
  /** Trade Google's `?code=` for a session. The PKCE secret is deleted whatever happens. */
  finishGoogleSignIn(code: string): Promise<AccountInfo>;
  /** Who is signed in, from the saved session (no network). */
  current(): AccountInfo | null;
  /** True when the session lives in sessionStorage (a shared computer). */
  sharedComputer(): boolean;
  /** A usable access token, refreshed under the lock when it is close to running out. CloudError('unauthorized') when signed out. */
  accessToken(): Promise<string>;
  /** Refresh now (under the lock; another tab's newer session is adopted instead). */
  refresh(): Promise<StoredSession>;
  /** 'local' always forgets the session here; 'global' needs the server (offline: nothing changes). */
  signOut(scope: 'local' | 'global'): Promise<void>;
  /** The server's user record (GET /auth/v1/user): id, email, sign-in methods. */
  getUser(): Promise<{ id: string; email: string | null; providers: Provider[] }>;
  /** A signed-in call to /rest/v1 or /functions/v1: one refresh and one retry on a 401. */
  authedFetch(path: string, init: { method: string; headers?: Record<string, string>; body?: string; keepalive?: boolean }, call: Call): Promise<HttpResponse>;
  /** POST to an account function (CORS allows https://kaisip.com). Returns the answer's text. */
  callFunction(name: FunctionName, body: Record<string, unknown>): Promise<string>;
  /** The learner's accepted Terms version, or null before they accepted (public.profiles). */
  termsVersion(): Promise<string | null>;
  /** Accept the Terms and confirm "16 or older" (needed before the first sync). */
  acceptTerms(v: { termsVersion: string; ageConfirmed: true }): Promise<void>;
}

/** The fields of a GoTrue session answer the client reads. */
function sessionFrom(body: Record<string, unknown>, now: number): StoredSession | null {
  const at = body.access_token;
  const rt = body.refresh_token;
  const user = body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : null;
  if (typeof at !== 'string' || typeof rt !== 'string' || !user || typeof user.id !== 'string' || !UUID_RE.test(user.id)) return null;
  const expiresIn = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 3600;
  const expiresAt = typeof body.expires_at === 'number' && body.expires_at > 0 ? body.expires_at * 1000 : now + expiresIn * 1000;
  return { v: 1, accessToken: at, refreshToken: rt, expiresAt, userId: user.id, email: typeof user.email === 'string' ? user.email : null, providers: providersOf(user) };
}

function providersOf(user: Record<string, unknown>): Provider[] {
  const meta = user.app_metadata && typeof user.app_metadata === 'object' ? (user.app_metadata as Record<string, unknown>) : {};
  const list = Array.isArray(meta.providers) ? meta.providers : typeof meta.provider === 'string' ? [meta.provider] : [];
  return KNOWN_PROVIDERS.filter((p) => list.includes(p));
}

export function createWebAuth(deps: WebAuthDeps): WebAuth {
  const base = (deps.url ?? SUPABASE_URL).replace(/\/+$/, '');
  const apiKey = deps.apiKey ?? PUBLISHABLE_KEY;
  const redirectTo = deps.redirectTo ?? REDIRECT_URL;
  const store: SessionStore = createSessionStore(deps.stores);
  const now = () => deps.clock.now();

  /** One request. A network failure reads as status 0 (offline); never throws anything but CloudError. */
  const send = async (path: string, init: { method: string; headers?: Record<string, string>; body?: string; keepalive?: boolean }): Promise<{ res: HttpResponse | null; text: string }> => {
    try {
      const res = await deps.fetch(`${base}${path}`, {
        method: init.method,
        headers: { apikey: apiKey, ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...init.headers },
        ...(init.body !== undefined ? { body: init.body } : {}),
        ...(init.keepalive ? { keepalive: true } : {}),
      });
      const text = await res.text();
      return { res, text };
    } catch {
      return { res: null, text: '' };
    }
  };
  const ok = (r: { res: HttpResponse | null }) => Boolean(r.res && r.res.status >= 200 && r.res.status < 300);
  const fail = (call: Call, r: { res: HttpResponse | null; text: string }) => toCloudError(call, r.res ? r.res.status : 0, r.text, r.res ?? undefined);

  const info = (s: StoredSession): AccountInfo => {
    const claims = tokenClaims(s.accessToken);
    const fromToken = Array.isArray(claims.amr) ? KNOWN_PROVIDERS.filter((p) => claims.amr!.some((a) => a && (a.method === p || (p === 'email' && a.method === 'otp') || (p === 'google' && a.method === 'oauth')))) : [];
    return {
      userId: s.userId,
      emailMasked: maskEmail(s.email),
      providers: (s.providers.length ? s.providers.filter((p): p is Provider => (KNOWN_PROVIDERS as readonly string[]).includes(p)) : fromToken) as Provider[],
      authAt: lastSignInAt(claims),
      termsVersion: null,
    };
  };

  const save = (s: StoredSession, shared: boolean) => {
    try {
      store.write(s, shared);
    } catch {
      // The browser refused to save (storage full or blocked): signed in for this page only would
      // surprise the learner on reload, so report it instead.
      throw new CloudError('server');
    }
  };

  /** Refresh with the refresh token, inside the lock. Adopts another tab's newer session. */
  const refreshLocked = (stale: StoredSession | null): Promise<StoredSession> =>
    deps.lock.request(AUTH_LOCK, async () => {
      // Read again INSIDE the lock: another tab may have refreshed (or signed out) meanwhile.
      const cur = store.read();
      if (!cur) throw new CloudError('unauthorized');
      const adopted = stale !== null && cur.refreshToken !== stale.refreshToken;
      if (adopted && cur.expiresAt - now() > REFRESH_MARGIN_MS) return cur;
      const shared = store.shared();
      const r = await send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: cur.refreshToken }) });
      if (!ok(r)) {
        const e = fail('refresh', r);
        // Spent or revoked: the session is over here. Offline or a server problem: keep it for later.
        if (e.code === 'unauthorized') store.clear();
        throw e;
      }
      const next = sessionFrom(bodyObject(r.text), now());
      if (!next) throw new CloudError('server');
      save({ ...next, email: next.email ?? cur.email, providers: next.providers.length ? next.providers : cur.providers }, shared);
      return store.read() ?? next;
    });

  const accessToken = async (): Promise<string> => {
    const s = store.read();
    if (!s) throw new CloudError('unauthorized');
    if (s.expiresAt - now() > REFRESH_MARGIN_MS) return s.accessToken;
    return (await refreshLocked(s)).accessToken;
  };

  const authedFetch: WebAuth['authedFetch'] = async (path, init, call) => {
    for (let attempt = 0; ; attempt++) {
      const before = store.read();
      const token = await accessToken();
      const r = await send(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
      if (!r.res) throw new CloudError('offline');
      // A 401 once: the token may have just been revoked or rotated. Refresh (under the lock) and try again.
      // ("reauth_required" is a real answer from delete-account, not a stale token: passed on as it is.)
      if (r.res.status === 401 && attempt === 0 && bodyObject(r.text).error !== 'reauth_required') {
        await refreshLocked(before);
        continue;
      }
      return { status: r.res.status, headers: r.res.headers, text: async () => r.text };
    }
  };

  return {
    async sendEmailCode(email, opts) {
      const e = normalizeEmail(email);
      if (!validEmail(e)) throw new CloudError('invalid', undefined, 'email');
      const body: Record<string, unknown> = { email: e, create_user: true };
      if (opts?.captchaToken) body.gotrue_meta_security = { captcha_token: opts.captchaToken };
      const r = await send('/auth/v1/otp', { method: 'POST', body: JSON.stringify(body) });
      if (!ok(r)) throw fail('otp', r);
    },

    async verifyEmailCode(email, code, opts) {
      const e = normalizeEmail(email);
      const c = code.replace(/\s+/g, '');
      if (!validEmail(e)) throw new CloudError('invalid', undefined, 'email');
      if (!CODE_RE.test(c)) throw new CloudError('invalid', undefined, 'code_wrong');
      const r = await send('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type: 'email', email: e, token: c }) });
      if (!ok(r)) throw fail('verify', r);
      const s = sessionFrom(bodyObject(r.text), now());
      if (!s) throw new CloudError('server');
      save(s, Boolean(opts?.shared));
      return info(s);
    },

    googleSignInUrl(opts) {
      const verifier = makeVerifier(deps.random);
      // This tab only (never localStorage): the code is useless without it, and it dies with the tab.
      deps.stores.session.setItem(PKCE_KEY, JSON.stringify({ verifier, shared: Boolean(opts?.shared), at: now() }));
      const q = [
        ['provider', 'google'],
        ['redirect_to', redirectTo],
        ['code_challenge', challengeFor(verifier)],
        ['code_challenge_method', 's256'],
      ]
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      return `${base}/auth/v1/authorize?${q}`;
    },

    async finishGoogleSignIn(code) {
      let saved: { verifier?: unknown; shared?: unknown } = {};
      try {
        saved = bodyObject(deps.stores.session.getItem(PKCE_KEY) ?? '');
      } finally {
        // One use only, whatever happens next.
        try {
          deps.stores.session.removeItem(PKCE_KEY);
        } catch {
          // nothing saved
        }
      }
      if (!isVerifier(saved.verifier)) throw new CloudError('invalid', undefined, 'oauth');
      if (typeof code !== 'string' || !/^[A-Za-z0-9._~-]{8,512}$/.test(code)) throw new CloudError('invalid', undefined, 'oauth');
      const r = await send('/auth/v1/token?grant_type=pkce', { method: 'POST', body: JSON.stringify({ auth_code: code, code_verifier: saved.verifier }) });
      if (!ok(r)) throw fail('pkce', r);
      const s = sessionFrom(bodyObject(r.text), now());
      if (!s) throw new CloudError('server');
      save(s, saved.shared === true);
      return info(s);
    },

    current() {
      const s = store.read();
      return s ? info(s) : null;
    },

    sharedComputer: () => store.shared(),

    accessToken,

    refresh: () => refreshLocked(store.read()),

    async signOut(scope) {
      const s = store.read();
      if (!s) return;
      if (scope === 'global') {
        // Everywhere needs the server: offline or a server problem changes nothing.
        const r = await send('/auth/v1/logout?scope=global', { method: 'POST', headers: { authorization: `Bearer ${s.accessToken}` } });
        if (!ok(r)) {
          const e = fail('logout', r);
          // An expired or revoked token: the server has nothing left to end. Forget it here too.
          if (e.code !== 'unauthorized') throw e;
        }
        store.clear();
        return;
      }
      // This browser: forget it FIRST, then tell the server (best effort).
      store.clear();
      await send('/auth/v1/logout?scope=local', { method: 'POST', headers: { authorization: `Bearer ${s.accessToken}` } });
    },

    async getUser() {
      const res = await authedFetch('/auth/v1/user', { method: 'GET' }, 'user');
      const text = await res.text();
      if (res.status < 200 || res.status >= 300) throw toCloudError('user', res.status, text, res);
      const u = bodyObject(text);
      if (typeof u.id !== 'string' || !UUID_RE.test(u.id)) throw new CloudError('server');
      return { id: u.id, email: typeof u.email === 'string' ? u.email : null, providers: providersOf(u) };
    },

    authedFetch,

    async callFunction(name, body) {
      if (!FUNCTIONS.has(name)) throw new CloudError('invalid');
      const res = await authedFetch(`/functions/v1/${name}`, { method: 'POST', body: JSON.stringify(body) }, 'function');
      const text = await res.text();
      if (res.status < 200 || res.status >= 300) throw toCloudError('function', res.status, text, res);
      if (name === 'delete-account') store.clear(); // the account is gone: nothing to keep signed in to
      return text;
    },

    async termsVersion() {
      const res = await authedFetch('/rest/v1/profiles?select=terms_version&limit=1', { method: 'GET' }, 'rest');
      const text = await res.text();
      if (res.status < 200 || res.status >= 300) throw toCloudError('rest', res.status, text, res);
      let rows: unknown;
      try {
        rows = JSON.parse(text);
      } catch {
        throw new CloudError('server');
      }
      const v = Array.isArray(rows) && rows[0] && typeof rows[0] === 'object' ? (rows[0] as Record<string, unknown>).terms_version : null;
      return typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) ? v : null;
    },

    async acceptTerms(v) {
      if (!/^\d{4}-\d{2}$/.test(v.termsVersion) || v.ageConfirmed !== true) throw new CloudError('invalid');
      const s = store.read();
      if (!s) throw new CloudError('unauthorized');
      const ins = await authedFetch('/rest/v1/profiles', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ terms_version: v.termsVersion, age_confirmed: true }) }, 'rest');
      const insText = await ins.text();
      if (ins.status >= 200 && ins.status < 300) return;
      const e = toCloudError('rest', ins.status, insText, ins);
      if (e.code !== 'conflict') throw e;
      // Accepted before: move to the new version (the id is checked as a UUID before it goes in a filter).
      if (!UUID_RE.test(s.userId)) throw new CloudError('invalid');
      const up = await authedFetch(`/rest/v1/profiles?id=eq.${s.userId}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ terms_version: v.termsVersion }) }, 'rest');
      const upText = await up.text();
      if (up.status < 200 || up.status >= 300) throw toCloudError('rest', up.status, upText, up);
    },
  };
}

