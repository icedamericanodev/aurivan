// Build E "Choose your path" screenshots (393x852 @2x): the mode picker, a
// Smart question with its reason tag, a Guided step, an In order session
// ending in its mixed review tail, Practice this topic, Root or Rumor (a
// statement and its feedback) and Call It First (step 1 and step 2).
// Usage: node shoot_paths.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=paths bash scripts/screenshots/run.sh <out> <dark|light>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';

// No paused session: the shots start their own.
const baseSeed = { ...seed };
delete baseSeed['aurivan.session.v1'];

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, baseSeed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  return page;
}
const snap = async (page, name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (page, p) => { await page.goto(base + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800); };
const scrollTo = async (page, locator, top = 110) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - top); }
  await page.waitForTimeout(700);
};
/** Practice's "Your path" row opens the mode picker in place. */
const openPath = async (page) => { await page.getByRole('button', { name: /^Your path/ }).first().click(); await page.waitForTimeout(500); };
/** The hero's start button (Start / Open step). */
const heroStart = (page) => page.getByRole('button', { name: /^(Start|Open step)$/ }).first();

// ── 1. The mode picker; 2. a Smart question with its reason tag ──
{
  const page = await newPage();
  await open(page, '/practice');
  await snap(page, 'e01-practice-hero');
  await openPath(page);
  await scrollTo(page, page.getByRole('button', { name: /^Your path/ }).first(), 90);
  await snap(page, 'e02-mode-picker');
  await page.getByRole('radio', { name: /^Smart/ }).click();
  await page.waitForTimeout(400);
  await open(page, '/practice');
  await heroStart(page).click();
  await page.waitForTimeout(1800);
  await snap(page, 'e03-smart-reason-tag');
  // A weak spot further in, if the first isn't one.
  for (let k = 0; k < 6; k++) {
    if (await page.getByText('Weak spot', { exact: true }).count()) break;
    await page.getByLabel(/^Option A/).first().click();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^(Next question|See results)$/ }).click();
    await page.waitForTimeout(900);
  }
  await snap(page, 'e03b-smart-weak-spot');
  await page.context().close();
}

// ── 3. A Guided step ──
{
  const page = await newPage();
  await open(page, '/practice');
  await openPath(page);
  await page.getByRole('radio', { name: /^Guided/ }).click();
  await page.waitForTimeout(400);
  await open(page, '/practice');
  await snap(page, 'e04-practice-guided-hero');
  await heroStart(page).click();
  await page.waitForTimeout(1500);
  await snap(page, 'e05-guided-step');
  await page.mouse.move(196, 500); await page.mouse.wheel(0, 700); await page.waitForTimeout(700);
  await snap(page, 'e05b-guided-step-start');
  await page.context().close();
}

// ── 4. In order: the session, then its last question (the mixed review tail) ──
{
  const page = await newPage();
  await open(page, '/practice');
  await openPath(page);
  await page.getByRole('radio', { name: /^In order/ }).click();
  await page.waitForTimeout(400);
  await open(page, '/practice');
  await heroStart(page).click();
  await page.waitForTimeout(1800);
  await snap(page, 'e06-in-order-first');
  // Jump to the last question (the tail) by moving the saved index, as a resume would.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aurivan.session.v1'));
    s.state.active.index = s.state.active.questionIds.length - 1;
    localStorage.setItem('aurivan.session.v1', JSON.stringify(s));
  });
  await open(page, '/session');
  await snap(page, 'e07-in-order-mixed-tail');
  await page.context().close();
}

// ── 5. Practice this topic (Study notes → a domain) ──
{
  const page = await newPage();
  await open(page, '/notes/1');
  await scrollTo(page, page.getByRole('button', { name: 'Practice this topic' }).first(), 380);
  await snap(page, 'e08-practice-this-topic');
  await page.getByRole('button', { name: 'Practice this topic' }).first().click();
  await page.waitForTimeout(1800);
  await snap(page, 'e08b-topic-session');
  await page.context().close();
}

// ── 6. Root or Rumor: the level picker, a statement, its feedback ──
{
  const page = await newPage();
  await open(page, '/game/rumor');
  await snap(page, 'e09-rumor-intro');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'e10-rumor-statement');
  await page.getByRole('button', { name: 'Root, a sound principle' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'e11-rumor-feedback');
  await page.context().close();
}

// ── 6b. Root or Rumor: Heartwood's "Why?" step and its reveal; a missed myth ──
// Statements are random: tap until one is a Rumor (a Root just moves on).
{
  const page = await newPage();
  await open(page, '/game/rumor');
  await page.getByLabel(/^Heartwood\./).first().click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  for (let k = 0; k < 11; k++) {
    await page.getByRole('button', { name: 'Rumor, an exam myth' }).click();
    await page.waitForTimeout(700);
    if (await page.getByText('Why is it a myth? Pick the reason.').count()) {
      await snap(page, 'e11b-rumor-why-step');
      await page.getByLabel(/^Option A/).first().click();
      await page.waitForTimeout(900);
      await snap(page, 'e11c-rumor-why-reveal');
      break;
    }
    await page.getByRole('button', { name: 'Next statement' }).click();
    await page.waitForTimeout(500);
  }
  await page.context().close();
}
{
  const page = await newPage();
  await open(page, '/game/rumor');
  await page.getByLabel(/^Sapling\./).first().click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  for (let k = 0; k < 11; k++) {
    await page.getByRole('button', { name: 'Root, a sound principle' }).click();
    await page.waitForTimeout(700);
    if (await page.getByText('This one is a Rumor: a myth the exam counts on').count()) {
      await snap(page, 'e11d-rumor-missed-myth');
      break;
    }
    await page.getByRole('button', { name: 'Next statement' }).click();
    await page.waitForTimeout(500);
  }
  await page.context().close();
}

// ── 7. Call It First: step 1 (principle cards, options hidden), step 2 ──
{
  const page = await newPage();
  await open(page, '/game/callit');
  await snap(page, 'e12-callit-intro');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'e13-callit-step1');
  await page.getByLabel(/^Option A/).first().click();
  await page.waitForTimeout(900);
  await snap(page, 'e14-callit-step2');
  await page.mouse.move(196, 500); await page.mouse.wheel(0, 500); await page.waitForTimeout(600);
  await snap(page, 'e14b-callit-step2-options');
  await page.context().close();
}

// ── 8. Play lists both games; Settings → Default mode ──
{
  const page = await newPage();
  await open(page, '/play');
  await page.mouse.move(196, 500); await page.mouse.wheel(0, 500); await page.waitForTimeout(700);
  await snap(page, 'e15-play');
  await open(page, '/settings');
  await scrollTo(page, page.getByText('Default mode', { exact: true }).first(), 200);
  await snap(page, 'e16-settings-default-mode');
  await page.context().close();
}

await browser.close();
if (errs.length) {
  console.error('page errors:', errs);
  process.exit(1);
}
