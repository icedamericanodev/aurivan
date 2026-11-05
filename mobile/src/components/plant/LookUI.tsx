/**
 * The plant's look pieces (mobile 1.14, Phase 4b "Dress and Alive"):
 * - KeepsakeIcon: one keepsake drawn alone (the Look screen's rows);
 * - LookOption: one choice in a Look section, a radio or (keepsakes) a
 *   checkbox. A locked choice says how to open it in plain words, never as a
 *   guilt line, and is never a counter ("n of m").
 *
 * Decorative art is hidden from screen readers; each option is one stop
 * with its name, state and line.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Check } from '../icons';
import { AnimatedPressable, StateLayer, usePressScale } from '../motion';
import { T } from '../ui';
export { KeepsakeIcon, PlanterIcon } from './Keepsake';

/** A small colour swatch (a colourway's three tones), decorative. */
export function Swatch({ tones, size = 28 }: { tones: readonly string[]; size?: number }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 28 28">
        <Circle cx={14} cy={14} r={13} fill={tones[0]} />
        <Path d="M14 1a13 13 0 0 1 0 26z" fill={tones[1]} />
        <Circle cx={10} cy={10} r={4} fill={tones[2]} />
      </Svg>
    </View>
  );
}

export interface LookOptionProps {
  name: string;
  /** Unlocked: what it is (its caption or a keepsake's skill line). Locked: how to open it. */
  line: string;
  art?: ReactNode;
  selected: boolean;
  locked: boolean;
  /** Keepsakes are a multi-choice (checkbox); every other slot is one choice (radio). */
  multi?: boolean;
  /** Keepsakes: three are shown already, so this one waits until one is put away. */
  full?: boolean;
  onPress: () => void;
  testID?: string;
  /** Not the last row of its group: a 1px divider under it, inset past the thumbnail. */
  divider?: boolean;
}

/** The thumbnail box on every Look row (PHASE4B 4.2). */
export const LOOK_THUMB = 48;

/**
 * One choice, as a row (Grove Phase 4b, PHASE4B 4.2): a 48pt art thumbnail, the name (`label`)
 * over its line (`meta`), and the mark at the right: a radio (a filled ink dot when chosen) or, for
 * keepsakes, a checkbox (an ink tick). Selected is INK, never green (PHASE4 5). An item not open yet
 * shows a dashed mount instead of its art, is disabled and says how to open it. With three keepsakes
 * on show, the others are disabled and keep just their line; the hint says "Put one away to show this".
 */
export function LookOption({ name, line, art, selected, locked, multi = false, full = false, onPress, testID, divider = false }: LookOptionProps) {
  const { c, g } = useTheme();
  const waiting = multi && full && !selected && !locked;
  const disabled = locked || waiting;
  const press = usePressScale({ scale: 1, tint: disabled ? undefined : c.soft, tintRadius: radius.md });
  const state = locked ? 'Not open yet.' : '';
  return (
    <AnimatedPressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${name}.${state ? ` ${state}` : ''}${line ? ` ${line}` : ''}`}
      accessibilityHint={waiting ? 'Put one away to show this' : undefined}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : press.onPressIn}
      onPressOut={disabled ? undefined : press.onPressOut}
      testID={testID}
      style={[{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }, press.style]}
    >
      {press.layer}
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          { width: LOOK_THUMB, height: LOOK_THUMB, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
          // Not open yet: a pencilled, dashed mount (leafLine), never the art.
          locked ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: g.leafLine } : { backgroundColor: c.soft },
        ]}
      >
        {locked ? null : <View style={{ opacity: waiting ? 0.5 : 1 }}>{art}</View>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label" color={disabled ? c.ink2 : c.ink}>
          {name}
        </T>
        {line ? (
          <T v="meta" style={{ marginTop: 2 }}>
            {line}
          </T>
        ) : null}
      </View>
      {locked ? null : multi ? (
        // A checkbox: the control outline, an ink fill and a paper tick when on show (cross-fades in).
        <View style={[styles.box, { borderColor: waiting ? c.line : c.control }]}>
          <StateLayer on={selected} style={[styles.boxFill, { backgroundColor: c.ink }]}>
            <Check size={14} color={c.bg} strokeWidth={2.5} />
          </StateLayer>
        </View>
      ) : (
        // A radio: the control ring, and the ink ring and dot when chosen (shape, not colour alone).
        <View style={[styles.radio, { borderColor: c.control }]}>
          <StateLayer on={selected} style={[styles.radioOn, { borderColor: c.ink }]} />
          <StateLayer on={selected} style={[styles.radioDot, { backgroundColor: c.ink }]} />
        </View>
      )}
      {divider ? <View style={{ position: 'absolute', left: LOOK_THUMB + space.md, right: 0, bottom: 0, height: 1, backgroundColor: c.line }} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  radioOn: { top: -2, left: -2, right: -2, bottom: -2, borderRadius: 11, borderWidth: 2 },
  radioDot: { top: 4, left: 4, right: undefined, bottom: undefined, width: 10, height: 10, borderRadius: 5 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2 },
  boxFill: { top: -2, left: -2, right: -2, bottom: -2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
