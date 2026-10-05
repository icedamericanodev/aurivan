/**
 * useActiveCert() — one hook that gives a screen everything about the
 * certification the learner is studying: its facts, their progress,
 * readiness, and how many reviews are due.
 */
import { useMemo } from 'react';
import { getCertification, CERTIFICATIONS } from '../content/certifications';
import { computeReadiness } from '../engine/readiness';
import { dueIds } from '../engine/srs';
import { dayKey, visibleStreak } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const exam = new Date(`${dateStr}T00:00:00`).getTime();
  return Math.ceil((exam - Date.now()) / 86_400_000);
}

export function useActiveCert() {
  const certId = useSettings((s) => s.activeCertId);
  const examDate = useSettings((s) => s.examDates[certId]);
  const progress = useProgress((s) => selectCert(s, certId));
  const streak = useProgress((s) => s.streak);
  const today = useProgress((s) => s.today);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];

  const readiness = useMemo(() => computeReadiness(cert, progress.answers), [cert, progress.answers]);
  const dueCount = useMemo(() => dueIds(progress.review, Date.now()).length, [progress.review]);

  return {
    cert,
    progress,
    readiness,
    dueCount,
    examDate,
    daysLeft: daysUntil(examDate),
    streak: visibleStreak(streak, Date.now()),
    // Only count today's answers if the saved counter is from today (local time).
    answeredToday: today.day === dayKey(Date.now()) ? today.answered : 0,
  };
}
