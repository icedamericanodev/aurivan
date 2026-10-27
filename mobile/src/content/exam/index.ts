/**
 * Exam pack loader: the only code that knows where the exam guide and the
 * final review week come from: the cert's content pack (content/packs/:
 * bundled in the app today, works offline), parsed the first time a screen
 * asks for it, like the notes.
 *
 * Plain English: a certification with no exam files gets nulls, and every
 * row that leads to them (Learn, Help, Today) hides itself.
 */
import { onClearContentCaches, sourceFor } from '../packs';
import type { ExamGuide, ExamPack, FinalWeek } from './types';

const cache = new Map<string, ExamPack | null>();

function getExamPack(certId: string): ExamPack | null {
  if (cache.has(certId)) return cache.get(certId) ?? null;
  // A test that stands in its own generated module may leave the exam pack out: null.
  const pack = sourceFor(certId).exam(certId);
  cache.set(certId, pack);
  return pack;
}

/** "About the <cert> exam", or null when this cert has none. */
export function getExamGuide(certId: string): ExamGuide | null {
  const g = getExamPack(certId)?.guide ?? null;
  return g && g.sections.length > 0 ? g : null;
}

/** The final review week, or null when this cert has none. */
export function getFinalWeek(certId: string): FinalWeek | null {
  const w = getExamPack(certId)?.week ?? null;
  return w && w.days.length > 0 ? w : null;
}

export const hasExamGuide = (certId: string) => getExamGuide(certId) !== null;
export const hasFinalWeek = (certId: string) => getFinalWeek(certId) !== null;

/** Test helper: forget cached packs (tests swap the pack in and out). */
export function clearExamCache(): void {
  cache.clear();
}

// clearContentCaches() (content/packs) empties this too.
onClearContentCaches(clearExamCache);
