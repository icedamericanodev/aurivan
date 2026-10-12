/**
 * The exam-date calendar (mobile 1.17): Settings → Exam date, and the
 * "Pick the exact date" button on onboarding's date step.
 *
 * Pure React Native (no date-picker library, so it ships over the air):
 * - quick choices first ("In 1 month", "In 2 months", "In 3 months", "Not
 *   sure yet"), for the learner who only has a rough idea;
 * - then a month grid, Monday first, with previous and next month buttons.
 *   Today has a ring; the chosen day is filled `ink` (shape, not colour
 *   alone). Days before today, and after two years from now, can't be
 *   chosen;
 * - one line says what is chosen ("Fri 8 Jan 2027 · In 88 days");
 * - Save. Nothing changes until Save; Cancel (the header) or the dim closes.
 *   "Not sure yet" is the way to clear the date (one control, not two).
 *
 * Accessibility: each day is a button named with its full date ("Friday 8
 * January 2027", plus ", today"), with its selected / disabled state; a new
 * month is announced; the column headings are hidden (each day says its own
 * weekday). Cells are sized from the screen's width, never below 44pt, and
 * the numbers stop growing at ×1.5 so they never clip inside a cell (the
 * spoken name carries the full date at any text size).
 */
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  addMonths,
  calendarBounds,
  compareMonths,
  inBounds,
  monthGrid,
  monthLabel,
  monthOf,
  openingMonth,
  shortDayLabel,
  spokenDate,
  untilLabel,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  type YearMonth,
} from '../engine/calendar';
import { dateInMonths, EXAM_DATE_PRESETS, presetIndexFor } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { sayLater } from '../lib/a11y';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronLeft, ChevronRight, ICON_STROKE } from './icons';
import { AnimatedPressable, FadeIn, StateLayer, usePressScale } from './motion';
import { Sheet } from './settings';
import { Button, Chip, ICON_SIZE, IconButton, T } from './ui';

/** Day numbers stop growing here: they sit in a cell whose size comes from the screen's width. */
const DAY_TEXT_CAP = 1.5;
/** Never a smaller touch target than this. */
const MIN_CELL = 44;

/** "Fri 8 Jan 2027 · In 88 days", or the no-date line. */
export function chosenLine(date: string | undefined, today: string): string {
  if (!date) return 'No date yet. Your plan works without one.';
  const until = untilLabel(date, today);
  return until ? `${shortDayLabel(date)} · ${until}` : shortDayLabel(date);
}

export function CalendarSheet({
  visible,
  value,
  now,
  onSave,
  onClose,
}: {
  visible: boolean;
  /** The saved exam date ("YYYY-MM-DD"), or undefined for none. */
  value: string | undefined;
  /** "Now", read once by the caller (render stays pure). */
  now: number;
  onSave: (date: string | undefined) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState<YearMonth>(() => openingMonth(value, now));
  // Each time the sheet opens it starts from what is saved (React's "adjust state when a prop changes").
  const [wasOpen, setWasOpen] = useState(visible);
  if (wasOpen !== visible) {
    setWasOpen(visible);
    if (visible) {
      setDraft(value);
      setShown(openingMonth(value, now));
    }
  }
  const { c } = useTheme();
  const today = dayKey(now);
  const bounds = calendarBounds(now);
  const preset = presetIndexFor(draft, now);

  const choose = (date: string | undefined) => {
    setDraft(date);
    if (date) setShown(monthOf(date));
    sayLater(date ? `Chosen: ${spokenDate(date)}` : 'No date chosen');
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Exam date"
      closeLabel="Cancel"
      intro="A rough date is fine. You can change it any time."
      footer={
        <>
          {/* Capped at ×1.5 so the month grid keeps room above the footer at large text; the label says it in full. */}
          <T v="small" center color={c.ink} maxFontSizeMultiplier={DAY_TEXT_CAP} accessibilityLabel={draft ? `Chosen: ${spokenDate(draft)}. ${untilLabel(draft, today) ?? ''}` : chosenLine(undefined, today)}>
            {chosenLine(draft, today)}
          </T>
          <Button label="Save" accessibilityHint="Saves this exam date. Your plan follows it." onPress={() => onSave(draft)} />
        </>
      }
    >
      <T v="caption" style={{ marginTop: space.xs }}>Quick choice</T>
      <View style={styles.chips}>
        {EXAM_DATE_PRESETS.map((p, i) => (
          <Chip
            key={p.label}
            label={p.label}
            selected={preset === i}
            accessibilityHint={p.months ? undefined : 'Clears the exam date'}
            onPress={() => choose(p.months ? dateInMonths(p.months, now) : undefined)}
          />
        ))}
      </View>
      <MonthGrid
        shown={shown}
        onShow={(m) => {
          setShown(m);
          sayLater(monthLabel(m));
        }}
        selected={draft}
        today={today}
        bounds={bounds}
        onPick={choose}
      />
    </Sheet>
  );
}

/** The month header (‹ January 2027 ›), the weekday headings and the days. */
function MonthGrid({
  shown,
  onShow,
  selected,
  today,
  bounds,
  onPick,
}: {
  shown: YearMonth;
  onShow: (m: YearMonth) => void;
  selected: string | undefined;
  today: string;
  bounds: { min: string; max: string };
  onPick: (date: string) => void;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  // Seven columns across the sheet's width inside the gutters (360 dp → 45 per day).
  const cell = Math.max(MIN_CELL, Math.floor((width - space.gutter * 2) / 7));
  const canBack = compareMonths(shown, monthOf(bounds.min)) > 0;
  const canNext = compareMonths(shown, monthOf(bounds.max)) < 0;
  // The grid fades when the month changes (never on open): what changed moves.
  const [turns, setTurns] = useState(0);
  const go = (n: number) => {
    setTurns((t) => t + 1);
    onShow(addMonths(shown, n));
  };
  return (
    <View style={{ marginTop: space.lg }}>
      <View style={styles.head}>
        <IconButton
          label="Previous month"
          disabled={!canBack}
          onPress={() => go(-1)}
          icon={(col) => <ChevronLeft size={ICON_SIZE.bar} color={col} strokeWidth={ICON_STROKE} />}
        />
        <T v="headline" center accessibilityRole="header" style={{ flex: 1 }}>
          {monthLabel(shown)}
        </T>
        <IconButton
          label="Next month"
          disabled={!canNext}
          onPress={() => go(1)}
          icon={(col) => <ChevronRight size={ICON_SIZE.bar} color={col} strokeWidth={ICON_STROKE} />}
        />
      </View>
      <View style={styles.week} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAY_SHORT.map((d, i) => (
          <View key={WEEKDAY_NAMES[i]} style={{ width: cell, alignItems: 'center' }}>
            <T v="caption" color={c.ink2} maxFontSizeMultiplier={DAY_TEXT_CAP}>{d}</T>
          </View>
        ))}
      </View>
      <FadeIn key={`${shown.year}-${shown.month}`} rise={false} dur="quick" play={turns > 0}>
        {monthGrid(shown).map((week, w) => (
          <View key={w} style={styles.week}>
            {week.map((d, i) =>
              d ? (
                <Day key={d} date={d} size={cell} today={d === today} selected={d === selected} disabled={!inBounds(d, bounds)} onPick={onPick} />
              ) : (
                <View key={`b${i}`} style={{ width: cell, height: cell }} />
              ),
            )}
          </View>
        ))}
      </FadeIn>
    </View>
  );
}

function Day({
  date,
  size,
  today,
  selected,
  disabled,
  onPick,
}: {
  date: string;
  size: number;
  today: boolean;
  selected: boolean;
  disabled: boolean;
  onPick: (date: string) => void;
}) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: size / 2 });
  const dot = Math.min(size - 4, 44);
  const day = Number(date.slice(8));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${spokenDate(date)}${today ? ', today' : ''}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => onPick(date)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, press.style]}
    >
      {press.layer}
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, alignItems: 'center', justifyContent: 'center' }}>
        {/* Today: a ring. Chosen: an ink fill over it (cross-fades, 120 ms). */}
        {today && <View style={[StyleSheet.absoluteFill, { borderRadius: dot / 2, borderWidth: 1.5, borderColor: c.accent }]} />}
        <T v="label" num color={disabled ? c.muted : c.ink} maxFontSizeMultiplier={DAY_TEXT_CAP} style={disabled ? styles.past : undefined}>
          {String(day)}
        </T>
        {/* The paper-coloured number rides inside the fill, so both cross-fade together (never paper on a clear fill). */}
        <StateLayer on={selected} style={{ borderRadius: dot / 2, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
          <T v="label" num color={c.bg} maxFontSizeMultiplier={DAY_TEXT_CAP}>
            {String(day)}
          </T>
        </StateLayer>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -10 },
  week: { flexDirection: 'row', justifyContent: 'center' },
  // Days that can't be chosen are quieter than `muted` alone (they are not the learner's to pick).
  past: { opacity: 0.55 },
});
