/*
 * GENERATED FILE: do not edit. Built by mobile/scripts/build-web-plant.mjs
 * from the mobile app's own TypeScript (mobile/src/webcloud and the sync
 * engine it uses), so the website syncs with the same rules as the app.
 * Loaded only when an account is used. Rebuild: cd mobile && npm run web-plant
 * TypeScript 6.0.3. Modules: 63.
 */
(function (root) {
  "use strict";
  var defs = {};
  var links = {};
  links["src/cloud/deviceId.ts"] = {};
  defs["src/cloud/deviceId.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidV4 = uuidV4;
exports.isDeviceId = isDeviceId;
exports.getDeviceId = getDeviceId;
exports.renewDeviceId = renewDeviceId;
const KEY = 'aurivan.device';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function uuidV4(bytes) {
    if (bytes.length < 16)
        throw new Error('uuid needs 16 random bytes');
    const b = Uint8Array.from(bytes.slice(0, 16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function isDeviceId(v) {
    return typeof v === 'string' && UUID_RE.test(v);
}
async function getDeviceId(kv, random) {
    const saved = await kv.getItem(KEY);
    if (isDeviceId(saved))
        return saved;
    const id = uuidV4(random.bytes(16));
    await kv.setItem(KEY, id, { thisDeviceOnly: true });
    return id;
}
async function renewDeviceId(kv, random) {
    const id = uuidV4(random.bytes(16));
    await kv.setItem(KEY, id, { thisDeviceOnly: true });
    return id;
}
  };
  links["src/cloud/types.ts"] = {};
  defs["src/cloud/types.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudError = void 0;
exports.errorCode = errorCode;
class CloudError extends Error {
    constructor(code, retryAfterSec, detail) {
        super(code);
        this.code = code;
        this.retryAfterSec = retryAfterSec;
        this.detail = detail;
        this.name = 'CloudError';
    }
}
exports.CloudError = CloudError;
function errorCode(e) {
    return e instanceof CloudError ? e.code : 'server';
}
  };
  links["src/content/certifications.ts"] = {"../theme/tokens":"src/theme/tokens.ts"};
  defs["src/content/certifications.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CERT_ID = exports.CERTIFICATIONS = exports.ISC2 = exports.ISACA = void 0;
exports.selectableCertifications = selectableCertifications;
exports.getCertification = getCertification;
exports.getDomain = getDomain;
exports.domainLabel = domainLabel;
exports.domainColor = domainColor;
exports.combinedTrademarkNotice = combinedTrademarkNotice;
const tokens_1 = require("../theme/tokens");
exports.ISACA = { id: 'isaca', name: 'ISACA' };
exports.ISC2 = { id: 'isc2', name: 'ISC2' };
const ISACA_TM = (name, registered = true) => registered
    ? `Not affiliated with or endorsed by ISACA®. ${name}® is a registered trademark of ISACA.`
    : `Not affiliated with or endorsed by ISACA®. ${name} is a trademark of ISACA.`;
const ISC2_TM = (name) => `Not affiliated with or endorsed by ISC2®. ${name}® is a registered trademark of ISC2, Inc.`;
const ISACA_MINDSET = 'Think like a risk-focused advisor: protect the business, follow governance, ' +
    'and prefer the answer that addresses root cause at the right level of authority.';
const ISACA_MIX = { analysis: 0.3, application: 0.55, foundational: 0.15 };
exports.CERTIFICATIONS = [
    {
        id: 'cisa',
        name: 'CISA',
        fullName: 'Certified Information Systems Auditor',
        issuer: exports.ISACA,
        mindset: 'The auditor assesses, recommends, and reports — never fixes. ' + ISACA_MINDSET,
        trademarkNotice: ISACA_TM('CISA'),
        status: 'available',
        exam: {
            questions: 150,
            minutes: 240,
            difficultyMix: ISACA_MIX,
            passingNote: 'ISACA reports scaled scores from 200–800; 450 is the passing mark.',
        },
        domains: [
            { id: '1', name: 'Information System Auditing Process', short: 'IS Audit', tile: 'IS Audit', weight: 18, tone: 0, emblem: 'domain-audit' },
            { id: '2', name: 'Governance and Management of IT', short: 'IT Governance', tile: 'Governance', weight: 18, tone: 1, emblem: 'domain-governance' },
            { id: '3', name: 'IS Acquisition, Development & Implementation', short: 'IS Acquisition', tile: 'Acquisition', weight: 12, tone: 2, emblem: 'domain-build' },
            { id: '4', name: 'IS Operations & Business Resilience', short: 'IS Operations', tile: 'IS Ops', weight: 26, tone: 3, emblem: 'domain-operations' },
            { id: '5', name: 'Protection of Information Assets', short: 'Info Protection', tile: 'Protection', weight: 26, tone: 4, emblem: 'domain-protection' },
        ],
    },
    {
        id: 'cism',
        name: 'CISM',
        fullName: 'Certified Information Security Manager',
        issuer: exports.ISACA,
        mindset: 'Think like a security manager who serves the business: governance and ' +
            'business alignment come before technical fixes. ' + ISACA_MINDSET,
        trademarkNotice: ISACA_TM('CISM'),
        status: 'coming_soon',
        exam: {
            questions: 150,
            minutes: 240,
            difficultyMix: ISACA_MIX,
            passingNote: 'ISACA reports scaled scores from 200–800; 450 is the passing mark.',
        },
        domains: [
            { id: '1', name: 'Information Security Governance', short: 'Governance', weight: 18, tone: 0 },
            { id: '2', name: 'Information Security Risk Management', short: 'Risk Mgmt', weight: 20, tone: 1 },
            { id: '3', name: 'Information Security Program', short: 'Program', weight: 33, tone: 2 },
            { id: '4', name: 'Incident Management', short: 'Incidents', weight: 29, tone: 3 },
        ],
    },
    {
        id: 'crisc',
        name: 'CRISC',
        fullName: 'Certified in Risk and Information Systems Control',
        issuer: exports.ISACA,
        mindset: 'Think like a risk practitioner: identify, assess, respond, and monitor — ' +
            'risk ownership sits with the business. ' + ISACA_MINDSET,
        trademarkNotice: ISACA_TM('CRISC'),
        status: 'coming_soon',
        exam: {
            questions: 150,
            minutes: 240,
            difficultyMix: ISACA_MIX,
            passingNote: 'ISACA reports scaled scores from 200–800; 450 is the passing mark.',
        },
        domains: [
            { id: '1', name: 'Governance', short: 'Governance', weight: 26, tone: 0 },
            { id: '2', name: 'Risk Assessment', short: 'Assessment', weight: 22, tone: 1 },
            { id: '3', name: 'Risk Response and Reporting', short: 'Response', weight: 32, tone: 2 },
            { id: '4', name: 'Technology and Security', short: 'Tech & Security', weight: 20, tone: 3 },
        ],
    },
    {
        id: 'aaia',
        name: 'AAIA',
        fullName: 'Advanced in AI Audit',
        issuer: exports.ISACA,
        mindset: 'Think like a senior auditor applied to AI: governance, accountability, ' +
            'and evidence over hype. ' + ISACA_MINDSET,
        trademarkNotice: ISACA_TM('AAIA', false),
        trademarkRegistered: false,
        status: 'coming_soon',
        exam: {
            questions: 90,
            minutes: 150,
            difficultyMix: ISACA_MIX,
            passingNote: 'Check ISACA’s current candidate guide for scoring details.',
        },
        domains: [
            { id: '1', name: 'AI Governance and Risk', short: 'Governance', weight: 33, tone: 0 },
            { id: '2', name: 'AI Operations', short: 'Operations', weight: 46, tone: 1 },
            { id: '3', name: 'AI Auditing Tools and Techniques', short: 'Tools', weight: 21, tone: 2 },
        ],
    },
    {
        id: 'cissp',
        name: 'CISSP',
        fullName: 'Certified Information Systems Security Professional',
        issuer: exports.ISC2,
        mindset: 'Think like a manager and advisor, not a technician: protect people first, ' +
            'then align security with business goals and due care.',
        trademarkNotice: ISC2_TM('CISSP'),
        status: 'coming_soon',
        exam: {
            questions: 125,
            minutes: 180,
            difficultyMix: { analysis: 0.35, application: 0.5, foundational: 0.15 },
            passingNote: 'ISC2 reports scaled scores out of 1000; 700 is the passing mark.',
        },
        domains: [
            { id: '1', name: 'Security and Risk Management', short: 'Risk Mgmt', weight: 16, tone: 0 },
            { id: '2', name: 'Asset Security', short: 'Assets', weight: 10, tone: 1 },
            { id: '3', name: 'Security Architecture and Engineering', short: 'Architecture', weight: 13, tone: 2 },
            { id: '4', name: 'Communication and Network Security', short: 'Network', weight: 13, tone: 3 },
            { id: '5', name: 'Identity and Access Management', short: 'IAM', weight: 13, tone: 4 },
            { id: '6', name: 'Security Assessment and Testing', short: 'Testing', weight: 12, tone: 0 },
            { id: '7', name: 'Security Operations', short: 'Operations', weight: 13, tone: 1 },
            { id: '8', name: 'Software Development Security', short: 'AppSec', weight: 10, tone: 2 },
        ],
    },
];
function selectableCertifications(installed, certs = exports.CERTIFICATIONS) {
    return certs.filter((c) => c.status === 'available' && installed(c.id));
}
function getCertification(id) {
    return exports.CERTIFICATIONS.find((c) => c.id === id);
}
function getDomain(cert, domainId) {
    return cert.domains.find((d) => d.id === domainId);
}
exports.DEFAULT_CERT_ID = 'cisa';
function domainLabel(d) {
    return `Domain ${d.id} · ${d.short}`;
}
function domainColor(tone, isDark) {
    return (isDark ? tokens_1.domainPalette.dark : tokens_1.domainPalette.light)[tone];
}
const ISSUER_MARK = { isaca: 'ISACA®', isc2: 'ISC2®' };
const ISSUER_OWNER = { isaca: 'ISACA', isc2: 'ISC2, Inc.' };
const issuerMark = (i) => { var _a; return (_a = ISSUER_MARK[i.id]) !== null && _a !== void 0 ? _a : i.name; };
const issuerOwner = (i) => { var _a; return (_a = ISSUER_OWNER[i.id]) !== null && _a !== void 0 ? _a : i.name; };
const sentence = (s) => (s.endsWith('.') ? s : `${s}.`);
function joinList(items, word = 'and') {
    if (items.length <= 1)
        return items.join('');
    return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}
function combinedTrademarkNotice(certs = exports.CERTIFICATIONS) {
    const issuers = [...new Map(certs.map((c) => [c.issuer.id, c.issuer])).values()];
    const parts = [`KaiSip is not affiliated with or endorsed by ${joinList(issuers.map(issuerMark), 'or')}.`];
    for (const issuer of issuers) {
        const own = certs.filter((c) => c.issuer.id === issuer.id);
        const registered = own.filter((c) => c.trademarkRegistered !== false).map((c) => `${c.name}®`);
        const plain = own.filter((c) => c.trademarkRegistered === false).map((c) => c.name);
        if (registered.length) {
            parts.push(sentence(`${joinList(registered)} ${registered.length > 1 ? 'are registered trademarks' : 'is a registered trademark'} of ${issuerOwner(issuer)}`));
        }
        if (plain.length) {
            parts.push(sentence(`${joinList(plain)} ${plain.length > 1 ? 'are trademarks' : 'is a trademark'} of ${issuerOwner(issuer)}`));
        }
    }
    return parts.join(' ');
}
  };
  links["src/content/types.ts"] = {};
  defs["src/content/types.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LETTERS = void 0;
exports.LETTERS = ['A', 'B', 'C', 'D'];
  };
  links["src/engine/account.ts"] = {"./sha256":"src/engine/sha256.ts","./streak":"src/engine/streak.ts","./support":"src/engine/support.ts"};
  defs["src/engine/account.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PROVIDERS = exports.EXPORT_EVERY_MS = exports.REAUTH_WINDOW_MS = exports.MAX_CODE_TRIES = exports.RESEND_WAIT_MS = exports.CODE_TTL_MS = exports.CODE_LENGTH = exports.TERMS_VERSION = void 0;
exports.parseProviders = parseProviders;
exports.providersFor = providersFor;
exports.normalizeEmail = normalizeEmail;
exports.validEmail = validEmail;
exports.cleanCode = cleanCode;
exports.validCode = validCode;
exports.isRelayEmail = isRelayEmail;
exports.maskEmail = maskEmail;
exports.recentAuth = recentAuth;
exports.deleteGate = deleteGate;
exports.typedDelete = typedDelete;
exports.reauthProvider = reauthProvider;
exports.deleteStep = deleteStep;
exports.resendWaitMs = resendWaitMs;
exports.clockLabel = clockLabel;
exports.clockSpoken = clockSpoken;
exports.accountExportFileName = accountExportFileName;
exports.accountHash = accountHash;
exports.appleNonce = appleNonce;
exports.createNonceGuard = createNonceGuard;
const sha256_1 = require("./sha256");
const streak_1 = require("./streak");
const support_1 = require("./support");
exports.TERMS_VERSION = '2026-11';
exports.CODE_LENGTH = 6;
exports.CODE_TTL_MS = 10 * 60000;
exports.RESEND_WAIT_MS = 60000;
exports.MAX_CODE_TRIES = 5;
exports.REAUTH_WINDOW_MS = 10 * 60000;
exports.EXPORT_EVERY_MS = 60 * 60000;
const MAX_EMAIL = 254;
exports.ALL_PROVIDERS = ['email', 'apple', 'google'];
const RELAY_DOMAIN = '@privaterelay.appleid.com';
function parseProviders(raw) {
    const words = (raw !== null && raw !== void 0 ? raw : '')
        .split(',')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
    if (!words.length)
        return [...exports.ALL_PROVIDERS];
    return exports.ALL_PROVIDERS.filter((p) => words.includes(p));
}
function providersFor(platform, enabled) {
    const appleCapable = platform === 'ios' || platform === 'web';
    const google = enabled.includes('google');
    const apple = appleCapable && (enabled.includes('apple') || (google && platform === 'ios'));
    const out = [];
    if (apple)
        out.push('apple');
    if (google)
        out.push('google');
    if (enabled.includes('email'))
        out.push('email');
    return out;
}
function normalizeEmail(raw) {
    return raw.trim().toLowerCase();
}
function validEmail(raw) {
    const e = normalizeEmail(raw);
    return e.length > 0 && e.length <= MAX_EMAIL && support_1.EMAIL_RE.test(e);
}
function cleanCode(raw) {
    return raw.replace(/\D/g, '').slice(0, exports.CODE_LENGTH);
}
function validCode(raw) {
    return /^\d{6}$/.test(raw);
}
function isRelayEmail(email) {
    return typeof email === 'string' && email.trim().toLowerCase().endsWith(RELAY_DOMAIN);
}
function maskEmail(email) {
    if (!email || isRelayEmail(email))
        return null;
    const e = normalizeEmail(email);
    const at = e.lastIndexOf('@');
    if (at < 1 || at === e.length - 1)
        return null;
    const first = Array.from(e)[0];
    return `${first}•••${e.slice(at)}`;
}
function recentAuth(authAt, now, windowMs = exports.REAUTH_WINDOW_MS) {
    if (!Number.isFinite(authAt) || authAt > now + 60000)
        return false;
    return now - authAt < windowMs;
}
function deleteGate(authAt, now) {
    return recentAuth(authAt, now) ? 'type' : 'reauth';
}
function typedDelete(raw) {
    return raw.trim().toUpperCase() === 'DELETE';
}
function reauthProvider(accountProviders, shown) {
    var _a;
    for (const p of ['apple', 'google', 'email']) {
        if (accountProviders.includes(p) && shown.includes(p))
            return p;
    }
    return (_a = accountProviders[0]) !== null && _a !== void 0 ? _a : 'email';
}
function deleteStep(accountProviders, shown, authAt, now) {
    if (accountProviders.includes('apple') && shown.includes('apple'))
        return { gate: 'reauth', provider: 'apple' };
    return { gate: deleteGate(authAt, now), provider: reauthProvider(accountProviders, shown) };
}
function resendWaitMs(sentAt, now) {
    if (sentAt === null)
        return 0;
    return Math.max(0, Math.min(exports.RESEND_WAIT_MS, sentAt + exports.RESEND_WAIT_MS - now));
}
function clockLabel(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function clockSpoken(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 60 && s % 60 === 0)
        return s === 60 ? '1 minute' : `${s / 60} minutes`;
    return s === 1 ? '1 second' : `${s} seconds`;
}
function accountExportFileName(now) {
    return `kaisip-account-${(0, streak_1.dayKey)(now)}.json`;
}
function accountHash(userId) {
    return (0, sha256_1.sha256Hex)(userId);
}
function appleNonce(randomBytes) {
    if (randomBytes.length < 16)
        throw new Error('nonce needs at least 16 random bytes');
    const raw = (0, sha256_1.toHex)(randomBytes);
    return { raw, hashed: (0, sha256_1.sha256Hex)(raw) };
}
function createNonceGuard() {
    const open = new Set();
    return {
        issue(raw) {
            open.add(raw);
        },
        consume(raw) {
            return open.delete(raw);
        },
    };
}
  };
  links["src/engine/answerClock.ts"] = {};
  defs["src/engine/answerClock.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ANSWER_MS = void 0;
exports.startClock = startClock;
exports.pauseClock = pauseClock;
exports.resumeClock = resumeClock;
exports.elapsedMs = elapsedMs;
exports.addMs = addMs;
exports.MAX_ANSWER_MS = 30 * 60000;
function startClock(now) {
    return { startedAt: now, pausedAt: null, pausedMs: 0 };
}
function pauseClock(clock, now) {
    if (clock.pausedAt !== null)
        return clock;
    return { ...clock, pausedAt: now };
}
function resumeClock(clock, now) {
    if (clock.pausedAt === null)
        return clock;
    return { ...clock, pausedAt: null, pausedMs: clock.pausedMs + Math.max(0, now - clock.pausedAt) };
}
function elapsedMs(clock, now) {
    var _a;
    const until = (_a = clock.pausedAt) !== null && _a !== void 0 ? _a : now;
    const ms = until - clock.startedAt - clock.pausedMs;
    return Math.min(exports.MAX_ANSWER_MS, Math.max(0, Math.round(ms)));
}
function addMs(earlier, more) {
    return Math.min(exports.MAX_ANSWER_MS, Math.max(0, (earlier !== null && earlier !== void 0 ? earlier : 0) + more));
}
  };
  links["src/engine/backup.ts"] = {"../content/certifications":"src/content/certifications.ts","./answerClock":"src/engine/answerClock.ts","./games/growth":"src/engine/games/growth.ts","./milestones":"src/engine/milestones.ts","./plant":"src/engine/plant.ts","./plantForms":"src/engine/plantForms.ts","./plantLooks":"src/engine/plantLooks.ts","./examDay":"src/engine/examDay.ts","./fit":"src/engine/fit.ts","./displayName":"src/engine/displayName.ts","./examWeek":"src/engine/examWeek.ts","./reminders":"src/engine/reminders.ts","./questionNotes":"src/engine/questionNotes.ts","./saveMigrations":"src/engine/saveMigrations.ts","./streak":"src/engine/streak.ts","./studyModes":"src/engine/studyModes.ts","./support":"src/engine/support.ts"};
  defs["src/engine/backup.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentInstalled = exports.FILE_MIGRATIONS = exports.DAILY_GOALS = exports.BackupError = exports.BACKUP_ERROR_COPY = exports.RESERVED_CERT_IDS = exports.CERT_ID_RE = exports.MAX_CERTS = exports.UNDO_DAYS = exports.MAX_PROGRESS_CHARS = exports.MAX_BACKUP_BYTES = exports.BACKUP_SCHEMA = exports.BACKUP_APPS = exports.BACKUP_APP = void 0;
exports.isCertId = isCertId;
exports.toPlain = toPlain;
exports.fitForBackup = fitForBackup;
exports.buildBackup = buildBackup;
exports.backupTooBig = backupTooBig;
exports.backupFileName = backupFileName;
exports.utf8Bytes = utf8Bytes;
exports.migrateFile = migrateFile;
exports.cardSubtopic = cardSubtopic;
exports.cardKnown = cardKnown;
exports.keepKnownIds = keepKnownIds;
exports.keepSupportedMarks = keepSupportedMarks;
exports.keepSupportedPlants = keepSupportedPlants;
exports.readBackup = readBackup;
exports.compareVersions = compareVersions;
exports.hasProtoKey = hasProtoKey;
exports.readStores = readStores;
exports.summarize = summarize;
exports.isFresh = isFresh;
exports.isBehind = isBehind;
exports.previewRows = previewRows;
exports.undoExpiresAt = undoExpiresAt;
exports.undoAvailable = undoAvailable;
const certifications_1 = require("../content/certifications");
const answerClock_1 = require("./answerClock");
const growth_1 = require("./games/growth");
const milestones_1 = require("./milestones");
const plant_1 = require("./plant");
const plantForms_1 = require("./plantForms");
const plantLooks_1 = require("./plantLooks");
const examDay_1 = require("./examDay");
const fit_1 = require("./fit");
const displayName_1 = require("./displayName");
const examWeek_1 = require("./examWeek");
const reminders_1 = require("./reminders");
const questionNotes_1 = require("./questionNotes");
const saveMigrations_1 = require("./saveMigrations");
const streak_1 = require("./streak");
const studyModes_1 = require("./studyModes");
const support_1 = require("./support");
exports.BACKUP_APP = 'kaisip';
exports.BACKUP_APPS = ['kaisip', 'aurivan'];
const FILE_HINT = 'Pick the file that starts with “kaisip-backup” (or “aurivan-backup” from the old Aurivan app).';
exports.BACKUP_SCHEMA = 1;
exports.MAX_BACKUP_BYTES = 1024 * 1024;
exports.MAX_PROGRESS_CHARS = 1500000;
exports.UNDO_DAYS = 7;
const DAY_MS = 24 * 3600000;
const MAX_IDS = 5000;
exports.MAX_CERTS = 16;
exports.CERT_ID_RE = /^[a-z0-9-]{2,20}$/;
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
exports.RESERVED_CERT_IDS = new Set([
    ...PROTO_KEYS,
    'hasownproperty',
    'isprototypeof',
    'propertyisenumerable',
    'tostring',
    'tolocalestring',
    'valueof',
    'name',
    'length',
    'arguments',
    'caller',
    'apply',
    'bind',
    'call',
]);
function isCertId(x) {
    return typeof x === 'string' && exports.CERT_ID_RE.test(x) && !exports.RESERVED_CERT_IDS.has(x);
}
const MAX_SMALL = 5000;
const MAX_LIST = 200;
const MAX_KEY = 120;
const MAX_TEXT = 500;
exports.BACKUP_ERROR_COPY = {
    'too-big': `This file is too big to be a KaiSip backup. ${FILE_HINT} Nothing was changed.`,
    'not-json': `This file isn’t a KaiSip backup. ${FILE_HINT} Nothing was changed.`,
    'not-kaisip': `This file isn’t a KaiSip backup. ${FILE_HINT} Nothing was changed.`,
    newer: 'This backup was made by a newer version of KaiSip. Update the app, then try again. Nothing was changed.',
    'unknown-schema': 'This backup’s format isn’t one KaiSip knows. Update the app, then try again. Nothing was changed.',
    'unknown-cert': 'This backup has progress for an exam this version of KaiSip doesn’t know. Update the app, then try again. Nothing was changed.',
    'bad-data': 'Part of this backup is damaged, so it can’t be restored. Try an older backup if you have one. Nothing was changed.',
    unreadable: 'KaiSip couldn’t open that file. Try again, or move the file to Files or Downloads first. Nothing was changed.',
};
class BackupError extends Error {
    constructor(code, where = '') {
        super(where ? `${code} at ${where}` : code);
        this.code = code;
        this.where = where;
    }
}
exports.BackupError = BackupError;
let fitting = false;
const clampTo = (n, min, max) => Math.min(max, Math.max(min, n));
const bad = (at) => {
    throw new BackupError('bad-data', at);
};
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const bool = (x, at) => (typeof x === 'boolean' ? x : bad(at));
const num = (x, at) => (typeof x === 'number' && Number.isFinite(x) ? x : bad(at));
const int = (min, max) => (x, at) => {
    if (fitting && typeof x === 'number' && Number.isFinite(x))
        return clampTo(Math.round(x), min, max);
    return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : bad(at);
};
const count = int(0, 10000000);
const str = (max = MAX_TEXT) => (x, at) => (typeof x === 'string' && x.length <= max ? x : bad(at));
const range = (min, max) => (x, at) => {
    if (fitting && typeof x === 'number' && Number.isFinite(x))
        return clampTo(x, min, max);
    return typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? x : bad(at);
};
function rule(check, ok, repair) {
    return (x, at) => {
        const v = check(x, at);
        if (ok(v))
            return v;
        if (fitting && repair) {
            const fixed = repair(v);
            if (ok(fixed))
                return fixed;
        }
        return bad(at);
    };
}
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;
const ts = range(Date.UTC(YEAR_MIN, 0, 1), Date.UTC(YEAR_MAX, 11, 31));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = (x, at) => {
    if (typeof x !== 'string' || !DATE_RE.test(x))
        return bad(at);
    const [y, m, d] = x.split('-').map(Number);
    const back = new Date(Date.UTC(y, m - 1, d));
    const real = back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d;
    return real && y >= YEAR_MIN && y <= YEAR_MAX ? x : bad(at);
};
exports.DAILY_GOALS = [10, 20, 40];
const dailyGoal = (x, at) => {
    const n = num(x, at);
    return exports.DAILY_GOALS.reduce((best, g) => (Math.abs(g - n) < Math.abs(best - n) ? g : best), exports.DAILY_GOALS[0]);
};
const dailyMinutes = (x, at) => (0, fit_1.snapMinutes)(num(x, at));
const studySize = (x, at) => {
    const n = num(x, at);
    return studyModes_1.SESSION_SIZES.reduce((best, g) => (Math.abs(g - n) < Math.abs(best - n) ? g : best), studyModes_1.SESSION_SIZES[0]);
};
function oneOf(...values) {
    return (x, at) => (values.includes(x) ? x : bad(at));
}
function nullable(check) {
    return (x, at) => (x === null ? null : check(x, at));
}
function list(check, max, keep = 'first') {
    return (x, at) => {
        if (fitting && Array.isArray(x) && x.length > max)
            x = keep === 'newest' ? x.slice(-max) : x.slice(0, max);
        if (!Array.isArray(x) || x.length > max)
            return bad(at);
        return x.map((v, i) => check(v, `${at}[${i}]`));
    };
}
function map(check, max, key = str(MAX_KEY)) {
    return (x, at) => {
        if (!isObj(x))
            return bad(at);
        let keys = Object.keys(x);
        if (fitting && keys.length > max)
            keys = keys.slice(0, max);
        if (keys.length > max)
            return bad(at);
        const out = {};
        for (const k of keys) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype')
                return bad(`${at}.${k}`);
            out[key(k, `${at}.${k}`)] = check(x[k], `${at}.${k}`);
        }
        return out;
    };
}
function obj(req, opt) {
    return (x, at) => {
        if (!isObj(x))
            return bad(at);
        const out = {};
        for (const k of Object.keys(req))
            out[k] = req[k](x[k], `${at}.${k}`);
        for (const k of Object.keys(opt !== null && opt !== void 0 ? opt : {})) {
            const v = x[k];
            if (v === undefined)
                continue;
            const check = opt[k];
            if (v === null) {
                try {
                    out[k] = check(null, `${at}.${k}`);
                }
                catch {
                }
                continue;
            }
            out[k] = check(v, `${at}.${k}`);
        }
        return out;
    };
}
const CONFIDENCE = oneOf('sure', 'unsure', 'guessing');
const LETTER = oneOf('A', 'B', 'C', 'D');
const SLIP = oneOf('role', 'priority', 'tech-first', 'symptom', 'misread', 'knowledge');
const id = str(MAX_KEY);
const answerRecord = rule(obj({ attempts: count, correctCount: count, lastCorrect: bool, lastAt: ts }, { lastAssisted: bool, lastRetest: bool, lastGame: bool, ms: int(0, answerClock_1.MAX_ANSWER_MS), lastConfidence: CONFIDENCE }), (a) => a.correctCount <= a.attempts, (a) => ({ ...a, correctCount: Math.min(a.correctCount, a.attempts) }));
const reviewEntry = obj({ box: int(0, 100), dueAt: ts, lastSeen: ts, reps: count });
const tally = rule(obj({ total: count, correct: count }), (t) => t.correct <= t.total, (t) => ({ ...t, correct: Math.min(t.correct, t.total) }));
const mockResult = rule(obj({
    id,
    finishedAt: ts,
    total: count,
    correct: count,
    minutesUsed: range(0, 1440),
    byDomain: map(tally, 50),
}, {
    timing: oneOf('standard', 'plus25', 'plus50', 'untimed'),
    minutesAllowed: range(0, 1440),
    medianSec: range(0, answerClock_1.MAX_ANSWER_MS / 1000),
    unanswered: count,
    checkpoints: list(range(-1000, 1), 10),
}), (m) => { var _a; return m.correct <= m.total && ((_a = m.unanswered) !== null && _a !== void 0 ? _a : 0) <= m.total; }, (m) => ({ ...m, correct: Math.min(m.correct, m.total), ...(m.unanswered !== undefined ? { unanswered: Math.min(m.unanswered, m.total) } : {}) }));
const mistakeEntry = obj({ at: ts }, { picked: LETTER, slip: SLIP, resolved: bool, confidence: CONFIDENCE, fixedLater: bool });
const percent = range(0, 100);
const readinessDay = obj({ day: date, min: nullable(percent), last: nullable(percent) });
const examWeekDone = (x) => (Array.isArray(x) ? (0, examWeek_1.cleanDone)(x.filter((v) => typeof v === 'string')) : []);
const examWeekDays = (x) => (Array.isArray(x) ? (0, examWeek_1.cleanDays)(x) : []);
const examWeek = obj({ for: date, done: examWeekDone }, { hidden: bool, days: examWeekDays });
const displayNameCheck = (x) => (typeof x === 'string' && x.length <= MAX_TEXT ? (0, displayName_1.cleanDisplayName)(x) : '');
const moments = obj({}, { readiness: list(readinessDay, MAX_LIST * 2), readySeenAt: ts, examWeek });
const subtopicMastery = obj({ firstDay: date }, { firstAt: ts, masteredAt: date });
const gameScore = range(-1000, 100000);
const gameGrowth = obj({ tier: oneOf(...growth_1.GAME_TIERS), up: int(0, 100), down: int(0, 100) }, { hits: list(bool, growth_1.HITS_CAP, 'newest'), run: count });
const COUNTERS = {
    longRecall: count,
    graduated: count,
    loopFixed: count,
    gameFixes: count,
    paceRounds: count,
};
const windowHit = obj({ id, ok: bool });
const milestones = obj({ earned: map(ts, 200) }, {
    queue: list(id, 50),
    backfill: obj({ at: ts, count }, { seen: bool }),
    counts: obj({}, COUNTERS),
    sure: list(bool, milestones_1.SURE_WINDOW, 'newest'),
    longIds: list(id, milestones_1.LONG_IDS_CAP),
    myths: list(windowHit, milestones_1.MYTH_WINDOW, 'newest'),
    signposts: list(windowHit, milestones_1.SIGNPOST_WINDOW, 'newest'),
    gameMisses: map(date, MAX_IDS),
    cardMisses: map(date, MAX_IDS),
    days: count,
    lastDay: date,
    returnedOn: date,
    planters: map(ts, 20),
    catalog: int(0, 100),
    catalogFill: obj({ at: ts, count }, { seen: bool }),
});
const GROWTH = (x, at) => {
    if (fitting && typeof x === 'number' && Number.isFinite(x))
        return clampTo(Math.round(x), 1, plant_1.MAX_GROWTH);
    return (0, plant_1.isGrowthLevel)(x) ? x : bad(at);
};
const lookId = (x, at) => ((0, plant_1.isLookId)(x) ? x : bad(at));
const slotLook = (slot) => (x, at) => (0, plantLooks_1.isLookOfSlot)(x, slot) ? x : bad(at);
const plantName = (x, at) => {
    if (typeof x !== 'string' || x.length > 80)
        return bad(at);
    const c = (0, plant_1.cleanPlantName)(x);
    return c === x ? x : fitting ? c : bad(at);
};
const plantReached = obj({}, Object.fromEntries(plant_1.GROWTH_IDS.map((g) => [g, ts])));
const plantShape = rule(obj({ species: oneOf(...plant_1.PLANT_SPECIES), name: plantName, plantedAt: ts, growth: GROWTH }, {
    replantedAt: ts,
    reached: plantReached,
    pending: GROWTH,
    backfill: obj({ at: ts, growth: GROWTH }, { seen: bool }),
    look: obj({}, {
        style: slotLook('style'),
        colourway: slotLook('colourway'),
        ground: slotLook('ground'),
        planter: slotLook('planter'),
        visitor: slotLook('visitor'),
        keepsakes: list(slotLook('keepsake'), plant_1.MAX_KEEPSAKES),
        final: oneOf(...plantForms_1.FINAL_IDS),
    }),
    kept: list(lookId, plant_1.MAX_KEPT),
    passedOn: date,
}), (p) => (0, plant_1.isValidPlantState)(p), (p) => (0, plant_1.repairPlant)(p));
const plant = (x, at) => {
    if (fitting && isObj(x)) {
        try {
            x = (0, plant_1.repairPlant)(x);
        }
        catch {
        }
    }
    return plantShape(x, at);
};
const noteText = (x, at) => (typeof x === 'string' ? (0, questionNotes_1.capNoteText)(x) : bad(at));
const questionNote = obj({ text: noteText, ts });
const plantSettings = obj({}, { showPlant: bool, quietLook: bool, promptHidden: bool });
const certProgress = obj({}, {
    answers: map(answerRecord, MAX_IDS),
    review: map(reviewEntry, MAX_IDS),
    bookmarks: list(id, MAX_IDS),
    mocks: list(mockResult, MAX_LIST),
    lessonsDone: list(id, MAX_SMALL),
    mistakes: map(mistakeEntry, MAX_IDS),
    gameBest: map(gameScore, 50),
    gameRecent: map(list(gameScore, 50), 50),
    notesRead: list(id, MAX_SMALL),
    notesViewed: list(id, MAX_SMALL),
    notesEverRead: int(0, MAX_SMALL),
    moments,
    mastery: map(subtopicMastery, MAX_SMALL),
    studyPath: obj({}, { inOrder: map(id, 50), guided: map(id, 50) }),
    cards: map(reviewEntry, MAX_IDS),
    gameGrowth: map(gameGrowth, 50),
    milestones,
    plant,
    qNotes: map(questionNote, MAX_IDS),
});
const reportRef = (x, at) => (typeof x === 'string' && support_1.REF_RE.test(x) ? x : bad(at));
const appVersion = (x, at) => (typeof x === 'string' && (0, support_1.parseVersion)(x) ? x : bad(at));
const reportEntry = obj({ ref: reportRef, item: id, reason: str(20), at: ts, cert: str(40) }, { version: appVersion, creditSeen: bool });
const streak = obj({ current: count, best: count, lastDay: nullable(date) }, { restDay: nullable(date), recentDays: list(date, MAX_LIST) });
function settingsCheck(certKey) {
    return obj({ onboarded: bool, activeCertId: certKey }, {
        examDates: map(date, exports.MAX_CERTS, certKey),
        theme: oneOf('system', 'dark', 'light'),
        motion: oneOf('system', 'reduced'),
        shuffleOptions: bool,
        dailyGoal,
        reminder: obj({ enabled: bool, hour: int(0, 23), minute: int(0, 59) }, { days: list(int(0, 6), 7) }),
        haptics: bool,
        gameRulesSeen: list(str(40), 50),
        practiceTimer: bool,
        paceOffer: oneOf('accepted', 'dismissed'),
        studyMode: oneOf('smart', 'guided', 'inOrder', 'random'),
        studyDomain: str(10),
        studySize,
        badgesHidden: bool,
        familiarity: oneOf('new', 'some', 'experienced'),
        dailyMinutes,
        examFocused: bool,
        fitPrompt: oneOf('answered', 'dismissed'),
        fitChanges: int(0, 9999),
        fitAskDays: list(date, 3),
        displayName: displayNameCheck,
    });
}
function progressCheck(certKey) {
    return obj({
        byCert: map(certProgress, exports.MAX_CERTS, certKey),
        streak,
        today: obj({ day: (x, at) => (x === '' ? '' : date(x, at)), answered: count }),
    }, { reports: list(reportEntry, support_1.MAX_REPORTS), plantSettings });
}
function toPlain(value) {
    return JSON.parse(JSON.stringify(value));
}
function fitForBackup(stores) {
    const anyKey = str(MAX_KEY);
    const fit = (value, check, at) => {
        const plain = toPlain(value);
        fitting = true;
        try {
            return { ...plain, ...check(plain, at) };
        }
        catch {
            return plain;
        }
        finally {
            fitting = false;
        }
    };
    return {
        settings: fit(stores.settings, settingsCheck(anyKey), 'settings'),
        progress: fit(stores.progress, progressCheck(anyKey), 'progress'),
    };
}
function buildBackup(rawStores, meta) {
    const stores = fitForBackup(rawStores);
    stores.progress = withoutOldTombstones(stores.progress, meta.now);
    return {
        app: exports.BACKUP_APP,
        schema: exports.BACKUP_SCHEMA,
        exportedAt: new Date(meta.now).toISOString(),
        appVersion: meta.appVersion,
        stores: {
            settings: { version: saveMigrations_1.SETTINGS_VERSION, state: toPlain(stores.settings) },
            progress: { version: saveMigrations_1.PROGRESS_VERSION, state: toPlain(stores.progress) },
        },
    };
}
function withoutOldTombstones(progress, now) {
    if (!isObj(progress) || !isObj(progress.byCert))
        return progress;
    const byCert = {};
    for (const [id, cp] of Object.entries(progress.byCert)) {
        if (!isObj(cp) || !isObj(cp.qNotes)) {
            byCert[id] = cp;
            continue;
        }
        byCert[id] = { ...cp, qNotes: (0, questionNotes_1.pruneTombstones)(cp.qNotes, now) };
    }
    return { ...progress, byCert };
}
function backupTooBig(text) {
    return utf8Bytes(text) > exports.MAX_BACKUP_BYTES;
}
function backupFileName(now) {
    return `kaisip-backup-${(0, streak_1.dayKey)(now)}.json`;
}
function utf8Bytes(text) {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c < 0x80)
            bytes += 1;
        else if (c < 0x800)
            bytes += 2;
        else if (c >= 0xd800 && c <= 0xdbff) {
            bytes += 4;
            i++;
        }
        else
            bytes += 3;
    }
    return bytes;
}
exports.FILE_MIGRATIONS = {};
function migrateFile(file, migrations = exports.FILE_MIGRATIONS, target = exports.BACKUP_SCHEMA) {
    let cur = file;
    for (let v = cur.schema; v < target; v++) {
        const step = migrations[v];
        if (!step)
            throw new BackupError('unknown-schema', `schema ${v}`);
        cur = { ...step(cur), schema: v + 1 };
    }
    return cur;
}
function readStore(blob, current, upgrade, at) {
    if (!isObj(blob))
        return bad(at);
    const version = blob.version;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0)
        return bad(`${at}.version`);
    if (version > current)
        throw new BackupError('newer', `${at}.version`);
    if (!isObj(blob.state))
        return bad(`${at}.state`);
    return version < current && upgrade ? upgrade(blob.state) : blob.state;
}
function keepKeys(m, keep) {
    if (!m)
        return m;
    const out = {};
    for (const [k, v] of Object.entries(m))
        if (keep.has(k))
            out[k] = v;
    return out;
}
const keepIds = (l, keep) => l === null || l === void 0 ? void 0 : l.filter((x) => keep.has(x));
function keepValues(m, keep) {
    return Object.fromEntries(Object.entries(m).filter(([, v]) => keep.has(v)));
}
function cardSubtopic(cardId) {
    var _a;
    return (_a = cardId.split(':')[1]) !== null && _a !== void 0 ? _a : '';
}
function cardCheckable(cardId, k) {
    var _a, _b;
    const [kind, owner = ''] = cardId.split(':');
    if (kind === 'flow')
        return k.lessons.size > 0;
    if (/^D\d+$/.test(owner))
        return ((_b = (_a = k.domains) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0) > 0;
    return k.notes.size > 0;
}
function cardKnown(cardId, k) {
    var _a, _b;
    const [kind, owner = ''] = cardId.split(':');
    if (kind === 'flow')
        return k.lessons.has(owner);
    if (/^D\d+$/.test(owner))
        return (_b = (_a = k.domains) === null || _a === void 0 ? void 0 : _a.has(owner.slice(1))) !== null && _b !== void 0 ? _b : false;
    return k.notes.has(owner);
}
const contentInstalled = (k) => { var _a; return (_a = k.installed) !== null && _a !== void 0 ? _a : k.questions.size + k.lessons.size + k.notes.size > 0; };
exports.contentInstalled = contentInstalled;
function keepKnownIds(progress, known) {
    var _a, _b;
    const byCert = {};
    for (const [certId, cp] of Object.entries(progress.byCert)) {
        const k = known(certId);
        if (!(0, exports.contentInstalled)(k)) {
            byCert[certId] = cp;
            continue;
        }
        const next = { ...cp };
        if (k.questions.size > 0) {
            if (cp.answers)
                next.answers = keepKeys(cp.answers, k.questions);
            if (cp.review)
                next.review = keepKeys(cp.review, k.questions);
            if (cp.mistakes)
                next.mistakes = keepKeys(cp.mistakes, k.questions);
            if (cp.bookmarks)
                next.bookmarks = keepIds(cp.bookmarks, k.questions);
            if (cp.qNotes)
                next.qNotes = keepKeys(cp.qNotes, k.questions);
            if ((_a = cp.studyPath) === null || _a === void 0 ? void 0 : _a.inOrder)
                next.studyPath = { ...cp.studyPath, inOrder: keepValues(cp.studyPath.inOrder, k.questions) };
            if ((_b = cp.milestones) === null || _b === void 0 ? void 0 : _b.gameMisses)
                next.milestones = { ...cp.milestones, gameMisses: keepKeys(cp.milestones.gameMisses, k.questions) };
        }
        if (k.lessons.size > 0 && cp.lessonsDone)
            next.lessonsDone = keepIds(cp.lessonsDone, k.lessons);
        if (k.notes.size > 0) {
            if (cp.notesRead)
                next.notesRead = keepIds(cp.notesRead, k.notes);
            if (cp.notesViewed)
                next.notesViewed = keepIds(cp.notesViewed, k.notes);
            if (cp.mastery)
                next.mastery = keepKeys(cp.mastery, k.notes);
        }
        if (cp.cards)
            next.cards = Object.fromEntries(Object.entries(cp.cards).filter(([key]) => !cardCheckable(key, k) || cardKnown(key, k)));
        byCert[certId] = next;
    }
    return { ...progress, byCert };
}
function keepSupportedMarks(progress, opts = {}) {
    const byCert = {};
    for (const [certId, cp] of Object.entries(progress.byCert)) {
        const cert = (0, certifications_1.getCertification)(certId);
        const exam = cert ? { domains: cert.domains.map((d) => d.id), fullMockSize: cert.exam.questions } : undefined;
        const cut = opts.mocksMayBeCut ? { mocksMayBeCut: true } : {};
        byCert[certId] = cp.milestones ? { ...cp, milestones: (0, milestones_1.keepSupported)(cp.milestones, { ...cp, ...(exam ? { exam } : {}), ...cut }) } : cp;
    }
    return { ...progress, byCert };
}
function keepSupportedPlants(progress, known) {
    var _a, _b, _c, _d, _e, _f;
    let changed = false;
    const byCert = {};
    for (const [certId, cp] of Object.entries(progress.byCert)) {
        const cert = (0, certifications_1.getCertification)(certId);
        const notHere = known ? !(0, exports.contentInstalled)(known(certId)) : false;
        if (!cp.plant || !cert || notHere) {
            byCert[certId] = cp;
            continue;
        }
        const e = (0, plant_1.supportEvidence)({
            cert,
            answers: (_a = cp.answers) !== null && _a !== void 0 ? _a : {},
            mastery: cp.mastery,
            subtopicsByDomain: (_b = known === null || known === void 0 ? void 0 : known(certId).plantOutline) !== null && _b !== void 0 ? _b : [],
            mocks: ((_c = cp.mocks) !== null && _c !== void 0 ? _c : []).map((m) => ({ total: m.total, correct: m.correct, day: (0, streak_1.dayKey)(m.finishedAt), ...(m.timing ? { timing: m.timing } : {}), ...(m.unanswered !== undefined ? { unanswered: m.unanswered } : {}) })),
            readinessLog: (_d = cp.moments) === null || _d === void 0 ? void 0 : _d.readiness,
            readySeenAt: (_e = cp.moments) === null || _e === void 0 ? void 0 : _e.readySeenAt,
            earned: (_f = cp.milestones) === null || _f === void 0 ? void 0 : _f.earned,
        });
        const clamped = (0, plant_1.clampToSupported)(cp.plant, (0, plant_1.maxSupportedGrowth)(e));
        if (clamped !== cp.plant)
            changed = true;
        byCert[certId] = clamped === cp.plant ? cp : { ...cp, plant: clamped };
    }
    return changed ? { ...progress, byCert } : progress;
}
function readBackup(text, knownCertIds, known, thisApp) {
    if (utf8Bytes(text) > exports.MAX_BACKUP_BYTES)
        throw new BackupError('too-big');
    const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    let raw;
    try {
        raw = JSON.parse(body);
    }
    catch {
        const ours = body.trimStart().startsWith('{') && /"app"\s*:\s*"(?:kaisip|aurivan)"/.test(body);
        throw new BackupError(ours ? 'bad-data' : 'not-json');
    }
    if (!isObj(raw) || typeof raw.app !== 'string' || !exports.BACKUP_APPS.includes(raw.app))
        throw new BackupError('not-kaisip');
    const fileApp = typeof raw.appVersion === 'string' ? raw.appVersion : '';
    if (thisApp && compareVersions(fileApp, thisApp, 2) > 0)
        throw new BackupError('newer', 'appVersion');
    try {
        return readChecked(raw, fileApp, knownCertIds, known, thisApp);
    }
    catch (e) {
        if (e instanceof BackupError && e.code === 'bad-data' && thisApp && compareVersions(fileApp, thisApp) > 0) {
            throw new BackupError('newer', e.where);
        }
        throw e;
    }
}
function compareVersions(a, b, parts = 3) {
    var _a, _b;
    const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
    const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < parts; i++) {
        const d = ((_a = pa[i]) !== null && _a !== void 0 ? _a : 0) - ((_b = pb[i]) !== null && _b !== void 0 ? _b : 0);
        if (d !== 0)
            return d;
    }
    return 0;
}
function readChecked(raw, fileApp, knownCertIds, known, thisApp) {
    const schema = raw.schema;
    if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1)
        throw new BackupError('unknown-schema');
    if (schema > exports.BACKUP_SCHEMA)
        throw new BackupError('newer', 'schema');
    const file = migrateFile(raw);
    if (!isObj(file.stores))
        throw new BackupError('bad-data', 'stores');
    const { settings, progress } = readStores({ settings: file.stores.settings, progress: file.stores.progress }, { appVersion: fileApp }, knownCertIds, known, thisApp);
    const exportedAt = typeof file.exportedAt === 'string' && file.exportedAt.length <= 40 ? file.exportedAt : '';
    return { settings, progress, exportedAt };
}
function hasProtoKey(x, depth = 0) {
    if (depth > 40)
        return true;
    if (Array.isArray(x))
        return x.some((v) => hasProtoKey(v, depth + 1));
    if (!isObj(x))
        return false;
    for (const k of Object.keys(x)) {
        if (PROTO_KEYS.has(k) || hasProtoKey(x[k], depth + 1))
            return true;
    }
    return false;
}
function readStores(stores, envelope, knownCertIds, known, thisApp, opts = {}) {
    if (thisApp && compareVersions(envelope.appVersion, thisApp, 2) > 0)
        throw new BackupError('newer', 'appVersion');
    try {
        return readStoresChecked(stores, knownCertIds, known, opts);
    }
    catch (e) {
        if (e instanceof BackupError && e.code === 'bad-data' && thisApp && compareVersions(envelope.appVersion, thisApp) > 0) {
            throw new BackupError('newer', e.where);
        }
        throw e;
    }
}
function readStoresChecked(stores, knownCertIds, known, opts) {
    const certKey = (x, at) => {
        if (typeof x !== 'string')
            return bad(at);
        if (exports.RESERVED_CERT_IDS.has(x) || !(knownCertIds.includes(x) || isCertId(x)))
            throw new BackupError('unknown-cert', at);
        return x;
    };
    const strictRaw = (blob, at) => {
        var _a;
        if (!opts.strict || !isObj(blob))
            return;
        if (hasProtoKey(blob))
            throw new BackupError('bad-data', at);
        if (JSON.stringify((_a = blob.state) !== null && _a !== void 0 ? _a : null).length > exports.MAX_PROGRESS_CHARS)
            throw new BackupError('too-big', at);
    };
    let settings = undefined;
    let progress = undefined;
    if (opts.only !== 'progress') {
        strictRaw(stores.settings, 'settings');
        settings = settingsCheck(certKey)(readStore(stores.settings, saveMigrations_1.SETTINGS_VERSION, null, 'settings'), 'settings');
    }
    if (opts.only !== 'settings') {
        strictRaw(stores.progress, 'progress');
        const checked = progressCheck(certKey)(readStore(stores.progress, saveMigrations_1.PROGRESS_VERSION, saveMigrations_1.migrateProgress, 'progress'), 'progress');
        const supported = keepSupportedPlants(keepSupportedMarks(checked, { mocksMayBeCut: opts.mocksMayBeCut }), known);
        progress = known ? keepKnownIds(supported, known) : supported;
        if (JSON.stringify(progress).length > exports.MAX_PROGRESS_CHARS)
            throw new BackupError('too-big', 'progress');
    }
    return { settings, progress };
}
const answeredIn = (d) => { var _a, _b; return Object.keys((_b = (_a = d.progress.byCert[d.settings.activeCertId]) === null || _a === void 0 ? void 0 : _a.answers) !== null && _b !== void 0 ? _b : {}).length; };
function summarize(data, certName, locale) {
    var _a;
    const certId = data.settings.activeCertId;
    const examDate = (_a = data.settings.examDates) === null || _a === void 0 ? void 0 : _a[certId];
    const answered = answeredIn(data);
    const best = data.progress.streak.best;
    const lastDay = data.progress.streak.lastDay;
    const reminder = data.settings.reminder;
    return {
        exam: certName(certId),
        examDate: examDate && DATE_RE.test(examDate) ? (0, examDay_1.examDateLabel)(examDate) : 'Not set',
        answered: answered === 1 ? '1 question' : `${answered} questions`,
        lastStudied: lastDay && DATE_RE.test(lastDay) ? (0, examDay_1.examDateLabel)(lastDay) : 'Not yet',
        bestStreak: best === 1 ? '1 day' : `${best} days`,
        reminder: (reminder === null || reminder === void 0 ? void 0 : reminder.enabled) ? (0, reminders_1.reminderSummary)(reminder, locale) : 'Off',
    };
}
function isFresh(phone) {
    const certs = Object.values(phone.progress.byCert);
    const any = certs.some((cp) => { var _a, _b; return Object.keys((_a = cp.answers) !== null && _a !== void 0 ? _a : {}).length > 0 || ((_b = cp.lessonsDone) !== null && _b !== void 0 ? _b : []).length > 0; });
    return !any && !phone.progress.streak.lastDay;
}
function isBehind(phone, backup) {
    if (answeredIn(backup) < answeredIn(phone))
        return true;
    const a = backup.progress.streak.lastDay;
    const b = phone.progress.streak.lastDay;
    return Boolean(b && (!a || a < b));
}
function previewRows(now, backup) {
    const rows = [
        ['Exam', 'exam'],
        ['Exam date', 'examDate'],
        ['Questions answered', 'answered'],
        ['Last studied', 'lastStudied'],
        ['Best streak', 'bestStreak'],
        ['Study reminder', 'reminder'],
    ];
    return rows.map(([label, k]) => ({ label, now: now[k], backup: backup[k], changes: now[k] !== backup[k] }));
}
function undoExpiresAt(snap) {
    return snap.takenAt + exports.UNDO_DAYS * DAY_MS;
}
function undoAvailable(snap, now) {
    return Boolean(snap) && now < undoExpiresAt(snap);
}
  };
  links["src/engine/displayName.ts"] = {};
  defs["src/engine/displayName.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_DISPLAY_NAME = void 0;
exports.cleanDisplayName = cleanDisplayName;
exports.greetingForHour = greetingForHour;
exports.greetingWithName = greetingWithName;
exports.MAX_DISPLAY_NAME = 24;
const MAX_SCAN = 256;
const UNSAFE = /[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u2028-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFFB]/g;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const SPACES = /[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g;
const LINKISH = /@|:\/\/|\bwww\.|\b(?:mailto|tel|sms|javascript|data|file|ftp|http|https):|\b[\p{L}\p{N}-]+\.(?:com|net|org|edu|gov|io|co|app|dev|me|ph|ly|xyz|info|biz|link|site|online|ai|us|uk|ca|au|ru|cn|tk|ml|ga|cf|gq|top|club|shop|store|page|click)\b/iu;
function cleanDisplayName(input) {
    if (typeof input !== 'string')
        return '';
    const flat = input.slice(0, MAX_SCAN).replace(UNSAFE, '').replace(LONE_SURROGATE, '').replace(SPACES, ' ').trim();
    if (flat === '' || LINKISH.test(flat))
        return '';
    const chars = Array.from(flat);
    return chars.length <= exports.MAX_DISPLAY_NAME ? flat : chars.slice(0, exports.MAX_DISPLAY_NAME).join('').trim();
}
function greetingForHour(hour) {
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
function greetingWithName(hour, name) {
    const clean = cleanDisplayName(name);
    return clean ? `${greetingForHour(hour)}, ${clean}` : greetingForHour(hour);
}
  };
  links["src/engine/examDay.ts"] = {"./pace":"src/engine/pace.ts","./slipCoach":"src/engine/slipCoach.ts","./streak":"src/engine/streak.ts"};
  defs["src/engine/examDay.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVE_DEFAULTS = exports.EVE_REMINDER = exports.EXAM_DATE_PRESETS = void 0;
exports.dateInMonths = dateInMonths;
exports.addDays = addDays;
exports.presetIndexFor = presetIndexFor;
exports.examDateLabel = examDateLabel;
exports.daysToExam = daysToExam;
exports.examMoment = examMoment;
exports.paceLine = paceLine;
exports.topSlips = topSlips;
exports.eveReminders = eveReminders;
const pace_1 = require("./pace");
const slipCoach_1 = require("./slipCoach");
const streak_1 = require("./streak");
exports.EXAM_DATE_PRESETS = [
    { label: 'In 1 month', months: 1 },
    { label: 'In 2 months', months: 2 },
    { label: 'In 3 months', months: 3 },
    { label: 'Not sure yet' },
];
function dateInMonths(months, now) {
    const d = new Date(now);
    const t = new Date(d.getFullYear(), d.getMonth() + months, 1, 12);
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(d.getDate(), last));
    return (0, streak_1.dayKey)(t.getTime());
}
function addDays(date, days) {
    const [y, m, d] = date.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + days));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
function presetIndexFor(date, now) {
    if (!date)
        return exports.EXAM_DATE_PRESETS.findIndex((p) => p.months === undefined);
    return exports.EXAM_DATE_PRESETS.findIndex((p) => p.months !== undefined && dateInMonths(p.months, now) === date);
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function examDateLabel(date) {
    const [y, m, d] = date.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
}
function daysToExam(examDate, today) {
    if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate))
        return null;
    return (0, streak_1.daysBetween)(today, examDate);
}
function examMoment(examDate, now, toDay = streak_1.dayKey) {
    const left = daysToExam(examDate, toDay(now));
    if (left === 1)
        return 'eve';
    if (left === 0)
        return 'day';
    return null;
}
function paceLine(exam) {
    const h = Math.floor(exam.minutes / 60);
    const m = exam.minutes % 60;
    const hours = h === 0 ? `${m} minutes` : m === 0 ? `${h} hour${h === 1 ? '' : 's'}` : `${h} h ${m} min`;
    return `${exam.questions} questions in ${hours}: about ${Math.round((0, pace_1.examPaceSeconds)(exam))} seconds each.`;
}
exports.EVE_REMINDER = {
    'runner-up': 'When two options look right, say why the best one wins.',
    priority: 'Find the FIRST or BEST word before you read the options.',
    overconfident: 'Give a sure answer one more read of the question.',
    role: 'Ask who you are in the question before you answer.',
    'tech-first': 'Policy, ownership and approval come before tools.',
    symptom: 'Prefer the option that fixes the root cause.',
    misread: 'Slow down on the last line of each question.',
};
exports.EVE_DEFAULTS = ['priority', 'runner-up', 'role'];
function topSlips(mistakes, n = 3) {
    var _a;
    const counts = new Map();
    for (const m of mistakes)
        for (const p of (0, slipCoach_1.patternsOf)(m))
            counts.set(p, ((_a = counts.get(p)) !== null && _a !== void 0 ? _a : 0) + 1);
    return slipCoach_1.PATTERN_ORDER.filter((p) => { var _a; return p !== 'knowledge' && ((_a = counts.get(p)) !== null && _a !== void 0 ? _a : 0) > 0; })
        .map((p, i) => { var _a; return ({ p, i, n: (_a = counts.get(p)) !== null && _a !== void 0 ? _a : 0 }); })
        .sort((a, b) => b.n - a.n || a.i - b.i)
        .slice(0, n)
        .map((x) => x.p);
}
function eveReminders(mistakes) {
    const top = topSlips(mistakes, 3);
    const own = top.length > 0;
    return { own, lines: (own ? top : exports.EVE_DEFAULTS).map((p) => exports.EVE_REMINDER[p]) };
}
  };
  links["src/engine/examReady.ts"] = {"./streak":"src/engine/streak.ts"};
  defs["src/engine/examReady.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_KEEP_DAYS = exports.READY_DAYS = exports.READY_LOW = void 0;
exports.logReadinessDay = logReadinessDay;
exports.shiftDay = shiftDay;
exports.readyHoldDays = readyHoldDays;
exports.examReadyDue = examReadyDue;
const streak_1 = require("./streak");
exports.READY_LOW = 80;
exports.READY_DAYS = 7;
exports.LOG_KEEP_DAYS = 30;
function lower(a, b) {
    if (a === null || b === null)
        return null;
    return Math.min(a, b);
}
function logReadinessDay(log, day, low) {
    const i = log.findIndex((e) => e.day === day);
    if (i >= 0) {
        const e = log[i];
        const next = { day, min: lower(e.min, low), last: low };
        if (next.min === e.min && next.last === e.last)
            return log;
        const out = [...log];
        out[i] = next;
        return out;
    }
    const out = [...log, { day, min: low, last: low }].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    const newest = out[out.length - 1].day;
    return out.filter((e) => (0, streak_1.daysBetween)(e.day, newest) < exports.LOG_KEEP_DAYS);
}
function shiftDay(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d - n));
    const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(t.getUTCDate()).padStart(2, '0');
    return `${t.getUTCFullYear()}-${mm}-${dd}`;
}
function readyHoldDays(log, today) {
    const sorted = [...log].sort((a, b) => (a.day < b.day ? -1 : 1));
    let held = 0;
    for (let k = 0; k < exports.READY_DAYS; k++) {
        const day = shiftDay(today, k);
        const own = sorted.find((e) => e.day === day);
        let value;
        if (own)
            value = own.min;
        else {
            const before = sorted.filter((e) => e.day < day);
            if (before.length === 0)
                break;
            value = before[before.length - 1].last;
        }
        if (value === null || value < exports.READY_LOW)
            break;
        held += 1;
    }
    return held;
}
function examReadyDue(log, today, seen, examSoon = false) {
    return !seen && !examSoon && readyHoldDays(log !== null && log !== void 0 ? log : [], today) >= exports.READY_DAYS;
}
  };
  links["src/engine/examWeek.ts"] = {"./pace":"src/engine/pace.ts"};
  defs["src/engine/examWeek.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examWeekCount = exports.EXAM_WEEK_SLOTS = exports.EXAM_WEEK_EITHER = exports.weekDaysCount = exports.FINAL_WEEK_WINDOW = exports.CHECKLIST_WINDOW = exports.EXAM_WEEK_TO = exports.EXAM_WEEK_FROM = exports.EXAM_WEEK_ITEMS = void 0;
exports.examWeekText = examWeekText;
exports.cleanDone = cleanDone;
exports.examWeekOf = examWeekOf;
exports.toggleExamWeek = toggleExamWeek;
exports.hideExamWeek = hideExamWeek;
exports.examWeekCardDue = examWeekCardDue;
exports.cleanDays = cleanDays;
exports.weekDaysOf = weekDaysOf;
exports.toggleWeekDay = toggleWeekDay;
exports.examWeekDoneSlots = examWeekDoneSlots;
const pace_1 = require("./pace");
exports.EXAM_WEEK_ITEMS = ['booking', 'guide', 'online', 'centre', 'pace', 'sleep'];
exports.EXAM_WEEK_FROM = 7;
exports.EXAM_WEEK_TO = 2;
function examWeekText(id, exam) {
    switch (id) {
        case 'booking':
            return 'Confirm your exam date, time and place, or your online-exam setup.';
        case 'guide':
            return 'Read the official candidate guide for ID and test-day rules.';
        case 'online':
            return 'Taking it online? Run the system check, and plan a clear desk and a quiet room.';
        case 'centre':
            return 'At a test centre? Plan your route and aim to arrive early.';
        case 'pace':
            return `Know your pace: about ${Math.round((0, pace_1.examPaceSeconds)(exam))} seconds a question. Past ${pace_1.SOFT_CUE_MS / 60000} minutes, flag it and move on.`;
        case 'sleep':
            return 'Plan a normal night’s sleep before the exam.';
    }
}
function cleanDone(ids) {
    const set = new Set(ids);
    return exports.EXAM_WEEK_ITEMS.filter((id) => set.has(id));
}
function examWeekOf(saved, examDate) {
    if (!saved || !examDate || saved.for !== examDate)
        return { done: [], hidden: false };
    return { done: cleanDone(saved.done), hidden: saved.hidden === true };
}
function toggleExamWeek(saved, examDate, id) {
    const cur = examWeekOf(saved, examDate);
    const done = cur.done.includes(id) ? cur.done.filter((x) => x !== id) : cleanDone([...cur.done, id]);
    const days = weekDaysOf(saved, examDate);
    return { for: examDate, done, ...(cur.hidden ? { hidden: true } : {}), ...(days.length ? { days } : {}) };
}
function hideExamWeek(saved, examDate) {
    const days = weekDaysOf(saved, examDate);
    return { for: examDate, done: examWeekOf(saved, examDate).done, hidden: true, ...(days.length ? { days } : {}) };
}
exports.CHECKLIST_WINDOW = { from: exports.EXAM_WEEK_FROM, to: exports.EXAM_WEEK_TO };
exports.FINAL_WEEK_WINDOW = { from: 8, to: 1 };
function examWeekCardDue(daysLeft, saved, examDate, window = exports.CHECKLIST_WINDOW) {
    if (daysLeft === null || !examDate)
        return false;
    if (daysLeft > window.from || daysLeft < window.to)
        return false;
    return !examWeekOf(saved, examDate).hidden;
}
const DAY_ID = /^day-[1-7]$/;
function cleanDays(ids) {
    const set = new Set(ids.filter((x) => typeof x === 'string' && DAY_ID.test(x)));
    return [...set].sort((a, b) => Number(b.slice(4)) - Number(a.slice(4)));
}
function weekDaysOf(saved, examDate) {
    var _a;
    if (!saved || !examDate || saved.for !== examDate)
        return [];
    return cleanDays((_a = saved.days) !== null && _a !== void 0 ? _a : []);
}
function toggleWeekDay(saved, examDate, dayId) {
    const cur = examWeekOf(saved, examDate);
    const was = weekDaysOf(saved, examDate);
    const days = was.includes(dayId) ? was.filter((x) => x !== dayId) : cleanDays([...was, dayId]);
    return { for: examDate, done: cur.done, ...(cur.hidden ? { hidden: true } : {}), ...(days.length ? { days } : {}) };
}
const weekDaysCount = (done, total) => `${done} of ${total} ${total === 1 ? 'day' : 'days'} done`;
exports.weekDaysCount = weekDaysCount;
exports.EXAM_WEEK_EITHER = ['online', 'centre'];
exports.EXAM_WEEK_SLOTS = exports.EXAM_WEEK_ITEMS.length - exports.EXAM_WEEK_EITHER.length + 1;
function examWeekDoneSlots(done) {
    const known = cleanDone(done);
    const either = known.some((id) => exports.EXAM_WEEK_EITHER.includes(id));
    return known.filter((id) => !exports.EXAM_WEEK_EITHER.includes(id)).length + (either ? 1 : 0);
}
const examWeekCount = (done) => `${examWeekDoneSlots(done)} of ${exports.EXAM_WEEK_SLOTS} done`;
exports.examWeekCount = examWeekCount;
  };
  links["src/engine/fit.ts"] = {"./pace":"src/engine/pace.ts"};
  defs["src/engine/fit.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIT_ASK_DAYS = exports.SKIP_ACCURACY = exports.SKIP_MIN_ANSWERS = exports.KEEP_TODAY_LINE = exports.minutesSpoken = exports.minutesLabel = exports.FAMILIARITY_INFO = exports.DEFAULT_MINUTES = exports.DAILY_MINUTES = exports.FAMILIARITIES = void 0;
exports.snapMinutes = snapMinutes;
exports.minutesFromGoal = minutesFromGoal;
exports.goalFromMinutes = goalFromMinutes;
exports.questionsFor = questionsFor;
exports.planTolerance = planTolerance;
exports.examFocusedOf = examFocusedOf;
exports.skippableDomains = skippableDomains;
exports.planLesson = planLesson;
exports.shouldAskFit = shouldAskFit;
const pace_1 = require("./pace");
exports.FAMILIARITIES = ['new', 'some', 'experienced'];
exports.DAILY_MINUTES = [10, 20, 30, 45];
exports.DEFAULT_MINUTES = 20;
const OLD_GOALS = [10, 20, 40];
const nearest = (choices, n) => choices.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), choices[0]);
function snapMinutes(n) {
    return Number.isFinite(n) ? nearest(exports.DAILY_MINUTES, n) : exports.DEFAULT_MINUTES;
}
function minutesFromGoal(goal) {
    return Number.isFinite(goal) ? nearest(exports.DAILY_MINUTES, goal * pace_1.MINUTES_PER_QUESTION) : exports.DEFAULT_MINUTES;
}
function goalFromMinutes(m) {
    return nearest(OLD_GOALS, m / pace_1.MINUTES_PER_QUESTION);
}
function questionsFor(minutes) {
    return Math.max(5, Math.floor(minutes / pace_1.MINUTES_PER_QUESTION + 1e-9));
}
function planTolerance(budget) {
    return Math.max(2, Math.round(0.15 * budget));
}
function examFocusedOf(s) {
    var _a;
    return (_a = s.examFocused) !== null && _a !== void 0 ? _a : s.familiarity === 'experienced';
}
exports.FAMILIARITY_INFO = {
    new: { title: 'New to audit', subtitle: 'I’m new to IT audit, or I’ve just graduated.' },
    some: { title: 'Some IT audit experience', subtitle: 'I work in IT, risk or audit, or I’ve studied some of it.' },
    experienced: { title: 'Experienced practitioner', subtitle: 'Years in audit, risk or security. I want exam practice.' },
};
const minutesLabel = (m) => `${m} min`;
exports.minutesLabel = minutesLabel;
const minutesSpoken = (m) => `${m} minutes a day`;
exports.minutesSpoken = minutesSpoken;
exports.KEEP_TODAY_LINE = 'Today’s plan stays as it is. Tomorrow’s will fit.';
exports.SKIP_MIN_ANSWERS = 5;
exports.SKIP_ACCURACY = 0.8;
function skippableDomains(familiarity, domains) {
    if (familiarity === 'new')
        return new Set();
    return new Set(domains.filter((d) => { var _a; return d.answered >= exports.SKIP_MIN_ANSWERS && ((_a = d.accuracy) !== null && _a !== void 0 ? _a : 0) >= exports.SKIP_ACCURACY; }).map((d) => d.domainId));
}
function planLesson(lessons, done, opts) {
    var _a;
    const open = lessons.filter((l) => { var _a; return !done.includes(l.id) && !((_a = opts.skip) === null || _a === void 0 ? void 0 : _a.has(l.domainId)); });
    if (opts.inOrder)
        return open[0];
    return (_a = open.find((l) => l.domainId === opts.preferDomainId)) !== null && _a !== void 0 ? _a : open[0];
}
exports.FIT_ASK_DAYS = 3;
function shouldAskFit(i) {
    var _a;
    if (!i.onboarded || i.fitPrompt || i.familiarity)
        return false;
    const asked = (_a = i.askedDays) !== null && _a !== void 0 ? _a : [];
    if (asked.length >= exports.FIT_ASK_DAYS && !(i.today && asked.includes(i.today)))
        return false;
    if (i.daysLeft !== null && i.daysLeft <= (i.finalWeek ? 8 : 7))
        return false;
    return !i.examMoment && !i.readyPanel && !i.plantLine;
}
  };
  links["src/engine/games/callItFirst.ts"] = {"../random":"src/engine/random.ts"};
  defs["src/engine/games/callItFirst.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CALL_TIER_LINE = exports.CALL_TIER_NAME = exports.CALL_TIERS = exports.DECOY_SIMILAR = exports.LEAK_LIMIT = exports.THINK_MS = exports.CALL_SIZE = void 0;
exports.contentTokens = contentTokens;
exports.overlapShare = overlapShare;
exports.leaks = leaks;
exports.callPool = callPool;
exports.decoysFor = decoysFor;
exports.buildCallRound = buildCallRound;
exports.callPoints = callPoints;
exports.callMax = callMax;
exports.answerOptions = answerOptions;
const random_1 = require("../random");
exports.CALL_SIZE = 5;
exports.THINK_MS = 10000;
exports.LEAK_LIMIT = 0.6;
exports.DECOY_SIMILAR = 0.5;
exports.CALL_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.CALL_TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.CALL_TIER_LINE = {
    seedling: 'Decoys from other topics.',
    sapling: 'Decoys from nearby ideas.',
    heartwood: 'No cards: think for 10 seconds, then answer.',
};
const STOP = new Set('a an the of to and or in on for by with is are be as at from that this it its their than not no rather which who what when how into over under more most less least can must should may will only own each any all every per via'.split(' '));
function contentTokens(text) {
    return text
        .toLowerCase()
        .replace(/\{\{[A-D]\}\}/g, ' ')
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w && !STOP.has(w))
        .map((w) => w.replace(/ies$/, 'y').replace(/s$/, ''));
}
function overlapShare(a, b) {
    const A = [...new Set(contentTokens(a))];
    if (!A.length)
        return 0;
    const B = new Set(contentTokens(b));
    return A.filter((w) => B.has(w)).length / A.length;
}
function leaks(q) {
    var _a;
    if (!q.keyConcept)
        return true;
    return overlapShare((_a = q.options[q.correct]) !== null && _a !== void 0 ? _a : '', q.keyConcept) > exports.LEAK_LIMIT;
}
function callPool(questions) {
    return questions.filter((q) => q.keyConcept && !leaks(q));
}
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function fair(own, decoy) {
    if (norm(own) === norm(decoy))
        return false;
    return overlapShare(decoy, own) <= exports.DECOY_SIMILAR && overlapShare(own, decoy) <= exports.DECOY_SIMILAR;
}
function decoysFor(q, ctx, tier, rng) {
    var _a, _b;
    const own = (_a = q.keyConcept) !== null && _a !== void 0 ? _a : '';
    const others = ctx.all.filter((o) => o.id !== q.id && o.keyConcept);
    const myTopic = ctx.topicOf(q.id);
    let tiers;
    if (tier === 'seedling') {
        tiers = [
            others.filter((o) => o.domainId !== q.domainId),
            others.filter((o) => o.domainId === q.domainId && ctx.topicOf(o.id) !== myTopic),
        ];
    }
    else {
        const names = ((_b = q.related) !== null && _b !== void 0 ? _b : []).map(norm).filter((n) => n.length > 3);
        const named = others.filter((o) => names.some((n) => norm(o.subtopic).includes(n) || norm(o.keyConcept).includes(n)));
        const sameTopic = (o) => Boolean(myTopic) && ctx.topicOf(o.id) === myTopic;
        const sameDomain = (o) => o.domainId === q.domainId;
        tiers = [
            named.filter(sameTopic),
            named.filter(sameDomain),
            others.filter(sameTopic),
            named,
            others.filter(sameDomain),
            others,
        ];
    }
    const out = [];
    for (const t of tiers) {
        for (const o of (0, random_1.shuffled)(t, rng)) {
            if (out.length >= 2)
                return out;
            const k = o.keyConcept;
            if (fair(own, k) && out.every((d) => fair(d, k)))
                out.push(k);
        }
    }
    return out;
}
function buildCallRound(questions, ctx, tier, rng, size = exports.CALL_SIZE) {
    var _a, _b;
    const pool = (0, random_1.shuffled)(callPool(questions), rng);
    const perDomain = new Map();
    const picked = [];
    for (const q of pool) {
        if (picked.length >= size)
            break;
        if (((_a = perDomain.get(q.domainId)) !== null && _a !== void 0 ? _a : 0) >= 2)
            continue;
        perDomain.set(q.domainId, ((_b = perDomain.get(q.domainId)) !== null && _b !== void 0 ? _b : 0) + 1);
        picked.push(q);
    }
    for (const q of pool) {
        if (picked.length >= size)
            break;
        if (!picked.includes(q))
            picked.push(q);
    }
    return picked.map((q) => {
        if (tier === 'heartwood')
            return { id: q.id, cards: [], correct: -1 };
        const cards = (0, random_1.shuffled)([q.keyConcept, ...decoysFor(q, ctx, tier, rng)], rng);
        return { id: q.id, cards, correct: cards.indexOf(q.keyConcept) };
    });
}
function callPoints(tier, principleRight, answerRight) {
    return (tier !== 'heartwood' && principleRight ? 1 : 0) + (answerRight ? 1 : 0);
}
function callMax(tier, size) {
    return tier === 'heartwood' ? size : size * 2;
}
function answerOptions(usedHint, ms) {
    return { assisted: usedHint, mastery: false, ...(ms !== undefined ? { ms } : {}) };
}
  };
  links["src/engine/games/canopyCall.ts"] = {"../random":"src/engine/random.ts"};
  defs["src/engine/games/canopyCall.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRightRole = exports.ROLE_LAYER = exports.CANOPY_TIER_LINE = exports.CANOPY_TIER_NAME = exports.CANOPY_TIERS = exports.CANOPY_MIN_POOL = exports.CANOPY_SIZE = void 0;
exports.canopyCardId = canopyCardId;
exports.allowedRoles = allowedRoles;
exports.chipsFor = chipsFor;
exports.canopyPool = canopyPool;
exports.buildCanopyRound = buildCanopyRound;
exports.canopyScore = canopyScore;
exports.confusionPairs = confusionPairs;
const random_1 = require("../random");
exports.CANOPY_SIZE = 10;
exports.CANOPY_MIN_POOL = exports.CANOPY_SIZE * 2;
exports.CANOPY_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.CANOPY_TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.CANOPY_TIER_LINE = {
    seedling: 'Governance or management? Four roles to choose from.',
    sapling: 'Owner, custodian or auditor? Near neighbours.',
    heartwood: 'Who acts FIRST? Five roles to choose from.',
};
exports.ROLE_LAYER = {
    board: 'governance',
    audit_committee: 'governance',
    steering_committee: 'governance',
    senior_management: 'management',
    risk_owner: 'management',
    data_owner: 'management',
    change_authority: 'management',
    custodian: 'operations',
    information_security: 'operations',
    is_auditor: 'assurance',
};
const layerOf = (role) => { var _a; return (_a = exports.ROLE_LAYER[role]) !== null && _a !== void 0 ? _a : 'management'; };
function canopyCardId(card) {
    return `role:${card.subtopicId}:${card.id}`;
}
function allowedRoles(card, deck) {
    return deck.roles.map((r) => r.id).filter((id) => id === card.role || !card.excludeChips.includes(id));
}
function chipsFor(card, deck, tier, rng) {
    const n = tier === 'heartwood' ? 5 : 4;
    const pool = (0, random_1.shuffled)(allowedRoles(card, deck).filter((id) => id !== card.role), rng);
    const out = [card.role];
    const add = (id) => {
        if (id && out.length < n && !out.includes(id))
            out.push(id);
    };
    if (tier === 'seedling') {
        for (const layer of (0, random_1.shuffled)(['governance', 'management', 'operations', 'assurance'], rng)) {
            if (layer !== layerOf(card.role))
                add(pool.find((id) => layerOf(id) === layer));
        }
    }
    else {
        if (card.role !== 'is_auditor')
            add(pool.find((id) => id === 'is_auditor'));
        for (const id of pool.filter((x) => layerOf(x) === layerOf(card.role)))
            add(id);
    }
    for (const id of pool)
        add(id);
    return (0, random_1.shuffled)(out, rng);
}
function canopyPool(deck, tier, size = exports.CANOPY_SIZE) {
    const own = deck.cards.filter((c) => c.tier === tier);
    if (own.length >= size)
        return own;
    const order = tier === 'heartwood' ? ['sapling', 'seedling'] : tier === 'sapling' ? ['seedling', 'heartwood'] : ['sapling', 'heartwood'];
    return [...own, ...order.flatMap((t) => deck.cards.filter((c) => c.tier === t))];
}
const domainOf = (card) => card.subtopicId.charAt(0);
function buildCanopyRound(deck, cards, tier, rng, now, size = exports.CANOPY_SIZE) {
    var _a, _b;
    const pool = canopyPool(deck, tier, size);
    const due = (0, random_1.shuffled)(pool.filter((c) => { var _a, _b; return ((_b = (_a = cards === null || cards === void 0 ? void 0 : cards[canopyCardId(c)]) === null || _a === void 0 ? void 0 : _a.dueAt) !== null && _b !== void 0 ? _b : Infinity) <= now; }), rng);
    const order = [...due, ...(0, random_1.shuffled)(pool.filter((c) => !due.includes(c)), rng)];
    const picked = [];
    const perDomain = new Map();
    for (const c of order) {
        if (picked.length >= size)
            break;
        if (((_a = perDomain.get(domainOf(c))) !== null && _a !== void 0 ? _a : 0) >= 3)
            continue;
        perDomain.set(domainOf(c), ((_b = perDomain.get(domainOf(c))) !== null && _b !== void 0 ? _b : 0) + 1);
        picked.push(c);
    }
    for (const c of order) {
        if (picked.length >= size)
            break;
        if (!picked.includes(c))
            picked.push(c);
    }
    return (0, random_1.shuffled)(picked, rng).map((card) => ({ card, chips: chipsFor(card, deck, tier, rng) }));
}
const isRightRole = (a) => a.picked === a.card.role;
exports.isRightRole = isRightRole;
function canopyScore(answers) {
    return answers.filter(exports.isRightRole).length;
}
function confusionPairs(answers, deck, max = 3) {
    var _a;
    const short = (id) => { var _a, _b; return (_b = (_a = deck.roles.find((r) => r.id === id)) === null || _a === void 0 ? void 0 : _a.short) !== null && _b !== void 0 ? _b : id; };
    const counts = new Map();
    for (const a of answers) {
        if ((0, exports.isRightRole)(a))
            continue;
        const k = `${a.card.role}>${a.picked}`;
        const cur = (_a = counts.get(k)) !== null && _a !== void 0 ? _a : { role: a.card.role, picked: a.picked, count: 0, line: '' };
        cur.count += 1;
        counts.set(k, cur);
    }
    return [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, max)
        .map((p) => ({
        ...p,
        line: `You gave ${p.count === 1 ? 'one' : p.count} ${short(p.role)} ${p.count === 1 ? 'decision' : 'decisions'} to ${short(p.picked)}.`,
    }));
}
  };
  links["src/engine/games/daylight.ts"] = {"../answerClock":"src/engine/answerClock.ts","../pace":"src/engine/pace.ts","../random":"src/engine/random.ts"};
  defs["src/engine/games/daylight.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAYLIGHT_LINE = exports.PACE_RIGHT = exports.SUGGEST_RECENT = exports.SUGGEST_MIN_ANSWERS = exports.MAX_EXTENDS = exports.EXTEND_MS = exports.DAYLIGHT_MINUTES = exports.TIER_FACTOR = exports.TIER_NAME = exports.DAYLIGHT_TIERS = exports.DAYLIGHT_SIZE = void 0;
exports.tierSeconds = tierSeconds;
exports.tierCanExtend = tierCanExtend;
exports.daylightPool = daylightPool;
exports.buildDaylightRound = buildDaylightRound;
exports.suggestTier = suggestTier;
exports.newDaylightRound = newDaylightRound;
exports.currentItem = currentItem;
exports.canFlag = canFlag;
exports.flagCurrent = flagCurrent;
exports.answerCurrent = answerCurrent;
exports.setLight = setLight;
exports.canExtend = canExtend;
exports.extendBudget = extendBudget;
exports.budgetGone = budgetGone;
exports.finishedInBudget = finishedInBudget;
exports.daylightScore = daylightScore;
exports.daylightHits = daylightHits;
exports.atSurePace = atSurePace;
exports.daylightMax = daylightMax;
exports.daylightPace = daylightPace;
exports.daylightLine = daylightLine;
exports.lowLight = lowLight;
exports.lowLightLine = lowLightLine;
exports.paceMarksDue = paceMarksDue;
exports.averageSeconds = averageSeconds;
exports.slowestItem = slowestItem;
const answerClock_1 = require("../answerClock");
const pace_1 = require("../pace");
const random_1 = require("../random");
exports.DAYLIGHT_SIZE = 5;
exports.DAYLIGHT_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.TIER_FACTOR = { seedling: 1.25, sapling: 1, heartwood: 5 / 6 };
function tierSeconds(tier, exam) {
    return Math.round((0, pace_1.examPaceSeconds)(exam) * exports.TIER_FACTOR[tier]);
}
exports.DAYLIGHT_MINUTES = Math.round((exports.DAYLIGHT_SIZE * (0, pace_1.examPaceSeconds)({ questions: 150, minutes: 240 })) / 60);
exports.EXTEND_MS = 60000;
exports.MAX_EXTENDS = 10;
function tierCanExtend(tier) {
    return tier === 'seedling';
}
function daylightPool(pool) {
    return pool;
}
function buildDaylightRound(pool, rng, size = exports.DAYLIGHT_SIZE) {
    return (0, random_1.shuffled)(daylightPool(pool), rng)
        .slice(0, size)
        .map((q) => q.id);
}
exports.SUGGEST_MIN_ANSWERS = 10;
exports.SUGGEST_RECENT = 30;
function suggestTier(answers, exam) {
    const timed = answers
        .filter((a) => typeof a.ms === 'number')
        .sort((a, b) => b.lastAt - a.lastAt)
        .slice(0, exports.SUGGEST_RECENT)
        .map((a) => a.ms);
    if (timed.length < exports.SUGGEST_MIN_ANSWERS)
        return 'seedling';
    const med = (0, pace_1.median)(timed) / 1000;
    if (med <= tierSeconds('heartwood', exam))
        return 'heartwood';
    if (med <= tierSeconds('sapling', exam))
        return 'sapling';
    return 'seedling';
}
function newDaylightRound(ids, tier, perItemSec) {
    return {
        ids: [...ids],
        tier,
        extends: 0,
        budgetMs: ids.length * perItemSec * 1000,
        perItemSec,
        queue: [...ids],
        flagged: [],
        answers: {},
        spentMs: {},
        over: ids.length === 0,
        timedOut: [],
    };
}
function currentItem(r) {
    var _a;
    return r.over ? null : ((_a = r.queue[0]) !== null && _a !== void 0 ? _a : null);
}
function canFlag(r) {
    return !r.over && r.queue.length > 1;
}
function flagCurrent(r, visitMs) {
    const id = currentItem(r);
    if (!id || !canFlag(r))
        return r;
    return {
        ...r,
        queue: [...r.queue.slice(1), id],
        flagged: r.flagged.includes(id) ? r.flagged : [...r.flagged, id],
        spentMs: { ...r.spentMs, [id]: (0, answerClock_1.addMs)(r.spentMs[id], visitMs) },
    };
}
function answerCurrent(r, correct, visitMs) {
    const id = currentItem(r);
    if (!id)
        return r;
    const spentMs = { ...r.spentMs };
    const ms = (0, answerClock_1.addMs)(spentMs[id], visitMs);
    delete spentMs[id];
    const queue = r.queue.slice(1);
    return { ...r, queue, spentMs, answers: { ...r.answers, [id]: { correct, ms } }, over: queue.length === 0 };
}
function setLight(r) {
    if (r.over)
        return r;
    return { ...r, over: true, timedOut: [...r.queue], queue: [] };
}
function canExtend(r) {
    return !r.over && tierCanExtend(r.tier) && r.extends < exports.MAX_EXTENDS;
}
function extendBudget(r, ms = exports.EXTEND_MS) {
    if (!canExtend(r))
        return r;
    return { ...r, budgetMs: r.budgetMs + ms, extends: r.extends + 1 };
}
function budgetGone(r, usedMs) {
    return usedMs >= Math.min(r.budgetMs, answerClock_1.MAX_ANSWER_MS);
}
function finishedInBudget(r) {
    return r.over && r.timedOut.length === 0 && Object.keys(r.answers).length === r.ids.length;
}
function daylightScore(r) {
    const right = Object.values(r.answers).filter((a) => a.correct).length;
    return right + (finishedInBudget(r) ? 1 : 0);
}
exports.PACE_RIGHT = 4;
function daylightHits(r) {
    return r.ids.map((id) => { var _a; return ((_a = r.answers[id]) === null || _a === void 0 ? void 0 : _a.correct) === true; });
}
function atSurePace(r) {
    const need = Math.ceil((exports.PACE_RIGHT / exports.DAYLIGHT_SIZE) * r.ids.length);
    return r.tier !== 'seedling' && finishedInBudget(r) && daylightHits(r).filter(Boolean).length >= need;
}
function daylightMax(size) {
    return size + 1;
}
function daylightPace(r, usedMs) {
    const per = r.perItemSec * 1000;
    const done = Object.keys(r.answers).length;
    if (usedMs > (done + 1) * per * (1 + pace_1.PACE_TOLERANCE))
        return 'behind';
    if (done > 0 && usedMs < done * per * (1 - pace_1.PACE_TOLERANCE))
        return 'ahead';
    return 'onPace';
}
exports.DAYLIGHT_LINE = {
    onPace: 'On pace',
    behind: 'Behind pace. Flag & move on if one is stuck.',
    ahead: 'Ahead of pace.',
};
function daylightLine(status, flaggable) {
    return status === 'behind' && !flaggable ? 'Behind pace.' : exports.DAYLIGHT_LINE[status];
}
function lowLight(r, usedMs) {
    return !r.over && usedMs >= r.budgetMs * 0.9;
}
function lowLightLine(r) {
    return `About a minute of light left.${canExtend(r) ? ' You can add a minute.' : ''}`;
}
function paceMarksDue(r, usedMs, said) {
    const due = [];
    if (usedMs >= r.budgetMs * 0.5 && !said.includes('half'))
        due.push('half');
    if (usedMs >= r.budgetMs * 0.9 && !said.includes('tenthLeft'))
        due.push('tenthLeft');
    return due;
}
function averageSeconds(r) {
    const ms = Object.values(r.answers).map((a) => a.ms);
    if (!ms.length)
        return null;
    return Math.round(ms.reduce((a, b) => a + b, 0) / ms.length / 1000);
}
function slowestItem(r) {
    let best = null;
    for (const id of r.ids) {
        const a = r.answers[id];
        if (!a)
            continue;
        const seconds = Math.round(a.ms / 1000);
        if (!best || seconds > best.seconds)
            best = { id, seconds };
    }
    return best;
}
  };
  links["src/engine/games/fieldGuide.ts"] = {"../random":"src/engine/random.ts","./rootOrRumor":"src/engine/games/rootOrRumor.ts"};
  defs["src/engine/games/fieldGuide.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_TIER_LINE = exports.FIELD_TIER_NAME = exports.FIELD_TIERS = exports.FIELD_MIN_POOL = exports.FIELD_SIZE = exports.RECALL_CHOICES = exports.BOARD_SIZE = exports.FIELD_BOARDS = void 0;
exports.headWord = headWord;
exports.acronymOf = acronymOf;
exports.leaks = leaks;
exports.termsFromNotes = termsFromNotes;
exports.fieldTerms = fieldTerms;
exports.recallChoices = recallChoices;
exports.buildFieldRound = buildFieldRound;
exports.fieldScore = fieldScore;
exports.itemSpoken = itemSpoken;
const random_1 = require("../random");
const rootOrRumor_1 = require("./rootOrRumor");
exports.FIELD_BOARDS = 3;
exports.BOARD_SIZE = 4;
exports.RECALL_CHOICES = 6;
exports.FIELD_SIZE = exports.FIELD_BOARDS * exports.BOARD_SIZE;
exports.FIELD_MIN_POOL = exports.FIELD_SIZE * 2;
exports.FIELD_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.FIELD_TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.FIELD_TIER_LINE = {
    seedling: 'Four terms from four different topics.',
    sapling: 'Four terms from the same topic: near neighbours.',
    heartwood: 'Recall: one meaning at a time, pick its term from six.',
};
const bare = (term) => term.replace(/\s*\([^)]*\)/g, '').trim();
function headWord(term) {
    var _a;
    const words = bare(term)
        .split(/[\s/–—-]+/)
        .map((w) => w.replace(/[^A-Za-z]/g, ''))
        .filter((w) => w.length > 0);
    return ((_a = words[words.length - 1]) !== null && _a !== void 0 ? _a : '').toLowerCase();
}
function acronymOf(term) {
    const m = /\(([A-Z][A-Za-z0-9&-]{1,9})\)/.exec(term);
    return m ? m[1] : null;
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function leaks(term, definition) {
    const head = headWord(term);
    if (head.length >= 3) {
        const stem = head.length > 4 && head.endsWith('s') ? head.slice(0, -1) : head;
        if (new RegExp(`\\b${escape(stem)}[a-z]{0,4}\\b`, 'i').test(definition))
            return true;
    }
    const acr = acronymOf(term);
    return Boolean(acr && new RegExp(`\\b${escape(acr)}s?\\b`).test(definition));
}
function termsFromNotes(pack) {
    var _a;
    const out = [];
    const seenTerm = new Set();
    const seenDef = new Set();
    const add = (t, base, owner) => {
        const term = t.term.trim().replace(/\s+/g, ' ');
        const definition = t.definition.trim().replace(/\s+/g, ' ');
        if (!term || !definition || leaks(term, definition))
            return;
        const key = term.toLowerCase();
        const same = bare(term).toLowerCase();
        if (seenTerm.has(same) || seenDef.has(definition.toLowerCase()))
            return;
        seenTerm.add(same);
        seenDef.add(definition.toLowerCase());
        out.push({ id: `kt:${owner}:${(0, rootOrRumor_1.textHash)(key)}`, term, definition, ...base });
    };
    for (const d of (_a = pack === null || pack === void 0 ? void 0 : pack.domains) !== null && _a !== void 0 ? _a : []) {
        for (const t of d.topics) {
            for (const s of t.subtopics) {
                for (const k of s.keyTerms)
                    add(k, { topicId: t.id, topicName: t.name, domainId: d.id, subtopicId: s.id, subtopicName: s.name }, s.id);
            }
        }
        for (const k of d.keyTerms)
            add(k, { topicId: `D${d.id}`, topicName: `Domain ${d.id} key terms`, domainId: d.id }, `D${d.id}`);
    }
    return out;
}
const cache = new WeakMap();
function fieldTerms(pack) {
    if (!pack)
        return [];
    let hit = cache.get(pack);
    if (!hit) {
        hit = termsFromNotes(pack);
        cache.set(pack, hit);
    }
    return hit;
}
const groupBy = (xs, key) => {
    const m = new Map();
    for (const x of xs) {
        const l = m.get(key(x));
        if (l)
            l.push(x);
        else
            m.set(key(x), [x]);
    }
    return m;
};
function recallChoices(term, board, all, rng, n = exports.RECALL_CHOICES) {
    const out = [term, ...board.filter((t) => t.id !== term.id)];
    const near = [
        ...(0, random_1.shuffled)(all.filter((t) => t.topicId === term.topicId), rng),
        ...(0, random_1.shuffled)(all.filter((t) => t.topicId !== term.topicId && t.domainId === term.domainId), rng),
        ...(0, random_1.shuffled)(all, rng),
    ];
    for (const t of near) {
        if (out.length >= n)
            break;
        if (!out.some((o) => o.id === t.id))
            out.push(t);
    }
    return (0, random_1.shuffled)(out.slice(0, n), rng);
}
function buildFieldRound(all, cards, tier, rng, now, boards = exports.FIELD_BOARDS) {
    const due = (0, random_1.shuffled)(all.filter((t) => (cards === null || cards === void 0 ? void 0 : cards[t.id]) && cards[t.id].dueAt <= now), rng);
    const used = new Set();
    const out = [];
    if (tier === 'seedling') {
        const pool = [...due, ...(0, random_1.shuffled)(all, rng)];
        for (let b = 0; b < boards; b++) {
            const board = [];
            for (const t of pool) {
                if (board.length >= exports.BOARD_SIZE)
                    break;
                if (used.has(t.id) || board.some((x) => x.topicId === t.topicId))
                    continue;
                board.push(t);
                used.add(t.id);
            }
            if (board.length === exports.BOARD_SIZE)
                out.push(board);
        }
    }
    else {
        const byTopic = groupBy(all, (t) => t.topicId);
        const big = [...byTopic.keys()].filter((k) => byTopic.get(k).length >= exports.BOARD_SIZE);
        const dueTopics = [...new Set(due.map((t) => t.topicId))].filter((k) => big.includes(k));
        const rest = (0, random_1.shuffled)(big.filter((k) => !dueTopics.includes(k)), rng);
        const domains = new Set();
        const picked = new Set();
        const take = (topic) => {
            const list = byTopic.get(topic);
            const dueHere = list.filter((t) => due.some((d) => d.id === t.id));
            const board = [...dueHere, ...(0, random_1.shuffled)(list.filter((t) => !dueHere.includes(t)), rng)].slice(0, exports.BOARD_SIZE);
            picked.add(topic);
            domains.add(list[0].domainId);
            out.push(board);
        };
        for (const t of dueTopics)
            if (out.length < boards)
                take(t);
        for (const t of rest)
            if (out.length < boards && !domains.has(byTopic.get(t)[0].domainId))
                take(t);
        for (const t of rest)
            if (out.length < boards && !picked.has(t))
                take(t);
    }
    return out.map((terms) => {
        const mixed = (0, random_1.shuffled)(terms, rng);
        return {
            terms: mixed,
            defOrder: (0, random_1.shuffled)(mixed.map((_, k) => k), rng),
            ...(tier === 'heartwood' ? { choices: mixed.map((t) => recallChoices(t, mixed, all, rng)) } : {}),
        };
    });
}
function fieldScore(firstTries) {
    return firstTries.filter(Boolean).length;
}
function itemSpoken(kind, k, n, text, state) {
    return `${kind} ${k + 1} of ${n}: ${text}${state.matched ? ', matched' : ''}`;
}
  };
  links["src/engine/games/growth.ts"] = {};
  defs["src/engine/games/growth.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITS_CAP = exports.ROUNDS_IN_A_ROW = exports.STEP_BACK_BELOW = exports.PROMOTE_AT = exports.GAME_TIER_NAME = exports.GAME_TIERS = void 0;
exports.growthTier = growthTier;
exports.noteRound = noteRound;
exports.tierChangeLine = tierChangeLine;
exports.share = share;
exports.GAME_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.GAME_TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.PROMOTE_AT = 0.8;
exports.STEP_BACK_BELOW = 0.5;
exports.ROUNDS_IN_A_ROW = 2;
exports.HITS_CAP = 30;
function growthTier(g) {
    var _a;
    return (_a = g === null || g === void 0 ? void 0 : g.tier) !== null && _a !== void 0 ? _a : 'seedling';
}
const step = (t, by) => exports.GAME_TIERS[Math.min(exports.GAME_TIERS.length - 1, Math.max(0, exports.GAME_TIERS.indexOf(t) + by))];
function noteRound(prev, r) {
    var _a, _b, _c;
    const g = prev !== null && prev !== void 0 ? prev : { tier: 'seedling', up: 0, down: 0 };
    const rate = Number.isFinite(r.rate) ? Math.min(1, Math.max(0, r.rate)) : 0;
    const hits = ((_a = r.hits) === null || _a === void 0 ? void 0 : _a.length) ? [...((_b = g.hits) !== null && _b !== void 0 ? _b : []), ...r.hits].slice(-exports.HITS_CAP) : g.hits;
    const run = r.good === undefined ? g.run : r.good ? ((_c = g.run) !== null && _c !== void 0 ? _c : 0) + 1 : 0;
    const extra = { ...(hits ? { hits } : {}), ...(run !== undefined ? { run } : {}) };
    if (r.tier !== g.tier)
        return { growth: { tier: g.tier, up: g.up, down: g.down, ...extra }, change: null };
    const up = rate >= exports.PROMOTE_AT ? g.up + 1 : 0;
    const down = rate < exports.STEP_BACK_BELOW ? g.down + 1 : 0;
    if (up >= exports.ROUNDS_IN_A_ROW && g.tier !== 'heartwood') {
        return { growth: { tier: step(g.tier, 1), up: 0, down: 0, ...extra }, change: 'up' };
    }
    if (down >= exports.ROUNDS_IN_A_ROW && g.tier !== 'seedling') {
        return { growth: { tier: step(g.tier, -1), up: 0, down: 0, ...extra }, change: 'down' };
    }
    return { growth: { tier: g.tier, up: Math.min(up, exports.ROUNDS_IN_A_ROW), down: Math.min(down, exports.ROUNDS_IN_A_ROW), ...extra }, change: null };
}
function tierChangeLine(change, tier) {
    if (change === 'up')
        return `You’ve grown to ${exports.GAME_TIER_NAME[tier]}. Your next round starts there.`;
    if (change === 'down')
        return `Back to ${exports.GAME_TIER_NAME[tier]}. Two strong rounds grow it again.`;
    return null;
}
function share(hits) {
    return hits.length ? hits.filter(Boolean).length / hits.length : 0;
}
  };
  links["src/engine/games/priorityLens.ts"] = {"../random":"src/engine/random.ts"};
  defs["src/engine/games/priorityLens.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_MEANING = exports.ASK_MEANING = exports.ASKS = exports.ASK_LABEL = exports.ASK_FOR = exports.PRIORITY_WORDS = void 0;
exports.priorityWord = priorityWord;
exports.lastWholeWordIndex = lastWholeWordIndex;
exports.priorityPool = priorityPool;
exports.buildPriorityRound = buildPriorityRound;
exports.acceptedAsks = acceptedAsks;
exports.fitWord = fitWord;
exports.meaningFor = meaningFor;
exports.askChoices = askChoices;
const random_1 = require("../random");
exports.PRIORITY_WORDS = ['FIRST', 'BEST', 'MOST', 'PRIMARY', 'GREATEST'];
function priorityWord(stem) {
    let found = null;
    for (const m of stem.matchAll(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST)\b/g)) {
        found = m[1];
    }
    return found;
}
function lastWholeWordIndex(text, word) {
    if (!word)
        return -1;
    const isWordChar = (ch) => ch !== undefined && /[A-Za-z0-9_]/.test(ch);
    let at = text.lastIndexOf(word);
    while (at >= 0) {
        if (!isWordChar(text[at - 1]) && !isWordChar(text[at + word.length]))
            return at;
        at = at === 0 ? -1 : text.lastIndexOf(word, at - 1);
    }
    return -1;
}
function priorityPool(pool) {
    return pool.filter((q) => priorityWord(q.stem) !== null);
}
function buildPriorityRound(pool, rng, size = 5) {
    return (0, random_1.shuffled)(priorityPool(pool), rng)
        .slice(0, size)
        .map((q) => q.id);
}
exports.ASK_FOR = {
    FIRST: 'sequence',
    BEST: 'best-fit',
    MOST: 'degree',
    GREATEST: 'degree',
    PRIMARY: 'purpose',
};
exports.ASK_LABEL = {
    sequence: 'The step that must come before the others',
    'best-fit': 'The option that fully handles it, at the right level',
    degree: 'The strongest effect or the largest impact',
    purpose: 'The main purpose or the main reason',
};
exports.ASKS = ['sequence', 'best-fit', 'degree', 'purpose'];
function acceptedAsks(stem) {
    const word = priorityWord(stem);
    if (!word)
        return [];
    return fitWord(stem) ? ['best-fit', 'degree'] : [exports.ASK_FOR[word]];
}
function fitWord(stem) {
    if (priorityWord(stem) !== 'MOST')
        return null;
    const m = /^\s+(appropriate|appropriately|suitable)\b/i.exec(stem.slice(lastWholeWordIndex(stem, 'MOST') + 4));
    return m ? m[1].toLowerCase() : null;
}
exports.ASK_MEANING = {
    sequence: 'Sequence matters: pick the step that must happen before all the others.',
    'best-fit': 'Several options work: pick the one that fully addresses the risk at the right level.',
    degree: 'Compare degree: pick the option with the strongest effect on what is asked.',
    purpose: 'Pick the main purpose or main reason, not a side benefit.',
};
function meaningFor(stem) {
    const word = priorityWord(stem);
    if (!word)
        return '';
    const fit = fitWord(stem);
    return fit ? `MOST ${fit} works like BEST. ${exports.ASK_MEANING['best-fit']}` : exports.PRIORITY_MEANING[word];
}
function askChoices(rng) {
    return (0, random_1.shuffled)(exports.ASKS, rng);
}
exports.PRIORITY_MEANING = {
    FIRST: 'Sequence matters: pick the step that must happen before all the others.',
    BEST: 'Several options work: pick the one that fully addresses the risk at the right level.',
    MOST: 'Compare degree: pick the option with the strongest effect on what is asked.',
    PRIMARY: 'Pick the main purpose or main reason, not a side benefit.',
    GREATEST: 'Pick the option with the largest impact or exposure.',
};
  };
  links["src/engine/games/registry.ts"] = {"../pace":"src/engine/pace.ts","./callItFirst":"src/engine/games/callItFirst.ts","./canopyCall":"src/engine/games/canopyCall.ts","./steppingStones":"src/engine/games/steppingStones.ts","./daylight":"src/engine/games/daylight.ts","./fieldGuide":"src/engine/games/fieldGuide.ts","./rootOrRumor":"src/engine/games/rootOrRumor.ts","./priorityLens":"src/engine/games/priorityLens.ts","./trapSpotter":"src/engine/games/trapSpotter.ts"};
  defs["src/engine/games/registry.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_ORDER = exports.GAMES = void 0;
exports.roundMinutes = roundMinutes;
exports.gameInfo = gameInfo;
exports.gameMinutes = gameMinutes;
exports.gameTitle = gameTitle;
exports.isPlayable = isPlayable;
const pace_1 = require("../pace");
const callItFirst_1 = require("./callItFirst");
const canopyCall_1 = require("./canopyCall");
const steppingStones_1 = require("./steppingStones");
const daylight_1 = require("./daylight");
const fieldGuide_1 = require("./fieldGuide");
const rootOrRumor_1 = require("./rootOrRumor");
const priorityLens_1 = require("./priorityLens");
const trapSpotter_1 = require("./trapSpotter");
function roundMinutes(size) {
    return Math.max(1, Math.round(size * pace_1.MINUTES_PER_QUESTION));
}
const make = (g) => {
    var _a, _b;
    return ({
        ...g,
        minutes: (_a = g.minutes) !== null && _a !== void 0 ? _a : roundMinutes(g.size),
        minPool: (_b = g.minPool) !== null && _b !== void 0 ? _b : g.size * 2,
    });
};
exports.GAMES = {
    trap: make({
        id: 'trap',
        name: 'Snare Spotter',
        tagline: 'Find the answer built to fool you, then the best one.',
        plain: 'Spot the trick answer',
        skill: 'Beating distractors',
        size: 5,
        pool: trapSpotter_1.trapPool,
    }),
    sprint: make({
        id: 'sprint',
        name: 'Forecast',
        tagline: 'How sure are you, really? Honest confidence scores best.',
        plain: 'Say how sure you are',
        skill: 'Knowing what you know',
        size: 8,
        pool: (qs) => qs,
    }),
    priority: make({
        id: 'priority',
        name: 'Signpost',
        tagline: 'Read the word that decides which true answer wins.',
        plain: 'Find the word that decides',
        skill: 'Reading like the examiner',
        size: 5,
        pool: priorityLens_1.priorityPool,
    }),
    daylight: make({
        id: 'daylight',
        name: 'Daylight',
        tagline: 'Answer at exam pace.',
        plain: 'Answer at exam pace',
        skill: 'Pacing',
        size: daylight_1.DAYLIGHT_SIZE,
        minutes: daylight_1.DAYLIGHT_MINUTES,
        pool: daylight_1.daylightPool,
    }),
    rumor: make({
        id: 'rumor',
        name: 'Root or Rumor',
        tagline: 'Tell a sound principle from an exam myth.',
        plain: 'Sound principle or exam myth',
        skill: 'Rejecting exam myths',
        size: rootOrRumor_1.RUMOR_SIZE,
        minutes: 4,
        minPool: rootOrRumor_1.RUMOR_MIN_POOL,
        pool: () => [],
        notesPool: (notes) => (0, rootOrRumor_1.rumorStatements)(notes).length,
    }),
    callit: make({
        id: 'callit',
        name: 'Call It First',
        tagline: 'Name the principle before you see the options.',
        plain: 'Answer before you see the options',
        skill: 'Answering before the options',
        size: callItFirst_1.CALL_SIZE,
        pool: callItFirst_1.callPool,
    }),
    field: make({
        id: 'field',
        name: 'Field Guide',
        tagline: 'Match each term to what it means.',
        plain: 'Match terms to meanings',
        skill: 'Exact meanings',
        size: fieldGuide_1.FIELD_SIZE,
        minutes: 3,
        minPool: fieldGuide_1.FIELD_MIN_POOL,
        pool: () => [],
        notesPool: (notes) => (0, fieldGuide_1.fieldTerms)(notes).length,
    }),
    canopy: make({
        id: 'canopy',
        name: 'Canopy Call',
        tagline: 'Choose who has the authority to decide.',
        plain: 'Who has the authority to decide',
        skill: 'The right level of authority',
        size: canopyCall_1.CANOPY_SIZE,
        minutes: 3,
        minPool: canopyCall_1.CANOPY_MIN_POOL,
        pool: () => [],
        contentPool: (c) => { var _a, _b; return (_b = (_a = c.roles) === null || _a === void 0 ? void 0 : _a.cards.length) !== null && _b !== void 0 ? _b : 0; },
    }),
    stones: make({
        id: 'stones',
        name: 'Stepping Stones',
        tagline: 'Put each process in the right order.',
        plain: 'Put the steps in order',
        skill: 'What comes first',
        size: steppingStones_1.STONES_PER_ROUND,
        minutes: 3,
        minPool: steppingStones_1.STONES_MIN_POOL,
        pool: () => [],
        contentPool: (c) => { var _a, _b; return (_b = (_a = c.steps) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0; },
    }),
};
exports.GAME_ORDER = ['trap', 'sprint', 'priority', 'daylight', 'rumor', 'callit', 'field', 'canopy', 'stones'];
function gameInfo(id) {
    return exports.GAMES[id];
}
function gameMinutes(id) {
    var _a, _b;
    return (_b = (_a = gameInfo(id)) === null || _a === void 0 ? void 0 : _a.minutes) !== null && _b !== void 0 ? _b : Math.min(...exports.GAME_ORDER.map((g) => exports.GAMES[g].minutes));
}
function gameTitle(id, savedLabel) {
    var _a, _b;
    return (_b = (_a = gameInfo(id)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : savedLabel.split(' · ')[0];
}
function isPlayable(id, questions, notes, content) {
    const g = exports.GAMES[id];
    const size = g.contentPool ? g.contentPool(content !== null && content !== void 0 ? content : {}) : g.notesPool ? g.notesPool(notes) : g.pool(questions).length;
    return size >= g.minPool;
}
  };
  links["src/engine/games/rootOrRumor.ts"] = {"../random":"src/engine/random.ts"};
  defs["src/engine/games/rootOrRumor.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.READ_AGAIN_AT = exports.DENY_CARDS = exports.IMPERATIVE_VERBS = exports.RUMOR_TIER_LINE = exports.RUMOR_TIER_NAME = exports.RUMOR_TIERS = exports.MAX_WORDS = exports.MIN_WORDS = exports.RUMOR_MIN_POOL = exports.RUMOR_SIZE = void 0;
exports.wordCount = wordCount;
exports.firstSentence = firstSentence;
exports.leansBack = leansBack;
exports.startsImperative = startsImperative;
exports.colonLabel = colonLabel;
exports.unnamedSubject = unnamedSubject;
exports.cleanStatement = cleanStatement;
exports.textHash = textHash;
exports.statementsFromNotes = statementsFromNotes;
exports.rumorStatements = rumorStatements;
exports.buildRumorRound = buildRumorRound;
exports.isRightTap = isRightTap;
exports.rumorScore = rumorScore;
exports.longestRun = longestRun;
exports.whyChoices = whyChoices;
exports.tapTitle = tapTitle;
exports.tapVerdict = tapVerdict;
exports.readAgain = readAgain;
const random_1 = require("../random");
exports.RUMOR_SIZE = 12;
exports.RUMOR_MIN_POOL = exports.RUMOR_SIZE * 2;
exports.MIN_WORDS = 8;
exports.MAX_WORDS = 30;
exports.RUMOR_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.RUMOR_TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.RUMOR_TIER_LINE = {
    seedling: 'One domain per round.',
    sapling: 'All domains, mixed.',
    heartwood: 'All domains, plus “Why?” on each myth.',
};
function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}
function firstSentence(text) {
    const t = text.trim().replace(/\s+/g, ' ');
    const m = /^(.+?[.!?])(?=\s+[A-Z"“(]|$)/.exec(t);
    return m ? m[1] : t;
}
const LEANS_ON = /^(It|Its|This|These|That|Those|They|Their|Such|And|But|Or|So|Because|Also|Here|Then)\b/;
function leansBack(text) {
    if (/\balso\b/i.test(text))
        return true;
    if (/\btoo[.,;]/i.test(text))
        return true;
    if (/\b\d[AB]\d+(\.\d+)?\b/.test(text))
        return true;
    if (/^\W*[A-Za-z]+(\s+\([^)]*\))?\s+it\b/.test(text))
        return true;
    if (/\b(this|these|those)\b(?!\s+(who|whose|that|which)\b)/i.test(text))
        return true;
    if (/\b(to|of|for|in|on|at|with|from|by|against) that\s+(?!is|are|was|were|has|have|can|will|would|could|may|must|might)[a-z]+/i.test(text))
        return true;
    if (/\bboth\b(?!(\s+[\w-]+){1,4}\s+and\b)/i.test(text))
        return true;
    if (/\b(below|above)\s*[).,;:]/i.test(text))
        return true;
    const them = text.search(/\bthem\b/i);
    if (them >= 0) {
        const before = text.slice(0, them).split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, ''));
        if (!before.some((w) => w.length > 3 && /s$/i.test(w) && !/ss$/i.test(w)))
            return true;
    }
    return false;
}
exports.IMPERATIVE_VERBS = new Set(('Absorb Accept Add Address Agree Apply Approve Ask Assess Avoid Base Begin Build Buy Capture Check Choose Classify Collect Combine ' +
    'Compare Confirm Consider Copy Count Decide Define Delay Delete Deploy Design Do Document Drop Encrypt Ensure Erase Escalate Evaluate ' +
    'Expand Factory-reset File Find Finish Fix Focus Follow Get Give Hand Harden Have Hire Hold Identify Increase Inspect Install Interview ' +
    'Keep Learn Leave Let Link Log Look Map Match Measure Monitor Name Obtain Observe Perform Pick Plan Prefer Proceed Pull Rank Read ' +
    'Re-image Recalculate Reconcile Record Recover Reissue Reject Release Rely Reperform Report Request Require Restore Retain Retrain Review Roll ' +
    'Rotate Run Sample Score Seek Send Set Shut Size Start State Store Switch Tell Test Tie Trace Track Train Treat Turn Use Validate ' +
    'Verify Wait Write').split(' '));
const firstWord = (text) => text.trim().split(/\s+/)[0].replace(/[^A-Za-z-]/g, '');
const SUBJECT_NEXT = /^(can|cannot|is|are|was|were|will|must|should|may|might|could|would|has|does)$/;
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
function startsImperative(text) {
    const t = text.trim();
    const [, second = ''] = t.split(/\s+/);
    if (exports.IMPERATIVE_VERBS.has(firstWord(t)) && !SUBJECT_NEXT.test(second))
        return true;
    const lead = /^(When|If|Once|After|Before|During|Until|While)\b[^,;]*, ([a-z-]+) /.exec(t);
    return Boolean(lead && exports.IMPERATIVE_VERBS.has(cap(lead[2])));
}
function colonLabel(text) {
    const i = text.indexOf(':');
    if (i < 0)
        return false;
    const words = text.slice(0, i).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 3)
        return false;
    return words.length === 1 || exports.IMPERATIVE_VERBS.has(words[0]);
}
function unnamedSubject(text) {
    const t = text.trim();
    if (/^(If|When|Once|After|Before) the \w+ (is|are|arrives?)\b/.test(t))
        return true;
    if (/\bthe work\b(?! of)/i.test(t))
        return true;
    if (/\beach (technique|stage|life-cycle stage|step|type|method)\b(?! of)/i.test(t))
        return true;
    if (/^(The facilitator|Reviewers)\b/.test(t))
        return true;
    return false;
}
exports.DENY_CARDS = new Set([
    'root:4B1.2:1nmmzhw',
    'root:2A3.3:kz7n4r',
    'root:1B6.2:zp9vq9',
]);
function cleanStatement(text, kind) {
    var _a, _b, _c;
    const t = text.trim();
    const n = wordCount(t);
    if (n < exports.MIN_WORDS || n > exports.MAX_WORDS)
        return false;
    if (t.includes('?'))
        return false;
    if (!/^[A-Z]/.test(t))
        return false;
    if (!/\.$/.test(t))
        return false;
    if (/\b(e\.g|i\.e)\./i.test(t))
        return false;
    if (LEANS_ON.test(t) || leansBack(t))
        return false;
    if (((_a = t.match(/\(/g)) !== null && _a !== void 0 ? _a : []).length !== ((_b = t.match(/\)/g)) !== null && _b !== void 0 ? _b : []).length)
        return false;
    if (((_c = t.match(/"/g)) !== null && _c !== void 0 ? _c : []).length % 2 !== 0)
        return false;
    if (colonLabel(t) || unnamedSubject(t))
        return false;
    if (kind === 'rumor' && startsImperative(t))
        return false;
    return true;
}
function textHash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
}
function statementsFromNotes(pack) {
    var _a;
    const out = [];
    const seen = new Set();
    for (const d of (_a = pack === null || pack === void 0 ? void 0 : pack.domains) !== null && _a !== void 0 ? _a : []) {
        for (const t of d.topics) {
            for (const s of t.subtopics) {
                const base = { subtopicId: s.id, subtopicName: s.name, topicId: t.id, domainId: d.id };
                const add = (kind, text, why) => {
                    const clean = text.trim().replace(/\s+/g, ' ');
                    if (!cleanStatement(clean, kind))
                        return;
                    const id = `${kind}:${s.id}:${textHash(clean)}`;
                    if (seen.has(id) || exports.DENY_CARDS.has(id))
                        return;
                    seen.add(id);
                    out.push({ id, kind, text: clean, ...base, ...(why ? { why: why.trim() } : {}) });
                };
                add('root', firstSentence(s.isacaRule));
                for (const line of s.howItWorks)
                    add('root', line);
                for (const trap of s.examTraps)
                    add('rumor', trap.trap, trap.why);
            }
        }
    }
    return out;
}
const statementCache = new WeakMap();
function rumorStatements(pack) {
    if (!pack)
        return [];
    let hit = statementCache.get(pack);
    if (!hit) {
        hit = statementsFromNotes(pack);
        statementCache.set(pack, hit);
    }
    return hit;
}
function buildRumorRound(all, cards, tier, rng, now, size = exports.RUMOR_SIZE) {
    var _a, _b, _c;
    const due = (0, random_1.shuffled)(all.filter((s) => (cards === null || cards === void 0 ? void 0 : cards[s.id]) && cards[s.id].dueAt <= now), rng);
    let pool = all;
    if (tier === 'seedling') {
        const domains = [...new Set(all.map((s) => s.domainId))];
        const pairable = (d) => new Set(all.filter((s) => s.domainId === d && s.kind === 'rumor').map((s) => s.subtopicId)).size;
        const dueDomain = (_a = due[0]) === null || _a === void 0 ? void 0 : _a.domainId;
        const choices = (0, random_1.shuffled)(domains, rng).filter((d) => pairable(d) >= size / 2);
        const domain = (_b = dueDomain !== null && dueDomain !== void 0 ? dueDomain : choices[0]) !== null && _b !== void 0 ? _b : domains[0];
        pool = all.filter((s) => s.domainId === domain);
    }
    const picked = [];
    const has = (s) => picked.some((p) => p.id === s.id);
    const half = Math.floor(size / 2);
    const count = (k) => picked.filter((p) => p.kind === k).length;
    for (const s of due) {
        if (picked.length >= half)
            break;
        if (pool.includes(s))
            picked.push(s);
    }
    const bySub = new Map();
    for (const s of (0, random_1.shuffled)(pool, rng)) {
        const l = bySub.get(s.subtopicId);
        if (l)
            l.push(s);
        else
            bySub.set(s.subtopicId, [s]);
    }
    const subOrder = [
        ...new Set([...picked.map((p) => p.subtopicId), ...(0, random_1.shuffled)([...bySub.keys()], rng)]),
    ];
    for (const sub of subOrder) {
        if (picked.length >= size)
            break;
        const list = (_c = bySub.get(sub)) !== null && _c !== void 0 ? _c : [];
        for (const kind of ['rumor', 'root']) {
            if (picked.length >= size)
                break;
            if (picked.some((p) => p.subtopicId === sub && p.kind === kind))
                continue;
            if (count(kind) >= half + (size % 2))
                continue;
            const s = list.find((x) => x.kind === kind && !has(x));
            if (s)
                picked.push(s);
        }
    }
    for (const s of (0, random_1.shuffled)(pool, rng)) {
        if (picked.length >= size)
            break;
        if (!has(s))
            picked.push(s);
    }
    return (0, random_1.shuffled)(picked, rng);
}
function isRightTap(s, tap) {
    return s.kind === tap;
}
function rumorScore(taps) {
    return taps.filter(Boolean).length;
}
function longestRun(taps) {
    let best = 0;
    let run = 0;
    for (const t of taps) {
        run = t ? run + 1 : 0;
        best = Math.max(best, run);
    }
    return best;
}
function whyChoices(rumor, all, rng) {
    var _a;
    const real = (_a = rumor.why) !== null && _a !== void 0 ? _a : '';
    const others = all.filter((s) => s.kind === 'rumor' && s.id !== rumor.id && s.why && s.why !== real);
    const tiers = [
        others.filter((s) => s.subtopicId === rumor.subtopicId),
        others.filter((s) => s.subtopicId !== rumor.subtopicId && s.topicId === rumor.topicId),
        others.filter((s) => s.topicId !== rumor.topicId && s.domainId === rumor.domainId),
        others.filter((s) => s.domainId !== rumor.domainId),
    ];
    const decoys = [];
    for (const t of tiers) {
        for (const s of (0, random_1.shuffled)(t, rng)) {
            if (decoys.length >= 2)
                break;
            if (!decoys.includes(s.why))
                decoys.push(s.why);
        }
    }
    const choices = (0, random_1.shuffled)([real, ...decoys], rng);
    return { choices, correct: choices.indexOf(real) };
}
function tapTitle(s, right) {
    if (s.kind === 'rumor')
        return right ? 'Rumor: myth spotted' : 'This one is a Rumor: a myth the exam counts on';
    return right ? 'Root: a sound principle' : 'This one is a Root: a sound principle';
}
function tapVerdict(tap, right) {
    return `You said ${tap === 'root' ? 'Root' : 'Rumor'}, ${right ? 'right' : 'not quite'}.`;
}
exports.READ_AGAIN_AT = 2;
function readAgain(cards, at = exports.READ_AGAIN_AT) {
    var _a;
    const missed = new Map();
    for (const [id, e] of Object.entries(cards !== null && cards !== void 0 ? cards : {})) {
        if (e.box !== 1)
            continue;
        if (!id.startsWith('rumor:') && !id.startsWith('root:'))
            continue;
        const sub = id.split(':')[1];
        if (sub)
            missed.set(sub, ((_a = missed.get(sub)) !== null && _a !== void 0 ? _a : 0) + 1);
    }
    return [...missed].filter(([, n]) => n >= at).map(([sub]) => sub);
}
  };
  links["src/engine/games/steppingStones.ts"] = {"../random":"src/engine/random.ts"};
  defs["src/engine/games/steppingStones.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STONES_TIER_LINE = exports.STONES_TIER_NAME = exports.STONES_TIERS = exports.MISSING_CHOICES = exports.PERFECT_BONUS = exports.STONES_MIN_POOL = exports.STONES_PER_ROUND = void 0;
exports.stonesCardId = stonesCardId;
exports.stonesPool = stonesPool;
exports.keyWords = keyWords;
exports.missingChoices = missingChoices;
exports.buildStonesRound = buildStonesRound;
exports.checkPath = checkPath;
exports.pathPoints = pathPoints;
exports.stonesMax = stonesMax;
exports.ordinal = ordinal;
const random_1 = require("../random");
exports.STONES_PER_ROUND = 3;
exports.STONES_MIN_POOL = exports.STONES_PER_ROUND * 2;
exports.PERFECT_BONUS = 2;
exports.MISSING_CHOICES = 3;
exports.STONES_TIERS = ['seedling', 'sapling', 'heartwood'];
exports.STONES_TIER_NAME = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
exports.STONES_TIER_LINE = {
    seedling: 'Four steps, the first one given.',
    sapling: 'Five or six steps, all yours to place.',
    heartwood: 'Which step is missing? Pick it from three.',
};
function stonesCardId(seq) {
    return seq.lessonId ? `flow:${seq.lessonId}` : `seq:${seq.subtopicId}:${seq.id}`;
}
const RANK = { seedling: 0, sapling: 1, heartwood: 2 };
function stonesPool(all, tier, size = exports.STONES_PER_ROUND) {
    const allowed = all.filter((s) => RANK[s.tier] <= RANK[tier]);
    const short = allowed.filter((s) => s.steps.length <= 4);
    const long = allowed.filter((s) => s.steps.length >= 5);
    const own = tier === 'seedling' ? short : long;
    return own.length >= size ? own : [...own, ...(tier === 'seedling' ? long : short)];
}
const STOP = new Set('a an the and or of to for in on at by with from into is are be as it its this that each every all any no not before after then first last'.split(' '));
function keyWords(label) {
    return label
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
        .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}
function missingChoices(seq, index, all, rng, n = exports.MISSING_CHOICES) {
    const mine = new Set(seq.steps.flatMap((s) => keyWords(s.label)));
    const owner = (s) => { var _a; return (_a = s.lessonId) !== null && _a !== void 0 ? _a : s.subtopicId; };
    const decoys = [];
    const candidates = (0, random_1.shuffled)(all.filter((s) => s.id !== seq.id && owner(s) !== owner(seq)).flatMap((s) => s.steps.map((x) => x.label)), rng);
    for (const label of candidates) {
        if (decoys.length >= n - 1)
            break;
        if (decoys.includes(label) || label === seq.steps[index].label)
            continue;
        if (keyWords(label).some((w) => mine.has(w)))
            continue;
        decoys.push(label);
    }
    const choices = (0, random_1.shuffled)([seq.steps[index].label, ...decoys], rng);
    return { choices, correct: choices.indexOf(seq.steps[index].label) };
}
function shuffledOrder(indexes, rng) {
    if (indexes.length < 2)
        return indexes;
    for (let k = 0; k < 6; k++) {
        const s = (0, random_1.shuffled)(indexes, rng);
        if (s.some((x, j) => x !== indexes[j]))
            return s;
    }
    return [indexes[1], indexes[0], ...indexes.slice(2)];
}
function buildStonesRound(all, cards, tier, rng, now, size = exports.STONES_PER_ROUND) {
    const pool = stonesPool(all, tier, size);
    const due = (0, random_1.shuffled)(pool.filter((s) => { var _a, _b; return ((_b = (_a = cards === null || cards === void 0 ? void 0 : cards[stonesCardId(s)]) === null || _a === void 0 ? void 0 : _a.dueAt) !== null && _b !== void 0 ? _b : Infinity) <= now; }), rng);
    const order = [...due, ...(0, random_1.shuffled)(pool.filter((s) => !due.includes(s)), rng)];
    const picked = [];
    for (const s of order) {
        if (picked.length >= size)
            break;
        if (picked.some((p) => p.domainId === s.domainId) && order.some((o) => !picked.includes(o) && !picked.some((p) => p.domainId === o.domainId)))
            continue;
        picked.push(s);
    }
    for (const s of order) {
        if (picked.length >= size)
            break;
        if (!picked.includes(s))
            picked.push(s);
    }
    return picked.map((seq) => {
        const n = seq.steps.length;
        if (tier === 'heartwood') {
            const index = Math.floor(rng() * n);
            return { seq, given: 0, shown: [], missing: { index, ...missingChoices(seq, index, all, rng) } };
        }
        const given = tier === 'seedling' ? 1 : 0;
        const rest = Array.from({ length: n - given }, (_, k) => k + given);
        return { seq, given, shown: shuffledOrder(rest, rng) };
    });
}
function checkPath(item, placed) {
    const marks = placed.map((step, k) => ({ step, right: step === item.given + k, goes: step + 1 }));
    const right = marks.filter((m) => m.right).length;
    return { marks, right, perfect: right === item.seq.steps.length - item.given && placed.length === right };
}
function pathPoints(right, perfect) {
    return right + (perfect ? exports.PERFECT_BONUS : 0);
}
function stonesMax(items) {
    return items.reduce((s, it) => s + (it.missing ? 1 : it.seq.steps.length - it.given + exports.PERFECT_BONUS), 0);
}
function ordinal(n) {
    var _a;
    const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (_a = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10]) !== null && _a !== void 0 ? _a : 'th';
    return `${n}${s}`;
}
  };
  links["src/engine/games/trapSpotter.ts"] = {"../random":"src/engine/random.ts"};
  defs["src/engine/games/trapSpotter.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trapTip = trapTip;
exports.trapLetter = trapLetter;
exports.trapPool = trapPool;
exports.buildTrapRound = buildTrapRound;
exports.snareStep = snareStep;
exports.closedInStep2 = closedInStep2;
exports.snareWhy = snareWhy;
exports.scoreTrapPick = scoreTrapPick;
const random_1 = require("../random");
function trapTip(q) {
    var _a, _b;
    return (_b = (_a = q.tips.find((t) => t.startsWith('Final two:'))) !== null && _a !== void 0 ? _a : q.tips[0]) !== null && _b !== void 0 ? _b : '';
}
function trapLetter(q) {
    const tip = trapTip(q);
    const v2 = tip.match(/^Final two: \{\{([A-D])\}\} beats \{\{([A-D])\}\}/);
    if (v2) {
        const r = v2[2];
        return v2[1] === q.correct && r !== q.correct && q.options[r] !== undefined ? r : null;
    }
    if (!/trap/i.test(tip))
        return null;
    for (const m of tip.matchAll(/\{\{([A-D])\}\}/g)) {
        const l = m[1];
        if (l !== q.correct && q.options[l] !== undefined)
            return l;
    }
    return null;
}
function trapPool(pool) {
    return pool.filter((q) => trapLetter(q) !== null);
}
function buildTrapRound(pool, rng, size = 5) {
    return (0, random_1.shuffled)(trapPool(pool), rng)
        .slice(0, size)
        .map((q) => q.id);
}
function snareStep(q, trapPick) {
    if (trapPick === q.correct)
        return 'key';
    return trapPick === trapLetter(q) ? 'spotted' : 'missed';
}
function closedInStep2(q, trapPick) {
    return trapPick === q.correct ? [] : [trapPick];
}
function snareWhy(q) {
    const t = trapLetter(q);
    return (t && q.wrongExplanations[t]) || trapTip(q);
}
function scoreTrapPick(q, trapPick, answerPick) {
    const spotted = trapPick === trapLetter(q);
    const correct = answerPick === q.correct;
    const revealed = trapPick === q.correct;
    return { spotted, correct, points: (spotted ? 1 : 0) + (correct && !revealed ? 1 : 0) };
}
  };
  links["src/engine/journey.ts"] = {};
  defs["src/engine/journey.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_MOCKS = exports.READY_SCORE = exports.MOCK_DOMAIN_FLOOR = exports.DOMAIN_TARGET = exports.DIAGNOSTIC_SIZE = exports.STAGE_LABEL = exports.STAGE_ORDER = void 0;
exports.journeyStage = journeyStage;
exports.stageProgress = stageProgress;
exports.STAGE_ORDER = ['diagnose', 'learn', 'practice', 'mock', 'ready', 'examDay', 'afterExam'];
exports.STAGE_LABEL = {
    diagnose: 'Find your starting point',
    learn: 'Learn the concepts',
    practice: 'Make it stick',
    mock: 'Rehearse the exam',
    ready: 'Keep it steady',
    examDay: 'Exam week',
    afterExam: 'After the exam',
};
exports.DIAGNOSTIC_SIZE = 20;
exports.DOMAIN_TARGET = 0.7;
exports.MOCK_DOMAIN_FLOOR = 0.65;
exports.READY_SCORE = 80;
exports.MAX_MOCKS = 50;
function journeyStage(j) {
    if (j.daysLeft !== null && j.daysLeft < 0)
        return 'afterExam';
    if (j.daysLeft !== null && j.daysLeft <= 7)
        return 'examDay';
    if (j.answeredTotal < exports.DIAGNOSTIC_SIZE)
        return 'diagnose';
    const domains = j.readiness.domains;
    const lessonsShort = j.lessonsAvailable > 0 && j.lessonsDone < Math.min(j.lessonsAvailable, domains.length);
    if (lessonsShort && j.readiness.score < 50 && !j.examFocused)
        return 'learn';
    const allAbove = (floor) => domains.every((d) => d.mastery >= floor);
    if (!allAbove(exports.MOCK_DOMAIN_FLOOR))
        return 'practice';
    if (j.mocksTaken < 2)
        return 'mock';
    if (j.readiness.score >= exports.READY_SCORE)
        return 'ready';
    return 'practice';
}
function stageProgress(stage) {
    return exports.STAGE_ORDER.indexOf(stage) / (exports.STAGE_ORDER.length - 1);
}
  };
  links["src/engine/milestones.ts"] = {"./games/registry":"src/engine/games/registry.ts","./games/daylight":"src/engine/games/daylight.ts","./games/growth":"src/engine/games/growth.ts","./journey":"src/engine/journey.ts","./studyPath":"src/engine/studyPath.ts","./pace":"src/engine/pace.ts","./readiness":"src/engine/readiness.ts","./streak":"src/engine/streak.ts"};
  defs["src/engine/milestones.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANTER_NEEDS = exports.GAME_MISSES_CAP = exports.SKILL_BADGES = exports.MILESTONES = exports.BADGES = exports.WINDOW_SIZE = exports.DRESS_GAP_DAYS = exports.DRESS_TIERS = exports.LONG_IDS_CAP = exports.LONG_LADDER = exports.LONG_TIERS = exports.FIRM_DEEP_ANSWERS = exports.FIRM_DEEP = exports.GAME_FIXES = exports.PACE_ROUNDS = exports.MYTH_RIGHT = exports.MYTH_WINDOW = exports.SIGNPOST_RIGHT = exports.SIGNPOST_WINDOW = exports.KEEL_ROUNDS = exports.SNARE_RIGHT = exports.SNARE_WINDOW = exports.FRESH_GAP_DAYS = exports.ROOTED_DAYS = exports.SURE_RIGHT = exports.SURE_MIN = exports.SURE_WINDOW = exports.GRADUATES = exports.LONG_GAP_DAYS = exports.LONG_RECALLS = exports.SLIP_TAGS = exports.LOOP_FIXES = exports.WHOLE_MAP_FLOOR = exports.FIRM_ANSWERS = exports.FIRM_MASTERY = exports.TEN_TOPICS = void 0;
exports.badgeDef = badgeDef;
exports.markBadge = markBadge;
exports.sureShare = sureShare;
exports.isDressRehearsal = isDressRehearsal;
exports.isOnPace = isOnPace;
exports.spacedChain = spacedChain;
exports.allMarks = allMarks;
exports.newlyMet = newlyMet;
exports.badgeCount = badgeCount;
exports.badgeViews = badgeViews;
exports.nearest = nearest;
exports.markLabel = markLabel;
exports.noteStudyDay = noteStudyDay;
exports.afterAnswer = afterAnswer;
exports.afterCard = afterCard;
exports.addToWindow = addToWindow;
exports.addCount = addCount;
exports.earn = earn;
exports.takeNext = takeNext;
exports.takeNextOf = takeNextOf;
exports.inferFromSaves = inferFromSaves;
exports.dressChain = dressChain;
exports.markSupported = markSupported;
exports.keepSupported = keepSupported;
exports.planterSupported = planterSupported;
exports.withFrozenPlanters = withFrozenPlanters;
const registry_1 = require("./games/registry");
const daylight_1 = require("./games/daylight");
const growth_1 = require("./games/growth");
const journey_1 = require("./journey");
const studyPath_1 = require("./studyPath");
const pace_1 = require("./pace");
const readiness_1 = require("./readiness");
const streak_1 = require("./streak");
exports.TEN_TOPICS = 10;
exports.FIRM_MASTERY = journey_1.DOMAIN_TARGET;
exports.FIRM_ANSWERS = 20;
exports.WHOLE_MAP_FLOOR = journey_1.MOCK_DOMAIN_FLOOR;
exports.LOOP_FIXES = 10;
exports.SLIP_TAGS = 10;
exports.LONG_RECALLS = 25;
exports.LONG_GAP_DAYS = 7;
exports.GRADUATES = 50;
exports.SURE_WINDOW = 50;
exports.SURE_MIN = 20;
exports.SURE_RIGHT = 0.85;
exports.ROOTED_DAYS = [10, 30, 60];
exports.FRESH_GAP_DAYS = 7;
exports.SNARE_WINDOW = 10;
exports.SNARE_RIGHT = 8;
exports.KEEL_ROUNDS = 3;
exports.SIGNPOST_WINDOW = 10;
exports.SIGNPOST_RIGHT = 8;
exports.MYTH_WINDOW = 25;
exports.MYTH_RIGHT = 20;
exports.PACE_ROUNDS = 3;
exports.GAME_FIXES = 10;
exports.FIRM_DEEP = 0.8;
exports.FIRM_DEEP_ANSWERS = 40;
exports.LONG_TIERS = [75, 150];
exports.LONG_LADDER = [exports.LONG_RECALLS, ...exports.LONG_TIERS];
exports.LONG_IDS_CAP = exports.LONG_LADDER[exports.LONG_LADDER.length - 1];
exports.DRESS_TIERS = [2, 3];
exports.DRESS_GAP_DAYS = 7;
const DAY_MS = 86400000;
exports.WINDOW_SIZE = { myths: exports.MYTH_WINDOW, signposts: exports.SIGNPOST_WINDOW };
const g = (id) => registry_1.GAMES[id].name;
exports.BADGES = [
    { id: 'first-foothold', kind: 'milestone', name: 'First Foothold', rule: `Answer your first ${journey_1.DIAGNOSTIC_SIZE} questions.` },
    { id: 'topic-clear', kind: 'milestone', name: 'Topic Clear', rule: 'Clear your first topic: its lesson done, and 4 of your last 5 answers there right.' },
    { id: 'ten-topics', kind: 'milestone', name: 'Ten Topics Clear', rule: `Clear ${exports.TEN_TOPICS} topics.` },
    {
        id: 'firm-footing',
        kind: 'milestone',
        name: 'Firm Footing',
        rule: `Reach ${Math.round(exports.FIRM_MASTERY * 100)}% mastery in a domain, with ${exports.FIRM_ANSWERS} or more of its questions answered. One leaf per domain.`,
    },
    { id: 'whole-map', kind: 'milestone', name: 'Whole Map', rule: `Reach ${Math.round(exports.WHOLE_MAP_FLOOR * 100)}% mastery in every domain.` },
    { id: 'loop-closed', kind: 'milestone', name: 'Loop Closed', rule: `Fix ${exports.LOOP_FIXES} logged mistakes: answer each one right, without a hint, on a later day.` },
    { id: 'slip-spotter', kind: 'milestone', name: 'Slip Spotter', rule: `Tag ${exports.SLIP_TAGS} mistakes with the thinking slip behind them.` },
    { id: 'long-memory', kind: 'milestone', name: 'Long Memory', rule: `Get ${exports.LONG_RECALLS} questions right, without a hint, a week or more after you last saw them.` },
    { id: 'graduate', kind: 'milestone', name: 'Flown the Nest', rule: `Answer ${exports.GRADUATES} questions right from the last review box, so they leave review.` },
    {
        id: 'know-what-you-know',
        kind: 'milestone',
        name: 'Know What You Know',
        rule: `Of your last ${exports.SURE_WINDOW} “sure” answers, get ${Math.round(exports.SURE_RIGHT * 100)}% or more right (after at least ${exports.SURE_MIN}).`,
    },
    { id: 'dress-rehearsal', kind: 'milestone', name: 'Dress Rehearsal', rule: 'Finish a full, timed mock with every question answered.' },
    { id: 'on-pace', kind: 'milestone', name: 'On Pace', rule: `Finish a timed mock with every pace check within ${Math.round(pace_1.PACE_TOLERANCE * 100)}% of the target.` },
    { id: 'mindset-shift', kind: 'milestone', name: 'Mindset Shift', rule: 'Pick the closest wrong choice clearly less often than in your first weeks.' },
    {
        id: 'rooted',
        kind: 'milestone',
        name: 'Rooted',
        rule: `Study on ${exports.ROOTED_DAYS[0]} days in all, then ${exports.ROOTED_DAYS[1]}, then ${exports.ROOTED_DAYS[2]}. Days add up; they don’t need to be in a row.`,
    },
    {
        id: 'took-root',
        kind: 'milestone',
        name: 'Took Root',
        rule: 'Make one whole topic stick: every part of it answered right, without a hint, on two different days.',
    },
    { id: 'fresh-start', kind: 'milestone', name: 'Fresh Start', rule: `Come back after ${exports.FRESH_GAP_DAYS} days or more away and finish a session.` },
    { id: 'snare-wise', kind: 'skill', name: 'Snare-wise', rule: `Spot the snare in ${exports.SNARE_RIGHT} of your last ${exports.SNARE_WINDOW} ${g('trap')} questions.` },
    { id: 'even-keel', kind: 'skill', name: 'Even Keel', rule: `${g('sprint')} says “well calibrated” ${exports.KEEL_ROUNDS} rounds in a row.` },
    {
        id: 'signpost-reader',
        kind: 'skill',
        name: 'Signpost Reader',
        rule: `Read the deciding word right in ${exports.SIGNPOST_RIGHT} of your last ${exports.SIGNPOST_WINDOW} different FIRST questions in ${g('priority')}.`,
    },
    { id: 'myth-clearer', kind: 'skill', name: 'Myth Clearer', rule: `Clear ${exports.MYTH_RIGHT} of your last ${exports.MYTH_WINDOW} different rumors in ${g('rumor')}.` },
    {
        id: 'sure-footed-pace',
        kind: 'skill',
        name: 'Sure-Footed Pace',
        rule: `Finish ${exports.PACE_ROUNDS} ${g('daylight')} rounds at Sapling pace or faster, inside the light, with ${daylight_1.PACE_RIGHT} of ${daylight_1.DAYLIGHT_SIZE} right.`,
    },
    { id: 'whole-grove', kind: 'skill', name: 'Whole Grove', rule: 'Play every game at least once.' },
    { id: 'back-on-path', kind: 'skill', name: 'Back on the Path', rule: `Fix ${exports.GAME_FIXES} game misses later: right on a later day, in review or a later round.` },
];
exports.MILESTONES = exports.BADGES.filter((b) => b.kind === 'milestone');
exports.SKILL_BADGES = exports.BADGES.filter((b) => b.kind === 'skill');
function badgeDef(id) {
    return exports.BADGES.find((b) => b.id === id);
}
function markBadge(key) {
    return key.split(':')[0];
}
const frac = (have, need) => (need <= 0 ? 1 : Math.max(0, Math.min(1, have / need)));
const pct = (x) => `${Math.round(x * 100)}%`;
const of = (have, need, unit) => `${Math.min(have, need)} of ${need} ${unit}`;
const one = (b, met, progress, detail) => [
    { key: b, badge: b, label: badgeDef(b).name, met, progress: met ? 1 : progress, detail },
];
function windowMark(b, hits, size, need, played, right) {
    const last = hits.slice(-size);
    const ok = last.filter((h) => h.ok).length;
    const full = last.length >= size;
    return one(b, full && ok >= need, full ? frac(ok, need) : frac(last.length, size) * 0.5, full ? `${ok} of your last ${size} ${right}` : of(last.length, size, played));
}
function sureShare(sure) {
    const last = sure.slice(-exports.SURE_WINDOW);
    return { n: last.length, right: (0, growth_1.share)(last) };
}
function isDressRehearsal(m, fullSize) {
    return m.total >= fullSize && m.timing !== 'untimed' && m.unanswered === 0;
}
function isOnPace(m) {
    var _a;
    const cps = (_a = m.checkpoints) !== null && _a !== void 0 ? _a : [];
    return m.timing !== 'untimed' && cps.length >= pace_1.CHECKPOINTS.length && cps.every((d) => Math.abs(d) <= pace_1.PACE_TOLERANCE + 1e-9);
}
function spacedChain(times) {
    const chain = [];
    for (const t of [...times].sort((a, b) => a - b))
        if (!chain.length || t - chain[chain.length - 1] >= exports.DRESS_GAP_DAYS * DAY_MS)
            chain.push(t);
    return chain;
}
function allMarks(f) {
    var _a, _b;
    const out = [];
    const firstFoothold = f.cleanAnswered >= journey_1.DIAGNOSTIC_SIZE;
    out.push(...one('first-foothold', firstFoothold, frac(f.cleanAnswered, journey_1.DIAGNOSTIC_SIZE), of(f.cleanAnswered, journey_1.DIAGNOSTIC_SIZE, 'answered without a hint')));
    const tb = f.topicBest;
    const tbRight = Math.min((_a = tb === null || tb === void 0 ? void 0 : tb.right) !== null && _a !== void 0 ? _a : 0, studyPath_1.CLEAR_RIGHT);
    out.push(...one('topic-clear', f.topicsClear >= 1, tb ? (tbRight + (tb.studied ? 1 : 0)) / (studyPath_1.CLEAR_RIGHT + 1) : 0, f.topicsClear >= 1
        ? 'A topic is clear'
        : tb
            ? `Closest topic: ${tbRight} of ${studyPath_1.CLEAR_RIGHT} right · lesson ${tb.studied ? 'done' : 'not done yet'}`
            : 'No topic clear yet'));
    out.push(...one('ten-topics', f.topicsClear >= exports.TEN_TOPICS, frac(f.topicsClear, exports.TEN_TOPICS), of(f.topicsClear, exports.TEN_TOPICS, 'topics clear')));
    for (const d of f.domains) {
        const met = d.answered >= exports.FIRM_ANSWERS && d.mastery >= exports.FIRM_MASTERY - 1e-9;
        out.push({
            key: `firm-footing:${d.id}`,
            badge: 'firm-footing',
            label: `Firm Footing · ${d.short}`,
            met,
            progress: met ? 1 : Math.min(frac(d.answered, exports.FIRM_ANSWERS), frac(d.mastery, exports.FIRM_MASTERY)),
            detail: `${pct(d.mastery)} mastery · ${of(d.answered, exports.FIRM_ANSWERS, 'answered')}`,
        });
    }
    const atFloor = f.domains.filter((d) => d.mastery >= exports.WHOLE_MAP_FLOOR - 1e-9).length;
    const wholeMap = f.domains.length > 0 && atFloor === f.domains.length;
    const mapProgress = f.domains.length ? f.domains.reduce((s, d) => s + frac(d.mastery, exports.WHOLE_MAP_FLOOR), 0) / f.domains.length : 0;
    out.push(...one('whole-map', wholeMap, mapProgress, `${atFloor} of ${f.domains.length} domains at ${pct(exports.WHOLE_MAP_FLOOR)}`));
    const mapOpen = f.wholeMapAt !== undefined || wholeMap;
    for (const d of f.domains) {
        const met = mapOpen && d.answered >= exports.FIRM_DEEP_ANSWERS && d.mastery >= exports.FIRM_DEEP - 1e-9;
        out.push({
            key: `firm-footing:${d.id}:80`,
            badge: 'firm-footing',
            label: `Firm Footing · ${d.short} · 80%`,
            met,
            progress: met ? 1 : Math.min(frac(d.answered, exports.FIRM_DEEP_ANSWERS), frac(d.mastery, exports.FIRM_DEEP)),
            detail: `${pct(d.mastery)} mastery · ${of(d.answered, exports.FIRM_DEEP_ANSWERS, 'answered')}`,
            rule: `Reach ${pct(exports.FIRM_DEEP)} mastery in this domain, with ${exports.FIRM_DEEP_ANSWERS} or more of its questions answered. Opens once every domain is at ${pct(exports.WHOLE_MAP_FLOOR)}.`,
        });
    }
    out.push(...one('loop-closed', f.loopFixed >= exports.LOOP_FIXES, frac(f.loopFixed, exports.LOOP_FIXES), of(f.loopFixed, exports.LOOP_FIXES, 'fixed')));
    out.push(...one('slip-spotter', f.slipsTagged >= exports.SLIP_TAGS, frac(f.slipsTagged, exports.SLIP_TAGS), of(f.slipsTagged, exports.SLIP_TAGS, 'tagged')));
    exports.LONG_LADDER.forEach((n, i) => {
        const met = f.longRecall >= n;
        out.push({
            key: i === 0 ? 'long-memory' : `long-memory:${n}`,
            badge: 'long-memory',
            label: `Long Memory · ${n} recalls`,
            met,
            progress: met ? 1 : frac(f.longRecall, n),
            detail: of(f.longRecall, n, 'remembered'),
            ...(i > 0 ? { rule: `Get ${n} questions right, without a hint, a week or more after you last saw them.` } : {}),
        });
    });
    out.push(...one('graduate', f.graduated >= exports.GRADUATES, frac(f.graduated, exports.GRADUATES), of(f.graduated, exports.GRADUATES, 'left review')));
    if (f.tookRoot !== null) {
        const root = Math.max(0, Math.min(1, (_b = f.tookRoot) !== null && _b !== void 0 ? _b : 0));
        const rootMet = root >= 1 - 1e-9;
        out.push(...one('took-root', rootMet, root, rootMet ? 'A topic took root' : root > 0 ? `Closest topic: ${pct(root)} rooted` : 'No whole topic yet'));
    }
    const s = sureShare(f.sure);
    const kwyk = s.n >= exports.SURE_MIN && s.right >= exports.SURE_RIGHT - 1e-9;
    out.push(...one('know-what-you-know', kwyk, s.n < exports.SURE_MIN ? frac(s.n, exports.SURE_MIN) * 0.5 : 0.5 + 0.5 * frac(s.right, exports.SURE_RIGHT), s.n < exports.SURE_MIN ? of(s.n, exports.SURE_MIN, '“sure” answers so far') : `${pct(s.right)} right on your last ${s.n} “sure” answers`));
    const dress = f.mocks.some((m) => isDressRehearsal(m, f.fullMockSize));
    out.push({ ...one('dress-rehearsal', dress, 0, dress ? 'Done' : 'Not yet')[0], label: 'Dress Rehearsal · 1 mock' });
    const wholeMapAt = f.wholeMapAt;
    const chain = wholeMapAt !== undefined
        ? spacedChain(f.mocks.filter((m) => isDressRehearsal(m, f.fullMockSize) && m.finishedAt !== undefined && m.finishedAt >= wholeMapAt).map((m) => m.finishedAt))
        : [];
    for (const n of exports.DRESS_TIERS) {
        const met = chain.length >= n;
        out.push({
            key: `dress-rehearsal:${n}`,
            badge: 'dress-rehearsal',
            label: `Dress Rehearsal · ${n} mocks`,
            met,
            progress: met ? 1 : frac(chain.length, n),
            detail: met ? 'Done' : `${Math.min(chain.length, n)} of ${n} full mocks, a week apart`,
            rule: `Finish ${n} full, timed mocks with every question answered, each ${exports.DRESS_GAP_DAYS} days or more after the one before, once every domain is at ${pct(exports.WHOLE_MAP_FLOOR)}.`,
        });
    }
    const onPace = f.mocks.some(isOnPace);
    out.push(...one('on-pace', onPace, 0, onPace ? 'Done' : 'Not yet'));
    out.push(...one('mindset-shift', f.mindsetShift, 0, f.mindsetShift ? 'Done' : 'Not yet'));
    for (const n of exports.ROOTED_DAYS) {
        out.push({ key: `rooted:${n}`, badge: 'rooted', label: `Rooted · ${n} days`, met: f.studyDays >= n, progress: frac(f.studyDays, n), detail: of(f.studyDays, n, 'study days') });
    }
    out.push(...one('fresh-start', f.freshStart, 0, f.freshStart ? 'Done' : 'Not yet'));
    const snares = f.snareHits.slice(-exports.SNARE_WINDOW);
    const snareRight = snares.filter(Boolean).length;
    out.push(...one('snare-wise', snares.length >= exports.SNARE_WINDOW && snareRight >= exports.SNARE_RIGHT, snares.length < exports.SNARE_WINDOW ? frac(snares.length, exports.SNARE_WINDOW) * 0.5 : frac(snareRight, exports.SNARE_RIGHT), snares.length < exports.SNARE_WINDOW ? of(snares.length, exports.SNARE_WINDOW, 'questions played') : `${snareRight} of your last ${exports.SNARE_WINDOW} snares spotted`));
    out.push(...one('even-keel', f.keelRun >= exports.KEEL_ROUNDS, frac(f.keelRun, exports.KEEL_ROUNDS), of(f.keelRun, exports.KEEL_ROUNDS, 'rounds in a row')));
    out.push(...windowMark('signpost-reader', f.signposts, exports.SIGNPOST_WINDOW, exports.SIGNPOST_RIGHT, 'FIRST questions played', 'FIRST questions read right'));
    out.push(...windowMark('myth-clearer', f.myths, exports.MYTH_WINDOW, exports.MYTH_RIGHT, 'rumors played', 'rumors cleared'));
    out.push(...one('sure-footed-pace', f.paceRounds >= exports.PACE_ROUNDS, frac(f.paceRounds, exports.PACE_ROUNDS), of(f.paceRounds, exports.PACE_ROUNDS, 'rounds')));
    out.push(...one('whole-grove', f.gamesTotal > 0 && f.gamesPlayed >= f.gamesTotal, frac(f.gamesPlayed, f.gamesTotal), of(f.gamesPlayed, f.gamesTotal, 'games played')));
    out.push(...one('back-on-path', f.gameFixes >= exports.GAME_FIXES, frac(f.gameFixes, exports.GAME_FIXES), of(f.gameFixes, exports.GAME_FIXES, 'fixed')));
    return out;
}
function newlyMet(marks, earned) {
    return marks.filter((m) => m.met && !(earned === null || earned === void 0 ? void 0 : earned[m.key])).map((m) => m.key);
}
function badgeCount(keys) {
    return new Set(keys.map(markBadge)).size;
}
function badgeViews(marks, earned, kind) {
    return exports.BADGES.filter((b) => b.kind === kind).map((def) => {
        const mine = marks.filter((m) => m.badge === def.id);
        const got = mine.filter((m) => earned === null || earned === void 0 ? void 0 : earned[m.key]).map((m) => ({ key: m.key, label: m.label, at: earned[m.key] }));
        for (const [k, at] of Object.entries(earned !== null && earned !== void 0 ? earned : {})) {
            if (markBadge(k) === def.id && !got.some((x) => x.key === k))
                got.push({ key: k, label: def.name, at });
        }
        got.sort((a, b) => a.at - b.at);
        const open = mine.filter((m) => !(earned === null || earned === void 0 ? void 0 : earned[m.key]));
        const next = def.id === 'rooted' ? open[0] : [...open].sort((a, b) => b.progress - a.progress)[0];
        return { def, earned: got, ...(next ? { next } : {}) };
    });
}
function nearest(views, n = 3) {
    return views
        .filter((v) => v.next)
        .map((v, i) => ({ v, i }))
        .sort((a, b) => b.v.next.progress - a.v.next.progress || a.i - b.i)
        .slice(0, n)
        .map((x) => x.v);
}
function markLabel(key, marks) {
    var _a, _b, _c, _d;
    return (_d = (_b = (_a = marks.find((m) => m.key === key)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : (_c = badgeDef(markBadge(key))) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : key;
}
const bump = (m, id, by = 1) => { var _a, _b; return ({ ...m, counts: { ...m.counts, [id]: ((_b = (_a = m.counts) === null || _a === void 0 ? void 0 : _a[id]) !== null && _b !== void 0 ? _b : 0) + by } }); };
exports.GAME_MISSES_CAP = 2000;
function noteStudyDay(m, day) {
    var _a;
    if (m.lastDay && day <= m.lastDay)
        return m;
    const back = m.lastDay && (0, streak_1.daysBetween)(m.lastDay, day) >= exports.FRESH_GAP_DAYS;
    return { ...m, days: ((_a = m.days) !== null && _a !== void 0 ? _a : 0) + 1, lastDay: day, ...(back ? { returnedOn: day } : {}) };
}
function afterAnswer(prev, a) {
    var _a, _b, _c, _d, _e;
    const day = (0, streak_1.dayKey)(a.at);
    let m = noteStudyDay(prev !== null && prev !== void 0 ? prev : { earned: {} }, day);
    let fixedLater = false;
    const clean = !a.game && !a.assisted;
    if (clean && a.correct) {
        const longIds = (_a = m.longIds) !== null && _a !== void 0 ? _a : [];
        if (a.prevLastAt !== undefined && a.at - a.prevLastAt >= exports.LONG_GAP_DAYS * DAY_MS && !longIds.includes(a.questionId) && longIds.length < exports.LONG_IDS_CAP) {
            m = bump({ ...m, longIds: [...longIds, a.questionId] }, 'longRecall');
        }
        if (a.openMistakeAt !== undefined && day > (0, streak_1.dayKey)(a.openMistakeAt)) {
            m = bump(m, 'loopFixed');
            fixedLater = true;
        }
        if (a.graduated)
            m = bump(m, 'graduated');
        const missedOn = (_b = m.gameMisses) === null || _b === void 0 ? void 0 : _b[a.questionId];
        if (missedOn && day > missedOn) {
            const gameMisses = { ...m.gameMisses };
            delete gameMisses[a.questionId];
            m = bump({ ...m, gameMisses }, 'gameFixes');
        }
    }
    if (clean && a.confidence === 'sure')
        m = { ...m, sure: [...((_c = m.sure) !== null && _c !== void 0 ? _c : []), a.correct].slice(-exports.SURE_WINDOW) };
    if (a.game && !a.correct && !((_d = m.gameMisses) === null || _d === void 0 ? void 0 : _d[a.questionId]) && Object.keys((_e = m.gameMisses) !== null && _e !== void 0 ? _e : {}).length < exports.GAME_MISSES_CAP) {
        m = { ...m, gameMisses: { ...m.gameMisses, [a.questionId]: day } };
    }
    return { milestones: m, fixedLater };
}
function afterCard(prev, cardId, correct, at) {
    var _a, _b;
    const day = (0, streak_1.dayKey)(at);
    const missedOn = (_a = prev === null || prev === void 0 ? void 0 : prev.cardMisses) === null || _a === void 0 ? void 0 : _a[cardId];
    if (!correct) {
        if (missedOn || Object.keys((_b = prev === null || prev === void 0 ? void 0 : prev.cardMisses) !== null && _b !== void 0 ? _b : {}).length >= exports.GAME_MISSES_CAP)
            return prev;
        const m = prev !== null && prev !== void 0 ? prev : { earned: {} };
        return { ...m, cardMisses: { ...m.cardMisses, [cardId]: day } };
    }
    if (!prev || !missedOn || day <= missedOn)
        return prev;
    const cardMisses = { ...prev.cardMisses };
    delete cardMisses[cardId];
    return bump({ ...prev, cardMisses }, 'gameFixes');
}
function addToWindow(prev, id, hits) {
    var _a;
    if (!hits.length)
        return prev;
    const m = prev !== null && prev !== void 0 ? prev : { earned: {} };
    let list = (_a = m[id]) !== null && _a !== void 0 ? _a : [];
    for (const h of hits)
        list = [...list.filter((x) => x.id !== h.id), { id: h.id, ok: h.ok }];
    return { ...m, [id]: list.slice(-exports.WINDOW_SIZE[id]) };
}
function addCount(prev, id, by) {
    if (!(by > 0))
        return prev;
    return bump(prev !== null && prev !== void 0 ? prev : { earned: {} }, id, Math.round(by));
}
function earn(prev, keys, at, queue) {
    var _a;
    const m = prev !== null && prev !== void 0 ? prev : { earned: {} };
    const fresh = keys.filter((k) => !m.earned[k]);
    if (!fresh.length)
        return m;
    const earned = { ...m.earned };
    for (const k of fresh)
        earned[k] = at;
    return { ...m, earned, ...(queue ? { queue: [...((_a = m.queue) !== null && _a !== void 0 ? _a : []), ...fresh] } : {}) };
}
function takeNext(m) {
    var _a;
    const [key, ...rest] = (_a = m === null || m === void 0 ? void 0 : m.queue) !== null && _a !== void 0 ? _a : [];
    if (!m || !key)
        return { milestones: m };
    return { key, milestones: { ...m, queue: rest } };
}
function takeNextOf(m, only) {
    var _a;
    const queue = (_a = m === null || m === void 0 ? void 0 : m.queue) !== null && _a !== void 0 ? _a : [];
    const key = queue.find((k) => only.includes(k));
    if (!m || !key)
        return { milestones: m };
    return { key, milestones: { ...m, queue: queue.filter((k) => k !== key) } };
}
function inferFromSaves(i) {
    var _a;
    const loopFixed = [];
    for (const [id, m] of Object.entries(i.mistakes)) {
        const a = i.answers[id];
        if (m.resolved && !m.fixedLater && a && a.lastCorrect && !a.lastAssisted && !a.lastRetest && !a.lastGame && (0, streak_1.dayKey)(a.lastAt) > (0, streak_1.dayKey)(m.at))
            loopFixed.push(id);
    }
    const sure = Object.values(i.answers)
        .filter((a) => a.lastConfidence === 'sure' && !a.lastAssisted && !a.lastRetest && !a.lastGame)
        .sort((a, b) => a.lastAt - b.lastAt)
        .slice(-exports.SURE_WINDOW)
        .map((a) => a.lastCorrect);
    const days = new Set();
    for (const a of Object.values(i.answers))
        days.add((0, streak_1.dayKey)(a.lastAt));
    for (const m of i.mocks)
        days.add((0, streak_1.dayKey)(m.finishedAt));
    for (const s of Object.values((_a = i.mastery) !== null && _a !== void 0 ? _a : {})) {
        days.add(s.firstDay);
        if (s.masteredAt)
            days.add(s.masteredAt);
    }
    return { loopFixed, sure, days: [...days].sort() };
}
const afterWholeMap = (key) => /^firm-footing:[^:]+:80$/.test(key) || /^dress-rehearsal:\d+$/.test(key);
function dressChain(mocks, fullSize) {
    const at = [];
    for (const raw of mocks) {
        if (!raw || typeof raw !== 'object')
            continue;
        const m = raw;
        if (typeof m.total !== 'number' || typeof m.finishedAt !== 'number' || !Number.isFinite(m.finishedAt))
            continue;
        const unanswered = typeof m.unanswered === 'number' ? m.unanswered : 0;
        const timing = typeof m.timing === 'string' ? m.timing : undefined;
        if (isDressRehearsal({ total: m.total, timing, unanswered }, fullSize))
            at.push(m.finishedAt);
    }
    return spacedChain(at);
}
function markSupported(key, e) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10;
    const answers = Object.keys((_a = e.answers) !== null && _a !== void 0 ? _a : {});
    const n = answers.length;
    const studied = ((_c = (_b = e.lessonsDone) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) + Math.max((_d = e.notesEverRead) !== null && _d !== void 0 ? _d : 0, (_f = (_e = e.notesRead) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0);
    const c = (id) => { var _a, _b, _c; return (_c = (_b = (_a = e.milestones) === null || _a === void 0 ? void 0 : _a.counts) === null || _b === void 0 ? void 0 : _b[id]) !== null && _c !== void 0 ? _c : 0; };
    const days = (_h = (_g = e.milestones) === null || _g === void 0 ? void 0 : _g.days) !== null && _h !== void 0 ? _h : 0;
    const parts = key.split(':');
    if (parts.length > 3 || parts.some((p) => p === ''))
        return false;
    const [badge, part, tier] = parts;
    const plain = part === undefined;
    const tierOf = (allowed) => {
        if (tier !== undefined)
            return null;
        if (part === undefined)
            return 1;
        return allowed.includes(Number(part)) && String(Number(part)) === part ? Number(part) : null;
    };
    switch (badge) {
        case 'first-foothold':
            return plain && n >= journey_1.DIAGNOSTIC_SIZE;
        case 'topic-clear':
            return plain && n >= 4 && studied >= 1;
        case 'ten-topics':
            return plain && n >= 4 * exports.TEN_TOPICS && studied >= 1;
        case 'firm-footing': {
            if (plain || (tier !== undefined && tier !== '80'))
                return false;
            if (tier === '80' && e.earned && e.earned['whole-map'] === undefined)
                return false;
            const inDomain = answers.filter((id) => (0, readiness_1.domainOf)(id) === part).length;
            return inDomain >= (tier === '80' ? exports.FIRM_DEEP_ANSWERS : exports.FIRM_ANSWERS);
        }
        case 'whole-map': {
            if (!plain || n < exports.FIRM_ANSWERS)
                return false;
            const seen = new Set(answers.map(readiness_1.domainOf));
            return !e.exam || e.exam.domains.every((d) => seen.has(d));
        }
        case 'loop-closed':
            return plain && c('loopFixed') >= exports.LOOP_FIXES;
        case 'slip-spotter':
            return plain && Object.values((_j = e.mistakes) !== null && _j !== void 0 ? _j : {}).filter((m) => m.slip).length >= exports.SLIP_TAGS;
        case 'long-memory': {
            const t = tierOf(exports.LONG_TIERS);
            const recalls = Math.min(c('longRecall'), (_m = (_l = (_k = e.milestones) === null || _k === void 0 ? void 0 : _k.longIds) === null || _l === void 0 ? void 0 : _l.length) !== null && _m !== void 0 ? _m : 0);
            return t !== null && recalls >= (t === 1 ? exports.LONG_RECALLS : t);
        }
        case 'graduate':
            return plain && c('graduated') >= exports.GRADUATES;
        case 'know-what-you-know':
            return plain && ((_q = (_p = (_o = e.milestones) === null || _o === void 0 ? void 0 : _o.sure) === null || _p === void 0 ? void 0 : _p.length) !== null && _q !== void 0 ? _q : 0) >= exports.SURE_MIN;
        case 'dress-rehearsal': {
            const t = tierOf(exports.DRESS_TIERS);
            if (t === null)
                return false;
            if (t > 1 && e.earned && e.earned['whole-map'] === undefined)
                return false;
            if (t === 1 || !e.exam)
                return ((_s = (_r = e.mocks) === null || _r === void 0 ? void 0 : _r.length) !== null && _s !== void 0 ? _s : 0) >= t;
            if (e.mocksMayBeCut && ((_u = (_t = e.mocks) === null || _t === void 0 ? void 0 : _t.length) !== null && _u !== void 0 ? _u : 0) >= journey_1.MAX_MOCKS)
                return true;
            return dressChain((_v = e.mocks) !== null && _v !== void 0 ? _v : [], e.exam.fullMockSize).length >= t;
        }
        case 'on-pace':
            return plain && ((_x = (_w = e.mocks) === null || _w === void 0 ? void 0 : _w.length) !== null && _x !== void 0 ? _x : 0) >= 1;
        case 'mindset-shift':
            return plain && n >= 100;
        case 'rooted':
            return tier === undefined && exports.ROOTED_DAYS.includes(Number(part)) && String(Number(part)) === part && days >= Number(part);
        case 'took-root':
            return plain && Object.values((_y = e.mastery) !== null && _y !== void 0 ? _y : {}).some((m) => Boolean(m === null || m === void 0 ? void 0 : m.masteredAt));
        case 'fresh-start':
            return plain && days >= 2;
        case 'snare-wise':
            return plain && ((_2 = (_1 = (_0 = (_z = e.gameGrowth) === null || _z === void 0 ? void 0 : _z.trap) === null || _0 === void 0 ? void 0 : _0.hits) === null || _1 === void 0 ? void 0 : _1.length) !== null && _2 !== void 0 ? _2 : 0) >= exports.SNARE_WINDOW;
        case 'even-keel':
            return plain && ((_3 = e.gameBest) === null || _3 === void 0 ? void 0 : _3.sprint) !== undefined;
        case 'signpost-reader':
            return plain && ((_6 = (_5 = (_4 = e.milestones) === null || _4 === void 0 ? void 0 : _4.signposts) === null || _5 === void 0 ? void 0 : _5.length) !== null && _6 !== void 0 ? _6 : 0) >= exports.SIGNPOST_WINDOW;
        case 'myth-clearer':
            return plain && ((_9 = (_8 = (_7 = e.milestones) === null || _7 === void 0 ? void 0 : _7.myths) === null || _8 === void 0 ? void 0 : _8.length) !== null && _9 !== void 0 ? _9 : 0) >= exports.MYTH_WINDOW;
        case 'sure-footed-pace':
            return plain && c('paceRounds') >= exports.PACE_ROUNDS;
        case 'whole-grove':
            return plain && Object.keys((_10 = e.gameBest) !== null && _10 !== void 0 ? _10 : {}).length >= 2;
        case 'back-on-path':
            return plain && c('gameFixes') >= exports.GAME_FIXES;
        default:
            return false;
    }
}
function keepSupported(m, e) {
    var _a;
    const first = Object.fromEntries(Object.entries(m.earned).filter(([k]) => markSupported(k, { ...e, earned: undefined })));
    const earned = Object.fromEntries(Object.entries(first).filter(([k]) => !afterWholeMap(k) || markSupported(k, { ...e, earned: first })));
    const queue = (_a = m.queue) === null || _a === void 0 ? void 0 : _a.filter((k) => earned[k] !== undefined);
    const planters = m.planters && Object.fromEntries(Object.entries(m.planters).filter(([set]) => planterSupported(set, earned, e)));
    return { ...m, earned, ...(m.queue ? { queue } : {}), ...(planters ? { planters } : {}) };
}
exports.PLANTER_NEEDS = {
    groundwork: ['first-foothold', 'topic-clear', 'ten-topics'],
    domains: 'domains',
    evergreen: ['long-memory', 'graduate', 'loop-closed'],
    judgement: ['know-what-you-know', 'slip-spotter', 'mindset-shift'],
    examDay: ['dress-rehearsal', 'on-pace'],
    rooted: exports.ROOTED_DAYS.map((n) => `rooted:${n}`),
};
function planterKeys(set, e) {
    var _a;
    if (!Object.prototype.hasOwnProperty.call(exports.PLANTER_NEEDS, set))
        return null;
    const needs = exports.PLANTER_NEEDS[set];
    if (needs !== 'domains')
        return needs;
    const domains = new Set(e.exam ? e.exam.domains : Object.keys((_a = e.answers) !== null && _a !== void 0 ? _a : {}).map(readiness_1.domainOf));
    return domains.size > 0 ? ['whole-map', ...[...domains].map((d) => `firm-footing:${d}`)] : null;
}
function planterSupported(set, earned, e) {
    const keys = planterKeys(set, e);
    return keys !== null && keys.every((k) => earned[k] !== undefined);
}
function withFrozenPlanters(m, e) {
    var _a;
    let planters;
    for (const set of Object.keys(exports.PLANTER_NEEDS)) {
        if (((_a = m.planters) === null || _a === void 0 ? void 0 : _a[set]) !== undefined || (planters === null || planters === void 0 ? void 0 : planters[set]) !== undefined)
            continue;
        const keys = planterKeys(set, e);
        if (!keys || !keys.every((k) => m.earned[k] !== undefined))
            continue;
        planters = { ...(planters !== null && planters !== void 0 ? planters : m.planters), [set]: Math.max(...keys.map((k) => m.earned[k])) };
    }
    return planters ? { ...m, planters } : m;
}
  };
  links["src/engine/outline.ts"] = {};
  defs["src/engine/outline.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outlineFromNotes = outlineFromNotes;
exports.topicQuestionIds = topicQuestionIds;
exports.indexOutline = indexOutline;
exports.topicsIn = topicsIn;
exports.missedNoteGroups = missedNoteGroups;
exports.missedSubtopics = missedSubtopics;
function outlineFromNotes(pack) {
    var _a;
    const topics = [];
    const seen = new Set();
    for (const d of (_a = pack === null || pack === void 0 ? void 0 : pack.domains) !== null && _a !== void 0 ? _a : []) {
        const byId = new Map(d.topics.map((t) => [t.id, t]));
        const listed = d.parts.flatMap((p) => p.topicIds).filter((id) => byId.has(id));
        const order = [...new Set(listed), ...d.topics.map((t) => t.id).filter((id) => !listed.includes(id))];
        for (const tid of order) {
            const t = byId.get(tid);
            topics.push({
                id: t.id,
                domainId: d.id,
                name: t.name,
                subtopics: t.subtopics.map((s) => {
                    var _a;
                    return ({
                        id: s.id,
                        name: s.name,
                        questionIds: ((_a = s.practiceIds) !== null && _a !== void 0 ? _a : []).filter((q) => (seen.has(q) ? false : (seen.add(q), true))),
                    });
                }),
            });
        }
    }
    return topics;
}
function topicQuestionIds(t) {
    return t.subtopics.flatMap((s) => s.questionIds);
}
function indexOutline(topics) {
    const sub = new Map();
    const top = new Map();
    const names = new Map();
    for (const t of topics) {
        for (const s of t.subtopics) {
            names.set(s.id, s.name);
            for (const q of s.questionIds) {
                sub.set(q, s.id);
                top.set(q, t.id);
            }
        }
    }
    const byId = new Map(topics.map((t) => [t.id, t]));
    return {
        topics,
        subtopicOf: (q) => sub.get(q),
        topicOf: (q) => top.get(q),
        topic: (id) => byId.get(id),
        subtopicName: (id) => names.get(id),
    };
}
function topicsIn(topics, domainId) {
    return domainId ? topics.filter((t) => t.domainId === domainId) : topics;
}
function missedNoteGroups(order, isMissed, subtopicOf, limit = 3) {
    const byNote = new Map();
    let missed = 0;
    order.forEach((q, i) => {
        var _a;
        if (!isMissed(q))
            return;
        missed += 1;
        const s = subtopicOf(q);
        if (s)
            byNote.set(s, [...((_a = byNote.get(s)) !== null && _a !== void 0 ? _a : []), i + 1]);
    });
    const groups = [...byNote.entries()]
        .map(([id, numbers], k) => ({ id, numbers, k }))
        .sort((x, y) => y.numbers.length - x.numbers.length || x.k - y.k)
        .slice(0, limit)
        .map(({ id, numbers }) => ({ id, numbers }));
    return { groups, rest: missed - groups.reduce((n, g) => n + g.numbers.length, 0) };
}
function missedSubtopics(missedIds, subtopicOf, limit = 3) {
    var _a;
    const count = new Map();
    for (const q of missedIds) {
        const s = subtopicOf(q);
        if (s)
            count.set(s, ((_a = count.get(s)) !== null && _a !== void 0 ? _a : 0) + 1);
    }
    return [...count.entries()]
        .map(([id, missed], i) => ({ id, missed, i }))
        .sort((x, y) => y.missed - x.missed || x.i - y.i)
        .slice(0, limit)
        .map(({ id, missed }) => ({ id, missed }));
}
  };
  links["src/engine/pace.ts"] = {};
  defs["src/engine/pace.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAST_SHARE = exports.OFFER_DAYS = exports.COACHING = exports.SLOW_RIGHT_MS = exports.FAST_WRONG_MS = exports.SOFT_CUE_LINE = exports.SOFT_CUE_MS = exports.PACE_LINE_MIN = exports.PACE_TOLERANCE = exports.CHECKPOINTS = exports.TIMING_LABEL = exports.TIMING_FACTOR = exports.MOCK_TIMINGS = exports.REVIEW_RESERVE_MINUTES = exports.MINUTES_PER_QUESTION = void 0;
exports.examPaceSeconds = examPaceSeconds;
exports.targetPaceSeconds = targetPaceSeconds;
exports.examPaceWords = examPaceWords;
exports.targetPaceWords = targetPaceWords;
exports.aboutMin = aboutMin;
exports.spokenMin = spokenMin;
exports.keepUnits = keepUnits;
exports.timingOf = timingOf;
exports.mockPace = mockPace;
exports.statusOf = statusOf;
exports.paceVerdict = paceVerdict;
exports.paceMessage = paceMessage;
exports.paceShort = paceShort;
exports.dueCheckpoints = dueCheckpoints;
exports.checkpointText = checkpointText;
exports.formatClock = formatClock;
exports.spokenClock = spokenClock;
exports.spokenClockCoarse = spokenClockCoarse;
exports.durationSpoken = durationSpoken;
exports.durationText = durationText;
exports.median = median;
exports.medianSeconds = medianSeconds;
exports.aboutSeconds = aboutSeconds;
exports.practicePaceLine = practicePaceLine;
exports.practicePace = practicePace;
exports.durationWords = durationWords;
exports.timeStat = timeStat;
exports.softCue = softCue;
exports.practiceElapsedMs = practiceElapsedMs;
exports.coachingTag = coachingTag;
exports.shouldOfferTimer = shouldOfferTimer;
exports.mockPacing = mockPacing;
exports.pacingStats = pacingStats;
exports.pacingStatsLine = pacingStatsLine;
exports.MINUTES_PER_QUESTION = 1.2;
exports.REVIEW_RESERVE_MINUTES = 15;
function examPaceSeconds(exam) {
    return (exam.minutes * 60) / exam.questions;
}
function targetPaceSeconds(exam) {
    const reserve = Math.min(exports.REVIEW_RESERVE_MINUTES, exam.minutes / 2);
    return ((exam.minutes - reserve) * 60) / exam.questions;
}
function examPaceWords(exam) {
    return `The exam allows about ${Math.round(examPaceSeconds(exam))} seconds a question.`;
}
function targetPaceWords(exam, factor = 1) {
    return `Aim for about ${Math.round(targetPaceSeconds(exam) * factor)} seconds a question, so there’s time to revisit flagged ones.`;
}
const HOURS_FROM = 120;
function aboutMin(n, mid = false) {
    const total = Math.max(1, Math.round(n));
    return `${mid ? 'about' : 'About'} ${total >= HOURS_FROM ? durationText(total) : `${total} min`}`;
}
function spokenMin(line) {
    return line
        .replace(/\b(\d+(?:\.\d+)?)[ \u00A0]h\b/g, (_, n) => `${n} hour${n === '1' ? '' : 's'}`)
        .replace(/\b(\d+(?:\.\d+)?)[ \u00A0]min\b/g, (_, n) => `${n} minute${n === '1' ? '' : 's'}`);
}
function keepUnits(line) {
    return line.replace(/(\d)[ ](min|h)\b/g, '$1\u00A0$2').replace(/\b([Aa]bout)[ ](\d)/g, '$1\u00A0$2');
}
exports.MOCK_TIMINGS = ['standard', 'plus25', 'plus50', 'untimed'];
exports.TIMING_FACTOR = {
    standard: 1,
    plus25: 1.25,
    plus50: 1.5,
};
exports.TIMING_LABEL = {
    standard: 'Standard time',
    plus25: '+25% time',
    plus50: '+50% time',
    untimed: 'Untimed',
};
function timingOf(t) {
    return t !== null && t !== void 0 ? t : 'standard';
}
function mockPace(exam, questions, timing) {
    const factor = timing === 'untimed' ? 1 : exports.TIMING_FACTOR[timing];
    return {
        minutesAllowed: timing === 'untimed' ? null : Math.round((exam.minutes / exam.questions) * questions * factor),
        examSec: examPaceSeconds(exam) * factor,
        targetSec: targetPaceSeconds(exam) * factor,
    };
}
exports.CHECKPOINTS = [0.25, 0.5, 0.75];
exports.PACE_TOLERANCE = 0.1;
function statusOf(deviation) {
    if (deviation > exports.PACE_TOLERANCE)
        return 'behind';
    if (deviation < -exports.PACE_TOLERANCE)
        return 'ahead';
    return 'onPace';
}
function paceVerdict(elapsedSec, done, targetSec) {
    if (elapsedSec <= 0)
        return { status: 'onPace', deviation: 0, minutes: 0 };
    const expected = Math.max(0, done) * targetSec;
    const deviation = (elapsedSec - expected) / elapsedSec;
    const status = statusOf(deviation);
    const minutes = status === 'onPace' ? 0 : Math.max(1, Math.round(Math.abs(elapsedSec - expected) / 60));
    return { status, deviation, minutes };
}
function paceMessage(v) {
    if (v.status === 'behind')
        return `About ${v.minutes} min behind. Flag anything past 2 minutes and move on.`;
    if (v.status === 'ahead')
        return 'Ahead. Use the time to re-read the questions.';
    return 'On pace';
}
function paceShort(v) {
    if (v.status === 'behind')
        return `About ${v.minutes} min behind`;
    if (v.status === 'ahead')
        return 'Ahead of pace';
    return 'On pace';
}
function dueCheckpoints(recorded, allowedMs, elapsedMs, done, targetSec) {
    const have = recorded !== null && recorded !== void 0 ? recorded : [];
    if (!allowedMs || allowedMs <= 0)
        return have;
    const added = [];
    for (const at of exports.CHECKPOINTS) {
        if (elapsedMs < at * allowedMs)
            break;
        if (have.some((c) => c.at === at))
            continue;
        const v = paceVerdict((at * allowedMs) / 1000, done, targetSec);
        added.push({ at, done, deviation: v.deviation, minutes: v.minutes });
    }
    return added.length ? [...have, ...added] : have;
}
function checkpointText(c) {
    const s = statusOf(c.deviation);
    if (s === 'behind')
        return `${c.minutes} min behind`;
    if (s === 'ahead')
        return `${c.minutes} min ahead`;
    return 'on pace';
}
function formatClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function spokenClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const part = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
    const parts = [h ? part(h, 'hour') : '', m ? part(m, 'minute') : '', !h && (s || !m) ? part(s, 'second') : ''];
    return parts.filter(Boolean).join(' ');
}
function spokenClockCoarse(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    if (sec >= 60)
        return durationSpoken(Math.floor(sec / 60));
    const step = Math.ceil(sec / 10) * 10;
    return step === 0 ? '0 seconds' : `${step} seconds or less`;
}
function durationSpoken(minutes) {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    const part = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
    if (h === 0)
        return part(m, 'minute');
    return m === 0 ? part(h, 'hour') : `${part(h, 'hour')} ${part(m, 'minute')}`;
}
function durationText(minutes) {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0)
        return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
function median(values) {
    if (values.length === 0)
        return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function cleanMs(values) {
    return values.filter((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0);
}
function medianSeconds(ms) {
    const m = median(cleanMs(ms));
    return m === null ? null : Math.round(m / 1000);
}
exports.PACE_LINE_MIN = 3;
function aboutSeconds(sec) {
    const n = Math.max(1, Math.round(sec));
    if (n < 120)
        return `about ${n} ${n === 1 ? 'second' : 'seconds'}`;
    const m = Math.round((n / 60) * 10) / 10;
    return `about ${m} min`;
}
function practicePaceLine(ms, exam) {
    const times = cleanMs(ms);
    if (times.length < exports.PACE_LINE_MIN)
        return null;
    const own = Math.max(1, Math.round(median(times) / 1000));
    return `About ${own} ${own === 1 ? 'second' : 'seconds'} per question. The exam allows about ${Math.round(examPaceSeconds(exam))} seconds.`;
}
function practicePace(ms, exam) {
    const times = cleanMs(ms);
    if (times.length < exports.PACE_LINE_MIN)
        return null;
    return { own: Math.max(1, Math.round(median(times) / 1000)), exam: Math.round(examPaceSeconds(exam)) };
}
const UNDER_A_MINUTE = 'Under 1 min';
function durationWords(ms) {
    if (!(ms >= 60000))
        return { text: UNDER_A_MINUTE, spoken: 'under a minute' };
    const minutes = Math.round(ms / 60000);
    return { text: durationText(minutes), spoken: durationSpoken(minutes) };
}
function timeStat(ms) {
    const w = durationWords(ms);
    const total = ms >= 60000 ? Math.round(ms / 60000) : 0;
    if (total === 0)
        return { value: '<1', unit: 'min', spoken: w.spoken };
    if (total >= 60)
        return { word: w.text.replace(/(\d) (h|min)\b/g, '$1\u00a0$2'), spoken: w.spoken };
    return { value: String(total), unit: 'min', spoken: w.spoken };
}
exports.SOFT_CUE_MS = 2 * 60000;
exports.SOFT_CUE_LINE = 'Over 2 minutes on this one. On the exam, flag it and move on.';
function softCue(ms) {
    return ms >= exports.SOFT_CUE_MS;
}
function practiceElapsedMs(answeredMs, currentMs) {
    return cleanMs(answeredMs).reduce((a, b) => a + b, 0) + Math.max(0, currentMs !== null && currentMs !== void 0 ? currentMs : 0);
}
exports.FAST_WRONG_MS = 30000;
exports.SLOW_RIGHT_MS = 3 * 60000;
exports.COACHING = {
    'fast-wrong': { tag: 'Quick pick', line: 'Slow down on the question.' },
    'slow-right': { tag: 'Took its time', line: 'You knew it; trust the first pass.' },
};
function coachingTag(correct, ms) {
    if (typeof ms !== 'number' || !Number.isFinite(ms))
        return null;
    if (!correct && ms < exports.FAST_WRONG_MS)
        return 'fast-wrong';
    if (correct && ms > exports.SLOW_RIGHT_MS)
        return 'slow-right';
    return null;
}
exports.OFFER_DAYS = 21;
function shouldOfferTimer(i) {
    if (i.answered || i.timerOn)
        return false;
    const close = i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= exports.OFFER_DAYS;
    return close || i.stage === 'mock' || i.stage === 'ready';
}
exports.LAST_SHARE = 0.1;
function mockPacing(i) {
    var _a, _b;
    const usedMs = Math.max(0, i.endedAt - i.startedAt);
    const answered = i.answers;
    const cut = i.startedAt + usedMs * (1 - exports.LAST_SHARE);
    const dated = answered.filter((a) => typeof a.at === 'number');
    const tally = (xs) => (xs.length ? { correct: xs.filter((a) => a.correct).length, total: xs.length } : null);
    const late = dated.filter((a) => a.at >= cut);
    const early = dated.filter((a) => a.at < cut);
    const byDomain = new Map();
    for (const a of answered) {
        if (typeof a.ms !== 'number')
            continue;
        byDomain.set(a.domainId, [...((_a = byDomain.get(a.domainId)) !== null && _a !== void 0 ? _a : []), a.ms]);
    }
    let slowestDomain = null;
    for (const [domainId, ms] of byDomain) {
        if (ms.length < 2)
            continue;
        const med = Math.round(median(ms) / 1000);
        if (!slowestDomain || med > slowestDomain.medianSec)
            slowestDomain = { domainId, medianSec: med };
    }
    return {
        usedMinutes: Math.max(1, Math.round(usedMs / 60000)),
        usedMs,
        allowedMinutes: i.allowedMs === null ? null : Math.round(i.allowedMs / 60000),
        medianSec: medianSeconds(answered.map((a) => a.ms)),
        checkpoints: [...((_b = i.checkpoints) !== null && _b !== void 0 ? _b : [])],
        unanswered: Math.max(0, i.total - answered.length),
        timedOut: i.allowedMs !== null && usedMs >= i.allowedMs,
        lastTenth: tally(late),
        rest: tally(early),
        slowestDomain,
    };
}
function pacingStats(mocks) {
    const timed = mocks.filter((m) => timingOf(m.timing) !== 'untimed' && typeof m.medianSec === 'number');
    const devs = timed.flatMap((m) => { var _a; return (_a = m.checkpoints) !== null && _a !== void 0 ? _a : []; }).map(Math.abs);
    return {
        mocks: timed.length,
        medianSec: median(timed.map((m) => m.medianSec)),
        allAnswered: timed.filter((m) => m.unanswered === 0).length,
        meanDeviation: devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : null,
    };
}
function pacingStatsLine(s) {
    if (s.mocks === 0 || s.medianSec === null)
        return null;
    const mocks = s.mocks === 1 ? 'your timed mock' : `your ${s.mocks} timed mocks`;
    const all = s.mocks === 1 ? (s.allAnswered ? 'You answered every question.' : 'Some questions were left unanswered.') : `You answered every question in ${s.allAnswered} of ${s.mocks}.`;
    return `In ${mocks} you took ${aboutSeconds(s.medianSec)} per question. ${all}`;
}
  };
  links["src/engine/plant.ts"] = {"./journey":"src/engine/journey.ts","./examReady":"src/engine/examReady.ts","./readiness":"src/engine/readiness.ts","./readinessRange":"src/engine/readinessRange.ts","./streak":"src/engine/streak.ts","./plantLooks":"src/engine/plantLooks.ts","./plantForms":"src/engine/plantForms.ts"};
  defs["src/engine/plant.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_REST_LINES = exports.RETURN_DAYS = exports.REST_AFTER_DAYS = exports.FLOWER_DAYS = exports.FLOWER_SCORE = exports.PLANT_SLOTS = exports.organScales = exports.ORGAN_STEP_WORDS = exports.ORGAN_WEIGHT_PULL = exports.ORGAN_SPAN = exports.ORGAN_MIN = exports.MAX_NAME = exports.plantFace = exports.plantHasFace = exports.plantShown = exports.MAX_KEPT = exports.MAX_KEEPSAKES = exports.SPREAD_EXPLAINER = exports.FORM_FACTS = exports.GROWTH_RULES = exports.ELDER_SPREAD = exports.ELDER_DOMAIN_FLOOR = exports.CROWN_MOCK = exports.CROWN_SPREAD = exports.CROWN_LOW = exports.BOUGH_SPREAD = exports.BOUGH_LOW = exports.SHOOT_SPREAD = exports.SHOOT_PER_DOMAIN = exports.SPROUT_ANSWERS = exports.GROWTH_LOOKS = exports.GROWTH_NAMES = exports.MAX_GROWTH = exports.GROWTH_IDS = exports.SPECIES_INFO = exports.PLANT_SPECIES = void 0;
exports.isPlantSpecies = isPlantSpecies;
exports.growthId = growthId;
exports.isGrowthLevel = isGrowthLevel;
exports.growthFor = growthFor;
exports.nextGrowth = nextGrowth;
exports.nextGrowthSteps = nextGrowthSteps;
exports.outlineSpread = outlineSpread;
exports.isDressMock = isDressMock;
exports.plantFacts = plantFacts;
exports.cleanPlantName = cleanPlantName;
exports.shownName = shownName;
exports.suggestName = suggestName;
exports.plantCallName = plantCallName;
exports.plantNew = plantNew;
exports.advance = advance;
exports.growthBefore = growthBefore;
exports.clearPending = clearPending;
exports.resetPlant = resetPlant;
exports.freezeKeepsakes = freezeKeepsakes;
exports.keepThroughOtherReset = keepThroughOtherReset;
exports.switchSpecies = switchSpecies;
exports.withLook = withLook;
exports.renamePlant = renamePlant;
exports.bestCaseFacts = bestCaseFacts;
exports.maxSupportedGrowth = maxSupportedGrowth;
exports.supportEvidence = supportEvidence;
exports.supportSpread = supportSpread;
exports.clampToSupported = clampToSupported;
exports.isValidPlantState = isValidPlantState;
exports.isValidPlantSettings = isValidPlantSettings;
exports.isLookId = isLookId;
exports.repairPlant = repairPlant;
exports.organFullness = organFullness;
exports.organStep = organStep;
exports.organs = organs;
exports.slotOf = slotOf;
exports.organSlots = organSlots;
exports.nextToGrow = nextToGrow;
exports.dailySignals = dailySignals;
exports.isResting = isResting;
exports.restLine = restLine;
exports.plantLabel = plantLabel;
exports.backfillLine = backfillLine;
exports.formGrowthLine = formGrowthLine;
exports.growthShort = growthShort;
exports.grewLabel = grewLabel;
exports.organLabel = organLabel;
const journey_1 = require("./journey");
const examReady_1 = require("./examReady");
const readiness_1 = require("./readiness");
const readinessRange_1 = require("./readinessRange");
const streak_1 = require("./streak");
const plantLooks_1 = require("./plantLooks");
const plantForms_1 = require("./plantForms");
exports.PLANT_SPECIES = [
    'oak',
    'maple',
    'narra',
    'cherry-blossom',
    'pine',
    'coconut-palm',
    'mango',
    'bonsai',
    'sunflower',
    'lotus',
    'sampaguita',
    'cactus',
    'bamboo',
];
exports.SPECIES_INFO = {
    oak: { name: 'Oak', lower: 'oak', family: 'tree', line: 'A round, steady crown. Acorns when it is ready.', suggestions: ['Ledger', 'Atlas', 'Bracken', 'North'] },
    maple: { name: 'Maple', lower: 'maple', family: 'tree', line: 'Warm red leaves and winged seeds.', suggestions: ['Ember', 'Tally', 'Russet', 'Quill'] },
    narra: { name: 'Narra', lower: 'narra', family: 'tree', line: 'A wide, shady crown with golden flowers.', suggestions: ['Tala', 'Lakan', 'Dayang', 'Ledger'] },
    'cherry-blossom': { name: 'Cherry blossom', lower: 'cherry blossom', family: 'flowering-tree', line: 'A tree that blossoms limb by limb.', suggestions: ['Hana', 'Haru', 'Fable', 'Sora'] },
    pine: { name: 'Pine', lower: 'pine', family: 'conifer', line: 'Cloud-pruned pads that climb toward the top.', suggestions: ['Summit', 'Vale', 'Harbor', 'Matsu'] },
    'coconut-palm': { name: 'Coconut palm', lower: 'coconut palm', family: 'tropical', line: 'Feather fronds, one for each domain.', suggestions: ['Isla', 'Niyog', 'Harbor', 'Coco'] },
    mango: { name: 'Mango', lower: 'mango', family: 'fruit-tree', line: 'A low, dark dome that ripens into fruit.', suggestions: ['Amber', 'Mangga', 'Tally', 'Sunny'] },
    bonsai: { name: 'Bonsai', lower: 'bonsai', family: 'bonsai', line: 'A small, patient tree in a tray.', suggestions: ['Kumo', 'Pebble', 'Sable', 'Quill'] },
    sunflower: { name: 'Sunflower', lower: 'sunflower', family: 'flower', line: 'One tall stem, one leaf for each domain.', suggestions: ['Sunny', 'Helio', 'Goldie', 'Fable'] },
    lotus: { name: 'Lotus', lower: 'lotus', family: 'flower', line: 'Lily pads in a bowl, then a calm bloom.', suggestions: ['Padma', 'Lumi', 'Nila', 'Still'] },
    sampaguita: { name: 'Sampaguita', lower: 'sampaguita', family: 'flower', line: 'A dark green mound with white star flowers.', suggestions: ['Ligaya', 'Perla', 'Mutya', 'Jasmine'] },
    cactus: { name: 'Cactus', lower: 'cactus', family: 'succulent', line: 'Four arms and a crown flower.', suggestions: ['Pico', 'Nopal', 'Rio', 'Sable'] },
    bamboo: { name: 'Bamboo', lower: 'bamboo', family: 'grass', line: 'Five culms that rise together.', suggestions: ['Reed', 'Zhu', 'Kawayan', 'Vale'] },
};
function isPlantSpecies(x) {
    return typeof x === 'string' && exports.PLANT_SPECIES.includes(x);
}
exports.GROWTH_IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'];
exports.MAX_GROWTH = 6;
exports.GROWTH_NAMES = { 1: 'Seed', 2: 'Sprout', 3: 'Shoot', 4: 'Bough', 5: 'Crown', 6: 'Elder' };
exports.GROWTH_LOOKS = {
    1: 'A seed, settled in',
    2: 'First two leaves',
    3: 'A young trunk and a first crown',
    4: 'Branches reach out',
    5: 'A full, rounded crown',
    6: 'In season: flowers or fruit',
};
function growthId(level) {
    return exports.GROWTH_IDS[level - 1];
}
function isGrowthLevel(x) {
    return typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= exports.MAX_GROWTH;
}
exports.SPROUT_ANSWERS = journey_1.DIAGNOSTIC_SIZE;
exports.SHOOT_PER_DOMAIN = readiness_1.MIN_SAMPLE;
exports.SHOOT_SPREAD = 0.05;
exports.BOUGH_LOW = 55;
exports.BOUGH_SPREAD = 0.25;
exports.CROWN_LOW = 65;
exports.CROWN_SPREAD = 0.45;
exports.CROWN_MOCK = 50;
exports.ELDER_DOMAIN_FLOOR = journey_1.MOCK_DOMAIN_FLOOR;
exports.ELDER_SPREAD = 0.6;
const recalledAtLeast = (f, need) => f.recalled === undefined || f.recalled >= need;
const GATES = {
    2: (f) => f.cleanAnswered >= exports.SPROUT_ANSWERS,
    3: (f) => f.cleanByDomain.length > 0 && f.cleanByDomain.every((n) => n >= exports.SHOOT_PER_DOMAIN) && f.spread >= exports.SHOOT_SPREAD,
    4: (f) => f.low !== null && f.low >= exports.BOUGH_LOW && f.spread >= exports.BOUGH_SPREAD && recalledAtLeast(f, plantForms_1.RECALL_FORM_III),
    5: (f) => f.low !== null && f.low >= exports.CROWN_LOW && f.spread >= exports.CROWN_SPREAD && f.mock50,
    6: (f) => f.readyHeld && f.cleanMastery.length > 0 && Math.min(...f.cleanMastery) >= exports.ELDER_DOMAIN_FLOOR && f.spread >= exports.ELDER_SPREAD && f.dress && recalledAtLeast(f, plantForms_1.RECALL_FORM_IV),
};
function growthFor(f) {
    let g = 1;
    for (const k of [2, 3, 4, 5, 6]) {
        if (!GATES[k](f))
            break;
        g = k;
    }
    return g;
}
function nextGrowth(prevHighest, computed) {
    return Math.max(prevHighest, computed);
}
const READY_RULE = `The low end of your readiness holds at ${examReady_1.READY_LOW}% or more for ${examReady_1.READY_DAYS === 7 ? 'a week' : `${examReady_1.READY_DAYS} days`}`;
const CLEAN_LOW = 'The low end of your readiness, without hints or games,';
const STUDY_STEADY = `Your study estimate holds steady for ${examReady_1.READY_DAYS === 7 ? 'a week' : `${examReady_1.READY_DAYS} days`}`;
const STUDY_LOW = 'Your study estimate, without hints or games,';
const RECALL_WEEK = plantForms_1.RECALL_GAP_DAYS === 7 ? 'a week' : `${plantForms_1.RECALL_GAP_DAYS} days`;
const recallRule = (n) => `get ${n} questions right, without a hint, ${RECALL_WEEK} or more after you last saw them`;
exports.GROWTH_RULES = {
    1: 'Plant it.',
    2: `Answer ${exports.SPROUT_ANSWERS} questions without a hint or a game (your diagnostic).`,
    3: `Answer ${exports.SHOOT_PER_DOMAIN} or more questions in every domain, and know ${pct(exports.SHOOT_SPREAD)} of the outline.`,
    4: `${CLEAN_LOW} reaches ${exports.BOUGH_LOW}%, you know ${pct(exports.BOUGH_SPREAD)} of the outline, and you ${recallRule(plantForms_1.RECALL_FORM_III)}.`,
    5: `${CLEAN_LOW} reaches ${exports.CROWN_LOW}%, you know ${pct(exports.CROWN_SPREAD)} of the outline, and you finish a mock of ${exports.CROWN_MOCK} questions or more.`,
    6: `${READY_RULE}, every domain is at ${pct(exports.ELDER_DOMAIN_FLOOR)} or more, you know ${pct(exports.ELDER_SPREAD)} of the outline, you finish a full, timed mock with every question answered, and you ${recallRule(plantForms_1.RECALL_FORM_IV)}.`,
};
exports.FORM_FACTS = {
    3: `You answered ${exports.SHOOT_PER_DOMAIN} or more questions in every domain, without a hint or a game, and you know ${pct(exports.SHOOT_SPREAD)} of the outline.`,
    4: `You got ${plantForms_1.RECALL_FORM_III} questions right ${RECALL_WEEK} or more after you last saw them, and you know ${pct(exports.BOUGH_SPREAD)} of the outline.`,
    6: `Every domain reached ${pct(exports.ELDER_DOMAIN_FLOOR)}, you know ${pct(exports.ELDER_SPREAD)} of the outline, you got ${plantForms_1.RECALL_FORM_IV} questions right ${RECALL_WEEK} later, and you sat a full, timed mock.`,
};
exports.SPREAD_EXPLAINER = "Subtopics you've answered right, without a hint, on two different days, weighted like the exam.";
function pct(x) {
    return `${Math.round(x * 100)}%`;
}
function nextGrowthSteps(current, f, opts = {}) {
    var _a;
    if (current >= exports.MAX_GROWTH)
        return null;
    const g = (current + 1);
    const frac = (have, need) => (need <= 0 ? 1 : Math.max(0, Math.min(1, have / need)));
    const low = (_a = f.low) !== null && _a !== void 0 ? _a : 0;
    const spread = (need) => ({ label: `Know ${pct(need)} of the outline`, progress: frac(f.spread, need) });
    const lowStep = (need) => ({ label: `${opts.forms ? STUDY_LOW : CLEAN_LOW} reaches ${need}%`, progress: f.low === null ? 0 : frac(low, need) });
    const recallStep = (need) => (f.recalled === undefined ? [] : [{ label: `Get ${need} questions right ${RECALL_WEEK} or more after you last saw them`, progress: frac(f.recalled, need) }]);
    let steps;
    switch (g) {
        case 2:
            steps = [{ label: `Answer ${exports.SPROUT_ANSWERS} questions without a hint or a game`, progress: frac(f.cleanAnswered, exports.SPROUT_ANSWERS) }];
            break;
        case 3: {
            const n = f.cleanByDomain.length;
            const avg = n ? f.cleanByDomain.reduce((s, x) => s + frac(x, exports.SHOOT_PER_DOMAIN), 0) / n : 0;
            steps = [{ label: `Answer ${exports.SHOOT_PER_DOMAIN} or more in every domain`, progress: avg }, spread(exports.SHOOT_SPREAD)];
            break;
        }
        case 4:
            steps = [lowStep(exports.BOUGH_LOW), spread(exports.BOUGH_SPREAD), ...recallStep(plantForms_1.RECALL_FORM_III)];
            break;
        case 5:
            steps = [lowStep(exports.CROWN_LOW), spread(exports.CROWN_SPREAD), { label: `Finish a mock of ${exports.CROWN_MOCK} questions or more`, progress: f.mock50 ? 1 : 0 }];
            break;
        default: {
            const min = f.cleanMastery.length ? Math.min(...f.cleanMastery) : 0;
            steps = [
                { label: opts.forms ? STUDY_STEADY : READY_RULE, progress: f.readyHeld ? 1 : 0 },
                { label: `Every domain at ${pct(exports.ELDER_DOMAIN_FLOOR)} or more`, progress: frac(min, exports.ELDER_DOMAIN_FLOOR) },
                spread(exports.ELDER_SPREAD),
                { label: 'A full, timed mock with every question answered', progress: f.dress ? 1 : 0 },
                ...recallStep(plantForms_1.RECALL_FORM_IV),
            ];
        }
    }
    return { growth: g, steps };
}
function outlineSpread(weights, subtopicsByDomain, mastery) {
    let wSum = 0;
    let acc = 0;
    weights.forEach((w, i) => {
        var _a;
        const subs = (_a = subtopicsByDomain[i]) !== null && _a !== void 0 ? _a : [];
        if (!subs.length || !(w > 0))
            return;
        const known = subs.filter((s) => { var _a; return !!((_a = mastery === null || mastery === void 0 ? void 0 : mastery[s]) === null || _a === void 0 ? void 0 : _a.masteredAt); }).length;
        wSum += w;
        acc += (w * known) / subs.length;
    });
    return wSum > 0 ? acc / wSum : 0;
}
const isClean = (a) => !a.lastAssisted && !a.lastRetest && !a.lastGame;
function isDressMock(m, fullSize) {
    return m.total >= fullSize && m.timing !== 'untimed' && m.unanswered === 0;
}
function plantFacts(i) {
    var _a, _b;
    const clean = {};
    for (const [id, a] of Object.entries(i.answers))
        if (isClean(a))
            clean[id] = a;
    const cert = i.cert;
    const dm = (0, readiness_1.domainMastery)(cert, clean);
    const range = (0, readinessRange_1.readinessRange)(cert, (0, readiness_1.computeReadiness)(cert, clean));
    const held = (0, examReady_1.readyHoldDays)([...((_a = i.readinessLog) !== null && _a !== void 0 ? _a : [])], i.today) >= examReady_1.READY_DAYS;
    const seen = i.readySeenAt !== undefined && i.readySeenAt > ((_b = i.replantedAt) !== null && _b !== void 0 ? _b : 0);
    const cleanReady = range.enough && range.low >= examReady_1.READY_LOW;
    return {
        cleanAnswered: dm.reduce((s, d) => s + d.answered, 0),
        cleanByDomain: dm.map((d) => d.answered),
        cleanMastery: dm.map((d) => d.mastery),
        low: range.enough ? range.low : null,
        spread: outlineSpread(i.cert.domains.map((d) => d.weight), i.subtopicsByDomain, i.mastery),
        mock50: i.mocks.some((m) => m.total >= exports.CROWN_MOCK),
        dress: i.mocks.some((m) => isDressMock(m, i.cert.exam.questions)),
        readyHeld: (held || seen) && cleanReady,
        ...(i.recalled !== undefined ? { recalled: i.recalled } : {}),
    };
}
exports.MAX_KEEPSAKES = 3;
exports.MAX_KEPT = 64;
const plantShown = (s) => (s === null || s === void 0 ? void 0 : s.showPlant) !== false;
exports.plantShown = plantShown;
const plantHasFace = (s) => (s === null || s === void 0 ? void 0 : s.quietLook) !== true;
exports.plantHasFace = plantHasFace;
const plantFace = (plant, s) => (0, plantLooks_1.styleHasFace)((0, plantLooks_1.resolveStyle)(plant === null || plant === void 0 ? void 0 : plant.look, s));
exports.plantFace = plantFace;
exports.MAX_NAME = 20;
const WHITESPACE = /[^\S\uFEFF]+/gu;
const INVISIBLE = /[\p{Cc}\p{Cf}\u115F\u1160\u2800\u3164\uFFA0]/u;
const JOINERS = new Set(['\u200C', '\u200D']);
const BLACK_FLAG = '\u{1F3F4}';
const FLAG_TAGS = /^[\u{E0020}-\u{E007E}]+\u{E007F}/u;
const CLUSTER_TAIL = /^[\p{M}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]$/u;
function stripInvisible(s) {
    const cps = Array.from(s);
    const out = [];
    const visible = (ch) => ch !== undefined && ch !== ' ' && !INVISIBLE.test(ch);
    for (let i = 0; i < cps.length; i++) {
        const ch = cps[i];
        if (JOINERS.has(ch)) {
            if (visible(out[out.length - 1]) && visible(cps[i + 1]))
                out.push(ch);
            continue;
        }
        if (ch === BLACK_FLAG) {
            out.push(ch);
            const tags = FLAG_TAGS.exec(cps.slice(i + 1).join(''));
            if (tags) {
                out.push(tags[0]);
                i += Array.from(tags[0]).length;
            }
            continue;
        }
        if (!INVISIBLE.test(ch))
            out.push(ch);
    }
    return out.join('');
}
const isRegional = (ch) => {
    var _a;
    const cp = (_a = ch === null || ch === void 0 ? void 0 : ch.codePointAt(0)) !== null && _a !== void 0 ? _a : 0;
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
};
function midFlag(cps, i) {
    if (!isRegional(cps[i]) || !isRegional(cps[i - 1]))
        return false;
    let run = 0;
    for (let k = i - 1; k >= 0 && isRegional(cps[k]); k--)
        run++;
    return run % 2 === 1;
}
function cutWhole(s, max) {
    const cps = Array.from(s);
    if (cps.length <= max)
        return s;
    let end = 0;
    for (let i = 1; i <= max; i++) {
        const next = cps[i];
        const joined = next !== undefined && (CLUSTER_TAIL.test(next) || JOINERS.has(next) || JOINERS.has(cps[i - 1]) || midFlag(cps, i));
        if (!joined)
            end = i;
    }
    return cps.slice(0, end).join('');
}
function cleanPlantName(raw) {
    const s = stripInvisible(raw.replace(WHITESPACE, ' ')).normalize('NFC').replace(/ +/g, ' ').trim();
    return cutWhole(s, exports.MAX_NAME).trim();
}
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;
function shownName(name) {
    return RTL.test(name) ? `\u2068${name}\u2069` : name;
}
function suggestName(species, pick) {
    const list = exports.SPECIES_INFO[species].suggestions;
    return list[Math.min(list.length - 1, Math.max(0, Math.floor(pick * list.length)))];
}
function plantCallName(p) {
    return p.name ? shownName(p.name) : `Your ${exports.SPECIES_INFO[p.species].lower}`;
}
function plantNew(species, rawName, now, backfillGrowth = 1) {
    const p = { species, name: cleanPlantName(rawName), plantedAt: now, growth: 1, look: { style: plantLooks_1.NEW_PLANT_STYLE } };
    if (backfillGrowth > 1) {
        const reached = {};
        for (let g = 2; g <= backfillGrowth; g++)
            reached[growthId(g)] = now;
        p.growth = backfillGrowth;
        p.reached = reached;
        p.backfill = { at: now, growth: backfillGrowth };
    }
    return p;
}
function advance(plant, facts, now) {
    const next = nextGrowth(plant.growth, growthFor(facts));
    if (next === plant.growth)
        return { plant, grew: null };
    const reached = { ...plant.reached };
    for (let g = plant.growth + 1; g <= next; g++)
        reached[growthId(g)] = now;
    return { plant: { ...plant, growth: next, reached, pending: next }, grew: next };
}
function growthBefore(plant, to) {
    var _a, _b;
    const at = (_a = plant.reached) === null || _a === void 0 ? void 0 : _a[growthId(to)];
    let best = 1;
    for (let g = 2; g < to; g++) {
        const t = (_b = plant.reached) === null || _b === void 0 ? void 0 : _b[growthId(g)];
        if (t !== undefined && (at === undefined || t < at))
            best = g;
    }
    return best;
}
function clearPending(plant) {
    if (plant.pending === undefined)
        return plant;
    const { pending: _drop, ...rest } = plant;
    return rest;
}
function resetPlant(plant, now, unlocked = []) {
    var _a;
    const kept = [...new Set([...((_a = plant.kept) !== null && _a !== void 0 ? _a : []), ...unlocked].filter(plantLooks_1.isKeepable))].slice(0, exports.MAX_KEPT);
    const out = {
        species: plant.species,
        name: plant.name,
        plantedAt: plant.plantedAt,
        replantedAt: now,
        growth: 1,
        backfill: { at: now, growth: 1, seen: true },
    };
    if (plant.look)
        out.look = plant.look;
    if (kept.length)
        out.kept = kept;
    if (plant.passedOn)
        out.passedOn = plant.passedOn;
    return out;
}
function freezeKeepsakes(plant, marks) {
    var _a;
    if (((_a = plant.look) === null || _a === void 0 ? void 0 : _a.keepsakes) !== undefined)
        return plant;
    if ((0, plantLooks_1.resolveStyle)(plant.look, undefined) === 'botanical')
        return plant;
    const shown = (0, plantLooks_1.defaultKeepsakes)(plant, marks);
    return shown.length ? { ...plant, look: { ...plant.look, keepsakes: shown } } : plant;
}
function keepThroughOtherReset(plant, marks, resetMarks) {
    var _a;
    const p = freezeKeepsakes(plant, marks);
    const add = (0, plantLooks_1.keepOnReset)({ growth: 1 }, [resetMarks]).filter((id) => { var _a; return !((_a = p.kept) === null || _a === void 0 ? void 0 : _a.includes(id)); });
    if (!add.length)
        return p;
    return { ...p, kept: [...((_a = p.kept) !== null && _a !== void 0 ? _a : []), ...add].filter(plantLooks_1.isKeepable).slice(0, exports.MAX_KEPT) };
}
function switchSpecies(plant, species) {
    var _a;
    if (plant.species === species)
        return plant;
    const out = { ...plant, species };
    if (((_a = plant.look) === null || _a === void 0 ? void 0 : _a.colourway) !== undefined) {
        const { colourway: _drop, ...look } = plant.look;
        out.look = look;
    }
    return out;
}
function withLook(plant, change) {
    var _a;
    const look = { ...plant.look };
    for (const [k, slot] of LOOK_SLOTS) {
        if (!(k in change))
            continue;
        const v = change[k];
        if (v === null)
            delete look[k];
        else if ((0, plantLooks_1.isLookOfSlot)(v, slot))
            look[k] = v;
    }
    if ('keepsakes' in change) {
        if (change.keepsakes === null || change.keepsakes === undefined)
            delete look.keepsakes;
        else
            look.keepsakes = [...new Set(change.keepsakes.filter((x) => (0, plantLooks_1.isLookOfSlot)(x, 'keepsake')))].slice(0, exports.MAX_KEEPSAKES);
    }
    const before = JSON.stringify((_a = plant.look) !== null && _a !== void 0 ? _a : {});
    if (JSON.stringify(look) === before)
        return plant;
    const out = { ...plant };
    if (Object.keys(look).length)
        out.look = look;
    else
        delete out.look;
    return out;
}
function renamePlant(plant, rawName) {
    const name = cleanPlantName(rawName);
    return name === plant.name ? plant : { ...plant, name };
}
function bestCaseFacts(e) {
    return {
        cleanAnswered: e.answered,
        cleanByDomain: e.answeredByDomain,
        cleanMastery: e.answeredByDomain.map((n) => Math.min(1, n / readiness_1.MIN_SAMPLE)),
        low: e.answered >= readinessRange_1.RANGE_MIN_ANSWERS ? 100 : null,
        spread: e.spread,
        mock50: e.mock50,
        dress: e.dress,
        readyHeld: e.readyEver,
    };
}
function maxSupportedGrowth(e) {
    return growthFor(bestCaseFacts(e));
}
function supportEvidence(i) {
    var _a;
    const dm = (0, readiness_1.domainMastery)(i.cert, i.answers);
    const capped = i.mocks.length >= journey_1.MAX_MOCKS;
    const dressMark = Object.keys((_a = i.earned) !== null && _a !== void 0 ? _a : {}).some((k) => k === 'dress-rehearsal' || k.startsWith('dress-rehearsal:'));
    const dress = capped || dressMark || i.mocks.some((m) => isDressMock(m, i.cert.exam.questions));
    return {
        answered: dm.reduce((s, d) => s + d.answered, 0),
        answeredByDomain: dm.map((d) => d.answered),
        spread: supportSpread(i.cert.domains.map((d) => ({ id: d.id, weight: d.weight })), i.subtopicsByDomain, i.mastery),
        mock50: capped || (dressMark && i.cert.exam.questions >= exports.CROWN_MOCK) || i.mocks.some((m) => m.total >= exports.CROWN_MOCK),
        dress,
        readyEver: readyEvidence(i),
    };
}
function supportSpread(domains, outline, mastery) {
    const mastered = Object.entries(mastery !== null && mastery !== void 0 ? mastery : {}).filter(([, m]) => !!(m === null || m === void 0 ? void 0 : m.masteredAt)).map(([id]) => id);
    if (!mastered.length)
        return 0;
    const listed = new Set(outline.flat());
    if (!listed.size)
        return 1;
    const extra = domains.map(() => 0);
    for (const id of mastered) {
        if (listed.has(id))
            continue;
        const d = domains.findIndex((x) => id.startsWith(x.id) && !/[0-9]/.test(id.charAt(x.id.length)));
        if (d < 0)
            return 1;
        extra[d]++;
    }
    let wSum = 0;
    let acc = 0;
    domains.forEach((dom, i) => {
        var _a;
        const subs = (_a = outline[i]) !== null && _a !== void 0 ? _a : [];
        if (!subs.length || !(dom.weight > 0))
            return;
        const known = Math.min(subs.length, subs.filter((s) => { var _a; return !!((_a = mastery === null || mastery === void 0 ? void 0 : mastery[s]) === null || _a === void 0 ? void 0 : _a.masteredAt); }).length + extra[i]);
        wSum += dom.weight;
        acc += (dom.weight * known) / subs.length;
    });
    return wSum > 0 ? acc / wSum : 0;
}
function readyEvidence(i) {
    var _a, _b;
    if (i.readySeenAt !== undefined)
        return true;
    const log = (_a = i.readinessLog) !== null && _a !== void 0 ? _a : [];
    if (log.some((d) => { var _a, _b; return ((_a = d.min) !== null && _a !== void 0 ? _a : -1) >= examReady_1.READY_LOW || ((_b = d.last) !== null && _b !== void 0 ? _b : -1) >= examReady_1.READY_LOW; }))
        return true;
    if (!log.length)
        return false;
    const oldest = log.reduce((a, d) => (d.day < a ? d.day : a), log[0].day);
    return (Object.values((_b = i.mastery) !== null && _b !== void 0 ? _b : {}).some((m) => !!(m === null || m === void 0 ? void 0 : m.firstDay) && m.firstDay < oldest) ||
        i.mocks.some((m) => m.day < oldest) ||
        Object.values(i.answers).some((a) => typeof a.lastAt === 'number' && (0, streak_1.dayKey)(a.lastAt) < oldest));
}
function clampToSupported(plant, max) {
    var _a, _b, _c;
    if (plant.growth <= max && ((_a = plant.pending) !== null && _a !== void 0 ? _a : 0) <= max && ((_c = (_b = plant.backfill) === null || _b === void 0 ? void 0 : _b.growth) !== null && _c !== void 0 ? _c : 0) <= max && !reachedAbove(plant.reached, max))
        return plant;
    const out = { ...plant, growth: Math.min(plant.growth, max) };
    if (plant.reached) {
        const r = {};
        for (const [k, v] of Object.entries(plant.reached))
            if (exports.GROWTH_IDS.indexOf(k) + 1 <= out.growth)
                r[k] = v;
        out.reached = r;
    }
    if (out.pending !== undefined && out.pending > out.growth)
        delete out.pending;
    if (out.backfill && out.backfill.growth > out.growth)
        out.backfill = { ...out.backfill, growth: out.growth };
    return out;
}
function reachedAbove(reached, max) {
    return !!reached && Object.keys(reached).some((k) => exports.GROWTH_IDS.indexOf(k) + 1 > max);
}
const isTs = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isDate = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const onlyKeys = (o, keys) => Object.keys(o).every((k) => keys.includes(k));
const isLook = plantLooks_1.isCatalogLook;
const LOOK_SLOTS = [
    ['style', 'style'],
    ['colourway', 'colourway'],
    ['ground', 'ground'],
    ['planter', 'planter'],
    ['visitor', 'visitor'],
];
function isValidPlantState(x) {
    if (!isObj(x))
        return false;
    if (!isPlantSpecies(x.species))
        return false;
    if (typeof x.name !== 'string' || cleanPlantName(x.name) !== x.name)
        return false;
    if (!isTs(x.plantedAt))
        return false;
    if (x.replantedAt !== undefined && !isTs(x.replantedAt))
        return false;
    if (!isGrowthLevel(x.growth))
        return false;
    const growth = x.growth;
    if (x.reached !== undefined) {
        if (!isObj(x.reached))
            return false;
        for (const [k, v] of Object.entries(x.reached)) {
            const lvl = exports.GROWTH_IDS.indexOf(k) + 1;
            if (lvl < 1 || lvl > growth || !isTs(v))
                return false;
        }
    }
    if (x.pending !== undefined && !(isGrowthLevel(x.pending) && x.pending > 1 && x.pending <= growth))
        return false;
    if (x.backfill !== undefined) {
        const b = x.backfill;
        if (!isObj(b) || !isTs(b.at) || !isGrowthLevel(b.growth) || b.growth > growth)
            return false;
        if (b.seen !== undefined && typeof b.seen !== 'boolean')
            return false;
    }
    if (x.look !== undefined) {
        const l = x.look;
        if (!isObj(l))
            return false;
        for (const [k, slot] of LOOK_SLOTS)
            if (l[k] !== undefined && !(0, plantLooks_1.isLookOfSlot)(l[k], slot))
                return false;
        if (l.final !== undefined && !(0, plantForms_1.isFinalId)(l.final))
            return false;
        if (l.keepsakes !== undefined) {
            const ks = l.keepsakes;
            if (!Array.isArray(ks) || ks.length > exports.MAX_KEEPSAKES || !ks.every((k) => (0, plantLooks_1.isLookOfSlot)(k, 'keepsake')) || new Set(ks).size !== ks.length)
                return false;
        }
    }
    if (x.kept !== undefined && !(Array.isArray(x.kept) && x.kept.length <= exports.MAX_KEPT && x.kept.every(plantLooks_1.isKeepable)))
        return false;
    if (x.passedOn !== undefined && !isDate(x.passedOn))
        return false;
    return true;
}
const PLANT_SETTING_KEYS = ['showPlant', 'quietLook', 'promptHidden'];
function isValidPlantSettings(x) {
    if (!isObj(x) || !onlyKeys(x, PLANT_SETTING_KEYS))
        return false;
    return PLANT_SETTING_KEYS.every((k) => x[k] === undefined || typeof x[k] === 'boolean');
}
function isLookId(x) {
    return isLook(x);
}
function repairPlant(p) {
    const valid = isValidPlantState(p);
    if (valid)
        return p;
    let out = { ...p, name: cleanPlantName(typeof p.name === 'string' ? p.name : '') };
    out = clampToSupported(out, out.growth);
    if (out.pending !== undefined && out.pending <= 1)
        delete out.pending;
    if (out.look) {
        const look = {};
        for (const [k, slot] of LOOK_SLOTS)
            if ((0, plantLooks_1.isLookOfSlot)(out.look[k], slot))
                look[k] = out.look[k];
        if (out.look.keepsakes)
            look.keepsakes = [...new Set(out.look.keepsakes.filter((k) => (0, plantLooks_1.isLookOfSlot)(k, 'keepsake')))].slice(0, exports.MAX_KEEPSAKES);
        if ((0, plantForms_1.isFinalId)(out.look.final))
            look.final = out.look.final;
        out.look = look;
    }
    if (out.kept)
        out.kept = [...new Set(out.kept.filter(plantLooks_1.isKeepable))].slice(0, exports.MAX_KEPT);
    return out;
}
exports.ORGAN_MIN = 0.62;
exports.ORGAN_SPAN = 0.46;
exports.ORGAN_WEIGHT_PULL = 0.5;
function organFullness(mastery) {
    const m = typeof mastery === 'number' && Number.isFinite(mastery) ? Math.max(0, Math.min(1, mastery)) : 0;
    return exports.ORGAN_MIN + exports.ORGAN_SPAN * m;
}
exports.ORGAN_STEP_WORDS = { 0: 'not started yet', 1: 'budding', 2: 'growing', 3: 'full', 4: 'lush' };
function organStep(answered, mastery) {
    if (answered <= 0)
        return 0;
    const r = mastery / journey_1.DOMAIN_TARGET;
    return r < 1 / 3 ? 1 : r < 2 / 3 ? 2 : r < 1 ? 3 : 4;
}
function organs(weights, domains) {
    const mean = weights.reduce((s, w) => s + w, 0) / (weights.length || 1) || 1;
    return weights.map((w, i) => {
        var _a;
        const d = (_a = domains[i]) !== null && _a !== void 0 ? _a : { answered: 0, mastery: 0 };
        const weightScale = 1 + exports.ORGAN_WEIGHT_PULL * (w / mean - 1);
        const fullness = organFullness(d.mastery);
        return { weightScale, fullness, scale: weightScale * fullness, step: organStep(d.answered, d.mastery) };
    });
}
const organScales = (os) => os.map((o) => o.scale);
exports.organScales = organScales;
exports.PLANT_SLOTS = 5;
function slotOf(index, domainCount) {
    if (domainCount <= exports.PLANT_SLOTS)
        return index;
    return Math.round((index * (exports.PLANT_SLOTS - 1)) / (domainCount - 1));
}
function organSlots(weights, domains) {
    const n = weights.length;
    if (n === exports.PLANT_SLOTS)
        return organs(weights, domains);
    const w = Array.from({ length: exports.PLANT_SLOTS }, () => 0);
    const m = Array.from({ length: exports.PLANT_SLOTS }, () => 0);
    const a = Array.from({ length: exports.PLANT_SLOTS }, () => 0);
    const used = Array.from({ length: exports.PLANT_SLOTS }, () => false);
    weights.forEach((wt, i) => {
        var _a;
        const k = slotOf(i, n);
        const d = (_a = domains[i]) !== null && _a !== void 0 ? _a : { answered: 0, mastery: 0 };
        const ww = wt > 0 ? wt : 0;
        m[k] = w[k] + ww > 0 ? (m[k] * w[k] + (Number.isFinite(d.mastery) ? d.mastery : 0) * ww) / (w[k] + ww) : 0;
        w[k] += ww;
        a[k] += d.answered;
        used[k] = true;
    });
    const real = w.filter((x, k) => used[k] && x > 0);
    const mean = real.length ? real.reduce((s, x) => s + x, 0) / real.length : 1;
    const slotWeights = w.map((x, k) => (used[k] ? x : mean));
    const out = organs(slotWeights, slotWeights.map((_, k) => (used[k] ? { answered: a[k], mastery: m[k] } : { answered: 0, mastery: 0 })));
    return out;
}
function nextToGrow(weights, mastery) {
    let best = 0;
    let gap = -1;
    weights.forEach((w, i) => {
        var _a;
        const g = (1 - ((_a = mastery[i]) !== null && _a !== void 0 ? _a : 0)) * w;
        if (g > gap) {
            gap = g;
            best = i;
        }
    });
    return best;
}
exports.FLOWER_SCORE = 0.75;
exports.FLOWER_DAYS = 3;
exports.REST_AFTER_DAYS = 3;
exports.RETURN_DAYS = 7;
function dailySignals(i) {
    const flower = (() => {
        const big = i.mocks.filter((m) => m.total >= exports.CROWN_MOCK).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
        return big.some((m, k) => {
            const age = (0, streak_1.daysBetween)(m.day, i.today);
            if (age < 0 || age >= exports.FLOWER_DAYS)
                return false;
            const score = m.correct / m.total;
            const earlier = big.slice(0, k);
            return score >= exports.FLOWER_SCORE || (earlier.length > 0 && earlier.every((e) => score > e.correct / e.total));
        });
    })();
    const rooted = [10, 30, 60].filter((n) => i.earned[`rooted:${n}`] !== undefined).length;
    return {
        newGrowth: i.lastStudyDay === i.today,
        visitor: i.planCleared,
        firstFlower: flower,
        partMarks: i.domainIds.map((d) => i.earned[`firm-footing:${d}`] !== undefined),
        undergrowth: rooted,
        resting: isResting(i.lastStudyDay, i.today, i.plannedRest),
    };
}
function isResting(lastStudyDay, today, plannedRest = false) {
    if (plannedRest)
        return true;
    if (!lastStudyDay)
        return false;
    return (0, streak_1.daysBetween)(lastStudyDay, today) >= exports.REST_AFTER_DAYS;
}
exports.EXAM_REST_LINES = {
    eve: 'Rest day. Sleep and time off help memory settle.',
    day: "Good luck. You've done the work.",
};
function restLine(p, lastStudyDay, today, exam) {
    if (exam)
        return exports.EXAM_REST_LINES[exam];
    const who = plantCallName(p);
    if (lastStudyDay && (0, streak_1.daysBetween)(lastStudyDay, today) >= exports.RETURN_DAYS)
        return `${who} kept your place. Pick up where you left off.`;
    if (isResting(lastStudyDay, today))
        return `${who} is resting. Pick up whenever you're ready.`;
    return null;
}
function plantLabel(i) {
    const sp = exports.SPECIES_INFO[i.species].lower;
    const who = i.name ? `${shownName(i.name)}, your ${sp}` : `Your ${sp}`;
    const extra = [i.newGrowth ? 'New growth today.' : '', i.resting ? 'Resting.' : '', i.mood ? plantLooks_1.MOOD_WORDS[i.mood] : '', i.visitor ? `A ${i.visitor} is visiting.` : ''].filter(Boolean).join(' ');
    const growth = i.form ? `${i.form} form. Growth: ${exports.GROWTH_NAMES[i.growth]}.` : `Growth: ${exports.GROWTH_NAMES[i.growth]}, ${i.growth} of 6.`;
    return `${who}. ${growth}${extra ? ` ${extra}` : ''}`;
}
function backfillLine(p, growth, form) {
    return growth > 1
        ? `Your study so far grew ${p.name ? shownName(p.name) : `your ${exports.SPECIES_INFO[p.species].lower}`} to ${exports.GROWTH_NAMES[growth]}${form ? `: the ${form}` : ''}.`
        : `Planted. Your first ${exports.SPROUT_ANSWERS} answers give it its first sprout.`;
}
function formGrowthLine(species, growth) {
    return `Your ${exports.SPECIES_INFO[species].lower} · ${exports.GROWTH_NAMES[growth]}`;
}
function growthShort(growth) {
    return `${exports.GROWTH_NAMES[growth]} · growth ${growth} of ${exports.MAX_GROWTH}`;
}
function grewLabel(p, growth) {
    return `${plantCallName(p)} grew to ${exports.GROWTH_NAMES[growth]}.`;
}
function organLabel(index, domainName, mastery, step, next = false) {
    const pc = Math.round(Math.max(0, Math.min(1, mastery)) * 100);
    return `Domain ${index + 1}, ${domainName}, ${pc} percent, ${exports.ORGAN_STEP_WORDS[step]}.${next ? ' Next to grow.' : ''}`;
}
  };
  links["src/engine/plantForms.ts"] = {};
  defs["src/engine/plantForms.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECALL_FORM_IV = exports.RECALL_FORM_III = exports.RECALL_GAP_DAYS = exports.SEE_NEW_FORM = exports.theForm = exports.FLAVOUR_LOOKS = exports.FORMS = exports.SPECIES_KEY = exports.FLAVOURS = exports.FINAL_IDS = exports.FLAVOUR_IDS = exports.FORM_START = exports.FORM_OF_GROWTH = void 0;
exports.formOf = formOf;
exports.crossesForm = crossesForm;
exports.nextFormAt = nextFormAt;
exports.isFinalId = isFinalId;
exports.resolveFinal = resolveFinal;
exports.finalName = finalName;
exports.finalLook = finalLook;
exports.formName = formName;
exports.formLook = formLook;
exports.nextFormLine = nextFormLine;
exports.newFormLine = newFormLine;
exports.formsIntroLine = formsIntroLine;
exports.delayedRecalls = delayedRecalls;
exports.baselineForms = baselineForms;
exports.formMoment = formMoment;
exports.afterReveal = afterReveal;
exports.afterNote = afterNote;
exports.revealMode = revealMode;
exports.seeNewFormLabel = seeNewFormLabel;
exports.FORM_OF_GROWTH = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };
exports.FORM_START = { 1: 1, 2: 3, 3: 4, 4: 6 };
const GROWTH_WORD = { 1: 'Seed', 2: 'Sprout', 3: 'Shoot', 4: 'Bough', 5: 'Crown', 6: 'Elder' };
const clampGrowth = (g) => Math.max(1, Math.min(6, Math.round(Number.isFinite(g) ? g : 1)));
function formOf(growth) {
    return exports.FORM_OF_GROWTH[clampGrowth(growth)];
}
function crossesForm(from, to) {
    return formOf(to) > formOf(from);
}
function nextFormAt(growth) {
    const f = formOf(growth);
    if (f >= 4)
        return null;
    const next = (f + 1);
    return { form: next, at: exports.FORM_START[next] };
}
exports.FLAVOUR_IDS = ['lookout', 'moot', 'espalier', 'coppice', 'holdfast'];
exports.FINAL_IDS = ['own', ...exports.FLAVOUR_IDS];
function isFinalId(x) {
    return typeof x === 'string' && exports.FINAL_IDS.includes(x);
}
exports.FLAVOURS = {
    lookout: { name: 'Lookout', idea: 'A high, open crown with a clear view through it.' },
    moot: { name: 'Moot', idea: 'Level limbs make a roof over a ring of meeting stones.' },
    espalier: { name: 'Espalier', idea: 'Limbs trained along a frame, built to a plan.' },
    coppice: { name: 'Coppice', idea: 'Several stems rise from one base and keep growing back.' },
    holdfast: { name: 'Holdfast', idea: 'Roots grip a stone under a dense, closed crown.' },
};
function resolveFinal(growth, choice) {
    return clampGrowth(growth) >= 6 && isFinalId(choice) ? choice : 'own';
}
exports.SPECIES_KEY = {
    oak: 'Oak',
    maple: 'Maple',
    narra: 'Narra',
    'cherry-blossom': 'Cherry',
    pine: 'Pine',
    'coconut-palm': 'Palm',
    mango: 'Mango',
    bonsai: 'Bonsai',
    sunflower: 'Sunflower',
    lotus: 'Lotus',
    sampaguita: 'Sampaguita',
    cactus: 'Cactus',
    bamboo: 'Bamboo',
};
exports.FORMS = {
    oak: [
        ['Acorn-cup Oak', 'An acorn in its engraved cup; the first root shows in the soil.'],
        ['Whip Oak', 'One straight leader with lobed leaves at each node.'],
        ['Standard Oak', 'A clear stem and an upright oval crown; the first acorns.'],
        ['Broadcrown Oak', 'A short, massive trunk, low sinuous limbs and a broad, open dome hung with acorns.'],
    ],
    maple: [
        ['Samara Maple', 'The paired winged seed on the soil; two strap seed-leaves and a first five-point leaf.'],
        ['Forked Maple', 'Leaves in opposite pairs up a slim stem that forks in two.'],
        ['Flame Maple', 'A tall, pointed crown shaped like a candle flame.'],
        ['Vaulted Maple', 'A tall, open vase of limbs under a broad vault; winged seeds hang from its eaves.'],
    ],
    narra: [
        ['Coin Narra', 'The round winged pod, half settled; a first shoot and root.'],
        ['Featherleaf Narra', 'One arching wand of feathered leaves; the husk stays by it.'],
        ['Parasol Narra', 'A flat, spreading parasol on a clean stem; the first golden sprays.'],
        ['Gold-rain Narra', 'Plank buttresses, a vast weeping umbrella, golden showers and hanging coins.'],
    ],
    'cherry-blossom': [
        ['Cherry Stone', 'The round stone with its seam; two first serrated leaves.'],
        ['Banded Cherry', 'A slim stem with the cherry’s banded bark and its first pink buds.'],
        ['Spreading Cherry', 'Wide, low clouds of bud and blossom on spreading limbs.'],
        ['Cascade Cherry', 'Limbs rise, then fall in long curtains of blossom; petals drift.'],
    ],
    pine: [
        ['Starburst Pine', 'The winged seed, and a starburst of seed-needles.'],
        ['Candle Pine', 'One leader in whorls of needles, a pale new candle at its tip.'],
        ['Spire Pine', 'A tiered cone of whorls, narrowing to a point.'],
        ['Highcloud Pine', 'A tall, leaning bole carrying level cloud pads high up; cones below.'],
    ],
    'coconut-palm': [
        ['Husk Palm', 'The husked nut lying on the soil, a shoot rising from its eye.'],
        ['Strapleaf Palm', 'Whole, pleated young leaves fanning from the nut.'],
        ['Ringed Palm', 'A short ringed trunk, five arching fronds and the first green nuts.'],
        ['Shoreline Palm', 'A tall curving trunk, a full crown of fronds, ripe nuts, and a nut sprouting at its foot.'],
    ],
    mango: [
        ['Kernel Mango', 'The flat, fibred stone and a first flush of leaves.'],
        ['Whorl Mango', 'Leaves gather in whorls; the new flush hangs bronze at the tip.'],
        ['Tassel Mango', 'A rounded crown with flower tassels standing up like candles.'],
        ['Laden Mango', 'A vast, low, dark dome with fruit hanging on long stalks.'],
    ],
    bonsai: [
        ['First-bend Bonsai', 'A seedling in its tray, taking its first bend.'],
        ['Upright Bonsai', 'A straight, tapering trunk and three pads in a triangle.'],
        ['Winding Bonsai', 'An S-curved trunk carrying five cloud pads.'],
        ['Windswept Bonsai', 'The trunk leans with the wind and every pad streams one way; small white flowers.'],
    ],
    sunflower: [
        ['Seed-cap Sunflower', 'Two round seed-leaves, one still wearing the striped seed as a cap.'],
        ['Heart-leaf Sunflower', 'Paired heart-shaped leaves and a tight green bud.'],
        ['Morning Sunflower', 'A tall stem, the head open and turned to one side.'],
        ['Spiral Sunflower', 'A great head facing you, its seeds set in spirals; a second bud below.'],
    ],
    lotus: [
        ['First-pad Lotus', 'One floating pad and a rolled leaf rising from the water.'],
        ['Raised-pad Lotus', 'Pads lift on stalks above the water; a new leaf unrolls.'],
        ['Tall-bud Lotus', 'Five pads and one tall, pointed bud.'],
        ['Open Lotus', 'The flower fully open around its seed cup, a bud and a seed head beside it.'],
    ],
    sampaguita: [
        ['Cutting Sampaguita', 'A cutting set in the soil, rooting from its node.'],
        ['Twining Sampaguita', 'Two arching stems with paired leaves and the first star-buds.'],
        ['Star-mound Sampaguita', 'A dark green mound dotted with white star flowers.'],
        ['Garland Sampaguita', 'A full shrub in flower, with a strung garland of its own stars.'],
    ],
    cactus: [
        ['Pebble Cactus', 'A small spined globe in its pot.'],
        ['Column Cactus', 'One ribbed column lined with spines.'],
        ['Cross-arm Cactus', 'Four short arms and a first bud on top.'],
        ['Crown-bloom Cactus', 'A tall column, arms raised high, crowned with flowers.'],
    ],
    bamboo: [
        ['Sheath Bamboo', 'The shoot in its overlapping sheaths; the rhizome below.'],
        ['First-culm Bamboo', 'One jointed culm with leaf fans; the next shoot beside it.'],
        ['Vase Bamboo', 'Five culms rise in a vase, sprays leaning outward.'],
        ['Moon-gate Bamboo', 'The culms arch together into a round gate.'],
    ],
};
exports.FLAVOUR_LOOKS = {
    oak: {
        lookout: 'A tall clear bole; the oak’s crown parts into a ring around an open window.',
        moot: 'Long level limbs roof a ring of five stones; the crown sits in tiers.',
        espalier: 'Three tiers of oak limbs trained level along wires between two posts.',
        coppice: 'Three oak stems rise from one broad stool; new shoots at the foot.',
        holdfast: 'Oak roots grip a boulder under a dense, closed dome.',
    },
    maple: {
        lookout: 'A tall maple with its crown opened into a ring, winged seeds hanging.',
        moot: 'Maple limbs held level in calm tiers over five meeting stones.',
        espalier: 'Maple cordons trained flat along a frame, seeds along the wires.',
        coppice: 'Three slim maple stems from one stool, each with its own small crown.',
        holdfast: 'A short, thick maple gripping a stone, its crown closed and dense.',
    },
    narra: {
        lookout: 'A raised narra parasol, parted around a sightline, gold sprays on top.',
        moot: 'The narra’s parasol spread into level tiers above five stones.',
        espalier: 'Narra limbs trained level along wires, golden sprays along each tier.',
        coppice: 'Three narra stems from one stool, each with a small gold-flecked crown.',
        holdfast: 'Narra roots clasp a boulder beneath a dense, closed crown.',
    },
    'cherry-blossom': {
        lookout: 'A tall banded cherry, its blossom parted into a ring around an open window.',
        moot: 'Level blossom tiers on long banded limbs over five meeting stones.',
        espalier: 'Cherry limbs trained flat on a frame, blossom along every tier.',
        coppice: 'Three cherry stems from one stool, each in its own cloud of blossom.',
        holdfast: 'A thick banded trunk on a boulder under a dense dome of blossom.',
    },
    pine: {
        lookout: 'A tall bare bole with level pads only near the top, around a sightline.',
        moot: 'Broad, level pads in calm tiers, like a roof, over five meeting stones.',
        espalier: 'A pole rises above the crown and ropes fan down to hold the level limbs.',
        coppice: 'Three pine stems from one stool, each carrying its own pads.',
        holdfast: 'A pine on a rock, its roots clasping the stone; dense pads above.',
    },
    'coconut-palm': {
        lookout: 'The tallest, straightest trunk, its crown high above everything.',
        moot: 'Fronds held level like a flat roof over five meeting stones.',
        espalier: 'A young palm braced by a timber tripod, its fronds trained into an even fan.',
        coppice: 'A mother palm with two young palms rising from the same base.',
        holdfast: 'A short, stout trunk on a rock, roots gripping, a dense crown of fronds.',
    },
    mango: {
        lookout: 'A tall mango, its dark crown parted around a sightline, fruit hanging.',
        moot: 'The mango’s dome spread into level tiers over five meeting stones.',
        espalier: 'Mango limbs trained level along a frame, fruit hanging along the wires.',
        coppice: 'Three mango stems from one stool, each with its own small dome.',
        holdfast: 'A thick mango gripping a boulder under a closed, dark dome.',
    },
    bonsai: {
        lookout: 'A tall, slender trunk with a few small pads high up: the scholar’s style.',
        moot: 'A thick, short trunk with broad pads in level tiers; pebbles on the soil.',
        espalier: 'Branches wired into a flat fan, the wire coiled along each one.',
        coppice: 'Three trunks rising together from one root.',
        holdfast: 'Roots grip over a stone set in the tray; a dense crown above.',
    },
    sunflower: {
        lookout: 'An extra-tall stem, the head high and turned outward; leaves stay low.',
        moot: 'Leaves held level in tiers, the head turned up to the sky, five stones below.',
        espalier: 'Tied to a cane at three points, leaves trained flat to each side.',
        coppice: 'One stem branches into three heads from a single base.',
        holdfast: 'A short, stout stem on a stone, the head bowed, leaves overlapping like a shield.',
    },
    lotus: {
        lookout: 'One flower lifted far above the pads on a tall stalk.',
        moot: 'Pads held level in a ring around the open flower; stepping stones in the water.',
        espalier: 'A reed frame in the bowl; the stem tied to its rails, pads in a neat row.',
        coppice: 'Three flowers rise from one root: a bud, a half-open cup and a full bloom.',
        holdfast: 'A stone in the bowl gripped by the root; raised pads close round a cupped bloom.',
    },
    sampaguita: {
        lookout: 'Trained as a little tree: a clear stem and a round, starred head.',
        moot: 'Clipped into two level tiers, stars along the edges, over five stones.',
        espalier: 'Stems tied along a fan trellis, a star flower at each tip.',
        coppice: 'Cut back to a low stool; many slim stems spring up again.',
        holdfast: 'A dense clipped dome over a stone its roots hold fast.',
    },
    cactus: {
        lookout: 'The tallest column, tiny arms low down, a single flower at the top.',
        moot: 'Arms held level in two tiers, like a table; pebbles in the pot.',
        espalier: 'Arms trained round a wire hoop on a stake, a flower on each.',
        coppice: 'A clustering cactus: young offsets ring the mother column.',
        holdfast: 'A broad barrel wedged against a stone, dense with spines.',
    },
    bamboo: {
        lookout: 'One culm rises far above the rest of the stand.',
        moot: 'Straight culms with leaves clipped into level shelves, five stones at the foot.',
        espalier: 'Culms tied in a straight row to two rails: a living screen.',
        coppice: 'A dense clump of short culms, new shoots coming up all round.',
        holdfast: 'The rhizome grips a stone; culms stand close as a palisade.',
    },
};
function finalName(species, final) {
    return final === 'own' ? exports.FORMS[species][3][0] : `${exports.FLAVOURS[final].name} ${exports.SPECIES_KEY[species]}`;
}
function finalLook(species, final) {
    return final === 'own' ? exports.FORMS[species][3][1] : exports.FLAVOUR_LOOKS[species][final];
}
function formName(species, growth, final = 'own') {
    const f = formOf(growth);
    return f === 4 ? finalName(species, resolveFinal(growth, final)) : exports.FORMS[species][f - 1][0];
}
function formLook(species, growth, final = 'own') {
    const f = formOf(growth);
    return f === 4 ? finalLook(species, resolveFinal(growth, final)) : exports.FORMS[species][f - 1][1];
}
const theForm = (name) => `the ${name}`;
exports.theForm = theForm;
function nextFormLine(species, growth) {
    const n = nextFormAt(growth);
    if (!n)
        return null;
    return `Grows into ${(0, exports.theForm)(formName(species, n.at))} at ${GROWTH_WORD[n.at]}.`;
}
exports.SEE_NEW_FORM = 'It grows into a new form: see it in Your plant.';
function newFormLine(callName, name) {
    return `${callName} grows into a new form: ${(0, exports.theForm)(name)}.`;
}
function formsIntroLine(callName, name) {
    return `Your study so far brought ${callName} to ${(0, exports.theForm)(name)}.`;
}
exports.RECALL_GAP_DAYS = 7;
exports.RECALL_FORM_III = 15;
exports.RECALL_FORM_IV = 30;
function delayedRecalls(longIds) {
    return new Set(longIds !== null && longIds !== void 0 ? longIds : []).size;
}
function baselineForms(growth) {
    const f = formOf(growth);
    return f > 1 ? { seen: f, note: f } : { seen: f };
}
function formMoment(growth, rec) {
    if (!rec)
        return null;
    const f = formOf(growth);
    if (f > rec.seen)
        return { kind: 'reveal', from: rec.seen, to: f };
    if (rec.note !== undefined && rec.note === f)
        return { kind: 'note', form: f };
    return null;
}
function afterReveal(rec, growth) {
    var _a;
    const f = formOf(growth);
    return { seen: Math.max((_a = rec === null || rec === void 0 ? void 0 : rec.seen) !== null && _a !== void 0 ? _a : 1, f) };
}
function afterNote(rec) {
    return { seen: rec.seen };
}
function revealMode(reduced, claim) {
    if (reduced)
        return 'reduced';
    return claim() ? 'full' : 'wait';
}
function seeNewFormLabel(callName) {
    const who = callName.startsWith('Your ') ? `your ${callName.slice(5)}` : callName;
    return `See ${who}’s new form`;
}
  };
  links["src/engine/plantLooks.ts"] = {"./milestones":"src/engine/milestones.ts"};
  defs["src/engine/plantLooks.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOOD_WORDS = exports.DEFAULT_LOOK = exports.MAX_SHOWN_KEEPSAKES = exports.KEEPSAKE_ITEMS = exports.VISITORS = exports.GROUNDS = exports.STYLES = exports.LOOK_ITEMS = exports.NATIVE_POT = exports.THIRD_COLOURWAY_AT = exports.NEW_PLANT_STYLE = exports.styleHasFace = void 0;
exports.resolveStyle = resolveStyle;
exports.lookItem = lookItem;
exports.isCatalogLook = isCatalogLook;
exports.isLookOfSlot = isLookOfSlot;
exports.colourwaysFor = colourwaysFor;
exports.plantersFor = plantersFor;
exports.keepsakeForBadge = keepsakeForBadge;
exports.isKeepable = isKeepable;
exports.isUnlocked = isUnlocked;
exports.unlockedLooks = unlockedLooks;
exports.keepOnReset = keepOnReset;
exports.defaultKeepsakes = defaultKeepsakes;
exports.howToOpen = howToOpen;
exports.resolveLook = resolveLook;
exports.defaultPalette = defaultPalette;
exports.onYourPlantLine = onYourPlantLine;
exports.skillLine = skillLine;
exports.toggleKeepsake = toggleKeepsake;
exports.plantMood = plantMood;
const milestones_1 = require("./milestones");
const SPECIES = [
    'oak',
    'maple',
    'narra',
    'cherry-blossom',
    'pine',
    'coconut-palm',
    'mango',
    'bonsai',
    'sunflower',
    'lotus',
    'sampaguita',
    'cactus',
    'bamboo',
];
const GROWTH_WORD = { 1: 'Seed', 2: 'Sprout', 3: 'Shoot', 4: 'Bough', 5: 'Crown', 6: 'Elder' };
const styleItems = [
    { id: 'botanical', slot: 'style', name: 'Botanical', caption: 'A fine line drawing, like a field guide.', unlock: { kind: 'free' } },
    { id: 'storybook', slot: 'style', name: 'Storybook', caption: 'Rounded and colourful.', unlock: { kind: 'free' } },
    { id: 'storybook-face', slot: 'style', name: 'Storybook with a face', caption: 'A friendly face that shows its mood.', unlock: { kind: 'free' } },
];
function resolveStyle(look, settings) {
    if ((look === null || look === void 0 ? void 0 : look.style) !== undefined && isLookOfSlot(look.style, 'style'))
        return look.style;
    return (settings === null || settings === void 0 ? void 0 : settings.quietLook) === true ? 'storybook' : 'storybook-face';
}
const styleHasFace = (s) => s === 'storybook-face';
exports.styleHasFace = styleHasFace;
exports.NEW_PLANT_STYLE = 'botanical';
const COLOURWAYS = {
    oak: [['summer', 'Summer green', 'grove'], ['spring', 'Spring green', 'spring'], ['autumn', 'Autumn gold', 'gold']],
    maple: [['autumn', 'Autumn red', 'ember'], ['gold', 'Gold', 'gold'], ['summer', 'Summer green', 'grove']],
    narra: [['fresh', 'Fresh green', 'spring'], ['deep', 'Deep green', 'grove'], ['silver', 'Silver leaf', 'silver']],
    'cherry-blossom': [['pink', 'Pink', 'blossom'], ['white', 'White', 'snow'], ['dusk', 'Dusk violet', 'twilight']],
    pine: [['evergreen', 'Evergreen', 'evergreen'], ['fresh', 'Fresh green', 'grove'], ['frost', 'Frost', 'silver']],
    'coconut-palm': [['tropic', 'Tropic green', 'spring'], ['deep', 'Deep green', 'grove'], ['sun', 'Golden', 'golden']],
    mango: [['deep', 'Deep green', 'evergreen'], ['leafy', 'Leafy green', 'grove'], ['new', 'New leaf', 'spring']],
    bonsai: [['green', 'Green', 'grove'], ['juniper', 'Juniper', 'evergreen'], ['autumn', 'Autumn', 'ember']],
    sunflower: [['gold', 'Gold', 'gold'], ['lemon', 'Lemon', 'lemon'], ['velvet', 'Velvet red', 'rosewood']],
    lotus: [['pink', 'Pink', 'blossom'], ['white', 'White', 'snow'], ['violet', 'Violet', 'twilight']],
    sampaguita: [['white', 'White', 'pearl'], ['blush', 'Blush', 'blossom'], ['lilac', 'Lilac', 'twilight']],
    cactus: [['pink', 'Pink bloom', 'blossom'], ['yellow', 'Yellow bloom', 'gold'], ['red', 'Red bloom', 'rosewood']],
    bamboo: [['green', 'Green', 'grove'], ['lime', 'Lime', 'spring'], ['silver', 'Silver', 'silver']],
};
exports.THIRD_COLOURWAY_AT = 4;
const colourwayItems = SPECIES.flatMap((sp) => COLOURWAYS[sp].map(([key, name, palette], i) => ({
    id: `${sp}-${key}`,
    slot: 'colourway',
    name,
    caption: i === 0 ? 'Its own colours.' : i === 1 ? 'Another colourway for it.' : 'A third colourway.',
    unlock: i < 2 ? { kind: 'free' } : { kind: 'growth', growth: exports.THIRD_COLOURWAY_AT },
    species: sp,
    palette,
})));
const groundItems = [
    { id: 'meadow', slot: 'ground', name: 'Meadow', caption: 'Soft grass and a daisy.', unlock: { kind: 'free' } },
    { id: 'stone-ring', slot: 'ground', name: 'Stone ring', caption: 'River stones around the base.', unlock: { kind: 'growth', growth: 5 } },
    { id: 'trail-blaze', slot: 'ground', name: 'Trail blaze', caption: 'A painted waymark that points north.', unlock: { kind: 'growth', growth: 6 } },
];
const SET_NAMES = {
    groundwork: 'Groundwork',
    domains: 'Domains',
    evergreen: 'Evergreen',
    judgement: 'Sound Judgement',
    examDay: 'Exam Day',
    rooted: 'Rooted',
};
const planterItems = [
    { id: 'native', slot: 'planter', name: 'Its usual home', caption: 'Where this plant grows best.', unlock: { kind: 'free' } },
    { id: 'terracotta', slot: 'planter', name: 'Terracotta pot', caption: 'A plain clay pot.', unlock: { kind: 'free' } },
    { id: 'fieldstone', slot: 'planter', name: 'Fieldstone planter', caption: 'From completing Groundwork.', unlock: { kind: 'set', set: 'groundwork' } },
    { id: 'five-stone', slot: 'planter', name: 'Five-stone planter', caption: 'From completing the Domains set.', unlock: { kind: 'set', set: 'domains' } },
    { id: 'celadon', slot: 'planter', name: 'Celadon pot', caption: 'From completing Evergreen.', unlock: { kind: 'set', set: 'evergreen' } },
    { id: 'compass-rose', slot: 'planter', name: 'Compass-rose planter', caption: 'From completing Sound Judgement.', unlock: { kind: 'set', set: 'judgement' } },
    { id: 'banded', slot: 'planter', name: 'Banded planter', caption: 'From completing Exam Day.', unlock: { kind: 'set', set: 'examDay' } },
    { id: 'root-woven', slot: 'planter', name: 'Root-woven basket', caption: 'From completing Rooted.', unlock: { kind: 'set', set: 'rooted' } },
];
exports.NATIVE_POT = { cactus: 'terracotta', bonsai: 'tray', lotus: 'bowl' };
const visitorItems = [
    { id: 'wren', slot: 'visitor', name: 'Wren', caption: 'A small brown wren.', unlock: { kind: 'free' } },
    { id: 'robin', slot: 'visitor', name: 'Robin', caption: 'A robin with a warm red breast.', unlock: { kind: 'growth', growth: 3 } },
    { id: 'no-visitor', slot: 'visitor', name: 'No visitor', caption: 'The plant on its own.', unlock: { kind: 'free' } },
];
const KEEPSAKES = [
    ['stepping-stone', 'Stepping stone', 'first-foothold', 'The stepping stone: you answered your first 20 questions.', 'flat', 'Answer your first 20 questions'],
    ['trail-post', 'Trail post', 'topic-clear', 'The trail post: you cleared your first topic.', 'tall', 'Clear your first topic'],
    ['trail-board', 'Trail board', 'ten-topics', 'The trail board: you cleared ten topics.', 'tall', 'Clear ten topics'],
    ['compass-stone', 'Compass stone', 'whole-map', `The compass stone: every domain reached ${Math.round(milestones_1.WHOLE_MAP_FLOOR * 100)}% or more.`, 'flat', `Bring every domain to ${Math.round(milestones_1.WHOLE_MAP_FLOOR * 100)}%`],
    ['jay', 'Jay', 'long-memory', 'The jay: you recall answers a week later.', 'tall', 'Recall answers a week after you saw them'],
    ['empty-nest', 'Empty nest', 'graduate', 'The empty nest: questions you’ve learned have flown the nest.', 'flat', 'Clear questions out of review'],
    ['woven-ring', 'Woven ring', 'loop-closed', 'The woven ring: you fixed your mistakes for good.', 'flat', 'Fix your mistakes on a later day'],
    ['fern', 'Fern', 'took-root', 'The fern: a whole topic took root.', 'tall', 'Help a whole topic take root'],
    ['still-pond', 'Still pond', 'know-what-you-know', 'The still pond: when you say sure, you’re right.', 'flat', 'Be right when you say you’re sure'],
    ['dew-web', 'Dew-lit web', 'slip-spotter', 'The dew-lit web: you can name your own thinking slips.', 'tall', 'Tag your mistakes with their thinking slip'],
    ['weather-vane', 'Weather vane', 'mindset-shift', 'The weather vane: you fall for the closest wrong choice less often.', 'tall', 'Pick the closest wrong choice less often'],
    ['lantern', 'Lantern', 'dress-rehearsal', 'The lantern: you sat a full, timed mock.', 'tall', 'Sit a full, timed mock'],
    ['sundial', 'Sundial', 'on-pace', 'The sundial: you finished a timed mock on pace.', 'tall', 'Finish a timed mock on pace'],
    ['swallow', 'Swallow', 'fresh-start', 'The swallow: you came back and picked up again.', 'tall', 'Pick up again after some time away'],
    ['fox', 'Fox', 'snare-wise', 'The fox: you spot the snare in a trap question.', 'tall', 'Spot the snare in trap questions'],
    ['cairn', 'Cairn', 'even-keel', 'The cairn: your confidence matches your results, round after round.', 'tall', 'Keep your confidence matched to your results'],
    ['signpost', 'Signpost', 'signpost-reader', 'The signpost: you read the deciding word.', 'tall', 'Read the deciding word in a question'],
    ['clear-dawn', 'Clear dawn', 'myth-clearer', 'The clear dawn: half-truths don’t fool you.', 'tall', 'Clear half-truths in a practice game', 'back'],
    ['roe-deer', 'Roe deer', 'sure-footed-pace', 'The roe deer: speed without guessing.', 'tall', 'Answer at pace without guessing'],
    ['mushroom-ring', 'Mushroom ring', 'whole-grove', 'The mushroom ring: you’ve tried every kind of practice game.', 'flat', 'Play every practice game once'],
    ['pebble-path', 'Pebble path', 'back-on-path', 'The pebble path: you fixed game misses on a later day.', 'flat', 'Fix game misses on a later day'],
];
const keepsakeItems = [
    ...KEEPSAKES.map(([id, name, badge, caption, shape, how, place]) => ({ id, slot: 'keepsake', name, caption, unlock: { kind: 'badge', badge }, place: place !== null && place !== void 0 ? place : 'ground', shape, how })),
    { id: 'ribbon', slot: 'keepsake', name: 'Ribbon', caption: 'The ribbon: you told us you passed.', unlock: { kind: 'passed' }, place: 'ground', shape: 'tall', how: 'Tell us you passed' },
];
exports.LOOK_ITEMS = [...styleItems, ...colourwayItems, ...groundItems, ...planterItems, ...visitorItems, ...keepsakeItems];
const BY_ID = new Map(exports.LOOK_ITEMS.map((x) => [x.id, x]));
function lookItem(id) {
    return id === undefined ? undefined : BY_ID.get(id);
}
function isCatalogLook(x) {
    return typeof x === 'string' && BY_ID.has(x);
}
function isLookOfSlot(x, slot) {
    var _a;
    return typeof x === 'string' && ((_a = BY_ID.get(x)) === null || _a === void 0 ? void 0 : _a.slot) === slot;
}
function colourwaysFor(species) {
    return colourwayItems.filter((x) => x.species === species);
}
function plantersFor(species) {
    return planterItems.filter((x) => !(x.id === 'terracotta' && exports.NATIVE_POT[species] === 'terracotta'));
}
exports.STYLES = styleItems;
exports.GROUNDS = groundItems;
exports.VISITORS = visitorItems;
exports.KEEPSAKE_ITEMS = keepsakeItems;
exports.MAX_SHOWN_KEEPSAKES = 3;
function keepsakeForBadge(badge) {
    return keepsakeItems.find((k) => k.unlock.kind === 'badge' && k.unlock.badge === badge);
}
function badgeEarned(badge, certs) {
    return certs.some((c) => { var _a; return Object.keys((_a = c.earned) !== null && _a !== void 0 ? _a : {}).some((k) => k === badge || k.startsWith(`${badge}:`)); });
}
function isKeepable(id) {
    const item = typeof id === 'string' ? BY_ID.get(id) : undefined;
    return !!item && (item.unlock.kind === 'growth' || item.unlock.kind === 'badge' || item.unlock.kind === 'set');
}
function isUnlocked(item, plant, certs) {
    var _a;
    const u = item.unlock;
    if (u.kind === 'passed')
        return plant.passedOn !== undefined;
    if ((_a = plant.kept) === null || _a === void 0 ? void 0 : _a.includes(item.id))
        return true;
    switch (u.kind) {
        case 'free':
            return true;
        case 'growth':
            return plant.growth >= u.growth;
        case 'badge':
            return badgeEarned(u.badge, certs);
        case 'set':
            return certs.some((c) => { var _a; return ((_a = c.planters) === null || _a === void 0 ? void 0 : _a[u.set]) !== undefined; });
    }
}
function unlockedLooks(plant, certs) {
    return exports.LOOK_ITEMS.filter((x) => isUnlocked(x, plant, certs)).map((x) => x.id);
}
function keepOnReset(plant, certs) {
    return exports.LOOK_ITEMS.filter((x) => isKeepable(x.id) && isUnlocked(x, plant, certs)).map((x) => x.id);
}
function keepsakeSince(item, plant, certs) {
    var _a, _b;
    const u = item.unlock;
    if (u.kind === 'passed')
        return plant.passedOn ? Date.parse(plant.passedOn) || 0 : Infinity;
    let at = Infinity;
    if (u.kind === 'badge')
        for (const c of certs)
            for (const [k, t] of Object.entries((_a = c.earned) !== null && _a !== void 0 ? _a : {}))
                if ((k === u.badge || k.startsWith(`${u.badge}:`)) && typeof t === 'number' && t < at)
                    at = t;
    if (at === Infinity && ((_b = plant.kept) === null || _b === void 0 ? void 0 : _b.includes(item.id)))
        return -Infinity;
    return at;
}
function defaultKeepsakes(plant, certs) {
    return keepsakeItems
        .filter((k) => isUnlocked(k, plant, certs))
        .map((k, i) => ({ id: k.id, at: keepsakeSince(k, plant, certs), i }))
        .sort((a, b) => a.at - b.at || a.i - b.i)
        .slice(0, exports.MAX_SHOWN_KEEPSAKES)
        .map((x) => x.id);
}
function howToOpen(item, o = {}) {
    var _a, _b, _c, _d;
    const u = item.unlock;
    switch (u.kind) {
        case 'free':
            return '';
        case 'growth':
            return `Opens when your plant reaches ${GROWTH_WORD[u.growth]}.`;
        case 'badge': {
            const name = (_b = (_a = milestones_1.BADGES.find((b) => b.id === u.badge)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : u.badge;
            const how = (_c = item.how) !== null && _c !== void 0 ? _c : 'Earn its badge';
            return o.badgesHidden ? `${how}.` : `${how} (the ${name} badge).`;
        }
        case 'set':
            return o.badgesHidden ? 'Opens as you study.' : `Opens when you finish the ${(_d = SET_NAMES[u.set]) !== null && _d !== void 0 ? _d : u.set} set in the Herbarium.`;
        case 'passed':
            return 'Opens when you tell us you passed.';
    }
}
exports.DEFAULT_LOOK = { ground: 'meadow', planter: 'native', visitor: 'wren' };
function resolveLook(species, look, unlocked, defaultKeeps = [], style = resolveStyle(look, undefined)) {
    var _a;
    const open = unlocked instanceof Set ? unlocked : new Set(unlocked);
    const ok = (id, slot) => id !== undefined && isLookOfSlot(id, slot) && open.has(id);
    const ways = colourwaysFor(species);
    const cw = (look === null || look === void 0 ? void 0 : look.colourway) !== undefined && ok(look.colourway, 'colourway') && lookItem(look.colourway).species === species ? lookItem(look.colourway) : ways[0];
    const planter = ok(look === null || look === void 0 ? void 0 : look.planter, 'planter') && plantersFor(species).some((x) => x.id === look.planter) ? look.planter : exports.DEFAULT_LOOK.planter;
    const botanical = style === 'botanical';
    return {
        style,
        colourway: cw.id,
        palette: cw.palette,
        ground: ok(look === null || look === void 0 ? void 0 : look.ground, 'ground') ? look.ground : exports.DEFAULT_LOOK.ground,
        planter,
        visitor: ok(look === null || look === void 0 ? void 0 : look.visitor, 'visitor') ? look.visitor : botanical ? 'no-visitor' : exports.DEFAULT_LOOK.visitor,
        keepsakes: [...new Set((_a = look === null || look === void 0 ? void 0 : look.keepsakes) !== null && _a !== void 0 ? _a : (botanical ? [] : defaultKeeps))].filter((k) => ok(k, 'keepsake')).slice(0, exports.MAX_SHOWN_KEEPSAKES),
    };
}
function defaultPalette(species) {
    return colourwaysFor(species)[0].palette;
}
function onYourPlantLine(badge, shown) {
    const k = keepsakeForBadge(badge);
    if (!k)
        return null;
    const the = `the ${k.name.charAt(0).toLowerCase()}${k.name.slice(1)}`;
    return shown.includes(k.id) ? `On your plant: ${the}.` : `A keepsake for your plant: ${the}. Show it from Your plant, Change its look.`;
}
function skillLine(item) {
    const i = item.caption.indexOf(': ');
    const rest = i >= 0 ? item.caption.slice(i + 2) : item.caption;
    return rest.charAt(0).toUpperCase() + rest.slice(1);
}
function toggleKeepsake(current, id) {
    const list = [...new Set(current !== null && current !== void 0 ? current : [])];
    if (list.includes(id))
        return list.filter((x) => x !== id);
    if (list.length >= exports.MAX_SHOWN_KEEPSAKES)
        return list;
    return [...list, id];
}
function plantMood(i) {
    if (!i.face)
        return 'idle';
    if (i.resting)
        return 'resting';
    if (i.grewToday || i.newKeepsakeToday)
        return 'proud';
    if (i.planCleared)
        return 'happy';
    if (i.newTopicToday)
        return 'curious';
    return 'idle';
}
exports.MOOD_WORDS = { idle: '', happy: 'Looking happy.', curious: 'Looking curious.', proud: 'Looking proud.', resting: '' };
  };
  links["src/engine/questionNotes.ts"] = {};
  defs["src/engine/questionNotes.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTE_ID_RE = exports.TOMBSTONE_KEEP_DAYS = exports.NOTES_FULL_LINE = exports.NOTES_TOTAL_MAX = exports.QNOTE_MAX = void 0;
exports.capNoteText = capNoteText;
exports.isLiveNote = isLiveNote;
exports.noteTextOf = noteTextOf;
exports.totalNoteChars = totalNoteChars;
exports.noteFits = noteFits;
exports.pruneTombstones = pruneTombstones;
exports.withNote = withNote;
exports.mergeNote = mergeNote;
exports.mergeNotes = mergeNotes;
exports.liveNotes = liveNotes;
exports.noteSnippet = noteSnippet;
exports.QNOTE_MAX = 1000;
exports.NOTES_TOTAL_MAX = 300000;
exports.NOTES_FULL_LINE = 'Your notes are full, so this change isn’t saved. Delete or shorten an older note to make room.';
exports.TOMBSTONE_KEEP_DAYS = 90;
exports.NOTE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
function capNoteText(text, max = exports.QNOTE_MAX) {
    if (text.length <= max)
        return text;
    const code = text.charCodeAt(max - 1);
    const splitsPair = code >= 0xd800 && code <= 0xdbff;
    return text.slice(0, splitsPair ? max - 1 : max);
}
function isLiveNote(n) {
    return Boolean(n && n.text.trim() !== '');
}
function noteTextOf(notes, id) {
    const n = notes === null || notes === void 0 ? void 0 : notes[id];
    return isLiveNote(n) ? n.text : '';
}
function totalNoteChars(notes) {
    let n = 0;
    for (const v of Object.values(notes !== null && notes !== void 0 ? notes : {}))
        n += v.text.length;
    return n;
}
function noteFits(notes, id, text) {
    var _a, _b;
    const next = capNoteText(text).length;
    const now = (_b = (_a = notes === null || notes === void 0 ? void 0 : notes[id]) === null || _a === void 0 ? void 0 : _a.text.length) !== null && _b !== void 0 ? _b : 0;
    if (next <= now)
        return true;
    return totalNoteChars(notes) - now + next <= exports.NOTES_TOTAL_MAX;
}
function pruneTombstones(notes, now, keepDays = exports.TOMBSTONE_KEEP_DAYS) {
    if (!notes)
        return notes;
    const cutoff = now - keepDays * 86400000;
    const old = Object.entries(notes).filter(([, n]) => n.text === '' && n.ts < cutoff);
    if (old.length === 0)
        return notes;
    const out = { ...notes };
    for (const [id] of old)
        delete out[id];
    return out;
}
function withNote(notes, id, text, now) {
    if (!exports.NOTE_ID_RE.test(id))
        return notes;
    const capped = capNoteText(text);
    const prev = notes === null || notes === void 0 ? void 0 : notes[id];
    if (capped.trim() === '') {
        if (!isLiveNote(prev))
            return notes;
        return { ...notes, [id]: { text: '', ts: now } };
    }
    if (prev && prev.text === capped)
        return notes;
    if (!noteFits(notes, id, capped))
        return notes;
    return { ...notes, [id]: { text: capped, ts: now } };
}
function mergeNote(a, b) {
    if (a.ts !== b.ts)
        return a.ts > b.ts ? a : b;
    return a.text >= b.text ? a : b;
}
function mergeNotes(a, b) {
    if (!a && !b)
        return undefined;
    const out = {};
    const ids = [...new Set([...Object.keys(a !== null && a !== void 0 ? a : {}), ...Object.keys(b !== null && b !== void 0 ? b : {})])].sort();
    for (const id of ids) {
        const x = a === null || a === void 0 ? void 0 : a[id];
        const y = b === null || b === void 0 ? void 0 : b[id];
        out[id] = x && y ? mergeNote(x, y) : (x !== null && x !== void 0 ? x : y);
    }
    return out;
}
function liveNotes(notes) {
    return Object.entries(notes !== null && notes !== void 0 ? notes : {})
        .filter(([, n]) => isLiveNote(n))
        .map(([id, n]) => ({ id, text: n.text, ts: n.ts }))
        .sort((x, y) => y.ts - x.ts || (x.id < y.id ? -1 : 1));
}
function noteSnippet(text, max) {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= max)
        return flat;
    const cut = capNoteText(flat, max);
    const space = cut.lastIndexOf(' ');
    return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
  };
  links["src/engine/random.ts"] = {};
  defs["src/engine/random.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRng = createRng;
exports.shuffled = shuffled;
function createRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffled(items, rng) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
  };
  links["src/engine/readiness.ts"] = {};
  defs["src/engine/readiness.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_SAMPLE = exports.HINT_AFTER_LINE = exports.HINT_BEFORE_LINE = exports.ASSISTED_WEIGHT = void 0;
exports.answerCredit = answerCredit;
exports.unlockWeight = unlockWeight;
exports.domainOf = domainOf;
exports.domainMastery = domainMastery;
exports.computeReadiness = computeReadiness;
exports.readinessFor = readinessFor;
exports.ASSISTED_WEIGHT = 0.5;
exports.HINT_BEFORE_LINE = 'You used a hint, so a right answer counts as half.';
exports.HINT_AFTER_LINE = 'You used a hint, so this counts as half a right answer.';
function answerCredit(rec) {
    if (!rec.lastCorrect)
        return 0;
    return rec.lastAssisted || rec.lastRetest ? exports.ASSISTED_WEIGHT : 1;
}
function unlockWeight(rec) {
    return rec.attempts <= 1 && rec.lastAssisted ? exports.ASSISTED_WEIGHT : 1;
}
exports.MIN_SAMPLE = 10;
function domainOf(questionId) {
    var _a, _b;
    return (_b = (_a = /^d(\d+)_/.exec(questionId)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '?';
}
function domainMastery(cert, answers) {
    var _a;
    const zero = () => ({ answered: 0, mastered: 0, credit: 0, assisted: 0, halved: 0, unlockAnswers: 0 });
    const tally = new Map();
    for (const [id, rec] of Object.entries(answers)) {
        const d = domainOf(id);
        const t = (_a = tally.get(d)) !== null && _a !== void 0 ? _a : zero();
        t.answered += 1;
        if (rec.lastCorrect)
            t.mastered += 1;
        t.credit += answerCredit(rec);
        if (rec.lastAssisted)
            t.assisted += 1;
        if (rec.lastAssisted || rec.lastRetest)
            t.halved += 1;
        t.unlockAnswers += unlockWeight(rec);
        tally.set(d, t);
    }
    return cert.domains.map((dom) => {
        var _a;
        const t = (_a = tally.get(dom.id)) !== null && _a !== void 0 ? _a : zero();
        return {
            domainId: dom.id,
            answered: t.answered,
            mastered: t.mastered,
            credit: t.credit,
            assisted: t.assisted,
            halved: t.halved,
            unlockAnswers: t.unlockAnswers,
            accuracy: t.answered ? t.mastered / t.answered : null,
            mastery: t.credit / Math.max(t.answered, exports.MIN_SAMPLE),
        };
    });
}
function computeReadiness(cert, answers) {
    var _a, _b, _c, _d, _e;
    const domains = domainMastery(cert, answers);
    const totalWeight = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
    let weighted = 0;
    let focus = null;
    for (const dm of domains) {
        const w = (_b = (_a = cert.domains.find((d) => d.id === dm.domainId)) === null || _a === void 0 ? void 0 : _a.weight) !== null && _b !== void 0 ? _b : 0;
        weighted += dm.mastery * w;
        const gap = (1 - dm.mastery) * w;
        if (!focus || gap > focus.gap)
            focus = { id: dm.domainId, gap };
    }
    const answered = domains.reduce((s, d) => s + d.answered, 0);
    return {
        score: Math.round((weighted / totalWeight) * 100),
        reliable: domains.every((d) => d.answered >= exports.MIN_SAMPLE),
        domains,
        focusDomainId: answered === 0 ? (_d = (_c = cert.domains[0]) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null : (_e = focus === null || focus === void 0 ? void 0 : focus.id) !== null && _e !== void 0 ? _e : null,
    };
}
const shared = new WeakMap();
function readinessFor(cert, answers) {
    let byCert = shared.get(answers);
    if (!byCert) {
        byCert = new Map();
        shared.set(answers, byCert);
    }
    let r = byCert.get(cert);
    if (!r) {
        r = computeReadiness(cert, answers);
        byCert.set(cert, r);
    }
    return r;
}
  };
  links["src/engine/readinessRange.ts"] = {"./readiness":"src/engine/readiness.ts"};
  defs["src/engine/readinessRange.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANGE_MIN_HALF_WIDTH = exports.RANGE_Z = exports.RANGE_MIN_ANSWERS = void 0;
exports.effectiveAnswers = effectiveAnswers;
exports.readinessRange = readinessRange;
exports.rangeLabel = rangeLabel;
exports.rangeSpoken = rangeSpoken;
const readiness_1 = require("./readiness");
exports.RANGE_MIN_ANSWERS = 40;
exports.RANGE_Z = 1.2816;
exports.RANGE_MIN_HALF_WIDTH = 2;
function effectiveAnswers(dm) {
    var _a;
    return dm.answered - ((_a = dm.halved) !== null && _a !== void 0 ? _a : dm.assisted) * (1 - readiness_1.ASSISTED_WEIGHT);
}
function readinessRange(cert, readiness) {
    var _a, _b;
    const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
    const unlocked = readiness.domains.reduce((s, d) => s + d.unlockAnswers, 0);
    if (unlocked < exports.RANGE_MIN_ANSWERS) {
        return { enough: false, answered, needed: Math.ceil(exports.RANGE_MIN_ANSWERS - unlocked) };
    }
    const totalWeight = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
    let variance = 0;
    for (const dm of readiness.domains) {
        const w = ((_b = (_a = cert.domains.find((d) => d.id === dm.domainId)) === null || _a === void 0 ? void 0 : _a.weight) !== null && _b !== void 0 ? _b : 0) / totalWeight;
        const n = effectiveAnswers(dm);
        if (n <= 0)
            continue;
        const p = (dm.credit + 1) / (dm.answered + 2);
        const se = Math.sqrt(n * p * (1 - p)) / Math.max(n, readiness_1.MIN_SAMPLE);
        variance += (w * se) ** 2;
    }
    const half = Math.max(exports.RANGE_Z * Math.sqrt(variance) * 100, exports.RANGE_MIN_HALF_WIDTH);
    const centre = readiness.score;
    return {
        enough: true,
        answered,
        centre,
        low: Math.max(0, Math.floor(centre - half)),
        high: Math.min(100, Math.ceil(centre + half)),
    };
}
function rangeLabel(r) {
    return `${r.low}–${r.high}`;
}
function rangeSpoken(r) {
    return r.enough ? `between ${r.low} and ${r.high} percent` : 'not enough data yet';
}
  };
  links["src/engine/reminders.ts"] = {"./pace":"src/engine/pace.ts"};
  defs["src/engine/reminders.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHORT_SET_MINUTES = exports.SHORT_SET = exports.LEGACY_TITLE = exports.REMINDER_IDS = exports.rollingId = exports.ROLLING_COUNT = exports.weeklyId = exports.DAILY_ID = exports.MINUTE_STEP = exports.DEFAULT_REMINDER = exports.DAY_CHIPS = exports.ALL_DAYS = void 0;
exports.reminderDays = reminderDays;
exports.toggleDay = toggleDay;
exports.formatTime = formatTime;
exports.localTime = localTime;
exports.localHour = localHour;
exports.stepTime = stepTime;
exports.daysSummary = daysSummary;
exports.reminderSummary = reminderSummary;
exports.rollingPlan = rollingPlan;
exports.isStudyReminder = isStudyReminder;
exports.reminderCopy = reminderCopy;
exports.waitingAt = waitingAt;
exports.slotCopy = slotCopy;
exports.rollingCopy = rollingCopy;
const pace_1 = require("./pace");
exports.ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
exports.DAY_CHIPS = [
    { day: 1, short: 'Mon', long: 'Monday' },
    { day: 2, short: 'Tue', long: 'Tuesday' },
    { day: 3, short: 'Wed', long: 'Wednesday' },
    { day: 4, short: 'Thu', long: 'Thursday' },
    { day: 5, short: 'Fri', long: 'Friday' },
    { day: 6, short: 'Sat', long: 'Saturday' },
    { day: 0, short: 'Sun', long: 'Sunday' },
];
exports.DEFAULT_REMINDER = { enabled: false, hour: 19, minute: 0, days: [...exports.ALL_DAYS] };
function reminderDays(days) {
    const ok = [...new Set((days !== null && days !== void 0 ? days : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    return ok.length ? ok : [...exports.ALL_DAYS];
}
function toggleDay(days, day) {
    const cur = reminderDays(days);
    if (!cur.includes(day))
        return reminderDays([...cur, day]);
    return cur.length === 1 ? cur : cur.filter((d) => d !== day);
}
function formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function localTime(hour, minute, locale) {
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}
function localHour(hour, locale) {
    return new Date(2000, 0, 1, hour, 0).toLocaleTimeString(locale, { hour: 'numeric' });
}
function stepTime(hour, minute, deltaMinutes) {
    const total = (((hour * 60 + minute + deltaMinutes) % 1440) + 1440) % 1440;
    return { hour: Math.floor(total / 60), minute: total % 60 };
}
exports.MINUTE_STEP = 15;
function daysSummary(days) {
    const d = reminderDays(days);
    if (d.length === 7)
        return 'Every day';
    const key = d.join(',');
    if (key === '1,2,3,4,5')
        return 'Weekdays';
    if (key === '0,6')
        return 'Weekends';
    return exports.DAY_CHIPS.filter((c) => d.includes(c.day)).map((c) => c.short).join(', ');
}
function reminderSummary(r, locale) {
    return `${daysSummary(r.days)} at ${localTime(r.hour, r.minute, locale)}`;
}
exports.DAILY_ID = 'aurivan.study.daily';
const weeklyId = (day) => `aurivan.study.w${day + 1}`;
exports.weeklyId = weeklyId;
exports.ROLLING_COUNT = 7;
const rollingId = (n) => `aurivan.study.r${n}`;
exports.rollingId = rollingId;
exports.REMINDER_IDS = [
    exports.DAILY_ID,
    ...exports.ALL_DAYS.map(exports.weeklyId),
    ...Array.from({ length: exports.ROLLING_COUNT }, (_, i) => (0, exports.rollingId)(i + 1)),
];
exports.LEGACY_TITLE = 'Time for a quick session';
function rollingPlan(r, now, opts = {}) {
    if (!r.enabled)
        return [];
    const days = reminderDays(r.days);
    const start = new Date(now);
    const out = [];
    for (let offset = 0; offset < exports.ROLLING_COUNT + 1 && out.length < exports.ROLLING_COUNT; offset += 1) {
        const at = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, r.hour, r.minute, 0, 0);
        if (!days.includes(at.getDay()))
            continue;
        if (at.getTime() <= now)
            continue;
        if (offset === 0 && opts.skipToday)
            continue;
        out.push({ id: (0, exports.rollingId)(out.length + 1), at: at.getTime() });
    }
    return out;
}
function isStudyReminder(req) {
    var _a;
    return exports.REMINDER_IDS.includes(req.identifier) || ((_a = req.content) === null || _a === void 0 ? void 0 : _a.title) === exports.LEGACY_TITLE;
}
function reminderCopy(certName, minutes) {
    return {
        title: minutes && minutes > 0 ? `Your ${minutes}-minute plan is ready` : 'Your study plan is ready',
        body: `${certName}: a short session whenever you have a moment.`,
    };
}
exports.SHORT_SET = 5;
exports.SHORT_SET_MINUTES = Math.max(1, Math.round(exports.SHORT_SET * pace_1.MINUTES_PER_QUESTION));
function waitingAt(review, answers, at, exists = () => true) {
    var _a;
    let due = 0;
    let missed = 0;
    for (const id of Object.keys(review)) {
        if (review[id].dueAt > at || !exists(id))
            continue;
        due += 1;
        if (((_a = answers[id]) === null || _a === void 0 ? void 0 : _a.lastCorrect) === false)
            missed += 1;
    }
    return { due, missed };
}
function slotCopy(opts) {
    const { slot, count, certName, waiting } = opts;
    if (slot === 1 && waiting && waiting.due > 0) {
        const n = waiting.due;
        const title = waiting.missed === n
            ? n === 1
                ? 'The one you missed is back'
                : `The ${n} you missed are back`
            : n === 1
                ? 'One question is back for review'
                : `${n} questions are back for review`;
        return { title, body: `${certName}: a quick review, then today’s plan. Even ${exports.SHORT_SET} questions counts.` };
    }
    if (count >= 2 && slot === count) {
        return { title: 'Your study plan is ready', body: 'This is the last reminder for now. They start again when you next open KaiSip.' };
    }
    return {
        title: 'Your study plan is ready',
        body: `${certName}: about ${exports.SHORT_SET_MINUTES} min for ${exports.SHORT_SET} questions, or the full plan if you have time.`,
    };
}
function rollingCopy(plan, certName, waitingFor) {
    return plan.map((r, i) => slotCopy({ slot: i + 1, count: plan.length, certName, waiting: i === 0 && waitingFor ? waitingFor(r.at) : undefined }));
}
  };
  links["src/engine/saveMigrations.ts"] = {};
  defs["src/engine/saveMigrations.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SETTINGS_VERSION = exports.PROGRESS_VERSION = void 0;
exports.migrateProgress = migrateProgress;
exports.PROGRESS_VERSION = 2;
exports.SETTINGS_VERSION = 1;
function migrateProgress(persisted) {
    var _a;
    const old = (persisted !== null && persisted !== void 0 ? persisted : {});
    const { day, ...rest } = old;
    const days = { ...((_a = old.days) !== null && _a !== void 0 ? _a : {}) };
    if (day && typeof day === 'object' && day.certId && !days[day.certId])
        days[day.certId] = day;
    return { ...rest, days };
}
  };
  links["src/engine/sha256.ts"] = {};
  defs["src/engine/sha256.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utf8 = utf8;
exports.sha256 = sha256;
exports.toHex = toHex;
exports.sha256Hex = sha256Hex;
const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
function utf8(text) {
    const out = [];
    for (const ch of text) {
        let cp = ch.codePointAt(0);
        if (cp >= 0xd800 && cp <= 0xdfff)
            cp = 0xfffd;
        if (cp < 0x80)
            out.push(cp);
        else if (cp < 0x800)
            out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
        else if (cp < 0x10000)
            out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        else
            out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return Uint8Array.from(out);
}
const rotr = (x, n) => (x >>> n) | (x << (32 - n));
function sha256(bytes) {
    const bitLen = bytes.length * 8;
    const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
    view.setUint32(padded.length - 4, bitLen >>> 0);
    const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64);
    for (let block = 0; block < padded.length; block += 64) {
        for (let i = 0; i < 16; i++)
            w[i] = view.getUint32(block + i * 4);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
            const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
            const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }
        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
        h[5] = (h[5] + f) >>> 0;
        h[6] = (h[6] + g) >>> 0;
        h[7] = (h[7] + hh) >>> 0;
    }
    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    h.forEach((v, i) => outView.setUint32(i * 4, v));
    return out;
}
function toHex(bytes) {
    let s = '';
    for (const b of bytes)
        s += b.toString(16).padStart(2, '0');
    return s;
}
function sha256Hex(text) {
    return toHex(sha256(utf8(text)));
}
  };
  links["src/engine/shuffle.ts"] = {"../content/types":"src/content/types.ts","./random":"src/engine/random.ts"};
  defs["src/engine/shuffle.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionLetters = optionLetters;
exports.makePermutation = makePermutation;
exports.identityPermutation = identityPermutation;
exports.displayToOriginal = displayToOriginal;
exports.originalToDisplay = originalToDisplay;
exports.renderText = renderText;
exports.isCorrect = isCorrect;
exports.lettersFor = lettersFor;
exports.makeCheckPermutation = makeCheckPermutation;
exports.checkCorrectLetter = checkCorrectLetter;
exports.isCheckCorrect = isCheckCorrect;
const types_1 = require("../content/types");
const random_1 = require("./random");
function optionLetters(q) {
    return types_1.LETTERS.filter((l) => q.options[l] !== undefined);
}
function makePermutation(q, rng) {
    return (0, random_1.shuffled)(optionLetters(q), rng);
}
function identityPermutation(q) {
    return optionLetters(q);
}
function displayToOriginal(display, perm) {
    var _a;
    const i = types_1.LETTERS.indexOf(display);
    return (_a = perm[i]) !== null && _a !== void 0 ? _a : display;
}
function originalToDisplay(original, perm) {
    const i = perm.indexOf(original);
    return i >= 0 ? types_1.LETTERS[i] : original;
}
function renderText(text, perm) {
    if (!text)
        return '';
    return text.replace(/\{\{([A-D])\}\}/g, (_, l) => originalToDisplay(l, perm));
}
function isCorrect(q, displayChoice, perm) {
    return displayToOriginal(displayChoice, perm) === q.correct;
}
function lettersFor(count) {
    return types_1.LETTERS.slice(0, Math.max(0, Math.min(count, types_1.LETTERS.length)));
}
function makeCheckPermutation(count, rng) {
    const letters = lettersFor(count);
    return rng ? (0, random_1.shuffled)(letters, rng) : letters;
}
function checkCorrectLetter(correctIndex) {
    return types_1.LETTERS[correctIndex];
}
function isCheckCorrect(correctIndex, displayChoice, perm) {
    return displayToOriginal(displayChoice, perm) === checkCorrectLetter(correctIndex);
}
  };
  links["src/engine/slipCoach.ts"] = {"./games/priorityLens":"src/engine/games/priorityLens.ts","./tips":"src/engine/tips.ts"};
  defs["src/engine/slipCoach.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLIP_LINE = exports.RUNNER_UP_LINE = exports.NEUTRAL_MISS_LINE = exports.PATTERN_ORDER = exports.PATTERN_COPY = exports.SLIP_COACH_MIN = void 0;
exports.missCoachLine = missCoachLine;
exports.patternsOf = patternsOf;
exports.slipCoach = slipCoach;
const priorityLens_1 = require("./games/priorityLens");
const tips_1 = require("./tips");
exports.SLIP_COACH_MIN = 5;
exports.PATTERN_COPY = {
    'runner-up': { title: 'You often pick the closest wrong choice', coach: 'Two options look right. Say why the best one wins before you tap.', game: 'trap' },
    priority: { title: 'You miss priority words like FIRST and BEST', coach: 'Find the priority word before you read the options.', game: 'priority' },
    overconfident: { title: 'You miss when you feel sure', coach: 'A sure answer still deserves one more read of the question.', game: 'sprint' },
    role: { title: 'You answer as the wrong person', coach: 'Ask who you are in the question: auditor, manager or board?', game: 'canopy' },
    'tech-first': { title: 'You reach for a tool before the policy', coach: 'Policy, ownership and approval usually come before tools.', game: 'trap' },
    symptom: { title: 'You fix the symptom, not the cause', coach: 'Prefer the option that removes the root cause.', game: 'trap' },
    misread: { title: 'You misread the question', coach: 'Slow down on the last line of the question.', game: 'priority' },
    knowledge: { title: 'Most misses are content gaps', coach: 'A lesson or a review session will close them.', game: null },
};
exports.PATTERN_ORDER = ['runner-up', 'priority', 'overconfident', 'role', 'tech-first', 'symptom', 'misread', 'knowledge'];
exports.NEUTRAL_MISS_LINE = 'Here’s the idea to take with you.';
exports.RUNNER_UP_LINE = 'You picked the closest wrong choice. That’s the trap.';
exports.SLIP_LINE = {
    role: 'Check who you are in the question.',
    priority: 'Find the priority word before the options.',
    'tech-first': 'Policy and ownership usually come before tools.',
    symptom: 'Prefer the option that removes the cause.',
    misread: 'Slow down on the last line of the question.',
    knowledge: 'The idea below is the one to learn.',
};
function missCoachLine(pickedRunnerUp, slip) {
    if (pickedRunnerUp)
        return exports.RUNNER_UP_LINE;
    return slip ? exports.SLIP_LINE[slip] : exports.NEUTRAL_MISS_LINE;
}
function patternsOf(m) {
    const out = [];
    if (m.picked && m.picked !== m.correct && m.picked === (0, tips_1.runnerUp)(m.tips, m.correct))
        out.push('runner-up');
    if (m.slip === 'priority' || (m.slip === 'misread' && (0, priorityLens_1.priorityWord)(m.stem) !== null))
        out.push('priority');
    if (m.confidence === 'sure')
        out.push('overconfident');
    if (m.slip && m.slip !== 'priority')
        out.push(m.slip);
    return out;
}
function slipCoach(mistakes) {
    var _a, _b;
    const tagged = mistakes.filter((m) => m.slip);
    if (tagged.length < exports.SLIP_COACH_MIN) {
        return { ready: false, tagged: tagged.length, needed: exports.SLIP_COACH_MIN - tagged.length };
    }
    const counts = new Map();
    for (const m of tagged)
        for (const p of patternsOf(m))
            counts.set(p, ((_a = counts.get(p)) !== null && _a !== void 0 ? _a : 0) + 1);
    let best = exports.PATTERN_ORDER[0];
    let bestN = -1;
    for (const p of exports.PATTERN_ORDER) {
        const n = (_b = counts.get(p)) !== null && _b !== void 0 ? _b : 0;
        if (n > bestN) {
            best = p;
            bestN = n;
        }
    }
    return { ready: true, tagged: tagged.length, pattern: best, count: bestN, ...exports.PATTERN_COPY[best] };
}
  };
  links["src/engine/srs.ts"] = {};
  defs["src/engine/srs.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_MS = exports.MAX_BOX = exports.RETEST_LINE = exports.RETEST_WINDOW_MS = exports.INTERVAL_DAYS = exports.REVIEW_ORDER = exports.REVIEW_SESSION_CAP = void 0;
exports.readyToday = readyToday;
exports.readyLine = readyLine;
exports.isRetest = isRetest;
exports.isRetestAfterMiss = isRetestAfterMiss;
exports.startOfNextDay = startOfNextDay;
exports.nextReview = nextReview;
exports.nextCardReview = nextCardReview;
exports.upcomingReview = upcomingReview;
exports.upcomingReviewLine = upcomingReviewLine;
exports.dueIds = dueIds;
exports.dueCountFor = dueCountFor;
exports.REVIEW_SESSION_CAP = 20;
exports.REVIEW_ORDER = 'oldest first';
function readyToday(dueCount) {
    return Math.max(0, Math.min(dueCount, exports.REVIEW_SESSION_CAP));
}
function readyLine(n, where = 'revisit') {
    return `${n} ready ${where === 'today' ? 'today' : 'to revisit'} · ${exports.REVIEW_ORDER}`;
}
exports.INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };
exports.RETEST_WINDOW_MS = 4 * 3600000;
exports.RETEST_LINE = 'Back in your review tomorrow.';
function isRetest(prevAt, now) {
    if (prevAt === undefined)
        return false;
    const gap = now - prevAt;
    return gap >= 0 && gap < exports.RETEST_WINDOW_MS;
}
function isRetestAfterMiss(prev, now) {
    return prev !== undefined && prev.lastCorrect === false && isRetest(prev.lastAt, now);
}
function startOfNextDay(now) {
    const d = new Date(now);
    d.setHours(24, 0, 0, 0);
    return d.getTime();
}
exports.MAX_BOX = 5;
exports.DAY_MS = 86400000;
function nextReview(current, correct, confidence, now, assisted = false, retest = false) {
    var _a;
    if (!correct) {
        return { box: 1, dueAt: startOfNextDay(now), lastSeen: now, reps: ((_a = current === null || current === void 0 ? void 0 : current.reps) !== null && _a !== void 0 ? _a : 0) + 1 };
    }
    if (retest) {
        const tomorrow = startOfNextDay(now);
        if (current)
            return { ...current, dueAt: Math.max(current.dueAt, tomorrow), lastSeen: now, reps: current.reps + 1 };
        return { box: 1, dueAt: tomorrow, lastSeen: now, reps: 1 };
    }
    if (!current) {
        if (confidence === 'guessing')
            return { box: 1, dueAt: now + exports.DAY_MS, lastSeen: now, reps: 1 };
        if (confidence === 'unsure')
            return { box: 2, dueAt: now + exports.INTERVAL_DAYS[2] * exports.DAY_MS, lastSeen: now, reps: 1 };
        return null;
    }
    if (confidence === 'guessing' || assisted) {
        return {
            ...current,
            dueAt: Math.max(now + exports.INTERVAL_DAYS[current.box] * exports.DAY_MS, startOfNextDay(now)),
            lastSeen: now,
            reps: current.reps + 1,
        };
    }
    if (current.box >= exports.MAX_BOX)
        return null;
    const box = current.box + 1;
    return { box, dueAt: now + exports.INTERVAL_DAYS[box] * exports.DAY_MS, lastSeen: now, reps: current.reps + 1 };
}
function nextCardReview(current, correct, now) {
    var _a;
    if (!correct)
        return { box: 1, dueAt: now, lastSeen: now, reps: ((_a = current === null || current === void 0 ? void 0 : current.reps) !== null && _a !== void 0 ? _a : 0) + 1 };
    return nextReview(current, true, undefined, now);
}
function upcomingReview(review, now, exists = () => true) {
    const future = Object.entries(review)
        .filter(([id]) => exists(id))
        .map(([, r]) => r.dueAt)
        .filter((t) => t > now);
    if (future.length === 0)
        return null;
    const at = Math.min(...future);
    const end = new Date(at);
    end.setHours(23, 59, 59, 999);
    return { at, count: future.filter((t) => t <= end.getTime()).length };
}
function upcomingReviewLine(next, now, dateOf) {
    const day = (ms) => {
        const d = new Date(ms);
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / exports.DAY_MS;
    };
    const gap = day(next.at) - day(now);
    const when = gap <= 0 ? 'later today' : gap === 1 ? 'tomorrow' : dateOf(next.at);
    return `Next review: ${when} · ${next.count} ${next.count === 1 ? 'question' : 'questions'}`;
}
function dueIds(review, now, exists = () => true) {
    return Object.keys(review)
        .filter((id) => review[id].dueAt <= now && exists(id))
        .sort((a, b) => review[a].dueAt - review[b].dueAt || review[a].box - review[b].box);
}
const dueCounts = new WeakMap();
const everyQuestion = () => true;
function dueCountFor(review, now, exists = everyQuestion) {
    let byRule = dueCounts.get(review);
    if (!byRule) {
        byRule = new WeakMap();
        dueCounts.set(review, byRule);
    }
    const hit = byRule.get(exists);
    if (hit && now >= hit.at && now < hit.next)
        return hit.count;
    let count = 0;
    let next = Infinity;
    for (const id of Object.keys(review)) {
        const due = review[id].dueAt;
        if (due <= now) {
            if (exists(id))
                count++;
        }
        else if (due < next)
            next = due;
    }
    byRule.set(exists, { at: now, next, count });
    return count;
}
  };
  links["src/engine/streak.ts"] = {};
  defs["src/engine/streak.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayKey = dayKey;
exports.daysBeforeKey = daysBeforeKey;
exports.yesterdayKey = yesterdayKey;
exports.daysBetween = daysBetween;
exports.bumpStreak = bumpStreak;
exports.visibleStreak = visibleStreak;
exports.weekStrip = weekStrip;
function dayKey(ms) {
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}
function daysBeforeKey(ms, n) {
    const d = new Date(ms);
    return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, 12).getTime());
}
function yesterdayKey(ms) {
    return daysBeforeKey(ms, 1);
}
function daysBetween(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const ua = Date.UTC(ay, am - 1, ad);
    const ub = Date.UTC(by, bm - 1, bd);
    return Math.round((ub - ua) / 86400000);
}
function restAvailable(s, missedDay) {
    return !s.restDay || daysBetween(s.restDay, missedDay) >= 7;
}
function bumpStreak(s, now) {
    var _a, _b;
    const today = dayKey(now);
    if (s.lastDay === today)
        return s;
    const recentDays = [...((_a = s.recentDays) !== null && _a !== void 0 ? _a : (s.lastDay ? [s.lastDay] : [])), today].slice(-14);
    let current = 1;
    let restDay = (_b = s.restDay) !== null && _b !== void 0 ? _b : null;
    if (s.lastDay === yesterdayKey(now)) {
        current = s.current + 1;
    }
    else if (s.lastDay === daysBeforeKey(now, 2) && restAvailable(s, yesterdayKey(now))) {
        current = s.current + 1;
        restDay = yesterdayKey(now);
    }
    return { current, best: Math.max(s.best, current), lastDay: today, restDay, recentDays };
}
function visibleStreak(s, now) {
    if (!s.lastDay)
        return 0;
    if (s.lastDay === dayKey(now) || s.lastDay === yesterdayKey(now))
        return s.current;
    if (s.lastDay === daysBeforeKey(now, 2) && restAvailable(s, yesterdayKey(now)))
        return s.current;
    return 0;
}
function weekStrip(s, now) {
    var _a;
    const days = new Set((_a = s.recentDays) !== null && _a !== void 0 ? _a : (s.lastDay ? [s.lastDay] : []));
    return Array.from({ length: 7 }, (_, i) => days.has(daysBeforeKey(now, 6 - i)));
}
  };
  links["src/engine/studyModes.ts"] = {"./fit":"src/engine/fit.ts","./pace":"src/engine/pace.ts","./random":"src/engine/random.ts"};
  defs["src/engine/studyModes.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPIC_CAP = exports.REASON_LABEL = exports.DEFAULT_SIZE = exports.SESSION_SIZES = exports.MODE_INFO = exports.STUDY_MODES = void 0;
exports.sizeForMinutes = sizeForMinutes;
exports.sessionSize = sessionSize;
exports.suggestedMode = suggestedMode;
exports.activeMode = activeMode;
exports.scopeKey = scopeKey;
exports.randomMix = randomMix;
exports.interleaveTopic = interleaveTopic;
const fit_1 = require("./fit");
const pace_1 = require("./pace");
const random_1 = require("./random");
exports.STUDY_MODES = ['smart', 'guided', 'inOrder', 'random'];
exports.MODE_INFO = {
    smart: { name: 'Smart', why: 'Picks what you need next: reviews due, weak spots, new and refreshers.' },
    guided: { name: 'Guided', why: 'Follows your Learn path: a topic’s lesson, 5 questions, then a quick mix.' },
    inOrder: { name: 'In order', why: 'Topic by topic, with a quick mixed review at the end.' },
    random: { name: 'Random', why: 'A mix like the real exam.' },
};
exports.SESSION_SIZES = [10, 20, 50];
exports.DEFAULT_SIZE = 10;
const nearestSize = (n, sizes = exports.SESSION_SIZES) => sizes.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best), sizes[0]);
function sizeForMinutes(minutes) {
    if (minutes === undefined || !Number.isFinite(minutes))
        return exports.DEFAULT_SIZE;
    const fits = exports.SESSION_SIZES.filter((s) => s * pace_1.MINUTES_PER_QUESTION <= minutes + (0, fit_1.planTolerance)(minutes));
    return fits.length ? nearestSize((0, fit_1.questionsFor)(minutes), fits) : exports.SESSION_SIZES[0];
}
function sessionSize(n, dailyMinutes) {
    if (n === undefined || !Number.isFinite(n))
        return dailyMinutes === undefined ? exports.DEFAULT_SIZE : sizeForMinutes(dailyMinutes);
    return nearestSize(n);
}
function suggestedMode(stage, familiarity) {
    if (stage === 'diagnose')
        return familiarity === 'new' ? 'guided' : 'random';
    if (stage === 'learn')
        return 'guided';
    return 'smart';
}
function activeMode(saved, stage, familiarity) {
    return saved && exports.STUDY_MODES.includes(saved) ? saved : suggestedMode(stage, familiarity);
}
function scopeKey(domainId) {
    return domainId !== null && domainId !== void 0 ? domainId : 'all';
}
exports.REASON_LABEL = {
    due: 'Due',
    weak: 'Weak spot',
    new: 'New',
    refresher: 'Refresher',
    mixed: 'Mixed review',
};
function randomMix(pool, weights, count, rng) {
    const byDomain = new Map();
    for (const q of (0, random_1.shuffled)(pool, rng)) {
        const list = byDomain.get(q.domainId);
        if (list)
            list.push(q);
        else
            byDomain.set(q.domainId, [q]);
    }
    const out = [];
    while (out.length < count) {
        const open = [...byDomain.entries()].filter(([, l]) => l.length > 0);
        if (!open.length)
            break;
        const w = open.map(([d]) => { var _a; return Math.max((_a = weights[d]) !== null && _a !== void 0 ? _a : 0, 0.01); });
        const total = w.reduce((a, b) => a + b, 0);
        let r = rng() * total;
        let k = 0;
        while (k < open.length - 1 && r >= w[k])
            r -= w[k++];
        out.push({ id: open[k][1].pop().id });
    }
    return out;
}
exports.TOPIC_CAP = 20;
function interleaveTopic(subtopicQuestionIds, rng, cap = exports.TOPIC_CAP) {
    const lists = (0, random_1.shuffled)(subtopicQuestionIds.map((l) => (0, random_1.shuffled)(l, rng)).filter((l) => l.length > 0), rng);
    const out = [];
    const seen = new Set();
    for (let round = 0; out.length < cap && lists.some((l) => l.length > round); round++) {
        for (const l of lists) {
            const id = l[round];
            if (id === undefined || seen.has(id))
                continue;
            seen.add(id);
            out.push(id);
            if (out.length >= cap)
                break;
        }
    }
    return out;
}
  };
  links["src/engine/studyPath.ts"] = {"./outline":"src/engine/outline.ts","./random":"src/engine/random.ts"};
  defs["src/engine/studyPath.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUIDED_FOUNDATIONAL = exports.CLEAR_OF = exports.CLEAR_RIGHT = exports.GUIDED_TAIL = exports.GUIDED_BLOCK = void 0;
exports.topicStudied = topicStudied;
exports.lastUnassisted = lastUnassisted;
exports.topicStatus = topicStatus;
exports.currentGuidedTopic = currentGuidedTopic;
exports.nextTopic = nextTopic;
exports.blockedQuestions = blockedQuestions;
exports.mixedTail = mixedTail;
exports.guidedStep = guidedStep;
exports.tailSize = tailSize;
exports.walkOrder = walkOrder;
exports.lastAnsweredIndex = lastAnsweredIndex;
exports.inOrderSession = inOrderSession;
const outline_1 = require("./outline");
const random_1 = require("./random");
exports.GUIDED_BLOCK = 5;
exports.GUIDED_TAIL = 3;
exports.CLEAR_RIGHT = 4;
exports.CLEAR_OF = 5;
exports.GUIDED_FOUNDATIONAL = 2;
const DIFF_RANK = { foundational: 0, application: 1, analysis: 2 };
function topicStudied(topic, lessonIds, lessonsDone, notesRead) {
    if (lessonIds.length > 0)
        return lessonIds.some((id) => lessonsDone.includes(id));
    return topic.subtopics.length > 0 && topic.subtopics.every((s) => notesRead.includes(s.id));
}
function lastUnassisted(questionIds, answers, n = exports.CLEAR_OF) {
    return questionIds
        .map((id) => answers[id])
        .filter((r) => Boolean(r) && !r.lastAssisted && !r.lastRetest)
        .sort((a, b) => b.lastAt - a.lastAt)
        .slice(0, n)
        .map((r) => r.lastCorrect);
}
function topicStatus(topic, studied, answers) {
    const last = lastUnassisted((0, outline_1.topicQuestionIds)(topic), answers);
    const right = last.filter(Boolean).length;
    return { studied, answered: last.length, right, clear: studied && right >= exports.CLEAR_RIGHT };
}
function currentGuidedTopic(topics, cursor, isClear) {
    var _a;
    if (!topics.length)
        return undefined;
    const saved = topics.find((t) => t.id === cursor);
    if (saved)
        return saved;
    return (_a = topics.find((t) => !isClear(t))) !== null && _a !== void 0 ? _a : topics[0];
}
function nextTopic(topics, current, isClear) {
    if (!topics.length)
        return undefined;
    const k = current ? topics.findIndex((t) => t.id === current.id) : -1;
    if (isClear) {
        for (let step = 1; step < topics.length; step++) {
            const t = topics[(k + step + topics.length) % topics.length];
            if (t.id !== (current === null || current === void 0 ? void 0 : current.id) && !isClear(t))
                return t;
        }
    }
    return topics[(k + 1) % topics.length];
}
function blockedQuestions(topic, find, answers, rng, size = exports.GUIDED_BLOCK) {
    const qs = (0, random_1.shuffled)((0, outline_1.topicQuestionIds)(topic)
        .map(find)
        .filter((q) => Boolean(q)), rng);
    const need = (q) => (answers[q.id] ? (answers[q.id].lastCorrect ? 2 : 0) : 1);
    qs.sort((a, b) => need(a) - need(b));
    const open = qs.filter((q) => need(q) < 2);
    const found = open.filter((q) => q.difficulty === 'foundational').slice(0, exports.GUIDED_FOUNDATIONAL);
    const harder = open.filter((q) => q.difficulty !== 'foundational').slice(0, size - found.length);
    const pick = [...found, ...harder];
    for (const q of qs) {
        if (pick.length >= size)
            break;
        if (!pick.includes(q))
            pick.push(q);
    }
    return pick
        .slice(0, size)
        .sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty])
        .map((q) => q.id);
}
function mixedTail(earlier, exclude, answers, rng, size) {
    const rank = (id) => (answers[id] ? (answers[id].lastCorrect ? 1 : 0) : 2);
    const lists = (0, random_1.shuffled)(earlier, rng)
        .map((t) => (0, random_1.shuffled)((0, outline_1.topicQuestionIds)(t).filter((id) => !exclude.has(id)), rng).sort((a, b) => rank(a) - rank(b)))
        .filter((l) => l.length > 0);
    const out = [];
    for (let round = 0; out.length < size && lists.some((l) => l.length > round); round++) {
        for (const l of lists) {
            if (out.length >= size)
                break;
            if (l[round] !== undefined && !out.includes(l[round]))
                out.push(l[round]);
        }
    }
    return out;
}
function guidedStep(topics, topic, find, answers, rng) {
    const block = blockedQuestions(topic, find, answers, rng);
    const before = topics.slice(0, Math.max(0, topics.findIndex((t) => t.id === topic.id)));
    const tail = mixedTail(before, new Set(block), answers, rng, exports.GUIDED_TAIL).filter((id) => find(id));
    return [...block.map((id) => ({ id })), ...tail.map((id) => ({ id, reason: 'mixed' }))];
}
function tailSize(count) {
    return count >= 20 ? 3 : 2;
}
function walkOrder(topics, exists) {
    return topics.flatMap((t) => (0, outline_1.topicQuestionIds)(t).filter(exists).map((id) => ({ id, topicId: t.id })));
}
function lastAnsweredIndex(walk, answers) {
    let best = -1;
    let bestAt = -Infinity;
    walk.forEach((w, k) => {
        const r = answers[w.id];
        if (r && r.lastAt > bestAt) {
            best = k;
            bestAt = r.lastAt;
        }
    });
    return best;
}
function inOrderSession(topics, walk, cursor, count, answers, rng) {
    var _a;
    if (!walk.length)
        return [];
    const tailN = Math.min(tailSize(count), Math.max(0, count - 1));
    const steps = Math.min(count - tailN, walk.length);
    let at = walk.findIndex((w) => w.id === cursor);
    if (at < 0 && cursor !== undefined)
        at = lastAnsweredIndex(walk, answers);
    const start = (at + 1) % walk.length;
    const main = [];
    for (let k = 0; k < steps; k++)
        main.push(walk[(start + k) % walk.length]);
    const inSession = new Set(main.map((w) => w.id));
    const lastTopic = (_a = main[main.length - 1]) === null || _a === void 0 ? void 0 : _a.topicId;
    const walkedTopics = new Set(main.map((w) => w.topicId));
    const beforeIds = new Set(walk.slice(0, start).map((w) => w.topicId));
    const pick = (pred) => mixedTail(topics.filter(pred), inSession, answers, rng, tailN);
    let tail = pick((t) => beforeIds.has(t.id) && t.id !== lastTopic);
    if (tail.length < tailN)
        tail = [...tail, ...pick((t) => walkedTopics.has(t.id) && t.id !== lastTopic && !beforeIds.has(t.id))].slice(0, tailN);
    if (tail.length < tailN) {
        const have = new Set([...inSession, ...tail]);
        tail = [...tail, ...mixedTail(topics.filter((t) => t.id !== lastTopic), have, answers, rng, tailN - tail.length)];
    }
    const exists = new Set(walk.map((w) => w.id));
    return [...main.map((w) => ({ id: w.id })), ...tail.filter((id) => exists.has(id)).map((id) => ({ id, reason: 'mixed' }))];
}
  };
  links["src/engine/support.ts"] = {"./shuffle":"src/engine/shuffle.ts","./streak":"src/engine/streak.ts"};
  defs["src/engine/support.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIX_KINDS = exports.EMAIL_RE = exports.SUPPORT_TOPICS = exports.FEEDBACK_KINDS = exports.REF_RE = exports.ASKS_FOR_ANSWER = exports.PARTS = exports.REASONS = exports.EXAM_CONTENT_LINE = exports.MAX_REPORTS = exports.MAX_MAILTO = exports.MAX_NOTE = void 0;
exports.labelOf = labelOf;
exports.itemRef = itemRef;
exports.parseItemRef = parseItemRef;
exports.itemLine = itemLine;
exports.newRef = newRef;
exports.cleanNote = cleanNote;
exports.letterWithShown = letterWithShown;
exports.isShuffled = isShuffled;
exports.shownOrder = shownOrder;
exports.displayLine = displayLine;
exports.reportDetails = reportDetails;
exports.reportSubject = reportSubject;
exports.buildReportEmail = buildReportEmail;
exports.buildFeedbackEmail = buildFeedbackEmail;
exports.buildSupportEmail = buildSupportEmail;
exports.mailtoUrl = mailtoUrl;
exports.fitReport = fitReport;
exports.addReport = addReport;
exports.lastReportFor = lastReportFor;
exports.parseVersion = parseVersion;
exports.versionBefore = versionBefore;
exports.fixMatches = fixMatches;
exports.fixFor = fixFor;
exports.creditDue = creditDue;
exports.distinctItems = distinctItems;
exports.reportCounts = reportCounts;
exports.fixesProblems = fixesProblems;
const shuffle_1 = require("./shuffle");
const streak_1 = require("./streak");
exports.MAX_NOTE = 1000;
exports.MAX_MAILTO = 4000;
exports.MAX_REPORTS = 200;
exports.EXAM_CONTENT_LINE = 'Please don’t include questions from the real exam. Candidates agree to keep exam content confidential, and we can’t use them.';
exports.REASONS = {
    question: [
        { code: 'key', label: 'The marked answer looks wrong' },
        { code: 'two-right', label: 'Another option is also right' },
        { code: 'unclear', label: 'The wording is unclear' },
        { code: 'explanation', label: 'The explanation doesn’t match the answer' },
        { code: 'tip-letter', label: 'A tip names the wrong option' },
        { code: 'typo', label: 'Typo or grammar' },
        { code: 'outdated', label: 'Outdated standard or reference' },
        { code: 'other', label: 'Something else' },
    ],
    note: [
        { code: 'incorrect', label: 'Something here is incorrect' },
        { code: 'unclear', label: 'Hard to follow' },
        { code: 'diagram', label: 'A diagram is wrong or hard to read' },
        { code: 'missing', label: 'Something important is missing' },
        { code: 'typo', label: 'Typo or grammar' },
        { code: 'outdated', label: 'Outdated standard or reference' },
        { code: 'other', label: 'Something else' },
    ],
    lesson: [
        { code: 'incorrect', label: 'Something here is incorrect' },
        { code: 'key', label: 'The check question’s answer looks wrong' },
        { code: 'order', label: 'The steps are in the wrong order' },
        { code: 'unclear', label: 'Hard to follow' },
        { code: 'typo', label: 'Typo or grammar' },
        { code: 'other', label: 'Something else' },
    ],
    card: [
        { code: 'incorrect', label: 'Something on this card is wrong' },
        { code: 'key', label: 'The game marked me wrong, but I was right' },
        { code: 'unclear', label: 'Hard to follow' },
        { code: 'typo', label: 'Typo or grammar' },
        { code: 'other', label: 'Something else' },
    ],
    principle: [
        { code: 'incorrect', label: 'Something here is incorrect' },
        { code: 'example', label: 'The example doesn’t fit the rule' },
        { code: 'practice', label: 'A practice question doesn’t fit this idea' },
        { code: 'unclear', label: 'Hard to follow' },
        { code: 'typo', label: 'Typo or grammar' },
        { code: 'other', label: 'Something else' },
    ],
    app: [
        { code: 'freeze', label: 'Something didn’t load or froze' },
        { code: 'display', label: 'Text is cut off or hard to read' },
        { code: 'score', label: 'A score or result looks wrong' },
        { code: 'timer', label: 'The timer or pacing looks wrong' },
        { code: 'reminder', label: 'A reminder didn’t arrive' },
        { code: 'findable', label: 'I couldn’t find something' },
        { code: 'other', label: 'Something else' },
    ],
};
exports.PARTS = {
    question: [
        { code: 'question', label: 'Question' },
        { code: 'key', label: 'Answer key' },
        { code: 'explanation', label: 'Explanation' },
        { code: 'tips', label: 'Tips' },
    ],
    note: [
        { code: 'text', label: 'Text' },
        { code: 'diagram', label: 'Diagram' },
        { code: 'example', label: 'Example' },
        { code: 'other', label: 'Something else' },
    ],
    lesson: [
        { code: 'explanation', label: 'Explanation' },
        { code: 'check', label: 'Check question' },
        { code: 'order', label: 'Step order' },
        { code: 'diagram', label: 'Diagram' },
        { code: 'other', label: 'Something else' },
    ],
    card: [
        { code: 'statement', label: 'Statement' },
        { code: 'answer', label: 'Answer' },
        { code: 'other', label: 'Something else' },
    ],
    principle: [
        { code: 'rule', label: 'Rule' },
        { code: 'trap', label: 'Trap' },
        { code: 'example', label: 'Worked example' },
        { code: 'other', label: 'Something else' },
    ],
    app: [],
};
exports.ASKS_FOR_ANSWER = new Set(['key', 'two-right']);
function labelOf(choices, code) {
    var _a, _b;
    return (_b = (_a = choices.find((c) => c.code === code)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : code;
}
function itemRef(t) {
    switch (t.kind) {
        case 'question':
            return `q:${t.id}`;
        case 'note':
            return `note:${t.id}`;
        case 'lesson':
            return t.step ? `lesson:${t.id}#${t.step}` : `lesson:${t.id}`;
        case 'card':
            return `card:${t.id}`;
        case 'principle':
            return `principle:${t.id}`;
        case 'app':
            return `app:${t.id}`;
    }
}
function parseItemRef(item) {
    const at = item.indexOf(':');
    if (at < 1)
        return null;
    const head = item.slice(0, at);
    const rest = item.slice(at + 1);
    if (!rest)
        return null;
    const KINDS = { q: 'question', note: 'note', lesson: 'lesson', card: 'card', principle: 'principle', app: 'app' };
    const kind = Object.prototype.hasOwnProperty.call(KINDS, head) ? KINDS[head] : undefined;
    if (!kind)
        return null;
    if (kind === 'lesson') {
        const [id, step] = rest.split('#');
        const n = Number(step);
        return step !== undefined && Number.isInteger(n) && n > 0 ? { kind, id, step: n } : { kind, id };
    }
    return { kind, id: rest };
}
function itemLine(t) {
    var _a;
    const named = (s) => (t.name ? `${s} (${t.name})` : s);
    switch (t.kind) {
        case 'question':
            return named(`Question ${t.id}`);
        case 'note':
            return named(`Note ${t.id}`);
        case 'lesson':
            return `Lesson ${t.id}${t.step ? `, step ${t.step}${t.steps ? ` of ${t.steps}` : ''}` : ''}${t.name ? ` (${t.name})` : ''}`;
        case 'card':
            return named(`Game card ${t.id}`);
        case 'principle':
            return named(`Principle ${t.id}`);
        case 'app':
            return `The app (${(_a = t.name) !== null && _a !== void 0 ? _a : t.id})`;
    }
}
function subjectItem(t) {
    return t.kind === 'question' ? t.id : itemRef(t);
}
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function newRef(rand) {
    let out = '';
    for (let i = 0; i < 4; i++)
        out += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length) % REF_ALPHABET.length];
    return `R-${out}`;
}
exports.REF_RE = /^R-[2-9A-HJKMNP-Z]{4}$/;
function cleanNote(note, max = exports.MAX_NOTE) {
    const text = note
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .trim();
    return Array.from(text)
        .filter((ch) => !(ch.length === 1 && ch >= '\uD800' && ch <= '\uDFFF'))
        .slice(0, max)
        .join('')
        .trimEnd();
}
function letterWithShown(display, perm) {
    const original = (0, shuffle_1.displayToOriginal)(display, perm);
    return original === display ? original : `${original} (shown as ${display})`;
}
function isShuffled(perm) {
    return perm.some((l, i) => l !== 'ABCD'[i]);
}
function shownOrder(perm) {
    return perm.map((orig, i) => `${'ABCD'[i]}=${orig}`).join(', ');
}
function displayLine(d) {
    return `Display: Theme ${d.theme} · Text size ${Math.round(d.textScale * 100)}% · Reduce Motion ${d.reduceMotion ? 'on' : 'off'}`;
}
const appLine = (app) => `App: KaiSip ${app.version} (${app.os})`;
const REPORT_PROMPT = 'What looks wrong? Anything you add helps us fix it faster.';
const KEEP_LINE = '-- Please keep the lines below. They tell us exactly what you saw. --';
function reportDetails(input) {
    var _a;
    const { target: t } = input;
    const lines = [`Item: ${itemLine(t)}`];
    const parts = ((_a = input.parts) !== null && _a !== void 0 ? _a : []).map((p) => labelOf(exports.PARTS[t.kind], p));
    if (parts.length)
        lines.push(`Part: ${parts.join(', ')}`);
    lines.push(`Reason: ${labelOf(exports.REASONS[t.kind], input.reason)}`);
    if (t.perm && t.pickedDisplay)
        lines.push(`Your pick: ${letterWithShown(t.pickedDisplay, t.perm)}`);
    else if (t.pickedOriginal)
        lines.push(`Your pick: ${t.pickedOriginal}`);
    if (t.perm && input.suggestedDisplay)
        lines.push(`Suggested answer: ${letterWithShown(input.suggestedDisplay, t.perm)}`);
    if (t.perm && isShuffled(t.perm))
        lines.push(`Shown order (screen = bank): ${shownOrder(t.perm)}`);
    lines.push(`Where: ${t.where}`);
    lines.push(`Certification: ${input.certName}`);
    lines.push(appLine(input.app));
    if (input.display)
        lines.push(displayLine(input.display));
    if (t.kind === 'question' && input.contentReviewed)
        lines.push(`Content reviewed: ${input.contentReviewed}`);
    lines.push(`Ref: ${input.ref}`);
    return lines;
}
function reportSubject(input) {
    return `KaiSip · Report · ${input.certName} · ${subjectItem(input.target)} · ${input.reason}`;
}
function letter(opening, details, keepLine) {
    return ['Hi KaiSip team,', '', opening, '', '', '', keepLine, ...details, '', exports.EXAM_CONTENT_LINE].join('\n');
}
function buildReportEmail(input) {
    var _a;
    const note = cleanNote((_a = input.note) !== null && _a !== void 0 ? _a : '');
    return { subject: reportSubject(input), body: letter(note || REPORT_PROMPT, reportDetails(input), KEEP_LINE) };
}
exports.FEEDBACK_KINDS = [
    { code: 'confused', label: 'Something confused me', tag: 'Confused' },
    { code: 'idea', label: 'An idea', tag: 'Idea' },
    { code: 'like', label: 'Something I like', tag: 'Like' },
    { code: 'other', label: 'Something else', tag: 'Other' },
];
const DETAILS_LINE = '-- Details (you can delete these) --';
function buildFeedbackEmail(input) {
    var _a, _b;
    const kind = (_a = exports.FEEDBACK_KINDS.find((k) => k.code === input.kind)) !== null && _a !== void 0 ? _a : exports.FEEDBACK_KINDS[0];
    const details = [`Kind: ${kind.label}`, `Certification: ${input.certName}`, appLine(input.app)];
    if (input.from)
        details.push(`From: ${input.from}`);
    if (input.display)
        details.push(displayLine(input.display));
    const message = cleanNote((_b = input.message) !== null && _b !== void 0 ? _b : '');
    return {
        subject: `KaiSip · Feedback · ${kind.tag} · ${input.certName}`,
        body: letter(message || 'What would you like to tell us?', details, DETAILS_LINE),
    };
}
exports.SUPPORT_TOPICS = [
    { code: 'study', label: 'A study question or topic', tag: 'Study' },
    { code: 'backup', label: 'Backup, restore or a new phone', tag: 'Backup' },
    { code: 'reminders', label: 'Reminders', tag: 'Reminders' },
    { code: 'privacy', label: 'Your data and privacy', tag: 'Privacy' },
    { code: 'other', label: 'Something else', tag: 'Other' },
];
function buildSupportEmail(input) {
    var _a;
    const topic = (_a = exports.SUPPORT_TOPICS.find((t) => t.code === input.topic)) !== null && _a !== void 0 ? _a : exports.SUPPORT_TOPICS[exports.SUPPORT_TOPICS.length - 1];
    const details = [`Topic: ${topic.label}`, `Certification: ${input.certName}`, appLine(input.app)];
    if (input.from)
        details.push(`From: ${input.from}`);
    return {
        subject: `KaiSip · Support · ${topic.tag} · ${input.certName}`,
        body: letter('What do you need help with?', details, DETAILS_LINE),
    };
}
exports.EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
function mailtoUrl(to, email) {
    return `mailto:${to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body.replace(/\n/g, '\r\n'))}`;
}
function fitReport(to, input, max = exports.MAX_MAILTO) {
    var _a;
    let chars = Array.from(cleanNote((_a = input.note) !== null && _a !== void 0 ? _a : ''));
    let email = buildReportEmail({ ...input, note: chars.join('') });
    let url = mailtoUrl(to, email);
    let shortened = false;
    while (url.length > max && chars.length > 0) {
        chars = chars.slice(0, Math.max(0, chars.length - Math.max(1, Math.ceil(chars.length / 10))));
        shortened = true;
        email = buildReportEmail({ ...input, note: chars.length ? `${chars.join('').trimEnd()}…` : '' });
        url = mailtoUrl(to, email);
    }
    return { email, url, shortened };
}
function addReport(list, entry, cap = exports.MAX_REPORTS) {
    return [entry, ...(list !== null && list !== void 0 ? list : [])].slice(0, cap);
}
function lastReportFor(list, cert, item) {
    return (list !== null && list !== void 0 ? list : []).find((r) => r.cert === cert && r.item === item);
}
exports.FIX_KINDS = ['corrected', 'clarified', 'removed'];
function parseVersion(v) {
    const m = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/.exec(v !== null && v !== void 0 ? v : '');
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function versionBefore(a, b) {
    for (let i = 0; i < 3; i++)
        if (a[i] !== b[i])
            return a[i] < b[i];
    return false;
}
function fixMatches(fix, report) {
    if (fix.cert !== report.cert)
        return false;
    const sameItem = fix.ref === report.item || (!fix.ref.includes('#') && report.item.startsWith(`${fix.ref}#`));
    if (!sameItem)
        return false;
    const reportedOn = parseVersion(report.version);
    const fixedIn = parseVersion(fix.fixedIn);
    if (reportedOn && fixedIn)
        return versionBefore(reportedOn, fixedIn);
    return fix.date > (0, streak_1.dayKey)(report.at);
}
function fixFor(report, fixes) {
    return fixes.filter((f) => fixMatches(f, report)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}
function creditDue(reports, fixes) {
    return (reports !== null && reports !== void 0 ? reports : []).filter((r) => !r.creditSeen && fixFor(r, fixes));
}
function distinctItems(reports) {
    return new Set(reports.map((r) => `${r.cert}|${r.item}`)).size;
}
function reportCounts(reports, fixes) {
    const list = reports !== null && reports !== void 0 ? reports : [];
    return { started: list.length, updated: list.filter((r) => fixFor(r, fixes)).length };
}
function fixesProblems(fixes, knownCerts) {
    const out = [];
    fixes.forEach((f, i) => {
        const at = `fixes[${i}]`;
        if (!/^(q|note|lesson|card|app):[A-Za-z0-9._:#-]{1,100}$/.test(f.ref))
            out.push(`${at}.ref is not an item reference`);
        if (!knownCerts.includes(f.cert))
            out.push(`${at}.cert is unknown`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date))
            out.push(`${at}.date is not YYYY-MM-DD`);
        if (!parseVersion(f.fixedIn))
            out.push(`${at}.fixedIn is not an app version like 1.7.1`);
        if (!exports.FIX_KINDS.includes(f.kind))
            out.push(`${at}.kind is not one of ${exports.FIX_KINDS.join(', ')}`);
        if (typeof f.publicNote !== 'string' || f.publicNote.length < 10 || f.publicNote.length > 140)
            out.push(`${at}.publicNote must be 10–140 characters`);
        else {
            if (/\b[dD]\d_\d{2,}\b|\b\d[A-Z]\d(\.\d+)?\b/.test(f.publicNote))
                out.push(`${at}.publicNote names a code`);
            if (/\b\d+\s+(questions?|items?|cards?|notes?)\b/i.test(f.publicNote))
                out.push(`${at}.publicNote gives a count`);
            if (!/[.!]$/.test(f.publicNote))
                out.push(`${at}.publicNote must be a sentence`);
        }
    });
    return out;
}
  };
  links["src/engine/syncMerge.ts"] = {"./backup":"src/engine/backup.ts","./examReady":"src/engine/examReady.ts","./examWeek":"src/engine/examWeek.ts","./games/growth":"src/engine/games/growth.ts","./journey":"src/engine/journey.ts","./milestones":"src/engine/milestones.ts","./plant":"src/engine/plant.ts","./questionNotes":"src/engine/questionNotes.ts","./saveMigrations":"src/engine/saveMigrations.ts","./streak":"src/engine/streak.ts","./support":"src/engine/support.ts"};
  defs["src/engine/syncMerge.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeStamps = exports.FUTURE_SLACK_MS = exports.MAX_STAMPS = exports.MAX_SETTINGS_BYTES = exports.DEVICE_LOCAL_PROGRESS = exports.DEVICE_LOCAL_SETTINGS = exports.SYNCED_SETTINGS = void 0;
exports.stableStringify = stableStringify;
exports.fnv1a = fnv1a;
exports.readStamps = readStamps;
exports.dropFutureStamps = dropFutureStamps;
exports.clampFuture = clampFuture;
exports.activityAt = activityAt;
exports.withoutDeviceLocal = withoutDeviceLocal;
exports.deviceLocalOf = deviceLocalOf;
exports.mergeSides = mergeSides;
exports.toPayload = toPayload;
exports.localSide = localSide;
exports.readSnapshot = readSnapshot;
exports.holdsStudy = holdsStudy;
exports.progressIsEmpty = progressIsEmpty;
const backup_1 = require("./backup");
const examReady_1 = require("./examReady");
const examWeek_1 = require("./examWeek");
const growth_1 = require("./games/growth");
const journey_1 = require("./journey");
const milestones_1 = require("./milestones");
const plant_1 = require("./plant");
const questionNotes_1 = require("./questionNotes");
const saveMigrations_1 = require("./saveMigrations");
const streak_1 = require("./streak");
const support_1 = require("./support");
exports.SYNCED_SETTINGS = [
    'activeCertId',
    'examDates',
    'shuffleOptions',
    'dailyGoal',
    'gameRulesSeen',
    'practiceTimer',
    'paceOffer',
    'studyMode',
    'studyDomain',
    'studySize',
    'badgesHidden',
    'familiarity',
    'dailyMinutes',
    'examFocused',
    'fitPrompt',
];
exports.DEVICE_LOCAL_SETTINGS = ['onboarded', 'theme', 'motion', 'reminder', 'haptics', 'fitChanges', 'fitAskDays', 'displayName'];
exports.DEVICE_LOCAL_PROGRESS = ['today', 'days', 'plantSettings'];
exports.MAX_SETTINGS_BYTES = 65536;
exports.MAX_STAMPS = 120;
exports.FUTURE_SLACK_MS = 24 * 3600000;
const MAX_RECENT_DAYS = 200;
const MAX_RULES_SEEN = 50;
const MAX_QUEUE = 50;
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
function stableStringify(x) {
    if (x === undefined)
        return '';
    if (x === null || typeof x !== 'object')
        return JSON.stringify(x);
    if (Array.isArray(x))
        return `[${x.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
    const o = x;
    const keys = Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}
function fnv1a(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `${h.toString(16).padStart(8, '0')}:${text.length}`;
}
const cmpText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function cmpKey(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i];
        const y = b[i];
        if (x === y)
            continue;
        if (typeof x === 'number' && typeof y === 'number')
            return x < y ? -1 : 1;
        return cmpText(String(x !== null && x !== void 0 ? x : ''), String(y !== null && y !== void 0 ? y : ''));
    }
    return 0;
}
function pick(a, b, key) {
    return cmpKey(key(a), key(b)) >= 0 ? a : b;
}
const max = (a, b) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));
const min = (a, b) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));
const maxDay = (a, b) => (!a ? b !== null && b !== void 0 ? b : undefined : !b ? a : a > b ? a : b);
const minDay = (a, b) => (!a ? b !== null && b !== void 0 ? b : undefined : !b ? a : a < b ? a : b);
const unionSorted = (a, b) => [...new Set([...(a !== null && a !== void 0 ? a : []), ...(b !== null && b !== void 0 ? b : [])])].sort(cmpText);
function clean(o) {
    const out = {};
    for (const [k, v] of Object.entries(o))
        if (v !== undefined)
            out[k] = v;
    return out;
}
function mergeMap(a, b, both) {
    if (!a && !b)
        return undefined;
    const out = {};
    for (const k of unionSorted(Object.keys(a !== null && a !== void 0 ? a : {}), Object.keys(b !== null && b !== void 0 ? b : {}))) {
        const x = a === null || a === void 0 ? void 0 : a[k];
        const y = b === null || b === void 0 ? void 0 : b[k];
        out[k] = x !== undefined && y !== undefined ? both(x, y) : (x !== null && x !== void 0 ? x : y);
    }
    return out;
}
function readStamps(raw) {
    if (!isObj(raw))
        return {};
    const out = {};
    const lo = Date.UTC(2000, 0, 1);
    const hi = Date.UTC(2100, 11, 31);
    for (const k of Object.keys(raw).slice(0, exports.MAX_STAMPS)) {
        const v = raw[k];
        if (k === '__proto__' || k === 'constructor' || k === 'prototype')
            continue;
        if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(k))
            continue;
        if (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi)
            out[k] = v;
    }
    return out;
}
const mergeStamps = (a, b) => {
    const out = {};
    for (const k of unionSorted(Object.keys(a), Object.keys(b)).slice(0, exports.MAX_STAMPS)) {
        const v = max(a[k], b[k]);
        if (v !== undefined)
            out[k] = v;
    }
    return out;
};
exports.mergeStamps = mergeStamps;
function dropFutureStamps(stamps, now) {
    const limit = now + exports.FUTURE_SLACK_MS;
    return Object.fromEntries(Object.entries(stamps).filter(([, v]) => v <= limit));
}
function clampFuture(store, side, now) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const limit = now + exports.FUTURE_SLACK_MS;
    const today = (0, streak_1.dayKey)(now);
    const lastDay = (0, streak_1.dayKey)(limit);
    const t = (v) => (typeof v === 'number' && v > limit ? now : v);
    const d = (v) => (typeof v === 'string' && v > lastDay ? today : v);
    const times = (m) => (m ? Object.fromEntries(Object.entries(m).map(([k, v]) => [k, t(v)])) : m);
    const days = (m) => (m ? Object.fromEntries(Object.entries(m).map(([k, v]) => [k, d(v)])) : m);
    const stamps = dropFutureStamps(side.stamps, now);
    if (store === 'settings')
        return { state: side.state, stamps };
    const p = JSON.parse(JSON.stringify(side.state));
    for (const cp of Object.values(p.byCert)) {
        for (const a of Object.values((_a = cp.answers) !== null && _a !== void 0 ? _a : {}))
            a.lastAt = t(a.lastAt);
        for (const r of Object.values((_b = cp.review) !== null && _b !== void 0 ? _b : {}))
            r.lastSeen = t(r.lastSeen);
        for (const r of Object.values((_c = cp.cards) !== null && _c !== void 0 ? _c : {}))
            r.lastSeen = t(r.lastSeen);
        for (const m of Object.values((_d = cp.mistakes) !== null && _d !== void 0 ? _d : {}))
            m.at = t(m.at);
        for (const m of (_e = cp.mocks) !== null && _e !== void 0 ? _e : [])
            m.finishedAt = t(m.finishedAt);
        for (const n of Object.values((_f = cp.qNotes) !== null && _f !== void 0 ? _f : {}))
            n.ts = t(n.ts);
        for (const m of Object.values((_g = cp.mastery) !== null && _g !== void 0 ? _g : {})) {
            m.firstDay = d(m.firstDay);
            if (m.firstAt !== undefined)
                m.firstAt = t(m.firstAt);
            if (m.masteredAt !== undefined)
                m.masteredAt = d(m.masteredAt);
        }
        const ms = cp.milestones;
        if (ms) {
            ms.earned = times(ms.earned);
            if (ms.planters)
                ms.planters = times(ms.planters);
            if (ms.backfill)
                ms.backfill.at = t(ms.backfill.at);
            if (ms.catalogFill)
                ms.catalogFill.at = t(ms.catalogFill.at);
            if (ms.lastDay)
                ms.lastDay = d(ms.lastDay);
            if (ms.returnedOn)
                ms.returnedOn = d(ms.returnedOn);
            if (ms.gameMisses)
                ms.gameMisses = days(ms.gameMisses);
            if (ms.cardMisses)
                ms.cardMisses = days(ms.cardMisses);
        }
        const mo = cp.moments;
        if (mo) {
            if (mo.readySeenAt !== undefined)
                mo.readySeenAt = t(mo.readySeenAt);
            if (mo.readiness)
                mo.readiness = mo.readiness.map((r) => ({ ...r, day: d(r.day) }));
        }
        const pl = cp.plant;
        if (pl) {
            pl.plantedAt = t(pl.plantedAt);
            if (pl.replantedAt !== undefined)
                pl.replantedAt = t(pl.replantedAt);
            if (pl.reached)
                pl.reached = times(pl.reached);
            if (pl.backfill)
                pl.backfill.at = t(pl.backfill.at);
            if (pl.passedOn)
                pl.passedOn = d(pl.passedOn);
        }
    }
    const s = p.streak;
    s.lastDay = (_h = d(s.lastDay)) !== null && _h !== void 0 ? _h : null;
    if (s.restDay)
        s.restDay = d(s.restDay);
    if (s.recentDays)
        s.recentDays = s.recentDays.map((x) => d(x));
    if (p.reports)
        p.reports = p.reports.map((r) => ({ ...r, at: t(r.at) }));
    return { state: p, stamps };
}
function lww(ka, av, as, bv, bs) {
    var _a, _b;
    const a = { v: av, at: (_a = as[ka]) !== null && _a !== void 0 ? _a : 0 };
    const b = { v: bv, at: (_b = bs[ka]) !== null && _b !== void 0 ? _b : 0 };
    return pick(a, b, (x) => [x.at, stableStringify(x.v)]).v;
}
function mergeSettingsRaw(a, b) {
    var _a, _b, _c, _d;
    const out = {};
    const A = a.state;
    const B = b.state;
    for (const f of exports.SYNCED_SETTINGS) {
        if (f === 'examDates') {
            const certs = unionSorted(Object.keys((_a = a.state.examDates) !== null && _a !== void 0 ? _a : {}), Object.keys((_b = b.state.examDates) !== null && _b !== void 0 ? _b : {}));
            const dates = {};
            for (const c of certs) {
                const v = lww(`examDates.${c}`, (_c = a.state.examDates) === null || _c === void 0 ? void 0 : _c[c], a.stamps, (_d = b.state.examDates) === null || _d === void 0 ? void 0 : _d[c], b.stamps);
                if (v !== undefined)
                    dates[c] = v;
            }
            if (a.state.examDates || b.state.examDates)
                out.examDates = dates;
        }
        else if (f === 'gameRulesSeen') {
            if (a.state.gameRulesSeen || b.state.gameRulesSeen)
                out.gameRulesSeen = unionSorted(a.state.gameRulesSeen, b.state.gameRulesSeen).slice(0, MAX_RULES_SEEN);
        }
        else {
            out[f] = lww(f, A[f], a.stamps, B[f], b.stamps);
        }
    }
    return { state: clean(out), stamps: (0, exports.mergeStamps)(a.stamps, b.stamps) };
}
function activityAt(cp) {
    var _a, _b, _c, _d;
    let at = 0;
    for (const a of Object.values((_a = cp.answers) !== null && _a !== void 0 ? _a : {}))
        at = Math.max(at, a.lastAt);
    for (const m of (_b = cp.mocks) !== null && _b !== void 0 ? _b : [])
        at = Math.max(at, m.finishedAt);
    for (const r of Object.values((_c = cp.review) !== null && _c !== void 0 ? _c : {}))
        at = Math.max(at, r.lastSeen);
    for (const r of Object.values((_d = cp.cards) !== null && _d !== void 0 ? _d : {}))
        at = Math.max(at, r.lastSeen);
    return at;
}
function mergeAnswer(a, b) {
    const lastOf = (x) => clean({ lastCorrect: x.lastCorrect, lastAt: x.lastAt, lastAssisted: x.lastAssisted, lastRetest: x.lastRetest, lastGame: x.lastGame, ms: x.ms, lastConfidence: x.lastConfidence });
    const last = pick(a, b, (x) => [x.lastAt, stableStringify(lastOf(x))]);
    const attempts = Math.max(a.attempts, b.attempts);
    return clean({ ...lastOf(last), attempts, correctCount: Math.min(attempts, Math.max(a.correctCount, b.correctCount)) });
}
function mergeMistake(a, b) {
    var _a;
    const base = (x) => clean({ ...x, slip: undefined, resolved: undefined, fixedLater: undefined });
    const w = pick(a, b, (x) => [x.at, stableStringify(base(x))]);
    const slip = a.slip && b.slip ? (a.slip > b.slip ? a.slip : b.slip) : ((_a = a.slip) !== null && _a !== void 0 ? _a : b.slip);
    if (a.at !== b.at)
        return clean({ ...base(w), slip, resolved: w.resolved, fixedLater: w.fixedLater });
    return clean({ ...base(w), slip, resolved: a.resolved || b.resolved || undefined, fixedLater: a.fixedLater || b.fixedLater || undefined });
}
function mergeMocks(a, b) {
    if (!a && !b)
        return undefined;
    const byId = new Map();
    for (const m of [...(a !== null && a !== void 0 ? a : []), ...(b !== null && b !== void 0 ? b : [])]) {
        const had = byId.get(m.id);
        byId.set(m.id, had ? pick(had, m, (x) => [x.finishedAt, stableStringify(x)]) : m);
    }
    return [...byId.values()].sort((x, y) => y.finishedAt - x.finishedAt || cmpText(x.id, y.id)).slice(0, journey_1.MAX_MOCKS);
}
function mergeReadiness(a, b) {
    if (!a && !b)
        return undefined;
    const higher = (x, y) => (x === null ? y : y === null ? x : Math.max(x, y));
    const byDay = new Map();
    for (const e of [...(a !== null && a !== void 0 ? a : []), ...(b !== null && b !== void 0 ? b : [])]) {
        const had = byDay.get(e.day);
        byDay.set(e.day, had ? { day: e.day, min: higher(had.min, e.min), last: higher(had.last, e.last) } : e);
    }
    const out = [...byDay.values()].sort((x, y) => cmpText(x.day, y.day));
    if (!out.length)
        return out;
    const newest = out[out.length - 1].day;
    return out.filter((e) => (0, streak_1.daysBetween)(e.day, newest) < examReady_1.LOG_KEEP_DAYS);
}
function mergeMilestones(a, b) {
    var _a;
    if (!a || !b)
        return a !== null && a !== void 0 ? a : b;
    const earned = (_a = mergeMap(a.earned, b.earned, Math.min)) !== null && _a !== void 0 ? _a : {};
    const seenOn = (m, k) => { var _a; return m.earned[k] !== undefined && !((_a = m.queue) !== null && _a !== void 0 ? _a : []).includes(k); };
    const queue = unionSorted(a.queue, b.queue)
        .filter((k) => earned[k] !== undefined && !seenOn(a, k) && !seenOn(b, k))
        .sort((x, y) => earned[x] - earned[y] || cmpText(x, y))
        .slice(0, MAX_QUEUE);
    const windowOf = (x, y) => (!x || !y ? x !== null && x !== void 0 ? x : y : pick(x, y, (v) => [v.length, stableStringify(v)]));
    const working = clean({
        sure: windowOf(a.sure, b.sure),
        myths: windowOf(a.myths, b.myths),
        signposts: windowOf(a.signposts, b.signposts),
        longIds: a.longIds || b.longIds ? unionSorted(a.longIds, b.longIds).slice(0, milestones_1.LONG_IDS_CAP) : undefined,
        gameMisses: mergeMap(a.gameMisses, b.gameMisses, (x, y) => maxDay(x, y)),
        cardMisses: mergeMap(a.cardMisses, b.cardMisses, (x, y) => maxDay(x, y)),
    });
    const flagged = (x, y) => {
        if (!x || !y)
            return x !== null && x !== void 0 ? x : y;
        const base = (v) => clean({ ...v, seen: undefined });
        const p = pick(x, y, (v) => [stableStringify(base(v))]);
        return clean({ ...base(p), seen: x.seen || y.seen || undefined });
    };
    const counts = mergeMap(a.counts, b.counts, Math.max);
    return clean({
        earned,
        queue: a.queue || b.queue ? queue : undefined,
        backfill: flagged(a.backfill, b.backfill),
        counts,
        ...working,
        days: max(a.days, b.days),
        lastDay: maxDay(a.lastDay, b.lastDay),
        returnedOn: maxDay(a.returnedOn, b.returnedOn),
        planters: mergeMap(a.planters, b.planters, Math.min),
        catalog: max(a.catalog, b.catalog),
        catalogFill: flagged(a.catalogFill, b.catalogFill),
    });
}
function mergePlant(certId, a, as, b, bs, firstSync = false) {
    var _a, _b;
    if (!a || !b)
        return a !== null && a !== void 0 ? a : b;
    const identity = (p) => clean({ species: p.species, plantedAt: p.plantedAt, replantedAt: p.replantedAt });
    const chosen = `plantId.${certId}`;
    const idKey = (x) => { var _a, _b; return [...(firstSync ? [x.p.growth] : []), (_a = x.st[chosen]) !== null && _a !== void 0 ? _a : 0, -((_b = x.p.replantedAt) !== null && _b !== void 0 ? _b : x.p.plantedAt), stableStringify(identity(x.p))]; };
    const kept = a.kept || b.kept ? unionSorted(a.kept, b.kept).slice(0, plant_1.MAX_KEPT) : undefined;
    const reached = mergeMap(a.reached, b.reached, Math.min);
    if (stableStringify(identity(a)) !== stableStringify(identity(b))) {
        const w = pick({ p: a, st: as }, { p: b, st: bs }, idKey).p;
        return clean({ ...w, growth: Math.max(a.growth, b.growth), reached, kept });
    }
    const key = `plant.${certId}`;
    const face = (p) => clean({ name: p.name, look: p.look });
    const f = pick({ p: a, at: (_a = as[key]) !== null && _a !== void 0 ? _a : 0 }, { p: b, at: (_b = bs[key]) !== null && _b !== void 0 ? _b : 0 }, (x) => [x.at, stableStringify(face(x.p))]).p;
    const flaggedBackfill = (() => {
        var _a;
        if (!a.backfill || !b.backfill)
            return (_a = a.backfill) !== null && _a !== void 0 ? _a : b.backfill;
        const base = (v) => clean({ ...v, seen: undefined });
        const p = pick(a.backfill, b.backfill, (v) => [stableStringify(base(v))]);
        return clean({ ...base(p), seen: a.backfill.seen || b.backfill.seen || undefined });
    })();
    return clean({
        ...identity(a),
        name: f.name,
        look: f.look,
        growth: Math.max(a.growth, b.growth),
        reached,
        pending: max(a.pending, b.pending),
        backfill: flaggedBackfill,
        kept,
        passedOn: maxDay(a.passedOn, b.passedOn),
    });
}
function mergeGrowth(a, b) {
    var _a;
    const rank = (g) => growth_1.GAME_TIERS.indexOf(g.tier);
    const lvl = pick(a, b, (g) => [rank(g), g.up, -g.down, stableStringify(g)]);
    const hits = !a.hits || !b.hits ? (_a = a.hits) !== null && _a !== void 0 ? _a : b.hits : pick(a.hits, b.hits, (h) => [h.length, stableStringify(h)]);
    return clean({ tier: lvl.tier, up: lvl.up, down: lvl.down, hits, run: max(a.run, b.run) });
}
function mergeCert(certId, a, as, b, bs, firstSync) {
    const working = (cp) => clean({ gameRecent: cp.gameRecent, studyPath: cp.studyPath });
    const w = pick(a, b, (cp) => [activityAt(cp), stableStringify(working(cp))]);
    const later = (x, y, at) => (x === undefined || y === undefined ? x !== null && x !== void 0 ? x : y : pick(x, y, (v) => [at(v), stableStringify(v)]));
    const moments = (() => {
        const x = a.moments;
        const y = b.moments;
        if (!x || !y)
            return x !== null && x !== void 0 ? x : y;
        const ew = (() => {
            var _a, _b;
            const p = x.examWeek;
            const q = y.examWeek;
            if (!p || !q)
                return p !== null && p !== void 0 ? p : q;
            if (p.for !== q.for)
                return p.for > q.for ? p : q;
            const days = (0, examWeek_1.cleanDays)([...((_a = p.days) !== null && _a !== void 0 ? _a : []), ...((_b = q.days) !== null && _b !== void 0 ? _b : [])]);
            return clean({ for: p.for, done: (0, examWeek_1.cleanDone)([...p.done, ...q.done]), hidden: p.hidden || q.hidden || undefined, days: days.length ? days : undefined });
        })();
        return clean({ readiness: mergeReadiness(x.readiness, y.readiness), readySeenAt: max(x.readySeenAt, y.readySeenAt), examWeek: ew });
    })();
    const union = (x, y) => (x || y ? unionSorted(x, y) : undefined);
    return clean({
        answers: mergeMap(a.answers, b.answers, mergeAnswer),
        review: mergeMap(a.review, b.review, (x, y) => later(x, y, (v) => v.lastSeen)),
        bookmarks: union(a.bookmarks, b.bookmarks),
        mocks: mergeMocks(a.mocks, b.mocks),
        lessonsDone: union(a.lessonsDone, b.lessonsDone),
        mistakes: mergeMap(a.mistakes, b.mistakes, mergeMistake),
        gameBest: mergeMap(a.gameBest, b.gameBest, Math.max),
        ...working(w),
        gameGrowth: mergeMap(a.gameGrowth, b.gameGrowth, mergeGrowth),
        notesRead: union(a.notesRead, b.notesRead),
        notesViewed: union(a.notesViewed, b.notesViewed),
        notesEverRead: max(a.notesEverRead, b.notesEverRead),
        moments,
        mastery: mergeMap(a.mastery, b.mastery, (x, y) => clean({ firstDay: minDay(x.firstDay, y.firstDay), firstAt: min(x.firstAt, y.firstAt), masteredAt: minDay(x.masteredAt, y.masteredAt) })),
        cards: mergeMap(a.cards, b.cards, (x, y) => later(x, y, (v) => v.lastSeen)),
        milestones: mergeMilestones(a.milestones, b.milestones),
        plant: mergePlant(certId, a.plant, as, b.plant, bs, firstSync),
        qNotes: mergeMap(a.qNotes, b.qNotes, questionNotes_1.mergeNote),
    });
}
function runEndingOn(days, last) {
    let n = 0;
    let d = last;
    while (days.has(d)) {
        n++;
        const [y, m, dd] = d.split('-').map(Number);
        const prev = new Date(Date.UTC(y, m - 1, dd - 1));
        d = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
    }
    return n;
}
function mergeStreak(a, b) {
    var _a, _b, _c;
    const lastDay = (_a = maxDay(a.lastDay, b.lastDay)) !== null && _a !== void 0 ? _a : null;
    const recent = unionSorted((_b = a.recentDays) !== null && _b !== void 0 ? _b : (a.lastDay ? [a.lastDay] : []), (_c = b.recentDays) !== null && _c !== void 0 ? _c : (b.lastDay ? [b.lastDay] : [])).slice(-MAX_RECENT_DAYS);
    let current = 0;
    if (lastDay) {
        if (a.lastDay === lastDay)
            current = Math.max(current, a.current);
        if (b.lastDay === lastDay)
            current = Math.max(current, b.current);
        current = Math.max(current, runEndingOn(new Set(recent), lastDay));
    }
    const rest = pick(a, b, (s) => { var _a, _b; return [(_a = s.lastDay) !== null && _a !== void 0 ? _a : '', stableStringify((_b = s.restDay) !== null && _b !== void 0 ? _b : null)]; }).restDay;
    return clean({ current, best: Math.max(a.best, b.best, current), lastDay, restDay: rest, recentDays: a.recentDays || b.recentDays ? recent : undefined });
}
function mergeReports(a, b) {
    if (!a && !b)
        return undefined;
    const byRef = new Map();
    for (const r of [...(a !== null && a !== void 0 ? a : []), ...(b !== null && b !== void 0 ? b : [])]) {
        const had = byRef.get(r.ref);
        if (!had) {
            byRef.set(r.ref, r);
            continue;
        }
        const base = (x) => clean({ ...x, creditSeen: undefined });
        const p = pick(had, r, (x) => [stableStringify(base(x))]);
        byRef.set(r.ref, clean({ ...base(p), creditSeen: had.creditSeen || r.creditSeen || undefined }));
    }
    return [...byRef.values()].sort((x, y) => y.at - x.at || cmpText(x.ref, y.ref)).slice(0, support_1.MAX_REPORTS);
}
function mergeProgressRaw(a, b, firstSyncAt) {
    var _a, _b;
    const byCert = (_a = mergeMap(a.state.byCert, b.state.byCert, (x, y) => x)) !== null && _a !== void 0 ? _a : {};
    const stamps = (0, exports.mergeStamps)(a.stamps, b.stamps);
    for (const c of Object.keys(byCert)) {
        const x = a.state.byCert[c];
        const y = b.state.byCert[c];
        if (!x || !y)
            continue;
        byCert[c] = mergeCert(c, x, a.stamps, y, b.stamps, firstSyncAt !== undefined);
        const id = (p) => stableStringify(clean({ species: p.species, plantedAt: p.plantedAt, replantedAt: p.replantedAt }));
        if (firstSyncAt !== undefined && x.plant && y.plant && id(x.plant) !== id(y.plant))
            stamps[`plantId.${c}`] = Math.max((_b = stamps[`plantId.${c}`]) !== null && _b !== void 0 ? _b : 0, firstSyncAt);
    }
    return {
        state: clean({ byCert, streak: mergeStreak(a.state.streak, b.state.streak), reports: mergeReports(a.state.reports, b.state.reports) }),
        stamps,
    };
}
const PLACEHOLDER = {
    settings: { onboarded: true },
    progress: { today: { day: '', answered: 0 } },
};
function withoutDeviceLocal(store, state) {
    const drop = new Set(store === 'settings' ? exports.DEVICE_LOCAL_SETTINGS : exports.DEVICE_LOCAL_PROGRESS);
    return Object.fromEntries(Object.entries(state).filter(([k]) => !drop.has(k)));
}
function deviceLocalOf(store, state) {
    const keep = new Set(store === 'settings' ? exports.DEVICE_LOCAL_SETTINGS : exports.DEVICE_LOCAL_PROGRESS);
    return Object.fromEntries(Object.entries(state).filter(([k]) => keep.has(k)));
}
function finish(store, side, ctx) {
    const phoneShape = { ...side.state, ...PLACEHOLDER[store] };
    const fitted = (0, backup_1.fitForBackup)(store === 'settings' ? { settings: phoneShape, progress: {} } : { settings: {}, progress: phoneShape })[store];
    const checked = (0, backup_1.readStores)({ [store]: { version: store === 'settings' ? saveMigrations_1.SETTINGS_VERSION : saveMigrations_1.PROGRESS_VERSION, state: fitted } }, { appVersion: '0.0.0' }, ctx.knownCertIds, undefined, undefined, {
        strict: true,
        only: store,
        mocksMayBeCut: true,
    })[store];
    return { state: withoutDeviceLocal(store, JSON.parse(JSON.stringify(checked))), stamps: side.stamps };
}
function mergeSides(store, a, b, ctx) {
    const rawMerge = (p, q) => (store === 'settings'
        ? mergeSettingsRaw(p, q)
        : mergeProgressRaw(p, q, ctx.firstSync ? ctx.now : undefined));
    const x = rawMerge(clampFuture(store, a, ctx.now), clampFuture(store, a, ctx.now));
    const y = b ? rawMerge(clampFuture(store, b, ctx.now), clampFuture(store, b, ctx.now)) : x;
    return finish(store, rawMerge(x, y), ctx);
}
function toPayload(side) {
    return { ...side.state, changedAt: side.stamps };
}
function localSide(store, fittedPhoneState, stamps, ctx) {
    return finish(store, { state: withoutDeviceLocal(store, fittedPhoneState), stamps: readStamps(stamps) }, ctx);
}
function readSnapshot(store, snap, ctx) {
    const raw = snap.state;
    if ((0, backup_1.hasProtoKey)(raw))
        throw new backup_1.BackupError('bad-data', store);
    if (store === 'settings' && (0, backup_1.utf8Bytes)(JSON.stringify(raw !== null && raw !== void 0 ? raw : null)) > exports.MAX_SETTINGS_BYTES)
        throw new backup_1.BackupError('too-big', store);
    const state = isObj(raw) ? { ...withoutDeviceLocal(store, raw), ...PLACEHOLDER[store] } : raw;
    const checked = (0, backup_1.readStores)({ [store]: { version: snap.storeVersion, state } }, { appVersion: snap.appVersion }, ctx.knownCertIds, undefined, ctx.thisApp, {
        strict: true,
        only: store,
        mocksMayBeCut: true,
    })[store];
    return { state: withoutDeviceLocal(store, JSON.parse(JSON.stringify(checked))), stamps: readStamps(isObj(raw) ? raw.changedAt : undefined) };
}
function holdsStudy(p, s) {
    var _a, _b;
    if (!progressIsEmpty(p) || p.streak.best > 0 || ((_a = p.reports) !== null && _a !== void 0 ? _a : []).length > 0)
        return true;
    const some = (x) => (Array.isArray(x) ? x.length > 0 : Boolean(x && Object.keys(x).length > 0));
    const certHolds = Object.values(p.byCert).some((cp) => {
        var _a, _b;
        return some(cp.bookmarks) || some(cp.notesRead) || some(cp.notesViewed) || some(cp.mocks) || some(cp.mistakes) || some(cp.review) || some(cp.cards) ||
            some(cp.gameBest) || some(cp.gameGrowth) || some(cp.mastery) || some((_a = cp.milestones) === null || _a === void 0 ? void 0 : _a.earned) || Boolean(cp.plant) ||
            Object.values((_b = cp.qNotes) !== null && _b !== void 0 ? _b : {}).some(questionNotes_1.isLiveNote);
    });
    return certHolds || Object.values((_b = s.examDates) !== null && _b !== void 0 ? _b : {}).some(Boolean);
}
function progressIsEmpty(p) {
    const any = Object.values(p.byCert).some((cp) => { var _a, _b; return Object.keys((_a = cp.answers) !== null && _a !== void 0 ? _a : {}).length > 0 || ((_b = cp.lessonsDone) !== null && _b !== void 0 ? _b : []).length > 0; });
    return !any && !p.streak.lastDay;
}
  };
  links["src/engine/syncMeta.ts"] = {};
  defs["src/engine/syncMeta.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYNC_OFF = void 0;
exports.SYNC_OFF = {
    enabled: false,
    accountHash: null,
    lastRev: { settings: null, progress: null },
    lastAt: { settings: null, progress: null },
    lastPushedHash: { settings: null, progress: null },
    pausedRev: { settings: null, progress: null },
    lastSyncAt: null,
    pausedReason: null,
    deferredPull: false,
};
  };
  links["src/engine/syncPlan.ts"] = {"./backup":"src/engine/backup.ts"};
  defs["src/engine/syncPlan.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromNewerApp = fromNewerApp;
exports.implausibleApp = implausibleApp;
exports.firstCase = firstCase;
exports.plan = plan;
const backup_1 = require("./backup");
function fromNewerApp(head, thisApp) {
    return Boolean(head && (0, backup_1.compareVersions)(head.appVersion, thisApp, 2) > 0);
}
function implausibleApp(head, thisApp) {
    const major = (v) => Number(v.split('.')[0]);
    return Boolean(head && Number.isFinite(major(head.appVersion)) && Number.isFinite(major(thisApp)) && major(head.appVersion) > major(thisApp) + 1);
}
function firstCase(localEmpty, accountHasProgress) {
    if (!localEmpty && accountHasProgress)
        return 'both';
    if (!localEmpty)
        return 'phone';
    if (accountHasProgress)
        return 'account';
    return 'none';
}
function plan(i) {
    if (i.switchPending)
        return { kind: 'pause', reason: 'switch' };
    if (implausibleApp(i.head, i.thisApp))
        return { kind: 'pause', reason: 'unreadable' };
    if (fromNewerApp(i.head, i.thisApp))
        return { kind: 'pause', reason: 'newer' };
    if (!i.setUp)
        return { kind: 'first', case: firstCase(i.localEmpty, i.head !== null) };
    if (i.head === null && i.meta.lastRev !== null)
        return { kind: 'pause', reason: 'remote_deleted' };
    const sameWrite = i.head !== null && i.head.rev === i.meta.lastRev && (i.meta.lastAt == null || i.head.updatedAt === undefined || i.head.updatedAt === i.meta.lastAt);
    const remoteChanged = i.head !== null && !sameWrite;
    const localChanged = i.localHash !== i.meta.lastPushedHash;
    if (!remoteChanged && !localChanged)
        return { kind: 'idle' };
    if (!remoteChanged) {
        if (i.localEmpty && i.head !== null)
            return { kind: 'merge', expectedRev: i.head.rev };
        return { kind: 'push', expectedRev: i.meta.lastRev };
    }
    if (!localChanged)
        return { kind: 'pull' };
    return { kind: 'merge', expectedRev: i.head.rev };
}
  };
  links["src/engine/tips.ts"] = {};
  defs["src/engine/tips.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tipParts = tipParts;
exports.runnerUp = runnerUp;
exports.eliminateTip = eliminateTip;
exports.splitMissTips = splitMissTips;
const LEGACY_LABELS = ['The trap', 'The mindset', 'Exam-day shortcut', 'One more thing'];
const V2_LABELS = {
    Eliminate: 'Eliminate two',
    'Final two': 'Final two',
    'Exam cue': 'Exam cue',
};
function tipParts(tip, index) {
    var _a;
    const m = tip.match(/^(Eliminate|Final two|Exam cue):\s*/);
    if (m) {
        const rest = tip.slice(m[0].length);
        return { label: V2_LABELS[m[1]], body: rest.charAt(0).toUpperCase() + rest.slice(1) };
    }
    return { label: (_a = LEGACY_LABELS[index]) !== null && _a !== void 0 ? _a : 'Tip', body: tip };
}
function runnerUp(tips, correct) {
    const finalTwo = tips.find((t) => /^Final two:/.test(t));
    if (!finalTwo)
        return undefined;
    const letters = [...finalTwo.matchAll(/\{\{([A-D])\}\}/g)].map((m) => m[1]);
    return letters.find((l) => l !== correct);
}
function eliminateTip(tips) {
    return tips.find((t) => /^Eliminate:/.test(t));
}
function splitMissTips(tips) {
    const first = [];
    const rest = [];
    tips.forEach((tip, i) => {
        const label = tipParts(tip, i).label;
        (label === 'Exam cue' || label === 'Exam-day shortcut' ? first : rest).push(i);
    });
    return { first, rest };
}
  };
  links["src/engine/webImport.ts"] = {"./backup":"src/engine/backup.ts","./displayName":"src/engine/displayName.ts","./syncMerge":"src/engine/syncMerge.ts","./questionNotes":"src/engine/questionNotes.ts","./answerClock":"src/engine/answerClock.ts","./journey":"src/engine/journey.ts","./srs":"src/engine/srs.ts","./examDay":"src/engine/examDay.ts","./streak":"src/engine/streak.ts"};
  defs["src/engine/webImport.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEB_NOT_IN_FILE_DATED = exports.WEB_NOT_IN_FILE = exports.WEB_NAME_NOTE = exports.WEB_NAME_PREFIX = exports.APP_MOCK_ORIGIN = exports.WEB_MOCK_PREFIX = exports.FUTURE_SLACK_MS = exports.WEB_EXAM_DATE_MAX_DAYS = exports.WEB_NAME_MAX_UNITS = exports.WebImportError = exports.WEB_IMPORT_ERROR_COPY = exports.WEB_MAX_PROFILES = exports.WEB_MAX_BYTES = exports.WEB_VERSIONS = exports.WEB_MARKER = void 0;
exports.readWebDisplayName = readWebDisplayName;
exports.readWebExamDate = readWebExamDate;
exports.stripInvisible = stripInvisible;
exports.readWebState = readWebState;
exports.isWebExport = isWebExport;
exports.parseWebText = parseWebText;
exports.readWebExport = readWebExport;
exports.profileIsEmpty = profileIsEmpty;
exports.streakFromDays = streakFromDays;
exports.mergeWebProgress = mergeWebProgress;
exports.tooBigSummary = tooBigSummary;
exports.webAddSummary = webAddSummary;
exports.webAddLines = webAddLines;
exports.webSkipLines = webSkipLines;
exports.webNotInFile = webNotInFile;
const backup_1 = require("./backup");
const displayName_1 = require("./displayName");
const syncMerge_1 = require("./syncMerge");
const questionNotes_1 = require("./questionNotes");
const answerClock_1 = require("./answerClock");
const journey_1 = require("./journey");
const srs_1 = require("./srs");
const examDay_1 = require("./examDay");
const streak_1 = require("./streak");
exports.WEB_MARKER = 'cisaMindsetExport';
exports.WEB_VERSIONS = [1];
exports.WEB_MAX_BYTES = 8 * 1024 * 1024;
exports.WEB_MAX_PROFILES = 20;
const MAX_ENTRIES = 20000;
const MAX_IDS = 5000;
const MAX_DAYS = 200;
const OLDEST = Date.UTC(2000, 0, 1);
const NEWEST = Date.UTC(2100, 11, 31);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROTO = new Set(['__proto__', 'constructor', 'prototype']);
exports.WEB_IMPORT_ERROR_COPY = {
    'too-big': 'This website progress file is too big to read. Nothing was changed.',
    newer: 'This progress file was made by a newer version of the KaiSip website. Update the app, then try again. Nothing was changed.',
    'bad-data': 'This website progress file is damaged, so it can’t be added. Export it again from the website. Nothing was changed.',
    empty: 'This website progress file has no study in it yet. Nothing was changed.',
};
class WebImportError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}
exports.WebImportError = WebImportError;
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const keysOf = (o, max = MAX_ENTRIES) => Object.keys(o).filter((k) => !PROTO.has(k)).slice(0, max);
const isTime = (x) => typeof x === 'number' && Number.isFinite(x) && x >= OLDEST && x <= NEWEST;
const whole = (x, max = 10000000) => {
    const n = typeof x === 'number' ? Math.floor(x) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const LETTERS = ['A', 'B', 'C', 'D'];
const CONFIDENCE = ['sure', 'unsure', 'guessing'];
const SLIPS = ['role', 'priority', 'tech-first', 'symptom', 'misread', 'knowledge'];
const TIMINGS = ['standard', 'plus25', 'plus50', 'untimed'];
const oneOf = (list, x) => list.includes(x) ? x : undefined;
function isDay(x) {
    if (typeof x !== 'string' || !DAY_RE.test(x))
        return false;
    const [y, m, d] = x.split('-').map(Number);
    const back = new Date(Date.UTC(y, m - 1, d));
    return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d && y >= 2000 && y <= 2100;
}
exports.WEB_NAME_MAX_UNITS = 64;
function readWebDisplayName(raw) {
    if (!isObj(raw))
        return undefined;
    const text = raw.displayName;
    if (typeof text !== 'string' || text.length > exports.WEB_NAME_MAX_UNITS || /[<>]/.test(text))
        return undefined;
    return (0, displayName_1.cleanDisplayName)(text) || undefined;
}
exports.WEB_EXAM_DATE_MAX_DAYS = 3 * 366;
function readWebExamDate(raw, now) {
    if (!isObj(raw) || !isDay(raw.examDate))
        return undefined;
    const ahead = (0, streak_1.daysBetween)((0, streak_1.dayKey)(now), raw.examDate);
    return ahead >= -1 && ahead <= exports.WEB_EXAM_DATE_MAX_DAYS ? raw.examDate : undefined;
}
const INVISIBLE = /[​-‏‪-‮⁦-⁩]/g;
function stripInvisible(text) {
    return text.replace(INVISIBLE, '');
}
function cleanName(x) {
    if (typeof x !== 'string')
        return '';
    return stripInvisible(x).replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 32);
}
exports.FUTURE_SLACK_MS = srs_1.DAY_MS;
const LONGEST_REVIEW_MS = Math.max(...Object.values(srs_1.INTERVAL_DAYS)) * srs_1.DAY_MS;
exports.WEB_MOCK_PREFIX = 'web-';
exports.APP_MOCK_ORIGIN = 'app';
function readWebState(state, known, now, opts = {}) {
    var _a;
    const limit = now + exports.FUTURE_SLACK_MS;
    const lastDayAllowed = (0, streak_1.dayKey)(limit);
    let future = 0;
    const past = (x) => {
        if (!isTime(x))
            return false;
        if (x > limit) {
            future += 1;
            return false;
        }
        return true;
    };
    const unknownIds = new Set();
    const keepQ = (id) => {
        if (!questionNotes_1.NOTE_ID_RE.test(id))
            return false;
        if (known.question(id))
            return true;
        unknownIds.add(`q:${id}`);
        return false;
    };
    const answers = {};
    const log = isObj(state.answerLog) ? state.answerLog : {};
    for (const id of keysOf(log)) {
        const e = log[id];
        if (!isObj(e) || !keepQ(id) || !past(e.lastAt))
            continue;
        if (Object.keys(answers).length >= MAX_IDS)
            break;
        const attempts = Math.max(1, whole(e.attempts));
        const rec = { attempts, correctCount: Math.min(attempts, whole(e.correctCount)), lastCorrect: e.lastCorrect === true, lastAt: e.lastAt };
        if (e.lastAssisted === true)
            rec.lastAssisted = true;
        if (e.lastRetest === true)
            rec.lastRetest = true;
        if (e.lastGame === true)
            rec.lastGame = true;
        if (typeof e.ms === 'number' && Number.isFinite(e.ms))
            rec.ms = Math.min(answerClock_1.MAX_ANSWER_MS, Math.max(0, Math.round(e.ms)));
        const conf = oneOf(CONFIDENCE, e.lastConfidence);
        if (conf)
            rec.lastConfidence = conf;
        answers[id] = rec;
    }
    const noDetailIds = new Set();
    if (isObj(state.answeredIds)) {
        for (const bucket of keysOf(state.answeredIds, 20)) {
            const ids = state.answeredIds[bucket];
            if (!isObj(ids))
                continue;
            for (const id of keysOf(ids))
                if (ids[id] === true && known.question(id) && !answers[id])
                    noDetailIds.add(id);
        }
    }
    const review = {};
    const rv = isObj(state.review) ? state.review : {};
    for (const id of keysOf(rv)) {
        const e = rv[id];
        if (!isObj(e) || !keepQ(id))
            continue;
        if (isTime(e.lastSeen) && !past(e.lastSeen))
            continue;
        if (Object.keys(review).length >= MAX_IDS)
            break;
        const box = Math.min(srs_1.MAX_BOX, Math.max(1, Math.round(typeof e.box === 'number' && Number.isFinite(e.box) ? e.box : 1)));
        const lastSeen = isTime(e.lastSeen) ? e.lastSeen : OLDEST;
        const dueAt = Math.min(isTime(e.dueAt) ? e.dueAt : OLDEST, lastSeen + LONGEST_REVIEW_MS);
        review[id] = { box, dueAt: Math.max(OLDEST, dueAt), lastSeen, reps: whole(e.reps) };
    }
    const bookmarks = [];
    if (Array.isArray(state.bookmarks)) {
        for (const q of state.bookmarks.slice(0, MAX_ENTRIES)) {
            const id = isObj(q) && typeof q.id === 'string' ? q.id : undefined;
            if (id && keepQ(id) && !bookmarks.includes(id) && bookmarks.length < MAX_IDS)
                bookmarks.push(id);
        }
    }
    const mistakes = {};
    const ml = isObj(state.mistakeLog) ? state.mistakeLog : {};
    for (const id of keysOf(ml)) {
        const e = ml[id];
        if (!isObj(e) || !keepQ(id) || !past(e.at))
            continue;
        if (Object.keys(mistakes).length >= MAX_IDS)
            break;
        const m = { at: e.at };
        const picked = oneOf(LETTERS, e.picked);
        if (picked)
            m.picked = picked;
        if (e.resolved === true)
            m.resolved = true;
        const conf = oneOf(CONFIDENCE, e.confidence);
        if (conf)
            m.confidence = conf;
        if (e.fixedLater === true)
            m.fixedLater = true;
        const slip = oneOf(SLIPS, e.slip);
        if (slip)
            m.slip = slip;
        mistakes[id] = m;
    }
    const mocks = [];
    if (Array.isArray(state.mockHistory)) {
        const seen = new Set();
        for (const m of state.mockHistory.slice(0, MAX_ENTRIES)) {
            if (!isObj(m) || typeof m.id !== 'string' || !questionNotes_1.NOTE_ID_RE.test(m.id) || seen.has(m.id) || !past(m.finishedAt))
                continue;
            seen.add(m.id);
            const total = whole(m.total, 1000);
            if (total === 0)
                continue;
            const byDomain = {};
            if (isObj(m.byDomain)) {
                for (const d of keysOf(m.byDomain, 50)) {
                    const t = m.byDomain[d];
                    if (!known.domain(d) || !isObj(t))
                        continue;
                    const dt = whole(t.total, 1000);
                    byDomain[d] = { total: dt, correct: Math.min(dt, whole(t.correct, 1000)) };
                }
            }
            const r = {
                id: m.origin === exports.APP_MOCK_ORIGIN || ((_a = opts.appMockIds) === null || _a === void 0 ? void 0 : _a.has(m.id)) ? m.id : `${exports.WEB_MOCK_PREFIX}${m.id}`,
                finishedAt: m.finishedAt,
                total,
                correct: Math.min(total, whole(m.correct, 1000)),
                minutesUsed: Math.min(1440, Math.max(0, typeof m.minutesUsed === 'number' && Number.isFinite(m.minutesUsed) ? m.minutesUsed : 0)),
                byDomain,
            };
            const timing = oneOf(TIMINGS, m.timing);
            if (timing)
                r.timing = timing;
            if (typeof m.minutesAllowed === 'number' && Number.isFinite(m.minutesAllowed))
                r.minutesAllowed = Math.min(1440, Math.max(0, m.minutesAllowed));
            if (typeof m.medianSec === 'number' && Number.isFinite(m.medianSec))
                r.medianSec = Math.min(answerClock_1.MAX_ANSWER_MS / 1000, Math.max(0, m.medianSec));
            if (m.unanswered !== undefined)
                r.unanswered = Math.min(total, whole(m.unanswered, 1000));
            mocks.push(r);
        }
        mocks.sort((a, b) => b.finishedAt - a.finishedAt);
        mocks.splice(journey_1.MAX_MOCKS);
    }
    const ticks = (x) => {
        if (!isObj(x))
            return [];
        const out = [];
        for (const id of keysOf(x)) {
            const v = x[id];
            if (!(v === true || isTime(v)) || !questionNotes_1.NOTE_ID_RE.test(id))
                continue;
            if (typeof v === 'number' && !past(v))
                continue;
            if (state.topicTicksSchema === 2 && known.note(id)) {
                if (out.length < MAX_IDS)
                    out.push(id);
            }
            else
                unknownIds.add(`note:${id}`);
        }
        return out.sort();
    };
    const notesRead = ticks(state.topicReviewed);
    const notesViewed = ticks(state.topicViewed);
    const qNotes = {};
    const qn = isObj(state.qNotes) ? state.qNotes : {};
    let chars = 0;
    for (const id of keysOf(qn)) {
        const e = qn[id];
        if (!isObj(e) || typeof e.text !== 'string' || !keepQ(id))
            continue;
        const text = (0, questionNotes_1.capNoteText)(stripInvisible(e.text));
        if (!text.trim())
            continue;
        if (isTime(e.ts) && !past(e.ts))
            continue;
        if (chars + text.length > questionNotes_1.NOTES_TOTAL_MAX || Object.keys(qNotes).length >= MAX_IDS)
            break;
        chars += text.length;
        qNotes[id] = { text, ts: isTime(e.ts) ? e.ts : OLDEST };
    }
    const days = [];
    if (Array.isArray(state.studyDays)) {
        for (const d of state.studyDays.slice(0, MAX_ENTRIES)) {
            if (!isDay(d))
                continue;
            if (d > lastDayAllowed)
                future += 1;
            else
                days.push(d);
        }
    }
    const studyDays = [...new Set(days)].sort().slice(-MAX_DAYS);
    const cert = {};
    if (Object.keys(answers).length)
        cert.answers = answers;
    if (Object.keys(review).length)
        cert.review = review;
    if (bookmarks.length)
        cert.bookmarks = [...bookmarks].sort();
    if (Object.keys(mistakes).length)
        cert.mistakes = mistakes;
    if (mocks.length)
        cert.mocks = mocks;
    if (notesRead.length) {
        cert.notesRead = notesRead;
        cert.notesEverRead = notesRead.length;
    }
    if (notesViewed.length)
        cert.notesViewed = notesViewed;
    if (Object.keys(qNotes).length)
        cert.qNotes = qNotes;
    return { cert, studyDays, unmatched: unknownIds.size, noDetail: noDetailIds.size, future };
}
function readProfile(key, p, known, now) {
    if (!isObj(p) || !isObj(p.state))
        return null;
    const read = readWebState(p.state, known, now);
    return { key, name: cleanName(p.name), ...(isTime(p.lastActive) && p.lastActive <= now + exports.FUTURE_SLACK_MS ? { lastActive: p.lastActive } : {}), ...read };
}
function isWebExport(raw) {
    return isObj(raw) && raw[exports.WEB_MARKER] === true;
}
function parseWebText(text) {
    if (text.length > exports.WEB_MAX_BYTES)
        throw new WebImportError('too-big');
    try {
        return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    }
    catch {
        throw new WebImportError('bad-data');
    }
}
function readWebExport(raw, known, now) {
    if (!isObj(raw) || raw[exports.WEB_MARKER] !== true)
        throw new WebImportError('bad-data');
    if (typeof raw.version !== 'number' || !Number.isInteger(raw.version))
        throw new WebImportError('bad-data');
    if (!exports.WEB_VERSIONS.includes(raw.version))
        throw new WebImportError(raw.version > Math.max(...exports.WEB_VERSIONS) ? 'newer' : 'bad-data');
    const out = [];
    if (raw.profile !== undefined) {
        const p = readProfile('profile', raw.profile, known, now);
        if (!p)
            throw new WebImportError('bad-data');
        out.push(p);
    }
    if (raw.profiles !== undefined) {
        const room = Math.max(0, exports.WEB_MAX_PROFILES - out.length);
        const list = Array.isArray(raw.profiles)
            ? raw.profiles.slice(0, room).map((p, i) => [isObj(p) && typeof p.id === 'string' ? p.id : `profile-${i + 1}`, p])
            : isObj(raw.profiles)
                ? keysOf(raw.profiles, room).map((k) => [k, raw.profiles[k]])
                : [];
        for (const [key, p] of list) {
            const read = readProfile(String(key).slice(0, 64), p, known, now);
            if (read)
                out.push(read);
        }
        if (!out.length)
            throw new WebImportError('bad-data');
    }
    if (!out.length)
        throw new WebImportError('bad-data');
    const examDate = readWebExamDate(raw, now);
    const displayName = readWebDisplayName(raw);
    return examDate || displayName ? out.map((p) => ({ ...p, ...(examDate ? { examDate } : {}), ...(displayName ? { displayName } : {}) })) : out;
}
function profileIsEmpty(p) {
    return Object.keys(p.cert).length === 0 && p.studyDays.length === 0;
}
function streakFromDays(days, today, restDay) {
    const upTo = days.filter((d) => d <= today);
    if (!upTo.length)
        return { current: 0, best: 0, lastDay: null, ...(restDay !== undefined ? { restDay } : {}) };
    let run = 1;
    for (let i = 1; i < upTo.length; i++)
        run = (0, streak_1.daysBetween)(upTo[i - 1], upTo[i]) === 1 ? run + 1 : 1;
    return { current: run, best: run, lastDay: upTo[upTo.length - 1], recentDays: [...upTo], ...(restDay !== undefined ? { restDay } : {}) };
}
function webSideFor(mine, p) {
    var _a, _b, _c, _d, _e;
    const has = (m, id) => Boolean(m && Object.prototype.hasOwnProperty.call(m, id));
    const cert = { ...p.cert };
    delete cert.qNotes;
    delete cert.review;
    delete cert.mocks;
    const notes = Object.entries((_a = p.cert.qNotes) !== null && _a !== void 0 ? _a : {}).filter(([id]) => !has(mine.qNotes, id));
    if (notes.length)
        cert.qNotes = Object.fromEntries(notes);
    const review = Object.entries((_b = p.cert.review) !== null && _b !== void 0 ? _b : {}).filter(([id, r]) => { var _a; return !has(mine.review, id) && !(((_a = mine.answers) === null || _a === void 0 ? void 0 : _a[id]) && mine.answers[id].lastAt >= r.lastSeen); });
    if (review.length)
        cert.review = Object.fromEntries(review);
    const myMocks = new Set(((_c = mine.mocks) !== null && _c !== void 0 ? _c : []).map((m) => m.id));
    const newMocks = ((_d = p.cert.mocks) !== null && _d !== void 0 ? _d : []).filter((m) => !myMocks.has(m.id));
    const room = Math.max(0, journey_1.MAX_MOCKS - myMocks.size);
    const kept = newMocks.slice(0, room);
    const mocks = [...((_e = p.cert.mocks) !== null && _e !== void 0 ? _e : []).filter((m) => myMocks.has(m.id)), ...kept];
    if (mocks.length)
        cert.mocks = mocks;
    if (mine.gameRecent)
        cert.gameRecent = mine.gameRecent;
    if (mine.studyPath)
        cert.studyPath = mine.studyPath;
    return { cert, mocksSkipped: newMocks.length - kept.length };
}
function mergeWebProgress(phone, p, certId, ctx) {
    var _a, _b;
    if (!ctx.knownCertIds.includes(certId))
        throw new backup_1.BackupError('unknown-cert', certId);
    const mine = (_a = phone.byCert[certId]) !== null && _a !== void 0 ? _a : {};
    const { cert } = webSideFor(mine, p);
    const webState = { byCert: { [certId]: cert }, streak: streakFromDays(p.studyDays, (0, streak_1.dayKey)(ctx.now), (_b = phone.streak.restDay) !== null && _b !== void 0 ? _b : null) };
    const local = (0, syncMerge_1.localSide)('progress', phone, {}, ctx);
    const web = (0, syncMerge_1.localSide)('progress', webState, {}, ctx);
    const merged = (0, syncMerge_1.mergeSides)('progress', local, web, ctx);
    return { ...merged.state, ...(0, syncMerge_1.deviceLocalOf)('progress', phone) };
}
function tooBigSummary(p) {
    return { answers: 0, updated: 0, saved: 0, notesRead: 0, qNotes: 0, mocks: 0, mocksSkipped: 0, studyDays: 0, unmatched: p.unmatched, noDetail: p.noDetail, future: p.future, tooBig: true, nothingNew: false };
}
function webAddSummary(phone, merged, p, certId, now, phoneExamDate, phoneName) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const cp = (_a = phone.byCert[certId]) !== null && _a !== void 0 ? _a : {};
    const out = (_b = merged.byCert[certId]) !== null && _b !== void 0 ? _b : {};
    const has = (m, id) => Boolean(m && Object.prototype.hasOwnProperty.call(m, id));
    const newIn = (x, mine) => {
        const set = new Set(mine !== null && mine !== void 0 ? mine : []);
        return (x !== null && x !== void 0 ? x : []).filter((v) => !set.has(v)).length;
    };
    const answers = Object.keys((_c = out.answers) !== null && _c !== void 0 ? _c : {}).filter((id) => !has(cp.answers, id)).length;
    const updated = Object.entries((_d = out.answers) !== null && _d !== void 0 ? _d : {}).filter(([id, a]) => has(cp.answers, id) && a.lastAt > cp.answers[id].lastAt).length;
    const qNotes = Object.entries((_e = out.qNotes) !== null && _e !== void 0 ? _e : {}).filter(([id, note]) => !has(cp.qNotes, id) && (0, questionNotes_1.isLiveNote)(note)).length;
    const mockIds = new Set(((_f = cp.mocks) !== null && _f !== void 0 ? _f : []).map((m) => m.id));
    const mocks = ((_g = out.mocks) !== null && _g !== void 0 ? _g : []).filter((m) => !mockIds.has(m.id)).length;
    const fileMocks = ((_h = p.cert.mocks) !== null && _h !== void 0 ? _h : []).filter((m) => !mockIds.has(m.id)).length;
    const saved = newIn(out.bookmarks, cp.bookmarks);
    const notesRead = newIn(out.notesRead, cp.notesRead);
    const myDays = (_j = phone.streak.recentDays) !== null && _j !== void 0 ? _j : (phone.streak.lastDay ? [phone.streak.lastDay] : []);
    const oldestKept = myDays.length ? [...myDays].sort()[0] : '';
    const today = (0, streak_1.dayKey)(now);
    const studyDays = p.studyDays.filter((d) => !myDays.includes(d) && d > oldestKept && d <= today).length;
    const sameMistake = (a, b) => a.at === b.at && a.picked === b.picked && a.slip === b.slip && !!a.resolved === !!b.resolved && !!a.fixedLater === !!b.fixedLater && a.confidence === b.confidence;
    const mistakes = Object.entries((_k = out.mistakes) !== null && _k !== void 0 ? _k : {}).filter(([id, m]) => { var _a; return !((_a = cp.mistakes) === null || _a === void 0 ? void 0 : _a[id]) || !sameMistake(cp.mistakes[id], m); }).length;
    const review = Object.keys((_l = out.review) !== null && _l !== void 0 ? _l : {}).filter((id) => !has(cp.review, id)).length;
    const viewed = newIn(out.notesViewed, cp.notesViewed);
    const examDate = p.examDate && !phoneExamDate ? p.examDate : undefined;
    const examDateKept = Boolean(p.examDate && phoneExamDate && phoneExamDate !== p.examDate);
    const mine = (0, displayName_1.cleanDisplayName)(phoneName);
    const displayName = p.displayName && !mine ? p.displayName : undefined;
    const displayNameKept = Boolean(p.displayName && mine && mine !== p.displayName);
    const added = answers + updated + saved + notesRead + qNotes + mocks + studyDays + mistakes + review + viewed + (examDate ? 1 : 0) + (displayName ? 1 : 0);
    return {
        answers,
        updated,
        saved,
        notesRead,
        qNotes,
        mocks,
        mocksSkipped: Math.max(0, fileMocks - mocks),
        studyDays,
        unmatched: p.unmatched,
        noDetail: p.noDetail,
        future: p.future,
        ...(examDate ? { examDate } : {}),
        ...(examDateKept ? { examDateKept } : {}),
        ...(displayName ? { displayName } : {}),
        ...(displayNameKept ? { displayNameKept } : {}),
        nothingNew: added === 0,
    };
}
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
function webAddLines(s) {
    const out = [];
    if (s.answers)
        out.push(`${n(s.answers, 'question', 'questions')} you answered on the website`);
    if (s.updated)
        out.push(`${n(s.updated, 'newer answer', 'newer answers')} to questions you also answered here`);
    if (s.saved)
        out.push(n(s.saved, 'saved question', 'saved questions'));
    if (s.notesRead)
        out.push(n(s.notesRead, 'study note read', 'study notes read'));
    if (s.qNotes)
        out.push(`${n(s.qNotes, 'note', 'notes')} you wrote on questions`);
    if (s.mocks)
        out.push(n(s.mocks, 'mock exam result', 'mock exam results'));
    if (s.studyDays)
        out.push(n(s.studyDays, 'study day', 'study days'));
    if (s.examDate)
        out.push(`Your exam date: ${(0, examDay_1.examDateLabel)(s.examDate)}`);
    if (s.displayName)
        out.push(`${exports.WEB_NAME_PREFIX}${s.displayName}`);
    return out;
}
exports.WEB_NAME_PREFIX = 'Your name: ';
exports.WEB_NAME_NOTE = 'Your name stays on this device only.';
function webSkipLines(s) {
    const out = [];
    if (s.tooBig)
        out.push('Together with the progress on this phone, this would be too large to save, so it can’t be added.');
    if (s.unmatched) {
        out.push(s.unmatched === 1
            ? '1 item couldn’t be matched to a question or note in this app, so it’s left out.'
            : `${s.unmatched} items couldn’t be matched to questions or notes in this app, so they’re left out.`);
    }
    if (s.noDetail) {
        out.push(s.noDetail === 1
            ? '1 older answer was saved without whether it was right, so it can’t be added.'
            : `${s.noDetail} older answers were saved without whether they were right, so they can’t be added.`);
    }
    if (s.mocksSkipped) {
        out.push(s.mocksSkipped === 1
            ? `1 older mock exam result isn’t added: the app keeps ${journey_1.MAX_MOCKS} at most, and yours stay.`
            : `${s.mocksSkipped} older mock exam results aren’t added: the app keeps ${journey_1.MAX_MOCKS} at most, and yours stay.`);
    }
    if (s.examDateKept)
        out.push('This phone already has an exam date, so it stays as it is.');
    if (s.displayNameKept)
        out.push('This device already has a name, so it stays as it is.');
    if (s.future) {
        out.push(s.future === 1
            ? '1 item is dated in the future (the computer’s clock may be wrong), so it’s left out.'
            : `${s.future} items are dated in the future (the computer’s clock may be wrong), so they’re left out.`);
    }
    return out;
}
exports.WEB_NOT_IN_FILE = 'This file doesn’t include your exam date, plant or settings, so adding it doesn’t change them.';
exports.WEB_NOT_IN_FILE_DATED = 'This file doesn’t include your plant or settings, so adding it doesn’t change them.';
function webNotInFile(p) {
    return p.examDate ? exports.WEB_NOT_IN_FILE_DATED : exports.WEB_NOT_IN_FILE;
}
  };
  links["src/lib/syncCore.ts"] = {"../engine/backup":"src/engine/backup.ts","../engine/saveMigrations":"src/engine/saveMigrations.ts","../engine/syncMerge":"src/engine/syncMerge.ts","../engine/syncPlan":"src/engine/syncPlan.ts","../cloud/types":"src/cloud/types.ts","../engine/syncMeta":"src/engine/syncMeta.ts"};
  defs["src/lib/syncCore.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_PROGRESS = exports.hashOf = exports.CONFLICT_WAITS = exports.MAX_PUSH_BYTES = void 0;
exports.phoneSides = phoneSides;
exports.forPhone = forPhone;
exports.mergeAll = mergeAll;
exports.syncCycle = syncCycle;
exports.prepareFirstSync = prepareFirstSync;
exports.confirmFirstSync = confirmFirstSync;
const backup_1 = require("../engine/backup");
const saveMigrations_1 = require("../engine/saveMigrations");
const syncMerge_1 = require("../engine/syncMerge");
const syncPlan_1 = require("../engine/syncPlan");
const types_1 = require("../cloud/types");
const syncMeta_1 = require("../engine/syncMeta");
exports.MAX_PUSH_BYTES = 1500000;
exports.CONFLICT_WAITS = [1000, 3000, 9000];
const STORES = ['settings', 'progress'];
const NO_REV = { settings: null, progress: null };
const versionOf = (s, ctx) => { var _a, _b; return (_b = (_a = ctx.storeVersions) === null || _a === void 0 ? void 0 : _a[s]) !== null && _b !== void 0 ? _b : (s === 'settings' ? saveMigrations_1.SETTINGS_VERSION : saveMigrations_1.PROGRESS_VERSION); };
const hashOf = (side) => (0, syncMerge_1.fnv1a)((0, syncMerge_1.stableStringify)((0, syncMerge_1.toPayload)(side)));
exports.hashOf = hashOf;
const mctxOf = (ctx) => ({ now: ctx.now(), knownCertIds: ctx.knownCertIds });
function phoneSides(local, stamps, mctx) {
    const fitted = (0, backup_1.fitForBackup)(local);
    return {
        settings: (0, syncMerge_1.mergeSides)('settings', { state: (0, syncMerge_1.withoutDeviceLocal)('settings', fitted.settings), stamps: (0, syncMerge_1.readStamps)(stamps.settings) }, null, mctx),
        progress: (0, syncMerge_1.mergeSides)('progress', { state: (0, syncMerge_1.withoutDeviceLocal)('progress', fitted.progress), stamps: (0, syncMerge_1.readStamps)(stamps.progress) }, null, mctx),
    };
}
function forPhone(sides, local) {
    return {
        settings: { ...sides.settings.state, ...(0, syncMerge_1.deviceLocalOf)('settings', local.settings) },
        progress: { ...sides.progress.state, ...(0, syncMerge_1.deviceLocalOf)('progress', local.progress) },
    };
}
function mergeAll(a, b, mctx) {
    return {
        settings: b.settings ? (0, syncMerge_1.mergeSides)('settings', a.settings, b.settings, mctx) : a.settings,
        progress: b.progress ? (0, syncMerge_1.mergeSides)('progress', a.progress, b.progress, mctx) : a.progress,
    };
}
function failed(e) {
    const code = (0, types_1.errorCode)(e);
    return { kind: 'failed', code, ...(e && typeof e === 'object' && 'retryAfterSec' in e && typeof e.retryAfterSec === 'number' ? { retryAfterSec: e.retryAfterSec } : {}) };
}
function localProblem(e, dev) {
    if (e instanceof backup_1.BackupError && e.code === 'too-big') {
        dev.setMeta({ pausedReason: 'toobig' });
        return { kind: 'paused', reason: 'toobig' };
    }
    return { kind: 'failed', code: 'server' };
}
function keepStamps(dev, s, stamps, now) {
    const cur = dev.meta().stamps;
    return { ...cur, [s]: (0, syncMerge_1.mergeStamps)((0, syncMerge_1.dropFutureStamps)(cur[s], now), stamps) };
}
async function syncCycle(ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const dev = ctx.device;
    const alive = () => !ctx.alive || ctx.alive();
    let pulledAny = false;
    let pushedAny = false;
    for (let attempt = 0;; attempt++) {
        const meta = dev.meta();
        if (!meta.enabled || !alive())
            return { kind: 'idle' };
        const mctx = mctxOf(ctx);
        const local = dev.read();
        let mine;
        try {
            mine = phoneSides(local, meta.stamps, mctx);
        }
        catch (e) {
            return localProblem(e, dev);
        }
        const hash = { settings: (0, exports.hashOf)(mine.settings), progress: (0, exports.hashOf)(mine.progress) };
        let heads;
        try {
            heads = { settings: await ctx.port.head('settings'), progress: await ctx.port.head('progress') };
        }
        catch (e) {
            return failed(e);
        }
        if (!alive())
            return { kind: 'idle' };
        const actions = {};
        for (const s of STORES) {
            actions[s] = (0, syncPlan_1.plan)({
                head: heads[s],
                meta: { lastRev: meta.lastRev[s], lastPushedHash: meta.lastPushedHash[s], lastAt: (_b = (_a = meta.lastAt) === null || _a === void 0 ? void 0 : _a[s]) !== null && _b !== void 0 ? _b : null },
                setUp: true,
                switchPending: false,
                localHash: hash[s],
                localEmpty: s === 'progress' && (0, syncMerge_1.progressIsEmpty)(mine.progress.state),
                thisApp: ctx.thisApp,
            });
        }
        const pauseFor = (r) => STORES.filter((s) => actions[s].kind === 'pause' && actions[s].reason === r);
        if (pauseFor('newer').length) {
            dev.setMeta({ pausedReason: 'newer' });
            return { kind: 'paused', reason: 'newer' };
        }
        const implausible = pauseFor('unreadable');
        if (implausible.length) {
            const m = dev.meta();
            dev.setMeta({ pausedReason: 'unreadable', pausedRev: { ...((_c = m.pausedRev) !== null && _c !== void 0 ? _c : NO_REV), [implausible[0]]: heads[implausible[0]].rev } });
            return { kind: 'paused', reason: 'unreadable' };
        }
        if (pauseFor('remote_deleted').length) {
            dev.setMeta({ ...syncMeta_1.SYNC_OFF });
            return { kind: 'stopped' };
        }
        const toPull = STORES.filter((s) => actions[s].kind === 'pull' || actions[s].kind === 'merge');
        if (toPull.length && dev.busy()) {
            dev.setMeta({ deferredPull: true });
            return { kind: 'deferred' };
        }
        const stuck = (_d = meta.pausedRev) !== null && _d !== void 0 ? _d : NO_REV;
        if (meta.pausedReason === 'unreadable' && toPull.some((s) => { var _a; return stuck[s] !== null && ((_a = heads[s]) === null || _a === void 0 ? void 0 : _a.rev) === stuck[s]; })) {
            return { kind: 'paused', reason: 'unreadable' };
        }
        const remote = {};
        const remoteRev = { settings: null, progress: null };
        const remoteAt = { settings: null, progress: null };
        const remoteHash = { settings: null, progress: null };
        for (const s of toPull) {
            let snap;
            try {
                snap = await ctx.port.pull(s);
            }
            catch (e) {
                return failed(e);
            }
            if (!snap)
                continue;
            try {
                const side = (0, syncMerge_1.readSnapshot)(s, snap, { ...mctx, thisApp: ctx.thisApp });
                remote[s] = side;
                remoteHash[s] = (0, exports.hashOf)(side);
            }
            catch (e) {
                const reason = e instanceof backup_1.BackupError && e.code === 'newer' ? 'newer' : 'unreadable';
                const m = dev.meta();
                dev.setMeta({ pausedReason: reason, pausedRev: { ...((_e = m.pausedRev) !== null && _e !== void 0 ? _e : NO_REV), [s]: reason === 'unreadable' ? snap.rev : null } });
                return { kind: 'paused', reason };
            }
            remoteRev[s] = snap.rev;
            remoteAt[s] = typeof snap.updatedAt === 'number' ? snap.updatedAt : null;
        }
        if (!alive())
            return { kind: 'idle' };
        let merged;
        try {
            merged = mergeAll(mine, remote, mctx);
        }
        catch (e) {
            return localProblem(e, dev);
        }
        const changesPhone = STORES.some((s) => remote[s] && (0, syncMerge_1.stableStringify)(merged[s].state) !== (0, syncMerge_1.stableStringify)(mine[s].state));
        if (changesPhone) {
            if (dev.busy()) {
                dev.setMeta({ deferredPull: true });
                return { kind: 'deferred' };
            }
            try {
                await dev.write(forPhone(merged, local), {
                    rebase: (live) => forPhone(mergeAll(phoneSides(live, dev.meta().stamps, mctx), merged, mctx), live),
                });
            }
            catch {
                return { kind: 'failed', code: 'server' };
            }
            if (!alive())
                return { kind: 'idle' };
        }
        for (const s of STORES) {
            if (!remote[s])
                continue;
            const m = dev.meta();
            dev.setMeta({
                lastRev: { ...m.lastRev, [s]: remoteRev[s] },
                lastAt: { ...((_f = m.lastAt) !== null && _f !== void 0 ? _f : NO_REV), [s]: remoteAt[s] },
                lastPushedHash: { ...m.lastPushedHash, [s]: remoteHash[s] },
                stamps: keepStamps(dev, s, merged[s].stamps, mctx.now),
            });
            pulledAny = true;
        }
        let outgoing = merged;
        if (changesPhone) {
            try {
                outgoing = phoneSides(dev.read(), dev.meta().stamps, mctx);
            }
            catch (e) {
                return localProblem(e, dev);
            }
        }
        let conflict = false;
        for (const s of STORES) {
            const h = (0, exports.hashOf)(outgoing[s]);
            const onServer = remote[s] ? remoteHash[s] : heads[s] ? dev.meta().lastPushedHash[s] : null;
            if (onServer !== null && h === onServer)
                continue;
            if (s === 'progress' && heads.progress && (0, syncMerge_1.progressIsEmpty)(outgoing.progress.state))
                continue;
            const payload = (0, syncMerge_1.toPayload)(outgoing[s]);
            const bytes = (0, backup_1.utf8Bytes)(JSON.stringify(payload));
            if (bytes > exports.MAX_PUSH_BYTES || (s === 'settings' && bytes > syncMerge_1.MAX_SETTINGS_BYTES)) {
                dev.setMeta({ pausedReason: 'toobig' });
                return { kind: 'paused', reason: 'toobig' };
            }
            const expectedRev = remote[s] ? remoteRev[s] : ((_h = (_g = heads[s]) === null || _g === void 0 ? void 0 : _g.rev) !== null && _h !== void 0 ? _h : null);
            if (!alive())
                return { kind: 'idle' };
            try {
                const head = await ctx.port.push({ store: s, expectedRev, storeVersion: versionOf(s, ctx), appVersion: ctx.thisApp, deviceId: await ctx.deviceId(), state: payload });
                if (!alive())
                    return { kind: 'idle' };
                const m = dev.meta();
                dev.setMeta({
                    lastRev: { ...m.lastRev, [s]: head.rev },
                    lastAt: { ...((_j = m.lastAt) !== null && _j !== void 0 ? _j : NO_REV), [s]: typeof head.updatedAt === 'number' ? head.updatedAt : null },
                    lastPushedHash: { ...m.lastPushedHash, [s]: h },
                    stamps: keepStamps(dev, s, outgoing[s].stamps, mctx.now),
                });
                pushedAny = true;
            }
            catch (e) {
                const code = (0, types_1.errorCode)(e);
                if (code === 'conflict') {
                    conflict = true;
                    break;
                }
                if (code === 'too_big') {
                    dev.setMeta({ pausedReason: 'toobig' });
                    return { kind: 'paused', reason: 'toobig' };
                }
                return failed(e);
            }
        }
        if (conflict) {
            if (attempt >= exports.CONFLICT_WAITS.length)
                return { kind: 'failed', code: 'conflict' };
            await ctx.wait(exports.CONFLICT_WAITS[attempt]);
            continue;
        }
        if (!alive())
            return { kind: 'idle' };
        dev.setMeta({ lastSyncAt: ctx.now(), pausedReason: null, pausedRev: NO_REV, deferredPull: false });
        return pulledAny || pushedAny ? { kind: 'synced', pulled: pulledAny, pushed: pushedAny } : { kind: 'idle' };
    }
}
async function prepareFirstSync(ctx) {
    var _a, _b;
    const mctx = { ...mctxOf(ctx), firstSync: true };
    const local = ctx.read();
    let mine;
    try {
        mine = phoneSides(local, ctx.stamps, mctx);
    }
    catch (e) {
        return { ok: false, code: e instanceof backup_1.BackupError && e.code === 'too-big' ? 'toobig' : 'server' };
    }
    const remote = {};
    const remoteRev = { settings: null, progress: null };
    const remoteAt = { settings: null, progress: null };
    const remoteHash = { settings: null, progress: null };
    for (const s of STORES) {
        let snap;
        try {
            const head = await ctx.port.head(s);
            if (!head)
                continue;
            const first = (0, syncPlan_1.plan)({ head, meta: { lastRev: null, lastPushedHash: null }, setUp: false, switchPending: false, localHash: '', localEmpty: false, thisApp: ctx.thisApp });
            if (first.kind === 'pause')
                return { ok: false, code: first.reason === 'unreadable' ? 'unreadable' : 'newer' };
            snap = await ctx.port.pull(s);
        }
        catch (e) {
            return { ok: false, code: (0, types_1.errorCode)(e) };
        }
        if (!snap)
            continue;
        try {
            const side = (0, syncMerge_1.readSnapshot)(s, snap, { ...mctx, thisApp: ctx.thisApp });
            remote[s] = side;
            remoteHash[s] = (0, exports.hashOf)(side);
            remoteRev[s] = snap.rev;
            remoteAt[s] = typeof snap.updatedAt === 'number' ? snap.updatedAt : null;
        }
        catch (e) {
            return { ok: false, code: e instanceof backup_1.BackupError && e.code === 'newer' ? 'newer' : 'unreadable' };
        }
    }
    let merged;
    try {
        merged = mergeAll(mine, remote, mctx);
    }
    catch (e) {
        return { ok: false, code: e instanceof backup_1.BackupError && e.code === 'too-big' ? 'toobig' : 'server' };
    }
    const phoneEmpty = (0, syncMerge_1.progressIsEmpty)(mine.progress.state);
    const accountHasProgress = Boolean(remote.progress && !(0, syncMerge_1.progressIsEmpty)(remote.progress.state));
    return {
        ok: true,
        prep: {
            case: (0, syncPlan_1.firstCase)(phoneEmpty, accountHasProgress),
            remote,
            remoteRev,
            remoteAt,
            remoteHash,
            phone: local,
            account: remote.settings || remote.progress ? forPhone({ settings: (_a = remote.settings) !== null && _a !== void 0 ? _a : mine.settings, progress: (_b = remote.progress) !== null && _b !== void 0 ? _b : exports.EMPTY_PROGRESS }, local) : null,
            after: forPhone(merged, local),
            phoneEmpty,
            keepUndo: (0, syncMerge_1.holdsStudy)(mine.progress.state, mine.settings.state),
        },
    };
}
exports.EMPTY_PROGRESS = { state: { byCert: {}, streak: { current: 0, best: 0, lastDay: null } }, stamps: {} };
async function confirmFirstSync(ctx, prep, mode, undo, opts = {}) {
    var _a, _b, _c, _d;
    const dev = ctx.device;
    const mctx = { ...mctxOf(ctx), firstSync: true };
    const local = dev.read();
    let target;
    try {
        const mine = phoneSides(local, dev.meta().stamps, mctx);
        target = mode === 'merge' ? mergeAll(mine, prep.remote, mctx) : { settings: (_a = prep.remote.settings) !== null && _a !== void 0 ? _a : mine.settings, progress: (_b = prep.remote.progress) !== null && _b !== void 0 ? _b : exports.EMPTY_PROGRESS };
    }
    catch (e) {
        return localProblem(e, dev);
    }
    try {
        await dev.write(forPhone(target, local), {
            undo,
            rebase: mode === 'merge' ? (live) => forPhone(mergeAll(phoneSides(live, dev.meta().stamps, mctx), target, mctx), live) : undefined,
        });
    }
    catch {
        return { kind: 'failed', code: 'server' };
    }
    dev.setMeta({
        ...syncMeta_1.SYNC_OFF,
        enabled: true,
        accountHash: (_c = opts.accountHash) !== null && _c !== void 0 ? _c : null,
        lastRev: prep.remoteRev,
        lastAt: (_d = prep.remoteAt) !== null && _d !== void 0 ? _d : NO_REV,
        lastPushedHash: prep.remoteHash,
        stamps: { settings: target.settings.stamps, progress: target.progress.stamps },
    });
    return opts.cycle === false ? { kind: 'idle' } : syncCycle(ctx);
}
  };
  links["src/theme/tokens.ts"] = {};
  defs["src/theme/tokens.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldInk = exports.plate = exports.fieldMaxScale = exports.fieldType = exports.plantForm = exports.plantLine = exports.plantTheme = exports.plantArt = exports.plantLeaf = exports.badgeGlaze = exports.badgeLeafPip = exports.badgeStruck = exports.badgeMetal = exports.cardInk = exports.badgeEnamel = exports.turnMote = exports.turnLook = exports.turnTone = exports.motion = exports.LARGE_TEXT = exports.grewLine = exports.statWord = exports.cardType = exports.statUnit = exports.numeralUnit = exports.badgeLetter = exports.optionText = exports.maxScale = exports.stemLong = exports.STEM_LONG_CHARS = exports.type = exports.font = exports.radius = exports.space = exports.domainPalette = exports.raisedShadow = exports.cardShadow = exports.darkCardTopLight = exports.forestHighlight = exports.grainOp = exports.scrimOp = exports.pillarGlyph = exports.kaisip = exports.dark = exports.light = void 0;
exports.serifNumeral = serifNumeral;
exports.percentSup = percentSup;
exports.light = {
    bg: '#F3F1EA',
    raised: '#FFFFFF',
    raised2: '#F8F7F2',
    soft: '#E9E6DC',
    line: '#DFDCD1',
    control: '#7D897F',
    track: '#E2E0D6',
    ink: '#17231B',
    ink2: '#465349',
    muted: '#5E6A61',
    accent: '#2B6E4A',
    accentText: '#24603F',
    btn: '#1E4A34',
    onBtn: '#F7F5EF',
    forest: '#1E4A34',
    forestTop: '#245A40',
    onForest: '#F3F1EA',
    onForest2: '#C9DACD',
    forestLine: '#3A6B51',
    forestTrack: '#2F5C44',
    sap: '#A9D9BA',
    pill: '#F3F1EA',
    onPill: '#17231B',
    clay: '#9A4F26',
    correct: '#1D6A43',
    correctBg: '#E0EDE2',
    wrong: '#A3333D',
    wrongBg: '#F7E3E1',
    tip: '#7A5100',
    tipBg: '#F3EAD3',
    scrim: '#17231B',
};
exports.dark = {
    bg: '#111613',
    raised: '#1D2621',
    raised2: '#1B231E',
    soft: '#202A23',
    line: '#29322B',
    control: '#66736A',
    track: '#2A332C',
    ink: '#ECEFE8',
    ink2: '#B4BFB6',
    muted: '#97A39A',
    accent: '#7FC39C',
    accentText: '#93CFAA',
    btn: '#A9D9BA',
    onBtn: '#0F1F16',
    forest: '#21432F',
    forestTop: '#285139',
    onForest: '#EEF2EA',
    onForest2: '#BCD2C2',
    forestLine: '#3C6B51',
    forestTrack: '#2E5440',
    sap: '#A9D9BA',
    pill: '#EEF2EA',
    onPill: '#0F1F16',
    clay: '#E9A07A',
    correct: '#8AD6A8',
    correctBg: '#173022',
    wrong: '#FF9CA6',
    wrongBg: '#2C1A1D',
    tip: '#E9C46A',
    tipBg: '#2B2418',
    scrim: '#000000',
};
exports.kaisip = {
    light: { leaf: '#1E4A34', pair: '#2B6E4A', word: '#17231B' },
    dark: { leaf: '#F3F1EA', pair: '#A9D9BA', word: '#F3F1EA' },
};
exports.pillarGlyph = {
    light: { fill: '#A9D9BA' },
    dark: { fill: '#2E5440' },
};
exports.scrimOp = { light: 0.4, dark: 0.6 };
exports.grainOp = { light: 0.035, dark: 0.045 };
exports.forestHighlight = { light: 'rgba(255,255,255,0.08)', dark: 'rgba(255,255,255,0.06)' };
exports.darkCardTopLight = 'inset 0 1px 0 rgba(255,255,255,0.05)';
exports.cardShadow = '0 0 0 1px rgba(23,35,27,0.05), 0 1px 2px rgba(23,35,27,0.06), 0 8px 20px -6px rgba(23,35,27,0.10)';
exports.raisedShadow = {
    shadowColor: '#17231B',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
};
exports.domainPalette = {
    light: ['#3F7F96', '#4E8A3E', '#B0802C', '#86689C', '#5E7482'],
    dark: ['#72B4CB', '#8CC474', '#DDB066', '#B99DCD', '#9AAFBB'],
};
exports.space = { xs: 4, sm: 8, md: 12, lg: 16, gutter: 20, xl: 24, xxl: 32, xxxl: 48 };
exports.radius = { sm: 8, md: 16, lg: 24, sheet: 28, pill: 999 };
exports.font = {
    serif400: 'Fraunces_400Regular',
    serif400Italic: 'Fraunces_400Regular_Italic',
    serif500: 'Fraunces_500Medium',
    sans400: 'Figtree_400Regular',
    sans500: 'Figtree_500Medium',
    sans600: 'Figtree_600SemiBold',
};
exports.type = {
    number: { fontFamily: exports.font.serif500, fontSize: 52, lineHeight: 52, letterSpacing: -1.4 },
    stat: { fontFamily: exports.font.serif500, fontSize: 34, lineHeight: 34, letterSpacing: -0.8 },
    display: { fontFamily: exports.font.serif500, fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
    hero: { fontFamily: exports.font.serif500, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
    stem: { fontFamily: exports.font.serif400, fontSize: 21, lineHeight: 30, letterSpacing: -0.1 },
    quote: { fontFamily: exports.font.serif400Italic, fontSize: 18, lineHeight: 26 },
    stage: { fontFamily: exports.font.serif400Italic, fontSize: 19, lineHeight: 25 },
    headline: { fontFamily: exports.font.sans600, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
    label: { fontFamily: exports.font.sans600, fontSize: 16, lineHeight: 22 },
    body: { fontFamily: exports.font.sans400, fontSize: 16, lineHeight: 24 },
    small: { fontFamily: exports.font.sans400, fontSize: 15, lineHeight: 22 },
    meta: { fontFamily: exports.font.sans500, fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: exports.font.sans600, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
    tab: { fontFamily: exports.font.sans600, fontSize: 11, lineHeight: 14 },
};
exports.STEM_LONG_CHARS = 200;
exports.stemLong = { fontSize: 20, lineHeight: 29 };
exports.maxScale = {
    number: 1.3,
    stat: 1.3,
    display: 1.3,
    hero: 1.3,
    stem: 2,
    quote: 2,
    stage: 2,
    headline: 2,
    label: 2,
    body: 2,
    small: 2,
    meta: 2,
    caption: 2,
    tab: 1.2,
};
exports.optionText = { lineHeight: 23 };
exports.badgeLetter = { fontFamily: exports.font.sans600, fontSize: 14, lineHeight: 18 };
function serifNumeral(size) {
    return { fontFamily: exports.font.serif500, fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: size >= 30 ? -0.6 : -0.3 };
}
exports.numeralUnit = { fontFamily: exports.font.sans500, fontSize: 12, lineHeight: 16 };
exports.statUnit = { fontFamily: exports.font.sans500, fontSize: 15, lineHeight: 20 };
exports.cardType = {
    name: { fontFamily: exports.font.serif500, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 },
    skill: { fontFamily: exports.font.serif400Italic, fontSize: 16, lineHeight: 22 },
    notice: { fontFamily: exports.font.sans500, fontSize: 11, lineHeight: 15 },
};
exports.statWord = { fontFamily: exports.font.serif500, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 };
function percentSup(size) {
    return { fontFamily: exports.font.serif500, fontSize: Math.round(size * 0.48), lineHeight: Math.round(size * 0.6) };
}
exports.grewLine = { fontFamily: exports.font.serif400Italic, fontSize: 17, lineHeight: 22 };
exports.LARGE_TEXT = 1.3;
exports.motion = {
    dur: {
        press: 120,
        select: 120,
        quick: 160,
        reveal: 200,
        enter: 240,
        screen: 280,
        fill: 300,
        vine: 520,
        grow: 600,
        celebrate: 1200,
        short: 200,
        reduced: 120,
        tick: 900,
        draw: 400,
    },
    curve: {
        enter: [0.05, 0.7, 0.1, 1],
        exit: [0.3, 0, 0.8, 0.15],
        standard: [0.2, 0, 0, 1],
    },
    spring: {
        press: { duration: 160, dampingRatio: 1 },
        settle: { duration: 300, dampingRatio: 0.9 },
        pop: { damping: 16, stiffness: 260 },
        leaf: { duration: 280, dampingRatio: 0.7 },
    },
    stagger: { group: 40, maxGroups: 4, row: 30, maxRows: 6, digit: 30, stat: 60, leaf: 80, maxLeaves: 3, scene: 120, maxScene: 6 },
    celebrate: { fullTimes: 3, sessionMs: 3000, leaves: 8 },
    plant: { breath: 2000, breathOut: 2400, breaths: 1, react: 600, lean: 900, grow: 900, plantIn: 820, turnReduced: 120 },
    turn: {
        small: { total: 2400, gather: [160, 760], swaps: [340, 260, 200], bloom: 320, nameAt: 1900, inhale: 0.015, motes: 4, moteLife: 1100, glowMax: 0.7, glowR: 0.72, settle: { from: 0.97, duration: 360, dampingRatio: 1 }, halo: false },
        medium: { total: 3000, gather: [180, 900], swaps: [380, 300, 240, 200, 200], bloom: 340, nameAt: 2500, inhale: 0.02, motes: 6, moteLife: 1300, glowMax: 0.85, glowR: 0.86, settle: { from: 0.97, duration: 400, dampingRatio: 1 }, halo: false },
        grand: { total: 3600, gather: [200, 1000], swaps: [420, 340, 280, 230, 200, 200, 200], bloom: 360, nameAt: 3100, inhale: 0.025, motes: 8, moteLife: 1500, glowMax: 0.9, glowR: 1, settle: { from: 0.96, duration: 460, dampingRatio: 0.85 }, halo: true },
        cross: 0.6,
        swapFloor: 200,
        skip: 120,
        playGuard: 400,
    },
    rise: 8,
    shift: 16,
    pressScale: 0.98,
    pressOpacity: 0.92,
};
exports.turnTone = {
    light: { sil: '#FFFCF2', silGold: '#C99A3A', glow: '#F6E2A6', glowOps: [0.6, 0.72, 0.9] },
    dark: {
        sil: '#D8CCA6',
        silGold: '#E9C46A',
        glow: '#E9C46A',
        glowOps: [0.24, 0.29, 0.36],
        glowStops: [
            [0, 0.62],
            [0.4, 0.56],
            [0.65, 0.4],
            [0.85, 0.2],
            [1, 0],
        ],
    },
};
exports.turnLook = { sil: 'gold', evenPace: true };
exports.turnMote = {
    pollen: ['#E7C76B', '#F2DA92'],
    speck: ['#E3C890', '#D2B57A'],
    water: ['#7FAFBE', '#9CC9D6'],
    glint: ['#FFF3CF', '#F6E7B8'],
    oakLeaf: ['#9CC768', '#8FBF7E'],
    oakLeafLine: ['#3F6B45', '#CFE3C4'],
    samara: ['#E2BE84', '#D9B27A'],
    samaraLine: ['#8A5A2B', '#F2D3A1'],
    samaraSeed: ['#B7834A', '#E6C08A'],
    coin: ['#EBD49A', '#D9BE77'],
    coinLine: ['#A8771F', '#F2DA92'],
    coinEye: ['#C99A3A', '#F2DA92'],
    spray: ['#E2B33F', '#F2D27A'],
    petal: ['#F4CFD8', '#EBC3CE'],
    petalLine: ['#C98A9A', '#F6DCE3'],
    floret: ['#EFD98A', '#E9D98C'],
    floretDeep: ['#E5C66A', '#F2E3A0'],
    puff: ['#E6D49A', '#D9C98A'],
    salt: ['#F1E6C6', '#E6DDBE'],
    roundLeaf: ['#8FBF6A', '#86B676'],
    seed: ['#6B4A2B', '#C9A06A'],
    droplet: ['#BFDDE6', '#A9CFD9'],
    star: ['#FFFDF6', '#F4F1E6'],
    starLine: ['#B9B39C', '#ECEFE8'],
    node: ['#6F9A5C', '#A9CF94'],
};
exports.badgeEnamel = {
    forest: { field: '#1E4A34', deep: '#123021', lite: '#2C5E44', E1: '#F3F1EA', E2: '#A9D9BA', D2: '#7DB592', E3: '#E9C46A', D3: '#B98A2E', L3: '#F4DE9E', ribbon: '#2B6E4A', ribbonDeep: '#1E4A34' },
    ink: { field: '#17231B', deep: '#0B130E', lite: '#25362B', E1: '#F3F1EA', E2: '#A9D9BA', D2: '#7DB592', E3: '#E9C46A', D3: '#B98A2E', L3: '#F4DE9E', ribbon: '#9A4F26', ribbonDeep: '#6E3417' },
    clay: { field: '#9A4F26', deep: '#6A3015', lite: '#A95C33', E1: '#F3F1EA', E2: '#F2C7A6', D2: '#D9A07A', E3: '#E9C46A', D3: '#C0912F', L3: '#F4DE9E', ribbon: '#A87A1F', ribbonDeep: '#7A5100' },
    paper: { field: '#F5F1E6', deep: '#D9D1BD', lite: '#E6DFCD', E1: '#1E4A34', E2: '#2B6E4A', D2: '#1E4A34', E3: '#9A4F26', D3: '#6E3417', L3: '#EFC6A8', ribbon: '#2B6E4A', ribbonDeep: '#1E4A34' },
};
exports.cardInk = {
    field: exports.badgeEnamel.forest.field,
    ink: exports.badgeEnamel.forest.E1,
    ink2: exports.light.onForest2,
    sap: exports.badgeEnamel.forest.E2,
    line: exports.light.forestTrack,
};
exports.badgeMetal = {
    1: { name: 'Clay', light: '#F7D3B8', mid: '#D58A5C', dark: '#A2552B', edge: '#6B3216', bead: '#FBE5D3' },
    2: { name: 'Lichen', light: '#FAFBF8', mid: '#C9D5CC', dark: '#8E9C92', edge: '#46544A', bead: '#FFFFFF' },
    3: { name: 'Gold leaf', light: '#FBE9B4', mid: '#E2B653', dark: '#A87A1F', edge: '#7A5100', bead: '#FFF5D6' },
};
exports.badgeStruck = { name: '', light: '#E8EFE6', mid: '#AFC2B2', dark: '#77897B', edge: '#3A4A3F', bead: '#F4F8F2' };
exports.badgeLeafPip = { on: '#1E4A34', rib: '#A9D9BA' };
exports.badgeGlaze = { color: '#FFFFFF', opacity: 0.035, paperOpacity: 0.3 };
exports.plantLeaf = {
    grove: { deep: '#24603F', mid: '#3F8A5E', light: '#6DB38A', hi: '#A9D9BA' },
    spring: { deep: '#467D38', mid: '#6CA24B', light: '#9CC768', hi: '#CDE6A0' },
    evergreen: { deep: '#1B4632', mid: '#357A56', light: '#56996F', hi: '#8CC3A1' },
    ember: { deep: '#9A4F26', mid: '#C4622E', light: '#E2874A', hi: '#F3B47E' },
    gold: { deep: '#A8771F', mid: '#CF9E34', light: '#E9C46A', hi: '#F6E2A6' },
    blossom: { deep: '#BB5F7B', mid: '#DC8BA3', light: '#F0B4C4', hi: '#FBDDE5' },
    twilight: { deep: '#76598D', mid: '#987AB5', light: '#BCA2D6', hi: '#E1D3EF' },
    silver: { deep: '#5E7F70', mid: '#7FA393', light: '#A9C4B6', hi: '#D3E2D9' },
    rosewood: { deep: '#8E2F3A', mid: '#B8404C', light: '#D9666F', hi: '#F1A3A6' },
    pearl: { deep: '#AEB8AA', mid: '#E3E8DD', light: '#FAFAF5', hi: '#FFFFFF' },
    cactus: { deep: '#2F6B45', mid: '#4C9160', light: '#7DB97E', hi: '#F4EED9' },
    snow: { deep: '#B48FA0', mid: '#F2E6EC', light: '#FAF4F7', hi: '#FFFFFF' },
    lemon: { deep: '#9C8516', mid: '#D2BB3E', light: '#EEDD78', hi: '#FAF2BF' },
    golden: { deep: '#66721F', mid: '#98A034', light: '#C4C25A', hi: '#E7E3A0' },
};
exports.plantArt = {
    ink: '#2A2119',
    blush: '#E8866E',
    white: '#FFFFFF',
    black: '#000000',
    facePatch: '#F3E3CC',
    seedLight: '#C9A27A',
    soil: '#7A5A41',
    soilDeep: '#4A3527',
    grass: '#5E9A55',
    tuft: '#4C8A47',
    daisy: '#F3F1EA',
    daisyCore: '#E9C46A',
    bark: {
        oak: '#6E4B32',
        maple: '#76563F',
        narra: '#7B5A44',
        cherry: '#5E3B35',
        pine: '#7E4A2C',
        coconut: '#8A7356',
        mango: '#6A4B36',
        bonsai: '#6B4A3A',
    },
    seed: {
        sunflower: '#76685F',
        sunflowerStripe: '#E3DCCB',
        lotus: '#6B6340',
        sampaguita: '#7A6A52',
        cactus: '#7E6A58',
    },
    pot: {
        terracotta: '#B9663B',
        terracottaLit: '#CF7A4C',
        terracottaRim: '#C9724A',
        terracottaBand: '#A5552F',
        celadon: '#8FB8A3',
        celadonLit: '#B5D4C4',
        celadonLine: '#6F9C86',
        celadonRim: '#A3C7B4',
        tray: '#6B4A3E',
        trayFoot: '#553A30',
        trayRim: '#7E5A4C',
        pebble: '#8E9590',
        basket: '#C08A4E',
        basketWeave: '#9C6A36',
        basketRib: '#D9A86C',
        basketRim: '#A87439',
        bowl: '#3F6F82',
        bowlLit: '#5B8EA0',
        water: '#8CC0C4',
        ripple: '#C7E3E2',
        bowlRim: '#4F8296',
        stone: '#8E9590',
        stoneLit: '#A6ACA6',
    },
    gift: {
        cherryBloom: '#FFF4F6',
        cherryCore: '#C2557A',
        cherryDrift: '#FBDDE5',
        acorn: '#B98A4A',
        samara: '#F3B47E',
        narra: '#F2C94C',
        narraCore: '#B0802C',
        mangoRipe: '#F2A93B',
        mangoBlush: '#E0603A',
        mangoGreen: '#8DB85A',
        mangoGreenLit: '#B6D67F',
        stalk: '#4A3A2A',
        coconutRipe: '#7A5A34',
        coconutGreen: '#7E9A3E',
        coconutGolden: '#D9822B',
        cone: '#8A5A34',
        coneLine: '#6A4024',
        mossBloomCore: '#E9C46A',
    },
    sunflower: { disc: '#5E3A1E', discMid: '#8A5A2E', discLit: '#9C6A38', seeds: '#4A2E17', sideDisc: '#6B4423', drift: '#E9C46A' },
    lotus: { stamen: '#E9C46A', stamenDeep: '#C9A14A', pod: '#8DAA5A', podTop: '#B7CC7A', podSeed: '#5F7A3A', drift: '#F0B4C4' },
    sampaguita: { core: '#D9D27A', tassel: '#E8866E' },
    visitor: {
        wren: '#8A5A3A',
        wrenDark: '#6A4128',
        wrenBelly: '#E3CBA8',
        robin: '#6E5A48',
        robinDark: '#544334',
        robinBreast: '#D9673A',
        beak: '#E9A040',
        leg: '#3B2C22',
    },
    planter: {
        fieldstone: '#8C8577',
        fieldstoneLit: '#A8A193',
        fieldstoneDark: '#6F695D',
        fiveStone: '#B9B2A2',
        fiveStoneRim: '#9E9786',
        fiveDots: ['#3F7F96', '#4E8A3E', '#B0802C', '#86689C', '#5E7482'],
        compass: '#2F6B4C',
        compassLit: '#3E8160',
        compassRim: '#4A8A68',
        compassStar: '#E9C46A',
        banded: '#DCCBA6',
        bandedLit: '#E9DDC2',
        bandedRim: '#C2AB7C',
        bandedBand: '#C98A2E',
        bandedClay: '#B5502E',
        root: '#7A5634',
        stoneRing: '#9AA09A',
        stoneRingLit: '#BEC3BD',
        blaze: '#F3F1EA',
        blazeMark: '#B5502E',
        post: '#7E5A3C',
        postLit: '#9C7550',
    },
    keepsake: {
        stone: '#9A9F98',
        stoneLit: '#C2C6BF',
        stoneDark: '#767B74',
        wood: '#8A6442',
        woodLit: '#A87F57',
        woodDark: '#5F432C',
        gold: '#D9A63E',
        goldLit: '#F0CF7A',
        clay: '#B5502E',
        cream: '#F3ECDC',
        water: '#8CC0C4',
        waterRim: '#4F8296',
        reed: '#5E8A4A',
        web: '#9FB0B8',
        dew: '#7FC3D2',
        jay: '#B79A88',
        jayBlue: '#3E6FB0',
        jayBlack: '#2A2119',
        swallow: '#2C3E66',
        swallowThroat: '#C8553A',
        fox: '#D2702F',
        foxDark: '#9E4E1E',
        fern: '#4C8A47',
        fernLit: '#7DB06A',
        deer: '#A86E44',
        deerDark: '#7A4E2E',
        mushroom: '#C2453A',
        mushroomStem: '#F1E7D3',
        lanternGlow: '#F6C35A',
        dawn: '#F6D58A',
        ribbon: '#2B6E4A',
        ribbonTail: '#1E4A34',
    },
    bamboo: {
        deep: '#4E7836',
        mid: '#6E9E4C',
        light: '#A4C978',
        node: '#3D612B',
        shoot: '#9C7A48',
        shootLine: '#7A5A32',
        sheath: '#8F6E40',
        sheathMid: '#A9854F',
        sheathLit: '#B8955C',
        sheathLine: '#D6B985',
    },
};
exports.plantTheme = {
    light: { shadow: '#17231B', shadowOpacity: 0.1, sap: '#2B6E4A', leafFill: '#6DB38A', honey: '#8F6620', dusk: '#E6E7DE', duskOpacity: 0.85, dawnOpacity: 0.7 },
    dark: { shadow: '#000000', shadowOpacity: 0.35, sap: '#A9D9BA', leafFill: '#A9D9BA', honey: '#E9C46A', dusk: '#1B2820', duskOpacity: 0.9, dawnOpacity: 0.32 },
};
exports.plantLine = {
    light: {
        woodInk: '#17231B',
        woodMix: 0.38,
        leaf: 'deep',
        washLeaf: 'light',
        washLeafOp: 0.55,
        washMass: 'light',
        washMassOp: 0.22,
        washWoodOp: 0.26,
        soil: exports.light.control,
        moon: '#8F6620',
        moonWashOp: 0.25,
        propInk: '#17231B',
        propMix: 0.45,
        propWashOp: 0.42,
        giftMix: 0.4,
        starLine: '#7E8A78',
        paleLineMix: 0.3,
        restLineMix: 0.2,
    },
    dark: {
        woodInk: '#F3E3CC',
        woodMix: 0.62,
        leaf: 'light',
        washLeaf: 'mid',
        washLeafOp: 0.5,
        washMass: 'mid',
        washMassOp: 0.2,
        washWoodOp: 0.32,
        soil: exports.dark.control,
        moon: '#E9C46A',
        moonWashOp: 0.25,
        propInk: '#F3F1EA',
        propMix: 0.55,
        propWashOp: 0.5,
        giftMix: 0.45,
        starLine: '#E3E8DD',
        paleLineMix: 0,
        restLineMix: 0,
    },
};
exports.plantForm = {
    light: {
        page: exports.light.bg,
        massTone: 'light',
        massMix: 0.44,
        massMixDense: 0.58,
        woodFillMix: 0.32,
        giftFillMix: 0.7,
        stoneBase: exports.light.control,
        stoneInk: exports.light.ink,
        stoneMix: 0.35,
        stoneFillMix: 0.38,
        glowTone: 'hi',
        glowOps: [0.2, 0.24, 0.3],
        glowRingTone: 'deep',
        goldTone: 'deep',
        goldWashTone: 'light',
        wire: exports.plantLeaf.ember.deep,
    },
    dark: {
        page: exports.dark.bg,
        massTone: 'mid',
        massMix: 0.36,
        massMixDense: 0.46,
        woodFillMix: 0.42,
        giftFillMix: 0.62,
        stoneBase: exports.light.control,
        stoneInk: exports.dark.ink,
        stoneMix: 0.45,
        stoneFillMix: 0.34,
        glowTone: 'light',
        glowOps: [0.05, 0.06, 0.08],
        glowRingTone: 'light',
        goldTone: 'light',
        goldWashTone: 'mid',
        wire: '#E9A07A',
    },
};
exports.fieldType = {
    head: { fontFamily: exports.font.sans600, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
    fig: { fontFamily: exports.font.serif400Italic, fontSize: 14, lineHeight: 20 },
    sub: { fontFamily: exports.font.serif400Italic, fontSize: 16, lineHeight: 22 },
    value: { fontFamily: exports.font.serif500, fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
    name: { fontFamily: exports.font.sans600, fontSize: 13, lineHeight: 17 },
    small: { fontFamily: exports.font.sans500, fontSize: 12, lineHeight: 16 },
    chart: { fontFamily: exports.font.serif500, fontSize: 18, lineHeight: 22, letterSpacing: -0.3 },
    keyNo: { fontFamily: exports.font.serif400Italic, fontSize: 16, lineHeight: 22 },
    tiny: { fontFamily: exports.font.sans500, fontSize: 11, lineHeight: 14 },
    figSm: { fontFamily: exports.font.serif400Italic, fontSize: 12, lineHeight: 16 },
};
exports.fieldMaxScale = { head: 2, fig: 2, sub: 2, value: 1.3, name: 2, small: 2, chart: 1.3, keyNo: 1.3, tiny: 1.3, figSm: 1.3 };
exports.plate = { mount: 6, labelRadius: 3, button: 52, buttonRadius: 12, chart: 264 };
exports.fieldInk = {
    light: {
        stem: '#5B4B3C',
        leaf: '#CFE5D5',
        seed: '#E9D9C4',
        tape: 'rgba(214,205,182,0.75)',
        pressed: { E1: '#A3C8AD', E2: '#447A57', E3: '#24603F', D2: '#3B6A4E', D3: '#1E4A34', L3: '#E1ECE2', K: exports.light.raised2 },
    },
    dark: {
        stem: '#B9A894',
        leaf: exports.dark.forestTrack,
        seed: '#4A3E33',
        tape: 'rgba(120,112,92,0.55)',
        pressed: { E1: '#3C6B51', E2: '#7FC39C', E3: '#A9D9BA', D2: '#5E9C78', D3: '#C9E6D2', L3: exports.dark.forestTrack, K: exports.dark.raised2 },
    },
};
  };
  links["src/webcloud/auth.ts"] = {"../engine/account":"src/engine/account.ts","../cloud/types":"src/cloud/types.ts","./config":"src/webcloud/config.ts","./errors":"src/webcloud/errors.ts","./pkce":"src/webcloud/pkce.ts","./session":"src/webcloud/session.ts"};
  defs["src/webcloud/auth.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKCE_MAX_AGE_MS = void 0;
exports.createWebAuth = createWebAuth;
const account_1 = require("../engine/account");
const types_1 = require("../cloud/types");
const config_1 = require("./config");
const errors_1 = require("./errors");
const pkce_1 = require("./pkce");
const session_1 = require("./session");
const FUNCTIONS = new Set(['delete-account', 'export-my-data']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_RE = /^\d{6,10}$/;
exports.PKCE_MAX_AGE_MS = 10 * 60000;
const KNOWN_PROVIDERS = ['email', 'google', 'apple'];
function sessionFrom(body, now) {
    const at = body.access_token;
    const rt = body.refresh_token;
    const user = body.user && typeof body.user === 'object' ? body.user : null;
    if (typeof at !== 'string' || typeof rt !== 'string' || !user || typeof user.id !== 'string' || !UUID_RE.test(user.id))
        return null;
    const expiresIn = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 3600;
    const expiresAt = typeof body.expires_at === 'number' && body.expires_at > 0 ? body.expires_at * 1000 : now + expiresIn * 1000;
    return { v: 1, accessToken: at, refreshToken: rt, expiresAt, userId: user.id, email: typeof user.email === 'string' ? user.email : null, providers: providersOf(user) };
}
function providersOf(user) {
    const meta = user.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {};
    const list = Array.isArray(meta.providers) ? meta.providers : typeof meta.provider === 'string' ? [meta.provider] : [];
    return KNOWN_PROVIDERS.filter((p) => list.includes(p));
}
function createWebAuth(deps) {
    var _a, _b, _c;
    const base = ((_a = deps.url) !== null && _a !== void 0 ? _a : config_1.SUPABASE_URL).replace(/\/+$/, '');
    const apiKey = (_b = deps.apiKey) !== null && _b !== void 0 ? _b : config_1.PUBLISHABLE_KEY;
    const redirectTo = (_c = deps.redirectTo) !== null && _c !== void 0 ? _c : config_1.REDIRECT_URL;
    const store = (0, session_1.createSessionStore)(deps.stores);
    const now = () => deps.clock.now();
    const send = async (path, init) => {
        try {
            const res = await deps.fetch(`${base}${path}`, {
                method: init.method,
                headers: { apikey: apiKey, ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...init.headers },
                ...(init.body !== undefined ? { body: init.body } : {}),
                ...(init.keepalive ? { keepalive: true } : {}),
            });
            const text = await res.text();
            return { res, text };
        }
        catch {
            return { res: null, text: '' };
        }
    };
    const ok = (r) => Boolean(r.res && r.res.status >= 200 && r.res.status < 300);
    const fail = (call, r) => { var _a; return (0, errors_1.toCloudError)(call, r.res ? r.res.status : 0, r.text, (_a = r.res) !== null && _a !== void 0 ? _a : undefined); };
    const info = (s) => {
        const claims = (0, pkce_1.tokenClaims)(s.accessToken);
        const fromToken = Array.isArray(claims.amr) ? KNOWN_PROVIDERS.filter((p) => claims.amr.some((a) => a && (a.method === p || (p === 'email' && a.method === 'otp') || (p === 'google' && a.method === 'oauth')))) : [];
        return {
            userId: s.userId,
            emailMasked: (0, account_1.maskEmail)(s.email),
            providers: (s.providers.length ? s.providers.filter((p) => KNOWN_PROVIDERS.includes(p)) : fromToken),
            authAt: (0, pkce_1.lastSignInAt)(claims),
            termsVersion: null,
        };
    };
    const save = (s, shared) => {
        try {
            store.write(s, shared);
        }
        catch {
            throw new types_1.CloudError('server');
        }
    };
    const refreshLocked = (stale) => deps.lock.request(config_1.AUTH_LOCK, async () => {
        var _a, _b;
        const cur = store.read();
        if (!cur)
            throw new types_1.CloudError('unauthorized');
        const adopted = stale !== null && cur.refreshToken !== stale.refreshToken;
        if (adopted && cur.expiresAt - now() > config_1.REFRESH_MARGIN_MS)
            return cur;
        const shared = store.shared();
        const r = await send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: cur.refreshToken }) });
        const after = store.read();
        if (!after)
            throw new types_1.CloudError('unauthorized');
        if (after.refreshToken !== cur.refreshToken)
            return after;
        if (!ok(r)) {
            const e = fail('refresh', r);
            if (e.code === 'unauthorized')
                store.clear();
            throw e;
        }
        const next = sessionFrom((0, errors_1.bodyObject)(r.text), now());
        if (!next)
            throw new types_1.CloudError('server');
        save({ ...next, email: (_a = next.email) !== null && _a !== void 0 ? _a : cur.email, providers: next.providers.length ? next.providers : cur.providers }, shared);
        return (_b = store.read()) !== null && _b !== void 0 ? _b : next;
    });
    const clearLocked = async () => {
        store.clear();
        await deps.lock.request(config_1.AUTH_LOCK, async () => store.clear());
    };
    const accessToken = async () => {
        const s = store.read();
        if (!s)
            throw new types_1.CloudError('unauthorized');
        if (s.expiresAt - now() > config_1.REFRESH_MARGIN_MS)
            return s.accessToken;
        return (await refreshLocked(s)).accessToken;
    };
    const authedFetch = async (path, init, call) => {
        for (let attempt = 0;; attempt++) {
            const before = store.read();
            const token = await accessToken();
            const r = await send(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
            if (!r.res)
                throw new types_1.CloudError('offline');
            if (r.res.status === 401 && attempt === 0 && (0, errors_1.bodyObject)(r.text).error !== 'reauth_required') {
                await refreshLocked(before);
                continue;
            }
            return { status: r.res.status, headers: r.res.headers, text: async () => r.text };
        }
    };
    return {
        async sendEmailCode(email, opts) {
            const e = (0, account_1.normalizeEmail)(email);
            if (!(0, account_1.validEmail)(e))
                throw new types_1.CloudError('invalid', undefined, 'email');
            const body = { email: e, create_user: true };
            if (opts === null || opts === void 0 ? void 0 : opts.captchaToken)
                body.gotrue_meta_security = { captcha_token: opts.captchaToken };
            const r = await send('/auth/v1/otp', { method: 'POST', body: JSON.stringify(body) });
            if (!ok(r))
                throw fail('otp', r);
        },
        async verifyEmailCode(email, code, opts) {
            const e = (0, account_1.normalizeEmail)(email);
            const c = code.replace(/\s+/g, '');
            if (!(0, account_1.validEmail)(e))
                throw new types_1.CloudError('invalid', undefined, 'email');
            if (!CODE_RE.test(c))
                throw new types_1.CloudError('invalid', undefined, 'code_wrong');
            const r = await send('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ type: 'email', email: e, token: c }) });
            if (!ok(r))
                throw fail('verify', r);
            const s = sessionFrom((0, errors_1.bodyObject)(r.text), now());
            if (!s)
                throw new types_1.CloudError('server');
            save(s, Boolean(opts === null || opts === void 0 ? void 0 : opts.shared));
            return info(s);
        },
        googleSignInUrl(opts) {
            const verifier = (0, pkce_1.makeVerifier)(deps.random);
            deps.stores.session.setItem(config_1.PKCE_KEY, JSON.stringify({ verifier, shared: Boolean(opts === null || opts === void 0 ? void 0 : opts.shared), at: now() }));
            const q = [
                ['provider', 'google'],
                ['redirect_to', redirectTo],
                ['code_challenge', (0, pkce_1.challengeFor)(verifier)],
                ['code_challenge_method', 's256'],
            ]
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            return `${base}/auth/v1/authorize?${q}`;
        },
        async finishGoogleSignIn(code) {
            var _a;
            let saved = {};
            try {
                saved = (0, errors_1.bodyObject)((_a = deps.stores.session.getItem(config_1.PKCE_KEY)) !== null && _a !== void 0 ? _a : '');
            }
            finally {
                try {
                    deps.stores.session.removeItem(config_1.PKCE_KEY);
                }
                catch {
                }
            }
            if (!(0, pkce_1.isVerifier)(saved.verifier))
                throw new types_1.CloudError('invalid', undefined, 'oauth');
            const startedAt = typeof saved.at === 'number' ? saved.at : NaN;
            if (!(now() - startedAt <= exports.PKCE_MAX_AGE_MS && startedAt - now() <= 60000))
                throw new types_1.CloudError('invalid', undefined, 'oauth');
            if (typeof code !== 'string' || !/^[A-Za-z0-9._~-]{8,512}$/.test(code))
                throw new types_1.CloudError('invalid', undefined, 'oauth');
            const r = await send('/auth/v1/token?grant_type=pkce', { method: 'POST', body: JSON.stringify({ auth_code: code, code_verifier: saved.verifier }) });
            if (!ok(r))
                throw fail('pkce', r);
            const s = sessionFrom((0, errors_1.bodyObject)(r.text), now());
            if (!s)
                throw new types_1.CloudError('server');
            save(s, saved.shared === true);
            return info(s);
        },
        current() {
            const s = store.read();
            return s ? info(s) : null;
        },
        sharedComputer: () => store.shared(),
        accessToken,
        refresh: () => refreshLocked(store.read()),
        async signOut(scope) {
            const s = store.read();
            if (!s)
                return;
            if (scope === 'global') {
                const r = await send('/auth/v1/logout?scope=global', { method: 'POST', headers: { authorization: `Bearer ${s.accessToken}` } });
                if (!ok(r)) {
                    const e = fail('logout', r);
                    if (e.code !== 'unauthorized')
                        throw e;
                }
                await clearLocked();
                return;
            }
            await clearLocked();
            await send('/auth/v1/logout?scope=local', { method: 'POST', headers: { authorization: `Bearer ${s.accessToken}` } });
        },
        async getUser() {
            const res = await authedFetch('/auth/v1/user', { method: 'GET' }, 'user');
            const text = await res.text();
            if (res.status < 200 || res.status >= 300)
                throw (0, errors_1.toCloudError)('user', res.status, text, res);
            const u = (0, errors_1.bodyObject)(text);
            if (typeof u.id !== 'string' || !UUID_RE.test(u.id))
                throw new types_1.CloudError('server');
            return { id: u.id, email: typeof u.email === 'string' ? u.email : null, providers: providersOf(u) };
        },
        authedFetch,
        async callFunction(name, body) {
            if (!FUNCTIONS.has(name))
                throw new types_1.CloudError('invalid');
            const res = await authedFetch(`/functions/v1/${name}`, { method: 'POST', body: JSON.stringify(body) }, 'function');
            const text = await res.text();
            if (res.status < 200 || res.status >= 300)
                throw (0, errors_1.toCloudError)('function', res.status, text, res);
            if (name === 'delete-account')
                await clearLocked();
            return text;
        },
        async termsVersion() {
            const res = await authedFetch('/rest/v1/profiles?select=terms_version&limit=1', { method: 'GET' }, 'rest');
            const text = await res.text();
            if (res.status < 200 || res.status >= 300)
                throw (0, errors_1.toCloudError)('rest', res.status, text, res);
            let rows;
            try {
                rows = JSON.parse(text);
            }
            catch {
                throw new types_1.CloudError('server');
            }
            const v = Array.isArray(rows) && rows[0] && typeof rows[0] === 'object' ? rows[0].terms_version : null;
            return typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) ? v : null;
        },
        async acceptTerms(v) {
            if (!/^\d{4}-\d{2}$/.test(v.termsVersion) || v.ageConfirmed !== true)
                throw new types_1.CloudError('invalid');
            const s = store.read();
            if (!s)
                throw new types_1.CloudError('unauthorized');
            const ins = await authedFetch('/rest/v1/profiles', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ terms_version: v.termsVersion, age_confirmed: true }) }, 'rest');
            const insText = await ins.text();
            if (ins.status >= 200 && ins.status < 300)
                return;
            const e = (0, errors_1.toCloudError)('rest', ins.status, insText, ins);
            if (e.code !== 'conflict')
                throw e;
            if (!UUID_RE.test(s.userId))
                throw new types_1.CloudError('invalid');
            const up = await authedFetch(`/rest/v1/profiles?id=eq.${s.userId}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ terms_version: v.termsVersion }) }, 'rest');
            const upText = await up.text();
            if (up.status < 200 || up.status >= 300)
                throw (0, errors_1.toCloudError)('rest', up.status, upText, up);
        },
    };
}
  };
  links["src/webcloud/base64.ts"] = {};
  defs["src/webcloud/base64.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBase64 = toBase64;
exports.toBase64Url = toBase64Url;
exports.fromBase64 = fromBase64;
exports.fromBase64Url = fromBase64Url;
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function encodeWith(bytes, alphabet, pad) {
    let out = '';
    let i = 0;
    for (; i + 2 < bytes.length; i += 3) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        out += alphabet[n >> 18] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
    }
    const rest = bytes.length - i;
    if (rest === 1) {
        const n = bytes[i] << 16;
        out += alphabet[n >> 18] + alphabet[(n >> 12) & 63] + (pad ? '==' : '');
    }
    else if (rest === 2) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
        out += alphabet[n >> 18] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + (pad ? '=' : '');
    }
    return out;
}
function toBase64(bytes) {
    return encodeWith(bytes, STD, true);
}
function toBase64Url(bytes) {
    return encodeWith(bytes, URL_SAFE, false);
}
function fromBase64(text) {
    if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))
        return null;
    return decodeWith(text.replace(/=+$/, ''), STD);
}
function fromBase64Url(text) {
    if (!/^[A-Za-z0-9_-]*={0,2}$/.test(text))
        return null;
    const body = text.replace(/=+$/, '');
    if (body.length % 4 === 1)
        return null;
    return decodeWith(body, URL_SAFE);
}
function decodeWith(body, alphabet) {
    const out = new Uint8Array(Math.floor((body.length * 3) / 4));
    let o = 0;
    let acc = 0;
    let bits = 0;
    for (let i = 0; i < body.length; i++) {
        const v = alphabet.indexOf(body[i]);
        if (v < 0)
            return null;
        acc = ((acc << 6) | v) & 0x3fff;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out[o++] = (acc >> bits) & 0xff;
        }
    }
    return out.slice(0, o);
}
  };
  links["src/webcloud/browser.ts"] = {};
  defs["src/webcloud/browser.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noStorage = exports.browserClock = void 0;
exports.browserLocks = browserLocks;
exports.pageLocks = pageLocks;
exports.browserRandom = browserRandom;
exports.browserStorage = browserStorage;
function browserLocks(locks) {
    if (locks && typeof locks.request === 'function') {
        return { request: (name, fn) => locks.request(name, fn) };
    }
    return pageLocks();
}
function pageLocks() {
    const tails = new Map();
    return {
        request(name, fn) {
            var _a;
            const prev = (_a = tails.get(name)) !== null && _a !== void 0 ? _a : Promise.resolve();
            const run = prev.then(fn, fn);
            tails.set(name, run.catch(() => undefined));
            return run;
        },
    };
}
function browserRandom(crypto) {
    return { bytes: (n) => crypto.getRandomValues(new Uint8Array(n)) };
}
exports.browserClock = { now: () => Date.now() };
exports.noStorage = {
    getItem: () => null,
    setItem: () => {
        throw new Error('storage unavailable');
    },
    removeItem: () => { },
};
function browserStorage(get) {
    var _a;
    try {
        return (_a = get()) !== null && _a !== void 0 ? _a : exports.noStorage;
    }
    catch {
        return exports.noStorage;
    }
}
  };
  links["src/webcloud/codec.ts"] = {"../engine/sha256":"src/engine/sha256.ts","../cloud/types":"src/cloud/types.ts","./base64":"src/webcloud/base64.ts","./utf8":"src/webcloud/utf8.ts"};
  defs["src/webcloud/codec.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodecError = exports.ENCODING = exports.GZ_SLICE_BYTES = exports.MAX_SETTINGS_RAW_BYTES = exports.MAX_SETTINGS_GZ_CHARS = exports.MAX_GZ_CHARS = exports.MAX_RAW_BYTES = void 0;
exports.encodeSnapshot = encodeSnapshot;
exports.decodeSnapshot = decodeSnapshot;
exports.streamGzip = streamGzip;
const sha256_1 = require("../engine/sha256");
const types_1 = require("../cloud/types");
const base64_1 = require("./base64");
const utf8_1 = require("./utf8");
exports.MAX_RAW_BYTES = 2000000;
exports.MAX_GZ_CHARS = 200000;
exports.MAX_SETTINGS_GZ_CHARS = 32768;
exports.MAX_SETTINGS_RAW_BYTES = 98304;
exports.GZ_SLICE_BYTES = 1024;
exports.ENCODING = 'gzip+base64';
class CodecError extends Error {
    constructor(code) {
        super(`snapshot unreadable: ${code}`);
        this.code = code;
        this.name = 'CodecError';
    }
}
exports.CodecError = CodecError;
async function encodeSnapshot(store, state, gz) {
    const raw = (0, sha256_1.utf8)(JSON.stringify(state));
    const rawCap = store === 'settings' ? exports.MAX_SETTINGS_RAW_BYTES : exports.MAX_RAW_BYTES;
    if (raw.length < 2 || raw.length > rawCap)
        throw new types_1.CloudError('too_big');
    const zipped = await gz.gzip(raw);
    if (zipped.length < 18 || zipped[0] !== 0x1f || zipped[1] !== 0x8b || zipped[2] !== 0x08)
        throw new types_1.CloudError('server');
    const text = (0, base64_1.toBase64)(zipped);
    const gzCap = store === 'settings' ? exports.MAX_SETTINGS_GZ_CHARS : exports.MAX_GZ_CHARS;
    if (text.length > gzCap)
        throw new types_1.CloudError('too_big');
    return { state_gz: text, raw_bytes: raw.length };
}
const B64 = /^H4sI[A-Za-z0-9+/]+={0,2}$/;
function gzBytes(text) {
    if (text.length > exports.MAX_GZ_CHARS)
        throw new CodecError('too_big');
    if (text.length % 4 !== 0 || !B64.test(text))
        throw new CodecError('bad_base64');
    const out = (0, base64_1.fromBase64)(text);
    if (!out)
        throw new CodecError('bad_base64');
    return out;
}
async function decodeSnapshot(row, gz, cap = exports.MAX_RAW_BYTES) {
    if (row.encoding !== exports.ENCODING)
        throw new CodecError('unknown_encoding');
    if (typeof row.state_gz !== 'string')
        throw new CodecError('bad_base64');
    const rawBytes = row.raw_bytes;
    if (typeof rawBytes !== 'number' || !Number.isInteger(rawBytes) || rawBytes < 2)
        throw new CodecError('size_mismatch');
    if (rawBytes > cap)
        throw new CodecError('too_big');
    const bytes = gzBytes(row.state_gz);
    if (bytes.length < 18 || bytes[0] !== 0x1f || bytes[1] !== 0x8b || bytes[2] !== 0x08)
        throw new CodecError('not_gzip');
    const raw = await gz.gunzipCapped(bytes, rawBytes + 1);
    if (raw.length !== rawBytes)
        throw new CodecError('size_mismatch');
    const text = (0, utf8_1.decodeUtf8)(raw);
    if (text === null)
        throw new CodecError('bad_json');
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        throw new CodecError('bad_json');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new CodecError('bad_json');
    return parsed;
}
async function readAll(reader, cap, badCode) {
    const parts = [];
    let total = 0;
    try {
        for (;;) {
            let chunk;
            try {
                chunk = await reader.read();
            }
            catch {
                throw new CodecError(badCode);
            }
            if (chunk.done || !chunk.value)
                break;
            total += chunk.value.byteLength;
            if (total > cap)
                throw new CodecError('too_big');
            parts.push(chunk.value);
        }
    }
    finally {
        await reader.cancel().catch(() => { });
    }
    const all = new Uint8Array(total);
    let at = 0;
    for (const p of parts) {
        all.set(p, at);
        at += p.byteLength;
    }
    return all;
}
function slices(env, bytes, size) {
    let offset = 0;
    return new env.ReadableStream({
        pull(controller) {
            if (offset >= bytes.length) {
                controller.close();
                return;
            }
            const end = Math.min(offset + size, bytes.length);
            controller.enqueue(bytes.slice(offset, end));
            offset = end;
        },
    }, { highWaterMark: 0 });
}
function streamGzip(env) {
    return {
        async gzip(bytes) {
            const reader = slices(env, bytes, 64 * 1024).pipeThrough(new env.CompressionStream('gzip')).getReader();
            return readAll(reader, Number.MAX_SAFE_INTEGER, 'bad_gzip');
        },
        async gunzipCapped(gz, cap) {
            const reader = slices(env, gz, exports.GZ_SLICE_BYTES).pipeThrough(new env.DecompressionStream('gzip')).getReader();
            return readAll(reader, cap, 'bad_gzip');
        },
    };
}
  };
  links["src/webcloud/config.ts"] = {};
  defs["src/webcloud/config.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEB_CERT = exports.REFRESH_MARGIN_MS = exports.SYNC_LOCK = exports.AUTH_LOCK = exports.DEVICE_ID_KEY = exports.SYNC_UNDO_KEY = exports.SYNC_MIRROR_KEY = exports.SYNC_META_KEY = exports.PKCE_KEY = exports.SESSION_KEY = exports.ACCOUNT_ORIGIN = exports.REDIRECT_URL = exports.PUBLISHABLE_KEY = exports.SUPABASE_URL = void 0;
exports.SUPABASE_URL = 'https://ziadnvepttlgcowvqvom.supabase.co';
exports.PUBLISHABLE_KEY = 'sb_publishable_s9eKQUQ0w3MTnCUBF05EkA_5e_kGEw2';
exports.REDIRECT_URL = 'https://kaisip.com/';
exports.ACCOUNT_ORIGIN = 'https://kaisip.com';
exports.SESSION_KEY = 'kaisip_auth_v1';
exports.PKCE_KEY = 'kaisip_pkce_v1';
exports.SYNC_META_KEY = 'kaisip_sync_v1';
exports.SYNC_MIRROR_KEY = 'kaisip_sync_mirror_v1';
exports.SYNC_UNDO_KEY = 'kaisip_sync_undo_v1';
exports.DEVICE_ID_KEY = 'kaisip_device_v1';
exports.AUTH_LOCK = 'kaisip-auth';
exports.SYNC_LOCK = 'kaisip-sync';
exports.REFRESH_MARGIN_MS = 60000;
exports.WEB_CERT = 'cisa';
  };
  links["src/webcloud/device.ts"] = {"../engine/syncMeta":"src/engine/syncMeta.ts","../engine/syncMerge":"src/engine/syncMerge.ts","../engine/webImport":"src/engine/webImport.ts","../engine/streak":"src/engine/streak.ts","./config":"src/webcloud/config.ts","./toWeb":"src/webcloud/toWeb.ts"};
  defs["src/webcloud/device.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLANK_PROGRESS = exports.BLANK_SETTINGS = exports.WEB_UNDO_DAYS = void 0;
exports.readMeta = readMeta;
exports.viewOf = viewOf;
exports.createWebDevice = createWebDevice;
const syncMeta_1 = require("../engine/syncMeta");
const syncMerge_1 = require("../engine/syncMerge");
const webImport_1 = require("../engine/webImport");
const streak_1 = require("../engine/streak");
const config_1 = require("./config");
const toWeb_1 = require("./toWeb");
exports.WEB_UNDO_DAYS = 7;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_TODAY = { day: '', answered: 0 };
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const BLANK_SETTINGS = () => ({ onboarded: true, activeCertId: config_1.WEB_CERT });
exports.BLANK_SETTINGS = BLANK_SETTINGS;
const BLANK_PROGRESS = () => ({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { ...PLACEHOLDER_TODAY } });
exports.BLANK_PROGRESS = BLANK_PROGRESS;
const blankMeta = () => ({ ...syncMeta_1.SYNC_OFF, lastRev: { ...syncMeta_1.SYNC_OFF.lastRev }, lastAt: { ...syncMeta_1.SYNC_OFF.lastAt }, lastPushedHash: { ...syncMeta_1.SYNC_OFF.lastPushedHash }, pausedRev: { ...syncMeta_1.SYNC_OFF.pausedRev }, stamps: { settings: {}, progress: {} } });
function parse(raw) {
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function readMeta(raw) {
    const v = parse(raw);
    const base = blankMeta();
    if (!isObj(v))
        return base;
    const per = (x, ok, fallback) => isObj(x) ? { settings: ok(x.settings) ? x.settings : fallback.settings, progress: ok(x.progress) ? x.progress : fallback.progress } : fallback;
    const numOrNull = (y) => y === null || (typeof y === 'number' && Number.isFinite(y));
    const strOrNull = (y) => y === null || (typeof y === 'string' && y.length <= 64);
    const stampMap = (y) => isObj(y) && Object.values(y).every((n) => typeof n === 'number' && Number.isFinite(n));
    return {
        enabled: v.enabled === true,
        accountHash: typeof v.accountHash === 'string' && /^[0-9a-f]{64}$/.test(v.accountHash) ? v.accountHash : null,
        lastRev: per(v.lastRev, numOrNull, base.lastRev),
        lastAt: per(v.lastAt, numOrNull, base.lastAt),
        lastPushedHash: per(v.lastPushedHash, strOrNull, base.lastPushedHash),
        pausedRev: per(v.pausedRev, numOrNull, base.pausedRev),
        lastSyncAt: typeof v.lastSyncAt === 'number' && Number.isFinite(v.lastSyncAt) ? v.lastSyncAt : null,
        pausedReason: v.pausedReason === 'newer' || v.pausedReason === 'unreadable' || v.pausedReason === 'toobig' ? v.pausedReason : null,
        deferredPull: v.deferredPull === true,
        stamps: per(v.stamps, stampMap, base.stamps),
    };
}
function viewOf(progress) {
    const byCert = isObj(progress.byCert) ? progress.byCert : {};
    const cert = (isObj(byCert[config_1.WEB_CERT]) ? byCert[config_1.WEB_CERT] : {});
    const streak = isObj(progress.streak) ? progress.streak : {};
    const days = Array.isArray(streak.recentDays) ? streak.recentDays : typeof streak.lastDay === 'string' ? [streak.lastDay] : [];
    return { cert, studyDays: days.filter((d) => typeof d === 'string' && DAY_RE.test(d)) };
}
function createWebDevice(deps) {
    var _a;
    const { host, storage, bank, clock } = deps;
    const knownCertIds = (_a = deps.knownCertIds) !== null && _a !== void 0 ? _a : [config_1.WEB_CERT];
    const mctx = () => ({ now: clock.now(), knownCertIds });
    const storedMirror = () => {
        const v = parse(storage.getItem(config_1.SYNC_MIRROR_KEY));
        if (isObj(v) && v.v === 1 && isObj(v.settings) && isObj(v.progress)) {
            return { v: 1, settings: v.settings, progress: v.progress, examDateSeen: typeof v.examDateSeen === 'string' && DAY_RE.test(v.examDateSeen) ? v.examDateSeen : null };
        }
        return null;
    };
    const loadMirror = () => { var _a; return (_a = storedMirror()) !== null && _a !== void 0 ? _a : { v: 1, settings: (0, exports.BLANK_SETTINGS)(), progress: (0, exports.BLANK_PROGRESS)(), examDateSeen: null }; };
    const saveMirror = (m) => storage.setItem(config_1.SYNC_MIRROR_KEY, JSON.stringify(m));
    const meta = () => {
        const m = readMeta(storage.getItem(config_1.SYNC_META_KEY));
        if (storedMirror())
            return m;
        const none = { settings: null, progress: null };
        return { ...m, lastRev: { ...none }, lastAt: { ...none }, lastPushedHash: { ...none } };
    };
    const setMeta = (m) => storage.setItem(config_1.SYNC_META_KEY, JSON.stringify({ ...meta(), ...m }));
    const webDate = () => {
        const d = host.examDate();
        return typeof d === 'string' && DAY_RE.test(d) ? d : null;
    };
    const read = () => {
        var _a, _b;
        const mirror = loadMirror();
        const now = clock.now();
        const date = webDate();
        if (date !== mirror.examDateSeen && storedMirror()) {
            const m = meta();
            setMeta({ stamps: { ...m.stamps, settings: { ...m.stamps.settings, [`examDates.${config_1.WEB_CERT}`]: now } } });
            saveMirror({ ...mirror, examDateSeen: date });
        }
        const examDates = { ...(isObj(mirror.settings.examDates) ? mirror.settings.examDates : {}) };
        if (date)
            examDates[config_1.WEB_CERT] = date;
        else
            delete examDates[config_1.WEB_CERT];
        const settings = { ...(0, exports.BLANK_SETTINGS)(), ...mirror.settings, onboarded: true };
        if (Object.keys(examDates).length)
            settings.examDates = examDates;
        else
            delete settings.examDates;
        const web = host.readWeb();
        const view = viewOf(mirror.progress);
        const changes = (0, toWeb_1.webChanges)(web, (0, toWeb_1.toWeb)(view, web, bank));
        if ((0, toWeb_1.noChanges)(changes))
            return { settings, progress: { ...mirror.progress, today: { ...PLACEHOLDER_TODAY } } };
        const appMockIds = new Set(((_a = view.cert.mocks) !== null && _a !== void 0 ? _a : []).map((m) => m.id));
        const added = (0, toWeb_1.fromWeb)(changes, bank, now, appMockIds);
        const streak = isObj(mirror.progress.streak) ? mirror.progress.streak : {};
        const webState = {
            byCert: { [config_1.WEB_CERT]: added.cert },
            streak: (0, webImport_1.streakFromDays)(added.studyDays, (0, streak_1.dayKey)(now), (_b = streak.restDay) !== null && _b !== void 0 ? _b : null),
        };
        const ctx = mctx();
        const mine = (0, syncMerge_1.localSide)('progress', { ...mirror.progress, today: { ...PLACEHOLDER_TODAY } }, {}, ctx);
        const theirs = (0, syncMerge_1.localSide)('progress', { ...webState, today: { ...PLACEHOLDER_TODAY } }, {}, ctx);
        const merged = (0, syncMerge_1.mergeSides)('progress', mine, theirs, ctx);
        return { settings, progress: { ...merged.state, today: { ...PLACEHOLDER_TODAY } } };
    };
    const undo = () => {
        const v = parse(storage.getItem(config_1.SYNC_UNDO_KEY));
        if (!isObj(v) || typeof v.takenAt !== 'number' || !isObj(v.state))
            return null;
        if (clock.now() - v.takenAt > exports.WEB_UNDO_DAYS * 86400000) {
            storage.removeItem(config_1.SYNC_UNDO_KEY);
            return null;
        }
        return { takenAt: v.takenAt, state: v.state };
    };
    return {
        read,
        async write(next, opts) {
            if (opts.undo)
                storage.setItem(config_1.SYNC_UNDO_KEY, JSON.stringify({ takenAt: clock.now(), state: host.readWeb() }));
            const target = opts.rebase ? opts.rebase(read()) : next;
            if (!target)
                throw new Error('rebase failed');
            const settings = target.settings;
            const progress = target.progress;
            const dates = isObj(settings.examDates) ? settings.examDates : {};
            const date = typeof dates[config_1.WEB_CERT] === 'string' && DAY_RE.test(dates[config_1.WEB_CERT]) ? dates[config_1.WEB_CERT] : null;
            saveMirror({ v: 1, settings: { ...settings }, progress: { ...progress }, examDateSeen: date });
            host.writeWeb((0, toWeb_1.toWeb)(viewOf(progress), host.readWeb(), bank));
            if (date !== webDate())
                host.setExamDate(date);
        },
        meta,
        setMeta,
        busy: () => host.busy(),
        mirror() {
            const m = loadMirror();
            return { settings: m.settings, progress: m.progress };
        },
        forget() {
            storage.removeItem(config_1.SYNC_META_KEY);
            storage.removeItem(config_1.SYNC_MIRROR_KEY);
        },
        undo,
        restoreUndo() {
            const u = undo();
            if (!u)
                return false;
            host.writeWeb(u.state);
            storage.removeItem(config_1.SYNC_UNDO_KEY);
            return true;
        },
        dropUndo() {
            storage.removeItem(config_1.SYNC_UNDO_KEY);
        },
    };
}
  };
  links["src/webcloud/errors.ts"] = {"../cloud/types":"src/cloud/types.ts"};
  defs["src/webcloud/errors.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyObject = bodyObject;
exports.retryAfter = retryAfter;
exports.toCloudError = toCloudError;
exports.asCloudError = asCloudError;
const types_1 = require("../cloud/types");
function bodyObject(text) {
    if (text.length > 65536)
        return {};
    try {
        const v = JSON.parse(text);
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    }
    catch {
        return {};
    }
}
function retryAfter(res) {
    const v = Number(res.headers.get('retry-after'));
    return Number.isFinite(v) && v > 0 && v <= 86400 ? Math.ceil(v) : undefined;
}
const str = (x) => (typeof x === 'string' ? x : '');
function authWord(b) {
    return (str(b.error_code) || str(b.error)).toLowerCase();
}
const FUNCTION_CODES = new Set(['unauthorized', 'gone', 'reauth_required', 'rate_limited', 'invalid', 'too_big', 'server']);
function toCloudError(call, status, text, res) {
    if (status === 0)
        return new types_1.CloudError('offline');
    const b = bodyObject(text);
    const after = res ? retryAfter(res) : undefined;
    if (status === 429)
        return new types_1.CloudError('rate_limited', after);
    if (status >= 500)
        return new types_1.CloudError('server');
    if (call === 'function') {
        const code = str(b.error);
        if (FUNCTION_CODES.has(code)) {
            const detail = str(b.detail);
            return new types_1.CloudError(code, after, /^[a-z_]{1,40}$/.test(detail) ? detail : undefined);
        }
        return new types_1.CloudError(status === 401 ? 'unauthorized' : 'server');
    }
    if (call === 'rest') {
        const pg = str(b.code);
        const msg = str(b.message);
        if (status === 401 || pg === 'PGRST301' || pg === 'PGRST302')
            return new types_1.CloudError('unauthorized');
        if (status === 409 || pg === '23505')
            return new types_1.CloudError('conflict');
        if (pg === 'P0001' && msg === 'rate_limited')
            return new types_1.CloudError('rate_limited', after);
        if (pg === '42501')
            return new types_1.CloudError('invalid', undefined, 'terms');
        if (status === 413)
            return new types_1.CloudError('too_big');
        if (pg === '23514')
            return /state_gz|raw_bytes|sync_settings_size/.test(msg) ? new types_1.CloudError('too_big') : new types_1.CloudError('invalid', undefined, 'row');
        return new types_1.CloudError('invalid', undefined, 'row');
    }
    const word = authWord(b);
    switch (call) {
        case 'otp':
            if (word.includes('captcha'))
                return new types_1.CloudError('invalid', undefined, 'captcha');
            if (word.includes('rate_limit'))
                return new types_1.CloudError('rate_limited', after);
            if (word === 'signup_disabled' || word === 'email_provider_disabled')
                return new types_1.CloudError('invalid', undefined, 'signup_disabled');
            return new types_1.CloudError('invalid', undefined, 'email');
        case 'verify':
            return new types_1.CloudError('invalid', undefined, 'code_wrong');
        case 'pkce':
            return new types_1.CloudError('invalid', undefined, 'oauth');
        case 'refresh':
            return new types_1.CloudError('unauthorized');
        case 'logout':
        case 'user':
            return new types_1.CloudError(status === 401 || status === 403 || status === 404 ? 'unauthorized' : 'invalid');
        default:
            return new types_1.CloudError('server');
    }
}
function asCloudError(e) {
    return e instanceof types_1.CloudError ? e : new types_1.CloudError('offline');
}
  };
  links["src/webcloud/index.ts"] = {"../engine/account":"src/engine/account.ts","../engine/backup":"src/engine/backup.ts","../lib/syncCore":"src/lib/syncCore.ts","../cloud/deviceId":"src/cloud/deviceId.ts","../cloud/types":"src/cloud/types.ts","./auth":"src/webcloud/auth.ts","./codec":"src/webcloud/codec.ts","./config":"src/webcloud/config.ts","./device":"src/webcloud/device.ts","./rest":"src/webcloud/rest.ts"};
  defs["src/webcloud/index.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountsAllowed = accountsAllowed;
exports.originAllowed = originAllowed;
exports.syncStorage = syncStorage;
exports.webDeviceId = webDeviceId;
exports.createWebCloud = createWebCloud;
const account_1 = require("../engine/account");
const backup_1 = require("../engine/backup");
const syncCore_1 = require("../lib/syncCore");
const deviceId_1 = require("../cloud/deviceId");
const types_1 = require("../cloud/types");
const auth_1 = require("./auth");
const codec_1 = require("./codec");
const config_1 = require("./config");
const device_1 = require("./device");
const rest_1 = require("./rest");
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const KEEP_UNDO = { takenAt: 0, kind: 'sync' };
function accountsAllowed(origin) {
    return origin === config_1.ACCOUNT_ORIGIN;
}
function originAllowed(origin, devOrigin = false) {
    if (accountsAllowed(origin))
        return true;
    return devOrigin && (origin === '' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin));
}
function syncStorage(stores, shared) {
    const pick = () => (shared() ? { to: stores.session, other: stores.local } : { to: stores.local, other: stores.session });
    const quietRemove = (s, k) => {
        try {
            s.removeItem(k);
        }
        catch {
        }
    };
    return {
        getItem: (k) => pick().to.getItem(k),
        setItem: (k, v) => {
            const { to, other } = pick();
            to.setItem(k, v);
            quietRemove(other, k);
        },
        removeItem: (k) => {
            quietRemove(stores.local, k);
            quietRemove(stores.session, k);
        },
    };
}
function webDeviceId(storage, random) {
    const saved = storage.getItem(config_1.DEVICE_ID_KEY);
    if ((0, deviceId_1.isDeviceId)(saved))
        return saved;
    const id = (0, deviceId_1.uuidV4)(random.bytes(16));
    storage.setItem(config_1.DEVICE_ID_KEY, id);
    return id;
}
function createWebCloud(o) {
    var _a;
    if (!originAllowed(o.origin, o.devOrigin))
        throw new Error('KaiSipCloud: accounts run only on https://kaisip.com');
    if (!SEMVER.test(o.appVersion))
        throw new Error('KaiSipCloud: appVersion must be x.y.z');
    const sv = o.storeVersions;
    if (sv && !(Number.isInteger(sv.progress) && sv.progress >= 1 && Number.isInteger(sv.settings) && sv.settings >= 1))
        throw new Error('KaiSipCloud: storeVersions must be whole numbers');
    const gzip = 'gunzipCapped' in o.gzip ? o.gzip : (0, codec_1.streamGzip)(o.gzip);
    const auth = (0, auth_1.createWebAuth)({ fetch: o.fetch, stores: o.stores, random: o.random, lock: o.lock, clock: o.clock, url: o.url, apiKey: o.apiKey });
    const sync = (0, rest_1.createRestSync)(auth, gzip);
    const device = (0, device_1.createWebDevice)({ host: o.host, storage: syncStorage(o.stores, () => auth.sharedComputer()), bank: o.bank, clock: o.clock });
    const wait = (_a = o.wait) !== null && _a !== void 0 ? _a : ((ms) => new Promise((r) => setTimeout(r, ms)));
    const deviceId = async () => webDeviceId(o.stores.local, o.random);
    const signedInHash = () => {
        const a = auth.current();
        return a ? (0, account_1.accountHash)(a.userId) : null;
    };
    const ctx = () => {
        const hash = signedInHash();
        return {
            port: sync,
            device,
            deviceId,
            thisApp: o.appVersion,
            storeVersions: o.storeVersions,
            now: () => o.clock.now(),
            knownCertIds: [config_1.WEB_CERT],
            wait,
            alive: () => hash !== null && signedInHash() === hash && device.meta().enabled,
        };
    };
    return {
        auth,
        sync,
        device,
        deviceId,
        syncNow: () => o.lock.request(config_1.SYNC_LOCK, async () => {
            const m = device.meta();
            const hash = signedInHash();
            if (!hash || !m.enabled)
                return { kind: 'idle' };
            if (m.accountHash && m.accountHash !== hash)
                return { kind: 'idle' };
            return (0, syncCore_1.syncCycle)(ctx());
        }),
        prepareFirst: async () => {
            if (!signedInHash())
                return { ok: false, code: 'unauthorized' };
            return (0, syncCore_1.prepareFirstSync)({ port: sync, thisApp: o.appVersion, now: () => o.clock.now(), knownCertIds: [config_1.WEB_CERT], read: () => device.read(), stamps: device.meta().stamps });
        },
        confirmFirst: (prep, mode) => o.lock.request(config_1.SYNC_LOCK, async () => {
            const hash = signedInHash();
            if (!hash)
                return { kind: 'failed', code: 'unauthorized' };
            try {
                return await (0, syncCore_1.confirmFirstSync)({ ...ctx(), alive: () => signedInHash() === hash }, prep, mode, mode === 'replace' ? KEEP_UNDO : null, { accountHash: hash });
            }
            catch (e) {
                if (e instanceof types_1.CloudError)
                    return { kind: 'failed', code: e.code };
                if (e instanceof backup_1.BackupError)
                    return { kind: 'paused', reason: 'toobig' };
                throw e;
            }
        }),
        accountChanged() {
            const m = device.meta();
            const hash = signedInHash();
            return Boolean(m.accountHash && hash && m.accountHash !== hash);
        },
    };
}
  };
  links["src/webcloud/pkce.ts"] = {"../engine/sha256":"src/engine/sha256.ts","./base64":"src/webcloud/base64.ts","./utf8":"src/webcloud/utf8.ts"};
  defs["src/webcloud/pkce.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeVerifier = makeVerifier;
exports.isVerifier = isVerifier;
exports.challengeFor = challengeFor;
exports.tokenClaims = tokenClaims;
exports.lastSignInAt = lastSignInAt;
const sha256_1 = require("../engine/sha256");
const base64_1 = require("./base64");
const utf8_1 = require("./utf8");
function makeVerifier(random) {
    const bytes = random.bytes(32);
    if (bytes.length < 32)
        throw new Error('PKCE needs 32 random bytes');
    return (0, base64_1.toBase64Url)(bytes.slice(0, 32));
}
function isVerifier(v) {
    return typeof v === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(v);
}
function challengeFor(verifier) {
    const ascii = Uint8Array.from(verifier, (c) => c.charCodeAt(0) & 0x7f);
    return (0, base64_1.toBase64Url)((0, sha256_1.sha256)(ascii));
}
function tokenClaims(token) {
    const parts = token.split('.');
    if (parts.length !== 3)
        return {};
    const bytes = (0, base64_1.fromBase64Url)(parts[1]);
    if (!bytes || bytes.length > 16384)
        return {};
    const text = (0, utf8_1.decodeUtf8)(bytes);
    if (text === null)
        return {};
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
    catch {
        return {};
    }
}
function lastSignInAt(claims) {
    let at = 0;
    for (const a of Array.isArray(claims.amr) ? claims.amr : []) {
        if (a && typeof a.timestamp === 'number' && Number.isFinite(a.timestamp))
            at = Math.max(at, a.timestamp * 1000);
    }
    return at;
}
  };
  links["src/webcloud/rest.ts"] = {"../cloud/types":"src/cloud/types.ts","./codec":"src/webcloud/codec.ts","./errors":"src/webcloud/errors.ts"};
  defs["src/webcloud/rest.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestSync = createRestSync;
const types_1 = require("../cloud/types");
const codec_1 = require("./codec");
const errors_1 = require("./errors");
const HEAD_COLS = 'store,rev,app_version,store_version,device_id,updated_at';
const PULL_COLS = `${HEAD_COLS},encoding,state_gz,raw_bytes`;
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORES = ['settings', 'progress'];
function headOf(store, row) {
    if (!row || typeof row !== 'object' || Array.isArray(row))
        throw new types_1.CloudError('server');
    const r = row;
    const updatedAt = typeof r.updated_at === 'string' ? Date.parse(r.updated_at) : NaN;
    if (r.store !== store ||
        typeof r.rev !== 'number' ||
        !Number.isSafeInteger(r.rev) ||
        typeof r.app_version !== 'string' ||
        !SEMVER.test(r.app_version) ||
        typeof r.store_version !== 'number' ||
        !Number.isInteger(r.store_version) ||
        typeof r.device_id !== 'string' ||
        !Number.isFinite(updatedAt)) {
        throw new types_1.CloudError('server');
    }
    return { store, rev: r.rev, appVersion: r.app_version, storeVersion: r.store_version, deviceId: r.device_id, updatedAt };
}
function createRestSync(auth, gz) {
    const rows = async (path, init) => {
        const res = await auth.authedFetch(`/rest/v1/${path}`, init, 'rest');
        const text = await res.text();
        if (res.status < 200 || res.status >= 300)
            throw (0, errors_1.toCloudError)('rest', res.status, text, res);
        if (res.status === 204 || text === '')
            return [];
        try {
            const v = JSON.parse(text);
            if (!Array.isArray(v))
                throw new types_1.CloudError('server');
            return v;
        }
        catch (e) {
            throw e instanceof types_1.CloudError ? e : new types_1.CloudError('server');
        }
    };
    const checkStore = (s) => {
        if (!STORES.includes(s))
            throw new types_1.CloudError('invalid', undefined, 'store');
    };
    return {
        async head(store) {
            checkStore(store);
            const found = await rows(`sync_snapshots?select=${HEAD_COLS}&store=eq.${store}&limit=1`, { method: 'GET' });
            return found.length ? headOf(store, found[0]) : null;
        },
        async pull(store) {
            checkStore(store);
            const found = await rows(`sync_snapshots?select=${PULL_COLS}&store=eq.${store}&limit=1`, { method: 'GET' });
            if (!found.length)
                return null;
            const head = headOf(store, found[0]);
            const row = found[0];
            try {
                return { ...head, state: await (0, codec_1.decodeSnapshot)({ encoding: row.encoding, state_gz: row.state_gz, raw_bytes: row.raw_bytes }, gz) };
            }
            catch {
                return { ...head, state: null };
            }
        },
        async push(i) {
            checkStore(i.store);
            if (!SEMVER.test(i.appVersion) || !Number.isInteger(i.storeVersion) || !UUID_RE.test(i.deviceId))
                throw new types_1.CloudError('invalid', undefined, 'row');
            if (!i.state || typeof i.state !== 'object' || Array.isArray(i.state))
                throw new types_1.CloudError('invalid', undefined, 'state');
            const enc = await (0, codec_1.encodeSnapshot)(i.store, i.state, gz);
            const cols = { store_version: i.storeVersion, app_version: i.appVersion, device_id: i.deviceId, state_gz: enc.state_gz, raw_bytes: enc.raw_bytes };
            const headers = { prefer: 'return=representation' };
            let out;
            if (i.expectedRev === null) {
                out = await rows(`sync_snapshots?select=${HEAD_COLS}`, { method: 'POST', headers, body: JSON.stringify({ store: i.store, ...cols }) });
            }
            else {
                if (!Number.isSafeInteger(i.expectedRev))
                    throw new types_1.CloudError('invalid', undefined, 'row');
                out = await rows(`sync_snapshots?select=${HEAD_COLS}&store=eq.${i.store}&rev=eq.${i.expectedRev}`, { method: 'PATCH', headers, body: JSON.stringify(cols) });
            }
            if (!out.length)
                throw new types_1.CloudError('conflict');
            return headOf(i.store, out[0]);
        },
        async deleteAll() {
            await rows('sync_snapshots?store=in.(progress,settings)', { method: 'DELETE', headers: { prefer: 'return=minimal' } });
        },
    };
}
  };
  links["src/webcloud/session.ts"] = {"./config":"src/webcloud/config.ts"};
  defs["src/webcloud/session.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSession = readSession;
exports.createSessionStore = createSessionStore;
const config_1 = require("./config");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]{8,8192}$/;
function readSession(raw) {
    if (!raw || raw.length > 20000)
        return null;
    let v;
    try {
        v = JSON.parse(raw);
    }
    catch {
        return null;
    }
    if (!v || typeof v !== 'object' || Array.isArray(v))
        return null;
    const o = v;
    if (o.v !== 1)
        return null;
    if (typeof o.accessToken !== 'string' || !TOKEN_RE.test(o.accessToken))
        return null;
    if (typeof o.refreshToken !== 'string' || !TOKEN_RE.test(o.refreshToken))
        return null;
    if (typeof o.expiresAt !== 'number' || !Number.isFinite(o.expiresAt) || o.expiresAt <= 0)
        return null;
    if (typeof o.userId !== 'string' || !UUID_RE.test(o.userId))
        return null;
    const email = typeof o.email === 'string' && o.email.length <= 320 ? o.email : null;
    const providers = Array.isArray(o.providers) ? o.providers.filter((p) => typeof p === 'string' && /^[a-z]{2,20}$/.test(p)).slice(0, 5) : [];
    return { v: 1, accessToken: o.accessToken, refreshToken: o.refreshToken, expiresAt: o.expiresAt, userId: o.userId, email, providers };
}
function safeGet(s, key) {
    try {
        return s.getItem(key);
    }
    catch {
        return null;
    }
}
function safeRemove(s, key) {
    try {
        s.removeItem(key);
    }
    catch {
    }
}
function createSessionStore(stores) {
    const pick = () => {
        for (const [store, shared] of [
            [stores.session, true],
            [stores.local, false],
        ]) {
            const raw = safeGet(store, config_1.SESSION_KEY);
            if (raw === null)
                continue;
            const s = readSession(raw);
            if (s)
                return { s, shared };
            safeRemove(store, config_1.SESSION_KEY);
        }
        return null;
    };
    return {
        read: () => { var _a, _b; return (_b = (_a = pick()) === null || _a === void 0 ? void 0 : _a.s) !== null && _b !== void 0 ? _b : null; },
        shared: () => { var _a, _b; return (_b = (_a = pick()) === null || _a === void 0 ? void 0 : _a.shared) !== null && _b !== void 0 ? _b : false; },
        write(s, shared) {
            const text = JSON.stringify(s);
            (shared ? stores.session : stores.local).setItem(config_1.SESSION_KEY, text);
            safeRemove(shared ? stores.local : stores.session, config_1.SESSION_KEY);
        },
        clear() {
            safeRemove(stores.local, config_1.SESSION_KEY);
            safeRemove(stores.session, config_1.SESSION_KEY);
        },
    };
}
  };
  links["src/webcloud/toWeb.ts"] = {"../engine/syncMerge":"src/engine/syncMerge.ts","../engine/webImport":"src/engine/webImport.ts"};
  defs["src/webcloud/toWeb.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAPPED_WEB_FIELDS = exports.WEB_MAX_STUDY_DAYS = exports.WEB_MAX_MOCKS = void 0;
exports.fromWeb = fromWeb;
exports.mockToWeb = mockToWeb;
exports.toWeb = toWeb;
exports.rebuildDerived = rebuildDerived;
exports.webChanges = webChanges;
exports.noChanges = noChanges;
const syncMerge_1 = require("../engine/syncMerge");
const webImport_1 = require("../engine/webImport");
exports.WEB_MAX_MOCKS = 50;
exports.WEB_MAX_STUDY_DAYS = 730;
exports.MAPPED_WEB_FIELDS = ['answerLog', 'review', 'bookmarks', 'mistakeLog', 'mockHistory', 'topicReviewed', 'topicViewed', 'qNotes', 'studyDays'];
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const objOf = (x) => (isObj(x) ? x : {});
const listOf = (x) => (Array.isArray(x) ? x : []);
const copyOf = (x) => JSON.parse(JSON.stringify(x));
function fromWeb(web, known, now, appMockIds) {
    const read = (0, webImport_1.readWebState)(web, known, now, { appMockIds });
    return { cert: read.cert, studyDays: read.studyDays };
}
function mockToWeb(m, before) {
    const fromWebsite = m.id.startsWith(webImport_1.WEB_MOCK_PREFIX);
    const out = {
        id: fromWebsite ? m.id.slice(webImport_1.WEB_MOCK_PREFIX.length) : m.id,
        finishedAt: m.finishedAt,
        total: m.total,
        correct: m.correct,
        minutesUsed: m.minutesUsed,
        byDomain: copyOf(m.byDomain),
    };
    if (m.timing !== undefined)
        out.timing = m.timing;
    if (m.minutesAllowed !== undefined)
        out.minutesAllowed = m.minutesAllowed;
    if (m.medianSec !== undefined)
        out.medianSec = m.medianSec;
    if (m.unanswered !== undefined)
        out.unanswered = m.unanswered;
    if (before && (before.type === 'full' || before.type === 'mini'))
        out.type = before.type;
    if (!fromWebsite)
        out.origin = webImport_1.APP_MOCK_ORIGIN;
    return out;
}
function ticks(ids, before, known) {
    const out = {};
    for (const id of ids !== null && ids !== void 0 ? ids : []) {
        if (!known(id))
            continue;
        const v = before[id];
        out[id] = v === true || (typeof v === 'number' && Number.isFinite(v) && v > 0) ? v : true;
    }
    return out;
}
function toWeb(acct, web, bank) {
    var _a, _b, _c;
    const cert = acct.cert;
    const q = (id) => bank.question(id);
    const keep = (m, ok = (id) => q(id)) => {
        const out = {};
        for (const [id, v] of Object.entries(m !== null && m !== void 0 ? m : {}))
            if (ok(id, v))
                out[id] = copyOf(v);
        return out;
    };
    const oldMarks = listOf(web.bookmarks).filter(isObj);
    const tagOf = new Map(oldMarks.filter((b) => typeof b.id === 'string').map((b) => [b.id, b.tag]));
    const wanted = new Set(((_a = cert.bookmarks) !== null && _a !== void 0 ? _a : []).filter(q));
    const order = [...oldMarks.map((b) => b.id).filter((id) => typeof id === 'string' && wanted.has(id)), ...[...wanted].filter((id) => !tagOf.has(id))];
    const bookmarks = [];
    for (const id of [...new Set(order)]) {
        const c = bank.copy(id);
        if (!c)
            continue;
        const tag = tagOf.get(id);
        bookmarks.push(tag === 'need-review' || tag === 'tricky-wording' || tag === 'standard-ref' ? { ...c, tag } : c);
    }
    const mistakeLog = {};
    for (const [id, m] of Object.entries((_b = cert.mistakes) !== null && _b !== void 0 ? _b : {})) {
        if (!q(id))
            continue;
        mistakeLog[id] = { ...copyOf(m), resolved: m.resolved === true };
    }
    const oldMocks = new Map(listOf(web.mockHistory).filter(isObj).filter((m) => typeof m.id === 'string').map((m) => [m.id, m]));
    const mockHistory = ((_c = cert.mocks) !== null && _c !== void 0 ? _c : [])
        .map((m) => mockToWeb(m, oldMocks.get(m.id.startsWith(webImport_1.WEB_MOCK_PREFIX) ? m.id.slice(webImport_1.WEB_MOCK_PREFIX.length) : m.id)))
        .sort((a, b) => b.finishedAt - a.finishedAt || String(a.id).localeCompare(String(b.id)))
        .slice(0, exports.WEB_MAX_MOCKS);
    const qNotes = keep(cert.qNotes, (id, n) => Boolean(q(id) && n.text.trim()));
    const studyDays = [...new Set([...listOf(web.studyDays).filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)), ...acct.studyDays])]
        .sort()
        .slice(-exports.WEB_MAX_STUDY_DAYS);
    const next = {
        ...web,
        answerLog: keep(cert.answers),
        review: keep(cert.review),
        bookmarks,
        mistakeLog,
        mockHistory,
        topicReviewed: ticks(cert.notesRead, objOf(web.topicReviewed), bank.note),
        topicViewed: ticks(cert.notesViewed, objOf(web.topicViewed), bank.note),
        topicTicksSchema: 2,
        qNotes,
        studyDays,
    };
    return rebuildDerived(web, next, bank);
}
const count = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
function tallyOf(log, bank) {
    var _a;
    const all = { t: 0, c: 0 };
    const byDomain = {};
    for (const [id, e] of Object.entries(log)) {
        if (!isObj(e))
            continue;
        const t = count(e.attempts);
        const c = Math.min(t, count(e.correctCount));
        all.t += t;
        all.c += c;
        const d = bank.domainOf(id);
        if (!d)
            continue;
        const x = (_a = byDomain[d]) !== null && _a !== void 0 ? _a : (byDomain[d] = { t: 0, c: 0 });
        x.t += t;
        x.c += c;
    }
    return { all, byDomain };
}
function rebuildDerived(before, after, bank) {
    var _a, _b, _c, _d;
    const oldTally = tallyOf(objOf(before.answerLog), bank);
    const newTally = tallyOf(objOf(after.answerLog), bank);
    const extra = (have, counted) => {
        const h = objOf(have);
        const t = Math.max(0, count(h.t) - counted.t);
        return { t, c: Math.min(t, Math.max(0, count(h.c) - counted.c)) };
    };
    const plus = (a, b) => ({ t: a.t + b.t, c: Math.min(a.t + b.t, a.c + b.c) });
    const score = plus(extra(before.score, oldTally.all), newTally.all);
    const oldDs = objOf(before.ds);
    const ds = {};
    for (const d of bank.domains)
        ds[d] = plus(extra(oldDs[d], (_a = oldTally.byDomain[d]) !== null && _a !== void 0 ? _a : { t: 0, c: 0 }), (_b = newTally.byDomain[d]) !== null && _b !== void 0 ? _b : { t: 0, c: 0 });
    const oldIds = objOf(before.answeredIds);
    const answeredIds = {};
    for (const k of Object.keys(oldIds)) {
        const m = {};
        for (const [id, v] of Object.entries(objOf(oldIds[k])))
            if (v === true)
                m[id] = true;
        answeredIds[k] = m;
    }
    for (const d of bank.domains)
        answeredIds[d] = (_c = answeredIds[d]) !== null && _c !== void 0 ? _c : {};
    for (const id of Object.keys(objOf(after.answerLog))) {
        const d = bank.domainOf(id);
        if (d)
            ((_d = answeredIds[d]) !== null && _d !== void 0 ? _d : (answeredIds[d] = {}))[id] = true;
    }
    const mistakes = objOf(after.mistakeLog);
    const legacy = listOf(before.missedQuestions).filter((m) => isObj(m) && typeof m.id === 'string' && !(m.id in mistakes) && bank.question(m.id));
    const open = Object.entries(mistakes)
        .filter(([, m]) => isObj(m) && m.resolved !== true)
        .sort(([a, x], [b, y]) => count(objOf(x).at) - count(objOf(y).at) || a.localeCompare(b))
        .map(([id]) => id);
    const missedQuestions = [];
    const seen = new Set();
    for (const id of [...legacy.map((m) => m.id), ...open]) {
        if (seen.has(id))
            continue;
        const c = bank.copy(id);
        if (!c)
            continue;
        seen.add(id);
        missedQuestions.push(c);
    }
    return { ...after, score, ds, answeredIds, missedQuestions };
}
const mockKey = (m) => (0, syncMerge_1.stableStringify)({ ...m, origin: undefined, type: undefined });
function webChanges(web, projected) {
    const diffMap = (k) => {
        const a = objOf(web[k]);
        const b = objOf(projected[k]);
        const out = {};
        for (const [id, v] of Object.entries(a))
            if (!(id in b) || (0, syncMerge_1.stableStringify)(v) !== (0, syncMerge_1.stableStringify)(b[id]))
                out[id] = v;
        return out;
    };
    const tickDiff = (k) => {
        const a = objOf(web[k]);
        const b = objOf(projected[k]);
        const out = {};
        for (const [id, v] of Object.entries(a))
            if (!(id in b))
                out[id] = v;
        return out;
    };
    const projMarks = new Set(listOf(projected.bookmarks).filter(isObj).map((b) => b.id));
    const projMocks = new Map(listOf(projected.mockHistory).filter(isObj).map((m) => [m.id, mockKey(m)]));
    const projDays = new Set(listOf(projected.studyDays));
    return {
        answerLog: diffMap('answerLog'),
        review: diffMap('review'),
        mistakeLog: diffMap('mistakeLog'),
        qNotes: diffMap('qNotes'),
        topicReviewed: tickDiff('topicReviewed'),
        topicViewed: tickDiff('topicViewed'),
        topicTicksSchema: web.topicTicksSchema,
        bookmarks: listOf(web.bookmarks).filter((b) => isObj(b) && !projMarks.has(b.id)),
        mockHistory: listOf(web.mockHistory).filter((m) => isObj(m) && projMocks.get(m.id) !== mockKey(m)),
        studyDays: listOf(web.studyDays).filter((d) => !projDays.has(d)),
    };
}
function noChanges(c) {
    return (['answerLog', 'review', 'mistakeLog', 'qNotes', 'topicReviewed', 'topicViewed'].every((k) => Object.keys(objOf(c[k])).length === 0) &&
        ['bookmarks', 'mockHistory', 'studyDays'].every((k) => listOf(c[k]).length === 0));
}
  };
  links["src/webcloud/utf8.ts"] = {};
  defs["src/webcloud/utf8.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeUtf8 = decodeUtf8;
function decodeUtf8(bytes) {
    const parts = [];
    let chunk = [];
    const flush = () => {
        parts.push(String.fromCharCode(...chunk));
        chunk = [];
    };
    for (let i = 0; i < bytes.length;) {
        const b = bytes[i];
        let cp;
        let need;
        let min;
        if (b < 0x80) {
            cp = b;
            need = 0;
            min = 0;
        }
        else if (b >= 0xc2 && b <= 0xdf) {
            cp = b & 0x1f;
            need = 1;
            min = 0x80;
        }
        else if (b >= 0xe0 && b <= 0xef) {
            cp = b & 0x0f;
            need = 2;
            min = 0x800;
        }
        else if (b >= 0xf0 && b <= 0xf4) {
            cp = b & 0x07;
            need = 3;
            min = 0x10000;
        }
        else
            return null;
        for (let k = 1; k <= need; k++) {
            const c = bytes[i + k];
            if (c === undefined || (c & 0xc0) !== 0x80)
                return null;
            cp = (cp << 6) | (c & 0x3f);
        }
        if (cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff))
            return null;
        if (cp >= 0x10000) {
            const v = cp - 0x10000;
            chunk.push(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
        }
        else
            chunk.push(cp);
        if (chunk.length >= 8192)
            flush();
        i += need + 1;
    }
    flush();
    return parts.join('');
}
  };
  var cache = {};
  function load(id) {
    if (cache[id]) return cache[id].exports;
    var module = { exports: {} };
    cache[id] = module;
    defs[id].call(module.exports, module, module.exports, function (spec) {
      var to = links[id][spec];
      if (!to) throw new Error("kaisip-cloud: " + id + " cannot load " + spec);
      return load(to);
    });
    return module.exports;
  }
  var api = {};
  api["browser"] = load("src/webcloud/browser.ts");
  api["config"] = load("src/webcloud/config.ts");
  api.sourceHash = "3cc6037a74d14be4";
  var cloud = load("src/webcloud/index.ts");
  var liveVersion = "1.48.0";
  var liveStoreVersions = {"progress":2,"settings":1};
  api.liveVersion = liveVersion;
  api.liveStoreVersions = Object.freeze({ progress: liveStoreVersions.progress, settings: liveStoreVersions.settings });
  api.accountsAllowed = cloud.accountsAllowed;
  // KaiSipCloud.create({ ... }): the client, with the Play versions and this page's address filled in
  // (the caller can't change them). It refuses any address but https://kaisip.com; `devOrigin: true`
  // adds only localhost and "no address" (Node tests), never another site.
  api.create = function (o) {
    var opts = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) opts[k] = o[k];
    opts.appVersion = liveVersion;
    opts.storeVersions = { progress: liveStoreVersions.progress, settings: liveStoreVersions.settings };
    opts.origin = root.location && typeof root.location.origin === 'string' ? root.location.origin : '';
    return cloud.createWebCloud(opts);
  };
  root.KaiSipCloud = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
