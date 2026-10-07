// Phone-size (393x852 @2x) screenshots of key screens with demo data. See run.sh.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
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
// Learn, scrolled to the "By domain" list.
await shot0('02b-learn-list', '/learn');
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/02b-learn-list.png` });
// Lessons: a middle scene, the "How ISACA thinks" scene, and a check with its
// feedback. Scenes are 0-based indexes; `answer` is the option text to tap.
const lessonShots = [
  { id: 'cisa-l-d4-bia', name: '03b-lesson-bia', middle: 3, isaca: 4, check: 7, answer: 'Complete a BIA to set recovery priorities and targets' },
  { id: 'cisa-l-d1-risk-planning', name: '03c-lesson-risk', middle: 3, isaca: 4, check: 8, answer: 'Payroll, because a failure there would do the most harm' },
];
for (const l of lessonShots) {
  await page.goto(`http://127.0.0.1:8093/lesson/${l.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  let at = 0;
  const goTo = async (to) => {
    while (at < to) {
      const next = page.getByRole('button', { name: 'Next', exact: true });
      // Next stays locked on a check until it is answered: tap option A to pass it.
      if (await next.isDisabled()) { await page.getByLabel(/^Option A:/).first().click(); await page.waitForTimeout(500); }
      await next.click(); at++; await page.waitForTimeout(350);
    }
    await page.waitForTimeout(1200); // let the scene's entrance animation finish
  };
  await goTo(l.middle);
  await page.screenshot({ path: `${out}/${l.name}-scene.png` });
  await goTo(l.isaca);
  await page.screenshot({ path: `${out}/${l.name}-isaca.png` });
  await goTo(l.check);
  await page.screenshot({ path: `${out}/${l.name}-check.png` });
  await page.getByText(l.answer, { exact: true }).click();
  await page.waitForTimeout(900);
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${l.name}-feedback.png` });
  console.log('shot lesson', l.id);
}
// Settings → About: the brand vision (lockup, tagline, four pillars).
await shot0('16b-settings-about', '/settings');
await page.getByText('Our vision', { exact: true }).scrollIntoViewIfNeeded();
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 120);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/16b-settings-about.png` });
console.log('shot settings about');
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
  // Coach me on the first sample: the hint + highlighted priority word.
  // That answer is then "assisted" (half weight), shown on results.
  if (q === 0) {
    await page.getByRole('button', { name: 'Coach me', exact: true }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/11b-coach-me.png` });
    console.log('shot coach me');
  }
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
// The assisted mark: scroll to the review list (first row = the coached answer).
await page.getByText('Review answers', { exact: true }).scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 200);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/19c-results-assisted.png` });
console.log('shot results assisted');
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
// ── Phase 5b signature moments ──────────────────────────────────────
// A local "YYYY-MM-DD" n days from today, as source for edit().
const keyIn = (n) => `(() => { const d = new Date(); d.setDate(d.getDate() + (${n}));
  const p = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })()`;
// Slips for the eve card: tag a few mistakes (role ×3, priority ×2).
await edit('aurivan.progress.v1', `
  const m = v.state.byCert.cisa.mistakes;
  Object.keys(m).forEach((id, i) => { if (i < 5) m[id].slip = i < 3 ? 'role' : 'priority'; });`);
// Exam-ready: a strong learner (9 in 10 right, range ~86–94) whose lower
// bound has been logged at 86 for the last 7 days. A fresh, unfinished plan.
await edit('aurivan.progress.v1', `
  const cp = v.state.byCert.cisa;
  Object.keys(cp.answers).forEach((id, i) => { const ok = i % 10 !== 0; cp.answers[id] = { ...cp.answers[id], lastCorrect: ok, correctCount: ok ? 1 : 0 }; });
  const log = []; for (let k = 6; k >= 0; k--) { const day = ${keyIn('-k')}; log.push({ day, min: 86, last: 86 }); }
  cp.moments = { readiness: log };
  if (v.state.days) delete v.state.days.cisa;`);
await shot('26-exam-ready', '/home', 2400);
// Dismissed from here on (it shows once per cert).
await edit('aurivan.progress.v1', 'v.state.byCert.cisa.moments.readySeenAt = Date.now();');
// Exam eve (exam tomorrow), then exam day. Changing the date in Settings
// rebuilds today's plan; here the stored plan is dropped to the same effect.
await edit('aurivan.settings.v1', `v.state.examDates.cisa = ${keyIn(1)};`);
await edit('aurivan.progress.v1', 'if (v.state.days) delete v.state.days.cisa;');
await shot('27-exam-eve', '/home');
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/27b-exam-eve-scrolled.png` });
await edit('aurivan.settings.v1', `v.state.examDates.cisa = ${keyIn(0)};`);
await edit('aurivan.progress.v1', 'if (v.state.days) delete v.state.days.cisa;');
await shot('28-exam-day', '/home');
// Settings: the exam-date control (presets + day/week steps), date set.
await shot('30-settings-exam-date', '/settings');
await edit('aurivan.settings.v1', `v.state.examDates.cisa = ${keyIn(38)};`);
await edit('aurivan.progress.v1', 'if (v.state.days) delete v.state.days.cisa;');
// Mindset growth (You): first-try answers from make_seed.py (__growth); the
// demo's other answers count as re-answered, so the windows are the seeded ones.
await edit('aurivan.progress.v1', `
  const g = ${seed.__growth}; const cp = v.state.byCert.cisa;
  Object.keys(cp.answers).forEach((id) => { cp.answers[id].attempts = 2; });
  Object.assign(cp.answers, g.answers); Object.assign(cp.mistakes, g.mistakes);`);
await shot('29-mindset-growth', '/you');
await page.getByText('Mindset growth', { exact: true }).scrollIntoViewIfNeeded();
await page.mouse.move(196, 500);
await page.mouse.wheel(0, 260);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/29b-mindset-growth-card.png` });
console.log('shot signature moments');
// Share card: the preview sheet from You (demo data has a readiness range).
await shot('31-share-card', '/you');
await page.getByRole('button', { name: 'Share progress', exact: true }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/31-share-card.png` });
await page.getByRole('button', { name: 'Streak', exact: true }).click().catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/31b-share-card-streak.png` });
console.log('shot share card');
// Saved questions, with a few bookmarks (row opens the question; bookmark removes).
await edit('aurivan.progress.v1', "v.state.byCert.cisa.bookmarks = ['d4_250', 'd4_190', 'd1_010'];");
await shot('17b-saved', '/saved');
// Slip coach: "Your pattern" with 5+ tagged mistakes (the seed tags most of
// them), then the quiet line when fewer than 5 are tagged.
await edit('aurivan.progress.v1', `
  const m = v.state.byCert.cisa.mistakes; const ids = Object.keys(m);
  ids.forEach((id, i) => { m[id].resolved = false; if (i < 8) m[id].slip = i < 5 ? 'priority' : 'role'; });`);
await shot('25-your-pattern', '/mistakes');
await edit('aurivan.progress.v1', `
  const m = v.state.byCert.cisa.mistakes;
  Object.keys(m).forEach((id, i) => { if (i >= 2) delete m[id].slip; });`);
await shot('25b-pattern-quiet', '/mistakes');
// Empty mistake journal.
await edit('aurivan.progress.v1', 'v.state.byCert.cisa.mistakes = {};');
await shot('21-mistakes-empty', '/mistakes');
// Onboarding (last: it marks the learner as new).
await edit('aurivan.settings.v1', 'v.state.onboarded = false;');
// 22: the welcome (lockup, tagline, pillars); 22b: the exam; 22c: the date.
await shot('22-onboarding', '/onboarding');
await page.getByText('Start my plan', { exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/22b-onboarding-exam.png` });
await page.getByText('Continue', { exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/22c-onboarding-date.png` });
console.log('errors:', errs.slice(0, 5));
await browser.close();
