// Mobile 1.41 "beta tester helpers + calmer start" (SHOTS=m141, see run.sh).
//
// Shots: the welcome (the best feature first), "Where are you starting from?" right after it (no name
// step), the first set's closing screen offering a plant (and after "Not now"), Today with "Short on
// time? 5 questions", Today's one name ask (its field in the card since 1.44, with a name typed in),
// Help with "I'm a beta tester", the Tester question on day 3, the Week 1 check-in with the study-day
// count, Send feedback with "Something confused me", and Report a problem with "I couldn't find
// something".
// NARROW=1 uses a 360-wide phone; FONT_SCALE=2 approximates 200% text.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const NARROW = process.env.NARROW === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const SEEN = 'aurivan.seen.v1';
const SESSION = 'aurivan.session.v1';
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const DAY = 86_400_000;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const FIRST = ['d1_002', 'd2_006', 'd3_002', 'd4_041', 'd5_008'];

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
// No email app in the browser: keep mailto links from navigating away.
await ctx.addInitScript(() => {
  const open = window.open;
  window.open = (url, ...rest) => (String(url).startsWith('mailto:') ? ((window.__LAST_MAILTO__ = String(url)), null) : open(url, ...rest));
});
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
const go = async (path, ms = 2400) => {
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
const press = async (name, ms = 800) => {
  await page.getByRole('button', { name }).first().click();
  await wait(ms);
};
/** Bring a line into the middle of the screen; say so when it is not there. */
const into = async (text, label) => {
  const n = page.getByText(text).first();
  if (await n.count()) {
    await n.evaluate((x) => x.scrollIntoView({ block: 'center' }));
    await wait(700);
    return true;
  }
  console.log(`${label}: "${text}" did not show`);
  return false;
};

await go('/home', 1200);
const saved = await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), [P, S, SEEN, SESSION]);

// ── 1. Onboarding: the welcome, then straight to the starting point ─────
await page.evaluate((ks) => ks.forEach((k) => localStorage.removeItem(k)), [P, SEEN, SESSION]);
await edit(S, `v.state.onboarded = false; delete v.state.familiarity; delete v.state.dailyMinutes; delete v.state.fitPrompt; v.state.examDates = {};`);
await go('/onboarding', 1800);
await shot('m01-welcome');
await press('Get started');
await shot('m02-starting-point');

// ── 2. The first set's closing screen: a plant offered, not planted ─────
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [S, saved[1]]);
await edit(S, `v.state.fitPrompt = 'answered'; delete v.state.displayName;`);
await edit(
  P,
  `v.state.byCert = { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } };
   v.state.plantSettings = { promptHidden: true };
   const c = v.state.byCert.cisa; const right = [true, true, true, false, false];
   const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
   a.ids.forEach((id, i) => {
     c.answers[id] = { attempts: 1, correctCount: right[i] ? 1 : 0, lastCorrect: right[i], lastAt: a.now };
     if (!right[i]) { c.review[id] = { box: 1, dueAt: tomorrow.getTime(), lastSeen: a.now, reps: 1 }; c.mistakes[id] = { picked: 'A', at: a.now }; }
   });`,
  { ids: FIRST, now },
);
await edit(
  SESSION,
  `const r = {}; a.ids.forEach((id, i) => (r[id] = { display: 'A', correct: i < 3, ms: 20000, at: a.now }));
   v.state.active = { id: 'first-demo', mode: 'practice', certId: 'cisa', title: 'Your first five', questionIds: a.ids,
     perms: Object.fromEntries(a.ids.map((id) => [id, ['A', 'B', 'C', 'D']])), index: 4, responses: r, flagged: [],
     startedAt: a.now - 300000, firstSet: true, finishedAt: a.now };`,
  { ids: FIRST, now },
);
await go('/results', 2800);
// One decision at a time (review 1.41): the reminder ask first, then the plant.
await shot('m03a-closing-reminder-first');
await page.getByRole('button', { name: 'Not now', exact: true }).first().click();
await wait(900);
await into('Want a plant that grows as you learn?', 'm03');
await shot('m03-closing-plant-offer');
await press('Maybe later, no plant for now', 900);
await shot('m03b-closing-plant-not-now');

// ── 3. Today before the plan starts: "Short on time? 5 questions" ───────
await page.evaluate((pairs) => pairs.forEach(([k, v]) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v))), [
  [P, saved[0]],
  [SEEN, saved[2]],
  [SESSION, null],
]);
await edit(P, `v.state.days = {};`);
await edit(S, `v.state.fitPrompt = 'answered'; v.state.displayName = 'Maya';`);
await go('/home', 2800);
await shot('m04-today-short-on-time');

// ── 4. Today's one name ask (the day after the first study day), typed in ─
await edit(S, `delete v.state.displayName;`);
await edit(SEEN, `v.state.nameAsk = 'due'; v.state.reminderAsk = { first: 'later', second: true };`);
await edit(P, `v.state.plantSettings = { promptHidden: true }; const c = v.state.byCert.cisa; c.milestones = Object.assign(c.milestones || { earned: {} }, { days: 4, lastDay: a }); v.state.days = {};`, dk(now - DAY));
await go('/home', 2800);
await into('What should we call you?', 'm05');
await shot('m05-today-name-ask');
// Mobile 1.44: the field sits in the card ("Name or nickname", components/beta.tsx), no sheet.
// Nothing is saved without "Save my name", so typing here leaves the learner unnamed.
await page.getByRole('textbox', { name: 'Name or nickname' }).first().click();
await page.getByRole('textbox', { name: 'Name or nickname' }).first().fill('Maya');
await wait(400);
await shot('m05b-name-typed');

// ── 5. Help: "I'm a beta tester" ────────────────────────────────────────
await edit(SEEN, `v.state.nameAsk = 'shown';`);
await go('/help', 2000);
await into('I’m a beta tester', 'm06');
await shot('m06-help-beta-switch');

// ── 6. The Tester question on day 3 ─────────────────────────────────────
await edit(SEEN, `v.state.tester = { since: a };`, dk(now - 2 * DAY));
await edit(P, `v.state.days = {};`);
await go('/home', 2800);
await into('Tester question', 'm07');
await shot('m07-today-tester-question');

// ── 7. The Week 1 check-in (day 7), with the study-day count ────────────
await edit(SEEN, `v.state.tester = { since: a };`, dk(now - 6 * DAY));
await go('/home', 2800);
await into('Week 1 check-in', 'm08');
await shot('m08-today-week1-checkin');

// ── 8. Send feedback: "Something confused me" first ─────────────────────
await edit(SEEN, `v.state.tester = {};`);
await go('/help', 2000);
await press(/^Something confused me/, 1200);
await shot('m09-feedback-confused');
await go('/help', 2000);
await press(/^Report a problem with the app/, 1200);
await into('I couldn’t find something', 'm10');
await shot('m10-report-app-findable');

// Put the demo learner back.
await page.evaluate((pairs) => pairs.forEach(([k, v]) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v))), [
  [P, saved[0]],
  [S, saved[1]],
  [SEEN, saved[2]],
  [SESSION, saved[3]],
]);
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
