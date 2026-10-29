/**
 * Accounts beta §1.1–§1.2: the website's sign-in client (src/webcloud/auth.ts)
 * against a fake Supabase (jest/webcloud-fakes.ts) that plays GoTrue's and
 * PostgREST's documented answers, including refresh-token rotation with
 * reuse detection. Covers:
 * - PKCE: S256 checked against Node's own SHA-256; the authorize address; the
 *   verifier lives in sessionStorage only and is deleted after the exchange;
 * - email codes: send (with the captcha token), verify, calm error codes;
 * - where the session lives: localStorage, or sessionStorage on a shared
 *   computer (only ever one copy); a damaged value reads as signed out;
 * - refresh under the 'kaisip-auth' lock: two tabs refresh ONCE, and
 *   without the lock the reuse detection would sign the learner out;
 * - a 401 refreshes once and retries once;
 * - sign out here (always, even offline) and everywhere (offline: nothing changes);
 * - the account functions and the Terms row;
 * - the error mapping (no raw server text ever comes out).
 */
import { createHash } from 'crypto';
import { CloudError } from '../cloud/types';
import { pageLocks } from '../webcloud/browser';
import { createWebAuth, type WebAuth } from '../webcloud/auth';
import { PKCE_KEY, SESSION_KEY } from '../webcloud/config';
import { toCloudError } from '../webcloud/errors';
import { challengeFor, isVerifier, makeVerifier, tokenClaims } from '../webcloud/pkce';
import { readSession } from '../webcloud/session';
import type { LockPort } from '../webcloud/ports';
import { FAKE_KEY, FAKE_URL, FakeSupabase, memoryStorage, seqRandom } from '../../jest/webcloud-fakes';

let now = Date.UTC(2026, 9, 28, 9, 0, 0);
const clock = { now: () => now };
let server: FakeSupabase;
let local: ReturnType<typeof memoryStorage>;
let session: ReturnType<typeof memoryStorage>;
const tab = (lock: LockPort = sharedLock, sessionStore = session) =>
  createWebAuth({ fetch: server.fetch, stores: { local, session: sessionStore }, random: seqRandom(), lock, clock, url: FAKE_URL, apiKey: FAKE_KEY });
let sharedLock: LockPort;

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : `other:${String(e)}`;
  }
};
async function signIn(a: WebAuth, email = 'maya@example.com', shared = false) {
  await a.sendEmailCode(email);
  return a.verifyEmailCode(email, server.codes.get(email)!, { shared });
}

beforeEach(() => {
  now = Date.UTC(2026, 9, 28, 9, 0, 0);
  server = new FakeSupabase(() => now);
  local = memoryStorage();
  session = memoryStorage();
  sharedLock = pageLocks();
});

describe('PKCE (RFC 7636)', () => {
  it('S256 = base64url(SHA-256(verifier)), checked against the crypto module for many verifiers', () => {
    for (let seed = 1; seed < 40; seed++) {
      const v = makeVerifier(seqRandom(seed));
      expect(challengeFor(v)).toBe(createHash('sha256').update(v, 'ascii').digest('base64url'));
      expect(challengeFor(v)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
    const long = 'a-b.c_d~'.repeat(16);
    expect(challengeFor(long)).toBe(createHash('sha256').update(long, 'ascii').digest('base64url'));
  });

  it('makes 43-character verifiers from 32 random bytes', () => {
    const v = makeVerifier(seqRandom(3));
    expect(v).toHaveLength(43);
    expect(isVerifier(v)).toBe(true);
    expect(makeVerifier(seqRandom(4))).not.toBe(v);
  });

  it('Google: the authorize address, the verifier in this tab only, deleted after the exchange', async () => {
    const a = tab();
    const url = new URL(a.googleSignInUrl());
    expect(url.origin + url.pathname).toBe(`${FAKE_URL}/auth/v1/authorize`);
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('https://kaisip.com/');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    const saved = JSON.parse(session.getItem(PKCE_KEY)!);
    expect(url.searchParams.get('code_challenge')).toBe(challengeFor(saved.verifier));
    expect(local.getItem(PKCE_KEY)).toBeNull();

    const code = server.googleCode(url.searchParams.get('code_challenge')!, 'maya@gmail.com');
    const info = await a.finishGoogleSignIn(code);
    expect(info.providers).toEqual(['google']);
    expect(info.emailMasked).toMatch(/^m.*@gmail\.com$/);
    expect(session.getItem(PKCE_KEY)).toBeNull();
    expect(readSession(local.getItem(SESSION_KEY))).not.toBeNull();
    const exchange = server.calls.find((c) => c.path === '/auth/v1/token?grant_type=pkce')!;
    expect(exchange.body).toEqual({ auth_code: code, code_verifier: saved.verifier });
  });

  it('Google: a sign-in started more than 10 minutes ago is refused', async () => {
    const a = tab();
    const url = new URL(a.googleSignInUrl());
    const code = server.googleCode(url.searchParams.get('code_challenge')!, 'maya@gmail.com');
    now += 10 * 60_000 + 1;
    expect(await codeOf(a.finishGoogleSignIn(code))).toBe('invalid:oauth');
    expect(session.getItem(PKCE_KEY)).toBeNull();
    expect(server.calls.some((c) => c.path.includes('grant_type=pkce'))).toBe(false);
    // At 9 minutes it still works.
    const url2 = new URL(a.googleSignInUrl());
    const code2 = server.googleCode(url2.searchParams.get('code_challenge')!, 'maya@gmail.com');
    now += 9 * 60_000;
    expect(await codeOf(a.finishGoogleSignIn(code2))).toBe('ok');
  });

  it('Google: a code used twice, or with no verifier, is a calm "oauth" error and the verifier is gone', async () => {
    const a = tab();
    const url = new URL(a.googleSignInUrl({ shared: true }));
    const code = server.googleCode(url.searchParams.get('code_challenge')!, 'maya@gmail.com');
    await a.finishGoogleSignIn(code);
    // Shared computer: the session went to sessionStorage.
    expect(session.getItem(SESSION_KEY)).not.toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(await codeOf(a.finishGoogleSignIn(code))).toBe('invalid:oauth');
    a.googleSignInUrl();
    expect(await codeOf(a.finishGoogleSignIn('wrong-code-123456'))).toBe('invalid:oauth');
    expect(session.getItem(PKCE_KEY)).toBeNull();
  });
});

describe('email codes', () => {
  it('sends with the captcha token and signs in with the code; the session goes to localStorage', async () => {
    const a = tab();
    await a.sendEmailCode('  Maya@Example.com ', { captchaToken: 'turnstile-token' });
    const send = server.calls.find((c) => c.path === '/auth/v1/otp')!;
    expect(send.body).toEqual({ email: 'maya@example.com', create_user: true, gotrue_meta_security: { captcha_token: 'turnstile-token' } });
    expect(send.headers.apikey).toBe(FAKE_KEY);
    expect(send.headers.authorization).toBeUndefined();
    const info = await a.verifyEmailCode('maya@example.com', server.codes.get('maya@example.com')!);
    expect(info.providers).toEqual(['email']);
    expect(info.authAt).toBe(Math.floor(now / 1000) * 1000);
    expect(a.current()?.userId).toBe(info.userId);
    expect(readSession(local.getItem(SESSION_KEY))?.userId).toBe(info.userId);
    expect(session.getItem(SESSION_KEY)).toBeNull();
    expect(a.sharedComputer()).toBe(false);
  });

  it('a wrong code, a bad address and a rate limit get calm codes (never server text)', async () => {
    const a = tab();
    expect(await codeOf(a.sendEmailCode('not-an-email'))).toBe('invalid:email');
    await a.sendEmailCode('maya@example.com');
    expect(await codeOf(a.verifyEmailCode('maya@example.com', '00000000'))).toBe('invalid:code_wrong');
    expect(await codeOf(a.verifyEmailCode('maya@example.com', 'abc'))).toBe('invalid:code_wrong');
    server.force('/auth/v1/otp', 429, { code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }, { 'Retry-After': '60' });
    try {
      await a.sendEmailCode('maya@example.com');
      throw new Error('expected a rate limit');
    } catch (e) {
      expect(e).toBeInstanceOf(CloudError);
      expect((e as CloudError).code).toBe('rate_limited');
      expect((e as CloudError).retryAfterSec).toBe(60);
      expect((e as CloudError).message).toBe('rate_limited');
    }
    server.force('/auth/v1/otp', 400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed' });
    expect(await codeOf(a.sendEmailCode('maya@example.com'))).toBe('invalid:captcha');
    server.offline = true;
    expect(await codeOf(a.sendEmailCode('maya@example.com'))).toBe('offline');
  });
});

describe('where the session lives (§1.2)', () => {
  it('"shared computer" uses sessionStorage, and only one copy ever exists', async () => {
    const a = tab();
    await signIn(a, 'maya@example.com', true);
    expect(session.getItem(SESSION_KEY)).not.toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(a.sharedComputer()).toBe(true);
    // Signing in again without the tick moves it to localStorage.
    await signIn(a, 'maya@example.com', false);
    expect(local.getItem(SESSION_KEY)).not.toBeNull();
    expect(session.getItem(SESSION_KEY)).toBeNull();
  });

  it('a refresh keeps the session where it was (shared stays in sessionStorage)', async () => {
    const a = tab();
    await signIn(a, 'maya@example.com', true);
    now += 3_590_000;
    await a.accessToken();
    expect(server.refreshCalls()).toBe(1);
    expect(session.getItem(SESSION_KEY)).not.toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
  });

  it('a damaged or odd saved value reads as signed out and is removed', () => {
    for (const bad of ['{', '[]', JSON.stringify({ v: 1, accessToken: 'x', refreshToken: 'y', expiresAt: 1, userId: 'not-a-uuid' }), JSON.stringify({ v: 2 })]) {
      local.setItem(SESSION_KEY, bad);
      expect(tab().current()).toBeNull();
      expect(local.getItem(SESSION_KEY)).toBeNull();
    }
  });

  it('the tokens are saved only under kaisip_auth_v1 (no other key, no saved key renamed)', async () => {
    local.setItem('cisa_profiles_v1', '{"CISA-ABCDE":{}}');
    local.setItem('aurivan_exam_date', '2026-12-01');
    const a = tab();
    await signIn(a);
    expect(Object.keys(local.dump()).sort()).toEqual(['aurivan_exam_date', 'cisa_profiles_v1', SESSION_KEY].sort());
    const tokens = readSession(local.getItem(SESSION_KEY))!;
    for (const [k, v] of Object.entries({ ...local.dump(), ...session.dump() })) if (k !== SESSION_KEY) expect(v).not.toContain(tokens.refreshToken);
  });
});

describe('refresh under the lock (§1.2 mitigation 4)', () => {
  it('two tabs whose token is running out refresh ONCE; the second adopts the first one\'s session', async () => {
    const a = tab();
    await signIn(a);
    const b = tab();
    now += 3_590_000; // 10 s left: both want a new token
    const [ta, tb] = await Promise.all([a.accessToken(), b.accessToken()]);
    expect(server.refreshCalls()).toBe(1);
    expect(ta).toBe(tb);
    expect(server.revokedFamilies.size).toBe(0);
    // Still signed in, and the new token works.
    expect((await a.getUser()).email).toBe('maya@example.com');
  });

  it('without the lock, the same race spends the refresh token twice and the server signs the learner out', async () => {
    const noLock: LockPort = { request: (_n, fn) => fn() };
    const a = tab(noLock);
    await signIn(a);
    const b = tab(noLock);
    now += 3_590_000;
    const results = await Promise.all([codeOf(a.accessToken()), codeOf(b.accessToken())]);
    expect(server.refreshCalls()).toBe(2);
    void results;
    // The token was spent twice: the server's reuse detection ended the whole session, so the
    // learner is signed out at the next call (with the lock, above, this never happens).
    expect(server.revokedFamilies.size).toBe(1);
    expect(await codeOf(a.getUser())).toBe('unauthorized');
  });

  it('a token with time left is used without any refresh', async () => {
    const a = tab();
    await signIn(a);
    now += 60 * 60_000 - 120_000;
    await a.accessToken();
    expect(server.refreshCalls()).toBe(0);
  });

  it('a refused refresh signs out here; offline keeps the session for later', async () => {
    const a = tab();
    await signIn(a);
    now += 3_590_000;
    server.offline = true;
    expect(await codeOf(a.accessToken())).toBe('offline');
    expect(a.current()).not.toBeNull();
    server.offline = false;
    server.force('/auth/v1/token?grant_type=refresh_token', 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
    expect(await codeOf(a.accessToken())).toBe('unauthorized');
    expect(a.current()).toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
  });

  it('a 401 refreshes once and tries once more', async () => {
    const a = tab();
    await signIn(a);
    server.force('/auth/v1/user', 401, { code: 401, error_code: 'bad_jwt', msg: 'expired' });
    expect((await a.getUser()).email).toBe('maya@example.com');
    expect(server.refreshCalls()).toBe(1);
    expect(server.calls.filter((c) => c.path === '/auth/v1/user')).toHaveLength(2);
    // Twice in a row: only one refresh, then "signed out" (not a loop).
    server.force('/rest/v1/profiles', 401, { code: 'PGRST301', message: 'JWT expired' });
    server.force('/rest/v1/profiles?select', 401, { code: 'PGRST301', message: 'JWT expired' });
    expect(await codeOf(a.termsVersion())).toBe('unauthorized');
    expect(server.refreshCalls()).toBe(2);
  });
});

describe('sign out against a refresh in another tab (security audit of 6f4469e, M1)', () => {
  /**
   * A fetch whose refresh the server has already answered (a new session exists) but whose answer
   * arrives only at `release()`, so another tab can sign out while it is on the wire.
   */
  function heldRefresh() {
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const onWire = new Promise<void>((r) => (started = r));
    const fetch: typeof server.fetch = async (url, init) => {
      const res = await server.fetch(url, init);
      if (url.includes('grant_type=refresh_token')) {
        started();
        await gate;
      }
      return res;
    };
    return { fetch, release, onWire };
  }
  const tabWith = (fetch: typeof server.fetch, lock: LockPort) => createWebAuth({ fetch, stores: { local, session }, random: seqRandom(), lock, clock, url: FAKE_URL, apiKey: FAKE_KEY });

  it('with the lock: a sign-out while a refresh is on the wire stays signed out', async () => {
    await signIn(tab());
    now += 3_590_000;
    const held = heldRefresh();
    const a = tabWith(held.fetch, sharedLock);
    const b = tabWith(server.fetch, sharedLock);
    const refreshing = codeOf(a.accessToken());
    await held.onWire;
    const out = b.signOut('local');
    held.release();
    await out;
    expect(await refreshing).toBe('unauthorized');
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(a.current()).toBeNull();
  });

  it('even without shared locks (an older browser): the refresh re-reads storage after the network and never saves the session back', async () => {
    const noLock: LockPort = { request: (_n, fn) => fn() };
    await signIn(tab());
    now += 3_590_000;
    const held = heldRefresh();
    const a = tabWith(held.fetch, noLock);
    const b = tabWith(server.fetch, noLock);
    const refreshing = codeOf(a.accessToken());
    await held.onWire;
    await b.signOut('local');
    held.release();
    expect(await refreshing).toBe('unauthorized');
    expect(local.getItem(SESSION_KEY)).toBeNull();
  });

  it('delete-account clears inside the lock too', async () => {
    const a = tab();
    await signIn(a);
    const order: string[] = [];
    const watching: LockPort = { request: (n, fn) => sharedLock.request(n, async () => { order.push(n); return fn(); }) };
    const d = tab(watching);
    await d.callFunction('delete-account', { confirm: 'DELETE' });
    expect(order).toContain('kaisip-auth');
    expect(local.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('sign out', () => {
  it('on this browser: always forgets the session, even offline', async () => {
    const a = tab();
    await signIn(a);
    server.offline = true;
    await a.signOut('local');
    expect(a.current()).toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
  });

  it('everywhere: needs the server (offline changes nothing), then revokes every session', async () => {
    const a = tab();
    await signIn(a);
    server.offline = true;
    expect(await codeOf(a.signOut('global'))).toBe('offline');
    expect(a.current()).not.toBeNull();
    server.offline = false;
    await a.signOut('global');
    expect(a.current()).toBeNull();
    expect(server.calls.some((c) => c.path === '/auth/v1/logout?scope=global')).toBe(true);
  });
});

describe('the account functions and the Terms', () => {
  it('Terms: none before, then accepted; accepting again moves the version (insert, then update)', async () => {
    const a = tab();
    const info = await signIn(a);
    expect(await a.termsVersion()).toBeNull();
    await a.acceptTerms({ termsVersion: '2026-11', ageConfirmed: true });
    expect(await a.termsVersion()).toBe('2026-11');
    await a.acceptTerms({ termsVersion: '2027-01', ageConfirmed: true });
    expect(await a.termsVersion()).toBe('2027-01');
    expect(server.calls.some((c) => c.method === 'PATCH' && c.path === `/rest/v1/profiles?id=eq.${info.userId}`)).toBe(true);
    expect(await codeOf(a.acceptTerms({ termsVersion: 'soon', ageConfirmed: true }))).toBe('invalid');
  });

  it('calls only the two account functions, with the token; delete signs out here; errors keep their detail', async () => {
    const a = tab();
    await signIn(a);
    expect(JSON.parse(await a.callFunction('export-my-data', { appVersion: '1.48.0' })).app).toBe('kaisip');
    const call = server.calls.find((c) => c.path === '/functions/v1/export-my-data')!;
    expect(call.headers.authorization).toMatch(/^Bearer /);
    expect(await codeOf(a.callFunction('board-submit' as never, {}))).toBe('invalid');
    expect(await codeOf(a.callFunction('delete-account', { confirm: 'nope' }))).toBe('invalid:confirm_required');
    // reauth_required is a real answer: passed on, never "fixed" by a refresh.
    server.force('/functions/v1/delete-account', 401, { error: 'reauth_required' });
    expect(await codeOf(a.callFunction('delete-account', { confirm: 'DELETE' }))).toBe('reauth_required');
    expect(server.refreshCalls()).toBe(0);
    await a.callFunction('delete-account', { confirm: 'DELETE' });
    expect(a.current()).toBeNull();
  });
});

describe('error mapping', () => {
  it('turns every server answer into one short code, never its text', () => {
    const h = { headers: { get: (n: string) => (n === 'retry-after' ? '120' : null) } };
    const cases: [Parameters<typeof toCloudError>[0], number, unknown, string][] = [
      ['rest', 0, '', 'offline'],
      ['rest', 503, { message: 'db down' }, 'server'],
      ['rest', 409, { code: '23505', message: 'duplicate key value' }, 'conflict'],
      ['rest', 400, { code: 'P0001', message: 'rate_limited' }, 'rate_limited'],
      ['rest', 403, { code: '42501', message: 'new row violates row-level security' }, 'invalid:terms'],
      ['rest', 400, { code: '23514', message: 'violates check constraint "sync_snapshots_state_gz_check"' }, 'too_big'],
      ['rest', 400, { code: '23514', message: 'violates check constraint "store_check"' }, 'invalid:row'],
      ['rest', 401, { code: 'PGRST301', message: 'JWT expired' }, 'unauthorized'],
      ['function', 410, { error: 'gone' }, 'gone'],
      ['function', 405, { error: 'method_not_allowed' }, 'server'],
      ['function', 400, { error: 'invalid', detail: 'Robert"); DROP' }, 'invalid'],
      ['verify', 403, { error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, 'invalid:code_wrong'],
      ['pkce', 404, { error_code: 'flow_state_not_found' }, 'invalid:oauth'],
      ['refresh', 400, { error_code: 'refresh_token_already_used' }, 'unauthorized'],
      ['otp', 429, {}, 'rate_limited'],
    ];
    for (const [call, status, body, want] of cases) {
      const e = toCloudError(call, status, typeof body === 'string' ? body : JSON.stringify(body), h);
      expect(`${e.code}${e.detail ? `:${e.detail}` : ''}`).toBe(want);
      expect(e.message).toBe(e.code);
    }
    expect(toCloudError('rest', 400, JSON.stringify({ code: 'P0001', message: 'rate_limited' }), h).retryAfterSec).toBe(120);
  });

  it('reads token claims without trusting them; junk reads as nothing', () => {
    expect(tokenClaims('a.b')).toEqual({});
    expect(tokenClaims('a.!!!.c')).toEqual({});
  });
});
