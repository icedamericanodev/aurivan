/**
 * The learner's mistake pattern, worked out for any screen that needs it.
 *
 * Plain English: the Mistake journal, the Play tab and the final review week
 * all ask "what keeps tripping this learner up?" Since phone 2.2 they all get
 * ONE answer: the journal's "Your mistake patterns" (engine/mistakeDNA.ts),
 * using the last 28 days, the learner's tags plus what their answers show,
 * and a pattern only once 5 mistakes have one and 3 share it. Before, Play and
 * the final week used every tag ever made, so Play could name a pattern while
 * the journal said "Not enough evidence yet" (behavioral-scientist, 20 Nov
 * 2026: recent evidence, one source of truth). Letters stay ORIGINAL letters.
 */
import { getCertification } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { mistakeDNA, type DNAInput, type MistakeDNA } from '../engine/mistakeDNA';
import type { SlipPattern } from '../engine/slipCoach';
import { dayKey } from '../engine/streak';
import type { MistakeEntry } from '../store/progress';

/** The journal's pattern summary for one exam: saved mistakes joined with their questions. */
export function mistakePatternsFor(certId: string, mistakes: Record<string, MistakeEntry>, now: number): MistakeDNA {
  const inputs: DNAInput[] = [];
  // How the course writes its qualifier: a lowercase course's "first" counts as a priority word too.
  const qualifierCase = getCertification(certId)?.qualifierCase;
  for (const [id, m] of Object.entries(mistakes)) {
    const q = findQuestion(certId, id);
    if (q) inputs.push({ id, certId, at: m.at, slip: m.slip, picked: m.picked, confidence: m.confidence, correct: q.correct, tips: q.tips, stem: q.stem, ...(qualifierCase ? { qualifierCase } : {}) });
  }
  return mistakeDNA(inputs, certId, now);
}

/** The journal's leading pattern, and whether another pattern ties with it. */
export interface TopPattern {
  pattern: SlipPattern;
  tied: boolean;
}

/**
 * One shared object per (pattern, tie) pair. Plain English: a zustand
 * selector redraws its screen when the value it returns is a different
 * object, even with the same contents. Handing back the same object for the
 * same answer keeps Play still when an answer is saved but the pattern stays
 * put (perf-tabs.test.tsx budgets).
 */
const shared = new Map<string, TopPattern>();
function same(pattern: SlipPattern, tied: boolean): TopPattern {
  const key = `${pattern}|${tied}`;
  let v = shared.get(key);
  if (!v) shared.set(key, (v = Object.freeze({ pattern, tied })));
  return v;
}

/** The leading pattern of a summary, or null when the journal names none. */
export function topPatternOf(dna: MistakeDNA): TopPattern | null {
  return dna.top ? same(dna.top.pattern, dna.tied) : null;
}

/**
 * The journal's leading pattern (null until there is enough evidence), for a
 * zustand selector. Plain English: the Play tab shows the pattern, not the
 * mistakes, so it subscribes to this small value (always the same object for
 * the same answer). It is worked out once per saved mistakes object and day,
 * so the drill stays put for the rest of the day instead of flipping as the
 * 28-day window slides (behavioral-scientist guardrail). New mistakes are new
 * evidence and update it at once.
 */
const topCache = new WeakMap<Record<string, MistakeEntry>, { certId: string; day: string; top: TopPattern | null }>();
export function topSlipPattern(certId: string, mistakes: Record<string, MistakeEntry>, now: number = Date.now()): TopPattern | null {
  const day = dayKey(now); // the learner's local calendar day, as streaks use
  const hit = topCache.get(mistakes);
  if (hit && hit.certId === certId && hit.day === day) return hit.top;
  const top = topPatternOf(mistakePatternsFor(certId, mistakes, now));
  topCache.set(mistakes, { certId, day, top });
  return top;
}
