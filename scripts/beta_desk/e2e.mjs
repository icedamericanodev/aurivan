// Beta Desk end-to-end test: the real page in headless Chromium, talking to a
// REAL local Postgres (supabase/migrations + scripts/beta_desk/shim.sql), so
// every row rule (RLS), duplicate guard and calculated date is the database's
// own, not a copy. Only Supabase Auth is faked: the emailed code is 12345678
// and the authenticator (TOTP) code is 123456; tokens carry aal1 or aal2.
//
//   bash scripts/beta_desk/pg_local.sh          # fresh database "t"
//   node scripts/beta_desk/e2e.mjs [out_dir]    # screenshots + results
//
// Each REST call the page makes is translated to the SQL PostgREST would run,
// and executed AS the signed-in user (role authenticated + their JWT claims),
// exactly like Supabase. LOCAL TESTS ONLY: it never contacts the hosted project.
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { launch } from '../smoke/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.argv[2] || '/tmp/beta-desk-e2e');
fs.mkdirSync(OUT, { recursive: true });
const PGHOST = process.env.PGDIR || '/var/tmp/kpg';
const PGPORT = process.env.PGPORT_LOCAL || '55432';
const SUPA = 'https://ziadnvepttlgcowvqvom.supabase.co';
const CODE = '12345678';
const TOTP = '123456';
const ADMIN = 'owner@test.invalid';
const LEARNER = 'learner@test.invalid';

// ── Postgres bridge ───────────────────────────────────────────────────
function psql(sql, vars = {}) {
  const args = ['-h', PGHOST, '-p', PGPORT, '-U', 'postgres', '-d', 't', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
  for (const [k, v] of Object.entries(vars)) args.push('-v', `${k}=${v}`);
  try {
    return { ok: true, out: execFileSync('psql', args, { input: '\\set VERBOSITY verbose\n' + sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    const err = String(e.stderr || '');
    const m = /ERROR:\s+([0-9A-Z]{5}):\s+(.*)/.exec(err);
    return { ok: false, code: m ? m[1] : 'XX000', message: m ? m[2].trim() : err.trim() };
  }
}
const uuidFor = (email) => { const h = crypto.createHash('md5').update(email).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };
function asUser(uid, sql, vars, aal = 'aal2') {
  const claims = JSON.stringify({ sub: uid, role: 'authenticated', aal });
  return psql(`begin;\nset local role authenticated;\nset local request.jwt.claims to '${claims}';\n${sql}\ncommit;`, vars);
}
const COL = /^[a-z_]+$/;
function cols(obj) { const k = Object.keys(obj); if (!k.every((c) => COL.test(c))) throw new Error('bad column'); return k; }

function rest(uid, method, url, headers, bodyText, aal = 'aal2') {
  const u = new URL(url);
  const table = u.pathname.replace('/rest/v1/', '');
  if (!['beta_testers', 'beta_desk_settings', 'beta_desk_gate'].includes(table)) return { status: 404, body: { code: 'PGRST205', message: 'not found' } };
  const body = bodyText ? JSON.parse(bodyText) : null;
  const prefer = headers.prefer || '';
  let r;
  if (method === 'GET') {
    let off = 0, lim = 1000;
    const range = /^(\d+)-(\d+)$/.exec(headers.range || '');
    if (range) { off = +range[1]; lim = +range[2] - off + 1; }
    const order = table === 'beta_testers' ? 'order by registered_on desc, created_at desc' : '';
    r = asUser(uid, `select coalesce(json_agg(t), '[]') from (select * from public.${table} ${order} offset ${off} limit ${lim}) t;`, {}, aal);
  } else if (method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    const c = cols(rows[0]).join(', ');
    const conflict = u.searchParams.get('on_conflict') === 'email_key' && /ignore-duplicates/.test(prefer) ? 'on conflict (email_key) do nothing' : '';
    r = asUser(uid, `with i as (insert into public.${table} (${c}) select ${c} from json_populate_recordset(null::public.${table}, :'body'::json) ${conflict} returning *) select coalesce(json_agg(i), '[]') from i;`, { body: JSON.stringify(rows) }, aal);
  } else if (method === 'PATCH' || method === 'DELETE') {
    const where = [];
    const vars = {};
    for (const [k, v] of u.searchParams) {
      if (!COL.test(k) || !v.startsWith('eq.')) return { status: 400, body: { message: 'bad filter' } };
      vars[`f_${k}`] = v.slice(3);
      where.push(`${k} = :'f_${k}'`);
    }
    if (method === 'PATCH') {
      const c = cols(body).join(', ');
      vars.body = JSON.stringify(body);
      r = asUser(uid, `with u as (update public.${table} b set (${c}) = (select ${c} from json_populate_record(null::public.${table}, :'body'::json)) where ${where.join(' and ') || 'true'} returning b.*) select coalesce(json_agg(u), '[]') from u;`, vars, aal);
    } else {
      r = asUser(uid, `with d as (delete from public.${table} where ${where.join(' and ') || 'true'} returning *) select coalesce(json_agg(d), '[]') from d;`, vars, aal);
    }
  } else return { status: 405, body: {} };
  if (!r.ok) return { status: r.code === '42501' ? 403 : r.code === '23505' ? 409 : 400, body: { code: r.code, message: r.message } };
  const data = JSON.parse(r.out || '[]');
  return { status: method === 'POST' ? 201 : 200, body: data };
}

// ── Fake Supabase Auth (emailed code, then TOTP) ─────────────────────
const tokens = new Map(); // access token → { uid, email, aal }
const refreshTokens = new Map();
const factorsBy = new Map(); // uid → [{ id, factor_type, status }]
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function session(email, aal = 'aal1') {
  const uid = uuidFor(email);
  const at = `${b64u({ alg: 'none' })}.${b64u({ sub: uid, role: 'authenticated', aal, n: crypto.randomUUID() })}.sig`;
  const rt = 'rt-' + crypto.randomUUID();
  tokens.set(at, { uid, email, aal }); refreshTokens.set(rt, { email, aal });
  return { access_token: at, refresh_token: rt, expires_in: 3600, token_type: 'bearer', user: { id: uid, email } };
}
const calls = [];
async function handle(route) {
  const req = route.request();
  const url = req.url(); const method = req.method();
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const u = new URL(url); const h = req.headers();
  const text = req.postData();
  calls.push({ method, path: u.pathname + u.search, auth: !!h.authorization });
  const send = (status, body) => route.fulfill({ status, headers: cors, body: body === undefined ? '' : JSON.stringify(body) });
  if (u.pathname === '/functions/v1/beta-desk-sign-in') {
    return JSON.parse(text).email.toLowerCase() === ADMIN.toLowerCase()
      ? send(200, { sent: true }) : send(403, { error: 'not_admin' });
  }
  if (u.pathname === '/auth/v1/verify') {
    const b = JSON.parse(text);
    if (b.token !== CODE) return send(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    psql(`insert into auth.users (id, email, email_confirmed_at) values (:'id', :'em', now()) on conflict (id) do nothing;`, { id: uuidFor(b.email), em: b.email });
    return send(200, session(b.email));
  }
  if (u.pathname === '/auth/v1/token') {
    const b = JSON.parse(text); const rt = refreshTokens.get(b.refresh_token);
    if (!rt) return send(400, { error_code: 'refresh_token_not_found' });
    refreshTokens.delete(b.refresh_token); return send(200, session(rt.email, rt.aal));
  }
  if (u.pathname === '/auth/v1/logout') return send(204);
  const who = tokens.get((h.authorization || '').replace(/^Bearer /, ''));
  if (u.pathname === '/auth/v1/user') {
    if (!who) return send(401, {});
    return send(200, { id: who.uid, email: who.email, factors: factorsBy.get(who.uid) || [] });
  }
  if (u.pathname.startsWith('/auth/v1/factors')) {
    if (!who) return send(401, {});
    const list = factorsBy.get(who.uid) || []; factorsBy.set(who.uid, list);
    const m = /^\/auth\/v1\/factors(?:\/([^/]+))?(?:\/(challenge|verify))?$/.exec(u.pathname);
    if (!m[1] && method === 'POST') {
      const f = { id: crypto.randomUUID(), factor_type: 'totp', status: 'unverified' }; list.push(f);
      return send(200, { id: f.id, type: 'totp', totp: { qr_code: '<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#ffffff"/><path d="M10 10h40v40H10z M130 10h40v40h-40z M10 130h40v40H10z" fill="#000000"/></svg>', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/x' } });
    }
    const f = list.find((x) => x.id === m[1]);
    if (!f) return send(404, { error_code: 'mfa_factor_not_found' });
    if (method === 'DELETE') { list.splice(list.indexOf(f), 1); return send(200, { id: f.id }); }
    if (m[2] === 'challenge') return send(200, { id: 'ch-' + crypto.randomUUID() });
    if (m[2] === 'verify') {
      if (JSON.parse(text).code !== TOTP) return send(422, { error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
      f.status = 'verified'; return send(200, session(who.email, 'aal2'));
    }
  }
  if (u.pathname.startsWith('/rest/v1/')) {
    if (!who) return send(401, { code: 'PGRST301', message: 'JWT invalid' });
    const r = rest(who.uid, method, url, h, text, who.aal);
    return send(r.status, r.body);
  }
  return send(404, {});
}

// ── Static server for the repo ───────────────────────────────────────
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!(p === ROOT || p.startsWith(ROOT + path.sep)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/beta-desk.html`;

// ── Tests ────────────────────────────────────────────────────────────
const results = [];
let failed = 0;
function check(name, ok, detail = '') { results.push({ name, ok: !!ok, detail }); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const TODAY = iso(new Date());

// Fresh data: the admin list (as the owner would fill it) and an empty roster.
psql(`delete from public.beta_testers; delete from private.beta_desk_admins; delete from auth.users;
      insert into auth.users (id, email, email_confirmed_at) values ('${uuidFor(ADMIN)}', '${ADMIN}', now());
      insert into private.beta_desk_admins (user_id) values ('${uuidFor(ADMIN)}');
      update public.beta_desk_settings set registration_target = 50, signup_form_url = null;`);

const browser = await launch();
const consoleErrors = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, colorScheme: opts.dark ? 'dark' : 'light', acceptDownloads: true, deviceScaleFactor: opts.dsf || 1 });
  await ctx.route(SUPA + '/**', handle);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  // Expected 4xx answers (the wrong-code test) log 'Failed to load resource': not a script error.
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text()); });
  return { ctx, page };
}
async function signIn(page, email, totp = null) {
  await page.goto(BASE);
  await page.fill('#emailInput', email);
  await page.click('#sendCodeBtn');
  await page.waitForSelector('#codeForm:not([hidden])');
  await page.fill('#codeInput', CODE);
  await page.click('#verifyBtn');
  if (totp) {
    await page.waitForSelector('#mfaForm:not([hidden])');
    const setupShown = await page.isVisible('#mfaSetup');
    await page.fill('#mfaInput', totp);
    await page.click('#mfaBtn');
    return setupShown;
  }
  return null;
}
const toastText = (page) => page.$$eval('.toast', (els) => els.map((e) => e.textContent).join(' | '));

// 1. Access restrictions
{
  const { ctx, page } = await newPage();
  calls.length = 0;
  await page.goto(BASE);
  await page.waitForSelector('#gate:not([hidden])');
  check('signed out: only the sign-in screen shows', await page.isHidden('#app'));
  check('signed out: the page asks the database for nothing', calls.filter((c) => c.path.startsWith('/rest/')).length === 0);
  await page.screenshot({ path: path.join(OUT, '01-signin.png') });

  // A wrong code is refused.
  await page.fill('#emailInput', ADMIN); await page.click('#sendCodeBtn');
  await page.waitForSelector('#codeForm:not([hidden])');
  await page.fill('#codeInput', '00000000'); await page.click('#verifyBtn');
  await page.waitForSelector('#gateError:not([hidden])');
  check('a wrong code is refused', /wrong or has expired/.test(await page.textContent('#gateError')));
  await ctx.close();
}
// Seed one tester as the admin, straight in the database, to prove a learner can't see it.
asUser(uuidFor(ADMIN), `insert into public.beta_testers (full_name, email) values ('Seed Person', 'seed@test.invalid');`);
{
  const { ctx, page } = await newPage();
  await page.goto(BASE);
  await page.fill('#emailInput', LEARNER);
  calls.length = 0;
  await page.click('#sendCodeBtn');
  await page.waitForSelector('#gateError:not([hidden])');
  check('non-admin is rejected before code entry', await page.isHidden('#codeForm'));
  check('non-admin never calls Auth OTP or verify', !calls.some((c) => c.path.startsWith('/auth/')));
  check('rejection explains admin-only access', /not an admin account/.test(await page.textContent('#gateError')));
  check('a learner (not an admin) gets "No access"', await page.isHidden('#app'));
  check('a learner is never asked to set up an authenticator', await page.isHidden('#mfaForm'));
  check('the learner page holds no tester details', !(await page.content()).includes('seed@test.invalid'));
  const direct = rest(uuidFor(LEARNER), 'GET', SUPA + '/rest/v1/beta_testers?select=*', {}, null);
  check('a learner calling the database directly reads 0 testers (RLS)', direct.status === 200 && direct.body.length === 0, `got ${direct.body.length}`);
  const ins = rest(uuidFor(LEARNER), 'POST', SUPA + '/rest/v1/beta_testers', {}, JSON.stringify({ email: 'x@test.invalid' }));
  check('a learner cannot add a tester (RLS)', ins.status === 403, `status ${ins.status}`);
  const anon = psql(`set role anon; select count(*) from public.beta_testers;`);
  check('anon (no sign-in) cannot read testers at all', !anon.ok && anon.code === '42501');
  await page.screenshot({ path: path.join(OUT, '02-not-admin.png') });
  await ctx.close();
}
asUser(uuidFor(ADMIN), `delete from public.beta_testers;`);

// 2. Admin: empty state, add, persist, duplicates
const { ctx, page } = await newPage();
await signIn(page, ADMIN);
await page.waitForSelector('#mfaForm:not([hidden])');
check('an admin is asked for the second step after the email code', await page.isHidden('#app') && await page.isVisible('#mfaSetup'));
await page.waitForFunction(() => document.getElementById('mfaQr').complete);
check('first time: the authenticator set-up shows a QR code and a key', (await page.getAttribute('#mfaQr', 'src')).startsWith('data:image/svg+xml') && (await page.textContent('#mfaSecret')).includes('JBSW'));
check('the QR picture really draws (the Auth API sends bare SVG markup with # colours)', await page.$eval('#mfaQr', (i) => i.naturalWidth > 0));
const aal1 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('kaisip_desk_session_v1')).access_token);
const aal1Read = rest(uuidFor(ADMIN), 'GET', SUPA + '/rest/v1/beta_desk_settings?select=*', {}, null, 'aal1');
check('with only the email code (aal1), the database shows the admin nothing', aal1Read.status === 200 && aal1Read.body.length === 0 && aal1.length > 0);
await page.screenshot({ path: path.join(OUT, '01b-mfa-setup.png') });
await page.fill('#mfaInput', '000000'); await page.click('#mfaBtn');
await page.waitForSelector('#gateError:not([hidden])');
check('a wrong authenticator code is refused', /didn.t match/.test(await page.textContent('#gateError')));
await page.fill('#mfaInput', TOTP); await page.click('#mfaBtn');
await page.waitForSelector('#app:not([hidden])');
await page.waitForSelector('.empty h3');
check('the admin sees the desk and an empty roster', (await page.textContent('.empty h3')).includes('first cohort'));
await page.screenshot({ path: path.join(OUT, '03-empty-light.png'), fullPage: true });

async function addTester(name, email, device) {
  await page.click('#addBtn');
  await page.waitForSelector('#drawer.on');
  await page.fill('#dForm [name=full_name]', name);
  await page.fill('#dForm [name=email]', email);
  if (device) await page.fill('#dForm [name=device]', device);
  await page.click('#dSave');
}
await addTester('Ana Reyes', 'Ana.Reyes@test.invalid', 'Pixel 8');
await page.waitForSelector('tr[data-id]');
check('a tester added by hand appears on the roster', (await page.$$('tr[data-id]')).length === 1);
const dbRow = JSON.parse(asUser(uuidFor(ADMIN), `select json_agg(t) from public.beta_testers t;`).out)[0];
check('it is saved in the database (email key in lower case)', dbRow.email_key === 'ana.reyes@test.invalid' && dbRow.source === 'manual' && dbRow.terms_offered.length > 0);

await page.waitForSelector('#drawer', { state: 'hidden' });
await addTester('Duplicate', '  ANA.REYES@test.invalid ', '');
await page.waitForSelector('#dError:not([hidden])');
check('the same email in other case and spacing is refused on save (shown in the editor)', /already on the roster/.test(await page.textContent('#dError')));
check('while the editor is open, the page behind it is out of keyboard reach', await page.evaluate(() => document.getElementById('app').inert === true));
await page.fill('#dForm [name=email]', 'ana.reyes+beta@test.invalid');
await page.click('#dSave');
await page.waitForFunction(() => /same inbox/.test(document.getElementById('dError').textContent));
check('a "+tag" alias of an existing email is caught as the same tester', true);
await page.click('#dCancel');
await page.waitForSelector('#confirmDialog.on');
check('closing with unsaved typing asks first', (await page.textContent('#cfTitle')).includes('Discard'));
await page.click('#cfYes'); await page.waitForSelector('#drawer', { state: 'hidden' });
check('after closing, the page is reachable again', await page.evaluate(() => document.getElementById('app').inert === false));
// Prove the database refuses it too (not just the page).
const dup = rest(uuidFor(ADMIN), 'POST', SUPA + '/rest/v1/beta_testers', {}, JSON.stringify({ email: 'ANA.reyes@TEST.invalid ' }));
check('the database refuses the duplicate as well', dup.status === 409, `status ${dup.status}`);

await page.reload();
await page.waitForSelector('tr[data-id]');
check('after a reload the tester is still there (saved online, session kept in the tab)', (await page.$$('tr[data-id]')).length === 1);

// 3. CSV import: duplicates against the roster and inside the file, invalid emails, day/month dates
const csv = [
  'Timestamp,Email Address,Full name,Phone model,Anything else?',
  '"03/11/2026 09:15:00",new.one@test.invalid,New One,Galaxy S24,"Loves the app, ""really"""',
  '"04/11/2026 10:00:00",ANA.REYES@test.invalid,Ana Again,Pixel 8,',
  '"04/11/2026 11:00:00",new.one@test.invalid,New One Again,Galaxy,',
  '"28/10/2026 08:00:00",not-an-email,Broken,,',
  '"29/10/2026 08:00:00",  Third.Person@Test.invalid ,=HYPERLINK("http://x"),OnePlus 12,"Line one\nLine two"'
].join('\r\n');
const csvPath = path.join(OUT, 'responses.csv');
fs.writeFileSync(csvPath, '﻿' + csv);
await page.click('#importBtn');
await page.waitForSelector('#importDialog.on');
await page.setInputFiles('#impFile', csvPath);
await page.waitForSelector('#impStep2:not([hidden])');
check('import keeps only what the beta needs by default (other answers off)', !(await page.isChecked('#impKeep')));
await page.check('#impKeep');
const sum = await page.$$eval('#impSummary .s .num', (els) => els.map((e) => +e.textContent));
check('import preview: 2 new, 1 already on the roster, 1 repeated, 1 invalid', JSON.stringify(sum) === '[2,1,1,1]', JSON.stringify(sum));
check('the columns were detected automatically', (await page.$eval('[data-map=email]', (s) => s.selectedOptions[0].textContent)) === 'Email Address'
  && (await page.$eval('[data-map=device]', (s) => s.selectedOptions[0].textContent)) === 'Phone model');
check('day/month dates are recognised (28/10 can only be day/month)', (await page.$$eval('#impPreview tbody tr', (rs) => rs.map((r) => r.textContent).join(' '))).includes('29 Oct 2026'));
await page.screenshot({ path: path.join(OUT, '04-import-preview.png') });
await page.click('#impGo');
await page.waitForSelector('#importDialog', { state: 'hidden' });
await page.waitForFunction(() => document.querySelectorAll('tr[data-id]').length === 3);
check('the import added exactly the 2 new testers', (await page.$$('tr[data-id]')).length === 3);
const imported = JSON.parse(asUser(uuidFor(ADMIN), `select json_agg(t order by email_key) from public.beta_testers t where source = 'form_csv';`).out);
check('imported rows: registered date from the form, other answers kept in notes',
  imported[0].email_key === 'new.one@test.invalid' && imported[0].registered_on === '2026-11-03' && imported[0].notes.includes('Loves the app, "really"')
  && imported[1].email === 'Third.Person@Test.invalid' && imported[1].registered_on === '2026-10-29', JSON.stringify(imported.map((r) => [r.email, r.registered_on])));
// Same file again: nothing new.
await page.click('#importBtn'); await page.waitForSelector('#importDialog.on');
await page.setInputFiles('#impFile', csvPath);
await page.waitForSelector('#impStep2:not([hidden])');
check('importing the same file again adds nobody', await page.isDisabled('#impGo') && (await page.textContent('#impGo')).includes('Nothing new'));
await page.click('#importDialog [data-close]'); await page.waitForSelector('#importDialog', { state: 'hidden' });
// Another device added one of them a moment ago: the database skips it instead of failing.
const race = rest(uuidFor(ADMIN), 'POST', SUPA + '/rest/v1/beta_testers?on_conflict=email_key', { prefer: 'resolution=ignore-duplicates,return=representation' },
  JSON.stringify([{ email: 'NEW.ONE@test.invalid', source: 'form_csv' }, { email: 'fourth@test.invalid', source: 'form_csv' }]));
check('a batch with an email added elsewhere skips it and saves the rest', race.status === 201 && race.body.length === 1 && race.body[0].email === 'fourth@test.invalid');
asUser(uuidFor(ADMIN), `delete from public.beta_testers where email_key = 'fourth@test.invalid';`);

// 4. Date calculations, through the page and the database
const bd = await page.evaluate(() => {
  const B = window.KaiSipDesk.BD;
  const EARLY = 'Stay in the Android test for 14 days, or send at least one piece of feedback during the beta. Reward: 6 months of KaiSip Premium free once paid features launch.';
  const NEWT = 'Join the Android closed test before the public Google Play launch, stay opted in for at least 14 consecutive days and try the CISA content and app features. A technical problem that blocks testing does not disqualify you. Reward: 6 months of CISA premium content and mobile app study features, starting when your CISA access is activated. Other certifications are excluded.';
  return {
    m1: B.addMonths('2026-08-31', 6), m2: B.addMonths('2027-08-31', 6), m3: B.addMonths('2026-11-10', 6), m4: B.addMonths('2026-12-15', 6),
    d1: B.addDays('2026-10-25', 14), d2: B.addDays('2026-03-20', 14), d3: B.addDays('2026-12-25', 14),
    st1: B.stage({ registered_on: '2026-11-01', opted_in_on: null }, '2026-11-04'),
    st2: B.stage({ registered_on: '2026-10-01', invited_on: '2026-10-02', opted_in_on: '2026-10-25' }, '2026-11-07'),
    st3: B.stage({ registered_on: '2026-10-01', invited_on: '2026-10-02', opted_in_on: '2026-10-25' }, '2026-11-08'),
    reg: B.reviewDue({ registered_on: '2026-09-01', opted_in_on: '2026-10-25' }),
    early: B.canApprove({ opted_in_on: '2026-10-25', participation: 'continuous', terms_offered: 'T' }, '2026-11-07'),
    onTime: B.canApprove({ opted_in_on: '2026-10-25', participation: 'continuous', terms_offered: 'T' }, '2026-11-08'),
    cell: B.csvCell('=HYPERLINK("x")'), cellPlain: B.csvCell('Ana "A" Reyes'),
    o1: B.dateOrder(['03/11/2026 09:00', '28/10/2026']), o2: B.dateOrder(['11/03/2026', '10/28/2026']), o3: B.dateOrder(['03/11/2026', '04/11/2026']), o4: B.dateOrder(['2026/11/04 2:03:22 PM GMT+8']),
    g1: B.parseFormDate('2026/11/04 2:03:22 PM GMT+8', 'mdy'),
    c2: B.csvCell(' =1+1'), c3: B.csvCell('\n=1'), c4: B.csvCell('\uFF1D1'), c5: B.csvCell('-5 days'),
    ik: [B.inboxKey('J.O.H.N+beta@Gmail.com'), B.inboxKey('john@googlemail.com'), B.inboxKey('a.b+x@test.invalid')].join(' '),
    del1: B.actions({ registered_on: '2026-01-01', invited_on: '2026-01-02', opted_in_on: '2026-01-03', completion: 'approved', approved_on: '2026-01-20', participation: 'continuous', reward_activated_on: '2026-01-20' }, '2026-07-21').map((a) => a.key).join(','),
    fb1: B.canApprove({ registered_on: '2026-10-01', terms_offered: EARLY, last_feedback_on: '2026-10-05', participation: 'unchecked' }, '2026-10-06'),
    fb2: B.canApprove({ registered_on: '2026-10-01', terms_offered: EARLY, last_feedback_on: '2026-10-05', participation: 'unchecked' }, '2026-10-06', '2026-10-04'),
    fb3: B.actions({ registered_on: '2026-10-01', invited_on: '2026-10-02', terms_offered: EARLY, last_feedback_on: '2026-10-05', participation: 'unchecked', completion: 'pending' }, '2026-10-06')[0].key,
    fb5: B.canApprove({ registered_on: '2026-10-01', terms_offered: NEWT, last_feedback_on: '2026-10-05', participation: 'unchecked' }, '2026-10-06'),
    fb6: B.actions({ registered_on: '2026-10-01', invited_on: '2026-10-02', terms_offered: NEWT, last_feedback_on: '2026-10-05', participation: 'unchecked', completion: 'pending' }, '2026-10-06').map((a) => a.key).join(','),
    // The live form's exact column titles (checked 4 Nov 2026), including the yes/no credit question that also says "your name".
    elig: (() => {
      const H = ['Timestamp', 'Email Address', 'Do you have an Android device with access to Google Play?', 'Which country are you in? ', 'When is your CISA exam? ',
        'Which other certifications interest you? (Optional; separate paid content, not included in this beta or reward.)', 'How did you find us? ', 'Testing commitment',
        'Would you like your name in the app\'s "Thank you, beta testers" screen? ', 'Name or handle to show.\n(Max 24 characters. No links, emails or rude words. We check every name before adding it. Leave blank if you chose anonymous.) ', 'Email me when the iPhone app is ready.', 'Please confirm. '];
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const rows = [H,
        ['2026/11/02 9:15:03 PM GMT+8', 'ana@test.invalid', 'Android', 'Philippines', '1–3 months', 'CISM;CRISC', 'Reddit', 'I plan…', 'Yes, show my name or handle', 'Ann', '', "I'm 18 or older."],
        ['2026/11/04 10:01:44 AM GMT+8', 'ben@test.invalid', 'No eligible Android device / no Google Play access', 'Singapore', '', '', '', '', '', '', '', ''],
        ['2026/11/04 11:30:00 AM GMT+8', 'carla@test.invalid', 'Android', 'UAE', '', '', '', '', 'No, keep me anonymous', '', '', '']];
      const parsed = B.parseCSV(rows.map((r) => r.map(q).join(',')).join('\r\n'));
      const map = B.guessColumns(parsed[0]);
      const plan = B.planImport(parsed, map, {}, { order: 'mdy', keepOther: false, today: '2026-11-04' });
      return [plan.counts.add, plan.counts.ineligible, map.device, plan.rows[0].full_name, plan.rows[2].full_name, plan.rows[0].registered_on, map.email, map.name].join(',');
    })(),
    fb4: B.stage({ registered_on: '2026-10-01', participation: 'interrupted', last_feedback_on: '2026-10-03', completion: 'pending' }, '2026-10-06'),
    del2: B.actions({ registered_on: '2026-01-01', participation: 'interrupted', completion: 'pending' }, '2026-02-01').map((a) => a.key).join(',')
  };
});
check('6 months from 31 Aug 2026 = 28 Feb 2027 (page)', bd.m1 === '2027-02-28', bd.m1);
check('6 months from 31 Aug 2027 = 29 Feb 2028, a leap year (page)', bd.m2 === '2028-02-29', bd.m2);
check('6 months from 10 Nov 2026 = 10 May 2027, and across a year end', bd.m3 === '2027-05-10' && bd.m4 === '2027-06-15', bd.m3 + ' ' + bd.m4);
check('opt-in + 14 days, also across daylight saving and a year end', bd.d1 === '2026-11-08' && bd.d2 === '2026-04-03' && bd.d3 === '2027-01-08');
check('the review counts from the opt-in, not the registration', bd.reg === '2026-11-08');
check('stage: testing on day 13, ready for review on day 14', bd.st1 === 'registered' && bd.st2 === 'testing' && bd.st3 === 'review');
check('approval is not allowed before day 14, allowed on day 14', bd.early === false && bd.onTime === true);
check('CSV export neutralises spreadsheet formulas and quotes', bd.cell === '"\'=HYPERLINK(""x"")"' && bd.cellPlain === '"Ana ""A"" Reyes"');
// The page and the database agree on the dates.
const pgDates = psql(`select (date '2026-08-31' + interval '6 months')::date, (date '2027-08-31' + interval '6 months')::date, date '2026-10-25' + 14;`).out;
check('CSV export also neutralises formulas after spaces, line breaks and full-width signs', [bd.c2, bd.c3, bd.c4, bd.c5].every((c) => c.startsWith('"\'')), [bd.c2, bd.c3, bd.c4, bd.c5].join(' '));
check('Gmail dots and "+tags" reach the same inbox', bd.ik === 'john@gmail.com john@gmail.com a.b@test.invalid', bd.ik);
check('after the reward ends, and for testers who are not eligible, the desk says "delete their record"', bd.del1 === 'delete' && bd.del2 === 'delete', bd.del1 + ' / ' + bd.del2);
check('earlier sign-ups whose terms allow it: one piece of feedback qualifies without the 14 days, but not before the feedback date', bd.fb1 === true && bd.fb2 === false, bd.fb1 + ' ' + bd.fb2);
check('feedback route: a tester with feedback gets "approve" as their next step', bd.fb3 === 'approve', bd.fb3);
check('feedback route: a tester who left early but sent feedback is not closed', bd.fb4 !== 'closed', bd.fb4);
check('new testers (the live form terms): feedback alone does not qualify, and the desk never suggests it', bd.fb5 === false && !bd.fb6.includes('approve'), bd.fb5 + ' / ' + bd.fb6);
check('live form CSV: email, timestamp and the credit handle land in the right fields; no-Android rows skipped; the yes/no credit answer is never used as a name', bd.elig === '2,1,-1,Ann,,2026-11-02,1,9', bd.elig);
check('date order is read from the whole file: day-first, month-first, or ask', bd.o1 === 'dmy' && bd.o2 === 'mdy' && bd.o3 === '' && bd.o4 === 'mdy', [bd.o1, bd.o2, bd.o3, bd.o4].join(','));
check('a Google Forms timestamp (2026/11/04 2:03:22 PM GMT+8) reads as 4 Nov 2026', bd.g1 === '2026-11-04', bd.g1);
check('the database calculates the same dates', pgDates === '2027-02-28|2028-02-29|2026-11-08', pgDates);

// Walk Ana through the whole programme in the drawer.
const anaRow = await page.$('tr[data-id]:has-text("Ana Reyes")');
await anaRow.click(); await page.waitForSelector('#drawer.on');
const optIn = daysAgo(15), invited = daysAgo(16);
await page.fill('#dForm [name=invited_on]', invited);
await page.fill('#dForm [name=opted_in_on]', optIn);
await page.dispatchEvent('#dForm', 'input');
const reviewText = await page.textContent('#calcReview');
const expectReview = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
check('the drawer shows the review date: opt-in + 14 days (Auto)', reviewText.includes(`${expectReview.getDate()} ${MON[expectReview.getMonth()]} ${expectReview.getFullYear()}`) && reviewText.includes('Auto'), reviewText.trim());
check('approval is greyed out until participation is checked', await page.$eval('#dForm [name=completion] option[value=approved]', (o) => o.disabled));
await page.check('#dForm input[name=participation][value=continuous]');
await page.fill('#dForm [name=last_feedback_on]', daysAgo(3));
await page.fill('#dForm [name=feedback_summary]', 'Smooth on Pixel 8; one crash on the mock exam.');
check('approval is allowed once the checks pass', !(await page.$eval('#dForm [name=completion] option[value=approved]', (o) => o.disabled)));
await page.selectOption('#dForm [name=completion]', 'approved');
await page.fill('#dForm [name=reward_activated_on]', TODAY);
await page.dispatchEvent('#dForm', 'input');
const rewardText = await page.textContent('#calcReward');
const endExpected = await page.evaluate((t) => window.KaiSipDesk.BD.fmt(window.KaiSipDesk.BD.addMonths(t, 6)), TODAY);
check('the drawer shows the reward end: activation + 6 months, CISA only', rewardText.includes(endExpected) && (await page.textContent('#drawer')).includes('Other certification content is not included'));
await page.screenshot({ path: path.join(OUT, '05-drawer-light.png') });
await page.click('#dSave');
await page.waitForSelector('#drawer', { state: 'hidden' });
const ana = JSON.parse(asUser(uuidFor(ADMIN), `select row_to_json(t) from public.beta_testers t where email_key = 'ana.reyes@test.invalid';`).out);
const pgEnd = psql(`select (date '${TODAY}' + interval '6 months')::date;`).out;
check('saved: the database worked out review and reward dates', ana.review_due_on === daysAgo(1) && ana.reward_ends_on === pgEnd && ana.completion === 'approved' && ana.approved_on === TODAY, `${ana.review_due_on} ${ana.reward_ends_on}`);
check('the CISA rewards card counts her', (await page.textContent('#stRewards')).trim() === '1');

// The database refuses an approval before day 14 even if the page were bypassed.
const third = JSON.parse(asUser(uuidFor(ADMIN), `select row_to_json(t) from public.beta_testers t where email_key = 'third.person@test.invalid';`).out);
const early = rest(uuidFor(ADMIN), 'PATCH', `${SUPA}/rest/v1/beta_testers?id=eq.${third.id}`, {}, JSON.stringify({ opted_in_on: daysAgo(5), participation: 'continuous', participation_checked_on: TODAY, completion: 'approved', approved_on: TODAY }));
check('the database refuses an approval on day 5', early.status === 400 && /beta_testers_approval_rules/.test(early.body.message), early.body.message);

// 5. Needs attention, follow-ups, filters, search
asUser(uuidFor(ADMIN), `update public.beta_testers set invited_on = '${daysAgo(6)}', registered_on = '${daysAgo(8)}' where email_key = 'new.one@test.invalid';
                       update public.beta_testers set follow_up_on = '${TODAY}', follow_up_note = 'Ask about OnePlus install' where email_key = 'third.person@test.invalid';`);
await page.click('#refreshBtn');
await page.waitForFunction(() => document.querySelector('#stAttn').textContent.trim() !== '0');
check('needs attention: the stale invite and the due follow-up', (await page.textContent('#stAttn')).trim() === '2', await page.textContent('#stAttn'));
await page.click('.nav button[data-view=actions]');
const acts = await page.textContent('#actionsBody');
check('next actions list both, as your steps', acts.includes('Nudge them to opt in') && acts.includes('Ask about OnePlus install'));
await page.screenshot({ path: path.join(OUT, '06-actions-light.png'), fullPage: true });
await page.click('.nav button[data-view=testers]');
await page.selectOption('#filter', 'rewarded');
check('filter: CISA reward active shows only Ana', (await page.$$('tr[data-id]')).length === 1 && (await page.textContent('#rosterBody')).includes('Ana Reyes'));
await page.selectOption('#filter', 'all');
await page.fill('#q', 'oneplus');
check('search finds a tester by device', (await page.$$('tr[data-id]')).length === 1 && (await page.textContent('#rosterBody')).includes('Third.Person'));
await page.fill('#q', '');

// 6. Export
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
const exp = fs.readFileSync(await dl.path(), 'utf8');
check('export: one row per tester plus a header', exp.trim().split('\r\n').length === 4 || exp.split('\r\n').filter((l) => /@test\.invalid/i.test(l)).length === 3);
check('export: calculated dates included and formulas neutralised', exp.includes('Review due (auto: opt-in + 14 days)') && exp.includes(pgEnd) && exp.includes('"\'=HYPERLINK(""http://x"")"'));

// 7. Settings saved online
await page.click('.nav button[data-view=settings]');
await page.fill('#setTarget', '25');
await page.fill('#setForm', 'javascript:alert(1)');
await page.click('#saveSettings');
await page.waitForSelector('.toast.err');
check('settings: a non-https form link is refused', /https/.test(await toastText(page)));
await page.fill('#setForm', 'https://forms.gle/example');
await page.click('#saveSettings');
await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('Settings saved')));
check('settings: saved in the database', psql(`select registration_target || ' ' || signup_form_url from public.beta_desk_settings;`).out === '25 https://forms.gle/example');
check('the signup form link shows in the sidebar', await page.isVisible('#signupLink'));
await page.click('.nav button[data-view=testers]');

// 8. Someone else changed the tester: no silent overwrite
const newOne = JSON.parse(asUser(uuidFor(ADMIN), `select row_to_json(t) from public.beta_testers t where email_key = 'new.one@test.invalid';`).out);
await page.click(`tr[data-id="${newOne.id}"]`); await page.waitForSelector('#drawer.on');
asUser(uuidFor(ADMIN), `update public.beta_testers set notes = 'changed on the phone' where id = '${newOne.id}';`);
await page.fill('#dForm [name=notes]', 'changed on the laptop');
await page.click('#dSave');
await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('changed somewhere else')));
check('an edit made elsewhere is never overwritten silently', JSON.parse(asUser(uuidFor(ADMIN), `select row_to_json(t) from public.beta_testers t where id = '${newOne.id}';`).out).notes === 'changed on the phone');

// 9. Delete
await page.waitForSelector('#drawer', { state: 'hidden' });
await page.click(`tr[data-id="${newOne.id}"]`); await page.waitForSelector('#drawer.on');
await page.click('#dDelete'); await page.waitForSelector('#confirmDialog.on');
await page.screenshot({ path: path.join(OUT, '07-delete-confirm.png') });
await page.click('#cfYes');
await page.waitForFunction(() => document.querySelectorAll('tr[data-id]').length === 2);
check('delete: the record is gone from the roster and the database', psql(`select count(*) from public.beta_testers where id = '${newOne.id}';`).out === '0');

// 9b. A failed load never pretends the roster is empty
await page.route(SUPA + '/rest/v1/beta_testers*', (r) => (r.request().method() === 'GET' ? r.abort('failed') : r.fallback()));
await page.reload();
await page.waitForSelector('#rosterBody [role=alert]');
const errText = await page.textContent('#rosterBody');
check('a failed load says so and offers "Try again" (never "first cohort")', errText.includes('load') && errText.includes('Try again') && !errText.includes('first cohort'));
await page.screenshot({ path: path.join(OUT, '11-load-error.png') });
await page.unroute(SUPA + '/rest/v1/beta_testers*');
await page.click('[data-act=retry]');
await page.waitForSelector('tr[data-id]');
check('"Try again" loads the roster', (await page.$$('tr[data-id]')).length === 2);

// 10. Screens: desktop light/dark, phone
await page.screenshot({ path: path.join(OUT, '08-roster-light.png'), fullPage: true });
const sessionKept = await page.evaluate(() => [sessionStorage.getItem('kaisip_desk_session_v1') !== null, localStorage.getItem('kaisip_desk_session_v1') === null]);
check('the session lives in this tab only (never in storage other pages can read later)', sessionKept[0] && sessionKept[1]);
await page.click('#signOutBtn');
await page.waitForSelector('#gate:not([hidden])');
check('sign out clears the session and the roster', await page.evaluate(() => sessionStorage.getItem('kaisip_desk_session_v1') === null) && !(await page.content()).includes('ana.reyes'));
await ctx.close();

for (const v of [{ name: 'dark', dark: true, viewport: { width: 1440, height: 900 } }, { name: 'phone-light', viewport: { width: 390, height: 844 } }, { name: 'phone-dark', dark: true, viewport: { width: 390, height: 844 } }]) {
  const p = await newPage({ ...v, dsf: 2 });
  const setupShown = await signIn(p.page, ADMIN, TOTP);
  await p.page.waitForSelector('tr[data-id]');
  await p.page.screenshot({ path: path.join(OUT, `09-roster-${v.name}.png`), fullPage: true });
  const overflow = await p.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${v.name}: no sideways scrolling`, overflow <= 0, `overflow ${overflow}px`);
  await p.page.click('tr[data-id]:has-text("Ana Reyes")');
  await p.page.waitForSelector('#drawer.on'); await p.page.waitForTimeout(350);
  await p.page.screenshot({ path: path.join(OUT, `10-drawer-${v.name}.png`) });
  if (v.name === 'dark') check('next sign-in: only the authenticator code, no set-up again', setupShown === false);
  await p.ctx.close();
}

check('no script errors in any page', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
await browser.close();
server.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ failed, results }, null, 2));
console.log(`\n${results.length - failed}/${results.length} passed · screenshots in ${OUT}`);
process.exit(failed ? 1 : 0);

