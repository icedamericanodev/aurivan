// FB-001 visual regression (SHOTS=fb001, see run.sh), as rebuilt for phone 2.2 (owner direction, 19 Nov 2026;
// learner report R-ZXUQ): the practice answer is the short summary again (the card, Key idea, the tips, then
// Why), and the whole question lives behind ONE switch, "Show question & choices". The inline
// "Compare all options" list these shots used to scroll through is gone from practice.
//
// Shots, in light AND dark (fresh browsers per theme, so each starts from the seed):
//   q22-1-answer-miss     the answer as it first appears after a MISS: the recap closed, verdict, the card
//   q22-2-choices-open    the same after "Show question & choices": the whole question and all four choices
//   q22-3-why-open        the same after "Show why for each choice": each choice's own reason under it
//   q22-4-closed-again    closed again: back to the first view (the reasons close with it)
//   q22-5-answer-correct  the same question answered RIGHT, as it first appears
// The lesson quick check and the ⋯ sheet are in shoot_m149.mjs (SHOTS=m149 and the default run).
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

/**
 * The first sample's best answer as a DISPLAY letter, worked out as make_seed.py does (the question's key,
 * through the seeded shuffle). Only used when the letter cannot be read off the answer card.
 */
const seededBest = () => {
  try {
    const s = JSON.parse(seed['aurivan.session.v1']).state.active;
    const id = s.questionIds[0];
    const bank = JSON.parse(fs.readFileSync(new URL(`../../src/content/generated/cisa/d${id.match(/^d(\d+)_/)[1]}.json`, import.meta.url), 'utf8'));
    const at = s.perms[id].indexOf(bank.find((q) => q.id === id).correct);
    return at >= 0 ? 'ABCD'[at] : null;
  } catch {
    return null;
  }
};

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
for (const theme of THEMES) {
  // The seed with this run's theme (the seed file carries one theme; the settings store is JSON).
  const settings = JSON.parse(seed['aurivan.settings.v1']);
  settings.state.theme = theme;
  const themed = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) };
  let ctx;
  let page;
  /** A new browser context on the seed: the session is back on its first question, unanswered. */
  const fresh = async () => {
    if (ctx) await ctx.close();
    ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript((s) => {
      if (localStorage.getItem('__seeded')) return;
      for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
      localStorage.setItem('__seeded', '1');
    }, themed);
    page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(e.message));
  };
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => {
    await page.screenshot({ path: `${out}/${name}-${theme}.png` });
    console.log('shot', `${name}-${theme}`);
  };
  const go = async (route, ms = 2200) => {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await wait(ms);
  };
  /** Bring the block the app marks with this testID to the given part of the screen. */
  const intoId = async (id, block = 'start') => {
    const n = page.getByTestId(id).first();
    if (await n.count()) {
      await n.evaluate((x, b) => x.scrollIntoView({ block: b }), block);
      await wait(700);
    } else console.log(`testID "${id}" did not show`);
  };
  /** Tap the control with this testID. A switch that is not there is reported with the page errors. */
  const tapId = async (id) => {
    const n = page.getByTestId(id).first();
    if (!(await n.count())) {
      errs.push(`${theme}: testID "${id}" did not show`);
      return false;
    }
    await n.click();
    await wait(700);
    return true;
  };
  /** Tap this option on the first question and check it. */
  const answer = async (letter) => {
    await go('/session', 1600);
    await page.getByLabel(new RegExp(`^Option ${letter}:`)).first().click();
    await page.getByText('Check answer', { exact: true }).click();
    await wait(1600);
  };

  // ── (a) The answer after a miss (the seed's first sample picks its runner-up) ──
  const keys = (seed.__shotKeys || 'D').split(',');
  await fresh();
  await answer(keys[0]);
  await shot('q22-1-answer-miss');
  // The best answer's letter, read off the card ("Best answer, D: …"), for the right answer further down.
  const bestRow = page.getByLabel(/^Best answer, [A-D]: /).first();
  const said = (await bestRow.count()) ? (await bestRow.getAttribute('aria-label')) || '' : '';
  const best = (said.match(/^Best answer, ([A-D]): /) || [])[1] || seededBest();
  if (!said) console.log(`no "Best answer" row: Option ${keys[0]} was not a miss (the first sample has no runner-up)`);

  // ── (b) "Show question & choices": the whole question and all four choices, in place ──
  if (await tapId('recap-toggle')) {
    // The switch at the top of the screen, so the question above it scrolls off and every choice is in view.
    await intoId('recap-toggle', 'start');
    await shot('q22-2-choices-open');
    // ── (c) "Show why for each choice": each choice's own reason under it ──
    if (await tapId('recap-why-toggle')) {
      await intoId('recap-choices', 'start');
      await shot('q22-3-why-open');
    }
    // ── (d) Closed again (closing the question also closes the reasons): back to the first view ──
    await intoId('recap-toggle', 'center');
    await tapId('recap-toggle');
    await intoId('question-recap', 'end');
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.wheel(0, -4000);
    await wait(700);
    if (await page.getByTestId('recap-choices').count()) errs.push(`${theme}: the choices are still open after "Hide question & choices"`);
    await shot('q22-4-closed-again');
  }

  // ── (e) The same question answered RIGHT, as it first appears (a new browser: the seed again) ──
  if (best) {
    await fresh();
    await answer(best);
    if (!(await page.getByLabel(/^Your answer, [A-D], the best: /).count())) errs.push(`${theme}: Option ${best} was not graded as the best answer`);
    await shot('q22-5-answer-correct');
  } else errs.push(`${theme}: could not tell the best answer's letter, so no q22-5-answer-correct`);
  await ctx.close();
}
// Always printed (an empty list means a clean run): page errors, and any step above that could not run.
console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
