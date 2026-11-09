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
 */
import type { Certification } from './types';

export const scaledScoreNote = (cert: Pick<Certification, 'id'>): string =>
  cert.id === 'cissp'
    ? 'ISC2 reports scaled scores out of 1000. The score needed is 700.'
    : 'ISACA reports scaled scores from 200 to 800. The score needed is 450.';
