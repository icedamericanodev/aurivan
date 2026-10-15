/**
 * Spaced review, all caught up: shown when nothing is due for review.
 * Mobile 1.9: the fern (questions come back around) and one useful line,
 * when anything is scheduled: "Next review: tomorrow · 6 questions" (the
 * learner's own queue, never the bank).
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { EmptyScreen } from '../components/emptyScreen';
import { upcomingReview, upcomingReviewLine } from '../engine/srs';
import { shortDate } from '../lib/format';
import { questionExists } from '../lib/outline';
import { guardedStart, startPractice } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';

export default function CaughtUp() {
  const { cert, progress } = useActiveCert();
  // "Now" is read once per visit (render stays pure).
  const [now] = useState(() => Date.now());
  // Only questions the bank still has (a content update may retire one).
  const next = upcomingReview(progress.review, now, questionExists(cert.id));
  return (
    <EmptyScreen
      header="Spaced review"
      art="fern"
      title="All caught up"
      body="Questions you miss come back here, spaced over the next days so they stick."
      next={next ? upcomingReviewLine(next, now, shortDate) : undefined}
      primary={{
        label: 'Practice 10 questions',
        onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), () => router.replace('/session')),
      }}
    />
  );
}
