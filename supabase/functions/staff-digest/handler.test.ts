import { strict as assert } from 'node:assert';
import { FakeBoardDb } from '../_shared/boardTesting.ts';
import { recordingLogger } from '../_shared/testing.ts';
import { digestEmail, handleStaffDigest, type Mailer } from './handler.ts';

const SECRET = 'digest-secret-for-tests-only-0123456789';

function setup(opts: { mailer?: boolean; secret?: string | null } = {}) {
  const board = new FakeBoardDb();
  const sent: { to: string; subject: string; text: string }[] = [];
  const mailer: Mailer | null = opts.mailer === false ? null : {
    send: (m) => {
      sent.push(m);
      return Promise.resolve();
    },
  };
  const log = recordingLogger();
  const run = (auth?: string) =>
    handleStaffDigest(
      new Request('http://localhost/fn', { method: 'POST', headers: auth ? { authorization: auth } : {} }),
      {
        board,
        mailer,
        secret: opts.secret === undefined ? SECRET : opts.secret,
        to: 'support@test.invalid',
        queueUrl: 'aurivan://board/moderation',
        log,
      },
    );
  return { board, sent, log, run };
}

Deno.test('only the cron secret may call it (a learner token or nothing: 401)', async () => {
  const { board, run } = setup();
  assert.equal((await run()).status, 401);
  assert.equal((await run('Bearer learner.access.token')).status, 401);
  assert.equal((await run(`Bearer ${SECRET}x`)).status, 401);
  assert.deepEqual(board.calls, []);
});

Deno.test('not configured: refused (500), nothing read', async () => {
  const { board, run } = setup({ secret: null });
  assert.equal((await run(`Bearer ${SECRET}`)).status, 500);
  assert.deepEqual(board.calls, []);
});

Deno.test('nothing waiting over 12 hours: no email', async () => {
  const { sent, run } = setup();
  const res = await run(`Bearer ${SECRET}`);
  assert.deepEqual(await res.json(), { sent: false, held: 0, reported: 0, appeals: 0 });
  assert.equal(sent.length, 0);
});

Deno.test('something waiting: one email to the support inbox with counts and the queue link only', async () => {
  const { board, sent, run } = setup();
  board.digestCounts = { held: 2, reported: 1, appeals: 0 };
  const res = await run(`Bearer ${SECRET}`);
  assert.deepEqual(await res.json(), { sent: true, held: 2, reported: 1, appeals: 0 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'support@test.invalid');
  assert.deepEqual(
    { subject: sent[0].subject, text: sent[0].text },
    digestEmail(board.digestCounts, 'aurivan://board/moderation'),
  );
  assert.match(sent[0].text, /Held: 2\nReported: 1\nAppeals: 0/);
});

Deno.test('no email provider yet (Phase 9): a no-op that logs counts', async () => {
  const { board, log, run } = setup({ mailer: false });
  board.digestCounts = { held: 1, reported: 0, appeals: 0 };
  assert.deepEqual(await (await run(`Bearer ${SECRET}`)).json(), { sent: false, held: 1, reported: 0, appeals: 0 });
  assert.ok(log.lines.some((l) => l.includes('digest_no_email_provider')));
});
