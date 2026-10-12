// Mobile 1.15 "Fit the plan to each learner" (SHOTS=fit, see run.sh; PHASE5.md §2.11).
//
// Shots: onboarding step 2 (nothing chosen, then "New to audit"), step 3
// (date + minutes), step 4 (the plant, renumbered); Today for a new learner's
// day 1, a 10-minute day with a big review queue, the Exam-focused mini mock,
// the existing-learner "Fit your plan" card and a cleared day's Tomorrow;
// the fit screen; Settings → Your study with "Today's plan stays"; Practice in
// the Exam-focused order; You's legend and accuracy note; the Mistake
// journal's tags and their sheet; an answer after a hint; the exam-eve card.
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
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const DAY = 86_400_000;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
// FONT_SCALE: every text run is zoomed like the app's text size, up to its
// style's cap (tokens.ts maxScale): titles and numerals (26px and up) stop at
// ×1.3, reading text goes to the full scale.
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
/** Put a heading or line near the top of the screen. */
const toTop = async (text, offset = 90) => {
  if (FONT_SCALE) await zoomText();
  const el = page.getByText(text).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};
const press = async (name, ms = 800) => {
  await page.getByRole('button', { name }).first().click();
  await wait(ms);
};
const pick = async (name, ms = 600) => {
  await page.getByRole('radio', { name }).first().click();
  await wait(ms);
};
// The seed's study, kept to put back after the fresh-learner shots.
await go('/home', 1500);
const studied = await page.evaluate((k) => localStorage.getItem(k), P);
const restoreStudy = () => page.evaluate(([k, v]) => localStorage.setItem(k, v), [P, studied]);
/** Today's plan is rebuilt on the next Today visit (the stored one is dropped). */
const replan = () => edit(P, `v.state.days = {};`);
/** The fit, answered (no Today card), with these choices. */
const fit = (f) => edit(S, `delete v.state.familiarity; delete v.state.examFocused; Object.assign(v.state, { fitPrompt: 'answered', dailyMinutes: 20 }, a);`, f);
// No plant prompt in these shots: the fit is the subject. The seed's paused
// session is put aside too (it would add a "Resume" row), and back for f16.
await edit(P, `v.state.plantSettings = { promptHidden: true };`);
const SESSION = 'aurivan.session.v1';
const paused = await page.evaluate((k) => localStorage.getItem(k), SESSION);
await page.evaluate((k) => localStorage.removeItem(k), SESSION);

// ── 1. Onboarding: steps 2, 3 and 4 of 4 ──────────────────────────────
await edit(S, `v.state.onboarded = false;`);
await go('/onboarding', 1800);
await press('Start my plan');
await press('Continue');
await shot('f01-onboarding-start-empty');
await pick(/^New to audit/);
await shot('f02-onboarding-start-new');
await press('Continue');
await shot('f03-onboarding-date-minutes');
if (FONT_SCALE) {
  // At 2× text both groups stay reachable: the minutes under the sticky footer.
  await toTop('How long can you study most days?', 40);
  await shot('f03b-onboarding-minutes-scrolled');
}
await press('Continue', 1400);
await shot('f04-onboarding-plant');
await edit(S, `v.state.onboarded = true;`);

// ── 2. Today ───────────────────────────────────────────────────────────
// f05: a new learner's day 1: the first lesson, then 5 questions on it.
await edit(P, `v.state.byCert.cisa = { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} }; v.state.days = {};`);
await fit({ familiarity: 'new' });
await go('/home', 2600);
await shot('f05-today-new-day1');
await restoreStudy();
await edit(P, `v.state.plantSettings = { promptHidden: true };`);

// f06: "some" at 10 minutes with a big review queue: reviews only, "8 today".
// (A mini mock 2 days ago: no second one this week, so the day is ordinary.)
await fit({ familiarity: 'some', dailyMinutes: 10 });
await edit(P, `v.state.byCert.cisa.mocks = [{ id: 'm1', finishedAt: a, total: 50, correct: 34, minutesUsed: 70, byDomain: {}, timing: 'standard' }]; v.state.days = {};`, now - 2 * DAY);
await go('/home', 2600);
await shot('f06-today-10min-reviews');

// f07: Exam-focused, no reviews due, no mock this week, one weak domain: the
// mini mock leads, then the weak spots (never a lesson).
await restoreStudy();
await edit(P, `const c = v.state.byCert.cisa; c.review = {}; c.mocks = []; v.state.days = {}; v.state.plantSettings = { promptHidden: true };
  let k = 0; for (const [id, r] of Object.entries(c.answers)) if (id.startsWith('d3_') && k++ % 2 === 0) { r.lastCorrect = false; }`);
await fit({ familiarity: 'experienced' });
await go('/home', 2600);
await shot('f07-today-exam-focused-mock');
await restoreStudy();
await edit(P, `v.state.plantSettings = { promptHidden: true };`);

// f08: a learner from before 1.15: the one "Fit your plan" card, below the day's study.
await edit(S, `delete v.state.familiarity; delete v.state.examFocused; delete v.state.fitPrompt; delete v.state.dailyMinutes; v.state.dailyGoal = 20;`);
await replan();
await go('/home', 2600);
await toTop('Fit your plan', FONT_SCALE ? 60 : 260);
await shot('f08-today-fit-card');

// f09: a cleared day: Tomorrow previews no more than the day's minutes.
await fit({ familiarity: 'some', dailyMinutes: 20 });
await replan();
await go('/home', 2400);
await edit(P, `const d = v.state.days.cisa; d.done = d.items.map(() => true); d.answered = 16; d.correct = 12; d.minutes = 19; d.celebrated = true;`);
await go('/home', 2600);
await toTop('Tomorrow', 200);
await shot('f09-today-cleared-tomorrow');

// ── 3. The fit screen ──────────────────────────────────────────────────
await edit(S, `delete v.state.familiarity; delete v.state.fitPrompt; delete v.state.dailyMinutes; v.state.dailyGoal = 40;`);
await replan();
await go('/fit', 2200);
await shot('f10-fit-screen');
await toTop('Exam-focused plan', 120);
await shot('f10b-fit-screen-end');

// ── 4. Settings → Your study, a change after something was ticked ──────
await fit({ familiarity: 'some', dailyMinutes: 20 });
await replan();
await go('/home', 2400);
await edit(P, `const d = v.state.days.cisa; d.done = d.items.map((_, i) => i === 0);`);
await go('/settings', 2200);
await toTop('Your study', 20);
await pick(/^30 minutes a day$/);
await shot('f11-settings-your-study');
await toTop('Exam-focused plan', 160);
await shot('f11b-settings-kept-line');

// ── 5. Practice in the Exam-focused order ──────────────────────────────
await fit({ familiarity: 'experienced' });
await replan();
await go('/practice', 2400);
await shot('f12-practice-exam-focused');
await toTop('Mock exams', 60);
await shot('f12b-practice-mocks');

// ── 6. You: the legend 1 → 5 and the accuracy note ─────────────────────
await fit({ familiarity: 'some' });
await go('/you', 2600);
await toTop('Domain 1 is the inner ring.', 380);
await shot('f13-you-legend');

// ── 7. Mistake journal: the tags and what they mean ────────────────────
await go('/mistakes', 2200);
await toTop('Why did you slip?', 260);
await shot('f14-mistakes-tags');
await press('What do these mean?', 1200);
await shot('f15-mistakes-tags-sheet');

// ── 8. An answer after a hint (J6) ─────────────────────────────────────
const keys = (seed.__shotKeys || 'D').split(',');
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SESSION, paused]);
await go('/session', 1800);
await page.getByRole('button', { name: 'Coach me', exact: true }).click();
await wait(700);
await page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first().click();
await page.getByText('Check answer', { exact: true }).click();
await wait(1400);
await shot('f16-answer-after-hint');

// ── 9. The exam-eve card, in seconds ───────────────────────────────────
await edit(S, `v.state.examDates = { cisa: a };`, dk(now + DAY));
await replan();
await go('/home', 2600);
await shot('f17-exam-eve');

console.log('errors:', errs.slice(0, 5));
await browser.close();
