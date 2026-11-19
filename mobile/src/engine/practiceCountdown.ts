/**
 * Practice countdown (mobile 2.2): an OPTIONAL, GENTLE time budget for a practice set.
 *
 * Plain English for the founder:
 * - Practice has three timer choices: Untimed, Count up (the timer from Build D) and Countdown.
 *   A learner who only ever switched "Timed" on keeps COUNT UP. Nothing here turns an old choice
 *   into a countdown: a countdown exists only when a set was started with one.
 * - The budget counts ANSWERING time only: the time a question is on screen, unanswered, with the
 *   app in front. It stands still while the explanation is open (exactly like the count-up timer),
 *   while the app is in the background, and while the app is closed.
 * - We save how much time was USED (`usedMs`), never "the clock time it ends at". So changing the
 *   phone's clock cannot add or remove time, and a set closed for a week has the same time left.
 * - At zero nothing is submitted and nothing is marked wrong. The countdown stops ONCE
 *   (`expiredAfter`) and the learner chooses: finish now, or keep going untimed (`after`).
 *
 * This is NOT the mock exam's clock. A mock keeps its own strict `deadline` (store/session.ts) and
 * its own code; nothing in this file reads or writes it.
 *
 * Pure TypeScript: no React, no storage, no clock of its own (the caller passes the time in).
 */

/** The three timer choices for practice. */
export type PracticeTimerKind = 'untimed' | 'countUp' | 'countdown';

/** The paces offered for a countdown, in seconds per question (the middle one is close to exam pace). */
export const COUNTDOWN_PACES = [60, 90, 120] as const;
/** The pace chosen until the learner picks another. */
export const DEFAULT_COUNTDOWN_PACE = 90;

/** The shortest and longest budget we accept: 1 minute to 4 hours (the real exam's own length). */
export const MIN_COUNTDOWN_MS = 60_000;
export const MAX_COUNTDOWN_MS = 4 * 60 * 60_000;
/** The longest set and the slowest pace a budget may be worked out from. */
const MAX_QUESTIONS = 500;
const MAX_PACE_SEC = 600;

/**
 * The most time ONE tick may add. The screen ticks once a second; if a tick arrives late (a busy
 * phone) or the phone's clock jumped forward, it still adds at most this much. A clock that jumped
 * BACKWARD adds nothing. Any doubt is settled in the learner's favour.
 */
export const MAX_STEP_MS = 5_000;

/** What is saved on the session (store/session.ts `countdown`). All plain numbers and words. */
export interface PracticeCountdown {
  /** The whole budget, in ms. */
  budgetMs: number;
  /** Answering time used so far, in ms (0..budgetMs). Never a wall-clock time. */
  usedMs: number;
  /** Set ONCE, when the budget ran out: how many questions were answered at that moment. */
  expiredAfter?: number;
  /** The learner's answer on the time's-up sheet: carry on with no timer, or finish there. */
  after?: 'untimed' | 'finished';
}

/** Where a countdown stands: ticking, at zero waiting for the learner's choice, or after that choice. */
export type CountdownStage = 'running' | 'expired' | 'untimed' | 'finished';

const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** A budget we accept: a real number from 1 minute to 4 hours. Zero, negative, NaN, Infinity and text are refused. */
export function validBudgetMs(x: unknown): x is number {
  return isCount(x) && x >= MIN_COUNTDOWN_MS && x <= MAX_COUNTDOWN_MS;
}

/**
 * Whole minutes for `count` questions at `secPerQuestion` (rounded UP, so 5 questions at 90 s is
 * 8 min, never 7.5), or null when either number is not sensible or the result is out of range.
 */
export function countdownMinutes(count: unknown, secPerQuestion: unknown): number | null {
  if (!isCount(count) || !isCount(secPerQuestion)) return null;
  if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTIONS) return null;
  if (secPerQuestion < 1 || secPerQuestion > MAX_PACE_SEC) return null;
  const minutes = Math.ceil((count * secPerQuestion) / 60);
  return validBudgetMs(minutes * 60_000) ? minutes : null;
}

/** One choice on the set-up: the pace it stands for and the whole minutes it gives this set. */
export interface CountdownChoice {
  secPerQuestion: number;
  minutes: number;
}

/**
 * The countdown lengths offered for a set of `count` questions: about 60, 90 and 120 seconds per
 * question, as whole minutes (10 questions: 10, 15 and 20 min). Two paces that give the same
 * minutes (a 1-question set) are offered once. Empty for a set with no questions.
 */
export function countdownChoices(count: number): CountdownChoice[] {
  const out: CountdownChoice[] = [];
  for (const secPerQuestion of COUNTDOWN_PACES) {
    const minutes = countdownMinutes(count, secPerQuestion);
    if (minutes !== null && !out.some((c) => c.minutes === minutes)) out.push({ secPerQuestion, minutes });
  }
  return out;
}

/** The choice for a pace, or the nearest one offered (two paces can share one length in a tiny set). */
export function choiceFor(choices: readonly CountdownChoice[], secPerQuestion: number): CountdownChoice | undefined {
  return choices.reduce<CountdownChoice | undefined>(
    (best, c) => (!best || Math.abs(c.secPerQuestion - secPerQuestion) < Math.abs(best.secPerQuestion - secPerQuestion) ? c : best),
    undefined,
  );
}

/** "10 questions · 15 min" ("1 question · 2 min"). The set's own length, never the bank's. */
export function countdownLabel(count: number, minutes: number): string {
  return `${count} ${count === 1 ? 'question' : 'questions'} · ${minutes} min`;
}

/** A fresh countdown with nothing used, or null when the budget is not one we accept. */
export function newCountdown(budgetMs: unknown): PracticeCountdown | null {
  return validBudgetMs(budgetMs) ? { budgetMs, usedMs: 0 } : null;
}

/** A fresh countdown for a set of `count` questions at a pace, or null (the set then counts up). */
export function countdownFor(count: unknown, secPerQuestion: unknown): PracticeCountdown | null {
  const minutes = countdownMinutes(count, secPerQuestion);
  return minutes === null ? null : newCountdown(minutes * 60_000);
}

/**
 * Read a SAVED countdown, trusting nothing (a save can be damaged or edited). Returns a clean copy,
 * or null when it cannot be trusted; the set then simply counts up, and nothing crashes.
 * - the budget must be a valid one;
 * - `usedMs` must be a real number, zero or more (more than the budget reads as "all used");
 * - `expiredAfter` and `after` are kept only when they are well formed; a choice without an expiry
 *   is dropped (there was nothing to answer yet).
 */
export function readCountdown(raw: unknown): PracticeCountdown | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!validBudgetMs(r.budgetMs)) return null;
  if (!isCount(r.usedMs) || r.usedMs < 0) return null;
  const out: PracticeCountdown = { budgetMs: r.budgetMs, usedMs: Math.min(r.usedMs, r.budgetMs) };
  if (isCount(r.expiredAfter) && Number.isInteger(r.expiredAfter) && r.expiredAfter >= 0) {
    out.expiredAfter = r.expiredAfter;
    // An expired countdown has no time left, whatever the saved number says.
    out.usedMs = out.budgetMs;
    if (r.after === 'untimed' || r.after === 'finished') out.after = r.after;
  }
  return out;
}

/**
 * Which timer a saved session has. Old sessions know only `timed: true`: that is COUNT UP, as it
 * always was. A countdown needs BOTH `timed: true` and a countdown that reads cleanly; a damaged one
 * falls back to count up. A mock exam is never any of these (it has its own clock).
 */
export function timerKindOf(s: { mode?: unknown; timed?: unknown; countdown?: unknown } | null | undefined): PracticeTimerKind {
  if (!s || s.mode === 'mock' || s.timed !== true) return 'untimed';
  return readCountdown(s.countdown) ? 'countdown' : 'countUp';
}

/**
 * The timer a saved "Timed practice" setting stands for. The setting is an on/off switch from
 * Build D: on is COUNT UP, off (or anything else) is untimed. It can never mean a countdown.
 */
export function timerKindFromSetting(practiceTimer: unknown): Exclude<PracticeTimerKind, 'countdown'> {
  return practiceTimer === true ? 'countUp' : 'untimed';
}

/** Time left, in ms, never negative. */
export function remainingMs(c: PracticeCountdown): number {
  return Math.max(0, c.budgetMs - c.usedMs);
}

export function stageOf(c: PracticeCountdown): CountdownStage {
  if (c.expiredAfter === undefined) return 'running';
  return c.after ?? 'expired';
}

/**
 * Add answering time. `answered` is how many questions are answered right now; it is written down
 * the ONE time the budget runs out. Returns the same object when nothing changes (not running any
 * more, or nothing sensible to add), so calling it again and again can never expire twice.
 */
export function bankMs(c: PracticeCountdown, ms: unknown, answered: number): PracticeCountdown {
  if (stageOf(c) !== 'running') return c;
  const add = isCount(ms) && ms > 0 ? ms : 0;
  const usedMs = Math.min(c.budgetMs, c.usedMs + add);
  if (usedMs < c.budgetMs) return usedMs === c.usedMs ? c : { ...c, usedMs };
  const count = isCount(answered) && answered > 0 ? Math.floor(answered) : 0;
  return { ...c, usedMs: c.budgetMs, expiredAfter: count };
}

/**
 * The learner's answer on the time's-up sheet. Only once, and only at zero: before the expiry or
 * after a choice was made it returns the same object (a second tap changes nothing).
 */
export function chooseAfter(c: PracticeCountdown, choice: 'untimed' | 'finished'): PracticeCountdown {
  if (stageOf(c) !== 'expired') return c;
  return { ...c, after: choice };
}

// ── The meter: turning ticks into answering time ───────────────────────────

/**
 * The meter is never saved. It only remembers when it last ticked (`lastAt`, in ms from ANY clock
 * that moves forward), or null while it is stopped: the explanation is open, the app is in the
 * background, the time's-up sheet is showing. A meter that restarts after a week therefore adds
 * nothing for the week.
 */
export interface CountdownMeter {
  lastAt: number | null;
}

export const STOPPED_METER: CountdownMeter = { lastAt: null };

/** Start (or restart) the meter now. Time before this moment is never counted. */
export function startMeter(now: number): CountdownMeter {
  return { lastAt: now };
}

/**
 * One tick: the time since the last tick, at least 0 (the clock went backward) and at most
 * MAX_STEP_MS (the clock jumped forward, or the tick was late). A stopped meter adds nothing.
 */
export function stepMeter(meter: CountdownMeter, now: number): { meter: CountdownMeter; addMs: number } {
  if (meter.lastAt === null) return { meter, addMs: 0 };
  const gap = now - meter.lastAt;
  // Whole ms (a steady clock answers in fractions), so what is saved stays a whole number.
  const addMs = Number.isFinite(gap) ? Math.round(Math.min(MAX_STEP_MS, Math.max(0, gap))) : 0;
  return { meter: { lastAt: Number.isFinite(now) ? now : meter.lastAt }, addMs };
}

// ── What is said, and when ────────────────────────────────────────────────

/** The two moments a screen reader is told the time (never every second). Zero is the sheet's own title. */
export type CountdownCue = 'five' | 'one';
export const COUNTDOWN_CUE_LINE: Record<CountdownCue, string> = {
  five: '5 minutes left.',
  one: '1 minute left.',
};
const CUE_AT: [CountdownCue, number][] = [
  ['one', 60_000],
  ['five', 5 * 60_000],
];

/**
 * The cue to say when the time left goes from `beforeMs` to `afterMs`: only at the moment it
 * passes 5 minutes or 1 minute (from above the mark to on or under it), and never at zero (the
 * time's-up sheet speaks for itself). The time only ever goes down, so each cue is said once; a set
 * that STARTS at 5 minutes, or is reopened with 4 left, says nothing.
 */
export function countdownCue(beforeMs: number, afterMs: number): CountdownCue | null {
  if (!(afterMs > 0)) return null;
  for (const [cue, at] of CUE_AT) if (beforeMs > at && afterMs <= at) return cue;
  return null;
}

/** The last minute's line on the strip (words, never colour alone), and its short form at large text. */
export const LAST_MINUTE_LINE = 'Last minute. At zero you choose what happens.';
export const LAST_MINUTE_SHORT = 'Last minute';

/** The time's-up sheet. Two choices, nothing else. */
export const TIMES_UP_TITLE = 'Time’s up';
export const KEEP_GOING_LABEL = 'Keep going untimed';
export const FINISH_NOW_LABEL = 'Finish now';

/** The sheet's words: what happened, and that nothing was taken away. */
export function timesUpBody(answered: number, total: number): string {
  return `You answered ${answered} of ${total}. Those answers are saved. The rest are not marked wrong.`;
}

/**
 * The truthful line on Results for a set that had a countdown, shown and spoken. Null without one.
 * - "Time ran out after 7 of 10. You kept going untimed."
 * - "Time ran out after 7 of 10. You finished there."
 * - "Finished inside your 15 min countdown." (it never ran out)
 */
export function countdownResult(c: PracticeCountdown | null, total: number): { text: string; spoken: string } | null {
  if (!c) return null;
  if (c.expiredAfter === undefined) {
    const minutes = Math.round(c.budgetMs / 60_000);
    return {
      text: `Finished inside your ${minutes} min countdown.`,
      spoken: `Finished inside your ${minutes} minute countdown.`,
    };
  }
  const ranOut = `Time ran out after ${Math.min(c.expiredAfter, total)} of ${total}.`;
  const then = c.after === 'untimed' ? ' You kept going untimed.' : c.after === 'finished' ? ' You finished there.' : '';
  return { text: ranOut + then, spoken: ranOut + then };
}
