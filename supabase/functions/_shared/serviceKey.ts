// Which server key the Edge Functions use (pure: no imports).
//
// Supabase now gives Edge Functions SUPABASE_SECRET_KEYS, a JSON object of
// named secret keys (`{"default":"<the secret key>"}`), beside the legacy
// SUPABASE_SERVICE_ROLE_KEY, which stops working at the end of 2026. The
// `default` secret key is preferred; the legacy key is the fallback, so the
// functions keep working on either side of that switch. Neither is ever in
// the repo or the app.

/** The server key from the environment, or null when neither is usable. */
export function serviceKeyFromEnv(get: (key: string) => string | undefined): string | null {
  const keys = get('SUPABASE_SECRET_KEYS');
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, unknown>;
      const key = parsed?.default;
      if (typeof key === 'string' && key.length > 0) return key;
    } catch {
      // Unreadable: fall through to the legacy key.
    }
  }
  const legacy = get('SUPABASE_SERVICE_ROLE_KEY');
  return legacy ? legacy : null;
}
