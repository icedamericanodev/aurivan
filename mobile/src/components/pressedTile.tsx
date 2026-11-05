/**
 * The pressed paper tile (Grove Phase 4b, design-notes/grove/phase4b/PHASE4B.md 5.2 and 5.4).
 *
 * Plain English for the founder:
 * - One badge, drawn like a flower you pressed and kept. EARNED: a small cream paper tile (the same
 *   cream in light and dark, like the plant's paper) with the badge's real emblem in its botanical
 *   inks, held down by two strips of tape at opposite corners. The tape is decoration only: the
 *   words beside the tile ("Pressed 4 Nov") and the spoken label say it is earned.
 * - NOT YET: a pencilled dashed outline (`control`, 3:1 on the card) with the emblem's faint
 *   silhouette. Part of the outline is drawn solid in `accent`: how close you are (the same value
 *   the words say, "31 of 75 remembered").
 * - GATED: a dotted, empty outline ("Opens later" is in words). Never a padlock.
 * - The tile is a picture only: hidden from screen readers. Whatever holds it says it in words.
 *
 * Motion (opacity and scale only):
 * - `press` (the case, a sheet opening): a newly earned tile is pressed flat (1.06 to 1) and its
 *   tape lands, as before.
 * - `moment` (the unlock on Results, 5.4): 0 ms the pencilled mount; 120 ms a sheet of glassine
 *   lays over it with the cream tile under it (200 ms); 320 ms pressed flat, 1.06 to 1 (240 ms,
 *   `enter` curve); 560 ms the glassine lifts away (200 ms); 760 ms and 960 ms the two strips of
 *   tape land (opacity, 0.9 to 1, 120 ms). Done by 1080 ms. 'end' jumps to the last frame (a tap,
 *   a scroll, Reduce Motion, a repeat).
 */
import { memo, useEffect, useLayoutEffect, type ComponentProps } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { glassine, groveRadius, specimenTape } from '../theme/grove';
import { fieldInk } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { EmblemArt } from './medallion';
import { ease, tween, useMotion } from './motion';

export type TileState = 'earned' | 'open' | 'gated';

/** The unlock's timeline in ms (PHASE4B 5.4). Every value lives here, in the component (section 8). */
export const PRESS_TIMELINE = {
  glassIn: 120,
  glassInDur: 200,
  pressAt: 320,
  pressDur: 240,
  glassOut: 560,
  glassOutDur: 200,
  tape1: 760,
  tape2: 960,
  tapeDur: 120,
  done: 1080,
} as const;

/** How the tile plays: the last frame, the case's press-in, waiting at the mount, or the unlock. */
export type TileMotion = 'end' | 'press' | 'pending' | 'moment';

/** A tile's corners: the Grove tile's 16, a little less on small tiles so they stay square-ish. */
export const tileRadius = (size: number) => Math.min(groveRadius.tile, Math.round(size * 0.19));
/** The emblem inside a tile of `size`. */
export const emblemFor = (size: number) => Math.round(size * 0.7);

/**
 * The rounded outline's length (for the "how close" stroke). A rounded rect of side `w` and corner
 * `r`: four straight runs plus one full circle.
 */
export function outlineLength(w: number, r: number): number {
  return 4 * (w - 2 * r) + 2 * Math.PI * r;
}

type Easing = (typeof ease)[keyof typeof ease];
const timing = (to: number, duration: number, easing: Easing = ease.out) => withTiming(to, { duration, easing, reduceMotion: ReduceMotion.Never });

/** The two strips of tape, at opposite corners (top right, bottom left). Decorative. */
type AnimatedStyle = ComponentProps<typeof Animated.View>['style'];
export function TapeStrips({ size, style }: { size: number; style?: [AnimatedStyle, AnimatedStyle] }) {
  const len = Math.max(14, Math.round(size * 0.3));
  const thick = Math.max(6, Math.round(size * 0.1));
  return (
    <>
      <Animated.View
        testID="tile-tape"
        pointerEvents="none"
        style={[{ position: 'absolute', top: Math.round(size * 0.04), right: -Math.round(size * 0.04), width: len, height: thick, borderRadius: 2, backgroundColor: specimenTape, transform: [{ rotate: '22deg' }] }, style?.[0]]}
      />
      <Animated.View
        testID="tile-tape"
        pointerEvents="none"
        style={[{ position: 'absolute', bottom: Math.round(size * 0.14), left: -Math.round(size * 0.05), width: len, height: thick, borderRadius: 2, backgroundColor: specimenTape, transform: [{ rotate: '-14deg' }] }, style?.[1]]}
      />
    </>
  );
}

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

export const PressedTile = memo(function PressedTile({
  badge,
  tier,
  emblem,
  state,
  size,
  progress = 0,
  motion = 'end',
  delay = 0,
  run = 0,
  testID,
}: {
  badge: string;
  tier?: number;
  emblem?: string;
  state: TileState;
  /** The tile's side in points (84 on the case, 120 on a sheet, 68 on Results). */
  size: number;
  /** Not yet: how close (0 to 1), drawn as the solid part of the outline. */
  progress?: number;
  /** Earned only: how it arrives (see the file note). */
  motion?: TileMotion;
  /** 'press': the press starts after this many ms. */
  delay?: number;
  /** 'moment': changes each time the unlock starts (the celebration's run). */
  run?: number;
  testID?: string;
}) {
  const { c, g } = useTheme();
  const { reduced } = useMotion();
  const earned = state === 'earned';
  // Reduce Motion always shows the last frame: the taped tile at once (PHASE4B section 8).
  const m: TileMotion = earned && !reduced ? motion : 'end';
  const startsAtMount = m === 'pending' || m === 'moment' || m === 'press';
  // The paper (opacity), the glassine (opacity), the press (scale 1.06 to 1), the two tapes.
  const paper = useSharedValue(startsAtMount ? 0 : 1);
  const glass = useSharedValue(0);
  const flat = useSharedValue(startsAtMount ? 1.06 : 1);
  const tape1 = useSharedValue(startsAtMount ? 0 : 1);
  const tape2 = useSharedValue(startsAtMount ? 0 : 1);
  // Before paint, so the tile never flashes its last frame before a press.
  useLayoutEffect(() => {
    if (m === 'end') {
      paper.set(1);
      glass.set(0);
      flat.set(1);
      tape1.set(1);
      tape2.set(1);
    } else if (m === 'pending' || m === 'moment') {
      paper.set(0);
      glass.set(0);
      flat.set(1.06);
      tape1.set(0);
      tape2.set(0);
    }
  }, [m, run, paper, glass, flat, tape1, tape2]);
  useEffect(() => {
    if (m === 'press') {
      paper.set(withDelay(delay, tween(1, 'enter', ease.enter)));
      flat.set(withDelay(delay, tween(1, 'enter', ease.enter)));
      tape1.set(withDelay(delay + 200, tween(1, 'quick')));
      tape2.set(withDelay(delay + 200, tween(1, 'quick')));
      return;
    }
    if (m !== 'moment') return;
    const T = PRESS_TIMELINE;
    paper.set(withDelay(T.glassIn, timing(1, T.glassInDur)));
    glass.set(withDelay(T.glassIn, withSequence(timing(1, T.glassInDur), withDelay(T.glassOut - T.glassIn - T.glassInDur, timing(0, T.glassOutDur)))));
    flat.set(withDelay(T.pressAt, timing(1, T.pressDur, ease.enter)));
    tape1.set(withDelay(T.tape1, timing(1, T.tapeDur)));
    tape2.set(withDelay(T.tape2, timing(1, T.tapeDur)));
  }, [m, run, delay, paper, glass, flat, tape1, tape2]);
  const paperStyle = useAnimatedStyle(() => ({ opacity: paper.value, transform: [{ scale: flat.value }] }));
  const glassStyle = useAnimatedStyle(() => ({ opacity: glass.value, transform: [{ scale: flat.value }] }));
  const tape1Style = useAnimatedStyle(() => ({ opacity: tape1.value, transform: [{ rotate: '22deg' }, { scale: 0.9 + 0.1 * tape1.value }] }));
  const tape2Style = useAnimatedStyle(() => ({ opacity: tape2.value, transform: [{ rotate: '-14deg' }, { scale: 0.9 + 0.1 * tape2.value }] }));
  const r = tileRadius(size);
  const art = emblemFor(size);
  const mono = { E1: c.control, E2: c.control, E3: c.control, D2: c.control, D3: c.control, L3: c.control, K: c.raised };
  return (
    <View testID={testID} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {/* The mount: always under an earned tile too, so the unlock starts from it. */}
      {(!earned || startsAtMount) && <Mount size={size} state={earned ? 'open' : state === 'gated' ? 'gated' : 'open'} progress={earned ? 0 : progress} />}
      {/* The emblem's faint silhouette: a not-yet tile, and the pencilled mount an unlock starts from. */}
      {state === 'open' || (earned && startsAtMount) ? (
        <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <EmblemArt badge={badge} tier={tier} emblem={emblem} palette={mono} size={art} opacity={0.42} />
        </View>
      ) : null}
      {earned ? (
        <>
          <Animated.View testID="tile-paper" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: r, backgroundColor: g.specimen, alignItems: 'center', justifyContent: 'center' }, paperStyle]}>
            {/* `g.specimen` is cream in both themes (5.2), so the emblem keeps its light-sheet inks (E3 about 6:1 on it). */}
            <EmblemArt badge={badge} tier={tier} emblem={emblem} palette={fieldInk.light.pressed} size={art} />
          </Animated.View>
          <Animated.View testID="tile-glassine" pointerEvents="none" style={[{ position: 'absolute', left: -2, top: -2, width: size + 4, height: size + 4, borderRadius: r, backgroundColor: glassine }, glassStyle]} />
          <TapeStrips size={size} style={[tape1Style, tape2Style]} />
        </>
      ) : null}
    </View>
  );
});

