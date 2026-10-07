/**
 * Readiness score — "how ready am I for the real exam?" as 0–100.
 *
 * It is weighted by the official blueprint, so a domain worth 26% of the
 * exam counts more than one worth 12%. Two honesty rules:
 *   1. Domains you have not practised count as 0, not as "skipped" — you
 *      cannot be exam-ready in a domain you have never touched.
 *   2. Until you have answered MIN_SAMPLE questions in a domain, the
 *      missing answers count as not-yet-correct, so 3/3 right does not
 *      show as 100% mastery.
 *
 * Coach me (assisted answers): if the learner opened the hint before
 * answering, a correct answer earns HALF a mastery point instead of a full
 * one (ASSISTED_WEIGHT). Getting it right with help is real progress, but
 * it is not yet proof you could do it alone on exam day.
 */
import type { Certification } from '../content/types';

export interface AnswerRecord {
  attempts: number;
  correctCount: number;
  lastCorrect: boolean;
  lastAt: number;
  /**
   * True when the LAST answer was given after "Coach me" showed a hint.
   * Optional on purpose: saves from before Coach me have no such field and
   * load as "not assisted" (no migration needed).
   */
  lastAssisted?: boolean;
}

/** How much an assisted answer counts toward readiness (half). */
export const ASSISTED_WEIGHT = 0.5;

/** Mastery credit for one answer record: 1 clean correct, 0.5 assisted correct, 0 wrong. */
export function answerCredit(rec: AnswerRecord): number {
  if (!rec.lastCorrect) return 0;
  return rec.lastAssisted ? ASSISTED_WEIGHT : 1;
}

/**
 * How much one answered question counts toward UNLOCKING the readiness range
 * (the "N more answers" countdown). An assisted answer counts half; a second
 * answer (two halves, or any clean answer) makes the question count whole.
 * This can only grow as you answer, so the countdown never jumps back up,
 * even when a question you once answered cleanly is redone with a hint.
 */
export function unlockWeight(rec: AnswerRecord): number {
  return rec.attempts <= 1 && rec.lastAssisted ? ASSISTED_WEIGHT : 1;
}

export interface DomainMastery {
  domainId: string;
  answered: number; // unique questions answered
  mastered: number; // unique questions whose LAST answer was correct
  /** Like `mastered`, but an assisted correct answer adds only ASSISTED_WEIGHT. */
  credit: number;
  /** Unique questions whose LAST answer was assisted (Coach me). */
  assisted: number;
  /** Σ unlockWeight: answers counted toward unlocking the range (assisted = half). */
  unlockAnswers: number;
  accuracy: number | null; // mastered / answered, null if none
  mastery: number; // 0..1, sample-size adjusted
}

export const MIN_SAMPLE = 10;

/** Domain id from a question id like "d4_217" → "4". */
export function domainOf(questionId: string): string {
  return /^d(\d+)_/.exec(questionId)?.[1] ?? '?';
}

export function domainMastery(
  cert: Certification,
  answers: Record<string, AnswerRecord>,
): DomainMastery[] {
  const zero = () => ({ answered: 0, mastered: 0, credit: 0, assisted: 0, unlockAnswers: 0 });
  const tally = new Map<string, ReturnType<typeof zero>>();
  for (const [id, rec] of Object.entries(answers)) {
    const d = domainOf(id);
    const t = tally.get(d) ?? zero();
    t.answered += 1;
    if (rec.lastCorrect) t.mastered += 1;
    t.credit += answerCredit(rec);
    if (rec.lastAssisted) t.assisted += 1;
    t.unlockAnswers += unlockWeight(rec);
    tally.set(d, t);
  }
  return cert.domains.map((dom) => {
    const t = tally.get(dom.id) ?? zero();
    return {
      domainId: dom.id,
      answered: t.answered,
      mastered: t.mastered,
      credit: t.credit,
      assisted: t.assisted,
      unlockAnswers: t.unlockAnswers,
      // Accuracy stays the plain "how many did I get right" share.
      accuracy: t.answered ? t.mastered / t.answered : null,
      // Mastery (what readiness is built from) uses the half-weighted credit.
      mastery: t.credit / Math.max(t.answered, MIN_SAMPLE),
    };
  });
}

export interface Readiness {
  score: number; // 0..100
  /** False until the learner has answered enough to make the score meaningful. */
  reliable: boolean;
  domains: DomainMastery[];
  /** The weakest domain weighted by exam impact — a good "study this next". */
  focusDomainId: string | null;
}

export function computeReadiness(
  cert: Certification,
  answers: Record<string, AnswerRecord>,
): Readiness {
  const domains = domainMastery(cert, answers);
  const totalWeight = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
  let weighted = 0;
  let focus: { id: string; gap: number } | null = null;
  for (const dm of domains) {
    const w = cert.domains.find((d) => d.id === dm.domainId)?.weight ?? 0;
    weighted += dm.mastery * w;
    const gap = (1 - dm.mastery) * w; // biggest points-on-the-table
    if (!focus || gap > focus.gap) focus = { id: dm.domainId, gap };
  }
  const answered = domains.reduce((s, d) => s + d.answered, 0);
  return {
    score: Math.round((weighted / totalWeight) * 100),
    reliable: domains.every((d) => d.answered >= MIN_SAMPLE),
    domains,
    focusDomainId: answered === 0 ? cert.domains[0]?.id ?? null : focus?.id ?? null,
  };
}
