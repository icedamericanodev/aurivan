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
import { redirectLegacyPath } from '../lib/legacyLinks';
import { dropComposerPrefill } from '../lib/linkPrefill';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return dropComposerPrefill(redirectLegacyPath(path));
  } catch {
    return path;
  }
}
