/**
 * The cloud's shape, as types only (Uplift Phases 6–8, built OFF; spec
 * PHASE6_8.md §1.2). Screens and lib/ code talk to a `CloudBackend`, never
 * to Supabase or a sign-in SDK directly, so:
 * - tests and the screenshot build use the in-memory backend (cloud/memory/);
 * - Phase 9 (go-live) only adds adapters behind these ports (Supabase, the
 *   phone's secure key store, Sign in with Apple, Google Sign-In), without
 *   touching a screen.
 *
 * Every adapter turns a raw failure into a `CloudError` with one of the
 * codes below. A raw database message, token or email never reaches a
 * screen or a log.
 */
import type { Provider } from '../engine/account';

export type { Provider };

export type CloudErrorCode =
  | 'offline'
  /** No usable session (none on this phone, or the server refused the token). Never means "deleted". */
  | 'unauthorized'
  /** The session's account no longer exists (the server's 410). The only code delete reads as "already done". */
  | 'gone'
  | 'reauth_required'
  | 'rate_limited'
  | 'too_big'
  | 'conflict'
  | 'invalid'
  | 'held'
  | 'rejected_words'
  | 'bank_text'
  | 'banned'
  | 'posting_paused'
  | 'newer_app'
  | 'unreadable'
  | 'server'
  /** The learner closed the Apple or Google sheet: not an error to show (copy `err.cancelled` is "none"). */
  | 'cancelled';

/**
 * `detail` is a short machine word for the screen to pick its copy
 * (`code_wrong`, `code_expired`, `code_toomany`). Never a server message.
 *
 * The Edge Functions answer `{ error, detail? }`:
 * - delete-account: unauthorized (401), gone (410: the account is already
 *   deleted), reauth_required (401), invalid (400) with detail
 *   confirm_required | apple_code_invalid, too_big, server;
 * - export-my-data: unauthorized, gone, rate_limited (429, `retry-after`
 *   3600), too_big, server.
 * The Phase 9 Supabase adapter maps `error` to the code, `detail` to detail
 * and `retry-after` to retryAfterSec, and:
 * - `method_not_allowed` (405, a bug on our side) to `server`;
 * - every GoTrue "Token has expired or is invalid" to `invalid` with detail
 *   `code_wrong`: GoTrue can't tell an expired code from a wrong one and has
 *   no per-code try counter (only a per-IP limit), so the screens' 5-try
 *   count is the only cap a learner meets. `code_expired` and `code_toomany`
 *   come from the memory backend (and the screens handle them).
 * The memory backend answers with the same set.
 */
export class CloudError extends Error {
  constructor(
    public code: CloudErrorCode,
    public retryAfterSec?: number,
    public detail?: string,
  ) {
    super(code);
    this.name = 'CloudError';
  }
}

/** A CloudError's code, or 'server' for anything else (an unexpected throw is never shown raw). */
export function errorCode(e: unknown): CloudErrorCode {
  return e instanceof CloudError ? e.code : 'server';
}

// ── Accounts (PR 6) ───────────────────────────────────────────────────
export interface AccountInfo {
  /** Never shown in the UI or written to logs. */
  userId: string;
  /** "j•••@gmail.com"; null for an Apple relay address. */
  emailMasked: string | null;
  providers: Provider[];
  /** When the newest sign-in method was used (the token's `amr`), for re-auth checks. */
  authAt: number;
  /** null = must accept the Terms before first use. */
  termsVersion: string | null;
}

export interface AuthPort {
  current(): Promise<AccountInfo | null>;
  onChange(cb: (a: AccountInfo | null) => void): () => void;
  sendEmailCode(email: string, opts?: { captchaToken?: string }): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<AccountInfo>;
  /** The nonce is made and checked inside the adapter. Apple's name is discarded. */
  signInWithApple(): Promise<AccountInfo>;
  signInWithGoogle(): Promise<AccountInfo>;
  /**
   * Confirm "it's you" before deleting. Email: call once without a code
   * (sends one), then with it. Apple returns a fresh authorisation code the
   * server uses to revoke Apple's token.
   */
  reauthenticate(p: Provider, code?: string): Promise<{ appleAuthorizationCode?: string }>;
  acceptTerms(v: { termsVersion: string; ageConfirmed: true }): Promise<void>;
  /**
   * 'global' needs the server (offline: CloudError 'offline', nothing changes).
   * 'local' must ALWAYS forget the session on this phone, offline or not, even
   * when it then reports a failure: supabase-js `signOut({ scope: 'local' })`
   * keeps the session when its /logout call fails on the network, so the
   * Phase 9 adapter calls the session store's removeItem itself on any error.
   */
  signOut(scope: 'local' | 'global'): Promise<void>;
  /**
   * The server deletes the account. Without an Apple code (Android, the web)
   * an Apple-linked account is still deleted; only Apple's token revoke is
   * skipped. A second call for an account already deleted: CloudError 'gone'.
   */
  deleteAccount(i: { confirm: 'DELETE'; appleAuthorizationCode?: string }): Promise<void>;
  /**
   * JSON text for the share sheet: the backup envelope plus `account` (and
   * `board` from PR 8). The export-my-data function takes `{ appVersion }`
   * for the envelope.
   */
  exportMyData(opts?: { appVersion?: string }): Promise<string>;
  /** AppState: refresh the session only while the app is in the foreground. */
  setForeground(active: boolean): void;
}

// ── Sync (PR 7) ───────────────────────────────────────────────────────
export type SyncStore = 'progress' | 'settings';
export interface SnapshotHead {
  store: SyncStore;
  rev: number;
  appVersion: string;
  storeVersion: number;
  updatedAt: number;
  deviceId: string;
}
/**
 * The learner's two snapshots (spec §3.7, `public.sync_snapshots`). Every
 * call is the signed-in learner's own rows only (RLS on the server).
 * - head: only store, rev, app_version, store_version, device_id and
 *   updated_at, so the state is downloaded only when `rev` changed;
 * - push: `expectedRev` null inserts (CloudError 'conflict' if a row
 *   exists); otherwise `update … where rev = expectedRev` (zero rows:
 *   'conflict'). 'rate_limited' past 60 writes per store per hour;
 *   'invalid' for a session without accepted Terms or a malformed row;
 *   'too_big' past the server's cap;
 * - deleteAll: "Delete synced progress" (the server clears its checkpoints).
 * The Phase 9 adapter maps Postgres `P0001 rate_limited` and `42501` here.
 */
export interface SyncPort {
  head(store: SyncStore): Promise<SnapshotHead | null>;
  pull(store: SyncStore): Promise<(SnapshotHead & { state: unknown }) | null>;
  /** CloudError('conflict') when `expectedRev` isn't the server's rev. */
  push(i: { store: SyncStore; expectedRev: number | null; storeVersion: number; appVersion: string; deviceId: string; state: unknown }): Promise<SnapshotHead>;
  deleteAll(): Promise<void>;
}

/**
 * This install's random id (cloud/deviceId.ts), sent with every push so a
 * snapshot says which device wrote it. A random UUID in the secure key
 * store, never a hardware or advertising id.
 */
export interface DevicePort {
  id(): Promise<string>;
  /** A new id: a different account signed in on this phone, or its account was deleted (Phase 6 review N6). */
  renew(): Promise<string>;
}

// ── Feedback board (PR 8, spec §4.6) ──────────────────────────────────
export type PostKind = 'content' | 'idea' | 'app' | 'question';
export type PostStatus = 'open' | 'under_review' | 'planned' | 'in_progress' | 'shipped' | 'answered' | 'not_planned' | 'duplicate';
export type Visibility = 'pending' | 'visible' | 'hidden' | 'removed' | 'withdrawn';
export type HoldReason = 'new_member' | 'recall' | 'hold_words' | 'links' | 'reports' | 'exam_report';
export type ReportReason = 'exam_content' | 'copyright' | 'harassment' | 'sexual_violent' | 'spam' | 'personal_info' | 'off_topic' | 'other';
export type Standing = 'active' | 'limited' | 'suspended' | 'banned';
export type BoardTab = 'top' | 'new' | 'next' | 'shipped';

/** An opaque "load more" position (the adapter decides its contents). */
export type Cursor = string;
export interface Page<T> {
  items: T[];
  next: Cursor | null;
}
export interface PostCard {
  id: string;
  kind: PostKind;
  title: string;
  status: PostStatus;
  shippedIn: string | null;
  authorHandle: string;
  voteCount: number;
  commentCount: number;
  voted: boolean;
  teamReplied: boolean;
  createdAt: number;
  visibility: Visibility;
}
export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorHandle: string;
  authorId: string;
  body: string;
  isOfficial: boolean;
  createdAt: number;
  editedAt: number | null;
}
export interface PostDetail extends PostCard {
  body: string;
  itemRef: string | null;
  discussesAnswer: boolean;
  statusNote: string | null;
  authorId: string;
  following: boolean;
  locked: boolean;
  official: Comment | null;
  comments: Comment[];
  statusHistory: { status: PostStatus; at: number; note: string | null }[];
}
export interface Member {
  userId: string;
  handle: string;
  handleKind: 'pseudonym' | 'chosen';
  /** Only ever the learner's OWN standing (board-submit { op: 'me' }); other members' come back without it. */
  standing?: Standing;
  standingUntil?: number | null;
  guidelinesVersion?: string;
}
export interface Draft {
  kind: PostKind;
  title: string;
  body: string;
  itemRef?: string;
  cert: string;
}
export interface Notice {
  id: number;
  kind: 'status' | 'official' | 'reply' | 'moderation' | 'appeal';
  postId: string | null;
  text: string;
  at: number;
  read: boolean;
}
export interface StaffAction {
  action: string;
  targetKind: 'post' | 'comment' | 'member' | 'board' | 'queue';
  targetId?: string;
  reason?: string;
  extra?: Record<string, unknown>;
}

export interface BoardPort {
  settings(): Promise<{ postingOpen: boolean; guidelinesVersion: string }>;
  feed(q: { cert: string; tab: BoardTab; kind?: PostKind; search?: string; after?: Cursor }): Promise<Page<PostCard>>;
  post(id: string): Promise<PostDetail>;
  /** board-submit { op: 'me' }: the learner's own standing, never anyone else's. */
  me(): Promise<Member | null>;
  join(i: { handle: string; handleKind: 'pseudonym' | 'chosen'; guidelinesVersion: string }): Promise<Member>;
  submitPost(d: Draft): Promise<{ id: string; visibility: Visibility; holdReason?: HoldReason }>;
  editPost(id: string, d: Draft): Promise<{ visibility: Visibility; holdReason?: HoldReason }>;
  withdrawPost(id: string): Promise<void>;
  comment(postId: string, body: string, parentId?: string): Promise<{ id: string; visibility: Visibility }>;
  editComment(id: string, body: string): Promise<void>;
  withdrawComment(id: string): Promise<void>;
  vote(postId: string, on: boolean): Promise<void>;
  follow(postId: string, on: boolean): Promise<void>;
  report(t: { kind: 'post' | 'comment' | 'member'; id: string; reason: ReportReason; note?: string }): Promise<void>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  blocked(): Promise<Member[]>;
  inbox(): Promise<Notice[]>;
  markRead(ids: number[]): Promise<void>;
  appeal(t: { kind: 'post' | 'comment' | 'standing'; id: string; note?: string }): Promise<void>;
  /** Server-verified; the UI gate is cosmetic. */
  isStaff(): Promise<boolean>;
  staff(a: StaffAction): Promise<unknown>;
}

export interface CloudBackend {
  auth: AuthPort;
  sync: SyncPort;
  board: BoardPort;
  device: DevicePort;
}

// ── Device ports the Phase 9 adapters fill in ─────────────────────────
// Each is a thin wrapper over one native module that is NOT installed yet
// (installing one changes the app's native fingerprint, and over-the-air
// updates would stop reaching the APKs learners already have). The memory
// backend and the tests use in-memory fakes of the same ports.

/**
 * The phone's secure key store (Keychain / Android Keystore). Every write is
 * "this device only, after first unlock": never in a backup, never on
 * another phone. Values are small (the session store splits big ones).
 */
export interface SecureKVPort {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string, opts: { thisDeviceOnly: true }): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

/** Cryptographically secure random bytes. */
export interface RandomPort {
  bytes(n: number): Uint8Array;
}

/** Sign in with Apple (iOS). The adapter discards the name Apple returns. */
export interface AppleSignInPort {
  available(): Promise<boolean>;
  /** CloudError('cancelled') when the learner closes Apple's sheet. */
  signIn(i: { hashedNonce: string }): Promise<{ identityToken: string; authorizationCode: string | null }>;
}

/** Google Sign-In (native SDK). */
export interface GoogleSignInPort {
  /** CloudError('cancelled') when the learner closes Google's sheet. */
  signIn(i: { nonce?: string }): Promise<{ idToken: string }>;
}

/** A captcha before sending a sign-in code. The provider is an owner decision (Phase 9); until then a no-op. */
export interface CaptchaPort {
  token(action: 'email_code'): Promise<string | undefined>;
}
