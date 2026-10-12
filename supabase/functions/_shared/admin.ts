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
  /** For the deletion audit row. Zero until the board ships (Phase 8). */
  countBoardRows(userId: string): Promise<BoardCounts>;
  /** Removes storage objects under user/<uid>/. No buckets exist yet. */
  deleteUserFiles(userId: string): Promise<void>;
  /** Writes private.deletions (a SHA-256 of the id and the counts only). */
  recordDeletion(userId: string, counts: BoardCounts): Promise<void>;
  /** profiles.terms_version, or null when no profile exists yet. */
  getTermsVersion(userId: string): Promise<string | null>;
  /** The learner's synced stores (`{ settings?, progress? }`, each `{ version, state }` like a backup file). Empty when sync was never used. */
  readSnapshots(userId: string): Promise<Record<string, unknown>>;
  /** Atomically claims the hourly export slot. false = already exported this hour. */
  claimExport(userId: string): Promise<boolean>;
}
