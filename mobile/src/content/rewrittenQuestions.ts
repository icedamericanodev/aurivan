/**
 * Questions that were rewritten IN PLACE (same id, new stem, options and key).
 *
 * Plain English: saved progress stores answers by question id. When a question
 * keeps its id but becomes a different question, an old pick, slip tag or
 * right/wrong result would show against options the learner never saw. Each
 * entry says when the new wording reached the app: saved records for that id
 * written BEFORE then belong to the old question (engine/rewrittenQuestions.ts).
 *
 * Rule for the future (docs/content): a rewrite that changes the stem or key
 * gets a NEW id and the old id is retired with the `retired` flag. Add here
 * only if an in-place rewrite ever ships by mistake.
 */
import type { Rewrites } from '../engine/rewrittenQuestions';

/** Mobile 1.43 shipped web v12.35 / v12.36's rewrites (26 Oct 2026, 21:00 Manila = 13:00 UTC). */
const MOBILE_143 = Date.UTC(2026, 9, 26, 13, 0, 0);

export const REWRITTEN_QUESTIONS: Rewrites = {
  cisa: {
    d1_139: MOBILE_143,
    d3_087: MOBILE_143,
    d3_106: MOBILE_143,
  },
};
