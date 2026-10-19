/**
 * QA for Wave 5 / M1 (topic-stratified mock): the whole mock journey on the
 * new paper, plus the edge cases of the picker.
 *
 * Plain English: start a full mock, answer some questions (right ones by the
 * ORIGINAL key, through the shuffled letters), flag some, "kill" the app and
 * reopen it, finish, and check the score and per-domain breakdown. A mock
 * saved before M1 (old random paper, old session shape) must still resume
 * and score the same way. Then: tiny banks, mini mocks, single-question
 * topics, a domain no note maps, and certs with no notes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCertification } from '../content/certifications';
import { findQuestion, getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import { LETTERS, type Difficulty, type Letter, type PackQuestion } from '../content/types';
import { allocate, buildMockExam, topicTargets } from '../engine/blueprint';
import { outlineFromNotes, type OutlineTopic } from '../engine/outline';
import { createRng } from '../engine/random';
import { displayToOriginal, isCorrect, makePermutation, originalToDisplay, type Permutation } from '../engine/shuffle';
import { finishSession, scoreSession } from '../lib/finishSession';
import { certOutline } from '../lib/outline';
import { startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'aurivan.session.v1';
const cisa = getCertification('cisa')!;
const pool = getAllQuestions('cisa');
const byId = new Map(pool.map((q) => [q.id, q]));
const DIFFS: Difficulty[] = ['analysis', 'application', 'foundational'];

/** The display letter a learner taps to pick ORIGINAL letter `orig`. */
const tapFor = (perm: Permutation, orig: Letter) => originalToDisplay(orig, perm);
const wrongOriginal = (q: PackQuestion): Letter => LETTERS.find((l) => q.options[l] !== undefined && l !== q.correct)!;

/** Answer every third question: two right, one wrong, in a fixed pattern. Returns the expected tally. */
function answerSome(s: ActiveSession) {
  const expected: Record<string, { total: number; correct: number }> = {};
  let correct = 0;
  s.questionIds.forEach((id, i) => {
    const q = findQuestion('cisa', id)!;
    const d = (expected[q.domainId] ??= { total: 0, correct: 0 });
    d.total += 1; // a mock scores every question, answered or not
    if (i % 3 !== 0) return;
    const right = i % 2 === 0;
    const display = tapFor(s.perms[id], right ? q.correct : wrongOriginal(q));
    const ok = isCorrect(q, display, s.perms[id]);
    expect(ok).toBe(right); // graded on the original letter, not the display one
    useSession.getState().answer(id, { display, correct: ok, confidence: 'sure' });
    if (ok) {
      correct += 1;
      d.correct += 1;
    }
  });
  return { expected, correct };
}

/** Wait for zustand persist to write, then simulate an app kill + relaunch. */
async function killAndReopen() {
  await new Promise((r) => setTimeout(r, 0));
  const raw = await AsyncStorage.getItem(KEY);
  expect(raw).toBeTruthy();
  useSession.setState({ active: null }); // memory wiped
  await AsyncStorage.setItem(KEY, raw!); // what survived on disk
  await useSession.persist.rehydrate();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});

describe('full mock journey on the stratified paper', () => {
  it('start → answer → flag → kill → resume → finish → results', async () => {
    const s = startMock('cisa')!;
    // Start: 150 questions, exact domain counts, every outline topic with questions present.
    expect(s.questionIds).toHaveLength(150);
    expect(new Set(s.questionIds).size).toBe(150);
    const counts = cisa.domains.map((d) => s.questionIds.filter((id) => byId.get(id)!.domainId === d.id).length);
    expect(counts).toEqual(allocate(150, cisa.domains.map((d) => d.weight)));
    const o = certOutline('cisa');
    const covered = new Set(s.questionIds.map((id) => o.topicOf(id)));
    const ownTopics = o.topics.filter((t) => t.subtopics.some((x) => x.questionIds.some((id) => byId.get(id)?.domainId === t.domainId)));
    expect(ownTopics.filter((t) => !covered.has(t.id)).map((t) => t.id)).toEqual([]);
    expect(s.deadline).toBeGreaterThan(Date.now());

    const { expected, correct } = answerSome(s);
    useSession.getState().toggleFlag(s.questionIds[4]);
    useSession.getState().toggleFlag(s.questionIds[77]);
    useSession.getState().goTo(88);
    const before = useSession.getState().active!;

    await killAndReopen();
    const after = useSession.getState().active!;
    // Same paper, same shuffles, same answers, flags, place and deadline.
    expect(after.questionIds).toEqual(before.questionIds);
    expect(after.perms).toEqual(before.perms);
    expect(after.responses).toEqual(before.responses);
    expect(after.flagged).toEqual([s.questionIds[4], s.questionIds[77]]);
    expect(after.index).toBe(88);
    expect(after.deadline).toBe(before.deadline);

    finishSession();
    const score = scoreSession(useSession.getState().active!);
    expect(score).toMatchObject({ total: 150, answered: 50, correct, byDomain: expected });
    const m = selectCert(useProgress.getState(), 'cisa').mocks[0];
    expect(m).toMatchObject({ total: 150, correct, byDomain: expected });
    // Results review: learner pick (original) vs key, from the saved display letter.
    const fin = useSession.getState().active!;
    for (const id of fin.questionIds) {
      const r = fin.responses[id];
      if (!r) continue;
      const q = findQuestion('cisa', id)!;
      expect(displayToOriginal(r.display, fin.perms[id]) === q.correct).toBe(r.correct);
    }
  });
});

describe('a mock saved before M1 still resumes and scores', () => {
  it('old random paper, old session shape (no timing/visitMs/checkpoints/coached)', async () => {
    // The pre-M1 paper: the random pick (no outline), as the old build made it.
    const ids = buildMockExam(cisa, pool, createRng(1_700_000_000_000), 150);
    const rng = createRng(3);
    const perms: Record<string, Permutation> = {};
    for (const id of ids) perms[id] = makePermutation(byId.get(id)!, rng);
    const responses: Record<string, { display: Letter; correct: boolean; confidence?: 'sure' }> = {};
    let correct = 0;
    ids.slice(0, 20).forEach((id, i) => {
      const q = byId.get(id)!;
      const display = originalToDisplay(i % 2 ? q.correct : wrongOriginal(q), perms[id]);
      responses[id] = { display, correct: i % 2 === 1, confidence: 'sure' };
      if (i % 2) correct += 1;
    });
    const startedAt = Date.now() - 30 * 60_000;
    const old = {
      id: `mock-${startedAt}`,
      mode: 'mock',
      certId: 'cisa',
      title: 'Full mock exam',
      questionIds: ids,
      perms,
      index: 20,
      responses,
      flagged: [ids[3]],
      startedAt,
      deadline: startedAt + 240 * 60_000,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: { active: old }, version: 1 }));
    await useSession.persist.rehydrate();
    const s = useSession.getState().active!;
    expect(s.questionIds).toEqual(ids);
    expect(s.index).toBe(20);
    expect(s.flagged).toEqual([ids[3]]);

    // Keep going after resume: answer one more right, on the original key.
    const next = byId.get(ids[20])!;
    const d = tapFor(s.perms[ids[20]], next.correct);
    useSession.getState().answer(ids[20], { display: d, correct: isCorrect(next, d, s.perms[ids[20]]) });
    finishSession();
    const m = selectCert(useProgress.getState(), 'cisa').mocks[0];
    expect(m.total).toBe(150);
    expect(m.correct).toBe(correct + 1);
    const dom = Object.values(m.byDomain);
    expect(dom.reduce((n, x) => n + x.total, 0)).toBe(150);
    expect(dom.reduce((n, x) => n + x.correct, 0)).toBe(correct + 1);
  });
});

describe('picker edge cases', () => {
  const outline = outlineFromNotes(getNotes('cisa'));
  const q = (id: string, domainId: string, difficulty: Difficulty) => ({ id, domainId, difficulty }) as PackQuestion;
  const twoDom = { ...cisa, domains: [{ ...cisa.domains[0], id: '1', weight: 50 }, { ...cisa.domains[1], id: '2', weight: 50 }] };

  it('same seed gives the same paper for full and mini mocks', () => {
    for (const n of [150, 50, 10, 1]) {
      expect(buildMockExam(cisa, pool, createRng(77), n, outline)).toEqual(buildMockExam(cisa, pool, createRng(77), n, outline));
    }
  });

  it('mini mocks of any size keep exact counts and no repeats', () => {
    for (let s = 1; s <= 30; s++) {
      for (const n of [100, 25, 10, 5, 3, 1]) {
        const ids = buildMockExam(cisa, pool, createRng(s), n, outline);
        expect(ids).toHaveLength(n);
        expect(new Set(ids).size).toBe(n);
        const dt = allocate(n, cisa.domains.map((d) => d.weight));
        expect(cisa.domains.map((d) => ids.filter((id) => byId.get(id)!.domainId === d.id).length)).toEqual(dt);
      }
    }
  });

  it('a domain with fewer questions than its count is topped up from the other domain', () => {
    const bank = [q('a', '1', 'analysis'), q('b', '1', 'application'), ...Array.from({ length: 20 }, (_, i) => q(`z${i}`, '2', DIFFS[i % 3]))];
    const o: OutlineTopic[] = [
      { id: '1A1', domainId: '1', name: 't', subtopics: [{ id: '1A1.1', name: 's', questionIds: ['a'] }] },
      { id: '2A1', domainId: '2', name: 't', subtopics: [{ id: '2A1.1', name: 's', questionIds: ['z0', 'z1', 'z2'] }] },
    ];
    for (let s = 1; s <= 20; s++) {
      const ids = buildMockExam(twoDom, bank, createRng(s), 10, o);
      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(10);
      expect(ids).toEqual(expect.arrayContaining(['a', 'b']));
    }
  });

  it('a domain no note maps, and single-question topics', () => {
    const bank = [...Array.from({ length: 12 }, (_, i) => q(`u${i}`, '1', DIFFS[i % 3])), ...Array.from({ length: 12 }, (_, i) => q(`m${i}`, '2', DIFFS[i % 3]))];
    const o: OutlineTopic[] = Array.from({ length: 12 }, (_, i) => ({ id: `2A${i}`, domainId: '2', name: 't', subtopics: [{ id: `2A${i}.1`, name: 's', questionIds: [`m${i}`] }] }));
    for (let s = 1; s <= 30; s++) {
      for (const n of [2, 6, 10, 20, 24]) {
        const ids = buildMockExam(twoDom, bank, createRng(s), n, o);
        expect(ids).toHaveLength(n);
        expect(new Set(ids).size).toBe(n);
        expect(ids.filter((x) => x.startsWith('u'))).toHaveLength(n / 2);
      }
    }
  });

  it('certs with no notes keep the old random pick (empty outline)', () => {
    for (const c of ['cism', 'crisc']) {
      const cert = getCertification(c)!;
      const o = certOutline(c).topics;
      expect(o).toEqual([]);
      const p = getAllQuestions(c);
      for (let s = 1; s <= 10; s++) {
        expect(buildMockExam(cert, p, createRng(s), cert.exam.questions, o)).toEqual(buildMockExam(cert, p, createRng(s), cert.exam.questions));
      }
    }
  });

  it('topicTargets: sums to min(total, bank), never over a topic, ≥1 each when slots allow', () => {
    expect(topicTargets(5, [], createRng(1))).toEqual([]);
    expect(topicTargets(5, [0, 0], createRng(1))).toEqual([0, 0]);
    expect(topicTargets(0, [3, 3], createRng(1))).toEqual([0, 0]);
    expect(topicTargets(100, [1, 2], createRng(1))).toEqual([1, 2]);
    const r = createRng(7);
    for (let k = 0; k < 2000; k++) {
      const sizes = Array.from({ length: 1 + Math.floor(r() * 12) }, () => (r() < 0.2 ? 0 : 1 + Math.floor(r() * 30)));
      const total = Math.floor(r() * 120);
      const a = topicTargets(total, sizes, createRng(k));
      const t = Math.min(total, sizes.reduce((x, y) => x + y, 0));
      const nonEmpty = sizes.filter((x) => x > 0).length;
      expect(a.reduce((x, y) => x + y, 0)).toBe(t);
      a.forEach((v, i) => {
        expect(v).toBeLessThanOrEqual(sizes[i]);
        if (sizes[i] > 0 && t >= nonEmpty) expect(v).toBeGreaterThanOrEqual(1);
      });
    }
  });
});
