/**
 * PKCE for "Continue with Google" on the website (RFC 7636, method S256),
 * and reading the middle of an access token (accounts beta §1.1).
 *
 * Plain English for the founder:
 * - Before sending the learner to Google, the website makes a random secret
 *   (the "verifier") and sends only its fingerprint (the "challenge").
 *   When Google sends the learner back with a one-time code, the website
 *   proves it started the sign-in by showing the verifier. Someone who
 *   steals the code from the address bar can't use it without the verifier,
 *   which never left this tab (sessionStorage, deleted after use).
 * - `tokenClaims` reads the access token's public middle part, only for
 *   what the screens show (who is signed in, when they last signed in). It
 *   never trusts it for security: the server checks every token itself.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import { sha256 } from '../engine/sha256';
import { fromBase64Url, toBase64Url } from './base64';
import type { RandomPort } from './ports';
import { decodeUtf8 } from './utf8';

/** 32 random bytes → 43 base64url characters (RFC 7636 allows 43–128 of [A-Za-z0-9-._~]). */
export function makeVerifier(random: RandomPort): string {
  const bytes = random.bytes(32);
  if (bytes.length < 32) throw new Error('PKCE needs 32 random bytes');
  return toBase64Url(bytes.slice(0, 32));
}

/** True for a verifier this module could have made (or any RFC 7636 verifier). */
export function isVerifier(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(v);
}

/** The S256 challenge: base64url(SHA-256(ASCII verifier)). */
export function challengeFor(verifier: string): string {
  const ascii = Uint8Array.from(verifier, (c) => c.charCodeAt(0) & 0x7f);
  return toBase64Url(sha256(ascii));
}

/** What the screens read from an access token (never trusted for security). */
export interface TokenClaims {
  sub?: string;
  email?: string;
  exp?: number;
  /** Sign-in methods and when they were used (seconds): delete-account needs one from the last 10 minutes. */
  amr?: { method: string; timestamp: number }[];
}

/** The access token's middle part, or {} when it can't be read. */
export function tokenClaims(token: string): TokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  const bytes = fromBase64Url(parts[1]);
  if (!bytes || bytes.length > 16_384) return {};
  const text = decodeUtf8(bytes);
  if (text === null) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as TokenClaims) : {};
  } catch {
    return {};
  }
}

/** The latest sign-in time in the token's `amr` (epoch ms), or 0. */
export function lastSignInAt(claims: TokenClaims): number {
  let at = 0;
  for (const a of Array.isArray(claims.amr) ? claims.amr : []) {
    if (a && typeof a.timestamp === 'number' && Number.isFinite(a.timestamp)) at = Math.max(at, a.timestamp * 1000);
  }
  return at;
}
