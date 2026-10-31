// Mobile 1.9 "progress you can see" (SHOTS=growth, see run.sh): end states of
// Today (normal, cleared, exam-ready, exam eve), Results, You, Badges
// (/milestones), every new empty state, the bank grouping and a page sheet;
// plus slow-motion frame strips of a number roll (Today's scale bar), Results'
// growth plate (Fig. 6), the Today clearing, the badge moment, the theme fade
// (Settings → Appearance → Theme) and You's growth since the last look.
//
// The clock tricks are shoot_motion.mjs's: the page's clocks run at 1/SLOW
// speed during a strip, so a 600 ms roll lasts ~6 s and frames land inside
// it; each strip is 4 frames labelled with app-time, side by side in one PNG.
// Growth plays when a screen comes into VIEW, so most strips start with a
// tab tap (Today or You mounting) after the "last seen" numbers were set
// lower in the seen store (localStorage), exactly like a learner coming back.
//
// REDUCED=1 runs it with the browser's Reduce Motion on (files end "-reduced").
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
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const SEEN = 'aurivan.seen.v1';
const DAY = 86400000;

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
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
// The slow-motion switch for the page's clocks (see shoot_motion.mjs).
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
const go = async (path, ms = 2200) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${out}/${name}-${tag}.png`, ...opts });
  console.log('shot', name);
};
/** Edit one saved store in localStorage (the app reads it on the next load). */
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
const read = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
const dayKey = (ms) => {
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const scrollBy = async (dy) => {
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, dy);
  await wait(700);
};
const tab = (name) => page.getByRole('tab', { name: new RegExp(name) }).click();

// ── Frame strips ───────────────────────────────────────────────────────
async function strip(name, titles, act, appTimes, clip) {
  const title = Array.isArray(titles) ? titles[REDUCED ? 1 : 0] : titles;
  await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
  const t0 = await page.evaluate(() => window.__appNow());
  await act();
  const frames = [];
  for (const at of appTimes) {
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

// ── 1. Today and You, as they open ─────────────────────────────────────
await go('/home', 2600);
await shot('p01-today');
// Today's readiness (mobile 1.51: the scale bar, no rings), measured now: f1's frames are clipped round it.
const readyTap = page.getByTestId('readiness-tap').first();
const readyBox = (await readyTap.count()) ? await readyTap.boundingBox() : null;
const readyClip = readyBox
  ? { x: 0, y: Math.max(0, Math.round(readyBox.y) - 40), width: 393, height: Math.round(readyBox.height) + 80 }
  : { x: 0, y: 330, width: 393, height: 290 };
await go('/you', 2600);
await shot('p06-you');

// ── 2. A number roll: Today after a session, coming back from You ──────
// The range was lower when Today was last seen (Today draws it on the scale bar; it has no rings).
await edit(SEEN, `
  const s = v.state; s.values = s.values || {};
  const r = s.values['today:range:cisa']; if (r) s.values['today:range:cisa'] = r.map((x) => x - 5);`);
await go('/you', 2200);
await strip(
  'f1-number-roll',
  [
    'Back on Today after a session: the scale bar’s band and bracket slide up from the range you last saw while the numeral rolls (digits finish right to left); the ruler stays still',
    'Back on Today after a session: no roll, no slide: the finished bar with the new range',
  ],
  async () => {
    await tab('Today');
  },
  [60, 330, 560, 1000],
  readyClip,
);
await wait(1200);

// ── 3. Results' growth plate and the badge moment: finishing a session ─
// A milestone waits in the queue, so this session's Results gets its moment.
const now = Date.now();
await edit(P, `
  v.state.byCert.cisa.milestones = { earned: { 'rooted:10': a - 86400000 }, queue: ['rooted:10'], backfill: { at: a - 86400000, count: 0, seen: true }, days: 12, lastDay: '2000-01-01' };`, now);
const keys = (seed.__shotKeys || 'D').split(',');
// A shorter phone, so the moment starts below the stats and waits to be scrolled to.
await page.setViewportSize({ width: 393, height: 520 });
await go('/session', 1800);
for (let q = 0; q < keys.length; q++) {
  await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await wait(900);
  if (q < keys.length - 1) {
    await page.getByText('Next question', { exact: true }).click();
    await wait(1400);
  }
}
// Mobile 1.51: Results has no rings; Fig. 6 (the areas this set asked about) traces in. The seeded set is
// three Domain 1 questions: one stem, no "before" snapshot (so 'trace', not 'growth'), and under 8 answers
// so no Score row (results.tsx:262, 389): the headline is the count, which does not roll.
await strip(
  'f2-plate-growth',
  [
    'See results: the screen dissolves in, then Fig. 6 traces in: the stem of the one area this set asked about draws up from the soil, then its number settles in',
    'See results: the screen dissolves in; the plate is simply there (no growth)',
  ],
  async () => {
    await page.getByText('See results', { exact: true }).click();
  },
  [200, 560, 820, 1400],
  { x: 0, y: 0, width: 393, height: 520 },
);
await wait(1500);
// The badge moment sits under the stats: it plays when scrolled into view. Its caption is
// "A new badge · <set>", or, past three full moments this week, the quiet "New in your badges: <badge>".
const moment = page.getByText(/^(A new badge · |New in your badges: )/).first();
await strip(
  'f4-milestone-moment',
  [
    'Scroll to the new badge: the medallion presses in, its rim catches the light once and its emblem fills, while six leaves drift down its own column (≤ 1.2 s; a tap or scroll ends it)',
    'Scroll to the new badge: it is simply there, with the same words (no leaves, no press)',
  ],
  async () => {
    // An instant scroll that puts the moment mid-screen (a wheel scroll can stop short).
    await moment.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  },
  [120, 420, 760, 1250],
  { x: 0, y: 140, width: 393, height: 380 },
);
await wait(1500);
// Back to a full phone for the end states.
await page.setViewportSize({ width: 393, height: 852 });
await wait(600);
await scrollBy(-3000);
await shot('p05-results');
await scrollBy(Math.max(0, (await moment.boundingBox()).y - 260));
await shot('p07-results-milestone');
// A page sheet (raised2, mobile 1.9): "Something not working? Report a bug".
await page.getByText('Something not working? Report a bug', { exact: true }).scrollIntoViewIfNeeded();
await wait(500);
await page.getByText('Something not working? Report a bug', { exact: true }).click();
await wait(1400);
await shot('p16-sheet');
await page.getByRole('button', { name: 'Close' }).first().click();
await wait(800);
await page.getByText('Done', { exact: true }).click();
await wait(1500);

// ── 4. The Today clearing (T2) ─────────────────────────────────────────
// Every plan item done, not yet celebrated; readiness lower this morning.
await go('/home', 2200);
await edit(P, `
  const d = v.state.days.cisa;
  d.done = d.done.map(() => true); d.celebrated = false;
  d.answered = 31; d.correct = 25; d.minutes = 24;
  for (const k of Object.keys(d.start.domains)) d.start.domains[k] = Math.max(0, d.start.domains[k] - 0.08);
  d.start.score = Math.max(0, d.start.score - 0.05);`);
await go('/you', 2200);
await strip(
  'f3-today-clearing',
  [
    'Back on Today, the plan done: the day’s numbers roll up, the mini stem grows from this morning’s readiness, then “grew to” fades in (≤ 1.2 s, a tap ends it)',
    'Back on Today, the plan done: the clearing is simply there, with the same words',
  ],
  async () => {
    await tab('Today');
  },
  [80, 420, 760, 1250],
  { x: 0, y: 90, width: 393, height: 560 },
);
await wait(1500);
await shot('p02-today-cleared');

// ── 5. You: growth since the last look, and the theme fade ─────────────
// Mobile 1.51: You's areas are Fig. 5 (one stem per area, "↑6" on what rose) and the stats are ruled rows
// (Answered, Accuracy, Streak), both below the study profile and the scale bar: a taller window keeps
// them on screen for the strip, measured on a direct visit (tabs stay mounted, so not mid-switch).
await page.setViewportSize({ width: 393, height: 1500 });
await go('/you', 2400);
const areasBox = await page.getByTestId('areas-plate').boundingBox();
const statsBox = await page.getByTestId('you-stats').boundingBox();
const youTop = Math.max(0, Math.round(areasBox.y) - 10);
const youClip = { x: 0, y: youTop, width: 393, height: Math.min(1500 - youTop, Math.round(statsBox.y + statsBox.height - youTop) + 16) };
await go('/home', 2200);
await edit(SEEN, `
  const s = v.state; s.values = s.values || {};
  const g = s.values['you:rings:cisa']; if (g) s.values['you:rings:cisa'] = g.map((x, i) => (i % 2 ? x : Math.max(0, x - 6)));
  const t = s.values['you:stats:cisa']; if (t) s.values['you:stats:cisa'] = [Math.max(0, t[0] - 12), t[1], t[2]];`);
await go('/home', 2200);
await strip(
  'f6-you-growth',
  [
    'You, after a session: in Fig. 5 the areas that rose grow from where you last saw them, then a quiet "↑6" beside each and one "Since you last looked" line; "Answered" rolls up',
    'You, after a session: the new values are simply there; the "↑6" tags and the line still say what changed',
  ],
  async () => {
    await tab('You');
  },
  [80, 420, 760, 1300],
  youClip,
);
await wait(1500);
// Back to a full phone, Fig. 5 at the top: the end state of the growth.
await page.setViewportSize({ width: 393, height: 852 });
await wait(600);
await page.getByTestId('areas-plate').evaluate((el) => el.scrollIntoView({ block: 'start' }));
await scrollBy(-40);
await shot('p06b-you-growth');
// The theme lives only in Settings → Appearance → Theme (mobile 1.43): a System / Light / Dark radio group
// at the top of Settings, each radio named by its word alone (no "appearance" switch on You any more).
await go('/settings', 2200);
const other = theme === 'dark' ? 'Light' : 'Dark';
await strip(
  'f5-theme-fade',
  [
    `Switch to ${other}: the old paper fades out over the new theme (240 ms) instead of flashing`,
    `Switch to ${other}: the same dissolve, shorter (120 ms, opacity only)`,
  ],
  async () => {
    await page.getByRole('radio', { name: other, exact: true }).click();
  },
  [10, 60, 130, 300],
  { x: 0, y: 0, width: 393, height: 420 },
);
await wait(800);
await page.getByRole('radio', { name: theme === 'dark' ? 'Dark' : 'Light', exact: true }).click();
await wait(800);

// ── 6. Exam-ready, and the exam eve ────────────────────────────────────
await edit(P, `
  const cp = v.state.byCert.cisa;
  Object.keys(cp.answers).forEach((id, i) => { const ok = i % 10 !== 0; cp.answers[id] = { ...cp.answers[id], lastCorrect: ok, correctCount: ok ? 1 : 0 }; });
  const log = []; for (let k = 6; k >= 0; k--) { const d = new Date(Date.now() - k * 86400000); const p = (x) => String(x).padStart(2, '0'); log.push({ day: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), min: 86, last: 86 }); }
  cp.moments = { readiness: log };
  if (v.state.days) delete v.state.days.cisa;`);
await go('/home', 2800);
await shot('p03-today-exam-ready');
const examWas = (await read(S)).state.examDates.cisa;
await edit(S, `v.state.examDates.cisa = a;`, dayKey(Date.now() + DAY));
await go('/home', 2800);
await shot('p04-today-exam-eve');
await scrollBy(380);
await shot('p04b-today-exam-eve-scrolled');
await edit(S, `v.state.examDates.cisa = a;`, examWas);

// ── 7. Badges (/milestones): badges earned since the last look press in ─
// Mobile 1.10+: "new" is every badge earned after the case was last opened (seen store caseSeen), and the
// "Still to collect" bars grow from what was last seen under badges:next:<cert>:<their keys>.
await go('/milestones', 600);
await go('/home', 1200);
await edit(SEEN, `
  const s = v.state; s.values = s.values || {}; s.caseSeen = s.caseSeen || {};
  s.caseSeen.cisa = 0;
  for (const k of Object.keys(s.values)) if (k.startsWith('badges:next:cisa:')) s.values[k] = s.values[k].map((x) => Math.max(0, x - 25));`);
await go('/milestones', 2600);
await shot('p08-milestones');
// "Closest next" became "Still to collect · for your exam" (mobile 1.51): the same panel of the nearest badges.
await page.getByTestId('still-to-collect').evaluate((el) => el.scrollIntoView({ block: 'start' }));
await wait(700);
await shot('p08b-milestones-closest');

// ── 8. Empty states, each with its own drawing ─────────────────────────
await edit(P, `
  const cp = v.state.byCert.cisa; const t = Date.now();
  let i = 0; for (const id of Object.keys(cp.review)) { cp.review[id].dueAt = t + (i++ % 3 === 0 ? 1 : 3) * 86400000; }
  for (const id of Object.keys(cp.mistakes)) cp.mistakes[id].resolved = true;`);
await go('/caught-up');
await shot('p09-empty-caught-up');
await go('/saved');
await shot('p10-empty-saved');
await go('/mistakes');
await shot('p11-empty-mistakes');
await go('/reports');
await shot('p12-empty-reports');
await go('/bank/1');
await page.getByText('Saved', { exact: true }).first().click();
await wait(800);
await shot('p13-empty-bank-saved');
await go('/notes');
await page.locator('input').first().fill('zzqx');
await wait(900);
await shot('p14-empty-notes-search');
await go('/you', 2400);
await page.getByText('Mock exams', { exact: true }).scrollIntoViewIfNeeded();
await scrollBy(200);
await shot('p15-you-no-mocks');

// ── 9. The bank, grouped (a header only for topics with 2+ rows) ───────
await go('/bank/5');
await shot('p17-bank-grouping');
// Down to the first topic header (a topic with 2+ rows), with the lone row after its group.
// The screen's own headings (the bar title, the domain name) are left out by their text.
const ownHeads = await page.$$eval('[role="heading"]', (els) => els.map((e) => e.textContent));
const topicHead = async () =>
  page.evaluateHandle((own) => [...document.querySelectorAll('[role="heading"]')].find((e) => !own.includes(e.textContent)) ?? null, ownHeads);
// The list's own scroller, moved directly (a wheel over a virtualised list can stop short).
const listScroll = (dy) =>
  page.evaluate((d) => {
    const el = [...document.querySelectorAll('div')].find((x) => x.scrollHeight > x.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(x).overflowY));
    if (el) el.scrollTop += d;
  }, dy);
for (let k = 0; k < 80; k++) {
  if (await (await topicHead()).evaluate((e) => e !== null)) break;
  await listScroll(400);
  await wait(250);
}
await (await topicHead()).evaluate((el) => el.scrollIntoView({ block: 'start' }));
await scrollBy(-120);
await wait(800);
await shot('p17b-bank-group-header');

console.log('errors:', errs.slice(0, 5));
await browser.close();
