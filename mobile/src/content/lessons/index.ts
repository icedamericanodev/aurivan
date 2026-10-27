/**
 * Lesson registry — every certification's lessons in one place.
 *
 * The lessons come from each cert's content pack (content/packs/; written
 * from ../data/lessons/<cert>.json by scripts/build-content.mjs, schema in
 * docs/content/LESSONS_SCHEMA.md), parsed the first time a screen asks.
 *
 * Retired lessons (content packs): a retired lesson stays in the pack so a
 * learner's done list and old links still resolve (findLesson), but it is
 * never offered again: lessonsFor, nextLesson and every lesson link below
 * leave it out.
 */
import { findNote } from '../notes';
import { installedCertIds, onClearContentCaches, sourceFor } from '../packs';
import type { Lesson } from './types';

/** certId → every lesson in the pack, in file order, retired ones included. */
const everyCache = new Map<string, Lesson[]>();
function every(certId: string): Lesson[] {
  let list = everyCache.get(certId);
  if (!list) {
    // Only this cert's own lessons, as the old single list was filtered by certId.
    list = (sourceFor(certId).lessons(certId) ?? []).filter((l) => l.certId === certId);
    everyCache.set(certId, list);
  }
  return list;
}

const byCourseOrder = (a: Lesson, b: Lesson) => Number(a.domainId) - Number(b.domainId) || a.order - b.order;

export function lessonsFor(certId: string, domainId?: string): Lesson[] {
  return every(certId)
    .filter((l) => !l.retired && (!domainId || l.domainId === domainId))
    .sort(byCourseOrder);
}

/**
 * Every lesson of a cert, retired ones INCLUDED, in course order. For code
 * that checks or keeps ids (a backup's known ids), never for offering a lesson.
 */
export function lessonsIncludingRetired(certId: string): Lesson[] {
  return [...every(certId)].sort(byCourseOrder);
}

/** One lesson by id, from any cert on this phone. Finds retired lessons too. */
export function findLesson(id: string): Lesson | undefined {
  for (const certId of installedCertIds()) {
    const hit = every(certId).find((l) => l.id === id);
    if (hit) return hit;
  }
  return undefined;
}

// clearContentCaches() (content/packs) empties this too.
onClearContentCaches(() => everyCache.clear());

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
 * The lessons a "Take the lesson" row may offer after a missed question (mobile 1.45), in order:
 * those that list the question in `prepares`, then those that list its study note (`noteId`) in
 * `notes`. Unlike lessonsForSubtopic there is NO outline-topic fallback: a lesson that only shares
 * the question's outline topic may never teach the idea that was missed (the note page keeps the
 * wider join, where "a lesson on this topic" is the honest claim). The caller offers the first not done.
 */
export function missLessons(certId: string, questionId: string, noteId?: string): Lesson[] {
  const lessons = lessonsFor(certId);
  const preparing = lessons.filter((l) => l.prepares?.includes(questionId));
  const teaching = noteId ? lessons.filter((l) => l.notes?.includes(noteId) && !preparing.includes(l)) : [];
  return [...preparing, ...teaching];
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
