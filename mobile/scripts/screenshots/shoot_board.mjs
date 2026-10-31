// Uplift Phase 8 "Feedback board (built OFF)" screenshots (SHOTS=cloud, run
// after shoot_cloud.mjs; CLOUD_PART=board runs only these). Spec PHASE6_8.md
// §4.11 with the 12 Oct addendum (no What's next feed). Dev-only: the web
// build has the cloud flag ON and the in-memory backend, seeded by
// src/cloud/memory/seed.ts (boardSeed): 12 posts in every status, a post of
// Maya's waiting for review, a recall hold, reports, an appeal, a staff
// member. Each page load starts from localStorage `aurivan.shots.cloud`.
//
// Shots (light or dark, from the run's theme):
//   board-top, board-new, board-shipped   the board's tabs, signed in
//   board-out            signed out, default scope (signed-in learners): the sign-in line
//   board-out-everyone   signed out, read scope "everyone": the posts
//   board-own            read scope "author_staff": only Maya's posts, the intro says so
//   board-post           a post with the team's official response and its status history
//   board-spoiler        a Content post about an answer, folded
//   compose-empty, compose-bank, compose-recall, compose-draft   the composer
//   board-gate, board-handle   the guidelines gate and "Choose how you appear"
//   ugc-menu, ugc-report, ugc-report-done, ugc-block   the ⋯ menu, Report, thanks, Block
//   ugc-report-member    "Report {name}": reporting a learner (fix round P8, SEC S8)
//   ugc-blocked          Settings → Feedback board → Blocked learners
//   board-activity       Your activity: a removal with "Ask us to look again", a status, a reply
//   board-held           Maya's post waiting for review; board-paused: the composer, paused
//   mod-held, mod-reported, mod-appeals, mod-members, mod-log, mod-pause   the staff queue
//   board-you, board-settings, board-feedback-public, board-whatsnew   the entry points
//                        (board-settings: the "Feedback board, …" door in Settings' last card)
//   board-settings-section   Settings → Feedback board, its own screen since mobile 1.46
//                        (settings-section?category=board): Your activity, Blocked learners
//   board-top-xl, compose-bank-xl   about 200% text
//   off-help, off-whatsnew   the flag-OFF build: Help and What's new unchanged
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2]));
const out = process.argv[3];
const theme = process.argv[4] || 'light';
const ON = 'http://127.0.0.1:8093';
const OFF = process.env.CLOUD_OFF_BASE || 'http://127.0.0.1:8094';
const STATE = 'aurivan.shots.cloud';
const ACCOUNT = 'aurivan.account.v1';
// A real practice question's stem (from the bundled pack), for the leak card.
const PACK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/content/generated/cisa/d2.json');
const STEM = JSON.parse(fs.readFileSync(PACK, 'utf8')).find((q) => q.stem.split(' ').length > 22).stem;

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errs = [];

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

const TEXT_RUNS = 'div[dir="auto"], [role="heading"][dir="auto"], h1[dir="auto"], h2[dir="auto"], h3[dir="auto"], input, textarea';
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
/** The next page load's memory backend: signed in or out, and the board's switches. */
const setState = (page, state) =>
  page.evaluate(
    ([k, a, s]) => {
      localStorage.setItem(k, JSON.stringify(s));
      // The account store's facts follow the memory backend's session at launch (lib/account.ts initAccount).
      localStorage.removeItem(a);
      localStorage.removeItem('aurivan.outbox.v1');
      localStorage.removeItem('aurivan.boardDraft.v1');
    },
    [STATE, ACCOUNT, state],
  );
const go = async (page, base, p, ms = 2400) => {
  await page.goto(base + p, { waitUntil: 'networkidle' });
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
// Segments and RadioRows are radios, CheckRows and filter chips checkboxes, the rest
// buttons. A row whose spoken name adds its subtitle is found by its visible title.
const tap = async (page, name, nth = 0) => {
  const any = ['button', 'radio', 'checkbox', 'tab'].map((role) => page.getByRole(role, { name, exact: true })).reduce((a, b) => a.or(b));
  const target = (await any.count()) > nth ? any.nth(nth) : page.getByText(name, { exact: true }).nth(nth);
  await target.click();
  await page.waitForTimeout(900);
};
const fill = async (page, label, text) => {
  await page.getByLabel(label, { exact: true }).first().fill(text);
  await page.waitForTimeout(300);
};
const SIGNED_IN = { signedIn: true, authAgeMin: 30 };

// ── The board, signed in ─────────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, SIGNED_IN);
  await go(page, ON, '/board');
  await shot(page, 'board-top');
  await tap(page, 'New');
  await shot(page, 'board-new');
  await tap(page, 'Shipped');
  await shot(page, 'board-shipped');

  await go(page, ON, '/board/post-timer-lock');
  await scrollTo(page, 'KaiSip team · official response', 420);
  await shot(page, 'board-post');
  await go(page, ON, '/board/post-change-mgmt');
  await shot(page, 'board-spoiler');

  // The ⋯ menu, Report, its thanks, Block (the alert is drawn by cloud/memory/shotsAlert.ts).
  await go(page, ON, '/board/post-bcp-tests');
  await tap(page, 'More options');
  await shot(page, 'ugc-menu');
  await tap(page, 'Report post');
  await tap(page, 'Spam or advertising');
  await shot(page, 'ugc-report');
  await tap(page, 'Send report');
  await shot(page, 'ugc-report-done');
  await go(page, ON, '/board/post-matching-hint');
  await tap(page, 'More options');
  await tap(page, 'Block Kind Willow 31');
  await shot(page, 'ugc-block');
  await go(page, ON, '/board/post-weekly-summary');
  await tap(page, 'More options');
  await tap(page, 'Report Bright Rowan 58');
  await tap(page, 'Harassment or hate');
  await shot(page, 'ugc-report-member');

  await go(page, ON, '/board/activity');
  await shot(page, 'board-activity');
  await go(page, ON, '/board/post-maya-subtopic');
  await shot(page, 'board-held');

  // The composer: empty, a pasted practice question, recalled exam wording, then offline.
  await go(page, ON, '/board/new');
  await shot(page, 'compose-empty');
  await fill(page, 'Title', 'About one question in this topic');
  await fill(page, 'Details (optional)', STEM);
  await page.waitForTimeout(1600);
  await shot(page, 'compose-bank');
  await fill(page, 'Details (optional)', 'On my exam I got one about who approves the audit charter. Was it the board?');
  await page.waitForTimeout(1200);
  await shot(page, 'compose-recall');

  // Entry points: You, Settings, the Send feedback sheet, What's new.
  await go(page, ON, '/you');
  await scrollTo(page, 'Help and feedback', 300);
  await shot(page, 'board-you');
  // Settings → Feedback board is a door in the last card ("Data and help"), spoken
  // "Feedback board, Your activity and blocked learners" (components/settings.tsx
  // SettingsCategoryRow); its rows are on its own screen, settings-section?category=board.
  await go(page, ON, '/settings');
  const boardDoor = page.getByRole('button', { name: /^Feedback board, / });
  await boardDoor.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await shot(page, 'board-settings');
  await boardDoor.click();
  await page.waitForURL(/settings-section/);
  await page.getByText('Blocked learners', { exact: true }).last().waitFor();
  await page.waitForTimeout(1200);
  await shot(page, 'board-settings-section');
  await go(page, ON, '/help');
  await tap(page, 'Suggest an idea');
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(700);
  await shot(page, 'board-feedback-public');
  await go(page, ON, '/whats-new');
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 30000);
  await page.waitForTimeout(900);
  await shot(page, 'board-whatsnew');
  await ctx.close();
}
{
  // Offline: the post is kept here as a draft.
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, { ...SIGNED_IN, offline: true });
  await go(page, ON, '/board/new');
  await fill(page, 'Title', 'An idea written on the train');
  await page.waitForTimeout(800);
  await tap(page, 'Post');
  await shot(page, 'compose-draft');
  // Posting paused by staff.
  await setState(page, { ...SIGNED_IN, postingOpen: false });
  await go(page, ON, '/board/new');
  await shot(page, 'board-paused');
  await ctx.close();
}

// ── Signed out and the read scope ────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, {});
  await go(page, ON, '/board');
  await shot(page, 'board-out');
  await setState(page, { readScope: 'everyone' });
  await go(page, ON, '/board');
  await shot(page, 'board-out-everyone');
  await setState(page, { ...SIGNED_IN, readScope: 'author_staff' });
  await go(page, ON, '/board');
  await shot(page, 'board-own');
  await ctx.close();
}

// ── The guidelines gate ──────────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, { ...SIGNED_IN, boardJoined: false });
  await go(page, ON, '/board/guidelines?then=compose');
  await shot(page, 'board-gate');
  await scrollTo(page, 'Choose how you appear', 120);
  await tap(page, 'A name you choose');
  // Not a reserved name: names with the product's name are kept for the team (engine/moderation.ts).
  await fill(page, 'Your name on the board', 'Maya Studies');
  await tap(page, 'I agree to the community guidelines');
  await shot(page, 'board-handle');
  await ctx.close();
}
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, { ...SIGNED_IN, boardBlocked: true });
  await go(page, ON, '/board/blocked');
  await shot(page, 'ugc-blocked');
  await ctx.close();
}

// ── The staff queue ──────────────────────────────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, ON, '/you');
  await setState(page, { ...SIGNED_IN, boardStaff: true });
  await go(page, ON, '/board/moderation');
  await shot(page, 'mod-held');
  for (const [tab, name] of [['Reported', 'mod-reported'], ['Appeals', 'mod-appeals'], ['Members', 'mod-members'], ['Log', 'mod-log']]) {
    await tap(page, tab);
    await page.waitForTimeout(600);
    await shot(page, name);
  }
  await tap(page, 'Held');
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(700);
  await tap(page, 'Pause posting');
  await shot(page, 'mod-pause');
  await ctx.close();
}

// ── About 200% text ──────────────────────────────────────────────────
{
  const { ctx, page } = await phone(2);
  await go(page, ON, '/you');
  await setState(page, SIGNED_IN);
  await go(page, ON, '/board');
  await shot(page, 'board-top-xl', 2);
  await go(page, ON, '/board/new');
  await fill(page, 'Title', 'About one question in this topic');
  await fill(page, 'Details (optional)', STEM);
  await page.waitForTimeout(1600);
  await zoomText(page, 2);
  await page.waitForTimeout(400);
  await scrollTo(page, 'This looks like text from one of KaiSip’s practice questions', 120);
  await shot(page, 'compose-bank-xl', 2);
  await ctx.close();
}

// ── Flag OFF: Help and What's new unchanged ──────────────────────────
{
  const { ctx, page } = await phone();
  await go(page, OFF, '/help');
  await shot(page, 'off-help');
  await go(page, OFF, '/whats-new');
  await page.mouse.move(196, 500);
  await page.mouse.wheel(0, 30000);
  await page.waitForTimeout(900);
  await shot(page, 'off-whatsnew');
  await ctx.close();
}

await browser.close();
if (errs.length) {
  console.error('Page errors:\n' + [...new Set(errs)].join('\n'));
  process.exit(1);
}
