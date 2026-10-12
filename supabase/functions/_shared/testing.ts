// Test helpers for the deno unit tests: a fake AdminPort holding two or more
// learners in memory, and unsigned JWTs shaped like Supabase access tokens.
// Never imported by an index.ts, so never deployed.

import type { AdminPort, AuthUser, BoardCounts, SnapshotsRead } from './admin.ts';
import type { Logger } from './http.ts';

export const NOW = Date.UTC(2026, 10, 2, 12, 0, 0); // fixed clock: 2026-11-02 12:00 UTC

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A token the fake Auth server knows. `amrAgoMs` = how long ago the learner signed in. */
export function makeJwt(
  sub: string,
  opts: { amrAgoMs?: number | null; role?: string; nowMs?: number } = {},
): string {
  const now = opts.nowMs ?? NOW;
  const amr = opts.amrAgoMs === null
    ? undefined
    : [{ method: 'otp', timestamp: Math.floor((now - (opts.amrAgoMs ?? 60_000)) / 1000) }];
  const payload = { sub, role: opts.role ?? 'authenticated', aal: 'aal1', amr, session_id: crypto.randomUUID() };
  return `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.c2lnbmF0dXJl`;
}

export interface FakeUser extends AuthUser {
  termsVersion: string | null;
  snapshots: Record<string, unknown>;
  /** The newest app version that wrote one of the snapshots (null when none). */
  snapshotsApp?: string | null;
  board: BoardCounts;
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
  deletions: { userId: string; counts: BoardCounts }[] = [];
  calls: Call[] = [];
  fail: Partial<Record<keyof AdminPort, boolean>> = {};
  now = NOW;

  addUser(u: Partial<FakeUser> & { id: string }): FakeUser {
    const user: FakeUser = {
      email: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      providers: ['email'],
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
  }

  /** Ids of deleted accounts: their genuine tokens get 'gone', like GoTrue's user_not_found. */
  deleted = new Set<string>();

  getUser(jwt: string): Promise<AuthUser | 'invalid' | 'gone'> {
    this.check('getUser');
    const id = this.tokens.get(jwt);
    if (id && this.deleted.has(id)) return Promise.resolve('gone');
    const u = id ? this.users.get(id) : undefined;
    if (!u) return Promise.resolve('invalid');
    return Promise.resolve({ id: u.id, email: u.email, createdAt: u.createdAt, providers: [...u.providers] });
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

  recordDeletion(userId: string, counts: BoardCounts): Promise<void> {
    this.check('recordDeletion', userId);
    this.deletions.push({ userId, counts });
    return Promise.resolve();
  }

  getTermsVersion(userId: string): Promise<string | null> {
    this.check('getTermsVersion', userId);
    return Promise.resolve(this.users.get(userId)?.termsVersion ?? null);
  }

  readSnapshots(userId: string): Promise<SnapshotsRead> {
    this.check('readSnapshots', userId);
    const u = this.users.get(userId);
    return Promise.resolve({ stores: structuredClone(u?.snapshots ?? {}), appVersion: u?.snapshotsApp ?? null });
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
export const USER_B = '00000000-0000-4000-8000-00000000000b';
