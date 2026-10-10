// Settings → Your data screenshots (393x852 @2x): the section, a restore
// preview from a real backup file, the bad-file message, and the restored
// state with "Undo restore". Usage: node shoot_data.mjs <seed.json> <out> <suffix>
// Run via: SHOTS=data bash scripts/screenshots/run.sh <out> <dark|light>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const sfx = process.argv[4] ? `-${process.argv[4]}` : '';
const base = 'http://127.0.0.1:8093';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => {
  if (localStorage.getItem('__seeded')) return;
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  localStorage.setItem('__seeded', '1');
}, seed);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const snap = async (name) => { await page.screenshot({ path: `${out}/${name}${sfx}.png` }); console.log('shot', name + sfx); };
const open = async (path, wait = 1800) => { await page.goto(base + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(wait); };
const scrollTo = async (text, top = 110) => {
  const el = page.getByText(text, { exact: true }).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) { await page.mouse.move(196, 500); await page.mouse.wheel(0, box.y - top); }
  await page.waitForTimeout(700);
};

// A backup from an "old phone": the demo learner earlier on, with fewer
// answers, a later exam date and a longer best streak, so the preview has
// changes to show. Built from the demo seed, so it is a real file.
const day = 86400000;
const dk = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const settings = JSON.parse(seed['aurivan.settings.v1']);
const progress = JSON.parse(seed['aurivan.progress.v1']);
const older = structuredClone(progress);
const ids = Object.keys(older.state.byCert.cisa.answers);
for (const id of ids.slice(120)) delete older.state.byCert.cisa.answers[id];
older.state.streak = { current: 0, best: 14, lastDay: dk(Date.now() - 3 * day), recentDays: [] };
const olderSettings = structuredClone(settings);
olderSettings.state.examDates = { cisa: dk(Date.now() + 75 * day) };
const backup = {
  app: 'aurivan', schema: 1, exportedAt: new Date(Date.now() - 3 * day).toISOString(), appVersion: '1.3.0',
  stores: { settings: olderSettings, progress: older },
};
const pick = async (name, text) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore from a backup' }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.waitForTimeout(1200);
};

await open('/settings');
await scrollTo('Your data');
await snap('d01-your-data');

// A file that isn't an Aurivan backup: one calm message, nothing changes.
await pick('holiday-photos.json', JSON.stringify({ app: 'something-else', photos: [] }));
await scrollTo('Your data');
await snap('d02-restore-error');

// A real backup: the preview sheet.
await pick('aurivan-backup-old-phone.json', JSON.stringify(backup));
await snap('d03-restore-preview');
await page.mouse.move(196, 500); await page.mouse.wheel(0, 2000); await page.waitForTimeout(700);
await snap('d03b-restore-preview-end');

// Replace: the success message and "Undo restore".
await page.getByRole('button', { name: 'Replace my progress' }).click();
await page.waitForTimeout(1200);
await scrollTo('Your data');
await snap('d04-restored');
console.log('errors:', errs.slice(0, 5));
await browser.close();
