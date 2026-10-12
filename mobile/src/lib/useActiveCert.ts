/**
 * useActiveCert() — one hook that gives a screen everything about the
 * certification the learner is studying: its facts, their progress,
 * readiness, and how many reviews are due.
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getCertification, CERTIFICATIONS } from '../content/certifications';
import { daysToExam } from '../engine/examDay';
import { readinessFor } from '../engine/readiness';
import { dueCountFor } from '../engine/srs';
import { dayKey, visibleStreak } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { questionExists } from './outline';

/**
 * Calendar days from today to the exam date (local days, DST-safe; the same
 * maths as the exam-eve card in engine/examDay.ts). null = no date set.
 */
export function daysUntil(dateStr?: string): number | null {
  return daysToExam(dateStr, dayKey(Date.now()));
}

export function useActiveCert() {
  const certId = useSettings((s) => s.activeCertId);
  const examDate = useSettings((s) => s.examDates[certId]);
  const progress = useProgress((s) => selectCert(s, certId));
  const streak = useProgress((s) => s.streak);
  const today = useProgress((s) => s.today);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];

  // "Now" refreshes whenever the app returns to the foreground, so reviews
  // that became due overnight show up without restarting the app.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  // Shared with the store and the other tabs: computed once per change of answers.
  const readiness = readinessFor(cert, progress.answers);
  // Reading the clock here is deliberate: when the review queue changes (for
  // example after answering), the recount includes reviews that fell due
  // since the last foreground, without waiting for the next AppState change.
  const dueCount = useMemo(
    // Only questions the bank still has: a review session drops retired ones, so they are never counted.
    // Shared with the other tabs (engine/srs.ts dueCountFor): counted once until the queue or a due time changes.
    // eslint-disable-next-line react-hooks/purity -- see the comment above
    () => dueCountFor(progress.review, Math.max(now, Date.now()), cert.id, questionExists(cert.id)),
    [progress.review, now, cert.id],
  );
  // Same reason: one clock read per render for the streak and today's count.
  // eslint-disable-next-line react-hooks/purity -- see the comment above
  const clock = Math.max(now, Date.now());

  return {
    cert,
    progress,
    readiness,
    dueCount,
    examDate,
    daysLeft: daysUntil(examDate),
    streak: visibleStreak(streak, clock),
    // Only count today's answers if the saved counter is from today (local time).
    answeredToday: today.day === dayKey(clock) ? today.answered : 0,
  };
}
