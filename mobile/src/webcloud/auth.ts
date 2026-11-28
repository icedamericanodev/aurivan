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
 * Passwords (owner decisions 28 Nov 2026; design PASSWORD_SIGN_IN_DESIGN.md §4):
 * - Sign-in is Google, or email + password (`signInWithPassword`, with the
 *   human-check token). Emailed codes only confirm an address at sign-up and
 *   reset a forgotten password, and both always end with saving a password.
 * - Create an account: `startPasswordSignUp` checks the password with the
 *   app's rules (engine/passwordRules.ts) and emails a code. The password is
 *   NOT sent then. `finishPasswordSignUp` trades the code for a session and
 *   at once saves the password with that brand-new session (PUT /user), the
 *   only way the database's password guard keeps it.
 * - Forgot password: `sendPasswordResetCode` (no link, no redirect), then
 *   `finishPasswordReset` (the reset code, then the new password).
 * - Add or change a password later: `setPassword`, only within 9 minutes of
 *   signing in (the database allows 10); otherwise it says "sign in again"
 *   before sending anything (`reauthWithPassword`, or a reset code).
 * - After any code session the account "needs a password" until one is
 *   saved (`passwordNeeded()`), so the screens can insist on it, even after
 *   a reload.
 * - The password is never saved anywhere, never logged, and sent only to the
 *   two places that need it (the password sign-in and PUT /user). It is put
 *   in Unicode NFC form first, the same on every device.
 * - Sessions end 30 days after sign-in: an older saved session reads as
 *   signed out (`sessionEnded()` says why); this browser's progress is untouched.
 *
 * Pure TypeScript: no React. Network, storage, random, lock and clock are ports.
 */
import { maskEmail, normalizeEmail, validEmail } from '../engine/account';
import { checkPassword, normalizePassword, PASSWORD_MAX_BYTES, passwordBytes, type PasswordProblem } from '../engine/passwordRules';
import { CloudError, type AccountInfo, type Provider } from '../cloud/types';
import { AUTH_LOCK, PASSWORD_FRESH_MS, PKCE_KEY, PUBLISHABLE_KEY, REDIRECT_URL, REFRESH_MARGIN_MS, SESSION_MAX_AGE_MS, SUPABASE_URL } from './config';
import { bodyObject, toCloudError, type Call, type PasswordDetail } from './errors';
import { challengeFor, isVerifier, lastSignInAt, makeVerifier, sessionStartAt, tokenClaims } from './pkce';
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
/** How long a Google sign-in may take, from leaving for Google to coming back. */
export const PKCE_MAX_AGE_MS = 10 * 60_000;
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

  // ── Passwords ──
  /** Password sign-in (with the human-check token when captcha is on). A wrong password and an unknown address get the same answer. */
  signInWithPassword(email: string, password: string, opts?: { captchaToken?: string; shared?: boolean }): Promise<AccountInfo>;
  /** "Create an account", step 1: checks the password with the app's rules, then emails a code. The password is NOT sent. */
  startPasswordSignUp(email: string, password: string, opts?: { captchaToken?: string }): Promise<void>;
  /**
   * Step 2: the code → a session (saved), then the password is saved with that fresh session.
   * If the code works but the password is refused, the learner stays signed in, `passwordSaved`
   * is false and `passwordNeeded()` stays true (the screen asks for a password again).
   */
  finishPasswordSignUp(email: string, code: string, password: string, opts?: { shared?: boolean }): Promise<PasswordFinish>;
  /**
   * "Forgot password" (also "set a password later"): emails a reset code. The first answer is
   * the same whether or not the account exists, and a "wait a minute" for this address reads
   * as sent too (audit LOW-1), so the screen can't tell anyone which addresses have accounts.
   */
  sendPasswordResetCode(email: string, opts?: { captchaToken?: string }): Promise<void>;
  /** The reset code → a session (saved), then the new password. The server signs out every other session. Same answer shape as sign-up. */
  finishPasswordReset(email: string, code: string, newPassword: string, opts?: { shared?: boolean }): Promise<PasswordFinish>;
  /**
   * Add or change the signed-in account's password. Refused before sending
   * (CloudError reauth_required, detail recent_sign_in) unless this session
   * signed in under 9 minutes ago, or `currentPassword` is given (a change;
   * the server then decides).
   */
  setPassword(newPassword: string, opts?: { currentPassword?: string }): Promise<void>;
  /** "Confirm it's you" with the password (delete account, add or change a password): a fresh session for the same account. */
  reauthWithPassword(password: string, opts?: { captchaToken?: string }): Promise<AccountInfo>;
  /** True after a sign-in with an emailed code until a password is saved (the screens insist on one). */
  passwordNeeded(): boolean;
  /** Why this page is signed out, when it was the 30-day limit ("please sign in again to keep syncing"); else null. */
  sessionEnded(): 'expired' | null;
}

/** What a sign-up or reset finished with. `problem` says why the password wasn't saved (the learner is signed in either way). */
export interface PasswordFinish {
  account: AccountInfo;
  passwordSaved: boolean;
  problem?: PasswordSaveProblem;
}
/** The app's own rules, the server's leaked/other refusals, or the usual codes. */
export type PasswordSaveProblem = PasswordProblem | 'leaked' | 'weak' | 'reauth' | 'rate_limited' | 'offline' | 'server';

/** The CloudError a broken app rule throws: invalid, with detail password_<problem>. */
export function passwordRuleError(problem: PasswordProblem): CloudError {
  return new CloudError('invalid', undefined, `password_${problem}` as PasswordDetail);
}

/** A failed PUT /user → the short reason PasswordFinish reports. */
function saveProblem(e: CloudError): PasswordSaveProblem {
  if (e.code === 'invalid' && typeof e.detail === 'string' && e.detail.startsWith('password_')) {
    const d = e.detail.slice('password_'.length);
    if (d === 'leaked' || d === 'weak') return d;
    if (['too_short', 'too_long', 'common', 'contains_email', 'contains_service_word', 'too_simple'].includes(d)) return d as PasswordProblem;
    return 'weak';
  }
  if (e.code === 'reauth_required' || e.code === 'unauthorized') return 'reauth';
  if (e.code === 'rate_limited' || e.code === 'offline') return e.code;
  return 'server';
}

/** The fields of a GoTrue session answer the client reads. */
function sessionFrom(body: Record<string, unknown>, now: number): StoredSession | null {
  const at = body.access_token;
  const rt = body.refresh_token;
  const user = body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : null;
  if (typeof at !== 'string' || typeof rt !== 'string' || !user || typeof user.id !== 'string' || !UUID_RE.test(user.id)) return null;
  const expiresIn = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 3600;
  const expiresAt = typeof body.expires_at === 'number' && body.expires_at > 0 ? body.expires_at * 1000 : now + expiresIn * 1000;
  const s: StoredSession = { v: 1, accessToken: at, refreshToken: rt, expiresAt, userId: user.id, email: typeof user.email === 'string' ? user.email : null, providers: providersOf(user), signedInAt: now };
  // How far the server's clock is from this one (audit LOW-3): its token's issue time against ours.
  const iat = tokenClaims(at).iat;
  if (typeof iat === 'number' && Number.isFinite(iat) && iat > 0 && Math.abs(iat * 1000 - now) <= 7 * 86_400_000) s.skewMs = iat * 1000 - now;
  return s;
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
  const now = () => deps.clock.now();
  /** Set when this page found its session past the 30-day limit; cleared by the next sign-in. */
  let ended: 'expired' | null = null;

  /**
   * How long ago this session signed in (ms), the larger of: this computer's
   * clock since `signedInAt`, and the server's clock since the token's first
   * sign-in time. Neither known: Infinity (treated as too old: fail closed).
   */
  const sessionAge = (s: StoredSession): number => {
    const ages: number[] = [];
    if (s.signedInAt) ages.push(now() - s.signedInAt);
    const start = sessionStartAt(tokenClaims(s.accessToken));
    if (start) ages.push(now() + (s.skewMs ?? 0) - start);
    return ages.length ? Math.max(...ages) : Infinity;
  };

  /**
   * The saved session, where every read applies the 30-day limit: an older
   * session is forgotten here (its tokens only; progress, the sync record and
   * the undo copy stay) and the page reads as signed out, with
   * sessionEnded() 'expired'. The server's nightly job ends it there too.
   */
  const raw: SessionStore = createSessionStore(deps.stores);
  const store: SessionStore = {
    ...raw,
    read() {
      const s = raw.read();
      if (!s) return null;
      if (sessionAge(s) < SESSION_MAX_AGE_MS) return s;
      raw.clear();
      ended = 'expired';
      return null;
    },
  };
  const signedOut = () => new CloudError('unauthorized', undefined, ended === 'expired' ? 'session_expired' : undefined);

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
    const fromToken = Array.isArray(claims.amr) ? KNOWN_PROVIDERS.filter((p) => claims.amr!.some((a) => a && (a.method === p || (p === 'email' && (a.method === 'otp' || a.method === 'password' || a.method === 'recovery')) || (p === 'google' && a.method === 'oauth')))) : [];
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
      if (!cur) throw signedOut();
      const adopted = stale !== null && cur.refreshToken !== stale.refreshToken;
      if (adopted && cur.expiresAt - now() > REFRESH_MARGIN_MS) return cur;
      const shared = store.shared();
      const r = await send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: cur.refreshToken }) });
      // Read once more after the network: a sign-out (or a browser without locks, another tab)
      // may have changed the saved session while the refresh was on the wire. Never write over that.
      const after = store.read();
      if (!after) throw new CloudError('unauthorized');
      if (after.refreshToken !== cur.refreshToken) return after;
      if (!ok(r)) {
        const e = fail('refresh', r);
        // Spent or revoked: the session is over here. Offline or a server problem: keep it for later.
        if (e.code === 'unauthorized') store.clear();
        throw e;
      }
      const next = sessionFrom(bodyObject(r.text), now());
      if (!next) throw new CloudError('server');
      // A refresh is not a sign-in: the 30-day clock and "needs a password" carry over.
      const kept: StoredSession = { ...next, email: next.email ?? cur.email, providers: next.providers.length ? next.providers : cur.providers };
      if (cur.signedInAt) kept.signedInAt = cur.signedInAt;
      else delete kept.signedInAt;
      if (cur.needsPassword) kept.needsPassword = true;
      save(kept, shared);
      return store.read() ?? next;
    });

  /**
   * Forget the session, inside the lock, so a refresh running in another tab
   * (which holds the lock until it has saved) can't put it back afterwards.
   */
  const clearLocked = async () => {
    store.clear(); // at once, for this page
    await deps.lock.request(AUTH_LOCK, async () => store.clear());
  };

  const accessToken = async (): Promise<string> => {
    const s = store.read();
    if (!s) throw signedOut();
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

  // ── Shared steps of the code and password flows ──

  /** A checked, normalised email, or CloudError invalid:email. */
  const emailOf = (email: string): string => {
    const e = normalizeEmail(typeof email === 'string' ? email : '');
    if (!validEmail(e)) throw new CloudError('invalid', undefined, 'email');
    return e;
  };
  /** The human-check token, when the screen has one (captcha on). */
  const withCaptcha = (body: Record<string, unknown>, captchaToken?: string) => {
    if (captchaToken) body.gotrue_meta_security = { captcha_token: captchaToken };
    return body;
  };
  /** The password as sent, after the app's rules (refused here, before anything leaves the page). */
  const newPasswordOf = (password: string, email: string | null): string => {
    const p = normalizePassword(typeof password === 'string' ? password : '');
    const problems = checkPassword(p, email);
    if (problems.length) throw passwordRuleError(problems[0]);
    return p;
  };
  /** A new session from a sign-in answer, saved. `needsPassword` after a code: the screens then insist on a password. */
  const signedIn = (text: string, shared: boolean, needsPassword: boolean): StoredSession => {
    const s = sessionFrom(bodyObject(text), now());
    if (!s) throw new CloudError('server');
    if (needsPassword) s.needsPassword = true;
    save(s, shared);
    ended = null;
    return s;
  };
  /** Change the saved session's "needs a password" mark (the same session only). */
  const markPassword = (userId: string, needed: boolean) => {
    const cur = store.read();
    if (!cur || cur.userId !== userId) return;
    const next: StoredSession = { ...cur };
    if (needed) next.needsPassword = true;
    else delete next.needsPassword;
    try {
      store.write(next, store.shared());
    } catch {
      // Storage refused: the mark stays as it was (the screen may ask for a password once more).
    }
  };
  /** Ask for an emailed code (sign-up confirmation; also a code sign-in for an existing address). */
  const requestCode = async (e: string, captchaToken?: string) => {
    const r = await send('/auth/v1/otp', { method: 'POST', body: JSON.stringify(withCaptcha({ email: e, create_user: true }, captchaToken)) });
    if (!ok(r)) throw fail('otp', r);
  };
  /** A typed code → a saved session that still needs a password. `type`: 'email' (sign-up code) or 'recovery' (reset code). */
  const verifyCode = async (e: string, code: string, type: 'email' | 'recovery', shared: boolean): Promise<StoredSession> => {
    const c = typeof code === 'string' ? code.replace(/\s+/g, '') : '';
    if (!CODE_RE.test(c)) throw new CloudError('invalid', undefined, 'code_wrong');
    const r = await send('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type, email: e, token: c }) });
    if (!ok(r)) throw fail('verify', r);
    return signedIn(r.text, shared, true);
  };
  /**
   * PUT /user with the password (already normalised and checked). Throws CloudError.
   * `sameIsFine`: after a code, "that is already your password" means the account has it: done.
   */
  const putPassword = async (s: StoredSession, password: string, currentPassword: string | undefined, sameIsFine: boolean) => {
    const body: Record<string, unknown> = { password };
    if (currentPassword !== undefined) body.current_password = currentPassword;
    const res = await authedFetch('/auth/v1/user', { method: 'PUT', body: JSON.stringify(body) }, 'user_update');
    const text = await res.text();
    if (res.status < 200 || res.status >= 300) {
      const e = toCloudError('user_update', res.status, text, res);
      if (!(sameIsFine && e.code === 'invalid' && e.detail === 'password_same')) throw e;
    }
    markPassword(s.userId, false);
  };
  /** A code flow's last step: save the password with the session the code just made. */
  const finishWithPassword = async (s: StoredSession, password: string): Promise<PasswordFinish> => {
    try {
      await putPassword(s, password, undefined, true);
      return { account: info(store.read() ?? s), passwordSaved: true };
    } catch (e) {
      const ce = e instanceof CloudError ? e : new CloudError('server');
      return { account: info(store.read() ?? s), passwordSaved: false, problem: saveProblem(ce) };
    }
  };
  /** Under 9 minutes since this session signed in, by both clocks (the server's, via the skew, and this one's). */
  const freshForPassword = (s: StoredSession): boolean => {
    const start = sessionStartAt(tokenClaims(s.accessToken));
    if (!start) return false;
    const serverAge = now() + (s.skewMs ?? 0) - start;
    const localAge = s.signedInAt ? now() - s.signedInAt : serverAge;
    return Math.max(serverAge, localAge) < PASSWORD_FRESH_MS && serverAge > -5 * 60_000;
  };
  /** The password sign-in request. Never checks the app's rules (an older password still signs in). */
  const passwordGrant = async (e: string, password: string, captchaToken?: string) => {
    const p = normalizePassword(typeof password === 'string' ? password : '');
    // Empty, or longer than the server could ever have stored: the same answer as a wrong one, without asking.
    if (!p || passwordBytes(p) > PASSWORD_MAX_BYTES) throw new CloudError('invalid', undefined, 'password_wrong');
    const r = await send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify(withCaptcha({ email: e, password: p }, captchaToken)) });
    if (!ok(r)) throw fail('password', r);
    return r.text;
  };

  return {
    async sendEmailCode(email, opts) {
      await requestCode(emailOf(email), opts?.captchaToken);
    },

    async verifyEmailCode(email, code, opts) {
      const e = emailOf(email);
      // A code session must end with a password (owner decision 28 Nov 2026): marked until one is saved.
      return info(await verifyCode(e, code, 'email', Boolean(opts?.shared)));
    },

    async signInWithPassword(email, password, opts) {
      const e = emailOf(email);
      const text = await passwordGrant(e, password, opts?.captchaToken);
      return info(signedIn(text, Boolean(opts?.shared), false));
    },

    async startPasswordSignUp(email, password, opts) {
      const e = emailOf(email);
      newPasswordOf(password, e); // refused here if the rules fail; the password itself is not sent
      await requestCode(e, opts?.captchaToken);
    },

    async finishPasswordSignUp(email, code, password, opts) {
      const e = emailOf(email);
      const p = newPasswordOf(password, e); // checked BEFORE the code is used up
      const s = await verifyCode(e, code, 'email', Boolean(opts?.shared));
      return finishWithPassword(s, p);
    },

    async sendPasswordResetCode(email, opts) {
      const e = emailOf(email);
      // No redirect_to and no code_challenge: the email carries a code, never a link.
      const r = await send('/auth/v1/recover', { method: 'POST', body: JSON.stringify(withCaptcha({ email: e }, opts?.captchaToken)) });
      if (ok(r)) return;
      // A second ask within a minute answers 429 only for a real account: read it as "sent" so the
      // screen says the same thing for every address (audit LOW-1). Per-IP limits stay real errors.
      if (r.res?.status === 429 && /over_email_send_rate_limit/.test(String(bodyObject(r.text).error_code ?? ''))) return;
      throw fail('recover', r);
    },

    async finishPasswordReset(email, code, newPassword, opts) {
      const e = emailOf(email);
      const p = newPasswordOf(newPassword, e);
      const s = await verifyCode(e, code, 'recovery', Boolean(opts?.shared));
      return finishWithPassword(s, p);
    },

    async setPassword(newPassword, opts) {
      const s = store.read();
      if (!s) throw signedOut();
      const p = newPasswordOf(newPassword, s.email);
      const current = opts?.currentPassword !== undefined ? normalizePassword(String(opts.currentPassword)) : undefined;
      // A first password needs a sign-in in the last 10 minutes (the database's rule 4): ask for a
      // fresh sign-in now instead of meeting the server's 500. A change with the current password
      // goes to the server, which applies its own checks (500 still reads as reauth_required).
      if (!current && !freshForPassword(s)) throw new CloudError('reauth_required', undefined, 'recent_sign_in');
      await putPassword(s, p, current || undefined, Boolean(s.needsPassword));
    },

    async reauthWithPassword(password, opts) {
      const s = store.read();
      if (!s) throw signedOut();
      if (!s.email) throw new CloudError('invalid', undefined, 'email');
      const e = emailOf(s.email);
      const text = await passwordGrant(e, password, opts?.captchaToken);
      const next = sessionFrom(bodyObject(text), now());
      if (!next) throw new CloudError('server');
      // The same address is the same account; anything else is refused and nothing is saved.
      if (next.userId !== s.userId) throw new CloudError('invalid', undefined, 'password_wrong');
      const shared = store.shared();
      save(next, shared);
      ended = null;
      // The old session's tokens are gone from here; end it on the server too (best effort).
      await send('/auth/v1/logout?scope=local', { method: 'POST', headers: { authorization: `Bearer ${s.accessToken}` } });
      return info(next);
    },

    passwordNeeded: () => store.read()?.needsPassword === true,

    sessionEnded: () => (store.read() ? null : ended),

    googleSignInUrl(opts) {
      const verifier = makeVerifier(deps.random);
      // This tab only (never localStorage): the code is useless without it, and it dies with the tab.
      // Accepted for the beta: a browser's "Duplicate tab" copies sessionStorage, so a copy of the
      // verifier exists there too until either tab finishes (one use; 10 minutes at most).
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
      let saved: { verifier?: unknown; shared?: unknown; at?: unknown } = {};
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
      // A sign-in started more than 10 minutes ago (or "in the future": a changed clock) is not finished.
      const startedAt = typeof saved.at === 'number' ? saved.at : NaN;
      if (!(now() - startedAt <= PKCE_MAX_AGE_MS && startedAt - now() <= 60_000)) throw new CloudError('invalid', undefined, 'oauth');
      if (typeof code !== 'string' || !/^[A-Za-z0-9._~-]{8,512}$/.test(code)) throw new CloudError('invalid', undefined, 'oauth');
      const r = await send('/auth/v1/token?grant_type=pkce', { method: 'POST', body: JSON.stringify({ auth_code: code, code_verifier: saved.verifier }) });
      if (!ok(r)) throw fail('pkce', r);
      return info(signedIn(r.text, saved.shared === true, false));
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
        await clearLocked();
        return;
      }
      // This browser: forget it FIRST, then tell the server (best effort).
      await clearLocked();
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
      if (name === 'delete-account') await clearLocked(); // the account is gone: nothing to keep signed in to
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

