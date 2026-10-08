/**
 * Study notes "read" ticks (progress store → notesRead).
 * They must survive an app kill, stay per certification, and older saves
 * (from before Study notes) must load with nothing read.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const read = (certId = 'cisa') => selectCert(useProgress.getState(), certId).notesRead;
// zustand's persist writes after the current tick.
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  useProgress.setState({ byCert: {} });
});

describe('notes read state', () => {
  it('starts empty', () => {
    expect(read()).toEqual([]);
  });

  it('marks and unmarks a subtopic; repeating a mark changes nothing', () => {
    useProgress.getState().setNoteRead('cisa', '4B1.2', true);
    const before = useProgress.getState().byCert;
    useProgress.getState().setNoteRead('cisa', '4B1.2', true);
    expect(useProgress.getState().byCert).toBe(before); // no new state, no save
    expect(read()).toEqual(['4B1.2']);
    useProgress.getState().setNoteRead('cisa', '1A1.1', true);
    useProgress.getState().setNoteRead('cisa', '4B1.2', false);
    expect(read()).toEqual(['1A1.1']);
  });

  it('is per certification', () => {
    useProgress.getState().setNoteRead('cisa', '4B1.2', true);
    expect(read('cism')).toEqual([]);
  });

  it('survives an app kill (persist round-trip)', async () => {
    useProgress.getState().setNoteRead('cisa', '4B1.2', true);
    useProgress.getState().setNoteRead('cisa', '1A1.1', true);
    await flush();
    const raw = (await AsyncStorage.getItem('aurivan.progress.v1'))!;
    expect(JSON.parse(raw).state.byCert.cisa.notesRead).toEqual(['4B1.2', '1A1.1']);
    // Cold start: wipe memory (that wipe is saved too), put the earlier save
    // back as if the phone had it on disk, then load it.
    useProgress.setState({ byCert: {} });
    await flush();
    expect(read()).toEqual([]);
    await AsyncStorage.setItem('aurivan.progress.v1', raw);
    await useProgress.persist.rehydrate();
    expect(read()).toEqual(['4B1.2', '1A1.1']);
  });

  it('an older save without notesRead loads with nothing read, and keeps its other progress', async () => {
    await AsyncStorage.setItem(
      'aurivan.progress.v1',
      JSON.stringify({
        state: {
          byCert: { cisa: { answers: {}, review: {}, bookmarks: ['d1_001'], mocks: [], lessonsDone: ['l1'], mistakes: {}, gameBest: {} } },
          streak: { current: 0, best: 0, lastDay: null },
          today: { day: '', answered: 0 },
          days: {},
        },
        version: 2,
      }),
    );
    await useProgress.persist.rehydrate();
    expect(read()).toEqual([]);
    expect(selectCert(useProgress.getState(), 'cisa').bookmarks).toEqual(['d1_001']);
    useProgress.getState().setNoteRead('cisa', '4B1.2', true);
    expect(read()).toEqual(['4B1.2']);
    expect(selectCert(useProgress.getState(), 'cisa').lessonsDone).toEqual(['l1']);
  });

  it('a reset clears the read ticks', () => {
    useProgress.getState().setNoteRead('cisa', '4B1.2', true);
    useProgress.getState().resetCert('cisa');
    expect(read()).toEqual([]);
  });
});
