/**
 * Session store — the quiz you are in the middle of RIGHT NOW.
 *
 * It is saved to the phone too: phones often close background apps, and
 * losing 90 minutes of a mock exam would be awful. Re-open the app and
 * the session is still there.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Letter } from '../content/types';
import { addMs } from '../engine/answerClock';
import type { Checkpoint, MockTiming } from '../engine/pace';
import type { Confidence } from '../engine/srs';
import type { Permutation } from '../engine/shuffle';
import { persistStorage } from './storage';

export type SessionMode = 'practice' | 'review' | 'mock';

export interface Response {
  display: Letter; // what the learner tapped
  correct: boolean;
  confidence?: Confidence;
  /** Answered after "Coach me" showed a hint. Optional: older sessions have none. */
  assisted?: boolean;
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
   * - hideClock: the learner chose "checkpoints only"; the deadline still applies;
   * - checkpoints: the pace checks recorded so far (engine/pace.ts), each once;
   * - timed: a practice session with the count-up timer on (never a deadline).
   */
  timing?: MockTiming;
  hideClock?: boolean;
  checkpoints?: Checkpoint[];
  timed?: boolean;
  finishedAt?: number; // set when the learner finishes / submits
}

interface SessionState {
  active: ActiveSession | null;
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
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      active: null,
      start: (active) => set({ active }),
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
      clear: () => set({ active: null }),
    }),
    { name: 'aurivan.session.v1', storage: persistStorage, version: 1 },
  ),
);
