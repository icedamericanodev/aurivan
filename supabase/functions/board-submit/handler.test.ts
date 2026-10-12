import { strict as assert } from 'node:assert';
import { BoardDbError } from '../_shared/board.ts';
import { FakeBoardDb, TEST_BANK, testFingerprint } from '../_shared/boardTesting.ts';
import { FakeAdmin, NOW, post, recordingLogger, USER_A, USER_B } from '../_shared/testing.ts';
import { handleBoardSubmit } from './handler.ts';

function setup(opts: { leak?: boolean } = {}) {
  const admin = new FakeAdmin();
  admin.addUser({ id: USER_A, email: 'a@test.invalid' });
  admin.addUser({ id: USER_B, email: 'b@test.invalid' });
  const board = new FakeBoardDb();
  board.addMember(USER_A);
  const log = recordingLogger();
  const run = (body: unknown, user = USER_A) =>
    handleBoardSubmit(post(body, admin.issue(user)), {
      admin,
      board,
      leak: opts.leak === false ? null : testFingerprint(),
      log,
    }, NOW);
  return { admin, board, log, run };
}

const IDEA = {
  op: 'post',
  kind: 'idea',
  title: 'More practice on BCP test types',
  body: 'Tabletop versus parallel, please.',
};

async function errorOf(res: Response) {
  return { status: res.status, ...((await res.json()) as { error: string; detail?: string }) };
}

Deno.test('no JWT: 401, and nothing is read or written', async () => {
  const { board } = setup();
  const admin = new FakeAdmin();
  const res = await handleBoardSubmit(post(IDEA), { admin, board, leak: testFingerprint(), log: recordingLogger() });
  assert.equal(res.status, 401);
  assert.deepEqual(board.calls, []);
});

Deno.test('a trusted member’s idea is published; the author is the verified user, never the body’s', async () => {
  const { board, run } = setup();
  const res = await run({ ...IDEA, author_id: USER_B, userId: USER_B, user_id: USER_B });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: board.writes[0].id, visibility: 'visible' });
  assert.equal(board.writes[0].userId, USER_A);
});

Deno.test('a new member’s first post waits for review (new_member)', async () => {
  const { board, run } = setup();
  board.addMember(USER_A, { approvedPosts: 0 });
  const res = await run(IDEA);
  assert.deepEqual(await res.json(), { id: board.writes[0].id, visibility: 'pending', holdReason: 'new_member' });
});

Deno.test('near-verbatim bank text: 422 bank_text, and NO row is written', async () => {
  const { board, log, run } = setup();
  const res = await run({ ...IDEA, kind: 'content', body: TEST_BANK[0].stem });
  assert.deepEqual(await errorOf(res), { status: 422, error: 'bank_text' });
  assert.equal(board.writes.length, 0);
  // The same for a comment and for edits.
  assert.equal(
    (await run({ op: 'comment', postId: '00000000-0000-4000-8000-0000000000ff', body: TEST_BANK[0].explanation }))
      .status,
    422,
  );
  assert.equal(
    (await run({ ...IDEA, op: 'edit_post', id: '00000000-0000-4000-8000-0000000000ff', body: TEST_BANK[0].stem }))
      .status,
    422,
  );
  assert.equal(board.writes.length, 0);
  // The log never holds the text.
  assert.ok(log.lines.every((l) => !l.includes('payroll') && !l.includes('clerk')));
});

Deno.test('blocked words: 422 rejected_words, nothing written', async () => {
  const { board, run } = setup();
  const res = await run({ ...IDEA, body: 'what the fuck is this timer' });
  assert.deepEqual(await errorOf(res), { status: 422, error: 'rejected_words', detail: 'words' });
  assert.equal(board.writes.length, 0);
});

Deno.test('a new member’s link and anyone’s shortener: 422 links; a trusted member’s plain link is fine', async () => {
  const { board, run } = setup();
  board.addMember(USER_A, { approvedPosts: 0 });
  assert.deepEqual(await errorOf(await run({ ...IDEA, body: 'see https://example.org/x' })), {
    status: 422,
    error: 'rejected_words',
    detail: 'links',
  });
  board.addMember(USER_A, { approvedPosts: 2 });
  assert.deepEqual(await errorOf(await run({ ...IDEA, body: 'see bit.ly/x' })), {
    status: 422,
    error: 'rejected_words',
    detail: 'links',
  });
  assert.equal((await run({ ...IDEA, body: 'see https://example.org/x' })).status, 200);
});

Deno.test('staff-added words count too', async () => {
  const { board, run } = setup();
  board.termsList.block = ['spoilerword'];
  board.termsList.hold = ['meet offline'];
  assert.equal((await run({ ...IDEA, body: 'a spoilerword here' })).status, 422);
  const held = await run({ ...IDEA, body: 'we should meet offline' });
  assert.equal(((await held.json()) as { holdReason: string }).holdReason, 'hold_words');
});

Deno.test('hold list and recall: stored as pending with the hold reason', async () => {
  const { board, run } = setup();
  const words = await run({ ...IDEA, body: 'add me on whatsapp' });
  assert.deepEqual(await words.json(), { id: board.writes[0].id, visibility: 'pending', holdReason: 'hold_words' });
  const recall = await run({ ...IDEA, body: 'On my exam I got one about the audit charter.' });
  assert.deepEqual(await recall.json(), { id: board.writes[1].id, visibility: 'pending', holdReason: 'recall' });
  // Linking one of our own items lowers the recall score below the hold.
  const ours = await run({
    ...IDEA,
    itemRef: 'q:d1_001',
    body: 'Which of the following is BEST?\nA) one\nB) two\nC) three',
  });
  assert.equal(((await ours.json()) as { visibility: string }).visibility, 'visible');
});

Deno.test('posting paused: posts and comments refused before anything is written', async () => {
  const { board, run } = setup();
  board.postingOpen = false;
  assert.deepEqual(await errorOf(await run(IDEA)), { status: 409, error: 'posting_paused' });
  assert.deepEqual(
    await errorOf(await run({ op: 'comment', postId: '00000000-0000-4000-8000-0000000000ff', body: 'Same here.' })),
    {
      status: 409,
      error: 'posting_paused',
    },
  );
  assert.equal(board.writes.length, 0);
});

Deno.test('standing, consent and membership', async () => {
  const { board, run } = setup();
  board.addMember(USER_A, { standing: 'banned' });
  assert.deepEqual(await errorOf(await run(IDEA)), { status: 403, error: 'banned' });
  board.addMember(USER_A, { standing: 'suspended', standingUntil: new Date(NOW + 86_400_000).toISOString() });
  assert.equal((await run(IDEA)).status, 403);
  board.addMember(USER_A, { standing: 'suspended', standingUntil: new Date(NOW - 1000).toISOString() });
  assert.equal((await run(IDEA)).status, 200, 'a suspension that ran out lets them post again');
  board.addMember(USER_A, { guidelinesVersion: '2025-01' });
  assert.deepEqual(await errorOf(await run(IDEA)), { status: 409, error: 'invalid', detail: 'guidelines' });
  assert.deepEqual(await errorOf(await run(IDEA, USER_B)), { status: 403, error: 'forbidden', detail: 'not_member' });
});

Deno.test('the database’s refusals map to the app’s codes (rate limit with a Retry-After)', async () => {
  const { board, run } = setup();
  board.postsPerHour = 0;
  const res = await run(IDEA);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), String(24 * 60 * 60));
  board.fail.write = new BoardDbError('forbidden');
  assert.deepEqual(
    await errorOf(await run({ op: 'comment', postId: '00000000-0000-4000-8000-0000000000ff', body: 'blocked' })),
    {
      status: 403,
      error: 'forbidden',
    },
  );
  board.fail.member = new BoardDbError('server');
  assert.deepEqual(await errorOf(await run(IDEA)), { status: 500, error: 'server' });
});

Deno.test('fields are checked: kind, title length, body length, item link, ids', async () => {
  const { board, run } = setup();
  const cases: [Record<string, unknown>, string][] = [
    [{ ...IDEA, kind: 'rant' }, 'kind'],
    [{ ...IDEA, title: 'Short' }, 'title'],
    [{ ...IDEA, title: 'x'.repeat(101) }, 'title'],
    [{ ...IDEA, body: 'x'.repeat(2001) }, 'body'],
    [{ ...IDEA, itemRef: 'javascript:alert(1)' }, 'item_ref'],
    [{ op: 'comment', postId: 'not-a-uuid', body: 'hi' }, 'post_id'],
    [{ op: 'comment', postId: '00000000-0000-4000-8000-0000000000ff', body: '   ' }, 'body'],
    [{ op: 'edit_comment', id: '00000000-0000-4000-8000-0000000000ff', body: 'x'.repeat(1001) }, 'body'],
    [{ op: 'launch' }, 'op'],
  ];
  for (const [body, detail] of cases) {
    assert.deepEqual(await errorOf(await run(body)), { status: 400, error: 'invalid', detail });
  }
  assert.equal(board.writes.length, 0);
});

Deno.test('text is normalised before it is checked and stored (invisible characters can’t hide a word)', async () => {
  const { board, run } = setup();
  const zw = String.fromCharCode(0x200b);
  assert.equal((await run({ ...IDEA, body: `fu${zw}ck` })).status, 422);
  await run({ ...IDEA, title: `  More   practice${zw} on BCP  `, body: 'ok' });
  assert.equal(board.writes[0].title, 'More practice on BCP');
});

Deno.test('the leak guard must be built: without it nothing is accepted', async () => {
  const { board, run, log } = setup({ leak: false });
  assert.deepEqual(await errorOf(await run(IDEA)), { status: 500, error: 'server' });
  assert.equal(board.writes.length, 0);
  assert.ok(log.lines.some((l) => l.includes('leakprint_missing')));
});

Deno.test('me: the learner’s own facts only; join checks the name', async () => {
  const { board, run } = setup();
  const me = (await (await run({ op: 'me' })).json()) as { member: { userId: string } };
  assert.equal(me.member.userId, USER_A);
  assert.deepEqual(await (await run({ op: 'me' }, USER_B)).json(), { member: null });
  for (const handle of ['Aurivan Team', 'ISACA_mod', 'support']) {
    assert.deepEqual(
      await errorOf(await run({ op: 'join', handle, handleKind: 'chosen', guidelinesVersion: '2026-11' }, USER_B)),
      {
        status: 400,
        error: 'invalid',
        detail: 'handle_reserved',
      },
    );
  }
  assert.deepEqual(
    await errorOf(await run({ op: 'join', handle: 'x', handleKind: 'chosen', guidelinesVersion: '2026-11' }, USER_B)),
    {
      status: 400,
      error: 'invalid',
      detail: 'handle_shape',
    },
  );
  board.termsList.reserved = ['ranger'];
  assert.equal(
    (await run({ op: 'join', handle: 'Ranger Bob', handleKind: 'chosen', guidelinesVersion: '2026-11' }, USER_B))
      .status,
    400,
  );
  const ok = await run(
    { op: 'join', handle: 'Misty Rowan 77', handleKind: 'pseudonym', guidelinesVersion: '2026-11' },
    USER_B,
  );
  assert.equal(((await ok.json()) as { member: { handle: string } }).member.handle, 'Misty Rowan 77');
  assert.deepEqual(
    await errorOf(
      await run({ op: 'join', handle: 'Misty Rowan 77', handleKind: 'pseudonym', guidelinesVersion: '2026-11' }),
    ),
    {
      status: 409,
      error: 'invalid',
      detail: 'handle_taken',
    },
  );
});
