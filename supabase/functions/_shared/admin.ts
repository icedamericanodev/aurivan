// The server-side port the Edge Function handlers talk to. Handlers never see
// Supabase directly: index.ts wires the real adapter (supabaseAdmin.ts), and
// the deno tests inject a fake. Every method is scoped to ONE user id that the
// handler got from a verified JWT; nothing here takes a user id from a request.

export type Provider = 'email' | 'apple' | 'google';

export interface AuthUser {
  id: string;
  email: string | null;
  createdAt: string | null;
  /** Sign-in methods linked to the account (Supabase app_metadata.providers). */
  providers: Provider[];
}

export interface BoardCounts {
  posts: number;
  comments: number;
}

/** What readSnapshots returns: the stores, and the newest app version among them (code review P7 N11). */
export interface SnapshotsRead {
  stores: Record<string, unknown>;
  appVersion: string | null;
  /**
   * Stores whose snapshot couldn't be read safely (an unknown encoding, damaged
   * gzip, a gzip bomb, a size that doesn't match raw_bytes, or not a JSON
   * object), with the reason code from _shared/gz.ts. They are left out of
   * `stores`, never half-read.
   */
  unreadable: { store: string; reason: string }[];
}

export interface AdminPort {
  /**
   * Verifies the JWT with the Auth server:
   * - the account, when the token is good;
   * - 'invalid' when the token is bad, expired or signed out (revoked);
   * - 'gone' when the token is good but its account no longer exists (deleted);
   * - THROWS when the Auth server can't be asked (network, 5xx), so a passing
   *   failure is a 500, never read as "signed out" or "deleted".
   */
  getUser(jwt: string): Promise<AuthUser | 'invalid' | 'gone'>;
  /** auth.admin.deleteUser: revokes sessions and cascades every account row. */
  deleteUser(userId: string): Promise<void>;
  /** For the deletion audit row: the learner's board posts and comments (public.svc_board_counts). */
  countBoardRows(userId: string): Promise<BoardCounts>;
  /** Removes storage objects under user/<uid>/. No buckets exist yet, so today it does nothing. */
  deleteUserFiles(userId: string): Promise<void>;
  /**
   * Writes private.deletions: the keyed hash (_shared/pepper.ts
   * deletionHash, 64 lowercase hex characters) and the counts only. The user
   * id itself never reaches the database call.
   */
  recordDeletion(uidHmac: string, counts: BoardCounts): Promise<void>;
  /** profiles.terms_version, or null when no profile exists yet. */
  getTermsVersion(userId: string): Promise<string | null>;
  /**
   * The learner's synced stores (`{ settings?, progress? }`, each `{ version, state }` like a backup file;
   * empty when sync was never used), and the newest app version that wrote one of them (null when none).
   */
  readSnapshots(userId: string): Promise<SnapshotsRead>;
  /** Atomically claims the hourly export slot. false = already exported this hour. */
  claimExport(userId: string): Promise<boolean>;
  /**
   * The learner's own feedback board rows for "Download my data" (Phase 8,
   * public.svc_board_export): their member row, posts, comments, votes,
   * follows, reports they made, blocks, appeals and notices. Never anyone
   * else's, and never staff-only fields (moderation log, filter terms).
   */
  readBoard(userId: string): Promise<Record<string, unknown>>;
}
