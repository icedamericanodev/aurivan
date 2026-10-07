/**
 * The day's plan, frozen for the day, plus what the learner did today.
 *
 * Why freeze it: `todaysPlan()` (planner.ts) is recomputed from live progress,
 * so finishing "Review 20 due" would simply make that item vanish and the plan
 * could never be "done". The first time Today is shown each day we store a
 * snapshot of the plan and of readiness. Activities (a finished session, a
 * lesson, a game) tick off matching items. When every item is ticked, Today
 * shows the clearing card with the day's numbers and how readiness moved.
 *
 * Pure TypeScript: no React, no storage. The progress store persists it.
 */
import type { PlanItem } from './planner';
import type { Readiness } from './readiness';

export interface DayPlan {
  day: string; // "YYYY-MM-DD", local calendar day
  certId: string;
  items: PlanItem[];
  done: boolean[];
  /** Readiness when the day started, to show growth on the clearing card. */
  start: { score: number; domains: Record<string, number> };
  answered: number;
  correct: number;
  minutes: number;
  /** The clearing haptic plays once per day. */
  celebrated?: boolean;
  /**
   * Questions credited to each review/practice item so far today, summed
   * across sessions (so two 10-question sessions can finish a 20-question
   * item). Optional: plans saved before this field existed start at zero.
   */
  credit?: number[];
}

export type Activity =
  | {
      kind: 'session';
      mode: 'practice' | 'review' | 'mock';
      answered: number;
      total: number;
      minutes: number;
      /** Answered questions per domain id, so a domain-focused item only counts its own domain. */
      byDomain?: Record<string, number>;
    }
  | { kind: 'lesson'; lessonId: string; minutes: number }
  | { kind: 'game'; gameId: string; minutes: number };

/** A session counts toward a plan item once 80% of the planned questions are answered. */
export const SESSION_DONE_SHARE = 0.8;
/** Rough pace used for "about N min" estimates (CISA items take ~70 s each). */
export const MINUTES_PER_QUESTION = 1.2;
export const LESSON_MINUTES = 3;
export const GAME_MINUTES = 2;

export function newDayPlan(day: string, certId: string, items: PlanItem[], readiness: Readiness): DayPlan {
  const domains: Record<string, number> = {};
  for (const d of readiness.domains) domains[d.domainId] = d.mastery;
  return {
    day,
    certId,
    items,
    done: items.map(() => false),
    start: { score: readiness.score, domains },
    answered: 0,
    correct: 0,
    minutes: 0,
  };
}

/**
 * Swap today's plan for a freshly built one (the exam date changed, so the
 * day's advice changed). Today's numbers carry over: answers, minutes and the
 * readiness the day started at. The items start fresh (a new plan can't
 * inherit ticks from different items). A plan from another day or cert is
 * simply replaced.
 */
export function replanDay(old: DayPlan | undefined, fresh: DayPlan): DayPlan {
  if (!old || old.day !== fresh.day || old.certId !== fresh.certId) return fresh;
  return { ...fresh, start: old.start, answered: old.answered, correct: old.correct, minutes: old.minutes };
}

/** Questions needed to finish a review/practice item: 80% of the PLANNED count (never the session size). */
export function itemTarget(item: PlanItem): number {
  if (item.kind !== 'review' && item.kind !== 'practice') return 0;
  return Math.max(1, Math.ceil(item.count * SESSION_DONE_SHARE));
}

/**
 * How many of this activity's answers count toward this item.
 * Only sessions of the same mode count; a domain-focused item only counts
 * answers from that domain (a session without a per-domain breakdown gives
 * a domain item nothing, to stay honest).
 */
export function sessionCredit(item: PlanItem, a: Activity): number {
  if (item.kind !== 'review' && item.kind !== 'practice') return 0;
  if (a.kind !== 'session' || a.mode !== item.kind) return 0;
  const domainId = item.kind === 'practice' ? item.domainId : undefined;
  if (domainId) return Math.max(0, a.byDomain?.[domainId] ?? 0);
  return Math.max(0, a.answered);
}

/**
 * Does this activity, on its own, complete this plan item?
 * (logActivity also adds up answers from earlier sessions the same day.)
 */
export function activityMatches(item: PlanItem, a: Activity, already = 0): boolean {
  switch (item.kind) {
    case 'review':
    case 'practice': {
      const got = sessionCredit(item, a);
      return got > 0 && already + got >= itemTarget(item);
    }
    case 'mock':
      return a.kind === 'session' && a.mode === 'mock' && a.answered > 0;
    case 'lesson':
      return a.kind === 'lesson' && a.lessonId === item.lessonId;
    case 'game':
      return a.kind === 'game' && a.gameId === item.gameId;
  }
}

/**
 * Log an activity: adds its minutes, banks session answers toward the first
 * unticked matching review/practice item, and ticks the FIRST unticked item
 * it completes. Returns the same object when nothing changed (cheap for the store).
 */
export function logActivity(plan: DayPlan, a: Activity): { plan: DayPlan; ticked: boolean } {
  const minutes = plan.minutes + Math.max(0, Math.round(a.minutes));
  const credit = plan.items.map((_, k) => plan.credit?.[k] ?? 0);
  // A review/practice session banks its answers on the first open item of
  // the same kind, and ticks it once the day's total reaches the target.
  const bank = plan.items.findIndex((item, k) => !plan.done[k] && sessionCredit(item, a) > 0);
  let i: number;
  if (bank >= 0) {
    credit[bank] += sessionCredit(plan.items[bank], a);
    i = credit[bank] >= itemTarget(plan.items[bank]) ? bank : -1;
  } else {
    // Lessons, games and mocks tick the first open item they match.
    i = plan.items.findIndex((item, k) => !plan.done[k] && activityMatches(item, a));
  }
  if (i < 0) {
    if (bank < 0 && minutes === plan.minutes) return { plan, ticked: false };
    return { plan: { ...plan, minutes, credit }, ticked: false };
  }
  const done = plan.done.slice();
  done[i] = true;
  return { plan: { ...plan, done, minutes, credit }, ticked: true };
}

export function logAnswer(plan: DayPlan, correct: boolean): DayPlan {
  return { ...plan, answered: plan.answered + 1, correct: plan.correct + (correct ? 1 : 0) };
}

export function planComplete(plan: DayPlan): boolean {
  return plan.items.length > 0 && plan.done.every(Boolean);
}

/** Index of the item to do now (first unticked), or -1 when all are done. */
export function currentIndex(plan: DayPlan): number {
  return plan.done.findIndex((d) => !d);
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Three of three, done." — count-aware (spec §11 "Daily clearing card"). */
export function clearingTitle(plan: DayPlan): string {
  const n = plan.items.length;
  return `${capital(word(n))} of ${word(n)}, done.`;
}

/** Whole-percent accuracy for today, or null before any answer. */
export function dayAccuracy(plan: DayPlan): number | null {
  return plan.answered ? Math.round((plan.correct / plan.answered) * 100) : null;
}

/** The domain whose mastery grew most today, in whole points; null if none grew. */
export function biggestGrowth(plan: DayPlan, readiness: Readiness): { domainId: string; points: number } | null {
  let best: { domainId: string; points: number } | null = null;
  for (const d of readiness.domains) {
    const points = Math.round((d.mastery - (plan.start.domains[d.domainId] ?? 0)) * 100);
    if (points > 0 && (!best || points > best.points)) best = { domainId: d.domainId, points };
  }
  return best;
}

/** Rough minutes an item takes, for "about 15 min" on the Tomorrow preview. */
export function itemMinutes(item: PlanItem): number {
  switch (item.kind) {
    case 'review':
    case 'practice':
      return Math.max(1, Math.round(item.count * MINUTES_PER_QUESTION));
    case 'mock':
      return Math.round(item.questions * MINUTES_PER_QUESTION);
    case 'lesson':
      return LESSON_MINUTES;
    case 'game':
      return GAME_MINUTES;
  }
}
