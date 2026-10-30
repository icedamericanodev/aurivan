// Mobile 1.49, the premium pass's first slices (SHOTS=m149, see run.sh; the default run takes them too).
//
// Shots, in light AND dark (one fresh browser per theme, so each starts from the seed):
//   m149-1-answer-miss       the answer after a miss: "Question" recap, verdict, the two rows
//   m149-2-show-question     the recap opened with "Show question"
//   m149-3-go-deeper         further down: the one "Go deeper" row and the source line
//   m149-4-more-sheet        the ⋯ "More on this question" sheet
//   m149-5-lesson-check      a lesson quick check after a miss: recap, verdict, two rows
//   m149-6-lesson-check-why  the same, scrolled to "Why B" and the round Back + Next footer
// THEMES=light (or dark) takes one theme only.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const THEMES = (process.env.THEMES || 'light,dark').split(',').filter(Boolean);
const BASE = 'http://127.0.0.1:8093';
const W = 393;
const H = 852;
// The charter lesson's quick check; its best answer starts with this (any other option is a miss).
const LESSON = 'cisa-l-d1-charter';
const LESSON_KEY = 'The audit committee';

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
for (const theme of THEMES) {
  // The seed with this run's theme (the seed file carries one theme; the settings store is JSON).
  const settings = JSON.parse(seed['aurivan.settings.v1']);
  settings.state.theme = theme;
  const themed = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) };
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, themed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => {
    await page.screenshot({ path: `${out}/${name}-${theme}.png` });
    console.log('shot', `${name}-${theme}`);
  };
  const go = async (route, ms = 2200) => {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await wait(ms);
  };
  /** Bring the first element with this text to the given part of the screen. */
  const into = async (text, block = 'start') => {
    const n = page.getByText(text).first();
    if (await n.count()) {
      await n.evaluate((x, b) => x.scrollIntoView({ block: b }), block);
      await wait(700);
    } else console.log(`"${text}" did not show`);
  };

  // ── The answer after a miss (the seed's first sample picks its runner-up) ──
  const keys = (seed.__shotKeys || 'D').split(',');
  await go('/session', 1600);
  await page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await wait(1600);
  await shot('m149-1-answer-miss');
  const show = page.getByRole('button', { name: 'Show question', exact: true }).first();
  if (await show.count()) {
    await show.click();
    await wait(700);
    await shot('m149-2-show-question');
    await page.getByRole('button', { name: 'Hide question', exact: true }).first().click();
    await wait(500);
  } else console.log('no "Show question" (a short stem)');
  // The one way on, then the source line under it.
  await into('Original · Reviewed', 'center');
  await shot('m149-3-go-deeper');
  await page.getByRole('button', { name: 'More on this question', exact: true }).first().click();
  await wait(900);
  await shot('m149-4-more-sheet');
  await page.getByRole('button', { name: 'Close, More on this question', exact: true }).first().click();
  await wait(600);

  // ── A lesson quick check after a miss ──
  await go(`/lesson/${LESSON}`, 1600);
  for (let i = 0; i < 12; i++) {
    if (await page.getByLabel(/^Option [A-D]:/).count()) break;
    await page.getByRole('button', { name: 'Next', exact: true }).first().click();
    await wait(900);
  }
  const options = page.getByLabel(/^Option [A-D]:/);
  const n = await options.count();
  for (let i = 0; i < n; i++) {
    const label = (await options.nth(i).getAttribute('aria-label')) || '';
    if (!label.includes(LESSON_KEY)) {
      await options.nth(i).click();
      break;
    }
  }
  await wait(1800);
  // The reveal scroll brings the verdict up; take it from the top of the scene too.
  await into('Quick check', 'start');
  await shot('m149-5-lesson-check');
  await into('Why ', 'center');
  await shot('m149-6-lesson-check-why');
  await ctx.close();
}
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
