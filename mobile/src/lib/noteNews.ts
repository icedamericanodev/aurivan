/**
 * Notes that became READ during this app session and whose row has not
 * shown it yet (mobile 1.25, "fill the circle"). In memory only, never saved.
 *
 * Plain English: when a note is finished, its circle on the notes list
 * should fill up once, the next time the learner sees that row. The note
 * screen writes a "news" entry here; the row (components/notes.tsx
 * ReadMark) plays the fill when it is on screen and then takes the entry,
 * so it plays once. A note that arrives read any other way (a backup
 * restore, a sync, a certification switch) has no entry: it simply shows
 * full, with no motion.
 *
 * Each entry is keyed by the ROW that should play it ("cisa:note:4B1.2" for
 * the note's own row, "cisa:domain:4" for its domain row when this note
 * finished the domain), and remembers how full the circle was before
 * (0 = not started, 0.5 = started), so the fill starts from there.
 */
const news = new Map<string, number>();

/** The key for one row's mark: a note row, or a domain row (every note of the domain). */
export function readMarkKey(certId: string, kind: 'note' | 'domain', id: string): string {
  return `${certId}:${kind}:${id}`;
}

/** The note screen: this row's circle should fill from `from` (0 or 0.5) to full. */
export function noteJustRead(key: string, from: number): void {
  news.set(key, from);
}

/** A note was marked not read again: there is nothing to play. */
export function forgetJustRead(key: string): void {
  news.delete(key);
}

/** The row: how full its circle was before it became read, or undefined when there is no news. */
export function justReadFrom(key: string | undefined): number | undefined {
  return key === undefined ? undefined : news.get(key);
}

/** The row has played its fill: it never plays again for this news. */
export function takeJustRead(key: string): void {
  news.delete(key);
}

/** Reset reading progress (and tests): drop every waiting fill. */
export function clearJustRead(): void {
  news.clear();
}
