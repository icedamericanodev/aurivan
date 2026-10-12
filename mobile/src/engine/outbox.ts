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
 * - When sent (fix round P8, CR N8):
 *   - done, a rate limit, "not allowed" or "not there": dropped (sending
 *     again wouldn't help);
 *   - offline or signed out: kept, and the send stops there (nothing else
 *     would get through either);
 *   - a server problem: kept, tried again later with a growing wait (30 s,
 *     1 min, 2 min, … up to an hour), and dropped after 8 tries; the acts
 *     behind it are still sent (one failing act never holds up the rest).
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
  /** Failed sends so far (a server problem). */
  tries: number;
  /** Not sent again before this time (the backoff). */
  nextAt: number;
}

export const OUTBOX_MAX = 50;
export const OUTBOX_TTL_MS = 7 * 24 * 60 * 60_000;
/** Dropped after this many failed sends. */
export const OUTBOX_MAX_TRIES = 8;

/** The wait after `tries` failed sends: 30 s, doubling, at most an hour. */
export function backoffMs(tries: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, tries - 1), 60 * 60_000);
}

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
  const next = [...pruneOutbox(list, now).filter((e) => e.key !== key), { key, at: now, act: merged, tries: 0, nextAt: now }];
  return next.slice(-OUTBOX_MAX);
}

/**
 * What to do with an entry after sending it: done or dropped ('remove': no
 * point retrying), kept and the send stops ('stop': offline, signed out),
 * or kept for a later try with a wait ('retry': a server problem).
 */
export function afterSend(outcome: 'ok' | string): 'remove' | 'stop' | 'retry' {
  if (outcome === 'ok') return 'remove';
  // Sending again wouldn't change these answers.
  if (outcome === 'rate_limited' || outcome === 'forbidden' || outcome === 'not_found' || outcome === 'invalid' || outcome === 'conflict' || outcome === 'gone') return 'remove';
  if (outcome === 'offline' || outcome === 'unauthorized') return 'stop';
  return 'retry';
}

/** The first entry due to be sent (`now` past its wait) that this send hasn't tried yet. */
export function nextDue(list: readonly OutboxEntry[], now: number, tried: ReadonlySet<string>): OutboxEntry | null {
  return list.find((e) => e.nextAt <= now && !tried.has(`${e.key}@${e.at}`)) ?? null;
}

/**
 * The list after one send of `sent`: only THAT entry changes (matched by its
 * key and time, so a newer act for the same target, added meanwhile,
 * survives: CR B2). Removed; or, on a retry, its count and wait updated, and
 * dropped after OUTBOX_MAX_TRIES.
 */
export function settleSent(list: readonly OutboxEntry[], sent: OutboxEntry, verdict: 'remove' | 'stop' | 'retry', now: number): OutboxEntry[] {
  return list.flatMap((e) => {
    if (e.key !== sent.key || e.at !== sent.at) return [e];
    if (verdict === 'remove') return [];
    if (verdict === 'stop') return [e];
    const tries = e.tries + 1;
    return tries >= OUTBOX_MAX_TRIES ? [] : [{ ...e, tries, nextAt: now + backoffMs(tries) }];
  });
}

/**
 * The stored form: the entries and WHOSE they are (a hash of the account id,
 * like the sync record's). A different learner signing in on the same phone
 * never sends the previous learner's votes or reports.
 */
export function writeOutbox(owner: string, list: readonly OutboxEntry[]): string {
  return JSON.stringify({ v: 1, owner, entries: list });
}

/** Is this a well-formed act? Each op's own fields are checked (a corrupt entry could otherwise crash a send and be kept forever: CR N8). */
export function validAct(a: unknown): a is OutboxAct {
  if (!a || typeof a !== 'object') return false;
  const x = a as Record<string, unknown>;
  if (typeof x.target !== 'string' || !x.target) return false;
  switch (x.op) {
    case 'vote':
    case 'follow':
    case 'block':
      return typeof x.on === 'boolean';
    case 'report':
      return (x.kind === 'post' || x.kind === 'comment' || x.kind === 'member') && typeof x.reason === 'string' && (x.note === undefined || typeof x.note === 'string');
    case 'read':
      return Array.isArray(x.ids) && x.ids.every((n) => Number.isInteger(n));
    default:
      return false;
  }
}

/** A stored outbox, read defensively: another account's, or anything malformed, reads as empty (a bad entry alone is skipped). */
export function readOutbox(raw: string | null, now: number, owner: string): OutboxEntry[] {
  if (!raw) return [];
  try {
    const stored = JSON.parse(raw) as { v?: unknown; owner?: unknown; entries?: unknown } | null;
    if (!stored || stored.v !== 1 || stored.owner !== owner || !Array.isArray(stored.entries)) return [];
    const ok: OutboxEntry[] = [];
    for (const e of stored.entries as unknown[]) {
      if (!e || typeof e !== 'object') continue;
      const x = e as Partial<OutboxEntry>;
      if (typeof x.key !== 'string' || !Number.isFinite(x.at) || !validAct(x.act)) continue;
      // Entries saved before the fix round have no tries or wait yet.
      const tries = Number.isInteger(x.tries) && (x.tries as number) >= 0 ? (x.tries as number) : 0;
      const nextAt = Number.isFinite(x.nextAt) ? (x.nextAt as number) : (x.at as number);
      ok.push({ key: x.key, at: x.at as number, act: x.act, tries, nextAt });
    }
    return pruneOutbox(ok, now).slice(-OUTBOX_MAX);
  } catch {
    return [];
  }
}
