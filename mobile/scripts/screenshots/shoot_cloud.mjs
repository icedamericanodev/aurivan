// Uplift Phase 6 "Accounts (built OFF)" screenshots (SHOTS=cloud, see run.sh;
// spec PHASE6_8.md §2.9). Dev-only: the web build is exported with the cloud
// flag ON and the in-memory backend (EXPO_PUBLIC_AURIVAN_CLOUD=1,
// EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND=memory, EXPO_PUBLIC_AURIVAN_SHOTS=1).
// That export is never a store build (src/cloud/configGuard.ts refuses the
// memory backend in every EAS profile).
//
// Each page load starts the memory backend from localStorage
// `aurivan.shots.cloud` ({ signedIn, authAgeMin }); the demo learner is
// maya@example.com and every code sent is 246810 (src/cloud/memory/seed.ts).
//
// Shots (light or dark, from the run's theme):
//   acct-you-out     You, signed out, with "Sync across devices"
//   acct-signin      the sign-in sheet, box unticked: buttons disabled, hint shown
//   acct-email-err   email entry with the "bad address" problem
//   acct-code        the code step with the resend timer
//   acct-home        the Account screen, signed in
//   acct-settings    Settings → Account, signed in
//   acct-del-1/2/3   delete: step 1, confirm it's you, typing DELETE
//   acct-del-done    "Your account is deleted"
//   acct-about       Settings → About line, flag on, signed out
//   acct-signin-xl, acct-home-xl   about 200% text
//   off-you, off-settings          the flag-OFF build (served on 8094): proof nothing changed
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const ON = 'http://127.0.0.1:8093';
const OFF = process.env.CLOUD_OFF_BASE || 'http://127.0.0.1:8094';
const STATE = 'aurivan.shots.cloud';
const ACCOUNT = 'aurivan.account.v1';

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];

/** A phone-sized page with the demo learner's saved study data. fontScale 2 ≈ 200% text. */
async function phone(fontScale = 0) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((s) => {
    if (localStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(s)) if (!k.startsWith('__')) localStorage.setItem(k, v);
    localStorage.setItem('__seeded', '1');
  }, seed);
  if (fontScale) await ctx.addInitScript((f) => (window.__AURIVAN_FONT_SCALE__ = f), fontScale);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  return { ctx, page };
}

const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"], input';
/** About 200% text: each text run zooms like the app's text size, up to its style's cap (titles stop at ×1.3). */
const zoomText = (page, f) =>
  page.evaluate(
    ([sel, factor]) => {
      for (const el of document.querySelectorAll(sel)) {
        if (el.dataset.zoomed) continue;
        const px = parseFloat(getComputedStyle(el).fontSize) || 16;
        el.style.zoom = String(px >= 26 ? Math.min(1.3, factor) : factor);
        el.dataset.zoomed = '1';
      }
    },
    [TEXT_RUNS, f],
  );

const shot = async (page, name, fontScale = 0) => {
  if (fontScale) {
    await zoomText(page, fontScale);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${out}/${name}-${theme}.png` });
  console.log('shot', `${name}-${theme}`);
};
/** Start the next page load signed in or out (the memory backend and the account store both). */
const setState = (page, state) =>
  page.evaluate(
    ([k, a, s]) => {
      localStorage.setItem(k, JSON.stringify(s));
      localStorage.removeItem(a);
    },
    [STATE, ACCOUNT, state],
  );
const go = async (page, base, path, ms = 2200) => {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(ms);
};
const scrollTo = async (page, text, top = 110) => {
  const el = page.getByText(text, { exact: true }).last();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.move(196, 500);
    await page.mouse.wheel(0, box.y - top);
  }
  await page.waitForTimeout(700);
};
const tap = async (page, name) => {
  await page.getByRole('button', { name, exact: true }).first().click();
  await page.waitForTimeout(900);
};

// ── Flag on, signed out ───────────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, {});
  await go(page, ON, '/you');
  await scrollTo(page, 'Help and feedback', 300);
  await shot(page, 'acct-you-out');

  await go(page, ON, '/account');
  await shot(page, 'acct-signin');

  // Tick the box, then email: a bad address first.
  await page.getByRole('checkbox').first().click();
  await page.waitForTimeout(400);
  await tap(page, 'Continue with email');
  await page.getByLabel('Email address', { exact: true }).fill('maya@example');
  await tap(page, 'Send code');
  await shot(page, 'acct-email-err');

  await page.getByLabel('Email address', { exact: true }).fill('maya@example.com');
  await tap(page, 'Send code');
  await page.waitForTimeout(2600);
  await shot(page, 'acct-code');

  await go(page, ON, '/settings');
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(900);
  await shot(page, 'acct-about');
  await ctx.close();
}

// ── Flag on, signed in ────────────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, { signedIn: true, authAgeMin: 1 });
  await go(page, ON, '/account');
  await shot(page, 'acct-home');

  await go(page, ON, '/settings');
  await scrollTo(page, 'Account', 200);
  await shot(page, 'acct-settings');

  // Delete with a recent sign-in: step 1, then type DELETE, then done.
  await go(page, ON, '/account/delete');
  await shot(page, 'acct-del-1');
  await tap(page, 'Continue');
  await page.getByLabel('Type DELETE to confirm', { exact: true }).fill('DELETE');
  await page.waitForTimeout(500);
  await shot(page, 'acct-del-3');
  await tap(page, 'Delete account');
  await page.waitForTimeout(800);
  await shot(page, 'acct-del-done');

  // A sign-in 30 minutes old: confirm it's you first.
  await setState(page, { signedIn: true, authAgeMin: 30 });
  await go(page, ON, '/account/delete');
  await tap(page, 'Continue');
  await shot(page, 'acct-del-2');
  await ctx.close();
}

// ── About 200% text ───────────────────────────────────────────────────
{
  const { ctx, page } = await phone(2);
  await go(page, ON, '/you');
  await setState(page, {});
  await go(page, ON, '/account');
  await shot(page, 'acct-signin-xl', 2);
  await setState(page, { signedIn: true, authAgeMin: 1 });
  await go(page, ON, '/account');
  await shot(page, 'acct-home-xl', 2);
  await ctx.close();
}

// ── Flag OFF: nothing changed ─────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, OFF, '/you');
  await scrollTo(page, 'Help and feedback', 300);
  await shot(page, 'off-you');
  await go(page, OFF, '/settings');
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(900);
  await shot(page, 'off-settings');
  await ctx.close();
}

await browser.close();
if (errs.length) {
  console.error('Page errors:\n' + [...new Set(errs)].join('\n'));
  process.exit(1);
}
