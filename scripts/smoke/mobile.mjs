// KaiSip phone smoke test (the Expo app's web export, driven at 390x844).
// Usage: node mobile.mjs <repo_root> <out_dir> <base_url> <dialogs_base_url> <seed.json>
//   base_url          the SHIPPED build (cloud flag off), served with serve_spa.py
//   dialogs_base_url  the same app exported with the in-memory backend and
//                     EXPO_PUBLIC_AURIVAN_SHOTS=1 (run.sh). react-native-web's
//                     Alert.alert does nothing, so "Submit exam?" can only be
//                     answered in that build (it draws system alerts in the page).
//                     Pass "-" to skip the mock submit step.
//   seed.json         mobile/scripts/screenshots/make_seed.py output (demo learner)
// Walks the phone paths in .claude/agents/smoke-tester.md and writes
// mobile-results.json + screenshots to <out_dir>. Read-only on the app.
import fs from 'fs';
import path from 'path';
import { launch, Recorder, norm, sleep } from './lib.mjs';

const [repo, outDir, base0, dialogs0, seedFile] = process.argv.slice(2);
if (!repo || !outDir || !base0 || !dialogs0 || !seedFile) {
  console.error('usage: node mobile.mjs <repo_root> <out_dir> <base_url> <dialogs_base_url|-> <seed.json>');
  process.exit(2);
}
const BASE = base0.replace(/\/$/, '');
const DIALOGS = dialogs0 === '-' ? null : dialogs0.replace(/\/$/, '');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const GEN = path.join(repo, 'mobile/src/content/generated/cisa');
const bank = {};
for (let d = 1; d <= 5; d++) for (const q of JSON.parse(fs.readFileSync(path.join(GEN, `d${d}.json`), 'utf8'))) bank[q.id] = q;
// Field Guide (a matching drill) pairs key terms from the study notes with their meanings.
const TERMS = new Map();
(function walk(o) {
  if (Array.isArray(o)) { o.forEach(walk); return; }
  if (!o || typeof o !== 'object') return;
  const def = o.definition || o.meaning;
  if (typeof o.term === 'string' && typeof def === 'string') {
    const k = norm(o.term).toLowerCase();
    TERMS.set(k, [...(TERMS.get(k) || []), norm(def)]);
  }
  Object.values(o).forEach(walk);
})(JSON.parse(fs.readFileSync(path.join(GEN, 'notes.json'), 'utf8')));
const appJson = JSON.parse(fs.readFileSync(path.join(repo, 'mobile/app.json'), 'utf8'));
const rec = new Recorder(outDir, 'mobile', { appVersion: appJson.expo && appJson.expo.version, url: BASE, dialogs: DIALOGS });
const browser = await launch();
const LETTERS = ['A', 'B', 'C', 'D'];
const SLOW_MS = Number(process.env.SMOKE_SLOW_MS) || 5000; // a screen slower than this to settle FAILs M7
const NOTE_MS = 2500; // slower than this is listed as a note

// Seeds are written once per browser context (like the screenshot harness),
// so a step can change storage and reload to see the result.
const keysOf = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('__')));
async function phone(store, scheme = 'light', origin = new URL(BASE).origin) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    colorScheme: scheme, acceptDownloads: true, reducedMotion: 'reduce' });
  if (store) {
    await ctx.addInitScript((s) => {
      if (localStorage.getItem('__seeded')) return;
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      localStorage.setItem('__seeded', '1');
    }, store);
  }
  const page = await ctx.newPage();
  rec.watch(page, origin);
  return { ctx, page };
}
const visible = async (loc) => { try { return await loc.first().isVisible(); } catch { return false; } };
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const open = async (page, base, p, ms = 1500) => { await page.goto(base + p, { waitUntil: 'networkidle' }); await sleep(ms); };
const store = (page, key) => ev(page, (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, key);
// Inactive tab screens stay mounted under aria-hidden="true": they do not count.
const headings = (page) => ev(page, () => [...document.querySelectorAll('[role=heading]')].filter((e) => e.offsetParent !== null && !e.closest('[aria-hidden="true"]'))
  .map((e) => (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
const bodyText = (page) => ev(page, () => {
  // The text a learner can see: the hidden (aria-hidden) tab screens are left out for the read.
  const hid = [...document.querySelectorAll('[aria-hidden="true"]')].map((e) => [e, e.style.display]);
  hid.forEach(([e]) => { e.style.display = 'none'; });
  const t = document.body.innerText || '';
  hid.forEach(([e, d]) => { e.style.display = d; });
  return t;
});
/** A screen is "blank" when it shows almost no text and no heading. */
async function notBlank(page) {
  const h = await headings(page);
  const t = norm(await bodyText(page));
  return { ok: t.length > 60 && h.length > 0, h, len: t.length };
}
async function tab(page, name) {
  await page.getByRole('tab', { name: new RegExp(`^${name}`) }).first().click();
}
/** The session in storage: current question, its permutation and the responses. */
async function current(page) {
  const s = await store(page, 'aurivan.session.v1');
  const a = s && s.state && s.state.active;
  if (!a) return null;
  const id = a.questionIds[a.index];
  return { a, id, perm: a.perms[id], q: bank[id] };
}
const dispOf = (orig, perm) => LETTERS[perm.indexOf(orig)];
/** Answer the question on screen: right=true picks the key, false the first other option. Returns the pick. */
async function answer(page, right) {
  const cur = await current(page);
  if (!cur || !cur.q) throw new Error(`no active question in the session store (${cur && cur.id})`);
  const keyDisp = dispOf(cur.q.correct, cur.perm);
  const disp = right ? keyDisp : cur.perm.map((o, i) => [o, LETTERS[i]]).find(([o]) => o !== cur.q.correct)[1];
  const optText = norm(cur.q.options[cur.perm[LETTERS.indexOf(disp)]]);
  const btn = page.getByLabel(new RegExp(`^Option ${disp}:`)).first();
  const label = norm(await btn.getAttribute('aria-label'));
  await btn.click();
  return { id: cur.id, disp, keyDisp, right, optText, labelMatches: label.includes(optText.slice(0, 40)), index: cur.a.index };
}

// ── The large save for M7: every question answered, many mistakes and reviews,
// a dozen mocks, notes read, bookmarks. Built from the seed + the content pack.
function largeSeed() {
  const p = JSON.parse(seed['aurivan.progress.v1']);
  const cp = p.state.byCert.cisa;
  const now = Date.now(); const day = 86400000;
  let n = 0;
  for (const q of Object.values(bank)) {
    n++;
    const ok = n % 10 < 7; const t = now - (n % 60) * day - n * 1000;
    cp.answers[q.id] = { attempts: 1 + (n % 3), correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: t };
    if (!ok) {
      cp.mistakes[q.id] = { picked: LETTERS.find((l) => l !== q.correct && q.options[l]), at: t, ...(n % 3 ? { slip: ['priority', 'role', 'tech-first'][n % 3] } : {}) };
      cp.review[q.id] = { box: 1 + (n % 4), dueAt: now - (n % 5) * 3600000, lastSeen: t, reps: 1 + (n % 3) };
    }
  }
  cp.bookmarks = Object.keys(bank).filter((_, i) => i % 25 === 0);
  cp.mocks = Array.from({ length: 12 }, (_, i) => {
    const total = i % 3 ? 50 : 150; const correct = Math.round(total * (0.55 + i * 0.02));
    const byDomain = {}; const w = { 1: .18, 2: .18, 3: .12, 4: .26, 5: .26 };
    for (const d of ['1', '2', '3', '4', '5']) { const t = Math.round(total * w[d]); byDomain[d] = { total: t, correct: Math.round(t * correct / total) }; }
    return { id: `mock-smoke-${i}`, finishedAt: now - (60 - i * 4) * day, total, correct, minutesUsed: total === 150 ? 220 : 75, byDomain, timing: 'standard', minutesAllowed: total === 150 ? 240 : 80, medianSec: 85, unanswered: 0 };
  });
  try {
    const notes = JSON.parse(fs.readFileSync(path.join(GEN, 'notes.json'), 'utf8'));
    const ids = notes.domains.flatMap((d) => d.topics.flatMap((t) => t.subtopics.map((s) => s.id)));
    cp.notesRead = ids.filter((_, i) => i % 2 === 0); cp.notesViewed = ids.filter((_, i) => i % 3 === 0);
  } catch { /* notes optional */ }
  const out = keysOf(seed);
  delete out['aurivan.session.v1'];
  out['aurivan.progress.v1'] = JSON.stringify(p);
  return { store: out, answers: Object.keys(cp.answers).length, bytes: out['aurivan.progress.v1'].length };
}
// The demo learner without the demo's open session (each path starts its own).
const demo = (() => { const s = keysOf(seed); delete s['aurivan.session.v1']; return s; })();
const answersIn = (p) => Object.keys((p && p.state && p.state.byCert && p.state.byCert.cisa && p.state.byCert.cisa.answers) || {}).length;

// ── M1 First launch → onboarding → first questions → Today ─────────────────
{
  const { ctx, page } = await phone(null);
  await rec.run('M1', 'First launch, onboarding finishes, Today shows a plan', page, async (c) => {
    c.step('open the app with empty storage');
    await open(page, BASE, '/', 2000);
    c.check(/\/onboarding/.test(page.url()), `a new phone opened ${page.url()}, expected the welcome (onboarding)`);
    await c.shot('m1-welcome');
    await page.getByRole('button', { name: 'Get started', exact: true }).click(); await sleep(800);
    c.step('Step 1: Some IT audit experience → Continue');
    await page.getByRole('radio', { name: /^Some IT audit experience/ }).first().click(); await sleep(300);
    await page.getByRole('button', { name: 'Continue', exact: true }).click(); await sleep(800);
    c.step('Step 2: In 3 months, default minutes → Start my first questions');
    await page.getByRole('button', { name: /^In 3 months$/ }).first().click(); await sleep(300);
    await c.shot('m1-onboarding-step2');
    await page.getByRole('button', { name: 'Start my first questions' }).first().click(); await sleep(2000);
    c.check(/\/session/.test(page.url()), `after onboarding the app is on ${page.url()}, expected the first questions`);
    const st = await store(page, 'aurivan.settings.v1');
    c.check(st && st.state && st.state.onboarded === true, 'settings do not say onboarded after the last step');
    const s0 = await current(page);
    const total = s0 ? s0.a.questionIds.length : 0;
    c.step(`first set: ${total} questions, answering each (2nd and 4th wrong)`);
    let right = 0;
    for (let i = 0; i < total; i++) {
      const want = !(i === 1 || i === 3);
      const p = await answer(page, want);
      c.check(p.labelMatches, `Q${i + 1} ${p.id}: option ${p.disp}'s text on screen is not the one the shuffle maps it to`);
      await page.getByText('Check answer', { exact: true }).click(); await sleep(1000);
      const h = (await headings(page)).join(' | ');
      if (i === 0) await c.shot('m1-first-answer');
      if (want) { right++; c.check(/^Correct/.test(h) || / Correct/.test(h), `Q${i + 1} ${p.id}: picked the key (${p.disp}) but the verdict reads "${h.slice(0, 80)}"`); }
      else c.check(new RegExp(`Not quite\\. Best answer ${p.keyDisp}\\b`).test(h), `Q${i + 1} ${p.id}: picked ${p.disp}, key shows as ${p.keyDisp}, verdict reads "${h.slice(0, 80)}"`);
      const nxt = page.getByText(/^(Next question|See results|Done)$/).first();
      await nxt.click(); await sleep(1500);
    }
    c.check(/\/results/.test(page.url()), `after the first set the app is on ${page.url()}, expected the closing screen`);
    const ct = norm(await bodyText(page));
    c.check(new RegExp(`${right} of ${total}`).test(ct), `closing screen does not say "${right} of ${total}"`);
    await c.shot('m1-closing');
    c.step('Done for today → Today');
    const done = page.getByRole('button', { name: /^Done for today/ });
    if (await visible(done)) await done.first().click(); else await tab(page, 'Today');
    await sleep(2000);
    c.check(/\/home/.test(page.url()), `"Done for today" went to ${page.url()}`);
    const nb = await notBlank(page);
    c.check(nb.ok, `Today looks blank (${nb.len} characters, headings: ${nb.h.join(', ')})`);
    c.note(`Today headings: ${nb.h.join(' | ')}`);
    await c.shot('m1-today');
    const prog = await store(page, 'aurivan.progress.v1');
    c.check(answersIn(prog) === total, `progress holds ${answersIn(prog)} answers after the first set of ${total}`);
    const plan = prog && prog.state && prog.state.days && prog.state.days.cisa;
    c.check(plan && Array.isArray(plan.items) && plan.items.length > 0, 'no study plan for today in saved progress');
    if (plan) c.note(`today's plan: ${plan.items.map((x) => x.kind + (x.count ? ' ' + x.count : '')).join(', ')} (done: ${JSON.stringify(plan.done)})`);
  });
  await ctx.close();
}

// ── M2 Tabs and the old Play link ───────────────────────────────────────────
{
  const { ctx, page } = await phone(demo);
  await rec.run('M2', 'Tabs Today, Learn, Practice, You switch with no blank screen; old Play links open Practice → Drills', page, async (c) => {
    await open(page, BASE, '/home', 2000);
    const order = ['Learn', 'Practice', 'You', 'Today', 'Practice', 'Learn', 'You', 'Today'];
    const expect = { Today: /\/home/, Learn: /\/learn/, Practice: /\/practice/, You: /\/you/ };
    // A heading only that tab shows, so a stale screen from the last tab cannot pass.
    const own = { Today: /days to go|Today’s study|Also today/i, Learn: /^Learn$/, Practice: /^Practice$/, You: /READINESS|^Figure/i };
    for (const name of order) {
      const t0 = Date.now();
      await tab(page, name);
      let nb = { ok: false, h: [], len: 0 };
      for (let k = 0; k < 25 && !(nb.ok && nb.h.some((x) => own[name].test(x))); k++) { await sleep(200); nb = await notBlank(page); }
      const ms = Date.now() - t0;
      c.check(nb.h.some((x) => own[name].test(x)), `${name} tab does not show its own heading (visible headings: ${nb.h.slice(0, 4).join(' | ')})`);
      c.check(expect[name].test(page.url()), `the ${name} tab opened ${page.url()}`);
      c.check(nb.ok, `${name} tab is blank after ${ms} ms (${nb.len} characters)`);
      const sel = await page.getByRole('tab', { name: new RegExp(`^${name}`) }).first().getAttribute('aria-selected');
      c.check(sel === 'true', `${name} tab is not marked selected`);
      c.step(`${name}: content after ${ms} ms (${nb.h.slice(0, 2).join(' / ')})`);
      if (!fs.existsSync(path.join(outDir, `m2-tab-${name.toLowerCase()}.png`))) { await sleep(400); await c.shot(`m2-tab-${name.toLowerCase()}`); }
    }
    c.step('open the old /play link');
    await open(page, BASE, '/play', 2200);
    c.check(/\/practice/.test(page.url()), `/play landed on ${page.url()}, expected Practice`);
    const drills = page.getByRole('heading', { name: /^Drills/ }).first();
    const box = await drills.boundingBox().catch(() => null);
    c.check(box && box.y >= 0 && box.y < 844, `/play: the Drills heading is not on screen (box ${JSON.stringify(box)})`);
    await c.shot('m2-play-redirect');
    c.step('open /practice?section=drills directly');
    await open(page, BASE, '/practice?section=drills', 2200);
    const box2 = await page.getByRole('heading', { name: /^Drills/ }).first().boundingBox().catch(() => null);
    c.check(box2 && box2.y >= 0 && box2.y < 844, '/practice?section=drills: the Drills heading is not on screen');
  });
  await ctx.close();
}

// ── M3 Practice session to results ─────────────────────────────────────────
{
  const { ctx, page } = await phone(demo);
  await rec.run('M3', 'Practice: answer, check, explanation and tips, finish, results', page, async (c) => {
    await open(page, BASE, '/practice', 1800);
    await c.shot('m3-practice-tab');
    c.step('Picked for you → Start');
    await page.getByRole('button', { name: 'Start', exact: true }).first().click(); await sleep(1800);
    c.check(/\/session/.test(page.url()), `Start opened ${page.url()}`);
    const s0 = await current(page);
    const total = s0 ? s0.a.questionIds.length : 0;
    c.step(`session of ${total}; Q1 wrong, then alternate`);
    let right = 0;
    for (let i = 0; i < total; i++) {
      const want = i % 2 === 1;
      const p = await answer(page, want);
      c.check(p.labelMatches, `Q${i + 1} ${p.id}: option ${p.disp}'s text is not the one the shuffle maps it to`);
      if (i < 2) await c.shot(`m3-q${i + 1}-picked`);
      await page.getByText('Check answer', { exact: true }).click(); await sleep(1000);
      const h = (await headings(page)).join(' | ');
      if (want) { right++; c.check(/Correct/.test(h) && !/Not quite/.test(h), `Q${i + 1} ${p.id}: picked the key but the verdict reads "${h.slice(0, 80)}"`); }
      else c.check(new RegExp(`Not quite\\. Best answer ${p.keyDisp}\\b`).test(h), `Q${i + 1} ${p.id}: picked ${p.disp}, key shows as ${p.keyDisp}, verdict reads "${h.slice(0, 80)}"`);
      // The stored response is graded on ORIGINAL letters.
      const after = await current(page);
      const r = after && after.a.responses[p.id];
      c.check(r && r.display === p.disp && r.correct === want, `Q${i + 1} ${p.id}: stored response ${JSON.stringify(r)} does not match the pick (${p.disp}, correct=${want})`);
      if (i < 2) {
        // Phone 1.53: the answer screen leads with one captioned plate (Fig. 4). After a miss it
        // reads "Your pick, and the best answer"; after a right answer, "Your answer".
        const plate = page.locator('[data-testid="answer-plate"]').first();
        if (await visible(plate)) { await plate.evaluate((e) => e.scrollIntoView({ block: 'center' })).catch(() => {}); await sleep(400); }
        const cap = want ? /Fig\.\s*4\W+Your answer/ : /Fig\.\s*4\W+Your pick, and the best answer/;
        c.check(cap.test(await bodyText(page)), `Q${i + 1}: the answer plate caption is not "${want ? 'Fig. 4 · Your answer' : 'Fig. 4 · Your pick, and the best answer'}"`);
        await c.shot(`m3-q${i + 1}-plate`);
        const more = page.getByRole('button', { name: /^Read more/ });
        if (await visible(more)) { await more.first().click(); await sleep(600); }
        const why = h.match(/Why ([A-D])/);
        c.check(why && why[1] === p.keyDisp, `Q${i + 1}: explanation heading "Why ${why && why[1]}" is not the key's letter ${p.keyDisp}`);
        const exp = norm(await bodyText(page));
        c.check(exp.length > 400, `Q${i + 1}: the answer screen has very little text (explanation missing?)`);
        const tips = await ev(page, () => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'))
          .filter((t) => /^(Eliminate|Final two|Exam cue)/.test(t)).map((t) => t.split(':')[0]));
        const uniq = [...new Set(tips)];
        c.check(uniq.length === 3, `Q${i + 1}: ${uniq.length} tips on the answer screen (${uniq.join(', ')}), expected Eliminate / Final two / Exam cue`);
        await c.shot(`m3-q${i + 1}-answer`);
        await page.mouse.move(195, 500); await page.mouse.wheel(0, 1600); await sleep(500);
        await c.shot(`m3-q${i + 1}-tips`);
      }
      await page.getByText(/^(Next question|See results)$/).first().click(); await sleep(1400);
    }
    c.check(/\/results/.test(page.url()), `after the last question the app is on ${page.url()}`);
    const h = (await headings(page)).join(' | ');
    c.check(new RegExp(`\\b${right} of ${total} right`).test(h), `results heading "${h.slice(0, 60)}", expected "${right} of ${total} right"`);
    const rows = await page.getByRole('button', { name: /^Question \d+, (Correct|Missed)/ }).count();
    c.check(rows === total, `results list ${rows} review rows, expected ${total}`);
    await c.shot('m3-results');
    const prog = await store(page, 'aurivan.progress.v1');
    c.note(`progress now holds ${answersIn(prog)} answers (demo had ${answersIn(JSON.parse(seed['aurivan.progress.v1']))})`);
  });
  await ctx.close();
}

// ── M4 Mock: start, answer, leave, resume, submit, review ──────────────────
{
  const B = DIALOGS || BASE;
  const { ctx, page } = await phone(demo, 'light', new URL(B).origin);
  await rec.run('M4', 'Mock: start, answer, leave and come back, resume, submit, review', page, async (c) => {
    if (!DIALOGS) c.note('no dialogs build: "Submit exam?" cannot be answered on a plain web export, submit is skipped');
    else c.note(`run on the dialogs build (${B}): same app, built with the in-memory backend so the "Submit exam?" system alert is drawn in the page`);
    await open(page, B, '/practice', 1800);
    c.step('Practice → Mini mock → Start mock');
    await page.getByRole('button', { name: /^Mini mock/ }).first().click(); await sleep(1500);
    c.check(/\/mock-start/.test(page.url()), `Mini mock opened ${page.url()}`);
    await c.shot('m4-mock-start');
    await page.getByRole('button', { name: 'Start mock' }).first().click(); await sleep(1800);
    const s0 = await current(page);
    c.check(s0 && s0.a.mode === 'mock', `the session is not a mock (${s0 && s0.a.mode})`);
    const total = s0 ? s0.a.questionIds.length : 0;
    const picks = [];
    for (let i = 0; i < 3; i++) {
      const p = await answer(page, i !== 1);
      picks.push(p);
      c.step(`Q${i + 1} ${p.id}: picked ${p.disp} (${p.right ? 'the key' : 'wrong; key shows as ' + p.keyDisp})`);
      await sleep(300);
      if (i === 2) await c.shot('m4-q3-picked');
      await page.getByRole('button', { name: 'Next', exact: true }).first().click(); await sleep(800);
    }
    c.step('leave the app (close the page), open it again');
    await page.close();
    const page2 = await ctx.newPage();
    rec.watch(page2, new URL(B).origin);
    await open(page2, B, '/', 2500);
    const resume = page2.getByRole('button', { name: /^Resume: .*mock/i });
    c.check(await visible(resume), 'Today shows no "Resume: Mini mock" row after coming back');
    await c.shot('m4-today-resume', page2);
    if (await visible(resume)) await resume.first().click(); else await open(page2, B, '/session', 1500);
    await sleep(1800);
    const s1 = await current(page2);
    c.check(s1 && s1.a.index === 3, `resumed on question ${s1 && s1.a.index + 1}, expected 4`);
    for (const p of picks) {
      const r = s1 && s1.a.responses[p.id];
      c.check(r && r.display === p.disp && r.correct === p.right, `after coming back, ${p.id} has response ${JSON.stringify(r)}, picked ${p.disp}`);
    }
    c.step('Previous → question 3 shows its picked option');
    await page2.getByRole('button', { name: 'Previous question' }).first().click(); await sleep(900);
    // (The web build cannot show which option is selected through aria: react-native-web drops
    // accessibilityState. The screenshot shows the ring; the saved response is checked here.)
    const s2 = await current(page2);
    c.check(s2 && s2.id === picks[2].id, `Previous opened ${s2 && s2.id}, expected question 3 (${picks[2].id})`);
    c.check(s2 && s2.a.responses[picks[2].id] && s2.a.responses[picks[2].id].display === picks[2].disp, `question 3 no longer holds the picked option ${picks[2].disp}`);
    await c.shot('m4-resumed-q3', page2);
    if (!DIALOGS) return;
    c.step('Questions navigator → Submit exam → Submit');
    await page2.getByRole('button', { name: /^Questions, question navigator/ }).first().click(); await sleep(900);
    const answered = await page2.getByRole('button', { name: /^Question \d+, answered/ }).count();
    c.check(answered === 3, `the navigator shows ${answered} answered, expected 3`);
    await c.shot('m4-navigator', page2);
    await page2.getByRole('button', { name: 'Submit exam', exact: true }).first().click(); await sleep(700);
    const dlg = page2.getByRole('alertdialog');
    c.check(await visible(dlg), 'no "Submit exam?" dialog');
    await c.shot('m4-submit-dialog', page2);
    await dlg.getByRole('button', { name: 'Submit' }).click(); await sleep(2500);
    c.check(/\/results/.test(page2.url()), `after Submit the app is on ${page2.url()}`);
    const right = picks.filter((p) => p.right).length;
    const h = (await headings(page2)).join(' | ');
    c.check(new RegExp(`\\b${right} of ${total}\\b`).test(h) || new RegExp(`\\b${right} of ${total}\\b`).test(norm(await bodyText(page2))), `mock results do not show ${right} of ${total} (headings: ${h.slice(0, 100)})`);
    await c.shot('m4-results', page2);
    const prog = await store(page2, 'aurivan.progress.v1');
    const mocks = prog.state.byCert.cisa.mocks || [];
    const last = mocks[mocks.length - 1];
    c.check(last && last.total === total && last.correct === right, `saved mock result ${JSON.stringify(last && { total: last.total, correct: last.correct })}, expected ${right} of ${total}`);
    c.step('review rows 1-3: status and letters');
    for (let i = 0; i < 3; i++) {
      const p = picks[i];
      const row = page2.getByRole('button', { name: new RegExp(`^Question ${i + 1}, (Correct|Missed)`) }).first();
      const lab = await row.getAttribute('aria-label');
      c.check(new RegExp(`^Question ${i + 1}, ${p.right ? 'Correct' : 'Missed'}`).test(lab), `review row ${i + 1} says "${lab.slice(0, 40)}", expected ${p.right ? 'Correct' : 'Missed'}`);
      await row.scrollIntoViewIfNeeded(); await row.click(); await sleep(700);
      const txt = await ev(page2, () => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((t) => /^(Your answer|Your pick|Best answer)/i.test(t)));
      const best = txt.find((t) => /^Best answer/i.test(t)) || '';
      // The review labels the learner's wrong pick "Your pick" since mobile 1.53 ("Your answer" before).
      const yours = txt.find((t) => /^Your (answer|pick)/i.test(t)) || '';
      c.check(new RegExp(`^Best answer,? ${p.keyDisp}\\b`).test(best) || norm(best).includes(norm(bank[p.id].options[bank[p.id].correct]).slice(0, 30)), `review row ${i + 1}: best-answer line "${best.slice(0, 60)}" is not letter ${p.keyDisp}`);
      if (!p.right) c.check(new RegExp(`^Your (answer|pick),? ${p.disp}\\b`).test(yours) || norm(yours).includes(p.optText.slice(0, 30)), `review row ${i + 1}: your-answer line "${yours.slice(0, 60)}" is not letter ${p.disp}`);
      c.note(`review row ${i + 1}: ${[best, yours].filter(Boolean).map((t) => t.slice(0, 40)).join(' / ')}`);
      if (i === 1) await c.shot('m4-review-missed', page2);
      await row.click(); await sleep(300);
    }
  });
  await ctx.close();
}

// ── M5 Learn (lesson + study note) and every unlocked drill ────────────────
{
  const { ctx, page } = await phone(demo);
  await rec.run('M5a', 'Learn: open a lesson and a study note', page, async (c) => {
    await open(page, BASE, '/learn', 1800);
    c.step('Learn → Start lesson (the suggested lesson)');
    await page.getByRole('button', { name: /^Start lesson/ }).first().click(); await sleep(1500);
    c.check(/\/lesson\//.test(page.url()), `Start lesson opened ${page.url()}`);
    const lessonId = page.url().split('/lesson/')[1];
    await c.shot('m5-lesson-cover');
    let steps = 0; let done = false;
    for (; steps < 40; steps++) {
      const fin = page.getByRole('button', { name: /^(Done|Finish|Back to Learn|Finish lesson)$/ });
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if (await visible(next)) {
        if (await next.first().isDisabled()) { await page.getByLabel(/^Option A:/).first().click(); await sleep(500); if (!c.checkShot) { c.checkShot = true; await c.shot('m5-lesson-check'); } }
        await next.first().click(); await sleep(400);
      } else if (await visible(fin)) {
        // The last scene can be a quick check: its finish button opens once it is answered.
        if (await fin.first().isDisabled()) { await page.getByLabel(/^Option A:/).first().click(); await sleep(600); }
        done = true; break;
      }
      else { const body = norm(await bodyText(page)); if (/Lesson complete/i.test(body)) { done = true; break; } await sleep(400); }
    }
    const body = norm(await bodyText(page));
    c.check(done || /Lesson complete/i.test(body), `the lesson did not reach its end in ${steps} steps`);
    await c.shot('m5-lesson-end');
    c.step(`lesson ${lessonId}: ${steps} steps to the end`);
    const fin = page.getByRole('button', { name: /^(Done|Finish|Back to Learn|Finish lesson)$/ });
    if (await visible(fin)) { await fin.first().click(); await sleep(1200); }
    const prog = await store(page, 'aurivan.progress.v1');
    c.check((prog.state.byCert.cisa.lessonsDone || []).includes(lessonId), `lesson ${lessonId} is not in lessonsDone after finishing`);

    c.step('Learn → Study notes → first domain → first note');
    await open(page, BASE, '/learn', 1500);
    await page.getByRole('button', { name: /^Study notes/ }).first().click(); await sleep(1500);
    c.check(/\/notes/.test(page.url()), `Study notes opened ${page.url()}`);
    await c.shot('m5-notes-home');
    await page.getByRole('button', { name: /Information System Auditing Process|Domain 1/ }).first().click(); await sleep(1500);
    c.check(/\/notes\/1/.test(page.url()), `the first domain opened ${page.url()}`);
    // Topics may be folded: open the first note row (a subtopic link).
    const before = page.url();
    const rows = page.getByRole('button').filter({ hasText: /Types of Audits|Audit|Charter|Risk/ });
    let opened = false;
    for (let k = 0; k < Math.min(await rows.count(), 6) && !opened; k++) {
      await rows.nth(k).click(); await sleep(1200);
      if (/\/notes\/subtopic\//.test(page.url())) opened = true;
    }
    if (!opened) { c.note('could not reach a note from the domain page by tapping; opened /notes/subtopic/1A2.1 directly'); await open(page, BASE, '/notes/subtopic/1A2.1', 1500); }
    c.step(`note page ${page.url().replace(BASE, '')} (from ${before.replace(BASE, '')})`);
    const nt = norm(await bodyText(page));
    c.check(nt.length > 400, `the study note has only ${nt.length} characters`);
    c.check(!/coming soon/i.test(nt), 'the study note says "coming soon"');
    await c.shot('m5-note');
  });

  await rec.run('M5b', 'Drills: open each unlocked game and play one round', page, async (c) => {
    await open(page, BASE, '/practice?section=drills', 2000);
    const more = page.getByRole('button', { name: /^More drills/ });
    if (await visible(more)) { await more.first().click(); await sleep(700); }
    await c.shot('m5-drills-list');
    const games = await ev(page, () => [...document.querySelectorAll('[role=button][aria-label]')].map((e) => e.getAttribute('aria-label'))
      .filter((t) => /Your level:/.test(t)).map((t) => t.replace(/^Today’s drill: /, '').split('.')[0]));
    c.step(`unlocked drills: ${games.join(', ')}`);
    c.check(games.length > 0, 'no drills listed');
    const ADV = /^(Start|Got it|See results|See how sure you were|Next question|Next decision|Next board|Next meaning|Next statement|Next process|Check the order)$/;
    for (const name of games) {
      const t0 = Date.now();
      await open(page, BASE, '/practice?section=drills', 1500);
      if (await visible(more)) { await more.first().click(); await sleep(500); }
      await page.getByRole('button', { name: new RegExp(`^(Today’s drill: )?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`) }).first().click();
      await sleep(1500);
      const url = page.url().replace(BASE, '');
      let finished = false; let lastSig = ''; let same = 0; let actions = 0;
      while (Date.now() - t0 < 60000 && actions < 120) {
        if (await visible(page.getByRole('button', { name: 'Play again', exact: true }))) { finished = true; break; }
        const sig = norm(await bodyText(page)).slice(0, 600);
        same = sig === lastSig ? same + 1 : 0; lastSig = sig;
        const adv = page.getByRole('button', { name: ADV });
        let did = false;
        const nAdv = await adv.count();
        for (let k = 0; k < nAdv && !did; k++) {
          const b = adv.nth(k);
          if (await b.isVisible() && !(await b.isDisabled())) { await b.click(); did = true; }
        }
        if (!did) {
          // Field Guide: tap the first unmatched term, then the meaning the study notes give it.
          const tiles = await ev(page, () => [...document.querySelectorAll('[role=button][aria-label^="Term "], [role=button][aria-label^="Meaning "]')]
            .filter((e) => e.offsetParent !== null && !e.closest('[aria-hidden="true"]')).map((e) => e.getAttribute('aria-label')));
          const terms = tiles.filter((l) => /^Term /.test(l) && !/, matched$/.test(l));
          const means = tiles.filter((l) => /^Meaning /.test(l) && !/, matched$/.test(l));
          if (terms.length && means.length) {
            const tl = terms[0];
            const tText = norm(tl.replace(/^Term \d+ of \d+: /, '')).toLowerCase();
            const defs = TERMS.get(tText) || [];
            const ml = means.find((m) => defs.includes(norm(m.replace(/^Meaning \d+ of \d+: /, '')))) || means[same % means.length];
            await page.getByRole('button', { name: tl, exact: true }).first().click({ timeout: 3000 }).catch(() => {});
            await sleep(250);
            await page.getByRole('button', { name: ml, exact: true }).first().click({ timeout: 3000 }).catch(() => {});
            did = true;
          }
        }
        if (!did) {
          // A question's answer options come first (Forecast also has "how sure" chips below them).
          const opts = page.locator('[aria-label^="Option "]:not([aria-disabled=true])');
          const vo = [];
          for (let k = 0, n = await opts.count(); k < n; k++) if (await opts.nth(k).isVisible()) vo.push(opts.nth(k));
          if (vo.length) { await vo[same % vo.length].click({ timeout: 3000 }).catch(() => {}); did = true; }
        }
        if (!did) {
          // Any choice on the board, never: Close, the level picker, a placed stone ("Step N", taps take
          // it back), or side actions (notes, lessons, hints, pause, extra time, flag).
          const SKIP = /^(Close|Seedling\.|Sapling\.|Heartwood\.|Step \d|Read the note|Read again|Open the lesson|Pause|Resume|Add a minute|Flag & move on|Show a hint|Play again|Done)/;
          const vis = await ev(page, (skip) => {
            const re = new RegExp(skip);
            return [...document.querySelectorAll('[role=radio],[role=button]')].filter((e) => {
              if (e.offsetParent === null || e.closest('[aria-hidden="true"]')) return false;
              if (e.getAttribute('aria-disabled') === 'true' || e.getAttribute('aria-checked') === 'true') return false;
              const l = (e.getAttribute('aria-label') || e.innerText || '').trim();
              const r = e.getBoundingClientRect();
              return l && !re.test(l) && r.height > 0 && r.y > 60;
            }).map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, l: (e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 40) }; });
          }, SKIP.source);
          if (vis.length) {
            // Bottom-up, rotating while the screen does not change: stones and meanings sit below what they fill.
            vis.sort((a, b) => b.y - a.y);
            const t = vis[same % vis.length];
            const el = page.getByRole('button', { name: t.l, exact: false }).or(page.getByRole('radio', { name: t.l, exact: false }));
            await el.first().scrollIntoViewIfNeeded().catch(() => {});
            await el.first().click({ timeout: 3000 }).catch(() => {});
            did = true;
          }
        }
        actions++;
        await sleep(did ? 450 : 900);
      }
      const ms = Date.now() - t0;
      c.check(finished, `${name} (${url}): did not reach the round recap ("Play again") in ${Math.round(ms / 1000)} s / ${actions} actions`);
      c.step(`${name} (${url}): ${finished ? 'round finished' : 'NOT finished'} in ${Math.round(ms / 1000)} s`);
      await c.shot(`m5-drill-${url.split('/').pop()}${finished ? '-recap' : '-stuck'}`);
    }
  });
  await ctx.close();
}

// ── M6 You: plant, badges, Field Guide; Settings; backup round trip ────────
{
  const { ctx, page } = await phone(demo);
  await rec.run('M6', 'You: plant, badges, Field Guide render; Settings opens; backup save and restore round-trips', page, async (c) => {
    await open(page, BASE, '/you', 2000);
    const h = (await headings(page)).join(' | ');
    const t = norm(await bodyText(page));
    c.check(/Figure \d/.test(h), `no Field Guide plate ("Figure N") on You (headings: ${h.slice(0, 120)})`);
    c.check(/Herbarium|badges/i.test(t), 'no badges (Herbarium) row on You');
    c.check(/plant/i.test(t), 'no plant row on You');
    const svgs = await ev(page, () => document.querySelectorAll('svg').length);
    c.check(svgs > 3, `only ${svgs} drawings on You`);
    await c.shot('m6-you');
    await page.mouse.move(195, 500); await page.mouse.wheel(0, 900); await sleep(500);
    await c.shot('m6-you-more');
    c.step('See your badges');
    await page.getByRole('button', { name: /^(See your badges|Herbarium)/ }).first().click(); await sleep(1800);
    const bt = norm(await bodyText(page));
    c.check(bt.length > 200 && !/\/you$/.test(page.url()), `badges screen did not open or is near-empty (${page.url()})`);
    await c.shot('m6-badges');
    c.step('Plant yours (the demo learner has no plant yet)');
    await open(page, BASE, '/you', 1500);
    const plantBtn = page.getByRole('button', { name: /^(Plant yours|Your plant)/ });
    if (await visible(plantBtn)) {
      await plantBtn.first().click(); await sleep(1800);
      const pt = norm(await bodyText(page));
      const ps = await ev(page, () => document.querySelectorAll('svg').length);
      c.check(pt.length > 80 && ps > 0, `the plant screen is near-empty (${page.url()})`);
      await c.shot('m6-plant');
    } else c.check(false, 'no plant row (Plant yours / Your plant) on You');
    c.step('You → Settings');
    await open(page, BASE, '/you', 1500);
    await page.getByRole('button', { name: 'Settings', exact: true }).first().click(); await sleep(1500);
    c.check(/\/settings/.test(page.url()), `Settings opened ${page.url()}`);
    const sn = await notBlank(page);
    c.check(sn.ok, 'Settings is blank');
    await c.shot('m6-settings');

    c.step('Settings → Your data → Save a backup');
    const before = await store(page, 'aurivan.progress.v1');
    const nBefore = answersIn(before);
    await open(page, BASE, '/settings-section?category=data', 1500);
    await c.shot('m6-your-data');
    const dl = page.waitForEvent('download', { timeout: 10000 });
    await page.getByRole('button', { name: 'Save a backup' }).first().click();
    const file = path.join(outDir, 'm6-backup.json');
    await (await dl).saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    c.check(data.app === 'kaisip' && data.stores && data.stores.progress, 'the backup file is not a KaiSip backup (no app marker or stores)');
    c.check(answersIn(data.stores.progress) === nBefore, `the backup holds ${answersIn(data.stores.progress)} answers, the app ${nBefore}`);
    c.step(`backup saved: ${nBefore} answers, ${fs.statSync(file).size} bytes`);

    c.step('a new phone: welcome → Restore from a backup → Restore my progress');
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p2 = await fresh.newPage();
    rec.watch(p2, new URL(BASE).origin);
    await open(p2, BASE, '/', 2000);
    const ch = p2.waitForEvent('filechooser');
    await p2.getByRole('button', { name: 'Restore from a backup' }).first().click();
    await (await ch).setFiles(file);
    await sleep(1500);
    await c.shot('m6-restore-preview-new-phone', p2);
    await p2.getByRole('button', { name: /^(Restore my progress|Replace my progress)$/ }).first().click(); await sleep(2500);
    const got = answersIn(await store(p2, 'aurivan.progress.v1'));
    c.check(got === nBefore, `after restoring on a new phone there are ${got} answers, the backup had ${nBefore}`);
    const onb = (await store(p2, 'aurivan.settings.v1'))?.state?.onboarded;
    c.check(onb === true, 'after restoring on a new phone the app is not onboarded');
    await open(p2, BASE, '/you', 2000);
    await c.shot('m6-you-after-restore', p2);
    await fresh.close();

    c.step('same phone: wipe progress, then Restore → Replace my progress');
    await ev(page, () => { const p = JSON.parse(localStorage.getItem('aurivan.progress.v1')); p.state.byCert.cisa.answers = {}; localStorage.setItem('aurivan.progress.v1', JSON.stringify(p)); });
    await open(page, BASE, '/settings-section?category=data', 1500);
    const ch2 = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Restore from a backup' }).first().click();
    await (await ch2).setFiles(file);
    await sleep(1500);
    await page.mouse.move(195, 500); await page.mouse.wheel(0, 3000); await sleep(500);
    await page.getByRole('button', { name: 'Replace my progress' }).first().click(); await sleep(2000);
    const back = answersIn(await store(page, 'aurivan.progress.v1'));
    c.check(back === nBefore, `after Replace my progress there are ${back} answers, the backup had ${nBefore}`);
    await c.shot('m6-restored-same-phone');
  });
  await ctx.close();
}

// ── M7 Large save: timings and no crash ─────────────────────────────────────
{
  const big = largeSeed();
  const { ctx, page } = await phone(big.store);
  await rec.run('M7', 'Large save: every screen settles quickly, nothing crashes', page, async (c) => {
    // (No answer count here: reports never show the bank's size.)
    c.note(`large save: every question in the bank answered, 12 mocks, progress store ${Math.round(big.bytes / 1024)} KB`);
    const screens = ['/home', '/learn', '/practice', '/you', '/mistakes', '/saved', '/bank', '/bank/4', '/readiness', '/milestones', '/notes', '/settings'];
    const times = [];
    for (const s of screens) {
      const t0 = Date.now();
      await page.goto(BASE + s, { waitUntil: 'domcontentloaded' });
      let nb = { ok: false, len: 0, h: [] };
      while (!nb.ok && Date.now() - t0 < 15000) { await sleep(100); nb = await notBlank(page).catch(() => nb); }
      const ms = Date.now() - t0;
      times.push([s, ms]);
      c.check(nb.ok, `${s} is still blank after 15 s with the large save`);
      c.check(ms < SLOW_MS, `${s} took ${ms} ms to show content with the large save (limit ${SLOW_MS} ms)`);
      if (ms > NOTE_MS) c.note(`${s} took ${ms} ms (over ${NOTE_MS} ms)`);
      await sleep(500);
      if (['/home', '/you', '/mistakes', '/readiness'].includes(s)) await c.shot(`m7-large${s.replace(/\//g, '-')}`);
    }
    c.step(`cold load times: ${times.map(([s, ms]) => `${s} ${ms}ms`).join(', ')}`);
    c.step('tab switches with the large save');
    await page.goto(BASE + '/home', { waitUntil: 'networkidle' }); await sleep(1500);
    const sw = [];
    for (const name of ['Learn', 'Practice', 'You', 'Today', 'You', 'Practice']) {
      const t0 = Date.now();
      await tab(page, name);
      let nb = { ok: false };
      // Wait for the target tab to be the selected one and to have content.
      while (Date.now() - t0 < 10000) {
        const sel = await page.getByRole('tab', { name: new RegExp(`^${name}`) }).first().getAttribute('aria-selected');
        nb = await notBlank(page);
        if (sel === 'true' && nb.ok) break;
        await sleep(50);
      }
      const ms = Date.now() - t0;
      sw.push(`${name} ${ms}ms`);
      c.check(ms < SLOW_MS, `switching to ${name} took ${ms} ms with the large save`);
    }
    c.step(`tab switch times: ${sw.join(', ')}`);
    c.step('answer one question with the large save');
    await page.goto(BASE + '/practice', { waitUntil: 'networkidle' }); await sleep(1200);
    await page.getByRole('button', { name: 'Start', exact: true }).first().click(); await sleep(1500);
    const p = await answer(page, true);
    const t0 = Date.now();
    await page.getByText('Check answer', { exact: true }).click();
    await page.getByRole('heading', { name: /Correct/ }).first().waitFor({ timeout: 10000 });
    c.step(`verdict after ${Date.now() - t0} ms (${p.id})`);
    await c.shot('m7-large-answer');
  });
  await ctx.close();
}

await browser.close();
const fails = rec.paths.filter((p) => p.status === 'FAIL').length;
console.log(`mobile: ${rec.paths.length} paths, ${fails} FAIL`);
