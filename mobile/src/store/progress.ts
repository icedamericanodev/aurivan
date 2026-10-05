/**
 * Progress store — everything the learner has achieved, saved on-device.
 *
 * Progress is kept PER CERTIFICATION, so studying CISM later never mixes
 * with CISA stats. When accounts arrive (Phase 3), this same data is what
 * gets synced to Supabase — see docs/mobile/ARCHITECTURE.md.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnswerRecord } from '../engine/readiness';
import { nextReview, type Confidence, type ReviewEntry } from '../engine/srs';
import { bumpStreak, dayKey, type Streak } from '../engine/streak';
import { persistStorage } from './storage';

export interface MockResult {
  id: string;
  finishedAt: number;
  total: number;
  correct: number;
  minutesUsed: number;
  byDomain: Record<string, { total: number; correct: number }>;
}

export interface CertProgress {
  answers: Record<string, AnswerRecord>;
  review: Record<string, ReviewEntry>;
  bookmarks: string[];
  mocks: MockResult[];
}

const emptyCert = (): CertProgress => ({ answers: {}, review: {}, bookmarks: [], mocks: [] });

interface ProgressState {
  byCert: Record<string, CertProgress>;
  streak: Streak;
  today: { day: string; answered: number };

  recordAnswer: (
    certId: string,
    questionId: string,
    correct: boolean,
    confidence?: Confidence,
    opts?: { schedule?: boolean },
  ) => void;
  /** Put questions into review (due now) WITHOUT counting them as answered. */
  queueForReview: (certId: string, questionIds: string[]) => void;
  toggleBookmark: (certId: string, questionId: string) => void;
  recordMock: (certId: string, result: MockResult) => void;
  resetCert: (certId: string) => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      byCert: {},
      streak: { current: 0, best: 0, lastDay: null },
      today: { day: '', answered: 0 },

      recordAnswer: (certId, questionId, correct, confidence, opts) =>
        set((s) => {
          const now = Date.now();
          const cp = s.byCert[certId] ?? emptyCert();
          const prev = cp.answers[questionId];
          const answers = {
            ...cp.answers,
            [questionId]: {
              attempts: (prev?.attempts ?? 0) + 1,
              correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
              lastCorrect: correct,
              lastAt: now,
            },
          };
          // Mock exams record answers but don't reschedule reviews mid-exam.
          let review = cp.review;
          if (opts?.schedule !== false) {
            const next = nextReview(cp.review[questionId], correct, confidence, now);
            review = { ...cp.review };
            if (next) review[questionId] = next;
            else delete review[questionId];
          }
          const day = dayKey(now);
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, answers, review } },
            streak: bumpStreak(s.streak, now),
            today: { day, answered: s.today.day === day ? s.today.answered + 1 : 1 },
          };
        }),

      queueForReview: (certId, questionIds) =>
        set((s) => {
          const now = Date.now();
          const cp = s.byCert[certId] ?? emptyCert();
          const review = { ...cp.review };
          for (const id of questionIds) {
            review[id] = { box: 1, dueAt: now, lastSeen: now, reps: review[id]?.reps ?? 0 };
          }
          return { byCert: { ...s.byCert, [certId]: { ...cp, review } } };
        }),

      toggleBookmark: (certId, questionId) =>
        set((s) => {
          const cp = s.byCert[certId] ?? emptyCert();
          const has = cp.bookmarks.includes(questionId);
          const bookmarks = has
            ? cp.bookmarks.filter((id) => id !== questionId)
            : [...cp.bookmarks, questionId];
          return { byCert: { ...s.byCert, [certId]: { ...cp, bookmarks } } };
        }),

      recordMock: (certId, result) =>
        set((s) => {
          const cp = s.byCert[certId] ?? emptyCert();
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, mocks: [result, ...cp.mocks].slice(0, 50) } },
          };
        }),

      resetCert: (certId) =>
        set((s) => ({ byCert: { ...s.byCert, [certId]: emptyCert() } })),
    }),
    { name: 'aurivan.progress.v1', storage: persistStorage, version: 1 },
  ),
);

/** Read one certification's progress (never undefined). */
export function selectCert(s: ProgressState, certId: string): CertProgress {
  return s.byCert[certId] ?? EMPTY;
}
const EMPTY = emptyCert();
