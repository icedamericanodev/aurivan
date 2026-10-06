/**
 * Small, reusable building blocks. Every screen is made from these, so
 * changing a colour or a corner radius here updates the whole app.
 *
 * This is the ONLY component file allowed to set fontSize / lineHeight /
 * fontFamily (via the `type` map in theme/tokens.ts). ESLint enforces it.
 * Spec: docs/mobile/DESIGN_SYSTEM.md ("Forest").
 */
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { domainColor } from '../content/certifications';
import type { DomainInfo } from '../content/types';
import { font, radius, space, type, type TypeVariant } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Icon sizes: inline with text, in rows/tiles, and in the tab bar/header. */
export const ICON_SIZE = { inline: 16, row: 20, bar: 24 } as const;

/**
 * Tab-bar label. The navigator's default is 10px with no line height, which
 * clips descenders ("y" in Journey) in our font; 11/14 fits the bar.
 */
export const tabLabelStyle: TextStyle = { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 };
/** Tab-bar height above the safe-area inset (navigator default is 49, too tight for the label). */
export const TAB_BAR_HEIGHT = 56;

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

// ── Text: the six variants of the type scale ──────────────────────────
// display · title · body · label · meta · eyebrow (see theme/tokens.ts).
export type Variant = TypeVariant;

export function T({
  children,
  v = 'body',
  color,
  style,
  center,
  num,
  accessibilityLabel,
  maxFontSizeMultiplier,
  numberOfLines,
}: {
  children: ReactNode;
  v?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  /** Tabular figures, so numbers (%, timers, "1/3") don't jiggle as they change. */
  num?: boolean;
  accessibilityLabel?: string;
  /** Cap font scaling where a fixed shape must hold the text (e.g. the ring). */
  maxFontSizeMultiplier?: number;
  numberOfLines?: number;
}) {
  const { c } = useTheme();
  // Eyebrows and meta lines are secondary text by default.
  const defaultColor = v === 'eyebrow' || v === 'meta' ? c.text2 : c.text;
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      numberOfLines={numberOfLines}
      style={[
        type[v],
        { color: color ?? defaultColor },
        num && styles.num,
        center && { textAlign: 'center' },
        style,
      ]}
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
  // Each kind = background · border · label colour. Disabled is its own
  // look (surface2 + muted) rather than a faded copy of the button.
  const look = disabled
    ? { bg: c.surface2, border: c.surface2, fg: c.muted }
    : {
        primary: { bg: c.accentFill, border: c.accentFill, fg: c.onAccent },
        secondary: { bg: c.surface, border: c.borderStrong, fg: c.text },
        ghost: { bg: 'transparent', border: 'transparent', fg: c.accentText },
        danger: { bg: c.wrongBg, border: c.wrongBg, fg: c.wrong },
      }[kind];
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
        { backgroundColor: look.bg, borderColor: look.border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[type.label, { color: look.fg }]}>{label}</Text>
    </Pressable>
  );
}

// ── Card: a flat surface (no shadow) ──────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  emphasis,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** A 1px brand-green border: "this card matters most right now". */
  emphasis?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: emphasis ? c.accent : c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { backgroundColor: c.surface2 }]}
    >
      {children}
    </Pressable>
  );
}

// ── ProgressBar: 0..1 ─────────────────────────────────────────────────
export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const r = Math.min(height, radius.sm);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height, borderRadius: r, backgroundColor: c.surface2, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct}%`, height, backgroundColor: color ?? c.accent, borderRadius: r }} />
    </View>
  );
}

// ── Domain dot: a small swatch in the domain's tone ───────────────────
// Domains 6+ (e.g. CISSP) reuse the 5 tones, drawn hollow so they stay distinct.
export function DomainDot({ domain }: { domain: DomainInfo }) {
  const { isDark } = useTheme();
  const color = domainColor(domain.tone, isDark);
  const hollow = Number(domain.id) > 5;
  return (
    <View
      style={[
        styles.dot,
        hollow ? { borderWidth: 2, borderColor: color } : { backgroundColor: color },
      ]}
    />
  );
}

// ── Pill: small, non-interactive label ────────────────────────────────
// Sentence case. `domain` shows the domain's colour as a dot next to
// readable text, because domain tones are never used AS text.
export function Pill({
  label,
  color,
  bg,
  domain,
  accessibilityLabel,
}: {
  label: string;
  color?: string;
  bg?: string;
  domain?: DomainInfo;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? c.surface2 }]}>
      {domain && <DomainDot domain={domain} />}
      <Text accessibilityLabel={accessibilityLabel} style={[type.meta, styles.semibold, { color: color ?? c.text2 }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Chip: selectable option in a row ──────────────────────────────────
// Selected = ink fill + surface label + ✓ (shape AND colour, never green).
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label} // the ✓ is visual; "selected" state is spoken
      onPress={onPress}
      hitSlop={2} // 44px chip + 2px each side = 48px touch target
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? c.text : c.borderStrong,
          backgroundColor: selected ? c.text : pressed ? c.surface2 : c.surface,
        },
      ]}
    >
      <Text style={[type.meta, styles.semibold, { color: selected ? c.surface : c.text }]}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}

// ── Toggle: an on/off switch in our colours ──────────────────────────
// Wraps the platform Switch so its thumb never falls back to a stock
// teal/blue. On the web build the "on" thumb needs `activeThumbColor`.
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const { c } = useTheme();
  const webOnly = Platform.OS === 'web' ? ({ activeThumbColor: c.onAccent } as object) : {};
  return (
    <Switch
      accessibilityLabel={accessibilityLabel}
      value={value}
      disabled={disabled}
      onValueChange={onValueChange}
      thumbColor={c.onAccent}
      trackColor={{ true: c.accentFill, false: c.muted }}
      ios_backgroundColor={c.muted}
      {...webOnly}
    />
  );
}

// ── IconTile: 40×40 tile that holds a row/tile-size icon ──────────────
export function IconTile({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={[styles.iconTile, { backgroundColor: c.surface2 }]}>{children}</View>;
}

// ── Stat tile: big number + caption ───────────────────────────────────
export function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T v="display" num color={color}>{value}</T>
      <T v="meta" center>{label}</T>
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
  screenPad: { padding: space.lg, paddingBottom: space.xxxl * 2 },
  num: { fontVariant: ['tabular-nums'] },
  semibold: { fontFamily: font.semibold },
  button: {
    minHeight: 52, // comfortable thumb target (WCAG 2.5.8)
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  chip: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
