import { strict as assert } from 'node:assert';
import { providersOf, supabaseAdmin, type SupabaseLike } from './supabaseAdmin.ts';
import { USER_A } from './testing.ts';

type Rpc = { fn: string; args: Record<string, unknown> };

function fakeClient(opts: {
  user?: unknown;
  userError?: unknown;
  deleteError?: unknown;
  rpcResult?: { data: unknown; error: unknown };
  profile?: { data: unknown; error: unknown };
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
          return { maybeSingle: () => Promise.resolve(opts.profile ?? { data: null, error: null }) };
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
      app_metadata: { providers: ['email'] },
    },
  });
  assert.deepEqual(await supabaseAdmin(ok.client).getUser('jwt'), {
    id: USER_A,
    email: 'a@test.invalid',
    createdAt: '2026-10-01T00:00:00Z',
    providers: ['email'],
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
  await admin.recordDeletion(USER_A, { posts: 1, comments: 2 });
  assert.deepEqual(f.rpcs, [
    { fn: 'svc_claim_export', args: { p_user: USER_A } },
    { fn: 'svc_record_deletion', args: { p_user: USER_A, p_board_posts: 1, p_board_comments: 2 } },
  ]);
  const refused = fakeClient({ rpcResult: { data: false, error: null } });
  assert.equal(await supabaseAdmin(refused.client).claimExport(USER_A), false);
});

Deno.test('getTermsVersion reads the caller’s own profile row', async () => {
  const f = fakeClient({ profile: { data: { terms_version: '2026-11' }, error: null } });
  assert.equal(await supabaseAdmin(f.client).getTermsVersion(USER_A), '2026-11');
  assert.deepEqual(f.queries, [`profiles:terms_version:id=${USER_A}`]);
  assert.equal(await supabaseAdmin(fakeClient().client).getTermsVersion(USER_A), null);
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
      () => admin.recordDeletion(USER_A, { posts: 0, comments: 0 }),
      () => admin.deleteUser(USER_A),
      () => admin.getTermsVersion(USER_A),
    ]
  ) {
    await assert.rejects(call, (e: unknown) => e instanceof Error && !e.message.includes(secret));
  }
});

Deno.test('Phase 6 stubs: no board rows, no files, no snapshots yet', async () => {
  const admin = supabaseAdmin(fakeClient().client);
  assert.deepEqual(await admin.countBoardRows(USER_A), { posts: 0, comments: 0 });
  assert.deepEqual(await admin.readSnapshots(USER_A), {});
  await admin.deleteUserFiles(USER_A);
});
