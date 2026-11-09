// Synthetic browser acceptance. Native TalkBack/VoiceOver and font scaling remain separate checks.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3];
const errors = [];
const results = [];
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
let page;
try {
  for (const theme of ['light', 'dark']) for (const scale of [1, 2]) {
    const settings = JSON.parse(seed['aurivan.settings.v1']);
    Object.assign(settings.state, { theme, motion: 'reduced', activeCertId: 'cisa' });
    const data = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) }; delete data['aurivan.session.v1'];
    const ctx = await browser.newContext({ viewport: { width: scale === 2 ? 320 : 393, height: 852 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(s => { if (localStorage.getItem('__seeded')) return; for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v); localStorage.setItem('__seeded', '1'); }, data);
    page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const go = async path => { await ctx.setOffline(false); await page.goto(`http://127.0.0.1:8093${path}`, { waitUntil: 'networkidle' }); };
    await go('/labs');
    await page.getByRole('button', { name: 'Open Understand RTO vs. RPO', exact: true }).waitFor({ timeout: 30000 });
    const labels = await page.getByRole('button', { name: /^Open / }).evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')).filter(Boolean));
    const expansion = labels.filter(label => label !== 'Open Understand RTO vs. RPO');
    if (expansion.length !== 5) throw new Error(`Expected five new catalog entries; found ${expansion.length}`);
    for (const label of expansion) {
      await go('/labs'); await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('button', { name: '2. Experiment', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const id = page.url().split('/').pop();
      // Browser approximation only: scale actual text nodes, preserving button reflow.
      if (scale === 2) await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = 'div[dir="auto"] { zoom: 2; }'; document.head.append(style);
      });
      const save = async stage => {
        await page.screenshot({ path: `${out}/${id}-${stage}-${theme}-${scale}x.png` });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (overflow) throw new Error(`${id} horizontal overflow at ${scale}x ${stage}`);
      };
      await save('explore');
      const progressBefore = await page.evaluate(() => localStorage.getItem('aurivan.progress.v1'));
      await ctx.setOffline(true);
      await page.getByRole('button', { name: '2. Experiment', exact: true }).click();
      const initial = await page.getByTestId('expansion-outcome').innerText();
      const initialBody = await page.locator('body').innerText();
      const assignments = page.getByRole('button', { name: /Change assignment$/ });
      if (await assignments.count()) {
        const current = (await assignments.first().innerText()).trim();
        await assignments.first().click();
        const choices = page.getByRole('radio');
        const names = await choices.evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
        const other = names.findIndex(name => name !== current);
        if (other < 0) throw new Error('No alternative assignment');
        await choices.nth(other).click();
      } else if (await page.getByRole('button', { name: 'Increase Available audit hours', exact: true }).count()) {
        await page.getByRole('button', { name: 'Increase Available audit hours', exact: true }).click();
      } else if (await page.getByRole('button', { name: /^Disable / }).count()) {
        await page.getByRole('button', { name: /^Disable / }).first().click();
      } else {
        await page.getByRole('button', { name: 'Increase Recovery resource budget', exact: true }).click();
      }
      await page.waitForTimeout(150);
      if (await page.locator('body').innerText() === initialBody) throw new Error(`${id} control did not change the displayed scenario`);
      await save('experiment-controls');
      await page.getByTestId('expansion-outcome').scrollIntoViewIfNeeded(); await save('experiment-feedback');
      await page.getByRole('button', { name: 'Reset scenario', exact: true }).click();
      if (await page.getByTestId('expansion-outcome').innerText() !== initial) throw new Error(`${id} failed reset`);
      if (id === 'cisa-lab-risk-planning' && scale === 1) {
        await page.getByRole('button', { name: '○ Include Payroll', exact: true }).click();
        await page.getByRole('button', { name: '○ Include Online orders', exact: true }).click();
        await page.getByTestId('expansion-outcome').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${out}/risk-plan-selected-${theme}.png` });
        await page.getByRole('button', { name: 'Reset scenario', exact: true }).click();
      }
      await page.getByRole('button', { name: '3. Apply', exact: true }).click();
      await page.getByRole('radio').first().click();
      await page.getByRole('button', { name: 'Check reasoning', exact: true }).click();
      await page.getByRole('button', { name: 'Try the application again', exact: true }).scrollIntoViewIfNeeded(); await save('apply-feedback');
      await page.getByRole('button', { name: 'Try the application again', exact: true }).click();
      if (await page.getByRole('button', { name: 'Check reasoning', exact: true }).isEnabled()) throw new Error(`${id} failed retry`);
      if (await page.evaluate(() => localStorage.getItem('aurivan.progress.v1')) !== progressBefore) throw new Error(`${id} mutated progress`);
      results.push({ id, theme, scale, offlineInteraction: 'passed', reset: 'passed', retry: 'passed', progressUnchanged: true });
    }
    await ctx.close();
  }
  if (errors.length) throw new Error(errors.join('\n'));
  fs.rmSync(`${out}/failure.png`, { force: true });
} catch (error) {
  console.error(error);
  if (page && !page.isClosed()) await page.screenshot({ path: `${out}/failure.png` });
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors, nativeAccessibility: 'not tested', largeText: 'browser CSS approximation' }, null, 2));
}
