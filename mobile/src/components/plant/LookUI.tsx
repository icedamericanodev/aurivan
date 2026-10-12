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
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { radius, raisedShadow, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from '../ui';
export { KeepsakeIcon } from './Keepsake';

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

export function LookOption({ name, line, art, selected, locked, multi = false, full = false, row, width, onPress, testID }: LookOptionProps) {
  const { c, isDark } = useTheme();
  const disabled = locked || (multi && full && !selected);
  const state = locked ? 'Not open yet.' : '';
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${name}.${state ? ` ${state}` : ''}${line ? ` ${line}` : ''}${multi && full && !selected && !locked ? ' Put one away to show this.' : ''}`}
      onPress={disabled ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          width: row ? undefined : width,
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          borderRadius: radius.md,
          backgroundColor: locked ? 'transparent' : c.raised,
          // Selected = 2px ink border (shape, not colour alone); a locked one is a dashed outline.
          borderWidth: selected ? 2 : 1.5,
          borderStyle: locked ? 'dashed' : 'solid',
          borderColor: selected ? c.ink : locked ? c.control : isDark ? c.line : 'transparent',
          paddingVertical: selected ? space.sm - 0.5 : space.sm,
          paddingHorizontal: selected ? space.md - 0.5 : space.md,
        },
        !isDark && !locked && raisedShadow,
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      {art ? <View style={{ opacity: locked ? 0.5 : 1 }}>{art}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label" color={locked ? c.ink2 : c.ink}>
          {name}
        </T>
        {line ? (
          <T v="meta" style={{ marginTop: 2 }}>
            {line}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}
