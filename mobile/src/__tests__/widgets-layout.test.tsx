/**
 * Mobile 1.47, home-screen widgets: the Android layout trees.
 *
 * Builds the library's real layout tree (buildWidgetTree, plain JavaScript)
 * for every widget, at every size it offers (and the launcher minimums), in
 * light and dark, at font scales 1, 1.3, 1.5, 1.6 and 2, in its main states,
 * and checks what a learner sees and taps: the face's key word is always
 * there, the title and any figure are never cut short, Grove colours only (no
 * red), every tap target is at least 48 dp tall and labelled with minutes in
 * full, every link goes through the app's widget route, and no text is under
 * 10 sp (captions 11 sp).
 *
 * With WIDGET_DUMP=<file> it also writes every tree (and its face) to that
 * file, for the screenshot harness (scratchpad; not part of CI).
 */
import { writeFileSync } from 'fs';
import type { JSX } from 'react';
import { addDays } from '../engine/examDay';
import { buildSnapshot, DEFAULT_WIDGET_PREFS, FINAL_DAY_PLAIN, sizeClass, widgetFace, WIDGET_KINDS, type DrawContext, type SnapshotInput, type WidgetFace, type WidgetKind, type WidgetPrefs, type WidgetSnapshot } from '../engine/widgets';
import { dark, light } from '../theme/tokens';
import { markSvg, plantSvg, ringsSvg, widgetColors } from '../widgets/art';
import { forLargeText, forNarrowStrip, TAP_MIN, WIDGET_ACTIONS, WidgetLayout } from '../widgets/layouts.android';
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
};

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
    quiz: [0, 1, 2, 3].map((d) => ({
      day: addDays(TODAY, d),
      id: 'd4_070',
      stem: 'An information systems (IS) auditor is reviewing how recovery tiers are set for business processes. Which basis is BEST?',
      topic: 'Operations',
      done: false,
    })),
    ready: { enough: true, low: 68, high: 78, rings: [70, 62, 55, 80, 66], weights: [18, 18, 12, 26, 26] },
    ...over,
  };
}
const snap = (over: Partial<SnapshotInput> = {}) => buildSnapshot(input(over));
const ON: WidgetPrefs = { details: 'show', readiness: 'show', timing: true };

/** The sizes each kind offers (dp, Pixel-style 4-column grid), its default first, then the launcher minimum. */
const SIZES: Record<WidgetKind, [string, number, number][]> = {
  plan: [['2x2', 182, 184], ['4x2', 376, 184], ['min', 130, 110]],
  plant: [['2x2', 182, 184], ['4x2', 376, 184], ['1x1', 86, 86], ['min', 40, 40]],
  think: [['4x2', 376, 184], ['2x2', 182, 184], ['4x1', 376, 86], ['min', 130, 40]],
  week: [['4x1', 376, 86], ['2x2', 182, 184], ['1x1', 86, 86], ['min', 40, 40]],
  question: [['4x2', 376, 184], ['4x3', 376, 282], ['min', 250, 110]],
  revisit: [['2x2', 182, 184], ['4x1', 376, 86], ['min', 130, 40]],
  countdown: [['2x2', 182, 184], ['4x2', 376, 184], ['min', 130, 110]],
  readiness: [['2x2', 182, 184], ['4x2', 376, 184], ['min', 130, 110]],
};
const SCALES = [1, 1.3, 1.5, 1.6, 2];
// Thousands of trees per scenario: give a busy CI machine time.
jest.setTimeout(60_000);

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
  ['done', snap({ prefs: ON, plan: { ...PLAN, done: true, left: 0 }, quiz: input().quiz.map((q) => ({ ...q, done: true })) })],
  ['new learner', snap({ studyDays: [], studyDaysTotal: 0, plant: null, answeredAny: false, plan: { ...PLAN, first: true, back: 0 } })],
  ['before onboarding', null],
];

describe('every widget, size, theme and font scale builds a tree a learner can read and tap', () => {
  it.each(SCENARIOS)('%s', (_name, s, ctx = {}) => {
    for (const kind of WIDGET_KINDS) {
      const face = faceFor(kind, s, ctx);
      for (const [, w, h] of SIZES[kind]) {
        for (const theme of ['light', 'dark'] as const) {
          for (const fontScale of SCALES) {
            const tree = build(kind, s, w, h, theme, fontScale, ctx);
            const f = drawn(face, w, h, fontScale);
            const all = texts(tree);
            const joined = all.join(' ');
            // The key word survives every size and scale (a very small 1×1 shows its mark; TalkBack has the label).
            if (w >= 70 && h >= 60 && f.key) expect({ kind, w, h, fontScale, ok: joined.toLowerCase().includes(f.key.toLowerCase()) }).toEqual({ kind, w, h, fontScale, ok: true });
            // Never more than two pills, and the main tap stays where there is room for it.
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

describe('the words a learner sees', () => {
  it('Today’s plan, 4×2: the topic, the revisit line, "Start · 12 min" and the short set', () => {
    const all = texts(build('plan', snap(), 376, 184));
    expect(all).toEqual(expect.arrayContaining(['Today', 'Operations', 'Starts with 6 questions to revisit', 'Start · 12 min', 'Short on time? 5 questions ›']));
  });

  it('Today’s plan, 2×2: one main pill (Start · 12 min), no short set', () => {
    const all = texts(build('plan', snap(), 182, 184));
    expect(all).toContain('Start · 12 min');
    expect(all.join(' ')).not.toContain('Short on time');
  });

  it('Today’s plan at the launcher minimum: the words, and the whole widget starts the plan', () => {
    const tree = build('plan', snap(), 130, 110);
    expect(texts(tree)).toContain('Operations');
    expect(String((props(tree).clickActionData as { uri: string }).uri)).toContain('go=start');
  });

  it('large text drops the extras, keeps the main words and Start', () => {
    const all = texts(build('plan', snap({ prefs: ON }), 376, 184, 'light', 2));
    expect(all).toContain('Operations');
    expect(all).toContain('Start · 12 min');
    expect(all.join(' ')).not.toMatch(/Short on time|Exam in/);
  });

  it('This week strip: seven leaves (about 16×22 dp) with day letters, and "3 days this week"', () => {
    const tree = build('week', snap(), 376, 86);
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['M', 'T', 'W', 'F', 'S', '3 days this week']));
    let leaves = 0;
    walk(tree, (n) => {
      const p = props(n);
      if (n.type === 'SvgWidget' && p.width === 16 && p.height === 22) leaves += 1;
    });
    expect(leaves).toBe(7);
  });

  it('This week at 200%: the short words on one line ("3 this week")', () => {
    expect(texts(build('week', snap(), 376, 86, 'light', 2))).toContain('3 this week');
  });

  it('This week 1×1: one leaf and the count; a very small cell: the count only', () => {
    expect(texts(build('week', snap(), 86, 86))).toEqual(['3', 'this week']);
    expect(texts(build('week', snap(), 40, 40))).toEqual(['3']);
  });

  it('Today’s rule: "Show the rule" is a widget click (no app opens); then Had it / Not yet; then Try one', () => {
    const ask = build('think', snap(), 376, 184);
    expect(props(ask).clickAction).toBe('REVEAL');
    expect(texts(ask)).toContain('Show the rule');
    const shown = build('think', snap(), 376, 184, 'light', 1, { revealed: true });
    expect(texts(shown)).toEqual(expect.arrayContaining(['Recommend, don’t implement.', 'Had it', 'Not yet']));
    const after = build('think', snap(), 376, 184, 'light', 1, { revealed: true, judged: 'had' });
    expect(texts(after)).toContain('Try one');
  });

  it('Today’s rule, 2×2 and 4×1: the short prompt, one prompt per face', () => {
    for (const [w, h] of [
      [182, 184],
      [376, 86],
    ]) {
      const all = texts(build('think', snap(), w, h));
      expect(all).toContain('Asked to build the control. Your move?');
      expect(all.join(' ')).not.toMatch(/Management asks/);
    }
  });

  it('Quick question: the stem with BEST, the question line, "Answer", never the options', () => {
    const all = texts(build('question', snap(), 376, 282));
    expect(all.some((t) => t.includes('BEST'))).toBe(true);
    expect(all).toContain('Before the options: what would you do?');
    expect(all).toContain('Answer');
    expect(all.join(' ')).not.toMatch(/\(A\)|\bA\)/);
  });

  it('Readiness, range chosen: the range and "a study estimate"; rings only: no number', () => {
    expect(texts(build('readiness', snap({ prefs: ON, examDay: addDays(TODAY, 40) }), 376, 184))).toEqual(expect.arrayContaining(['68–78', '%', 'A study estimate, not a prediction.']));
    const priv = texts(build('readiness', snap({ prefs: { ...ON, readiness: 'private' } }), 182, 184)).join(' ');
    expect(priv).not.toMatch(/\d+–\d+|%/);
  });

  it('Your plant, 2×2: the plant is the hero (about 112 dp) and the stage word stays at 200%', () => {
    const tree = build('plant', snap(), 182, 184);
    let hero = 0;
    walk(tree, (n) => {
      const p = props(n);
      if (n.type === 'SvgWidget' && ((p.width as number) ?? 0) >= 100) hero = p.width as number;
    });
    expect(hero).toBe(112);
    expect(texts(build('plant', snap(), 182, 184, 'light', 2))).toContain('Shoot');
  });

  it('Exam countdown at 200% keeps "Exam in 3 weeks"', () => {
    expect(texts(build('countdown', snap({ prefs: ON }), 182, 184, 'light', 2))).toContain('Exam in 3 weeks');
  });

  it('the forest panel uses the forest tokens; paper widgets the paper tokens, per theme', () => {
    expect(JSON.stringify(props(build('plan', snap(), 376, 184, 'dark')))).toContain(dark.forest);
    expect(props(build('plant', snap(), 182, 184, 'light')).backgroundColor).toBe(light.raised2);
    expect(props(build('plant', snap(), 182, 184, 'dark')).backgroundColor).toBe(dark.raised);
  });

  it('renderKind gives a light and a dark tree', () => {
    const r = renderKind('plan', snap(), { width: 376, height: 184, screenInfo: { fontScale: 1, density: 2, densityDpi: 320, screenHeightDp: 800, screenWidthDp: 412 } }, { now: NOW, revealed: false }) as { light: JSX.Element; dark: JSX.Element };
    expect(texts(buildWidgetTree(r.light))).toContain('Operations');
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

  it('the rings are one colour (no domain colours); the mark uses the Grove leaf colour', () => {
    const c = widgetColors('paper', 'light');
    const rings = ringsSvg([70, 0, 55, 80, 66], [18, 18, 12, 26, 26], c);
    expect(rings).toMatch(/^<svg/);
    const colours = new Set(rings.match(/#[0-9A-Fa-f]{6}/g));
    expect([...colours].every((x) => x.toLowerCase() === c.accent.toLowerCase() || x.toLowerCase() === c.track.toLowerCase())).toBe(true);
    expect(markSvg(c)).toContain(c.markLeaf);
  });
});

// Screenshot harness input: every face the sheets show (not a test of its own).
const dump = process.env.WIDGET_DUMP;
(dump ? it : it.skip)('dumps every tree for the screenshot harness', () => {
  type Entry = { id: string; kind: string; size: string; w: number; h: number; theme: string; state: string; fontScale: number; title: string; short: string; key: string; tree: WidgetTree };
  const out: Entry[] = [];
  const add = (state: string, kind: WidgetKind, s: WidgetSnapshot | null, sizes = SIZES[kind].filter(([n]) => n !== 'min'), opts: { ctx?: Partial<DrawContext>; now?: number; fontScale?: number } = {}) => {
    for (const [size, w, h] of sizes) {
      for (const theme of ['light', 'dark'] as const) {
        const fs = opts.fontScale ?? 1;
        const ctx = { ...(opts.ctx ?? {}), now: opts.now ?? NOW };
        const face = drawn(widgetFace(kind, s, { revealed: false, ...ctx }), w, h, fs);
        out.push({
          id: `${kind}-${state}-${size}-${theme}${fs !== 1 ? `-x${fs}` : ''}`,
          kind,
          size,
          w,
          h,
          theme,
          state,
          fontScale: fs,
          title: face.titleStyle === 'number' ? face.title : sizeClass(w, h) === 'small' && face.short ? face.short : face.title,
          short: face.short ?? '',
          key: w >= 70 && h >= 60 ? face.key : '',
          tree: build(kind, s, w, h, theme, fs, ctx),
        });
      }
    }
  };
  const base = snap({ prefs: ON });
  // Readiness rests from 3 weeks out: its main sheet shows a learner further away, so the range is on it.
  const baseFor = (k: WidgetKind) => (k === 'readiness' ? snap({ prefs: ON, examDay: addDays(TODAY, 40) }) : base);
  const off = snap({ prefs: { details: 'hide', readiness: 'private', timing: true } });
  for (const kind of WIDGET_KINDS) add('normal', kind, baseFor(kind));
  for (const kind of WIDGET_KINDS) add('details-off', kind, off, [SIZES[kind][0]]);
  for (const kind of WIDGET_KINDS) for (const fs of [1.3, 1.6, 2]) add('large-text', kind, baseFor(kind), SIZES[kind].filter(([n]) => n !== 'min').slice(0, 2), { fontScale: fs });
  for (const kind of WIDGET_KINDS) add('launcher-min', kind, baseFor(kind), SIZES[kind].filter(([n]) => n === 'min'));
  add('done', 'plan', snap({ prefs: ON, plan: { ...PLAN, done: true, left: 0 } }));
  add('next-morning', 'plan', snap({ prefs: ON, plan: { ...PLAN, done: true, left: 0 } }), undefined, { now: at('2026-10-30', 6) });
  add('first', 'plan', snap({ plan: { ...PLAN, first: true, left: 6, back: 0 }, studyDays: [], studyDaysTotal: 0 }));
  add('back-after-days', 'plan', snap({ studyDays: ['2026-10-20', '2026-10-25'] }));
  add('final-week', 'plan', snap({ prefs: ON, examDay: addDays(TODAY, 4), plan: { ...PLAN, finalDay: FINAL_DAY_PLAIN[4] } }));
  add('eve', 'plan', snap({ prefs: ON, examDay: addDays(TODAY, 1) }));
  add('exam-day', 'plan', snap({ prefs: ON, examDay: TODAY }));
  add('monday', 'week', snap({ studyDays: ['2026-10-20'] }), undefined, { now: at('2026-10-26') });
  add('first', 'week', snap({ studyDays: [], studyDaysTotal: 0 }));
  add('strong', 'week', snap({ studyDays: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'] }), undefined, { now: at('2026-11-01') });
  add('final-week', 'week', snap({ prefs: ON, examDay: addDays(TODAY, 4) }));
  add('off', 'readiness', snap());
  add('rings-only', 'readiness', snap({ prefs: { ...ON, readiness: 'private' }, examDay: addDays(TODAY, 40) }));
  add('resting', 'readiness', snap({ prefs: ON, examDay: addDays(TODAY, 14) }));
  add('first-estimate', 'readiness', snap({ prefs: ON, ready: { enough: false, needed: 14, rings: [10, 0, 0, 20, 0], weights: [18, 18, 12, 26, 26] } }));
  add('revealed', 'think', base, undefined, { ctx: { revealed: true } });
  add('not-yet', 'think', base, undefined, { ctx: { revealed: true, judged: 'notyet' } });
  add('had-it', 'think', base, undefined, { ctx: { revealed: true, judged: 'had' } });
  add('exam-eve', 'think', snap({ prefs: ON, examDay: addDays(TODAY, 1) }));
  add('answered', 'question', snap({ quiz: input().quiz.map((q) => ({ ...q, done: true })) }));
  add('missed-only', 'revisit', snap({ plan: { ...PLAN, back: 2, backMissed: true } }));
  add('nothing', 'revisit', snap({ plan: { ...PLAN, back: 0 } }));
  add('before-plan', 'revisit', base, undefined, { now: at('2026-10-30') });
  add('new-learner', 'revisit', snap({ answeredAny: false }));
  add('eve', 'revisit', snap({ prefs: ON, examDay: addDays(TODAY, 1) }));
  add('grew-today', 'plant', snap({ plant: { species: 'narra', name: 'narra', growth: 4, grew: TODAY, style: 'botanical' } }));
  add('seed', 'plant', snap({ plant: { species: 'narra', name: 'narra', growth: 1, grew: null, style: 'botanical' } }));
  add('storybook', 'plant', snap({ plant: { species: 'sampaguita', name: 'sampaguita', growth: 5, grew: null, style: 'storybook' } }));
  add('no-plant', 'plant', snap({ plant: null }));
  add('timing-off', 'countdown', snap());
  add('final-week', 'countdown', snap({ prefs: ON, examDay: addDays(TODAY, 4) }));
  add('eve', 'countdown', snap({ prefs: ON, examDay: addDays(TODAY, 1) }));
  add('exam-day', 'countdown', snap({ prefs: ON, examDay: TODAY }));
  add('setup', 'plan', null, [SIZES.plan[0]]);
  writeFileSync(dump as string, JSON.stringify(out));
  expect(out.length).toBeGreaterThan(100);
});
