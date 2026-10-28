/**
 * QA (mobile 1.48 widget redesign): bugs found in the Recall card, the Key
 * term and the reveal store. Each test was written as the behaviour we want
 * and marked `it.failing` until its fix landed (the widgets-task-qa pattern).
 * All five are fixed before 1.48 shipped; the "b"/"c" tests pin the fixes' edges.
 *
 * 1. Recall card: "Had it" / "Not yet" swaps TODAY's card for a different
 *    question on the app's next snapshot write, and the widget then draws that
 *    new card already revealed (the widget's reveal mark is per widget, not per card).
 * 2. Recall card: "Not yet" does not bring the question back after 3 days: the
 *    7-day "picked recently" rule excludes it until day 7.
 * 3. Reveal store: only the FIRST 64 recall self-checks survive a read, so from
 *    the 65th card on, every "Had it" / "Not yet" is silently lost.
 * 4. Key term: the term written ahead for today (yesterday's write) is not the
 *    term today's write picks, and today's equals yesterday's (a repeat, then a mid-day swap).
 * 5. Key term pack: Recovery point objective / RTO / MTD open the Domain 4
 *    overview instead of the note named for them (4B1.2).
 */
import { getAllQuestions } from '../content/loader';
import { termsFor } from '../content/terms';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { cardRevealed, judgedToday, readReveal, revealCardFor, SELF_CHECK_DAYS, withReveal, withSelfCheck, type SelfCheck, type WidgetSnapshot } from '../engine/widgets';
import { recallDays, recallFit, termDays } from '../lib/widgetData';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const NOW = new Date(2026, 9, 29, 9, 0).getTime();
const TODAY = dayKey(NOW);
const DAY = 86_400_000;

/** Twelve real bank questions that fit a Recall card, all answered right 20+ days ago. */
function eligible(n = 12) {
  const qs = getAllQuestions('cisa').filter(recallFit).slice(0, n);
  const answers: Record<string, { lastCorrect: boolean; lastAt: number }> = {};
  qs.forEach((q, i) => (answers[q.id] = { lastCorrect: true, lastAt: NOW - (20 + i) * DAY }));
  return { ids: qs.map((q) => q.id), answers };
}

describe('Recall card (1.48 QA)', () => {
  it('BUG 1: a self-check today keeps today’s card (no new, already-revealed card on the next app write)', () => {
    const { answers } = eligible();
    // The app's write this morning picked today's card.
    const first = recallDays('cisa', TODAY, {}, answers);
    const card = first.recall[0];
    expect(card.day).toBe(TODAY);
    // The learner reveals it on the widget and taps "Had it".
    const self: Record<string, SelfCheck> = { [card.id]: { had: 1, notYet: 0, last: 'had', on: TODAY } };
    // Later today the app opens (or a session ends) and writes the snapshot again.
    const again = recallDays('cisa', TODAY, first.picks, answers, self);
    // Today's card must still be the one the learner just checked ("A new card tomorrow").
    expect(again.recall[0]).toMatchObject({ day: TODAY, id: card.id });
  });

  it('BUG 1b: the same after "Not yet"', () => {
    const { answers } = eligible();
    const first = recallDays('cisa', TODAY, {}, answers);
    const card = first.recall[0];
    const self: Record<string, SelfCheck> = { [card.id]: { had: 0, notYet: 1, last: 'notyet', on: TODAY } };
    expect(recallDays('cisa', TODAY, first.picks, answers, self).recall[0]).toMatchObject({ day: TODAY, id: card.id });
  });

  it('BUG 2: "Not yet" brings the card back 3 days later, even though it was picked 3 days ago', () => {
    const { ids, answers } = eligible();
    const x = ids[7];
    const shownOn = addDays(TODAY, -3);
    // The card was today's card 3 days ago (the picks store remembers it), and the learner said "Not yet".
    const picks = { [shownOn]: x };
    const self: Record<string, SelfCheck> = { [x]: { had: 0, notYet: 1, last: 'notyet', on: shownOn } };
    expect(recallDays('cisa', TODAY, picks, answers, self).recall[0].id).toBe(x);
  });

  it('BUG 1c: a reveal belongs to its card: a widget whose card changed draws it hidden', () => {
    const snapWith = (id: string) => ({ recall: [{ day: TODAY, id }], terms: [], think: [] }) as unknown as WidgetSnapshot;
    let r = readReveal(null, TODAY);
    r = withReveal(r, 5, null, NOW, revealCardFor('question', snapWith('d4_070'), NOW));
    expect(cardRevealed(r, 5, 'd4_070')).toBe(true);
    // The widget's card is now another question: it starts hidden.
    expect(cardRevealed(r, 5, revealCardFor('question', snapWith('d4_071'), NOW))).toBe(false);
    // Revealing the new card works, and is saved and read back today only.
    r = withReveal(r, 5, null, NOW + 5000, 'd4_071');
    expect(cardRevealed(readReveal(JSON.stringify(r), TODAY), 5, 'd4_071')).toBe(true);
    expect(readReveal(JSON.stringify(r), addDays(TODAY, 1)).cards).toEqual({});
    // Marks saved by 1.47 name no card: they stay revealed, as before.
    const old = readReveal(JSON.stringify({ day: TODAY, ids: [5], counts: {}, self: {} }), TODAY);
    expect(cardRevealed(old, 5, 'd4_071')).toBe(true);
  });

  it('BUG 2b: "Not yet" today keeps today’s card, then takes day 3 from its pre-pick; never two days with one card', () => {
    const { answers } = eligible();
    const first = recallDays('cisa', TODAY, {}, answers);
    const card = first.recall[0].id;
    const self: Record<string, SelfCheck> = { [card]: { had: 0, notYet: 1, last: 'notyet', on: TODAY } };
    const again = recallDays('cisa', TODAY, first.picks, answers, self);
    expect(again.recall[0].id).toBe(card);
    expect(again.recall.find((r) => r.day === addDays(TODAY, 3))?.id).toBe(card);
    // Days 1 and 2 keep their picks (the card rests), and no other card shows twice.
    expect(again.recall.slice(1, 3).map((r) => r.id)).toEqual(first.recall.slice(1, 3).map((r) => r.id));
    expect(new Set(again.recall.slice(0, 3).map((r) => r.id)).size).toBe(3);
  });

  it('BUG 3: the 65th recall self-check survives the next read of aurivan.widget.reveal.v1', () => {
    let r = readReveal(null, TODAY);
    // 64 earlier cards, one a day (about two months of daily use).
    const recall: Record<string, SelfCheck> = {};
    for (let i = 0; i < 64; i++) recall[`d4_${String(100 + i)}`] = { had: 1, notYet: 0, last: 'had', on: addDays(TODAY, -70 + i) };
    r = { ...r, recall };
    r = withSelfCheck(r, 'd5_010', 'had', 'recall');
    expect(judgedToday(r, 'd5_010', 'recall')).toBe('had');
    // The widget task saves it as JSON; the next tap (or the app) reads it back.
    const back = readReveal(JSON.stringify(r), TODAY);
    expect(judgedToday(back, 'd5_010', 'recall')).toBe('had');
  });
  it('BUG 3b: self-checks older than the longest rest drop off; a 1.47 save still loads', () => {
    const old = addDays(TODAY, -(SELF_CHECK_DAYS + 1));
    const r = readReveal(JSON.stringify({ day: TODAY, ids: [], counts: {}, self: {}, recall: { d4_001: { had: 1, notYet: 0, last: 'had', on: old }, d4_002: { had: 1, notYet: 0, last: 'had', on: addDays(TODAY, -40) } } }), TODAY);
    expect(Object.keys(r.recall ?? {})).toEqual(['d4_002']);
    // A 1.47 save: no recall, no cards.
    const v147 = readReveal(JSON.stringify({ day: TODAY, ids: [3], counts: { 'recommend-dont-implement': 2 }, self: { 'recommend-dont-implement': { had: 1, notYet: 0, last: 'had', on: TODAY } }, at: { '3': NOW } }), TODAY);
    expect(v147).toMatchObject({ ids: [3], counts: { 'recommend-dont-implement': 2 }, recall: {}, cards: {} });
    expect(judgedToday(v147, 'recommend-dont-implement')).toBe('had');
  });
});

describe('Key term (1.48 QA)', () => {
  it('BUG 4b: a kept term stays all day even if the plan topic changes, and the next day never repeats it', () => {
    const today = '2026-02-20';
    const kept = termDays('cisa', today, '1')[0];
    // Later today the plan's topic is another one: the kept term stays.
    expect(termDays('cisa', today, '2', { [today]: kept.id })[0].id).toBe(kept.id);
    // With yesterday's term kept, today never shows it again (60 days, both with the same topic and another).
    for (let d = 0; d < 60; d++) {
      const day = addDays(today, d);
      const y = termDays('cisa', addDays(day, -1), '1')[0];
      for (const dom of ['1', '4']) expect(termDays('cisa', day, dom, { [addDays(day, -1)]: y.id })[0].term).not.toBe(y.term);
    }
  });

  it('BUG 4: the term written ahead for today is the term today’s write picks (same topic), and never yesterday’s', () => {
    // 2026-02-20, Domain 1: one of 11 day/topic pairs in 2026 where this breaks.
    const today = '2026-02-20';
    const yesterday = addDays(today, -1);
    const aheadForToday = termDays('cisa', yesterday, '1')[1];
    const pickedToday = termDays('cisa', today, '1')[0];
    expect(pickedToday.id).toBe(aheadForToday.id);
    expect(pickedToday.id).not.toBe(termDays('cisa', yesterday, '1')[0].id);
  });

  it('BUG 5: Recovery point objective (RPO) opens the note named for it, not the Domain 4 overview', () => {
    const rpo = termsFor('cisa', '4').find((t) => t.short === 'RPO');
    expect(rpo?.note).toBe('4B1.2');
  });
});
