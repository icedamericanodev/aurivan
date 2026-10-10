/**
 * Build F: milestone and game-level pieces shared by Results, the game round
 * end, Play, You, Milestones and Field notes.
 *
 * Calm on purpose (behaviour review §4): no card, no confetti, no sound.
 * A milestone's moment is a key-idea-style block (3px accent rule) that
 * fades in over 240 ms (static with Reduce Motion), plus ONE success haptic
 * (Settings can switch haptics off), and is announced once.
 */
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { GAME_TIER_NAME, type GameTier } from '../engine/games/growth';
import { haptic } from '../lib/haptics';
import type { MilestoneMoment } from '../lib/milestones';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LeafBig, TierLeaf } from './glyphs';
import { Row, T } from './ui';

/** Moments already buzzed and announced (per session or round), so a re-render never repeats them. */
const buzzed = new Set<string>();

/**
 * The quiet inline moment for ONE milestone. `once` identifies the session
 * or round, so the haptic and announcement happen once even if the screen
 * re-renders or is revisited.
 */
export function MilestoneMomentView({ moment, once }: { moment: MilestoneMoment; once: string }) {
  const { c } = useTheme();
  const caption = moment.kind === 'skill' ? 'A pressed leaf for your field notes' : 'A quiet milestone';
  const spoken = `${caption}: ${moment.label}. ${moment.rule}`;
  useEffect(() => {
    const k = `${once}:${moment.key}`;
    if (buzzed.has(k)) return;
    buzzed.add(k);
    haptic.success();
    AccessibilityInfo.announceForAccessibility(spoken);
  }, [once, moment.key, spoken]);
  return (
    <Animated.View entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}>
      <View accessible accessibilityLabel={spoken} style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          <View accessible={false} importantForAccessibility="no-hide-descendants">
            <LeafBig color={c.accent} rib={c.bg} />
          </View>
          <T v="caption" color={c.accentText} style={{ flexShrink: 1 }}>{caption}</T>
        </Row>
        <T v="headline" style={{ marginTop: space.xs }}>{moment.label}</T>
        <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{moment.rule}</T>
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

/** One badge row on Milestones / Field notes: leaf (filled once earned) · name · rule · extra. */
export function BadgeRow({
  name,
  rule,
  earned,
  detail,
  extra,
  last,
  spoken,
}: {
  name: string;
  rule: string;
  earned: boolean;
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
        <TierLeaf tier={earned ? 'heartwood' : 'sapling'} color={earned ? c.accent : c.control} rib={c.bg} size={20} />
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
