// Mobile 1.16 "Proof" (SHOTS=proof, see run.sh; PHASE5.md §3.5).
//
// Shots: the readiness report (full, with 8 mocks: every section, in several
// scrolls), not enough data yet, one mock, a mock opened from You, a "down"
// trend; Today in exam week 6 days out (the optional full mock and the Exam
// week card) and 3 days out (no mock); Today's readiness words as a button
// with its focus ring; the exam-week checklist with 2 ticked; You's Mock
// exams rows with "See report".
// NARROW=1 uses a 360-wide phone; FONT_SCALE=2 approximates 200% text.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const NARROW = process.env.NARROW === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const DAY = 86_400_000;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';
// FONT_SCALE: every text run is zoomed like the app's text size, up to its
// style's cap (tokens.ts maxScale): titles and numerals (26px and up) stop at
// ×1.3, reading text goes to the full scale.
const zoomText = () =>
  page.evaluate(
    ([sel, f]) => {
      for (const el of document.querySelectorAll(sel)) {
        if (el.dataset.zoomed) continue;
        const px = parseFloat(getComputedStyle(el).fontSize) || 16;
        el.style.zoom = String(px >= 26 ? Math.min(1.3, f) : f);
        el.dataset.zoomed = '1';
      }
    },
    [TEXT_RUNS, FONT_SCALE],
  );
const go = async (path, ms = 2400) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name) => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(400);
  }
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
/** Put a heading or line near the top of the screen. */
const toTop = async (text, offset = 90) => {
  if (FONT_SCALE) await zoomText();
  const el = page.getByText(text, { exact: true }).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};

// ── Demo data ──────────────────────────────────────────────────────────
// Eight mocks over five weeks, oldest first: minis and two full ones, one
// untimed, each with per-domain results and pacing (timed ones).
const tally = (pcts, sizes) => Object.fromEntries(pcts.map((p, i) => [String(i + 1), { total: sizes[i], correct: Math.round((p / 100) * sizes[i]) }]));
const MINI = [9, 9, 6, 13, 13];
const FULL = [27, 26, 20, 39, 38];
const plan = [
  { days: 35, kind: 'mini', pcts: [60, 55, 50, 58, 54], timing: 'standard', sec: 101 },
  { days: 30, kind: 'mini', pcts: [66, 58, 52, 61, 57], timing: 'untimed' },
  { days: 26, kind: 'mini', pcts: [70, 60, 50, 62, 60], timing: 'standard', sec: 95 },
  { days: 21, kind: 'full', pcts: [72, 63, 55, 64, 61], timing: 'standard', sec: 93 },
  { days: 16, kind: 'mini', pcts: [76, 66, 53, 69, 62], timing: 'plus25', sec: 104 },
  { days: 11, kind: 'mini', pcts: [78, 70, 60, 70, 66], timing: 'standard', sec: 90 },
  { days: 6, kind: 'full', pcts: [80, 71, 58, 72, 67], timing: 'standard', sec: 88 },
  { days: 2, kind: 'mini', pcts: [85, 74, 62, 77, 70], timing: 'standard', sec: 86 },
];
const mockOf = (m, i) => {
  const sizes = m.kind === 'full' ? FULL : MINI;
  const byDomain = tally(m.pcts, sizes);
  const total = sizes.reduce((a, b) => a + b, 0);
  const correct = Object.values(byDomain).reduce((a, b) => a + b.correct, 0);
  return {
    id: `demo-mock-${i}`,
    finishedAt: now - m.days * DAY - 3 * 3_600_000,
    total,
    correct,
    minutesUsed: m.kind === 'full' ? 226 : 74,
    byDomain,
    timing: m.timing,
    ...(m.timing !== 'untimed' ? { minutesAllowed: m.kind === 'full' ? 240 : 80, medianSec: m.sec, unanswered: i === 3 ? 2 : 0 } : {}),
  };
};
const MOCKS = plan.map(mockOf).reverse(); // the store keeps newest first
// The low end over the last 30 days, rising from 58 to 66, with a few gaps.
const LOG = [];
for (let k = 29; k >= 0; k--) {
  if ([27, 22, 21, 15, 9, 8].includes(k)) continue;
  const low = Math.round(58 + ((29 - k) / 29) * 8 + (k % 4 === 0 ? -1 : 0));
  LOG.push({ day: dk(now - k * DAY), min: low, last: low });
}
const setMocks = (mocks) => edit(P, `const c = v.state.byCert.cisa; c.mocks = a; c.moments = { ...(c.moments || {}), readiness: ${JSON.stringify(LOG)} }; v.state.days = {}; v.state.plantSettings = { promptHidden: true };`, mocks);
const examIn = (n) => edit(S, `v.state.examDates = { cisa: a }; Object.assign(v.state, { fitPrompt: 'answered', familiarity: 'some', dailyMinutes: 20 });`, dk(now + n * DAY));

// ── Readiness report, full (p01) ───────────────────────────────────────
await go('/home', 1500);
const studied = await page.evaluate((k) => localStorage.getItem(k), P);
const restoreStudy = () => page.evaluate(([k, v]) => localStorage.setItem(k, v), [P, studied]);
await examIn(38);
await setMocks(MOCKS);
await go('/readiness', 2400);
await shot('p01a-report-top');
await toTop('Your low end over time', 40);
await shot('p01b-report-low-and-trend');
await toTop('Mock trend', 40);
await shot('p01c-report-trend');
await toTop('Domain by domain', 40);
await shot('p01d-report-domains');
await toTop('Pacing', 40);
await shot('p01e-report-pacing-path');
await toTop('Your path', 40);
await shot('p01f-report-path');
await toTop('Your mocks', 40);
await shot('p01g-report-mocks');
// "How it's worked out", opened.
await go('/readiness', 2000);
await page.getByRole('button', { name: 'How it’s worked out' }).first().click();
await wait(700);
await shot('p01h-report-how');

// ── Not enough data (p02) ──────────────────────────────────────────────
await edit(P, `const c = v.state.byCert.cisa; const keep = Object.keys(c.answers).slice(0, 28); c.answers = Object.fromEntries(keep.map((k) => [k, c.answers[k]])); c.mocks = []; c.moments = {}; c.review = {}; v.state.days = {};`);
await go('/readiness', 2400);
await shot('p02-report-not-enough');
await toTop('Mock trend', 40);
await shot('p02b-report-not-enough-lower');
await restoreStudy();

// ── One mock (p03) ─────────────────────────────────────────────────────
await setMocks([MOCKS[0]]);
await go('/readiness', 2400);
await toTop('Mock trend', 40);
await shot('p03-report-one-mock');

// ── A mock opened from You (p04) ───────────────────────────────────────
await setMocks(MOCKS);
await go(`/readiness?mock=${MOCKS[1].id}`, 2600);
await shot('p04-report-mock-expanded');

// ── A fall, said plainly (p05) ─────────────────────────────────────────
const down = plan.map(mockOf);
down[down.length - 1] = mockOf({ ...plan[plan.length - 1], pcts: [70, 62, 50, 66, 58] }, plan.length - 1);
await setMocks(down.reverse());
await go('/readiness', 2400);
await toTop('Mock trend', 40);
await shot('p05-report-trend-down');

// ── Today in exam week (p06, p07) ──────────────────────────────────────
// 6 days out, no full mock in 14 days: reviews, a top-up and the optional full mock.
await setMocks(MOCKS.filter((m) => m.total !== FULL.reduce((a, b) => a + b, 0) || now - m.finishedAt > 15 * DAY));
await edit(P, `const c = v.state.byCert.cisa; c.moments = { ...(c.moments || {}), examWeek: { for: a, done: ['booking', 'pace'] } };`, dk(now + 6 * DAY));
await examIn(6);
await go('/home', 2600);
await shot('p06-today-exam-week-6');
await toTop('This week', 120);
await shot('p06b-today-exam-week-card');
// 3 days out: the taper, no mock.
await edit(P, `v.state.days = {}; v.state.byCert.cisa.moments.examWeek.for = a;`, dk(now + 3 * DAY));
await examIn(3);
await go('/home', 2600);
await shot('p07-today-exam-week-3');

// ── Today's readiness words as a button, with keyboard focus (p08) ─────
await examIn(38);
await edit(P, `v.state.days = {};`);
await go('/home', 2600);
await page.locator('[data-testid="readiness-tap"]').first().focus();
await wait(500);
await toTop('estimated readiness, weighted like the exam', 260);
await page.locator('[data-testid="readiness-tap"]').first().focus();
await wait(400);
await shot('p08-today-readiness-tap');

// ── The exam-week checklist, 2 ticked (p09) ────────────────────────────
await examIn(6);
await edit(P, `const c = v.state.byCert.cisa; c.moments = { ...(c.moments || {}), examWeek: { for: a, done: ['booking', 'pace'] } };`, dk(now + 6 * DAY));
await go('/exam-week', 2200);
await shot('p09-exam-week-checklist');
await toTop('If you blank', 160);
await shot('p09b-exam-week-end');

// ── You: Mock exams rows with "See report" (p10) ───────────────────────
await examIn(38);
await setMocks(MOCKS);
await go('/you', 2600);
await toTop('Mock exams', 40);
await shot('p10-you-mock-exams');
await toTop('See report', 300); // mobile 1.21: the Readiness section's action
await shot('p10b-you-report-link');

console.log('errors:', errs.slice(0, 5));
await browser.close();
