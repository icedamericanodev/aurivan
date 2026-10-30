// "Your note" screenshots (393x852 @2x): the answer screen's ⋯ "More on this
// question" sheet with "Add a note" (mobile 1.49 moved it there from the page
// body), the note sheet open while typing, the saved note as a plate, and
// Saved → Your notes.
// Usage: node shoot_qnote.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=qnote bash scripts/screenshots/run.sh <out> <dark|light>
// FONT_SCALE=2 approximates 200% text (the app reads the scale from the page,
// so its large-text rules apply; text runs are zoomed with CSS). Names end "-fs200".
//
// The keyboard: a web build has no on-screen keyboard. "q02-sheet-keyboard"
// shrinks the page by a phone keyboard's height (336pt) while the field is
// focused, which is what the Sheet's KeyboardAvoidingView does on a phone, so
// the shot shows the sheet sitting above the keyboard. Check it on a device too.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const FONT_SCALE = Number(process.env.FONT_SCALE) || 0;
const sfx = `${process.argv[4] ? `-${process.argv[4]}` : ''}${FONT_SCALE ? `-fs${Math.round(FONT_SCALE * 100)}` : ''}`;
const base = 'http://127.0.0.1:8093';
const H = 852;
const KEYBOARD = 336;

// Two earlier notes (and one saved question), so Saved → Your notes has a list.
const progress = JSON.parse(seed['aurivan.progress.v1']);
const cp = progress.state.byCert.cisa;
const answered = Object.keys(cp.answers);
const now = Date.now();
cp.qNotes = {
  [answered[0]]: { text: 'The auditor reports to the audit committee, not to IT. Independence first, then scope.', ts: now - 2 * 86400000 },
  [answered[1]]: { text: 'Look for the control that PREVENTS, not the one that finds it later.', ts: now - 86400000 },
};
cp.bookmarks = [answered[2]];
seed['aurivan.progress.v1'] = JSON.stringify(progress);

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
if (FONT_SCALE) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), FONT_SCALE);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const snap = async (name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (path, wait = 1800) => {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  if (FONT_SCALE) await page.addStyleTag({ content: `div[dir="auto"] { zoom: ${FONT_SCALE}; }` });
  await page.waitForTimeout(wait);
};
/** Scroll so `text` sits `top` points from the top of the screen. */
const scrollTo = async (text, top) => {
  const el = page.getByText(text, { exact: true }).last();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 400); await page.mouse.wheel(0, box.y - top); }
  await page.waitForTimeout(800);
};

// 1. Answer the first sample (a miss on the runner-up), then open ⋯ in the session
// header: "Add a note" is a row of the "More on this question" sheet.
const keys = (seed.__shotKeys || 'A').split(',');
await open('/session');
await page.getByLabel(new RegExp(`^Option ${keys[0]}:`)).first().click();
await page.getByText('Check answer', { exact: true }).click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'More on this question' }).click();
await page.waitForTimeout(900);
await snap('q01-answer-add-note');

// 2. The note sheet (it opens once the ⋯ sheet has gone), typing, and with the
// page shortened by a keyboard's height.
await page.getByRole('button', { name: 'Add a note', exact: true }).click();
await page.waitForTimeout(1200);
const field = page.getByLabel('Your note on this question');
await field.click();
await page.keyboard.type('Escalate first. More testing only once the fraud lead says so.', { delay: 5 });
await page.waitForTimeout(800);
await snap('q02-sheet-open');
await page.setViewportSize({ width: 393, height: H - KEYBOARD });
await page.waitForTimeout(700);
await snap('q02-sheet-keyboard');
await page.setViewportSize({ width: 393, height: H });
await page.waitForTimeout(500);

// 3. Done: the saved note, as a plate in the same place.
await page.getByRole('button', { name: 'Done, Your note' }).click();
await page.waitForTimeout(1200);
await scrollTo('Your note', 380);
await snap('q03-saved-note-plate');

// 4. Saved → Your notes: a marker under each stem, never the note's text (newest first).
await page.evaluate(() => localStorage.removeItem('aurivan.session.v1'));
await open('/saved');
await scrollTo('Your notes', 200);
await snap('q04-saved-your-notes');

if (errs.length) console.log('page errors:', errs);
await browser.close();
