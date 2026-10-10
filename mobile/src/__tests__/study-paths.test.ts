/**
 * Build E, the app side of the study modes:
 * - every non-mock session starts timed when the Study default is on
 *   (owner request): review, "Practice this concept", Today's plan,
 *   Saved, the study modes; Practice's own switch still overrides; mocks never;
 * - Smart / In order / Random / Guided sessions respect the domain filter
 *   and carry their reason tags;
 * - In order resumes where the learner stopped, and the tail never moves it;
 * - the study mode, domain and size are remembered;
 * - new saved fields travel through the backup "fit" path, unknown ids are
 *   dropped, and older saves and backups (without them) still load.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findQuestion, getAllQuestions } from '../content/loader';
import { readBackup } from '../engine/backup';
import { topicQuestionIds } from '../engine/outline';
import { activeMode } from '../engine/studyModes';
import { runPlanItem } from '../lib/actions';
import { checkBackupText, currentBackup } from '../lib/backup';
import { certOutline, scopeTopics } from '../lib/outline';
import { advancePath, startBookmarks, startFromIds, startGuidedStep, startMock, startPractice, startReview, startStudy } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const bank = getAllQuestions('cisa');
const active = () => useSession.getState().active!;
const cp = () => selectCert(useProgress.getState(), 'cisa');

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', practiceTimer: false, studyMode: undefined, studyDomain: undefined, studySize: undefined });
});

describe('the practice timer default reaches every non-mock session (owner request)', () => {
  const missOne = () => useProgress.getState().recordAnswer('cisa', bank[0].id, false);

  it('review, "Practice this concept", Today plan items, Saved and the study modes start timed', () => {
    useSettings.setState({ practiceTimer: true });
    missOne();
    expect(startReview('cisa')?.timed).toBe(true);
    useSession.getState().clear();
    // "Practice this concept" (and Mistakes, Bank "Practise these", Missed): startFromIds.
    expect(startFromIds('cisa', [bank[1].id, bank[2].id], 'A concept')?.timed).toBe(true);
    useSession.getState().clear();
    // Today's plan: a practice item, then a review item.
    runPlanItem({ kind: 'practice', count: 5, label: '5 questions' }, 'cisa');
    expect(active().timed).toBe(true);
    useSession.getState().clear();
    missOne();
    runPlanItem({ kind: 'review', count: 1 }, 'cisa');
    expect(active()).toMatchObject({ mode: 'review', timed: true });
    useSession.getState().clear();
    useProgress.getState().toggleBookmark('cisa', bank[3].id);
    expect(startBookmarks('cisa')?.timed).toBe(true);
    useSession.getState().clear();
    expect(startStudy('cisa', { mode: 'smart', count: 10 })?.timed).toBe(true);
    useSession.getState().clear();
    expect(startGuidedStep('cisa', scopeTopics('cisa')[1].id)?.timed).toBe(true);
  });

  it("Practice's own switch still overrides for one set; mocks never use it", () => {
    useSettings.setState({ practiceTimer: true });
    expect(startPractice('cisa', { count: 5, timed: false })?.timed).toBeUndefined();
    useSession.getState().clear();
    expect(startStudy('cisa', { mode: 'random', count: 10, timed: false })?.timed).toBeUndefined();
    useSession.getState().clear();
    expect(startMock('cisa', 10)?.timed).toBeUndefined();
    useSession.getState().clear();
    useSettings.setState({ practiceTimer: false });
    expect(startFromIds('cisa', [bank[1].id], 'Saved')?.timed).toBeUndefined();
    expect(startPractice('cisa', { count: 5, timed: true })?.timed).toBe(true);
  });
});

describe('study-mode sessions', () => {
  it('Smart, In order and Random stay inside the chosen domain, with reasons and the path', () => {
    for (const mode of ['smart', 'inOrder', 'random'] as const) {
      const s = startStudy('cisa', { mode, domainId: '2', count: 20 })!;
      expect(s.questionIds).toHaveLength(20);
      expect(s.questionIds.every((id) => findQuestion('cisa', id)?.domainId === '2')).toBe(true);
      expect(s.path).toEqual({ mode, scope: '2' });
      expect(s.title).toMatch(/^(Smart|In order|Random) · /);
      if (mode === 'smart') expect(Object.keys(s.reasons!)).toHaveLength(20);
      if (mode === 'inOrder') expect(Object.values(s.reasons!)).toEqual(['mixed', 'mixed', 'mixed']);
      useSession.getState().clear();
    }
  });

  it('In order resumes after the last answered walk question; the mixed tail never moves the place', () => {
    const first = startStudy('cisa', { mode: 'inOrder', count: 10 })!;
    const walk = first.questionIds.slice(0, 8);
    expect(walk[0]).toBe(topicQuestionIds(certOutline('cisa').topics[0])[0]);
    advancePath(first, walk[0]);
    advancePath(first, walk[1]);
    advancePath(first, walk[2]);
    // Answering the tail does not move the place.
    advancePath(first, first.questionIds[9]);
    expect(cp().studyPath?.inOrder?.all).toBe(walk[2]);
    useSession.getState().clear();
    const next = startStudy('cisa', { mode: 'inOrder', count: 10 })!;
    expect(next.questionIds.slice(0, 5)).toEqual(walk.slice(3, 8));
    expect(next.questionIds.slice(-2).every((id) => next.reasons?.[id] === 'mixed')).toBe(true);
  });

  it('a Guided step is 5 + 3 and remembers its topic for Results', () => {
    const topics = scopeTopics('cisa', '1');
    const s = startGuidedStep('cisa', topics[2].id, '1')!;
    expect(s.questionIds).toHaveLength(8);
    expect(s.path).toEqual({ mode: 'guided', scope: '1', topicId: topics[2].id });
    expect(s.questionIds.slice(5).every((id) => s.reasons?.[id] === 'mixed')).toBe(true);
  });

  it('Guided moves its saved topic on once a step clears it, and only then', () => {
    const topics = scopeTopics('cisa', '1');
    const [t0, t1] = topics;
    useProgress.getState().setPathCursor('cisa', 'guided', '1', t0.id);
    const s = startGuidedStep('cisa', t0.id, '1')!;
    const own = s.questionIds.filter((id) => !s.reasons?.[id]);
    // Not clear yet (no lesson): answers keep Guided on this topic.
    for (const id of own) {
      useProgress.getState().recordAnswer('cisa', id, true, 'sure');
      advancePath(s, id);
    }
    expect(cp().studyPath?.guided?.['1']).toBe(t0.id);
    // The lesson makes it clear; the next answer on the step moves Guided on.
    useProgress.getState().completeLesson('cisa', 'cisa-l-d1-charter');
    advancePath(s, own[0]);
    expect(cp().studyPath?.guided?.['1']).toBe(t1.id);
    // A step whose topic the learner has since left never moves the saved topic.
    useProgress.getState().setPathCursor('cisa', 'guided', '1', topics[3].id);
    advancePath(s, own[1]);
    expect(cp().studyPath?.guided?.['1']).toBe(topics[3].id);
  });

  it('a Guided step takes the Timed choice it is given, else the Study default', () => {
    const t = scopeTopics('cisa')[1];
    useSettings.setState({ practiceTimer: true });
    expect(startGuidedStep('cisa', t.id, undefined, false)!.timed).toBeUndefined();
    useSession.getState().clear();
    expect(startGuidedStep('cisa', t.id)!.timed).toBe(true);
    useSession.getState().clear();
    useSettings.setState({ practiceTimer: false });
    expect(startGuidedStep('cisa', t.id, undefined, true)!.timed).toBe(true);
  });

  it('Build a set topic chips: only that topic’s questions', () => {
    const topic = scopeTopics('cisa', '4')[0];
    const ids = new Set(topicQuestionIds(topic));
    const s = startPractice('cisa', { count: 50, domainId: '4', ids: [...ids], title: topic.name })!;
    expect(s.questionIds.length).toBeGreaterThan(0);
    expect(s.questionIds.every((id) => ids.has(id))).toBe(true);
  });
});

describe('the study choice is remembered', () => {
  it('saves mode, domain and size, and the saved mode wins over the suggestion', async () => {
    const st = useSettings.getState();
    st.setStudyMode('inOrder');
    st.setStudyDomain('3');
    st.setStudySize(50);
    expect(activeMode(useSettings.getState().studyMode, 'learn')).toBe('inOrder');
    await new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem('aurivan.settings.v1'))!);
    expect(saved.state).toMatchObject({ studyMode: 'inOrder', studyDomain: '3', studySize: 50 });
    // "Follow my stage" clears it: the suggestion applies again.
    st.setStudyMode(undefined);
    expect(activeMode(useSettings.getState().studyMode, 'learn')).toBe('guided');
  });
});

describe('backups and old saves', () => {
  const backupText = () => JSON.stringify(currentBackup(Date.now()));

  it('new fields go through the fit path and restore', () => {
    useSettings.getState().setStudyMode('smart');
    useSettings.getState().setStudyDomain('4');
    useSettings.getState().setStudySize(20);
    const s = startStudy('cisa', { mode: 'inOrder', count: 10 })!;
    advancePath(s, s.questionIds[0]);
    useProgress.getState().setPathCursor('cisa', 'guided', 'all', '2A1');
    useProgress.getState().recordCard('cisa', 'rumor:4B1.2:abc', false);
    const read = checkBackupText(backupText());
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.settings).toMatchObject({ studyMode: 'smart', studyDomain: '4', studySize: 20 });
    expect(read.data.progress.byCert.cisa.studyPath).toEqual({ inOrder: { all: s.questionIds[0] }, guided: { all: '2A1' } });
    expect(read.data.progress.byCert.cisa.cards!['rumor:4B1.2:abc']).toMatchObject({ box: 1 });
  });

  it('drops unknown ids, snaps odd sizes, and refuses a mode it does not know', () => {
    const f = JSON.parse(backupText());
    const c = f.stores.progress.state.byCert.cisa;
    c.studyPath = { inOrder: { all: 'd9_999', '2': bank.find((q) => q.domainId === '2')!.id } };
    c.cards = { 'rumor:9Z9.9:x': { box: 1, dueAt: Date.now(), lastSeen: Date.now(), reps: 1 }, 'root:4B1.2:y': { box: 2, dueAt: Date.now(), lastSeen: Date.now(), reps: 1 } };
    f.stores.settings.state.studySize = 37;
    const read = checkBackupText(JSON.stringify(f));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.settings.studySize).toBe(50);
    expect(Object.keys(read.data.progress.byCert.cisa.studyPath!.inOrder!)).toEqual(['2']);
    expect(Object.keys(read.data.progress.byCert.cisa.cards!)).toEqual(['root:4B1.2:y']);
    f.stores.settings.state.studyMode = 'cram';
    expect(checkBackupText(JSON.stringify(f))).toMatchObject({ kind: 'error', code: 'bad-data' });
  });

  it('a backup and a save from before Build E (no new fields) load and study normally', () => {
    const f = JSON.parse(backupText());
    for (const k of ['studyMode', 'studyDomain', 'studySize']) delete f.stores.settings.state[k];
    delete f.stores.progress.state.byCert.cisa.studyPath;
    delete f.stores.progress.state.byCert.cisa.cards;
    const data = readBackup(JSON.stringify(f), ['cisa']);
    expect(data.settings.studyMode).toBeUndefined();
    expect(data.progress.byCert.cisa.studyPath).toBeUndefined();
    // An old save: In order starts at the beginning, the suggestion picks the mode.
    expect(cp().studyPath).toBeUndefined();
    const s = startStudy('cisa', { mode: 'inOrder', count: 10 })!;
    expect(s.questionIds[0]).toBe(topicQuestionIds(certOutline('cisa').topics[0])[0]);
    expect(activeMode(undefined, 'practice')).toBe('smart');
  });
});
