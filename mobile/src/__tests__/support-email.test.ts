/**
 * engine/support.ts — the emails "Report a problem", "Send feedback" and
 * "Contact support" write, and the on-phone "Your reports" matching.
 *
 * What must always hold (Uplift Phase 1 spec):
 * - letters are the bank's ORIGINAL letters, with the shown letter in
 *   brackets, so a shuffled "B" is never mistaken for the bank's "B";
 * - nothing about the learner is in the email (only item code, reason,
 *   app version, OS, review month and a random ref), and no question text;
 * - a note can't break out of the body, and the link stays under its cap;
 * - a fix only credits a report about the same item, made BEFORE it shipped.
 */
import { getAllQuestions } from '../content/loader';
import { DEFAULT_SUPPORT_EMAIL, supportEmailFrom } from '../lib/config';
import { osLabel, sessionWhere } from '../lib/support';
import {
  addReport,
  buildFeedbackEmail,
  buildReportEmail,
  buildSupportEmail,
  cleanNote,
  creditDue,
  distinctItems,
  EXAM_CONTENT_LINE,
  fitReport,
  fixesProblems,
  fixFor,
  fixMatches,
  itemRef,
  lastReportFor,
  mailtoUrl,
  MAX_MAILTO,
  MAX_NOTE,
  MAX_REPORTS,
  newRef,
  parseItemRef,
  parseVersion,
  REASONS,
  REF_RE,
  reportCounts,
  reportDetails,
  reportSubject,
  versionBefore,
  type Fix,
  type ReportEntry,
  type ReportInput,
  type ReportTarget,
} from '../engine/support';

const TO = 'certprep.support@gmail.com';
const app = { version: '1.7.0', os: 'iOS 26' };

const question = (over: Partial<ReportTarget> = {}): ReportTarget => ({
  kind: 'question',
  id: 'd4_217',
  name: 'IS Operations',
  where: 'Practice review · Quick 10',
  ...over,
});
const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  target: question(),
  reason: 'key',
  certName: 'CISA',
  app,
  contentReviewed: 'Oct 2026',
  ref: 'R-7K2Q',
  ...over,
});
const detailLines = (body: string) => body.split('\n-- Please keep the lines below. They tell us exactly what you saw. --\n')[1].split('\n\n')[0].split('\n');

describe('report email: letters are ORIGINAL letters, with the shown letter in brackets', () => {
  // Display slots A B C D show the bank's C A D B.
  const perm = ['C', 'A', 'D', 'B'] as const;

  it('names the pick and the suggested answer by the bank letter', () => {
    const { body } = buildReportEmail(input({ target: question({ perm: [...perm], pickedDisplay: 'B' }), suggestedDisplay: 'A' }));
    expect(body).toContain('Your pick: A (shown as B)'); // display B shows the bank's A
    expect(body).toContain('Suggested answer: C (shown as A)');
    expect(body).toContain('Shown order (screen = bank): A=C, B=A, C=D, D=B');
  });

  it('with no shuffle, still names the bank letter and leaves out the shown order', () => {
    const { body } = buildReportEmail(input({ target: question({ perm: ['A', 'B', 'C', 'D'], pickedDisplay: 'C' }) }));
    // Same letter on screen and in the bank: no bracket (UX review O4).
    expect(body).toContain('Your pick: C\n');
    expect(body).not.toContain('shown as');
    expect(body).not.toContain('Shown order');
  });

  it('works on a real shuffled question: the reported letter is the one the grader uses', () => {
    const q = getAllQuestions('cisa').find((x) => x.options.D)!;
    const shuffled = ['D', 'C', 'B', 'A'] as const;
    // The learner taps the slot that shows the correct option.
    const shownCorrect = 'ABCD'[shuffled.indexOf(q.correct)] as 'A';
    const { body } = buildReportEmail(input({ target: question({ id: q.id, perm: [...shuffled], pickedDisplay: shownCorrect }) }));
    expect(body).toContain(`Your pick: ${q.correct} (shown as ${shownCorrect})`);
  });

  it('a suggested answer is only sent when letters were on screen', () => {
    const { body } = buildReportEmail(input({ target: question(), suggestedDisplay: 'B' }));
    expect(body).not.toContain('Suggested answer');
  });

  it('the mistake journal (no letters on screen) sends the original pick alone', () => {
    const { body } = buildReportEmail(input({ target: question({ pickedOriginal: 'D', where: 'Mistake journal' }) }));
    expect(body).toContain('Your pick: D\n');
  });
});

describe('report email: only what we need, nothing about the learner', () => {
  const ALLOWED = /^(Item|Part|Reason|Your pick|Suggested answer|Shown order \(screen = bank\)|Where|Certification|App|Display|Content reviewed|Ref): /;

  it('every detail line is one of the known, non-personal lines', () => {
    const { body } = buildReportEmail(
      input({ target: question({ perm: ['B', 'A', 'C', 'D'], pickedDisplay: 'A' }), suggestedDisplay: 'B', parts: ['key', 'tips'] }),
    );
    for (const line of detailLines(body)) expect(line).toMatch(ALLOWED);
  });

  it('carries no question text, options or explanation', () => {
    const q = getAllQuestions('cisa')[0];
    const { subject, body } = buildReportEmail(input({ target: question({ id: q.id }) }));
    for (const text of [q.stem, q.explanation, ...Object.values(q.options)]) {
      expect(body).not.toContain(text!.slice(0, 40));
      expect(subject).not.toContain(text!.slice(0, 40));
    }
  });

  it('never mentions profile fields (exam date, name, scores, streak, device, locale)', () => {
    const { subject, body } = buildReportEmail(input({ note: '' }));
    for (const word of ['exam date', 'name:', 'score', 'streak', 'readiness', 'device', 'locale', 'progress']) {
      expect(`${subject}\n${body}`.toLowerCase()).not.toContain(word);
    }
  });

  it('greets, then the learner’s space, then the kept block, then the exam-content line', () => {
    const { body } = buildReportEmail(input({ note: 'B fits the stem better.' }));
    const lines = body.split('\n');
    expect(lines[0]).toBe('Hi Aurivan team,');
    expect(lines[2]).toBe('B fits the stem better.');
    expect(body.trimEnd().endsWith(EXAM_CONTENT_LINE)).toBe(true);
  });

  it('with no note, asks a gentle question instead', () => {
    expect(buildReportEmail(input()).body.split('\n')[2]).toBe('What looks wrong? Anything you add helps us fix it faster.');
  });

  it('subject is parseable for mail filters', () => {
    expect(reportSubject(input())).toBe('Aurivan · Report · CISA · d4_217 · key');
    expect(reportSubject(input({ target: { kind: 'note', id: '4A2.3', where: 'Study note' }, reason: 'diagram' }))).toBe(
      'Aurivan · Report · CISA · note:4A2.3 · diagram',
    );
  });

  it('display details appear only when given (the learner ticked the box)', () => {
    const target: ReportTarget = { kind: 'app', id: 'settings', name: 'Settings', where: 'Settings' };
    expect(buildReportEmail(input({ target, reason: 'display' })).body).not.toContain('Display:');
    const withIt = buildReportEmail(input({ target, reason: 'display', display: { theme: 'dark', textScale: 1.3, reduceMotion: true } }));
    expect(withIt.body).toContain('Display: Theme dark · Text size 130% · Reduce Motion on');
    // The review month belongs to questions only.
    expect(withIt.body).not.toContain('Content reviewed');
  });

  it('names every kind of item plainly', () => {
    const lines = (t: ReportTarget, reason: string) => reportDetails(input({ target: t, reason }))[0];
    expect(lines(question(), 'key')).toBe('Item: Question d4_217 (IS Operations)');
    expect(lines({ kind: 'note', id: '4A2.3', name: 'Business Continuity Plan', where: 'Study note' }, 'unclear')).toBe(
      'Item: Note 4A2.3 (Business Continuity Plan)',
    );
    expect(lines({ kind: 'lesson', id: 'cisa-l-d1-charter', name: 'The audit charter', step: 3, steps: 7, where: 'Lesson' }, 'order')).toBe(
      'Item: Lesson cisa-l-d1-charter, step 3 of 7 (The audit charter)',
    );
    expect(lines({ kind: 'card', id: 'rumor:4B1.2:k1x9', name: 'Root or Rumor', where: 'Game recap' }, 'key')).toBe(
      'Item: Game card rumor:4B1.2:k1x9 (Root or Rumor)',
    );
  });

  it('every reason has a short code and words', () => {
    for (const list of Object.values(REASONS)) {
      expect(list.length).toBeGreaterThan(2);
      for (const r of list) {
        expect(r.code).toMatch(/^[a-z-]{2,20}$/);
        expect(r.label.length).toBeLessThan(50);
      }
      expect(list[list.length - 1].code).toBe('other');
    }
  });
});

describe('notes and the mailto: link', () => {
  it('cleans a note: line ends, control characters, spaces, length', () => {
    expect(cleanNote('  a\r\nb\u0007c\u0000  ')).toBe('a\nbc');
    expect(cleanNote('x'.repeat(MAX_NOTE + 50))).toHaveLength(MAX_NOTE);
    // Cuts by character, never through an emoji.
    expect(Array.from(cleanNote('🌱'.repeat(MAX_NOTE + 1)))).toHaveLength(MAX_NOTE);
  });

  it('drops a lone half of an emoji (a broken paste), so building the link never throws', () => {
    const broken = `before \uD83C after \uDF31 end 🌱`;
    expect(cleanNote(broken)).toBe('before  after  end 🌱');
    // Before the fix this threw "URIError: URI malformed" and left the send button stuck.
    expect(() => fitReport(TO, input({ note: broken }))).not.toThrow();
  });

  it('a note can never add an email header: everything is encoded into the body', () => {
    const { url } = fitReport(TO, input({ note: 'x\r\nBcc: someone@example.com\n&subject=hi' }));
    expect(url.startsWith(`mailto:${TO}?subject=`)).toBe(true);
    expect(url).not.toMatch(/[\r\n]/);
    // Only our two parameters exist.
    expect(url.split('?')[1].split('&').map((p) => p.split('=')[0])).toEqual(['subject', 'body']);
    expect(decodeURIComponent(url.split('&body=')[1])).toContain('Bcc: someone@example.com');
  });

  it('a typical report stays well under the cap; a full ASCII note still fits whole', () => {
    expect(fitReport(TO, input()).url.length).toBeLessThan(2000);
    const full = fitReport(TO, input({ note: 'word '.repeat(MAX_NOTE / 5) }));
    expect(full.url.length).toBeLessThanOrEqual(MAX_MAILTO);
    expect(full.shortened).toBe(false);
  });

  it('a note too long once encoded (emoji, non-Latin text) is shortened with “…” to fit', () => {
    const { url, email, shortened } = fitReport(TO, input({ note: '🌱 '.repeat(MAX_NOTE / 2) }));
    expect(shortened).toBe(true);
    expect(url.length).toBeLessThanOrEqual(MAX_MAILTO);
    expect(email.body.split('\n')[2].endsWith('…')).toBe(true);
    // The details block is never cut.
    expect(email.body).toContain('Ref: R-7K2Q');
  });

  it('builds a plain mailto: link, with CRLF line ends in the body (RFC 6068)', () => {
    expect(mailtoUrl(TO, { subject: 'A b', body: 'c\nd' })).toBe(`mailto:${TO}?subject=A%20b&body=c%0D%0Ad`);
  });
});

describe('feedback and support emails', () => {
  it('feedback: kind tag in the subject, optional display line, the exam-content line', () => {
    const e = buildFeedbackEmail({ kind: 'idea', message: 'More mocks', certName: 'CISA', app: { version: '1.7.0', os: 'Android 16' }, from: 'Help' });
    expect(e.subject).toBe('Aurivan · Feedback · Idea · CISA');
    expect(e.body).toContain('More mocks');
    expect(e.body).toContain('Kind: An idea');
    expect(e.body).toContain('App: Aurivan 1.7.0 (Android 16)');
    expect(e.body).toContain('From: Help');
    expect(e.body).not.toContain('Display:');
    expect(e.body).toContain(EXAM_CONTENT_LINE);
  });

  it('support: topic tag in the subject; never asks for a backup file', () => {
    const e = buildSupportEmail({ topic: 'backup', certName: 'CISA', app });
    expect(e.subject).toBe('Aurivan · Support · Backup · CISA');
    expect(e.body).toContain('Topic: Backup, restore or a new phone');
    expect(e.body.toLowerCase()).not.toContain('attach');
  });
});

describe('references', () => {
  it('a report ref is "R-" and 4 easy-to-read characters', () => {
    let seed = 0;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 200; i++) expect(newRef(rand)).toMatch(REF_RE);
    expect(newRef(() => 0.9999999)).toMatch(REF_RE);
    expect('R-0OIL').not.toMatch(REF_RE);
  });

  it('item refs read back the same', () => {
    const targets: ReportTarget[] = [
      question(),
      { kind: 'note', id: '4A2.3', where: '' },
      { kind: 'lesson', id: 'cisa-l-d1-charter', step: 3, where: '' },
      { kind: 'card', id: 'rumor:4B1.2:k1x9', where: '' },
      { kind: 'app', id: 'settings', where: '' },
    ];
    for (const t of targets) {
      const ref = itemRef(t);
      const back = parseItemRef(ref)!;
      expect(itemRef({ ...back })).toBe(ref);
    }
    expect(itemRef(question())).toBe('q:d4_217');
    expect(parseItemRef('nope')).toBeNull();
    expect(parseItemRef('toString:x')).toBeNull();
    expect(parseItemRef('lesson:x#0')).toEqual({ kind: 'lesson', id: 'x' });
  });
});

describe('Your reports and fixes', () => {
  const day = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
  const report = (over: Partial<ReportEntry> = {}): ReportEntry => ({ ref: 'R-AAAA', item: 'q:d4_217', reason: 'key', at: day('2026-10-11'), cert: 'cisa', ...over });
  const fix = (over: Partial<Fix> = {}): Fix => ({ ref: 'q:d4_217', cert: 'cisa', date: '2026-10-20', kind: 'corrected', publicNote: 'The answer key was corrected.', ...over });
  // The same, as the team now records them: the version the fix ships in.
  const vfix = (over: Partial<Fix> = {}): Fix => fix({ fixedIn: '1.7.1', ...over });

  it('keeps the newest first and caps the list', () => {
    let list: ReportEntry[] = [];
    for (let i = 0; i < MAX_REPORTS + 5; i++) list = addReport(list, report({ ref: `R-${'ABCD'[i % 4]}AAA`, at: i }));
    expect(list).toHaveLength(MAX_REPORTS);
    expect(list[0].at).toBe(MAX_REPORTS + 4);
    expect(lastReportFor(list, 'cisa', 'q:d4_217')!.at).toBe(MAX_REPORTS + 4);
    expect(lastReportFor(list, 'cism', 'q:d4_217')).toBeUndefined();
  });

  it('a fix credits a report about the same item, made on an EARLIER day, for the same exam', () => {
    expect(fixMatches(fix(), report())).toBe(true);
    expect(fixMatches(fix({ date: '2026-10-11' }), report())).toBe(false); // same day: can't say "after your report"
    expect(fixMatches(fix({ date: '2026-10-01' }), report())).toBe(false);
    expect(fixMatches(fix({ ref: 'q:d4_218' }), report())).toBe(false);
    expect(fixMatches(fix({ cert: 'cism' }), report())).toBe(false);
  });

  it('with versions on both sides, a fix credits a report made on an OLDER version, whatever the day', () => {
    // Reported on 1.7.0; the fix ships in 1.7.1.
    expect(fixMatches(vfix(), report({ version: '1.7.0' }))).toBe(true);
    // The ship day itself still counts (the date rule said no).
    expect(fixMatches(vfix({ date: '2026-10-11' }), report({ version: '1.7.0' }))).toBe(true);
    // Reported on an old build AFTER the fix shipped (not updated yet): the problem was real there.
    expect(fixMatches(vfix({ date: '2026-10-01' }), report({ version: '1.7.0' }))).toBe(true);
    // Reported on the fixed version or a newer one: not credited.
    expect(fixMatches(vfix(), report({ version: '1.7.1' }))).toBe(false);
    expect(fixMatches(vfix(), report({ version: '1.8.0' }))).toBe(false);
    // Numbers, not text: 1.10.0 is newer than 1.9.0.
    expect(fixMatches(vfix({ fixedIn: '1.10.0' }), report({ version: '1.9.0' }))).toBe(true);
    // Item and exam still have to match.
    expect(fixMatches(vfix({ ref: 'q:d4_218' }), report({ version: '1.7.0' }))).toBe(false);
    expect(fixMatches(vfix({ cert: 'cism' }), report({ version: '1.7.0' }))).toBe(false);
  });

  it('falls back to the day when either side has no version', () => {
    // A report with no version (unknown on that phone): the date rule.
    expect(fixMatches(vfix({ date: '2026-10-20' }), report())).toBe(true);
    expect(fixMatches(vfix({ date: '2026-10-11' }), report())).toBe(false);
    // A fix with no version: the date rule too.
    expect(fixMatches(fix({ date: '2026-10-11' }), report({ version: '1.7.0' }))).toBe(false);
    expect(fixMatches(fix({ date: '2026-10-20' }), report({ version: '1.7.0' }))).toBe(true);
    // A version that isn't one ("unknown") counts as none.
    expect(fixMatches(vfix({ date: '2026-10-11' }), report({ version: 'unknown' }))).toBe(false);
  });

  it('reads versions as numbers', () => {
    expect(parseVersion('1.7.0')).toEqual([1, 7, 0]);
    expect(parseVersion('1.7')).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
    expect(versionBefore([1, 9, 0], [1, 10, 0])).toBe(true);
    expect(versionBefore([1, 7, 1], [1, 7, 1])).toBe(false);
  });

  it('counts distinct items, so two reports about one question are one thing', () => {
    const list = [report(), report({ ref: 'R-BBBB' }), report({ ref: 'R-CCCC', item: 'note:4A2.3' })];
    expect(distinctItems(list)).toBe(2);
    expect(distinctItems(list.slice(0, 2))).toBe(1);
  });

  it('a lesson fix without a step covers every step; with a step, only that one', () => {
    const r = report({ item: 'lesson:cisa-l-d1-charter#3' });
    expect(fixMatches(fix({ ref: 'lesson:cisa-l-d1-charter' }), r)).toBe(true);
    expect(fixMatches(fix({ ref: 'lesson:cisa-l-d1-charter#3' }), r)).toBe(true);
    expect(fixMatches(fix({ ref: 'lesson:cisa-l-d1-charter#4' }), r)).toBe(false);
    expect(fixMatches(fix({ ref: 'lesson:cisa-l-d1' }), r)).toBe(false);
  });

  it('picks the newest fix, owes credit once, and counts', () => {
    const fixes = [fix({ date: '2026-10-20' }), fix({ date: '2026-11-02', kind: 'clarified', publicNote: 'The explanation is clearer now.' })];
    expect(fixFor(report(), fixes)!.date).toBe('2026-11-02');
    const list = [report(), report({ ref: 'R-BBBB', item: 'note:4A2.3' }), report({ ref: 'R-CCCC', creditSeen: true })];
    expect(creditDue(list, fixes).map((r) => r.ref)).toEqual(['R-AAAA']);
    expect(reportCounts(list, fixes)).toEqual({ started: 3, updated: 2 });
    expect(creditDue(undefined, fixes)).toEqual([]);
  });

  it('flags fixes that break the What’s New style', () => {
    expect(fixesProblems([vfix()], ['cisa'])).toEqual([]);
    // Every new fix names the version it ships in.
    expect(fixesProblems([fix()], ['cisa'])).toEqual(['fixes[0].fixedIn is not an app version like 1.7.1']);
    const bad = fixesProblems(
      [
        vfix({ ref: 'd4_217' }),
        vfix({ cert: 'zzz' }),
        vfix({ date: '20 Oct' }),
        vfix({ fixedIn: 'v1.7' }),
        vfix({ kind: 'fixed' as never }),
        vfix({ publicNote: 'Question d4_217 was corrected.' }),
        vfix({ publicNote: 'We corrected 12 questions in this area.' }),
        vfix({ publicNote: 'The answer key was corrected' }),
      ],
      ['cisa'],
    );
    expect(bad).toHaveLength(8);
  });
});

describe('configuration and the phone', () => {
  it('the support address is built in: an empty or broken value never turns reporting off', () => {
    expect(DEFAULT_SUPPORT_EMAIL).toBe('certprep.support@gmail.com');
    expect(supportEmailFrom(undefined)).toBe(DEFAULT_SUPPORT_EMAIL);
    expect(supportEmailFrom('')).toBe(DEFAULT_SUPPORT_EMAIL);
    expect(supportEmailFrom('not an address')).toBe(DEFAULT_SUPPORT_EMAIL);
    expect(supportEmailFrom(' team@example.org ')).toBe('team@example.org');
  });

  it('says where a session question was reported, without saying anything twice', () => {
    expect(sessionWhere('Practice', 'Quick 10')).toBe('Practice · Quick 10');
    expect(sessionWhere('Practice', 'Practice · IS Audit')).toBe('Practice · IS Audit');
    expect(sessionWhere('Spaced review', 'Review')).toBe('Spaced review');
    expect(sessionWhere('Mock review', 'Mini mock')).toBe('Mock review · Mini mock');
    expect(sessionWhere('Practice review', '')).toBe('Practice review');
  });

  it('names the OS by its major version only', () => {
    expect(osLabel('ios', '26.0.1')).toBe('iOS 26');
    expect(osLabel('android', 36, '16')).toBe('Android 16');
    expect(osLabel('android', 36, '')).toBe('Android API 36');
    expect(osLabel('web', '')).toBe('Web');
  });
});
