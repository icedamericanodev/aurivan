// Build F "Milestones" screenshots (393x852 @2x): the launch back-fill
// summary (You), the Milestones screen, a Results screen with its one
// milestone moment, Play with level leaves, Field notes, and each new game
// (Field Guide, Canopy Call, Stepping Stones): a round and its end screen.
// Usage: node shoot_milestones.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=milestones bash scripts/screenshots/run.sh <out> <dark|light>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';
const here = path.dirname(fileURLToPath(import.meta.url));
const gen = path.join(here, '../../src/content/generated/cisa');
const games = path.join(here, '../../src/content/games/cisa');

// Content the shots need to play rounds right (term → meaning; the decks).
const notes = JSON.parse(fs.readFileSync(path.join(gen, 'notes.json')));
const meaning = new Map();
for (const d of notes.domains) {
  for (const t of d.topics) for (const s of t.subtopics) for (const k of s.keyTerms) if (!meaning.has(k.term.trim())) meaning.set(k.term.trim(), k.definition.trim());
  for (const k of d.keyTerms) if (!meaning.has(k.term.trim())) meaning.set(k.term.trim(), k.definition.trim());
}
const roles = JSON.parse(fs.readFileSync(path.join(games, 'roles.json')));

const baseSeed = { ...seed };
delete baseSeed['aurivan.session.v1'];

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
/** A fresh phone with the seed, plus `extra` edits to the progress store (by cert). */
async function newPage(extra = null, withSession = false) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([s, x, sess]) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    if (sess) localStorage.setItem('aurivan.session.v1', sess);
    if (x) {
      const p = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
      Object.assign(p.state.byCert.cisa, x);
      localStorage.setItem('aurivan.progress.v1', JSON.stringify(p));
    }
    localStorage.setItem('__seeded', '1');
  }, [baseSeed, extra, withSession ? seed['aurivan.session.v1'] : null]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  return page;
}
const snap = async (page, name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (page, p) => { await page.goto(base + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800); };
const scrollBy = async (page, dy) => { await page.mouse.move(196, 500); await page.mouse.wheel(0, dy); await page.waitForTimeout(700); };
const scrollTo = async (page, locator, top = 110) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) await scrollBy(page, box.y - top);
};
const now = Date.now();
const DAY = 86400000;

// Some game levels and a few game rounds, so Play and Field notes show leaves.
const grown = {
  gameGrowth: {
    trap: { tier: 'sapling', up: 1, down: 0, hits: [true, true, false, true, true, true, true, true, false, true] },
    sprint: { tier: 'heartwood', up: 0, down: 0, run: 2 },
    rumor: { tier: 'sapling', up: 0, down: 0 },
  },
  gameBest: { trap: 7, sprint: 14, priority: 7, rumor: 10 },
};

// ── 1. The launch back-fill: the seed has no milestones, so You shows ONE line ──
{
  const page = await newPage();
  await open(page, '/you');
  await scrollTo(page, page.getByText('From your study so far').first(), 160);
  await snap(page, 'f01-you-backfill-summary');
  await scrollTo(page, page.getByText('Field notes', { exact: true }).first(), 300);
  await snap(page, 'f01b-you-milestone-rows');
  // ── 2. The Milestones screen (summary shown once, then marked seen) ──
  await page.getByRole('button', { name: /^Milestones, / }).first().click();
  await page.waitForTimeout(1500);
  await snap(page, 'f02-milestones');
  await scrollTo(page, page.getByText('Closest next', { exact: true }).first(), 90);
  await snap(page, 'f02b-milestones-closest');
  await scrollTo(page, page.getByText('Still ahead', { exact: true }).first(), 90);
  await snap(page, 'f02c-milestones-ahead');
  await page.context().close();
}

// ── 3. Results with its one milestone (a session finished for real) ──
{
  // A queued milestone waits for this session; the back-fill already ran.
  const page = await newPage({ milestones: { earned: { 'rooted:10': now - DAY }, queue: ['rooted:10'], backfill: { at: now - DAY, count: 0, seen: true }, days: 12, lastDay: '2000-01-01' } }, true);
  const keys = (seed.__shotKeys || 'D').split(',');
  await open(page, '/session');
  for (let q = 0; q < keys.length; q++) {
    await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
    await page.getByText('Check answer', { exact: true }).click();
    await page.waitForTimeout(900);
    const label = q < keys.length - 1 ? 'Next question' : 'See results';
    await page.getByText(label, { exact: true }).click();
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(1200);
  await scrollTo(page, page.getByText('A quiet milestone').first(), 260);
  await snap(page, 'f03-results-milestone');
  await page.context().close();
}

// ── 4. Play with level leaves; 5. Field notes ──
{
  const page = await newPage(grown);
  await open(page, '/play');
  await snap(page, 'f04-play-levels');
  await scrollBy(page, 700);
  await snap(page, 'f04b-play-levels-more');
  await open(page, '/field-notes');
  await snap(page, 'f05-field-notes');
  await scrollTo(page, page.getByText('Pressed leaves', { exact: true }).first(), 90);
  await snap(page, 'f05b-field-notes-leaves');
  await page.context().close();
}

/** The term shown on a "Term k of 4: …" tile. */
const termOf = (label) => label.replace(/^Term \d of \d: /, '').replace(/, (selected|matched)$/, '');

// ── 6. Field Guide: intro, a board mid-round (a match, a slip), the end ──
{
  const page = await newPage();
  await open(page, '/game/field');
  await snap(page, 'f06-field-intro');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'f06b-field-board');
  for (let b = 0; b < 3; b++) {
    for (let k = 1; k <= 4; k++) {
      const tile = page.getByRole('button', { name: new RegExp(`^Term ${k} of 4: `) }).first();
      const term = termOf(await tile.getAttribute('aria-label'));
      // One slip on the first board, so the recap has a miss.
      if (b === 0 && k === 1) {
        const other = termOf(await page.getByRole('button', { name: /^Term 2 of 4: / }).first().getAttribute('aria-label'));
        await tile.click();
        await page.getByRole('button', { name: new RegExp(`^Meaning \\d of 4: ${escapeRe(meaning.get(other).slice(0, 30))}`) }).first().click();
        await page.waitForTimeout(300);
      }
      await tile.click();
      await page.getByRole('button', { name: new RegExp(`^Meaning \\d of 4: ${escapeRe(meaning.get(term).slice(0, 30))}`) }).first().click();
      await page.waitForTimeout(250);
      if (b === 0 && k === 2) await snap(page, 'f06c-field-matching');
    }
    await page.getByText(b === 2 ? 'See results' : 'Next board', { exact: true }).click();
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(600);
  await snap(page, 'f06d-field-end');
  await scrollBy(page, 600);
  await snap(page, 'f06e-field-end-recap');
  await page.context().close();
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── 7. Canopy Call: a decision, its reveal, the end with confusion pairs ──
{
  const page = await newPage();
  await open(page, '/game/canopy');
  await snap(page, 'f07-canopy-intro');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'f07b-canopy-decision');
  for (let k = 0; k < 10; k++) {
    // Right on most, wrong on three (the first role that isn't the key).
    const text = await page.locator('body').innerText();
    const card = roles.cards.find((c) => text.includes(c.decision));
    const key = roles.roles.find((r) => r.id === card.role).label;
    const rows = page.getByRole('radio', { name: /^Role \d of \d: / });
    const n = await rows.count();
    let target = null;
    for (let j = 0; j < n; j++) {
      const l = await rows.nth(j).getAttribute('aria-label');
      const isKey = l.endsWith(key);
      if ((k % 3 === 1) !== isKey) { target = rows.nth(j); break; }
    }
    await (target ?? rows.first()).click();
    await page.waitForTimeout(500);
    if (k === 1) await snap(page, 'f07c-canopy-reveal');
    await page.getByText(k === 9 ? 'See results' : 'Next decision', { exact: true }).click();
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(600);
  await snap(page, 'f07d-canopy-end');
  await scrollTo(page, page.getByText('Where your calls went').first(), 200);
  await snap(page, 'f07e-canopy-confusion');
  await page.context().close();
}

// ── 8. Stepping Stones: building a path, the check, Heartwood, the end ──
{
  const page = await newPage();
  await open(page, '/game/stones');
  await snap(page, 'f08-stones-intro');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'f08b-stones-start');
  for (let p = 0; p < 3; p++) {
    // Tap the stones in the order shown (not the right one), then check.
    for (let k = 0; k < 6; k++) {
      const stone = page.getByRole('button', { name: /^Place next: / }).first();
      if (!(await stone.count())) break;
      await stone.click();
      await page.waitForTimeout(200);
      if (p === 0 && k === 1) await snap(page, 'f08c-stones-placing');
    }
    await page.getByText('Check the order', { exact: true }).click();
    await page.waitForTimeout(700);
    if (p === 0) {
      await snap(page, 'f08d-stones-checked');
      await scrollBy(page, 600);
      await snap(page, 'f08e-stones-explained');
    }
    await page.getByText(p === 2 ? 'See results' : 'Next process', { exact: true }).click();
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(600);
  await snap(page, 'f08f-stones-end');
  await page.context().close();
}
{
  const page = await newPage({ gameGrowth: { stones: { tier: 'heartwood', up: 0, down: 0 } } });
  await open(page, '/game/stones');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'f08g-stones-heartwood');
  await page.getByRole('radio', { name: /^Choice 1 of 3: / }).first().click();
  await page.waitForTimeout(600);
  await snap(page, 'f08h-stones-heartwood-reveal');
  await page.context().close();
}

console.log('errors:', JSON.stringify(errs));
await browser.close();
