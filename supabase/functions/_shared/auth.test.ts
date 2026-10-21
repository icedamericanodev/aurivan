import { strict as assert } from 'node:assert';
import {
  bearerToken,
  type Claims,
  decodeClaims,
  lastSignInMs,
  RECENT_AUTH_MS,
  recentAuth,
  requireMfa,
} from './auth.ts';
import { HttpError } from './http.ts';
import { makeJwt, NOW, USER_A } from './testing.ts';

const claims = (amr: unknown): Claims => decodeClaims(makeJwtWith({ sub: USER_A, role: 'authenticated', amr }))!;

function makeJwtWith(payload: unknown): string {
  const enc = (x: unknown) => btoa(JSON.stringify(x)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
}

function req(auth?: string): Request {
  return new Request('http://localhost/', { method: 'POST', headers: auth ? { authorization: auth } : {} });
}

Deno.test('bearerToken accepts only a well-formed Bearer JWT', () => {
  const jwt = makeJwt(USER_A);
  assert.equal(bearerToken(req(`Bearer ${jwt}`)), jwt);
  assert.equal(bearerToken(req(`bearer ${jwt}`)), jwt);
  for (
    const bad of [
      undefined,
      'Bearer',
      `Basic ${jwt}`,
      `Bearer ${jwt} extra`,
      'Bearer a.b',
      `Bearer ${'a'.repeat(9000)}.b.c`,
    ]
  ) {
    assert.throws(() => bearerToken(req(bad)), (e: unknown) => e instanceof HttpError && e.status === 401);
  }
});

Deno.test('decodeClaims reads sub, role and amr, dropping malformed amr entries', () => {
  const c = claims([{ method: 'otp', timestamp: 100 }, { method: 'oauth' }, 'x', { method: 1, timestamp: 2 }]);
  assert.deepEqual(c, { sub: USER_A, role: 'authenticated', amr: [{ method: 'otp', timestamp: 100 }], aal: 'aal1' });
  assert.deepEqual(claims(undefined).amr, []);
  assert.equal(decodeClaims(makeJwtWith({ sub: 'not-a-uuid', role: 'authenticated' })), null);
  assert.equal(decodeClaims(makeJwtWith({ role: 'authenticated' })), null);
  assert.equal(decodeClaims('a.%%%.c'), null);
  assert.equal(decodeClaims('only-one-part'), null);
});

Deno.test('aal: only the exact string aal2 counts as a second factor (security audit M2)', () => {
  const aal = (v: unknown) => decodeClaims(makeJwtWith({ sub: USER_A, role: 'authenticated', aal: v }))!;
  assert.equal(aal('aal2').aal, 'aal2');
  for (const v of ['aal1', 'AAL2', 'aal3', '', 2, true, null, undefined, ['aal2']]) assert.equal(aal(v).aal, 'aal1');
  assert.doesNotThrow(() => requireMfa(aal('aal2')));
  assert.throws(
    () => requireMfa(aal('aal1')),
    (e: unknown) =>
      e instanceof HttpError && e.status === 401 && e.code === 'reauth_required' && e.detail === 'mfa_required',
  );
});

Deno.test('recentAuth: the newest sign-in must be within 10 minutes and not in the future', () => {
  const at = (agoMs: number) => ({ method: 'otp', timestamp: Math.floor((NOW - agoMs) / 1000) });
  assert.equal(recentAuth(claims([at(60_000)]), NOW), true);
  assert.equal(recentAuth(claims([at(RECENT_AUTH_MS)]), NOW), true);
  assert.equal(recentAuth(claims([at(RECENT_AUTH_MS + 1000)]), NOW), false);
  assert.equal(recentAuth(claims([at(11 * 60_000)]), NOW), false);
  // The newest entry wins, whatever the order.
  assert.equal(recentAuth(claims([at(3 * 60 * 60_000), at(2 * 60_000)]), NOW), true);
  // No usable entry: re-authenticate.
  assert.equal(recentAuth(claims([]), NOW), false);
  // 30 s of clock skew is fine; 5 minutes in the future is not.
  assert.equal(recentAuth(claims([at(-30_000)]), NOW), true);
  assert.equal(recentAuth(claims([at(-5 * 60_000)]), NOW), false);
  assert.equal(lastSignInMs(claims([at(0)])), NOW);
});
