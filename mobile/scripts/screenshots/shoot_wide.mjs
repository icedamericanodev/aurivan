// Large-screen screenshots (SHOTS=wide): the key screens on a tablet in
// landscape (1280x800, the size Play's large-screen checks use) and in portrait
// (800x1280), plus the phone (393x852) to prove nothing moved there.
// WIDE_SIZES=tl,tp,pp,pl picks the sizes (pl = phone landscape, 852x393: phones
// stay portrait in the native app, so it is off by default).
//
// Besides the pictures it CHECKS the layout and exits 1 when a check fails:
//   - no sideways scrolling (the page is never wider than the window);
//   - on a wide window, no button or text block is wider than the reading
//     column (CONTENT_MAX in src/components/layout.ts, plus a little slack).
// Usage: node shoot_wide.mjs seed.json outDir [dark|light]   (run.sh does this)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const base = 'http://127.0.0.1:8093';
// The widest a text block or a button may be on a wide window. Keep in step
// with CONTENT_MAX (src/components/layout.ts); +2 for hairline borders.
const COLUMN = Number(process.env.WIDE_COLUMN || 640) + 2;
const sizes = { tl: [1280, 800], tp: [800, 1280], pp: [393, 852], pl: [852, 393] };
const pick = (process.env.WIDE_SIZES || 'tl,tp,pp').split(',');
const routes = [
  ['today', '/home'], ['learn', '/learn'], ['practice', '/practice'], ['you', '/you'],
  ['mock-start', '/mock-start'], ['lesson', '/lesson/cisa-l-d1-charter'], ['notes', '/notes'],
  ['note', '/notes/subtopic/4B1.2'], ['labs', '/labs'], ['settings', '/settings'], ['onboarding', '/onboarding'],
];
const problems = [];
// Widest visible button / text block, ignoring full-bleed backgrounds (the
// screen, the footer's bar): only elements that hold text or are pressable.
const widest = (page) =>
  page.evaluate(() => {
    let max = 0, what = '';
    for (const el of document.querySelectorAll('[role="button"], button, [dir="auto"]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
      // The tab bar and the top bar's icons are capped elsewhere; text must be real.
      if (el.closest('[role="tablist"]')) continue;
      if (r.width > max) { max = r.width; what = (el.getAttribute('aria-label') || el.textContent || '').slice(0, 50); }
    }
    return { max: Math.round(max), what, overflow: document.documentElement.scrollWidth - window.innerWidth };
  });
const check = async (page, size, name) => {
  const { max, what, overflow } = await widest(page);
  if (overflow > 0) problems.push(`${size}-${name}: page is ${overflow}px wider than the window`);
  const [w] = sizes[size];
  if (w >= 700 && max > COLUMN) problems.push(`${size}-${name}: "${what}" is ${max}px wide (column ${COLUMN - 2})`);
};
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
for (const size of pick) {
  const [width, height] = sizes[size];
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`${size}: page error ${e.message}`));
  const snap = async (name) => {
    await page.screenshot({ path: `${out}/wide-${size}-${name}.png` });
    await check(page, size, name);
    console.log('shot', size, name);
  };
  for (const [name, path] of routes) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap(name);
  }
  // A practice question, then its answer screen (option A, then Check answer).
  await page.goto(base + '/session', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await snap('question');
  await page.getByLabel(/^Option A:/).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await page.waitForTimeout(1300);
  await snap('answer');
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.error('\nLarge-screen layout problems:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('large-screen checks passed');
