// The service-role client, for index.ts files only (handlers and tests never
// import this, so `deno test` needs no network). SUPABASE_URL and the server
// key (SUPABASE_SECRET_KEYS, or the legacy SUPABASE_SERVICE_ROLE_KEY: see
// serviceKey.ts) are provided to Edge Functions by the platform (and by
// `supabase functions serve` locally); they are never in the app.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import type { AdminPort } from './admin.ts';
import type { BoardDbPort } from './board.ts';
import { serviceKeyFromEnv } from './serviceKey.ts';
import { type RpcLike, supabaseBoard } from './supabaseBoard.ts';
import { supabaseAdmin, type SupabaseLike } from './supabaseAdmin.ts';

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = serviceKeyFromEnv((k) => Deno.env.get(k));
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function adminFromEnv(): AdminPort | null {
  const client = serviceClient();
  // The full client generics are too deep for the checker to match against the
  // narrow SupabaseLike shape; the adapter only calls the methods listed there.
  return client ? supabaseAdmin(client as unknown as SupabaseLike) : null;
}

/** The feedback board's functions (Phase 8): the account port and the board port, on one client. */
export function boardFromEnv(): { admin: AdminPort; board: BoardDbPort } | null {
  const client = serviceClient();
  if (!client) return null;
  return {
    admin: supabaseAdmin(client as unknown as SupabaseLike),
    board: supabaseBoard(client as unknown as RpcLike),
  };
}
