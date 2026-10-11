/**
 * Owner decision (1.6.1): a round of a note-card game (Field Guide, Canopy
 * Call, Stepping Stones, Root or Rumor) is study, so it counts as a study day
 * for the streak and for Rooted. It still records no question answer.
 */
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useProgress.setState({ streak: { current: 0, best: 0, lastDay: null } } as never);
  jest.useFakeTimers().setSystemTime(T0);
});
afterEach(() => jest.useRealTimers());

it('a card-game answer keeps the streak going and counts a study day', () => {
  useProgress.getState().recordCard('cisa', 'role:test-1', true);
  expect(useProgress.getState().streak.lastDay).toBe(dayKey(T0));
  expect(useProgress.getState().streak.current).toBe(1);
  expect(selectCert(useProgress.getState(), 'cisa').milestones?.days).toBe(1);

  jest.setSystemTime(T0 + DAY);
  useProgress.getState().recordCard('cisa', 'role:test-2', false);
  expect(useProgress.getState().streak.current).toBe(2);
  expect(selectCert(useProgress.getState(), 'cisa').milestones?.days).toBe(2);
});

it('several cards on one day count that day once', () => {
  for (let i = 0; i < 5; i++) useProgress.getState().recordCard('cisa', `kt:test-${i}`, i % 2 === 0);
  expect(useProgress.getState().streak.current).toBe(1);
  expect(selectCert(useProgress.getState(), 'cisa').milestones?.days).toBe(1);
});

it('a card answer records no question answer', () => {
  useProgress.getState().recordCard('cisa', 'seq:test', true);
  expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(0);
});
