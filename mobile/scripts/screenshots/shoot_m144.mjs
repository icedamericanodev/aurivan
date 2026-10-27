// Mobile 1.44 "Version 3": the name and "Your study profile" (SHOTS=m144, see run.sh).
//
// Shots: Today on the second study day with the one name card (field inside, Save, Not now), Save with
// nothing typed, the field focused and filled, the
// saved state ("Saved on this device", and the greeting with the name), the "Add your website
// progress?" sheet with "Your name: Maya" and its note, and You with and without a name.
// NARROW=1 uses a 360-wide phone; FONT_SCALE=2 approximates 200% text.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const DAY = 86_400_000;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const here = path.dirname(fileURLToPath(import.meta.url));
const web = JSON.parse(fs.readFileSync(path.join(here, '../../src/__tests__/fixtures/web-export-v12.json'), 'utf8'));
const WEB_NAMED = JSON.stringify({ ...web, displayName: 'Maya' });

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
const go = async (route, ms = 2600) => {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await wait(ms);
};
/** `again`: a line to bring back into view after the 200% zoom (zooming moves everything down). */
const shot = async (name, again) => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(400);
    if (again) {
      const n = page.getByText(again).first();
      if (await n.count()) await n.evaluate((x) => x.scrollIntoView({ block: 'center' }));
      await wait(500);
    }
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
/** Bring a line into the middle of the screen; say so when it is not there. */
const into = async (text, label, block = 'center') => {
  const n = page.getByText(text).first();
  if (await n.count()) {
    await n.evaluate((x, b) => x.scrollIntoView({ block: b }), block);
    await wait(700);
    return true;
  }
  console.log(`${label}: "${text}" did not show`);
  return false;
};

await go('/home', 1200);
const saved = await page.evaluate((ks) => ks.map((k) => localStorage.getItem(k)), [P, S, SEEN]);

// The demo learner on their second study day: no name yet, nothing else asking on Today.
const day2 = async () => {
  await page.evaluate((pairs) => pairs.forEach(([k, v]) => localStorage.setItem(k, v)), [
    [P, saved[0]],
    [S, saved[1]],
    [SEEN, saved[2]],
  ]);
  await edit(S, `delete v.state.displayName; v.state.fitPrompt = 'answered'; v.state.familiarity = 'some'; v.state.dailyMinutes = 20; v.state.examDates = Object.assign(v.state.examDates || {}, { cisa: a });`, dk(now + 110 * DAY));
  await edit(SEEN, `v.state.nameAsk = 'due'; v.state.reminderAsk = { first: 'later', second: true }; v.state.moments = Object.assign(v.state.moments || {}, { 'first-range:cisa': 1 }); delete v.state.tester;`);
  await edit(
    P,
    `v.state.plantSettings = Object.assign(v.state.plantSettings || {}, { promptHidden: true });
     const c = v.state.byCert.cisa; c.milestones = Object.assign(c.milestones || { earned: {} }, { days: 4, lastDay: a });
     v.state.streak = Object.assign(v.state.streak || {}, { lastDay: a, recentDays: [...(v.state.streak?.recentDays || []).filter((d) => d < a), a] });
     v.state.days = {};`,
    dk(now - DAY),
  );
};

// ── 1. Today, day 2: the one name card ──────────────────────────────────
await day2();
await go('/home', 3000);
await into('What should we call you?', 'n01');
await shot('n01-today-name-card', 'What should we call you?');
// Save with nothing typed: one plain line under the field.
await page.getByRole('button', { name: 'Save my name' }).first().click();
await wait(700);
await shot('n01c-today-name-empty-save', 'Type a name or nickname first');

// ── 2. Saved: the line for this visit, and the greeting with the name ───
// (The browser shows no on-screen keyboard; the focused field shows its ink border.)
await page.getByRole('textbox', { name: 'Name or nickname' }).first().click();
await page.getByRole('textbox', { name: 'Name or nickname' }).first().fill('Maya');
await wait(400);
await shot('n01b-today-name-typed', 'What should we call you?');
await page.getByRole('button', { name: 'Save my name' }).first().click();
await wait(900);
await into('Saved on this device', 'n02');
await shot('n02-today-name-saved', 'Saved on this device');
await page.evaluate(() => window.scrollTo(0, 0));
await page.mouse.move(W / 2, H / 2);
await page.mouse.wheel(0, -5000);
await wait(700);
await shot('n02b-today-greeting');

// ── 3. "Add your website progress?" with a name (a phone with none) ─────
await day2();
await go('/settings', 2200);
await into('Your data', 'n03');
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Restore from a backup' }).first().click();
await (await chooser).setFiles({ name: 'kaisip-web-progress.json', mimeType: 'application/json', buffer: Buffer.from(WEB_NAMED) });
await wait(1500);
await into('Your name stays on this device only', 'n03', 'end');
await shot('n03-web-sheet-name', 'Your name stays on this device only');
await page.getByRole('button', { name: 'Cancel' }).first().click().catch(() => {});
await wait(600);

// ── 4. You, with and without a name ─────────────────────────────────────
await day2();
await edit(S, `v.state.displayName = 'Maya';`);
await go('/you', 3000);
await shot('n04-you-profile-named');
await day2();
await go('/you', 3000);
await shot('n05-you-profile-no-name');

// Put the demo learner back.
await page.evaluate((pairs) => pairs.forEach(([k, v]) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v))), [
  [P, saved[0]],
  [S, saved[1]],
  [SEEN, saved[2]],
]);
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
