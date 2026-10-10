/**
 * The active certification's study outline (engine/outline.ts), built once
 * per cert from its notes pack, plus the small lookups screens need
 * (which lesson teaches a topic, is a topic studied / clear).
 */
import { lessonsFor } from '../content/lessons';
import { findQuestion } from '../content/loader';
import { getNotes } from '../content/notes';
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

/** True when the question still exists in the bundled bank. */
export const questionExists = (certId: string) => (id: string) => Boolean(findQuestion(certId, id));

/** Test helper: forget cached outlines. */
export function clearOutlineCache(): void {
  cache.clear();
}
