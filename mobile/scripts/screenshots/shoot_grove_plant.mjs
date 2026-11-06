// Grove Phase 4b, the phone plant (SHOTS=groveplant, see run.sh; design-notes/grove/phase4b/PHASE4B.md
// section 4): Your plant on paper (top, the stem, the end), at Seed and at Elder, resting and exam day,
// the quiet grew line, Look (top, middle, end), Pick (new, change plant, rename) and Today's hero
// ("Growth 4 of 6"), in light and dark (THEMES), at 100% and about 200% text (SCALES=1,2).
// Frame strips (the page clock slowed 10x, labelled with the app time): the Turning (Shoot to Bough,
// 3000 ms), its Reduce Motion cross-fade, and the stem leaf fill (300 ms) with its Reduce Motion end.
// One demo learner (F19): an oak called Kai, planted 9 days ago, Bough reached 2 days ago.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const BASE = 'http://127.0.0.1:8093';
const THEMES = (process.env.THEMES || 'light,dark').split(',').filter(Boolean);
const SCALES = (process.env.SCALES || '1,2').split(',').map(Number);
const STRIPS = process.env.STRIPS !== '0';
const W = 390;
const H = 844;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const SEEN = 'aurivan.seen.v1';
const DAY = 86_400_000;
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"], input';
const SLOW = 10;

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];

const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const GROWTH_IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'];
/** The demo oak at `growth`: planted 9 days ago, each growth a day or more apart, Bough 2 days ago. */
const plantAt = (now, growth, extra = {}) => {
  const days = { 2: 8, 3: 5, 4: 2, 5: 1, 6: 0.5 };
  const reached = {};
  for (let g = 2; g <= growth; g++) reached[GROWTH_IDS[g - 1]] = now - days[g] * DAY;
  return { species: 'oak', name: 'Kai', plantedAt: now - 9 * DAY, growth, reached, look: { style: 'botanical' }, backfill: { at: now - 9 * DAY, growth: 1, seen: true }, ...extra };
};
const FORM_OF = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };

for (const theme of THEMES) {
  for (const scale of SCALES) {
    const tag = `${theme}${scale > 1 ? `-fs${Math.round(scale * 100)}` : ''}`;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript((s) => {
      if (localStorage.getItem('__seeded')) return;
      for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
      localStorage.setItem('__seeded', '1');
    }, seed);
    if (scale > 1) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), scale);
    // The slow clock for the strips: on from the page's first frame when '__slow' is set.
    await ctx.addInitScript(() => {
      const k = Number(localStorage.getItem('__slow') || 1);
      if (k === 1) return;
      const realPerf = performance.now.bind(performance);
      const realDate = Date.now.bind(Date);
      const raf = window.requestAnimationFrame.bind(window);
      const timeout = window.setTimeout.bind(window);
      const d0 = realDate();
      performance.now = () => realPerf() * k;
      Date.now = () => d0 + (realDate() - d0) * k;
      window.requestAnimationFrame = (cb) => raf((t) => cb(t * k));
      window.setTimeout = (fn, ms, ...a) => timeout(fn, (ms || 0) / k, ...a);
    });
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
        [TEXT_RUNS, scale],
      );
    const shot = async (name) => {
      if (scale > 1) {
        await zoomText();
        await wait(400);
      }
      await page.screenshot({ path: `${out}/plant-${name}-${tag}.png` });
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
    const scrollBy = async (px) => {
      await page.evaluate((d) => {
        for (const el of document.querySelectorAll('div')) if (el.scrollHeight > el.clientHeight + 40 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop += d;
      }, px);
      await wait(700);
    };
    const scrollEnd = () => scrollBy(100000);
    const now = Date.now();
    const setPlant = (p) => edit(P, `v.state.byCert.cisa.plant = a;`, p);
    const setForms = (seen) => edit(SEEN, `v.state.plantForms = a ? { cisa: { seen: a } } : {}; v.state.plantFinal = {};`, seen);
    const setMotion = (m) => edit(S, `v.state.motion = a;`, m);

    // The demo learner: Maya, the oak Kai at Bough, two keepsakes on show (the jay, pressed 4 Nov-ish, and the lantern).
    await go('/home', 800);
    await edit(S, `v.state.displayName = 'Maya'; v.state.theme = a; v.state.motion = 'system'; v.state.badgesHidden = false;`, theme);
    await edit(
      P,
      `const cp = v.state.byCert.cisa; cp.milestones = cp.milestones || {}; cp.milestones.earned = Object.assign(cp.milestones.earned || {}, { 'long-memory:15': a - 1 * ${DAY}, 'dress-rehearsal': a - 4 * ${DAY} });
       cp.milestones.lastDay = '${dk(now)}';
       if (cp.milestones.backfill) cp.milestones.backfill.seen = true; if (cp.milestones.catalogFill) cp.milestones.catalogFill.seen = true;`,
      now,
    );
    const demo = plantAt(now, 4, { look: { style: 'botanical', keepsakes: ['jay', 'lantern'] } });
    await setPlant(demo);
    await setForms(3);

    // ── Your plant ─────────────────────────────────────────────────────
    await go('/plant');
    await shot('bough');
    await scrollBy(H - 200);
    await shot('bough-stem');
    await scrollBy(H - 200);
    await shot('bough-mid');
    await scrollEnd();
    await shot('bough-end');

    await setPlant(plantAt(now, 1));
    await setForms(1);
    await go('/plant');
    await shot('seed');
    await scrollBy(H - 200);
    await shot('seed-stem');

    await setPlant(plantAt(now, 6));
    await setForms(4);
    await go('/plant');
    await shot('elder');
    await scrollBy(H - 200);
    await shot('elder-stem');

    // Resting: no study for 5 days.
    await setPlant(demo);
    await setForms(3);
    await edit(P, `v.state.byCert.cisa.milestones.lastDay = a;`, dk(now - 5 * DAY));
    await go('/plant');
    await shot('resting');
    await edit(P, `v.state.byCert.cisa.milestones.lastDay = a;`, dk(now));
    // Exam day.
    await edit(S, `v.state.examDates = Object.assign(v.state.examDates || {}, { cisa: a });`, dk(now));
    await go('/plant');
    await shot('examday');
    await edit(S, `v.state.examDates = Object.assign(v.state.examDates || {}, { cisa: a });`, dk(now + 38 * DAY));

    // The quiet grew line: Crown reached today, first seen here.
    await setPlant(plantAt(now, 5, { pending: 5 }));
    await setForms(3);
    await go('/plant');
    await scrollBy(320);
    await shot('grew');

    // ── Look ───────────────────────────────────────────────────────────
    await setPlant(demo);
    await setForms(3);
    await go('/plant-look');
    await shot('look');
    await scrollBy(H - 360);
    await shot('look-mid');
    await scrollEnd();
    await shot('look-end');

    // ── Pick ───────────────────────────────────────────────────────────
    await go('/plant-pick?mode=species');
    await shot('pick-species');
    await scrollBy(H - 260);
    await shot('pick-species-grid');
    await go('/plant-pick?mode=name');
    await shot('pick-rename');
    await setPlant(undefined);
    await go('/plant-pick');
    await shot('pick-new');
    await setPlant(demo);

    // ── Today's hero: "Growth 4 of 6" ─────────────────────────────────
    await go('/home');
    await shot('today');

    // ── Strips (100% text only) ───────────────────────────────────────
    if (STRIPS && scale === 1) {
      const strip = async (name, title, appTimes, { route = '/plant', ready, clipY = 40, clipH = 600, viewH = H, before } = {}) => {
        await page.setViewportSize({ width: W, height: viewH });
        await go('/home', 600);
        if (before) await before();
        await page.evaluate((k) => localStorage.setItem('__slow', String(1 / k)), SLOW);
        await page.goto(BASE + route);
        await page.waitForSelector(ready, { timeout: 60_000 });
        const t0 = await page.evaluate(() => performance.now());
        const frames = [];
        for (const at of appTimes) {
          for (;;) {
            const t = await page.evaluate(() => performance.now());
            if (t - t0 >= at) break;
            await wait(15);
          }
          const appMs = Math.round((await page.evaluate(() => performance.now())) - t0);
          const png = await page.screenshot({ clip: { x: 0, y: clipY, width: W, height: clipH } });
          frames.push({ appMs, data: png.toString('base64') });
        }
        await page.evaluate(() => localStorage.removeItem('__slow'));
        await page.setViewportSize({ width: W, height: H });
        const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
        const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
        const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
          <div style="padding:10px 12px 4px">${title}</div>
          <div style="display:flex;gap:10px;padding:6px 12px 12px">${frames
            .map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${W}px;height:${clipH}px;display:block;outline:1px solid ${ink}33"></div>`)
            .join('')}</div></body></html>`;
        const p = await ctx.newPage();
        await p.setViewportSize({ width: frames.length * (W + 10) + 14, height: clipH + 64 });
        await p.setContent(html);
        await p.screenshot({ path: `${out}/plant-strip-${name}-${tag}.png`, fullPage: true });
        await p.close();
        console.log('strip', name, tag, frames.map((f) => f.appMs).join(','));
      };
      const turning = (motion) => async () => {
        await setMotion(motion);
        await setPlant(plantAt(Date.now(), 4));
        await setForms(FORM_OF[4] - 1);
      };
      await strip('turning', 'The Turning on paper, Shoot to Bough (3000 ms): the fact first, the light gathers, five even half-swaps, the bloom, the label rule (2500 to 2740), the name (2600 to 3000)', [0, 600, 1300, 1800, 2300, 2560, 2700, 3000], {
        before: turning('system'),
        ready: '[data-testid^="plant-form-reveal-"]',
        clipH: 700,
      });
      await strip('turning-reduced', 'Reduce Motion: a 120 ms cross-fade; the fact, the name and the filled leaf at once', [0, 60, 140, 400], {
        before: turning('reduced'),
        ready: '[data-testid^="plant-form-reveal-"]',
        clipH: 700,
      });
      // The leaf fill: a tall viewport so the stem is in view without a scroll.
      const grew = (motion) => async () => {
        await setMotion(motion);
        await setPlant(plantAt(Date.now(), 5, { pending: 5 }));
        await setForms(3);
      };
      await strip('leaf-fill', 'The stem leaf fill (300 ms: opacity 0 to 1, scale 0.85 to 1) with "Kai grew to Crown."', [0, 100, 200, 300, 500], {
        before: grew('system'),
        ready: '[data-testid="plant-grew"]',
        viewH: 1900,
        clipY: 760,
        clipH: 1000,
      });
      await strip('leaf-fill-reduced', 'Reduce Motion: the leaf is filled at once', [0, 150], {
        before: grew('reduced'),
        ready: '[data-testid="plant-grew"]',
        viewH: 1900,
        clipY: 760,
        clipH: 1000,
      });
      await setMotion('system');
    }
    await ctx.close();
  }
}
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 8));
await browser.close();
