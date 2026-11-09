/**
 * Grove Phase 4b: the plant's interface words on the phone (design-notes/grove/phase4b/PHASE4B.md
 * sections 3 and 9).
 *
 * Plain English for the founder:
 * - Some of the plant's words live in engine files that are ALSO compiled into the website's plant
 *   bundle (engine/plant.ts, engine/plantLooks.ts). Changing them there means rebuilding the
 *   website bundle in the same release (PHASE4B section 11, "build step 1"), which this phone-only
 *   change does not do. So the phone screens read their new words from here instead.
 * - Each fix below is written so it keeps working AFTER the bundle release changes the engine:
 *   once the engine already says the new words, the replace simply finds nothing to change.
 * - Nothing here is course content, and nothing here changes a rule, a saved key or a number.
 */
import { CROWN_MOCK, SPROUT_ANSWERS, type GrowthLevel } from '../engine/plant';
import { howToOpen, type HowOptions, type LookItem } from '../engine/plantLooks';

/** The Look line, said once on Your plant under Look (PHASE4B 4.1 item 10, section 9). */
export const LOOK_LINE = 'A look is just for you: it never changes your growth.';

/** The two footnotes under What grows it next (PHASE4B section 9, Sky's short text). */
export const OUTLINE_NOTE = 'Know the outline: topics right without a hint, on two separate days.';
export const REAL_PROGRESS_NOTE = 'Only real progress grows it, never taps, time, streaks or games. It never shrinks.';

/** The Elder row's line (PHASE4B 4.1 item 7 and 4.5). */
export const FULLY_GROWN = 'Fully grown. It keeps all of its growth.';

/**
 * What earned Sprout and Crown, past tense, word for word as the website's `todayGrewFact`
 * (index.html), with the numbers read from the engine so the two builds can never drift
 * (PHASE4B 4.1 item 6). Shoot, Bough and Elder use the engine's FORM_FACTS instead.
 */
export const GREW_FACTS: Partial<Record<GrowthLevel, string>> = {
  2: `It grew from your first ${SPROUT_ANSWERS} answers.`,
  5: `You finished a mock of ${CROWN_MOCK} questions or more.`,
};

/** "Pick up whenever you're ready." becomes "Pick up whenever you like." (PHASE4B 3.4: no "you're ready"). */
export function phoneRestLine(line: string): string {
  return line.replace('Pick up whenever you’re ready.', 'Pick up whenever you like.').replace("Pick up whenever you're ready.", 'Pick up whenever you like.');
}

/** A look item's caption on the phone (PHASE4B 3.1 and 3.3: no "field guide", no "passed"). */
export function lookCaption(item: LookItem): string {
  if (item.id === 'botanical') return 'A fine line drawing, like a botanist’s sketch.';
  if (item.id === 'ribbon') return 'The ribbon: you got the score you needed.';
  return item.caption;
}

/** How a look item opens, on the phone (PHASE4B 3.3 and 3.4: no "passed", no "Herbarium"). */
export function lookHowToOpen(item: LookItem, o: HowOptions = {}): string {
  if (item.unlock.kind === 'passed') return 'Opens when you tell us you got the score you needed.';
  return howToOpen(item, o).replace(' set in the Herbarium.', ' set in Badges.');
}
