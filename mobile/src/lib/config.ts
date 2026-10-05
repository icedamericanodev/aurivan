/**
 * Public app configuration, read from EXPO_PUBLIC_* environment variables
 * (see .env.example). These values are baked into the app and visible to
 * anyone — never put secrets here.
 */
export const config = {
  /** Live URL of privacy.html — REQUIRED by both stores before launch. */
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  /** Live URL of terms.html — required once subscriptions exist. */
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
  /** Supabase (Phase 3: accounts + sync). Publishable values only. */
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
