/**
 * Today / You / Results building blocks (Grove v2, DESIGN_SYSTEM.md §10–11):
 * - ReadinessRow: mono growth rings + the honest readiness RANGE + stage line.
 * - DomainRings: rings in domain tones with a legend (You, Results).
 * - ClearingCard: the forest panel shown when the day's plan is done.
 * - Plan helpers: icon, title and meta line for each plan item.
 *
 * Readiness is always a range ("62–70%") or "Not enough data yet". The copy
 * never promises a pass: it describes mastery, weighted like the exam.
 */
import { REVIEW_UNIT } from '../engine/srs';
import { gameTitle } from '../engine/games/registry';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { domainColor } from '../content/certifications';
import type { Certification } from '../content/types';
import { biggestGrowth, clearingTitle, dayAccuracy, itemMinutes, type DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import type { Readiness } from '../engine/readiness';
import { rangeLabel, rangeSpoken, type ReadinessRange } from '../engine/readinessRange';
import { haptic } from '../lib/haptics';
import { grewLine, LARGE_TEXT, motion, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GrowthRings, PlanLeaf } from './glyphs';
import { BookOpen, ChevronRight, Gamepad2, ICON_STROKE, RotateCcw, Target, Timer } from './icons';
import { AnimatedPressable, FadeIn, Pop, usePressScale, type Celebration, type Growth } from './motion';
import { BigNum, DomainDot, ICON_SIZE, Row, Stat, StatRow, T, useFontScale } from './ui';
import { aboutMin, timeStat } from '../engine/pace';

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

/**
 * Real, unshortened titles (spec §11: 2 lines allowed) and one short meta line.
 * `due`: the LIVE review queue. The day's plan is frozen in the morning, but
 * the queue it names must match You and Practice all day (reviews done, more
 * falling due), so Today passes the live count.
 *
 * Mobile 1.15 (PHASE5.md §2.3, C1, C7): one minutes style everywhere
 * ("About 10 min" first in a line, "about 6 min" mid-line), and a review
 * that takes part of the queue says how much of it TODAY takes ("8 today,
 * most overdue first"), not the session cap. `when`: the Tomorrow preview
 * says "8 tomorrow".
 */
export function planText(item: PlanItem, due?: number, when: 'today' | 'tomorrow' = 'today'): { title: string; meta: string; short: string } {
  const mins = itemMinutes(item);
  switch (item.kind) {
    case 'review': {
      // Same word as Practice and You ("due").
      const queue = due ?? item.due ?? item.count;
      const more = queue > item.count;
      // Tomorrow's queue isn't known yet (today's reviews change it), so the
      // preview names the habit, not today's count (UX review O5).
      if (when === 'tomorrow' && !item.label) {
        return {
          title: 'Spaced review',
          meta: `${aboutMin(mins)} · questions to revisit`,
          short: more ? `Review · ${item.count} tomorrow` : `Review · ${mins} min`,
        };
      }
      return {
        // The whole queue ("Review 55 due"), the same number You and Practice show;
        // the meta says how much of it today takes.
        title: item.label ?? (queue > 0 ? `Review ${queue} ${REVIEW_UNIT}` : 'Review · all caught up'),
        meta: `${aboutMin(mins)} · ${more ? `${item.count} ${when}, most overdue first` : 'questions to revisit'}`,
        short: more ? `Spaced review · ${item.count} ${when}` : 'Spaced review',
      };
    }
    case 'lesson':
      return { title: item.title, meta: `Lesson · ${mins} min`, short: `Lesson · ${mins} min` };
    case 'practice': {
      const why =
        item.why === 'check'
          ? 'no score yet, just a starting point'
          : item.why === 'learn'
            ? 'on what you just learned'
            : item.why === 'weak'
              ? `${item.count} questions, most points to gain`
              : item.why === 'topup'
                ? `${item.count} questions, a light top-up`
                : 'new material first';
      return { title: item.label, meta: `${aboutMin(mins)} · ${why}`, short: `Practice · ${mins} min` };
    }
    case 'game':
      // Registry name by id: a plan saved before a rename shows today's name.
      return { title: gameTitle(item.gameId, item.label), meta: `Game · ${aboutMin(mins, true)}`, short: `Game · ${mins} min` };
    case 'mock':
      // At exam pace (a 50-question mini mock is 80 minutes), and honest that it is a long one.
      // Exam week's full mock (mobile 1.16) says it is optional in its own words.
      return {
        title: item.label.split(' · ')[0],
        meta: item.why === 'final' ? `${aboutMin(mins)} · a last long rehearsal; skip it if you’d rather rest` : `${aboutMin(mins)} · longer than your usual day, so pick a time that suits you`,
        short: `Mock · ${aboutMin(mins, true)}`,
      };
  }
}

/**
 * "About 20 min today": the open items' minutes. A mock is left out (it is
 * longer than any day) and adds "+ mock" instead. null when nothing is open.
 */
export function todayMinutesLine(items: readonly PlanItem[], done: readonly boolean[]): string | null {
  const open = items.filter((_, i) => !done[i]);
  if (open.length === 0) return null;
  const mock = open.some((i) => i.kind === 'mock');
  const mins = open.reduce((n, i) => n + (i.kind === 'mock' ? 0 : itemMinutes(i)), 0);
  if (mins === 0) return mock ? 'A mock today' : null;
  return `${aboutMin(mins)} today${mock ? ' + mock' : ''}`;
}

/**
 * The plan's leaf marks on the forest panel: filled = done, outline = to do.
 * Mobile 1.9: a leaf done since Today was last on view fills as you come
 * back (a small spring from .6, one light haptic per item), so the plan
 * shows what you just finished. `focused`: Today is on view (the change
 * happens while a session is on top, and must not play off-screen).
 */
/** The leaves last seen on view, per plan day: the panel swaps from "Start here" to the clearing (a new tree) while a session is on top. */
const leavesSeen = new Map<string, boolean[]>();

export function PlanLeaves({ done, focused = true, seenKey }: { done: boolean[]; focused?: boolean; seenKey?: string }) {
  const { c } = useTheme();
  // What the learner last saw (also across the panel's swap), and which leaves to press in now.
  const [shown, setShown] = useState(() => ({ done: (seenKey && leavesSeen.get(seenKey)) || done, pops: [] as number[], run: 0 }));
  const changed = shown.done.length !== done.length || shown.done.some((d, i) => d !== done[i]);
  if (focused && changed) {
    const same = shown.done.length === done.length;
    const pops = same ? done.flatMap((d, i) => (d && !shown.done[i] ? [i] : [])) : [];
    setShown((x) => ({ done, pops, run: x.run + 1 }));
  }
  useEffect(() => {
    if (shown.pops.length) haptic.light();
  }, [shown.run, shown.pops.length]);
  useEffect(() => {
    if (focused && seenKey) leavesSeen.set(seenKey, done);
  }, [focused, seenKey, done]);
  return (
    <View
      accessible
      accessibilityLabel={`${done.filter(Boolean).length} of ${done.length} done`}
      style={{ flexDirection: 'row', gap: 3 }}
    >
      {done.map((d, i) => (
        <Pop key={i} trigger={shown.pops.includes(i) ? shown.run : undefined} spring="leaf">
          <PlanLeaf color={c.sap} filled={d} />
        </Pop>
      ))}
    </View>
  );
}

// ── Readiness number: "62–70%" or "Not enough data yet" ───────────────
/** "62–70" for two bounds (what a rolling range starts from). */
export const boundsLabel = (b: number[]) => (b.length === 2 ? rangeLabel({ enough: true, answered: 0, low: b[0], high: b[1], centre: b[0] }) : null);

export function ReadinessFigure({ range, size = 52, growth }: { range: ReadinessRange; size?: 52 | 34 | 24; growth?: Growth }) {
  const { c } = useTheme();
  if (!range.enough) {
    return <T v={size === 52 ? 'hero' : 'headline'} color={c.ink}>Not enough data yet</T>;
  }
  // Rolls on the first view of the day, or up from what you last saw.
  const roll = growth ? { play: growth.play, from: boundsLabel(growth.from), run: growth.run } : undefined;
  return <BigNum value={rangeLabel(range)} pct size={size} roll={roll} />;
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
  rings = true,
  ringsGrowth,
  rangeGrowth,
  lead,
  onPress,
}: {
  cert: Certification;
  readiness: Readiness;
  range: ReadinessRange;
  /** The journey's coach line, e.g. "Make it stick" (no number: the plant beside it counts its growth). */
  stage: string;
  /**
   * Mobile 1.13: the learner's plant, drawn INSTEAD of the rings (Today). It
   * is its own tap target and screen-reader stop, so the text keeps its own
   * label beside it. The rings stay on You and Results.
   */
  lead?: ReactNode;
  /**
   * false while the Exam-ready panel above already draws the rings: a
   * signature never appears twice on one screen (spec §10).
   */
  rings?: boolean;
  /** Mobile 1.9: the rings and the range grow from what was last seen (motion.tsx useGrowth). */
  ringsGrowth?: Growth;
  rangeGrowth?: Growth;
  /**
   * Mobile 1.16: opens the readiness report. With a plant, the words are the
   * button (the plant still opens Your plant); without one, the whole row is.
   * A chevron says it can be tapped.
   */
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const meta = range.enough
    ? // An ESTIMATE, never a prediction (app-store review: no outcome claims).
      'estimated readiness, weighted like the exam'
    : // A countdown, not a moving target: `needed` never goes up after an answer.
      `${range.needed} more ${range.needed === 1 ? 'answer' : 'answers'} until your readiness range`;
  const spoken = `Estimated readiness ${rangeSpoken(range)}. ${range.enough ? `Weighted like the exam. ${ESTIMATE_NOTE}` : meta} ${stage}.`;
  const words = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: stacked ? undefined : 1, alignSelf: stacked ? 'stretch' : undefined }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ReadinessFigure range={range} growth={rangeGrowth} />
        <T v="meta" style={{ marginTop: 4 }}>{meta}</T>
        {/* One quiet line, only once there is a range to explain. */}
        {range.enough && <T v="meta" style={{ marginTop: 2 }}>{ESTIMATE_NOTE}</T>}
        <T v="stage" style={{ marginTop: 6 }}>{stage}</T>
      </View>
      {onPress && (
        <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
        </View>
      )}
    </View>
  );
  const rowStyle = { flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: stacked ? 10 : 18, marginTop: 22 } as const;
  const ringArt = rings && !lead && (
    <GrowthRings
      preset="today"
      mastery={readiness.domains.map((d) => d.mastery)}
      weights={cert.domains.map((d) => d.weight)}
      colors={c.accent}
      track={c.track}
      grow={ringsGrowth ? { play: ringsGrowth.play, from: ringsGrowth.from.map((v) => v / 100), run: ringsGrowth.run } : undefined}
    />
  );
  // No plant: the whole row (rings and words) is one stop, and one button when it opens the report.
  if (!lead) {
    return onPress ? (
      <ReportTap onPress={onPress} label={spoken} style={{ ...rowStyle, marginTop: rowStyle.marginTop - 6 }} testID="readiness-tap">
        {ringArt}
        {words}
      </ReportTap>
    ) : (
      <View accessible accessibilityLabel={spoken} style={rowStyle}>
        {ringArt}
        {words}
      </View>
    );
  }
  // With a plant, the row is two stops: the plant (Your plant), then the words (the report).
  return (
    <View style={rowStyle}>
      {lead}
      {onPress ? (
        <ReportTap onPress={onPress} label={spoken} style={{ flex: stacked ? undefined : 1, alignSelf: stacked ? 'stretch' : undefined }} testID="readiness-tap">
          {words}
        </ReportTap>
      ) : (
        <View accessible accessibilityLabel={spoken} style={{ flex: stacked ? undefined : 1, alignSelf: stacked ? 'stretch' : undefined }}>
          {words}
        </View>
      )}
    </View>
  );
}

/** Today's readiness as a button to the report: a soft tint when pressed, an ink ring when it has keyboard focus. */
function ReportTap({ onPress, label, style, children, testID }: { onPress: () => void; label: string; style?: ViewStyle; children: ReactNode; testID?: string }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: radius.md });
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens your readiness report"
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      // 6pt of room round the words for the tint and the ring, taken back by the margin: nothing moves.
      style={[{ padding: 6, marginHorizontal: -6, marginTop: -6, marginBottom: -6, borderRadius: radius.md }, style, press.style]}
    >
      {press.layer}
      {children}
      {focus && <View testID="readiness-focus-ring" pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.md, borderWidth: 2, borderColor: c.ink }} />}
    </AnimatedPressable>
  );
}

// ── Rings in domain tones + legend (You, Results) ─────────────────────
/**
 * `values` are 0..1 per domain (blueprint order), or null for "not started".
 * The legend lists domains 1 → 5, top-down, like every other list in the app
 * (mobile 1.15, PHASE5.md C10). Domain 1 is the inner ring; RINGS_NOTE says so.
 * `only` (Results): draw just these domains (indexes, blueprint order), so a
 * one-domain session isn't four empty rings and four dashes (ui.md R1). One
 * domain alone is drawn as a single thick ring in its tone.
 */
export const SINGLE_RING_WEIGHT = 80;
/** Said once under the rings wherever the legend shows (You). */
export const RINGS_NOTE = 'Domain 1 is the inner ring. Thicker rings weigh more on the exam.';
/** Narrower than this (most 360 dp Android phones), the legend sits under the rings. */
export const RINGS_SIDE_BY_SIDE_MIN = 380;
export function DomainRings({
  cert,
  values,
  center,
  legendValue,
  accessibilityLabel,
  only,
  grow,
  delta,
}: {
  cert: Certification;
  values: (number | null)[];
  center: ReactNode;
  /** Legend text per domain; defaults to a whole percent. */
  legendValue?: (i: number) => string;
  accessibilityLabel: string;
  only?: number[];
  /** Mobile 1.9: grow now, each domain's arc from `from` (0..1, blueprint order), after `delay`. */
  grow?: { play: boolean; from?: number[]; run?: number; delay?: number };
  /**
   * What went up since the learner last looked, in points per domain: a quiet
   * "+4" beside the legend value, fading in once its arc has settled. Never a
   * minus (a fall is just shown, never marked).
   */
  delta?: (i: number) => number;
}) {
  const { c, isDark } = useTheme();
  // The legend goes under the rings at large text AND on narrow phones: beside
  // the rings at 360 dp, "IT Governance" wrapped and "26/38" was cut off.
  const narrow = useWindowDimensions().width < RINGS_SIDE_BY_SIDE_MIN;
  const stacked = useFontScale() >= LARGE_TEXT || narrow;
  const shown = only && only.length > 0 ? only : [...cert.domains.keys()];
  const tones = shown.map((i) => domainColor(cert.domains[i].tone, isDark));
  const weights = shown.length === 1 ? [SINGLE_RING_WEIGHT] : shown.map((i) => cert.domains[i].weight);
  const label = (i: number) => legendValue?.(i) ?? (values[i] === null ? '–' : String(Math.round((values[i] ?? 0) * 100)));
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: space.lg }}>
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <GrowthRings
          preset="you"
          mastery={shown.map((i) => values[i] ?? 0)}
          weights={weights}
          colors={tones}
          track={c.track}
          grow={grow ? { ...grow, from: grow.from ? shown.map((i) => grow.from![i] ?? 0) : undefined } : undefined}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {center}
        </View>
      </View>
      <View style={{ flex: stacked ? undefined : 1, gap: 9, alignSelf: stacked ? 'stretch' : undefined }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {shown.map((i) => {
          const up = Math.max(0, Math.round(delta?.(i) ?? 0));
          return (
            <Row key={cert.domains[i].id} gap={9}>
              <DomainDot domain={cert.domains[i]} />
              <T v="meta" color={c.ink} style={{ flex: 1, minWidth: 0 }}>{cert.domains[i].short}</T>
              {up > 0 && (
                // After this domain's arc has grown (outer ring first, 60 ms apart).
                <FadeIn rise={false} dur="select" delay={(grow?.delay ?? 0) + motion.dur.grow + (shown.length - 1 - shown.indexOf(i)) * motion.stagger.stat + motion.dur.select}>
                  <T v="caption" color={c.accentText}>{`+${up}`}</T>
                </FadeIn>
              )}
              {/* The number never shrinks: the name gives way first (it can wrap, the score can't clip). */}
              <View style={{ flexShrink: 0 }}>
                <BigNum value={label(i)} size={17} />
              </View>
            </Row>
          );
        })}
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
/**
 * The clearing's numbers. Mobile 1.9, in a full celebration (≤ 1.2 s, any
 * tap skips to the end): the three stats roll up, 60 ms apart; the mini
 * ring grows from where readiness stood this morning to now; then "grew
 * to" and the ring line fade in last. Short: the panel cross-fades in.
 * Reduced: all of it at once. The words are the same in every mode.
 */
export function ClearingBody({
  plan,
  readiness,
  range,
  cert,
  celebration,
}: {
  plan: DayPlan;
  readiness: Readiness;
  range: ReadinessRange;
  cert: Certification;
  celebration?: Celebration;
}) {
  const { c } = useTheme();
  const acc = dayAccuracy(plan);
  const grew = biggestGrowth(plan, readiness);
  const grewDomain = grew ? cert.domains.find((d) => d.id === grew.domainId) : undefined;
  const full = celebration?.mode === 'full';
  const run = celebration?.run ?? 0;
  const line = clearingLine(plan, readiness, range);
  // Each stat reads on its own: "Questions 31", "Accuracy 81%", "Time 24 min".
  // "Accuracy" for a percentage everywhere (You, Today); "Correct" is a count (Results).
  const time = timeStat(plan.minutes * 60_000);
  // The beats, inside the 1.2 s budget: stats 120–840 ms, ring 240–840, words from 840.
  const statsAt = motion.dur.select;
  const ringAt = 2 * motion.dur.select;
  const wordsAt = ringAt + motion.dur.grow;
  const statRoll = (i: number) => ({ play: full, from: null, run, delay: statsAt + i * motion.stagger.stat });
  return (
    <>
      <StatRow frame={false} line={c.forestTrack} style={{ marginTop: 18 }}>
        {[
          <Stat key="q" label="Questions" value={String(plan.answered)} color={c.onForest} labelColor={c.onForest2} roll={statRoll(0)} />,
          acc === null ? (
            <Stat key="a" label="Accuracy" word="Not yet" color={c.onForest} labelColor={c.onForest2} />
          ) : (
            <Stat key="a" label="Accuracy" value={String(acc)} pct color={c.onForest} labelColor={c.onForest2} roll={statRoll(1)} />
          ),
          time.word ? (
            <Stat key="t" label="Time" word={time.word} spoken={time.spoken} color={c.onForest} labelColor={c.onForest2} />
          ) : (
            <Stat key="t" label="Time" value={time.value} unit={time.unit} spoken={time.spoken} color={c.onForest} labelColor={c.onForest2} unitColor={c.onForest2} roll={statRoll(2)} />
          ),
        ]}
      </StatRow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.forestTrack }}>
        <GrowthRings
          preset="mini"
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={c.sap}
          track={c.forestTrack}
          // From this morning's readiness to now: the day's growth, drawn.
          grow={{ play: full, from: readiness.domains.map((d) => plan.start.domains[d.domainId] ?? 0), run, delay: ringAt }}
        />
        {/* Keyed by the celebration, so its words wait for their beat (a tap shows them at once). */}
        <FadeIn key={run} delay={full ? wordsAt : 0} rise={false} style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={2} style={[grewLine, { color: c.onForest }]}>{line}</Text>
          <T v="meta" color={c.onForest2} style={{ marginTop: 2 }}>
            {grewDomain && grew ? `${grewDomain.short} ring +${grew.points}` : 'Every answer feeds the rings'}
          </T>
        </FadeIn>
      </View>
    </>
  );
}

/**
 * "Readiness grew to 67–77%": never a negative framing ("holding at" otherwise).
 * A word joiner after the dash keeps the range on one line ("67–" never ends a line).
 */
export function clearingLine(plan: DayPlan, readiness: Readiness, range: ReadinessRange): string {
  return range.enough
    ? `Readiness ${readiness.score > plan.start.score ? 'grew to' : 'holding at'} ${rangeLabel(range).replace('–', '–\u2060')}%`
    : 'Readiness takes shape as you answer';
}

export { clearingTitle };
