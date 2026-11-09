/** Modern Grove badge tile. Stable artwork and earning state; no plant rewards or tape. */
import { memo, useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { badgePaper } from '../theme/grove';
import { light } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BadgeEmblem } from './badgeEmblem';
import { ease, tween, useMotion } from './motion';

export type TileState = 'earned' | 'open' | 'gated';
export type TileMotion = 'end' | 'press' | 'pending' | 'moment';
export const PRESS_TIMELINE = { pressAt: 120, done: 360 } as const;
export const tileRadius = (size: number) => Math.round(size * 0.27);
export const emblemFor = (size: number) => Math.round(size * 0.52);
export function outlineLength(w: number, r: number): number { return 4 * (w - 2 * r) + 2 * Math.PI * r; }

/** The pencilled mount: dashed (not yet) or dotted (gated), with the solid "how close" part in accent. */
function Mount({ size, state, progress }: { size: number; state: 'open' | 'gated'; progress: number }) {
  const { c } = useTheme();
  const sw = 1.5;
  const w = size - sw;
  const r = Math.max(0, tileRadius(size) - sw / 2);
  const len = outlineLength(w, r);
  const p = state === 'open' ? Math.max(0, Math.min(1, progress)) : 0;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Rect x={sw / 2} y={sw / 2} width={w} height={w} rx={r} ry={r} fill="none" stroke={c.control} strokeWidth={sw} strokeDasharray={state === 'gated' ? '1.5 4' : '5 4'} strokeLinecap={state === 'gated' ? 'round' : 'butt'} />
      {p > 0 ? (
        // The solid part: drawn from the top left corner, clockwise, as long as the progress.
        <Rect testID="tile-progress" x={sw / 2} y={sw / 2} width={w} height={w} rx={r} ry={r} fill="none" stroke={c.accent} strokeWidth={2} strokeDasharray={`${(p * len).toFixed(1)} ${len.toFixed(1)}`} />
      ) : null}
    </Svg>
  );
}

export const PressedTile = memo(function PressedTile({ badge, state, size, progress = 0, motion = 'end', delay = 0, run = 0, testID }: {
  badge: string; tier?: number; emblem?: string; state: TileState; size: number; progress?: number;
  motion?: TileMotion; delay?: number; run?: number; testID?: string;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const earned = state === 'earned';
  const pending = earned && !reduced && motion === 'pending';
  const scale = useSharedValue(1);
  useEffect(() => {
    if (earned && !reduced && (motion === 'press' || motion === 'moment')) {
      scale.set(0.97);
      scale.set(withDelay(delay + (motion === 'moment' ? PRESS_TIMELINE.pressAt : 0), tween(1, 'quick', ease.enter)));
    } else { scale.set(1); }
  }, [earned, reduced, motion, delay, run, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const radius = tileRadius(size);
  return (
    <View testID={testID} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {(!earned || pending) && <Mount size={size} state={state === 'gated' ? 'gated' : 'open'} progress={pending ? 0 : progress} />}
      {state === 'open' || pending ? <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}><BadgeEmblem badge={badge} color={c.control} size={emblemFor(size)} /></View> : null}
      {earned && !pending && <Animated.View testID="tile-paper" style={[{ width: size, height: size, borderRadius: radius, opacity: 1, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
          <Defs><LinearGradient id={`paper${uid}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={badgePaper.top} /><Stop offset="1" stopColor={badgePaper.bottom} /></LinearGradient></Defs>
          <Rect x={0.5} y={0.5} width={size - 1} height={size - 1} rx={radius} fill={`url(#paper${uid})`} stroke={badgePaper.edge} />
          <Rect x={5} y={5} width={size - 10} height={size - 10} rx={Math.max(1, radius - 5)} fill="none" stroke={badgePaper.inset} />
        </Svg>
        <BadgeEmblem badge={badge} color={light.accent} size={emblemFor(size)} />
      </Animated.View>}
    </View>
  );
});
