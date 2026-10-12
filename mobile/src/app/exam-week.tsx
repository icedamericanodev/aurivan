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
 */
import { router } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { Button, CheckRow, PushedHeader, Screen, T } from '../components/ui';
import { EXAM_WEEK_EITHER, EXAM_WEEK_ITEMS, examWeekCount, examWeekOf, examWeekText } from '../engine/examWeek';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export const BLANK_LINE = 'Breathe out slowly, flag the question and move on. Come back at the end with fresh eyes. One question is a small part of the exam.';

export default function ExamWeek() {
  const { c } = useTheme();
  const { cert, progress, examDate } = useActiveCert();
  const tick = useProgress((s) => s.tickExamWeek);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (!examDate) {
    return (
      <EmptyScreen
        header="Exam week"
        art="fieldbook"
        title="Set your exam date first"
        body="The checklist belongs to your exam date. Set it in Settings, and the list is here for the week before."
        fallback="/home"
        primary={{ label: 'Set exam date', onPress: () => router.push('/settings') }}
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
      <View style={{ marginTop: space.xs }}>
        {EXAM_WEEK_ITEMS.map((id, i) => (
          <Fragment key={id}>
            {/* Online or test centre: one choice, one slot in the count (UX review P4). */}
            {id === EXAM_WEEK_EITHER[0] && (
              <T v="meta" style={{ marginTop: space.md }}>Tick the one that fits you.</T>
            )}
            <CheckRow
              label={examWeekText(id, cert.exam)}
              checked={done.includes(id)}
              onPress={() => tick(cert.id, examDate, id)}
              last={i === EXAM_WEEK_ITEMS.length - 1}
            />
          </Fragment>
        ))}
      </View>
      <View style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
        <View accessible accessibilityLabel={`If you blank. ${BLANK_LINE}`}>
          <T v="caption" color={c.accentText}>If you blank</T>
          <T v="quote" style={{ marginTop: 4 }}>{BLANK_LINE}</T>
        </View>
      </View>
      <Button
        kind="ghost"
        label="See your readiness report"
        onPress={() => router.push('/readiness')}
        style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.lg }}
      />
    </Screen>
  );
}
