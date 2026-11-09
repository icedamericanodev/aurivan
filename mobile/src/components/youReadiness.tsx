/** Readiness estimate shared by You; detailed domain charts live in the report. */
import { READY_LOW } from '../engine/examReady';
import type { ReadinessRange } from '../engine/readinessRange';
import { ScaleBar, scaleSpoken } from './fieldguide';
import type { Growth } from './motion';

/** "Estimated readiness 68 to 78 percent, a study estimate…", or the countdown to the first range. */
export function readinessSpoken(range: ReadinessRange): string {
  return scaleSpoken(range, READY_LOW);
}

/**
 * The low end, said once under the scale bar (Grove panel Q1, the website's
 * same sentence): what the low end is, what the study bar asks of it, and how
 * far off it is. The numbers come from the range and the app's study bar
 * (READY_LOW), never a written-in 80. Presentation only: no maths changes.
 * Short text (Sky, 5 Nov): three short sentences, one idea each, and the
 * honesty words ("a goal, not an exam score") kept.
 */
export function lowEndLine(low: number, bar = READY_LOW): string {
  const gap = bar - low;
  return `Your low end, ${low}, is the cautious end. The study bar is ${bar}, a goal, not an exam score. ${
    gap > 0 ? `You’re ${gap} under it.` : 'You’re at or above it.'
  }`;
}

/** The range on its scale bar, with the study bar's tick. */
export function ReadinessBlock({ range, growth }: { range: ReadinessRange; growth?: Growth }) {
  return <ScaleBar range={range} mark={READY_LOW} growth={growth} />;
}

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
/** Numbered area caption used by the mock results summary. */
export const areasTitle = (n: number) => `${COUNT_WORDS[n] ?? n} ${n === 1 ? 'area' : 'areas'}, one scale`;
