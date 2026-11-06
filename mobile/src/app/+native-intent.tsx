/**
 * Expo Router's hook for links that open the app on a phone (a special file:
 * it is not a screen). Expo Router calls it only for links from OUTSIDE the
 * app (the launch link and later system links), never for in-app navigation.
 * We use it to:
 * 1. send links to removed screens somewhere sane (src/lib/legacyLinks.ts);
 * 2. drop the "?…" from links to the board's composer, so an outside link
 *    can't pre-fill a post (src/lib/linkPrefill.ts, security audit L1);
 * 3. keep onboarded learners off onboarding, and 4. new learners on it (below).
 * Every other link passes through unchanged.
 *
 * It must never throw (Expo Router: an error here can crash the app), so any
 * surprise falls back to the original path.
 */
import { needsOnboardingFirst, redirectLegacyPath, redirectNotOnboardedPath, redirectOnboardedPath } from '../lib/legacyLinks';
import { dropComposerPrefill } from '../lib/linkPrefill';
import { noteOutsideLink } from '../lib/outsideLinkNote';

/** The settings store, loaded only when a link needs it (an onboarding link, or one to a real screen). */
function settingsStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../store/settings') as typeof import('../store/settings')).useSettings;
}

/** Has this learner finished onboarding? */
function onboardedNow(): boolean {
  return settingsStore().getState().onboarded;
}

/**
 * 4. Release bug hunt round 3: a link to a real screen never skips onboarding. Saved settings loaded:
 *    a learner who has not onboarded goes to "/" (app/index.tsx opens onboarding). Not loaded yet (a
 *    cold start): the link opens as asked, and lib/outsideLinkGate.ts checks once they have (lib/outsideLinkNote.ts).
 */
function gateBeforeOnboarding(path: string): string {
  if (!needsOnboardingFirst(path)) return path;
  const useSettings = settingsStore();
  if (!useSettings.persist?.hasHydrated?.()) {
    noteOutsideLink();
    return path;
  }
  return redirectNotOnboardedPath(path, useSettings.getState().onboarded);
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // 3. A learner who has finished onboarding never lands on it again from a link (release bug hunt
    //    round 2). Saved settings may not be loaded yet on a cold start: the onboarding screen checks too.
    return dropComposerPrefill(redirectOnboardedPath(gateBeforeOnboarding(redirectLegacyPath(path)), onboardedNow));
  } catch {
    return path;
  }
}
