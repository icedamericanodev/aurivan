/**
 * The first set: the same five questions for every new learner (mobile 1.24).
 *
 * Plain English for the founder:
 * - On the first day a learner answers five questions straight after setup:
 *   one per exam domain, picked because a thoughtful person can answer them by
 *   reasoning like an IS auditor, without memorised jargon. The aim is a first
 *   win that is honest (about 3 of 5 right is normal), not a test.
 * - Everyone gets the SAME five in the SAME order, so we can tune how hard
 *   the first minutes feel and compare notes between testers.
 * - These are ordinary bank questions. Their answers count like any other
 *   answer (toward the readiness range, spaced review and the plant).
 * - The ids live here, not in `generated/` (that folder is rebuilt from
 *   ../data and must never be edited by hand). A test checks every id exists,
 *   there is one per domain, and they appear in domain order.
 *
 * Picks (CISA):
 *   d1_002  self-review threat: reassign the audit (independence)
 *   d2_006  the board stays accountable even when it delegates
 *   d3_002  coding before requirements are signed off puts business fit at risk
 *   d4_041  base an availability target on business impact, not on "more nines"
 *   d5_008  one clerk creating vendors AND approving payments: split the duties
 */

/** Question ids per certification, in domain order. A cert with no entry starts with an ordinary short set. */
export const FIRST_SET: Readonly<Record<string, readonly string[]>> = {
  cisa: ['d1_002', 'd2_006', 'd3_002', 'd4_041', 'd5_008'],
};

/** How many questions the first set asks (the same for every certification). */
export const FIRST_SET_SIZE = 5;

/** The ids of a certification's first set (empty when it has none). */
export function firstSetIds(certId: string): readonly string[] {
  return FIRST_SET[certId] ?? [];
}

/** What the set is called on screen. No "check" and no "diagnose": it is just the first five. */
export const FIRST_SET_TITLE = 'Your first five';
