/**
 * Uplift Phase 8: the board's offline outbox rules (engine/outbox.ts):
 * idempotent acts only, coalesced per target (last one wins), at most 50,
 * 7 days, bound to one account, and dropped when sending again can't help.
 */
import { addToOutbox, afterSend, OUTBOX_MAX, OUTBOX_TTL_MS, outboxKey, pruneOutbox, readOutbox, writeOutbox, type OutboxEntry } from '../engine/outbox';

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

  it('drops an act when sending again can’t help; keeps it for offline or a server problem', () => {
    for (const c of ['ok', 'rate_limited', 'forbidden', 'not_found', 'invalid', 'conflict']) expect(afterSend(c)).toBe('remove');
    for (const c of ['offline', 'server', 'unauthorized', 'gone']) expect(afterSend(c)).toBe('keep');
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
