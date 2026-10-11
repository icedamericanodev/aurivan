// Stat rows (SHOTS=stats, see run.sh): Results after a 1-question practice,
// a 20-question practice and a timed mock (the stats and the pacing), You's
// stats, and the Today clearing card. The finished sessions are written
// straight into the session store, so Results opens on them.
// NARROW=1 uses a 360-wide phone (small Android); FONT_SCALE=2 approximates
// 200% text (the app reads the scale from the page; text runs are zoomed).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const BASE = 'http://127.0.0.1:8093';
const NARROW = process.env.NARROW === '1';
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const tag = `${theme}${NARROW ? '-w360' : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const P = 'aurivan.progress.v1';
const SESSION = 'aurivan.session.v1';
const W = NARROW ? 360 : 393;
const H = NARROW ? 780 : 852;

// Real CISA questions, so Results can draw each one in its review list.
const bank = [1, 2, 3, 4, 5].flatMap((d) => JSON.parse(fs.readFileSync(`src/content/generated/cisa/d${d}.json`)));
const wrongOf = (q) => ['A', 'B', 'C', 'D'].find((l) => l !== q.correct);
const now = Date.now();

/** A finished session: `right(i)` says which answers were right; `ms(i)` each answer's time. */
function session({ id, mode, title, n, right, ms, minutes, deadline, pick, answered = n }) {
  const qs = pick(n);
  const responses = {};
  let t = now - minutes * 60_000;
  // The first `answered` get an answer; the rest are left blank (a mock submitted early).
  qs.slice(0, answered).forEach((q, i) => {
    t += ms(i);
    const ok = right(i);
    responses[q.id] = { display: ok ? q.correct : wrongOf(q), correct: ok, ms: ms(i), at: t };
  });
  return {
    id,
    mode,
    certId: 'cisa',
    title,
    questionIds: qs.map((q) => q.id),
    perms: Object.fromEntries(qs.map((q) => [q.id, ['A', 'B', 'C', 'D']])),
    index: qs.length - 1,
    responses,
    flagged: [],
    startedAt: now - minutes * 60_000,
    finishedAt: now,
    ...(deadline ? { deadline: now - minutes * 60_000 + deadline * 60_000, timing: 'standard', checkpoints: [] } : {}),
  };
}
const spread = (n) => bank.filter((_, i) => i % Math.floor(bank.length / n) === 0).slice(0, n);
const SESSIONS = {
  one: session({ id: 'shot-one', mode: 'practice', title: 'Practice · IS Audit', n: 1, right: () => true, ms: () => 5_000, minutes: 5 / 60, pick: (n) => bank.slice(0, n) }),
  twenty: session({ id: 'shot-twenty', mode: 'practice', title: 'Practice · All domains', n: 20, right: (i) => i % 10 < 7, ms: (i) => 52_000 + (i % 5) * 9_000, minutes: 23, pick: spread }),
  mock: session({ id: 'shot-mock', mode: 'mock', title: 'Mock exam', n: 150, right: (i) => i % 10 < 7, ms: (i) => 78_000 + (i % 7) * 6_000, minutes: 215, deadline: 240, pick: spread }),
  // A mini mock submitted with 10 left blank: Correct + Missed = 50, and the line says so.
  blanks: session({ id: 'shot-blanks', mode: 'mock', title: 'Mini mock', n: 50, answered: 40, right: (i) => i % 4 !== 0, ms: () => 80_000, minutes: 56, deadline: 80, pick: spread }),
};

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
const go = async (path, ms = 2400) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (FONT_SCALE) await page.addStyleTag({ content: `div[dir="auto"] { zoom: ${FONT_SCALE}; }` });
  await wait(ms);
};
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}-${tag}.png` });
  console.log('shot', name);
};
const edit = (key, fn, arg = null) =>
  page.evaluate(([k, src, a]) => {
    const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
    new Function('v', 'a', src)(v, a);
    localStorage.setItem(k, JSON.stringify(v));
  }, [key, fn, arg]);
/** Put a heading or line near the top of the screen. */
const toTop = async (text, offset = 90) => {
  const el = page.getByText(text).first();
  await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await wait(300);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, -offset);
  await wait(700);
};

await go('/home', 2600);
for (const [name, s] of Object.entries(SESSIONS)) {
  await edit(SESSION, `v.state = { active: a };`, s);
  await go('/results', 2800);
  // On a narrow phone, the rings and their legend first (it stacks under the rings below 380 wide).
  if (NARROW && name === 'mock') {
    await toTop('Mock exam', 20);
    await shot('s1-results-mock-rings');
  }
  // From the rings' legend down: the stats row, the line under it, the actions.
  await toTop(/the ring is your score|Each ring is a domain/, 160);
  await shot(`s1-results-${name}`);
  if (name === 'mock') {
    await toTop('Pacing', 40);
    await shot('s1-results-mock-pacing');
  }
}
await edit(SESSION, `v.state = { active: null };`);

// You: the three stats under the rings.
await go('/you', 2600);
await toTop('Rings read from the outside in', 160);
await shot('s2-you');

// Today: the clearing card (every plan item done).
await edit(P, `
  const d = v.state.days.cisa;
  d.done = d.done.map(() => true); d.celebrated = true;
  d.answered = 31; d.correct = 25; d.minutes = 24;`);
await go('/home', 3000);
await shot('s3-today-clearing');

console.log('errors:', errs.slice(0, 5));
await browser.close();
