/**
 * Mobile 1.10 badge collection (badges_game.md slice A, engine/badgeCatalog.ts):
 * the sets and their own counts, the two uncounted shelves, gates, effort,
 * sorting, "Next for your exam" by stage, "Study for this" targets, the
 * spoken labels, the "new" check and the planters.
 */
import {
  BADGE_SET,
  caseEarnedCount,
  caseKey,
  caseMarks,
  caseSets,
  completeSets,
  completingMark,
  COUNTED_SETS,
  examLength,
  GATE_LINE,
  hasNewSince,
  markSpoken,
  nextForExam,
  nextLine,
  onCase,
  passesFilter,
  SET_ORDER,
  setCountLine,
  setInfo,
  setSpoken,
  sortMarks,
  spokenDetail,
  studyNote,
  studyTarget,
  suggestable,
  suggestLine,
  type CaseInput,
  type CaseMark,
} from '../engine/badgeCatalog';
import { allMarks, BADGES, type MilestoneFacts } from '../engine/milestones';
import { CERTIFICATIONS } from '../content/certifications';

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const cisa = CERTIFICATIONS.find((c) => c.id === 'cisa')!;
const DOMAINS = cisa.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone }));
const EXAM = { questions: cisa.exam.questions, minutes: cisa.exam.minutes };

function facts(over: Partial<MilestoneFacts> = {}): MilestoneFacts {
  return {
    cleanAnswered: 0,
    topicsClear: 0,
    domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered: 0, mastery: 0 })),
    loopFixed: 0,
    slipsTagged: 0,
    longRecall: 0,
    graduated: 0,
    sure: [],
    mocks: [],
    fullMockSize: 150,
    mindsetShift: false,
    mindsetData: false,
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
const input = (f: MilestoneFacts, earned: Record<string, number> = {}, over: Partial<CaseInput> = {}): CaseInput => ({
  marks: allMarks(f),
  earned,
  domains: DOMAINS,
  exam: EXAM,
  mindsetData: Boolean(f.mindsetData),
  ...over,
});
const caseOf = (f: MilestoneFacts, earned: Record<string, number> = {}) => {
  const marks = caseMarks(input(f, earned));
  return { marks, sets: caseSets(marks, EXAM, DOMAINS.length) };
};
const find = (marks: CaseMark[], key: string) => marks.find((m) => m.key === key)!;

describe('sets and shelves', () => {
  it('every badge sits in exactly one set; six are counted, Moments and Field notes are not', () => {
    for (const b of BADGES) expect(SET_ORDER).toContain(BADGE_SET[b.id]);
    expect(COUNTED_SETS).toEqual(['groundwork', 'domains', 'evergreen', 'judgement', 'examDay', 'rooted']);
    // Under a collection, counting Fresh Start would reward a week away; play must not pull study off the blueprint.
    expect(COUNTED_SETS).not.toContain(BADGE_SET['fresh-start']);
    for (const b of BADGES.filter((x) => x.kind === 'skill')) {
      expect(BADGE_SET[b.id]).toBe('fieldNotes');
      expect(COUNTED_SETS).not.toContain(BADGE_SET[b.id]);
    }
  });

  it('each set counts its own marks ("n of m"), never a grand total', () => {
    const { sets } = caseOf(facts(), { 'first-foothold': T0, 'firm-footing:4': T0, 'snare-wise': T0, 'fresh-start': T0 });
    const line = (id: string) => setCountLine(sets.find((s) => s.info.id === id)!);
    expect(line('groundwork')).toBe('1 of 3');
    expect(line('domains')).toBe('1 of 6'); // 5 domains + Whole Map
    // Mobile 1.11: Evergreen's core is Long Memory 25 and 75, Graduate, Loop Closed and Took Root;
    // Exam Day's is Dress Rehearsal 1 and 2 and On Pace. Stretch tiers are counted on their own.
    expect(line('evergreen')).toBe('0 of 5');
    expect(line('judgement')).toBe('0 of 3');
    expect(line('examDay')).toBe('0 of 3');
    expect(line('rooted')).toBe('0 of 3');
    expect(line('fieldNotes')).toBe('1 of 7'); // its own counter
    expect(line('moments')).toBeUndefined(); // no counter at all
  });

  it('a set is completed by ONE badge, even when two share the moment (the later in catalogue order)', () => {
    const { sets } = caseOf(facts(), { 'first-foothold': T0 - DAY, 'topic-clear': T0, 'ten-topics': T0 });
    expect(completingMark(sets.find((s) => s.info.id === 'groundwork')!)).toBe('ten-topics');
    const open = caseOf(facts(), { 'first-foothold': T0 }).sets.find((s) => s.info.id === 'groundwork')!;
    expect(completingMark(open)).toBeUndefined();
  });

  it('a complete set reads "Complete" and dates from its last badge', () => {
    const earned = { 'first-foothold': T0 - 3 * DAY, 'topic-clear': T0 - DAY, 'ten-topics': T0 };
    const { sets } = caseOf(facts(), earned);
    const g = sets.find((s) => s.info.id === 'groundwork')!;
    expect(g.completeAt).toBe(T0);
    expect(setCountLine(g)).toBe('3 of 3 · Complete');
    expect(setSpoken(g)).toBe('Groundwork, 3 of 3, complete');
    expect(completeSets(sets)).toEqual(['groundwork']);
  });

  it('every key a learner already holds keeps its set and its date (nothing lost)', () => {
    const earned = Object.fromEntries(
      ['first-foothold', 'firm-footing:1', 'firm-footing:4', 'whole-map', 'long-memory', 'dress-rehearsal', 'rooted:10', 'rooted:30', 'fresh-start', 'whole-grove'].map((k, i) => [k, T0 - i * DAY]),
    );
    const { marks } = caseOf(facts(), earned);
    for (const [k, at] of Object.entries(earned)) {
      const m = find(marks, k);
      expect(m.status).toBe('earned');
      expect(m.earnedAt).toBe(at);
      expect(m.set).toBe(BADGE_SET[m.badge]);
    }
  });

  it('an earned mark the exam no longer lists still shows, earned, without changing the counts', () => {
    const { marks, sets } = caseOf(facts(), { 'firm-footing:9': T0 });
    const extra = find(marks, 'firm-footing:9');
    expect(extra.status).toBe('earned');
    expect(extra.counted).toBe(false);
    expect(setCountLine(sets.find((s) => s.info.id === 'domains')!)).toBe('0 of 6');
    // A tier key no version defines is left alone (kept, never shown).
    expect(caseOf(facts(), { 'long-memory:999': T0 }).marks.some((m) => m.key === 'long-memory:999')).toBe(false);
  });

  it('the domains set follows the exam; Exam Day reads the exam facts', () => {
    expect(setInfo('domains', EXAM, 5).name).toBe('The Five Domains');
    expect(setInfo('domains', EXAM, 4).name).toBe('The Four Domains');
    expect(setInfo('domains', EXAM, 8).name).toBe('The Eight Domains');
    expect(setInfo('examDay', EXAM, 5).purpose).toBe('Practise the full sitting: 150 questions in 4 hours, about 1.6 minutes each.');
    expect(examLength(180)).toBe('3 hours');
    expect(examLength(90)).toBe('1 hour 30 minutes');
  });

  it('Firm Footing leaves go heaviest domain first, each with its weight and a gap line', () => {
    const f = facts({ domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered: 14, mastery: 0.62 })) });
    const leaves = caseOf(f).marks.filter((m) => m.badge === 'firm-footing' && !m.stretch);
    expect(leaves.map((m) => m.domain!.weight)).toEqual([26, 26, 18, 18, 12]);
    // Their 80% Stretch tiers come after them, in the same order.
    const deep = caseOf(f).marks.filter((m) => m.badge === 'firm-footing' && m.stretch);
    expect(deep.map((m) => m.domain!.weight)).toEqual([26, 26, 18, 18, 12]);
    expect(deep.every((m) => m.key.endsWith(':80') && m.tier === 2 && m.tiers === 2)).toBe(true);
    expect(leaves[0].detail).toBe('62% → 70% · 14 of 20 answered');
    expect(leaves[0].caption).toBe(leaves[0].domain!.short);
  });

  it('Rooted is three marks, labelled by number with a tier (never a metal name alone)', () => {
    const rooted = caseOf(facts({ studyDays: 12 }), { 'rooted:10': T0 }).marks.filter((m) => m.badge === 'rooted');
    expect(rooted.map((m) => [m.caption, m.tier])).toEqual([
      ['Rooted · 10 days', 1],
      ['Rooted · 30 days', 2],
      ['Rooted · 60 days', 3],
    ]);
    expect(rooted[1].status).toBe('started');
    expect(rooted[1].detail).toBe('12 of 30 study days');
  });
});

describe('states, gates and effort', () => {
  it('earned, started, open, and gated (Mindset Shift until there is enough data)', () => {
    const { marks } = caseOf(facts({ cleanAnswered: 5 }), { 'slip-spotter': T0 });
    expect(find(marks, 'slip-spotter').status).toBe('earned');
    expect(find(marks, 'first-foothold').status).toBe('started');
    expect(find(marks, 'graduate').status).toBe('open');
    const gated = find(marks, 'mindset-shift');
    expect(gated.status).toBe('gated');
    expect(gated.progress).toBe(0); // never an empty bar: it says when it opens
    expect(gated.gateLine).toBe(GATE_LINE.mindsetData);
    expect(gated.gateLine).toBe('Opens after 100 first tries spread over 2 weeks or more.');
    // With enough data it is open (and an earned one is never gated).
    expect(find(caseOf(facts({ mindsetData: true })).marks, 'mindset-shift').status).toBe('open');
  });

  it('effort is an honest fact from the rule, never rarity; the effort sort uses the minimum days', () => {
    const { marks } = caseOf(facts());
    for (const m of marks) {
      expect(m.effort).not.toMatch(/rare|common|epic|legendary|% of learners|only a few/i);
      expect(m.minDays).toBeGreaterThanOrEqual(0);
    }
    expect(find(marks, 'long-memory').effort).toBe('Needs at least 8 days: a recall counts a week after you last saw the question.');
    expect(find(marks, 'long-memory').minDays).toBe(8);
    expect(find(marks, 'rooted:60').minDays).toBe(60);
    expect(find(marks, 'graduate').minDays).toBeGreaterThan(14);
    // Within the exam's core badges, then its Stretch tiers, then Field notes: fewest days first.
    const sorted = sortMarks(marks, 'effort');
    const core = sorted.filter((m) => COUNTED_SETS.includes(m.set) && !m.stretch);
    const stretch = sorted.filter((m) => COUNTED_SETS.includes(m.set) && m.stretch);
    expect(sorted.slice(0, core.length)).toEqual(core);
    expect(sorted.slice(core.length, core.length + stretch.length)).toEqual(stretch);
    for (const group of [core, stretch, sorted.filter((m) => !COUNTED_SETS.includes(m.set))]) {
      const order = group.map((m) => m.minDays);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    }
  });

  it('copy never celebrates with "Unlocked!" or "Collected!", and never names a bank size', () => {
    for (const m of caseOf(facts()).marks) {
      for (const line of [m.howTo, m.unlock, m.effort, m.skill]) {
        expect(line).not.toMatch(/unlocked!|collected!|badge get|congrat/i);
        // No bank-size-like numbers: the only big number allowed is the exam's own length.
        for (const n of line.match(/\b\d{3,}\b/g) ?? []) expect(Number(n)).toBe(EXAM.questions);
      }
    }
  });
});

describe('filter and sort', () => {
  const { marks } = caseOf(facts({ studyDays: 25, cleanAnswered: 10 }), { 'rooted:10': T0 - DAY, 'snare-wise': T0, 'first-foothold': T0 - 5 * DAY });
  it('filters by earned and not yet', () => {
    expect(marks.filter((m) => passesFilter(m, 'earned')).map((m) => m.key).sort()).toEqual(['first-foothold', 'rooted:10', 'snare-wise']);
    expect(marks.filter((m) => passesFilter(m, 'open')).every((m) => m.status !== 'earned')).toBe(true);
  });
  it('recently earned: newest first; closest: nearest open first, gated last, earned after', () => {
    expect(sortMarks(marks, 'recent').slice(0, 3).map((m) => m.key)).toEqual(['snare-wise', 'rooted:10', 'first-foothold']);
    const closest = sortMarks(marks, 'closest');
    const open = closest.filter((m) => m.status === 'started' || m.status === 'open');
    expect(open.map((m) => m.progress)).toEqual([...open.map((m) => m.progress)].sort((a, b) => b - a));
    // Within the core, and within the Stretch tiers after it: open, then gated, then earned.
    for (const group of [closest.filter((m) => COUNTED_SETS.includes(m.set) && !m.stretch), closest.filter((m) => COUNTED_SETS.includes(m.set) && m.stretch)]) {
      const kinds = group.map((m) => (m.status === 'earned' ? 2 : m.status === 'gated' ? 1 : 0));
      expect([...kinds].sort()).toEqual(kinds);
    }
  });
  it('closest and effort: the exam’s own badges first, then Field notes; an unearned Fresh Start never shows as a target', () => {
    for (const sort of ['closest', 'effort'] as const) {
      const list = sortMarks(marks, sort);
      const firstGame = list.findIndex((m) => !COUNTED_SETS.includes(m.set));
      expect(firstGame).toBeGreaterThan(0);
      expect(list.slice(firstGame).every((m) => !COUNTED_SETS.includes(m.set))).toBe(true);
      expect(list.some((m) => m.badge === 'fresh-start')).toBe(false);
      // Field notes' Whole Grove (0 days) never outranks a study badge.
      expect(list.findIndex((m) => m.badge === 'whole-grove')).toBeGreaterThan(firstGame - 1);
    }
    // Nor in Recently earned, until it happens; then it shows like any badge.
    expect(sortMarks(marks, 'recent').some((m) => m.badge === 'fresh-start')).toBe(false);
    expect(marks.filter(onCase).some((m) => m.set === 'moments')).toBe(false);
    const after = caseOf(facts(), { 'fresh-start': T0 }).marks;
    expect(sortMarks(after, 'recent')[0].key).toBe('fresh-start');
    expect(after.filter(onCase).some((m) => m.set === 'moments')).toBe(true);
  });
});

describe('Next for your exam', () => {
  const run = (f: MilestoneFacts, earned: Record<string, number>, stage: Parameters<typeof nextForExam>[0]['stage'], daysLeft: number | null = null) => {
    const marks = caseMarks(input(f, earned));
    const mastery = Object.fromEntries(f.domains.map((d) => [d.id, d.mastery]));
    return nextForExam({ marks, stage, daysLeft, mastery });
  };
  const spread = (m: Record<string, number>, answered = 30) => facts({ cleanAnswered: 100, domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered, mastery: m[d.id] ?? 0.5 })) });

  it('diagnose: First Foothold', () => {
    expect(run(facts({ cleanAnswered: 8 }), {}, 'diagnose').best?.key).toBe('first-foothold');
  });

  it('learn and practice: the Firm Footing leaf with the largest weight × gap to 70%', () => {
    // IS Audit (18%) at 40% → .054; IS Operations (26%) at 60% → .026; Info Protection (26%) at 55% → .039.
    const f = spread({ '1': 0.4, '4': 0.6, '5': 0.55, '2': 0.69, '3': 0.69 });
    expect(run(f, { 'first-foothold': T0 }, 'practice').best?.key).toBe('firm-footing:1');
    // Ties go to the heavier domain.
    const tie = spread({ '1': 0.6, '4': 0.6, '5': 0.6, '2': 0.6, '3': 0.6 });
    expect(['firm-footing:4', 'firm-footing:5']).toContain(run(tie, { 'first-foothold': T0 }, 'learn').best?.key);
  });

  it('mock stage, or the final three weeks: Dress Rehearsal, then On Pace, then Dress Rehearsal · 2 (once it opens)', () => {
    const f = spread({}, 40);
    expect(run(f, { 'first-foothold': T0 }, 'mock').best?.key).toBe('dress-rehearsal');
    expect(run(f, { 'first-foothold': T0, 'dress-rehearsal': T0 }, 'mock').best?.key).toBe('on-pace');
    // Dress Rehearsal · 2 is gated until Whole Map: never pushed before it opens.
    expect(run(f, { 'first-foothold': T0, 'dress-rehearsal': T0, 'on-pace': T0 }, 'mock').best?.key).not.toBe('dress-rehearsal:2');
    expect(run(f, { 'first-foothold': T0, 'dress-rehearsal': T0, 'on-pace': T0, 'whole-map': T0 }, 'mock').best?.key).toBe('dress-rehearsal:2');
    expect(run(f, { 'first-foothold': T0 }, 'practice', 20).best?.key).toBe('dress-rehearsal');
  });

  it('ready: the next Long Memory tier, then Graduate; the Stretch tier (150) only once Evergreen’s core is done', () => {
    const f = spread({}, 40);
    expect(run(f, { 'first-foothold': T0 }, 'ready').best?.key).toBe('long-memory');
    expect(run(f, { 'first-foothold': T0, 'long-memory': T0 }, 'ready').best?.key).toBe('long-memory:75');
    expect(run(f, { 'first-foothold': T0, 'long-memory': T0, 'long-memory:75': T0 }, 'ready').best?.key).toBe('graduate');
    // Graduate, Loop Closed and Took Root still open: 150 is never suggested yet.
    const n = run(f, { 'first-foothold': T0, 'long-memory': T0, 'long-memory:75': T0 }, 'ready');
    expect([n.best, ...n.nearest].some((m) => m?.key === 'long-memory:150')).toBe(false);
  });

  it('a Stretch tier is never slot 1, and waits while its set’s core is open', () => {
    // Every domain at 85% with 45 answers: the 80% tiers are met-able, Whole Map earned, core complete.
    const f = spread({ '1': 0.85, '2': 0.85, '3': 0.85, '4': 0.85, '5': 0.85 }, 45);
    const leaves = Object.fromEntries(cisa.domains.map((d) => [`firm-footing:${d.id}`, T0]));
    for (const stage of ['learn', 'practice', 'mock', 'ready'] as const) {
      const n = run(f, { 'first-foothold': T0, 'whole-map': T0, ...leaves }, stage);
      expect(n.best?.stretch).toBeFalsy();
    }
    // With a 70% leaf still open, no 80% tier is suggested at all.
    const { ['firm-footing:3']: _open, ...four } = leaves;
    const n = run(f, { 'first-foothold': T0, 'whole-map': T0, ...four }, 'practice');
    expect([n.best, ...n.nearest].some((m) => m?.stretch)).toBe(false);
  });

  it('mock badges are never suggested before the mock stage (unless the exam is three weeks away)', () => {
    const f = spread({}, 40);
    for (const stage of ['diagnose', 'learn', 'practice'] as const) {
      const n = run(f, {}, stage);
      for (const m of [n.best, ...n.nearest].filter(Boolean)) expect(['dress-rehearsal', 'on-pace']).not.toContain(m!.badge);
    }
    const dr = find(caseMarks(input(f)), 'dress-rehearsal');
    expect(suggestable(dr, 'practice', null)).toBe(false);
    expect(suggestable(dr, 'practice', 14)).toBe(true);
    expect(suggestLine(dr, 'practice', null)).toBe('Best once every domain reaches 65%.');
    expect(suggestLine(dr, 'mock', null)).toBeUndefined();
  });

  it('once Whole Map is earned the mocks stay suggested, even if the stage reads practice again', () => {
    // Two mocks below the ready score: journeyStage reads "practice" again.
    const f = spread({ '1': 0.75, '2': 0.75, '3': 0.75, '4': 0.75, '5': 0.75 }, 40);
    const leaves = Object.fromEntries(cisa.domains.map((d) => [`firm-footing:${d.id}`, T0]));
    const n = run(f, { 'first-foothold': T0, 'whole-map': T0, ...leaves }, 'practice');
    expect(n.best?.key).toBe('dress-rehearsal');
    expect(run(f, { 'first-foothold': T0, ...leaves }, 'practice').best?.badge).not.toBe('dress-rehearsal');
    const dr = find(caseMarks(input(f, { 'whole-map': T0 })), 'dress-rehearsal');
    expect(suggestable(dr, 'practice', null, true)).toBe(true);
    expect(suggestLine(dr, 'practice', null, true)).toBeUndefined();
  });

  it('the diagnostic comes first while it is undone, even in the final three weeks', () => {
    const f = spread({}, 40);
    expect(run(f, {}, 'diagnose', 10).best?.key).toBe('first-foothold');
  });

  it('never suggests a gated mark, Moments or Field notes; slots 2–3 are one per badge and not slot 1’s', () => {
    const f = facts({ cleanAnswered: 100, studyDays: 9, snareHits: Array(9).fill(true), domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered: 18, mastery: 0.66 })) });
    const n = run(f, { 'first-foothold': T0 }, 'practice');
    const all = [n.best!, ...n.nearest];
    expect(n.nearest.length).toBe(2);
    for (const m of all) {
      expect(m.status).not.toBe('gated');
      expect(['moments', 'fieldNotes']).not.toContain(m.set);
    }
    expect(new Set(all.map((m) => m.badge)).size).toBe(all.length);
    // Nearest by progress.
    expect(n.nearest[0].progress).toBeGreaterThanOrEqual(n.nearest[1].progress);
  });

  it('after the exam: no panel at all (the case is a keepsake album)', () => {
    expect(run(facts(), {}, 'afterExam')).toEqual({ nearest: [] });
  });

  it('Results gets one "Next:" line', () => {
    const m = run(spread({ '1': 0.62 }), { 'first-foothold': T0 }, 'practice').best!;
    expect(nextLine(m)).toMatch(/^Next: Firm Footing · .+, \d+% → 70% · \d+ of 20 answered$/);
  });
});

describe('Study for this', () => {
  const { marks } = caseOf(facts({ cleanAnswered: 3 }));
  const target = (key: string) => studyTarget(find(marks, key), '3');
  it('opens what earns each badge', () => {
    expect(target('first-foothold')).toEqual({ kind: 'diagnostic' });
    expect(target('topic-clear')).toEqual({ kind: 'guided' });
    expect(target('firm-footing:4')).toEqual({ kind: 'smart', domainId: '4' });
    expect(target('whole-map')).toEqual({ kind: 'smart', domainId: '3' });
    expect(target('long-memory')).toEqual({ kind: 'review' });
    expect(target('graduate')).toEqual({ kind: 'review' });
    expect(target('loop-closed')).toEqual({ kind: 'mistakes' });
    expect(target('slip-spotter')).toEqual({ kind: 'mistakes' });
    expect(target('know-what-you-know')).toEqual({ kind: 'smart' });
    expect(target('dress-rehearsal')).toEqual({ kind: 'mock' });
    expect(target('on-pace')).toEqual({ kind: 'mock' });
    expect(target('rooted:10')).toEqual({ kind: 'today' });
    expect(target('snare-wise')).toEqual({ kind: 'game', game: 'trap' });
    expect(target('whole-grove')).toEqual({ kind: 'play' });
    expect(target('fresh-start')).toBeNull(); // a moment, never a goal
    expect(target('mindset-shift')).toBeNull(); // gated: nothing to study for yet
  });
  it('says so first when nothing is due, or how to mark "sure"', () => {
    expect(studyNote(find(marks, 'long-memory'), { kind: 'review' }, 0)).toBe('Nothing due today. Smart mixes in older questions.');
    expect(studyNote(find(marks, 'long-memory'), { kind: 'review' }, 4)).toBeUndefined();
    expect(studyNote(find(marks, 'know-what-you-know'), { kind: 'smart' }, 0)).toBe('Mark “sure” only when you’d bet on it.');
  });
});

describe('spoken labels and the new dot', () => {
  it('name, state, rule, progress or date, set', () => {
    const { marks } = caseOf(facts({ longRecall: 12 }), { 'first-foothold': T0 });
    expect(markSpoken(find(marks, 'long-memory'), 'Evergreen')).toBe(
      'Long Memory · 25 recalls. Not yet. Get 25 questions right, without a hint, a week or more after you last saw them. 12 of 25 remembered. Evergreen.',
    );
    // A Stretch tier says so, in words, right after its name.
    expect(markSpoken(find(marks, 'long-memory:150'), 'Evergreen')).toMatch(/^Long Memory · 150 recalls\. Stretch, beyond exam need\. Not yet\. Get 150 questions right/);
    expect(markSpoken(find(marks, 'first-foothold'), 'Groundwork', '12 Oct')).toBe('First Foothold. Earned 12 Oct. Finish the 20-question diagnostic. Groundwork.');
    expect(markSpoken(find(marks, 'mindset-shift'), 'Sound Judgement')).toContain('Opens after 100 first tries spread over 2 weeks or more. Sound Judgement.');
  });
  it('a progress arrow is spoken as "now, aiming for", never "of"', () => {
    expect(spokenDetail('62% → 70% · 14 of 20 answered')).toBe('62% now, aiming for 70%, 14 of 20 answered');
    const { marks } = caseOf(facts({ domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered: 14, mastery: 0.62 })) }));
    const leaf = marks.find((m) => m.badge === 'firm-footing')!;
    expect(markSpoken(leaf, 'The Five Domains')).toContain('62% now, aiming for 70%, 14 of 20 answered.');
    expect(markSpoken(leaf, 'The Five Domains')).not.toMatch(/→| of 70/);
  });
  it('the new dot: only a badge earned after the case was last viewed', () => {
    expect(hasNewSince({ 'first-foothold': T0 - DAY }, T0)).toBe(false);
    expect(hasNewSince({ 'first-foothold': T0 + 1 }, T0)).toBe(true);
    expect(hasNewSince({ 'first-foothold': T0 }, T0)).toBe(false);
    expect(hasNewSince({ 'first-foothold': T0 + 1 }, undefined)).toBe(false);
    // A back-fill's or catalogue fill's quiet badges (stamped with its time) were already held: never new.
    expect(hasNewSince({ 'first-foothold': T0 + 5 }, T0, [T0 + 5])).toBe(false);
    expect(hasNewSince({ 'first-foothold': T0 + 5, 'topic-clear': T0 + 9 }, T0, [T0 + 5])).toBe(true);
    expect(hasNewSince({ 'first-foothold': T0 + 5, 'took-root': T0 + 9 }, T0, [T0 + 5, T0 + 9])).toBe(false);
  });
  it('a kept key the case does not show (a tier no version defines, an unknown badge) never lights the dot or the count', () => {
    for (const k of ['long-memory:999', 'long-memory:25', 'firm-footing:4:90', 'firm-footing:4:80:x', 'dress-rehearsal:4', 'dress-rehearsal:1', 'rooted', 'rooted:20', 'took-root:2', 'on-pace:2', 'nope', 'firm-footing::80'])
      expect(caseKey(k)).toBe(false);
    // Every key the catalogue lists is shown (mobile 1.11: the tiers and Took Root too).
    for (const m of allMarks(facts())) expect(caseKey(m.key)).toBe(true);
    for (const k of ['long-memory:75', 'long-memory:150', 'firm-footing:4:80', 'dress-rehearsal:2', 'dress-rehearsal:3', 'took-root']) expect(caseKey(k)).toBe(true);
    expect(caseKey('firm-footing:9')).toBe(true); // a domain the exam dropped still shows, earned
    expect(hasNewSince({ 'long-memory:999': T0 + 1 }, T0)).toBe(false);
    expect(caseEarnedCount({ 'first-foothold': T0, 'long-memory:999': T0, 'firm-footing:4:80': T0 })).toBe(2);
    const shown = caseOf(facts(), { 'first-foothold': T0, 'long-memory:999': T0 }).marks.filter((m) => m.status === 'earned');
    expect(shown.map((m) => m.key)).toEqual(['first-foothold']);
  });
});
