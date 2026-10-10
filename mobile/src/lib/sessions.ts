/**
 * Session factory — builds a ready-to-run quiz session for each mode.
 * Screens call these and then navigate to /session.
 */
import { Alert } from 'react-native';
import { getCertification } from '../content/certifications';
import { findQuestion, getAllQuestions } from '../content/loader';
import type { Difficulty } from '../content/types';
import { buildMockExam } from '../engine/blueprint';
import { mockPace, type MockTiming } from '../engine/pace';
import { buildPracticeQueue, filterPool } from '../engine/queue';
import { createRng } from '../engine/random';
import { identityPermutation, makePermutation, type Permutation } from '../engine/shuffle';
import { dueIds, REVIEW_CAP_LINE, REVIEW_SESSION_CAP } from '../engine/srs';
import { selectCert, useProgress } from '../store/progress';
import { useSession, type ActiveSession, type SessionMode } from '../store/session';
import { useSettings } from '../store/settings';

function newSession(
  mode: SessionMode,
  certId: string,
  title: string,
  ids: string[],
  extra: Partial<ActiveSession> = {},
): ActiveSession | null {
  const now = Date.now();
  const rng = createRng(now);
  const shuffle = useSettings.getState().shuffleOptions;
  const perms: Record<string, Permutation> = {};
  for (const id of ids) {
    const q = findQuestion(certId, id);
    if (q) perms[id] = shuffle ? makePermutation(q, rng) : identityPermutation(q);
  }
  // Drop ids whose question no longer exists (e.g. removed in a content update).
  const questionIds = ids.filter((id) => perms[id]);
  if (questionIds.length === 0) return null;
  const session: ActiveSession = {
    id: `${mode}-${now}`,
    mode,
    certId,
    title,
    questionIds,
    perms,
    index: 0,
    responses: {},
    flagged: [],
    startedAt: now,
    ...extra,
  };
  useSession.getState().start(session);
  return session;
}

/**
 * `timed`: the count-up practice timer (Build D). It never sets a deadline:
 * practice is never submitted for the learner.
 */
export function startPractice(
  certId: string,
  opts: { count: number; domainId?: string; difficulty?: Difficulty; title?: string; timed?: boolean },
) {
  const pool = filterPool(getAllQuestions(certId), opts);
  const answers = selectCert(useProgress.getState(), certId).answers;
  const ids = buildPracticeQueue(pool, answers, opts.count, createRng(Date.now()));
  return newSession('practice', certId, opts.title ?? 'Practice', ids, opts.timed ? { timed: true } : {});
}

/** The Spaced review row's subtitle, the same on Practice and You. */
export function reviewSubtitle(dueCount: number): string {
  if (!dueCount) return 'All caught up';
  // "to revisit", not "missed": the queue also holds lucky guesses and shaky right answers.
  return dueCount > REVIEW_SESSION_CAP ? `${REVIEW_CAP_LINE}, most overdue first` : 'Questions to revisit';
}

/** Due reviews, most overdue first: at most one session's worth (REVIEW_SESSION_CAP, 20). */
export function startReview(certId: string, limit = REVIEW_SESSION_CAP) {
  const review = selectCert(useProgress.getState(), certId).review;
  const ids = dueIds(review, Date.now()).slice(0, limit);
  return newSession('review', certId, 'Review', ids);
}

/**
 * Practise an exact list of questions (saved questions, missed ones, the
 * questions behind a study note…). Same 'practice' mode as any other
 * practice, so grading, progress and spaced review all work as usual.
 * Order is kept; a repeated id is asked once; ids that no longer exist
 * are dropped by newSession (null when none are left).
 */
export function startFromIds(certId: string, ids: string[], title: string) {
  return newSession('practice', certId, title, [...new Set(ids)]);
}

export function startBookmarks(certId: string) {
  const ids = selectCert(useProgress.getState(), certId).bookmarks;
  return startFromIds(certId, ids, 'Saved questions');
}

/** The options on the mock start sheet (app/mock-start.tsx). */
export interface MockOptions {
  /** Standard (default), +25%, +50% or untimed (engine/pace.ts). */
  timing?: MockTiming;
  /** "Hide the clock (checkpoints only)". The deadline still applies. */
  hideClock?: boolean;
}

/**
 * Full mock (real exam length) or a mini mock (e.g. 50 questions). The time
 * allowed comes from the cert's exam facts, stretched for extra time; an
 * untimed mock has no deadline at all.
 */
export function startMock(certId: string, questions?: number, opts: MockOptions = {}) {
  const cert = getCertification(certId);
  if (!cert) return null;
  const total = questions ?? cert.exam.questions;
  const timing = opts.timing ?? 'standard';
  const { minutesAllowed } = mockPace(cert.exam, total, timing);
  const ids = buildMockExam(cert, getAllQuestions(certId), createRng(Date.now()), total);
  return newSession('mock', certId, total === cert.exam.questions ? 'Full mock exam' : 'Mini mock', ids, {
    ...(minutesAllowed !== null ? { deadline: Date.now() + minutesAllowed * 60_000 } : {}),
    timing,
    // Hiding the clock only makes sense when there is one.
    ...(opts.hideClock && minutesAllowed !== null ? { hideClock: true } : {}),
  });
}

/**
 * Start a session safely. If an UNFINISHED session exists (e.g. a paused
 * mock exam), ask before replacing it — losing 2 hours of exam work to a
 * stray tap would be awful. `onStarted` runs once a session exists;
 * `onEmpty` when there was nothing to practise.
 */
export function guardedStart(
  start: () => ActiveSession | null,
  onStarted: () => void,
  onEmpty: () => void = () =>
    Alert.alert('Nothing to practice yet', 'Try a different filter, or answer a few questions first.'),
) {
  const launch = () => (start() ? onStarted() : onEmpty());
  const current = useSession.getState().active;
  if (current && !current.finishedAt) {
    Alert.alert(
      'Replace your unfinished session?',
      `You have an unfinished "${current.title}". Starting something new will discard it.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Discard and start', style: 'destructive', onPress: launch },
      ],
    );
  } else {
    launch();
  }
}
