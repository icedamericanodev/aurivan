/**
 * Signature moments (Phase 5b) — glue between the saved progress and the
 * pure engine rules. Screens call these hooks; all the rules (thresholds,
 * date maths) live in src/engine/ with tests.
 *
 *   useTodayMoments()  exam-ready panel + exam-eve / exam-day card (Today)
 *   useMindsetGrowth() the runner-up comparison card (You)
 */
import { useEffect, useMemo, useState } from 'react';
import { findQuestion } from '../content/loader';
import type { Certification } from '../content/types';
import { examMoment, eveReminders, paceLine } from '../engine/examDay';
import { examReadyDue } from '../engine/examReady';
import { firstTries, mindsetGrowth } from '../engine/mindsetGrowth';
import type { ReadinessRange } from '../engine/readinessRange';
import type { SlipInput } from '../engine/slipCoach';
import { useProgress, type CertProgress } from '../store/progress';

/** Every logged mistake joined with its question (ORIGINAL letters throughout). */
export function slipInputs(certId: string, mistakes: CertProgress['mistakes']): SlipInput[] {
  const out: SlipInput[] = [];
  for (const [id, m] of Object.entries(mistakes)) {
    const q = findQuestion(certId, id);
    if (q) out.push({ slip: m.slip, picked: m.picked, confidence: m.confidence, correct: q.correct, tips: q.tips, stem: q.stem });
  }
  return out;
}

export function useTodayMoments({
  cert,
  progress,
  range,
  examDate,
  today,
}: {
  cert: Certification;
  progress: CertProgress;
  range: ReadinessRange;
  examDate: string | undefined;
  /** Today's local "YYYY-MM-DD" (useJourney's frozen day key). */
  today: string;
}) {
  const noteReadiness = useProgress((s) => s.noteReadiness);
  const dismissReady = useProgress((s) => s.dismissReady);
  const low = range.enough ? range.low : null;

  // Opening Today logs the day's readiness, so a week of steady readiness
  // counts even on days the learner only checked in (engine/examReady.ts).
  useEffect(() => {
    noteReadiness(cert.id, today, low);
  }, [noteReadiness, cert.id, today, low]);

  // `today` is a key; noon of that day is a safe timestamp for the date maths.
  const moment = examMoment(examDate, new Date(`${today}T12:00:00`).getTime());
  // On the eve and exam day the ready panel stays hidden (the exam card speaks).
  const ready = examReadyDue(progress.moments?.readiness, today, Boolean(progress.moments?.readySeenAt), moment !== null);
  const eve = useMemo(
    () => (moment === 'eve' ? eveReminders(slipInputs(cert.id, progress.mistakes)) : null),
    [moment, cert.id, progress.mistakes],
  );
  return {
    ready,
    dismissReady: () => dismissReady(cert.id),
    moment,
    reminders: eve,
    pace: paceLine(cert.exam),
  };
}

export function useMindsetGrowth(certId: string, progress: CertProgress) {
  // "Now" is read once per mount (render stays pure); the 2-week rule moves in days.
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    const tries = firstTries(progress.answers, progress.mistakes, (id) => findQuestion(certId, id));
    return mindsetGrowth(tries, now);
  }, [certId, progress.answers, progress.mistakes, now]);
}
