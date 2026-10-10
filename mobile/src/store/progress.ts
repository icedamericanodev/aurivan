/**
 * Progress store — everything the learner has achieved, saved on-device.
 *
 * Progress is kept PER CERTIFICATION, so studying CISM later never mixes
 * with CISA stats. When accounts arrive (Phase 3), this same data is what
 * gets synced to Supabase — see docs/mobile/ARCHITECTURE.md.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCertification } from '../content/certifications';
import { subtopicOfQuestion } from '../content/notes';
import type { Letter } from '../content/types';
import { MAX_ANSWER_MS } from '../engine/answerClock';
import { logReadinessDay, type ReadinessDay } from '../engine/examReady';
import { noteRound, type GameGrowth, type RoundOutcome, type TierChange } from '../engine/games/growth';
import { pushScore } from '../engine/games/recap';
import type { GameId } from '../engine/games/registry';
import { logActivity as logDayActivity, logAnswer, type Activity, type DayPlan } from '../engine/dayPlan';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { recordMastery, type SubtopicMastery } from '../engine/mastery';
import type { MockTiming } from '../engine/pace';
import { migrateProgress, PROGRESS_VERSION } from '../engine/saveMigrations';
import type { ThinkingSlip } from '../engine/slipCoach';
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
  /**
   * Build D pacing, all optional (older results have none, and were standard):
   * - timing: standard, +25%, +50% or untimed. Untimed mocks are labelled
   *   "untimed" and left out of pacing stats; readiness counts them as usual.
   * - minutesAllowed: the time the mock allowed (none when untimed).
   * - medianSec: median seconds per answered question.
   * - unanswered: questions with no answer when it ended.
   * - checkpoints: the signed deviation at each pace check (+0.15 = 15% slow).
   */
  timing?: MockTiming;
  minutesAllowed?: number;
  medianSec?: number;
  unanswered?: number;
  checkpoints?: number[];
}

// The slip tags now live in the engine (slip coach); re-exported for screens.
export type { ThinkingSlip };

export interface MistakeEntry {
  picked?: Letter; // ORIGINAL letter chosen (undefined for a skipped mock item)
  at: number;
  slip?: ThinkingSlip;
  resolved?: boolean; // answered correctly since — the mistake is fixed
  /** How sure the learner said they were (optional: older saves have none). */
  confidence?: Confidence;
}

// Game ids live in the registry (engine/games/registry.ts); re-exported for screens.
export type { GameId };

/**
 * Signature moments (Phase 5b). OPTIONAL on purpose: saves from before 5b
 * have no `moments` and load as "no history yet" (no migration needed).
 */
export interface CertMoments {
  /** A small daily log of the readiness range's lower bound (engine/examReady.ts). */
  readiness?: ReadinessDay[];
  /** When the one-time "You're ready" panel was dismissed (once per cert). */
  readySeenAt?: number;
}

export interface CertProgress {
  answers: Record<string, AnswerRecord>;
  review: Record<string, ReviewEntry>;
  bookmarks: string[];
  mocks: MockResult[];
  lessonsDone: string[];
  mistakes: Record<string, MistakeEntry>;
  gameBest: Partial<Record<GameId, number>>;
  /**
   * The last few round scores per game, oldest first, capped
   * (engine/games/recap.ts HISTORY_CAP). Added with the round recap; older
   * saves have none and `normalize` fills {}.
   */
  gameRecent: Partial<Record<GameId, number[]>>;
  /**
   * Study notes the learner marked as read: subtopic ids like "4B1.2".
   * Added with Study notes; older saves have none and `normalize` fills [].
   */
  notesRead: string[];
  /** Phase 5b: optional, see CertMoments. */
  moments?: CertMoments;
  /**
   * Build C: when each subtopic was first mastered (engine/mastery.ts), keyed
   * by the study-notes subtopic id ("4B1.2", content/notes subtopicOfQuestion).
   * Questions no note lists are not counted. Optional: older saves have none, and nothing
   * shows it yet (the mastery badges come later). Never unset by answers.
   */
  mastery?: Record<string, SubtopicMastery>;
  /**
   * Build E: where the resumable study modes stopped, per scope ("all" or a
   * domain id). inOrder = the last walk question answered (the next session
   * starts after it); guided = the topic Guided is on ("4B1"). Optional:
   * older saves have none and start at the beginning.
   */
  studyPath?: StudyPathState;
  /**
   * Build E: spaced review for note statements (Root or Rumor), keyed by a
   * stable card id like "rumor:4B1.2:k3f9a1" (engine/games/rootOrRumor.ts).
   * Same Leitner rules as questions (srs.nextReview). Cards never feed
   * readiness or mastery. Optional: older saves have none.
   */
  cards?: Record<string, ReviewEntry>;
  /**
   * Build F: each game's level (Seedling → Sapling → Heartwood) and its last
   * skill-step results (engine/games/growth.ts). Optional: older saves have
   * none, and every game starts at Seedling.
   */
  gameGrowth?: Partial<Record<GameId, GameGrowth>>;
}

export interface StudyPathState {
  inOrder?: Record<string, string>;
  guided?: Record<string, string>;
}

const emptyCert = (): CertProgress => ({
  answers: {},
  review: {},
  bookmarks: [],
  mocks: [],
  lessonsDone: [],
  mistakes: {},
  gameBest: {},
  gameRecent: {},
  notesRead: [],
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
  /**
   * Today's frozen plan per certification (engine/dayPlan.ts), keyed by cert
   * id, so switching certs and back keeps the ticks. A cert has no entry
   * until Today is first shown for it.
   */
  days: Record<string, DayPlan>;

  /** Store the plan the first time Today is shown on a new day. */
  startDay: (plan: DayPlan) => void;
  /** Log a finished session / lesson / game. Returns true when it ticked off a plan item. */
  logActivity: (certId: string, a: Activity) => boolean;
  /** The clearing card has celebrated today (haptic plays once a day). */
  markCelebrated: (certId: string) => void;

  recordAnswer: (
    certId: string,
    questionId: string,
    correct: boolean,
    confidence?: Confidence,
    /**
     * schedule: false for mock exams. assisted: answered after "Coach me".
     * logReadiness: false while recording a batch (a submitted mock); call
     * logReadinessNow once after the batch, so a mid-batch low never counts.
     * ms: time to answer (engine/answerClock.ts), kept on the answer record.
     * mastery: false for game answers, which never count toward the
     * subtopic mastery date (engine/mastery.ts).
     * at: when the answer was given (default now). A mock submitted after its
     * deadline passes the exam's end, so days and mastery use that time.
     */
    opts?: { schedule?: boolean; assisted?: boolean; logReadiness?: boolean; ms?: number; mastery?: boolean; at?: number },
  ) => void;
  /** Log today's readiness lower bound from the saved answers (after a batch). */
  logReadinessNow: (certId: string) => void;
  /** Put questions into review (due now) WITHOUT counting them as answered. */
  queueForReview: (certId: string, questionIds: string[]) => void;
  toggleBookmark: (certId: string, questionId: string) => void;
  recordMistake: (certId: string, questionId: string, picked?: Letter, confidence?: Confidence) => void;
  tagMistake: (certId: string, questionId: string, slip: ThinkingSlip) => void;
  completeLesson: (certId: string, lessonId: string) => void;
  /** Mark a study-notes subtopic read (true) or unread (false). */
  setNoteRead: (certId: string, subtopicId: string, read: boolean) => void;
  recordGame: (certId: string, game: GameId, score: number) => void;
  recordMock: (certId: string, result: MockResult) => void;
  /** Log today's readiness lower bound (null = not enough data) for the exam-ready hold. */
  noteReadiness: (certId: string, day: string, low: number | null) => void;
  /** The learner closed the "You're ready" panel; it never shows again for this cert. */
  dismissReady: (certId: string) => void;
  resetCert: (certId: string) => void;
  /** Build E: save where In order / Guided stopped for a scope ("all" or a domain id). */
  setPathCursor: (certId: string, mode: keyof StudyPathState, scope: string, value: string) => void;
  /** Build E: a Root or Rumor answer on a note card (spaced like a question; never readiness). */
  recordCard: (certId: string, cardId: string, correct: boolean) => void;
  /** Build F: a finished game round moves the game's level (engine/games/growth.ts). Returns the change. */
  noteGameRound: (certId: string, game: GameId, outcome: RoundOutcome) => TierChange;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      byCert: {},
      streak: { current: 0, best: 0, lastDay: null },
      today: { day: '', answered: 0 },
      days: {},

      startDay: (plan) => set((s) => ({ days: { ...s.days, [plan.certId]: plan } })),
      logActivity: (certId, a) => {
        // A plan from an earlier day is never ticked (lib/activity.ts starts
        // today's plan first, so activity after midnight still counts).
        const cur = get().days[certId];
        if (!cur || cur.day !== dayKey(Date.now())) return false;
        const { plan, ticked } = logDayActivity(cur, a);
        if (plan !== cur) set((s) => ({ days: { ...s.days, [certId]: plan } }));
        return ticked;
      },
      markCelebrated: (certId) =>
        set((s) => {
          const cur = s.days[certId];
          return cur ? { days: { ...s.days, [certId]: { ...cur, celebrated: true } } } : s;
        }),

      recordAnswer: (certId, questionId, correct, confidence, opts) =>
        set((s) => {
          const now = opts?.at ?? Date.now();
          const cp = normalize(s.byCert[certId]);
          const prev = cp.answers[questionId];
          const answers = {
            ...cp.answers,
            [questionId]: {
              attempts: (prev?.attempts ?? 0) + 1,
              correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
              lastCorrect: correct,
              lastAt: now,
              // Only written when true, so clean answers keep the old shape.
              ...(opts?.assisted ? { lastAssisted: true } : {}),
              // Build C quiet data: both describe THIS answer, so they are
              // left out (not carried over) when this answer has none.
              // Clamped to the answer clock's cap, so a record never breaks a backup.
              ...(typeof opts?.ms === 'number' && Number.isFinite(opts.ms) ? { ms: Math.min(MAX_ANSWER_MS, Math.max(0, Math.round(opts.ms))) } : {}),
              ...(confidence ? { lastConfidence: confidence } : {}),
            },
          };
          // Mock exams record answers but don't reschedule reviews mid-exam.
          let review = cp.review;
          if (opts?.schedule !== false) {
            // Coach me answers get the shorter, no-promotion schedule (srs.ts).
            const next = nextReview(cp.review[questionId], correct, confidence, now, opts?.assisted === true);
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
          // Mastery date per subtopic: unassisted correct answers on two
          // different days (engine/mastery.ts). Games pass mastery: false.
          const mastery =
            opts?.mastery === false
              ? cp.mastery
              : recordMastery(cp.mastery, subtopicOfQuestion(certId, questionId), day, { correct, assisted: opts?.assisted === true }, now);
          // Today's clearing card counts answers for this cert's plan, today only.
          const cur = s.days[certId];
          const days = cur && cur.day === day ? { ...s.days, [certId]: logAnswer(cur, correct) } : s.days;
          // Exam-ready hold: log the new readiness lower bound for today, so a
          // dip during the day resets the 7-day hold (engine/examReady.ts).
          const moments = opts?.logReadiness === false ? cp.moments : withReadiness(cp.moments, certId, answers, day);
          return {
            byCert: {
              ...s.byCert,
              [certId]: { ...cp, answers, review, mistakes, ...(moments ? { moments } : {}), ...(mastery ? { mastery } : {}) },
            },
            // An answer stamped on an EARLIER day than the latest study day
            // (an expired mock opened later) never rewinds the streak or today.
            streak: s.streak.lastDay && day < s.streak.lastDay ? s.streak : bumpStreak(s.streak, now),
            today: s.today.day && day < s.today.day ? s.today : { day, answered: s.today.day === day ? s.today.answered + 1 : 1 },
            days,
          };
        }),

      logReadinessNow: (certId) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const moments = withReadiness(cp.moments, certId, cp.answers, dayKey(Date.now()));
          if (moments === cp.moments) return s; // nothing changed: no save
          return { byCert: { ...s.byCert, [certId]: { ...cp, ...(moments ? { moments } : {}) } } };
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

      recordMistake: (certId, questionId, picked, confidence) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const prev = cp.mistakes[questionId];
          const entry: MistakeEntry = { picked, at: Date.now(), slip: prev?.slip, resolved: false, ...(confidence ? { confidence } : {}) };
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

      setNoteRead: (certId, subtopicId, read) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const has = cp.notesRead.includes(subtopicId);
          if (has === read) return s; // already in that state: no save
          const notesRead = read ? [...cp.notesRead, subtopicId] : cp.notesRead.filter((id) => id !== subtopicId);
          return { byCert: { ...s.byCert, [certId]: { ...cp, notesRead } } };
        }),

      recordGame: (certId, game, score) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const best = Math.max(cp.gameBest[game] ?? -Infinity, score);
          const gameRecent = { ...cp.gameRecent, [game]: pushScore(cp.gameRecent[game], score) };
          return { byCert: { ...s.byCert, [certId]: { ...cp, gameBest: { ...cp.gameBest, [game]: best }, gameRecent } } };
        }),

      recordMock: (certId, result) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, mocks: [result, ...cp.mocks].slice(0, 50) } },
          };
        }),

      noteReadiness: (certId, day, low) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          const log = cp.moments?.readiness ?? [];
          const next = logReadinessDay(log, day, low);
          if (next === log) return s; // nothing changed: no save, no re-render
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, readiness: next } } } };
        }),

      dismissReady: (certId) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          if (cp.moments?.readySeenAt) return s;
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, readySeenAt: Date.now() } } } };
        }),

      setPathCursor: (certId, mode, scope, value) =>
        set((s) => {
          const cp = normalize(s.byCert[certId]);
          if (cp.studyPath?.[mode]?.[scope] === value) return s; // no change: no save
          const studyPath: StudyPathState = { ...cp.studyPath, [mode]: { ...cp.studyPath?.[mode], [scope]: value } };
          return { byCert: { ...s.byCert, [certId]: { ...cp, studyPath } } };
        }),

      recordCard: (certId, cardId, correct) =>
        set((s) => {
          const now = Date.now();
          const cp = normalize(s.byCert[certId]);
          const cards = { ...cp.cards };
          const next = nextReview(cards[cardId], correct, undefined, now);
          if (next) cards[cardId] = next;
          else delete cards[cardId];
          return { byCert: { ...s.byCert, [certId]: { ...cp, cards } } };
        }),

      noteGameRound: (certId, game, outcome) => {
        const cp = normalize(get().byCert[certId]);
        const { growth, change } = noteRound(cp.gameGrowth?.[game], outcome);
        set((s) => {
          const cur = normalize(s.byCert[certId]);
          return { byCert: { ...s.byCert, [certId]: { ...cur, gameGrowth: { ...cur.gameGrowth, [game]: growth } } } };
        });
        return change;
      },

      resetCert: (certId) =>
        set((s) => {
          const days = { ...s.days };
          delete days[certId];
          // "Shows once per certification": a reset keeps the dismissed flag.
          const seen = s.byCert[certId]?.moments?.readySeenAt;
          const fresh: CertProgress = seen ? { ...emptyCert(), moments: { readySeenAt: seen } } : emptyCert();
          return { byCert: { ...s.byCert, [certId]: fresh }, days };
        }),
    }),
    {
      name: 'aurivan.progress.v1',
      storage: persistStorage,
      // v2: the single `day` plan became `days`, keyed by cert id.
      // Phase 5a added only OPTIONAL fields (AnswerRecord.lastAssisted,
      // MistakeEntry.confidence), so no version bump: old saves load as-is.
      // Phase 5b added one more optional field (CertProgress.moments): same.
      // Study notes added CertProgress.notesRead; `normalize` gives old saves [].
      // The game recap added CertProgress.gameRecent; `normalize` gives old saves {}.
      // Build C added only OPTIONAL fields (AnswerRecord.ms / lastConfidence,
      // CertProgress.mastery): no version bump, old saves load as-is.
      // Build E added only OPTIONAL fields (CertProgress.studyPath / cards): same.
      // Build F added only OPTIONAL fields (CertProgress.gameGrowth / milestones): same.
      version: PROGRESS_VERSION,
      migrate: (persisted) => migrateProgress(persisted) as unknown as ProgressState,
    },
  ),
);

/**
 * Upgrade an older save (v1's single `day` plan → `days`). The rule lives in
 * engine/saveMigrations.ts so a restored backup is upgraded the same way;
 * re-exported here for existing imports and tests.
 */
export { migrateProgress };

/**
 * The cert's moments with today's readiness lower bound logged. Returns
 * undefined when the cert is unknown (no blueprint to weigh readiness).
 */
function withReadiness(
  moments: CertMoments | undefined,
  certId: string,
  answers: Record<string, AnswerRecord>,
  day: string,
): CertMoments | undefined {
  const cert = getCertification(certId);
  if (!cert) return moments;
  const range = readinessRange(cert, computeReadiness(cert, answers));
  const log = moments?.readiness ?? [];
  const next = logReadinessDay(log, day, range.enough ? range.low : null);
  return next === log ? moments : { ...moments, readiness: next };
}

/** A cert's progress with every list and map present (a restored backup may leave some out). */
export function completeCert(cp: Partial<CertProgress>): CertProgress {
  return { ...emptyCert(), ...cp };
}

/** Read one certification's progress (never undefined). */
export function selectCert(s: ProgressState, certId: string): CertProgress {
  const cp = s.byCert[certId];
  return cp ? normalize(cp) : EMPTY;
}
const EMPTY = emptyCert();
