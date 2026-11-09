/**
 * Phone leftovers from the type screenshot pass (design-notes/grove/TYPE_SCALE.md):
 *  1. Results: an area's number is its score overall, so the list says "88% overall" over "2 of 3 this set",
 *     and the plate is "Your areas after this set" (the website's "Your domains after this set").
 *  2. Today: a "Questions to revisit" step with nothing due shows no time, adds no minutes, and Start
 *     opens the next real step (the website shows no review step when none is due).
 *  3. One way to shorten text: whole words, then one "…" with no space before it.
 *  4. The floating tab bar has the page's paper under it, so scrolled text never shows in the gap.
 *  5. The stem chart's ↑ and ↓ are chart labels (fg label 500 13/17, row 176a), like its other words.
 */
import { Dimensions, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { OVERALL_COLUMN, saysOverall, StemChart, StemList, type Stem } from '../components/fieldguide/StemChart';
import { nextStepIndex, planHero, reviewIdle, todayMinutes } from '../components/journey';
import { FloatingTabBar, TAB_BAR, tabBarBottom } from '../components/tabBar';
import { StemRecap } from '../components/quiz';
import { itemMinutes } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { lineBudget, shortenAtWord } from '../engine/textClip';
import { chartLabel } from '../theme/grove';
import { light } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
afterEach(() => {
  if (r) act(() => r!.unmount());
  r = undefined;
});
const textOf = (n: { children: unknown[] }): string =>
  n.children.map((ch) => (typeof ch === 'string' ? ch : textOf(ch as { children: unknown[] }))).join('');
const hostTexts = () =>
  root()
    .findAll((n) => typeof n.type === 'string' && n.children.length > 0 && n.children.every((ch) => typeof ch === 'string'))
    .map((n) => (n.children as string[]).join(''));

// ── 1. Results: the area's number is overall ──────────────────────────
describe('Results: an area number is labelled overall (item 1)', () => {
  const area = (note?: string): Stem => ({ key: '1', name: 'IS Audit', pct: 88, answered: 60, word: 'Strong', below: false, thin: false, spoken: 'IS Audit', ...(note ? { note } : {}) });

  it('with the set\'s note: "88%" then "overall", over "2 of 3 this set"', () => {
    mount(<StemList stems={[area('2 of 3 this set')]} />);
    const t = hostTexts();
    expect(t).toContain('overall');
    expect(t.indexOf('overall')).toBeLessThan(t.findIndex((x) => /2 of 3 this set/.test(x)));
  });

  it('the chart says "overall" over a wide column only (a one-area set); narrow columns leave it to the title', () => {
    expect(saysOverall(area('2 of 3 this set'), 300, 1)).toBe(true);
    expect(saysOverall(area('2 of 3 this set'), OVERALL_COLUMN - 1, 1)).toBe(false);
    expect(saysOverall(area('2 of 3 this set'), 140, 1.3)).toBe(false);
    expect(saysOverall(area(), 300, 1)).toBe(false);
    expect(saysOverall({ ...area('1 of 2 this set'), pct: null, thin: true }, 300, 1)).toBe(false);
  });

  it('You (no set note) keeps the bare number', () => {
    mount(<StemList stems={[area()]} />);
    expect(hostTexts()).not.toContain('overall');
  });
});

// ── 2. Today: a review with nothing due ───────────────────────────────
describe('Today: a "Questions to revisit" step with nothing due (item 2)', () => {
  const review: PlanItem = { kind: 'review', count: 8 };
  const practice: PlanItem = { kind: 'practice', count: 10, label: 'IS Audit practice', why: 'weak' };
  const plan = { items: [review, practice], done: [false, false] };

  it('is idle only when the live queue is 0 and it is not done', () => {
    expect(reviewIdle(review, false, 0)).toBe(true);
    expect(reviewIdle(review, false, 3)).toBe(false);
    expect(reviewIdle(review, true, 0)).toBe(false);
    expect(reviewIdle(review, false, undefined)).toBe(false);
    expect(reviewIdle(practice, false, 0)).toBe(false);
  });

  it('adds no minutes to the plan', () => {
    expect(todayMinutes(plan.items, plan.done, 0)).toBe(itemMinutes(practice));
    expect(todayMinutes(plan.items, plan.done, 5)).toBe(itemMinutes(review) + itemMinutes(practice));
    // Callers that do not pass the queue keep the old total.
    expect(todayMinutes(plan.items, plan.done)).toBe(itemMinutes(review) + itemMinutes(practice));
  });

  it('Start opens the next real step; alone, it is still the step (its Start says "All caught up")', () => {
    expect(nextStepIndex(plan, 0)).toBe(1);
    expect(nextStepIndex(plan, 4)).toBe(0);
    expect(nextStepIndex({ items: plan.items, done: [false, true] }, 0)).toBe(0);
    expect(nextStepIndex({ items: plan.items, done: [true, true] }, 0)).toBe(-1);
  });

  it('says "All caught up", the plain review and exam week\'s labelled one alike', () => {
    expect(planHero(review, 0, { minutesSaid: true }).meta).toBe('All caught up');
    expect(planHero({ kind: 'review', count: 8, label: 'Light review · 8 questions' }, 0, { minutesSaid: true }).meta).toBe('All caught up');
    expect(planHero({ kind: 'review', count: 8, label: 'Light review · 8 questions' }, 8, { minutesSaid: true }).meta).toMatch(/^8 questions/);
  });
});

// ── 3. One truncation style ───────────────────────────────────────────
describe('shortenAtWord: whole words, then one "…" (item 3)', () => {
  const stem = 'An IS auditor tests a compensating control requiring an independent peer review of every privileged session.';

  it('never a space before the ellipsis, never three dots, never inside a word', () => {
    for (let max = 20; max < stem.length; max += 1) {
      const out = shortenAtWord(stem, max);
      expect(out.length).toBeLessThanOrEqual(max);
      expect(out.endsWith('…')).toBe(true);
      expect(out).not.toMatch(/\s…$/);
      expect(out).not.toMatch(/\.\.\./);
      // What is kept ends where a word of the stem ends.
      const kept = out.slice(0, -1);
      expect(stem.startsWith(kept)).toBe(true);
      expect(/\s/.test(stem.charAt(kept.length)) || /[,;:.]/.test(stem.charAt(kept.length))).toBe(true);
    }
  });

  it('text that fits comes back whole; punctuation before the cut is dropped', () => {
    expect(shortenAtWord('Short stem.', 40)).toBe('Short stem.');
    expect(shortenAtWord('During fieldwork, an IS auditor finds', 19)).toBe('During fieldwork…');
    expect(shortenAtWord('repeated high-value payments processed', 36)).toBe('repeated high-value payments…');
  });

  it('a budget that two lines hold, with room to spare', () => {
    // 353pt at 18pt (the answer screen at 1x): about 67 characters, two lines of Fraunces hold about 77.
    expect(lineBudget(353, 18, 2)).toBeGreaterThan(55);
    expect(lineBudget(353, 18, 2)).toBeLessThan(77);
    // Twice the text, about half the room; never under 12.
    expect(lineBudget(353, 36, 2)).toBeLessThan(lineBudget(353, 18, 2) / 2 + 4);
    expect(lineBudget(40, 36, 2)).toBe(12);
    expect(lineBudget(0, 18, 2)).toBe(12);
  });

  it('the answer screen\'s recap shows the shortened stem (two lines as a safety stop) and says it whole', () => {
    mount(<StemRecap field stem={stem + ' ' + stem} />);
    const folded = root().findAll((n) => typeof n.type === 'string' && n.props.numberOfLines === 2);
    expect(folded.length).toBe(1);
    const shown = textOf(folded[0]);
    expect(shown.endsWith('…')).toBe(true);
    expect(shown).not.toMatch(/\s…$/);
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === `Question: ${stem} ${stem}`).length).toBeGreaterThan(0);
  });
});

// ── 4. The fill under the floating bar ────────────────────────────────
describe('the floating tab bar has the page under it (item 4)', () => {
  const ROUTES = ['home', 'learn', 'practice', 'you'];
  const props = (bottom: number) => {
    const routes = ROUTES.map((name) => ({ key: `${name}-k`, name }));
    const descriptors = Object.fromEntries(routes.map((rt) => [rt.key, { options: { title: rt.name, tabBarIcon: () => <View /> } }]));
    return {
      state: { index: 0, routes },
      descriptors,
      emitter: { emit: () => ({ defaultPrevented: false }) },
      navigateToTab: () => {},
      insets: { top: 0, bottom, left: 0, right: 0 },
    } as unknown as React.ComponentProps<typeof FloatingTabBar>;
  };

  for (const inset of [0, 34]) {
    it(`inset ${inset}: the page's paper from the screen's bottom to the bar's middle, touch-through and unspoken`, () => {
      mount(<FloatingTabBar {...props(inset)} />);
      const fill = root().findAll((n) => typeof n.type === 'string' && n.props.testID === 'tab-bar-fill')[0];
      const st = fill.props.style;
      expect(st).toMatchObject({ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: light.bg });
      expect(st.height).toBe(tabBarBottom(inset) + TAB_BAR.height / 2);
      expect(fill.props.pointerEvents).toBe('none');
      expect(fill.props.importantForAccessibility).toBe('no-hide-descendants');
    });
  }
});

// ── 5. The chart's arrows are chart labels ────────────────────────────
describe('the stem chart: ↑ and ↓ in the chart label (item 5)', () => {
  it('a grown and a lower area draw ↑3 and ↓2 at fg label 13/17', () => {
    const stems: Stem[] = [
      { key: '1', name: 'IS Audit', pct: 84, answered: 60, word: 'Strong', below: false, thin: false, up: 3, spoken: 'a' },
      { key: '2', name: 'IT Governance', pct: 72, answered: 44, word: 'Steady', below: false, thin: false, down: 2, spoken: 'b' },
    ];
    // The test renderer's window says text at x2 (the list); the chart draws at x1.
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } }));
    try {
      mount(<StemChart stems={stems} />);
      act(() => {
        for (const n of root().findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 300 } } });
      });
      expect(root().findAll((n) => typeof n.type === 'string' && n.props.testID === 'stem-list')).toHaveLength(0);
      for (const a of ['↑3', '↓2']) {
        const node = root().findAll((n) => typeof n.type === 'string' && n.children.length === 1 && n.children[0] === a)[0];
        expect(node).toBeTruthy();
        const flat = Object.assign({}, ...[node.props.style].flat(3).filter(Boolean));
        expect(flat).toMatchObject({ fontFamily: chartLabel.fontFamily, fontSize: chartLabel.fontSize, lineHeight: chartLabel.lineHeight });
      }
    } finally {
      act(() => Dimensions.set({ window: w, screen: w }));
    }
  });
});
