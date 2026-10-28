import { strict as assert } from 'node:assert';
import type { AppleRevoker } from '../_shared/apple.ts';
import { WEB_ORIGIN } from '../_shared/http.ts';
import { deletionHash } from '../_shared/pepper.ts';
import { FakeAdmin, NOW, PEPPER, post, recordingLogger, USER_A, USER_B } from '../_shared/testing.ts';
import { handleDeleteAccount } from './handler.ts';

const APPLE_CODE = 'c1a2b3c4d5e6f7.0.abcd.Ef_12-34';

function setup(opts: { apple?: AppleRevoker | null; pepper?: string | null } = {}) {
  const admin = new FakeAdmin();
  admin.addUser({ id: USER_A, email: 'a@test.invalid', providers: ['email'], board: { posts: 2, comments: 5 } });
  admin.addUser({ id: USER_B, email: 'b@test.invalid', providers: ['apple', 'email'] });
  const log = recordingLogger();
  const revoked: string[] = [];
  const apple: AppleRevoker | null = opts.apple === undefined
    ? {
      revokeWithCode: (code) => {
        revoked.push(code);
        return Promise.resolve(true);
      },
    }
    : opts.apple;
  const pepper = opts.pepper === undefined ? PEPPER : opts.pepper;
  const run = (req: Request) => handleDeleteAccount(req, { admin, apple, pepper, now: () => NOW, log });
  return { admin, log, revoked, run };
}

async function body(res: Response): Promise<Record<string, unknown>> {
  return await res.json() as Record<string, unknown>;
}

Deno.test('no JWT: 401 and nothing is deleted', async () => {
  const { admin, run } = setup();
  const res = await run(post({ confirm: 'DELETE' }));
  assert.equal(res.status, 401);
  assert.deepEqual(await body(res), { error: 'unauthorized' });
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('a malformed or unknown token: 401', async () => {
  const { admin, run } = setup();
  for (const jwt of ['not-a-jwt', 'a.b', `${admin.issue(USER_A)}x.y`]) {
    assert.equal((await run(post({ confirm: 'DELETE' }, jwt))).status, 401);
  }
  // Well-formed but never issued by the Auth server.
  const forged = admin.issue(USER_A);
  admin.tokens.delete(forged);
  assert.equal((await run(post({ confirm: 'DELETE' }, forged))).status, 401);
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('the Auth server unreachable is a bare 500: never 401 or 410, never success', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  admin.fail.getUser = true;
  const res = await run(post({ confirm: 'DELETE' }, jwt));
  assert.equal(res.status, 500);
  assert.deepEqual(await body(res), { error: 'server' });
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('a revoked session (signed out on all devices): 401 unauthorized, never 410 gone', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  admin.tokens.delete(jwt); // the Auth server no longer accepts it
  const res = await run(post({ confirm: 'DELETE' }, jwt));
  assert.equal(res.status, 401);
  assert.deepEqual(await body(res), { error: 'unauthorized' });
  assert.equal(admin.count('deleteUser'), 0);
  assert.equal(admin.users.has(USER_A), true, 'the account still exists');
});

Deno.test('claims that do not match the verified user: 401', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_B); // token whose sub is B...
  admin.tokens.set(jwt, USER_A); // ...but the Auth server says it is A
  assert.equal((await run(post({ confirm: 'DELETE' }, jwt))).status, 401);
  const anonRole = admin.issue(USER_A, { role: 'anon' });
  assert.equal((await run(post({ confirm: 'DELETE' }, anonRole))).status, 401);
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('a stale sign-in (11 minutes): 401 reauth_required, nothing deleted', async () => {
  const { admin, run } = setup();
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A, { amrAgoMs: 11 * 60_000 })));
  assert.equal(res.status, 401);
  assert.deepEqual(await body(res), { error: 'reauth_required' });
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('a token without amr, or with a future sign-in: reauth_required', async () => {
  const { admin, run } = setup();
  for (const amrAgoMs of [null, -5 * 60_000]) {
    const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A, { amrAgoMs })));
    assert.equal(res.status, 401);
    assert.deepEqual(await body(res), { error: 'reauth_required' });
  }
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('only POST is served; no CORS headers without the website origin', async () => {
  const { admin, run } = setup();
  for (const method of ['GET', 'OPTIONS', 'DELETE']) {
    const res = await run(post(undefined, admin.issue(USER_A), { method }));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
});

const fromOrigin = (origin: string, init: { method?: string; jwt?: string; body?: unknown } = {}) => {
  const headers: Record<string, string> = { origin, 'content-type': 'application/json' };
  if (init.jwt) headers.authorization = `Bearer ${init.jwt}`;
  if (init.method === 'OPTIONS') {
    headers['access-control-request-method'] = 'POST';
    headers['access-control-request-headers'] = 'authorization, apikey, content-type, x-client-info';
  }
  return new Request('http://localhost/fn', {
    method: init.method ?? 'POST',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
};

Deno.test('CORS: a preflight from https://kaisip.com is 204 with that exact origin, and nothing else is', async () => {
  const { admin, run } = setup();
  const ok = await run(fromOrigin(WEB_ORIGIN, { method: 'OPTIONS' }));
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://kaisip.com');
  assert.equal(ok.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assert.equal(ok.headers.get('access-control-allow-headers'), 'authorization, apikey, content-type, x-client-info');
  assert.equal(ok.headers.get('access-control-allow-credentials'), null);
  assert.match(ok.headers.get('vary') ?? '', /Origin/);
  for (
    const other of [
      'https://www.kaisip.com',
      'http://kaisip.com',
      'https://kaisip.com.evil.example',
      'https://evil.example',
      'null',
      'https://KAISIP.com',
    ]
  ) {
    const res = await run(fromOrigin(other, { method: 'OPTIONS' }));
    assert.equal(res.status, 405, other);
    assert.equal(res.headers.get('access-control-allow-origin'), null, other);
    const call = await run(fromOrigin(other, { jwt: admin.issue(USER_A), body: { confirm: 'nope' } }));
    assert.equal(call.headers.get('access-control-allow-origin'), null, other);
  }
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('CORS: the website can read every answer, refusals included', async () => {
  const { admin, run } = setup();
  const stale = await run(fromOrigin(WEB_ORIGIN, { jwt: admin.issue(USER_A, { amrAgoMs: 11 * 60_000 }), body: {} }));
  assert.equal(stale.status, 401);
  assert.equal(stale.headers.get('access-control-allow-origin'), WEB_ORIGIN);
  assert.deepEqual(await body(stale), { error: 'reauth_required' });
  const noToken = await run(fromOrigin(WEB_ORIGIN, { body: { confirm: 'DELETE' } }));
  assert.equal(noToken.status, 401);
  assert.equal(noToken.headers.get('access-control-allow-origin'), WEB_ORIGIN);
  const done = await run(fromOrigin(WEB_ORIGIN, { jwt: admin.issue(USER_A), body: { confirm: 'DELETE' } }));
  assert.equal(done.status, 200);
  assert.equal(done.headers.get('access-control-allow-origin'), WEB_ORIGIN);
  assert.equal(done.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await body(done), { deleted: true });
});

Deno.test('confirm must be exactly DELETE, as a JSON body', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  for (const b of [{}, { confirm: 'delete' }, { confirm: true }, { confirm: 'DELETE ' }]) {
    const res = await run(post(b, jwt));
    assert.equal(res.status, 400);
    assert.deepEqual(await body(res), { error: 'invalid', detail: 'confirm_required' });
  }
  assert.equal((await run(post('confirm=DELETE', jwt, { contentType: 'text/plain' }))).status, 400);
  assert.equal((await run(post('[1]', jwt))).status, 400);
  assert.equal((await run(post('{', jwt))).status, 400);
  assert.equal((await run(post({ confirm: 'DELETE', pad: 'x'.repeat(5000) }, jwt))).status, 413);
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('an Apple account without a code (Android, web): deleted anyway, the skipped revoke logged', async () => {
  const { admin, log, revoked, run } = setup();
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_B)));
  assert.equal(res.status, 200);
  assert.deepEqual(await body(res), { deleted: true });
  assert.deepEqual(revoked, [], 'nothing to revoke with');
  assert.equal(admin.users.has(USER_B), false);
  assert.ok(log.lines.some((l) => l.includes('"apple_revoke_skipped"') && l.includes('"count":1')));
});

Deno.test('a malformed Apple code: 400 apple_code_invalid, nothing deleted', async () => {
  const { admin, run } = setup();
  const bad = await run(post({ confirm: 'DELETE', appleAuthorizationCode: 'has spaces in it' }, admin.issue(USER_B)));
  assert.equal(bad.status, 400);
  assert.deepEqual(await body(bad), { error: 'invalid', detail: 'apple_code_invalid' });
  assert.equal(admin.count('deleteUser'), 0);
});

Deno.test('an Apple account: the account is deleted, then the code is revoked at Apple', async () => {
  const admin = new FakeAdmin();
  admin.addUser({ id: USER_B, email: 'b@test.invalid', providers: ['apple', 'email'] });
  const revoked: string[] = [];
  let goneAtRevoke = false;
  const apple: AppleRevoker = {
    revokeWithCode: (code) => {
      goneAtRevoke = !admin.users.has(USER_B);
      revoked.push(code);
      return Promise.resolve(true);
    },
  };
  const res = await handleDeleteAccount(
    post({ confirm: 'DELETE', appleAuthorizationCode: APPLE_CODE }, admin.issue(USER_B)),
    { admin, apple, pepper: PEPPER, now: () => NOW, log: recordingLogger() },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(revoked, [APPLE_CODE]);
  assert.equal(goneAtRevoke, true, 'deleteUser ran before the Apple revoke');
  assert.equal(admin.count('deleteUser'), 1);
  assert.equal(admin.users.has(USER_B), false);
});

Deno.test('an Apple revoke that throws is logged and does not block deletion', async () => {
  const { admin, log, run } = setup({ apple: { revokeWithCode: () => Promise.reject(new Error('apple down')) } });
  const res = await run(post({ confirm: 'DELETE', appleAuthorizationCode: APPLE_CODE }, admin.issue(USER_B)));
  assert.equal(res.status, 200);
  assert.equal(admin.users.has(USER_B), false);
  assert.ok(log.lines.some((l) => l.includes('"apple_revoke_failed"')));
});

Deno.test('a failed Apple revoke is logged as a count and does not block deletion', async () => {
  const failing: AppleRevoker = { revokeWithCode: () => Promise.resolve(false) };
  for (const apple of [failing, null]) {
    const { admin, log, run } = setup({ apple });
    const res = await run(post({ confirm: 'DELETE', appleAuthorizationCode: APPLE_CODE }, admin.issue(USER_B)));
    assert.equal(res.status, 200);
    assert.equal(admin.count('deleteUser'), 1);
    assert.ok(log.lines.some((l) => l.includes('"apple_revoke_failed"') && l.includes('"count":1')));
  }
});

Deno.test('happy path: counts, then deleteUser FIRST, then the audit row and the files', async () => {
  const { admin, run } = setup();
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.deepEqual(await body(res), { deleted: true });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(admin.count('deleteUser'), 1);
  assert.deepEqual(
    admin.calls.filter((c) => c.method !== 'getUser').map((c) => [c.method, c.userId]),
    [
      ['countBoardRows', USER_A],
      ['deleteUser', USER_A],
      ['recordDeletion', undefined],
      ['deleteUserFiles', USER_A],
    ],
  );
  assert.equal(admin.users.has(USER_B), true, 'the other learner is untouched');
});

Deno.test('the audit row holds HMAC-SHA-256(pepper, id): never the id, never a plain hash', async () => {
  const { admin, run } = setup();
  assert.equal((await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)))).status, 200);
  const expected = await deletionHash(PEPPER, USER_A);
  assert.deepEqual(admin.deletions, [{ uidHmac: expected, counts: { posts: 2, comments: 5 } }]);
  assert.match(expected, /^[0-9a-f]{64}$/);
  const plain = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(USER_A))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  assert.notEqual(expected, plain, 'not the plain SHA-256 the phone keeps');
  assert.notEqual(await deletionHash('another-pepper-of-at-least-32-characters', USER_A), expected);
});

Deno.test('no pepper configured: the account is still deleted, the audit row skipped and logged', async () => {
  const { admin, log, run } = setup({ pepper: null });
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.equal(admin.users.has(USER_A), false);
  assert.equal(admin.count('recordDeletion'), 0);
  assert.deepEqual(admin.deletions, []);
  assert.ok(log.lines.some((l) => l.includes('"audit_skipped_no_pepper"')));
});

Deno.test('board counts unreadable: deleted anyway, the audit row counts 0, logged', async () => {
  const { admin, log, run } = setup();
  admin.fail.countBoardRows = true;
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.equal(admin.users.has(USER_A), false);
  assert.deepEqual(admin.deletions.map((d) => d.counts), [{ posts: 0, comments: 0 }]);
  assert.ok(log.lines.some((l) => l.includes('"board_count_failed"')));
});

Deno.test('storage clean-up runs after the deletion, is retried once, and never blocks it', async () => {
  const flaky = setup();
  flaky.admin.failTimes.deleteUserFiles = 1;
  assert.equal((await flaky.run(post({ confirm: 'DELETE' }, flaky.admin.issue(USER_A)))).status, 200);
  assert.equal(flaky.admin.count('deleteUserFiles'), 2);
  assert.equal(flaky.log.lines.some((l) => l.includes('files_delete_failed')), false);

  const broken = setup();
  broken.admin.fail.deleteUserFiles = true;
  const res = await broken.run(post({ confirm: 'DELETE' }, broken.admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.equal(broken.admin.users.has(USER_A), false);
  assert.equal(broken.admin.count('deleteUserFiles'), 2);
  assert.ok(broken.log.lines.some((l) => l.includes('"files_delete_failed"') && l.includes('"count":1')));
});

Deno.test('a second call with the same token: 410 gone (the app treats only this as done)', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  assert.equal((await run(post({ confirm: 'DELETE' }, jwt))).status, 200);
  const again = await run(post({ confirm: 'DELETE' }, jwt));
  assert.equal(again.status, 410);
  assert.deepEqual(await body(again), { error: 'gone' });
  assert.equal(admin.count('deleteUser'), 1);
});

Deno.test('a failed audit write still reports the deletion', async () => {
  const { admin, log, run } = setup();
  admin.fail.recordDeletion = true;
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.ok(log.lines.some((l) => l.includes('audit_write_failed')));
});

Deno.test('a failed deleteUser is a bare 500, and nothing after it runs', async () => {
  const { admin, revoked, run } = setup();
  admin.fail.deleteUser = true;
  const res = await run(post({ confirm: 'DELETE', appleAuthorizationCode: APPLE_CODE }, admin.issue(USER_B)));
  assert.equal(res.status, 500);
  assert.deepEqual(await body(res), { error: 'server' });
  assert.equal(admin.deletions.length, 0);
  assert.equal(admin.count('recordDeletion'), 0);
  assert.equal(admin.count('deleteUserFiles'), 0);
  assert.deepEqual(revoked, [], 'no Apple revoke for an account that still exists');
});

Deno.test('logs carry no email, user id or token', async () => {
  const { admin, log, run } = setup();
  const jwtA = admin.issue(USER_A);
  const jwtB = admin.issue(USER_B);
  admin.fail.deleteUser = true; // 500 path
  assert.equal((await run(post({ confirm: 'DELETE' }, jwtA))).status, 500);
  admin.fail.deleteUser = false;
  admin.fail.recordDeletion = true; // audit failure path
  assert.equal((await run(post({ confirm: 'DELETE' }, jwtA))).status, 200);
  // Apple revoke failure path
  const failing = setup({ apple: { revokeWithCode: () => Promise.resolve(false) } });
  failing.admin.tokens.set(jwtB, USER_B);
  await failing.run(post({ confirm: 'DELETE', appleAuthorizationCode: APPLE_CODE }, jwtB));
  const all = [...log.lines, ...failing.log.lines].join('\n');
  assert.ok(log.lines.length >= 3);
  const hmacA = await deletionHash(PEPPER, USER_A);
  for (const secret of [USER_A, USER_B, 'a@test.invalid', 'b@test.invalid', jwtA, jwtB, APPLE_CODE, PEPPER, hmacA]) {
    assert.equal(all.includes(secret), false, `log leaked ${secret}`);
  }
});
