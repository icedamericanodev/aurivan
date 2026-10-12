// The service-role client, for index.ts files only (handlers and tests never
// import this, so `deno test` needs no network). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided to Edge Functions by the platform
// (and by `supabase functions serve` locally); they are never in the app.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import type { AdminPort } from './admin.ts';
import { supabaseAdmin, type SupabaseLike } from './supabaseAdmin.ts';

export function adminFromEnv(): AdminPort | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  // The full client generics are too deep for the checker to match against the
  // narrow SupabaseLike shape; the adapter only calls the methods listed there.
  return supabaseAdmin(client as unknown as SupabaseLike);
}
