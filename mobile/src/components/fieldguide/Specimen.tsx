/**
 * Specimen (Field Guide §21.2): one badge, pressed onto a herbarium sheet.
 * The badge's REAL emblem (content/badgeArt.json), only its frame changes:
 *
 * - Earned: the emblem in faded botanical inks (`fieldInk.pressed`), held by
 *   two strips of paper tape, and a label: its name, the tier in words with
 *   filled pips ("●●○ Lichen · 75 recalls"), and "Pressed 3 Oct".
 * - Not yet: a pencilled dashed mount, the emblem in one faint tone
 *   (decorative: the words carry it), and how close it is.
 * - Gated: a dotted, empty mount and "Opens when…" in italics. Never a padlock.
 *
 * The whole specimen is ONE button, spoken in full (name, tier, state, rule,
 * progress or date, set); the art is hidden. At least 48pt to the finger.
 *
 * Motion: a newly earned specimen is pressed flat (1.06 → 1, `enter`, no
 * bounce), then its tape lands (a fade). Reduce Motion: it is simply there.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { badgeMetal, fieldInk } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { EmblemArt } from '../medallion';
import { AnimatedPressable, tween, useMotion, usePressScale } from '../motion';
import { FieldText } from './FieldText';

export type SpecimenState = 'earned' | 'open' | 'gated';

/** The emblem's mount: the pressed emblem and its tape, or the pencilled outline. Decorative. */
export function SpecimenMount({
  badge,
  tier,
  emblem,
  state,
  size,
  press,
}: {
  badge: string;
  tier?: number;
  emblem?: string;
  state: SpecimenState;
  size: number;
  /** Newly earned: pressed in after this many ms. */
  press?: number;
}) {
  const { c, isDark } = useTheme();
  const ink = fieldInk[isDark ? 'dark' : 'light'];
  const { reduced } = useMotion();
  const moving = press !== undefined && !reduced && state === 'earned';
  const flat = useSharedValue(moving ? 0 : 1);
  const tape = useSharedValue(moving ? 0 : 1);
  useEffect(() => {
    if (!moving) return;
    flat.set(withDelay(press ?? 0, tween(1, 'enter')));
    tape.set(withDelay((press ?? 0) + 200, tween(1, 'quick')));
  }, [moving, press, flat, tape]);
  const flatStyle = useAnimatedStyle(() => ({ opacity: flat.value, transform: [{ scale: 1.06 - 0.06 * flat.value }] }));
  const tapeStyle = useAnimatedStyle(() => ({ opacity: tape.value }));
  const box = size + 12;
  const mono = (col: string) => ({ E1: col, E2: col, E3: col, D2: col, D3: col, L3: col, K: c.raised2 });
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: box,
        height: box,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        borderWidth: state === 'earned' ? 0 : 1.5,
        borderStyle: state === 'gated' ? 'dotted' : 'dashed',
        borderColor: c.control,
      }}
    >
      {state === 'earned' ? (
        <>
          <Animated.View style={flatStyle}>
            <EmblemArt badge={badge} tier={tier} emblem={emblem} palette={ink.pressed} size={size} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: box * 0.12, top: box * 0.68, width: 22, height: 8, backgroundColor: ink.tape, transform: [{ rotate: '-14deg' }] }, tapeStyle]} />
          <Animated.View style={[{ position: 'absolute', left: box * 0.6, top: box * 0.08, width: 18, height: 8, backgroundColor: ink.tape, transform: [{ rotate: '22deg' }] }, tapeStyle]} />
        </>
      ) : state === 'open' ? (
        <EmblemArt badge={badge} tier={tier} emblem={emblem} palette={mono(c.control)} size={size} opacity={0.42} />
      ) : null}
    </View>
  );
}

/** A tier's pips and name: "●●○ Lichen · 75 recalls". The metal's name is always printed. */
export function TierLine({ tier, tiers = 3, earned, caption }: { tier: number; tiers?: number; earned: boolean; caption?: string }) {
  const { isDark } = useTheme();
  const metal = badgeMetal[tier as 1 | 2 | 3];
  if (!metal) return null;
  const pip = isDark ? metal.mid : metal.edge;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={tiers * 6.5 + 1} height={8}>
          {Array.from({ length: tiers }, (_, i) => (
            <Circle key={i} cx={3.5 + i * 6.5} cy={4} r={2.6} fill={earned && i < tier ? pip : 'none'} stroke={pip} strokeWidth={1} />
          ))}
        </Svg>
      </View>
      <FieldText v="small">{caption ? `${metal.name} · ${caption}` : metal.name}</FieldText>
    </View>
  );
}

export function Specimen({
  badge,
  tier,
  tiers,
  emblem,
  state,
  name,
  tierCaption,
  line,
  width,
  size,
  offset = 0,
  press,
  onPress,
  spoken,
  hint = 'Opens its details',
  extra,
}: {
  badge: string;
  tier?: number;
  tiers?: number;
  emblem?: string;
  state: SpecimenState;
  /** The label's name ("First Foothold", "IS Operations"). */
  name: string;
  /** Inside a ladder: the tier's own words ("10 days"). */
  tierCaption?: string;
  /** "Pressed 3 Oct", "7 of 10 topics", or the gate ("Opens after 3 weeks of first tries"). */
  line?: string;
  width: number;
  /** The emblem's size; a sheet varies it a little, as pressed things are. */
  size: number;
  /** A small drop (pt), so a sheet's specimens never sit on one ruled line. */
  offset?: number;
  press?: number;
  onPress: () => void;
  spoken: string;
  hint?: string;
  /** One more line under the label (a domain's weight). */
  extra?: React.ReactNode;
}) {
  const { c } = useTheme();
  const touch = usePressScale({});
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      onPress={onPress}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ width, alignItems: 'center', paddingTop: 6 + offset, paddingBottom: 6, minHeight: 48 }, touch.style]}
    >
      <SpecimenMount badge={badge} tier={tier} emblem={emblem} state={state} size={size} press={press} />
      <FieldText v="name" center style={{ marginTop: 6 }}>{name}</FieldText>
      {tier ? <TierLine tier={tier} tiers={tiers} earned={state === 'earned'} caption={tierCaption} /> : null}
      {extra}
      {line ? (
        <FieldText v={state === 'gated' ? 'fig' : 'small'} center color={state === 'earned' ? c.accentText : c.ink2}>
          {line}
        </FieldText>
      ) : null}
    </AnimatedPressable>
  );
}
