/**
 * The scaled score note under mock exams (Grove Phase 4, PHASE4.md O9 and 7.8 item 10).
 *
 * Plain English: the exam reports a scaled score, and a learner wants to know the number to reach.
 * The owner's word rules never say "pass" in learner text, so this says "the score needed". It is a
 * phone-only helper on purpose: `content/certifications.ts` already has a `passingNote`, but that file
 * is compiled into the website's cloud bundle, so changing it would rebuild the website bundles. The
 * data change moves to the release that rebuilds them; until then the phone reads its note from here.
 *
 * CISA, CISM, CRISC and AAIA use ISACA's 200 to 800 scale with 450 needed; CISSP uses ISC2's scale
 * out of 1000 with 700 needed (the same facts as certifications.ts).
 *
 * CIA_BANK_PLAN.md section 11 (26 Nov 2026): a course may bring its own line in `exam.scoreNote`
 * (The IIA's CIA exams will: 250 to 750, 600 needed). Why not `exam.passingNote`? Every course
 * already has one, worded "the passing mark", which the word rule keeps off screen; reading it
 * would change CISA's line. A course without `scoreNote` (every course today) keeps the line below.
 */
import type { Certification, ExamFormat } from './types';

/** The course as this note reads it: its id, and its exam's own line when it has one. */
type ScoreNoteCert = Pick<Certification, 'id'> & { exam?: Pick<ExamFormat, 'scoreNote'> };

export const scaledScoreNote = (cert: ScoreNoteCert): string => {
  // A course's own line wins (a blank one is ignored, so a typo can never show an empty note).
  const own = cert.exam?.scoreNote?.trim();
  if (own) return own;
  return cert.id === 'cissp'
    ? 'ISC2 reports scaled scores out of 1000. The score needed is 700.'
    : 'ISACA reports scaled scores from 200 to 800. The score needed is 450.';
};
