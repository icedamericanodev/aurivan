/**
 * Release bug hunt round 4: three CISA questions (d1_139, d3_087, d3_106) were rewritten in place
 * in mobile 1.43 (same id, new stem, options and key). A 1.40 to 1.42 save still showed the old
 * pick, slip tag and result on the new question. Records saved before the rewrite are dropped on
 * load and on restore; the learner's note and bookmark stay, and the note says the question changed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { NOTE_UPDATED_LINE, QuestionNote } from '../components/questionNote';
import { getCertification } from '../content/certifications';
import { REWRITTEN_QUESTIONS } from '../content/rewrittenQuestions';
import { getAllQuestions } from '../content/loader';
import { computeReadiness } from '../engine/readiness';
import { dropRewritten, noteBeforeRewrite } from '../engine/rewrittenQuestions';
import { PROGRESS_VERSION } from '../engine/saveMigrations';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : () => null) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const OLD = Date.UTC(2026, 9, 20, 9, 0, 0); // a 1.41 day
const NEW = Date.UTC(2026, 10, 2, 9, 0, 0); // after 1.43
const cp = () => selectCert(useProgress.getState(), 'cisa');

/** A 1.40-shaped save: a wrong pick with a slip tag, a review card, a note and a bookmark on d1_139, plus one untouched question. */
const oldSave = () => ({
  state: {
    byCert: {
      cisa: {
        answers: {
          d1_139: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: OLD },
          d1_001: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: OLD },
        },
        review: { d1_139: { box: 1, dueAt: OLD + 86_400_000, lastSeen: OLD, reps: 1 } },
        bookmarks: ['d1_139'],
        mocks: [],
        lessonsDone: [],
        mistakes: { d1_139: { picked: 'D', at: OLD, slip: 'role' } },
        gameBest: {},
        qNotes: { d1_139: { text: 'CFO is not independent, so D was wrong.', ts: OLD } },
      },
    },
    streak: { current: 1, best: 1, lastDay: '2026-10-20' },
    today: { day: '2026-10-20', answered: 2 },
    days: {},
  },
  version: PROGRESS_VERSION,
});

beforeEach(() => {
  useProgress.setState({ byCert: {}, days: {} });
});

describe('questions rewritten in place', () => {
  it('lists the three rewritten ids, and they are still in the bank', () => {
    expect(Object.keys(REWRITTEN_QUESTIONS.cisa).sort()).toEqual(['d1_139', 'd3_087', 'd3_106']);
    const ids = new Set(getAllQuestions('cisa').map((q) => q.id));
    for (const id of Object.keys(REWRITTEN_QUESTIONS.cisa)) expect(ids.has(id)).toBe(true);
  });

  it('a 1.40 save loads with no old pick, slip, answer or review card; the note and bookmark stay', async () => {
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(oldSave()));
    await useProgress.persist.rehydrate();
    expect(cp().mistakes.d1_139).toBeUndefined();
    expect(cp().answers.d1_139).toBeUndefined();
    expect(cp().review.d1_139).toBeUndefined();
    // The old result no longer counts toward readiness (only d1_001 is left).
    expect(computeReadiness(getCertification('cisa')!, cp().answers).domains.reduce((n, d) => n + d.answered, 0)).toBe(1);
    // The learner's own words and bookmark are kept, and the note is marked as written before the change.
    expect(cp().qNotes?.d1_139?.text).toBe('CFO is not independent, so D was wrong.');
    expect(cp().bookmarks).toEqual(['d1_139']);
    expect(noteBeforeRewrite(REWRITTEN_QUESTIONS, 'cisa', 'd1_139', cp().qNotes?.d1_139?.ts)).toBe(true);
    // Other questions are untouched.
    expect(cp().answers.d1_001).toBeDefined();
  });

  it('answers to the NEW question are kept, on load and again on a later load (safe to run every time)', () => {
    const save = oldSave().state;
    const fresh = {
      ...save,
      byCert: {
        cisa: {
          ...save.byCert.cisa,
          answers: { ...save.byCert.cisa.answers, d3_087: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NEW } },
          mistakes: { ...save.byCert.cisa.mistakes, d3_106: { picked: 'A', at: NEW } },
        },
      },
    };
    const once = dropRewritten(fresh, REWRITTEN_QUESTIONS);
    expect(once.byCert.cisa.answers.d3_087).toBeDefined();
    expect((once.byCert.cisa.mistakes as Record<string, unknown>).d3_106).toBeDefined();
    expect(dropRewritten(once, REWRITTEN_QUESTIONS)).toBe(once);
  });

  it('first-try courses: a `shown` time and a `first` try from before the rewrite go too; newer ones stay', () => {
    const save = oldSave().state;
    const withFirstTry = {
      ...save,
      byCert: {
        cisa: {
          ...save.byCert.cisa,
          answers: {
            // Dropped whole (last answered before the rewrite): its `first` goes with it.
            d1_139: { ...save.byCert.cisa.answers.d1_139, first: { correct: false, assisted: false, at: OLD } },
            // Answered again after the rewrite: the record stays, its old `first` goes.
            d3_087: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: NEW, first: { correct: false, assisted: false, at: OLD } },
            // A first try at the NEW wording stays.
            d3_106: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NEW, first: { correct: true, assisted: false, at: NEW } },
            d1_001: { ...save.byCert.cisa.answers.d1_001, first: { correct: true, assisted: false, at: OLD } },
          },
          // Seen before the rewrite: goes. Seen after it, or not rewritten: stays.
          shown: { d1_139: OLD, d3_087: NEW, d1_002: OLD },
        },
      },
    };
    const out = dropRewritten(withFirstTry, REWRITTEN_QUESTIONS).byCert.cisa;
    expect(out.answers.d1_139).toBeUndefined();
    expect(out.answers.d3_087).toEqual({ attempts: 2, correctCount: 1, lastCorrect: true, lastAt: NEW });
    expect(out.answers.d3_106.first).toEqual({ correct: true, assisted: false, at: NEW });
    expect(out.answers.d1_001.first).toEqual({ correct: true, assisted: false, at: OLD });
    expect(out.shown).toEqual({ d3_087: NEW, d1_002: OLD });
    // Safe to run again, and a CISA save (no `shown`) never gains the key.
    const twice = dropRewritten({ ...withFirstTry, byCert: { cisa: out } }, REWRITTEN_QUESTIONS);
    expect(twice.byCert.cisa).toBe(out);
    expect(dropRewritten(oldSave().state, REWRITTEN_QUESTIONS).byCert.cisa).not.toHaveProperty('shown');
  });

  it('restoring an old backup goes through the same step', async () => {
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(oldSave()));
    await useProgress.persist.rehydrate();
    // Put the old records back in the live store, as an old phone would have them, then back it up.
    const old = oldSave().state.byCert.cisa;
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), answers: old.answers, review: old.review, mistakes: old.mistakes as never } } }));
    const read = checkBackupText(JSON.stringify(currentBackup(NEW)));
    if (read.kind !== 'ok') throw new Error(read.code);
    // The file still holds the old records (a backup is read as it was saved)...
    expect((read.data.progress.byCert.cisa.mistakes as Record<string, unknown>).d1_139).toBeDefined();
    useProgress.setState({ byCert: {} });
    expect((await restoreBackup(read.data, { now: NEW, fresh: true })).kind).toBe('ok');
    // ...and restoring it loads them through the same step as a launch.
    const restored = cp();
    expect(restored.mistakes.d1_139).toBeUndefined();
    expect(restored.answers.d1_139).toBeUndefined();
    expect(restored.review.d1_139).toBeUndefined();
    expect(restored.answers.d1_001).toBeDefined();
    expect(restored.bookmarks).toEqual(['d1_139']);
    expect(restored.qNotes?.d1_139?.text).toBe('CFO is not independent, so D was wrong.');
  });
});

describe('the note on a rewritten question', () => {
  let r: ReactTestRenderer | undefined;
  const text = () => {
    const out: string[] = [];
    const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
    walk(r!.root);
    return out.join(' ');
  };
  afterEach(() => act(() => r?.unmount()));

  it('says the question was updated above a note written before the change; not on a newer note', () => {
    useProgress.setState({ byCert: { cisa: { ...selectCert(useProgress.getState(), 'cisa'), qNotes: { d1_139: { text: 'Old thought.', ts: OLD }, d3_087: { text: 'New thought.', ts: NEW } } } } });
    act(() => {
      r = create(<QuestionNote certId="cisa" questionId="d1_139" />);
    });
    expect(text()).toContain(NOTE_UPDATED_LINE);
    expect(text()).toContain('Old thought.');
    act(() => r!.unmount());
    act(() => {
      r = create(<QuestionNote certId="cisa" questionId="d3_087" />);
    });
    expect(text()).not.toContain(NOTE_UPDATED_LINE);
  });
});
