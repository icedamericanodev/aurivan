// Mobile 1.43, the six concept boards and the tab headers (SHOTS=m143, see run.sh).
//
// Shots: the answer screen after a miss (folded, and with "Read more" open), Results for a
// 10-question set with two misses, You (one readiness ring and the areas), the study note
// "Recovery Objectives" (acronym plate, "In one line" first), Settings, the lesson's charter idea
// scene, and the first screen of Today, Learn, Practice and Play.
// FONT_SCALE=2 approximates 200% text; NARROW=1 uses a 360-wide phone.
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
const NARROW = process.env.NARROW === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const ONLY = (process.env.M143_ONLY || '').split(',').filter(Boolean);
const want = (k) => ONLY.length === 0 || ONLY.includes(k);
const tag = `${theme}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const here = path.dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';
const zoomText = () =>
  page.evaluate(
    ([sel, f]) => {
      for (const el of document.querySelectorAll(sel)) {
        if (el.dataset.zoomed) continue;
        const px = parseFloat(getComputedStyle(el).fontSize) || 16;
        el.style.zoom = String(px >= 26 ? Math.min(1.3, f) : f);
        el.dataset.zoomed = '1';
      }
    },
    [TEXT_RUNS, FONT_SCALE],
  );
const shot = async (name) => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(400);
  }
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const go = async (route, ms = 2200) => {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await wait(ms);
};
const scrollBy = async (dy) => {
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, dy);
  await wait(700);
};
/** Bring an element with this text (or label) to the upper part of the screen. */
const into = async (text, block = 'start', byLabel = false) => {
  const n = byLabel ? page.getByLabel(text).first() : page.getByText(text).first();
  if (await n.count()) {
    await n.evaluate((x, b) => x.scrollIntoView({ block: b }), block);
    await wait(700);
  } else console.log(`"${text}" did not show`);
};
const edit = (key, fn) =>
  page.evaluate(
    ([k, src]) => {
      const v = JSON.parse(localStorage.getItem(k));
      new Function('v', src)(v);
      localStorage.setItem(k, JSON.stringify(v));
    },
    [key, fn],
  );

// ── Board 1: the answer screen after a miss ──────────────────────────────
if (want('answer')) {
  const keys = (seed.__shotKeys || 'D').split(',');
  await go('/session', 1600);
  await page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await wait(1500);
  await shot('b1-answer-miss');
  // The fold: Key idea and Exam cue, then "Why D" folded with Read more.
  await into('Read more', 'center');
  await shot('b1-answer-read-more');
  await page.getByText('Read more', { exact: true }).first().click();
  await wait(1200);
  await into('Eliminate two', 'center');
  await shot('b1-answer-open');
}

// ── Board 2: Results for a 10-question set with two misses ───────────────
if (want('results')) {
  const d1 = JSON.parse(fs.readFileSync(path.join(here, '../../../data/domain1.json'), 'utf8'));
  const qs = (Array.isArray(d1) ? d1 : d1.questions).filter((q) => (q.tips || []).some((t) => t.startsWith('Final two:'))).slice(0, 10);
  const ids = qs.map((q) => q.id);
  const now = Date.now();
  const responses = Object.fromEntries(
    qs.map((q, i) => {
      const wrong = i === 2 || i === 6;
      const letter = wrong ? ['A', 'B', 'C', 'D'].find((l) => l !== q.correct) : q.correct;
      return [q.id, { display: letter, correct: !wrong, ms: 40_000 + (i % 3) * 3_000, at: now - (10 - i) * 42_000 }];
    }),
  );
  await go('/home', 800);
  await edit(
    'aurivan.session.v1',
    `v.state.active = { id: 'm143', mode: 'practice', certId: 'cisa', title: 'Practice · IS Audit', questionIds: ${JSON.stringify(ids)},
      perms: ${JSON.stringify(Object.fromEntries(ids.map((i) => [i, ['A', 'B', 'C', 'D']])))}, index: 9,
      responses: ${JSON.stringify(responses)}, flagged: [], startedAt: ${now - 7 * 60000}, finishedAt: ${now} };`,
  );
  await go('/results', 2600);
  await shot('b2-results');
  await scrollBy(560);
  await shot('b2-results-missed');
  await into('Review answers');
  await shot('b2-results-review');
}

// ── Board 3: You ─────────────────────────────────────────────────────────
if (want('you')) {
  await go('/you', 2600);
  await shot('b3-you');
  await into('Answered', 'center');
  await shot('b3-you-stats');
  // The area rows from their caption (the seed's thin Info Protection row is the last one).
  await into('Right on your latest tries');
  await shot('b3-you-areas');
}

// ── Board 4: a study note ────────────────────────────────────────────────
if (want('note')) {
  await go('/notes/subtopic/4B1.2', 2400);
  await shot('b4-note');
  await scrollBy(520);
  await shot('b4-note-lesson');
}

// ── Board 5: Settings ────────────────────────────────────────────────────
if (want('settings')) {
  await go('/settings', 2200);
  await shot('b5-settings');
  await scrollBy(640);
  await shot('b5-settings-more');
}

// The danger button at the foot of Settings (UX P3: does its pill read in dark?). M143_ONLY=danger.
if (want('danger')) {
  await go('/settings', 2200);
  await into('Reset CISA progress', 'center');
  await shot('b5-settings-reset');
}

// The theme in one tap (M143_ONLY=themeTap): Dark, then Light, then back to You.
if (want('themeTap')) {
  await go('/you', 1600);
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await wait(1400);
  await page.getByRole('radio', { name: 'Dark', exact: true }).first().click();
  await wait(1200);
  await shot('b5-theme-tap-dark');
  await page.getByRole('radio', { name: 'Light', exact: true }).first().click();
  await wait(1200);
  await shot('b5-theme-tap-light');
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await wait(1400);
  await shot('b5-theme-tap-back-to-you');
  // The taps above saved Light. Put the run's own theme back, or every later dark-run shot
  // comes out light.
  await go('/settings', 1600);
  await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light', exact: true }).first().click();
  await wait(1000);
}

// Settings opened the way a learner opens it: the gear on Today and on You (owner report: a gear
// floated over "Your name" on 1.42.1). M143_ONLY=gear.
if (want('gear')) {
  for (const [name, route] of [['b5-gear-from-today', '/home'], ['b5-gear-from-you', '/you']]) {
    await go(route, 2200);
    await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
    await wait(1600);
    await shot(name);
  }
}

// ── Board 6: the lesson's idea scene ─────────────────────────────────────
if (want('lesson')) {
  await go('/lesson/cisa-l-d1-charter', 1400);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await wait(1600);
  await shot('b6-lesson-idea');
}

// ── Tab headers ──────────────────────────────────────────────────────────
if (want('headers')) {
  for (const [name, route] of [['h1-today', '/home'], ['h2-learn', '/learn'], ['h3-practice', '/practice'], ['h4-play', '/play']]) {
    await go(route, 2400);
    await shot(name);
  }
}

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
