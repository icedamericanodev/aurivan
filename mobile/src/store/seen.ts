/**
 * Seen store (mobile 1.9) — what the learner has already SEEN, so motion can
 * show what changed since then, and nothing else:
 * - `values`: the numbers a surface last showed (e.g. "you:rings:cisa" → the
 *   five ring values), so they grow from there the next time, never from 0
 *   again and never on a fall (components/motion.tsx useGrowth);
 * - `moments`: how many times each kind of celebration has played, so the
 *   4th clearing onwards is the short version (behavioural review §2), plus
 *   once-ever moments keyed by their occasion ("exam-ready:cisa": played);
 * - `days`: the local day a surface last had its first view of the day
 *   ("today:rings:cisa" → "Sat Oct 11 2026"), so the day's count-up plays
 *   once a day, not again on every cold launch.
 *
 * Presentation only: it holds no answers, nothing a backup needs, and losing
 * it only means one number counts up again. So it is NOT in backups. A reset
 * leaves it alone (a value that went down just shows); a restore forgets the
 * `values` (keeping `moments` and `days`), so restored progress is never
 * shown as "+N" earned since the last look.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

/** At most this many surfaces are remembered (oldest dropped), so it never grows without bound. */
export const SEEN_MAX_KEYS = 200;

interface SeenState {
  /** Numbers each surface last showed, keyed by surface and cert. */
  values: Record<string, number[]>;
  /** Times each kind of celebration has played (full or short). */
  moments: Record<string, number>;
  /** The local day (Date.toDateString) of each surface's first view of the day. */
  days: Record<string, string>;
  see: (key: string, values: number[]) => void;
  played: (kind: string) => void;
  /** Marks `key`'s first view of the day as used (false: it already was today). */
  claimDay: (key: string, day: string) => boolean;
  /** After a restore: forget what was shown (moments and days stay). */
  forgetValues: () => void;
}

/** Drops the oldest keys (the first inserted) beyond SEEN_MAX_KEYS. */
function capped<T>(rec: Record<string, T>): Record<string, T> {
  const keys = Object.keys(rec);
  if (keys.length > SEEN_MAX_KEYS) for (const k of keys.slice(0, keys.length - SEEN_MAX_KEYS)) delete rec[k];
  return rec;
}

export const useSeen = create<SeenState>()(
  persist(
    (set, get) => ({
      values: {},
      moments: {},
      days: {},
      see: (key, values) =>
        set((s) => {
          const old = s.values[key];
          if (old && old.length === values.length && old.every((v, i) => v === values[i])) return s;
          const next = { ...s.values };
          delete next[key]; // re-inserted last, so the oldest key is the first one
          next[key] = [...values];
          return { values: capped(next) };
        }),
      played: (kind) => set((s) => ({ moments: { ...s.moments, [kind]: (s.moments[kind] ?? 0) + 1 } })),
      claimDay: (key, day) => {
        if (get().days[key] === day) return false;
        set((s) => {
          const next = { ...s.days };
          delete next[key];
          next[key] = day;
          return { days: capped(next) };
        });
        return true;
      },
      forgetValues: () => set({ values: {} }),
    }),
    { name: 'aurivan.seen.v1', storage: persistStorage, version: 1 },
  ),
);
