/**
 * Mobile 1.47, home-screen widgets: the pure engine (engine/widgets.ts).
 *
 * Covers the snapshot (shape, privacy, size cap, safe reading), every
 * widget's faces (1.48: the Recall card, Key term and Road to exam jobs), the shared exam wording, the privacy switches (every
 * widget × every exam stage × Details on/off × exam timing on/off), plain
 * words, links, Today's rule's reveal and self-check, the one-time
 * suggestion and re-ask, and the "choose" screen's words.
 */
import {
  buildSnapshot,
  clip,
  countdownConfigCopy,
  DEFAULT_WIDGET_PREFS,
  EXAM_COPY,
  examPhase,
  faceLinks,
  fitSnapshot,
  FINAL_DAY_PLAIN,
  GOAL_ROUTES,
  judgedToday,
  kindOfName,
  LAPSE_DAYS,
  lockFace,
  mondayOf,
  msToNextMidnight,
  parseSnapshot,
  parseWidgetTap,
  PICKER_LABELS,
  PLANT_LINE,
  readinessConfigCopy,
  recallDueFrom,
  recallIdFor,
  ROAD_FOCUS,
  readinessReaskDue,
  readReveal,
  RECOMMENDED_KINDS,
  REVEAL_TAP_GUARD_MS,
  ruleDueFrom,
  showsTiming,
  sizeClass,
  snapshotBytes,
  SNAPSHOT_MAX_BYTES,
  thinkIdFor,
  tooSoonAfterReveal,
  weekdayIndex,
  weekLeaves,
  weeksToExam,
  widgetFace,
  widgetLink,
  WIDGET_KINDS,
  WIDGET_NAMES,
  WIDGET_TITLES,
  widgetOfferDue,
  withoutWidget,
  withReveal,
  withSelfCheck,
  type DrawContext,
  type SnapshotInput,
  type WidgetFace,
  type WidgetKind,
  type WidgetPrefs,
  type WidgetSnapshot,
} from '../engine/widgets';
import { addDays } from '../engine/examDay';

// Thursday 29 October 2026, 09:00 local.
const at = (day: string, h = 9, m = 0) => {
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime();
};
const TODAY = '2026-10-29';
const NOW = at(TODAY);
const PLAN = {
  day: TODAY,
  left: 12,
  done: false,
  first: false,
  title: 'Operations',
  short: 'Operations',
  meta: '10 questions, most points to gain',
  back: 7,
  backMissed: false,
  shortSet: true,
  next: 'Security',
  nextMin: 18,
  finalDay: null,
  count: 10,
  steps: 3,
  stepsDone: 1,
};

function input(over: Partial<SnapshotInput> = {}): SnapshotInput {
  return {
    now: NOW,
    onboarded: true,
    prefs: { ...DEFAULT_WIDGET_PREFS },
    examDay: addDays(TODAY, 30),
    dailyMinutes: 20,
    plan: { ...PLAN },
    studyDays: ['2026-10-26', '2026-10-27', '2026-10-28'],
    studyDaysTotal: 9,
    answeredAny: true,
    plant: { species: 'narra', name: 'narra', growth: 3, grew: null, style: 'botanical' },
    think: [0, 1, 2, 3].map((d) => ({
      day: addDays(TODAY, d),
      id: d === 0 ? 'recommend-dont-implement' : `p${d}`,
      ask: 'Management asks the auditor to set up the missing control. What should the auditor do?',
      short: 'Asked to build the control. Your move?',
      title: 'Recommend, don’t implement',
      rule: 'The auditor assesses, reports and recommends; management designs, implements and owns the fix.',
      try: 'd1_010',
    })),
    recall: [0, 1, 2, 3].map((d) => ({
      day: addDays(TODAY, d),
      id: `d4_07${d}`,
      stem: 'Which basis is BEST for setting recovery tiers for business processes?',
      answer: 'The results of the business impact analysis',
      cue: 'recovery priorities follow business impact.',
      weeks: 3,
      topic: 'Operations',
    })),
    terms: [0, 1, 2, 3].map((d) => ({ day: addDays(TODAY, d), id: `t4_1${d}`, term: 'Recovery point objective', short: 'RPO', meaning: 'The most data, measured in time, the business can accept losing.', topic: 'Operations', note: '4B3.2' })),
    road: { from: '2026-10-05', stage: 'practice' },
    ready: null,
    ...over,
  };
}
const snap = (over: Partial<SnapshotInput> = {}) => buildSnapshot(input(over));
const prefs = (p: Partial<WidgetPrefs>): WidgetPrefs => ({ ...DEFAULT_WIDGET_PREFS, ...p });
const face = (kind: WidgetKind, s: WidgetSnapshot | null = snap(), now = NOW, ctx: Partial<DrawContext> = {}) => widgetFace(kind, s, { now, revealed: false, ...ctx });
/** Every word a face can put on the screen (TalkBack's label too). */
const words = (f: WidgetFace) => [f.caption, f.title, f.unit, f.short, f.line, f.shortLine, f.line2, f.badge, f.action?.label, f.action2?.label, f.label].filter(Boolean).join(' | ');
/** Only what is drawn (not the spoken label). */
const shown = (f: WidgetFace) => [f.caption, f.title, f.unit, f.short, f.line, f.shortLine, f.line2, f.badge, f.action?.label, f.action2?.label].filter(Boolean).join(' | ');
const READY = { enough: true as const, low: 68, high: 78, rings: [70, 62, 55, 80, 66], weights: [18, 18, 12, 26, 26] };

/** Every exam stage, as days from today to the exam (null = no date). */
const STAGES: [string, number | null][] = [
  ['no date', null],
  ['far', 30],
  ['3 weeks', 21],
  ['final week', 5],
  ['eve', 1],
  ['exam day', 0],
  ['after', -3],
];

describe('names and kinds', () => {
  it('declares eight kinds, recommended first, each with a stable Android name and a plain title', () => {
    expect(WIDGET_KINDS).toHaveLength(8);
    expect(WIDGET_KINDS.slice(0, 4)).toEqual(['plan', 'plant', 'think', 'week']);
    expect(RECOMMENDED_KINDS).toEqual(['plan', 'plant', 'think', 'week']);
    expect(new Set(Object.values(WIDGET_NAMES)).size).toBe(8);
    for (const k of WIDGET_KINDS) expect(kindOfName(WIDGET_NAMES[k])).toBe(k);
    expect(kindOfName('Nope')).toBeNull();
    expect(WIDGET_TITLES.think).toBe('Today’s rule');
    // 1.48: three new jobs; the Android names stay, and the picker keeps its names until the next store build.
    expect(WIDGET_TITLES.question).toBe('Recall card');
    expect(WIDGET_TITLES.revisit).toBe('Key term');
    expect(WIDGET_TITLES.countdown).toBe('Road to exam');
    expect(WIDGET_NAMES.question).toBe('QuickQuestion');
    expect(WIDGET_NAMES.revisit).toBe('Revisit');
    expect(WIDGET_NAMES.countdown).toBe('ExamCountdown');
    expect(PICKER_LABELS.question).toBe('Quick question');
    expect(PICKER_LABELS.plan).toBe(WIDGET_TITLES.plan);
  });
});

describe('the snapshot', () => {
  it('holds no name, no exam name, no answers, and no readiness unless the readiness widget is on', () => {
    const s = snap();
    const json = JSON.stringify(s);
    expect(s.ready).toBeNull();
    expect(json).not.toMatch(/displayName|answers|mistakes|email|"cert"|"exam"\s*:|CISA/i);
    expect(snap({ ready: READY }).ready).toBeNull();
    expect(snap({ ready: READY, prefs: prefs({ readiness: 'private' }) }).ready).toEqual(READY);
  });

  it('stays under 8 KB with long real-world text, and fitSnapshot trims if ever needed', () => {
    const long = 'word '.repeat(200);
    const s = snap({
      plan: { ...PLAN, title: long, meta: long, next: long, finalDay: long, short: long },
      think: input().think.map((t) => ({ ...t, ask: long, short: long, title: long, rule: long })),
      recall: input().recall!.map((q) => ({ ...q, stem: long, answer: long, cue: long, topic: long })),
      terms: input().terms!.map((t) => ({ ...t, term: long, meaning: long, topic: long })),
      studyDays: Array.from({ length: 40 }, (_, i) => addDays(TODAY, -i)),
      prefs: prefs({ readiness: 'show' }),
      ready: READY,
    });
    expect(s.week.days).toHaveLength(14);
    expect(s.plan!.short.length).toBeLessThanOrEqual(16);
    expect(snapshotBytes(s)).toBeLessThanOrEqual(SNAPSHOT_MAX_BYTES);
    const huge = { ...s, think: Array.from({ length: 4 }, () => ({ ...s.think[0], rule: 'é'.repeat(2000) })) } as WidgetSnapshot;
    expect(snapshotBytes(fitSnapshot(huge))).toBeLessThan(snapshotBytes(huge));
  });

  it('clips long text on a word boundary with an ellipsis', () => {
    expect(clip('short', 10)).toBe('short');
    const c = clip('Business goals and governance before technology always', 30);
    expect(c.length).toBeLessThanOrEqual(30);
    expect(c.endsWith('…')).toBe(true);
  });

  it('round-trips through parseSnapshot, and rejects junk', () => {
    const s = snap({ prefs: { details: 'hide', readiness: 'show', timing: true }, ready: READY });
    expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
    for (const bad of [null, 42, 'nope', '{', { v: 2 }, [], { v: '1' }]) expect(parseSnapshot(bad)).toBeNull();
  });

  it('reads a tampered snapshot safely (odd prefs fall back to the private defaults)', () => {
    const s = JSON.parse(JSON.stringify(snap())) as Record<string, unknown>;
    s.prefs = { details: 'loud', readiness: 'yes', timing: 'true' };
    s.ready = READY;
    s.examDay = '2026-13-99x';
    s.week = { days: ['nope', TODAY], total: 1e9 };
    s.plant = { species: 'narra', growth: 99, grew: 'later' };
    s.think = [{ day: TODAY, id: '../x', ask: 'a' }];
    const p = parseSnapshot(s)!;
    expect(p.prefs).toEqual({ details: 'show', readiness: 'off', timing: false });
    expect(p.ready).toBeNull();
    expect(p.examDay).toBeNull();
    expect(p.week).toEqual({ days: [TODAY], total: 99 });
    expect(p.plant).toEqual({ species: 'narra', name: 'narra', growth: 6, grew: null });
    expect(p.think).toEqual([]);
  });

  it('1.48: reads the Recall card, Key term and road safely; a 1.47 snapshot (with `quiz`) still reads', () => {
    const s = JSON.parse(JSON.stringify(snap())) as Record<string, unknown>;
    s.recall = [{ day: TODAY, id: '../x', stem: 's', answer: 'a' }, { day: TODAY, id: 'd1_001', stem: '', answer: 'a' }];
    s.terms = [{ day: TODAY, id: 't1_1', term: 'x', meaning: 'm', note: '../../etc' }];
    s.road = { from: 'soon', stage: 'practice' };
    const p = parseSnapshot(s)!;
    expect(p.recall).toEqual([]);
    expect(p.terms).toEqual([]);
    expect(p.road).toBeNull();
    const old = JSON.parse(JSON.stringify(snap())) as Record<string, unknown>;
    delete old.recall;
    delete old.terms;
    delete old.road;
    old.quiz = [{ day: TODAY, id: 'd4_070', stem: 'x', topic: 'y', done: false }];
    (old.plan as Record<string, unknown>).count = undefined;
    const q = parseSnapshot(old)!;
    expect(q.recall).toEqual([]);
    expect(q.plan?.steps).toBe(3);
    expect(q.plan?.count).toBe(0);
    expect(face('question', q).title).toBe('Questions you get right come back here');
    expect(snap({ road: { from: '2026-10-05', stage: 'nope' as never } }).road?.stage).toBe('practice');
  });
});

describe('calendar helpers', () => {
  it('weeks start on Monday', () => {
    expect(weekdayIndex('2026-10-26')).toBe(0);
    expect(weekdayIndex('2026-11-01')).toBe(6);
    expect(mondayOf('2026-11-01')).toBe('2026-10-26');
  });
  it('counts calendar weeks (Monday to Monday) from 8 days out; the number changes only on a Monday', () => {
    expect(weeksToExam(null, TODAY)).toBeNull();
    expect(weeksToExam(addDays(TODAY, 7), TODAY)).toBeNull();
    expect(weeksToExam(addDays(TODAY, 8), TODAY)).toBe(1);
    // Exam Thursday 19 Nov: 3 weeks from Monday 26 Oct to Monday 16 Nov, all week long.
    const exam = '2026-11-19';
    for (const d of ['2026-10-26', '2026-10-29', '2026-11-01']) expect(weeksToExam(exam, d)).toBe(3);
    expect(weeksToExam(exam, '2026-11-02')).toBe(2);
  });
  it('names the exam phase by calendar day', () => {
    expect(examPhase(null, TODAY)).toBe('none');
    expect(examPhase(addDays(TODAY, 30), TODAY)).toBe('far');
    expect(examPhase(addDays(TODAY, 7), TODAY)).toBe('week');
    expect(examPhase(addDays(TODAY, 1), TODAY)).toBe('eve');
    expect(examPhase(TODAY, TODAY)).toBe('day');
    expect(examPhase(addDays(TODAY, -1), TODAY)).toBe('after');
  });
  it('sorts sizes into tiny, strip, small, medium and large', () => {
    expect(sizeClass(86, 86)).toBe('tiny');
    expect(sizeClass(376, 86)).toBe('strip');
    expect(sizeClass(182, 184)).toBe('small');
    expect(sizeClass(130, 110)).toBe('strip');
    expect(sizeClass(376, 184)).toBe('medium');
    expect(sizeClass(376, 282)).toBe('large');
  });
});

describe('the shared exam wording', () => {
  it('one table, calm, and never "You’ve done the work"', () => {
    expect(EXAM_COPY.day).toEqual({ caption: 'Exam day', title: 'Good luck.', line: 'One question at a time.' });
    expect(EXAM_COPY.week.title).toBe('Settle in. Don’t cram.');
    expect(EXAM_COPY.eve.title).toBe('Light review, then rest.');
    expect(JSON.stringify(EXAM_COPY)).not.toMatch(/done the work|you’re ready|you're ready|\bpass\b/i);
  });

  it('two widgets on one screen say the same thing on each exam stage', () => {
    const on = prefs({ timing: true });
    for (const d of [5, 1, 0]) {
      const s = snap({ prefs: on, examDay: addDays(TODAY, d) });
      const phase = d === 0 ? 'day' : d === 1 ? 'eve' : 'week';
      const c = EXAM_COPY[phase];
      const plan = face('plan', s);
      const count = face('countdown', s);
      const week = face('week', s);
      expect(count.title).toBe(c.title);
      expect(week.title).toBe(c.title);
      expect(plan.caption).toBe(c.caption);
      if (phase !== 'week') expect(plan.title).toBe(c.title);
    }
  });
});

describe('privacy switches: every widget × every exam stage × Details × exam timing', () => {
  const EXAM_WORDS = /exam|final week|weeks? to|weeks? left|good luck|light review, then rest|settle in/i;
  const TOPICS = /Operations|Security|business impact|recovery tiers|Recommend, don’t implement|Management asks|Asked to build/;
  const PERSONAL_COUNTS = /\b(7|68|78)\b/;
  for (const kind of WIDGET_KINDS) {
    for (const [stage, d] of STAGES) {
      for (const details of ['show', 'hide'] as const) {
        for (const timing of [true, false]) {
          it(`${kind} · ${stage} · details ${details} · timing ${timing ? 'on' : 'off'}`, () => {
            const s = snap({ prefs: { details, timing, readiness: kind === 'readiness' ? 'show' : 'off' }, examDay: d === null ? null : addDays(TODAY, d), ready: READY });
            for (const ctx of [{}, { revealed: true }, { revealed: true, judged: 'had' as const }]) {
              const f = face(kind, s, NOW, ctx);
              // The Recall card's "Exam cue:" label names a kind of tip (the app's own), not the learner's exam.
              const all = words(f).replace(/Exam cue:/g, 'Cue:');
              if (!(timing && details === 'show')) expect(all).not.toMatch(EXAM_WORDS);
              if (details === 'hide') {
                expect(all).not.toMatch(TOPICS);
                expect(all).not.toMatch(PERSONAL_COUNTS);
              }
              expect(showsTiming(s)).toBe(timing && details === 'show');
            }
          });
        }
      }
    }
  }

  it('the Readiness number shows only with "show", Details on, and more than 21 days to the exam', () => {
    const r = (p: Partial<WidgetPrefs>, days: number | null = 30) => face('readiness', snap({ prefs: prefs(p), ready: READY, examDay: days === null ? null : addDays(TODAY, days) }));
    expect(r({ readiness: 'show' }).title).toBe('68–78');
    expect(r({ readiness: 'private' }).title).not.toMatch(/\d/);
    expect(r({ readiness: 'show', details: 'hide' }).title).not.toMatch(/\d/);
    expect(r({ readiness: 'show' }, 21).title).not.toMatch(/\d/);
    expect(r({ readiness: 'show' }, null).title).toBe('68–78');
    // Rings only: TalkBack says it was the learner's choice (the face no longer repeats it at every glance).
    expect(r({ readiness: 'private' }).label).toMatch(/You chose/);
  });
});

describe('plain words on every face', () => {
  const BANNED = /\bpass(ed|ing)?\b|guarantee|you(’|')re ready|came back|pace check|\bBIA\b|of 6|streak|behind|falling|catch up|don’t break|never the date|weeks, never|say it in your head|weakest/i;
  it('no pass words, no designer notes, no jargon, on any widget at any stage', () => {
    for (const kind of WIDGET_KINDS) {
      for (const [, d] of STAGES) {
        for (const p of [prefs({ timing: true, readiness: 'show' }), prefs({ readiness: 'private' })]) {
          const s = snap({ prefs: p, examDay: d === null ? null : addDays(TODAY, d), ready: READY });
          for (const ctx of [{}, { revealed: true }, { revealed: true, judged: 'notyet' as const }]) {
            const f = face(kind, s, NOW, ctx);
            expect(words(f)).not.toMatch(BANNED);
            expect(words(f)).not.toMatch(/\bReviews?\b/);
            expect(words(f)).not.toMatch(/\b\d{3,} questions\b/);
          }
        }
      }
    }
  });

  it('the final week’s days are in plain words', () => {
    for (const w of Object.values(FINAL_DAY_PLAIN)) expect(w).not.toMatch(/pace check|drill|sprint/i);
  });
});

describe('Today’s plan', () => {
  it('a normal day: the real task ("10 questions"), the topic, the steps, minutes on the pill, and the short set', () => {
    const f = face('plan');
    expect(f.tone).toBe('forest');
    expect(f.caption).toBe('Today · Operations');
    expect(f.title).toBe('10');
    expect(f.titleStyle).toBe('number');
    expect(f.unit).toBe('questions');
    expect(f.short).toBe('10 questions');
    expect(f.steps).toEqual({ total: 3, done: 1 });
    expect(f.aside).toBe('step 2 of 3');
    expect(f.line).toBe('About 12 min left. Starts with 7 questions to revisit.');
    expect(f.line2).toBeUndefined();
    expect(f.action?.label).toBe('Start · 12 min');
    expect(f.action2?.label).toBe('Short on time? 5 questions');
    // One TalkBack sentence with the state.
    expect(f.label).toBe('Today’s plan, step 2 of 3: 10 questions in Operations, about 12 minutes. Starts with 7 questions to revisit.');
  });

  it('a lesson: its title in words, no number', () => {
    const f = face('plan', snap({ plan: { ...PLAN, count: 0, title: 'When a release can wait', short: 'New systems' } }));
    expect(f.title).toBe('When a release can wait');
    expect(f.titleStyle).toBe('serif');
    expect(f.caption).toBe('Today · New systems');
  });

  it('exam timing on: weeks to the exam as a quiet third line', () => {
    expect(face('plan', snap({ prefs: prefs({ timing: true }) })).line2).toBe('Exam in 4 weeks');
  });

  it('1.48, shared screens: never says what was missed, only what comes back to revisit', () => {
    expect(face('plan', snap({ plan: { ...PLAN, back: 2, backMissed: true } })).line).toBe('About 12 min left. Starts with 2 questions to revisit.');
    expect(face('plan', snap({ plan: { ...PLAN, back: 1, backMissed: true } })).line).toBe('About 12 min left. Starts with 1 question to revisit.');
    for (const k of WIDGET_KINDS) expect(words(face(k, snap({ plan: { ...PLAN, back: 2, backMissed: true } })))).not.toMatch(/\bmissed\b|wrong|incorrect/i);
  });

  it('a new learner: the first five questions', () => {
    const f = face('plan', snap({ plan: { ...PLAN, first: true, left: 6, back: 0 } }));
    expect(f.title).toBe('Your first 5 questions');
    expect(f.action?.label).toBe('Start · 6 min');
  });

  it('done: "Plan done." and what comes next, no Start (the leaves live on This week only)', () => {
    const f = face('plan', snap({ plan: { ...PLAN, done: true, left: 0, stepsDone: 3 } }));
    expect(f.title).toBe('Plan done.');
    expect(f.line).toBe('Next: Security, about 18 min.');
    expect(f.art).toBeUndefined();
    expect(f.steps).toEqual({ total: 3, done: 3 });
    expect(f.action).toBeUndefined();
    expect(words(f)).not.toMatch(/more|again|keep going/i);
  });

  it('the next morning, before the app opens: the real topic and minutes from yesterday’s plan', () => {
    const f = face('plan', snap({ plan: { ...PLAN, done: true, left: 0 }, studyDays: [TODAY] }), at('2026-10-30', 6));
    expect(f.title).toBe('Security');
    expect(f.action?.label).toBe('Start · 18 min');
    expect(f.action2?.label).toBe('Short on time? 5 questions');
    // And never "done" on a new day.
    expect(words(f)).not.toMatch(/done/i);
  });

  it('an older plan is never shown: the plan is ready, with the daily minutes', () => {
    const f = face('plan', snap(), at('2026-11-02'));
    expect(f.title).toBe('Your plan is ready');
    expect(f.action?.label).toMatch(/^(Start · 20 min|5 questions)/);
  });

  it(`after ${LAPSE_DAYS}+ days away, the main button is 5 questions (and the full plan is still there)`, () => {
    const s = snap({ studyDays: ['2026-10-20', '2026-10-25'] });
    const f = face('plan', s);
    expect(f.action?.label).toBe('5 questions · 6 min');
    expect(f.action?.link).toContain('go=short');
    expect(f.action2?.label).toBe('Full plan · 12 min');
    expect(words(f)).not.toMatch(/missed you|away|behind|days since/i);
    // Two days away: the normal face.
    expect(face('plan', snap({ studyDays: ['2026-10-26'] })).action?.label).toBe('Start · 12 min');
  });

  it('1.47.1: after time away, "5 questions" leads only when the plan can run it (never in exam week)', () => {
    const away = ['2026-10-20', '2026-10-25'];
    // The plan has no short set (exam week, or no review or practice item): Start, and no "5 questions" anywhere.
    for (const examDay of [addDays(TODAY, 30), addDays(TODAY, 5)]) {
      const f = face('plan', snap({ studyDays: away, examDay, plan: { ...PLAN, shortSet: false } }));
      expect(f.action?.label).toBe('Start · 12 min');
      expect(f.action?.link).toContain('go=start');
      expect(shown(f)).not.toMatch(/5 questions/);
      const hiddenFace = face('plan', snap({ studyDays: away, examDay, plan: { ...PLAN, shortSet: false }, prefs: prefs({ details: 'hide' }) }));
      expect(hiddenFace.action?.link).toContain('go=start');
    }
    // Before the app opens on an exam-week morning: the tap can't run the short set, so it isn't offered.
    for (const d of [5, 1]) {
      const f = face('plan', snap({ studyDays: away, examDay: addDays('2026-11-02', d), plan: { ...PLAN, done: true, left: 0 } }), at('2026-11-02'));
      expect(f.action?.link).toContain('go=start');
      expect(f.action2).toBeUndefined();
      expect(words(f)).not.toMatch(/5 questions/);
    }
    // Far from the exam, the same morning still leads with 5 questions.
    const far = face('plan', snap({ studyDays: away, plan: { ...PLAN, done: true, left: 0 } }), at('2026-11-02'));
    expect(far.action?.link).toContain('go=short');
  });

  it('details off: no topic, no counts, no exam', () => {
    const f = face('plan', snap({ prefs: prefs({ details: 'hide', timing: true }) }));
    expect(f.title).toBe('Your study plan');
    expect(words(f)).not.toMatch(/Operations|revisit|Exam|\b7\b|\b10\b/);
  });

  it('final week (with timing): the plain day words and no short set; the eve is calm; exam day has no Start', () => {
    const on = prefs({ timing: true });
    const wk = face('plan', snap({ prefs: on, examDay: addDays(TODAY, 4), plan: { ...PLAN, finalDay: FINAL_DAY_PLAIN[4] } }));
    expect(wk.caption).toBe('Final week');
    expect(wk.line).toBe(`About 12 min left. ${FINAL_DAY_PLAIN[4]}`);
    expect(wk.action2).toBeUndefined();
    const eve = face('plan', snap({ prefs: on, examDay: addDays(TODAY, 1) }));
    expect(eve.title).toBe(EXAM_COPY.eve.title);
    expect(eve.action?.label).toMatch(/^Start/);
    const day = face('plan', snap({ prefs: on, examDay: TODAY }));
    expect(day.title).toBe('Good luck.');
    expect(day.action).toBeUndefined();
    // After the exam, the plan is a plan again.
    expect(face('plan', snap({ prefs: on, examDay: addDays(TODAY, -2) })).caption).toBe('Today · Operations');
  });
});

describe('This week', () => {
  it('leaves for this week only, Monday first', () => {
    const l = weekLeaves(['2026-10-25', '2026-10-26', '2026-10-28', '2026-10-30'], TODAY);
    expect(l.filled).toEqual([true, false, true, false, false, false, false]);
    expect(l.today).toBe(3);
    expect(l.count).toBe(2);
  });

  it('normal: "3 study days", no denominator; a kind line that changes as the week fills; no Start', () => {
    const f = face('week');
    expect(f.title).toBe('3');
    expect(f.unit).toBe('study days');
    expect(f.line).toBe('Short days count too.');
    expect(f.action).toBeUndefined();
    expect(f.link).toBe(widgetLink('week', 'today'));
    expect(f.label).toBe('This week: 3 study days. You studied Monday, Tuesday and Wednesday. Short days count too.');
    expect(words(f)).not.toMatch(/ of |\/|streak/i);
    expect(face('week', snap({ studyDays: ['2026-10-26'] })).line).toBe('A first leaf this week.');
    expect(face('week', snap({ studyDays: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'] })).line).toBe('A steady week.');
  });

  it('no study yet this week: words, never an empty row; a tap opens Today (no Start)', () => {
    const monday = face('week', snap({ studyDays: ['2026-10-20'] }), at('2026-10-26'));
    expect(monday.title).toBe('A new week');
    expect(monday.line).toBe('5 questions · about 6 min');
    expect(monday.action).toBeUndefined();
    expect(monday.link).toContain('go=today');
    const later = face('week', snap({ studyDays: ['2026-10-20'] }));
    expect(later.title).toBe('A short start');
    expect(later.art?.type).not.toBe('leaves');
  });

  it('fewer than 2 study days ever: the first-set line, no leaves', () => {
    const f = face('week', snap({ studyDaysTotal: 1, studyDays: [TODAY] }));
    expect(f.art?.type).toBe('mark');
    expect(f.action).toBeUndefined();
  });

  it('a strong week (6 days) suggests rest', () => {
    const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    expect(face('week', snap({ studyDays: days }), at('2026-11-01')).line).toBe('Today can be your rest day.');
  });

  it('the leaves rest from 7 days before the exam to exam day; after it, a normal week', () => {
    for (const d of [7, 3, 1, 0]) expect(face('week', snap({ examDay: addDays(TODAY, d) })).art?.type).toBe('mark');
    expect(face('week', snap({ examDay: addDays(TODAY, 5) })).title).toBe('A calm week');
    expect(face('week', snap({ examDay: addDays(TODAY, -1) })).art?.type).toBe('leaves');
    expect(face('week', snap({ examDay: addDays(TODAY, 8) })).art?.type).toBe('leaves');
  });

  it('details off: leaves with a plain caption, no number', () => {
    const f = face('week', snap({ prefs: prefs({ details: 'hide' }) }));
    expect(f.title).toBe('Your week');
    expect(f.line).toBe('A leaf for each day you studied.');
    expect(f.art?.type).toBe('leaves');
  });
});

describe('Readiness (added = opt-in; rings only first)', () => {
  it('off: no number; one tap opens the exact choice', () => {
    const f = face('readiness', snap({ ready: READY }));
    expect(f.title).toBe('Choose how it shows');
    expect(f.link).toBe(widgetLink('readiness', 'readiness-setting'));
    expect(words(f)).not.toMatch(/\d/);
  });

  it('show: a range, called a study estimate, never a prediction or a pass word; single-colour rings', () => {
    const f = face('readiness', snap({ prefs: prefs({ readiness: 'show' }), ready: READY }));
    expect(f.title).toBe('68–78');
    expect(f.unit).toBe('%');
    expect(f.caption).toBe('Readiness');
    expect(f.line).toBe('A study estimate, not a prediction.');
    // The short qualifier every size keeps (1.48 QA: capitalised, it starts the line).
    expect(f.shortLine).toBe('A study estimate');
    expect(f.art).toEqual({ type: 'rings', rings: READY.rings, weights: READY.weights, faint: false });
    expect(words(f)).not.toMatch(/weakest|area to work on/i);
  });

  it('rings only: the face doesn’t repeat the learner’s choice (TalkBack still says it); what grew this week, never what shrank', () => {
    const f = face('readiness', snap({ prefs: prefs({ readiness: 'private' }), ready: READY }));
    // Nothing grew this week: a calm title, never "Rings growing" (1.48 QA).
    expect(f.title).toBe('Your rings');
    expect(f.line).toBe('Each ring is one area.');
    expect(shown(f)).not.toMatch(/You chose/);
    expect(f.label).toMatch(/You chose to hide the number/);
    const grew = face('readiness', snap({ prefs: prefs({ readiness: 'private' }), ready: { ...READY, grew: 'Security' } }));
    expect(grew.line).toBe('Security grew this week.');
    expect(grew.title).toBe('Rings growing');
    // Details off: the topic stays off the screen.
    expect(face('readiness', snap({ prefs: prefs({ readiness: 'private', details: 'hide' }), ready: { ...READY, grew: 'Security' } })).line).toBe('Your rings grew this week.');
  });

  it('rests from 21 days before the exam (rings only), whatever was chosen', () => {
    const f = face('readiness', snap({ prefs: prefs({ readiness: 'show' }), ready: READY, examDay: addDays(TODAY, 21) }));
    expect(f.title).toBe('Your rings');
    expect(f.line).toMatch(/rests for now/);
    const timed = face('readiness', snap({ prefs: prefs({ readiness: 'show', timing: true }), ready: READY, examDay: addDays(TODAY, 10) }));
    expect(timed.line).toMatch(/rests until your exam/);
  });

  it('before the first estimate: how many more answers', () => {
    const f = face('readiness', snap({ prefs: prefs({ readiness: 'show' }), ready: { enough: false, needed: 12, rings: [0, 0, 0, 0, 0], weights: [18, 18, 12, 26, 26] } }));
    expect(f.line).toMatch(/12 more answers/);
  });
});

describe('Today’s rule', () => {
  const s = snap();
  it('asks one question in an exam question’s voice, then "Show the rule" (no app opens)', () => {
    const f = face('think', s);
    expect(f.tone).toBe('card');
    expect(f.reveal).toBe('hidden');
    expect(f.label).toMatch(/^Today’s rule, hidden\./);
    expect(f.title).toMatch(/What should the auditor do\?$/);
    expect(f.short).toBe('Asked to build the control. Your move?');
    expect(f.action).toEqual({ label: 'Show the rule', link: '', widgetAction: 'REVEAL' });
    expect(f.widgetAction).toBe('REVEAL');
    expect(words(f)).not.toMatch(/Recommend, don’t implement/);
  });

  it('after the reveal: the rule, then "Had it" / "Not yet" (never a score)', () => {
    const f = face('think', s, NOW, { revealed: true });
    expect(f.title).toBe('Recommend, don’t implement.');
    expect(f.action?.widgetAction).toBe('HAD');
    expect(f.action2?.widgetAction).toBe('NOTYET');
    expect(words(f)).not.toMatch(/score|streak|points|%/);
  });

  it('after the self-check: "Try one" opens a question that tests the rule', () => {
    const had = face('think', s, NOW, { revealed: true, judged: 'had' });
    expect(had.action).toEqual({ label: 'Try one', link: widgetLink('think', 'question', 'd1_010') });
    expect(had.line2).toBe('A new one each morning.');
    expect(face('think', s, NOW, { revealed: true, judged: 'notyet' }).line2).toBe('It comes back in a few days.');
  });

  it('rotates by calendar day from the saved days ahead', () => {
    expect(thinkIdFor(s, NOW)).toBe('recommend-dont-implement');
    expect(thinkIdFor(s, at('2026-10-30'))).toBe('p1');
    expect(face('think', s, at('2026-11-10')).title).toBe('A new rule each morning');
  });

  it('eve and exam day: one calm line, nothing to reveal', () => {
    for (const d of [1, 0]) {
      const f = face('think', snap({ examDay: addDays(TODAY, d) }));
      expect(f.title).toBe('One question at a time.');
      expect(f.action).toBeUndefined();
    }
  });

  it('details off: no prompt or rule on the screen, the card opens in the app', () => {
    const f = face('think', snap({ prefs: prefs({ details: 'hide' }) }));
    expect(f.title).toBe('Today’s rule is ready');
    expect(f.link).toBe(widgetLink('think', 'principle', 'recommend-dont-implement'));
  });
});

describe('Today’s rule: reveal marks and the self-check', () => {
  it('reveals once per widget per day, counts per rule, and resets the next day', () => {
    let r = readReveal(null, TODAY);
    r = withReveal(r, 7, 'recommend-dont-implement');
    r = withReveal(r, 7, 'recommend-dont-implement');
    r = withReveal(r, 9, 'recommend-dont-implement');
    expect(r.ids).toEqual([7, 9]);
    expect(r.counts['recommend-dont-implement']).toBe(2);
    const tomorrow = readReveal(JSON.stringify(r), '2026-10-30');
    expect(tomorrow.ids).toEqual([]);
    expect(tomorrow.counts['recommend-dont-implement']).toBe(2);
    expect(withoutWidget(r, 7).ids).toEqual([9]);
  });

  it('one self-check per rule per day; "Not yet" brings it back within 3 days, "Had it" spaces it out', () => {
    let r = readReveal(null, TODAY);
    r = withSelfCheck(r, 'recommend-dont-implement', 'notyet');
    r = withSelfCheck(r, 'recommend-dont-implement', 'had');
    expect(judgedToday(r, 'recommend-dont-implement')).toBe('notyet');
    expect(r.self['recommend-dont-implement']).toMatchObject({ had: 0, notYet: 1 });
    expect(ruleDueFrom(r.self['recommend-dont-implement'])).toEqual({ from: addDays(TODAY, 2), priority: true });
    expect(ruleDueFrom({ had: 1, notYet: 0, last: 'had', on: TODAY })).toEqual({ from: addDays(TODAY, 7), priority: false });
    expect(ruleDueFrom({ had: 2, notYet: 0, last: 'had', on: TODAY })).toEqual({ from: addDays(TODAY, 16), priority: false });
    expect(withSelfCheck(r, '../bad', 'had')).toBe(r);
  });

  it('1.47.1: keeps each widget’s reveal time today, so a quick second tap is not read as "Had it"', () => {
    let r = withReveal(readReveal(null, TODAY), 7, 'recommend-dont-implement', NOW);
    expect(r.at).toEqual({ '7': NOW });
    expect(tooSoonAfterReveal(r, 7, NOW + 600)).toBe(true);
    expect(tooSoonAfterReveal(r, 7, NOW + REVEAL_TAP_GUARD_MS)).toBe(false);
    // Another widget, or a clock that went back, is never blocked.
    expect(tooSoonAfterReveal(r, 9, NOW + 600)).toBe(false);
    expect(tooSoonAfterReveal(r, 7, NOW - 10)).toBe(false);
    // A second reveal of the same widget keeps the first time.
    expect(withReveal(r, 7, 'recommend-dont-implement', NOW + 900)).toBe(r);
    // Saved and read back today; dropped the next day; forgotten with its widget.
    expect(readReveal(JSON.stringify(r), TODAY).at).toEqual({ '7': NOW });
    expect(readReveal(JSON.stringify(r), '2026-10-30').at).toEqual({});
    expect(withoutWidget(r, 7).at).toEqual({});
    // 1.47.0 marks (no times) still read, and are never blocked.
    r = readReveal(JSON.stringify({ day: TODAY, ids: [7], counts: {}, self: {} }), TODAY);
    expect(r.ids).toEqual([7]);
    expect(tooSoonAfterReveal(r, 7, NOW)).toBe(false);
    expect(readReveal(JSON.stringify({ day: TODAY, ids: [], at: { x: 1, '3': 'soon', '4': 5 } }), TODAY).at).toEqual({ '4': 5 });
  });

  it('reads tampered marks safely', () => {
    const r = readReveal('{"day":"x","ids":["a",3],"counts":{"../x":5,"ok":1e9},"self":{"ok":{"had":"x","last":"maybe","on":"2026-10-29"}}}', TODAY);
    expect(r.ids).toEqual([]);
    expect(r.counts).toEqual({ ok: 9999 });
    expect(r.self).toEqual({});
  });
});

describe('Recall card (1.48; was Quick question): a question answered right 2+ weeks ago', () => {
  it('the stem on a ruled card; "Show the answer" reveals on the widget; the card opens that question', () => {
    const f = face('question');
    expect(f.tone).toBe('card');
    expect(f.caption).toBe('Recall card');
    expect(f.title).toMatch(/BEST/);
    expect(f.reveal).toBe('hidden');
    expect(f.action).toEqual({ label: 'Show the answer', link: '', widgetAction: 'REVEAL' });
    expect(f.link).toBe(widgetLink('question', 'question', 'd4_070'));
    expect(f.aside).toBe('3 weeks ago');
    expect(f.label).toMatch(/^Recall card, answer hidden, from 3 weeks ago\./);
    // TalkBack is told what a double-tap really does: the card opens the app; Show the answer is its own button.
    expect(f.label).toMatch(/Show the answer is the next button\. Double-tap the card to open it in KaiSip\.$/);
    // Never an option list, and never the answer before the reveal.
    expect(words(f)).not.toMatch(/\(A\)|\bA\)|business impact analysis/);
  });

  it('shown: ONLY the correct answer and its Exam cue, then Had it / Not yet (kept on the phone)', () => {
    const f = face('question', snap(), NOW, { revealed: true });
    expect(f.title).toBe('The results of the business impact analysis');
    expect(f.titleStyle).toBe('italic');
    expect(f.line).toBe('Exam cue: recovery priorities follow business impact.');
    expect(f.action?.widgetAction).toBe('HAD');
    expect(f.action2?.widgetAction).toBe('NOTYET');
    expect(f.reveal).toBe('shown');
    expect(f.link).toBe(widgetLink('question', 'question', 'd4_070'));
    const checked = face('question', snap(), NOW, { revealed: true, judged: 'notyet' });
    expect(checked.line2).toBe('It comes back in a few days.');
    expect(checked.action).toEqual({ label: 'See why', link: widgetLink('question', 'question', 'd4_070') });
    expect(face('question', snap(), NOW, { revealed: true, judged: 'had' }).line2).toBe('A new card tomorrow.');
  });

  it('nothing eligible yet: a calm empty state; days not loaded: open KaiSip; eve and exam day: rest', () => {
    const empty = face('question', snap({ recall: [] }));
    expect(empty.title).toBe('Questions you get right come back here');
    expect(empty.action).toBeUndefined();
    expect(words(empty)).not.toMatch(/miss|wrong|behind|none yet/i);
    expect(face('question', snap(), at('2026-11-10')).title).toBe('A new card each morning');
    for (const d of [1, 0]) expect(face('question', snap({ examDay: addDays(TODAY, d) })).title).toBe('Nothing to recall today');
  });

  it('details off: no stem, no answer, no topic', () => {
    const f = face('question', snap({ prefs: prefs({ details: 'hide' }) }));
    expect(f.title).toBe('A recall card is ready');
    expect(words(f)).not.toMatch(/Operations|BEST|business impact/);
  });

  it('its self-check is kept beside the rule’s, by question, and spaces the card out', () => {
    let r = readReveal(null, TODAY);
    r = withSelfCheck(r, 'd4_070', 'notyet', 'recall');
    expect(judgedToday(r, 'd4_070', 'recall')).toBe('notyet');
    expect(judgedToday(r, 'd4_070')).toBeUndefined();
    expect(r.self).toEqual({});
    expect(recallIdFor(snap(), NOW)).toBe('d4_070');
    expect(recallDueFrom(r.recall!.d4_070)).toEqual({ from: addDays(TODAY, 3), priority: true });
    expect(recallDueFrom({ had: 1, notYet: 0, last: 'had', on: TODAY })).toEqual({ from: addDays(TODAY, 30), priority: false });
    // Saved and read back; 1.47 marks (no recall field) still read.
    expect(readReveal(JSON.stringify(r), TODAY).recall).toEqual(r.recall);
    expect(readReveal(JSON.stringify({ day: TODAY, ids: [], counts: {}, self: {} }), TODAY).recall).toEqual({});
  });
});

describe('Key term (1.48; was Questions to revisit): one term a day, its meaning on a tap', () => {
  it('the abbreviation as the hero, the words under it; "Show the meaning" reveals on the widget; the card opens the note', () => {
    const f = face('revisit');
    expect(f.caption).toBe('Key term');
    expect(f.title).toBe('RPO');
    expect(f.sub).toBe('Recovery point objective');
    expect(f.aside).toBe('Operations');
    expect(f.action).toEqual({ label: 'Show the meaning', link: '', widgetAction: 'REVEAL' });
    expect(f.link).toBe('kaisip://widget?kind=revisit&go=note&id=4B3.2&from=widget');
    expect(words(f)).not.toMatch(/most data/);
    expect(f.label).toBe('Key term, meaning hidden: Recovery point objective (RPO). Show the meaning is the next button. Double-tap the card to open its note in KaiSip.');
  });

  it('shown: the term and its one-line meaning; no self-check (it is vocabulary, not a test)', () => {
    const f = face('revisit', snap(), NOW, { revealed: true });
    expect(f.title).toBe('Recovery point objective');
    expect(f.line).toBe('The most data, measured in time, the business can accept losing.');
    expect(f.action).toBeUndefined();
    expect(f.line2).toBe('A new term each morning.');
  });

  it('a term with no abbreviation is its own hero', () => {
    const f = face('revisit', snap({ terms: [{ day: TODAY, id: 't4_3', term: 'Single point of failure', meaning: 'One part whose failure stops a service.', topic: 'Operations', note: '4' }] }));
    expect(f.title).toBe('Single point of failure');
    expect(f.sub).toBeUndefined();
    expect(f.link).toContain('go=note&id=4&');
  });

  it('details off, no terms loaded, and the calm eve', () => {
    const off = face('revisit', snap({ prefs: prefs({ details: 'hide' }) }));
    expect(off.title).toBe('Today’s key term is ready');
    expect(words(off)).not.toMatch(/RPO|Recovery|Operations/);
    expect(face('revisit', snap({ terms: [] })).title).toBe('A new term each morning');
    expect(face('revisit', snap({ examDay: addDays(TODAY, 1) })).title).toBe('Nothing new today');
  });
});

describe('Your plant', () => {
  it('the friendly name and stage word; the plant line at most once; a chip only on a growth day', () => {
    const f = face('plant');
    expect(f.tone).toBe('plate');
    expect(f.caption).toBe('Your narra');
    expect(f.title).toBe('Shoot');
    expect(f.sub).toBe('Fig. 3');
    expect(f.line).toBe('Bough is next.');
    expect(face('plant', snap({ plant: { species: 'narra', name: 'narra', growth: 6, grew: null } })).line).toBe('Fully grown.');
    expect(shown(f).split(PLANT_LINE).length - 1).toBeLessThanOrEqual(1);
    expect(words(f)).not.toMatch(/of 6|rest|sleep|away/i);
    const grew = face('plant', snap({ plant: { species: 'narra', name: 'narra', growth: 3, grew: TODAY } }));
    expect(grew.badge).toBe('New growth today');
    expect(shown(grew)).not.toContain(PLANT_LINE);
    expect(grew.label).toMatch(/New growth today/);
  });

  it('1.48: the week’s leaves no longer ride along (This week is the one place with leaves)', () => {
    for (const k of WIDGET_KINDS) if (k !== 'week') expect(face(k).art?.type).not.toBe('leaves');
    expect(face('plant').art).toEqual({ type: 'plant', plant: expect.objectContaining({ species: 'narra' }) });
  });

  it('no plant yet, or the plant switched off', () => {
    expect(face('plant', snap({ plant: null })).title).toBe('Choose your plant');
    expect(face('plant', snap({ plant: { off: true } })).title).toBe('Plant is off');
  });
});

describe('Road to exam (1.48; was Exam countdown; added = opt-in; calendar weeks)', () => {
  const on = prefs({ timing: true });
  it('timing off: no exam word, one tap opens the exact choice', () => {
    const f = face('countdown');
    expect(words(f)).not.toMatch(/exam/i);
    expect(f.link).toBe(widgetLink('countdown', 'timing-setting'));
  });

  it('weeks as a road (behind, this week, ahead) and this week’s focus in words; never the date or days; no Start', () => {
    const f = face('countdown', snap({ prefs: on, examDay: '2026-11-19' }));
    expect(f.tone).toBe('ink');
    expect(f.caption).toBe('Road to exam');
    expect(f.title).toBe(ROAD_FOCUS.practice.title);
    expect(f.line).toBe(ROAD_FOCUS.practice.line);
    expect(f.aside).toBe('3 weeks to go');
    // The road started the week of 5 October: 3 weeks behind this week.
    expect(f.road).toEqual({ behind: 3, ahead: 3 });
    expect(f.action).toBeUndefined();
    expect(words(f)).not.toMatch(/November|Nov|19|days|behind|late/i);
    expect(f.label).toBe('Road to exam: 3 weeks to go, 3 weeks on the road so far. This week: make it stick. Mixed practice across every area.');
    // The focus follows the plan engine’s stage.
    expect(face('countdown', snap({ prefs: on, examDay: '2026-11-19', road: { from: TODAY, stage: 'mock' } })).title).toBe('Rehearse the exam');
    for (const t of Object.values(ROAD_FOCUS)) expect(`${t.title} ${t.line}`).not.toMatch(/behind|catch up|weak|gap|pass/i);
  });

  it('final week, eve, day and after: the shared words', () => {
    expect(face('countdown', snap({ prefs: on, examDay: addDays(TODAY, 5) })).title).toBe('Settle in. Don’t cram.');
    expect(face('countdown', snap({ prefs: on, examDay: addDays(TODAY, 1) })).title).toBe('Light review, then rest.');
    expect(face('countdown', snap({ prefs: on, examDay: TODAY })).title).toBe('Good luck.');
    expect(face('countdown', snap({ prefs: on, examDay: addDays(TODAY, -1) })).title).toBe('Exam done');
    // Forest is Today's plan's alone: the calm exam faces sit on the ink card, with no Start.
    for (const d of [5, 1, 0]) {
      const f = face('countdown', snap({ prefs: on, examDay: addDays(TODAY, d) }));
      expect(f.tone).toBe('ink');
      expect(f.action).toBeUndefined();
    }
    for (const k of WIDGET_KINDS) if (k !== 'plan') for (const d of [30, 5, 1, 0]) expect(face(k, snap({ prefs: on, examDay: addDays(TODAY, d) })).tone).not.toBe('forest');
  });

  it('details off: today’s plan only; no date: where to add one', () => {
    expect(face('countdown', snap({ prefs: prefs({ timing: true, details: 'hide' }) })).caption).toBe('Your plan');
    expect(face('countdown', snap({ prefs: on, examDay: null })).link).toBe(widgetLink('countdown', 'exam-date'));
  });
});

describe('lock-screen accessory (designed for later)', () => {
  it('only KaiSip, minutes and abstract leaves', () => {
    expect(lockFace(null, NOW)).toEqual({ inline: 'KaiSip', circular: { type: 'mark' } });
    const l = lockFace(snap(), NOW);
    expect(l.inline).toBe('KaiSip · about 12 min');
    expect(l.circular.type).toBe('leaves');
    expect(lockFace(snap({ examDay: addDays(TODAY, 3) }), NOW).circular.type).toBe('mark');
  });
});

describe('safety rules for every widget', () => {
  it('no face changes with the hour of the day (only with the calendar day)', () => {
    for (const kind of WIDGET_KINDS) {
      const s = snap({ prefs: prefs({ timing: true, readiness: 'show' }), ready: READY });
      const morning = face(kind, s, at(TODAY, 6));
      for (const h of [0, 12, 18, 23]) expect(face(kind, s, at(TODAY, h, 59))).toEqual(morning);
    }
  });

  it('time away changes only Today’s plan’s main button (5 questions after 3+ days), never a word about it', () => {
    for (const kind of WIDGET_KINDS) {
      if (kind === 'plan' || kind === 'week' || kind === 'plant') continue;
      expect(face(kind, snap({ studyDays: ['2026-10-01', '2026-10-02'] }))).toEqual(face(kind, snap()));
    }
  });

  it('every link opens the app at a known place, through the widget route', () => {
    const ctxs: Partial<DrawContext>[] = [{}, { revealed: true }, { revealed: true, judged: 'had' }];
    for (const kind of WIDGET_KINDS) {
      for (const [, d] of STAGES) {
        for (const p of [prefs({}), prefs({ timing: true, readiness: 'show' }), prefs({ details: 'hide' })]) {
          for (const ctx of ctxs) {
            const f = face(kind, snap({ prefs: p, ready: READY, examDay: d === null ? null : addDays(TODAY, d) }), NOW, ctx);
            for (const link of faceLinks(f)) {
              expect(link.startsWith('kaisip://widget?')).toBe(true);
              const tap = parseWidgetTap(Object.fromEntries(new URLSearchParams(link.split('?')[1])));
              expect(tap.kind).toBe(kind);
              expect(tap.fromWidget).toBe(true);
            }
            // A face with no link is an on-widget action.
            if (!f.link) expect(f.widgetAction).toBeTruthy();
          }
        }
      }
    }
  });

  it('every plain goal maps to a route', () => {
    for (const r of Object.values(GOAL_ROUTES)) expect(r).toMatch(/^\/[a-z-]*(\?[a-z]+=[a-z-]+)?$/);
  });

  it('reads an untrusted link safely', () => {
    expect(parseWidgetTap({ kind: 'plan', go: 'start', from: 'widget' })).toEqual({ kind: 'plan', go: 'start', id: null, fromWidget: true });
    expect(parseWidgetTap({ kind: 'evil', go: 'rm -rf', id: '<script>' })).toEqual({ kind: null, go: 'today', id: null, fromWidget: false });
    expect(parseWidgetTap({ go: 'question', id: '../../x' }).go).toBe('today');
    expect(parseWidgetTap({ go: 'principle' }).go).toBe('principles');
    expect(parseWidgetTap({ go: 'plant', id: 'd1_001' }).id).toBeNull();
  });

  it('every spoken label names minutes in full', () => {
    for (const kind of WIDGET_KINDS) {
      const f = face(kind, snap({ prefs: prefs({ timing: true, readiness: 'show' }), ready: READY }));
      expect(f.label).not.toMatch(/\bmin\b/);
    }
  });

  it('before onboarding (or before the first snapshot) every widget says to open the app', () => {
    for (const kind of WIDGET_KINDS) {
      expect(face(kind, null).title).toBe('Open KaiSip to begin');
      expect(face(kind, snap({ onboarded: false })).title).toBe('Open KaiSip to begin');
    }
  });
});

describe('the one suggestion, and the one re-ask', () => {
  const base = { supported: true, shown: false, studyDays: 3, cleared: true, daysLeft: 30, placed: false, otherSetup: false };
  it('suggests a widget at most once: a cleared day from the 3rd study day, never in exam week', () => {
    expect(widgetOfferDue(base)).toBe(true);
    expect(widgetOfferDue({ ...base, shown: true })).toBe(false);
    expect(widgetOfferDue({ ...base, studyDays: 2 })).toBe(false);
    expect(widgetOfferDue({ ...base, cleared: false })).toBe(false);
    expect(widgetOfferDue({ ...base, daysLeft: 7 })).toBe(false);
    expect(widgetOfferDue({ ...base, placed: true })).toBe(false);
    expect(widgetOfferDue({ ...base, otherSetup: true })).toBe(false);
    expect(widgetOfferDue({ ...base, supported: false })).toBe(false);
  });

  it('asks once, 30 days after the range was chosen, only while the widget is placed', () => {
    const r = { pref: 'show' as const, shownSince: '2026-09-29', asked: false, today: TODAY, placed: true };
    expect(readinessReaskDue(r)).toBe(true);
    expect(readinessReaskDue({ ...r, today: '2026-10-28' })).toBe(false);
    expect(readinessReaskDue({ ...r, asked: true })).toBe(false);
    expect(readinessReaskDue({ ...r, placed: false })).toBe(false);
    expect(readinessReaskDue({ ...r, pref: 'private' })).toBe(false);
  });
});

describe('the "choose" screen when Readiness or Exam countdown is added', () => {
  it('Readiness: rings only first and recommended; says who can see it', () => {
    const c = readinessConfigCopy(DEFAULT_WIDGET_PREFS);
    expect(c.choices.map((x) => x.value)).toEqual(['private', 'show']);
    expect(c.choices[0].recommended).toBe(true);
    expect(c.intro).toMatch(/Anyone who sees your phone/);
    expect(readinessConfigCopy(prefs({ details: 'hide' })).note).toMatch(/Details on widgets is off/);
  });

  it('Exam countdown: one plain choice; notes for Details off and no date', () => {
    const c = countdownConfigCopy(DEFAULT_WIDGET_PREFS, '2026-11-19');
    expect(c.choices).toHaveLength(1);
    expect(c.note).toBeUndefined();
    expect(countdownConfigCopy(prefs({ details: 'hide' }), null).note).toMatch(/Details on widgets is off/);
    expect(countdownConfigCopy(DEFAULT_WIDGET_PREFS, null).note).toMatch(/No exam date yet/);
    expect(JSON.stringify(c)).not.toMatch(/never the date, and|\bpass\b|guarantee/i);
  });
});

describe('1.47.1: the redraw just after local midnight', () => {
  it('waits until a few seconds past the next local midnight', () => {
    expect(msToNextMidnight(at(TODAY, 9))).toBe(15 * 3600_000 + 5000);
    expect(new Date(NOW + msToNextMidnight(NOW)).getDate()).toBe(30);
    // Just before midnight, and in the first seconds after it (the next one is a day away).
    expect(msToNextMidnight(at(TODAY, 23, 59))).toBe(65_000);
    const justAfter = at('2026-10-30', 0) + 2000;
    expect(msToNextMidnight(justAfter)).toBeGreaterThan(23 * 3600_000);
    // Never zero or negative.
    for (const t of [NOW, at(TODAY, 0), at(TODAY, 23, 59) + 59_999]) expect(msToNextMidnight(t)).toBeGreaterThanOrEqual(1000);
  });
});
