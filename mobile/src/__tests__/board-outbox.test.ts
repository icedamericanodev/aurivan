/**
 * Uplift Phase 8: the board's offline outbox rules (engine/outbox.ts):
 * idempotent acts only, coalesced per target (last one wins), at most 50,
 * 7 days, bound to one account, and dropped when sending again can't help.
 */
import { addToOutbox, afterSend, backoffMs, nextDue, OUTBOX_MAX, OUTBOX_MAX_TRIES, OUTBOX_TTL_MS, outboxKey, pruneOutbox, readOutbox, settleSent, validAct, writeOutbox, type OutboxEntry } from '../engine/outbox';

const T0 = Date.UTC(2026, 9, 12);

describe('outbox rules', () => {
  it('coalesces per act and target: the last one wins', () => {
    let list: OutboxEntry[] = [];
    list = addToOutbox(list, { op: 'vote', target: 'p1', on: true }, T0);
    list = addToOutbox(list, { op: 'vote', target: 'p2', on: true }, T0 + 1);
    list = addToOutbox(list, { op: 'vote', target: 'p1', on: false }, T0 + 2);
    expect(list.map((e) => e.act)).toEqual([
      { op: 'vote', target: 'p2', on: true },
      { op: 'vote', target: 'p1', on: false },
    ]);
    // Block then unblock is one entry: unblock.
    list = addToOutbox(list, { op: 'block', target: 'u1', on: true }, T0 + 3);
    list = addToOutbox(list, { op: 'block', target: 'u1', on: false }, T0 + 4);
    expect(list.filter((e) => e.key === 'block:u1').map((e) => e.act)).toEqual([{ op: 'block', target: 'u1', on: false }]);
  });

  it('reports are kept per kind and target; "mark read" merges its ids', () => {
    expect(outboxKey({ op: 'report', target: 'x', kind: 'post', reason: 'spam' })).not.toBe(outboxKey({ op: 'report', target: 'x', kind: 'comment', reason: 'spam' }));
    let list = addToOutbox([], { op: 'read', target: 'read', ids: [1, 2] }, T0);
    list = addToOutbox(list, { op: 'read', target: 'read', ids: [2, 3] }, T0 + 1);
    expect(list).toHaveLength(1);
    expect(list[0].act).toEqual({ op: 'read', target: 'read', ids: [1, 2, 3] });
  });

  it('keeps at most 50, and nothing older than 7 days', () => {
    let list: OutboxEntry[] = [];
    for (let i = 0; i < 60; i++) list = addToOutbox(list, { op: 'follow', target: `p${i}`, on: true }, T0 + i);
    expect(list).toHaveLength(OUTBOX_MAX);
    expect(list[0].act.target).toBe('p10');
    // Entries at T0+10 … T0+59: those newer than 7 days before "now" (T0+31 … T0+59) stay.
    expect(pruneOutbox(list, T0 + OUTBOX_TTL_MS + 30)).toHaveLength(29);
  });

  it('drops an act when sending again can’t help; stops when offline; waits and goes on after a server problem (CR N8)', () => {
    for (const c of ['ok', 'rate_limited', 'forbidden', 'not_found', 'invalid', 'conflict', 'gone']) expect(afterSend(c)).toBe('remove');
    for (const c of ['offline', 'unauthorized']) expect(afterSend(c)).toBe('stop');
    for (const c of ['server', 'too_big']) expect(afterSend(c)).toBe('retry');
  });

  it('waits longer after each failed send, up to an hour, and gives up after 8 tries', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(backoffMs(20)).toBe(3_600_000);
    let list = addToOutbox([], { op: 'vote', target: 'p1', on: true }, T0);
    for (let i = 1; i < OUTBOX_MAX_TRIES; i++) {
      list = settleSent(list, list[0], 'retry', T0);
      expect(list[0]).toMatchObject({ tries: i, nextAt: T0 + backoffMs(i) });
    }
    expect(settleSent(list, list[0], 'retry', T0)).toEqual([]);
  });

  it('settles only the entry that was sent: a newer act for the same target, added meanwhile, survives (CR B2)', () => {
    const sent = addToOutbox([], { op: 'vote', target: 'p1', on: true }, T0)[0];
    const meanwhile = addToOutbox([sent], { op: 'vote', target: 'p1', on: false }, T0 + 5);
    expect(settleSent(meanwhile, sent, 'remove', T0 + 6)).toEqual(meanwhile);
    const both = addToOutbox([sent], { op: 'follow', target: 'p2', on: true }, T0 + 5);
    expect(settleSent(both, sent, 'remove', T0 + 6).map((e) => e.key)).toEqual(['follow:p2']);
  });

  it('the next due act skips one waiting out its backoff and one already tried in this send', () => {
    let list = addToOutbox([], { op: 'vote', target: 'p1', on: true }, T0);
    list = addToOutbox(list, { op: 'vote', target: 'p2', on: true }, T0 + 1);
    const waiting = settleSent(list, list[0], 'retry', T0 + 2);
    expect(nextDue(waiting, T0 + 3, new Set())?.key).toBe('vote:p2');
    expect(nextDue(waiting, T0 + 3, new Set([`vote:p2@${T0 + 1}`]))).toBeNull();
    expect(nextDue(waiting, T0 + 2 + backoffMs(1), new Set())?.key).toBe('vote:p1');
  });

  it('checks each act’s own fields: a malformed one is skipped, the rest kept (CR N8)', () => {
    expect(validAct({ op: 'read', target: 'read', ids: [1, 2] })).toBe(true);
    expect(validAct({ op: 'read', target: 'read', ids: 'x' })).toBe(false);
    expect(validAct({ op: 'vote', target: 'p1' })).toBe(false);
    expect(validAct({ op: 'report', target: 'p1', kind: 'planet', reason: 'spam' })).toBe(false);
    const good = addToOutbox([], { op: 'vote', target: 'p1', on: true }, T0);
    const raw = JSON.stringify({ v: 1, owner: 'h', entries: [...good, { key: 'read', at: T0, act: { op: 'read', target: 'read', ids: 'oops' } }] });
    expect(readOutbox(raw, T0, 'h')).toEqual(good);
    // An entry saved before the fix round (no tries, no wait) still reads.
    const old = JSON.stringify({ v: 1, owner: 'h', entries: [{ key: 'vote:p1', at: T0, act: { op: 'vote', target: 'p1', on: true } }] });
    expect(readOutbox(old, T0, 'h')).toEqual([{ key: 'vote:p1', at: T0, act: { op: 'vote', target: 'p1', on: true }, tries: 0, nextAt: T0 }]);
  });

  it('belongs to one account: another account reads it as empty; damaged storage reads as empty', () => {
    const list = addToOutbox([], { op: 'vote', target: 'p1', on: true }, T0);
    const raw = writeOutbox('hash-maya', list);
    expect(readOutbox(raw, T0 + 1, 'hash-maya')).toEqual(list);
    expect(readOutbox(raw, T0 + 1, 'hash-raj')).toEqual([]);
    for (const bad of ['', 'nope', '[]', '{"v":2,"owner":"hash-maya","entries":[]}', JSON.stringify({ v: 1, owner: 'hash-maya', entries: [{ key: 1 }, null, { key: 'k', at: T0, act: { op: 'launch', target: 'x' } }] })]) {
      expect(readOutbox(bad, T0, 'hash-maya')).toEqual([]);
    }
  });
});
