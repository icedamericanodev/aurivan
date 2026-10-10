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
import { buildSmart } from '../engine/smartMix';
import { MODE_INFO, randomMix, scopeKey, type PathItem, type PathReason, type StudyMode } from '../engine/studyModes';
import { guidedStep, inOrderSession, walkOrder } from '../engine/studyPath';
import { certOutline, questionExists, scopeTopics } from './outline';
import { identityPermutation, makePermutation, type Permutation } from '../engine/shuffle';
import { dueIds, REVIEW_CAP_LINE, REVIEW_SESSION_CAP } from '../engine/srs';
import { selectCert, useProgress } from '../store/progress';
import { useSession, type ActiveSession, type SessionMode } from '../store/session';
import { useSettings } from '../store/settings';
import { finishSession } from './finishSession';

/**
 * Every non-mock session starts timed when Settings → Study defaults →
 * Practice timer is on (owner request, Build E): Today's plan, review,
 * "Practice this concept / topic", Saved, Mistakes, Bank and the study
 * modes. A caller passing `timed` explicitly (Practice's own Timed switch)
 * overrides it for that session. Mocks never use it: they keep the start sheet.
 */
function newSession(
  mode: SessionMode,
  certId: string,
  title: string,
  ids: string[],
  { timed: askTimed, ...extra }: Partial<ActiveSession> = {},
): ActiveSession | null {
  const now = Date.now();
  const timed = mode !== 'mock' && (askTimed ?? useSettings.getState().practiceTimer);
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
    ...(timed ? { timed: true } : {}),
  };
  useSession.getState().start(session);
  return session;
}

/**
 * `timed`: the count-up practice timer (Build D). It never sets a deadline:
 * practice is never submitted for the learner. Left out = the Study default.
 * `ids`: only these questions (Build a set's topic chips).
 */
export function startPractice(
  certId: string,
  opts: { count: number; domainId?: string; difficulty?: Difficulty; title?: string; timed?: boolean; ids?: string[] },
) {
  const only = opts.ids ? new Set(opts.ids) : null;
  const pool = filterPool(getAllQuestions(certId), opts).filter((q) => !only || only.has(q.id));
  const answers = selectCert(useProgress.getState(), certId).answers;
  const ids = buildPracticeQueue(pool, answers, opts.count, createRng(Date.now()));
  return newSession('practice', certId, opts.title ?? 'Practice', ids, opts.timed !== undefined ? { timed: opts.timed } : {});
}

/** The title of a study-mode session: "Smart · All domains", "In order · Governance". */
function pathTitle(certId: string, mode: StudyMode, domainId?: string): string {
  const d = domainId ? getCertification(certId)?.domains.find((x) => x.id === domainId) : undefined;
  return `${MODE_INFO[mode].name} · ${d ? d.short : 'All domains'}`;
}

const reasonsOf = (items: PathItem[]) => {
  const out: Record<string, PathReason> = {};
  for (const i of items) if (i.reason) out[i.id] = i.reason;
  return out;
};

/**
 * Start a Smart, In order or Random session (Build E) for any domain or all.
 * Guided starts from its step screen instead (startGuidedStep). `timed`
 * left out = the Study default; Practice passes its own switch.
 */
export function startStudy(certId: string, opts: { mode: Exclude<StudyMode, 'guided'>; domainId?: string; count: number; timed?: boolean }) {
  const cert = getCertification(certId);
  if (!cert) return null;
  const now = Date.now();
  const rng = createRng(now);
  const cp = selectCert(useProgress.getState(), certId);
  const pool = filterPool(getAllQuestions(certId), { domainId: opts.domainId });
  const weights = Object.fromEntries(cert.domains.map((d) => [d.id, d.weight]));
  const scope = scopeKey(opts.domainId);
  let items: PathItem[];
  let support = false;
  if (opts.mode === 'smart') {
    const plan = buildSmart({
      pool,
      answers: cp.answers,
      review: cp.review,
      domainWeights: weights,
      subtopicOf: certOutline(certId).subtopicOf,
      count: opts.count,
      dailyGoal: useSettings.getState().dailyGoal,
      now,
      rng,
    });
    items = plan.items;
    support = plan.support;
  } else if (opts.mode === 'inOrder') {
    const topics = scopeTopics(certId, opts.domainId);
    const walk = walkOrder(topics, questionExists(certId));
    items = inOrderSession(topics, walk, cp.studyPath?.inOrder?.[scope], opts.count, cp.answers, rng);
  } else {
    items = randomMix(pool, weights, opts.count, rng);
  }
  return newSession('practice', certId, pathTitle(certId, opts.mode, opts.domainId), items.map((i) => i.id), {
    path: { mode: opts.mode, scope },
    reasons: reasonsOf(items),
    ...(support ? { support: true } : {}),
    ...(opts.timed !== undefined ? { timed: opts.timed } : {}),
  });
}

/**
 * After an answer: In order remembers the place, so the next session
 * carries on after this question. The mixed review tail never moves it.
 */
export function advancePath(session: ActiveSession, questionId: string) {
  if (session.path?.mode !== 'inOrder' || session.reasons?.[questionId] === 'mixed') return;
  useProgress.getState().setPathCursor(session.certId, 'inOrder', session.path.scope, questionId);
}

/** One Guided step on a topic: 5 questions on it, then 3 mixed from earlier topics. */
export function startGuidedStep(certId: string, topicId: string, domainId?: string) {
  const topics = scopeTopics(certId, domainId);
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return null;
  const items = guidedStep(topics, topic, (id) => findQuestion(certId, id), selectCert(useProgress.getState(), certId).answers, createRng(Date.now()));
  return newSession('practice', certId, `Guided · ${topic.name}`, items.map((i) => i.id), {
    path: { mode: 'guided', scope: scopeKey(domainId), topicId },
    reasons: reasonsOf(items),
  });
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
  let current = useSession.getState().active;
  // A timed mock whose time ran out while the app was closed is already
  // over: record it (at its deadline) instead of offering to discard it, so
  // the learner's answers are never thrown away.
  if (current && !current.finishedAt && current.mode === 'mock' && current.deadline && Date.now() >= current.deadline) {
    finishSession();
    current = useSession.getState().active;
  }
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
