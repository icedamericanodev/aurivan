import { strict as assert } from 'node:assert';
import { FakeBoardDb } from '../_shared/boardTesting.ts';
import { FakeAdmin, post, recordingLogger, USER_A, USER_B } from '../_shared/testing.ts';
import { handleStaffAction } from './handler.ts';

const STAFF = USER_B;
const POST_ID = '00000000-0000-4000-8000-0000000000ff';

function setup() {
  const admin = new FakeAdmin();
  admin.addUser({ id: USER_A });
  admin.addUser({ id: STAFF });
  const board = new FakeBoardDb();
  board.staffIds.add(STAFF);
  const log = recordingLogger();
  const run = (body: unknown, user = STAFF) => handleStaffAction(post(body, admin.issue(user)), { admin, board, log });
  return { admin, board, log, run };
}

Deno.test('whoami tells anyone signed in whether THEY are staff, and nothing else', async () => {
  const { run } = setup();
  assert.deepEqual(await (await run({ action: 'whoami' }, USER_A)).json(), { staff: false });
  assert.deepEqual(await (await run({ action: 'whoami' })).json(), { staff: true });
});

Deno.test('a learner gets 403 for the queue and every action, and nothing runs', async () => {
  const { board, run } = setup();
  for (
    const body of [
      { action: 'queue', tab: 'held' },
      { action: 'pause', targetKind: 'board' },
      { action: 'approve', targetKind: 'post', targetId: POST_ID },
    ]
  ) {
    const res = await run(body, USER_A);
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'forbidden' });
  }
  assert.deepEqual(board.staffActs, []);
  assert.ok(!board.calls.includes('staffQueue'));
});

Deno.test('staff: the queue, a removal with its reason, and pause / reopen', async () => {
  const { board, run } = setup();
  assert.equal(((await (await run({ action: 'queue', tab: 'reported' })).json()) as { tab: string }).tab, 'reported');
  assert.equal(
    (await run({ action: 'remove_warn', targetKind: 'post', targetId: POST_ID, reason: 'abuse' })).status,
    200,
  );
  assert.deepEqual(board.staffActs[0], {
    actor: STAFF,
    action: 'remove_warn',
    targetKind: 'post',
    targetId: POST_ID,
    reason: 'abuse',
    extra: {},
  });
  await run({ action: 'pause', targetKind: 'board' });
  assert.equal(board.postingOpen, false);
  await run({ action: 'reopen', targetKind: 'board' });
  assert.equal(board.postingOpen, true);
});

Deno.test('the actor is always the verified user, never a body field', async () => {
  const { board, run } = setup();
  await run({ action: 'lock', targetKind: 'post', targetId: POST_ID, actor: USER_A, userId: USER_A });
  assert.equal(board.staffActs[0].actor, STAFF);
});

Deno.test('actions, targets, reasons and extras are checked against fixed lists', async () => {
  const { board, run } = setup();
  const bad: [Record<string, unknown>, string][] = [
    [{ action: 'drop_table', targetKind: 'post', targetId: POST_ID }, 'action'],
    [{ action: 'ban', targetKind: 'post', targetId: POST_ID }, 'action'],
    [{ action: 'approve', targetKind: 'post', targetId: 'nope' }, 'target_id'],
    [{ action: 'remove', targetKind: 'post', targetId: POST_ID }, 'reason_required'],
    [{ action: 'remove', targetKind: 'post', targetId: POST_ID, reason: 'because' }, 'reason'],
    [{ action: 'status', targetKind: 'post', targetId: POST_ID, extra: { status: 'done' } }, 'status'],
    [{ action: 'status', targetKind: 'post', targetId: POST_ID, extra: { status: 'not_planned' } }, 'note_required'],
    [
      { action: 'status', targetKind: 'post', targetId: POST_ID, extra: { status: 'shipped', shippedIn: 'soon' } },
      'shipped_in',
    ],
    [{ action: 'official', targetKind: 'post', targetId: POST_ID, extra: { body: '' } }, 'body'],
    [{ action: 'merge', targetKind: 'post', targetId: POST_ID, extra: { into: 'x' } }, 'into'],
    [{ action: 'suspend', targetKind: 'member', targetId: USER_A, extra: { days: 9999 } }, 'days'],
    [{ action: 'queue', tab: 'secrets' }, 'tab'],
  ];
  for (const [body, detail] of bad) {
    const res = await run(body);
    assert.deepEqual([res.status, await res.json()], [400, { error: 'invalid', detail }], JSON.stringify(body));
  }
  assert.deepEqual(board.staffActs, []);
});

Deno.test('extras are rebuilt: only the known fields pass through', async () => {
  const { board, run } = setup();
  await run({
    action: 'status',
    targetKind: 'post',
    targetId: POST_ID,
    extra: { status: 'shipped', shippedIn: '1.20', note: '  Thanks  ', sql: 'drop' },
  });
  assert.deepEqual(board.staffActs[0].extra, { status: 'shipped', note: 'Thanks', shippedIn: '1.20' });
});

Deno.test('the log has counts only', async () => {
  const { log, run } = setup();
  await run({ action: 'official', targetKind: 'post', targetId: POST_ID, extra: { body: 'A private reply text' } });
  assert.ok(log.lines.every((l) => !l.includes('private reply') && !l.includes(POST_ID)));
});

Deno.test('fix round: rename a member, fold a post, dismiss every report on one thing', async () => {
  const { board, run } = setup();
  const MEMBER = '30000000-0000-4000-8000-0000000000aa';
  assert.equal((await run({ action: 'rename', targetKind: 'member', targetId: MEMBER })).status, 200);
  assert.equal(
    (await run({ action: 'spoiler', targetKind: 'post', targetId: POST_ID, extra: { on: true } })).status,
    200,
  );
  assert.equal(
    (await run({ action: 'dismiss', targetKind: 'report', targetId: MEMBER, extra: { kind: 'member' } })).status,
    200,
  );
  assert.deepEqual(board.staffActs.map((a) => [a.action, a.extra]), [
    ['rename', {}],
    ['spoiler', { on: true }],
    ['dismiss', { kind: 'member' }],
  ]);
  // Their extras are checked too.
  for (
    const [body, detail] of [
      [{ action: 'spoiler', targetKind: 'post', targetId: POST_ID, extra: { on: 'yes' } }, 'on'],
      [{ action: 'dismiss', targetKind: 'report', targetId: MEMBER }, 'kind'],
      [{ action: 'rename', targetKind: 'post', targetId: POST_ID }, 'action'],
    ] as [Record<string, unknown>, string][]
  ) {
    assert.deepEqual(await (await run(body)).json(), { error: 'invalid', detail });
  }
  assert.equal(board.staffActs.length, 3);
});
