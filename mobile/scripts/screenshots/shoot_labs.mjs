// Isolated synthetic QA: Learn integration, all lab stages, narrow/large text and reduced motion.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const errors = [];
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
let activePage;
try {
for (const theme of ['light', 'dark']) {
  const settings = JSON.parse(seed['aurivan.settings.v1']); settings.state.theme = theme; settings.state.motion = 'reduced'; settings.state.activeCertId = 'cisa';
  const themed = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) }; delete themed['aurivan.session.v1'];
  const ctx = await browser.newContext({ viewport: { width: process.env.NARROW ? 360 : 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await ctx.addInitScript(s => { if (localStorage.getItem('__seeded')) return; for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v); localStorage.setItem('__seeded', '1'); }, themed);
  const page = await ctx.newPage(); activePage = page; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') console.error('browser console:', m.text()); });
  const go = async path => { await page.goto(`http://127.0.0.1:8093${path}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1400); };
  const snap = async name => { await page.screenshot({ path: `${out}/lab-${name}-${theme}.png` }); console.log('shot', `lab-${name}-${theme}`); };
  await go('/learn');
  await page.getByTestId('learn-tile-notes').waitFor({ state: 'visible' });
  for (const id of ['learn-tile-notes', 'learn-tile-glossary', 'learn-tile-principles', 'learn-tile-guide']) if (await page.getByTestId(id).count() !== 1) throw new Error(`Missing original Learn tile ${id}`);
  await page.getByTestId('learn-concept-lab').scrollIntoViewIfNeeded(); await snap('learn');
  await page.getByTestId('learn-concept-lab').click(); await page.waitForTimeout(900); await snap('catalog');
  await page.getByRole('button', { name: 'Open Understand RTO vs. RPO', exact: true }).click(); await page.waitForTimeout(900); await snap('explore');
  await page.getByRole('button', { name: 'Experiment with recovery', exact: true }).click(); await page.waitForTimeout(300);
  await page.getByTestId('lab-experiment').evaluate(el => el.scrollIntoView({ block: 'start' })); await page.waitForTimeout(350); await snap('experiment');
  const current = async max => page.getByTestId(`lab-range-${max}`).evaluate(el => parseFloat(el.firstElementChild.firstElementChild.style.width));
  const expectValue = async (max, value) => { await page.waitForTimeout(250); if (Math.abs(await current(max) - value / max * 100) > 0.02) throw new Error(`Expected ${value}/${max}, got ${await current(max)}%`); };
  await page.getByRole('button', { name: 'Show precise controls', exact: true }).click();
  // Touch scrolling from either slider must never commit a slider value.
  const touch = await ctx.newCDPSession(page);
  for (const [max, value] of [[180, 80], [60, 30]]) {
    const rail = page.getByTestId(`lab-range-${max}`);
    await rail.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const b = await rail.boundingBox();
    if (!b) throw new Error('Missing touch slider bounds');
    const x = b.x + b.width * 0.5, y = b.y + b.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 6; i++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 1, y: y - i * 10 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expectValue(max, value);
  }
  for (const [max, value] of [[180, 45], [60, 15]]) {
    const rail = page.getByTestId(`lab-range-${max}`);
    await rail.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const b = await rail.boundingBox();
    if (!b) throw new Error('Missing tap slider bounds');
    await rail.tap({ position: { x: b.width * 0.25, y: b.height / 2 } });
    await expectValue(max, value);
  }
  await page.getByRole('button', { name: 'Reset scenario', exact: true }).click();
  await expectValue(180, 80); await expectValue(60, 30);
  await page.getByRole('button', { name: 'Increase Actual recovery time', exact: true }).click(); await expectValue(180, 81);
  // Real pointer input tests both rails, endpoints and drag; no app-state backdoor.
  const point = async (max, ratio, drag = false) => {
    const rail = page.getByTestId(`lab-range-${max}`); await rail.scrollIntoViewIfNeeded(); const b = await rail.boundingBox();
    if (!b) throw new Error('Missing slider bounds');
    await page.mouse.move(b.x + (drag ? 0.5 : ratio) * b.width, b.y + b.height / 2); await page.mouse.down();
    if (drag) await page.mouse.move(b.x + ratio * b.width, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up(); await page.waitForTimeout(300);
  };
  await point(180, 0.75, true); await expectValue(180, 135);
  await point(60, 0.25, true); await expectValue(60, 15);
  await point(180, -0.02, true); await expectValue(180, 0);
  await point(180, 1.02, true); await expectValue(180, 180);
  await point(60, -0.02, true); await expectValue(60, 0);
  await point(60, 1.02, true); await expectValue(60, 60);
  await page.getByRole('button', { name: 'Reset scenario', exact: true }).click(); await expectValue(180, 80); await expectValue(60, 30);
  await page.getByRole('button', { name: 'Apply your judgment', exact: true }).click(); await page.waitForTimeout(300); await snap('apply');
  await page.getByRole('radio', { name: /^Report the missed RPO/ }).click(); await page.getByRole('button', { name: 'Check reasoning', exact: true }).click();
  await page.getByText('Evidence before assurance', { exact: true }).scrollIntoViewIfNeeded(); await snap('apply-feedback');
  if (await page.getByRole('button', { name: 'Practice recovery concepts', exact: true }).count() !== 1) throw new Error('Optional verified practice link missing');
  await page.getByRole('button', { name: 'Open the recovery study note', exact: true }).click(); await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Explore in Concept Lab', exact: true }).scrollIntoViewIfNeeded(); await snap('note-link');
  await go('/labs/cisa-lab-rto-rpo'); await page.getByRole('button', { name: '2. Experiment', exact: true }).click();
  await page.setViewportSize({ width: 360, height: 852 });
  await page.evaluate(() => { window.__AURIVAN_FONT_SCALE__ = 2; for (const el of document.querySelectorAll('div[dir="auto"], [role="heading"][dir="auto"]')) el.style.zoom = '2'; });
  await page.getByTestId('lab-range-180').evaluate(el => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(350); await snap('experiment-360-200pct-reduced');
  await ctx.close();
}
} catch (error) {
  console.error(error);
  if (activePage) {
    console.error('Failed page:', activePage.url(), await activePage.locator('body').innerText());
    await activePage.screenshot({ path: `${out}/failure.png` });
  }
  process.exitCode = 1;
} finally { await browser.close(); }
console.log('errors:', errors); if (errors.length) process.exitCode = 1;
