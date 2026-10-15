/**
 * "Fit your plan" building blocks (mobile 1.15, PHASE5.md §2.1–2.8).
 *
 * The same two questions appear in three places, word for word:
 *   - onboarding (step 2 "Where are you starting from?", step 3 "How long can
 *     you study most days?");
 *   - Settings → Your study;
 *   - the fit screen an existing learner opens from Today's one-time card.
 *
 * - ChoiceRow: onboarding's raised choice row (step 1's look), as a radio.
 * - FamiliarityRows: the three rows in a radiogroup. No row is preselected,
 *   so the default never biases the answer.
 * - MinutesControl: the segmented 10 · 20 · 30 · 45 min.
 * - YourStudy: the minutes, the rows and the Exam-focused switch (Settings, fit screen).
 * - FitCard: Today's one quiet card for learners from before 1.15.
 */
import { Pressable, View } from 'react-native';
import { DAILY_MINUTES, FAMILIARITIES, FAMILIARITY_INFO, minutesSpoken, type DailyMinutes, type Familiarity } from '../engine/fit';
import { radius, cardShadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Check } from './icons';
import { Button, RadioRow, Row, Segmented, T, ToggleRow } from './ui';

/** The question, also the radiogroup's spoken name. */
export const FAMILIARITY_QUESTION = 'Where are you starting from?';
export const EXAM_FOCUSED_TITLE = 'Exam-focused plan';
export const EXAM_FOCUSED_SUBTITLE = 'Leads with mocks and your weak spots, and leaves lessons out of Today. Lessons stay in Learn.';

/**
 * Onboarding's raised choice row (selected = 2px ink border + filled ink
 * badge with a check, never green; spec §5). A radio: wrap the rows in a
 * View with accessibilityRole="radiogroup". The whole row is the target (64pt+).
 */
export function ChoiceRow({
  title,
  subtitle,
  selected,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { c, isDark } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? `${title}, ${subtitle}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          minHeight: 64,
          borderRadius: radius.md,
          backgroundColor: c.raised,
          // Selected = 2px ink border; padding shrinks 0.5 so nothing jumps.
          borderWidth: selected ? 2 : 1.5,
          borderColor: selected ? c.ink : isDark ? c.line : 'transparent',
          paddingVertical: selected ? 13.5 : 14,
          paddingHorizontal: selected ? 15.5 : 16,
          marginBottom: 10,
        },
        !isDark && { boxShadow: cardShadow },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: 1.5,
          borderColor: selected ? c.ink : disabled ? c.line : c.control,
          backgroundColor: selected ? c.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <Check size={16} color={c.bg} strokeWidth={2.5} />}
      </View>
      <View style={{ flex: 1 }}>
        <T v="label" color={disabled ? c.muted : c.ink}>{title}</T>
        <T v="meta" color={disabled ? c.muted : c.ink2}>{subtitle}</T>
      </View>
    </Pressable>
  );
}

/**
 * The three familiarity rows. `look`: raised rows (onboarding) or hairline
 * radio rows (Settings, the fit screen). `value` undefined = none chosen.
 */
export function FamiliarityRows({
  value,
  onChange,
  look = 'list',
}: {
  value: Familiarity | undefined;
  onChange: (f: Familiarity) => void;
  look?: 'raised' | 'list';
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={FAMILIARITY_QUESTION}>
      {FAMILIARITIES.map((f, i) =>
        look === 'raised' ? (
          <ChoiceRow key={f} title={FAMILIARITY_INFO[f].title} subtitle={FAMILIARITY_INFO[f].subtitle} selected={value === f} onPress={() => onChange(f)} />
        ) : (
          <RadioRow
            key={f}
            title={FAMILIARITY_INFO[f].title}
            subtitle={FAMILIARITY_INFO[f].subtitle}
            checked={value === f}
            onPress={() => onChange(f)}
            last={i === FAMILIARITIES.length - 1}
          />
        ),
      )}
    </View>
  );
}

/** 10 · 20 · 30 · 45 min, spoken "20 minutes a day". */
export function MinutesControl({ value, onChange }: { value: DailyMinutes; onChange: (m: DailyMinutes) => void }) {
  return (
    <Segmented
      accessibilityLabel="Daily time"
      value={value}
      onChange={onChange}
      options={DAILY_MINUTES.map((m) => ({ value: m, numeral: String(m), label: 'min', spoken: minutesSpoken(m) }))}
    />
  );
}

/**
 * Settings → Your study, and the fit screen: daily time, where you're
 * starting from, and the Exam-focused switch. `keptLine`: "Today's plan
 * stays as it is. Tomorrow's will fit." when a change couldn't rebuild today.
 */
export function YourStudy({
  minutes,
  familiarity,
  examFocused,
  onMinutes,
  onFamiliarity,
  onExamFocused,
  keptLine,
}: {
  minutes: DailyMinutes;
  familiarity: Familiarity | undefined;
  examFocused: boolean;
  onMinutes: (m: DailyMinutes) => void;
  onFamiliarity: (f: Familiarity) => void;
  onExamFocused: (on: boolean) => void;
  keptLine?: string | null;
}) {
  const { c } = useTheme();
  return (
    <View>
      <T v="caption" style={{ marginTop: space.md }}>Daily time</T>
      <View style={{ marginTop: space.sm }}>
        <MinutesControl value={minutes} onChange={onMinutes} />
      </View>
      <T v="meta" style={{ marginTop: space.sm }}>Most days. Your daily plan fits this.</T>
      <T v="caption" style={{ marginTop: space.lg }}>Where you’re starting from</T>
      <FamiliarityRows value={familiarity} onChange={onFamiliarity} />
      <ToggleRow title={EXAM_FOCUSED_TITLE} subtitle={EXAM_FOCUSED_SUBTITLE} value={examFocused} onValueChange={onExamFocused} last />
      {keptLine ? (
        // Android announces it when it appears (iOS: the screen's sayLater; UX review P6).
        <View accessibilityLiveRegion="polite">
          <T v="meta" color={c.accentText} style={{ marginTop: space.xs }}>
            {keptLine}
          </T>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Today's one "Fit your plan" card for learners from before 1.15 (the
 * key-idea recipe: a 3px accent rule, not a card shadow). Below "Also
 * today", on at most 3 separate days; "Not now" hides it for good
 * (engine/fit.ts shouldAskFit).
 */
export function FitCard({ onSetUp, onNotNow }: { onSetUp: () => void; onNotNow: () => void }) {
  const { c } = useTheme();
  const line = 'Tell us how long you have and where you’re starting from, and Today’s plan will fit.';
  return (
    <View testID="fit-card" style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      {/* The words are one stop; each button stays its own. */}
      <View accessible accessibilityLabel={`Fit your plan. ${line}`}>
        <T v="caption" color={c.accentText}>Fit your plan</T>
        <T v="small" style={{ marginTop: space.xs }}>{line}</T>
      </View>
      <Row gap={space.xs} style={{ flexWrap: 'wrap', marginLeft: -space.sm }}>
        <Button kind="ghost" label="Set it up" accessibilityHint="Opens two quick questions about your study time" onPress={onSetUp} />
        <Button kind="ghost" label="Not now" accessibilityLabel="Not now, hide this note. Settings keeps these choices." onPress={onNotNow} />
      </Row>
    </View>
  );
}
