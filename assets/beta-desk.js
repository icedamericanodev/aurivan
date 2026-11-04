/* KaiSip Beta Desk: the page's code (loaded by beta-desk.html). See that page and
   docs/beta/BETA_DESK.md. Plain JavaScript, no libraries, no build step. */
'use strict';
/* ───────────────────────────────────────────────────────────────────────
   KaiSip Beta Desk (plain JavaScript, no libraries).

   How it is kept private:
   - This page holds no tester data and no secret. The two values below are
     PUBLIC on purpose (every KaiSip browser sends them): the project address
     and the publishable key. They give no more access than a signed-out
     visitor has.
   - Tester rows come from the database only after an admin signs in with an
     emailed code. The database's row rules (RLS) check, on every request,
     that the signed-in email is on the Beta Desk admin list. A non-admin
     simply reads nothing.
   - The sign-in is kept in this tab only (sessionStorage) unless "Keep me
     signed in" is ticked (localStorage). Its key is new and touches no
     learner's saved progress.
   - Everything a tester typed is shown with textContent / escaped HTML, so a
     name that looks like HTML is shown as plain text.
   ─────────────────────────────────────────────────────────────────────── */
var SUPABASE_URL = 'https://ziadnvepttlgcowvqvom.supabase.co';
var PUBLISHABLE_KEY = 'sb_publishable_s9eKQUQ0w3MTnCUBF05EkA_5e_kGEw2';
var TURNSTILE_SITE_KEY = '0x4AAAAAAFptlSqMhAvLUI8w';
var SESSION_KEY = 'kaisip_desk_session_v1';

/* ── Pure helpers (no page, no network): dates, stages, CSV ─────────── */
var BD = (function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var REVIEW_DAYS = 14;      // Google Play: 14 days in a row
  var REWARD_MONTHS = 6;     // six months of CISA premium

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /** Today in the admin's own time zone, as YYYY-MM-DD. */
  function todayISO(now) {
    var d = now || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parts(iso) {
    var m = ISO.exec(iso || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = new Date(Date.UTC(y, mo - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }
  function isISO(iso) { return parts(iso) !== null; }
  function fromUTC(t) { return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
  /** Date-only arithmetic in UTC, so daylight saving never shifts a day. */
  function addDays(iso, n) {
    var p = parts(iso); if (!p) return null;
    return fromUTC(new Date(Date.UTC(p.y, p.m - 1, p.d + n)));
  }
  /** Calendar months, clamped to the month's last day (31 Aug + 6 = 28/29 Feb), like Postgres. */
  function addMonths(iso, n) {
    var p = parts(iso); if (!p) return null;
    var total = p.y * 12 + (p.m - 1) + n;
    var y = Math.floor(total / 12), m = total % 12;
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return fromUTC(new Date(Date.UTC(y, m, Math.min(p.d, last))));
  }
  /** Whole days from a to b (b - a). */
  function daysBetween(a, b) {
    var pa = parts(a), pb = parts(b); if (!pa || !pb) return null;
    return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
  }
  function fmt(iso) {
    var p = parts(iso); if (!p) return '—';
    return p.d + ' ' + MONTHS[p.m - 1] + ' ' + p.y;
  }
  function reviewDue(t) { return t.opted_in_on ? addDays(t.opted_in_on, REVIEW_DAYS) : null; }
  function rewardEnds(t) { return t.reward_activated_on ? addMonths(t.reward_activated_on, REWARD_MONTHS) : null; }
  function emailKey(e) { return String(e || '').trim().toLowerCase(); }
  function validEmail(e) { var s = String(e || '').trim(); return s.length >= 3 && s.length <= 254 && EMAIL.test(s); }

  /**
   * The tester's stage, from the dates alone:
   * registered → invited → testing → review → approved → rewarded → reward_ended,
   * or closed (not eligible / interrupted).
   */
  function stage(t, today) {
    if (t.completion === 'not_eligible' || t.participation === 'interrupted') return 'closed';
    if (t.completion === 'approved') {
      if (t.reward_activated_on && t.reward_activated_on <= today) {
        var ends = t.reward_ends_on || rewardEnds(t);
        return today < ends ? 'rewarded' : 'reward_ended';
      }
      return 'approved';
    }
    if (t.opted_in_on) {
      var due = t.review_due_on || reviewDue(t);
      return today >= due ? 'review' : 'testing';
    }
    if (t.invited_on) return 'invited';
    return 'registered';
  }
  var STAGES = {
    registered:   { label: 'Registered',        tone: '' },
    invited:      { label: 'Invited',           tone: 'tip' },
    testing:      { label: 'Testing',           tone: 'green' },
    review:       { label: 'Ready for review',  tone: 'clay' },
    approved:     { label: 'Approved',          tone: 'green' },
    rewarded:     { label: 'CISA reward active', tone: 'forest' },
    reward_ended: { label: 'Reward ended',      tone: '' },
    closed:       { label: 'Not eligible',      tone: 'red' }
  };

  /** What approval needs, and whether each is met (the database enforces the first four). */
  function approvalChecks(t, today, onDate) {
    var due = t.opted_in_on ? addDays(t.opted_in_on, REVIEW_DAYS) : null;
    var when = onDate || today;
    return [
      { key: 'optin', ok: !!t.opted_in_on, req: true, text: t.opted_in_on ? 'Google Play opt-in recorded (' + fmt(t.opted_in_on) + ')' : 'Record the Google Play opt-in date' },
      { key: 'days', ok: !!due && when >= due, req: true, text: due ? (when >= due ? '14 days reached on ' + fmt(due) : '14 days reached on ' + fmt(due) + ' (' + daysBetween(when, due) + ' to go)') : '14 days counted from the opt-in' },
      { key: 'part', ok: t.participation === 'continuous' || t.participation === 'interrupted_technical', req: true, text: t.participation === 'continuous' ? 'Continuous participation checked' : t.participation === 'interrupted_technical' ? 'Technical gap checked and accepted' : t.participation === 'interrupted' ? 'Participation was interrupted' : 'Check continuous participation' },
      { key: 'terms', ok: String(t.terms_offered || '').trim().length > 0, req: true, text: 'Eligibility terms on record' },
      { key: 'feedback', ok: !!t.last_feedback_on, req: false, text: t.last_feedback_on ? 'Feedback received (' + fmt(t.last_feedback_on) + ')' : 'No feedback recorded yet (recommended)' }
    ];
  }
  function canApprove(t, today, onDate) {
    return approvalChecks(t, today, onDate).every(function (c) { return c.ok || !c.req; });
  }

  /**
   * The next steps for one tester. `attn` marks the ones that need you now.
   * Every step is something the admin does by hand (who: 'you'), except the
   * scheduled review, which the desk works out (who: 'auto').
   */
  function actions(t, today) {
    var out = [];
    var s = stage(t, today);
    function add(key, label, why, attn, due) { out.push({ key: key, label: label, why: why, attn: attn, due: due || null }); }
    if (s === 'registered') {
      var waited = daysBetween(t.registered_on, today);
      add('invite', 'Send the Google Play invite', 'Registered ' + ago(waited) + '. Add them to the closed test, then record the invite.', waited >= 2, addDays(t.registered_on, 2));
    } else if (s === 'invited') {
      var w = daysBetween(t.invited_on, today);
      add('optin', w >= 3 ? 'Nudge them to opt in' : 'Confirm their Play opt-in', 'Invited ' + ago(w) + ', no opt-in recorded. Check Play Console, then record the real opt-in date.', w >= 3, addDays(t.invited_on, 3));
    } else if (s === 'testing') {
      var day = daysBetween(t.opted_in_on, today);
      var due = t.review_due_on || reviewDue(t);
      if (!t.last_feedback_on && day >= 10) add('feedback', 'Ask for feedback', 'Day ' + day + ' of 14 and no feedback recorded yet.', true, addDays(t.opted_in_on, 10));
      add('wait', 'Review on ' + fmt(due), 'Worked out from the Google Play opt-in on ' + fmt(t.opted_in_on) + '.', false, due);
    } else if (s === 'review') {
      if (t.participation === 'unchecked') add('check', 'Check 14 days of participation', 'The review date (' + fmt(t.review_due_on || reviewDue(t)) + ') has come. Confirm they stayed opted in every day.', true, t.review_due_on || reviewDue(t));
      else if (canApprove(t, today)) add('approve', 'Approve completion', 'Every check has passed. Approve, then switch on their CISA reward.', true, today);
      else add('approve', 'Finish the checks to approve', 'Some approval checks are still open.', true, today);
    } else if (s === 'approved') {
      if (t.reward_activated_on) add('scheduled', 'Reward starts ' + fmt(t.reward_activated_on), 'Recorded as switched on from that day.', false, t.reward_activated_on);
      else add('reward', 'Switch on 6 months of CISA', 'Approved on ' + fmt(t.approved_on) + '. Turn on CISA premium for them in the app, then record the date.', true, t.approved_on);
    } else if (s === 'rewarded') {
      var ends = t.reward_ends_on || rewardEnds(t);
      var left = daysBetween(today, ends);
      if (left <= 14) add('ending', 'Reward ends ' + fmt(ends), left + ' day' + (left === 1 ? '' : 's') + ' left. A good moment for a thank-you.', true, addDays(ends, -14));
    }
    if (t.follow_up_on && t.follow_up_on <= today) add('follow', 'Follow up' + (t.follow_up_note ? ': ' + t.follow_up_note : ''), 'Follow-up date ' + fmt(t.follow_up_on) + '.', true, t.follow_up_on);
    return out;
  }
  function ago(n) { return n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; }
  function needsAttention(t, today) { return actions(t, today).some(function (a) { return a.attn; }); }

  /* CSV: RFC 4180 (quotes, commas and line breaks inside quotes, "" escapes, BOM). */
  function parseCSV(text) {
    var s = String(text || '');
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    var rows = [], row = [], field = '', i = 0, q = false;
    while (i < s.length) {
      var c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"' && field === '') { q = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); });
  }
  /** Guess which column is which from the header row (Google Forms names). */
  function guessColumns(headers) {
    var h = headers.map(function (x) { return String(x || '').trim().toLowerCase(); });
    function find(tests) { for (var t = 0; t < tests.length; t++) for (var i = 0; i < h.length; i++) if (tests[t].test(h[i])) return i; return -1; }
    return {
      email: find([/(google\s*play|play\s*store|gmail|google account).*(e-?mail|address|account)/, /e-?mail.*(google\s*play|play|gmail)/, /^e-?mail( address)?$/, /e-?mail/]),
      name: find([/^full\s*name$/, /^name$/, /(your|full|first).*name/, /name/]),
      last: find([/last\s*name|surname|family\s*name/]),
      device: find([/device|phone|model/, /android/]),
      registered: find([/^timestamp$/, /timestamp|submitted|submission/, /^date$/])
    };
  }
  /** A form timestamp → YYYY-MM-DD. Slash dates use `order` ('mdy' or 'dmy') unless one part is over 12. */
  function parseFormDate(v, order) {
    var s = String(v || '').trim();
    var m = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(s);
    if (m) { var iso = m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]); return isISO(iso) ? iso : null; }
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
    if (m) {
      var a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
      var mo, d;
      if (a > 12) { d = a; mo = b; } else if (b > 12) { mo = a; d = b; } else if (order === 'dmy') { d = a; mo = b; } else { mo = a; d = b; }
      var iso2 = y + '-' + pad(mo) + '-' + pad(d);
      return isISO(iso2) ? iso2 : null;
    }
    return null;
  }
  /**
   * The day/month order of a whole file, from the dates that can only be read
   * one way (13/10 is day first; 10/13 is month first). Returns 'dmy', 'mdy',
   * or '' when the file can't tell (then the admin chooses).
   */
  function dateOrder(values) {
    var dmy = false, mdy = false, ambiguous = false;
    values.forEach(function (v) {
      var m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]\d{2,4}/.exec(String(v || '').trim());
      if (!m) return;
      if (+m[1] > 12) dmy = true; else if (+m[2] > 12) mdy = true; else if (m[1] !== m[2]) ambiguous = true;
    });
    if (dmy && !mdy) return 'dmy';
    if (mdy && !dmy) return 'mdy';
    return ambiguous || (dmy && mdy) ? '' : 'mdy';
  }
  /**
   * Plan an import: which rows are new, which are already on the roster,
   * which repeat inside the file, which have no usable email.
   */
  function planImport(rows, map, existingKeys, opts) {
    var header = rows[0] || [], body = rows.slice(1);
    var seen = Object.create(null), out = [];
    var counts = { total: body.length, add: 0, existing: 0, repeated: 0, invalid: 0, badDate: 0 };
    body.forEach(function (r, idx) {
      var email = map.email >= 0 ? String(r[map.email] || '').trim() : '';
      var key = emailKey(email);
      var name = map.name >= 0 ? String(r[map.name] || '').trim() : '';
      if (map.last >= 0 && map.last !== map.name) name = (name + ' ' + String(r[map.last] || '').trim()).trim();
      var device = map.device >= 0 ? String(r[map.device] || '').trim() : '';
      var reg = map.registered >= 0 ? parseFormDate(r[map.registered], opts.order) : null;
      var status = 'add';
      if (!validEmail(email)) status = 'invalid';
      else if (existingKeys[key]) status = 'existing';
      else if (seen[key]) status = 'repeated';
      if (status === 'add') {
        seen[key] = true;
        if (map.registered >= 0 && !reg) counts.badDate++;
      }
      counts[status === 'add' ? 'add' : status]++;
      var extra = '';
      if (opts.keepOther) {
        var used = [map.email, map.name, map.last, map.device, map.registered];
        extra = header.map(function (hd, i) {
          if (used.indexOf(i) !== -1) return '';
          var val = String(r[i] || '').trim();
          return val ? String(hd).trim() + ': ' + val : '';
        }).filter(Boolean).join('\n');
      }
      out.push({ line: idx + 2, status: status, email: email, full_name: name.slice(0, 120), device: device.slice(0, 120),
        registered_on: reg || opts.today, notes: extra ? ('From the signup form:\n' + extra).slice(0, 4000) : '' });
    });
    return { rows: out, counts: counts };
  }
  /** One CSV cell, quoted, with spreadsheet formulas neutralised (=, +, -, @ at the start). */
  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function initials(name, email) {
    var src = String(name || '').trim() || String(email || '').split('@')[0];
    var w = src.split(/[\s._-]+/).filter(Boolean);
    return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : (w[0] || '')[1] || '')).toUpperCase();
  }
  return { todayISO: todayISO, isISO: isISO, addDays: addDays, addMonths: addMonths, daysBetween: daysBetween, fmt: fmt,
    reviewDue: reviewDue, rewardEnds: rewardEnds, emailKey: emailKey, validEmail: validEmail, stage: stage, STAGES: STAGES,
    approvalChecks: approvalChecks, canApprove: canApprove, actions: actions, needsAttention: needsAttention,
    parseCSV: parseCSV, guessColumns: guessColumns, parseFormDate: parseFormDate, dateOrder: dateOrder,
    planImport: planImport, csvCell: csvCell, initials: initials, REVIEW_DAYS: REVIEW_DAYS, REWARD_MONTHS: REWARD_MONTHS };
})();

/* ── Small page helpers ─────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function icon(name) { return '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
function toast(msg, isErr) {
  var el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(function () { el.remove(); }, isErr ? 7000 : 3500);
}
function maskEmail(e) {
  var s = String(e || ''); var at = s.indexOf('@');
  if (at < 1) return s;
  return s[0] + '•••' + s.slice(at);
}
function storageGet(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
function storageSet(store, k, v) { try { store.setItem(k, v); } catch (e) { /* storage blocked */ } }
function storageDel(store, k) { try { store.removeItem(k); } catch (e) { /* storage blocked */ } }

/* ── Sign-in (Supabase Auth: emailed code; the session stays in this browser) ── */
var Auth = (function () {
  var session = null, refreshing = null;
  function load() {
    var raw = storageGet(sessionStorage, SESSION_KEY) || storageGet(localStorage, SESSION_KEY);
    try { session = raw ? JSON.parse(raw) : null; } catch (e) { session = null; }
    if (session && (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string')) session = null;
    return session;
  }
  function save(s, keep) {
    session = s;
    var json = JSON.stringify(s);
    if (keep) { storageSet(localStorage, SESSION_KEY, json); storageDel(sessionStorage, SESSION_KEY); }
    else { storageSet(sessionStorage, SESSION_KEY, json); storageDel(localStorage, SESSION_KEY); }
  }
  function kept() { return storageGet(localStorage, SESSION_KEY) !== null; }
  function clear() { session = null; storageDel(sessionStorage, SESSION_KEY); storageDel(localStorage, SESSION_KEY); }
  function fromBody(b) {
    if (!b || typeof b.access_token !== 'string' || typeof b.refresh_token !== 'string' || !b.user) return null;
    var exp = typeof b.expires_at === 'number' ? b.expires_at * 1000 : Date.now() + (b.expires_in || 3600) * 1000;
    return { access_token: b.access_token, refresh_token: b.refresh_token, expires_at: exp, email: b.user.email || '', user_id: b.user.id };
  }
  async function call(path, body, token) {
    var headers = { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' };
    if (token) headers.authorization = 'Bearer ' + token;
    var res;
    try { res = await fetch(SUPABASE_URL + path, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }); }
    catch (e) { var off = new Error('You seem to be offline. Check your connection and try again.'); off.status = 0; throw off; }
    var text = await res.text(); var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      var code = data && (data.error_code || data.code || data.error) || '';
      var msg = data && (data.msg || data.message || data.error_description) || '';
      var err = new Error(authMessage(res.status, String(code), String(msg)));
      err.status = res.status; err.code = String(code); err.raw = msg;
      throw err;
    }
    return data;
  }
  function authMessage(status, code, msg) {
    if (/captcha/i.test(code + ' ' + msg)) return 'Please complete the check below, then try again.';
    if (status === 429 || /rate.?limit/i.test(code)) return 'Too many codes asked for. Wait a few minutes, then try again.';
    if (/otp_expired|expired|invalid/i.test(code + ' ' + msg)) return 'That code is wrong or has expired. Ask for a new one.';
    if (status === 0) return 'You seem to be offline.';
    return 'Sign-in failed (' + status + '). Try again in a moment.';
  }
  async function sendCode(email, captchaToken) {
    var body = { email: email, create_user: true };
    if (captchaToken) body.gotrue_meta_security = { captcha_token: captchaToken };
    await call('/auth/v1/otp', body);
  }
  async function verify(email, code, keep) {
    var s = fromBody(await call('/auth/v1/verify', { type: 'email', email: email, token: code }));
    if (!s) throw new Error('Sign-in failed. Ask for a new code.');
    save(s, keep);
    return s;
  }
  async function doRefresh() {
    var s = load();
    if (!s) throw Object.assign(new Error('Signed out'), { status: 401 });
    var fresh;
    try { fresh = fromBody(await call('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token })); }
    catch (e) {
      // Another tab may have refreshed first (a refresh token works once): use its session.
      var other = load();
      if (other && other.refresh_token !== s.refresh_token) return other;
      if (e.status && e.status >= 400 && e.status < 500) clear();
      throw e;
    }
    if (!fresh) { clear(); throw Object.assign(new Error('Signed out'), { status: 401 }); }
    save(fresh, kept());
    return fresh;
  }
  /** One refresh at a time, across tabs where the browser supports locks. */
  function refresh() {
    if (!refreshing) {
      var run = function () { return doRefresh(); };
      refreshing = (navigator.locks && navigator.locks.request ? navigator.locks.request('kaisip-desk-auth', run) : run())
        .finally(function () { refreshing = null; });
    }
    return refreshing;
  }
  async function token() {
    var s = session || load();
    if (!s) throw Object.assign(new Error('Signed out'), { status: 401 });
    if (s.expires_at - Date.now() < 60000) s = await refresh();
    return s.access_token;
  }
  async function signOut() {
    var s = session || load();
    clear();
    if (s) { try { await fetch(SUPABASE_URL + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, authorization: 'Bearer ' + s.access_token } }); } catch (e) { /* offline: forgotten here anyway */ } }
  }
  return { load: load, sendCode: sendCode, verify: verify, token: token, refresh: refresh, signOut: signOut, clear: clear, current: function () { return session || load(); } };
})();

/* ── The database (PostgREST); RLS decides what comes back ───────────── */
var FRIENDLY = {
  beta_testers_email_unique: 'Someone with this email is already on the roster.',
  beta_testers_email_check: 'That email doesn’t look right.',
  beta_testers_optin_after_invite: 'The Google Play opt-in can’t be before the invitation date.',
  beta_testers_participation_dated: 'Add the date you checked participation.',
  beta_testers_technical_noted: 'Describe the technical issue before accepting a technical gap.',
  beta_testers_approval_date: 'Approval needs an approval date.',
  beta_testers_approval_rules: 'Approval needs a Google Play opt-in date, 14 days since the opt-in, a passed participation check and the terms on record.',
  beta_testers_reward_after_approval: 'A reward can only start on or after the approval date.',
  beta_desk_settings_signup_form_url_check: 'The signup form link must start with https://',
  beta_desk_settings_registration_target_check: 'The target must be a whole number from 1.',
  beta_desk_settings_terms_offered_check: 'Add the eligibility terms (up to 1,000 characters).'
};
function dbMessage(status, body) {
  var code = body && body.code, msg = String(body && body.message || '');
  var m = /constraint "([^"]+)"/.exec(msg);
  if (m && FRIENDLY[m[1]]) return FRIENDLY[m[1]];
  if (code === '23505') return FRIENDLY.beta_testers_email_unique;
  if (code === '23514') return 'One of the fields isn’t allowed (too long, or a rule isn’t met).';
  if (code === '42501' || status === 403) return 'This account isn’t allowed to do that.';
  if (status === 0) return 'You seem to be offline. Nothing was saved.';
  return 'The database said no (' + status + '). Nothing was changed.';
}
async function db(path, opts) {
  opts = opts || {};
  async function go(tok) {
    var headers = Object.assign({ apikey: PUBLISHABLE_KEY, authorization: 'Bearer ' + tok, accept: 'application/json' }, opts.headers || {});
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    return fetch(SUPABASE_URL + '/rest/v1/' + path, { method: opts.method || 'GET', headers: headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  }
  var res;
  try {
    res = await go(await Auth.token());
    if (res.status === 401) res = await go((await Auth.refresh()).access_token);
  } catch (e) {
    if (e.status === 401 || (e.status >= 400 && e.status < 500)) { signedOut('Your sign-in ended. Please sign in again.'); }
    var err0 = new Error(e.status ? e.message : dbMessage(0)); err0.status = e.status || 0; throw err0;
  }
  var text = await res.text(); var data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (res.status === 401) { signedOut('Your sign-in ended. Please sign in again.'); }
  if (!res.ok) { var err = new Error(dbMessage(res.status, data)); err.status = res.status; err.body = data; throw err; }
  return { data: data, res: res };
}

/* ── State ─────────────────────────────────────────────────────────── */
var S = { testers: [], settings: null, loading: true, view: 'testers', filter: 'all', q: '', sort: 'next', editing: null, today: BD.todayISO() };
var EDITABLE = ['full_name', 'email', 'device', 'registered_on', 'invited_on', 'opted_in_on', 'last_feedback_on', 'feedback_summary',
  'participation', 'participation_checked_on', 'technical_issues', 'terms_offered', 'completion', 'approved_on',
  'reward_activated_on', 'follow_up_on', 'follow_up_note', 'notes'];

/* ── Gate: who is signed in, and are they an admin? ───────────────── */
var gateEmail = '';
function showGate(mode, err) {
  $('app').hidden = true; $('gate').hidden = false;
  $('emailForm').hidden = mode !== 'email';
  $('codeForm').hidden = mode !== 'code';
  $('notAdmin').hidden = mode !== 'notadmin';
  $('gateTitle').textContent = mode === 'notadmin' ? 'No access to Beta Desk' : 'Sign in to Beta Desk';
  $('gateLead').hidden = mode === 'notadmin';
  setGateError(err || '');
  var focusEl = mode === 'email' ? $('emailInput') : mode === 'code' ? $('codeInput') : null;
  if (focusEl) setTimeout(function () { focusEl.focus(); }, 30);
}
function setGateError(msg) { $('gateError').hidden = !msg; $('gateError').textContent = msg; }
function signedOut(msg) {
  Auth.clear(); S.testers = []; S.settings = null;
  closeDrawer(true); closeDialog('importDialog'); closeDialog('confirmDialog');
  showGate('email', msg || '');
}

async function boot() {
  var s = Auth.load();
  if (!s) { showGate('email'); return; }
  try {
    var r = await db('beta_desk_settings?select=*');
    if (!Array.isArray(r.data) || r.data.length === 0) {
      $('notAdminWho').textContent = 'Signed in as ' + maskEmail(s.email) + '.';
      showGate('notadmin');
      return;
    }
    S.settings = r.data[0];
    $('gate').hidden = true; $('app').hidden = false;
    $('whoEmail').textContent = maskEmail(s.email);
    renderSettings();
    renderAll();
    await loadTesters();
  } catch (e) {
    if (!$('gate').hidden) return;  // already showing the sign-in after a lost session
    showGate('email', e.message);
  }
}

var captcha = { needed: false, token: '', widget: null };
function loadTurnstile() {
  return new Promise(function (resolve, reject) {
    if (window.turnstile) return resolve(window.turnstile);
    var sc = document.createElement('script');
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    sc.async = true; sc.onload = function () { resolve(window.turnstile); }; sc.onerror = reject;
    document.head.appendChild(sc);
  });
}
async function showCaptcha() {
  captcha.needed = true; $('captchaBox').hidden = false;
  try {
    var ts = await loadTurnstile();
    if (captcha.widget !== null) { ts.reset(captcha.widget); return; }
    captcha.widget = ts.render('#captchaBox', { sitekey: TURNSTILE_SITE_KEY, callback: function (t) { captcha.token = t; }, 'expired-callback': function () { captcha.token = ''; } });
  } catch (e) { setGateError('The sign-in check could not load. Refresh the page and try again.'); }
}

$('emailForm').addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var email = $('emailInput').value.trim();
  if (!BD.validEmail(email)) { setGateError('Enter a valid email address.'); return; }
  if (captcha.needed && !captcha.token) { setGateError('Please complete the check first.'); return; }
  var btn = $('sendCodeBtn'); btn.disabled = true; btn.textContent = 'Sending…'; setGateError('');
  try {
    await Auth.sendCode(email, captcha.token || undefined);
    gateEmail = email;
    $('codeSentNote').textContent = 'Code sent to ' + maskEmail(email) + '. It can take a minute to arrive.';
    $('codeInput').value = '';
    showGate('code');
  } catch (e) {
    if (/captcha/i.test((e.code || '') + ' ' + (e.raw || ''))) await showCaptcha();
    setGateError(e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Email me a code';
    if (captcha.widget !== null && window.turnstile) { window.turnstile.reset(captcha.widget); captcha.token = ''; }
  }
});
$('codeForm').addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var code = $('codeInput').value.replace(/\s+/g, '');
  if (!/^\d{6,10}$/.test(code)) { setGateError('Enter the code from the email (numbers only).'); return; }
  var btn = $('verifyBtn'); btn.disabled = true; btn.textContent = 'Checking…'; setGateError('');
  try {
    await Auth.verify(gateEmail, code, $('keepSignedIn').checked);
    await boot();
  } catch (e) { setGateError(e.message); }
  finally { btn.disabled = false; btn.textContent = 'Sign in'; }
});
$('backToEmail').addEventListener('click', function () { showGate('email'); });
$('notAdminSignOut').addEventListener('click', async function () { await Auth.signOut(); showGate('email'); });
$('signOutBtn').addEventListener('click', async function () { await Auth.signOut(); signedOut(''); toast('Signed out.'); });

/* ── Loading and saving ────────────────────────────────────────────── */
async function loadTesters() {
  S.loading = true; renderRoster();
  try {
    // PostgREST returns at most 1,000 rows per request: read page by page.
    var all = [], from = 0, size = 1000;
    for (;;) {
      var r = await db('beta_testers?select=*&order=registered_on.desc,created_at.desc', { headers: { range: from + '-' + (from + size - 1) } });
      var page = Array.isArray(r.data) ? r.data : [];
      all = all.concat(page);
      if (page.length < size) break;
      from += size;
    }
    S.testers = all;
  } catch (e) { toast(e.message, true); }
  S.loading = false; S.today = BD.todayISO();
  renderAll();
}
function upsertLocal(row) {
  var i = S.testers.findIndex(function (t) { return t.id === row.id; });
  if (i === -1) S.testers.unshift(row); else S.testers[i] = row;
}

/* ── Rendering ─────────────────────────────────────────────────────── */
function renderAll() { renderStats(); renderPipeline(); renderRoster(); renderActions(); renderSideLinks(); }

function counts() {
  var c = { registered: 0, invited: 0, testing: 0, review: 0, approved: 0, rewarded: 0, reward_ended: 0, closed: 0, attention: 0 };
  S.testers.forEach(function (t) { c[BD.stage(t, S.today)]++; if (BD.needsAttention(t, S.today)) c.attention++; });
  return c;
}
function renderStats() {
  var c = counts(), total = S.testers.length, target = S.settings ? S.settings.registration_target : 50;
  $('stReg').textContent = total; $('stTarget').textContent = target;
  $('stRegBar').style.width = Math.min(100, Math.round(total / target * 100)) + '%';
  $('stTesting').textContent = c.testing + c.review;
  $('stAttn').textContent = c.attention;
  $('stAttnCard').classList.toggle('attn', c.attention > 0);
  $('stRewards').textContent = c.rewarded;
  $('navAttn').hidden = c.attention === 0; $('navAttn').textContent = c.attention;
}
var PIPE = [
  { f: 'registered', label: 'Registered', sub: 'Not invited yet' },
  { f: 'invited', label: 'Invited', sub: 'Awaiting opt-in' },
  { f: 'testing', label: 'Testing', sub: 'Before day 14' },
  { f: 'review', label: 'Review', sub: 'Day 14 reached' },
  { f: 'approved', label: 'Approved', sub: 'Reward to switch on' },
  { f: 'rewarded', label: 'Rewarded', sub: '6 months of CISA' }
];
function renderPipeline() {
  var c = counts();
  $('pipeline').innerHTML = PIPE.map(function (p) {
    return '<button type="button" data-f="' + p.f + '" aria-pressed="' + (S.filter === p.f) + '"><span class="n">' + c[p.f] + '</span><span class="l">' + p.label + '</span><span class="s">' + p.sub + '</span></button>';
  }).join('');
}
$('pipeline').addEventListener('click', function (ev) {
  var b = ev.target.closest('button[data-f]'); if (!b) return;
  S.filter = S.filter === b.dataset.f ? 'all' : b.dataset.f;
  $('filter').value = S.filter; renderPipeline(); renderRoster();
});

function matches(t) {
  var st = BD.stage(t, S.today), f = S.filter;
  if (f === 'attention' && !BD.needsAttention(t, S.today)) return false;
  if (f === 'followup' && !t.follow_up_on) return false;
  if (['registered', 'invited', 'testing', 'review', 'approved', 'rewarded', 'reward_ended', 'closed'].indexOf(f) !== -1 && st !== f) return false;
  if (S.q) {
    var hay = [t.full_name, t.email, t.device, t.notes, t.feedback_summary, t.follow_up_note, t.technical_issues].join(' ').toLowerCase();
    if (S.q.toLowerCase().split(/\s+/).some(function (w) { return w && hay.indexOf(w) === -1; })) return false;
  }
  return true;
}
function sortKey(t) {
  var acts = BD.actions(t, S.today);
  var attn = acts.some(function (a) { return a.attn; });
  var due = acts.length ? (acts[0].due || '9999-12-31') : '9999-12-31';
  return (attn ? '0' : '1') + due;
}
function sorted(list) {
  var by = S.sort;
  return list.slice().sort(function (a, b) {
    if (by === 'name') return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    if (by === 'oldest') return a.registered_on.localeCompare(b.registered_on) || a.created_at.localeCompare(b.created_at);
    if (by === 'newest') return b.registered_on.localeCompare(a.registered_on) || b.created_at.localeCompare(a.created_at);
    if (by === 'review') return (a.review_due_on || '9999').localeCompare(b.review_due_on || '9999');
    return sortKey(a).localeCompare(sortKey(b));
  });
}
function stageChip(t) {
  var st = BD.stage(t, S.today), meta = BD.STAGES[st];
  var label = meta.label;
  if (st === 'closed' && t.participation === 'interrupted' && t.completion !== 'not_eligible') label = 'Interrupted';
  return '<span class="chip ' + meta.tone + '"><span class="dot" aria-hidden="true"></span>' + esc(label) + '</span>';
}
function progressCell(t) {
  var st = BD.stage(t, S.today);
  if (st === 'testing' || st === 'review') {
    var d = Math.max(0, Math.min(14, BD.daysBetween(t.opted_in_on, S.today)));
    return '<span class="num">' + d + '</span> <span class="meta">of 14 days</span><div class="bar" aria-hidden="true"><i style="width:' + Math.round(d / 14 * 100) + '%"></i></div>';
  }
  if (st === 'rewarded') {
    var ends = t.reward_ends_on || BD.rewardEnds(t);
    var total = BD.daysBetween(t.reward_activated_on, ends), used = BD.daysBetween(t.reward_activated_on, S.today);
    return '<span class="meta">until</span> ' + esc(BD.fmt(ends)) + '<div class="bar" aria-hidden="true"><i style="width:' + Math.round(used / total * 100) + '%"></i></div>';
  }
  if (st === 'invited') return '<span class="meta">Invited ' + esc(BD.fmt(t.invited_on)) + '</span>';
  if (st === 'registered') return '<span class="meta">Signed up ' + esc(BD.fmt(t.registered_on)) + '</span>';
  if (st === 'approved') return '<span class="meta">Approved ' + esc(BD.fmt(t.approved_on)) + '</span>';
  if (st === 'reward_ended') return '<span class="meta">Ended ' + esc(BD.fmt(t.reward_ends_on)) + '</span>';
  return '<span class="meta">—</span>';
}
function renderRoster() {
  var body = $('rosterBody');
  $('rosterCount').textContent = S.testers.length;
  if (S.loading && S.testers.length === 0) {
    body.innerHTML = '<div style="padding:28px;display:grid;gap:14px">' + [1, 2, 3, 4].map(function () { return '<div class="skel" style="width:' + (50 + Math.random() * 40) + '%"></div>'; }).join('') + '</div>';
    return;
  }
  if (S.testers.length === 0) {
    body.innerHTML = '<div class="empty"><div class="glyph">' + icon('spark') + '</div><h3>Your first cohort starts here.</h3>' +
      '<p>Import your Google Forms responses or add a tester by hand. No sample people have been added.</p>' +
      '<div class="hero-actions" style="justify-content:center"><button class="btn" type="button" data-act="import">Import CSV</button><button class="btn btn-primary" type="button" data-act="add">Add your first tester</button></div></div>';
    return;
  }
  var list = sorted(S.testers.filter(matches));
  if (list.length === 0) {
    body.innerHTML = '<div class="empty"><h3>No testers match.</h3><p>Try another search or filter.</p><button class="btn" type="button" data-act="clear">Clear search and filter</button></div>';
    return;
  }
  body.innerHTML = '<div class="table-wrap"><table class="roster"><thead><tr><th scope="col">Tester</th><th scope="col">Stage</th><th scope="col">Progress</th><th scope="col">Next step</th><th scope="col">Device</th></tr></thead><tbody>' +
    list.map(function (t) {
      var acts = BD.actions(t, S.today), first = acts[0], attn = acts.some(function (a) { return a.attn; });
      var next = first ? '<div class="what">' + (first.key === 'wait' ? '<span class="tag auto">Auto</span>' : '<span class="tag you">You</span>') + '<span>' + esc(first.label) + '</span></div>' : '<span class="meta">Nothing to do</span>';
      return '<tr data-id="' + esc(t.id) + '" class="' + (attn ? 'row-attn' : '') + '" tabindex="0" aria-label="Open ' + esc(t.full_name || t.email) + '">' +
        '<td><div class="person"><div class="avatar" aria-hidden="true">' + esc(BD.initials(t.full_name, t.email)) + '</div><div><b>' + esc(t.full_name || 'No name') + '</b><span>' + esc(t.email) + '</span></div></div></td>' +
        '<td data-label="Stage">' + stageChip(t) + '</td>' +
        '<td class="progress-cell" data-label="Progress">' + progressCell(t) + '</td>' +
        '<td class="next-cell" data-label="Next">' + next + '</td>' +
        '<td data-label="Device">' + (t.device ? esc(t.device) : '<span class="meta">—</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}
$('rosterBody').addEventListener('click', function (ev) {
  var act = ev.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'add') openDrawer(null);
    if (act.dataset.act === 'import') openImport();
    if (act.dataset.act === 'clear') { S.q = ''; $('q').value = ''; S.filter = 'all'; $('filter').value = 'all'; renderPipeline(); renderRoster(); }
    return;
  }
  var tr = ev.target.closest('tr[data-id]'); if (tr) openDrawer(tr.dataset.id);
});
$('rosterBody').addEventListener('keydown', function (ev) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  var tr = ev.target.closest('tr[data-id]'); if (tr) { ev.preventDefault(); openDrawer(tr.dataset.id); }
});

function renderActions() {
  var items = [];
  S.testers.forEach(function (t) { BD.actions(t, S.today).forEach(function (a) { items.push({ t: t, a: a }); }); });
  var now = items.filter(function (x) { return x.a.attn; }).sort(function (x, y) { return String(x.a.due).localeCompare(String(y.a.due)); });
  var soon = items.filter(function (x) { return !x.a.attn; }).sort(function (x, y) { return String(x.a.due).localeCompare(String(y.a.due)); });
  function card(x, calm) {
    return '<article class="card action"><div class="ico' + (calm ? ' calm' : '') + '">' + icon(calm ? 'clock' : 'bell') + '</div>' +
      '<div><h4>' + esc(x.a.label) + ' <span class="tag ' + (calm ? 'auto' : 'you') + '">' + (calm ? 'Auto' : 'You') + '</span></h4><p><b>' + esc(x.t.full_name || x.t.email) + '</b> · ' + esc(x.a.why) + '</p></div>' +
      '<button class="btn btn-sm" type="button" data-id="' + esc(x.t.id) + '">Open</button></article>';
  }
  var html = '';
  if (!S.testers.length) html = '<div class="card empty"><h3>Nothing to do yet.</h3><p>Add or import testers and their next steps appear here.</p></div>';
  else {
    html += '<h2 class="section-title" style="margin-top:0">Needs you now · ' + now.length + '</h2>';
    html += now.length ? '<div class="actions-list">' + now.map(function (x) { return card(x, false); }).join('') + '</div>' : '<div class="card" style="padding:22px 24px"><p class="meta" style="margin:0">All caught up. Nothing needs you today.</p></div>';
    if (soon.length) html += '<h2 class="section-title">Coming up</h2><div class="actions-list">' + soon.map(function (x) { return card(x, true); }).join('') + '</div>';
  }
  $('actionsBody').innerHTML = html;
}
$('actionsBody').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-id]'); if (b) openDrawer(b.dataset.id); });

function renderSideLinks() {
  var url = S.settings && S.settings.signup_form_url;
  $('signupLink').hidden = !url; $('addSignupLink').hidden = !!url;
  if (url) $('signupLink').href = url;
}
$('addSignupLink').addEventListener('click', function () { setView('settings'); setTimeout(function () { $('setForm').focus(); }, 50); });

/* ── Views ─────────────────────────────────────────────────────────── */
var VIEW_NAMES = { testers: 'Testers', actions: 'Next actions', playbook: 'Playbook', settings: 'Settings' };
function setView(v) {
  S.view = v;
  document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== v; });
  document.querySelectorAll('.nav button').forEach(function (b) { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('crumb').textContent = VIEW_NAMES[v];
  $('main').focus({ preventScroll: true }); window.scrollTo(0, 0);
}
document.querySelector('.nav').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-view]'); if (b) setView(b.dataset.view); });
$('viewActions').addEventListener('click', function () { setView('actions'); });
$('addBtn').addEventListener('click', function () { openDrawer(null); });
$('q').addEventListener('input', function () { S.q = this.value.trim(); renderRoster(); });
$('filter').addEventListener('change', function () { S.filter = this.value; renderPipeline(); renderRoster(); });
$('sort').addEventListener('change', function () { S.sort = this.value; renderRoster(); });
$('refreshBtn').addEventListener('click', function () { loadTesters().then(function () { toast('Roster refreshed.'); }); });
document.addEventListener('keydown', function (ev) {
  if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('app').hidden && $('drawer').hidden) { ev.preventDefault(); setView('testers'); $('q').focus(); }
  if (ev.key === 'Escape') {
    if (!$('confirmDialog').hidden) closeDialog('confirmDialog');
    else if (!$('importDialog').hidden) closeDialog('importDialog');
    else if (!$('drawer').hidden) closeDrawer();
  }
});
// A new day while the desk is open: recount stages and reminders.
setInterval(function () { var t = BD.todayISO(); if (t !== S.today) { S.today = t; renderAll(); } }, 60000);

/* ── Settings ──────────────────────────────────────────────────────── */
function renderSettings() {
  if (!S.settings) return;
  $('setTarget').value = S.settings.registration_target;
  $('setForm').value = S.settings.signup_form_url || '';
  $('setTerms').value = S.settings.terms_offered || '';
}
$('settingsForm').addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var target = parseInt($('setTarget').value, 10), url = $('setForm').value.trim(), terms = $('setTerms').value.trim();
  if (!(target >= 1 && target <= 100000)) { toast('The target must be a whole number from 1.', true); return; }
  if (url && !/^https:\/\//i.test(url)) { toast(FRIENDLY.beta_desk_settings_signup_form_url_check, true); return; }
  if (!terms) { toast('Add the eligibility terms.', true); return; }
  var btn = $('saveSettings'); btn.disabled = true;
  try {
    var r = await db('beta_desk_settings?id=eq.true', { method: 'PATCH', headers: { prefer: 'return=representation' }, body: { registration_target: target, signup_form_url: url || null, terms_offered: terms } });
    if (!r.data || !r.data.length) throw new Error('Nothing was saved. Is this account still an admin?');
    S.settings = r.data[0]; renderSettings(); renderAll(); toast('Settings saved.');
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; }
});

/* ── The tester drawer (add, edit, delete) ─────────────────────────── */
var lastFocus = null;
function openScrim() { var s = $('scrim'); s.hidden = false; requestAnimationFrame(function () { s.classList.add('on'); }); }
function closeScrim() {
  if (!$('drawer').hidden || !$('importDialog').hidden || !$('confirmDialog').hidden) return;
  var s = $('scrim'); s.classList.remove('on'); setTimeout(function () { if (!s.classList.contains('on')) s.hidden = true; }, 200);
}
$('scrim').addEventListener('click', function () {
  if (!$('confirmDialog').hidden) return;
  if (!$('importDialog').hidden) closeDialog('importDialog'); else closeDrawer();
});

function dateField(name, label, val, opts) {
  opts = opts || {};
  return '<label class="field"><span>' + label + (opts.tag ? ' <span class="tag ' + opts.tag + '">' + (opts.tag === 'you' ? 'You' : 'Auto') + '</span>' : '') + '</span>' +
    '<span class="date-row"><input class="input" type="date" name="' + name + '" value="' + esc(val || '') + '"' + (opts.required ? ' required' : '') + '>' +
    '<button class="btn btn-sm" type="button" data-today="' + name + '">Today</button></span></label>';
}
function ring(pct) {
  var r = 18, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
  return '<svg class="ring" viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="' + r + '" fill="none" stroke="var(--track)" stroke-width="5"/><circle cx="23" cy="23" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 23 23)"/></svg>';
}
function draft() {
  // The drawer's current values, as a tester object (for the live calculations).
  var f = $('dForm'), t = Object.assign({}, S.editing || {});
  EDITABLE.forEach(function (k) { var el = f.elements[k]; if (!el) return; if (el instanceof RadioNodeList) t[k] = el.value; else t[k] = el.value.trim() === '' && el.type === 'date' ? null : el.value; });
  t.review_due_on = t.opted_in_on ? BD.addDays(t.opted_in_on, 14) : null;
  t.reward_ends_on = t.reward_activated_on ? BD.addMonths(t.reward_activated_on, 6) : null;
  return t;
}
function openDrawer(id) {
  var t = id ? S.testers.find(function (x) { return x.id === id; }) : null;
  if (id && !t) { toast('That tester is no longer on the roster.', true); return; }
  S.editing = t ? Object.assign({}, t) : null;
  lastFocus = document.activeElement;
  var isNew = !t;
  t = t || { full_name: '', email: '', device: '', registered_on: S.today, participation: 'unchecked', completion: 'pending', terms_offered: S.settings ? S.settings.terms_offered : '' };
  $('dDelete').hidden = isNew;
  $('dSave').textContent = isNew ? 'Add tester' : 'Save changes';
  var f = $('dForm');
  f.innerHTML =
    // 1. Registration
    '<div class="tl done"><span class="node" aria-hidden="true"></span><h3>Registration <span class="tag you">You</span></h3>' +
      '<p class="explain">Who they are. The email is how duplicates are caught.</p>' +
      '<div class="grid2"><label class="field"><span>Name</span><input class="input" name="full_name" maxlength="120" autocomplete="off" value="' + esc(t.full_name) + '"></label>' +
      '<label class="field"><span>Email (Google Play account) *</span><input class="input" type="email" name="email" maxlength="254" required autocomplete="off" value="' + esc(t.email) + '"></label>' +
      '<label class="field"><span>Device</span><input class="input" name="device" maxlength="120" placeholder="e.g. Pixel 8, Android 15" value="' + esc(t.device) + '"></label>' +
      dateField('registered_on', 'Registered on', t.registered_on, { required: true }) + '</div></div>' +
    // 2. Invitation
    '<div class="tl" data-step="invite"><span class="node" aria-hidden="true"></span><h3>Play invitation <span class="tag you">You</span></h3>' +
      '<p class="explain">Add them to the closed test in Play Console and send the opt-in link, then record the day.</p>' +
      '<div class="grid2">' + dateField('invited_on', 'Invited on', t.invited_on) + '</div></div>' +
    // 3. Opt-in
    '<div class="tl" data-step="optin"><span class="node" aria-hidden="true"></span><h3>Google Play opt-in <span class="tag you">You</span></h3>' +
      '<p class="explain">The day they actually joined on Google Play (check Play Console or ask the tester). The 14 days count from here, not from registration.</p>' +
      '<div class="grid2">' + dateField('opted_in_on', 'Opted in on', t.opted_in_on) + '</div><div id="calcReview"></div></div>' +
    // 4. Feedback
    '<div class="tl" data-step="feedback"><span class="node" aria-hidden="true"></span><h3>Feedback <span class="tag you">You</span></h3>' +
      '<div class="grid2">' + dateField('last_feedback_on', 'Last feedback on', t.last_feedback_on) + '</div>' +
      '<label class="field" style="margin-top:12px"><span>What they said</span><textarea class="input" name="feedback_summary" maxlength="2000" rows="3" placeholder="A short summary">' + esc(t.feedback_summary) + '</textarea></label></div>' +
    // 5. Participation
    '<div class="tl" data-step="part"><span class="node" aria-hidden="true"></span><h3>Participation check <span class="tag you">You</span></h3>' +
      '<p class="explain">After the review date, confirm they stayed opted in every day, and check the terms they were offered.</p>' +
      '<div class="radios" role="radiogroup" aria-label="Participation">' +
        radio('unchecked', 'Not checked yet', 'Leave this until the review date.', t.participation) +
        radio('continuous', 'Continuous', 'Opted in every day of the 14.', t.participation) +
        radio('interrupted_technical', 'Technical gap, accepted', 'A break caused by a technical issue. Describe it below.', t.participation) +
        radio('interrupted', 'Interrupted', 'Left or paused for another reason. Not eligible.', t.participation) +
      '</div>' +
      '<div class="grid2" style="margin-top:12px">' + dateField('participation_checked_on', 'Checked on', t.participation_checked_on) + '</div>' +
      '<label class="field" style="margin-top:12px"><span>Technical issues</span><textarea class="input" name="technical_issues" maxlength="2000" rows="2" placeholder="Crashes, install problems, Play errors…">' + esc(t.technical_issues) + '</textarea></label>' +
      '<label class="field" style="margin-top:12px"><span>Eligibility terms they were offered</span><textarea class="input" name="terms_offered" maxlength="1000" rows="3">' + esc(t.terms_offered) + '</textarea></label></div>' +
    // 6. Completion
    '<div class="tl" data-step="approve"><span class="node" aria-hidden="true"></span><h3>Completion approval <span class="tag you">You</span></h3>' +
      '<ul class="checklist" id="checks"></ul>' +
      '<div class="grid2"><label class="field"><span>Decision</span><select class="input" name="completion">' +
        opt('pending', 'Pending', t.completion) + opt('approved', 'Approved', t.completion) + opt('not_eligible', 'Not eligible', t.completion) + '</select></label>' +
      dateField('approved_on', 'Approved on', t.approved_on) + '</div></div>' +
    // 7. Reward
    '<div class="tl" data-step="reward"><span class="node" aria-hidden="true"></span><h3>CISA reward <span class="tag you">You</span></h3>' +
      '<p class="explain">Switch on CISA premium for them in the app first (nothing here grants access), then record the day you did it.</p>' +
      '<div class="grid2">' + dateField('reward_activated_on', 'Activated on', t.reward_activated_on) + '</div><div id="calcReward"></div>' +
      '<p class="cisa-only">Six months of CISA premium content and mobile app features. Other certification content is not included.</p></div>' +
    // Follow-up & notes
    '<div class="tl" data-step="notes"><span class="node" aria-hidden="true"></span><h3>Follow-up and notes <span class="tag you">You</span></h3>' +
      '<div class="grid2">' + dateField('follow_up_on', 'Remind me on', t.follow_up_on) +
      '<label class="field"><span>Reminder</span><input class="input" name="follow_up_note" maxlength="300" placeholder="e.g. Ask about the crash" value="' + esc(t.follow_up_note) + '"></label></div>' +
      '<label class="field" style="margin-top:12px"><span>Notes</span><textarea class="input" name="notes" maxlength="4000" rows="4">' + esc(t.notes) + '</textarea></label>' +
      (isNew ? '' : '<p class="meta" style="margin-top:12px">Added ' + esc(new Date(t.created_at).toLocaleString()) + ' · last saved ' + esc(new Date(t.updated_at).toLocaleString()) + (t.source === 'form_csv' ? ' · from the signup form CSV' : '') + '</p>') +
    '</div>';
  refreshDrawer();
  var d = $('drawer'); d.hidden = false; openScrim();
  requestAnimationFrame(function () { d.classList.add('on'); });
  setTimeout(function () { (isNew ? f.elements.full_name : $('dClose')).focus(); }, 60);
}
function radio(v, title, sub, cur) {
  return '<label class="radio"><input type="radio" name="participation" value="' + v + '"' + (cur === v ? ' checked' : '') + '><span><b>' + title + '</b><span>' + sub + '</span></span></label>';
}
function opt(v, label, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + label + '</option>'; }

/** Live calculations and checklist while editing (the database recalculates on save). */
function refreshDrawer() {
  var t = draft(), today = S.today, st = BD.stage(t, today);
  $('dTitle').textContent = t.full_name || (S.editing ? 'No name' : 'New tester');
  $('dSub').textContent = t.email || 'Add their email';
  $('dAvatar').textContent = BD.initials(t.full_name, t.email);
  $('dChips').innerHTML = t.email ? stageChip(t) + (BD.needsAttention(t, today) ? ' <span class="chip clay">Needs attention</span>' : '') : '';
  // Review date (auto, from the opt-in)
  var cr = $('calcReview');
  if (t.opted_in_on) {
    var day = Math.max(0, Math.min(14, BD.daysBetween(t.opted_in_on, today)));
    cr.innerHTML = '<div class="calc">' + ring(day / 14) + '<div><span class="tag auto">Auto</span> Review date <b>' + esc(BD.fmt(t.review_due_on)) + '</b><br><span class="meta">' +
      (today >= t.review_due_on ? '14 days reached' : day + ' of 14 days done · ' + BD.daysBetween(today, t.review_due_on) + ' to go') + ' · Opt-in + 14 days</span></div></div>';
  } else cr.innerHTML = '<div class="calc"><span class="tag auto">Auto</span><span class="meta">The review date appears when you record the opt-in.</span></div>';
  // Reward end (auto, from the activation)
  var rw = $('calcReward');
  if (t.reward_activated_on) {
    var total = BD.daysBetween(t.reward_activated_on, t.reward_ends_on), used = Math.max(0, BD.daysBetween(t.reward_activated_on, today));
    rw.innerHTML = '<div class="calc">' + ring(Math.min(1, used / total)) + '<div><span class="tag auto">Auto</span> CISA access until <b>' + esc(BD.fmt(t.reward_ends_on)) + '</b><br><span class="meta">Activation + 6 months' +
      (today < t.reward_activated_on ? ' · starts ' + esc(BD.fmt(t.reward_activated_on)) : today >= t.reward_ends_on ? ' · ended' : ' · ' + BD.daysBetween(today, t.reward_ends_on) + ' days left') + '</span></div></div>';
  } else rw.innerHTML = '<div class="calc"><span class="tag auto">Auto</span><span class="meta">The end date appears when you record the activation.</span></div>';
  // Approval checklist
  var checks = BD.approvalChecks(t, today, t.approved_on || today);
  $('checks').innerHTML = checks.map(function (c) {
    var cls = c.ok ? 'ok' : c.req ? 'no' : 'warn';
    return '<li class="' + cls + '"><span class="mk" aria-hidden="true">' + (c.ok ? '✓' : c.req ? '·' : '!') + '</span><span>' + esc(c.text) + (c.req ? '' : '') + '<span class="sr-only">' + (c.ok ? ' (done)' : c.req ? ' (required)' : ' (recommended)') + '</span></span></li>';
  }).join('');
  var sel = $('dForm').elements.completion;
  var okToApprove = BD.canApprove(t, today, t.approved_on || today);
  sel.querySelector('option[value="approved"]').disabled = !okToApprove && t.completion !== 'approved';
  // Timeline nodes: done / current
  var flags = { invite: !!t.invited_on, optin: !!t.opted_in_on, feedback: !!t.last_feedback_on, part: t.participation !== 'unchecked', approve: t.completion !== 'pending', reward: !!t.reward_activated_on, notes: false };
  var current = { registered: 'invite', invited: 'optin', testing: 'feedback', review: t.participation === 'unchecked' ? 'part' : 'approve', approved: 'reward' }[st];
  $('dForm').querySelectorAll('.tl[data-step]').forEach(function (el) {
    var k = el.dataset.step; el.classList.toggle('done', !!flags[k]); el.classList.toggle('now', k === current);
  });
}
$('dForm').addEventListener('input', refreshDrawer);
$('dForm').addEventListener('change', function (ev) {
  var f = $('dForm');
  // Helpful defaults: picking a result fills its date with today.
  if (ev.target.name === 'participation' && ev.target.value !== 'unchecked' && !f.elements.participation_checked_on.value) f.elements.participation_checked_on.value = S.today;
  if (ev.target.name === 'completion') {
    if (ev.target.value === 'approved' && !f.elements.approved_on.value) f.elements.approved_on.value = S.today;
    if (ev.target.value !== 'approved') f.elements.approved_on.value = '';
  }
  refreshDrawer();
});
$('dForm').addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-today]'); if (!b) return;
  $('dForm').elements[b.dataset.today].value = S.today;
  $('dForm').dispatchEvent(new Event('change'));
});

/** The same rules as the database, checked first so the message is clear. */
function validate(t) {
  if (!BD.validEmail(t.email)) return 'Add a valid email address.';
  var key = BD.emailKey(t.email);
  if (S.testers.some(function (x) { return x.email_key === key && (!S.editing || x.id !== S.editing.id); })) return FRIENDLY.beta_testers_email_unique;
  if (!t.registered_on) return 'Add the registration date.';
  if (t.opted_in_on && t.invited_on && t.opted_in_on < t.invited_on) return FRIENDLY.beta_testers_optin_after_invite;
  if (t.participation !== 'unchecked' && !t.participation_checked_on) return FRIENDLY.beta_testers_participation_dated;
  if (t.participation === 'interrupted_technical' && !String(t.technical_issues || '').trim()) return FRIENDLY.beta_testers_technical_noted;
  if (t.completion === 'approved') {
    if (!t.approved_on) return FRIENDLY.beta_testers_approval_date;
    if (!BD.canApprove(t, S.today, t.approved_on)) return FRIENDLY.beta_testers_approval_rules;
  }
  if (t.reward_activated_on && (t.completion !== 'approved' || t.reward_activated_on < t.approved_on)) return FRIENDLY.beta_testers_reward_after_approval;
  return '';
}
$('dForm').addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var t = draft();
  if (t.completion !== 'approved') t.approved_on = null;
  var problem = validate(t);
  if (problem) { toast(problem, true); return; }
  var body = {};
  EDITABLE.forEach(function (k) {
    var v = t[k] === undefined ? null : t[k];
    if (typeof v === 'string' && /_on$/.test(k) && v === '') v = null;
    if (v === null && !/_on$/.test(k)) v = '';
    if (k === 'email' && typeof v === 'string') v = v.trim();
    body[k] = v;
  });
  var btn = $('dSave'); btn.disabled = true;
  try {
    var r;
    if (!S.editing) {
      body.source = 'manual';
      r = await db('beta_testers', { method: 'POST', headers: { prefer: 'return=representation' }, body: body });
    } else {
      var changed = {};
      Object.keys(body).forEach(function (k) { if ((S.editing[k] === undefined ? null : S.editing[k]) !== body[k]) changed[k] = body[k]; });
      if (!Object.keys(changed).length) { closeDrawer(); return; }
      // Only save if nobody else changed this tester since it was opened (another device or tab).
      r = await db('beta_testers?id=eq.' + encodeURIComponent(S.editing.id) + '&updated_at=eq.' + encodeURIComponent(S.editing.updated_at),
        { method: 'PATCH', headers: { prefer: 'return=representation' }, body: changed });
      if (!r.data || !r.data.length) {
        toast('This tester was changed somewhere else, so nothing was saved. The roster has been reloaded: please make your change again.', true);
        await loadTesters(); closeDrawer(); return;
      }
    }
    upsertLocal(r.data[0]);
    renderAll(); closeDrawer();
    toast(S.editing ? 'Saved.' : 'Tester added.');
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; }
});
function closeDrawer(instant) {
  var d = $('drawer'); if (d.hidden) return;
  d.classList.remove('on');
  var done = function () { d.hidden = true; S.editing = null; closeScrim(); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  if (instant) done(); else setTimeout(done, 240);
}
$('dClose').addEventListener('click', function () { closeDrawer(); });
$('dCancel').addEventListener('click', function () { closeDrawer(); });
$('dDelete').addEventListener('click', function () {
  var t = S.editing; if (!t) return;
  confirmBox('Delete this tester?', 'This permanently deletes ' + (t.full_name || 'this tester') + ' (' + t.email + ') and every date and note on the record. It can’t be undone. Export a CSV first if you need a copy.', async function () {
    try {
      var r = await db('beta_testers?id=eq.' + encodeURIComponent(t.id), { method: 'DELETE', headers: { prefer: 'return=representation' } });
      if (!r.data || !r.data.length) throw new Error('Nothing was deleted. Is this account still an admin?');
      S.testers = S.testers.filter(function (x) { return x.id !== t.id; });
      renderAll(); closeDrawer(); toast('Tester deleted.');
    } catch (e) { toast(e.message, true); }
  });
});

/* ── Dialogs ───────────────────────────────────────────────────────── */
var dialogFocus = {};
function openDialog(id) {
  dialogFocus[id] = document.activeElement;
  var d = $(id); d.hidden = false; openScrim();
  requestAnimationFrame(function () { d.classList.add('on'); });
}
function closeDialog(id) {
  var d = $(id); if (d.hidden) return;
  d.classList.remove('on');
  setTimeout(function () { d.hidden = true; closeScrim(); var f = dialogFocus[id]; if (f && f.focus) f.focus(); }, 200);
}
document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeDialog(b.closest('.dialog').id); }); });
var confirmAction = null;
function confirmBox(title, text, onYes) {
  $('cfTitle').textContent = title; $('cfText').textContent = text; confirmAction = onYes;
  openDialog('confirmDialog'); setTimeout(function () { $('cfNo').focus(); }, 40);
}
$('cfNo').addEventListener('click', function () { closeDialog('confirmDialog'); });
$('cfYes').addEventListener('click', async function () {
  var fn = confirmAction; confirmAction = null; closeDialog('confirmDialog'); if (fn) await fn();
});

/* ── CSV import (Google Forms responses) ───────────────────────────── */
var IMP = null;
function openImport() {
  IMP = null; $('impFile').value = ''; $('impStep2').hidden = true; $('impGo').disabled = true; $('impGo').textContent = 'Import';
  $('drop').hidden = false;
  openDialog('importDialog');
}
$('importBtn').addEventListener('click', openImport);
$('importBtnHero').addEventListener('click', openImport);
$('impFile').addEventListener('change', function () { if (this.files[0]) readImport(this.files[0]); });
['dragover', 'dragenter'].forEach(function (e) { $('drop').addEventListener(e, function (ev) { ev.preventDefault(); this.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (e) { $('drop').addEventListener(e, function (ev) { ev.preventDefault(); this.classList.remove('over'); }); });
$('drop').addEventListener('drop', function (ev) { var f = ev.dataTransfer.files[0]; if (f) readImport(f); });
function readImport(file) {
  if (file.size > 5 * 1024 * 1024) { toast('That file is over 5 MB. Export only the responses sheet.', true); return; }
  var reader = new FileReader();
  reader.onload = function () {
    var rows = BD.parseCSV(reader.result);
    if (rows.length < 2) { toast('That file has no responses in it.', true); return; }
    var map = BD.guessColumns(rows[0]);
    IMP = { rows: rows, map: map, keepOther: true, name: file.name };
    detectOrder();
    $('drop').hidden = true; $('impStep2').hidden = false;
    renderImport();
  };
  reader.onerror = function () { toast('That file could not be read.', true); };
  reader.readAsText(file);
}
/** Work out the file's day/month order; ask only when the file can't tell. */
function detectOrder() {
  var vals = IMP.rows.slice(1).map(function (r) { return IMP.map.registered >= 0 ? r[IMP.map.registered] : ''; });
  var o = BD.dateOrder(vals);
  IMP.ambiguous = o === '';
  IMP.order = o || IMP.order || 'mdy';
}
function colSelect(key, label, required) {
  var headers = IMP.rows[0];
  return '<label class="field"><span>' + label + (required ? ' *' : '') + '</span><select class="input" data-map="' + key + '">' +
    '<option value="-1">' + (required ? 'Choose a column' : 'Not in this file') + '</option>' +
    headers.map(function (h, i) { return '<option value="' + i + '"' + (IMP.map[key] === i ? ' selected' : '') + '>' + esc(String(h).trim() || 'Column ' + (i + 1)) + '</option>'; }).join('') + '</select></label>';
}
function existingKeys() { var k = Object.create(null); S.testers.forEach(function (t) { k[t.email_key] = true; }); return k; }
function renderImport() {
  $('impMapping').innerHTML = colSelect('email', 'Email (Google Play account)', true) + colSelect('name', 'Name') + colSelect('last', 'Last name (if separate)') +
    colSelect('device', 'Device') + colSelect('registered', 'Registered on (form timestamp)') +
    (IMP.ambiguous ? '<label class="field"><span>Dates in this file are</span><select class="input" id="impOrder"><option value="mdy"' + (IMP.order === 'mdy' ? ' selected' : '') + '>Month / Day / Year</option><option value="dmy"' + (IMP.order === 'dmy' ? ' selected' : '') + '>Day / Month / Year</option></select></label>' : '') +
    '<label class="check" style="grid-column:1/-1"><input type="checkbox" id="impKeep"' + (IMP.keepOther ? ' checked' : '') + '> <span>Keep the other answers in each tester’s notes</span></label>';
  var plan = BD.planImport(IMP.rows, IMP.map, existingKeys(), { order: IMP.order, keepOther: IMP.keepOther, today: S.today });
  IMP.plan = plan;
  var c = plan.counts;
  $('impSummary').innerHTML =
    '<div class="s"><span class="num">' + c.add + '</span><span>new testers</span></div>' +
    '<div class="s"><span class="num">' + c.existing + '</span><span>already on the roster</span></div>' +
    '<div class="s"><span class="num">' + c.repeated + '</span><span>repeated in the file</span></div>' +
    '<div class="s"><span class="num">' + c.invalid + '</span><span>no valid email</span></div>' +
    (c.badDate ? '<p class="notice tip" style="grid-column:1/-1;margin:0">' + c.badDate + ' timestamp' + (c.badDate === 1 ? '' : 's') + ' could not be read, so ' + (c.badDate === 1 ? 'it uses' : 'they use') + ' today’s date. You can fix them after the import.</p>' : '');
  var shown = plan.rows.slice(0, 8);
  var label = { add: 'Add', existing: 'Already added', repeated: 'Repeat', invalid: 'No email' };
  $('impPreview').innerHTML = '<thead><tr><th>Row</th><th>Result</th><th>Name</th><th>Email</th><th>Registered</th></tr></thead><tbody>' +
    shown.map(function (r) { return '<tr class="' + (r.status === 'add' ? '' : 'skip') + '"><td>' + r.line + '</td><td>' + label[r.status] + '</td><td>' + esc(r.full_name || '—') + '</td><td>' + esc(r.email || '—') + '</td><td>' + esc(BD.fmt(r.registered_on)) + '</td></tr>'; }).join('') +
    (plan.rows.length > shown.length ? '<tr><td colspan="5" class="meta">…and ' + (plan.rows.length - shown.length) + ' more rows</td></tr>' : '') + '</tbody>';
  $('impGo').disabled = c.add === 0 || IMP.map.email < 0;
  $('impGo').textContent = c.add ? 'Import ' + c.add + ' tester' + (c.add === 1 ? '' : 's') : 'Nothing new to import';
}
$('impBody').addEventListener('change', function (ev) {
  if (!IMP) return;
  if (ev.target.dataset.map) IMP.map[ev.target.dataset.map] = parseInt(ev.target.value, 10);
  if (ev.target.id === 'impOrder') IMP.order = ev.target.value;
  if (ev.target.id === 'impKeep') IMP.keepOther = ev.target.checked;
  if (ev.target.dataset.map === 'registered') detectOrder();
  renderImport();
});
$('impGo').addEventListener('click', async function () {
  if (!IMP || !IMP.plan) return;
  var terms = S.settings ? S.settings.terms_offered : '';
  var rows = IMP.plan.rows.filter(function (r) { return r.status === 'add'; }).map(function (r) {
    // Same keys on every row (PostgREST bulk insert).
    return { full_name: r.full_name, email: r.email, device: r.device, source: 'form_csv', registered_on: r.registered_on, notes: r.notes, terms_offered: terms };
  });
  var btn = $('impGo'); btn.disabled = true; btn.textContent = 'Importing…';
  var added = 0, failed = 0;
  try {
    for (var i = 0; i < rows.length; i += 200) {
      // on_conflict + ignore-duplicates: the database skips an email that is already there
      // (another device may have added it a moment ago) instead of failing the batch.
      var r = await db('beta_testers?on_conflict=email_key', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=representation' }, body: rows.slice(i, i + 200) });
      (r.data || []).forEach(function (row) { upsertLocal(row); added++; });
    }
  } catch (e) { failed = rows.length - added; toast(e.message, true); }
  closeDialog('importDialog');
  await loadTesters();
  var skipped = rows.length - added - failed;
  toast('Imported ' + added + ' tester' + (added === 1 ? '' : 's') + (skipped > 0 ? ' · ' + skipped + ' already added elsewhere' : '') + (failed ? ' · ' + failed + ' not saved' : '') + '.', failed > 0);
});

/* ── CSV export ────────────────────────────────────────────────────── */
$('exportBtn').addEventListener('click', function () {
  if (!S.testers.length) { toast('There is nobody to export yet.'); return; }
  var cols = [
    ['Name', 'full_name'], ['Email', 'email'], ['Device', 'device'], ['Source', 'source'], ['Stage', function (t) { return BD.STAGES[BD.stage(t, S.today)].label; }],
    ['Registered on', 'registered_on'], ['Invited on', 'invited_on'], ['Google Play opt-in', 'opted_in_on'], ['Review due (auto: opt-in + 14 days)', 'review_due_on'],
    ['Last feedback on', 'last_feedback_on'], ['Feedback', 'feedback_summary'], ['Participation', 'participation'], ['Participation checked on', 'participation_checked_on'],
    ['Technical issues', 'technical_issues'], ['Terms offered', 'terms_offered'], ['Completion', 'completion'], ['Approved on', 'approved_on'],
    ['CISA reward activated on', 'reward_activated_on'], ['CISA reward ends (auto: activation + 6 months)', 'reward_ends_on'],
    ['Follow-up on', 'follow_up_on'], ['Follow-up note', 'follow_up_note'], ['Next step', function (t) { var a = BD.actions(t, S.today)[0]; return a ? a.label : ''; }],
    ['Notes', 'notes'], ['Added', 'created_at'], ['Last saved', 'updated_at']
  ];
  var lines = [cols.map(function (c) { return BD.csvCell(c[0]); }).join(',')];
  sorted(S.testers.filter(matches)).forEach(function (t) {
    lines.push(cols.map(function (c) { return BD.csvCell(typeof c[1] === 'function' ? c[1](t) : t[c[1]]); }).join(','));
  });
  var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'kaisip-beta-testers-' + S.today + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast('Exported ' + (lines.length - 1) + ' tester' + (lines.length === 2 ? '' : 's') + '. The file holds personal data: keep it private.');
});

/* ── Start ─────────────────────────────────────────────────────────── */
window.KaiSipDesk = { BD: BD };  // the pure helpers, for the automated tests
boot();
