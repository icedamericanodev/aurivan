// KaiSip web smoke test (index.html over a local server).
// Usage: node web.mjs <web_root> <out_dir> <base_url> [repo_root]
//   web_root  the folder being served: the repo root, or _site/ (the public
//             site, SMOKE_WEB_SITE=1) where only the free sample is present
//   repo_root the checkout (default web_root); W9 takes a full-course question
//             from its data/domain*.json to check a saved one is skipped calmly
// Walks the web paths in .claude/agents/smoke-tester.md and writes
// web-results.json + screenshots to <out_dir>. Read-only on the app.
import fs from 'fs';
import path from 'path';
import { launch, Recorder, loadBank, norm, sleep } from './lib.mjs';

const [repo, outDir, base, fullRepoArg] = process.argv.slice(2);
const fullRepo = fullRepoArg || repo;
if (!repo || !outDir || !base) { console.error('usage: node web.mjs <repo_root> <out_dir> <base_url>'); process.exit(2); }
const URL0 = base.replace(/\/$/, '') + '/index.html';
const ORIGIN = new URL(URL0).origin;
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const APP_VERSION = (html.match(/const APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
const bank = loadBank(repo);
const SITE = bank.__site; // serving the public site: the free sample only (web v12.50+)
const rec = new Recorder(outDir, 'web', { appVersion: APP_VERSION, url: URL0, site: SITE });
const browser = await launch();

const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
async function newPage(view, scheme) {
  const ctx = await browser.newContext({ ...VIEWS[view], colorScheme: scheme, acceptDownloads: true, reducedMotion: 'reduce' });
  // Analytics: the consent bar is answered "Decline" by the harness; GA is
  // also blocked at the network so a smoke run never sends real hits.
  await ctx.route(/googletagmanager|google-analytics/, (r) => r.abort());
  const page = await ctx.newPage();
  rec.watch(page, ORIGIN);
  // Since web v12.50 the website loads only the free sample (data/free/).
  // Asking for the full bank is a FAIL even where it would be served.
  page.on('request', (r) => {
    if (rec.cur && /\/data\/domain\d+\.json/.test(new URL(r.url()).pathname)) rec.cur.errors.push(`requested the full bank: ${r.url()}`);
  });
  return { ctx, page };
}
const visible = async (loc) => { try { return await loc.first().isVisible(); } catch { return false; } };

// First-run screens and asks a smoke run must get past: the welcome
// ("Look around first"), the cookie bar ("Decline": analytics stays off) and
// the exam-date sheet (closed without a date).
async function clearAsks(page) {
  for (let i = 0; i < 4; i++) {
    let did = false;
    const look = page.getByRole('button', { name: 'Look around first' });
    if (await visible(look)) { await look.first().click(); did = true; }
    const dec = page.locator('#consent-banner:not([hidden]) .consent-btn.decline');
    if (await visible(dec)) { await dec.first().click(); did = true; }
    const sheet = page.locator('#flagModal .ks-sheet, #flagModal [role=dialog]');
    if (await visible(sheet)) {
      const txt = norm(await sheet.first().innerText());
      if (/exam date|when is your exam/i.test(txt)) {
        const later = sheet.locator('button').filter({ hasText: /not now|later|skip|close|cancel|no date/i });
        if (await visible(later)) { await later.first().click(); did = true; }
        else { await page.keyboard.press('Escape'); did = true; }
      }
    }
    if (!did) break;
    await sleep(500);
  }
}
async function boot(page) {
  await page.goto(URL0, { waitUntil: 'networkidle' });
  await sleep(800);
  await clearAsks(page);
}
// Open a page through the app's own links: the section first, then the
// page link inside it (side nav on desktop, the section bar on phones).
async function go(page, section, hash) {
  await clearAsks(page);
  // A practice question (or a mock question) hides the tab bar on phones;
  // leave it with its own X first, as a learner would.
  for (const x of ['#pfExit', '#mkExit']) {
    const b = page.locator(`${x}:visible`);
    if (await visible(b)) { await b.first().click(); await sleep(500); await clearAsks(page); }
  }
  const sec = page.locator(`#bottomNav a[data-sec="${section}"]:visible, #sideNav a[data-sec="${section}"]:visible`);
  if (await visible(sec)) await sec.first().click();
  else await page.locator(`a[href="#${section === 'today' ? 'today' : section}"]:visible`).first().click();
  await sleep(500);
  if (hash) {
    const link = page.locator(`a[href="#${hash}"]:visible`);
    await link.first().click();
    await sleep(600);
  }
  await clearAsks(page);
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);

// The Practice page itself (the Practice section can reopen its last page, e.g. Mock exam).
async function goPracticeHub(page) {
  await go(page, 'practice');
  if (!(await visible(page.locator('#screen-practice .ph-go')))) {
    const sub = page.locator('a[data-tab="practice"]:visible');
    if (await visible(sub)) { await sub.first().click(); await sleep(600); }
  }
  await page.locator('#screen-practice .ph-go:visible').first().waitFor({ timeout: 10000 });
}

// Open study note `id` (topic group first, if it is closed), leaving it expanded.
async function openNote(page, id) {
  const row = page.locator(`[id="ni-${id}"]`);
  if (!(await visible(row.locator('.gt-row-btn')))) {
    await page.locator('#topicsArea button', { hasText: 'Types of Audits' }).first().click();
    await sleep(500);
  }
  const btn = row.locator('.gt-row-btn');
  await btn.waitFor({ timeout: 10000 });
  if ((await btn.getAttribute('aria-expanded')) !== 'true') { await btn.click(); await sleep(800); }
  return row;
}

// The option button whose text is `text` (smart quotes ignored).
async function optionByText(page, scope, text) {
  const btns = page.locator(`${scope} .opt`);
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    const t = norm((await b.innerText()).replace(/^[A-D]\s*/, ''));
    if (t === norm(text)) return { btn: b, letter: await b.getAttribute('data-l') };
  }
  return null;
}
async function anyOtherOption(page, scope, notText) {
  const btns = page.locator(`${scope} .opt`);
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    const t = norm((await b.innerText()).replace(/^[A-D]\s*/, ''));
    if (t !== norm(notText)) return { btn: b, letter: await b.getAttribute('data-l'), text: t };
  }
  return null;
}

// ── W1 Cold load ────────────────────────────────────────────────────
for (const [view, scheme] of [['phone', 'light'], ['phone', 'dark'], ['desktop', 'light'], ['desktop', 'dark']]) {
  const { ctx, page } = await newPage(view, scheme);
  const tag = `${view === 'phone' ? '390' : '1280'}-${scheme}`;
  await rec.run(`W1-${tag}`, `Cold load (${tag})`, page, async (c) => {
    c.step('open index.html with empty storage');
    const t0 = Date.now();
    await page.goto(URL0, { waitUntil: 'networkidle' });
    c.note(`network idle after ${Date.now() - t0} ms`);
    await sleep(800);
    await c.shot(`w1-cold-${tag}`);
    const info = await ev(page, () => ({
      pill: document.getElementById('versionPill')?.textContent.trim(),
      ver: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
      theme: document.documentElement.getAttribute('data-theme'),
      text: document.body.innerText.trim().length,
    }));
    c.check(info.ver === APP_VERSION, `APP_VERSION in the page is ${info.ver}, file says ${APP_VERSION}`);
    c.check(info.pill === APP_VERSION, `version pill shows "${info.pill}", expected ${APP_VERSION}`);
    c.check(info.theme === scheme, `theme is ${info.theme} with the system set to ${scheme}`);
    c.check(info.text > 200, 'page looks blank (almost no text)');
    await clearAsks(page);
    await sleep(400);
    await c.shot(`w1-today-${tag}`);
    const today = await ev(page, () => ({ tab: document.body.dataset.tab, h: document.getElementById('screen-home')?.innerText.trim().length || 0 }));
    c.check(today.tab === 'home' && today.h > 50, `Today did not render after the welcome (tab=${today.tab}, text=${today.h})`);
  });
  await ctx.close();
}

// The rest of the walk runs on a phone (light) and a desktop (dark), each in
// its own fresh browser profile.
for (const [view, scheme] of [['phone', 'light'], ['desktop', 'dark']]) {
  const tag = `${view === 'phone' ? '390' : '1280'}-${scheme}`;
  const { ctx, page } = await newPage(view, scheme);
  await boot(page);
  const memo = {};

  // ── W2 Practice ───────────────────────────────────────────────────
  await rec.run(`W2-${tag}`, `Practice: answer, explanation + 3 tips, next; shuffle grading (${tag})`, page, async (c) => {
    await go(page, 'practice');
    await c.shot(`w2-hub-${tag}`);
    c.step('Practice hub → primary start button');
    await page.locator('#screen-practice .ph-go:visible').first().click();
    await sleep(800);
    for (let k = 0; k < 2; k++) {
      await page.locator('#qArea .opt').first().waitFor({ timeout: 10000 });
      const st = await ev(page, () => ({ id: S.current && S.current.id, shuffle: S.currentShuffle }));
      const q = bank[st.id];
      c.check(!!q, `question ${st.id} is not in data/domain*.json`);
      if (!q) return;
      const key = q.options[q.correct];
      const wantRight = k === 0;
      c.step(`Q${k + 1} ${st.id} (shuffle ${JSON.stringify(st.shuffle)}): pick the ${wantRight ? 'correct' : 'wrong'} option by its text`);
      const pick = wantRight ? await optionByText(page, '#qArea', key) : await anyOtherOption(page, '#qArea', key);
      c.check(!!pick, `could not find the ${wantRight ? 'correct' : 'other'} option on screen`);
      if (!pick) return;
      await pick.btn.click();
      await sleep(300);
      await c.shot(`w2-q${k + 1}-picked-${tag}`);
      await page.locator('#submitBtn').click();
      await page.locator('#vrHero').waitFor({ timeout: 5000 });
      await sleep(500);
      const hero = norm(await page.locator('#vrHero').innerText());
      c.check(wantRight ? /^Correct/.test(hero) : /^Not quite/.test(hero), `Q${k + 1}: picked the ${wantRight ? 'correct' : 'wrong'} text (letter ${pick.letter}) but the verdict says "${hero.slice(0, 40)}"`);
      const correctBtn = await optionByText(page, '#qArea', key);
      const cls = correctBtn ? await correctBtn.btn.getAttribute('class') : '';
      c.check(/\b(correct|reveal)\b/.test(cls || ''), `Q${k + 1}: the option with the key's text is not marked correct (class "${cls}")`);
      const heroLetter = (await page.locator('#vrHero .sr-only').innerText().catch(() => '')).match(/Best answer ([A-D])/);
      c.check(heroLetter && correctBtn && heroLetter[1] === correctBtn.letter, `Q${k + 1}: "Best answer" letter ${heroLetter && heroLetter[1]} is not the letter of the key's text (${correctBtn && correctBtn.letter})`);
      await c.shot(`w2-q${k + 1}-answer-${tag}`);
      if (!wantRight) {
        const rows = norm(await page.locator('#rPanel .vr-rows').innerText().catch(() => ''));
        c.check(rows.includes(norm(key)), `Q${k + 1}: the "Best answer" row does not show the key's text`);
        const more = page.locator('#vrReadMore');
        if (await visible(more)) { await more.click(); await sleep(300); }
      }
      const exp = norm(await page.locator('#vrExp').innerText().catch(() => ''));
      c.check(exp.length > 40, `Q${k + 1}: the explanation is missing or very short`);
      // The tips sit under the answer at every width (Grove Phase 4); the older
      // margin plate (.vm-plate) is still read if a build shows it.
      const tips = await ev(page, () => {
        const shown = (e) => e && e.offsetParent !== null;
        const inline = [...document.querySelectorAll('#rPanel .vine-elim, #rPanel .vine-final, #rPanel .vine-cue')]
          .filter(shown).map((e) => e.querySelector('.vine-cap')?.textContent.trim());
        if (inline.length) return inline;
        return [...document.querySelectorAll('.vm-plate .vm-t')].filter(shown).map((e) => e.textContent.trim());
      });
      c.check(tips.length === 3, `Q${k + 1}: ${tips.length} tips visible (${tips.join(', ')}), expected Eliminate two / Final two / Exam cue`);
      await page.locator('#rPanel .vine').first().scrollIntoViewIfNeeded().catch(() => {});
      await c.shot(`w2-q${k + 1}-tips-${tag}`);
      c.step('Next question');
      await page.locator('#vrNext').click();
      await sleep(800);
      const after = await ev(page, () => (S.current && S.current.id) || null);
      const debrief = await visible(page.locator('#sessionBoundaryArea *'));
      c.check(after !== st.id || debrief, `Q${k + 1}: Next question did not move on (still ${after})`);
    }
    memo.answered = await ev(page, () => S.score.t);
    c.check(memo.answered >= 2, `score shows ${memo.answered} answers after 2`);
  });

  // ── W3 Mock exam ──────────────────────────────────────────────────
  await rec.run(`W3-${tag}`, `Mock: answer 3, reload, resume (answers kept), submit, review letters (${tag})`, page, async (c) => {
    await go(page, 'practice', 'mock');
    await c.shot(`w3-setup-${tag}`);
    const fullLocked = await ev(page, () => !!(MOCK_TYPES.full && MOCK_TYPES.full.locked));
    if (SITE) c.check(fullLocked, 'on the free site the Full mock is not locked');
    if (fullLocked) {
      const lk = await ev(page, () => ({ card: !!document.querySelector('#screen-mock .mk-type-locked #mkT-full, .mk-type-locked #mkT-full'),
        startBtn: [...document.querySelectorAll('button')].some((b) => b.offsetParent && /Start full mock/i.test(b.textContent)),
        cap: (document.querySelector('.mk-type-locked .mk-type-cap') || {}).textContent || '',
        line: (document.querySelector('.mk-type-locked .mk-type-m') || {}).textContent || '',
        link: (document.querySelector('.mk-type-locked a') || {}).href || '' }));
      c.check(lk.card && /Part of the full course/.test(lk.cap), 'the locked Full mock card ("Part of the full course") is missing');
      c.check(!lk.startBtn, 'a "Start full mock" button is still on screen');
      // Web v13.1: the beta has closed and the full course is not open to
      // everyone yet, so the card says so and links nowhere.
      c.check(/not open to everyone yet/.test(lk.line), `the locked Full mock card does not say the full course is not open yet: "${lk.line}"`);
      c.check(!lk.link, `the locked Full mock card still links to ${lk.link}`);
    }
    c.step('Start mini mock → confirm');
    await page.locator('.mock-start-mini:visible').first().click();
    await page.locator('.mock-confirm-btn.gostart').click();
    await page.locator('#mOpts .opt').first().waitFor({ timeout: 15000 });
    const picks = [];
    for (let i = 0; i < 3; i++) {
      const id = await ev(page, () => S.current.id);
      const q = bank[id];
      const key = q.options[q.correct];
      const right = i !== 1; // Q1 right, Q2 wrong, Q3 right
      const pick = right ? await optionByText(page, '#mOpts', key) : await anyOtherOption(page, '#mOpts', key);
      const text = right ? key : pick.text;
      picks.push({ id, right, letter: pick.letter, text: norm(text), key: norm(key) });
      c.step(`Q${i + 1} ${id}: pick ${right ? 'the key' : 'a wrong option'} (letter ${pick.letter})`);
      await pick.btn.click();
      if (i === 2) await c.shot(`w3-q3-picked-${tag}`);
      await page.locator('#mkNext').click();
      await sleep(400);
    }
    const total = await ev(page, () => S.mockQueue.length);
    c.step(`reload the page mid-mock (mock has ${total} questions)`);
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1200);
    await clearAsks(page);
    if (!(await visible(page.locator('.mock-resume-btn')))) await go(page, 'practice', 'mock');
    await page.locator('.mock-resume-btn').first().waitFor({ timeout: 10000 });
    const banner = norm(await page.locator('.mock-resume-banner').innerText());
    c.check(/Question 4 of/.test(banner), `resume banner says "${banner.slice(0, 80)}", expected Question 4 of …`);
    await c.shot(`w3-resume-banner-${tag}`);
    const saved = await ev(page, () => S.mockAnswers.slice(0, 3).map((a) => ({ id: a.q && a.q.id, chosenOriginal: a.chosenOriginal, ok: a.ok })));
    picks.forEach((p, i) => {
      const s = saved[i] || {};
      c.check(s.id === p.id, `after reload, mock answer ${i + 1} is for ${s.id}, expected ${p.id}`);
      const t = s.chosenOriginal ? norm(bank[p.id].options[s.chosenOriginal]) : null;
      c.check(t === p.text, `after reload, mock answer ${i + 1} points at a different option than the one picked`);
      c.check(s.ok === p.right, `after reload, mock answer ${i + 1} is graded ${s.ok}, expected ${p.right}`);
    });
    c.step('Resume exam, answer the rest (first option) to the end');
    await page.locator('.mock-resume-btn').first().click();
    await page.locator('#mOpts .opt').first().waitFor({ timeout: 10000 });
    const meta = norm(await page.locator('#mkMeta').innerText());
    c.check(/Question 4 of/.test(meta), `resumed on "${meta}", expected question 4`);
    for (let guard = 0; guard < 400; guard++) {
      if (!(await visible(page.locator('#mOpts')))) break;
      await page.locator('#mOpts .opt').first().click();
      await page.locator('#mkNext').click();
    }
    await page.locator('#mrTitle').waitFor({ timeout: 10000 });
    await sleep(500);
    await c.shot(`w3-results-${tag}`);
    // Web v12.49: the review opens on the mistakes, five rows at a time; "All" shows every question in order.
    c.step('review: show All, then open the rows for the first 3 questions');
    await page.locator('.mr-seg [data-f="all"]').click();
    await sleep(200);
    for (let i = 0; i < 3; i++) {
      const item = page.locator('#mrList .mr-item').nth(i);
      await item.locator('.mr-row').click();
      await sleep(200);
      const status = norm(await item.locator('.mr-status').innerText());
      const p = picks[i];
      c.check(status === (p.right ? 'Correct' : 'Missed'), `review row ${i + 1}: status "${status}", expected ${p.right ? 'Correct' : 'Missed'}`);
      const opts = await item.locator('.mr-opt').evaluateAll((els) => els.map((e) => ({
        l: e.querySelector('.mr-l')?.textContent.trim(), t: e.querySelector('.mr-ot')?.textContent || '', tag: e.querySelector('.mr-tag')?.textContent || '' })));
      const best = opts.find((o) => /best answer/i.test(o.tag));
      const yours = opts.find((o) => /your answer/i.test(o.tag));
      c.check(best && norm(best.t) === p.key, `review row ${i + 1}: "Best answer" is on the wrong option text`);
      c.check(yours && norm(yours.t) === p.text, `review row ${i + 1}: "Your answer" is on a different option than the one picked`);
      if (!p.right) {
        // v12.49: "You C · Best A" on the row's right, in display letters.
        const m = norm(await item.locator('.mr-yb').innerText());
        const mm = m.match(/You ([A-D]) . Best ([A-D])/);
        c.check(mm && mm[1] === yours.l && mm[2] === best.l, `review row ${i + 1}: meta "${m}" letters do not match the rows (yours ${yours && yours.l}, best ${best && best.l})`);
      }
    }
    await page.locator('#mrList .mr-item').first().scrollIntoViewIfNeeded();
    await c.shot(`w3-review-${tag}`);
    memo.mockTotal = total;
    c.check(new Set(await ev(page, () => S.mockQueue.map((q) => q.id))).size === total, 'the mini mock has a question twice');
    const unknown = await ev(page, () => S.mockQueue.map((q) => q.id));
    const off = unknown.filter((id) => !bank[id]);
    c.check(!off.length, `the mini mock drew questions that are not in the served bank: ${off.slice(0, 5).join(', ')}`);
  });

  // ── W8 Practice this concept (from a study note) ─────────────────
  await rec.run(`W8-${tag}`, `Study note → Practice this concept: answer, verdict, explanation (${tag})`, page, async (c) => {
    await go(page, 'learn', 'notes');
    await page.locator('#topicsArea button', { hasText: 'Types of Audits' }).first().waitFor({ timeout: 10000 });
    const row = await openNote(page, '1A2.1');
    // Below the notes rail the button sits in the note; with the rail (desktop)
    // the note's own block is hidden and the rail's "Practice this note" starts it.
    const inNote = row.locator('.gt-practice-btn:visible');
    const inRail = page.locator('button[onclick^="railPracticeNote"]:visible');
    const btn = (await visible(inNote)) ? inNote.first() : inRail.first();
    c.check(await visible(btn), 'note 1A2.1 has no visible "Practice this concept" / "Practice this note" button');
    if (!(await visible(btn))) { await c.shot(`w8-note-${tag}`); return; }
    c.note(`button: "${norm(await btn.innerText())}"`);
    const sub = norm(await row.locator('.gt-practice-sub').innerText().catch(() => ''));
    if (sub) c.note(`button caption: "${sub}"`);
    await btn.scrollIntoViewIfNeeded();
    await c.shot(`w8-note-button-${tag}`);
    await btn.click();
    await page.locator('#qArea .opt').first().waitFor({ timeout: 10000 });
    await sleep(500);
    const id = await ev(page, () => S.current && S.current.id);
    const q = bank[id];
    c.check(!!q, `concept question ${id} is not in the served bank`);
    if (!q) return;
    c.step(`question ${id}: pick the key by its text`);
    const pick = await optionByText(page, '#qArea', q.options[q.correct]);
    c.check(!!pick, 'could not find the key option on screen');
    if (!pick) return;
    await pick.btn.click(); await sleep(200);
    await page.locator('#submitBtn').click();
    await page.locator('#vrHero').waitFor({ timeout: 5000 }); await sleep(400);
    const hero = norm(await page.locator('#vrHero').innerText());
    c.check(/^Correct/.test(hero), `picked the key (letter ${pick.letter}) but the verdict says "${hero.slice(0, 40)}"`);
    const exp = norm(await page.locator('#vrExp').innerText().catch(() => ''));
    c.check(exp.length > 40, 'the explanation is missing or very short');
    await c.shot(`w8-concept-answer-${tag}`);
    c.step('Next (or end of the set), then leave with the X');
    await page.locator('#vrNext').click(); await sleep(800);
    await c.shot(`w8-concept-next-${tag}`);
  });

  // ── W9 Saved ─────────────────────────────────────────────────────
  await rec.run(`W9-${tag}`, `Saved: bookmark a question, it lists and survives a reload; a full-course saved question is skipped calmly (${tag})`, page, async (c) => {
    await goPracticeHub(page);
    await page.locator('#screen-practice .ph-go:visible').first().click();
    await page.locator('#qArea .opt').first().waitFor({ timeout: 10000 });
    const id = await ev(page, () => S.current.id);
    c.step(`bookmark ${id} with the header button`);
    await page.locator('#bkBtn').click(); await sleep(300);
    c.check((await page.locator('#bkBtn').getAttribute('aria-pressed')) === 'true', 'the bookmark button did not switch on');
    await go(page, 'practice', 'saved');
    await sleep(500);
    const stem = norm(bank[id].question).slice(0, 50);
    const list1 = norm(await page.locator('#bkList').innerText());
    c.check(list1.includes(stem), 'Saved does not list the bookmarked question');
    await c.shot(`w9-saved-${tag}`);
    c.step('reload: still saved');
    await page.reload({ waitUntil: 'networkidle' }); await sleep(800); await clearAsks(page);
    await go(page, 'practice', 'saved'); await sleep(500);
    c.check(norm(await page.locator('#bkList').innerText()).includes(stem), 'after a reload Saved no longer lists the question');
    if (!SITE) return;
    // A question saved elsewhere that is not in the free sample (e.g. a backup
    // from before v12.50): the app should skip it without breaking Saved.
    const full = loadBank(fullRepo);
    const paid = Object.values(full).find((x) => !bank[x.id] && x.id.startsWith('d1_'));
    if (!paid) { c.note('no full-course question available to seed; skipped the full-course part'); return; }
    c.step(`seed a saved full-course question ${paid.id} beside ${id}, reload`);
    await ev(page, (pq) => { S.bookmarks.push(pq); saveState(); }, paid);
    await page.reload({ waitUntil: 'networkidle' }); await sleep(800); await clearAsks(page);
    await go(page, 'practice', 'saved'); await sleep(500);
    const ids = await ev(page, () => S.bookmarks.map((b) => b.id));
    c.check(ids.includes(id), `the free saved question ${id} is gone after seeding a full-course one`);
    c.check(!ids.includes(paid.id), `the full-course question ${paid.id} still shows in Saved`);
    // It must be kept in storage (not deleted), so it comes back with the full course.
    const savedState = () => ev(page, (pid) => ({ shown: S.bookmarks.map((b) => b.id), kept: (S.bookmarksLocked || []).map((b) => b.id),
      stored: Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes(pid)) }), paid.id);
    let st = await savedState();
    c.note(`after reload: shown ${JSON.stringify(st.shown)}, kept ${JSON.stringify(st.kept)}, in storage ${st.stored}`);
    const kept1 = st.stored;
    c.check(kept1, `the saved full-course question ${paid.id} was deleted from storage after a reload`);
    const list2 = norm(await page.locator('#bkList').innerText());
    c.check(list2.includes(stem) && !list2.includes(norm(paid.question).slice(0, 50)), 'Saved shows the wrong questions after seeding');
    await c.shot(`w9-saved-with-paid-${tag}`);
    c.step('remove the free one, reload: Saved shows the full-course row');
    await ev(page, (pq) => { S.bookmarks = [pq]; saveState(); }, paid);
    await page.reload({ waitUntil: 'networkidle' }); await sleep(800); await clearAsks(page);
    await go(page, 'practice', 'saved'); await sleep(500);
    st = await savedState();
    c.note(`after reload: shown ${JSON.stringify(st.shown)}, kept ${JSON.stringify(st.kept)}, in storage ${st.stored}`);
    const fc = await visible(page.locator('#bkList .fc-row'));
    c.check(fc, 'with only a full-course question saved, Saved does not show the "full course" row');
    if (fc) c.note(`Saved says: "${norm(await page.locator('#bkList .fc-row').innerText())}"`);
    await c.shot(`w9-saved-full-course-row-${tag}`);
    c.step('one more reload: the full-course save is still in storage');
    await page.reload({ waitUntil: 'networkidle' }); await sleep(800); await clearAsks(page);
    st = await savedState();
    c.note(`after reload: shown ${JSON.stringify(st.shown)}, kept ${JSON.stringify(st.kept)}, in storage ${st.stored}`);
    const kept2 = st.stored;
    c.check(kept2, `the saved full-course question ${paid.id} was deleted from storage after reloads`);
    // Leave Saved empty for W6 (the backup compares the counts before/after).
    await ev(page, () => { S.bookmarks = []; if (S.bookmarksLocked) S.bookmarksLocked = []; saveState(); });
  });

  // ── W4 Topics ────────────────────────────────────────────────────
  await rec.run(`W4-${tag}`, `Topics: open a note, it renders, mark it read (${tag})`, page, async (c) => {
    await go(page, 'learn', 'notes');
    await page.locator('#topicsArea .gt-row-btn, #topicsArea button').first().waitFor({ timeout: 10000 });
    c.step('open topic "Types of Audits, Assessments, and Reviews"');
    const row = await openNote(page, '1A2.1');
    const body = norm(await row.innerText());
    c.check(body.length > 300, `note 1A2.1 opened with only ${body.length} characters`);
    c.check(!/coming soon/i.test(body), 'note 1A2.1 says "coming soon"');
    await c.shot(`w4-note-${tag}`);
    const btn = row.locator('.gt-read-btn').first();
    await btn.scrollIntoViewIfNeeded();
    const before = await btn.getAttribute('aria-pressed');
    if (before !== 'true') { await btn.click(); await sleep(400); }
    c.check((await btn.getAttribute('aria-pressed')) === 'true', 'Mark as read did not switch the note to Read');
    await c.shot(`w4-marked-read-${tag}`);
    c.step('reload: the note stays read');
    await page.reload({ waitUntil: 'networkidle' }); await sleep(800); await clearAsks(page);
    const kept = await ev(page, () => !!getTopicReviewedSet()['1A2.1']);
    c.check(kept, 'note 1A2.1 is not read after a reload');
  });

  // ── W5 Glossary, Progress, Field Guide chart, theme ───────────────
  await rec.run(`W5-${tag}`, `Glossary search, Progress dashboard, Field Guide chart, theme toggle persists (${tag})`, page, async (c) => {
    await go(page, 'learn', 'glossary');
    await page.locator('#glossSearch').waitFor({ timeout: 10000 });
    const all = await page.locator('.gloss-card').count();
    c.step(`glossary shows ${all} cards; search "sampling"`);
    await page.locator('#glossSearch').fill('sampling');
    await sleep(500);
    const hits = await page.locator('.gloss-card').count();
    const hitText = norm(await page.locator('.gloss-list, #glossaryArea, #screen-glossary').first().innerText().catch(() => ''));
    c.check(hits > 0 && hits < all, `search "sampling" shows ${hits} of ${all} cards`);
    c.check(/sampl/i.test(hitText), 'search results do not mention sampling');
    await c.shot(`w5-glossary-${tag}`);
    await page.locator('#glossSearch').fill('zzqxjv');
    await sleep(400);
    c.check((await page.locator('.gloss-card').count()) === 0, 'a nonsense search still shows cards');
    await page.locator('#glossSearch').fill('');

    c.step('You → Your progress');
    await go(page, 'you', 'progress');
    await page.locator('#pgArea .pg').waitFor({ timeout: 10000 });
    await sleep(800);
    const pg = await ev(page, () => {
      const a = document.getElementById('pgArea');
      return { text: a.innerText, svgs: a.querySelectorAll('svg').length, loading: !!a.querySelector('.gt-loading'),
        head: (document.getElementById('pageRh')?.innerText || '') + ' ' + (a.querySelector('.pg-head')?.innerText || ''),
        rh: document.getElementById('pageRh')?.innerText || '',
        figs: [...a.querySelectorAll('.fg-fig')].map((e) => e.textContent.trim()) };
    });
    c.check(!pg.loading, 'Progress is stuck on "Loading your progress"');
    c.check(/Your progress/.test(pg.text), 'Progress heading missing');
    // No book labels on screen (expert decision, 31 Oct 2026): the running head is the date only.
    c.check(/\b\d{1,2} [A-Z]{3}\b/i.test(pg.rh), `running head shows no date (got "${pg.rh.trim()}")`);
    c.check(!/\bField (guide|record)\b|\bPlates?\b|\bFig\.\s?\d|\bFigure \d|\bHerbarium\b/i.test(pg.head + ' ' + pg.text), 'a book label ("Field record", "Plate", "Fig. N", "Herbarium") is on the Progress page');
    c.check(pg.svgs > 0, 'no chart (svg) on the Progress page');
    c.check(pg.figs.length > 0, 'no plate captions ("Five areas, one scale") on the Progress page');
    c.note(`Progress page: ${pg.svgs} svg drawings; plates: ${pg.figs.join(' | ')}`);
    await c.shot(`w5-progress-${tag}`);
    await c.shot(`w5-progress-full-${tag}`, page, true);

    c.step('You → Settings → Dark mode switch, reload, check it stuck, switch back');
    await go(page, 'you', 'settings');
    const t0 = await ev(page, () => document.documentElement.getAttribute('data-theme'));
    await page.locator('#darkToggleBtn').scrollIntoViewIfNeeded();
    await page.locator('#darkToggleBtn').click();
    await sleep(300);
    const t1 = await ev(page, () => document.documentElement.getAttribute('data-theme'));
    c.check(t1 !== t0, `the theme switch did nothing (still ${t1})`);
    await c.shot(`w5-theme-switched-${tag}`);
    await page.reload({ waitUntil: 'networkidle' }); await sleep(600); await clearAsks(page);
    const t2 = await ev(page, () => ({ t: document.documentElement.getAttribute('data-theme'), ls: localStorage.getItem('cisa_theme'), sw: document.getElementById('darkToggleBtn')?.getAttribute('aria-checked') }));
    c.check(t2.t === t1, `after reload the theme is ${t2.t}, chosen ${t1}`);
    c.check(t2.sw === (t1 === 'dark' ? 'true' : 'false'), `the Dark mode switch shows ${t2.sw} for theme ${t2.t}`);
    await c.shot(`w5-theme-after-reload-${tag}`);
    await go(page, 'you', 'settings');
    await page.locator('#darkToggleBtn').click();
    await sleep(300);
  });

  // ── W6 Backup round trip ─────────────────────────────────────────
  await rec.run(`W6-${tag}`, `Export backup, clear storage, import, progress back (${tag})`, page, async (c) => {
    const before = await ev(page, () => ({ t: S.score.t, c: S.score.c, mocks: (S.mockHistory || []).length, read: Object.keys(getTopicReviewedSet()).length,
      answered: Object.values(S.answeredIds || {}).reduce((n, o) => n + Object.keys(o || {}).length, 0) }));
    c.step(`before: ${JSON.stringify(before)}`);
    // Your data is on the Settings page (Grove C2): Back up and Restore rows.
    await go(page, 'you', 'settings');
    await page.locator('#setBackup').scrollIntoViewIfNeeded();
    await c.shot(`w6-your-data-${tag}`);
    const dl = page.waitForEvent('download');
    await page.locator('#setBackup').click();
    const file = path.join(outDir, `w6-backup-${tag}.json`);
    await (await dl).saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    c.check(data.cisaMindsetExport === true && data.version === 1, 'the backup file is missing its KaiSip marker');
    c.check(data.profile && data.profile.state && data.profile.state.score && data.profile.state.score.t === before.t, 'the backup file does not hold the current answers');
    c.step('clear all storage and reload (a new browser)');
    await ev(page, () => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle' }); await sleep(800);
    const welcome = await visible(page.getByRole('button', { name: 'Look around first' }));
    c.check(welcome, 'after clearing storage the welcome screen did not show');
    await clearAsks(page);
    const empty = await ev(page, () => S.score.t);
    c.check(empty === 0, `after clearing storage the app still shows ${empty} answers`);
    c.step('Settings → Your data → Restore → the exported file → Restore (this browser has no answers, so the sheet is a plain restore)');
    await go(page, 'you', 'settings');
    const chooser = page.waitForEvent('filechooser');
    await page.locator('#setRestore').click();
    await (await chooser).setFiles(file);
    // The sheet's confirm (the Settings row behind it is also named Restore).
    const restoreBtn = page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true });
    await restoreBtn.waitFor({ timeout: 5000 });
    await c.shot(`w6-import-confirm-${tag}`);
    await Promise.all([page.waitForEvent('load'), restoreBtn.click()]);
    await page.waitForLoadState('networkidle'); await sleep(800); await clearAsks(page);
    const after = await ev(page, () => ({ t: S.score.t, c: S.score.c, mocks: (S.mockHistory || []).length, read: Object.keys(getTopicReviewedSet()).length,
      answered: Object.values(S.answeredIds || {}).reduce((n, o) => n + Object.keys(o || {}).length, 0) }));
    c.step(`after: ${JSON.stringify(after)}`);
    for (const k of Object.keys(before)) c.check(after[k] === before[k], `after import, ${k} is ${after[k]}, was ${before[k]}`);
    await go(page, 'you', 'progress');
    await sleep(800);
    await c.shot(`w6-progress-after-import-${tag}`);
  });

  // ── W7 Phone reflow ──────────────────────────────────────────────
  if (view === 'phone') {
    await rec.run(`W7-${tag}`, 'At 390px: no horizontal scroll, tab bar reachable', page, async (c) => {
      const pages = [['today'], ['learn', 'notes'], ['learn', 'glossary'], ['practice'], ['practice', 'mock'], ['you'], ['you', 'settings'], ['you', 'progress']];
      for (const [sec, h] of pages) {
        await go(page, sec, h);
        await sleep(300);
        const m = await ev(page, () => {
          const nav = document.getElementById('bottomNav');
          const r = nav && nav.getBoundingClientRect();
          const items = nav ? [...nav.querySelectorAll('a')].map((a) => { const b = a.getBoundingClientRect(); return b.width >= 40 && b.height >= 40; }) : [];
          return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bsw: document.body.scrollWidth,
            navVisible: !!(nav && r.height > 0 && r.bottom <= window.innerHeight + 1 && r.top < window.innerHeight && getComputedStyle(nav).visibility !== 'hidden'),
            itemsOk: items.length === 4 && items.every(Boolean), tab: document.body.dataset.tab };
        });
        const label = `${sec}${h ? '/' + h : ''}`;
        c.check(m.sw <= m.cw + 1 && m.bsw <= m.cw + 1, `${label}: page is ${Math.max(m.sw, m.bsw)}px wide in a ${m.cw}px window (horizontal scroll)`);
        c.check(m.navVisible, `${label}: the bottom tab bar is not on screen`);
        c.check(m.itemsOk, `${label}: the 4 tab bar items are missing or smaller than 40px`);
        // Scrolled to the bottom, the tab bar must still be there.
        await page.mouse.wheel(0, 20000); await sleep(250);
        const still = await ev(page, () => { const r = document.getElementById('bottomNav').getBoundingClientRect(); return r.height > 0 && r.bottom <= window.innerHeight + 1; });
        c.check(still, `${label}: the tab bar is gone after scrolling to the bottom`);
      }
      await go(page, 'today');
      await c.shot('w7-today-390');
      // Focused practice hides the tab bar by design (there is an Exit); just record it.
      c.note('The tab bar is hidden by design inside a practice question and a mock question (they have their own exit button).');
    });
  }
  await ctx.close();
}

// ── W10 Today: "You've worked through the free questions" ───────────
// Free site only. A fresh profile with every loaded question marked answered
// (seeded through the app's own state, as a learner who finished them).
for (const [view, scheme] of [['phone', 'light'], ['desktop', 'dark']]) {
  const tag = `${view === 'phone' ? '390' : '1280'}-${scheme}`;
  if (!SITE) { rec.notTested(`W10-${tag}`, 'Today: free-questions-done card', 'only on the public site (SMOKE_WEB_SITE=1)'); continue; }
  const { ctx, page } = await newPage(view, scheme);
  await rec.run(`W10-${tag}`, `Today: the "worked through the free questions" card shows, has no counts, "Not now" hides it across reloads (${tag})`, page, async (c) => {
    await boot(page);
    await page.waitForFunction(() => !Object.keys(window.QB_LOADING || {}).length && Object.keys(DI).every((d) => (QB[d] || []).length), null, { timeout: 15000 });
    c.check(!(await visible(page.locator('#tdFs'))), 'the card shows on a fresh profile');
    const n = await ev(page, () => { let n = 0; Object.keys(DI).forEach((d) => { S.answeredIds[d] = S.answeredIds[d] || {}; (QB[d] || []).forEach((q) => { S.answeredIds[d][q.id] = true; n++; }); }); saveState(); return n; });
    const served = Object.keys(bank).length;
    c.check(n === served, `the app loaded ${n} questions, the served sample has ${served}`);
    c.step('mark every loaded question answered, reload, open Today');
    await page.reload({ waitUntil: 'networkidle' }); await sleep(1000); await clearAsks(page);
    await go(page, 'today'); await sleep(600);
    const card = page.locator('#tdFs');
    c.check(await visible(card), 'the "worked through the free questions" card is not on Today');
    if (!(await visible(card))) { await c.shot(`w10-today-${tag}`); return; }
    const txt = norm(await card.innerText());
    c.check(!/\d/.test(txt), `the card shows a number: "${txt}"`);
    await card.scrollIntoViewIfNeeded();
    await c.shot(`w10-free-done-card-${tag}`);
    c.step('Not now → card gone, reload → still gone');
    await card.locator('.td-fs-hide').click(); await sleep(400);
    c.check(!(await visible(page.locator('#tdFs'))), '"Not now" did not hide the card');
    await page.reload({ waitUntil: 'networkidle' }); await sleep(1000); await clearAsks(page);
    await go(page, 'today'); await sleep(600);
    c.check(!(await visible(page.locator('#tdFs'))), 'the card is back after a reload');
    const until = await ev(page, () => Number(localStorage.getItem('aurivan_free_sample_done_hidden_until')) - Date.now());
    c.check(until > 6 * 86400000, `"Not now" hides it for ${(until / 86400000).toFixed(1)} days, expected 7`);
    await c.shot(`w10-after-not-now-${tag}`);
    c.step('Practice with everything answered: a question, or the "domain complete" card and Restart');
    await goPracticeHub(page);
    await page.locator('#screen-practice .ph-go:visible').first().click();
    await sleep(1200);
    await c.shot(`w10-practice-after-all-${tag}`);
    if (!(await visible(page.locator('#qArea .opt')))) {
      const restart = page.getByRole('button', { name: /Restart/ });
      const done = norm(await page.locator('#screen-practice').innerText());
      c.note(`practice shows: "${done.slice(0, 120)}"`);
      c.check(await visible(restart), 'with every free question answered, Practice shows neither a question nor a Restart button');
      if (await visible(restart)) {
        await restart.first().click();
        await page.locator('#qArea .opt').first().waitFor({ timeout: 10000 });
        await c.shot(`w10-practice-restarted-${tag}`);
      }
    }
  });
  await ctx.close();
}

await browser.close();
const fails = rec.paths.filter((p) => p.status === 'FAIL').length;
console.log(`web: ${rec.paths.length} paths, ${fails} FAIL`);
