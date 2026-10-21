// Who is calling, and did they sign in recently? (pure; the Auth server check
// is behind AdminPort.getUser.)
//
// Order matters: the JWT is VERIFIED by the Auth server first (getUser), and
// only then are its claims decoded to read `amr`. A decoded-but-unverified
// claim is never trusted on its own.
//
// `amr` with timestamps: checked against the Supabase Auth source
// (internal/models/sessions.go, CalculateAALAndAMR). Every access token carries
// `amr: [{ method, timestamp }]`, one entry per sign-in method used in the
// session, with `timestamp` in Unix seconds, sorted newest first. A token
// refresh keeps the session's entries, so the newest timestamp is the last
// real sign-in, not the last refresh. If a token ever arrives without usable
// entries, recentAuth() is false and the app must sign in again (an email
// code, Apple or Google) before the request is retried.

import type { AdminPort, AuthUser } from './admin.ts';
import { HttpError } from './http.ts';

export interface AmrEntry {
  method: string;
  timestamp: number;
}

export interface Claims {
  sub: string;
  role: string;
  amr: AmrEntry[];
  /**
   * Authenticator assurance level: 'aal2' once the session has passed a
   * second factor (TOTP), 'aal1' otherwise (Supabase Auth, sessions.go
   * CalculateAALAndAMR). Anything missing or unknown is read as 'aal1'.
   */
  aal: 'aal1' | 'aal2';
}

/** Deleting the account needs a sign-in in the last 10 minutes. */
export const RECENT_AUTH_MS = 10 * 60 * 1000;
/** Allowed clock skew between the Auth server and this function. */
const SKEW_MS = 60 * 1000;
const MAX_JWT_LENGTH = 8192;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The bearer token from `Authorization: Bearer <jwt>`, or a 401. */
export function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer ([^\s]+)$/i.exec(header.trim());
  const token = match?.[1] ?? '';
  if (!token || token.length > MAX_JWT_LENGTH || !JWT_RE.test(token)) {
    throw new HttpError(401, 'unauthorized');
  }
  return token;
}

function base64UrlDecode(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decodes the payload of an ALREADY VERIFIED JWT. Returns null on any shape
 * problem. Malformed `amr` entries are dropped rather than trusted.
 */
export function decodeClaims(jwt: string): Claims | null {
  try {
    const payload = JSON.parse(base64UrlDecode(jwt.split('.')[1] ?? ''));
    if (!payload || typeof payload !== 'object') return null;
    const { sub, role, amr, aal } = payload as Record<string, unknown>;
    if (typeof sub !== 'string' || !UUID_RE.test(sub) || typeof role !== 'string') return null;
    const entries: AmrEntry[] = Array.isArray(amr)
      ? amr.flatMap((e) =>
        e && typeof e === 'object' &&
          typeof (e as AmrEntry).method === 'string' &&
          Number.isFinite((e as AmrEntry).timestamp)
          ? [{ method: (e as AmrEntry).method, timestamp: (e as AmrEntry).timestamp }]
          : []
      )
      : [];
    // Fail safe: only the exact string 'aal2' counts as a second factor.
    return { sub, role, amr: entries, aal: aal === 'aal2' ? 'aal2' : 'aal1' };
  } catch {
    return null;
  }
}

/**
 * The caller's verified account and claims. Otherwise:
 * - 401 `unauthorized`: no token, or a bad, expired or signed-out one;
 * - 410 `gone`: a genuine token for an account that no longer exists, which
 *   makes a repeated delete-account call something the app can treat as done;
 * - 500 `server` (serveSafely): the Auth server couldn't be asked. Never read
 *   as signed out or deleted.
 */
export async function requireUser(
  req: Request,
  admin: AdminPort,
): Promise<{ user: AuthUser; claims: Claims }> {
  const jwt = bearerToken(req);
  const user = await admin.getUser(jwt);
  if (user === 'gone') throw new HttpError(410, 'gone');
  if (user === 'invalid') throw new HttpError(401, 'unauthorized');
  const claims = decodeClaims(jwt);
  if (!claims || claims.sub !== user.id || claims.role !== 'authenticated') {
    throw new HttpError(401, 'unauthorized');
  }
  return { user, claims };
}

/** The newest sign-in time in ms, or null when the token carries none. */
export function lastSignInMs(claims: Claims): number | null {
  const newest = claims.amr.reduce((max, e) => Math.max(max, e.timestamp), -Infinity);
  return Number.isFinite(newest) ? newest * 1000 : null;
}

/** True when the newest sign-in is within `windowMs` of `nowMs` (and not in the future). */
export function recentAuth(claims: Claims, nowMs: number, windowMs = RECENT_AUTH_MS): boolean {
  const at = lastSignInMs(claims);
  if (at === null) return false;
  return at <= nowMs + SKEW_MS && nowMs - at <= windowMs;
}

export function requireRecentAuth(claims: Claims, nowMs: number): void {
  if (!recentAuth(claims, nowMs)) throw new HttpError(401, 'reauth_required');
}

/**
 * Staff work needs a session that passed a second factor (TOTP), not just an
 * email code: a phished mailbox alone must not open the moderation tools
 * (security audit M2, 21 Oct 2026). 401 `reauth_required` with detail
 * `mfa_required` tells the app to run the MFA challenge, then retry.
 */
export function requireMfa(claims: Claims): void {
  if (claims.aal !== 'aal2') throw new HttpError(401, 'reauth_required', 'mfa_required');
}
