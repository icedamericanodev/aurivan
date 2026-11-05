// Grove Phase 4b, the phone badges (SHOTS=grovebadges, see run.sh; design-notes/grove/phase4b/PHASE4B.md
// section 5): the case (top, set cards with their planter lines, Stretch, Field notes), a sheet earned
// (with the vignette) and not yet, the share panel, the after-exam album, You's badge shelf and the
// unlock on Results, in light and dark (THEMES), at 100% and about 200% text (SCALES=1,2).
// Frame strips (100% text; the page clock slowed 10x, labelled with the app time): the press on
// Results (1080 ms) and its Reduce Motion end state.
// One demo learner (F19): Maya, the oak Kai at Bough, the jay and the lantern on show.
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
const SLOW = 10;
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"], input';

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const GROWTH_IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'];
const plantAt = (now, growth, extra = {}) => {
  const days = { 2: 8, 3: 5, 4: 2, 5: 1, 6: 0.5 };
  const reached = {};
  for (let g = 2; g <= growth; g++) reached[GROWTH_IDS[g - 1]] = now - days[g] * DAY;
  return { species: 'oak', name: 'Kai', plantedAt: now - 9 * DAY, growth, reached, look: { style: 'botanical', keepsakes: ['jay', 'lantern'] }, backfill: { at: now - 9 * DAY, growth: 1, seen: true }, ...extra };
};

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
    // The slow-motion switch for the page's clocks (as shoot_badges.mjs).
    await ctx.addInitScript(() => {
      const realPerf = performance.now.bind(performance);
      const realDate = Date.now.bind(Date);
      const raf = window.requestAnimationFrame.bind(window);
      const timeout = window.setTimeout.bind(window);
      let k = 1;
      let r0 = realPerf();
      let v0 = r0;
      let d0 = realDate();
      let dv0 = d0;
      const vPerf = (r) => v0 + (r - r0) * k;
      performance.now = () => vPerf(realPerf());
      Date.now = () => dv0 + (realDate() - d0) * k;
      window.requestAnimationFrame = (cb) => raf((t) => cb(vPerf(t)));
      window.setTimeout = (fn, ms, ...a) => timeout(fn, (ms || 0) / k, ...a);
      window.__timeScale = (next) => {
        const r = realPerf();
        v0 = vPerf(r);
        r0 = r;
        const d = realDate();
        dv0 = Date.now();
        d0 = d;
        k = next;
      };
      window.__appNow = () => performance.now();
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
      await page.screenshot({ path: `${out}/badges-${name}-${tag}.png` });
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
    /** Bring a text to the top of the screen (an instant scroll; a wheel can stop short). */
    const toTop = async (text, offset = 70) => {
      const el = page.getByText(text, { exact: true }).first();
      await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
      await wait(300);
      await page.mouse.move(196, 500);
      await page.mouse.wheel(0, -offset);
      await wait(700);
    };
    const scrollBy = async (px) => {
      await page.mouse.move(196, 500);
      await page.mouse.wheel(0, px);
      await wait(700);
    };
    const pressLabel = async (re) => {
      await page.getByRole('button', { name: re }).first().click();
      await wait(1400);
    };
    const now = Date.now();

    // The demo learner: Maya, Kai the oak at Bough with the jay and the lantern on show; Groundwork
    // complete, Long Memory's Clay tier and Took Root pressed, Firm Footing IS Audit pressed today.
    await go('/home', 800);
    await edit(S, `v.state.displayName = 'Maya'; v.state.theme = a; v.state.motion = 'system'; v.state.badgesHidden = false; v.state.examDates = Object.assign(v.state.examDates || {}, { cisa: '${dk(now + 38 * DAY)}' });`, theme);
    await edit(
      P,
      `const cp = v.state.byCert.cisa; cp.plant = a.plant; cp.milestones = cp.milestones || {};
       cp.milestones.earned = Object.assign(cp.milestones.earned || {}, { 'first-foothold': a.now - 20 * ${DAY}, 'topic-clear': a.now - 12 * ${DAY}, 'ten-topics': a.now - 4 * ${DAY}, 'long-memory': a.now - 3 * ${DAY}, 'took-root': a.now - 2 * ${DAY}, 'rooted:10': a.now - 5 * ${DAY}, 'firm-footing:3': a.now - 1 * ${DAY} });
       cp.milestones.planters = Object.assign(cp.milestones.planters || {}, { groundwork: a.now - 4 * ${DAY} });
       cp.milestones.lastDay = '${dk(now)}'; cp.milestones.queue = [];
       if (cp.milestones.backfill) cp.milestones.backfill.seen = true; if (cp.milestones.catalogFill) cp.milestones.catalogFill.seen = true;`,
      { now, plant: plantAt(now, 4) },
    );
    await edit(SEEN, `v.state.caseSeen = { cisa: a }; v.state.badgeSort = 'set';`, now);

    // ── The case ───────────────────────────────────────────────────────
    await go('/milestones');
    await shot('case-top');
    await toTop('Groundwork');
    await shot('case-groundwork');
    await toTop('Evergreen');
    await shot('case-evergreen');
    await toTop('Rooted');
    await shot('case-rooted');
    await toTop('Field notes');
    await shot('case-fieldnotes');

    // ── The sheet ──────────────────────────────────────────────────────
    await go('/milestones', 2000);
    await toTop('Evergreen');
    await pressLabel(/^Long Memory · 25 recalls, Clay\. Earned/);
    await shot('sheet-earned');
    await scrollBy(H - 260);
    await shot('sheet-earned-end');
    await go('/milestones', 2000);
    await toTop('Evergreen');
    await pressLabel(/^Long Memory · 75 recalls, Lichen\. Not yet/);
    await shot('sheet-notyet');
    await go('/milestones', 2000);
    await toTop('Groundwork');
    await pressLabel(/^First Foothold\. Earned/);
    await page.getByRole('button', { name: /^Share this badge: / }).first().click();
    await wait(1200);
    await shot('share');

    // ── You's shelf ────────────────────────────────────────────────────
    await go('/you', 2600);
    await page.getByTestId('badge-shelf').first().evaluate((n) => n.scrollIntoView({ block: 'center' }));
    await wait(600);
    await shot('you-shelf');

    // ── The album (after the exam) ─────────────────────────────────────
    await edit(S, `v.state.examDates = Object.assign(v.state.examDates || {}, { cisa: a });`, dk(now - 3 * DAY));
    await go('/milestones');
    await shot('album');
    await edit(S, `v.state.examDates = Object.assign(v.state.examDates || {}, { cisa: a });`, dk(now + 38 * DAY));

    // ── Results: the unlock, its end state, and the strips ─────────────
    // The seed's session, put back before each run (finishing it on Results uses it up).
    const SESSION = 'aurivan.session.v1';
    const results = async (motion) => {
      await page.evaluate(([k, v]) => (v ? localStorage.setItem(k, v) : null), [SESSION, seed[SESSION]]);
      await edit(S, `v.state.motion = a;`, motion);
      await edit(P, `const m = v.state.byCert.cisa.milestones; m.earned['graduate'] = a - 60000; m.queue = ['graduate'];`, Date.now());
      await edit(SEEN, `v.state.badgeMoments = []; v.state.moments = {};`);
      const keys = (seed.__shotKeys || 'D').split(',');
      await go('/session', 1800);
      for (let q = 0; q < keys.length; q++) {
        await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
        await page.getByText('Check answer', { exact: true }).click();
        await wait(900);
        await page.getByText(q < keys.length - 1 ? 'Next question' : 'See results', { exact: true }).click();
        await wait(1400);
      }
      await wait(1600);
    };
    const strip = async (name, title, appTimes) => {
      const moment = page.getByText(/^A new badge · /).first();
      // The block sits under the review actions: scroll it to the middle, then the press plays.
      await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
      const t0 = await page.evaluate(() => window.__appNow());
      await moment.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const frames = [];
      for (const at of appTimes) {
        for (;;) {
          const t = await page.evaluate(() => window.__appNow());
          if (t - t0 >= at) break;
          await wait(15);
        }
        const appMs = Math.round((await page.evaluate(() => window.__appNow())) - t0);
        const box = await moment.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { y: r.top };
        });
        const clip = { x: 0, y: Math.max(0, box.y - 30), width: W, height: 200 };
        frames.push({ appMs, data: (await page.screenshot({ clip })).toString('base64') });
      }
      await page.evaluate(() => window.__timeScale(1));
      const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
      const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
      const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
        <div style="padding:10px 12px 4px">${title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;padding:6px 12px 12px;width:${4 * (W + 10)}px">${frames
          .map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${W}px;height:200px;display:block;outline:1px solid ${ink}33"></div>`)
          .join('')}</div></body></html>`;
      const p = await ctx.newPage();
      await p.setViewportSize({ width: 4 * (W + 10) + 24, height: 600 });
      await p.setContent(html);
      await p.screenshot({ path: `${out}/badges-strip-${name}-${tag}.png`, fullPage: true });
      await p.close();
      console.log('strip', name, tag, frames.map((f) => f.appMs).join(','));
    };
    if (STRIPS && scale === 1) {
      await results('system');
      await strip('press', 'The press on Results (done by 1080 ms): the pencilled mount, glassine over the cream tile (120), pressed flat 1.06 to 1 with one success tap (320), the glassine lifts (560), tape (760, 960)', [40, 200, 380, 560, 700, 840, 1000, 1150]);
      await wait(1500);
      await shot('results-unlock');
      await results('reduced');
      await strip('press-reduced', 'Reduce Motion: the taped tile at once, the block fades in over 120 ms, the words never move', [40, 160, 600, 1150]);
      await edit(S, `v.state.motion = 'system';`);
    } else {
      await results('reduced');
      const moment = page.getByText(/^A new badge · /).first();
      await moment.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await wait(1200);
      await shot('results-unlock');
      await edit(S, `v.state.motion = 'system';`);
    }
    await ctx.close();
  }
}
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 8));
await browser.close();
