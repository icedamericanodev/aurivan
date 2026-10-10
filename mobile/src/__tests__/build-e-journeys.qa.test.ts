/**
 * QA Build E (PR #34): the learner journeys through the study modes and the
 * two new games, walked on the REAL CISA bank and notes (not fixtures).
 *
 * - New learner: every mode, on All and on each domain, gives a session of
 *   the right size, with no duplicates, inside the chosen scope.
 * - Smart with history: reason tags agree with the learner's record, no two
 *   neighbours share a subtopic, and a big backlog lifts Due to 50%.
 * - Guided: step 1 (lesson) → 2 (5 on the topic) → 3 (3 mixed); a topic
 *   clears at lesson + 4 of the last 5; "Next topic" never needs a clear.
 * - In order: resumes per domain; the mixed tail is there at every place.
 * - Random: the spread follows the blueprint.
 * - Timer: the Study default reaches every non-mock way in.
 * - Root or Rumor: 12 per round, missed cards come back, readiness and
 *   mastery never move.
 *
 * Bugs found in this pass are pinned with `it.failing`: each passes while
 * the bug is there and turns red once it is fixed (then drop `.failing`).
 */
import { getCertification } from '../content/certifications';
import { findQuestion, getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import type { PackQuestion } from '../content/types';
import { buildRumorRound, readAgain, rumorStatements, RUMOR_SIZE } from '../engine/games/rootOrRumor';
import { indexOutline, outlineFromNotes, topicQuestionIds, topicsIn, type OutlineTopic } from '../engine/outline';
import { createRng } from '../engine/random';
import type { AnswerRecord } from '../engine/readiness';
import { buildSmart, REFRESH_DAYS } from '../engine/smartMix';
import { DAY_MS, dueIds, type ReviewEntry } from '../engine/srs';
import { interleaveTopic, randomMix } from '../engine/studyModes';
import { currentGuidedTopic, guidedStep, inOrderSession, nextTopic, walkOrder } from '../engine/studyPath';
import { runPlanItem } from '../lib/actions';
import { guidedStatus, scopeTopics, topicLessons } from '../lib/outline';
import { advancePath, startFromIds, startGuidedStep, startMock, startPractice, startReview, startStudy } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const NOW = Date.UTC(2026, 9, 10, 12);
const cert = getCertification('cisa')!;
const weights = Object.fromEntries(cert.domains.map((d) => [d.id, d.weight]));
const bank = getAllQuestions('cisa');
const topics = outlineFromNotes(getNotes('cisa'));
const index = indexOutline(topics);
const byId = new Map(bank.map((q) => [q.id, q]));
const find = (id: string) => byId.get(id);
const SCOPES = [undefined, '1', '2', '3', '4', '5'];
const SIZES = [10, 20, 50];
const poolOf = (scope?: string) => (scope ? bank.filter((q) => q.domainId === scope) : bank);
const inScope = (ids: string[], scope?: string) => ids.every((id) => byId.has(id) && (!scope || find(id)!.domainId === scope));
const unique = (ids: string[]) => new Set(ids).size === ids.length;
/** The grouping Smart uses: the note subtopic, else the bank's own label. */
const groupOf = (id: string) => index.subtopicOf(id) ?? `~${find(id)!.domainId}:${find(id)!.subtopic}`;
const smart = (over: Partial<Parameters<typeof buildSmart>[0]> & { pool: PackQuestion[] }) =>
  buildSmart({ answers: {}, review: {}, domainWeights: weights, subtopicOf: index.subtopicOf, count: 10, dailyGoal: 20, now: NOW, rng: createRng(1), ...over });

/** A learner with history: `n` answered questions, ~40% wrong (queued, most due), spread over 60 days. */
function history(seed: number, n: number) {
  const rng = createRng(seed);
  const answers: Record<string, AnswerRecord> = {};
  const review: Record<string, ReviewEntry> = {};
  const ids = [...bank].sort(() => rng() - 0.5).slice(0, n);
  for (const q of ids) {
    const right = rng() < 0.6;
    const at = NOW - Math.floor(rng() * 60) * DAY_MS;
    answers[q.id] = { attempts: 1, correctCount: right ? 1 : 0, lastCorrect: right, lastAt: at };
    if (!right) review[q.id] = { box: 1, dueAt: NOW + (rng() < 0.3 ? 3 : -1) * DAY_MS, lastSeen: at, reps: 1 };
  }
  return { answers, review };
}

const cp = () => selectCert(useProgress.getState(), 'cisa');
beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', practiceTimer: false, dailyGoal: 20, studyMode: undefined, studyDomain: undefined, studySize: undefined });
});

// ── New learner ─────────────────────────────────────────────────────────
describe('a new learner (no data) runs every mode on All and on each domain', () => {
  it('Smart, In order and Random: the right size, no duplicates, inside the scope', () => {
    for (const scope of SCOPES) {
      const ts = topicsIn(topics, scope);
      const walk = walkOrder(ts, (id) => byId.has(id));
      for (const count of SIZES) {
        for (let seed = 1; seed <= 3; seed++) {
          const sessions = {
            smart: smart({ pool: poolOf(scope), count, rng: createRng(seed) }).items,
            random: randomMix(poolOf(scope), weights, count, createRng(seed)),
            inOrder: inOrderSession(ts, walk, undefined, count, {}, createRng(seed)),
          };
          for (const [mode, items] of Object.entries(sessions)) {
            const ids = items.map((i) => i.id);
            expect({ mode, scope, count, n: ids.length, unique: unique(ids), inScope: inScope(ids, scope) }).toEqual({ mode, scope, count, n: count, unique: true, inScope: true });
          }
        }
      }
    }
  });

  it('Guided: every topic in every scope is 5 on the topic (+3 mixed after the first), no duplicates', () => {
    for (const scope of SCOPES) {
      const ts = topicsIn(topics, scope);
      ts.forEach((t, k) => {
        const step = guidedStep(ts, t, find, {}, createRng(k + 1));
        const ids = step.map((i) => i.id);
        const own = new Set(topicQuestionIds(t));
        expect({ topic: t.id, n: ids.length, unique: unique(ids), inScope: inScope(ids, scope) }).toEqual({ topic: t.id, n: k === 0 ? 5 : 8, unique: true, inScope: true });
        expect(ids.slice(0, 5).every((id) => own.has(id))).toBe(true);
        expect(step.slice(5).every((i) => i.reason === 'mixed' && !own.has(i.id))).toBe(true);
      });
    }
  });

  it('the app-level starters give the same sizes, titled by mode and scope', () => {
    for (const scope of [undefined, '3']) {
      for (const mode of ['smart', 'inOrder', 'random'] as const) {
        for (const count of SIZES) {
          const s = startStudy('cisa', { mode, domainId: scope, count })!;
          expect(s.questionIds).toHaveLength(count);
          expect(unique(s.questionIds)).toBe(true);
          expect(inScope(s.questionIds, scope)).toBe(true);
          expect(s.title).toBe(`${{ smart: 'Smart', inOrder: 'In order', random: 'Random' }[mode]} · ${scope ? cert.domains.find((d) => d.id === scope)!.short : 'All domains'}`);
          useSession.getState().clear();
        }
      }
    }
  });

  // FIXED (was Major): a learner with no answers saw "Weak spot" on most Smart
  // questions. With nothing due, the Due slots fall through to the weak
  // bucket, and every untouched subtopic has mastery 0, so 8 of 10 never-seen
  // questions are tagged "Weak spot" (2 are "New").
  it('Smart never calls a question a "Weak spot" before the learner has answered anything', () => {
    for (const scope of [undefined, '2']) {
      for (let seed = 1; seed <= 5; seed++) {
        const plan = smart({ pool: poolOf(scope), count: 10, rng: createRng(seed) });
        expect(plan.items.filter((i) => i.reason === 'weak')).toEqual([]);
      }
    }
  });
});

// ── Smart with history ───────────────────────────────────────────────────
describe('Smart with history', () => {
  const runs = Array.from({ length: 60 }, (_, k) => {
    const seed = k + 1;
    const { answers, review } = history(seed, 300);
    const scope = seed % 2 ? undefined : String((seed % 5) + 1);
    const count = SIZES[seed % 3];
    return { answers, review, scope, count, plan: smart({ pool: poolOf(scope), answers, review, count, rng: createRng(seed) }) };
  });

  it('every reason tag agrees with the learner’s record', () => {
    for (const { answers, review, plan, count } of runs) {
      expect(plan.items).toHaveLength(count);
      const due = new Set(dueIds(review, NOW));
      for (const { id, reason } of plan.items) {
        const r = answers[id];
        // Nothing waiting for a later review date is ever pulled early.
        expect(review[id] && review[id].dueAt > NOW).toBeFalsy();
        if (reason === 'due') expect(due.has(id)).toBe(true);
        if (reason === 'new') expect(r).toBeUndefined();
        if (reason === 'refresher') {
          expect(r?.lastCorrect).toBe(true);
          expect(NOW - r!.lastAt).toBeGreaterThanOrEqual(REFRESH_DAYS * DAY_MS);
          expect(review[id]).toBeUndefined();
        }
      }
    }
  });

  it('no two questions in a row share a subtopic (the note’s, or the label on screen)', () => {
    for (const { plan } of runs) {
      const ids = plan.items.map((i) => i.id);
      for (let k = 1; k < ids.length; k++) {
        expect(groupOf(ids[k])).not.toBe(groupOf(ids[k - 1]));
        expect(find(ids[k])!.subtopic).not.toBe(find(ids[k - 1])!.subtopic);
      }
    }
  });

  it('with a backlog over twice the daily goal, Due takes 50% (30% otherwise)', () => {
    const backlog = (n: number) => {
      const answers: Record<string, AnswerRecord> = {};
      const review: Record<string, ReviewEntry> = {};
      for (const q of bank.slice(0, n)) {
        answers[q.id] = { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: NOW - 2 * DAY_MS };
        review[q.id] = { box: 1, dueAt: NOW - DAY_MS, lastSeen: NOW - 2 * DAY_MS, reps: 1 };
      }
      return { answers, review };
    };
    const dueTagged = (n: number, count: number) => smart({ pool: bank, ...backlog(n), count }).items.filter((i) => i.reason === 'due').length;
    // Goal 20: 41 due is "more than twice", 40 is not.
    expect([10, 20, 50].map((c) => dueTagged(41, c))).toEqual([5, 10, 25]);
    expect([10, 20, 50].map((c) => dueTagged(40, c))).toEqual([3, 6, 15]);
  });

  // FIXED (was Minor): the backlog was counted across ALL domains, even when the
  // session is for one domain. A learner with 100 reviews due in domain 1
  // who studies domain 5 (nothing due there) gets the 50% due split, so the
  // empty due slots spill into Weak spot and "New" shrinks from 2 to 1.
  it('a backlog in another domain does not change a one-domain Smart session', () => {
    const answers: Record<string, AnswerRecord> = {};
    const review: Record<string, ReviewEntry> = {};
    for (const q of bank.filter((x) => x.domainId === '1').slice(0, 100)) {
      answers[q.id] = { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: NOW - 2 * DAY_MS };
      review[q.id] = { box: 1, dueAt: NOW - DAY_MS, lastSeen: NOW - 2 * DAY_MS, reps: 1 };
    }
    const d5 = poolOf('5');
    const withBacklog = smart({ pool: d5, answers, review, count: 10, rng: createRng(4) });
    const without = smart({ pool: d5, answers, review: {}, count: 10, rng: createRng(4) });
    expect(withBacklog.items).toEqual(without.items);
  });

  // FIXED (was Minor): the Weak-spot bucket could take a question that is DUE for
  // review and tag it "Weak spot" (smartMix.ts pickWeak's own comment says
  // "last answer wrong (not queued)"). The due cap then means nothing: here
  // every question in scope is due, the session is all reviews, but half of
  // them say "Weak spot".
  it('a question due for review is always tagged Due, never Weak spot', () => {
    const pool = topicQuestionIds(topics.find((t) => t.domainId === '2')!)
      .map(find)
      .filter((q): q is PackQuestion => Boolean(q));
    const answers: Record<string, AnswerRecord> = {};
    const review: Record<string, ReviewEntry> = {};
    for (const q of pool) {
      answers[q.id] = { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: NOW - 2 * DAY_MS };
      review[q.id] = { box: 1, dueAt: NOW - DAY_MS, lastSeen: NOW - 2 * DAY_MS, reps: 1 };
    }
    const plan = smart({ pool, answers, review, count: 10, dailyGoal: 50 });
    expect(plan.items.filter((i) => i.reason !== 'due').map((i) => i.id)).toEqual([]);
  });
});

// ── Guided ───────────────────────────────────────────────────────────────
describe('Guided: step 1, 2 and 3, topic clear, and Next topic', () => {
  const all = scopeTopics('cisa');
  const isClear = (t: OutlineTopic) => guidedStatus('cisa', t, cp()).clear;
  const current = () => currentGuidedTopic(all, cp().studyPath?.guided?.all, isClear)!;
  const answerStep = (ids: string[], rights: boolean[], assisted = false) =>
    ids.forEach((id, k) => useProgress.getState().recordAnswer('cisa', id, rights[k], 'sure', { assisted }));

  it('walks topic 1 → clear → topic 2, with the mixed step from topic 1', () => {
    const [t1, t2] = all;
    expect(current().id).toBe(t1.id);
    // Step 2 alone (no lesson yet): 5 right is NOT clear.
    const s1 = startGuidedStep('cisa', t1.id)!;
    expect(s1.questionIds).toHaveLength(5); // the first topic has nothing to mix in
    expect(s1.questionIds.every((id) => topicQuestionIds(t1).includes(id))).toBe(true);
    answerStep(s1.questionIds, [true, true, true, true, true]);
    expect(guidedStatus('cisa', t1, cp())).toMatchObject({ studied: false, right: 5, clear: false });
    // Step 1: the lesson for 1A1 ("The audit charter").
    useProgress.getState().completeLesson('cisa', 'cisa-l-d1-charter');
    expect(guidedStatus('cisa', t1, cp())).toMatchObject({ studied: true, clear: true });
    // Guided moves on by itself; the next step mixes in topic 1.
    expect(current().id).toBe(t2.id);
    useSession.getState().clear();
    const s2 = startGuidedStep('cisa', t2.id)!;
    expect(s2.questionIds).toHaveLength(8);
    expect(s2.questionIds.slice(5).every((id) => s2.reasons?.[id] === 'mixed' && topicQuestionIds(t1).includes(id))).toBe(true);
  });

  it('clear needs 4 of the LAST 5 unassisted answers: 3 of 5 is not, assisted answers do not count', () => {
    const t1 = all[0];
    useProgress.getState().completeLesson('cisa', 'cisa-l-d1-charter');
    const ids = topicQuestionIds(t1).filter((id) => byId.has(id));
    let at = NOW;
    const answer = (id: string, ok: boolean, assisted = false) => {
      at += 60_000;
      jest.setSystemTime(at);
      useProgress.getState().recordAnswer('cisa', id, ok, 'sure', { assisted });
    };
    jest.useFakeTimers({ now: NOW });
    try {
      [true, true, true, false, false].forEach((ok, k) => answer(ids[k], ok));
      expect(guidedStatus('cisa', t1, cp())).toMatchObject({ right: 3, answered: 5, clear: false });
      // Two right answers with Coach me: still 3 of the last 5 unassisted.
      answer(ids[5], true, true);
      answer(ids[6], true, true);
      expect(guidedStatus('cisa', t1, cp()).clear).toBe(false);
      // It is a sliding window: three more unassisted rights still leave both
      // misses among the last 5 (3 of 5); the fourth pushes one out (4 of 5).
      [7, 8, 9].forEach((k) => answer(ids[k], true));
      expect(guidedStatus('cisa', t1, cp())).toMatchObject({ right: 3, answered: 5, clear: false });
      answer(ids[10], true);
      expect(guidedStatus('cisa', t1, cp())).toMatchObject({ right: 4, clear: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('"Next topic" works while the topic is not clear', () => {
    const [t1, t2] = all;
    expect(isClear(t1)).toBe(false);
    const next = nextTopic(all, current())!;
    expect(next.id).toBe(t2.id);
    useProgress.getState().setPathCursor('cisa', 'guided', 'all', next.id);
    expect(current().id).toBe(t2.id);
  });

  // BUG (Minor): the button says "Next topic: <B>" but, when B is already
  // clear, Guided lands on the first uncleared topic AFTER B (C). The label
  // and the announcement name a topic the learner never sees.
  it.failing('"Next topic" lands on the topic the button names', () => {
    const [a, b] = all;
    // B (the second topic) is clear: lesson done, 5 right.
    useProgress.getState().completeLesson('cisa', topicLessons('cisa', b.id)[0].id);
    for (const id of topicQuestionIds(b).filter((x) => byId.has(x)).slice(0, 5)) useProgress.getState().recordAnswer('cisa', id, true, 'sure');
    expect(isClear(b)).toBe(true);
    expect(current().id).toBe(a.id);
    const named = nextTopic(all, current())!;
    useProgress.getState().setPathCursor('cisa', 'guided', 'all', named.id);
    expect(current().id).toBe(named.id);
  });

  // BUG (Minor): when every topic after the current one is clear, "Next
  // topic" saves the next topic, Guided skips the clear ones, wraps round
  // and comes back to the SAME topic: the button does nothing.
  it.failing('when "Next topic" is offered, pressing it always leaves the current topic', () => {
    const d1 = scopeTopics('cisa', '1');
    const isClear1 = (t: OutlineTopic) => t.id !== d1[0].id || guidedStatus('cisa', t, cp()).clear;
    const here = currentGuidedTopic(d1, undefined, isClear1)!;
    expect(here.id).toBe(d1[0].id);
    const next = nextTopic(d1, here)!;
    expect(next.id).not.toBe(here.id); // the screen shows the button
    expect(currentGuidedTopic(d1, next.id, isClear1)!.id).not.toBe(here.id);
  });
});

// ── In order ─────────────────────────────────────────────────────────────
describe('In order', () => {
  it('stops mid-way and resumes there, per domain; other scopes keep their own place', () => {
    const d4 = startStudy('cisa', { mode: 'inOrder', domainId: '4', count: 10 })!;
    // Answer 4 of the 8 walk questions, then stop.
    for (const id of d4.questionIds.slice(0, 4)) advancePath(d4, id);
    useSession.getState().clear();
    expect(cp().studyPath?.inOrder).toEqual({ '4': d4.questionIds[3] });
    const again = startStudy('cisa', { mode: 'inOrder', domainId: '4', count: 10 })!;
    expect(again.questionIds.slice(0, 4)).toEqual(d4.questionIds.slice(4, 8));
    useSession.getState().clear();
    // All domains and domain 2 still start at their own beginning.
    const allWalk = walkOrder(scopeTopics('cisa'), (id) => byId.has(id));
    expect(startStudy('cisa', { mode: 'inOrder', count: 10 })!.questionIds[0]).toBe(allWalk[0].id);
    useSession.getState().clear();
    const d2Walk = walkOrder(scopeTopics('cisa', '2'), (id) => byId.has(id));
    expect(startStudy('cisa', { mode: 'inOrder', domainId: '2', count: 10 })!.questionIds[0]).toBe(d2Walk[0].id);
  });

  it('the mixed tail is always there: every place in every scope, sizes 10 / 20 / 50', () => {
    for (const scope of SCOPES) {
      const ts = topicsIn(topics, scope);
      const walk = walkOrder(ts, (id) => byId.has(id));
      for (let k = -1; k < walk.length; k += 3) {
        for (const count of SIZES) {
          const s = inOrderSession(ts, walk, walk[k]?.id, count, {}, createRng(k + 2));
          const ids = s.map((i) => i.id);
          const tail = s.filter((i) => i.reason === 'mixed');
          expect({ scope, k, count, n: ids.length, unique: unique(ids), tail: tail.length, last: s.slice(-tail.length).every((i) => i.reason === 'mixed') }).toEqual({
            scope,
            k,
            count,
            n: count,
            unique: true,
            tail: count >= 20 ? 3 : 2,
            last: true,
          });
        }
      }
    }
  });
});

// ── Random ───────────────────────────────────────────────────────────────
describe('Random', () => {
  it('over many runs the domain spread follows the blueprint (within 1.5 points)', () => {
    const tally: Record<string, number> = {};
    let n = 0;
    for (let seed = 0; seed < 3000; seed++) {
      for (const { id } of randomMix(bank, weights, 10, createRng(seed))) {
        tally[find(id)!.domainId] = (tally[find(id)!.domainId] ?? 0) + 1;
        n++;
      }
    }
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const d of cert.domains) expect(Math.abs(tally[d.id] / n - d.weight / total)).toBeLessThan(0.015);
  });
});

// ── Timer ────────────────────────────────────────────────────────────────
describe('Timed practice (Settings default on) reaches every non-mock way in', () => {
  it('Today’s plan, review, concept, topic, Saved, Mistakes, Bank, Weak area, every mode and Guided are timed; mocks are not', () => {
    useSettings.setState({ practiceTimer: true });
    const miss = (id: string) => {
      useProgress.getState().recordAnswer('cisa', id, false);
      useProgress.getState().recordMistake('cisa', id, 'A');
    };
    miss(bank[0].id);
    const t = topics[3];
    const starts: [string, () => unknown][] = [
      ['Today: practice', () => runPlanItem({ kind: 'practice', count: 5, label: '5 questions' }, 'cisa')],
      ['Today: review', () => runPlanItem({ kind: 'review', count: 1 }, 'cisa')],
      ['Spaced review', () => startReview('cisa')],
      ['Practice this concept', () => startFromIds('cisa', topicQuestionIds(t).slice(0, 3), 'Concept')],
      ['Practice this topic', () => startFromIds('cisa', interleaveTopic(t.subtopics.map((s) => s.questionIds), createRng(1)), t.name)],
      ['Saved', () => startFromIds('cisa', [bank[2].id], 'Saved questions')],
      ['Mistakes', () => startFromIds('cisa', [bank[0].id], 'Mistake journal')],
      ['Bank', () => startFromIds('cisa', [bank[5].id], 'Question bank')],
      ['Weak area', () => startPractice('cisa', { count: 10, domainId: '4', title: 'IS Operations' })],
      ['Smart', () => startStudy('cisa', { mode: 'smart', count: 10 })],
      ['In order', () => startStudy('cisa', { mode: 'inOrder', domainId: '3', count: 20 })],
      ['Random', () => startStudy('cisa', { mode: 'random', count: 50 })],
      ['Guided', () => startGuidedStep('cisa', topics[1].id)],
    ];
    for (const [name, start] of starts) {
      useSession.getState().clear();
      start();
      expect({ name, timed: useSession.getState().active?.timed }).toEqual({ name, timed: true });
    }
    useSession.getState().clear();
    expect(startMock('cisa')?.timed).toBeUndefined();
    useSession.getState().clear();
    expect(startMock('cisa', 50, { timing: 'untimed' })?.timed).toBeUndefined();
  });
});

// ── Root or Rumor ────────────────────────────────────────────────────────
describe('Root or Rumor', () => {
  const all = rumorStatements(getNotes('cisa'));

  it('every round is 12 distinct statements, 6 Roots and 6 Rumors; Seedling stays in one domain', () => {
    for (const tier of ['seedling', 'sapling', 'heartwood'] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const r = buildRumorRound(all, {}, tier, createRng(seed), NOW);
        expect(r).toHaveLength(RUMOR_SIZE);
        expect(unique(r.map((s) => s.id))).toBe(true);
        expect(r.filter((s) => s.kind === 'root')).toHaveLength(6);
        if (tier === 'seedling') expect(new Set(r.map((s) => s.domainId)).size).toBe(1);
      }
    }
  });

  it('missed cards come back in the next round (up to half of it), readiness and mastery never move', () => {
    const r1 = buildRumorRound(all, cp().cards, 'sapling', createRng(1), Date.now());
    const before = JSON.stringify({ answers: cp().answers, mastery: cp().mastery, review: cp().review, mistakes: cp().mistakes, moments: cp().moments });
    // Miss 4 statements (two subtopics if the round paired them), get the rest right.
    const missed = r1.slice(0, 4);
    for (const s of r1) useProgress.getState().recordCard('cisa', s.id, !missed.includes(s));
    expect(JSON.stringify({ answers: cp().answers, mastery: cp().mastery, review: cp().review, mistakes: cp().mistakes, moments: cp().moments })).toBe(before);
    for (const tier of ['sapling', 'heartwood'] as const) {
      const r2 = buildRumorRound(all, cp().cards, tier, createRng(2), Date.now() + 1);
      expect(missed.every((m) => r2.some((s) => s.id === m.id))).toBe(true);
    }
    // Seedling brings back the missed cards of the domain it picks.
    const r3 = buildRumorRound(all, cp().cards, 'seedling', createRng(3), Date.now() + 1);
    const back = missed.filter((m) => m.domainId === r3[0].domainId);
    expect(back.length).toBeGreaterThan(0);
    expect(back.every((m) => r3.some((s) => s.id === m.id))).toBe(true);
    // A card answered right next time leaves "Read again".
    const sub = missed[0].subtopicId;
    const twoInSub = all.filter((s) => s.subtopicId === sub).slice(0, 2);
    for (const s of twoInSub) useProgress.getState().recordCard('cisa', s.id, false);
    expect(readAgain(cp().cards)).toContain(sub);
    for (const s of all.filter((x) => x.subtopicId === sub)) useProgress.getState().recordCard('cisa', s.id, true);
    expect(readAgain(cp().cards)).not.toContain(sub);
  });
});

// A question from the bank still resolves after all of the above.
it('sanity: the bank and outline line up', () => {
  expect(findQuestion('cisa', walkOrder(topics, (id) => byId.has(id))[0].id)).toBeDefined();
});
