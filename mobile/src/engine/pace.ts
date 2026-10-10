/**
 * Pace: every number about time in the app, in one place.
 *
 * Two different paces live here, on purpose:
 *
 * 1. STUDY pace (MINUTES_PER_QUESTION, 1.2 min). Used only for "about N min"
 *    estimates (Today's plan, Practice, game lengths). A practice item is
 *    read, answered and its explanation skimmed in about 70 seconds.
 *
 * 2. EXAM pace (Build D). Used for every piece of pacing FEEDBACK (mock
 *    checkpoints, the practice results line, Daylight). It always comes from
 *    the certification's own exam facts, never a number typed on a screen:
 *    - exam pace   = exam minutes / questions. CISA: 240 / 150 = 96 s.
 *    - target pace = the same, but keeping REVIEW_RESERVE_MINUTES back to
 *      revisit flagged questions. CISA: (240 − 15) / 150 = 90 s.
 *
 * Plain English for the founder: a learner who answers at 90 s a question
 * finishes the real exam with about a quarter of an hour to spare.
 *
 * Pure TypeScript: no React, no storage. The rules come from the
 * behavioural-science review (timer and pacing, §2).
 */

/** Study pace for plan estimates (not pacing feedback). */
export const MINUTES_PER_QUESTION = 1.2;

// ── Exam facts → paces ────────────────────────────────────────────────────

/** The bits of a certification's exam facts that pace needs. */
export interface ExamFacts {
  questions: number;
  minutes: number;
}

/** Minutes kept back on the real exam to revisit flagged questions. */
export const REVIEW_RESERVE_MINUTES = 15;

/** Exam pace in seconds per question (CISA: 96). */
export function examPaceSeconds(exam: ExamFacts): number {
  return (exam.minutes * 60) / exam.questions;
}

/** Target pace in seconds per question, leaving time to revisit flags (CISA: 90). */
export function targetPaceSeconds(exam: ExamFacts): number {
  // Never below half the exam pace, for an exam too short for a 15-minute reserve.
  const reserve = Math.min(REVIEW_RESERVE_MINUTES, exam.minutes / 2);
  return ((exam.minutes - reserve) * 60) / exam.questions;
}

// ── Mock timing options (WCAG 2.2.1; ISACA grants accommodations) ─────────

/** Standard time, +25%, +50%, or no clock at all. */
export type MockTiming = 'standard' | 'plus25' | 'plus50' | 'untimed';
export const MOCK_TIMINGS: MockTiming[] = ['standard', 'plus25', 'plus50', 'untimed'];

/** How much time each timed option gives, as a multiple of the standard time. */
export const TIMING_FACTOR: Record<Exclude<MockTiming, 'untimed'>, number> = {
  standard: 1,
  plus25: 1.25,
  plus50: 1.5,
};

/** The short label for a timing ("+25% time"), shown in history and results. */
export const TIMING_LABEL: Record<MockTiming, string> = {
  standard: 'Standard time',
  plus25: '+25% time',
  plus50: '+50% time',
  untimed: 'Untimed',
};

/** A saved mock's timing: results from before Build D were all standard. */
export function timingOf(t: MockTiming | undefined): MockTiming {
  return t ?? 'standard';
}

export interface MockPace {
  /** Minutes allowed, or null for an untimed mock. */
  minutesAllowed: number | null;
  /** Exam pace at this timing, in seconds per question (96 × the factor). */
  examSec: number;
  /** Target pace at this timing, in seconds per question (90 × the factor). */
  targetSec: number;
}

/**
 * The time a mock of `questions` questions allows, and the paces it is
 * judged against. Extra time stretches every pace by the same factor, so a
 * +50% learner is "on pace" at 135 s, not told off at 91 s.
 */
export function mockPace(exam: ExamFacts, questions: number, timing: MockTiming): MockPace {
  const factor = timing === 'untimed' ? 1 : TIMING_FACTOR[timing];
  return {
    // Same rounding as before Build D (a 50-question CISA mini mock = 80 min).
    minutesAllowed: timing === 'untimed' ? null : Math.round((exam.minutes / exam.questions) * questions * factor),
    examSec: examPaceSeconds(exam) * factor,
    targetSec: targetPaceSeconds(exam) * factor,
  };
}

// ── Checkpoints: the pace line under the mock clock ──────────────────────

/** Pace checks at these shares of the time allowed. */
export const CHECKPOINTS = [0.25, 0.5, 0.75] as const;
/** Within ±10% of the target pace counts as "on pace". */
export const PACE_TOLERANCE = 0.1;

export type PaceStatus = 'ahead' | 'onPace' | 'behind';

export interface PaceVerdict {
  status: PaceStatus;
  /**
   * Signed share of the time used that is off target: +0.15 = 15% slower
   * than the target pace (behind), −0.2 = 20% faster (ahead).
   */
  deviation: number;
  /** Whole minutes off target (at least 1 when not on pace). */
  minutes: number;
}

/** The status for a signed deviation (± PACE_TOLERANCE is on pace). */
export function statusOf(deviation: number): PaceStatus {
  if (deviation > PACE_TOLERANCE) return 'behind';
  if (deviation < -PACE_TOLERANCE) return 'ahead';
  return 'onPace';
}

/**
 * How the learner is doing after `elapsedSec` with `done` questions behind
 * them, against `targetSec` per question.
 *
 * Plain English: a learner at target pace would have needed done × target
 * seconds. If they have used more than that (by over 10%), they are behind;
 * by that many minutes.
 */
export function paceVerdict(elapsedSec: number, done: number, targetSec: number): PaceVerdict {
  if (elapsedSec <= 0) return { status: 'onPace', deviation: 0, minutes: 0 };
  const expected = Math.max(0, done) * targetSec;
  const deviation = (elapsedSec - expected) / elapsedSec;
  const status = statusOf(deviation);
  const minutes = status === 'onPace' ? 0 : Math.max(1, Math.round(Math.abs(elapsedSec - expected) / 60));
  return { status, deviation, minutes };
}

/** The words for a verdict. Calm, and always a next step. */
export function paceMessage(v: Pick<PaceVerdict, 'status' | 'minutes'>): string {
  if (v.status === 'behind') return `About ${v.minutes} min behind. Flag anything past 2 minutes and move on.`;
  if (v.status === 'ahead') return 'Ahead. Use the time to re-read the stems.';
  return 'On pace';
}

/**
 * The short form for the fixed strip at very large text (P6): the full
 * advice is still announced and shown elsewhere, but a strip that takes
 * half the screen would hide the question.
 */
export function paceShort(v: Pick<PaceVerdict, 'status' | 'minutes'>): string {
  if (v.status === 'behind') return `About ${v.minutes} min behind`;
  if (v.status === 'ahead') return 'Ahead of pace';
  return 'On pace';
}

/** One pace check, as saved in the session. */
export interface Checkpoint {
  /** Share of the time allowed (0.25, 0.5 or 0.75). */
  at: number;
  /** Questions answered or flagged (parked) at the check. */
  done: number;
  deviation: number;
  minutes: number;
}

/**
 * The checkpoint state machine. Given the checks already recorded, returns
 * the list with any checks whose moment has now passed added, in order.
 * Returns the SAME array when nothing is new, so callers can skip a save.
 *
 * - Each check is recorded once, never re-judged.
 * - A check is judged at its own moment (e.g. exactly 60 of 240 minutes),
 *   with the questions done when it is noticed. If the app was closed across
 *   several checks (a paused mock: the clock keeps running), they are all
 *   recorded when it reopens.
 * - Untimed mocks (allowedMs null) have no checks.
 */
export function dueCheckpoints(
  recorded: readonly Checkpoint[] | undefined,
  allowedMs: number | null,
  elapsedMs: number,
  done: number,
  targetSec: number,
): Checkpoint[] {
  const have = recorded ?? [];
  if (!allowedMs || allowedMs <= 0) return have as Checkpoint[];
  const added: Checkpoint[] = [];
  for (const at of CHECKPOINTS) {
    if (elapsedMs < at * allowedMs) break;
    if (have.some((c) => c.at === at)) continue;
    const v = paceVerdict((at * allowedMs) / 1000, done, targetSec);
    added.push({ at, done, deviation: v.deviation, minutes: v.minutes });
  }
  return added.length ? [...have, ...added] : (have as Checkpoint[]);
}

/** "25%: on pace" style words for a recorded check (results panel). */
export function checkpointText(c: Pick<Checkpoint, 'deviation' | 'minutes'>): string {
  const s = statusOf(c.deviation);
  if (s === 'behind') return `${c.minutes} min behind`;
  if (s === 'ahead') return `${c.minutes} min ahead`;
  return 'on pace';
}

// ── Numbers on screen ─────────────────────────────────────────────────────

/** A clock: "04:09", or "1:04:09" past an hour. Never negative. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** A clock read aloud: "1 hour 4 minutes 9 seconds" (screen readers misread "1:04:09"). */
export function spokenClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  const parts = [h ? part(h, 'hour') : '', m ? part(m, 'minute') : '', !h && (s || !m) ? part(s, 'second') : ''];
  return parts.filter(Boolean).join(' ');
}

/**
 * A clock read aloud only as often as it changes meaningfully (U-H2): whole
 * minutes from a minute up ("1 hour 20 minutes"), then 10-second steps
 * ("30 seconds or less"). The strip's label uses this, so a screen reader
 * isn't handed a new sentence every second.
 */
export function spokenClockCoarse(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec >= 60) return durationSpoken(Math.floor(sec / 60));
  const step = Math.ceil(sec / 10) * 10;
  return step === 0 ? '0 seconds' : `${step} seconds or less`;
}

/** Minutes read aloud: "1 hour 20 minutes", "4 hours", "1 minute" (P7: never "1 h"). */
export function durationSpoken(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (h === 0) return part(m, 'minute');
  return m === 0 ? part(h, 'hour') : `${part(h, 'hour')} ${part(m, 'minute')}`;
}

/** Minutes as "3 h 31 min", "4 h" or "45 min". */
export function durationText(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** The middle value (the mean of the two middle ones for an even count); null when empty. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Times (ms) worth using: real, non-negative numbers only (old answers have none). */
function cleanMs(values: readonly (number | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
}

/** Median seconds per question from answer times in ms, rounded; null when no times. */
export function medianSeconds(ms: readonly (number | undefined)[]): number | null {
  const m = median(cleanMs(ms));
  return m === null ? null : Math.round(m / 1000);
}

// ── Practice: the results line, coaching tags, the soft cue ──────────────

/**
 * The one line every practice session's results show (from the Build C
 * answer times): "Median 74 s per question · exam pace 96 s". null when
 * no answer in the session has a time (a session saved before Build C).
 */
export function practicePaceLine(ms: readonly (number | undefined)[], exam: ExamFacts): string | null {
  const med = medianSeconds(ms);
  if (med === null) return null;
  return `Median ${med} s per question · exam pace ${Math.round(examPaceSeconds(exam))} s`;
}

/** Practice timer: after this long on ONE question, a soft cue appears. */
export const SOFT_CUE_MS = 2 * 60_000;
// Practice has no Flag button, so the cue speaks about the exam (U-H1).
export const SOFT_CUE_LINE = 'Over 2 minutes on this one. On the exam, flag it and move on.';

/** True once the current question has run past the soft cue (2:00). */
export function softCue(ms: number): boolean {
  return ms >= SOFT_CUE_MS;
}

/**
 * The practice timer: it counts UP, and only while a question is being
 * answered. It is the sum of the answer times already recorded plus the
 * running time on the current question (null once it is submitted, so the
 * timer stands still while the explanation is open). There is no deadline,
 * so nothing ever submits on its own.
 */
export function practiceElapsedMs(answeredMs: readonly (number | undefined)[], currentMs: number | null): number {
  return cleanMs(answeredMs).reduce((a, b) => a + b, 0) + Math.max(0, currentMs ?? 0);
}

export const FAST_WRONG_MS = 30_000;
export const SLOW_RIGHT_MS = 3 * 60_000;
export type CoachingTag = 'fast-wrong' | 'slow-right';

/** Coaching, not penalties: what each tag says on Results. */
export const COACHING: Record<CoachingTag, { tag: string; line: string }> = {
  'fast-wrong': { tag: 'Quick pick', line: 'Slow down on the stem.' },
  'slow-right': { tag: 'Took its time', line: 'You knew it; trust the first pass.' },
};

/**
 * A coaching tag for one answered question, or null. Only a question that
 * went wrong fast (< 30 s) or ran long but right (> 3 min) gets one.
 */
export function coachingTag(correct: boolean, ms: number | undefined): CoachingTag | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  if (!correct && ms < FAST_WRONG_MS) return 'fast-wrong';
  if (correct && ms > SLOW_RIGHT_MS) return 'slow-right';
  return null;
}

/**
 * Offer the practice timer? Once, as a card the learner answers: only when
 * the exam is 21 days away or less, or the journey is at the mock or ready
 * stage. Never when it is already on, and never again once answered.
 */
export const OFFER_DAYS = 21;
export function shouldOfferTimer(i: {
  daysLeft: number | null;
  stage: string;
  answered: boolean;
  timerOn: boolean;
}): boolean {
  if (i.answered || i.timerOn) return false;
  const close = i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= OFFER_DAYS;
  return close || i.stage === 'mock' || i.stage === 'ready';
}

// ── Mock results: the pacing panel ───────────────────────────────────────

export interface PacedAnswer {
  correct: boolean;
  /** Time on this question (ms), all visits. */
  ms?: number;
  /** When the (last) answer was given, epoch ms. */
  at?: number;
  domainId: string;
}

export interface MockPacingInput {
  startedAt: number;
  endedAt: number;
  /** null = untimed. */
  allowedMs: number | null;
  total: number;
  answers: readonly PacedAnswer[];
  checkpoints?: readonly Checkpoint[];
}

export interface MockPacing {
  usedMinutes: number;
  allowedMinutes: number | null;
  medianSec: number | null;
  checkpoints: Checkpoint[];
  /** Questions with no answer when the exam ended. */
  unanswered: number;
  /** True when the exam ended because time ran out (not submitted early). */
  timedOut: boolean;
  /** Accuracy in the last 10% of the time used vs the rest (the rushing signature). */
  lastTenth: { correct: number; total: number } | null;
  rest: { correct: number; total: number } | null;
  /** The domain with the highest median time (at least 2 timed answers). */
  slowestDomain: { domainId: string; medianSec: number } | null;
}

/** The share of the time used counted as "the end" for the rushing signature. */
export const LAST_SHARE = 0.1;

export function mockPacing(i: MockPacingInput): MockPacing {
  const usedMs = Math.max(0, i.endedAt - i.startedAt);
  const answered = i.answers;
  // The rushing signature: answers given in the final 10% of the time used.
  const cut = i.startedAt + usedMs * (1 - LAST_SHARE);
  const dated = answered.filter((a) => typeof a.at === 'number');
  const tally = (xs: readonly PacedAnswer[]) => (xs.length ? { correct: xs.filter((a) => a.correct).length, total: xs.length } : null);
  const late = dated.filter((a) => a.at! >= cut);
  const early = dated.filter((a) => a.at! < cut);
  // Slowest domain by median time, among domains with at least 2 timed answers.
  const byDomain = new Map<string, number[]>();
  for (const a of answered) {
    if (typeof a.ms !== 'number') continue;
    byDomain.set(a.domainId, [...(byDomain.get(a.domainId) ?? []), a.ms]);
  }
  let slowestDomain: MockPacing['slowestDomain'] = null;
  for (const [domainId, ms] of byDomain) {
    if (ms.length < 2) continue;
    const med = Math.round(median(ms)! / 1000);
    if (!slowestDomain || med > slowestDomain.medianSec) slowestDomain = { domainId, medianSec: med };
  }
  return {
    usedMinutes: Math.max(1, Math.round(usedMs / 60_000)),
    allowedMinutes: i.allowedMs === null ? null : Math.round(i.allowedMs / 60_000),
    medianSec: medianSeconds(answered.map((a) => a.ms)),
    checkpoints: [...(i.checkpoints ?? [])],
    unanswered: Math.max(0, i.total - answered.length),
    timedOut: i.allowedMs !== null && usedMs >= i.allowedMs,
    lastTenth: tally(late),
    rest: tally(early),
    slowestDomain,
  };
}

// ── Pacing across mocks (untimed mocks never count) ──────────────────────

/** What pacing stats need from a saved mock result. */
export interface PacedMock {
  timing?: MockTiming;
  medianSec?: number;
  unanswered?: number;
  checkpoints?: number[];
}

export interface PacingStats {
  /** Timed mocks with pacing data. */
  mocks: number;
  /** Median of their median seconds per question. */
  medianSec: number | null;
  /** How many finished with every question answered. */
  allAnswered: number;
  /** Mean absolute checkpoint deviation (0.08 = 8%), or null with no checks. */
  meanDeviation: number | null;
}

/**
 * Pacing across the learner's mocks. Untimed mocks are left out (there was
 * no clock to pace against), and so are mocks from before Build D, which
 * have no pacing data. Readiness is NOT affected: it counts every answer.
 */
export function pacingStats(mocks: readonly PacedMock[]): PacingStats {
  const timed = mocks.filter((m) => timingOf(m.timing) !== 'untimed' && typeof m.medianSec === 'number');
  const devs = timed.flatMap((m) => m.checkpoints ?? []).map(Math.abs);
  return {
    mocks: timed.length,
    medianSec: median(timed.map((m) => m.medianSec!)),
    allAnswered: timed.filter((m) => m.unanswered === 0).length,
    meanDeviation: devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : null,
  };
}

/** The one-line summary under You → Mock exams, or null before any timed mock with pacing data. */
export function pacingStatsLine(s: PacingStats): string | null {
  if (s.mocks === 0 || s.medianSec === null) return null;
  const mocks = s.mocks === 1 ? '1 timed mock' : `${s.mocks} timed mocks`;
  return `Pace over ${mocks}: median ${Math.round(s.medianSec)} s per question. Finished with every question answered: ${s.allAnswered} of ${s.mocks}.`;
}
