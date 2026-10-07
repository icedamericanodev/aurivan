/**
 * Finishing a session.
 * - Practice/review answers were already recorded one by one.
 * - Mock answers are recorded HERE, all at once, when the exam is
 *   submitted (no feedback during the exam), and missed questions are
 *   fed into spaced review.
 */
import { findQuestion } from '../content/loader';
import { displayToOriginal } from '../engine/shuffle';
import { useProgress, type MockResult } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';
import { logActivity } from './activity';

export interface SessionScore {
  total: number;
  answered: number;
  correct: number;
  byDomain: Record<string, { total: number; correct: number }>;
}

/** Pure scoring of a session (unanswered mock questions count as wrong). */
export function scoreSession(s: ActiveSession): SessionScore {
  const byDomain: SessionScore['byDomain'] = {};
  let correct = 0;
  let answered = 0;
  for (const id of s.questionIds) {
    const q = findQuestion(s.certId, id);
    if (!q) continue;
    const r = s.responses[id];
    // Practice ended early: only answered questions count. Mock: all count.
    if (!r && s.mode !== 'mock') continue;
    const d = (byDomain[q.domainId] ??= { total: 0, correct: 0 });
    d.total += 1;
    if (r) answered += 1;
    if (r?.correct) {
      correct += 1;
      d.correct += 1;
    }
  }
  return { total: s.questionIds.length, answered, correct, byDomain };
}

export function finishSession() {
  const s = useSession.getState().active;
  if (!s || s.finishedAt) return;
  if (s.mode === 'mock') {
    const progress = useProgress.getState();
    const skipped: string[] = [];
    for (const id of s.questionIds) {
      const r = s.responses[id];
      if (r) {
        progress.recordAnswer(s.certId, id, r.correct, r.confidence);
        if (!r.correct) progress.recordMistake(s.certId, id, displayToOriginal(r.display, s.perms[id]));
      }
      else skipped.push(id);
    }
    // Skipped questions come back for review, but don't count as studied
    // (no streak, daily-goal or readiness credit for answering nothing).
    if (skipped.length) progress.queueForReview(s.certId, skipped);
    const score = scoreSession(s);
    // If the learner reopens the app after the deadline, the exam ended AT
    // the deadline — not now.
    const endedAt = Math.min(Date.now(), s.deadline ?? Infinity);
    const result: MockResult = {
      id: s.id,
      finishedAt: endedAt,
      total: score.total,
      correct: score.correct,
      minutesUsed: Math.max(1, Math.round((endedAt - s.startedAt) / 60_000)),
      byDomain: score.byDomain,
    };
    progress.recordMock(s.certId, result);
  }
  useSession.getState().finish();
  // Tick off today's plan (review / practice / mock) and add the minutes spent.
  const score = scoreSession(s);
  const endedAt = Math.min(Date.now(), s.deadline ?? Infinity);
  logActivity(s.certId, {
    kind: 'session',
    mode: s.mode,
    answered: score.answered,
    total: s.questionIds.length,
    // Capped, so a session left open overnight doesn't claim hours of study.
    minutes: Math.min(Math.max(1, Math.round((endedAt - s.startedAt) / 60_000)), s.questionIds.length * 3),
  });
}
