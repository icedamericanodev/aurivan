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
  startedAt: number;
  deadline?: number; // epoch ms — mock exams only
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
  finish: () => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      active: null,
      start: (active) => set({ active }),
      answer: (questionId, r) =>
        set((s) =>
          s.active
            ? { active: { ...s.active, responses: { ...s.active.responses, [questionId]: r } } }
            : s,
        ),
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
      finish: () =>
        set((s) => (s.active ? { active: { ...s.active, finishedAt: Date.now() } } : s)),
      clear: () => set({ active: null }),
    }),
    { name: 'aurivan.session.v1', storage: persistStorage, version: 1 },
  ),
);
