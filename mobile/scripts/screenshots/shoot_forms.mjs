// Mobile 1.50 plant forms (SHOTS=forms): Your plant at each form (I–IV) for
// three species (oak, lotus, bamboo), a Form IV flavour, the Look screen's
// final-form choice, the quiet note for a plant already past Form I, and
// frame strips of the reveal (full motion, and Reduce Motion's cross-fade).
//
// The reveal strips slow the page's clock (performance.now, Date.now,
// requestAnimationFrame and setTimeout) to 1/10 from the very first frame of
// the page (localStorage '__slow'), then take frames at APP times after the
// reveal appears.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const P = 'aurivan.progress.v1';
const SEEN = 'aurivan.seen.v1';
const SETTINGS = 'aurivan.settings.v1';
const W = 393;
const H = 852;
const DAY = 86_400_000;
const now = Date.now();

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
// The slow clock: on from the page's first frame when '__slow' is set (k = its value).
await ctx.addInitScript(() => {
  const k = Number(localStorage.getItem('__slow') || 1);
  if (k === 1) return;
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now.bind(Date);
  const raf = window.requestAnimationFrame.bind(window);
  const timeout = window.setTimeout.bind(window);
  const d0 = realDate();
  performance.now = () => realPerf() * k;
  Date.now = () => d0 + (realDate() - d0) * k;
  window.requestAnimationFrame = (cb) => raf((t) => cb(t * k));
  window.setTimeout = (fn, ms, ...a) => timeout(fn, (ms || 0) / k, ...a);
  document.addEventListener('animationstart', (e) => e.target.getAnimations && e.target.getAnimations().forEach((a) => (a.playbackRate = k)), true);
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const go = async (p, ms = 2600) => {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}-${theme}.png` });
  console.log('shot', name);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(
    ([k, src, a]) => {
      const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
      new Function('v', 'a', src)(v, a);
      localStorage.setItem(k, JSON.stringify(v));
    },
    [key, fn, arg],
  );
const GROWTH_IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'];
/** A botanical plant at `growth`, reached over the last weeks, nothing pending. */
const plantAt = (species, name, growth) => {
  const reached = {};
  for (let g = 2; g <= growth; g++) reached[GROWTH_IDS[g - 1]] = now - (8 - g) * 4 * DAY;
  return { species, name, plantedAt: now - 40 * DAY, growth, reached, look: { style: 'botanical' } };
};
const setPlant = (plant) => edit(P, `v.state.byCert.cisa.plant = a;`, plant);
/** What this phone has shown of the forms (null: never seen on this release), and the Form IV choice. */
const setForms = (rec, final = null) =>
  edit(SEEN, `v.state.plantForms = a.rec ? { cisa: a.rec } : {}; v.state.plantFinal = a.final ? { cisa: a.final } : {};`, { rec, final });
const setMotion = (m) => edit(SETTINGS, `v.state.motion = a;`, m);
const FORM_OF = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };

await go('/', 600);

// ── 1. Your plant at each form, for three species ──────────────────────────
const species = [
  ['oak', 'Kai'],
  ['lotus', 'Padma'],
  ['bamboo', 'Kawayan'],
];
for (const [sp, name] of species)
  for (const g of [2, 3, 5, 6]) {
    await setPlant(plantAt(sp, name, g));
    await setForms({ seen: FORM_OF[g] });
    await go('/plant');
    await shot(`forms-${sp}-form${['', 'I', 'I', 'II', 'III', 'III', 'IV'][g]}-growth${g}`);
  }

// ── 2. A Form IV flavour, and the Look screen's choice ─────────────────────
await setPlant(plantAt('oak', 'Kai', 6));
await setForms({ seen: 4 }, 'moot');
await go('/plant');
await shot('forms-oak-formIV-moot');
await go('/plant-look');
await shot('forms-look-final-choice');
await setForms({ seen: 4 }, 'holdfast');
await setPlant(plantAt('bamboo', 'Kawayan', 6));
await go('/plant');
await shot('forms-bamboo-formIV-holdfast');

// ── 3. A plant already past Form I when forms arrived: the quiet note ──────
await setPlant(plantAt('oak', 'Kai', 5));
await setForms(null);
await go('/plant');
await shot('forms-oak-quiet-note');

// ── 4. The reveal, frame by frame ──────────────────────────────────────────
const SLOW = 10;
/** Frames at these app times after the reveal appears. */
async function revealStrip(name, title, appTimes, motion) {
  await go('/', 600);
  await setMotion(motion);
  await setPlant(plantAt('oak', 'Kai', 3));
  await setForms({ seen: 1 });
  await page.evaluate((k) => localStorage.setItem('__slow', String(1 / k)), SLOW);
  await page.goto(BASE + '/plant');
  await page.waitForSelector('[data-testid^="plant-form-reveal-"]', { timeout: 60_000 });
  const t0 = await page.evaluate(() => performance.now());
  const frames = [];
  for (const at of appTimes) {
    for (;;) {
      const t = await page.evaluate(() => performance.now());
      if (t - t0 >= at) break;
      await wait(15);
    }
    const appMs = Math.round((await page.evaluate(() => performance.now())) - t0);
    frames.push({ appMs, data: (await page.screenshot({ clip: { x: 0, y: 40, width: W, height: 560 } })).toString('base64') });
  }
  await page.evaluate(() => localStorage.removeItem('__slow'));
  const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
  const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
  const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
    <div style="padding:10px 12px 4px">${title}</div>
    <div style="display:flex;gap:10px;padding:6px 12px 12px">${frames
      .map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${W}px;height:560px;display:block;outline:1px solid ${ink}33"></div>`)
      .join('')}</div></body></html>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: frames.length * (W + 10) + 14, height: 560 + 64 });
  await p.setContent(html);
  await p.screenshot({ path: `${out}/${name}-${theme}.png`, fullPage: true });
  await p.close();
  console.log('strip', name, frames.map((f) => f.appMs).join(','));
}
await revealStrip('forms-reveal-full', 'The Whip Oak arrives: the ink line rises, the new form settles, then the learning fact and the name (about 1.2 s)', [0, 200, 330, 450, 600, 850, 1000, 1300], 'system');
await revealStrip('forms-reveal-reduced', 'Reduce Motion: a 120 ms cross-fade, the words at once', [0, 60, 140, 400], 'reduced');
await setMotion('system');
await go('/plant');
await shot('forms-reveal-after');

if (errs.length) console.log('page errors:', errs.slice(0, 5));
await browser.close();
