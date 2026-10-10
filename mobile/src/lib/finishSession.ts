/**
 * Finishing a session.
 * - Practice/review answers were already recorded one by one.
 * - Mock answers are recorded HERE, all at once, when the exam is
 *   submitted (no feedback during the exam), and missed questions are
 *   fed into spaced review.
 */
import { findQuestion } from '../content/loader';
import { mockPacing, type MockPacing } from '../engine/pace';
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

/** The most minutes any session may claim: one day (the backup file's range too). */
export const MAX_SESSION_MINUTES = 1440;

/**
 * Minutes a session used, the ONE figure Results, mock history and today's
 * plan all show (Build D C1/C3), always 1..1440:
 * - an UNTIMED mock has no clock and may sit paused for days, so its time
 *   is the answer times added up (plus unanswered visits);
 * - everything else is wall time to the end, never past a deadline.
 */
export function minutesUsed(s: ActiveSession, now = Date.now()): number {
  const ms =
    s.mode === 'mock' && !s.deadline
      ? [...Object.values(s.responses).map((r) => r.ms ?? 0), ...Object.values(s.visitMs ?? {})].reduce((a, b) => a + b, 0)
      : Math.min(s.finishedAt ?? now, s.deadline ?? Infinity) - s.startedAt;
  return Math.min(MAX_SESSION_MINUTES, Math.max(1, Math.round(ms / 60_000)));
}

/**
 * The pacing panel's numbers for a mock (engine/pace.ts mockPacing): time
 * used vs allowed, median time, checkpoints, unanswered, the last 10% of the
 * time vs the rest, and the slowest domain. Pure: it reads the session only.
 */
export function sessionPacing(s: ActiveSession): MockPacing {
  const endedAt = Math.min(s.finishedAt ?? Date.now(), s.deadline ?? Infinity);
  const answers = [];
  for (const id of s.questionIds) {
    const r = s.responses[id];
    const q = findQuestion(s.certId, id);
    if (r && q) answers.push({ correct: r.correct, ms: r.ms, at: r.at, domainId: q.domainId });
  }
  return mockPacing({
    startedAt: s.startedAt,
    endedAt,
    allowedMs: s.deadline ? s.deadline - s.startedAt : null,
    total: s.questionIds.length,
    answers,
    checkpoints: s.checkpoints,
  });
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
    // If the learner reopens the app after the deadline, the exam ended AT
    // the deadline, not now: answers are stamped with that time (days, streak, mastery).
    const examEnd = Math.min(Date.now(), s.deadline ?? Infinity);
    const skipped: string[] = [];
    for (const id of s.questionIds) {
      const r = s.responses[id];
      if (r) {
        // Readiness is logged ONCE after the batch (below), not after each of
        // up to 150 answers: a low partway through must not reset the hold.
        // ms: the time this question took, added up over every visit (session.tsx).
        progress.recordAnswer(s.certId, id, r.correct, r.confidence, { logReadiness: false, ms: r.ms, at: examEnd });
        if (!r.correct) progress.recordMistake(s.certId, id, displayToOriginal(r.display, s.perms[id]));
      }
      else skipped.push(id);
    }
    // Skipped questions come back for review, but don't count as studied
    // (no streak, daily-goal or readiness credit for answering nothing).
    if (skipped.length) progress.queueForReview(s.certId, skipped);
    progress.logReadinessNow(s.certId);
    const score = scoreSession(s);
    // If the learner reopens the app after the deadline, the exam ended AT
    // the deadline — not now.
    const endedAt = Math.min(Date.now(), s.deadline ?? Infinity);
    // Build D: pacing kept on the result for history and pacing stats.
    // Untimed mocks are labelled, and pacing stats leave them out.
    const pacing = sessionPacing({ ...s, finishedAt: endedAt });
    const result: MockResult = {
      id: s.id,
      finishedAt: endedAt,
      total: score.total,
      correct: score.correct,
      minutesUsed: minutesUsed({ ...s, finishedAt: endedAt }),
      byDomain: score.byDomain,
      timing: s.timing ?? 'standard',
      ...(pacing.allowedMinutes !== null ? { minutesAllowed: pacing.allowedMinutes } : {}),
      ...(pacing.medianSec !== null ? { medianSec: pacing.medianSec } : {}),
      unanswered: pacing.unanswered,
      ...(pacing.checkpoints.length ? { checkpoints: pacing.checkpoints.map((c) => c.deviation) } : {}),
    };
    progress.recordMock(s.certId, result);
  }
  // A mock reopened after its deadline ended AT the deadline: Results and the pacing panel agree.
  useSession.getState().finish(Math.min(Date.now(), s.deadline ?? Infinity));
  // Tick off today's plan (review / practice / mock) and add the minutes spent.
  const score = scoreSession(s);
  const endedAt = Math.min(Date.now(), s.deadline ?? Infinity);
  // Answered questions per domain, so a domain-focused plan item only counts its own domain.
  const answeredByDomain: Record<string, number> = {};
  for (const id of s.questionIds) {
    const q = findQuestion(s.certId, id);
    if (q && s.responses[id]) answeredByDomain[q.domainId] = (answeredByDomain[q.domainId] ?? 0) + 1;
  }
  logActivity(s.certId, {
    kind: 'session',
    mode: s.mode,
    answered: score.answered,
    total: s.questionIds.length,
    byDomain: answeredByDomain,
    // Capped, so a session left open overnight doesn't claim hours of study.
    minutes: Math.min(minutesUsed({ ...s, finishedAt: endedAt }), s.questionIds.length * 3),
  });
}
