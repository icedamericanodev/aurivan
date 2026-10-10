/**
 * Build F milestones, end to end through the stores: the facts come from
 * real saved progress, Coach me answers never count, a session celebrates
 * at most ONE milestone (the rest queue), the launch back-fill earns quietly
 * with one summary, badges are never revoked, and a backup carries them —
 * a restored badge the data can't support is dropped.
 */
import { getDomainQuestions } from '../content/loader';
import { readBackup } from '../engine/backup';
import { allMarks } from '../engine/milestones';
import { dayKey } from '../engine/streak';
import { checkBackupText, currentBackup } from '../lib/backup';
import { finishSession } from '../lib/finishSession';
import { backfillLine, celebrateNext, checkMilestones, ensureBackfill, milestoneFacts, momentFor, seeBackfill } from '../lib/milestones';
import { certOutline, topicLessons } from '../lib/outline';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress, type CertProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const d4 = getDomainQuestions('cisa', '4').map((q) => q.id);
const cp = () => selectCert(useProgress.getState(), 'cisa');
const facts = () => milestoneFacts('cisa', cp(), { now: Date.now() })!;
const met = () => allMarks(facts()).filter((m) => m.met).map((m) => m.key);
const answer = (id: string, correct = true, opts: { assisted?: boolean; confidence?: 'sure'; game?: boolean } = {}) =>
  useProgress.getState().recordAnswer('cisa', id, correct, opts.confidence, { assisted: opts.assisted, ...(opts.game ? { mastery: false } : {}) });

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', practiceTimer: false });
});
afterEach(() => jest.useRealTimers());

describe('assisted (Coach me) answers never count', () => {
  it('First Foothold: 20 hinted answers do not finish the diagnostic; 20 clean ones do', () => {
    d4.slice(0, 20).forEach((id) => answer(id, true, { assisted: true }));
    expect(facts().cleanAnswered).toBe(0);
    expect(met()).not.toContain('first-foothold');
    d4.slice(20, 40).forEach((id) => answer(id));
    expect(met()).toContain('first-foothold');
  });

  it('Firm Footing reads clean answers only', () => {
    d4.slice(0, 20).forEach((id) => answer(id, true, { assisted: true }));
    expect(facts().domains.find((d) => d.id === '4')!.answered).toBe(0);
    d4.slice(0, 20).forEach((id) => answer(id));
    expect(met()).toContain('firm-footing:4');
  });

  it('Topic Clear uses the Guided rule: lesson done + 4 of the last 5 unhinted right', () => {
    const topic = certOutline('cisa').topics.find((t) => topicLessons('cisa', t.id).length && t.subtopics.flatMap((s) => s.questionIds).length >= 5)!;
    const ids = topic.subtopics.flatMap((s) => s.questionIds).slice(0, 5);
    useProgress.getState().completeLesson('cisa', topicLessons('cisa', topic.id)[0].id);
    ids.forEach((id, k) => {
      jest.setSystemTime(T0 + k * 1000);
      answer(id, true, { assisted: true });
    });
    expect(facts().topicsClear).toBe(0);
    ids.forEach((id, k) => {
      jest.setSystemTime(T0 + 10_000 + k * 1000);
      answer(id);
    });
    expect(facts().topicsClear).toBeGreaterThanOrEqual(1);
    expect(met()).toContain('topic-clear');
  });

  it('Know What You Know ignores hinted and game "sure" answers', () => {
    d4.slice(0, 25).forEach((id) => answer(id, true, { assisted: true, confidence: 'sure' }));
    d4.slice(25, 50).forEach((id) => answer(id, true, { game: true, confidence: 'sure' }));
    expect(cp().milestones?.sure ?? []).toEqual([]);
    d4.slice(50, 70).forEach((id) => answer(id, true, { confidence: 'sure' }));
    expect(met()).toContain('know-what-you-know');
  });

  it('Slip Spotter counts tagged mistakes', () => {
    d4.slice(0, 10).forEach((id) => {
      useProgress.getState().recordMistake('cisa', id, 'A');
      useProgress.getState().tagMistake('cisa', id, 'role');
    });
    expect(met()).toContain('slip-spotter');
  });
});

describe('game answers never count toward milestones (lastGame)', () => {
  it('20 game answers do not earn First Foothold; the record carries lastGame', () => {
    d4.slice(0, 20).forEach((id) => answer(id, true, { game: true }));
    expect(cp().answers[d4[0]].lastGame).toBe(true);
    expect(facts().cleanAnswered).toBe(0);
    expect(met()).not.toContain('first-foothold');
  });

  it('a later answer outside a game drops the flag, so it counts again', () => {
    answer(d4[0], true, { game: true });
    answer(d4[0]);
    expect('lastGame' in cp().answers[d4[0]]).toBe(false);
    expect(facts().cleanAnswered).toBe(1);
  });

  it('closes the Coach me leak: a hinted answer then a game answer is still not clean', () => {
    answer(d4[0], true, { assisted: true });
    answer(d4[0], true, { game: true });
    expect(cp().answers[d4[0]].lastAssisted).toBeUndefined();
    expect(facts().cleanAnswered).toBe(0);
  });

  it('Firm Footing and Topic Clear skip game answers', () => {
    d4.slice(0, 20).forEach((id) => answer(id, true, { game: true }));
    expect(facts().domains.find((d) => d.id === '4')!.answered).toBe(0);
    const topic = certOutline('cisa').topics.find((t) => topicLessons('cisa', t.id).length && t.subtopics.flatMap((s) => s.questionIds).length >= 5)!;
    useProgress.getState().completeLesson('cisa', topicLessons('cisa', topic.id)[0].id);
    topic.subtopics
      .flatMap((s) => s.questionIds)
      .slice(0, 5)
      .forEach((id, k) => {
        jest.setSystemTime(T0 + k * 1000);
        answer(id, true, { game: true });
      });
    expect(facts().topicsClear).toBe(0);
  });

  it('Topic Clear shows the closest topic’s progress before it is earned', () => {
    const topic = certOutline('cisa').topics.find((t) => topicLessons('cisa', t.id).length && t.subtopics.flatMap((s) => s.questionIds).length >= 5)!;
    useProgress.getState().completeLesson('cisa', topicLessons('cisa', topic.id)[0].id);
    topic.subtopics
      .flatMap((s) => s.questionIds)
      .slice(0, 3)
      .forEach((id, k) => {
        jest.setSystemTime(T0 + k * 1000);
        answer(id);
      });
    const mark = allMarks(facts()).find((m) => m.key === 'topic-clear')!;
    expect(mark.met).toBe(false);
    expect(mark.detail).toBe('Closest topic: 3 of 4 right · lesson done');
    expect(mark.progress).toBeCloseTo(4 / 5);
  });
});

describe('counters through the store', () => {
  it('Loop Closed: a logged miss fixed the next day counts once; same-day or hinted fixes do not', () => {
    const [a, b] = d4;
    useProgress.getState().recordMistake('cisa', a, 'A');
    useProgress.getState().recordMistake('cisa', b, 'A');
    answer(a); // same day
    expect(cp().milestones?.counts?.loopFixed).toBeUndefined();
    jest.setSystemTime(T0 + DAY);
    answer(b, true, { assisted: true });
    expect(cp().milestones?.counts?.loopFixed).toBeUndefined();
    answer(a);
    answer(b);
    expect(cp().milestones?.counts?.loopFixed).toBe(2);
    expect(cp().mistakes[a].fixedLater).toBe(true);
    jest.setSystemTime(T0 + 2 * DAY);
    answer(a);
    expect(cp().milestones?.counts?.loopFixed).toBe(2);
  });

  it('Graduate: right from the last box counts; a hinted answer does not', () => {
    const [a, b] = d4;
    useProgress.setState((s) => ({
      byCert: { cisa: { ...cp(), review: { [a]: { box: 5, dueAt: T0, lastSeen: T0 - 16 * DAY, reps: 4 }, [b]: { box: 5, dueAt: T0, lastSeen: T0 - 16 * DAY, reps: 4 } } } },
      streak: s.streak,
    }));
    answer(a, true, { confidence: 'sure' });
    answer(b, true, { assisted: true });
    expect(cp().milestones?.counts?.graduated).toBe(1);
    expect(cp().review[a]).toBeUndefined();
  });

  it('Long Memory: right a week after last seen', () => {
    answer(d4[0]);
    jest.setSystemTime(T0 + 7 * DAY);
    answer(d4[0]);
    expect(cp().milestones?.counts?.longRecall).toBe(1);
  });

  it('Rooted and Fresh Start: study days add up; a week away then a finished session', () => {
    answer(d4[0]);
    jest.setSystemTime(T0 + DAY);
    answer(d4[1]);
    expect(cp().milestones?.days).toBe(2);
    jest.setSystemTime(T0 + 9 * DAY);
    startFromIds('cisa', [d4[2]], 'Back');
    answer(d4[2]);
    expect(cp().milestones?.returnedOn).toBe(dayKey(T0 + 9 * DAY));
    finishSession();
    expect(cp().milestones?.earned['fresh-start']).toBe(T0 + 9 * DAY);
  });
});

describe('one celebration per session', () => {
  it('Results gets ONE milestone; the rest wait for later sessions', () => {
    // 20 clean, right answers in one domain on a full mock-free day: First
    // Foothold and Firm Footing (domain 4) are both met at once.
    ensureBackfill('cisa', T0); // app launch: a new learner's back-fill finds nothing
    startFromIds('cisa', d4.slice(0, 20), 'Twenty');
    d4.slice(0, 20).forEach((id) => answer(id));
    finishSession();
    const first = useSession.getState().active!.milestone;
    expect(first).toBe('first-foothold');
    expect(cp().milestones!.queue).toEqual(['firm-footing:4']);
    expect(momentFor('cisa', first!)).toEqual(expect.objectContaining({ label: 'First Foothold', kind: 'milestone' }));

    useSession.getState().clear();
    startFromIds('cisa', [d4[30]], 'Next');
    answer(d4[30]);
    finishSession();
    expect(useSession.getState().active!.milestone).toBe('firm-footing:4');
    expect(momentFor('cisa', 'firm-footing:4')!.label).toBe('Firm Footing · IS Operations');
    expect(cp().milestones!.queue).toEqual([]);

    // Nothing left: the next session shows none.
    useSession.getState().clear();
    startFromIds('cisa', [d4[31]], 'Quiet');
    answer(d4[31]);
    finishSession();
    expect(useSession.getState().active!.milestone).toBeUndefined();
  });

  it('celebrateNext on an empty queue is null', () => {
    expect(celebrateNext('cisa')).toBeNull();
  });
});

describe('never revoked', () => {
  it('a domain that drops keeps its Firm Footing leaf', () => {
    d4.slice(0, 20).forEach((id) => answer(id));
    checkMilestones('cisa');
    const at = cp().milestones!.earned['firm-footing:4'];
    expect(at).toBe(T0);
    jest.setSystemTime(T0 + DAY);
    d4.slice(0, 20).forEach((id) => answer(id, false));
    expect(met()).not.toContain('firm-footing:4');
    checkMilestones('cisa');
    expect(cp().milestones!.earned['firm-footing:4']).toBe(at);
  });
});

describe('back-fill at launch', () => {
  /** A 1.5-shaped save: no milestones at all. */
  function oldSave(): CertProgress {
    const answers: CertProgress['answers'] = {};
    d4.slice(0, 25).forEach((id, k) => (answers[id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - (k % 12) * DAY }));
    return {
      answers,
      review: {},
      bookmarks: [],
      mocks: [{ id: 'm1', finishedAt: T0 - 2 * DAY, total: 150, correct: 110, minutesUsed: 200, byDomain: {}, timing: 'standard', unanswered: 0, checkpoints: [0.02, 0.05, -0.04] }],
      lessonsDone: [],
      mistakes: {},
      gameBest: {},
      gameRecent: {},
      notesRead: [],
    };
  }

  it('earns what the data shows QUIETLY, with one summary count', () => {
    useProgress.setState({ byCert: { cisa: oldSave() } });
    const n = ensureBackfill('cisa', T0);
    const m = cp().milestones!;
    // First Foothold, Firm Footing (D4: 25 clean answers, all right), Dress Rehearsal, On Pace, Rooted 10.
    expect(Object.keys(m.earned).sort()).toEqual(['dress-rehearsal', 'firm-footing:4', 'first-foothold', 'on-pace', 'rooted:10']);
    expect(n).toBe(5);
    expect(m.backfill).toEqual({ at: T0, count: 5 });
    expect(m.queue ?? []).toEqual([]);
    expect(backfillLine(n!)).toBe('You’d already earned 5 milestones.');
    expect(backfillLine(1)).toBe('You’d already earned 1 milestone.');
    expect(backfillLine(0)).toBeNull();
  });

  it('runs once; the next session celebrates nothing back-filled', () => {
    useProgress.setState({ byCert: { cisa: oldSave() } });
    ensureBackfill('cisa', T0);
    expect(ensureBackfill('cisa', T0 + 1)).toBeNull();
    startFromIds('cisa', [d4[40]], 'After');
    answer(d4[40]);
    finishSession();
    expect(useSession.getState().active!.milestone).toBeUndefined();
  });

  it('the summary is marked seen once', () => {
    useProgress.setState({ byCert: { cisa: oldSave() } });
    ensureBackfill('cisa', T0);
    seeBackfill('cisa');
    expect(cp().milestones!.backfill!.seen).toBe(true);
  });

  it('a Reset after 12 study days does not hand Rooted back (the streak’s days are not read)', () => {
    for (let k = 0; k < 12; k++) {
      jest.setSystemTime(T0 + k * DAY);
      answer(d4[k]);
    }
    checkMilestones('cisa');
    expect(cp().milestones!.earned['rooted:10']).toBeDefined();
    expect(useProgress.getState().streak.recentDays?.length ?? 0).toBeGreaterThan(0);
    useProgress.getState().resetCert('cisa');
    // The reset marked the back-fill as done: it doesn't run again (null) and finds nothing.
    expect(ensureBackfill('cisa') ?? 0).toBe(0);
    expect(cp().milestones?.backfill).toEqual({ at: expect.any(Number), count: 0, seen: true });
    expect(cp().milestones?.earned?.['rooted:10']).toBeUndefined();
    expect(cp().milestones?.days ?? 0).toBe(0);
  });

  it('a brand-new learner back-fills nothing and gets no summary', () => {
    expect(ensureBackfill('cisa', T0)).toBe(0);
    expect(backfillLine(0)).toBeNull();
  });
});

describe('backup and restore', () => {
  it('a backup carries milestones and restores them', () => {
    d4.slice(0, 20).forEach((id) => answer(id));
    checkMilestones('cisa');
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.milestones!.earned).toEqual(cp().milestones!.earned);
    expect(read.data.progress.byCert.cisa.milestones!.queue).toEqual(cp().milestones!.queue);
  });

  it('a restored badge the data cannot support is dropped (and leaves the queue)', () => {
    d4.slice(0, 20).forEach((id) => answer(id));
    checkMilestones('cisa');
    const file = currentBackup(Date.now());
    const m = file.stores.progress.state.byCert.cisa.milestones!;
    m.earned = { ...m.earned, 'rooted:60': T0, graduate: T0, 'made-up': T0 };
    m.queue = [...(m.queue ?? []), 'rooted:60'];
    const data = readBackup(JSON.stringify(file), ['cisa']);
    const back = data.progress.byCert.cisa.milestones!;
    expect(back.earned['first-foothold']).toBeDefined();
    expect(back.earned['firm-footing:4']).toBeDefined();
    expect(back.earned['rooted:60']).toBeUndefined();
    expect(back.earned.graduate).toBeUndefined();
    expect(back.earned['made-up']).toBeUndefined();
    expect(back.queue).not.toContain('rooted:60');
  });

  it('a genuine badge survives a restore into a newer bank that retired some of its questions', () => {
    d4.slice(0, 20).forEach((id) => answer(id));
    checkMilestones('cisa');
    expect(cp().milestones!.earned['first-foothold']).toBeDefined();
    const file = JSON.stringify(currentBackup(Date.now()));
    // The newer bank no longer has 5 of those 20 questions.
    const all = new Set(getDomainQuestions('cisa', '4').map((q) => q.id));
    d4.slice(0, 5).forEach((id) => all.delete(id));
    const known = () => ({ questions: all, lessons: new Set<string>(), notes: new Set<string>() });
    const data = readBackup(file, ['cisa'], known);
    expect(Object.keys(data.progress.byCert.cisa.answers!)).toHaveLength(15);
    expect(data.progress.byCert.cisa.milestones!.earned['first-foothold']).toBeDefined();
  });

  it('note cards of every game kind restore while their note, lesson or domain exists', () => {
    answer(d4[0]);
    useProgress.getState().recordMistake('cisa', d4[1], 'A');
    jest.setSystemTime(T0 + DAY);
    answer(d4[1]);
    const e = { box: 1, dueAt: T0, lastSeen: T0, reps: 1 };
    useProgress.setState((st) => ({
      byCert: {
        cisa: {
          ...cp(),
          cards: { 'role:1A1.3:r001': e, 'seq:1A3.1:s001': e, 'flow:cisa-l-d1-engagement': e, 'kt:D4:k1': e, 'kt:4B1.2:k2': e, 'flow:gone': e, 'kt:D9:k3': e, 'role:9Z9.9:r1': e },
        },
      },
      streak: st.streak,
    }));
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(read.code);
    const back = read.data.progress.byCert.cisa;
    expect(Object.keys(back.cards!).sort()).toEqual(['flow:cisa-l-d1-engagement', 'kt:4B1.2:k2', 'kt:D4:k1', 'role:1A1.3:r001', 'seq:1A3.1:s001']);
    // A mistake fixed on a later day keeps its mark, so it is never counted twice.
    expect(back.mistakes![d4[1]].fixedLater).toBe(true);
  });

  it('an older backup (no milestones) restores and asks for a back-fill', () => {
    answer(d4[0]);
    const file = currentBackup(Date.now());
    delete (file.stores.progress.state.byCert.cisa as { milestones?: unknown }).milestones;
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa?.milestones).toBeUndefined();
  });
});
