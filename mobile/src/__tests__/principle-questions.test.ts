/**
 * Mobile 1.31: a principle's questions (engine/principleQuestions.ts) and the
 * memo the screens use (lib/principleQuestions.ts).
 *
 * - The count is the UNION: every question tagged with the principle, plus
 *   its hand-picked practice ids that carry no tag, with no repeats. A
 *   hand-picked id tagged with another principle is not counted.
 * - The practice set draws ONLY from that union, keeps the hand-picked size,
 *   and puts unseen, then missed, questions first.
 * - The real pack: all 21 principles (fit-method-to-objective included)
 *   have questions, and the index is built from ONE scan of the bank.
 */
import type { PackQuestion } from '../content/types';
import * as loader from '../content/loader';
import { getPrinciples } from '../content/principles';
import {
  PRINCIPLE_SET_FALLBACK,
  indexByPrinciple,
  principlePracticeSet,
  principleQuestionIds,
  principleSetSize,
} from '../engine/principleQuestions';
import { createRng } from '../engine/random';
import type { AnswerRecord } from '../engine/readiness';
import { clearPrincipleQuestionsCache, principleIndex, questionsForPrinciple, startPrinciplePractice } from '../lib/principleQuestions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** A tiny stand-in question: only the fields these helpers read matter. */
const fake = (id: string, principleId?: string): PackQuestion =>
  ({ id, principleId, certId: 'x', domainId: '1', subtopic: 's', difficulty: 'application', stem: '', options: {}, correct: 'A', explanation: '', wrongExplanations: {}, tips: [], related: [] }) as PackQuestion;

const bank = [
  fake('q1', 'alpha'),
  fake('q2', 'alpha'),
  fake('q3', 'beta'),
  fake('q4'), // untagged
  fake('q5'), // untagged
  fake('q6', 'alpha'),
];
const byId = new Map(bank.map((q) => [q.id, q]));
const find = (id: string) => byId.get(id);
const rec = (lastCorrect: boolean): AnswerRecord => ({ attempts: 1, correctCount: lastCorrect ? 1 : 0, lastCorrect, lastAt: 0 });

describe('principleQuestionIds: the union', () => {
  const index = indexByPrinciple(bank);

  it('files each tagged question under its principle, in bank order', () => {
    expect(index.get('alpha')).toEqual(['q1', 'q2', 'q6']);
    expect(index.get('beta')).toEqual(['q3']);
    expect(index.has('gamma')).toBe(false);
  });

  it('is tagged ∪ untagged hand-picked ids, with no repeats', () => {
    // q1 is both tagged and hand-picked: counted once. q4 is untagged: added.
    expect(principleQuestionIds('alpha', ['q1', 'q4', 'q4'], index, find)).toEqual(['q1', 'q2', 'q6', 'q4']);
  });

  it('leaves out a hand-picked id tagged with ANOTHER principle, and ids no longer in the bank', () => {
    expect(principleQuestionIds('alpha', ['q3', 'gone'], index, find)).toEqual(['q1', 'q2', 'q6']);
  });

  it('a principle with no tags yet is just its untagged hand-picked ids', () => {
    expect(principleQuestionIds('gamma', ['q5', 'q4'], index, find)).toEqual(['q5', 'q4']);
    expect(principleQuestionIds('gamma', [], index, find)).toEqual([]);
  });
});

describe('the practice set', () => {
  const index = indexByPrinciple(bank);
  const union = principleQuestionIds('alpha', ['q4'], index, find); // q1 q2 q6 q4

  it('keeps the hand-picked size, capped by what exists; a fallback when none are hand-picked', () => {
    expect(principleSetSize(7, 43)).toBe(7);
    expect(principleSetSize(7, 3)).toBe(3);
    expect(principleSetSize(0, 43)).toBe(PRINCIPLE_SET_FALLBACK);
    expect(principleSetSize(0, 0)).toBe(0);
  });

  it('draws only from the union, never repeating, for many seeds', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const set = principlePracticeSet(union, find, {}, 3, createRng(seed));
      expect(set).toHaveLength(3);
      expect(new Set(set).size).toBe(3);
      for (const id of set) expect(union).toContain(id);
    }
  });

  it('puts unseen questions first, then the ones missed last time, then the rest', () => {
    const answers = { q1: rec(true), q2: rec(false), q6: rec(true) }; // q4 unseen
    const set = principlePracticeSet(union, find, answers, 4, createRng(3));
    expect(set[0]).toBe('q4');
    expect(set[1]).toBe('q2');
    expect(set.slice(2).sort()).toEqual(['q1', 'q6']);
    // A short set keeps the unseen and the missed.
    expect(principlePracticeSet(union, find, answers, 2, createRng(9))).toEqual(['q4', 'q2']);
  });
});

describe('the real CISA pack', () => {
  const pack = getPrinciples('cisa')!;

  beforeEach(() => clearPrincipleQuestionsCache());

  it('has 21 principles, fit-method-to-objective among them, each with questions', () => {
    expect(pack.principles).toHaveLength(21);
    const fit = pack.principles.find((p) => p.id === 'fit-method-to-objective')!;
    expect(fit).toBeTruthy();
    for (const p of pack.principles) {
      const ids = questionsForPrinciple('cisa', p);
      // At least its hand-picked ones, and every id is a real question that tests it (or is untagged and hand-picked).
      expect(ids.length).toBeGreaterThanOrEqual(p.practiceIds.filter((id) => loader.findQuestion('cisa', id)).length);
      for (const id of ids) {
        const q = loader.findQuestion('cisa', id)!;
        expect(q.principleId === p.id || (!q.principleId && p.practiceIds.includes(id))).toBe(true);
      }
    }
    // Tagging widened the sets: fit-method-to-objective has more than its seeds.
    expect(questionsForPrinciple('cisa', fit).length).toBeGreaterThan(fit.practiceIds.length);
  });

  it('scans the bank once per cert, however often a page asks (memoised)', () => {
    const scan = jest.spyOn(loader, 'getAllQuestions');
    const p = pack.principles[0];
    for (let i = 0; i < 5; i++) {
      principleIndex('cisa');
      questionsForPrinciple('cisa', p);
    }
    expect(scan).toHaveBeenCalledTimes(1);
    expect(questionsForPrinciple('cisa', p)).toBe(questionsForPrinciple('cisa', p));
    scan.mockRestore();
  });

  it('"Practice this principle" starts the hand-picked count, drawn only from the union', () => {
    useProgress.getState().resetCert('cisa');
    const p = pack.principles.find((x) => x.id === 'evidence-quality')!;
    const union = new Set(questionsForPrinciple('cisa', p));
    startPrinciplePractice('cisa', p);
    const active = useSession.getState().active!;
    expect(active.mode).toBe('practice');
    expect(active.title).toBe(p.title);
    expect(active.questionIds).toHaveLength(p.practiceIds.length);
    for (const id of active.questionIds) expect(union.has(id)).toBe(true);
    useSession.getState().clear();
  });
});
