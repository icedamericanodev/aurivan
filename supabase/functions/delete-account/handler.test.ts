import { strict as assert } from 'node:assert';
import type { AppleRevoker } from '../_shared/apple.ts';
import { FakeAdmin, NOW, post, recordingLogger, USER_A, USER_B } from '../_shared/testing.ts';
import { handleDeleteAccount } from './handler.ts';

const APPLE_CODE = 'c1a2b3c4d5e6f7.0.abcd.Ef_12-34';

function setup(opts: { apple?: AppleRevoker | null } = {}) {
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
  const run = (req: Request) => handleDeleteAccount(req, { admin, apple, now: () => NOW, log });
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

Deno.test('the Auth server failing reads as 401, never as success', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  admin.fail.getUser = true;
  assert.equal((await run(post({ confirm: 'DELETE' }, jwt))).status, 401);
  assert.equal(admin.count('deleteUser'), 0);
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

Deno.test('only POST is served, with no CORS headers', async () => {
  const { admin, run } = setup();
  for (const method of ['GET', 'OPTIONS', 'DELETE']) {
    const res = await run(post(undefined, admin.issue(USER_A), { method }));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
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

Deno.test('an Apple account without an authorization code: 400, nothing deleted', async () => {
  const { admin, run } = setup();
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_B)));
  assert.equal(res.status, 400);
  assert.deepEqual(await body(res), { error: 'invalid', detail: 'apple_code_required' });
  assert.equal(admin.count('deleteUser'), 0);
  const bad = await run(post({ confirm: 'DELETE', appleAuthorizationCode: 'has spaces in it' }, admin.issue(USER_B)));
  assert.equal(bad.status, 400);
});

Deno.test('an Apple account: the code is revoked at Apple, then the account is deleted', async () => {
  const { admin, revoked, run } = setup();
  const res = await run(post({ confirm: 'DELETE', appleAuthorizationCode: APPLE_CODE }, admin.issue(USER_B)));
  assert.equal(res.status, 200);
  assert.deepEqual(revoked, [APPLE_CODE]);
  assert.equal(admin.count('deleteUser'), 1);
  assert.equal(admin.users.has(USER_B), false);
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

Deno.test('happy path: deleteUser exactly once, in order, with the audit row', async () => {
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
      ['deleteUserFiles', USER_A],
      ['deleteUser', USER_A],
      ['recordDeletion', USER_A],
    ],
  );
  assert.deepEqual(admin.deletions, [{ userId: USER_A, counts: { posts: 2, comments: 5 } }]);
  assert.equal(admin.users.has(USER_B), true, 'the other learner is untouched');
});

Deno.test('a second call with the same token: 401 (the app treats it as done)', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  assert.equal((await run(post({ confirm: 'DELETE' }, jwt))).status, 200);
  const again = await run(post({ confirm: 'DELETE' }, jwt));
  assert.equal(again.status, 401);
  assert.equal(admin.count('deleteUser'), 1);
});

Deno.test('a failed audit write still reports the deletion', async () => {
  const { admin, log, run } = setup();
  admin.fail.recordDeletion = true;
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.ok(log.lines.some((l) => l.includes('audit_write_failed')));
});

Deno.test('a failed deleteUser is a bare 500: no database text reaches the app', async () => {
  const { admin, run } = setup();
  admin.fail.deleteUser = true;
  const res = await run(post({ confirm: 'DELETE' }, admin.issue(USER_A)));
  assert.equal(res.status, 500);
  assert.deepEqual(await body(res), { error: 'server' });
  assert.equal(admin.deletions.length, 0);
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
  for (const secret of [USER_A, USER_B, 'a@test.invalid', 'b@test.invalid', jwtA, jwtB, APPLE_CODE]) {
    assert.equal(all.includes(secret), false, `log leaked ${secret}`);
  }
});
