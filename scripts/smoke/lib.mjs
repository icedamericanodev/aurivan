// Shared helpers for the KaiSip smoke harness (scripts/smoke/run.sh).
// Read-only on the apps: these helpers drive a browser and write results to
// the out dir only. Uses the preinstalled Playwright + Chromium (never
// `playwright install`).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const PW_FROM = process.env.PLAYWRIGHT_REQUIRE_FROM
  || (fs.existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url);
const require = createRequire(PW_FROM);
export const { chromium } = require('playwright');

export async function launch() {
  const exe = process.env.CHROME_PATH
    || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
  return chromium.launch(exe ? { executablePath: exe } : {});
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Normalise text for comparisons: the apps render smart quotes and dashes.
export const norm = (s) => String(s || '')
  .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ').trim();

// Console noise that is not an app failure. The web app's GA dataLayer stub
// is the known exception (agent definition); third-party hosts can be blocked
// by the sandbox network, so their failures are logged as notes, not FAILs.
const IGNORED_CONSOLE = [/dataLayer/i, /gtag/i, /googletagmanager/i, /google-analytics/i];
export const isThirdParty = (url, origin) => { try { return new URL(url).origin !== origin; } catch { return false; } };

// Records path results. Each path: { id, name, status, shots, notes, errors, steps, ms }.
export class Recorder {
  constructor(outDir, suite, meta = {}) {
    this.outDir = outDir; this.suite = suite; this.meta = meta; this.paths = []; this.cur = null;
    fs.mkdirSync(outDir, { recursive: true });
  }
  // Attach console / page error / request listeners to a page. `origin` is the
  // app's own origin: failures there count, third-party ones become notes.
  watch(page, origin) {
    page.on('console', (m) => {
      if (m.type() !== 'error' || !this.cur) return;
      const t = m.text();
      if (IGNORED_CONSOLE.some((re) => re.test(t))) return;
      // "Failed to load resource" duplicates the response listener below.
      if (/Failed to load resource/.test(t)) return;
      this.cur.errors.push('console.error: ' + t.slice(0, 400));
    });
    page.on('pageerror', (e) => { if (this.cur) this.cur.errors.push('uncaught: ' + String(e.message).slice(0, 400)); });
    // A renderer crash ("Target crashed"): the tab died, which a learner sees as the app closing.
    page.on('crash', () => { if (this.cur) this.cur.errors.push(`the browser tab crashed (renderer died) at ${page.url()}`); });
    page.on('requestfailed', (r) => {
      if (!this.cur) return;
      const why = r.failure()?.errorText || '';
      if (/ERR_ABORTED/.test(why)) return; // navigation/reload cancels in-flight requests
      const line = `request failed: ${r.url()} (${why})`;
      if (isThirdParty(r.url(), origin)) this.cur.notes.push('third-party ' + line); else this.cur.errors.push(line);
    });
    page.on('response', (r) => {
      if (!this.cur || r.status() < 400) return;
      const line = `HTTP ${r.status()}: ${r.url()}`;
      if (isThirdParty(r.url(), origin)) this.cur.notes.push('third-party ' + line); else this.cur.errors.push(line);
    });
  }
  // Run one path. fn gets a ctx { check, note, step, shot }. A thrown error or
  // a failed check makes the path FAIL; console errors also fail it unless
  // opts.allowErrors (then they are listed but the path can still PASS).
  async run(id, name, page, fn, opts = {}) {
    // SMOKE_ONLY=M1,W3 runs only those paths (prefix match: W3 runs W3-390-light and W3-1280-dark).
    const only = (process.env.SMOKE_ONLY || '').split(',').filter(Boolean);
    if (only.length && !only.some((o) => id === o || id.startsWith(o + '-'))) return null;
    const p = { id, name, status: 'PASS', shots: [], notes: [], errors: [], steps: [], fails: [], ms: 0 };
    this.paths.push(p); this.cur = p;
    const t0 = Date.now();
    const ctx = {
      step: (s) => { const at = ((Date.now() - t0) / 1000).toFixed(1); p.steps.push(`${s} (at ${at}s)`); console.log(`  [${id}] +${at}s ${s}`); },
      note: (s) => { p.notes.push(s); console.log(`  [${id}] note: ${s}`); },
      check: (cond, msg) => { if (!cond) { p.fails.push(msg); console.log(`  [${id}] CHECK FAILED: ${msg}`); } return !!cond; },
      shot: async (file, pg = page, full = false) => {
        const f = `${file}.png`;
        try { await pg.screenshot({ path: path.join(this.outDir, f), fullPage: full }); p.shots.push(f); } catch (e) { p.notes.push(`screenshot ${f} failed: ${e.message}`); }
        return f;
      },
    };
    console.log(`[${id}] ${name}`);
    try {
      await fn(ctx);
    } catch (e) {
      p.fails.push('Stopped with an error: ' + String(e && e.message || e).split('\n')[0].slice(0, 400));
      try { await ctx.shot(`${id.toLowerCase()}-error`); } catch {}
    }
    await sleep(300); // late console errors from the last action
    p.ms = Date.now() - t0;
    if (p.fails.length || (p.errors.length && !opts.allowErrors)) p.status = 'FAIL';
    if (opts.notTested) { p.status = 'NOT TESTED'; p.notes.push(opts.notTested); }
    console.log(`[${id}] ${p.status} (${(p.ms / 1000).toFixed(1)}s)`);
    this.cur = null;
    this.save();
    return p;
  }
  notTested(id, name, reason) {
    this.paths.push({ id, name, status: 'NOT TESTED', shots: [], notes: [reason], errors: [], steps: [], fails: [], ms: 0 });
    this.save();
  }
  save() {
    fs.writeFileSync(path.join(this.outDir, `${this.suite}-results.json`),
      JSON.stringify({ suite: this.suite, meta: this.meta, paths: this.paths }, null, 2));
  }
}

// The question bank as the apps serve it (data/domain{1..5}.json), read
// straight from disk so grading checks do not trust the app's own state.
export function loadBank(repo) {
  const bank = {};
  for (let d = 1; d <= 5; d++) {
    const f = path.join(repo, 'data', `domain${d}.json`);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const q of (j.questions || j)) bank[q.id] = q;
  }
  return bank;
}
