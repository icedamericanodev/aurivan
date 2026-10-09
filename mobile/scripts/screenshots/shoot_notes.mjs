// Study notes screenshots (393x852 @2x): Learn entry, notes home, Domain 4,
// a subtopic with a compare table + diagram (4B1.2) and its "Practice this
// concept" button + the session it opens, a long subtopic (1A2.4),
// and search results for "RPO". Usage: node shoot_notes.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=notes bash scripts/screenshots/run.sh <out> <dark|light>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const snap = async (name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (path, wait = 1800) => { await page.goto(base + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(wait); };
// Scroll so the given heading text sits near the top of the screen.
const scrollTo = async (text) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - 110); }
  await page.waitForTimeout(700);
};
const scrollBy = async (dy) => { await page.mouse.move(196, 500); await page.mouse.wheel(0, dy); await page.waitForTimeout(700); };

await open('/learn'); await snap('n01-learn-entry');
await open('/notes'); await snap('n02-notes-home');
await open('/notes/4'); await snap('n03-domain4');
await scrollBy(700); await snap('n03b-domain4-topics');
await open('/notes/subtopic/4B1.2'); await snap('n04-4B1.2-top');
await scrollTo('Compare'); await snap('n04b-4B1.2-compare');
await scrollTo('Illustration'); await snap('n04c-4B1.2-diagram');
// The end of the note: "Practice this concept" + helper, then the session it opens.
await page.mouse.wheel(0, 20000); await page.waitForTimeout(700); await snap('n04d-4B1.2-practice');
// The demo seed has an unfinished session (that would ask "Replace it?"), so drop it first.
await page.evaluate(() => localStorage.removeItem('aurivan.session.v1'));
await open('/notes/subtopic/4B1.2'); await page.mouse.wheel(0, 20000); await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Practice this concept' }).click();
await page.waitForTimeout(1800); await snap('n04e-4B1.2-concept-session');
await open('/notes/subtopic/1A2.4'); await snap('n05-1A2.4-top');
for (let i = 1; i <= 4; i++) { await scrollBy(700); await snap(`n05${'bcde'[i - 1]}-1A2.4-scroll${i}`); }
await page.mouse.wheel(0, 20000); await page.waitForTimeout(700); await snap('n05f-1A2.4-end');
await open('/notes');
await page.getByLabel('Search the study notes').fill('RPO');
await page.waitForTimeout(900); await snap('n06-search-RPO');
await page.getByLabel('Search the study notes').fill('zzqx');
await page.waitForTimeout(900); await snap('n07-search-empty');
await open('/notes/9'); await snap('n08-domain-not-found');
await open('/notes/subtopic/9Z9.9'); await snap('n09-note-not-found');
console.log('errors:', errs.slice(0, 5));
await browser.close();
