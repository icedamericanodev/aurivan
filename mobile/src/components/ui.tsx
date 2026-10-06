/**
 * Small, reusable building blocks. Every screen is made from these, so
 * changing a colour or a corner radius here updates the whole app.
 */
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { font, radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// ── Screen: safe-area aware page with optional scrolling ──────────────
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const { c } = useTheme();
  const inner = scroll ? (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenPad, { flex: 1 }]}>{children}</View>
  );
  return <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>{inner}</SafeAreaView>;
}

// ── Text with consistent typography ───────────────────────────────────
type Variant = 'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'mono';
const variantStyle: Record<Variant, TextStyle> = {
  hero: { fontFamily: font.bold, fontSize: size.hero, lineHeight: 52 },
  title: { fontFamily: font.bold, fontSize: size.xxl, lineHeight: 34 },
  heading: { fontFamily: font.semibold, fontSize: size.lg, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: size.md, lineHeight: 24 },
  label: { fontFamily: font.semibold, fontSize: size.sm, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: size.xs, lineHeight: 16 },
  mono: { fontFamily: font.mono, fontSize: size.xs, letterSpacing: 0.5 },
};

export function T({
  children,
  v = 'body',
  color,
  style,
  center,
  accessibilityLabel,
  maxFontSizeMultiplier,
  numberOfLines,
}: {
  children: ReactNode;
  v?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  accessibilityLabel?: string;
  /** Cap font scaling where a fixed shape must hold the text (e.g. the ring). */
  maxFontSizeMultiplier?: number;
  numberOfLines?: number;
}) {
  const { c } = useTheme();
  const defaultColor = v === 'caption' || v === 'mono' ? c.muted : c.text;
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      numberOfLines={numberOfLines}
      style={[variantStyle[v], { color: color ?? defaultColor }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────
export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
  accessibilityHint,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** Spoken name when the visible label is a symbol (e.g. "‹"). */
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const bg =
    kind === 'primary' ? c.accentFill : kind === 'secondary' ? c.surface2 : kind === 'danger' ? c.wrongBg : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.wrong : c.accentText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        kind === 'secondary' && { borderWidth: 1, borderColor: c.border },
        style,
      ]}
    >
      <Text style={[variantStyle.label, { color: fg, fontSize: size.md }]}>{label}</Text>
    </Pressable>
  );
}

// ── Card: a raised surface ────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

// ── ProgressBar: 0..1 ─────────────────────────────────────────────────
export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height, borderRadius: height, backgroundColor: c.surface2, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct}%`, height, backgroundColor: color ?? c.accent, borderRadius: height }} />
    </View>
  );
}

// ── Pill: small label chip ────────────────────────────────────────────
// `dot` shows a colour swatch (e.g. a domain colour) next to readable text,
// because domain colours themselves are too light to be used AS text.
export function Pill({
  label,
  color,
  bg,
  dot,
  accessibilityLabel,
}: {
  label: string;
  color?: string;
  bg?: string;
  dot?: string;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? c.surface2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
      {dot && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />}
      <Text accessibilityLabel={accessibilityLabel} style={[variantStyle.mono, { color: color ?? c.text2 }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ── Chip: selectable option in a row ──────────────────────────────────
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentFill : c.surface },
      ]}
    >
      <Text style={[variantStyle.label, { color: selected ? c.onAccent : c.text }]}>{label}</Text>
    </Pressable>
  );
}

// ── Stat tile: big number + caption ───────────────────────────────────
export function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="title" color={color}>{value}</T>
      <T v="caption" center>{label}</T>
    </View>
  );
}

export function Row({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Gap({ h = space.lg }: { h?: number }) {
  return <View style={{ height: h }} />;
}

const styles = StyleSheet.create({
  screenPad: { padding: space.lg, paddingBottom: space.xxl * 2 },
  button: {
    minHeight: 48, // comfortable thumb target (WCAG 2.5.8)
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  chip: {
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
});
