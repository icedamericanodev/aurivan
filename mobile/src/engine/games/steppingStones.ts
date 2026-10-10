/**
 * Stepping Stones (id `stones`) — "Put each process in the right order."
 * (games review §3.5, Build F)
 *
 * Plain English for the founder:
 * - A round is 3 processes from the reviewed decks: the 28 authored
 *   sequences plus the lesson flows whose order is strict, as shipped or as
 *   corrected since (content/games). Every FIRST question rewards knowing
 *   what comes before what.
 * - A process never plays below its own deck tier: one the reviewers marked
 *   Heartwood stays at Heartwood (code review, Build F).
 * - The steps ("stones") are shuffled. The learner TAPS them in order to
 *   build the path, and taps a placed stone to take it back. No dragging.
 *   When every stone is placed, "Check the order" marks each one; a stone in
 *   the wrong place says where it really goes ("Goes 3rd"). Then the step
 *   notes and the caption explain the order.
 * - Levels:
 *   - Seedling: 4-step processes, the first step given.
 *   - Sapling: 5–6 steps, all placed by the learner.
 *   - Heartwood: "Which step is missing?" The path is shown with one gap;
 *     pick the missing step from 3. The 2 decoys come from other processes
 *     and share no key word with any step of this one, so only one fits.
 * - Score: +1 per stone in the right place, +2 for a perfect path
 *   (Heartwood: +1 per missing step found).
 * - Each process is a review card ("seq:1A3.1:s001", or "flow:<lesson id>"
 *   for a lesson's flow): a process not placed perfectly returns in a later
 *   round. Cards never feed readiness or mastery.
 *
 * Pure TypeScript: no React, no storage. The processes are passed in.
 */
import type { StepSequence } from '../../content/games';
import { shuffled, type Rng } from '../random';
import type { ReviewEntry } from '../srs';

export const STONES_PER_ROUND = 3;
export const STONES_MIN_POOL = STONES_PER_ROUND * 2;
export const PERFECT_BONUS = 2;
export const MISSING_CHOICES = 3;

export type StonesTier = 'seedling' | 'sapling' | 'heartwood';
export const STONES_TIERS: StonesTier[] = ['seedling', 'sapling', 'heartwood'];
export const STONES_TIER_NAME: Record<StonesTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
export const STONES_TIER_LINE: Record<StonesTier, string> = {
  seedling: 'Four steps, the first one given.',
  sapling: 'Five or six steps, all yours to place.',
  heartwood: 'Which step is missing? Pick it from three.',
};

/** The review card id: "seq:1A3.1:s001", or "flow:<lesson id>" for a lesson's flow. */
export function stonesCardId(seq: StepSequence): string {
  return seq.lessonId ? `flow:${seq.lessonId}` : `seq:${seq.subtopicId}:${seq.id}`;
}

const RANK: Record<StonesTier, number> = { seedling: 0, sapling: 1, heartwood: 2 };

/**
 * The processes a level plays: only those whose deck tier is this level or
 * easier (the deck tier is a floor), then Seedling the 4-step ones, Sapling
 * and Heartwood the longer ones; topped up from the other length if short.
 */
export function stonesPool(all: readonly StepSequence[], tier: StonesTier, size = STONES_PER_ROUND): StepSequence[] {
  const allowed = all.filter((s) => RANK[s.tier] <= RANK[tier]);
  const short = allowed.filter((s) => s.steps.length <= 4);
  const long = allowed.filter((s) => s.steps.length >= 5);
  const own = tier === 'seedling' ? short : long;
  return own.length >= size ? own : [...own, ...(tier === 'seedling' ? long : short)];
}

export interface StonesItem {
  seq: StepSequence;
  /** Seedling: the first step is placed for you. */
  given: number;
  /** The stones to place, in the shuffled order shown (step indexes). */
  shown: number[];
  /** Heartwood: the hidden step and the 3 labels to choose from. */
  missing?: { index: number; choices: string[]; correct: number };
}

const STOP = new Set(
  'a an the and or of to for in on at by with from into is are be as it its this that each every all any no not before after then first last'.split(' '),
);
/** Content words of a label (for keeping Heartwood decoys clearly different). */
export function keyWords(label: string): string[] {
  return label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}

/**
 * Heartwood decoys: step labels from OTHER processes (another note or
 * lesson) that share no key word with any step of this process.
 */
export function missingChoices(seq: StepSequence, index: number, all: readonly StepSequence[], rng: Rng, n = MISSING_CHOICES): { choices: string[]; correct: number } {
  const mine = new Set(seq.steps.flatMap((s) => keyWords(s.label)));
  const owner = (s: StepSequence) => s.lessonId ?? s.subtopicId;
  const decoys: string[] = [];
  const candidates = shuffled(
    all.filter((s) => s.id !== seq.id && owner(s) !== owner(seq)).flatMap((s) => s.steps.map((x) => x.label)),
    rng,
  );
  for (const label of candidates) {
    if (decoys.length >= n - 1) break;
    if (decoys.includes(label) || label === seq.steps[index].label) continue;
    if (keyWords(label).some((w) => mine.has(w))) continue;
    decoys.push(label);
  }
  const choices = shuffled([seq.steps[index].label, ...decoys], rng);
  return { choices, correct: choices.indexOf(seq.steps[index].label) };
}

/** A shuffle of the steps to place that is never already in order. */
function shuffledOrder(indexes: number[], rng: Rng): number[] {
  if (indexes.length < 2) return indexes;
  for (let k = 0; k < 6; k++) {
    const s = shuffled(indexes, rng);
    if (s.some((x, j) => x !== indexes[j])) return s;
  }
  // Still in order after a few tries (tiny lists): swap the first two.
  return [indexes[1], indexes[0], ...indexes.slice(2)];
}

/**
 * A round: due processes from this level's pool first, then others, with
 * the 3 processes from different domains where possible.
 */
export function buildStonesRound(
  all: readonly StepSequence[],
  cards: Record<string, ReviewEntry> | undefined,
  tier: StonesTier,
  rng: Rng,
  now: number,
  size = STONES_PER_ROUND,
): StonesItem[] {
  const pool = stonesPool(all, tier, size);
  const due = shuffled(pool.filter((s) => (cards?.[stonesCardId(s)]?.dueAt ?? Infinity) <= now), rng);
  const order = [...due, ...shuffled(pool.filter((s) => !due.includes(s)), rng)];
  const picked: StepSequence[] = [];
  for (const s of order) {
    if (picked.length >= size) break;
    if (picked.some((p) => p.domainId === s.domainId) && order.some((o) => !picked.includes(o) && !picked.some((p) => p.domainId === o.domainId))) continue;
    picked.push(s);
  }
  for (const s of order) {
    if (picked.length >= size) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.map((seq) => {
    const n = seq.steps.length;
    if (tier === 'heartwood') {
      const index = Math.floor(rng() * n);
      return { seq, given: 0, shown: [], missing: { index, ...missingChoices(seq, index, all, rng) } };
    }
    const given = tier === 'seedling' ? 1 : 0;
    const rest = Array.from({ length: n - given }, (_, k) => k + given);
    return { seq, given, shown: shuffledOrder(rest, rng) };
  });
}

/** One stone checked: is it in its right place, and where it really goes (1-based). */
export interface StoneMark {
  step: number;
  right: boolean;
  goes: number;
}

/**
 * Check a full path. `placed` lists step indexes in the order tapped (after
 * any given steps). Returns a mark per placed stone, how many are right and
 * whether the path is perfect.
 */
export function checkPath(item: StonesItem, placed: readonly number[]): { marks: StoneMark[]; right: number; perfect: boolean } {
  const marks = placed.map((step, k) => ({ step, right: step === item.given + k, goes: step + 1 }));
  const right = marks.filter((m) => m.right).length;
  return { marks, right, perfect: right === item.seq.steps.length - item.given && placed.length === right };
}

/** Points for a checked path: +1 per stone in place, +2 for a perfect path. */
export function pathPoints(right: number, perfect: boolean): number {
  return right + (perfect ? PERFECT_BONUS : 0);
}

/** The most a round can score. */
export function stonesMax(items: readonly StonesItem[]): number {
  return items.reduce((s, it) => s + (it.missing ? 1 : it.seq.steps.length - it.given + PERFECT_BONUS), 0);
}

/** "1st", "2nd", "3rd", "4th"… */
export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
}
