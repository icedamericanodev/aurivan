// One-topic reading surfaces. Synthetic make_seed data only; never a tester's save.
// Covers light/dark, 320/393pt and a web approximation of 200% reading text.
import { createRequire } from 'module';
import fs from 'fs';
import assert from 'node:assert/strict';

const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3];
const bank = [1, 2, 3, 4, 5].flatMap(d => JSON.parse(fs.readFileSync(`src/content/generated/cisa/d${d}.json`, 'utf8')));
const principles = JSON.parse(fs.readFileSync('src/content/generated/cisa/principles.json', 'utf8'));
const principle = principles.principles[0];
const lesson = JSON.parse(fs.readFileSync('src/content/generated/cisa/lessons.json', 'utf8')).find(l => l.id === 'cisa-l-d4-rpo-rto');
const errors = [];
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
let activePage;
let activeTag;
fs.mkdirSync(out, { recursive: true });

try {
  for (const theme of ['light', 'dark']) for (const width of [393, 320]) for (const scale of [1, 2]) {
    const tag = `${theme}-w${width}-fs${scale * 100}`;
    activeTag = tag;
    const settings = JSON.parse(seed['aurivan.settings.v1']);
    settings.state = { ...settings.state, activeCertId: 'cisa', theme, motion: 'reduced' };
    const seeded = { ...seed, 'aurivan.settings.v1': JSON.stringify(settings) };
    delete seeded['aurivan.session.v1'];
    const ctx = await browser.newContext({ viewport: { width, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.addInitScript(({ values, fontScale }) => {
      window.__AURIVAN_FONT_SCALE__ = fontScale;
      if (localStorage.getItem('__seeded')) return;
      for (const [key, value] of Object.entries(values)) if (!key.startsWith('__')) localStorage.setItem(key, value);
      localStorage.setItem('__seeded', '1');
    }, { values: seeded, fontScale: scale });
    const page = await ctx.newPage();
    activePage = page;
    page.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
    const zoom = async () => {
      if (scale === 1) return;
      await page.evaluate(() => {
        // Same approximation used by the notes harness: reading text doubles;
        // large headings retain the native 1.3 cap. This is not a native font-scale test.
        for (const el of document.querySelectorAll('[dir="auto"]')) {
          if (el.dataset.zoomed) continue;
          const px = parseFloat(getComputedStyle(el).fontSize) || 16;
          el.style.zoom = String(px >= 26 ? 1.3 : 2);
          el.dataset.zoomed = '1';
        }
      });
      await page.waitForTimeout(150);
    };
    const go = async path => {
      await page.goto(`http://127.0.0.1:8093${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await zoom();
    };
    const press = async name => {
      await page.getByRole('button', { name, exact: true }).click();
      await page.waitForTimeout(250);
      await zoom();
    };
    const snap = async name => {
      await zoom();
      await page.screenshot({ path: `${out}/topic-${name}-${tag}.png` });
      console.log('shot', `topic-${name}-${tag}`);
    };
    const top = async locator => {
      await locator.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(200);
    };
    const fits = async (locator, name) => {
      const failures = await locator.evaluate(root => {
        const box = root.getBoundingClientRect();
        const bad = [];
        for (const el of [root, ...root.querySelectorAll('div, button, svg')]) {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height || getComputedStyle(el).visibility === 'hidden') continue;
          if (el.closest('[aria-hidden="true"]')) continue;
          if (rect.left < box.left - 2 || rect.right > box.right + 2) {
            if (bad.length === 0) el.scrollIntoView({ block: 'center' });
            bad.push((el.textContent || el.tagName).slice(0, 100));
          }
        }
        return bad.slice(0, 8);
      });
      assert.deepEqual(failures, [], `${name} content exceeds its card at ${tag}`);
    };

    await go('/learn');
    const tiles = ['notes', 'glossary', 'principles', 'guide'];
    for (const key of tiles) assert.equal(await page.getByTestId(`learn-tile-${key}`).count(), 1, `Preserve Learn ${key}`);
    await top(page.getByTestId('learn-tile-notes'));
    await snap('learn-title-cards');

    await go('/mistakes');
    const mistake = page.locator('[data-testid^="mistake-card-"]').first();
    await mistake.waitFor({ state: 'visible' });
    const id = (await mistake.getAttribute('data-testid')).replace('mistake-card-', '');
    const q = bank.find(item => item.id === id);
    const saved = JSON.parse(seeded['aurivan.progress.v1']).state.byCert.cisa.mistakes[id];
    const words = await mistake.innerText();
    for (const text of [q.stem, q.options[saved.picked], q.options[q.correct], 'Your pick', 'Best answer']) assert.ok(words.includes(text), `Complete mistake content: ${text}`);
    assert.equal(await mistake.getByRole('button', { name: /^Read the note:/ }).count(), 1);
    await top(mistake);
    await fits(mistake, 'Mistake');
    await snap('mistake');
    const tagButton = mistake.getByRole('button', { name: saved.slip ? 'Change' : 'Tag why you slipped', exact: true });
    await tagButton.click(); await zoom();
    const tags = mistake.getByRole('radiogroup');
    await tags.waitFor({ state: 'visible' });
    await top(tags);
    await fits(mistake, 'Mistake tags');
    await snap('mistake-tags');
    await mistake.getByRole('button', { name: /^Read the note:/ }).click();
    await page.getByTestId('study-note-topic-card').waitFor({ state: 'visible' });

    await go('/notes/subtopic/4B1.2');
    const note = page.getByTestId('study-note-topic-card');
    await fits(note, 'Study note'); await snap('note');
    await press('On this page: 2 of 3, Think like the IS auditor');
    const movement = page.getByRole('heading', { name: 'Think like the IS auditor', exact: true });
    const movementBox = await movement.boundingBox();
    assert.ok(movementBox && movementBox.y >= 0 && movementBox.y < 852, 'Note jump reaches its heading');
    await snap('note-jump');
    await top(note.getByText('Diagram', { exact: true }).first());
    await fits(note, 'Note diagram'); await snap('note-diagram');

    await go(`/principles/${principle.id}`);
    const principleCard = page.getByTestId('principle-topic-card');
    assert.ok((await principleCard.innerText()).includes(principle.rule), 'Principle text stays intact');
    await fits(principleCard, 'Principle'); await snap('principle');

    await go(`/lesson/${lesson.id}`);
    assert.equal(await page.getByTestId('lesson-topic-card').count(), 0, 'Lesson cover remains unchanged');
    await press('Next');
    const scene = page.getByTestId('lesson-topic-card');
    await scene.waitFor({ state: 'visible' });
    // Generic headings such as 'The core idea' are intentionally omitted by SceneTop.
    assert.ok((await scene.innerText()).includes(lesson.scenes[1].body), 'Lesson scene retains its complete teaching text');
    await fits(scene, 'Lesson'); await snap('lesson');

    await go('/labs/cisa-lab-rto-rpo');
    await press('2. Experiment');
    const lab = page.getByTestId('lab-topic-card');
    await top(lab);
    await fits(lab, 'Concept Lab'); await snap('concept-lab');
    assert.equal(await lab.getByRole('slider').count(), 2, 'Both concept controls remain accessible');
    await ctx.close();
    activePage = undefined;
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS: topic cards, complete content, navigation and horizontal fit across 8 configurations');
} catch (error) {
  console.error(error);
  if (activePage) await activePage.screenshot({ path: `${out}/topic-failure-${activeTag}.png` });
  process.exitCode = 1;
} finally {
  await browser.close();
}
