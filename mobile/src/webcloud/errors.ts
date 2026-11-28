/**
 * Server answers → the app's CloudError codes, for the website client
 * (accounts beta §1.1; the codes and their copy are cloud/types.ts's).
 *
 * Plain English for the founder:
 * - Three servers answer: the sign-in server (GoTrue, /auth/v1), the
 *   database's REST API (PostgREST, /rest/v1) and the two account functions
 *   (/functions/v1). Each words its errors differently; this file turns
 *   every one into ONE short code the screens already have calm words for.
 * - A raw server message never leaves this file: no database text, token,
 *   email or user id reaches a screen or a log.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import { CloudError, type CloudErrorCode } from '../cloud/types';
import type { HttpResponse } from './ports';

/**
 * What the client was doing, so the same status can mean the right thing.
 * 'password': a password sign-in (POST /token?grant_type=password);
 * 'recover': asking for a reset code (POST /recover);
 * 'user_update': saving a password (PUT /user).
 */
export type Call = 'otp' | 'verify' | 'pkce' | 'refresh' | 'logout' | 'user' | 'rest' | 'function' | 'password' | 'recover' | 'user_update';

/**
 * The `detail` words the password flows use (each gets calm copy on the
 * screens; never a server message):
 * - password_wrong: "That email and password don't match" (the same words
 *   whether or not the address has an account, or a password);
 * - password_too_short / _too_long / _common / _too_simple /
 *   _contains_email / _contains_service_word / _invalid_characters: the
 *   app's own rules (engine/passwordRules.ts), refused before anything is
 *   sent (passwordGuidance has the words to show);
 * - password_needed: a session that began with an emailed code has saved
 *   no password yet, so it may not sync (codes only confirm or recover);
 * - password_leaked: the server's leaked-password check (Pro plan only);
 * - password_weak: the server refused it for another reason (its settings
 *   ask for more than the app does);
 * - password_same: the new password is the current one;
 * - password_current_needed / password_current_wrong: changing a password
 *   needs the current one, or it didn't match;
 * - with code 'reauth_required': recent_sign_in (sign in again first: the
 *   database's 10-minute rule, or the server's 24-hour one) and aal2 (staff
 *   with an authenticator app);
 * - with code 'unauthorized': session_expired (the 30-day limit or 14 days
 *   unused) and password_not_set (a code session that saved no password
 *   within 10 minutes);
 * - with code 'offline': password_rules (the word lists couldn't be loaded,
 *   so no password is saved: fail closed).
 */
export type PasswordDetail =
  | 'password_wrong'
  | 'password_invalid_characters'
  | 'password_needed'
  | 'password_too_short'
  | 'password_too_long'
  | 'password_common'
  | 'password_too_simple'
  | 'password_contains_email'
  | 'password_contains_service_word'
  | 'password_leaked'
  | 'password_weak'
  | 'password_same'
  | 'password_current_needed'
  | 'password_current_wrong';

/** The JSON body, or {} when it isn't a JSON object. Never longer than 64 KB read. */
export function bodyObject(text: string): Record<string, unknown> {
  if (text.length > 65_536) return {};
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The Retry-After seconds, when the server sent a sensible one. */
export function retryAfter(res: Pick<HttpResponse, 'headers'>): number | undefined {
  const v = Number(res.headers.get('retry-after'));
  return Number.isFinite(v) && v > 0 && v <= 86_400 ? Math.ceil(v) : undefined;
}

const str = (x: unknown) => (typeof x === 'string' ? x : '');

/** GoTrue's machine word for the error (new `error_code`, or the older `error`). */
function authWord(b: Record<string, unknown>): string {
  // Newer answers carry `error_code`; some carry the word in `code` (older ones put the HTTP number there).
  return (str(b.error_code) || str(b.code) || str(b.error)).toLowerCase();
}

/** The account functions' codes that the app knows (supabase/functions/_shared/http.ts ErrorCode). */
const FUNCTION_CODES: ReadonlySet<CloudErrorCode> = new Set<CloudErrorCode>(['unauthorized', 'gone', 'reauth_required', 'rate_limited', 'invalid', 'too_big', 'server']);

/** One failed answer → a CloudError. `status` is 0 for "the network failed". */
export function toCloudError(call: Call, status: number, text: string, res?: Pick<HttpResponse, 'headers'>): CloudError {
  if (status === 0) return new CloudError('offline');
  const b = bodyObject(text);
  const after = res ? retryAfter(res) : undefined;
  if (status === 429) return new CloudError('rate_limited', after);
  // Saving a password: a plain 500 is the database's password guard refusing a first password
  // without a sign-in in the last 10 minutes (kaisip_password_needs_recent_sign_in; the Auth
  // server answers "Error during password storage"). Gateways and outages (502–504) stay 'server'.
  if (call === 'user_update' && status === 500) return new CloudError('reauth_required', undefined, 'recent_sign_in');
  if (status >= 500) return new CloudError('server');

  if (call === 'function') {
    const code = str(b.error) as CloudErrorCode;
    if (FUNCTION_CODES.has(code)) {
      const detail = str(b.detail);
      return new CloudError(code, after, /^[a-z_]{1,40}$/.test(detail) ? detail : undefined);
    }
    return new CloudError(status === 401 ? 'unauthorized' : 'server');
  }

  if (call === 'rest') {
    const pg = str(b.code);
    const msg = str(b.message);
    if (status === 401 || pg === 'PGRST301' || pg === 'PGRST302') return new CloudError('unauthorized');
    if (status === 409 || pg === '23505') return new CloudError('conflict');
    // The database's write limit (private.sync_next_rev): 20 writes per store per hour.
    if (pg === 'P0001' && msg === 'rate_limited') return new CloudError('rate_limited', after);
    // Row rules said no: the Terms aren't accepted yet (no profile row), so a write is refused.
    if (pg === '42501') return new CloudError('invalid', undefined, 'terms');
    if (status === 413) return new CloudError('too_big');
    if (pg === '23514') return /state_gz|raw_bytes|sync_settings_size/.test(msg) ? new CloudError('too_big') : new CloudError('invalid', undefined, 'row');
    return new CloudError('invalid', undefined, 'row');
  }

  const word = authWord(b);
  switch (call) {
    case 'otp':
      if (word.includes('captcha')) return new CloudError('invalid', undefined, 'captcha');
      if (word.includes('rate_limit')) return new CloudError('rate_limited', after);
      if (word === 'signup_disabled' || word === 'email_provider_disabled') return new CloudError('invalid', undefined, 'signup_disabled');
      return new CloudError('invalid', undefined, 'email');
    case 'verify':
      // GoTrue can't tell an expired code from a wrong one (cloud/types.ts): both are "code_wrong".
      return new CloudError('invalid', undefined, 'code_wrong');
    case 'pkce':
      // A code used twice, too old, or a verifier that doesn't match: start Google sign-in again.
      return new CloudError('invalid', undefined, 'oauth');
    case 'refresh':
      // The refresh token is spent, revoked or unknown: the session is over.
      return new CloudError('unauthorized');
    case 'password':
      if (word.includes('captcha')) return new CloudError('invalid', undefined, 'captcha');
      if (word.includes('rate_limit')) return new CloudError('rate_limited', after);
      // invalid_credentials, and also email_not_confirmed (a correct password on an address nobody
      // confirmed: only a stranger's /signup makes one, and saying so would confirm their guess),
      // and anything else: one answer, the same whether or not the address exists.
      return new CloudError('invalid', undefined, 'password_wrong');
    case 'recover':
      if (word.includes('captcha')) return new CloudError('invalid', undefined, 'captcha');
      if (word.includes('rate_limit')) return new CloudError('rate_limited', after);
      if (word === 'email_provider_disabled') return new CloudError('invalid', undefined, 'signup_disabled');
      return new CloudError('invalid', undefined, 'email');
    case 'user_update':
      return userUpdateError(status, word, b);
    case 'logout':
    case 'user':
      return new CloudError(status === 401 || status === 403 || status === 404 ? 'unauthorized' : 'invalid');
    default:
      return new CloudError('server');
  }
}

/** PUT /auth/v1/user refusing a password (GoTrue v2.199.0 internal/api/user.go, password.go). */
function userUpdateError(status: number, word: string, b: Record<string, unknown>): CloudError {
  const bad = (d: PasswordDetail) => new CloudError('invalid', undefined, d);
  switch (word) {
    case 'weak_password': {
      const wp = b.weak_password && typeof b.weak_password === 'object' ? (b.weak_password as Record<string, unknown>) : {};
      const reasons = Array.isArray(wp.reasons) ? wp.reasons.filter((r): r is string => typeof r === 'string') : [];
      if (reasons.includes('pwned')) return bad('password_leaked');
      if (reasons.includes('length')) return bad('password_too_short');
      return bad('password_weak');
    }
    case 'same_password':
      return bad('password_same');
    case 'current_password_required':
      return bad('password_current_needed');
    case 'current_password_mismatch':
      return bad('password_current_wrong');
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return new CloudError('reauth_required', undefined, 'recent_sign_in');
    case 'insufficient_aal':
      return new CloudError('reauth_required', undefined, 'aal2');
  }
  if (status === 401 || status === 403 || status === 404 || word === 'bad_jwt' || word === 'session_not_found' || word === 'user_not_found') return new CloudError('unauthorized');
  // "Password cannot be longer than 72 characters" (password.go): the app checks first, so rare.
  if (word === 'validation_failed' && /\b72\b/.test(str(b.msg) || str(b.message))) return bad('password_too_long');
  return bad('password_weak');
}

/** Anything thrown → a CloudError (a network failure reads as offline). */
export function asCloudError(e: unknown): CloudError {
  return e instanceof CloudError ? e : new CloudError('offline');
}
