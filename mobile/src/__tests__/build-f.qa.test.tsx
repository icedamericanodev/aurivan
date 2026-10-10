/**
 * QA Build F (PR #35): milestones, game levels and the three content games,
 * walked as journeys against the real stores and the real CISA content.
 *
 * 1. Upgrade: a 1.5 learner with real-looking history (a lesson, mocks with
 *    pacing, tagged mistakes fixed on later days, sure answers, a streak)
 *    gets ONE quiet back-fill with the right count, no burst afterwards,
 *    and a Milestones screen that splits earned / closest next / still ahead.
 * 2. Earning: one moment on Results, the next one waits for the next
 *    session, Coach me never earns, bad sessions never take a badge away.
 * 3. Reset and restore: reset clears milestones; an older backup re-backfills
 *    quietly; a backup's unsupported badges are dropped, only those.
 * 4. Game levels through Field Guide, Canopy Call and Stepping Stones.
 * 5. Field Guide, Canopy Call and Stepping Stones on real content.
 * 6. None of the three new games moves readiness or mastery.
 *
 * Bugs found are pinned with it.failing (they flip to failures once fixed).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getCertification } from '../content/certifications';
import { getRoleDeck, getStepSequences } from '../content/games';
import { findQuestion, getDomainQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import { buildCanopyRound, canopyCardId, confusionPairs, type CanopyAnswer, type CanopyTier } from '../engine/games/canopyCall';
import { buildFieldRound, fieldTerms } from '../engine/games/fieldGuide';
import { GAME_TIERS, tierChangeLine } from '../engine/games/growth';
import { buildStonesRound, checkPath, keyWords, ordinal, stonesCardId, stonesPool, type StonesTier } from '../engine/games/steppingStones';
import { badgeCount, badgeViews, MILESTONES, nearest } from '../engine/milestones';
import { createRng } from '../engine/random';
import { computeReadiness } from '../engine/readiness';
import { slipCoach, type SlipInput } from '../engine/slipCoach';
import { dayKey } from '../engine/streak';
import { runnerUp } from '../engine/tips';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { finishSession } from '../lib/finishSession';
import { finishGameRound } from '../lib/gameRounds';
import { canPlay } from '../lib/games';
import { backfillLine, checkMilestones, ensureBackfill, marksFor, milestoneFacts } from '../lib/milestones';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress, type CertProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import Milestones from '../app/milestones';
import Mistakes from '../app/mistakes';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.6.0' } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const cert = getCertification('cisa')!;
const cp = () => selectCert(useProgress.getState(), 'cisa');
const d1 = getDomainQuestions('cisa', '1').map((q) => q.id);
const d3 = getDomainQuestions('cisa', '3').map((q) => q.id);
const d4 = getDomainQuestions('cisa', '4').map((q) => q.id);
const d5 = getDomainQuestions('cisa', '5').map((q) => q.id);
/** Topic 2A2 (lesson cisa-l-d2-governance): 5 of its questions. */
const TOPIC_2A2 = ['d2_001', 'd2_059', 'd2_003', 'd2_010', 'd2_042'];
const at = (daysAgo: number, hour = 10) => new Date(2026, 9, 12 - daysAgo, hour, 0, 0).getTime();
/** A letter that is neither the key nor the "Final two" runner-up. */
const plainWrong = (id: string) => {
  const q = findQuestion('cisa', id)!;
  const ru = runnerUp(q.tips, q.correct);
  return (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== ru)!;
};

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, practiceTimer: false });
});
afterEach(() => {
  if (r) act(() => r!.unmount());
  r = undefined;
  jest.useRealTimers();
});

// ── A 1.5 learner's save (no milestones, no game levels, no fixedLater) ──
const MISTAKE_IDS = d1.slice(0, 13);
function save15(): { cert: CertProgress; streak: { current: number; best: number; lastDay: string; recentDays: string[] } } {
  const answers: CertProgress['answers'] = {};
  const mistakes: CertProgress['mistakes'] = {};
  // D4: 30 right over 12 study days, 25 of them marked "sure".
  d4.slice(0, 30).forEach((id, k) => {
    answers[id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: at((k % 12) + 1, 9 + (k % 5)), ...(k < 25 ? { lastConfidence: 'sure' as const } : {}) };
  });
  // D1: 13 logged mistakes (10 days ago), all tagged with a slip.
  MISTAKE_IDS.forEach((id, k) => {
    mistakes[id] = { picked: plainWrong(id), at: at(10), slip: k % 2 ? 'role' : 'priority', resolved: k < 10 };
    // 10 fixed 3 days ago (a later day); 2 still open; 1 more below fixed the SAME day.
    answers[id] = k < 10 ? { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: at(3) } : { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: at(10) };
  });
  // One mistake fixed the same day it was made: not a later-day fix.
  const same = d1[13];
  mistakes[same] = { picked: plainWrong(same), at: at(5, 9), resolved: true };
  answers[same] = { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: at(5, 15) };
  // D1: 11 more right.
  d1.slice(14, 25).forEach((id) => (answers[id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: at(5) }));
  // Topic 2A2: the lesson done and 5 right.
  TOPIC_2A2.forEach((id) => (answers[id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: at(4) }));
  // D5: 20 right, but every one after Coach me.
  d5.slice(0, 20).forEach((id) => (answers[id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: at(6), lastAssisted: true }));
  return {
    cert: {
      answers,
      review: { [MISTAKE_IDS[11]]: { box: 1, dueAt: at(10), lastSeen: at(10), reps: 1 } },
      bookmarks: [d4[3]],
      mocks: [
        // A full, timed mock with pacing, every question answered, all checks within 10%.
        { id: 'm2', finishedAt: at(2), total: 150, correct: 112, minutesUsed: 205, byDomain: {}, timing: 'standard', minutesAllowed: 240, medianSec: 78, unanswered: 0, checkpoints: [0.02, 0.05, -0.04] },
        // An older untimed mock, a month ago (then a gap of 18 days).
        { id: 'm1', finishedAt: at(30), total: 50, correct: 31, minutesUsed: 70, byDomain: {}, timing: 'untimed', unanswered: 3 },
      ],
      lessonsDone: ['cisa-l-d2-governance'],
      mistakes,
      gameBest: {},
      gameRecent: {},
      notesRead: ['4B1.2'],
    },
    // Studied on each of the last 12 days.
    streak: { current: 12, best: 12, lastDay: dayKey(at(1)), recentDays: Array.from({ length: 12 }, (_, k) => dayKey(at(12 - k))) },
  };
}
/**
 * The 10 marks (9 milestones: Firm Footing has two leaves) that 1.5 save shows.
 * Fresh Start is earned live only (code review Build F): old data can't show a return AND a finished session.
 */
const EXPECTED_MARKS = [
  'dress-rehearsal',
  'firm-footing:1',
  'firm-footing:4',
  'first-foothold',
  'know-what-you-know',
  'loop-closed',
  'on-pace',
  'rooted:10',
  'slip-spotter',
  'topic-clear',
];
function upgrade() {
  const s = save15();
  useProgress.setState({ byCert: { cisa: s.cert }, streak: s.streak });
}

describe('Journey 1: a 1.5 learner upgrades', () => {
  it('the back-fill earns quietly with ONE summary line and the right count', () => {
    upgrade();
    const n = ensureBackfill('cisa', T0);
    const m = cp().milestones!;
    expect(Object.keys(m.earned).sort()).toEqual(EXPECTED_MARKS);
    // Firm Footing's two leaves count once: 9 milestones, not 10.
    expect(n).toBe(9);
    expect(badgeCount(Object.keys(m.earned))).toBe(9);
    expect(m.backfill).toEqual({ at: T0, count: 9 });
    expect(backfillLine(n!)).toBe('You’d already earned 9 milestones.');
    // Quiet: nothing queued for a moment.
    expect(m.queue ?? []).toEqual([]);
    // Coach me answers (all of D5) never earned a leaf.
    expect(m.earned['firm-footing:5']).toBeUndefined();
    // Only the 10 mistakes fixed on a LATER day count; the same-day fix does not.
    expect(m.counts?.loopFixed).toBe(10);
    expect(MISTAKE_IDS.slice(0, 10).every((id) => cp().mistakes[id].fixedLater)).toBe(true);
    expect(cp().mistakes[d1[13]].fixedLater).toBeUndefined();
    // Study days: the 12 recent days and the month-old mock.
    expect(m.days).toBe(13);
    expect(m.lastDay).toBe(dayKey(at(1)));
  });

  it('no burst afterwards: the next session, game round and re-launch celebrate nothing', () => {
    upgrade();
    ensureBackfill('cisa', T0);
    expect(ensureBackfill('cisa', T0 + 1000)).toBeNull(); // a second launch does nothing
    startFromIds('cisa', [d3[0]], 'After the upgrade');
    useProgress.getState().recordAnswer('cisa', d3[0], true);
    finishSession();
    expect(useSession.getState().active!.milestone).toBeUndefined();
    const news = finishGameRound('cisa', 'field', { score: 9, rate: 0.75, tier: 'seedling' });
    expect(news.moment).toBeNull();
    expect(cp().milestones!.queue ?? []).toEqual([]);
    // A back-filled fix is never counted twice when answered right again later.
    jest.setSystemTime(T0 + DAY);
    useProgress.getState().recordAnswer('cisa', MISTAKE_IDS[0], true);
    expect(cp().milestones!.counts?.loopFixed).toBe(10);
    // The first open mistake fixed on a later day DOES count (and only once).
    useProgress.getState().recordAnswer('cisa', MISTAKE_IDS[10], true);
    useProgress.getState().recordAnswer('cisa', MISTAKE_IDS[10], true);
    expect(cp().milestones!.counts?.loopFixed).toBe(11);
  });

  it('the Milestones screen splits earned, closest next and still ahead, each badge once', () => {
    upgrade();
    ensureBackfill('cisa', T0);
    act(() => {
      r = create(<Milestones />);
    });
    const text = allText();
    expect(text).toContain('You’d already earned 9 milestones.');
    expect(text).toContain('9 of 15');
    expect(text).toContain('Firm Footing · IS Audit, IS Operations');
    expect(text).toContain('Rooted · 10 days');
    // The screen's own data, checked against the rules.
    const views = badgeViews(marksFor('cisa', cp(), T0), cp().milestones!.earned, 'milestone');
    const earned = views.filter((v) => v.earned.length).map((v) => v.def.id);
    const next = nearest(views.filter((v) => v.earned.length === 0 || v.next));
    const nextIds = next.map((v) => v.def.id);
    const ahead = views.filter((v) => v.earned.length === 0 && !nextIds.includes(v.def.id)).map((v) => v.def.id);
    expect(earned).toHaveLength(9);
    expect(next).toHaveLength(3);
    // Closest first.
    const progress = next.map((v) => v.next!.progress);
    expect([...progress].sort((a, b) => b - a)).toEqual(progress);
    // Every unearned milestone is either "closest next" or "still ahead", never both, never missing.
    const unearned = MILESTONES.map((b) => b.id).filter((id) => !earned.includes(id));
    expect([...ahead, ...nextIds.filter((id) => unearned.includes(id))].sort()).toEqual([...unearned].sort());
    expect(ahead.filter((id) => nextIds.includes(id))).toEqual([]);
    // Spoken: each closest-next row says "Not yet" with its progress line.
    for (const v of next) expect(labels().some((l) => l.startsWith(`${v.next!.label}. Not yet.`))).toBe(true);
    // Seen once: a second visit has no summary.
    expect(cp().milestones!.backfill!.seen).toBe(true);
  });
});

describe('Journey 2: earning a badge', () => {
  it('appears once on Results; a second badge in the same session waits for the next session', () => {
    // What app/_layout.tsx does at launch (a new learner: nothing found).
    ensureBackfill('cisa', T0);
    startFromIds('cisa', d4.slice(0, 20), 'Twenty');
    d4.slice(0, 20).forEach((id) => useProgress.getState().recordAnswer('cisa', id, true));
    finishSession();
    // First Foothold and Firm Footing · IS Operations both met; Results shows the first.
    expect(useSession.getState().active!.milestone).toBe('first-foothold');
    expect(cp().milestones!.queue).toEqual(['firm-footing:4']);
    // Next session: the waiting one, and nothing else.
    startFromIds('cisa', [d3[0]], 'Next');
    useProgress.getState().recordAnswer('cisa', d3[0], true);
    finishSession();
    expect(useSession.getState().active!.milestone).toBe('firm-footing:4');
    startFromIds('cisa', [d3[1]], 'And next');
    useProgress.getState().recordAnswer('cisa', d3[1], true);
    finishSession();
    expect(useSession.getState().active!.milestone).toBeUndefined();
  });

  it('Coach me answers earn nothing, even a whole session of them', () => {
    startFromIds('cisa', d4.slice(0, 25), 'Coached');
    d4.slice(0, 25).forEach((id) => useProgress.getState().recordAnswer('cisa', id, true, 'sure', { assisted: true }));
    finishSession();
    expect(useSession.getState().active!.milestone).toBeUndefined();
    expect(Object.keys(cp().milestones?.earned ?? {})).toEqual([]);
    expect(cp().milestones?.sure ?? []).toEqual([]);
  });

  it('badges are never lost, re-dated or re-celebrated after bad sessions', () => {
    startFromIds('cisa', d4.slice(0, 20), 'Good');
    d4.slice(0, 20).forEach((id) => useProgress.getState().recordAnswer('cisa', id, true));
    finishSession();
    finishSession(); // a double tap changes nothing
    const before = { ...cp().milestones!.earned };
    // Three bad sessions on later days: every D4 answer wrong.
    for (let s = 1; s <= 3; s++) {
      jest.setSystemTime(T0 + s * DAY);
      startFromIds('cisa', d4.slice(0, 20), `Bad ${s}`);
      d4.slice(0, 20).forEach((id) => useProgress.getState().recordAnswer('cisa', id, false));
      finishSession();
    }
    const facts = milestoneFacts('cisa', cp(), { now: Date.now() })!;
    expect(facts.domains.find((d) => d.id === '4')!.mastery).toBe(0);
    expect(cp().milestones!.earned).toEqual(expect.objectContaining(before));
    expect(cp().milestones!.queue ?? []).not.toContain('first-foothold');
  });

  // BUG: the Milestones screen says "game answers don't count toward
  // milestones", but game answers (recorded with mastery: false) count as
  // clean answers for First Foothold, Firm Footing, Whole Map and Topic Clear.
  it('game answers (Daylight, Trap Spotter, Priority Lens, Sure Footing) never earn a milestone', () => {
    d4.slice(0, 20).forEach((id) => useProgress.getState().recordAnswer('cisa', id, true, undefined, { mastery: false }));
    checkMilestones('cisa', { finished: true });
    expect(cp().milestones?.earned['first-foothold']).toBeUndefined();
    expect(cp().milestones?.earned['firm-footing:4']).toBeUndefined();
  });
});

describe('Journey 3: reset and restore', () => {
  it('reset clears milestones, the queue and game levels', () => {
    upgrade();
    ensureBackfill('cisa', T0);
    finishGameRound('cisa', 'canopy', { score: 9, rate: 0.9, tier: 'seedling' });
    useProgress.getState().resetCert('cisa');
    // A reset leaves an empty record with the back-fill marked done (nothing found, seen).
    expect(cp().milestones?.earned).toEqual({});
    expect(cp().milestones?.queue).toBeUndefined();
    expect(cp().milestones?.backfill).toEqual({ at: expect.any(Number), count: 0, seen: true });
    expect(cp().gameGrowth).toBeUndefined();
  });

  // BUG: after a reset the launch back-fill runs again (milestones are gone)
  // and reads the streak's recent days, which a reset keeps. A learner who
  // studied 10+ of the last 14 days gets Rooted back at once, with the line
  // "You'd already earned 1 milestone." (lib/milestones.ts ensureBackfill).
  it('after a reset, the back-fill finds nothing (no Rooted from the kept streak)', () => {
    upgrade();
    ensureBackfill('cisa', T0);
    useProgress.getState().resetCert('cisa');
    // What app/_layout.tsx does when it sees no back-fill mark.
    // The reset marked the back-fill as done, so it doesn't run at all (null) and finds nothing.
    const n = ensureBackfill('cisa', T0);
    expect(n ?? 0).toBe(0);
    expect(cp().milestones?.earned ?? {}).toEqual({});
    expect(cp().milestones?.days ?? 0).toBe(0);
  });

  it('restoring an older backup (no milestones) re-backfills quietly: same badges, no moments', async () => {
    upgrade();
    ensureBackfill('cisa', T0);
    // Something new earned and celebrated in 1.6, then a 1.5-shaped backup restored.
    const file = currentBackup(T0);
    const old = file.stores.progress.state.byCert.cisa as CertProgress;
    delete old.milestones;
    delete old.gameGrowth;
    for (const m of Object.values(old.mistakes)) delete m.fixedLater;
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.milestones).toBeUndefined();
    const out = await restoreBackup(read.data, { now: T0 });
    expect(out.kind).toBe('ok');
    expect(cp().milestones).toBeUndefined();
    // app/_layout.tsx: no back-fill mark → back-fill again.
    expect(ensureBackfill('cisa', T0)).toBe(9);
    expect(Object.keys(cp().milestones!.earned).sort()).toEqual(EXPECTED_MARKS);
    expect(cp().milestones!.queue ?? []).toEqual([]);
    expect(cp().milestones!.counts?.loopFixed).toBe(10); // not doubled
    startFromIds('cisa', [d3[0]], 'After restore');
    useProgress.getState().recordAnswer('cisa', d3[0], true);
    finishSession();
    expect(useSession.getState().active!.milestone).toBeUndefined();
  });

  it('a backup whose badges the data cannot support drops only those badges', async () => {
    upgrade();
    ensureBackfill('cisa', T0);
    const file = currentBackup(T0);
    const m = file.stores.progress.state.byCert.cisa.milestones!;
    const fake = ['graduate', 'long-memory', 'rooted:60', 'rooted:30', 'whole-grove', 'mindset-shift', 'snare-wise', 'firm-footing:3', 'made-up'];
    for (const k of fake) m.earned[k] = T0;
    m.queue = ['rooted:30', 'firm-footing:4', 'whole-grove'];
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    const back = read.data.progress.byCert.cisa.milestones!;
    expect(Object.keys(back.earned).sort()).toEqual(EXPECTED_MARKS);
    expect(back.queue).toEqual(['firm-footing:4']);
    expect(back.backfill).toEqual(expect.objectContaining({ count: 9 }));
    await restoreBackup(read.data, { now: T0 });
    expect(Object.keys(cp().milestones!.earned).sort()).toEqual(EXPECTED_MARKS);
    // The back-fill already ran for this data: it does not run (or speak) again.
    expect(ensureBackfill('cisa', T0)).toBeNull();
  });
});

describe('Journey 4: game levels through the three new games', () => {
  it('Field Guide: two rounds at 80% or more grow Seedling to Sapling', () => {
    const a = finishGameRound('cisa', 'field', { score: 10, rate: 10 / 12, tier: 'seedling' });
    expect(a.change).toBeNull();
    const b = finishGameRound('cisa', 'field', { score: 12, rate: 1, tier: 'seedling' });
    expect(b.change).toBe('up');
    expect(b.tier).toBe('sapling');
    expect(tierChangeLine(b.change, b.tier)).toBe('You’ve grown to Sapling. Your next round starts there.');
    // 9 of 12 (75%) is not a promoting round.
    finishGameRound('cisa', 'field', { score: 9, rate: 9 / 12, tier: 'sapling' });
    expect(finishGameRound('cisa', 'field', { score: 9, rate: 9 / 12, tier: 'sapling' }).change).toBeNull();
  });

  it('Canopy Call: two rounds under 50% step back, in kind words; exactly 5 of 10 does not', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { canopy: { tier: 'sapling', up: 0, down: 0 } } } } });
    finishGameRound('cisa', 'canopy', { score: 5, rate: 0.5, tier: 'sapling' });
    expect(finishGameRound('cisa', 'canopy', { score: 5, rate: 0.5, tier: 'sapling' }).change).toBeNull();
    finishGameRound('cisa', 'canopy', { score: 4, rate: 0.4, tier: 'sapling' });
    const down = finishGameRound('cisa', 'canopy', { score: 3, rate: 0.3, tier: 'sapling' });
    expect(down.change).toBe('down');
    expect(down.tier).toBe('seedling');
    const line = tierChangeLine(down.change, down.tier)!;
    expect(line).toBe('Back to Seedling for a few rounds.');
    expect(line).not.toMatch(/lost|lose|fail|demot|drop|wrong|bad/i);
  });

  it('Stepping Stones: rounds at another level never move the learner’s level', () => {
    // A Seedling learner tries Heartwood and does badly, twice.
    for (let k = 0; k < 3; k++) {
      const n = finishGameRound('cisa', 'stones', { score: 0, rate: 0, tier: 'heartwood', hits: [false, false, false] });
      expect(n.change).toBeNull();
      expect(n.tier).toBe('seedling');
    }
    // Then aces Sapling twice: still Seedling (only rounds AT your level move you).
    finishGameRound('cisa', 'stones', { score: 21, rate: 1, tier: 'sapling' });
    expect(finishGameRound('cisa', 'stones', { score: 21, rate: 1, tier: 'sapling' }).tier).toBe('seedling');
    expect(cp().gameGrowth!.stones).toEqual(expect.objectContaining({ tier: 'seedling', up: 0, down: 0 }));
    // The off-level hits are still kept for the skill record.
    expect(cp().gameGrowth!.stones!.hits!.length).toBe(9);
    // Two good rounds at Seedling: grow.
    finishGameRound('cisa', 'stones', { score: 15, rate: 1, tier: 'seedling' });
    expect(finishGameRound('cisa', 'stones', { score: 15, rate: 1, tier: 'seedling' }).change).toBe('up');
  });
});

describe('Journey 5a: Field Guide on the real notes', () => {
  const all = fieldTerms(getNotes('cisa'));
  const bigTopic = (topicId: string) => all.filter((t) => t.topicId === topicId).length >= 4;

  it('every board, at every level, has 4 different terms with 4 different meanings', () => {
    for (const tier of GAME_TIERS) {
      for (let seed = 1; seed <= 40; seed++) {
        const boards = buildFieldRound(all, undefined, tier, createRng(seed), T0);
        expect(boards).toHaveLength(3);
        const ids = boards.flatMap((b) => b.terms.map((t) => t.id));
        expect(new Set(ids).size).toBe(12);
        for (const b of boards) {
          expect(new Set(b.terms.map((t) => t.definition)).size).toBe(4);
          expect([...b.defOrder].sort()).toEqual([0, 1, 2, 3]);
          if (tier === 'heartwood') b.choices!.forEach((ch, k) => expect(ch.filter((c) => c.id === b.terms[k].id)).toHaveLength(1));
        }
      }
    }
  });

  it('a term missed on the first try comes back in the next round (its card is due at once)', () => {
    const missed = all.find((t) => bigTopic(t.topicId) && t.topicId.startsWith('4'))!;
    useProgress.getState().recordCard('cisa', missed.id, false);
    expect(cp().cards![missed.id].box).toBe(1);
    // A term right on the first try leaves no card (nothing to review).
    useProgress.getState().recordCard('cisa', all[1].id, true);
    expect(cp().cards![all[1].id]).toBeUndefined();
    for (const tier of GAME_TIERS) {
      for (let seed = 1; seed <= 20; seed++) {
        const ids = buildFieldRound(all, cp().cards, tier, createRng(seed), Date.now()).flatMap((b) => b.terms.map((t) => t.id));
        expect(ids).toContain(missed.id);
      }
    }
  });

  // BUG: a missed card set right the SAME day (the next round: it is due at
  // once) moves to box 2, so a right answer on a LATER day no longer counts
  // as a game miss fixed (Back on the Path). Question misses keep their miss
  // day until fixed on a later day; card misses lose it (store/progress.ts recordCard).
  it('Back on the Path: a missed term, right again the same day and then on a later day, counts as fixed', () => {
    const t = all[0];
    useProgress.getState().recordCard('cisa', t.id, false); // missed
    jest.setSystemTime(T0 + 60_000);
    useProgress.getState().recordCard('cisa', t.id, true); // "Play again", same day
    jest.setSystemTime(T0 + 2 * DAY);
    useProgress.getState().recordCard('cisa', t.id, true); // a later day
    expect(cp().milestones?.counts?.gameFixes ?? 0).toBe(1);
  });

  it('Back on the Path: a missed term right on a later day (first time back) counts once', () => {
    const t = all[0];
    useProgress.getState().recordCard('cisa', t.id, false);
    jest.setSystemTime(T0 + DAY);
    useProgress.getState().recordCard('cisa', t.id, true);
    useProgress.getState().recordCard('cisa', t.id, true);
    expect(cp().milestones?.counts?.gameFixes).toBe(1);
  });
});

describe('Journey 5b: Canopy Call on the reviewed deck', () => {
  const deck = getRoleDeck('cisa')!;
  const TIERS: CanopyTier[] = ['seedling', 'sapling', 'heartwood'];

  it('excluded chips never appear in any round, at any level', () => {
    let checked = 0;
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 150; seed++) {
        for (const it of buildCanopyRound(deck, undefined, tier, createRng(seed), T0)) {
          expect(it.chips).toContain(it.card.role);
          for (const x of it.card.excludeChips) expect(it.chips).not.toContain(x);
          expect(new Set(it.chips).size).toBe(it.chips.length);
          if (it.card.excludeChips.length) checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('confusion pairs on the end screen group the wrong calls, most frequent first, in plain words', () => {
    const owner = deck.cards.filter((c) => c.role === 'data_owner').slice(0, 3);
    const board = deck.cards.filter((c) => c.role === 'board').slice(0, 2);
    const audit = deck.cards.find((c) => c.role === 'audit_committee')!;
    const right = deck.cards.filter((c) => c.role === 'senior_management').slice(0, 2);
    const answers: CanopyAnswer[] = [
      ...owner.map((card) => ({ card, picked: 'custodian' })),
      ...board.map((card) => ({ card, picked: 'senior_management' })),
      { card: audit, picked: 'is_auditor' },
      ...right.map((card) => ({ card, picked: card.role })),
    ];
    const pairs = confusionPairs(answers, deck);
    expect(pairs.map((p) => p.line)).toEqual([
      'You gave 3 Data owner decisions to Custodian.',
      'You gave 2 Board of directors decisions to Senior management.',
      'You gave one Audit committee decision to IS auditor.',
    ]);
    // Right calls never appear; a perfect round has none.
    expect(confusionPairs(right.map((card) => ({ card, picked: card.role })), deck)).toEqual([]);
  });

  it('a missed decision comes back first in the next round at its level', () => {
    for (const tier of TIERS) {
      useProgress.setState({ byCert: {} });
      const card = deck.cards.find((c) => c.tier === tier)!;
      useProgress.getState().recordCard('cisa', canopyCardId(card), false);
      for (let seed = 1; seed <= 20; seed++) {
        expect(buildCanopyRound(deck, cp().cards, tier, createRng(seed), Date.now()).map((i) => i.card.id)).toContain(card.id);
      }
    }
  });

  it('the slip coach’s “wrong role” pattern offers Drill it: Canopy Call', () => {
    const ids = d1.slice(30, 36);
    for (const id of ids) {
      useProgress.getState().recordMistake('cisa', id, plainWrong(id));
      useProgress.getState().tagMistake('cisa', id, 'role');
    }
    const inputs: SlipInput[] = ids.map((id) => {
      const q = findQuestion('cisa', id)!;
      const m = cp().mistakes[id];
      return { slip: m.slip, picked: m.picked, confidence: m.confidence, correct: q.correct, tips: q.tips, stem: q.stem };
    });
    const coach = slipCoach(inputs);
    expect(coach.ready && coach.pattern).toBe('role');
    expect(coach.ready && coach.game).toBe('canopy');
    expect(canPlay('cisa', 'canopy')).toBe(true);
    act(() => {
      r = create(<Mistakes />);
    });
    expect(allText()).toContain('You answer from the wrong role');
    expect(root().findAll((n) => n.props.label === 'Drill it: Canopy Call' && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
  });
});

describe('Journey 5c: Stepping Stones on the real processes', () => {
  const all = getStepSequences('cisa');
  const TIERS: StonesTier[] = ['seedling', 'sapling', 'heartwood'];

  it('place, take back, place again and check: misplaced stones say where they go', () => {
    const item = buildStonesRound(all, undefined, 'sapling', createRng(3), T0)[0];
    const n = item.seq.steps.length;
    // Place two, take the first back (it leaves the path), then build the reversed path.
    let placed = [item.shown[0], item.shown[1]];
    placed = placed.filter((s) => s !== item.shown[0]);
    placed = [...placed, ...item.shown.filter((s) => !placed.includes(s))];
    expect(new Set(placed).size).toBe(n);
    const reversed = Array.from({ length: n }, (_, k) => n - 1 - k);
    const r1 = checkPath(item, reversed);
    expect(r1.perfect).toBe(false);
    r1.marks.forEach((mk, k) => {
      expect(mk.goes).toBe(reversed[k] + 1);
      expect(mk.right).toBe(reversed[k] === k);
    });
    expect(`${item.seq.steps[reversed[0]].label} · goes ${ordinal(r1.marks[0].goes)}`).toMatch(/goes \d+(st|nd|rd|th)$/);
    expect(checkPath(item, Array.from({ length: n }, (_, k) => k))).toEqual(expect.objectContaining({ right: n, perfect: true }));
  });

  it('Heartwood: the missing step is among 3 different choices, and no decoy fits the path', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of buildStonesRound(all, undefined, 'heartwood', createRng(seed), T0)) {
        const m = it.missing!;
        expect(m.choices).toHaveLength(3);
        expect(new Set(m.choices).size).toBe(3);
        expect(m.choices[m.correct]).toBe(it.seq.steps[m.index].label);
        const mine = new Set(it.seq.steps.flatMap((s) => keyWords(s.label)));
        m.choices.forEach((c, k) => {
          if (k === m.correct) return;
          expect(it.seq.steps.map((s) => s.label)).not.toContain(c);
          expect(keyWords(c).some((w) => mine.has(w))).toBe(false);
        });
      }
    }
  });

  it('a process not placed perfectly comes back in the next round at its level', () => {
    for (const tier of TIERS) {
      useProgress.setState({ byCert: {} });
      const seq = stonesPool(all, tier)[5];
      useProgress.getState().recordCard('cisa', stonesCardId(seq), false);
      for (let seed = 1; seed <= 20; seed++) {
        expect(buildStonesRound(all, cp().cards, tier, createRng(seed), Date.now()).map((i) => i.seq.id)).toContain(seq.id);
      }
    }
  });
});

describe('Journey 6: readiness and mastery are unchanged by the three new games', () => {
  it('a round of each changes no answer, review, mastery date, readiness or study moment', () => {
    upgrade();
    ensureBackfill('cisa', T0);
    const snap = () => {
      const c = cp();
      return JSON.stringify({
        answers: c.answers,
        review: c.review,
        mastery: c.mastery ?? null,
        moments: c.moments ?? null,
        readiness: computeReadiness(cert, c.answers),
        domains: milestoneFacts('cisa', c, { now: T0 })!.domains,
      });
    };
    const before = snap();
    // Field Guide: 12 terms, 3 missed.
    const terms = buildFieldRound(fieldTerms(getNotes('cisa')), cp().cards, 'seedling', createRng(5), Date.now()).flatMap((b) => b.terms);
    const firsts = terms.map((_, k) => k % 4 !== 0);
    terms.forEach((t, k) => useProgress.getState().recordCard('cisa', t.id, firsts[k]));
    finishGameRound('cisa', 'field', { score: 9, rate: 0.75, tier: 'seedling', hits: firsts });
    // Canopy Call: 10 decisions, half wrong.
    const deck = getRoleDeck('cisa')!;
    const items = buildCanopyRound(deck, cp().cards, 'seedling', createRng(5), Date.now());
    items.forEach((it, k) => useProgress.getState().recordCard('cisa', canopyCardId(it.card), k % 2 === 0));
    finishGameRound('cisa', 'canopy', { score: 5, rate: 0.5, tier: 'seedling' });
    // Stepping Stones: 3 processes, one perfect.
    const stones = buildStonesRound(getStepSequences('cisa'), cp().cards, 'sapling', createRng(5), Date.now());
    stones.forEach((it, k) => useProgress.getState().recordCard('cisa', stonesCardId(it.seq), k === 0));
    finishGameRound('cisa', 'stones', { score: 8, rate: 0.6, tier: 'sapling' });
    expect(snap()).toBe(before);
    // The cards went to the games' own spaced review, never to the question queue.
    expect(Object.keys(cp().cards ?? {}).some((k) => k.startsWith('kt:'))).toBe(true);
    expect(Object.keys(cp().cards ?? {}).some((k) => k.startsWith('role:'))).toBe(true);
    expect(Object.keys(cp().cards ?? {}).some((k) => k.startsWith('seq:') || k.startsWith('flow:'))).toBe(true);
  });
});
