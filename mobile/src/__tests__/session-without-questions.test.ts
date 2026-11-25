/**
 * Mobile 2.3: an unfinished session saved by a full-bank build, opened in the public build that
 * bundles only the free sample. Missing questions leave the set; every other answer is kept.
 */
import { withoutQuestions, type ActiveSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const perm = ['A', 'B', 'C', 'D'] as unknown as ActiveSession['perms'][string];
const mock = (index: number): ActiveSession => ({
  id: 's1',
  mode: 'mock',
  certId: 'cisa',
  title: 'Mini mock',
  questionIds: ['a', 'x', 'b', 'y', 'c'],
  perms: { a: perm, x: perm, b: perm, y: perm, c: perm },
  index,
  responses: {
    a: { picked: 'A', correct: true } as ActiveSession['responses'][string],
    x: { picked: 'B', correct: false } as ActiveSession['responses'][string],
  },
  flagged: ['x', 'b'],
  coached: ['y'],
  visitMs: { x: 500, c: 200 },
  startedAt: 1,
  deadline: 99,
});

it('drops the missing questions and keeps the rest of the answers', () => {
  const next = withoutQuestions(mock(0), ['x', 'y', 'not-in-set'])!;
  expect(next.questionIds).toEqual(['a', 'b', 'c']);
  expect(Object.keys(next.perms)).toEqual(['a', 'b', 'c']);
  expect(next.responses).toEqual({ a: { picked: 'A', correct: true } });
  expect(next.flagged).toEqual(['b']);
  expect(next.coached).toEqual([]);
  expect(next.visitMs).toEqual({ c: 200 });
  expect(next.deadline).toBe(99); // the mock's clock is unchanged
});

it.each([
  [0, 0], // on "a": stays on "a"
  [1, 1], // on missing "x": moves to the next remaining, "b"
  [3, 2], // on missing "y": moves to "c"
  [4, 2], // on "c": stays on "c"
])('keeps the place: index %i becomes %i', (from, to) => {
  expect(withoutQuestions(mock(from), ['x', 'y'])!.index).toBe(to);
});

it('moves to the last question when the missing ones are at the end', () => {
  const s = { ...mock(4), questionIds: ['a', 'b', 'x'], index: 2 };
  expect(withoutQuestions(s, ['x'])!.index).toBe(1);
});

it('returns the same session when nothing is missing, and null when nothing would remain', () => {
  const s = mock(0);
  expect(withoutQuestions(s, ['zzz'])).toBe(s);
  expect(withoutQuestions(s, s.questionIds)).toBeNull();
});
