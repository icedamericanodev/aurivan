/**
 * Trap Spotter — "find the answer built to fool you."
 *
 * Every question names its trap: exam-style v2 tips say "Final two: {{D}}
 * beats {{B}} because…" (B is the trap); older tips open "Trap is {{B}}: …". The game
 * shows the question and asks the learner to tap the most TEMPTING wrong
 * answer first, then the right one. Spotting the trap is the core CISA
 * skill: most wrong answers on the real exam are true-but-not-best.
 *
 * Works for any certification whose tips follow the trap-first voice.
 */
import type { Letter, PackQuestion } from '../../content/types';
import { shuffled, type Rng } from '../random';

/** The tip that explains the trap: v2 "Final two: …", else the first tip. */
export function trapTip(q: PackQuestion): string {
  return q.tips.find((t) => t.startsWith('Final two:')) ?? q.tips[0] ?? '';
}

/** The ORIGINAL letter of the trap option (the runner-up), if any. */
export function trapLetter(q: PackQuestion): Letter | null {
  const tip = trapTip(q);
  // v2: "Final two: {{K}} beats {{R}}" — the runner-up R is the trap.
  const v2 = tip.match(/^Final two: \{\{([A-D])\}\} beats \{\{([A-D])\}\}/);
  if (v2) {
    const r = v2[2] as Letter;
    return v2[1] === q.correct && r !== q.correct && q.options[r] !== undefined ? r : null;
  }
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
