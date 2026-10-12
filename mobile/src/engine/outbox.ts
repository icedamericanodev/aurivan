/**
 * The board's offline outbox rules (Uplift Phase 8, built OFF; spec §4.6):
 * pure, tested in __tests__/board-outbox.test.ts. No React, no storage.
 *
 * Only IDEMPOTENT acts wait here while the phone is offline: a vote or a
 * follow set or unset, a report, a block or unblock, and "mark read". Doing
 * one twice gives the same result as once, so sending it again after a lost
 * reply is safe. Posts and comments are NEVER queued (the composer keeps a
 * draft instead): a post can't be sent twice by mistake.
 *
 * - Coalesced per act and target: the last one wins (vote on, then off, is
 *   just "off").
 * - At most 50, each kept 7 days.
 * - When sent: a rate limit, "not allowed" or "not there" drops it quietly
 *   (sending again wouldn't help); offline or a server problem keeps it for
 *   the next try.
 */
export type OutboxAct =
  | { op: 'vote'; target: string; on: boolean }
  | { op: 'follow'; target: string; on: boolean }
  | { op: 'report'; target: string; kind: 'post' | 'comment' | 'member'; reason: string; note?: string }
  | { op: 'block'; target: string; on: boolean }
  | { op: 'read'; target: string; ids: number[] };

export interface OutboxEntry {
  key: string;
  at: number;
  act: OutboxAct;
}

export const OUTBOX_MAX = 50;
export const OUTBOX_TTL_MS = 7 * 24 * 60 * 60_000;

/** The coalescing key: one entry per act and target ("vote:<post id>"; "read" is one entry). */
export function outboxKey(a: OutboxAct): string {
  if (a.op === 'read') return 'read';
  if (a.op === 'report') return `report:${a.kind}:${a.target}`;
  // Block and unblock share a key, like vote on and off: the last one wins.
  return `${a.op}:${a.target}`;
}

/** Old entries (over 7 days) dropped, oldest first. */
export function pruneOutbox(list: readonly OutboxEntry[], now: number): OutboxEntry[] {
  return list.filter((e) => now - e.at >= 0 && now - e.at < OUTBOX_TTL_MS).sort((a, b) => a.at - b.at);
}

/**
 * Adds an act: it replaces an earlier one for the same target ("read"
 * merges its ids), and the oldest entries go when there are more than 50.
 */
export function addToOutbox(list: readonly OutboxEntry[], act: OutboxAct, now: number): OutboxEntry[] {
  const key = outboxKey(act);
  const prev = list.find((e) => e.key === key);
  const merged: OutboxAct =
    act.op === 'read' && prev?.act.op === 'read' ? { op: 'read', target: 'read', ids: [...new Set([...prev.act.ids, ...act.ids])].slice(-500) } : act;
  const next = [...pruneOutbox(list, now).filter((e) => e.key !== key), { key, at: now, act: merged }];
  return next.slice(-OUTBOX_MAX);
}

/** What to do with an entry after sending it: done, dropped (no point retrying), or kept for later. */
export function afterSend(outcome: 'ok' | string): 'remove' | 'keep' {
  if (outcome === 'ok') return 'remove';
  // Sending again wouldn't change these answers.
  if (outcome === 'rate_limited' || outcome === 'forbidden' || outcome === 'not_found' || outcome === 'invalid' || outcome === 'conflict') return 'remove';
  return 'keep';
}

/**
 * The stored form: the entries and WHOSE they are (a hash of the account id,
 * like the sync record's). A different learner signing in on the same phone
 * never sends the previous learner's votes or reports.
 */
export function writeOutbox(owner: string, list: readonly OutboxEntry[]): string {
  return JSON.stringify({ v: 1, owner, entries: list });
}

/** A stored outbox, read defensively: another account's, or anything malformed, reads as empty. */
export function readOutbox(raw: string | null, now: number, owner: string): OutboxEntry[] {
  if (!raw) return [];
  try {
    const stored = JSON.parse(raw) as { v?: unknown; owner?: unknown; entries?: unknown } | null;
    if (!stored || stored.v !== 1 || stored.owner !== owner || !Array.isArray(stored.entries)) return [];
    const v = stored.entries;
    const ok = v.filter(
      (e): e is OutboxEntry =>
        !!e && typeof e === 'object' && typeof (e as OutboxEntry).key === 'string' && Number.isFinite((e as OutboxEntry).at) && !!(e as OutboxEntry).act &&
        ['vote', 'follow', 'report', 'block', 'read'].includes((e as OutboxEntry).act.op) && typeof (e as OutboxEntry).act.target === 'string',
    );
    return pruneOutbox(ok, now).slice(-OUTBOX_MAX);
  } catch {
    return [];
  }
}
