// Help and feedback screenshots (mobile 1.7, Uplift Phase 1 "Ask and fix"):
// the report sheet on a question and on a note, the calm note after the
// email app opens, the no-email-app fallback, Settings → Help and feedback,
// the Help screen (two groups), "Copy or share instead", Today's credit line
// (with Dismiss), What's new (with "Updated after your report"), What's
// next, Common questions and Your reports.
// Usage: node shoot_support.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=support bash scripts/screenshots/run.sh <out> <dark|light>
// (run.sh swaps in a one-entry demo fixes list for this export only.)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';
const day = 86400000;

// Demo reports on this phone, made on 1.7.0: one fixed since (the demo fix in
// run.sh is for d1_008, fixedIn 1.7.1), one started on a note, one on a lesson step.
const progress = JSON.parse(seed['aurivan.progress.v1']);
progress.state.reports = [
  { ref: 'R-4MZQ', item: 'lesson:cisa-l-d1-charter#4', reason: 'unclear', at: Date.now() - 2 * day, cert: 'cisa', version: '1.7.0' },
  { ref: 'R-H7KD', item: 'note:4B1.2', reason: 'diagram', at: Date.now() - 6 * day, cert: 'cisa', version: '1.7.0' },
  { ref: 'R-7K2Q', item: 'q:d1_008', reason: 'key', at: Date.now() - 20 * day, cert: 'cisa', version: '1.7.0' },
];
seed['aurivan.progress.v1'] = JSON.stringify(progress);

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
// "The email app": a mailto: link opens nothing in the browser. __noMail makes it fail (no email app).
await ctx.addInitScript(() => {
  window.open = () => {
    if (window.__noMail) throw new Error('No email app');
    return null;
  };
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const snap = async (name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (path, wait = 1800) => { await page.goto(base + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(wait); };
const scrollBy = async (dy) => { await page.mouse.move(196, 500); await page.mouse.wheel(0, dy); await page.waitForTimeout(700); };
const scrollTo = async (text, top = 110) => {
  const el = page.getByText(text, { exact: true }).last();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - top); }
  await page.waitForTimeout(700);
};

// 1. A question: answer it (the seed's first sample picks the runner-up), then report.
const keys = (seed.__shotKeys || 'A').split(',');
await open('/session');
await page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first().click();
await page.getByText('Check answer', { exact: true }).click();
await page.waitForTimeout(900);
await scrollTo('Report a problem', 520);
await snap('s01-question-trust-line');
await page.getByText('Report a problem', { exact: true }).click();
await page.waitForTimeout(900);
await snap('s02-question-sheet-top');
await page.getByText('The marked answer looks wrong', { exact: true }).click();
await page.waitForTimeout(400);
await scrollTo('Which answer do you think is best? (optional)', 120);
await snap('s03-question-sheet-answer');
await page.getByLabel('Add a note').fill('I think B fits the stem better: it names the audit committee.');
await page.getByText('What we’ll send', { exact: true }).click();
await page.waitForTimeout(500);
await scrollTo('What we’ll send', 120);
await snap('s04-question-sheet-send');
// The email app opens (nothing to see in a browser), and the learner comes back.
await page.getByText('Write the email', { exact: true }).click();
await page.waitForTimeout(1200);
await scrollTo('Finished in your email app?', 420);
await snap('s05-question-after-send');

// 2. A note: the report sheet, then the no-email-app fallback.
await open('/notes/subtopic/4B1.2');
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await snap('s06-note-report-row');
await page.getByLabel(/^Report started .*Report a problem with note 4B1\.2$/).click();
await page.waitForTimeout(900);
await snap('s07-note-sheet-top');
await page.getByText('A diagram is wrong or hard to read', { exact: true }).click();
await page.evaluate(() => { window.__noMail = true; });
await scrollTo('Write the email', 600);
await snap('s08-note-sheet-bottom');
await page.getByText('Write the email', { exact: true }).click();
await page.waitForTimeout(1200);
await scrollTo('We couldn’t open an email app.', 120);
await snap('s09-fallback');
await scrollBy(500);
await snap('s10-fallback-share');
await page.evaluate(() => { window.__noMail = false; });
// "Copy or share instead": the same panel, chosen, with no email app involved.
await page.getByText('Close', { exact: true }).click();
await page.waitForTimeout(700);
await page.getByLabel(/^Report started .*Report a problem with note 4B1\.2$/).click();
await page.waitForTimeout(900);
await page.getByText('Hard to follow', { exact: true }).click();
await scrollTo('Copy or share instead', 600);
await snap('s27-sheet-copy-or-share');
await page.getByText('Copy or share instead', { exact: true }).click();
await page.waitForTimeout(900);
await scrollTo('Send it your own way', 120);
await snap('s28-own-way-panel');

// 3. Settings → Help and feedback; the Help screen; the sheets from there.
await open('/settings');
await scrollTo('Help and about', 110); // mobile 1.17 group name
await snap('s11-settings-help');
await open('/help');
await snap('s12-help-screen');
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await snap('s12b-help-screen-updates');
await page.getByText('Contact support', { exact: true }).click();
await page.waitForTimeout(900);
await snap('s13-contact-support');
await open('/help');
await page.getByText('Suggest an idea', { exact: true }).click();
await page.waitForTimeout(900);
await snap('s14-send-feedback');

// 4. You (the one entry) and Today (the once-only credit line, which marks it seen).
await open('/you');
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await snap('s15-you-help-row');
await open('/home');
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await snap('s16-today-credit');

// 5. What's new (with the credit, shown once), What's next, Common questions, Your reports.
// Today has just marked the credit seen; un-mark it so What's new can show its own once.
await page.evaluate(() => {
  const row = JSON.parse(localStorage.getItem('aurivan.progress.v1'));
  row.state.reports = row.state.reports.map(({ creditSeen, ...r }) => r);
  localStorage.setItem('aurivan.progress.v1', JSON.stringify(row));
});
await open('/whats-new');
await snap('s17-whats-new');
await scrollTo('Fixed after learner reports', 110);
await snap('s18-whats-new-fixes');
await open('/whats-next');
await snap('s19-whats-next');
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await snap('s20-whats-next-end');
await open('/faq');
await page.getByText('How do I move my progress to a new phone?', { exact: true }).click();
await page.waitForTimeout(600);
await snap('s21-faq');
await open('/reports');
await snap('s22-your-reports');

// 6. A lesson step's quiet link, and the mock navigator's line.
await open('/lesson/cisa-l-d1-charter');
await page.getByRole('button', { name: 'Next', exact: true }).click(); await page.waitForTimeout(500);
await snap('s23-lesson-step-link');

// 7. Approximate 200% text (the web build always reports a font scale of 1, so
// CSS zooms every text run instead; check the ×1.3 reflow rules on a device or
// in the screen tests): the trust line row, the report sheet, the Help rows.
const large = async () => { await page.addStyleTag({ content: 'div[dir="auto"] { zoom: 2; }' }); await page.waitForTimeout(600); };
await page.evaluate(() => localStorage.removeItem('aurivan.session.v1'));
await open('/notes/subtopic/1A2.4');
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await large();
await page.mouse.wheel(0, 30000); await page.waitForTimeout(800);
await snap('s24-large-note-report-row');
await page.getByLabel('Report a problem with note 1A2.4').click();
await page.waitForTimeout(900);
await large();
await snap('s25-large-report-sheet');
await open('/help');
await large();
await snap('s26-large-help');

await browser.close();
if (errs.length) {
  console.error('page errors:', errs);
  process.exit(1);
}
