// Marketing capture (docs/marketing/tools, run by capture.sh): Your plant at Form III and Form IV for all 13
// species, botanical look, for the marketing montage. Same seeding pattern as
// mobile/scripts/screenshots/shoot_forms.mjs.
// Usage: node shoot_forms13.mjs <seed.json> <out> <theme> <baseUrl>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = process.argv[5] || 'http://127.0.0.1:8095';
const P = 'aurivan.progress.v1';
const SEEN = 'aurivan.seen.v1';
const DAY = 86_400_000;
const now = Date.now();
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
const page = await ctx.newPage();
const go = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(2600); };
const edit = (key, src, arg) => page.evaluate(([k, s, a]) => {
  const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
  new Function('v', 'a', s)(v, a);
  localStorage.setItem(k, JSON.stringify(v));
}, [key, src, arg]);
const IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'];
const plantAt = (species, growth) => {
  const reached = {};
  for (let g = 2; g <= growth; g++) reached[IDS[g - 1]] = now - (8 - g) * 4 * DAY;
  return { species, name: 'Kai', plantedAt: now - 40 * DAY, growth, reached, look: { style: 'botanical' } };
};
const SPECIES = ['oak', 'maple', 'narra', 'cherry-blossom', 'pine', 'coconut-palm', 'mango', 'bonsai', 'sunflower', 'lotus', 'sampaguita', 'cactus', 'bamboo'];
await go('/');
for (const sp of SPECIES)
  for (const [g, form] of [[5, 'III'], [6, 'IV']]) {
    await edit(P, 'v.state.byCert.cisa.plant = a;', plantAt(sp, g));
    await edit(SEEN, 'v.state.plantForms = { cisa: { seen: a } }; v.state.plantFinal = {};', form === 'IV' ? 4 : 3);
    await go('/plant');
    await page.screenshot({ path: `${out}/forms13-${sp}-form${form}-${theme}.png` });
    console.log('shot', sp, form);
  }
await browser.close();
