// Grove Phase 1 and Today on the phone (SHOTS=grove, see run.sh): Today in three states (a new learner,
// 10 answers, past the first range), You (the Settings button), Settings (the Grove cards) and the
// floating tab bar, in light and dark (THEMES=light,dark by default). FONT_SCALE=2 approximates 200%
// text (the tab bar's own words stay capped at x1.2, as in the app). GROVE_ONLY=today,you,settings,bar narrows it.
// Grove You C2: You also as you-mid, you-mid2 (scrolled), you-before40 (34 answers) and you-new (a new learner).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const BASE = 'http://127.0.0.1:8093';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const THEMES = (process.env.THEMES || 'light,dark').split(',').filter(Boolean);
const ONLY = (process.env.GROVE_ONLY || '').split(',').filter(Boolean);
const want = (k) => ONLY.length === 0 || ONLY.includes(k);
const W = 390;
const H = 844;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const DAY = 86400000;
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];

for (const theme of THEMES) {
  const tag = `${theme}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, seed);
  if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  const wait = (ms) => page.waitForTimeout(ms);
  const zoomText = () =>
    page.evaluate(
      ([sel, f]) => {
        for (const el of document.querySelectorAll(sel)) {
          if (el.dataset.zoomed || el.closest('[role="tablist"]')) continue;
          const px = parseFloat(getComputedStyle(el).fontSize) || 16;
          el.style.zoom = String(px >= 26 ? Math.min(1.3, f) : f);
          el.dataset.zoomed = '1';
        }
      },
      [TEXT_RUNS, FONT_SCALE],
    );
  const shot = async (name, opts = {}) => {
    if (FONT_SCALE) {
      await zoomText();
      await wait(400);
    }
    await page.screenshot({ path: `${out}/grove-${name}-${tag}.png`, ...opts });
    console.log('shot', name, tag);
  };
  const go = async (route, ms = 2600) => {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
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
  const scrollEnd = async () => {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('div')) if (el.scrollHeight > el.clientHeight + 40 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = el.scrollHeight;
    });
    await wait(700);
  };
  // Scroll the screen's own scroller down by `px` (You is about 3.5 phone screens long).
  const scrollBy = async (px) => {
    await page.evaluate((d) => {
      for (const el of document.querySelectorAll('div')) if (el.scrollHeight > el.clientHeight + 40 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop += d;
    }, px);
    await wait(700);
  };

  // The demo learner (past the first range): Maya, an oak called Kai at Shoot, an exam date.
  await go('/home', 800);
  const now = Date.now();
  await edit(S, `v.state.displayName = 'Maya'; v.state.theme = a;`, theme);
  await edit(
    P,
    `const cp = v.state.byCert.cisa;
     cp.plant = { species: 'oak', name: 'Kai', plantedAt: a - 26 * ${DAY}, growth: 3, reached: { sprout: a - 24 * ${DAY}, shoot: a - 9 * ${DAY} } };`,
    now,
  );
  await go('/home', 1600);
  await edit(P, `const m = v.state.byCert.cisa.milestones; if (m && m.backfill) m.backfill.seen = true; if (m && m.catalogFill) m.catalogFill.seen = true;`);

  if (want('today')) {
    await go('/home');
    await shot('today-range');
    await scrollEnd();
    await shot('today-range-end');
  }
  if (want('bar')) {
    await go('/home');
    await shot('tabbar', { clip: { x: 0, y: H - 130, width: W, height: 130 } });
    await go('/learn');
    await shot('tabbar-learn', { clip: { x: 0, y: H - 130, width: W, height: 130 } });
  }
  if (want('you')) {
    // Grove You C2: the first view (profile, summary, Practice, plant chip, stats), two screens down, and the end.
    await go('/you');
    await shot('you');
    await scrollBy(H - 160);
    await shot('you-mid');
    await scrollBy(H - 160);
    await shot('you-mid2');
    await scrollEnd();
    await shot('you-end');
  }
  if (want('settings')) {
    await go('/settings');
    await shot('settings');
  }
  if (want('you')) {
    // Grove You C2, before 40 answers: "34 of 40 answers toward your first readiness range" in the summary,
    // the seed count in the readiness block, and the streak words that follow Today. The plant stays.
    await edit(
      P,
      `const cp = v.state.byCert.cisa; const keep = Object.keys(cp.answers).slice(0, 34); const ans = {}; for (const k of keep) ans[k] = cp.answers[k];
       cp.answers = ans; cp.review = {}; cp.mistakes = {}; cp.mocks = []; delete cp.mastery; delete cp.moments;`,
    );
    await edit('aurivan.session.v1', `v.state.active = null;`);
    await go('/you');
    await shot('you-before40');
  }
  if (want('today')) {
    // 10 answers, no plant yet: the seed dots and "Too few yet".
    await edit(
      P,
      `const cp = v.state.byCert.cisa; const keep = Object.keys(cp.answers).slice(0, 10); const ans = {}; for (const k of keep) ans[k] = cp.answers[k];
       cp.answers = ans; cp.review = {}; cp.mistakes = {}; cp.mocks = []; delete cp.plant; delete cp.mastery; delete cp.moments;
       v.state.streak = { current: 1, best: 1, lastDay: null, recentDays: [] };`,
    );
    await edit('aurivan.session.v1', `v.state.active = null;`);
    await go('/home');
    await shot('today-ten');
  }
  if (want('today') || want('you')) {
    // A brand-new learner: no answers, no plant, no name.
    await edit(
      P,
      `const cp = v.state.byCert.cisa; cp.answers = {}; cp.review = {}; cp.mistakes = {}; cp.mocks = []; delete cp.plant; cp.milestones = { earned: {}, backfill: { at: Date.now(), count: 0, seen: true } };
       cp.lessonsDone = []; cp.bookmarks = []; cp.notesRead = []; delete cp.notesEverRead; delete cp.moments; delete cp.mastery;
       v.state.streak = { current: 0, best: 0, lastDay: null }; v.state.days = {}; v.state.today = { day: '', answered: 0 };`,
    );
    await edit(S, `delete v.state.displayName;`);
    await edit('aurivan.session.v1', `v.state.active = null;`);
    if (want('today')) {
      await go('/home');
      await shot('today-new');
    }
    if (want('you')) {
      // Grove You C2, a new learner: "You" profile with "Add your name", the summary's first words,
      // "Practice IS Audit", "Pick your plant", "Not started" and "Starts today".
      await go('/you');
      await shot('you-new');
    }
  }
  await ctx.close();
}

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
