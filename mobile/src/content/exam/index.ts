/**
 * Exam pack loader: the only code that knows where the exam guide and the
 * final review week come from. Bundled in the app (works offline) and
 * parsed the first time a screen asks for it, like the notes.
 *
 * Plain English: a certification with no exam files gets nulls, and every
 * row that leads to them (Learn, Help, Today) hides itself.
 */
import { generatedExam } from '../generated';
import type { ExamGuide, ExamPack, FinalWeek } from './types';

const cache = new Map<string, ExamPack | null>();

function getExamPack(certId: string): ExamPack | null {
  if (cache.has(certId)) return cache.get(certId) ?? null;
  // `?.`: a test that stands in its own generated module may leave the exam pack out.
  const load = generatedExam?.[certId];
  const pack = load ? load() : null;
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
