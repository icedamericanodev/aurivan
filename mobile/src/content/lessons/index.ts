/** Lesson registry — every certification's lessons in one place. */
import { CISA_LESSONS } from './cisa';
import type { Lesson } from './types';

const ALL: Lesson[] = [...CISA_LESSONS];

export function lessonsFor(certId: string, domainId?: string): Lesson[] {
  return ALL.filter((l) => l.certId === certId && (!domainId || l.domainId === domainId)).sort(
    (a, b) => Number(a.domainId) - Number(b.domainId) || a.order - b.order,
  );
}

export function findLesson(id: string): Lesson | undefined {
  return ALL.find((l) => l.id === id);
}

/** The first lesson not yet done, preferring the given (weakest) domain. */
export function nextLesson(certId: string, done: string[], preferDomainId?: string): Lesson | undefined {
  const open = lessonsFor(certId).filter((l) => !done.includes(l.id));
  return open.find((l) => l.domainId === preferDomainId) ?? open[0];
}

/**
 * The lesson that prepares a learner for this bank question, if any.
 * Used to offer "Review the lesson" after a missed question.
 */
export function lessonPreparing(certId: string, questionId: string): Lesson | undefined {
  return lessonsFor(certId).find((l) => l.prepares?.includes(questionId));
}
