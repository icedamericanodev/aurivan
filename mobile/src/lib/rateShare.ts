/**
 * "Rate this app" and "Share this app" (Settings → Help and about; mobile 2.2, a tester's suggestion).
 *
 * Plain English for the founder:
 * - Rate: opens KaiSip's page in the Google Play app. If the phone has no store app that takes the
 *   link, it opens the same page in the browser. If neither opens, the row says so in plain words.
 * - Share: opens the phone's own share sheet with ONE fixed line and the public website link.
 *
 * Rules these follow (Google Play policy and our privacy promise):
 * - Only when the learner taps the row. No in-app review API, no prompt, no pop-up, no reward, and
 *   no "do you like the app?" question first.
 * - Nothing about the learner is shared: no name, scores, progress, question history, device
 *   details, email or file. The text is the same for everyone (SHARE_APP_TEXT, tested word for word).
 * - It does not promise the app is publicly available (it is in closed testing; kaisip.com has the
 *   waitlist), so the link is the website, not a store page.
 * - No network code here: the phone's own apps open the links. No analytics, no new permission, no
 *   new package (React Native's own Linking and Share, as lib/support.ts uses).
 * - We never call `canOpenURL` first: on Android 11+ it answers "no" without extra app config even
 *   when Google Play is there (the same reason as lib/support.ts). We just try, and catch.
 * - We never claim success: the phone can't tell us that a rating was left or a message was sent.
 *
 * The incoming-link helpers (lib/outsideLinkGate.ts, lib/outsideLinkNote.ts) are about links that
 * OPEN the app before onboarding; they do not apply to leaving it. Leaving the app follows the
 * Privacy policy / Terms rows instead (Linking.openURL, with a hint saying where it opens).
 *
 * The builders at the top are pure (no phone APIs); the two actions at the bottom take the phone's
 * function as a parameter so the tests can stand in for it.
 */
import { Linking, Platform, Share } from 'react-native';

/** KaiSip's Google Play package (the same as expo.android.package in app.json; a test keeps them in step). */
export const STORE_PACKAGE = 'com.kaisip.app';

/** The public website (it has the waitlist). The only link "Share this app" ever sends. */
export const PUBLIC_SITE_URL = 'https://kaisip.com';

/** The whole message "Share this app" sends: one neutral line and the public link. Nothing else, ever. */
export const SHARE_APP_TEXT = `KaiSip: CISA exam practice that explains why the best answer wins. ${PUBLIC_SITE_URL}`;

/** Shown on the row (and said once) when neither Google Play nor a browser could open the page. */
export const RATE_FAILED_LINE = 'Google Play could not be opened on this phone.';
/** Shown on the row (and said once) when the phone has no share sheet to open. */
export const SHARE_FAILED_LINE = 'Sharing is not available on this phone. The link is kaisip.com.';

/** The app's page in the Google Play app ("market://details?id=com.kaisip.app"). */
export function playStoreAppUrl(pkg: string = STORE_PACKAGE): string {
  return `market://details?id=${encodeURIComponent(pkg)}`;
}

/** The same page on the web, for a phone with no store app that takes the market:// link. */
export function playStoreWebUrl(pkg: string = STORE_PACKAGE): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
}

/** Where "Rate this app" goes: the store app first, then the web page. */
export interface RateLinks {
  app: string;
  web: string;
}

/**
 * The rating page for this kind of phone, or null when there is none (then the row is not drawn).
 * Android only: there is no App Store listing yet, and the web build has no store page of its own.
 * Add iOS here when the App Store listing exists.
 */
export function rateLinks(os: string = Platform.OS): RateLinks | null {
  return os === 'android' ? { app: playStoreAppUrl(), web: playStoreWebUrl() } : null;
}

/** What "Share this app" hands to the share sheet: the message and nothing else (no title, no file). */
export function shareAppContent(): { message: string } {
  return { message: SHARE_APP_TEXT };
}

/**
 * Open the rating page. Resolves 'store' (the Google Play app took the link), 'browser' (it did
 * not, the web page opened instead) or 'failed' (nothing could open it, or this phone has no
 * rating page). Never throws.
 */
export async function openStorePage(
  links: RateLinks | null = rateLinks(),
  open: (url: string) => Promise<unknown> = (url) => Linking.openURL(url),
): Promise<'store' | 'browser' | 'failed'> {
  if (!links) return 'failed';
  try {
    await open(links.app);
    return 'store';
  } catch {
    // No app takes market:// links (no Google Play on this phone): try the web page.
  }
  try {
    await open(links.web);
    return 'browser';
  } catch {
    return 'failed';
  }
}

/** True for the error a browser gives when the learner closes its share sheet (the web build only). */
function closedByLearner(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

/**
 * Open the share sheet with the approved text. Resolves 'shared' (the sheet opened and was used, as
 * far as the phone says: Android answers this even when the learner backs out), 'dismissed' (the
 * learner closed it) or 'failed' (no share sheet). Never throws. Callers do nothing for the first
 * two: we can't know a message was sent, so we never say it was.
 */
export async function shareApp(
  share: (content: { message: string }) => Promise<{ action?: string } | void> = (content) => Share.share(content),
): Promise<'shared' | 'dismissed' | 'failed'> {
  try {
    const result = await share(shareAppContent());
    return result && result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch (e) {
    return closedByLearner(e) ? 'dismissed' : 'failed';
  }
}
