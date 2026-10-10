/**
 * Build E study modes: Smart (slot mix, weights, ordering, difficulty,
 * reason tags), Guided (step structure, topic clear), In order (resume,
 * mixed tail), Random (weighted draw), Practice this topic, and the
 * domain filter in every mode.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import type { Difficulty, PackQuestion } from '../content/types';
import { indexOutline, outlineFromNotes, topicQuestionIds, topicsIn, type OutlineTopic } from '../engine/outline';
import { createRng } from '../engine/random';
import type { AnswerRecord } from '../engine/readiness';
import {
  buildSmart,
  difficultyTarget,
  groupMastery,
  MAX_WEAK_RUN,
  orderSmart,
  rollingAccuracy,
  slotCounts,
  weakWeight,
  type OrderItem,
} from '../engine/smartMix';
import { DAY_MS, type ReviewEntry } from '../engine/srs';
import { activeMode, interleaveTopic, randomMix, REASON_LABEL, scopeKey, sessionSize, suggestedMode } from '../engine/studyModes';
import {
  blockedQuestions,
  currentGuidedTopic,
  guidedStep,
  inOrderSession,
  lastUnassisted,
  nextTopic,
  tailSize,
  topicStatus,
  topicStudied,
  walkOrder,
} from '../engine/studyPath';

const NOW = Date.UTC(2026, 9, 10, 12);
const rec = (correct: boolean, daysAgo = 1, extra: Partial<AnswerRecord> = {}): AnswerRecord => ({
  attempts: 1,
  correctCount: correct ? 1 : 0,
  lastCorrect: correct,
  lastAt: NOW - daysAgo * DAY_MS,
  ...extra,
});

/** A small synthetic outline: 2 domains × 2 topics × 2 subtopics × 4 questions. */
function fixture() {
  const questions: PackQuestion[] = [];
  const topics: OutlineTopic[] = [];
  const diffs: Difficulty[] = ['foundational', 'application', 'analysis', 'application'];
  for (const d of ['1', '2']) {
    for (const t of ['A1', 'A2']) {
      const subs = [1, 2].map((s) => {
        const ids = [0, 1, 2, 3].map((k) => {
          const id = `d${d}_${t}${s}${k}`;
          questions.push({
            id,
            certId: 'x',
            domainId: d,
            subtopic: `${t}.${s}`,
            difficulty: diffs[k],
            stem: 's',
            options: { A: 'a', B: 'b', C: 'c', D: 'd' },
            correct: 'A',
            explanation: '',
            wrongExplanations: {},
            tips: [],
            related: [],
          });
          return id;
        });
        return { id: `${d}${t}.${s}`, name: `Sub ${d}${t}.${s}`, questionIds: ids };
      });
      topics.push({ id: `${d}${t}`, domainId: d, name: `Topic ${d}${t}`, subtopics: subs });
    }
  }
  const index = indexOutline(topics);
  const byId = new Map(questions.map((q) => [q.id, q]));
  return { questions, topics, index, find: (id: string) => byId.get(id) };
}

describe('mode meta and the suggestion by stage', () => {
  it('suggests Random to diagnose, Guided to learn, Smart from practice on', () => {
    expect(suggestedMode('diagnose')).toBe('random');
    expect(suggestedMode('learn')).toBe('guided');
    for (const s of ['practice', 'mock', 'ready', 'examDay', 'afterExam'] as const) expect(suggestedMode(s)).toBe('smart');
  });
  it("the learner's saved choice always wins over the suggestion", () => {
    expect(activeMode(undefined, 'learn')).toBe('guided');
    expect(activeMode('inOrder', 'learn')).toBe('inOrder');
    expect(activeMode('random', 'practice')).toBe('random');
    // An unknown saved value (a newer app) falls back to the suggestion.
    expect(activeMode('future' as never, 'practice')).toBe('smart');
  });
  it('sizes snap to 10, 20 or 50; scope keys', () => {
    expect(sessionSize(undefined)).toBe(10);
    expect(sessionSize(20)).toBe(20);
    expect(sessionSize(37)).toBe(50);
    expect(scopeKey()).toBe('all');
    expect(scopeKey('3')).toBe('3');
  });
  it('reason tags read as the spec names them', () => {
    expect(REASON_LABEL).toEqual({ due: 'Due', weak: 'Weak spot', new: 'New', refresher: 'Refresher', mixed: 'Mixed review' });
  });
});

describe('Smart: slot mix', () => {
  it('splits 30 / 40 / 20 / 10', () => {
    expect(slotCounts(10, 0, 20)).toEqual({ due: 3, weak: 4, new: 2, refresher: 1 });
    expect(slotCounts(20, 0, 20)).toEqual({ due: 6, weak: 8, new: 4, refresher: 2 });
    expect(slotCounts(50, 40, 20)).toEqual({ due: 15, weak: 20, new: 10, refresher: 5 });
  });
  it('raises due to 50% when the backlog is more than twice the daily goal', () => {
    const c = slotCounts(10, 41, 20);
    expect(c.due).toBe(5);
    expect(c.due + c.weak + c.new + c.refresher).toBe(10);
    expect(c.weak).toBeGreaterThan(c.new);
  });

  it('fills each bucket from the right kind of question', () => {
    const { questions, index } = fixture();
    const answers: Record<string, AnswerRecord> = {};
    const review: Record<string, ReviewEntry> = {};
    // 3 due reviews, 4 old right answers (refreshers), some wrong answers.
    for (const id of ['d1_A110', 'd1_A120', 'd2_A110']) {
      answers[id] = rec(false, 2);
      review[id] = { box: 1, dueAt: NOW - 1000, lastSeen: NOW - 2 * DAY_MS, reps: 1 };
    }
    for (const id of ['d1_A211', 'd1_A221', 'd2_A211', 'd2_A221']) answers[id] = rec(true, 20);
    const plan = buildSmart({ pool: questions, answers, review, domainWeights: { '1': 60, '2': 40 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 20, now: NOW, rng: createRng(1) });
    expect(plan.items).toHaveLength(10);
    const by = (r: string) => plan.items.filter((i) => i.reason === r).map((i) => i.id);
    expect(by('due').sort()).toEqual(['d1_A110', 'd1_A120', 'd2_A110']);
    expect(by('weak')).toHaveLength(4);
    expect(by('new')).toHaveLength(2);
    for (const id of by('new')) expect(answers[id]).toBeUndefined();
    expect(by('refresher')).toHaveLength(1);
    for (const id of by('refresher')) expect(answers[id]?.lastCorrect).toBe(true);
    // Every question carries a reason tag, and none repeats.
    expect(plan.items.every((i) => i.reason)).toBe(true);
    expect(new Set(plan.items.map((i) => i.id)).size).toBe(10);
  });

  it('tops up from the next bucket when one is empty', () => {
    const { questions, index } = fixture();
    // No reviews, no answers: due and refresher are empty, the session still has 10.
    const plan = buildSmart({ pool: questions, answers: {}, review: {}, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 20, now: NOW, rng: createRng(2) });
    expect(plan.items).toHaveLength(10);
    expect(plan.items.filter((i) => i.reason === 'due' || i.reason === 'refresher')).toHaveLength(0);
  });

  it('never calls a never-answered subtopic a "Weak spot": it is tagged New', () => {
    const { questions, index } = fixture();
    for (let seed = 1; seed <= 5; seed++) {
      const plan = buildSmart({ pool: questions, answers: {}, review: {}, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 20, now: NOW, rng: createRng(seed) });
      expect(plan.items.filter((i) => i.reason === 'weak')).toEqual([]);
      expect(plan.items.every((i) => i.reason === 'new')).toBe(true);
    }
  });

  it('a question that is due is always tagged Due, even past the Due share', () => {
    const { questions, index } = fixture();
    const answers: Record<string, AnswerRecord> = {};
    const review: Record<string, ReviewEntry> = {};
    // Every question in domain 1 is a due review; the pool is domain 1 only.
    const pool = questions.filter((q) => q.domainId === '1');
    for (const q of pool) {
      answers[q.id] = rec(false, 2);
      review[q.id] = { box: 1, dueAt: NOW - 1000, lastSeen: NOW - 2 * DAY_MS, reps: 1 };
    }
    const plan = buildSmart({ pool, answers, review, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 50, now: NOW, rng: createRng(4) });
    expect(plan.items).toHaveLength(10);
    expect(plan.items.every((i) => i.reason === 'due')).toBe(true);
  });

  it('counts the backlog inside the session scope only', () => {
    const { questions, index } = fixture();
    const answers: Record<string, AnswerRecord> = {};
    const review: Record<string, ReviewEntry> = {};
    // 16 due in domain 1 (more than twice a goal of 5); the session is domain 2.
    for (const q of questions.filter((x) => x.domainId === '1')) {
      answers[q.id] = rec(false, 2);
      review[q.id] = { box: 1, dueAt: NOW - 1000, lastSeen: NOW - 2 * DAY_MS, reps: 1 };
    }
    const d2 = questions.filter((q) => q.domainId === '2');
    const run = (r: Record<string, ReviewEntry>) =>
      buildSmart({ pool: d2, answers, review: r, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 5, now: NOW, rng: createRng(5) }).items;
    expect(run(review)).toEqual(run({}));
  });

  it('never re-asks a question waiting in review before it is due', () => {
    const { questions, index } = fixture();
    const review: Record<string, ReviewEntry> = {};
    for (const q of questions.slice(0, 20)) review[q.id] = { box: 3, dueAt: NOW + 3 * DAY_MS, lastSeen: NOW, reps: 2 };
    const plan = buildSmart({ pool: questions, answers: {}, review, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 20, now: NOW, rng: createRng(3) });
    for (const i of plan.items) expect(review[i.id]).toBeUndefined();
  });
});

describe('Smart: weak-spot weights', () => {
  it('weight = blueprintWeight × (1 − mastery) + exploreBonus under 3 answers', () => {
    expect(weakWeight(0.2, 0.5, 5)).toBeCloseTo(0.1);
    expect(weakWeight(0.2, 0.5, 2)).toBeCloseTo(0.25);
    expect(weakWeight(0.2, 1, 10)).toBe(0);
  });
  it('mastery = credit / max(answered, 5); assisted is half; answers over 30 days count half', () => {
    expect(groupMastery([rec(true), rec(true)], NOW)).toBeCloseTo(2 / 5);
    expect(groupMastery([rec(true, 1, { lastAssisted: true })], NOW)).toBeCloseTo(0.5 / 5);
    const six = [rec(true), rec(true), rec(true), rec(false), rec(false), rec(false)];
    expect(groupMastery(six, NOW)).toBeCloseTo(0.5);
    // The same six, the right ones old: 1.5 / max(4.5, 5).
    const aged = [rec(true, 40), rec(true, 40), rec(true, 40), rec(false), rec(false), rec(false)];
    expect(groupMastery(aged, NOW)).toBeCloseTo(1.5 / 5);
  });
  it('draws a weak, heavily weighted subtopic far more often than a mastered one', () => {
    const { questions, index } = fixture();
    const answers: Record<string, AnswerRecord> = {};
    // Subtopic 1A1.1: all wrong. Subtopic 2A2.2: all right. Everything else: 5 right of 5.
    for (const q of questions) {
      const sub = index.subtopicOf(q.id)!;
      answers[q.id] = rec(sub !== '1A1.1', 3);
    }
    let weakHits = 0;
    let strongHits = 0;
    // One-question sessions: exactly one weak-spot draw each, so the hits
    // follow the weights (0.5 vs 0.1 here: about 5 to 1).
    for (let s = 0; s < 400; s++) {
      const plan = buildSmart({ pool: questions, answers, review: {}, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 1, dailyGoal: 20, now: NOW, rng: createRng(s) });
      for (const i of plan.items.filter((x) => x.reason === 'weak')) {
        if (index.subtopicOf(i.id) === '1A1.1') weakHits++;
        if (index.subtopicOf(i.id) === '2A2.2') strongHits++;
      }
    }
    expect(weakHits).toBeGreaterThan(120);
    expect(strongHits).toBeLessThan(weakHits / 3);
  });
});

describe('Smart: ordering', () => {
  const items = (spec: [string, OrderItem['reason'], boolean?][]): OrderItem[] =>
    spec.map(([group, reason, likely], k) => ({ id: `q${k}`, group, reason, likely: Boolean(likely) }));

  it('never puts two questions from the same subtopic in a row, and at most 3 weak spots in a row', () => {
    for (let s = 0; s < 50; s++) {
      const list = items([
        ['a', 'weak'], ['a', 'weak'], ['b', 'weak'], ['b', 'weak'], ['c', 'weak'], ['c', 'weak'],
        ['d', 'due'], ['e', 'new'], ['f', 'due'], ['g', 'refresher'],
      ]);
      const out = orderSmart(list, createRng(s));
      expect(out).toHaveLength(list.length);
      let run = 0;
      for (let k = 0; k < out.length; k++) {
        if (k > 0) expect(out[k].group).not.toBe(out[k - 1].group);
        run = out[k].reason === 'weak' ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(MAX_WEAK_RUN);
      }
    }
  });
  it('opens with a likely success: a refresher, else a strong subtopic', () => {
    for (let s = 0; s < 20; s++) {
      expect(orderSmart(items([['a', 'weak'], ['b', 'due'], ['c', 'refresher'], ['d', 'new']]), createRng(s))[0].reason).toBe('refresher');
      expect(orderSmart(items([['a', 'weak'], ['b', 'due'], ['c', 'new', true], ['d', 'new']]), createRng(s))[0].group).toBe('c');
    }
  });
  it('a whole Smart session keeps the subtopic rule when the pool allows it', () => {
    const { questions, index } = fixture();
    for (let s = 0; s < 30; s++) {
      const plan = buildSmart({ pool: questions, answers: {}, review: {}, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 20, now: NOW, rng: createRng(s) });
      const subs = plan.items.map((i) => index.subtopicOf(i.id));
      for (let k = 1; k < subs.length; k++) expect(subs[k]).not.toBe(subs[k - 1]);
    }
  });
});

describe('Smart: difficulty targeting', () => {
  const recentAnswers = (right: number) => {
    const a: Record<string, AnswerRecord> = {};
    for (let k = 0; k < 10; k++) a[`r${k}`] = rec(k < right, 0.1);
    return a;
  };
  it('reads the last 10 answers', () => {
    expect(rollingAccuracy({ a: rec(true) })).toBeNull();
    expect(rollingAccuracy(recentAnswers(9))).toBeCloseTo(0.9);
    expect(difficultyTarget(0.9)).toBe('analysis');
    expect(difficultyTarget(0.5)).toBe('foundational');
    expect(difficultyTarget(0.7)).toBeNull();
    expect(difficultyTarget(null)).toBeNull();
  });
  it('above 85% prefers analysis; below 55% prefers foundational and turns on support', () => {
    const { questions, index } = fixture();
    const high = buildSmart({ pool: questions, answers: recentAnswers(10), review: {}, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 4, dailyGoal: 20, now: NOW, rng: createRng(5) });
    expect(high.stretch).toBe(true);
    const share = (p: typeof high, d: Difficulty) => p.items.filter((i) => questions.find((q) => q.id === i.id)?.difficulty === d).length / p.items.length;
    expect(share(high, 'analysis')).toBeGreaterThanOrEqual(0.5);
    const low = buildSmart({ pool: questions, answers: recentAnswers(2), review: {}, domainWeights: { '1': 50, '2': 50 }, subtopicOf: index.subtopicOf, count: 4, dailyGoal: 20, now: NOW, rng: createRng(5) });
    expect(low.support).toBe(true);
    expect(share(low, 'foundational')).toBeGreaterThanOrEqual(0.5);
  });
});

describe('Guided', () => {
  it('a step is 5 topic questions, foundational first, then 3 mixed from earlier topics', () => {
    const { topics, find } = fixture();
    const items = guidedStep(topics, topics[2], find, {}, createRng(1));
    expect(items).toHaveLength(8);
    const block = items.slice(0, 5);
    const own = new Set(topicQuestionIds(topics[2]));
    expect(block.every((i) => own.has(i.id) && !i.reason)).toBe(true);
    const ranks = block.map((i) => ['foundational', 'application', 'analysis'].indexOf(find(i.id)!.difficulty));
    expect([...ranks].sort()).toEqual(ranks);
    expect(find(block[0].id)!.difficulty).toBe('foundational');
    expect(block.some((i) => find(i.id)!.difficulty !== 'foundational')).toBe(true);
    const tail = items.slice(5);
    const earlier = new Set([...topicQuestionIds(topics[0]), ...topicQuestionIds(topics[1])]);
    expect(tail.every((i) => i.reason === 'mixed' && earlier.has(i.id))).toBe(true);
    // Interleaved: the tail spans more than one earlier topic.
    expect(new Set(tail.map((i) => (topicQuestionIds(topics[0]).includes(i.id) ? 0 : 1))).size).toBe(2);
  });
  it('the first topic has no earlier topics, so its step is the 5 blocked questions', () => {
    const { topics, find } = fixture();
    expect(guidedStep(topics, topics[0], find, {}, createRng(1))).toHaveLength(5);
  });
  it('prefers questions not yet answered right', () => {
    const { topics, find } = fixture();
    const answers: Record<string, AnswerRecord> = {};
    for (const id of topicQuestionIds(topics[0]).slice(0, 4)) answers[id] = rec(true);
    const block = blockedQuestions(topics[0], find, answers, createRng(4));
    // The topic has 4 questions not yet right: all 4 are in, and one right one tops up the 5.
    expect(block.filter((id) => !answers[id])).toHaveLength(4);
    expect(block).toHaveLength(5);
  });
  it('topic clear = studied AND 4 of the last 5 unassisted answers right', () => {
    const { topics } = fixture();
    const ids = topicQuestionIds(topics[0]);
    const answers: Record<string, AnswerRecord> = {};
    ids.slice(0, 4).forEach((id, k) => (answers[id] = rec(true, 1 + k)));
    answers[ids[4]] = rec(false, 0.5);
    expect(topicStatus(topics[0], true, answers)).toMatchObject({ right: 4, answered: 5, clear: true });
    expect(topicStatus(topics[0], false, answers).clear).toBe(false); // the lesson isn't done
    // A newer wrong answer pushes the oldest right one out of the last 5.
    answers[ids[5]] = rec(false, 0.1);
    expect(topicStatus(topics[0], true, answers).clear).toBe(false);
    // Assisted answers (Coach me) are left out of the last 5.
    answers[ids[5]] = rec(false, 0.1, { lastAssisted: true });
    expect(lastUnassisted(ids, answers)).toHaveLength(5);
    expect(topicStatus(topics[0], true, answers).clear).toBe(true);
  });
  it('studied = the lesson is done, or every note read when the topic has no lesson', () => {
    const { topics } = fixture();
    expect(topicStudied(topics[0], ['l1'], ['l1'], [])).toBe(true);
    expect(topicStudied(topics[0], ['l1'], [], ['1A1.1', '1A1.2'])).toBe(false);
    expect(topicStudied(topics[0], [], [], ['1A1.1'])).toBe(false);
    expect(topicStudied(topics[0], [], [], ['1A1.1', '1A1.2'])).toBe(true);
  });
  it('the current topic is the first not clear from the cursor; Next is never locked', () => {
    const { topics } = fixture();
    const clear = new Set(['1A1']);
    const isClear = (t: OutlineTopic) => clear.has(t.id);
    expect(currentGuidedTopic(topics, undefined, isClear)?.id).toBe('1A2');
    expect(currentGuidedTopic(topics, '2A1', isClear)?.id).toBe('2A1');
    // Moving on from an uncleared topic is always allowed.
    expect(nextTopic(topics, topics[1])?.id).toBe('2A1');
    expect(nextTopic(topics, topics[3])?.id).toBe('1A1');
    // The saved topic wins even when it is clear: "Next topic" lands where it says.
    for (const t of topics) clear.add(t.id);
    clear.delete('1A2');
    expect(currentGuidedTopic(topics, '2A2', isClear)?.id).toBe('2A2');
    // An unknown saved topic (removed in a content update): the first uncleared.
    expect(currentGuidedTopic(topics, 'gone', isClear)?.id).toBe('1A2');
  });
  it('"Next topic" with isClear names the next uncleared topic, never the current one', () => {
    const { topics } = fixture();
    const clear = new Set(['1A2', '2A1']);
    const isClear = (t: OutlineTopic) => clear.has(t.id);
    expect(nextTopic(topics, topics[0], isClear)?.id).toBe('2A2'); // skips the clear 1A2 and 2A1
    expect(nextTopic(topics, topics[3], isClear)?.id).toBe('1A1'); // wraps round
    // Every other topic clear: simply the next one, still not the current topic.
    for (const t of topics) clear.add(t.id);
    clear.delete('1A1');
    expect(nextTopic(topics, topics[0], isClear)?.id).toBe('1A2');
  });
});

describe('In order', () => {
  it('walks the outline from the start, then resumes after the last answered question', () => {
    const { topics, find } = fixture();
    const walk = walkOrder(topics, (id) => Boolean(find(id)));
    const first = inOrderSession(topics, walk, undefined, 10, {}, createRng(1));
    expect(first.slice(0, 8).map((i) => i.id)).toEqual(walk.slice(0, 8).map((w) => w.id));
    const resumed = inOrderSession(topics, walk, walk[7].id, 10, {}, createRng(1));
    expect(resumed.slice(0, 8).map((i) => i.id)).toEqual(walk.slice(8, 16).map((w) => w.id));
    // An unknown cursor (a removed question) starts over; the end wraps round.
    expect(inOrderSession(topics, walk, 'gone', 10, {}, createRng(1))[0].id).toBe(walk[0].id);
    expect(inOrderSession(topics, walk, walk[walk.length - 1].id, 10, {}, createRng(1))[0].id).toBe(walk[0].id);
  });
  it('every session ends with a 2–3 question mixed review tail from earlier topics', () => {
    const { topics, find } = fixture();
    const walk = walkOrder(topics, (id) => Boolean(find(id)));
    expect(tailSize(10)).toBe(2);
    expect(tailSize(20)).toBe(3);
    const s = inOrderSession(topics, walk, walk[15].id, 10, {}, createRng(1));
    expect(s).toHaveLength(10);
    const tail = s.slice(-2);
    expect(tail.every((i) => i.reason === 'mixed')).toBe(true);
    const before = new Set(walk.slice(0, 16).map((w) => w.id));
    expect(tail.every((i) => before.has(i.id))).toBe(true);
    // Even the very first session ends mixed (from a topic other than its last).
    const first = inOrderSession(topics, walk, undefined, 20, {}, createRng(1));
    expect(first.slice(-3).every((i) => i.reason === 'mixed')).toBe(true);
    expect(new Set(first.map((i) => i.id)).size).toBe(first.length);
  });
});

describe('Random', () => {
  it('draws domains in proportion to the blueprint', () => {
    const pool: PackQuestion[] = [];
    for (const d of ['1', '2']) for (let k = 0; k < 500; k++) pool.push({ id: `d${d}_${k}`, domainId: d } as PackQuestion);
    const items = randomMix(pool, { '1': 75, '2': 25 }, 400, createRng(9));
    expect(items).toHaveLength(400);
    const share = items.filter((i) => i.id.startsWith('d1_')).length / 400;
    expect(share).toBeGreaterThan(0.68);
    expect(share).toBeLessThan(0.82);
    expect(new Set(items.map((i) => i.id)).size).toBe(400);
  });
});

describe('Practice this topic', () => {
  it("interleaves the topic's subtopics and caps the set", () => {
    const ids = interleaveTopic([['a1', 'a2', 'a3'], ['b1', 'b2'], ['c1']], createRng(3));
    expect(ids.sort()).toEqual(['a1', 'a2', 'a3', 'b1', 'b2', 'c1']);
    const order = interleaveTopic([['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']], createRng(3));
    for (let k = 1; k < order.length; k++) expect(order[k][0]).not.toBe(order[k - 1][0]);
    expect(interleaveTopic([Array.from({ length: 30 }, (_, k) => `x${k}`)], createRng(1), 20)).toHaveLength(20);
  });
});

describe('the domain filter works in every mode (real CISA content)', () => {
  const cert = getCertification('cisa')!;
  const weights = Object.fromEntries(cert.domains.map((d) => [d.id, d.weight]));
  const bank = getAllQuestions('cisa');
  const topics = outlineFromNotes(getNotes('cisa'));
  const index = indexOutline(topics);
  const byId = new Map(bank.map((q) => [q.id, q]));
  const find = (id: string) => byId.get(id);
  it('keeps every mode inside domain 3', () => {
    const pool = bank.filter((q) => q.domainId === '3');
    const inD3 = (ids: string[]) => ids.every((id) => find(id)?.domainId === '3');
    const smart = buildSmart({ pool, answers: {}, review: {}, domainWeights: weights, subtopicOf: index.subtopicOf, count: 20, dailyGoal: 20, now: NOW, rng: createRng(1) });
    expect(smart.items).toHaveLength(20);
    expect(inD3(smart.items.map((i) => i.id))).toBe(true);
    expect(inD3(randomMix(pool, weights, 20, createRng(1)).map((i) => i.id))).toBe(true);
    const d3 = topicsIn(topics, '3');
    const walk = walkOrder(d3, (id) => Boolean(find(id)));
    const ordered = inOrderSession(d3, walk, undefined, 20, {}, createRng(1));
    expect(ordered).toHaveLength(20);
    expect(inD3(ordered.map((i) => i.id))).toBe(true);
    const step = guidedStep(d3, d3[2], find, {}, createRng(1));
    expect(step).toHaveLength(8);
    expect(inD3(step.map((i) => i.id))).toBe(true);
  });
  it('the outline follows the notes and covers nearly the whole bank', () => {
    expect(topics.length).toBeGreaterThan(30);
    expect(topics[0].domainId).toBe('1');
    const walked = new Set(walkOrder(topics, (id) => Boolean(find(id))).map((w) => w.id));
    expect(walked.size / bank.length).toBeGreaterThan(0.9);
  });
});
