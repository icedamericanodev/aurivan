/**
 * Old links that no longer have a screen, and where they land instead.
 *
 * Why: a learner may still have an old link (a note, an email from us, a
 * bookmark) to a screen we removed. Without this, Expo Router would show its
 * blank "unmatched route" screen. src/app/+native-intent.tsx calls this for
 * every link that opens the app on a phone.
 *
 * - "What's next" (kaisip://whats-next) was removed in mobile 1.17.1: the
 *   plan is internal now (kept outside this repo). Its old links open Help, which
 *   has What's new and "Suggest an idea".
 * - The Play tab (kaisip://play) was removed in mobile 1.51 (the owner's menu
 *   pick A): its games are Drills, a section of Practice. Its old links open
 *   Practice at Drills (the same place app/play.tsx sends in-app links).
 *
 * Pure: no React, no storage, no network. Tested in legacy-links.test.ts.
 */

/** Removed screen (the last part of the link) → where it lands now. */
const MOVED: Record<string, string> = {
  'whats-next': '/help',
  play: '/practice?section=drills',
  // The old Progress and Mock tabs (removed with the four-tab menu): their pages live in You and Practice now.
  progress: '/you',
  mock: '/practice',
};

/**
 * The path to open for an incoming link. Unknown or current links come back
 * unchanged, so normal links (kaisip://help?open=idea) keep working.
 * Accepts "/whats-next", "kaisip://whats-next" and the Expo Go form
 * "exp://192.168.1.2:8081/--/whats-next", with or without "?…" or "#…".
 */
export function redirectLegacyPath(path: string): string {
  // Drop "?query" and "#hash", then any trailing "/", then take the last part.
  const bare = path.split(/[?#]/)[0].replace(/\/+$/, '');
  const last = bare.slice(bare.lastIndexOf('/') + 1).toLowerCase();
  // Own keys only: "constructor" or "__proto__" must never match an inherited value.
  return Object.prototype.hasOwnProperty.call(MOVED, last) ? MOVED[last] : path;
}

/**
 * Release bug hunt round 2: an outside link to onboarding ("kaisip://onboarding") for a learner who has
 * already finished it lands on Today instead (the onboarding screen has the same guard; this one acts
 * before the screen opens). Any other link, or a learner still onboarding, passes through unchanged.
 */
export function redirectOnboardedPath(path: string, onboarded: boolean | (() => boolean)): string {
  const bare = path.split(/[?#]/)[0].replace(/\/+$/, '');
  const last = bare.slice(bare.lastIndexOf('/') + 1).toLowerCase();
  if (last !== 'onboarding') return path;
  // Asked only for an onboarding link (a function is called here, so other links never load settings).
  return (typeof onboarded === 'function' ? onboarded() : onboarded) ? '/home' : path;
}

/**
 * Release bug hunt round 3: the screen part of an incoming link, lower case, without slashes, "?…" or
 * "#…" ("kaisip://settings?section=data" → "settings", "kaisip://" → "", the Expo Go form
 * "exp://host:8081/--/home" → "home").
 */
export function linkRoute(path: string): string {
  let p = path.split(/[?#]/)[0];
  const dash = p.indexOf('/--/');
  if (dash >= 0) p = p.slice(dash + 4);
  else if (/^exps?:\/\//i.test(p)) p = '';
  else p = p.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  return p.replace(/^\/+|\/+$/g, '').toLowerCase();
}

/**
 * Links that may open before onboarding is finished: the start ("/", which sends a new learner to
 * onboarding), onboarding itself, and the widget link (it checks onboarding on its own,
 * lib/widgetOpen.ts). The dev client's own links are left alone.
 */
const OPEN_BEFORE_ONBOARDING = new Set(['', 'index', 'onboarding', 'widget', 'expo-development-client']);

/** True when this link leads to a screen a learner reaches only after onboarding. */
export function needsOnboardingFirst(path: string): boolean {
  return !OPEN_BEFORE_ONBOARDING.has(linkRoute(path));
}

/**
 * Release bug hunt round 3: an outside link to a real screen (kaisip://home, kaisip://settings…)
 * skipped onboarding on a fresh install. For a learner who has not finished onboarding it now goes to
 * "/", and app/index.tsx opens onboarding. Onboarded learners' links pass through unchanged.
 */
export function redirectNotOnboardedPath(path: string, onboarded: boolean): string {
  return !onboarded && needsOnboardingFirst(path) ? '/' : path;
}
