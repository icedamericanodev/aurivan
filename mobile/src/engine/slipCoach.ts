/**
 * Slip coach — "what keeps tripping me up, and how do I drill it?"
 *
 * The Mistake journal already lets learners tag WHY they missed a question.
 * Once there are enough tagged mistakes (SLIP_COACH_MIN), this module names
 * the most frequent pattern in plain words and picks the mini-game that
 * drills it.
 *
 * How each mistake is read (a mistake can show more than one pattern):
 *   - runner-up:     the learner picked the OTHER option in the question's
 *                    "Final two:" tip (tips.ts runnerUp). Compared on
 *                    ORIGINAL letters, never display letters.
 *   - priority:      tagged "Missed FIRST/BEST", or tagged "Misread" on a
 *                    stem that has a capitalised priority word (FIRST, BEST…).
 *   - overconfident: answered while marked "Sure", and still wrong.
 *   - role / tech-first / symptom / misread / knowledge: the learner's tag.
 *
 * The pattern with the most mistakes wins. Ties go to the order in
 * PATTERN_ORDER (the three game-backed patterns first: they have a drill).
 *
 * Pure TypeScript: no React, no storage.
 */
import type { GameId } from './games/registry';
import { priorityWord } from './games/priorityLens';
import type { Confidence } from './srs';
import { runnerUp } from './tips';

/** Why a learner missed a question — tagged by them in the Mistake journal. */
export type ThinkingSlip = 'role' | 'priority' | 'tech-first' | 'symptom' | 'misread' | 'knowledge';

/** The patterns the coach can name. */
export type SlipPattern = 'runner-up' | 'priority' | 'overconfident' | Exclude<ThinkingSlip, 'priority'>;

/** The mini-games: the registry's ids (names live in engine/games/registry.ts). */
export type DrillGame = GameId;

/** Tagged mistakes needed before the coach names a pattern. */
export const SLIP_COACH_MIN = 5;

/** One mistake, joined with the facts about its question. */
export interface SlipInput {
  slip?: ThinkingSlip; // the learner's tag (undefined = not tagged yet)
  picked?: string; // ORIGINAL letter chosen
  confidence?: Confidence; // how sure they felt, if they said
  correct: string; // ORIGINAL letter of the key
  tips: string[];
  stem: string;
}

export interface SlipCoachCopy {
  title: string; // "You often pick the closest wrong choice"
  coach: string; // one short line of advice
  game: DrillGame | null; // the drill; null = no game fits, practise instead
}

export const PATTERN_COPY: Record<SlipPattern, SlipCoachCopy> = {
  'runner-up': { title: 'You often pick the closest wrong choice', coach: 'Two options look right. Say why the best one wins before you tap.', game: 'trap' },
  priority: { title: 'You miss priority words like FIRST and BEST', coach: 'Find the priority word before you read the options.', game: 'priority' },
  overconfident: { title: 'You miss when you feel sure', coach: 'A sure answer still deserves one more read of the question.', game: 'sprint' },
  // Build F: the role pattern drills in Canopy Call ("who has the authority to decide?").
  role: { title: 'You answer as the wrong person', coach: 'Ask who you are in the question: auditor, manager or board?', game: 'canopy' },
  'tech-first': { title: 'You reach for a tool before the policy', coach: 'Policy, ownership and approval usually come before tools.', game: 'trap' },
  symptom: { title: 'You fix the symptom, not the cause', coach: 'Prefer the option that removes the root cause.', game: 'trap' },
  misread: { title: 'You misread the question', coach: 'Slow down on the last line of the question.', game: 'priority' },
  knowledge: { title: 'Most misses are content gaps', coach: 'A lesson or a review session will close them.', game: null },
};

/** Tie-break order: game-backed, derived patterns first. */
export const PATTERN_ORDER: SlipPattern[] = ['runner-up', 'priority', 'overconfident', 'role', 'tech-first', 'symptom', 'misread', 'knowledge'];

/**
 * The one line under "Not quite" on the answer screen (mobile 1.24). It is
 * specific only when the learner has TAGGED why they slipped on this question
 * (Mistake journal); otherwise it is neutral, never a guess at what went
 * wrong. The runner-up line is not a guess: it comes from the question's own
 * "Final two" tip and the letter picked (both ORIGINAL letters).
 */
export const NEUTRAL_MISS_LINE = 'Here’s the idea to take with you.';
// Learner copy never says "runner-up" (mobile 1.51): the closest wrong choice. The id 'runner-up' stays (saved data).
export const RUNNER_UP_LINE = 'You picked the closest wrong choice. That’s the trap.';
export const SLIP_LINE: Record<ThinkingSlip, string> = {
  role: 'Check who you are in the question.',
  priority: 'Find the priority word before the options.',
  'tech-first': 'Policy and ownership usually come before tools.',
  symptom: 'Prefer the option that removes the cause.',
  misread: 'Slow down on the last line of the question.',
  knowledge: 'The idea below is the one to learn.',
};
export function missCoachLine(pickedRunnerUp: boolean, slip?: ThinkingSlip): string {
  if (pickedRunnerUp) return RUNNER_UP_LINE;
  return slip ? SLIP_LINE[slip] : NEUTRAL_MISS_LINE;
}

/** Every pattern one mistake shows (may be several, may be none). */
export function patternsOf(m: SlipInput): SlipPattern[] {
  const out: SlipPattern[] = [];
  if (m.picked && m.picked !== m.correct && m.picked === runnerUp(m.tips, m.correct)) out.push('runner-up');
  if (m.slip === 'priority' || (m.slip === 'misread' && priorityWord(m.stem) !== null)) out.push('priority');
  if (m.confidence === 'sure') out.push('overconfident');
  if (m.slip && m.slip !== 'priority') out.push(m.slip);
  return out;
}

export type SlipCoach =
  | { ready: false; tagged: number; needed: number }
  | ({ ready: true; tagged: number; pattern: SlipPattern; count: number } & SlipCoachCopy);

/**
 * The learner's top slip. Only TAGGED mistakes count (the tag is the
 * learner's own reflection; untagged misses are not evidence yet).
 */
export function slipCoach(mistakes: SlipInput[]): SlipCoach {
  const tagged = mistakes.filter((m) => m.slip);
  if (tagged.length < SLIP_COACH_MIN) {
    return { ready: false, tagged: tagged.length, needed: SLIP_COACH_MIN - tagged.length };
  }
  const counts = new Map<SlipPattern, number>();
  for (const m of tagged) for (const p of patternsOf(m)) counts.set(p, (counts.get(p) ?? 0) + 1);
  let best: SlipPattern = PATTERN_ORDER[0];
  let bestN = -1;
  for (const p of PATTERN_ORDER) {
    const n = counts.get(p) ?? 0;
    if (n > bestN) {
      best = p;
      bestN = n;
    }
  }
  return { ready: true, tagged: tagged.length, pattern: best, count: bestN, ...PATTERN_COPY[best] };
}
