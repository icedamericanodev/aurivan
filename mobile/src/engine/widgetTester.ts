/**
 * The widget tester cards and "Widget numbers on this phone" (mobile 1.47,
 * behavior.md §7.2). Pure TypeScript: no React, no storage, no network.
 *
 * Plain English for the founder:
 * - Both show ONLY to learners who turned on "I'm a beta tester" in Help.
 * - Their own clock starts on the first day a KaiSip widget was seen on the
 *   home screen (not the day the tester switch went on).
 * - Day 14 after that: one card with a count line (on screen only, never in
 *   the email) and three questions. Once a widget counts as removed (missing
 *   on 2 app opens in a row): one card, once ever, asking why.
 * - Answering opens the tester's own email app, with the questions filled in
 *   and a subject tag ("[KaiSip beta W14]", "[KaiSip beta WX]"). Nothing is
 *   sent automatically, and the numbers never go into the email.
 */
import { addDays } from './examDay';
import { daysBetween } from './streak';
import type { Email } from './support';
import { WIDGET_KINDS, WIDGET_TITLES, type WidgetKind } from './widgets';

export interface SeenLike {
  first: string;
  last?: string;
  gone?: string;
}

export interface WidgetCounters {
  opens: Partial<Record<WidgetKind, number>>;
  started: Partial<Record<WidgetKind, number>>;
  completed: Partial<Record<WidgetKind, number>>;
  cleared: Partial<Record<WidgetKind, number>>;
  seen: Partial<Record<WidgetKind, SeenLike>>;
  studyDays: readonly string[];
  widgetDays: readonly string[];
}

/** The card's own clock: the first day any widget was seen placed. */
export function firstWidgetDay(seen: WidgetCounters['seen']): string | null {
  const firsts = WIDGET_KINDS.map((k) => seen[k]?.first).filter((d): d is string => typeof d === 'string');
  return firsts.length ? firsts.sort()[0] : null;
}

export const W14_DAYS = 14;

export interface WidgetTesterCard {
  id: 'w14' | 'wgone';
  caption: string;
  /** The questions, one per line on screen and in the email. */
  questions: string[];
  /** On screen only: never in the email. */
  countLine?: string;
  /** The removal card names what was removed. */
  removed?: string;
}

/** "Since you added a KaiSip widget, you studied on 9 of 14 days and opened KaiSip from a widget on 6 of them." */
export function countLine(c: WidgetCounters, from: string): string {
  const window = Array.from({ length: W14_DAYS }, (_, i) => addDays(from, i));
  const studied = window.filter((d) => c.studyDays.includes(d)).length;
  const opened = window.filter((d) => c.widgetDays.includes(d)).length;
  return `Since you added a KaiSip widget, you studied on ${studied} of ${W14_DAYS} days, and opened KaiSip from a widget on ${opened} days (counted on this phone only).`;
}

export const W14_QUESTIONS = [
  'Did a widget ever get you to start a session you wouldn’t have otherwise? (Often, sometimes or never)',
  'Did a widget ever make you feel behind, worried or guilty? Which one, and what did it say?',
  'Did anyone see something on a widget you’d rather they hadn’t? What was it?',
];
export const REMOVED_QUESTION = 'You removed a KaiSip widget. What made you remove it? Got used to it, felt like pressure, wrong information, screen space, or something else?';

/** Today's widget tester card, or null. */
export function widgetTesterCard(i: { testerOn: boolean; counters: WidgetCounters; answered: readonly string[]; skipped?: string; today: string }): WidgetTesterCard | null {
  if (!i.testerOn || i.skipped === i.today) return null;
  const gone = WIDGET_KINDS.find((k) => i.counters.seen[k]?.gone);
  if (gone && !i.answered.includes('wgone')) {
    return { id: 'wgone', caption: 'Tester question', questions: [REMOVED_QUESTION], removed: WIDGET_TITLES[gone] };
  }
  const first = firstWidgetDay(i.counters.seen);
  if (!first || i.answered.includes('w14') || daysBetween(first, i.today) < W14_DAYS) return null;
  return { id: 'w14', caption: 'Widgets: two-week check-in', questions: W14_QUESTIONS, countLine: countLine(i.counters, first) };
}

/** The email the card opens: the questions and the app version. Never a count, a name or progress. */
export function widgetTesterEmail(card: WidgetTesterCard, app: { version: string; os: string }): Email {
  const tag = card.id === 'w14' ? 'W14' : 'WX';
  return {
    subject: `[KaiSip beta ${tag}]`,
    body: ['Hi KaiSip team,', '', ...card.questions.map((q, n) => `${n + 1}. ${q}\n`), 'My answers:', '', '', '', `App: KaiSip ${app.version} (${app.os})`].join('\n'),
  };
}

/** "Widget numbers on this phone": plain read-only lines, for the tester's own eyes. */
export function widgetNumbers(c: WidgetCounters, self: Record<string, { had: number; notYet: number }>, today: string): string[] {
  const lines: string[] = [];
  for (const k of WIDGET_KINDS) {
    const seen = c.seen[k];
    const opens = c.opens[k] ?? 0;
    if (!seen && !opens) continue;
    const where = seen ? (seen.gone ? `removed (seen ${seen.first} to ${seen.last ?? seen.first})` : `on your home screen since ${seen.first}`) : 'not seen on your home screen';
    lines.push(`${WIDGET_TITLES[k]}: ${where}. Opened ${opens} times; ${c.started[k] ?? 0} sessions started, ${c.completed[k] ?? 0} finished; ${c.cleared[k] ?? 0} days it started a cleared plan.`);
  }
  const first = firstWidgetDay(c.seen);
  if (first) {
    const before = Array.from({ length: 28 }, (_, i) => addDays(first, -28 + i)).filter((d) => c.studyDays.includes(d)).length;
    const after = Array.from({ length: 28 }, (_, i) => addDays(first, i)).filter((d) => d <= today && c.studyDays.includes(d)).length;
    lines.push(`Study days: ${before} in the 28 days before your first widget, ${after} since (up to 28 days).`);
  }
  const had = Object.values(self).reduce((n, e) => n + e.had, 0);
  const notYet = Object.values(self).reduce((n, e) => n + e.notYet, 0);
  if (had + notYet > 0) lines.push(`Today’s rule: “Had it” ${had} times, “Not yet” ${notYet} times.`);
  return lines.length ? lines : ['No widget numbers yet.'];
}
