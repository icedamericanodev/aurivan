// Mobile 1.46 "one page, clear groups" Settings (SHOTS=m146, see run.sh). Each category is a flat
// card; Your data and Help and about are doors to their own screens.
//
// Shots, in light and dark and at about 200% text: the top of Settings, the middle, the end (the
// two doors), Your data's screen and Help and about's screen. Both themes in one run.
// SHOTS_BASE=http://127.0.0.1:<port> points it at a server on another port.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const BASE = process.env.SHOTS_BASE || 'http://127.0.0.1:8093';
const S = 'aurivan.settings.v1';
const P = 'aurivan.progress.v1';
const W = 393;
const H = 852;
const DAY = 86_400_000;
const now = Date.now();
const dk = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"]';

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];

async function session(theme, fontScale = 0) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(
    ([s, th]) => {
      if (localStorage.getItem('__seeded')) return;
      for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
      const st = JSON.parse(localStorage.getItem('aurivan.settings.v1') || '{"state":{},"version":1}');
      st.state.theme = th;
      localStorage.setItem('aurivan.settings.v1', JSON.stringify(st));
      localStorage.setItem('__seeded', '1');
    },
    [seed, theme],
  );
  if (fontScale) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), fontScale);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${theme}: ${e.message}`));
  const wait = (ms) => page.waitForTimeout(ms);
  const go = async (path, ms = 2200) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await wait(ms);
  };
  const edit = (key, fn, arg = null) =>
    page.evaluate(([k, src, a]) => {
      const v = JSON.parse(localStorage.getItem(k) || '{"state":{},"version":1}');
      new Function('v', 'a', src)(v, a);
      localStorage.setItem(k, JSON.stringify(v));
    }, [key, fn, arg]);
  // Each text run zooms like the app's text size, up to its style's cap (titles 26px and up stop at ×1.3).
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
      [TEXT_RUNS, fontScale],
    );
  const tag = `${theme}${fontScale ? `-fs${Math.round(fontScale * 100)}` : ''}`;
  const shot = async (name) => {
    if (fontScale) {
      await zoomText();
      await wait(400);
    }
    await page.screenshot({ path: `${out}/settings-${name}-${tag}.png` });
    console.log('shot', name, tag);
  };
  const scrollTo = async (text, offset = 40) => {
    if (fontScale) await zoomText();
    const el = page.getByText(text, { exact: true }).first();
    await el.evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await wait(300);
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.wheel(0, -offset);
    await wait(800);
  };
  const toEnd = async () => {
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.wheel(0, 40000);
    await wait(800);
  };
  // The seed's learner: an exam date about 5 weeks out, reminders on, a starting point chosen, a backup made.
  await go('/home', 1500);
  await edit(S, `Object.assign(v.state, { examDates: { cisa: a }, familiarity: 'some', dailyMinutes: 20, fitPrompt: 'answered', reminder: { enabled: true, hour: 19, minute: 30, days: [1, 2, 3, 4, 5] } });`, dk(now + 37 * DAY));
  await edit(P, `v.state.plantSettings = { ...(v.state.plantSettings || {}), promptHidden: true };`);
  await edit('aurivan.backup.v1', `v.state = { ...(v.state || {}), lastBackupAt: a };`, now - 3 * DAY);
  return { ctx, page, go, shot, scrollTo, toEnd };
}

for (const [theme, fontScale] of [['light', 0], ['dark', 0], ['light', 2]]) {
  const { ctx, page, go, shot, scrollTo, toEnd } = await session(theme, fontScale);
  await go('/settings');
  await shot('top');
  await scrollTo('Your study');
  await shot('middle');
  await toEnd();
  await shot('end');
  for (const [door, name] of [['Your data', 'your-data'], ['Help and about', 'help']]) {
    await go('/settings');
    await toEnd();
    await page.getByRole('button', { name: new RegExp(`^${door}, `) }).first().click();
    await page.waitForTimeout(1600);
    await shot(name);
  }
  await ctx.close();
}
console.log('errors:', errs.slice(0, 5));
await browser.close();
