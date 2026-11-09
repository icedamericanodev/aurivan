/**
 * The Results coaching lines as the phone says them (release bug hunt round 1).
 *
 * engine/pace.ts COACHING is shared with the website (it is bundled into
 * assets/kaisip-plant.js, which index.html loads by its hash), so its words
 * stay as they are there. The phone's copy rule bans "pass", so the phone
 * swaps that one line, like lib/plantCopy.ts does for the plant's lines.
 * Pure: no React, no storage.
 */
import { COACHING, type CoachingTag } from '../engine/pace';

const PHONE_LINES: Partial<Record<CoachingTag, string>> = {
  'slow-right': 'You knew it; trust your first read.',
};

/** The quiet line under an answer on Results, for a coaching tag. */
export function coachingLine(tag: CoachingTag): string {
  return PHONE_LINES[tag] ?? COACHING[tag].line;
}
