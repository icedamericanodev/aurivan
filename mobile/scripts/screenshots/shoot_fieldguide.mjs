// Mobile 1.51 Field Guide (SHOTS=fieldguide, see run.sh): You (the scale bar, the areas plate,
// the Herbarium row, the label rows), the Herbarium (still to collect, the sheets), Today (the
// plate, the plan's label, the scale bar) and Results (the growth plate, the key list of misses).
// FONT_SCALE=2 approximates 200% text; FG_ONLY=you,herbarium,today,results narrows it.
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
const want = (k) => ONLY.length === 0 || ONLY.includes(k);
const tag = `${theme}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
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
        if (el.dataset.zoomed) continue;
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
   cp.milestones = { ...(cp.milestones || {}), earned: { 'first-foothold': a - 26 * ${DAY}, 'topic-clear': a - 24 * ${DAY}, 'rooted:10': a - 15 * ${DAY}, 'know-what-you-know': a - ${DAY} }, backfill: { at: a - 27 * ${DAY}, count: 0, seen: true }, catalogFill: { at: a - 27 * ${DAY}, count: 0, seen: true } };`,
  now,
);

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

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
