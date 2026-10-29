// Mobile 1.51 Field Guide (SHOTS=fieldguide, see run.sh): You (the scale bar, the areas plate,
// the Herbarium row, the label rows), the Herbarium (still to collect, the sheets), Today (the
// plate, the plan's label, the scale bar) and Results (the growth plate, the key list of misses).
// FONT_SCALE=2 approximates 200% text (1.2 for the chart's grown-but-not-list size); FG_ONLY=you,herbarium,
// today,results,drills narrows it. Review sets (UX review, 1.51): FG_ONLY=full (You with all five areas measured, one
// below 70), drop (Results with a set that lowered an area), new (a brand-new learner: Today, You, the Herbarium).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const ONLY = (process.env.FG_ONLY || '').split(',').filter(Boolean);
const REVIEW = ['full', 'drop', 'new'];
// The review sets only run when asked for by name.
const want = (k) => (ONLY.length === 0 ? !REVIEW.includes(k) : ONLY.includes(k));
const tag = `${theme}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const GEN = new URL('../../src/content/generated/cisa/', import.meta.url);
const bank = (d) => JSON.parse(fs.readFileSync(new URL(`d${d}.json`, GEN)));
const W = 393;
const H = 852;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const DAY = 86400000;

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';
const zoomText = () =>
  page.evaluate(
    ([sel, f]) => {
      for (const el of document.querySelectorAll(sel)) {
        // The tab bar's own text is capped at ×1.2 in the app: never zoomed here (UX review P1).
        if (el.dataset.zoomed || el.closest('[role="tablist"]')) continue;
        const px = parseFloat(getComputedStyle(el).fontSize) || 16;
        el.style.zoom = String(px >= 26 ? Math.min(1.3, f) : f);
        el.dataset.zoomed = '1';
      }
    },
    [TEXT_RUNS, FONT_SCALE],
  );
const shot = async (name) => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(400);
  }
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const go = async (route, ms = 2600) => {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await wait(ms);
};
const into = async (text, block = 'start') => {
  const n = page.getByText(text).first();
  if (await n.count()) {
    await n.evaluate((x, b) => x.scrollIntoView({ block: b }), block);
    await wait(700);
  } else console.log(`"${text}" did not show`);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(
    ([k, src, a]) => {
      const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
      new Function('v', 'a', src)(v, a);
      localStorage.setItem(k, JSON.stringify(v));
    },
    [key, fn, arg],
  );

// The demo learner: Maya, an oak called Kai at Shoot, a few badges pressed over the weeks.
await go('/home', 800);
const now = Date.now();
await edit(S, `v.state.displayName = 'Maya';`);
await edit(
  P,
  `const cp = v.state.byCert.cisa;
   cp.plant = { species: 'oak', name: 'Kai', plantedAt: a - 26 * ${DAY}, growth: 3, reached: { sprout: a - 24 * ${DAY}, shoot: a - 9 * ${DAY} } };
   cp.milestones = { earned: { 'first-foothold': a - 26 * ${DAY}, 'topic-clear': a - 24 * ${DAY}, 'rooted:10': a - 15 * ${DAY}, 'know-what-you-know': a - ${DAY} } };`,
  now,
);
// The app's launch back-fill awards every badge the seeded study already meets (UX review O2: the seed
// used to skip it, so Firm Footing showed 20 of 20 unearned). Then its one-time summary line is marked seen.
await go('/home', 1600);
await edit(P, `const m = v.state.byCert.cisa.milestones; if (m.backfill) m.backfill.seen = true; if (m.catalogFill) m.catalogFill.seen = true;`);

if (want('you')) {
  await go('/you');
  await shot('fg-you');
  await into('Fig. 5', 'start');
  await shot('fg-you-areas');
  await into('Answered', 'center');
  await shot('fg-you-stats');
}

if (want('herbarium')) {
  await go('/milestones');
  await shot('fg-herbarium');
  await into('Sheet I', 'start');
  await shot('fg-herbarium-sheets');
}

if (want('today')) {
  await go('/home');
  await shot('fg-today');
  await into('Readiness', 'center');
  await shot('fg-today-readiness');
}

if (want('results')) {
  // A 10-question IS Operations set with three misses, started when IS Operations stood 3 points lower.
  const set = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
    const answers = p.state.byCert.cisa.answers;
    const ids = Object.keys(answers).filter((k) => k.startsWith('d4_')).slice(0, 10);
    const d4 = Object.entries(answers).filter(([k]) => k.startsWith('d4_'));
    const right = d4.filter(([, a]) => a.lastCorrect).length;
    return { ids, answered: d4.length, pct: Math.round((right / d4.length) * 100) };
  });
  const responses = Object.fromEntries(set.ids.map((id, i) => [id, { display: i % 4 === 1 ? 'B' : 'A', correct: !(i === 1 || i === 4 || i === 7), ms: 70_000 + (i % 3) * 9_000, at: now - (10 - i) * 80_000 }]));
  await edit(
    'aurivan.session.v1',
    `v.state.active = { id: 'fg', mode: 'practice', certId: 'cisa', title: 'Practice · IS Operations', questionIds: a.ids,
      perms: Object.fromEntries(a.ids.map((i) => [i, ['A', 'B', 'C', 'D']])), index: 9, responses: a.responses, flagged: [],
      before: { '4': [a.answered, a.pct - 3] }, startedAt: a.now - 14 * 60000, finishedAt: a.now };`,
    { ...set, responses, now },
  );
  await go('/results', 2800);
  await shot('fg-results');
  await into('What you missed', 'start');
  await shot('fg-results-missed');
}

// Mobile 1.51 (the owner's menu pick A): four tabs; the games are Drills, a section of Practice. An old Play
// link lands there (?section=drills scrolls to it); "More drills" opened; then Practice from its top.
// With FONT_SCALE the text is zoomed FIRST, then the page scrolls to Drills (zooming after the jump would push
// Drills off the shot; UX review P1).
const toDrills = async () => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(300);
    // The heading itself (the "games moved" line also says Drills).
    const head = page.getByText('Drills', { exact: true }).first();
    if (await head.count()) {
      await head.evaluate((x) => x.scrollIntoView({ block: 'start' }));
      await wait(700);
    }
  }
};
if (want('drills')) {
  // The demo learner played games on the old Play tab: the one-time line under Practice's title, first.
  await go('/practice', 2800);
  await shot('fg-practice-moved-hint');
  await go('/practice?section=drills', 3200);
  await toDrills();
  await shot('fg-drills');
  const more = page.getByText('More drills').first();
  if (await more.count()) {
    await more.click();
    await wait(700);
    await into('More drills', 'start');
  }
  await shot('fg-drills-more');
  await go('/practice');
  await shot('fg-practice-top');
  await go('/play', 3200);
  await toDrills();
  await shot('fg-drills-from-play-link');
}

// ── Review sets ───────────────────────────────────────────────────────────
if (want('full')) {
  // Every area measured (30+ answers), all between about 60 and 85: IS Audit 84%, IS Operations below its 70 line (61%).
  const d5 = bank(5).map((q) => q.id);
  const d4 = bank(4).map((q) => q.id);
  await edit(
    P,
    `const ans = v.state.byCert.cisa.answers;
     let k = 0; for (const id of a.d5) { if (Object.keys(ans).filter((x) => x.startsWith('d5_')).length >= 40) break; if (!ans[id]) { ans[id] = { attempts: 1, correctCount: k % 4 ? 1 : 0, lastCorrect: k % 4 !== 0, lastAt: a.now - 2 * ${DAY} }; k++; } }
     const at = (pre, pct) => Object.keys(ans).filter((x) => x.startsWith(pre)).forEach((id, i) => { ans[id].lastCorrect = (i * pct) % 100 < pct; ans[id].correctCount = ans[id].lastCorrect ? 1 : 0; });
     at('d1_', 84);
     at('d4_', 61);`,
    { d5, d4, now },
  );
  await go('/you');
  await into('Fig. 5', 'start');
  await shot('fg-full-you-areas');
}

if (want('drop')) {
  // A 10-question IS Operations set that lowered it: four right, started 3 points higher.
  const set = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
    const answers = p.state.byCert.cisa.answers;
    const ids = Object.keys(answers).filter((k) => k.startsWith('d4_')).slice(0, 10);
    const d4 = Object.entries(answers).filter(([k]) => k.startsWith('d4_'));
    const right = d4.filter(([, a]) => a.lastCorrect).length;
    return { ids, answered: d4.length, pct: Math.round((right / d4.length) * 100) };
  });
  const responses = Object.fromEntries(set.ids.map((id, i) => [id, { display: 'A', correct: i % 5 < 2, ms: 80_000, at: now - (10 - i) * 80_000 }]));
  await edit(
    'aurivan.session.v1',
    `v.state.active = { id: 'fg-drop', mode: 'practice', certId: 'cisa', title: 'Practice · IS Operations', questionIds: a.ids,
      perms: Object.fromEntries(a.ids.map((i) => [i, ['A', 'B', 'C', 'D']])), index: 9, responses: a.responses, flagged: [],
      before: { '4': [a.answered, a.pct + 3] }, startedAt: a.now - 14 * 60000, finishedAt: a.now };`,
    { ...set, responses, now },
  );
  await go('/results', 2800);
  await shot('fg-drop-results');
}

if (want('new')) {
  // A brand-new learner: no answers, no badges, no plant (a fresh context's seed, then everything cleared).
  await edit(
    P,
    `const cp = v.state.byCert.cisa; cp.answers = {}; cp.review = {}; cp.mistakes = {}; cp.mocks = []; cp.gameBest = {}; cp.gameRecent = {}; cp.gameGrowth = {}; delete cp.plant; cp.milestones = { earned: {}, backfill: { at: Date.now(), count: 0, seen: true } };
     v.state.streak = { current: 0, best: 0, lastDay: null }; v.state.days = {};`,
  );
  await edit('aurivan.session.v1', `v.state.active = null;`);
  await edit(S, `delete v.state.displayName;`);
  await go('/home');
  await shot('fg-new-today');
  await go('/you');
  await shot('fg-new-you');
  await into('Fig. 5', 'start');
  await shot('fg-new-you-areas');
  await go('/milestones');
  await shot('fg-new-herbarium');
  // A new learner's Drills: the three core games, the rest after 50 answers (one quiet line).
  await go('/practice?section=drills', 3200);
  await shot('fg-new-drills');
}

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
