/**
 * Domain naming — "Domain 1" or "Section A" (course decisions of 27 Nov 2026, item 4).
 *
 * Plain English for the founder:
 * - Every course today calls its parts of the exam "domains" and numbers them:
 *   "Domain 1", "Domain 4 · IS Operations". That is the default here, so a
 *   course without a `domainStyle` reads exactly as before.
 * - A course may ask for sections with letters instead (its `domainStyle` is
 *   { noun: 'Section', numbering: 'letter' }): "Section A", "all sections".
 * - Only the WORDS change. Domain ids stay "1".."n" in questions, saved
 *   progress and badge ids, so nothing saved ever moves.
 * - A lettered course writes its sub-topic codes as part digit + section
 *   letter + topic ("1B1.1" is section B, the second section), while CISA's
 *   "2A1.3" is Domain 2 (Part A). `domainOfCode` reads each the right way.
 *
 * Pure TypeScript: no React, no storage. The website's plant bundle uses it too
 * (engine/plant.ts, engine/readinessReport.ts), with no style: "Domain 1".
 */
import type { DomainStyle, QualifierCase } from '../content/types';

export type { DomainStyle };

/** What every course today uses: "Domain 1". */
export const DEFAULT_DOMAIN_STYLE: DomainStyle = { noun: 'Domain', numbering: 'number' };

/**
 * Anything that may carry a style: a Certification, a pick of one, or nothing.
 * `qualifierCase` rides along for the copy that names FIRST or BEST (the
 * Signpost Reader badge): missing → capitals, as every course today.
 */
export type DomainStyled = { domainStyle?: DomainStyle; qualifierCase?: QualifierCase } | null | undefined;

export function domainStyleOf(c: DomainStyled): DomainStyle {
  return c?.domainStyle ?? DEFAULT_DOMAIN_STYLE;
}

/** True when the course numbers its domains with letters ("Section A"). */
export const isLettered = (c: DomainStyled): boolean => domainStyleOf(c).numbering === 'letter';

/** How a domain id is written: "4" (numbered), or "D" for id "4" (lettered). An id that is not 1..26 stays as it is. */
export function domainMark(id: string, c?: DomainStyled): string {
  if (!isLettered(c)) return id;
  const n = Number(id);
  return /^\d+$/.test(id) && n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : id;
}

/** "Domain 4" or "Section D". */
export function domainTitle(id: string, c?: DomainStyled): string {
  return `${domainStyleOf(c).noun} ${domainMark(id, c)}`;
}

/** The four ways the noun appears in copy. Write the CISA word; a sectioned course gets "Section", "sections"… */
export type DomainWordForm = 'Domain' | 'Domains' | 'domain' | 'domains';

export function domainWord(c: DomainStyled, form: DomainWordForm): string {
  const noun = domainStyleOf(c).noun;
  const plural = form.endsWith('s');
  const lower = form.charAt(0) === 'd';
  const word = plural ? `${noun}s` : noun;
  return lower ? word.toLowerCase() : word;
}

/**
 * A fixed sentence written in CISA's words, said in the course's words.
 *
 * Plain English: some app copy is one fixed sentence shared by every screen
 * ("Every domain reached 60%…", "Domain 1 is the inner ring."). Rather than
 * write each sentence twice, the screen passes it through here:
 * - a course with NO `domainStyle` (CISA, every course today) gets the very
 *   same text back, untouched;
 * - a course with sections gets "Domain 1" → "Section A" and the word
 *   "domain(s)" → "section(s)", capital kept.
 * Only for the app's own fixed copy, never for a learner's or an author's text.
 */
export function domainCopy(text: string, c?: DomainStyled): string {
  if (!c?.domainStyle) return text;
  return text
    .replace(/\bDomain (\d{1,2})\b/g, (_m, id: string) => domainTitle(id, c))
    .replace(/\b[Dd]omains?\b/g, (m) => domainWord(c, m as DomainWordForm));
}

/**
 * The domain id a sub-topic code belongs to.
 * - Numbered (CISA): the code's first character, exactly as before ("2A1.3" → "2").
 * - Lettered: the first letter after the part digits ("1B1.1" → "2", "3D4.2" → "4");
 *   a code with no such letter falls back to the first character.
 */
export function domainOfCode(code: string, c?: DomainStyled): string {
  if (isLettered(c)) {
    const m = /^\d*([A-Z])/.exec(code);
    if (m) return String(m[1].charCodeAt(0) - 64);
  }
  return code.charAt(0);
}
