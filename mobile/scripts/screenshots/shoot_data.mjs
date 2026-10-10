// Settings → Your data screenshots (393x852 @2x): the section, the save
// confirmation, the bad-file message, the restore preview (normal and
// "older backup"), the restored state with "Undo restore", and on a new
// phone the welcome screen's "Restore from a backup" with the fresh preview. Usage: node shoot_data.mjs <seed.json> <out> <suffix>
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

// Two real backups built from the demo seed:
// - OLDER: the demo learner earlier on (fewer answers, earlier last day, a
//   later exam date, a longer best streak), so the preview warns "older";
// - NEWER: the demo learner plus more answers studied today (not older).
const day = 86400000;
const dk = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const settings = JSON.parse(seed['aurivan.settings.v1']);
const progress = JSON.parse(seed['aurivan.progress.v1']);
const growth = JSON.parse(seed.__growth);
const older = structuredClone(progress);
for (const id of Object.keys(older.state.byCert.cisa.answers).slice(120)) delete older.state.byCert.cisa.answers[id];
older.state.streak = { current: 0, best: 14, lastDay: dk(Date.now() - 3 * day), recentDays: [] };
const olderSettings = structuredClone(settings);
olderSettings.state.examDates = { cisa: dk(Date.now() + 75 * day) };
const newer = structuredClone(progress);
Object.assign(newer.state.byCert.cisa.answers, Object.fromEntries(Object.entries(growth.answers).slice(0, 60).map(([k, v]) => [k, { ...v, lastAt: Date.now() - 3600000 }])));
newer.state.streak = { ...newer.state.streak, best: 11 };
const newerSettings = structuredClone(settings);
newerSettings.state.reminder = { enabled: true, hour: 7, minute: 30, days: [1, 2, 3, 4, 5] };
const file = (st, pr, daysAgo) => JSON.stringify({ app: 'aurivan', schema: 1, exportedAt: new Date(Date.now() - daysAgo * day).toISOString(), appVersion: '1.3.0', stores: { settings: st, progress: pr } });
const olderBackup = file(olderSettings, older, 3);
const newerBackup = file(newerSettings, newer, 0);

const pick = async (name, text) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore from a backup' }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.waitForTimeout(1200);
};
const toEnd = async () => { await page.mouse.move(196, 500); await page.mouse.wheel(0, 3000); await page.waitForTimeout(700); };

await open('/settings');
await scrollTo('Your data');
await snap('d01-your-data');

// Save a backup (the web build downloads the file): the calm confirmation.
const download = page.waitForEvent('download');
await page.getByRole('button', { name: 'Save a backup' }).click();
await download;
await page.waitForTimeout(900);
await scrollTo('Your data');
await snap('d02-save-confirmation');

// A file that isn't an Aurivan backup: one calm message, nothing changes.
await pick('holiday-photos.json', JSON.stringify({ app: 'something-else', photos: [] }));
await scrollTo('Your data');
await snap('d03-restore-error');

// A newer backup: the normal preview (with the Study reminder row).
await pick('aurivan-backup-today.json', newerBackup);
await snap('d04-restore-preview');
await toEnd();
await snap('d04b-restore-preview-end');
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(800);

// An older backup: the "Older backup" warning, then Replace.
await pick('aurivan-backup-old-phone.json', olderBackup);
await snap('d05-restore-preview-behind');
await toEnd();
await page.getByRole('button', { name: 'Replace my progress' }).click();
await page.waitForTimeout(1500);
await scrollTo('Your data');
await snap('d06-restored');

// A new phone: the welcome screen, with "Restore from a backup" under "Start my plan".
const fresh = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await fresh.addInitScript((theme) => {
  if (localStorage.getItem('__seeded')) return;
  // Only the theme, so light and dark both show; no progress, not onboarded.
  localStorage.setItem('aurivan.settings.v1', JSON.stringify({ state: { onboarded: false, theme }, version: 1 }));
  localStorage.setItem('__seeded', '1');
}, settings.state.theme);
const page2 = await fresh.newPage();
page2.on('pageerror', (e) => errs.push(e.message));
await page2.goto(base + '/onboarding', { waitUntil: 'networkidle' });
await page2.waitForTimeout(1800);
await page2.screenshot({ path: `${out}/d07-welcome-restore${sfx}.png` }); console.log('shot', 'd07-welcome-restore' + sfx);
const chooser2 = page2.waitForEvent('filechooser');
await page2.getByRole('button', { name: 'Restore from a backup' }).click();
await (await chooser2).setFiles({ name: 'aurivan-backup-old-phone.json', mimeType: 'application/json', buffer: Buffer.from(olderBackup) });
await page2.waitForTimeout(1200);
await page2.screenshot({ path: `${out}/d08-restore-preview-fresh${sfx}.png` }); console.log('shot', 'd08-restore-preview-fresh' + sfx);
await page2.getByRole('button', { name: 'Restore my progress' }).click();
await page2.waitForTimeout(2000);
await page2.screenshot({ path: `${out}/d09-after-welcome-restore${sfx}.png` }); console.log('shot', 'd09-after-welcome-restore' + sfx);
console.log('errors:', errs.slice(0, 5));
await browser.close();
