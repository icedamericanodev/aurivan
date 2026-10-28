/**
 * Home-screen widgets (mobile 1.48, design review H2): a revealed card's
 * words ARE its content. For EVERY key-term meaning and EVERY Recall card's
 * Exam cue in the bank, on a 412 and a 360 dp phone, at 2×2 and 4×2, at text
 * sizes 100%, 130% and 200%:
 *   - the words are never drawn under 12 sp (BODY_MIN);
 *   - they never get SMALLER because the phone's text got bigger;
 *   - they are drawn whole, or (only where they truly can't fit) ended cleanly
 *     at a whole word with "…", and the card's tap opens the rest in the app;
 *   - on a 412 dp phone's 4×2, every one is whole.
 */
import type { JSX } from 'react';
import { getAllQuestions } from '../content/loader';
import { termsFor } from '../content/terms';
import { addDays } from '../engine/examDay';
import { buildSnapshot, widgetFace, type SnapshotInput } from '../engine/widgets';
import { examCue, recallFit } from '../lib/widgetData';
import { BODY_MIN, WidgetLayout } from '../widgets/layouts.android';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
// Thousands of trees: give a busy CI machine time.
jest.setTimeout(240_000);

interface Tree {
  type: string;
  props: Record<string, unknown>;
  children?: Tree[];
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildWidgetTree } = require('react-native-android-widget/lib/commonjs/api/build-widget-tree') as { buildWidgetTree: (el: JSX.Element) => Tree };
const textNodes = (t: Tree, out: Tree['props'][] = []) => {
  if (t.type === 'TextWidget') out.push(t.props);
  (t.children ?? []).forEach((c) => textNodes(c, out));
  return out;
};
/** The whole card (the outer node, or the card inside an index card's ruling) opens the app. */
const opensApp = (t: Tree): boolean => (t.props.clickAction === 'OPEN_URI' && t.props.height === 'match_parent') || (t.type !== 'TextWidget' && (t.children ?? []).some((c) => c.type !== 'TextWidget' && c.props.height === 'match_parent' && opensApp(c)));
const pxOf = (p: Tree['props']) => ((p.style as { fontSize?: number } | undefined)?.fontSize ?? (p.fontSize as number));

const TODAY = '2026-10-29';
const NOW = new Date(2026, 9, 29, 9).getTime();
const BASE: SnapshotInput = {
  now: NOW,
  onboarded: true,
  prefs: { details: 'show', readiness: 'private', timing: true },
  examDay: addDays(TODAY, 40),
  dailyMinutes: 20,
  plan: null,
  studyDays: [],
  studyDaysTotal: 0,
  answeredAny: true,
  plant: null,
  think: [],
  recall: [],
  terms: [],
  road: null,
  ready: null,
};
const SIZES: Record<string, [number, number]> = { p411_2x2: [182, 184], p411_4x2: [376, 184], p360_2x2: [158, 164], p360_4x2: [330, 164] };
const SCALES = [1, 1.3, 2];

/** The drawn body for each size and scale: its text and size (null if it isn't drawn). */
function check(kind: 'revisit' | 'question', over: Partial<SnapshotInput>, body: string, sizes: string[]) {
  const face = widgetFace(kind, buildSnapshot({ ...BASE, ...over }), { now: NOW, revealed: true });
  const problems: string[] = [];
  for (const name of sizes) {
    const [w, h] = SIZES[name];
    let first = 0;
    for (const scale of SCALES) {
      const tree = buildWidgetTree(<WidgetLayout face={face} theme="light" width={w} height={h} fontScale={scale} />);
      // The meaning alone, or "RPO: meaning" as one block.
      const node = textNodes(tree).find((p) => {
        const t = String(p.text).replace(/…$/, '');
        return body.startsWith(t) || t.endsWith(body) || (t.includes(': ') && body.startsWith(t.slice(t.indexOf(': ') + 2)));
      });
      const where = `${name} @${scale}: ${body.slice(0, 40)}`;
      if (!node) {
        problems.push(`${where}: not drawn`);
        continue;
      }
      const px = pxOf(node);
      const text = String(node.text);
      if (px < BODY_MIN) problems.push(`${where}: ${px} sp`);
      if (scale === 1) first = px;
      else if (px < first) problems.push(`${where}: shrank ${first} → ${px} sp`);
      if (text.endsWith('…')) {
        // Ended cleanly: at a whole word of the real text, and the card opens the rest in the app.
        const raw = text.slice(0, -1);
        const kept = body.startsWith(raw) ? raw : raw.slice(raw.indexOf(': ') + 2);
        if (!body.startsWith(kept) || !/[\s,;:.\u2013\u2014-]/.test(body.charAt(kept.length) || ' ')) problems.push(`${where}: cut mid-word`);
        if (!opensApp(tree)) problems.push(`${where}: cut, and the card does not open the app`);
        if (name === 'p411_4x2') problems.push(`${where}: cut on a 412 dp 4×2`);
      }
    }
  }
  return problems;
}

describe('revealed words fit (1.48, design review H2)', () => {
  it('every key-term meaning, at 2×2 and 4×2, 412 and 360 dp, 100/130/200%', () => {
    const terms = ['1', '2', '3', '4', '5'].flatMap((d) => termsFor('cisa', d));
    expect(terms.length).toBeGreaterThan(100);
    const problems = terms.flatMap((t) =>
      check('revisit', { terms: [{ day: TODAY, id: t.id, term: t.term, ...(t.short ? { short: t.short } : {}), meaning: t.meaning, topic: 'Operations', note: t.note }] }, t.meaning, Object.keys(SIZES)),
    );
    expect(problems).toEqual([]);
  });

  it('every Recall card’s Exam cue, at 4×2 (its smallest size), 412 and 360 dp, 100/130/200%', () => {
    const qs = getAllQuestions('cisa').filter(recallFit);
    expect(qs.length).toBeGreaterThan(100);
    const problems = qs.flatMap((q) =>
      check('question', { recall: [{ day: TODAY, id: q.id, stem: q.stem, answer: q.options[q.correct] as string, cue: examCue(q.tips), weeks: 3, topic: 'Operations' }] }, `Exam cue: ${examCue(q.tips)}`, ['p411_4x2', 'p360_4x2']),
    );
    expect(problems).toEqual([]);
  });
});
