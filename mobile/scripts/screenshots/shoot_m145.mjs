// Mobile 1.45, the decision lessons (SHOTS=m145, see run.sh).
//
// Shots, per new lesson: the cover, one decision scene (a stack, flow or compare) and the first
// check, open and then answered with the best answer. Plus the answer screen after a miss on a
// question that lesson prepares, scrolled to its "Take the lesson" row.
// M145_ONLY=cisa-l-d5-no-patch,miss narrows the run (e.g. for the dark pass).
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
const ONLY = (process.env.M145_ONLY || '').split(',').filter(Boolean);
const want = (k) => ONLY.length === 0 || ONLY.includes(k);
const W = 393;
const H = 852;
const here = path.dirname(fileURLToPath(import.meta.url));

// The decision scene to shoot (its index in `scenes`) and the first check's key, by lesson.
const LESSONS = [
  { id: 'cisa-l-d5-no-patch', decision: 4 },
  { id: 'cisa-l-d4-resilience', decision: 3 },
  { id: 'cisa-l-d5-breach-notification', decision: 2 },
  { id: 'cisa-l-d4-invocation', decision: 3 },
  { id: 'cisa-l-d2-who-decides', decision: 2 },
];
const FIRST_CHECK = 8; // title + 7 teaching scenes, in each of the five
// The miss: a question the no-patch lesson prepares (its note 5B2.6), answered wrong.
const MISS_QID = 'd5_137';

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}-${theme}.png` });
  console.log('shot', name);
};
const go = async (route, ms = 2200) => {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await wait(ms);
};
const next = async (ms = 1100) => {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await wait(ms);
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

for (const { id, decision } of LESSONS) {
  if (!want(id)) continue;
  const short = id.replace('cisa-l-', '');
  await go(`/lesson/${id}`, 1600);
  await shot(`${short}-1-title`);
  for (let i = 1; i <= decision; i++) await next(i === decision ? 1600 : 900);
  await shot(`${short}-2-decision`);
  for (let i = decision + 1; i <= FIRST_CHECK; i++) await next(i === FIRST_CHECK ? 1400 : 700);
  await shot(`${short}-3-check`);
  // Answer it with any option: the verdict and explanation show either way; the key is read from the radios' order.
  const radios = page.getByRole('radio');
  if (await radios.count()) {
    await radios.first().click();
    await wait(1400);
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.wheel(0, 500);
    await wait(700);
    await shot(`${short}-4-check-answered`);
  }
}

if (want('miss')) {
  const d5 = JSON.parse(fs.readFileSync(path.join(here, '../../../data/domain5.json'), 'utf8'));
  const q = (Array.isArray(d5) ? d5 : d5.questions).find((x) => x.id === MISS_QID);
  const wrong = ['A', 'B', 'C', 'D'].find((l) => l !== q.correct);
  await go('/home', 800);
  await edit(
    'aurivan.session.v1',
    `v.state.active = { id: 'm145', mode: 'practice', certId: 'cisa', title: 'Practice · Info Protection', questionIds: ['${MISS_QID}'],
      perms: { '${MISS_QID}': ['A', 'B', 'C', 'D'] }, index: 0, responses: {}, flagged: [], startedAt: ${Date.now() - 60000} };`,
  );
  await go('/session', 1800);
  await page.getByLabel(new RegExp(`^Option ${wrong}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await wait(1600);
  const row = page.getByText('Take the lesson').first();
  if (await row.count()) {
    await row.evaluate((x) => x.scrollIntoView({ block: 'center' }));
    await wait(800);
  } else console.log('"Take the lesson" did not show');
  await shot('miss-take-the-lesson');
}

if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
await browser.close();
