/**
 * Settings building blocks (mobile 1.17, "a tidy Settings"; mobile 1.46, "one page, clear groups"):
 *
 * - SettingsGroup: one category as a flat card on the paper (`raised`, radius 24, no shadow; a 1.5
 *   `line` edge in dark), its mark and `headline` title INSIDE the top of the card over a hairline,
 *   then its rows. The card is never a button. On a category's own screen (Your data, Help and
 *   about) the bar names the group, so the group is bare rows between two hairlines.
 * - SettingsCategoryRow: a "door" to a category's own screen: its mark, its name and a live summary
 *   ("Last backup 6 Oct · back up or move to a new phone"), with a chevron.
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
import { createContext, useContext, useEffect, useRef, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moveFocus } from '../lib/a11y';
import { useKeyboardHeight } from '../lib/useKeyboardShown';
import { LARGE_TEXT, radius, scrimOp, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Bell, BookOpen, ChevronRight, CircleQuestionMark, Flag, ICON_STROKE, ListChecks, MessagesSquare, Palette as PaletteIcon, RefreshCw, ShieldCheck, SproutIcon, UserRound } from './icons';
import { AnimatedPressable, FadeIn, usePressScale } from './motion';
import { Button, ICON_SIZE, RadioRow, T, useFontScale } from './ui';

// ── Categories ────────────────────────────────────────────────────────
/**
 * Mobile 1.46 (the owner, after 1.43: "I can't distinguish clearly the categories to its sub
 * categories"): four layouts and two finalists were shot and reviewed (a critic, a first-time learner,
 * a UX and accessibility review); she chose "one page, flat cards". Every frequent setting stays on
 * the page, each category drawn as its own card; only Your data and Help and about, rarely visited
 * and many-rowed, are doors to their own screens (with the cloud build's Account and Feedback board).
 */
export const SETTINGS_CATS = ['you', 'appearance', 'exam', 'study', 'practice', 'reminders', 'plant', 'account', 'board', 'data', 'help'] as const;
export type SettingsCat = (typeof SETTINGS_CATS)[number];
export const isSettingsCat = (v: unknown): v is SettingsCat => typeof v === 'string' && (SETTINGS_CATS as readonly string[]).includes(v);
/** The categories that are doors to their own screen (settings-section?category=…). */
export const DOOR_CATS: readonly SettingsCat[] = ['account', 'board', 'data', 'help'];
type SettingsIcon = typeof UserRound;
/** Each category's mark (decorative). */
export const CAT_ICON: Record<SettingsCat, SettingsIcon> = {
  you: UserRound,
  appearance: PaletteIcon,
  exam: Flag,
  study: BookOpen,
  practice: ListChecks,
  reminders: Bell,
  plant: SproutIcon,
  account: RefreshCw,
  board: MessagesSquare,
  data: ShieldCheck,
  help: CircleQuestionMark,
};

/** True on a category's own screen (Your data, Help and about): its groups are bare rows, the bar names them. */
export const SettingsSubScreen = createContext(false);

/**
 * A category's mark, in Grove's icon recipe (§7): an `accentText` glyph at stroke 1.75 in a `soft`
 * circle, the same for every category (one colour: the owner's choice). Decorative: hidden from
 * screen readers.
 */
export function SettingsMark({ cat, size }: { cat: SettingsCat; size: number }) {
  const { c } = useTheme();
  const Icon = CAT_ICON[cat];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mark, { width: size, height: size, backgroundColor: c.soft }]}
    >
      <Icon size={size >= 40 ? ICON_SIZE.row : Math.round(size * 0.55)} color={c.accentText} strokeWidth={ICON_STROKE} />
    </View>
  );
}

/**
 * A door to a category's own screen: its mark, its name and what it holds now, in plain words, with
 * any live state (a reply to a report, an update ready, an Undo restore waiting). Spoken as one
 * button, "Your data, Last backup 6 Oct, back up or move to a new phone", hint "Opens Your data".
 */
export function SettingsCategoryRow({
  cat,
  title,
  summary,
  onPress,
  last,
  ref,
}: {
  cat: SettingsCat;
  title: string;
  summary: string;
  onPress: () => void;
  last?: boolean;
  /** For handing screen-reader focus back here after Back. */
  ref?: Ref<View>;
}) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.soft });
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${summary.replace(/ · /g, ', ')}`}
      accessibilityHint={`Opens ${title}`}
      onPress={() => {
        // It leaves for another screen: the pressed tint rests at once (the 1.43 floating-gear fix).
        press.settle();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.catRow, press.style]}
    >
      {press.layer}
      <SettingsMark cat={cat} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="headline">{title}</T>
        <T v="meta">{summary}</T>
      </View>
      <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
      {!last && <View style={[styles.hairline, { left: 40 + space.md, backgroundColor: c.line }]} />}
    </AnimatedPressable>
  );
}

/** The flat card the categories sit on (also the doors' card): never a button, no shadow (Grove §5 rule 8). */
export function SettingsCard({ children }: { children: ReactNode }) {
  const { c, isDark } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.raised, borderColor: isDark ? c.line : 'transparent' }]}>{children}</View>;
}

// ── SettingsGroup ─────────────────────────────────────────────────────
/**
 * Mobile 1.46: each category is one flat card; its mark and title sit inside the top of the card over
 * a hairline (a title above a card could belong to the card before it; inside, it can't). The title
 * is a screen-reader header, so heading-by-heading navigation jumps between categories.
 */
export function SettingsGroup({
  title,
  intro,
  children,
  cat,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  /** Which category it is (its mark). */
  cat?: SettingsCat;
}) {
  const { c } = useTheme();
  const sub = useContext(SettingsSubScreen);
  // A category's own screen: the bar above already names the group.
  if (sub)
    return (
      <View style={{ marginTop: space.lg }}>
        {intro ? <T v="meta" style={{ marginBottom: space.md }}>{intro}</T> : null}
        <View style={[styles.groupRule, { borderColor: c.line }]}>{children}</View>
      </View>
    );
  return (
    <SettingsCard>
      <View accessible accessibilityRole="header" accessibilityLabel={title} style={[styles.cardHead, { borderBottomColor: c.line }]}>
        {cat ? <SettingsMark cat={cat} size={28} /> : null}
        <T v="headline" style={{ flexShrink: 1 }}>{title}</T>
      </View>
      {intro ? <T v="meta" style={{ marginTop: space.sm }}>{intro}</T> : null}
      {children}
    </SettingsCard>
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
/**
 * The sheet's tallest size and its bottom padding. With the keyboard up, the
 * sheet must fit in the space ABOVE it: otherwise a long text (a note) grows
 * the sheet past the top and its header button ("Done") goes off screen. The
 * home-indicator inset is under the keyboard then, so only a small gap stays.
 */
export function sheetLayout(windowHeight: number, insets: { top: number; bottom: number }, keyboard: number): { maxHeight: number; paddingBottom: number } {
  return {
    maxHeight: Math.max(0, windowHeight - insets.top - space.lg - keyboard),
    paddingBottom: keyboard > 0 ? space.sm : insets.bottom,
  };
}

/**
 * The keyboard behaviour: `padding` on BOTH platforms. Android draws edge to
 * edge (the window no longer shrinks for the keyboard), and React Native's
 * `height` mode depends on the first height it measured, so a Modal that opens
 * with the keyboard already moving could end up the wrong size.
 */
export const SHEET_KEYBOARD_BEHAVIOR = 'padding' as const;

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
  const keyboard = useKeyboardHeight();
  const layout = sheetLayout(height, insets, keyboard);
  // The title takes screen-reader focus as the sheet opens.
  const titleRef = useRef<View>(null);
  useEffect(() => {
    if (visible) moveFocus(titleRef, 350);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* A sheet with a text field (Your name) must stay above the keyboard; for the others this does nothing. */}
      <KeyboardAvoidingView style={styles.sheetHost} behavior={SHEET_KEYBOARD_BEHAVIOR}>
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
                // Never taller than the screen below the status bar (and above the keyboard); tall content scrolls.
                maxHeight: layout.maxHeight,
                paddingBottom: layout.paddingBottom,
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
  groupRule: { borderTopWidth: 1, borderBottomWidth: 1, marginTop: space.xs },
  // The value takes what the title leaves, up to half the row, and may wrap to a second line.
  valueRight: { flexShrink: 1, maxWidth: '50%', textAlign: 'right' },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1 },
  // A category's mark: a soft circle.
  mark: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  // A door to a category's own screen (72: mark, name and summary).
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72, paddingVertical: space.md },
  // The flat category card, 16 apart, and its title inside over a hairline (48pt tall at least).
  card: { marginTop: space.lg, borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: space.lg, paddingTop: space.xs },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, paddingVertical: space.sm, borderBottomWidth: 1 },
  sheetHost: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: space.xs },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetContent: { paddingHorizontal: space.gutter, paddingBottom: space.lg },
  sheetFoot: { paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm },
});
