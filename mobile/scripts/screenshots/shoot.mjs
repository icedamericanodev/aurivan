// Phone-size (393x852 @2x) screenshots of key screens with demo data. See run.sh.
import { createRequire } from 'module';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
import fs from 'fs';
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const routes = [
  ['01-today','/home'],['02-learn','/learn'],['03-lesson','/lesson/cisa-l-d1-charter'],
  ['04-practice','/practice'],['05-play','/play'],['06-priority-lens','/game/priority'],
  ['07-trap-spotter','/game/trap'],['08-sprint','/game/sprint'],['09-you','/you'],['10-mistakes','/mistakes'],
  ['16-settings','/settings'],['17-saved-empty','/saved'],['18-caught-up','/caught-up'],
];
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// Seed once per browser context, so later steps can change the stored state
// (finish the session, empty the journal…) and reload to see the result.
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
for (const [name, path] of routes) {
  await page.goto('http://127.0.0.1:8093' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
}
const shot0 = async (name, path) => {
  await page.goto('http://127.0.0.1:8093' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
// Question bank: the domain list, a domain (All), the Missed filter, and the
// seedling empty state (Saved: the seed has no bookmarks yet at this point).
await shot0('23-bank', '/bank');
await shot0('24-bank-domain', '/bank/4');
await page.getByRole('button', { name: 'Missed', exact: true }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/24b-bank-missed.png` });
await page.getByRole('button', { name: 'Saved', exact: true }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/24c-bank-empty.png` });
console.log('shot question bank');

// Each sample question: the question, the answer screen, and the vine (key idea + tips).
// The first sample is answered with its runner-up (wrong), the rest correctly (make_seed.py).
const keys = (seed.__shotKeys || 'D').split(',');
await page.goto('http://127.0.0.1:8093/session', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
for (let q = 0; q < keys.length; q++) {
  const n = q === 0 ? '' : `-q${q + 1}`;
  await page.screenshot({ path: `${out}/11-question${n}.png` });
  await page.getByLabel(new RegExp(`^Option ${keys[q]}:`)).first().click();
  await page.getByText('Check answer', { exact: true }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/12-answer${n}.png` });
  await page.mouse.move(196, 500);
  for (const [i, dy] of [[13, 700], [14, 1400]]) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(800);
    if (q === 0) await page.screenshot({ path: `${out}/${i}-explanation-tips.png` });
  }
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/15-all-tips${n}.png` });
  const next = page.getByText('Next question', { exact: true });
  if (q < keys.length - 1 && (await next.count())) { await next.click(); await page.waitForTimeout(1200); }
}
console.log('shot session flow');

// Edge states: edit the saved stores, then open the screen.
const edit = (key, fn) => page.evaluate(([k, src]) => {
  const v = JSON.parse(localStorage.getItem(k));
  new Function('v', src)(v);
  localStorage.setItem(k, JSON.stringify(v));
}, [key, fn]);
const shot = async (name, path, wait = 1800) => {
  await page.goto('http://127.0.0.1:8093' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
// Results: the sample session, finished.
await edit('aurivan.session.v1', 'v.state.active.finishedAt = Date.now(); v.state.active.startedAt = Date.now() - 7 * 60000;');
await shot('19-results', '/results');
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 700);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/19b-results-review.png` });
// Clearing card: today's plan, all done.
await edit('aurivan.progress.v1', `
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  const day = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  // Day plans are stored per cert (progress store v2).
  v.state.days = { ...(v.state.days || {}) }; delete v.state.day;
  v.state.days.cisa = { day, certId: 'cisa',
    items: [{ kind: 'review', count: 20 }, { kind: 'lesson', lessonId: 'cisa-l-d5-mfa', title: 'Authentication factors: what makes MFA real' }, { kind: 'game', gameId: 'trap', label: 'Trap Spotter · 2 min' }],
    done: [true, true, true], start: { score: 62, domains: { '1': .74, '2': .66, '3': .55, '4': .58, '5': .6 } },
    answered: 31, correct: 25, minutes: 24, celebrated: true };`);
await shot('20-clearing', '/home');
// Saved questions, with a few bookmarks (row opens the question; bookmark removes).
await edit('aurivan.progress.v1', "v.state.byCert.cisa.bookmarks = ['d4_250', 'd4_190', 'd1_010'];");
await shot('17b-saved', '/saved');
// Empty mistake journal.
await edit('aurivan.progress.v1', 'v.state.byCert.cisa.mistakes = {};');
await shot('21-mistakes-empty', '/mistakes');
// Onboarding (last: it marks the learner as new).
await edit('aurivan.settings.v1', 'v.state.onboarded = false;');
await shot('22-onboarding', '/onboarding');
await page.getByText('Continue', { exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/22b-onboarding-date.png` });
console.log('errors:', errs.slice(0, 5));
await browser.close();
