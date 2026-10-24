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
 *   once a day, not again on every cold launch;
 * - mobile 1.10 badges: `caseSeen` (when each cert's badge case was last
 *   viewed: the "new" dot shows until it is), `badgeMoments` (when the
 *   last badge moments played: at most 3 in any 7 days) and `badgeSort`
 *   (the case's Sort choice, kept on this phone).
 *
 * - mobile 1.18 plant: `reactions` (each plant reaction's occasion id → when
 *   it played, so a relaunch never plays it again: QA BUG-4) and `proud`
 *   (each proud occasion and whether the keepsake cap held it back;
 *   engine/proud.ts). Both drop entries older than 14 days.
 *
 * - mobile 1.24 `reminderAsk`: how the learner answered the reminder ask on the
 *   Day-1 closing screen (`first`), and whether the one second chance was shown
 *   (`second`). Asked once, then at most one more time, then only Settings.
 *   `newLearner` (onboarded on 1.24+) and `turnedOff` (turned reminders off
 *   in Settings) decide who may get the second chance (engine/firstRun.ts).
 *
 * - mobile 1.41 (all optional, added beside the old fields):
 *   - `tester`: the "I'm a beta tester" switch in Help and the Tester question
 *     card's answers (engine/betaTester.ts). Kept on this phone only: never in
 *     a backup, an email or a sync.
 *   - `nameAsk`: 'due' for a learner onboarded on 1.41+ (onboarding no longer
 *     asks for a name), 'shown' once Today has asked (once ever).
 *   - `plantOffer`: 'later' when the learner chose "Not now" on the first-set
 *     screen's plant offer, so it is never offered there again.
 *
 * Presentation only: it holds no answers, nothing a backup needs, and losing
 * it only means one number counts up again. So it is NOT in backups. A reset
 * leaves it alone (a value that went down just shows); a restore forgets the
 * `values` (keeping `moments` and `days`), so restored progress is never
 * shown as "+N" earned since the last look.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TesterState } from '../engine/betaTester';
import type { AskAnswer } from '../engine/firstRun';
import { admitProud, PROUD_KEEP_DAYS, type ProudLog, type ProudOccasion } from '../engine/proud';
import { DAY_MS } from '../engine/srs';
import { watchHydration } from './hydration';
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
  /** Mobile 1.10: when each cert's badge case was last viewed (epoch ms). */
  caseSeen: Record<string, number>;
  /** Mobile 1.10: when the most recent badge moments played (newest last, at most BADGE_MOMENTS_MAX). */
  badgeMoments: number[];
  /** Mobile 1.10: the badge case's Sort choice ('set' when unset). */
  badgeSort?: string;
  /**
   * Mobile 1.14: a grow-up applied silently on Today (the exam-ready panel
   * had that visit's one moment), per cert: Your plant says it once in a
   * calm line ("Kai grew to Elder."), then forgets it.
   */
  quietGrowth: Record<string, number>;
  /** Mobile 1.18: each plant reaction's occasion id → when it played (once ever per occasion). */
  reactions: Record<string, number>;
  /** Mobile 1.18: the proud occasions written down, with the keepsake cap applied (engine/proud.ts). */
  proud: ProudLog;
  /** Mobile 1.24: the reminder ask. `first`: the answer to the Day-1 ask; `second`: the one second chance was shown. */
  /**
   * `newLearner`: onboarded on 1.24 or later (the second ask is only for them).
   * `turnedOff`: turned reminders off in Settings (never asked again).
   */
  reminderAsk: { first?: AskAnswer; second?: boolean; newLearner?: boolean; turnedOff?: boolean };
  /** Mobile 1.41: the beta tester switch and its card (engine/betaTester.ts). Unset = off. */
  tester?: TesterState;
  /** Mobile 1.41: the name ask on Today ('due' after a 1.41+ onboarding, 'shown' once asked). */
  nameAsk?: 'due' | 'shown';
  /** Mobile 1.41: "Not now" on the first-set screen's plant offer. */
  plantOffer?: 'later';
  setTester: (state: TesterState) => void;
  setNameAsk: (v: 'due' | 'shown') => void;
  setPlantOffer: (v: 'later') => void;
  see: (key: string, values: number[]) => void;
  played: (kind: string) => void;
  /** Marks `key`'s first view of the day as used (false: it already was today). */
  claimDay: (key: string, day: string) => boolean;
  /** After a restore: forget what was shown (moments and days stay). */
  forgetValues: () => void;
  /** The badge case was viewed at `at` (clears the "new" dot). */
  seeCase: (certId: string, at: number) => void;
  /** A badge moment played at `at`. */
  noteBadgeMoment: (at: number) => void;
  setBadgeSort: (sort: string) => void;
  noteQuietGrowth: (certId: string, growth: number) => void;
  /** Your plant showed the quiet grow-up line. */
  seeQuietGrowth: (certId: string) => void;
  /** A plant reaction for this occasion played at `at` (or was spent by the growth sequence). */
  noteReaction: (id: string, at: number) => void;
  /** Write down today's proud occasions (the cap applies here). No save when nothing is new. */
  noteProud: (occasions: readonly ProudOccasion[], now: number) => void;
  /** The reminder ask was answered (`which` 'first') or its second chance was shown ('second'). */
  noteReminderAsk: (which: 'first' | 'second', answer?: AskAnswer) => void;
  /** Marks the learner as onboarded on 1.24+ ('newLearner') or as having turned reminders off ('turnedOff'). */
  noteReminderFlag: (flag: 'newLearner' | 'turnedOff') => void;
}

/** Badge moments kept (the cap counts the last 7 days, and allows 3). */
export const BADGE_MOMENTS_MAX = 3;

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
      caseSeen: {},
      badgeMoments: [],
      seeCase: (certId, at) => set((s) => (s.caseSeen[certId] !== undefined && s.caseSeen[certId] >= at ? s : { caseSeen: { ...s.caseSeen, [certId]: at } })),
      noteBadgeMoment: (at) => set((s) => ({ badgeMoments: [...s.badgeMoments, at].slice(-BADGE_MOMENTS_MAX) })),
      setBadgeSort: (badgeSort) => set({ badgeSort }),
      quietGrowth: {},
      reactions: {},
      proud: {},
      reminderAsk: {},
      setTester: (tester) => set({ tester }),
      // 'shown' is final: a later onboarding (a restore on a fresh phone) never asks again.
      setNameAsk: (v) => set((s) => (s.nameAsk === 'shown' || s.nameAsk === v ? s : { nameAsk: v })),
      setPlantOffer: (plantOffer) => set({ plantOffer }),
      noteReminderAsk: (which, answer) =>
        set((s) => ({ reminderAsk: which === 'first' ? { ...s.reminderAsk, first: answer } : { ...s.reminderAsk, second: true } })),
      noteReminderFlag: (flag) => set((s) => (s.reminderAsk?.[flag] ? s : { reminderAsk: { ...s.reminderAsk, [flag]: true } })),
      noteReaction: (id, at) =>
        set((s) => {
          if (s.reactions?.[id] !== undefined) return s;
          const next: Record<string, number> = {};
          // Keep the last two weeks only (an occasion id carries its own day).
          for (const [k, v] of Object.entries(s.reactions ?? {})) if (at - v <= PROUD_KEEP_DAYS * DAY_MS) next[k] = v;
          next[id] = at;
          return { reactions: capped(next) };
        }),
      noteProud: (occasions, now) =>
        set((s) => {
          const log = s.proud ?? {};
          const next = admitProud(log, occasions, now);
          return next === log ? s : { proud: next };
        }),
      noteQuietGrowth: (certId, growth) => set((s) => ({ quietGrowth: { ...s.quietGrowth, [certId]: Math.max(growth, s.quietGrowth?.[certId] ?? 0) } })),
      seeQuietGrowth: (certId) =>
        set((s) => {
          if (s.quietGrowth?.[certId] === undefined) return s;
          const next = { ...s.quietGrowth };
          delete next[certId];
          return { quietGrowth: next };
        }),
    }),
    { name: 'aurivan.seen.v1', storage: persistStorage, version: 1, onRehydrateStorage: watchHydration('seen') },
  ),
);
