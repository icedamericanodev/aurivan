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
import {
  mergeWebProgress,
  profileIsEmpty,
  readWebExport,
  streakFromDays,
  WEB_IMPORT_ERROR_COPY,
  WEB_MAX_BYTES,
  WEB_MAX_PROFILES,
  WEB_NOT_IN_FILE,
  webAddLines,
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
const read = (f: unknown) => readWebExport(typeof f === 'string' ? f : JSON.stringify(f), KNOWN);
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
    expect(webSkipLines(webAddSummary(emptyPhone(), p, 'cisa'))[0]).toBe('3 items couldn’t be matched to questions or notes in this app, so they’re left out.');
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
    expect(webSkipLines(webAddSummary(emptyPhone(), p, 'cisa'))).toContain('1 older answer was saved without whether it was right, so it can’t be added.');
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
    const s = webAddSummary(emptyPhone(), p, 'cisa');
    expect(s).toMatchObject({ answers: 10, updated: 0, saved: 2, notesRead: 2, qNotes: 1, mocks: 1, studyDays: 4, nothingNew: false });
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
    expect(webAddSummary(once, p, 'cisa').nothingNew).toBe(true);
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
    expect(streakFromDays([])).toEqual({ current: 0, best: 0, lastDay: null });
    expect(streakFromDays(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'])).toMatchObject({ current: 2, best: 3, lastDay: '2026-10-11' });
    expect(streakFromDays(['2026-10-31', '2026-11-01'])).toMatchObject({ current: 2 });
  });
});
