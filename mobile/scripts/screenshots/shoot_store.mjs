// Google Play store screenshots (SHOTS=store, see run.sh; docs/mobile/PLAY_LAUNCH.md c6).
//
// Play's rules: JPEG or 24-bit PNG (no alpha), each side 320–3840 px, the long
// side at most twice the short side. So: a 360×640 phone at 3× = 1080×1920
// (16:9), light theme, demo data. run.sh flattens each PNG to 24-bit after.
//
// The six screens, in listing order (captions: docs/mobile/STORE_LISTING.md §3):
//   store-01-today      Today: the daily plan, with a botanical plant
//   store-02-question   A practice question
//   store-03-answer     The answer screen, scrolled to the tips
//   store-04-lesson     A lesson scene
//   store-05-readiness  The readiness report after a few mocks
//   store-06-plant      Your plant, in the botanical style
//
// Guardrail: no screen may show the question bank's size. The script checks
// each screen's text for "<number> questions" and stops if it finds one.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const BASE = 'http://127.0.0.1:8093';
const W = 360;
const H = 640;
const P = 'aurivan.progress.v1';
const DAY = 86_400_000;
const now = Date.now();
const here = path.dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'light' });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const go = async (p, ms = 2400) => {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await wait(ms);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(
    ([k, src, a]) => {
      const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
      new Function('v', 'a', src)(v, a);
      localStorage.setItem(k, JSON.stringify(v));
    },
    [key, fn, arg],
  );
/**
 * Fails the run if the screen (what is inside the 360×640 frame, not the
 * rest of the scroll) names a number of questions: the bank size must never
 * show, and a store shot shows no count at all, to be safe.
 */
const noCount = async (name) => {
  const text = await page.evaluate(([w, h]) => {
    const seen = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width > 0 && r.bottom > 0 && r.top < h && r.right > 0 && r.left < w) seen.push(n.textContent);
    }
    return seen.join(' ');
  }, [W, H]);
  const hit = text.match(/\b\d[\d,]*\+?\s+(practice\s+)?questions\b/i);
  if (hit) throw new Error(`${name} shows a question count ("${hit[0]}"): pick another screen state.`);
};
const shot = async (name) => {
  await noCount(name);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};

// ── Demo state shared by the shots ─────────────────────────────────────
// The demo plant (as in shoot_plant140.mjs): an oak called Kai at Crown, botanical.
const kai = {
  species: 'oak',
  name: 'Kai',
  plantedAt: now - 30 * DAY,
  growth: 5,
  reached: { sprout: now - 29 * DAY, shoot: now - 20 * DAY, bough: now - 9 * DAY, crown: now - 2 * DAY },
  look: { style: 'botanical' },
};
// Four mocks over three weeks (as in shoot_proof.mjs, fewer), so readiness has a range and a trend.
const tally = (pcts, sizes) => Object.fromEntries(pcts.map((p, i) => [String(i + 1), { total: sizes[i], correct: Math.round((p / 100) * sizes[i]) }]));
const MINI = [9, 9, 6, 13, 13];
const FULL = [27, 26, 20, 39, 38];
const plan = [
  { days: 20, kind: 'mini', pcts: [66, 58, 52, 61, 57], sec: 101 },
  { days: 14, kind: 'full', pcts: [72, 63, 55, 64, 61], sec: 93 },
  { days: 7, kind: 'mini', pcts: [78, 70, 60, 70, 66], sec: 90 },
  { days: 2, kind: 'full', pcts: [82, 73, 62, 74, 69], sec: 86 },
];
const mocks = plan
  .map((m, i) => {
    const sizes = m.kind === 'full' ? FULL : MINI;
    const byDomain = tally(m.pcts, sizes);
    return {
      id: `store-mock-${i}`,
      finishedAt: now - m.days * DAY - 3 * 3_600_000,
      total: sizes.reduce((a, b) => a + b, 0),
      correct: Object.values(byDomain).reduce((a, b) => a + b.correct, 0),
      minutesUsed: m.kind === 'full' ? 226 : 74,
      byDomain,
      timing: 'standard',
      minutesAllowed: m.kind === 'full' ? 240 : 80,
      medianSec: m.sec,
      unanswered: 0,
    };
  })
  .reverse(); // the store keeps newest first
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const LOG = [];
for (let k = 20; k >= 0; k--) LOG.push({ day: dk(now - k * DAY), min: Math.round(58 + ((20 - k) / 20) * 8), last: Math.round(58 + ((20 - k) / 20) * 8) });

await go('/', 400);
await edit(P, `const c = v.state.byCert.cisa; c.plant = a.kai; c.mocks = a.mocks; c.moments = { ...(c.moments || {}), readiness: a.log }; v.state.plantSettings = { promptHidden: true };`, { kai, mocks, log: LOG });

// ── 1. Today ───────────────────────────────────────────────────────────
await go('/home', 2600);
await shot('store-01-today');

// ── 2–3. A question, then its answer and tips ──────────────────────────
// The seed's first sample question, answered with its key (the seed keeps the options unshuffled).
const session = JSON.parse(seed['aurivan.session.v1']);
const firstId = session.state.active.questionIds[0];
const domain = firstId.match(/^d(\d)_/)[1];
const bank = JSON.parse(fs.readFileSync(path.join(here, `../../src/content/generated/cisa/d${domain}.json`)));
const key = bank.find((q) => q.id === firstId).correct;
await go('/session', 2000);
await shot('store-02-question');
await page.getByLabel(new RegExp(`^Option ${key}:`)).first().click();
await page.getByText('Check answer', { exact: true }).click();
await wait(1400);
// Scroll so the key idea sits just under the verdict bar and the tips fill the rest.
const keyIdea = page.getByText('Key idea', { exact: true }).first();
if (await keyIdea.count()) {
  await keyIdea.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -64);
} else {
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, 700);
}
await wait(900);
await shot('store-03-answer');

// ── 4. A lesson ────────────────────────────────────────────────────────
// The charter lesson's first idea scene (as in shoot.mjs 03a).
await go('/lesson/cisa-l-d1-charter', 1400);
await page.getByRole('button', { name: 'Next', exact: true }).click();
await wait(1400);
await shot('store-04-lesson');

// ── 5. Readiness after a few mocks ─────────────────────────────────────
await go('/readiness', 2600);
await shot('store-05-readiness');

// ── 6. Your plant ──────────────────────────────────────────────────────
await go('/plant', 2600);
await shot('store-06-plant');

await browser.close();
if (errs.length) {
  console.error('page errors:', errs);
  process.exit(1);
}
