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
 *   dashed 70 line (StemChart): the percent only from 30 answers; a seed
 *   and "too few yet · 18 answered" below that; "below 70" in words and
 *   `clay` for an area under its line; "↑3" for what went up since the
 *   learner last looked. From ×1.3 text the chart becomes its list.
 *
 * Motion: the bar draws in and the stems trace up on the day's first view
 * (or when they changed); still under Reduce Motion.
 */
import { View } from 'react-native';
import type { Certification } from '../content/types';
import { AREAS_CAPTION, STEADY_FROM } from '../engine/domainBand';
import { READY_LOW } from '../engine/examReady';
import { areaStems } from '../engine/fieldGuide';
import type { Readiness } from '../engine/readiness';
import type { ReadinessRange } from '../engine/readinessRange';
import { space } from '../theme/tokens';
import { KeyCaption, Plate, ScaleBar, scaleSpoken, StemChart } from './fieldguide';
import type { Growth } from './motion';

/** "Estimated readiness 68 to 78 percent, a study estimate…", or the countdown to the first range. */
export function readinessSpoken(range: ReadinessRange): string {
  return scaleSpoken(range, READY_LOW);
}

/** The range on its scale bar, with the study bar's tick. */
export function ReadinessBlock({ range, growth }: { range: ReadinessRange; growth?: Growth }) {
  return <ScaleBar range={range} mark={READY_LOW} growth={growth} />;
}

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
/** "Five areas, one scale" (the plate's caption, for any exam's number of areas). */
export const areasTitle = (n: number) => `${COUNT_WORDS[n] ?? n} ${n === 1 ? 'area' : 'areas'}, one scale`;
/** What the plate's marks mean, in words (KEY). */
export const AREAS_KEY = `${AREAS_CAPTION}. One line of growth per area, on the same scale. Dashed: the ${STEADY_FROM} line. Clay: below the line, or what grew since you last looked.`;

/** The areas on one scale, in a plate (Fig. 5), with its key. */
export function AreaRows({
  cert,
  readiness,
  ups,
  play,
}: {
  cert: Certification;
  readiness: Readiness;
  /** Points up since the last real look, blueprint order (drawn as "↑3" and said in each area's label). */
  ups?: readonly number[];
  /** The stems trace up (the day's first view, or what changed). */
  play?: boolean;
}) {
  const stems = areaStems(cert.domains, readiness.domains, ups);
  return (
    <View>
      <Plate tight fig={{ n: 5, title: areasTitle(cert.domains.length) }} testID="areas-plate">
        <StemChart stems={stems} line={STEADY_FROM} play={play} />
      </Plate>
      <KeyCaption label="KEY" style={{ marginTop: space.sm }}>{AREAS_KEY}</KeyCaption>
    </View>
  );
}
