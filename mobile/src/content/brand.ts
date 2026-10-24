/**
 * The KaiSip brand promise ("Set A: Rings", chosen by the owner 2026-10-07).
 *
 * One place for the tagline, the line under it and the four pillars, so the
 * welcome screen and Settings → About always say the same thing.
 * Source of truth: docs/mobile/DESIGN_SYSTEM.md, "Brand".
 */

/** Which drawing (components/brand.tsx `PillarGlyph`) goes with a pillar. */
export type PillarGlyphKind = 'path' | 'roots' | 'seasons' | 'tall';

export interface Pillar {
  glyph: PillarGlyphKind;
  title: string;
  body: string;
}

/*
 * Mobile 1.39 (owner decision, 22 Oct 2026): the "Master Modern Risk." tagline and its
 * vision line are gone. Settings → About now leads with the same words as the welcome
 * (WELCOME_HEADLINE + WELCOME_LINE below), so the app tells one CISA story.
 */

/** Said instead of any list of "coming soon" certifications (About, the Certification picker). */
export const CERT_SCOPE_LINE = 'Starting with CISA. More certifications later.';

/**
 * How the content is made, in the SAME words wherever the app says it (About, the
 * "Is KaiSip affiliated with ISACA?" answer). Never "authored from primary sources"
 * and never a bare "AI-assisted".
 */
export const PROVENANCE_LINE =
  'Original questions and notes, written with AI assistance and checked against ISACA’s published exam outline and standards.';

/**
 * The welcome screen (mobile 1.24): literal, not poetic. It names the exam and
 * the benefit, then says in four plain lines what a learner will actually do
 * and what the app does with their data. (The four brand pillars below still
 * live in Settings → About.)
 */
export const WELCOME_HEADLINE = 'Think like an IS auditor.';
export const WELCOME_LINE = 'CISA exam prep, taught the way the exam thinks.';
export const WELCOME_FACTS: readonly string[] = [
  // Mobile 1.41: the best feature first, in the web welcome's words (pre-beta review #10).
  'Questions that explain every option, the trap included.',
  'Your daily plan, built around your exam date.',
  'Progress shown as a range, never a promise.',
  'No account. Everything stays on your phone.',
];
/**
 * Said under the welcome facts (it used to sit on the exam step, which is gone).
 * Mobile 1.39: CISA only. The app teaches no ISC2 exam, so naming ISC2 here hinted
 * at a roadmap the welcome doesn't offer. Settings → About builds its notice from the
 * available certifications only (today CISA), so the two say the same thing.
 */
export const EXAM_TRADEMARK_LINE = 'Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.';

export const PILLARS: readonly Pillar[] = [
  { glyph: 'path', title: 'See the path', body: 'Know what to study next, and why it matters.' },
  { glyph: 'roots', title: 'Grow deep roots', body: 'Learn the principle behind every answer, not just the key.' },
  { glyph: 'seasons', title: 'Grow with the seasons', body: 'Your plan adjusts when your week or the frameworks change.' },
  { glyph: 'tall', title: 'Stand tall', body: 'Build the judgment your team and clients rely on.' },
];
