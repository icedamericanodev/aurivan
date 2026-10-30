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
/** The certification the website studies (CISA only for now). */
export const WEB_CERT = 'cisa';
