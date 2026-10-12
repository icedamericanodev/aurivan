/**
 * Expo Router's hook for links that open the app on a phone (a special file:
 * it is not a screen). We use it only to send links to removed screens
 * somewhere sane: see src/lib/legacyLinks.ts. Every other link passes
 * through unchanged.
 *
 * It must never throw (Expo Router: an error here can crash the app), so any
 * surprise falls back to the original path.
 */
import { redirectLegacyPath } from '../lib/legacyLinks';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return redirectLegacyPath(path);
  } catch {
    return path;
  }
}
