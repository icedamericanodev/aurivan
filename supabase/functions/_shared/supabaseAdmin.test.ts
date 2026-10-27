import { strict as assert } from 'node:assert';
import {
  decodeSnapshotRows,
  fromSignIn,
  newestAppVersion,
  providersOf,
  snapshotsToStores,
  supabaseAdmin,
  type SupabaseLike,
} from './supabaseAdmin.ts';
import { USER_A } from './testing.ts';

const HMAC = 'ab'.repeat(32);

/** A stored snapshot's columns, as a client's codec writes them. */
async function stored(value: unknown): Promise<{ encoding: string; state_gz: string; raw_bytes: number }> {
  const raw = new TextEncoder().encode(JSON.stringify(value));
  const gz = new Uint8Array(
    await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(),
  );
  let bin = '';
  for (let i = 0; i < gz.length; i += 0x8000) bin += String.fromCharCode(...gz.subarray(i, i + 0x8000));
  return { encoding: 'gzip+base64', state_gz: btoa(bin), raw_bytes: raw.byteLength };
}

type Rpc = { fn: string; args: Record<string, unknown> };

function fakeClient(opts: {
  user?: unknown;
  userError?: unknown;
  deleteError?: unknown;
  rpcResult?: { data: unknown; error: unknown };
  profile?: { data: unknown; error: unknown };
  snapshots?: { data: unknown; error: unknown };
} = {}) {
  const rpcs: Rpc[] = [];
  const queries: string[] = [];
  const deleted: string[] = [];
  const client: SupabaseLike = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: (opts.user ?? null) as never }, error: opts.userError ?? null }),
      admin: {
        deleteUser: (id) => {
          deleted.push(id);
          return Promise.resolve({ error: opts.deleteError ?? null });
        },
      },
    },
    from: (table) => ({
      select: (cols) => ({
        eq: (col, val) => {
          queries.push(`${table}:${cols}:${col}=${val}`);
          const rows = Promise.resolve(opts.snapshots ?? { data: [], error: null });
          return Object.assign(rows, {
            maybeSingle: () => Promise.resolve(opts.profile ?? { data: null, error: null }),
          });
        },
      }),
    }),
    rpc: (fn, args) => {
      rpcs.push({ fn, args });
      return Promise.resolve(opts.rpcResult ?? { data: null, error: null });
    },
  };
  return { client, rpcs, queries, deleted };
}

Deno.test('providersOf keeps known sign-in methods from metadata and identities', () => {
  assert.deepEqual(
    providersOf({ id: USER_A, app_metadata: { provider: 'email', providers: ['email', 'apple', 'github'] } }),
    ['email', 'apple'],
  );
  assert.deepEqual(providersOf({ id: USER_A, identities: [{ provider: 'google' }] }), ['google']);
  assert.deepEqual(providersOf({ id: USER_A }), []);
});

Deno.test('getUser maps the Auth user; tells a deleted account from a bad token from a failure', async () => {
  const ok = fakeClient({
    user: {
      id: USER_A,
      email: 'a@test.invalid',
      created_at: '2026-10-01T00:00:00Z',
      last_sign_in_at: '2026-11-02T11:59:00Z',
      app_metadata: { providers: ['email', 'google'] },
      user_metadata: { full_name: 'Ana Reyes', avatar_url: 'https://lh3.googleusercontent.com/a/x', iss: 'x' },
    },
  });
  assert.deepEqual(await supabaseAdmin(ok.client).getUser('jwt'), {
    id: USER_A,
    email: 'a@test.invalid',
    createdAt: '2026-10-01T00:00:00Z',
    providers: ['email', 'google'],
    lastSignInAt: '2026-11-02T11:59:00Z',
    nameFromSignIn: 'Ana Reyes',
    pictureFromSignIn: 'https://lh3.googleusercontent.com/a/x',
  });
  const relay = fakeClient({ user: { id: USER_A, email: '' } });
  const relayUser = await supabaseAdmin(relay.client).getUser('jwt');
  assert.ok(typeof relayUser === 'object');
  assert.equal(relayUser.email, null);
  // supabase-js AuthApiError shapes (status + GoTrue code).
  const gone = fakeClient({
    userError: { status: 403, code: 'user_not_found', message: 'User from sub claim in JWT does not exist' },
  });
  assert.equal(await supabaseAdmin(gone.client).getUser('jwt'), 'gone');
  for (
    const err of [
      { status: 403, code: 'bad_jwt' },
      { status: 403, code: 'session_not_found' },
      { status: 401, code: 'no_authorization' },
      { status: 400, name: 'AuthSessionMissingError' },
    ]
  ) {
    assert.equal(await supabaseAdmin(fakeClient({ userError: err }).client).getUser('jwt'), 'invalid');
  }
  assert.equal(await supabaseAdmin(fakeClient().client).getUser('jwt'), 'invalid');
  // Network or a 5xx (AuthRetryableFetchError), or an error with no status: we can't tell, so it throws
  // (a 500 to the app), with no message from the error.
  for (
    const err of [
      { status: 0, name: 'AuthRetryableFetchError', message: 'fetch failed a@test.invalid' },
      { status: 503, name: 'AuthRetryableFetchError', message: 'upstream a@test.invalid' },
      { message: 'unknown a@test.invalid' },
    ]
  ) {
    await assert.rejects(
      () => supabaseAdmin(fakeClient({ userError: err }).client).getUser('jwt'),
      (e: unknown) => e instanceof Error && !e.message.includes('a@test.invalid'),
    );
  }
});

Deno.test('server-only calls go through the svc_ functions with the verified id', async () => {
  const f = fakeClient({ rpcResult: { data: true, error: null } });
  const admin = supabaseAdmin(f.client);
  assert.equal(await admin.claimExport(USER_A), true);
  await admin.recordDeletion(HMAC, { posts: 1, comments: 2 });
  assert.deepEqual(f.rpcs, [
    { fn: 'svc_claim_export', args: { p_user: USER_A } },
    // The audit gets the keyed hash only: the user id never reaches this call.
    { fn: 'svc_record_deletion', args: { p_uid_hmac: HMAC, p_board_posts: 1, p_board_comments: 2 } },
  ]);
  // Anything but 64 lowercase hex characters (a raw id, say) is refused before the call.
  for (const bad of [USER_A, HMAC.toUpperCase(), 'ab', '']) {
    await assert.rejects(() => admin.recordDeletion(bad, { posts: 0, comments: 0 }));
  }
  assert.equal(f.rpcs.length, 2);
  const refused = fakeClient({ rpcResult: { data: false, error: null } });
  assert.equal(await supabaseAdmin(refused.client).claimExport(USER_A), false);
});

Deno.test('getProfile reads the caller’s own profile row', async () => {
  const f = fakeClient({
    profile: {
      data: { terms_version: '2026-11', age_confirmed: true, created_at: '2026-10-01T00:05:00Z' },
      error: null,
    },
  });
  assert.deepEqual(await supabaseAdmin(f.client).getProfile(USER_A), {
    termsVersion: '2026-11',
    ageConfirmed: true,
    createdAt: '2026-10-01T00:05:00Z',
  });
  assert.deepEqual(f.queries, [`profiles:terms_version, age_confirmed, created_at:id=${USER_A}`]);
  assert.equal(await supabaseAdmin(fakeClient().client).getProfile(USER_A), null);
});

Deno.test('exportDue and readCheckpoint go through the svc_ functions; the checkpoint is unzipped safely', async () => {
  const due = fakeClient({ rpcResult: { data: true, error: null } });
  assert.equal(await supabaseAdmin(due.client).exportDue(USER_A), true);
  assert.deepEqual(due.rpcs, [{ fn: 'svc_export_due', args: { p_user: USER_A } }]);
  assert.equal(
    await supabaseAdmin(fakeClient({ rpcResult: { data: false, error: null } }).client).exportDue(USER_A),
    false,
  );

  const row = { rev: 7, app_version: '1.47.0', taken_at: '2026-11-01T00:00:00Z', ...await stored({ byCert: {} }) };
  const cp = fakeClient({ rpcResult: { data: [row], error: null } });
  assert.deepEqual(await supabaseAdmin(cp.client).readCheckpoint(USER_A), {
    takenAt: '2026-11-01T00:00:00Z',
    rev: 7,
    appVersion: '1.47.0',
    state: { byCert: {} },
  });
  assert.deepEqual(cp.rpcs, [{ fn: 'svc_sync_checkpoint', args: { p_user: USER_A } }]);
  const bomb = fakeClient({ rpcResult: { data: [{ ...row, raw_bytes: 3 }], error: null } });
  assert.deepEqual(await supabaseAdmin(bomb.client).readCheckpoint(USER_A), {
    takenAt: '2026-11-01T00:00:00Z',
    rev: 7,
    appVersion: '1.47.0',
    unreadable: 'too_big',
  });
  assert.equal(
    await supabaseAdmin(fakeClient({ rpcResult: { data: [], error: null } }).client).readCheckpoint(USER_A),
    null,
  );
});

Deno.test('fromSignIn keeps a short name and an https picture link only', () => {
  assert.deepEqual(fromSignIn({ full_name: 'Ana Reyes', avatar_url: 'https://lh3.googleusercontent.com/a/x' }), {
    name: 'Ana Reyes',
    picture: 'https://lh3.googleusercontent.com/a/x',
  });
  assert.deepEqual(fromSignIn({ name: 'Ana', picture: 'javascript:alert(1)' }), { name: 'Ana', picture: null });
  assert.deepEqual(fromSignIn({ full_name: 'x'.repeat(201), avatar_url: 7 }), { name: null, picture: null });
  assert.deepEqual(fromSignIn(null), { name: null, picture: null });
});

Deno.test('a failed call throws without the database message', async () => {
  const secret = 'permission denied for table export_log user 0000 a@test.invalid';
  const f = fakeClient({
    rpcResult: { data: null, error: { message: secret } },
    deleteError: { message: secret },
    profile: { data: null, error: { message: secret } },
  });
  const admin = supabaseAdmin(f.client);
  for (
    const call of [
      () => admin.claimExport(USER_A),
      () => admin.recordDeletion(HMAC, { posts: 0, comments: 0 }),
      () => admin.deleteUser(USER_A),
      () => admin.getProfile(USER_A),
      () => admin.exportDue(USER_A),
      () => admin.readCheckpoint(USER_A),
    ]
  ) {
    await assert.rejects(call, (e: unknown) => e instanceof Error && !e.message.includes(secret));
  }
});

Deno.test('board counts and the board export (Phase 8) come from the svc_ functions, own id only', async () => {
  const f = fakeClient({ rpcResult: { data: { posts: 3, comments: 4 }, error: null } });
  const admin = supabaseAdmin(f.client);
  assert.deepEqual(await admin.countBoardRows(USER_A), { posts: 3, comments: 4 });
  const rows = fakeClient({ rpcResult: { data: { member: { handle: 'Quiet Cedar 214' }, posts: [] }, error: null } });
  assert.deepEqual(await supabaseAdmin(rows.client).readBoard(USER_A), {
    member: { handle: 'Quiet Cedar 214' },
    posts: [],
  });
  assert.deepEqual([...f.rpcs, ...rows.rpcs], [
    { fn: 'svc_board_counts', args: { p_user: USER_A } },
    { fn: 'svc_board_export', args: { p_user: USER_A } },
  ]);
  // Odd answers read as nothing, never as a crash or a negative count.
  assert.deepEqual(
    await supabaseAdmin(fakeClient({ rpcResult: { data: { posts: -1 }, error: null } }).client).countBoardRows(USER_A),
    {
      posts: 0,
      comments: 0,
    },
  );
  assert.deepEqual(
    await supabaseAdmin(fakeClient({ rpcResult: { data: [1], error: null } }).client).readBoard(USER_A),
    {},
  );
  const failing = supabaseAdmin(
    fakeClient({ rpcResult: { data: null, error: { message: 'relation board_posts a@test.invalid' } } }).client,
  );
  await assert.rejects(
    () => failing.readBoard(USER_A),
    (e: unknown) => e instanceof Error && !e.message.includes('a@test.invalid'),
  );
  await assert.rejects(
    () => failing.countBoardRows(USER_A),
    (e: unknown) => e instanceof Error && !e.message.includes('a@test.invalid'),
  );
});

Deno.test('no storage bucket yet: deleting files is a no-op', async () => {
  await supabaseAdmin(fakeClient().client).deleteUserFiles(USER_A);
});

Deno.test('readSnapshots (Phase 7): the caller’s own rows, unzipped, as backup-file stores', async () => {
  const { client, queries } = fakeClient({
    snapshots: {
      data: [
        {
          store: 'progress',
          store_version: 1,
          app_version: '1.18.0',
          device_id: '22222222-2222-4222-8222-222222222222',
          rev: 1761500000000,
          updated_at: '2026-11-01T10:00:00Z',
          ...await stored({ byCert: {}, changedAt: {} }),
        },
        { store: 'settings', store_version: 1, app_version: '1.9.2', ...await stored({ activeCertId: 'cisa' }) },
        { store: 'notes', store_version: 1, app_version: 'x', ...await stored({}) },
      ],
      error: null,
    },
  });
  const admin = supabaseAdmin(client);
  assert.deepEqual(await admin.readSnapshots(USER_A), {
    stores: {
      // The two fields a backup file needs and a snapshot never holds are added, so the file restores.
      progress: { version: 1, state: { today: { day: '', answered: 0 }, byCert: {}, changedAt: {} } },
      settings: { version: 1, state: { onboarded: true, activeCertId: 'cisa' } },
    },
    // The newest app that wrote a row (1.18.0 is newer than 1.9.2: compared as numbers, not text).
    appVersion: '1.18.0',
    // Each row's own columns, for the export (never the state).
    rows: {
      progress: {
        rev: 1761500000000,
        deviceId: '22222222-2222-4222-8222-222222222222',
        updatedAt: '2026-11-01T10:00:00Z',
        appVersion: '1.18.0',
        storeVersion: 1,
      },
      settings: { rev: null, deviceId: null, updatedAt: null, appVersion: '1.9.2', storeVersion: 1 },
    },
    unreadable: [],
  });
  assert.deepEqual(queries, [
    `sync_snapshots:store, store_version, app_version, device_id, rev, updated_at, encoding, state_gz, raw_bytes:user_id=${USER_A}`,
  ]);
  // No rows: an empty `stores` and no version, never an error.
  assert.deepEqual(await supabaseAdmin(fakeClient().client).readSnapshots(USER_A), {
    stores: {},
    appVersion: null,
    rows: {},
    unreadable: [],
  });
  // A database error throws without its message.
  const failing = supabaseAdmin(
    fakeClient({ snapshots: { data: null, error: { message: `relation for ${USER_A}` } } }).client,
  );
  await assert.rejects(
    () => failing.readSnapshots(USER_A),
    (e: unknown) => e instanceof Error && !e.message.includes(USER_A),
  );
});

Deno.test('readSnapshots: an unsafe snapshot (bomb, damage, unknown encoding) is named and left out', async () => {
  const bomb = await stored({ x: 'a'.repeat(3_000_000) });
  const fine = await stored({ activeCertId: 'cisa' });
  const { client } = fakeClient({
    snapshots: {
      data: [
        { store: 'progress', store_version: 1, app_version: '9.0.0', ...bomb, raw_bytes: 13 },
        { store: 'settings', store_version: 1, app_version: '1.9.2', ...fine },
      ],
      error: null,
    },
  });
  assert.deepEqual(await supabaseAdmin(client).readSnapshots(USER_A), {
    stores: { settings: { version: 1, state: { onboarded: true, activeCertId: 'cisa' } } },
    // The unreadable store's version doesn't count: it is not in the file.
    appVersion: '1.9.2',
    // An unreadable store's row is still described (its rev and time are the learner's data too).
    rows: {
      progress: { rev: null, deviceId: null, updatedAt: null, appVersion: '9.0.0', storeVersion: 1 },
      settings: { rev: null, deviceId: null, updatedAt: null, appVersion: '1.9.2', storeVersion: 1 },
    },
    unreadable: [{ store: 'progress', reason: 'too_big' }],
  });
  const odd = await decodeSnapshotRows([
    { store: 'progress', store_version: 1, app_version: '1.0.0', ...fine, encoding: 'zstd' },
    { store: 'settings', store_version: 1, app_version: '1.0.0', ...fine, raw_bytes: fine.raw_bytes + 1 },
    { store: 'progress', store_version: 1, app_version: '1.0.0', ...await stored([1, 2]) },
  ]);
  assert.deepEqual(odd, {
    rows: [],
    unreadable: [
      { store: 'progress', reason: 'unknown_encoding' },
      { store: 'settings', reason: 'size_mismatch' },
      { store: 'progress', reason: 'bad_json' },
    ],
  });
});

Deno.test('snapshotsToStores skips anything malformed', () => {
  assert.deepEqual(snapshotsToStores(null), {});
  assert.deepEqual(
    snapshotsToStores([{ store: 'progress', store_version: 1, state: [1] }, {
      store: 'progress',
      store_version: 1,
      state: null,
    }]),
    {},
  );
});

Deno.test('newestAppVersion: the highest well-formed version, by number', () => {
  assert.equal(newestAppVersion(null), null);
  assert.equal(newestAppVersion([]), null);
  assert.equal(newestAppVersion([{ app_version: 'v1' }, {}]), null);
  assert.equal(
    newestAppVersion([{ app_version: '1.9.9' }, { app_version: '1.10.0' }, { app_version: '1.10.0<x>' }]),
    '1.10.0',
  );
  assert.equal(newestAppVersion([{ app_version: '2.0.0' }, { app_version: '1.99.99' }]), '2.0.0');
});
