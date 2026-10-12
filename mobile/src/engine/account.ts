/**
 * Account rules (Uplift Phase 6, "Accounts", built OFF): pure, tested in
 * __tests__/account-engine.test.ts. No React, no storage, no network.
 *
 * Everything here is a small decision the account screens and lib/account.ts
 * need: is this an email address, is this a 6-digit code, how to show an
 * email without showing it all, which sign-in buttons a phone may show, and
 * whether a sign-in is recent enough to delete the account.
 */
import { sha256Hex, toHex } from './sha256';
import { dayKey } from './streak';
import { EMAIL_RE } from './support';

/** The Terms of Use version a learner accepts when they make an account ("YYYY-MM"). */
export const TERMS_VERSION = '2026-11';

/** Sign-in codes are 6 digits. */
export const CODE_LENGTH = 6;
/** A code is accepted for 10 minutes. */
export const CODE_TTL_MS = 10 * 60_000;
/** "Send a new code" waits 60 seconds after each send. */
export const RESEND_WAIT_MS = 60_000;
/** After 5 wrong codes the learner must ask for a new one. */
export const MAX_CODE_TRIES = 5;
/** Deleting the account needs a sign-in from the last 10 minutes (else: confirm it's you first). */
export const REAUTH_WINDOW_MS = 10 * 60_000;
/** "Download my data" works once an hour (the server enforces it; the memory backend copies it). */
export const EXPORT_EVERY_MS = 60 * 60_000;
/** Longest email address we accept (RFC 5321's path limit). */
const MAX_EMAIL = 254;

export type Provider = 'email' | 'apple' | 'google';
export const ALL_PROVIDERS: readonly Provider[] = ['email', 'apple', 'google'];

/** The address Apple's "Hide my email" gives: it is never shown in the app. */
const RELAY_DOMAIN = '@privaterelay.appleid.com';

/**
 * Which sign-in methods this build turns on, from
 * EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS ("email,apple,google"). Unset or
 * empty = all three. Unknown words are ignored; order and repeats don't matter.
 */
export function parseProviders(raw: string | undefined): Provider[] {
  const words = (raw ?? '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  if (!words.length) return [...ALL_PROVIDERS];
  return ALL_PROVIDERS.filter((p) => words.includes(p));
}

/**
 * The sign-in buttons to show, top to bottom (Apple, Google, email).
 * - Apple only on iOS (and on the web screenshot build, which stands in for iOS).
 * - App Store rule 4.8: on iOS, if Google shows, Apple shows too, so Apple is
 *   forced on there. (The build's config check refuses that combination
 *   anyway: cloud/configGuard.ts.)
 */
export function providersFor(platform: string, enabled: readonly Provider[]): Provider[] {
  const appleCapable = platform === 'ios' || platform === 'web';
  const google = enabled.includes('google');
  const apple = appleCapable && (enabled.includes('apple') || (google && platform === 'ios'));
  const out: Provider[] = [];
  if (apple) out.push('apple');
  if (google) out.push('google');
  if (enabled.includes('email')) out.push('email');
  return out;
}

/** An email the way we send it: trimmed and in lower case. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True for a plausible email address (the same pattern as the support address check). */
export function validEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return e.length > 0 && e.length <= MAX_EMAIL && EMAIL_RE.test(e);
}

/** The digits of a typed code, at most 6 (spaces and dashes from a pasted "123 456" are dropped). */
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** True for exactly 6 digits. */
export function validCode(raw: string): boolean {
  return /^\d{6}$/.test(raw);
}

/** True for Apple's private relay address ("Hide my email"). */
export function isRelayEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith(RELAY_DOMAIN);
}

/**
 * An email as the app shows it: the first letter, "•••", then the domain
 * ("j•••@gmail.com"). Null for an Apple relay address (never shown) or
 * anything that isn't an address.
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email || isRelayEmail(email)) return null;
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  if (at < 1 || at === e.length - 1) return null;
  // The first character, whole (an emoji or accented letter is one character).
  const first = Array.from(e)[0];
  return `${first}•••${e.slice(at)}`;
}

/**
 * True when the newest sign-in is recent enough for a sensitive action
 * (delete the account). A sign-in time more than a minute in the future
 * (a wrong clock) does not count as recent.
 */
export function recentAuth(authAt: number, now: number, windowMs = REAUTH_WINDOW_MS): boolean {
  if (!Number.isFinite(authAt) || authAt > now + 60_000) return false;
  return now - authAt < windowMs;
}

/** Delete, step 2: type DELETE straight away (recent sign-in), or confirm it's you first. */
export function deleteGate(authAt: number, now: number): 'type' | 'reauth' {
  return recentAuth(authAt, now) ? 'type' : 'reauth';
}

/** The learner typed the confirmation word. */
export function typedDelete(raw: string): boolean {
  return raw.trim() === 'DELETE';
}

/**
 * Which method to confirm "it's you" with before deleting: Apple first (its
 * fresh authorisation code lets the server revoke Apple's token), then
 * Google, then email; only ones this phone can show. Falls back to the
 * account's first method.
 */
export function reauthProvider(accountProviders: readonly Provider[], shown: readonly Provider[]): Provider {
  for (const p of ['apple', 'google', 'email'] as const) {
    if (accountProviders.includes(p) && shown.includes(p)) return p;
  }
  return accountProviders[0] ?? 'email';
}

/** Milliseconds until "Send a new code" is allowed again (0 = now). */
export function resendWaitMs(sentAt: number | null, now: number): number {
  if (sentAt === null) return 0;
  return Math.max(0, Math.min(RESEND_WAIT_MS, sentAt + RESEND_WAIT_MS - now));
}

/** "0:42" for 42 seconds (rounded up, so it never shows 0:00 while still waiting). */
export function clockLabel(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "42 seconds" / "1 minute" for screen readers. */
export function clockSpoken(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 60 && s % 60 === 0) return s === 60 ? '1 minute' : `${s / 60} minutes`;
  return s === 1 ? '1 second' : `${s} seconds`;
}

/** The account data file's name: aurivan-account-2026-10-12.json (local date). */
export function accountExportFileName(now: number): string {
  return `aurivan-account-${dayKey(now)}.json`;
}

/**
 * What the phone remembers about WHICH account it synced with: a hash of the
 * account id, so the raw id never sits in AsyncStorage.
 */
export function accountHash(userId: string): string {
  return sha256Hex(userId);
}

// ── Sign in with Apple: the nonce ─────────────────────────────────────
/**
 * A nonce from random bytes (32 bytes from the phone's secure random
 * source in the real adapter): Apple gets its SHA-256 (`hashed`), our
 * backend the raw value, which it hashes and compares with the token's.
 */
export function appleNonce(randomBytes: Uint8Array): { raw: string; hashed: string } {
  if (randomBytes.length < 16) throw new Error('nonce needs at least 16 random bytes');
  const raw = toHex(randomBytes);
  return { raw, hashed: sha256Hex(raw) };
}

/**
 * Each nonce is used once: `issue` when the Apple sheet opens, `consume`
 * when its token comes back. A nonce never issued, or already used, is
 * refused (a replayed token).
 */
export function createNonceGuard() {
  const open = new Set<string>();
  return {
    issue(raw: string) {
      open.add(raw);
    },
    consume(raw: string): boolean {
      return open.delete(raw);
    },
  };
}
