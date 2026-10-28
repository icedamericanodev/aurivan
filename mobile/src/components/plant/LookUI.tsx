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
import { Check, ICON_STROKE } from '../icons';
import { AnimatedPressable, StateLayer, usePressScale } from '../motion';
import { cardLift, ICON_SIZE, T } from '../ui';
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
  /** Unlocked: what it is (a keepsake's skill line). Locked: how to open it. */
  line: string;
  art?: ReactNode;
  selected: boolean;
  locked: boolean;
  /** Keepsakes are a multi-choice (checkbox); every other slot is one choice (radio). */
  multi?: boolean;
  /** Keepsakes: three are shown already, so this one waits until one is put away. */
  full?: boolean;
  /** One column of full-width rows (large text), else a tile in a grid. */
  row: boolean;
  width?: number;
  onPress: () => void;
  testID?: string;
}

/**
 * One choice. Selected = a 2px ink ring that cross-fades in (an always-
 * mounted StateLayer, so nothing reflows; UX review P11); a shown keepsake
 * also gets a ✓. Press: the soft tint fades in under the row. Locked: a
 * dashed outline and how to open it. A keepsake that can't be shown while
 * three are on show is drawn muted (UX review H3), and says why.
 */
export function LookOption({ name, line, art, selected, locked, multi = false, full = false, row, width, onPress, testID }: LookOptionProps) {
  const { c, isDark } = useTheme();
  const waiting = multi && full && !selected && !locked;
  const disabled = locked || waiting;
  const press = usePressScale({ scale: 1, tint: disabled ? undefined : c.soft, tintRadius: radius.md });
  const state = locked ? 'Not open yet.' : '';
  return (
    <AnimatedPressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${name}.${state ? ` ${state}` : ''}${line ? ` ${line}` : ''}${waiting ? ' Put one away to show this.' : ''}`}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : press.onPressIn}
      onPressOut={disabled ? undefined : press.onPressOut}
      testID={testID}
      style={[
        {
          width: row ? undefined : width,
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          borderRadius: radius.md,
          backgroundColor: locked ? 'transparent' : c.raised,
          // The idle outline never changes width, so selecting never moves a thing.
          borderWidth: 1.5,
          borderStyle: locked ? 'dashed' : 'solid',
          borderColor: locked ? c.control : isDark ? c.line : 'transparent',
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
        },
        !locked && cardLift(isDark),
        press.style,
      ]}
    >
      {press.layer}
      {/* The selection ring: 2px ink over the idle outline, cross-fading (shape, not colour alone). */}
      <StateLayer on={selected} style={[styles.ring, { borderColor: c.ink }]} />
      {art ? <View style={{ opacity: locked || waiting ? 0.5 : 1 }}>{art}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label" color={locked || waiting ? c.ink2 : c.ink}>
          {name}
        </T>
        {line ? (
          <T v="meta" style={{ marginTop: 2 }}>
            {line}
          </T>
        ) : null}
      </View>
      {multi && !locked ? (
        // A shown keepsake's ✓ fades in with its ring.
        <View style={{ width: ICON_SIZE.inline, height: ICON_SIZE.inline }}>
          <StateLayer on={selected}>
            <Check size={ICON_SIZE.inline} color={c.ink} strokeWidth={ICON_STROKE} />
          </StateLayer>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Drawn over the 1.5pt idle outline (inset −1.5), so the ring sits exactly on it.
  ring: { top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, borderRadius: radius.md + 1.5, borderWidth: 2 },
});
