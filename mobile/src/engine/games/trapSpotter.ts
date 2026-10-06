/**
 * Trap Spotter — "find the answer built to fool you."
 *
 * Every question's first tip names its trap ("Trap is {{B}}: …"). The game
 * shows the question and asks the learner to tap the most TEMPTING wrong
 * answer first, then the right one. Spotting the trap is the core CISA
 * skill: most wrong answers on the real exam are true-but-not-best.
 *
 * Works for any certification whose tips follow the trap-first voice.
 */
import type { Letter, PackQuestion } from '../../content/types';
import { shuffled, type Rng } from '../random';

/** The ORIGINAL letter of the trap option named in tip 1, if any. */
export function trapLetter(q: PackQuestion): Letter | null {
  const tip = q.tips[0] ?? '';
  if (!/trap/i.test(tip)) return null;
  for (const m of tip.matchAll(/\{\{([A-D])\}\}/g)) {
    const l = m[1] as Letter;
    if (l !== q.correct && q.options[l] !== undefined) return l;
  }
  return null;
}

export function trapPool(pool: PackQuestion[]): PackQuestion[] {
  return pool.filter((q) => trapLetter(q) !== null);
}

export function buildTrapRound(pool: PackQuestion[], rng: Rng, size = 5): string[] {
  return shuffled(trapPool(pool), rng)
    .slice(0, size)
    .map((q) => q.id);
}

/** Points: 1 for spotting the trap, 1 for then choosing the best answer. */
export function scoreTrapPick(q: PackQuestion, trapPick: Letter, answerPick: Letter) {
  const spotted = trapPick === trapLetter(q);
  const correct = answerPick === q.correct;
  return { spotted, correct, points: (spotted ? 1 : 0) + (correct ? 1 : 0) };
}
