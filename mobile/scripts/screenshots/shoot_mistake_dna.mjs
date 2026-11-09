// Reproducible synthetic-only DNA QA against an exported app served on DNA_URL.
// node scripts/screenshots/shoot_mistake_dna.mjs seed.json output-dir
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const errors = [];
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, timezoneId: 'Asia/Manila' });
  await context.addInitScript(({ seed, theme }) => {
    if (localStorage.getItem('__dna_seed')) return;
    for (const [key, value] of Object.entries(seed)) if (!key.startsWith('__')) localStorage.setItem(key, value);
    const settings = JSON.parse(localStorage.getItem('aurivan.settings.v1'));
    settings.state.theme = theme;
    localStorage.setItem('aurivan.settings.v1', JSON.stringify(settings));
    const progress = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
    const cp = progress.state.byCert.cisa;
    const entries = Object.entries(cp.mistakes).slice(0, 12);
    cp.mistakes = Object.fromEntries(entries.map(([id, m], i) => [id, { ...m, at: Date.now() - (i < 6 ? 2 : 20) * 86400000, slip: 'priority', resolved: false, confidence: undefined }]));
    localStorage.setItem('aurivan.progress.v1', JSON.stringify(progress));
    localStorage.setItem('__dna_seed', '1');
  }, { seed, theme });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${process.env.DNA_URL || 'http://127.0.0.1:8095'}/mistakes`, { waitUntil: 'networkidle' });
  await page.getByText('Your Mistake DNA', { exact: true }).waitFor();
  await page.screenshot({ path: `${out}/${theme}-journal.png` });
  await page.getByRole('button', { name: 'Explore pattern evidence', exact: true }).click();
  await page.getByText('Thinking-pattern breakdown', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/${theme}-evidence.png` });
  await page.getByRole('button', { name: 'How Mistake DNA works', exact: true }).click();
  await page.getByRole('button', { name: 'Close, How Mistake DNA works', exact: true }).waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${theme}-info.png` });
  await page.getByRole('button', { name: 'Close, How Mistake DNA works', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByText('Progress over time', { exact: true }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}/${theme}-trend.png` });
  await page.evaluate(() => {
    const style = document.createElement('style');
    // Scale text nodes only, avoiding compounded parent scaling.
    style.textContent = '[dir="auto"] { font-size: 200% !important; line-height: 1.35 !important; }';
    document.head.appendChild(style);
  });
  await page.getByText('Your Mistake DNA', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/${theme}-large-text.png` });
  // Browser layout smoke: large text must not overflow the viewport horizontally.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error(`${theme}: horizontal page overflow at enlarged text`);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
    p.state.byCert.cisa.mistakes = {};
    localStorage.setItem('aurivan.progress.v1', JSON.stringify(p));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Not enough evidence yet', { exact: true }).waitFor();
  await page.screenshot({ path: `${out}/${theme}-empty.png` });
  await context.close();
}
await browser.close();
console.log('page errors:', JSON.stringify(errors));
if (errors.length) process.exitCode = 1;
