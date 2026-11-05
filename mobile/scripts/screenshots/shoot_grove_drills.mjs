// Grove Phase 4b, the phone drills (SHOTS=grovedrills, see run.sh; design-notes/grove/phase4b/PHASE4B.md
// section 6): the Drills card on Practice, Call It First's intro and its folded options, a Snare Spotter
// round (step 1 with the Seedling hint, step 2, a right answer, a miss), the recap with a level-up and the
// recap of the next round (the level line with its dots), Field notes and Daylight's "Pick your light",
// in light and dark (THEMES), at 100% and about 200% text (SCALES=1,2).
// Frame strips (100% text; the page clock slowed 10x, labelled with the app time): the right-answer
// reveal and the level-up, each also under Reduce Motion (the app's own motion setting).
// The harness answers by reading the question pack (src/content/generated) for the options on screen:
// the best answer and the snare come from the item's own key and its "Final two" tip.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
const SLOW = 10;
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"], input';

// The question pack, to answer like a learner who knows the key.
const here = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.join(here, '..', '..', 'src', 'content', 'generated', 'cisa');
const bank = [];
for (const f of fs.readdirSync(packDir)) if (/^d\d\.json$/.test(f)) bank.push(...JSON.parse(fs.readFileSync(path.join(packDir, f))));
/** The snare's ORIGINAL letter, as engine/games/trapSpotter.ts trapLetter reads it. */
const snareOf = (q) => {
  const tip = q.tips.find((t) => t.startsWith('Final two:')) ?? q.tips[0] ?? '';
  const v2 = tip.match(/^Final two: \{\{([A-D])\}\} beats \{\{([A-D])\}\}/);
  if (v2) return v2[1] === q.correct ? v2[2] : null;
  if (!/trap/i.test(tip)) return null;
  for (const m of tip.matchAll(/\{\{([A-D])\}\}/g)) if (m[1] !== q.correct && q.options[m[1]]) return m[1];
  return null;
};

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];

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
    // The slow-motion switch for the page's clocks (as shoot_grove_badges.mjs).
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
      await page.screenshot({ path: `${out}/drills-${name}-${tag}.png` });
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
      await page.mouse.move(196, 500);
      await page.mouse.wheel(0, px);
      await wait(700);
    };
    const toTop = async (text, offset = 70) => {
      const el = page.getByText(text, { exact: true }).first();
      await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
      await wait(300);
      await page.mouse.move(196, 500);
      await page.mouse.wheel(0, -offset);
      await wait(700);
    };
    const button = (name) => page.getByRole('button', { name }).first();
    /** The question on screen, from the option rows' spoken names ("Option B: ..."). */
    const onScreen = async () => {
      const names = await page.locator('[role="radio"][aria-label^="Option "]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      const shown = names.map((n) => n.replace(/^Option [A-D]: /, '').replace(/, (best answer|your answer, incorrect)$/, ''));
      const q = bank.find((x) => Object.values(x.options).length === shown.length && Object.values(x.options).every((t) => shown.includes(t)));
      return q;
    };
    const tapText = async (text) => {
      const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await page.getByRole('radio', { name: new RegExp(`^Option [A-D]: ${esc}`) }).first().click();
    };
    const stripOf = async (name, title, run, appTimes, clipH = 560) => {
      await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
      const t0 = await page.evaluate(() => window.__appNow());
      await run();
      const frames = [];
      for (const at of appTimes) {
        for (;;) {
          const t = await page.evaluate(() => window.__appNow());
          if (t - t0 >= at) break;
          await wait(10);
        }
        const appMs = Math.round((await page.evaluate(() => window.__appNow())) - t0);
        frames.push({ appMs, data: (await page.screenshot({ clip: { x: 0, y: 0, width: W, height: clipH } })).toString('base64') });
      }
      await page.evaluate(() => window.__timeScale(1));
      const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
      const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
      const cols = 4;
      const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
        <div style="padding:10px 12px 4px;width:${cols * (W + 10)}px">${title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;padding:6px 12px 12px;width:${cols * (W + 10)}px">${frames
          .map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${W}px;height:${clipH}px;display:block;outline:1px solid ${ink}33"></div>`)
          .join('')}</div></body></html>`;
      const p = await ctx.newPage();
      await p.setViewportSize({ width: cols * (W + 10) + 24, height: 800 });
      await p.setContent(html);
      await p.screenshot({ path: `${out}/drills-strip-${name}-${tag}.png`, fullPage: true });
      await p.close();
      console.log('strip', name, tag, frames.map((f) => f.appMs).join(','));
    };

    // The demo learner (F19): Snare Spotter at Seedling with one strong round in a row, Root or Rumor at
    // Heartwood, Call It First at Sapling; past 50 answers so every drill is open.
    const setGames = (recent) =>
      edit(
        P,
        `const cp = v.state.byCert.cisa;
         cp.gameGrowth = { trap: { tier: 'seedling', up: 1, down: 0 }, rumor: { tier: 'heartwood', up: 0, down: 0 }, callit: { tier: 'sapling', up: 0, down: 0 } };
         cp.gameRecent = Object.assign(cp.gameRecent || {}, { trap: a });
         cp.gameBest = Object.assign(cp.gameBest || {}, { trap: 7, rumor: 10, callit: 6 });`,
        recent,
      );
    await go('/home', 800);
    await edit(S, `v.state.displayName = 'Maya'; v.state.theme = a; v.state.motion = 'system'; v.state.badgesHidden = false;`, theme);
    await setGames([3, 5, 4, 7]);

    // ── 6.1 The Drills card on Practice ─────────────────────────────────
    await go('/practice');
    await page.getByTestId('drills-card').first().evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await wait(500);
    await scrollBy(-20);
    await shot('card');
    await page.getByRole('button', { name: /^More drills/ }).first().click();
    await wait(800);
    await shot('card-more');

    // ── 6.2 The intro, and Call It First's folded options (6.3 item 8) ──
    await go('/game/callit');
    await shot('intro-callit');
    await button('Start').click();
    await wait(1400);
    await shot('callit-step1');

    // ── 6.6 Daylight's "Pick your light" ───────────────────────────────
    await go('/game/daylight');
    await shot('intro-daylight');

    // ── 6.6 Field notes ────────────────────────────────────────────────
    await go('/field-notes');
    await shot('field-notes');

    // ── 6.3 A Snare Spotter round: step 1 with the Seedling hint (a learner's first rounds) ──
    await setGames([]);
    await go('/game/trap');
    await shot('round-step1-hint');

    /**
     * One round of Snare Spotter. Question 1 right (both halves), question 2 a miss (step 1 a wrong
     * option, step 2 the snare), 3 to 5 right: 4 of 5 snares spotted, so with one strong round in a
     * row already, the round grows the level. `strips`: the right-answer and level-up strips.
     */
    const round = async ({ shots, strips, motion }) => {
      await edit(S, `v.state.motion = a;`, motion);
      await setGames([3, 5, 4, 7]);
      await go('/game/trap');
      for (let k = 0; k < 5; k++) {
        const q = await onScreen();
        if (!q) throw new Error('question not found in the pack');
        const snare = snareOf(q);
        if (k === 1) {
          const other = ['A', 'B', 'C', 'D'].find((l) => l !== q.correct && l !== snare && q.options[l]);
          await tapText(q.options[other]);
          await wait(700);
          if (shots) await shot('round-step2');
          await tapText(q.options[snare]);
          await wait(1200);
          if (shots) await shot('answer-miss');
        } else {
          await tapText(q.options[snare]);
          await wait(600);
          if (k === 0 && strips) {
            await stripOf(
              `right${motion === 'reduced' ? '-reduced' : ''}`,
              motion === 'reduced'
                ? 'Reduce Motion, a right answer: the end state at once (each block fades in over 120 ms at most), the twig leaf already filled, the same one success haptic'
                : 'A right answer (about 600 ms): the leaf springs from 0.6 at 120, the card from 200 with rows 30 ms apart, the twig leaf fills (opacity, scale 0.85 to 1, 160 ms), the score rolls over 300',
              () => tapText(q.options[q.correct]),
              [0, 60, 120, 180, 240, 320, 420, 650],
            );
            await wait(800);
          } else {
            await tapText(q.options[q.correct]);
            await wait(1200);
          }
          if (k === 0 && shots) {
            await shot('answer-right');
            await page.getByTestId('drill-card').first().evaluate((n) => n.scrollIntoView({ block: 'start' }));
            await wait(500);
            await shot('answer-right-card');
            await page.getByTestId('drill-why').first().click();
            await wait(600);
            await page.getByTestId('drill-why').first().evaluate((n) => n.scrollIntoView({ block: 'start' }));
            await wait(500);
            await shot('answer-right-why');
          }
        }
        if (k < 4) {
          await button('Next question').click();
          await wait(1200);
        }
      }
      if (strips) {
        await stripOf(
          `levelup${motion === 'reduced' ? '-reduced' : ''}`,
          motion === 'reduced'
            ? 'Reduce Motion, a level-up: the recap and the new level at once, the same words and the one light haptic'
            : 'A level-up (under 1.2 s): the recap fades in, the score rolls from blank (300 ms), then only the Sapling marker cross-fades with the leaf spring',
          () => button('See results').click(),
          [0, 120, 300, 500, 700, 850, 1000, 1250],
          620,
        );
        await wait(1500);
      } else {
        await button('See results').click();
        await wait(2400);
      }
      if (shots) {
        await shot('recap-levelup');
        await scrollBy(H - 300);
        await shot('recap-levelup-end');
        // The next round, all right: no level change, so the level line and its dots.
        await button('Play again').click();
        await wait(1400);
        for (let k = 0; k < 5; k++) {
          const q = await onScreen();
          await tapText(q.options[snareOf(q)]);
          await wait(400);
          await tapText(q.options[q.correct]);
          await wait(700);
          await button(k < 4 ? 'Next question' : 'See results').click();
          await wait(k < 4 ? 900 : 2400);
        }
        await shot('recap');
        await scrollBy(H - 300);
        await shot('recap-end');
      }
    };
    await round({ shots: true, strips: STRIPS && scale === 1, motion: 'system' });
    if (STRIPS && scale === 1) await round({ shots: false, strips: true, motion: 'reduced' });
    await edit(S, `v.state.motion = 'system';`);
    await ctx.close();
  }
}
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 8));
await browser.close();
