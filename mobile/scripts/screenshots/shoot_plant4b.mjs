// Mobile 1.14 "Dress and Alive" (SHOTS=plant runs this after shoot_plant.mjs;
// see run.sh). The plant's look and motion:
//
// Shots: the Look screen (top, each section, locked choices), Your plant
// and Today dressed, each mood, planters and keepsakes on three species,
// the badge sheet's quiet line, and a plant just planted from "Plant yours"
// (onboarding's planting moment was removed in mobile 1.24).
// Frame strips (FULL motion, the page clock slowed 10×, labelled with the
// app time): the Breathe burst, a reaction and the growth sequence.
// REDUCED=1 runs the same with Reduce Motion on: the
// strips then show the end state at once.
// NARROW=1 uses a 360-wide phone; FONT_SCALE=2 approximates 200% text.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const NARROW = process.env.NARROW === '1';
const REDUCED = process.env.REDUCED === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const STRIPS = process.env.STRIPS !== '0' && !NARROW && !FONT_SCALE;
const SLOW = 10;
const tag = `${theme}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}${REDUCED ? '-reduced' : ''}`;
const P = 'aurivan.progress.v1';
const S = 'aurivan.settings.v1';
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const DAY = 86_400_000;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
// A slow-motion switch for the page's clocks (shoot_motion.mjs), off until a strip asks for it.
await ctx.addInitScript(() => {
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now.bind(Date);
  const raf = window.requestAnimationFrame.bind(window);
  const timeout = window.setTimeout.bind(window);
  // A strip that loads a new page asks for slow motion from the page's first frame.
  let k = Number(sessionStorage.getItem('__slow')) || 1;
  sessionStorage.removeItem('__slow');
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
const go = async (path, ms = 2400) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await wait(ms);
};
const shot = async (name, opts = {}) => {
  if (FONT_SCALE) {
    await zoomText();
    await wait(400);
  }
  await page.screenshot({ path: `${out}/${name}-${tag}.png`, ...opts });
  console.log('shot', name);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
const toTop = async (text, offset = 90) => {
  if (FONT_SCALE) await zoomText();
  const el = page.getByText(text, { exact: true }).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H * 0.7);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};
const setPlant = (plant) => edit(P, `v.state.byCert.cisa.plant = a; if (!a) delete v.state.byCert.cisa.plant;`, plant);
const setPlantSettings = (s) => edit(P, `v.state.plantSettings = a;`, s);
const setEarned = (earned, planters) =>
  // The demo's own badges are aged a week, so only the ones given here can be "new today" (a proud plant).
  edit(P, `const m = v.state.byCert.cisa.milestones || { earned: {} }; const old = {}; for (const k of Object.keys(m.earned || {})) old[k] = Math.min(m.earned[k], a[2]); m.earned = Object.assign(old, a[0]); m.planters = Object.assign({}, m.planters, a[1]); v.state.byCert.cisa.milestones = m;`, [earned, planters, now - 7 * DAY]);
const setLastDay = (day) => edit(P, `const m = v.state.byCert.cisa.milestones || { earned: {} }; m.lastDay = a; v.state.byCert.cisa.milestones = m;`, day);
/** Today's plan, cleared or not (the visitor comes on a cleared day; the plant is happy). */
const setPlanCleared = (cleared) =>
  edit(
    P,
    `const d = v.state.days && v.state.days.cisa; if (!d) return; d.day = a[0]; d.done = d.done.map(() => a[1]); d.celebrated = true;`,
    [dk(now), cleared],
  );
/**
 * A new topic opened today (curious): one subtopic first answered today. The
 * demo seed may hold no mastery at all, so the entry is created when needed
 * (PR #44 UX review P3: the old helper only edited an existing one, so q03's
 * "curious" cell showed idle).
 */
const setNewTopic = (on) =>
  edit(
    P,
    `const m = v.state.byCert.cisa.mastery || {}; const keys = Object.keys(m); if (a) { const k = keys[0] || 'Project Charter & Sponsor Authority'; m[k] = Object.assign({ firstAt: Date.now() }, m[k], { firstDay: a }); } else { for (const k of keys) m[k] = Object.assign({}, m[k], { firstDay: '2020-01-01' }); } v.state.byCert.cisa.mastery = m;`,
    on ? dk(now) : null,
  );

// ── Frame strips ───────────────────────────────────────────────────────
async function strip(name, title, act, appTimes, clip, nav = false) {
  // `nav`: the action loads a new page, so its clock starts slow and counts from navigation (t0 = 0).
  if (nav) await page.evaluate((s) => sessionStorage.setItem('__slow', String(1 / s)), SLOW);
  else await page.evaluate((s) => window.__timeScale(1 / s), SLOW);
  const t0 = nav ? 0 : await page.evaluate(() => window.__appNow());
  await act();
  const frames = [];
  for (const at of appTimes) {
    for (;;) {
      // A page still loading has no clock yet: keep waiting.
      const nowApp = await page.evaluate(() => (window.__appNow ? window.__appNow() : -1)).catch(() => -1);
      if (nowApp >= 0 && nowApp - t0 >= at) break;
      await wait(15);
    }
    const appMs = Math.round((await page.evaluate(() => window.__appNow())) - t0);
    const buf = await page.screenshot(clip ? { clip } : {});
    frames.push({ appMs, data: buf.toString('base64') });
  }
  await page.evaluate(() => window.__timeScale(1));
  await compose(name, `${REDUCED ? 'Reduce Motion · ' : ''}${title}`, frames, clip);
}
/** Lay the frames (or labelled cells) side by side, and save one PNG. */
async function compose(name, title, frames, clip, labels) {
  const w = clip ? clip.width : W;
  const h = clip ? clip.height : H;
  const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
  const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
  const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
    <div style="padding:10px 12px 4px">${title}</div>
    <div style="display:flex;gap:10px;padding:6px 12px 12px;flex-wrap:wrap">
    ${frames
      .map(
        (f, i) => `<div><div style="padding:0 0 4px">${labels ? labels[i] : `${i + 1} · ${f.appMs} ms`}</div>
        <img src="data:image/png;base64,${f.data}" style="width:${w}px;height:${h}px;display:block;outline:1px solid ${ink}33"></div>`,
      )
      .join('')}
    </div></body></html>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: Math.min(5, frames.length) * (w + 10) + 14, height: h + 64 });
  await p.setContent(html);
  await p.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: true });
  await p.close();
  console.log('composed', name);
}
/** A clip of the Your plant hero (the plant on its 200pt stage). */
const heroClip = async () => {
  const el = page.getByTestId('plant-hero').first();
  const b = await el.boundingBox();
  return { x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 6), width: Math.min(W, b.width + 40), height: b.height + 12 };
};
const grab = async (clip) => ({ appMs: 0, data: (await page.screenshot({ clip })).toString('base64') });

// The demo plant: an oak called Kai, at Crown (5 of 6), grown some days ago.
const reached = { sprout: now - 29 * DAY, shoot: now - 20 * DAY, bough: now - 9 * DAY, crown: now - 4 * DAY };
const kai = { species: 'oak', name: 'Kai', plantedAt: now - 30 * DAY, growth: 5, reached };
const dressed = { ...kai, look: { colourway: 'oak-autumn', ground: 'stone-ring', planter: 'native', visitor: 'robin', keepsakes: ['lantern', 'fox', 'jay'] } };
const EARNED = { 'first-foothold': now - 28 * DAY, 'topic-clear': now - 20 * DAY, 'dress-rehearsal': now - 6 * DAY, 'on-pace': now - 6 * DAY, 'long-memory:25': now - 5 * DAY, 'snare-wise': now - 8 * DAY };

await go('/home', 1500);
await setPlantSettings({ promptHidden: true });
await setEarned(EARNED, { groundwork: now - 10 * DAY });
await setLastDay(dk(now));
await setNewTopic(false);
await setPlanCleared(false);
await setPlant(dressed);

// ── 1. The Look screen: top, each section, locked choices ──────────────
await go('/plant-look', 2600);
await shot('q01-look-top');
for (const [name, heading, off] of [
  ['q01b-look-colour-ground', 'Colour', 40],
  ['q01c-look-planter', 'Planter', 40],
  ['q01d-look-visitor', 'Visitor', 40],
  ['q01e-look-keepsakes', 'Keepsakes', 40],
]) {
  await toTop(heading, off);
  await shot(name);
}
// "More to find": the planters and keepsakes still to earn, in one closed group at the end (UX review P1).
await toTop('More to find', 120);
await shot('q01f-look-more-closed');
await page.getByRole('button', { name: 'More to find' }).first().click();
await wait(700);
await toTop('More to find', 40);
await shot('q01g-look-more-open');


// ── 2. Dressed: Your plant (a cleared day brings the robin) and Today ──
await setPlanCleared(true);
await go('/plant', 2600);
await shot('q02-plant-dressed');
// Today shows the plant beside the readiness range while the plan is open: the plant and its visitor, never keepsakes.
await setPlanCleared(false);
await go('/home', 2600);
await shot('q02b-today-dressed');
// A cleared day: the plant, happy, with its visitor under the clearing (QA O-1, decided).
await setPlanCleared(true);
await go('/home', 3200);
await toTop('Tomorrow', 420);
await shot('q02c-today-cleared');
await setPlanCleared(false);

if (!NARROW && !FONT_SCALE) {
  // ── 3. Each mood (on the face; Quiet look shows none) ────────────────
  const cells = [];
  const labels = [];
  for (const [mood, prep] of [
    ['idle', async () => {}],
    ['curious · a new topic today', async () => setNewTopic(true)],
    ['happy · plan cleared', async () => setPlanCleared(true)],
    ['proud · grew today', async () => setPlant({ ...dressed, look: { colourway: 'oak-autumn' }, reached: { ...reached, crown: now } })],
    ['resting · 4 days away', async () => setLastDay(dk(now - 4 * DAY))],
    ['Quiet look · no mood', async () => setPlantSettings({ promptHidden: true, quietLook: true })],
  ]) {
    await setPlant({ ...kai, look: { colourway: 'oak-autumn' } });
    await setNewTopic(false);
    await setPlanCleared(false);
    await setLastDay(dk(now));
    await setPlantSettings({ promptHidden: true });
    await prep();
    await go('/plant', 2600);
    cells.push(await grab(await heroClip()));
    labels.push(mood);
  }
  await setPlantSettings({ promptHidden: true });
  await setLastDay(dk(now));
  await compose('q03-moods', 'Moods: the face only, never sad (Your plant, 200pt)', cells, await heroClip(), labels);

  // ── 4. Planters and keepsakes on three species ──────────────────────
  for (const [name, title, looks] of [
    [
      'q04-planters',
      'Planters: its own ground, terracotta and the set planters',
      [
        ['oak', { planter: 'fieldstone' }],
        ['sunflower', { planter: 'compass-rose', colourway: 'sunflower-velvet' }],
        ['lotus', { planter: 'five-stone', colourway: 'lotus-violet' }],
        ['bonsai', { planter: 'banded' }],
        ['cactus', { planter: 'root-woven', colourway: 'cactus-yellow' }],
      ],
    ],
    [
      'q05-keepsakes',
      'Keepsakes (three at a time): flat ones in front, a tall one behind, clear of the trunk',
      [
        ['oak', { keepsakes: ['lantern', 'fox', 'jay'] }],
        ['sunflower', { keepsakes: ['sundial', 'swallow', 'stepping-stone'] }],
        ['cactus', { keepsakes: ['clear-dawn', 'cairn', 'fox'] }],
        ['pine', { keepsakes: ['jay', 'trail-post', 'lantern'], ground: 'stone-ring' }],
        ['bamboo', { keepsakes: ['pebble-path', 'still-pond', 'weather-vane'], planter: 'fieldstone' }],
        ['oak', { keepsakes: ['stepping-stone', 'empty-nest', 'woven-ring'] }],
      ],
    ],
  ]) {
    const cs = [];
    const ls = [];
    // Every badge the strips show (so no keepsake falls back for want of its badge).
    const strip = ['myth-clearer', 'even-keel', 'fresh-start', 'back-on-path', 'know-what-you-know', 'mindset-shift', 'graduate', 'loop-closed', 'first-foothold'];
    await setEarned({ ...EARNED, ...Object.fromEntries(strip.map((b) => [b, now - DAY])) }, { groundwork: now, domains: now, evergreen: now, judgement: now, examDay: now, rooted: now });
    for (const [species, look] of looks) {
      await setPlant({ ...kai, species, growth: 6, reached: { ...reached, elder: now - 3 * DAY }, look });
      await go('/plant', 2400);
      cs.push(await grab(await heroClip()));
      ls.push(`${species} · ${Object.values(look).flat().join(', ')}`);
    }
    await compose(name, title, cs, await heroClip(), ls);
  }
  await setEarned(EARNED, { groundwork: now - 10 * DAY });
}

// ── 5. The badge sheet's quiet line ───────────────────────────────────
await setPlant(dressed);
await go('/milestones?open=dress-rehearsal', 2800);
await shot('q06-badge-sheet-line');

// ── 6. Planting from You → "Plant yours" ──────────────────────────────
// Mobile 1.24 took the plant step (and its "Planted" screen with the sprout
// moment) out of onboarding. The nearest real screen: "Plant it" on the
// picker, which opens Your plant with the new seed. The s04 sprout strip is
// dropped: nothing in the app plays that moment any more.
await setPlant(null);
await go('/plant-pick', 1800);
await page.getByRole('button', { name: /^Plant it$/ }).first().click();
await wait(2000);
await shot('q07-plant-yours-planted');
// Back to the dressed plant for what follows.
await setPlant(dressed);

// ── 7. Frame strips ────────────────────────────────────────────────────
if (STRIPS) {
  // Breathe: one slow breath on arrival (2 s in, 2.4 s out), then still.
  await setPlant({ ...dressed, look: { colourway: 'oak-autumn' } });
  await setPlanCleared(false);
  await go('/plant', 2400);
  const clip = await heroClip();
  await go('/you', 1500);
  await strip(
    's01-breathe',
    'Breathe: one slow breath when Your plant first opens this session (2 s in, 2.4 s out, a slight sway either side), pivoting on the base; then still',
    async () => page.goto(BASE + '/plant', { waitUntil: 'commit' }),
    [400, 1300, 2400, 3500, 5600],
    clip,
    true,
  );

  // A reaction: happy stretches up once from its base (the plan is cleared), once per occasion.
  await setPlanCleared(true);
  await setPlant({ ...dressed, look: { colourway: 'oak-autumn' } });
  await go('/settings', 1500);
  await setPlanCleared(true);
  await strip('s02-reaction-happy', 'A reaction: happy (the plan is cleared) stretches up from its base once, 600 ms (no hop); then the breath', async () => page.goto(BASE + '/plant', { waitUntil: 'commit' }), [150, 260, 380, 520, 900], clip, true);
  await setPlanCleared(false);

  // The growth sequence on Today: Bough → Crown, ≤ 900 ms.
  // Shoot → Crown in one session (Bough was skipped), so the change reads.
  await setPlant({ ...dressed, look: { colourway: 'oak-autumn' }, reached: { ...reached, bough: now, crown: now }, pending: 5 });
  await go('/learn', 1500);
  const box = { x: 0, y: 300, width: W, height: 420 };
  await strip('s03-growth', 'The growth sequence on Today: the old growth swells and fades as the new one settles (900 ms), one success haptic, no reaction with it', async () => page.getByRole('tab', { name: /Today/ }).click(), [60, 220, 400, 600, 1000], box);
}

console.log('errors:', errs.slice(0, 5));
await browser.close();
