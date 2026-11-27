/**
 * readinessRead — the answers every readiness STATEMENT reads
 * (docs/content/CIA_BANK_PLAN.md section 11, "Which screens read first tries").
 *
 * Plain English: for a course with `readinessRule: 'firstTry'`, the range on
 * Today, You and the readiness report, the report's rows, Results' readiness
 * note and the exam-ready hold all follow first tries at unseen questions
 * (engine/firstTry.ts firstTryAnswers). For every other course (CISA) they
 * read every answer, exactly as before: the very same answers object, so the
 * shared readiness cache (engine/readiness.ts readinessFor) is unchanged.
 *
 * The plant, streaks and activity counts never come here: they keep counting
 * every answer, because they reward study, not a readiness read.
 */
import { getAllQuestions } from '../content/loader';
import type { Certification } from '../content/types';
import { firstTryAnswers, isFirstTryCourse, type Shown } from '../engine/firstTry';
import type { TakenForms } from '../engine/heldBack';
import { readinessFor, type AnswerRecord, type Readiness } from '../engine/readiness';

/** The parts of a course's progress the read depends on. */
export interface ReadinessSource {
  answers: Record<string, AnswerRecord>;
  shown?: Shown;
  /** The pool changes when a held-back form is taken, so the read does too. */
  heldBackTaken?: TakenForms;
}

// One derived answers object per (answers, shown, taken, day): readinessFor caches on the object.
const cache = new WeakMap<Record<string, AnswerRecord>, { certId: string; shown?: Shown; taken?: TakenForms; today: string; out: Record<string, AnswerRecord> }>();

/** The answers readiness reads: every answer (most courses), or the counted first tries (opted-in courses). */
export function readinessAnswersOf(cert: Certification, cp: ReadinessSource, today: string): Record<string, AnswerRecord> {
  if (!isFirstTryCourse(cert)) return cp.answers;
  const hit = cache.get(cp.answers);
  if (hit && hit.certId === cert.id && hit.shown === cp.shown && hit.taken === cp.heldBackTaken && hit.today === today) return hit.out;
  const out = firstTryAnswers(getAllQuestions(cert.id), cp.answers, cp.shown, today);
  cache.set(cp.answers, { certId: cert.id, shown: cp.shown, taken: cp.heldBackTaken, today, out });
  return out;
}

/** Readiness as every readiness statement shows it (see the file comment). CISA: readinessFor(cert, answers). */
export function readinessRead(cert: Certification, cp: ReadinessSource, today: string): Readiness {
  return readinessFor(cert, readinessAnswersOf(cert, cp, today));
}
