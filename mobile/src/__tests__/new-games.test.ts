/**
 * Build E games, engine rules.
 * Root or Rumor: the content filter (on the real notes too), same-subtopic
 * pairing, due cards first, Seedling's one domain, scoring, "Why?" choices
 * and the "Read again" rule.
 * Call It First: the 60% leak exclusion (on the real bank too), fair
 * decoys per tier, scoring, and assisted handling.
 */
import { getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import type { NotesPack } from '../content/notes/types';
import type { PackQuestion } from '../content/types';
import {
  answerOptions,
  buildCallRound,
  callMax,
  callPoints,
  callPool,
  decoysFor,
  LEAK_LIMIT,
  leaks,
  overlapShare,
} from '../engine/games/callItFirst';
import {
  buildRumorRound,
  cleanStatement,
  firstSentence,
  isRightTap,
  longestRun,
  readAgain,
  RUMOR_MIN_POOL,
  rumorScore,
  rumorStatements,
  statementsFromNotes,
  tapTitle,
  textHash,
  whyChoices,
} from '../engine/games/rootOrRumor';
import { indexOutline, outlineFromNotes } from '../engine/outline';
import { createRng } from '../engine/random';
import { DAY_MS } from '../engine/srs';

const NOW = Date.UTC(2026, 9, 10);

describe('Root or Rumor: the content filter', () => {
  it('keeps whole, standalone sentences of 8–30 words and drops the rest', () => {
    expect(cleanStatement('Standards are mandatory minimum requirements for every audit and assurance engagement.')).toBe(true);
    expect(cleanStatement('Scope follows risk.')).toBe(false); // under 8 words
    expect(cleanStatement('Is the charter approved by the audit committee or by management today?')).toBe(false); // a question
    expect(cleanStatement('It grants access to all records, systems, premises and staff that audit work requires.')).toBe(false); // leans on the line before
    expect(cleanStatement('controls are classified by when they act in the process of the system.')).toBe(false); // fragment
    expect(cleanStatement('Controls such as reviews, e.g. sign-off and checks, act before the event happens.')).toBe(false); // e.g. fragment
    expect(cleanStatement('A control (such as a review is preventive when it acts before the event.')).toBe(false); // cut off
    expect(cleanStatement(`${'word '.repeat(31)}end.`)).toBe(false); // over 30 words
    expect(cleanStatement('Controls such as reviews and sign-off act before the event happens')).toBe(false); // no full stop
  });
  it('drops lines that lean on the line before (found by the content spot-check)', () => {
    // The real failures from the 40-statement checks.
    expect(cleanStatement('Rely on legal counsel to interpret them; the auditor tests against agreed requirements, not a personal reading of the law.')).toBe(false);
    expect(cleanStatement('The plan-do-check-act (PDCA) cycle repeats this improvement loop over time.')).toBe(false);
    expect(cleanStatement('The integrated test facility (ITF) also works online; choose it when running separate test data is impractical.')).toBe(false);
    expect(cleanStatement('Encryption keys and their escrow copies are tested too, because an encrypted backup without its key cannot be restored.')).toBe(false);
    expect(cleanStatement('A release goes live only after results are reviewed; rollout methods such as canary releases are in 3B2.3.')).toBe(false);
    expect(cleanStatement('Mitigate (reduce) it by adding or improving controls that lower likelihood or impact.')).toBe(false);
    expect(cleanStatement('Use threat modeling, such as STRIDE (named from the six threat types below), to find attacks.')).toBe(false);
    expect(cleanStatement('Write objectives that are specific, testable and traceable to that risk or requirement.')).toBe(false);
    expect(cleanStatement('When both are low, accept higher detection risk and test less, but never skip substantive work.')).toBe(false);
    expect(cleanStatement('Management treats residual risk above appetite by mitigating, transferring or avoiding it.')).toBe(true);
    expect(cleanStatement('Confirm that both preparer and reviewer are different people before relying on the control.')).toBe(true);
    // Fine: "them" after a plural noun, "those whose", "such as".
    expect(cleanStatement('Guidelines are not mandatory, but the auditor considers them and must justify any departure.')).toBe(true);
    expect(cleanStatement('Identify key controls first, meaning those whose failure would leave a significant risk uncovered.')).toBe(true);
    expect(cleanStatement('Devices that cannot protect themselves are segmented and allowed only the traffic they need.')).toBe(true);
  });
  it('reads the first sentence of a rule', () => {
    expect(firstSentence('Standards are the floor. Guidelines call for judgment.')).toBe('Standards are the floor.');
    expect(firstSentence('One sentence only.')).toBe('One sentence only.');
  });
  it('the real notes give plenty of clean statements of both kinds, every one passing the filter', () => {
    const all = rumorStatements(getNotes('cisa'));
    expect(all.length).toBeGreaterThan(RUMOR_MIN_POOL * 10);
    expect(all.every((s) => cleanStatement(s.text))).toBe(true);
    expect(all.filter((s) => s.kind === 'rumor').every((s) => s.why)).toBe(true);
    expect(all.filter((s) => s.kind === 'root').length).toBeGreaterThan(500);
    expect(all.filter((s) => s.kind === 'rumor').length).toBeGreaterThan(300);
    // Card ids are stable and unique.
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    expect(all[0].id).toBe(`${all[0].kind}:${all[0].subtopicId}:${textHash(all[0].text)}`);
  });
});

/** A small pack: 2 domains × 4 subtopics, each with 2 roots and 2 rumors. */
function pack(): NotesPack {
  const line = (d: string, s: number, k: number, kind: string) => `In domain ${d} subtopic ${s} the ${kind} statement number ${k} reads like a plain sentence.`;
  return {
    certId: 'x',
    schemaVersion: 2,
    strategyTips: [],
    connections: [],
    domains: ['1', '2'].map((d) => ({
      id: d,
      overview: '',
      analogy: '',
      keyTerms: [],
      parts: [],
      topics: [
        {
          id: `${d}A1`,
          name: `Topic ${d}`,
          overview: '',
          canDo: [],
          subtopics: [1, 2, 3, 4].map((s) => ({
            id: `${d}A1.${s}`,
            domainId: d,
            topicId: `${d}A1`,
            name: `Sub ${d}.${s}`,
            definition: '',
            whyItMatters: '',
            howItWorks: [line(d, s, 1, 'root'), line(d, s, 2, 'root')],
            example: '',
            isacaRule: `${line(d, s, 0, 'rule')} A second sentence.`,
            examTraps: [1, 2].map((k) => ({ trap: line(d, s, k, 'myth'), why: `Why myth ${d}.${s}.${k} is wrong.` })),
            keyTerms: [],
          })),
        },
      ],
    })),
  };
}

describe('Root or Rumor: rounds', () => {
  const all = statementsFromNotes(pack());
  it('takes roots from the rule’s first sentence and How it works, rumors from the traps', () => {
    expect(all.filter((s) => s.kind === 'root')).toHaveLength(2 * 4 * 3);
    expect(all.filter((s) => s.kind === 'rumor')).toHaveLength(2 * 4 * 2);
    expect(all.some((s) => s.text.includes('A second sentence'))).toBe(false);
  });
  it('a round is 12 statements, half each, paired by subtopic', () => {
    for (let seed = 0; seed < 20; seed++) {
      const round = buildRumorRound(all, {}, 'sapling', createRng(seed), NOW);
      expect(round).toHaveLength(12);
      expect(round.filter((s) => s.kind === 'rumor')).toHaveLength(6);
      // Every subtopic in the round shows both a root and a rumor.
      const subs = new Set(round.map((s) => s.subtopicId));
      for (const sub of subs) expect(new Set(round.filter((s) => s.subtopicId === sub).map((s) => s.kind)).size).toBe(2);
    }
  });
  it('Seedling keeps one domain; missed cards that are due come first', () => {
    const seedling = buildRumorRound(all, {}, 'seedling', createRng(3), NOW);
    expect(new Set(seedling.map((s) => s.domainId)).size).toBe(1);
    const missed = all.find((s) => s.domainId === '2' && s.kind === 'rumor')!;
    const cards = { [missed.id]: { box: 1, dueAt: NOW - 1000, lastSeen: NOW - DAY_MS, reps: 1 } };
    for (let seed = 0; seed < 10; seed++) {
      const round = buildRumorRound(all, cards, 'seedling', createRng(seed), NOW);
      expect(round.map((s) => s.id)).toContain(missed.id);
      expect(round.every((s) => s.domainId === '2')).toBe(true);
    }
    // Not due yet: not forced in.
    const later = { [missed.id]: { box: 2, dueAt: NOW + DAY_MS, lastSeen: NOW, reps: 1 } };
    const rounds = Array.from({ length: 10 }, (_, s) => buildRumorRound(all, later, 'sapling', createRng(s), NOW));
    expect(rounds.filter((r) => r.some((s) => s.id === missed.id)).length).toBeLessThan(10);
  });
  it('scores one point per right tap and finds the longest run', () => {
    const s = all.find((x) => x.kind === 'rumor')!;
    expect(isRightTap(s, 'rumor')).toBe(true);
    expect(isRightTap(s, 'root')).toBe(false);
    expect(rumorScore([true, false, true, true])).toBe(3);
    expect(longestRun([true, true, false, true, true, true, false])).toBe(3);
    expect(tapTitle(s, false)).toBe('That is the myth the exam counts on.');
  });
  it('Heartwood "Why?": the real reason plus 2 sibling reasons', () => {
    const rumor = all.find((x) => x.kind === 'rumor')!;
    const { choices, correct } = whyChoices(rumor, all, createRng(1));
    expect(choices).toHaveLength(3);
    expect(choices[correct]).toBe(rumor.why);
    expect(new Set(choices).size).toBe(3);
    // The first decoy comes from the same subtopic (its sibling trap).
    const sibling = all.find((x) => x.kind === 'rumor' && x.subtopicId === rumor.subtopicId && x.id !== rumor.id)!;
    expect(choices).toContain(sibling.why);
  });
  it('"Read again" after 2 missed cards in one subtopic', () => {
    const e = (box: number) => ({ box, dueAt: NOW, lastSeen: NOW, reps: 1 });
    expect(readAgain({ 'rumor:1A1.1:a': e(1), 'root:1A1.1:b': e(1), 'rumor:1A1.2:c': e(1), 'root:1A1.3:d': e(2), 'root:1A1.3:e': e(1) })).toEqual(['1A1.1']);
    expect(readAgain(undefined)).toEqual([]);
  });
});

/** A question with a key concept and a key option. */
const mk = (id: string, keyConcept: string, keyOption: string, extra: Partial<PackQuestion> = {}): PackQuestion => ({
  id,
  certId: 'x',
  domainId: '1',
  subtopic: 'Sub',
  difficulty: 'application',
  stem: 'Stem?',
  options: { A: keyOption, B: 'Another option entirely', C: 'Something else again', D: 'And one more choice' },
  correct: 'A',
  keyConcept,
  explanation: 'Because.',
  wrongExplanations: {},
  tips: [],
  related: [],
  ...extra,
});

describe('Call It First: the leak check', () => {
  it('excludes a question whose keyConcept repeats more than 60% of the key option', () => {
    expect(overlapShare('Verify the agreed corrective actions were implemented', 'Audit follow-up verifies that agreed corrective actions were implemented.')).toBeGreaterThan(LEAK_LIMIT);
    expect(leaks(mk('a', 'Audit follow-up verifies that agreed corrective actions were implemented.', 'Verify the agreed corrective actions were implemented'))).toBe(true);
    expect(leaks(mk('b', 'Charter approval sits with the board, not with auditee management.', 'Approval rests with the CIO'))).toBe(false);
    expect(leaks(mk('c', '', 'Anything'))).toBe(true);
  });
  it('on the real bank: leaky questions are flagged and left out, plenty remain', () => {
    const bank = getAllQuestions('cisa');
    const pool = callPool(bank);
    const flagged = bank.filter(leaks);
    expect(flagged.length).toBeGreaterThan(0);
    expect(pool.some((q) => flagged.includes(q))).toBe(false);
    expect(pool.length).toBeGreaterThan(300);
  });
});

describe('Call It First: decoys, scoring and assisted answers', () => {
  const bank = getAllQuestions('cisa');
  const topics = outlineFromNotes(getNotes('cisa'));
  const ctx = { all: bank.filter((q) => q.keyConcept), topicOf: indexOutline(topics).topicOf };
  it('gives 2 fair decoys: never the real principle, never a near-copy of it', () => {
    for (const q of callPool(bank).slice(0, 60)) {
      for (const tier of ['seedling', 'sapling'] as const) {
        const d = decoysFor(q, ctx, tier, createRng(1));
        expect(d).toHaveLength(2);
        for (const k of d) {
          expect(k).not.toBe(q.keyConcept);
          expect(overlapShare(k, q.keyConcept!)).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });
  it('Seedling decoys come from other topics; Sapling decoys are near-topic', () => {
    const q = callPool(bank).find((x) => x.domainId === '4' && ctx.topicOf(x.id))!;
    const byConcept = new Map(bank.map((x) => [x.keyConcept, x]));
    const seed = decoysFor(q, ctx, 'seedling', createRng(2)).map((k) => byConcept.get(k)!);
    expect(seed.every((x) => ctx.topicOf(x.id) !== ctx.topicOf(q.id))).toBe(true);
    let near = 0;
    for (let s = 0; s < 20; s++) {
      const sap = decoysFor(q, ctx, 'sapling', createRng(s)).map((k) => byConcept.get(k)!);
      near += sap.filter((x) => x.domainId === q.domainId).length;
    }
    expect(near).toBeGreaterThan(30); // nearly always the same domain or closer
  });
  it('builds a round of 5 with 3 cards each (none in Heartwood), domains interleaved', () => {
    const round = buildCallRound(bank, ctx, 'sapling', createRng(5));
    expect(round).toHaveLength(5);
    for (const it of round) {
      expect(it.cards).toHaveLength(3);
      expect(it.cards[it.correct]).toBe(bank.find((q) => q.id === it.id)!.keyConcept);
    }
    const per = new Map<string, number>();
    for (const it of round) per.set(it.id.slice(1, 2), (per.get(it.id.slice(1, 2)) ?? 0) + 1);
    expect(Math.max(...per.values())).toBeLessThanOrEqual(2);
    expect(buildCallRound(bank, ctx, 'heartwood', createRng(5)).every((it) => it.cards.length === 0 && it.correct === -1)).toBe(true);
  });
  it('scores principle + answer (Heartwood: answer only)', () => {
    expect(callPoints('sapling', true, true)).toBe(2);
    expect(callPoints('sapling', false, true)).toBe(1);
    expect(callPoints('heartwood', true, true)).toBe(1);
    expect(callMax('seedling', 5)).toBe(10);
    expect(callMax('heartwood', 5)).toBe(5);
  });
  it('a hint (preRead) makes the answer assisted; game answers never count toward mastery', () => {
    expect(answerOptions(true, 900)).toEqual({ assisted: true, mastery: false, ms: 900 });
    expect(answerOptions(false)).toEqual({ assisted: false, mastery: false });
  });
});

