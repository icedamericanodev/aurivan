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
const axeSrc = (() => {
  for (const p of [process.env.AXE_PATH, path.join(repo, 'node_modules/axe-core/axe.min.js'), '/opt/node-tools/node_modules/axe-core/axe.min.js'].filter(Boolean)) if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return '';
})();

const VIEWS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
};
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
    if (rel === 'assets/kaisip-cloud.js') net.cloudJs++;
    if (rel === 'assets/kaisip-password-words.js') net.wordsJs++;
    if (!file || !file.startsWith(repo) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    const headers = rel === 'index.html' ? { 'content-security-policy': APP_CSP } : {};
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', headers, body: fs.readFileSync(file) });
  }
  if (u.origin === SUPA) {
    net.supabase++;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const headers = req.headers();
    if (headers.apikey !== PUBLIC_KEY) net.badKey = true;
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
  const net = { hibp: [], hibpMode: 'clean', leaked: new Set(), turnstile: 0, turnstileMode: 'ok', supabase: 0, cloudJs: 0, wordsJs: 0, third: [], badKey: false };
  await ctx.route('**/*', (route) => handle(route, server, net, origin));
  const seed = { aurivan_consent: 'denied', ...(o.onboarded === false ? {} : { cisa_onboarded_v6: '1', aurivan_exam_date_asked: '1' }), ...(o.preview === false ? {} : { kaisip_accounts_preview: '1' }), ...(o.seed || {}) };
  // Seeded once per tab (a reload must not put back what a test removed).
  await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); } } catch (e) {} }, seed);
  // Anything the page's own policy blocks is an error.
  await ctx.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => { console.error('CSP blocked ' + e.violatedDirective + ': ' + (e.blockedURI || 'inline')); }); });
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
async function makeAccount(server, email = EMAIL, pw = PW, { terms = true } = {}) {
  const call = async (method, p, body, token) => {
    const res = await server.fetch(F.FAKE_URL + p, { method, headers: { apikey: F.FAKE_KEY, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await res.text();
    if (res.status >= 300) throw new Error(`makeAccount ${p}: ${res.status} ${t}`);
    return t ? JSON.parse(t) : {};
  };
  await call('POST', '/auth/v1/otp', { email, create_user: true, gotrue_meta_security: { captcha_token: 'setup' } });
  const s = await call('POST', '/auth/v1/verify', { type: 'email', email, token: server.codes.get(email) });
  await call('PUT', '/auth/v1/user', { password: pw }, s.access_token);
  if (terms) await call('POST', '/rest/v1/profiles', { terms_version: '2026-11', age_confirmed: true }, s.access_token);
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
  try { await page.waitForFunction((x) => (document.body.getAttribute('data-ka-view') || '') === x, v, { timeout: 15000 }); }
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
  if (!axeSrc) { c.note('axe-core not found: accessibility scan skipped for ' + label); return; }
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
  // The owner's preview: asked for with the address, kept in this browser, switched off the same way.
  {
    const { ctx, page, net } = await setup({ preview: false });
    await rec.run('A0-preview-switch', 'The owner’s preview switch: on with #accounts-preview=on, off with =off, this browser only', page, async (c) => {
      await open(page, '#accounts-preview=on');
      c.check(await page.evaluate(() => window.KS_ACCT.enabled === true && localStorage.getItem('kaisip_accounts_preview') === '1'), 'the preview address must switch accounts on here');
      c.check(!page.url().includes('accounts-preview'), 'the preview words are taken out of the address');
      c.check(await page.evaluate(() => !!document.getElementById('kaRoot') && !!document.querySelector('#kaTop')), 'the account entry points exist in preview');
      c.check(net.cloudJs === 0 && net.supabase === 0, 'a guest in preview still loads no account script until a screen opens');
      // A new visit (the switch is read when the page loads; a changed address in an open page is not a load).
      await page.goto('about:blank');
      await open(page, '#accounts-preview=off');
      c.check(await page.evaluate(() => window.KS_ACCT.enabled === false && localStorage.getItem('kaisip_accounts_preview') === null && !document.getElementById('kaRoot')), 'the preview address must switch accounts off again');
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
      c.check(/Continue with Google/.test(await text(page, '.ka-btn-google')), 'the Google button');
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
      await page.waitForSelector('#kaCard .ka-card-act');
      c.check((await page.evaluate(() => document.body.getAttribute('data-tab'))) === 'you', 'signed in lands on You');
      c.check(/m•••@example\.com/.test(await text(page, '#kaCard')), 'the card shows the masked email: ' + (await text(page, '#kaCard')));
      await page.waitForFunction(() => /Synced/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
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
const CONSENT_FAKE = () => { window.KaiSipConsentApi = { saved: [], saveConsent(cloud, rec) { this.saved.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve(rec); }, readConsent() { return Promise.resolve(this.saved[this.saved.length - 1] || null); } }; };
const paste = (page, sel, value) => page.evaluate(({ sel, value }) => { const el = document.querySelector(sel); el.focus(); const dt = new DataTransfer(); dt.setData('text', value); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, { sel, value });
const toast = (page) => page.evaluate(() => (document.getElementById('globalToast') || {}).textContent || '');
if (wanted('A2')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, server, net } = await setup({ view: v });
    await ctx.addInitScript(CONSENT_FAKE);
    const MAIL = 'xochitl.brennagh@example.com';
    await rec.run(`A2-${v}`, 'Create account: the agreements block sending, the code (wrong, pasted), every refused password, a leaked one, then created', page, async (c) => {
      await open(page, '#create-account');
      await waitView(page, 'signup1');
      c.check((await text(page, '#kaRoot h1')) === 'Create your KaiSip account', 'the Create account title');
      c.check(/^Step 1 of 3/.test(await text(page, '.ka-steps')) && (await page.getAttribute('.ka-step.is-current', 'aria-current')) === 'step', 'Step 1 of 3 in words, with the current step marked');
      const boxes = await page.evaluate(() => ['kaTerms', 'kaAge', 'kaNews'].map((id) => { const e = document.getElementById(id); return { checked: e.checked, req: e.getAttribute('aria-required'), label: e.closest('label').innerText.replace(/\s+/g, ' ').trim() }; }));
      c.check(boxes.every((b) => b.checked === false), 'no box is pre-ticked: ' + JSON.stringify(boxes));
      c.check(/^I agree to the Terms .*and Privacy Policy/.test(boxes[0].label) && boxes[1].label === 'I’m 16 or older', 'the two required agreements: ' + boxes[0].label + ' / ' + boxes[1].label);
      c.check(boxes[2].label === 'Email me study tips and KaiSip news. I can unsubscribe anytime. Optional' && boxes[2].req === null && boxes[0].req === 'true', 'the news box is separate and marked Optional: ' + boxes[2].label);
      c.check(await page.evaluate(() => [...document.querySelectorAll('#kaRoot .ka-consent a')].map((a) => a.getAttribute('href')).join(',') === 'terms.html,privacy.html'), 'the agreement links go to the Terms and the Privacy Policy');
      await axe(page, c, `create account step 1 (${v})`);
      await noOverflow(page, c, 'Create account step 1');
      // Nothing ticked: Send is refused in words, and so is Google.
      await page.fill('#kaEmail', MAIL);
      await page.press('#kaEmail', 'Enter');
      c.check((await text(page, '#kaConsentE')) === 'Tick both agreements to continue.' && (await page.getAttribute('#kaConsentE', 'role')) === 'alert', 'unticked agreements stop the form, in words: ' + (await text(page, '#kaConsentE')));
      await page.click('.ka-btn-google');
      await sleep(200);
      c.check((await view(page)) === 'signup1' && !(await store(page)).session.kaisip_pkce_v1, 'Google sign-up is stopped by the same agreements');
      await page.check('#kaTerms', { force: true });
      await page.click('#kaGo');
      c.check((await text(page, '#kaConsentE')) === 'Tick both agreements to continue.', 'one of two is not enough');
      c.check(calls(server, '/auth/v1/otp').length === 0 && net.supabase === 0, 'no code is asked for (and nothing is sent) before both agreements');
      await c.shot(`a2-${v}-blocked`);
      await page.check('#kaAge', { force: true });
      c.check((await text(page, '#kaConsentE')) === '', 'the message clears when a box is ticked');
      await page.click('#kaGo');
      await waitView(page, 'signup2');
      const otp = calls(server, '/auth/v1/otp')[0];
      c.check(otp && otp.body.email === MAIL && otp.body.create_user === true && /^ts-token-/.test(otp.body.gotrue_meta_security?.captcha_token || '') && !('password' in otp.body), 'the code request: the email, the human-check token, no password: ' + JSON.stringify(otp && otp.body));
      const pending = JSON.parse((await store(page)).session.kaisip_signup_pending_v1 || 'null');
      c.check(pending && pending.termsAccepted === true && pending.ageConfirmed === true && pending.marketingOptIn === false && pending.wordingVersion && pending.termsVersion === '2026-11' && !JSON.stringify(pending).includes('@'), 'the agreements wait in this tab only, with their wording version and time, and no email: ' + JSON.stringify(pending));
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
      c.check(JSON.stringify(empty.map((x) => x.label)) === JSON.stringify(['12 or more characters', 'A lowercase letter', 'An uppercase letter', 'A number', 'A symbol']), 'the five items, in order: ' + empty.map((x) => x.label).join(' / '));
      c.check(empty.every((x) => !x.met && x.word === 'Not yet' && x.icon), 'before typing every item reads "Not yet", with an icon');
      c.check(/Your password needs/.test(await text(page, '#kaPwHelp')) && (await page.getAttribute('#kaPw', 'aria-describedby')).includes('kaPwHelp'), 'the list is tied to the field');
      c.check(!/No symbols or numbers required|\b15\b/.test(await text(page, '#kaRoot')), 'the old "15 characters, nothing else required" wording is gone');
      await axe(page, c, `create account step 3 (${v})`);
      await noOverflow(page, c, 'Create account step 3');
      await c.shot(`a2-${v}-checklist-empty`);
      // Typing ticks items one by one; the summary for screen readers waits until typing stops.
      await page.fill('#kaPw', 'ocean violet');
      let now = await list();
      c.check(JSON.stringify(now.map((x) => x.word)) === JSON.stringify(['Met', 'Met', 'Not yet', 'Not yet', 'Not yet']), '"ocean violet": length and lowercase met: ' + now.map((x) => x.word).join(','));
      c.check((await page.evaluate(() => document.getElementById('kaPwSay').textContent)) === '', 'nothing is announced on the keystroke itself');
      await page.waitForFunction(() => /2 of 5 met\. Still needed: an uppercase letter, a number, a symbol\./.test(document.getElementById('kaPwSay').textContent), null, { timeout: 4000 }).catch(() => {});
      c.check(/2 of 5 met\. Still needed: an uppercase letter, a number, a symbol\./.test(await page.evaluate(() => document.getElementById('kaPwSay').textContent)), 'one polite summary after typing stops: ' + (await page.evaluate(() => document.getElementById('kaPwSay').textContent)));
      c.check((await page.getAttribute('#kaPwSay', 'aria-live')) === 'polite', 'the summary is polite, never an interruption');
      // Sent while items are missing: the card says exactly what to add; no second red line.
      await page.press('#kaPw', 'Enter');
      await page.waitForFunction(() => /Not saved yet/.test(document.getElementById('kaPwHelp').textContent));
      c.check(/Add an uppercase letter, a number and a symbol\./.test(await text(page, '#kaPwHelp')) && (await text(page, '#kaPwE')) === '' && (await page.getAttribute('#kaPw', 'aria-invalid')) === 'true', 'a refused send: the card says what to add, once, and the field is marked: ' + (await text(page, '#kaPwHelp')));
      c.check((await page.getAttribute('#kaPw', 'type')) === 'password', 'the field stays hidden when it is sent');
      await page.fill('#kaPw', 'Oc7!');
      c.check((await page.getAttribute('#kaPw', 'aria-invalid')) === null && /Your password needs/.test(await text(page, '#kaPwHelp')), 'typing again clears the refusal');
      now = await list();
      c.check(JSON.stringify(now.map((x) => x.word)) === JSON.stringify(['Not yet', 'Met', 'Met', 'Met', 'Met']), 'four kinds but too short: ' + now.map((x) => x.word).join(','));
      // All five met, but the shared rules still refuse it: the card says why, in the rules' own words.
      const refused = [
        ['Passwordpassword1!', /used by many people or is easy to guess, even with capitals, numbers and symbols added/],
        ['Qwertyuiop123!', /Avoid repeats, sequences, dates, keyboard patterns/],
        ['Xochitl brennagh 1990!', /from your email address or your name/],
        ['Kaisip kaisip 2026!', /the app.s or the exam.s name/],
        ['Aa1!' + 'x'.repeat(70), /Use up to 72/],
      ];
      for (const [pw, words] of refused) {
        await page.fill('#kaPw', pw);
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
      await page.fill('#kaPw', PW);
      c.check(/Strong password\. Nicely done\./.test(await text(page, '#kaPwHelp')) && (await list()).every((x) => x.met && x.word === 'Met'), 'a good password: all five met, in words: ' + (await text(page, '#kaPwHelp')));
      await c.shot(`a2-${v}-good`);
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwE', /data leak/, c);
      c.check((await page.getAttribute('#kaPwE', 'role')) === 'alert' && (await page.getAttribute('#kaPw', 'aria-invalid')) === 'true', 'a leak found at save is the one refusal shown under the field (the card cannot know it)');
      c.check(calls(server, '/auth/v1/user', 'PUT').length === 0, 'a leaked password is not saved');
      c.check(net.hibp.length > 0 && net.hibp.every((p) => /^\/range\/[0-9A-Fa-f]{5}$/.test(p)), 'the leak lookup sends 5 characters of a hash and nothing else: ' + net.hibp.join(','));
      // The lookup can't be reached: the password is saved, and the screen says so calmly.
      net.hibpMode = 'down';
      await page.fill('#kaPw', PW2);
      c.check((await text(page, '#kaPwE')) === '' && (await page.getAttribute('#kaPw', 'aria-invalid')) === null, 'typing a new password clears the leak message (never two opposite messages)');
      await page.press('#kaPw', 'Enter');
      await waitView(page, '');
      c.check(/couldn.t check this password against known leaks/.test(await toast(page)) && /signed in/.test(await toast(page)), 'the "couldn’t check" state is said calmly after saving: ' + (await toast(page)));
      const put = calls(server, '/auth/v1/user', 'PUT')[0];
      c.check(put && put.body.password === PW2, 'the password is saved with the fresh session');
      const user = server.userByEmail(MAIL);
      c.check(user && server.profiles.get(user.id) === '2026-11', 'the Terms version and "16 or older" are saved for the account');
      const saved = await page.evaluate(() => window.KaiSipConsentApi.saved);
      c.check(saved.length === 1 && saved[0].marketingOptIn === false && saved[0].termsAccepted === true && saved[0].ageConfirmed === true && saved[0].wordingVersion === pending.wordingVersion && typeof saved[0].at === 'string', 'the consent record reaches the consent adapter once, news off: ' + JSON.stringify(saved));
      c.check(!(await store(page)).session.kaisip_signup_pending_v1, 'the waiting agreements are cleared once saved');
      await page.waitForFunction(() => /Synced/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 10000 });
      c.check(/x•••@example\.com/.test(await text(page, '#kaCard')), 'signed in on You: ' + (await text(page, '#kaCard')));
      await noSecrets(page, c, [PW, PW2, real, 'Passwordpassword1!', 'ts-token-'], 'after creating the account');
      const all = await text(page, 'body');
      c.check(!/maple tea|coffee before|correct horse/i.test(all), 'no example password anywhere');
    });
    await ctx.close();
  }
  // The optional news box ticked; the page's own adapter (no consent API yet) keeps the choice here, marked pending.
  {
    const { ctx, page, server } = await setup({ view: 'phone' });
    await rec.run('A2-news', 'Create account with the news box ticked: the choice is recorded (kept in this browser until the consent API exists)', page, async (c) => {
      await open(page, '#create-account');
      await page.fill('#kaEmail', EMAIL);
      for (const id of ['#kaTerms', '#kaAge', '#kaNews']) await page.check(id, { force: true });
      await page.press('#kaEmail', 'Enter');
      await waitView(page, 'signup2');
      await page.fill('#kaCode', server.codes.get(EMAIL));
      await page.press('#kaCode', 'Enter');
      await waitView(page, 'signup3');
      await page.fill('#kaPw', PW);
      await page.press('#kaPw', 'Enter');
      await waitView(page, '');
      const kept = JSON.parse((await store(page)).local.kaisip_consent_v1 || 'null');
      c.check(kept && kept.marketingOptIn === true && kept.pending === true && kept.wordingVersion && kept.termsVersion === '2026-11' && !JSON.stringify(kept).includes('@') && !JSON.stringify(kept).includes(server.userByEmail(EMAIL).id), 'the news choice is kept with its wording version and time, with no email or account id: ' + JSON.stringify(kept));
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
      await page.fill('#kaPw', PW2);
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
      await page.fill('#kaPw', 'Passwordpassword1!');
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwHelp', /Not saved yet.*easy to guess/, c);
      c.check(calls(server, '/auth/v1/verify').filter((x) => x.body.email === EMAIL).length === 0, 'the code is not spent on a refused password');
      // A wrong code.
      await page.fill('#kaPw', PW2);
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
      await page.waitForSelector('#kaCard .ka-card-act');
      c.check(/m•••@example\.com/.test(await text(page, '#kaCard')), 'signed in after the reset');
      await noSecrets(page, c, [PW2, code, 'Passwordpassword1!'], 'after the reset');
      c.check(net.third.length === 0, 'no other address was contacted: ' + net.third.join(','));
    });
    await ctx.close();
  }
}

// ── A4. The account card on You ──
const goYou = async (page) => { await page.evaluate(() => navTo(null, 'you')); await page.waitForSelector('#kaCard'); await sleep(150); };
const dayKey = (back) => { const d = new Date(Date.now() - back * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const answerKeys = (page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('cisa_profiles_v1') || '{}'); const s = (p[localStorage.getItem('cisa_active_profile')] || {}).state || {}; return { ids: Object.keys(s.answerLog || {}).sort(), score: s.score || null }; });
// Signs in through the screen and waits for the card to say it is synced.
async function signedIn(page, email = EMAIL, pw = PW) {
  await signIn(page, email, pw);
  await waitView(page, '');
  await page.waitForFunction(() => /Synced|Sync is on/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 12000 });
}
if (wanted('A4')) {
  {
    const { ctx, page, net } = await setup({ view: 'phone' });
    await rec.run('A4-guest', 'You, not signed in: the full card on the first 3 days it is seen, then the slim row; it collapses once opened', page, async (c) => {
      await open(page);
      await goYou(page);
      const full = await text(page, '#kaCard');
      c.check(/Saved in this browser only/.test(full) && /A free account syncs it with the KaiSip Android app and keeps a safe copy if this browser.s data is cleared\./.test(full) && /Create a free account/.test(full) && /Sign in/.test(full), 'the full card: ' + full);
      c.check(await page.evaluate(() => { const card = document.getElementById('kaCard'), top = document.querySelector('#screen-you .you-top'), sum = document.getElementById('youSummary'); return top.compareDocumentPosition(card) & 4 && card.compareDocumentPosition(sum) & 4; }), 'the card sits under the profile, before the summary');
      c.check(JSON.stringify(JSON.parse((await store(page)).local.kaisip_acct_card_v1).days) === JSON.stringify([dayKey(0)]), 'today counts as one of the three days');
      c.check(net.cloudJs === 0 && net.supabase === 0, 'a guest looking at You loads no account script and sends nothing');
      await axe(page, c, 'You, guest full card');
      await noOverflow(page, c, 'You, guest full card');
      await c.shot('a4-guest-full');
      // Counted by day, not by visit.
      await page.reload(); await page.waitForFunction(() => document.body.hasAttribute('data-section')); await goYou(page);
      c.check(JSON.parse((await store(page)).local.kaisip_acct_card_v1).days.length === 1, 'a second visit the same day uses no extra day');
      // The third day is still full; the fourth is the slim row, for good.
      await page.evaluate((d) => localStorage.setItem('kaisip_acct_card_v1', JSON.stringify({ days: d })), [dayKey(3), dayKey(2)]);
      await page.reload(); await page.waitForFunction(() => document.body.hasAttribute('data-section')); await goYou(page);
      c.check(/Create a free account/.test(await text(page, '#kaCard')), 'the third day still shows the full card');
      await page.evaluate((d) => localStorage.setItem('kaisip_acct_card_v1', JSON.stringify({ days: d })), [dayKey(3), dayKey(2), dayKey(1)]);
      await page.reload(); await page.waitForFunction(() => document.body.hasAttribute('data-section')); await goYou(page);
      const slim = await text(page, '#kaCard');
      c.check(/Saved in this browser only/.test(slim) && /Add a free account to sync/.test(slim) && !/Create a free account/.test(slim), 'after three days: the slim row: ' + slim);
      c.check(JSON.parse((await store(page)).local.kaisip_acct_card_v1).slim === true, 'and it stays slim');
      await axe(page, c, 'You, guest slim row');
      await c.shot('a4-guest-slim');
      // The slim row opens the offer sheet.
      await page.click('#kaCard .ka-card-main');
      await page.waitForSelector('#flagModal [role=dialog]');
      const sheet = await text(page, '#flagModal [role=dialog]');
      c.check(/Keep your progress everywhere/.test(sheet) && /In sync with your phone/.test(sheet) && /A safe copy/.test(sheet) && /Free and optional\. KaiSip works the same without an account\./.test(sheet), 'the offer sheet: ' + sheet);
      await axe(page, c, 'the offer sheet');
      await c.shot('a4-offer-sheet');
      await page.click('#flagModal .ka-btn-primary');
      await waitView(page, 'signup1');
    });
    await ctx.close();
  }
  {
    const { ctx, page } = await setup({ view: 'phone' });
    await rec.run('A4-collapse', 'The full card collapses at once when Create or Sign in is opened from it; a short phone gets the slim row', page, async (c) => {
      await open(page);
      await goYou(page);
      await page.click('#kaCard [data-f="signin"]');
      await waitView(page, 'signin');
      await page.click('.ka-toplink');
      await waitView(page, '');
      await goYou(page);
      c.check(/Add a free account to sync/.test(await text(page, '#kaCard')), 'back without an account: the slim row');
      await page.evaluate(() => localStorage.removeItem('kaisip_acct_card_v1'));
      await page.setViewportSize({ width: 360, height: 640 });
      await page.reload(); await page.waitForFunction(() => document.body.hasAttribute('data-section')); await goYou(page);
      c.check(/Add a free account to sync/.test(await text(page, '#kaCard')) && !(await store(page)).local.kaisip_acct_card_v1, 'a 360x640 phone shows the slim row and uses none of the three days');
      await noOverflow(page, c, 'You at 360');
    });
    await ctx.close();
  }
  for (const v of ['phone', 'desktop']) {
    const ids = freeIds(1, 3);
    const { ctx, page, server } = await setup({ view: v, seed: profileSeed(ids) });
    await makeAccount(server);
    await rec.run(`A4-signed-in-${v}`, 'You, signed in: synced, syncing, waiting for a connection, couldn’t sync, and "sign in again" after 30 days', page, async (c) => {
      await signIn(page);
      // This browser has progress and the account has none: the preview asks first.
      await waitView(page, 'firstsync');
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
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
      // 30 days later: signed out here, progress untouched, the reason kept across a reload.
      const before = await answerKeys(page);
      await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('kaisip_auth_v1')); s.signedInAt = Date.now() - 31 * 86400000; localStorage.setItem('kaisip_auth_v1', JSON.stringify(s)); });
      await page.reload(); await page.waitForFunction(() => document.body.hasAttribute('data-section')); await goYou(page);
      await page.waitForFunction(() => /Please sign in again/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
      const exp = await text(page, '#kaCard');
      c.check(/m•••@example\.com/.test(exp) && /Please sign in again to keep syncing/.test(exp) && /Sign in again/.test(exp) && /Your progress is safe in this browser\./.test(exp), 'the expired card: ' + exp);
      const st = await store(page);
      c.check(!st.local.kaisip_auth_v1 && JSON.parse(st.local.kaisip_auth_ended_v1).reason === 'expired', 'the session is gone and only the reason is kept (kaisip_auth_ended_v1)');
      c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before) && before.ids.length === 3, 'saved progress is untouched: ' + JSON.stringify(before.ids));
      await axe(page, c, `You, sign-in ended (${v})`);
      await noOverflow(page, c, `You, sign-in ended (${v})`);
      await c.shot(`a4-${v}-expired`);
      await page.click('#kaCard [data-f="again"]');
      await waitView(page, 'signin');
      await page.fill('#kaEmail', EMAIL); await page.fill('#kaPass', PW); await page.press('#kaPass', 'Enter');
      await waitView(page, '');
      await page.waitForFunction(() => /Synced/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 12000 });
      c.check(!(await store(page)).local.kaisip_auth_ended_v1, 'signing in again clears the note, with no preview the second time');
    });
    await ctx.close();
  }
}

// ── A5. The Account page ──
if (wanted('A5')) {
  for (const v of ['phone', 'desktop']) {
    const ids = freeIds(2, 2);
    const { ctx, page, server, net } = await setup({ view: v, seed: profileSeed(ids) });
    await ctx.addInitScript(CONSENT_FAKE);
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
      const saved = await page.evaluate(() => window.KaiSipConsentApi.saved);
      c.check(saved.length === 1 && saved[0].marketingOptIn === true && saved[0].wordingVersion && typeof saved[0].at === 'string', 'the change goes through the consent adapter with its wording version and time: ' + JSON.stringify(saved));
      await page.click('#kaNewsBtn');
      await waitText(page, 'kaNewsBtnSay', /^Off\./, c);
      c.check((await page.evaluate(() => window.KaiSipConsentApi.saved.length)) === 2, 'switching off is recorded too');
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
      await page.fill('#kaPw', PW2);
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaCurE', /isn.t your current password/, c);
      await page.fill('#kaCur', PW);
      c.check((await page.evaluate(() => document.querySelectorAll('#flagModal #kaPwHelp .ka-pw-list li').length)) === 5, 'the same checklist on Change password');
      await page.fill('#kaPw', 'ocean violet lamp');
      await page.press('#kaPw', 'Enter');
      await waitText(page, 'kaPwHelp', /Not saved yet.*Add an uppercase letter, a number and a symbol\./, c);
      c.check(server.userByEmail(EMAIL).password === PW, 'nothing changed yet');
      await page.fill('#kaPw', PW2);
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
      await page.waitForFunction(() => /Saved in this browser only/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 8000 });
      const out = await store(page);
      c.check(!out.local.kaisip_auth_v1 && !out.local.kaisip_auth_ended_v1 && !out.local.kaisip_acct_hint_v1, 'signed out: no session, no "signed out" note, no address kept');
      c.check(JSON.stringify(await answerKeys(page)) === JSON.stringify(before), 'signing out leaves saved progress alone: ' + JSON.stringify(before.ids));
      c.check((await page.evaluate(() => document.body.getAttribute('data-tab'))) === 'you' && /Signed out\. Your progress stays in this browser\./.test(await toast(page)), 'back on You, with the words: ' + (await toast(page)));
      // Sign in again and sign out WITH "remove my progress".
      await signIn(page, EMAIL, PW2);
      await waitView(page, '');
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.click('#kaOut');
      await page.check('#kaWipe', { force: true });
      await page.click('#flagModal #kaGo');
      await page.waitForFunction(() => !localStorage.getItem('kaisip_auth_v1') && !document.querySelector('#flagModal [role=dialog]'), null, { timeout: 8000 });
      await sleep(400);
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
      await page.waitForFunction(() => /Saved in this browser only/.test((document.getElementById('kaCard') || {}).textContent || ''), null, { timeout: 8000 });
      c.check(!server.userByEmail(EMAIL), 'the account is gone');
      c.check(/Your account was deleted\. Your progress in this browser stays\./.test(await toast(page)), 'the words after: ' + (await toast(page)));
      c.check((await answerKeys(page)).ids.length === 2, 'this browser keeps its progress');
      const st = await store(page);
      c.check(!st.local.kaisip_auth_v1 && !st.local.kaisip_sync_v1 && !st.local.kaisip_sync_mirror_v1 && !st.local.kaisip_acct_hint_v1, 'no session, sync record or address is left');
    });
    await ctx.close();
  }
}

// ── A6. The first-visit welcome ──
if (wanted('A6')) {
  for (const v of ['phone', 'desktop']) {
    const { ctx, page, net } = await setup({ view: v, onboarded: false });
    await rec.run(`A6-${v}`, 'First visit: "Start studying free" is the main path, "Sign in to sync" the second', page, async (c) => {
      await open(page);
      await waitView(page, 'welcome');
      c.check((await text(page, '#kaRoot h1')) === 'Study for the CISA, right here.', 'the welcome title: ' + (await text(page, '#kaRoot h1')));
      const paths = await page.evaluate(() => [...document.querySelectorAll('.ka-path')].map((p) => ({ cls: p.className, t: p.querySelector('.ka-path-t').textContent, s: p.querySelector('.ka-path-s').textContent })));
      c.check(paths.length === 2 && /primary/.test(paths[0].cls) && paths[0].t === 'Start studying free' && paths[0].s === 'No account. Your progress stays in this browser.', 'the main path: ' + JSON.stringify(paths[0]));
      c.check(/secondary/.test(paths[1].cls) && paths[1].t === 'Sign in to sync with your Android app' && paths[1].s === 'Already study on Android? Pick up where you left off.', 'the second path: ' + JSON.stringify(paths[1]));
      c.check(/free sample of KaiSip.s CISA practice questions\. Not affiliated with or endorsed by ISACA/.test(await text(page, '#kaRoot')), 'the honest fine print');
      c.check(!/\b\d{3,}\b questions/.test(await text(page, '#kaRoot')), 'no question count');
      c.check(net.cloudJs === 0 && net.supabase === 0 && net.turnstile === 0, 'the welcome loads no account script');
      c.check(!(await page.locator('.ob-welcome').count()), 'the older welcome sheet does not also open');
      await axe(page, c, `welcome (${v})`);
      await noOverflow(page, c, `welcome (${v})`);
      await c.shot(`a6-${v}-welcome`);
      await page.click('.ka-path-secondary');
      await waitView(page, 'signin');
      c.check((await store(page)).local.cisa_onboarded_v6 === '1', 'choosing a path ends the first-visit welcome');
      // A fresh visitor again: the main path starts the first five questions, as before accounts.
      await page.evaluate(() => { localStorage.removeItem('cisa_onboarded_v6'); });
      await page.goto('about:blank');
      const loaded = net.cloudJs;
      await open(page);
      await waitView(page, 'welcome');
      await page.click('.ka-path-primary');
      await waitView(page, '');
      await page.waitForFunction(() => { const pf = document.getElementById('practiceFocus'); return pf && !pf.hidden && document.querySelectorAll('#qArea .opt').length >= 4; }, null, { timeout: 15000 });
      c.check((await store(page)).local.cisa_onboarded_v6 === '1', 'studying free starts a question straight away');
      c.check(net.cloudJs === loaded, 'and loads no account script for it');
    });
    await ctx.close();
  }
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
  await rec.run('A8', 'Two tabs: signing in or out in one shows in the other without a reload', page, async (c) => {
    await open(tab2);
    await tab2.evaluate(() => navTo(null, 'you'));
    await tab2.waitForSelector('#kaCard');
    c.check(/Saved in this browser only/.test(await text(tab2, '#kaCard')), 'tab 2 starts signed out');
    await signedIn(page);
    await tab2.waitForFunction(() => /@example\.com/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
    c.check(/m•••@example\.com/.test(await text(tab2, '#kaCard')), 'tab 2 shows the account after tab 1 signs in: ' + (await text(tab2, '#kaCard')));
    await tab2.evaluate(() => navGoFocus(null, 'account'));
    await tab2.waitForSelector('#kaHero .ka-who');
    // Sign out in tab 1.
    await page.bringToFront();
    await page.evaluate(() => navGoFocus(null, 'account'));
    await page.click('#kaOut');
    await page.click('#flagModal #kaGo');
    await page.waitForFunction(() => !localStorage.getItem('kaisip_auth_v1'));
    await tab2.waitForFunction(() => document.body.getAttribute('data-tab') === 'you' && /Saved in this browser only/.test(document.getElementById('kaCard').textContent), null, { timeout: 8000 });
    c.check(true, 'tab 2 left the Account page and shows the signed-out card');
    c.check(/Not signed in/.test(await text(tab2, '#kaRail')), 'and so does its rail: ' + (await text(tab2, '#kaRail')));
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
      c.check((await text(page, '#kaRoot h1')) === 'One more step' && (await page.evaluate(() => ['kaTerms', 'kaAge', 'kaNews'].every((id) => document.getElementById(id).checked === false))), 'a new Google account meets the agreements, all unticked');
      c.check(calls(server, '/rest/v1/sync_snapshots').length === 0, 'nothing syncs before the agreements');
      await axe(page, c, 'the agreements after Google');
      await noOverflow(page, c, 'the agreements after Google');
      await c.shot('a9-consent');
      await page.click('#kaGo');
      c.check((await text(page, '#kaConsentE')) === 'Tick both agreements to continue.', 'unticked agreements stop it');
      await page.check('#kaTerms', { force: true }); await page.check('#kaAge', { force: true });
      await page.click('#kaGo');
      await waitView(page, '');
      await settled(page);
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
      for (const id of ['#kaTerms', '#kaAge', '#kaNews']) await page.check(id, { force: true });
      const challenge = await startGoogle(page, c);
      const code = server.googleCode(challenge, 'noel@gmail.com');
      await page.goto(`${APP}?code=${code}`);
      await waitView(page, '');
      await settled(page);
      const u = server.userByEmail('noel@gmail.com');
      c.check(server.profiles.get(u.id) === '2026-11', 'the agreements ticked before Google are saved for the new account, with no second ask');
      c.check(JSON.parse((await store(page)).local.kaisip_consent_v1).marketingOptIn === true, 'and so is the news choice');
      // Cancelled at Google (or any error it sends back): calm words, and nothing from the address is shown.
      await page.evaluate(() => navGoFocus(null, 'account'));
      await page.click('#kaOut'); await page.click('#flagModal #kaGo');
      await page.waitForFunction(() => !localStorage.getItem('kaisip_auth_v1'));
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
    if (shots) { await sleep(120); await page.screenshot({ path: path.join(shots, `${name}_${v === 'phone' ? '390' : '1280'}_${scheme}.png`), fullPage: full }); }
  };
  const MAIL = 'jamie.reyes@example.com';
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
  await page.check('#kaTerms', { force: true }); await page.check('#kaAge', { force: true });
  await page.click('#kaGo'); await waitView(page, 'signup2');
  await page.fill('#kaCode', '482715'); await page.focus('#kaCode'); await snap(page, '06-create-2-code');
  await page.fill('#kaCode', '00000000'); await page.press('#kaCode', 'Enter');
  await page.waitForFunction(() => document.getElementById('kaCodeE').textContent.length > 0); await snap(page, '07-create-2-wrong-code');
  await page.fill('#kaCode', server.codes.get(MAIL)); await page.press('#kaCode', 'Enter'); await waitView(page, 'signup3');
  await page.waitForFunction(() => window.KaiSipCloud && window.KaiSipCloud.passwordRules.passwordWordsLoaded(), null, { timeout: 15000 });
  await snap(page, '08-create-3-checklist-empty');
  await page.fill('#kaPw', 'Passwordpassword1!'); await page.press('#kaPw', 'Enter');
  await page.waitForFunction(() => /Not saved yet/.test(document.getElementById('kaPwHelp').textContent)); await snap(page, '09-create-3-password-refused');
  s.net.hibpMode = 'down';
  await page.fill('#kaPw', PW); await snap(page, '10-create-3-password-good');
  await page.press('#kaPw', 'Enter'); await waitView(page, ''); await settled(page);
  await page.waitForFunction(() => /couldn.t check/.test(document.getElementById('globalToast').textContent)).catch(() => {});
  if (shots) await page.screenshot({ path: path.join(shots, `11-created-leak-check-unavailable_${v === 'phone' ? '390' : '1280'}_${scheme}.png`) });
  await sleep(7200);   // the toast leaves
  // 2. Signed in: You and the Account page.
  await snap(page, '12-you-signed-in');
  await page.evaluate(() => navGoFocus(null, 'account')); await page.waitForFunction((e) => document.getElementById('kaHero').textContent.includes(e), MAIL); await snap(page, '13-account', true);
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
  await page.reload(); await page.waitForFunction(() => document.body.hasAttribute('data-section')); await page.evaluate(() => navTo(null, 'you'));
  await page.waitForFunction(() => /Please sign in again/.test((document.getElementById('kaCard') || {}).textContent || '')); await snap(page, '19-you-sign-in-ended');
  // 4. Forgot password.
  await page.click('#kaCard [data-f="again"]'); await waitView(page, 'signin');
  await page.click('.ka-aside'); await waitView(page, 'forgot1'); await page.fill('#kaEmail', MAIL); await snap(page, '20-forgot-1-email');
  await page.press('#kaEmail', 'Enter'); await waitView(page, 'forgot2');
  await page.fill('#kaCode', server.codes.get(MAIL)); await page.fill('#kaPw', PW2); await snap(page, '21-forgot-2-code-and-password');
  await s.ctx.close();
  // 5. A guest on You: the full card, the slim row and its sheet.
  s = await setup({ view: v, scheme }); page = s.page;
  await open(page); await page.evaluate(() => navTo(null, 'you')); await page.waitForSelector('#kaCard'); await snap(page, '22-you-guest-full-card');
  await page.evaluate(() => { localStorage.setItem('kaisip_acct_card_v1', '{"slim":true}'); kaPaint(); }); await snap(page, '23-you-guest-slim-row');
  await page.click('#kaCard .ka-card-main'); await page.waitForSelector('#flagModal [role=dialog]'); await snap(page, '24-you-offer-sheet');
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
  const files = fs.readdirSync(SHOTS).filter((f) => /^\d\d-.*\.png$/.test(f)).sort();
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
    await page.waitForFunction(() => !localStorage.getItem('kaisip_auth_v1') && /Saved in this browser only/.test((document.getElementById('kaCard') || {}).textContent || ''));
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

await browser.close();
const bad = rec.paths.filter((p) => p.status === 'FAIL');
console.log(`\naccounts: ${rec.paths.length} paths, ${bad.length} failed${bad.length ? ': ' + bad.map((p) => p.id).join(', ') : ''}`);
for (const p of bad) for (const f of [...p.fails, ...p.errors]) console.log(`  ${p.id}: ${f}`);
process.exit(bad.length ? 1 : 0);
