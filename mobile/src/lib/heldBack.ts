/**
 * The held-back full form's status for a screen (engine/heldBack.ts has the rules).
 *
 * Plain English: is there a held-back form for this course, has the learner
 * taken it, and is it time for the one Today card? Null for every course
 * without a form or that does not opt in, so CISA's screens never change.
 */
import { getAllQuestions, getAllQuestionsIncludingRetired } from '../content/loader';
import type { Certification } from '../content/types';
import { firstTryReadiness, isFirstTryCourse } from '../engine/firstTry';
import { heldBackFormIn, isTaken, offerDue, type HeldBackForm } from '../engine/heldBack';
import type { CertProgress } from '../store/progress';

export interface HeldBackStatus {
  form: HeldBackForm;
  /** Taken already: a start is the "Full exam (seen)" retake. */
  taken: boolean;
  /** The Today card is due, and an early start needs no "Most useful in your last 2 to 3 weeks" ask. */
  due: boolean;
}

export function heldBackStatus(
  cert: Certification,
  cp: Pick<CertProgress, 'answers' | 'shown' | 'mocks' | 'heldBackTaken'>,
  daysLeft: number | null,
  today: string,
): HeldBackStatus | null {
  if (!isFirstTryCourse(cert)) return null;
  const form = heldBackFormIn(getAllQuestionsIncludingRetired(cert.id));
  if (!form) return null;
  const taken = isTaken(cp.heldBackTaken, form.key);
  const due = !taken && offerDue({
    sections: firstTryReadiness(cert, getAllQuestions(cert.id), cp.answers, cp.shown, today),
    mocks: cp.mocks,
    examQuestions: cert.exam.questions,
    daysLeft,
    taken,
  });
  return { form, taken, due };
}
