// Phone-size (393x852 @2x) screenshots of key screens with demo data. See run.sh.
import { createRequire } from 'module';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const routes = [
  ['01-today','/home'],['02-learn','/learn'],['03-lesson','/lesson/cisa-l-d1-charter'],
  ['04-practice','/practice'],['05-play','/play'],['06-priority-lens','/game/priority'],
  ['07-trap-spotter','/game/trap'],['08-sprint','/game/sprint'],['09-you','/you'],['10-mistakes','/mistakes'],
];
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, seed);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
for (const [name, path] of routes) {
  await page.goto('http://127.0.0.1:8093' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
}
// Each sample question: the question, the answer screen, and the vine (key idea + tips).
// The first sample is answered with its runner-up (wrong), the rest correctly (make_seed.py).
const keys = (seed.__shotKeys || 'D').split(',');
await page.goto('http://127.0.0.1:8093/session', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
for (let q = 0; q < keys.length; q++) {
  const n = q === 0 ? '' : `-q${q + 1}`;
  await page.screenshot({ path: `${out}/11-question${n}.png` });
  await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/12-answer${n}.png` });
  await page.mouse.move(196, 500);
  for (const [i, dy] of [[13, 700], [14, 1400]]) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(800);
    if (q === 0) await page.screenshot({ path: `${out}/${i}-explanation-tips.png` });
  }
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/15-all-tips${n}.png` });
  const next = page.getByText('Next question', { exact: true });
  if (q < keys.length - 1 && (await next.count())) { await next.click(); await page.waitForTimeout(1200); }
}
console.log('shot session flow');
console.log('errors:', errs.slice(0, 5));
await browser.close();
