// Mobile 1.13 "Your plant" (SHOTS=plant, see run.sh): the end states of the
// plant's places.
//
// Shots: the "Plant yours" pick (top and name; it was onboarding's step until
// mobile 1.24), Today with the plant beside the
// readiness range, Today's grow-up line, Today's one quiet "Plant a
// companion" line, You's header, Your plant (top, next growth, domains),
// resting, Quiet look (Your plant and Today), hidden (Today with the rings
// back, and You), and Change plant (the species picker).
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
// ×1.3, reading text goes to the full scale. Applied before each shot, so text
// drawn after a tap (onboarding's next step) is zoomed too.
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
  const el = page.getByText(text).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};
const press = async (name, ms = 800) => {
  await page.getByRole('button', { name }).first().click();
  await wait(ms);
};
const setPlant = (plant) => edit(P, `v.state.byCert.cisa.plant = a; if (!a) delete v.state.byCert.cisa.plant;`, plant);
const setPlantSettings = (s) => edit(P, `v.state.plantSettings = a;`, s);

// ── 1. "Plant yours": the species pick and the name ───────────────────
// Mobile 1.24 took the plant step out of onboarding (a seed is planted after
// the first five questions). The same species grid and name field now live
// only in You → "Plant yours" (/plant-pick), so these shots show that screen,
// for a learner with no plant yet. File names keep the p01 numbers.
await go('/home', 1500);
await setPlant(null);
await go('/plant-pick', 1800);
await shot('p01-plant-yours-pick');
await toTop('Name it', 0);
await shot('p01b-plant-yours-name');

// The demo plant: an oak called Kai, at Crown (5 of 6), from the seed's study.
const kai = { species: 'oak', name: 'Kai', plantedAt: now - 30 * DAY, growth: 5, reached: { sprout: now - 29 * DAY, shoot: now - 20 * DAY, bough: now - 9 * DAY, crown: now - 2 * DAY } };
await setPlant(kai);
await setPlantSettings({ promptHidden: true });

// ── 2. Today ───────────────────────────────────────────────────────────
await go('/home', 2600);
await shot('p02-today');
// The grow-up line, once.
await setPlant({ ...kai, pending: 5 });
await go('/home', 2600);
await toTop('Your plant grew', 260);
await shot('p02b-today-grew');
// No plant yet: the one quiet line.
await setPlant(null);
await setPlantSettings({});
await go('/home', 2600);
// Since mobile 1.21 the line is a row: "Your plant / A companion that grows with your study".
await toTop('A companion that grows with your study', 300);
await shot('p02c-today-prompt');
await setPlant(kai);
await setPlantSettings({ promptHidden: true });

// ── 3. You ─────────────────────────────────────────────────────────────
await go('/you', 2400);
await shot('p03-you');

// ── 4. Your plant ──────────────────────────────────────────────────────
await go('/plant', 2400);
await shot('p04-plant');
await toTop('What grows it next', 30);
await shot('p04b-plant-next');
await toTop('Your domains', 30);
await shot('p04c-plant-domains');

// ── 5. Resting (no study for 4 days; the plant is unchanged) ───────────
await edit(P, `const m = v.state.byCert.cisa.milestones || { earned: {} }; m.lastDay = a; v.state.byCert.cisa.milestones = m;`, dk(now - 4 * DAY));
await go('/plant', 2400);
await shot('p05-resting');
await edit(P, `v.state.byCert.cisa.milestones.lastDay = a;`, dk(now));

// ── 6. Quiet look (no face) ────────────────────────────────────────────
await setPlantSettings({ promptHidden: true, quietLook: true });
await go('/plant', 2400);
await shot('p06-quiet-plant');
await go('/home', 2600);
await shot('p06b-quiet-today');

// ── 7. Hidden (Show my plant off): the rings are back, no prompts ──────
await setPlantSettings({ promptHidden: true, showPlant: false });
await go('/home', 2600);
await shot('p07-hidden-today');
await go('/you', 2400);
await shot('p07b-hidden-you');
await go('/settings', 2000);
await toTop('Your plant', 30);
await shot('p07c-hidden-settings');
await setPlantSettings({ promptHidden: true });
await go('/settings', 2000);
await toTop('Your plant', 30);
await shot('p07d-settings');

// ── 8. Change plant (the species; the growth stays) ────────────────────
await go('/plant-pick?mode=species', 2400);
await shot('p08-change-species');

console.log('errors:', errs.slice(0, 5));
await browser.close();
