// Premium motion, round 2 (SHOTS=motion2, see run.sh): slow-motion frame strips of
//  - A: the readiness scale bar on You: after a rise since the last look (the band and bracket
//       slide from the range last seen; the ruler never moves) and on the day's first view (the
//       band opens from its centre);
//  - B: the growth plate: Results' Fig. 6 after a mixed set (only the area that grew moves) and
//       You's Fig. 5 after a rise since the last look;
// plus the end states. REDUCED=1 runs the same steps with Reduce Motion on (files end "-reduced").
// The page clock runs at 1/SLOW speed (performance.now, Date.now, rAF, setTimeout), as in
// shoot_motion.mjs; a page can also START slowed (sessionStorage __slowLoad) for a screen that
// plays as it loads (Results).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = process.env.SHOTS_BASE || 'http://127.0.0.1:8093';
const SLOW = 10;
const REDUCED = process.env.REDUCED === '1';
const tag = `${theme}${REDUCED ? '-reduced' : ''}`;
const SEEN = 'aurivan.seen.v1';
const P = 'aurivan.progress.v1';
const PAPER = theme === 'dark' ? '#111613' : '#F3F1EA';
const INK = theme === 'dark' ? '#ECEFE8' : '#17231B';

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
await ctx.addInitScript(() => {
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now.bind(Date);
  const raf = window.requestAnimationFrame.bind(window);
  const timeout = window.setTimeout.bind(window);
  let k = sessionStorage.getItem('__slowLoad') ? Number(sessionStorage.getItem('__slowLoad')) : 1;
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
  document.addEventListener('animationstart', (e) => { if (k !== 1 && e.target.getAnimations) e.target.getAnimations().forEach((a) => (a.playbackRate = k)); }, true);
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const go = async (path, ms = 2200) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(ms);
};
const edit = (key, fn) =>
  page.evaluate(([k, src]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":0}');
    new Function('v', src)(v);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn]);
const shot = async (name, clip) => {
  await page.screenshot({ path: `${out}/${name}-${tag}.png`, ...(clip ? { clip } : {}) });
  console.log('shot', name);
};
const box = (sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; }, sel);

async function framesAt(t0, times, clip) {
  const frames = [];
  for (const at of times) {
    for (;;) {
      const now = await page.evaluate(() => window.__appNow());
      if (now - t0 >= at) break;
      await wait(10);
    }
    const appMs = Math.round((await page.evaluate(() => window.__appNow())) - t0);
    frames.push({ appMs, data: (await page.screenshot({ clip })).toString('base64') });
  }
  return frames;
}
async function compose(name, titles, frames, clip) {
  const title = Array.isArray(titles) ? titles[REDUCED ? 1 : 0] : titles;
  const html = `<html><body style="margin:0;background:${PAPER};font:600 13px -apple-system,Segoe UI,Roboto,sans-serif;color:${INK}">
    <div style="padding:10px 12px 4px">${REDUCED ? 'Reduce Motion · ' : ''}${title}</div>
    <div style="display:flex;gap:10px;padding:6px 12px 12px">${frames
      .map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${clip.width}px;height:${clip.height}px;display:block;outline:1px solid ${INK}33"></div>`)
      .join('')}</div></body></html>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: frames.length * (clip.width + 10) + 14, height: clip.height + 64 });
  await p.setContent(html);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: true });
  await p.close();
  console.log('strip', name, frames.map((f) => f.appMs).join(','));
}
/**
 * Slow the clock, tap a tab, take frames at these app times. The clip is measured beforehand on a
 * direct visit to the tab (tabs stay mounted, so mid-switch the page holds the other tab's copy too).
 */
async function tabStrip(name, title, tab, times, clip) {
  await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
  const t0 = await page.evaluate(() => window.__appNow());
  await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
  const frames = await framesAt(t0, times, clip);
  await page.evaluate(() => window.__timeScale(1));
  await compose(name, title, frames, clip);
}

// ── A. The scale bar on You ────────────────────────────────────────────
const barClip = async () => {
  const b = await box('[data-testid="scale-bar"]');
  return b && b.width > 0 ? { x: 0, y: Math.max(0, Math.round(b.y) - 44), width: 393, height: 150 } : null;
};
await go('/you');
await shot('r2-you');
const youBar = await barClip();
// A1. A rise since the last look: You last showed a lower range.
await go('/home');
await edit(SEEN, `const s = v.state; s.values = s.values || {};
  const r = s.values['you:range:cisa']; if (r) s.values['you:range:cisa'] = [r[0] - 8, r[1] - 6];`);
await go('/home');
await tabStrip(
  'r2-a1-scalebar-rise',
  ['You after a rise: the ruler stays still; the band and bracket slide from the range last seen (grow 600, ease-out) as the numeral rolls; the label lands with them', 'You after a rise: the finished bar; the numeral brightens'],
  'You',
  [140, 260, 380, 520, 700, 1000],
  youBar,
);
// A2. The day's first view: nothing seen yet today.
await go('/home');
await edit(SEEN, `const s = v.state; s.values = s.values || {}; s.days = s.days || {};
  delete s.values['you:range:cisa']; delete s.values['you:rings:cisa'];
  for (const k of Object.keys(s.days)) if (k.startsWith('growth:you:')) delete s.days[k];`);
await go('/home');
await tabStrip(
  'r2-a2-scalebar-first-view',
  ['You, the day’s first view: the ruler is there from the first frame; the band opens from its centre (draw 400, enter), then its ends and label fade in', 'The day’s first view: the finished bar'],
  'You',
  [140, 260, 380, 520, 700, 1000],
  youBar,
);

// ── B. The growth plate ────────────────────────────────────────────────
// B1. Results after a mixed set: IS Operations grew 9 points, IT Governance did not move.
await go('/home');
await page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
  const answers = p.state.byCert.cisa.answers;
  const pick = (d) => Object.entries(answers).filter(([k]) => k.startsWith(`d${d}_`));
  const fig = (d) => { const e = pick(d); return [e.length, Math.round((e.filter(([, a]) => a.lastCorrect).length / e.length) * 100)]; };
  const ids = [...pick(4).slice(0, 5), ...pick(2).slice(0, 5)].map(([k]) => k);
  const now = Date.now();
  const responses = Object.fromEntries(ids.map((id, i) => [id, { display: 'A', correct: i !== 2 && i !== 7, ms: 70000, at: now - (10 - i) * 80000 }]));
  const f4 = fig(4), f2 = fig(2);
  const s = JSON.parse(localStorage.getItem('aurivan.session.v1'));
  s.state.active = { id: 'r2-growth', mode: 'practice', certId: 'cisa', title: 'Practice · Mixed', questionIds: ids,
    perms: Object.fromEntries(ids.map((i) => [i, ['A', 'B', 'C', 'D']])), index: 9, responses, flagged: [],
    before: { '4': [f4[0], f4[1] - 9], '2': [f2[0], f2[1]] }, startedAt: now - 14 * 60000, finishedAt: now };
  localStorage.setItem('aurivan.session.v1', JSON.stringify(s));
});
await page.evaluate((s) => sessionStorage.setItem('__slowLoad', String(1 / s)), SLOW);
await page.goto(BASE + '/results', { waitUntil: 'commit' });
await page.waitForSelector('[data-testid^="area-column-"]', { timeout: 120000 });
{
  const t0 = await page.evaluate(() => window.__appNow());
  const top = await page.evaluate(() => Math.min(...[...document.querySelectorAll('[data-testid^="area-column-"]')].map((c) => c.getBoundingClientRect().top)));
  const clip = { x: 0, y: Math.max(0, Math.round(top) - 30), width: 393, height: 300 };
  const frames = await framesAt(t0, [60, 200, 330, 460, 640, 900], clip);
  await page.evaluate(() => sessionStorage.removeItem('__slowLoad'));
  await page.evaluate(() => window.__timeScale(1));
  await compose('r2-b1-results-growth', ['Results, Fig. 6: IS Operations rose from 61 to 70: only its clay top grows out of where it stood, the number rides and rolls, then “↑9”; IT Governance did not move', 'Results, Fig. 6: the finished plate with “↑9”'], frames, clip);
}
await wait(1500);
await shot('r2-results');
await edit('aurivan.session.v1', 'v.state.active = null;');

// B2. You's areas after a rise since the last look (a taller window, so Fig. 5 is on screen).
await page.setViewportSize({ width: 393, height: 1500 });
await go('/you');
const areas = await box('[data-testid="areas-plate"]');
const areasClip = { x: 0, y: Math.max(0, Math.round(areas.y) - 10), width: 393, height: Math.min(380, Math.round(areas.height) + 20) };
await go('/home');
await edit(SEEN, `const s = v.state; s.values = s.values || {};
  const g = s.values['you:rings:cisa']; if (g) s.values['you:rings:cisa'] = g.map((x, i) => (i === 3 ? Math.max(0, x - 7) : x));`);
await go('/home');
await tabStrip(
  'r2-b2-you-areas-rise',
  ['You, Fig. 5 after a rise: only the area that rose grows from where you last saw it, with “↑7”; the others stay still', 'You, Fig. 5 after a rise: the finished plate with “↑7”'],
  'You',
  [140, 300, 440, 580, 760, 1100],
  areasClip,
);
await page.setViewportSize({ width: 393, height: 852 });

if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
await browser.close();
