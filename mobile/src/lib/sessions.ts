/**
 * Session factory — builds a ready-to-run quiz session for each mode.
 * Screens call these and then navigate to /session.
 */
import { getCertification } from '../content/certifications';
import { findQuestion, getAllQuestions } from '../content/loader';
import type { Difficulty } from '../content/types';
import { buildMockExam } from '../engine/blueprint';
import { buildPracticeQueue, filterPool } from '../engine/queue';
import { createRng } from '../engine/random';
import { identityPermutation, makePermutation, type Permutation } from '../engine/shuffle';
import { dueIds } from '../engine/srs';
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
  if (ids.length === 0) return null;
  const now = Date.now();
  const rng = createRng(now);
  const shuffle = useSettings.getState().shuffleOptions;
  const perms: Record<string, Permutation> = {};
  for (const id of ids) {
    const q = findQuestion(certId, id);
    if (q) perms[id] = shuffle ? makePermutation(q, rng) : identityPermutation(q);
  }
  const session: ActiveSession = {
    id: `${mode}-${now}`,
    mode,
    certId,
    title,
    questionIds: ids.filter((id) => perms[id]),
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

export function startReview(certId: string, limit = 30) {
  const review = selectCert(useProgress.getState(), certId).review;
  const ids = dueIds(review, Date.now()).slice(0, limit);
  return newSession('review', certId, 'Review', ids);
}

/** Practise an exact list of questions (saved questions, missed ones…). */
export function startFromIds(certId: string, ids: string[], title: string) {
  return newSession('practice', certId, title, [...ids]);
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
