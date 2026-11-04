/**
 * QA (widgets, sizes): the layout tests use a 412 dp phone's grid (4x2 = 376 x 184).
 * On a 360 dp-wide phone the same 4x2 is about 330 x 165 dp.
 *
 * Was an it.failing in 1.47: the Quick question fell back to "A quick question
 * for you" there, so it never showed its question. Mobile 1.48 replaced it with
 * the Recall card, which fits its words to the room (never a generic line): the
 * same check now passes, at the normal text size and at 130% and 200%.
 */
import type { JSX } from 'react';
import { addDays } from '../engine/examDay';
import { buildSnapshot, DEFAULT_WIDGET_PREFS, widgetFace } from '../engine/widgets';
import { WidgetLayout } from '../widgets/layouts.android';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildWidgetTree } = require('react-native-android-widget/lib/commonjs/api/build-widget-tree') as { buildWidgetTree: (el: JSX.Element) => Tree };
interface Tree {
  type: string;
  props: { text?: string };
  children?: Tree[];
}
const texts = (t: Tree, out: string[] = []): string[] => {
  if (t.type === 'TextWidget' && t.props.text) out.push(t.props.text);
  (t.children ?? []).forEach((c) => texts(c, out));
  return out;
};

const TODAY = '2026-10-29';
const NOW = new Date(2026, 9, 29, 9).getTime();
// A recall stem as long as the Recall card allows (lib/widgetData.ts RECALL_FIT.stem: 170 characters).
const STEM = 'An IS auditor reviews how a retailer sets recovery priorities for its payment, ordering and reporting systems after a merger. Which basis should the auditor expect FIRST?';
const SNAP_INPUT = {
  now: NOW,
  onboarded: true,
  prefs: { ...DEFAULT_WIDGET_PREFS },
  examDay: addDays(TODAY, 40),
  dailyMinutes: 20,
  plan: null,
  studyDays: [],
  studyDaysTotal: 3,
  answeredAny: true,
  plant: null,
  think: [],
  recall: [0, 1, 2, 3].map((d) => ({ day: addDays(TODAY, d), id: 'd4_070', stem: STEM, answer: 'The results of the business impact analysis', cue: 'recovery priorities follow business impact.', weeks: 3, topic: 'Operations' })),
  ready: null,
};
const snap = buildSnapshot(SNAP_INPUT);
const draw = (w: number, h: number, fontScale = 1) =>
  texts(buildWidgetTree(<WidgetLayout face={widgetFace('question', snap, { now: NOW })} theme="light" width={w} height={h} fontScale={fontScale} />));

it('the stem is as long as the Recall card allows', () => {
  expect(STEM.length).toBe(170);
});

it('control: on a 412 dp phone (4x2 = 376 x 184) the question itself shows', () => {
  expect(draw(376, 184)).toContain(STEM);
});

it.each([1, 1.3, 2])('on a 360 dp phone (4x2 = about 330 x 165, and a 5-column 270 x 150) the Recall card shows its whole question at %sx text', (fs) => {
  expect(draw(330, 165, fs)).toContain(STEM);
  // A 5-column 270 × 150 has no room for 170 characters: since 1.48 the stem ends cleanly at a whole word
  // ("…"), never mid-word, and the card opens the whole question in the app.
  const narrow = draw(270, 150, fs);
  expect(narrow.includes(STEM) || narrow.some((t) => t.endsWith('…') && STEM.startsWith(t.slice(0, -1)) && /[\s,;:.]/.test(STEM.charAt(t.length - 1)))).toBe(true);
  expect(draw(330, 165, fs).join(' ')).not.toMatch(/A quick question for you/);
});

// Type scale review round 3: on a narrow 2x1 This week strip the number steps down until its unit fits
// beside it at SERIF_MIN (13 sp), the same floor the figure measures the unit at, so the unit never drops
// under a number that already fills the strip's height.
interface Node {
  type: string;
  props: { text?: string; fontSize?: number; orientation?: string };
  children?: Node[];
}
/** Beside: the figure's box lays out its children in a row (the native tree's HORIZONTAL). */
const beside = (n: Node | null) => n?.props.orientation === 'HORIZONTAL';
/** The row or column that holds the text `text` directly (the figure's box). */
const boxOf = (t: Node, text: string): Node | null => {
  if ((t.children ?? []).some((c) => c.type === 'TextWidget' && c.props.text === text)) return t;
  for (const c of t.children ?? []) {
    const hit = boxOf(c, text);
    if (hit) return hit;
  }
  return null;
};
const fontOf = (t: Node, text: string): number => {
  if (t.type === 'TextWidget' && t.props.text === text) return t.props.fontSize ?? 0;
  for (const c of t.children ?? []) {
    const px = fontOf(c, text);
    if (px) return px;
  }
  return 0;
};
// A week with three study days (the snapshot above has none yet); the count is swapped in per case.
const weekFace = widgetFace('week', buildSnapshot({ ...SNAP_INPUT, studyDays: ['2026-10-26', '2026-10-27', '2026-10-28'], studyDaysTotal: 9 }), { now: NOW });

it.each([
  ['3', 182, 86, 1],
  ['3', 182, 86, 1.3],
  ['12', 182, 86, 1],
  ['12', 182, 86, 1.3],
  ['3', 158, 78, 1],
  ['12', 158, 78, 1.3],
])('a narrow 2x1 This week strip ("%s", %s x %s, %sx text): the number and its unit fit the strip', (count, w, h, fs) => {
  expect(weekFace.art?.type).toBe('leaves');
  const tree = buildWidgetTree(<WidgetLayout face={{ ...weekFace, title: count }} theme="light" width={w} height={h} fontScale={fs} />) as unknown as Node;
  const unit = count === '1' ? 'day' : 'days';
  const box = boxOf(tree, count);
  expect(JSON.stringify(box)).toContain(`"text":"${unit}"`);
  const ih = h - 2 * 12; // W.padStrip, top and bottom
  const numPx = fontOf(tree, count);
  const unitPx = fontOf(tree, unit);
  expect(unitPx).toBeGreaterThanOrEqual(13);
  if (beside(box)) {
    // Beside: the taller of the two lines fits the strip.
    expect(Math.max(numPx, unitPx) * 1.3).toBeLessThanOrEqual(ih);
  } else {
    // Only a strip too narrow for any number size stacks; then both lines still fit its height.
    expect(w).toBeLessThan(182);
    expect((numPx + unitPx) * 1.3).toBeLessThanOrEqual(ih);
  }
  // The 412 dp phone's 2×1 always keeps the unit beside the number.
  if (w === 182) expect(beside(box)).toBe(true);
});
