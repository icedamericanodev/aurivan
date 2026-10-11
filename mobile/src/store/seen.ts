/**
 * Seen store (mobile 1.9) — what the learner has already SEEN, so motion can
 * show what changed since then, and nothing else:
 * - `values`: the numbers a surface last showed (e.g. "you:rings:cisa" → the
 *   five ring values), so they grow from there the next time, never from 0
 *   again and never on a fall (components/motion.tsx useGrowth);
 * - `moments`: how many times each kind of celebration has played, so the
 *   4th clearing onwards is the short version (behavioural review §2).
 *
 * Presentation only: it holds no answers, nothing a backup needs, and losing
 * it only means one number counts up again. So it is NOT in backups, and a
 * restore or a reset leaves it alone (a value that went down just shows).
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
  see: (key: string, values: number[]) => void;
  played: (kind: string) => void;
}

export const useSeen = create<SeenState>()(
  persist(
    (set) => ({
      values: {},
      moments: {},
      see: (key, values) =>
        set((s) => {
          const old = s.values[key];
          if (old && old.length === values.length && old.every((v, i) => v === values[i])) return s;
          const next = { ...s.values };
          delete next[key]; // re-inserted last, so the oldest key is the first one
          next[key] = [...values];
          const keys = Object.keys(next);
          if (keys.length > SEEN_MAX_KEYS) for (const k of keys.slice(0, keys.length - SEEN_MAX_KEYS)) delete next[k];
          return { values: next };
        }),
      played: (kind) => set((s) => ({ moments: { ...s.moments, [kind]: (s.moments[kind] ?? 0) + 1 } })),
    }),
    { name: 'aurivan.seen.v1', storage: persistStorage, version: 1 },
  ),
);
