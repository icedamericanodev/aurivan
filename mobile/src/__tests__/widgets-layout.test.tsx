/**
 * Home-screen widgets, the Android layout trees (mobile 1.47; the "Study
 * card" redesign in 1.48).
 *
 * Builds the library's real layout tree (buildWidgetTree, plain JavaScript)
 * for every widget, at every size it offers on a 412 dp AND a 360 dp phone
 * (and the launcher minimums), in light and dark, at font scales 1, 1.3, 1.5,
 * 1.6 and 2, in its main states, and checks what a learner sees and taps: the
 * face's key word is always there, Grove colours only (no red), every tap
 * target is at least 48 dp tall and labelled with minutes in full, every link
 * goes through the app's widget route, and no text is under 10 sp.
 *
 * 1.48 adds: the hero never goes at large text (the question, the rings, the
 * leaves), the reveal button and the Had it / Not yet pair never share a
 * place, only Today's plan has a Start, forest is Today's plan's alone, and
 * the leaves appear on This week only.
 *
 * With WIDGET_DUMP=<file> it also writes every tree (and its face) to that
 * file, for the screenshot harness (scratchpad; not part of CI).
 */
import { writeFileSync } from 'fs';
import type { JSX } from 'react';
import { addDays } from '../engine/examDay';
import { buildSnapshot, DEFAULT_WIDGET_PREFS, FINAL_DAY_PLAIN, sizeClass, widgetFace, WIDGET_KINDS, type DrawContext, type SnapshotInput, type WidgetFace, type WidgetKind, type WidgetPrefs, type WidgetSnapshot } from '../engine/widgets';
import { dark, light } from '../theme/tokens';
import { markSvg, plantSvg, ringsSvg, ruledSvg, widgetColors } from '../widgets/art';
import { captionFit, fitText, forLargeText, forNarrowStrip, TAP_MIN, WIDGET_ACTIONS, WidgetLayout } from '../widgets/layouts.android';
import { renderKind } from '../widgets/render.android';

/** The library's own tree builder (plain JavaScript; the package keeps it out of its index). */
interface WidgetTree {
  type: string;
  props: unknown;
  children?: WidgetTree[];
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildWidgetTree } = require('react-native-android-widget/lib/commonjs/api/build-widget-tree') as { buildWidgetTree: (el: JSX.Element) => WidgetTree };

const TODAY = '2026-10-29';
const at = (day: string, h = 9) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, h).getTime();
};
const NOW = at(TODAY);
const PLAN = {
  day: TODAY,
  left: 12,
  done: false,
  first: false,
  title: 'Operations',
  short: 'Operations',
  meta: '10 questions, most points to gain',
  back: 6,
  backMissed: false,
  shortSet: true,
  next: 'Security',
  nextMin: 18,
  finalDay: null,
  count: 12,
  steps: 3,
  stepsDone: 1,
};
/** A long real bank stem (170 characters, the Recall card's cap) and a long answer and cue. */
const STEM = 'An IS auditor reviews how a retailer sets recovery priorities for its payment, ordering and reporting systems after a merger. Which basis should the auditor expect FIRST?';
const ANSWER = 'The results of a business impact analysis agreed with the process owners';
const CUE = 'recovery priorities follow business impact and owner sign-off, never the technology or the cost of the system.';

function input(over: Partial<SnapshotInput> = {}): SnapshotInput {
  return {
    now: NOW,
    onboarded: true,
    prefs: { ...DEFAULT_WIDGET_PREFS },
    examDay: addDays(TODAY, 21),
    dailyMinutes: 20,
    plan: { ...PLAN },
    studyDays: ['2026-10-26', '2026-10-27', '2026-10-28'],
    studyDaysTotal: 9,
    answeredAny: true,
    plant: { species: 'narra', name: 'narra', growth: 3, grew: null, style: 'botanical' },
    think: [0, 1, 2, 3].map((d) => ({
      day: addDays(TODAY, d),
      id: 'recommend-dont-implement',
      ask: 'Management asks the auditor to set up the missing control. What should the auditor do?',
      short: 'Asked to build the control. Your move?',
      title: 'Recommend, don’t implement',
      rule: 'The information systems (IS) auditor assesses, reports and recommends; management designs, implements and owns the fix.',
      try: 'd1_010',
    })),
    recall: [0, 1, 2, 3].map((d) => ({ day: addDays(TODAY, d), id: 'd4_070', stem: STEM, answer: ANSWER, cue: CUE, weeks: 3, topic: 'Operations' })),
    terms: [0, 1, 2, 3].map((d) => ({ day: addDays(TODAY, d), id: 't4_12', term: 'Recovery point objective', short: 'RPO', meaning: 'The most data, measured in time, the business can accept losing; it sets how often data is backed up.', topic: 'Operations', note: '4B3.2' })),
    road: { from: '2026-10-05', stage: 'practice' },
    ready: { enough: true, low: 68, high: 78, rings: [70, 62, 55, 80, 66], weights: [18, 18, 12, 26, 26], grew: 'Security' },
    ...over,
  };
}
const snap = (over: Partial<SnapshotInput> = {}) => buildSnapshot(input(over));
const ON: WidgetPrefs = { details: 'show', readiness: 'show', timing: true };

/** The real grids: a 412 dp Pixel-style phone and a 360 dp Samsung-style phone (4×5). */
const GRID = {
  '2x1': [182, 86],
  '2x2': [182, 184],
  '4x1': [376, 86],
  '4x2': [376, 184],
  '4x3': [376, 282],
  '1x1': [86, 86],
  's2x1': [158, 78],
  's2x2': [158, 164],
  's4x1': [330, 78],
  's4x2': [330, 164],
  's4x3': [330, 250],
} as const;
type GridName = keyof typeof GRID;
const sizes = (...names: GridName[]): [string, number, number][] => names.map((n) => [n, GRID[n][0], GRID[n][1]]);
/** The sizes each kind can be placed at (app.json minimums: Recall card 250 × 110 dp), its default first, then the launcher minimum. */
const SIZES: Record<WidgetKind, [string, number, number][]> = {
  plan: [...sizes('2x2', '4x2', '2x1', '4x1', 's2x2', 's4x2', 's2x1', 's4x1'), ['min', 130, 110]],
  plant: [...sizes('2x2', '4x2', '2x1', '4x1', '1x1', 's2x2', 's4x2', 's2x1'), ['min', 40, 40]],
  think: [...sizes('4x2', '2x2', '4x1', '2x1', 's4x2', 's2x2', 's4x1', 's2x1'), ['min', 130, 40]],
  week: [...sizes('4x1', '2x2', '4x2', '2x1', '1x1', 's4x1', 's2x2', 's4x2'), ['min', 40, 40]],
  question: [...sizes('4x2', '4x3', 's4x2', 's4x3'), ['min', 250, 110]],
  revisit: [...sizes('2x2', '4x2', '4x1', '2x1', 's2x2', 's4x2', 's4x1'), ['min', 130, 40]],
  countdown: [...sizes('2x2', '4x2', '4x1', '2x1', 's2x2', 's4x2', 's4x1'), ['min', 130, 110]],
  readiness: [...sizes('2x2', '4x2', '4x1', '2x1', 's2x2', 's4x2'), ['min', 130, 110]],
};
const SCALES = [1, 1.3, 1.5, 1.6, 2];
// Thousands of trees per scenario: give a busy CI machine time.
jest.setTimeout(120_000);

function walk(t: WidgetTree, fn: (n: WidgetTree, depth: number) => void, depth = 0) {
  fn(t, depth);
  for (const c of t.children ?? []) walk(c, fn, depth + 1);
}
const props = (n: WidgetTree) => n.props as Record<string, unknown>;
function texts(t: WidgetTree): string[] {
  const out: string[] = [];
  walk(t, (n) => {
    if (n.type === 'TextWidget') out.push(String(props(n).text));
  });
  return out;
}
function svgs(t: WidgetTree): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  walk(t, (n) => {
    if (n.type === 'SvgWidget') out.push(props(n));
  });
  return out;
}
/** The clickable nodes, in drawing order (top to bottom), with their depth. */
function clicks(t: WidgetTree): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  walk(t, (n) => {
    if (props(n).clickAction) out.push(props(n));
  });
  return out;
}
const faceFor = (kind: WidgetKind, s: WidgetSnapshot | null, ctx: Partial<DrawContext> = {}) => widgetFace(kind, s, { now: NOW, revealed: false, ...ctx });
const build = (kind: WidgetKind, s: WidgetSnapshot | null, w: number, h: number, theme: 'light' | 'dark' = 'light', fontScale = 1, ctx: Partial<DrawContext> = {}) =>
  buildWidgetTree(<WidgetLayout face={faceFor(kind, s, ctx)} theme={theme} width={w} height={h} fontScale={fontScale} />);

/** The face as drawn at this size and scale (the narrow strip and large-text rules applied). */
function drawn(f: WidgetFace, w: number, h: number, scale: number): WidgetFace {
  const size = sizeClass(w, h);
  return forLargeText(size === 'strip' && w < 250 ? forNarrowStrip(f) : f, size, scale);
}

/** Reddish hex colours (never on a KaiSip widget). */
const RED = /^#(?:FF|F[0-9A-F]|E[0-9A-F])(?:[0-4][0-9A-F]){2}$/i;

const SCENARIOS: [string, WidgetSnapshot | null, Partial<DrawContext>?][] = [
  ['normal', snap({ prefs: ON })],
  ['details off', snap({ prefs: { ...ON, details: 'hide', readiness: 'private' } })],
  ['timing off', snap()],
  ['final week', snap({ prefs: ON, examDay: addDays(TODAY, 4), plan: { ...PLAN, finalDay: FINAL_DAY_PLAIN[4] } })],
  ['exam day', snap({ prefs: ON, examDay: TODAY })],
  ['revealed', snap({ prefs: ON }), { revealed: true }],
  ['self-checked', snap({ prefs: ON }), { revealed: true, judged: 'notyet' }],
  ['done', snap({ prefs: ON, plan: { ...PLAN, done: true, left: 0, count: 0, stepsDone: 3 } })],
  ['new learner', snap({ studyDays: [], studyDaysTotal: 0, plant: null, answeredAny: false, recall: [], plan: { ...PLAN, first: true, back: 0 } })],
  ['before onboarding', null],
];

describe('every widget, size (412 and 360 dp), theme and font scale builds a tree a learner can read and tap', () => {
  it.each(SCENARIOS)('%s', (_name, s, ctx = {}) => {
    for (const kind of WIDGET_KINDS) {
      const face = faceFor(kind, s, ctx);
      for (const [, w, h] of SIZES[kind]) {
        for (const theme of ['light', 'dark'] as const) {
          for (const fontScale of SCALES) {
            const tree = build(kind, s, w, h, theme, fontScale, ctx);
            const f = drawn(face, w, h, fontScale);
            const joined = texts(tree).join(' ');
            // The key word survives every size and scale (a very small 1×1 shows its mark; TalkBack has the label).
            if (w >= 70 && h >= 60 && f.key) expect({ kind, w, h, fontScale, ok: joined.toLowerCase().includes(f.key.toLowerCase()) }).toEqual({ kind, w, h, fontScale, ok: true });
            const clickables: Record<string, unknown>[] = [];
            walk(tree, (n, depth) => {
              const p = props(n);
              if (n.type === 'TextWidget') expect((p.fontSize as number | undefined) ?? 14).toBeGreaterThanOrEqual(10);
              if (!p.clickAction) return;
              clickables.push(p);
              expect(typeof p.accessibilityLabel).toBe('string');
              expect(String(p.accessibilityLabel)).not.toMatch(/\bmin\b/);
              if (depth > 0 && p.height !== 'match_parent') expect(p.height).toBeGreaterThanOrEqual(TAP_MIN);
              if (p.clickAction === 'OPEN_URI') expect(String((p.clickActionData as { uri: string }).uri)).toMatch(/^kaisip:\/\/widget\?kind=/);
              else expect(WIDGET_ACTIONS).toContain(p.clickAction);
            });
            expect(clickables.length).toBeLessThanOrEqual(3);
            walk(tree, (n) => {
              const p = props(n);
              for (const key of ['color', 'backgroundColor']) if (typeof p[key] === 'string') expect(p[key]).not.toMatch(RED);
            });
          }
        }
      }
    }
  });
});

describe('the words and taps a learner sees', () => {
  it('Today’s plan, 4×2: the real task, the topic, "step 2 of 3", the pips, "Start · 12 min" and the short set', () => {
    const all = texts(build('plan', snap(), 376, 184));
    expect(all).toEqual(expect.arrayContaining(['TODAY · OPERATIONS', '12', 'questions', 'step 2 of 3', 'Start · 12 min', 'Short on time? 5 questions ›']));
  });

  it('Today’s plan, 2×2: the figure as the hero and one full-width Start, no short set; the pips stay', () => {
    const tree = build('plan', snap(), 182, 184);
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['12', 'questions', 'Start · 12 min']));
    expect(all.join(' ')).not.toContain('Short on time');
    let pips = 0;
    walk(tree, (n) => {
      if (props(n).height === 4 && props(n).borderRadius) pips += 1;
    });
    expect(pips).toBe(3);
  });

  it('only Today’s plan has a Start: no other widget offers one, at any size', () => {
    for (const kind of WIDGET_KINDS) {
      if (kind === 'plan') continue;
      for (const [, w, h] of SIZES[kind]) {
        const tree = build(kind, snap({ prefs: ON }), w, h);
        expect({ kind, w, start: texts(tree).some((t) => /^Start\b/.test(t)) }).toEqual({ kind, w, start: false });
        for (const c of clicks(tree)) expect(String((c.clickActionData as { uri?: string } | undefined)?.uri ?? '')).not.toMatch(/go=(start|short|review)/);
      }
    }
  });

  it('Today’s plan at the launcher minimum and as a 2×1: the task in words, and the whole widget starts the plan', () => {
    for (const [w, h] of [
      [130, 110],
      [182, 86],
      [158, 78],
    ]) {
      const tree = build('plan', snap(), w, h);
      expect(texts(tree)).toContain('12 questions');
      expect(String((props(tree).clickActionData as { uri: string }).uri)).toContain('go=start');
    }
  });

  it('forest is Today’s plan’s alone; the plant sits on its plate, the question cards are ruled, the road is ink', () => {
    expect(JSON.stringify(props(build('plan', snap(), 376, 184, 'dark')))).toContain(dark.forest);
    for (const kind of WIDGET_KINDS) {
      if (kind === 'plan') continue;
      for (const s of [snap({ prefs: ON }), snap({ prefs: ON, examDay: addDays(TODAY, 1) })]) expect(JSON.stringify(build(kind, s, 376, 184, 'dark'))).not.toContain(dark.forest);
    }
    expect(props(build('plant', snap(), 182, 184, 'light')).backgroundColor).toBe(light.tipBg);
    expect(props(build('week', snap(), 182, 184, 'light')).backgroundColor).toBe(light.raised2);
    expect(props(build('countdown', snap({ prefs: ON }), 182, 184, 'light')).backgroundColor).toBe(light.ink);
    // The ruled index card: an underlay of rules behind the words.
    const card = build('think', snap(), 376, 184);
    expect(card.type).toBe('FrameLayoutWidget');
    expect(String(svgs(card)[0].svgString)).toContain(light.clay);
    // Dark cards carry a 1 dp outline, so they don't vanish on a dark wallpaper.
    expect(JSON.stringify(props(build('countdown', snap({ prefs: ON }), 182, 184, 'dark')))).toContain('borderWidth');
  });

  it('This week: seven leaves with day letters, "3 study days"; the leaves appear on no other widget', () => {
    const tree = build('week', snap(), 376, 86);
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['M', 'T', 'W', 'F', 'S', '3', 'days']));
    const leafSvgs = (t: WidgetTree) => svgs(t).filter((p) => String(p.svgString).includes('viewBox="0 0 24 32"')).length;
    expect(leafSvgs(tree)).toBe(7);
    for (const kind of WIDGET_KINDS) if (kind !== 'week') expect(leafSvgs(build(kind, snap({ prefs: ON, plan: { ...PLAN, done: true } }), 376, 184))).toBe(0);
  });

  it('This week 1×1: one leaf and the count; a very small cell: the count only', () => {
    expect(texts(build('week', snap(), 86, 86))).toEqual(['3', 'this week']);
    expect(texts(build('week', snap(), 40, 40))).toEqual(['3']);
  });

  it('large text never removes the hero: the leaves, the rings, the plant and the question stay at 130% and 200%', () => {
    for (const fs of [1.3, 2]) {
      for (const [w, h] of [
        [376, 86],
        [330, 78],
        [182, 184],
        [158, 164],
      ]) {
        expect(svgs(build('week', snap(), w, h, 'light', fs)).length).toBeGreaterThanOrEqual(7);
        expect(svgs(build('readiness', snap({ prefs: ON, examDay: addDays(TODAY, 40) }), w, h, 'light', fs)).length).toBe(1);
      }
      for (const [w, h] of [
        [376, 184],
        [330, 164],
      ]) {
        expect(svgs(build('readiness', snap({ prefs: ON, examDay: addDays(TODAY, 40) }), w, h, 'light', fs)).length).toBe(1);
        expect(texts(build('question', snap(), w, h, 'light', fs))).toContain(STEM);
        expect(texts(build('think', snap(), w, h, 'light', fs)).join(' ')).toMatch(/Management asks|Asked to build/);
        expect(texts(build('plan', snap(), w, h, 'light', fs))).toContain('12');
      }
    }
  });

  it('Today’s rule: "Show the rule" is a widget click (no app opens); then Had it / Not yet; then Try one', () => {
    const ask = build('think', snap(), 376, 184);
    expect(clicks(ask)[0].clickAction).toBe('REVEAL');
    expect(texts(ask)).toContain('Show the rule');
    const shownTree = build('think', snap(), 376, 184, 'light', 1, { revealed: true });
    expect(texts(shownTree)).toEqual(expect.arrayContaining(['Recommend, don’t implement.', 'Had it', 'Not yet']));
    const after = build('think', snap(), 376, 184, 'light', 1, { revealed: true, judged: 'had' });
    expect(texts(after)).toContain('Try one');
  });

  it('the reveal button and the Had it / Not yet pair never sit in the same place (top row, then bottom row; left, then right on a strip)', () => {
    for (const kind of ['think', 'question'] as const) {
      for (const [, w, h] of SIZES[kind].filter(([, ww, hh]) => sizeClass(ww, hh) !== 'tiny' && !(sizeClass(ww, hh) === 'strip' && ww < 250))) {
        for (const fs of [1, 1.3, 2]) {
          const hidden = clicks(build(kind, snap(), w, h, 'light', fs)).filter((c) => c.clickAction === 'REVEAL');
          const shownTree = build(kind, snap(), w, h, 'light', fs, { revealed: true });
          const order = clicks(shownTree).map((c) => c.clickAction);
          // The reveal pill (not the whole card) and the pair: the pill comes first in its card (top, or left on a strip) …
          const pill = hidden.find((c) => c.height === TAP_MIN);
          expect({ kind, w, h, fs, pill: Boolean(pill) }).toEqual({ kind, w, h, fs, pill: true });
          // … and once shown, nothing that answers is drawn where the pill was: the pair is the last row (or the right end).
          expect(order.slice(-2)).toEqual(['HAD', 'NOTYET']);
          const size = sizeClass(w, h);
          if (size !== 'strip') {
            // The pill lives in the card's first row; the pair in its last.
            const rows = (shownTree.type === 'FrameLayoutWidget' ? shownTree.children![1] : shownTree).children![0].children ?? [];
            const last = rows[rows.length - 1];
            expect(JSON.stringify(last)).toContain('"clickAction":"HAD"');
            const hiddenTree = build(kind, snap(), w, h, 'light', fs);
            const hiddenRows = (hiddenTree.type === 'FrameLayoutWidget' ? hiddenTree.children![1] : hiddenTree).children![0].children ?? [];
            expect(JSON.stringify(hiddenRows[0])).toContain('"clickAction":"REVEAL"');
          }
        }
      }
    }
  });

  it('Today’s rule, 2×2 and 2×1: the short prompt, one prompt per face', () => {
    for (const [w, h] of [
      [182, 184],
      [182, 86],
      [158, 164],
    ]) {
      const all = texts(build('think', snap(), w, h));
      expect(all).toContain('Asked to build the control. Your move?');
      expect(all.join(' ')).not.toMatch(/Management asks/);
    }
  });

  it('Recall card (was Quick question): the whole stem, on a 412 and a 360 dp phone, at every text size; never an option', () => {
    // The 1.47 Quick question lost its question on a 360 dp phone (an it.failing in widgets-sizes-qa); the Recall card never does.
    for (const [, w, h] of SIZES.question) {
      for (const fs of SCALES) {
        const all = texts(build('question', snap(), w, h, 'light', fs));
        expect({ w, h, fs, stem: all.includes(STEM) }).toEqual({ w, h, fs, stem: true });
        expect(all.join(' ')).not.toMatch(/\(A\)|\bA\)|business impact analysis agreed/);
      }
    }
  });

  it('Recall card, shown: only the answer and its Exam cue, then the pair; the card opens that question', () => {
    const tree = build('question', snap(), 376, 184, 'light', 1, { revealed: true });
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining([ANSWER, `Exam cue: ${CUE}`, 'Had it', 'Not yet']));
    expect(all.join(' ')).not.toContain(STEM);
    expect(String((props(tree.children![1]).clickActionData as { uri: string }).uri)).toContain('go=question&id=d4_070');
  });

  it('Key term: the abbreviation as the hero; Show the meaning; then the meaning; the card opens the study note', () => {
    const tree = build('revisit', snap(), 182, 184);
    expect(texts(tree)).toEqual(expect.arrayContaining(['RPO', 'Recovery point objective', 'Show']));
    expect(String((props(tree).clickActionData as { uri: string }).uri)).toBe('kaisip://widget?kind=revisit&go=note&id=4B3.2&from=widget');
    expect(clicks(tree).some((c) => c.clickAction === 'REVEAL')).toBe(true);
    for (const [w, h] of [
      [182, 184],
      [158, 164],
      [376, 184],
    ]) {
      const shownAll = texts(build('revisit', snap(), w, h, 'light', 1, { revealed: true })).join(' ');
      expect(shownAll).toContain('The most data, measured in time, the business can accept losing; it sets how often data is backed up.');
    }
  });

  it('Readiness: rings only shows no number; the range shows "a study estimate"; what grew this week', () => {
    expect(texts(build('readiness', snap({ prefs: ON, examDay: addDays(TODAY, 40) }), 376, 184))).toEqual(expect.arrayContaining(['68–78', '%', 'Not a prediction.', 'Security grew this week.']));
    const priv = texts(build('readiness', snap({ prefs: { ...ON, readiness: 'private' } }), 182, 184)).join(' ');
    expect(priv).not.toMatch(/\d+–\d+|%|You chose/);
    expect(priv).toContain('Rings growing');
  });

  it('Your plant, 2×2: the plant is the hero on its plate, "Fig. 3 · Shoot", and the stage word stays at 200%', () => {
    const tree = build('plant', snap(), 182, 184);
    const hero = svgs(tree).reduce((m, p) => Math.max(m, (p.width as number) ?? 0), 0);
    expect(hero).toBeGreaterThanOrEqual(100);
    expect(texts(tree)).toContain('Fig. 3 · Shoot');
    expect(texts(build('plant', snap(), 182, 184, 'light', 2)).join(' ')).toContain('Shoot');
  });

  it('Road to exam: the weeks as a road and this week’s focus; at 200% the weeks still show', () => {
    const tree = build('countdown', snap({ prefs: ON }), 376, 184);
    expect(texts(tree)).toEqual(expect.arrayContaining(['ROAD TO EXAM', '3 weeks to go', 'This week: make it stick', 'Mixed practice across every area.']));
    let segs = 0;
    walk(tree, (n) => {
      const p = props(n);
      if (p.borderRadius && p.height === 20) segs += 1;
    });
    // 3 weeks behind (from 5 October), this week, 3 ahead.
    expect(segs).toBe(7);
    expect(texts(build('countdown', snap({ prefs: ON }), 182, 184, 'light', 2)).join(' ')).toContain('3 weeks');
  });

  it('a 2×2 caption is shortened, never cut: "Today · Operations" becomes "Operations"', () => {
    expect(captionFit('Today · Operations', 1, 400)).toBe('TODAY · OPERATIONS');
    expect(captionFit('Today · Operations', 1, 120)).toBe('OPERATIONS');
    expect(captionFit('New growth today', 1, 120)).toBe('NEW GROWTH');
    expect(captionFit('Recall card', 1, 10)).toBe('');
  });

  it('text fits the room it is given, or says so', () => {
    expect(fitText('Short words', 20, 13, 300, 40)).toEqual({ px: 20, lines: 1 });
    expect(fitText('x '.repeat(200), 20, 13, 100, 30)).toBeNull();
  });

  it('renderKind gives a light and a dark tree', () => {
    const r = renderKind('plan', snap(), { width: 376, height: 184, screenInfo: { fontScale: 1, density: 2, densityDpi: 320, screenHeightDp: 800, screenWidthDp: 412 } }, { now: NOW, revealed: false }) as { light: JSX.Element; dark: JSX.Element };
    expect(texts(buildWidgetTree(r.light))).toContain('12');
    expect(JSON.stringify(buildWidgetTree(r.dark))).toContain(dark.forest);
  });
});

describe('art', () => {
  it('the plant is drawn awake from the app’s own art, for every growth and both themes', () => {
    for (const growth of [1, 2, 3, 4, 5, 6]) {
      for (const theme of ['light', 'dark'] as const) {
        const svg = plantSvg({ species: 'narra', name: 'narra', growth, grew: null }, theme)!;
        expect(svg).toMatch(/^<svg [^>]*viewBox="[-\d. ]+">/);
        expect(svg.length).toBeGreaterThan(200);
      }
    }
    expect(plantSvg({ species: 'not-a-plant', name: 'x', growth: 3, grew: null }, 'light')).toBeNull();
  });

  it('the rings are one colour (no domain colours); before the first estimate they still show (no fading)', () => {
    const c = widgetColors('paper', 'light');
    const rings = ringsSvg([70, 0, 55, 80, 66], [18, 18, 12, 26, 26], c);
    expect(rings).toMatch(/^<svg/);
    const colours = new Set(rings.match(/#[0-9A-Fa-f]{6}/g));
    expect([...colours].every((x) => x.toLowerCase() === c.accent.toLowerCase() || x.toLowerCase() === c.track.toLowerCase())).toBe(true);
    const faint = ringsSvg([0, 0, 0, 0, 0], [18, 18, 12, 26, 26], c, true);
    expect(faint).not.toContain('opacity');
    expect(faint).toContain('stroke-dasharray');
    expect(markSvg(c)).toContain(c.markLeaf);
  });

  it('the index card’s ruling: a clay margin line and faint rules, decorative', () => {
    const svg = ruledSvg(376, 184, 40, widgetColors('card', 'light'));
    expect(svg).toContain(light.clay);
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThan(3);
  });

  it('every card’s colours come from the Grove tokens', () => {
    const all = new Set<string>([...Object.values(light), ...Object.values(dark)].map((x) => String(x).toLowerCase()));
    for (const tone of ['paper', 'forest', 'plate', 'card', 'ink'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        for (const [k, v] of Object.entries(widgetColors(tone, theme))) {
          if (k === 'markLeaf' || k === 'markPair') continue;
          expect({ tone, theme, k, ok: all.has(String(v).toLowerCase()) }).toEqual({ tone, theme, k, ok: true });
        }
      }
    }
  });
});

// Screenshot harness input: every face the sheets show (not a test of its own).
const dump = process.env.WIDGET_DUMP;
(dump ? it : it.skip)('dumps every tree for the screenshot harness', () => {
  type Entry = { id: string; kind: string; size: string; w: number; h: number; theme: string; fontScale: number; key: string; label: string; tree: WidgetTree };
  const out: Entry[] = [];
  for (const kind of WIDGET_KINDS) {
    for (const [size, w, h] of SIZES[kind]) {
      for (const theme of ['light', 'dark'] as const) {
        for (const fs of [1, 1.3, 2]) {
          const face = drawn(faceFor(kind, snap({ prefs: ON })), w, h, fs);
          out.push({ id: `${kind}-${size}-${theme}-x${fs}`, kind, size, w, h, theme, fontScale: fs, key: face.key, label: face.label, tree: build(kind, snap({ prefs: ON }), w, h, theme, fs) });
        }
      }
    }
  }
  writeFileSync(dump as string, JSON.stringify(out));
  expect(out.length).toBeGreaterThan(100);
});
