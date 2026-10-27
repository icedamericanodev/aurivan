/**
 * Study notes loader — the only code that knows where notes come from.
 * Like the question loader, the notes come from the cert's content pack
 * (content/packs/: bundled in the app today, offline) and are parsed the
 * first time a screen asks for them.
 */
import { onClearContentCaches, sourceFor } from '../packs';
import type { NoteDomain, NoteSubtopic, NotesPack } from './types';

const cache = new Map<string, NotesPack | null>();

/** The cert's notes pack, or null when it has none. */
export function getNotes(certId: string): NotesPack | null {
  if (cache.has(certId)) return cache.get(certId) ?? null;
  const pack = sourceFor(certId).notes(certId);
  cache.set(certId, pack);
  return pack;
}

/** True when there is at least one note to read (the Learn entry hides otherwise). */
export function hasNotes(certId: string): boolean {
  return (getNotes(certId)?.domains.length ?? 0) > 0;
}

export function noteDomain(certId: string, domainId: string): NoteDomain | undefined {
  return getNotes(certId)?.domains.find((d) => d.id === domainId);
}

/** Every subtopic of a domain (or of the whole cert), in reading order. */
export function noteSubtopics(certId: string, domainId?: string): NoteSubtopic[] {
  const domains = getNotes(certId)?.domains ?? [];
  return domains
    .filter((d) => !domainId || d.id === domainId)
    .flatMap((d) => d.topics.flatMap((t) => t.subtopics));
}

/**
 * One subtopic by id ("4B1.2"). A map built once per cert (mobile 1.20: the
 * session, Results and every Mistake journal row look notes up by id), then a
 * map lookup instead of a scan of every note.
 */
const noteIndex = new Map<string, Map<string, NoteSubtopic>>();
export function findNote(certId: string, id: string): NoteSubtopic | undefined {
  let index = noteIndex.get(certId);
  if (!index) {
    index = new Map(noteSubtopics(certId).map((s) => [s.id, s]));
    noteIndex.set(certId, index);
  }
  return index.get(id);
}

/**
 * Which study-notes subtopic a question belongs to ("d4_012" → "4B1.2"),
 * from each note's `practiceIds`. Undefined when no note lists it (or the
 * cert has no notes). Used for the quiet subtopic mastery date: a question's
 * own `subtopic` field is a near-unique label ("Topic. Angle"), so the note
 * is the real study unit. Built once per cert, then a map lookup.
 */
const subtopicIndex = new Map<string, Map<string, string>>();
export function subtopicOfQuestion(certId: string, questionId: string): string | undefined {
  let index = subtopicIndex.get(certId);
  if (!index) {
    index = new Map();
    for (const s of noteSubtopics(certId)) {
      // First note wins if a question were ever listed twice (today none is).
      for (const id of s.practiceIds ?? []) if (!index.has(id)) index.set(id, s.id);
    }
    subtopicIndex.set(certId, index);
  }
  return index.get(questionId);
}

/** Test helper: forget cached packs (tests swap the pack in and out). */
export function clearNotesCache(): void {
  cache.clear();
  subtopicIndex.clear();
  noteIndex.clear();
}

// clearContentCaches() (content/packs) empties these too.
onClearContentCaches(clearNotesCache);
