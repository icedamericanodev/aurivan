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

export const config = {
  /** Live URL of privacy.html — REQUIRED by both stores before launch. */
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  /** Live URL of terms.html — required once subscriptions exist. */
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
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
