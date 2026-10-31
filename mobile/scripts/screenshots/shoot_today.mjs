// Mobile 1.23 Today (mockup A): SHOTS=today, see run.sh.
//
// Shots (each name ends with the theme and, when set, -w360 / -fs200 / -reduced):
//   01-today           the mockup's day: a warm-up done, a review as the current item, a lesson to come
//   02-today-fresh     a plan with nothing done yet ("Start")
//   03-today-scrolled  the same day scrolled to "Also today" and what sits under the tiles
//   04-new-learner     no answers yet: the range and two tiles say "Not yet"
//   05-no-exam-date    no exam date: the meta line says so
//   06-mock-only       a day whose only open item is the optional mini mock
//   07-cleared         every item done (the clearing card; no tiles, no checklist)
//   07b-cleared-paused the same cleared day with a Mini mock paused at question 2: its Resume row above Tomorrow (1.54.2)
//   08-exam-eve        the day before the exam
//   09-plant           a learner with a plant: its row under the tiles
//   10-exam-week       three days out: the quiet exam-week card
// NARROW=1 uses a 360-wide phone; FONT_SCALE=2 approximates 200% text;
// REDUCED=1 emulates Reduce Motion (prefers-reduced-motion).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:8093';
const NARROW = process.env.NARROW === '1';
const REDUCED = process.env.REDUCED === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}${REDUCED ? '-reduced' : ''}`;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const keyIn = (n) => dk(now + n * 86_400_000);

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
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
// FONT_SCALE: every text run is zoomed like the app's text size, up to its style's cap (titles and numerals stop at x1.3).
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
const go = async (path, ms = 2200) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name) => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(400);
  }
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
const scrollBy = async (y) => {
  await page.mouse.move(W / 2, 500);
  await page.mouse.wheel(0, y);
  await wait(600);
};
/** Replace today's stored plan with the given items and done flags (the day's budget is kept). */
const setPlan = (items, done) =>
  edit(
    P,
    `const d = new Date(); const p = (n) => String(n).padStart(2, '0');
     const day = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
     const cur = (v.state.days || {}).cisa || {};
     v.state.days = { ...(v.state.days || {}) }; delete v.state.day;
     v.state.days.cisa = { ...cur, day, certId: 'cisa', items: a.items, done: a.done, credit: a.items.map(() => 0),
       start: cur.start || { score: 62, domains: { '1': .74, '2': .66, '3': .55, '4': .58, '5': .6 } },
       answered: a.done.filter(Boolean).length * 5, correct: a.done.filter(Boolean).length * 4, minutes: 6, budget: 30 };`,
    { items, done },
  );
const WARM = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };
const REVIEW = { kind: 'review', count: 20, due: 20 };
const LESSON = { kind: 'lesson', lessonId: 'cisa-l-d1-charter', title: 'Business impact analysis', minutes: 5 };
const MOCK = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 };

// The first visit stores today's plan; then it is replaced to match the scene.
await go('/home');
await setPlan([WARM, REVIEW, LESSON], [true, false, false]);
await go('/home');
await shot('01-today');
await scrollBy(520);
await shot('03-today-scrolled');

await setPlan([WARM, REVIEW, LESSON], [false, false, false]);
await go('/home');
await shot('02-today-fresh');

// Nothing answered yet.
const saved = await page.evaluate((k) => { const c = JSON.parse(localStorage.getItem(k)).state.byCert.cisa; return { answers: c.answers, review: c.review, mistakes: c.mistakes }; }, P);
await edit(P, 'v.state.byCert.cisa = { ...v.state.byCert.cisa, answers: {}, review: {}, mistakes: {} };', null);
await setPlan([LESSON, { kind: 'practice', count: 5, label: '5 questions · IS Audit', why: 'learn' }], [false, false]);
await go('/home');
await shot('04-new-learner');
await edit(P, 'Object.assign(v.state.byCert.cisa, a);', saved);

// No exam date.
await edit(S, 'v.state.examDates = {};');
await setPlan([WARM, REVIEW, LESSON], [true, false, false]);
await go('/home');
await shot('05-no-exam-date');
await edit(S, `v.state.examDates.cisa = '${keyIn(38)}';`);

// A mock-only day.
await setPlan([MOCK], [false]);
await go('/home');
await shot('06-mock-only');

// Cleared.
await setPlan([WARM, REVIEW, LESSON], [true, true, true]);
await edit(P, 'v.state.days.cisa.celebrated = true;');
await go('/home');
await shot('07-cleared');

// Mobile 1.54.2: a paused Mini mock on a cleared day is still offered (Also today, above Tomorrow).
const mockIds = await page.evaluate((k) => Object.keys(JSON.parse(localStorage.getItem(k)).state.byCert.cisa.answers).slice(0, 50), P);
await edit(
  'aurivan.session.v1',
  `v.state.active = { id: 'paused-mock', mode: 'mock', certId: 'cisa', title: 'Mini mock', questionIds: a.ids,
    perms: Object.fromEntries(a.ids.map((i) => [i, ['A', 'B', 'C', 'D']])), index: 1, responses: { [a.ids[0]]: { display: 'A', correct: true } },
    flagged: [], startedAt: a.now - 3 * 60000, deadline: a.now + 77 * 60000, timing: 'standard' };`,
  { ids: mockIds, now },
);
await go('/home');
await scrollBy(420);
await shot('07b-cleared-paused');
await edit('aurivan.session.v1', 'v.state.active = null;');

// Exam eve, then exam week (three days out).
await edit(S, `v.state.examDates.cisa = '${keyIn(1)}';`);
await edit(P, 'if (v.state.days) delete v.state.days.cisa;');
await go('/home');
await shot('08-exam-eve');
await edit(S, `v.state.examDates.cisa = '${keyIn(3)}';`);
await edit(P, 'if (v.state.days) delete v.state.days.cisa;');
await go('/home');
await shot('10-exam-week');
await edit(S, `v.state.examDates.cisa = '${keyIn(38)}';`);
await edit(P, 'if (v.state.days) delete v.state.days.cisa;');

// A plant (the planted state the plant screens use).
await edit(P, `v.state.byCert.cisa.plant = { species: 'oak', name: 'Kai', plantedAt: ${now} - 30 * 86400000, growth: 5, reached: { sprout: ${now} - 29 * 86400000, shoot: ${now} - 20 * 86400000, bough: ${now} - 9 * 86400000, crown: ${now} - 2 * 86400000 } };`);
await go('/home');
await setPlan([WARM, REVIEW, LESSON], [true, false, false]);
await go('/home');
await scrollBy(300);
await shot('09-plant');

if (errs.length) console.log('page errors:', errs.slice(0, 3));
await browser.close();
