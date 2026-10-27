import { strict as assert } from 'node:assert';
import { WEB_ORIGIN } from '../_shared/http.ts';
import { FakeAdmin, NOW, post, recordingLogger, USER_A, USER_B } from '../_shared/testing.ts';
import { handleExportMyData } from './handler.ts';

const HOUR = 60 * 60 * 1000;

function setup() {
  const admin = new FakeAdmin();
  admin.addUser({
    id: USER_A,
    email: 'a@test.invalid',
    providers: ['email', 'google'],
    termsVersion: '2026-11',
    snapshots: { progress: { mine: 'a-progress' } },
    boardRows: { member: { handle: 'Quiet Cedar 214' }, posts: [{ title: 'More practice on BCP' }] },
  });
  admin.addUser({
    id: USER_B,
    email: 'b-secret@test.invalid',
    providers: ['apple'],
    termsVersion: '2099-12',
    createdAt: '2020-01-01T00:00:00.000Z',
    snapshots: { progress: { theirs: 'b-private-progress' }, settings: { name: 'b-private-settings' } },
    boardRows: { member: { handle: 'Steady Oak 9' }, posts: [{ title: 'b-private-post' }] },
  });
  const log = recordingLogger();
  let now = NOW;
  const run = (req: Request) => handleExportMyData(req, { admin, now: () => now, log });
  const advance = (ms: number) => {
    now += ms;
    admin.now = now;
  };
  return { admin, log, run, advance };
}

Deno.test('no JWT: 401', async () => {
  const { admin, run } = setup();
  const res = await run(post({}));
  assert.equal(res.status, 401);
  assert.equal(admin.count('claimExport'), 0);
});

Deno.test('no recent sign-in needed: a day-old sign-in exports, then the hourly limit applies', async () => {
  const { admin, run } = setup();
  const res = await run(post({}, admin.issue(USER_A, { amrAgoMs: 24 * HOUR })));
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { app: string }).app, 'kaisip');
  const again = await run(post({}, admin.issue(USER_A, { amrAgoMs: null })));
  assert.equal(again.status, 429);
});

Deno.test('a deleted account: 410 gone; a revoked token: 401; the Auth server down: 500', async () => {
  const { admin, run } = setup();
  const jwt = admin.issue(USER_A);
  admin.deleted.add(USER_A);
  assert.equal((await run(post({}, jwt))).status, 410);
  const revoked = admin.issue(USER_B);
  admin.tokens.delete(revoked);
  assert.equal((await run(post({}, revoked))).status, 401);
  admin.fail.getUser = true;
  assert.equal((await run(post({}, admin.issue(USER_B)))).status, 500);
  assert.equal(admin.count('claimExport'), 0);
});

Deno.test('the hourly slot is claimed last, after the reply is built', async () => {
  const { admin, run } = setup();
  assert.equal((await run(post({}, admin.issue(USER_A)))).status, 200);
  const methods = admin.calls.map((c) => c.method);
  assert.equal(methods[methods.length - 1], 'claimExport');
});

Deno.test('a streamed body over the cap (no content-length) is refused before it is read in full', async () => {
  const { admin, run } = setup();
  let pulled = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      pulled += 1;
      if (pulled > 1000) return c.close();
      c.enqueue(new Uint8Array(512).fill(32));
    },
  });
  const req = new Request('http://localhost/fn', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${admin.issue(USER_A)}` },
    body: stream,
  });
  assert.equal(req.headers.get('content-length'), null);
  const res = await run(req);
  assert.equal(res.status, 413);
  assert.ok(pulled < 10, `read ${pulled} chunks before stopping`);
  assert.equal(admin.count('claimExport'), 0);
});

Deno.test('happy path: the learner’s own account data, as a no-store JSON download', async () => {
  const { admin, run } = setup();
  const res = await run(post({ appVersion: '1.17.0' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
  assert.match(res.headers.get('content-disposition') ?? '', /attachment/);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await res.json(), {
    app: 'kaisip',
    schema: 1,
    exportedAt: new Date(NOW).toISOString(),
    appVersion: '1.17.0',
    stores: { progress: { mine: 'a-progress' } },
    account: {
      email: 'a@test.invalid',
      providers: ['email', 'google'],
      createdAt: '2026-10-01T00:00:00.000Z',
      lastSignInAt: '2026-11-02T11:59:00.000Z',
      termsVersion: '2026-11',
      ageConfirmed: true,
      profileCreatedAt: '2026-10-01T00:05:00.000Z',
      nameFromSignIn: null,
      pictureFromSignIn: null,
    },
    sync: {},
    supportCopy: null,
    board: { member: { handle: 'Quiet Cedar 214' }, posts: [{ title: 'More practice on BCP' }] },
  });
});

Deno.test('an empty body works; a bad appVersion reads as null', async () => {
  const { admin, run, advance } = setup();
  const first = await run(post(undefined, admin.issue(USER_A)));
  assert.equal(first.status, 200);
  assert.equal((await first.json() as { appVersion: unknown }).appVersion, null);
  advance(HOUR);
  const second = await run(post({ appVersion: '1.17.0<script>' }, admin.issue(USER_A)));
  assert.equal(second.status, 200);
  assert.equal((await second.json() as { appVersion: unknown }).appVersion, null);
});

Deno.test('at most one export an hour: 429 with Retry-After, then allowed again', async () => {
  const { admin, run, advance } = setup();
  assert.equal((await run(post({}, admin.issue(USER_A)))).status, 200);
  advance(30 * 60_000);
  const limited = await run(post({}, admin.issue(USER_A)));
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: 'rate_limited' });
  assert.equal(limited.headers.get('retry-after'), '3600');
  advance(30 * 60_000);
  assert.equal((await run(post({}, admin.issue(USER_A)))).status, 200);
  // B's limit is separate from A's.
  assert.equal((await run(post({}, admin.issue(USER_B)))).status, 200);
});

Deno.test('the export holds no other learner’s data', async () => {
  const { admin, run } = setup();
  const res = await run(post({}, admin.issue(USER_A)));
  const text = await res.text();
  for (
    const theirs of [
      USER_B,
      'b-secret@test.invalid',
      '2099-12',
      '2020-01-01',
      'b-private-progress',
      'b-private-settings',
      'Steady Oak 9',
      'b-private-post',
      'apple',
    ]
  ) {
    assert.equal(text.includes(theirs), false, `export leaked ${theirs}`);
  }
  for (const c of admin.calls.filter((c) => c.userId !== undefined)) assert.equal(c.userId, USER_A);
});

Deno.test('a failed build is a bare 500 and does not use up the hour', async () => {
  const { admin, run } = setup();
  admin.fail.getProfile = true;
  const res = await run(post({}, admin.issue(USER_A)));
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'server' });
  assert.equal(admin.count('claimExport'), 0);
  admin.fail.getProfile = false;
  assert.equal((await run(post({}, admin.issue(USER_A)))).status, 200);
});

Deno.test('only POST; oversized bodies refused; logs carry no PII', async () => {
  const { admin, log, run } = setup();
  const jwt = admin.issue(USER_A);
  assert.equal((await run(post(undefined, jwt, { method: 'GET' }))).status, 405);
  assert.equal((await run(post({ pad: 'x'.repeat(2000) }, jwt))).status, 413);
  assert.equal((await run(post({}, jwt))).status, 200);
  const all = log.lines.join('\n');
  for (const secret of [USER_A, 'a@test.invalid', jwt]) assert.equal(all.includes(secret), false);
});

Deno.test('appVersion: the newest app that wrote a synced store wins over the asking app (a newer store restores as "update the app")', async () => {
  const { admin, run } = setup();
  admin.users.get(USER_A)!.snapshotsApp = '1.19.0';
  const res = await run(post({ appVersion: '1.18.0' }, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.equal((await res.json() as { appVersion: unknown }).appVersion, '1.19.0');
});

Deno.test('an unreadable synced store (a gzip bomb, damage) is left out and named; the rest still downloads', async () => {
  const { admin, log, run } = setup();
  const a = admin.users.get(USER_A)!;
  a.snapshots = { settings: { version: 1, state: { activeCertId: 'cisa' } } };
  a.unreadable = [{ store: 'progress', reason: 'too_big' }];
  const res = await run(post({}, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  const doc = await res.json() as Record<string, unknown>;
  assert.deepEqual(doc.stores, { settings: { version: 1, state: { activeCertId: 'cisa' } } });
  assert.deepEqual(doc.unreadableStores, [{ store: 'progress', reason: 'too_big' }]);
  assert.ok(log.lines.some((l) => l.includes('"snapshot_unreadable"') && l.includes('"count":1')));
  // Every store fine: no unreadableStores key at all.
  const { admin: clean, run: runClean } = setup();
  const ok = await (await runClean(post({}, clean.issue(USER_A)))).json() as Record<string, unknown>;
  assert.equal('unreadableStores' in ok, false);
});

Deno.test('CORS: the website (exactly https://kaisip.com) can download; other origins get no CORS header', async () => {
  const { admin, run } = setup();
  const pre = await run(
    new Request('http://localhost/fn', {
      method: 'OPTIONS',
      headers: { origin: WEB_ORIGIN, 'access-control-request-method': 'POST' },
    }),
  );
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), WEB_ORIGIN);
  const res = await run(
    new Request('http://localhost/fn', {
      method: 'POST',
      headers: {
        origin: WEB_ORIGIN,
        'content-type': 'application/json',
        authorization: `Bearer ${admin.issue(USER_A)}`,
      },
      body: '{}',
    }),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), WEB_ORIGIN);
  // The website may read the file name and, on a 429, Retry-After.
  assert.match(res.headers.get('access-control-expose-headers') ?? '', /retry-after/);
  assert.match(res.headers.get('access-control-expose-headers') ?? '', /content-disposition/);
  const limited = await run(
    new Request('http://localhost/fn', {
      method: 'POST',
      headers: {
        origin: WEB_ORIGIN,
        'content-type': 'application/json',
        authorization: `Bearer ${admin.issue(USER_A)}`,
      },
      body: '{}',
    }),
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('access-control-allow-origin'), WEB_ORIGIN);
  for (const other of ['https://www.kaisip.com', 'https://evil.example', 'null']) {
    const r = await run(
      new Request('http://localhost/fn', { method: 'OPTIONS', headers: { origin: other } }),
    );
    assert.equal(r.status, 405, other);
    assert.equal(r.headers.get('access-control-allow-origin'), null, other);
  }
});

Deno.test("everything else we keep is in the file: the sign-in provider's name and picture, each row, the support copy", async () => {
  const { admin, run } = setup();
  const a = admin.users.get(USER_A)!;
  a.nameFromSignIn = 'Ana Reyes';
  a.pictureFromSignIn = 'https://lh3.googleusercontent.com/a/x';
  a.syncRows = {
    progress: {
      rev: 1761500000000,
      deviceId: '22222222-2222-4222-8222-222222222222',
      updatedAt: '2026-11-01T10:00:00Z',
      appVersion: '1.47.0',
      storeVersion: 1,
    },
  };
  a.checkpoint = { takenAt: '2026-11-01T00:00:00Z', rev: 1761400000000, appVersion: '1.47.0', state: { byCert: {} } };
  const doc = await (await run(post({}, admin.issue(USER_A)))).json() as Record<string, Record<string, unknown>>;
  assert.equal(doc.account.nameFromSignIn, 'Ana Reyes');
  assert.equal(doc.account.pictureFromSignIn, 'https://lh3.googleusercontent.com/a/x');
  assert.deepEqual(doc.sync, a.syncRows);
  assert.deepEqual(doc.supportCopy, a.checkpoint);
});

Deno.test('an unreadable support copy is named, never half-read, and logged', async () => {
  const { admin, log, run } = setup();
  admin.users.get(USER_A)!.checkpoint = { takenAt: null, rev: 1, appVersion: '1.47.0', unreadable: 'too_big' };
  const res = await run(post({}, admin.issue(USER_A)));
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json() as { supportCopy: unknown }).supportCopy, {
    takenAt: null,
    rev: 1,
    appVersion: '1.47.0',
    unreadable: 'too_big',
  });
  assert.ok(log.lines.some((l) => l.includes('"snapshot_unreadable"')));
});

Deno.test('over the hourly limit: 429 from the cheap check, before any data is read', async () => {
  const { admin, run } = setup();
  assert.equal((await run(post({}, admin.issue(USER_A)))).status, 200);
  admin.calls = [];
  const res = await run(post({}, admin.issue(USER_A)));
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), '3600');
  assert.deepEqual(admin.calls.map((c) => c.method), ['getUser', 'exportDue']);
});
