/**
 * Today / You / Results building blocks (Grove v2, DESIGN_SYSTEM.md §10–11):
 * - ReadinessRow: mono growth rings + the honest readiness RANGE + stage line.
 * - DomainRings: rings in domain tones with a legend (You, Results).
 * - ClearingCard: the forest panel shown when the day's plan is done.
 * - Plan helpers: icon, title and meta line for each plan item.
 *
 * Readiness is always a range ("62–70%") or "Not enough data yet". The copy
 * never promises a pass: it describes mastery, weighted by the blueprint.
 */
import { REVIEW_CAP_LINE, REVIEW_UNIT } from '../engine/srs';
import { gameTitle } from '../engine/games/registry';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { domainColor } from '../content/certifications';
import type { Certification } from '../content/types';
import { biggestGrowth, clearingTitle, dayAccuracy, itemMinutes, type DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import type { Readiness } from '../engine/readiness';
import { rangeLabel, rangeSpoken, type ReadinessRange } from '../engine/readinessRange';
import { grewLine, LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GrowthRings, PlanLeaf } from './glyphs';
import { BookOpen, Gamepad2, ICON_STROKE, RotateCcw, Target, Timer } from './icons';
import { BigNum, DomainDot, ICON_SIZE, Row, T, useFontScale } from './ui';

// ── Plan items: icon, title, meta ─────────────────────────────────────
export function planIcon(item: PlanItem, color: string): ReactNode {
  const p = { size: ICON_SIZE.row, color, strokeWidth: ICON_STROKE };
  switch (item.kind) {
    case 'review':
      return <RotateCcw {...p} />;
    case 'lesson':
      return <BookOpen {...p} />;
    case 'practice':
      return <Target {...p} />;
    case 'game':
      return <Gamepad2 {...p} />;
    case 'mock':
      return <Timer {...p} />;
  }
}

/** Real, unshortened titles (spec §11: 2 lines allowed) and one short meta line. */
export function planText(item: PlanItem): { title: string; meta: string; short: string } {
  const mins = itemMinutes(item);
  switch (item.kind) {
    case 'review':
      // Same word as Practice and You ("due"); at the cap, say the rest wait.
      return {
        title: item.label ?? `Review ${item.count} ${REVIEW_UNIT}`,
        // The cap line only when MORE than 20 were due (exactly 20 fits one session).
        meta: `About ${mins} minutes · ${item.capped ? REVIEW_CAP_LINE.toLowerCase() : 'questions to revisit'}`,
        short: 'Spaced review',
      };
    case 'lesson':
      return { title: item.title, meta: `Lesson · ${mins} min`, short: `Lesson · ${mins} min` };
    case 'practice':
      return { title: item.label, meta: `About ${mins} minutes · new material first`, short: `Practice · ${mins} min` };
    case 'game':
      // Registry name by id: a plan saved before a rename shows today's name.
      return { title: gameTitle(item.gameId, item.label), meta: `Game · about ${mins} min`, short: `Game · ${mins} min` };
    case 'mock':
      return { title: item.label.split(' · ')[0], meta: `${item.questions} questions at exam pace`, short: `Mock · ${item.questions} questions` };
  }
}

/** The plan's leaf marks on the forest panel: filled = done, outline = to do. */
export function PlanLeaves({ done }: { done: boolean[] }) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${done.filter(Boolean).length} of ${done.length} done`}
      style={{ flexDirection: 'row', gap: 3 }}
    >
      {done.map((d, i) => (
        <PlanLeaf key={i} color={c.sap} filled={d} />
      ))}
    </View>
  );
}

// ── Readiness number: "62–70%" or "Not enough data yet" ───────────────
export function ReadinessFigure({ range, size = 52 }: { range: ReadinessRange; size?: 52 | 34 | 24 }) {
  const { c } = useTheme();
  if (!range.enough) {
    return <T v={size === 52 ? 'hero' : 'headline'} color={c.ink}>Not enough data yet</T>;
  }
  return <BigNum value={rangeLabel(range)} pct size={size} />;
}

/** Shown with the readiness range: it is a study estimate, not a promise of a pass. */
export const ESTIMATE_NOTE = 'A study estimate, not a prediction of your exam result.';

// ── Readiness row on Today (spec §11 "Today") ─────────────────────────
// Rings 104 (monochrome) + range + meta + italic stage. Stacks at large text.
export function ReadinessRow({
  cert,
  readiness,
  range,
  stage,
}: {
  cert: Certification;
  readiness: Readiness;
  range: ReadinessRange;
  /** e.g. "Stage 3 · Make it stick" */
  stage: string;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const meta = range.enough
    ? // An ESTIMATE, never a prediction (app-store review: no outcome claims).
      'estimated readiness, weighted by the blueprint'
    : // A countdown, not a moving target: `needed` never goes up after an answer.
      `${range.needed} more ${range.needed === 1 ? 'answer' : 'answers'} until your readiness range`;
  return (
    <View
      accessible
      accessibilityLabel={`Estimated readiness ${rangeSpoken(range)}. ${range.enough ? `Weighted by the exam blueprint. ${ESTIMATE_NOTE}` : meta} ${stage}.`}
      style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: stacked ? 10 : 18, marginTop: 22 }}
    >
      <GrowthRings
        preset="today"
        mastery={readiness.domains.map((d) => d.mastery)}
        weights={cert.domains.map((d) => d.weight)}
        colors={c.accent}
        track={c.track}
      />
      <View style={{ flex: stacked ? undefined : 1 }}>
        <ReadinessFigure range={range} />
        <T v="meta" style={{ marginTop: 4 }}>{meta}</T>
        {/* One quiet line, only once there is a range to explain. */}
        {range.enough && <T v="meta" style={{ marginTop: 2 }}>{ESTIMATE_NOTE}</T>}
        <T v="stage" style={{ marginTop: 6 }}>{stage}</T>
      </View>
    </View>
  );
}

// ── Rings in domain tones + legend (You, Results) ─────────────────────
/**
 * `values` are 0..1 per domain (blueprint order), or null for "not started".
 * The legend lists domains OUTSIDE-IN, matching the rings visually.
 */
export function DomainRings({
  cert,
  values,
  center,
  legendValue,
  accessibilityLabel,
}: {
  cert: Certification;
  values: (number | null)[];
  center: ReactNode;
  /** Legend text per domain; defaults to a whole percent. */
  legendValue?: (i: number) => string;
  accessibilityLabel: string;
}) {
  const { c, isDark } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const tones = cert.domains.map((d) => domainColor(d.tone, isDark));
  const label = (i: number) => legendValue?.(i) ?? (values[i] === null ? '–' : String(Math.round((values[i] ?? 0) * 100)));
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: space.lg }}>
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <GrowthRings
          preset="you"
          mastery={values.map((v) => v ?? 0)}
          weights={cert.domains.map((d) => d.weight)}
          colors={tones}
          track={c.track}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {center}
        </View>
      </View>
      <View style={{ flex: stacked ? undefined : 1, gap: 9, alignSelf: stacked ? 'stretch' : undefined }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {[...cert.domains.keys()].reverse().map((i) => (
          <Row key={cert.domains[i].id} gap={9}>
            <DomainDot domain={cert.domains[i]} />
            <T v="meta" color={c.ink} style={{ flex: 1 }}>{cert.domains[i].short}</T>
            <BigNum value={label(i)} size={17} />
          </Row>
        ))}
      </View>
    </View>
  );
}

/** Spoken summary for rings: "IS Audit 88, IT Governance 63, …". */
export function ringsSpoken(cert: Certification, values: (number | null)[]): string {
  return cert.domains
    .map((d, i) => `${d.short} ${values[i] === null ? 'not started' : Math.round((values[i] ?? 0) * 100)}`)
    .join(', ');
}

// ── Clearing card (spec §11 "Daily clearing card") ────────────────────
export function ClearingBody({
  plan,
  readiness,
  range,
  cert,
}: {
  plan: DayPlan;
  readiness: Readiness;
  range: ReadinessRange;
  cert: Certification;
}) {
  const { c } = useTheme();
  const acc = dayAccuracy(plan);
  const grew = biggestGrowth(plan, readiness);
  const grewDomain = grew ? cert.domains.find((d) => d.id === grew.domainId) : undefined;
  // Never a negative framing: "grew to" when up, "holding at" otherwise.
  const line = range.enough
    ? `Readiness ${readiness.score > plan.start.score ? 'grew to' : 'holding at'} ${rangeLabel(range)}%`
    : 'Readiness takes shape as you answer';
  const stats: [string, string, boolean][] = [
    [String(plan.answered), 'questions', false],
    [acc === null ? '–' : String(acc), 'correct', acc !== null],
    [String(plan.minutes), 'minutes', false],
  ];
  return (
    <>
      <View style={{ flexDirection: 'row', marginTop: 18 }}>
        {stats.map(([v, l, pct], i) => (
          <View
            key={l}
            accessible
            accessibilityLabel={`${v}${pct ? ' percent' : ''} ${l}`}
            style={[{ flex: 1 }, i > 0 && { borderLeftWidth: 1, borderLeftColor: c.forestTrack, paddingLeft: 14 }]}
          >
            <BigNum value={v} pct={pct} size={30} color={c.onForest} />
            <T v="caption" color={c.onForest2} style={{ marginTop: 2 }}>{l}</T>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.forestTrack }}>
        <GrowthRings
          preset="mini"
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={c.sap}
          track={c.forestTrack}
        />
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={2} style={[grewLine, { color: c.onForest }]}>{line}</Text>
          <T v="meta" color={c.onForest2} style={{ marginTop: 2 }}>
            {grewDomain && grew ? `${grewDomain.short} ring +${grew.points}` : 'Every answer feeds the rings'}
          </T>
        </View>
      </View>
    </>
  );
}

export { clearingTitle };
