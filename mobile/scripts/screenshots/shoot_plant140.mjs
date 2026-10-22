// Mobile 1.40 (SHOTS=plant, after shoot_plant4b.mjs; PLANT=140 runs only this):
// the botanical default plant and the simpler game list.
//
// Shots: a botanical plant on Today, You and Your plant; the Look screen with
// its Style choice (and the same plant switched to "Storybook with a face");
// a plant saved before 1.40 (no style: unchanged, the storybook face); the
// Settings row that replaced Quiet look; "Plant yours" previewing botanical;
// Play before "More games" opens (one quiet line) and after; and a real
// Field Guide round whose recap earns a badge (the InviteRow) with the one
// "Report a problem" at its foot.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const P = 'aurivan.progress.v1';
const W = 393;
const H = 852;
const DAY = 86_400_000;
const now = Date.now();
const here = path.dirname(fileURLToPath(import.meta.url));

// Field Guide's answers: each key term's meaning, from the notes pack.
const notes = JSON.parse(fs.readFileSync(path.join(here, '../../src/content/generated/cisa/notes.json')));
const meaning = new Map();
for (const d of notes.domains) {
  for (const t of d.topics) for (const s of t.subtopics) for (const k of s.keyTerms) if (!meaning.has(k.term.trim())) meaning.set(k.term.trim(), k.definition.trim());
  for (const k of d.keyTerms) if (!meaning.has(k.term.trim())) meaning.set(k.term.trim(), k.definition.trim());
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termOf = (label) => label.replace(/^Term \d of \d: /, '').replace(/, (selected|matched)$/, '');

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  return page;
}
let page = await newPage();
const wait = (ms) => page.waitForTimeout(ms);
const go = async (p, ms = 2400) => {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}-${theme}.png` });
  console.log('shot', name);
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
const toTop = async (text, offset = 90) => {
  const el = page.getByText(text).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};
const setPlant = (plant) => edit(P, `v.state.byCert.cisa.plant = a; if (!a) delete v.state.byCert.cisa.plant;`, plant);
const reseed = () => page.evaluate(([k, v]) => localStorage.setItem(k, v), [P, seed[P]]);

// The demo plant, an oak called Kai at Crown, planted from 1.40 on: botanical.
const kai = { species: 'oak', name: 'Kai', plantedAt: now - 30 * DAY, growth: 5, reached: { sprout: now - 29 * DAY, shoot: now - 20 * DAY, bough: now - 9 * DAY, crown: now - 2 * DAY } };
const botanical = { ...kai, look: { style: 'botanical' } };

// ── 1. A botanical plant on Today, You and Your plant ────────────────────
await go('/', 400);
await setPlant(botanical);
await go('/', 2600);
await shot('p140-01-today-botanical');
await go('/you', 2600);
await shot('p140-02-you-botanical');
await go('/plant', 2600);
await shot('p140-03-your-plant-botanical');

// ── 2. The Look screen: Style first; then the same plant with a face ────
await go('/plant-look', 2600);
await shot('p140-04-look-style');
await toTop('Visitor', 40);
await shot('p140-04b-look-visitor-none');
await go('/plant-look', 2200);
await page.getByRole('radio', { name: /^Storybook with a face\./ }).first().click();
await wait(1200);
await shot('p140-04c-look-storybook-face');

// ── 3. A plant saved before 1.40 (no style): unchanged ───────────────────
await setPlant(kai);
await go('/plant', 2600);
await shot('p140-05-your-plant-legacy-unchanged');

// ── 4. Settings: "Change its look" replaced Quiet look ───────────────────
await setPlant(botanical);
await go('/settings?section=plant', 2600);
await shot('p140-06-settings-change-its-look');

// ── 5. "Plant yours" previews the botanical plant ────────────────────────
await setPlant(null);
await go('/plant-pick', 2600);
await shot('p140-07-plant-yours-botanical');

// ── 6. Play before "More games" opens (12 answers, no game played) ──────
await reseed();
await setPlant(botanical);
await edit(
  P,
  `const c = v.state.byCert.cisa; c.answers = Object.fromEntries(Object.entries(c.answers || {}).slice(0, 12)); c.gameBest = {}; c.gameRecent = {}; c.gameGrowth = {};`,
);
await go('/play', 2600);
await shot('p140-08-play-before-50');

// ── 7. Play after 50 answers: "More games", folded, then open ───────────
await reseed();
await setPlant(botanical);
await go('/play', 2600);
await shot('p140-09-play-after-50');
await page.getByRole('button', { name: /^More games/ }).first().click();
await wait(900);
await toTop('More games', 40);
await shot('p140-09b-play-more-open');

// ── 8. A real Field Guide round whose recap earns Whole Grove ───────────
// Every other game played already, so finishing this round is the badge's moment.
await page.context().close();
page = await newPage();
await go('/', 400);
await edit(
  P,
  `const c = v.state.byCert.cisa;
   c.gameBest = { trap: 6, sprint: 9, priority: 5, daylight: 7, rumor: 9, callit: 6, canopy: 8, stones: 2 };
   c.gameRecent = {};
   const m = c.milestones || { earned: {} };
   for (const k of Object.keys(m.earned || {})) if (k === 'whole-grove' || k.startsWith('whole-grove:')) delete m.earned[k];
   m.queue = (m.queue || []).filter((k) => !k.startsWith('whole-grove'));
   c.milestones = m;
   c.plant = a;`,
  botanical,
);
await go('/game/field', 2200);
await page.getByRole('button', { name: 'Start' }).click();
await wait(900);
for (let b = 0; b < 3; b++) {
  for (let k = 1; k <= 4; k++) {
    const tile = page.getByRole('button', { name: new RegExp(`^Term ${k} of 4: `) }).first();
    const term = termOf(await tile.getAttribute('aria-label'));
    if (b === 0 && k === 1) {
      // One slip, so the recap has a miss (and its one report link reports that card).
      const other = termOf(await page.getByRole('button', { name: /^Term 2 of 4: / }).first().getAttribute('aria-label'));
      await tile.click();
      await wait(150);
      await page.getByRole('button', { name: new RegExp(`^Meaning \\d of 4: ${escapeRe(meaning.get(other).slice(0, 30))}`) }).first().click();
      await wait(1100);
    }
    await tile.click();
    await wait(120);
    await page.getByRole('button', { name: new RegExp(`^Meaning \\d of 4: ${escapeRe(meaning.get(term).slice(0, 30))}`) }).first().click();
    await wait(250);
  }
  await page.getByText(b === 2 ? 'See results' : 'Next board', { exact: true }).click();
  await wait(900);
}
await wait(1600);
await shot('p140-10-recap-new-badge');
await page.mouse.move(W / 2, H / 2);
await page.mouse.wheel(0, 2000);
await wait(900);
await shot('p140-10b-recap-foot-report');

await browser.close();
if (errs.length) {
  console.error('page errors:', errs);
  process.exit(1);
}
