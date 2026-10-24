/**
 * Mobile 1.42: bring your website progress into the app (engine/webImport.ts).
 *
 * The fixture `fixtures/web-export-v12.json` was made by driving the real
 * website (index.html) in a browser: its own recordAnswerParity,
 * updateReviewSchedule, toggleBookmark, gtSetRead, noteStudyDay and
 * saveState, then serialised exactly as exportProgress() does.
 *
 * Covers: reading the file (one profile and several), exact id matching with
 * unknown ids counted, malformed and hostile files, a merge into an empty app,
 * a merge into existing progress (nothing replaced or deleted), and
 * idempotency (importing twice changes nothing more).
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { fitForBackup, type BackupProgress } from '../engine/backup';
import { stableStringify } from '../engine/syncMerge';
import { bumpStreak, dayKey } from '../engine/streak';
import { addDays, examDateLabel } from '../engine/examDay';
import {
  mergeWebProgress,
  parseWebText,
  profileIsEmpty,
  readWebExport,
  streakFromDays,
  WEB_IMPORT_ERROR_COPY,
  WEB_MAX_BYTES,
  WEB_MAX_PROFILES,
  WEB_EXAM_DATE_MAX_DAYS,
  WEB_NOT_IN_FILE,
  WEB_NOT_IN_FILE_DATED,
  readWebExamDate,
  webAddLines,
  webNotInFile,
  webAddSummary,
  WebImportError,
  webSkipLines,
  type WebKnown,
} from '../engine/webImport';
import fixture from './fixtures/web-export-v12.json';

const questions = new Set(getAllQuestions('cisa').map((q) => q.id));
const notes = new Set(noteSubtopics('cisa').map((n) => n.id));
const domains = new Set((getCertification('cisa')?.domains ?? []).map((d) => d.id));
const KNOWN: WebKnown = { question: (id) => questions.has(id), note: (id) => notes.has(id), domain: (id) => domains.has(id) };
const CTX = { now: fixture.profile.lastActive + 60_000, knownCertIds: ['cisa'] };

/** A fresh copy of the real export, to change in one test. */
const file = (): typeof fixture & Record<string, unknown> => JSON.parse(JSON.stringify(fixture));
const NOW = CTX.now;
const read = (f: unknown) => readWebExport(parseWebText(typeof f === 'string' ? f : JSON.stringify(f)), KNOWN, NOW);
/** What importing `p` into `phone` adds (merged on a copy and compared, as the app does). */
const summaryOf = (phone: BackupProgress, p: ReturnType<typeof read>[number]) => webAddSummary(phone, mergeWebProgress(phone, p, 'cisa', CTX), p, 'cisa', NOW);
const codeOf = (f: unknown) => {
  try {
    read(f);
    return 'ok';
  } catch (e) {
    return e instanceof WebImportError ? e.code : String(e);
  }
};

/** The app's progress store, empty, fitted as the merge expects. */
const emptyPhone = (): BackupProgress =>
  fitForBackup({ settings: {}, progress: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } }).progress as BackupProgress;

describe('reading the website’s real export', () => {
  const [p] = read(fixture);
  const web = fixture.profile.state;

  it('is one profile, with its name and when it was last used', () => {
    expect(read(fixture)).toHaveLength(1);
    expect(p.key).toBe('profile');
    expect(p.name).toBe(fixture.profile.name);
    expect(p.lastActive).toBe(fixture.profile.lastActive);
  });

  it('maps answers one to one (attempts, result, time, confidence), matched by exact id', () => {
    expect(Object.keys(p.cert.answers ?? {}).sort()).toEqual(Object.keys(web.answerLog).sort());
    expect(p.cert.answers?.d1_010).toEqual(web.answerLog.d1_010);
  });

  it('brings the review queue, the mistake journal, saved questions and the mock (with a web- id)', () => {
    expect(p.cert.review).toEqual(web.review);
    expect(Object.keys(p.cert.mistakes ?? {}).sort()).toEqual(Object.keys(web.mistakeLog).sort());
    expect(p.cert.mistakes?.d1_010).toEqual({ at: web.mistakeLog.d1_010.at, picked: web.mistakeLog.d1_010.picked, confidence: 'sure' });
    expect(p.cert.bookmarks).toEqual(['d2_010', 'd4_050']);
    expect(p.cert.mocks).toHaveLength(1);
    const m = p.cert.mocks![0];
    expect(m.id).toBe('web-mock_demo_1');
    expect(m).toMatchObject({ total: 50, correct: 34, minutesUsed: 71, timing: 'standard', minutesAllowed: 80, unanswered: 1, medianSec: 74 });
    // The website's own "type" is not an app field.
    expect('type' in m).toBe(false);
  });

  it('brings study notes read and started (current note ids), your notes on questions and study days', () => {
    expect(p.cert.notesRead).toEqual(Object.keys(web.topicReviewed).sort());
    expect(p.cert.notesViewed).toEqual(Object.keys(web.topicViewed));
    expect(p.cert.qNotes).toEqual(web.qNotes);
    expect(p.studyDays).toEqual(web.studyDays);
    expect(p.unmatched).toBe(0);
    expect(p.noDetail).toBe(0);
    expect(profileIsEmpty(p)).toBe(false);
  });

  it('never brings the plant, settings or anything the app has no place for', () => {
    expect('plant' in p.cert).toBe(false);
    expect(Object.keys(p.cert).sort()).toEqual(['answers', 'bookmarks', 'mistakes', 'mocks', 'notesEverRead', 'notesRead', 'notesViewed', 'qNotes', 'review'].sort());
  });
});

describe('ids the app doesn’t have', () => {
  it('are left out and counted once each, across answers, saved questions and notes', () => {
    const f = file();
    const s = f.profile.state as Record<string, unknown> & typeof f.profile.state;
    (s.answerLog as Record<string, unknown>).d9_999 = { ...s.answerLog.d1_010 };
    (s.review as Record<string, unknown>).d9_999 = { ...s.review.d1_010 };
    s.bookmarks.push({ ...s.bookmarks[0], id: 'd9_999' });
    (s.qNotes as Record<string, unknown>).d8_001 = { text: 'gone', ts: s.qNotes.d1_010.ts };
    (s.topicReviewed as Record<string, unknown>)['9Z9.9'] = true;
    const [p] = read(f);
    expect(p.cert.answers?.d9_999).toBeUndefined();
    expect(p.cert.bookmarks).not.toContain('d9_999');
    expect(p.unmatched).toBe(3);
    expect(webSkipLines(summaryOf(emptyPhone(), p))[0]).toBe('3 items couldn’t be matched to questions or notes in this app, so they’re left out.');
  });

  it('notes ticked under the website’s older numbering are not guessed at', () => {
    const f = file();
    f.profile.state.topicTicksSchema = 1;
    const [p] = read(f);
    expect(p.cert.notesRead).toBeUndefined();
    expect(p.unmatched).toBe(Object.keys(f.profile.state.topicReviewed).length + Object.keys(f.profile.state.topicViewed).length);
  });

  it('older answers saved without their result are counted, never invented', () => {
    const f = file();
    const q = getAllQuestions('cisa').find((x) => x.domainId === '3' && !(x.id in f.profile.state.answerLog))!;
    (f.profile.state.answeredIds as Record<string, Record<string, boolean>>)['3'][q.id] = true;
    const [p] = read(f);
    expect(p.cert.answers?.[q.id]).toBeUndefined();
    expect(p.noDetail).toBe(1);
    expect(webSkipLines(summaryOf(emptyPhone(), p))).toContain('1 older answer was saved without whether it was right, so it can’t be added.');
  });
});

describe('malformed and hostile files', () => {
  it('not JSON, no marker, a wrong marker, or no profile: bad-data', () => {
    expect(codeOf('{"cisaMindsetExport": true, "version": 1, "prof')).toBe('bad-data');
    expect(codeOf({ version: 1, profile: fixture.profile })).toBe('bad-data');
    expect(codeOf({ ...fixture, cisaMindsetExport: 'yes' })).toBe('bad-data');
    expect(codeOf({ cisaMindsetExport: true, version: 1 })).toBe('bad-data');
    expect(codeOf({ cisaMindsetExport: true, version: 1, profile: { name: 'x' } })).toBe('bad-data');
    expect(codeOf({ cisaMindsetExport: true, version: 1, profile: { name: 'x', state: [] } })).toBe('bad-data');
  });

  it('a newer website format asks to update; a version that isn’t a number is bad data', () => {
    expect(codeOf({ ...fixture, version: 2 })).toBe('newer');
    expect(codeOf({ ...fixture, version: '1' })).toBe('bad-data');
    expect(codeOf({ ...fixture, version: 0 })).toBe('bad-data');
  });

  it('a file over the cap is refused before it is parsed', () => {
    expect(codeOf('x'.repeat(WEB_MAX_BYTES + 1))).toBe('too-big');
  });

  it('wrong types inside are dropped one by one, never trusted and never thrown', () => {
    const f = file();
    const s = f.profile.state as unknown as Record<string, Record<string, unknown>>;
    s.answerLog.d1_008 = { attempts: 'lots', correctCount: -4, lastCorrect: 'yes', lastAt: 'today' };
    s.answerLog.d2_006 = { ...(s.answerLog.d2_006 as object), lastAt: 1e20 };
    s.answerLog.d3_002 = { ...(s.answerLog.d3_002 as object), attempts: 1e12, correctCount: 1e12, ms: -5, lastConfidence: 'very' };
    s.mistakeLog.d1_010 = { at: 'never', picked: 'Z' };
    s.qNotes.d1_010 = { text: 42, ts: 1 };
    (f.profile.state as Record<string, unknown>).mockHistory = [{ id: 'm1', finishedAt: 5, total: 10 }, 'junk', { id: '<script>', finishedAt: Date.now(), total: 5 }];
    (f.profile.state as Record<string, unknown>).studyDays = ['2026-02-31', 'today', 7, '2026-10-01'];
    (f.profile.state as Record<string, unknown>).review = 'not a map';
    const [p] = read(f);
    expect(p.cert.answers?.d1_008).toBeUndefined();
    expect(p.cert.answers?.d2_006).toBeUndefined();
    expect(p.cert.answers?.d3_002).toMatchObject({ attempts: 10_000_000, correctCount: 10_000_000, ms: 0 });
    expect(p.cert.answers?.d3_002?.lastConfidence).toBeUndefined();
    expect(p.cert.mistakes?.d1_010).toBeUndefined();
    expect(p.cert.qNotes).toBeUndefined();
    expect(p.cert.mocks).toBeUndefined();
    expect(p.cert.review).toBeUndefined();
    expect(p.studyDays).toEqual(['2026-10-01']);
  });

  it('prototype keys are ignored, and a name is plain text only', () => {
    const text = JSON.stringify(fixture).replace('"answerLog":{', '"answerLog":{"__proto__":{"polluted":true},"constructor":{"x":1},');
    const f = JSON.parse(text);
    f.profile.name = '<b>Maya</b>\u0007';
    const [p] = read(f);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(p.cert.answers ?? {})).not.toContain('constructor');
    expect(p.name).toBe('bMaya/b');
  });

  it('every message says nothing changed', () => {
    for (const line of Object.values(WEB_IMPORT_ERROR_COPY)) expect(line).toMatch(/Nothing was changed\.$/);
  });
});

describe('several profiles in one file', () => {
  it('are each offered (a map or a list), at most 20, and each is read on its own', () => {
    const work = { ...fixture.profile, id: 'p_work', name: 'Work laptop', state: { ...fixture.profile.state, bookmarks: [] } };
    const byMap = read({ cisaMindsetExport: true, version: 1, profiles: { p_home: fixture.profile, p_work: work } });
    expect(byMap.map((p) => [p.key, p.name])).toEqual([
      ['p_home', fixture.profile.name],
      ['p_work', 'Work laptop'],
    ]);
    expect(byMap[1].cert.bookmarks).toBeUndefined();
    const byList = read({ cisaMindsetExport: true, version: 1, profiles: [fixture.profile, work] });
    expect(byList).toHaveLength(2);
    const many = read({ cisaMindsetExport: true, version: 1, profiles: Array.from({ length: 30 }, () => fixture.profile) });
    expect(many).toHaveLength(WEB_MAX_PROFILES);
  });
});

describe('merging into an empty app', () => {
  it('adds everything that maps, with a streak from the study days', () => {
    const [p] = read(fixture);
    const merged = mergeWebProgress(emptyPhone(), p, 'cisa', CTX);
    const cp = merged.byCert.cisa;
    expect(Object.keys(cp.answers ?? {}).sort()).toEqual(Object.keys(fixture.profile.state.answerLog).sort());
    expect(cp.bookmarks).toEqual(['d2_010', 'd4_050']);
    expect(cp.mocks?.map((m) => m.id)).toEqual(['web-mock_demo_1']);
    expect(cp.qNotes).toEqual(fixture.profile.state.qNotes);
    expect(merged.streak).toMatchObject({ lastDay: '2026-10-24', current: 4, best: 4 });
    expect(merged.today).toEqual({ day: '', answered: 0 });
  });

  it('the summary names what will be added, in plain words, with no bank size', () => {
    const [p] = read(fixture);
    const s = summaryOf(emptyPhone(), p);
    expect(s).toMatchObject({ answers: 10, updated: 0, saved: 2, notesRead: 2, qNotes: 1, mocks: 1, mocksSkipped: 0, studyDays: 4, future: 0, nothingNew: false });
    expect(webAddLines(s)).toEqual([
      '10 questions you answered on the website',
      '2 saved questions',
      '2 study notes read',
      '1 note you wrote on questions',
      '1 mock exam result',
      '4 study days',
    ]);
    expect(WEB_NOT_IN_FILE).toMatch(/exam date/);
  });
});

describe('merging into existing progress', () => {
  const [p] = read(fixture);
  const lastAt = fixture.profile.state.answerLog.d1_010.lastAt;
  /** A learner who studied on the phone too, with some overlap. */
  const phone = (): BackupProgress => {
    const other = getAllQuestions('cisa').find((q) => !(q.id in fixture.profile.state.answerLog))!.id;
    return fitForBackup({
      settings: {},
      progress: {
        byCert: {
          cisa: {
            answers: {
              [other]: { attempts: 3, correctCount: 2, lastCorrect: true, lastAt: lastAt - 86_400_000 },
              // Answered on both: older here, and more attempts here.
              d1_010: { attempts: 4, correctCount: 3, lastCorrect: true, lastAt: lastAt - 3 * 86_400_000 },
            },
            review: {},
            bookmarks: [other],
            mocks: [{ id: 'mock-phone', finishedAt: lastAt - 5 * 86_400_000, total: 20, correct: 12, minutesUsed: 30, byDomain: {} }],
            lessonsDone: ['cisa-l-d1-charter'],
            mistakes: {},
            gameBest: { trap: 7 },
            gameRecent: { trap: [3, 5, 7] },
            studyPath: { guided: { all: '4B1' } },
            notesRead: ['4B1.2'],
            qNotes: { d1_010: { text: 'My own words, newer.', ts: lastAt + 1000 } },
          },
        },
        streak: { current: 2, best: 9, lastDay: '2026-10-20', restDay: '2026-10-17', recentDays: ['2026-10-19', '2026-10-20'] },
        today: { day: '2026-10-24', answered: 3 },
        reports: [{ ref: 'R-7K2Q', item: 'q:d1_010', reason: 'key', at: lastAt - 86_400_000, cert: 'cisa', version: '1.41.0' }],
        plantSettings: { promptHidden: true },
      },
    }).progress as BackupProgress;
  };

  it('keeps everything on the phone: nothing is replaced or deleted', () => {
    const before = phone();
    const merged = mergeWebProgress(before, p, 'cisa', CTX);
    const cp = merged.byCert.cisa;
    const mine = before.byCert.cisa;
    for (const id of Object.keys(mine.answers ?? {})) expect(cp.answers?.[id]).toBeDefined();
    expect(cp.bookmarks).toEqual(expect.arrayContaining([...(mine.bookmarks ?? []), 'd2_010', 'd4_050']));
    expect(cp.mocks?.map((m) => m.id).sort()).toEqual(['mock-phone', 'web-mock_demo_1']);
    expect(cp.lessonsDone).toEqual(['cisa-l-d1-charter']);
    expect(cp.gameBest).toEqual({ trap: 7 });
    expect(cp.gameRecent).toEqual({ trap: [3, 5, 7] });
    expect(cp.studyPath).toEqual({ guided: { all: '4B1' } });
    expect(cp.notesRead).toEqual(expect.arrayContaining(['4B1.2', ...Object.keys(fixture.profile.state.topicReviewed)]));
    // The phone's newer note wins over the website's older one.
    expect(cp.qNotes?.d1_010.text).toBe('My own words, newer.');
    // Reports, today's count and the plant display choices stay the phone's.
    expect(merged.reports).toEqual(before.reports);
    expect(merged.today).toEqual(before.today);
    expect(merged.plantSettings).toEqual({ promptHidden: true });
    // The streak keeps its best and rest day, and gains the website's days.
    expect(merged.streak.best).toBe(9);
    expect(merged.streak.restDay).toBe('2026-10-17');
    expect(merged.streak.recentDays).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']);
    expect(merged.streak.lastDay).toBe('2026-10-24');
  });

  it('an answer given on both: the later result is kept and attempts are not double counted', () => {
    const merged = mergeWebProgress(phone(), p, 'cisa', CTX);
    const a = merged.byCert.cisa.answers!.d1_010;
    expect(a.lastAt).toBe(lastAt);
    expect(a.lastCorrect).toBe(false);
    expect(a.attempts).toBe(4);
    expect(a.correctCount).toBe(3);
  });

  it('importing the same file twice changes nothing more', () => {
    const once = mergeWebProgress(phone(), p, 'cisa', CTX);
    const twice = mergeWebProgress(fitForBackup({ settings: {}, progress: once }).progress as BackupProgress, p, 'cisa', CTX);
    expect(stableStringify(twice)).toBe(stableStringify(once));
    // And the summary then says there is nothing new.
    expect(summaryOf(once, p).nothingNew).toBe(true);
  });

  it('into an empty app, twice, is the same as once', () => {
    const once = mergeWebProgress(emptyPhone(), p, 'cisa', CTX);
    const twice = mergeWebProgress(fitForBackup({ settings: {}, progress: once }).progress as BackupProgress, p, 'cisa', CTX);
    expect(stableStringify(twice)).toBe(stableStringify(once));
  });

  it('an exam the app doesn’t know is refused', () => {
    expect(() => mergeWebProgress(emptyPhone(), p, 'cism', CTX)).toThrow();
  });
});

describe('the streak from study days', () => {
  it('counts the run ending on the last day and the best run', () => {
    expect(streakFromDays([], '2026-11-30')).toEqual({ current: 0, best: 0, lastDay: null });
    // The run ending on the last day; `best` is never more than that run (the file can't raise the phone's best).
    expect(streakFromDays(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'], '2026-11-30')).toMatchObject({ current: 2, best: 2, lastDay: '2026-10-11' });
    expect(streakFromDays(['2026-10-31', '2026-11-01'], '2026-11-30')).toMatchObject({ current: 2 });
    // Days after today are left out.
    expect(streakFromDays(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-10-31')).toMatchObject({ current: 2, lastDay: '2026-10-31' });
  });
});

// ── Review fixes (1.42): "adds, never replaces", wrong clocks, caps ─────────
const DAY = 86_400_000;
const at = fixture.profile.state.answerLog.d1_010.lastAt;
/** A phone with exactly these bits of progress, fitted as the merge expects. */
const phoneWith = (cert: Record<string, unknown>, streak: Record<string, unknown> = { current: 0, best: 0, lastDay: null }) =>
  fitForBackup({ settings: {}, progress: { byCert: { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, ...cert } }, streak, today: { day: '', answered: 0 } } })
    .progress as BackupProgress;

describe('the phone’s own notes and review are never replaced', () => {
  it('a note here stays, even when the website’s is newer; the summary doesn’t count it', () => {
    const f = file();
    f.profile.state.qNotes.d1_010.ts = at + 5 * DAY > NOW ? NOW - 1000 : at + 5 * DAY;
    const [p] = read(f);
    const phone = phoneWith({ qNotes: { d1_010: { text: 'Mine, older.', ts: at - 10 * DAY } } });
    const merged = mergeWebProgress(phone, p, 'cisa', CTX);
    expect(merged.byCert.cisa.qNotes?.d1_010.text).toBe('Mine, older.');
    expect(summaryOf(phone, p).qNotes).toBe(0);
  });

  it('a note deleted here stays deleted', () => {
    const [p] = read(fixture);
    const phone = phoneWith({ qNotes: { d1_010: { text: '', ts: at - 10 * DAY } } });
    expect(mergeWebProgress(phone, p, 'cisa', CTX).byCert.cisa.qNotes?.d1_010.text).toBe('');
    expect(summaryOf(phone, p).qNotes).toBe(0);
  });

  it('a review entry here stays as it is, whatever the website says', () => {
    const [p] = read(fixture);
    const mine = { box: 4, dueAt: at + 7 * DAY, lastSeen: at - 2 * DAY, reps: 6 };
    const phone = phoneWith({ review: { d1_010: mine } });
    expect(mergeWebProgress(phone, p, 'cisa', CTX).byCert.cisa.review?.d1_010).toEqual(mine);
  });

  it('the website’s review entry isn’t added for a question the phone answered after the website saw it', () => {
    const [p] = read(fixture);
    const phone = phoneWith({ answers: { d1_010: { attempts: 2, correctCount: 2, lastCorrect: true, lastAt: at + 1000 } } });
    expect(mergeWebProgress(phone, p, 'cisa', CTX).byCert.cisa.review?.d1_010).toBeUndefined();
  });
});

describe('a computer with a wrong clock', () => {
  it('drops answers, review, mistakes, notes, mocks and study days dated in the future, and counts them', () => {
    const f = file();
    const s = f.profile.state as unknown as Record<string, Record<string, Record<string, unknown>>> & { studyDays: string[]; mockHistory: Record<string, unknown>[] };
    const later = NOW + 3 * DAY;
    s.answerLog.d1_008.lastAt = later;
    s.review.d1_010.lastSeen = later;
    s.mistakeLog.d2_010.at = later;
    s.qNotes.d1_010.ts = later;
    s.mockHistory[0].finishedAt = later;
    s.studyDays = [...s.studyDays, '2026-12-25'];
    const [p] = read(f);
    expect(p.cert.answers?.d1_008).toBeUndefined();
    expect(p.cert.review?.d1_010).toBeUndefined();
    expect(p.cert.mistakes?.d2_010).toBeUndefined();
    expect(p.cert.qNotes).toBeUndefined();
    expect(p.cert.mocks).toBeUndefined();
    expect(p.studyDays).not.toContain('2026-12-25');
    expect(p.future).toBe(6);
    expect(webSkipLines(summaryOf(emptyPhone(), p))).toContain('6 items are dated in the future (the computer’s clock may be wrong), so they’re left out.');
  });

  it('a date within a day ahead (another time zone) is kept', () => {
    const f = file();
    f.profile.state.answerLog.d1_008.lastAt = NOW + 6 * 3_600_000;
    expect(read(f)[0].cert.answers?.d1_008).toBeDefined();
  });

  it('a review date far beyond the longest interval is brought back to it', () => {
    const f = file();
    const e = f.profile.state.review.d1_010;
    e.dueAt = e.lastSeen + 400 * DAY;
    expect(read(f)[0].cert.review?.d1_010.dueAt).toBe(e.lastSeen + 16 * DAY);
  });

  it('150 future study days make no streak and never raise the best', () => {
    const f = file();
    const days: string[] = [];
    for (let i = 1; i <= 150; i++) {
      const d = new Date(NOW + i * DAY);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    (f.profile.state as { studyDays: string[] }).studyDays = days;
    const [p] = read(f);
    const phone = phoneWith({}, { current: 1, best: 3, lastDay: '2026-10-20', recentDays: ['2026-10-20'] });
    const merged = mergeWebProgress(phone, p, 'cisa', CTX);
    expect(merged.streak.best).toBe(3);
    expect(merged.streak.current).toBeLessThanOrEqual(2);
    expect(p.future).toBeGreaterThanOrEqual(149);
  });
});

describe('mocks never push the phone’s own out', () => {
  it('with 50 mocks here, the website’s mock is left out and said so', () => {
    const mine = Array.from({ length: 50 }, (_, i) => ({ id: `m${i}`, finishedAt: at - (i + 1) * DAY, total: 10, correct: 5, minutesUsed: 10, byDomain: {} }));
    const phone = phoneWith({ mocks: mine });
    const [p] = read(fixture);
    const merged = mergeWebProgress(phone, p, 'cisa', CTX);
    expect(merged.byCert.cisa.mocks?.map((m) => m.id).sort()).toEqual(mine.map((m) => m.id).sort());
    const s = summaryOf(phone, p);
    expect(s).toMatchObject({ mocks: 0, mocksSkipped: 1 });
    expect(webSkipLines(s)).toContain('1 older mock exam result isn’t added: the app keeps 50 at most, and yours stay.');
  });

  it('with room for some, only that many are added (newest first)', () => {
    const mine = Array.from({ length: 49 }, (_, i) => ({ id: `m${i}`, finishedAt: at - (i + 1) * DAY, total: 10, correct: 5, minutesUsed: 10, byDomain: {} }));
    const f = file();
    const m0 = f.profile.state.mockHistory[0];
    (f.profile.state as { mockHistory: unknown[] }).mockHistory = [m0, { ...m0, id: 'mock_demo_2', finishedAt: m0.finishedAt - DAY }];
    const [p] = read(f);
    const merged = mergeWebProgress(phoneWith({ mocks: mine }), p, 'cisa', CTX);
    expect(merged.byCert.cisa.mocks).toHaveLength(50);
    expect(merged.byCert.cisa.mocks?.some((m) => m.id === 'web-mock_demo_1')).toBe(true);
    expect(merged.byCert.cisa.mocks?.some((m) => m.id === 'web-mock_demo_2')).toBe(false);
  });
});

describe('re-importing after more study', () => {
  it('with 20+ website days and a new study day between, says there is nothing new', () => {
    const f = file();
    const days: string[] = [];
    for (let i = 30; i >= 1; i--) {
      const d = new Date(NOW - i * DAY);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    (f.profile.state as { studyDays: string[] }).studyDays = days;
    const [p] = read(f);
    expect(p.studyDays).toHaveLength(30);
    const once = mergeWebProgress(emptyPhone(), p, 'cisa', CTX);
    // The learner studies again: the app keeps only its last 14 days.
    const studied = { ...once, streak: bumpStreak(once.streak, NOW + 2 * DAY) };
    expect(studied.streak.recentDays).toHaveLength(14);
    expect(summaryOf(fitForBackup({ settings: {}, progress: studied }).progress as BackupProgress, p).nothingNew).toBe(true);
  });
});

describe('hostile files (review 1.42)', () => {
  it('a huge profiles list is cut BEFORE it is walked', () => {
    const list: unknown[] = Array.from({ length: 30 }, () => fixture.profile);
    Object.defineProperty(list, 25, {
      get() {
        throw new Error('walked past the cap');
      },
    });
    expect(readWebExport({ cisaMindsetExport: true, version: 1, profiles: list }, KNOWN, NOW)).toHaveLength(WEB_MAX_PROFILES);
  });

  it('a profiles map is cut before it is read too', () => {
    const profiles: Record<string, unknown> = {};
    for (let i = 0; i < 5000; i++) profiles[`p${i}`] = { name: `P${i}`, state: {} };
    profiles.p0 = fixture.profile;
    expect(readWebExport({ cisaMindsetExport: true, version: 1, profiles }, KNOWN, NOW)).toHaveLength(WEB_MAX_PROFILES);
  });

  it('invisible and direction-changing characters are taken out of names and notes', () => {
    const f = file();
    f.profile.name = 'Ma\u202Eya\u200B';
    f.profile.state.qNotes.d1_010.text = '\u2066Charter\u2069 first\u200F';
    (f.profile.state.qNotes as Record<string, unknown>).d1_008 = { text: '\u200B\u200C', ts: f.profile.state.qNotes.d1_010.ts };
    const [p] = read(f);
    expect(p.name).toBe('Maya');
    expect(p.cert.qNotes?.d1_010.text).toBe('Charter first');
    expect(p.cert.qNotes?.d1_008).toBeUndefined();
  });
});

describe('the exam date (mobile 1.42.1, website v12.34.1)', () => {
  const today = dayKey(NOW);
  const dated = (examDate: unknown) => ({ ...file(), examDate });

  it('reads a sensible date: a real day, at most a day in the past, at most about 3 years ahead', () => {
    expect(readWebExamDate({ examDate: addDays(today, 60) }, NOW)).toBe(addDays(today, 60));
    expect(readWebExamDate({ examDate: today }, NOW)).toBe(today);
    expect(readWebExamDate({ examDate: addDays(today, -1) }, NOW)).toBe(addDays(today, -1)); // time zones
    expect(readWebExamDate({ examDate: addDays(today, WEB_EXAM_DATE_MAX_DAYS) }, NOW)).toBe(addDays(today, WEB_EXAM_DATE_MAX_DAYS));
    expect(readWebExamDate({ examDate: addDays(today, -2) }, NOW)).toBeUndefined();
    expect(readWebExamDate({ examDate: addDays(today, WEB_EXAM_DATE_MAX_DAYS + 1) }, NOW)).toBeUndefined();
  });

  it('a malformed date is ignored, never an error: the rest of the file still reads', () => {
    for (const bad of ['2027-02-30', '2027-3-1', '15/03/2027', '2027-03-15T00:00:00Z', '', 20270315, null, { y: 2027 }, ['2027-03-15']]) {
      expect(readWebExamDate({ examDate: bad }, NOW)).toBeUndefined();
      const [p] = read(dated(bad));
      expect(p.examDate).toBeUndefined();
      expect(Object.keys(p.cert.answers ?? {})).toHaveLength(10);
      const s = summaryOf(emptyPhone(), p);
      expect(s.examDate).toBeUndefined();
      expect(webAddLines(s).some((l) => /exam date/i.test(l))).toBe(false);
    }
  });

  it('an older file (no date) reads as before and still says the date is not in it', () => {
    const [p] = read(fixture);
    expect(p.examDate).toBeUndefined();
    expect(readWebExamDate(fixture, NOW)).toBeUndefined();
    expect(webNotInFile(p)).toBe(WEB_NOT_IN_FILE);
  });

  it('with an empty phone: the date is added and named in the summary', () => {
    const date = addDays(today, 90);
    const [p] = read(dated(date));
    expect(p.examDate).toBe(date);
    const s = summaryOf(emptyPhone(), p);
    expect(s).toMatchObject({ examDate: date, nothingNew: false });
    expect(s.examDateKept).toBeUndefined();
    expect(webAddLines(s)).toContain(`Your exam date: ${examDateLabel(date)}`);
    expect(webNotInFile(p)).toBe(WEB_NOT_IN_FILE_DATED);
    expect(WEB_NOT_IN_FILE_DATED).not.toMatch(/exam date/);
  });

  it('with a phone that has its own date: the phone wins, and the sheet says so', () => {
    const [p] = read(dated(addDays(today, 90)));
    const s = webAddSummary(emptyPhone(), mergeWebProgress(emptyPhone(), p, 'cisa', CTX), p, 'cisa', NOW, addDays(today, 30));
    expect(s.examDate).toBeUndefined();
    expect(s.examDateKept).toBe(true);
    expect(webAddLines(s).some((l) => /exam date/i.test(l))).toBe(false);
    expect(webSkipLines(s)).toContain('This phone already has an exam date, so it stays as it is.');
    // The same date on both: nothing to add, nothing to explain.
    const same = webAddSummary(emptyPhone(), mergeWebProgress(emptyPhone(), p, 'cisa', CTX), p, 'cisa', NOW, addDays(today, 90));
    expect(same.examDate).toBeUndefined();
    expect(same.examDateKept).toBeUndefined();
  });

  it('a file with several profiles gives every one the file’s date', () => {
    const date = addDays(today, 120);
    const out = read({ cisaMindsetExport: true, version: 1, examDate: date, profiles: { a: fixture.profile, b: fixture.profile } });
    expect(out.map((p) => p.examDate)).toEqual([date, date]);
  });

  it('a date alone is something new: after everything else is on the phone, the date still counts', () => {
    const [p] = read(dated(addDays(today, 90)));
    const merged = mergeWebProgress(emptyPhone(), p, 'cisa', CTX);
    expect(webAddSummary(merged, mergeWebProgress(merged, p, 'cisa', CTX), p, 'cisa', NOW).nothingNew).toBe(false);
    expect(webAddSummary(merged, mergeWebProgress(merged, p, 'cisa', CTX), p, 'cisa', NOW, addDays(today, 90)).nothingNew).toBe(true);
  });
});
