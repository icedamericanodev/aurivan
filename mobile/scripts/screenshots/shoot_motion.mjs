// Mobile 1.8 motion: end states of the changed screens, plus short frame
// strips of the motion itself (SHOTS=motion, see run.sh).
//
// Frame strips: the page's clock is slowed (performance.now, Date.now,
// requestAnimationFrame timestamps, setTimeout and CSS animations all run
// at 1/SLOW speed),
// so a 280 ms page turn lasts ~3 s and Playwright can catch frames in the
// middle of it. Each strip is 4 frames, labelled with the app-time in ms,
// composed side by side into one PNG.
//
// REDUCED=1 runs the same steps with the browser's Reduce Motion on (the web
// build reads prefers-reduced-motion like a phone's setting): files end in
// "-reduced", and the strips show the cross-fades that replace movement.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const SLOW = 10;
const REDUCED = process.env.REDUCED === '1';
const tag = `${theme}${REDUCED ? '-reduced' : ''}`;

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: REDUCED ? 'reduce' : 'no-preference',
});
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
// A slow-motion switch for the page's clocks (off until a strip asks for it).
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
  // Reanimated's layout animations (the calm page arrival) are CSS animations
  // on the web build, which the clock switch can't reach: slow each one as it
  // starts. (Not CDP's Animation.setPlaybackRate: it slows the rAF clock too.)
  document.addEventListener(
    'animationstart',
    (e) => {
      if (k !== 1 && e.target.getAnimations) e.target.getAnimations().forEach((a) => (a.playbackRate = k));
    },
    true,
  );
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const go = async (path, ms = 1800) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${out}/${name}-${tag}.png`, ...opts });
  console.log('shot', name);
};
const edit = (key, fn) =>
  page.evaluate(([k, src]) => {
    const v = JSON.parse(localStorage.getItem(k));
    new Function('v', src)(v);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn]);
const scrollTo = async (text, extra = 0) => {
  await page.getByText(text, { exact: true }).first().scrollIntoViewIfNeeded();
  if (extra) {
    await page.mouse.move(196, 500);
    await page.mouse.wheel(0, extra);
  }
  await wait(700);
};

// ── Frame strips ───────────────────────────────────────────────────────
/**
 * Slow the clock, run `act`, then take frames at the given APP times (ms
 * after the action). `clip` crops each frame to the part that moves.
 */
async function strip(name, titles, act, appTimes, clip) {
  // [full motion caption, Reduce Motion caption]
  const title = Array.isArray(titles) ? titles[REDUCED ? 1 : 0] : titles;
  await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
  const t0 = await page.evaluate(() => window.__appNow());
  await act();
  const frames = [];
  for (const at of appTimes) {
    // Wait (in real time) until the app clock reaches `at`.
    for (;;) {
      const now = await page.evaluate(() => window.__appNow());
      if (now - t0 >= at) break;
      await wait(15);
    }
    const appMs = Math.round((await page.evaluate(() => window.__appNow())) - t0);
    const buf = await page.screenshot(clip ? { clip } : {});
    frames.push({ appMs, data: buf.toString('base64') });
  }
  await page.evaluate(() => window.__timeScale(1));
  await compose(name, title, frames, clip);
}

/** Lay the frames side by side with their app-time labels, and save one PNG. */
async function compose(name, title, frames, clip) {
  const w = clip ? clip.width : 393;
  const h = clip ? clip.height : 852;
  const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
  const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
  const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
    <div style="padding:10px 12px 4px">${REDUCED ? 'Reduce Motion · ' : ''}${title}</div>
    <div style="display:flex;gap:10px;padding:6px 12px 12px">
    ${frames
      .map(
        (f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div>
        <img src="data:image/png;base64,${f.data}" style="width:${w}px;height:${h}px;display:block;outline:1px solid ${ink}33"></div>`,
      )
      .join('')}
    </div></body></html>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: frames.length * (w + 10) + 14, height: h + 64 });
  await p.setContent(html);
  await p.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: true });
  await p.close();
  console.log('strip', name, frames.map((f) => f.appMs).join(','));
}

// ── 1. Today: end state, the press, the tab fade ───────────────────────
await go('/home');
await shot('m01-today');
// The press: hold the Start pill (the panel lifts with it), then let go off
// the pill so it doesn't start the session.
const start = page.getByRole('button', { name: /^Start/ }).first();
const box = await start.boundingBox();
await strip(
  'f1-press',
  ['Press: hold "Start" (pill .98, panel .99), then release (spring back, no bounce)', 'Press: hold "Start": no squeeze, the pill dims, then comes back'],
  async () => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    setTimeout(async () => {
      await page.mouse.move(box.x + box.width / 2, box.y - 140);
      await page.mouse.up();
    }, 1500 * SLOW / 10);
  },
  [0, 60, 130, 260],
  { x: 0, y: 90, width: 393, height: 290 },
);
await wait(800);
// The tab fade: Today → Learn (a 200 ms fade-through; the dot pops under Learn).
await strip(
  'f4-tab-fade',
  ['Tab switch: Today → Learn, a 240 ms fade-through (out, then in; never both); the active dot pops in under Learn', 'Tab switch: Today → Learn, instant; the active dot fades in'],
  async () => {
    await page.getByRole('tab', { name: /Learn/ }).click();
  },
  [10, 70, 130, 240],
);
await wait(800);

// ── 2. You, Settings, Play, a lesson, Guided ───────────────────────────
await go('/you');
await shot('m03-you');
await scrollTo('Mock exams', 120);
await shot('m04-you-mocks');
await go('/settings');
await scrollTo('Motion', 160);
await shot('m05-settings-motion');
await go('/play');
await shot('m11-play');
await go('/lesson/cisa-l-d1-charter', 1500);
await shot('m10-lesson-first-scene');
await go('/guided');
await shot('m13-guided');
await go('/practice');
await page.getByRole('button', { name: /^Your path/ }).click();
await wait(700);
await scrollTo('Length', 120);
await shot('m12-practice-length');
// The segmented thumb slides to the new choice (a settle spring, no visible overshoot).
const fifty = page.getByRole('radio', { name: /^50 questions/ });
const fb = await fifty.boundingBox();
await strip(
  'f5-segmented-thumb',
  ['Segmented: 10 → 50 questions, one thumb slides across (settle spring)', 'Segmented: 10 → 50 questions, no slide: the choice cross-fades in place'],
  async () => {
    await fifty.click();
  },
  [20, 110, 200, 520],
  { x: 0, y: Math.max(0, fb.y - 60), width: 393, height: fb.height + 150 },
);
await wait(800);
// Reopening with 50 chosen: the thumb is drawn in place from its first frame
// (it used to fly in from the left every time a control mounted).
await page.getByRole('button', { name: /^Your path/ }).click();
await wait(900);
// A taller window for this strip only, so Length opens on screen (the closed
// page is too short to scroll it there first).
await page.setViewportSize({ width: 393, height: 1300 });
await wait(700);
await strip(
  'f5b-segmented-reopen',
  ['Reopen "Your path" with 50 chosen: the thumb is already on 50 (nothing slides until you choose)', 'Reopen "Your path" with 50 chosen: the choice is simply there'],
  async () => {
    await page.getByRole('button', { name: /^Your path/ }).click();
  },
  [30, 140, 300, 600],
  { x: 0, y: 640, width: 393, height: 560 },
);
await page.setViewportSize({ width: 393, height: 852 });
await wait(500);
// Put the length back, so later shots match the seed.
await page.getByRole('radio', { name: /^10 questions/ }).click();
await wait(600);

// ── 3. The answer loop ─────────────────────────────────────────────────
const keys = (seed.__shotKeys || 'D').split(',');
await go('/session', 1500);
await page.getByRole('button', { name: 'Coach me', exact: true }).click();
await wait(900);
await shot('m07-coach-wash');
// Select: press an option, let go: it eases back and the ink ring fades in.
const opt = page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first();
await opt.scrollIntoViewIfNeeded();
await wait(400);
const ob = await opt.boundingBox();
await strip(
  'f0-select',
  ['Select an option: press (.98), release; the ink ring and badge cross-fade in (120 ms)', 'Select an option: no squeeze (a dim); the ink ring and badge cross-fade in (120 ms)'],
  async () => {
    await page.mouse.move(ob.x + ob.width / 2, ob.y + ob.height / 2);
    await page.mouse.down();
    setTimeout(() => page.mouse.up(), 900);
  },
  [40, 110, 160, 330],
  { x: 0, y: Math.max(0, ob.y - 30), width: 393, height: Math.min(260, ob.height + 120) },
);
await wait(600);
await shot('m06-question-selected');
// Check: the verdict leaf springs, the first segment fills from its left edge.
await strip(
  'f3-segment-fill',
  ['Check answer: the segment fills from the left (300 ms) as the verdict leaf springs in', 'Check answer: the segment fades in, the verdict leaf fades in; nothing grows'],
  async () => {
    await page.getByText('Check answer', { exact: true }).click();
  },
  [20, 100, 190, 420],
  { x: 0, y: 0, width: 393, height: 230 },
);
await wait(1200);
await shot('m08-answer-assisted');
// Next: the page turn.
// Read to the end of the answer first, so the turn also shows the scroll reset.
await page.getByText('Report a problem', { exact: true }).first().scrollIntoViewIfNeeded();
await wait(800);
await shot('m15-answer-bottom');
await strip(
  'f2-page-turn',
  [
    'Next question: the answer drifts out left (120 ms), the new question arrives from the right (280 ms); the footer changes WITH the page',
    'Next question: no drift, no wait: the new question fades in (120 ms), its footer with it',
  ],
  async () => {
    await page.getByText('Next question', { exact: true }).click();
  },
  [50, 115, 220, 480],
);
await wait(1000);
await shot('m14-next-question');
for (let q = 1; q < keys.length; q++) {
  await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await wait(900);
  const label = q < keys.length - 1 ? 'Next question' : 'See results';
  await page.getByText(label, { exact: true }).click();
  await wait(1400);
}
await wait(1200);
await shot('m09-results-single-domain');
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 500);
await wait(700);
await shot('m09b-results-single-domain-stats');

// ── 3b. A mock turns calmly: a short fade, no drift (a timed exam should feel like the real test) ──
await go('/mock-start?questions=3', 1500);
await page.getByText('Start mock', { exact: true }).click();
await wait(1500);
await page.getByLabel(/^Option A:/).first().click();
await wait(600);
await strip(
  'f6-mock-turn',
  ['Mock: Next is a 120 ms fade, no drift and no wait; the footer is the new question’s at once', 'Mock: the same 120 ms fade (mocks are calm either way)'],
  async () => {
    await page.getByText('Next', { exact: true }).click();
  },
  [15, 50, 90, 200],
);
await wait(800);
await shot('m16-mock-question');
// Leave the live mock before clearing it, so its screen can't write it back.
await go('/you', 800);

// ── 4. Today with the exam-ready panel: one set of rings, not two ──────
const keyIn = (n) => `(() => { const d = new Date(); d.setDate(d.getDate() + (${n}));
  const p = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })()`;
await edit('aurivan.session.v1', 'v.state.active = null;');
await edit('aurivan.progress.v1', `
  const cp = v.state.byCert.cisa;
  Object.keys(cp.answers).forEach((id, i) => { const ok = i % 10 !== 0; cp.answers[id] = { ...cp.answers[id], lastCorrect: ok, correctCount: ok ? 1 : 0 }; });
  const log = []; for (let k = 6; k >= 0; k--) { const day = ${keyIn('-k')}; log.push({ day, min: 86, last: 86 }); }
  cp.moments = { readiness: log };
  if (v.state.days) delete v.state.days.cisa;`);
await go('/home', 2400);
await shot('m02-today-exam-ready');
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 420);
await wait(700);
await shot('m02b-today-exam-ready-scrolled');

console.log('errors:', errs.slice(0, 5));
await browser.close();
