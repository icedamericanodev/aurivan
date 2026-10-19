/**
 * The learner's mistake pattern, worked out for any screen that needs it.
 *
 * Plain English: the Mistake journal and the Play tab both want "what keeps
 * tripping this learner up?" This joins each saved mistake with its question
 * (so the coach can see the runner-up and priority words) and asks the pure
 * slip coach (engine/slipCoach.ts). Letters stay ORIGINAL letters.
 */
import { findQuestion } from '../content/loader';
import { slipCoach, type SlipCoach, type SlipInput, type SlipPattern } from '../engine/slipCoach';
import type { MistakeEntry } from '../store/progress';

export function slipPatternFor(certId: string, mistakes: Record<string, MistakeEntry>): SlipCoach {
  const inputs: SlipInput[] = [];
  for (const [id, m] of Object.entries(mistakes)) {
    const q = findQuestion(certId, id);
    if (q) inputs.push({ slip: m.slip, picked: m.picked, confidence: m.confidence, correct: q.correct, tips: q.tips, stem: q.stem });
  }
  return slipCoach(inputs);
}

/**
 * The learner's top pattern only (null until enough mistakes are tagged), for
 * a zustand selector. Plain English: the Play tab shows the pattern, not the
 * mistakes themselves, so it subscribes to this one word. Marking a mistake
 * fixed (a right answer later) leaves the pattern as it was, so Play, hidden
 * behind Practice, no longer re-renders on that answer. Worked out once per
 * saved mistakes object, so the selector costs nothing on other store writes.
 */
const topCache = new WeakMap<Record<string, MistakeEntry>, { certId: string; top: SlipPattern | null }>();
export function topSlipPattern(certId: string, mistakes: Record<string, MistakeEntry>): SlipPattern | null {
  const hit = topCache.get(mistakes);
  if (hit && hit.certId === certId) return hit.top;
  const coach = slipPatternFor(certId, mistakes);
  const top = coach.ready ? coach.pattern : null;
  topCache.set(mistakes, { certId, top });
  return top;
}
