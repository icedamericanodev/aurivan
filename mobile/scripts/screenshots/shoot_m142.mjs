// Mobile 1.42 "bring your website progress into the app" (SHOTS=m142, see run.sh).
//
// Shots: Settings → the "Your data, …" door → the Your data screen (since mobile 1.46 its own screen,
// settings-section?category=data; the Restore row names the website file), the "Add your website
// progress?" sheet (top and end), the message after adding (with Undo last import), the same file again
// ("Already on this phone"), a file with two profiles ("Which progress?"), a newer website file's
// message, and a new phone's welcome screen adding website progress.
// The website file is the test fixture made by driving the real website (src/__tests__/fixtures).
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
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = fs.readFileSync(path.join(here, '../../src/__tests__/fixtures/web-export-v12.json'), 'utf8');
const web = JSON.parse(WEB);

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const newPage = async (seedIt) => {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (seedIt) {
    await ctx.addInitScript((s) => {
      if (localStorage.getItem('__seeded')) return;
      for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
      localStorage.setItem('__seeded', '1');
    }, seed);
  } else {
    await ctx.addInitScript((t) => {
      if (localStorage.getItem('__seeded')) return;
      localStorage.setItem('aurivan.settings.v1', JSON.stringify({ state: { onboarded: false, theme: t }, version: 1 }));
      localStorage.setItem('__seeded', '1');
    }, theme);
  }
  if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
  return ctx.newPage();
};
const page = await newPage(true);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms, p = page) => p.waitForTimeout(ms);
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';
const zoomText = (p) =>
  p.evaluate(
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
const shot = async (name, p = page) => {
  if (FONT_SCALE) {
    await zoomText(p);
    await wait(400, p);
  }
  await p.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const go = async (route, ms = 2200, p = page) => {
  await p.goto(BASE + route, { waitUntil: 'networkidle' });
  await wait(ms, p);
};
const pick = async (name, text, p = page) => {
  const chooser = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: 'Restore from a backup' }).first().click();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await wait(1400, p);
};
const into = async (text, p = page) => {
  const n = p.getByText(text).first();
  if (await n.count()) {
    await n.evaluate((x) => x.scrollIntoView({ block: 'center' }));
    await wait(600, p);
  } else console.log(`"${text}" did not show`);
};
/** Scroll the open sheet to its end. */
const sheetEnd = async (p = page) => {
  await p.mouse.move(W / 2, H / 2);
  await p.mouse.wheel(0, 3000);
  await wait(700, p);
};

// ── Settings → Your data, then the website file ─────────────────────────
// Your data is a door in Settings' last card ("Data and help"); tapping it opens its own screen,
// where the Restore row lives. Every later pick() stays on that screen.
await go('/settings');
const door = page.getByRole('button', { name: /^Your data, / }).first();
await door.scrollIntoViewIfNeeded();
await door.click();
await page.waitForURL(/settings-section/);
await page.getByRole('button', { name: 'Restore from a backup' }).first().waitFor();
await wait(1200);
await shot('w01-your-data');
await pick('kaisip-web-progress.json', WEB);
await shot('w02-web-sheet');
await sheetEnd();
await shot('w02b-web-sheet-end');
await page.getByRole('button', { name: 'Add to my progress' }).first().click();
await wait(1800);
await into('Your website progress is on this phone now', page);
await shot('w03-added');

// The same file again: everything is already here.
await pick('kaisip-web-progress.json', WEB);
await shot('w04-already-here');
await page.getByRole('button', { name: 'Close' }).first().click();
await wait(700);

// A file with two profiles: which one?
const work = { ...web.profile, id: 'p_work', name: 'Work laptop', lastActive: web.profile.lastActive - 5 * 86400000 };
await pick('kaisip-web-progress-all.json', JSON.stringify({ cisaMindsetExport: true, version: 1, profiles: { p_home: web.profile, p_work: work } }));
await shot('w05-which-progress');
await page.getByRole('button', { name: /^(Cancel|Close)$/ }).first().click();
await wait(700);

// A file from a newer website: one calm message.
await pick('kaisip-web-progress-new.json', JSON.stringify({ ...web, version: 9 }));
await into('newer version of the KaiSip website');
await shot('w06-newer-website-file');

// ── A new phone: the welcome screen adds website progress ───────────────
const fresh = await newPage(false);
await go('/onboarding', 1800, fresh);
await pick('kaisip-web-progress.json', WEB, fresh);
await shot('w07-welcome-web-sheet', fresh);

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
