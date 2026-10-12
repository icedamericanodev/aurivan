/**
 * Performance (1.15.x): nothing is written to the phone when nothing changed.
 * zustand's persist saves the WHOLE store after every set, even a no-op one;
 * with months of study that is ~300 KB of JSON per save. Today and You made
 * such no-op sets each time they came into view (the plant check, growth
 * "seen" marks). Pinned by counting AsyncStorage writes, not by timing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as plantEngine from '../engine/plant';
import { checkPlant, plantFor } from '../lib/plant';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { persistStorage, resetSavedForTest } from '../store/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let writes: string[] = [];
const realSet = AsyncStorage.setItem;
beforeEach(() => {
  resetSavedForTest();
  useProgress.getState().resetCert('cisa');
  writes = [];
  AsyncStorage.setItem = ((k: string, v: string) => {
    writes.push(k);
    return realSet(k, v);
  }) as typeof AsyncStorage.setItem;
});
afterAll(() => {
  AsyncStorage.setItem = realSet;
});

describe('saves only what changed', () => {
  it('a set that changes nothing writes nothing; a real change is written', () => {
    useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'sure');
    expect(writes.filter((k) => k === 'aurivan.progress.v1')).toHaveLength(1);
    // No-op sets: the same state comes back.
    useProgress.setState((s) => s);
    useProgress.getState().setNoteRead('cisa', 'nope', false);
    useProgress.getState().updatePlant('cisa', (p) => p);
    expect(writes.filter((k) => k === 'aurivan.progress.v1')).toHaveLength(1);
    useProgress.getState().toggleBookmark('cisa', 'd1_001');
    expect(writes.filter((k) => k === 'aurivan.progress.v1')).toHaveLength(2);
  });

  it('the seen store: showing the same numbers again writes nothing', () => {
    useSeen.getState().see('perf:test', [1, 2, 3]);
    useSeen.getState().see('perf:test', [1, 2, 3]);
    useSeen.getState().see('perf:test', [1, 2, 3]);
    expect(writes.filter((k) => k === 'aurivan.seen.v1')).toHaveLength(1);
    useSeen.getState().see('perf:test', [1, 2, 4]);
    expect(writes.filter((k) => k === 'aurivan.seen.v1')).toHaveLength(2);
  });

  it('after a read (launch or a restore), the next save always goes through', async () => {
    useProgress.getState().recordAnswer('cisa', 'd1_002', true, 'sure');
    const n = writes.length;
    await persistStorage.getItem('aurivan.progress.v1');
    useProgress.setState((s) => s);
    expect(writes.length).toBe(n + 1);
  });

  it('what is saved is still the whole, current store', async () => {
    useProgress.getState().recordAnswer('cisa', 'd1_003', false, 'unsure');
    useProgress.setState((s) => s);
    const saved = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
    expect(saved.state.byCert.cisa.answers.d1_003.attempts).toBe(1);
  });
});

describe('checkPlant (Today, on every focus)', () => {
  it('the same progress on the same day is not checked again: no facts scan, no store write', () => {
    const now = Date.now();
    plantFor('cisa', 'oak', 'Kai', now);
    // The facts scan (every answer, readiness, the outline) is the cost: count it.
    const scan = jest.spyOn(plantEngine, 'plantFacts');
    checkPlant('cisa', now);
    checkPlant('cisa', now);
    checkPlant('cisa', now + 1000);
    expect(scan).toHaveBeenCalledTimes(1);
    // New study is checked again.
    useProgress.getState().recordAnswer('cisa', 'd1_004', true, 'sure');
    checkPlant('cisa', now);
    expect(scan).toHaveBeenCalledTimes(2);
    // So is a new day (the exam-ready gate moves with the date).
    checkPlant('cisa', now + 86_400_000);
    expect(scan).toHaveBeenCalledTimes(3);
    scan.mockRestore();
  });

  it('still grows the plant when a gate opens', () => {
    const now = Date.now();
    plantFor('cisa', 'oak', 'Kai', now);
    checkPlant('cisa', now);
    const before = useProgress.getState().byCert.cisa!.plant!.growth;
    // A diagnostic's worth of clean answers opens the first gate.
    for (let i = 1; i <= 30; i++) useProgress.getState().recordAnswer('cisa', `d1_${String(i).padStart(3, '0')}`, true, 'sure');
    checkPlant('cisa', now);
    expect(useProgress.getState().byCert.cisa!.plant!.growth).toBeGreaterThan(before);
  });
});
