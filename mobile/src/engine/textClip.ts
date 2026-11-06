/**
 * One way to shorten a line of text on screen (the answer screen's recapped
 * question, Results' list of questions): whole words, then ONE ellipsis
 * character, with no space or stray punctuation before it. Never "peer ..."
 * (a space before three dots) and never "processe..." (cut inside a word).
 * Pure TypeScript: no React, no storage.
 */

/** Punctuation and spaces that would sit badly just before the ellipsis ("peer,…", "audit:…"). */
const TRAILING = /[\s,;:.!?–—-]+$/;

/**
 * `text` in at most `max` characters, the ellipsis included. Spaces are
 * collapsed first. Text that already fits comes back whole (no ellipsis).
 * A single word longer than `max` is the only case cut inside a word.
 */
export function shortenAtWord(text: string, max: number): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  // The ellipsis takes one character of the room.
  const room = Math.max(1, Math.floor(max) - 1);
  // One character past the room, so a cut that lands exactly on a space keeps the word before it.
  const space = t.slice(0, room + 1).lastIndexOf(' ');
  const kept = space > 0 ? t.slice(0, space) : t.slice(0, room);
  return `${kept.replace(TRAILING, '') || kept}…`;
}

/**
 * About how many characters fit in `lines` lines of `width` points at `px`
 * points (the font size times the text scale), with room to spare: an
 * average character is taken as 0.52 of the size (Fraunces and Figtree run
 * nearer 0.47), and each line gives up 4 characters to a word that wraps
 * early. So text shortened to this budget ends inside the lines, never
 * clipped again by the layout. Never under 12, so a narrow box still says
 * a few words.
 */
export function lineBudget(width: number, px: number, lines: number): number {
  if (!(width > 0) || !(px > 0) || !(lines > 0)) return 12;
  return Math.max(12, Math.floor((lines * width) / (px * 0.52)) - 4 * lines);
}
