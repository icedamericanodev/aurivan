// Mobile 1.23, the KaiSip rename and "What should we call you?" (SHOTS=kaisip, see run.sh).
//
// Shots: Today with a name, the same with a long name at about 200% text, onboarding's name step
// (empty and typed), Settings (the "You" group), the "Your name" sheet, About (the new name and the
// move-from-Aurivan line), Your data (the same line) and the share card (no name on it).
// FONT_SCALE=2 approximates 200% text for the whole run.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const S = 'aurivan.settings.v1'; // saved-data keys keep the old name on purpose (mobile 1.23)

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
// FONT_SCALE: each text run zooms like the app's text size, up to its style's cap (titles 26px and up stop at x1.3).
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
const edit = (key, fn) =>
  page.evaluate(([k, src]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', src)(v);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn]);
const press = async (label, ms = 900) => {
  await page.getByRole('button', { name: label }).first().click();
  await wait(ms);
};

// Today, greeting by name (open the page once first so localStorage is reachable).
await go('/home', 800);
await edit(S, `v.state.displayName = 'Maya';`);
await go('/home');
await shot('k01-today-name');
// A long name (24 characters, one unbroken word at the end).
await edit(S, `v.state.displayName = 'Wolfeschlegelstein Hausen';`);
await go('/home');
await shot('k01b-today-long-name');
await edit(S, `delete v.state.displayName;`);
await go('/home');
await shot('k01c-today-no-name');

// Onboarding: the optional name step.
await edit(S, `v.state.onboarded = false;`);
await go('/onboarding', 1800);
await shot('k02-onboarding-welcome');
await press('Start my plan');
await shot('k03-onboarding-name');
await page.getByRole('textbox', { name: 'Your name' }).fill('Maya');
await wait(500);
await shot('k03b-onboarding-name-typed');
await edit(S, `v.state.onboarded = true; v.state.displayName = 'Maya';`);

// Settings: the "You" group, its sheet, About and Your data.
await go('/settings');
await shot('k04-settings');
await press(/^Your name, /);
await shot('k05-settings-your-name');
await page.getByLabel('Cancel, Your name').first().click().catch(() => {});
await wait(500);
const aboutRow = page.getByRole('button', { name: /^About KaiSip/ }).first();
await aboutRow.scrollIntoViewIfNeeded();
await aboutRow.click();
await wait(900);
await shot('k06-about');
await page.getByText('New name', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
await wait(400);
await shot('k06b-about-new-name');
await page.getByRole('button', { name: /^Close, About KaiSip/ }).first().click().catch(() => {});
await wait(500);
await page.getByText('Your data', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
await wait(400);
await shot('k07-settings-your-data');

// The share card: no name, only the KaiSip lockup.
await go('/you');
await page.getByRole('button', { name: /^Share progress/ }).first().click();
await wait(1200);
await shot('k08-share-card');

console.log('errors:', errs.slice(0, 5));
await browser.close();
