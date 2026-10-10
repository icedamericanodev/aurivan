/**
 * Stepping Stones (games review §3.5): the reviewed sequences plus the
 * lesson flows ordered as shipped, three processes a round, tap to place
 * (checked when the path is full), the three levels, scoring and cards.
 */
import { getStepSequences } from '../content/games';
import {
  buildStonesRound,
  checkPath,
  keyWords,
  missingChoices,
  ordinal,
  pathPoints,
  STONES_PER_ROUND,
  stonesCardId,
  stonesMax,
  stonesPool,
  type StonesTier,
} from '../engine/games/steppingStones';
import { GAMES, isPlayable } from '../engine/games/registry';
import { createRng } from '../engine/random';

const all = getStepSequences('cisa');
const T0 = Date.UTC(2026, 9, 12);
const TIERS: StonesTier[] = ['seedling', 'sapling', 'heartwood'];

describe('the pool', () => {
  it('Seedling plays 4-step processes; Sapling and Heartwood the longer ones', () => {
    expect(stonesPool(all, 'seedling').every((s) => s.steps.length === 4)).toBe(true);
    expect(stonesPool(all, 'sapling').every((s) => s.steps.length >= 5)).toBe(true);
    expect(stonesPool(all, 'seedling').length).toBeGreaterThanOrEqual(STONES_PER_ROUND * 2);
  });

  it('a process never plays below its deck tier (Heartwood stays Heartwood)', () => {
    const rank = { seedling: 0, sapling: 1, heartwood: 2 };
    for (const tier of TIERS) expect(stonesPool(all, tier).every((s) => rank[s.tier] <= rank[tier])).toBe(true);
    const hw = all.filter((s) => s.tier === 'heartwood');
    expect(hw.length).toBeGreaterThan(0);
    expect(stonesPool(all, 'heartwood')).toEqual(expect.arrayContaining(hw));
    // Sapling still has plenty to play.
    expect(stonesPool(all, 'sapling').length).toBeGreaterThanOrEqual(STONES_PER_ROUND * 2);
  });

  it('JML (a list, not a sequence) is never played', () => {
    for (const tier of TIERS) expect(stonesPool(all, tier).some((s) => s.lessonId === 'cisa-l-d5-access')).toBe(false);
  });

  it('card ids name the note or the lesson the process comes from', () => {
    const seq = all.find((s) => s.id === 's001')!;
    expect(stonesCardId(seq)).toBe('seq:1A3.1:s001');
    const flow = all.find((s) => s.lessonId)!;
    expect(stonesCardId(flow)).toBe(`flow:${flow.lessonId}`);
  });
});

describe('rounds', () => {
  it('3 processes, from different domains where possible', () => {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 15; seed++) {
        const r = buildStonesRound(all, undefined, tier, createRng(seed), T0);
        expect(r).toHaveLength(STONES_PER_ROUND);
        expect(new Set(r.map((i) => i.seq.domainId)).size).toBe(STONES_PER_ROUND);
      }
    }
  });

  it('Seedling gives the first step; the rest are shuffled, never already in order', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const it of buildStonesRound(all, undefined, 'seedling', createRng(seed), T0)) {
        expect(it.given).toBe(1);
        expect([...it.shown].sort()).toEqual([1, 2, 3]);
        expect(it.shown).not.toEqual([1, 2, 3]);
      }
    }
  });

  it('Sapling places every step', () => {
    for (const it of buildStonesRound(all, undefined, 'sapling', createRng(4), T0)) {
      expect(it.given).toBe(0);
      expect([...it.shown].sort((a, b) => a - b)).toEqual(it.seq.steps.map((_, k) => k));
    }
  });

  it('Heartwood asks for the missing step from 3, with decoys that cannot fit', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const it of buildStonesRound(all, undefined, 'heartwood', createRng(seed), T0)) {
        const m = it.missing!;
        expect(m.choices).toHaveLength(3);
        expect(m.choices[m.correct]).toBe(it.seq.steps[m.index].label);
        const mine = new Set(it.seq.steps.flatMap((s) => keyWords(s.label)));
        m.choices.filter((_, k) => k !== m.correct).forEach((d) => {
          expect(keyWords(d).some((w) => mine.has(w))).toBe(false);
          expect(it.seq.steps.some((s) => s.label === d)).toBe(false);
        });
      }
    }
    const seq = all[0];
    expect(missingChoices(seq, 2, all, createRng(1)).choices).toContain(seq.steps[2].label);
  });

  it('a process not placed perfectly comes back when due', () => {
    const missed = stonesPool(all, 'sapling')[5];
    const cards = { [stonesCardId(missed)]: { box: 1, dueAt: T0 - 1, lastSeen: T0 - 1, reps: 1 } };
    for (let seed = 1; seed <= 8; seed++) {
      expect(buildStonesRound(all, cards, 'sapling', createRng(seed), T0).map((i) => i.seq.id)).toContain(missed.id);
    }
  });
});

describe('checking and scoring', () => {
  const item = buildStonesRound(all, undefined, 'sapling', createRng(2), T0)[0];
  const n = item.seq.steps.length;
  const inOrder = Array.from({ length: n }, (_, k) => k);

  it('a perfect path: every stone right, +2 bonus', () => {
    const r = checkPath(item, inOrder);
    expect(r.right).toBe(n);
    expect(r.perfect).toBe(true);
    expect(pathPoints(r.right, r.perfect)).toBe(n + 2);
  });

  it('a stone in the wrong place says where it goes', () => {
    const swapped = [1, 0, ...inOrder.slice(2)];
    const r = checkPath(item, swapped);
    expect(r.perfect).toBe(false);
    expect(r.right).toBe(n - 2);
    expect(r.marks[0]).toEqual({ step: 1, right: false, goes: 2 });
    expect(r.marks[1]).toEqual({ step: 0, right: false, goes: 1 });
    expect(pathPoints(r.right, r.perfect)).toBe(n - 2);
  });

  it('Seedling paths are checked after the given step', () => {
    const seed = buildStonesRound(all, undefined, 'seedling', createRng(3), T0)[0];
    expect(checkPath(seed, [1, 2, 3]).perfect).toBe(true);
    expect(checkPath(seed, [2, 1, 3]).marks[0]).toEqual({ step: 2, right: false, goes: 3 });
  });

  it('the round’s best score counts each stone and each bonus; Heartwood 1 a process', () => {
    const r = buildStonesRound(all, undefined, 'seedling', createRng(5), T0);
    expect(stonesMax(r)).toBe(3 * (3 + 2));
    expect(stonesMax(buildStonesRound(all, undefined, 'heartwood', createRng(5), T0))).toBe(3);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  });
});

describe('wiring', () => {
  it('is in the registry with its name and tagline, and needs the processes', () => {
    expect(GAMES.stones.name).toBe('Stepping Stones');
    expect(GAMES.stones.tagline).toBe('Put each process in the right order.');
    expect(isPlayable('stones', [], null, { steps: all })).toBe(true);
    expect(isPlayable('stones', [], null, { steps: all.slice(0, 5) })).toBe(false);
  });
});
