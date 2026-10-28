/**
 * Home-screen widgets (mobile 1.47): this phone's widget choices and the
 * local counters for the beta measurement plan.
 *
 * Kept ON THIS PHONE only, on purpose:
 * - not in the learner's backup file and never synced: widgets belong to this
 *   phone's home screen, and these choices are about who can see that screen;
 * - "Remove my progress from this phone" resets it (lib/backup.ts wipeLocalStudy);
 * - the counters are never sent anywhere. A beta tester reads them on screen
 *   (Help → Widget numbers on this phone) and types them into an email
 *   themselves (the engine/betaTester.ts pattern). Any app can send a widget
 *   link, so the open counts are indicative, not exact.
 *
 * Loading it never blocks the app: if it can't be read, the defaults apply
 * (readiness and exam timing off, details on).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WIDGET_PREFS, WIDGET_KINDS, type DetailsPref, type ReadinessPref, type WidgetKind, type WidgetPrefs } from '../engine/widgets';
import { daysBetween } from '../engine/streak';
import { persistStorage } from './storage';

/** One widget kind seen placed on the home screen: the first and last day seen, and when it was removed. */
export interface KindSeen {
  first: string;
  last: string;
  /** App opens in a row with this kind missing (it counts as removed at 2). */
  missing?: number;
  /** The day it counted as removed. */
  gone?: string;
}

/** Days kept in the 60-day histories. */
export const HISTORY_DAYS = 60;
/** App opens in a row a kind must be missing before it counts as removed. */
export const GONE_AFTER_OPENS = 2;

export interface WidgetStats {
  /** Opens of the app from a widget tap, per kind. */
  opens: Partial<Record<WidgetKind, number>>;
  /** Sessions that really started from a widget tap, per kind. */
  started: Partial<Record<WidgetKind, number>>;
  /** Sessions started from a widget that were finished with at least 3 answers (or all, if fewer), per kind. */
  completed: Partial<Record<WidgetKind, number>>;
  /** Days today's plan was cleared where the day's first session came from that widget kind. */
  cleared: Partial<Record<WidgetKind, number>>;
  /** Kinds seen on the home screen, by day. */
  seen: Partial<Record<WidgetKind, KindSeen>>;
  /** The last 60 study days and the last 60 days with a widget open (day keys). */
  studyDays: string[];
  widgetDays: string[];
  /** The day's first session, when a widget started it (for `cleared`). */
  firstStart?: { day: string; kind: WidgetKind };
  /** The days `cleared` was counted (once a day). */
  clearedOn?: string;
}

/** The widget tester cards (Today, behind "I'm a beta tester"): answered ids and a "Not today". */
export interface WidgetTesterState {
  answered: string[];
  skipped?: string;
}

export interface WidgetState {
  prefs: WidgetPrefs;
  /** The day widget rotations count from (Today's rule starts at the first rule for a new learner). */
  anchorDay?: string;
  /** Recall card picks by day (was the Quick question's; the same key), so today's card never changes once chosen (last 7 days). */
  quizPicks: Record<string, string>;
  /** Today's rule picks by day (last 14 days: the rotation avoids repeats within 5). */
  thinkPicks: Record<string, string>;
  /** The one "add a widget" suggestion: once shown it never comes back, whatever the answer. */
  offer?: { shownOn: string; answer?: 'added' | 'not-now' };
  /** The day readiness was set to show its number (the one re-ask comes 30 days later). */
  readinessShownSince?: string;
  readinessAsked?: boolean;
  /**
   * Mobile 1.48: the readiness rings as they were at this week's first widget
   * write (by the week's Monday), so the widget can say which ring grew this
   * week. Kept on this phone only; a ring that shrank is never mentioned.
   */
  ringWeek?: { monday: string; rings: number[] };
  /** Mobile 1.48: the Monday Road to exam starts from (the first study week this phone knows of). */
  roadFrom?: string;
  stats: WidgetStats;
  tester: WidgetTesterState;

  setDetails: (d: DetailsPref) => void;
  setReadiness: (r: ReadinessPref, today?: string) => void;
  setTiming: (on: boolean) => void;
  setAnchor: (day: string) => void;
  rememberPicks: (picks: Record<string, string>) => void;
  rememberRules: (picks: Record<string, string>) => void;
  /** Keep this week's starting rings (only the first call of a week counts). */
  noteRings: (monday: string, rings: readonly number[]) => void;
  /** Move the road's start earlier (never later). */
  noteRoadFrom: (monday: string) => void;
  showOffer: (day: string) => void;
  answerOffer: (answer: 'added' | 'not-now') => void;
  answerReadinessAsk: (keep: boolean) => void;
  noteOpen: (kind: WidgetKind | null, day: string) => void;
  noteStarted: (kind: WidgetKind, day: string, firstOfDay: boolean) => void;
  noteCompleted: (kind: WidgetKind) => void;
  noteCleared: (day: string) => void;
  noteStudyDay: (day: string) => void;
  /** Merge the app's own recent study days in (so "28 days before your first widget" has history). */
  seedStudyDays: (days: readonly string[], today: string) => void;
  noteSeen: (kinds: readonly WidgetKind[], day: string) => void;
  answerTester: (id: string) => void;
  skipTester: (day: string) => void;
}

export const EMPTY_STATS: WidgetStats = { opens: {}, started: {}, completed: {}, cleared: {}, seen: {}, studyDays: [], widgetDays: [] };
const bump = (m: Partial<Record<WidgetKind, number>>, k: WidgetKind) => ({ ...m, [k]: (m[k] ?? 0) + 1 });
/** Add a day to a 60-day history (sorted, no repeats). */
export function addDay(days: readonly string[], day: string): string[] {
  if (days.includes(day)) return [...days];
  return [...days, day].sort().filter((d) => daysBetween(d, day) < HISTORY_DAYS).slice(-HISTORY_DAYS);
}
const keepLast = (m: Record<string, string>, extra: Record<string, string>, n: number) => {
  const merged = { ...m, ...extra };
  const keys = Object.keys(merged).sort().slice(-n);
  return Object.fromEntries(keys.map((k) => [k, merged[k]]));
};

/** The store's starting data (also what "Remove my progress from this phone" puts back). */
export const WIDGET_STORE_INITIAL = {
  prefs: { ...DEFAULT_WIDGET_PREFS },
  quizPicks: {},
  thinkPicks: {},
  stats: EMPTY_STATS,
  tester: { answered: [] },
} as const;

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set) => ({
      prefs: { ...DEFAULT_WIDGET_PREFS },
      quizPicks: {},
      thinkPicks: {},
      stats: EMPTY_STATS,
      tester: { answered: [] },
      setDetails: (details) => set((s) => ({ prefs: { ...s.prefs, details } })),
      setReadiness: (readiness, today) =>
        set((s) => ({
          prefs: { ...s.prefs, readiness },
          // The 30-day re-ask counts from the day the number was chosen.
          ...(readiness === 'show' && s.prefs.readiness !== 'show' && today ? { readinessShownSince: today } : {}),
        })),
      setTiming: (timing) => set((s) => ({ prefs: { ...s.prefs, timing } })),
      setAnchor: (day) => set((s) => (s.anchorDay ? s : { anchorDay: day })),
      rememberPicks: (picks) =>
        set((s) => {
          const next = keepLast(s.quizPicks, picks, 7);
          return JSON.stringify(next) === JSON.stringify(s.quizPicks) ? s : { quizPicks: next };
        }),
      rememberRules: (picks) =>
        set((s) => {
          const next = keepLast(s.thinkPicks, picks, 14);
          return JSON.stringify(next) === JSON.stringify(s.thinkPicks) ? s : { thinkPicks: next };
        }),
      noteRings: (monday, rings) => set((s) => (s.ringWeek?.monday === monday ? s : { ringWeek: { monday, rings: [...rings] } })),
      noteRoadFrom: (monday) => set((s) => (s.roadFrom && s.roadFrom <= monday ? s : { roadFrom: monday })),
      showOffer: (day) => set((s) => (s.offer ? s : { offer: { shownOn: day } })),
      answerOffer: (answer) => set((s) => ({ offer: { shownOn: s.offer?.shownOn ?? '', answer } })),
      answerReadinessAsk: (keep) => set((s) => ({ readinessAsked: true, prefs: keep ? s.prefs : { ...s.prefs, readiness: 'private' } })),
      noteOpen: (kind, day) =>
        set((s) => (kind ? { stats: { ...s.stats, opens: bump(s.stats.opens, kind), widgetDays: addDay(s.stats.widgetDays, day) } } : s)),
      noteStarted: (kind, day, firstOfDay) =>
        set((s) => ({ stats: { ...s.stats, started: bump(s.stats.started, kind), ...(firstOfDay ? { firstStart: { day, kind } } : {}) } })),
      noteCompleted: (kind) => set((s) => ({ stats: { ...s.stats, completed: bump(s.stats.completed, kind) } })),
      noteCleared: (day) =>
        set((s) => {
          const f = s.stats.firstStart;
          if (!f || f.day !== day || s.stats.clearedOn === day) return s;
          return { stats: { ...s.stats, cleared: bump(s.stats.cleared, f.kind), clearedOn: day } };
        }),
      noteStudyDay: (day) => set((s) => (s.stats.studyDays.includes(day) ? s : { stats: { ...s.stats, studyDays: addDay(s.stats.studyDays, day) } })),
      seedStudyDays: (days, today) =>
        set((s) => {
          const add = days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today && daysBetween(d, today) < HISTORY_DAYS && !s.stats.studyDays.includes(d));
          if (!add.length) return s;
          return { stats: { ...s.stats, studyDays: [...s.stats.studyDays, ...add].sort().slice(-HISTORY_DAYS) } };
        }),
      noteSeen: (kinds, day) =>
        set((s) => {
          const seen = { ...s.stats.seen };
          let changed = false;
          for (const k of WIDGET_KINDS) {
            const was = seen[k];
            if (kinds.includes(k)) {
              if (!was) seen[k] = { first: day, last: day };
              else if (was.last !== day || was.missing || was.gone) seen[k] = { first: was.first, last: day };
              else continue;
              changed = true;
            } else if (was && !was.gone) {
              // Removed only after it is missing on 2 app opens in a row (a launcher can briefly report none).
              const missing = (was.missing ?? 0) + 1;
              seen[k] = missing >= GONE_AFTER_OPENS ? { first: was.first, last: was.last, gone: day } : { ...was, missing };
              changed = true;
            }
          }
          return changed ? { stats: { ...s.stats, seen } } : s;
        }),
      answerTester: (id) => set((s) => (s.tester.answered.includes(id) ? s : { tester: { ...s.tester, answered: [...s.tester.answered, id].slice(-20) } })),
      skipTester: (day) => set((s) => ({ tester: { ...s.tester, skipped: day } })),
    }),
    {
      name: 'aurivan.widgetPrefs.v1',
      storage: persistStorage,
      version: 1,
      // Anything odd in the saved copy falls back to the safe defaults (off, details on).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WidgetState> & { prefs?: Partial<WidgetPrefs> & { countdown?: boolean } };
        const prefs = p.prefs ?? DEFAULT_WIDGET_PREFS;
        const obj = (x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, string>) : {});
        const days = (x: unknown) => (Array.isArray(x) ? x.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-HISTORY_DAYS) : []);
        const stats = { ...EMPTY_STATS, ...(p.stats ?? {}) };
        return {
          ...current,
          ...p,
          prefs: {
            details: prefs.details === 'hide' ? 'hide' : 'show',
            readiness: prefs.readiness === 'show' || prefs.readiness === 'private' ? prefs.readiness : 'off',
            timing: prefs.timing === true,
          },
          quizPicks: obj(p.quizPicks),
          thinkPicks: obj(p.thinkPicks),
          ringWeek:
            p.ringWeek && typeof p.ringWeek.monday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.ringWeek.monday) && Array.isArray(p.ringWeek.rings)
              ? { monday: p.ringWeek.monday, rings: p.ringWeek.rings.slice(0, 8).map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)) }
              : undefined,
          roadFrom: typeof p.roadFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.roadFrom) ? p.roadFrom : undefined,
          stats: { ...stats, studyDays: days(stats.studyDays), widgetDays: days(stats.widgetDays) },
          tester: { answered: Array.isArray(p.tester?.answered) ? p.tester.answered.filter((x): x is string => typeof x === 'string').slice(-20) : [], ...(typeof p.tester?.skipped === 'string' ? { skipped: p.tester.skipped } : {}) },
        };
      },
    },
  ),
);
