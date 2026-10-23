/**
 * Public app configuration, read from EXPO_PUBLIC_* environment variables
 * (see .env.example). These values are baked into the app and visible to
 * anyone — never put secrets here.
 */
import { EMAIL_RE } from '../engine/support';

/**
 * The support inbox. It is already public (privacy.html, the website), so
 * it is the built-in default: reporting can never be switched off by a
 * missing or empty setting.
 */
export const DEFAULT_SUPPORT_EMAIL = 'certprep.support@gmail.com';

/** The env value when it is a real address; otherwise the default (an empty or broken value never disables support). */
export function supportEmailFrom(env: string | undefined): string {
  const v = (env ?? '').trim();
  return EMAIL_RE.test(v) ? v : DEFAULT_SUPPORT_EMAIL;
}

/**
 * The live Privacy policy and Terms of use pages (kaisip.com, checked
 * 22 Oct 2026). Both stores require the privacy link INSIDE the app, so these
 * are built-in defaults, like the support inbox: a build made without the
 * EXPO_PUBLIC_* settings still shows both rows in Settings (mobile 1.40.1).
 */
export const DEFAULT_PRIVACY_URL = 'https://kaisip.com/privacy';
export const DEFAULT_TERMS_URL = 'https://kaisip.com/terms';

/** The env value when it is an https:// link; otherwise the default (an empty or broken value never hides the row). */
export function linkFrom(env: string | undefined, fallback: string): string {
  const v = (env ?? '').trim();
  return /^https:\/\/\S+$/.test(v) ? v : fallback;
}

export const config = {
  /** Live URL of the privacy policy. REQUIRED in the app by both stores; never empty (see linkFrom). */
  privacyUrl: linkFrom(process.env.EXPO_PUBLIC_PRIVACY_URL, DEFAULT_PRIVACY_URL),
  /** Live URL of the terms of use. Never empty (see linkFrom). */
  termsUrl: linkFrom(process.env.EXPO_PUBLIC_TERMS_URL, DEFAULT_TERMS_URL),
  /** Where "Report a problem", "Send feedback" and "Contact support" emails go. Always set (see supportEmailFrom). */
  feedbackEmail: supportEmailFrom(process.env.EXPO_PUBLIC_FEEDBACK_EMAIL),
  // The cloud backend's URL and publishable key are NOT read here: only the
  // cloud runtime reads them (Phase 9, src/cloud/runtime.on.ts), so a build
  // with the cloud flag off carries no backend address at all (guard G2).
  /**
   * Month the question bank was last reviewed, shown in the trust line under
   * every answer ("Original · Reviewed Oct 2026"). Update it with each
   * content review.
   */
  contentReviewed: 'Oct 2026',
};
