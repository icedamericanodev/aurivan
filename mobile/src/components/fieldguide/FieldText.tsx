/**
 * Field Guide text (mobile 1.51, DESIGN_SYSTEM.md §21): the grammar's own type
 * cuts (theme/tokens.ts `fieldType`), so the kit never sets a font itself.
 * Words grow to ×2 with the phone's text size, numerals to ×1.3.
 * Type scale (design-notes/grove/TYPE_SCALE.md): the cuts the scale retired (value, verdict,
 * recap, option, best, sub, keyNo, why) draw their role from theme/grove.ts `fieldRole`.
 */
import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { fieldRole } from '../../theme/grove';
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
  // Keys, captions, dates, a recapped question and "Why not B" are secondary text; names and figures are ink.
  // The scale's role for this cut when it has one, else the guide's own cut (charts, keys, figures).
  const cut = fieldRole[v];
  const fallback = v === 'head' || v === 'fig' || v === 'sub' || v === 'small' || v === 'keyNo' || v === 'recap' || v === 'why' ? c.ink2 : c.ink;
  return (
    <Text
      maxFontSizeMultiplier={maxScale ?? cut?.max ?? fieldMaxScale[v]}
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[cut?.style ?? fieldType[v], { color: color ?? fallback }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}
