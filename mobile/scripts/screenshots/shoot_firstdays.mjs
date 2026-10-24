// Mobile 1.24 "first five minutes" (SHOTS=firstdays, see run.sh).
//
// Shots: the welcome (literal, four lines), the optional name, "Where are you
// starting from?" (Step 1 of 2), the date and minutes with the "what it adds up
// to" line (Step 2 of 2), the first question (no timer, no confidence chips),
// Today on Day 0 (one title, one pill, nothing else), the Day-1 closing screen
// ("3 of 5", tomorrow, the seed, the reminder ask), Today cleared, Today with
// five answers ("5 of 40 for your first range"), "Your first readiness range",
// the reminder's one second chance, and You with band words (12 answers a domain).
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
// The first set: the same five questions for everyone (src/content/firstSet.ts).
const FIRST = ['d1_002', 'd2_006', 'd3_002', 'd4_041', 'd5_008'];

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
// FONT_SCALE: every text run is zoomed like the app's text size, up to its style's cap.
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
const pick = async (name, ms = 600) => {
  await page.getByRole('radio', { name }).first().click();
  await wait(ms);
};
/** Scroll to the very end of the page (the closing card sits under the fold). */
const toEnd = async () => {
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, 2000);
  await wait(700);
};

// A brand-new phone: nothing studied, nothing seen, no session.
await go('/home', 1200);
const studied = await page.evaluate((k) => localStorage.getItem(k), P);
const studiedSettings = await page.evaluate((k) => localStorage.getItem(k), S);
await page.evaluate(([k1, k2, k3]) => [k1, k2, k3].forEach((k) => localStorage.removeItem(k)), [P, SEEN, SESSION]);
await edit(S, `v.state.onboarded = false; delete v.state.familiarity; delete v.state.dailyMinutes; delete v.state.fitPrompt; v.state.examDates = {};`);

// ── 1. Onboarding ──────────────────────────────────────────────────────
await go('/onboarding', 1800);
await shot('fd01-welcome');
await press('Get started');
// Mobile 1.41: no name step (Today asks later), so fd02 is not taken any more.
await shot('fd03-starting-point');
await pick(/^Some IT audit experience/);
await press('Continue');
await press(/^In 3 months$/);
await shot('fd04-date-minutes-consequence');
await press('Start my first questions', 2200);

// ── 2. The first question: no timer, no confidence chips ───────────────
await shot('fd05-first-question');
// Options are spoken "Option A: <text>" (components/quiz.tsx), so match that label.
await page.getByLabel(/^Option A:/).first().click();
await wait(500);
await shot('fd05b-first-question-picked');

// ── 3. Today on Day 0 (the first set is paused: it shows under "Also today") ──
await go('/home', 2600);
await shot('fd06-today-day0');

// ── 4. The Day-1 closing screen: 3 of 5, 2 come back tomorrow ───────────
const closing = `
  const ids = a.ids; const right = [true, true, true, false, false];
  v.state.byCert = v.state.byCert || {};
  const c = (v.state.byCert.cisa = v.state.byCert.cisa || { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} });
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  ids.forEach((id, i) => {
    c.answers[id] = { attempts: 1, correctCount: right[i] ? 1 : 0, lastCorrect: right[i], lastAt: a.now };
    if (!right[i]) { c.review[id] = { box: 1, dueAt: tomorrow.getTime(), lastSeen: a.now, reps: 1 }; c.mistakes[id] = { picked: 'A', at: a.now }; }
  });`;
await edit(P, closing, { ids: FIRST, now });
// What finishing the set does to Day 1's plan (the real app does this in finishSession): its one item is done.
await edit(P, `const d = v.state.days.cisa; if (d) { d.done = d.items.map(() => true); d.credit = d.items.map(() => 5); d.answered = 5; d.correct = 3; d.minutes = 2; }`);
await edit(
  SESSION,
  `const r = {}; a.ids.forEach((id, i) => (r[id] = { display: 'A', correct: i < 3, ms: 20000, at: a.now }));
   v.state.active = { id: 'first-demo', mode: 'practice', certId: 'cisa', title: 'Your first five', questionIds: a.ids,
     perms: Object.fromEntries(a.ids.map((id) => [id, ['A', 'B', 'C', 'D']])), index: 4, responses: r, flagged: [],
     startedAt: a.now - 300000, firstSet: true, finishedAt: a.now };`,
  { ids: FIRST, now },
);
await go('/results', 2800);
await shot('fd07-closing-top');
await toEnd();
await shot('fd07b-closing-reminder-ask');

// ── 5. After "Done for today": Today cleared ────────────────────────────
await press('Done for today', 2600);
await shot('fd08-today-cleared');

// ── 6. Day 2: five answers, "5 of 40 for your first range" ──────────────
await edit(P, `v.state.days = {};`);
await go('/home', 2600);
await shot('fd09-today-goal');

// ── 7. "Your first readiness range": 50 answers, the range appears ──────
await edit(
  P,
  `const c = v.state.byCert.cisa; const keep = a.ids.slice(0, 0);
   const extra = a.pool; extra.forEach((id, i) => { const ok = i % 4 !== 0; c.answers[id] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: a.now - DAY_MS }; });
   v.state.days = {};`.replace('DAY_MS', String(DAY)),
  { ids: FIRST, now, pool: JSON.parse(studied).state.byCert.cisa.answers && Object.keys(JSON.parse(studied).state.byCert.cisa.answers).slice(0, 45) },
);
await edit(SEEN, `v.state.moments = {}; v.state.values = {};`);
await go('/home', 2800);
await shot('fd10-today-first-range');

// ── 8. The reminder's one second chance (the 3rd study day, reminders off) ──
// newLearner: the second chance is only for learners onboarded on 1.24 (onboarding sets it); an empty
// reminderAsk reads as a 1.23 upgrader, so the card would never show (UX review S11).
await edit(SEEN, `v.state.moments = { 'first-range:cisa': 1 }; v.state.reminderAsk = { newLearner: true };`);
await edit(P, `const c = v.state.byCert.cisa; c.milestones = { earned: {}, days: 3, lastDay: a }; v.state.days = {};`, dk(now));
await edit(P, `const d = v.state.days; `, null).catch(() => {});
await go('/home', 2800);
await edit(P, `const d = v.state.days.cisa; if (d) { d.done = d.items.map(() => true); d.answered = 10; d.correct = 7; d.minutes = 12; d.celebrated = true; }`);
// The visit above (made only to build the day's plan) already showed the second
// ask, and showing it counts it as used (store/seen.ts reminderAsk.second). Forget
// that, so the card is there again on the cleared day this frame is about.
await edit(SEEN, `v.state.reminderAsk = { newLearner: true };`);
await go('/home', 2800);
// Bring the card into view (its place depends on what else Today shows); fall back to a plain scroll.
const ask = page.getByText('A study time can help', { exact: true }).first();
if (await ask.count()) {
  await ask.evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await wait(700);
} else {
  console.log('fd11: the second ask did not show');
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, 700);
  await wait(700);
}
await shot('fd11-today-second-ask');

// ── 9. You with band words: 12 answers in every domain (under 30, so each shows "Building" or the like).
// The legend goes under the rings whenever a word shows, so no domain name is cut off (UX review S1).
await edit(
  P,
  `const c = v.state.byCert.cisa; c.answers = {};
   for (let d = 1; d <= 5; d++) for (let i = 1; i <= 12; i++) {
     const id = 'd' + d + '_' + String(i).padStart(3, '0'); const ok = (i + d) % 3 !== 0;
     c.answers[id] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: a - 3600000 };
   }`,
  now,
);
await go('/you', 3000);
await shot('fd12-you-bands');

// Put the demo learner back.
await page.evaluate(([k, v, k2, v2]) => {
  localStorage.setItem(k, v);
  localStorage.setItem(k2, v2);
}, [P, studied, S, studiedSettings]);

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
