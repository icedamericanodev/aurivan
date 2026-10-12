/**
 * Old links that no longer have a screen, and where they land instead.
 *
 * Why: a learner may still have an old link (a note, an email from us, a
 * bookmark) to a screen we removed. Without this, Expo Router would show its
 * blank "unmatched route" screen. src/app/+native-intent.tsx calls this for
 * every link that opens the app on a phone.
 *
 * - "What's next" (aurivan://whats-next) was removed in mobile 1.17.1: the
 *   plan is internal now (kept outside this repo). Its old links open Help, which
 *   has What's new and "Suggest an idea".
 *
 * Pure: no React, no storage, no network. Tested in legacy-links.test.ts.
 */

/** Removed screen (the last part of the link) → where it lands now. */
const MOVED: Record<string, string> = {
  'whats-next': '/help',
};

/**
 * The path to open for an incoming link. Unknown or current links come back
 * unchanged, so normal links (aurivan://help?open=idea) keep working.
 * Accepts "/whats-next", "aurivan://whats-next" and the Expo Go form
 * "exp://192.168.1.2:8081/--/whats-next", with or without "?…" or "#…".
 */
export function redirectLegacyPath(path: string): string {
  // Drop "?query" and "#hash", then any trailing "/", then take the last part.
  const bare = path.split(/[?#]/)[0].replace(/\/+$/, '');
  const last = bare.slice(bare.lastIndexOf('/') + 1).toLowerCase();
  // Own keys only: "constructor" or "__proto__" must never match an inherited value.
  return Object.prototype.hasOwnProperty.call(MOVED, last) ? MOVED[last] : path;
}
