// Broad offline text-fit audit. Never uses a tester's save or sends a report.
// From mobile/: SHOTS=textfit bash scripts/screenshots/run.sh <output-dir>
// Against an existing export: node scripts/screenshots/shoot_textfit.mjs <synthetic-seed.json> <output-dir>
// TEXTFIT_ONLY=mistakes,report-sheet narrows a rerun; TEXTFIT_CONFIG=light-w320-fs200 narrows its matrix.
// CSS text zoom approximates native Dynamic Type; it does not prove native Yoga layout.
import { createRequire } from 'module';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM || import.meta.url);
const { chromium } = require('playwright');
const seed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3];
const BASE = process.env.TEXTFIT_BASE || 'http://127.0.0.1:8093';
const only = new Set((process.env.TEXTFIT_ONLY || '').split(',').filter(Boolean));
const principle = JSON.parse(fs.readFileSync('src/content/generated/cisa/principles.json', 'utf8')).principles[0];
const cases = [];
const runtimeErrors = [];
const blockedRequests = new Set();
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
fs.mkdirSync(out, { recursive: true });
let page;
let config;

const wait = (ms = 180) => page.waitForTimeout(ms);
async function zoom() {
  if (config.scale === 1) return;
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[dir="auto"]')) {
      if (el.dataset.textfitZoom) continue;
      const style = getComputedStyle(el);
      const px = parseFloat(style.fontSize) || 16;
      const day = el.closest('[aria-label*=" 20"]') && /^\d{1,2}$|^(Mo|Tu|We|Th|Fr|Sa|Su)$/.test(el.textContent || '');
      const line = parseFloat(style.lineHeight);
      const numeralMetrics = [[20, 22], [22, 26], [30, 32], [38, 41], [52, 52]];
      const percentMetrics = [[11, 14], [14, 18], [18, 23], [25, 31]];
      // Match Grove's numRole/percentFor metrics and medium face. Numeric course
      // prose retains its reading scale even when its whole content is a number.
      const numeral = style.fontFamily.includes('Fraunces_500Medium') &&
        ((/^[\d\s,./+–−-]+$/.test(el.textContent || '') && numeralMetrics.some(([size, height]) => px === size && line === height)) ||
         (el.textContent?.trim() === '%' && percentMetrics.some(([size, height]) => px === size && line === height)));
      // Native caps are deliberate: tabs1.2 and Grove numerals1.3. Doubling
      // either creates defects in the approximation which cannot occur in-app.
      el.style.zoom = String(el.closest('[role="tab"]') ? 1.2 : px >= 26 || numeral ? 1.3 : day ? 1.5 : 2);
      el.dataset.textfitZoom = '1';
    }
  });
  await wait();
}
async function go(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.locator('[dir="auto"]').first().waitFor({ state: 'visible' });
  await wait(300);
  await zoom();
}
async function press(name, exact = true) {
  await page.getByRole('button', { name, exact }).first().click();
  await wait(250);
  await zoom();
}
async function shot(name) {
  const file = `textfit-${name}-${config.tag}.png`;
  await page.screenshot({ path: `${out}/${file}` });
  return file;
}

// Inspect real text runs, not decorative SVGs or container widths. Vertical scroll
// is expected; only non-scroll clipping and horizontal escape count as candidates.
async function scan() {
  return page.evaluate(() => {
    const bad = [];
    const observations = [];
    const stats = { runs: 0, deliberatePreviews: 0, horizontalRails: 0 };
    const interactive = '[role="button"],button,[role="radio"],[role="checkbox"],[role="tab"],[role="link"],a';
    for (const el of document.querySelectorAll('[data-textfit-id]')) delete el.dataset.textfitId;
    let serial = 0;
    for (const el of document.querySelectorAll('[dir="auto"]')) {
      if (!el.textContent?.trim() || el.closest('svg,[aria-hidden="true"],[hidden]')) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || style.visibility === 'hidden' || style.display === 'none') continue;
      // Only leaf text runs: a parent text element can otherwise double-count its children.
      if (!Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue;
      let rail = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (['auto', 'scroll'].includes(s.overflowX) && p.scrollWidth > p.clientWidth + 3 && s.overflowY === 'hidden') { rail = true; break; }
      }
      if (rail) { stats.horizontalRails++; continue; }
      const clamped = Number(style.webkitLineClamp) > 0 || style.textOverflow === 'ellipsis';
      if (clamped) { stats.deliberatePreviews++; continue; }
      stats.runs++;
      const target = el.closest(interactive);
      const targetBox = target?.getBoundingClientRect();
      const clips = [];
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        // The viewport of a vertical reader is allowed to hide the rest until scrolled.
        if (['auto', 'scroll'].includes(s.overflowY)) break;
        if (s.overflowY === 'hidden' && p.clientHeight < p.scrollHeight - 3) clips.push(p.getBoundingClientRect());
      }
      // Whole-node Range rects include the trailing space at a soft line break.
      // That advance can extend beyond a perfectly fitting paragraph. Measure
      // non-whitespace runs instead: wrapped words still yield one rect per line,
      // while missing/overflowing letters remain visible to the audit.
      const range = document.createRange();
      const textNodes = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const rects = [];
      for (let node = textNodes.nextNode(); node; node = textNodes.nextNode()) {
        for (const word of node.textContent.matchAll(/\S+/gu)) {
          range.setStart(node, word.index);
          range.setEnd(node, word.index + word[0].length);
          rects.push(...[...range.getClientRects()].filter(r => r.width > 0 && r.height > 0));
        }
      }
      const reasons = new Set();
      let fontBoxOverhang = false;
      const tolerance = 3;
      for (const r of rects) {
        if (r.left < -tolerance || r.right > innerWidth + tolerance) reasons.add('viewport-horizontal');
        if (targetBox && (r.left < targetBox.left - tolerance || r.right > targetBox.right + tolerance || r.top < targetBox.top - tolerance || r.bottom > targetBox.bottom + tolerance)) reasons.add('interactive-bounds');
        if (r.left < box.left - tolerance || r.right > box.right + tolerance) reasons.add('text-width');
        // Range includes unused font ascent/descent, including below digits. An
        // unconstrained line box may safely overhang; require actual clipping.
        if (style.overflowY === 'hidden' && (r.bottom > box.bottom + tolerance || r.top < box.top - tolerance)) reasons.add('text-height');
        else if (r.bottom > box.bottom + tolerance || r.top < box.top - tolerance) fontBoxOverhang = true;
        if (clips.some(c => r.top < c.top - tolerance || r.bottom > c.bottom + tolerance)) reasons.add('hidden-container');
      }
      if (fontBoxOverhang) observations.push({ text: el.textContent.trim().slice(0, 240), reason: 'font-range-exceeds-unclipped-line-box', font: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight });
      if (!reasons.size) continue;
      el.dataset.textfitId = String(++serial);
      bad.push({ id: String(serial), text: el.textContent.trim().slice(0, 240), reasons: [...reasons],
        control: target?.getAttribute('aria-label') || target?.textContent?.trim().slice(0, 160),
        box: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } });
    }
    return { bad, stats, observations };
  });
}

async function audit(name, representative) {
  await zoom();
  const findings = new Map();
  const observations = new Map();
  const stats = { runs: 0, deliberatePreviews: 0, horizontalRails: 0 };
  // Sample the scroll containers at both ends as well as the initial viewport. This
  // mounts virtualized rows without producing hundreds of screenshots per route.
  const sample = async () => {
    const result = await scan();
    for (const [key, value] of Object.entries(result.stats)) stats[key] += value;
    for (const item of result.observations) observations.set(`${item.text}|${item.font}|${item.fontSize}`, item);
    for (const item of result.bad) {
      const key = `${item.reasons.join(',')}|${item.text}|${item.control || ''}`;
      if (findings.has(key)) continue;
      const entry = { ...item };
      if (findings.size < 4) {
        // FlatList can recycle another candidate while the first is brought into
        // view. Keep its diagnostic; an unmounted screenshot target is not a route failure.
        const found = await page.evaluate(({ id, text }) => {
          const el = document.querySelector(`[data-textfit-id="${id}"]`) ||
            [...document.querySelectorAll('[dir="auto"]')].find(n => n.textContent?.trim().slice(0, 240) === text);
          if (!el) return false;
          el.scrollIntoView({ block: 'center' });
          return true;
        }, item);
        if (found) {
          await wait();
          entry.screenshot = await shot(`${name}-finding${findings.size + 1}`);
        } else entry.screenshotNote = 'Text was virtualized after measurement; retained diagnostic without a screenshot.';
      }
      findings.set(key, entry);
    }
  };
  const screenshot = representative ? await shot(name) : undefined;
  await sample();
  for (const position of ['middle', 'bottom']) {
    await page.evaluate(pos => {
      for (const el of document.querySelectorAll('div')) {
        const s = getComputedStyle(el);
        if (['auto', 'scroll'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 80) {
          el.scrollTop = pos === 'middle' ? (el.scrollHeight - el.clientHeight) / 2 : el.scrollHeight;
        }
      }
    }, position);
    await wait(220);
    await zoom();
    await sample();
  }
  return { screenshot, stats, findings: [...findings.values()], metricObservations: [...observations.values()] };
}

async function run(name, path, action, representative = false) {
  if (only.size && !only.has(name)) return;
  const row = { name, path, config: config.tag, status: 'passed' };
  const errorsBefore = runtimeErrors.length;
  try {
    await go(path);
    if (action) await action();
    row.finalUrl = page.url();
    row.headings = (await page.getByRole('heading').allTextContents()).slice(0, 12);
    Object.assign(row, await audit(name, representative));
    row.runtimeErrors = runtimeErrors.slice(errorsBefore);
    if (row.findings.length || row.runtimeErrors.length) row.status = 'needs-review';
  } catch (error) {
    row.status = 'failed';
    row.error = String(error.message || error);
    row.screenshot = await shot(`${name}-failed`).catch(() => undefined);
  }
  cases.push(row);
  console.log(`${row.status}: ${config.tag} ${name}${row.findings?.length ? ` (${row.findings.length} candidates)` : ''}`);
  save();
}

function save() {
  fs.writeFileSync(`${out}/textfit-report.json`, JSON.stringify({
    generatedAt: new Date().toISOString(), scannerVersion: 3, scope: 'Offline CISA screens with synthetic data only',
    limitations: ['Web text zoom approximates Dynamic Type; native font metrics/Yoga require emulator verification.', 'Cloud authenticated screens and OS dialogs are excluded.', 'Intentional horizontal rails and ellipsis previews are excluded; no external submission or destructive setting is activated.'],
    summary: { cases: cases.length, passed: cases.filter(c => c.status === 'passed').length, review: cases.filter(c => c.status === 'needs-review').length, failed: cases.filter(c => c.status === 'failed').length },
    blockedRequests: [...blockedRequests], runtimeErrors, cases,
  }, null, 2));
}

async function context(emptyMistakes = false) {
  const values = { ...seed };
  const settings = JSON.parse(values['aurivan.settings.v1']);
  settings.state = { ...settings.state, activeCertId: 'cisa', theme: config.theme, motion: 'reduced', fitPrompt: 'answered', dailyMinutes: 20, familiarity: 'some' };
  values['aurivan.settings.v1'] = JSON.stringify(settings);
  const progress = JSON.parse(values['aurivan.progress.v1']);
  const p = progress.state.byCert.cisa;
  p.bookmarks = ['d1_010', 'd1_008'];
  if (emptyMistakes) p.mistakes = {};
  values['aurivan.progress.v1'] = JSON.stringify(progress);
  const ctx = await browser.newContext({ viewport: { width: config.width, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  // Fail closed for outbound services even if a development flag was accidentally enabled.
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== new URL(BASE).origin) { blockedRequests.add(new URL(url).origin); return route.abort(); }
    return route.continue();
  });
  await ctx.addInitScript(({ values, scale }) => {
    window.__AURIVAN_FONT_SCALE__ = scale;
    if (localStorage.getItem('__textfitSeeded')) return;
    for (const [key, value] of Object.entries(values)) if (!key.startsWith('__')) localStorage.setItem(key, value);
    localStorage.setItem('__textfitSeeded', '1');
  }, { values, scale: config.scale });
  page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', e => runtimeErrors.push({ config: config.tag, url: page.url(), message: e.message }));
  return ctx;
}

try {
  for (const theme of ['light', 'dark']) for (const [width, scale] of [[393, 1], [320, 2]]) {
    config = { theme, width, scale, tag: `${theme}-w${width}-fs${scale * 100}` };
    if (process.env.TEXTFIT_CONFIG && process.env.TEXTFIT_CONFIG !== config.tag) continue;
    const ctx = await context();
    const routes = [
      ['today', '/home', true], ['learn', '/learn', true], ['practice', '/practice', true], ['you', '/you', true],
      ['notes', '/notes'], ['notes-domain', '/notes/4'], ['note-detail', '/notes/subtopic/4B1.2', true],
      ['glossary', '/glossary'], ['principles', '/principles'], ['principle-detail', `/principles/${principle.id}`],
      ['labs', '/labs'], ['concept-lab', '/labs/cisa-lab-rto-rpo'], ['lesson-cover', '/lesson/cisa-l-d4-rpo-rto'],
      ['mistakes', '/mistakes', true], ['saved', '/saved'], ['bank', '/bank'], ['bank-domain', '/bank/1'],
      ['guided', '/guided'], ['fit', '/fit', true], ['mock-start', '/mock-start'], ['session', '/session', true],
      ['settings', '/settings', true], ['settings-data', '/settings-section?category=data'], ['settings-help', '/settings-section?category=help'],
      ['help', '/help'], ['faq', '/faq'], ['reports', '/reports'], ['whats-new', '/whats-new'], ['badges', '/milestones'],
      ['exam-guide', '/exam-guide'], ['exam-week', '/exam-week'], ['cheat-sheet', '/cheat-sheet'], ['readiness', '/readiness'],
      ['field-notes', '/field-notes'],
      ...['callit', 'canopy', 'daylight', 'field', 'priority', 'rumor', 'sprint', 'stones', 'trap'].map(id => [`drill-${id}`, `/game/${id}`]),
    ];
    for (const [name, path, representative] of routes) await run(name, path, null, representative);
    await run('lesson-reading', '/lesson/cisa-l-d4-rpo-rto', () => press('Next'), true);
    await run('lab-experiment', '/labs/cisa-lab-rto-rpo', () => press('2. Experiment'), true);
    await run('mistake-tags', '/mistakes', async () => {
      await press(/^(Tag why you slipped|Change)$/);
      const tags = page.getByRole('radiogroup').first();
      await tags.evaluate(el => el.scrollIntoView({ block: 'center' }));
    }, true);
    await run('report-sheet', '/mistakes', () => press(/Report a problem with question/), true);
    await run('support-sheet', '/help?open=support', null, true);
    await run('daily-time-sheet', '/settings', () => press(/^Daily time, /), true);
    await run('practice-count-chooser', '/practice', async () => {
      await press(/^Count, /);
      const choice = page.getByRole('radio', { name: '10 questions', exact: true }).first();
      await choice.waitFor({ state: 'visible' });
      assert.match((await choice.textContent()).replace(/\s+/g, ' ').trim(), /10\s*questions/, 'Count choice retains its numeral and unit');
      await choice.evaluate(el => el.scrollIntoView({ block: 'center' }));
    }, true);
    await run('practice-build-set', '/practice', async () => {
      await press(/^Build a set/);
      const choice = page.getByTestId('build-set').getByRole('radio', { name: '10 questions', exact: true });
      await choice.waitFor({ state: 'visible' });
      assert.match((await choice.textContent()).replace(/\s+/g, ' ').trim(), /10\s*questions/, 'Custom set retains its numeral and unit');
      await choice.evaluate(el => el.scrollIntoView({ block: 'center' }));
    }, true);
    await run('starting-point-sheet', '/settings', () => press(/^Starting point, /));
    await run('default-mode-sheet', '/settings', () => press(/^Default mode, /));
    await run('date-sheet', '/settings?open=exam-date', null, true);
    await run('session-answer', '/session', async () => {
      // Answer choices expose radio semantics, not generic button semantics.
      await page.getByRole('radio', { name: /^Option A:/ }).first().click();
      await wait(250); await zoom();
      await press('Check answer');
      // Only presentation is tested: the app determines the answer/letter mapping.
      const best = page.getByLabel(/^(Correct|Not quite)\. Best answer [A-D]$/).first();
      await best.waitFor({ state: 'attached' });
      const spoken = await best.getAttribute('aria-label');
      const letter = spoken.match(/Best answer ([A-D])$/)[1];
      await page.mouse.move(config.width / 2, 600);
      await page.mouse.wheel(0, 1600); await wait(300); await zoom();
      assert.ok((await best.textContent()).includes(letter), 'Collapsed header retains its answer letter');
      const rects = await best.evaluate(el => {
        const box = el.getBoundingClientRect();
        return { x: box.x, right: box.right, width: innerWidth };
      });
      assert.ok(rects.x >= -2 && rects.right <= rects.width + 2, 'Collapsed answer header fits viewport');
    }, true);
    await ctx.close();
    // Empty-state coverage has its own seed/context; other cases keep their mistakes.
    const empty = await context(true);
    await run('empty-mistakes', '/mistakes', null, true);
    await empty.close();
  }
} finally {
  save();
  await browser.close();
}
const failures = cases.filter(c => c.status !== 'passed');
console.log(`Text-fit audit: ${cases.length} cases; ${failures.length} need review. See ${out}/textfit-report.json`);
if (failures.length || runtimeErrors.length || !cases.length) process.exitCode = 1;
