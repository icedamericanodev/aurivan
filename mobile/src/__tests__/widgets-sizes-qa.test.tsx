/**
 * QA (widgets, sizes): the layout tests use a 412 dp phone's grid (4x2 = 376 x 184).
 * On a 360 dp-wide phone the same 4x2 is about 330 x 165 dp. Written as the
 * behaviour we want (it.failing until fixed).
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
// A typical bank stem that passes quizFit (under QUIZ_STEM_MAX = 150 characters).
const STEM = 'An information systems (IS) auditor is reviewing how recovery tiers are set for business processes. Which basis is BEST?';
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
  quiz: [0, 1, 2, 3].map((d) => ({ day: addDays(TODAY, d), id: 'd4_070', stem: STEM, topic: 'Operations', done: false })),
  ready: null,
});
const draw = (w: number, h: number) =>
  texts(buildWidgetTree(<WidgetLayout face={widgetFace('question', snap, { now: NOW })} theme="light" width={w} height={h} fontScale={1} />));

it('control: on a 412 dp phone (4x2 = 376 x 184) the question itself shows', () => {
  expect(draw(376, 184)).toContain(STEM);
});

it.failing('on a 360 dp phone (4x2 = about 330 x 165) the Quick question shows the question, not only "A quick question for you"', () => {
  expect(draw(330, 165)).toContain(STEM);
});
