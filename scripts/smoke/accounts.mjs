// KaiSip web accounts: browser tests of the sign-in and account screens
// (stream B1 of docs/WEB_LAUNCH_PLAN.md).
//
// Usage: node scripts/smoke/accounts.mjs <repo_root> <out_dir> [--shots <dir>]
//   SMOKE_ONLY=A1,A4   run only those paths (prefix match)
//   --shots <dir>      also save every screen at 390 and 1280, light and dark
//                      (deviceScaleFactor 2), and a contact sheet
//
// How it works (nothing leaves this machine):
// - The page is the repo's own index.html, served to the browser AT
//   https://kaisip.com/app/ by intercepting that address, so the real address
//   check runs (account screens exist only on https://kaisip.com).
// - The real accounts client (assets/kaisip-cloud.js) runs in the page. Its
//   calls to the sign-in service are answered by the SAME fake server its unit
//   tests use (mobile/jest/webcloud-fakes.ts, loaded by accounts-fake.cjs):
//   GoTrue's password rules, the database's password guard, sync rows and the
//   two account functions.
// - The leaked-password lookup and Cloudflare's human check are small fakes.
//   Any other address is refused and counted, so "nothing goes to a third
//   party" is checked, not assumed.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { createRequire } from 'module';
import { launch, Recorder, norm, sleep } from './lib.mjs';

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const SHOTS = shotsAt >= 0 ? path.resolve(args[shotsAt + 1]) : '';
if (shotsAt >= 0) args.splice(shotsAt, 2);
const [repoArg, outArg] = args;
if (!repoArg || !outArg) { console.error('usage: node accounts.mjs <repo_root> <out_dir> [--shots <dir>]'); process.exit(2); }
const repo = path.resolve(repoArg);
const outDir = path.resolve(outArg);
const require = createRequire(import.meta.url);
const F = require('./accounts-fake.cjs')(repo);

const SITE = 'https://kaisip.com';
const APP = SITE + '/app/';
const SUPA = 'https://ziadnvepttlgcowvqvom.supabase.co';
const PUBLIC_KEY = 'sb_publishable_s9eKQUQ0w3MTnCUBF05EkA_5e_kGEw2';
const EMAIL = 'maya@example.com';
const PW = 'Ocean violet lamp 7!';
const PW2 = 'Copper falcon wobbly harbor 9#';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const APP_VERSION = (html.match(/const APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
const rec = new Recorder(outDir, 'accounts', { appVersion: APP_VERSION, url: APP });
const browser = await launch();
// axe-core: AXE_PATH, the repo's or the phone app's node_modules, the shared tools folder, or the
// copy pa11y's own run keeps in npm's npx cache (where scripts/verify_repo.sh leaves it).
const axeFile = (() => {
  const npx = path.join(os.homedir(), '.npm', '_npx');
  const cached = fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, 'node_modules/axe-core/axe.min.js')) : [];
  for (const p of [process.env.AXE_PATH, path.join(repo, 'node_modules/axe-core/axe.min.js'), path.join(repo, 'mobile/node_modules/axe-core/axe.min.js'), '/opt/node-tools/node_modules/axe-core/axe.min.js', ...cached].filter(Boolean)) if (fs.existsSync(p)) return p;
  return '';
})();
const axeSrc = axeFile ? fs.readFileSync(axeFile, 'utf8') : '';
const axeStats = { ran: 0, skipped: 0 };

const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
};
// A TEST STAND-IN for Google's "G" file: an empty dashed square. It is not Google's mark and is never published.
const G_STAND_IN = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="1.5" y="1.5" width="17" height="17" rx="4" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="3 2"/></svg>';
// The owner's preview needs a secret phrase whose SHA-256 is in the page. The tests never know
// it: they make a phrase of their own for this run and serve the page with that phrase's hash
// (setup({ realHash: true }) serves the page untouched, to prove a stranger cannot switch it on).
const TEST_PHRASE = crypto.randomBytes(24).toString('base64url');
const TEST_HASH = crypto.createHash('sha256').update(TEST_PHRASE, 'utf8').digest('hex');
if (!/var KS_PREVIEW_HASH = '[0-9a-f]{64}';/.test(html)) { console.error('accounts: KS_PREVIEW_HASH was not found in index.html'); process.exit(2); }
// The policy the page is heading for (no inline script): sent as Report-Only, so nothing breaks and the tests can count what would.
const APP_CSP_RO = (() => {
  const m = /^\s+Content-Security-Policy-Report-Only:\s*(.+)$/m.exec(fs.readFileSync(path.join(repo, '_headers'), 'utf8'));
  return m ? m[1].trim() : '';
})();
const wouldBlock = new Map();
const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').toUpperCase();
// The web app's Content-Security-Policy, as Cloudflare sends it (the /* rule of _headers): the
// test server sends the same one with the app page, and anything it blocks fails the path.
const APP_CSP = (() => {
  const lines = fs.readFileSync(path.join(repo, '_headers'), 'utf8').split('\n');
  const at = lines.findIndex((l) => l.trim() === '/*');
  for (let i = at + 1; at >= 0 && i < lines.length && /^\s/.test(lines[i]); i++) { const m = /^\s+Content-Security-Policy:\s*(.+)$/.exec(lines[i]); if (m) return m[1].trim(); }
  return '';
})();
if (!APP_CSP) { console.error('accounts: the /* Content-Security-Policy was not found in _headers'); process.exit(2); }

// ── The fake network ──
function siteFile(u) {
  let p = decodeURIComponent(u.pathname);
  if (p === '/app' || p === '/app/' || p === '/app/index.html') return 'index.html';
  if (p.startsWith('/app/')) p = p.slice(4);
  if (p === '/') return 'home.html';
  if (/^\/(privacy|terms|support|delete-account|human-check|how-questions-are-made)(\.html)?$/.test(p)) return p.slice(1).replace(/\.html$/, '') + '.html';
  if (/^\/(assets|data)\//.test(p) || p === '/manifest.webmanifest' || p === '/favicon.ico') return p === '/favicon.ico' ? 'assets/favicon.ico' : p.slice(1);
  return null;
}
async function handle(route, server, net, origin) {
  const req = route.request();
  const u = new URL(req.url());
  const cors = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': 'retry-after' };
  if (u.origin === origin) {
    const rel = siteFile(u);
    const file = rel && path.join(repo, rel);
    if (rel === 'assets/kaisip-cloud.js') { net.cloudJs++; if (net.cloudJsMode === 'down') return route.abort('internetdisconnected'); }
    if (rel === 'assets/kaisip-password-words.js') net.wordsJs++;
    // Google's "G" file is not in the repo (the owner adds Google's own file). The tests stand in
    // an empty dashed square at its address, so the screens are tested as they will be with the
    // file in place; net.googleG = 'missing' is the repo as it is today (U4 proves the button hides).
    if (rel === 'assets/google-g.svg' || rel === 'assets/google-g.png') {
      net.googleAsked = (net.googleAsked || 0) + 1;
      if (net.googleG === 'missing' || rel.endsWith('.png') || fs.existsSync(path.join(repo, rel))) { if (!fs.existsSync(path.join(repo, rel))) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }); }
      else return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: G_STAND_IN });
    }
    if (!file || !file.startsWith(repo) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    const headers = rel === 'index.html' ? { 'content-security-policy': APP_CSP, ...(APP_CSP_RO ? { 'content-security-policy-report-only': APP_CSP_RO } : {}) } : {};
    let body = fs.readFileSync(file);
    if (rel === 'index.html' && !net.realHash) body = body.toString('utf8').replace(/var KS_PREVIEW_HASH = '[0-9a-f]{64}';/, `var KS_PREVIEW_HASH = '${TEST_HASH}';`);
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', headers, body });
  }
  if (u.origin === SUPA) {
    net.supabase++;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const headers = req.headers();
    if (headers.apikey !== PUBLIC_KEY) net.badKey = true;
    // The consent record cannot be read or written (an outage of that one table).
    if (net.profilesDown && u.pathname === '/rest/v1/profiles') { net.profilesAsked = (net.profilesAsked || 0) + 1; return route.fulfill({ status: 503, headers: { ...cors, 'content-type': 'application/json' }, body: '{"message":"upstream connect error"}' }); }
    // The whole service answering with errors (an outage): every call, until switched back.
    if (net.supaMode === '503') return route.fulfill({ status: 503, headers: { ...cors, 'content-type': 'application/json' }, body: '{"message":"upstream connect error"}' });
    try {
      const res = await server.fetch(F.FAKE_URL + u.pathname + u.search, { method: req.method(), headers: { ...headers, apikey: F.FAKE_KEY }, body: req.postData() ?? undefined });
      const h = { ...cors, 'content-type': 'application/json' };
      const ra = res.headers.get('retry-after');
      if (ra) h['retry-after'] = ra;
      return route.fulfill({ status: res.status, headers: h, body: await res.text() });
    } catch { return route.abort('internetdisconnected'); }
  }
  if (u.hostname === 'api.pwnedpasswords.com') {
    net.hibp.push(u.pathname);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (net.hibpMode === 'down') return route.abort('internetdisconnected');
    const prefix = u.pathname.split('/').pop().toUpperCase();
    const lines = ['0018A45C4D1DEF81644B54AB7F969B88D65:0'];
    for (const pw of net.leaked) { const h = sha1(pw); if (h.startsWith(prefix)) lines.push(h.slice(5) + ':42'); }
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/plain' }, body: lines.join('\r\n') });
  }
  if (u.hostname === 'challenges.cloudflare.com') {
    net.turnstile++;
    if (net.turnstileMode === 'down') return route.abort('failed');
    // A stand-in for Cloudflare's widget: it "passes" 30 ms after it is drawn, and again after each reset.
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: `window.__ts={n:0,opts:null,actions:[]};window.turnstile={render:function(el,o){if(typeof el==='string')el=document.querySelector(el);window.__ts.opts=o;window.__ts.actions.push(o.action);el.setAttribute('data-ts','1');var k=++window.__ts.n;setTimeout(function(){o.callback('ts-token-'+k);},30);return 'w1';},reset:function(){var o=window.__ts.opts;var k=++window.__ts.n;setTimeout(function(){o&&o.callback('ts-token-'+k);},30);},remove:function(){}};(function(){var m=/[?&]onload=([A-Za-z_]+)/.exec((document.currentScript||{}).src||'');if(m&&typeof window[m[1]]==='function')window[m[1]]();})();` });
  }
  net.third.push(req.url());
  return route.abort('blockedbyclient');
}
// A browser profile: its own storage, its own fake server unless one is passed in.
async function setup(o = {}) {
  const origin = o.origin || SITE;
  const server = o.server || new F.FakeSupabase(() => Date.now());
  if (!o.server) server.captchaOn = o.captchaOn !== false;
  const ctx = await browser.newContext({ ...VIEWS[o.view || 'phone'], colorScheme: o.scheme || 'light', reducedMotion: 'reduce', acceptDownloads: true });
  const net = { realHash: o.realHash === true, googleG: o.googleG || 'stand-in', hibp: [], hibpMode: 'clean', leaked: new Set(), turnstile: 0, turnstileMode: 'ok', supabase: 0, cloudJs: 0, wordsJs: 0, third: [], badKey: false };
  await ctx.route('**/*', (route) => handle(route, server, net, origin));
  const seed = { aurivan_consent: 'denied', ...(o.onboarded === false ? {} : { cisa_onboarded_v6: '1', aurivan_exam_date_asked: '1' }), ...(o.preview === false ? {} : { kaisip_accounts_preview: TEST_PHRASE }), ...(o.seed || {}) };
  // Seeded once per tab (a reload must not put back what a test removed).
  await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); } } catch (e) {} }, seed);
  // Anything the page's own policy blocks is an error.
  // (What the Report-Only policy would block is counted, not failed: console.debug lines the harness collects.)
  await ctx.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => { if (e.disposition === 'report') console.debug('CSPRO|' + e.effectiveDirective + '|' + (e.sample || '').slice(0, 60) + '|' + (e.sourceFile ? e.lineNumber : 0)); else console.error('CSP blocked ' + e.violatedDirective + ': ' + (e.blockedURI || 'inline')); }); });
  ctx.on('console', (m) => { if (m.type() !== 'debug') return; const t = m.text(); if (!t.startsWith('CSPRO|')) return; const [, dir, sample, line] = t.split('|'); const k = dir + '|' + (dir === 'script-src-attr' ? sample : 'line ' + line); wouldBlock.set(k, (wouldBlock.get(k) || 0) + 1); });
  const page = await ctx.newPage();
  rec.watch(page, origin);
  if (o.scheme) await ctx.addInitScript((t) => { try { localStorage.setItem('cisa_theme', t); } catch (e) {} }, o.scheme);
  return { ctx, page, server, net, origin };
}
async function open(page, hash = '', base = APP) {
  await page.goto(base + hash);
  await page.waitForFunction(() => document.body.hasAttribute('data-section') || document.body.hasAttribute('data-ka-view'));
  await sleep(150);
}
// A saved progress record with `n` answered free-sample questions (and, optionally, one from the full course).
function profileSeed(ids, extra = []) {
  const now = Date.now();
  const log = {}, answered = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, all: {} }, ds = { 1: { t: 0, c: 0 }, 2: { t: 0, c: 0 }, 3: { t: 0, c: 0 }, 4: { t: 0, c: 0 }, 5: { t: 0, c: 0 } };
  for (const id of [...ids, ...extra]) {
    log[id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: now - 3600000 };
    const d = id[1];
    answered[d][id] = true; ds[d].t++; ds[d].c++;
  }
  const n = ids.length + extra.length;
  const today = new Date(now - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const state = { answerLog: log, mistakeLog: {}, review: {}, bookmarks: [], missedQuestions: [], mockHistory: [], qNotes: {}, studyDays: [today], score: { t: n, c: n }, ds, answeredIds: answered, topicReviewed: {}, topicViewed: {}, topicTicksSchema: 2, activeTab: 'home' };
  return { cisa_profiles_v1: JSON.stringify({ 'CISA-AAAAA': { id: 'CISA-AAAAA', name: 'My Progress', color: '#3F7F96', created: now - 86400000, lastActive: now, totalAnswered: n, state } }), cisa_active_profile: 'CISA-AAAAA' };
}
const freeIds = (d, n) => JSON.parse(fs.readFileSync(path.join(repo, 'data', 'free', `cisa_d${d}.json`), 'utf8')).questions.slice(0, n).map((q) => q.id);
// An account made the way learners make one (a code, then the password), straight on the fake server.
async function makeAccount(server, email = EMAIL, pw = PW, { terms = true, news = false } = {}) {
  const call = async (method, p, body, token) => {
    const res = await server.fetch(F.FAKE_URL + p, { method, headers: { apikey: F.FAKE_KEY, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await res.text();
    if (res.status >= 300) throw new Error(`makeAccount ${p}: ${res.status} ${t}`);
    return t ? JSON.parse(t) : {};
  };
  await call('POST', '/auth/v1/otp', { email, create_user: true, gotrue_meta_security: { captcha_token: 'setup' } });
  const s = await call('POST', '/auth/v1/verify', { type: 'email', email, token: server.codes.get(email) });
  await call('PUT', '/auth/v1/user', { password: pw }, s.access_token);
  if (terms) await call('POST', '/rest/v1/profiles', { terms_version: typeof terms === 'string' ? terms : '2026-12', age_confirmed: true, ...(news ? { privacy_version: '2026-12', source: 'web', marketing_opt_in: true, marketing_wording: '2026-12' } : {}) }, s.access_token);
  await call('POST', '/auth/v1/logout?scope=local', undefined, s.access_token);
  server.calls.length = 0;
  return s.user.id;
}
const calls = (server, p, method) => server.calls.filter((c) => c.path.split('?')[0] === p && (!method || c.method === method));
async function signIn(page, email = EMAIL, pw = PW) {
  await open(page, '#sign-in');
  await page.fill('#kaEmail', email);
  await page.fill('#kaPass', pw);
  await page.press('#kaPass', 'Enter');
}
const view = (page) => page.evaluate(() => document.body.getAttribute('data-ka-view') || '');
// What the account code thinks, for a failed wait's message.
const dump = (page) => page.evaluate(() => { try { return JSON.stringify({ view: document.body.getAttribute('data-ka-view'), busy: ka.busy, syncErr: ka.syncErr, setupDue: ka.setupDue, bank: kaBankReady(), notes: !!kaNoteIds, loading: Object.keys(window.QB_LOADING || {}), state: kaState(), err: (document.getElementById('kaFormE') || {}).textContent }); } catch (e) { return 'dump failed: ' + e.message; } });
const waitView = async (page, v) => {
  // (A notice on the new screen is written a moment after it is drawn, so screen readers say it: wait for its words.)
  try { await page.waitForFunction((x) => { if ((document.body.getAttribute('data-ka-view') || '') !== x) return false; const n = document.getElementById('kaNotice'); return !n || n.hidden || n.textContent.trim() !== ''; }, v, { timeout: 15000 }); }
  catch (e) { throw new Error(`waited for the "${v || 'app'}" view: ${await dump(page)}`); }
};
// Waits for words in an element; a miss is a failed check with the page's own state, not a thrown error.
const waitText = async (page, id, re, c) => {
  try { await page.waitForFunction(({ id, src }) => { const e = document.getElementById(id); return !!e && new RegExp(src).test(e.textContent); }, { id, src: re.source }, { timeout: 8000 }); return true; }
  catch (e) { c.check(false, `waited for ${re} in #${id}: ${await dump(page)}`); return false; }
};
const text = async (page, sel) => norm(await page.locator(sel).first().innerText().catch(() => ''));
const store = (page) => page.evaluate(() => { const o = { local: {}, session: {} }; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o.local[k] = localStorage.getItem(k); } for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); o.session[k] = sessionStorage.getItem(k); } return o; });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// The elements that reach past the right edge (for an overflow failure's message).
const wide = (page) => page.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 6).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : '') + ':' + Math.round(e.getBoundingClientRect().right)).join(' '); });
async function noOverflow(page, c, label) { const o = await overflow(page); c.check(o <= 0, `sideways scroll on ${label} (${o}px): ${o > 0 ? await wide(page) : ''}`); }
// The account parts of a study-app page (the rest of the page is the existing app, scanned by its own gates).
const KA_PARTS = ['#kaCard', '.ka-rail-wrap', '#kaTop', '#kaAccount', '#flagModal'];
// axe (WCAG 2.2 AA and best practice). An account screen is scanned whole; on a study-app page only the account parts.
async function axe(page, c, label, wholePage = false) {
  if (!axeSrc) { axeStats.skipped++; c.note('axe-core not found: accessibility scan skipped for ' + label); return; }
  axeStats.ran++;
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async ({ parts, wholePage }) => {
    const whole = wholePage || document.body.hasAttribute('data-ka-view');
    const here = parts.filter((s) => { const e = document.querySelector(s); return e && e.getClientRects().length > 0 && e.innerHTML.trim() !== ''; });
    if (!whole && !here.length) return ['nothing to scan'];
    const res = await window.axe.run(whole ? document : { include: here.map((s) => [s]) }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }, { parts: KA_PARTS, wholePage });
  c.check(r.length === 0, `axe on ${label}: ${r.join('; ')}`);
}
// Signed in, and no sync is running: what the card says now is what it will keep saying.
const settled = (page) => page.waitForFunction(() => !ka.syncBusy && !ka.firstBusy && /Synced/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 15000 });
// No password, code or human-check token may be saved anywhere in the browser.
async function noSecrets(page, c, secrets, label) {
  const s = JSON.stringify(await store(page));
  for (const x of secrets) c.check(!s.includes(x), `${label}: "${x.slice(0, 6)}…" was found in browser storage`);
  c.check(!/[?&](code|token|password)=/.test(page.url()), `${label}: the address carries a secret (${page.url()})`);
}
// Types a new password and waits for the page's pause in typing to pass (the rules run 200 ms after the last key).
const fillPw = async (page, pw) => { await page.fill('#kaPw', pw); await page.waitForFunction(() => kaPwTimer === null, null, { timeout: 4000 }); };
const goYou = async (page) => { await page.evaluate(() => navTo(null, 'you')); await page.waitForSelector('#kaCard', { state: 'visible' }); await sleep(150); };
const answerKeys = (page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('cisa_profiles_v1') || '{}'); const s = (p[localStorage.getItem('cisa_active_profile')] || {}).state || {}; return { ids: Object.keys(s.answerLog || {}).sort(), score: s.score || null }; });
// Was the study app ever on screen? Sampled every frame from the first moment of the page (for "no flash before the gate").
const WATCH_APP = () => { window.__appSeen = false; const tick = () => { const w = document.getElementById('studyWrap'), r = document.getElementById('appRail'), b = document.getElementById('bottomNav'); if ((w && w.getClientRects().length) || (r && r.getClientRects().length) || (b && b.getClientRects().length)) window.__appSeen = true; requestAnimationFrame(tick); }; tick(); };
const appShown = (page) => page.evaluate(() => ['studyWrap', 'appRail', 'bottomNav'].some((id) => { const e = document.getElementById(id); return !!e && e.getClientRects().length > 0; }));
const only = (process.env.SMOKE_ONLY || '').split(',').filter(Boolean);
const wanted = (id) => !only.length || only.some((o) => id === o || id.startsWith(o + '-') || o.startsWith(id + '-'));

// ── A0. The switch is off: nothing loads, nothing shows, nothing is sent ──
if (wanted('A0')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, net } = await setup({ view: v, preview: false });
    await rec.run(`A0-${v}`, 'Switch off: no account screen, no account script, no request to the sign-in service', page, async (c) => {
      await open(page);
      await page.click(v === 'phone' ? '#bottomNav [data-sec="you"]' : '#sideNav [data-sec="you"]');
      await sleep(400);
      const dom = await page.evaluate(() => ({ root: !!document.getElementById('kaRoot'), card: !!document.querySelector('.ka-card'), rail: !!document.getElementById('kaRail'), top: !!document.getElementById('kaTop'), acct: !!document.getElementById('screen-account'), on: window.KS_ACCT && window.KS_ACCT.enabled, flag: window.ACCOUNTS_ON, cloud: typeof window.KaiSipCloud, words: typeof window.KaiSipPasswordWords, ts: typeof window.turnstile }));
      c.check(dom.flag === false, 'ACCOUNTS_ON must be false in this commit');
      c.check(dom.on === false, 'accounts must be off without the preview note');
      c.check(!dom.root && !dom.card && !dom.rail && !dom.top && !dom.acct, 'no account element may exist: ' + JSON.stringify(dom));
      c.check(dom.cloud === 'undefined' && dom.words === 'undefined' && dom.ts === 'undefined', 'no account script may be loaded: ' + JSON.stringify(dom));
      for (const h of ['#sign-in', '#create-account', '#forgot-password', '#account', '#delete-account']) {
        await page.evaluate((x) => { location.hash = x; }, h);
        await sleep(200);
        c.check((await view(page)) === '' && !(await page.evaluate(() => document.getElementById('kaRoot'))), `${h} must do nothing with accounts off`);
      }
      await page.goto(APP + '?code=abc12345&error=x#today');
      await sleep(300);
      c.check(page.url().includes('code=abc12345'), 'with accounts off the address is left alone (no code is expected, none is read)');
      // The preview address works on kaisip.com only after it is asked for; asked for on another address it does nothing (below).
      c.check(net.cloudJs === 0 && net.wordsJs === 0, `account scripts were requested (${net.cloudJs}, ${net.wordsJs})`);
      c.check(net.supabase === 0 && net.turnstile === 0 && net.hibp.length === 0, `requests left the site: supabase ${net.supabase}, human check ${net.turnstile}, leak lookup ${net.hibp.length}`);
      c.check(net.third.filter((u) => !/googletagmanager|google-analytics|cloudflareinsights/.test(u)).length === 0, 'unexpected third-party requests: ' + net.third.join(', '));
      await c.shot(`a0-${v}-you`);
    });
    await ctx.close();
  }
  // Another address (a copy of the site, a preview host) never gets accounts, even with the note saved and the preview address used.
  {
    const other = 'https://kaisip.pages.dev';
    const { ctx, page, net } = await setup({ origin: other, preview: true });
    await rec.run('A0-other-address', 'Another address: the preview note and the preview address do nothing', page, async (c) => {
      await open(page, '#accounts-preview=on', other + '/app/');
      const st = await page.evaluate(() => ({ on: window.KS_ACCT.enabled, root: !!document.getElementById('kaRoot') }));
      c.check(st.on === false && !st.root, 'accounts must stay off away from https://kaisip.com');
      await page.evaluate(() => { location.hash = '#sign-in'; });
      await sleep(200);
      c.check(net.cloudJs === 0 && net.supabase === 0, 'no account script or request on another address');
    });
    await ctx.close();
  }
  // The owner's preview: switched on only with the phrase, kept in this browser, switched off by anyone.
  {
    const { ctx, page, net } = await setup({ preview: false });
    await rec.run('A0-preview-switch', 'The owner’s preview: on only with the secret phrase, checked at every load; off with =off', page, async (c) => {
      const on = () => page.evaluate(() => window.KS_ACCT.enabled === true);
      await open(page, '#accounts-preview=on');
      c.check(!(await on()) && (await page.evaluate(() => localStorage.getItem('kaisip_accounts_preview'))) === null && !page.url().includes('accounts-preview'), '"=on" switches nothing on (and the words leave the address)');
      await page.goto('about:blank');
      await open(page, '#accounts-preview=' + TEST_PHRASE.slice(0, -1) + 'x');
      c.check(!(await on()), 'a wrong phrase switches nothing on');
      // A value typed into the browser's storage by hand does nothing either.
      await page.evaluate(() => localStorage.setItem('kaisip_accounts_preview', '1'));
      await page.goto('about:blank'); await open(page);
      c.check(!(await on()) && !(await page.evaluate(() => document.getElementById('kaRoot'))), 'the old "1" note, set by hand, switches nothing on');
      await page.goto('about:blank');
      await open(page, '#accounts-preview=' + TEST_PHRASE);
      c.check((await on()) && (await page.evaluate(() => !!document.getElementById('kaRoot'))), 'the phrase switches accounts on in this browser');
      c.check(!page.url().includes('accounts-preview') && !page.url().includes(TEST_PHRASE), 'the phrase is taken out of the address at once: ' + page.url());
      await page.goto('about:blank'); await open(page);
      c.check(await on(), 'and it stays on at the next visit');
      c.check(net.cloudJs === 0 && net.supabase === 0, 'the welcome still loads no account script');
      await page.goto('about:blank');
      await open(page, '#accounts-preview=off');
      c.check(!(await on()) && (await page.evaluate(() => localStorage.getItem('kaisip_accounts_preview') === null && !document.getElementById('kaRoot'))), '"=off" switches it off again, for anyone');
    });
    await ctx.close();
  }
  // The page as it is published (its own hash): the tests' phrase, "on" and a hand-set note all do nothing.
  {
    const { ctx, page, net } = await setup({ preview: false, realHash: true });
    await rec.run('A0-preview-secret', 'The published page: nobody without the owner’s phrase can switch accounts on, and the phrase is not in the repo', page, async (c) => {
      for (const v of ['on', '1', 'true', TEST_PHRASE]) {
        await page.goto('about:blank');
        await open(page, '#accounts-preview=' + v);
        c.check(await page.evaluate(() => window.KS_ACCT.enabled === false && !document.getElementById('kaRoot')), `#accounts-preview=${v === TEST_PHRASE ? '<another phrase>' : v} does nothing`);
      }
      for (const v of ['1', 'on', TEST_PHRASE]) {
        await page.evaluate((x) => localStorage.setItem('kaisip_accounts_preview', x), v);
        await page.goto('about:blank'); await open(page);
        c.check(await page.evaluate(() => window.KS_ACCT.enabled === false), 'a note set by hand does nothing');
      }
      c.check(net.cloudJs === 0 && net.supabase === 0, 'and nothing account-related was loaded or sent');
      // The page holds a hash, never the phrase; the docs and the page never show a working switch.
      const hash = (html.match(/var KS_PREVIEW_HASH = '([0-9a-f]{64})';/) || [])[1];
      const docs = ['docs/WEBSITE_DEPLOY.md', 'docs/WEB_LAUNCH_PLAN.md', 'docs/mobile/ACCOUNTS_BETA_PLAN.md', 'docs/mobile/DESIGN_SYSTEM.md'].map((f) => fs.readFileSync(path.join(repo, f), 'utf8')).join('\n');
      c.check(!!hash && !/accounts-preview=on\b/.test(html + docs), 'no file documents "#accounts-preview=on"');
      const words = (html + docs).match(/[A-Za-z0-9_-]{20,64}/g) || [];
      c.check(!words.some((w) => crypto.createHash('sha256').update(w, 'utf8').digest('hex') === hash), 'no word in the page or the docs is the phrase');
    });
    await ctx.close();
  }
}

// ── A1. Sign in ──
if (wanted('A1')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server, net } = await setup({ view: v });
    await makeAccount(server);
    await rec.run(`A1-${v}`, 'Sign in: form practice, a wrong password, rate limit, offline, then signed in', page, async (c) => {
      await open(page, '#sign-in');
      await waitView(page, 'signin');
      c.check((await text(page, '#kaRoot h1')) === 'Welcome back', 'the Sign in title');
      c.check(await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'H1'), 'focus starts on the screen title');
      const attrs = await page.evaluate(() => { const g = (id) => { const e = document.getElementById(id); return e && { ac: e.autocomplete, type: e.type, name: e.name, ph: e.placeholder, label: (document.querySelector('label[for=' + id + ']') || {}).textContent }; }; return { email: g('kaEmail'), pass: g('kaPass'), forms: document.querySelectorAll('#kaRoot form').length }; });
      c.check(attrs.email.ac === 'username' && attrs.email.type === 'email' && attrs.email.label === 'Email' && !attrs.email.ph, 'the email field: autocomplete=username, a label, no placeholder: ' + JSON.stringify(attrs.email));
      c.check(attrs.pass.ac === 'current-password' && attrs.pass.type === 'password' && attrs.pass.label === 'Password' && !attrs.pass.ph, 'the password field: autocomplete=current-password: ' + JSON.stringify(attrs.pass));
      c.check(attrs.forms === 1, 'one form on the screen');
      c.check(net.cloudJs === 1 && net.turnstile === 1, `the account script and the human check load when the form opens (${net.cloudJs}, ${net.turnstile})`);
      c.check(net.wordsJs === 0, 'the password word lists are not needed to sign in');
      await axe(page, c, `sign in (${v})`);
      await noOverflow(page, c, 'Sign in');
      // Empty form: words, not a server call.
      await page.click('#kaGo');
      c.check(/Enter your email address/.test(await text(page, '#kaEmailE')), 'an empty email is asked for in words');
      c.check(calls(server, '/auth/v1/token').length === 0, 'nothing is sent for an empty form');
      // Show / Hide, and paste is allowed.
      await page.fill('#kaEmail', EMAIL);
      await page.fill('#kaPass', 'not the right password');
      await page.click('.ka-reveal');
      c.check((await page.getAttribute('#kaPass', 'type')) === 'text' && /^Hide/.test(await text(page, '.ka-reveal')), 'Show turns the password into text and reads Hide');
      await page.click('.ka-reveal');
      c.check((await page.getAttribute('#kaPass', 'type')) === 'password', 'Hide turns it back');
      c.check(await page.evaluate(() => { const e = document.getElementById('kaPass'); const ev = new ClipboardEvent('paste', { cancelable: true, bubbles: true }); return e.dispatchEvent(ev); }), 'paste into the password field is not blocked');
      // A wrong password: the generic words, role=alert, the field marked, Enter submits.
      await page.press('#kaPass', 'Enter');
      await waitText(page, 'kaPassE', /./, c);
      const err = await text(page, '#kaPassE');
      c.check(/^Email or password is incorrect/.test(err), 'the generic sign-in error: ' + err);
      c.check((await page.getAttribute('#kaPassE', 'role')) === 'alert' && (await page.getAttribute('#kaPass', 'aria-invalid')) === 'true' && (await page.getAttribute('#kaPass', 'aria-describedby')).includes('kaPassE'), 'the error is an alert tied to the field');
      c.check(await page.evaluate(() => document.activeElement.id === 'kaPass'), 'focus moves to the field with the error');
      const sent = calls(server, '/auth/v1/token')[0];
      c.check(sent && /^ts-token-/.test(sent.body.gotrue_meta_security?.captcha_token || ''), 'the human-check token travels with the sign-in');
      // An unknown address gets the very same words.
      await page.fill('#kaEmail', 'nobody@example.com');
      await page.press('#kaPass', 'Enter');
      await waitText(page, 'kaPassE', /./, c);
      c.check((await text(page, '#kaPassE')) === err, 'an unknown address reads the same as a wrong password');
      c.check(!/invalid login|credentials|supabase|gotrue/i.test(await text(page, '#kaRoot')), 'no server text on the screen');
      await c.shot(`a1-${v}-error`);
      // Rate limited, then offline: calm words.
      await page.fill('#kaEmail', EMAIL);
      server.force('/auth/v1/token', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }, { 'Retry-After': '30' });
      await page.press('#kaPass', 'Enter');
      await waitText(page, 'kaFormE', /Too many tries/, c);
      c.check(/wait 30 seconds/.test(await text(page, '#kaFormE')), 'a rate limit says how long to wait: ' + (await text(page, '#kaFormE')));
      server.offline = true;
      await page.press('#kaPass', 'Enter');
      await waitText(page, 'kaFormE', /offline/, c);
      c.check(/Your progress stays in this browser/.test(await text(page, '#kaFormE')), 'offline says progress is safe');
      server.offline = false;
      // The right password.
      await page.fill('#kaPass', PW);
      await page.press('#kaPass', 'Enter');
      await waitView(page, '');
      await settled(page);
      c.check((await page.evaluate(() => document.body.getAttribute('data-tab'))) === 'home' && await appShown(page), 'signed in lands on Today, in the study app');
      await goYou(page);
      c.check(/m•••@example\.com/.test(await text(page, '#kaCard')), 'the card on You shows the masked email: ' + (await text(page, '#kaCard')));
      c.check(calls(server, '/rest/v1/sync_snapshots', 'POST').length >= 1, 'this browser’s progress was pushed to the account');
      await noSecrets(page, c, [PW, 'not the right password', 'ts-token-'], 'after sign-in');
      c.check(!net.badKey, 'every request carried the public key');
      await c.shot(`a1-${v}-signed-in`);
    });
    await ctx.close();
  }
}

// ── A2. Create an account: email and the agreements, the code, the password ──
// A stand-in for the consent API the database engineer is building (the page's adapter calls it when it exists).
// What the page wrote to the consent record (every POST and PATCH body, in order).
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));
const consentWrites = (server) => server.calls.filter((x) => x.path.split('?')[0] === '/rest/v1/profiles' && x.method !== 'GET').map((x) => ({ method: x.method, ...x.body }));
const paste = (page, sel, value) => page.evaluate(({ sel, value }) => { const el = document.querySelector(sel); el.focus(); const dt = new DataTransfer(); dt.setData('text', value); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, { sel, value });
const toast = (page) => page.evaluate(() => (document.getElementById('globalToast') || {}).textContent || '');
if (wanted('A2')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server, net } = await setup({ view: v });
    const MAIL = 'xochitl.brennagh@example.com';
    await rec.run(`A2-${v}`, 'Create account: the agreements block sending, the code (wrong, pasted), every refused password, a leaked one, then created', page, async (c) => {
      await open(page, '#create-account');
      await waitView(page, 'signup1');
      c.check((await text(page, '#kaRoot h1')) === 'Create your KaiSip account', 'the Create account title');
      c.check(/^Step 1 of 3/.test(await text(page, '.ka-steps')) && (await page.getAttribute('.ka-step.is-current', 'aria-current')) === 'step', 'Step 1 of 3 in words, with the current step marked');
      const boxes = await page.evaluate(() => ['kaTerms', 'kaNews'].map((id) => { const e = document.getElementById(id); return { checked: e.checked, req: e.getAttribute('aria-required'), label: e.closest('label').innerText.replace(/\s+/g, ' ').trim() }; }));
      c.check((await page.evaluate(() => document.querySelectorAll('#kaRoot input[type=checkbox]').length)) === 2 && !(await page.evaluate(() => document.getElementById('kaAge'))), 'two boxes only: the agreement and the optional news box (no age box)');
      c.check(boxes.every((b) => b.checked === false), 'no box is pre-ticked: ' + JSON.stringify(boxes));
      c.check(/^I agree to the Terms of Use( \(opens in a new tab\))? and Privacy Policy( \(opens in a new tab\))? ?\.$/.test(boxes[0].label) && boxes[0].req === 'true', 'the one required agreement: ' + boxes[0].label);
      c.check(await page.evaluate(() => { const a = [...document.querySelectorAll('#kaRoot .ka-consent a')]; return a.map((x) => x.getAttribute('href')).join(',') === 'terms.html,privacy.html' && a.every((x) => x.target === '_blank'); }), 'the Terms of Use and the Privacy Policy are linked, in a new tab');
      const age = await page.evaluate(() => { const l = document.getElementById('kaAgeLine'); const box = document.getElementById('kaTerms').closest('label'); const go = document.getElementById('kaGo'); return { words: l.textContent, under: box.nextElementSibling === l, above: !!(l.compareDocumentPosition(go) & 4), shown: l.getClientRects().length > 0 }; });
      c.check(age.words === 'Accounts are for learners 18 and older.' && age.under && age.above && age.shown, 'the age line sits directly under the box and above the buttons: ' + JSON.stringify(age));
      c.check((await text(page, '#kaConsentHint')) === 'Tick the box above to continue.' && await page.isVisible('#kaConsentHint'), 'the hint shows while the box is unticked');
      const opt = await page.evaluate(() => { const g = document.querySelector('.ka-consent-opt'); return { label: g.querySelector('.ka-label').textContent, apart: g !== document.getElementById('kaTerms').closest('fieldset') && getComputedStyle(g).borderTopWidth !== '0px' }; });
      c.check(boxes[1].label === 'Email me KaiSip study tips and news (optional). Unsubscribe anytime.' && boxes[1].req === null && opt.label === 'Optional' && opt.apart, 'the news box is separate, divided and labelled Optional: ' + boxes[1].label + ' ' + JSON.stringify(opt));
      c.check(!/ISACA/.test(await text(page, '#kaRoot')), 'the "not affiliated" line is off the sign-up screens');
      await axe(page, c, `create account step 1 (${v})`);
      await noOverflow(page, c, 'Create account step 1');
      // Not ticked: Send is refused in words, and so is Google.
      await page.fill('#kaEmail', MAIL);
      await page.press('#kaEmail', 'Enter');
      c.check((await text(page, '#kaConsentE')) === 'Tick the box above to continue.' && (await page.getAttribute('#kaConsentE', 'role')) === 'alert' && !(await page.isVisible('#kaConsentHint')), 'an unticked agreement stops the form, in words about one box, said once: ' + (await text(page, '#kaConsentE')));
      c.check(await page.evaluate(() => document.activeElement.id === 'kaTerms' && document.getElementById('kaTerms').getAttribute('aria-describedby').includes('kaConsentE')), 'focus goes to the box, which is described by the message');
      await page.click('.ka-btn-google');
      await sleep(200);
      c.check((await view(page)) === 'signup1' && !(await store(page)).session.kaisip_pkce_v1, 'Google sign-up is stopped by the same agreement');
      // The optional box alone is not the agreement.
      await page.check('#kaNews', { force: true });
      await page.click('#kaGo');
      c.check((await text(page, '#kaConsentE')) === 'Tick the box above to continue.', 'the optional box is not the agreement');
      await page.uncheck('#kaNews', { force: true });
      c.check(calls(server, '/auth/v1/otp').length === 0 && net.supabase === 0, 'no code is asked for (and nothing is sent) before the agreement');
      await c.shot(`a2-${v}-blocked`);
      await page.check('#kaTerms', { force: true });
      c.check((await text(page, '#kaConsentE')) === '' && !(await page.isVisible('#kaConsentHint')), 'ticking the box clears the message and the hint');
      await page.click('#kaGo');
      await waitView(page, 'signup2');
      const otp = calls(server, '/auth/v1/otp')[0];
      c.check(otp && otp.body.email === MAIL && otp.body.create_user === true && /^ts-token-/.test(otp.body.gotrue_meta_security?.captcha_token || '') && !('password' in otp.body), 'the code request: the email, the human-check token, no password: ' + JSON.stringify(otp && otp.body));
      const pending = JSON.parse((await store(page)).session.kaisip_signup_pending_v1 || 'null');
      c.check(pending && pending.termsAccepted === true && pending.ageConfirmed === true && pending.marketingOptIn === false && pending.email === MAIL.toLowerCase() && pending.google === false && Math.abs(Date.now() - pending.at) < 60000 && Object.keys(pending).length === 6, 'what was ticked waits in this tab only, saying whose it is and when: ' + JSON.stringify(pending));
      // Step 2: one input drawn as joined cells.
      c.check((await text(page, '#kaRoot h1')) === 'Check your inbox' && (await text(page, '.ka-lede')).includes(MAIL), 'step 2 names the address');
      const code = await page.evaluate(() => { const e = document.getElementById('kaCode'); return { n: document.querySelectorAll('#kaRoot input:not([type=hidden])').length, ac: e.autocomplete, im: e.inputMode, max: e.maxLength, cells: document.querySelectorAll('.ka-cell').length, groups: document.querySelectorAll('.ka-code-grp').length, label: document.querySelector('label[for=kaCode]').textContent }; });
      c.check(code.n === 1 && code.ac === 'one-time-code' && code.im === 'numeric' && code.max === 8 && code.cells === 8 && code.groups === 2 && code.label === '8-digit code', 'the code is ONE input (one-time-code, numeric, 8) drawn as two groups of four cells: ' + JSON.stringify(code));
      c.check(/You can ask for a new code in \d:\d\d\./.test(await text(page, '.ka-resend')) && await page.isDisabled('#kaResend'), 'a new code can be asked for after a minute');
      await axe(page, c, `create account step 2 (${v})`);
      await noOverflow(page, c, 'Create account step 2');
      await page.click('#kaGo');
      c.check(/Enter all 8 digits/.test(await text(page, '#kaCodeE')), 'an empty code is asked for in words');
      await page.fill('#kaCode', '00000000');
      await c.shot(`a2-${v}-code`);
      await page.press('#kaCode', 'Enter');
      await waitText(page, 'kaCodeE', /didn.t work/, c);
      c.check((await page.getAttribute('#kaCode', 'aria-invalid')) === 'true' && (await page.getAttribute('#kaCodeE', 'role')) === 'alert' && !/expired|otp|token/i.test(await text(page, '#kaCodeE')), 'a wrong code: calm words tied to the field: ' + (await text(page, '#kaCodeE')));
      c.check((await view(page)) === 'signup2', 'a wrong code stays on the code step');
      // Paste, with the space an email client may add.
      const real = server.codes.get(MAIL);
      await page.fill('#kaCode', '');
      await paste(page, '#kaCode', ` ${real.slice(0, 4)} ${real.slice(4)}\n`);
      c.check((await page.inputValue('#kaCode')) === real && (await page.evaluate(() => [...document.querySelectorAll('.ka-cell')].map((x) => x.textContent).join(''))) === real, 'a pasted code keeps its 8 digits and fills the cells');
      await page.press('#kaCode', 'Enter');
      await waitView(page, 'signup3');
      // Step 3: the password.
      c.check((await text(page, '#kaRoot h1')) === 'Create a password' && /^Step 3 of 3/.test(await text(page, '.ka-steps')), 'step 3');
      const pwf = await page.evaluate(() => { const e = document.getElementById('kaPw'); const u = document.querySelector('#kaForm input[autocomplete=username]'); return { ac: e.autocomplete, type: e.type, user: u && u.value, label: document.querySelector('label[for=kaPw]').textContent, forms: document.querySelectorAll('#kaRoot form').length }; });
      c.check(pwf.ac === 'new-password' && pwf.type === 'password' && /^Show/.test(await text(page, '.ka-reveal')) && pwf.user === MAIL && pwf.label === 'New password' && pwf.forms === 1, 'the new password field: autocomplete=new-password, hidden as typed with a Show button, with the email beside it for password managers: ' + JSON.stringify(pwf));
      await page.waitForFunction(() => window.KaiSipCloud && window.KaiSipCloud.passwordRules.passwordWordsLoaded(), null, { timeout: 15000 });
      c.check(net.wordsJs === 1, 'the word lists load when the password form opens, once');
      c.check(await page.evaluate(() => { const x = [...document.scripts].find((e) => /kaisip-password-words/.test(e.src)); return !!x && /^sha256-/.test(x.integrity) && x.integrity === window.KaiSipCloud.passwordWordsIntegrity; }), 'the word lists are loaded with their fingerprint (the browser refuses a changed file)');
      // The checklist: five items, each with an icon and the words Met or Not yet.
      const list = () => page.evaluate(() => [...document.querySelectorAll('#kaPwHelp .ka-pw-list li')].map((li) => ({ label: li.querySelector('.ka-pw-l').textContent, word: li.querySelector('.ka-pw-s').textContent, met: li.classList.contains('is-met'), icon: !!li.querySelector('svg') })));
      const empty = await list();
      const plain = (t) => t.replace(/\u00a0/g, ' ');
      c.check(JSON.stringify(empty.map((x) => plain(x.label))) === JSON.stringify(['12 or more characters', 'A lowercase letter (a to z)', 'An uppercase letter (A to Z)', 'A number (0 to 9)', 'A symbol such as ! ? # @']), 'the five items, in order: ' + empty.map((x) => plain(x.label)).join(' / '));
      c.check(await page.evaluate(() => JSON.stringify(window.KaiSipCloud.passwordRules.PASSWORD_CHECKLIST_ITEMS.map((x) => x.label)) === JSON.stringify(KA_PW_ITEMS)), 'the labels are the shared rules’ own (the page’s first-draw copy matches them)');
      c.check(empty.every((x) => !x.met && x.word === 'Not yet' && x.icon), 'before typing every item reads "Not yet", with an icon');
      c.check(/Your password needs/.test(await text(page, '#kaPwHelp')) && (await page.getAttribute('#kaPw', 'aria-describedby')).includes('kaPwHelp'), 'the list is tied to the field');
      c.check(!/No symbols or numbers required|\b15\b/.test(await text(page, '#kaRoot')), 'the old "15 characters, nothing else required" wording is gone');
      await axe(page, c, `create account step 3 (${v})`);
      await noOverflow(page, c, 'Create account step 3');
      await c.shot(`a2-${v}-checklist-empty`);
      // The rules run on a pause in typing, never on every key (a slow phone needs about a tenth of a second for one run).
      await page.evaluate(() => { const R = window.KaiSipCloud.passwordRules, real = R.passwordChecklist; window.__pwRuns = 0; R.passwordChecklist = function () { window.__pwRuns++; return real.apply(this, arguments); }; });
      await page.focus('#kaPw');
      await page.keyboard.type('Tidal lamp oyster seven', { delay: 25 });
      const during = await page.evaluate(() => window.__pwRuns);
      await page.waitForFunction(() => kaPwTimer === null, null, { timeout: 4000 });
      const after = await page.evaluate(() => window.__pwRuns);
      c.check(during === 0 && after === 1, `23 keys typed quickly: the rules ran ${during} times while typing and ${after} time(s) after the pause`);
      c.check((await list()).filter((x) => x.met).length === 3, 'and the card then shows what was typed (length, lowercase, uppercase met)');
      await page.fill('#kaPw', 'Tidal lamp');
      await page.press('#kaPw', 'Enter');
      c.check(await page.evaluate(() => kaPwTimer === null && /Not saved yet/.test(document.getElementById('kaPwHelp').textContent)), 'sending the form does not wait for the pause: the card answers at once');
      await fillPw(page, '');
      // Typing ticks items one by one; the summary for screen readers waits until typing stops.
      const saidBefore = await page.evaluate(() => document.getElementById('kaPwSay').textContent);
      await fillPw(page, 'ocean violet');
      let now = await list();
      c.check(JSON.stringify(now.map((x) => x.word)) === JSON.stringify(['Met', 'Met', 'Not yet', 'Not yet', 'Not yet']), '"ocean violet": length and lowercase met: ' + now.map((x) => x.word).join(','));
      c.check((await page.evaluate(() => document.getElementById('kaPwSay').textContent)) === saidBefore, 'nothing new is announced on the keystroke itself');
      await page.waitForFunction(() => /2 of 5 met\. Still needed: an uppercase letter, a number, a symbol\./.test(document.getElementById('kaPwSay').textContent), null, { timeout: 4000 }).catch(() => {});
      c.check(/2 of 5 met\. Still needed: an uppercase letter, a number, a symbol\./.test(await page.evaluate(() => document.getElementById('kaPwSay').textContent)), 'one polite summary after typing stops: ' + (await page.evaluate(() => document.getElementById('kaPwSay').textContent)));
      c.check((await page.getAttribute('#kaPwSay', 'aria-live')) === 'polite', 'the summary is polite, never an interruption');
      // Sent while items are missing: the card says exactly what to add; no second red line.
      await page.press('#kaPw', 'Enter');
      await page.waitForFunction(() => /Not saved yet/.test(document.getElementById('kaPwHelp').textContent));
      c.check(/Add an uppercase letter \(A to Z\), a number \(0 to 9\) and a symbol such as ! \? # @\./.test(await text(page, '#kaPwHelp')) && (await text(page, '#kaPwE')) === '' && (await page.getAttribute('#kaPw', 'aria-invalid')) === 'true', 'a refused send: the card says what to add, once, and the field is marked: ' + (await text(page, '#kaPwHelp')));
      c.check((await page.getAttribute('#kaPw', 'type')) === 'password', 'the field stays hidden when it is sent');
      await fillPw(page, 'Oc7!');
      c.check((await page.getAttribute('#kaPw', 'aria-invalid')) === null && /Your password needs/.test(await text(page, '#kaPwHelp')), 'typing again clears the refusal');
      now = await list();
      c.check(JSON.stringify(now.map((x) => x.word)) === JSON.stringify(['Not yet', 'Met', 'Met', 'Met', 'Met']), 'four kinds but too short: ' + now.map((x) => x.word).join(','));
      // All five met, but the shared rules still refuse it: the card says why, in the rules' own words.
      const refused = [
        ['Passwordpassword1!', /used by many people or is easy to guess, even with capitals, numbers and symbols added/],
        ['Qwertyuiop123!', /Avoid repeats, sequences, dates, keyboard patterns/],
        ['Ocean violet 7!', /Two common words are easy to guess, even with a number and a symbol\. Add another word that doesn.t go with them\./],
        ['Xochitl brennagh 1990!', /from your email address or your name/],
        ['Kaisip kaisip 2026!', /the app.s or the exam.s name/],
        ['Aa1!' + 'x'.repeat(70), /Use up to 72/],
      ];
      for (const [pw, words] of refused) {
        await fillPw(page, pw);
        const card = await text(page, '#kaPwHelp');
        c.check(/This one would be refused/.test(card) && words.test(card) && (await page.evaluate(() => document.getElementById('kaPwHelp').classList.contains('is-refused') && !!document.querySelector('#kaPwHelp .ka-pw-head svg'))), `the live card for "${pw.slice(0, 12)}…" (an icon and the reason): ` + card);
        await page.press('#kaPw', 'Enter');
        await page.waitForFunction(() => /Not saved yet/.test(document.getElementById('kaPwHelp').textContent));
        c.check(words.test(await text(page, '#kaPwHelp')) && (await text(page, '#kaPwE')) === '', `sent: the same reason, said once, for "${pw.slice(0, 12)}…"`);
      }
      await c.shot(`a2-${v}-refused`);
      // Show / Hide on the new password.
      await page.click('.ka-reveal');
      c.check((await page.getAttribute('#kaPw', 'type')) === 'text' && /^Hide/.test(await text(page, '.ka-reveal')), 'Show reveals the password');
      await page.click('.ka-reveal');
      c.check(calls(server, '/auth/v1/user', 'PUT').length === 0, 'a refused password is never sent');
      await c.shot(`a2-${v}-refused`);
      // A leaked password: refused with its own words; only 5 characters of each hash leave.
      net.leaked.add(PW);
      await fillPw(page, PW);
      // An accepted password "works", and that is all the card says: 15 or more characters is a
      // length label in the rules ('long'), never shown as a strength rating.
      await fillPw(page, 'Tidal lamp 7!');
      c.check(/This password works\./.test(await text(page, '#kaPwHelp')) && await page.evaluate(() => window.KaiSipCloud.passwordRules.passwordChecklist('Tidal lamp 7!').state === 'ok'), 'an accepted 13-character password: "This password works."');
      await fillPw(page, PW);
      const good = await text(page, '#kaPwHelp');
      c.check(/This password works\./.test(good) && !/strong|nicely|great|excellent/i.test(good) && (await list()).every((x) => x.met && x.word === 'Met') && await page.evaluate((p) => window.KaiSipCloud.passwordRules.passwordChecklist(p).state === 'long', PW), 'a longer accepted password says the same, with no strength claim: ' + good);
      await page.waitForFunction(() => /All 5 met\. This password works\./.test(document.getElementById('kaPwSay').textContent), null, { timeout: 4000 }).catch(() => {});
      c.check(/All 5 met\. This password works\./.test(await page.evaluate(() => document.getElementById('kaPwSay').textContent)), 'and it is said once, politely');
      await c.shot(`a2-${v}-good`);
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwE', /data leak/, c);
      c.check((await page.getAttribute('#kaPwE', 'role')) === 'alert' && (await page.getAttribute('#kaPw', 'aria-invalid')) === 'true', 'a leak found at save is the one refusal shown under the field (the card cannot know it)');
      c.check(calls(server, '/auth/v1/user', 'PUT').length === 0, 'a leaked password is not saved');
      c.check(net.hibp.length > 0 && net.hibp.every((p) => /^\/range\/[0-9A-Fa-f]{5}$/.test(p)), 'the leak lookup sends 5 characters of a hash and nothing else: ' + net.hibp.join(','));
      // The lookup can't be reached: the password is saved, and the screen says so calmly.
      net.hibpMode = 'down';
      await fillPw(page, PW2);
      c.check((await text(page, '#kaPwE')) === '' && (await page.getAttribute('#kaPw', 'aria-invalid')) === null, 'typing a new password clears the leak message (never two opposite messages)');
      await page.press('#kaPw', 'Enter');
      await waitView(page, '');
      c.check(/couldn.t check this password against known leaks/.test(await toast(page)) && /signed in/.test(await toast(page)), 'the "couldn’t check" state is said calmly after saving: ' + (await toast(page)));
      const put = calls(server, '/auth/v1/user', 'PUT')[0];
      c.check(put && put.body.password === PW2, 'the password is saved with the fresh session');
      const user = server.userByEmail(MAIL);
      c.check(user && server.profiles.get(user.id) === '2026-12', 'the Terms version is saved for the account');
      const wrote = consentWrites(server);
      c.check(canon(wrote) === canon([{ method: 'POST', terms_version: '2026-12', age_confirmed: true, privacy_version: '2026-12', source: 'web' }]), 'agreeing writes the record once: both versions, the age confirmation, the source, and nothing about emails: ' + JSON.stringify(wrote));
      c.check(await page.evaluate(() => JSON.stringify(window.KaiSipCloud.config.CONSENT) === JSON.stringify({ terms: '2026-12', privacy: '2026-12', news: '2026-12', source: 'web' })), 'the labels come from the shared client');
      c.check(calls(server, '/functions/v1/newsletter-sync').length === 0, 'the email service is not called for a learner who did not tick the box');
      c.check(!(await store(page)).session.kaisip_signup_pending_v1, 'the waiting agreements are cleared once saved');
      await settled(page);
      await goYou(page);
      c.check(/x•••@example\.com/.test(await text(page, '#kaCard')), 'signed in: ' + (await text(page, '#kaCard')));
      await noSecrets(page, c, [PW, PW2, real, 'Passwordpassword1!', 'ts-token-'], 'after creating the account');
      const all = await text(page, 'body');
      c.check(!/maple tea|coffee before|correct horse/i.test(all), 'no example password anywhere');
    });
    await ctx.close();
  }
  // The optional news box ticked: the opt-in and its wording go in the same record, and the email service is told.
  {
    const { ctx, page, server } = await setup({ view: 'phone' });
    server.kit = new Map();
    await rec.run('A2-news', 'Create account with the news box ticked: the opt-in is recorded with its wording, and the confirmation email is asked for', page, async (c) => {
      await open(page, '#create-account');
      await page.fill('#kaEmail', EMAIL);
      for (const id of ['#kaTerms', '#kaNews']) await page.check(id, { force: true });
      await page.press('#kaEmail', 'Enter');
      await waitView(page, 'signup2');
      c.check(JSON.parse((await store(page)).session.kaisip_signup_pending_v1).marketingOptIn === true, 'the ticked box waits with the agreement');
      await page.fill('#kaCode', server.codes.get(EMAIL));
      await page.press('#kaCode', 'Enter');
      await waitView(page, 'signup3');
      await fillPw(page, PW);
      await page.press('#kaPw', 'Enter');
      await waitView(page, '');
      const wrote = consentWrites(server);
      c.check(canon(wrote) === canon([{ method: 'POST', terms_version: '2026-12', age_confirmed: true, privacy_version: '2026-12', source: 'web', marketing_opt_in: true, marketing_wording: '2026-12' }]), 'one record: the agreement and the opt-in with the wording shown: ' + JSON.stringify(wrote));
      c.check(!/_at"/.test(JSON.stringify(wrote)), 'no time is sent (the server sets each one)');
      await page.waitForFunction(() => true);
      await sleep(300);
      const sync = calls(server, '/functions/v1/newsletter-sync');
      c.check(sync.length === 1 && JSON.stringify(sync[0].body) === '{}' && server.kit.get(EMAIL) === 'inactive', 'the email service is asked once, with an empty body, and sends its confirmation email: ' + JSON.stringify(sync.map((x) => x.body)));
      c.check(!(await store(page)).local.kaisip_consent_v1, 'nothing about the choice is kept in this browser');
      c.check(/Sync is on|signed in/.test(await toast(page)), 'created and signed in: ' + (await toast(page)));
    });
    await ctx.close();
  }
}

// ── A3. Forgot password ──
if (wanted('A3')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server, net } = await setup({ view: v });
    await makeAccount(server);
    await rec.run(`A3-${v}`, 'Forgot password: the same answer for every address, a wrong code, a refused password, then a new password signs in', page, async (c) => {
      await open(page, '#sign-in');
      await page.click('.ka-aside');
      await waitView(page, 'forgot1');
      c.check((await text(page, '#kaRoot h1')) === 'Reset your password', 'the reset title');
      await axe(page, c, `forgot password, email (${v})`);
      await noOverflow(page, c, 'Forgot password');
      await page.fill('#kaEmail', 'nobody@example.com');
      await page.press('#kaEmail', 'Enter');
      await waitView(page, 'forgot2');
      const unknown = (await text(page, '.ka-lede')).replace('nobody@example.com', '<email>');
      c.check(/^If there.s an account for <email>, we.ve sent it an 8-digit reset code/.test(unknown), 'an unknown address gets the neutral answer: ' + unknown);
      c.check(/^ts-token-/.test(calls(server, '/auth/v1/recover')[0]?.body.gotrue_meta_security?.captcha_token || ''), 'the human-check token travels with the reset request');
      c.check(!('redirect_to' in calls(server, '/auth/v1/recover')[0].body), 'the reset email is a code, never a link');
      // Any code for an address with no account reads as a wrong code.
      await page.fill('#kaCode', '12345678');
      await fillPw(page, PW2);
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaCodeE', /didn.t work/, c);
      // A new visit (this page asks for one reset code a minute, whatever the address).
      await page.goto('about:blank');
      await open(page, '#forgot-password');
      await page.fill('#kaEmail', EMAIL);
      await page.press('#kaEmail', 'Enter');
      await waitView(page, 'forgot2');
      c.check((await text(page, '.ka-lede')).replace(EMAIL, '<email>') === unknown, 'a real address reads exactly the same');
      const f = await page.evaluate(() => ({ code: document.getElementById('kaCode').autocomplete, pw: document.getElementById('kaPw').autocomplete, user: document.querySelector('#kaForm input[autocomplete=username]').value, forms: document.querySelectorAll('#kaRoot form').length }));
      c.check(f.code === 'one-time-code' && f.pw === 'new-password' && f.user === EMAIL && f.forms === 1, 'one form: the code and the new password: ' + JSON.stringify(f));
      await axe(page, c, `forgot password, code and new password (${v})`);
      await noOverflow(page, c, 'Forgot password step 2');
      const code = server.codes.get(EMAIL);
      // A refused password is caught before the code is used up.
      await page.fill('#kaCode', code);
      c.check((await page.evaluate(() => document.querySelectorAll('#kaPwHelp .ka-pw-list li').length)) === 5 && (await page.getAttribute('#kaPw', 'type')) === 'password', 'the same five-item checklist, on a hidden field');
      await fillPw(page, 'Passwordpassword1!');
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwHelp', /Not saved yet.*easy to guess/, c);
      c.check(calls(server, '/auth/v1/verify').filter((x) => x.body.email === EMAIL).length === 0, 'the code is not spent on a refused password');
      // A wrong code.
      await fillPw(page, PW2);
      await page.fill('#kaCode', '00000000');
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaCodeE', /didn.t work/, c);
      c.check(server.userByEmail(EMAIL).password === PW, 'a wrong code changes nothing');
      await c.shot(`a3-${v}-wrong-code`);
      // The right code and a good password.
      await page.fill('#kaCode', code);
      await page.press('#kaPw', 'Enter');
      await waitView(page, '');
      c.check(server.userByEmail(EMAIL).password === PW2, 'the new password is saved');
      await settled(page);
      await goYou(page);
      c.check(/m•••@example\.com/.test(await text(page, '#kaCard')), 'signed in after the reset');
      await noSecrets(page, c, [PW2, code, 'Passwordpassword1!'], 'after the reset');
      c.check(net.third.length === 0, 'no other address was contacted: ' + net.third.join(','));
    });
    await ctx.close();
  }
}

// ── A4. The account card on You ──
// Signs in through the screen and waits for the card to say it is synced.
async function signedIn(page, email = EMAIL, pw = PW) {
  await signIn(page, email, pw);
  await waitView(page, '');
  await page.waitForFunction(() => /Synced|Sync is on/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 12000 });
}
if (wanted('A4')) {
  for (const v of ['phone', 'desktop']) {
    const ids = freeIds(1, 3);
    const { ctx, page, server } = await setup({ view: v, seed: profileSeed(ids) });
    await makeAccount(server);
    await rec.run(`A4-signed-in-${v}`, 'You, signed in: synced, syncing, waiting for a connection and couldn’t sync', page, async (c) => {
      await signIn(page);
      // This browser has progress and the account has none: the preview asks first.
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      await goYou(page);
      const card = await text(page, '#kaCard');
      c.check(/m•••@example\.com/.test(card) && /Synced just now/.test(card) && /Sync now/.test(card), 'synced: the masked email, the status in words, Sync now: ' + card);
      c.check(!card.includes(EMAIL), 'the full address is not on You');
      c.check((await page.locator('#kaCard .ka-card-main .sr-only').first().innerText().catch(() => '')).includes('m, at example.com') || (await page.evaluate(() => document.querySelector('#kaCard .ka-card-main').textContent)).includes('Signed in as m, at example.com'), 'a screen reader hears the address without "dot dot dot"');
      await axe(page, c, `You, signed in (${v})`);
      await noOverflow(page, c, `You, signed in (${v})`);
      await c.shot(`a4-${v}-synced`);
      if (v === 'desktop') c.check(/m•••@example\.com/.test(await text(page, '#kaRail')) && /Synced/.test(await text(page, '#kaRail')), 'the rail’s foot carries the one-line version: ' + (await text(page, '#kaRail')));
      else c.check((await text(page, '#kaTop')).startsWith('M') && (await page.getAttribute('#kaTop', 'href')) === '#account', 'the phone’s top bar shows the initial and opens Account');
      // Sync now: "Syncing…" is said, then the result; focus stays on the button.
      await page.focus('#kaCard .ka-card-act');
      const seen = page.waitForFunction(() => /Syncing/.test(document.getElementById('kaCard').textContent));
      await page.click('#kaCard .ka-card-act');
      await seen;
      await page.waitForFunction(() => /Synced just now/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
      c.check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('ka-card-act')), 'focus stays on Sync now through the redraw');
      // No connection.
      server.offline = true;
      await page.click('#kaCard .ka-card-act');
      await page.waitForFunction(() => /Waiting for a connection/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
      c.check(!(await page.locator('#kaCard .ka-card-act').count()), 'offline: no dead button; it syncs by itself when the connection is back');
      await c.shot(`a4-${v}-offline`);
      server.offline = false;
      // A server problem.
      server.force('/rest/v1/sync_snapshots', 503, { message: 'upstream connect error' });
      await page.evaluate(() => kaSyncNow(true));
      await page.waitForFunction(() => /Couldn.t sync just now/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
      c.check(/Try again/.test(await text(page, '#kaCard')) && !/upstream/.test(await text(page, 'body')), 'an error offers Try again and shows no server text');
      await c.shot(`a4-${v}-error`);
      await page.click('#kaCard .ka-card-act');
      await page.waitForFunction(() => /Synced just now/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
    });
    await ctx.close();
  }
}

// ── A5. The Account page ──
if (wanted('A5')) {
  for (const v of ['phone', 'desktop']) {
    const ids = freeIds(2, 2);
    const { ctx, page, server, net } = await setup({ view: v, seed: profileSeed(ids) });
    const uid = await makeAccount(server);
    await rec.run(`A5-${v}`, 'Account: status, Sync now, the news switch, download, change password, delete synced progress, sign out (with and without removing progress)', page, async (c) => {
      await signIn(page);
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.waitForFunction((e) => document.getElementById('kaHero') && document.getElementById('kaHero').textContent.includes(e), EMAIL, { timeout: 8000 });
      const hero = await text(page, '#kaHero');
      c.check(hero.includes(EMAIL) && /Signed in with email and password/.test(hero) && /Sync is on/.test(hero) && /Last synced (just now|\d+ minutes? ago, at )/.test(hero) && /This browser/.test(hero) && /Android app/.test(hero) && /Sync now/.test(hero), 'the status panel: ' + hero);
      c.check((await text(page, '#kaAccount h1')) === 'Account' && /You/.test(await text(page, '#subNav')), 'the page title, with the way back to You');
      const sec = await text(page, '.ka-security');
      c.check(/Sign-ins last up to 30 days, or 14 days without use\./.test(sec) && /nothing in this browser is lost/.test(sec) && /salted one-way hash/.test(sec) && /Emailed codes only confirm your email and reset a forgotten password\. We never send sign-in links\./.test(sec), 'the security note: ' + sec);
      await axe(page, c, `Account (${v})`);
      await noOverflow(page, c, `Account (${v})`);
      await c.shot(`a5-${v}-account`, page, true);
      // The news switch: a real switch, with the word.
      const sw = async () => ({ role: await page.getAttribute('#kaNewsBtn', 'role'), on: await page.getAttribute('#kaNewsBtn', 'aria-checked'), word: await text(page, '#kaNewsW') });
      c.check(JSON.stringify(await sw()) === JSON.stringify({ role: 'switch', on: 'false', word: 'Off' }), 'the news switch starts Off (nothing was ticked): ' + JSON.stringify(await sw()));
      await page.click('#kaNewsBtn');
      await waitText(page, 'kaNewsBtnSay', /^On\./, c);
      c.check((await sw()).on === 'true' && (await sw()).word === 'On', 'On, in the switch and in words');
      const on = consentWrites(server).filter((x) => x.method === 'PATCH');
      c.check(JSON.stringify(on) === JSON.stringify([{ method: 'PATCH', marketing_opt_in: true, marketing_wording: '2026-12', source: 'web' }]), 'switching on writes the opt-in with the wording and the source: ' + JSON.stringify(on));
      await page.click('#kaNewsBtn');
      await waitText(page, 'kaNewsBtnSay', /^Off\./, c);
      c.check((await sw()).on === 'false' && (await sw()).word === 'Off', 'Off again, in the switch and in words');
      const both = consentWrites(server).filter((x) => x.method === 'PATCH');
      c.check(both.length === 2 && both[1].marketing_opt_in === false && both[1].source === 'web', 'switching off is recorded too: ' + JSON.stringify(both[1]));
      c.check(await page.evaluate(() => document.activeElement && document.activeElement.id === 'kaNewsBtn'), 'focus stays on the switch');
      // Download my data.
      const dl = page.waitForEvent('download');
      await page.click('#kaDl');
      const file = await dl;
      c.check(/^kaisip-my-data-\d{4}-\d{2}-\d{2}\.json$/.test(file.suggestedFilename()), 'the download: ' + file.suggestedFilename());
      await waitText(page, 'kaDlSay', /Saved to your downloads/, c);
      // Change password.
      await page.click('#kaPwRow');
      await page.waitForSelector('#flagModal #kaPw');
      const pf = await page.evaluate(() => ({ cur: document.getElementById('kaCur').autocomplete, np: document.getElementById('kaPw').autocomplete, user: !!document.querySelector('#flagModal input[autocomplete=username]') }));
      c.check(pf.cur === 'current-password' && pf.np === 'new-password' && pf.user, 'the change form: current-password, new-password and the email for password managers');
      await axe(page, c, `change password (${v})`);
      await c.shot(`a5-${v}-change-password`);
      await page.fill('#kaCur', 'not my password at all');
      await fillPw(page, PW2);
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaCurE', /isn.t your current password/, c);
      await page.fill('#kaCur', PW);
      c.check((await page.evaluate(() => document.querySelectorAll('#flagModal #kaPwHelp .ka-pw-list li').length)) === 5, 'the same checklist on Change password');
      await fillPw(page, 'ocean violet lamp');
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwHelp', /Not saved yet.*Add an uppercase letter \(A to Z\), a number \(0 to 9\) and a symbol such as ! \? # @\./, c);
      c.check(server.userByEmail(EMAIL).password === PW, 'nothing changed yet');
      await fillPw(page, PW2);
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwRowSay', /Password saved/, c);
      c.check(server.userByEmail(EMAIL).password === PW2, 'the password is changed');
      c.check(/Last changed \d+ \w+ \d{4}/.test(await text(page, '#kaPwRowS')), 'the row says when it was last changed: ' + (await text(page, '#kaPwRowS')));
      // Delete synced progress: the account's copy goes, this browser's stays, sync is off.
      const before = await answerKeys(page);
      await page.click('#kaDelSync');
      await page.waitForSelector('#flagModal [role=dialog]');
      await sleep(150);
      c.check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('cancel')), 'the safe choice has focus');
      await page.click('#ksConfGo');
      await waitText(page, 'kaDelSyncSay', /Synced progress deleted\. Sync is off\./, c);
      c.check(!server.row(uid, 'progress') && !server.row(uid, 'settings'), 'the account holds no synced progress');
      c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before), 'this browser’s progress is untouched');
      c.check(/Sync is off/.test(await text(page, '#kaHero')) && /Turn sync on/.test(await text(page, '#kaHero')), 'the panel says Sync is off: ' + (await text(page, '#kaHero')));
      await c.shot(`a5-${v}-sync-off`);
      await page.click('#kaHero [data-f="sync"]');
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await page.waitForFunction(() => !!document.querySelector('#kaCard .ka-card-act'), null, { timeout: 12000 });
      c.check(!!server.row(uid, 'progress'), 'turning sync on again sends this browser’s progress');
      // Sign out: progress stays.
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.click('#kaOut');
      await page.waitForSelector('#flagModal #kaWipe');
      c.check(/Also remove my progress from this browser/.test(await text(page, '#flagModal')) && !(await page.isChecked('#kaWipe')), 'the shared-computer box is offered, unticked');
      await axe(page, c, `sign out sheet (${v})`);
      await c.shot(`a5-${v}-sign-out`);
      await page.click('#flagModal #kaGo');
      await waitView(page, 'signin');
      const out = await store(page);
      c.check(!out.local.kaisip_auth_v1 && !out.local.kaisip_auth_ended_v1 && !out.local.kaisip_acct_hint_v1, 'signed out: no session, no "signed out" note, no address kept');
      c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before), 'signing out leaves saved progress alone: ' + JSON.stringify(before.ids));
      c.check(/Signed out\. Your progress stays in this browser\./.test(await text(page, '#kaNotice')) && !(await appShown(page)), 'signed out: the study app closes behind Sign in, with the words: ' + (await text(page, '#kaNotice')));
      // Sign in again and sign out WITH "remove my progress".
      await signIn(page, EMAIL, PW2);
      await waitView(page, '');
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.click('#kaOut');
      await page.check('#kaWipe', { force: true });
      await page.click('#flagModal #kaGo');
      await waitView(page, 'signin');
      c.check(/Your progress was removed from this browser\./.test(await text(page, '#kaNotice')), 'the words after: ' + (await text(page, '#kaNotice')));
      const wiped = await answerKeys(page);
      const st = await store(page);
      c.check(wiped.ids.length === 0, 'the progress is removed from this browser when asked: ' + JSON.stringify(wiped));
      c.check(!st.local.kaisip_sync_v1 && !st.local.kaisip_sync_mirror_v1 && !st.local.kaisip_sync_undo_v1, 'and so is the copy of the account this browser held');
      c.check(!!server.row(uid, 'progress'), 'the account keeps its synced copy');
      await noSecrets(page, c, [PW, PW2], 'after signing out');
      c.check(net.third.length === 0, 'no other address was contacted: ' + net.third.join(','));
    });
    await ctx.close();
  }
  // Delete account: a fresh sign-in, the word DELETE, then gone. Progress in this browser stays.
  {
    const ids = freeIds(3, 2);
    const { ctx, page, server } = await setup({ view: 'phone', seed: profileSeed(ids) });
    await makeAccount(server);
    await rec.run('A5-delete', 'Delete account: asks for the password when the sign-in is not fresh, then the word DELETE; this browser keeps its progress', page, async (c) => {
      await signIn(page);
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.waitForSelector('#kaDel');
      // A sign-in older than a few minutes: the password is asked for first.
      await page.evaluate(() => { KA_FRESH_MS = -1; });
      await page.click('#kaDel');
      await page.waitForSelector('#flagModal #kaDelWord');
      const dlg = await text(page, '#flagModal [role=dialog]');
      c.check(/Delete your account\?/.test(dlg) && /can.t be undone/.test(dlg) && /Your progress in this browser stays/.test(dlg) && /Type DELETE to confirm/.test(dlg), 'the sheet says what goes and what stays: ' + dlg);
      c.check((await page.getAttribute('#kaCur', 'autocomplete')) === 'current-password', 'the password is asked for to confirm it’s you');
      await axe(page, c, 'delete account sheet');
      await noOverflow(page, c, 'delete account sheet');
      await c.shot('a5-delete');
      await page.fill('#kaCur', PW);
      await page.fill('#kaDelWord', 'delete');
      await page.press('#kaDelWord', 'Enter');
      await waitText(page, 'kaDelWordE', /Type DELETE in capital letters/, c);
      c.check(calls(server, '/functions/v1/delete-account').length === 0, 'nothing is deleted without the word');
      await page.fill('#kaCur', 'this is not my password');
      await page.fill('#kaDelWord', 'DELETE');
      await page.press('#kaDelWord', 'Enter');
      await waitText(page, 'kaCurE', /That password isn.t right/, c);
      c.check(!!server.userByEmail(EMAIL), 'a wrong password deletes nothing');
      await page.fill('#kaCur', PW);
      await page.press('#kaDelWord', 'Enter');
      await waitView(page, 'signin');
      c.check(!server.userByEmail(EMAIL), 'the account is gone');
      c.check(/Your account was deleted\. Your progress in this browser stays\./.test(await text(page, '#kaNotice')) && !(await appShown(page)), 'the words after, at the way in: ' + (await text(page, '#kaNotice')));
      c.check((await answerKeys(page)).ids.length === 2, 'this browser keeps its progress');
      const st = await store(page);
      c.check(!st.local.kaisip_auth_v1 && !st.local.kaisip_sync_v1 && !st.local.kaisip_sync_mirror_v1 && !st.local.kaisip_acct_hint_v1, 'no session, sync record or address is left');
    });
    await ctx.close();
  }
}

// ── A6. With the switch off, the first visit is today's welcome sheet ──
if (wanted('A6')) {
  // With accounts off, the first visit is exactly the welcome sheet learners see today.
  {
    const { ctx, page } = await setup({ view: 'phone', onboarded: false, preview: false });
    await rec.run('A6-off', 'Switch off: the first visit is today’s welcome, unchanged', page, async (c) => {
      await page.goto(APP);
      await page.waitForSelector('.ob-welcome', { timeout: 8000 });
      c.check(/Start 5 questions/.test(await text(page, '.ob-welcome')) && /No account\. Everything stays in this browser\./.test(await text(page, '.ob-welcome')), 'the existing welcome sheet');
      c.check(!(await page.evaluate(() => document.getElementById('kaRoot'))), 'no account screen exists');
    });
    await ctx.close();
  }
}

// ── A7. The first sync: the preview, Combine, "use the account's progress", undo, and older progress kept ──
if (wanted('A7')) {
  const server = new F.FakeSupabase(() => Date.now());
  server.captchaOn = true;
  await makeAccount(server);
  const d1 = freeIds(1, 3), d2 = freeIds(2, 2), d3 = freeIds(3, 1);
  const LEGACY = 'd1_001';   // a full-course question the website no longer loads
  {
    const { ctx, page } = await setup({ view: 'phone', server, seed: profileSeed(d1) });
    await rec.run('A7-first', 'First sync, the account is empty: it asks before this browser’s progress goes to the account', page, async (c) => {
      await signIn(page);
      await waitView(page, 'firstsync');
      c.check((await text(page, '#kaRoot h1')) === norm('Add this browser’s progress to your account?'), 'the title: ' + (await text(page, '#kaRoot h1')));
      const row = await page.evaluate(() => [...document.querySelectorAll('.ka-cols tbody tr')[0].children].map((x) => x.textContent));
      c.check(JSON.stringify(row) === JSON.stringify(['Questions answered', '3', '0', '3']), 'This browser 3, Account 0, After 3: ' + JSON.stringify(row));
      c.check(calls(server, '/rest/v1/sync_snapshots', 'POST').length === 0, 'nothing is sent until the learner chooses');
      await axe(page, c, 'first sync preview (add)');
      await noOverflow(page, c, 'first sync preview');
      await c.shot('a7-first');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      c.check(calls(server, '/rest/v1/sync_snapshots', 'POST').length === 2, 'this browser’s progress and settings were sent');
    });
    await ctx.close();
  }
  for (const v of ['phone', 'desktop']) {
    const mine = v === 'phone' ? d2 : freeIds(5, 2);
    const { ctx, page } = await setup({ view: v, server, seed: profileSeed(mine, [LEGACY]) });
    await rec.run(`A7-combine-${v}`, 'Both sides have progress: the three columns, Combine, and progress for questions outside the free sample is kept', page, async (c) => {
      const before = await (async () => { await open(page); return answerKeys(page); })();
      c.check(before.ids.includes(LEGACY) && before.score.t === 3, 'this browser starts with 2 sample answers and 1 older one');
      await signIn(page);
      await waitView(page, 'firstsync');
      c.check((await text(page, '#kaRoot h1')) === 'Bring your progress together?', 'the title: ' + (await text(page, '#kaRoot h1')));
      const head = await page.evaluate(() => [...document.querySelectorAll('.ka-cols thead th')].map((x) => x.textContent.trim()));
      c.check(JSON.stringify(head.slice(1)) === JSON.stringify(['This browser', 'Account', 'After']), 'the columns: ' + head.join(' / '));
      const row = await page.evaluate(() => [...document.querySelectorAll('.ka-cols tbody tr')[0].children].map((x) => x.textContent));
      const acct = Number(row[2]);
      c.check(row[1] === '2' && acct >= 3 && Number(row[3]) === acct + 2, 'This browser 2 (what the account can hold), Account, After = both: ' + JSON.stringify(row));
      const btns = await page.evaluate(() => [...document.querySelectorAll('.ka-choices button')].map((b) => b.textContent.trim()));
      c.check(JSON.stringify(btns) === JSON.stringify(['Combine', 'Use the account’s progress here', 'Not now']), 'Combine first, then use the account’s, then Not now: ' + btns.join(' / '));
      await axe(page, c, `first sync preview, both (${v})`);
      await noOverflow(page, c, `first sync preview, both (${v})`);
      await c.shot(`a7-${v}-combine`);
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      const after = await answerKeys(page);
      c.check([...d1, ...mine].every((id) => after.ids.includes(id)), 'Combine: the account’s answers and this browser’s are all here: ' + after.ids.join(','));
      c.check(after.ids.includes(LEGACY), 'the answer for a question outside the free sample is still in this browser');
      c.check(after.score.t === after.ids.length, `and every answer is still counted (${after.score.t} of ${after.ids.length})`);
      c.check(!(await store(page)).local.kaisip_sync_undo_v1, 'Combine only adds, so it keeps no undo copy');
    });
    await ctx.close();
  }
  {
    const { ctx, page } = await setup({ view: 'phone', server, seed: profileSeed(d3) });
    await rec.run('A7-replace-undo', '"Use the account’s progress here" keeps a 7-day copy, and Account can put it back', page, async (c) => {
      await signIn(page);
      await waitView(page, 'firstsync');
      c.check(/we keep a copy for 7 days/.test(await text(page, '#kaRoot')), 'the preview says a copy is kept');
      await page.click('.ka-choices .ka-btn-secondary');
      await waitView(page, '');
      await settled(page);
      const now = await answerKeys(page);
      c.check(!now.ids.includes(d3[0]) && d1.every((id) => now.ids.includes(id)), 'this browser shows the account’s progress: ' + now.ids.join(','));
      const undo = JSON.parse((await store(page)).local.kaisip_sync_undo_v1 || 'null');
      c.check(undo && Object.keys(undo.state.answerLog).join() === d3.join(), 'its own progress is kept as the undo copy');
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.waitForSelector('#kaUndo');
      c.check(/Kept for 7 days/.test(await text(page, '#kaUndo')), 'Account offers to put it back: ' + (await text(page, '#kaUndo')));
      await axe(page, c, 'Account with the undo row');
      await page.click('#kaUndo');
      await page.waitForSelector('#ksConfGo');
      await page.click('#ksConfGo');
      await page.waitForFunction((id) => { const p = JSON.parse(localStorage.getItem('cisa_profiles_v1')); return Object.keys(p[localStorage.getItem('cisa_active_profile')].state.answerLog).includes(id); }, d3[0], { timeout: 8000 });
      c.check(!(await store(page)).local.kaisip_sync_undo_v1, 'the copy is used up');
    });
    await ctx.close();
  }
  {
    const { ctx, page } = await setup({ view: 'phone', server, seed: profileSeed(freeIds(4, 1)) });
    await rec.run('A7-not-now', '"Not now": signed in, nothing synced, and the card offers to finish', page, async (c) => {
      const posts = calls(server, '/rest/v1/sync_snapshots').filter((x) => x.method !== 'GET').length;
      await signIn(page);
      await waitView(page, 'firstsync');
      await page.click('.ka-choices .ka-btn-quiet');
      await waitView(page, '');
      await goYou(page);
      await page.waitForSelector('#kaCard [data-f="setup"]');
      const card = await text(page, '#kaCard');
      c.check(/One step left to turn sync on/.test(card) && /Finish setting up/.test(card) && /Your progress is safe in this browser\./.test(card), 'the card: ' + card);
      c.check(calls(server, '/rest/v1/sync_snapshots').filter((x) => x.method !== 'GET').length === posts, 'nothing was written to the account');
      await c.shot('a7-not-now');
      await page.click('#kaCard [data-f="setup"]');
      await waitView(page, 'firstsync');
    });
    await ctx.close();
  }
}

// ── A8. Two tabs ──
if (wanted('A8')) {
  const { ctx, page, server } = await setup({ view: 'desktop' });
  await makeAccount(server);
  const tab2 = await ctx.newPage();
  rec.watch(tab2, SITE);
  await rec.run('A8', 'Two tabs: signing in or out in one opens or closes the other without a reload', page, async (c) => {
    await open(tab2);
    await waitView(tab2, 'welcome');
    c.check(!(await appShown(tab2)), 'tab 2 starts at the way in');
    await page.bringToFront();
    await signedIn(page);
    await tab2.waitForFunction(() => !document.body.hasAttribute('data-ka-view'), null, { timeout: 8000 });
    c.check(await appShown(tab2), 'tab 2 opens the study app after tab 1 signs in');
    await tab2.evaluate(() => navGoFocus(null, 'account'));
    await tab2.waitForSelector('#kaHero .ka-who');
    // Sign out in tab 1.
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.click('#kaOut');
    await page.click('#flagModal #kaGo');
    await waitView(page, 'signin');
    await tab2.waitForFunction(() => document.body.hasAttribute('data-ka-view'), null, { timeout: 8000 });
    c.check(!(await appShown(tab2)) && ['welcome', 'signin'].includes(await view(tab2)), 'tab 2 closes too: ' + (await view(tab2)));
  });
  await ctx.close();
}

// ── A9. Google ──
if (wanted('A9')) {
  const startGoogle = async (page, c) => {
    const [req] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('.ka-btn-google')]);
    const u = new URL(req.url());
    c.check(u.searchParams.get('provider') === 'google' && u.searchParams.get('redirect_to') === APP && u.searchParams.get('code_challenge_method') === 's256' && (u.searchParams.get('code_challenge') || '').length >= 43, 'Google sign-in starts with PKCE and comes back to /app/: ' + u.search);
    return u.searchParams.get('code_challenge');
  };
  {
    const { ctx, page, server } = await setup({ view: 'phone' });
    await rec.run('A9-new', 'Continue with Google, a new account: the code leaves the address at once, then the agreements, then signed in', page, async (c) => {
      await open(page, '#sign-in');
      const challenge = await startGoogle(page, c);
      const code = server.googleCode(challenge, 'gina@gmail.com', 'Gina Cruz');
      const seen = [];
      page.on('request', (r) => { if (!r.url().startsWith(SITE)) seen.push(r.url()); });
      await page.goto(`${APP}?code=${code}`);
      await waitView(page, 'consent');
      c.check(!page.url().includes(code) && !page.url().includes('code='), 'the code is taken out of the address: ' + page.url());
      c.check(seen.every((u) => !u.includes(code)), 'no request to another address carries the code in its address');
      c.check(!(await store(page)).session.kaisip_pkce_v1, 'the one-time PKCE secret is deleted');
      c.check((await text(page, '#kaRoot h1')) === 'One more step' && (await page.evaluate(() => ['kaTerms', 'kaNews'].every((id) => document.getElementById(id).checked === false) && !document.getElementById('kaAge') && document.getElementById('kaAgeLine').textContent === 'Accounts are for learners 18 and older.')), 'a new Google account meets the same agreement, unticked, with the age line');
      c.check(calls(server, '/rest/v1/sync_snapshots').length === 0, 'nothing syncs before the agreements');
      const bar = await page.evaluate(() => ({ words: document.querySelector('#kaRoot .ka-topbar').innerText.replace(/\s+/g, ' ').trim(), links: [...document.querySelectorAll('#kaRoot .ka-topbar a')].map((a) => a.getAttribute('href')), ways: [...document.querySelectorAll('#kaRoot button')].map((b) => b.textContent.trim()) }));
      c.check(!/Back to studying/.test(bar.words) && JSON.stringify(bar.links) === JSON.stringify(['support.html']) && bar.ways.includes('Agree and continue') && bar.ways.includes('Sign out instead'), 'a brand-new account gets Agree or Sign out, and no "Back to studying": ' + JSON.stringify(bar));
      await axe(page, c, 'the agreements after Google');
      await noOverflow(page, c, 'the agreements after Google');
      await c.shot('a9-consent');
      await page.click('#kaGo');
      c.check((await text(page, '#kaConsentE')) === 'Tick the box above to continue.', 'the unticked agreement stops it');
      await page.check('#kaTerms', { force: true });
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      await goYou(page);
      c.check(/g•••@gmail\.com/.test(await text(page, '#kaCard')), 'signed in: ' + (await text(page, '#kaCard')));
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.waitForSelector('#kaHero .ka-who');
      c.check(/Signed in with Google/.test(await text(page, '#kaHero')) && /Add a password/.test(await text(page, '#kaPwRow')), 'Account says Google, and offers to add a password');
      await noSecrets(page, c, [code], 'after Google');
    });
    await ctx.close();
  }
  {
    const { ctx, page, server } = await setup({ view: 'desktop' });
    await rec.run('A9-signup', 'Sign up with Google from Create account: the ticked agreements travel with it, and a cancelled sign-in is calm', page, async (c) => {
      await open(page, '#create-account');
      for (const id of ['#kaTerms', '#kaNews']) await page.check(id, { force: true });
      const challenge = await startGoogle(page, c);
      const code = server.googleCode(challenge, 'noel@gmail.com');
      await page.goto(`${APP}?code=${code}`);
      await waitView(page, '');
      await settled(page);
      const u = server.userByEmail('noel@gmail.com');
      c.check(server.profiles.get(u.id) === '2026-12', 'the agreements ticked before Google are saved for the new account, with no second ask');
      const g = consentWrites(server);
      c.check(g.length === 1 && g[0].method === 'POST' && g[0].marketing_opt_in === true && g[0].marketing_wording === '2026-12' && g[0].source === 'web' && g[0].privacy_version === '2026-12', 'and so is the news choice, in the same record: ' + JSON.stringify(g));
      // Cancelled at Google (or any error it sends back): calm words, and nothing from the address is shown.
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.click('#kaOut'); await page.click('#flagModal #kaGo');
      await waitView(page, 'signin');
      await page.goto(`${APP}?error=access_denied&error_description=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3ESECRET-TEXT`);
      await waitView(page, 'signin');
      c.check(/Google sign-in was cancelled\. Nothing changed\./.test(await text(page, '#kaNotice')), 'the calm notice: ' + (await text(page, '#kaNotice')));
      c.check(!(await text(page, 'body')).includes('SECRET-TEXT') && !page.url().includes('error'), 'the error text from the address is never shown, and the address is clean');
      // A code that doesn't match this tab's secret (a replay, another browser).
      await page.goto(`${APP}?code=oauth-code-replayed-abcdef`);
      await waitView(page, 'signin');
      c.check(/Google sign-in didn.t finish\. Please start it again\./.test(await text(page, '#kaNotice')), 'a stray code is refused calmly: ' + (await text(page, '#kaNotice')));
    });
    await ctx.close();
  }
}

// ── A10. The two account pages (published only with accounts on or SITE_ACCOUNTS_PREVIEW=1) ──
if (wanted('A10')) {
  const { ctx, page, server, net } = await setup({ view: 'phone' });
  await makeAccount(server);
  await rec.run('A10', 'kaisip.com/delete-account works signed out (steps, email) and signed in (its button opens the Delete account step); the human check returns to the app', page, async (c) => {
    await page.goto(SITE + '/delete-account');
    c.check((await text(page, 'h1')) === 'Delete your KaiSip account', 'the page title');
    const body = await text(page, 'main');
    c.check(/In the Android app/.test(body) && /On the website/.test(body) && /Without the app or the website/.test(body) && /What we delete/.test(body) && /What we keep, and for how long/.test(body) && /certprep\.support@gmail\.com/.test(body), 'how to delete (app, website, email), what is deleted and what is kept');
    c.check(!/draft|not in effect|\[/i.test(body), 'no draft wording or placeholder');
    await axe(page, c, 'the delete-account page', true);
    for (const w of [320, 390, 1280]) { await page.setViewportSize({ width: w, height: 800 }); await noOverflow(page, c, `delete-account at ${w}`); }
    await page.setViewportSize({ width: 390, height: 844 });
    await c.shot('a10-delete-account', page, true);
    c.check(net.supabase === 0 && net.cloudJs === 0, 'the page itself loads no account script and contacts no service');
    // Signed out: the button lands on Sign in, saying what comes next.
    await page.click('a.act');
    await waitView(page, 'signin');
    c.check(/Sign in to the account you want to delete/.test(await text(page, '#kaNotice')), 'signed out: sign in first, then delete: ' + (await text(page, '#kaNotice')));
    await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW); await page.press('#kaPass', 'Enter');
    await page.waitForSelector('#flagModal #kaDelWord', { timeout: 15000 });
    c.check((await page.evaluate(() => document.body.getAttribute('data-tab'))) === 'account', 'after signing in the Delete account step opens on the Account page');
    await page.keyboard.press('Escape');
    // Signed in already: straight to the step.
    await page.goto(SITE + '/delete-account');
    await page.click('a.act');
    await page.waitForSelector('#flagModal #kaDelWord', { timeout: 15000 });
    c.check(!!server.userByEmail(EMAIL), 'opening the step deletes nothing by itself');
    // The Android app's human check.
    const went = [];
    page.on('request', (r) => { if (r.url().startsWith('kaisip://')) went.push(r.url()); });
    page.on('framenavigated', () => {});
    await page.goto(SITE + '/human-check?a=password_sign_in').catch(() => {});
    await page.waitForFunction(() => /Done\. Taking you back to KaiSip\./.test(document.getElementById('msg').textContent) || location.protocol === 'kaisip:', null, { timeout: 8000 }).catch(() => {});
    const hc = await page.evaluate(() => ({ msg: (document.getElementById('msg') || {}).textContent || '', action: window.__ts && window.__ts.actions[0], back: (document.getElementById('back') || {}).href })).catch(() => ({ msg: 'navigated', action: 'password_sign_in', back: 'kaisip://human-check' }));
    c.check(/Done\. Taking you back|navigated/.test(hc.msg) && hc.action === 'password_sign_in' && hc.back === 'kaisip://human-check', 'the human check passes and returns to kaisip://human-check: ' + JSON.stringify(hc));
  }, { allowErrors: true });
  await ctx.close();
}

// ── A11 and the screenshots: every screen, 320 to 1280 wide, text at 200% ──
// One walk through every screen. `shots` saves a picture of each (the folder);
// `c` (a test) checks no sideways scroll at five widths and with text at 200%.
const WIDTHS = [320, 360, 768, 1024, 1280];
const shotFontMisses = [];
async function walk(v, scheme, shots, c, axeOnly = false) {
  const snap = async (page, name, full = false) => {
    if (c && axeOnly) await axe(page, c, `${name} (${v}, ${scheme})`, /delete-account-page|human-check-page/.test(name));
    else if (c) {
      const size = page.viewportSize();
      for (const w of WIDTHS) { await page.setViewportSize({ width: w, height: size.height }); await sleep(60); await noOverflow(page, c, `${name} at ${w}px`); }
      await page.setViewportSize(size);
      // Text at 200% (the browser's own text size: every size in the app is rem).
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await sleep(120);
      await noOverflow(page, c, `${name} with text at 200%`);
      const cut = await page.evaluate(() => [...document.querySelectorAll('#kaRoot button, #kaRoot a, #kaRoot input, #kaCard button, #kaCard a, #kaAccount button, #flagModal .ka-dlg button, #flagModal .ka-dlg input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1); }).map((e) => (e.id || e.className || e.tagName) + '').slice(0, 4));
      c.check(cut.length === 0, `${name} with text at 200%: controls cut off: ${cut.join(', ')}`);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      await sleep(60);
    }
    if (shots) {
      await sleep(120);
      // The pictures are for the owner: the fonts must be the real ones (KaiSip Serif with its own f and J).
      const fonts = await page.evaluate(async () => { await document.fonts.ready; const has = (fam) => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === fam && f.status === 'loaded'); return { serif: has('KaiSip Serif'), sans: has('Figtree') }; });
      if (!fonts.serif || !fonts.sans) { shotFontMisses.push(`${name} ${v} ${scheme}`); console.log(`shots: FONT NOT LOADED on ${name} (${v}, ${scheme}): ${JSON.stringify(fonts)}`); }
      await page.screenshot({ path: path.join(shots, `${name}_${v === 'phone' ? '390' : '1280'}_${scheme}.png`), fullPage: full });
    }
  };
  const MAIL = 'jamie.reyes@example.com';
  // 0. Pictures only: the screens as the repo publishes them today. Google's "G" file is not in
  // assets/ yet, so Google sign-in is hidden. (Every other picture uses the test's dashed-square
  // stand-in for that file, to show where Google's button goes once the file is added.)
  if (shots) {
    const t = await setup({ view: v, scheme, googleG: 'missing' });
    await open(t.page, '#sign-in'); await sleep(400); await snap(t.page, '02b-sign-in-today-without-google');
    await t.page.evaluate(() => kaGo('create-account')); await waitView(t.page, 'signup1'); await sleep(300); await snap(t.page, '04b-create-1-today-without-google', true);
    // The consent screen as shipped, kept as evidence beside the consent registry
    // (docs/legal/consent_wording.md: docs/legal/consent_screens/<version>-web.png).
    if (v === 'phone' && scheme === 'light') {
      await t.page.waitForFunction(() => window.KaiSipCloud && window.KaiSipCloud.config);
      const version = await t.page.evaluate(() => window.KaiSipCloud.config.CONSENT.terms);
      await t.page.screenshot({ path: path.join(shots, `consent_${version}-web.png`), fullPage: true });
    }
    await t.ctx.close();
  }
  // 1. A first visit, then the sign-in and create-account screens.
  let s = await setup({ view: v, scheme, onboarded: false });
  let page = s.page, server = s.server;
  await open(page);
  await waitView(page, 'welcome'); await snap(page, '01-welcome');
  await page.click('.ka-path-secondary'); await waitView(page, 'signin'); await snap(page, '02-sign-in');
  await page.fill('#kaEmail', MAIL); await page.fill('#kaPass', 'this is not my password'); await page.press('#kaPass', 'Enter');
  await page.waitForFunction(() => document.getElementById('kaPassE').textContent.length > 0); await snap(page, '03-sign-in-error');
  await page.click('.ka-switch a'); await waitView(page, 'signup1'); await page.fill('#kaEmail', MAIL); await snap(page, '04-create-1-email');
  await page.click('#kaGo'); await snap(page, '05-create-1-agreements-needed');
  await page.check('#kaTerms', { force: true });
  await page.click('#kaGo'); await waitView(page, 'signup2');
  await page.fill('#kaCode', '482715'); await page.focus('#kaCode'); await snap(page, '06-create-2-code');
  await page.fill('#kaCode', '00000000'); await page.press('#kaCode', 'Enter');
  await page.waitForFunction(() => document.getElementById('kaCodeE').textContent.length > 0); await snap(page, '07-create-2-wrong-code');
  await page.fill('#kaCode', server.codes.get(MAIL)); await page.press('#kaCode', 'Enter'); await waitView(page, 'signup3');
  await page.waitForFunction(() => window.KaiSipCloud && window.KaiSipCloud.passwordRules.passwordWordsLoaded(), null, { timeout: 15000 });
  await snap(page, '08-create-3-checklist-empty');
  await fillPw(page, 'Ocean violet 7!'); await page.press('#kaPw', 'Enter');
  await page.waitForFunction(() => /Not saved yet/.test(document.getElementById('kaPwHelp').textContent)); await snap(page, '09-create-3-password-refused');
  s.net.hibpMode = 'down';
  await fillPw(page, PW); await snap(page, '10-create-3-password-good');
  await page.press('#kaPw', 'Enter'); await waitView(page, ''); await settled(page);
  await page.waitForFunction(() => /couldn.t check/.test(document.getElementById('globalToast').textContent), null, { timeout: 4000 }).catch(() => {});
  if (shots) await page.screenshot({ path: path.join(shots, `11-created-leak-check-unavailable_${v === 'phone' ? '390' : '1280'}_${scheme}.png`) });
  // A new account with nothing answered: the app's own first-visit sheet, once, with no toast over it.
  await page.waitForSelector('.ob-welcome', { timeout: 8000 }); await sleep(500); await snap(page, '11b-first-visit-sheet');
  await page.click('.ob-ghost'); await sleep(400);
  if (shots) await page.screenshot({ path: path.join(shots, `11c-note-after-the-sheet_${v === 'phone' ? '390' : '1280'}_${scheme}.png`) });
  await sleep(7200);   // the note kept for after the sheet leaves
  // 2. Signed in: You and the Account page.
  await goYou(page);
  await snap(page, '12-you-signed-in');
  // Opened the way a learner does (a click), so the title is not drawn with the keyboard's focus box.
  await page.click(v === 'phone' ? '#kaTop' : '#kaRail'); await page.waitForFunction((e) => document.getElementById('kaHero').textContent.includes(e), MAIL); await page.waitForFunction(() => !ka.newsBusy);
  await page.mouse.move(2, 2); await snap(page, '13-account'); await snap(page, '13b-account-whole-page', true);
  await page.click('#kaPwRow'); await page.waitForSelector('#flagModal #kaPw'); await snap(page, '14-account-change-password');
  await page.keyboard.press('Escape'); await sleep(200);
  await page.click('#kaDel'); await page.waitForSelector('#flagModal #kaDelWord'); await snap(page, '15-account-delete');
  await page.keyboard.press('Escape'); await sleep(200);
  await page.click('#kaOut'); await page.waitForSelector('#flagModal #kaWipe'); await snap(page, '16-account-sign-out');
  await page.keyboard.press('Escape'); await sleep(200);
  // 3. The states of the card.
  await page.evaluate(() => navTo(null, 'you'));
  server.offline = true; await page.evaluate(() => kaSyncNow(true)); await page.waitForFunction(() => /Waiting for a connection/.test(document.getElementById('kaCard').textContent)); await snap(page, '17-you-waiting-for-connection');
  server.offline = false; server.force('/rest/v1/sync_snapshots', 503, {}); await page.evaluate(() => kaSyncNow(true)); await page.waitForFunction(() => /Couldn.t sync/.test(document.getElementById('kaCard').textContent)); await snap(page, '18-you-could-not-sync');
  await page.evaluate(() => { const x = JSON.parse(localStorage.getItem('kaisip_auth_v1')); x.signedInAt = Date.now() - 31 * 86400000; localStorage.setItem('kaisip_auth_v1', JSON.stringify(x)); });
  await page.reload(); await waitView(page, 'signin'); await snap(page, '19-sign-in-again-after-30-days');
  // 4. Forgot password.
  await page.click('.ka-aside'); await waitView(page, 'forgot1'); await page.fill('#kaEmail', MAIL); await snap(page, '20-forgot-1-email');
  await page.press('#kaEmail', 'Enter'); await waitView(page, 'forgot2');
  await page.fill('#kaCode', server.codes.get(MAIL)); await fillPw(page, PW2); await snap(page, '21-forgot-2-code-and-password');
  await s.ctx.close();
  // 6. Google, a new account: the agreements. Then the first-sync preview.
  s = await setup({ view: v, scheme }); page = s.page; server = s.server;
  await open(page, '#sign-in');
  const [req] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('.ka-btn-google')]);
  await page.goto(`${APP}?code=${server.googleCode(new URL(req.url()).searchParams.get('code_challenge'), 'gina@gmail.com')}`);
  await waitView(page, 'consent'); await snap(page, '25-google-agreements');
  await s.ctx.close();
  const shared = new F.FakeSupabase(() => Date.now()); shared.captchaOn = true;
  await makeAccount(shared);
  s = await setup({ view: v, scheme, server: shared, seed: profileSeed(freeIds(1, 12)) }); page = s.page;
  await signIn(page); await waitView(page, 'firstsync'); await page.click('#kaGo'); await waitView(page, ''); await settled(page);
  await s.ctx.close();
  s = await setup({ view: v, scheme, server: shared, seed: profileSeed(freeIds(2, 7)) }); page = s.page;
  await signIn(page); await waitView(page, 'firstsync'); await snap(page, '26-first-sync-preview');
  await s.ctx.close();
  // 7. The two account pages.
  s = await setup({ view: v, scheme }); page = s.page;
  await page.goto(SITE + '/delete-account'); await snap(page, '27-delete-account-page', true);
  s.net.turnstileMode = 'down';
  await page.goto(SITE + '/human-check'); await sleep(300); await snap(page, '28-human-check-page');
  await s.ctx.close();
}
if (wanted('A11')) {
  const probe = await setup({ view: 'phone' });
  await rec.run('A11', 'Every screen: no sideways scroll from 320 to 1280 wide, and none with text at 200%', probe.page, async (c) => { await walk('phone', 'light', '', c); }, { allowErrors: true });
  await probe.ctx.close();
}
// The same walk in the dark theme, with axe at every screen (contrast is checked per theme).
if (wanted('A12')) {
  for (const v of ['phone', 'desktop']) {
    const probe = await setup({ view: v, scheme: 'dark' });
    await rec.run(`A12-${v}`, 'Every screen in the dark theme: axe finds nothing', probe.page, async (c) => { await walk(v, 'dark', '', c, true); }, { allowErrors: true });
    await probe.ctx.close();
  }
}
if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const v of ['phone', 'desktop']) for (const scheme of ['light', 'dark']) { console.log(`shots: ${v} ${scheme}`); await walk(v, scheme, SHOTS, null); }
  // The contact sheet: every picture, by screen.
  const files = fs.readdirSync(SHOTS).filter((f) => /^\d\db?-.*\.png$/.test(f)).sort();
  const names = [...new Set(files.map((f) => f.replace(/_(390|1280)_(light|dark)\.png$/, '')))];
  const cell = (n, k) => `<figure><img src="${n}_${k}.png" loading="eager"><figcaption>${k.replace('_', ' ')}</figcaption></figure>`;
  const sheet = `<!doctype html><meta charset="utf-8"><title>KaiSip web accounts: every screen</title><style>body{margin:24px;background:#e9e6dc;font:14px/1.4 system-ui,sans-serif;color:#17231b}h1{font-size:22px}h2{font-size:16px;margin:28px 0 8px}.row{display:grid;grid-template-columns:1fr 1fr 3.2fr 3.2fr;gap:12px;align-items:start}figure{margin:0}img{width:100%;height:auto;display:block;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.2)}figcaption{font-size:12px;margin-top:4px;color:#465349}</style><h1>KaiSip web accounts (stream B1): every screen at 390 and 1280, light and dark</h1>${names.map((n) => `<h2>${n}</h2><div class="row">${['390_light', '390_dark', '1280_light', '1280_dark'].map((k) => cell(n, k)).join('')}</div>`).join('')}`;
  fs.writeFileSync(path.join(SHOTS, 'sheet.html'), sheet);
  const sp = await browser.newPage({ viewport: { width: 2200, height: 1200 }, deviceScaleFactor: 1 });
  await sp.goto('file://' + path.join(SHOTS, 'sheet.html'));
  await sp.waitForLoadState('networkidle').catch(() => {});
  await sleep(500);
  await sp.screenshot({ path: path.join(SHOTS, 'contact_sheet.png'), fullPage: true });
  await sp.close();
  console.log(`shots: ${files.length} pictures and contact_sheet.png in ${SHOTS}`);
  if (shotFontMisses.length) { console.error(`shots: ${shotFontMisses.length} pictures were taken without the real fonts: ${shotFontMisses.join(', ')}`); process.exitCode = 1; }
  else console.log('shots: KaiSip Serif and Figtree were loaded for every picture');
}

// ── A7 (more). Another account signs in on the same browser ──
if (wanted('A7')) {
  const ids = freeIds(4, 2);
  const { ctx, page, server } = await setup({ view: 'phone', seed: profileSeed(ids) });
  const idA = await makeAccount(server);
  const idB = await makeAccount(server, 'noel@example.com', PW2);
  await rec.run('A7-switch', 'A different account on the same browser: it asks first, Start fresh is the main choice, and Combine sends only this browser’s own progress', page, async (c) => {
    await signIn(page);
    await waitView(page, 'firstsync'); await page.click('#kaGo'); await waitView(page, ''); await settled(page);
    const hashA = JSON.parse((await store(page)).local.kaisip_sync_v1).accountHash;
    await page.evaluate(() => navGoFocus(null, 'account')); await page.click('#kaOut'); await page.click('#flagModal #kaGo');
    await waitView(page, 'signin');
    c.check(!!(await store(page)).local.kaisip_sync_mirror_v1, 'signing out keeps this browser’s sync record, so the same account carries on later');
    await signIn(page, 'noel@example.com', PW2);
    await waitView(page, 'firstsync');
    c.check((await text(page, '#kaRoot h1')) === 'A different account', 'the title: ' + (await text(page, '#kaRoot h1')));
    const btns = await page.evaluate(() => [...document.querySelectorAll('.ka-choices button')].map((b) => [b.textContent.trim(), b.className]));
    c.check(btns[0][0] === 'Start fresh with this account' && /primary/.test(btns[0][1]) && btns[1][0] === 'Combine them' && btns[2][0] === 'Not now', 'Start fresh is the main choice: ' + JSON.stringify(btns.map((b) => b[0])));
    c.check(!server.row(idB, 'progress'), 'nothing is sent to the second account before the choice');
    await axe(page, c, 'a different account');
    await noOverflow(page, c, 'a different account');
    await c.shot('a7-switch');
    await page.click('.ka-choices .ka-btn-secondary');
    await waitView(page, ''); await settled(page);
    const st = await store(page);
    c.check(JSON.parse(st.local.kaisip_sync_v1).accountHash !== hashA && !!server.row(idB, 'progress'), 'this browser now syncs with the second account');
    c.check(ids.every((id) => (JSON.parse(st.local.cisa_profiles_v1)['CISA-AAAAA'].state.answerLog || {})[id]), 'and keeps its own progress');
    c.check(!!server.row(idA, 'progress'), 'the first account keeps its copy');
  });
  await ctx.close();
}

// ── G. The website asks for an account (owner decision, 28 Nov 2026) ──
// G1 a signed-out visitor never sees the study app; G2 a deep link comes back after sign-in;
// G3 a signed-in learner keeps studying when the sync service or the accounts script is down;
// G4 a sign-in that ended asks again and touches nothing; G5 progress from before accounts is kept.
const STUDY_HASHES = ['#today', '#practice', '#notes', '#mock', '#you', '#glossary', '#account', '#settings'];
const outsideKa = (page) => page.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((e) => !e.closest('#kaRoot') && e.getClientRects().length > 0).slice(0, 5).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).slice(0, 30)));
if (wanted('G1')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, net } = await setup({ view: v, onboarded: false });
    await ctx.addInitScript(WATCH_APP);
    await rec.run(`G1-${v}`, 'Accounts on, not signed in: the welcome is the only way in; the study app never shows, at any address', page, async (c) => {
      await open(page);
      await waitView(page, 'welcome');
      const w = await text(page, '#kaRoot');
      c.check(/You need an account to study here\. It.s free, and it keeps your progress safe and in sync with the Android app\./.test(w) && !/KaiSip is free/.test(w), 'the welcome says an account is needed, and why, in one honest line: ' + w.slice(0, 260));
      const about = await page.evaluate(() => { const a = [...document.querySelectorAll('#kaRoot .ka-welcome-foot a')].find((x) => x.textContent.trim() === 'About KaiSip'); return a && { href: a.getAttribute('href'), target: a.getAttribute('target') }; });
      c.check(about && about.href === '/' && !about.target, 'a quiet "About KaiSip" link leads to the home page (not round the gate): ' + JSON.stringify(about));
      const paths = await page.evaluate(() => [...document.querySelectorAll('#kaRoot .ka-path-t')].map((x) => x.textContent));
      c.check(JSON.stringify(paths) === JSON.stringify(['Create a free account', 'Sign in']), 'two paths, both to an account: ' + paths.join(' / '));
      await page.waitForFunction(() => /or with Google/.test(document.querySelector('.ka-path-primary').innerText), null, { timeout: 4000 }).catch(() => {});
      c.check(/With your email and a password, or with Google\./.test(await text(page, '.ka-path-primary')), 'with Google’s file in place the first path names both ways: ' + (await text(page, '.ka-path-primary')));
      c.check(!/look around|without an account|Start studying free|Skip|Not now|Maybe later|limited|hurry|today only/i.test(w), 'no way round the account and no hurry words');
      c.check(!(await page.evaluate(() => window.__appSeen)), 'the study app was never on screen while the page loaded');
      c.check(!(await page.evaluate(() => document.querySelector('.ob-welcome'))), 'the older first-visit sheet does not open behind it');
      c.check((await outsideKa(page)).length === 0, 'nothing outside the welcome can be reached by keyboard: ' + JSON.stringify(await outsideKa(page)));
      c.check(net.cloudJs === 0 && net.supabase === 0 && net.turnstile === 0 && net.hibp.length === 0, `the welcome loads no account script and sends nothing (${net.cloudJs}, ${net.supabase}, ${net.turnstile})`);
      const links = await page.evaluate(() => [...document.querySelectorAll('#kaRoot a[href]')].map((a) => a.getAttribute('href')));
      c.check(['terms.html', 'privacy.html', 'support.html'].every((h) => links.includes(h)), 'Terms, Privacy and Help are linked from the welcome: ' + links.join(','));
      c.check(!(await page.evaluate(() => document.getElementById('kaKept'))), 'a new visitor sees no "progress kept" line');
      await axe(page, c, `the welcome (${v})`);
      await noOverflow(page, c, `the welcome (${v})`);
      await c.shot(`g1-${v}-welcome`);
      await page.keyboard.press('Escape');
      await sleep(150);
      c.check((await view(page)) === 'welcome' && !(await appShown(page)), 'Escape does not open the app');
      // Every study address, opened fresh and changed in the open page: still the way in.
      for (const h of STUDY_HASHES) {
        await page.goto('about:blank');
        await open(page, h);
        c.check((await view(page)) === 'welcome' && !(await page.evaluate(() => window.__appSeen)), `${h} opened fresh: still the welcome, no flash (${await view(page)})`);
      }
      for (const h of STUDY_HASHES) {
        await page.evaluate((x) => { location.hash = x; }, h);
        await sleep(120);
        c.check(['welcome'].includes(await view(page)) && !(await appShown(page)), `${h} in the open page: still the welcome`);
      }
      // The app's own doors, called directly (a stale link, the keyboard): none opens the app.
      await page.evaluate(() => { try { navTo(null, 'practice'); } catch (e) {} try { switchTab('notes'); } catch (e) {} try { kaGoApp('home'); } catch (e) {} try { kaLand(); } catch (e) {} try { kaClose(); } catch (e) {} });
      await sleep(200);
      c.check(!(await appShown(page)) || (await view(page)) !== '', 'the app stays closed behind an account screen: ' + (await view(page)));
      c.check(!(await page.evaluate(() => window.__appSeen)), 'and it was never on screen');
      // The account addresses open their screens; the wordmark goes back to the welcome, never into the app.
      for (const [h, vw] of [['#sign-in', 'signin'], ['#create-account', 'signup1'], ['#forgot-password', 'forgot1']]) {
        await page.goto('about:blank');
        await open(page, h);
        c.check((await view(page)) === vw && !(await page.evaluate(() => window.__appSeen)), `${h} opens its screen with no flash (${await view(page)})`);
        c.check(!/Back to studying|look around/i.test(await text(page, '#kaRoot')), `${h}: no way into the app without an account`);
      }
      await page.click('#kaRoot .ka-brand');
      await waitView(page, 'welcome');
      // The public pages stay public (no gate, no account script).
      const pub = await ctx.newPage();
      for (const p of ['/terms', '/privacy', '/support', '/delete-account', '/human-check']) {
        const res = await pub.goto(SITE + p);
        const st = await pub.evaluate(() => ({ gate: document.documentElement.hasAttribute('data-ka-gate'), root: !!document.getElementById('kaRoot'), words: document.body.innerText.trim().length }));
        c.check(res.status() === 200 && !st.gate && !st.root && st.words > 30, `${p} is public: ${res.status()} ${JSON.stringify(st)}`);
      }
      await pub.close();
    });
    await ctx.close();
  }
}

if (wanted('G2')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await ctx.addInitScript(WATCH_APP);
  await makeAccount(server);
  await rec.run('G2', 'A deep link asked for while signed out opens after sign-in (this tab only), then is forgotten', page, async (c) => {
    await open(page, '#glossary');
    await waitView(page, 'welcome');
    c.check((await store(page)).session.kaisip_acct_intent_v1 === 'hash:#glossary' && !(await store(page)).local.kaisip_acct_intent_v1, 'the address is kept for this tab only: ' + (await store(page)).session.kaisip_acct_intent_v1);
    await page.click('.ka-path-secondary');
    await waitView(page, 'signin');
    await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW); await page.press('#kaPass', 'Enter');
    await waitView(page, '');
    await page.waitForFunction(() => S.activeTab === 'glossary', null, { timeout: 8000 }).catch(() => {});
    c.check((await page.evaluate(() => S.activeTab)) === 'glossary' && await appShown(page), 'signed in: the Glossary opens, as asked: ' + (await page.evaluate(() => S.activeTab)));
    c.check(!(await store(page)).session.kaisip_acct_intent_v1, 'and the kept address is used up');
    await settled(page);
    // A reload stays in (no welcome, no flash of a sign-in screen), on the address in the bar.
    await page.goto('about:blank');
    await open(page, '#notes');
    c.check((await view(page)) === '' && (await page.evaluate(() => S.activeTab)) === 'topics' && await appShown(page), 'a later visit goes straight to the page asked for: ' + (await dump(page)) + ' ' + (await page.evaluate(() => S.activeTab)));
    // A hostile or unknown address is not kept.
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.click('#kaOut'); await page.click('#flagModal #kaGo');
    await waitView(page, 'signin');
    await page.goto('about:blank');
    await open(page, '#javascript:alert(1)');
    c.check(!(await store(page)).session.kaisip_acct_intent_v1, 'an unknown address is not remembered');
    await page.goto('about:blank');
    await open(page, '#account');
    await page.goto('about:blank');
    await signIn(page);
    await waitView(page, '');
    await page.waitForSelector('#kaHero .ka-who', { timeout: 8000 }).catch(() => {});
    c.check((await page.evaluate(() => S.activeTab)) === 'account', 'the Account page asked for while signed out opens after sign-in: ' + (await page.evaluate(() => S.activeTab)));
  });
  await ctx.close();
}

if (wanted('G3')) {
  const ids = freeIds(2, 3);
  const { ctx, page, server, net } = await setup({ view: 'phone', seed: profileSeed(ids) });
  await ctx.addInitScript(WATCH_APP);
  await makeAccount(server);
  await rec.run('G3', 'Signed in: the learner keeps studying when the sync service is down, offline, or the accounts script cannot load', page, async (c) => {
    await signIn(page);
    await waitView(page, 'firstsync');
    await page.click('#kaGo');
    await waitView(page, '');
    await settled(page);
    const before = await answerKeys(page);
    // 1. The sync service answers with errors.
    net.supaMode = '503';
    await page.goto('about:blank');
    await open(page);
    await sleep(1200);
    c.check((await view(page)) === '' && await appShown(page), 'service errors: still in the study app (' + (await view(page)) + ')');
    c.check((await store(page)).local.kaisip_auth_v1 && !(await store(page)).local.kaisip_auth_ended_v1, 'a server error does not end the sign-in');
    net.supaMode = '';
    // 2. No connection to the service at all.
    server.offline = true;
    await page.goto('about:blank');
    await open(page, '#practice');
    await sleep(1200);
    c.check((await view(page)) === '' && (await page.evaluate(() => S.activeTab)) === 'practice' && await appShown(page), 'no connection: Practice opens (' + (await view(page)) + ')');
    await goYou(page);
    c.check(/Waiting for a connection|Couldn.t sync|Synced/.test(await text(page, '#kaCard')), 'the card says so calmly: ' + (await text(page, '#kaCard')));
    // 3. The accounts script itself cannot be loaded.
    net.cloudJsMode = 'down';
    await page.goto('about:blank');
    await open(page);
    await sleep(1200);
    c.check((await view(page)) === '' && await appShown(page) && (await page.evaluate(() => typeof window.KaiSipCloud)) === 'undefined', 'the accounts script is unreachable: still in the study app');
    await page.evaluate(() => navTo(null, 'practice'));
    await sleep(300);
    c.check((await view(page)) === '' && await appShown(page), 'and moving between pages does not close it');
    c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before), 'progress is untouched through all three');
    c.check((await store(page)).local.kaisip_auth_v1, 'the sign-in is still saved');
    net.cloudJsMode = ''; server.offline = false;
  }, { allowErrors: true });
  await ctx.close();
}

if (wanted('G4')) {
  for (const how of ['30 days', '14 unused days', 'ended by the service', 'gone on the service']) {
    const ids = freeIds(3, 3);
    const { ctx, page, server } = await setup({ view: how === '30 days' ? 'desktop' : 'phone', seed: profileSeed(ids) });
    await ctx.addInitScript(WATCH_APP);
    await makeAccount(server);
    await rec.run(`G4-${how.replace(/ /g, '-')}`, `The sign-in ends (${how}): asked to sign in again, nothing in this browser is touched, and they come back to where they were`, page, async (c) => {
      await signIn(page);
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      const before = await answerKeys(page);
      if (how === 'gone on the service') {
        // The token is still in date, but the service no longer knows the session: the account
        // call answers 403 session_not_found (the refresh path, 400 refresh_token_not_found, is the next case).
        const uid = server.userByEmail(EMAIL).id;
        for (const [f, info] of server.families) if (info.userId === uid) server.revokedFamilies.add(f);
        server.calls.length = 0;
        await page.evaluate(() => navGoFocus(null, 'account'));
        await waitView(page, 'signin');
        const asked = server.calls.filter((x) => x.path.startsWith('/auth/v1/user') || x.path.startsWith('/auth/v1/token')).map((x) => x.method + ' ' + x.path.split('?')[0]);
        c.check(asked.includes('GET /auth/v1/user') && JSON.parse((await store(page)).local.kaisip_auth_ended_v1).reason === 'revoked', 'the 403 from the account call ends the sign-in here: ' + asked.join(', '));
      } else if (how === 'ended by the service') {
        // The service ends the session (signed out everywhere, a changed password elsewhere).
        const uid = server.userByEmail(EMAIL).id;
        for (const [f, info] of server.families) if (info.userId === uid) server.revokedFamilies.add(f);
        await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('kaisip_auth_v1')); s.expiresAt = 1000; localStorage.setItem('kaisip_auth_v1', JSON.stringify(s)); });
        // A question is open: the gate waits for it.
        await page.evaluate(() => navTo(null, 'practice'));
        await page.evaluate(() => startSession(5, 'all'));
        await page.waitForFunction(() => { const pf = document.getElementById('practiceFocus'); return pf && !pf.hidden; }, null, { timeout: 8000 });
        await page.evaluate(() => kaSyncNow(true));
        await page.waitForFunction(() => !localStorage.getItem('kaisip_auth_v1'), null, { timeout: 8000 });
        await sleep(400);
        c.check((await view(page)) === '' && await page.evaluate(() => !document.getElementById('practiceFocus').hidden), 'the sign-in ended while a question is open: the question stays: ' + (await dump(page)) + ' ' + (await page.evaluate(() => document.getElementById('practiceFocus').hidden + ' ' + S.activeTab + ' ' + kaHost.busy())));
        await page.evaluate(() => { try { setPracticeView('hub'); } catch (e) {} });
        await sleep(300);
        await page.evaluate(() => { try { navTo(null, 'notes'); } catch (e) {} });
        await waitView(page, 'signin');
      } else {
        await page.evaluate((h) => { const s = JSON.parse(localStorage.getItem('kaisip_auth_v1')); if (h === '30 days') s.signedInAt = Date.now() - 31 * 86400000; else s.lastActiveAt = Date.now() - 15 * 86400000; localStorage.setItem('kaisip_auth_v1', JSON.stringify(s)); }, how);
        await page.goto('about:blank');
        await page.evaluate(() => 0);
        await open(page, '#notes');
        await waitView(page, 'signin');
        c.check(!(await page.evaluate(() => window.__appSeen)), 'the study app does not flash before "sign in again"');
      }
      c.check(/Please sign in again to keep studying\. Your progress is safe in this browser\./.test(await text(page, '#kaNotice')), 'the words: ' + (await text(page, '#kaNotice')));
      c.check(!(await appShown(page)), 'the study app is closed');
      const st = await store(page);
      const ended = JSON.parse(st.local.kaisip_auth_ended_v1 || 'null');
      c.check(!st.local.kaisip_auth_v1 && ended && typeof ended.reason === 'string', 'the session is gone and only the reason is kept: ' + JSON.stringify(ended));
      c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before) && before.ids.length === 3, 'saved progress is untouched: ' + JSON.stringify(before.ids));
      await axe(page, c, `sign in again (${how})`);
      await noOverflow(page, c, `sign in again (${how})`);
      await c.shot(`g4-${how.replace(/ /g, '-')}`);
      // A reload shows the same screen, still with no flash.
      await page.goto('about:blank');
      await open(page);
      c.check((await view(page)) === 'signin' && !(await page.evaluate(() => window.__appSeen)), 'a reload: sign in again, no flash (' + (await view(page)) + ')');
      await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW); await page.press('#kaPass', 'Enter');
      await waitView(page, '');
      await settled(page);
      c.check(await appShown(page) && !(await store(page)).local.kaisip_auth_ended_v1, 'signed in again: back in the app, the note cleared, no preview the second time');

      c.check(JSON.stringify((await answerKeys(page)).ids) === JSON.stringify(before.ids), 'and the same progress');
    }, { allowErrors: how === 'ended by the service' || how === 'gone on the service' });
    await ctx.close();
  }
}

if (wanted('G5')) {
  const mine = freeIds(4, 3);
  const OLD = 'd1_001';   // answered before the website's free sample (v12.50); the website no longer loads it
  const { ctx, page, server } = await setup({ view: 'phone', seed: profileSeed(mine, [OLD]) });
  await ctx.addInitScript(WATCH_APP);
  await rec.run('G5', 'A visitor who studied before accounts existed: told the progress is kept, offered it into the new account, and the older answers stay here', page, async (c) => {
    await open(page);
    await waitView(page, 'welcome');
    c.check(!(await page.evaluate(() => window.__appSeen)), 'no flash of the app, even with progress saved here');
    c.check((await text(page, '#kaKept')) === 'The progress you already have in this browser is kept. After you sign in, you choose whether to add it to your account.', 'the welcome says the progress is kept: ' + (await text(page, '#kaKept')));
    const before = await answerKeys(page);
    c.check(before.ids.length === 4 && before.ids.includes(OLD), 'nothing was removed by the gate: ' + before.ids.join(','));
    await axe(page, c, 'the welcome, returning visitor');
    await c.shot('g5-welcome-returning');
    // Create the account: email and agreement, the code, the password.
    await page.click('.ka-path-primary');
    await waitView(page, 'signup1');
    await page.fill('#kaEmail', 'old.hand@example.com');
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await waitView(page, 'signup2');
    await page.fill('#kaCode', server.codes.get('old.hand@example.com'));
    await page.press('#kaCode', 'Enter');
    await waitView(page, 'signup3');
    await fillPw(page, PW2);
    await page.click('#kaGo');
    await waitView(page, 'firstsync');
    c.check((await text(page, '#kaRoot h1')) === norm('Add this browser’s progress to your account?'), 'the first sign-in offers this browser’s progress: ' + (await text(page, '#kaRoot h1')));
    const row = await page.evaluate(() => [...document.querySelectorAll('.ka-cols tbody tr')[0].children].map((x) => x.textContent));
    c.check(JSON.stringify(row) === JSON.stringify(['Questions answered', '3', '0', '3']), 'it counts what the account can hold (3 of 4): ' + JSON.stringify(row));
    const older = await text(page, '#kaOlder');
    c.check(/^1 answer here is for a question now only in the Android app\. It stays saved and counted in this browser, but the website can.t add it to your account\.$/.test(older), 'and says plainly what happens to the older answer: ' + older);
    await axe(page, c, 'first sync preview with older answers');
    await noOverflow(page, c, 'first sync preview with older answers');
    await c.shot('g5-preview-older');
    await page.click('#kaGo');
    await waitView(page, '');
    await settled(page);
    const after = await answerKeys(page);
    c.check(JSON.stringify(after) === JSON.stringify(before), 'in the app with all four answers, still counted: ' + JSON.stringify(after));
    const sent = calls(server, '/rest/v1/sync_snapshots', 'POST').map((x) => JSON.stringify(x.body)).join('');
    c.check(!sent.includes(OLD), 'the older answer is not sent to the account');
    // "Not now" is also safe: tested in A7-not-now. Sign out keeps all four here.
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.click('#kaOut'); await page.click('#flagModal #kaGo');
    await waitView(page, 'signin');
    c.check(JSON.stringify((await answerKeys(page)).ids) === JSON.stringify(before.ids), 'signed out: the progress is still in this browser');
  });
  await ctx.close();
}

// ── N. The news row on Account and the email service (newsletter-sync) ──
if (wanted('N1')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  server.kit = new Map();
  server.newsWaitMs = 0;
  await makeAccount(server);
  const row = (page) => page.evaluate(() => ({ state: document.getElementById('kaNewsRow').getAttribute('data-state'), sub: document.getElementById('kaNewsS').innerText.replace(/\s+/g, ' ').trim(), sw: (document.getElementById('kaNewsBtn') || { getAttribute() { return null; } }).getAttribute('aria-checked') }));
  const openAccount = async (page) => { await page.evaluate(() => navGoFocus(null, 'home')); await page.evaluate(() => navGoFocus(null, 'account')); await page.waitForSelector('#kaNewsRow'); await page.waitForFunction(() => !ka.newsBusy); };
  const syncs = () => calls(server, '/functions/v1/newsletter-sync').length;
  await rec.run('N1', 'News emails: on asks to confirm by email, confirmed reads as on, a switch-off reaches the email service, an address the service holds as stopped cannot be restarted here, and the service being away loses nothing', page, async (c) => {
    await signedIn(page);
    await openAccount(page);
    c.check(JSON.stringify(await row(page)) === JSON.stringify({ state: 'off', sub: 'About twice a month. You can unsubscribe anytime.', sw: 'false' }), 'starts off: ' + JSON.stringify(await row(page)));
    c.check(syncs() === 1 && calls(server, '/functions/v1/newsletter-sync').every((x) => JSON.stringify(x.body) === '{}'), 'opening Account asks the email service once, with an empty body');
    // On: recorded, then "check your inbox".
    await page.click('#kaNewsBtn');
    await page.waitForFunction(() => document.getElementById('kaNewsRow').getAttribute('data-state') === 'pending', null, { timeout: 8000 });
    c.check((await row(page)).sub === 'Check your inbox to confirm your email. News starts after that.' && (await row(page)).sw === 'true', 'pending: the row says to check the inbox: ' + JSON.stringify(await row(page)));
    await waitText(page, 'kaNewsBtnSay', /Check your inbox to confirm your email\./, c);
    c.check(server.kit.get(EMAIL) === 'inactive' && server.consent.get(server.userByEmail(EMAIL).id).marketing_opt_in === true, 'the opt-in is on record and the confirmation email is out');
    c.check(await page.evaluate(() => document.getElementById('kaNewsBtn').getAttribute('aria-describedby') === 'kaNewsS' && document.activeElement.id === 'kaNewsBtn'), 'the switch is described by that line and keeps focus');
    await axe(page, c, 'Account, news pending');
    await c.shot('n1-pending', page, true);
    // Confirmed in the email: the next visit reads as on, with the usual line.
    server.kit.set(EMAIL, 'active');
    await openAccount(page);
    c.check(JSON.stringify(await row(page)) === JSON.stringify({ state: 'on', sub: 'About twice a month. You can unsubscribe anytime.', sw: 'true' }), 'confirmed: on: ' + JSON.stringify(await row(page)));
    // The email service is away: the switch still works and the choice is on record.
    server.kitDown = true;
    await page.click('#kaNewsBtn');
    await waitText(page, 'kaNewsBtnSay', /^Off\./, c);
    await page.waitForFunction(() => !ka.newsBusy);
    c.check((await row(page)).sw === 'false' && server.consent.get(server.userByEmail(EMAIL).id).marketing_opt_in === false && !/\bkit\b|503|unavailable/i.test(await text(page, '#kaAccount')), 'email service away: off is recorded, and no error text shows');
    server.kitDown = false;
    await openAccount(page);
    c.check(server.kit.get(EMAIL) === 'cancelled' && JSON.stringify(await row(page)) === JSON.stringify({ state: 'off', sub: 'About twice a month. You can unsubscribe anytime.', sw: 'false' }), 'the next visit to Account finishes the job: the emails are stopped at the service, and the row is the switch, off, nothing else: ' + JSON.stringify(await row(page)));
    await openAccount(page);
    c.check((await row(page)).state === 'off', 'and the same at a later visit');
    // The email service now holds the address as stopped: switching on does not stick, and the row says so.
    await page.click('#kaNewsBtn');
    await page.waitForFunction(() => document.getElementById('kaNewsRow').getAttribute('data-state') === 'blocked', null, { timeout: 8000 });
    const blocked = await row(page);
    c.check(blocked.sw === 'false' && /^You.re unsubscribed from KaiSip news, and it can.t be restarted here\. For help, see Help( \(opens in a new tab\))? ?\.$/.test(norm(blocked.sub)), 'blocked: the switch is off, with one line that it can’t be restarted here and where to get help: ' + JSON.stringify(blocked));
    c.check(!/by email|you switched|you turned|bounce|complain/i.test(blocked.sub), 'the line does not claim how it happened');
    await waitText(page, 'kaNewsBtnSay', /^Still off\. It can.t be restarted here\.$/, c);
    c.check(await page.evaluate(() => { const a = document.querySelectorAll('#kaNewsRow a'); return a.length === 1 && a[0].getAttribute('href') === 'support.html' && a[0].target === '_blank' && document.activeElement.id === 'kaNewsBtn' && document.getElementById('kaNewsW').textContent === 'Off'; }), 'while the form’s address is not set the line points to Help (never a dead end); focus stays on the switch, which reads Off');
    const rec2 = server.consent.get(server.userByEmail(EMAIL).id);
    c.check(rec2.marketing_opt_in === false && rec2.source === 'email_service', 'the record was switched off by the server, with its own label: ' + JSON.stringify(rec2));
    await axe(page, c, 'Account, news blocked');
    await noOverflow(page, c, 'Account, news blocked');
    await c.shot('n1-blocked', page, true);
    // Once the owner supplies the email service's sign-up form, the line links to it (new tab).
    await page.evaluate(() => { KA_NEWS_FORM_URL = 'https://kaisip.kit.com/news'; kaNewsDraw(); });
    const linked = await page.evaluate(() => { const a = document.querySelector('#kaNewsRow a'); return a && { href: a.getAttribute('href'), blank: a.target === '_blank', rel: a.rel, words: document.getElementById('kaNewsS').innerText.replace(/\s+/g, ' ').trim() }; });
    c.check(linked && linked.href === 'https://kaisip.kit.com/news' && linked.blank && /noopener/.test(linked.rel) && /^You.re unsubscribed from KaiSip news, and it can.t be restarted here\. To get it again, sign up with the KaiSip news form( \(opens in a new tab\))? ?\.$/.test(linked.words), 'with the address set, the line links to the form: ' + JSON.stringify(linked));
    await axe(page, c, 'Account, news blocked, with the form link');
    await page.reload();
    await page.waitForFunction(() => document.body.hasAttribute('data-section'));
    await openAccount(page);
    c.check((await row(page)).state === 'blocked' && (await row(page)).sw === 'false', 'after a reload the record’s own label keeps the line there');
    c.check(await page.evaluate(() => KA_NEWS_FORM_URL === '' && document.querySelector('#kaNewsRow a').getAttribute('href') === 'support.html'), 'the form’s address ships empty, so the line points to Help');
    // The data download says whether the app added the address to the email service.
    const dl = page.waitForEvent('download');
    await page.click('#kaDl');
    const got = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8'));
    c.check(got.newsletter && got.newsletter.addedToEmailService === false, 'Download my data carries the newsletter state: ' + JSON.stringify(got.newsletter));
  });
  await ctx.close();
}

if (wanted('N2')) {
  const { ctx, page, server } = await setup({ view: 'desktop' });
  await makeAccount(server);
  await rec.run('N2', 'News emails before the email service is connected, the wait between two asks, and the daily limit on changes', page, async (c) => {
    await signedIn(page);
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.waitForSelector('#kaNewsRow');
    await page.waitForFunction(() => !ka.newsBusy);
    // Not connected yet: the choice is recorded and nothing else is said.
    await page.click('#kaNewsBtn');
    await waitText(page, 'kaNewsBtnSay', /^On\. We.ll email you study tips and KaiSip news\.$/, c);
    await page.waitForFunction(() => !ka.newsBusy);
    c.check(await page.evaluate(() => document.getElementById('kaNewsRow').getAttribute('data-state') === 'on' && ka.newsState === 'not_configured'), 'not connected: the switch is on, with the usual line');
    c.check(server.consent.get(server.userByEmail(EMAIL).id).marketing_opt_in === true, 'and the opt-in is on record');
    // Connected, and asked twice within the wait: the page waits as told and asks once more.
    server.kit = new Map();
    server.newsWaitMs = 1000;
    await page.click('#kaNewsBtn');
    await waitText(page, 'kaNewsBtnSay', /^Off\./, c);
    await page.waitForFunction(() => !ka.newsBusy, null, { timeout: 8000 });
    c.check(await page.evaluate(() => document.getElementById('kaNewsRow').getAttribute('data-state') === 'off'), 'off: the switch, nothing else');
    const before = calls(server, '/functions/v1/newsletter-sync').length;
    await page.click('#kaNewsBtn');
    await page.waitForFunction(() => document.getElementById('kaNewsRow').getAttribute('data-state') === 'pending', null, { timeout: 8000 });
    c.check(calls(server, '/functions/v1/newsletter-sync').length === before + 2, 'told to wait (429): one more ask after the wait, then the answer shows');
    c.check(!/429|rate|limit/i.test(await text(page, '#kaAccount')), 'the wait is never shown as an error');
    // The account's email is not confirmed (a safety state on the website): the choice is shown as saved, and nothing is sent.
    await page.click('#kaNewsBtn');
    await waitText(page, 'kaNewsBtnSay', /^Off\./, c);
    await page.waitForFunction(() => !ka.newsBusy, null, { timeout: 8000 });
    server.unconfirmed.add(server.userByEmail(EMAIL).id);
    server.kit = new Map();
    await page.click('#kaNewsBtn');
    await page.waitForFunction(() => document.getElementById('kaNewsRow').getAttribute('data-state') === 'unconfirmed', null, { timeout: 8000 });
    c.check(await page.evaluate(() => document.getElementById('kaNewsBtn').getAttribute('aria-checked') === 'true' && document.getElementById('kaNewsS').textContent === 'Saved. News starts once your email address is confirmed.') && server.kit.size === 0 && server.consent.get(server.userByEmail(EMAIL).id).marketing_opt_in === true, 'unconfirmed: on as saved, the line says when news starts, and nothing went to the email service');
    server.unconfirmed.clear();
    // The 21st change in a day is refused in words; switching off still works.
    server.newsWaitMs = 0;
    const id = server.userByEmail(EMAIL).id;
    server.consentLog.set(id, Array.from({ length: 20 }, () => Date.now()));
    server.kit = null;   // (not connected, so the switch stays on the page for the next step)
    await page.click('#kaNewsBtn');
    await waitText(page, 'kaNewsBtnSay', /^Off\./, c);
    await page.waitForFunction(() => !ka.newsBusy);
    c.check(server.consent.get(id).marketing_opt_in === false, 'past the limit, switching off still goes through');
    await page.click('#kaNewsBtn');
    await waitText(page, 'kaNewsBtnSay', /^That.s a lot of changes for one day\. You can switch this on again tomorrow\.$/, c);
    c.check(await page.evaluate(() => document.getElementById('kaNewsBtn').getAttribute('aria-checked') === 'false') && server.consent.get(id).marketing_opt_in === false, 'switching on is refused: the switch goes back to Off and says why');
  });
  await ctx.close();
}

if (wanted('N3')) {
  // An account that agreed to the older Terms (test accounts only): it agrees again, and only the two labels move.
  const { ctx, page, server } = await setup({ view: 'phone' });
  await makeAccount(server, EMAIL, PW, { terms: '2026-11' });
  await rec.run('N3', 'An account on the earlier Terms agrees again at sign-in: the same screen, and only the two version labels are written', page, async (c) => {
    await signIn(page);
    await waitView(page, 'consent');
    c.check((await text(page, '#kaRoot h1')) === 'One more step' && await page.evaluate(() => document.getElementById('kaTerms').checked === false && document.getElementById('kaAgeLine').textContent === 'Accounts are for learners 18 and older.'), 'the agreement is asked again, unticked');
    c.check(consentWrites(server).length === 0, 'nothing is written before the learner agrees');
    // An existing learner is never locked out: "Back to studying" is there, and it opens the app with sync paused.
    c.check(/Back to studying/.test(await text(page, '#kaRoot .ka-topbar')) && !(await store(page)).local.kaisip_acct_agree_v1, 'an account that agreed before keeps "Back to studying"');
    await page.click('#kaRoot .ka-toplink');
    await waitView(page, '');
    c.check(await appShown(page), 'it opens the study app');
    await page.goto('about:blank');
    await open(page);
    c.check((await view(page)) === '' && await appShown(page), 'and a later visit goes straight in');
    c.check(calls(server, '/rest/v1/sync_snapshots').filter((x) => x.method !== 'GET').length === 0, 'nothing syncs meanwhile');
    await goYou(page);
    await page.click('#kaCard [data-f="setup"]');
    await waitView(page, 'consent');
    await page.click('#kaGo');
    c.check((await text(page, '#kaConsentE')) === 'Tick the box above to continue.' && consentWrites(server).length === 0, 'and nothing without the tick');
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await waitView(page, '');
    const wrote = consentWrites(server);
    c.check(canon(wrote) === canon([{ method: 'POST', terms_version: '2026-12', age_confirmed: true, privacy_version: '2026-12', source: 'web' }, { method: 'PATCH', terms_version: '2026-12', privacy_version: '2026-12' }]), 'the record moves to the current versions with one PATCH of the two labels: ' + JSON.stringify(wrote));
    c.check(server.profiles.get(server.userByEmail(EMAIL).id) === '2026-12', 'the account is on the current Terms');
  });
  await ctx.close();
}

// ── U. The UX review's fixes (tap targets, the code cells, tab order, the busy button, the Google button) ──
const box = (page, sel) => page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
if (wanted('U1')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server } = await setup({ view: v });
    await makeAccount(server);
    await rec.run(`U1-${v}`, 'Tap targets are 44px or more, buttons are 52px with the app’s corner, "Forgot password?" comes after the password in the tab order, and a busy button stays readable', page, async (c) => {
      await open(page, '#sign-in');
      const go = await page.evaluate(() => { const e = document.getElementById('kaGo'); const cs = getComputedStyle(e); return { h: Math.round(e.getBoundingClientRect().height), r: cs.borderTopLeftRadius, tile: getComputedStyle(document.documentElement).getPropertyValue('--r-tile').trim() }; });
      c.check(go.h === 52 && go.r === go.tile, 'the primary button is 52px tall with --r-tile: ' + JSON.stringify(go));
      const small = await page.evaluate(() => [...document.querySelectorAll('#kaRoot a, #kaRoot button, #kaRoot input[type=checkbox]')].filter((e) => e.getClientRects().length).map((e) => { const r = (e.type === 'checkbox' ? e.closest('label') : e).getBoundingClientRect(); return { t: (e.textContent || e.id).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 44 || x.h < 44));
      c.check(small.length === 0, 'every control on Sign in is at least 44 by 44: ' + JSON.stringify(small));
      // Tab order: email, password, Show, then "Forgot password?".
      await page.focus('#kaEmail');
      const order = [];
      for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => { const a = document.activeElement; return a.id || a.className || a.tagName; })); }
      c.check(order[0] === 'kaPass' && /ka-reveal/.test(order[1]) && /ka-aside/.test(order[2]) && order[3] === 'kaShared', 'Tab goes email, password, Show, Forgot password?, shared computer: ' + order.join(' > '));
      const row = await page.evaluate(() => { const l = document.querySelector('label[for=kaPass]').getBoundingClientRect(), a = document.querySelector('.ka-aside').getBoundingClientRect(), i = document.getElementById('kaPass').getBoundingClientRect(); return { sameRow: Math.abs((l.top + l.bottom) / 2 - (a.top + a.bottom) / 2) < 8, right: a.right > l.right, above: a.bottom <= i.top + 12 }; });
      c.check(row.sameRow && row.right && row.above, '"Forgot password?" is still drawn on the label’s row, at the right: ' + JSON.stringify(row));
      // The busy button: full contrast, a spinner and changed words.
      server.offline = false;
      await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW);
      await page.evaluate(() => { kaBusy(true, 'Signing in…'); });
      const busy = await page.evaluate(() => { const e = document.getElementById('kaGo'); const cs = getComputedStyle(e); return { opacity: cs.opacity, cursor: cs.cursor, words: e.textContent, dis: e.getAttribute('aria-disabled') }; });
      c.check(busy.opacity === '1' && busy.cursor === 'progress' && busy.words === 'Signing in…' && busy.dis === 'true', 'busy: not dimmed, the progress cursor, and the words: ' + JSON.stringify(busy));
      await page.evaluate(() => { kaBusy(false); });
      // The welcome and the footer links.
      await page.click('#kaRoot .ka-brand');
      await waitView(page, 'welcome');
      c.check(!/#sign-in/.test(page.url()), 'the wordmark goes to the welcome and clears the screen’s name from the address: ' + page.url());
      const links = await page.evaluate(() => [...document.querySelectorAll('#kaRoot a')].map((a) => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim().slice(0, 12), w: Math.round(r.width), h: Math.round(r.height) }; }));
      c.check(links.length >= 4 && links.every((x) => x.w >= 44 && x.h >= 44), 'the welcome’s Help, Terms and Privacy links are 44 by 44 or more: ' + JSON.stringify(links));
      // The news switch on Account: 32px tall to look at, 44 to tap.
      await signedIn(page);
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.waitForSelector('#kaNewsBtn');
      const hit = await page.evaluate(() => { const b = document.getElementById('kaNewsBtn'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const at = (dy) => document.elementFromPoint(r.left + r.width / 2, dy) === b; return { h: Math.round(r.height), above: at(r.top - 5), below: at(r.bottom + 5), far: at(r.top - 9) }; });
      c.check(hit.h === 32 && hit.above && hit.below && !hit.far, 'the switch takes taps 6px above and below itself (44 in all), and no further: ' + JSON.stringify(hit));
    });
    await ctx.close();
  }
}

if (wanted('U2')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server } = await setup({ view: v });
    await rec.run(`U2-${v}`, 'The code field: a tap on a cell picks that cell, and the next digit replaces it', page, async (c) => {
      await open(page, '#create-account');
      await page.fill('#kaEmail', 'cells@example.com');
      await page.check('#kaTerms', { force: true });
      await page.press('#kaEmail', 'Enter');
      await waitView(page, 'signup2');
      await page.fill('#kaCode', '12345678');
      const active = () => page.evaluate(() => [...document.querySelectorAll('.ka-cell')].map((x, i) => (x.classList.contains('is-active') ? i : -1)).filter((i) => i >= 0));
      for (const i of [0, 1, 3, 4, 6, 7]) {
        const r = await page.evaluate((n) => { const b = document.querySelectorAll('.ka-cell')[n].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, i);
        await page.mouse.click(r.x, r.y);
        const a = await active();
        c.check(a.length === 1 && a[0] === i, `a click on cell ${i + 1} lights cell ${i + 1} only: ${JSON.stringify(a)}`);
      }
      // Fix the second digit: tap it, type the right one.
      const r2 = await page.evaluate(() => { const b = document.querySelectorAll('.ka-cell')[1].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
      await page.mouse.click(r2.x, r2.y);
      await page.keyboard.type('9');
      c.check((await page.inputValue('#kaCode')) === '19345678', 'the digit typed replaces the one tapped: ' + (await page.inputValue('#kaCode')));
      // Select all and type over still works, and lights every cell meanwhile.
      await page.focus('#kaCode');
      await page.keyboard.press('ControlOrMeta+a');
      await sleep(80);
      c.check((await active()).length === 8, 'select all lights all eight cells');
      await page.keyboard.type('5');
      c.check((await page.inputValue('#kaCode')) === '5' && JSON.stringify(await active()) === '[1]', 'typing over a selection starts again, with the caret in cell 2');
      // An empty field: a tap anywhere puts the caret in the first empty cell.
      await page.fill('#kaCode', '12');
      const r7 = await page.evaluate(() => { const b = document.querySelectorAll('.ka-cell')[6].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
      await page.mouse.click(r7.x, r7.y);
      c.check(JSON.stringify(await active()) === '[2]', 'a tap past the digits puts the caret in the next empty cell: ' + JSON.stringify(await active()));
      await c.shot(`u2-${v}-cells`);
    });
    await ctx.close();
  }
}

if (wanted('U3')) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, server } = await setup({ view: 'phone', scheme });
    await rec.run(`U3-${scheme}`, 'The Google button follows Google’s sign-in branding: their colours, spacing, wording and label font, with the "G" read from assets/', page, async (c) => {
      await open(page, '#sign-in');
      await page.waitForSelector('.ka-btn-google', { state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      const g = await page.evaluate(() => { const b = document.querySelector('.ka-btn-google'), img = b.querySelector('img'), cs = getComputedStyle(b); const br = b.getBoundingClientRect(), ir = img.getBoundingClientRect(), sr = b.querySelector('span').getBoundingClientRect(); return { words: b.textContent, bg: cs.backgroundColor, text: cs.color, edge: cs.boxShadow, font: cs.fontFamily.split(',')[0].replace(/["']/g, ''), weight: cs.fontWeight, size: cs.fontSize, line: cs.lineHeight, roboto: document.fonts.check('500 14px Roboto'), src: img.getAttribute('src'), alt: img.getAttribute('alt'), iw: Math.round(ir.width), ih: Math.round(ir.height), gap: Math.round(sr.left - ir.right), padL: parseFloat(cs.paddingLeft), padR: parseFloat(cs.paddingRight), h: Math.round(br.height), natural: img.naturalWidth > 0 }; });
      const want = scheme === 'light' ? { bg: 'rgb(255, 255, 255)', text: 'rgb(31, 31, 31)', edge: 'rgb(116, 119, 117)' } : { bg: 'rgb(19, 19, 20)', text: 'rgb(227, 227, 227)', edge: 'rgb(142, 145, 143)' };
      c.check(g.words === 'Continue with Google', 'Google’s approved wording: ' + g.words);
      c.check(g.bg === want.bg && g.text === want.text && g.edge.includes(want.edge) && /inset$| 1px inset|0px 0px 0px 1px/.test(g.edge), `Google’s ${scheme} colours (fill, label, 1px edge): ${g.bg} ${g.text} ${g.edge}`);
      c.check(g.font === 'Roboto' && g.weight === '500' && g.size === '14px' && g.line === '20px' && g.roboto, 'the label is Roboto Medium 14/20, self-hosted: ' + JSON.stringify({ font: g.font, weight: g.weight, size: g.size, line: g.line, loaded: g.roboto }));
      c.check(g.src === 'assets/google-g.svg' && g.alt === '' && g.natural && g.iw === 20 && g.ih === 20, 'the "G" is the file in assets/, 20px square, not distorted: ' + JSON.stringify({ src: g.src, w: g.iw, h: g.ih }));
      c.check(g.gap === 10 && g.padL >= 12 && g.padR >= 12, '10px between the "G" and the words, 12px or more at the sides: ' + JSON.stringify({ gap: g.gap, l: g.padL, r: g.padR }));
      c.check(g.h === 52, 'the same 52px height as the other buttons');
      c.check(await page.evaluate(() => [...document.styleSheets].every((s) => { try { return [...s.cssRules].filter((r) => r.type === 5 && /Roboto/.test(r.cssText)).every((r) => /assets\/fonts\/Roboto_500Medium_latin\.woff2/.test(r.cssText)); } catch (e) { return true; } })), 'Roboto comes from assets/fonts only');
      // Google's font is for Google's button only (Grove's two fonts everywhere else), and its licence travels with it.
      const uses = (html.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]*\{[^{}]*Roboto[^{}]*\}/g) || []).map((r) => r.split('{')[0].trim());
      c.check(uses.length === 2 && uses.includes('@font-face') && uses.includes('.ka-btn-google'), 'only the Google button uses Roboto: ' + JSON.stringify(uses));
      c.check(/SIL OPEN FONT LICENSE Version 1\.1/.test(fs.readFileSync(path.join(repo, 'assets/fonts/OFL-Roboto.txt'), 'utf8')) && /Roboto Project Authors/.test(fs.readFileSync(path.join(repo, 'assets/fonts/OFL-Roboto.txt'), 'utf8')), 'the font’s licence is beside it (assets/fonts/OFL-Roboto.txt)');
      await axe(page, c, `Sign in with the Google button (${scheme})`);
      await c.shot(`u3-${scheme}-google`);
      // Create account: "Sign up with Google", the same button.
      await page.evaluate(() => kaGo('create-account'));
      await waitView(page, 'signup1');
      c.check((await text(page, '.ka-btn-google')) === 'Sign up with Google' && await page.isVisible('.ka-btn-google'), 'Create account: Sign up with Google');
    });
    await ctx.close();
  }
  // A Google-only account deleting itself: the re-check sheet uses Google's button too.
  {
    const { ctx, page, server } = await setup({ view: 'phone' });
    await rec.run('U3-recheck', 'Delete account for a Google sign-in that is not fresh: the "Confirm it’s you" sheet shows Google’s own button, not the green one', page, async (c) => {
      await open(page, '#sign-in');
      await page.waitForSelector('.ka-btn-google', { state: 'visible' });
      const [req] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('.ka-btn-google')]);
      const code = server.googleCode(new URL(req.url()).searchParams.get('code_challenge'), 'gil@gmail.com');
      await page.goto(`${APP}?code=${code}`);
      await waitView(page, 'consent');
      await page.check('#kaTerms', { force: true });
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      // Ten minutes later the sign-in is no longer fresh.
      await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 11 * 60000; });
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.click('#kaDel');
      await page.waitForSelector('#flagModal [role=dialog]');
      const sheet = await page.evaluate(() => { const b = document.querySelector('#flagModal #kaGo'); return { title: document.getElementById('kaDlgH').textContent, google: b.classList.contains('ka-btn-google'), primary: b.classList.contains('ka-btn-primary'), words: b.textContent, img: !!b.querySelector('img[src="assets/google-g.svg"]'), bg: getComputedStyle(b).backgroundColor, shown: b.getClientRects().length > 0 }; });
      c.check(sheet.title === 'Confirm it’s you' && sheet.google && !sheet.primary && sheet.words === 'Continue with Google' && sheet.img && sheet.bg === 'rgb(255, 255, 255)' && sheet.shown, 'the sheet’s action is Google’s button: ' + JSON.stringify(sheet));
      await axe(page, c, 'the Google re-check sheet');
      await c.shot('u3-recheck');
      const [again] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('#flagModal #kaGo')]);
      await page.goto(APP);
      await page.waitForFunction(() => document.body.hasAttribute('data-section'));
      c.check(!!again && (await store(page)).session.kaisip_acct_intent_v1 === 'delete', 'it goes to Google and remembers to come back to the delete step');
    });
    await ctx.close();
  }
}

if (wanted('U4')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server, net } = await setup({ view: v, googleG: 'missing' });
    await makeAccount(server);
    await rec.run(`U4-${v}`, 'Google’s "G" file is not in assets/ (the repo today): Google sign-in is not offered anywhere, and everything else works', page, async (c) => {
      await open(page);
      await waitView(page, 'welcome');
      await sleep(500);
      c.check(!/Google/.test(await page.evaluate(() => document.getElementById('kaRoot').innerText)) && /With your email and a password\./.test(await text(page, '.ka-path-primary')), 'the welcome does not mention Google: ' + (await text(page, '.ka-path-primary')));
      await open(page, '#sign-in');
      await sleep(300);
      const s1 = await page.evaluate(() => ({ btn: [...document.querySelectorAll('.ka-btn-google')].filter((b) => b.getClientRects().length).length, divider: [...document.querySelectorAll('.ka-divider')].filter((b) => b.getClientRects().length).length, words: document.getElementById('kaRoot').innerText }));
      c.check(s1.btn === 0 && s1.divider === 0 && !/Google|or sign in with email/i.test(s1.words), 'Sign in: no Google button, no "or" divider, no mention of Google: ' + JSON.stringify({ btn: s1.btn, divider: s1.divider }));
      c.check(net.googleAsked >= 1, 'the page looked for the file (' + net.googleAsked + ' requests)');
      const gap = await page.evaluate(() => { const l = document.querySelector('.ka-lede').getBoundingClientRect(), f = document.getElementById('kaForm').getBoundingClientRect(); return Math.round(f.top - l.bottom); });
      c.check(gap >= 16 && gap <= 40, 'the form sits under the lede with its usual space (' + gap + 'px)');
      await axe(page, c, `Sign in without Google (${v})`);
      await noOverflow(page, c, `Sign in without Google (${v})`);
      await c.shot(`u4-${v}-signin`);
      await page.evaluate(() => { try { kaGoogle(false); } catch (e) {} });
      await sleep(200);
      c.check(!(await store(page)).session.kaisip_pkce_v1 && calls(server, '/auth/v1/authorize').length === 0, 'the Google step cannot be started by hand either');
      await page.evaluate(() => kaGo('create-account'));
      await waitView(page, 'signup1');
      const s2 = await page.evaluate(() => ({ btn: [...document.querySelectorAll('.ka-btn-google')].filter((b) => b.getClientRects().length).length, words: document.getElementById('kaRoot').innerText }));
      c.check(s2.btn === 0 && !/Sign up with Google|applies to Google/i.test(s2.words), 'Create account: no Google button and no line about it');
      await c.shot(`u4-${v}-create`);
      // Email and password still sign in.
      await page.evaluate(() => kaGo('sign-in'));
      await waitView(page, 'signin');
      await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW); await page.press('#kaPass', 'Enter');
      await waitView(page, '');
      c.check(await appShown(page), 'signed in with email and password');
    }, { allowErrors: true });
    await ctx.close();
  }
}

// ── U5. The checklist's longer labels on a narrow phone ──
if (wanted('U5')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await rec.run('U5', 'The password checklist at 320px: a label wraps to two lines at most, its example stays in one piece, and "Met" / "Not yet" stays beside the first line', page, async (c) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await open(page, '#create-account');
    await page.fill('#kaEmail', 'narrow@example.com');
    await page.check('#kaTerms', { force: true });
    await page.press('#kaEmail', 'Enter');
    await waitView(page, 'signup2');
    await page.fill('#kaCode', server.codes.get('narrow@example.com'));
    await page.press('#kaCode', 'Enter');
    await waitView(page, 'signup3');
    await page.waitForFunction(() => window.KaiSipCloud && window.KaiSipCloud.passwordRules.passwordWordsLoaded(), null, { timeout: 15000 });
    const measure = () => page.evaluate(() => [...document.querySelectorAll('#kaPwHelp .ka-pw-list li')].map((li) => {
      const l = li.querySelector('.ka-pw-l'), s = li.querySelector('.ka-pw-s');
      const lh = parseFloat(getComputedStyle(l).lineHeight);
      const lines = Math.round(l.getBoundingClientRect().height / lh);
      // The last line of a wrapped label (its example) must not be a lone fragment like "z)".
      const range = document.createRange(); range.selectNodeContents(l);
      const rects = [...range.getClientRects()];
      const lastTop = Math.max(...rects.map((r) => r.top));
      const lastWidth = rects.filter((r) => Math.abs(r.top - lastTop) < 2).reduce((w, r) => w + r.width, 0);
      const sr = s.getBoundingClientRect(), lr = l.getBoundingClientRect();
      return { label: l.textContent.replace(/ /g, ' '), lines, lastWidth: Math.round(lastWidth), statusLines: Math.round(sr.height / parseFloat(getComputedStyle(s).lineHeight)), statusTop: Math.round(sr.top - lr.top), overlap: sr.left < lr.right - 1, right: Math.round(sr.right) };
    }));
    for (const pw of ['', 'Tidal lamp 7!']) {
      await fillPw(page, pw);
      const rows = await measure();
      c.check(rows.every((r) => r.lines <= 2), `every label is one or two lines (${pw ? 'all met' : 'none met'}): ` + JSON.stringify(rows.map((r) => [r.label, r.lines])));
      c.check(rows.every((r) => r.lines === 1 || r.lastWidth >= 48), 'a wrapped label ends with its whole example, not a stray piece: ' + JSON.stringify(rows.filter((r) => r.lines > 1).map((r) => [r.label, r.lastWidth])));
      c.check(rows.every((r) => r.statusLines === 1 && !r.overlap && r.right <= 320), '"Met" / "Not yet" is one line, beside the label, inside the screen: ' + JSON.stringify(rows.map((r) => [r.statusLines, r.overlap, r.right])));
      await noOverflow(page, c, 'the checklist at 320px');
    }
    await c.shot('u5-checklist-320', page, true);
    await fillPw(page, '');
    await c.shot('u5-checklist-320-empty', page, true);
    // Text at 200% on the same phone: still no sideways scroll, nothing cut off.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await sleep(150);
    await noOverflow(page, c, 'the checklist at 320px with text at 200%');
    const big = await measure();
    c.check(big.every((r) => r.right <= 320 && r.statusTop > 0), 'at 200% "Met" / "Not yet" goes under its label, inside the screen: ' + JSON.stringify(big.map((r) => [r.lines, r.statusTop, r.right])));
    await c.shot('u5-checklist-320-200', page, true);
  });
  await ctx.close();
}

// ── G6, G7. A brand-new account agrees before the app opens; the first-visit sheet runs once for a new learner ──
if (wanted('G6')) {
  const mine = freeIds(5, 2);
  const { ctx, page, server, net } = await setup({ view: 'phone', seed: profileSeed(mine) });
  await ctx.addInitScript(WATCH_APP);
  const tab2 = await ctx.newPage();
  rec.watch(tab2, SITE);
  await rec.run('G6', 'A brand-new account that came in through Google must agree before studying: no way round "One more step", across reloads, addresses and tabs; Sign out leaves; Agree opens the app', page, async (c) => {
    const viaGoogle = async (email) => {
      await open(page, '#sign-in');
      await page.waitForSelector('.ka-btn-google', { state: 'visible' });
      const [req] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('.ka-btn-google')]);
      await page.goto(`${APP}?code=${server.googleCode(new URL(req.url()).searchParams.get('code_challenge'), email)}`);
      await waitView(page, 'consent');
    };
    await viaGoogle('nia@gmail.com');
    const before = await answerKeys(page);
    c.check((await store(page)).local.kaisip_acct_agree_v1 === '1' && !!(await store(page)).local.kaisip_auth_v1, 'signed in, with the agreement still due');
    c.check(/You.re almost in\. To finish creating your account, please agree to the terms\./.test(await text(page, '.ka-lede')), 'the screen says what is left: ' + (await text(page, '.ka-lede')));
    c.check(!/Back to studying/.test(await text(page, '#kaRoot')) && !(await page.evaluate(() => document.querySelector('#kaRoot a.ka-brand'))), 'no "Back to studying", and the wordmark is not a way out');
    c.check(!(await page.evaluate(() => window.__appSeen)), 'the study app has not been on screen');
    // Every door: a reload, each study address, the account addresses, the app's own functions, Escape.
    for (const h of ['', '#today', '#practice', '#notes', '#account', '#sign-in', '#create-account']) {
      await page.goto('about:blank');
      await open(page, h);
      await waitView(page, 'consent');
      c.check(!(await page.evaluate(() => window.__appSeen)) && !(await appShown(page)), `${h || 'a reload'}: still "One more step", no flash`);
    }
    await page.evaluate(() => { try { navTo(null, 'practice'); } catch (e) {} try { kaGoApp('home'); } catch (e) {} try { kaLand(); } catch (e) {} try { kaClose(); } catch (e) {} try { kaHome(); } catch (e) {} });
    await page.keyboard.press('Escape');
    await sleep(200);
    c.check(['consent', 'welcome'].includes(await view(page)) && !(await appShown(page)), 'called by hand, nothing opens the app: ' + (await view(page)));
    await page.goto('about:blank'); await open(page); await waitView(page, 'consent');
    c.check(calls(server, '/rest/v1/sync_snapshots').length === 0 && consentWrites(server).length === 0, 'nothing is synced or recorded meanwhile');
    c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before), 'progress already in this browser is untouched');
    await axe(page, c, 'One more step, a new account');
    await noOverflow(page, c, 'One more step, a new account');
    await c.shot('g6-one-more-step');
    // The sign-in service cannot be reached: still the agreement (it can't be checked), and Sign out still works.
    net.supaMode = '503';
    await page.goto('about:blank'); await open(page); await waitView(page, 'consent');
    c.check(!(await appShown(page)), 'service away: still "One more step"');
    net.supaMode = '';
    // Sign out instead: back at the way in, and the note is gone.
    await page.click('#kaRoot .ka-linkbtn');
    await waitView(page, 'signin');
    c.check(!(await store(page)).local.kaisip_acct_agree_v1 && !(await store(page)).local.kaisip_auth_v1 && !(await appShown(page)), 'Sign out instead: signed out, nothing due, the app still closed');
    c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before), 'and the progress in this browser stays');
    // Again, with a second tab open on the same screen: agreeing in one opens both.
    await viaGoogle('nia@gmail.com');
    await open(tab2);
    await waitView(tab2, 'consent');
    await page.bringToFront();
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await waitView(page, 'firstsync');   // this browser has progress: it is offered into the new account
    c.check(!(await store(page)).local.kaisip_acct_agree_v1 && server.profiles.get(server.userByEmail('nia@gmail.com').id) === '2026-12', 'agreed: recorded, and nothing is due any more');
    await tab2.waitForFunction(() => !document.body.hasAttribute('data-ka-view'), null, { timeout: 8000 });
    c.check(await appShown(tab2), 'the other tab opens too');
    await page.click('#kaGo');
    await waitView(page, '');
    await settled(page);
    c.check(await appShown(page) && !(await page.evaluate(() => document.querySelector('.ob-welcome'))), 'in the app; a learner with progress gets no first-visit sheet');
    // Agreed on another device meanwhile: a browser still holding the note lets the learner in.
    await page.evaluate(() => localStorage.setItem('kaisip_acct_agree_v1', '1'));
    await page.goto('about:blank'); await open(page);
    await page.waitForFunction(() => !document.body.hasAttribute('data-ka-view'), null, { timeout: 8000 });
    c.check(await appShown(page) && !(await store(page)).local.kaisip_acct_agree_v1, 'the record says agreed: straight in, and the note is cleared');
  }, { allowErrors: true });
  await ctx.close();
}

if (wanted('G7')) {
  const sheet = (page) => page.evaluate(() => { const e = document.querySelector('.ob-welcome'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const create = async (page, server, email) => {
    await open(page, '#create-account');
    await page.fill('#kaEmail', email);
    await page.check('#kaTerms', { force: true });
    await page.press('#kaEmail', 'Enter');
    await waitView(page, 'signup2');
    await page.fill('#kaCode', server.codes.get(email));
    await page.press('#kaCode', 'Enter');
    await waitView(page, 'signup3');
    await fillPw(page, PW2);
    await page.press('#kaPw', 'Enter');
  };
  {
    const { ctx, page, server } = await setup({ view: 'phone', onboarded: false });
    await rec.run('G7-new', 'A new account with nothing answered gets the app’s first-visit sheet once, after its first sign-in', page, async (c) => {
      await open(page);
      await waitView(page, 'welcome');
      c.check((await sheet(page)) === '', 'no sheet over the welcome');
      await create(page, server, 'fresh@example.com');
      await waitView(page, '');
      await page.waitForSelector('.ob-welcome', { timeout: 8000 });
      const words = await sheet(page);
      c.check(/Think like an IS auditor\./.test(words) && /Start 5 questions/.test(words) && /Look around first/.test(words), 'the sheet, as on today’s site: ' + words.slice(0, 200));
      c.check(/Your account keeps your progress safe and in sync\./.test(words) && !/No account\./.test(words), 'its last line fits a signed-in learner (not "No account")');
      c.check((await page.evaluate(() => document.body.getAttribute('data-tab'))) === 'home', 'over Today');
      await axe(page, c, 'the first-visit sheet after sign-up');
      await c.shot('g7-first-sheet');
      // Not finished, and the page is reloaded: it comes back (once), then "Look around first" ends it.
      await page.goto('about:blank');
      await open(page);
      await page.waitForSelector('.ob-welcome', { timeout: 8000 });
      c.check(await page.evaluate(() => document.querySelectorAll('.ob-welcome').length === 1), 'after a reload it shows again, once');
      await page.click('.ob-ghost');
      await sleep(300);
      c.check((await sheet(page)) === '' && (await store(page)).local.cisa_onboarded_v6 === '1' && await appShown(page), '"Look around first" closes it for good');
      await page.goto('about:blank');
      await open(page);
      await sleep(1200);
      c.check((await sheet(page)) === '', 'the next visit: no sheet');
    });
    await ctx.close();
  }
  {
    const { ctx, page, server } = await setup({ view: 'desktop', onboarded: false });
    await rec.run('G7-start', '"Start 5 questions" from the sheet opens the first set for the new account', page, async (c) => {
      await create(page, server, 'five@example.com');
      await waitView(page, '');
      await page.waitForSelector('.ob-welcome', { timeout: 8000 });
      await page.click('#obGo');
      await page.waitForFunction(() => { const pf = document.getElementById('practiceFocus'); return pf && !pf.hidden; }, null, { timeout: 8000 });
      c.check((await page.evaluate(() => S.activeTab)) === 'practice' && (await store(page)).local.cisa_onboarded_v6 === '1', 'the first five questions open, and the sheet is done');
    });
    await ctx.close();
  }
  {
    // Progress on the device (from before accounts): no sheet.
    const { ctx, page, server } = await setup({ view: 'phone', onboarded: false, seed: profileSeed(freeIds(1, 2)) });
    await rec.run('G7-device-progress', 'A learner with progress in this browser gets no first-visit sheet', page, async (c) => {
      await create(page, server, 'had@example.com');
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
      await sleep(900);
      c.check((await sheet(page)) === '' && (await store(page)).local.cisa_onboarded_v6 === '1', 'no sheet, and it is marked as done');
    });
    await ctx.close();
  }
  {
    // Progress in the account (a learner from the phone, on a browser that has none): no sheet.
    const server = new F.FakeSupabase(() => Date.now());
    server.captchaOn = true;
    await makeAccount(server);
    const first = await setup({ view: 'phone', server, seed: profileSeed(freeIds(3, 4)) });
    await signIn(first.page); await waitView(first.page, 'firstsync'); await first.page.click('#kaGo'); await waitView(first.page, ''); await settled(first.page);
    await first.ctx.close();
    const { ctx, page } = await setup({ view: 'phone', server, onboarded: false });
    await rec.run('G7-account-progress', 'A learner whose account already has progress gets no first-visit sheet on a new browser', page, async (c) => {
      await signIn(page);
      await waitView(page, '');
      await settled(page);
      await sleep(900);
      c.check((await answerKeys(page)).ids.length === 4, 'the account’s progress is here');
      c.check((await sheet(page)) === '' && (await store(page)).local.cisa_onboarded_v6 === '1', 'no sheet, and it is marked as done');
      await page.goto('about:blank');
      await open(page);
      await sleep(1200);
      c.check((await sheet(page)) === '', 'nor at the next visit');
    });
    await ctx.close();
  }
  {
    // A learner who asked for a page gets that page first; the sheet waits for a plain visit.
    const { ctx, page, server } = await setup({ view: 'phone', onboarded: false });
    await rec.run('G7-deep-link', 'A new account that asked for a page gets the page; the sheet comes at the next plain visit', page, async (c) => {
      await open(page, '#glossary');
      await waitView(page, 'welcome');
      await create(page, server, 'link@example.com');
      await waitView(page, '');
      await page.waitForFunction(() => S.activeTab === 'glossary', null, { timeout: 8000 }).catch(() => {});
      await sleep(900);
      c.check((await page.evaluate(() => S.activeTab)) === 'glossary' && (await sheet(page)) === '', 'the Glossary opens, with no sheet over it');
      await page.goto('about:blank');
      await open(page);
      await page.waitForSelector('.ob-welcome', { timeout: 8000 }).catch(() => {});
      c.check(/Start 5 questions/.test(await sheet(page)), 'the next plain visit shows the sheet');
    });
    await ctx.close();
  }
}

// ── S. The security review of 7e7b894: one path per finding ──
const toStep3 = async (page, server, email) => {
  await open(page, '#create-account');
  await page.fill('#kaEmail', email);
  await page.check('#kaTerms', { force: true });
  await page.press('#kaEmail', 'Enter');
  await waitView(page, 'signup2');
  await page.fill('#kaCode', server.codes.get(email));
  await page.press('#kaCode', 'Enter');
  await waitView(page, 'signup3');
};
const viaGoogleTo = async (page, server, email, name, want) => {
  await open(page, '#sign-in');
  await page.waitForSelector('.ka-btn-google', { state: 'visible' });
  const [req] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('.ka-btn-google')]);
  await page.goto(`${APP}?code=${server.googleCode(new URL(req.url()).searchParams.get('code_challenge'), email, name)}`);
  if (want !== undefined) await waitView(page, want);
};
if (wanted('S1')) {
  for (const kind of ['new', 'existing']) {
    const { ctx, page, server } = await setup({ view: kind === 'new' ? 'phone' : 'desktop' });
    await ctx.addInitScript(WATCH_APP);
    const MAIL = kind === 'new' ? 'code.only@example.com' : EMAIL;
    if (kind === 'existing') await makeAccount(server);
    await rec.run(`S1-B1-${kind}`, `B1: a code-only session (${kind === 'new' ? 'a new address' : 'an address that already has an account'}) is not through the gate: every address and door keeps "Create a password", and nothing is exported, deleted or changed`, page, async (c) => {
      await toStep3(page, server, MAIL);
      c.check(await page.evaluate(() => ka.cloud.auth.passwordNeeded() === true && kaGateOk() === false), 'after the code: a session that needs a password, and it is not through the gate');
      server.calls.length = 0;
      for (const h of ['#today', '#practice', '#notes', '#account', '#delete-account', '#sign-in', '#create-account']) {
        await page.evaluate((x) => { location.hash = x; }, h);
        await sleep(150);
        c.check((await view(page)) === 'signup3' && !(await appShown(page)), `${h}: still "Create a password" (${await view(page)})`);
      }
      await page.evaluate(() => { for (const f of [() => navTo(null, 'practice'), () => kaGoApp('account'), () => kaLand(), () => kaClose(), () => kaHome(), () => kaOpenDelete(), () => kaDeleteDialog(), () => kaDownload(), () => kaNewsToggle(), () => kaRenderAccount()]) { try { f(); } catch (e) {} } });
      await sleep(400);
      c.check((await view(page)) === 'signup3' && !(await appShown(page)) && !(await page.evaluate(() => document.querySelector('#flagModal [role=dialog]'))), 'called by hand, nothing opens the app, the Account page or the delete sheet');
      const direct = await page.evaluate(async () => { const out = []; for (const f of [() => ka.cloud.auth.callFunction('export-my-data', {}), () => ka.cloud.auth.callFunction('delete-account', { confirm: 'DELETE' }), () => ka.cloud.auth.setNews(true, { wording: '2026-12', source: 'web' }), () => ka.cloud.auth.consent()]) { try { await f(); out.push('ok'); } catch (e) { out.push(e.code + ':' + e.detail); } } return out; });
      c.check(direct.every((x) => x === 'invalid:password_needed'), 'the accounts client refuses every other call for it: ' + direct.join(', '));
      const sent = server.calls.filter((x) => x.path.startsWith('/functions/v1/') || x.path.startsWith('/rest/v1/')).map((x) => x.method + ' ' + x.path.split('?')[0]);
      c.check(sent.length === 0, 'no call to a function or to the consent record was made: ' + sent.join(', '));
      // A reload: straight back to the password step, with no flash of the app.
      await page.goto('about:blank');
      await open(page, '#account');
      await waitView(page, 'signup3');
      c.check(!(await page.evaluate(() => window.__appSeen)), 'a reload at #account: "Create a password", and the app never showed');
      if (kind === 'existing') c.check(!!server.userByEmail(EMAIL) && server.userByEmail(EMAIL).password === PW, 'the existing account is untouched: still there, same password');
      await axe(page, c, `Create a password, code session (${kind})`);
      // The one other way on: sign out.
      await page.click('#kaRoot .ka-linkbtn');
      await waitView(page, 'signin');
      c.check(!(await store(page)).local.kaisip_auth_v1 && !(await appShown(page)), '"Sign out instead" ends it; the app is still closed');
    });
    await ctx.close();
  }
}

if (wanted('S2')) {
  const { ctx, page, server, net } = await setup({ view: 'phone' });
  await ctx.addInitScript(WATCH_APP);
  await rec.run('S2-S1', 'S1: a brand-new Google account whose agreement cannot be read: three tries, then the agreement screen with a line saying why; never the app', page, async (c) => {
    net.profilesDown = true;
    await viaGoogleTo(page, server, 'outage@gmail.com', undefined, 'consent');
    c.check(net.profilesAsked === 3, 'the record was asked for three times: ' + net.profilesAsked);
    c.check(/You.re offline|couldn.t reach your account just now/i.test(await text(page, '#kaNotice')), 'the screen says why: ' + (await text(page, '#kaNotice')));
    c.check((await store(page)).local.kaisip_acct_agree_v1 === '1' && !(await appShown(page)) && !(await page.evaluate(() => window.__appSeen)), 'the agreement is due, and the app never showed');
    c.check(!/Back to studying/.test(await text(page, '#kaRoot')), 'no way round');
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await page.waitForFunction(() => (document.getElementById('kaFormE') || {}).textContent, null, { timeout: 8000 });
    c.check((await view(page)) === 'consent' && !(await appShown(page)), 'Agree while it is still away: an error in words, still on the screen: ' + (await text(page, '#kaFormE')));
    await page.goto('about:blank'); await open(page); await waitView(page, 'consent');
    c.check(!(await page.evaluate(() => window.__appSeen)), 'a reload keeps the agreement screen');
    net.profilesDown = false;
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await waitView(page, '');
    c.check(await appShown(page) && server.profiles.get(server.userByEmail('outage@gmail.com').id) === '2026-12' && !(await store(page)).local.kaisip_acct_agree_v1, 'back up: Agree records it and opens the app');
  }, { allowErrors: true });
  await ctx.close();
  // A learner whose browser has synced as this account keeps studying through the same outage.
  const k = await setup({ view: 'phone', seed: profileSeed(freeIds(1, 2)) });
  await makeAccount(k.server);
  await rec.run('S2-S1-known', 'S1: the same outage for a learner this browser has synced with: they keep studying (never locked out)', k.page, async (c) => {
    await signIn(k.page); await waitView(k.page, 'firstsync'); await k.page.click('#kaGo'); await waitView(k.page, ''); await settled(k.page);
    await k.page.evaluate(() => navGoFocus(null, 'account'));
    await k.page.click('#kaOut'); await k.page.click('#flagModal #kaGo');
    await waitView(k.page, 'signin');
    k.net.profilesDown = true;
    await k.page.fill('#kaEmail', EMAIL); await k.page.fill('#kaPass', PW); await k.page.press('#kaPass', 'Enter');
    await waitView(k.page, '');
    c.check(await appShown(k.page) && !(await store(k.page)).local.kaisip_acct_agree_v1 && k.net.profilesAsked === 3, 'in the app, nothing due, after three tries');
    c.check((await answerKeys(k.page)).ids.length === 2, 'with their progress');
  }, { allowErrors: true });
  await k.ctx.close();
}

if (wanted('S3')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await rec.run('S3-S2', 'S2: an agreement ticked on an abandoned Create account form is never applied to another account, or after 30 minutes', page, async (c) => {
    // Ticked (news too) for one address, then abandoned at the code step.
    await open(page, '#create-account');
    await page.fill('#kaEmail', 'left.behind@example.com');
    for (const id of ['#kaTerms', '#kaNews']) await page.check(id, { force: true });
    await page.press('#kaEmail', 'Enter');
    await waitView(page, 'signup2');
    c.check(!!(await store(page)).session.kaisip_signup_pending_v1, 'the ticked agreement waits in this tab');
    // A brand-new account arrives by plain "Continue with Google" in the same tab.
    await viaGoogleTo(page, server, 'someone.else@gmail.com', undefined, 'consent');
    c.check(consentWrites(server).length === 0 && !(await store(page)).session.kaisip_signup_pending_v1, 'it is NOT given the other form’s agreement: nothing is recorded, the screen asks, and the carried agreement is gone');
    c.check(await page.evaluate(() => document.getElementById('kaTerms').checked === false && document.getElementById('kaNews').checked === false), 'both boxes are unticked');
    await page.click('#kaRoot .ka-linkbtn');
    await waitView(page, 'signin');
    // The right address, but 31 minutes later: asked again instead of applied.
    await page.goto('about:blank');
    await toStep3(page, server, 'slow@example.com');
    await page.evaluate(() => { const p = JSON.parse(sessionStorage.getItem('kaisip_signup_pending_v1')); p.at = Date.now() - 31 * 60000; sessionStorage.setItem('kaisip_signup_pending_v1', JSON.stringify(p)); });
    await fillPw(page, PW2);
    await page.press('#kaPw', 'Enter');
    await waitView(page, 'consent');
    c.check(consentWrites(server).length === 0 && !(await store(page)).session.kaisip_signup_pending_v1, 'a stale agreement is dropped, and the learner is asked');
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await waitView(page, '');
    c.check(consentWrites(server).length === 1 && consentWrites(server)[0].marketing_opt_in === undefined, 'agreeing now records what is ticked now');
  });
  await ctx.close();
}

if (wanted('S4')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await makeAccount(server);
  await rec.run('S4-S3', 'S3: Create account on an address that already has an account says so after the password is saved; this page sends one sign-up code a minute', page, async (c) => {
    await toStep3(page, server, EMAIL);
    await fillPw(page, PW2);
    await page.press('#kaPw', 'Enter');
    await waitView(page, '');
    await page.waitForFunction(() => /already had a KaiSip account/.test(document.getElementById('globalToast').textContent), null, { timeout: 6000 }).catch(() => {});
    c.check(/This email already had a KaiSip account\. You.re signed in and your password is saved\./.test(await toast(page)), 'the notice: ' + (await toast(page)));
    c.check(server.userByEmail(EMAIL).password === PW2 && await appShown(page), 'the new password is the account’s, and the learner is in');
    c.check(consentWrites(server).length === 0, 'the agreement already on record is left as it is');
    // One code a minute from this page, whatever the address.
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.click('#kaOut'); await page.click('#flagModal #kaGo');
    await waitView(page, 'signin');
    await page.evaluate(() => kaGo('create-account'));
    await waitView(page, 'signup1');
    const before = calls(server, '/auth/v1/otp').length;
    await page.fill('#kaEmail', 'second@example.com');
    await page.check('#kaTerms', { force: true });
    await page.press('#kaEmail', 'Enter');
    await page.waitForFunction(() => (document.getElementById('kaFormE') || {}).textContent || (document.getElementById('kaEmailE') || {}).textContent, null, { timeout: 8000 });
    const words = (await text(page, '#kaFormE')) + (await text(page, '#kaEmailE'));
    c.check(calls(server, '/auth/v1/otp').length === before && /wait|moment|second|minute/i.test(words) && (await view(page)) === 'signup1', 'a second code within the minute is not asked for, in calm words: ' + words);
  });
  await ctx.close();
}

if (wanted('S5')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await makeAccount(server);
  await rec.run('S5-S4-N2', 'S4 and N2: a link with ?error= or ?code= does not put a sign-in form in front of a signed-in learner; tokens in the address are removed at once, accounts on or off', page, async (c) => {
    await signedIn(page);
    const session = (await store(page)).local.kaisip_auth_v1;
    for (const q of ['?error=access_denied&error_description=x', '?code=planted-code-123456', '#error=server_error']) {
      await page.goto('about:blank');
      await open(page, '', APP + q);
      await sleep(500);
      c.check((await view(page)) === '' && await appShown(page), `${q}: the learner stays in the app (${await view(page) || 'app'})`);
      c.check(!/error=|code=/.test(page.url()), 'and the words are taken out of the address: ' + page.url());
    }
    c.check((await store(page)).local.kaisip_auth_v1 === session && calls(server, '/auth/v1/token').filter((x) => /grant_type=pkce/.test(x.path)).length === 0, 'the sign-in is untouched and the planted code was never sent anywhere');
    // Tokens in the fragment: gone before anything can read them.
    await page.goto('about:blank');
    await open(page, '#access_token=aaa.bbb.ccc&refresh_token=rrr&provider_token=ppp');
    c.check(!/access_token|refresh_token|provider_token/.test(page.url()), 'accounts on: tokens in the address are removed: ' + page.url());
  });
  await ctx.close();
  const off = await setup({ view: 'phone', preview: false });
  await off.ctx.addInitScript(() => { window.__firstHash = location.hash; });
  await rec.run('S5-N2-off', 'N2: with accounts off, tokens in the address are still removed at once', off.page, async (c) => {
    await open(off.page, '#access_token=aaa.bbb.ccc&refresh_token=rrr');
    c.check(!/access_token|refresh_token/.test(off.page.url()) && await off.page.evaluate(() => /access_token/.test(window.__firstHash)), 'removed by the page’s first script: ' + off.page.url());
    await off.page.goto('about:blank');
    await open(off.page, '#practice');
    c.check(/#practice/.test(off.page.url()), 'an ordinary address is left alone');
  });
  await off.ctx.close();
}

if (wanted('S6')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await rec.run('S6-injection', 'Markup in a Google name, a typed email or the stored hint is shown as text, never run', page, async (c) => {
    const EVIL = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
    await viaGoogleTo(page, server, 'gina.x@gmail.com', EVIL, 'consent');
    await page.check('#kaTerms', { force: true });
    await page.click('#kaGo');
    await waitView(page, '');
    await settled(page);
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.waitForSelector('#kaHero .ka-who');
    await goYou(page);
    c.check((await page.evaluate(() => window.__xss)) === undefined && !(await page.evaluate(() => document.querySelector('#kaCard img, #kaHero img, #kaRail img'))), 'a Google name full of markup runs nothing and draws nothing');
    // The stored hint (this browser's own storage, which another script or a person could edit).
    await page.evaluate((evil) => { localStorage.setItem('kaisip_acct_hint_v1', JSON.stringify({ email: evil, full: '"><img src=x onerror="window.__xss=3">' })); const s = JSON.parse(localStorage.getItem('kaisip_auth_v1')); s.signedInAt = Date.now() - 31 * 86400000; localStorage.setItem('kaisip_auth_v1', JSON.stringify(s)); }, EVIL);
    await page.goto('about:blank'); await open(page); await waitView(page, 'signin');
    c.check((await page.inputValue('#kaEmail')) === '"><img src=x onerror="window.__xss=3">' && (await page.evaluate(() => window.__xss)) === undefined && !(await page.evaluate(() => document.querySelector('#kaRoot img:not([data-g])'))), 'a tampered hint lands in the email field as plain text');
    // A typed email with markup: refused as not an address, shown nowhere as HTML.
    await page.evaluate(() => kaGo('create-account'));
    await waitView(page, 'signup1');
    await page.fill('#kaEmail', '<img src=x onerror="window.__xss=4">@example.com');
    await page.check('#kaTerms', { force: true });
    await page.press('#kaEmail', 'Enter');
    await sleep(400);
    c.check((await view(page)) === 'signup1' && (await page.evaluate(() => window.__xss)) === undefined && calls(server, '/auth/v1/otp').length === 0, 'markup typed as an email is refused and never run');
    // The account block itself carries no inline handler (they need 'unsafe-inline' in the script policy).
    const a = html.indexOf('// ── ACCOUNTS (web sign-in'), z = html.indexOf('// ── ACCOUNTS END ──');
    const inline = (html.slice(a, z).match(/[\s'"]on[a-z]+\s*=\s*\\?["']/g) || []);
    c.check(a > 0 && z > a && inline.length === 0, 'no inline on...= handler in the account block: ' + inline.slice(0, 5).join(' '));
  });
  await ctx.close();
}

// ── X. UX review 2 ──
if (wanted('X1')) {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, server } = await setup({ view: 'phone', scheme });
    await makeAccount(server);
    await rec.run(`X1-forced-${scheme}`, 'Forced colours (Windows high contrast): an unticked box draws no tick, and buttons, fields and the switch keep an edge', page, async (c) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await open(page, '#create-account');
      const boxes = () => page.evaluate(() => ['kaTerms', 'kaNews'].map((id) => { const i = document.getElementById(id), b = i.nextElementSibling, cs = getComputedStyle(b); return { id, checked: i.checked, tick: getComputedStyle(b.querySelector('svg')).visibility, edge: cs.borderTopWidth + ' ' + cs.borderTopStyle }; }));
      let b = await boxes();
      c.check(b.every((x) => !x.checked && x.tick === 'hidden' && x.edge === '1px solid'), 'both boxes unticked: no tick is drawn, and each box has a real edge: ' + JSON.stringify(b));
      await page.check('#kaTerms', { force: true });
      b = await boxes();
      c.check(b[0].tick === 'visible' && b[1].tick === 'hidden', 'only the ticked box shows a tick: ' + JSON.stringify(b.map((x) => x.tick)));
      const edges = await page.evaluate(() => ['#kaGo', '#kaEmail'].map((q) => { const cs = getComputedStyle(document.querySelector(q)); return q + ' ' + cs.borderTopWidth + ' ' + cs.borderTopStyle; }));
      c.check(edges[0] === '#kaGo 2px solid' && edges[1] === '#kaEmail 1px solid', 'the main button and the field have real edges: ' + edges.join(', '));
      await c.shot(`x1-forced-${scheme}-create`, page, true);
      await page.evaluate(() => kaGo('sign-in'));
      await waitView(page, 'signin');
      c.check(await page.evaluate(() => getComputedStyle(document.getElementById('kaShared').nextElementSibling.querySelector('svg')).visibility === 'hidden'), 'the "shared computer" box on Sign in draws no tick either');
      // The switch on Account, off and on.
      await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW); await page.press('#kaPass', 'Enter');
      await waitView(page, '');
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.waitForSelector('#kaNewsBtn');
      await page.waitForFunction(() => !ka.newsBusy);
      const sw = () => page.evaluate(() => { const t = document.getElementById('kaNewsBtn'), cs = getComputedStyle(t), k = getComputedStyle(t, '::after'); return { on: t.getAttribute('aria-checked'), track: cs.backgroundColor, edge: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, knob: k.backgroundColor, w: Math.round(t.getBoundingClientRect().width), h: Math.round(t.getBoundingClientRect().height) }; });
      const off = await sw();
      await page.click('#kaNewsBtn');
      await page.waitForFunction(() => document.getElementById('kaNewsBtn').getAttribute('aria-checked') === 'true');
      const on = await sw();
      c.check(off.edge.startsWith('1px solid') && off.knob !== off.track, 'Off: an edge, and a knob that stands out from the track: ' + JSON.stringify(off));
      c.check(on.track !== off.track && on.knob !== on.track && on.knob !== off.knob && on.edge.includes(on.track), 'On: the track takes the system highlight (edge too) and the knob its text colour, so On and Off differ without relying on position alone: ' + JSON.stringify(on));
      c.check(on.w === off.w && on.h === off.h && on.w >= 52, 'the switch keeps its size: ' + on.w + ' by ' + on.h);
      await c.shot(`x1-forced-${scheme}-switch`);
    });
    await ctx.close();
  }
}

if (wanted('X2')) {
  const { ctx, page, server } = await setup({ view: 'desktop' });
  await rec.run('X2', '"One more step" at 1280: the forest panel speaks about agreeing and syncing, not about codes and passwords; the consent box is described only by what is showing', page, async (c) => {
    await open(page, '#sign-in');
    await page.waitForSelector('.ka-btn-google', { state: 'visible' });
    const [req] = await Promise.all([page.waitForRequest((r) => r.url().startsWith(SUPA + '/auth/v1/authorize')), page.click('.ka-btn-google')]);
    await page.goto(`${APP}?code=${server.googleCode(new URL(req.url()).searchParams.get('code_challenge'), 'panel@gmail.com')}`);
    await waitView(page, 'consent');
    const art = await page.evaluate(() => document.querySelector('.ka-art').innerText.replace(/\s+/g, ' ').trim());
    c.check(/Your study, ready to travel with you\./.test(art) && /Agree once, and your progress syncs between this browser and the Android app\./.test(art) && /What an account keeps in step/.test(art), 'the panel: ' + art.slice(0, 200));
    c.check(!/Three short steps|a code, a password|Codes by email/.test(art), 'nothing about codes or passwords for a Google arrival');
    await c.shot('x2-one-more-step-1280');
    // The agreement box for a screen reader.
    const aria = () => page.evaluate(() => { const t = document.getElementById('kaTerms'); return { by: t.getAttribute('aria-describedby'), invalid: t.getAttribute('aria-invalid'), hint: !document.getElementById('kaConsentHint').hidden }; });
    let a = await aria();
    c.check(a.by === 'kaAgeLine kaConsentHint kaConsentE' && a.invalid === null && a.hint, 'unticked: described by the age line, the hint and the (empty) message: ' + JSON.stringify(a));
    await page.click('#kaGo');
    a = await aria();
    c.check(a.by === 'kaAgeLine kaConsentE' && a.invalid === 'true' && !a.hint, 'refused: marked invalid, and the sentence is heard once (the hidden hint is no longer in the description): ' + JSON.stringify(a));
    await page.check('#kaTerms', { force: true });
    a = await aria();
    c.check(a.by === 'kaAgeLine kaConsentE' && a.invalid === null, 'ticked: no longer invalid, described by the age line only: ' + JSON.stringify(a));
    await axe(page, c, 'One more step at 1280');
  });
  await ctx.close();
}

if (wanted('X3')) {
  const { ctx, page, server, net } = await setup({ view: 'phone', onboarded: false });
  await rec.run('X3', 'The first-visit sheet for a new account: no toast over it, "signed in" is said by the sheet itself, and a real note waits until the sheet closes', page, async (c) => {
    net.hibpMode = 'down';   // the leak check can't run: a real note to carry
    await open(page, '#create-account');
    await page.fill('#kaEmail', 'quiet@example.com');
    await page.check('#kaTerms', { force: true });
    await page.press('#kaEmail', 'Enter');
    await waitView(page, 'signup2');
    await page.fill('#kaCode', server.codes.get('quiet@example.com'));
    await page.press('#kaCode', 'Enter');
    await waitView(page, 'signup3');
    await fillPw(page, PW2);
    await page.press('#kaPw', 'Enter');
    await waitView(page, '');
    await page.waitForSelector('.ob-welcome', { timeout: 8000 });
    await sleep(300);
    const t1 = await page.evaluate(() => { const t = document.getElementById('globalToast'); return t && t.classList.contains('show') ? t.textContent : ''; });
    c.check(t1 === '', 'no toast sits over the sheet: "' + t1 + '"');
    c.check((await page.evaluate(() => document.querySelector('#onboardTitle .sr-only').textContent)) === norm('You’re signed in. Welcome to KaiSip. ') + ' ' || /^You.re signed in\. Welcome to KaiSip\. $/.test(await page.evaluate(() => document.querySelector('#onboardTitle .sr-only').textContent)), 'a screen reader hears "You’re signed in. Welcome to KaiSip." from the sheet');
    await c.shot('x3-sheet-no-toast');
    await page.click('.ob-ghost');
    await page.waitForFunction(() => /couldn.t check this password against known leaks/.test(document.getElementById('globalToast').textContent), null, { timeout: 4000 }).catch(() => {});
    c.check(/couldn.t check this password against known leaks/.test(await toast(page)), 'the note about the leak check shows once the sheet is closed: ' + (await toast(page)));
  });
  await ctx.close();
}

if (wanted('X4')) {
  const { ctx, page, server } = await setup({ view: 'phone' });
  await rec.run('X4', 'Fields are as tall as buttons (52), and at 320px with text at 200% the title wraps between words', page, async (c) => {
    await open(page, '#sign-in');
    const h = await page.evaluate(() => ['#kaEmail', '#kaPass', '#kaGo'].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().height)));
    c.check(h.every((x) => x === 52), 'email, password and the button are all 52 tall: ' + h.join(', '));
    await page.setViewportSize({ width: 320, height: 720 });
    await page.evaluate(() => kaGo('create-account'));
    await waitView(page, 'signup1');
    await page.fill('#kaEmail', 'big@example.com');
    await page.check('#kaTerms', { force: true });
    await page.press('#kaEmail', 'Enter');
    await waitView(page, 'signup2');
    await page.fill('#kaCode', server.codes.get('big@example.com'));
    await page.press('#kaCode', 'Enter');
    await waitView(page, 'signup3');
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await sleep(150);
    // No word of the title is cut: every word's box sits on one line.
    const cut = await page.evaluate(() => { const t = document.querySelector('#kaRoot h1'); const node = t.firstChild; const out = []; let at = 0; for (const w of t.textContent.split(' ')) { const r = document.createRange(); r.setStart(node, at); r.setEnd(node, at + w.length); const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top))); if (tops.size > 1) out.push(w); at += w.length + 1; } return out; });
    c.check(cut.length === 0, 'no word of "Create a password" is broken across lines: ' + cut.join(', '));
    await noOverflow(page, c, 'Create a password at 320px, text at 200%');
    await c.shot('x4-title-320-200', page, true);
  });
  await ctx.close();
}

console.log(`accounts: axe-core ${axeSrc ? 'from ' + axeFile : 'NOT FOUND'}: ${axeStats.ran} scans run, ${axeStats.skipped} skipped`);
{
  const attr = [...wouldBlock.keys()].filter((k) => k.startsWith('script-src-attr')), elem = [...wouldBlock.keys()].filter((k) => k.startsWith('script-src-elem'));
  console.log(`accounts: the Report-Only script policy (no inline script) would block ${elem.length} inline script block(s) and ${attr.length} different inline handler(s) on the pages these tests saw${APP_CSP_RO ? '' : ' (no Report-Only policy was found in _headers)'}`);
  fs.writeFileSync(path.join(outDir, 'csp-report-only.txt'), [...wouldBlock.entries()].map(([k, n]) => n + ' x ' + k).sort().join('\n') + '\n');
}
await browser.close();
// A run without the accessibility scan is not a pass on CI (docs/mobile/DESIGN_SYSTEM.md 22.3 leans on it).
if (axeStats.skipped && process.env.CI) { console.error(`accounts: ${axeStats.skipped} accessibility scans were skipped because axe-core was not found (set AXE_PATH)`); process.exitCode = 1; }
const bad = rec.paths.filter((p) => p.status === 'FAIL');
console.log(`\naccounts: ${rec.paths.length} paths, ${bad.length} failed${bad.length ? ': ' + bad.map((p) => p.id).join(', ') : ''}`);
for (const p of bad) for (const f of [...p.fails, ...p.errors]) console.log(`  ${p.id}: ${f}`);
process.exit(bad.length ? 1 : 0);
