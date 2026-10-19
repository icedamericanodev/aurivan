/**
 * Exam week (mobile 1.16, PHASE5.md §3.2): six practical things for the
 * week before the exam, so nothing on the day is a surprise.
 *
 * - Opened from Today's "Exam week" card (7 to 2 days out) or from the
 *   readiness report. Ticks belong to this exam date (engine/examWeek.ts):
 *   moving the date starts a fresh list.
 * - Calm on purpose: no notification, no red, no "overdue", no count of what
 *   is left. "Taking it online?" and "At a test centre?" are one choice
 *   ("Tick the one that fits you."), one slot in "2 of 5 done". Generic, true wording ("the official candidate guide"): never a
 *   claim about what an exam body says, no links that imply affiliation.
 * - No exam date: nothing to tick against, so the screen asks for one first.
 *
 * Final review week (Oct 2026, data/exam/final_review_week.json): when the
 * exam has a final-week plan, THIS screen becomes "Final review week"
 * instead of a second, competing screen. Same route, same Today card, same
 * readiness row, same saved record (the checklist ticks are kept and still
 * shown, under "Before the day"). On top of the checklist:
 * - Seven day cards, counting down (7 days before … the eve). Each has its
 *   goal, its tasks (a button opens the right screen: a note, a principle,
 *   practice in a domain, a mini or full mock, the Mistake journal, the
 *   notes search, or the cheat-sheet parts the task asks for), one calm
 *   "remember" line, and "Mark this day done" (saved beside the ticks, for
 *   this exam date). Today's card is open and outlined; the others open on
 *   tap. A missed day is simply skipped: no late or overdue state.
 * - The cheat sheet (app/cheat-sheet.tsx), the eve and morning lists, and
 *   why the plan works.
 * - Without an exam date the plan still reads (it's reachable from Learn),
 *   with one line asking for a date so today's day and the ticks can show.
 * A cert without a plan keeps the checklist screen exactly as before.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { Bullets, Plate } from '../components/examGuide';
import { ChevronDown, ICON_STROKE, ListChecks } from '../components/icons';
import { Collapse, Turn } from '../components/motion';
import { Button, CheckRow, Enter, ICON_SIZE, ListRow, PushedHeader, Screen, Section, T, useScreenScroll } from '../components/ui';
import { getFinalWeek } from '../content/exam';
import type { FinalWeek, WeekDay } from '../content/exam/types';
import type { Certification } from '../content/types';
import { EXAM_WEEK_EITHER, EXAM_WEEK_ITEMS, examWeekCount, examWeekOf, examWeekText, weekDaysCount, weekDaysOf } from '../engine/examWeek';
import { dayForToday, sheetParts, type ActionContext } from '../engine/finalWeek';
import { actionContext, taskButton } from '../lib/finalWeek';
import { moveFocus } from '../lib/a11y';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export const BLANK_LINE = 'Breathe out slowly, flag the question and move on. Come back at the end with fresh eyes. One question is a small part of the exam.';

const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

export default function ExamWeek() {
  const { cert } = useActiveCert();
  const week = getFinalWeek(cert.id);
  return week ? <FinalReviewWeek week={week} /> : <ChecklistOnly />;
}

/** The checklist screen (mobile 1.16), unchanged, for an exam without a final-week plan. */
function ChecklistOnly() {
  const { c } = useTheme();
  const { cert, progress, examDate } = useActiveCert();
  if (!examDate) {
    return (
      <EmptyScreen
        header="Exam week"
        art="fieldbook"
        title="Set your exam date first"
        body="The checklist belongs to your exam date. Set it in Settings, and the list is here for the week before."
        fallback="/home"
        primary={{ label: 'Set exam date', onPress: () => router.push({ pathname: '/settings', params: { open: 'exam-date' } }) }}
      />
    );
  }
  const { done } = examWeekOf(progress.moments?.examWeek, examDate);
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Exam week" onBack={back} />
      <View style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
        <T v="quote">Use this week to settle in, not to cram.</T>
      </View>
      <T v="meta" style={{ marginTop: space.lg }} accessibilityLabel={`${examWeekCount(done)}. Your ticks stay on this phone.`}>{examWeekCount(done)}</T>
      {/* The rows speak for themselves (checkboxes); the count above gives the context (code review M3a). */}
      <Checklist cert={cert} examDate={examDate} done={done} />
      <BlankLine />
      <ReadinessLink />
    </Screen>
  );
}

/** The six practical ticks for one exam date (shared by both screens). */
function Checklist({ cert, examDate, done }: { cert: Certification; examDate: string; done: readonly string[] }) {
  const tick = useProgress((s) => s.tickExamWeek);
  return (
    <View style={{ marginTop: space.xs }}>
      {EXAM_WEEK_ITEMS.map((id, i) => (
        <Fragment key={id}>
          {/* Online or test centre: one choice, one slot in the count (UX review P4). */}
          {id === EXAM_WEEK_EITHER[0] && <T v="meta" style={{ marginTop: space.md }}>Tick the one that fits you.</T>}
          <CheckRow label={examWeekText(id, cert.exam)} checked={done.includes(id)} onPress={() => tick(cert.id, examDate, id)} last={i === EXAM_WEEK_ITEMS.length - 1} />
        </Fragment>
      ))}
    </View>
  );
}

/** "If you blank": the coach's one line for the moment it happens. */
function BlankLine() {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      <View accessible accessibilityLabel={`If you blank. ${BLANK_LINE}`}>
        <T v="caption" color={c.accentText}>If you blank</T>
        <T v="quote" style={{ marginTop: 4 }}>{BLANK_LINE}</T>
      </View>
    </View>
  );
}

function ReadinessLink() {
  return (
    <Button
      kind="ghost"
      label="See your readiness report"
      onPress={() => router.push('/readiness')}
      style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.lg }}
    />
  );
}

/**
 * Opened at a list (?section=eve from the eve card's "Tonight's list"): once
 * laid out, scroll its heading to the top (smooth, or at once under Reduce
 * Motion) and move screen-reader focus there. Inside the Screen, so it can
 * reach the page's scroll.
 */
function JumpOnOpen({ target }: { target: RefObject<View | null> }) {
  const scroll = useScreenScroll();
  useEffect(() => {
    const t = setTimeout(() => {
      scroll?.scrollToView(target.current);
      moveFocus(target, 400);
    }, 250);
    return () => clearTimeout(t);
  }, [scroll, target]);
  return null;
}

/** The header title's hysteresis (pt): it shows past the line, and hides only 8pt back above it. */
const HYSTERESIS = 8;

/** Where the week stands, in one calm line (never "late" or "missed"). Exported for tests. */
export function weekStatusLine(daysLeft: number | null, days: readonly WeekDay[]): string | null {
  if (daysLeft === null) return null;
  const first = days[0]?.daysBefore ?? 7;
  if (daysLeft > first) {
    const n = daysLeft - first;
    return n === 1 ? 'Your week starts tomorrow.' : `Your week starts in ${n} days.`;
  }
  if (daysLeft === 0) return 'Exam day. The morning list is below.';
  return null;
}

function FinalReviewWeek({ week }: { week: FinalWeek }) {
  const { c } = useTheme();
  const { cert, progress, examDate, daysLeft } = useActiveCert();
  const toggleDay = useProgress((s) => s.toggleWeekDay);
  // What the task buttons open: read once per change of answers or mistakes (the slip coach reads every mistake).
  const ctx = useMemo(() => actionContext(cert, progress), [cert, progress]);
  const today = examDate ? dayForToday(week.days, daysLeft) : undefined;
  const daysDone = weekDaysOf(progress.moments?.examWeek, examDate);
  const { done } = examWeekOf(progress.moments?.examWeek, examDate);
  // Today's card starts open; before the week (or with no date) the first day does.
  const [open, setOpen] = useState<string[]>(() => {
    if (today) return [today.id];
    if (daysLeft !== null && daysLeft <= 0) return [];
    return week.days[0] ? [week.days[0].id] : [];
  });
  const toggleOpen = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const [titleUnder, setTitleUnder] = useState(false);
  const titleBottom = useRef(0);
  const onScroll = (y: number) => {
    const edge = titleBottom.current;
    const under = edge > 0 && (titleUnder ? y > edge - HYSTERESIS : y > edge);
    if (under !== titleUnder) setTitleUnder(under);
  };
  const status = examDate ? weekStatusLine(daysLeft, week.days) : null;
  // An exam date in the past: the plan reads, and one line asks for a new date.
  const past = Boolean(examDate) && daysLeft !== null && daysLeft < 0;
  // ?section=eve (the eve card's "Tonight's list") or morning: open at that list.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const eveRef = useRef<View>(null);
  const morningRef = useRef<View>(null);
  const jumpTo = section === 'eve' ? eveRef : section === 'morning' ? morningRef : null;

  return (
    <Screen edges={['top', 'bottom']} onScroll={onScroll} header={<PushedHeader title={week.title} showTitle={titleUnder} onBack={back} />}>
      <Enter i={0}>
        <View onLayout={(e) => (titleBottom.current = space.lg + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <T v="hero" accessibilityRole="header">{week.title}</T>
        </View>
        <T v="body" style={{ marginTop: space.sm }}>{week.intro}</T>
        {examDate && !past ? (
          <T v="meta" style={{ marginTop: space.md }} accessibilityLabel={`${weekDaysCount(daysDone.length, week.days.length)}. ${status ?? ''} Your ticks stay on this phone.`}>
            {[weekDaysCount(daysDone.length, week.days.length), status].filter(Boolean).join(' · ')}
          </T>
        ) : (
          <View style={{ marginTop: space.lg }}>
            <Plate testID="week-set-date">
              <T v="small" color={c.ink}>
                {past
                  ? 'Your exam date has passed. Set a new one to plan again.'
                  : 'Set your exam date and the plan shows today’s day and keeps the days you mark done.'}
              </T>
              <Button
                kind="ghost"
                label="Set exam date"
                onPress={() => router.push({ pathname: '/settings', params: { open: 'exam-date' } })}
                style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
              />
            </Plate>
          </View>
        )}
      </Enter>

      <Enter i={1}>
        <Section title="Day by day" />
        {week.days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            cert={cert}
            ctx={ctx}
            isToday={today?.id === day.id}
            done={daysDone.includes(day.id)}
            open={open.includes(day.id)}
            onToggleOpen={() => toggleOpen(day.id)}
            onToggleDone={examDate ? () => toggleDay(cert.id, examDate, day.id) : undefined}
          />
        ))}
      </Enter>

      <View style={{ marginTop: space.xl }}>
        <ListRow
          icon={<ListChecks size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
          title="Cheat sheet"
          subtitle="Must-remember points, priority words and pace"
          accessibilityHint="Opens the whole cheat sheet"
          onPress={() => router.push('/cheat-sheet')}
          last
        />
      </View>

      <Section title="Before the day" meta={examDate ? examWeekCount(done) : undefined} metaLabel={examDate ? `${examWeekCount(done)}. Your ticks stay on this phone.` : undefined} />
      {examDate ? (
        <Checklist cert={cert} examDate={examDate} done={done} />
      ) : (
        <Bullets items={EXAM_WEEK_ITEMS.map((id) => examWeekText(id, cert.exam))} v="small" />
      )}

      {week.checklists.eve.length > 0 && (
        <View testID="week-eve">
          <Section title="The eve" headRef={eveRef} />
          <Bullets items={week.checklists.eve} v="small" />
        </View>
      )}
      {week.checklists.morning.length > 0 && (
        <View testID="week-morning">
          <Section title="Exam morning" headRef={morningRef} />
          <Bullets items={week.checklists.morning} v="small" />
        </View>
      )}
      <BlankLine />
      {jumpTo && <JumpOnOpen target={jumpTo} />}

      {week.howItWorks.length > 0 && (
        <View testID="week-how">
          <Section title="Why this plan works" />
          <Bullets items={week.howItWorks} v="small" />
        </View>
      )}
      <ReadinessLink />
    </Screen>
  );
}

/**
 * One day of the week: a 48pt+ header that opens and closes it (its title,
 * when it is, and its goal), then its tasks with their buttons, the calm
 * "remember" line, and "Mark this day done". Today's card has an accent
 * outline. A `plate`: the days aren't a choice between options.
 */
function DayCard({
  day,
  cert,
  ctx,
  isToday,
  done,
  open,
  onToggleOpen,
  onToggleDone,
}: {
  day: WeekDay;
  cert: Certification;
  ctx: ActionContext;
  isToday: boolean;
  done: boolean;
  open: boolean;
  onToggleOpen: () => void;
  /** Undefined without an exam date: the ticks belong to one date. */
  onToggleDone?: () => void;
}) {
  const { c } = useTheme();
  const when = day.daysBefore === 1 ? 'The day before your exam' : `${day.daysBefore} days before your exam`;
  const caption = [isToday ? 'Today' : null, when, done ? 'Done' : null].filter(Boolean).join(' · ');
  return (
    <View
      testID={`week-${day.id}`}
      style={{
        marginTop: space.md,
        borderRadius: radius.md,
        backgroundColor: c.raised2,
        borderWidth: isToday ? 1.5 : 1,
        borderColor: isToday ? c.accent : c.line,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${day.title}. ${caption}. ${day.goal}`}
        accessibilityHint={open ? 'Hides this day’s tasks' : 'Shows this day’s tasks'}
        onPress={onToggleOpen}
        style={({ pressed }) => ({ minHeight: 56, padding: space.lg, flexDirection: 'row', gap: space.sm, backgroundColor: pressed ? c.soft : 'transparent' })}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="caption" color={isToday ? c.accentText : c.ink2}>{caption}</T>
          <T v="headline" style={{ marginTop: 2 }}>{day.title}</T>
          <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{day.goal}</T>
        </View>
        {/* Not stretched to the header's height: a tall box would swing the chevron into the text when it turns. */}
        <Turn deg={open ? 0 : -90} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
          <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
        </Turn>
      </Pressable>
      <Collapse open={open} style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        {day.tasks.map((task, i) => {
          const btn = taskButton(task.action, cert, ctx);
          const parts = task.sheet ? sheetParts(task.sheet, ctx.focus) : [];
          const partNames = parts.map((p) => (/^\d+$/.test(p) ? `Domain ${p}` : p === 'priority_words' ? 'priority words' : p === 'routine' ? 'answering routine' : p));
          const sheetLabel = parts.length === 1 && /^\d+$/.test(parts[0]) ? `Check the Domain ${parts[0]} list` : 'Check the list';
          const sheetHint = `Opens the cheat sheet: ${partNames.join(', ')}`;
          return (
            <View key={i} testID={`${day.id}-task-${i}`} style={{ paddingVertical: space.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                {/* The numeral is read as part of the task's own label (UX review P4): one stop, "Task 2 of 5. …". */}
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <T v="label" num color={c.accentText} style={{ minWidth: 14 }}>{String(i + 1)}</T>
                </View>
                {/* The buttons sit in the text's own column, so their indent follows the numeral at any text size. */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="body" accessibilityLabel={`Task ${i + 1} of ${day.tasks.length}. ${task.text}`}>{task.text}</T>
                  {(btn || parts.length > 0) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginLeft: -space.sm }}>
                      {/* Spoken with what it opens, so two "Read the principles" never sound the same (UX review P3). */}
                      {btn && <Button kind="ghost" label={btn.label} accessibilityLabel={`${btn.label}. ${btn.hint}`} onPress={btn.open} />}
                      {parts.length > 0 && (
                        <Button
                          kind="ghost"
                          label={sheetLabel}
                          accessibilityLabel={`${sheetLabel}. ${sheetHint}`}
                          onPress={() => router.push({ pathname: '/cheat-sheet', params: { parts: parts.join(',') } })}
                        />
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ marginTop: space.sm, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
          <T v="quote">{day.remember}</T>
        </View>
        {onToggleDone && (
          <View style={{ marginTop: space.sm }}>
            <CheckRow label="Mark this day done" hint={day.title} checked={done} onPress={onToggleDone} last />
          </View>
        )}
      </Collapse>
    </View>
  );
}
