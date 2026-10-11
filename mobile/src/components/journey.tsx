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
import { REVIEW_CAP_LINE, REVIEW_SESSION_CAP, REVIEW_UNIT } from '../engine/srs';
import { gameTitle } from '../engine/games/registry';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { domainColor } from '../content/certifications';
import type { Certification } from '../content/types';
import { biggestGrowth, clearingTitle, dayAccuracy, itemMinutes, type DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import type { Readiness } from '../engine/readiness';
import { rangeLabel, rangeSpoken, type ReadinessRange } from '../engine/readinessRange';
import { haptic } from '../lib/haptics';
import { grewLine, LARGE_TEXT, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GrowthRings, PlanLeaf } from './glyphs';
import { BookOpen, Gamepad2, ICON_STROKE, RotateCcw, Target, Timer } from './icons';
import { FadeIn, Pop, type Celebration, type Growth } from './motion';
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

/**
 * Real, unshortened titles (spec §11: 2 lines allowed) and one short meta line.
 * `due`: the LIVE review queue. The day's plan is frozen in the morning, but
 * the queue it names must match You and Practice all day (reviews done, more
 * falling due), so Today passes the live count.
 */
export function planText(item: PlanItem, due?: number): { title: string; meta: string; short: string } {
  const mins = itemMinutes(item);
  switch (item.kind) {
    case 'review': {
      // Same word as Practice and You ("due"); at the cap, say the rest wait.
      const queue = due ?? item.due ?? item.count;
      // The cap line only when MORE than 20 are due (exactly 20 fits one session).
      const capped = due === undefined ? Boolean(item.capped) : due > REVIEW_SESSION_CAP;
      return {
        // The whole queue ("Review 55 due"), the same number You and Practice show;
        // the meta says how much of it this session takes.
        title: item.label ?? (queue > 0 ? `Review ${queue} ${REVIEW_UNIT}` : 'Review · all caught up'),
        meta: `About ${mins} minutes · ${capped ? REVIEW_CAP_LINE : 'questions to revisit'}`,
        short: capped ? `Spaced review · ${REVIEW_SESSION_CAP} at a time` : 'Spaced review',
      };
    }
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

/**
 * The plan's leaf marks on the forest panel: filled = done, outline = to do.
 * Mobile 1.9: a leaf done since Today was last on view fills as you come
 * back (a small spring from .6, one light haptic per item), so the plan
 * shows what you just finished. `focused`: Today is on view (the change
 * happens while a session is on top, and must not play off-screen).
 */
export function PlanLeaves({ done, focused = true }: { done: boolean[]; focused?: boolean }) {
  const { c } = useTheme();
  // What the learner last saw, and which leaves to press in now.
  const [shown, setShown] = useState({ done, pops: [] as number[], run: 0 });
  const changed = shown.done.length !== done.length || shown.done.some((d, i) => d !== done[i]);
  if (focused && changed) {
    const same = shown.done.length === done.length;
    const pops = same ? done.flatMap((d, i) => (d && !shown.done[i] ? [i] : [])) : [];
    setShown((x) => ({ done, pops, run: x.run + 1 }));
  }
  useEffect(() => {
    if (shown.pops.length) haptic.light();
  }, [shown.run, shown.pops.length]);
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
}: {
  cert: Certification;
  readiness: Readiness;
  range: ReadinessRange;
  /** e.g. "Stage 3 · Make it stick" */
  stage: string;
  /**
   * false while the Exam-ready panel above already draws the rings: a
   * signature never appears twice on one screen (spec §10).
   */
  rings?: boolean;
  /** Mobile 1.9: the rings and the range grow from what was last seen (motion.tsx useGrowth). */
  ringsGrowth?: Growth;
  rangeGrowth?: Growth;
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
      {rings && (
        <GrowthRings
          preset="today"
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={c.accent}
          track={c.track}
          grow={ringsGrowth ? { play: ringsGrowth.play, from: ringsGrowth.from.map((v) => v / 100), run: ringsGrowth.run } : undefined}
        />
      )}
      <View style={{ flex: stacked || !rings ? undefined : 1 }}>
        <ReadinessFigure range={range} growth={rangeGrowth} />
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
 * `only` (Results): draw just these domains (indexes, blueprint order), so a
 * one-domain session isn't four empty rings and four dashes (ui.md R1). One
 * domain alone is drawn as a single thick ring in its tone.
 */
export const SINGLE_RING_WEIGHT = 80;
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
  const stacked = useFontScale() >= LARGE_TEXT;
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
        {[...shown].reverse().map((i) => {
          const up = Math.max(0, Math.round(delta?.(i) ?? 0));
          return (
            <Row key={cert.domains[i].id} gap={9}>
              <DomainDot domain={cert.domains[i]} />
              <T v="meta" color={c.ink} style={{ flex: 1 }}>{cert.domains[i].short}</T>
              {up > 0 && (
                // After this domain's arc has grown (outer ring first, 60 ms apart).
                <FadeIn rise={false} dur="select" delay={(grow?.delay ?? 0) + motion.dur.grow + (shown.length - 1 - shown.indexOf(i)) * motion.stagger.stat + motion.dur.select}>
                  <T v="caption" color={c.accentText}>{`+${up}`}</T>
                </FadeIn>
              )}
              <BigNum value={label(i)} size={17} />
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
  const stats: [string, string, boolean][] = [
    [String(plan.answered), 'questions', false],
    [acc === null ? '–' : String(acc), 'correct', acc !== null],
    [String(plan.minutes), 'minutes', false],
  ];
  // The beats, inside the 1.2 s budget: stats 120–840 ms, ring 240–840, words from 840.
  const statsAt = motion.dur.select;
  const ringAt = 2 * motion.dur.select;
  const wordsAt = ringAt + motion.dur.grow;
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
            <BigNum value={v} pct={pct} size={30} color={c.onForest} roll={{ play: full && v !== '–', from: null, run, delay: statsAt + i * motion.stagger.stat }} />
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

/** "Readiness grew to 67–77%": never a negative framing ("holding at" otherwise). */
export function clearingLine(plan: DayPlan, readiness: Readiness, range: ReadinessRange): string {
  return range.enough
    ? `Readiness ${readiness.score > plan.start.score ? 'grew to' : 'holding at'} ${rangeLabel(range)}%`
    : 'Readiness takes shape as you answer';
}

export { clearingTitle };
