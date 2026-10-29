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

/** What the client was doing, so the same status can mean the right thing. */
export type Call = 'otp' | 'verify' | 'pkce' | 'refresh' | 'logout' | 'user' | 'rest' | 'function';

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
  return (str(b.error_code) || str(b.error)).toLowerCase();
}

/** The account functions' codes that the app knows (supabase/functions/_shared/http.ts ErrorCode). */
const FUNCTION_CODES: ReadonlySet<CloudErrorCode> = new Set<CloudErrorCode>(['unauthorized', 'gone', 'reauth_required', 'rate_limited', 'invalid', 'too_big', 'server']);

/** One failed answer → a CloudError. `status` is 0 for "the network failed". */
export function toCloudError(call: Call, status: number, text: string, res?: Pick<HttpResponse, 'headers'>): CloudError {
  if (status === 0) return new CloudError('offline');
  const b = bodyObject(text);
  const after = res ? retryAfter(res) : undefined;
  if (status === 429) return new CloudError('rate_limited', after);
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
    case 'logout':
    case 'user':
      return new CloudError(status === 401 || status === 403 || status === 404 ? 'unauthorized' : 'invalid');
    default:
      return new CloudError('server');
  }
}

/** Anything thrown → a CloudError (a network failure reads as offline). */
export function asCloudError(e: unknown): CloudError {
  return e instanceof CloudError ? e : new CloudError('offline');
}
