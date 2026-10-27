/**
 * Mobile 1.47, home-screen widgets: the beta tester cards and "Widget
 * numbers on this phone" (engine/widgetTester.ts).
 *
 * Testers only; their own clock from the first day a widget was seen; one
 * 14-day card and one removal card, ever; the email holds the questions and
 * the app version only (never a count, a name or progress).
 */
import { addDays } from '../engine/examDay';
import { countLine, firstWidgetDay, REMOVED_QUESTION, W14_QUESTIONS, widgetNumbers, widgetTesterCard, widgetTesterEmail, type WidgetCounters } from '../engine/widgetTester';

const FIRST = '2026-10-01';
function counters(over: Partial<WidgetCounters> = {}): WidgetCounters {
  return {
    opens: { plan: 9, think: 2 },
    started: { plan: 5 },
    completed: { plan: 4 },
    cleared: { plan: 3 },
    seen: { plan: { first: FIRST, last: '2026-10-20' }, think: { first: '2026-10-05', last: '2026-10-20' } },
    studyDays: ['2026-09-20', '2026-09-25', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-09'],
    widgetDays: ['2026-10-02', '2026-10-05'],
    ...over,
  };
}
const card = (over: Partial<Parameters<typeof widgetTesterCard>[0]> = {}) =>
  widgetTesterCard({ testerOn: true, counters: counters(), answered: [], today: addDays(FIRST, 14), ...over });

describe('widget tester cards', () => {
  it('the clock starts on the first day a widget was seen', () => {
    expect(firstWidgetDay(counters().seen)).toBe(FIRST);
    expect(firstWidgetDay({})).toBeNull();
  });

  it('day 14: the count line (on screen only) and the three questions', () => {
    const c = card()!;
    expect(c.id).toBe('w14');
    expect(c.questions).toEqual(W14_QUESTIONS);
    expect(c.countLine).toBe(countLine(counters(), FIRST));
    expect(c.countLine).toMatch(/studied on 4 of 14 days/);
    expect(card({ today: addDays(FIRST, 13) })).toBeNull();
  });

  it('testers only, once, and "Not today" hides it for the day', () => {
    expect(card({ testerOn: false })).toBeNull();
    expect(card({ answered: ['w14'] })).toBeNull();
    expect(card({ skipped: addDays(FIRST, 14) })).toBeNull();
    expect(card({ skipped: addDays(FIRST, 13) })?.id).toBe('w14');
  });

  it('a removed widget: one card asking why, once ever, before the 14-day card', () => {
    const gone = counters({ seen: { plan: { first: FIRST, last: '2026-10-08', gone: '2026-10-09' } } });
    const c = card({ counters: gone, today: '2026-10-10' })!;
    expect(c.id).toBe('wgone');
    expect(c.questions).toEqual([REMOVED_QUESTION]);
    expect(c.removed).toBe('Today’s plan');
    expect(card({ counters: gone, today: '2026-10-10', answered: ['wgone'] })).toBeNull();
  });

  it('the email: questions, a subject tag and the app version; never a count or progress', () => {
    const c = card()!;
    const e = widgetTesterEmail(c, { version: '1.47.0', os: 'android' });
    expect(e.subject).toBe('[KaiSip beta W14]');
    for (const q of W14_QUESTIONS) expect(e.body).toContain(q);
    expect(e.body).toContain('KaiSip 1.47.0');
    expect(e.body).not.toContain(c.countLine!);
    expect(e.body).not.toMatch(/studied on|\b14 days\b|opened KaiSip/);
    const gone = widgetTesterEmail({ id: 'wgone', caption: 'x', questions: [REMOVED_QUESTION], removed: 'This week' }, { version: '1.47.0', os: 'android' });
    expect(gone.subject).toBe('[KaiSip beta WX]');
  });
});

describe('widget numbers on this phone', () => {
  it('plain read-only lines per widget, study days before and after, and the self-checks', () => {
    const lines = widgetNumbers(counters(), { 'recommend-dont-implement': { had: 2, notYet: 1 } }, '2026-10-20');
    expect(lines[0]).toMatch(/^Today’s plan: on your home screen since 2026-10-01\. Opened 9 times; 5 sessions started, 4 finished; 3 days/);
    expect(lines.some((l) => /^Today’s rule:/.test(l))).toBe(true);
    expect(lines).toContain('Study days: 2 in the 28 days before your first widget, 4 since (up to 28 days).');
    expect(lines).toContain('Today’s rule: “Had it” 2 times, “Not yet” 1 times.');
  });

  it('nothing yet: one plain line', () => {
    expect(widgetNumbers({ opens: {}, started: {}, completed: {}, cleared: {}, seen: {}, studyDays: [], widgetDays: [] }, {}, '2026-10-20')).toEqual(['No widget numbers yet.']);
  });
});
