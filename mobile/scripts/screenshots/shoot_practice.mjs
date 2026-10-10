// Practice tab screenshots (393x852 @2x, plus one full-length shot):
// the first screen a learner sees, the whole tab, Guided mode (with the
// "Or 10 mixed questions" link), the path chooser opened, Build a set opened,
// and an approximate large-text view.
// Usage: node shoot_practice.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=practice bash scripts/screenshots/run.sh <out> <dark|light>
//
// Large text: the web build always reports a font scale of 1, so the app's
// ×1.3 reflow rules (stacked segments, wrapping chips) can't run here. The
// "-large" shot zooms every text run to 200% with CSS instead, which shows
// how the layout copes with long, wrapping text. Check the reflow rules on a
// device or in the screen tests.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';

/** The demo seed with extra settings (e.g. a saved study mode), no paused session. */
function seedWith(extra = {}) {
  const settings = JSON.parse(seed['aurivan.settings.v1']);
  Object.assign(settings.state, extra);
  const s = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) };
  delete s['aurivan.session.v1'];
  return s;
}

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
async function newPage({ height = 852, extra } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, seedWith(extra));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  return page;
}
const snap = async (page, name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (page, p) => { await page.goto(base + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800); };
/** Tap a control by its spoken name, if this build has it. */
const tapIf = async (page, role, name) => {
  const el = page.getByRole(role, { name, exact: typeof name === 'string' }).first();
  if (!(await el.count())) return false;
  await el.click();
  await page.waitForTimeout(600);
  return true;
};
const FULL = 3000;
// The path chooser's summary row and Build a set's row (absent before the redesign).
const PATH_ROW = /^Your path/;
const SET_ROW = /^Build a set/;

// ── 1. The first screen, and the whole tab ──
{
  const page = await newPage();
  await open(page, '/practice');
  await snap(page, 'pr01-top');
  await page.context().close();
}
{
  const page = await newPage({ height: FULL });
  await open(page, '/practice');
  await snap(page, 'pr02-full');
  await page.context().close();
}

// ── 2. Guided: the hero opens a step; a quick mixed 10 stays one tap away ──
{
  const page = await newPage({ extra: { studyMode: 'guided' } });
  await open(page, '/practice');
  await snap(page, 'pr03-guided-top');
  await page.context().close();
}

// ── 3. The path chooser, opened (new design) ──
{
  const page = await newPage();
  await open(page, '/practice');
  if (await tapIf(page, 'button', PATH_ROW)) {
    await snap(page, 'pr04-path-open');
    await page.getByRole('radio', { name: /^In order/ }).first().click();
    await page.waitForTimeout(500);
    await snap(page, 'pr04b-path-in-order');
  }
  await page.context().close();
}
{
  const page = await newPage({ height: FULL });
  await open(page, '/practice');
  if (await tapIf(page, 'button', PATH_ROW)) await snap(page, 'pr05-path-open-full');
  await page.context().close();
}

// ── 4. Build a set, opened (new design) ──
{
  const page = await newPage({ height: FULL });
  await open(page, '/practice');
  if (await tapIf(page, 'button', SET_ROW)) {
    await tapIf(page, 'button', 'IS Operations');
    await snap(page, 'pr06-build-set-open-full');
  }
  await page.context().close();
}

// ── 5. Approximate 200% text ──
{
  const page = await newPage({ height: FULL });
  await open(page, '/practice');
  await page.addStyleTag({ content: 'div[dir="auto"] { zoom: 2; }' });
  await page.waitForTimeout(600);
  await snap(page, 'pr07-large-text-full');
  await page.context().close();
}

await browser.close();
if (errs.length) {
  console.error('page errors:', errs);
  process.exit(1);
}
