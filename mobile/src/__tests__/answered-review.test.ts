/**
 * Looking back at an answered question (mobile 2.2): the pure rules.
 * engine/answeredReview.ts and the bank's Answered filter (engine/bank.ts).
 *
 * The tests that matter most:
 *  - the learner's pick is shown ONLY for a miss the Mistake journal kept for
 *    that same attempt, and never guessed otherwise (both branches);
 *  - the Answered filter lists only questions with a real saved answer;
 *  - a question in an unsubmitted mock never opens.
 */
import type { PackQuestion } from '../content/types';
import {
  answerRecordOf,
  attemptsLine,
  CURRENT_EXPLANATIONS_LINE,
  inUnsubmittedMock,
  isAnswerRecord,
  LAST_CORRECT_LINE,
  LAST_MISSED_LINE,
  lastResultLine,
  lookBackGate,
  PICK_NOT_SAVED_LINE,
  SAME_ATTEMPT_MS,
  savedMissPick,
} from '../engine/answeredReview';
import { buildBankList, emptyCopy, isAnswered, listedIds, matchesFilter } from '../engine/bank';
import type { AnswerRecord } from '../engine/readiness';

const T0 = Date.UTC(2026, 9, 6, 9, 0, 0);

const rec = (lastCorrect: boolean, lastAt = T0, extra: Partial<AnswerRecord> = {}): AnswerRecord => ({
  attempts: 1,
  correctCount: lastCorrect ? 1 : 0,
  lastCorrect,
  lastAt,
  ...extra,
});

function q(id: string, subtopic = 'Topic one', extra: Partial<PackQuestion> = {}): PackQuestion {
  return {
    id,
    certId: 'cisa',
    domainId: '1',
    subtopic,
    difficulty: 'analysis',
    stem: `Question ${id}`,
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    correct: 'B',
    explanation: 'because',
    wrongExplanations: { A: 'not a', C: 'not c', D: 'not d' },
    tips: [],
    related: [],
    ...extra,
  };
}

describe('a real saved answer', () => {
  it('needs at least one attempt, a true/false result and a real time', () => {
    expect(isAnswerRecord(rec(true))).toBe(true);
    expect(isAnswerRecord(rec(false, T0, { attempts: 4, correctCount: 2 }))).toBe(true);
    for (const bad of [
      undefined,
      null,
      'yes',
      7,
      [],
      {},
      { correct: true }, // not this app's shape
      { ...rec(true), attempts: 0 },
      { ...rec(true), attempts: 1.5 },
      { ...rec(true), correctCount: 2 }, // more right than tried
      { ...rec(true), correctCount: -1 },
      { ...rec(true), lastCorrect: 'true' },
      { ...rec(true), lastAt: 0 },
      { ...rec(true), lastAt: Number.NaN },
      { ...rec(true), lastAt: '2026-10-06' },
    ]) {
      expect(isAnswerRecord(bad)).toBe(false);
    }
  });

  it('reads only ids the answers map itself holds (a link could say "constructor")', () => {
    const answers = { d1_001: rec(true) };
    expect(answerRecordOf(answers, 'd1_001')).toBe(answers.d1_001);
    for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', 'd1_999']) {
      expect(answerRecordOf(answers, id)).toBeUndefined();
    }
    expect(answerRecordOf(undefined, 'd1_001')).toBeUndefined();
    expect(answerRecordOf(null, 'd1_001')).toBeUndefined();
  });
});

describe('the learner’s pick is never guessed', () => {
  const question = q('d1_001');

  it('BRANCH 1: a miss whose pick the Mistake journal kept for the same attempt is shown', () => {
    // The store stamps the answer, then the mistake right after it: the same millisecond or a few later.
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: T0, resolved: false }, question)).toBe('C');
    expect(savedMissPick(rec(false, T0), { picked: 'A', at: T0 + 3 }, question)).toBe('A');
    expect(savedMissPick(rec(false, T0), { picked: 'D', at: T0 + SAME_ATTEMPT_MS }, question)).toBe('D');
  });

  it('BRANCH 2: in every other case the pick is "not saved"', () => {
    const miss = { picked: 'C', at: T0, resolved: false };
    // A right answer never has a pick, even with a journal entry at the same time.
    expect(savedMissPick(rec(true, T0), miss, question)).toBeNull();
    expect(savedMissPick(rec(true, T0), undefined, question)).toBeNull();
    // A miss with no journal entry.
    expect(savedMissPick(rec(false, T0), undefined, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), null, question)).toBeNull();
    // The entry is from an OLDER miss (the last answer came later).
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: T0 - 1 }, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: T0 - 86_400_000 }, question)).toBeNull();
    // The entry is too long after the answer to be the same attempt (a mock recorded hours after it ended).
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: T0 + SAME_ATTEMPT_MS + 1 }, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: T0 + 3 * 3_600_000 }, question)).toBeNull();
    // A fixed mistake is about an earlier miss.
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: T0, resolved: true }, question)).toBeNull();
    // No pick kept (a skipped mock question), or not a letter, or not one of this question's options.
    expect(savedMissPick(rec(false, T0), { at: T0 }, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), { picked: 'E', at: T0 }, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), { picked: 3, at: T0 }, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), { picked: 'D', at: T0 }, q('x', 'T', { options: { A: 'a', B: 'b', C: 'c' } }))).toBeNull();
    // A miss cannot have picked today's best answer: the key changed since, so the letter means something else now.
    expect(savedMissPick(rec(false, T0), { picked: 'B', at: T0 }, question)).toBeNull();
    // No readable time on the entry, or no real answer record.
    expect(savedMissPick(rec(false, T0), { picked: 'C' }, question)).toBeNull();
    expect(savedMissPick(rec(false, T0), { picked: 'C', at: 'now' }, question)).toBeNull();
    expect(savedMissPick(undefined, miss, question)).toBeNull();
    expect(savedMissPick({ ...rec(false, T0), attempts: 0 }, miss, question)).toBeNull();
  });

  it('the window is small: seconds, not minutes', () => {
    expect(SAME_ATTEMPT_MS).toBeGreaterThan(0);
    expect(SAME_ATTEMPT_MS).toBeLessThanOrEqual(5000);
  });
});

describe('may the look-back page open?', () => {
  const question = q('d1_001');
  const answers = { d1_001: rec(true) };
  const mock = { mode: 'mock', certId: 'cisa', questionIds: ['d1_001', 'd1_002'] };

  it('opens for an answered question, with its record', () => {
    expect(lookBackGate({ question, certId: 'cisa', answers, session: null })).toEqual({ kind: 'ok', record: answers.d1_001 });
  });

  it('an unknown id, or a question from another exam, is "unknown"', () => {
    expect(lookBackGate({ question: undefined, certId: 'cisa', answers, session: null })).toEqual({ kind: 'unknown' });
    expect(lookBackGate({ question, certId: 'cism', answers, session: null })).toEqual({ kind: 'unknown' });
  });

  it('a question with no saved answer is "unanswered" (never answered, saved only, or its old record was dropped)', () => {
    expect(lookBackGate({ question, certId: 'cisa', answers: {}, session: null })).toEqual({ kind: 'unanswered' });
    expect(lookBackGate({ question, certId: 'cisa', answers: undefined, session: null })).toEqual({ kind: 'unanswered' });
    expect(lookBackGate({ question, certId: 'cisa', answers: { d1_001: { attempts: 0 } }, session: null })).toEqual({ kind: 'unanswered' });
  });

  it('a question in an UNSUBMITTED mock never opens, answered before or not', () => {
    expect(inUnsubmittedMock(mock, 'cisa', 'd1_001')).toBe(true);
    // A damaged saved session (no question list) is not a crash, and hides nothing.
    expect(inUnsubmittedMock({ ...mock, questionIds: undefined as unknown as string[] }, 'cisa', 'd1_001')).toBe(false);
    expect(lookBackGate({ question, certId: 'cisa', answers, session: mock })).toEqual({ kind: 'mock' });
    expect(lookBackGate({ question, certId: 'cisa', answers: {}, session: mock })).toEqual({ kind: 'mock' });
  });

  it('a submitted mock, a practice session, another exam’s mock or a mock without this question does not block', () => {
    for (const session of [
      { ...mock, finishedAt: T0 },
      { ...mock, mode: 'practice' },
      { ...mock, mode: 'review' },
      { ...mock, certId: 'cism' },
      { ...mock, questionIds: ['d1_002'] },
      null,
      undefined,
    ]) {
      expect(inUnsubmittedMock(session, 'cisa', 'd1_001')).toBe(false);
      expect(lookBackGate({ question, certId: 'cisa', answers, session }).kind).toBe('ok');
    }
  });
});

describe('the words', () => {
  it('the last result, in the wording the owner asked for', () => {
    expect(lastResultLine(rec(true))).toBe('Last time: correct');
    expect(lastResultLine(rec(false))).toBe('Last time: not quite');
    expect(LAST_CORRECT_LINE).toBe('Last time: correct');
    expect(LAST_MISSED_LINE).toBe('Last time: not quite');
    // ISACA's word is "option" (a stem and four options), as everywhere else in the app.
    expect(PICK_NOT_SAVED_LINE).toBe('KaiSip saved your result for this answer, not which option you picked.');
    // Reworded so it does not worry the learner ("current version" sounded like something had changed).
    expect(CURRENT_EXPLANATIONS_LINE).toBe('Explanations here are always the latest version.');
  });

  it('the count is the learner’s own, for this one question', () => {
    expect(attemptsLine(rec(true))).toBe('Answered once');
    expect(attemptsLine(rec(false, T0, { attempts: 3, correctCount: 2 }))).toBe('Answered 3 times, 2 correct');
    expect(attemptsLine(rec(false, T0, { attempts: 2, correctCount: 0 }))).toBe('Answered 2 times, 0 correct');
  });
});

describe('the bank’s Answered filter', () => {
  const questions = [q('a1', 'Alpha'), q('a2', 'Alpha'), q('a3', 'Alpha'), q('b1', 'Beta'), q('b2', 'Beta')];
  const answers: Record<string, AnswerRecord> = { a1: rec(true), a3: rec(false), b2: rec(true) };
  const same = (s: string) => s;

  it('lists only questions with a real saved answer, right or missed', () => {
    const items = buildBankList(questions, answers, [], 'answered', same);
    expect(listedIds(items)).toEqual(['a1', 'a3', 'b2']);
    for (const it of items) if (it.kind === 'question') expect(it.status).not.toBe('new');
  });

  it('a saved-only or never-answered question never appears', () => {
    // a2 and b1 are bookmarked but were never answered.
    const items = buildBankList(questions, answers, ['a2', 'b1', 'a1'], 'answered', same);
    expect(listedIds(items)).toEqual(['a1', 'a3', 'b2']);
    expect(matchesFilter('new', true, 'answered')).toBe(false);
    expect(matchesFilter('correct', false, 'answered')).toBe(true);
    expect(matchesFilter('missed', false, 'answered')).toBe(true);
  });

  it('a half-written record is not an answer, so its row is not offered for looking back', () => {
    const broken = { ...answers, b1: { correct: true } as unknown as AnswerRecord, a2: { ...rec(true), attempts: 0 } };
    expect(isAnswered('b1', broken)).toBe(false);
    expect(isAnswered('a2', broken)).toBe(false);
    expect(isAnswered('a1', broken)).toBe(true);
    expect(isAnswered('constructor', broken)).toBe(false);
    expect(listedIds(buildBankList(questions, broken, [], 'answered', same))).toEqual(['a1', 'a3', 'b2']);
  });

  it('every row it lists can open the look-back page', () => {
    for (const id of listedIds(buildBankList(questions, answers, [], 'answered', same))) {
      const question = questions.find((x) => x.id === id);
      expect(lookBackGate({ question, certId: 'cisa', answers, session: null }).kind).toBe('ok');
    }
  });

  it('nothing answered: a clear empty state with no bank size', () => {
    expect(buildBankList(questions, {}, ['a1'], 'answered', same)).toEqual([]);
    const copy = emptyCopy('answered');
    expect(copy.title).toBe('Nothing answered here yet');
    expect(copy.body).toMatch(/look back/);
    expect(`${copy.title} ${copy.body}`).not.toMatch(/\d/);
  });

  it('the other filters are unchanged', () => {
    expect(listedIds(buildBankList(questions, answers, [], 'all', same))).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
    expect(listedIds(buildBankList(questions, answers, [], 'new', same))).toEqual(['a2', 'b1']);
    expect(listedIds(buildBankList(questions, answers, [], 'missed', same))).toEqual(['a3']);
    expect(listedIds(buildBankList(questions, answers, ['b1'], 'saved', same))).toEqual(['b1']);
  });
});
