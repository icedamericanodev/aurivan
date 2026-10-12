/**
 * Uplift Phase 7: the per-account storage budget in docs/mobile/SCALING.md,
 * measured on real fitted payloads (spec §8.2). A learner who has answered
 * every CISA question several times, with reviews, mistakes, 50 mocks, the
 * readiness log, badges and a plant, must sync well under the 1.5 MB cap.
 * If a release grows the saved data past these bounds, this test says so
 * before SCALING.md's numbers quietly go stale.
 */
import { gzipSync } from 'zlib';
import { getAllQuestions } from '../content/loader';
import { CERTIFICATIONS } from '../content/certifications';
import { fitForBackup, utf8Bytes } from '../engine/backup';
import { dayKey } from '../engine/streak';
import { stableStringify, toPayload } from '../engine/syncMerge';
import { MAX_PUSH_BYTES, phoneSides } from '../lib/syncCore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const DAY = 86_400_000;

function heavyLearner() {
  const ids = getAllQuestions('cisa').map((q) => q.id);
  const answers: Record<string, unknown> = {};
  const review: Record<string, unknown> = {};
  const mistakes: Record<string, unknown> = {};
  ids.forEach((id, i) => {
    answers[id] = { attempts: 4, correctCount: 3, lastCorrect: i % 3 !== 0, lastAt: T0 - (i % 90) * DAY, ms: 41_000, lastConfidence: 'sure' };
    review[id] = { box: 1 + (i % 5), dueAt: T0 + (i % 30) * DAY, lastSeen: T0 - (i % 60) * DAY, reps: 3 };
    if (i % 3 === 0) mistakes[id] = { at: T0 - (i % 40) * DAY, picked: 'B', slip: 'priority', resolved: i % 2 === 0, confidence: 'unsure' };
  });
  const mocks = Array.from({ length: 50 }, (_, i) => ({
    id: `mock-${i}`,
    finishedAt: T0 - i * 2 * DAY,
    total: 150,
    correct: 110,
    minutesUsed: 200,
    byDomain: { '1': { total: 27, correct: 20 }, '2': { total: 27, correct: 19 }, '3': { total: 18, correct: 13 }, '4': { total: 39, correct: 28 }, '5': { total: 39, correct: 30 } },
    timing: 'standard',
    minutesAllowed: 240,
    medianSec: 70,
    unanswered: 0,
    checkpoints: [0.1, -0.05, 0, 0.02],
  }));
  const settings = { onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2027-01-15' }, theme: 'system', motion: 'system', shuffleOptions: true, dailyGoal: 40, reminder: { enabled: true, hour: 7, minute: 30 }, haptics: true, gameRulesSeen: ['trap', 'sprint', 'daylight', 'stones', 'rumor', 'field', 'canopy'], practiceTimer: true, badgesHidden: false, studyMode: 'smart', studySize: 20, familiarity: 'some', dailyMinutes: 45, examFocused: true, fitPrompt: 'answered' };
  const progress = {
    byCert: {
      cisa: {
        answers,
        review,
        bookmarks: ids.slice(0, 120),
        mocks,
        lessonsDone: [],
        mistakes,
        gameBest: { trap: 9, sprint: 40, daylight: 7 },
        gameRecent: { trap: [5, 6, 7, 8, 9], sprint: [30, 35, 40] },
        notesRead: [],
        moments: { readiness: Array.from({ length: 30 }, (_, k) => ({ day: dayKey(T0 - k * DAY), min: 60 + (k % 10), last: 65 })) },
        milestones: { earned: { 'first-foothold': T0 - 80 * DAY, 'rooted:10': T0 - 60 * DAY, graduate: T0 - 20 * DAY }, counts: { longRecall: 150, graduated: 400, loopFixed: 60, gameFixes: 20, paceRounds: 6 }, sure: Array.from({ length: 50 }, (_, k) => k % 7 !== 0), longIds: ids.slice(0, 150), days: 120, lastDay: dayKey(T0) },
        plant: { species: 'oak', name: 'Kai', plantedAt: T0 - 100 * DAY, growth: 4, reached: { sprout: T0 - 90 * DAY, sapling: T0 - 60 * DAY, young: T0 - 30 * DAY } },
      },
    },
    streak: { current: 30, best: 45, lastDay: dayKey(T0), recentDays: Array.from({ length: 14 }, (_, k) => dayKey(T0 - k * DAY)).sort() },
    today: { day: dayKey(T0), answered: 20 },
    days: {},
    reports: [],
  };
  return { settings, progress };
}

it('a heavy learner syncs well under the 1.5 MB cap (SCALING.md unit budget)', () => {
  const phone = heavyLearner();
  const sides = phoneSides(fitForBackup(phone) as { settings: object; progress: object }, { settings: {}, progress: {} }, { now: T0, knownCertIds: CERTIFICATIONS.map((c) => c.id) });
  const progressText = JSON.stringify(toPayload(sides.progress));
  const settingsText = JSON.stringify(toPayload(sides.settings));
  const progressBytes = utf8Bytes(progressText);
  const settingsBytes = utf8Bytes(settingsText);
  const gz = gzipSync(Buffer.from(progressText)).length;
  // The figures SCALING.md quotes (rounded there): progress about 263 KB, about 17 KB gzipped; settings about 350 B.
  expect(progressBytes).toBeLessThan(400_000);
  expect(progressBytes).toBeLessThan(MAX_PUSH_BYTES / 3);
  expect(gz).toBeLessThan(60_000);
  expect(settingsBytes).toBeLessThan(2_000);
  // The canonical form is stable: the same data gives the same text.
  expect(stableStringify(toPayload(sides.progress))).toBe(stableStringify(JSON.parse(progressText)));
  // Recorded for SCALING.md (visible with --verbose).
  console.log(`budget: progress ${progressBytes} B (gzip ${gz} B), settings ${settingsBytes} B`);
});
