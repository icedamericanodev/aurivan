// The real AdminPort, on a supabase-js client created with the SERVICE ROLE key
// (Function secret; never in the app). It is typed against the few client
// methods it uses, so the deno tests can check it with a fake client and no
// network.
//
// Private tables are reached only through the `svc_*` functions in
// 20261005000000_init_mobile_sync.sql (security invoker, service_role only),
// because schema `private` is not exposed by the Data API.

import type {
  AdminPort,
  AuthUser,
  BoardCounts,
  Checkpoint,
  Profile,
  Provider,
  SnapshotsRead,
  SyncRowInfo,
} from './admin.ts';
import { decodeSnapshot, GzError } from './gz.ts';

interface RawUser {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: { provider?: unknown; providers?: unknown } | null;
  user_metadata?: Record<string, unknown> | null;
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
      // Awaited directly: every matching row; maybeSingle(): at most one.
      eq(column: string, value: string): Thenable<{ data: unknown; error: unknown }> & {
        maybeSingle(): Thenable<{ data: unknown; error: unknown }>;
      };
    };
  };
  rpc(fn: string, args: Record<string, unknown>): Thenable<{ data: unknown; error: unknown }>;
}

const KNOWN: readonly Provider[] = ['email', 'apple', 'google'];

/** A short string, or null: metadata from a sign-in provider is not trusted for size or type. */
function shortText(v: unknown, max: number): string | null {
  return typeof v === 'string' && v !== '' && v.length <= max ? v : null;
}

/** The name and picture link a sign-in provider (Google) shared, as the Auth server stored them. */
export function fromSignIn(meta: unknown): { name: string | null; picture: string | null } {
  const m = (meta && typeof meta === 'object' ? meta : {}) as Record<string, unknown>;
  const picture = shortText(m.avatar_url, 500) ?? shortText(m.picture, 500);
  return {
    name: shortText(m.full_name, 200) ?? shortText(m.name, 200),
    picture: picture && /^https:\/\//.test(picture) ? picture : null,
  };
}

const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);
const str = (v: unknown, max = 64): string | null => shortText(v, max);

/** Each row's own columns (never the state), keyed by store, for the export. */
export function syncRowInfo(rows: unknown): Record<string, SyncRowInfo> {
  const out: Record<string, SyncRowInfo> = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows as Record<string, unknown>[]) {
    const store = r?.store;
    if (store !== 'settings' && store !== 'progress') continue;
    out[store] = {
      rev: int(r.rev),
      deviceId: str(r.device_id),
      updatedAt: str(r.updated_at),
      appVersion: str(r.app_version),
      storeVersion: int(r.store_version),
    };
  }
  return out;
}

/**
 * The fields a backup file needs that a synced snapshot never carries (they
 * stay on each phone): with them, "Download my data" is also a backup file
 * the app can restore. Neutral values: a restore keeps the phone's own
 * `onboarded`, and today's count starts fresh.
 */
const BACKUP_ONLY: Record<'settings' | 'progress', Record<string, unknown>> = {
  settings: { onboarded: true },
  progress: { today: { day: '', answered: 0 } },
};

/** A sync_snapshots row once its state is unzipped and checked. */
export interface DecodedRow {
  store: 'settings' | 'progress';
  store_version: unknown;
  app_version: unknown;
  state: Record<string, unknown>;
}

/**
 * Unzips each stored snapshot through the capped codec (_shared/gz.ts), one
 * at a time so at most one is held unzipped while the next is read. A row that
 * can't be read safely (unknown encoding, damaged or oversized gzip, a size
 * that doesn't match raw_bytes, not a JSON object) is listed in `unreadable`
 * with its reason and left out: never half-read, never a crash.
 */
export async function decodeSnapshotRows(
  rows: unknown,
): Promise<{ rows: DecodedRow[]; unreadable: { store: string; reason: string }[] }> {
  const out: DecodedRow[] = [];
  const unreadable: { store: string; reason: string }[] = [];
  if (!Array.isArray(rows)) return { rows: out, unreadable };
  for (const r of rows as Record<string, unknown>[]) {
    const store = r?.store;
    if (store !== 'settings' && store !== 'progress') continue;
    try {
      const state = await decodeSnapshot(r.encoding, r.state_gz, r.raw_bytes);
      out.push({ store, store_version: r.store_version, app_version: r.app_version, state });
    } catch (e) {
      if (!(e instanceof GzError)) throw e;
      unreadable.push({ store, reason: e.code });
    }
  }
  return { rows: out, unreadable };
}

/**
 * Decoded sync_snapshots rows → the export's `stores`: `{ settings, progress }`, each
 * `{ version, state }` like a backup file. Unknown stores and malformed rows
 * are skipped; the state is otherwise passed through as stored (the server
 * never interprets progress).
 */
export function snapshotsToStores(rows: unknown): Record<string, { version: number; state: Record<string, unknown> }> {
  const out: Record<string, { version: number; state: Record<string, unknown> }> = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows as { store?: unknown; store_version?: unknown; state?: unknown }[]) {
    const store = r?.store;
    if (store !== 'settings' && store !== 'progress') continue;
    const state = r.state;
    if (typeof state !== 'object' || state === null || Array.isArray(state)) continue;
    if (typeof r.store_version !== 'number' || !Number.isInteger(r.store_version)) continue;
    out[store] = { version: r.store_version, state: { ...BACKUP_ONLY[store], ...(state as Record<string, unknown>) } };
  }
  return out;
}

const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/**
 * The newest `app_version` among the rows (null when none is well-formed).
 * The export's envelope carries it, so a file holding a store written by a
 * newer app restores as "update the app", not as damaged (code review P7 N11).
 */
export function newestAppVersion(rows: unknown): string | null {
  if (!Array.isArray(rows)) return null;
  const parts = (v: string) => v.split('.').map(Number);
  let best: string | null = null;
  for (const r of rows as { app_version?: unknown }[]) {
    const v = r?.app_version;
    if (typeof v !== 'string' || !SEMVER.test(v)) continue;
    const [a, b] = [parts(v), best === null ? null : parts(best)];
    // Major, then minor, then patch: the first difference decides.
    if (b === null || (a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) > 0) best = v;
  }
  return best;
}

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
      const shared = fromSignIn(u.user_metadata);
      return {
        id: u.id,
        email: typeof u.email === 'string' && u.email !== '' ? u.email : null,
        createdAt: typeof u.created_at === 'string' ? u.created_at : null,
        providers: providersOf(u),
        lastSignInAt: typeof u.last_sign_in_at === 'string' ? u.last_sign_in_at : null,
        nameFromSignIn: shared.name,
        pictureFromSignIn: shared.picture,
      };
    },

    async deleteUser(userId: string): Promise<void> {
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) throw new AdminCallFailed('deleteUser');
    },

    // Phase 8: the learner's board posts and comments, for the audit row's counts.
    async countBoardRows(userId: string): Promise<BoardCounts> {
      const { data, error } = await client.rpc('svc_board_counts', { p_user: userId });
      if (error) throw new AdminCallFailed('countBoardRows');
      const d = (data ?? {}) as { posts?: unknown; comments?: unknown };
      const n = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0);
      return { posts: n(d.posts), comments: n(d.comments) };
    },

    // No storage bucket holds learner files yet (Storage is off), so this
    // does nothing and can't fail. When a bucket is added, list and remove
    // `user/<uid>/` here; delete-account calls it AFTER deleteUser, retries
    // once and logs a failure, so files can never block a deletion.
    deleteUserFiles(_userId: string): Promise<void> {
      return Promise.resolve();
    },

    async recordDeletion(uidHmac: string, counts: BoardCounts): Promise<void> {
      if (!/^[0-9a-f]{64}$/.test(uidHmac)) throw new AdminCallFailed('recordDeletion');
      const { error } = await client.rpc('svc_record_deletion', {
        p_uid_hmac: uidHmac,
        p_board_posts: counts.posts,
        p_board_comments: counts.comments,
      });
      if (error) throw new AdminCallFailed('recordDeletion');
    },

    async getProfile(userId: string): Promise<Profile | null> {
      const { data, error } = await client.from('profiles').select('terms_version, age_confirmed, created_at').eq(
        'id',
        userId,
      ).maybeSingle();
      if (error) throw new AdminCallFailed('getProfile');
      const d = data as { terms_version?: unknown; age_confirmed?: unknown; created_at?: unknown } | null;
      if (!d || typeof d.terms_version !== 'string') return null;
      return {
        termsVersion: d.terms_version,
        ageConfirmed: d.age_confirmed === true,
        createdAt: typeof d.created_at === 'string' ? d.created_at : null,
      };
    },

    // The support checkpoint, unzipped through the same capped reader.
    async readCheckpoint(userId: string): Promise<Checkpoint | null> {
      const { data, error } = await client.rpc('svc_sync_checkpoint', { p_user: userId });
      if (error) throw new AdminCallFailed('readCheckpoint');
      const row = (Array.isArray(data) ? data[0] : null) as Record<string, unknown> | null | undefined;
      if (!row) return null;
      const head = { takenAt: str(row.taken_at), rev: int(row.rev), appVersion: str(row.app_version) };
      try {
        return { ...head, state: await decodeSnapshot(row.encoding, row.state_gz, row.raw_bytes) };
      } catch (e) {
        if (!(e instanceof GzError)) throw e;
        return { ...head, unreadable: e.code };
      }
    },

    async exportDue(userId: string): Promise<boolean> {
      const { data, error } = await client.rpc('svc_export_due', { p_user: userId });
      if (error) throw new AdminCallFailed('exportDue');
      return data === true;
    },

    // Phase 7: the learner's own sync_snapshots rows, unzipped through the
    // capped codec, as backup-file stores.
    async readSnapshots(userId: string): Promise<SnapshotsRead> {
      const { data, error } = await client.from('sync_snapshots')
        .select('store, store_version, app_version, device_id, rev, updated_at, encoding, state_gz, raw_bytes')
        .eq('user_id', userId);
      if (error) throw new AdminCallFailed('readSnapshots');
      const decoded = await decodeSnapshotRows(data);
      return {
        stores: snapshotsToStores(decoded.rows),
        // Only stores that made it into the file count for the version (code review P7 N11).
        appVersion: newestAppVersion(decoded.rows),
        rows: syncRowInfo(data),
        unreadable: decoded.unreadable,
      };
    },

    // Phase 8: the export's `board` section (own rows only; see svc_board_export).
    async readBoard(userId: string): Promise<Record<string, unknown>> {
      const { data, error } = await client.rpc('svc_board_export', { p_user: userId });
      if (error) throw new AdminCallFailed('readBoard');
      return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
    },

    async claimExport(userId: string): Promise<boolean> {
      const { data, error } = await client.rpc('svc_claim_export', { p_user: userId });
      if (error) throw new AdminCallFailed('claimExport');
      return data === true;
    },
  };
}
