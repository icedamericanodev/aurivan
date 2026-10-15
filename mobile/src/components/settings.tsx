/**
 * Settings building blocks (mobile 1.17, "a tidy Settings"):
 *
 * - SettingsGroup: a titled group of rows (a `Section` headline, an optional
 *   one-line intro, then hairline rows; no card, spec §5).
 * - SettingsRow: one setting. Its CURRENT value sits on the right with a
 *   chevron ("Exam date   8 Jan 2027 ›"); tapping it opens a sheet with the
 *   choices. Rows that DO something at once (Save a backup) have no chevron:
 *   a chevron promises somewhere to go. At large text the value drops under the title instead of
 *   squeezing beside it. Spoken as one button: "Exam date, Friday 8 January 2027".
 * - Sheet: a bottom sheet. The screen behind dims (the `scrim` token at
 *   `scrimOp`) and stays in place, so the learner knows they haven't gone
 *   anywhere. It fades in and its panel rises 8pt (FadeIn); under Reduce
 *   Motion it only fades. No spring, no drag. Closes with its button, a tap
 *   on the dim, Android's Back, or VoiceOver's escape gesture (two-finger Z). Tall content scrolls inside it; a footer
 *   (Save) stays in reach.
 * - ChoiceSheet: a Sheet holding one radio group. Choosing saves at once and
 *   closes it, like a dropdown.
 *
 * Simple on/off settings are NOT rows here: they stay `ToggleRow`s in the group.
 */
import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moveFocus } from '../lib/a11y';
import { LARGE_TEXT, radius, scrimOp, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronRight, ICON_STROKE } from './icons';
import { AnimatedPressable, FadeIn, usePressScale } from './motion';
import { Button, RadioRow, Section, T, useFontScale } from './ui';

// ── SettingsGroup ─────────────────────────────────────────────────────
export function SettingsGroup({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <View>
      <Section title={title} />
      {intro ? <T v="meta" style={{ marginTop: space.xs, marginBottom: space.xs }}>{intro}</T> : null}
      {children}
    </View>
  );
}

// ── SettingsRow ───────────────────────────────────────────────────────
export function SettingsRow({
  title,
  value,
  spokenValue,
  subtitle,
  onPress,
  last,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  ref,
  chevron = true,
}: {
  title: string;
  /** The current value, shown on the right ("8 Jan 2027", "20 min", "System"). */
  value?: string;
  /** The value in full for screen readers ("Friday 8 January 2027"), when the shown one is short. */
  spokenValue?: string;
  /** A line under the title (a status: "Last backup file made: 6 Oct 2026"). */
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
  disabled?: boolean;
  /** Replaces the spoken "title, value, subtitle" (e.g. a short, stable name for an action). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** For handing screen-reader focus back here when its sheet closes. */
  ref?: Ref<View>;
  /** false for an action row (it acts at once; it doesn't open anything to choose from). */
  chevron?: boolean;
}) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const press = usePressScale({ scale: 1, tint: c.soft });
  const label = accessibilityLabel ?? [title, spokenValue ?? value, subtitle].filter(Boolean).join(', ');
  const valueText = value ? (
    <T v="body" color={c.ink2} style={large ? undefined : styles.valueRight}>
      {value}
    </T>
  ) : null;
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled ? { disabled } : undefined}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.row, press.style]}
    >
      {press.layer}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label" color={disabled ? c.muted : undefined}>{title}</T>
        {subtitle ? <T v="meta">{subtitle}</T> : null}
        {/* Large text: the value reads under the title, never squeezed into a narrow column. */}
        {large ? valueText : null}
      </View>
      {large ? null : valueText}
      {chevron ? <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} /> : null}
      {!last && <View style={[styles.hairline, { backgroundColor: c.line }]} />}
    </AnimatedPressable>
  );
}

// ── Sheet: a bottom sheet over a dimmed screen ────────────────────────
export function Sheet({
  visible,
  onClose,
  title,
  intro,
  children,
  footer,
  closeLabel = 'Close',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title. */
  intro?: ReactNode;
  children: ReactNode;
  /** Stays under the scrolling content, in reach (e.g. Save). */
  footer?: ReactNode;
  /** The header button: "Close" for choices that save as you tap, "Cancel" when there is a Save. */
  closeLabel?: string;
}) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The title takes screen-reader focus as the sheet opens.
  const titleRef = useRef<View>(null);
  useEffect(() => {
    if (visible) moveFocus(titleRef, 350);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* A sheet with a text field (Your name) must stay above the keyboard; for the others this does nothing. */}
      <KeyboardAvoidingView style={styles.sheetHost} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* The dim: a tap closes the sheet. Hidden from screen readers (the header button closes it). */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: isDark ? scrimOp.dark : scrimOp.light }]}
        />
        <FadeIn>
          <View
            accessibilityViewIsModal
            // VoiceOver's escape gesture closes it, like the header button.
            onAccessibilityEscape={onClose}
            style={[
              styles.sheet,
              {
                backgroundColor: c.raised2,
                // Never taller than the screen below the status bar; tall content scrolls.
                maxHeight: height - insets.top - space.lg,
                paddingBottom: insets.bottom,
              },
              // Dark: no shadow, so a hairline edge separates the sheet from the dim (spec §4).
              isDark && { borderWidth: 1.5, borderBottomWidth: 0, borderColor: c.line },
            ]}
          >
            <View style={styles.sheetHead}>
              <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={title} style={{ flex: 1, minWidth: 0 }}>
                <T v="hero">{title}</T>
              </View>
              <Button kind="ghost" label={closeLabel} accessibilityLabel={`${closeLabel}, ${title}`} onPress={onClose} style={{ marginRight: -space.sm }} />
            </View>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              {typeof intro === 'string' ? <T v="meta" style={{ marginBottom: space.sm }}>{intro}</T> : intro}
              {children}
            </ScrollView>
            {footer ? <View style={styles.sheetFoot}>{footer}</View> : null}
          </View>
        </FadeIn>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── ChoiceSheet: one radio group; a choice saves and closes ───────────
export interface Choice<V extends string | number> {
  value: V;
  title: string;
  subtitle?: string;
  badge?: string;
  disabled?: boolean;
}

export function ChoiceSheet<V extends string | number>({
  visible,
  onClose,
  title,
  intro,
  groupLabel,
  options,
  value,
  onChange,
  after,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  /** The radio group's spoken name (defaults to the title). */
  groupLabel?: string;
  options: Choice<V>[];
  /** null = nothing chosen yet (none is checked). */
  value: V | null;
  onChange: (v: V) => void;
  /** A quiet line under the choices. */
  after?: ReactNode;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} intro={intro}>
      <View accessibilityRole="radiogroup" accessibilityLabel={groupLabel ?? title}>
        {options.map((o, i) => (
          <RadioRow
            key={String(o.value)}
            title={o.title}
            subtitle={o.subtitle}
            badge={o.badge}
            disabled={o.disabled}
            checked={o.value === value}
            onPress={() => {
              onChange(o.value);
              onClose();
            }}
            last={i === options.length - 1}
          />
        ))}
      </View>
      {after}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // 56pt: above the 48pt minimum, a little tighter than a 64pt list row so a group reads as one block.
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.md },
  // The value takes what the title leaves, up to half the row, and may wrap to a second line.
  valueRight: { flexShrink: 1, maxWidth: '50%', textAlign: 'right' },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1 },
  sheetHost: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: space.xs },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetContent: { paddingHorizontal: space.gutter, paddingBottom: space.lg },
  sheetFoot: { paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm },
});
