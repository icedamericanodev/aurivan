/**
 * Study notes loader — the only code that knows where notes come from.
 * Like the question loader, the pack is bundled in the app (offline) and
 * parsed the first time a screen asks for it.
 */
import { generatedNotes } from '../generated';
import type { NoteDomain, NoteSubtopic, NotesPack } from './types';

const cache = new Map<string, NotesPack | null>();

/** The cert's notes pack, or null when it has none. */
export function getNotes(certId: string): NotesPack | null {
  if (cache.has(certId)) return cache.get(certId) ?? null;
  const load = generatedNotes[certId];
  const pack = load ? load() : null;
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

export function findNote(certId: string, id: string): NoteSubtopic | undefined {
  return noteSubtopics(certId).find((s) => s.id === id);
}

/** Test helper: forget cached packs (tests swap the pack in and out). */
export function clearNotesCache(): void {
  cache.clear();
}
