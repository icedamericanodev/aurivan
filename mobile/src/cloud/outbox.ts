/**
 * The board's offline outbox, saved as `aurivan.outbox.v1` (Uplift Phase 8,
 * built OFF; spec §4.6). The rules are in engine/outbox.ts; this file reads
 * and writes the list and sends it.
 *
 * Cloud builds only: lib/board.ts is the only caller, and only after
 * `cloudReady()`. With the flag off the key is never read or written.
 *
 * The list belongs to one account (`owner`, a hash of its id): signed in as
 * someone else, it reads as empty and is replaced. It is sent when the board
 * opens and right after something is added (no timer of its own).
 *
 * Fix round P8 (CR B2 / N8), in plain English:
 * - Every read-change-write of the saved list happens one at a time (a
 *   lock), so two acts at once (a vote and a block, a report then a block)
 *   never overwrite each other.
 * - A send takes one entry, sends it WITHOUT holding the lock (so new acts
 *   can be added meanwhile), then removes or updates only that entry: a
 *   newer act for the same target, added while it was sending, survives.
 * - Offline or signed out: the send stops. A server problem: that act waits
 *   (backoff) and the next ones are still sent.
 * - One send at a time; an act added while a send runs is picked up by it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToOutbox, afterSend, nextDue, readOutbox, settleSent, writeOutbox, type OutboxAct, type OutboxEntry } from '../engine/outbox';
import { errorCode, type BoardPort, type ReportReason } from './types';

export const OUTBOX_KEY = 'aurivan.outbox.v1';

/** The lock: each read-change-write waits for the one before it. */
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.then(
    () => {},
    () => {},
  );
  return run;
}

let sending: Promise<void> | null = null;
/** Something was added while a send was running: it goes round once more. */
let again = false;

async function load(owner: string, now: number): Promise<OutboxEntry[]> {
  try {
    return readOutbox(await AsyncStorage.getItem(OUTBOX_KEY), now, owner);
  } catch {
    return [];
  }
}

async function save(owner: string, list: OutboxEntry[]): Promise<void> {
  try {
    if (list.length) await AsyncStorage.setItem(OUTBOX_KEY, writeOutbox(owner, list));
    else await AsyncStorage.removeItem(OUTBOX_KEY);
  } catch {
    // A phone that can't save keeps nothing: the act was already tried once.
  }
}

/** Adds an act for this account (coalesced with an earlier one for the same target). */
export function enqueue(owner: string, act: OutboxAct, now = Date.now()): Promise<void> {
  if (sending) again = true;
  return locked(async () => save(owner, addToOutbox(await load(owner, now), act, now)));
}

function send(board: BoardPort, a: OutboxAct): Promise<void> {
  switch (a.op) {
    case 'vote':
      return board.vote(a.target, a.on);
    case 'follow':
      return board.follow(a.target, a.on);
    case 'report':
      return board.report({ kind: a.kind, id: a.target, reason: a.reason as ReportReason, note: a.note });
    case 'block':
      return a.on ? board.block(a.target) : board.unblock(a.target);
    case 'read':
      return board.markRead(a.ids);
  }
}

/** Sends what waits for this account and is due, oldest first. Never rejects. */
export function flush(board: BoardPort, owner: string, now: () => number = Date.now): Promise<void> {
  if (sending) {
    again = true;
    return sending;
  }
  sending = (async () => {
    try {
      do {
        again = false;
        const tried = new Set<string>();
        for (;;) {
          const t = now();
          const next = await locked(async () => nextDue(await load(owner, t), t, tried));
          if (!next) break;
          tried.add(`${next.key}@${next.at}`);
          let outcome = 'ok';
          try {
            await send(board, next.act);
          } catch (err) {
            outcome = errorCode(err);
          }
          const verdict = afterSend(outcome);
          await locked(async () => save(owner, settleSent(await load(owner, now()), next, verdict, now())));
          if (verdict === 'stop') return;
        }
      } while (again);
    } finally {
      sending = null;
    }
  })();
  return sending;
}

/** Forget every waiting act on this phone (sign-out, account deletion: CR B3, SEC S9). */
export function clearOutbox(): Promise<void> {
  return locked(async () => {
    try {
      await AsyncStorage.removeItem(OUTBOX_KEY);
    } catch {
      // Nothing to do.
    }
  });
}

/** How many acts wait for this account (tests). */
export async function outboxSize(owner: string, now = Date.now()): Promise<number> {
  return (await load(owner, now)).length;
}
