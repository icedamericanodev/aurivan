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

export const TAGLINE = 'Master Modern Risk.';
export const VISION_LINE = 'Grow your judgment, one ring at a time.';

/**
 * The welcome screen (mobile 1.24): literal, not poetic. It names the exam and
 * the benefit, then says in four plain lines what a learner will actually do
 * and what the app does with their data. (The four brand pillars below still
 * live in Settings → About.)
 */
export const WELCOME_HEADLINE = 'Think like an IS auditor.';
export const WELCOME_LINE = 'CISA exam prep, taught the way the exam thinks.';
export const WELCOME_FACTS: readonly string[] = [
  'Your daily plan, built around your exam date.',
  'About 20 min a day.',
  'Progress shown as a range, never a promise.',
  'No account. Everything stays on your phone.',
];
/** Said under the welcome facts (it used to sit on the exam step, which is gone). */
export const EXAM_TRADEMARK_LINE = 'Not affiliated with or endorsed by ISACA® or ISC2®. Exam names are trademarks of their owners.';

export const PILLARS: readonly Pillar[] = [
  { glyph: 'path', title: 'See the path', body: 'Know what to study next, and why it matters.' },
  { glyph: 'roots', title: 'Grow deep roots', body: 'Learn the principle behind every answer, not just the key.' },
  { glyph: 'seasons', title: 'Grow with the seasons', body: 'Your plan adjusts when your week or the frameworks change.' },
  { glyph: 'tall', title: 'Stand tall', body: 'Build the judgment your team and clients rely on.' },
];
