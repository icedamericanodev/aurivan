/**
 * Test doubles for the website cloud client (src/webcloud): a fake Supabase
 * (GoTrue /auth/v1, PostgREST /rest/v1, the two /functions/v1) that plays
 * the real server's documented rules, plus fake storage, random and clock.
 *
 * It follows supabase/migrations/20261013000000_sync_snapshots.sql for the
 * synced rows (server-set rev that never goes back, optimistic concurrency,
 * the codec's shape checks and caps, 20 writes per store per hour, Terms
 * needed to write) and GoTrue's refresh-token rotation with reuse detection
 * (a refresh token spent twice ends the whole session family).
 *
 * Not a test file (no .test suffix, outside __tests__).
 */
import { toBase64Url } from '../src/webcloud/base64';
import { challengeFor } from '../src/webcloud/pkce';
import type { FetchPort, HttpResponse, RandomPort, StoragePort } from '../src/webcloud/ports';
import { utf8 } from '../src/engine/sha256';

export const FAKE_URL = 'https://fake.supabase.test';
export const FAKE_KEY = 'sb_publishable_test_only_not_a_real_key';

/** Web Storage in memory. `full` makes setItem throw like a full browser storage. */
export function memoryStorage(): StoragePort & { dump(): Record<string, string>; full: boolean } {
  const m = new Map<string, string>();
  return {
    full: false,
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem(k, v) {
      if (this.full) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
    dump: () => Object.fromEntries(m),
  };
}

/** Deterministic "random" bytes. */
export function seqRandom(seed = 7): RandomPort {
  let x = seed;
  return {
    bytes: (n) =>
      Uint8Array.from({ length: n }, () => {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        return x & 0xff;
      }),
  };
}

/** A token-looking string built at run time (the repo's secret scanner forbids JWT-shaped literals). */
export function fakeJwt(claims: Record<string, unknown>): string {
  const part = (o: unknown) => toBase64Url(utf8(JSON.stringify(o)));
  return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.c2ln`;
}

interface Row {
  store: string;
  store_version: number;
  app_version: string;
  device_id: string;
  rev: number;
  encoding: string;
  state_gz: string;
  raw_bytes: number;
  updated_at: string;
}
interface Call {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const HEAD_COLS = ['store', 'rev', 'app_version', 'store_version', 'device_id', 'updated_at'];
const ALL_COLS = [...HEAD_COLS, 'encoding', 'state_gz', 'raw_bytes'];

export class FakeSupabase {
  now: () => number;
  offline = false;
  /** The next response for a path prefix is this status and body (one use). */
  private forced = new Map<string, { status: number; body: unknown; headers?: Record<string, string> }>();
  calls: Call[] = [];
  users = new Map<string, { id: string; email: string; providers: string[] }>();
  codes = new Map<string, string>();
  /** refresh token → its session family and whether it was spent. */
  refresh = new Map<string, { userId: string; family: string; used: boolean }>();
  /** access token → who and until when (s). */
  access = new Map<string, { userId: string; exp: number; family: string }>();
  revokedFamilies = new Set<string>();
  /** Google: the code Google "sent back" → the challenge it was started with. */
  oauth = new Map<string, { challenge: string; email: string }>();
  rows = new Map<string, Row>();
  lastRev = new Map<string, number>();
  writes = new Map<string, { start: number; n: number }>();
  profiles = new Map<string, string>();
  /** Accept an access token this long (s). */
  tokenTtl = 3600;
  private n = 0;

  constructor(now: () => number) {
    this.now = now;
  }

  // ── Test helpers ──
  force(prefix: string, status: number, body: unknown, headers?: Record<string, string>) {
    this.forced.set(prefix, { status, body, headers });
  }
  /** Google sign-in finished for `email`: the code the website receives on ?code=. */
  googleCode(challenge: string, email: string): string {
    const code = `oauth-code-${++this.n}-abcdef`;
    this.oauth.set(code, { challenge, email });
    return code;
  }
  userByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email);
  }
  refreshCalls() {
    return this.calls.filter((c) => c.path.startsWith('/auth/v1/token?grant_type=refresh_token')).length;
  }
  row(userId: string, store: string): Row | undefined {
    return this.rows.get(`${userId}:${store}`);
  }

  private uuid(): string {
    const h = (++this.n).toString(16).padStart(12, '0');
    return `aaaaaaaa-bbbb-4ccc-8ddd-${h}`;
  }
  private session(userId: string, method: string, family = this.uuid()) {
    const exp = Math.floor(this.now() / 1000) + this.tokenTtl;
    const at = fakeJwt({ sub: userId, exp, amr: [{ method, timestamp: Math.floor(this.now() / 1000) }], n: ++this.n });
    const rt = `rt-${this.n}-${family.slice(-4)}xyz`;
    this.access.set(at, { userId, exp, family });
    this.refresh.set(rt, { userId, family, used: false });
    const u = this.users.get(userId)!;
    return { access_token: at, token_type: 'bearer', expires_in: this.tokenTtl, expires_at: exp, refresh_token: rt, user: { id: u.id, email: u.email, app_metadata: { provider: u.providers[0], providers: u.providers } } };
  }
  private signIn(email: string, provider: string, method: string) {
    let u = this.userByEmail(email);
    if (!u) {
      u = { id: this.uuid(), email, providers: [provider] };
      this.users.set(u.id, u);
    } else if (!u.providers.includes(provider)) u.providers.push(provider);
    return this.session(u.id, method);
  }
  private who(headers: Record<string, string>): string | null {
    const m = /^Bearer (.+)$/.exec(headers.authorization ?? '');
    const a = m ? this.access.get(m[1]) : undefined;
    if (!a || a.exp * 1000 <= this.now() || this.revokedFamilies.has(a.family) || !this.users.has(a.userId)) return null;
    return a.userId;
  }

  readonly fetch: FetchPort = async (url, init) => {
    // A real network answers later: let other callers interleave.
    await new Promise((r) => setTimeout(r, 0));
    if (this.offline) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    if (u.origin !== FAKE_URL) throw new TypeError('wrong host');
    const path = `${u.pathname}${u.search}`;
    const body = init.body !== undefined ? JSON.parse(init.body) : undefined;
    const headers = Object.fromEntries(Object.entries(init.headers).map(([k, v]) => [k.toLowerCase(), v]));
    this.calls.push({ method: init.method, path, headers, body });
    const res = (status: number, b?: unknown, h: Record<string, string> = {}): HttpResponse => {
      const text = b === undefined ? '' : JSON.stringify(b);
      const hh = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
      return { status, headers: { get: (n: string) => hh[n.toLowerCase()] ?? null }, text: async () => text };
    };
    for (const [prefix, f] of this.forced) {
      if (path.startsWith(prefix)) {
        this.forced.delete(prefix);
        return res(f.status, f.body, f.headers);
      }
    }
    if (headers.apikey !== FAKE_KEY) return res(401, { message: 'Invalid API key' });
    return this.route(init.method, u, headers, body, res);
  };

  private route(method: string, u: URL, headers: Record<string, string>, body: any, res: (s: number, b?: unknown, h?: Record<string, string>) => HttpResponse): HttpResponse {
    const p = u.pathname;
    const q = u.searchParams;
    // ── GoTrue ──
    if (p === '/auth/v1/otp' && method === 'POST') {
      if (typeof body?.email !== 'string' || !body.email.includes('@')) return res(400, { code: 400, error_code: 'validation_failed', msg: 'bad email' });
      this.codes.set(body.email, String(10_000_000 + ((this.n++ * 7919) % 89_999_999)));
      return res(200, {});
    }
    if (p === '/auth/v1/verify' && method === 'POST') {
      if (body?.type !== 'email' || this.codes.get(body.email) !== body.token) return res(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      this.codes.delete(body.email);
      return res(200, this.signIn(body.email, 'email', 'otp'));
    }
    if (p === '/auth/v1/token' && method === 'POST') {
      const grant = q.get('grant_type');
      if (grant === 'pkce') {
        const o = this.oauth.get(body?.auth_code);
        if (!o || challengeFor(String(body?.code_verifier)) !== o.challenge) return res(404, { code: 404, error_code: 'flow_state_not_found', msg: 'invalid flow state' });
        this.oauth.delete(body.auth_code);
        return res(200, this.signIn(o.email, 'google', 'oauth'));
      }
      if (grant === 'refresh_token') {
        const r = this.refresh.get(body?.refresh_token);
        if (!r || this.revokedFamilies.has(r.family)) return res(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
        if (r.used) {
          // Reuse detection: the whole family is revoked (the thief and the learner both lose it).
          this.revokedFamilies.add(r.family);
          return res(400, { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' });
        }
        r.used = true;
        return res(200, this.session(r.userId, 'otp', r.family));
      }
    }
    if (p === '/auth/v1/logout' && method === 'POST') {
      const id = this.who(headers);
      if (!id) return res(401, { code: 401, error_code: 'no_authorization', msg: 'no' });
      const m = /^Bearer (.+)$/.exec(headers.authorization)!;
      const fam = this.access.get(m[1])!.family;
      if (q.get('scope') === 'global') {
        for (const a of this.access.values()) if (a.userId === id) this.revokedFamilies.add(a.family);
      } else {
        this.revokedFamilies.add(fam);
      }
      return res(204);
    }
    if (p === '/auth/v1/user' && method === 'GET') {
      const id = this.who(headers);
      if (!id) return res(401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
      const usr = this.users.get(id)!;
      return res(200, { id: usr.id, email: usr.email, app_metadata: { providers: usr.providers } });
    }
    // ── PostgREST ──
    if (p.startsWith('/rest/v1/')) {
      const id = this.who(headers);
      if (!id) return res(401, { code: 'PGRST301', message: 'JWT expired' });
      if (p === '/rest/v1/profiles') return this.profilesRoute(method, id, q, body, res);
      if (p === '/rest/v1/sync_snapshots') return this.snapshots(method, id, q, headers, body, res);
      return res(404, { code: 'PGRST205', message: 'no table' });
    }
    // ── Edge Functions ──
    if (p.startsWith('/functions/v1/') && method === 'POST') {
      const id = this.who(headers);
      if (!id) return res(401, { error: 'unauthorized' });
      if (p === '/functions/v1/export-my-data') return res(200, { app: 'kaisip', schema: 1, stores: {} });
      if (p === '/functions/v1/delete-account') {
        if (body?.confirm !== 'DELETE') return res(400, { error: 'invalid', detail: 'confirm_required' });
        this.users.delete(id);
        return res(200, { deleted: true });
      }
    }
    return res(404, { message: 'not found' });
  }

  private profilesRoute(method: string, id: string, q: URLSearchParams, body: any, res: (s: number, b?: unknown) => HttpResponse): HttpResponse {
    if (method === 'GET') return res(200, this.profiles.has(id) ? [{ terms_version: this.profiles.get(id) }] : []);
    if (method === 'POST') {
      if (this.profiles.has(id)) return res(409, { code: '23505', message: 'duplicate key value violates unique constraint "profiles_pkey"' });
      if (body?.age_confirmed !== true) return res(400, { code: '23514', message: 'check' });
      this.profiles.set(id, body.terms_version);
      return res(201);
    }
    if (method === 'PATCH' && q.get('id') === `eq.${id}`) {
      this.profiles.set(id, body.terms_version);
      return res(204);
    }
    return res(400, { code: 'PGRST100', message: 'bad' });
  }

  private snapshots(method: string, id: string, q: URLSearchParams, headers: Record<string, string>, body: any, res: (s: number, b?: unknown, h?: Record<string, string>) => HttpResponse): HttpResponse {
    const eq = (k: string) => q.get(k)?.replace(/^eq\./, '') ?? null;
    const cols = (q.get('select') ?? ALL_COLS.join(',')).split(',');
    for (const c of cols) if (!ALL_COLS.includes(c)) return res(403, { code: '42501', message: 'permission denied for column' });
    const pickCols = (r: Row) => Object.fromEntries(cols.map((c) => [c, (r as unknown as Record<string, unknown>)[c]]));
    const store = eq('store');
    if (method === 'GET') {
      const r = store ? this.rows.get(`${id}:${store}`) : undefined;
      return res(200, r ? [pickCols(r)] : []);
    }
    if (method === 'DELETE') {
      for (const s of ['progress', 'settings']) {
        const k = `${id}:${s}`;
        if (this.rows.has(k)) {
          this.nextRev(id, s, this.rows.get(k)!.rev, false);
          this.rows.delete(k);
        }
      }
      return res(204);
    }
    if (method !== 'POST' && method !== 'PATCH') return res(405);
    if (!this.profiles.has(id)) return res(403, { code: '42501', message: 'new row violates row-level security policy for table "sync_snapshots"' });
    // The table's checks.
    const s = method === 'POST' ? body?.store : store;
    if (s !== 'progress' && s !== 'settings') return res(400, { code: '23514', message: 'store check' });
    if (method === 'POST' && 'rev' in (body ?? {})) return res(403, { code: '42501', message: 'permission denied for column rev' });
    if ('encoding' in (body ?? {}) || 'user_id' in (body ?? {})) return res(403, { code: '42501', message: 'permission denied for column' });
    const gz = String(body?.state_gz ?? '');
    if (gz.length > 200_000 || gz.length % 4 !== 0 || !/^H4sI[A-Za-z0-9+/]+={0,2}$/.test(gz)) return res(400, { code: '23514', message: 'new row violates check constraint "sync_snapshots_state_gz_check"' });
    if (!(Number.isInteger(body?.raw_bytes) && body.raw_bytes >= 2 && body.raw_bytes <= 2_000_000)) return res(400, { code: '23514', message: 'raw_bytes check' });
    if (s === 'settings' && (gz.length > 32_768 || body.raw_bytes > 98_304)) return res(400, { code: '23514', message: 'new row violates check constraint "sync_settings_size"' });
    if (!SEMVER.test(String(body?.app_version)) || !UUID_RE.test(String(body?.device_id)) || !Number.isInteger(body?.store_version)) return res(400, { code: '23514', message: 'row check' });
    const key = `${id}:${s}`;
    const prev = this.rows.get(key);
    if (method === 'POST' && prev) return res(409, { code: '23505', message: 'duplicate key value violates unique constraint "sync_snapshots_pkey"' });
    if (method === 'PATCH') {
      const want = Number(eq('rev'));
      if (!prev || prev.rev !== want) return res(200, []);
    }
    let rev: number;
    try {
      rev = this.nextRev(id, s, prev?.rev ?? 0, true);
    } catch {
      return res(400, { code: 'P0001', message: 'rate_limited' });
    }
    const row: Row = { store: s, store_version: body.store_version, app_version: body.app_version, device_id: body.device_id, rev, encoding: 'gzip+base64', state_gz: gz, raw_bytes: body.raw_bytes, updated_at: new Date(this.now()).toISOString() };
    this.rows.set(key, row);
    void headers;
    return res(method === 'POST' ? 201 : 200, [pickCols(row)]);
  }

  /** The server's rev: the write time in ms, or one more than the last, whichever is larger; 20 writes an hour. */
  private nextRev(id: string, store: string, oldRev: number, refuse: boolean): number {
    const key = `${id}:${store}`;
    const t = this.now();
    const w = this.writes.get(key);
    const win = !w || t - w.start > 3_600_000 ? { start: t, n: 1 } : { start: w.start, n: w.n + 1 };
    if (refuse && win.n > 20) throw new Error('rate_limited');
    this.writes.set(key, win);
    const rev = Math.max(t, oldRev + 1, (this.lastRev.get(key) ?? 0) + 1);
    this.lastRev.set(key, rev);
    return rev;
  }

  /** Put a row straight in the table (another device, or a hostile one). */
  putRow(userId: string, store: string, r: Partial<Row> & { state_gz: string; raw_bytes: number }) {
    const prev = this.rows.get(`${userId}:${store}`);
    const rev = this.nextRev(userId, store, prev?.rev ?? 0, false);
    this.rows.set(`${userId}:${store}`, { store, store_version: 1, app_version: '1.48.0', device_id: '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e', encoding: 'gzip+base64', updated_at: new Date(this.now()).toISOString(), ...r, rev });
  }
}
