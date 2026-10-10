/**
 * Build F milestones (behaviour review §4, games review §5): every badge's
 * exact criterion, positive and negative; Coach me and game answers never
 * count; badges are never taken away.
 */
import {
  addCount,
  addToWindow,
  afterAnswer,
  afterCard,
  allMarks,
  badgeCount,
  badgeViews,
  BADGES,
  earn,
  inferFromSaves,
  isDressRehearsal,
  isOnPace,
  MILESTONES,
  nearest,
  newlyMet,
  noteStudyDay,
  SKILL_BADGES,
  takeNext,
  type MilestoneFacts,
} from '../engine/milestones';
import { dayKey } from '../engine/streak';

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();

function facts(over: Partial<MilestoneFacts> = {}): MilestoneFacts {
  return {
    cleanAnswered: 0,
    topicsClear: 0,
    domains: ['1', '2', '3', '4', '5'].map((id) => ({ id, short: `D${id}`, answered: 0, mastery: 0 })),
    loopFixed: 0,
    slipsTagged: 0,
    longRecall: 0,
    graduated: 0,
    sure: [],
    mocks: [],
    fullMockSize: 150,
    mindsetShift: false,
    studyDays: 0,
    freshStart: false,
    gamesPlayed: 0,
    gamesTotal: 9,
    snareHits: [],
    keelRun: 0,
    signposts: [],
    myths: [],
    paceRounds: 0,
    gameFixes: 0,
    ...over,
  };
}
const met = (f: MilestoneFacts) => allMarks(f).filter((m) => m.met).map((m) => m.key);

describe('the badge set', () => {
  it('has the 15 milestones and the 7 skill badges, each with a plain rule', () => {
    expect(MILESTONES.map((b) => b.name)).toEqual([
      'First Foothold',
      'Topic Clear',
      'Ten Topics Clear',
      'Firm Footing',
      'Whole Map',
      'Loop Closed',
      'Slip Spotter',
      'Long Memory',
      'Graduate',
      'Know What You Know',
      'Dress Rehearsal',
      'On Pace',
      'Mindset Shift',
      'Rooted',
      'Fresh Start',
    ]);
    expect(SKILL_BADGES.map((b) => b.name)).toEqual(['Snare-wise', 'Even Keel', 'Signpost Reader', 'Myth Clearer', 'Sure-Footed Pace', 'Whole Grove', 'Back on the Path']);
    for (const b of BADGES) expect(b.rule).toMatch(/\.$/);
  });

  it('no rule rewards minutes, taps, plays or a share of the bank', () => {
    for (const b of BADGES) {
      expect(b.rule).not.toMatch(/minute|tap|% of the bank|of the bank|play \d+|streak/i);
    }
  });

  it('nothing is met with no data', () => {
    expect(met(facts())).toEqual([]);
  });
});

describe('each milestone: positive and negative', () => {
  it('First Foothold: 20 answers without a hint', () => {
    expect(met(facts({ cleanAnswered: 20 }))).toContain('first-foothold');
    expect(met(facts({ cleanAnswered: 19 }))).not.toContain('first-foothold');
  });

  it('Topic Clear and Ten Topics Clear', () => {
    expect(met(facts({ topicsClear: 1 }))).toEqual(['topic-clear']);
    expect(met(facts({ topicsClear: 9 }))).not.toContain('ten-topics');
    expect(met(facts({ topicsClear: 10 }))).toEqual(expect.arrayContaining(['topic-clear', 'ten-topics']));
  });

  it('Firm Footing: 70% mastery AND 20 answers, one leaf per domain', () => {
    const f = (answered: number, mastery: number) => facts({ domains: [{ id: '4', short: 'IS Ops', answered, mastery }] });
    expect(met(f(20, 0.7))).toContain('firm-footing:4');
    expect(met(f(19, 1))).not.toContain('firm-footing:4');
    expect(met(f(40, 0.69))).not.toContain('firm-footing:4');
    const marks = allMarks(f(20, 0.7)).filter((m) => m.badge === 'firm-footing');
    expect(marks.map((m) => m.label)).toEqual(['Firm Footing · IS Ops']);
  });

  it('Whole Map: every domain at 65% or more', () => {
    const all = (m: number[]) => facts({ domains: m.map((mastery, i) => ({ id: String(i + 1), short: `D${i + 1}`, answered: 30, mastery })) });
    expect(met(all([0.65, 0.7, 0.8, 0.66, 0.9]))).toContain('whole-map');
    expect(met(all([0.65, 0.7, 0.8, 0.64, 0.9]))).not.toContain('whole-map');
    expect(met(facts({ domains: [] }))).not.toContain('whole-map');
  });

  it('Loop Closed, Slip Spotter, Long Memory, Graduate: their counts', () => {
    expect(met(facts({ loopFixed: 10 }))).toContain('loop-closed');
    expect(met(facts({ loopFixed: 9 }))).not.toContain('loop-closed');
    expect(met(facts({ slipsTagged: 10 }))).toContain('slip-spotter');
    expect(met(facts({ slipsTagged: 9 }))).not.toContain('slip-spotter');
    expect(met(facts({ longRecall: 25 }))).toContain('long-memory');
    expect(met(facts({ longRecall: 24 }))).not.toContain('long-memory');
    expect(met(facts({ graduated: 50 }))).toContain('graduate');
    expect(met(facts({ graduated: 49 }))).not.toContain('graduate');
  });

  it('Know What You Know: 85% of the last 50 sure answers, after at least 20', () => {
    const sure = (n: number, right: number) => Array.from({ length: n }, (_, i) => i < right);
    expect(met(facts({ sure: sure(20, 17) }))).toContain('know-what-you-know');
    expect(met(facts({ sure: sure(19, 19) }))).not.toContain('know-what-you-know');
    expect(met(facts({ sure: sure(50, 42) }))).not.toContain('know-what-you-know');
    // Only the last 50 count: 30 early misses pushed out by 50 good ones.
    expect(met(facts({ sure: [...sure(30, 0), ...sure(50, 45)] }))).toContain('know-what-you-know');
  });

  it('Dress Rehearsal: a full, timed mock with nothing unanswered', () => {
    expect(isDressRehearsal({ total: 150, timing: 'standard', unanswered: 0 }, 150)).toBe(true);
    expect(isDressRehearsal({ total: 150, timing: 'plus50', unanswered: 0 }, 150)).toBe(true);
    expect(isDressRehearsal({ total: 150, unanswered: 0 }, 150)).toBe(true); // older results were standard
    expect(isDressRehearsal({ total: 150, timing: 'untimed', unanswered: 0 }, 150)).toBe(false);
    expect(isDressRehearsal({ total: 50, timing: 'standard', unanswered: 0 }, 150)).toBe(false);
    expect(isDressRehearsal({ total: 150, timing: 'standard', unanswered: 1 }, 150)).toBe(false);
    // A result from before Build D doesn't know its unanswered count: it can't show it.
    expect(isDressRehearsal({ total: 150 }, 150)).toBe(false);
    expect(met(facts({ mocks: [{ total: 150, timing: 'standard', unanswered: 0 }] }))).toContain('dress-rehearsal');
  });

  it('On Pace: a timed mock with all three pace checks within 10%', () => {
    expect(isOnPace({ total: 50, timing: 'standard', checkpoints: [0.05, -0.1, 0.09] })).toBe(true);
    expect(isOnPace({ total: 50, timing: 'standard', checkpoints: [0.05, -0.11, 0.09] })).toBe(false);
    expect(isOnPace({ total: 50, timing: 'standard', checkpoints: [0.05, 0.02] })).toBe(false);
    expect(isOnPace({ total: 50, timing: 'untimed', checkpoints: [0, 0, 0] })).toBe(false);
    expect(met(facts({ mocks: [{ total: 50, checkpoints: [0, 0, 0] }] }))).toContain('on-pace');
  });

  it('Mindset Shift: when the growth card has shown', () => {
    expect(met(facts({ mindsetShift: true }))).toContain('mindset-shift');
    expect(met(facts({ mindsetShift: false }))).not.toContain('mindset-shift');
  });

  it('Rooted: 10, 30 and 60 study days in all', () => {
    expect(met(facts({ studyDays: 9 }))).not.toContain('rooted:10');
    expect(met(facts({ studyDays: 10 }))).toEqual(['rooted:10']);
    expect(met(facts({ studyDays: 60 }))).toEqual(['rooted:10', 'rooted:30', 'rooted:60']);
  });

  it('Fresh Start: back after a week away, session finished', () => {
    expect(met(facts({ freshStart: true }))).toContain('fresh-start');
    expect(met(facts({ freshStart: false }))).not.toContain('fresh-start');
  });
});

describe('each skill badge: positive and negative', () => {
  it('Snare-wise: 8 of the last 10 snares', () => {
    const hits = (right: number, n = 10) => Array.from({ length: n }, (_, i) => i < right);
    expect(met(facts({ snareHits: hits(8) }))).toContain('snare-wise');
    expect(met(facts({ snareHits: hits(7) }))).not.toContain('snare-wise');
    expect(met(facts({ snareHits: hits(9, 9) }))).not.toContain('snare-wise');
    // The last 10 only.
    expect(met(facts({ snareHits: [...hits(10), false, false, false] }))).not.toContain('snare-wise');
  });

  it('Even Keel, Signpost Reader, Myth Clearer, Sure-Footed Pace, Back on the Path', () => {
    expect(met(facts({ keelRun: 3 }))).toContain('even-keel');
    expect(met(facts({ keelRun: 2 }))).not.toContain('even-keel');
    const win = (n: number, right: number) => Array.from({ length: n }, (_, i) => ({ id: `x${i}`, ok: i < right }));
    // Signpost Reader: 8 of the last 10 FIRST questions, once 10 are played.
    expect(met(facts({ signposts: win(10, 8) }))).toContain('signpost-reader');
    expect(met(facts({ signposts: win(10, 7) }))).not.toContain('signpost-reader');
    expect(met(facts({ signposts: win(9, 9) }))).not.toContain('signpost-reader');
    // Myth Clearer: 20 of the last 25 rumors, once 25 are played.
    expect(met(facts({ myths: win(25, 20) }))).toContain('myth-clearer');
    expect(met(facts({ myths: win(25, 19) }))).not.toContain('myth-clearer');
    expect(met(facts({ myths: win(24, 24) }))).not.toContain('myth-clearer');
    // Only the LAST 25 count: an old run of right answers then misses doesn't.
    expect(met(facts({ myths: [...win(25, 25), ...win(10, 0).map((h) => ({ ...h, id: `y${h.id}` }))] }))).not.toContain('myth-clearer');
    expect(met(facts({ paceRounds: 3 }))).toContain('sure-footed-pace');
    expect(met(facts({ paceRounds: 2 }))).not.toContain('sure-footed-pace');
    expect(met(facts({ gameFixes: 10 }))).toContain('back-on-path');
    expect(met(facts({ gameFixes: 9 }))).not.toContain('back-on-path');
  });

  it('Whole Grove counts the games that exist', () => {
    expect(met(facts({ gamesPlayed: 9, gamesTotal: 9 }))).toContain('whole-grove');
    expect(met(facts({ gamesPlayed: 8, gamesTotal: 9 }))).not.toContain('whole-grove');
    expect(met(facts({ gamesPlayed: 0, gamesTotal: 0 }))).not.toContain('whole-grove');
  });
});

describe('the counters (afterAnswer): Coach me and games never count', () => {
  const base = { questionId: 'd4_001', correct: true, assisted: false, game: false, at: T0, graduated: false };

  it('Long Memory: right, unhinted, 7+ days after last seen', () => {
    expect(afterAnswer(undefined, { ...base, prevLastAt: T0 - 7 * DAY }).milestones.counts?.longRecall).toBe(1);
    expect(afterAnswer(undefined, { ...base, prevLastAt: T0 - 6 * DAY }).milestones.counts?.longRecall).toBeUndefined();
    expect(afterAnswer(undefined, { ...base, prevLastAt: T0 - 9 * DAY, assisted: true }).milestones.counts?.longRecall).toBeUndefined();
    expect(afterAnswer(undefined, { ...base, prevLastAt: T0 - 9 * DAY, game: true }).milestones.counts?.longRecall).toBeUndefined();
    expect(afterAnswer(undefined, { ...base, prevLastAt: T0 - 9 * DAY, correct: false }).milestones.counts?.longRecall).toBeUndefined();
  });

  it('Loop Closed: a logged mistake fixed on a LATER day, unassisted', () => {
    const later = afterAnswer(undefined, { ...base, openMistakeAt: T0 - DAY });
    expect(later.milestones.counts?.loopFixed).toBe(1);
    expect(later.fixedLater).toBe(true);
    expect(afterAnswer(undefined, { ...base, openMistakeAt: T0 - 3_600_000 }).fixedLater).toBe(false); // same day
    expect(afterAnswer(undefined, { ...base, openMistakeAt: T0 - DAY, assisted: true }).fixedLater).toBe(false);
    expect(afterAnswer(undefined, { ...base, openMistakeAt: T0 - DAY, game: true }).fixedLater).toBe(false);
  });

  it('Graduate: only an unhinted, non-game graduation counts', () => {
    expect(afterAnswer(undefined, { ...base, graduated: true }).milestones.counts?.graduated).toBe(1);
    expect(afterAnswer(undefined, { ...base, graduated: true, assisted: true }).milestones.counts?.graduated).toBeUndefined();
    expect(afterAnswer(undefined, { ...base, graduated: true, game: true }).milestones.counts?.graduated).toBeUndefined();
  });

  it('Know What You Know logs only unhinted, non-game "sure" answers, capped at 50', () => {
    expect(afterAnswer(undefined, { ...base, confidence: 'sure' }).milestones.sure).toEqual([true]);
    expect(afterAnswer(undefined, { ...base, confidence: 'sure', assisted: true }).milestones.sure).toBeUndefined();
    expect(afterAnswer(undefined, { ...base, confidence: 'sure', game: true }).milestones.sure).toBeUndefined();
    expect(afterAnswer(undefined, { ...base, confidence: 'unsure' }).milestones.sure).toBeUndefined();
    let m = afterAnswer(undefined, { ...base, confidence: 'sure', correct: false }).milestones;
    for (let i = 0; i < 60; i++) m = afterAnswer(m, { ...base, confidence: 'sure' }).milestones;
    expect(m.sure).toHaveLength(50);
    expect(m.sure!.every(Boolean)).toBe(true);
  });

  it('Back on the Path: a game miss fixed later, outside the game', () => {
    const missed = afterAnswer(undefined, { ...base, game: true, correct: false, at: T0 - DAY }).milestones;
    expect(missed.gameMisses).toEqual({ d4_001: dayKey(T0 - DAY) });
    // Same day: not yet.
    expect(afterAnswer(missed, { ...base, at: T0 - DAY + 3_600_000 }).milestones.counts?.gameFixes).toBeUndefined();
    // Later day, with a hint: no.
    expect(afterAnswer(missed, { ...base, assisted: true }).milestones.counts?.gameFixes).toBeUndefined();
    // Later day, unhinted: fixed once.
    const fixed = afterAnswer(missed, base).milestones;
    expect(fixed.counts?.gameFixes).toBe(1);
    expect(fixed.gameMisses).toEqual({});
    expect(afterAnswer(fixed, { ...base, at: T0 + DAY }).milestones.counts?.gameFixes).toBe(1);
  });

  it('a missed note card got right on a later day is a game miss fixed', () => {
    const missed = afterCard(undefined, 'kt:D4:a', false, T0 - DAY);
    expect(missed?.cardMisses).toEqual({ 'kt:D4:a': dayKey(T0 - DAY) });
    // A second miss keeps the FIRST miss day.
    expect(afterCard(missed, 'kt:D4:a', false, T0)).toBe(missed);
    // Right the same day: not yet a fix, and the miss is kept.
    expect(afterCard(afterCard(undefined, 'kt:D4:a', false, T0), 'kt:D4:a', true, T0 + 60_000)?.cardMisses?.['kt:D4:a']).toBe(dayKey(T0));
    // Right on a later day: fixed once, and forgotten.
    const fixed = afterCard(missed, 'kt:D4:a', true, T0)!;
    expect(fixed.counts?.gameFixes).toBe(1);
    expect(fixed.cardMisses).toEqual({});
    expect(afterCard(fixed, 'kt:D4:a', true, T0 + DAY)).toBe(fixed);
    // Never missed: nothing to fix.
    expect(afterCard(undefined, 'kt:D4:b', true, T0)).toBeUndefined();
  });

  it('study days add up; a week or more away marks a return', () => {
    let m = noteStudyDay({ earned: {} }, '2026-10-01');
    m = noteStudyDay(m, '2026-10-01');
    m = noteStudyDay(m, '2026-10-02');
    expect(m.days).toBe(2);
    expect(m.returnedOn).toBeUndefined();
    expect(noteStudyDay(m, '2026-10-08').returnedOn).toBeUndefined(); // 6 days
    expect(noteStudyDay(m, '2026-10-09').returnedOn).toBe('2026-10-09'); // 7 days
    // A day earlier than the last one (clock moved back) changes nothing.
    expect(noteStudyDay(m, '2026-09-30')).toBe(m);
  });

  it('addCount only adds positive amounts', () => {
    expect(addCount(undefined, 'paceRounds', 3)?.counts?.paceRounds).toBe(3);
    expect(addCount(undefined, 'paceRounds', 0)).toBeUndefined();
  });

  it('addToWindow keeps each item once (latest result last) and only the last N', () => {
    let m = addToWindow(undefined, 'signposts', [{ id: 'a', ok: true }, { id: 'b', ok: false }]);
    m = addToWindow(m, 'signposts', [{ id: 'a', ok: false }]);
    expect(m?.signposts).toEqual([{ id: 'b', ok: false }, { id: 'a', ok: false }]);
    expect(addToWindow(m, 'signposts', [])).toBe(m);
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `r${i}`, ok: true }));
    const w = addToWindow(undefined, 'myths', many)!.myths!;
    expect(w).toHaveLength(25);
    expect(w[0].id).toBe('r15');
  });

  it('Long Memory counts each question once', () => {
    const base = { questionId: 'q1', correct: true, assisted: false, game: false, at: T0, prevLastAt: T0 - 8 * DAY, graduated: false };
    const once = afterAnswer(undefined, base).milestones;
    const twice = afterAnswer(once, { ...base, at: T0 + 9 * DAY, prevLastAt: T0 }).milestones;
    expect(twice.counts?.longRecall).toBe(1);
    const other = afterAnswer(twice, { ...base, questionId: 'q2', at: T0 + 9 * DAY, prevLastAt: T0 }).milestones;
    expect(other.counts?.longRecall).toBe(2);
    expect(other.longIds).toEqual(['q1', 'q2']);
  });
});

describe('earned once, never revoked', () => {
  it('earn() keeps the first date and never removes a mark', () => {
    const m = earn(undefined, ['rooted:10'], T0, true);
    const again = earn(m, ['rooted:10', 'graduate'], T0 + DAY, true);
    expect(again.earned['rooted:10']).toBe(T0);
    expect(again.earned.graduate).toBe(T0 + DAY);
    expect(again.queue).toEqual(['rooted:10', 'graduate']);
  });

  it('a mark no longer met is still earned (live state lives elsewhere)', () => {
    const m = earn(undefined, ['firm-footing:4'], T0, false);
    const dropped = facts({ domains: [{ id: '4', short: 'IS Ops', answered: 40, mastery: 0.4 }] });
    expect(newlyMet(allMarks(dropped), m.earned)).toEqual([]);
    const views = badgeViews(allMarks(dropped), m.earned, 'milestone');
    expect(views.find((v) => v.def.id === 'firm-footing')!.earned.map((e) => e.key)).toEqual(['firm-footing:4']);
  });

  it('a quiet earn (back-fill) queues nothing', () => {
    expect(earn(undefined, ['graduate'], T0, false).queue).toBeUndefined();
  });

  it('takeNext gives one at a time, oldest first', () => {
    const m = earn(undefined, ['a', 'b'], T0, true);
    const first = takeNext(m);
    expect(first.key).toBe('a');
    expect(takeNext(first.milestones).key).toBe('b');
    expect(takeNext(undefined).key).toBeUndefined();
  });
});

describe('the Milestones screen data', () => {
  it('nearest gives 3 unearned, closest first, one per badge', () => {
    const f = facts({ cleanAnswered: 18, studyDays: 25, slipsTagged: 3, loopFixed: 9 });
    const earned = earn(undefined, ['rooted:10'], T0, false).earned;
    const near = nearest(badgeViews(allMarks(f), earned, 'milestone'));
    expect(near.map((v) => v.def.id)).toEqual(['first-foothold', 'loop-closed', 'rooted']);
    // Rooted's next is the next tier, not one already earned.
    expect(near[2].next!.key).toBe('rooted:30');
    expect(near[2].next!.detail).toBe('25 of 30 study days');
  });

  it('progress lines never show a bank size', () => {
    for (const m of allMarks(facts({ cleanAnswered: 900, studyDays: 3 }))) expect(m.detail).not.toMatch(/of \d{3,}/);
  });

  it('badgeCount counts Firm Footing leaves once', () => {
    expect(badgeCount(['firm-footing:1', 'firm-footing:4', 'rooted:10'])).toBe(2);
  });
});

describe('back-fill inference from older saves', () => {
  const a = (lastAt: number, extra: object = {}) => ({ attempts: 1, correctCount: 1, lastCorrect: true, lastAt, ...extra });

  it('finds mistakes fixed on a later day, unhinted only', () => {
    const r = inferFromSaves({
      answers: { q1: a(T0), q2: a(T0, { lastAssisted: true }), q3: a(T0 - 3_600_000), q4: a(T0) },
      mistakes: { q1: { at: T0 - DAY, resolved: true }, q2: { at: T0 - DAY, resolved: true }, q3: { at: T0 - 2 * 3_600_000, resolved: true }, q4: { at: T0 - DAY } },
      mocks: [],
    });
    expect(r.loopFixed).toEqual(['q1']);
  });

  it('keeps the last 50 unhinted sure answers in time order', () => {
    const answers: Record<string, ReturnType<typeof a>> = {};
    for (let i = 0; i < 60; i++) answers[`q${i}`] = a(T0 + i, { lastConfidence: 'sure', lastCorrect: i >= 10 });
    answers.hint = a(T0 + 100, { lastConfidence: 'sure', lastAssisted: true, lastCorrect: false });
    const r = inferFromSaves({ answers, mistakes: {}, mocks: [] });
    expect(r.sure).toHaveLength(50);
    expect(r.sure.every(Boolean)).toBe(true);
  });

  it('counts the study days this exam’s own data can still show', () => {
    const r = inferFromSaves({
      answers: { q1: a(T0), q2: a(T0 - 10 * DAY) },
      mistakes: {},
      mocks: [{ finishedAt: T0 - 11 * DAY }],
      mastery: { '1A1.1': { firstDay: dayKey(T0 - 11 * DAY), masteredAt: dayKey(T0) } },
    });
    expect(r.days).toEqual([dayKey(T0 - 11 * DAY), dayKey(T0 - 10 * DAY), dayKey(T0)]);
    // Fresh Start is live only: the back-fill never reports a return.
    expect('returned' in r).toBe(false);
  });

  it('skips game answers (lastGame) for fixed mistakes and "sure" answers', () => {
    const r = inferFromSaves({
      answers: { q1: a(T0, { lastGame: true }), q2: a(T0, { lastConfidence: 'sure', lastGame: true }), q3: a(T0, { lastConfidence: 'sure' }) },
      mistakes: { q1: { at: T0 - DAY, resolved: true } },
      mocks: [],
    });
    expect(r.loopFixed).toEqual([]);
    expect(r.sure).toEqual([true]);
  });
});
