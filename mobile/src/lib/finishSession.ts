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
import { batchSaves } from '../store/storage';
import { logActivity } from './activity';
import { celebrateNext, checkMilestones } from './milestones';
import { checkPlant } from './plant';
import { noteWidgetSessionEnd } from './widgetStats';

export interface SessionScore {
  total: number;
  answered: number;
  correct: number;
  byDomain: Record<string, { total: number; correct: number }>;
}

/** The most minutes any session may claim: one day (the backup file's range too). */
export const MAX_SESSION_MINUTES = 1440;

/**
 * Practice and review: the most time one answer adds to a session's time
 * (3 minutes, the same figure today's plan has always capped a session at,
 * per question). A question left open overnight adds 3 minutes, never 10 hours.
 */
export const ANSWER_TIME_CAP_MS = 3 * 60_000;

/**
 * Whole minutes a session used, for a mock's saved result (You → Mock
 * exams), 0..1440. 0 means under a minute: it reads "Under 1 min", like
 * Results, never "1 min" for 30 seconds.
 */
export function minutesUsed(s: ActiveSession, now = Date.now()): number {
  return Math.min(MAX_SESSION_MINUTES, Math.max(0, Math.round(msUsed(s, now) / 60_000)));
}

/**
 * The time a session used, in ms: the ONE figure Results, the mock history
 * and today's plan all show (Build D C1/C3), capped at a day.
 * - A TIMED mock: the exam clock, to the end, never past its deadline.
 * - An UNTIMED mock has no clock and may sit paused for days: its answer
 *   times added up (plus unanswered visits).
 * - Practice and review: the answer times added up, each at most
 *   ANSWER_TIME_CAP_MS, so a session left open overnight never reads "10 h".
 *   A session saved before answers had times: wall time, at most the same
 *   cap per question.
 */
export function msUsed(s: ActiveSession, now = Date.now()): number {
  let ms: number;
  if (s.mode === 'mock') {
    ms = !s.deadline
      ? [...Object.values(s.responses).map((r) => r.ms ?? 0), ...Object.values(s.visitMs ?? {})].reduce((a, b) => a + b, 0)
      : Math.min(s.finishedAt ?? now, s.deadline) - s.startedAt;
  } else {
    const times = Object.values(s.responses)
      .map((r) => r.ms)
      .filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t >= 0);
    ms = times.length
      ? times.reduce((a, t) => a + Math.min(t, ANSWER_TIME_CAP_MS), 0)
      : Math.min((s.finishedAt ?? now) - s.startedAt, s.questionIds.length * ANSWER_TIME_CAP_MS);
  }
  return Math.min(MAX_SESSION_MINUTES * 60_000, Math.max(0, ms));
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

/**
 * The questions of a session the learner has REACHED, in the session's order: every one up to and
 * including the current question, plus any answered or visited (a mock lets the learner jump
 * ahead). Used for first-try courses (engine/firstTry.ts) to say which questions were shown.
 */
export function reachedIds(s: ActiveSession): string[] {
  const reached = new Set([...s.questionIds.slice(0, s.index + 1), ...Object.keys(s.responses), ...Object.keys(s.visitMs ?? {})]);
  return s.questionIds.filter((id) => reached.has(id));
}

/**
 * `celebrate: false` saves any milestone now earned but leaves it QUEUED:
 * for a session that ends without the learner seeing Results (an expired
 * mock recorded when they start something else), so the moment isn't
 * spent on a screen nobody sees.
 */
export function finishSession(opts: { celebrate?: boolean } = {}) {
  // Release bug hunt round 1: a mock records up to 150 answers (plus mistakes, review, readiness,
  // the plan, badges and the plant), each a change to a store. Save each store ONCE at the end,
  // not after every change (store/storage.ts batchSaves): Submit no longer freezes on a large save.
  batchSaves(() => finishSessionNow(opts));
}

function finishSessionNow(opts: { celebrate?: boolean }) {
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
        // A seen retake of the held-back form earns no first try (engine/heldBack.ts: "Not counted in readiness").
        progress.recordAnswer(s.certId, id, r.correct, r.confidence, { logReadiness: false, ms: r.ms, at: examEnd, ...(s.heldBack?.seen ? { seenRetake: true } : {}) });
        if (!r.correct) progress.recordMistake(s.certId, id, displayToOriginal(r.display, s.perms[id]));
      }
      else skipped.push(id);
    }
    // Skipped questions come back for review, but don't count as studied
    // (no streak, daily-goal or readiness credit for answering nothing).
    if (skipped.length) progress.queueForReview(s.certId, skipped);
    // First-try courses: a skipped question was still SHOWN, so a later first try at it never
    // counts toward readiness (engine/firstTry.ts). Any other course: nothing happens.
    if (skipped.length) progress.noteShown(s.certId, skipped, examEnd);
    // The held-back form, submitted (or its time ran out): taken, so its questions join practice.
    // Before the readiness log below, so today's exam-ready log already counts the form's first tries
    // (until it is taken they are outside the pool that log reads).
    if (s.heldBack) progress.markHeldBackTaken(s.certId, s.heldBack.form, examEnd);
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
      // First-try courses: a short mock that reused seen questions says so on its saved result.
      ...(s.seenReused ? { includesSeen: true } : {}),
      // The held-back form: the one fresh try, or a seen retake (kept out of the mock trend).
      ...(s.heldBack ? { heldBack: s.heldBack.seen ? ('seen' as const) : ('fresh' as const) } : {}),
    };
    progress.recordMock(s.certId, result);
  } else {
    // First-try courses: a practice set ended early still SHOWED the question the learner was on
    // (answers were recorded one by one; this one had none), so a later first try at it never
    // counts toward readiness. Any other course (CISA): noteShown does nothing and saves nothing.
    const leftOpen = reachedIds(s).filter((id) => !s.responses[id]);
    if (leftOpen.length) useProgress.getState().noteShown(s.certId, leftOpen);
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
    // The same time Results shows, kept to the second (the plan rounds only
    // for display, so a 5-second review reads "Under 1 min" there too), and
    // capped, so a session left open overnight doesn't claim hours of study.
    minutes: Math.min(msUsed({ ...s, finishedAt: endedAt }), s.questionIds.length * ANSWER_TIME_CAP_MS) / 60_000,
  });
  // Build F: save any milestone now earned, and give THIS session at most one
  // quiet moment on Results (the rest wait in the queue for later sessions).
  checkMilestones(s.certId, { finished: true });
  // Mobile 1.13: the plant grows from real learning only. A grow-up waits as
  // `pending` for its one calm line on Today (never on Results).
  checkPlant(s.certId);
  // Mobile 1.47: a session a home-screen widget started counts as completed (beta counters, this phone only).
  noteWidgetSessionEnd(s.widget, score.answered, s.questionIds.length);
  // A seen retake of the held-back form is never celebrated as progress (engine/heldBack.ts):
  // any milestone it earned stays queued for a later session.
  if (opts.celebrate === false || s.heldBack?.seen) return;
  const moment = celebrateNext(s.certId);
  if (moment) useSession.getState().setMilestone(moment.key);
}
