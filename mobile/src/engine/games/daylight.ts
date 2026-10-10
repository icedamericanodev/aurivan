/**
 * Daylight (id `daylight`) — "Answer at exam pace." (games review §3.2)
 *
 * Plain English for the founder:
 * - 5 bank questions share ONE time budget (no countdown per question).
 *   At Sapling that is the exam pace: 5 × 96 s = 8 minutes for CISA.
 * - "Flag & move on" parks a question at the back of the line; it comes
 *   back at the end if there is time left.
 * - When the budget runs out the light "sets": unanswered questions are
 *   SHOWN with their answers, never marked wrong. They go to review without
 *   counting as answered.
 * - Score: +1 per correct answer, +1 more if every question was answered
 *   inside the budget.
 * - Tiers (the learner picks; the app suggests one from their recent pace):
 *   Seedling 1.25 × exam pace (CISA 120 s), Sapling 1 × (96 s),
 *   Heartwood 5/6 × (80 s, which banks time for review on the real exam).
 *   Seedling can be extended a minute at a time, up to MAX_EXTENDS times.
 *
 * WCAG 2.2.1 (Timing Adjustable): a time limit is what this game trains,
 * so the budget is "essential" to the activity (the exception in 2.2.1).
 * Even so the learner can pause at any time, pick the slowest tier, extend
 * Seedling, and is warned with about 10% of the light left; and nothing is
 * lost when the light sets (unanswered questions are shown, not failed).
 *
 * Pure TypeScript: no React, no storage, no clock. The screen passes times in.
 */
import type { PackQuestion } from '../../content/types';
import { addMs, MAX_ANSWER_MS } from '../answerClock';
import { examPaceSeconds, median, PACE_TOLERANCE, type ExamFacts, type PaceStatus } from '../pace';
import { shuffled, type Rng } from '../random';

export const DAYLIGHT_SIZE = 5;

export type DaylightTier = 'seedling' | 'sapling' | 'heartwood';
export const DAYLIGHT_TIERS: DaylightTier[] = ['seedling', 'sapling', 'heartwood'];
export const TIER_NAME: Record<DaylightTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
/** Time per question as a multiple of the exam pace. */
export const TIER_FACTOR: Record<DaylightTier, number> = { seedling: 1.25, sapling: 1, heartwood: 5 / 6 };

/** Seconds per question for a tier, from the cert's exam facts (CISA: 120 / 96 / 80). */
export function tierSeconds(tier: DaylightTier, exam: ExamFacts): number {
  return Math.round(examPaceSeconds(exam) * TIER_FACTOR[tier]);
}

/**
 * Play's "about N min" for Daylight: the Sapling budget at the standard
 * ISACA pace (4 hours for 150 questions = 96 s). The round itself always
 * uses the active cert's own exam facts (tierSeconds).
 */
export const DAYLIGHT_MINUTES = Math.round((DAYLIGHT_SIZE * examPaceSeconds({ questions: 150, minutes: 240 })) / 60);

/** Seedling only: each "Add a minute" adds this much to the budget, at most MAX_EXTENDS times. */
export const EXTEND_MS = 60_000;
export const MAX_EXTENDS = 10;
/** Whether a tier offers "Add a minute" at all (the picker's wording). */
export function tierCanExtend(tier: DaylightTier): boolean {
  return tier === 'seedling';
}

/** Every bank question can be played (the round is about pace, not a trap type). */
export function daylightPool(pool: PackQuestion[]): PackQuestion[] {
  return pool;
}

export function buildDaylightRound(pool: PackQuestion[], rng: Rng, size = DAYLIGHT_SIZE): string[] {
  return shuffled(daylightPool(pool), rng)
    .slice(0, size)
    .map((q) => q.id);
}

/**
 * The tier the app suggests: the learner's median answer time over their
 * most recent timed answers (Build C `ms`). Fewer than 10 timed answers →
 * Seedling (start gentle). Otherwise the fastest tier whose time per
 * question still covers their median.
 */
export const SUGGEST_MIN_ANSWERS = 10;
export const SUGGEST_RECENT = 30;
export function suggestTier(answers: readonly { ms?: number; lastAt: number }[], exam: ExamFacts): DaylightTier {
  const timed = answers
    .filter((a) => typeof a.ms === 'number')
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, SUGGEST_RECENT)
    .map((a) => a.ms!);
  if (timed.length < SUGGEST_MIN_ANSWERS) return 'seedling';
  const med = median(timed)! / 1000;
  if (med <= tierSeconds('heartwood', exam)) return 'heartwood';
  if (med <= tierSeconds('sapling', exam)) return 'sapling';
  return 'seedling';
}

// ── The round ────────────────────────────────────────────────────────────

export interface DaylightAnswer {
  correct: boolean;
  /** Time on this question over every visit (ms). */
  ms: number;
}

export interface DaylightRound {
  ids: string[];
  /** The tier, locked when the round starts (a changed suggestion never changes it). */
  tier: DaylightTier;
  /** How many minutes were added (Seedling, at most MAX_EXTENDS). */
  extends: number;
  /** The whole round's time budget (ms); Seedling can grow it. */
  budgetMs: number;
  /** Seconds per question for the chosen tier. */
  perItemSec: number;
  /** Still to answer, in order; the current question is queue[0]. */
  queue: string[];
  /** Questions parked at least once ("Flag & move on"). */
  flagged: string[];
  answers: Record<string, DaylightAnswer>;
  /** Time already spent on questions not yet answered (a parked one keeps its time). */
  spentMs: Record<string, number>;
  /** True once every question is answered or the light has set. */
  over: boolean;
  /** Questions the light set on: revealed, not failed. */
  timedOut: string[];
}

export function newDaylightRound(ids: string[], tier: DaylightTier, perItemSec: number): DaylightRound {
  return {
    ids: [...ids],
    tier,
    extends: 0,
    budgetMs: ids.length * perItemSec * 1000,
    perItemSec,
    queue: [...ids],
    flagged: [],
    answers: {},
    spentMs: {},
    over: ids.length === 0,
    timedOut: [],
  };
}

/** The question on screen, or null when the round is over. */
export function currentItem(r: DaylightRound): string | null {
  return r.over ? null : (r.queue[0] ?? null);
}

/** "Flag & move on" is only offered when there is another question to move on to. */
export function canFlag(r: DaylightRound): boolean {
  return !r.over && r.queue.length > 1;
}

/** Park the current question at the back of the line, keeping the time spent on it. */
export function flagCurrent(r: DaylightRound, visitMs: number): DaylightRound {
  const id = currentItem(r);
  if (!id || !canFlag(r)) return r;
  return {
    ...r,
    queue: [...r.queue.slice(1), id],
    flagged: r.flagged.includes(id) ? r.flagged : [...r.flagged, id],
    // addMs: capped at the answer clock's 30 minutes, like every answer time.
    spentMs: { ...r.spentMs, [id]: addMs(r.spentMs[id], visitMs) },
  };
}

/** Answer the current question. Answering the last one ends the round (inside the budget). */
export function answerCurrent(r: DaylightRound, correct: boolean, visitMs: number): DaylightRound {
  const id = currentItem(r);
  if (!id) return r;
  const spentMs = { ...r.spentMs };
  const ms = addMs(spentMs[id], visitMs);
  delete spentMs[id];
  const queue = r.queue.slice(1);
  return { ...r, queue, spentMs, answers: { ...r.answers, [id]: { correct, ms } }, over: queue.length === 0 };
}

/** The light sets: the budget ran out. Whatever is unanswered is revealed. */
export function setLight(r: DaylightRound): DaylightRound {
  if (r.over) return r;
  return { ...r, over: true, timedOut: [...r.queue], queue: [] };
}

/** "Add a minute" is offered: a Seedling round, still running, under MAX_EXTENDS. */
export function canExtend(r: DaylightRound): boolean {
  return !r.over && tierCanExtend(r.tier) && r.extends < MAX_EXTENDS;
}

/** Seedling: add a minute to the budget. Anything else (or past the limit) doesn't change. */
export function extendBudget(r: DaylightRound, ms = EXTEND_MS): DaylightRound {
  if (!canExtend(r)) return r;
  return { ...r, budgetMs: r.budgetMs + ms, extends: r.extends + 1 };
}

/**
 * True when the light has set. The round clock (an answer clock) stops
 * counting at MAX_ANSWER_MS, so a budget past that sets at the cap: the
 * light can always set.
 */
export function budgetGone(r: DaylightRound, usedMs: number): boolean {
  return usedMs >= Math.min(r.budgetMs, MAX_ANSWER_MS);
}

/** Every question answered before the light set. */
export function finishedInBudget(r: DaylightRound): boolean {
  return r.over && r.timedOut.length === 0 && Object.keys(r.answers).length === r.ids.length;
}

/** +1 per correct answer, +1 if the round finished within the budget. */
export function daylightScore(r: DaylightRound): number {
  const right = Object.values(r.answers).filter((a) => a.correct).length;
  return right + (finishedInBudget(r) ? 1 : 0);
}

/**
 * Right answers a round needs for Sure-Footed Pace (4 of 5): pace alone
 * isn't the skill, so tapping fast at random never earns it.
 */
export const PACE_RIGHT = 4;

/**
 * Daylight's skill step, per question: answered before the light set AND
 * right. (Answering in time but wrong is speed, not exam pace.) This is
 * what moves the game's level.
 */
export function daylightHits(r: DaylightRound): boolean[] {
  return r.ids.map((id) => r.answers[id]?.correct === true);
}

/**
 * A round that counts toward Sure-Footed Pace: played at Sapling or
 * Heartwood, every question answered inside the light, and at least
 * PACE_RIGHT of DAYLIGHT_SIZE right (scaled for other round sizes).
 */
export function atSurePace(r: DaylightRound): boolean {
  const need = Math.ceil((PACE_RIGHT / DAYLIGHT_SIZE) * r.ids.length);
  return r.tier !== 'seedling' && finishedInBudget(r) && daylightHits(r).filter(Boolean).length >= need;
}

export function daylightMax(size: number): number {
  return size + 1;
}

// ── Pace during the round ────────────────────────────────────────────────

/**
 * Pace with a grace of one question: the learner is only "behind" once the
 * time used goes past the answered questions' share PLUS the current
 * question's share (+10%), so a fresh round never starts "behind". Ahead =
 * more than 10% under the answered questions' share.
 */
export function daylightPace(r: DaylightRound, usedMs: number): PaceStatus {
  const per = r.perItemSec * 1000;
  const done = Object.keys(r.answers).length;
  if (usedMs > (done + 1) * per * (1 + PACE_TOLERANCE)) return 'behind';
  if (done > 0 && usedMs < done * per * (1 - PACE_TOLERANCE)) return 'ahead';
  return 'onPace';
}

export const DAYLIGHT_LINE: Record<PaceStatus, string> = {
  onPace: 'On pace',
  behind: 'Behind pace. Flag & move on if one is stuck.',
  ahead: 'Ahead of pace.',
};

/** The pace line; on the last question left there is nothing to flag, so "behind" says just that. */
export function daylightLine(status: PaceStatus, flaggable: boolean): string {
  return status === 'behind' && !flaggable ? 'Behind pace.' : DAYLIGHT_LINE[status];
}

/** The light's last 10%: a visible warning (and the spoken one). */
export function lowLight(r: DaylightRound, usedMs: number): boolean {
  return !r.over && usedMs >= r.budgetMs * 0.9;
}
export function lowLightLine(r: DaylightRound): string {
  return `About a minute of light left.${canExtend(r) ? ' You can add a minute.' : ''}`;
}

/** Spoken pace announcements: at half the budget, and with 10% left. Each once per round. */
export type PaceMark = 'half' | 'tenthLeft';
export function paceMarksDue(r: DaylightRound, usedMs: number, said: readonly PaceMark[]): PaceMark[] {
  const due: PaceMark[] = [];
  if (usedMs >= r.budgetMs * 0.5 && !said.includes('half')) due.push('half');
  if (usedMs >= r.budgetMs * 0.9 && !said.includes('tenthLeft')) due.push('tenthLeft');
  return due;
}

// ── The end screen: "this is where time went" ───────────────────────────

/** Average seconds per answered question (rounded), or null. */
export function averageSeconds(r: DaylightRound): number | null {
  const ms = Object.values(r.answers).map((a) => a.ms);
  if (!ms.length) return null;
  return Math.round(ms.reduce((a, b) => a + b, 0) / ms.length / 1000);
}

/** The answered question that took longest, with its seconds, or null. */
export function slowestItem(r: DaylightRound): { id: string; seconds: number } | null {
  let best: { id: string; seconds: number } | null = null;
  for (const id of r.ids) {
    const a = r.answers[id];
    if (!a) continue;
    const seconds = Math.round(a.ms / 1000);
    if (!best || seconds > best.seconds) best = { id, seconds };
  }
  return best;
}
