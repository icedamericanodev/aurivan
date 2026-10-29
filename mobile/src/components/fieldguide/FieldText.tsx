/**
 * Field Guide text (mobile 1.51, DESIGN_SYSTEM.md §21): the grammar's own type
 * cuts (theme/tokens.ts `fieldType`), so the kit never sets a font itself.
 * Words grow to ×2 with the phone's text size, numerals to ×1.3.
 */
import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { fieldMaxScale, fieldType, type FieldVariant } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export function FieldText({
  v,
  color,
  children,
  style,
  center,
  numberOfLines,
  maxScale,
  accessibilityLabel,
  accessibilityRole,
}: {
  v: FieldVariant;
  color?: string;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  numberOfLines?: number;
  /** A lower cap for text inside a fixed drawing (a chart's labels: its list takes over from ×1.3). */
  maxScale?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'header' | 'text';
}) {
  const { c } = useTheme();
  // Keys, captions and dates are secondary text; names and figures are ink.
  const fallback = v === 'head' || v === 'fig' || v === 'sub' || v === 'small' || v === 'keyNo' ? c.ink2 : c.ink;
  return (
    <Text
      maxFontSizeMultiplier={maxScale ?? fieldMaxScale[v]}
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[fieldType[v], { color: color ?? fallback }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}
