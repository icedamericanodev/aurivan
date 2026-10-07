/**
 * Building blocks for the Question bank screens (app/bank/*).
 *
 * - StatusMark: a 24pt circle that says where the learner stands on a
 *   question. Shape AND colour differ (empty ring / ✓ / ✗), so it never
 *   relies on colour alone, and the word is also printed in the meta line.
 * - TopicHeader: a topic name with the learner's own counts (never the
 *   topic's size — product rule, see engine/bank.ts).
 * - BankQuestionRow: one question in the list. Hairline below, no card
 *   (DESIGN_SYSTEM.md §5: lists are rows on paper).
 *
 * No fixed heights anywhere: rows grow with Dynamic Type (minHeight only).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { STATUS_LABEL, difficultyLabel, type QuestionStatus } from '../engine/bank';
import type { Difficulty } from '../content/types';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkCheck, Check, ChevronRight, ICON_STROKE, X } from './icons';
import { ICON_SIZE, T } from './ui';

export function StatusMark({ status }: { status: QuestionStatus }) {
  const { c } = useTheme();
  if (status === 'new') {
    // Not yet answered: an empty ring in the control colour (≥3:1 on paper).
    return <View style={[styles.mark, { borderWidth: 1.5, borderColor: c.control }]} />;
  }
  const ok = status === 'correct';
  const Icon = ok ? Check : X;
  return (
    <View style={[styles.mark, { backgroundColor: ok ? c.correct : c.wrong }]}>
      {/* 2.5 stroke only inside a filled circle (spec §7). */}
      <Icon size={14} color={c.bg} strokeWidth={2.5} />
    </View>
  );
}

export function TopicHeader({ title, summary }: { title: string; summary: string }) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={summary ? `${title}. ${summary}` : title}
      style={styles.topic}
    >
      <T v="caption" color={c.accentText} style={{ flexShrink: 1 }}>{title}</T>
      {summary ? <T v="meta" style={{ flexShrink: 1, textAlign: 'right' }}>{summary}</T> : null}
    </View>
  );
}

export function BankQuestionRow({
  text,
  status,
  saved,
  difficulty,
  onPress,
}: {
  text: string;
  status: QuestionStatus;
  saved: boolean;
  difficulty: Difficulty;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const meta = `${STATUS_LABEL[status]} · ${difficultyLabel(difficulty)}`;
  return (
    <Pressable
      accessibilityRole="button"
      // Status first, so a screen-reader user can skim the list quickly.
      accessibilityLabel={`${meta}${saved ? ', saved' : ''}. ${text}`}
      accessibilityHint="Opens this question to answer it"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.line }, pressed && { backgroundColor: c.soft }]}
    >
      <View style={styles.markCol}>
        <StatusMark status={status} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* The stem's first line(s): two lines keep rows scannable. */}
        <T v="body" numberOfLines={2}>{text}</T>
        <View style={styles.metaRow}>
          <T v="meta" style={{ flexShrink: 1 }}>{meta}</T>
          {saved && (
            <View style={styles.saved}>
              <BookmarkCheck size={ICON_SIZE.inline} color={c.accentText} strokeWidth={ICON_STROKE} />
              <T v="meta" color={c.accentText}>Saved</T>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mark: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  // The mark sits beside the first text line, not centred on a tall row.
  markCol: { paddingTop: 1, alignSelf: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.md, rowGap: 2, marginTop: 2 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  topic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: space.md,
    paddingTop: space.xl,
    paddingBottom: 2, // the caption sits right on top of its rows
  },
});
