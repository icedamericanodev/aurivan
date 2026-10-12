// The real AdminPort, on a supabase-js client created with the SERVICE ROLE key
// (Function secret; never in the app). It is typed against the few client
// methods it uses, so the deno tests can check it with a fake client and no
// network.
//
// Private tables are reached only through the `svc_*` functions in
// 20261005000000_init_mobile_sync.sql (security invoker, service_role only),
// because schema `private` is not exposed by the Data API.

import type { AdminPort, AuthUser, BoardCounts, Provider } from './admin.ts';

interface RawUser {
  id: string;
  email?: string | null;
  created_at?: string | null;
  app_metadata?: { provider?: unknown; providers?: unknown } | null;
  identities?: { provider?: unknown }[] | null;
}

type Thenable<T> = PromiseLike<T>;

export interface SupabaseLike {
  auth: {
    getUser(jwt: string): Thenable<{ data: { user: RawUser | null }; error: unknown }>;
    admin: { deleteUser(id: string): Thenable<{ error: unknown }> };
  };
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): Thenable<{ data: unknown; error: unknown }> };
    };
  };
  rpc(fn: string, args: Record<string, unknown>): Thenable<{ data: unknown; error: unknown }>;
}

const KNOWN: readonly Provider[] = ['email', 'apple', 'google'];

/** Linked sign-in methods, from app_metadata and identities, known ones only. */
export function providersOf(u: RawUser): Provider[] {
  const raw = new Set<unknown>();
  const meta = u.app_metadata ?? {};
  if (Array.isArray(meta.providers)) meta.providers.forEach((p) => raw.add(p));
  if (meta.provider !== undefined) raw.add(meta.provider);
  (u.identities ?? []).forEach((i) => raw.add(i?.provider));
  return KNOWN.filter((p) => raw.has(p));
}

/**
 * What an Auth server error on getUser means. Checked against supabase-js
 * (AuthApiError carries the HTTP `status` and GoTrue's error `code`) and
 * GoTrue's maybeLoadUserOrSession, which looks the user up by the token's
 * `sub` BEFORE its session:
 * - code `user_not_found` (403): the token is genuine but the account is
 *   deleted → 'gone' (the only answer the app reads as "already deleted");
 * - any other 4xx (`bad_jwt`, `session_not_found`, `no_authorization`, a
 *   missing session): the token can't be used → 'invalid';
 * - anything else (AuthRetryableFetchError: network or 5xx, an unknown
 *   error with no status) → 'retry': we can't tell, so the call fails (500).
 */
export function authVerdict(error: unknown): 'invalid' | 'gone' | 'retry' {
  const e = (error ?? {}) as { status?: unknown; code?: unknown };
  if (e.code === 'user_not_found') return 'gone';
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) return 'invalid';
  return 'retry';
}

/** A failed call never carries its message out of here (it may hold SQL or ids). */
class AdminCallFailed extends Error {
  constructor(what: string) {
    super(`admin call failed: ${what}`);
  }
}

export function supabaseAdmin(client: SupabaseLike): AdminPort {
  return {
    async getUser(jwt: string): Promise<AuthUser | 'invalid' | 'gone'> {
      const { data, error } = await client.auth.getUser(jwt);
      if (error) {
        const verdict = authVerdict(error);
        if (verdict === 'retry') throw new AdminCallFailed('getUser');
        return verdict;
      }
      const u = data?.user;
      if (!u || typeof u.id !== 'string') return 'invalid';
      return {
        id: u.id,
        email: typeof u.email === 'string' && u.email !== '' ? u.email : null,
        createdAt: typeof u.created_at === 'string' ? u.created_at : null,
        providers: providersOf(u),
      };
    },

    async deleteUser(userId: string): Promise<void> {
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) throw new AdminCallFailed('deleteUser');
    },

    // Phase 8 replaces this with counts from board_posts and board_comments.
    countBoardRows(_userId: string): Promise<BoardCounts> {
      return Promise.resolve({ posts: 0, comments: 0 });
    },

    // No storage bucket holds learner files yet. When one is added, list and
    // remove `user/<uid>/` here, before deleteUser.
    deleteUserFiles(_userId: string): Promise<void> {
      return Promise.resolve();
    },

    async recordDeletion(userId: string, counts: BoardCounts): Promise<void> {
      const { error } = await client.rpc('svc_record_deletion', {
        p_user: userId,
        p_board_posts: counts.posts,
        p_board_comments: counts.comments,
      });
      if (error) throw new AdminCallFailed('recordDeletion');
    },

    async getTermsVersion(userId: string): Promise<string | null> {
      const { data, error } = await client.from('profiles').select('terms_version').eq('id', userId).maybeSingle();
      if (error) throw new AdminCallFailed('getTermsVersion');
      const v = (data as { terms_version?: unknown } | null)?.terms_version;
      return typeof v === 'string' ? v : null;
    },

    // Phase 7 reads public.sync_snapshots (store, store_version, app_version, rev, state, updated_at).
    readSnapshots(_userId: string): Promise<Record<string, unknown>> {
      return Promise.resolve({});
    },

    async claimExport(userId: string): Promise<boolean> {
      const { data, error } = await client.rpc('svc_claim_export', { p_user: userId });
      if (error) throw new AdminCallFailed('claimExport');
      return data === true;
    },
  };
}
