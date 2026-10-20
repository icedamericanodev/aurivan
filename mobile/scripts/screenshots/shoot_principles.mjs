// Exam-mindset principles screenshots (393x852 @2x): the Learn row that leads
// there, the principles list (top and further down), one principle's page
// (top, middle and the "Practice this principle" ending) and an old id that
// still opens its principle. Mobile 1.31: the 21st principle
// (fit-method-to-objective: top and its ending with the full count) and an
// answered question whose "Principle" row links to it. Usage: node shoot_principles.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=principles bash scripts/screenshots/run.sh <out> <dark|light>
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
const scrollBy = async (dy) => { await page.mouse.move(196, 500); await page.mouse.wheel(0, dy); await page.waitForTimeout(700); };
const scrollTo = async (text) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - 110); }
  await page.waitForTimeout(700);
};

// Learn: the Principles row in "Look it up", under Study notes.
await open('/learn'); await scrollTo('Look it up'); await snap('p01-learn-entry');
// The list, by family.
await open('/principles'); await snap('p02-list-top');
await scrollBy(800); await snap('p02b-list-middle');
await scrollBy(1600); await snap('p02c-list-end');
// One principle with a nuance: top, the trap and example, the ending.
await open('/principles/recommend-dont-implement'); await snap('p03-detail-top');
await scrollTo('The trap'); await snap('p03b-detail-trap-example');
// The ending: Practice this principle, then "Code …" and Report a problem.
await page.mouse.wheel(0, 20000); await page.waitForTimeout(700); await snap('p03c-detail-practice');
// An old id from the web's first library still opens its principle.
await open('/principles/CONTAIN-FIRST'); await snap('p04-legacy-id');
// Mobile 1.31: the 21st principle, top and its ending (the count is every question that tests it).
await open('/principles/fit-method-to-objective'); await snap('p05-fit-method-top');
await page.mouse.wheel(0, 20000); await page.waitForTimeout(700); await snap('p05b-fit-method-practice');
// Mobile 1.31: an answered question (the seed's first sample, a miss on the runner-up)
// and its "Read the principle" row under Read the note, scrolled into view.
const keys = (seed.__shotKeys || 'A').split(',');
await open('/session');
await page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first().click();
await page.getByText('Check answer', { exact: true }).click();
await page.waitForTimeout(1500);
const row = page.getByLabel(/^Read the principle: /).first();
await row.scrollIntoViewIfNeeded();
const rbox = await row.boundingBox();
if (rbox) { await page.mouse.move(196, 400); await page.mouse.wheel(0, rbox.y - 420); }
await page.waitForTimeout(800);
await snap('p06-answer-principle-row');
console.log('errors:', errs.slice(0, 5));
await browser.close();
