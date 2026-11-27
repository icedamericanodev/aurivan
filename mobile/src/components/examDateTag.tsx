/**
 * The dated-item tag (docs/content/CIA_BANK_PLAN.md section 11, item 6).
 *
 * Plain English: a few questions in a course rest on a topic that is not on
 * the real exam yet. They are still worth practising, so practice and review
 * keep them, and show one quiet, neutral line: "On the exam from 1 March 2027".
 * On that date (the phone's own calendar) the line is gone. A mock never needs
 * it: a mock leaves such a question out until its date (engine/blueprint.ts
 * mockPool). A question without a date (every live course) never shows it.
 */
import { View } from 'react-native';
import type { PackQuestion } from '../content/types';
import { waitingUntil } from '../engine/blueprint';
import { dayKey } from '../engine/streak';
import { onExamFromLabel } from '../lib/format';
import { Tag } from './ui';

/** The tag's words for this question today, or null when it shows no tag. `now` is for tests. */
export function examDateLabel(q: Pick<PackQuestion, 'testableFrom'>, now: number = Date.now()): string | null {
  const until = waitingUntil(q, dayKey(now));
  return until ? onExamFromLabel(until) : null;
}

/** The tag itself: seen and spoken as the same words. Nothing for a question with no date waiting. */
export function ExamDateTag({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label}>
      <Tag label={label} />
    </View>
  );
}
