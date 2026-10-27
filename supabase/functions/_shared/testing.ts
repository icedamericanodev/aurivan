// Test helpers for the deno unit tests: a fake AdminPort holding two or more
// learners in memory, and unsigned JWTs shaped like Supabase access tokens.
// Never imported by an index.ts, so never deployed.

import type { AdminPort, AuthUser, BoardCounts, Checkpoint, Profile, SnapshotsRead, SyncRowInfo } from './admin.ts';
import type { Logger } from './http.ts';

export const NOW = Date.UTC(2026, 10, 2, 12, 0, 0); // fixed clock: 2026-11-02 12:00 UTC

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * A token the fake Auth server knows. `amrAgoMs` = how long ago the learner
 * signed in; `aal` = 'aal2' for a session that passed a second factor (TOTP).
 */
export function makeJwt(
  sub: string,
  opts: { amrAgoMs?: number | null; role?: string; nowMs?: number; aal?: 'aal1' | 'aal2' } = {},
): string {
  const now = opts.nowMs ?? NOW;
  const amr = opts.amrAgoMs === null
    ? undefined
    : [{ method: 'otp', timestamp: Math.floor((now - (opts.amrAgoMs ?? 60_000)) / 1000) }];
  const payload = {
    sub,
    role: opts.role ?? 'authenticated',
    aal: opts.aal ?? 'aal1',
    amr,
    session_id: crypto.randomUUID(),
  };
  return `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.c2lnbmF0dXJl`;
}

export interface FakeUser extends AuthUser {
  termsVersion: string | null;
  ageConfirmed?: boolean;
  profileCreatedAt?: string | null;
  snapshots: Record<string, unknown>;
  /** Each synced row's own columns, by store. */
  syncRows?: Record<string, SyncRowInfo>;
  /** The support checkpoint (null when none). */
  checkpoint?: Checkpoint | null;
  /** The newest app version that wrote one of the snapshots (null when none). */
  snapshotsApp?: string | null;
  /** Stores whose snapshot the codec refused (a gzip bomb, damage, an unknown encoding). */
  unreadable?: { store: string; reason: string }[];
  board: BoardCounts;
  /** The learner's own board rows (export-my-data's `board` section). */
  boardRows?: Record<string, unknown>;
}

export interface Call {
  method: string;
  userId?: string;
}

/** In-memory AdminPort. Tokens map to user ids; a deleted user's tokens get 'gone'. */
export class FakeAdmin implements AdminPort {
  users = new Map<string, FakeUser>();
  tokens = new Map<string, string>();
  exportLog = new Map<string, number>();
  /** Audit rows as written: the keyed hash, never the id. */
  deletions: { uidHmac: string; counts: BoardCounts }[] = [];
  calls: Call[] = [];
  fail: Partial<Record<keyof AdminPort, boolean>> = {};
  /** Fail the next N calls of a method, then succeed (retries). */
  failTimes: Partial<Record<keyof AdminPort, number>> = {};
  now = NOW;

  addUser(u: Partial<FakeUser> & { id: string }): FakeUser {
    const user: FakeUser = {
      email: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      providers: ['email'],
      lastSignInAt: '2026-11-02T11:59:00.000Z',
      nameFromSignIn: null,
      pictureFromSignIn: null,
      termsVersion: '2026-11',
      snapshots: {},
      board: { posts: 0, comments: 0 },
      ...u,
    };
    this.users.set(user.id, user);
    return user;
  }

  /** Issues a token the fake Auth server will accept for `userId`. */
  issue(userId: string, opts: Parameters<typeof makeJwt>[1] = {}): string {
    const jwt = makeJwt(userId, { nowMs: this.now, ...opts });
    this.tokens.set(jwt, userId);
    return jwt;
  }

  private check(method: keyof AdminPort, userId?: string): void {
    this.calls.push({ method, userId });
    if (this.fail[method]) throw new Error(`db error: relation "x" for ${userId} a@test.invalid`);
    const left = this.failTimes[method] ?? 0;
    if (left > 0) {
      this.failTimes[method] = left - 1;
      throw new Error(`db error: flaky for ${userId} a@test.invalid`);
    }
  }

  /** Ids of deleted accounts: their genuine tokens get 'gone', like GoTrue's user_not_found. */
  deleted = new Set<string>();

  getUser(jwt: string): Promise<AuthUser | 'invalid' | 'gone'> {
    this.check('getUser');
    const id = this.tokens.get(jwt);
    if (id && this.deleted.has(id)) return Promise.resolve('gone');
    const u = id ? this.users.get(id) : undefined;
    if (!u) return Promise.resolve('invalid');
    return Promise.resolve({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      providers: [...u.providers],
      lastSignInAt: u.lastSignInAt,
      nameFromSignIn: u.nameFromSignIn,
      pictureFromSignIn: u.pictureFromSignIn,
    });
  }

  deleteUser(userId: string): Promise<void> {
    this.check('deleteUser', userId);
    this.users.delete(userId);
    this.deleted.add(userId);
    this.exportLog.delete(userId);
    return Promise.resolve();
  }

  countBoardRows(userId: string): Promise<BoardCounts> {
    this.check('countBoardRows', userId);
    return Promise.resolve({ ...(this.users.get(userId)?.board ?? { posts: 0, comments: 0 }) });
  }

  deleteUserFiles(userId: string): Promise<void> {
    this.check('deleteUserFiles', userId);
    return Promise.resolve();
  }

  recordDeletion(uidHmac: string, counts: BoardCounts): Promise<void> {
    this.check('recordDeletion');
    this.deletions.push({ uidHmac, counts });
    return Promise.resolve();
  }

  getProfile(userId: string): Promise<Profile | null> {
    this.check('getProfile', userId);
    const u = this.users.get(userId);
    if (!u || u.termsVersion === null) return Promise.resolve(null);
    return Promise.resolve({
      termsVersion: u.termsVersion,
      ageConfirmed: u.ageConfirmed ?? true,
      createdAt: u.profileCreatedAt ?? '2026-10-01T00:05:00.000Z',
    });
  }

  readCheckpoint(userId: string): Promise<Checkpoint | null> {
    this.check('readCheckpoint', userId);
    return Promise.resolve(structuredClone(this.users.get(userId)?.checkpoint ?? null));
  }

  exportDue(userId: string): Promise<boolean> {
    this.check('exportDue', userId);
    const last = this.exportLog.get(userId);
    return Promise.resolve(last === undefined || this.now - last >= 60 * 60 * 1000);
  }

  readSnapshots(userId: string): Promise<SnapshotsRead> {
    this.check('readSnapshots', userId);
    const u = this.users.get(userId);
    return Promise.resolve({
      stores: structuredClone(u?.snapshots ?? {}),
      appVersion: u?.snapshotsApp ?? null,
      rows: structuredClone(u?.syncRows ?? {}),
      unreadable: structuredClone(u?.unreadable ?? []),
    });
  }

  readBoard(userId: string): Promise<Record<string, unknown>> {
    this.check('readBoard', userId);
    return Promise.resolve(structuredClone(this.users.get(userId)?.boardRows ?? {}));
  }

  claimExport(userId: string): Promise<boolean> {
    this.check('claimExport', userId);
    const last = this.exportLog.get(userId);
    if (last !== undefined && this.now - last < 60 * 60 * 1000) return Promise.resolve(false);
    this.exportLog.set(userId, this.now);
    return Promise.resolve(true);
  }

  count(method: keyof AdminPort): number {
    return this.calls.filter((c) => c.method === method).length;
  }
}

/** A Logger that records every line, to prove no PII is ever logged. */
export function recordingLogger(): Logger & { lines: string[] } {
  const lines: string[] = [];
  const log = ((event: string, counts?: Record<string, number>) => {
    lines.push(JSON.stringify({ event, ...(counts ?? {}) }));
  }) as Logger & { lines: string[] };
  log.lines = lines;
  return log;
}

export function post(body: unknown, jwt?: string, init: { method?: string; contentType?: string } = {}): Request {
  const headers: Record<string, string> = { 'content-type': init.contentType ?? 'application/json' };
  if (jwt !== undefined) headers.authorization = `Bearer ${jwt}`;
  const method = init.method ?? 'POST';
  return new Request('http://localhost/fn', {
    method,
    headers,
    body: method === 'GET' || body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export const USER_A = '00000000-0000-4000-8000-00000000000a';
/** A test pepper (never a real one): 40 characters. */
export const PEPPER = 'test-pepper-not-a-secret-0123456789abcdef';
export const USER_B = '00000000-0000-4000-8000-00000000000b';
