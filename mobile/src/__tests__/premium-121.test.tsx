/**
 * Mobile 1.21 premium pass: the small pure helpers behind Today's panel and
 * the L2 card lift.
 * - planHero: the panel's title never holds a count; counts and minutes go
 *   to the meta, and the minutes are said once.
 * - heroPracticeTitle: a practice label without its count.
 * - todayMinutes: the day's minutes for the caption, mocks left out.
 * - cardLiftFor: boxShadow everywhere except Android 7–8 (API < 28).
 * - scrollTarget: a jump to a group never lands past the end of the page.
 */
import { cardLiftFor, scrollTarget } from '../components/ui';
import { heroPracticeTitle, planHero, todayMinutes } from '../components/journey';
import { itemMinutes } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { cardShadow } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

describe('heroPracticeTitle: the count leaves the title', () => {
  it.each([
    ['12 questions · IS Audit', 'Practice: IS Audit'],
    ['12 mixed questions', 'Mixed practice'],
    // A plan saved before 1.24 still says "Starting check": nobody reads that word any more.
    ['Starting check: 20 mixed questions', 'Mixed practice'],
    ['Your first five', 'Your first five'],
    ['Top-up: 10 mixed questions', 'Top-up'],
    ['Top-up: IS Operations', 'Top-up: IS Operations'],
    ['Light review · 8 questions', 'Light review'],
    ['Optional warm-up · 5 questions', 'Optional warm-up'],
    ['Weak spots: IS Operations', 'Weak spots: IS Operations'],
  ])('%s → %s', (label, title) => {
    expect(heroPracticeTitle(label)).toBe(title);
    expect(heroPracticeTitle(label)).not.toMatch(/\d+ (mixed )?questions?/);
  });
});

describe('planHero: no count in the title, minutes said once', () => {
  const review: PlanItem = { kind: 'review', count: 16, due: 55 };
  it('a review takes its share of the live queue into the meta', () => {
    const m = itemMinutes(review);
    expect(planHero(review, 55)).toEqual({ title: 'Questions to revisit', meta: `About ${m} min · 16 ready to revisit · oldest first` });
    // The caption already says the day's minutes (this item's alone): the meta leaves them out.
    expect(planHero(review, 55, { minutesSaid: true })).toEqual({ title: 'Questions to revisit', meta: '16 ready to revisit · oldest first' });
    expect(planHero({ kind: 'review', count: 8 }, 8, { minutesSaid: true }).meta).toBe('8 ready to revisit · oldest first');
    // Fewer due than the plan made room for: the live count is the set.
    expect(planHero({ kind: 'review', count: 8 }, 5, { minutesSaid: true }).meta).toBe('5 ready to revisit · oldest first');
    expect(planHero({ kind: 'review', count: 0 }, 0, { minutesSaid: true }).meta).toBe('All caught up');
  });
  it('an old save\'s "Review 20 due" label reads as the plain review; exam week\'s label keeps its name', () => {
    expect(planHero({ kind: 'review', count: 20, label: 'Review 20 due' }, 20).title).toBe('Questions to revisit');
    expect(planHero({ kind: 'review', count: 8, label: 'Light review · 8 questions' }, 30, { minutesSaid: true })).toEqual({
      title: 'Light review',
      meta: '8 questions, oldest first',
    });
  });
  it('practice, lessons, games and mocks', () => {
    const weak: PlanItem = { kind: 'practice', count: 16, label: 'Weak spots: IS Operations', why: 'weak' };
    expect(planHero(weak, 0, { minutesSaid: true })).toEqual({ title: 'Weak spots: IS Operations', meta: '16 questions, most points to gain' });
    expect(planHero({ kind: 'lesson', lessonId: 'x', title: 'The audit charter', minutes: 3 }, 0)).toEqual({ title: 'The audit charter', meta: 'Lesson · 3 min' });
    expect(planHero({ kind: 'lesson', lessonId: 'x', title: 'The audit charter', minutes: 3 }, 0, { minutesSaid: true }).meta).toBe('Lesson');
    const mock = planHero({ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 }, 0, { minutesSaid: true });
    expect(mock.title).toBe('Mini mock');
    // A mock's minutes always show (the day's total leaves mocks out).
    expect(mock.meta).toMatch(/^50 questions · about 80 min · /);
  });
});

describe('todayMinutes: the caption\'s day total', () => {
  const practice: PlanItem = { kind: 'practice', count: 16, label: '16 mixed questions' };
  const mock: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 };
  it('sums the open timed items and leaves mocks out', () => {
    expect(todayMinutes([practice, mock], [false, false])).toBe(itemMinutes(practice));
    expect(todayMinutes([practice, mock], [true, false])).toBe(0);
    expect(todayMinutes([mock], [false])).toBe(0);
    expect(todayMinutes([], [])).toBe(0);
  });
});

describe('cardLiftFor: the L2 lift on every platform', () => {
  it('draws boxShadow on iOS, web and Android 9+', () => {
    expect(cardLiftFor('ios', '17.4')).toEqual({ boxShadow: cardShadow });
    expect(cardLiftFor('web', 0 as unknown as string)).toEqual({ boxShadow: cardShadow });
    expect(cardLiftFor('android', 28)).toEqual({ boxShadow: cardShadow });
  });
  it('falls back to elevation 1 on Android 7–8 (no outset boxShadow there)', () => {
    expect(cardLiftFor('android', 26)).toMatchObject({ elevation: 1 });
    expect(cardLiftFor('android', 27)).not.toHaveProperty('boxShadow');
  });
});

describe('scrollTarget: a jump to a group stops where the page ends', () => {
  it('lands the group just under the top', () => {
    expect(scrollTarget(1200, 8, 4000, 800)).toBe(1192);
  });
  it('never scrolls above the top', () => {
    expect(scrollTarget(4, 8, 4000, 800)).toBe(0);
  });
  it('a group near the end stops at the end instead of overshooting (iOS bounce)', () => {
    expect(scrollTarget(3700, 8, 4000, 800)).toBe(3200);
    // A page shorter than the window does not scroll at all.
    expect(scrollTarget(300, 8, 500, 800)).toBe(0);
  });
  it('unknown heights leave the jump unclamped', () => {
    expect(scrollTarget(3700, 8, 0, 0)).toBe(3692);
  });
});
