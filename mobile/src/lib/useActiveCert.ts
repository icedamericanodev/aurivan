/**
 * useActiveCert() — one hook that gives a screen everything about the
 * certification the learner is studying: its facts, their progress,
 * readiness, and how many reviews are due.
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getCertification, CERTIFICATIONS } from '../content/certifications';
import { daysToExam } from '../engine/examDay';
import { computeReadiness } from '../engine/readiness';
import { dueIds } from '../engine/srs';
import { dayKey, visibleStreak } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

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

  const readiness = useMemo(() => computeReadiness(cert, progress.answers), [cert, progress.answers]);
  // Reading the clock during render is deliberate here: a re-render (for
  // example after answering) should count reviews that fell due since the
  // last foreground, without waiting for the next AppState change.
  const dueCount = useMemo(
    // eslint-disable-next-line react-hooks/purity -- see the comment above
    () => dueIds(progress.review, Math.max(now, Date.now())).length,
    [progress.review, now],
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
