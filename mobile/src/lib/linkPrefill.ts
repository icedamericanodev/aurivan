/**
 * Links from OUTSIDE the app may not pre-fill the board's composer.
 *
 * Why (security audit L1, 21 Oct 2026): the composer (board/new) reads `body`
 * and `kind` from its route params, so the in-app "Suggest an idea" sheet can
 * carry the learner's own words into it. Without this, a crafted link such as
 * kaisip://board/new?body=... (in an email, a web page or a chat) would open
 * the composer with someone else's words, one tap from being posted under the
 * learner's public name.
 *
 * src/app/+native-intent.tsx calls this ONLY for links that the phone hands to
 * the app (Expo Router's redirectSystemPath). In-app navigation
 * (router.push with params) never passes through it, so the feedback sheet's
 * carry keeps working.
 *
 * Pure: no React, no storage, no network. Tested in link-prefill.test.ts.
 */

/** "board/new" as the last two parts of a path ("kaisip://board/new", "/(cloud)/board/new"). */
const COMPOSER = /(^|[/:])board\/new$/;

/**
 * The incoming link without its "?query" and "#hash" when it opens the
 * composer; every other link comes back unchanged.
 */
export function dropComposerPrefill(path: string): string {
  // The path part only, without a trailing "/".
  const bare = path.split(/[?#]/)[0].replace(/\/+$/, '');
  // Compare a decoded, lower-case copy, so "board/NEW" or "board/n%65w" can't slip past.
  let check = bare;
  try {
    check = decodeURIComponent(bare);
  } catch {
    // A broken %-escape: compare the raw text instead.
  }
  return COMPOSER.test(check.toLowerCase()) ? bare : path;
}
