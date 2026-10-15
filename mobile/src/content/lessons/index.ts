/** Lesson registry — every certification's lessons in one place. */
import { CISA_LESSONS } from './cisa';
import { findNote } from '../notes';
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
export function nextLesson(certId: string, done: readonly string[], preferDomainId?: string): Lesson | undefined {
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

/**
 * Lessons that teach this study-note subtopic ("4B1.2"), in course order.
 * First the lessons that list it in `notes`; when none do, the lessons that
 * teach its outline topic (the note's own `topicId`, "4B1") in `topics`, the
 * same join as lib/outline.ts topicLessons. Computed, never stored on the
 * note: the lessons are the single source of the link (mobile 1.20). An id
 * the notes pack does not know has no topic, so only `notes` can match it.
 */
export function lessonsForSubtopic(certId: string, subtopicId: string): Lesson[] {
  const lessons = lessonsFor(certId);
  const direct = lessons.filter((l) => l.notes?.includes(subtopicId));
  if (direct.length) return direct;
  const topicId = findNote(certId, subtopicId)?.topicId;
  return topicId ? lessons.filter((l) => l.topics?.includes(topicId)) : [];
}

/**
 * The note subtopic ids a lesson leads into, primary first: its own `notes`
 * when it has them, else the first subtopic of each outline topic it teaches
 * (`subtopicsOf` maps a topic code to its subtopic ids, in reading order).
 * Ids the notes pack does not know are dropped by the caller.
 */
export function noteIdsForLesson(lesson: Lesson, subtopicsOf: (topicId: string) => string[]): string[] {
  if (lesson.notes?.length) return lesson.notes;
  return (lesson.topics ?? []).map((t) => subtopicsOf(t)[0]).filter((id): id is string => Boolean(id));
}
