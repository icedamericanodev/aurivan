/**
 * Session store — the quiz you are in the middle of RIGHT NOW.
 *
 * It is saved to the phone too: phones often close background apps, and
 * losing 90 minutes of a mock exam would be awful. Re-open the app and
 * the session is still there.
 */
import type { WidgetKind } from '../engine/widgets';
import type { AreaSnapshot } from '../engine/fieldGuide';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Letter } from '../content/types';
import { addMs } from '../engine/answerClock';
import type { Checkpoint, MockTiming } from '../engine/pace';
import { bankMs, chooseAfter, readCountdown, timerKindOf, type PracticeCountdown } from '../engine/practiceCountdown';
import type { PathReason, StudyMode } from '../engine/studyModes';
import type { Confidence } from '../engine/srs';
import type { Permutation } from '../engine/shuffle';
import { watchHydration } from './hydration';
import { persistStorage } from './storage';

export type SessionMode = 'practice' | 'review' | 'mock';

export interface Response {
  display: Letter; // what the learner tapped
  correct: boolean;
  confidence?: Confidence;
  /** Answered after "Coach me" showed a hint. Optional: older sessions have none. */
  assisted?: boolean;
  /**
   * A RIGHT answer given less than 4 hours after a WRONG answer to this
   * question (engine/srs.ts isRetestAfterMiss): not promoted, half weight, the answer
   * screen says "Back in your review tomorrow." Optional: older sessions have none.
   */
  retest?: boolean;
  /**
   * Time to answer in ms, background time excluded (engine/answerClock.ts).
   * Mock exams add up every visit until the last change of answer.
   * Optional: older sessions have none.
   */
  ms?: number;
  /**
   * When this answer was given (mock exams: the last change), epoch ms.
   * Build D uses it for "accuracy in the last 10% of the time". Optional:
   * older sessions have none.
   */
  at?: number;
}

export interface ActiveSession {
  id: string;
  mode: SessionMode;
  certId: string;
  title: string;
  questionIds: string[];
  perms: Record<string, Permutation>;
  index: number;
  responses: Record<string, Response>;
  flagged: string[];
  /** Question ids where the learner opened "Coach me" (optional for older saves). */
  coached?: string[];
  /**
   * Mock exams: time (ms) from visits that ended WITHOUT an answer (read it,
   * moved on). The next answer to that question adds it in, then it is
   * cleared. Optional: older sessions have none.
   */
  visitMs?: Record<string, number>;
  startedAt: number;
  deadline?: number; // epoch ms — timed mock exams only (an untimed mock has none)
  /**
   * Build D, all optional (older sessions have none):
   * - timing: the mock's timing option (none = standard, as before Build D);
   * - hideClock: the learner chose "checkpoints only"; the deadline still applies
   *   (mobile 2.2: the same choice for a practice countdown: words, not ticking numbers);
   * - checkpoints: the pace checks recorded so far (engine/pace.ts), each once;
   * - timed: a practice session with the count-up timer on (never a deadline).
   */
  timing?: MockTiming;
  hideClock?: boolean;
  checkpoints?: Checkpoint[];
  timed?: boolean;
  /**
   * Build E study modes, all optional (older sessions have none):
   * - path: which mode built this session and its scope ("all" or a domain
   *   id); Guided also keeps its topic. In order moves its saved place on
   *   each answer to a walk question (not the mixed tail).
   * - reasons: why each question is here (Smart: due / weak / new /
   *   refresher; In order and Guided: "mixed" for the review tail). Shown
   *   as a small tag on the question.
   * - support: Smart's rolling accuracy is under 55%. Kept for saved
   *   sessions; since mobile 1.20 it no longer gates the study note, which
   *   every missed question offers (session.tsx).
   */
  path?: { mode: StudyMode; scope: string; topicId?: string };
  reasons?: Record<string, PathReason>;
  support?: boolean;
  /**
   * Build F: the one milestone this session celebrates on Results (a mark
   * key from engine/milestones.ts). Optional: most sessions have none.
   */
  milestone?: string;
  /**
   * Mobile 1.24: this is the learner's FIRST SET (the same five questions for
   * everyone, lib/firstSet.ts). It runs with no timer and no confidence chips,
   * and its Results is the Day-1 closing screen (components/firstSet.tsx).
   * Optional: older sessions have none.
   */
  firstSet?: boolean;
  /**
   * Mobile 1.47: the home-screen widget whose tap started this session (local beta
   * counters only; lib/widgetStats.ts). Optional: every other session has none.
   */
  widget?: WidgetKind;
  /**
   * Mobile 1.51 (Field Guide): where each area stood when the set began, [answers, whole percent]
   * (engine/fieldGuide.ts areaSnapshot), so Results can draw the set's growth honestly. Optional:
   * older sessions have none (Results then shows the areas without a change).
   */
  before?: AreaSnapshot;
  /**
   * Mobile 2.2: a practice set's GENTLE countdown (engine/practiceCountdown.ts). It sits BESIDE
   * `timed: true` (so an app that only knows `timed` shows the count-up timer) and never beside a
   * `deadline`: it saves the answering time USED, not a clock time, so nothing is ever submitted
   * for the learner and a changed phone clock changes nothing. Always read it through
   * `readCountdown` (a damaged value reads as "no countdown"). Optional: older sessions have none.
   */
  countdown?: PracticeCountdown;
  /**
   * First-try courses only (engine/shortMock.ts): a short mock drawn per learner that had to reuse
   * this many questions the learner had already seen. Results and the saved result say "includes
   * seen questions". Optional: every other session (CISA's mini mock included) has none.
   */
  seenReused?: number;
  /**
   * The held-back full form (engine/heldBack.ts): this mock IS the form `form` (its frozen date).
   * `seen` is true for a retake ("Full exam (seen)": kept out of readiness, never celebrated).
   * Optional: every other session has none.
   */
  heldBack?: { form: string; seen: boolean };
  finishedAt?: number; // set when the learner finishes / submits
}

/** Copy of a record without some keys (undefined stays undefined). */
function omitKeys<V>(rec: Record<string, V> | undefined, drop: ReadonlySet<string>): Record<string, V> | undefined {
  if (!rec) return rec;
  return Object.fromEntries(Object.entries(rec).filter(([k]) => !drop.has(k)));
}

/**
 * Mobile 2.3: the session without some questions, for an unfinished session saved by a build that
 * had questions this build doesn't bundle (a full-bank install updated to the public build with the
 * free sample). The learner keeps every answer to the questions that remain and carries on; the
 * missing questions leave the set, so a mock is scored on the questions it still has. The place
 * stays on the same question, or the next one that remains. Returns the session unchanged when
 * nothing is dropped, and null when no question would remain (the screen then says it can't go on).
 */
export function withoutQuestions(a: ActiveSession, drop: readonly string[]): ActiveSession | null {
  const gone = new Set(drop.filter((id) => a.questionIds.includes(id)));
  if (!gone.size) return a;
  const questionIds = a.questionIds.filter((id) => !gone.has(id));
  if (!questionIds.length) return null;
  // The first remaining question at or after the old place; else the last one.
  const later = a.questionIds.slice(a.index).find((id) => !gone.has(id));
  const index = later ? questionIds.indexOf(later) : questionIds.length - 1;
  return {
    ...a,
    questionIds,
    index,
    perms: omitKeys(a.perms, gone)!,
    responses: omitKeys(a.responses, gone)!,
    flagged: a.flagged.filter((id) => !gone.has(id)),
    ...(a.coached ? { coached: a.coached.filter((id) => !gone.has(id)) } : {}),
    ...(a.visitMs ? { visitMs: omitKeys(a.visitMs, gone) } : {}),
    ...(a.reasons ? { reasons: omitKeys(a.reasons, gone) } : {}),
  };
}

interface SessionState {
  active: ActiveSession | null;
  /** Mobile 2.3: drop questions this build doesn't bundle from an unfinished session (withoutQuestions). */
  dropQuestions: (ids: readonly string[]) => void;
  start: (s: ActiveSession) => void;
  answer: (questionId: string, r: Response) => void;
  goTo: (index: number) => void;
  toggleFlag: (questionId: string) => void;
  /** Remember that Coach me was opened, so a reload keeps the hint (and the half weight). */
  markCoached: (questionId: string) => void;
  /** A mock visit ended with no answer: keep its time for the eventual answer. */
  addVisitTime: (questionId: string, ms: number) => void;
  /** Save the mock's pace checks (engine/pace.ts dueCheckpoints). */
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  /** End the session. `endedAt`: when it really ended (a mock past its deadline ended AT it). */
  finish: (endedAt?: number) => void;
  /** Build F: the milestone this finished session shows on Results. */
  setMilestone: (key: string) => void;
  /**
   * Mobile 2.2, the practice countdown: add answering time (ms). At zero it stops, ONCE, and notes
   * how many questions were answered. Never for a mock, a finished session or a damaged countdown.
   */
  bankCountdown: (ms: number) => void;
  /** The learner's answer on the time's-up sheet. Only at zero, and only the first answer counts. */
  answerCountdown: (choice: 'untimed' | 'finished') => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      active: null,
      start: (active) => set({ active }),
      dropQuestions: (ids) =>
        set((s) => {
          if (!s.active || s.active.finishedAt) return s;
          const next = withoutQuestions(s.active, ids);
          return next === s.active || !next ? s : { active: next };
        }),
      answer: (questionId, r) =>
        set((s) => {
          if (!s.active) return s;
          // Any unanswered-visit time is now part of this answer's `ms` (session.tsx).
          let visitMs = s.active.visitMs;
          if (visitMs?.[questionId] !== undefined) {
            visitMs = { ...visitMs };
            delete visitMs[questionId];
          }
          // `at` (Build D): stamped here, when the answer is saved, for the
          // "last 10% of the time" line on mock results.
          const response = { at: Date.now(), ...r };
          return { active: { ...s.active, responses: { ...s.active.responses, [questionId]: response }, ...(visitMs ? { visitMs } : {}) } };
        }),
      addVisitTime: (questionId, ms) =>
        set((s) => {
          if (!s.active || s.active.finishedAt || ms <= 0) return s;
          const prev = s.active.visitMs?.[questionId] ?? 0;
          return { active: { ...s.active, visitMs: { ...s.active.visitMs, [questionId]: addMs(prev, ms) } } };
        }),
      setCheckpoints: (checkpoints) =>
        set((s) => (s.active && !s.active.finishedAt ? { active: { ...s.active, checkpoints } } : s)),
      goTo: (index) => set((s) => (s.active ? { active: { ...s.active, index } } : s)),
      toggleFlag: (questionId) =>
        set((s) => {
          if (!s.active) return s;
          const f = s.active.flagged;
          const flagged = f.includes(questionId)
            ? f.filter((id) => id !== questionId)
            : [...f, questionId];
          return { active: { ...s.active, flagged } };
        }),
      markCoached: (questionId) =>
        set((s) => {
          if (!s.active || s.active.mode === 'mock') return s; // never in mock exams
          const coached = s.active.coached ?? [];
          if (coached.includes(questionId)) return s;
          return { active: { ...s.active, coached: [...coached, questionId] } };
        }),
      finish: (endedAt) =>
        set((s) => (s.active ? { active: { ...s.active, finishedAt: endedAt ?? Date.now() } } : s)),
      setMilestone: (key) => set((s) => (s.active ? { active: { ...s.active, milestone: key } } : s)),
      bankCountdown: (ms) =>
        set((s) => {
          const a = s.active;
          // Only a practice set that really has a countdown (`timed` and a clean `countdown`).
          if (!a || a.finishedAt || timerKindOf(a) !== 'countdown') return s;
          const saved = readCountdown(a.countdown);
          if (!saved) return s;
          const next = bankMs(saved, ms, Object.keys(a.responses).length);
          return next === saved ? s : { active: { ...a, countdown: next } };
        }),
      answerCountdown: (choice) =>
        set((s) => {
          const a = s.active;
          if (!a || a.finishedAt || timerKindOf(a) !== 'countdown') return s;
          const saved = readCountdown(a.countdown);
          if (!saved) return s;
          const next = chooseAfter(saved, choice);
          return next === saved ? s : { active: { ...a, countdown: next } };
        }),
      clear: () => set({ active: null }),
    }),
    { name: 'aurivan.session.v1', storage: persistStorage, version: 1, onRehydrateStorage: watchHydration('session') },
  ),
);
