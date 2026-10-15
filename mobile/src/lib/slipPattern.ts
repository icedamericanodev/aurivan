/**
 * The learner's mistake pattern, worked out for any screen that needs it.
 *
 * Plain English: the Mistake journal and the Play tab both want "what keeps
 * tripping this learner up?" This joins each saved mistake with its question
 * (so the coach can see the runner-up and priority words) and asks the pure
 * slip coach (engine/slipCoach.ts). Letters stay ORIGINAL letters.
 */
import { findQuestion } from '../content/loader';
import { slipCoach, type SlipCoach, type SlipInput } from '../engine/slipCoach';
import type { MistakeEntry } from '../store/progress';

export function slipPatternFor(certId: string, mistakes: Record<string, MistakeEntry>): SlipCoach {
  const inputs: SlipInput[] = [];
  for (const [id, m] of Object.entries(mistakes)) {
    const q = findQuestion(certId, id);
    if (q) inputs.push({ slip: m.slip, picked: m.picked, confidence: m.confidence, correct: q.correct, tips: q.tips, stem: q.stem });
  }
  return slipCoach(inputs);
}
