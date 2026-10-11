/**
 * Build F: milestone and game-level pieces shared by Results, the game round
 * end, Play, You, Milestones and Field notes.
 *
 * Calm on purpose (behaviour review §4): no card, no confetti, no sound.
 * A milestone's moment is a key-idea-style block (3px accent rule) with ONE
 * success haptic (Settings can switch haptics off), announced once.
 *
 * Mobile 1.9 (motion M6, a rare T3 moment): the pressed leaf springs in and a
 * few leaves drift down beside it, once, in their own column (never over the
 * words), ≤ 1.2 s; any tap ends it. Repeats play short (the block fades
 * in), and only one celebration plays in full per session. Reduce Motion:
 * the block fades in still, with the same words.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { GAME_TIER_NAME, type GameTier } from '../engine/games/growth';
import { haptic } from '../lib/haptics';
import type { MilestoneMoment } from '../lib/milestones';
import { motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LeafBig, TierLeaf } from './glyphs';
import { Celebrate, LeafFall, Pop, useCelebration, useMotion } from './motion';
import { Row, T } from './ui';

/** Moments already buzzed and announced (per session or round), so a re-render never repeats them. */
const buzzed = new Set<string>();

/** The pressed leaf's column: the leaf on top, the drifting leaves below it. */
const LEAF_COL = 40;

/**
 * The quiet inline moment for ONE milestone. `once` identifies the session
 * or round, so the haptic and announcement happen once even if the screen
 * re-renders or is revisited.
 */
export function MilestoneMomentView({
  moment,
  once,
  inView = true,
}: {
  moment: MilestoneMoment;
  once: string;
  /**
   * The moment's motion waits until it is on screen (Results: below the
   * stats). The haptic and the announcement don't wait.
   */
  inView?: boolean;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const caption = moment.kind === 'skill' ? 'A pressed leaf for your field notes' : 'A quiet milestone';
  const spoken = `${caption}: ${moment.label}. ${moment.rule}`;
  const k = `${once}:${moment.key}`;
  // A moment seen before (a revisit) is simply shown.
  const [fresh] = useState(() => !buzzed.has(k));
  const celebration = useCelebration('milestone', fresh && inView);
  const full = celebration.mode === 'full';
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (buzzed.has(k)) return;
    buzzed.add(k);
    haptic.success();
    AccessibilityInfo.announceForAccessibility(spoken);
  }, [k, spoken]);
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
            style={{ width: LEAF_COL, alignItems: 'center' }}
          >
            <LeafFall run={full} colors={[c.accent, c.sap]} width={LEAF_COL} height={height} count={6} />
            <Pop trigger={full ? celebration.run : undefined} from={0.4}>
              <LeafBig color={c.accent} rib={c.bg} size={32} />
            </Pop>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="caption" color={c.accentText}>{caption}</T>
            <T v="headline" style={{ marginTop: space.xs }}>{moment.label}</T>
            <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{moment.rule}</T>
          </View>
        </View>
      </Celebrate>
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

/** One badge row on Milestones / Field notes: leaf (filled once earned) · name · rule · extra. */
export function BadgeRow({
  name,
  rule,
  earned,
  detail,
  extra,
  last,
  spoken,
  press,
}: {
  name: string;
  rule: string;
  earned: boolean;
  /**
   * Mobile 1.9: earned since the learner last looked: the leaf presses in
   * (outline → filled, a small spring) after this many ms.
   */
  press?: number;
  /** "Earned 6 Oct 2026" or a progress line. */
  detail?: string;
  /** A progress bar, under the rule. */
  extra?: ReactNode;
  last?: boolean;
  spoken: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{ flexDirection: 'row', gap: space.md, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ paddingTop: 3 }}>
        <Pop mount={press !== undefined} from={0.4} delay={press ?? 0}>
          <TierLeaf tier={earned ? 'heartwood' : 'sapling'} color={earned ? c.accent : c.control} rib={c.bg} size={20} />
        </Pop>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label">{name}</T>
        <T v="meta" style={{ marginTop: 2 }}>{rule}</T>
        {extra}
        {detail ? (
          <T v="meta" num color={earned ? c.accentText : c.ink2} style={{ marginTop: space.xs }}>
            {detail}
          </T>
        ) : null}
      </View>
    </View>
  );
}
