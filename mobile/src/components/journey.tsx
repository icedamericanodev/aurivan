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
import { biggestGrowth, clearingTitle, dayAccuracy, isOptional, itemMinutes, type DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import type { Readiness } from '../engine/readiness';
import { RANGE_MIN_ANSWERS, rangeLabel, rangeSpoken, type ReadinessRange } from '../engine/readinessRange';
import { haptic } from '../lib/haptics';
import { grewLine, LARGE_TEXT, motion, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GrowthRings, PlanLeaf } from './glyphs';
import { Check, ICON_STROKE, Pinwheel, Play, RotateCcw, Target, Timer } from './icons';
import { AnimatedPressable, FadeIn, Pop, usePressScale, type Celebration, type Growth } from './motion';
import { BigNum, DomainDot, ICON_SIZE, Row, Stat, StatRow, T, useFontScale } from './ui';
import { aboutMin, spokenMin, timeStat } from '../engine/pace';

// ── Plan items: icon, title, meta ─────────────────────────────────────
export function planIcon(item: PlanItem, color: string): ReactNode {
  const p = { size: ICON_SIZE.row, color, strokeWidth: ICON_STROKE };
  switch (item.kind) {
    case 'review':
      return <RotateCcw {...p} />;
    case 'lesson':
      // Mobile 1.20 icon rule: Play = a lesson (BookOpen is for study notes).
      return <Play {...p} />;
    case 'practice':
      return <Target {...p} />;
    case 'game':
      // Mobile 1.22: the Play tab's own glyph.
      return <Pinwheel {...p} />;
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
        item.why === 'first'
          ? `${item.count} questions, no timer`
          : item.why === 'check'
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

/** "IS Audit practice" style titles with the count taken out (the count goes to the meta line). */
export function heroPracticeTitle(label: string): string {
  return label
    // A plan saved before mobile 1.24 called these "Starting check": the learner never reads that word now.
    .replace(/^Starting check: \d+ mixed questions?$/, 'Mixed practice')
    .replace(/^\d+ (?:mixed )?questions? · (.+)$/, 'Practice: $1')
    .replace(/^(.+?): \d+ mixed questions?$/, '$1')
    .replace(/^(.+?) · \d+ questions?$/, '$1')
    .replace(/^\d+ (?:mixed )?questions?$/, 'Mixed practice');
}

/**
 * The forest panel's words for the current plan item (mobile 1.21, spec §11
 * "Today"): the TITLE names the activity and never holds a count ("Spaced
 * review", not "Review 55 due"); the counts and the minutes go to the META
 * line. `minutesSaid`: the panel's caption already gives the day's minutes
 * and they are this item's alone, so the meta leaves them out (said once).
 * The rows under the panel keep planText's titles.
 */
export function planHero(item: PlanItem, due?: number, opts: { minutesSaid?: boolean } = {}): { title: string; meta: string } {
  const mins = itemMinutes(item);
  const join = (detail: string) => {
    if (!opts.minutesSaid) return `${aboutMin(mins)} · ${detail}`;
    return detail.charAt(0).toUpperCase() + detail.slice(1);
  };
  const qs = (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`;
  switch (item.kind) {
    case 'review': {
      const queue = due ?? item.due ?? item.count;
      const more = queue > item.count;
      // A labelled review is exam week's ("Light review · 8 questions"). An old save's "Review 20 due" label is a count, so it reads as the plain review.
      if (item.label && !/^Review \d/.test(item.label)) return { title: item.label.split(' · ')[0], meta: join(`${qs(item.count)}, most overdue first`) };
      return {
        title: 'Spaced review',
        // "16 of 55 due": today's share of the live queue (the same "55 due" as You and Practice).
        meta: join(queue === 0 ? 'all caught up' : more ? `${item.count} of ${queue} ${REVIEW_UNIT} · most overdue first` : `${qs(queue)} to revisit`),
      };
    }
    case 'lesson':
      return { title: item.title, meta: opts.minutesSaid ? 'Lesson' : `Lesson · ${mins} min` };
    case 'practice': {
      const why =
        item.why === 'first'
          ? ', no timer'
          : item.why === 'check'
            ? ', no score yet, just a starting point'
            : item.why === 'learn'
              ? ', on what you just learned'
              : item.why === 'weak'
                ? ', most points to gain'
                : item.why === 'topup'
                  ? ', a light top-up'
                  : /review|warm-up/i.test(item.label)
                    ? ''
                    : ', new material first';
      return { title: heroPracticeTitle(item.label), meta: join(`${qs(item.count)}${why}`) };
    }
    case 'game':
      return { title: gameTitle(item.gameId, item.label), meta: opts.minutesSaid ? 'Game' : `Game · ${aboutMin(mins, true)}` };
    case 'mock':
      // A mock's minutes are never in the day's total (the caption leaves mocks out), so they always show here.
      return {
        title: item.label.split(' · ')[0],
        meta: `${qs(item.questions)} · ${aboutMin(mins, true)} · ${item.why === 'final' ? 'a last long rehearsal; skip it if you’d rather rest' : 'longer than your usual day'}`,
      };
  }
}

/** The open items' minutes, mocks left out (they are longer than any day; their rows say so). 0 when only mocks are open. */
export function todayMinutes(items: readonly PlanItem[], done: readonly boolean[]): number {
  return items.reduce((n, it, i) => n + (done[i] || it.kind === 'mock' ? 0 : itemMinutes(it)), 0);
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

/** What the learner last saw of the plan (also across the panel's swap), and which marks to press in now. */
function useShownDone(done: boolean[], focused: boolean, seenKey?: string) {
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
  return shown;
}

export function PlanLeaves({ done, focused = true, seenKey }: { done: boolean[]; focused?: boolean; seenKey?: string }) {
  const { c } = useTheme();
  const shown = useShownDone(done, focused, seenKey);
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

/**
 * One plan item as a checklist line (mobile 1.23, Today): what it is, with its
 * real size. "Warm-up · 5 questions", "Spaced review · 20 due", "Lesson ·
 * Business impact analysis". The title never changes the plan's own words;
 * it only puts the count or the length after them.
 */
export function planCheckLabel(item: PlanItem, due?: number): string {
  const qs = (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`;
  switch (item.kind) {
    case 'review': {
      const queue = due ?? item.due ?? item.count;
      // A labelled review is exam week's ("Light review · 8 questions"); an old save's "Review 20 due" is a count.
      if (item.label && !/^Review \d/.test(item.label)) return item.label;
      // A review that takes part of the queue says how much of it TODAY takes ("8 of 56 due", the same
      // queue You and Practice count), not the session's size.
      if (queue === 0) return 'Spaced review · all caught up';
      return queue > item.count ? `Spaced review · ${item.count} of ${queue} ${REVIEW_UNIT}` : `Spaced review · ${queue} ${REVIEW_UNIT}`;
    }
    case 'lesson':
      return `Lesson · ${item.title}`;
    case 'practice':
      return `${heroPracticeTitle(item.label)} · ${qs(item.count)}`;
    case 'game':
      return `${gameTitle(item.gameId, item.label)} · ${itemMinutes(item)} min`;
    case 'mock':
      return `${item.label.split(' · ')[0]} · ${aboutMin(itemMinutes(item), true)}`;
  }
}

const MARK = 24;

/**
 * Today's plan as a checklist on the forest panel (mockup A): done = a filled
 * sap check and struck-through text, later items = a faint ring and the
 * panel's quiet text. State is never colour alone: the check, the strike and
 * the weight say it, and each line is one screen-reader stop ("Warm-up, 5
 * questions, done"). A line done since Today was last on view presses in (a
 * small spring, one light haptic), like the plan leaves did.
 *
 * Mobile 1.24 (Today declutter): the list holds what is NOT the hero. The
 * item you are on now is the panel's title (it used to be said twice, as the
 * title and again as the first row), and the optional weekly mock is not a
 * row at all (it sits under "Also today"). With a one-item plan, as on Day 1,
 * there is no list: just the title and the button.
 */
export function PlanChecklist({
  items,
  done,
  current,
  due,
  focused = true,
  seenKey,
}: {
  items: readonly PlanItem[];
  done: boolean[];
  current: number;
  due?: number;
  focused?: boolean;
  seenKey?: string;
}) {
  const { c } = useTheme();
  const shown = useShownDone(done, focused, seenKey);
  const rows = items.map((item, i) => ({ item, i })).filter(({ i }) => i !== current && !isOptional(items, i));
  if (rows.length === 0) return null;
  return (
    <View testID="plan-checklist" style={{ marginTop: space.lg, gap: 10 }}>
      {rows.map(({ item, i }) => {
        const isDone = done[i];
        const label = planCheckLabel(item, due);
        const said = `${label}, ${isDone ? 'done' : 'later'}`;
        return (
          <View key={i} accessible accessibilityLabel={spokenMin(said)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pop trigger={shown.pops.includes(i) ? shown.run : undefined} spring="leaf">
              {isDone ? (
                <View style={{ width: MARK, height: MARK, borderRadius: MARK / 2, backgroundColor: c.sap, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={15} color={c.forest} strokeWidth={3} />
                </View>
              ) : (
                <View style={{ width: MARK, height: MARK, borderRadius: MARK / 2, borderWidth: 1.5, borderColor: c.onForest2, opacity: 0.7 }} />
              )}
            </Pop>
            <T v="body" color={c.onForest2} style={[{ flex: 1, minWidth: 0 }, isDone && { textDecorationLine: 'line-through' }]}>
              {label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

// ── Readiness number: "62–70%" or "Not enough data yet" ───────────────
/** "62–70" for two bounds (what a rolling range starts from). */
export const boundsLabel = (b: number[]) => (b.length === 2 ? rangeLabel({ enough: true, answered: 0, low: b[0], high: b[1], centre: b[0] }) : null);

export function ReadinessFigure({ range, size = 52, growth }: { range: ReadinessRange; size?: 52 | 38 | 34 | 30 | 24; growth?: Growth }) {
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
/**
 * Its short form, the readiness row's secondary line on Today (decided 15 Oct
 * 2026): the full sentence is spoken there and shown on the readiness report.
 */
export const ESTIMATE_SHORT = 'A study estimate, not a prediction.';
/**
 * Today's readiness label, said under the range. Mobile 1.24: just "Estimated readiness". The longer
 * disclaimer ("a range, not a promise") lives on the readiness report and on the first reveal
 * ("Your first readiness range"), not on every day's Today.
 */
export const ESTIMATE_LINE = 'Estimated readiness';

// ── Readiness row on Today (spec §11 "Today") ─────────────────────────
// Mobile 1.23 (mockup A): the growth rings (86) with the honest range as a
// serif numeral beside them and "Estimated readiness" under it. Mobile 1.24:
// the stage line shows only when it is passed in (Today passes it for a few
// days after the stage changes, not every day), the disclaimer is on the
// report and the first reveal only, and before the range exists the line is
// the goal: "5 of 40 for your first range".
// The whole row opens the readiness report. Stacks at large text.
export function ReadinessRow({
  cert,
  readiness,
  range,
  stage,
  rings = true,
  ringsGrowth,
  rangeGrowth,
  onPress,
}: {
  cert: Certification;
  readiness: Readiness;
  range: ReadinessRange;
  /** The stage as the learner reads it: "Stage 4 · Rehearse the exam". Left out = no stage line. */
  stage?: string;
  /**
   * false while the Exam-ready panel above already draws the rings: a
   * signature never appears twice on one screen (spec §10).
   */
  rings?: boolean;
  /** Mobile 1.9: the rings and the range grow from what was last seen (motion.tsx useGrowth). */
  ringsGrowth?: Growth;
  rangeGrowth?: Growth;
  /** Mobile 1.16: opens the readiness report (the whole row is the button). */
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const meta = range.enough
    ? // An ESTIMATE, never a prediction (app-store review: no outcome claims).
      ESTIMATE_LINE
    : // A countdown toward a goal, not a moving target: `needed` never goes up after an answer.
      `${RANGE_MIN_ANSWERS - range.needed} of ${RANGE_MIN_ANSWERS} for your first range`;
  const spoken = `${range.enough ? `Estimated readiness ${rangeSpoken(range)}.` : `Not enough data yet. ${meta}.`}${stage ? ` ${stage.replace(' · ', ', ')}.` : ''}`;
  const words = (
    <View style={{ flex: stacked ? undefined : 1, minWidth: 0, alignSelf: stacked ? 'stretch' : undefined }}>
      <ReadinessFigure range={range} size={range.enough ? 38 : 30} growth={rangeGrowth} />
      <T v="meta" style={{ marginTop: space.xs }}>{meta}</T>
      {stage ? <T v="stage" color={c.accentText} style={{ marginTop: space.xs }}>{stage}</T> : null}
    </View>
  );
  const ringArt = rings && (
    <GrowthRings
      preset="row"
      mastery={readiness.domains.map((d) => d.mastery)}
      weights={cert.domains.map((d) => d.weight)}
      colors={c.accent}
      track={c.track}
      grow={ringsGrowth ? { play: ringsGrowth.play, from: ringsGrowth.from.map((v) => v / 100), run: ringsGrowth.run } : undefined}
    />
  );
  const rowStyle = { flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: stacked ? space.md : space.lg, marginTop: space.xl } as const;
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
  legend = true,
}: {
  cert: Certification;
  values: (number | null)[];
  center: ReactNode;
  /**
   * Mobile 1.22: false = the rings alone, centred (a one-domain Results says
   * its single line under the ring instead of a one-row legend stranded at
   * the right edge).
   */
  legend?: boolean;
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
    // Mobile 1.21 (design spec §7): rings and legend read as ONE aligned row: 20 between them,
    // 28pt legend rows, the name in `small`, the numerals in one right-aligned column.
    <View style={{ flexDirection: stacked || !legend ? 'column' : 'row', alignItems: !legend ? 'center' : stacked ? 'flex-start' : 'center', gap: space.gutter }}>
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
      {legend && (
      <View style={{ flex: stacked ? undefined : 1, gap: space.xs, alignSelf: stacked ? 'stretch' : undefined }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {shown.map((i) => {
          const up = Math.max(0, Math.round(delta?.(i) ?? 0));
          return (
            <Row key={cert.domains[i].id} gap={space.sm} style={{ minHeight: 28 }}>
              <DomainDot domain={cert.domains[i]} />
              <T v="small" color={c.ink} style={{ flex: 1, minWidth: 0 }}>{cert.domains[i].short}</T>
              {up > 0 && (
                // After this domain's arc has grown (outer ring first, 60 ms apart).
                <FadeIn rise={false} dur="select" delay={(grow?.delay ?? 0) + motion.dur.grow + (shown.length - 1 - shown.indexOf(i)) * motion.stagger.stat + motion.dur.select}>
                  <T v="caption" color={c.accentText}>{`+${up}`}</T>
                </FadeIn>
              )}
              {/* The number never shrinks: the name gives way first (it can wrap, the score can't clip). */}
              <View style={{ flexShrink: 0, minWidth: 28, alignItems: 'flex-end' }}>
                <BigNum value={label(i)} size={17} />
              </View>
            </Row>
          );
        })}
      </View>
      )}
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
