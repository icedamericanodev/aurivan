/**
 * Build F: milestone and game-level pieces shared by Results, the game round
 * end, Play, You and Field notes.
 *
 * Calm on purpose (behaviour review §4): no card, no confetti, no sound.
 * A badge's moment is a key-idea-style block (3px accent rule) with ONE
 * success haptic (Settings can switch haptics off), announced once.
 *
 * Mobile 1.10 (badges_game.md §6), the unlock moment: the badge's medallion
 * presses in (.4 → 1 on the leaf spring), its rim catches the light once and
 * its emblem fills from its outline, while a few leaves drift down its own
 * column (never over the words). The words (the unlock line: "what you can
 * now do") are there from the first frame. ≤ 1.2 s; any tap or scroll ends it. Only one celebration
 * plays in full per session, a kind plays in full its first three times,
 * and a badge's higher tier always plays short. At most THREE full badge
 * moments in any 7 days (counted as they play, never when only drawn):
 * past that, the badge is saved and a quiet line says so
 * ("New in your badges: Rooted · 30 days"). Reduce Motion: the end state,
 * the same words.
 */
import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { GAME_TIER_NAME, type GameTier } from '../engine/games/growth';
import { markBadge } from '../engine/milestones';
import { sayLater } from '../lib/a11y';
import { haptic } from '../lib/haptics';
import type { MilestoneMoment } from '../lib/milestones';
import { BADGE_MOMENTS_MAX, useSeen } from '../store/seen';
import { badgeMetal, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { TierLeaf } from './glyphs';
import { Medallion } from './medallion';
import { Celebrate, LeafFall, Pop, useCelebration, useMotion } from './motion';
import { Button, Row, T } from './ui';

/** Moments already announced (per session or round), so a re-render never repeats them. */
const announced = new Set<string>();
/** Moments whose success tap has played (it comes with the motion, once). */
const buzzed = new Set<string>();
/** Each moment's quiet-or-not decision (the 3-in-7-days cap), made once per occasion. */
const quietFor = new Map<string, boolean>();

/** The medallion's column: the medallion on top, the drifting leaves below it. */
const MEDAL = 64;
/** At most this many badge moments in any 7 days (badges_game.md §6). */
export const BADGE_WEEK_MS = 7 * 86_400_000;

/** Tests: forget the per-session moment decisions. */
export function resetBadgeMomentsForTest() {
  announced.clear();
  buzzed.clear();
  quietFor.clear();
  counted.clear();
}

/**
 * Decide once per occasion whether this badge gets its moment or only the
 * quiet line: three FULL moments already in the last 7 days means quiet.
 * Read only: nothing is written while rendering. The moment is counted when
 * it actually plays in full (see the effect below), so one never scrolled
 * to, a Reduce Motion one or a short one never uses up the week.
 */
function decideQuiet(k: string, now = Date.now()): boolean {
  const known = quietFor.get(k);
  if (known !== undefined) return known;
  const recent = useSeen.getState().badgeMoments.filter((t) => now - t < BADGE_WEEK_MS && t <= now);
  const quiet = recent.length >= BADGE_MOMENTS_MAX;
  quietFor.set(k, quiet);
  return quiet;
}
/** Occasions whose full moment has been counted against the week (once each). */
const counted = new Set<string>();

/** "Rooted · 30 days, Lichen": the tier's metal is said and printed, never shown by colour alone. */
const momentName = (m: MilestoneMoment) => (m.tier ? `${m.label} · ${badgeMetal[m.tier as 1 | 2 | 3].name}` : m.label);

/** What a screen reader hears, once: "A new badge, Evergreen: Long Memory. You recalled…". */
export function momentSpoken(m: MilestoneMoment): string {
  return `A new badge, ${m.setName}: ${momentName(m)}. ${m.unlock}${m.completes ? ` That completes ${m.setName}.` : ''}`;
}

/**
 * The moment for ONE badge. `once` identifies the session or round, so the
 * haptic and announcement happen once even if the screen re-renders or is
 * revisited. `onSee` opens the badge case ("See it in your badges").
 */
export function MilestoneMomentView({
  moment,
  once,
  inView = true,
  skipRef,
  onSee,
}: {
  moment: MilestoneMoment;
  once: string;
  /**
   * The moment's motion waits until it is on screen (Results: below the
   * review actions), and its success tap comes with it. The announcement doesn't wait.
   */
  inView?: boolean;
  /** Filled with this moment's skip, for its screen (Results: a new scroll drag ends it). */
  skipRef?: MutableRefObject<(() => void) | null>;
  onSee?: () => void;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const k = `${once}:${moment.key}`;
  const [quiet] = useState(() => decideQuiet(k));
  const spoken = quiet ? `New in your badges: ${momentName(moment)}.` : momentSpoken(moment);
  // A moment seen before (a revisit) is simply shown.
  const [fresh] = useState(() => !announced.has(k));
  // Already on screen before it plays (Results: it waits below the review
  // actions until scrolled to): the medallion then presses from .9, a small
  // settle, instead of snapping down to .4 from its painted size.
  const [painted] = useState(() => !inView);
  const celebration = useCelebration('milestone', fresh && inView && !quiet, undefined, k, false, Boolean(moment.tierUp));
  const full = celebration.mode === 'full';
  const [height, setHeight] = useState(0);
  // Announced as the screen opens (a screen-reader user hears it without
  // scrolling to it), after a short pause so the screen change doesn't cut it off.
  useEffect(() => {
    if (announced.has(k)) return;
    announced.add(k);
    sayLater(spoken);
  }, [k, spoken]);
  // The one success tap, as the moment plays (in any mode), not seconds before it.
  useEffect(() => {
    if (quiet || celebration.run === 0 || buzzed.has(k)) return;
    buzzed.add(k);
    haptic.success();
  }, [celebration.run, k, quiet]);
  // The week's cap counts a moment when it plays in FULL, once (badges_game.md §6).
  useEffect(() => {
    if (quiet || celebration.run === 0 || !full || counted.has(k)) return;
    counted.add(k);
    useSeen.getState().noteBadgeMoment(Date.now());
  }, [celebration.run, full, k, quiet]);
  const strike = useMemo(() => ({ run: full ? celebration.run : 0, settled: celebration.settled, delay: 120 }), [full, celebration.run, celebration.settled]);
  const { skip } = celebration;
  useEffect(() => {
    if (!skipRef) return;
    skipRef.current = skip;
    return () => {
      skipRef.current = null;
    };
  }, [skipRef, skip]);
  const link = onSee ? (
    <Button kind="ghost" label="See it in your badges ›" onPress={onSee} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
  ) : null;

  if (quiet) {
    // Past three moments this week: saved, and said in one quiet line.
    return (
      <View>
        <T v="meta" color={c.ink2} accessibilityLabel={spoken}>
          {`New in your badges: ${momentName(moment)}`}
        </T>
        {link}
      </View>
    );
  }
  const badge = markBadge(moment.key);
  return (
    <Animated.View entering={FadeIn.duration(reduced ? motion.dur.reduced : 240).reduceMotion(ReduceMotion.Never)}>
      <Celebrate celebration={celebration}>
        <View
          accessible
          accessibilityLabel={spoken}
          style={{ flexDirection: 'row', gap: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
            style={{ width: MEDAL, alignItems: 'center', alignSelf: 'stretch' }}
          >
            <LeafFall run={full} colors={[c.accent, c.sap]} width={MEDAL} height={height} count={6} />
            <Pop trigger={full ? celebration.run : undefined} from={painted ? 0.9 : 0.4} delay={120}>
              <Medallion
                badge={badge}
                set={moment.set}
                tier={moment.tier ?? 0}
                state="earned"
                size={MEDAL}
                {...(moment.domain && moment.domain.index >= 0 ? { domainIndex: moment.domain.index, domainCount: moment.domain.count } : {})}
                strike={strike}
              />
            </Pop>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="caption" color={c.accentText}>{`A new badge · ${moment.setName}`}</T>
            <T v="headline" style={{ marginTop: space.xs }}>{momentName(moment)}</T>
            {/* The words are there from the first frame: the block may already be on screen when it plays, and words never blink. */}
            <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{moment.unlock}</T>
            {moment.completes && (
              <T v="meta" color={c.ink2} style={{ marginTop: space.xs }}>{`That completes ${moment.setName}.`}</T>
            )}
          </View>
        </View>
      </Celebrate>
      <View style={{ paddingLeft: space.md + 3 }}>
        {link}
        {moment.next && (
          <T v="meta" num color={c.ink2}>
            {moment.next}
          </T>
        )}
      </View>
    </Animated.View>
  );
}

/** A game's level: the leaf AND its name, never colour or shape alone. */
export function TierTag({ tier, color, textColor }: { tier: GameTier; color?: string; textColor?: string }) {
  const { c } = useTheme();
  return (
    <Row gap={6} style={{ flexWrap: 'wrap' }}>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <TierLeaf tier={tier} color={color ?? c.accentText} rib={c.bg} />
      </View>
      <T v="meta" color={textColor ?? c.ink2}>{GAME_TIER_NAME[tier]}</T>
    </Row>
  );
}
