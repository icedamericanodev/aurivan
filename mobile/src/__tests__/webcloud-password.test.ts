/**
 * Passwords in the shared sign-in client (src/webcloud/auth.ts; owner
 * decisions 28 Nov 2026, design PASSWORD_SIGN_IN_DESIGN.md §4) against the
 * fake Supabase (jest/webcloud-fakes.ts), which plays GoTrue v2.199.0's
 * password rules and the database's password guard (rule 4: a first
 * password needs a session under 10 minutes old, else a 500). Covers:
 * - sign-up: rules checked locally first, a code (the password NOT sent),
 *   then the password saved with the fresh session; partial success;
 * - password sign-in: one answer for a wrong password and an unknown
 *   address, the human check, rate limits, offline, NFC;
 * - forgot password: no link, the same answer for every address (LOW-1),
 *   the reset code, then the new password; other sessions signed out;
 * - "set a password later" and change: the 9-minute check by the server's
 *   clock (LOW-3), the 500 mapping, the current password, reauth;
 * - the 30-day session cap (local progress untouched);
 * - the error mapping for every new server answer;
 * - go-live gate 17: no password in any storage or log line, and sent only
 *   to the two endpoints that need it.
 */
import { CloudError } from '../cloud/types';
import { pageLocks } from '../webcloud/browser';
import { createWebAuth, type WebAuth } from '../webcloud/auth';
import { PASSWORD_FRESH_MS, SESSION_KEY, SESSION_MAX_AGE_MS, SYNC_META_KEY } from '../webcloud/config';
import { toCloudError } from '../webcloud/errors';
import { readSession } from '../webcloud/session';
import type { LockPort } from '../webcloud/ports';
import { FAKE_KEY, FAKE_URL, FakeSupabase, fakeJwt, memoryStorage, seqRandom } from '../../jest/webcloud-fakes';

const MIN = 60_000;
const DAY = 86_400_000;
const EMAIL = 'maya@example.com';
const PW = 'ocean violet lamp seven';
const PW2 = 'maple cloud tiger piano';
const PW3 = 'amber frost north quilt';

let now = Date.UTC(2026, 10, 28, 9, 0, 0);
const clock = { now: () => now };
let server: FakeSupabase;
let local: ReturnType<typeof memoryStorage>;
let session: ReturnType<typeof memoryStorage>;
let sharedLock: LockPort;
const tab = (): WebAuth => createWebAuth({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY });

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : `other:${String(e)}`;
  }
};
/** An account the way learners make one: a code, then the password. */
async function signUp(a: WebAuth, email = EMAIL, pw = PW) {
  await a.startPasswordSignUp(email, pw);
  return a.finishPasswordSignUp(email, server.codes.get(email)!, pw);
}
const putCalls = () => server.calls.filter((c) => c.method === 'PUT' && c.path === '/auth/v1/user');

beforeEach(() => {
  now = Date.UTC(2026, 10, 28, 9, 0, 0);
  server = new FakeSupabase(() => now);
  local = memoryStorage();
  session = memoryStorage();
  sharedLock = pageLocks();
});

describe('create an account with a password', () => {
  it('a code first (the password not sent), then the password saved with the fresh session', async () => {
    const a = tab();
    await a.startPasswordSignUp('  Maya@Example.com ', PW, { captchaToken: 'turnstile-token' });
    const otp = server.calls.find((c) => c.path === '/auth/v1/otp')!;
    expect(otp.body).toEqual({ email: EMAIL, create_user: true, gotrue_meta_security: { captcha_token: 'turnstile-token' } });
    expect(server.calls).toHaveLength(1);

    const done = await a.finishPasswordSignUp(EMAIL, server.codes.get(EMAIL)!, PW);
    expect(done.passwordSaved).toBe(true);
    expect(done.problem).toBeUndefined();
    expect(done.account.providers).toEqual(['email']);
    expect(server.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /auth/v1/otp', 'POST /auth/v1/verify', 'PUT /auth/v1/user']);
    expect(server.calls[1].body).toEqual({ type: 'email', email: EMAIL, token: expect.any(String) });
    expect(putCalls()[0].body).toEqual({ password: PW });
    expect(a.passwordNeeded()).toBe(false);
    // And it signs in.
    await a.signOut('local');
    expect((await tab().signInWithPassword(EMAIL, PW)).userId).toBe(done.account.userId);
  });

  it('refuses a weak password before anything is sent', async () => {
    const a = tab();
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'short words'))).toBe('invalid:password_too_short');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'passwordpassword'))).toBe('invalid:password_common');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'maya maya maya 1990'))).toBe('invalid:password_contains_email');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'kaisip kaisip 2026'))).toBe('invalid:password_contains_service_word');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'abcabcabcabcabcabc'))).toBe('invalid:password_too_simple');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'x'.repeat(73)))).toBe('invalid:password_too_long');
    expect(await codeOf(a.startPasswordSignUp('not-an-email', PW))).toBe('invalid:email');
    expect(server.calls).toHaveLength(0);
  });

  it('checks the password again BEFORE using the code (the code is not used up)', async () => {
    const a = tab();
    await a.startPasswordSignUp(EMAIL, PW);
    const code = server.codes.get(EMAIL)!;
    expect(await codeOf(a.finishPasswordSignUp(EMAIL, code, 'too short'))).toBe('invalid:password_too_short');
    expect(server.calls.some((c) => c.path === '/auth/v1/verify')).toBe(false);
    expect(a.current()).toBeNull();
    expect((await a.finishPasswordSignUp(EMAIL, code, PW)).passwordSaved).toBe(true);
  });

  it('a wrong code: a calm code_wrong, no session, nothing saved', async () => {
    const a = tab();
    await a.startPasswordSignUp(EMAIL, PW);
    expect(await codeOf(a.finishPasswordSignUp(EMAIL, '00000000', PW))).toBe('invalid:code_wrong');
    expect(await codeOf(a.finishPasswordSignUp(EMAIL, 'abc', PW))).toBe('invalid:code_wrong');
    expect(a.current()).toBeNull();
    expect(putCalls()).toHaveLength(0);
  });

  it('the code works but the server refuses the password: signed in, not saved, and "needs a password" survives a reload', async () => {
    server.pwned.add(PW);
    const a = tab();
    const done = await signUp(a);
    expect(done).toEqual({ account: expect.objectContaining({ providers: ['email'] }), passwordSaved: false, problem: 'leaked' });
    expect(a.current()).not.toBeNull();
    expect(a.passwordNeeded()).toBe(true);
    expect(tab().passwordNeeded()).toBe(true); // a reload
    // The screen asks again, within the fresh session: saved.
    await a.setPassword(PW2);
    expect(a.passwordNeeded()).toBe(false);
    expect(tab().passwordNeeded()).toBe(false);
  });

  it('offline or rate limited while saving: reported as the problem, still signed in', async () => {
    const a = tab();
    await a.startPasswordSignUp(EMAIL, PW);
    server.force('/auth/v1/user', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' });
    const done = await a.finishPasswordSignUp(EMAIL, server.codes.get(EMAIL)!, PW);
    expect([done.passwordSaved, done.problem]).toEqual([false, 'rate_limited']);
    expect(a.passwordNeeded()).toBe(true);
  });

  it('the address already had an account: the code signs in to it and the new password replaces the old one', async () => {
    const first = await signUp(tab());
    const other = tab();
    await other.signOut('local');
    const elsewhere = createWebAuth({ fetch: server.fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock, url: FAKE_URL, apiKey: FAKE_KEY });
    await elsewhere.signInWithPassword(EMAIL, PW);
    now += 5 * MIN;
    const again = await signUp(tab(), EMAIL, PW2);
    expect(again.account.userId).toBe(first.account.userId);
    expect(again.passwordSaved).toBe(true);
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
    // The other computer was signed out by the change.
    expect(await codeOf(elsewhere.getUser())).toBe('unauthorized');
    // Choosing the same password again counts as saved (the account has it).
    const same = await signUp(tab(), EMAIL, PW2);
    expect([same.passwordSaved, same.problem]).toEqual([true, undefined]);
  });
});

describe('sign in with a password', () => {
  it('works, with the human-check token; a password session counts as "email"', async () => {
    await signUp(tab());
    await tab().signOut('local');
    server.captchaOn = true;
    const a = tab();
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('invalid:captcha');
    const info = await a.signInWithPassword(' MAYA@example.com', PW, { captchaToken: 'tok' });
    const call = server.calls.filter((c) => c.path === '/auth/v1/token?grant_type=password').pop()!;
    expect(call.body).toEqual({ email: EMAIL, password: PW, gotrue_meta_security: { captcha_token: 'tok' } });
    expect(call.headers.authorization).toBeUndefined();
    expect(info.providers).toEqual(['email']);
    expect(info.authAt).toBe(Math.floor(now / 1000) * 1000);
    expect(a.passwordNeeded()).toBe(false);
    expect(readSession(local.getItem(SESSION_KEY))?.userId).toBe(info.userId);
  });

  it('a wrong password and an unknown address get the same answer; a code-only account too', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    expect(await codeOf(a.signInWithPassword(EMAIL, PW2))).toBe('invalid:password_wrong');
    expect(await codeOf(a.signInWithPassword('nobody@example.com', PW))).toBe('invalid:password_wrong');
    await a.sendEmailCode('codeonly@example.com');
    await a.verifyEmailCode('codeonly@example.com', server.codes.get('codeonly@example.com')!);
    await a.signOut('local');
    expect(await codeOf(a.signInWithPassword('codeonly@example.com', PW))).toBe('invalid:password_wrong');
    // email_not_confirmed (only a stranger's /signup makes one) reads the same.
    server.force('/auth/v1/token?grant_type=password', 400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
  });

  it('an empty or impossibly long password is "wrong" without asking the server; the app\'s rules are not applied', async () => {
    const a = tab();
    expect(await codeOf(a.signInWithPassword(EMAIL, ''))).toBe('invalid:password_wrong');
    expect(await codeOf(a.signInWithPassword(EMAIL, 'x'.repeat(73)))).toBe('invalid:password_wrong');
    expect(server.calls).toHaveLength(0);
    // A short password is still sent (an account may hold one from before the rules): the server decides.
    expect(await codeOf(a.signInWithPassword(EMAIL, 'short'))).toBe('invalid:password_wrong');
    expect(server.calls).toHaveLength(1);
  });

  it('rate limits, captcha refusals and offline are calm codes', async () => {
    const a = tab();
    server.force('/auth/v1/token?grant_type=password', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }, { 'Retry-After': '300' });
    try {
      await a.signInWithPassword(EMAIL, PW);
      throw new Error('expected a rate limit');
    } catch (e) {
      expect([(e as CloudError).code, (e as CloudError).retryAfterSec, (e as CloudError).message]).toEqual(['rate_limited', 300, 'rate_limited']);
    }
    server.force('/auth/v1/token?grant_type=password', 400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed' });
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('invalid:captcha');
    server.offline = true;
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('offline');
    expect(a.current()).toBeNull();
  });

  it('NFC: a password typed with combining accents signs in as the composed one, and is sent composed', async () => {
    const acute = String.fromCharCode(0x301);
    const composed = 'café violet lamp seven';
    const decomposed = `cafe${acute} violet lamp seven`;
    expect(decomposed).not.toBe(composed);
    await signUp(tab(), EMAIL, decomposed);
    expect(putCalls()[0].body).toEqual({ password: composed });
    await tab().signOut('local');
    expect(await codeOf(tab().signInWithPassword(EMAIL, composed))).toBe('ok');
    await tab().signOut('local');
    expect(await codeOf(tab().signInWithPassword(EMAIL, decomposed))).toBe('ok');
    for (const c of server.calls.filter((x) => x.path.includes('grant_type=password'))) expect((c.body as { password: string }).password).toBe(composed);
  });
});

describe('forgot password (a code, never a link)', () => {
  it('asks for a reset code with no redirect and no PKCE challenge; the code and a new password sign in and sign out the rest', async () => {
    await signUp(tab());
    const elsewhere = createWebAuth({ fetch: server.fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock, url: FAKE_URL, apiKey: FAKE_KEY });
    await elsewhere.signInWithPassword(EMAIL, PW);
    await tab().signOut('local');

    const a = tab();
    await a.sendPasswordResetCode(EMAIL, { captchaToken: 'tok' });
    const ask = server.calls.find((c) => c.path === '/auth/v1/recover')!;
    expect(ask.body).toEqual({ email: EMAIL, gotrue_meta_security: { captcha_token: 'tok' } });
    expect(ask.path).toBe('/auth/v1/recover');

    const done = await a.finishPasswordReset(EMAIL, server.resetCodes.get(EMAIL)!, PW2);
    expect(done.passwordSaved).toBe(true);
    expect(server.calls.filter((c) => c.path === '/auth/v1/verify').pop()!.body).toEqual({ type: 'recovery', email: EMAIL, token: expect.any(String) });
    expect(a.passwordNeeded()).toBe(false);
    expect(await codeOf(elsewhere.getUser())).toBe('unauthorized');
    await a.signOut('local');
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW2))).toBe('ok');
  });

  it('the same answer for every address: unknown, real, and a real one asked twice within a minute (audit LOW-1)', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    expect(await codeOf(a.sendPasswordResetCode('nobody@example.com'))).toBe('ok');
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('ok');
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('ok');
    // The server did say 429 the second time; the screen can't tell.
    expect(server.calls.filter((c) => c.path === '/auth/v1/recover')).toHaveLength(3);
    // A per-IP limit is not about the address: a real "wait".
    server.force('/auth/v1/recover', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' });
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('rate_limited');
    server.captchaOn = true;
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('invalid:captcha');
    expect(await codeOf(a.sendPasswordResetCode('nope'))).toBe('invalid:email');
    server.offline = true;
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('offline');
  });

  it('a wrong reset code, or a sign-up code used as a reset code, is code_wrong; a weak new password is refused first', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    await a.sendPasswordResetCode(EMAIL);
    expect(await codeOf(a.finishPasswordReset(EMAIL, '00000000', PW2))).toBe('invalid:code_wrong');
    expect(await codeOf(a.finishPasswordReset(EMAIL, server.resetCodes.get(EMAIL)!, 'qwertyuiop12345'))).toBe('invalid:password_common');
    expect(a.current()).toBeNull();
    expect((await a.finishPasswordReset(EMAIL, server.resetCodes.get(EMAIL)!, PW)).passwordSaved).toBe(true); // the same password: fine
  });

  it('"set a password later" for a Google account goes through the same reset', async () => {
    const g = tab();
    const url = new URL(g.googleSignInUrl());
    await g.finishGoogleSignIn(server.googleCode(url.searchParams.get('code_challenge')!, 'maya@gmail.com'));
    await g.signOut('local');
    const a = tab();
    await a.sendPasswordResetCode('maya@gmail.com');
    expect((await a.finishPasswordReset('maya@gmail.com', server.resetCodes.get('maya@gmail.com')!, PW)).passwordSaved).toBe(true);
    await a.signOut('local');
    expect(await codeOf(tab().signInWithPassword('maya@gmail.com', PW))).toBe('ok');
  });
});

describe('add or change a password later (the 10-minute rule, checked first)', () => {
  async function google(a: WebAuth) {
    const url = new URL(a.googleSignInUrl());
    return a.finishGoogleSignIn(server.googleCode(url.searchParams.get('code_challenge')!, 'maya@gmail.com'));
  }

  it('within 9 minutes of signing in it is sent; after, it asks for a new sign-in without sending', async () => {
    const a = tab();
    await google(a);
    now += PASSWORD_FRESH_MS - 1000;
    await a.setPassword(PW);
    expect(putCalls()).toHaveLength(1);

    const b = tab();
    await b.signOut('local');
    await google(b);
    now += PASSWORD_FRESH_MS;
    expect(await codeOf(b.setPassword(PW2))).toBe('reauth_required:recent_sign_in');
    expect(putCalls()).toHaveLength(1);
  });

  it('a refresh is not a sign-in: an hour later, after refreshes, it still asks', async () => {
    const a = tab();
    await google(a);
    now += 59.5 * MIN;
    await a.accessToken();
    expect(server.refreshCalls()).toBe(1);
    expect(await codeOf(a.setPassword(PW))).toBe('reauth_required:recent_sign_in');
    expect(putCalls()).toHaveLength(0);
  });

  it('uses the server\'s clock (audit LOW-3): a computer 2 minutes behind still stops at the server\'s 9 minutes', async () => {
    server.skewMs = 2 * MIN; // the server is 2 minutes ahead of this computer
    const a = tab();
    await google(a);
    now += 8 * MIN; // 8 here, but 8 by the server too: fresh
    expect(await codeOf(a.setPassword(PW))).toBe('ok');
    const b = tab();
    await b.signOut('local');
    server.skewMs = 0;
    await google(b);
    // The server's clock jumps ahead 3 minutes after the sign-in: its age is 3 + 7 = 10 minutes.
    const s = readSession(local.getItem(SESSION_KEY))!;
    local.setItem(SESSION_KEY, JSON.stringify({ ...s, skewMs: 3 * MIN }));
    now += 7 * MIN;
    expect(await codeOf(b.setPassword(PW2))).toBe('reauth_required:recent_sign_in');
  });

  it('the database\'s refusal (a 500 from PUT /user) reads as "sign in again"; an outage does not', async () => {
    const a = tab();
    await google(a);
    server.force('/auth/v1/user', 500, { code: 500, error_code: 'unexpected_failure', msg: 'Error during password storage: kaisip_password_needs_recent_sign_in' });
    expect(await codeOf(a.setPassword(PW))).toBe('reauth_required:recent_sign_in');
    server.force('/auth/v1/user', 503, { message: 'upstream unavailable' });
    expect(await codeOf(a.setPassword(PW))).toBe('server');
  });

  it('changing a password needs the current one (in a password session); wrong or same is a calm code', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    await a.signInWithPassword(EMAIL, PW);
    expect(await codeOf(a.setPassword(PW2))).toBe('invalid:password_current_needed');
    expect(await codeOf(a.setPassword(PW2, { currentPassword: PW3 }))).toBe('invalid:password_current_wrong');
    expect(await codeOf(a.setPassword(PW, { currentPassword: PW }))).toBe('invalid:password_same');
    expect(await codeOf(a.setPassword('kaisip kaisip 2026', { currentPassword: PW }))).toBe('invalid:password_contains_service_word');
    // An hour later, with the current password, the server decides (it allows changes for 24 hours).
    now += 60 * MIN;
    expect(await codeOf(a.setPassword(PW2, { currentPassword: PW }))).toBe('ok');
    expect(putCalls().pop()!.body).toEqual({ password: PW2, current_password: PW });
    // More than a day later the server wants a fresh sign-in.
    now += 25 * 60 * MIN;
    expect(await codeOf(a.setPassword(PW3, { currentPassword: PW2 }))).toBe('reauth_required:recent_sign_in');
  });

  it('signed out: unauthorized, nothing sent', async () => {
    expect(await codeOf(tab().setPassword(PW))).toBe('unauthorized');
    expect(server.calls).toHaveLength(0);
  });
});

describe('"confirm it\'s you" with the password', () => {
  it('a fresh session for the same account; the old one ends on the server', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    const first = await a.signInWithPassword(EMAIL, PW);
    const oldToken = readSession(local.getItem(SESSION_KEY))!.accessToken;
    now += 30 * MIN;
    expect(await codeOf(a.reauthWithPassword(PW2))).toBe('invalid:password_wrong');
    expect(readSession(local.getItem(SESSION_KEY))!.accessToken).toBe(oldToken);
    const again = await a.reauthWithPassword(PW, { captchaToken: 'tok' });
    expect(again.userId).toBe(first.userId);
    expect(again.authAt).toBe(Math.floor(now / 1000) * 1000);
    expect(server.calls.some((c) => c.path === '/auth/v1/logout?scope=local' && c.headers.authorization === `Bearer ${oldToken}`)).toBe(true);
    expect(await codeOf(a.getUser())).toBe('ok');
    // Fresh again: a change now goes through (with the current password, a password session).
    expect(await codeOf(a.setPassword(PW2, { currentPassword: PW }))).toBe('ok');
  });

  it('signed out: unauthorized', async () => {
    expect(await codeOf(tab().reauthWithPassword(PW))).toBe('unauthorized');
  });
});

describe('codes only confirm or recover: a code session needs a password', () => {
  it('after verifyEmailCode the account needs a password until one is saved; Google and password sessions do not', async () => {
    const a = tab();
    await a.sendEmailCode(EMAIL);
    await a.verifyEmailCode(EMAIL, server.codes.get(EMAIL)!);
    expect(a.passwordNeeded()).toBe(true);
    // A refresh keeps the mark.
    now += 59.5 * MIN;
    await a.accessToken();
    expect(tab().passwordNeeded()).toBe(true);
    await a.signOut('local');
    expect(a.passwordNeeded()).toBe(false);
  });
});

describe('the 30-day session cap', () => {
  it('a session older than 30 days reads as signed out; progress and the sync record stay; a new sign-in clears it', async () => {
    local.setItem('cisa_profiles_v1', '{"CISA-ABCDE":{}}');
    local.setItem(SYNC_META_KEY, '{"v":1,"enabled":true}');
    await signUp(tab());
    const a = tab();
    // Day 29: still signed in, and a refresh then does not restart the 30 days.
    now += 29 * DAY;
    expect(a.current()).not.toBeNull();
    await a.accessToken();
    expect(server.refreshCalls()).toBe(1);
    expect(a.sessionEnded()).toBeNull();
    now += DAY - MIN;
    expect(a.current()).not.toBeNull();
    now += MIN;
    expect(a.current()).toBeNull();
    expect(a.sessionEnded()).toBe('expired');
    expect(await codeOf(a.accessToken())).toBe('unauthorized:session_expired');
    expect(await codeOf(a.getUser())).toBe('unauthorized:session_expired');
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(local.getItem('cisa_profiles_v1')).toBe('{"CISA-ABCDE":{}}');
    expect(local.getItem(SYNC_META_KEY)).toBe('{"v":1,"enabled":true}');
    // Signing in again starts a new 30 days.
    await a.signInWithPassword(EMAIL, PW);
    expect(a.sessionEnded()).toBeNull();
    expect(a.current()).not.toBeNull();
  });

  it('a session saved without a sign-in time uses the token\'s; with neither it is treated as too old', () => {
    const base = { v: 1, refreshToken: 'rt-old-session-xyz', expiresAt: now + 3_600_000, userId: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001', email: EMAIL, providers: ['email'] };
    const tok = (amrAt: number | null) => fakeJwt({ sub: base.userId, exp: Math.floor(now / 1000) + 3600, ...(amrAt === null ? {} : { amr: [{ method: 'password', timestamp: Math.floor(amrAt / 1000) }] }) });
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, accessToken: tok(now - 29 * DAY) }));
    expect(tab().current()).not.toBeNull();
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, accessToken: tok(now - SESSION_MAX_AGE_MS - 1000) }));
    expect(tab().current()).toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, accessToken: tok(null) }));
    expect(tab().current()).toBeNull();
  });

  it('a changed computer clock can\'t stretch it: the server\'s sign-in time counts too', () => {
    const userId = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002';
    const at = fakeJwt({ sub: userId, exp: Math.floor(now / 1000) + 3600, amr: [{ method: 'oauth', timestamp: Math.floor((now - 31 * DAY) / 1000) }] });
    // signedInAt says "yesterday" (a clock set back at sign-in), the token says 31 days.
    local.setItem(SESSION_KEY, JSON.stringify({ v: 1, accessToken: at, refreshToken: 'rt-clock-xyz', expiresAt: now + 3_600_000, userId, email: EMAIL, providers: ['google'], signedInAt: now - DAY }));
    expect(tab().current()).toBeNull();
  });
});

describe('error mapping for the password calls', () => {
  it('every new server answer → one short code, never its text', () => {
    const h = { headers: { get: (n: string) => (n === 'retry-after' ? '60' : null) } };
    const cases: [Parameters<typeof toCloudError>[0], number, unknown, string][] = [
      ['password', 400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 'invalid:password_wrong'],
      ['password', 400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, 'invalid:password_wrong'],
      ['password', 400, { error_code: 'captcha_failed' }, 'invalid:captcha'],
      ['password', 429, { error_code: 'over_request_rate_limit' }, 'rate_limited'],
      ['password', 400, { error_code: 'user_banned', msg: 'User is banned' }, 'invalid:password_wrong'],
      ['password', 0, '', 'offline'],
      ['password', 503, {}, 'server'],
      ['recover', 400, { error_code: 'captcha_failed' }, 'invalid:captcha'],
      ['recover', 429, { error_code: 'over_email_send_rate_limit' }, 'rate_limited'],
      ['recover', 400, { error_code: 'validation_failed' }, 'invalid:email'],
      ['recover', 400, { error_code: 'email_provider_disabled' }, 'invalid:signup_disabled'],
      ['verify', 403, { error_code: 'otp_expired' }, 'invalid:code_wrong'],
      ['user_update', 422, { error_code: 'weak_password', weak_password: { reasons: ['length'] } }, 'invalid:password_too_short'],
      ['user_update', 422, { error_code: 'weak_password', weak_password: { reasons: ['pwned'] } }, 'invalid:password_leaked'],
      ['user_update', 422, { error_code: 'weak_password', weak_password: { reasons: ['characters'] } }, 'invalid:password_weak'],
      ['user_update', 422, { error_code: 'weak_password' }, 'invalid:password_weak'],
      ['user_update', 422, { error_code: 'same_password' }, 'invalid:password_same'],
      ['user_update', 400, { error_code: 'current_password_required' }, 'invalid:password_current_needed'],
      ['user_update', 400, { error_code: 'current_password_mismatch' }, 'invalid:password_current_wrong'],
      ['user_update', 400, { error_code: 'reauthentication_needed' }, 'reauth_required:recent_sign_in'],
      ['user_update', 400, { error_code: 'reauthentication_not_valid' }, 'reauth_required:recent_sign_in'],
      ['user_update', 403, { error_code: 'insufficient_aal' }, 'reauth_required:aal2'],
      ['user_update', 500, { error_code: 'unexpected_failure', msg: 'kaisip_password_needs_recent_sign_in' }, 'reauth_required:recent_sign_in'],
      ['user_update', 500, 'not json', 'reauth_required:recent_sign_in'],
      ['user_update', 502, {}, 'server'],
      ['user_update', 401, { error_code: 'bad_jwt' }, 'unauthorized'],
      ['user_update', 403, { error_code: 'session_not_found' }, 'unauthorized'],
      ['user_update', 429, {}, 'rate_limited'],
      ['user_update', 422, { error_code: 'validation_failed', msg: 'Password cannot be longer than 72 characters' }, 'invalid:password_weak'],
    ];
    for (const [call, status, body, want] of cases) {
      const e = toCloudError(call, status, typeof body === 'string' ? body : JSON.stringify(body), h);
      expect(`${call} ${status} ${JSON.stringify(body)} → ${e.code}${e.detail ? `:${e.detail}` : ''}`).toBe(`${call} ${status} ${JSON.stringify(body)} → ${want}`);
      expect(e.message).toBe(e.code);
      if (e.detail) expect(e.detail).toMatch(/^[a-z0-9_]{1,40}$/);
    }
  });
});

describe('go-live gate 17: the password is never stored or logged', () => {
  it('every flow, then: no storage value, log line, error or URL holds a password; only the two endpoints receive one', async () => {
    const PASSWORDS = [PW, PW2, PW3, 'kaisip kaisip 2026', 'too short'];
    const logged: string[] = [];
    const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        logged.push(args.map((x) => (typeof x === 'string' ? x : JSON.stringify(x) ?? String(x))).join(' '));
      }),
    );
    const errors: string[] = [];
    const attempt = async (p: Promise<unknown>) => {
      try {
        await p;
      } catch (e) {
        errors.push(`${String(e)} ${JSON.stringify(e)} ${(e as Error).stack ?? ''}`);
      }
    };
    try {
      const a = tab();
      await attempt(a.startPasswordSignUp(EMAIL, 'too short'));
      await attempt(signUp(a));
      await attempt(a.setPassword('kaisip kaisip 2026'));
      await a.signOut('local');
      await attempt(a.signInWithPassword(EMAIL, PW2));
      await attempt(a.signInWithPassword(EMAIL, PW));
      await attempt(a.setPassword(PW2, { currentPassword: PW3 }));
      await attempt(a.setPassword(PW2, { currentPassword: PW }));
      await attempt(a.reauthWithPassword(PW3));
      await attempt(a.reauthWithPassword(PW2));
      await a.signOut('local');
      await attempt(a.sendPasswordResetCode(EMAIL));
      await attempt(a.finishPasswordReset(EMAIL, server.resetCodes.get(EMAIL) ?? '', PW3));
      // The shared-computer storage too.
      await a.signOut('local');
      await attempt(a.signInWithPassword(EMAIL, PW3, { shared: true }));
      server.offline = true;
      await attempt(a.signInWithPassword(EMAIL, PW3));
    } finally {
      for (const s of spies) s.mockRestore();
    }
    // The flows really ran: one account, signed in on the shared computer with the last password.
    expect(readSession(session.getItem(SESSION_KEY))).not.toBeNull();
    const stored = JSON.stringify({ ...local.dump(), ...session.dump() });
    for (const pw of PASSWORDS) {
      expect(stored).not.toContain(pw);
      for (const l of logged) expect(l).not.toContain(pw);
      for (const e of errors) expect(e).not.toContain(pw);
    }
    // Sent only in the body of a password sign-in or PUT /user, never in a URL or a header.
    for (const c of server.calls) {
      const body = JSON.stringify(c.body ?? null);
      const holds = PASSWORDS.some((pw) => body.includes(pw));
      if (holds) expect(`${c.method} ${c.path.split('?')[0]}${c.path.includes('grant_type=password') ? '?password' : ''}`).toMatch(/^(POST \/auth\/v1\/token\?password|PUT \/auth\/v1\/user)$/);
      for (const pw of PASSWORDS) {
        expect(c.path).not.toContain(encodeURIComponent(pw));
        expect(JSON.stringify(c.headers)).not.toContain(pw);
      }
    }
  });
});
