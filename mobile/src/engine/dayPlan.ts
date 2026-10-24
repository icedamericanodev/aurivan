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
import { MINUTES_PER_QUESTION } from './pace';
import { itemMinutes, LESSON_MINUTES, type PlanItem } from './planner';
import type { Readiness } from './readiness';

// Re-exported so existing imports keep working; the values live in pace.ts and
// planner.ts (the planner sizes the day with the same minutes Today shows).
export { itemMinutes, LESSON_MINUTES, MINUTES_PER_QUESTION };

export interface DayPlan {
  day: string; // "YYYY-MM-DD", local calendar day
  certId: string;
  items: PlanItem[];
  done: boolean[];
  /** Readiness when the day started, to show growth on the clearing card. */
  start: { score: number; domains: Record<string, number> };
  answered: number;
  correct: number;
  /** Minutes studied today, kept with their fraction (seconds); rounded only when shown. */
  minutes: number;
  /** The clearing haptic plays once per day. */
  celebrated?: boolean;
  /**
   * Questions credited to each review/practice item so far today, summed
   * across sessions (so two 10-question sessions can finish a 20-question
   * item). Optional: plans saved before this field existed start at zero.
   */
  credit?: number[];
  /**
   * Mobile 1.15: the daily minutes this plan was sized for. Optional: plans
   * saved before 1.15 have none, and Today then shows no "about N min today".
   */
  budget?: number;
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

export function newDayPlan(day: string, certId: string, items: PlanItem[], readiness: Readiness, budget?: number): DayPlan {
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
    ...(budget ? { budget } : {}),
  };
}

/**
 * Swap today's plan for a freshly built one (the exam date changed, so the
 * day's advice changed). Today's numbers carry over: answers, minutes and the
 * readiness the day started at. So does what the learner already did
 * (code review M2): answers banked on an item move to the new item they
 * would count for (same kind; a domain item only from the same domain), and
 * a lesson, game or mock already done stays ticked if the new plan has it.
 * A plan from another day or cert is simply replaced.
 */
export function replanDay(old: DayPlan | undefined, fresh: DayPlan): DayPlan {
  if (!old || old.day !== fresh.day || old.certId !== fresh.certId) return fresh;
  const credit = fresh.items.map(() => 0);
  const done = fresh.items.map(() => false);
  const taken = new Set<number>();
  old.items.forEach((item, k) => {
    const banked = old.credit?.[k] ?? 0;
    const j = fresh.items.findIndex((f, x) => !taken.has(x) && carriesTo(item, f));
    if (j < 0) return;
    taken.add(j);
    if (item.kind === 'review' || item.kind === 'practice') {
      credit[j] = banked;
      done[j] = banked > 0 && banked >= itemTarget(fresh.items[j]);
    } else {
      done[j] = old.done[k];
    }
  });
  return {
    ...fresh,
    done,
    ...(credit.some((n) => n > 0) ? { credit } : {}),
    start: old.start,
    answered: old.answered,
    correct: old.correct,
    minutes: old.minutes,
  };
}

/** Would what was done on `from` count for `to`? (replanDay) */
function carriesTo(from: PlanItem, to: PlanItem): boolean {
  switch (from.kind) {
    case 'review':
      return to.kind === 'review';
    case 'practice':
      // Answers from one domain count for a mixed item; mixed answers never count for a domain item.
      return to.kind === 'practice' && (!to.domainId || to.domainId === from.domainId);
    case 'lesson':
      return to.kind === 'lesson' && to.lessonId === from.lessonId;
    case 'game':
      return to.kind === 'game' && to.gameId === from.gameId;
    case 'mock':
      return to.kind === 'mock';
  }
}

/**
 * A mini mock beside timed items is OPTIONAL (PR #45, decided): the day
 * clears when the timed items are done, and the mock's row says "Optional
 * this week". A day with nothing but a mock is that mock.
 */
export function isOptional(items: readonly PlanItem[], i: number): boolean {
  return items[i]?.kind === 'mock' && items.some((x) => x.kind !== 'mock');
}

/** The items the day counts: every required one, and an optional one only once done. */
export function countedDone(plan: DayPlan): boolean[] {
  return plan.items.flatMap((_, k) => (plan.done[k] || !isOptional(plan.items, k) ? [Boolean(plan.done[k])] : []));
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
      // Exam week's full rehearsal (why 'final') is ticked by a full-length mock
      // only: a mini mock is still a mock, but not the one the plan offered (code review M4).
      // `total` is the session's length (lib/finishSession.ts).
      return a.kind === 'session' && a.mode === 'mock' && a.answered > 0 && (item.why !== 'final' || a.total >= item.questions);
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
  // Kept to the second (a fraction of a minute): Today rounds only for display,
  // so short sessions add up and a 5-second one never reads "1 min".
  const minutes = plan.minutes + (Number.isFinite(a.minutes) ? Math.max(0, a.minutes) : 0);
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

/** Every required item is done (an optional mock may still be open). */
export function planComplete(plan: DayPlan): boolean {
  return plan.items.length > 0 && plan.items.every((_, k) => plan.done[k] || isOptional(plan.items, k));
}

/** Index of the item to do now (the first unticked required one), or -1 when all are done. */
export function currentIndex(plan: DayPlan): number {
  return plan.items.findIndex((_, k) => !plan.done[k] && !isOptional(plan.items, k));
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Three of three, done." — count-aware (spec §11 "Daily clearing card"). */
export function clearingTitle(plan: DayPlan): string {
  // An optional mock left for another day is not part of "N of N".
  const n = countedDone(plan).length;
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

// ── Mobile 1.41: "Short on time? 5 questions" ────────────────────────────
/** The short path's size: five questions, about 6 minutes at study pace. */
export const SHORT_SET_SIZE = 5;

/**
 * The plan item the short path starts, or -1 when Today should not offer it.
 * Offered only BEFORE the day's plan has started (nothing ticked, no answers
 * banked), never on the first-set day (that set is already five questions),
 * never in exam week (the caller passes `examWeek`), and never when the plan
 * has no review or practice item (a mock-only day). A plan that is already a
 * single item of five questions or fewer has nothing shorter to offer.
 * Its answers bank on this item through logActivity, so they count toward it.
 */
export function shortSetItem(plan: DayPlan, opts: { examWeek: boolean }): number {
  if (opts.examWeek || plan.items.length === 0) return -1;
  if (plan.done.some(Boolean) || (plan.credit ?? []).some((n) => n > 0)) return -1;
  if (plan.items.some((it) => it.kind === 'practice' && it.why === 'first')) return -1;
  const i = plan.items.findIndex((it) => it.kind === 'review' || it.kind === 'practice');
  if (i < 0) return -1;
  const item = plan.items[i];
  if (plan.items.length === 1 && (item.kind === 'review' || item.kind === 'practice') && item.count <= SHORT_SET_SIZE) return -1;
  return i;
}
