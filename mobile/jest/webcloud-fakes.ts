/**
 * Test doubles for the website cloud client (src/webcloud): a fake Supabase
 * (GoTrue /auth/v1, PostgREST /rest/v1, the two /functions/v1) that plays
 * the real server's documented rules, plus fake storage, random and clock.
 *
 * It follows supabase/migrations/20261013000000_sync_snapshots.sql for the
 * synced rows (server-set rev that never goes back, optimistic concurrency,
 * the codec's shape checks and caps, 20 writes per store per hour, Terms
 * needed to write) and GoTrue's refresh-token rotation with reuse detection
 * (a refresh token spent twice ends the whole session family).
 *
 * Not a test file (no .test suffix, outside __tests__).
 */
import { toBase64Url } from '../src/webcloud/base64';
import { challengeFor } from '../src/webcloud/pkce';
import type { FetchPort, HttpResponse, RandomPort, StoragePort } from '../src/webcloud/ports';
import { utf8 } from '../src/engine/sha256';
import { PASSWORD_DICT_LIST, PASSWORD_LOCAL_LIST, PASSWORD_NAMES_LIST, PASSWORD_SHORT_LIST } from '../src/engine/passwordWords';
import type { AccountInfo } from '../src/cloud/types';
import type { WebAuth } from '../src/webcloud/auth';

/** The password rules' word lists, as the website's lazy loader gives them. */
export const testPasswordWords = async () => ({ short: PASSWORD_SHORT_LIST, dict: PASSWORD_DICT_LIST, local: PASSWORD_LOCAL_LIST, names: PASSWORD_NAMES_LIST });
/** A password the rules accept (three ordinary words, a capital, a number and a symbol). */
export const TEST_PASSWORD = 'Ocean violet lamp 7!';

/**
 * Signs `a` in the way learners do: the first time a password sign-up (a code, then the
 * password), afterwards a password sign-in. Returns the account.
 */
export async function passwordSignIn(
  server: { codes: Map<string, string>; userByEmail(e: string): { password?: string } | undefined },
  a: Pick<WebAuth, 'startPasswordSignUp' | 'finishPasswordSignUp' | 'signInWithPassword'>,
  email = 'maya@example.com',
  shared = false,
): Promise<AccountInfo> {
  if (server.userByEmail(email)?.password) return a.signInWithPassword(email, TEST_PASSWORD, { shared });
  await a.startPasswordSignUp(email, TEST_PASSWORD);
  const done = await a.finishPasswordSignUp(email, server.codes.get(email)!, TEST_PASSWORD, { shared });
  if (!done.passwordSaved) throw new Error('test sign-up: the password was not saved');
  return done.account;
}

export const FAKE_URL = 'https://fake.supabase.test';
export const FAKE_KEY = 'sb_publishable_test_only_not_a_real_key';

/** Web Storage in memory. `full` makes setItem throw like a full browser storage. */
export function memoryStorage(): StoragePort & { dump(): Record<string, string>; full: boolean } {
  const m = new Map<string, string>();
  return {
    full: false,
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem(k, v) {
      if (this.full) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
    dump: () => Object.fromEntries(m),
  };
}

/** Deterministic "random" bytes. */
export function seqRandom(seed = 7): RandomPort {
  let x = seed;
  return {
    bytes: (n) =>
      Uint8Array.from({ length: n }, () => {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        return x & 0xff;
      }),
  };
}

/** A token-looking string built at run time (the repo's secret scanner forbids JWT-shaped literals). */
export function fakeJwt(claims: Record<string, unknown>): string {
  const part = (o: unknown) => toBase64Url(utf8(JSON.stringify(o)));
  return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.c2ln`;
}

interface Row {
  store: string;
  store_version: number;
  app_version: string;
  device_id: string;
  rev: number;
  encoding: string;
  state_gz: string;
  raw_bytes: number;
  updated_at: string;
}
interface Call {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const HEAD_COLS = ['store', 'rev', 'app_version', 'store_version', 'device_id', 'updated_at'];
const ALL_COLS = [...HEAD_COLS, 'encoding', 'state_gz', 'raw_bytes'];

export class FakeSupabase {
  now: () => number;
  offline = false;
  /** The next response for a path prefix is this status and body (one use). */
  private forced = new Map<string, { status: number; body: unknown; headers?: Record<string, string> }>();
  calls: Call[] = [];
  users = new Map<string, { id: string; email: string; providers: string[]; password?: string; meta: Record<string, unknown> }>();
  /**
   * The emailed codes, ONE pool for sign-up and reset codes: GoTrue accepts either code with
   * type "email" or "recovery" (both live in the same token column; audit MEDIUM-1).
   */
  codes = new Map<string, string>();
  /** Passwords whose sign-in answer carries GoTrue's weak_password hint (they fail today's rules). */
  weakOnSignIn = new Set<string>();
  /** When /recover last sent a code to an address (one a minute per address, like GoTrue). */
  resetSentAt = new Map<string, number>();
  /** Session family → when it signed in (s, the server's clock) and how: refreshes keep both, like GoTrue's amr. */
  families = new Map<string, { userId: string; createdAt: number; method: string }>();
  /** The human check (Turnstile) is on: /otp, /recover and the password grant need a token. */
  captchaOn = false;
  /** The server's clock minus the test's (ms): a learner's computer clock that is off. */
  skewMs = 0;
  /** Passwords the (Pro-only) leaked-password check would refuse. */
  pwned = new Set<string>();
  /** refresh token → its session family and whether it was spent. */
  refresh = new Map<string, { userId: string; family: string; used: boolean }>();
  /** access token → who and until when (s). */
  access = new Map<string, { userId: string; exp: number; family: string }>();
  revokedFamilies = new Set<string>();
  /** Google: the code Google "sent back" → the challenge it was started with. */
  oauth = new Map<string, { challenge: string; email: string; name?: string }>();
  rows = new Map<string, Row>();
  lastRev = new Map<string, number>();
  writes = new Map<string, { start: number; n: number }>();
  /** Each account's accepted Terms version (the consent record's other fields are in `consent`). */
  profiles = new Map<string, string>();
  /**
   * The rest of the consent record, as migration 20261128020000_consent_record.sql keeps it:
   * the app may write only privacy_version, marketing_opt_in, marketing_wording and source
   * (web, android or ios); the server sets every time.
   */
  consent = new Map<string, { privacy_version: string | null; marketing_opt_in: boolean; marketing_wording: string | null; source: string | null; everOptedIn: boolean }>();
  /** When each account's record changed (ms, the server's clock): 20 changes in 24 hours, a withdrawal always allowed. */
  consentLog = new Map<string, number[]>();
  /**
   * The email service behind newsletter-sync (Kit). null: not connected yet (the function answers
   * not_configured). Else each address's state there: 'inactive' (a confirmation email is out),
   * 'active' (confirmed), 'cancelled' (unsubscribed, bounced or complained: never added again).
   */
  kit: Map<string, 'inactive' | 'active' | 'cancelled'> | null = null;
  /** Kit can't be reached: newsletter-sync answers 503 kit_unavailable. */
  kitDown = false;
  /** Addresses the app itself added to Kit (only those are unsubscribed there when the learner switches off). */
  kitAdded = new Set<string>();
  /** newsletter-sync: one call per account every `newsWaitMs` (10 seconds on the real function). */
  newsWaitMs = 10_000;
  newsCalledAt = new Map<string, number>();
  /** Accept an access token this long (s). */
  tokenTtl = 3600;
  private n = 0;

  constructor(now: () => number) {
    this.now = now;
  }

  // ── Test helpers ──
  force(prefix: string, status: number, body: unknown, headers?: Record<string, string>) {
    this.forced.set(prefix, { status, body, headers });
  }
  /** Google sign-in finished for `email`: the code the website receives on ?code=. */
  googleCode(challenge: string, email: string, name?: string): string {
    const code = `oauth-code-${++this.n}-abcdef`;
    this.oauth.set(code, { challenge, email, name });
    return code;
  }
  userByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email);
  }
  refreshCalls() {
    return this.calls.filter((c) => c.path.startsWith('/auth/v1/token?grant_type=refresh_token')).length;
  }
  row(userId: string, store: string): Row | undefined {
    return this.rows.get(`${userId}:${store}`);
  }

  private uuid(): string {
    const h = (++this.n).toString(16).padStart(12, '0');
    return `aaaaaaaa-bbbb-4ccc-8ddd-${h}`;
  }
  /** The server's clock (ms). */
  serverNow() {
    return this.now() + this.skewMs;
  }
  private session(userId: string, method: string, family = this.uuid()) {
    const nowS = Math.floor(this.serverNow() / 1000);
    if (!this.families.has(family)) this.families.set(family, { userId, createdAt: nowS, method });
    const fam = this.families.get(family)!;
    const exp = nowS + this.tokenTtl;
    const at = fakeJwt({ sub: userId, exp, iat: nowS, amr: [{ method: fam.method, timestamp: fam.createdAt }], n: ++this.n });
    const rt = `rt-${this.n}-${family.slice(-4)}xyz`;
    this.access.set(at, { userId, exp, family });
    this.refresh.set(rt, { userId, family, used: false });
    return { access_token: at, token_type: 'bearer', expires_in: this.tokenTtl, expires_at: exp, refresh_token: rt, user: this.userJson(userId) };
  }
  private userJson(userId: string) {
    const u = this.users.get(userId)!;
    return { id: u.id, email: u.email, app_metadata: { provider: u.providers[0], providers: u.providers }, user_metadata: { ...u.meta } };
  }
  private signIn(email: string, provider: string, method: string, name?: string) {
    let u = this.userByEmail(email);
    if (!u) {
      u = { id: this.uuid(), email, providers: [provider], meta: {} };
      this.users.set(u.id, u);
    } else if (!u.providers.includes(provider)) u.providers.push(provider);
    if (name) u.meta = { ...u.meta, full_name: name, name };
    return this.session(u.id, method);
  }
  private who(headers: Record<string, string>): string | null {
    const w = this.whoWhy(headers);
    return 'id' in w ? w.id : null;
  }
  /** GoTrue's answer for a token: the user, or why not (403 bad_jwt for a bad or expired token, 403 session_not_found for an ended session). */
  private whoWhy(headers: Record<string, string>): { id: string } | { err: 'bad_jwt' | 'session_not_found' } {
    const m = /^Bearer (.+)$/.exec(headers.authorization ?? '');
    const a = m ? this.access.get(m[1]) : undefined;
    if (!a || a.exp * 1000 <= this.serverNow() || !this.users.has(a.userId)) return { err: 'bad_jwt' };
    if (this.revokedFamilies.has(a.family)) return { err: 'session_not_found' };
    return { id: a.userId };
  }
  private userRefusal(w: { err: 'bad_jwt' | 'session_not_found' }) {
    return w.err === 'bad_jwt' ? { code: 'bad_jwt', error_code: 'bad_jwt', msg: 'invalid JWT: unable to parse or verify signature, token has invalid claims: token is expired' } : { code: 'session_not_found', error_code: 'session_not_found', msg: 'Session from session_id claim in JWT does not exist' };
  }
  /** The session family of a request's token (who() must have passed). */
  private familyOf(headers: Record<string, string>): string {
    return this.access.get(/^Bearer (.+)$/.exec(headers.authorization)![1])!.family;
  }
  /** The human check, as GoTrue answers when it is missing. */
  private captchaMissing(body: any): boolean {
    return this.captchaOn && !(typeof body?.gotrue_meta_security?.captcha_token === 'string' && body.gotrue_meta_security.captcha_token.length > 0);
  }
  /** GoTrue's weak-password and length rules with the dashboard at 15 characters, no required types. */
  private passwordRefusal(pw: unknown): { status: number; body: unknown } | null {
    if (typeof pw !== 'string' || [...pw].length < 15) return { status: 422, body: { code: 422, error_code: 'weak_password', msg: 'Password should be at least 15 characters.', weak_password: { reasons: ['length'] } } };
    if (utf8(pw).length > 72) return { status: 400, body: { code: 400, error_code: 'validation_failed', msg: 'Password cannot be longer than 72 characters' } };
    if (this.pwned.has(pw)) return { status: 422, body: { code: 422, error_code: 'weak_password', msg: 'Password is known to be weak and easy to guess', weak_password: { reasons: ['pwned'] } } };
    return null;
  }

  readonly fetch: FetchPort = async (url, init) => {
    // A real network answers later: let other callers interleave.
    await new Promise((r) => setTimeout(r, 0));
    if (this.offline) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    if (u.origin !== FAKE_URL) throw new TypeError('wrong host');
    const path = `${u.pathname}${u.search}`;
    const body = init.body !== undefined ? JSON.parse(init.body) : undefined;
    const headers = Object.fromEntries(Object.entries(init.headers).map(([k, v]) => [k.toLowerCase(), v]));
    this.calls.push({ method: init.method, path, headers, body });
    const res = (status: number, b?: unknown, h: Record<string, string> = {}): HttpResponse => {
      const text = b === undefined ? '' : JSON.stringify(b);
      const hh = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
      return { status, headers: { get: (n: string) => hh[n.toLowerCase()] ?? null }, text: async () => text };
    };
    for (const [prefix, f] of this.forced) {
      if (path.startsWith(prefix)) {
        this.forced.delete(prefix);
        return res(f.status, f.body, f.headers);
      }
    }
    if (headers.apikey !== FAKE_KEY) return res(401, { message: 'Invalid API key' });
    return this.route(init.method, u, headers, body, res);
  };

  private route(method: string, u: URL, headers: Record<string, string>, body: any, res: (s: number, b?: unknown, h?: Record<string, string>) => HttpResponse): HttpResponse {
    const p = u.pathname;
    const q = u.searchParams;
    // ── GoTrue ──
    if (p === '/auth/v1/otp' && method === 'POST') {
      if (this.captchaMissing(body)) return res(400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha response)' });
      if (typeof body?.email !== 'string' || !body.email.includes('@')) return res(400, { code: 400, error_code: 'validation_failed', msg: 'bad email' });
      this.codes.set(body.email, String(10_000_000 + ((this.n++ * 7919) % 89_999_999)));
      return res(200, {});
    }
    if (p === '/auth/v1/recover' && method === 'POST') {
      if (this.captchaMissing(body)) return res(400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha response)' });
      if (typeof body?.email !== 'string' || !body.email.includes('@')) return res(400, { code: 400, error_code: 'validation_failed', msg: 'bad email' });
      // An unknown address: 200 and nothing sent (recover.go). A real one: one email a minute.
      if (!this.userByEmail(body.email)) return res(200, {});
      const last = this.resetSentAt.get(body.email);
      if (last !== undefined && this.serverNow() - last < 60_000) return res(429, { code: 429, error_code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after 60 seconds.' });
      this.resetSentAt.set(body.email, this.serverNow());
      this.codes.set(body.email, String(20_000_000 + ((this.n++ * 7919) % 79_999_999)));
      return res(200, {});
    }
    if (p === '/auth/v1/verify' && method === 'POST') {
      if ((body?.type !== 'email' && body?.type !== 'recovery') || this.codes.get(body.email) !== body.token) return res(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      this.codes.delete(body.email);
      return res(200, this.signIn(body.email, 'email', 'otp'));
    }
    if (p === '/auth/v1/user' && method === 'PUT') {
      const w = this.whoWhy(headers);
      if (!('id' in w)) return res(403, this.userRefusal(w));
      const id = w.id;
      const usr = this.users.get(id)!;
      const fam = this.families.get(this.familyOf(headers))!;
      const ageS = Math.floor(this.serverNow() / 1000) - fam.createdAt;
      const refused = this.passwordRefusal(body?.password);
      if (refused) return res(refused.status, refused.body);
      if (usr.password) {
        if (usr.password === body.password) return res(422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
        // Secure password change: a session older than 24 hours needs a reauthentication code.
        if (ageS > 86_400) return res(400, { code: 400, error_code: 'reauthentication_needed', msg: 'Password update requires reauthentication.' });
        // Require current password, except in a code or reset session (a "recovery" session).
        if (fam.method !== 'otp') {
          if (typeof body.current_password !== 'string') return res(400, { code: 400, error_code: 'current_password_required', msg: 'Current password required' });
          if (body.current_password !== usr.password) return res(400, { code: 400, error_code: 'current_password_mismatch', msg: 'Current password mismatch' });
        }
      } else if (ageS >= 600) {
        // The database's password guard (rule 4/4b): a first password needs a session under 10 minutes old.
        return res(500, { code: 500, error_code: 'unexpected_failure', msg: 'Error during password storage' });
      }
      usr.password = body.password;
      if (body.data && typeof body.data === 'object') usr.meta = { ...usr.meta, ...body.data };
      // UpdatePassword signs out every OTHER session of the account.
      const mine = this.familyOf(headers);
      for (const [f, info] of this.families) if (info.userId === id && f !== mine) this.revokedFamilies.add(f);
      return res(200, this.userJson(id));
    }
    if (p === '/auth/v1/token' && method === 'POST') {
      const grant = q.get('grant_type');
      if (grant === 'password') {
        if (this.captchaMissing(body)) return res(400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (no captcha response)' });
        const usr = typeof body?.email === 'string' ? this.userByEmail(body.email) : undefined;
        if (!usr || !usr.password || usr.password !== body?.password) return res(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        const out: Record<string, unknown> = this.session(usr.id, 'password');
        if (this.weakOnSignIn.has(body.password)) out.weak_password = { reasons: ['length'] };
        return res(200, out);
      }
      if (grant === 'pkce') {
        const o = this.oauth.get(body?.auth_code);
        if (!o || challengeFor(String(body?.code_verifier)) !== o.challenge) return res(404, { code: 404, error_code: 'flow_state_not_found', msg: 'invalid flow state' });
        this.oauth.delete(body.auth_code);
        return res(200, this.signIn(o.email, 'google', 'oauth', o.name));
      }
      if (grant === 'refresh_token') {
        const r = this.refresh.get(body?.refresh_token);
        if (!r || this.revokedFamilies.has(r.family)) return res(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
        if (r.used) {
          // Reuse detection: the whole family is revoked (the thief and the learner both lose it).
          this.revokedFamilies.add(r.family);
          return res(400, { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' });
        }
        r.used = true;
        return res(200, this.session(r.userId, 'otp', r.family)); // the family keeps its first sign-in's amr
      }
    }
    if (p === '/auth/v1/logout' && method === 'POST') {
      const id = this.who(headers);
      if (!id) return res(401, { code: 401, error_code: 'no_authorization', msg: 'no' });
      const m = /^Bearer (.+)$/.exec(headers.authorization)!;
      const fam = this.access.get(m[1])!.family;
      if (q.get('scope') === 'global') {
        for (const a of this.access.values()) if (a.userId === id) this.revokedFamilies.add(a.family);
      } else if (q.get('scope') === 'others') {
        for (const a of this.access.values()) if (a.userId === id && a.family !== fam) this.revokedFamilies.add(a.family);
      } else {
        this.revokedFamilies.add(fam);
      }
      return res(204);
    }
    if (p === '/auth/v1/user' && method === 'GET') {
      const w = this.whoWhy(headers);
      if (!('id' in w)) return res(403, this.userRefusal(w));
      return res(200, this.userJson(w.id));
    }
    // ── PostgREST ──
    if (p.startsWith('/rest/v1/')) {
      const id = this.who(headers);
      if (!id) return res(401, { code: 'PGRST301', message: 'JWT expired' });
      if (p === '/rest/v1/profiles') return this.profilesRoute(method, id, q, body, res);
      if (p === '/rest/v1/sync_snapshots') return this.snapshots(method, id, q, headers, body, res);
      return res(404, { code: 'PGRST205', message: 'no table' });
    }
    // ── Edge Functions ──
    if (p.startsWith('/functions/v1/') && method === 'POST') {
      const id = this.who(headers);
      if (!id) return res(401, { error: 'unauthorized' });
      if (p === '/functions/v1/export-my-data') return res(200, { app: 'kaisip', schema: 1, stores: {} });
      if (p === '/functions/v1/newsletter-sync') return this.newsletterSync(id, res);
      if (p === '/functions/v1/delete-account') {
        if (body?.confirm !== 'DELETE') return res(400, { error: 'invalid', detail: 'confirm_required' });
        this.users.delete(id);
        return res(200, { deleted: true });
      }
    }
    return res(404, { message: 'not found' });
  }

  /** Kit's side of newsletter-sync (supabase/functions/newsletter-sync/handler.ts), without the email service. */
  private newsletterSync(id: string, res: (s: number, b?: unknown, h?: Record<string, string>) => HttpResponse): HttpResponse {
    if (this.kit === null) return res(200, { synced: false, state: 'not_configured' });
    const now = this.serverNow();
    const last = this.newsCalledAt.get(id);
    if (last !== undefined && now - last < this.newsWaitMs) return res(429, { error: 'rate_limited' }, { 'retry-after': String(Math.max(1, Math.ceil(this.newsWaitMs / 1000))) });
    this.newsCalledAt.set(id, now);
    if (this.kitDown) return res(503, { error: 'server', detail: 'kit_unavailable' }, { 'retry-after': '60' });
    const email = this.users.get(id)!.email;
    const c = this.consent.get(id);
    if (c?.marketing_opt_in === true) {
      const held = this.kit.get(email);
      if (held === 'cancelled') {
        // Kit's unsubscribe is authoritative: the opt-in on record is withdrawn (source 'email'), never re-added.
        c.marketing_opt_in = false;
        c.source = 'email';
        this.kitAdded.delete(email);
        return res(200, { synced: true, optIn: false, state: 'unsubscribed' });
      }
      if (!held) this.kit.set(email, 'inactive');
      this.kitAdded.add(email);
      return res(200, { synced: true, optIn: true, state: held === 'active' ? 'subscribed' : 'pending' });
    }
    if (this.kitAdded.has(email)) {
      // Switched off in the app, and the app had added this address: stop the emails at Kit.
      this.kit.set(email, 'cancelled');
      this.kitAdded.delete(email);
      return res(200, { synced: true, optIn: false, state: 'unsubscribed' });
    }
    return res(200, { synced: true, optIn: false, state: 'none' });
  }

  /** What the database refuses in a consent write, before anything is saved. */
  private consentRefusal(body: any): { status: number; body: unknown } | null {
    const WRITABLE = ['terms_version', 'age_confirmed', 'privacy_version', 'marketing_opt_in', 'marketing_wording', 'source'];
    const check = { status: 400, body: { code: '23514', message: 'new row for relation "profiles" violates check constraint' } };
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, body: { code: 'PGRST102', message: 'bad body' } };
    // Any other column (every time among them: created_at, terms_accepted_at, marketing_set_at, marketing_withdrawn_at) has no grant.
    for (const k of Object.keys(body)) if (!WRITABLE.includes(k)) return { status: 403, body: { code: '42501', message: 'permission denied for table profiles' } };
    const version = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v));
    if (!version(body.terms_version) || !version(body.privacy_version) || !version(body.marketing_wording)) return check;
    // 'email' is the server's own word for an unsubscribe carried back from the email service.
    if (body.source !== undefined && body.source !== null && !['web', 'android', 'ios'].includes(body.source)) return check;
    if (body.marketing_opt_in !== undefined && typeof body.marketing_opt_in !== 'boolean') return check;
    return null;
  }
  /** 20 changes per account in 24 hours; a withdrawal always goes through. */
  private consentLimited(id: string, withdrawing: boolean): boolean {
    const now = this.serverNow();
    const log = (this.consentLog.get(id) ?? []).filter((t) => now - t < 86_400_000);
    if (!withdrawing && log.length >= 20) return true;
    log.push(now);
    this.consentLog.set(id, log);
    return false;
  }

  private profilesRoute(method: string, id: string, q: URLSearchParams, body: any, res: (s: number, b?: unknown) => HttpResponse): HttpResponse {
    if (method === 'GET') {
      if (!this.profiles.has(id)) return res(200, []);
      const c = this.consent.get(id);
      const row: Record<string, unknown> = { id, terms_version: this.profiles.get(id), age_confirmed: true, privacy_version: c?.privacy_version ?? null, marketing_opt_in: c?.marketing_opt_in ?? false, marketing_wording: c?.marketing_wording ?? null, source: c?.source ?? null };
      const cols = (q.get('select') ?? '*').split(',');
      return res(200, [cols.includes('*') ? row : Object.fromEntries(cols.map((k) => [k, row[k] ?? null]))]);
    }
    const limited = { code: 'P0001', message: 'rate_limited' };
    const check = { code: '23514', message: 'new row for relation "profiles" violates check constraint' };
    if (method === 'POST') {
      const refused = this.consentRefusal(body);
      if (refused) return res(refused.status, refused.body);
      if (this.profiles.has(id)) return res(409, { code: '23505', message: 'duplicate key value violates unique constraint "profiles_pkey"' });
      if (body.age_confirmed !== true || typeof body.terms_version !== 'string') return res(400, check);
      const optIn = body.marketing_opt_in === true;
      // An opt-in says which wording was shown and where.
      if (optIn && (!body.marketing_wording || !body.source)) return res(400, check);
      if (this.consentLimited(id, false)) return res(400, limited);
      this.profiles.set(id, body.terms_version);
      this.consent.set(id, { privacy_version: body.privacy_version ?? null, marketing_opt_in: optIn, marketing_wording: body.marketing_wording ?? null, source: body.source ?? null, everOptedIn: optIn });
      return res(201);
    }
    if (method === 'PATCH' && q.get('id') === `eq.${id}`) {
      const refused = this.consentRefusal(body);
      if (refused) return res(refused.status, refused.body);
      if (!this.profiles.has(id)) return res(204); // no row: nothing matches, nothing changes
      const old = this.consent.get(id) ?? { privacy_version: null, marketing_opt_in: false, marketing_wording: null, source: null, everOptedIn: false };
      const next = { ...old };
      // A value on record is replaced, never blanked.
      next.privacy_version = body.privacy_version ?? old.privacy_version;
      next.source = body.source ?? old.source;
      if (typeof body.marketing_opt_in === 'boolean') next.marketing_opt_in = body.marketing_opt_in;
      if (next.marketing_opt_in) {
        next.marketing_wording = body.marketing_wording ?? old.marketing_wording;
        if (!next.marketing_wording || !next.source || next.source === 'email') return res(400, check);
        next.everOptedIn = true;
      } else if (!old.everOptedIn && body.marketing_wording !== undefined) {
        next.marketing_wording = body.marketing_wording; // once an opt-in was given, its wording stays with it
      }
      const terms = typeof body.terms_version === 'string' ? body.terms_version : this.profiles.get(id)!;
      const same = terms === this.profiles.get(id) && JSON.stringify(next) === JSON.stringify(old);
      if (!same && this.consentLimited(id, old.marketing_opt_in && !next.marketing_opt_in)) return res(400, limited);
      this.profiles.set(id, terms);
      this.consent.set(id, next);
      return res(204);
    }
    return res(400, { code: 'PGRST100', message: 'bad' });
  }

  private snapshots(method: string, id: string, q: URLSearchParams, headers: Record<string, string>, body: any, res: (s: number, b?: unknown, h?: Record<string, string>) => HttpResponse): HttpResponse {
    const eq = (k: string) => q.get(k)?.replace(/^eq\./, '') ?? null;
    const cols = (q.get('select') ?? ALL_COLS.join(',')).split(',');
    for (const c of cols) if (!ALL_COLS.includes(c)) return res(403, { code: '42501', message: 'permission denied for column' });
    const pickCols = (r: Row) => Object.fromEntries(cols.map((c) => [c, (r as unknown as Record<string, unknown>)[c]]));
    const store = eq('store');
    if (method === 'GET') {
      const r = store ? this.rows.get(`${id}:${store}`) : undefined;
      return res(200, r ? [pickCols(r)] : []);
    }
    if (method === 'DELETE') {
      for (const s of ['progress', 'settings']) {
        const k = `${id}:${s}`;
        if (this.rows.has(k)) {
          this.nextRev(id, s, this.rows.get(k)!.rev, false);
          this.rows.delete(k);
        }
      }
      return res(204);
    }
    if (method !== 'POST' && method !== 'PATCH') return res(405);
    if (!this.profiles.has(id)) return res(403, { code: '42501', message: 'new row violates row-level security policy for table "sync_snapshots"' });
    // The table's checks.
    const s = method === 'POST' ? body?.store : store;
    if (s !== 'progress' && s !== 'settings') return res(400, { code: '23514', message: 'store check' });
    if (method === 'POST' && 'rev' in (body ?? {})) return res(403, { code: '42501', message: 'permission denied for column rev' });
    if ('encoding' in (body ?? {}) || 'user_id' in (body ?? {})) return res(403, { code: '42501', message: 'permission denied for column' });
    const gz = String(body?.state_gz ?? '');
    if (gz.length > 200_000 || gz.length % 4 !== 0 || !/^H4sI[A-Za-z0-9+/]+={0,2}$/.test(gz)) return res(400, { code: '23514', message: 'new row violates check constraint "sync_snapshots_state_gz_check"' });
    if (!(Number.isInteger(body?.raw_bytes) && body.raw_bytes >= 2 && body.raw_bytes <= 2_000_000)) return res(400, { code: '23514', message: 'raw_bytes check' });
    if (s === 'settings' && (gz.length > 32_768 || body.raw_bytes > 98_304)) return res(400, { code: '23514', message: 'new row violates check constraint "sync_settings_size"' });
    if (!SEMVER.test(String(body?.app_version)) || !UUID_RE.test(String(body?.device_id)) || !Number.isInteger(body?.store_version)) return res(400, { code: '23514', message: 'row check' });
    const key = `${id}:${s}`;
    const prev = this.rows.get(key);
    if (method === 'POST' && prev) return res(409, { code: '23505', message: 'duplicate key value violates unique constraint "sync_snapshots_pkey"' });
    if (method === 'PATCH') {
      const want = Number(eq('rev'));
      if (!prev || prev.rev !== want) return res(200, []);
    }
    let rev: number;
    try {
      rev = this.nextRev(id, s, prev?.rev ?? 0, true);
    } catch {
      return res(400, { code: 'P0001', message: 'rate_limited' });
    }
    const row: Row = { store: s, store_version: body.store_version, app_version: body.app_version, device_id: body.device_id, rev, encoding: 'gzip+base64', state_gz: gz, raw_bytes: body.raw_bytes, updated_at: new Date(this.now()).toISOString() };
    this.rows.set(key, row);
    void headers;
    return res(method === 'POST' ? 201 : 200, [pickCols(row)]);
  }

  /** The server's rev: the write time in ms, or one more than the last, whichever is larger; 20 writes an hour. */
  private nextRev(id: string, store: string, oldRev: number, refuse: boolean): number {
    const key = `${id}:${store}`;
    const t = this.now();
    const w = this.writes.get(key);
    const win = !w || t - w.start > 3_600_000 ? { start: t, n: 1 } : { start: w.start, n: w.n + 1 };
    if (refuse && win.n > 20) throw new Error('rate_limited');
    this.writes.set(key, win);
    const rev = Math.max(t, oldRev + 1, (this.lastRev.get(key) ?? 0) + 1);
    this.lastRev.set(key, rev);
    return rev;
  }

  /** Put a row straight in the table (another device, or a hostile one). */
  putRow(userId: string, store: string, r: Partial<Row> & { state_gz: string; raw_bytes: number }) {
    const prev = this.rows.get(`${userId}:${store}`);
    const rev = this.nextRev(userId, store, prev?.rev ?? 0, false);
    this.rows.set(`${userId}:${store}`, { store, store_version: 1, app_version: '1.48.0', device_id: '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e', encoding: 'gzip+base64', updated_at: new Date(this.now()).toISOString(), ...r, rev });
  }
}
