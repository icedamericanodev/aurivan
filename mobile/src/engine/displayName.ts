/**
 * "What should we call you?" (mobile 1.23): the learner's optional first name
 * (or nickname), used for one thing: Today says "Good morning, Maya".
 *
 * Plain English:
 * - It is typed by the learner, kept on this phone, and saved in their own
 *   backup file. It is NEVER sent anywhere by the app: not in support or
 *   feedback emails, not on share cards, not in the feedback board handle,
 *   not in any link (see support-email.test and display-name.test).
 * - `cleanDisplayName` is the one rule for what may be kept. Everything that
 *   reads a name from outside (the text field, a restored backup, an old or
 *   hand-edited save) goes through it, so nothing odd can reach the screen.
 *
 * Pure TypeScript: no React, no storage.
 */

/** Longest name we keep, in characters the learner sees (an emoji counts as one). */
export const MAX_DISPLAY_NAME = 24;
/** How much typed or restored text is examined at all (keeps the link check fast on huge input). */
const MAX_SCAN = 256;

// Removed outright: control characters, and the invisible "format" characters
// that can hide or reorder text (soft hyphen, zero-width spaces and joiners,
// left-to-right and right-to-left marks, the bidi override and isolate
// controls that can make text read backwards, the byte order mark, line and
// paragraph separators, variation selectors, blank "filler" letters).
// Written as escapes so this file stays plain ASCII.
const UNSAFE = /[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u2028-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFFB]/g;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
// Any kind of space (tabs and newlines too, so they collapse to one space).
const SPACES = /[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g;
// A web address or an email, which a name is never. The short list of
// endings is deliberate: "J.R. Smith" and "Mary.Jane" stay fine.
const LINKISH =
  /@|:\/\/|\bwww\.|\b(?:mailto|tel|sms|javascript|data|file|ftp|http|https):|\b[\p{L}\p{N}-]+\.(?:com|net|org|edu|gov|io|co|app|dev|me|ph|ly|xyz|info|biz|link|site|online|ai|us|uk|ca|au|ru|cn|tk|ml|ga|cf|gq|top|club|shop|store|page|click)\b/iu;

/**
 * The name to keep: spaces trimmed and collapsed to one, control and
 * direction-changing characters removed, at most MAX_DISPLAY_NAME characters.
 * Returns '' (no name) for anything that is not text, is empty after
 * cleaning, or looks like a web address or an email.
 */
export function cleanDisplayName(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Invisible characters go first, so hiding a link behind them ("w<zero-width>ww.x.com") does not work.
  // Only the first MAX_SCAN units are looked at: the link check below slows down badly on very long
  // text (a hostile backup), and anything past the first 24 characters is cut off anyway.
  const flat = input.slice(0, MAX_SCAN).replace(UNSAFE, '').replace(LONE_SURROGATE, '').replace(SPACES, ' ').trim();
  if (flat === '' || LINKISH.test(flat)) return '';
  // Cut by characters, not UTF-16 units, so an emoji is never split in half.
  const chars = Array.from(flat);
  return chars.length <= MAX_DISPLAY_NAME ? flat : chars.slice(0, MAX_DISPLAY_NAME).join('').trim();
}

/** The part of the greeting that depends on the hour: "Good morning", "Good afternoon", "Good evening". */
export function greetingForHour(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * The full greeting on Today: "Good morning, Maya" with a name, "Good
 * morning" without one. The name is cleaned again here, so a bad saved
 * value can never show.
 */
export function greetingWithName(hour: number, name?: string | null): string {
  const clean = cleanDisplayName(name);
  return clean ? `${greetingForHour(hour)}, ${clean}` : greetingForHour(hour);
}
