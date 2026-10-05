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
 */
import type { Certification } from '../content/types';

export interface AnswerRecord {
  attempts: number;
  correctCount: number;
  lastCorrect: boolean;
  lastAt: number;
}

export interface DomainMastery {
  domainId: string;
  answered: number; // unique questions answered
  mastered: number; // unique questions whose LAST answer was correct
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
  const tally = new Map<string, { answered: number; mastered: number }>();
  for (const [id, rec] of Object.entries(answers)) {
    const d = domainOf(id);
    const t = tally.get(d) ?? { answered: 0, mastered: 0 };
    t.answered += 1;
    if (rec.lastCorrect) t.mastered += 1;
    tally.set(d, t);
  }
  return cert.domains.map((dom) => {
    const t = tally.get(dom.id) ?? { answered: 0, mastered: 0 };
    return {
      domainId: dom.id,
      answered: t.answered,
      mastered: t.mastered,
      accuracy: t.answered ? t.mastered / t.answered : null,
      mastery: t.mastered / Math.max(t.answered, MIN_SAMPLE),
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
