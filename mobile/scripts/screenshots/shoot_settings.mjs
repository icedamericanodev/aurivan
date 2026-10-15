// Mobile 1.17 "a tidy Settings" (SHOTS=settings, see run.sh).
//
// Shots: Settings (top, middle, end), every sheet (Exam, Exam date calendar,
// Daily time, Starting point, Default mode, Time and days, Theme, Motion,
// About), the calendar after moving a month and picking a day, Settings
// opened at "Badges and your plant" (the plant screens' link), onboarding's
// date step with the calendar, and You without the theme switch.
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
const S = 'aurivan.settings.v1';
const P = 'aurivan.progress.v1';
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
// FONT_SCALE: each text run zooms like the app's text size, up to its style's
// cap (tokens.ts maxScale; titles 26px and up stop at ×1.3). The calendar's day
// numbers and weekday headings are capped at ×1.5 in the app, so they are too.
const zoomText = () =>
  page.evaluate(
    ([sel, f]) => {
      for (const el of document.querySelectorAll(sel)) {
        if (el.dataset.zoomed) continue;
        const px = parseFloat(getComputedStyle(el).fontSize) || 16;
        const inDay = el.closest('[aria-label*=" 20"]') && /^\d{1,2}$|^(Mo|Tu|We|Th|Fr|Sa|Su)$/.test(el.textContent || '');
        el.style.zoom = String(px >= 26 ? Math.min(1.3, f) : inDay ? Math.min(1.5, f) : f);
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
const toTop = async (text, offset = 90) => {
  if (FONT_SCALE) await zoomText();
  const el = page.getByText(text, { exact: true }).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};
const press = async (name, ms = 900) => {
  await page.getByRole('button', { name }).first().click();
  await wait(ms);
};
const openRow = (title) => press(new RegExp(`^${title}, `));
const closeSheet = () => press(/^(Close|Cancel|Done), /, 700);

// The seed's learner: an exam date about 12 weeks out, reminders on, a fit chosen.
await go('/home', 1500);
await edit(S, `Object.assign(v.state, { examDates: { cisa: a }, familiarity: 'some', dailyMinutes: 20, fitPrompt: 'answered', reminder: { enabled: true, hour: 19, minute: 30, days: [1, 2, 3, 4, 5] } });`, dk(now + 88 * DAY));
await edit(P, `v.state.plantSettings = { ...(v.state.plantSettings || {}), promptHidden: true };`);

// ── 1. Settings: top, middle, end ──────────────────────────────────────
await go('/settings', 2200);
await shot('st01-settings-top');
await toTop('Reminders', 20);
await shot('st02-settings-middle');
await page.mouse.wheel(0, 30000);
await wait(800);
await shot('st03-settings-end');

// ── 2. Each sheet ──────────────────────────────────────────────────────
await go('/settings', 2000);
await openRow('Certification');
await shot('st04-sheet-exam');
await closeSheet();
await openRow('Exam date');
await shot('st05-sheet-calendar');
if (FONT_SCALE) {
  // At large text the sheet scrolls: the month grid under the quick choices.
  await page.mouse.move(W / 2, H * 0.6);
  await page.mouse.wheel(0, 900);
  await wait(700);
  await shot('st05c-sheet-calendar-scrolled');
}
await press('Next month', 700);
// Pick a day in the shown month: the 15th.
const shownMonth = await page.getByRole('heading').filter({ hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/ }).first().textContent();
await page.getByRole('button', { name: new RegExp(`^\\w+ 15 ${shownMonth}`) }).first().click();
await wait(700);
await shot('st05b-sheet-calendar-picked');
await closeSheet();
await openRow('Daily time');
await shot('st06-sheet-daily-time');
await closeSheet();
await openRow('Starting point');
await shot('st07-sheet-starting-point');
await closeSheet();
await openRow('Default mode');
await shot('st08-sheet-default-mode');
await closeSheet();
await toTop('Reminders', 20);
await openRow('Time and days');
await shot('st09-sheet-time-and-days');
await closeSheet();
await openRow('Theme');
await shot('st10-sheet-theme');
await closeSheet();
await openRow('Motion');
await shot('st11-sheet-motion');
await closeSheet();
await page.mouse.wheel(0, 30000);
await wait(600);
await press(/^About KaiSip/);
await shot('st12-sheet-about');
await closeSheet();

// ── 3. Opened from the plant screens: at "Badges and your plant" ──────
await go('/settings?section=plant', 2400);
await shot('st13-settings-at-plant');

// ── 4. Opened from "Set exam date": straight into the calendar ────────
await edit(S, `v.state.examDates = {};`);
await go('/settings?open=exam-date', 2400);
await shot('st14-calendar-no-date');

// ── 5. Onboarding's date step: quick choices + the same calendar ──────
await edit(S, `v.state.onboarded = false;`);
await go('/onboarding', 1800);
await press('Get started'); // mobile 1.24 (was "Start my plan"; the exam step after the name is gone)
await press('Skip'); // mobile 1.23: the optional "What should we call you?" step
await press('Skip this question');
await shot('st15-onboarding-date');
await press('Pick the exact date');
await shot('st15b-onboarding-calendar');
await press('Next month', 700);
const obMonth = await page.getByRole('heading').filter({ hasText: /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/ }).first().textContent();
await page.getByRole('button', { name: new RegExp(`^\\w+ 20 ${obMonth}`) }).first().click();
await wait(500);
await press('Save', 1000);
await shot('st15c-onboarding-exact-date');
await edit(S, `v.state.onboarded = true;`);

// ── 6. You: no theme switch at the top any more ───────────────────────
await go('/you', 2600);
await shot('st16-you-top');

// ── 7. Mobile 1.19: Check for updates, every state ────────────────────
// The web build has no real updates: run.sh exports it with
// EXPO_PUBLIC_AURIVAN_SHOTS=1, so a demo client (src/lib/updates.ts) answers
// after 1.5 s per step, in the way this window value asks for.
const demo = async (mode) => {
  await ctx.addInitScript((m) => (window.__AURIVAN_UPDATE_DEMO__ = m), mode);
  await go('/settings', 2000);
  await page.mouse.wheel(0, 30000);
  await wait(800);
};
const UPDATE_ROW = /^Check for updates, /;
await demo('available');
await shot('st17-update-idle');
await press(UPDATE_ROW, 400);
await shot('st18-update-checking');
await wait(1400);
await shot('st19-update-downloading');
await wait(1700);
await shot('st20-update-ready');
await demo('current');
await press(UPDATE_ROW, 1900);
await shot('st21-update-up-to-date');
await demo('offline');
await press(UPDATE_ROW, 1900);
await shot('st22-update-offline');
await demo('restart-fails');
await press(UPDATE_ROW, 3400);
await press('Restart to update', 1900);
await shot('st23-update-restart-failed');

console.log('errors:', errs.slice(0, 5));
await browser.close();
