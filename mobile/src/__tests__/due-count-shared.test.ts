/**
 * Performance (1.15.x): dueCountFor shares the due-review count between the
 * mounted tabs, and is always exactly dueIds(...).length.
 */
import { dueCountFor, dueIds, type ReviewEntry } from '../engine/srs';

const entry = (dueAt: number): ReviewEntry => ({ box: 1, dueAt, lastSeen: 0, reps: 1 });

describe('dueCountFor', () => {
  const review: Record<string, ReviewEntry> = { a: entry(100), b: entry(200), c: entry(300), gone: entry(50) };
  const exists = (id: string) => id !== 'gone';

  it('equals counting again, at every moment (including exactly at a due time)', () => {
    for (const now of [0, 49, 50, 99, 100, 150, 199, 200, 250, 300, 1000, 120, 60]) {
      expect(dueCountFor(review, now, 'cisa', exists)).toBe(dueIds(review, now, exists).length);
    }
  });

  it('reuses the count until the next review falls due', () => {
    const q: Record<string, ReviewEntry> = { a: entry(100), b: entry(500) };
    const calls: string[] = [];
    const spy = (id: string) => {
      calls.push(id);
      return true;
    };
    expect(dueCountFor(q, 120, 's', spy)).toBe(1);
    const n = calls.length;
    expect(dueCountFor(q, 300, 's', spy)).toBe(1);
    expect(dueCountFor(q, 499, 's', spy)).toBe(1);
    expect(calls.length).toBe(n); // shared, not counted again
    expect(dueCountFor(q, 500, 's', spy)).toBe(2); // b fell due: counted again
  });

  it('a changed queue (a new object) or another scope is counted afresh', () => {
    const q: Record<string, ReviewEntry> = { a: entry(100) };
    expect(dueCountFor(q, 150, 'x')).toBe(1);
    expect(dueCountFor({ ...q, b: entry(120) }, 150, 'x')).toBe(2);
    expect(dueCountFor(q, 150, 'y', () => false)).toBe(0);
  });
});
