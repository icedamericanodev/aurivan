// Mobile 1.12 "Learn and Play" (SHOTS=learnplay, see run.sh): the end states
// of the changed screens and frame strips of the new motion.
//
// Shots: Learn (cover with its reason, the lesson trail), a lesson cover, the
// three scene templates (steps, layers, timeline), "The IS auditor’s lens", a
// check with its verdict leaf, Lesson complete, a note read to its end (p09: since 1.22 the
// note marks itself read when its ending comes into view; a tap only if it hasn't), Play,
// each game's header, a recap with its sparkline and a level up.
// Strips (slow motion, see shoot_motion.mjs): the scene turn, the step line
// drawing, the timeline rail, the lesson ✓ on Learn, Lesson complete's leaf,
// a Field Guide match, a placed stone and the TierLeaf morph.
// REDUCED=1 runs with the browser's Reduce Motion on (files end "-reduced").
// NARROW=1 uses a 360-wide phone; FONT_SCALE=2 approximates 200% text (shots only).
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
const NARROW = process.env.NARROW === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const STRIPS = !NARROW && !FONT_SCALE;
const tag = `${theme}${REDUCED ? '-reduced' : ''}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;
const P = 'aurivan.progress.v1';

// Stepping Stones: each process's steps in order (to place a perfect path).
// Plus the lessons' step flows, which the game also plays (content/games getStepSequences).
const SEQUENCES = JSON.parse(fs.readFileSync('src/content/games/cisa/sequences.json')).sequences;
{
  const src = fs.readFileSync('src/content/lessons/cisa.ts', 'utf8');
  for (const m of src.matchAll(/type: 'flow',[\s\S]*?heading: '([^']+)',[\s\S]*?steps: \[([\s\S]*?)\n {8}\],/g)) {
    SEQUENCES.push({ title: m[1], steps: [...m[2].matchAll(/label: '([^']+)'/g)].map((x) => ({ label: x[1] })) });
  }
}
// Field Guide: each term's definition, as the game builds them (whitespace squeezed).
const squeeze = (t) => t.trim().replace(/\s+/g, ' ');
const NOTES = JSON.parse(fs.readFileSync('src/content/generated/cisa/notes.json'));
const DEFINITION = new Map();
for (const d of NOTES.domains ?? []) {
  for (const t of d.topics) for (const s of t.subtopics) for (const k of s.keyTerms ?? []) if (!DEFINITION.has(squeeze(k.term))) DEFINITION.set(squeeze(k.term), squeeze(k.definition));
  for (const k of d.keyTerms ?? []) if (!DEFINITION.has(squeeze(k.term))) DEFINITION.set(squeeze(k.term), squeeze(k.definition));
}

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
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
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
// The slow-motion clock switch (see shoot_motion.mjs).
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
// FONT_SCALE: every text run is zoomed, headings included (RN web draws a header as
// role="heading" or h1–h3, not a div). Text the app caps below the scale is zoomed
// to its cap instead (the lesson's "10/11" counter: maxFontSizeMultiplier 1.3).
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';
const CAPPED = [{ sel: '[dir="auto"][aria-label^="Scene "]', cap: 1.3 }];
const go = async (path, ms = 2000) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (FONT_SCALE) {
    const caps = CAPPED.map(({ sel, cap }) => `${sel} { zoom: ${Math.min(cap, FONT_SCALE)}; }`).join(' ');
    await page.addStyleTag({ content: `${TEXT_RUNS} { zoom: ${FONT_SCALE}; } ${caps}` });
  }
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
const button = (name) => page.getByRole('button', { name }).first();
const tapText = async (text, ms = 400) => {
  await page.getByText(text, { exact: true }).first().click();
  await wait(ms);
};
const press = async (name, ms = 700) => {
  await button(name).click();
  await wait(ms);
};
const scrollTo = async (text, extra = 0) => {
  await page.getByText(text, { exact: true }).first().scrollIntoViewIfNeeded();
  if (extra) {
    await page.mouse.move(W / 2, 500);
    await page.mouse.wheel(0, extra);
  }
  await wait(600);
};
const visible = async (text) => (await page.getByText(text, { exact: true }).count()) > 0;

// ── Frame strips (as in shoot_motion.mjs) ──────────────────────────────
async function strip(name, titles, act, appTimes, clip) {
  if (!STRIPS) return act();
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
    const c = typeof clip === 'function' ? await clip() : clip;
    const buf = await page.screenshot(c ? { clip: c } : {});
    frames.push({ appMs, data: buf.toString('base64'), clip: c });
  }
  await page.evaluate(() => window.__timeScale(1));
  await compose(name, title, frames);
}
async function compose(name, title, frames) {
  const w = frames[0].clip ? frames[0].clip.width : W;
  const h = frames[0].clip ? frames[0].clip.height : H;
  const bg = theme === 'dark' ? '#111613' : '#F3F1EA';
  const ink = theme === 'dark' ? '#ECEFE8' : '#17231B';
  const html = `<html><body style="margin:0;background:${bg};font:600 13px -apple-system,Segoe UI,sans-serif;color:${ink}">
    <div style="padding:10px 12px 4px">${REDUCED ? 'Reduce Motion · ' : ''}${title}</div>
    <div style="display:flex;gap:10px;padding:6px 12px 12px">
    ${frames.map((f, i) => `<div><div style="padding:0 0 4px">${i + 1} · ${f.appMs} ms</div><img src="data:image/png;base64,${f.data}" style="width:${w}px;height:${h}px;display:block;outline:1px solid ${ink}33"></div>`).join('')}
    </div></body></html>`;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: frames.length * (w + 10) + 14, height: h + 64 });
  await p.setContent(html);
  await p.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: true });
  await p.close();
  console.log('strip', name, frames.map((f) => f.appMs).join(','));
}
/** A clip around the element with this text (full width, `above`/`below` points around it). */
const around = (text, above = 40, below = 120) => async () => {
  // Mobile 1.22: a text that is not on screen any more (Learn moved on) frames the whole screen, never a timeout.
  const el = page.getByText(text, { exact: true }).first();
  if (!(await el.count()) || !(await el.isVisible())) return { x: 0, y: 0, width: W, height: H };
  const b = await el.boundingBox();
  if (!b) return { x: 0, y: 0, width: W, height: H };
  const y = Math.max(0, Math.round(b.y - above));
  return { x: 0, y, width: W, height: Math.min(H - y, above + below + Math.round(b.height)) };
};

// Seed: a stones level one strong round from Sapling, and a few past rounds (the recap's trend).
await go('/home', 1500);
await edit(P, `const c = v.state.byCert.cisa;
  c.gameGrowth = { ...(c.gameGrowth || {}), stones: { tier: 'seedling', up: 1, down: 0 } };
  c.gameRecent = { ...(c.gameRecent || {}), stones: [4, 7, 6] };
  c.gameBest = { ...(c.gameBest || {}), stones: 7 };`);

// ── 1. Learn ───────────────────────────────────────────────────────────
await go('/learn');
await shot('p00-learn-cover');
await go('/learn?domain=1');
await scrollTo('Lessons', 40); // mobile 1.21: the section is "Lessons"
await shot('p01-learn-trail');

// ── 2. A lesson: the cover, then the templates ─────────────────────────
await go('/lesson/cisa-l-d1-charter', 1600);
await shot('p02-lesson-cover');
if (STRIPS) {
  await strip(
    'f1-scene-turn',
    ['Scene turn: Next. The cover drifts out left and fades (120 ms), the next scene arrives from the right (280 ms) and its parts build 120 ms apart', 'Scene turn, Reduce Motion: the next scene fades in (120 ms), all its parts at once; nothing slides'],
    () => button('Next').click(),
    [10, 80, 200, 420],
  );
  await wait(900);
} else {
  await press('Next', 900);
}
await press('Next', 900); // analogy
await press('Next', 1200); // stack: layers
await shot('p03-layers');
await press('Next', 900); // trap
await press('Next', 1200); // tip
await shot('p03b-tip-composed');
await press('Next', 1200); // check
await tapText('The audit committee', 1200);
await shot('p07-check-verdict');

// Steps (BIA, scene 4) and the step line.
await go('/lesson/cisa-l-d4-bia', 1500);
await press('Next', 900);
await press('Next', 900);
await strip(
  'f2-step-line',
  ['Steps: each stop arrives (fade + 8pt rise, 120 ms apart) and the path draws down to the next one as it comes', 'Steps, Reduce Motion: the whole diagram fades in at once (120 ms); the path is simply drawn'],
  () => button('Next').click(),
  [120, 360, 560, 900],
);
await wait(1200);
await shot('p04-steps');
await press('Next', 1200); // The IS auditor’s lens
await shot('p06-how-isaca-thinks');

// Timeline (reporting, scene 4).
await go('/lesson/cisa-l-d1-reporting', 1500);
await press('Next', 900);
await press('Next', 900);
await strip(
  'f3-timeline',
  ['Timeline: phases arrive on one rail that draws down the whole build; each ring fills as its phase arrives; the arrow comes last', 'Timeline, Reduce Motion: all at once, a 120 ms fade'],
  () => button('Next').click(),
  [120, 400, 700, 1100],
);
await wait(1200);
await shot('p05-timeline');
// On to scene 10 of 11 (the header counter at its widest, "10/11"): answer the check at 9.
for (let k = 4; k < 10; k++) {
  const option = page.getByRole('radio', { name: /^Option A:/ });
  if ((await option.count()) && (await option.first().isEnabled())) {
    await option.first().click();
    await wait(900);
  }
  await press('Next', 900);
}
await shot('p05b-scene-10');

// ── 3. Lesson complete (a fresh lesson) and the ✓ back on Learn ────────
// The lesson's title is read from the content (mobile 1.22: a hard-coded title
// went stale when the lesson was renamed, and the run stopped here). Opened
// from its Learn row when the row is on screen, else straight from its link.
const RISK_ID = 'cisa-l-d1-risk-planning';
const RISK_TITLE = (() => {
  const src = fs.readFileSync('src/content/lessons/cisa.ts', 'utf8');
  const at = src.search(new RegExp(`id:\\s*['"\`]${RISK_ID}['"\`]`));
  if (at < 0) return '';
  // The lesson's own title: any quote style, escaped quotes allowed ('The auditor\'s plan').
  const m = /title:\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/.exec(src.slice(at));
  return m ? m[2].replace(/\\(.)/g, '$1') : '';
})();
await go('/learn?domain=1');
const fromLearn = RISK_TITLE !== '' && (await visible(RISK_TITLE));
if (fromLearn) {
  await scrollTo(RISK_TITLE, 120);
  await tapText(RISK_TITLE, 1600);
} else {
  await go(`/lesson/${RISK_ID}`, 1600);
}
for (let k = 0; k < 14; k++) {
  if (await visible('Finish lesson')) break;
  const option = page.getByRole('radio', { name: /^Option A:/ });
  if ((await option.count()) && (await option.first().isEnabled())) {
    // Any answer opens Next (the moment, not the score, is what's shown here).
    await option.first().click();
    await wait(900);
  }
  await press('Next', 900);
}
if ((await page.getByRole('radio', { name: /^Option A:/ }).count()) && (await page.getByRole('radio', { name: /^Option A:/ }).first().isEnabled())) {
  await page.getByRole('radio', { name: /^Option A:/ }).first().click();
  await wait(900);
}
await strip(
  'f5-lesson-complete',
  ['Lesson complete: one calm moment. The branch arrives, then the new leaf fills in (600 ms); tap to skip', 'Lesson complete, Reduce Motion: the end state at once, the same words'],
  () => button('Finish lesson').click(),
  [60, 420, 760, 1200],
);
await wait(1600);
await shot('p08-lesson-complete');
await strip(
  'f4-lesson-check',
  ['Back on Learn: the lesson just finished draws its ✓ (200 ms), with one light haptic', 'Back on Learn, Reduce Motion: the ✓ fades in (120 ms)'],
  () => button('Close').click(),
  [40, 300, 420, 700],
  fromLearn ? around(RISK_TITLE, 120, 140) : undefined,
);
await wait(1000);
if (!fromLearn) await go('/learn?domain=1');
await shot('p01b-learn-after-lesson');

// ── 4. Notes: read to the end (p09 shows the auto-read state, or the tap if it didn't fire) ──
await go('/notes/subtopic/1A1.1', 1800);
const noteOk = await visible('Mark as read');
if (noteOk) {
  await scrollTo('Mark as read', 120);
  // Mobile 1.22: reaching the end of a note marks it read by itself; tap only if it hasn't.
  if (await visible('Mark as read')) await press('Mark as read', 900);
  else await wait(900);
  await shot('p09-note-marked-read');
}

// ── 5. Play, each game's header and intro ──────────────────────────────
await go('/play');
await shot('p10-play');
await scrollTo('Stepping Stones', 120);
await shot('p10b-play-rows');
const games = ['trap', 'sprint', 'priority', 'daylight', 'rumor', 'callit', 'field', 'canopy', 'stones'];
for (const g of games) {
  await go(`/game/${g}`, 1600);
  if (g === 'sprint' || g === 'daylight' || g === 'rumor' || g === 'callit' || g === 'field' || g === 'canopy' || g === 'stones') {
    if (g === 'sprint' || g === 'field') await shot(`p11-intro-${g}`);
    if (await visible('Start')) await press('Start', 1400);
  }
  await shot(`p12-header-${g}`, { clip: { x: 0, y: 0, width: W, height: 300 } });
}

// TierLeaf morph on an intro (Field Guide).
await go('/game/field', 1600);
if (STRIPS) {
  await scrollTo('Pick your level', 200);
  await strip(
    'f6-tier-morph',
    ['Level picker: Seedling → Sapling. The thumb slides, the old leaf fades out and the new one springs in from .6', 'Level picker, Reduce Motion: the segment cross-fades, the new leaf fades in'],
    () => page.getByRole('radio', { name: /^Sapling/ }).first().click(),
    [10, 90, 180, 420],
    around('Pick your level', 20, 160),
  );
  await wait(600);
}

// A Field Guide match.
await go('/game/field', 1600);
await press('Start', 1400);
const terms = await page.getByRole('button', { name: /^Term \d+ of \d+: / }).all();
if (terms.length) {
  const label = await terms[0].getAttribute('aria-label');
  const term = label.replace(/^Term \d+ of \d+: /, '').replace(/[.,]? ?(Then tap.*)?$/, '');
  const def = DEFINITION.get(squeeze(term));
  await terms[0].click();
  await wait(500);
  if (def) {
    const meaning = page.getByRole('button', { name: new RegExp(`^Meaning \\d+ of \\d+: ${def.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first();
    await strip(
      'f7-match',
      ['Field Guide match: both tiles of the pair tint green together (160 ms) and their ✓ marks spring in', 'Field Guide match, Reduce Motion: the tint cross-fades, the ✓ fades in'],
      () => meaning.click(),
      [10, 80, 160, 400],
      { x: 0, y: 150, width: W, height: 560 },
    );
  }
  await wait(600);
  await shot('p13-field-matched');
}

// ── 6. Stepping Stones: a perfect round → the recap, its sparkline, a level up ──
await go('/game/stones', 1600);
await press('Start', 1400);
for (let p = 0; p < 3; p++) {
  // The process on screen: the one whose steps include every stone offered.
  const offered = (await page.getByRole('button', { name: /^Place next: / }).evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')))).map((l) => l.replace(/^Place next: /, ''));
  const fits = SEQUENCES.filter((s) => offered.length && offered.every((o) => s.steps.some((st) => st.label === o)));
  let seq = fits[0];
  for (const s of fits) if (await visible(s.title)) seq = s;
  if (!seq) break;
  for (const [k, st] of seq.steps.entries()) {
    const stone = page.getByRole('button', { name: `Place next: ${st.label}` }).first();
    if (!(await stone.count())) continue;
    if (p === 0 && k === 2) {
      await strip(
        'f8-stone',
        ['Stepping Stones: a placed stone settles into its numbered slot (fade + 8pt rise, 160 ms)', 'Stepping Stones, Reduce Motion: the stone fades into its slot (120 ms)'],
        () => stone.click(),
        [10, 60, 120, 260],
        { x: 0, y: 160, width: W, height: 420 },
      );
      await wait(300);
    } else {
      await stone.click();
      await wait(250);
    }
  }
  await press('Check the order', 900);
  if (p === 0) await shot('p14-stones-checked');
  if (await visible('See results')) {
    await press('See results', 2600);
    break;
  }
  await press('Next process', 1000);
}
await shot('p15-recap-sparkline-levelup');
await scrollTo('Play again', 0);
await shot('p15b-recap-scrolled');

console.log(errs.length ? `page errors:\n${errs.join('\n')}` : 'no page errors');
await browser.close();
