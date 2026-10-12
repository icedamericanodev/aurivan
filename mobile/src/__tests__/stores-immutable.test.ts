/**
 * The stores never change saved data in place (review of PR #48, m3).
 *
 * Why it matters: the save adapter (store/storage.ts) skips a save when every
 * top-level field is the very same object as in the last save. That is only
 * safe while every action makes NEW objects for what it changes. An action
 * that wrote into the old object instead would keep the same top-level
 * object, and its change would never reach the phone.
 *
 * How: before each action, the whole previous state is deep-frozen (so a
 * write into it throws) and copied as JSON; after the action, the previous
 * state must still read exactly as it did. Every action of every persisted
 * store runs at least once, most of them on a state that already holds data.
 */
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { lessonsFor } from '../content/lessons';
import { noteSubtopics } from '../content/notes';
import { newDayPlan } from '../engine/dayPlan';
import { growthTier } from '../engine/games/growth';
import { PLANT_SPECIES } from '../engine/plant';
import { computeReadiness } from '../engine/readiness';
import { dayKey } from '../engine/streak';
import { playableGames } from '../lib/games';
import { checkMilestones } from '../lib/milestones';
import { checkPlant, plantFor } from '../lib/plant';
import { startMock, startPractice } from '../lib/sessions';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Store = { getState: () => object };

function deepFreeze(o: unknown): void {
  if (!o || typeof o !== 'object' || Object.isFrozen(o)) return;
  Object.freeze(o);
  for (const v of Object.values(o)) deepFreeze(v);
}
/** The saved data of a state (its actions left out). */
const dataOf = (s: object) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function'));

/** Runs each step on a frozen copy-checked state: none may change the state it started from. */
function runUntouched(store: Store, steps: [string, () => unknown][]) {
  for (const [label, step] of steps) {
    const before = store.getState();
    const was = JSON.stringify(dataOf(before));
    deepFreeze(before);
    try {
      step();
    } catch (e) {
      throw new Error(`${label}: ${(e as Error).message}`);
    }
    expect({ label, state: JSON.stringify(dataOf(before)) }).toEqual({ label, state: was });
  }
}

const cert = CERTIFICATIONS.find((c) => c.id === 'cisa')!;
const q = getAllQuestions('cisa')
  .slice(0, 8)
  .map((x) => x.id);
const now = Date.now();
const day = dayKey(now);
const p = () => useProgress.getState();

beforeEach(() => {
  useProgress.setState(useProgress.getInitialState(), true);
  useSettings.setState({ ...useSettings.getInitialState(), activeCertId: 'cisa', onboarded: true }, true);
  useSeen.setState(useSeen.getInitialState(), true);
  useSession.setState(useSession.getInitialState(), true);
  useBackup.setState(useBackup.getInitialState(), true);
});

it('progress: no action changes the state it started from', () => {
  const game = playableGames('cisa')[0];
  runUntouched(useProgress, [
    ['recordAnswer (first)', () => p().recordAnswer('cisa', q[0], true, 'sure')],
    ['recordAnswer (wrong)', () => p().recordAnswer('cisa', q[1], false, 'unsure')],
    ['recordAnswer (again, assisted)', () => p().recordAnswer('cisa', q[0], false, 'guessing', { assisted: true, ms: 40_000 })],
    ['recordAnswer (no readiness log)', () => p().recordAnswer('cisa', q[2], true, 'sure', { schedule: false, logReadiness: false })],
    ['logReadinessNow', () => p().logReadinessNow('cisa')],
    ['queueForReview', () => p().queueForReview('cisa', [q[3], q[4]])],
    ['toggleBookmark (on)', () => p().toggleBookmark('cisa', q[5])],
    ['toggleBookmark (off)', () => p().toggleBookmark('cisa', q[5])],
    ['recordMistake', () => p().recordMistake('cisa', q[1], 'B', 'unsure')],
    ['tagMistake', () => p().tagMistake('cisa', q[1], 'priority')],
    ['completeLesson', () => p().completeLesson('cisa', lessonsFor('cisa')[0].id)],
    ['setNoteRead (read)', () => p().setNoteRead('cisa', noteSubtopics('cisa')[0].id, true)],
    ['setNoteRead (unread)', () => p().setNoteRead('cisa', noteSubtopics('cisa')[0].id, false)],
    ['recordGame', () => p().recordGame('cisa', game, 7)],
    ['noteGameRound', () => p().noteGameRound('cisa', game, { rate: 0.9, tier: growthTier(undefined) })],
    [
      'recordMock',
      () =>
        p().recordMock('cisa', {
          id: 'mock-1',
          finishedAt: now,
          total: 50,
          correct: 35,
          minutesUsed: 60,
          byDomain: { '1': { total: 10, correct: 7 } },
          timing: 'standard',
        } as never),
    ],
    ['noteReadiness', () => p().noteReadiness('cisa', day, 60)],
    ['dismissReady', () => p().dismissReady('cisa')],
    ['tickExamWeek (tick)', () => p().tickExamWeek('cisa', '2027-06-01', 'booking')],
    ['tickExamWeek (untick)', () => p().tickExamWeek('cisa', '2027-06-01', 'booking')],
    ['hideExamWeek', () => p().hideExamWeek('cisa', '2027-06-01')],
    ['setPathCursor', () => p().setPathCursor('cisa', 'inOrder', 'all', q[6])],
    ['recordCard', () => p().recordCard('cisa', 'card-1', true)],
    ['startDay', () => p().startDay(newDayPlan(day, 'cisa', [], computeReadiness(cert, p().byCert.cisa!.answers)))],
    ['logActivity', () => p().logActivity('cisa', { kind: 'lesson', lessonId: 'x', minutes: 3 })],
    ['markCelebrated', () => p().markCelebrated('cisa')],
    ['updatePlant (plant a seed)', () => plantFor('cisa', 'oak', 'Kai', now)],
    ['updatePlant (growth check)', () => checkPlant('cisa', now + 86_400_000)],
    ['updateMilestones', () => checkMilestones('cisa', { now })],
    ['renamePlant', () => p().renamePlant('cisa', 'Ivy')],
    ['switchPlantSpecies', () => p().switchPlantSpecies('cisa', PLANT_SPECIES[1])],
    ['setPlantSettings', () => p().setPlantSettings({ quietLook: true })],
    ['setPlantLook', () => p().setPlantLook('cisa', { visitor: null })],
    ['logReport', () => p().logReport({ ref: 'R-TEST', item: `q:${q[0]}`, reason: 'key', cert: 'cisa' })],
    ['markCreditSeen', () => p().markCreditSeen(['R-TEST'])],
    ['clearReports', () => p().clearReports()],
    ['resetCert', () => p().resetCert('cisa')],
  ]);
});

it('session: no action changes the state it started from', () => {
  const s = () => useSession.getState();
  startPractice('cisa', { count: 3 });
  const ids = () => s().active!.questionIds;
  runUntouched(useSession, [
    ['answer', () => s().answer(ids()[0], { display: 'A', correct: true, confidence: 'sure', ms: 30_000 })],
    ['goTo', () => s().goTo(1)],
    ['toggleFlag (on)', () => s().toggleFlag(ids()[1])],
    ['toggleFlag (off)', () => s().toggleFlag(ids()[1])],
    ['markCoached', () => s().markCoached(ids()[1])],
    ['addVisitTime', () => s().addVisitTime(ids()[2], 5_000)],
    ['setCheckpoints', () => s().setCheckpoints([{ at: 0.25, done: 1, deviation: 0, minutes: 5 }])],
    ['finish', () => s().finish(now)],
    ['setMilestone', () => s().setMilestone('first-session')],
    ['clear', () => s().clear()],
    ['start (a mock)', () => startMock('cisa', 50, { timing: 'standard' })],
  ]);
});

it('settings: no action changes the state it started from', () => {
  const s = () => useSettings.getState();
  runUntouched(useSettings, [
    ['completeOnboarding', () => s().completeOnboarding('cisa', '2027-06-01', { familiarity: 'some', dailyMinutes: 30 })],
    ['setFit', () => s().setFit({ dailyMinutes: 10, examFocused: true })],
    ['dismissFitPrompt', () => s().dismissFitPrompt()],
    ['noteFitAsked', () => s().noteFitAsked(day)],
    ['setActiveCert', () => s().setActiveCert('cisa')],
    ['setExamDate', () => s().setExamDate('cisa', '2027-07-01')],
    ['setExamDate (cleared)', () => s().setExamDate('cisa')],
    ['setTheme', () => s().setTheme('dark')],
    ['setMotion', () => s().setMotion('reduced')],
    ['setShuffle', () => s().setShuffle(false)],
    ['setDailyGoal', () => s().setDailyGoal(30)],
    ['setReminder', () => s().setReminder({ ...s().reminder, enabled: true, hour: 8 })],
    ['setHaptics', () => s().setHaptics(false)],
    ['markRulesSeen', () => s().markRulesSeen('trap')],
    ['setPracticeTimer', () => s().setPracticeTimer(true)],
    ['answerPaceOffer', () => s().answerPaceOffer('dismissed')],
    ['setStudyMode', () => s().setStudyMode('guided')],
    ['setStudyDomain', () => s().setStudyDomain('1')],
    ['setStudySize', () => s().setStudySize(20)],
    ['setBadgesHidden', () => s().setBadgesHidden(true)],
  ]);
});

it('seen and backup: no action changes the state it started from', () => {
  const s = () => useSeen.getState();
  runUntouched(useSeen, [
    ['see', () => s().see('test:key', [1, 2, 3])],
    ['see (again, new values)', () => s().see('test:key', [1, 2, 4])],
    ['played', () => s().played('growth')],
    ['claimDay', () => s().claimDay('test:key', day)],
    ['seeCase', () => s().seeCase('cisa', now)],
    ['noteBadgeMoment', () => s().noteBadgeMoment(now)],
    ['setBadgeSort', () => s().setBadgeSort('recent')],
    ['noteQuietGrowth', () => s().noteQuietGrowth('cisa', 2)],
    ['seeQuietGrowth', () => s().seeQuietGrowth('cisa')],
    ['forgetValues', () => s().forgetValues()],
  ]);
  const b = () => useBackup.getState();
  runUntouched(useBackup, [
    ['setLastBackup', () => b().setLastBackup(now)],
    ['setUndo', () => b().setUndo(null)],
  ]);
});
