/**
 * The first days, in words and rules (mobile 1.24, "first five minutes").
 * Pure TypeScript: no React, no storage, no notifications. The screens
 * (onboarding, the Day-1 closing screen, Today) only show what this returns.
 *
 * Plain English for the founder:
 * - `planConsequence`: the one line under the exam date and daily minutes,
 *   so the learner sees what their two choices add up to.
 * - `firstSetFact`: the single fact under "3 of 5 right" (the topic most missed, or
 *   "All five right.").
 * - `tomorrowPreview`: "A 12-minute lesson on X, then 5 questions", built
 *   from the plan the app would make next.
 * - `firstRange`: strongest and weakest domain for the calm "Your first
 *   readiness range" panel.
 * - The reminder rules: the default time (the hour you are studying now) and
 *   when the one second chance may show (never more than once, never after
 *   the phone said no).
 */
import { itemMinutes, type PlanItem } from './planner';
import { localTime } from './reminders';

// ── Onboarding: what the two choices add up to ───────────────────────────
/** "6 weeks", "10 days", "3 months": a span of days in the words a learner would use. */
export function spanLabel(days: number): string {
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 120) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

/**
 * The line under the exam date and daily minutes: "6 weeks: 20 min a day
 * adds up to about 14 hours of study." No date yet says what the plan will
 * do instead. A date that has passed or is today reads like "no date" (the
 * onboarding presets never offer one).
 */
export function planConsequence(daysLeft: number | null, minutes: number): string {
  if (daysLeft === null || daysLeft < 1) return `No date yet: your plan starts at about ${minutes} min a day. Add your date any time in Settings and it will fit.`;
  const total = daysLeft * minutes;
  const study = total < 90 ? `${total} min` : `${Math.round(total / 60)} hours`;
  // "about" once (UX review nit): the minutes are the learner's own choice, the total is the estimate.
  return `${spanLabel(daysLeft)}: ${minutes} min a day adds up to about ${study} of study.`;
}

// ── Day-1 closing screen ─────────────────────────────────────────────────
/**
 * The one fact under "3 of 5 right". `topic`: the most-missed topic's name, when we have one.
 * One miss says "Missed:", since "Most missed" after a single miss overstates (UX review nit).
 */
export function firstSetFact(correct: number, total: number, topic?: string): string {
  if (total > 0 && correct >= total) return total === 1 ? 'Right.' : `All ${numberWord(total)} right.`;
  if (topic) return total - correct === 1 ? `Missed: ${topic}.` : `Most missed: ${topic}.`;
  return 'Every one you missed will come back, so it sticks.';
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** 0 to 10 as a word, bigger numbers as digits (capitalised by the caller where needed). */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/**
 * "The 2 you missed come back then." (null when nothing was missed). It sits under the "Tomorrow"
 * caption, so "then" is tomorrow; "2 will come back tomorrow." said the word twice (UX review nit).
 */
export function comeBackLine(missed: number): string | null {
  if (missed <= 0) return null;
  return missed === 1 ? 'The one you missed comes back then.' : `The ${missed} you missed come back then.`;
}

/**
 * Tomorrow, in one line, from the plan the app would build next (reviews are
 * left out: the closing screen says "The N you missed come back then." on its own line).
 * "A 12-minute lesson on Business impact analysis, then 5 questions".
 */
export function tomorrowPreview(plan: readonly PlanItem[]): string | null {
  const lesson = plan.find((i): i is Extract<PlanItem, { kind: 'lesson' }> => i.kind === 'lesson');
  const practice = plan.find((i): i is Extract<PlanItem, { kind: 'practice' }> => i.kind === 'practice');
  const qs = (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`;
  if (lesson && practice) return `A ${itemMinutes(lesson)}-minute lesson on ${lesson.title}, then ${qs(practice.count)}`;
  if (lesson) return `A ${itemMinutes(lesson)}-minute lesson on ${lesson.title}`;
  if (practice) return `${qs(practice.count)}, about ${itemMinutes(practice)} min`;
  return null;
}

// ── Today: "Your first readiness range" ──────────────────────────────────
export interface DomainStat {
  domainId: string;
  /** 0..1 */
  mastery: number;
  answered: number;
}

/**
 * The strongest and the weakest domain among those with answers, by mastery
 * (ties keep the order given). `weakest` is null when only one domain has
 * answers or every one is level, so the panel never names the same domain twice.
 */
export function firstRange(stats: readonly DomainStat[]): { strongest: string | null; weakest: string | null } {
  const seen = stats.filter((s) => s.answered > 0);
  if (seen.length === 0) return { strongest: null, weakest: null };
  let strongest = seen[0];
  let weakest = seen[0];
  for (const s of seen) {
    if (s.mastery > strongest.mastery) strongest = s;
    if (s.mastery < weakest.mastery) weakest = s;
  }
  if (strongest.domainId === weakest.domainId || strongest.mastery === weakest.mastery) return { strongest: strongest.domainId, weakest: null };
  return { strongest: strongest.domainId, weakest: weakest.domainId };
}

/**
 * The panel shows while the range is new: a learner who restores a backup
 * with hundreds of answers already has a mature range, so it is skipped for
 * them. `answered`: total answers when the range first shows.
 */
export const FIRST_RANGE_MAX_ANSWERS = 100;
export function firstRangePanelDue(opts: { enough: boolean; answered: number; seen: boolean }): boolean {
  return opts.enough && !opts.seen && opts.answered <= FIRST_RANGE_MAX_ANSWERS;
}

// ── Reminders: the one ask, and its one second chance ────────────────────
/** What the learner answered the first ask. 'on' = accepted and allowed; 'blocked' = the phone said no. */
export type AskAnswer = 'on' | 'later' | 'blocked';

/** The default study time: the hour they are studying now, on the hour (so "Tomorrow I'll study at 7 PM"). */
export function defaultReminderTime(now: number): { hour: number; minute: number } {
  return { hour: new Date(now).getHours(), minute: 0 };
}

/**
 * The reminder ask's words before the time chip (mobile 1.39). The button shows
 * these words and the chip beside it shows the time, so the row reads as one
 * sentence: "Remind me tomorrow at [7:00 PM]".
 */
export const REMINDER_ASK_LEAD = 'Remind me tomorrow at';

/** "Remind me tomorrow at 7:00 PM" (the phone's own time format): the whole sentence, as a screen reader says it. */
export function reminderAskLine(hour: number, minute: number, locale?: string): string {
  return `${REMINDER_ASK_LEAD} ${localTime(hour, minute, locale)}`;
}

/**
 * The second (and last) chance to ask: the learner has studied on 3 different
 * days, studied today, reminders are still off, the phone has not said no, and
 * this second ask has not been shown. After it, only Settings.
 *
 * It is a second chance, never a nag, so it is also never shown to:
 * - someone who said yes the first time (`first: 'on'`): if reminders are off
 *   now, they turned them off themselves;
 * - someone who turned reminders off in Settings (`turnedOff`);
 * - a learner who started before 1.24 (`newLearner` false: set when the 1.24
 *   onboarding finishes). They never had a first ask, and an upgrader with
 *   reminders off may well have turned them off on purpose in 1.23, which the
 *   app cannot tell apart from "never set".
 */
export function secondAskDue(opts: {
  supported: boolean;
  enabled: boolean;
  studyDays: number;
  studiedToday: boolean;
  first?: AskAnswer;
  secondShown: boolean;
  /** Onboarded on mobile 1.24 or later (useSeen reminderAsk.newLearner). */
  newLearner: boolean;
  /** Turned reminders off in Settings at some point (useSeen reminderAsk.turnedOff). */
  turnedOff: boolean;
}): boolean {
  if (!opts.supported || opts.enabled || opts.secondShown || opts.turnedOff || !opts.newLearner) return false;
  if (opts.first === 'blocked' || opts.first === 'on') return false;
  return opts.studiedToday && opts.studyDays >= 3;
}
