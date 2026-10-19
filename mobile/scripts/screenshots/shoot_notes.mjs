// Study notes screenshots (393x852 @2x): Learn entry, notes home, Domain 4,
// a subtopic with a compare table + diagram (4B1.2) and its "Practice this
// concept" button + the session it opens, a long subtopic (1A2.4),
// and search results for "RPO", and (mobile 1.29) "Auditing it" on 4B1.1. Usage: node shoot_notes.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=notes bash scripts/screenshots/run.sh <out> <dark|light>
// FONT_SCALE=2 approximates 200% text (as shoot_settings.mjs); file names gain "-fs200".
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const sfx = `${process.argv[4] ? `-${process.argv[4]}` : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const base = 'http://127.0.0.1:8093';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
// The app reads this on web to lay out for large text (components/ui.tsx useFontScale).
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
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
const snap = async (name) => {
  if (FONT_SCALE) { await zoomText(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx);
};
const open = async (path, wait = 1800) => {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  // Zoom before any scrolling, so "scroll to a heading" lands where the large text puts it.
  if (FONT_SCALE) { await zoomText(); await page.waitForTimeout(400); }
};
// Scroll so the given heading text sits near the top of the screen.
const scrollTo = async (text) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - 110); }
  await page.waitForTimeout(700);
};
const scrollBy = async (dy) => { await page.mouse.move(196, 500); await page.mouse.wheel(0, dy); await page.waitForTimeout(700); };

// Mobile 1.29: "Auditing it" on 4B1.1 and on 5B2.1 (the longest): the section and the lens under it.
// NOTES_SHOTS=audit shoots only these (a quick check of the section).
await open('/notes/subtopic/4B1.1'); await scrollTo('Auditing it'); await snap('n11-4B1.1-auditing-it');
await scrollBy(400); await snap('n11b-4B1.1-auditing-it-end');
await open('/notes/subtopic/5B2.1'); await scrollTo('Auditing it'); await snap('n12-5B2.1-auditing-it');
await scrollBy(500); await snap('n12b-5B2.1-auditing-it-more');
await scrollBy(500); await snap('n12c-5B2.1-auditing-it-end');
if (process.env.NOTES_SHOTS === 'audit') {
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
  process.exit(0);
}

await open('/learn'); await snap('n01-learn-entry');
await open('/notes'); await snap('n02-notes-home');
await open('/notes/4'); await snap('n03-domain4');
await scrollBy(700); await snap('n03b-domain4-topics');
await open('/notes/subtopic/4B1.2'); await snap('n04-4B1.2-top');
await scrollTo('Compare'); await snap('n04b-4B1.2-compare');
await scrollTo('Diagram'); await snap('n04c-4B1.2-diagram'); // mobile 1.21: the section is "Diagram"
// The end of the note: "Practice this concept" + helper, then the session it opens.
await page.mouse.wheel(0, 20000); await page.waitForTimeout(700); await snap('n04d-4B1.2-practice');
// The demo seed has an unfinished session (that would ask "Replace it?"), so drop it first.
await page.evaluate(() => localStorage.removeItem('aurivan.session.v1'));
await open('/notes/subtopic/4B1.2'); await page.mouse.wheel(0, 20000); await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Practice this concept' }).click();
await page.waitForTimeout(1800); await snap('n04e-4B1.2-concept-session');
// Mobile 1.22: the native diagrams drawn for the phone (components/noteFigures.tsx).
for (const id of ['4A7.2', '4A8.3', '4A6.2', '4B5.4']) {
  await open(`/notes/subtopic/${id}`); await scrollTo('Diagram'); await snap(`n04f-${id}-diagram`);
}
await open('/notes/subtopic/1A2.4'); await snap('n05-1A2.4-top');
for (let i = 1; i <= 4; i++) { await scrollBy(700); await snap(`n05${'bcde'[i - 1]}-1A2.4-scroll${i}`); }
await page.mouse.wheel(0, 20000); await page.waitForTimeout(700); await snap('n05f-1A2.4-end');
await open('/notes');
await page.getByLabel('Search the study notes').fill('RPO');
await page.waitForTimeout(900); await snap('n06-search-RPO');
await page.getByLabel('Search the study notes').fill('zzqx');
await page.waitForTimeout(900); await snap('n07-search-empty');
// Mobile 1.25: Settings → Your study → "Reset reading progress", and its confirm.
await open('/settings'); await scrollTo('Your study'); await snap('n10-settings-reset-reading');
await open('/notes/9'); await snap('n08-domain-not-found');
await open('/notes/subtopic/9Z9.9'); await snap('n09-note-not-found');
console.log('errors:', errs.slice(0, 5));
await browser.close();
