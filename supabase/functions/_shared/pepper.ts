// The deletion audit's keyed hash (pure: WebCrypto only, no imports).
//
// private.deletions keeps HMAC-SHA-256(DELETION_PEPPER, user id) as 64
// lowercase hex characters, never the id and never a plain SHA-256 of it: the
// phone keeps a plain SHA-256 of the account id (syncedAccountHash), so a
// plain hash could be joined with it. DELETION_PEPPER is an Edge Function
// secret (Dashboard → Edge Functions → Secrets), at least 32 characters,
// typed by the owner; it is never in the repo, the app or the database.

/** Shorter values are treated as missing: a short pepper could be guessed. */
export const MIN_PEPPER_LENGTH = 32;

/** The pepper from the environment, or null when it is unset or too short. */
export function pepperFromEnv(get: (key: string) => string | undefined): string | null {
  const v = get('DELETION_PEPPER');
  return typeof v === 'string' && v.length >= MIN_PEPPER_LENGTH ? v : null;
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** HMAC-SHA-256 of `message` under `key` (both UTF-8), as lowercase hex. */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
}

/** The audit row's hash for a user id (lowercased first, so one id has one hash). */
export function deletionHash(pepper: string, userId: string): Promise<string> {
  return hmacSha256Hex(pepper, userId.toLowerCase());
}
