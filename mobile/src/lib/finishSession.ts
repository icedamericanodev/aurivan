/**
 * Finishing a session.
 * - Practice/review answers were already recorded one by one.
 * - Mock answers are recorded HERE, all at once, when the exam is
 *   submitted (no feedback during the exam), and missed questions are
 *   fed into spaced review.
 */
import { findQuestion } from '../content/loader';
import { useProgress, type MockResult } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';

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
    for (const id of s.questionIds) {
      const r = s.responses[id];
      // Skipped questions are treated as missed so they come back for review.
      progress.recordAnswer(s.certId, id, Boolean(r?.correct), r?.confidence);
    }
    const score = scoreSession(s);
    const result: MockResult = {
      id: s.id,
      finishedAt: Date.now(),
      total: score.total,
      correct: score.correct,
      minutesUsed: Math.max(1, Math.round((Date.now() - s.startedAt) / 60_000)),
      byDomain: score.byDomain,
    };
    progress.recordMock(s.certId, result);
  }
  useSession.getState().finish();
}
