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
 * opens and right after something is added (no timer of its own); a failed
 * send waits for the next one; one send at a time.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToOutbox, afterSend, readOutbox, writeOutbox, type OutboxAct, type OutboxEntry } from '../engine/outbox';
import { errorCode, type BoardPort, type ReportReason } from './types';

export const OUTBOX_KEY = 'aurivan.outbox.v1';

let sending: Promise<void> | null = null;

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
export async function enqueue(owner: string, act: OutboxAct, now = Date.now()): Promise<void> {
  await sending;
  await save(owner, addToOutbox(await load(owner, now), act, now));
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

/**
 * Sends what waits for this account, oldest first. Stops at the first act
 * that should be tried again later (offline, signed out, a server problem).
 */
export function flush(board: BoardPort, owner: string, now = Date.now()): Promise<void> {
  if (sending) return sending;
  sending = (async () => {
    try {
      let list = await load(owner, now);
      while (list.length) {
        let outcome = 'ok';
        try {
          await send(board, list[0].act);
        } catch (err) {
          outcome = errorCode(err);
        }
        if (afterSend(outcome) === 'keep') break;
        list = list.slice(1);
        await save(owner, list);
      }
    } finally {
      sending = null;
    }
  })();
  return sending;
}

/** How many acts wait for this account (tests). */
export async function outboxSize(owner: string, now = Date.now()): Promise<number> {
  return (await load(owner, now)).length;
}
