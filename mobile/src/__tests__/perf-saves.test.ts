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

describe('the adapter counts a write as saved only once the phone confirms it', () => {
  const K = 'perf.adapter';
  type Held = { value: string; ok: () => Promise<void>; fail: (e: Error) => void };
  /** AsyncStorage writes held until the test settles each one. */
  function holdWrites(): Held[] {
    const held: Held[] = [];
    AsyncStorage.setItem = ((k: string, v: string) =>
      new Promise<void>((res, rej) => {
        writes.push(k);
        held.push({ value: v, ok: () => realSet(k, v).then(res), fail: rej });
      })) as typeof AsyncStorage.setItem;
    return held;
  }
  const count = () => writes.filter((k) => k === K).length;
  const onDisk = async () => JSON.parse((await AsyncStorage.getItem(K))!).state.n;
  const a = { state: { n: 1, list: [1] }, version: 0 };
  const b = { state: { n: 2, list: [2] }, version: 0 };

  it('the same state while its write is in flight shares that write; once confirmed it is skipped', async () => {
    const held = holdWrites();
    const first = persistStorage.setItem(K, a);
    const second = persistStorage.setItem(K, a);
    expect(count()).toBe(1);
    await held[0].ok();
    await Promise.all([first, second]);
    await persistStorage.setItem(K, a);
    expect(count()).toBe(1);
    expect(await onDisk()).toBe(1);
  });

  it('failure, then retry: a save that shared a failed write writes again by itself', async () => {
    const held = holdWrites();
    const first = persistStorage.setItem(K, a);
    const second = persistStorage.setItem(K, a);
    held[0].fail(new Error('disk full'));
    await expect(first).rejects.toThrow('disk full');
    // The retry has started (a second write of the same state)...
    await Promise.resolve();
    expect(count()).toBe(2);
    await held[1].ok();
    await second;
    expect(await onDisk()).toBe(1);
    // ...and once it is confirmed, the same state is skipped again.
    await persistStorage.setItem(K, a);
    expect(count()).toBe(2);
  });

  it('a failed write with nobody sharing it: the very next save, even an unchanged one, writes', async () => {
    const held = holdWrites();
    const first = persistStorage.setItem(K, a);
    held[0].fail(new Error('disk full'));
    await expect(first).rejects.toThrow('disk full');
    const again = persistStorage.setItem(K, a);
    expect(count()).toBe(2);
    await held[1].ok();
    await again;
  });

  it('a retry never writes an older state over a newer save', async () => {
    const held = holdWrites();
    const first = persistStorage.setItem(K, a);
    const shared = persistStorage.setItem(K, a);
    const newer = persistStorage.setItem(K, b);
    expect(count()).toBe(2);
    held[0].fail(new Error('disk full'));
    await expect(first).rejects.toThrow('disk full');
    await shared;
    // No third write: the newer save holds the whole, newer state.
    expect(count()).toBe(2);
    await held[1].ok();
    await newer;
    expect(await onDisk()).toBe(2);
    // The newer state is the one remembered as saved.
    await persistStorage.setItem(K, b);
    expect(count()).toBe(2);
  });

  it('a read in between (a restore): the older save does not retry over what was read', async () => {
    const held = holdWrites();
    const first = persistStorage.setItem(K, a);
    const shared = persistStorage.setItem(K, a);
    await persistStorage.getItem(K);
    held[0].fail(new Error('disk full'));
    await expect(first).rejects.toThrow('disk full');
    await shared;
    expect(count()).toBe(1);
  });

  it('a state that cannot be turned into JSON is not remembered: the next save tries again', async () => {
    let calls = 0;
    // Throws the first time it is turned into JSON only (a transient failure).
    const flaky = { toJSON: () => (calls++ === 0 ? (() => { throw new Error('no JSON'); })() : 'ok') };
    const value = { state: { n: 3, flaky }, version: 0 };
    expect(() => persistStorage.setItem(K, value)).toThrow('no JSON');
    expect(count()).toBe(0);
    await persistStorage.setItem(K, value);
    expect(count()).toBe(1);
  });

  it('a save made while a read is in flight: once the read ends, the next save writes', async () => {
    const realGet = AsyncStorage.getItem;
    let finishRead: () => void = () => {};
    AsyncStorage.getItem = ((k: string) =>
      new Promise<string | null>((res) => {
        finishRead = () => res(null);
        void k;
      })) as typeof AsyncStorage.getItem;
    try {
      const read = persistStorage.getItem(K);
      await persistStorage.setItem(K, a);
      expect(count()).toBe(1);
      finishRead();
      await read;
    } finally {
      AsyncStorage.getItem = realGet;
    }
    // The read finished after that save: what the store holds now is re-written.
    await persistStorage.setItem(K, a);
    expect(count()).toBe(2);
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
