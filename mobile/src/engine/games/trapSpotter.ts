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

/**
 * What the step-1 tap was (ORIGINAL letters):
 * - 'spotted': the real snare;
 * - 'key':     the BEST answer itself. Not a snare: the screen says so at
 *              once and the learner continues (never a silent dead end);
 * - 'missed':  another wrong option.
 */
export type SnareStep = 'spotted' | 'key' | 'missed';
export function snareStep(q: PackQuestion, trapPick: Letter): SnareStep {
  if (trapPick === q.correct) return 'key';
  return trapPick === trapLetter(q) ? 'spotted' : 'missed';
}

/**
 * Options closed in step 2 (ORIGINAL letters). A wrong snare pick is
 * closed (you named it as a trap); the BEST answer is NEVER closed, so
 * picking it as the snare can't make the question impossible to get right.
 */
export function closedInStep2(q: PackQuestion, trapPick: Letter): Letter[] {
  return trapPick === q.correct ? [] : [trapPick];
}

/** Why the snare loses: its own wrong-answer note first, else the trap tip. */
export function snareWhy(q: PackQuestion): string {
  const t = trapLetter(q);
  return (t && q.wrongExplanations[t]) || trapTip(q);
}

/**
 * Points: 1 for spotting the trap, 1 for then choosing the best answer.
 * If step 1 tapped the best answer, the screen has REVEALED it, so the
 * answer step earns nothing (it still counts as answered, assisted).
 */
export function scoreTrapPick(q: PackQuestion, trapPick: Letter, answerPick: Letter) {
  const spotted = trapPick === trapLetter(q);
  const correct = answerPick === q.correct;
  const revealed = trapPick === q.correct;
  return { spotted, correct, points: (spotted ? 1 : 0) + (correct && !revealed ? 1 : 0) };
}
