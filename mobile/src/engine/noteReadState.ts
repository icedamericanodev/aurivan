/**
 * Note read state (mobile 1.25, "fill the circle"): every study note is in
 * one of three states, shown by the ReadMark circle (components/notes.tsx).
 *
 * Plain English:
 * - none: the learner has not spent real time on the note yet (an empty ring).
 * - started: the note's page has been open on screen for 10 seconds in total,
 *   with the app in front (a half-filled circle). Saved in `notesViewed`.
 * - read: the learner finished it (a full circle). Saved in `notesRead`, as
 *   before. Read outranks started. "Mark as not read" goes back to started,
 *   never to none: the learner did open it.
 *
 * A group of notes (a domain row) is none when nothing in it is started or
 * read, read when every note is read, and started in between.
 *
 * Pure TypeScript: no React, no storage. The screens and the progress store
 * call these; src/__tests__/note-read-state.test.ts checks them.
 */

export type NoteReadState = 'none' | 'started' | 'read';

/** A note counts as started after this much time open on screen (app in front). */
export const STARTED_AFTER_MS = 10_000;

/**
 * Reaching the end of a note marks it read only once it has been open this
 * long, so a quick flick to the bottom does not count. "Mark as read" and
 * "Practice this concept" are not held back by it.
 */
export const AUTO_READ_MIN_MS = 20_000;

/** How full the circle is for each state (0 = empty ring, 1 = solid disc). */
export const READ_FILL: Record<NoteReadState, number> = { none: 0, started: 0.5, read: 1 };

/** One note's state from the two saved lists. */
export function noteReadState(id: string, read: readonly string[], viewed: readonly string[] = []): NoteReadState {
  if (read.includes(id)) return 'read';
  return viewed.includes(id) ? 'started' : 'none';
}

/**
 * A group's state (every note of a domain): none when nothing in it is
 * started or read; read when every note is read; started otherwise. An
 * empty group is none (there is nothing to have read).
 */
export function groupReadState(ids: readonly string[], read: readonly string[], viewed: readonly string[] = []): NoteReadState {
  if (ids.length === 0) return 'none';
  const readSet = new Set(read);
  const viewedSet = new Set(viewed);
  let readHere = 0;
  let touched = false;
  for (const id of ids) {
    if (readSet.has(id)) {
      readHere++;
      touched = true;
    } else if (viewedSet.has(id)) {
      touched = true;
    }
  }
  if (readHere === ids.length) return 'read';
  return touched ? 'started' : 'none';
}

/** The words a note row shows under its name. */
export function readStateWords(state: NoteReadState): string {
  return state === 'read' ? 'Read' : state === 'started' ? 'Started' : 'Not read yet';
}

/** What a screen reader hears for a note row: "Audit Charter, started, not finished". */
export function readStateLabel(name: string, state: NoteReadState): string {
  const said = state === 'read' ? 'read' : state === 'started' ? 'started, not finished' : 'not read yet';
  return `${name}, ${said}`;
}

/** True when a note open for `openMs` may be marked read by reaching its end. */
export function canAutoRead(openMs: number): boolean {
  return openMs >= AUTO_READ_MIN_MS;
}

/**
 * The saved lists after "Mark as not read" or "Mark as read". Unmarking a
 * read note puts it in `viewed`, so it shows as started (never back to
 * none). Returns the same arrays when nothing changes, so the store can
 * skip the save.
 */
export function withNoteRead(
  read: readonly string[],
  viewed: readonly string[],
  id: string,
  nowRead: boolean,
): { read: readonly string[]; viewed: readonly string[] } {
  const has = read.includes(id);
  if (has === nowRead) return { read, viewed };
  if (nowRead) return { read: [...read, id], viewed };
  return { read: read.filter((x) => x !== id), viewed: viewed.includes(id) ? viewed : [...viewed, id] };
}

/** The viewed list with this note added (the same array when it is already there). */
export function withNoteViewed(viewed: readonly string[], id: string): readonly string[] {
  return viewed.includes(id) ? viewed : [...viewed, id];
}
