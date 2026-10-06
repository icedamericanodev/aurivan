/**
 * Progress store — everything the learner has achieved, saved on-device.
 *
 * Progress is kept PER CERTIFICATION, so studying CISM later never mixes
 * with CISA stats. When accounts arrive (Phase 3), this same data is what
 * gets synced to Supabase — see docs/mobile/ARCHITECTURE.md.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Letter } from '../content/types';
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

/** Why a learner missed a question — tagged by them in the Mistake Journal. */
export type ThinkingSlip = 'role' | 'priority' | 'tech-first' | 'symptom' | 'misread' | 'knowledge';

export interface MistakeEntry {
  picked?: Letter; // ORIGINAL letter chosen (undefined for a skipped mock item)
  at: number;
  slip?: ThinkingSlip;
  resolved?: boolean; // answered correctly since — the mistake is fixed
}

export type GameId = 'trap' | 'sprint' | 'priority';

export interface CertProgress {
  answers: Record<string, AnswerRecord>;
  review: Record<string, ReviewEntry>;
  bookmarks: string[];
  mocks: MockResult[];
  lessonsDone: string[];
  mistakes: Record<string, MistakeEntry>;
  gameBest: Partial<Record<GameId, number>>;
}

const emptyCert = (): CertProgress => ({
  answers: {},
  review: {},
  bookmarks: [],
  mocks: [],
  lessonsDone: [],
  mistakes: {},
  gameBest: {},
});

/**
 * Fill fields added after a learner's data was first saved (older saves have
 * no lessonsDone/mistakes/gameBest). Cached per object so screens that read
 * it never see a "new" object on each render (which would loop forever).
 */
const normalized = new WeakMap<CertProgress, CertProgress>();
function normalize(cp: CertProgress | undefined): CertProgress {
  if (!cp) return emptyCert();
  const hit = normalized.get(cp);
  if (hit) return hit;
  const full = { ...emptyCert(), ...cp };
  normalized.set(cp, full);
  return full;
}

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
  recordMistake: (certId: string, questionId: string, picked?: Letter) => void;
  tagMistake: (certId: string, questionId: string, slip: ThinkingSlip) => void;
  completeLesson: (certId: string, lessonId: string) => void;
  recordGame: (certId: string, game: GameId, score: number) => void;
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
          const cp = normalize(s.byCert[certId]);
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
          // A correct answer later on marks a logged mistake as fixed.
          let mistakes = cp.mistakes;
          if (correct && mistakes[questionId] && !mistakes[questionId].resolved) {
            mistakes = { ...mistakes, [questionId]: { ...mistakes[questionId], resolved: true } };
          }
          const day = dayKey(now);
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, answers, review, mistakes } },
            streak: bumpStreak(s.streak, now),
            today: { day, answered: s.today.day === day ? s.today.answered + 1 : 1 },
          };
        }),

      queueForReview: (certId, questionIds) =>
        set((s) => {
          const now = Date.now();
          const cp = normalize(s.byCert[certId]);
          const review = { ...cp.review };
          for (const id of questionIds) {
            review[id] = { box: 1, dueAt: now, lastSeen: now, reps: review[id]?.reps ?? 0 };
          }
          return { byCert: { ...s.byCert, [certId]: { ...cp, review } } };
        }),

      toggleBookmark: (certId, questionId) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const has = cp.bookmarks.includes(questionId);
          const bookmarks = has
            ? cp.bookmarks.filter((id) => id !== questionId)
            : [...cp.bookmarks, questionId];
          return { byCert: { ...s.byCert, [certId]: { ...cp, bookmarks } } };
        }),

      recordMistake: (certId, questionId, picked) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const prev = cp.mistakes[questionId];
          const entry: MistakeEntry = { picked, at: Date.now(), slip: prev?.slip, resolved: false };
          return { byCert: { ...s.byCert, [certId]: { ...cp, mistakes: { ...cp.mistakes, [questionId]: entry } } } };
        }),

      tagMistake: (certId, questionId, slip) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const prev = cp.mistakes[questionId];
          if (!prev) return s;
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, mistakes: { ...cp.mistakes, [questionId]: { ...prev, slip } } } },
          };
        }),

      completeLesson: (certId, lessonId) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          if (cp.lessonsDone.includes(lessonId)) return s;
          return { byCert: { ...s.byCert, [certId]: { ...cp, lessonsDone: [...cp.lessonsDone, lessonId] } } };
        }),

      recordGame: (certId, game, score) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const best = Math.max(cp.gameBest[game] ?? -Infinity, score);
          return { byCert: { ...s.byCert, [certId]: { ...cp, gameBest: { ...cp.gameBest, [game]: best } } } };
        }),

      recordMock: (certId, result) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
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
  const cp = s.byCert[certId];
  return cp ? normalize(cp) : EMPTY;
}
const EMPTY = emptyCert();
