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
import { hideExamWeek, toggleExamWeek, toggleWeekDay, type ExamWeekItem, type ExamWeekSaved } from '../engine/examWeek';
import { MAX_MOCKS } from '../engine/journey';
import { noteRound, type GameGrowth, type RoundOutcome, type TierChange } from '../engine/games/growth';
import { pushScore } from '../engine/games/recap';
import type { GameId } from '../engine/games/registry';
import { logActivity as logDayActivity, logAnswer, type Activity, type DayPlan } from '../engine/dayPlan';
import { readinessFor, type AnswerRecord } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { recordMastery, type SubtopicMastery } from '../engine/mastery';
import { CATALOG_VERSION } from '../engine/badgeCatalog';
import { afterAnswer, afterCard, noteStudyDay, type CertMilestones } from '../engine/milestones';
import { freezeKeepsakes, keepThroughOtherReset, renamePlant, resetPlant, switchSpecies, withLook, type CertPlant, type PlantLook, type PlantSettings, type PlantSpecies } from '../engine/plant';
import { keepOnReset } from '../engine/plantLooks';
import type { MockTiming } from '../engine/pace';
import { withNoteRead, withNoteViewed } from '../engine/noteReadState';
import { migrateProgress, PROGRESS_VERSION } from '../engine/saveMigrations';
import { withNote, type QuestionNotes } from '../engine/questionNotes';
import type { ThinkingSlip } from '../engine/slipCoach';
import { addReport, type ReportEntry } from '../engine/support';
import { isRetestAfterMiss, MAX_BOX, nextCardReview, nextReview, startOfNextDay, type Confidence, type ReviewEntry } from '../engine/srs';
import { bumpStreak, dayKey, type Streak } from '../engine/streak';
import { watchHydration } from './hydration';
import { persistStorage } from './storage';

/**
 * `map[id]` only when the map itself holds that id (security review HIGH-1):
 * a cert id is a key in `byCert` and `days`, and `{}.constructor` would
 * otherwise read the built-in Object function as an exam's data.
 */
export function ownOf<T>(map: Record<string, T> | undefined, id: string): T | undefined {
  return map && Object.prototype.hasOwnProperty.call(map, id) ? map[id] : undefined;
}

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
  /**
   * Build F: this mistake was fixed on a LATER day, unassisted (Loop Closed
   * counts it once). Written only when true; a new miss starts a fresh entry.
   */
  fixedLater?: boolean;
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
  /**
   * Mobile 1.16: the exam-week checklist's ticks, for ONE exam date
   * (engine/examWeek.ts). Optional: older saves have none and read as a
   * fresh list. Moving the exam date starts a fresh list. Since the final
   * review week it also keeps the day cards marked done (`days`, beside
   * `done`, same exam date). The store name and shape stay: fields are only added.
   */
  examWeek?: ExamWeekSaved;
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
  /**
   * Mobile 1.25 ("fill the circle"): study notes the learner has STARTED, that
   * is, kept open on screen for 10 seconds in total (engine/noteReadState.ts).
   * Never cleared by reading; "Mark as not read" adds the note here, so it
   * shows as started. Optional: older saves have none and `normalize` fills [].
   * Kept beside notesRead (never renamed), backed up and synced (a union).
   */
  notesViewed?: string[];
  /**
   * Mobile 1.25 (review fix): how many notes were ever read, at its highest.
   * "Reset reading progress" empties notesRead but keeps this, so the badges
   * that count reading (Topic Clear, Ten Topics) keep their evidence through a
   * backup or a sync (engine/milestones.ts markSupported). Optional: older
   * saves have none and `normalize` fills it from notesRead.
   */
  notesEverRead?: number;
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
  /**
   * Build F: milestone badges earned (never removed), the queue of ones
   * waiting for their quiet moment, and the few counters that can't be
   * worked out later (engine/milestones.ts). Optional: older saves have none
   * and get a one-time back-fill at launch (lib/milestones.ts).
   */
  milestones?: CertMilestones;
  /**
   * Mobile 1.13 (Phase 4a): "Your plant", the optional companion that grows
   * only from real learning (engine/plant.ts). Optional: older saves have
   * none, and a learner has no plant until they plant one (onboarding, the
   * quiet line on Today, or "Plant yours" on You). Growth is the HIGHEST
   * reached: only Reset or a restore clamp lowers it.
   */
  plant?: CertPlant;
  /**
   * "Your note" on a question (engine/questionNotes.ts): the learner's own
   * words, keyed by question id, `{ text, ts }`. The same name and shape as
   * the web's S.qNotes. A deleted note stays as `{ text: '', ts }` (a
   * tombstone, so sync can't bring it back). Optional: older saves have none,
   * which reads as "no notes". Backed up; never in a report, share card or
   * analytics. Reset progress removes them (resetCert starts from emptyCert).
   */
  qNotes?: QuestionNotes;
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
  // Mobile 1.25: notesViewed is filled here (the loader), not in emptyCert, so a
  // restored file stays exactly as it was saved (old-saves-backup.qa test).
  const full: CertProgress = { ...emptyCert(), notesViewed: [], ...cp };
  // An older save has no count of notes ever read: it is at least the notes read now.
  if (full.notesEverRead === undefined) full.notesEverRead = full.notesRead.length;
  normalized.set(cp, full);
  return full;
}

export interface ProgressState {
  byCert: Record<string, CertProgress>;
  streak: Streak;
  today: { day: string; answered: number };
  /**
   * Today's frozen plan per certification (engine/dayPlan.ts), keyed by cert
   * id, so switching certs and back keeps the ticks. A cert has no entry
   * until Today is first shown for it.
   */
  days: Record<string, DayPlan>;
  /**
   * Mobile 1.7: "Your reports", the problems this learner reported (newest
   * first, capped at engine/support.ts MAX_REPORTS). Kept for every exam in
   * one list, on the phone and in the learner's own backup file; never sent.
   * Optional: older saves have none.
   */
  reports?: ReportEntry[];
  /**
   * Mobile 1.13: the plant settings, for every exam (Settings → Show my plant,
   * Quiet look; and whether Today's one "Plant a companion" line was
   * dismissed). Optional: older saves have none, which means the defaults
   * (shown, with a face, the line not dismissed).
   */
  plantSettings?: PlantSettings;

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
  /** Put questions into review (Box 1, due at the start of tomorrow like a miss) WITHOUT counting them as answered. */
  queueForReview: (certId: string, questionIds: string[]) => void;
  toggleBookmark: (certId: string, questionId: string) => void;
  recordMistake: (certId: string, questionId: string, picked?: Letter, confidence?: Confidence) => void;
  tagMistake: (certId: string, questionId: string, slip: ThinkingSlip) => void;
  completeLesson: (certId: string, lessonId: string) => void;
  /** Mark a study-notes subtopic read (true) or unread (false). Unread goes back to started. */
  setNoteRead: (certId: string, subtopicId: string, read: boolean) => void;
  /** Mobile 1.25: the note has been open for 10 seconds (it shows as started). */
  markNoteViewed: (certId: string, subtopicId: string) => void;
  /** Mobile 1.25: Settings → Reset reading progress. Every note goes back to not read; nothing else changes. */
  resetNotesReading: (certId: string) => void;
  /**
   * Save the learner's own note on a question (cut to 1,000 characters).
   * Empty text deletes it (a tombstone stays, see CertProgress.qNotes).
   */
  setQuestionNote: (certId: string, questionId: string, text: string) => void;
  recordGame: (certId: string, game: GameId, score: number) => void;
  recordMock: (certId: string, result: MockResult) => void;
  /** Log today's readiness lower bound (null = not enough data) for the exam-ready hold. */
  noteReadiness: (certId: string, day: string, low: number | null) => void;
  /** The learner closed the "You're ready" panel; it never shows again for this cert. */
  dismissReady: (certId: string) => void;
  /** Mobile 1.16: tick or untick one exam-week item, for this exam date. */
  tickExamWeek: (certId: string, examDate: string, id: ExamWeekItem) => void;
  /** Mobile 1.16: hide Today's exam-week card for this exam date (the ticks stay). */
  hideExamWeek: (certId: string, examDate: string) => void;
  /** Final review week: mark one day card ("day-7" … "day-1") done or not done, for this exam date. */
  toggleWeekDay: (certId: string, examDate: string, dayId: string) => void;
  resetCert: (certId: string) => void;
  /** Build E: save where In order / Guided stopped for a scope ("all" or a domain id). */
  setPathCursor: (certId: string, mode: keyof StudyPathState, scope: string, value: string) => void;
  /** Build E: a Root or Rumor answer on a note card (spaced like a question; never readiness). */
  recordCard: (certId: string, cardId: string, correct: boolean) => void;
  /** Build F: a finished game round moves the game's level (engine/games/growth.ts). Returns the change. */
  noteGameRound: (certId: string, game: GameId, outcome: RoundOutcome) => TierChange;
  /**
   * Build F: change a cert's milestones (lib/milestones.ts does the rules).
   * `update` gets the current milestones and progress and returns the new
   * milestones, plus any mistakes to mark as fixed on a later day.
   */
  updateMilestones: (
    certId: string,
    update: (m: CertMilestones | undefined, cp: CertProgress) => { milestones: CertMilestones; fixedLater?: string[] } | null,
  ) => void;
  /** Mobile 1.7: remember a report the learner started (their email app opened, or the fallback showed). Stamped now. */
  logReport: (entry: Omit<ReportEntry, 'at' | 'creditSeen'>) => void;
  /** Mobile 1.7: "Your report helped" was shown for these reports (by ref), so it never shows again. */
  markCreditSeen: (refs: string[]) => void;
  /** Mobile 1.7: Your reports → "Clear this list". */
  clearReports: () => void;
  /**
   * Mobile 1.13: change a cert's plant (lib/plant.ts does the rules: planting,
   * growth, the moment shown). `update` gets the current plant and progress
   * and returns the new plant; returning the same object saves nothing.
   */
  updatePlant: (certId: string, update: (p: CertPlant | undefined, cp: CertProgress) => CertPlant | undefined) => void;
  /** Rename the plant (cleaned; '' = no name). */
  renamePlant: (certId: string, name: string) => void;
  /** Change species: the growth stays. */
  switchPlantSpecies: (certId: string, species: PlantSpecies) => void;
  /** Change the plant settings (merged into the saved ones). */
  setPlantSettings: (change: Partial<PlantSettings>) => void;
  /** Mobile 1.14: change the plant's look (catalogue ids only; null = the slot's default). */
  setPlantLook: (certId: string, change: { [K in keyof PlantLook]?: PlantLook[K] | null }) => void;
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
        const cur = ownOf(get().days, certId);
        if (!cur || cur.day !== dayKey(Date.now())) return false;
        const { plan, ticked } = logDayActivity(cur, a);
        if (plan !== cur) set((s) => ({ days: { ...s.days, [certId]: plan } }));
        return ticked;
      },
      markCelebrated: (certId) =>
        set((s) => {
          const cur = ownOf(s.days, certId);
          return cur ? { days: { ...s.days, [certId]: { ...cur, celebrated: true } } } : s;
        }),

      recordAnswer: (certId, questionId, correct, confidence, opts) =>
        set((s) => {
          const now = opts?.at ?? Date.now();
          const cp = normalize(ownOf(s.byCert, certId));
          const prev = cp.answers[questionId];
          // Retest rule (mobile 1.24, engine/srs.ts): a right answer less than 4
          // hours after a WRONG answer to the same question is recall from
          // working memory, not remembering. A right retest counts half, is not
          // promoted and does not fix the mistake. A right answer after a right
          // answer is a normal answer. A wrong one counts in full, so only a
          // right one is marked. Mock answers are saved in a batch at the end, so they too.
          const retest = correct && isRetestAfterMiss(prev, now);
          // Half evidence for the milestone and mastery counters: a hint or a retest.
          const weak = opts?.assisted === true || retest;
          const answers = {
            ...cp.answers,
            [questionId]: {
              attempts: (prev?.attempts ?? 0) + 1,
              correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
              lastCorrect: correct,
              lastAt: now,
              // Only written when true, so clean answers keep the old shape.
              ...(opts?.assisted ? { lastAssisted: true } : {}),
              ...(retest ? { lastRetest: true } : {}),
              // Build F: a game answer is marked, so milestones can skip it.
              // Like lastAssisted, the record is rebuilt each answer, so a
              // later non-game answer drops the flag again.
              ...(opts?.mastery === false ? { lastGame: true } : {}),
              // Build C quiet data: both describe THIS answer, so they are
              // left out (not carried over) when this answer has none.
              // Clamped to the answer clock's cap, so a record never breaks a backup.
              ...(typeof opts?.ms === 'number' && Number.isFinite(opts.ms) ? { ms: Math.min(MAX_ANSWER_MS, Math.max(0, Math.round(opts.ms))) } : {}),
              ...(confidence ? { lastConfidence: confidence } : {}),
            },
          };
          // Mock exams record answers but don't reschedule reviews mid-exam.
          let review = cp.review;
          const before = cp.review[questionId];
          if (opts?.schedule !== false) {
            // Coach me answers get the shorter, no-promotion schedule (srs.ts).
            const next = nextReview(cp.review[questionId], correct, confidence, now, opts?.assisted === true, retest);
            review = { ...cp.review };
            if (next) review[questionId] = next;
            else delete review[questionId];
          }
          // A correct answer later on marks a logged mistake as fixed (not a retest: that is too soon to know).
          let mistakes = cp.mistakes;
          if (correct && !retest && mistakes[questionId] && !mistakes[questionId].resolved) {
            mistakes = { ...mistakes, [questionId]: { ...mistakes[questionId], resolved: true } };
          }
          // Build F milestone counters (engine/milestones.ts): study days,
          // long-gap recalls, fixes on a later day, graduations, "sure"
          // answers and game misses. Coach me and game answers never count
          // toward the mastery badges.
          const logged = mistakes[questionId];
          const ms = afterAnswer(cp.milestones, {
            questionId,
            correct,
            assisted: weak,
            game: opts?.mastery === false,
            confidence,
            at: now,
            prevLastAt: prev?.lastAt,
            openMistakeAt: logged && !logged.fixedLater ? logged.at : undefined,
            // Right again from the last box: nextReview took it out of the queue.
            graduated: opts?.schedule !== false && correct && Boolean(before && before.box >= MAX_BOX) && !review[questionId],
          });
          if (ms.fixedLater) mistakes = { ...mistakes, [questionId]: { ...mistakes[questionId], fixedLater: true } };
          const milestones = ms.milestones;
          const day = dayKey(now);
          // Mastery date per subtopic: unassisted correct answers on two
          // different days (engine/mastery.ts). Games pass mastery: false.
          const mastery =
            opts?.mastery === false
              ? cp.mastery
              : recordMastery(cp.mastery, subtopicOfQuestion(certId, questionId), day, { correct, assisted: weak }, now);
          // Today's clearing card counts answers for this cert's plan, today only.
          const cur = ownOf(s.days, certId);
          const days = cur && cur.day === day ? { ...s.days, [certId]: logAnswer(cur, correct) } : s.days;
          // Exam-ready hold: log the new readiness lower bound for today, so a
          // dip during the day resets the 7-day hold (engine/examReady.ts).
          const moments = opts?.logReadiness === false ? cp.moments : withReadiness(cp.moments, certId, answers, day);
          return {
            byCert: {
              ...s.byCert,
              [certId]: { ...cp, answers, review, mistakes, milestones, ...(moments ? { moments } : {}), ...(mastery ? { mastery } : {}) },
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
          const cp = normalize(ownOf(s.byCert, certId));
          const moments = withReadiness(cp.moments, certId, cp.answers, dayKey(Date.now()));
          if (moments === cp.moments) return s; // nothing changed: no save
          return { byCert: { ...s.byCert, [certId]: { ...cp, ...(moments ? { moments } : {}) } } };
        }),

      queueForReview: (certId, questionIds) =>
        set((s) => {
          const now = Date.now();
          const cp = normalize(ownOf(s.byCert, certId));
          const review = { ...cp.review };
          // A blank mock answer or a Daylight time-out waits for tomorrow, like a miss (mobile 1.43):
          // re-asking it the same hour tests memory of the review, not recall.
          const tomorrow = startOfNextDay(now);
          for (const id of questionIds) {
            review[id] = { box: 1, dueAt: tomorrow, lastSeen: now, reps: review[id]?.reps ?? 0 };
          }
          return { byCert: { ...s.byCert, [certId]: { ...cp, review } } };
        }),

      toggleBookmark: (certId, questionId) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const has = cp.bookmarks.includes(questionId);
          const bookmarks = has
            ? cp.bookmarks.filter((id) => id !== questionId)
            : [...cp.bookmarks, questionId];
          return { byCert: { ...s.byCert, [certId]: { ...cp, bookmarks } } };
        }),

      recordMistake: (certId, questionId, picked, confidence) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const prev = cp.mistakes[questionId];
          const entry: MistakeEntry = { picked, at: Date.now(), slip: prev?.slip, resolved: false, ...(confidence ? { confidence } : {}) };
          return { byCert: { ...s.byCert, [certId]: { ...cp, mistakes: { ...cp.mistakes, [questionId]: entry } } } };
        }),

      tagMistake: (certId, questionId, slip) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const prev = cp.mistakes[questionId];
          if (!prev) return s;
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, mistakes: { ...cp.mistakes, [questionId]: { ...prev, slip } } } },
          };
        }),

      completeLesson: (certId, lessonId) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          if (cp.lessonsDone.includes(lessonId)) return s;
          return { byCert: { ...s.byCert, [certId]: { ...cp, lessonsDone: [...cp.lessonsDone, lessonId] } } };
        }),

      setNoteRead: (certId, subtopicId, read) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          // Mobile 1.25: unmarking keeps the note as started (engine/noteReadState.ts).
          const viewedBefore = cp.notesViewed ?? [];
          const next = withNoteRead(cp.notesRead, viewedBefore, subtopicId, read);
          if (next.read === cp.notesRead) return s; // already in that state: no save
          // The count of notes ever read only goes up (a badge's evidence; see notesEverRead).
          const notesEverRead = Math.max(cp.notesEverRead ?? 0, next.read.length);
          return { byCert: { ...s.byCert, [certId]: { ...cp, notesRead: [...next.read], notesViewed: [...next.viewed], notesEverRead } } };
        }),

      markNoteViewed: (certId, subtopicId) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const before = cp.notesViewed ?? [];
          const notesViewed = withNoteViewed(before, subtopicId);
          if (notesViewed === before) return s; // already started: no save
          return { byCert: { ...s.byCert, [certId]: { ...cp, notesViewed: [...notesViewed] } } };
        }),

      resetNotesReading: (certId) =>
        set((s) => {
          const cp = ownOf(s.byCert, certId);
          // Nothing saved for this exam, or nothing read or started: no save.
          if (!cp || ((cp.notesRead ?? []).length === 0 && (cp.notesViewed ?? []).length === 0)) return s;
          // The notes go back to not read, but the count of notes ever read stays (badges keep their evidence).
          const full = normalize(cp);
          const notesEverRead = Math.max(full.notesEverRead ?? 0, full.notesRead.length);
          return { byCert: { ...s.byCert, [certId]: { ...full, notesRead: [], notesViewed: [], notesEverRead } } };
        }),

      setQuestionNote: (certId, questionId, text) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const qNotes = withNote(cp.qNotes, questionId, text, Date.now());
          if (qNotes === cp.qNotes) return s; // the same text: no save
          return { byCert: { ...s.byCert, [certId]: { ...cp, qNotes } } };
        }),

      recordGame: (certId, game, score) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const best = Math.max(cp.gameBest[game] ?? -Infinity, score);
          const gameRecent = { ...cp.gameRecent, [game]: pushScore(cp.gameRecent[game], score) };
          return { byCert: { ...s.byCert, [certId]: { ...cp, gameBest: { ...cp.gameBest, [game]: best }, gameRecent } } };
        }),

      recordMock: (certId, result) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, mocks: [result, ...cp.mocks].slice(0, MAX_MOCKS) } },
          };
        }),

      noteReadiness: (certId, day, low) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const log = cp.moments?.readiness ?? [];
          const next = logReadinessDay(log, day, low);
          if (next === log) return s; // nothing changed: no save, no re-render
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, readiness: next } } } };
        }),

      dismissReady: (certId) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          if (cp.moments?.readySeenAt) return s;
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, readySeenAt: Date.now() } } } };
        }),

      tickExamWeek: (certId, examDate, id) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const examWeek = toggleExamWeek(cp.moments?.examWeek, examDate, id);
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, examWeek } } } };
        }),

      hideExamWeek: (certId, examDate) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const examWeek = hideExamWeek(cp.moments?.examWeek, examDate);
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, examWeek } } } };
        }),

      toggleWeekDay: (certId, examDate, dayId) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const examWeek = toggleWeekDay(cp.moments?.examWeek, examDate, dayId);
          return { byCert: { ...s.byCert, [certId]: { ...cp, moments: { ...cp.moments, examWeek } } } };
        }),

      setPathCursor: (certId, mode, scope, value) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          if (cp.studyPath?.[mode]?.[scope] === value) return s; // no change: no save
          const studyPath: StudyPathState = { ...cp.studyPath, [mode]: { ...cp.studyPath?.[mode], [scope]: value } };
          return { byCert: { ...s.byCert, [certId]: { ...cp, studyPath } } };
        }),

      recordCard: (certId, cardId, correct) =>
        set((s) => {
          const now = Date.now();
          const cp = normalize(ownOf(s.byCert, certId));
          const cards = { ...cp.cards };
          const prevCard = cards[cardId];
          // A missed card comes back in the next round (nextCardReview); a missed question waits for tomorrow.
          const next = nextCardReview(prevCard, correct, now);
          if (next) cards[cardId] = next;
          else delete cards[cardId];
          // Build F: a missed card got right on a later day is a game miss fixed (Back on the Path).
          const afterMiss = afterCard(cp.milestones, cardId, correct, now);
          // A note-card game round is study too: it counts as a study day for
          // the streak and for Rooted (owner decision, 1.6.1). No answer is
          // recorded, so mastery, readiness and today's goal don't move.
          const day = dayKey(now);
          const milestones = afterMiss ? noteStudyDay(afterMiss, day) : afterMiss;
          return {
            byCert: { ...s.byCert, [certId]: { ...cp, cards, ...(milestones ? { milestones } : {}) } },
            streak: s.streak.lastDay && day < s.streak.lastDay ? s.streak : bumpStreak(s.streak, now),
          };
        }),

      noteGameRound: (certId, game, outcome) => {
        const cp = normalize(ownOf(get().byCert, certId));
        const { growth, change } = noteRound(cp.gameGrowth?.[game], outcome);
        set((s) => {
          const cur = normalize(ownOf(s.byCert, certId));
          return { byCert: { ...s.byCert, [certId]: { ...cur, gameGrowth: { ...cur.gameGrowth, [game]: growth } } } };
        });
        return change;
      },

      updateMilestones: (certId, update) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const r = update(cp.milestones, cp);
          if (!r || (r.milestones === cp.milestones && !r.fixedLater?.length)) return s;
          let mistakes = cp.mistakes;
          for (const id of r.fixedLater ?? []) {
            if (mistakes[id] && !mistakes[id].fixedLater) mistakes = { ...mistakes, [id]: { ...mistakes[id], fixedLater: true } };
          }
          return { byCert: { ...s.byCert, [certId]: { ...cp, mistakes, milestones: r.milestones } } };
        }),

      logReport: (entry) => set((s) => ({ reports: addReport(s.reports, { ...entry, at: Date.now() }) })),
      markCreditSeen: (refs) =>
        set((s) => {
          if (!s.reports || refs.length === 0) return s;
          const seen = new Set(refs);
          return { reports: s.reports.map((r) => (seen.has(r.ref) && !r.creditSeen ? { ...r, creditSeen: true } : r)) };
        }),
      clearReports: () => set({ reports: [] }),

      updatePlant: (certId, update) =>
        set((s) => {
          const cp = normalize(ownOf(s.byCert, certId));
          const next = update(cp.plant, cp);
          if (next === cp.plant) return s; // nothing changed: no save
          const out: CertProgress = { ...cp };
          if (next) out.plant = next;
          else delete out.plant;
          return { byCert: { ...s.byCert, [certId]: out } };
        }),
      renamePlant: (certId, name) => get().updatePlant(certId, (p) => (p ? renamePlant(p, name) : p)),
      switchPlantSpecies: (certId, species) => get().updatePlant(certId, (p) => (p ? switchSpecies(p, species) : p)),
      setPlantLook: (certId, change) => get().updatePlant(certId, (p) => (p ? withLook(p, change) : p)),
      setPlantSettings: (change) =>
        set((s) => {
          const cur = s.plantSettings ?? {};
          const next = { ...cur, ...change };
          if ((Object.keys(next) as (keyof PlantSettings)[]).every((k) => next[k] === cur[k])) return s;
          return { plantSettings: next };
        }),

      // A reset is per exam and leaves "Your reports" alone: those are the
      // learner's messages to us, not study progress.
      resetCert: (certId) =>
        set((s) => {
          const days = { ...s.days };
          delete days[certId];
          // "Shows once per certification": a reset keeps the dismissed flag.
          const seen = ownOf(s.byCert, certId)?.moments?.readySeenAt;
          // Mobile 1.16: the exam-week checklist is about the exam itself (the
          // booking, the route, sleep), not study progress: a reset keeps it.
          const examWeek = ownOf(s.byCert, certId)?.moments?.examWeek;
          // Build F: a reset is a fresh start for milestones too. The launch
          // back-fill is marked as already done (nothing found, summary seen),
          // so it never runs again and re-awards from older data.
          // The catalogue fill is marked done too (mobile 1.11), for the same reason.
          const milestones: CertMilestones = { earned: {}, backfill: { at: Date.now(), count: 0, seen: true }, catalog: CATALOG_VERSION };
          const base: CertProgress = { ...emptyCert(), milestones };
          const fresh: CertProgress = seen || examWeek ? { ...base, moments: { ...(seen ? { readySeenAt: seen } : {}), ...(examWeek ? { examWeek } : {}) } } : base;
          // Mobile 1.13: the plant goes back to a seed, but keeps its name,
          // species, look and unlocks (cosmetics carry no readiness claim).
          // `replantedAt` stops an old exam-ready moment helping it bloom.
          // Mobile 1.14: every unlock open now (growth, badges and planters from
          // ANY exam, and what was kept before) goes into `kept`, so the look
          // the learner earned survives the seed.
          // The keepsakes on show are written down first (freezeKeepsakes), so a
          // default "first three earned" never reshuffles when badges go.
          const plant = ownOf(s.byCert, certId)?.plant;
          const marks = Object.values(s.byCert).map((c) => ({ earned: c?.milestones?.earned, planters: c?.milestones?.planters }));
          if (plant) fresh.plant = resetPlant(freezeKeepsakes(plant, marks), Date.now(), keepOnReset(plant, marks));
          // Code review M6: another exam's plant never loses a keepsake or a
          // planter because THIS exam's badges were cleared.
          const byCert = { ...s.byCert, [certId]: fresh };
          const resetMarks = { earned: ownOf(s.byCert, certId)?.milestones?.earned, planters: ownOf(s.byCert, certId)?.milestones?.planters };
          for (const [id, c] of Object.entries(s.byCert)) {
            if (id === certId || !c?.plant) continue;
            const kept = keepThroughOtherReset(c.plant, marks, resetMarks);
            if (kept !== c.plant) byCert[id] = { ...c, plant: kept };
          }
          return { byCert, days };
        }),
    }),
    {
      name: 'aurivan.progress.v1',
      storage: persistStorage,
      // A failed load is noticed (store/hydration.ts), so the app shows a recovery screen, not a forever splash.
      onRehydrateStorage: watchHydration('progress'),
      // v2: the single `day` plan became `days`, keyed by cert id.
      // Phase 5a added only OPTIONAL fields (AnswerRecord.lastAssisted,
      // MistakeEntry.confidence), so no version bump: old saves load as-is.
      // Phase 5b added one more optional field (CertProgress.moments): same.
      // Study notes added CertProgress.notesRead; `normalize` gives old saves [].
      // The game recap added CertProgress.gameRecent; `normalize` gives old saves {}.
      // Build C added only OPTIONAL fields (AnswerRecord.ms / lastConfidence,
      // CertProgress.mastery): no version bump, old saves load as-is.
      // Build E added only OPTIONAL fields (CertProgress.studyPath / cards): same.
      // Build F added only OPTIONAL fields (CertProgress.gameGrowth / milestones,
      // AnswerRecord.lastGame): same.
      // Mobile 1.7 added one OPTIONAL top-level field (reports): same.
      // Mobile 1.16 added CertMoments.examWeek, OPTIONAL: same.
      // Mobile 1.13 added CertProgress.plant and the top-level plantSettings,
      // both OPTIONAL: an old save loads as-is and has no plant until the
      // learner plants one (never one made up for them).
      // Mobile 1.24 added AnswerRecord.lastRetest (the retest rule), OPTIONAL: same.
      // Mobile 1.25 added CertProgress.notesViewed (started notes) and
      // notesEverRead (a count), both OPTIONAL: same (`normalize` gives old
      // saves [] and the count of notes read).
      // "Your note" added CertProgress.qNotes, OPTIONAL: same (no notes until one is written).
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
  const range = readinessRange(cert, readinessFor(cert, answers));
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
  const cp = ownOf(s.byCert, certId);
  return cp ? normalize(cp) : EMPTY;
}
const EMPTY = emptyCert();
