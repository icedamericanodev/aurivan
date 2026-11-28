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
const PW = 'ocean violet lamp seven';
const PW2 = 'copper falcon wobbly harbor';
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
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
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
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: `window.__ts={n:0,opts:null,actions:[]};window.turnstile={render:function(el,o){window.__ts.opts=o;window.__ts.actions.push(o.action);el.setAttribute('data-ts','1');var k=++window.__ts.n;setTimeout(function(){o.callback('ts-token-'+k);},30);return 'w1';},reset:function(){var o=window.__ts.opts;var k=++window.__ts.n;setTimeout(function(){o&&o.callback('ts-token-'+k);},30);},remove:function(){}};` });
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
const text = async (page, sel) => norm(await page.locator(sel).first().innerText().catch(() => ''));
const store = (page) => page.evaluate(() => { const o = { local: {}, session: {} }; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o.local[k] = localStorage.getItem(k); } for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); o.session[k] = sessionStorage.getItem(k); } return o; });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// The elements that reach past the right edge (for an overflow failure's message).
const wide = (page) => page.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 6).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : '') + ':' + Math.round(e.getBoundingClientRect().right)).join(' '); });
async function noOverflow(page, c, label) { const o = await overflow(page); c.check(o <= 0, `sideways scroll on ${label} (${o}px): ${o > 0 ? await wide(page) : ''}`); }
async function axe(page, c, label) {
  if (!axeSrc) { c.note('axe-core not found: accessibility scan skipped for ' + label); return; }
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  });
  c.check(r.length === 0, `axe on ${label}: ${r.join('; ')}`);
}
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
      await page.waitForFunction(() => document.getElementById('kaPassE').textContent.length > 0);
      const err = await text(page, '#kaPassE');
      c.check(/^Email or password is incorrect/.test(err), 'the generic sign-in error: ' + err);
      c.check((await page.getAttribute('#kaPassE', 'role')) === 'alert' && (await page.getAttribute('#kaPass', 'aria-invalid')) === 'true' && (await page.getAttribute('#kaPass', 'aria-describedby')).includes('kaPassE'), 'the error is an alert tied to the field');
      c.check(await page.evaluate(() => document.activeElement.id === 'kaPass'), 'focus moves to the field with the error');
      const sent = calls(server, '/auth/v1/token')[0];
      c.check(sent && /^ts-token-/.test(sent.body.gotrue_meta_security?.captcha_token || ''), 'the human-check token travels with the sign-in');
      // An unknown address gets the very same words.
      await page.fill('#kaEmail', 'nobody@example.com');
      await page.press('#kaPass', 'Enter');
      await page.waitForFunction(() => document.getElementById('kaPassE').textContent.length > 0);
      c.check((await text(page, '#kaPassE')) === err, 'an unknown address reads the same as a wrong password');
      c.check(!/invalid login|credentials|supabase|gotrue/i.test(await text(page, '#kaRoot')), 'no server text on the screen');
      await c.shot(`a1-${v}-error`);
      // Rate limited, then offline: calm words.
      await page.fill('#kaEmail', EMAIL);
      server.force('/auth/v1/token', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }, { 'Retry-After': '30' });
      await page.press('#kaPass', 'Enter');
      await page.waitForFunction(() => /Too many tries/.test(document.getElementById('kaFormE').textContent));
      c.check(/wait 30 seconds/.test(await text(page, '#kaFormE')), 'a rate limit says how long to wait: ' + (await text(page, '#kaFormE')));
      server.offline = true;
      await page.press('#kaPass', 'Enter');
      await page.waitForFunction(() => /offline/.test(document.getElementById('kaFormE').textContent));
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

await browser.close();
const bad = rec.paths.filter((p) => p.status === 'FAIL');
console.log(`\naccounts: ${rec.paths.length} paths, ${bad.length} failed${bad.length ? ': ' + bad.map((p) => p.id).join(', ') : ''}`);
for (const p of bad) for (const f of [...p.fails, ...p.errors]) console.log(`  ${p.id}: ${f}`);
process.exit(bad.length ? 1 : 0);
