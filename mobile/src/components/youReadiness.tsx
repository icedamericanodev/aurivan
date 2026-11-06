/**
 * You → Readiness, as Field Guide plates (mobile 1.51, DESIGN_SYSTEM.md §21;
 * before: 1.43's one ring and its area rows).
 *
 * - `ReadinessBlock`: the overall range as a map's scale bar (ScaleBar): the
 *   range bracketed on 0–100, a tick at the app's 80 study bar, and the words
 *   "a study estimate, not a prediction" built in. Spoken as one image:
 *   "Estimated readiness 68 to 78 percent, a study estimate, not a
 *   prediction. The tick marks this app's 80 percent study bar."
 * - `AreaRows`: the areas as one line of growth each, on ONE scale with the
 *   dashed 70 line (StemChart): the percent only from 30 answers; below
 *   that a dashed shoot and "too few yet" (the list: "18 of 30", "answers,
 *   too few yet for a score"); "below 70" in words and
 *   `clay` for an area under its line; "↑3" for what went up since the
 *   learner last looked. From ×1.3 text the chart becomes its list.
 *
 * Motion: on the day's first view the band opens and the stems trace up; after a
 * rise since the last look only the estimate and the stems that grew move. Still
 * under Reduce Motion.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { Certification } from '../content/types';
import { AREAS_CAPTION, STEADY_FROM } from '../engine/domainBand';
import { READY_LOW } from '../engine/examReady';
import { areaStems } from '../engine/fieldGuide';
import type { Readiness } from '../engine/readiness';
import type { ReadinessRange } from '../engine/readinessRange';
import { motion, space } from '../theme/tokens';
import { FigCaption, KeyCaption, Plate, ScaleBar, scaleSpoken, StemChart, type StemPlay } from './fieldguide';
import { Button, T } from './ui';
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
/** "Five areas, one scale" (the plate's caption, for any exam's number of areas). */
export const areasTitle = (n: number) => `${COUNT_WORDS[n] ?? n} ${n === 1 ? 'area' : 'areas'}, one scale`;
/**
 * What the plate's marks mean, in words (KEY). Grove Phase 4 (PHASE4.md 7.11, DECISIONS 13 Q1): the
 * web's wording. The dashed line is 70, the target for each area; growth is the up arrow in green;
 * clay marks only an area below 70. On You the growth is since the learner last looked.
 * Short text (Sky, 5 Nov): "one line of growth per area, on the same scale" went (the title, "Five
 * areas, one scale", says it); each mark keeps its few words.
 */
export const AREAS_KEY = `${AREAS_CAPTION}. Dashed line: ${STEADY_FROM}, each area’s target. ↑: growth since you last looked. Clay: below ${STEADY_FROM}.`;
/** The key in words for screen readers: the "↑" glyph said as "Up arrow" (release bug hunt round 2). */
export const AREAS_KEY_SPOKEN = AREAS_KEY.replace('↑:', 'Up arrow:');
/** The line under the chart (the board's words): where the numbers come from. */
export const AREAS_SOURCE = 'Built from your answers in this app.';

/**
 * The areas on one scale, in one card (Grove Phase 4, the 04 board): its title and a Report link, the
 * chart, "Built from your answers in this app.", anything the screen adds (`children`), then its key.
 */
export function AreaRows({
  cert,
  readiness,
  ups,
  play,
  run,
  onReport,
  children,
}: {
  /** Opens the readiness report (the card's Report link). Left out, no link. */
  onReport?: () => void;
  /** Lines the screen adds under the chart (what went up, the bands line). */
  children?: ReactNode;
  cert: Certification;
  readiness: Readiness;
  /** Points up since the last real look, blueprint order (drawn as "↑3" and said in each area's label). */
  ups?: readonly number[];
  /** The stems trace up (the day's first view), or only what grew moves (a rise since the last look). */
  play?: StemPlay;
  /** Restart key for a growth. */
  run?: number;
}) {
  const stems = areaStems(cert.domains, readiness.domains, ups);
  return (
    <Plate tight testID="areas-plate">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.md, marginLeft: space.md, marginRight: onReport ? space.xs : space.md, marginBottom: space.sm }}>
        <FigCaption fig={{ n: 5, title: areasTitle(cert.domains.length) }} style={{ flexShrink: 1 }} />
        {onReport && (
          <Button kind="ghost" label="Report" accessibilityLabel="Report, your readiness report" accessibilityHint="Your mock trend, each domain side by side, and what would raise your low end" onPress={onReport} />
        )}
      </View>
      {/* A growth waits for the tab's fade (`enter`), so the rise is seen. */}
      <StemChart stems={stems} line={STEADY_FROM} play={play} run={run} delay={motion.dur.enter} />
      <View style={{ marginHorizontal: space.md }}>
        <T v="meta" style={{ marginTop: space.sm }}>{AREAS_SOURCE}</T>
        {children}
        <KeyCaption label="KEY" spoken={AREAS_KEY_SPOKEN} style={{ marginTop: space.sm }}>{AREAS_KEY}</KeyCaption>
      </View>
    </Plate>
  );
}
