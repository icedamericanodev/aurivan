/**
 * Wave 5 / M1: the topic-stratified mock exam (engine/blueprint.ts).
 *
 * Plain English: a full mock must still have the real exam's domain counts
 * and easy/medium/hard mix, but now it also spreads each domain across the
 * outline's topics (1A1, 1A2 … 5B6), so no topic is left out by chance, and
 * inside a topic it rotates through the subtopics before repeating one.
 * These tests run against the real bundled bank and notes.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import type { Difficulty, PackQuestion } from '../content/types';
import { allocate, buildMockExam, topicTargets } from '../engine/blueprint';
import { indexOutline, outlineFromNotes, type OutlineTopic } from '../engine/outline';
import { createRng } from '../engine/random';

const cisa = getCertification('cisa')!;
const pool = getAllQuestions('cisa');
const byId = new Map(pool.map((q) => [q.id, q]));
const outline = outlineFromNotes(getNotes('cisa'));
const index = indexOutline(outline);
const DIFFS: Difficulty[] = ['analysis', 'application', 'foundational'];
const domainTargets = allocate(cisa.exam.questions, cisa.domains.map((d) => d.weight));

/** A question's topic, only when the topic is in the question's own domain (the engine's rule). */
const topicOf = (id: string): string | undefined => {
  const t = index.topicOf(id);
  return t && index.topic(t)?.domainId === byId.get(id)?.domainId ? t : undefined;
};
/** Topics that have at least one bank question of their own domain. */
const topicsWithQuestions = outline.filter((t) => t.subtopics.some((s) => s.questionIds.some((id) => byId.get(id)?.domainId === t.domainId)));

const mock = (seed: number, total?: number, o: readonly OutlineTopic[] = outline) =>
  buildMockExam(cisa, pool, createRng(seed), total ?? cisa.exam.questions, o);

describe('topic-stratified mock (M1)', () => {
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

  it('keeps the domain counts exactly (27/27/18/39/39)', () => {
    for (const seed of seeds) {
      const ids = mock(seed);
      expect(ids).toHaveLength(150);
      expect(new Set(ids).size).toBe(150);
      const counts = cisa.domains.map((d) => ids.filter((id) => byId.get(id)!.domainId === d.id).length);
      expect(counts).toEqual(domainTargets);
    }
  });

  it('includes every topic that has questions in a full mock', () => {
    // The CISA outline (docs/content/CISA_ECO.md) has 60 topics, all with questions.
    expect(topicsWithQuestions.length).toBe(60);
    for (const seed of seeds) {
      const covered = new Set(mock(seed).map(topicOf));
      const missing = topicsWithQuestions.filter((t) => !covered.has(t.id)).map((t) => t.id);
      expect(missing).toEqual([]);
    }
  });

  it('never repeats a subtopic before every subtopic of its topic has been used', () => {
    for (const seed of seeds) {
      const ids = new Set(mock(seed));
      for (const t of topicsWithQuestions) {
        const subs = t.subtopics
          .map((s) => {
            const own = s.questionIds.filter((id) => byId.get(id)?.domainId === t.domainId);
            return { id: s.id, size: own.length, picks: own.filter((id) => ids.has(id)).length };
          })
          .filter((s) => s.size > 0);
        // A subtopic still holding unpicked questions caps every other at its picks + 1.
        const open = subs.filter((s) => s.picks < s.size);
        if (open.length === 0) continue;
        const min = Math.min(...open.map((s) => s.picks));
        for (const s of subs) expect({ topic: t.id, sub: s.id, ok: s.picks <= min + 1 }).toEqual({ topic: t.id, sub: s.id, ok: true });
      }
    }
  });

  it('keeps the difficulty mix within ±1 of the target in every domain', () => {
    for (const seed of seeds) {
      const ids = mock(seed);
      cisa.domains.forEach((d, di) => {
        const target = allocate(domainTargets[di], DIFFS.map((k) => cisa.exam.difficultyMix[k]));
        DIFFS.forEach((k, j) => {
          const n = ids.filter((id) => byId.get(id)!.domainId === d.id && byId.get(id)!.difficulty === k).length;
          expect(Math.abs(n - target[j])).toBeLessThanOrEqual(1);
        });
      });
    }
  });

  it('gives the same paper for the same seed, and a different one for another seed', () => {
    expect(mock(42)).toEqual(mock(42));
    expect(mock(42)).not.toEqual(mock(43));
  });

  it('a mini mock keeps its domain counts and still spreads topics', () => {
    const ids = mock(5, 50);
    expect(ids).toHaveLength(50);
    const counts = cisa.domains.map((d) => ids.filter((id) => byId.get(id)!.domainId === d.id).length);
    expect(counts).toEqual(allocate(50, cisa.domains.map((d) => d.weight)));
    // 50 slots, 60 topics: a domain with fewer slots than topics gives each slot to a different topic.
    expect(new Set(ids.map(topicOf).filter(Boolean)).size).toBe(50);
  });

  it('without an outline it is the old random pick, call for call', () => {
    // The pre-M1 behaviour is kept for certs with no notes (and is the "before" below).
    const noOutline = buildMockExam(cisa, pool, createRng(9), 150);
    expect(noOutline).toEqual(mock(9, 150, []));
    expect(noOutline).not.toEqual(mock(9));
  });
});

describe('topicTargets', () => {
  it('is proportional to bank share, adds up, and gives every topic at least 1', () => {
    const slots = topicTargets(27, [40, 30, 2, 1, 20, 1, 3, 5, 6, 10], createRng(1));
    expect(slots.reduce((a, b) => a + b, 0)).toBe(27);
    expect(Math.min(...slots)).toBeGreaterThanOrEqual(1);
    expect(slots[0]).toBeGreaterThan(slots[4]); // the biggest topic still gets the most
  });
  it('never gives a topic more than it has, and skips empty topics', () => {
    expect(topicTargets(10, [3, 0, 2], createRng(1))).toEqual([3, 0, 2]);
  });
  it('with more topics than slots, the left-out topic depends on the seed', () => {
    const out = new Set<number>();
    for (let s = 1; s <= 20; s++) out.add(topicTargets(3, [5, 5, 5, 5], createRng(s)).indexOf(0));
    expect(out.size).toBeGreaterThan(1);
  });
});

describe('unmapped questions and cross-domain notes', () => {
  // A tiny made-up bank: domain 1 has topic 1A1 (two subtopics) and one
  // question a note lists under a domain-2 topic (it counts as unmapped).
  const q = (id: string, domainId: string, difficulty: Difficulty) => ({ id, domainId, difficulty }) as PackQuestion;
  const tiny: PackQuestion[] = [q('a1', '1', 'analysis'), q('a2', '1', 'application'), q('b1', '1', 'foundational'), q('x1', '1', 'application'), q('u1', '1', 'analysis')];
  const tinyOutline: OutlineTopic[] = [
    { id: '1A1', domainId: '1', name: 'T', subtopics: [{ id: '1A1.1', name: 's', questionIds: ['a1', 'a2'] }, { id: '1A1.2', name: 's', questionIds: ['b1'] }] },
    { id: '2A1', domainId: '2', name: 'T', subtopics: [{ id: '2A1.1', name: 's', questionIds: ['x1'] }] },
  ];
  const oneDomain = { ...cisa, domains: [{ ...cisa.domains[0], weight: 100 }] };
  it('fills from topics first and uses the unmapped pool only for gaps', () => {
    for (let s = 1; s <= 10; s++) {
      const two = buildMockExam(oneDomain, tiny, createRng(s), 2, tinyOutline);
      // Two slots in one topic: one from each subtopic, never the unmapped pool.
      expect(two.filter((id) => id === 'b1')).toHaveLength(1);
      expect(two.some((id) => id === 'x1' || id === 'u1')).toBe(false);
      const five = buildMockExam(oneDomain, tiny, createRng(s), 5, tinyOutline);
      expect([...five].sort()).toEqual(['a1', 'a2', 'b1', 'u1', 'x1']);
    }
  });
});

describe('before vs after (200 seeded full mocks)', () => {
  it('raises topic coverage', () => {
    const N = 200;
    const stats = (o: readonly OutlineTopic[] | undefined) => {
      let coveredSum = 0;
      let complete = 0;
      let minCovered = Infinity;
      const absent = new Map<string, number>();
      for (let seed = 1; seed <= N; seed++) {
        const covered = new Set(buildMockExam(cisa, pool, createRng(seed), 150, o).map(topicOf));
        const n = topicsWithQuestions.filter((t) => covered.has(t.id)).length;
        coveredSum += n;
        minCovered = Math.min(minCovered, n);
        if (n === topicsWithQuestions.length) complete += 1;
        for (const t of topicsWithQuestions) if (!covered.has(t.id)) absent.set(t.id, (absent.get(t.id) ?? 0) + 1);
      }
      const worst = [...absent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      return { avg: coveredSum / N, min: minCovered, complete, worst };
    };
    const before = stats(undefined);
    const after = stats(outline);
    const pct = (n: number) => `${Math.round((n / N) * 100)}%`;
    const fmt = (s: ReturnType<typeof stats>) =>
      `avg ${s.avg.toFixed(1)}/${topicsWithQuestions.length} topics, worst ${s.min}, all topics in ${pct(s.complete)} of mocks` +
      (s.worst.length ? `; most often absent: ${s.worst.map(([t, n]) => `${t} ${pct(n)}`).join(', ')}` : '');
    // Printed on purpose: the numbers for the M1 report.
    console.log(`M1 coverage over ${N} seeded full mocks\n  before: ${fmt(before)}\n  after:  ${fmt(after)}`);
    expect(after.avg).toBeGreaterThan(before.avg);
    expect(after.complete).toBe(N);
    expect(before.complete).toBeLessThan(N);
  });
});
