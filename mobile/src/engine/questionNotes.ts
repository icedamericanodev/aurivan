/**
 * "Your note" on a question: the learner's own words about one question,
 * written after the answer is checked.
 *
 * Plain English:
 * - Notes are kept per exam in the progress store as
 *   `qNotes: { [questionId]: { text, ts } }`. That is the SAME name and shape
 *   the web app uses (index.html `S.qNotes`, `QNOTE_MAX`), so notes can travel
 *   between web and phone later without a conversion.
 * - `ts` is when the note was last changed (epoch ms).
 * - Deleting a note does NOT remove its entry: it leaves a "tombstone",
 *   `{ text: '', ts }`. Sync (engine/syncMerge.ts, built OFF) joins two phones'
 *   data, and without the tombstone the other phone's old copy would bring a
 *   deleted note back. Screens treat an empty text as "no note".
 * - When two copies of the same note meet (sync), the newer `ts` wins,
 *   tombstones included.
 *
 * Pure TypeScript: no React, no storage. The store (store/progress.ts) calls
 * `withNote`; the backup checker (engine/backup.ts) calls `capNoteText`.
 */

/** The longest note, in characters: the web's QNOTE_MAX, so the two stay compatible. */
export const QNOTE_MAX = 1000;

/**
 * The most note text one exam may hold, in characters, all notes together
 * (security review: a backup file must stay under the 1 MB restore limit).
 * About 300 full notes; a new note or a longer edit past it is not saved, and
 * the sheet says why (NOTES_FULL_LINE).
 */
export const NOTES_TOTAL_MAX = 300_000;
/** What the sheet says when a note can't grow because the notes are full. */
export const NOTES_FULL_LINE = 'Your notes are full, so this change isn’t saved. Delete or shorten an older note to make room.';
/** A deleted note's tombstone is left out of backup FILES after this many days. */
export const TOMBSTONE_KEEP_DAYS = 90;

/** One saved note. An empty `text` is a deleted note (a tombstone). */
export interface QuestionNote {
  text: string;
  ts: number;
}
export type QuestionNotes = Record<string, QuestionNote>;

/**
 * A question id as the web accepts it (index.html PARITY_ID_RE): a letter or
 * digit, then up to 63 letters, digits, "_", ".", ":" or "-".
 */
export const NOTE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;

/**
 * The text cut to QNOTE_MAX characters. If the cut would split an emoji (a
 * surrogate pair, two characters), the half emoji is dropped too.
 */
export function capNoteText(text: string, max = QNOTE_MAX): string {
  if (text.length <= max) return text;
  const code = text.charCodeAt(max - 1);
  const splitsPair = code >= 0xd800 && code <= 0xdbff;
  return text.slice(0, splitsPair ? max - 1 : max);
}

/** True when there is a note to show (not missing, not a tombstone, not only spaces). */
export function isLiveNote(n: QuestionNote | undefined): n is QuestionNote {
  return Boolean(n && n.text.trim() !== '');
}

/** The note's text for one question, or '' when there is none. */
export function noteTextOf(notes: QuestionNotes | undefined, id: string): string {
  const n = notes?.[id];
  return isLiveNote(n) ? n.text : '';
}

/** All note text in one exam, in characters (tombstones count 0). */
export function totalNoteChars(notes: QuestionNotes | undefined): number {
  let n = 0;
  for (const v of Object.values(notes ?? {})) n += v.text.length;
  return n;
}

/**
 * True when `text` can be saved as this question's note without passing
 * NOTES_TOTAL_MAX. Shortening or deleting always fits, even when the notes
 * are already over (an older save, a restore), so the learner can make room.
 */
export function noteFits(notes: QuestionNotes | undefined, id: string, text: string): boolean {
  const next = capNoteText(text).length;
  const now = notes?.[id]?.text.length ?? 0;
  if (next <= now) return true;
  return totalNoteChars(notes) - now + next <= NOTES_TOTAL_MAX;
}

/** The notes without tombstones older than TOMBSTONE_KEEP_DAYS (the same object when none are). */
export function pruneTombstones(notes: QuestionNotes | undefined, now: number, keepDays = TOMBSTONE_KEEP_DAYS): QuestionNotes | undefined {
  if (!notes) return notes;
  const cutoff = now - keepDays * 86_400_000;
  const old = Object.entries(notes).filter(([, n]) => n.text === '' && n.ts < cutoff);
  if (old.length === 0) return notes;
  const out = { ...notes };
  for (const [id] of old) delete out[id];
  return out;
}

/**
 * The notes with one question's note set to `text` (saved as typed, cut to
 * the limit). Text that is empty or only spaces DELETES the note, leaving a
 * tombstone. A change that would pass NOTES_TOTAL_MAX is not made. Returns
 * the SAME object when nothing changes, so the store can skip a save (and
 * screens don't re-render).
 */
export function withNote(notes: QuestionNotes | undefined, id: string, text: string, now: number): QuestionNotes | undefined {
  if (!NOTE_ID_RE.test(id)) return notes;
  const capped = capNoteText(text);
  const prev = notes?.[id];
  if (capped.trim() === '') {
    // Nothing to delete: no save.
    if (!isLiveNote(prev)) return notes;
    return { ...notes, [id]: { text: '', ts: now } };
  }
  if (prev && prev.text === capped) return notes;
  if (!noteFits(notes, id, capped)) return notes;
  return { ...notes, [id]: { text: capped, ts: now } };
}

/**
 * Two copies of one question's note (two phones): the newer edit wins, a
 * deletion included. At the very same moment the longer-sorting text wins,
 * so merge(a, b) and merge(b, a) always agree (a non-empty note beats a
 * tombstone made at the same millisecond).
 */
export function mergeNote(a: QuestionNote, b: QuestionNote): QuestionNote {
  if (a.ts !== b.ts) return a.ts > b.ts ? a : b;
  return a.text >= b.text ? a : b;
}

/** Two whole note maps, question by question (mergeNote). */
export function mergeNotes(a: QuestionNotes | undefined, b: QuestionNotes | undefined): QuestionNotes | undefined {
  if (!a && !b) return undefined;
  const out: QuestionNotes = {};
  const ids = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].sort();
  for (const id of ids) {
    const x = a?.[id];
    const y = b?.[id];
    out[id] = x && y ? mergeNote(x, y) : (x ?? y)!;
  }
  return out;
}

/** The notes there are to show (tombstones left out), newest first. */
export function liveNotes(notes: QuestionNotes | undefined): { id: string; text: string; ts: number }[] {
  return Object.entries(notes ?? {})
    .filter(([, n]) => isLiveNote(n))
    .map(([id, n]) => ({ id, text: n.text, ts: n.ts }))
    .sort((x, y) => y.ts - x.ts || (x.id < y.id ? -1 : 1));
}

/**
 * A short one-line preview: line breaks and runs of spaces become one space,
 * and a text over `max` is cut at the last whole word, with "…".
 */
export function noteSnippet(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = capNoteText(flat, max);
  const space = cut.lastIndexOf(' ');
  // Cut at a word break when there is one in the second half; otherwise cut mid-word.
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
