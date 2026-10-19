// Exam guide and final review week screenshots (393x852 @2x): Learn's two new
// rows, About the CISA exam (top and a section with its sources), the final
// review week (the day cards, today's card open with its tasks) with two days
// marked done, the cheat sheet (top, and "Cover the points" on), and Today's
// card 4 days before the exam.
// The demo exam date moves to 4 days out (the seed's 38 days is outside the week).
// Usage: node shoot_guides.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=guides bash scripts/screenshots/run.sh <out> <dark|light>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';

// 4 days out (local date), and days 7 and 6 marked done with one checklist tick.
const pad = (n) => String(n).padStart(2, '0');
const at = new Date(Date.now() + 4 * 86400000);
const examDate = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
const settings = JSON.parse(seed['aurivan.settings.v1']);
settings.state.examDates = { cisa: examDate };
seed['aurivan.settings.v1'] = JSON.stringify(settings);
const progress = JSON.parse(seed['aurivan.progress.v1']);
progress.state.byCert.cisa.moments = { examWeek: { for: examDate, done: ['booking'], days: ['day-7', 'day-6'] } };
seed['aurivan.progress.v1'] = JSON.stringify(progress);
// No paused quiz in these shots.
delete seed['aurivan.session.v1'];

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
// `last`: the section heading, not the "On this page" row with the same words.
const scrollTo = async (text, top = 110, last = false) => {
  const all = page.getByText(text, { exact: true });
  const el = last ? all.last() : all.first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - top); }
  await page.waitForTimeout(700);
};

// Learn: About the CISA exam and Final review week, under Principles.
await open('/learn'); await scrollTo('Look it up'); await snap('g01-learn-rows');
// About the CISA exam: the top (the check line, On this page), then a section and its sources.
await open('/exam-guide'); await snap('g02-guide-top');
await scrollTo('Registering and fees', 110, true); await snap('g03-guide-section');
await page.mouse.wheel(0, 700); await page.waitForTimeout(700); await snap('g03a-guide-sources');
await open('/exam-guide'); await scrollTo('The five domains and their weights', 110, true); await snap('g03b-guide-domains');
// Final review week: the day cards (today = 4 days out, open), then today's tasks.
await open('/exam-week'); await snap('g04-week-top');
await scrollTo('Pace check', 160); await snap('g05-week-today');
await scrollTo('Cheat sheet', 200); await snap('g06-week-checklist');
// The cheat sheet: the top, then "Cover the points" on.
await open('/cheat-sheet'); await snap('g07-sheet-top');
await page.getByRole('switch').first().click(); await page.waitForTimeout(600);
await page.getByText('Show point 2', { exact: true }).first().click(); await page.waitForTimeout(500);
await snap('g08-sheet-cover');
await open('/cheat-sheet'); await scrollTo('Priority words'); await snap('g09-sheet-priority');
// Today: the card, 4 days before the exam.
await open('/home'); await scrollTo('Final review week', 300); await snap('g10-today-card');
// The eve: only the eve card, with "Tonight's list", then the plan opened at that list.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('aurivan.settings.v1'));
  const at = new Date(Date.now() + 86400000);
  const p = (n) => String(n).padStart(2, '0');
  s.state.examDates = { cisa: `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}` };
  localStorage.setItem('aurivan.settings.v1', JSON.stringify(s));
});
await open('/home'); await snap('g11-today-eve');
await page.getByText('Tonight’s list', { exact: true }).first().click(); await page.waitForTimeout(1500); await snap('g12-week-eve-list');
console.log('errors:', errs.slice(0, 5));
await browser.close();
