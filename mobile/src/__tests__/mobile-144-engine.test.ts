/**
 * Mobile 1.44, the owner's "Version 3" name and study profile (engine only):
 * - Today's name ask: never on a welcome-back day or in exam week
 *   (engine/firstRun.ts nameAskDue, studyDaysAway);
 * - the one-time nudge for learners from before 1.41 (nameNudgeDue);
 * - "Your study profile" on You (engine/studyProfile.ts): the first study
 *   day, the dates, the initial, the lines and the one spoken sentence;
 * - the name carried web → app (engine/webImport.ts): read as hostile text,
 *   add-only (the phone's own name wins), and never the profile's label.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { fitForBackup, type BackupProgress } from '../engine/backup';
import { nameAskDue, nameNudgeDue, NAME_ASK_AWAY_DAYS, NAME_ASK_EXAM_DAYS, studyDaysAway } from '../engine/firstRun';
import { firstStudyDay, nameInitial, profileDate, profileLines, PROFILE_TITLE } from '../engine/studyProfile';
import {
  mergeWebProgress,
  parseWebText,
  readWebDisplayName,
  readWebExport,
  WEB_NAME_MAX_UNITS,
  WEB_NAME_NOTE,
  webAddLines,
  webAddSummary,
  webSkipLines,
  type WebKnown,
} from '../engine/webImport';
import fixture from './fixtures/web-export-v12.json';

// Escapes built at run time, so this file stays plain text.
const ch = (...codes: number[]) => String.fromCharCode(...codes);
const RLO = ch(0x202e); // right-to-left override
const LRO = ch(0x202d); // left-to-right override
const RLI = ch(0x2067); // right-to-left isolate
const ZWJ = ch(0x200d);

describe('the name ask on Today (mobile 1.44 exclusions)', () => {
  const base = { offered: true, hasName: false, studyDays: 2, lastStudyDay: '2026-10-25', today: '2026-10-26', otherSetup: false };

  it('still asks on an ordinary study day, with the new facts passed', () => {
    expect(nameAskDue({ ...base, awayDays: 0, daysLeft: 60 })).toBe(true);
    expect(nameAskDue({ ...base, awayDays: NAME_ASK_AWAY_DAYS - 1, daysLeft: NAME_ASK_EXAM_DAYS + 1 })).toBe(true);
    // No exam date at all is fine.
    expect(nameAskDue({ ...base, daysLeft: null })).toBe(true);
  });

  it('never on a welcome-back day (3 or more whole days away)', () => {
    expect(NAME_ASK_AWAY_DAYS).toBe(3);
    expect(nameAskDue({ ...base, awayDays: 3 })).toBe(false);
    expect(nameAskDue({ ...base, awayDays: 20 })).toBe(false);
  });

  it('never in exam week, on the day, or after the exam', () => {
    expect(NAME_ASK_EXAM_DAYS).toBe(7);
    for (const d of [7, 3, 1, 0, -1, -30]) expect(nameAskDue({ ...base, daysLeft: d })).toBe(false);
    expect(nameAskDue({ ...base, daysLeft: 8 })).toBe(true);
  });

  it('never beside another invitation (the caller folds them into otherSetup)', () => {
    expect(nameAskDue({ ...base, otherSetup: true })).toBe(false);
  });
});

describe('studyDaysAway', () => {
  it('counts whole days with no study before today', () => {
    expect(studyDaysAway(['2026-10-25'], '2026-10-26')).toBe(0);
    expect(studyDaysAway(['2026-10-24'], '2026-10-26')).toBe(1);
    expect(studyDaysAway(['2026-10-20', '2026-10-22'], '2026-10-26')).toBe(3);
  });
  it('ignores today (studying now keeps a welcome-back day one) and empty values', () => {
    expect(studyDaysAway(['2026-10-20', '2026-10-26', null, undefined], '2026-10-26')).toBe(5);
    expect(studyDaysAway([], '2026-10-26')).toBe(0);
    expect(studyDaysAway([null], '2026-10-26')).toBe(0);
  });
  it('takes the latest day, whatever the order', () => {
    expect(studyDaysAway(['2026-10-25', '2026-10-01'], '2026-10-26')).toBe(0);
  });
});

describe('the one-time nudge: only learners who never saw a name step (behavior.md §7.4)', () => {
  // What each group's saved data looks like. `newLearner` is set when a 1.24+ onboarding finishes.
  const PRE_123 = { onboarded: true, hasName: false, newLearner: false }; // no name step, no flag
  const V123_TO_140 = { onboarded: true, hasName: false, newLearner: true }; // saw the step (1.24–1.40), skipped it
  const V141_PLUS = { onboarded: true, hasName: false, newLearner: true, nameAsk: 'due' as const }; // onboarding set the ask

  it('before 1.23 (never asked): nudged once', () => {
    expect(nameNudgeDue(PRE_123)).toBe(true);
    expect(nameNudgeDue({ ...PRE_123, nameAsk: undefined })).toBe(true);
  });
  it('1.23 to 1.40 (saw and skipped the name step): never asked again', () => {
    expect(nameNudgeDue(V123_TO_140)).toBe(false);
  });
  it('1.41 and later: onboarding already set the ask, so no nudge is needed', () => {
    expect(nameNudgeDue(V141_PLUS)).toBe(false);
    expect(nameNudgeDue({ ...V141_PLUS, nameAsk: 'shown' })).toBe(false);
  });
  it('never again once set, never with a name, never before onboarding', () => {
    expect(nameNudgeDue({ ...PRE_123, nameAsk: 'due' })).toBe(false);
    expect(nameNudgeDue({ ...PRE_123, nameAsk: 'shown' })).toBe(false);
    expect(nameNudgeDue({ ...PRE_123, hasName: true })).toBe(false);
    expect(nameNudgeDue({ ...PRE_123, onboarded: false })).toBe(false);
  });
});

describe('the first study day', () => {
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

  it('is undefined before any study', () => {
    expect(firstStudyDay({})).toBeUndefined();
    expect(firstStudyDay({ answers: {}, mistakes: {}, mocks: [], mastery: {}, earned: {}, readinessDays: [] })).toBeUndefined();
  });

  it('is the earliest day among the exam’s own records', () => {
    expect(
      firstStudyDay({
        answers: { a: { lastAt: at(2026, 10, 20) }, b: { lastAt: at(2026, 10, 24) } },
        mistakes: { c: { at: at(2026, 10, 19) } },
        mocks: [{ finishedAt: at(2026, 10, 22) }],
      }),
    ).toBe('2026-10-19');
    // A re-answered question moved its lastAt, but the first subtopic day and the first badge remember.
    expect(firstStudyDay({ answers: { a: { lastAt: at(2026, 10, 25) } }, mastery: { s: { firstDay: '2026-10-12' } } })).toBe('2026-10-12');
    expect(firstStudyDay({ answers: { a: { lastAt: at(2026, 10, 25) } }, earned: { first: at(2026, 10, 11) } })).toBe('2026-10-11');
    expect(firstStudyDay({ readinessDays: ['2026-10-30', '2026-10-14'] })).toBe('2026-10-14');
  });

  it('ignores damaged values', () => {
    expect(
      firstStudyDay({
        answers: { a: { lastAt: NaN }, b: { lastAt: -5 }, c: { lastAt: at(2026, 10, 20) } },
        mastery: { s: { firstDay: 'not a day' } },
        readinessDays: ['2026/10/01'],
      }),
    ).toBe('2026-10-20');
  });
});

describe('dates and the initial', () => {
  it('a date near today leaves its year out; one further away keeps it', () => {
    expect(profileDate('2026-10-26', '2026-10-26')).toEqual({ shown: '26 Oct', spoken: '26 October' });
    expect(profileDate('2027-02-14', '2026-10-26')).toEqual({ shown: '14 Feb', spoken: '14 February' });
    expect(profileDate('2025-06-01', '2026-10-26')).toEqual({ shown: '1 Jun 2025', spoken: '1 June 2025' });
  });

  it('the initial is the first letter in capitals, accents kept, nothing for an emoji or symbol', () => {
    expect(nameInitial('maya')).toBe('M');
    expect(nameInitial('  élodie ')).toBe('É');
    expect(nameInitial(`e${ch(0x301)}lo`)).toBe(`E${ch(0x301)}`);
    expect(nameInitial('李明')).toBe('李');
    expect(nameInitial('7even')).toBe('7');
    expect(nameInitial(String.fromCodePoint(0x1f33f) + 'Maya')).toBe('');
    expect(nameInitial(undefined)).toBe('');
    expect(nameInitial('https://x.com')).toBe('');
    expect(nameInitial(`${RLO}maya`)).toBe('M');
  });
});

describe('"Your study profile" lines', () => {
  const full = { name: 'Maya', certName: 'CISA', since: '2026-10-26', examDate: '2027-02-14', minutes: 20, startedWith: 'Some IT audit experience', today: '2026-10-26' };

  it('with a name: the owner’s mockup, word for word', () => {
    const l = profileLines(full);
    expect(l.title).toBe('Maya');
    expect(l.since).toBe('Studying for CISA since 26 Oct');
    expect(l.plan).toBe('Exam 14 Feb · about 20 min most days');
    expect(l.started).toBe('Started with: Some IT audit experience');
  });

  it('is spoken as ONE sentence', () => {
    const l = profileLines(full);
    expect(l.spoken).toBe('Your study profile: Maya, studying for CISA since 26 October, exam on 14 February, about 20 minutes most days, started with some IT audit experience.');
    expect(l.spoken.match(/\./g)).toHaveLength(1);
    expect(l.spoken.endsWith('.')).toBe(true);
  });

  it('without a name: "Your study profile" as the title, nothing invented', () => {
    const l = profileLines({ ...full, name: undefined });
    expect(l.name).toBe('');
    expect(l.title).toBe(PROFILE_TITLE);
    expect(l.spoken).toMatch(/^Your study profile: no name yet, studying for CISA/);
  });

  it('a choice not made does not show; a passed exam date is left out', () => {
    const l = profileLines({ name: 'Maya', certName: 'CISA', today: '2026-10-26' });
    expect(l.since).toBe('Studying for CISA');
    expect(l.plan).toBeNull();
    expect(l.started).toBeNull();
    expect(profileLines({ ...full, examDate: '2026-10-01' }).plan).toBe('About 20 min most days');
    expect(profileLines({ ...full, minutes: undefined }).plan).toBe('Exam 14 Feb');
    // The exam day itself still shows.
    expect(profileLines({ ...full, examDate: '2026-10-26' }).plan).toBe('Exam 26 Oct · about 20 min most days');
  });

  it('never a meter, a percent or a planned-versus-done line', () => {
    const all = JSON.stringify(profileLines(full));
    expect(all).not.toMatch(/%|complete|missing|left to|you planned|you said/i);
  });

  it('cleans the name again (a bad saved value never shows)', () => {
    expect(profileLines({ ...full, name: `  ${RLO}Maya   Jane ` }).title).toBe('Maya Jane');
    expect(profileLines({ ...full, name: 'me@example.com' }).title).toBe(PROFILE_TITLE);
    expect(profileLines({ ...full, name: 'x'.repeat(60) }).title).toBe('x'.repeat(24));
  });
});

describe('the name carried web → app: hostile input', () => {
  it('reads an ordinary name', () => {
    expect(readWebDisplayName({ displayName: 'Maya' })).toBe('Maya');
    expect(readWebDisplayName({ displayName: '  Mary   Jane ' })).toBe('Mary Jane');
  });

  it('markup is never a name', () => {
    for (const bad of ['<b>Maya</b>', '<script>alert(1)</script>', 'Maya<', '>Maya', '<img src=x onerror=alert(1)>']) {
      expect(readWebDisplayName({ displayName: bad })).toBeUndefined();
    }
  });

  it('over-long text is left out entirely (the website keeps 24 characters at most)', () => {
    expect(readWebDisplayName({ displayName: 'a'.repeat(WEB_NAME_MAX_UNITS + 1) })).toBeUndefined();
    expect(readWebDisplayName({ displayName: 'Maya '.repeat(100_000) })).toBeUndefined();
    // Up to the limit it is read, then cut to 24 by the app's one rule.
    expect(readWebDisplayName({ displayName: 'a'.repeat(40) })).toBe('a'.repeat(24));
  });

  it('a non-string is never a name', () => {
    for (const bad of [42, true, null, undefined, {}, ['Maya'], { toString: () => 'Maya' }]) {
      expect(readWebDisplayName({ displayName: bad })).toBeUndefined();
    }
    expect(readWebDisplayName(null)).toBeUndefined();
    expect(readWebDisplayName('Maya')).toBeUndefined();
    expect(readWebDisplayName(['Maya'])).toBeUndefined();
  });

  it('control characters are removed', () => {
    expect(readWebDisplayName({ displayName: `Ma${ch(0)}y${ch(7)}a${ch(0x1b)}` })).toBe('Maya');
    // A line break is a control character: removed, never a second line on Today.
    expect(readWebDisplayName({ displayName: `Maya${ch(0x0a)}${ch(0x0d)}Jane` })).toBe('MayaJane');
    expect(readWebDisplayName({ displayName: `${ch(0)}${ch(1)}${ch(2)}` })).toBeUndefined();
  });

  it('right-to-left and other direction overrides are removed, so text can’t be shown reversed', () => {
    expect(readWebDisplayName({ displayName: `${RLO}ayaM` })).toBe('ayaM');
    expect(readWebDisplayName({ displayName: `Ma${LRO}ya${RLI}` })).toBe('Maya');
    expect(readWebDisplayName({ displayName: `Ma${ZWJ}ya` })).toBe('Maya');
    // Text that only LOOKS like a link once reversed is shown as typed, never reversed.
    expect(readWebDisplayName({ displayName: `${RLO}moc.live` })).toBe('moc.live');
    // A link hidden behind a reversal is still a link: no name.
    expect(readWebDisplayName({ displayName: `evil${RLO}.com` })).toBeUndefined();
  });

  it('a web address or an email is never a name', () => {
    expect(readWebDisplayName({ displayName: 'maya@example.com' })).toBeUndefined();
    expect(readWebDisplayName({ displayName: 'www.example.com' })).toBeUndefined();
  });
});

describe('the name in the website file: add-only, never the profile label', () => {
  const questions = new Set(getAllQuestions('cisa').map((q) => q.id));
  const notes = new Set(noteSubtopics('cisa').map((n) => n.id));
  const domains = new Set((getCertification('cisa')?.domains ?? []).map((d) => d.id));
  const KNOWN: WebKnown = { question: (id) => questions.has(id), note: (id) => notes.has(id), domain: (id) => domains.has(id) };
  const NOW = fixture.profile.lastActive + 60_000;
  const CTX = { now: NOW, knownCertIds: ['cisa'] };
  const read = (f: unknown) => readWebExport(parseWebText(JSON.stringify(f)), KNOWN, NOW);
  const emptyPhone = (): BackupProgress =>
    fitForBackup({ settings: {}, progress: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } }).progress as BackupProgress;
  const summary = (f: unknown, phoneName?: string) => {
    const [p] = read(f);
    const phone = emptyPhone();
    return webAddSummary(phone, mergeWebProgress(phone, p, 'cisa', CTX), p, 'cisa', NOW, undefined, phoneName);
  };
  const named = (displayName: unknown) => ({ ...JSON.parse(JSON.stringify(fixture)), displayName });

  it('an older file (no name) reads exactly as before', () => {
    const [p] = read(fixture);
    expect(p.displayName).toBeUndefined();
    const s = summary(fixture);
    expect(s.displayName).toBeUndefined();
    expect(webAddLines(s).join(' ')).not.toContain('Your name');
  });

  it('the profile’s label is never used as the name', () => {
    const f = JSON.parse(JSON.stringify(fixture));
    f.profile.name = 'Maya';
    const [p] = read(f);
    expect(p.displayName).toBeUndefined();
    expect(summary(f).displayName).toBeUndefined();
  });

  it('a phone with no name gets the file’s, listed as "Your name: Maya"', () => {
    const s = summary(named('Maya'));
    expect(s.displayName).toBe('Maya');
    expect(s.displayNameKept).toBeUndefined();
    expect(webAddLines(s)).toContain('Your name: Maya');
    expect(WEB_NAME_NOTE).toBe('Your name stays on this phone only. If you already set one here, that one is kept.');
  });

  it('the phone’s own name wins: nothing is added, and the sheet says it stays', () => {
    const s = summary(named('Maya'), 'Mai');
    expect(s.displayName).toBeUndefined();
    expect(s.displayNameKept).toBe(true);
    expect(webAddLines(s).join(' ')).not.toContain('Your name');
    expect(webSkipLines(s)).toContain('This phone already has a name, so it stays as it is.');
    // The same name on both: nothing to say.
    const same = summary(named('Maya'), 'Maya');
    expect(same.displayName).toBeUndefined();
    expect(same.displayNameKept).toBeUndefined();
    // A bad saved name on the phone counts as none.
    expect(summary(named('Maya'), 'me@example.com').displayName).toBe('Maya');
  });

  it('a hostile name in the file is simply not offered (the rest still imports)', () => {
    for (const bad of ['<b>x</b>', 'a'.repeat(500), 42, `${ch(0)}`]) {
      const [p] = read(named(bad));
      expect(p.displayName).toBeUndefined();
      expect(Object.keys(p.cert.answers ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('several profiles in one file share the one top-level name', () => {
    const f = { cisaMindsetExport: true, version: 1, displayName: 'Maya', profiles: { a: fixture.profile, b: { ...fixture.profile, name: 'Work laptop' } } };
    const ps = read(f);
    expect(ps).toHaveLength(2);
    expect(ps.map((p) => p.displayName)).toEqual(['Maya', 'Maya']);
    expect(ps.map((p) => p.name)).not.toContain('Maya');
  });
});
