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
const snap = buildSnapshot({
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
});
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
