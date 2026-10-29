/**
 * Motion primitives (DESIGN_SYSTEM.md §8 "Motion", mobile 1.8).
 *
 * The idea: everyday UI moves like paper (quick, soft, never bouncy); only
 * the verdict leaf springs. Each animation explains one thing: where
 * something came from or went, what changed, or that the app heard a tap.
 *
 * Rules every primitive here follows:
 * - Transform and opacity only, driven by Reanimated on the UI thread. No
 *   layout animation, no JS timers per frame.
 * - Reduce Motion comes from useMotion(): the phone's setting (LIVE, it reacts
 *   when the learner changes it mid-session) or Settings → Motion → Reduced.
 *   Reduced never means a hard cut for a meaningful change: movement becomes
 *   a short cross-fade (motion.dur.reduced) with the same information.
 * - Our tweens pass ReduceMotion.Never, because they already chose their own
 *   reduced path; Reanimated's global switch would skip the cross-fade too.
 * - Nothing here changes what a screen reader hears or the focus order:
 *   content is mounted (and readable) from the first frame.
 * - Nothing blocks input: every animation can be interrupted by the next tap.
 */
import * as Router from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn as FadeInAnimation,
  FadeOut as FadeOutAnimation,
  ReducedMotionConfig,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { sayLater } from '../lib/a11y';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { motion } from '../theme/tokens';

export type MotionDur = keyof typeof motion.dur;

// ── Reduce Motion: live, and with the in-app choice ────────────────────
// Reanimated's useReducedMotion() is read once, when the app starts. We keep
// that as the starting value and then follow the phone's own event, plus a
// re-check whenever the app comes back to the foreground (the setting may
// have changed while it was in the background).
let systemLive: boolean | null = null;
const subscribers = new Set<() => void>();
let listening = false;

function setSystem(value: boolean) {
  if (value === systemLive) return;
  systemLive = value;
  subscribers.forEach((notify) => notify());
}

function startListening() {
  if (listening) return;
  listening = true;
  // One listener each for the whole app, never one per component.
  AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') AccessibilityInfo.isReduceMotionEnabled().then(setSystem, () => {});
  });
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  startListening();
  return () => {
    subscribers.delete(notify);
  };
}

/** Tests: how many components are listening right now. */
export const motionSubscriberCount = () => subscribers.size;
/** Tests: simulate the phone's Reduce Motion switch (null = back to the startup value). */
export function setSystemReducedMotionForTest(value: boolean | null) {
  systemLive = value;
  subscribers.forEach((notify) => notify());
}

/** The phone's Reduce Motion setting, live (Android: "Remove animations" counts too). */
export function useSystemReducedMotion(): boolean {
  const startup = useReducedMotion();
  return useSyncExternalStore(subscribe, () => systemLive ?? startup, () => startup);
}

/**
 * The one source of truth for motion. `reduced` = the phone asks for less
 * motion, or the learner chose Settings → Motion → Reduced.
 */
export function useMotion(): { reduced: boolean } {
  const system = useSystemReducedMotion();
  const pref = useSettings((s) => s.motion);
  return { reduced: pref === 'reduced' || system };
}

/**
 * Mounted once at the root: mirrors useMotion() into Reanimated, so any
 * animation that still says ReduceMotion.System (the growth rings, layout
 * entrances) follows the in-app choice and a live change too. It renders
 * nothing when Reanimated's own startup value already agrees.
 */
export function MotionRoot() {
  const { reduced } = useMotion();
  const startup = useReducedMotion();
  if (reduced === startup) return null;
  return <ReducedMotionConfig mode={reduced ? ReduceMotion.Always : ReduceMotion.Never} />;
}

// ── Easing and tweens ──────────────────────────────────────────────────
const bezier = (p: readonly number[]) => Easing.bezier(p[0], p[1], p[2], p[3]);
export const ease = {
  /** The default: decelerates, so feedback reads as immediate. */
  out: Easing.out(Easing.cubic),
  /** Arriving (M3 emphasized decelerate). */
  enter: bezier(motion.curve.enter),
  /** Leaving (M3 emphasized accelerate). */
  exit: bezier(motion.curve.exit),
  /** Moving on screen (M3 standard). */
  standard: bezier(motion.curve.standard),
};
type Ease = (typeof ease)[keyof typeof ease];

/** A token-timed tween. Never skipped by Reanimated: our components choose their reduced path. */
export function tween(to: number, dur: MotionDur, easing: Ease = ease.out) {
  return withTiming(to, { duration: motion.dur[dur], easing, reduceMotion: ReduceMotion.Never });
}

/** Jump to a value at once (the first step of a sequence). */
const snap = (to: number) => withTiming(to, { duration: 0, reduceMotion: ReduceMotion.Never });

// ── useOncePerDay ──────────────────────────────────────────────────────
// Signature growth plays on the first view of the day only; after that a
// screen shows its end state. useOncePerDay is kept in memory (a new app
// launch on the same day may play it once more, which is fine for a screen
// that is opened on purpose); a surface's first VIEW of the day (useGrowth:
// Today, You) is saved in the seen store, so a cold relaunch never replays it.
const seenOn: Record<string, string> = {};
const todayKey = () => new Date().toDateString();

/** Has `key`'s first view of the day not been used yet? (Saved across launches; reads only.) */
export function isFirstViewToday(key: string): boolean {
  return useSeen.getState().days[key] !== todayKey();
}

/**
 * True the first time `key` is asked about today, false after that (marks it
 * at once, saved across launches). The non-hook form, for a decision taken
 * when a screen comes into view rather than when it mounts (useGrowth).
 */
export function claimFirstView(key: string): boolean {
  return useSeen.getState().claimDay(key, todayKey());
}

/** True the first time `key` mounts today (stable for the component's life). */
export function useOncePerDay(key: string): boolean {
  const [first] = useState(() => seenOn[key] !== todayKey());
  useEffect(() => {
    seenOn[key] = todayKey();
  }, [key]);
  return first;
}
/** Tests: forget what was seen today (in memory and the saved first views). */
export function resetOncePerDayForTest() {
  for (const k of Object.keys(seenOn)) delete seenOn[k];
  useSeen.setState({ days: {} });
}

// ── Page arrivals (PageTurn → FadeIn) ──────────────────────────────────
/**
 * The page a PageTurn has just brought in, or null for a screen's first page.
 * FadeIn reads it: groups that mount WITH an arriving page show at once (the
 * page's own arrival is their entrance, so nothing staggers twice), while
 * anything mounting later on that page (the answer reveal) still plays.
 */
const ArrivalContext = createContext<object | null>(null);
const settledArrivals = new WeakSet<object>();

// ── FadeIn: content arrives (fade + 8pt rise) ──────────────────────────
/**
 * The entrance for a content group: opacity 0 → 1 and an 8pt rise, ease-out.
 * `i` staggers groups 40 ms apart (the 5th group on starts with the 4th);
 * `delay` adds an explicit wait (the answer reveal). `when` holds it until
 * true (e.g. scrolled into view). Plays once per mount. Inside a page that a
 * PageTurn is bringing in, it shows at once: the page's arrival is the entrance.
 * Reduced: an opacity-only cross-fade (120 ms), no rise, no stagger.
 */
export function FadeIn({
  i = 0,
  delay = 0,
  dur = 'enter',
  when = true,
  rise = true,
  build = false,
  play = true,
  drop = false,
  style,
  children,
}: {
  i?: number;
  delay?: number;
  dur?: MotionDur;
  when?: boolean;
  /** false = fade only. */
  rise?: boolean;
  /**
   * Mobile 1.12: a part of a lesson diagram that builds up in reading order.
   * It plays even inside a page a PageTurn is bringing in (the build-up IS
   * the content), with its own `delay`.
   */
  build?: boolean;
  /** false = shown in place at once (a group that was already open when its screen opened). */
  play?: boolean;
  /** Arrive from 8pt ABOVE instead of below (a lesson's layers settling onto the stack). */
  drop?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  // Mounted together with a page that a PageTurn is bringing in: that arrival
  // is the entrance, so this group starts in place (nothing moves twice).
  const arrival = useContext(ArrivalContext);
  // Inside a celebration that was skipped (a tap) or has ended: at its end state now.
  const settled = useContext(CelebrateContext).settled;
  const [withPage] = useState(() => !play || (!build && arrival !== null && !settledArrivals.has(arrival)));
  const p = useSharedValue(withPage ? 1 : 0);
  const y = useSharedValue(reduced || !rise || withPage ? 0 : drop ? -motion.rise : motion.rise);
  const played = useRef(withPage);
  useEffect(() => {
    if (!settled || !when) return;
    played.current = true;
    cancelAnimation(p);
    cancelAnimation(y);
    p.set(1);
    y.set(0);
  }, [settled, when, p, y]);
  useEffect(() => {
    if (!when || played.current) return;
    played.current = true;
    if (reduced) {
      y.set(0);
      p.set(tween(1, 'reduced'));
      return;
    }
    const wait = Math.min(i, motion.stagger.maxGroups - 1) * motion.stagger.group + delay;
    p.set(withDelay(wait, tween(1, dur)));
    y.set(withDelay(wait, tween(0, dur)));
  }, [when, reduced, i, delay, dur, p, y]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

// ── usePressScale: the app heard the tap ──────────────────────────────
/** A Pressable that takes Reanimated styles (press feedback on the UI thread). */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressScaleOptions {
  /** Press-in scale (default .98). 1 = no squeeze (rows use a tint instead). */
  scale?: number;
  /** Also dim to .92 while pressed (buttons). */
  dim?: boolean;
  /** A pressed tint that fades in under the content (list rows: `soft`). */
  tint?: string;
  tintRadius?: number;
  /** The tint grows from this scale to 1 as it fades in (icon buttons: .9). */
  tintFrom?: number;
  /** Mirror the press into a parent's value (the hero panel's lift). */
  follow?: SharedValue<number>;
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
}

/**
 * Press feedback for an AnimatedPressable, run on the UI thread: press-in
 * eases to .98 in 120 ms, release springs back with no overshoot, and the
 * screen never re-renders for a press. Spread `onPressIn` / `onPressOut`
 * and add `style` last; render `layer` as the first child (the tint).
 * A hook, not a wrapper, so the Pressable keeps its own props and is the
 * only element that carries the role and the press handler.
 * Reduced: no squeeze, a short dim instead (tints stay: they don't move).
 * Never scale anything wider than a row, and never text alone.
 */
export function usePressScale({
  scale = motion.pressScale,
  dim = false,
  tint,
  tintRadius = 0,
  tintFrom = 1,
  follow,
  onPressIn,
  onPressOut,
}: PressScaleOptions = {}) {
  const { reduced } = useMotion();
  const p = useSharedValue(0);
  const pressIn = (e: GestureResponderEvent) => {
    p.set(tween(1, 'press'));
    if (follow) follow.set(tween(1, 'press'));
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    p.set(withSpring(0, { ...motion.spring.press, reduceMotion: ReduceMotion.Never }));
    if (follow) follow.set(withSpring(0, { ...motion.spring.press, reduceMotion: ReduceMotion.Never }));
    onPressOut?.(e);
  };
  const squeeze = 1 - scale;
  const fade = 1 - motion.pressOpacity;
  const dims = dim || (reduced && scale < 1);
  const style = useAnimatedStyle(() => ({
    opacity: dims ? 1 - fade * p.value : 1,
    transform: [{ scale: reduced ? 1 : 1 - squeeze * p.value }],
  }));
  // The tint is its own component, so its animated style only exists when there is a tint.
  const layer = tint ? <PressTint p={p} color={tint} radius={tintRadius} from={reduced ? 1 : tintFrom} /> : null;
  /**
   * Mobile 1.43: back to rest at once, with nothing left animating. For a control that opens another
   * screen (the Settings gear): its press-out spring would still be running on the screen underneath
   * while the new one is pushed, which on Android could leave the round pressed gear drawn over the
   * new screen (owner report on 1.42.1, a gear floating over Settings' "Your name").
   */
  const settle = () => {
    cancelAnimation(p);
    p.set(0);
    if (follow) {
      cancelAnimation(follow);
      follow.set(0);
    }
  };
  return { onPressIn: pressIn, onPressOut: pressOut, style, layer, settle };
}

/** usePressScale's pressed tint: fades in under the content, growing from `from` to 1. */
function PressTint({ p, color, radius, from }: { p: SharedValue<number>; color: string; radius: number; from: number }) {
  const grow = 1 - from;
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 1 - grow + grow * p.value }] }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[StyleSheet.absoluteFill, styles.noTouch, { backgroundColor: color, borderRadius: radius }, anim]}
    />
  );
}

// ── StateLayer: what changed (a state cross-fades in place) ────────────
/**
 * An always-mounted layer over (or under) a control whose opacity follows
 * `on`: the option's 2px ink ring, a chip's ink fill, a segment's marker.
 * Because it never mounts or resizes, nothing reflows when the state
 * changes. Colour and opacity never bounce. Same under Reduce Motion: a
 * cross-fade is already the calm form.
 */
export function StateLayer({
  on,
  style,
  dur = 'select',
  step = false,
  children,
}: {
  on: boolean;
  style?: StyleProp<ViewStyle>;
  dur?: MotionDur;
  /**
   * Flip at the half-way point instead of fading. For a letter whose colours
   * invert (paper on ink vs ink on paper): a linear cross-fade passes through
   * zero contrast, so the letter would vanish for a moment mid-fade.
   */
  step?: boolean;
  /** Drawn inside the layer (a badge's letter in its "on" colour), so it cross-fades too. */
  children?: ReactNode;
}) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.set(tween(on ? 1 : 0, dur));
  }, [on, dur, o]);
  const anim = useAnimatedStyle(() => ({ opacity: step ? (o.value >= 0.5 ? 1 : 0) : o.value }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, styles.noTouch, style, anim]}
    >
      {children}
    </Animated.View>
  );
}

// ── ProgressFill: a bar that grows (translateX inside a clipping track) ─
/**
 * The fill of a progress track: a full-width bar slid left by (1 − value)
 * of the track and clipped by it, so its rounded end stays round at every
 * value (scaleX would squash it). Place it inside a track View with
 * `overflow: 'hidden'`. A change eases over 300 ms; the first render shows
 * the value at once (nothing grows on mount: rings and numbers own that).
 * `from` (mobile 1.9): the value the learner last SAW (a milestone's
 * "closest next" bar): the bar starts there and grows to now over `grow`,
 * after `delay` (so a pushed screen has arrived first). Only ever upward.
 * Reduced: the new value at once, with a 120 ms brighten of the fill.
 */
export function ProgressFill({
  value,
  color,
  radius = 0,
  from,
  delay = 0,
}: {
  value: number;
  color: string;
  radius?: number;
  /** Grow from this value on mount (it must be lower than `value`). */
  from?: number;
  delay?: number;
}) {
  const { reduced } = useMotion();
  const clamp = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
  const v = clamp(value);
  // Grows on mount only when it went UP since last seen, and never under Reduce Motion.
  const [start] = useState(() => (from !== undefined && clamp(from) < v && !reduced ? clamp(from) : null));
  const [width, setWidth] = useState(0);
  const p = useSharedValue(start ?? v);
  const o = useSharedValue(1);
  const shown = useRef(start ?? v);
  // The mount growth waits for the track's width (the slide is measured in points).
  const grew = useRef(start === null);
  useEffect(() => {
    if (grew.current || width === 0) return;
    grew.current = true;
    shown.current = v;
    p.set(withDelay(delay, tween(v, 'grow')));
  }, [width, v, delay, p]);
  useEffect(() => {
    if (!grew.current || shown.current === v) return;
    shown.current = v;
    if (reduced) {
      p.set(v);
      o.set(withSequence(snap(0.55), tween(1, 'reduced')));
    } else {
      p.set(tween(v, 'fill'));
    }
  }, [v, reduced, p, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: (p.value - 1) * width }] }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, styles.noTouch]}
    >
      {width === 0 ? (
        // Before the first layout: the same picture, drawn by width.
        <Animated.View style={{ width: `${(start ?? v) * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius }} />
      ) : (
        <Animated.View style={[{ width: '100%', height: '100%', backgroundColor: color, borderRadius: radius }, anim]} />
      )}
    </Animated.View>
  );
}

// ── Pop: a small mark arrives (verdict leaf, bookmark) ─────────────────
/**
 * Springs its child from `from` (default .6) to full size when `trigger`
 * changes to a truthy value, or on mount with `mount`. Only marks pop,
 * never controls or text blocks. Reduced: a 120 ms fade-in, no scale.
 */
export function Pop({
  trigger,
  mount = false,
  from = 0.6,
  spring = 'leaf',
  delay = 0,
  style,
  children,
}: {
  trigger?: unknown;
  mount?: boolean;
  from?: number;
  spring?: 'pop' | 'leaf';
  /** Wait this long first (a staggered set of marks); it waits small, never hidden. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  const s = useSharedValue(mount && !reduced ? from : 1);
  const o = useSharedValue(mount && reduced ? 0 : 1);
  const first = useRef(true);
  const last = useRef(trigger);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!mount) return;
    } else {
      // Only a NEW truthy trigger pops (not a re-run for another reason).
      if (trigger === last.current) return;
      last.current = trigger;
      if (!trigger) return;
    }
    if (reduced) {
      s.set(1);
      o.set(withSequence(snap(0), tween(1, 'reduced')));
      return;
    }
    s.set(withSequence(snap(from), withDelay(delay, withSpring(1, { ...motion.spring[spring], reduceMotion: ReduceMotion.Never }))));
  }, [trigger, mount, reduced, from, spring, delay, s, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// ── Shake: "not that one" (game tiles only) ────────────────────────────
/**
 * One small horizontal shake (±6 → 0 over 160 ms) each time `trigger`
 * changes to a new non-zero number. Reduced: nothing moves; the screen
 * shows the wrong state in words and colour, so nothing is lost.
 */
export function Shake({ trigger, style, children }: { trigger: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduced } = useMotion();
  const x = useSharedValue(0);
  const last = useRef(trigger);
  useEffect(() => {
    if (trigger === last.current) return;
    last.current = trigger;
    if (!trigger || reduced) return;
    const step = (to: number) => withTiming(to, { duration: motion.dur.quick / 4, reduceMotion: ReduceMotion.Never });
    x.set(withSequence(step(-6), step(6), step(-3), step(0)));
  }, [trigger, reduced, x]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// ── Learn and Play (mobile 1.12, motion.md M4/M5) ─────────────────────
/**
 * Show or hide a small group (a Learn domain's lessons, the Practice path
 * picker, Build a set). No height animation (that would be layout): the
 * rest of the screen moves at once, and what just opened arrives, so the
 * eye follows the new content, not a sliding edge. Opening fades the group
 * in with an 8pt rise; with `rows`, each child is its own row, 30 ms apart
 * (the first 6; the rest come with the 6th). Closing is immediate (the
 * chevron turning says it). A group that was already open when its screen
 * opened is simply there: nothing moves on mount. Reduced: a 120 ms fade.
 */
export function Collapse({ open, rows = false, style, children }: { open: boolean; rows?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  // Open from the start: shown in place. Every later opening plays.
  const [openAtMount] = useState(open);
  const [closedOnce, setClosedOnce] = useState(false);
  if (!open && !closedOnce) setClosedOnce(true);
  if (!open) return null;
  const play = !(openAtMount && !closedOnce);
  const parts = rows ? Children.toArray(children) : [children];
  return (
    <View style={style}>
      {parts.map((part, k) => (
        <FadeIn
          key={isValidElement(part) && part.key != null ? part.key : k}
          play={play}
          build
          dur="enter"
          delay={rows ? Math.min(k, motion.stagger.maxRows - 1) * motion.stagger.row : 0}
        >
          {part}
        </FadeIn>
      ))}
    </View>
  );
}

/**
 * Turns its child to `deg` (a chevron pointing down when open, right or up
 * when closed): a quick turn on the standard curve when it changes, never on
 * mount. Reduced: it simply points the new way (the direction is the state).
 */
export function Turn({ deg, style, children }: { deg: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduced } = useMotion();
  const a = useSharedValue(deg);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    a.set(reduced ? deg : tween(deg, 'quick', ease.standard));
  }, [deg, reduced, a]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${a.value}deg` }] }));
  return (
    <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={[style, anim]}>
      {children}
    </Animated.View>
  );
}

/**
 * Mobile 1.22: two states of one slot that swap in place. A pushed header's
 * title appears once the page's own title has scrolled under it; the answer
 * screen's recap ("Not quite · Best answer D") takes the progress segments'
 * place once the verdict has scrolled away. `first` sits in the layout (it
 * sizes the slot), `second` lies over it, centred. A 120 ms cross-fade on
 * the standard curve, never on mount; at once under Reduce Motion. The
 * hidden layer is hidden from screen readers and takes no touches.
 */
export function CrossFade({
  showSecond,
  first,
  second,
  style,
}: {
  showSecond: boolean;
  first?: ReactNode;
  second: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduced } = useMotion();
  const o = useSharedValue(showSecond ? 1 : 0);
  useEffect(() => {
    const to = showSecond ? 1 : 0;
    o.set(reduced ? to : tween(to, 'select', ease.standard));
  }, [showSecond, reduced, o]);
  const firstStyle = useAnimatedStyle(() => ({ opacity: 1 - o.value }));
  const secondStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  const hide = (hidden: boolean) =>
    hidden ? ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const) : {};
  return (
    <View style={style}>
      <Animated.View {...hide(showSecond)} style={[styles.swapFirst, showSecond && styles.noTouch, firstStyle]}>
        {first}
      </Animated.View>
      <Animated.View {...hide(!showSecond)} style={[StyleSheet.absoluteFill, styles.swapSecond, !showSecond && styles.noTouch, secondStyle]}>
        {second}
      </Animated.View>
    </View>
  );
}

/**
 * A line in a lesson diagram that draws itself (the step path, a timeline
 * rail): it grows from its start (top, or left) over `dur`, after `delay`,
 * when it mounts with `play`. Transform only (scaleY / scaleX from its
 * origin). Reduced, or not playing: drawn at once (like the vine).
 */
export function DrawLine({
  play = true,
  axis = 'y',
  delay = 0,
  dur = 'draw',
  durMs,
  style,
}: {
  play?: boolean;
  axis?: 'x' | 'y';
  delay?: number;
  dur?: MotionDur;
  /** A length worked out from tokens (a timeline rail spans its whole build). */
  durMs?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduced } = useMotion();
  const settled = useContext(CelebrateContext).settled;
  const still = !play || reduced || settled;
  const p = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) {
      cancelAnimation(p);
      p.set(1);
      return;
    }
    p.set(withDelay(delay, durMs ? withTiming(1, { duration: durMs, easing: ease.out, reduceMotion: ReduceMotion.Never }) : tween(1, dur, ease.out)));
  }, [still, delay, dur, durMs, p]);
  const anim = useAnimatedStyle(() => (axis === 'y' ? { transform: [{ scaleY: p.value }] } : { transform: [{ scaleX: p.value }] }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.noTouch, { transformOrigin: axis === 'y' ? 'top' : 'left' }, style, anim]}
    />
  );
}

// The ✓ on Lucide's 24 grid, drawn from its short stroke to its long one.
const CHECK_PATH = 'M4.5 12.5 9 17 19.5 6.5';
const CHECK_LENGTH = Math.hypot(4.5, 4.5) + Math.hypot(10.5, 10.5);
const AnimatedCheckPath = Animated.createAnimatedComponent(Path);

type CheckDrawProps = {
  play?: boolean;
  /**
   * Wait EMPTY until `play` (a lesson finished while Learn was out of view:
   * its row must not show the ✓ drawn, then empty it, then draw it again).
   */
  hold?: boolean;
  size?: number;
  color: string;
  strokeWidth?: number;
  delay?: number;
};

/**
 * A ✓ that draws itself, short stroke then long (`reveal`, 200 ms), when
 * `play` (a lesson just done, a note just marked as read). Otherwise it is
 * simply drawn: a plain SVG, with no animated nodes (a Learn group can hold
 * many done rows). `hold` keeps it empty until it plays. Reduced: it fades
 * in (120 ms), never a cut. Decorative: the row or button around it says the state.
 */
export function CheckDraw({ play = false, hold = false, size = 16, color, strokeWidth = 2.5, delay = 0 }: CheckDrawProps) {
  if (!play && !hold) {
    return (
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d={CHECK_PATH} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    );
  }
  return <DrawnCheck play={play} size={size} color={color} strokeWidth={strokeWidth} delay={delay} />;
}

/** CheckDraw while it waits or plays: one animated path. It starts empty, so it never shows drawn first. */
function DrawnCheck({ play, size, color, strokeWidth, delay }: { play: boolean; size: number; color: string; strokeWidth: number; delay: number }) {
  const { reduced } = useMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  const o = useSharedValue(reduced ? 0 : 1);
  // Before paint, so the frame that turns `play` on never shows the end state first.
  useLayoutEffect(() => {
    if (!play) return;
    if (reduced) {
      p.set(1);
      o.set(withSequence(snap(0), withDelay(delay, tween(1, 'reduced'))));
      return;
    }
    o.set(1);
    p.set(withSequence(snap(0), withDelay(delay, tween(1, 'reveal'))));
  }, [play, reduced, delay, p, o]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - p.value), strokeOpacity: p.value < 0.02 ? 0 : 1 }));
  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, fade]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <AnimatedCheckPath
          d={CHECK_PATH}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${CHECK_LENGTH} ${CHECK_LENGTH}`}
          animatedProps={props}
        />
      </Svg>
    </Animated.View>
  );
}

/** Which way a page turns: the explicit direction, else back when a numeric id goes down. */
export function turnDirection(from: string | number, to: string | number, explicit?: 1 | -1): 1 | -1 {
  if (explicit) return explicit;
  return typeof from === 'number' && typeof to === 'number' && to < from ? -1 : 1;
}

// ── PageTurn: one step sideways inside a task ──────────────────────────
/** The calm arrival (Reduce Motion, or a mock): a short fade, applied by Reanimated before the first frame. */
const QUIET_ARRIVAL = FadeInAnimation.duration(motion.dur.reduced).easing(ease.out).reduceMotion(ReduceMotion.Never);

type Page = { id: string | number; dir: 1 | -1; arrival: object | null; quiet: boolean };

/**
 * Shared-axis page turn (question → next question, Guided topic → next):
 * the page on screen fades out drifting 16pt the way you're going (120 ms,
 * accelerating), then the new page arrives from 16pt on the other side
 * (280 ms, decelerating). `onSwap` runs at the swap, before the new page is
 * painted, so the scroll can go back to the top unseen.
 * `direction`: 1 = forward (default), -1 = back; numeric ids infer it.
 * Each page is a fresh subtree (re-keyed on id), so no state from the old
 * page (a selection ring, a pressed tint) can show on the new one.
 * The leaving page can't be tapped, but stays readable: hiding it would push
 * screen-reader focus off the control that was just used. `onTurning` tells
 * the parent which page is still on screen while it leaves, so the parent's
 * own controls (footer, flag, bookmark) follow the page, not the tap.
 * `calm` (mocks: a timed exam should feel like the real test) and Reduce
 * Motion: no drift and no waiting: the new page fades in (120 ms).
 */
export function PageTurn({
  id,
  direction,
  calm = false,
  onSwap,
  onTurning,
  style,
  pageStyle,
  children,
}: {
  id: string | number;
  direction?: 1 | -1;
  calm?: boolean;
  /** Style for each page (a lesson scene fills the scroll's height: flex 1). */
  pageStyle?: StyleProp<ViewStyle>;
  /** At the swap, before the new page is painted, with the id of the page now on screen. */
  onSwap?: (id: string | number) => void;
  /** The leaving page's id when a turn starts; null once the new page is in. */
  onTurning?: (leavingId: string | number | null) => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  const quiet = reduced || calm;
  const [page, setPage] = useState<Page>({ id, dir: 1, arrival: null, quiet });
  const [leaving, setLeaving] = useState<1 | -1 | null>(null);
  // The page on screen, kept so it can fade out after the parent has
  // already moved on (written after each settled commit, read only while leaving).
  const onScreen = useRef<ReactNode>(children);
  const latest = useRef(id);
  const swapRef = useRef(onSwap);
  const turningRef = useRef(onTurning);
  const o = useSharedValue(1);
  const x = useSharedValue(0);
  // Declared before the other effects, so they see this commit's callbacks.
  useLayoutEffect(() => {
    latest.current = id;
    swapRef.current = onSwap;
    turningRef.current = onTurning;
    if (id === page.id && leaving === null) onScreen.current = children;
  });

  // A new id: decide during render (React's "adjust state when a prop changes").
  if (id !== page.id && leaving === null) {
    const dir = turnDirection(page.id, id, direction);
    if (quiet) setPage({ id, dir, arrival: {}, quiet: true });
    else setLeaving(dir);
  }

  // Tell the parent before paint, so its controls never run ahead of the page.
  const wasLeaving = useRef(false);
  useLayoutEffect(() => {
    const now = leaving !== null;
    if (now === wasLeaving.current) return;
    wasLeaving.current = now;
    turningRef.current?.(now ? page.id : null);
    // Only the start and the end of a turn report (page.id is the leaving page then).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);
  // Unmounted mid-turn: the parent's controls must not stay inert.
  useLayoutEffect(
    () => () => {
      if (wasLeaving.current) turningRef.current?.(null);
    },
    [],
  );

  // Leaving: fade and drift out, then swap to the newest id.
  useEffect(() => {
    if (leaving === null) return;
    o.set(tween(0, 'select', ease.exit));
    x.set(tween(-motion.shift * leaving, 'select', ease.exit));
    const t = setTimeout(() => {
      setLeaving(null);
      setPage({ id: latest.current, dir: leaving, arrival: {}, quiet: false });
    }, motion.dur.select);
    return () => clearTimeout(t);
  }, [leaving, o, x]);

  // Arriving: before paint, reset the scroll and place the page off to the side.
  useLayoutEffect(() => {
    if (!page.arrival) return;
    swapRef.current?.(page.id);
    if (page.quiet) {
      // The keyed page below fades itself in; the frame stays put.
      x.set(0);
      o.set(1);
      return;
    }
    x.set(withSequence(snap(motion.shift * page.dir), tween(0, 'screen', ease.enter)));
    o.set(withSequence(snap(0), tween(1, 'screen', ease.enter)));
  }, [page, o, x]);
  // After the arrival's own commit, anything new on the page animates again.
  useEffect(() => {
    if (page.arrival) settledArrivals.add(page.arrival);
  }, [page]);

  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }] }));
  const isLeaving = leaving !== null;
  return (
    <Animated.View style={[style, anim, isLeaving && styles.noTouch]}>
      <Animated.View key={String(page.id)} entering={page.arrival && page.quiet ? QUIET_ARRIVAL : undefined} style={pageStyle}>
        <ArrivalContext.Provider value={page.arrival}>
          {/* While leaving, the old page (from the last settled commit) fades out. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {isLeaving ? onScreen.current : children}
        </ArrivalContext.Provider>
      </Animated.View>
    </Animated.View>
  );
}

// ── Celebrations: skip, fatigue and the session budget (M6) ───────────
/**
 * A celebration that was skipped (any tap inside it) or has run its course.
 * Everything inside a <Celebrate> reads it and jumps to its end state.
 */
const CelebrateContext = createContext<{ settled: boolean }>({ settled: false });
/** Inside a celebration: true once it was skipped or has ended. */
export const useCelebrationSettled = () => useContext(CelebrateContext).settled;

/**
 * How a celebration plays:
 * - 'full': the whole choreography (≤ 1.2 s), skippable;
 * - 'short': the end state cross-fades in (200 ms), nothing else moves: the
 *   4th time onward for a kind, a second celebration in the same session, or
 *   once the session's decorative budget is spent;
 * - 'static': Reduce Motion. The end state at once, with the same text.
 */
export type CelebrationMode = 'full' | 'short' | 'static';

// App-session state (in memory). A session is one launch, or the time since
// the app came back after more than SESSION_GAP_MS in the background: Today
// can stay mounted for days, and tomorrow's clearing deserves its full form.
let sessionFull = false; // one celebration in full per session
let spentMs = 0; // decorative motion played so far this session
let backgroundAt: number | null = null;
let watchingSession = false;
/** Away this long (in the background), the app starts a new celebration session. */
export const SESSION_GAP_MS = 30 * 60_000;

function newSession() {
  sessionFull = false;
  spentMs = 0;
}

/** One AppState listener for the whole app (started by the first celebration hook). */
function watchSession() {
  if (watchingSession) return;
  watchingSession = true;
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') {
      backgroundAt ??= Date.now();
      return;
    }
    if (backgroundAt !== null && Date.now() - backgroundAt > SESSION_GAP_MS) newSession();
    backgroundAt = null;
  });
}

/**
 * Spend decorative motion from the session budget (≤ 3 s in all,
 * behavioural review §2). False = over budget: play the short or static form.
 * Only celebrations are charged. Informational growth (a number rolling to
 * what changed, a ring growing to its value) is not decoration: it is the
 * news itself, and it is never charged (DESIGN_SYSTEM.md §8.9).
 */
export function claimDecor(ms: number): boolean {
  if (spentMs + ms > motion.celebrate.sessionMs) return false;
  spentMs += ms;
  return true;
}

/**
 * The once-ever celebration class (mobile 1.50, DESIGN_SYSTEM §8.9): a moment
 * that plays once per thing for life (a plant's new form, "The Turning",
 * 2.4–3.6 s). It sits outside the 1.2 s ceiling and the 3 s budget because
 * it never repeats, and it is never fatigued. Instead it claims the session's
 * ONE full moment and the whole budget, so everything after it that session
 * plays short. False when the session's moment is already spent: the caller
 * offers a calm button that plays it on tap (a learner-started moment is
 * never charged).
 */
export function claimMoment(): boolean {
  watchSession();
  if (sessionFull || spentMs + motion.dur.celebrate > motion.celebrate.sessionMs) return false;
  sessionFull = true;
  spentMs = motion.celebrate.sessionMs;
  return true;
}

/** Tests: a fresh app session (no celebration yet, nothing spent). */
export function resetCelebrationsForTest() {
  newSession();
  backgroundAt = null;
}

/**
 * Moments too rare to wear out (behavioural review §2): the plant's growth
 * sequence comes once per growth (a Reset can bring the growths back), so it
 * never drops to the short form for being repeated (it still keeps the
 * one-full-moment-per-session rule and the session budget).
 */
const NEVER_FATIGUED = new Set(['plant-growth']);

/**
 * Decide (and record) how one celebration of `kind` plays now. `first`: the
 * first time this kind has ever shown (its one success haptic, for example).
 */
export function pickCelebration(kind: string, reduced: boolean, shortOnly = false): { mode: CelebrationMode; first: boolean } {
  const seen = useSeen.getState();
  const times = seen.moments[kind] ?? 0;
  seen.played(kind);
  const first = times === 0;
  if (reduced) return { mode: 'static', first };
  // `shortOnly`: a moment that never plays in full (a badge's higher tier, mobile 1.10).
  // A kind in NEVER_FATIGUED keeps its full form every time (it is rare: once per growth).
  const fatigued = times >= motion.celebrate.fullTimes && !NEVER_FATIGUED.has(kind);
  if (shortOnly || sessionFull || fatigued || !claimDecor(motion.dur.celebrate)) {
    // Even the short form is decoration: past the budget, the end state just shows.
    return { mode: claimDecor(motion.dur.short) ? 'short' : 'static', first };
  }
  sessionFull = true;
  return { mode: 'full', first };
}

export interface Celebration {
  mode: CelebrationMode;
  /** The first time this kind of moment has ever shown. */
  first: boolean;
  /** Skipped or over: everything inside shows its end state. */
  settled: boolean;
  /** Changes each time a celebration starts (restart key for the parts). */
  run: number;
  /** Jump to the end (any tap inside the moment, or on its screen). */
  skip: () => void;
}

/**
 * One celebration of `kind`, played when `run` turns true (the screen is in
 * view and the moment is due), decided once per occasion: see
 * CelebrationMode. `id` names the occasion (the clearing passes the plan's
 * day): a screen that stays mounted plays the next occasion too, and never
 * the same one twice. With `once`, the occasion plays once EVER (saved in the
 * seen store): later launches show it still, unannounced. `line` is the
 * moment in words, announced once per occasion to screen readers (in every
 * mode), after a short pause so a screen change doesn't cut it off. With
 * `shortOnly` it never plays in full (a badge's higher tier).
 * Never blocks input: buttons inside keep working, and any touch skips.
 */
export function useCelebration(kind: string, run: boolean, line?: string, id: string = '', once = false, shortOnly = false): Celebration {
  const { reduced } = useMotion();
  const [state, setState] = useState<{ mode: CelebrationMode; first: boolean; settled: boolean; run: number }>({ mode: 'static', first: false, settled: true, run: 0 });
  // The occasion that started (or was found already played), so it never starts twice.
  const started = useRef<string | null>(null);
  // Before paint, so the parts never flash their end state first.
  useLayoutEffect(() => {
    watchSession();
    if (!run || started.current === id) return;
    started.current = id;
    if (once) {
      const seen = useSeen.getState();
      if (seen.moments[id]) return; // played on an earlier launch: shown still
      seen.played(id);
    }
    const { mode, first } = pickCelebration(kind, reduced, shortOnly);
    // Deliberately in a layout effect: the start is decided before paint, so the parts never flash their end state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ mode, first, settled: mode !== 'full', run: s.run + 1 }));
    if (line) sayLater(line);
  }, [run, id, once, kind, reduced, line, shortOnly]);
  // A full moment has simply ended after its 1.2 s: a later tap is not a skip.
  useEffect(() => {
    if (state.settled) return;
    const t = setTimeout(() => setState((s) => ({ ...s, settled: true })), motion.dur.celebrate);
    return () => clearTimeout(t);
  }, [state.settled, state.run]);
  const skip = useCallback(() => setState((s) => (s.settled ? s : { ...s, settled: true })), []);
  return { ...state, skip };
}

/**
 * The frame of a celebration: everything inside reads whether it is settled
 * (and jumps to its end state when it is), and any touch inside skips it
 * (the touch still reaches the button under it). 'short' cross-fades the
 * whole block in over 200 ms instead of playing its parts, when the block is
 * new on screen; a block that was already drawn (the milestone scrolled
 * into view, the clearing under Results) never blinks out: it brightens a
 * little instead, like the reduced form of a change.
 */
export function Celebrate({ celebration, style, children }: { celebration: Celebration; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { mode, run, settled, skip } = celebration;
  const o = useSharedValue(1);
  // True from the frame after the first paint (a layout effect's re-render is still before it).
  const painted = useRef(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      painted.current = true;
    });
    return () => cancelAnimationFrame(f);
  }, []);
  useLayoutEffect(() => {
    if (mode === 'short' && run > 0) o.set(withSequence(snap(painted.current ? BRIGHTEN_FROM : 0), tween(1, 'short')));
  }, [mode, run, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <CelebrateContext.Provider value={{ settled }}>
      <Animated.View onTouchStart={settled ? undefined : skip} style={[style, anim]}>
        {children}
      </Animated.View>
    </CelebrateContext.Provider>
  );
}

/** A change on something already drawn: it dips to this and brightens back (never a blink out). */
const BRIGHTEN_FROM = 0.55;

// ── LeafFall: the rare T3 moment (a milestone) ─────────────────────────
// A leaf on the vine's 16 grid, drawn small (10 × 12): a lens with a point.
const FALLING_LEAF = 'M5 11.5C1.2 9 .9 4.6 5 .8c4.1 3.8 3.8 8.2 0 10.7z';

/**
 * A few leaves drift down once (≤ 8, 1.2 s), inside `width` × `height` and
 * nowhere else: the caller gives them an area with no text in it. Transform
 * and opacity only; positions are fixed per leaf (no randomness between
 * renders). Gone at once when the celebration is skipped, under Reduce
 * Motion, or when `run` is false. Decorative: hidden from screen readers.
 */
export function LeafFall({
  run,
  colors,
  width,
  height,
  count = motion.celebrate.leaves,
}: {
  run: boolean;
  colors: string[];
  width: number;
  height: number;
  count?: number;
}) {
  const { reduced } = useMotion();
  const settled = useContext(CelebrateContext).settled;
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setTimeout(() => setDone(true), motion.dur.celebrate);
    return () => clearTimeout(t);
  }, [run]);
  const n = Math.min(count, motion.celebrate.leaves);
  if (!run || reduced || settled || done || width <= 0 || height <= 0) return null;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.noTouch, { position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }]}
    >
      {Array.from({ length: n }, (_, i) => (
        <FallingLeaf key={i} i={i} n={n} width={width} height={height} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

function FallingLeaf({ i, n, width, height, color }: { i: number; n: number; width: number; height: number; color: string }) {
  const p = useSharedValue(0);
  // Fixed per leaf: a start within the first 280 ms, a lane across the area, a turn.
  const delay = (i * 97) % 280;
  const lane = ((i * 3) % n) / Math.max(1, n - 1);
  const x0 = lane * Math.max(0, width - 10);
  const sway = 4 + (i % 3) * 2;
  const r0 = ((i * 53) % 70) - 35;
  const spin = i % 2 ? 40 : -40;
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: motion.dur.celebrate - delay, easing: ease.out, reduceMotion: ReduceMotion.Never })));
    return () => cancelAnimation(p);
  }, [delay, p]);
  const anim = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1,
      transform: [
        { translateX: x0 + sway * Math.sin(t * Math.PI * 1.5 + i) },
        { translateY: -12 + t * (height - 2) },
        { rotate: `${r0 + spin * t}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, anim]}>
      <Svg width={10} height={12} viewBox="0 0 10 12">
        <Path d={FALLING_LEAF} fill={color} />
      </Svg>
    </Animated.View>
  );
}

// ── Growth you can see (M3): what went up since it was last shown ──────
// The navigator's focus at the very first render. Test files that mock
// expo-router without it start unfocused, as the focus effect below decides.
const useFocusedAtMount: () => boolean = (Router as { useIsFocused?: () => boolean }).useIsFocused ?? (() => false);

/**
 * A tab screen's focus as state. It starts from the navigator's own answer,
 * so a screen that mounts in view decides its growth in the first frame
 * (never one frame of the final values, then a snap back to grow).
 */
function useScreenFocusFromEffect(): boolean {
  const atMount = useFocusedAtMount();
  const [focused, setFocused] = useState(atMount);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}
/**
 * Performance (1.15.x): with the navigator's own `useIsFocused`, that IS the
 * answer, live: one re-render per focus change. Holding a copy in state as
 * well re-rendered the whole tab a second time on every switch (both the tab
 * left and the tab opened). The state copy stays only for test stand-ins of
 * expo-router that have no `useIsFocused`.
 */
export const useScreenFocus: () => boolean = (Router as { useIsFocused?: () => boolean }).useIsFocused ?? useScreenFocusFromEffect;

export interface Growth {
  /** Grow now (else show the values as they are). */
  play: boolean;
  /** Where each value starts: what was last shown (or 0 on the first view of the day). */
  from: number[];
  /** Changes each time a growth starts (restart key). */
  run: number;
  /**
   * The growth starts from what the learner last SAW here (a real rise since
   * the last look), not the day's count-up from 0: only then is a "+N" earned.
   */
  since?: boolean;
}

/**
 * Decides whether some numbers on a surface grow, and from where, each time
 * the surface comes into view (`active`: a tab's focus) or the numbers
 * change while it is in view:
 * - they went UP since the learner last saw them → grow from those (a value
 *   that fell meanwhile just shows: nothing ever animates a loss);
 * - else, with `firstOfDay`, the first view of the day grows from 0;
 * - else they simply show (re-entering a screen never replays it).
 * What was shown is remembered across launches (store/seen.ts), per `key`
 * (a surface and its cert: "you:rings:cisa").
 */
export function useGrowth(key: string, values: number[], { active = true, firstOfDay = false }: { active?: boolean; firstOfDay?: boolean } = {}): Growth {
  const sig = values.join(',');
  const [state, setState] = useState<{ at: string; g: Growth }>(() => ({ at: '', g: { play: false, from: values, run: 0 } }));
  // Decided while rendering (React's "adjust state when a prop changes"), so
  // the first frame after focus already starts from the old values. Out of
  // view, nothing plays (a session on top changes the numbers after every
  // answer: no growth may run on a hidden screen).
  const at = `${active ? 1 : 0}|${key}|${sig}`;
  if (state.at !== at) {
    const g = active ? decideGrowth(key, values, firstOfDay, state.g) : { ...state.g, play: false };
    setState({ at, g });
  }
  // Then what is on view is remembered, and the day's first view is used up.
  useEffect(() => {
    if (!active) return;
    useSeen.getState().see(key, sig === '' ? [] : sig.split(',').map(Number));
    claimFirstView(`growth:${key}`);
  }, [active, key, sig]);
  return state.g;
}

function decideGrowth(key: string, now: number[], firstOfDay: boolean, was: Growth): Growth {
  const last = useSeen.getState().values[key];
  const comparable = Boolean(last) && last.length === now.length;
  const rose = comparable && now.some((v, i) => v > last[i]);
  const fell = comparable && now.some((v, i) => v < last[i]);
  if (rose) return { play: true, from: now.map((v, i) => Math.min(v, last[i])), run: was.run + 1, since: true };
  if (firstOfDay && isFirstViewToday(`growth:${key}`) && !fell && now.some((v) => v > 0)) {
    return { play: true, from: now.map(() => 0), run: was.run + 1, since: false };
  }
  return { play: false, from: now, run: was.run, since: false };
}

// ── RollingNumber: an odometer for numerals (M3) ───────────────────────
// Each digit is a clipped column (blank, 0–9, 0–9) that slides on translateY:
// one Text per column, on the UI thread, no re-render per frame and no JS
// timer per frame. Digits finish right to left, 30 ms apart. The final
// characters are laid out (invisibly) first, so the width never jitters
// while it rolls. The rows sit `ROLL.gap` apart (a blank band between two
// digits) inside a window trimmed to the digits' own band, so a frame caught
// mid-roll shows one digit leaving and the next arriving, never two glyphs
// stacked. When the roll has ended it is plain text again.
const BLANK = ' '; // a no-break space: the blank row keeps its height
const COLUMN = [BLANK, ...'01234567890123456789'].join('\n');
/**
 * Odometer geometry, as shares of the font size: the blank gap between rows,
 * and how far the window is trimmed in from the line box (top and bottom),
 * which leaves the numeral's figures (cap height to baseline) whole. `dip`:
 * between two rows the column dims by up to this much (most at half way),
 * so the slivers of a digit leaving and one arriving read as motion, not
 * as stray marks; at every row it is fully opaque again. It adds no flicker:
 * half way, the window already shows mostly the blank gap.
 */
export const ROLL = { gap: 0.42, trim: 0.07, dip: 0.6 };

type Slot = { digit: true; to: number; from: number | null } | { digit: false; ch: string };

/**
 * Lines up `from` under `to`, digit run by digit run from the right, when
 * both have the same shape ("58–66" under "62–70"); otherwise every digit
 * rolls in from blank (a count-up). Non-digits never move.
 */
export function rollSlots(to: string, from?: string | null): Slot[] {
  const shape = (x: string) => x.replace(/\d+/g, '#');
  const toRuns = to.match(/\d+|\D+/g) ?? [];
  const fromRuns = from && shape(from) === shape(to) ? (from.match(/\d+|\D+/g) ?? []) : null;
  const out: Slot[] = [];
  toRuns.forEach((run, r) => {
    if (!/^\d/.test(run)) {
      for (const ch of run) out.push({ digit: false, ch });
      return;
    }
    const prev = fromRuns?.[r] ?? '';
    for (let k = 0; k < run.length; k++) {
      // Right-aligned: the k-th digit from the left of `run` sits over the same place in `prev`.
      const j = prev.length - run.length + k;
      out.push({ digit: true, to: Number(run[k]), from: j >= 0 ? Number(prev[j]) : null });
    }
  });
  return out;
}

/** Column rows for a roll: start and end row (dir 1 rolls up, -1 rolls down). */
export function columnRows(from: number | null, to: number, dir: 1 | -1): [number, number] {
  if (dir === 1) {
    const a = from === null ? 0 : from + 1;
    const b = to + 1;
    return [a, b < a ? b + 10 : b];
  }
  if (from === null) return [to + 1, to + 1];
  const a = from + 11;
  const b = to < from ? to + 11 : to + 1;
  return [a, from === to ? a : b];
}

/**
 * A rolling text with the type style given (any text whose digits should
 * roll; non-digits stay still). Static (plain text, exactly as before)
 * until it plays; then each change rolls when `run` changes, and it is
 * plain text again once that roll has ended (or its celebration was
 * skipped). Screen readers always get the final value: the moving columns
 * are hidden. Reduced: no roll; a changed value brightens in over 120 ms.
 * `step` (the Stepper): every digit that changed rolls one row, from its
 * neighbour, so a wrap (12 → 1, 45 → 00) is one step, never the long way.
 */
export function RollingText({
  value,
  from,
  play,
  run = 0,
  style,
  maxScale,
  color,
  dur = 'grow',
  delay = 0,
  dir = 1,
  stagger = true,
  step = false,
  accessibilityLabel,
}: {
  value: string;
  from?: string | null;
  play: boolean;
  run?: number;
  /** The text style (it must set fontSize and lineHeight). */
  style: TextStyle;
  maxScale: number;
  color: string;
  dur?: MotionDur;
  delay?: number;
  dir?: 1 | -1;
  /** Digits finish right to left, 30 ms apart (off for the small Stepper). */
  stagger?: boolean;
  /** One step per change: each changed digit rolls in from its neighbour. */
  step?: boolean;
  /**
   * Spoken while the digits are columns (they are hidden from screen readers).
   * Leave it out inside a labelled group, which already says the value.
   */
  accessibilityLabel?: string;
}) {
  const { reduced } = useMotion();
  const settled = useContext(CelebrateContext).settled;
  const { fontScale } = useWindowDimensions();
  const scaled = Math.min(Math.max(fontScale, 1), maxScale);
  const fs = (style.fontSize ?? 16) * scaled;
  const lh = (style.lineHeight ?? (style.fontSize ?? 16) * 1.2) * scaled;
  const pad = Math.ceil(fs * 0.2);
  const pitch = Math.round(lh + fs * ROLL.gap);
  const trim = Math.round(fs * ROLL.trim);
  const slots = rollSlots(value, play ? from : value).map((x) =>
    step && x.digit && x.from !== x.to ? { ...x, from: (x.to - dir + 10) % 10 } : x,
  );
  // Each digit's place counted from the right (they finish right to left).
  const digits = slots.filter((x) => x.digit).length;
  const place = slots.map((_, k) => digits - 1 - slots.slice(0, k).filter((x) => x.digit).length);
  // The run whose roll has ended: plain text again, no animated nodes left behind.
  const [ended, setEnded] = useState<number | null>(null);
  const columns = play && !reduced && !settled && ended !== run;
  const total = delay + (stagger ? Math.max(0, digits - 1) * motion.stagger.digit : 0) + motion.dur[dur];
  useEffect(() => {
    if (!columns) return;
    // A one-shot timer for a phase change (the roll is over), not a frame.
    const t = setTimeout(() => setEnded(run), total + motion.stagger.digit);
    return () => clearTimeout(t);
  }, [columns, run, total]);
  const text = [style, { color }];
  if (!columns) {
    // Plain text, read as it is (exactly what a static numeral always was).
    const plain = <Text maxFontSizeMultiplier={maxScale} style={text}>{value}</Text>;
    return reduced ? <Brighten play={play} run={run}>{plain}</Brighten> : plain;
  }
  return (
    // Its own screen-reader stop only when it is given a label; inside a labelled
    // group (a stat, the rings, the readiness row) the group speaks the value, and
    // a second stop would make TalkBack read it twice.
    <View style={styles.rollRow} accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel}>
      {slots.map((slot, k) => {
        if (!slot.digit) {
          return (
            <Text key={k} maxFontSizeMultiplier={maxScale} style={text} importantForAccessibility="no" accessibilityElementsHidden>
              {slot.ch}
            </Text>
          );
        }
        return (
          <DigitColumn
            key={`d${slots.length - k}`}
            to={slot.to}
            from={slot.from}
            play={play}
            run={run}
            dir={dir}
            lh={lh}
            pitch={pitch}
            scaled={scaled}
            trim={trim}
            pad={pad}
            style={text}
            maxScale={maxScale}
            dur={dur}
            delay={delay + (stagger ? place[k] * motion.stagger.digit : 0)}
          />
        );
      })}
    </View>
  );
}

/** Reduced: a changed value (a new `run`) dips to .55 and brightens back over 120 ms. */
function Brighten({ play, run, children }: { play: boolean; run: number; children: ReactNode }) {
  const o = useSharedValue(1);
  const lastRun = useRef(run);
  useLayoutEffect(() => {
    if (!play || run === lastRun.current) return;
    lastRun.current = run;
    o.set(withSequence(snap(BRIGHTEN_FROM), tween(1, 'reduced')));
  }, [play, run, o]);
  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={fade}>{children}</Animated.View>;
}

function DigitColumn({
  to,
  from,
  play,
  run,
  dir,
  lh,
  pitch,
  scaled,
  trim,
  pad,
  style,
  maxScale,
  dur,
  delay,
}: {
  to: number;
  from: number | null;
  play: boolean;
  run: number;
  dir: 1 | -1;
  /** The line box (the window and the column's place in the line). */
  lh: number;
  /** Row to row in the column: the line plus a blank gap. */
  pitch: number;
  /** The text scale already applied to lh and pitch (the system applies it again to a lineHeight). */
  scaled: number;
  /** The window starts this far below the line box's top and ends as far above its bottom. */
  trim: number;
  pad: number;
  style: StyleProp<TextStyle>;
  maxScale: number;
  dur: MotionDur;
  delay: number;
}) {
  const [a, b] = columnRows(play ? from : to, to, dir);
  const y = useSharedValue(-a * pitch);
  // The roll in progress: its restart key, the digit it is heading for, and its row pitch.
  const started = useRef<{ run: number; to: number; pitch: number } | null>(null);
  useLayoutEffect(() => {
    const atFinal = () => {
      cancelAnimation(y);
      y.set(-(to + 1) * pitch);
    };
    // Not playing, or a new value with no new roll: at the final digit now.
    if (!play) return atFinal();
    const was = started.current;
    if (was?.run === run) {
      // The value or the text size changed under the same roll: re-placed at the end.
      if (was.to !== to || was.pitch !== pitch) {
        started.current = { run, to, pitch };
        atFinal();
      }
      return;
    }
    started.current = { run, to, pitch };
    // A digit that doesn't change starts no animation (fewer moving nodes on low-end phones).
    if (a === b) return atFinal();
    y.set(withSequence(snap(-a * pitch), withDelay(delay, tween(-b * pitch, dur))));
  }, [play, run, a, b, to, pitch, delay, dur, y]);
  const dip = ROLL.dip;
  const anim = useAnimatedStyle(() => {
    const rows = -y.value / pitch;
    const between = rows - Math.floor(rows); // 0 on a row, 0.5 half way to the next
    return { opacity: 1 - dip * Math.sin(Math.PI * between), transform: [{ translateY: y.value }] };
  });
  return (
    <View style={{ height: lh }}>
      {/* The final digit, invisible, holds the column's width in the line. */}
      <Text maxFontSizeMultiplier={maxScale} style={[style, styles.hidden]} importantForAccessibility="no" accessibilityElementsHidden>
        {String(to)}
      </Text>
      <View
        style={[styles.clip, { left: -pad, right: -pad, top: trim, height: lh - 2 * trim }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {/* Each row is centred where the line's own text sits: (lh - pitch) / 2 from the line's top. */}
        <Animated.View style={[styles.column, { top: (lh - pitch) / 2 - trim }, anim]}>
          {/* The caller's type style, with its rows spread to the odometer's pitch (geometry, not a new type size). */}
          {/* eslint-disable-next-line no-restricted-syntax */}
          <Text maxFontSizeMultiplier={maxScale} style={[style, styles.center, { lineHeight: pitch / scaled }]}>{COLUMN}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ── ThemeFade: Light ⇄ Dark dissolves instead of flipping (M6) ─────────
/**
 * Mounted once at the root, under the grain. When the theme flips, a veil in
 * the OLD background is drawn in the same frame and then fades out (240 ms;
 * 120 ms reduced: opacity only), so the whole app dissolves into the new
 * theme instead of flashing. It never takes touches and is invisible to
 * screen readers. Cheap: one view, only during a switch.
 */
export function ThemeFade({ isDark, bg }: { isDark: boolean; bg: string }) {
  const { reduced } = useMotion();
  const [last, setLast] = useState({ isDark, bg });
  const [veil, setVeil] = useState<{ color: string; id: number } | null>(null);
  // During render, so the veil is in the very commit that changes the theme.
  if (last.isDark !== isDark) {
    setLast({ isDark, bg });
    setVeil((v) => ({ color: last.bg, id: (v?.id ?? 0) + 1 }));
  } else if (last.bg !== bg) {
    setLast({ isDark, bg });
  }
  // Removed on the next frame (it has been drawn once): its exit animation is the fade.
  useEffect(() => {
    if (!veil) return;
    const f = requestAnimationFrame(() => setVeil(null));
    return () => cancelAnimationFrame(f);
  }, [veil]);
  if (!veil) return null;
  return (
    <Animated.View
      key={veil.id}
      testID="theme-fade"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      exiting={FadeOutAnimation.duration(reduced ? motion.dur.reduced : motion.dur.enter).easing(ease.out).reduceMotion(ReduceMotion.Never)}
      style={[StyleSheet.absoluteFill, styles.noTouch, { backgroundColor: veil.color }]}
    />
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  swapFirst: { flexGrow: 1, justifyContent: 'center' },
  swapSecond: { justifyContent: 'center' },
  rollRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hidden: { opacity: 0 },
  clip: { position: 'absolute', overflow: 'hidden' },
  column: { position: 'absolute', top: 0, left: 0, right: 0 },
  center: { textAlign: 'center' },
});
