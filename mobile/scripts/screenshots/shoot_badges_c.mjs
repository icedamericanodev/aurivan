// Mobile 1.11 badge tiers, Took Root and the share card (SHOTS=badgesC, see
// run.sh): the tier ladders (Rooted, Long Memory, Dress Rehearsal, Firm
// Footing's 80% Stretch tier), Took Root, the five domain specimens side by
// side (pressed on herbarium sheets since mobile 1.51) with their Stretch row, a set that grew ("New in Evergreen"), the
// one-time catalogue line, the share entry on a badge's sheet, and the share
// card (and, since 1.18, Flown the Nest's sheet and card). REDUCED=1 runs with Reduce Motion on (files end "-reduced").
// FONT_SCALE=2: approximate 200% text for the badge sheet, its tier ladder and
// the share panel (files end "-fs200"). The card itself is a fixed picture in
// the app (its text never scales), so its text runs are left at 100% here too.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const REDUCED = process.env.REDUCED === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${REDUCED ? '-reduced' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const P = 'aurivan.progress.v1';
const SEEN = 'aurivan.seen.v1';
const DAY = 86400000;

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
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
const go = async (path, ms = 2400) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (FONT_SCALE) {
    await page.addStyleTag({ content: `div[dir="auto"] { zoom: ${FONT_SCALE}; } [aria-label^="Badge card."] div[dir="auto"] { zoom: 1; }` });
  }
  await wait(ms);
};
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
const toTop = async (text, offset = 70) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};
/** Open a badge's sheet by its specimen's spoken label. Since mobile 1.51 an
 *  earned one reads "<name>[, <metal>][. Stretch, beyond exam need]. Pressed
 *  [by] <date>. …" (cellSpoken in src/components/badges.tsx), never "Earned". */
const open = async (name) => {
  await page.getByRole('button', { name }).first().click();
  await wait(1400);
};
const close = async () => {
  await page.getByRole('button', { name: /^Close / }).first().click();
  await wait(800);
};
/** Inside an open sheet: put a line near its top. */
const sheetTo = async (text) => {
  await page.getByText(text, { exact: true }).last().evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(500);
};

const now = Date.now();
await go('/home', 2600);

// ── State A: well along. Every domain at Firm Footing, two 80% tiers, the
// spaced mocks begun, Took Root earned; the catalogue fill's line waiting.
await edit(P, `
  const m = v.state.byCert.cisa.milestones; const t = a; const d = 86400000;
  const keys = { 'first-foothold': 70, 'topic-clear': 66, 'ten-topics': 50, 'firm-footing:1': 34, 'firm-footing:2': 31, 'firm-footing:3': 29,
    'firm-footing:4': 40, 'firm-footing:5': 38, 'whole-map': 28, 'firm-footing:4:80': 9, 'firm-footing:5:80': 6,
    'long-memory': 45, 'long-memory:75': 12, 'graduate': 20, 'loop-closed': 33, 'took-root': 2,
    'know-what-you-know': 24, 'slip-spotter': 30, 'dress-rehearsal': 21, 'dress-rehearsal:2': 7, 'on-pace': 14,
    'rooted:10': 60, 'rooted:30': 25 };
  for (const [k, ago] of Object.entries(keys)) m.earned[k] = t - ago * d;
  m.queue = []; m.backfill = { ...(m.backfill || { at: t - 80 * d, count: 0 }), seen: true };
  m.catalog = 2; m.catalogFill = { at: t - 1 * d, count: 2 };
  m.earned['took-root'] = t - 1 * d; m.earned['dress-rehearsal:2'] = t - 1 * d;
  m.counts = { ...(m.counts || {}), longRecall: 96 };`, now);
await edit(SEEN, `v.state.caseSeen = { cisa: a }; v.state.badgeSort = 'set';`, now);

if (FONT_SCALE) {
  // 200% text: a badge's sheet, its tier ladder, and the share panel.
  await go('/milestones', 2600);
  await toTop('Evergreen');
  await open(/^Long Memory · 75 recalls, Lichen\. Pressed/);
  await shot('c30-sheet');
  await sheetTo('Tiers');
  await shot('c31-ladder');
  await close();
  await toTop('Evergreen');
  await open(/^Took Root\. Pressed/);
  await page.getByRole('button', { name: /^Share Took Root$/ }).click();
  await wait(1400);
  await shot('c32-share-panel');
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 700);
  await wait(700);
  await shot('c32b-share-panel-actions');
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
  process.exit(0);
}

await go('/milestones', 2600);
await shot('c07-case-new-tiers-line');
await toTop('The Five Domains');
await shot('c03-five-domains-and-stretch');
await toTop('Evergreen');
await shot('c02-evergreen-took-root');
await toTop('Exam Day');
await shot('c04-examday-rooted');

// The tier ladders, each opened from its own specimen.
await toTop('Rooted');
await open(/^Rooted · 30 days, Lichen\. Pressed/);
await sheetTo('Tiers');
await shot('c10-ladder-rooted');
await close();
await toTop('Evergreen');
await open(/^Long Memory · 75 recalls, Lichen\. Pressed/);
await shot('c11-ladder-long-memory');
await sheetTo('Tiers');
await shot('c11b-ladder-long-memory-tiers');
await close();
await toTop('Exam Day');
await open(/^Dress Rehearsal · 2 mocks, Lichen\. Pressed/);
await sheetTo('Tiers');
await shot('c12-ladder-dress-rehearsal');
await close();
await toTop('The Five Domains');
await open(/^Firm Footing · IS Operations · 80%, Lichen\. Stretch/);
await shot('c13-ladder-firm-footing-stretch');
await sheetTo('Tiers');
await shot('c13b-ladder-firm-footing-stretch-tiers');
await close();

// Took Root, earned: its sheet (it arrived with the catalogue fill: "Pressed by" that date).
await toTop('Evergreen');
await open(/^Took Root\. Pressed/);
await shot('c14-sheet-took-root');

// The share entry, then the card.
await sheetTo('Share');
await shot('c20-sheet-share-entry');
await page.getByRole('button', { name: /^Share Took Root$/ }).click();
await wait(1400);
await shot('c21-share-card');
await close();
await toTop('The Five Domains');
await open(/^Firm Footing · IS Operations, Clay\. Pressed/);
await page.getByRole('button', { name: /^Share Firm Footing · IS Operations$/ }).click();
await wait(1400);
await shot('c22-share-card-domain');
await close();
// Mobile 1.18: Flown the Nest (saved id `graduate`), its sheet and its share card.
await toTop('Evergreen');
await open(/^Flown the Nest\. Pressed/);
await shot('c23-sheet-flown-the-nest');
await sheetTo('Share');
await page.getByRole('button', { name: /^Share Flown the Nest$/ }).click();
await wait(1400);
await shot('c24-share-card-flown-the-nest');
await close();

// ── State B: a set that was complete and grew (1.10's Evergreen) ───────
await edit(P, `
  const m = v.state.byCert.cisa.milestones;
  delete m.earned['long-memory:75']; delete m.earned['took-root']; m.counts.longRecall = 52;
  m.planters = { ...(m.planters || {}), evergreen: a - 30 * 86400000 };
  m.catalogFill = { ...m.catalogFill, seen: true };`, now);
await go('/milestones', 2400);
await toTop('Evergreen');
await shot('c05-new-in-evergreen');

console.log('errors:', errs.slice(0, 5));
await browser.close();
