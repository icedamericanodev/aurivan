/**
 * The active certification's study outline (engine/outline.ts), built once
 * per cert from its notes pack, plus the small lookups screens need
 * (which lesson teaches a topic, is a topic studied / clear).
 */
import { lessonsFor, noteIdsForLesson } from '../content/lessons';
import type { Lesson } from '../content/lessons/types';
import { findQuestion, isHeldBackOut, onHeldBackTakenChange } from '../content/loader';
import { getCertification } from '../content/certifications';
import { isFirstTryCourse } from '../engine/firstTry';
import { findNote, getNotes } from '../content/notes';
import { onClearContentCaches } from '../content/packs';
import type { NoteSubtopic } from '../content/notes/types';
import { indexOutline, outlineFromNotes, topicsIn, type OutlineIndex, type OutlineTopic } from '../engine/outline';
import { topicStatus, topicStudied } from '../engine/studyPath';
import type { CertProgress } from '../store/progress';

const cache = new Map<string, OutlineIndex>();

/** The cert's outline and lookups (empty when it has no notes). */
export function certOutline(certId: string): OutlineIndex {
  let o = cache.get(certId);
  if (!o) {
    o = indexOutline(outlineFromNotes(getNotes(certId)));
    cache.set(certId, o);
  }
  return o;
}

/** Topics in a scope (a domain, or all), in reading order. */
export function scopeTopics(certId: string, domainId?: string): OutlineTopic[] {
  return topicsIn(certOutline(certId).topics, domainId);
}

/** Lessons that teach this outline topic (a lesson lists codes like "4B1" in `topics`). */
export function topicLessons(certId: string, topicId: string) {
  return lessonsFor(certId).filter((l) => l.topics?.includes(topicId));
}

/**
 * The study notes a lesson leads into (mobile 1.20), primary first: the
 * lesson's own `notes` ids, else the first subtopic of each outline topic it
 * teaches. Only notes that exist in the pack (an old id never shows a dead row).
 */
export function lessonNotes(certId: string, lesson: Lesson): NoteSubtopic[] {
  const byTopic = (topicId: string) => certOutline(certId).topic(topicId)?.subtopics.map((s) => s.id) ?? [];
  return noteIdsForLesson(lesson, byTopic)
    .map((id) => findNote(certId, id))
    .filter((n): n is NoteSubtopic => Boolean(n));
}

/** Studied + last-5 status for a topic, from the learner's own progress. */
export function guidedStatus(certId: string, topic: OutlineTopic, progress: CertProgress) {
  const studied = topicStudied(
    topic,
    topicLessons(certId, topic.id).map((l) => l.id),
    progress.lessonsDone,
    progress.notesRead,
  );
  return topicStatus(topic, studied, progress.answers);
}

/**
 * True when the question still exists in the bundled bank. One function per
 * certification (the bank is bundled, so it never changes while the app
 * runs): engine/srs.ts dueCountFor shares its count per function.
 */
const existsByCert = new Map<string, (id: string) => boolean>();
export function questionExists(certId: string): (id: string) => boolean {
  let exists = existsByCert.get(certId);
  if (!exists) {
    exists = (id: string) => Boolean(findQuestion(certId, id));
    existsByCert.set(certId, exists);
  }
  return exists;
}

/**
 * True when the question exists AND is in play: not held back in a full exam
 * form the learner has not taken yet (engine/heldBack.ts). What review counts
 * and lists, the mistake journal, Saved and the Recall widget read, so an
 * older entry for a held-back question (an import, a save from before the
 * form was frozen) is neither counted nor listed until the form is taken
 * (a "1 due" review never starts empty).
 *
 * A course that does not opt in (CISA) gets questionExists itself: the very
 * same function, so its counts and their caches are exactly as before. For an
 * opted-in course the function is replaced whenever the taken forms change, so
 * a count cached on the old one (engine/srs.ts dueCountFor) is never reused.
 */
const inPlayByCert = new Map<string, (id: string) => boolean>();
export function questionInPlay(certId: string): (id: string) => boolean {
  if (!isFirstTryCourse(getCertification(certId))) return questionExists(certId);
  let inPlay = inPlayByCert.get(certId);
  if (!inPlay) {
    const exists = questionExists(certId);
    inPlay = (id: string) => exists(id) && !isHeldBackOut(certId, id);
    inPlayByCert.set(certId, inPlay);
  }
  return inPlay;
}
// A form taken (or a restore, a sync, a reset): a new function, so no count is reused.
onHeldBackTakenChange(() => inPlayByCert.clear());

/** Test helper: forget cached outlines. */
export function clearOutlineCache(): void {
  cache.clear();
  inPlayByCert.clear();
}

// clearContentCaches() (content/packs) empties these too.
onClearContentCaches(clearOutlineCache);
