// Build D "Pace" screenshots (393x852 @2x): the Practice offer card and Timed
// switch, the mock start sheet, Settings → Study defaults, a mock with a
// checkpoint line, the mock pacing panel, timed practice with the 2-minute
// cue, and Daylight (pick a light, a round, the end screen).
// Usage: node shoot_pace.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=pace bash scripts/screenshots/run.sh <out> <dark|light>
// Timed scenes use Playwright's clock, so minutes pass without waiting.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';
const here = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(here, '../../src/content/generated/cisa');
const bank = [1, 2, 3, 4, 5].map((d) => JSON.parse(fs.readFileSync(path.join(GEN, `d${d}.json`))));

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const dk = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const NOW = Date.now();

// The demo learner, 14 days before the exam: Practice offers the timer once.
const settings = JSON.parse(seed['aurivan.settings.v1']);
settings.state.examDates = { cisa: dk(NOW + 14 * DAY) };
const baseSeed = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) };
delete baseSeed['aurivan.session.v1'];

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
async function newPage({ clock = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, baseSeed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  if (clock) await page.clock.install({ time: NOW });
  return page;
}
const snap = async (page, name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
/** Let time pass: on the fake clock when installed, else for real. */
const pass = async (page, ms, clock) => { if (clock) await page.clock.runFor(ms); else await page.waitForTimeout(ms); };
const open = async (page, p, clock = false) => { await page.goto(base + p, { waitUntil: 'networkidle' }); await pass(page, 1800, clock); };
const scrollTo = async (page, text, top = 110, clock = false) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - top); }
  await pass(page, 700, clock);
};
const setSession = async (page, active) =>
  page.evaluate((s) => localStorage.setItem('aurivan.session.v1', s), JSON.stringify({ state: { active }, version: 1 }));

// 50 mock questions, 10 per domain, no shuffle (so the shots are easy to read).
const ids = bank.flatMap((d) => d.slice(20, 30).map((q) => q.id));
const byId = Object.fromEntries(bank.flat().map((q) => [q.id, q]));
const perms = Object.fromEntries(ids.map((id) => [id, Object.keys(byId[id].options).sort()]));
const wrongOf = (q) => Object.keys(q.options).find((l) => l !== q.correct);
/** n answers, ~70% right, `sec(i)` seconds each, given at `at(i)`. */
const responses = (n, sec, at, right = (i) => i % 10 < 7) =>
  Object.fromEntries(ids.slice(0, n).map((id, i) => [id, { display: right(i) ? byId[id].correct : wrongOf(byId[id]), correct: right(i), ms: sec(i) * 1000, at: at(i) }]));

// ── Practice: the offer card and the Timed switch; the mock start sheet; Study defaults ──
{
  const page = await newPage();
  await open(page, '/practice');
  await snap(page, 'p01-practice-offer');
  await open(page, '/mock-start?questions=50');
  await snap(page, 'p02-mock-start');
  // Extra time with the clock hidden.
  await page.getByRole('radio', { name: /^\+25% time/ }).click();
  await page.getByLabel('Hide the clock (checkpoints only)').click();
  await page.waitForTimeout(500);
  await snap(page, 'p02b-mock-start-extra-time');
  await open(page, '/settings');
  await scrollTo(page, 'Study defaults', 300);
  await snap(page, 'p03-settings-study-defaults');
  // Play lists Daylight with the other games.
  await open(page, '/play');
  await page.mouse.move(196, 500); await page.mouse.wheel(0, 400); await page.waitForTimeout(700);
  await snap(page, 'p10-play');
  await page.context().close();
}

// ── A mini mock at the 25% check: 11 done in 20 minutes → behind ──
{
  const page = await newPage({ clock: true });
  await open(page, '/home', true);
  const startedAt = NOW - 20 * MIN - 5000;
  await setSession(page, {
    id: 'mock-demo', mode: 'mock', certId: 'cisa', title: 'Mini mock', questionIds: ids, perms, index: 11,
    responses: responses(11, (i) => 95 + (i % 4) * 20, (i) => startedAt + (i + 1) * 100_000), flagged: [ids[4]],
    startedAt, deadline: startedAt + 80 * MIN, timing: 'standard',
  });
  await open(page, '/session', true);
  await pass(page, 2000, true);
  await snap(page, 'p04-mock-checkpoint');
  await page.context().close();
}

// ── Mock results: the pacing panel ──
{
  const page = await newPage({ clock: true });
  await open(page, '/home', true);
  const startedAt = NOW - 80 * MIN;
  await setSession(page, {
    id: 'mock-done', mode: 'mock', certId: 'cisa', title: 'Mini mock', questionIds: ids, perms, index: 49,
    // 46 answered; the last few in a rush at the end (the rushing signature).
    responses: responses(46, (i) => (i > 40 ? 25 : 70 + (i % 5) * 15 + (Math.floor(i / 10) === 3 ? 40 : 0)), (i) => startedAt + Math.min(79, i * 1.7 + 1) * MIN, (i) => (i > 40 ? i % 2 === 0 : i % 10 < 7)),
    flagged: [], startedAt, deadline: startedAt + 80 * MIN, finishedAt: NOW, timing: 'standard',
    checkpoints: [
      { at: 0.25, done: 14, deviation: -0.05, minutes: 0 },
      { at: 0.5, done: 25, deviation: 0.06, minutes: 0 },
      { at: 0.75, done: 34, deviation: 0.15, minutes: 9 },
    ],
  });
  await open(page, '/results', true);
  await scrollTo(page, 'Pacing', 110, true);
  await snap(page, 'p05-mock-results-pacing');
  await page.context().close();
}

// ── Timed practice: the count-up clock, then the 2-minute cue ──
{
  const page = await newPage({ clock: true });
  await open(page, '/home', true);
  const pids = ids.slice(0, 10);
  await setSession(page, {
    id: 'practice-demo', mode: 'practice', certId: 'cisa', title: 'Quick 10', questionIds: pids,
    perms: Object.fromEntries(pids.map((id) => [id, perms[id]])), index: 2,
    responses: responses(2, (i) => [64, 88][i], (i) => NOW - (2 - i) * MIN), flagged: [], startedAt: NOW - 3 * MIN, timed: true,
  });
  await open(page, '/session', true);
  await pass(page, 35_000, true);
  await snap(page, 'p06-practice-timed');
  await pass(page, 95_000, true);
  await snap(page, 'p06b-practice-timed-cue');
  await page.context().close();
}

// ── Daylight: pick a light, a round, the end screen ──
{
  const page = await newPage({ clock: true });
  await open(page, '/game/daylight', true);
  await snap(page, 'p07-daylight-pick');
  await page.getByRole('radio', { name: /^Sapling/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await pass(page, 40_000, true);
  await page.getByRole('button', { name: 'Flag & move on' }).click();
  await pass(page, 70_000, true);
  await snap(page, 'p08-daylight-round');
  // Answer this one, read, then let the light set.
  await page.getByLabel(/^Option A/).first().click();
  await pass(page, 800, true);
  await snap(page, 'p08b-daylight-answer');
  await page.getByRole('button', { name: 'Next question' }).click();
  // The light's last 10%: the visible "About a minute of light left." line.
  await pass(page, 325_000, true);
  await snap(page, 'p08c-daylight-low-light');
  await pass(page, 80_000, true);
  await pass(page, 1500, true);
  await snap(page, 'p09-daylight-end');
  await scrollTo(page, 'The light set before these', 110, true);
  await snap(page, 'p09b-daylight-end-light-set');
  await page.context().close();
}

console.log('errors:', errs.slice(0, 5));
await browser.close();
