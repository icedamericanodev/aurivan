/**
 * Badge collection glue (mobile 1.10): between the pure catalogue
 * (engine/badgeCatalog.ts), the saved progress and the screens.
 *
 * Plain English for the founder:
 * - `caseStage` works out the learner's journey stage, so "Next for your
 *   exam" suggests what helps at this point (never a mock badge too early).
 * - `studyFor` is the "Study for this" button: it opens the session or
 *   screen that earns the badge (Smart on a domain, review, a mock…).
 * - The "new" dot: a badge earned since the case was last opened. On the
 *   first launch of this version it starts from "now", so badges already
 *   held never show as new.
 * - Show badges: switching back on clears the moments that waited while
 *   hidden (no burst) and says how many arrived, in one line.
 */
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { getCertification } from '../content/certifications';
import { lessonsFor } from '../content/lessons';
import { hasNewSince, nextForExam, nextLine, quietTimes, type CaseMark, type StudyTarget } from '../engine/badgeCatalog';
import { examFocusedOf } from '../engine/fit';
import { DIAGNOSTIC_SIZE, journeyStage, type Stage } from '../engine/journey';
import { computeReadiness, type Readiness } from '../engine/readiness';
import { sessionSize } from '../engine/studyModes';
import { selectCert, useProgress, type CertProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { badgeCase } from './milestones';
import { openTab } from './actions';
import { guardedStart, startPractice, startReview, startStudy } from './sessions';
import { daysUntil } from './useActiveCert';

/** The journey stage the badge case reads (the same rule Today uses). */
export function caseStage(certId: string, cp: CertProgress, readiness: Readiness, daysLeft: number | null): Stage {
  return journeyStage({
    readiness,
    answeredTotal: readiness.domains.reduce((n, d) => n + d.answered, 0),
    lessonsDone: cp.lessonsDone.length,
    lessonsAvailable: lessonsFor(certId).length,
    mocksTaken: cp.mocks.length,
    daysLeft,
    // The same Exam-focused rule as Today (code review M8): it skips the learn stage.
    examFocused: examFocusedOf(useSettings.getState()),
  });
}

/** The domain with the lowest mastery (Whole Map's "Study for this"), as the badges read it. */
export function weakestDomain(mastery: Record<string, number>): string | undefined {
  return Object.entries(mastery).sort((a, b) => a[1] - b[1])[0]?.[0];
}

/**
 * The one "Next:" line under a moment on Results: slot 1 of "Next for your
 * exam" (or the nearest), from the progress saved now. None after the exam.
 */
export function badgeNextLine(certId: string): string | undefined {
  const cert = getCertification(certId);
  if (!cert) return undefined;
  const cp = selectCert(useProgress.getState(), certId);
  const readiness = computeReadiness(cert, cp.answers);
  const daysLeft = daysUntil(useSettings.getState().examDates[certId]);
  const { marks, mastery } = badgeCase(certId, cp);
  const next = nextForExam({ marks, stage: caseStage(certId, cp, readiness, daysLeft), daysLeft, mastery });
  const m: CaseMark | undefined = next.best ?? next.nearest[0];
  return m ? nextLine(m) : undefined;
}

const openSession = () => router.push('/session');

/**
 * "Study for this": open what earns the badge. Sessions start through
 * guardedStart, so a paused mock is never replaced without asking.
 */
export function studyFor(target: StudyTarget, certId: string, dueCount: number) {
  const size = sessionSize(useSettings.getState().studySize, dailyMinutesOf(useSettings.getState()));
  const smart = (domainId?: string) => guardedStart(() => startStudy(certId, { mode: 'smart', count: size, ...(domainId ? { domainId } : {}) }), openSession);
  switch (target.kind) {
    case 'diagnostic':
      return guardedStart(() => startPractice(certId, { count: DIAGNOSTIC_SIZE, title: 'Starting check' }), openSession);
    case 'guided':
      return router.push('/guided');
    case 'smart':
      return smart(target.domainId);
    case 'review':
      // Nothing due: Smart mixes in older questions instead (the button says so first).
      return dueCount > 0 ? guardedStart(() => startReview(certId), openSession) : smart();
    case 'mistakes':
      return router.push('/mistakes');
    case 'mock': {
      const cert = getCertification(certId);
      return router.push({ pathname: '/mock-start', params: { questions: String(cert?.exam.questions ?? 150) } });
    }
    case 'today':
      // A tab, from the Badges screen in the root stack: back to the tabs, never a second set (mobile 1.20).
      return openTab('/home');
    case 'game':
      return router.push(`/game/${target.game}`);
    case 'play':
      // A tab, from the Badges screen in the root stack: back to the tabs, never a second set (mobile 1.20).
      return openTab('/play');
  }
}

/**
 * Once per cert, at launch (after the back-fill): the case counts as seen
 * "now" if it never was, so badges held before this version never show the
 * "new" dot. Only badges earned after this can.
 */
export function initCaseSeen(certId: string, now = Date.now()) {
  if (useSeen.getState().caseSeen[certId] === undefined) useSeen.getState().seeCase(certId, now);
}

/** The case was opened: the "new" dot clears. */
export function seeCase(certId: string, now = Date.now()) {
  useSeen.getState().seeCase(certId, now);
}

/** True while a badge the case shows, earned since the case was last opened, waits (and badges are shown). */
export function hasNewBadge(certId: string): boolean {
  if (useSettings.getState().badgesHidden) return false;
  const m = selectCert(useProgress.getState(), certId).milestones;
  return hasNewSince(m?.earned, useSeen.getState().caseSeen[certId], quietTimes(m));
}

const subscribeAll = (cb: () => void) => {
  const a = useSettings.subscribe(cb);
  const b = useSeen.subscribe(cb);
  const c = useProgress.subscribe(cb);
  return () => {
    a();
    b();
    c();
  };
};

/** The "new" dot for the active cert, live (You tab and its Badges row). */
export function useNewBadge(): boolean {
  return useSyncExternalStore(subscribeAll, () => hasNewBadge(useSettings.getState().activeCertId));
}

/**
 * Settings → Show badges, switched back on: the moments that waited while
 * hidden are cleared (one line instead of a burst) and counted. Returns how
 * many badges arrived (0: nothing to say).
 * The count is the active exam's waiting moments (the line points to You →
 * Badges, which shows that exam): exactly the badges earned live that never
 * had their moment. Badges a back-fill or a restore saved quietly were never
 * queued, so they are not counted as "arrived".
 */
export function showBadgesAgain(): number {
  let n = 0;
  const active = useSettings.getState().activeCertId;
  const state = useProgress.getState();
  for (const [certId, cp] of Object.entries(state.byCert)) {
    const earned = cp.milestones?.earned ?? {};
    if (certId === active) n = new Set((cp.milestones?.queue ?? []).filter((k) => earned[k] !== undefined)).size;
    state.updateMilestones(certId, (m) => (m?.queue?.length ? { milestones: { ...m, queue: [] } } : null));
  }
  useSettings.getState().setBadgesHidden(false);
  return n;
}

/** Settings → Show badges, switched off: moments stop; badges are still earned, and queued for the count. */
export function hideBadges() {
  useSettings.getState().setBadgesHidden(true);
}

/** "Badges are on again. 2 arrived while they were hidden: they're in You → Badges." */
export function shownAgainLine(n: number): string {
  if (n <= 0) return 'Badges are on again.';
  return `Badges are on again. ${n === 1 ? '1 badge' : `${n} badges`} arrived while they were hidden: see You → Badges.`;
}
