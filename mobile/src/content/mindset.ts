/**
 * Mindset tips for the Practice tab's strip (Grove Phase 4, PHASE4.md 7.8 item 3).
 *
 * Plain English: the website rotates short "Mindset." tips on its Practice page. Sky answered O7 YES
 * (5 Nov 2026): the phone gets the same list and shows the strip. The list below is the website's
 * `MINDSET` array in index.html, word for word (it already reads "When you see FIRST, eliminate",
 * with no spaced hyphen). It lives here, a phone-only file, so nothing compiled into the website
 * bundles changes. A course with no tips gets [] and the strip hides itself (never an empty card).
 *
 * If the website's list changes, copy it here again in the same change, so both builds say the same.
 */
const CISA_MINDSET: readonly string[] = [
  'You are an auditor: you assess, recommend, and report. You do not fix.',
  'When you see FIRST, eliminate any option that implements a solution.',
  'Risk-based thinking: always address the highest risk area first.',
  'Preventive controls > Detective controls > Corrective controls.',
  'Least privilege and need-to-know are the auditor best friends.',
  'Independence is non-negotiable. An auditor cannot audit their own work.',
  'When more than one standard applies, follow the more rigorous requirement and document why.',
  'Evidence must be: sufficient, reliable, relevant, and useful.',
  'BCP/DRP that is never tested is NOT a real control.',
  'RTO = how fast you recover. RPO = how much data you can afford to lose.',
  'The board sets risk appetite. Management sets risk tolerance.',
  'Parallel testing is the safest implementation cutover method.',
  'Encryption protects confidentiality. Hashing protects integrity.',
  'Digital signatures provide non-repudiation.',
  'The BEST answer is what an IS auditor does, not what an IT manager does.',
  'Audit findings go to management; fraud suspicions go to the audit committee.',
  'COBIT 2019 is ISACA’s framework for governance of enterprise IT (GEIT).',
  'An untested backup cannot be relied upon, same rule as BCP/DRP.',
  'Scope creep without change control is one of the top IT project failure causes.',
  'SoD: developers should never deploy their own code to production.',
];

/** The course's Mindset tips, in the website's order; [] for a course that has none. */
export function mindsetTipsFor(certId: string): readonly string[] {
  return certId === 'cisa' ? CISA_MINDSET : [];
}
