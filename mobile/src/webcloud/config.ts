/**
 * The website's account settings (accounts beta §1, "Public config values").
 *
 * Plain English for the founder:
 * - These three values are PUBLIC on purpose. The project address and the
 *   publishable key are what every browser sends; they give no more access
 *   than a signed-out visitor has, and the database's row rules (RLS) decide
 *   the rest. No secret ever goes in this file or anywhere in the repo.
 * - The storage keys below are NEW names. The website's existing saved keys
 *   (cisa_*, aurivan_*) are never renamed or reused.
 *
 * Pure TypeScript: no React, no storage, no network.
 */

/** The Supabase project (Singapore). The website's CSP connect-src names exactly this host. */
export const SUPABASE_URL = 'https://ziadnvepttlgcowvqvom.supabase.co';
/** The publishable (public) key, sent as `apikey`. */
export const PUBLISHABLE_KEY = 'sb_publishable_s9eKQUQ0w3MTnCUBF05EkA_5e_kGEw2';
/** Where Google sends the learner back (must match the Auth redirect list exactly). */
export const REDIRECT_URL = 'https://kaisip.com/';
/** The only address that shows account features (never file:// or a preview host). */
export const ACCOUNT_ORIGIN = 'https://kaisip.com';

/** The session (tokens): localStorage, or sessionStorage on a shared computer. */
export const SESSION_KEY = 'kaisip_auth_v1';
/** The Google sign-in's one-time PKCE verifier: sessionStorage only, deleted after the exchange. */
export const PKCE_KEY = 'kaisip_pkce_v1';
/** This browser's sync record (the same fields as the phone's `aurivan.sync.v1`). */
export const SYNC_META_KEY = 'kaisip_sync_v1';
/** The account's synced stores as this browser last saw them, so phone-only study is never dropped. */
export const SYNC_MIRROR_KEY = 'kaisip_sync_mirror_v1';
/** "Use the account's progress here": this browser's progress before, kept 7 days. */
export const SYNC_UNDO_KEY = 'kaisip_sync_undo_v1';
/** This browser's random install id (sent with every push, like the phone's). */
export const DEVICE_ID_KEY = 'kaisip_device_v1';

/** navigator.locks names: one refresh at a time across tabs, one sync cycle at a time. */
export const AUTH_LOCK = 'kaisip-auth';
export const SYNC_LOCK = 'kaisip-sync';

/** Refresh the access token when it has less than this left (ms). */
export const REFRESH_MARGIN_MS = 60_000;
/**
 * A sign-in lasts at most 30 days (owner decision 28 Nov 2026; NIST SP
 * 800-63B-4 AAL1 reauthentication). The server's nightly job is the real
 * limit; this client also treats an older session as signed out (local
 * progress is never touched) and says "please sign in again to keep syncing".
 */
export const SESSION_MAX_AGE_MS = 30 * 86_400_000;
/** A session nobody used (no token refresh) for 14 days ends too (owner decision; server job to follow). */
export const SESSION_IDLE_MAX_MS = 14 * 86_400_000;
/**
 * A session that began with an emailed code and saved no password ends after
 * this long (codes only confirm an address or reset a password; owner
 * decision 28 Nov 2026). The database's first-password window is the same.
 */
export const CODE_SESSION_MAX_MS = 10 * 60_000;
/**
 * The leaked-password range check (k-anonymity; api.pwnedpasswords.com): ON
 * (owner decision 28 Nov 2026, "Do as recommended"). It runs when a password
 * is chosen, never at sign-in, and fails open (webcloud/breach.ts). The page
 * gives the SHA-1 port (browser.ts browserSha1Hex). The privacy-policy
 * paragraph goes live with the sign-in release (draft: design doc §7).
 */
export const BREACH_CHECK_ON = true;
/** The only address the leaked-password check contacts (the website CSP's connect-src allows it). */
export const BREACH_HOST = 'https://api.pwnedpasswords.com';
/** One reset code a minute from this page, for every address alike (audit LOW-1). */
export const RESET_RESEND_MS = 60_000;
/**
 * Why this browser was signed out without asking ({ reason, at }: no email,
 * no account id), so the page can say "please sign in again to keep
 * syncing" after a reload. Cleared by the next sign-in or a sign-out.
 */
export const AUTH_ENDED_KEY = 'kaisip_auth_ended_v1';
/**
 * "Set a password" is sent only within this long of the session's sign-in.
 * The database allows 10 minutes (password guard rule 4); one minute is
 * kept spare for clocks and slow networks (audit LOW-3).
 */
export const PASSWORD_FRESH_MS = 9 * 60_000;
/** The certification the website studies (CISA only for now). */
export const WEB_CERT = 'cisa';
