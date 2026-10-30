// KaiSip web smoke test (index.html over a local server).
// Usage: node web.mjs <repo_root> <out_dir> <base_url>
// Walks the web paths in .claude/agents/smoke-tester.md and writes
// web-results.json + screenshots to <out_dir>. Read-only on the app.
import fs from 'fs';
import path from 'path';
import { launch, Recorder, loadBank, norm, sleep } from './lib.mjs';

const [repo, outDir, base] = process.argv.slice(2);
if (!repo || !outDir || !base) { console.error('usage: node web.mjs <repo_root> <out_dir> <base_url>'); process.exit(2); }
const URL0 = base.replace(/\/$/, '') + '/index.html';
const ORIGIN = new URL(URL0).origin;
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const APP_VERSION = (html.match(/const APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
const bank = loadBank(repo);
const rec = new Recorder(outDir, 'web', { appVersion: APP_VERSION, url: URL0 });
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
const ev = (page, fn) => page.evaluate(fn);

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
      const tips = await page.locator('#rPanel .vine-elim, #rPanel .vine-final, #rPanel .vine-cue')
        .evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.querySelector('.vine-cap')?.textContent.trim()));
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
    c.step('open the review rows for the first 3 questions');
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
        const m = norm(await item.locator('.mr-meta').innerText());
        const mm = m.match(/You: ([A-D]) . Best: ([A-D])/);
        c.check(mm && mm[1] === yours.l && mm[2] === best.l, `review row ${i + 1}: meta "${m}" letters do not match the rows (yours ${yours && yours.l}, best ${best && best.l})`);
      }
    }
    await page.locator('#mrList .mr-item').first().scrollIntoViewIfNeeded();
    await c.shot(`w3-review-${tag}`);
    memo.mockTotal = total;
  });

  // ── W4 Topics ────────────────────────────────────────────────────
  await rec.run(`W4-${tag}`, `Topics: open a note, it renders, mark it read (${tag})`, page, async (c) => {
    await go(page, 'learn', 'notes');
    await page.locator('#topicsArea .gt-row-btn, #topicsArea button').first().waitFor({ timeout: 10000 });
    c.step('open topic "Types of Audits, Assessments, and Reviews"');
    await page.locator('#topicsArea button', { hasText: 'Types of Audits' }).first().click();
    await sleep(500);
    const row = page.locator('[id="ni-1A2.1"]');
    await row.locator('.gt-row-btn').click();
    await sleep(800);
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
        head: a.querySelector('.pg-head')?.innerText || '',
        figs: [...a.querySelectorAll('.fg-fig [aria-hidden="true"]')].map((e) => e.textContent.trim()) };
    });
    c.check(!pg.loading, 'Progress is stuck on "Loading your progress"');
    c.check(/Your progress/.test(pg.text), 'Progress heading missing');
    c.check(/Field record/i.test(pg.head), 'Field Guide running head ("Field record · Progress") missing');
    c.check(pg.svgs > 0, 'no chart (svg) on the Progress page');
    c.check(pg.figs.length > 0, 'no Field Guide plate captions ("Fig. N · …") on the Progress page');
    c.note(`Progress page: ${pg.svgs} svg drawings; plates: ${pg.figs.join(' | ')}`);
    await c.shot(`w5-progress-${tag}`);
    await c.shot(`w5-progress-full-${tag}`, page, true);

    c.step('You → Dark mode switch, reload, check it stuck, switch back');
    await go(page, 'you');
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
    await go(page, 'you');
    await page.locator('#darkToggleBtn').click();
    await sleep(300);
  });

  // ── W6 Backup round trip ─────────────────────────────────────────
  await rec.run(`W6-${tag}`, `Export backup, clear storage, import, progress back (${tag})`, page, async (c) => {
    const before = await ev(page, () => ({ t: S.score.t, c: S.score.c, mocks: (S.mockHistory || []).length, read: Object.keys(getTopicReviewedSet()).length,
      answered: Object.values(S.answeredIds || {}).reduce((n, o) => n + Object.keys(o || {}).length, 0) }));
    c.step(`before: ${JSON.stringify(before)}`);
    await go(page, 'you');
    await page.locator('button[onclick="showYourData()"]:visible').first().click();
    await page.getByRole('button', { name: 'Export progress' }).waitFor({ timeout: 5000 });
    await c.shot(`w6-your-data-${tag}`);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export progress' }).click();
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
    c.step('Your data → Import progress → the exported file → Replace my progress');
    await go(page, 'you');
    await page.locator('button[onclick="showYourData()"]').first().click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import progress' }).click();
    await (await chooser).setFiles(file);
    await page.getByRole('button', { name: 'Replace my progress' }).waitFor({ timeout: 5000 });
    await c.shot(`w6-import-confirm-${tag}`);
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Replace my progress' }).click()]);
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
      const pages = [['today'], ['learn', 'notes'], ['learn', 'glossary'], ['practice'], ['practice', 'mock'], ['you'], ['you', 'progress']];
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

await browser.close();
const fails = rec.paths.filter((p) => p.status === 'FAIL').length;
console.log(`web: ${rec.paths.length} paths, ${fails} FAIL`);
