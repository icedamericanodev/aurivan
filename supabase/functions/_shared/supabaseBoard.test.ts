import { strict as assert } from 'node:assert';
import { BoardDbError } from './board.ts';
import { testFingerprint } from './boardTesting.ts';
import { leakMatch } from './leakGuard.ts';
import { decodeLeakprint, encodeLeakprint } from './leakprint.ts';
import { boardDbCode, type RpcLike, supabaseBoard } from './supabaseBoard.ts';
import { USER_A } from './testing.ts';

function client(result: { data: unknown; error: unknown }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const c: RpcLike = {
    rpc: (fn, args) => {
      calls.push({ fn, args });
      return Promise.resolve(result);
    },
  };
  return { c, calls };
}

Deno.test('the SQL’s words map to codes; any other database message is just "server"', () => {
  assert.equal(boardDbCode({ code: '42501', message: 'forbidden' }), 'forbidden');
  assert.equal(boardDbCode({ code: '42501', message: 'permission denied for table board_posts' }), 'forbidden');
  for (const w of ['rate_limited', 'posting_paused', 'banned', 'guidelines']) {
    assert.equal(boardDbCode({ code: 'P0001', message: w }), w);
  }
  assert.equal(boardDbCode({ code: 'P0001', message: 'something with a@test.invalid' }), 'server');
  assert.equal(boardDbCode({ code: '22023', message: 'reserved_handle' }), 'handle_reserved');
  assert.equal(
    boardDbCode({ code: '23505', message: 'duplicate key value violates unique constraint' }),
    'handle_taken',
  );
  assert.equal(boardDbCode({ code: '23514' }), 'invalid');
  assert.equal(boardDbCode({ code: 'P0002', message: 'not_found' }), 'not_found');
  assert.equal(boardDbCode({ message: 'fetch failed' }), 'server');
  assert.equal(boardDbCode(null), 'server');
});

Deno.test('calls go to the svc_ functions with the verified id, and errors carry no message', async () => {
  const ok = client({ data: { id: 'p1', visibility: 'pending', holdReason: 'recall' }, error: null });
  const out = await supabaseBoard(ok.c).write({
    userId: USER_A,
    op: 'post',
    target: null,
    kind: 'idea',
    title: 'A long enough title',
    body: '',
    itemRef: null,
    parentId: null,
    hold: 'recall',
    cert: 'cisa',
    clientId: '40000000-0000-4000-8000-000000000001',
    spoiler: true,
  });
  assert.deepEqual(out, { id: 'p1', visibility: 'pending', holdReason: 'recall' });
  assert.equal(ok.calls[0].fn, 'svc_board_write');
  assert.equal(ok.calls[0].args.p_user, USER_A);
  // The draft's id and the fold reach the SQL (QA BUG-1, CR N12).
  assert.equal(ok.calls[0].args.p_client, '40000000-0000-4000-8000-000000000001');
  assert.equal(ok.calls[0].args.p_spoiler, true);
  // A write attempt is counted by its own svc_ function (SEC S6).
  const counted = client({ data: null, error: null });
  await supabaseBoard(counted.c).attempt(USER_A);
  assert.deepEqual(counted.calls[0], { fn: 'svc_board_attempt', args: { p_user: USER_A } });
  const bad = client({ data: null, error: { code: 'P0001', message: 'rate_limited' } });
  await assert.rejects(
    () => supabaseBoard(bad.c).member(USER_A),
    (e: unknown) => e instanceof BoardDbError && e.code === 'rate_limited',
  );
  const leaky = client({ data: null, error: { code: 'XX000', message: 'boom a@test.invalid' } });
  await assert.rejects(
    () => supabaseBoard(leaky.c).digest(),
    (e: unknown) => e instanceof BoardDbError && !e.message.includes('a@test'),
  );
});

Deno.test('terms and the digest are read defensively (odd answers become empty lists and zeros)', async () => {
  assert.deepEqual(await supabaseBoard(client({ data: { block: ['x', 3], hold: 'nope' }, error: null }).c).terms(), {
    block: ['x'],
    hold: [],
    reserved: [],
    linkDomains: [],
  });
  assert.deepEqual(await supabaseBoard(client({ data: { held: '2', reported: 1 }, error: null }).c).digest(), {
    held: 0,
    reported: 1,
    appeals: 0,
  });
  assert.equal(await supabaseBoard(client({ data: 'true', error: null }).c).isStaff(USER_A), false);
});

Deno.test('leakprint.json round-trips, numbers only, and a malformed file is refused', () => {
  const fp = testFingerprint();
  const file = encodeLeakprint(fp);
  const back = decodeLeakprint(JSON.parse(JSON.stringify(file)));
  assert.deepEqual([...back.full.hashes], [...fp.full.hashes]);
  assert.deepEqual([...back.stem.items], [...fp.stem.items]);
  assert.equal(
    leakMatch(back, 'the payroll clerk edits master records without any independent review').verdict,
    'block',
  );
  assert.ok(!JSON.stringify(file).includes('payroll'));
  // The squashed-letters fingerprint travels too: a paste without spaces is still caught (SEC S5).
  assert.deepEqual([...back.squash!.hashes], [...fp.squash!.hashes]);
  assert.equal(leakMatch(back, 'Thepayrollclerkeditsmasterrecordswithoutanyindependentreview').verdict, 'block');
  // A file from before the fix round (no squashed fingerprint) is refused, never run weaker.
  assert.throws(() => decodeLeakprint({ v: 1, full: file.full, stem: file.stem }));
  assert.throws(() => decodeLeakprint({ v: 2 }));
  assert.throws(() => decodeLeakprint({ ...file, full: { ...file.full, hashes: 'AAA' } }));
});
