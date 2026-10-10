/**
 * Session factory — builds a ready-to-run quiz session for each mode.
 * Screens call these and then navigate to /session.
 */
import { Alert } from 'react-native';
import { getCertification } from '../content/certifications';
import { findQuestion, getAllQuestions } from '../content/loader';
import type { Difficulty } from '../content/types';
import { buildMockExam } from '../engine/blueprint';
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

export function startPractice(
  certId: string,
  opts: { count: number; domainId?: string; difficulty?: Difficulty; title?: string },
) {
  const pool = filterPool(getAllQuestions(certId), opts);
  const answers = selectCert(useProgress.getState(), certId).answers;
  const ids = buildPracticeQueue(pool, answers, opts.count, createRng(Date.now()));
  return newSession('practice', certId, opts.title ?? 'Practice', ids);
}

/** The Spaced review row's subtitle, the same on Practice and You. */
export function reviewSubtitle(dueCount: number): string {
  if (!dueCount) return 'All caught up';
  return dueCount > REVIEW_SESSION_CAP ? `${REVIEW_CAP_LINE}, most overdue first` : 'Missed questions, due now';
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

/** Full mock (real exam length) or a mini mock (e.g. 50 questions). */
export function startMock(certId: string, questions?: number) {
  const cert = getCertification(certId);
  if (!cert) return null;
  const total = questions ?? cert.exam.questions;
  const minutes = Math.round((cert.exam.minutes / cert.exam.questions) * total);
  const ids = buildMockExam(cert, getAllQuestions(certId), createRng(Date.now()), total);
  return newSession('mock', certId, total === cert.exam.questions ? 'Full mock exam' : 'Mini mock', ids, {
    deadline: Date.now() + minutes * 60_000,
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
