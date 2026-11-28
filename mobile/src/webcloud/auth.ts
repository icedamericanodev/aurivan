/**
 * The website's sign-in client (accounts beta §1.1–§1.2): a small fetch
 * client for Supabase Auth (GoTrue), using only its documented endpoints.
 *
 * Plain English for the founder:
 * - Sign-in is Google, or email + password (owner decisions 28 Nov 2026).
 *   Emailed 8-digit codes only confirm an address at sign-up and reset a
 *   forgotten password, and both always end with saving a password. There is
 *   no "sign in with a code" here on purpose.
 * - Google: `googleSignInUrl` makes a PKCE secret, keeps it in this tab only
 *   (sessionStorage) and returns Google's address to open. When Google sends
 *   the learner back to https://kaisip.com/?code=…, `finishGoogleSignIn`
 *   trades the code plus the secret for a session, and deletes the secret.
 * - Create an account: `startPasswordSignUp` checks the password with the
 *   app's rules (engine/passwordRules.ts) and emails a code. The password is
 *   NOT sent then. `finishPasswordSignUp` trades the code for a session and
 *   at once saves the password with that brand-new session (PUT /user), the
 *   only way the database's password guard keeps it.
 * - The screens ask in the order email → code → password (owner decision 28
 *   Nov 2026): `sendSignUpCode`, then `confirmSignUpCode` (a session that
 *   only "needs a password"), then `setPassword`. The two-call form above
 *   stays for a screen that asks for the password first.
 * - Forgot password: `sendPasswordResetCode` (no link, no redirect; the
 *   same answer for every address, at most one a minute from this page),
 *   then `finishPasswordReset` (the reset code, then the new password).
 * - Add or change a password later: `setPassword`, only within 9 minutes of
 *   signing in (the database allows 10); otherwise it says "sign in again"
 *   before sending anything (`reauthWithPassword`, or a reset code).
 * - A session that began with a code and saved no password "needs a
 *   password" (`passwordNeeded()`): it may not sync, and after 10 minutes it
 *   is signed out (on the server too).
 * - The password is never saved anywhere, never logged, and sent only to the
 *   two places that need it (the password sign-in and PUT /user), in Unicode
 *   NFKC form, the same on every device.
 * - Sessions end 30 days after sign-in, or after 14 days unused. Then (and
 *   after any other sign-out the learner didn't ask for) the page reads as
 *   signed out and `sessionEnded()` says why, even after a reload, so the
 *   screen can say "please sign in again to keep syncing". Progress on this
 *   browser is never touched.
 * - The session is saved by session.ts (localStorage, or sessionStorage on a
 *   shared computer). The access token lasts an hour; `accessToken()`
 *   refreshes it shortly before it runs out. Refreshing happens ONLY inside
 *   the browser lock 'kaisip-auth', and the saved session is read again
 *   inside the lock: if another tab already refreshed, this tab uses that
 *   session instead of spending the same refresh token twice (the server
 *   treats a reused refresh token as theft and signs everyone out).
 * - Every call that needs the account sends the token; a 401 (or GoTrue's
 *   403 "bad_jwt") refreshes once and tries once more, then reads as
 *   "signed out".
 * - Sign out "on this browser" always forgets the session here, even
 *   offline. "Everywhere" needs the server, and keeps the session if the
 *   server can't be reached (nothing changes).
 *
 * Pure TypeScript: no React. Network, storage, random, lock and clock are ports.
 */
import { maskEmail, normalizeEmail, validEmail } from '../engine/account';
import { checkPassword, loadPasswordWords, normalizePassword, PASSWORD_MAX_BYTES, passwordBytes, passwordWordsLoaded, type PasswordProblem, type PasswordWordLists } from '../engine/passwordRules';
import { CloudError, type AccountInfo, type Provider } from '../cloud/types';
import {
  AUTH_ENDED_KEY,
  AUTH_LOCK,
  BREACH_CHECK_ON,
  CODE_SESSION_MAX_MS,
  PASSWORD_FRESH_MS,
  PKCE_KEY,
  PUBLISHABLE_KEY,
  REDIRECT_URL,
  REFRESH_MARGIN_MS,
  RESET_RESEND_MS,
  SESSION_IDLE_MAX_MS,
  SESSION_MAX_AGE_MS,
  SUPABASE_URL,
} from './config';
import { createBreachCheck, type BreachVerdict } from './breach';
import { sha1Hex as pureSha1Hex } from '../engine/sha1';
import { authWord, bodyObject, toCloudError, type Call, type PasswordDetail } from './errors';
import { challengeFor, isVerifier, lastSignInAt, makeVerifier, sessionStartAt, tokenClaims } from './pkce';
import type { BrowserStores, ClockPort, FetchPort, HttpResponse, LockPort, RandomPort } from './ports';
import { createSessionStore, type SessionStore, type StoredSession } from './session';

/** The password rules' word lists (engine/passwordWords.ts): the website fetches them only when a password form opens. */
export type { PasswordWordLists } from '../engine/passwordRules';

export interface WebAuthDeps {
  fetch: FetchPort;
  stores: BrowserStores;
  random: RandomPort;
  lock: LockPort;
  clock: ClockPort;
  /**
   * Loads the word lists (the website: assets/kaisip-password-words.js).
   * Asked for once, before the first password is saved; without it (or if it
   * fails) no password is saved: CloudError offline, detail password_rules.
   */
  passwordWords?: () => Promise<PasswordWordLists>;
  /** The leaked-password check (see BreachedPasswordPort); default: createBreachCheck with `fetch` and `sha1Hex`. */
  breachedPassword?: BreachedPasswordPort;
  /** SHA-1 as hex (browser.ts browserSha1Hex(crypto.subtle)), for the default leaked-password check; default the pure engine/sha1.ts (Hermes and http pages have no crypto.subtle). */
  sha1Hex?: (text: string) => Promise<string>;
  /** Defaults: the public values in config.ts (tests point them at a fake server). */
  url?: string;
  apiKey?: string;
  redirectTo?: string;
}

/** The Edge Functions the website may call (no other name is ever sent). */
export type FunctionName = 'delete-account' | 'export-my-data' | 'newsletter-sync';
const FUNCTIONS: ReadonlySet<string> = new Set<FunctionName>(['delete-account', 'export-my-data', 'newsletter-sync']);

/** Where a consent choice was made. The apps send only these; 'email_service' (the email service holds the address as stopped) is written by the server alone. */
export type ConsentSource = 'web' | 'android' | 'ios';
const SOURCES: readonly ConsentSource[] = ['web', 'android', 'ios'];
const VERSION_RE = /^\d{4}-\d{2}$/;
/** The learner's own consent record (public.profiles), as the screens need it. No times: the server keeps those. */
export interface ConsentRecord {
  termsVersion: string | null;
  privacyVersion: string | null;
  /** The optional emails box. */
  newsOptIn: boolean;
  /** Where the last choice was made. 'email_service': the server switched the emails off because the email service holds the address as stopped; the app cannot restart them. Read only: the apps never send it. */
  source: ConsentSource | 'email_service' | null;
}
/**
 * What POST /functions/v1/newsletter-sync answers (docs/mobile/ACCOUNTS_BETA_PLAN.md,
 * "What the clients get back"):
 * - not_configured: the service is not connected yet (the choice is still on record);
 * - unconfirmed: the account's email is not confirmed; nothing was sent (show the
 *   choice as saved; news starts once the email is confirmed);
 * - none: emails off, and the app never added this address;
 * - pending: a confirmation email was sent, "check your inbox to confirm";
 * - subscribed: confirmed;
 * - unsubscribed: the learner's own switch-off has reached the email service (show off, nothing else);
 * - blocked: the email service holds the address as stopped (an unsubscribe link, a bounce, a
 *   complaint or an earlier switch-off). The server has switched the record off: read it again,
 *   show the switch off and say the emails can't be restarted here.
 */
export type NewsState = 'not_configured' | 'unconfirmed' | 'none' | 'pending' | 'subscribed' | 'unsubscribed' | 'blocked';
const NEWS_STATES: readonly NewsState[] = ['not_configured', 'unconfirmed', 'none', 'pending', 'subscribed', 'unsubscribed', 'blocked'];
export interface NewsSync {
  /** False for not_configured and unconfirmed (nothing was sent to the email service). */
  synced: boolean;
  /** The opt-in on record after the sync (null when not synced). */
  optIn: boolean | null;
  state: NewsState;
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_RE = /^\d{6,10}$/;
/** How long a Google sign-in may take, from leaving for Google to coming back. */
export const PKCE_MAX_AGE_MS = 10 * 60_000;
const KNOWN_PROVIDERS: readonly Provider[] = ['email', 'google', 'apple'];
/** Sign-in methods in the token that prove more than an emailed code. */
const STRONG_METHODS: readonly string[] = ['password', 'oauth'];

/**
 * Why this browser was signed out without asking:
 * - expired: 30 days after sign-in;
 * - idle: 14 days unused;
 * - password_not_set: a code session that saved no password in 10 minutes;
 * - revoked: the server ended the session (a sign-out elsewhere, a password change).
 */
export type SessionEnd = 'expired' | 'idle' | 'password_not_set' | 'revoked';
const ENDS: readonly SessionEnd[] = ['expired', 'idle', 'password_not_set', 'revoked'];

/** A password sign-in's answer: the account, and a hint when the password should be changed. */
export type PasswordSignIn = AccountInfo & {
  /** The password no longer meets the rules (the server's or the app's): suggest a new one. */
  passwordChangeSuggested?: true;
};

export interface WebAuth {
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
  /** The server's user record (GET /auth/v1/user): id, email, sign-in methods, the learner's name (Google) and when a password was last saved. */
  getUser(): Promise<{ id: string; email: string | null; providers: Provider[]; names: string[]; passwordSetAt: number | null }>;
  /** A signed-in call to /rest/v1 or /functions/v1: one refresh and one retry on a 401. */
  authedFetch(path: string, init: { method: string; headers?: Record<string, string>; body?: string; keepalive?: boolean }, call: Call): Promise<HttpResponse>;
  /** POST to an account function (CORS allows https://kaisip.com). Returns the answer's text. */
  callFunction(name: FunctionName, body: Record<string, unknown>): Promise<string>;
  /** The learner's accepted Terms version, or null before they accepted (public.profiles). */
  termsVersion(): Promise<string | null>;
  /**
   * Accept the Terms and record the age confirmation (accounts are 18 and
   * older; needed before the first sync). Call it only from a screen where
   * the learner has just agreed: for an account that already has a record it
   * moves the acceptance to this version (and its time to now).
   * `privacyVersion` and `source` go with it; `news` only when the optional
   * emails box is ticked (it needs `source`). No time is ever sent: the
   * server sets every one.
   */
  acceptTerms(v: { termsVersion: string; ageConfirmed: true; privacyVersion?: string; source?: ConsentSource; news?: { wording: string } }): Promise<void>;
  /** The learner's consent record (GET /rest/v1/profiles), or null before they accepted. */
  consent(): Promise<ConsentRecord | null>;
  /**
   * The optional emails switch (PATCH the learner's own row). Switching on
   * records the wording they saw; the server refuses the 21st change in a day
   * (CloudError rate_limited), never a switch-off. Call `syncNews()` after it.
   */
  setNews(optIn: boolean, v: { wording: string; source: ConsentSource }): Promise<void>;
  /**
   * Makes the email service agree with the record (POST
   * /functions/v1/newsletter-sync, body {}): after each switch change and when
   * the Account screen opens. CloudError rate_limited (with the seconds to
   * wait) when asked again within 10 seconds; 'server' when the email service
   * can't be reached (nothing is lost: the next call tries again).
   */
  syncNews(): Promise<NewsSync>;

  // ── Passwords ──
  /** Password sign-in (with the human-check token when captcha is on). A wrong password and an unknown address get the same answer. */
  signInWithPassword(email: string, password: string, opts?: { captchaToken?: string; shared?: boolean }): Promise<PasswordSignIn>;
  /** "Create an account", step 1: checks the password with the app's rules, then emails a code. The password is NOT sent. */
  startPasswordSignUp(email: string, password: string, opts?: { captchaToken?: string }): Promise<void>;
  /**
   * "Create an account" in the screens' order, email → code → password (owner
   * decision 28 Nov 2026, web design step 6): step 1 emails the code that
   * confirms the address. No password exists yet, so none is checked or sent.
   */
  sendSignUpCode(email: string, opts?: { captchaToken?: string }): Promise<void>;
  /**
   * Step 2 of that order: the code → a session (saved) that still NEEDS a
   * password. `passwordNeeded()` is true, it may not sync, and it is signed
   * out (here and on the server) after 10 minutes. Step 3 is
   * `setPassword(newPassword)` with this fresh session, within 9 minutes.
   * This is not a way to sign in: nothing but "set a password" works with it
   * (callFunction, termsVersion, acceptTerms, consent, setNews and syncNews throw
   * CloudError invalid / password_needed; sync refuses it too).
   */
  confirmSignUpCode(email: string, code: string, opts?: { shared?: boolean }): Promise<AccountInfo>;
  /**
   * Step 2: the code → a session (saved), then the password is saved with that fresh session.
   * If the code works but the password is refused, the learner stays signed in, `passwordSaved`
   * is false and `passwordNeeded()` stays true (the screen asks for a password again, within
   * 9 minutes; after 10 the session ends).
   */
  finishPasswordSignUp(email: string, code: string, password: string, opts?: { shared?: boolean }): Promise<PasswordFinish>;
  /**
   * "Forgot password" (also "set a password later"): emails a reset code. The answer is the same
   * whether or not the account exists, a "wait a minute" from the server for a real address reads
   * as sent too (audit LOW-1), and this page asks at most once a minute for ANY address (a second
   * ask sooner is CloudError rate_limited with the seconds left), so nobody can tell which
   * addresses have accounts.
   */
  sendPasswordResetCode(email: string, opts?: { captchaToken?: string }): Promise<void>;
  /** The reset code → a session (saved), then the new password. Every other session is signed out. Same answer shape as sign-up. */
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
  /** True while the session began with an emailed code and has saved no password (no sync until it has). */
  passwordNeeded(): boolean;
  /** The last leaked-password check: 'clean', 'unchecked' (it couldn't check; show passwordGuidance('breach_unchecked')), or 'off' (none yet, or switched off). */
  breachState(): 'off' | 'clean' | 'unchecked';
  /** Why this browser is signed out, when it wasn't the learner's choice (kept across reloads); null when signed in or signed out on purpose. */
  sessionEnded(): SessionEnd | null;
}

/**
 * What a sign-up or reset finished with. `problem` says why the password
 * wasn't saved (the learner is signed in either way). `unchanged`: the new
 * password was already the account's, so it was kept, and the server
 * confirmed signing out every other session (as a change would have done);
 * when it didn't, `othersSignedOut` is false instead.
 */
export interface PasswordFinish {
  account: AccountInfo;
  passwordSaved: boolean;
  unchanged?: true;
  /** false: the password was already the account's, and the server did not confirm signing out the other sessions. */
  othersSignedOut?: false;
  problem?: PasswordSaveProblem;
}
/** The app's own rules, the server's leaked/other refusals, or the usual codes. */
export type PasswordSaveProblem = PasswordProblem | 'leaked' | 'weak' | 'reauth' | 'rate_limited' | 'offline' | 'server';

/**
 * The leaked-password check (ON; owner decision 28 Nov 2026): k-anonymity
 * range queries for two forms of the password (webcloud/breach.ts
 * createBreachCheck). It fails open (a network error or a 3-second timeout
 * never blocks a password), as the audit recommends, and then breachState()
 * says 'unchecked' so the screen can say so.
 */
export type BreachedPasswordPort = (password: string) => Promise<BreachVerdict>;

/** The CloudError a broken app rule throws: invalid, with detail password_<problem>. */
export function passwordRuleError(problem: PasswordProblem): CloudError {
  return new CloudError('invalid', undefined, `password_${problem}` as PasswordDetail);
}

const RULE_PROBLEMS: readonly string[] = ['invalid_characters', 'too_short', 'too_long', 'contains_email', 'contains_service_word', 'common', 'too_simple'];

/** A failed PUT /user → the short reason PasswordFinish reports. */
function saveProblem(e: CloudError): PasswordSaveProblem {
  if (e.code === 'invalid' && typeof e.detail === 'string' && e.detail.startsWith('password_')) {
    const d = e.detail.slice('password_'.length);
    if (d === 'leaked' || d === 'weak') return d;
    if (RULE_PROBLEMS.includes(d)) return d as PasswordProblem;
    return 'weak';
  }
  if (e.code === 'reauth_required' || e.code === 'unauthorized') return 'reauth';
  if (e.code === 'rate_limited' || e.code === 'offline') return e.code;
  return 'server';
}

/** The learner's name from a user record's metadata (Google sends it). Used for the password check only, never stored. */
function namesOf(user: Record<string, unknown> | null): string[] {
  const meta = user && user.user_metadata && typeof user.user_metadata === 'object' ? (user.user_metadata as Record<string, unknown>) : {};
  return ['full_name', 'name'].map((k) => meta[k]).filter((v): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200);
}

/** When the app last recorded a password save (user_metadata.kaisip_password_set_at), for the "password changed on" notice. */
function passwordSetAtOf(user: Record<string, unknown>): number | null {
  const meta = user.user_metadata && typeof user.user_metadata === 'object' ? (user.user_metadata as Record<string, unknown>) : {};
  const t = typeof meta.kaisip_password_set_at === 'string' ? Date.parse(meta.kaisip_password_set_at) : NaN;
  return Number.isFinite(t) && t > 0 ? t : null;
}

/** The fields of a GoTrue session answer the client reads. */
function sessionFrom(body: Record<string, unknown>, now: number): StoredSession | null {
  const at = body.access_token;
  const rt = body.refresh_token;
  const user = body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : null;
  if (typeof at !== 'string' || typeof rt !== 'string' || !user || typeof user.id !== 'string' || !UUID_RE.test(user.id)) return null;
  const expiresIn = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 3600;
  const expiresAt = typeof body.expires_at === 'number' && body.expires_at > 0 ? body.expires_at * 1000 : now + expiresIn * 1000;
  const s: StoredSession = { v: 1, accessToken: at, refreshToken: rt, expiresAt, userId: user.id, email: typeof user.email === 'string' ? user.email : null, providers: providersOf(user), signedInAt: now, lastActiveAt: now };
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

/** True when the token's sign-in methods include a password or Google (more than an emailed code). */
function strongSignIn(s: StoredSession): boolean {
  const amr = tokenClaims(s.accessToken).amr;
  return Array.isArray(amr) && amr.some((a) => a && typeof a.method === 'string' && STRONG_METHODS.includes(a.method));
}

export function createWebAuth(deps: WebAuthDeps): WebAuth {
  const base = (deps.url ?? SUPABASE_URL).replace(/\/+$/, '');
  const apiKey = deps.apiKey ?? PUBLISHABLE_KEY;
  const redirectTo = deps.redirectTo ?? REDIRECT_URL;
  const now = () => deps.clock.now();
  /** When this page last asked for a reset code (any address). In memory only. */
  let lastResetAsk = -Infinity;
  /** The same for "Create account" codes: this page asks for one at most once a minute, for any address. */
  let lastSignUpAsk = -Infinity;
  /** The last leaked-password check: off (none yet), clean, or unchecked (it couldn't check; the password is accepted). */
  let breach: 'off' | 'clean' | 'unchecked' = 'off';

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
  /** Best effort: end one session on the server (its token only). Never throws. */
  const endOnServer = (accessToken: string, scope: 'local' | 'others' = 'local') => send(`/auth/v1/logout?scope=${scope}`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } });

  // ── Why the page was signed out (kaisip_auth_ended_v1: a reason and a time, nothing else) ──
  const markEnded = (reason: SessionEnd) => {
    try {
      deps.stores.local.setItem(AUTH_ENDED_KEY, JSON.stringify({ reason, at: now() }));
    } catch {
      // storage refused: the page still reads as signed out
    }
  };
  const clearEnded = () => {
    try {
      deps.stores.local.removeItem(AUTH_ENDED_KEY);
    } catch {
      // nothing saved
    }
  };
  const endedReason = (): SessionEnd | null => {
    let raw: string | null = null;
    try {
      raw = deps.stores.local.getItem(AUTH_ENDED_KEY);
    } catch {
      return null;
    }
    const r = bodyObject(raw ?? '').reason;
    return typeof r === 'string' && (ENDS as readonly string[]).includes(r) ? (r as SessionEnd) : null;
  };

  /**
   * How long ago this session signed in (ms): the largest of this computer's
   * clock since `signedInAt`, the server's clock (via the skew) since the
   * token's first sign-in time, and, signed by the server itself, the
   * token's issue time minus that sign-in time (a computer clock turned back
   * can't hide it after the next refresh). None known: Infinity (fail closed).
   */
  const sessionAge = (s: StoredSession): number => {
    const ages: number[] = [];
    if (s.signedInAt) ages.push(now() - s.signedInAt);
    const claims = tokenClaims(s.accessToken);
    const start = sessionStartAt(claims);
    if (start) {
      ages.push(now() + (s.skewMs ?? 0) - start);
      if (typeof claims.iat === 'number' && Number.isFinite(claims.iat)) ages.push(claims.iat * 1000 - start);
    }
    return ages.length ? Math.max(...ages) : Infinity;
  };
  /** How long since the session was last renewed (sign-in or refresh), by both clocks. */
  const idleFor = (s: StoredSession): number => {
    const ages: number[] = [];
    if (s.lastActiveAt) ages.push(now() - s.lastActiveAt);
    const iat = tokenClaims(s.accessToken).iat;
    if (typeof iat === 'number' && Number.isFinite(iat)) ages.push(now() + (s.skewMs ?? 0) - iat * 1000);
    return ages.length ? Math.max(...ages) : Infinity; // nothing known: too old (fail closed)
  };
  /** A code session that has saved no password. */
  const needsPassword = (s: StoredSession) => !strongSignIn(s) && s.passwordSaved !== true;

  /**
   * The saved session, where every read applies the limits: past 30 days, 14
   * days unused, or a code session without a password after 10 minutes, the
   * session is forgotten here (its tokens only; progress, the sync record and
   * the undo copy stay), the reason is kept for sessionEnded(), and the page
   * reads as signed out. A code session is also ended on the server.
   */
  const raw: SessionStore = createSessionStore(deps.stores);
  const store: SessionStore = {
    ...raw,
    read() {
      const s = raw.read();
      if (!s) return null;
      const age = sessionAge(s);
      let reason: SessionEnd | null = null;
      if (age >= SESSION_MAX_AGE_MS) reason = 'expired';
      else if (idleFor(s) >= SESSION_IDLE_MAX_MS) reason = 'idle';
      else if (needsPassword(s) && age >= CODE_SESSION_MAX_MS) reason = 'password_not_set';
      if (!reason) return s;
      raw.clear();
      markEnded(reason);
      if (reason === 'password_not_set') void endOnServer(s.accessToken);
      return null;
    },
  };
  const signedOut = () => {
    const r = endedReason();
    return new CloudError('unauthorized', undefined, r === 'expired' || r === 'idle' ? 'session_expired' : r === 'password_not_set' ? 'password_not_set' : undefined);
  };

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
      if (!after) throw signedOut();
      if (after.refreshToken !== cur.refreshToken) return after;
      if (!ok(r)) {
        const e = fail('refresh', r);
        // Spent or revoked: the session is over here (and the learner is told why). Offline or a
        // server problem: keep it for later.
        if (e.code === 'unauthorized') {
          store.clear();
          markEnded('revoked');
        }
        throw e;
      }
      const next = sessionFrom(bodyObject(r.text), now());
      if (!next) throw new CloudError('server');
      // A refresh is not a sign-in: the 30-day clock and "saved a password" carry over.
      const kept: StoredSession = { ...next, email: next.email ?? cur.email, providers: next.providers.length ? next.providers : cur.providers };
      if (cur.signedInAt) kept.signedInAt = cur.signedInAt;
      else delete kept.signedInAt;
      if (cur.passwordSaved) kept.passwordSaved = true;
      save(kept, shared);
      // The new token's own times are checked at once (a computer clock turned back shows here).
      const fresh = store.read();
      if (!fresh) throw signedOut();
      return fresh;
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
      // A 401 once (or GoTrue's 403 "bad_jwt": an expired or rotated token): refresh (under the lock)
      // and try again. "reauth_required" from delete-account and GoTrue's insufficient_aal are real
      // answers, not a stale token: passed on as they are.
      const b = bodyObject(r.text);
      const word = authWord(b);
      if (attempt === 0 && ((r.res.status === 401 && b.error !== 'reauth_required' && word !== 'insufficient_aal') || (r.res.status === 403 && word === 'bad_jwt'))) {
        await refreshLocked(before);
        continue;
      }
      // GoTrue's "this session no longer exists" (signed out elsewhere, a password change): the
      // session is over here too, and the page says why.
      if (r.res.status === 403 && word === 'session_not_found' && path.startsWith('/auth/v1/')) {
        await clearLocked();
        markEnded('revoked');
      }
      return { status: r.res.status, headers: r.res.headers, text: async () => r.text };
    }
  };

  const getUser: WebAuth['getUser'] = async () => {
    const res = await authedFetch('/auth/v1/user', { method: 'GET' }, 'user');
    const text = await res.text();
    if (res.status < 200 || res.status >= 300) throw toCloudError('user', res.status, text, res);
    const u = bodyObject(text);
    if (typeof u.id !== 'string' || !UUID_RE.test(u.id)) throw new CloudError('server');
    return { id: u.id, email: typeof u.email === 'string' ? u.email : null, providers: providersOf(u), names: namesOf(u), passwordSetAt: passwordSetAtOf(u) };
  };

  // ── Shared steps of the code and password flows ──

  /** A checked, normalised email, or CloudError invalid:email. */
  const emailOf = (email: unknown): string => {
    const e = normalizeEmail(typeof email === 'string' ? email : '');
    if (!validEmail(e)) throw new CloudError('invalid', undefined, 'email');
    return e;
  };
  /** The human-check token, when the screen has one (captcha on). */
  const withCaptcha = (body: Record<string, unknown>, captchaToken?: string) => {
    if (typeof captchaToken === 'string' && captchaToken) body.gotrue_meta_security = { captcha_token: captchaToken };
    return body;
  };
  /** The word lists, loaded once before the first password is saved. Fail closed. */
  const ensureWords = async () => {
    if (passwordWordsLoaded()) return;
    try {
      // Only the lists this build expects are accepted (their sizes and SHA-256): a cut-down or
      // stale file leaves the rules "not loaded", and no password is saved.
      if (deps.passwordWords) loadPasswordWords(await deps.passwordWords());
    } catch {
      // handled below
    }
    if (!passwordWordsLoaded()) throw new CloudError('offline', undefined, 'password_rules');
  };
  /** The password as sent, after the app's rules (refused here, before anything leaves the page). */
  const newPasswordOf = (password: unknown, email: string | null, names: string[] = []): string => {
    const problems = checkPassword(password, { email, names });
    if (problems.length) throw passwordRuleError(problems[0]);
    return normalizePassword(password)!;
  };
  /** A new session from a sign-in answer, saved; the "signed out because…" note is cleared. */
  const signedIn = (text: string, shared: boolean): { s: StoredSession; user: Record<string, unknown> | null } => {
    const body = bodyObject(text);
    const s = sessionFrom(body, now());
    if (!s) throw new CloudError('server');
    save(s, shared);
    clearEnded();
    return { s, user: body.user && typeof body.user === 'object' ? (body.user as Record<string, unknown>) : null };
  };
  /**
   * The leaked-password check (ON). Runs only after the app's rules have
   * accepted the password, and only when one is chosen (never at sign-in). A
   * known-leaked password is refused (password_leaked); a failure or a timeout
   * lets it through, with breachState() 'unchecked'.
   */
  const breachLookup: BreachedPasswordPort = deps.breachedPassword ?? createBreachCheck({ fetch: deps.fetch, sha1Hex: deps.sha1Hex ?? (async (t: string) => pureSha1Hex(t)) });
  const breachCheck = async (password: string) => {
    if (!BREACH_CHECK_ON) {
      breach = 'off';
      return;
    }
    let verdict: BreachVerdict = 'unknown';
    try {
      verdict = await breachLookup(password);
    } catch {
      verdict = 'unknown'; // fail open
    }
    // 'clean' only for a clean answer: a refused (leaked) password leaves the state 'off'.
    breach = verdict === 'unknown' ? 'unchecked' : verdict === 'clean' ? 'clean' : 'off';
    if (verdict === 'breached') throw new CloudError('invalid', undefined, 'password_leaked');
  };
  /** Mark the saved session (the same one only) as having saved a password. */
  const markSaved = (userId: string) => {
    const cur = raw.read();
    if (!cur || cur.userId !== userId) return;
    try {
      raw.write({ ...cur, passwordSaved: true }, raw.shared());
    } catch {
      // Storage refused: the session still needs a password here (the screen asks once more).
    }
  };
  /** Ask for an emailed code (the sign-up confirmation). */
  const requestCode = async (e: string, captchaToken?: string) => {
    const r = await send('/auth/v1/otp', { method: 'POST', body: JSON.stringify(withCaptcha({ email: e, create_user: true }, captchaToken)) });
    if (!ok(r)) throw fail('otp', r);
  };
  /** A typed code → a saved session (it needs a password). `type`: 'email' (sign-up code) or 'recovery' (reset code). */
  const verifyCode = async (e: string, code: unknown, type: 'email' | 'recovery', shared: boolean) => {
    const c = typeof code === 'string' ? code.replace(/\s+/g, '') : '';
    if (!CODE_RE.test(c)) throw new CloudError('invalid', undefined, 'code_wrong');
    const r = await send('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type, email: e, token: c }) });
    if (!ok(r)) throw fail('verify', r);
    return signedIn(r.text, shared);
  };
  /**
   * PUT /user with the password (already normalised and checked), and the time
   * in the account's metadata (the "password changed on <date>" notice, a
   * second channel beside the email). Throws CloudError. Returns 'unchanged'
   * when `sameIsFine` and the account already had exactly this password.
   */
  const putPassword = async (s: StoredSession, password: string, currentPassword: string | undefined, sameIsFine: boolean): Promise<'saved' | 'unchanged' | 'unchanged_others_kept'> => {
    const body: Record<string, unknown> = { password, data: { kaisip_password_set_at: new Date(now()).toISOString() } };
    if (currentPassword !== undefined) body.current_password = currentPassword;
    const res = await authedFetch('/auth/v1/user', { method: 'PUT', body: JSON.stringify(body) }, 'user_update');
    const text = await res.text();
    if (res.status >= 200 && res.status < 300) {
      markSaved(s.userId);
      return 'saved';
    }
    const e = toCloudError('user_update', res.status, text, res);
    if (!(sameIsFine && e.code === 'invalid' && e.detail === 'password_same')) throw e;
    // Already this account's password: nothing changed, so the server signed nobody out. Do what a
    // change would have done (the learner proved the inbox; a thief's other sessions end), and say
    // so only if the server confirmed it.
    markSaved(s.userId);
    const cur = store.read();
    const r = cur ? await endOnServer(cur.accessToken, 'others') : null;
    return r && ok(r) ? 'unchanged' : 'unchanged_others_kept';
  };
  /** A code flow's last step: save the password with the session the code just made. */
  const finishWithPassword = async (s: StoredSession, password: string): Promise<PasswordFinish> => {
    try {
      const how = await putPassword(s, password, undefined, true);
      const done: PasswordFinish = { account: info(store.read() ?? s), passwordSaved: true };
      if (how === 'unchanged') done.unchanged = true;
      // The password was already the account's, but the other sessions could not be ended:
      // reported, never claimed (the screen can offer "sign out everywhere").
      if (how === 'unchanged_others_kept') done.othersSignedOut = false;
      return done;
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
  const passwordGrant = async (e: string, password: unknown, captchaToken?: string) => {
    const p = normalizePassword(password);
    if (p === null) throw new CloudError('invalid', undefined, 'password_invalid_characters');
    // Empty, or longer than the server could ever have stored: the same answer as a wrong one, without asking.
    if (!p || passwordBytes(p) > PASSWORD_MAX_BYTES) throw new CloudError('invalid', undefined, 'password_wrong');
    const r = await send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify(withCaptcha({ email: e, password: p }, captchaToken)) });
    if (!ok(r)) throw fail('password', r);
    return { text: r.text, password: p };
  };
  /** Does this signed-in password deserve a "please change it" hint? (the server's weak_password, or the app's rules once loaded) */
  const suggestChange = (text: string, p: string, email: string, user: Record<string, unknown> | null) => {
    const wp = bodyObject(text).weak_password;
    if (wp && typeof wp === 'object') return true;
    // Only the predictable-password reasons: a password set under the earlier rule (15+, no
    // required types) is not nagged for its length or its mix (sign-in never applies those).
    return passwordWordsLoaded() && checkPassword(p, { email, names: namesOf(user) }).some((r) => r !== 'too_short' && r !== 'missing_characters');
  };

  /**
   * A session made by an emailed code that has saved no password is not a sign-in: it may set a
   * password (and ask who it is, and sign out), and nothing else. Every other signed-in call
   * refuses it here, before anything is sent.
   */
  const refuseCodeSession = () => {
    const s = store.read();
    if (s && needsPassword(s)) throw new CloudError('invalid', undefined, 'password_needed');
  };
  /** A PostgREST "return=representation" answer that is exactly one row, or null. */
  const oneRow = (text: string): Record<string, unknown> | null => {
    let rows: unknown;
    try {
      rows = JSON.parse(text);
    } catch {
      return null;
    }
    return Array.isArray(rows) && rows.length === 1 && rows[0] && typeof rows[0] === 'object' ? (rows[0] as Record<string, unknown>) : null;
  };

  const api: WebAuth = {
    async signInWithPassword(email, password, opts) {
      const e = emailOf(email);
      const { text, password: p } = await passwordGrant(e, password, opts?.captchaToken);
      const { s, user } = signedIn(text, Boolean(opts?.shared));
      const out: PasswordSignIn = info(s);
      if (suggestChange(text, p, e, user)) out.passwordChangeSuggested = true;
      return out;
    },

    async startPasswordSignUp(email, password, opts) {
      breach = 'off'; // a refusal below never leaves the last password's answer showing
      const e = emailOf(email);
      await ensureWords();
      const p = newPasswordOf(password, e); // refused here if the rules fail; the password itself is not sent
      await breachCheck(p); // a leaked password is refused before any code is emailed
      await requestCode(e, opts?.captchaToken);
    },

    async sendSignUpCode(email, opts) {
      const e = emailOf(email);
      // One a minute from this page, whatever the address (the same rule as reset codes): a second
      // ask sooner is refused here with the seconds left, before anything is sent.
      const wait = lastSignUpAsk + RESET_RESEND_MS - now();
      if (wait > 0) throw new CloudError('rate_limited', Math.ceil(wait / 1000));
      await requestCode(e, opts?.captchaToken);
      lastSignUpAsk = now();
    },

    async confirmSignUpCode(email, code, opts) {
      const e = emailOf(email);
      return info((await verifyCode(e, code, 'email', Boolean(opts?.shared))).s);
    },

    async finishPasswordSignUp(email, code, password, opts) {
      breach = 'off';
      const e = emailOf(email);
      await ensureWords();
      await breachCheck(newPasswordOf(password, e)); // checked BEFORE the code is used up
      const { s, user } = await verifyCode(e, code, 'email', Boolean(opts?.shared));
      // An address that already had an account (maybe Google): its name counts too.
      const names = namesOf(user);
      if (names.length && checkPassword(password, { email: e, names }).length) {
        return { account: info(s), passwordSaved: false, problem: 'contains_email' };
      }
      return finishWithPassword(s, normalizePassword(password)!);
    },

    async sendPasswordResetCode(email, opts) {
      const e = emailOf(email);
      const wait = lastResetAsk + RESET_RESEND_MS - now();
      if (wait > 0) throw new CloudError('rate_limited', Math.ceil(wait / 1000));
      // No redirect_to and no code_challenge: the email carries a code, never a link.
      const r = await send('/auth/v1/recover', { method: 'POST', body: JSON.stringify(withCaptcha({ email: e }, opts?.captchaToken)) });
      if (r.res) lastResetAsk = now();
      if (ok(r)) return;
      // A second ask within a minute answers 429 only for a real account: read it as "sent" so the
      // screen says the same thing for every address (audit LOW-1). Per-IP limits stay real errors.
      const b = bodyObject(r.text);
      if (r.res?.status === 429 && authWord(b) === 'over_email_send_rate_limit') return;
      throw fail('recover', r);
    },

    async finishPasswordReset(email, code, newPassword, opts) {
      breach = 'off';
      const e = emailOf(email);
      await ensureWords();
      await breachCheck(newPasswordOf(newPassword, e)); // checked BEFORE the code is used up
      const { s, user } = await verifyCode(e, code, 'recovery', Boolean(opts?.shared));
      const names = namesOf(user);
      if (names.length && checkPassword(newPassword, { email: e, names }).length) {
        return { account: info(s), passwordSaved: false, problem: 'contains_email' };
      }
      return finishWithPassword(s, normalizePassword(newPassword)!);
    },

    async setPassword(newPassword, opts) {
      breach = 'off';
      const s = store.read();
      if (!s) throw signedOut();
      await ensureWords();
      newPasswordOf(newPassword, s.email); // the cheap check first, with no network
      const current = opts?.currentPassword !== undefined ? normalizePassword(opts.currentPassword) : undefined;
      if (current === null) throw new CloudError('invalid', undefined, 'password_current_wrong');
      // A first password needs a sign-in in the last 10 minutes (the database's rule 4): ask for a
      // fresh sign-in now instead of meeting the server's 500. A change with the current password
      // goes to the server, which applies its own checks (500 still reads as reauth_required).
      if (!current && !freshForPassword(s)) throw new CloudError('reauth_required', undefined, 'recent_sign_in');
      // The learner's name (Google) is checked too: read from the account, never kept.
      const user = await getUser();
      const p = newPasswordOf(newPassword, s.email ?? user.email, user.names);
      await breachCheck(p);
      await putPassword(s, p, current || undefined, needsPassword(s));
    },

    async reauthWithPassword(password, opts) {
      const s = store.read();
      if (!s) throw signedOut();
      if (!s.email) throw new CloudError('invalid', undefined, 'email');
      const e = emailOf(s.email);
      const { text } = await passwordGrant(e, password, opts?.captchaToken);
      const next = sessionFrom(bodyObject(text), now());
      if (!next) throw new CloudError('server');
      // The same address is the same account. Anything else: nothing is saved here, and the
      // session that answer made is ended at once (no orphan left on the server).
      if (next.userId !== s.userId) {
        await endOnServer(next.accessToken);
        throw new CloudError('invalid', undefined, 'password_wrong');
      }
      save(next, store.shared());
      clearEnded();
      // The old session's tokens are gone from here; end it on the server too, if its token still works.
      if (s.expiresAt > now()) await endOnServer(s.accessToken);
      return info(next);
    },

    breachState: () => breach,

    passwordNeeded() {
      const s = store.read();
      return Boolean(s && needsPassword(s));
    },

    sessionEnded: () => (store.read() ? null : endedReason()),

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
      return info(signedIn(r.text, saved.shared === true).s);
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
      clearEnded(); // the learner's own choice: no "you were signed out" note
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
      await endOnServer(s.accessToken);
    },

    getUser,

    authedFetch,

    async callFunction(name, body) {
      if (!FUNCTIONS.has(name)) throw new CloudError('invalid');
      refuseCodeSession();
      const res = await authedFetch(`/functions/v1/${name}`, { method: 'POST', body: JSON.stringify(body) }, 'function');
      const text = await res.text();
      if (res.status < 200 || res.status >= 300) throw toCloudError('function', res.status, text, res);
      if (name === 'delete-account') {
        clearEnded();
        await clearLocked(); // the account is gone: nothing to keep signed in to
      }
      return text;
    },

    async termsVersion() {
      refuseCodeSession();
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
      if (!VERSION_RE.test(v.termsVersion) || v.ageConfirmed !== true) throw new CloudError('invalid');
      if (v.privacyVersion !== undefined && !VERSION_RE.test(v.privacyVersion)) throw new CloudError('invalid');
      if (v.source !== undefined && !SOURCES.includes(v.source)) throw new CloudError('invalid');
      // The optional emails need the wording shown and where it was ticked (the server refuses an opt-in without them).
      if (v.news && (!VERSION_RE.test(v.news.wording) || v.source === undefined)) throw new CloudError('invalid');
      refuseCodeSession();
      const s = store.read();
      if (!s) throw signedOut();
      // Only these fields, ever: no time (the server sets each one) and no other column.
      const agreed: Record<string, unknown> = { terms_version: v.termsVersion };
      if (v.privacyVersion) agreed.privacy_version = v.privacyVersion;
      const row: Record<string, unknown> = { ...agreed, age_confirmed: true };
      if (v.source) row.source = v.source;
      if (v.news) {
        row.marketing_opt_in = true;
        row.marketing_wording = v.news.wording;
      }
      const ins = await authedFetch('/rest/v1/profiles', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(row) }, 'rest');
      const insText = await ins.text();
      if (ins.status >= 200 && ins.status < 300) return;
      const e = toCloudError('rest', ins.status, insText, ins);
      if (e.code !== 'conflict') throw e;
      // Accepted before: move to the new version (the id is checked as a UUID before it goes in a filter).
      if (!UUID_RE.test(s.userId)) throw new CloudError('invalid');
      // The answer must be the learner's one row, holding what was sent: a filter that matched
      // nothing answers "fine" with no row, and that must never read as agreed.
      const up = await authedFetch(`/rest/v1/profiles?id=eq.${s.userId}&select=terms_version,privacy_version`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify(agreed) }, 'rest');
      const upText = await up.text();
      if (up.status < 200 || up.status >= 300) throw toCloudError('rest', up.status, upText, up);
      const moved = oneRow(upText);
      if (!moved || moved.terms_version !== v.termsVersion || (v.privacyVersion !== undefined && moved.privacy_version !== v.privacyVersion)) throw new CloudError('invalid', undefined, 'terms');
      // The optional box, ticked on that same screen: its own change, with its own wording and time.
      if (v.news && v.source) await api.setNews(true, { wording: v.news.wording, source: v.source });
    },

    async consent() {
      refuseCodeSession();
      const res = await authedFetch('/rest/v1/profiles?select=terms_version,privacy_version,marketing_opt_in,source&limit=1', { method: 'GET' }, 'rest');
      const text = await res.text();
      if (res.status < 200 || res.status >= 300) throw toCloudError('rest', res.status, text, res);
      let rows: unknown;
      try {
        rows = JSON.parse(text);
      } catch {
        throw new CloudError('server');
      }
      const r = Array.isArray(rows) && rows[0] && typeof rows[0] === 'object' ? (rows[0] as Record<string, unknown>) : null;
      if (!r) return null;
      const version = (x: unknown) => (typeof x === 'string' && VERSION_RE.test(x) ? x : null);
      const source = r.source === 'email_service' || SOURCES.includes(r.source as ConsentSource) ? (r.source as ConsentRecord['source']) : null;
      return { termsVersion: version(r.terms_version), privacyVersion: version(r.privacy_version), newsOptIn: r.marketing_opt_in === true, source };
    },

    async setNews(optIn, v) {
      if (typeof optIn !== 'boolean' || !VERSION_RE.test(v.wording) || !SOURCES.includes(v.source)) throw new CloudError('invalid');
      refuseCodeSession();
      const s = store.read();
      if (!s) throw signedOut();
      if (!UUID_RE.test(s.userId)) throw new CloudError('invalid');
      const res = await authedFetch(`/rest/v1/profiles?id=eq.${s.userId}&select=marketing_opt_in`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ marketing_opt_in: optIn, marketing_wording: v.wording, source: v.source }) }, 'rest');
      const text = await res.text();
      if (res.status < 200 || res.status >= 300) throw toCloudError('rest', res.status, text, res);
      // Exactly one row, with the choice as sent. No row (no agreement on record yet) is not "saved".
      const row = oneRow(text);
      if (!row || row.marketing_opt_in !== optIn) throw new CloudError('invalid', undefined, 'terms');
    },

    async syncNews() {
      const b = bodyObject(await api.callFunction('newsletter-sync', {}));
      const state = NEWS_STATES.includes(b.state as NewsState) ? (b.state as NewsState) : null;
      if (!state || typeof b.synced !== 'boolean') throw new CloudError('server');
      return { synced: b.synced, optIn: b.synced && typeof b.optIn === 'boolean' ? b.optIn : null, state };
    },
  };
  return api;
}
