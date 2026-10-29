// Mobile 1.10 badge collection (SHOTS=badges, see run.sh): You → Badges
// (empty-ish, mid-progress, nearly complete), each shelf, "Next for your
// exam", the Sort menu and a flat sort, the detail sheet (not yet, earned,
// Rooted's tiers), Results with a new badge, You with the "new" dot, and
// Settings → Show badges (off, and back on); plus a slow-motion frame strip
// of the unlock moment.
//
// The clock tricks are shoot_growth.mjs's: during a strip the page's clocks
// run at 1/SLOW speed, so a 1.2 s moment lasts ~12 s and frames land inside
// it; each strip is 4 frames labelled with app-time, side by side.
// REDUCED=1 runs it with the browser's Reduce Motion on (files end "-reduced").
//
// Mobile 1.51: the case is the Field Guide Herbarium. An earned badge is spoken
// "Pressed by <date>" (it was "Earned"), and Long Memory is a tier ladder
// ("Long Memory · 25 recalls, Clay. Not yet. …").
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const SLOW = 10;
const REDUCED = process.env.REDUCED === '1';
// FONT_SCALE=1.3 or 2: the large-text layouts (two columns at ×1.3, a list at
// ×1.6+). The web build always reports a font scale of 1, so the app reads
// the scale from the page (useFontScale) and every text run is zoomed with
// CSS: an approximation of the phone's text size, with the app's own reflow.
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${REDUCED ? '-reduced' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const SEEN = 'aurivan.seen.v1';
const DAY = 86400000;

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: REDUCED ? 'reduce' : 'no-preference',
});
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
// The slow-motion switch for the page's clocks (see shoot_motion.mjs).
await ctx.addInitScript(() => {
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now.bind(Date);
  const raf = window.requestAnimationFrame.bind(window);
  const timeout = window.setTimeout.bind(window);
  let k = 1;
  let r0 = realPerf();
  let v0 = r0;
  let d0 = realDate();
  let dv0 = d0;
  const vPerf = (r) => v0 + (r - r0) * k;
  performance.now = () => vPerf(realPerf());
  Date.now = () => dv0 + (realDate() - d0) * k;
  window.requestAnimationFrame = (cb) => raf((t) => cb(vPerf(t)));
  window.setTimeout = (fn, ms, ...a) => timeout(fn, (ms || 0) / k, ...a);
  window.__timeScale = (next) => {
    const r = realPerf();
    v0 = vPerf(r);
    r0 = r;
    const d = realDate();
    dv0 = Date.now();
    d0 = d;
    k = next;
  };
  window.__appNow = () => performance.now();
});
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const go = async (path, ms = 2200) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (FONT_SCALE) await page.addStyleTag({ content: `div[dir="auto"] { zoom: ${FONT_SCALE}; }` });
  await wait(ms);
};
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${out}/${name}-${tag}.png`, ...opts });
  console.log('shot', name);
};
/** Edit one saved store in localStorage (the app reads it on the next load). */
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
const scrollBy = async (dy) => {
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, dy);
  await wait(700);
};
/** Scroll a heading or text to the top of the screen (an instant scroll; a wheel can stop short). */
const toTop = async (text, offset = 70) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await scrollBy(-offset);
};
/** Scroll an element (by its testID) to the middle of the screen. */
const toMiddle = async (testId) => {
  await page.getByTestId(testId).first().evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await wait(500);
};
const tab = (name) => page.getByRole('tab', { name: new RegExp(name) }).click();

async function strip(name, titles, act, appTimes, clip) {
  const title = Array.isArray(titles) ? titles[REDUCED ? 1 : 0] : titles;
  await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
  const t0 = await page.evaluate(() => window.__appNow());
  await act();
  const frames = [];
  for (const at of appTimes) {
    for (;;) {
      const now = await page.evaluate(() => window.__appNow());
      if (now - t0 >= at) break;
      await wait(15);
    }
    const appMs = Math.round((await page.evaluate(() => window.__appNow())) - t0);
    const buf = await page.screenshot(clip ? { clip } : {});
    frames.push({ appMs, data: buf.toString('base64') });
  }
  await page.evaluate(() => window.__timeScale(1));
  const w = clip ? clip.width : 393;
  const h = clip ? clip.height : 852;
  const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
  const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
  const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
    <div style="padding:10px 12px 4px">${REDUCED ? 'Reduce Motion · ' : ''}${title}</div>
    <div style="display:flex;gap:10px;padding:6px 12px 12px">
    ${frames.map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${w}px;height:${h}px;display:block;outline:1px solid ${ink}33"></div>`).join('')}
    </div></body></html>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: frames.length * (w + 10) + 14, height: h + 64 });
  await p.setContent(html);
  await p.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: true });
  await p.close();
  console.log('strip', name, frames.map((f) => f.appMs).join(','));
}

const now = Date.now();

if (FONT_SCALE) {
  // Large text: the case's top (Next for your exam), a shelf, and the sheet.
  await go('/home', 2600);
  await go('/milestones', 2600);
  await shot('b01-case-next');
  await toTop('Groundwork');
  await shot('b02-shelf-groundwork-domains');
  await page.getByRole('button', { name: /^First Foothold\. Pressed/ }).first().click();
  await wait(1400);
  await shot('b09-sheet-earned');
  await page.getByRole('button', { name: /^Close First Foothold/ }).click();
  await wait(700);
  await toTop('Evergreen');
  await page.getByRole('button', { name: /^Long Memory · 25 recalls, Clay\. Not yet/ }).first().click();
  await wait(1400);
  await shot('b08-sheet-not-yet');
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
  process.exit(0);
}

// ── 1. Mid-progress: the seed's study, back-filled quietly at launch ────
await go('/home', 2600);
await go('/milestones', 2600);
await shot('b01-case-next');
await toTop('Groundwork');
await shot('b02-shelf-groundwork-domains');
await toTop('Evergreen');
await shot('b03-shelf-evergreen-judgement');
await toTop('Exam Day');
await shot('b04-shelf-examday-rooted');
// Moments is not on the case until something on it happened (b11d shows it).
await toTop('Field notes', 200);
await shot('b05-shelf-fieldnotes');

// The Sort menu, opened, and a flat sort (closest first).
await toTop('Sort: By set ▾', 140);
await page.getByRole('button', { name: /^Sort badges/ }).click();
await wait(600);
await shot('b06-sort-menu');
await page.getByRole('radio', { name: /Closest/ }).click();
await wait(900);
await toTop('Sort: Closest ▾', 140);
await shot('b07-sort-closest');
await edit(SEEN, `v.state.badgeSort = 'set';`);

// ── 2. The detail sheet: not yet, earned, and Rooted's tiers ───────────
await go('/milestones', 2200);
await toTop('Evergreen');
await page.getByRole('button', { name: /^Long Memory · 25 recalls, Clay\. Not yet/ }).first().click();
await wait(1400);
await shot('b08-sheet-not-yet');
await page.getByRole('button', { name: /^Close Long Memory/ }).click();
await wait(700);
await toTop('Groundwork');
await page.getByRole('button', { name: /^First Foothold\. Pressed/ }).first().click();
await wait(1400);
await shot('b09-sheet-earned');
await page.getByRole('button', { name: /^Close First Foothold/ }).click();
await wait(700);
await toTop('Rooted');
await page.getByRole('button', { name: /^Rooted · 30 days/ }).first().click();
await wait(1400);
await shot('b10-sheet-rooted-tiers');
await page.getByRole('button', { name: /^Close Rooted/ }).click();
await wait(700);

// ── 3. Nearly complete: most badges earned over the weeks ──────────────
await edit(P, `
  const m = v.state.byCert.cisa.milestones; const t = a;
  const keys = ['first-foothold','topic-clear','ten-topics','firm-footing:1','firm-footing:2','firm-footing:3','firm-footing:4','firm-footing:5','whole-map','long-memory','loop-closed','know-what-you-know','slip-spotter','mindset-shift','dress-rehearsal','on-pace','rooted:10','rooted:30','fresh-start','snare-wise','even-keel','signpost-reader','whole-grove'];
  keys.forEach((k, i) => { if (!m.earned[k]) m.earned[k] = t - (60 - i * 2) * 86400000; });
  m.backfill = { ...(m.backfill || { at: t, count: 0 }), seen: true };`, now);
await go('/milestones', 2400);
await shot('b11-case-nearly-complete');
await toTop('Groundwork');
await shot('b11b-nearly-shelves');
await toTop('Exam Day');
await shot('b11c-nearly-examday-rooted');
await toTop('Moments');
await shot('b11d-nearly-moments-fieldnotes');

// ── 4. Results with a new badge, and the unlock strip ──────────────────
await edit(P, `
  const m = v.state.byCert.cisa.milestones; const t = a;
  m.earned['graduate'] = t - 60000; m.queue = ['graduate'];`, now);
// The badge moments this week (none yet), so it plays as a moment.
await edit(SEEN, `v.state.badgeMoments = []; v.state.moments = {};`);
const keys = (seed.__shotKeys || 'D').split(',');
await page.setViewportSize({ width: 393, height: 600 });
await go('/session', 1800);
for (let q = 0; q < keys.length; q++) {
  await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await wait(900);
  await page.getByText(q < keys.length - 1 ? 'Next question' : 'See results', { exact: true }).click();
  await wait(1400);
}
await wait(1600);
const moment = page.getByText(/^A new badge · /).first();
await strip(
  'f1-unlock-moment',
  [
    'Scroll to the new badge: the medallion presses in, its rim catches the light once, the emblem fills from its outline, leaves drift down its own column (≤ 1.2 s; a tap or scroll ends it)',
    'Scroll to the new badge: it is simply there, struck, with the same words (no press, no glint, no leaves)',
  ],
  async () => {
    await moment.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  },
  [140, 420, 700, 1300],
  { x: 0, y: 150, width: 393, height: 330 },
);
await wait(1500);
await page.setViewportSize({ width: 393, height: 852 });
await wait(500);
await moment.evaluate((el) => el.scrollIntoView({ block: 'center' }));
await wait(600);
await shot('b12-results-unlock');

// ── 5. You with the "new" dot (a badge earned since the case was opened) ─
// Mobile 1.51: the way in is the Herbarium entry under You's plate (it was a row in Study tools).
await edit(SEEN, `v.state.caseSeen = { cisa: a - 2 * 86400000 };`, now);
await edit('aurivan.session.v1', `v.state.active = null;`);
await go('/you', 2600);
await toMiddle('herbarium-entry');
await shot('b13-you-new-dot');

// ── 6. Settings → Show badges: off (You has no entry), then back on ─────
// Mobile 1.46: the switch is in the "Badges and your plant" group.
await go('/settings', 2000);
await toTop('Badges and your plant', 20);
await page.getByRole('switch', { name: /Show badges/ }).click();
await wait(700);
await shot('b14-settings-badges-off');
await go('/you', 2400);
// The same place as b13: the stats just under where the entry was.
await toMiddle('you-stats');
await shot('b15-you-badges-hidden');
// Earned while hidden (quietly): switching back on says so in one line.
await edit(P, `const m = v.state.byCert.cisa.milestones; m.earned['myth-clearer'] = Date.now() + 1000; m.queue = ['myth-clearer'];`);
await go('/settings', 2000);
await toTop('Badges and your plant', 20);
await page.getByRole('switch', { name: /Show badges/ }).click();
await wait(700);
await shot('b16-settings-badges-on-again');

// ── 7. Empty-ish: a learner a few questions in ─────────────────────────
await edit(P, `
  const cp = v.state.byCert.cisa; const ids = Object.keys(cp.answers).slice(0, 12);
  cp.answers = Object.fromEntries(ids.map((id) => [id, cp.answers[id]]));
  cp.mistakes = {}; cp.review = {};
  cp.milestones = { earned: {}, backfill: { at: a, count: 0, seen: true } };`, now);
await edit(S, `v.state.examDates = {};`);
await go('/milestones', 2400);
await shot('b00-case-empty');
await toTop('Groundwork');
await shot('b00b-case-empty-shelves');

console.log('errors:', errs.slice(0, 5));
await browser.close();
