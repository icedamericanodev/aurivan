/**
 * Expo Router's hook for links that open the app on a phone (a special file:
 * it is not a screen). Expo Router calls it only for links from OUTSIDE the
 * app (the launch link and later system links), never for in-app navigation.
 * We use it to:
 * 1. send links to removed screens somewhere sane (src/lib/legacyLinks.ts);
 * 2. drop the "?…" from links to the board's composer, so an outside link
 *    can't pre-fill a post (src/lib/linkPrefill.ts, security audit L1).
 * Every other link passes through unchanged.
 *
 * It must never throw (Expo Router: an error here can crash the app), so any
 * surprise falls back to the original path.
 */
import { redirectLegacyPath, redirectOnboardedPath } from '../lib/legacyLinks';
import { dropComposerPrefill } from '../lib/linkPrefill';

/** Has this learner finished onboarding? The settings store is loaded only when an onboarding link asks. */
function onboardedNow(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useSettings } = require('../store/settings') as typeof import('../store/settings');
  return useSettings.getState().onboarded;
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // 3. A learner who has finished onboarding never lands on it again from a link (release bug hunt
    //    round 2). Saved settings may not be loaded yet on a cold start: the onboarding screen checks too.
    return dropComposerPrefill(redirectOnboardedPath(redirectLegacyPath(path), onboardedNow));
  } catch {
    return path;
  }
}
