/**
 * Sure Footing (game id `sprint`) — "How sure are you, really?"
 *
 * Before each answer the learner says how sure they are: Guess, Lean or
 * Sure (the same words as the confidence rating in practice). The end
 * screen compares how sure they felt with how often they were right.
 * Over-confidence is a silent reason people fail: they skip review on
 * topics they only think they know.
 *
 * WHY THE POINTS ARE LOPSIDED (plain English):
 * The old rule was "win or lose 1, 2 or 3 points". Then always choosing 3
 * scored best for anyone right more than half the time, so the game
 * rewarded over-confidence, the opposite of its purpose. The new points
 * make the HONEST choice the best-scoring one:
 *
 *   Guess  +1 if right,  0 if wrong   best when you are under 50% sure
 *   Lean   +2 if right, −1 if wrong   best between 50% and 80%
 *   Sure   +3 if right, −5 if wrong   best above 80%
 *
 * (Expected points at chance p: Guess p, Lean 3p − 1, Sure 8p − 5. Lean
 * overtakes Guess at p = 0.5; Sure overtakes Lean at p = 0.8.)
 *
 * Copy rule: never use betting words ("bet", "stake", "wager") anywhere.
 */
import type { Confidence } from '../srs';

export type Footing = 'guess' | 'lean' | 'sure';
export const FOOTINGS: Footing[] = ['guess', 'lean', 'sure'];

/** Points for a right and a wrong answer at each level, as data (tested). */
export const PAYOFF: Record<Footing, { label: string; right: number; wrong: number }> = {
  guess: { label: 'Guess', right: 1, wrong: 0 },
  lean: { label: 'Lean', right: 2, wrong: -1 },
  sure: { label: 'Sure', right: 3, wrong: -5 },
};

/** When each level is the honest choice (rules rows, read aloud with the points). */
export const FOOTING_DESC: Record<Footing, string> = {
  guess: 'Less than an even chance.',
  lean: 'Probably right, not certain.',
  sure: 'You would put your name to it.',
};

/** The same confidence the practice screen records, so spaced review treats them alike. */
export const FOOTING_CONFIDENCE: Record<Footing, Confidence> = { guess: 'guessing', lean: 'unsure', sure: 'sure' };

/** "+3", "−5", "0": a real minus sign, so screen readers say "minus". */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

/** The points line under the choice, e.g. "+3 if right · −5 if wrong" (never on the pill itself). */
export function footingPayoff(f: Footing): string {
  const p = PAYOFF[f];
  return `${signed(p.right)} if right · ${signed(p.wrong)} if wrong`;
}

/** Chip text read aloud, e.g. "Sure: plus 3 if right, minus 5 if wrong". */
export function footingSpoken(f: Footing): string {
  const p = PAYOFF[f];
  const say = (n: number) => (n > 0 ? `plus ${n}` : n < 0 ? `minus ${Math.abs(n)}` : 'nothing');
  return `${p.label}: ${say(p.right)} if right, ${say(p.wrong)} if wrong`;
}

export interface SprintResult {
  questionId: string;
  footing: Footing;
  correct: boolean;
}

export function points(f: Footing, correct: boolean): number {
  return correct ? PAYOFF[f].right : PAYOFF[f].wrong;
}

export function sprintScore(results: SprintResult[]): number {
  return results.reduce((s, r) => s + points(r.footing, r.correct), 0);
}

/** The most a round of `n` questions can score (every answer Sure and right). */
export function maxScore(n: number): number {
  return n * PAYOFF.sure.right;
}

/** Average points per answer if you are right with chance p. */
export function expectedPoints(f: Footing, p: number): number {
  return p * PAYOFF[f].right + (1 - p) * PAYOFF[f].wrong;
}

/** The level that scores best on average at chance p (ties go to the humbler level). */
export function bestFooting(p: number): Footing {
  let best: Footing = 'guess';
  for (const f of FOOTINGS) if (expectedPoints(f, p) > expectedPoints(best, p) + 1e-9) best = f;
  return best;
}

export interface CalibrationBand {
  footing: Footing;
  answered: number;
  accuracy: number | null; // 0..1
}

/** Accuracy per confidence level. Well calibrated: Sure answers are right most. */
export function calibration(results: SprintResult[]): CalibrationBand[] {
  return FOOTINGS.map((footing) => {
    const at = results.filter((r) => r.footing === footing);
    return {
      footing,
      answered: at.length,
      accuracy: at.length ? at.filter((r) => r.correct).length / at.length : null,
    };
  });
}

/** Guesses needed before "you knew more than you thought" is said. */
export const UNDER_MIN_GUESSES = 3;

export type CalibrationVerdict = 'overconfident' | 'underconfident' | 'calibrated' | 'not-enough-data';

/** Plain-language verdict for the end screen. */
export function calibrationVerdict(results: SprintResult[]): CalibrationVerdict {
  const high = results.filter((r) => r.footing === 'sure');
  const low = results.filter((r) => r.footing === 'guess');
  if (high.length + low.length < 3) return 'not-enough-data';
  const acc = (rs: SprintResult[]) => (rs.length ? rs.filter((r) => r.correct).length / rs.length : null);
  const hi = acc(high);
  const lo = acc(low);
  // Sure should be right more than 80% of the time to be worth it.
  if (hi !== null && hi < 0.8) return 'overconfident';
  // Guess is for under 50%. Right on more than half of at least 3 guesses
  // means the learner knew more than they said (the Lean line is 50%).
  if (low.length >= UNDER_MIN_GUESSES && lo !== null && lo > 0.5) return 'underconfident';
  return 'calibrated';
}

export const VERDICT_COPY: Record<CalibrationVerdict, string> = {
  overconfident:
    'Some of your Sure answers missed. Slow down on answers that feel obvious: the exam is built around tempting options.',
  underconfident:
    'You were right more often than you believed. Trust your reasoning a little more; second-guessing costs time.',
  calibrated: 'Your confidence matches your accuracy. That is exactly how strong candidates manage exam time.',
  'not-enough-data': 'Play a few more rounds and use Guess, Lean and Sure honestly to see your pattern.',
};
