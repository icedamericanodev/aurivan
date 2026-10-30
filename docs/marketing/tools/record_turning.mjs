// Marketing capture (docs/marketing/tools, run by capture.sh): a real-speed, full-resolution capture of The
// Turning from the app's web export at phone size (393x852 @2x).
// Method (same as mobile/scripts/screenshots/shoot_forms.mjs revealStrip): the
// page's clock runs 20x slower from its first frame, we screenshot as fast as
// we can, and save each frame with its APP time. ffmpeg then rebuilds the clip
// from those times, so playback is exactly real speed.
// Usage: node record_turning.mjs <seed.json> <outDir> <theme> <baseUrl> [species] [growth] [appMs]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const [seedPath, out, theme = 'light', BASE = 'http://127.0.0.1:8095', sp = 'oak', growthArg = '6', lenArg = '6000'] = process.argv.slice(2);
const growth = Number(growthArg);
const LEN = Number(lenArg);
const SLOW = 20;
const seed = JSON.parse(fs.readFileSync(seedPath));
const DAY = 86_400_000;
const now = Date.now();
const IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'];
const FORM_OF = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };
const reached = {};
for (let g = 2; g <= growth; g++) reached[IDS[g - 1]] = now - (8 - g) * 4 * DAY;
const plant = { species: sp, name: 'Kai', plantedAt: now - 40 * DAY, growth, reached, look: { style: 'botanical' } };

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
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
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(([pl, prev, slow]) => {
  const edit = (k, f) => { const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}'); f(v); localStorage.setItem(k, JSON.stringify(v)); };
  edit('aurivan.progress.v1', (v) => { v.state.byCert.cisa.plant = pl; });
  edit('aurivan.seen.v1', (v) => { v.state.plantForms = { cisa: { seen: prev } }; v.state.plantFinal = {}; });
  edit('aurivan.settings.v1', (v) => { v.state.motion = 'system'; });
  localStorage.setItem('__slow', String(1 / slow));
}, [plant, FORM_OF[growth] - 1, SLOW]);
await page.goto(BASE + '/plant');
await page.waitForSelector('[data-testid^="plant-form-reveal-"]', { timeout: 120_000 });
const dir = `${out}/frames-${sp}-${theme}`;
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const t0 = await page.evaluate(() => performance.now());
const list = [];
for (let i = 0; ; i++) {
  const t = Math.round((await page.evaluate(() => performance.now())) - t0);
  const f = `${dir}/f${String(i).padStart(4, '0')}.png`;
  await page.screenshot({ path: f });
  list.push([f, t]);
  if (t > LEN) break;
}
// ffmpeg concat list: each frame lasts until the next one's app time.
let txt = '';
for (let i = 0; i < list.length - 1; i++) txt += `file '${list[i][0]}'\nduration ${((list[i + 1][1] - list[i][1]) / 1000).toFixed(3)}\n`;
txt += `file '${list[list.length - 1][0]}'\nduration 1.5\nfile '${list[list.length - 1][0]}'\n`;
fs.writeFileSync(`${dir}/concat.txt`, txt);
console.log('frames', sp, theme, list.length, 'last app ms', list[list.length - 1][1]);
await browser.close();
