/*
 * GENERATED FILE: do not edit. Built by mobile/scripts/build-web-plant.mjs
 * from the mobile app's own plant sources (growth engine, looks, SVG art),
 * so the website and the app grow the same plant. Rebuild after changing
 * any of them: cd mobile && npm run web-plant
 * TypeScript 6.0.3. Modules: 28.
 */
(function (root) {
  "use strict";
  var defs = {};
  var links = {};
  links["scripts/notes-pack.cjs"] = {};
  defs["scripts/notes-pack.cjs"] = function (module, exports, require) {
/**
 * notes-pack.cjs — turns ../data/cisa_notes.json (topic notes, schema v2)
 * into the mobile app's "notes pack".
 *
 * WHY A SEPARATE .cjs FILE (plain English):
 *   build-content.mjs is an ES module, and Jest cannot load ES modules
 *   without extra setup. Keeping the pure "reshape the notes" logic in this
 *   CommonJS file lets BOTH the build script and the Jest tests use it.
 *   No third-party packages, no file access: data in, data out.
 *
 * WHAT IT DOES:
 *   1. Only accepts `schema_version: 2`. Anything else (today's v1 file)
 *      gives an EMPTY pack, so the app keeps working and the Study notes
 *      entry hides itself until the writers finish v2.
 *   2. Renames fields to the app's camelCase shape (src/content/notes/types.ts).
 *   3. Drops what the app never shows: exam_weight (the weights live only in
 *      src/content/certifications.ts), legacy_ids (web-only tick carry-over).
 *   4. Checks every illustration. An SVG that is not simple, well-formed
 *      and safe is DROPPED with a warning (the screen just skips it).
 *   5. Carries `practice_ids` (the bank questions that test a subtopic) as
 *      `practiceIds`. When the build passes the question ids it just wrote,
 *      every practice id must exist and belong to the subtopic's domain;
 *      a bad id is a PROBLEM (the build fails), because a "Practice this
 *      concept" button that opens the wrong questions would mislead.
 *   6. Mobile 1.29: carries `audit_focus` ("Auditing it": what to review,
 *      evidence to ask for, the typical recommendation, and optionally who
 *      decides) as `auditFocus`.
 *      A malformed one is dropped with a warning, like a bad compare table.
 */

// Elements our diagrams may use. Anything else (script, image, foreignObject,
// use, filter…) means the SVG is dropped: react-native-svg can't draw some of
// them, and an <image href> could make the app fetch from the network.
const ALLOWED_TAGS = new Set([
  'svg', 'g', 'line', 'path', 'rect', 'circle', 'ellipse', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'marker', 'title', 'desc',
]);

/**
 * Validate one v1/v2 illustration ({ svg, caption }) and prepare it for the app.
 * Returns { ok: true, value } or { ok: false, reason }.
 */
function prepareIllustration(ill) {
  if (!ill || typeof ill !== 'object' || typeof ill.svg !== 'string') {
    return { ok: false, reason: 'no svg string' };
  }
  let svg = ill.svg.trim();
  if (!/^<svg[\s>]/.test(svg) || !/<\/svg>$/.test(svg)) {
    return { ok: false, reason: 'does not start with <svg and end with </svg>' };
  }
  // Dangerous or network-reaching content: event handlers, scripts, links.
  if (/\son[a-z]+\s*=/i.test(svg) || /javascript:/i.test(svg) || /\b(?:xlink:)?href\s*=/i.test(svg)) {
    return { ok: false, reason: 'contains an event handler or link' };
  }

  // The viewBox gives the drawing's shape, so the app can scale it to the
  // screen width and keep the height in proportion.
  const rootTag = svg.slice(0, svg.indexOf('>') + 1);
  const vb = /viewBox\s*=\s*['"]([^'"]+)['"]/.exec(rootTag);
  const nums = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : [];
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n)) || nums[2] <= 0 || nums[3] <= 0) {
    return { ok: false, reason: 'missing or invalid viewBox' };
  }

  // Walk every tag: only allowed elements, and every open tag is closed.
  const stack = [];
  const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g;
  const withoutComments = svg.replace(/<!--[\s\S]*?-->/g, '');
  // Text outside tags must not contain a stray "<" (a broken tag).
  if (/<(?![a-zA-Z/])/.test(withoutComments)) return { ok: false, reason: 'stray "<"' };
  let m;
  while ((m = TAG_RE.exec(withoutComments))) {
    const [, closing, name, selfClosing] = m;
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return { ok: false, reason: `unsupported element <${name}>` };
    if (closing) {
      if (stack.pop() !== tag) return { ok: false, reason: `mismatched </${name}>` };
    } else if (!selfClosing) {
      stack.push(tag);
    }
  }
  if (stack.length) return { ok: false, reason: `unclosed <${stack[stack.length - 1]}>` };

  // The spoken description comes from aria-label; the wrapper View speaks it,
  // so it is removed from the SVG itself (no double announcement).
  const label = (/aria-label\s*=\s*(['"])([\s\S]*?)\1/.exec(rootTag) || [])[2] || '';
  const cleanRoot = rootTag
    .replace(/\s+aria-label\s*=\s*(['"])[\s\S]*?\1/, '')
    .replace(/\s+role\s*=\s*(['"])[^'"]*\1/, '');
  svg = cleanRoot + svg.slice(rootTag.length);

  const caption = typeof ill.caption === 'string' && ill.caption.trim() ? ill.caption.trim() : undefined;
  return {
    ok: true,
    value: { svg, label: label || caption || 'Diagram', caption, width: nums[2], height: nums[3] },
  };
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/** The exact keys of `audit_focus` (docs/content/NOTES_SCHEMA_V2.md "audit_focus"). */
const AUDIT_FOCUS_KEYS = ['review', 'evidence', 'recommend', 'decides'];

/**
 * Mobile 1.29: check a subtopic's optional `audit_focus` ("Auditing it") and
 * prepare it for the app. Returns { ok: true, value } or { ok: false, reason }.
 *
 * Plain English: the note's "how would an IS auditor audit this?" box. It has
 * three parts: `review` (2–3 audit steps), `evidence` (2–3 records that
 * prove the control works) and `recommend` (one sentence that starts with the
 * action: the label already says "the IS auditor recommends"), plus an
 * optional `decides` (who decides or accepts the risk: the exam lesson). Like the
 * compare table, a malformed one is DROPPED with a warning and the rest of
 * the note stays; the page then simply has no "Auditing it" section.
 * Word limits are the notes linter's job (scripts/lint_notes.py), not ours.
 */
function prepareAuditFocus(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'not an object' };
  const extra = Object.keys(raw).filter((k) => !AUDIT_FOCUS_KEYS.includes(k));
  if (extra.length) return { ok: false, reason: `unknown key ${extra.join(', ')}` };
  // Each list: 2 or 3 entries, every one a non-empty string (a blank is not skipped quietly).
  for (const key of ['review', 'evidence']) {
    const list = raw[key];
    if (!Array.isArray(list) || list.length < 2 || list.length > 3) {
      return { ok: false, reason: `${key} needs 2 or 3 items` };
    }
    if (!list.every((item) => str(item))) return { ok: false, reason: `${key} has an empty or non-text item` };
  }
  const recommend = str(raw.recommend);
  if (!recommend) return { ok: false, reason: 'recommend must be one sentence of text' };
  // Optional: absent is fine; present means a non-empty sentence.
  const decides = str(raw.decides);
  if (raw.decides != null && !decides) return { ok: false, reason: 'decides must be text when present' };
  const value = { review: raw.review.map(str), evidence: raw.evidence.map(str), recommend };
  if (decides) value.decides = decides;
  return { ok: true, value };
}

/**
 * Check a subtopic's `practice_ids` and return the clean list (may be empty).
 * `questionDomains` is a Map of question id → domain id ("d4_012" → "4"),
 * or null when the caller has no question list (then only the shape is checked).
 * Bad ids go to `problems`: the build fails rather than ship a broken link.
 */
function preparePracticeIds(raw, domainId, where, questionDomains, problems) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    problems.push(`${where}: practice_ids must be a list of question ids`);
    return [];
  }
  const out = [];
  for (const item of raw) {
    const id = str(item);
    if (!id) {
      problems.push(`${where}: practice_ids has an empty or non-text entry`);
      continue;
    }
    if (out.includes(id)) continue; // a repeat would ask the same question twice
    if (questionDomains) {
      const qDomain = questionDomains.get(id);
      if (qDomain === undefined) {
        problems.push(`${where}: practice id ${id} is not in the question bank`);
        continue;
      }
      if (qDomain !== domainId) {
        problems.push(`${where}: practice id ${id} is from domain ${qDomain}, not domain ${domainId}`);
        continue;
      }
    }
    out.push(id);
  }
  return out;
}

/** One subtopic → app shape. `problems` = fatal (subtopic skipped); `warnings` = a part dropped. */
function toSubtopic(s, domainId, topicId, problems, warnings, questionDomains) {
  const id = str(s && s.id);
  const where = id || `${topicId}.?`;
  const sub = {
    id,
    domainId,
    topicId,
    name: str(s.name),
    definition: str(s.definition),
    whyItMatters: str(s.why_it_matters),
    howItWorks: strList(s.how_it_works),
    example: str(s.example),
    isacaRule: str(s.isaca_rule),
    examTraps: (Array.isArray(s.exam_traps) ? s.exam_traps : [])
      .map((t) => ({ trap: str(t && t.trap), why: str(t && t.why) }))
      .filter((t) => t.trap && t.why),
    keyTerms: (Array.isArray(s.key_terms) ? s.key_terms : [])
      .map((t) => ({ term: str(t && t.term), definition: str(t && t.definition) }))
      .filter((t) => t.term && t.definition),
  };
  // Required fields: without these the subtopic would render half-empty.
  const missing = ['id', 'name', 'definition', 'whyItMatters', 'example', 'isacaRule'].filter((k) => !sub[k]);
  if (!sub.howItWorks.length) missing.push('howItWorks');
  if (missing.length) {
    problems.push(`${where}: missing ${missing.join(', ')}`);
    return null;
  }

  // Optional parts: a malformed one is dropped, the rest of the subtopic stays.
  if (s.compare) {
    const columns = strList(s.compare.columns);
    const rows = (Array.isArray(s.compare.rows) ? s.compare.rows : []).map((r) => ({
      label: str(r && r.label),
      cells: strList(r && r.cells),
    }));
    const ok = columns.length >= 2 && rows.length > 0 && rows.every((r) => r.label && r.cells.length === columns.length);
    if (ok) sub.compare = { columns, rows };
    else warnings.push(`${where}: compare table dropped (every row needs a label and one cell per column)`);
  }
  if (Array.isArray(s.types)) {
    const types = s.types
      .map((t) => ({ term: str(t && t.term), meaning: str(t && t.meaning) }))
      .filter((t) => t.term && t.meaning);
    if (types.length) sub.types = types;
  }
  // `illustration` is one { svg, caption } or a list of them (v1 allowed both).
  // The app always gets a list; each bad drawing is dropped on its own.
  if (s.illustration) {
    const list = Array.isArray(s.illustration) ? s.illustration : [s.illustration];
    const good = [];
    list.forEach((item, i) => {
      const ill = prepareIllustration(item);
      if (ill.ok) good.push(ill.value);
      else warnings.push(`${where}: illustration${list.length > 1 ? ` ${i + 1}` : ''} dropped (${ill.reason})`);
    });
    if (good.length) sub.illustrations = good;
  }
  // Mobile 1.29: "Auditing it" (optional). Renamed to camelCase; a bad one is dropped, not fatal.
  if (s.audit_focus != null) {
    const focus = prepareAuditFocus(s.audit_focus);
    if (focus.ok) sub.auditFocus = focus.value;
    else warnings.push(`${where}: audit_focus dropped (${focus.reason})`);
  }
  if (str(s.analogy)) sub.analogy = str(s.analogy);
  if (str(s.memory_aid)) sub.memoryAid = str(s.memory_aid);
  // Optional: omitted when empty, so the screen simply hides the button.
  const practiceIds = preparePracticeIds(s.practice_ids, domainId, where, questionDomains, problems);
  if (practiceIds.length) sub.practiceIds = practiceIds;
  sub.minutes = readingMinutes(sub);
  return sub;
}

/**
 * Mobile 1.20: about how long the page takes to read ("about 3 min"), from
 * every text field the page renders, at 200 words a minute, never under 1.
 */
function readingMinutes(sub) {
  const texts = [
    sub.definition,
    sub.whyItMatters,
    ...sub.howItWorks,
    ...(sub.compare ? [...sub.compare.columns, ...sub.compare.rows.flatMap((r) => [r.label, ...r.cells])] : []),
    ...(sub.types ?? []).flatMap((t) => [t.term, t.meaning]),
    ...(sub.illustrations ?? []).map((i) => i.caption ?? ''),
    // Mobile 1.29: "Auditing it" is rendered, so it counts toward the reading time.
    sub.example,
    ...(sub.auditFocus
      ? [...sub.auditFocus.review, ...sub.auditFocus.evidence, sub.auditFocus.recommend, sub.auditFocus.decides ?? '']
      : []),
    sub.isacaRule,
    ...sub.examTraps.flatMap((t) => [t.trap, t.why]),
    ...sub.keyTerms.flatMap((t) => [t.term, t.definition]),
    sub.analogy ?? '',
    sub.memoryAid ?? '',
  ];
  const words = texts.reduce((n, t) => n + String(t).split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / 200));
}

/**
 * Writers may deliver a domain in two halves ({ domain_number: 4, partial: "A" }
 * and "B"). If both halves reach the file, merge them into one domain, so a
 * domain id is never listed twice: domain-level fields from whichever half
 * has them (Part A by convention), topics in Part order. Sorted by number.
 */
function mergeSplitDomains(list) {
  const byNumber = new Map();
  const halves = list
    .filter((d) => d && Number.isInteger(d.domain_number))
    .sort((a, b) => a.domain_number - b.domain_number || String(a.partial || '').localeCompare(String(b.partial || '')));
  for (const d of halves) {
    const cur = byNumber.get(d.domain_number);
    if (!cur) {
      byNumber.set(d.domain_number, { ...d, topics: [...(Array.isArray(d.topics) ? d.topics : [])] });
      continue;
    }
    for (const k of ['overview', 'analogy']) if (!str(cur[k]) && str(d[k])) cur[k] = d[k];
    if (!(Array.isArray(cur.parts) && cur.parts.length) && Array.isArray(d.parts)) cur.parts = d.parts;
    if (!cur.key_terminologies && d.key_terminologies) cur.key_terminologies = d.key_terminologies;
    cur.topics.push(...(Array.isArray(d.topics) ? d.topics : []));
  }
  return [...byNumber.values()];
}

/** An empty pack: the app treats it as "no study notes yet". */
function emptyPack(certId) {
  return { certId, schemaVersion: 2, domains: [], strategyTips: [], connections: [] };
}

/**
 * Build the notes pack from the raw notes file.
 * Returns { pack, problems, warnings, skipped } where `skipped` names why
 * the pack is empty (e.g. "schema v1"), or null.
 *
 * `opts.questions` (optional): the cert's questions as [{ id, domainId }]
 * (the content pack). When given, every `practice_ids` entry is checked
 * against it. build-content.mjs always passes it; tests may leave it out.
 */
function buildNotesPack(raw, certId = 'cisa', opts = {}) {
  const problems = [];
  const warnings = [];
  const questionDomains = Array.isArray(opts.questions)
    ? new Map(opts.questions.map((q) => [String(q.id), String(q.domainId)]))
    : null;
  if (!raw || typeof raw !== 'object' || raw.schema_version !== 2) {
    const v = raw && typeof raw === 'object' && raw.schema_version != null ? raw.schema_version : 1;
    return { pack: emptyPack(certId), problems, warnings, skipped: `schema v${v}` };
  }

  const domains = mergeSplitDomains(Array.isArray(raw.domains) ? raw.domains : [])
    .map((d) => {
      const domainId = String(d.domain_number);
      const topics = (Array.isArray(d.topics) ? d.topics : []).map((t) => {
        const topicId = str(t && t.topic_id);
        const subtopics = (Array.isArray(t.subtopics) ? t.subtopics : [])
          .map((s) => toSubtopic(s || {}, domainId, topicId, problems, warnings, questionDomains))
          .filter(Boolean);
        return {
          id: topicId,
          name: str(t.topic_name),
          overview: str(t.overview),
          canDo: strList(t.can_do),
          subtopics,
        };
      }).filter((t) => t.id && t.subtopics.length);
      const terms = d.key_terminologies && typeof d.key_terminologies === 'object' ? d.key_terminologies : {};
      return {
        id: domainId,
        overview: str(d.overview),
        analogy: str(d.analogy),
        parts: (Array.isArray(d.parts) ? d.parts : [])
          .map((p) => ({ part: str(p && p.part), name: str(p && p.name), topicIds: strList(p && p.topic_ids) }))
          .filter((p) => p.part),
        topics,
        keyTerms: Object.entries(terms)
          .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')
          .map(([term, definition]) => ({ term: term.trim(), definition: definition.trim() })),
      };
    })
    .filter((d) => d.topics.length);

  // Subtopic ids key the learner's "read" ticks, so they must be unique.
  const seen = new Set();
  for (const d of domains) {
    for (const t of d.topics) {
      for (const s of t.subtopics) {
        if (seen.has(s.id)) problems.push(`${s.id}: duplicate subtopic id`);
        seen.add(s.id);
      }
    }
  }

  return {
    pack: {
      certId,
      schemaVersion: 2,
      domains,
      strategyTips: strList(raw.exam_strategy_tips),
      connections: (Array.isArray(raw.cross_domain_connections) ? raw.cross_domain_connections : [])
        .map((c) => ({ connection: str(c && c.connection), note: str(c && c.note) }))
        .filter((c) => c.connection),
    },
    problems,
    warnings,
    skipped: null,
  };
}

module.exports = { buildNotesPack, prepareIllustration, prepareAuditFocus, emptyPack };
  };
  links["src/components/plant/art.ts"] = {"../../engine/plantLooks":"src/engine/plantLooks.ts","../../theme/tokens":"src/theme/tokens.ts","./botanical":"src/components/plant/botanical.ts"};
  defs["src/components/plant/art.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtCacheSize = exports.isBotanical = exports.ORGAN_DEFAULT = exports.ORGAN_DRAW_MAX = exports.ORGAN_DRAW_MIN = exports.MOODS = exports.lodFor = exports.SPECIES_ART = exports.f = void 0;
exports.rng = rng;
exports.hash = hash;
exports.mix = mix;
exports.scallop = scallop;
exports.trunkPath = trunkPath;
exports.limb = limb;
exports.keepsakeShape = keepsakeShape;
exports.keepsakeIcon = keepsakeIcon;
exports.planterIcon = planterIcon;
exports.buildPlant = buildPlant;
exports.plantLayers = plantLayers;
exports.liftGroup = liftGroup;
exports.frameFor = frameFor;
exports.pathTokens = pathTokens;
exports.bounds = bounds;
exports.bandHalfWidth = bandHalfWidth;
exports.groupNames = groupNames;
exports.countShapes = countShapes;
const plantLooks_1 = require("../../engine/plantLooks");
const tokens_1 = require("../../theme/tokens");
const botanical_1 = require("./botanical");
const f = (n) => +n.toFixed(1);
exports.f = f;
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hash(str) {
    let h = 2166136261;
    for (const c of str) {
        h ^= c.charCodeAt(0);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
const lerp = (a, b, t) => a + (b - a) * t;
function mix(hexA, hexB, t) {
    const pa = [1, 3, 5].map((i) => parseInt(hexA.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(hexB.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const P = (d, fill, extra = {}) => ({ t: 'path', d, fill, ...extra });
const C = (cx, cy, r, fill, extra = {}) => ({ t: 'circle', cx: (0, exports.f)(cx), cy: (0, exports.f)(cy), r: (0, exports.f)(r), fill, ...extra });
const E = (cx, cy, rx, ry, fill, extra = {}) => ({ t: 'ellipse', cx: (0, exports.f)(cx), cy: (0, exports.f)(cy), rx: (0, exports.f)(rx), ry: (0, exports.f)(ry), fill, ...extra });
const G = (id, children, extra = {}) => ({ t: 'g', id, children: children.filter(Boolean), ...extra });
const S = (d, stroke, w, extra = {}) => ({ t: 'path', d, fill: 'none', stroke, sw: w, ...extra });
const L = tokens_1.plantLeaf;
const B = tokens_1.plantArt.bark;
exports.SPECIES_ART = {
    oak: { kind: 'tree', palette: L.grove, bark: B.oak, leaf: 'oak', canopy: { sx: 1.08, sy: 0.98, n: 9, jit: 0.55, bulge: 0.66, dy: 0, icon: 'round' }, flourish: 'acorn' },
    maple: { kind: 'tree', palette: L.ember, bark: B.maple, leaf: 'maple', canopy: { sx: 0.98, sy: 1.1, n: 11, jit: 0.25, bulge: 0.6, dy: -4, icon: 'flame' }, flourish: 'samara' },
    narra: { kind: 'tree', palette: L.spring, bark: B.narra, leaf: 'banyan', flare: 0.6, trunkW: 1.08, canopy: { sx: 1.3, sy: 0.72, n: 12, jit: 0.3, bulge: 0.56, dy: 2, flat: 0.25, icon: 'umbrella' }, flourish: 'narra' },
    'cherry-blossom': {
        kind: 'tree',
        palette: L.blossom,
        bark: B.cherry,
        leaf: 'blossom',
        canopy: { sx: 1.18, sy: 0.84, n: 13, jit: 0.3, bulge: 0.58, dy: 4, icon: 'puffs' },
        flourish: 'blossom',
        driftGlyph: 'blossom',
        driftFill: tokens_1.plantArt.gift.cherryDrift,
    },
    pine: { kind: 'tree', palette: L.evergreen, bark: B.pine, leaf: 'pine', canopy: { custom: 'tiers' }, flourish: 'cone' },
    'coconut-palm': { kind: 'tree', palette: L.spring, bark: B.coconut, leaf: 'olive', canopy: { custom: 'palm' }, flourish: 'coconut', fruitFrom: 5, seedColor: tokens_1.plantArt.gift.coconutRipe },
    mango: { kind: 'tree', palette: L.evergreen, bark: B.mango, leaf: 'olive', canopy: { sx: 1.22, sy: 0.84, n: 11, jit: 0.3, bulge: 0.6, dy: 6, flat: 0.35, dome: 1, icon: 'dome' }, flourish: 'mango', fruitFrom: 5 },
    bonsai: { kind: 'tree', palette: L.grove, bark: B.bonsai, leaf: 'pine', pot: 'bonsai', canopy: { custom: 'bonsai' }, flourish: 'moss', driftGlyph: 'blossom', driftFill: tokens_1.plantArt.white },
    sunflower: { kind: 'plant', build: 'sunflower', palette: L.gold, foliage: L.spring, seedColor: tokens_1.plantArt.seed.sunflower, seedStripe: tokens_1.plantArt.seed.sunflowerStripe, seedPatch: true, leaf: 'banyan', driftGlyph: 'lens', driftFill: tokens_1.plantArt.sunflower.drift },
    lotus: { kind: 'plant', build: 'lotus', palette: L.blossom, foliage: L.grove, pot: 'pond', seedColor: tokens_1.plantArt.seed.lotus, leaf: 'banyan', driftGlyph: 'lens', driftFill: tokens_1.plantArt.lotus.drift },
    sampaguita: { kind: 'plant', build: 'sampaguita', palette: L.pearl, foliage: L.grove, seedColor: tokens_1.plantArt.seed.sampaguita, leaf: 'banyan', driftGlyph: 'star', driftFill: L.pearl.light },
    cactus: { kind: 'plant', build: 'cactus', palette: L.blossom, foliage: L.cactus, pot: 'terracotta', seedColor: tokens_1.plantArt.seed.cactus, seedPatch: true, leaf: 'lens', driftGlyph: 'blossom', driftFill: L.blossom.light },
    bamboo: { kind: 'plant', build: 'bamboo', palette: L.grove, foliage: L.grove, leaf: 'olive', driftGlyph: 'olive', driftFill: L.grove.light },
};
const GEO = {
    1: { body: { cx: 100, cy: 157, w: 30, h: 32 }, ground: 1 },
    2: { body: { cx: 100, cy: 156, w: 32, h: 30 }, ground: 1, stemTop: 118 },
    3: { trunk: { wb: 30, wt: 18, top: 116 }, canopy: { cx: 100, cy: 94, rx: 38, ry: 33 }, faceY: 151, ground: 2 },
    4: { trunk: { wb: 36, wt: 20, top: 104 }, canopy: { cx: 100, cy: 79, rx: 54, ry: 42 }, faceY: 146, ground: 2, branches: 2 },
    5: { trunk: { wb: 42, wt: 22, top: 96 }, canopy: { cx: 100, cy: 70, rx: 68, ry: 49 }, faceY: 143, ground: 3, branches: 2, roots: 2 },
    6: { trunk: { wb: 48, wt: 25, top: 92 }, canopy: { cx: 100, cy: 64, rx: 78, ry: 52 }, faceY: 142, ground: 3, branches: 3, roots: 4 },
};
const lodFor = (size) => (size <= 32 ? 'icon' : size <= 96 ? 'small' : 'full');
exports.lodFor = lodFor;
function scallop({ cx, cy, rx, ry, n, seed, jit = 0.3, bulge = 0.6, flat = 0 }) {
    const r = rng(seed);
    const pts = [];
    for (let i = 0; i < n; i++) {
        const t = -Math.PI / 2 + ((i + (r() - 0.5) * jit) * 2 * Math.PI) / n;
        const s = Math.sin(t);
        pts.push([cx + rx * Math.cos(t), cy + ry * s * (s > 0 ? 1 - flat : 1), s]);
    }
    let d = `M${(0, exports.f)(pts[0][0])} ${(0, exports.f)(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        const Ln = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const bottom = (a[2] + b[2]) / 2 > 0.5;
        const k = bottom ? bulge * 1.7 : bulge * (0.92 + r() * 0.22);
        const rad = Math.max(Ln / 2 + 0.05, Ln * k);
        d += ` A${(0, exports.f)(rad)} ${(0, exports.f)(rad)} 0 0 1 ${(0, exports.f)(b[0])} ${(0, exports.f)(b[1])}`;
    }
    return d + 'Z';
}
function trunkPath({ wb, wt, top, base = 170, lean = 0, twist = 0, flare = 0.35, band = [-1, 1] }) {
    const N = 14;
    const pts = (k) => {
        const out = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const y = lerp(top, base + 1, t);
            const c = 100 + lean * Math.pow(1 - t, 1.15) + twist * Math.sin(Math.PI * t) * 0.8;
            const h = lerp(wt / 2, wb / 2, Math.pow(t, 0.9)) + flare * wb * Math.pow(t, 7);
            out.push([c + k * h, y]);
        }
        return out;
    };
    const Lp = pts(band[0]);
    const R = pts(band[1]).reverse();
    const smooth = (arr) => {
        let d = '';
        for (let i = 1; i < arr.length - 1; i++) {
            const m = [(arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2];
            d += `Q${(0, exports.f)(arr[i][0])} ${(0, exports.f)(arr[i][1])} ${(0, exports.f)(m[0])} ${(0, exports.f)(m[1])}`;
        }
        return d + `L${(0, exports.f)(arr[arr.length - 1][0])} ${(0, exports.f)(arr[arr.length - 1][1])}`;
    };
    const topR = R[R.length - 1];
    return `M${(0, exports.f)(Lp[0][0])} ${(0, exports.f)(Lp[0][1])}${smooth(Lp)}L${(0, exports.f)(R[0][0])} ${(0, exports.f)(R[0][1])}${smooth(R)}Q${(0, exports.f)((Lp[0][0] + topR[0]) / 2)} ${(0, exports.f)(top - 1.5)} ${(0, exports.f)(Lp[0][0])} ${(0, exports.f)(Lp[0][1])}Z`;
}
function limb(x0, y0, x1, y1, w0, w1, bend = 0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const Ln = Math.hypot(dx, dy);
    const nx = -dy / Ln;
    const ny = dx / Ln;
    const mx = (x0 + x1) / 2 + nx * bend;
    const my = (y0 + y1) / 2 + ny * bend;
    return `M${(0, exports.f)(x0 + (nx * w0) / 2)} ${(0, exports.f)(y0 + (ny * w0) / 2)} Q${(0, exports.f)(mx + (nx * (w0 + w1)) / 4)} ${(0, exports.f)(my + (ny * (w0 + w1)) / 4)} ${(0, exports.f)(x1 + (nx * w1) / 2)} ${(0, exports.f)(y1 + (ny * w1) / 2)} L${(0, exports.f)(x1 - (nx * w1) / 2)} ${(0, exports.f)(y1 - (ny * w1) / 2)} Q${(0, exports.f)(mx - (nx * (w0 + w1)) / 4)} ${(0, exports.f)(my - (ny * (w0 + w1)) / 4)} ${(0, exports.f)(x0 - (nx * w0) / 2)} ${(0, exports.f)(y0 - (ny * w0) / 2)}Z`;
}
const MAPLE_LEAF = (() => {
    const tips = [
        [-90, 7.2],
        [-90 - 52, 6.4],
        [-90 + 52, 6.4],
        [-90 - 118, 4.6],
        [-90 + 118, 4.6],
    ];
    const order = [3, 1, 0, 2, 4];
    const pt = (a, r) => [r * Math.cos((a * Math.PI) / 180), -6 + r * Math.sin((a * Math.PI) / 180)];
    let d = 'M0 0L' + pt(-90 - 150, 2).map(exports.f).join(' ');
    order.forEach((ti, i) => {
        const [a, r] = tips[ti];
        d += ' L' + pt(a, r).map(exports.f).join(' ');
        if (i < order.length - 1)
            d += ' L' + pt((a + tips[order[i + 1]][0]) / 2, 2.4).map(exports.f).join(' ');
    });
    return d + ' L' + pt(-90 + 150, 2).map(exports.f).join(' ') + 'Z';
})();
const LEAF_GLYPHS = {
    lens: 'M0 0Q3.2 -6 0 -12Q-3.2 -6 0 0Z',
    olive: 'M0 0Q2.2 -7 0 -14Q-2.2 -7 0 0Z',
    banyan: 'M0 0C4.6 -2 5.6 -8.5 0 -13C-5.6 -8.5 -4.6 -2 0 0Z',
    oak: 'M0 0C-2 -.6 -3.6 -1.6 -2.8 -3.4C-5 -3.4 -5.2 -5.8 -3.2 -6.6C-5.2 -7.6 -4.4 -10.2 -2.2 -10C-2.6 -12.2 -.6 -13 0 -13C.6 -13 2.6 -12.2 2.2 -10C4.4 -10.2 5.2 -7.6 3.2 -6.6C5.2 -5.8 5 -3.4 2.8 -3.4C3.6 -1.6 2 -.6 0 0Z',
    maple: MAPLE_LEAF,
};
function glyph(kind, x, y, s, rot, fill, extra = {}) {
    const transform = `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) rotate(${(0, exports.f)(rot)}) scale(${(0, exports.f)(s)})`;
    if (kind === 'blossom') {
        const kids = [];
        for (let i = 0; i < 5; i++) {
            const a = ((i * 72 - 90) * Math.PI) / 180;
            kids.push(C(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 2.2, fill));
        }
        kids.push(C(0, 0, 1.1, extra.core || tokens_1.plantArt.gift.cherryCore));
        return G(null, kids, { transform });
    }
    if (kind === 'star') {
        const kids = [];
        for (let i = 0; i < 8; i++)
            kids.push(P('M0 0Q1.5 -3 0 -6Q-1.5 -3 0 0Z', fill, { transform: `rotate(${i * 45})`, stroke: extra.edge || L.pearl.deep, sw: 0.5 }));
        kids.push(C(0, 0, 1, extra.core || tokens_1.plantArt.sampaguita.core));
        return G(null, kids, { transform });
    }
    if (kind === 'pine') {
        const kids = [];
        for (let i = -2; i <= 2; i++)
            kids.push(S(`M0 0L${(0, exports.f)(i * 2.2)} -9`, fill, 1.3));
        return G(null, kids, { transform });
    }
    const { core: _c, edge: _e, ...paint } = extra;
    return P(LEAF_GLYPHS[kind] || LEAF_GLYPHS.lens, fill, { transform, ...paint });
}
function cloudCanopy(c, st, pal, seed, lod, sc) {
    var _a;
    const g = GEO[st].canopy;
    const dome = st >= 5 ? ((_a = c.dome) !== null && _a !== void 0 ? _a : 0) : 0;
    const cx = g.cx;
    const cy = g.cy + (c.dy || 0) * (st / 5) + dome * 8;
    const wide = g.rx * c.sx * (1 + 0.08 * dome);
    const rx = Math.min(wide, g.rx < 70 ? wide : 90 + 2 * dome);
    const ry = g.ry * c.sy * (1 - 0.06 * dome);
    const flat = c.flat || 0;
    const layers = [];
    const organs = [];
    if (lod === 'icon' && c.icon)
        return iconCrown(c.icon, cx, cy, rx, ry, pal, seed, st);
    if (st < 4) {
        const base = { n: c.n, jit: c.jit, bulge: c.bulge, flat };
        layers.push(P(scallop({ cx, cy, rx, ry, seed, ...base }), pal.deep));
        layers.push(P(scallop({ cx: cx - rx * 0.05, cy: cy - ry * 0.09, rx: rx * 0.92, ry: ry * 0.88, seed, ...base }), pal.mid));
        if (lod !== 'icon')
            layers.push(P(scallop({ cx: cx - rx * 0.3, cy: cy - ry * 0.4, rx: rx * 0.34, ry: ry * 0.3, n: 6, seed: seed + 11, jit: 0.4, bulge: 0.6 }), pal.light));
    }
    else {
        const core = { cx, cy: cy + ry * 0.14, rx: rx * (0.62 + 0.06 * dome), ry: ry * 0.6 };
        const cf = Math.max(flat, 0.3 + 0.3 * dome);
        layers.push(P(scallop({ ...core, n: 8, seed, jit: 0.3, bulge: 0.6, flat: cf }), pal.deep));
        layers.push(P(scallop({ cx: core.cx - rx * 0.03, cy: core.cy - ry * 0.06, rx: core.rx * 0.9, ry: core.ry * 0.85, n: 8, seed, jit: 0.3, bulge: 0.6, flat: cf }), pal.mid));
        const lobes = [0, 1, 2, 3, 4].map((i) => {
            const th = ((200 - 5 * dome + i * (35 + 2.5 * dome)) * Math.PI) / 180;
            const s = sc[i];
            return {
                cx: cx + rx * (0.5 + 0.06 * dome) * Math.cos(th),
                cy: cy + ry * (0.46 - 0.06 * dome) * Math.sin(th),
                rx: rx * 0.5 * s * (1 + 0.06 * dome),
                ry: ry * 0.56 * s,
            };
        });
        const n = Math.max(6, Math.round(c.n * 0.62));
        for (const k of [0, 4, 1, 3, 2]) {
            const Lb = lobes[k];
            const s0 = seed + k * 7;
            const g2 = [
                P(scallop({ cx: Lb.cx, cy: Lb.cy, rx: Lb.rx, ry: Lb.ry, n, seed: s0, jit: c.jit, bulge: c.bulge, flat: flat * 0.5 }), pal.deep),
                P(scallop({ cx: Lb.cx - Lb.rx * 0.06, cy: Lb.cy - Lb.ry * 0.1, rx: Lb.rx * 0.88, ry: Lb.ry * 0.84, n, seed: s0, jit: c.jit, bulge: c.bulge, flat: flat * 0.5 }), pal.mid),
            ];
            if (lod !== 'icon' && k >= 1 && k <= 3)
                g2.push(P(scallop({ cx: Lb.cx - Lb.rx * 0.3, cy: Lb.cy - Lb.ry * 0.36, rx: Lb.rx * 0.4, ry: Lb.ry * 0.34, n: 5, seed: s0 + 3, jit: 0.3, bulge: 0.6 }), pal.light));
            layers.push(G(`domain-${k + 1}`, g2));
        }
        lobes.forEach((Lb) => organs.push({ x: Lb.cx + (Lb.cx - cx) * 0.55, y: Lb.cy + (Lb.cy - cy) * 0.55 }));
    }
    return { layers: [G('canopy', layers)], box: { cx, cy, rx, ry }, organs };
}
function iconCrown(kind, cx, cy, rx, ry, pal, seed, st) {
    const two = (d, lit) => [P(d, pal.deep), P(lit, pal.mid)];
    let parts;
    let box = { cx, cy, rx, ry };
    if (kind === 'round') {
        parts = two(scallop({ cx, cy, rx: rx * 0.92, ry: ry * 1.04, n: 16, seed, jit: 0, bulge: 0.52 }), scallop({ cx: cx - rx * 0.06, cy: cy - ry * 0.08, rx: rx * 0.8, ry: ry * 0.88, n: 16, seed, jit: 0, bulge: 0.52 }));
    }
    else if (kind === 'flame') {
        const w = rx * 0.82;
        const flame = (k, dx, dy) => `M${(0, exports.f)(cx + dx)} ${(0, exports.f)(cy - ry * 1.42 * k + dy)}C${(0, exports.f)(cx + dx + w * 0.75 * k)} ${(0, exports.f)(cy - ry * 0.8 * k + dy)} ${(0, exports.f)(cx + dx + w * k)} ${(0, exports.f)(cy + ry * 0.4 * k + dy)} ${(0, exports.f)(cx + dx)} ${(0, exports.f)(cy + ry * 0.9 * k + dy)}C${(0, exports.f)(cx + dx - w * k)} ${(0, exports.f)(cy + ry * 0.4 * k + dy)} ${(0, exports.f)(cx + dx - w * 0.75 * k)} ${(0, exports.f)(cy - ry * 0.8 * k + dy)} ${(0, exports.f)(cx + dx)} ${(0, exports.f)(cy - ry * 1.42 * k + dy)}Z`;
        parts = two(flame(1, 0, 0), flame(0.84, -w * 0.08, -ry * 0.04));
        box = { cx, cy: cy - ry * 0.25, rx: w, ry: ry * 1.15 };
    }
    else if (kind === 'umbrella') {
        const y0 = cy - ry * 0.2;
        const w = rx * 1.12;
        const dome = (k) => `M${(0, exports.f)(cx - w * k)} ${(0, exports.f)(y0 + ry * 0.2)}Q${(0, exports.f)(cx - w * k)} ${(0, exports.f)(y0 - ry * 0.75 * k)} ${(0, exports.f)(cx)} ${(0, exports.f)(y0 - ry * 0.78 * k)}Q${(0, exports.f)(cx + w * k)} ${(0, exports.f)(y0 - ry * 0.75 * k)} ${(0, exports.f)(cx + w * k)} ${(0, exports.f)(y0 + ry * 0.2)}Q${(0, exports.f)(cx)} ${(0, exports.f)(y0 + ry * 0.42)} ${(0, exports.f)(cx - w * k)} ${(0, exports.f)(y0 + ry * 0.2)}Z`;
        parts = two(dome(1), dome(0.86));
        box = { cx, cy: y0, rx: w, ry: ry * 0.6 };
    }
    else if (kind === 'puffs') {
        const r = ry * 0.66;
        const puffs = [
            [cx - rx * 0.56, cy + ry * 0.08, r * 0.92],
            [cx, cy - ry * 0.22, r * 1.06],
            [cx + rx * 0.56, cy + ry * 0.08, r * 0.92],
        ];
        parts = [...puffs.map(([x, y, rr]) => C(x, y, rr, pal.deep)), ...puffs.map(([x, y, rr]) => C(x - rr * 0.08, y - rr * 0.1, rr * 0.8, pal.mid))];
    }
    else {
        const yb = cy + ry * 0.36;
        const dome = (k) => `M${(0, exports.f)(cx - rx * k)} ${(0, exports.f)(yb)}C${(0, exports.f)(cx - rx * k)} ${(0, exports.f)(yb - ry * 1.5 * k)} ${(0, exports.f)(cx + rx * k)} ${(0, exports.f)(yb - ry * 1.5 * k)} ${(0, exports.f)(cx + rx * k)} ${(0, exports.f)(yb)}Q${(0, exports.f)(cx)} ${(0, exports.f)(yb + 3)} ${(0, exports.f)(cx - rx * k)} ${(0, exports.f)(yb)}Z`;
        parts = two(dome(1), dome(0.85));
        if (st === 4)
            for (const dx of [-0.55, 0.55])
                parts.push(E(cx + rx * dx, yb + 6, 5, 6.4, tokens_1.plantArt.gift.mangoRipe));
        box = { cx, cy: yb - ry * 0.5, rx, ry: ry * 0.75 };
    }
    return { layers: [G('canopy', parts)], box, organs: [] };
}
function tiersCanopy(bark, st, pal, seed, lod, sc, lean) {
    const g = GEO[st].canopy;
    const young = st === 3;
    const count = st >= 4 ? 5 : 3;
    const padK = st >= 4 ? 1.12 : 1.1;
    const top = g.cy - g.ry * 0.86;
    const bottom = g.cy + g.ry * 0.66;
    const pads = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const dom = count - 1 - i;
        const s = st >= 4 ? sc[dom] : 1;
        const y = lerp(top + g.ry * 0.16, bottom, t);
        const side = i === 0 ? 0 : i % 2 ? -1 : 1;
        const w = lerp(g.rx * (young ? 0.62 : 0.4), g.rx * 0.95, t) * (i === 0 ? 1 : 0.8) * s * padK;
        const x = 100 + side * g.rx * (young ? 0.18 : 0.3) * (0.4 + t * 0.6) + (i === 0 ? lean : 0);
        pads.push({ x, y, rx: w, ry: Math.max(9, g.ry * (young ? 0.34 : 0.28) * s * (i === 0 ? 1.2 : 1) * padK), side, dom });
    }
    const limbs = [];
    const layers = [];
    pads.forEach((p) => {
        if (p.side !== 0)
            limbs.push(P(limb(100 + p.side * 3 + lean * 0.5, p.y + p.ry * 0.7 + 5, p.x - p.side * p.rx * 0.15, p.y + p.ry * 0.25, 5 + st * 0.6, 3), bark));
    });
    pads.forEach((p, k) => {
        const s = seed + k * 13;
        const g2 = [
            P(scallop({ cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, n: 9, seed: s, jit: 0.3, bulge: 0.62, flat: 0.55 }), pal.deep),
            P(scallop({ cx: p.x - p.rx * 0.05, cy: p.y - p.ry * 0.16, rx: p.rx * 0.9, ry: p.ry * 0.74, n: 9, seed: s, jit: 0.3, bulge: 0.62, flat: 0.55 }), pal.mid),
        ];
        if (lod !== 'icon')
            g2.push(P(scallop({ cx: p.x - p.rx * 0.28, cy: p.y - p.ry * 0.4, rx: p.rx * 0.4, ry: p.ry * 0.36, n: 6, seed: s + 3, jit: 0.3, bulge: 0.6 }), pal.light));
        layers.push(G(count === 5 ? `domain-${p.dom + 1}` : null, g2));
    });
    return {
        layers: [G('branches', limbs), G('canopy', layers)],
        box: { cx: 100, cy: (top + bottom) / 2, rx: g.rx, ry: (bottom - top) / 2 + g.ry * 0.3 },
        pads,
        organs: count === 5 ? [...pads].sort((a, b) => a.dom - b.dom).map((p) => ({ x: p.x, y: p.y })) : [],
    };
}
function bonsaiCanopy(bark, st, pal, seed, lod, sc, trunkTop) {
    const g = GEO[st].canopy;
    const k = g.rx / 70;
    const spots = st >= 4
        ? [
            [-0.86, 0.55, 0.42, 0.2],
            [-0.42, -0.05, 0.4, 0.22],
            [0.2, -0.62, 0.42, 0.26],
            [0.56, 0.0, 0.4, 0.22],
            [0.86, 0.5, 0.44, 0.2],
        ]
        : [
            [0.12, -0.5, 0.55, 0.3],
            [-0.6, 0.3, 0.45, 0.24],
        ];
    const layers = [];
    const limbs = [];
    const organs = [];
    spots.forEach(([ox, oy, sx, sy], i) => {
        const s = st >= 4 ? sc[i] : 1;
        const hx = Math.min(g.rx, 62);
        const p = { x: 100 + ox * hx, y: g.cy + 22 * k + oy * g.ry, rx: sx * hx * s * (st === 6 ? 1.06 : 1), ry: Math.max(8, sy * g.ry * s) };
        limbs.push(P(limb(trunkTop.x + (ox < 0 ? -2 : 2), trunkTop.y + 10 + oy * 12, p.x, p.y + p.ry * 0.4, 5 + st * 0.5, 2.5, ox < 0 ? 3 : -3), bark));
        const ss = seed + i * 13;
        const g2 = [
            P(scallop({ cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, n: 8, seed: ss, jit: 0.3, bulge: 0.62, flat: 0.5 }), pal.deep),
            P(scallop({ cx: p.x - p.rx * 0.05, cy: p.y - p.ry * 0.16, rx: p.rx * 0.9, ry: p.ry * 0.74, n: 8, seed: ss, jit: 0.3, bulge: 0.62, flat: 0.5 }), pal.mid),
        ];
        if (lod !== 'icon')
            g2.push(P(scallop({ cx: p.x - p.rx * 0.28, cy: p.y - p.ry * 0.4, rx: p.rx * 0.4, ry: p.ry * 0.36, n: 6, seed: ss + 3, jit: 0.3, bulge: 0.6 }), pal.light));
        layers.push(G(st >= 4 ? `domain-${i + 1}` : null, g2));
        organs.push({ x: p.x, y: p.y });
    });
    return { layers: [G('branches', limbs), G('canopy', layers)], box: { cx: 100, cy: g.cy + 10 * k, rx: Math.min(g.rx, 62) * 1.05, ry: g.ry * 0.75 }, organs: st >= 4 ? organs : [], pads: [] };
}
function palmCanopy(st, pal, lod, sc, crown) {
    const angs = st >= 4 ? [-168, -132, -98, -58, -14] : [-150, -98, -36];
    const Lb = { 3: 40, 4: 56, 5: 68, 6: 76 }[st];
    const layers = [];
    const organs = [];
    const order = st >= 4 ? [2, 1, 3, 0, 4] : [1, 0, 2];
    const fronds = angs.map((a, i) => {
        const s = st >= 4 ? sc[i] : 1;
        const Ln = Lb * s;
        const r = (a * Math.PI) / 180;
        const droop = Ln * 0.12 + Math.abs(Math.cos(r)) * Ln * 0.36;
        const p0 = [crown.x, crown.y];
        const p2 = [crown.x + Math.cos(r) * Ln, crown.y + Math.sin(r) * Ln * 0.75 + droop];
        const p1 = [crown.x + Math.cos(r) * Ln * 0.62, crown.y + Math.sin(r) * Ln * 0.75 * 0.62 - Ln * 0.12];
        return { p0, p1, p2, L: Ln };
    });
    const bez = (fr, t) => {
        const u = 1 - t;
        return [u * u * fr.p0[0] + 2 * u * t * fr.p1[0] + t * t * fr.p2[0], u * u * fr.p0[1] + 2 * u * t * fr.p1[1] + t * t * fr.p2[1]];
    };
    for (const k of order) {
        const fr = fronds[k];
        const N = 14;
        const top = [];
        const bot = [];
        const wmax = fr.L * 0.27;
        for (let j = 0; j <= N; j++) {
            const t = j / N;
            const [x, y] = bez(fr, t);
            const [x2, y2] = bez(fr, Math.min(1, t + 0.01));
            let nx = -(y2 - y);
            let ny = x2 - x;
            const l = Math.hypot(nx, ny) || 1;
            nx /= l;
            ny /= l;
            if (ny < 0) {
                nx = -nx;
                ny = -ny;
            }
            const w = wmax * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.35);
            top.push([x - nx * w * 0.32, y - ny * w * 0.32]);
            const comb = lod === 'icon' ? 1 : j % 2 ? 1 : 0.62;
            bot.push([x + nx * w * comb, y + ny * w * comb]);
        }
        const d = 'M' + top.map((p) => p.map(exports.f).join(' ')).join('L') + 'L' + bot.reverse().map((p) => p.map(exports.f).join(' ')).join('L') + 'Z';
        const g2 = [P(d, k % 2 ? pal.deep : pal.mid)];
        if (lod !== 'icon')
            g2.push(S('M' + fr.p0.map(exports.f).join(' ') + 'Q' + fr.p1.map(exports.f).join(' ') + ' ' + fr.p2.map(exports.f).join(' '), pal.light, 1.4));
        layers.push(G(st >= 4 ? `domain-${k + 1}` : null, g2));
    }
    fronds.forEach((fr) => {
        const [x, y] = bez(fr, 0.6);
        organs.push({ x, y });
    });
    return { layers: [G('canopy', layers)], box: { cx: crown.x, cy: crown.y + 4, rx: Lb, ry: Lb * 0.55 }, organs: st >= 4 ? organs : [] };
}
const GROUND_K = [0, 0.72, 0.86, 1];
function ground(kind, size, lod, theme, o = {}) {
    const T = tokens_1.plantTheme[theme];
    const PT = tokens_1.plantArt.pot;
    const PL = tokens_1.plantArt.planter;
    const w = [0, 34, 46, 62][size];
    const k = GROUND_K[size];
    const shadow = E(100, 172, w * 1.05, 6, T.shadow, { opacity: T.shadowOpacity });
    const back = [];
    const front = [];
    const look = lod === 'icon' ? 'meadow' : o.look || 'meadow';
    const stoneRing = (cx, cy, rx, ry) => {
        const n = 11;
        const behind = [];
        const ahead = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + 0.2;
            const x = cx + Math.cos(a) * rx;
            const y = cy + Math.sin(a) * ry;
            const s = (i % 3 === 0 ? 1.2 : 1) * k * 1.25;
            const st = G(null, [E(x, y, 3.6 * s, 2.5 * s, i % 2 ? PL.stoneRing : mix(PL.stoneRing, tokens_1.plantArt.black, 0.12)), E(x - 0.9 * s, y - 0.8 * s, 1.6 * s, 0.9 * s, PL.stoneRingLit)]);
            (Math.sin(a) < 0 ? behind : ahead).push(st);
        }
        return { behind: G('stone-ring', behind), ahead: G('stone-ring-front', ahead) };
    };
    const waymark = (x, foot) => {
        const s = k * 1.6;
        return G('trail-blaze', [
            P(`M${(0, exports.f)(x - 2.6 * s)} ${(0, exports.f)(foot)}V${(0, exports.f)(foot - 15 * s)}Q${(0, exports.f)(x)} ${(0, exports.f)(foot - 18 * s)} ${(0, exports.f)(x + 2.6 * s)} ${(0, exports.f)(foot - 15 * s)}V${(0, exports.f)(foot)}Z`, PL.post),
            P(`M${(0, exports.f)(x - 2.6 * s)} ${(0, exports.f)(foot)}V${(0, exports.f)(foot - 15 * s)}Q${(0, exports.f)(x - 1.4 * s)} ${(0, exports.f)(foot - 16.6 * s)} ${(0, exports.f)(x - 0.6 * s)} ${(0, exports.f)(foot - 16.9 * s)}V${(0, exports.f)(foot)}Z`, PL.postLit),
            P(`M${(0, exports.f)(x - 2.1 * s)} ${(0, exports.f)(foot - 13 * s)}h${(0, exports.f)(4.2 * s)}v${(0, exports.f)(6 * s)}h${(0, exports.f)(-4.2 * s)}Z`, PL.blaze),
            P(`M${(0, exports.f)(x)} ${(0, exports.f)(foot - 12.2 * s)}l${(0, exports.f)(1.5 * s)} ${(0, exports.f)(3.4 * s)}l${(0, exports.f)(-1.5 * s)} ${(0, exports.f)(-0.9 * s)}l${(0, exports.f)(-1.5 * s)} ${(0, exports.f)(0.9 * s)}Z`, PL.blazeMark),
        ]);
    };
    if (kind === 'meadow') {
        back.push(shadow);
        back.push(P(`M${100 - w} 174C${100 - w * 0.8} ${164 - size} ${100 + w * 0.8} ${164 - size} ${100 + w} 174Q100 ${181 + size} ${100 - w} 174Z`, tokens_1.plantArt.soil));
        back.push(P(`M${100 - w} 174C${100 - w * 0.8} ${164 - size} ${100 + w * 0.8} ${164 - size} ${100 + w} 174Q100 170 ${100 - w} 174Z`, tokens_1.plantArt.grass));
        if (look === 'stone-ring') {
            const ring = stoneRing(100, 172.5, w * 0.74, 3.6);
            back.push(ring.behind);
            front.push(ring.ahead);
        }
        if (lod !== 'icon') {
            const tuft = (x, s) => P(`M${(0, exports.f)(x - 4 * s)} 172Q${(0, exports.f)(x - 3 * s)} ${(0, exports.f)(166 - 2 * s)} ${(0, exports.f)(x - 1.5 * s)} ${(0, exports.f)(163 - 2 * s)}Q${(0, exports.f)(x - 0.5 * s)} ${(0, exports.f)(168 - s)} ${(0, exports.f)(x)} ${(0, exports.f)(161 - 3 * s)}Q${(0, exports.f)(x + 1 * s)} ${(0, exports.f)(167 - s)} ${(0, exports.f)(x + 2.5 * s)} ${(0, exports.f)(164 - 2 * s)}Q${(0, exports.f)(x + 3 * s)} ${(0, exports.f)(168 - s)} ${(0, exports.f)(x + 4 * s)} 172Z`, tokens_1.plantArt.tuft);
            front.push(tuft(100 - w * 0.62, 0.9 + size * 0.15), tuft(100 + w * 0.7, 0.8 + size * 0.12));
            if (size >= 2 && look !== 'stone-ring')
                front.push(C(100 + w * 0.42, 169.5, 1.6, tokens_1.plantArt.daisy), C(100 + w * 0.42, 169.5, 0.6, tokens_1.plantArt.daisyCore));
        }
        if (look === 'trail-blaze')
            front.push(waymark(100 - w * 0.72, 174));
        return { back: G('ground', back), front: G('ground-front', front), top: 168, floor: 175, span: w };
    }
    const pw = w * 0.9;
    const ph = 14 + size * 4;
    const top = 168;
    const bot = top + ph;
    let soil = E(100, top + 1, pw * 0.92, 3.4, tokens_1.plantArt.soilDeep);
    const potShadow = (bw, y) => E(100, y, bw, 4.5, T.shadow, { opacity: T.shadowOpacity });
    let floor = bot + 1;
    let span = pw;
    let rimTop = top;
    const tapered = (body, lit, rim, band) => {
        back.push(P(`M${(0, exports.f)(100 - pw * 0.86)} ${top + 4}L${(0, exports.f)(100 - pw * 0.68)} ${bot}Q100 ${bot + 2} ${(0, exports.f)(100 + pw * 0.68)} ${bot}L${(0, exports.f)(100 + pw * 0.86)} ${top + 4}Z`, body));
        back.push(P(`M${(0, exports.f)(100 - pw * 0.86)} ${top + 4}L${(0, exports.f)(100 - pw * 0.68)} ${bot}Q${(0, exports.f)(100 - pw * 0.5)} ${bot + 1} ${(0, exports.f)(100 - pw * 0.4)} ${bot}L${(0, exports.f)(100 - pw * 0.6)} ${top + 4}Z`, lit));
        front.push(P(`M${(0, exports.f)(100 - pw)} ${top - 1}h${(0, exports.f)(pw * 2)}v8q0 2 -2 2h${(0, exports.f)(-pw * 2 + 4)}q-2 0 -2 -2Z`, rim));
        if (band)
            front.push(P(`M${(0, exports.f)(100 - pw)} ${top + 5}h${(0, exports.f)(pw * 2)}v2q0 2 -2 2h${(0, exports.f)(-pw * 2 + 4)}q-2 0 -2 -2Z`, band));
    };
    const faceY = top + 9 + (ph - 9) * 0.5;
    if (kind === 'terracotta') {
        back.push(shadow);
        tapered(PT.terracotta, PT.terracottaLit, PT.terracottaRim, PT.terracottaBand);
    }
    else if (kind === 'fieldstone') {
        back.push(shadow);
        tapered(PL.fieldstone, PL.fieldstoneLit, PL.fieldstoneLit);
        if (lod !== 'icon') {
            const r = rng(7 + size);
            for (let i = 0; i < 7; i++) {
                const x = 100 - pw * 0.6 + (i / 6) * pw * 1.2 + (r() - 0.5) * 4;
                const y = top + 11 + ((i * 5) % 3) * ((ph - 12) / 3) + r() * 2;
                back.push(E(x, y, 3 + r() * 2, 2 + r(), i % 2 ? PL.fieldstoneDark : PL.fieldstoneLit, { opacity: 0.85 }));
            }
        }
    }
    else if (kind === 'five-stone') {
        back.push(shadow);
        tapered(PL.fiveStone, mix(PL.fiveStone, tokens_1.plantArt.white, 0.3), PL.fiveStoneRim);
        if (lod !== 'icon')
            PL.fiveDots.forEach((c, i) => back.push(C(100 + (i - 2) * pw * 0.26, faceY, Math.max(1.6, pw * 0.075), c)));
    }
    else if (kind === 'compass-rose') {
        back.push(shadow);
        tapered(PL.compass, PL.compassLit, PL.compassRim);
        if (lod !== 'icon') {
            const s = Math.max(2.4, ph * 0.22);
            back.push(P(`M100 ${(0, exports.f)(faceY - s * 1.5)}L${(0, exports.f)(100 + s * 0.38)} ${(0, exports.f)(faceY - s * 0.38)}L${(0, exports.f)(100 + s * 1.5)} ${(0, exports.f)(faceY)}L${(0, exports.f)(100 + s * 0.38)} ${(0, exports.f)(faceY + s * 0.38)}L100 ${(0, exports.f)(faceY + s * 1.5)}L${(0, exports.f)(100 - s * 0.38)} ${(0, exports.f)(faceY + s * 0.38)}L${(0, exports.f)(100 - s * 1.5)} ${(0, exports.f)(faceY)}L${(0, exports.f)(100 - s * 0.38)} ${(0, exports.f)(faceY - s * 0.38)}Z`, PL.compassStar));
            back.push(C(100, faceY, s * 0.28, PL.compass));
        }
    }
    else if (kind === 'banded') {
        back.push(shadow);
        tapered(PL.banded, PL.bandedLit, PL.bandedRim, PL.bandedBand);
        if (lod !== 'icon') {
            back.push(P(`M${(0, exports.f)(100 - pw * 0.8)} ${(0, exports.f)(bot - 7)}L${(0, exports.f)(100 + pw * 0.8)} ${(0, exports.f)(bot - 7)}L${(0, exports.f)(100 + pw * 0.76)} ${(0, exports.f)(bot - 3.6)}L${(0, exports.f)(100 - pw * 0.76)} ${(0, exports.f)(bot - 3.6)}Z`, PL.bandedClay));
            back.push(P(`M${(0, exports.f)(100 - pw * 0.83)} ${(0, exports.f)(bot - 11)}L${(0, exports.f)(100 + pw * 0.83)} ${(0, exports.f)(bot - 11)}L${(0, exports.f)(100 + pw * 0.82)} ${(0, exports.f)(bot - 9.6)}L${(0, exports.f)(100 - pw * 0.82)} ${(0, exports.f)(bot - 9.6)}Z`, PL.bandedBand));
        }
    }
    else if (kind === 'celadon') {
        back.push(shadow);
        back.push(P(`M${(0, exports.f)(100 - pw)} ${top}C${(0, exports.f)(100 - pw)} ${bot - 2} ${(0, exports.f)(100 - pw * 0.5)} ${bot} 100 ${bot}C${(0, exports.f)(100 + pw * 0.5)} ${bot} ${(0, exports.f)(100 + pw)} ${bot - 2} ${(0, exports.f)(100 + pw)} ${top}Z`, PT.celadon));
        back.push(P(`M${(0, exports.f)(100 - pw * 0.88)} ${top + 3}C${(0, exports.f)(100 - pw * 0.86)} ${bot - 6} ${(0, exports.f)(100 - pw * 0.6)} ${bot - 2} ${(0, exports.f)(100 - pw * 0.4)} ${bot - 1.5}C${(0, exports.f)(100 - pw * 0.66)} ${bot - 6} ${(0, exports.f)(100 - pw * 0.7)} ${top + 6} ${(0, exports.f)(100 - pw * 0.66)} ${top + 3}Z`, PT.celadonLit));
        if (lod !== 'icon')
            back.push(S(`M${(0, exports.f)(100 + pw * 0.2)} ${top + 6}l4 4l-2 4l5 3`, PT.celadonLine, 0.8));
        back.push(P(`M${(0, exports.f)(100 - pw * 0.4)} ${bot - 0.5}h${(0, exports.f)(pw * 0.8)}v2.5h${(0, exports.f)(-pw * 0.8)}Z`, PT.celadonLine));
        front.push(P(`M${(0, exports.f)(100 - pw - 1)} ${top - 1}h${(0, exports.f)(pw * 2 + 2)}v3q0 1.5 -1.5 1.5h${(0, exports.f)(-pw * 2 + 1)}q-1.5 0 -1.5 -1.5Z`, PT.celadonRim));
    }
    else if (kind === 'bonsai') {
        const bw = pw * 1.25;
        const bh = 8 + size * 2;
        back.push(potShadow(bw, top + bh + 4));
        back.push(P(`M${(0, exports.f)(100 - bw)} ${top}h${(0, exports.f)(bw * 2)}l-3 ${bh}h${(0, exports.f)(-bw * 2 + 6)}Z`, PT.tray));
        back.push(P(`M${(0, exports.f)(100 - bw * 0.82)} ${top + bh}h7v3h-7Z M${(0, exports.f)(100 + bw * 0.82 - 7)} ${top + bh}h7v3h-7Z`, PT.trayFoot));
        front.push(P(`M${(0, exports.f)(100 - bw - 1)} ${top - 1.5}h${(0, exports.f)(bw * 2 + 2)}v3h${(0, exports.f)(-bw * 2 - 2)}Z`, PT.trayRim));
        soil = E(100, top + 1, bw * 0.95, 3.4, tokens_1.plantArt.soilDeep);
        if (lod !== 'icon')
            front.push(P(`M${(0, exports.f)(100 + bw * 0.45)} ${top - 1}q4 -6 9 0Z`, PT.pebble), P(`M${(0, exports.f)(100 - bw * 0.7)} ${top - 1}q5 -4 9 0Z`, tokens_1.plantArt.grass));
        floor = top + bh + 3;
        span = bw;
    }
    else if (kind === 'basket' || kind === 'root-woven') {
        back.push(shadow);
        back.push(P(`M${(0, exports.f)(100 - pw * 0.95)} ${top}L${(0, exports.f)(100 - pw * 0.78)} ${bot}h${(0, exports.f)(pw * 1.56)}L${(0, exports.f)(100 + pw * 0.95)} ${top}Z`, PT.basket));
        if (lod !== 'icon') {
            for (let y = top + 4; y < bot - 1; y += 4)
                back.push(S(`M${(0, exports.f)(100 - pw * 0.92 + (y - top) * 0.17)} ${y}H${(0, exports.f)(100 + pw * 0.92 - (y - top) * 0.17)}`, PT.basketWeave, 1.2));
            for (let i = -3; i <= 3; i++)
                back.push(S(`M${(0, exports.f)(100 + i * pw * 0.26)} ${top + 1}L${(0, exports.f)(100 + i * pw * 0.21)} ${bot - 1}`, PT.basketRib, 1.3));
            if (kind === 'root-woven')
                for (const [x0, dir] of [
                    [-0.7, 1],
                    [0.15, -1],
                    [0.55, 1],
                ])
                    back.push(S(`M${(0, exports.f)(100 + x0 * pw)} ${top + 2}C${(0, exports.f)(100 + (x0 + dir * 0.25) * pw)} ${(0, exports.f)(top + ph * 0.35)} ${(0, exports.f)(100 + (x0 - dir * 0.15) * pw)} ${(0, exports.f)(top + ph * 0.65)} ${(0, exports.f)(100 + (x0 + dir * 0.1) * pw)} ${bot - 1}`, PL.root, 2));
        }
        front.push(P(`M${(0, exports.f)(100 - pw - 1)} ${top - 2}h${(0, exports.f)(pw * 2 + 2)}v4h${(0, exports.f)(-pw * 2 - 2)}Z`, kind === 'root-woven' ? PL.root : PT.basketRim));
        rimTop = top - 2;
    }
    else if (kind === 'pond') {
        const bw = pw * 1.3;
        const bh = 10 + size * 3;
        back.push(potShadow(bw, top + bh + 3));
        back.push(P(`M${(0, exports.f)(100 - bw)} ${top}C${(0, exports.f)(100 - bw)} ${top + bh} ${(0, exports.f)(100 - bw * 0.6)} ${top + bh + 2} 100 ${top + bh + 2}C${(0, exports.f)(100 + bw * 0.6)} ${top + bh + 2} ${(0, exports.f)(100 + bw)} ${top + bh} ${(0, exports.f)(100 + bw)} ${top}Z`, PT.bowl));
        back.push(P(`M${(0, exports.f)(100 - bw * 0.9)} ${top + 3}C${(0, exports.f)(100 - bw * 0.85)} ${top + bh - 2} ${(0, exports.f)(100 - bw * 0.5)} ${top + bh} ${(0, exports.f)(100 - bw * 0.3)} ${top + bh + 0.5}C${(0, exports.f)(100 - bw * 0.62)} ${top + bh - 4} ${(0, exports.f)(100 - bw * 0.7)} ${top + 6} ${(0, exports.f)(100 - bw * 0.68)} ${top + 3}Z`, PT.bowlLit));
        back.push(E(100, top + 0.5, bw * 0.95, 4, PT.water));
        if (lod !== 'icon')
            back.push(S(`M${(0, exports.f)(100 + bw * 0.3)} ${top + 0.5}h${(0, exports.f)(bw * 0.3)} M${(0, exports.f)(100 - bw * 0.5)} ${top + 1.6}h${(0, exports.f)(bw * 0.2)}`, PT.ripple, 0.9));
        front.push(P(`M${(0, exports.f)(100 - bw - 1)} ${top - 1.2}h${(0, exports.f)(bw * 2 + 2)}v2.6h${(0, exports.f)(-bw * 2 - 2)}Z`, PT.bowlRim));
        if (look === 'stone-ring') {
            const ring = stoneRing(100, top + bh, bw * 1.04, 2.8);
            back.unshift(ring.behind);
            front.push(ring.ahead);
        }
        if (look === 'trail-blaze')
            front.push(waymark(100 - bw - 7 * k, top + bh + 3));
        return { back: G('ground', back), front: G('ground-front', front), top: top - 1, floor: top + bh + 3, span: bw };
    }
    else if (kind === 'stone') {
        const sw = pw * 1.1;
        back.push(shadow);
        back.push(P(`M${(0, exports.f)(100 - sw)} ${bot - 1}C${(0, exports.f)(100 - sw * 1.05)} ${top + 2} ${(0, exports.f)(100 - sw * 0.55)} ${top - 3} 100 ${top - 2}C${(0, exports.f)(100 + sw * 0.6)} ${top - 3} ${(0, exports.f)(100 + sw * 1.05)} ${top + 3} ${(0, exports.f)(100 + sw)} ${bot - 1}Q100 ${bot + 2} ${(0, exports.f)(100 - sw)} ${bot - 1}Z`, PT.stone));
        back.push(P(`M${(0, exports.f)(100 - sw * 0.9)} ${bot - 3}C${(0, exports.f)(100 - sw)} ${top + 4} ${(0, exports.f)(100 - sw * 0.5)} ${top} ${(0, exports.f)(100 - sw * 0.2)} ${top}C${(0, exports.f)(100 - sw * 0.6)} ${top + 4} ${(0, exports.f)(100 - sw * 0.7)} ${bot - 6} ${(0, exports.f)(100 - sw * 0.5)} ${bot}Z`, PT.stoneLit));
        front.push(P(`M${(0, exports.f)(100 - sw * 0.75)} ${top + 2}C${(0, exports.f)(100 - sw * 0.5)} ${top - 4} ${(0, exports.f)(100 + sw * 0.5)} ${top - 4} ${(0, exports.f)(100 + sw * 0.78)} ${top + 2}Q${(0, exports.f)(100 + sw * 0.4)} ${top + 6} ${(0, exports.f)(100 + sw * 0.1)} ${top + 3}Q${(0, exports.f)(100 - sw * 0.3)} ${top + 7} ${(0, exports.f)(100 - sw * 0.75)} ${top + 2}Z`, tokens_1.plantArt.grass));
        return { back: G('ground', back), front: G('ground-front', front), top: top - 2, floor: bot, span: sw };
    }
    if (o.water) {
        soil = E(100, top + 1, pw * 0.92, 3.6, PT.water);
        if (lod !== 'icon')
            front.push(S(`M${(0, exports.f)(100 + pw * 0.25)} ${top + 1}h${(0, exports.f)(pw * 0.3)}`, PT.ripple, 0.9));
    }
    back.push(soil);
    if (look === 'stone-ring') {
        const ring = stoneRing(100, floor - 3.5, span * 0.98, 2.6);
        back.unshift(ring.behind);
        front.push(ring.ahead);
    }
    if (look === 'trail-blaze' && lod !== 'icon') {
        const s = Math.min((ph - 8) / 10, Math.max(0.7, ph / 22) * 1.6);
        const y = kind === 'bonsai' ? top + 1 + (floor - top - 4) / 2 : faceY + (kind === 'celadon' ? 0 : 2);
        if (kind === 'bonsai')
            front.push(waymark(100 - span - 7 * k, floor));
        else
            front.push(G('trail-blaze', [
                P(`M${(0, exports.f)(100 - 4 * s)} ${(0, exports.f)(y - 4.5 * s)}h${(0, exports.f)(8 * s)}v${(0, exports.f)(9 * s)}h${(0, exports.f)(-8 * s)}Z`, PL.blaze, { opacity: 0.95 }),
                P(`M100 ${(0, exports.f)(y - 3.2 * s)}l${(0, exports.f)(2.6 * s)} ${(0, exports.f)(5.6 * s)}l${(0, exports.f)(-2.6 * s)} ${(0, exports.f)(-1.5 * s)}l${(0, exports.f)(-2.6 * s)} ${(0, exports.f)(1.5 * s)}Z`, PL.blazeMark),
            ]));
    }
    return { back: G('ground', back), front: G('ground-front', front), top: Math.min(top, rimTop + 2), floor, span };
}
exports.MOODS = ['idle', 'happy', 'curious', 'proud', 'resting', 'blink'];
function face(x, y, w, mood, lod) {
    const INK = tokens_1.plantArt.ink;
    const sp = Math.min(Math.max(w * 0.4, 8), 17) / 2;
    const er = Math.min(Math.max(w * 0.1, 2.4), 4.2);
    const kids = [];
    const eyeL = x - sp;
    const eyeR = x + sp;
    const lw = Math.max(1.2, er * 0.55);
    if (mood === 'happy') {
        for (const ex of [eyeL, eyeR])
            kids.push(S(`M${(0, exports.f)(ex - er)} ${(0, exports.f)(y + er * 0.3)}Q${(0, exports.f)(ex)} ${(0, exports.f)(y - er * 1.5)} ${(0, exports.f)(ex + er)} ${(0, exports.f)(y + er * 0.3)}`, INK, lw));
    }
    else if (mood === 'proud') {
        for (const ex of [eyeL, eyeR])
            kids.push(S(`M${(0, exports.f)(ex - er * 1.3)} ${(0, exports.f)(y + er * 0.1)}Q${(0, exports.f)(ex)} ${(0, exports.f)(y - er * 0.45)} ${(0, exports.f)(ex + er * 1.3)} ${(0, exports.f)(y + er * 0.1)}`, INK, lw * 1.15));
    }
    else if (mood === 'resting') {
        for (const ex of [eyeL, eyeR])
            kids.push(S(`M${(0, exports.f)(ex - er)} ${(0, exports.f)(y + er * 0.2)}Q${(0, exports.f)(ex)} ${(0, exports.f)(y + er * 1.3)} ${(0, exports.f)(ex + er)} ${(0, exports.f)(y + er * 0.2)}`, INK, lw));
    }
    else if (mood === 'blink') {
        for (const ex of [eyeL, eyeR])
            kids.push(S(`M${(0, exports.f)(ex - er * 0.9)} ${(0, exports.f)(y + er * 0.4)}H${(0, exports.f)(ex + er * 0.9)}`, INK, lw));
    }
    else {
        const big = mood === 'curious' ? 1.28 : 1;
        for (const ex of [eyeL, eyeR]) {
            kids.push(E(ex, y, er * 0.86 * big, er * 1.12 * big, INK));
            if (lod === 'full')
                kids.push(C(ex - er * 0.3, y - er * 0.45, er * 0.34 * big, tokens_1.plantArt.white, { opacity: 0.9 }));
        }
        if (mood === 'curious')
            kids.push(S(`M${(0, exports.f)(eyeR - er)} ${(0, exports.f)(y - er * 2.5)}Q${(0, exports.f)(eyeR)} ${(0, exports.f)(y - er * 3.3)} ${(0, exports.f)(eyeR + er * 1.1)} ${(0, exports.f)(y - er * 2.4)}`, INK, lw * 0.85));
    }
    if (lod !== 'icon') {
        const co = mood === 'proud' ? 0.72 : mood === 'happy' ? 0.6 : 0.38;
        const bw = mood === 'proud' ? 1.45 : 1.3;
        kids.unshift(E(eyeL - er * 0.9, y + er * 2.1, er * bw, er * 0.75, tokens_1.plantArt.blush, { opacity: co }), E(eyeR + er * 0.9, y + er * 2.1, er * bw, er * 0.75, tokens_1.plantArt.blush, { opacity: co }));
    }
    const my = y + er * 2.4;
    const mw = er * 1.05;
    if (mood === 'happy')
        kids.push(P(`M${(0, exports.f)(x - mw * 1.25)} ${(0, exports.f)(my - 0.6)}Q${(0, exports.f)(x)} ${(0, exports.f)(my + mw * 2)} ${(0, exports.f)(x + mw * 1.25)} ${(0, exports.f)(my - 0.6)}Z`, INK));
    else if (mood === 'curious')
        kids.push(E(x, my + 0.6, mw * 0.5, mw * 0.62, INK));
    else if (mood === 'resting')
        kids.push(S(`M${(0, exports.f)(x - mw * 0.55)} ${(0, exports.f)(my + 0.4)}Q${(0, exports.f)(x)} ${(0, exports.f)(my + 1.3)} ${(0, exports.f)(x + mw * 0.55)} ${(0, exports.f)(my + 0.4)}`, INK, lw * 0.85));
    else if (mood === 'proud')
        kids.push(S(`M${(0, exports.f)(x - mw * 1.9)} ${(0, exports.f)(my - 0.8)}Q${(0, exports.f)(x)} ${(0, exports.f)(my + mw * 1.7)} ${(0, exports.f)(x + mw * 1.9)} ${(0, exports.f)(my - 0.8)}`, INK, lw * 1.3));
    else
        kids.push(S(`M${(0, exports.f)(x - mw * 0.8)} ${(0, exports.f)(my)}Q${(0, exports.f)(x)} ${(0, exports.f)(my + mw * 1.1)} ${(0, exports.f)(x + mw * 0.8)} ${(0, exports.f)(my)}`, INK, lw * 0.9));
    return G('face', kids);
}
function effects(mood, A, lod, theme) {
    if (lod === 'icon' || !A.canopyBox || mood !== 'resting')
        return null;
    const T = tokens_1.plantTheme[theme];
    const { cx, cy, rx, ry } = A.canopyBox;
    const k = Math.min(2, Math.max(1, rx / 34));
    const about = (x, y) => `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) scale(${(0, exports.f)(k)}) translate(${(0, exports.f)(-x)} ${(0, exports.f)(-y)})`;
    const mx = cx + rx * 0.7;
    const my = cy - ry - 2 - 6 * k;
    return G('fx', [P(`M${(0, exports.f)(mx)} ${(0, exports.f)(my - 8)}A8 8 0 1 0 ${(0, exports.f)(mx + 7)} ${(0, exports.f)(my + 4)}A6.4 6.4 0 1 1 ${(0, exports.f)(mx)} ${(0, exports.f)(my - 8)}Z`, T.honey)], { transform: about(mx, my) });
}
function bird(kind, x, y, s, lod) {
    const V = tokens_1.plantArt.visitor;
    const body = kind === 'wren' ? V.wren : V.robin;
    const dark = kind === 'wren' ? V.wrenDark : V.robinDark;
    const belly = kind === 'wren' ? V.wrenBelly : V.robinBreast;
    const kids = [
        kind === 'wren' ? P('M-5 -6L-9 -16L-6.4 -16.6L-2.6 -7Z', dark) : P('M-6 -4L-13 -8L-11.6 -2Z', dark),
        E(0, -6, 7.6, 6.2, body),
        E(1.8, -4.2, 5, 4, belly, kind === 'robin' ? {} : { opacity: 0.95 }),
        C(4.8, -10.4, 4.3, body),
        kind === 'robin' ? E(5.4, -8.4, 3, 2.6, belly) : null,
        P('M8.7 -11.2l3.8 1.3l-3.8 1.1Z', V.beak),
        C(6.1, -11.3, 1, tokens_1.plantArt.ink),
        lod === 'full' ? C(5.8, -11.6, 0.35, tokens_1.plantArt.white) : null,
        P('M-4.6 -8Q0.4 -9 2 -5Q-3 -2.6 -4.6 -8Z', dark),
        kind === 'wren' && lod === 'full' ? S('M3.2 -12.6Q6 -13.6 8.6 -12.6', V.wrenBelly, 0.7) : null,
        S('M-1 0.2v1.8 M2 0.2v1.8', V.leg, 0.9),
    ];
    return G('visitor', kids, { transform: `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) scale(${(0, exports.f)(s)})` });
}
function visitorNode(id, A, lod) {
    if (lod === 'icon' || !A.perch || (id !== 'wren' && id !== 'robin'))
        return null;
    const k = Math.min(1.6, Math.max(0.85, (A.canopyBox ? A.canopyBox.rx : 30) / 40));
    return bird(id, A.perch.x, A.perch.y + 1, k, lod);
}
function keepsakeShape(id, lod, theme = 'light') {
    const parts = keepsakeParts(id, lod, theme);
    if (theme !== 'dark' || !parts.length)
        return parts;
    const rim = (n) => {
        var _a;
        return n.t === 'g'
            ? { ...n, children: n.children.map(rim) }
            : { ...n, fill: n.fill === 'none' ? 'none' : tokens_1.plantArt.keepsake.cream, stroke: tokens_1.plantArt.keepsake.cream, sw: (n.stroke ? ((_a = n.sw) !== null && _a !== void 0 ? _a : 1) : 0) + 1.3, opacity: undefined };
    };
    const body = parts.filter((n) => !(n.t === 'ellipse' && n.fill === tokens_1.plantArt.black));
    return [G(null, body.map(rim), { opacity: 0.35 }), ...parts];
}
function keepsakeParts(id, lod, theme) {
    const K = theme === 'dark' ? { ...tokens_1.plantArt.keepsake, woodDark: tokens_1.plantArt.keepsake.wood, wood: tokens_1.plantArt.keepsake.woodLit } : tokens_1.plantArt.keepsake;
    const fine = lod === 'full';
    const shade = E(0, 0.4, 8.5, 1.8, tokens_1.plantArt.black, { opacity: 0.12 });
    switch (id) {
        case 'stepping-stone':
            return [shade, E(0, -2.6, 9.4, 3.6, K.stone), E(-2.4, -3.9, 4.6, 1.4, K.stoneLit), fine ? S('M3 -2.2q2 0.6 4 -0.2', K.stoneDark, 0.7) : null].filter(Boolean);
        case 'trail-post':
            return [shade, P('M-2.6 0V-17Q0 -20.4 2.6 -17V0Z', K.wood), P('M-2.6 0V-17Q-1.6 -18.6 -0.6 -19V0Z', K.woodLit), P('M-2.6 -14h5.2v3h-5.2Z', K.clay), P('M-2.6 -9.4h5.2v1.6h-5.2Z', K.cream)];
        case 'trail-board':
            return [shade, P('M-7.4 0V-12h2.4V0Z', K.woodDark), P('M5 0V-12h2.4V0Z', K.woodDark), P('M-10 -19.5h20v8.5h-20Z', K.wood), P('M-10 -19.5h20v2h-20Z', K.woodLit), S('M-7 -14.2h9 M-7 -12.6h6', K.cream, 1)];
        case 'compass-stone':
            return [shade, E(0, -6.2, 8.4, 6.6, K.stone), E(-2.4, -8.6, 3.6, 2.2, K.stoneLit), P('M0 -11.4L1.2 -7.4L5 -6.2L1.2 -5L0 -1L-1.2 -5L-5 -6.2L-1.2 -7.4Z', K.gold), C(0, -6.2, 0.9, K.stoneDark)];
        case 'jay':
            return [
                shade,
                P('M-6 -6L-12 -4.6L-11 -2.4L-5.4 -4Z', K.jayBlack),
                E(0, -6.4, 7.2, 5.6, K.jay),
                P('M-4.8 -8.4Q0 -10 2.2 -5.6Q-2.6 -3.6 -4.8 -8.4Z', K.jayBlue),
                S('M-3.6 -7.6l1.4 1.2 M-2 -8.3l1.4 1.2 M-0.4 -8.6l1.4 1.2', tokens_1.plantArt.white, 0.6),
                C(4.6, -11, 4, K.jay),
                P('M2.8 -14.6Q5 -16.6 7.4 -14.2Q5 -13.6 2.8 -14.6Z', K.cream),
                P('M8.3 -11.6l3.4 1.1l-3.4 1Z', K.jayBlack),
                C(5.8, -11.6, 0.95, tokens_1.plantArt.ink),
                S('M4.6 -9.6q1.6 1 3 0.4', K.jayBlack, 0.8),
                S('M-1 0.2v-1.8 M2 0.2v-1.8', tokens_1.plantArt.visitor.leg, 0.9),
            ];
        case 'empty-nest':
            return [
                shade,
                P('M-9 -6.4Q-8.4 0 0 0Q8.4 0 9 -6.4Z', K.wood),
                E(0, -6.4, 9, 2.6, K.woodDark),
                S('M-8.6 -5Q-2 -2 6 -5.6 M-7 -3Q0 -1 7.6 -3.6 M-6 -6.6l3 1.4 M2 -7l4 1', K.woodLit, 0.9),
            ];
        case 'woven-ring':
            return [
                shade,
                C(0, -8.6, 7.4, 'none', { stroke: K.wood, sw: 3 }),
                C(0, -8.6, 7.4, 'none', { stroke: K.woodLit, sw: 1, opacity: 0.85 }),
                fine ? S('M-5.6 -13.4l1.8 1.6 M4 -14.4l-1.4 1.8 M-7.6 -7.6h2.4 M5.2 -7.6h2.4', K.woodDark, 0.8) : null,
                C(0, -1.2, 1.7, K.clay),
            ].filter(Boolean);
        case 'fern':
            return [
                S('M-1 0Q-5 -8 -9 -14', K.fern, 1.4),
                S('M1 0Q4 -9 2 -18', K.fern, 1.4),
                ...[0.25, 0.45, 0.65, 0.85].flatMap((t) => [
                    glyph('olive', -1 - 8 * t, -14 * t, 0.42, -100 + t * 40, K.fernLit),
                    glyph('olive', -1 - 8 * t, -14 * t, 0.42, -10 + t * 30, K.fern),
                    glyph('olive', 1 + 3 * t, -18 * t, 0.42, -60, K.fern),
                    glyph('olive', 1 + 3 * t, -18 * t, 0.42, 60, K.fernLit),
                ]),
            ];
        case 'still-pond':
            return [E(0, -2.4, 11, 3.6, K.waterRim), E(0, -2.8, 9.6, 2.7, K.water), S('M-4 -2.8h4 M2 -2h3', tokens_1.plantArt.white, 0.7, { opacity: 0.7 }), S('M7 -3Q7.6 -10 9 -14', K.reed, 1.1), S('M8.4 -3Q8.2 -8 10.6 -11', K.reed, 1.1), E(9, -14.6, 0.9, 2, K.woodDark)];
        case 'dew-web': {
            const kids = [S('M-8 0L-7 -18', K.woodDark, 1.2), S('M8 0L7.4 -18', K.woodDark, 1.2)];
            for (const a of [-60, -20, 20, 60, 180])
                kids.push(S(`M0 -10L${(0, exports.f)(Math.cos((a * Math.PI) / 180) * 7.2)} ${(0, exports.f)(-10 + Math.sin((a * Math.PI) / 180) * 7.2)}`, K.web, 0.6, { opacity: 0.9 }));
            kids.push(S('M-3.4 -10a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0 M-6 -10a6 6 0 1 0 12 0a6 6 0 1 0 -12 0', K.web, 0.6, { opacity: 0.85 }));
            kids.push(C(-3, -13, 1, K.dew), C(4.4, -7.6, 1.1, K.dew), C(1.2, -16, 0.8, K.dew));
            return kids;
        }
        case 'weather-vane':
            return [shade, S('M0 0V-19', K.woodDark, 1.4), S('M-7 -19H7', K.woodDark, 1.2), P('M7 -19l-3 -2.6v5.2Z', K.gold), P('M-7 -19l-1.6 -2.8h3.4l1.4 2.8l-1.4 2.8h-3.4Z', K.gold), C(0, -19, 1.2, K.goldLit), S('M-3 -14h6', K.woodDark, 0.9)];
        case 'lantern':
            return [
                shade,
                P('M-4.6 0h9.2v-2h-9.2Z', K.woodDark),
                P('M-4 -2Q-5.4 -8 -3.4 -13h6.8Q5.4 -8 4 -2Z', K.lanternGlow),
                E(-1.4, -8, 1.3, 3.6, tokens_1.plantArt.white, { opacity: 0.55 }),
                S('M-3.4 -13V-2 M3.4 -13V-2', K.woodDark, 0.8),
                P('M-4.6 -13h9.2l-1.6 -2.6h-6Z', K.woodDark),
                S('M-2.6 -15.6Q0 -19.4 2.6 -15.6', K.woodDark, 1),
            ];
        case 'sundial':
            return [shade, P('M-3 0V-9h6V0Z', K.stone), P('M-3 0V-9h2V0Z', K.stoneLit), E(0, -10, 8.4, 2.6, K.stoneDark), E(0, -10.6, 8, 2.2, K.stoneLit), P('M-1 -10.6L5 -10.6L-1 -16Z', K.gold), fine ? S('M-6 -10.6l1 0.4 M-3 -12.2l0.6 0.6 M4 -12l-0.6 0.6', K.stoneDark, 0.6) : null].filter(Boolean);
        case 'swallow':
            return [
                shade,
                P('M-5 -7L-13 -3.4L-10 -5.6L-12.6 -1.2L-4.4 -5Z', K.swallow),
                E(0, -6.6, 6.8, 5, K.swallow),
                E(1.6, -4.8, 4.6, 3.2, K.cream),
                C(4.2, -10.4, 3.6, K.swallow),
                C(5.2, -8.4, 1.8, K.swallowThroat),
                P('M7.6 -11l2.6 0.8l-2.6 0.8Z', K.jayBlack),
                C(5.4, -11.2, 0.9, tokens_1.plantArt.ink),
                S('M-1 0.2v-1.8 M1.8 0.2v-1.8', tokens_1.plantArt.visitor.leg, 0.9),
            ];
        case 'fox':
            return [
                shade,
                P('M-8 -2Q-13 -6 -9 -11Q-7 -6 -1 -1.6Q-4 0.2 -8 -2Z', K.fox),
                P('M-11.6 -8.2Q-12.6 -10.2 -10.4 -11.6Q-10.4 -9.6 -9.6 -8.8Z', K.cream),
                P('M-4.6 0Q-6 -9 -1 -12.6Q3.6 -12 4 -4Q4.4 0 1 0Z', K.fox),
                P('M0.6 -1Q-0.2 -7 2.6 -10Q4 -5 3.4 -1Z', K.cream),
                P('M-3.2 -11.6Q-2 -17.6 3.4 -16.6Q7 -16 9.6 -13.2Q6 -11.4 1 -10.6Z', K.fox),
                P('M-2.6 -14.4L-2.4 -19.6L0.4 -16.2Z', K.foxDark),
                P('M1.4 -16.4L2.8 -20.6L4.6 -16.2Z', K.foxDark),
                P('M9.6 -13.2Q6.4 -11.8 4 -12.6Q6.6 -13 9.6 -13.2Z', K.cream),
                C(10, -13.3, 0.9, tokens_1.plantArt.ink),
                C(3.6, -14.6, 0.8, tokens_1.plantArt.ink),
            ];
        case 'cairn':
            return [shade, E(0, -2.6, 8.4, 3, K.stoneDark), E(0.6, -7.4, 6.4, 2.6, K.stone), E(-0.4, -11.6, 4.6, 2.2, K.stoneLit), E(0.3, -15.2, 2.8, 1.8, K.stone), E(-1.6, -8.2, 2.6, 0.8, K.stoneLit)];
        case 'signpost':
            return [shade, P('M-1.2 0V-20h2.4V0Z', K.woodDark), P('M-1 -18.6h9l2.6 2.4l-2.6 2.4h-9Z', K.wood), P('M1 -12.4h-9l-2.6 2.4l2.6 2.4h9Z', K.woodLit), S('M0.8 -16.2h5', K.cream, 0.9), S('M-0.8 -10h-5', K.cream, 0.9)];
        case 'roe-deer':
            return [
                shade,
                S('M-5 -6V0 M-2.6 -6V0 M4.2 -6.4V0 M6.4 -6.6V0', K.deerDark, 1.3),
                E(0.6, -8.6, 7.6, 3.8, K.deer),
                E(-6.4, -8.2, 1.9, 2.2, K.cream),
                P('M5 -10Q6 -15 8.4 -16.6L10 -15Q8.4 -12.8 8 -9Z', K.deer),
                E(9.6, -16.2, 2.8, 1.9, K.deer),
                S('M8 -18.2l-0.6 -3.4 M9.4 -18.4l0.6 -3.4', K.deerDark, 0.9),
                P('M7.4 -18.4l-1.6 -1l1.8 -0.4Z', K.deerDark),
                C(10, -16.6, 0.65, tokens_1.plantArt.ink),
                C(12.2, -15.8, 0.6, tokens_1.plantArt.ink),
            ];
        case 'mushroom-ring':
            return [
                shade,
                ...[
                    [-6.4, 0.9],
                    [0.6, 1.2],
                    [6.6, 0.8],
                ].flatMap(([x, s]) => [
                    P(`M${(0, exports.f)(x - 1.4 * s)} 0V${(0, exports.f)(-5 * s)}h${(0, exports.f)(2.8 * s)}V0Z`, K.mushroomStem),
                    P(`M${(0, exports.f)(x - 5 * s)} ${(0, exports.f)(-5 * s)}Q${(0, exports.f)(x)} ${(0, exports.f)(-12.6 * s)} ${(0, exports.f)(x + 5 * s)} ${(0, exports.f)(-5 * s)}Z`, K.mushroom),
                    C(x - 1.6 * s, -7.4 * s, 0.8 * s, K.mushroomStem),
                    C(x + 1.8 * s, -8.2 * s, 0.7 * s, K.mushroomStem),
                ]),
            ];
        case 'clear-dawn':
            return [C(0, -10, 8, K.dawn), C(0, -10, 5.4, K.goldLit), S('M-11 -1H11', K.stone, 1.4), S('M-8 1.6H8', K.stoneLit, 1.2)];
        case 'pebble-path':
            return [E(-7.6, -0.8, 3.2, 1.6, K.stone), E(-2.2, -2.6, 3.4, 1.7, K.stoneLit), E(3.2, -4.4, 3, 1.5, K.stone), E(7.6, -6.4, 2.6, 1.3, K.stoneLit), E(-7.6, -1.2, 1.4, 0.5, K.stoneLit)];
        case 'ribbon':
            return [shade, P('M-0.9 0V-13h1.8V0Z', K.woodDark), P('M-1.6 -13L-4.6 -3.4L-2.4 -4.6L-1 -2.6L0.4 -12Z', K.ribbonTail), P('M1.6 -13L4.6 -3.4L2.4 -4.6L1 -2.6L-0.4 -12Z', K.ribbon), C(0, -15, 4.6, K.ribbon), C(0, -15, 2.6, K.goldLit), C(0, -15, 1.4, K.gold)];
        default:
            return [];
    }
}
function keepsakeAt(id, x, foot, k, lod, theme) {
    return G(`keepsake-${id}`, keepsakeShape(id, lod, theme), { transform: `translate(${(0, exports.f)(x)} ${(0, exports.f)(foot)}) scale(${(0, exports.f)(k)})` });
}
function iconFrame(root) {
    const b = bounds(root);
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    const side = Math.max(h / 0.8, w / 0.9, 1);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    return `${(0, exports.f)(cx - side / 2)} ${(0, exports.f)(cy - side / 2)} ${(0, exports.f)(side)} ${(0, exports.f)(side)}`;
}
function keepsakeIcon(id, theme = 'light', style, px = 40) {
    const root = G('mascot', keepsakeShape(id, 'small', theme));
    if (style !== 'botanical')
        return { root, viewBox: iconFrame(root) };
    const inked = { ...(0, botanical_1.ink)(root, theme, 1.3, mix), id: 'mascot' };
    const viewBox = iconFrame(inked);
    const upp = Number(viewBox.split(' ')[2]) / px;
    const scale = (n) => { var _a; return (n.t === 'g' ? { ...n, children: n.children.map(scale) } : n.stroke ? { ...n, sw: (0, exports.f)(((_a = n.sw) !== null && _a !== void 0 ? _a : 1) * upp * 100) / 100 } : n); };
    return { root: scale(inked), viewBox };
}
function planterIcon(id, species, theme = 'light', style) {
    const built = buildPlant({ species, stage: 2, lod: 'small', theme, quietLook: true, drift: false, look: { planter: id }, style, px: 40, fit: true });
    return { root: built.root, viewBox: iconFrame(built.root) };
}
const GIFT_SCALE = { icon: 1.5, small: 1.75, full: 1.5 };
function mangoFruit(x, y, s, ripe, rot, lod) {
    const g = tokens_1.plantArt.gift;
    const kids = [
        S('M0 -9.5V-5', g.stalk, 1.1),
        P('M0.6 -6.2C4.6 -6.4 6.2 -1.2 5.2 3C4.2 7 -0.6 8.6 -3.6 6.2C-6.2 4 -5.4 -6 0.6 -6.2Z', ripe ? g.mangoRipe : g.mangoGreen),
    ];
    if (lod !== 'icon')
        kids.push(E(-1.8, -1.2, 1.9, 2.9, ripe ? g.mangoBlush : g.mangoGreenLit, { opacity: 0.7 }), E(2.2, -2.4, 0.9, 1.4, tokens_1.plantArt.white, { opacity: 0.35 }));
    if (ripe && lod === 'full')
        kids.push(glyph('olive', 0.4, -9.2, 0.55, 58, L.evergreen.mid));
    return G(null, kids, { transform: `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) rotate(${(0, exports.f)(rot)}) scale(${(0, exports.f)(s)})` });
}
function flourish(sp, st, A, lod, seed, can, palmCrown, trunkW) {
    const r = rng(seed + 99);
    const { cx, cy, rx, ry } = A.canopyBox;
    const g = tokens_1.plantArt.gift;
    const kids = [];
    const gs = GIFT_SCALE[lod];
    const pick = () => {
        for (let guard = 0; guard < 200; guard++) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * 0.82;
            const x = cx + Math.cos(a) * rx * d;
            const y = cy + Math.sin(a) * ry * d * 0.85;
            if (y < cy + ry * 0.55)
                return [x, y];
        }
        return [cx, cy];
    };
    const n = lod === 'full' ? 9 : 5;
    const rot = (x, y, deg, sc = 1) => `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) rotate(${(0, exports.f)(deg)})${sc !== 1 ? ` scale(${(0, exports.f)(sc)})` : ''}`;
    if (sp.flourish === 'blossom')
        for (let i = 0; i < n + 3; i++) {
            const [x, y] = pick();
            kids.push(glyph('blossom', x, y, lod === 'full' ? 1.05 : 1.5, r() * 70, g.cherryBloom, { core: g.cherryCore }));
        }
    if (sp.flourish === 'acorn')
        for (let i = 0; i < (lod === 'full' ? 10 : 7); i++) {
            const [x, y] = pick();
            kids.push(G(null, [E(0, 2.2, 3, 3.8, g.acorn), P('M-3.6 0.4Q0 -4 3.6 0.4Z', sp.bark), S('M0 -2.6v-1.6', sp.bark, 1)], { transform: rot(x, y, (r() - 0.5) * 40, gs) }));
        }
    if (sp.flourish === 'samara')
        for (let i = 0; i < (lod === 'full' ? 10 : 7); i++) {
            const [x, y] = pick();
            kids.push(G(null, [P('M0 0C-1 -3 -6 -6 -8 -4C-6 -2 -3 -1 0 0Z', g.samara), P('M0 0C1 -3 6 -6 8 -4C6 -2 3 -1 0 0Z', g.samara), C(0, 0, 1.4, L.ember.deep)], { transform: rot(x, y, (r() - 0.5) * 50, gs * 0.9) }));
        }
    if (sp.flourish === 'narra')
        for (let i = 0; i < n + 4; i++) {
            const [x, y] = pick();
            kids.push(glyph('blossom', x, y, lod === 'full' ? 0.75 : 1.2, r() * 70, g.narra, { core: g.narraCore }));
        }
    if (sp.flourish === 'mango') {
        const ripe = st === 6;
        const m = ripe ? 6 : 4;
        const hang = cy + ry * 0.36;
        const span = rx * 0.8;
        const xs = Array.from({ length: m + 2 }, (_, i) => cx - span + (2 * span * i) / (m + 1))
            .filter((x) => Math.abs(x - 100) >= trunkW * 0.5 + 7)
            .sort((a, b) => Math.abs(b - cx) - Math.abs(a - cx))
            .slice(0, m);
        for (const x0 of xs) {
            const x = x0 + (r() - 0.5) * 4;
            const y = hang + 8 + r() * 5 - (Math.abs(x - cx) / span) * ry * 0.14;
            kids.push(mangoFruit(x, y, (ripe ? 1.15 : 1) * (lod === 'full' ? 1.05 : 1.3), ripe, -12 + r() * 24, lod));
        }
    }
    if (sp.flourish === 'coconut') {
        const m = st === 6 ? 5 : 3;
        const pts = [
            [-6, 9],
            [6, 10],
            [0, 15],
            [-12, 15],
            [11, 16],
        ];
        const rr = st === 6 ? 7 : 6;
        const nut = sp.palette === L.golden ? g.coconutGolden : st === 6 ? g.coconutRipe : g.coconutGreen;
        for (let i = 0; i < m; i++) {
            const [dx, dy] = pts[i];
            const x = palmCrown.x + dx;
            const y = palmCrown.y + dy;
            kids.push(C(x, y, rr, nut), C(x - rr * 0.35, y - rr * 0.35, rr * 0.3, tokens_1.plantArt.white, { opacity: 0.25 }));
            if (lod !== 'icon')
                kids.push(C(x + rr * 0.2, y + rr * 0.35, rr * 0.16, mix(nut, tokens_1.plantArt.black, 0.35)));
        }
    }
    if (sp.flourish === 'moss')
        for (const o of A.organs.slice(0, 5))
            kids.push(glyph('blossom', o.x + 4, o.y - 3, lod === 'full' ? 1 : 1.25, r() * 60, tokens_1.plantArt.white, { core: g.mossBloomCore }));
    if (sp.flourish === 'cone' && can.pads)
        can.pads.slice(1).forEach((p, k) => {
            const cone = (x, y) => G(null, [E(0, 0, 2.8, 4.2, g.cone), S('M-2.2 -1.4h4.4M-2.4 1h4.8', g.coneLine, 0.8)], { transform: rot(x, y, p.side * 8, gs) });
            kids.push(cone(p.x + p.side * p.rx * 0.38, p.y + p.ry * 0.82 + 4));
            if (k >= can.pads.length - 3)
                kids.push(cone(p.x - p.side * p.rx * 0.2, p.y + p.ry * 0.78 + 4));
        });
    return G('blooms', kids);
}
function youngStage(ctx) {
    const { sp, st, lod, pal, fol, base, A } = ctx;
    const b = GEO[st].body;
    const by = base - b.h * 0.42 - (sp.pot === 'terracotta' ? 7 : 0);
    const bark = sp.kind === 'tree' ? sp.bark : tokens_1.plantArt.soil;
    const seedFill = sp.seedColor || mix(bark, tokens_1.plantArt.seedLight, 0.35);
    const seedPath = `M100 ${(0, exports.f)(by - b.h / 2)}C${(0, exports.f)(100 + b.w * 0.42)} ${(0, exports.f)(by - b.h / 2)} ${(0, exports.f)(100 + b.w / 2)} ${(0, exports.f)(by + b.h * 0.05)} ${(0, exports.f)(100 + b.w / 2)} ${(0, exports.f)(by + b.h * 0.18)}C${(0, exports.f)(100 + b.w / 2)} ${(0, exports.f)(by + b.h * 0.42)} ${(0, exports.f)(100 + b.w * 0.25)} ${(0, exports.f)(by + b.h / 2)} 100 ${(0, exports.f)(by + b.h / 2)}C${(0, exports.f)(100 - b.w * 0.25)} ${(0, exports.f)(by + b.h / 2)} ${(0, exports.f)(100 - b.w / 2)} ${(0, exports.f)(by + b.h * 0.42)} ${(0, exports.f)(100 - b.w / 2)} ${(0, exports.f)(by + b.h * 0.18)}C${(0, exports.f)(100 - b.w / 2)} ${(0, exports.f)(by + b.h * 0.05)} ${(0, exports.f)(100 - b.w * 0.42)} ${(0, exports.f)(by - b.h / 2)} 100 ${(0, exports.f)(by - b.h / 2)}Z`;
    const kids = [P(seedPath, seedFill)];
    const stripe = sp.kind === 'plant' ? sp.seedStripe : undefined;
    if (stripe && lod !== 'icon')
        for (const dx of [-0.26, 0.26])
            kids.push(S(`M${(0, exports.f)(100 + dx * b.w * 0.7)} ${(0, exports.f)(by - b.h * 0.4)}Q${(0, exports.f)(100 + dx * b.w * 1.05)} ${(0, exports.f)(by - b.h * 0.3)} ${(0, exports.f)(100 + dx * b.w * 1.15)} ${(0, exports.f)(by - b.h * 0.18)}`, stripe, 1.1, { opacity: 0.5 }));
    if (lod !== 'icon')
        kids.push(P(`M${(0, exports.f)(100 - b.w * 0.34)} ${(0, exports.f)(by - b.h * 0.12)}C${(0, exports.f)(100 - b.w * 0.3)} ${(0, exports.f)(by - b.h * 0.36)} ${(0, exports.f)(100 - b.w * 0.1)} ${(0, exports.f)(by - b.h * 0.44)} ${(0, exports.f)(100 + b.w * 0.02)} ${(0, exports.f)(by - b.h * 0.42)}C${(0, exports.f)(100 - b.w * 0.2)} ${(0, exports.f)(by - b.h * 0.3)} ${(0, exports.f)(100 - b.w * 0.28)} ${(0, exports.f)(by - b.h * 0.2)} ${(0, exports.f)(100 - b.w * 0.34)} ${(0, exports.f)(by - b.h * 0.12)}Z`, tokens_1.plantArt.white, { opacity: 0.28 }));
    const body = [];
    const leafPal = fol || pal;
    if (st === 1) {
        kids.push(G('sprout', [S(`M100 ${(0, exports.f)(by - b.h / 2 + 1)}q-1 -6 3 -9`, leafPal.deep, 2.2), glyph('lens', 103, by - b.h / 2 - 7.5, 0.62, 52, leafPal.mid)]));
        A.crown = { x: 100, y: by - b.h / 2 - 1 };
    }
    else {
        const top = GEO[st].stemTop;
        const leaf = (dir) => [
            P(`M100 ${top + 4}C${100 + dir * 4} ${top - 8} ${100 + dir * 18} ${top - 10} ${100 + dir * 24} ${top - 4}C${100 + dir * 18} ${top + 6} ${100 + dir * 6} ${top + 8} 100 ${top + 4}Z`, dir < 0 ? leafPal.mid : leafPal.light),
            lod === 'full' ? S(`M${100 + dir * 3} ${top + 3}Q${100 + dir * 12} ${top - 3} ${100 + dir * 20} ${top - 4}`, leafPal.deep, 0.9, { opacity: 0.6 }) : null,
        ];
        body.push(G('stem', [S(`M100 ${(0, exports.f)(by - b.h / 2 + 2)}C99 ${(0, exports.f)(by - b.h / 2 - 12)} 102 ${top + 16} 100 ${top + 3}`, leafPal.deep, 3.2)]));
        body.push(G('leaves', [...leaf(-1), ...leaf(1)]));
        if (lod !== 'icon')
            kids.push(S(`M95 ${(0, exports.f)(by - b.h / 2 + 2.5)}l3 3l2.5 -2.5l3 3`, mix(seedFill, tokens_1.plantArt.black, 0.3), 1.1));
        A.crown = { x: 100, y: top - 9 };
    }
    body.unshift(G('trunk', kids));
    A.neck = { x: 100, y: by - b.h * 0.28, w: b.w * 0.82 };
    A.perch = { x: 100 - b.w * 0.95, y: base + 1 };
    A.branchR = { x: 100 + b.w * 0.9, y: by - b.h * 0.3 };
    A.branchL = { x: 100 - b.w * 0.9, y: by - b.h * 0.3 };
    A.canopyBox = st === 1 ? { cx: 100, cy: by, rx: b.w * 0.7, ry: b.h * 0.6 } : { cx: 100, cy: (GEO[st].stemTop + by) / 2, rx: 26, ry: (by - GEO[st].stemTop) / 2 + 8 };
    A.drift = A.crown;
    const patch = sp.kind === 'plant' && sp.seedPatch ? mix(seedFill, tokens_1.plantArt.facePatch, 0.55) : null;
    return { body, faceSpec: { x: 100, y: by + b.h * 0.08, w: b.w, patch, patchK: 0.78 } };
}
function treeBody(ctx, sp) {
    var _a;
    const { st, lod, pal, base, A, seed, sc, showFace, key } = ctx;
    const geo = GEO[st];
    const t = geo.trunk;
    const custom = 'custom' in sp.canopy ? sp.canopy.custom : null;
    const isPine = custom === 'tiers';
    const isPalm = custom === 'palm';
    const isBonsai = custom === 'bonsai';
    const lean = isPine ? 2 + st * 0.5 : isPalm ? 4 + st * 2 : 0;
    let wb = t.wb * (sp.trunkW || 1);
    let wt = t.wt * (sp.trunkW || 1);
    if (isPalm) {
        wb = t.wb * 0.8;
        wt = t.wt * 0.6;
    }
    const palmCrown = { x: 100 + lean, y: { 3: 112, 4: 94, 5: 78, 6: 68 }[st] };
    const top = isPalm ? palmCrown.y + 4 : isPine ? geo.canopy.cy - geo.canopy.ry * 0.7 + 8 : t.top;
    if (isPine) {
        wt *= st === 3 ? 0.7 : 0.55;
        if (st >= 4)
            wb *= 0.84;
    }
    const flare = (_a = sp.flare) !== null && _a !== void 0 ? _a : 0.35;
    const tk = [];
    let trunkTop = { x: 100 + lean, y: top };
    if (isBonsai) {
        const k = st / 5;
        tk.push(P(trunkPath({ wb: wb * 1.05, wt: wb * 0.8, top: base - 12, base, flare: 0.3 }), sp.bark));
        tk.push(P(limb(100, base - 6, 88, base - 26 * k - 6, wb * 0.82, wb * 0.66, -5), sp.bark));
        tk.push(P(limb(88, base - 26 * k - 6, 104, base - 52 * k - 10, wb * 0.66, wt * 0.8, 7), sp.bark));
        trunkTop = { x: 104, y: base - 52 * k - 10 };
    }
    else {
        const tp = { wb, wt, top, base, lean, twist: 0, flare };
        tk.push(P(trunkPath(tp), sp.bark));
        if (lod !== 'icon')
            tk.push(P(trunkPath({ ...tp, top: top + 4, band: [0.38, 0.92] }), tokens_1.plantArt.black, { opacity: 0.12 }), P(trunkPath({ ...tp, top: top + 4, band: [-0.86, -0.4] }), tokens_1.plantArt.white, { opacity: 0.13 }));
    }
    const wAt = (y) => lerp(wt, wb, (y - top) / (base - top));
    let fy = geo.faceY + (base - 170);
    if (isPalm)
        fy = base - 24;
    const fw = isBonsai ? wb * 0.82 : wAt(fy);
    let fx = 100 + lean * ((base - fy) / (base - top)) * 0.55;
    if (isBonsai) {
        fy = base - 25;
        fx = 95;
    }
    if (showFace)
        tk.push(E(fx, fy + 3, Math.min(fw * 0.5, 24), Math.min(fw * 0.4, 18), mix(sp.bark, tokens_1.plantArt.facePatch, 0.35)));
    if (lod === 'full') {
        const dk = mix(sp.bark, tokens_1.plantArt.black, 0.3);
        if (isPalm) {
            for (let y = base - 34; y > top + 6; y -= 9) {
                const xx = 100 + lean * ((base - y) / (base - top));
                const w2 = wAt(y) / 2;
                tk.push(S(`M${(0, exports.f)(xx - w2 + 1)} ${(0, exports.f)(y)}Q${(0, exports.f)(xx)} ${(0, exports.f)(y + 2.5)} ${(0, exports.f)(xx + w2 - 1)} ${(0, exports.f)(y)}`, dk, 1.1, { opacity: 0.55 }));
            }
        }
        else if (!isBonsai) {
            tk.push(S(`M${(0, exports.f)(fx - fw * 0.28)} ${(0, exports.f)(top + 10)}q2 5 0 9`, dk, 1.1, { opacity: 0.6 }));
            tk.push(S(`M${(0, exports.f)(fx + fw * 0.3)} ${(0, exports.f)(fy - 16)}q-2 4 0 8`, dk, 1.1, { opacity: 0.5 }));
            if (key === 'cherry-blossom')
                for (let k = 0; k < 3; k++)
                    tk.push(S(`M${(0, exports.f)(fx - 4)} ${(0, exports.f)(top + 6 + k * 7)}h8`, dk, 1, { opacity: 0.45 }));
            if (st === 6)
                tk.push(E(fx - fw * 0.3, base - 9, 2.4, 3, dk, { opacity: 0.55 }));
        }
    }
    const br = [];
    if (!custom && geo.branches) {
        const cyTop = geo.canopy.cy;
        br.push(P(limb(100 - wt * 0.2, top + 8, 100 - geo.canopy.rx * 0.42, cyTop + 8, wt * 0.55, 4, -4), sp.bark));
        br.push(P(limb(100 + wt * 0.2, top + 6, 100 + geo.canopy.rx * 0.46, cyTop + 2, wt * 0.55, 4, 4), sp.bark));
        if (geo.branches >= 3)
            br.push(P(limb(100, top + 4, 104, cyTop - 10, wt * 0.6, 4, 2), sp.bark));
    }
    else if (st === 3 && !custom) {
        br.push(P(limb(100, top + 4, 100, top - 14, wt * 0.8, 6, 0), sp.bark));
    }
    const roots = [];
    if (geo.roots && !isBonsai && !isPalm) {
        const nr = geo.roots + (flare > 0.45 ? 2 : 0);
        for (let i = 0; i < nr; i++) {
            const side = i % 2 ? 1 : -1;
            const k2 = Math.floor(i / 2);
            const x0 = 100 + side * (wb * 0.3 + k2 * 4);
            const x1 = 100 + side * (wb * 0.78 + 10 + k2 * 7);
            roots.push(P(limb(x0, base - 4, x1, base + 1.5 + k2, 8 - k2 * 2, 1.5, side * 2), mix(sp.bark, tokens_1.plantArt.black, 0.12)));
        }
    }
    let can;
    if (isPine)
        can = tiersCanopy(sp.bark, st, pal, seed, lod, sc, lean);
    else if (isBonsai)
        can = bonsaiCanopy(sp.bark, st, pal, seed, lod, sc, trunkTop);
    else if (isPalm)
        can = palmCanopy(st, pal, lod, sc, palmCrown);
    else
        can = cloudCanopy(sp.canopy, st, pal, seed, lod, sc);
    A.canopyBox = can.box;
    A.organs = can.organs;
    const marks = [];
    if (lod !== 'icon' && !custom) {
        const r = rng(seed + 31);
        const n = Math.round({ 3: 3, 4: 5, 5: 7, 6: 8 }[st] * (lod === 'full' ? 1 : 0.5));
        const { cx, cy, rx, ry } = can.box;
        for (let i = 0; i < n; i++) {
            const a = -Math.PI * (0.1 + r() * 0.8);
            const d = 0.45 + r() * 0.42;
            const x = cx + Math.cos(a) * rx * d;
            const y = cy + Math.sin(a) * ry * d + ry * 0.15;
            if (sp.leaf === 'blossom') {
                marks.push(glyph('blossom', x, y, 0.85, r() * 70, pal.hi, { core: pal.deep }));
                continue;
            }
            marks.push(glyph(sp.leaf, x, y, sp.leaf === 'maple' ? 0.85 : 0.68, (r() - 0.5) * 70, pal.hi, { opacity: 0.95 }));
        }
    }
    if (lod === 'full' && isPine && can.pads)
        can.pads.forEach((p) => marks.push(glyph('pine', p.x - p.rx * 0.45, p.y - p.ry * 0.1, 0.7, -20, pal.hi), glyph('pine', p.x + p.rx * 0.35, p.y - p.ry * 0.25, 0.6, 15, pal.hi)));
    const { cx, cy, rx, ry } = can.box;
    const neckY = isPalm ? fy - 18 : isBonsai ? fy - 14 : Math.max(top + 6, cy + ry * 0.78);
    A.neck = { x: isBonsai ? 92 : 100 + lean * ((base - neckY) / (base - top)) * 0.55, y: neckY, w: isBonsai ? wb * 0.72 : wAt(neckY) };
    if (isPine && can.pads) {
        const lp = can.pads[can.pads.length - 1];
        A.neck.y = Math.max(lp.y + lp.ry + 3, A.neck.y);
        A.neck.w = wAt(A.neck.y);
    }
    A.crown = isPine && can.pads ? { x: can.pads[0].x, y: can.pads[0].y - can.pads[0].ry * 0.9 } : isPalm ? { x: palmCrown.x, y: palmCrown.y - 6 } : { x: cx + 4, y: cy - ry * 0.97 };
    if (isBonsai) {
        const top0 = can.organs[2] || { x: 108, y: cy - ry };
        A.crown = { x: top0.x, y: top0.y - 12 };
    }
    A.branchR = isPalm ? { x: palmCrown.x + 16, y: palmCrown.y + 8 } : { x: cx + rx * 0.6, y: cy + ry * 0.62 };
    A.branchL = isPalm ? { x: palmCrown.x - 16, y: palmCrown.y + 8 } : { x: cx - rx * 0.58, y: cy + ry * 0.62 };
    A.perch = isPine && can.pads ? { x: can.pads[1].x - 4, y: can.pads[1].y - can.pads[1].ry * 0.7 } : { x: cx - rx * 0.52, y: cy - ry * 0.74 };
    if (isPalm)
        A.perch = { x: palmCrown.x - 4, y: palmCrown.y - 4 };
    if (isBonsai)
        A.perch = { x: (can.organs[0] || { x: 60 }).x + 4, y: (can.organs[0] || { y: 120 }).y - 6 };
    A.drift = { x: cx + rx * 0.7, y: cy + ry * 0.4 };
    const body = [G('trunk', tk), G('branches', br), ...can.layers, G('leaves', marks)];
    if (st === 6 || (st === 5 && sp.fruitFrom === 5))
        body.push(flourish(sp, st, A, lod, seed, can, palmCrown, wb));
    return { body, behind: [G('roots', roots)], faceSpec: showFace ? { x: fx, y: fy, w: fw * 1.22 } : null };
}
function leafBlade(x, y, len, wid, ang, pal, lod, id = null) {
    const lit = `M0 0Q${(0, exports.f)(-wid * 1.9)} ${(0, exports.f)(-len * 0.48)} 0 ${(0, exports.f)(-len)}Z`;
    const shade = `M0 0Q${(0, exports.f)(wid * 1.9)} ${(0, exports.f)(-len * 0.48)} 0 ${(0, exports.f)(-len)}Z`;
    const up = ang > 0;
    const kids = [P(up ? shade : lit, pal.mid), P(up ? lit : shade, pal.light)];
    if (lod === 'full')
        kids.push(S(`M0 0L0 ${(0, exports.f)(-len * 0.86)}`, pal.deep, 0.9, { opacity: 0.55 }));
    return G(id, kids, { transform: `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) rotate(${(0, exports.f)(ang)})` });
}
const tipOf = (x, y, len, ang) => ({ x: x + Math.sin((ang * Math.PI) / 180) * len, y: y - Math.cos((ang * Math.PI) / 180) * len });
const at = (x, y, len, ang, t) => ({ x: x + Math.sin((ang * Math.PI) / 180) * len * t, y: y - Math.cos((ang * Math.PI) / 180) * len * t });
function mound(cx, cy, rx, ry, pal, seed, lod, n = 11) {
    const kids = [
        P(scallop({ cx, cy, rx, ry, n, seed, jit: 0.3, bulge: 0.6, flat: 0.55 }), pal.deep),
        P(scallop({ cx: cx - rx * 0.04, cy: cy - ry * 0.1, rx: rx * 0.92, ry: ry * 0.82, n, seed, jit: 0.3, bulge: 0.6, flat: 0.55 }), pal.mid),
    ];
    if (lod !== 'icon')
        kids.push(P(scallop({ cx: cx - rx * 0.36, cy: cy - ry * 0.42, rx: rx * 0.36, ry: ry * 0.3, n: 6, seed: seed + 4, jit: 0.3, bulge: 0.6 }), pal.light));
    return kids;
}
const MOUND = { 3: [23, 14], 4: [34, 23], 5: [42, 28], 6: [50, 32] };
const arcPos = (cx, cy, rx, ry, i) => {
    const th = ((200 + i * 35) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) };
};
const PLANTS = {
    sunflower(ctx, sp) {
        const { st, lod, base, A, sc } = ctx;
        const pal = sp.palette;
        const fol = sp.foliage;
        const SF = tokens_1.plantArt.sunflower;
        const topY = { 3: 114, 4: 82, 5: 70, 6: 62 }[st];
        const hx = 100 + (st >= 5 ? 4 : 2);
        const hy = topY;
        const sw = { 3: 4, 4: 5, 5: 5.5, 6: 6.5 }[st];
        const stemX = (y) => lerp(100, hx, (base - y) / (base - hy));
        const body = [
            G('stem', [
                S(`M100 ${base}C99 ${(0, exports.f)(base - (base - hy) * 0.4)} ${(0, exports.f)(hx + 3)} ${(0, exports.f)(hy + (base - hy) * 0.4)} ${(0, exports.f)(hx)} ${(0, exports.f)(hy)}`, fol.deep, sw),
                S(`M99.4 ${base - 2}C98.6 ${(0, exports.f)(base - (base - hy) * 0.4)} ${(0, exports.f)(hx + 2)} ${(0, exports.f)(hy + (base - hy) * 0.4)} ${(0, exports.f)(hx - 0.6)} ${(0, exports.f)(hy + 6)}`, fol.mid, sw * 0.4),
            ]),
        ];
        const leaves = [];
        const tips = [];
        if (st === 3) {
            [
                [-1, 0.18, 21],
                [1, 0.2, 21],
                [-1, 0.46, 16],
                [1, 0.48, 16],
            ].forEach(([side, tt, len]) => {
                const y = base - (base - hy) * tt;
                leaves.push(leafBlade(stemX(y), y, len, len * 0.48, side * 60, fol, lod));
            });
        }
        else {
            for (let i = 0; i < 5; i++) {
                const side = i % 2 ? 1 : -1;
                const y = base - (base - hy) * (0.1 + i * 0.15);
                const len = (19 + st * 2.4) * sc[i] * (1 - i * 0.05);
                const ang = side * (60 - i * 2);
                leaves.push(leafBlade(stemX(y), y, len, len * 0.5, ang, fol, lod, `domain-${i + 1}`));
                A.organs.push(at(stemX(y), y, len, ang, 0.55));
                tips.push(tipOf(stemX(y), y, len, ang));
            }
        }
        body.push(G('leaves', leaves));
        const head = [];
        let Rt;
        let faceSpec;
        if (st <= 4) {
            const r = st === 3 ? 12 : 17;
            Rt = r + 3;
            if (st === 4)
                for (let i = 0; i < 14; i++)
                    head.push(P('M0 0C-3 -3 -2.2 -7 0 -8.5C2.2 -7 3 -3 0 0Z', i % 2 ? pal.light : pal.mid, { transform: `translate(${(0, exports.f)(hx)} ${(0, exports.f)(hy)}) rotate(${(0, exports.f)(i * (360 / 14))}) translate(0 ${(0, exports.f)(-r + 1)})` }));
            const nS = st === 3 ? 6 : 9;
            for (let i = 0; i < nS; i++)
                head.push(P(`M0 0C-7 -2 -6.5 ${(0, exports.f)(-r * 0.8)} 0 ${(0, exports.f)(-r - 1.5)}C6.5 ${(0, exports.f)(-r * 0.8)} 7 -2 0 0Z`, fol.deep, { transform: `translate(${(0, exports.f)(hx)} ${(0, exports.f)(hy)}) rotate(${(0, exports.f)((i / nS) * 360 + 20)})` }));
            head.push(C(hx, hy, r * 0.92, fol.mid), E(hx - r * 0.3, hy - r * 0.35, r * 0.42, r * 0.32, fol.light, { opacity: 0.8 }));
            faceSpec = { x: hx, y: hy + 1, w: r * 2 };
        }
        else {
            const r = st === 5 ? 17 : 22;
            const pl = st === 5 ? 15 : 18;
            const np = st === 5 ? 16 : 20;
            Rt = r + pl;
            const petal = (Lp, Wp) => `M0 0C${(0, exports.f)(-Wp)} ${(0, exports.f)(-Lp * 0.35)} ${(0, exports.f)(-Wp * 0.5)} ${(0, exports.f)(-Lp * 0.9)} 0 ${(0, exports.f)(-Lp)}C${(0, exports.f)(Wp * 0.5)} ${(0, exports.f)(-Lp * 0.9)} ${(0, exports.f)(Wp)} ${(0, exports.f)(-Lp * 0.35)} 0 0Z`;
            const hd = [];
            for (let i = 0; i < np; i++)
                hd.push(P(petal(pl * 0.95, 6.5), pal.mid, { transform: `rotate(${(0, exports.f)((i + 0.5) * (360 / np))}) translate(0 ${(0, exports.f)(-r + 2)})` }));
            for (let i = 0; i < np; i++)
                hd.push(P(petal(pl, 6.2), i % 3 === 0 ? pal.hi : pal.light, { transform: `rotate(${(0, exports.f)(i * (360 / np))}) translate(0 ${(0, exports.f)(-r + 1)})` }));
            hd.push(C(0, 0, r, SF.disc), C(0, 0, r * 0.8, SF.discMid), C(-r * 0.12, -r * 0.14, r * 0.55, SF.discLit));
            if (st === 6 && lod !== 'icon')
                for (let k = 0; k < 44; k++) {
                    const a = k * 2.39996;
                    const rr = r * (0.84 + (0.12 * ((k * 7) % 11)) / 11);
                    hd.push(C(Math.cos(a) * rr, Math.sin(a) * rr, 1, SF.seeds));
                }
            head.push(G('head', hd, { transform: `translate(${(0, exports.f)(hx)} ${(0, exports.f)(hy)})${st === 6 ? ' rotate(-6)' : ''}` }));
            if (st === 6) {
                for (const side of [-1, 1]) {
                    const y0 = base - (base - hy) * 0.55;
                    const bx = hx + side * 30;
                    const by = y0 - 18;
                    body.push(S(`M${(0, exports.f)(stemX(y0))} ${(0, exports.f)(y0)}Q${(0, exports.f)(stemX(y0) + side * 18)} ${(0, exports.f)(y0 - 2)} ${(0, exports.f)(bx)} ${(0, exports.f)(by)}`, fol.deep, 2.4));
                    const sm = [];
                    for (let i = 0; i < 12; i++)
                        sm.push(P(petal(7.5, 3.4), pal.light, { transform: `rotate(${i * 30}) translate(0 -5)` }));
                    sm.push(C(0, 0, 5.4, SF.sideDisc));
                    head.unshift(G(null, sm, { transform: `translate(${(0, exports.f)(bx)} ${(0, exports.f)(by)})` }));
                }
            }
            faceSpec = { x: hx, y: hy + 1, w: r * 1.9 };
        }
        body.push(G('flower', head));
        A.crown = { x: hx, y: hy - Rt - 1 };
        A.neck = { x: hx, y: hy + Rt * (st >= 5 ? 0.62 : 1) + 5, w: sw + 2 };
        const t3 = tips[2] || { x: 78, y: base - 20 };
        const t4 = tips[3] || { x: 122, y: base - 30 };
        const t5 = tips[4] || t3;
        A.perch = { x: t3.x + 4, y: t3.y + 2 };
        A.branchR = { x: t4.x - 3, y: t4.y + 2 };
        A.branchL = { x: t5.x + 3, y: t5.y + 2 };
        A.canopyBox = { cx: hx, cy: hy, rx: Rt + 4, ry: Rt };
        A.drift = { x: hx + Rt * 0.5, y: hy + Rt * 0.4 };
        return { body, faceSpec };
    },
    lotus(ctx, sp) {
        const { st, lod, base, A, sc } = ctx;
        const pal = sp.palette;
        const fol = sp.foliage;
        const LT = tokens_1.plantArt.lotus;
        const wy = base - 1;
        const floatPad = (x, w, id = null) => G(id, [
            E(x, wy, w, w * 0.27, fol.deep),
            E(x - w * 0.06, wy - w * 0.05, w * 0.9, w * 0.2, fol.mid),
            lod !== 'icon' ? P(`M${(0, exports.f)(x)} ${(0, exports.f)(wy - w * 0.04)}L${(0, exports.f)(x + w * 0.85)} ${(0, exports.f)(wy - w * 0.12)}L${(0, exports.f)(x + w * 0.8)} ${(0, exports.f)(wy + w * 0.06)}Z`, fol.deep) : null,
            lod === 'full' ? E(x - w * 0.35, wy - w * 0.1, w * 0.3, w * 0.07, fol.light) : null,
        ]);
        const standPad = (x0, x, y, w, id = null) => G(id, [
            S(`M${(0, exports.f)(x0)} ${(0, exports.f)(wy)}Q${(0, exports.f)(x0)} ${(0, exports.f)((wy + y) / 2)} ${(0, exports.f)(x)} ${(0, exports.f)(y + 2)}`, fol.deep, lod === 'icon' ? 5 : 2.2),
            P(`M${(0, exports.f)(x - w)} ${(0, exports.f)(y)}Q${(0, exports.f)(x)} ${(0, exports.f)(y + w * 0.62)} ${(0, exports.f)(x + w)} ${(0, exports.f)(y)}Z`, fol.deep),
            E(x, y - 0.4, w, w * 0.26, fol.mid),
            lod !== 'icon' ? E(x - w * 0.3, y - w * 0.08, w * 0.42, w * 0.1, fol.light) : null,
        ]);
        const bud = (x, y, s) => G(null, [
            P(`M${(0, exports.f)(x)} ${(0, exports.f)(y + s * 0.55)}C${(0, exports.f)(x - s * 0.8)} ${(0, exports.f)(y + s * 0.3)} ${(0, exports.f)(x - s * 0.62)} ${(0, exports.f)(y - s * 0.5)} ${(0, exports.f)(x)} ${(0, exports.f)(y - s * 1.05)}C${(0, exports.f)(x + s * 0.62)} ${(0, exports.f)(y - s * 0.5)} ${(0, exports.f)(x + s * 0.8)} ${(0, exports.f)(y + s * 0.3)} ${(0, exports.f)(x)} ${(0, exports.f)(y + s * 0.55)}Z`, pal.mid),
            P(`M${(0, exports.f)(x - s * 0.1)} ${(0, exports.f)(y + s * 0.55)}C${(0, exports.f)(x - s * 0.66)} ${(0, exports.f)(y + s * 0.25)} ${(0, exports.f)(x - s * 0.5)} ${(0, exports.f)(y - s * 0.45)} ${(0, exports.f)(x - s * 0.05)} ${(0, exports.f)(y - s * 0.92)}C${(0, exports.f)(x + s * 0.1)} ${(0, exports.f)(y - s * 0.4)} ${(0, exports.f)(x + s * 0.12)} ${(0, exports.f)(y + s * 0.2)} ${(0, exports.f)(x - s * 0.1)} ${(0, exports.f)(y + s * 0.55)}Z`, pal.light),
            P(`M${(0, exports.f)(x)} ${(0, exports.f)(y - s * 0.78)}C${(0, exports.f)(x - s * 0.12)} ${(0, exports.f)(y - s * 0.9)} ${(0, exports.f)(x - s * 0.06)} ${(0, exports.f)(y - s)} ${(0, exports.f)(x)} ${(0, exports.f)(y - s * 1.05)}C${(0, exports.f)(x + s * 0.1)} ${(0, exports.f)(y - s * 0.95)} ${(0, exports.f)(x + s * 0.14)} ${(0, exports.f)(y - s * 0.86)} ${(0, exports.f)(x)} ${(0, exports.f)(y - s * 0.78)}Z`, pal.deep),
            P(`M${(0, exports.f)(x - s * 0.42)} ${(0, exports.f)(y + s * 0.42)}Q${(0, exports.f)(x)} ${(0, exports.f)(y + s * 0.2)} ${(0, exports.f)(x + s * 0.42)} ${(0, exports.f)(y + s * 0.42)}L${(0, exports.f)(x)} ${(0, exports.f)(y + s * 0.68)}Z`, fol.mid),
        ]);
        const petal = (h, w) => `M0 0C${(0, exports.f)(-w)} ${(0, exports.f)(-h * 0.3)} ${(0, exports.f)(-w * 0.62)} ${(0, exports.f)(-h * 0.88)} 0 ${(0, exports.f)(-h)}C${(0, exports.f)(w * 0.62)} ${(0, exports.f)(-h * 0.88)} ${(0, exports.f)(w)} ${(0, exports.f)(-h * 0.3)} 0 0Z`;
        const flower = (x, y, h) => {
            const w = h * 0.42;
            const tr = (a) => `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)}) rotate(${a})`;
            const k = [];
            for (const a of [-74, 74])
                k.push(P(petal(h * 0.8, w * 0.9), pal.deep, { transform: tr(a) }));
            for (const a of [-50, -24, 24, 50])
                k.push(P(petal(h * 0.95, w), pal.mid, { transform: tr(a) }));
            k.push(E(x, y - h * 0.58, w * 0.95, h * 0.09, LT.stamen), lod !== 'icon' ? E(x, y - h * 0.62, w * 0.62, h * 0.05, LT.stamenDeep) : null);
            for (const a of [-30, 30])
                k.push(P(petal(h * 0.82, w * 0.95), pal.light, { transform: tr(a) }));
            k.push(P(petal(h * 0.86, w * 1.15), pal.hi, { transform: `translate(${(0, exports.f)(x)} ${(0, exports.f)(y)})` }));
            if (lod === 'full')
                k.push(S(`M${(0, exports.f)(x)} ${(0, exports.f)(y - 2)}V${(0, exports.f)(y - h * 0.3)}`, pal.light, 0.8, { opacity: 0.8 }));
            k.push(P(`M${(0, exports.f)(x - w * 0.6)} ${(0, exports.f)(y - 1)}Q${(0, exports.f)(x)} ${(0, exports.f)(y + h * 0.12)} ${(0, exports.f)(x + w * 0.6)} ${(0, exports.f)(y - 1)}Z`, fol.mid));
            return G('flower', k);
        };
        const body = [];
        const behind = [];
        let faceSpec;
        if (lod === 'icon' && st >= 4) {
            const h = st === 4 ? 40 : 52;
            const top = wy - 14;
            behind.push(floatPad(70, 18), floatPad(130, 18));
            if (st === 4)
                body.push(G('flower', [bud(100, top - 10, 24)]));
            else
                body.push(flower(100, top, h));
            A.canopyBox = { cx: 100, cy: top - h * 0.5, rx: h * 0.9, ry: h * 0.6 };
            A.crown = { x: 100, y: top - h };
            A.neck = { x: 100, y: top, w: 6 };
            A.drift = { x: 120, y: top - 20 };
            return { body, behind, faceSpec: null };
        }
        if (st === 3) {
            behind.push(floatPad(126, 13), standPad(84, 78, wy - 30, 15));
            body.push(floatPad(70, 15));
            const top = wy - 50;
            body.push(S(`M102 ${wy}Q104 ${(0, exports.f)(wy - 20)} 100 ${(0, exports.f)(top + 6)}`, fol.deep, lod === 'icon' ? 5 : 2.4));
            body.push(G('flower', [bud(100, top, 12)]));
            faceSpec = { x: 100, y: top - 2, w: 18 };
            A.canopyBox = { cx: 100, cy: top - 4, rx: 30, ry: 22 };
        }
        else {
            const k = st / 5;
            const P1 = { x: 66, w: 15 * k * sc[0] + 4 };
            const P2 = { x0: 82, x: 74, y: wy - 32 * k - 6, w: 15 * k * sc[1] + 3 };
            const P3 = { x: 136, w: 13 * k * sc[2] + 3 };
            const P4 = { x0: 118, x: 126, y: wy - 48 * k - 8, w: 16 * k * sc[3] + 3 };
            const P5 = { x: 116, w: 10 * k * sc[4] + 3 };
            behind.push(floatPad(P3.x, P3.w, 'domain-3'), standPad(P4.x0, P4.x, P4.y, P4.w, 'domain-4'), standPad(P2.x0, P2.x, P2.y, P2.w, 'domain-2'));
            body.push(floatPad(P1.x, P1.w, 'domain-1'));
            A.organs.push({ x: P1.x, y: wy }, { x: P2.x, y: P2.y }, { x: P3.x, y: wy }, { x: P4.x, y: P4.y }, { x: P5.x, y: wy });
            const top = { 4: 96, 5: 104, 6: 100 }[st];
            body.push(S(`M101 ${wy}Q104 ${(0, exports.f)((wy + top) / 2)} 100 ${(0, exports.f)(top + 2)}`, fol.deep, lod === 'icon' ? 6 : 2.8));
            if (st === 6) {
                body.unshift(S(`M110 ${wy}Q114 ${(0, exports.f)(wy - 30)} 134 ${(0, exports.f)(wy - 58)}`, fol.deep, 2.2), G('pod', [P(`M125 ${(0, exports.f)(wy - 60)}h18l-3 9h-12Z`, LT.pod), E(134, wy - 60, 9, 2.6, LT.podTop), lod !== 'icon' ? G(null, [C(130, wy - 60, 1, LT.podSeed), C(134, wy - 60.4, 1, LT.podSeed), C(138, wy - 60, 1, LT.podSeed)]) : null]));
                body.unshift(S(`M90 ${wy}Q86 ${(0, exports.f)(wy - 18)} 70 ${(0, exports.f)(wy - 34)}`, fol.deep, 1.8), bud(70, wy - 38, 8));
            }
            if (st === 4) {
                body.push(G('flower', [bud(100, top - 4, 19)]));
                faceSpec = { x: 100, y: top - 6, w: 24 };
                A.canopyBox = { cx: 100, cy: top - 10, rx: 30, ry: 26 };
            }
            else {
                const h = st === 5 ? 40 : 46;
                body.push(flower(100, top, h));
                faceSpec = { x: 100, y: top - h * 0.36, w: 22 };
                A.canopyBox = { cx: 100, cy: top - h * 0.5, rx: h * 0.9, ry: h * 0.6 };
            }
            body.push(floatPad(P5.x, P5.w, 'domain-5'));
            A.branchL = { x: P2.x - P2.w * 0.7, y: P2.y };
            A.branchR = { x: P4.x + P4.w * 0.7, y: P4.y };
            A.perch = { x: P2.x - 2, y: P2.y - 2 };
        }
        const cb = A.canopyBox;
        A.crown = { x: 100, y: cb.cy - cb.ry - 2 };
        A.neck = { x: 100, y: cb.cy + cb.ry * 0.8, w: 6 };
        A.perch = A.perch || { x: 72, y: wy - 32 };
        A.branchL = A.branchL || { x: 66, y: wy - 30 };
        A.branchR = A.branchR || { x: 130, y: wy - 20 };
        A.drift = { x: cb.cx + cb.rx * 0.5, y: wy - 46 };
        return { body, behind, faceSpec };
    },
    sampaguita(ctx, sp) {
        const { st, lod, base, A, sc, seed } = ctx;
        const pal = sp.palette;
        const fol = sp.foliage;
        const [rx, ry] = MOUND[st];
        const my = base - ry * 0.5;
        const body = [];
        const front = [];
        if (lod === 'icon' && st >= 3) {
            const iy = base - ry * 0.7;
            body.push(G('mound', mound(100, iy, rx * 0.9, ry * 1.3, fol, seed, lod, 10)));
            for (const [dx, dy, s] of [
                [-0.42, -0.62, 2],
                [0, -1.05, 2.3],
                [0.42, -0.62, 2],
            ])
                body.push(glyph('star', 100 + rx * dx, iy + ry * 1.3 * dy, s, 0, pal.light, { edge: pal.deep }));
            A.canopyBox = { cx: 100, cy: iy - ry * 0.5, rx: rx + 4, ry: ry * 1.3 + 4 };
            A.crown = { x: 100, y: iy - ry * 1.4 };
            A.neck = { x: 100, y: iy, w: rx };
            A.drift = { x: 100 + rx * 0.7, y: iy };
            return { body, faceSpec: null };
        }
        body.push(G('mound', mound(100, my, rx, ry, fol, seed, lod, 12)));
        if (lod !== 'icon') {
            const r = rng(seed + 9);
            for (let i = 0; i < 4 + st; i++) {
                const a = -Math.PI * (0.08 + r() * 0.84);
                body.push(glyph('banyan', 100 + Math.cos(a) * rx * 0.86, my + Math.sin(a) * ry * 0.78 + 5, 0.6, (r() - 0.5) * 90, fol.light, { opacity: 0.9 }));
            }
        }
        const pearl = (x, y, s) => G(null, [E(x, y, 2.3 * s, 3.2 * s, pal.light, { stroke: pal.deep, sw: 0.6 }), E(x - 0.7 * s, y - 1 * s, 0.8 * s, 1.1 * s, tokens_1.plantArt.white, { opacity: 0.9 })]);
        if (st >= 4) {
            for (let i = 0; i < 5; i++) {
                const p = arcPos(100, my, rx * 0.9, ry * 0.92, i);
                const s = sc[i] * (st === 6 ? 1.15 : 1);
                const k = [];
                if (st === 4)
                    k.push(pearl(p.x - 3.5 * s, p.y + 1, s), pearl(p.x + 3.5 * s, p.y + 0.5, s), pearl(p.x, p.y - 3.5 * s, s));
                else {
                    k.push(pearl(p.x + 6 * s, p.y - 2 * s, s * 0.9), pearl(p.x - 6 * s, p.y + 1 * s, s * 0.85));
                    if (st === 6)
                        k.push(glyph('star', p.x - 4 * s, p.y - 4 * s, 1.0 * s, 15, pal.light, { edge: pal.deep }));
                    k.push(glyph('star', p.x + (st === 6 ? 3 : 0) * s, p.y, 1.15 * s, 0, pal.light, { edge: pal.deep }));
                }
                body.push(G(`domain-${i + 1}`, k));
                A.organs.push({ x: p.x, y: p.y });
            }
            if (st === 6 && lod !== 'icon') {
                const g = [];
                const x0 = 100 - rx * 0.86;
                const x1 = 100 + rx * 0.86;
                const y0 = my - ry * 0.02;
                const sag = ry * 0.58;
                for (let t = 0; t <= 1.0001; t += 1 / 16)
                    g.push(E(lerp(x0, x1, t), y0 + sag * 4 * t * (1 - t), 2.2, 1.8, pal.light, { stroke: pal.deep, sw: 0.5 }));
                g.push(P(`M100 ${(0, exports.f)(y0 + sag + 1)}l-3 8h6Z`, tokens_1.plantArt.sampaguita.tassel), C(100, y0 + sag + 1, 2.2, pal.light, { stroke: pal.deep, sw: 0.5 }));
                front.push(G('garland', g));
            }
        }
        else {
            const sprigs = [];
            const y0 = my - ry * 0.2;
            for (const [side, len, ang] of [
                [-1, 25, -34],
                [0, 32, 4],
                [1, 24, 36],
            ]) {
                const x0 = 100 + side * 7;
                const tip = tipOf(x0, y0, len, ang);
                const mid = at(x0, y0, len, ang, 0.5);
                sprigs.push(S(`M${(0, exports.f)(x0)} ${(0, exports.f)(y0)}Q${(0, exports.f)(mid.x - side * 2)} ${(0, exports.f)(mid.y)} ${(0, exports.f)(tip.x)} ${(0, exports.f)(tip.y)}`, fol.deep, 1.9));
                for (const [t, l] of [
                    [0.5, 9.5],
                    [0.8, 8.5],
                    [1, 6.5],
                ]) {
                    const q = at(x0, y0, len, ang, t);
                    sprigs.push(leafBlade(q.x, q.y, l, l * 0.42, ang - 48, fol, lod), leafBlade(q.x, q.y, l, l * 0.42, ang + 48, fol, lod));
                }
                if (side === 0)
                    body.push(pearl(tip.x, tip.y - 3, 1.05));
            }
            body.unshift(G('leaves', sprigs));
        }
        A.canopyBox = { cx: 100, cy: my - ry * 0.4, rx: rx + 6, ry: ry + 6 };
        A.crown = { x: 104, y: my - ry - 4 };
        A.neck = { x: 100, y: my - ry * 0.55, w: rx * 1.3 };
        A.perch = { x: 100 - rx * 0.55, y: my - ry * 0.85 };
        A.branchL = { x: 100 - rx * 0.88, y: my };
        A.branchR = { x: 100 + rx * 0.88, y: my };
        A.drift = { x: 100 + rx * 0.7, y: my - ry * 0.3 };
        return { body, front, faceSpec: { x: 100, y: my - ry * 0.26, w: Math.min(rx * 0.95, 34), patch: fol.light } };
    },
    cactus(ctx, sp) {
        const { st, lod, base, A, sc } = ctx;
        const pal = sp.palette;
        const fol = sp.foliage;
        const [W, H] = { 3: [28, 46], 4: [32, 66], 5: [36, 82], 6: [40, 94] }[st];
        const topY = base - H;
        const cap = (x, w, y0, y1) => `M${(0, exports.f)(x - w / 2)} ${(0, exports.f)(y0)}V${(0, exports.f)(y1 + w / 2)}A${(0, exports.f)(w / 2)} ${(0, exports.f)(w / 2)} 0 0 1 ${(0, exports.f)(x + w / 2)} ${(0, exports.f)(y1 + w / 2)}V${(0, exports.f)(y0)}Z`;
        const body = [];
        const behind = [];
        const front = [];
        const fy = base - Math.min(H * 0.42, 30);
        if (st >= 4) {
            const aw = W * 0.56;
            const arms = [
                [-1, 0.3, 0],
                [-1, 0.58, 1],
                [1, 0.52, 3],
                [1, 0.26, 4],
            ];
            for (const [side, hf, dI] of arms) {
                const s = sc[dI];
                const y0 = base - H * hf;
                const dx = W / 2 + aw * 0.95;
                const up = (8 + st * 5.5) * s;
                const x1 = 100 + side * dx;
                const bend = Math.min(aw * 0.75, up * 0.5);
                const d = `M${(0, exports.f)(100 + side * W * 0.2)} ${(0, exports.f)(y0)}H${(0, exports.f)(x1 - side * bend)}Q${(0, exports.f)(x1)} ${(0, exports.f)(y0)} ${(0, exports.f)(x1)} ${(0, exports.f)(y0 - bend)}V${(0, exports.f)(y0 - up)}`;
                const k = [S(d, fol.deep, aw), S(d, fol.mid, aw - 3.5, { transform: 'translate(-0.8 -0.6)' })];
                if (lod !== 'icon')
                    k.push(S(`M${(0, exports.f)(100 + side * (W / 2 + 1))} ${(0, exports.f)(y0 - aw * 0.3)}H${(0, exports.f)(x1 - side * bend * 1.1)}`, fol.light, aw * 0.16, { opacity: 0.55 }), S(`M${(0, exports.f)(x1 - aw * 0.22)} ${(0, exports.f)(y0 - bend - 1)}V${(0, exports.f)(y0 - up)}`, fol.light, aw * 0.22, { opacity: 0.8 }));
                if (lod === 'full')
                    for (let j = 0; j < 3; j++)
                        k.push(S(`M${(0, exports.f)(x1 + side * aw * 0.5)} ${(0, exports.f)(y0 - bend - j * 6 - 3)}l${(0, exports.f)(side * 2.2)} -1`, fol.hi, 0.9));
                if (st === 6)
                    k.push(glyph('blossom', x1, y0 - up - aw * 0.45, 1.05, 20, pal.light, { core: pal.deep }));
                behind.push(G(`domain-${dI + 1}`, k));
                A.organs[dI] = { x: x1, y: y0 - up * 0.5 };
            }
        }
        const col = [P(cap(100, W, base + 1, topY), fol.deep), P(cap(99.2, W - 3.5, base, topY + 1.2), fol.mid)];
        if (lod !== 'icon')
            col.push(P(cap(100 - W * 0.28, W * 0.18, base - 3, topY + 4), fol.light, { opacity: 0.85 }));
        if (lod === 'full') {
            for (const dx of [-0.22, 0.22])
                col.push(S(`M${(0, exports.f)(100 + dx * W)} ${(0, exports.f)(topY + 7)}V${(0, exports.f)(fy - W * 0.36)}`, fol.deep, 1.1, { opacity: 0.45 }), S(`M${(0, exports.f)(100 + dx * W)} ${(0, exports.f)(fy + W * 0.36)}V${(0, exports.f)(base - 3)}`, fol.deep, 1.1, { opacity: 0.45 }));
            for (let y = topY + 9; y < base - 4; y += 9)
                for (const dx of [-0.5, 0.5])
                    if (Math.abs(y - fy) > W * 0.32)
                        col.push(S(`M${(0, exports.f)(100 + dx * W)} ${(0, exports.f)(y)}l${(0, exports.f)(dx * 4)} -1.4`, fol.hi, 0.9));
        }
        body.push(G('trunk', col));
        if (st >= 4) {
            const s = sc[2];
            const k = st === 4
                ? [E(100, topY + 1, 4 * s, 3.4 * s, pal.mid), E(99, topY, 2.4 * s, 2 * s, pal.light)]
                : [
                    glyph('blossom', 100, topY + 1, 1.25 * s, 0, pal.light, { core: pal.deep }),
                    st === 6 ? glyph('blossom', 92, topY + 4, 0.95 * s, 30, pal.mid, { core: pal.deep }) : null,
                    st === 6 ? glyph('blossom', 108, topY + 4, 0.95 * s, 50, pal.mid, { core: pal.deep }) : null,
                ];
            front.push(G('domain-3', k));
            A.organs[2] = { x: 100, y: topY + 2 };
        }
        A.crown = { x: 100, y: topY - (st >= 5 ? 6 : 1) };
        A.neck = { x: 100, y: fy - W * 0.55, w: W };
        A.perch = A.organs[1] ? { x: A.organs[1].x, y: A.organs[1].y - (8 + st * 5.5) * 0.5 * sc[1] - W * 0.25 } : { x: 100 - W * 0.6, y: base + 1 };
        A.branchL = A.organs[0] ? { x: A.organs[0].x - W * 0.2, y: A.organs[0].y + 2 } : { x: 100 - W * 0.4, y: topY + 10 };
        A.branchR = A.organs[4] ? { x: A.organs[4].x + W * 0.2, y: A.organs[4].y + 2 } : { x: 100 + W * 0.4, y: topY + 10 };
        A.canopyBox = { cx: 100, cy: topY + H * 0.3, rx: W * 1.6, ry: H * 0.5 };
        A.drift = { x: 100 + W, y: topY + 10 };
        return { body, behind, front, faceSpec: { x: 100, y: fy, w: W * 0.95 } };
    },
    bamboo(ctx, sp) {
        const { st, lod, base, A, sc } = ctx;
        const pal = sp.palette;
        const CU = tokens_1.plantArt.bamboo;
        const xs = [64, 82, 100, 118, 136];
        const Wd = [10, 12, 15, 12, 10];
        const Hb = { 3: 74, 4: 94, 5: 120, 6: 140 }[st];
        const culms = st === 3 ? [2] : [0, 4, 1, 3, 2];
        const body = [];
        const spray = (x, y, side, s, n = 3) => {
            const k = [];
            for (let j = 0; j < n; j++)
                k.push(glyph('olive', x, y, s * (1.25 - j * 0.12), side * (62 + j * 26), j === 1 ? pal.light : j === 2 ? pal.deep : pal.mid));
            return G(null, k);
        };
        for (const i of culms) {
            const s = st === 3 ? 1 : sc[i];
            const H = Hb * s * (i === 2 ? 1 : 0.9 - Math.abs(i - 2) * 0.04);
            const w = Wd[i] * (st >= 5 ? 1.1 : 1);
            const x = xs[i];
            const lean = (i - 2) * 2.4;
            const top = base - H;
            const fill = i !== 2 ? mix(CU.mid, CU.deep, Math.abs(i - 2) * 0.3) : CU.mid;
            const k = [];
            k.push(P(`M${(0, exports.f)(x - w / 2)} ${base + 1}L${(0, exports.f)(x - w * 0.36 + lean)} ${(0, exports.f)(top + 4)}Q${(0, exports.f)(x + lean)} ${(0, exports.f)(top - 2)} ${(0, exports.f)(x + w * 0.36 + lean)} ${(0, exports.f)(top + 4)}L${(0, exports.f)(x + w / 2)} ${base + 1}Z`, fill));
            if (lod !== 'icon')
                k.push(P(`M${(0, exports.f)(x - w * 0.36)} ${base}L${(0, exports.f)(x - w * 0.22 + lean)} ${(0, exports.f)(top + 6)}L${(0, exports.f)(x - w * 0.08 + lean)} ${(0, exports.f)(top + 6)}L${(0, exports.f)(x - w * 0.18)} ${base}Z`, CU.light, { opacity: 0.7 }));
            const seg = Math.max(15, H / 6);
            const sprays = [];
            for (let y = base - seg, n = 0; y > top + 8; y -= seg, n++) {
                const tt = (base - y) / H;
                const xx = x + lean * tt;
                const ww = lerp(w, w * 0.72, tt);
                if (i === 2 && Math.abs(y - (base - 24)) < 10)
                    continue;
                k.push(P(`M${(0, exports.f)(xx - ww / 2 - 0.6)} ${(0, exports.f)(y - 1.2)}h${(0, exports.f)(ww + 1.2)}v2.4h${(0, exports.f)(-ww - 1.2)}Z`, CU.node));
                if (tt > 0.45)
                    sprays.push({ x: xx, y, side: n % 2 ? 1 : -1, w: ww });
            }
            if (lod !== 'icon')
                sprays.forEach((q) => k.push(spray(q.x + (q.side * q.w) / 2, q.y, q.side, 0.95 + st * 0.08, st >= 5 ? 4 : 3)));
            k.push(spray(x + lean, top + 2, 1, 0.9 + st * 0.06, 2), spray(x + lean, top + 2, -1, 0.85 + st * 0.06, 2));
            body.push(G(st === 3 ? 'trunk' : `domain-${i + 1}`, k));
            if (st >= 4)
                A.organs[i] = { x: x + lean * 0.8, y: top + 22 };
            if (i === 2)
                A.crown = { x: x + lean, y: top - 4 };
        }
        if (st === 6)
            for (const [sx, s] of [
                [71, 1.1],
                [129, 1.25],
                [148, 0.85],
            ])
                body.push(G('shoot', [
                    P(`M${(0, exports.f)(sx - 7 * s)} ${base + 1}Q${(0, exports.f)(sx - 5 * s)} ${(0, exports.f)(base - 14 * s)} ${sx} ${(0, exports.f)(base - 24 * s)}Q${(0, exports.f)(sx + 5 * s)} ${(0, exports.f)(base - 14 * s)} ${(0, exports.f)(sx + 7 * s)} ${base + 1}Z`, CU.shoot),
                    S(`M${(0, exports.f)(sx - 5 * s)} ${(0, exports.f)(base - 6 * s)}L${(0, exports.f)(sx + 5 * s)} ${(0, exports.f)(base - 10 * s)}`, CU.shootLine, 1),
                    lod !== 'icon' ? S(`M${(0, exports.f)(sx - 4 * s)} ${(0, exports.f)(base - 13 * s)}L${(0, exports.f)(sx + 3.5 * s)} ${(0, exports.f)(base - 16 * s)}`, CU.shootLine, 1) : null,
                    lod !== 'icon' ? P(`M${sx} ${(0, exports.f)(base - 24 * s)}l-1.6 ${(0, exports.f)(5 * s)}h3.2Z`, CU.mid) : null,
                ]));
        A.neck = { x: 100, y: base - 42, w: 15 };
        A.perch = st >= 4 ? { x: A.organs[1].x, y: A.organs[1].y - 18 } : { x: 92, y: base - Hb + 20 };
        A.branchL = st >= 4 ? { x: A.organs[0].x - 4, y: A.organs[0].y + 6 } : { x: 92, y: base - Hb * 0.6 };
        A.branchR = st >= 4 ? { x: A.organs[4].x + 4, y: A.organs[4].y + 6 } : { x: 108, y: base - Hb * 0.6 };
        A.canopyBox = { cx: 100, cy: base - Hb * 0.75, rx: st === 3 ? 26 : 50, ry: Hb * 0.35 };
        A.drift = { x: 128, y: base - Hb * 0.5 };
        return { body, faceSpec: { x: 100, y: base - 24, w: 15 * (st >= 5 ? 1.1 : 1) } };
    },
};
function youngOverride(ctx) {
    const { key, st, lod, base, A } = ctx;
    if (key === 'bamboo' && st <= 2) {
        const CU = tokens_1.plantArt.bamboo;
        const [w, h] = st === 1 ? [24, 24] : [28, 44];
        const sh = (k, c) => P(`M${(0, exports.f)(100 - (w / 2) * k)} ${base + 1}Q${(0, exports.f)(100 - (w / 2) * k * 0.9)} ${(0, exports.f)(base - h * k * 0.55)} 100 ${(0, exports.f)(base - h * k)}Q${(0, exports.f)(100 + (w / 2) * k * 0.9)} ${(0, exports.f)(base - h * k * 0.55)} ${(0, exports.f)(100 + (w / 2) * k)} ${base + 1}Z`, c);
        const kids = [sh(1, CU.sheath), sh(0.84, CU.sheathMid), sh(0.6, CU.sheathLit)];
        if (lod !== 'icon')
            kids.push(S(`M${(0, exports.f)(100 - w * 0.36)} ${(0, exports.f)(base - 4)}Q${(0, exports.f)(100 - w * 0.32)} ${(0, exports.f)(base - h * 0.4)} ${(0, exports.f)(100 - w * 0.12)} ${(0, exports.f)(base - h * 0.68)}`, CU.sheathLine, 1.2, { opacity: 0.8 }));
        kids.push(P(`M100 ${(0, exports.f)(base - h - 1)}l-2.4 ${(0, exports.f)(h * 0.2)}h4.8Z`, CU.mid));
        if (st === 2)
            kids.push(glyph('olive', 101, base - h + 2, 0.75, 34, L.grove.light), glyph('olive', 99, base - h + 4, 0.7, -40, L.grove.mid));
        A.crown = { x: 100, y: base - h - 3 };
        A.neck = { x: 100, y: base - h * 0.55, w: w * 0.62 };
        A.perch = { x: 100 - w * 0.95, y: base + 1 };
        A.branchL = { x: 100 - w * 0.7, y: base - h * 0.4 };
        A.branchR = { x: 100 + w * 0.7, y: base - h * 0.4 };
        A.canopyBox = { cx: 100, cy: base - h * 0.5, rx: w * 0.8, ry: h * 0.6 };
        A.drift = A.crown;
        return { body: [G('trunk', kids)], faceSpec: { x: 100, y: base - h * (st === 1 ? 0.32 : 0.27), w: w * 0.9 } };
    }
    if (key === 'cactus' && st === 2) {
        const fol = exports.SPECIES_ART.cactus.foliage;
        const r = 15;
        const cy = base - r + 2;
        const kids = [C(100, cy, r, fol.deep), C(99.2, cy - 0.8, r - 1.8, fol.mid)];
        if (lod !== 'icon')
            kids.push(E(94, cy - 6, 4, 5, fol.light, { opacity: 0.85 }));
        if (lod === 'full')
            for (let i = 0; i < 9; i++) {
                const a = ((-160 + i * 17.5) * Math.PI) / 180;
                kids.push(S(`M${(0, exports.f)(100 + Math.cos(a) * r)} ${(0, exports.f)(cy + Math.sin(a) * r)}l${(0, exports.f)(Math.cos(a) * 3)} ${(0, exports.f)(Math.sin(a) * 3)}`, fol.hi, 0.9));
            }
        kids.push(E(96, cy - r - 1, 3, 2, fol.light), E(104, cy - r - 1, 3, 2, fol.light));
        A.crown = { x: 100, y: cy - r - 3 };
        A.neck = { x: 100, y: cy - r * 0.55, w: r * 1.5 };
        A.perch = { x: 100 - r * 1.3, y: base + 1 };
        A.branchL = { x: 100 - r, y: cy - 4 };
        A.branchR = { x: 100 + r, y: cy - 4 };
        A.canopyBox = { cx: 100, cy, rx: r * 1.4, ry: r * 1.2 };
        A.drift = A.crown;
        return { body: [G('trunk', kids)], faceSpec: { x: 100, y: cy + 2, w: r * 1.7 } };
    }
    return null;
}
exports.ORGAN_DRAW_MIN = 0.5;
exports.ORGAN_DRAW_MAX = 1.25;
exports.ORGAN_DEFAULT = 1.011;
const BUILT = new Map();
const BUILT_MAX = 32;
const lookKey = (l) => { var _a, _b, _d, _f, _g; return (l ? [(_a = l.palette) !== null && _a !== void 0 ? _a : '', (_b = l.ground) !== null && _b !== void 0 ? _b : '', (_d = l.planter) !== null && _d !== void 0 ? _d : '', (_f = l.visitor) !== null && _f !== void 0 ? _f : '', ((_g = l.keepsakes) !== null && _g !== void 0 ? _g : []).join('+')].join('/') : ''); };
const isBotanical = (o) => { var _a, _b; return ((_a = o.style) !== null && _a !== void 0 ? _a : (_b = o.look) === null || _b === void 0 ? void 0 : _b.style) === 'botanical'; };
exports.isBotanical = isBotanical;
const buildKey = (o) => {
    var _a, _b, _d, _f, _g;
    return [
        o.species,
        Math.round(o.stage),
        (_a = o.lod) !== null && _a !== void 0 ? _a : 'full',
        (_b = o.theme) !== null && _b !== void 0 ? _b : 'light',
        o.quietLook ? 1 : 0,
        o.resting ? 1 : 0,
        (_d = o.mood) !== null && _d !== void 0 ? _d : '',
        o.drift === false ? 0 : 1,
        ((_f = o.organs) !== null && _f !== void 0 ? _f : []).join(','),
        lookKey(o.look),
        (0, exports.isBotanical)(o) ? `b${(_g = o.px) !== null && _g !== void 0 ? _g : 200}${o.fit ? 'f' : ''}` : '',
    ].join('|');
};
const BOTANICAL_KIT = {
    rng,
    hash,
    mix,
    scallop,
    bounds: (n) => bounds(n),
    frameFor: (b) => frameFor(b),
    ground: (species, look, stage, lod, theme) => groundOf(species, look, Math.max(1, Math.min(6, Math.round(stage))), lod, theme),
    visitor: visitorNode,
    keepsakes: placeKeepsakes,
};
function buildPlant(o) {
    const k = buildKey(o);
    const hit = BUILT.get(k);
    if (hit) {
        BUILT.delete(k);
        BUILT.set(k, hit);
        return hit;
    }
    const built = (0, exports.isBotanical)(o) ? (0, botanical_1.buildBotanical)(o, BOTANICAL_KIT) : buildUncached(o);
    if (BUILT.size >= BUILT_MAX)
        BUILT.delete(BUILT.keys().next().value);
    BUILT.set(k, built);
    return built;
}
const builtCacheSize = () => BUILT.size;
exports.builtCacheSize = builtCacheSize;
function potFor(sp, planter) {
    switch (planter) {
        case 'terracotta':
        case 'celadon':
        case 'fieldstone':
        case 'five-stone':
        case 'compass-rose':
        case 'banded':
        case 'root-woven':
            return planter;
        default:
            return sp.pot || 'meadow';
    }
}
function groundOf(key, look, st, lod, theme) {
    const potKind = potFor(exports.SPECIES_ART[key], look === null || look === void 0 ? void 0 : look.planter);
    const gr = ground(potKind, GEO[st].ground, lod, theme, { water: key === 'lotus' && potKind !== 'pond', look: (look === null || look === void 0 ? void 0 : look.ground) || 'meadow' });
    return { gr, potKind };
}
function buildUncached(o) {
    var _a;
    const key = o.species;
    const base0 = exports.SPECIES_ART[key];
    const look = o.look;
    const pal = (look === null || look === void 0 ? void 0 : look.palette) ? tokens_1.plantLeaf[look.palette] : base0.palette;
    const sp = { ...base0, palette: pal };
    const st = Math.max(1, Math.min(6, Math.round(o.stage)));
    const lod = o.lod || 'full';
    const theme = o.theme || 'light';
    const mood = o.resting && (!o.mood || o.mood === 'idle') ? 'resting' : o.mood || 'idle';
    const showFace = !o.quietLook && lod !== 'icon';
    const seed = hash(key + st);
    const sc = [0, 1, 2, 3, 4].map((i) => {
        var _a;
        const v = (_a = o.organs) === null || _a === void 0 ? void 0 : _a[i];
        return typeof v === 'number' && Number.isFinite(v) ? Math.max(exports.ORGAN_DRAW_MIN, Math.min(exports.ORGAN_DRAW_MAX, v)) : exports.ORGAN_DEFAULT;
    });
    const { gr, potKind } = groundOf(key, look, st, lod, theme);
    const base = gr.top + 2;
    const A = { base: { x: 100, y: base }, organs: [] };
    const potted = potKind !== 'meadow' && potKind !== 'pond' && potKind !== 'bonsai' && potKind !== 'stone';
    const spAdj = { ...sp, pot: potted ? 'terracotta' : sp.pot };
    const ctx = { key, sp: spAdj, st, lod, pal, fol: sp.kind === 'plant' ? sp.foliage : null, seed, sc, base, A, showFace };
    const res = (_a = youngOverride(ctx)) !== null && _a !== void 0 ? _a : (st <= 2 ? youngStage(ctx) : sp.kind === 'tree' ? treeBody(ctx, sp) : PLANTS[sp.build](ctx, sp));
    const fs = res.faceSpec;
    const patch = showFace && fs && fs.patch ? E(fs.x, fs.y + fs.w * 0.1, Math.min(fs.w * 0.4, 19) * (fs.patchK || 1), Math.min(fs.w * 0.3, 14) * (fs.patchK || 1), fs.patch, { opacity: 0.85 }) : null;
    const faceNode = showFace && fs ? face(fs.x, fs.y, fs.w, mood, lod) : null;
    if (fs)
        A.face = { x: fs.x, y: fs.y };
    const drift = [];
    if (st === 6 && o.drift !== false && lod !== 'icon' && A.drift && key !== 'pine') {
        const d = A.drift;
        const kind = sp.driftGlyph || sp.leaf || 'lens';
        const fill = sp.driftFill || sp.palette.light;
        const core = key === 'cherry-blossom' ? tokens_1.plantArt.gift.cherryCore : key === 'bonsai' ? tokens_1.plantArt.gift.mossBloomCore : L.twilight.deep;
        const low = base - 8;
        drift.push(glyph(kind, d.x + 14, Math.min(d.y + 22, low - 14), 0.8, 120, fill, { core }));
        drift.push(glyph(kind, d.x + 4, Math.min(d.y + 44, low), 0.7, -60, fill, { core }));
    }
    const pose = mood === 'resting' ? `rotate(2.5 100 ${base})` : null;
    const fx = effects(mood, A, lod, theme);
    const visitor = visitorNode(look === null || look === void 0 ? void 0 : look.visitor, A, lod);
    const tree = G('tree', [G('body', [...(res.behind || []), ...res.body, patch, faceNode, visitor, ...(res.front || [])], pose ? { transform: pose } : {}), G('drift', drift), fx]);
    const tb = bounds(tree);
    const M = 3;
    const fit = Math.min(1, (base - M) / Math.max(1, base - tb.minY), (100 - M) / Math.max(1, 100 - tb.minX), (100 - M) / Math.max(1, tb.maxX - 100));
    if (fit < 1)
        tree.transform = `translate(100 ${(0, exports.f)(base)}) scale(${fit.toFixed(3)}) translate(-100 ${(0, exports.f)(-base)})`;
    const { back: keepBack, front: keepFront, dawn } = placeKeepsakes(look === null || look === void 0 ? void 0 : look.keepsakes, st, gr, tree, base, potKind, A, lod, theme);
    const frame = frameFor(bounds(G(null, [gr.back, ...keepBack, tree, gr.front, ...keepFront, dawn])));
    let backdrop = null;
    if (o.resting) {
        const T = tokens_1.plantTheme[theme];
        const [fx0, fy0, fs0] = frame.split(' ').map(Number);
        const dcx = fx0 + fs0 / 2;
        const dcy = fy0 + fs0 / 2;
        const dr = Math.max(8, Math.min(fs0 * 0.48, dcx - 1, dcy - 1, 199 - dcx, 199 - dcy));
        backdrop = G('dusk', [C(dcx, dcy, dr, T.dusk, { opacity: T.duskOpacity })]);
    }
    const root = G('mascot', [backdrop, dawn, gr.back, G('keepsakes-back', keepBack), tree, gr.front, G('keepsakes', keepFront)]);
    return { root, anchors: A, frame };
}
function placeKeepsakes(keepsakes, st, gr, tree, base, potKind, A, lod, theme) {
    var _a;
    const keepBack = [];
    const keepFront = [];
    let dawn = null;
    if (lod !== 'icon' && (keepsakes === null || keepsakes === void 0 ? void 0 : keepsakes.length)) {
        const k = GROUND_K[GEO[st].ground] * 1.6;
        const gap = 3 + 9 * k;
        const half = 11 * k;
        const base2 = [
            { x: Math.max(2 + half, 100 - gr.span - gap), foot: gr.floor },
            { x: Math.min(198 - half, 100 + gr.span + gap), foot: gr.floor },
        ];
        const items = [...new Set(keepsakes)].slice(0, 3);
        if (items.includes('clear-dawn')) {
            const T = tokens_1.plantTheme[theme];
            const box = (_a = A.canopyBox) !== null && _a !== void 0 ? _a : { cx: 100, cy: 120, rx: 30, ry: 30 };
            const r = Math.min(26, Math.max(12, box.rx * 0.42));
            const cx = Math.min(196 - r, box.cx + box.rx * 0.62);
            const cy = Math.max(r + 2, box.cy - box.ry * 0.7);
            dawn = G('keepsake-clear-dawn', [C(cx, cy, r, tokens_1.plantArt.keepsake.dawn, { opacity: T.dawnOpacity }), C(cx, cy, r * 0.66, tokens_1.plantArt.keepsake.dawn, { opacity: Math.min(1, T.dawnOpacity + 0.2) })]);
        }
        const flat = (id) => { var _a; return ((_a = (0, plantLooks_1.lookItem)(id)) === null || _a === void 0 ? void 0 : _a.shape) === 'flat'; };
        const standing = items.filter((id) => id !== 'clear-dawn');
        const order = [...standing.filter(flat), ...standing.filter((id) => !flat(id))];
        const trunkHalf = bandHalfWidth({ ...tree, children: [tree.children[0]] }, base - 16, base - 1);
        order.forEach((id, i) => {
            if (i < 2)
                keepFront.push(keepsakeAt(id, base2[i].x, base2[i].foot, k, lod, theme));
            else if (flat(id)) {
                const kf = k * 0.8;
                keepFront.push(keepsakeAt(id, Math.min(198 - 11 * kf, 100 + Math.max(gr.span * 0.5, trunkHalf + 9 * kf)), gr.floor + 2, kf, lod, theme));
            }
            else {
                const kb = k * (potKind === 'meadow' ? 0.8 : 0.68);
                const x = Math.min(198 - 11 * kb, 100 + Math.max(trunkHalf + 11 * kb, gr.span * (potKind === 'meadow' ? 0.62 : 0.76)));
                keepBack.push(keepsakeAt(id, x, potKind === 'meadow' ? gr.floor - 3 : gr.top + 1.5, kb, lod, theme));
            }
        });
    }
    return { back: keepBack, front: keepFront, dawn };
}
const LAYERS = new WeakMap();
function plantLayers(root) {
    const hit = LAYERS.get(root);
    if (hit)
        return hit;
    const i = root.children.findIndex((c) => c.t === 'g' && c.id === 'tree');
    const layers = {
        back: G('back', root.children.slice(0, i)),
        plant: G('plant', [root.children[i]]),
        front: G('front', root.children.slice(i + 1)),
    };
    LAYERS.set(root, layers);
    return layers;
}
function liftGroup(root, id) {
    let found = null;
    const strip = (n, chain) => {
        if (n.t !== 'g')
            return n;
        if (n.id === id && !found) {
            found = { node: n, chain };
            return null;
        }
        const next = n.transform ? [...chain, n.transform] : chain;
        return { ...n, children: n.children.map((c) => strip(c, next)).filter(Boolean) };
    };
    const rest = strip(root, []);
    if (!found)
        return null;
    const { node, chain } = found;
    return { rest, part: G(`lift-${id}`, [node], chain.length ? { transform: chain.join(' ') } : {}) };
}
function frameFor(box, pad = 0) {
    const w = box.maxX - box.minX;
    const h = box.maxY - box.minY;
    const s = Math.max(w, h) * (1.06 + pad) + 4;
    const cx = (box.minX + box.maxX) / 2;
    const yb = box.maxY + 2 + Math.max(0, s - h - 4) * 0.12;
    return `${(0, exports.f)(cx - s / 2)} ${(0, exports.f)(yb - s)} ${(0, exports.f)(s)} ${(0, exports.f)(s)}`;
}
const ID = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function parseTransform(s) {
    var _a;
    let m = ID;
    if (!s)
        return m;
    for (const [, op, args] of s.matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
        const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
        if (op === 'translate')
            m = mul(m, [1, 0, 0, 1, v[0] || 0, v[1] || 0]);
        else if (op === 'scale')
            m = mul(m, [v[0], 0, 0, (_a = v[1]) !== null && _a !== void 0 ? _a : v[0], 0, 0]);
        else {
            const a = ((v[0] || 0) * Math.PI) / 180;
            const r = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
            m = v.length >= 3 ? mul(mul(mul(m, [1, 0, 0, 1, v[1], v[2]]), r), [1, 0, 0, 1, -v[1], -v[2]]) : mul(m, r);
        }
    }
    return m;
}
function pathTokens(d) {
    const out = [];
    const n = d.length;
    const digit = (k) => {
        const c = d.charCodeAt(k);
        return c >= 48 && c <= 57;
    };
    let i = 0;
    while (i < n) {
        const c = d.charCodeAt(i);
        if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
            out.push(d[i]);
            i++;
            continue;
        }
        let j = c === 45 ? i + 1 : i;
        const intStart = j;
        while (j < n && digit(j))
            j++;
        if (j < n && d.charCodeAt(j) === 46 && j + 1 < n && digit(j + 1)) {
            j++;
            while (j < n && digit(j))
                j++;
        }
        else if (j === intStart) {
            i++;
            continue;
        }
        if (j < n && d.charCodeAt(j) === 101) {
            let e = j + 1;
            if (e < n && d.charCodeAt(e) === 45)
                e++;
            if (e < n && digit(e)) {
                while (e < n && digit(e))
                    e++;
                j = e;
            }
        }
        out.push(Number(d.slice(i, j)));
        i = j;
    }
    return out;
}
function pathPoints(d) {
    const out = [];
    const toks = pathTokens(d);
    let i = 0;
    let cmd = '';
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    const num = () => toks[i++];
    const isNum = () => i < toks.length && typeof toks[i] === 'number';
    while (i < toks.length) {
        if (typeof toks[i] === 'string')
            cmd = toks[i++];
        const rel = cmd === cmd.toLowerCase();
        const C = cmd.toUpperCase();
        if (C === 'Z') {
            x = sx;
            y = sy;
            continue;
        }
        if (!isNum())
            continue;
        const pt = (px, py) => (rel ? [x + px, y + py] : [px, py]);
        if (C === 'M' || C === 'L') {
            [x, y] = pt(num(), num());
            if (C === 'M') {
                sx = x;
                sy = y;
                cmd = rel ? 'l' : 'L';
            }
            out.push([x, y]);
        }
        else if (C === 'H') {
            x = rel ? x + num() : num();
            out.push([x, y]);
        }
        else if (C === 'V') {
            y = rel ? y + num() : num();
            out.push([x, y]);
        }
        else if (C === 'Q' || C === 'C') {
            const n = C === 'Q' ? 2 : 3;
            let p = [x, y];
            for (let k = 0; k < n; k++) {
                p = pt(num(), num());
                out.push(p);
            }
            [x, y] = p;
        }
        else if (C === 'A') {
            const r = Math.abs(num());
            num();
            num();
            num();
            num();
            const [nx, ny] = pt(num(), num());
            const L2 = Math.hypot(nx - x, ny - y) / 2;
            const h = r - Math.sqrt(Math.max(0, r * r - L2 * L2)) || 0;
            const mx = (x + nx) / 2;
            const my = (y + ny) / 2;
            const ux = L2 ? -(ny - y) / (2 * L2) : 0;
            const uy = L2 ? (nx - x) / (2 * L2) : 0;
            const b = Math.max(h, r > L2 * 1.01 ? 0 : r);
            out.push([nx, ny], [mx + ux * b, my + uy * b], [mx - ux * b, my - uy * b]);
            for (const [px, py] of [[x, y], [nx, ny]])
                out.push([px + ux * b, py + uy * b], [px - ux * b, py - uy * b]);
            x = nx;
            y = ny;
        }
        else {
            i++;
        }
    }
    return out;
}
function bounds(n, m = ID, box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }) {
    var _a;
    const mm = n.transform ? mul(m, parseTransform(n.transform)) : m;
    const add = (x, y, pad = 0) => {
        const [px, py] = apply(mm, x, y);
        const k = Math.hypot(mm[0], mm[1]) * pad;
        box.minX = Math.min(box.minX, px - k);
        box.maxX = Math.max(box.maxX, px + k);
        box.minY = Math.min(box.minY, py - k);
        box.maxY = Math.max(box.maxY, py + k);
    };
    if (n.t === 'g')
        n.children.forEach((c) => bounds(c, mm, box));
    else if (n.t === 'circle')
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]])
            add(n.cx + dx * n.r, n.cy + dy * n.r);
    else if (n.t === 'ellipse')
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]])
            add(n.cx + dx * n.rx, n.cy + dy * n.ry);
    else
        for (const [x, y] of pathPoints(n.d))
            add(x, y, n.stroke ? ((_a = n.sw) !== null && _a !== void 0 ? _a : 1) / 2 : 0);
    return box;
}
function bandHalfWidth(n, yLo, yHi, m = ID) {
    const mm = n.transform ? mul(m, parseTransform(n.transform)) : m;
    let hw = 0;
    const add = (x, y) => {
        const [px, py] = apply(mm, x, y);
        if (py >= yLo && py <= yHi)
            hw = Math.max(hw, Math.abs(px - 100));
    };
    if (n.t === 'g')
        for (const c of n.children)
            hw = Math.max(hw, bandHalfWidth(c, yLo, yHi, mm));
    else if (n.t === 'circle') {
        add(n.cx - n.r, n.cy);
        add(n.cx + n.r, n.cy);
    }
    else if (n.t === 'ellipse') {
        add(n.cx - n.rx, n.cy);
        add(n.cx + n.rx, n.cy);
    }
    else
        for (const [x, y] of pathPoints(n.d))
            add(x, y);
    return hw;
}
function groupNames(n, out = []) {
    if (n.t === 'g') {
        if (n.id)
            out.push(n.id);
        n.children.forEach((c) => groupNames(c, out));
    }
    return out;
}
function countShapes(n) {
    return n.t === 'g' ? n.children.reduce((s, c) => s + countShapes(c), 0) : 1;
}
  };
  links["src/components/plant/botanical.ts"] = {"../../theme/tokens":"src/theme/tokens.ts"};
  defs["src/components/plant/botanical.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBotanical = buildBotanical;
exports.ink = ink;
const tokens_1 = require("../../theme/tokens");
const D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const f = (n) => Math.round(n * 10) / 10;
const LINE_PT = { icon: { main: 1.25, fine: 0 }, small: { main: 1.3, fine: 0.7 }, full: { main: 1.5, fine: 0.75 } };
const P = (d, fill, extra = {}) => ({ t: 'path', d, fill, ...extra });
const C = (cx, cy, r, fill, extra = {}) => ({ t: 'circle', cx: f(cx), cy: f(cy), r: f(r), fill, ...extra });
const G = (id, children, extra = {}) => ({ t: 'g', id, children: children.filter(Boolean), ...extra });
const L = (d, stroke, pt, extra = {}) => ({ t: 'path', d, fill: 'none', stroke, sw: pt, ...extra });
const PARSED = new Map();
function parse(d) {
    var _a;
    const hit = PARSED.get(d);
    if (hit)
        return hit;
    const segs = [];
    for (const t of (_a = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi)) !== null && _a !== void 0 ? _a : []) {
        if (/^[MLQCZ]$/i.test(t))
            segs.push({ c: t.toUpperCase(), n: [] });
        else if (segs.length)
            segs[segs.length - 1].n.push(parseFloat(t));
    }
    PARSED.set(d, segs);
    return segs;
}
function xf(d, x, y, a, s) {
    const c = Math.cos(a) * s;
    const sn = Math.sin(a) * s;
    let out = '';
    for (const g of parse(d)) {
        out += g.c;
        const n = g.n;
        for (let i = 0; i + 1 < n.length; i += 2) {
            const u = n[i];
            const v = n[i + 1];
            out += `${f(x + u * c - v * sn)} ${f(y + u * sn + v * c)} `;
        }
    }
    return out.trim();
}
const qpt = (p0, pc, p1, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * pc[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * pc[1] + t * t * p1[1]];
const qtan = (p0, pc, p1, t) => Math.atan2(2 * (1 - t) * (pc[1] - p0[1]) + 2 * t * (p1[1] - pc[1]), 2 * (1 - t) * (pc[0] - p0[0]) + 2 * t * (p1[0] - pc[0]));
const Q = (p0, pc, p1) => `M${f(p0[0])} ${f(p0[1])}Q${f(pc[0])} ${f(pc[1])} ${f(p1[0])} ${f(p1[1])}`;
function cubic(p0, c1, c2, p3) {
    const pt = (t) => {
        const u = 1 - t;
        return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]];
    };
    const tan = (t) => {
        const u = 1 - t;
        const dx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p3[0] - c2[0]);
        const dy = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p3[1] - c2[1]);
        return Math.atan2(dy, dx);
    };
    return { pt, tan };
}
function taper(p0, pc, p1, w0, w1, N = 12, curve) {
    const Lp = [];
    const Rp = [];
    const at = curve ? curve.pt : (t) => qpt(p0, pc, p1, t);
    const tanAt = curve ? curve.tan : (t) => qtan(p0, pc, p1, t);
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const [x, y] = at(t);
        const a = tanAt(t);
        const w = lerp(w0, w1, Math.pow(t, 0.85)) / 2;
        Lp.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
        Rp.push([x - Math.sin(a) * w, y + Math.cos(a) * w]);
    }
    const pl = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('');
    const tip = Lp[N];
    const ta = tanAt(1);
    const closed = pl(Lp) +
        `Q${f(tip[0] + (Rp[N][0] - tip[0]) / 2 + Math.cos(ta) * w1 * 0.6)} ${f(tip[1] + (Rp[N][1] - tip[1]) / 2 + Math.sin(ta) * w1 * 0.6)} ${f(Rp[N][0])} ${f(Rp[N][1])}` +
        [...Rp]
            .reverse()
            .slice(1)
            .map((p) => `L${f(p[0])} ${f(p[1])}`)
            .join('') +
        'Z';
    return { closed, sides: pl(Lp) + ' ' + pl(Rp) };
}
const MAPLE = (() => {
    const tips = [
        [-90, 7.2],
        [-142, 6.4],
        [-38, 6.4],
        [-208, 4.6],
        [28, 4.6],
    ];
    const order = [3, 1, 0, 2, 4];
    const pt = (a, r) => [r * Math.cos(a * D2R), -6 + r * Math.sin(a * D2R)];
    let d = 'M0 0L' + pt(-240, 2).map(f).join(' ');
    order.forEach((ti, i) => {
        const [a, r] = tips[ti];
        d += ' L' + pt(a, r).map(f).join(' ');
        if (i < order.length - 1)
            d += ' L' + pt((a + tips[order[i + 1]][0]) / 2, 2.4).map(f).join(' ');
    });
    return { d: d + ' L' + pt(60, 2).map(f).join(' ') + 'Z', h: 13.2, rib: 'M0 -0.5L0 -11M0 -5L-4.6 -9M0 -5L4.6 -9' };
})();
const OAK = {
    d: 'M0 0C-2 -.6 -3.6 -1.6 -2.8 -3.4C-5 -3.4 -5.2 -5.8 -3.2 -6.6C-5.2 -7.6 -4.4 -10.2 -2.2 -10C-2.6 -12.2 -.6 -13 0 -13C.6 -13 2.6 -12.2 2.2 -10C4.4 -10.2 5.2 -7.6 3.2 -6.6C5.2 -5.8 5 -3.4 2.8 -3.4C3.6 -1.6 2 -.6 0 0Z',
    h: 13,
    rib: 'M0 -0.5L0 -11.5',
};
const lensD = (W) => ({ d: `M0 0Q${W * 1.9} -0.46 0 -1Q${-W * 1.9} -0.46 0 0Z`, h: 1, rib: 'M0 -0.08L0 -0.86' });
const BANYAN = { d: 'M0 0C0.46 -0.15 0.5 -0.68 0 -1C-0.5 -0.68 -0.46 -0.15 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.86' };
const LEAF = { lens: lensD(0.3), olive: lensD(0.19), long: lensD(0.16), banyan: BANYAN, oak: OAK, maple: MAPLE };
for (const g of Object.values(LEAF)) {
    parse(g.d);
    parse(g.rib);
}
function leaf(kind, x, y, len, ang, fine) {
    var _a;
    const g = (_a = LEAF[kind]) !== null && _a !== void 0 ? _a : LEAF.lens;
    const s = len / g.h;
    const a = ang + Math.PI / 2;
    const shape = xf(g.d, x, y, a, s);
    return { wash: shape, line: fine ? shape + ' ' + xf(g.rib, x, y, a, s) : shape };
}
const PETAL_BLOSSOM = 'M0 0Q0.62 -0.55 0 -1Q-0.62 -0.55 0 0Z';
const PETAL_STAR = 'M0 0Q0.25 -0.5 0 -1Q-0.25 -0.5 0 0Z';
function blossom(x, y, r, rot) {
    let d = '';
    for (let i = 0; i < 5; i++)
        d += xf(PETAL_BLOSSOM, x, y, (i * 72 + rot) * D2R, r * 1.25) + ' ';
    return d.trim();
}
function star(x, y, r, rot) {
    let d = '';
    for (let i = 0; i < 8; i++)
        d += xf(PETAL_STAR, x, y, (i * 45 + rot) * D2R, r) + ' ';
    return d.trim();
}
function needles(x, y, len, ang, n = 5, spread = 0.9) {
    let d = '';
    for (let i = 0; i < n; i++) {
        const a = ang + (i / (n - 1) - 0.5) * spread;
        d += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * len)} ${f(y + Math.sin(a) * len)}`;
    }
    return d;
}
const BARK = tokens_1.plantArt.bark;
const GIFT = tokens_1.plantArt.gift;
const SPECIES = {
    oak: { kind: 'cloud', pal: 'grove', bark: BARK.oak, leaf: 'oak', crown: { sx: 1.06, sy: 0.98, a0: 198, step: 36, spread: 0.56 }, flourish: 'acorn' },
    maple: { kind: 'cloud', pal: 'ember', bark: BARK.maple, leaf: 'maple', crown: { sx: 0.92, sy: 1.12, a0: 214, step: 28, spread: 0.5, dy: -4 }, flourish: 'samara' },
    narra: { kind: 'cloud', pal: 'spring', bark: BARK.narra, leaf: 'banyan', flare: 0.8, crown: { sx: 1.3, sy: 0.7, a0: 188, step: 41, spread: 0.6, dy: 4 }, flourish: 'narra' },
    'cherry-blossom': { kind: 'cloud', pal: 'blossom', bark: BARK.cherry, leaf: 'blossom', crown: { sx: 1.18, sy: 0.84, a0: 194, step: 38, spread: 0.58, dy: 4 }, flourish: 'blossom' },
    mango: { kind: 'cloud', pal: 'evergreen', bark: BARK.mango, leaf: 'long', crown: { sx: 1.22, sy: 0.78, a0: 192, step: 39, spread: 0.6, dy: 8 }, flourish: 'mango', fruitFrom: 5 },
    pine: { kind: 'pine', pal: 'evergreen', bark: BARK.pine, leaf: 'needle', flourish: 'cone' },
    'coconut-palm': { kind: 'palm', pal: 'spring', bark: BARK.coconut, leaf: 'olive', flourish: 'coconut', fruitFrom: 5, seed: GIFT.coconutRipe },
    bonsai: { kind: 'bonsai', pal: 'grove', bark: BARK.bonsai, leaf: 'needle', flourish: 'moss', pot: true },
    sunflower: { kind: 'sunflower', pal: 'gold', fol: 'spring', leaf: 'banyan', seed: tokens_1.plantArt.seed.sunflower, stripe: true },
    lotus: { kind: 'lotus', pal: 'blossom', fol: 'grove', leaf: 'banyan', seed: tokens_1.plantArt.seed.lotus, pot: true },
    sampaguita: { kind: 'sampaguita', pal: 'pearl', fol: 'grove', leaf: 'olive', seed: tokens_1.plantArt.seed.sampaguita },
    cactus: { kind: 'cactus', pal: 'blossom', fol: 'cactus', leaf: 'lens', seed: tokens_1.plantArt.seed.cactus, pot: true },
    bamboo: { kind: 'bamboo', pal: 'grove', fol: 'grove', leaf: 'olive' },
};
const GEO = {
    3: { top: 116, cy: 94, rx: 38, ry: 33, wb: 8, wt: 4, ground: 2 },
    4: { top: 108, cy: 79, rx: 54, ry: 42, wb: 12, wt: 6, ground: 2 },
    5: { top: 102, cy: 70, rx: 68, ry: 49, wb: 17, wt: 8, ground: 3 },
    6: { top: 98, cy: 64, rx: 78, ry: 52, wb: 22, wt: 10, ground: 3 },
};
const GROUND_W = [0, 34, 46, 62];
const groundSize = (st) => (st <= 2 ? 1 : GEO[st].ground);
function buildBotanical(o, kit) {
    var _a, _b, _c, _d, _e;
    const key = o.species;
    const sp = SPECIES[key];
    const st = Math.max(1, Math.min(6, Math.round(o.stage)));
    const lod = o.lod || 'full';
    const theme = o.theme || 'light';
    const TL = tokens_1.plantLine[theme];
    const pal = tokens_1.plantLeaf[(_b = (_a = o.look) === null || _a === void 0 ? void 0 : _a.palette) !== null && _b !== void 0 ? _b : sp.pal];
    const fol = sp.fol ? tokens_1.plantLeaf[sp.fol] : pal;
    const W = LINE_PT[lod];
    const fine = lod === 'full';
    const sc = [0, 1, 2, 3, 4].map((i) => {
        var _a;
        const v = (_a = o.organs) === null || _a === void 0 ? void 0 : _a[i];
        return typeof v === 'number' && Number.isFinite(v) ? Math.max(0.5, Math.min(1.25, v)) : 1.011;
    });
    const restMix = o.resting ? TL.restLineMix : 0;
    const rest = (c) => (restMix ? kit.mix(c, TL.woodInk, restMix) : c);
    const lineOf = (p) => {
        const c = p[TL.leaf];
        return rest(TL.paleLineMix && (p === tokens_1.plantLeaf.snow || p === tokens_1.plantLeaf.pearl) ? kit.mix(c, TL.woodInk, TL.paleLineMix) : c);
    };
    const { gr, potKind } = kit.ground(key, o.look, st, lod, theme);
    const meadow = potKind === 'meadow';
    const gw = GROUND_W[groundSize(st)];
    let base;
    let groundBack;
    let groundFront;
    if (meadow) {
        base = 169.5;
        const arcs = [
            [gw, 171, 5, 1],
            [gw * 0.66, 177.5, 3, 0.55],
            [gw * 0.36, 183.5, 2, 0.3],
        ];
        const look = (g, ids) => g.children.filter((c) => c.t === 'g' && c.id !== null && ids.includes(c.id)).map((c) => ink(c, theme, W.main * 0.9, kit.mix));
        groundBack = G('ground', [...arcs.map(([hw, y, sag, op]) => L(`M${f(100 - hw)} ${y}Q100 ${y - sag} ${f(100 + hw)} ${y}`, rest(TL.soil), W.main, { opacity: op })), ...look(gr.back, ['stone-ring'])]);
        const front = [];
        if (lod !== 'icon') {
            const tuft = (x, s) => L(`M${f(x - 2.4 * s)} 170.4q0.4 -3 -1 -5.4M${f(x)} 169.8q0 -4 1.4 -7M${f(x + 2.4 * s)} 170.4q0.2 -2.6 1.6 -4.2`, lineOf(tokens_1.plantLeaf.grove), W.main * 0.8, { opacity: 0.8 });
            front.push(tuft(100 - gw * 0.62, 1), tuft(100 + gw * 0.7, 0.8));
        }
        groundFront = G('ground-front', [...front, ...look(gr.front, ['stone-ring-front', 'trail-blaze'])]);
    }
    else {
        base = gr.top + 2;
        groundBack = { ...ink(gr.back, theme, W.main, kit.mix), id: 'ground' };
        groundFront = { ...ink(gr.front, theme, W.main, kit.mix), id: 'ground-front' };
    }
    const A = { base: { x: 100, y: base }, organs: [] };
    const ctx = {
        key,
        sp,
        st,
        lod,
        TL,
        dark: theme === 'dark',
        pal,
        fol,
        wood: (c) => kit.mix(c, TL.woodInk, TL.woodMix),
        lineOf,
        rest,
        giftLine: (c) => kit.mix(c, TL.propInk, TL.giftMix),
        W,
        fine,
        seed: kit.hash(key + st + 'b'),
        sc,
        base,
        A,
        kit,
    };
    const res = st <= 2 ? young(ctx) : BUILD[sp.kind](ctx);
    const drift = [];
    if (st === 6 && o.drift !== false && lod !== 'icon' && A.drift && key !== 'pine') {
        const d = A.drift;
        const kind = sp.kind === 'cloud' || sp.kind === 'palm' ? (sp.leaf === 'needle' ? 'lens' : sp.leaf) : 'lens';
        const low = base - 8;
        for (const [dx, dy, len, a] of [
            [14, 22, 9, 120],
            [4, 44, 8, -60],
        ]) {
            const y = Math.min(d.y + dy, low);
            const lf = kind === 'blossom' ? { wash: blossom(d.x + dx, y, 2.4, a), line: blossom(d.x + dx, y, 2.4, a) } : leaf(kind, d.x + dx, y, len, a * D2R, fine);
            drift.push(G(null, [P(lf.wash, pal[TL.washLeaf], { opacity: TL.washLeafOp }), L(lf.line, ctx.lineOf(pal), W.main * 0.9)]));
        }
    }
    const pose = o.resting ? `rotate(1.5 100 ${f(base)})` : null;
    let fx = null;
    if (o.resting && lod !== 'icon' && A.canopyBox) {
        const { cx, cy, rx, ry } = A.canopyBox;
        const mx = Math.min(186, cx + rx * 0.7);
        const my = Math.max(14, cy - ry - 8);
        const moon = `M${f(mx)} ${f(my - 8)}A8 8 0 1 0 ${f(mx + 7)} ${f(my + 4)}A6.4 6.4 0 1 1 ${f(mx)} ${f(my - 8)}Z`;
        fx = G('fx', [P(moon, TL.moon, { opacity: TL.moonWashOp }), L(moon, TL.moon, W.main)]);
    }
    const bird = ((_c = o.look) === null || _c === void 0 ? void 0 : _c.visitor) && o.look.visitor !== 'no-visitor' ? kit.visitor(o.look.visitor, A, lod) : null;
    const visitor = bird ? { ...ink(bird, theme, W.main * 0.9, kit.mix), id: 'visitor' } : null;
    const tree = G('tree', [G('body', [...((_d = res.behind) !== null && _d !== void 0 ? _d : []), ...res.body, visitor], pose ? { transform: pose } : {}), G('drift', drift), fx]);
    const tb = measure(tree, kit);
    const M = 3;
    const fitK = Math.min(1, (base - M) / Math.max(1, base - tb.minY), (100 - M) / Math.max(1, 100 - tb.minX), (100 - M) / Math.max(1, tb.maxX - 100));
    if (fitK < 1)
        tree.transform = `translate(100 ${f(base)}) scale(${fitK.toFixed(3)}) translate(-100 ${f(-base)})`;
    const ks = kit.keepsakes((_e = o.look) === null || _e === void 0 ? void 0 : _e.keepsakes, st, gr, tree, base, potKind, A, lod, theme);
    const keepBack = G('keepsakes-back', ks.back.map((k) => ink(k, theme, W.main * 0.9, kit.mix)));
    const keepFront = G('keepsakes', ks.front.map((k) => ink(k, theme, W.main * 0.9, kit.mix)));
    const k = Math.min(1, fitK);
    const box = kit.bounds(G(null, [groundBack, keepBack, groundFront, keepFront, ks.dawn]));
    const sx = (x) => 100 + (x - 100) * k;
    const sy = (y) => base + (y - base) * k;
    const frame = kit.frameFor({
        minX: Math.min(box.minX, sx(tb.minX)),
        maxX: Math.max(box.maxX, sx(tb.maxX)),
        minY: Math.min(box.minY, sy(tb.minY)),
        maxY: Math.max(box.maxY, sy(tb.maxY)),
    });
    let backdrop = null;
    if (o.resting) {
        const T = tokens_1.plantTheme[theme];
        const [fx0, fy0, fs0] = frame.split(' ').map(Number);
        const dcx = fx0 + fs0 / 2;
        const dcy = fy0 + fs0 / 2;
        const dr = Math.max(8, Math.min(fs0 * 0.48, dcx - 1, dcy - 1, 199 - dcx, 199 - dcy));
        backdrop = G('dusk', [C(dcx, dcy, dr, T.dusk, { opacity: T.duskOpacity })]);
    }
    const root = G('mascot', [backdrop, ks.dawn, groundBack, keepBack, tree, groundFront, keepFront]);
    const side = o.fit ? Number(frame.split(' ')[2]) : 200;
    scaleLines(root, side / (o.px || 200), 1);
    return { root, anchors: A, frame };
}
function scaleOf(t) {
    if (!t || t.indexOf('scale(') < 0)
        return 1;
    let k = 1;
    for (const m of t.matchAll(/scale\(([-\d.e]+)/g))
        k *= Math.abs(Number(m[1])) || 1;
    return k;
}
function scaleLines(n, upp, k) {
    if (n.t === 'g') {
        const kk = k * scaleOf(n.transform);
        for (const c of n.children)
            scaleLines(c, upp, kk);
    }
    else if (n.stroke && n.sw !== undefined) {
        n.sw = Math.round(((n.sw * upp) / k) * 100) / 100;
    }
}
function ink(n, theme, pt, mix) {
    const TL = tokens_1.plantLine[theme];
    const lineFor = (c) => mix(c, TL.propInk, TL.propMix);
    const walk = (x) => {
        var _a;
        const op = (_a = x.opacity) !== null && _a !== void 0 ? _a : 1;
        if (x.t === 'g')
            return op < 0.5 ? [] : [{ ...x, children: x.children.flatMap(walk) }];
        if (x.fill === tokens_1.plantArt.black || x.fill === tokens_1.plantArt.white || (op < 0.5 && !x.stroke))
            return [];
        if (x.fill && x.fill !== 'none') {
            const { opacity: _o, stroke: _s, sw: _w, ...geo } = x;
            return [
                { ...geo, fill: x.fill, opacity: TL.propWashOp },
                { ...geo, fill: 'none', stroke: lineFor(x.fill), sw: pt },
            ];
        }
        if (x.stroke)
            return x.stroke === tokens_1.plantArt.white ? [] : [{ ...x, stroke: lineFor(x.stroke), sw: pt * 0.8 }];
        return [x];
    };
    const out = walk(n);
    return out.length === 1 && out[0].t === 'g' ? out[0] : G(null, out);
}
const INSIDE = new WeakSet();
function measure(n, kit) {
    const prune = (x) => (x.t === 'g' ? { ...x, children: x.children.filter((c) => !INSIDE.has(c)).map(prune) } : x);
    const b = kit.bounds(prune(n));
    return { minX: b.minX - 1, minY: b.minY - 1, maxX: b.maxX + 1, maxY: b.maxY + 1 };
}
function leafGroup(ctx, id, list, palette = ctx.pal, extra = []) {
    const { TL, W } = ctx;
    let wash = '';
    let line = '';
    for (const l of list) {
        wash += l.wash + ' ';
        line += l.line + ' ';
    }
    const lineNode = line ? L(line.trim(), ctx.lineOf(palette), W.main) : null;
    if (lineNode && wash)
        INSIDE.add(lineNode);
    return G(id, [...extra, wash ? P(wash.trim(), palette[TL.washLeaf], { opacity: TL.washLeafOp }) : null, lineNode]);
}
const inkLimb = (p0, pc, p1, w0, w1, color) => P(taper(p0, pc, p1, w0, w1).closed, color);
function trunk(ctx, p0, pc, p1, w0, w1, bark, lines = true) {
    const { TL, W, fine } = ctx;
    const t = taper(p0, pc, p1, w0, w1, 16);
    const kids = [P(t.closed, bark, { opacity: TL.washWoodOp }), L(t.sides, ctx.wood(bark), W.main)];
    if (fine && lines && w0 > 9) {
        for (const [ta, tb, off] of [
            [0.18, 0.42, 0.18],
            [0.5, 0.72, -0.12],
        ]) {
            const a = qpt(p0, pc, p1, ta);
            const b = qpt(p0, pc, p1, tb);
            const w = lerp(w0, w1, ta) * off;
            kids.push(L(`M${f(a[0] + w)} ${f(a[1])}Q${f((a[0] + b[0]) / 2 + w + 1)} ${f((a[1] + b[1]) / 2)} ${f(b[0] + w)} ${f(b[1])}`, ctx.wood(bark), W.fine, { opacity: 0.7 }));
        }
    }
    return kids;
}
function roots(ctx, n, wb, bark) {
    const out = [];
    for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const k = Math.floor(i / 2);
        const x0 = 100 + side * (wb * 0.32 + k * 2);
        const x1 = 100 + side * (wb * 0.7 + 9 + k * 7);
        out.push(inkLimb([x0, ctx.base - 3], [x0 + side * 4, ctx.base], [x1, ctx.base + 1.2 + k * 0.8], 3.2 - k * 0.8, 0.4, ctx.wood(bark)));
    }
    return G('roots', out);
}
function young(ctx) {
    var _a, _b;
    const { key, sp, st, lod, TL, pal, fol, W, fine, base, A, kit } = ctx;
    if (key === 'bamboo')
        return youngBamboo(ctx);
    const body = [];
    const barkC = (_a = sp.bark) !== null && _a !== void 0 ? _a : tokens_1.plantArt.soil;
    const seedC = (_b = sp.seed) !== null && _b !== void 0 ? _b : kit.mix(barkC, tokens_1.plantArt.seedLight, 0.35);
    const leafPal = sp.fol ? fol : sp.kind === 'cloud' && sp.pal === 'blossom' ? tokens_1.plantLeaf.grove : pal === tokens_1.plantLeaf.ember || pal === tokens_1.plantLeaf.gold ? tokens_1.plantLeaf.spring : pal;
    const sw = st === 1 ? 15 : 12;
    const sh = st === 1 ? 19 : 15;
    const sx = st === 1 ? 100 : 91;
    const sy = base - sh * 0.32;
    const rot = (st === 1 ? 0 : -24) * D2R;
    const almond = xf(`M0 ${-sh / 2}C${sw * 0.42} ${-sh / 2} ${sw / 2} ${sh * 0.05} ${sw / 2} ${sh * 0.18}C${sw / 2} ${sh * 0.42} ${sw * 0.25} ${sh / 2} 0 ${sh / 2}C${-sw * 0.25} ${sh / 2} ${-sw / 2} ${sh * 0.42} ${-sw / 2} ${sh * 0.18}C${-sw / 2} ${sh * 0.05} ${-sw * 0.42} ${-sh / 2} 0 ${-sh / 2}Z`, sx, sy, rot, 1);
    const seedKids = [P(almond, seedC, { opacity: TL.washWoodOp * 2.2 }), L(almond, ctx.wood(seedC), W.main)];
    if (fine)
        seedKids.push(L(xf(`M0 ${-sh * 0.36}Q${sw * 0.12} 0 0 ${sh * 0.36}`, sx, sy, rot, 1), ctx.wood(seedC), W.fine, { opacity: 0.7 }));
    if (sp.stripe && lod !== 'icon')
        seedKids.push(L(xf(`M${-sw * 0.22} ${-sh * 0.3}L${-sw * 0.26} ${sh * 0.3}M${sw * 0.22} ${-sh * 0.3}L${sw * 0.26} ${sh * 0.3}`, sx, sy, rot, 1), ctx.wood(seedC), W.fine || W.main * 0.6, { opacity: 0.6 }));
    if (key === 'cactus' && st === 2)
        return youngCactus(ctx);
    if (st === 1) {
        const top = [sx, sy - sh / 2 + 1];
        const tip = [sx + 4, top[1] - 9];
        const lf = leaf('lens', tip[0], tip[1], 8, -40 * D2R, fine);
        body.push(G('trunk', seedKids));
        body.push(G('sprout', [L(Q(top, [sx - 1, top[1] - 6], tip), ctx.lineOf(leafPal), W.main), P(lf.wash, leafPal[TL.washLeaf], { opacity: TL.washLeafOp }), L(lf.line, ctx.lineOf(leafPal), W.main)]));
        A.crown = { x: 100, y: sy - sh / 2 - 1 };
        A.canopyBox = { cx: 100, cy: sy, rx: sw * 0.7, ry: sh * 0.6 };
        A.neck = { x: 100, y: sy - sh * 0.28, w: sw * 0.82 };
    }
    else {
        const topY = 118;
        const p0 = [100, base];
        const pc = [99, base - 26];
        const p1 = [101, topY];
        const cot = [leaf('lens', 101, topY + 3, 22, -150 * D2R, fine), leaf('lens', 101, topY + 1, 24, -30 * D2R, fine)];
        const trueKind = sp.kind === 'cloud' && sp.leaf !== 'blossom' && sp.leaf !== 'needle' ? sp.leaf : sp.kind === 'palm' ? 'long' : sp.kind === 'pine' || sp.kind === 'bonsai' ? 'olive' : 'lens';
        const tl = leaf(trueKind, 101, topY - 1, trueKind === 'oak' || trueKind === 'maple' ? 15 : 13, -95 * D2R, fine);
        body.push(G('trunk', seedKids));
        body.push(G('stem', [L(`M${p0[0]} ${f(p0[1])}Q${pc[0]} ${f(pc[1])} ${p1[0]} ${p1[1]}`, ctx.lineOf(leafPal), W.main)]));
        body.push(leafGroup(ctx, 'leaves', [...cot, tl], leafPal));
        A.crown = { x: 100, y: topY - 14 };
        A.canopyBox = { cx: 100, cy: (topY + base) / 2, rx: 26, ry: (base - topY) / 2 + 8 };
        A.neck = { x: 100, y: base - 12, w: 6 };
    }
    A.perch = { x: 100 - 22, y: base + 1 };
    A.branchL = { x: 80, y: base - 10 };
    A.branchR = { x: 120, y: base - 10 };
    A.drift = A.crown;
    return { body };
}
function youngBamboo(ctx) {
    const { st, base, W, TL, A } = ctx;
    const [w, h] = st === 1 ? [16, 20] : [18, 36];
    const sheath = tokens_1.plantArt.bamboo.sheathMid;
    const shoot = `M${100 - w / 2} ${f(base + 1)}Q${f(100 - w * 0.45)} ${f(base - h * 0.55)} 100 ${f(base - h)}Q${f(100 + w * 0.45)} ${f(base - h * 0.55)} ${100 + w / 2} ${f(base + 1)}`;
    const kids = [P(shoot + 'Z', sheath, { opacity: TL.washWoodOp * 2 }), L(shoot, ctx.wood(sheath), W.main)];
    kids.push(L(`M${f(100 - w * 0.3)} ${f(base - 2)}Q${f(100 - w * 0.1)} ${f(base - h * 0.45)} 100 ${f(base - h * 0.78)}M${f(100 + w * 0.32)} ${f(base - 3)}Q${f(100 + w * 0.12)} ${f(base - h * 0.4)} 101 ${f(base - h * 0.6)}`, ctx.wood(sheath), W.fine || W.main * 0.7, { opacity: 0.7 }));
    const body = [G(st === 1 ? 'sprout' : 'trunk', kids)];
    if (st === 2)
        body.push(leafGroup(ctx, 'leaves', [leaf('olive', 100, base - h + 1, 15, -55 * D2R, ctx.fine), leaf('olive', 100, base - h + 3, 13, -130 * D2R, ctx.fine)], tokens_1.plantLeaf.grove));
    A.crown = { x: 100, y: base - h - 3 };
    A.canopyBox = { cx: 100, cy: base - h * 0.5, rx: w * 0.8, ry: h * 0.6 };
    A.perch = { x: 100 - w * 0.95, y: base + 1 };
    A.neck = { x: 100, y: base - h * 0.55, w: w * 0.62 };
    A.drift = A.crown;
    return { body };
}
function youngCactus(ctx) {
    const { base, W, TL, fol, A, fine } = ctx;
    const r = 12;
    const cy = base - r + 2;
    const ring = `M${100 - r} ${f(cy)}A${r} ${r} 0 1 1 ${100 + r} ${f(cy)}A${r} ${r} 0 1 1 ${100 - r} ${f(cy)}Z`;
    const kids = [P(ring, fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(ring, ctx.lineOf(fol), W.main)];
    if (fine)
        kids.push(L(`M100 ${f(cy - r)}Q96 ${f(cy)} 100 ${f(cy + r)}M100 ${f(cy - r)}Q105 ${f(cy)} 100 ${f(cy + r)}`, ctx.lineOf(fol), W.fine, { opacity: 0.7 }));
    let spines = '';
    for (let i = 0; i < 7; i++) {
        const a = (-160 + i * 23) * D2R;
        spines += `M${f(100 + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}l${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3)}`;
    }
    kids.push(L(spines, ctx.lineOf(fol), W.main * 0.7, { opacity: 0.8 }));
    A.crown = { x: 100, y: cy - r - 3 };
    A.canopyBox = { cx: 100, cy, rx: r * 1.4, ry: r * 1.2 };
    A.perch = { x: 100 - r * 1.3, y: base + 1 };
    A.neck = { x: 100, y: cy - r * 0.55, w: r * 1.5 };
    A.drift = A.crown;
    return { body: [G('trunk', kids)] };
}
function cloudTree(ctx) {
    var _a, _b;
    const { sp, st, lod, TL, pal, W, fine, seed, sc, base, A, kit } = ctx;
    const g = GEO[st];
    const cr = sp.crown;
    const bark = sp.bark;
    const woodC = ctx.wood(bark);
    const r = kit.rng(seed);
    const cx = 100;
    const cy = g.cy + ((_a = cr.dy) !== null && _a !== void 0 ? _a : 0) * (st / 5);
    const rx = g.rx * cr.sx * (st >= 5 ? 1 : 0.95);
    const ry = g.ry * cr.sy;
    const isBlossom = sp.leaf === 'blossom';
    const leafKind = sp.leaf === 'blossom' || sp.leaf === 'needle' ? 'lens' : sp.leaf;
    const flare = (_b = sp.flare) !== null && _b !== void 0 ? _b : 0.35;
    const top = st === 3 ? g.top : Math.min(g.top, cy + ry * 0.35);
    const tk = trunk(ctx, [100, base + 1], [100, (base + top) / 2], [100, top], g.wb * (1 + flare * 0.25), g.wt, bark);
    const branches = [];
    const domains = [];
    const leafLen = { icon: st === 3 ? 22 : 0, small: 17, full: 12.5 }[lod] * (leafKind === 'maple' || leafKind === 'oak' ? 1.08 : leafKind === 'long' ? 1.35 : 1) * (st === 3 ? 0.9 : 1);
    const blossomR = { icon: 0, small: 3.8, full: 3.1 }[lod];
    const makeLeaf = (x, y, ang, s = 1) => {
        if (!isBlossom)
            return leaf(leafKind, x, y, leafLen * s, ang, fine);
        const d = blossom(x, y, blossomR * s, r() * 70);
        return { wash: d, line: d };
    };
    if (st === 3) {
        branches.push(L(Q([100, top + 2], [98, top - 24], [101, top - 50]), woodC, W.main));
        const twigs = [
            [[100, top - 6], [86, top - 14], [74, top - 22], -1],
            [[100, top - 18], [114, top - 26], [126, top - 34], 1],
            [[100, top - 32], [88, top - 40], [80, top - 50], -1],
        ];
        const list = [];
        for (const [p0, pc, p1, side] of twigs) {
            branches.push(L(Q(p0, pc, p1), woodC, W.main * 0.9));
            const n = lod === 'full' ? 3 : 2;
            for (let i = 1; i <= n; i++) {
                const t = i / (n + 0.2);
                const [x, y] = qpt(p0, pc, p1, t);
                list.push(makeLeaf(x, y, qtan(p0, pc, p1, t) + (i % 2 ? -1 : 1) * 0.9 * side, 0.9));
            }
            list.push(makeLeaf(p1[0], p1[1], qtan(p0, pc, p1, 1), 1));
        }
        list.push(makeLeaf(101, top - 50, -90 * D2R, 1.05));
        list.push(makeLeaf(99, top - 42, -140 * D2R, 0.85), makeLeaf(100, top - 44, -40 * D2R, 0.85));
        domains.push(leafGroup(ctx, null, list));
        A.canopyBox = { cx, cy: top - 28, rx: 30, ry: 30 };
    }
    else {
        const lobes = [0, 1, 2, 3, 4].map((i) => {
            const th = (cr.a0 + i * cr.step) * D2R;
            const s = sc[i];
            return { i, s, x: cx + rx * cr.spread * Math.cos(th), y: cy + ry * cr.spread * 0.95 * Math.sin(th), R: Math.min(rx, ry * 1.25) * (0.44 + 0.04 * (st - 4)) * s, th };
        });
        const limbW = { 4: 4.2, 5: 6, 6: 7.5 }[st];
        const trunkLen = base - top;
        const leaveAt = [0.3, 0.12, 0, 0.12, 0.3].map((u) => top + trunkLen * u * (st === 4 ? 0.8 : 1));
        const massTone = ctx.dark && (pal === tokens_1.plantLeaf.snow || pal === tokens_1.plantLeaf.pearl) ? pal.deep : pal[TL.washMass];
        for (const k of [0, 4, 1, 3, 2]) {
            const Lb = lobes[k];
            const y0 = leaveAt[k];
            const half = lerp(g.wt, g.wb, (y0 - top) / trunkLen) / 2;
            const side = Math.sign(Math.cos(Lb.th)) || 0;
            const start = [100 + side * half * 0.55, y0 + 2];
            const end = [Lb.x - Math.cos(Lb.th) * Lb.R * 0.25, Lb.y + Lb.R * 0.15];
            const ctrl = k === 2 ? [100, lerp(start[1], end[1], 0.5)] : [lerp(start[0], end[0], 0.55), lerp(start[1], end[1], 0.2) - 2];
            const w0 = limbW * (k === 2 ? 1.05 : k === 0 || k === 4 ? 0.8 : 0.72);
            branches.push(inkLimb(start, ctrl, end, w0, 1.2, woodC));
            const nT = lod === 'full' ? 3 : 2;
            let twigs = '';
            const tips = [];
            for (let j = 0; j < nT; j++) {
                const a = Lb.th + (j - (nT - 1) / 2) * 0.9 + (r() - 0.5) * 0.3;
                const tip = [Lb.x + Math.cos(a) * Lb.R * 0.72, Lb.y + Math.sin(a) * Lb.R * 0.62];
                twigs += Q(end, [lerp(end[0], tip[0], 0.5) + (r() - 0.5) * 4, lerp(end[1], tip[1], 0.5) - 3], tip);
                tips.push({ tip, a });
            }
            if (lod !== 'icon')
                branches.push(L(twigs, woodC, W.main * 0.85));
            const nLeaf = Math.round((lod === 'full' ? 7 : lod === 'small' ? 5 : 0) * (0.75 + 0.3 * Lb.s) * (isBlossom ? 1.15 : 1));
            const list = [];
            for (let j = 0; j < nLeaf; j++) {
                const a = Lb.th + ((j + 0.5) / nLeaf - 0.5) * Math.PI * 1.7 + (r() - 0.5) * 0.35;
                const d = (j % 3 === 2 ? 0.35 : 0.68) + r() * 0.18;
                const x = Lb.x + Math.cos(a) * Lb.R * d;
                const y = Lb.y + Math.sin(a) * Lb.R * d * 0.82;
                const down = Math.sin(a) > 0.55;
                list.push(makeLeaf(x, y, a + (r() - 0.5) * 0.5 + (down ? 0.35 * Math.sign(Math.cos(a) || 1) : 0), 0.85 + r() * 0.3));
            }
            for (const t of tips)
                list.push(makeLeaf(t.tip[0], t.tip[1], t.a + (r() - 0.5) * 0.3, 1.05));
            const mass = kit.scallop({ cx: Lb.x, cy: Lb.y, rx: Lb.R * 1.02, ry: Lb.R * 0.86, n: 7, seed: seed + k * 7, jit: 0.45, bulge: 0.5, flat: 0.2 });
            const massNode = P(mass, massTone, { opacity: lod === 'icon' ? 0.85 : TL.washMassOp + (isBlossom ? 0.08 : 0) + (lod === 'small' ? 0.1 : 0) });
            domains[k] = leafGroup(ctx, `domain-${k + 1}`, list, pal, [massNode, lod === 'icon' ? L(mass, ctx.lineOf(pal), W.main) : null]);
            A.organs[k] = { x: Lb.x + (Lb.x - cx) * 0.3, y: Lb.y + (Lb.y - cy) * 0.3 };
        }
        A.canopyBox = { cx, cy, rx: rx * 0.98, ry: ry * 0.95 };
        A.lobes = lobes;
    }
    const behind = st >= 5 ? [roots(ctx, st === 6 ? 4 : 2, g.wb, bark)] : [];
    const order = st === 3 ? domains : [0, 4, 1, 3, 2].map((k) => domains[k]);
    const body = [G('trunk', tk), G('branches', branches), G('canopy', order), G('leaves', [])];
    if (st === 6 || (st === 5 && sp.fruitFrom === 5))
        body.push(flourishCloud(ctx, r));
    const box = A.canopyBox;
    A.crown = { x: box.cx + 4, y: box.cy - box.ry * 0.97 };
    A.perch = st === 3 ? { x: 86, y: top - 14 } : { x: box.cx - box.rx * 0.5, y: box.cy - box.ry * 0.62 };
    A.branchL = { x: box.cx - box.rx * 0.58, y: box.cy + box.ry * 0.62 };
    A.branchR = { x: box.cx + box.rx * 0.6, y: box.cy + box.ry * 0.62 };
    A.neck = { x: 100, y: top + 6, w: g.wt * 1.4 };
    A.drift = { x: box.cx + box.rx * 0.7, y: box.cy + box.ry * 0.4 };
    return { body, behind };
}
function flourishCloud(ctx, r) {
    const { sp, st, lod, W, A } = ctx;
    if (lod === 'icon' || !A.lobes)
        return G('blooms', []);
    const kids = [];
    const pts = [];
    for (const Lb of A.lobes) {
        const n = lod === 'full' ? 2 : 1;
        for (let j = 0; j < n; j++) {
            const a = Lb.th + (r() - 0.5) * 2.2;
            pts.push([Lb.x + Math.cos(a) * Lb.R * 0.5, Lb.y + Math.sin(a) * Lb.R * 0.45]);
        }
    }
    const washOp = 0.75;
    if (sp.flourish === 'acorn')
        for (const [x, y] of pts) {
            const nut = `M${f(x - 2.4)} ${f(y)}Q${f(x - 2.4)} ${f(y + 5.4)} ${f(x)} ${f(y + 5.8)}Q${f(x + 2.4)} ${f(y + 5.4)} ${f(x + 2.4)} ${f(y)}Z`;
            const cap = `M${f(x - 3)} ${f(y + 0.6)}Q${f(x)} ${f(y - 3.4)} ${f(x + 3)} ${f(y + 0.6)}Z`;
            kids.push(P(nut, GIFT.acorn, { opacity: washOp }), L(nut + cap + `M${f(x)} ${f(y - 2.2)}l0.6 -2`, ctx.giftLine(GIFT.acorn), W.main * 0.9));
        }
    if (sp.flourish === 'samara')
        for (const [x, y] of pts) {
            const d = xf('M0 0C-1 -3 -6 -6 -8 -4C-6 -2 -3 -1 0 0ZM0 0C1 -3 6 -6 8 -4C6 -2 3 -1 0 0Z', x, y, (r() - 0.5) * 0.8, 0.9);
            kids.push(P(d, GIFT.samara, { opacity: washOp }), L(d, ctx.giftLine(tokens_1.plantLeaf.ember.mid), W.main * 0.85));
        }
    if (sp.flourish === 'narra' || sp.flourish === 'blossom') {
        const narra = sp.flourish === 'narra';
        const fill = narra ? GIFT.narra : GIFT.cherryBloom;
        for (const [x, y] of pts.concat(pts.map(([x, y]) => [x + 6, y - 4]))) {
            const d = blossom(x, y, 2.2, r() * 70);
            kids.push(P(d, fill, { opacity: 0.9 }), L(d, ctx.giftLine(narra ? GIFT.narraCore : GIFT.cherryCore), W.main * 0.8));
        }
    }
    if (sp.flourish === 'mango') {
        const ripe = st === 6;
        const { cx, cy, rx, ry } = A.canopyBox;
        const xs = ripe ? [-0.62, -0.38, 0.38, 0.62, -0.8, 0.8] : [-0.55, -0.3, 0.3, 0.55];
        for (const dx of xs) {
            const x = cx + rx * dx;
            const y = cy + ry * 0.55 + 6 + r() * 4;
            const fr = xf('M0.6 -6.2C4.6 -6.4 6.2 -1.2 5.2 3C4.2 7 -0.6 8.6 -3.6 6.2C-6.2 4 -5.4 -6 0.6 -6.2Z', x, y + 6, (r() - 0.5) * 0.4, 1.05);
            kids.push(L(`M${f(x)} ${f(y - 4)}L${f(x)} ${f(y + 0.5)}`, ctx.wood(BARK.mango), W.main * 0.8), P(fr, ripe ? GIFT.mangoRipe : GIFT.mangoGreen, { opacity: washOp }), L(fr, ctx.giftLine(ripe ? GIFT.mangoBlush : GIFT.mangoGreen), W.main * 0.9));
        }
    }
    return G('blooms', kids);
}
function pineTree(ctx) {
    const { st, lod, TL, pal, W, seed, sc, base, A, kit } = ctx;
    const g = GEO[st];
    const bark = BARK.pine;
    const woodC = ctx.wood(bark);
    const count = st >= 4 ? 5 : 3;
    const topY = g.cy - g.ry * 0.95;
    const bottom = g.cy + g.ry * 0.62;
    const lean = 1 + st * 0.4;
    const trunkTop = topY + 4;
    const tk = trunk(ctx, [100, base + 1], [100 + lean * 0.3, (base + trunkTop) / 2], [100 + lean, trunkTop], g.wb * 0.85, 1.6, bark);
    const branches = [];
    const pads = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const dom = count - 1 - i;
        const s = st >= 4 ? sc[dom] : 1;
        const y = lerp(topY + 8, bottom, t);
        const side = i === 0 ? 0 : i % 2 ? -1 : 1;
        const w = lerp(g.rx * 0.32, g.rx * 0.92, t) * s * (st === 3 ? 1.15 : 1);
        pads.push({ x: 100 + lean * (1 - t) + side * w * 0.38, y, w, side, dom });
    }
    const groups = [];
    pads.forEach((p, k) => {
        const trunkX = 100 + lean * ((base - p.y) / (base - trunkTop));
        const p0 = [trunkX, p.y + 5];
        const p1 = [p.x + p.side * p.w * 0.45, p.y - 1];
        if (p.side !== 0)
            branches.push(inkLimb(p0, [lerp(p0[0], p1[0], 0.5), p.y + 4], p1, 2.6 + st * 0.3, 0.8, woodC));
        const ry = Math.max(6, p.w * 0.28);
        const mass = kit.scallop({ cx: p.x, cy: p.y, rx: p.w * 0.6, ry, n: 9, seed: seed + k * 13, jit: 0.3, bulge: 0.55, flat: 0.55 });
        let nd = '';
        const n = lod === 'icon' ? 0 : Math.max(3, Math.round(p.w / (lod === 'full' ? 9 : 13)));
        for (let j = 0; j < n; j++) {
            const u = j / (n - 1);
            const x = p.x - p.w * 0.52 + u * p.w * 1.04;
            const yy = p.y - ry * 0.35 * Math.sin(Math.PI * u) + 2;
            nd += needles(x, yy, lod === 'full' ? 8 : 10, -Math.PI / 2 + (u - 0.5) * 1.6, lod === 'full' ? 4 : 3, 1.5);
        }
        const kids = [P(mass, pal[TL.washMass], { opacity: lod === 'icon' ? 0.85 : TL.washMassOp + 0.12 })];
        kids.push(lod === 'icon' ? L(mass, ctx.lineOf(pal), W.main) : L(nd, ctx.lineOf(pal), lod === 'full' ? W.fine * 1.3 : W.main * 0.8));
        groups.push(G(count === 5 ? `domain-${p.dom + 1}` : null, kids));
        if (count === 5)
            A.organs[p.dom] = { x: p.x, y: p.y };
    });
    const body = [G('trunk', tk), G('branches', branches), G('canopy', groups), G('leaves', [])];
    if (st === 6 && lod !== 'icon') {
        const kids = [];
        for (const p of pads.slice(1)) {
            const x = p.x + p.side * p.w * 0.3;
            const y = p.y + 9;
            const d = `M${f(x - 2.6)} ${f(y)}A2.6 4 0 1 0 ${f(x + 2.6)} ${f(y)}A2.6 4 0 1 0 ${f(x - 2.6)} ${f(y)}Z`;
            kids.push(P(d, GIFT.cone, { opacity: 0.7 }), L(d + `M${f(x - 2.2)} ${f(y - 1.2)}h4.4M${f(x - 2.4)} ${f(y + 1.2)}h4.8`, ctx.wood(GIFT.cone), W.main * 0.8));
        }
        body.push(G('blooms', kids));
    }
    A.canopyBox = { cx: 100, cy: (topY + bottom) / 2, rx: g.rx, ry: (bottom - topY) / 2 + 8 };
    A.crown = { x: pads[0].x, y: topY - 4 };
    A.perch = { x: pads[1].x - 4, y: pads[1].y - 6 };
    A.neck = { x: 100, y: bottom + 8, w: g.wb * 0.6 };
    A.branchL = { x: 70, y: bottom };
    A.branchR = { x: 130, y: bottom };
    A.drift = { x: 130, y: bottom };
    return { body, behind: st >= 5 ? [roots(ctx, 2, g.wb, bark)] : [] };
}
function palmTree(ctx) {
    const { st, lod, pal, W, sc, base, A } = ctx;
    const bark = BARK.coconut;
    const lean = 4 + st * 2;
    const crown = { x: 100 + lean, y: { 3: 112, 4: 94, 5: 78, 6: 68 }[st] };
    const tp0 = [100, base + 1];
    const tpc = [98, (base + crown.y) / 2];
    const tp1 = [crown.x, crown.y + 3];
    const tk = trunk(ctx, tp0, tpc, tp1, { 3: 9, 4: 11, 5: 13, 6: 14 }[st], { 3: 6, 4: 7, 5: 8, 6: 8 }[st], bark, false);
    if (lod !== 'icon') {
        let rings = '';
        for (let t = 0.12; t < 0.92; t += lod === 'full' ? 0.09 : 0.14) {
            const [x, y] = qpt(tp0, tpc, tp1, t);
            const w = lerp(10, 7, t) * 0.5;
            rings += `M${f(x - w)} ${f(y)}Q${f(x)} ${f(y + 2)} ${f(x + w)} ${f(y)}`;
        }
        tk.push(L(rings, ctx.wood(bark), (W.fine || W.main) * 0.9, { opacity: 0.75 }));
    }
    const angs = st >= 4 ? [-168, -132, -96, -58, -14] : [-150, -98, -36];
    const Lb = { 3: 40, 4: 56, 5: 68, 6: 76 }[st];
    const order = st >= 4 ? [2, 1, 3, 0, 4] : [1, 0, 2];
    const fronds = [];
    for (const k of order) {
        const Ln = Lb * (st >= 4 ? sc[k] : 1);
        const a = angs[k] * D2R;
        const droop = Ln * 0.12 + Math.abs(Math.cos(a)) * Ln * 0.36;
        const p0 = [crown.x, crown.y];
        const p2 = [crown.x + Math.cos(a) * Ln, crown.y + Math.sin(a) * Ln * 0.75 + droop];
        const p1 = [crown.x + Math.cos(a) * Ln * 0.62, crown.y + Math.sin(a) * Ln * 0.75 * 0.62 - Ln * 0.12];
        const n = lod === 'full' ? 9 : lod === 'small' ? 6 : 0;
        const list = [];
        for (let i = 1; i <= n; i++) {
            const t = i / (n + 1);
            const [x, y] = qpt(p0, p1, p2, t);
            const tan = qtan(p0, p1, p2, t);
            const len = Ln * 0.3 * (1 - t * 0.55);
            for (const sd of [1, -1])
                list.push(leaf('long', x, y, len, tan + sd * 0.75 + 0.25, false));
        }
        const kids = [];
        if (lod === 'icon')
            kids.push(P(taper(p0, p1, p2, Ln * 0.22, 2).closed, pal.mid, { opacity: 0.85 }));
        kids.push(L(Q(p0, p1, p2), ctx.lineOf(pal), W.main));
        fronds.push(leafGroup(ctx, st >= 4 ? `domain-${k + 1}` : null, list, pal, kids));
        if (st >= 4) {
            const [ox, oy] = qpt(p0, p1, p2, 0.6);
            A.organs[k] = { x: ox, y: oy };
        }
    }
    const body = [G('trunk', tk), G('canopy', fronds), G('leaves', [])];
    if (st >= 5 && lod !== 'icon') {
        const m = st === 6 ? 5 : 3;
        const nut = pal === tokens_1.plantLeaf.golden ? GIFT.coconutGolden : st === 6 ? GIFT.coconutRipe : GIFT.coconutGreen;
        const kids = [];
        for (const [dx, dy] of [
            [-6, 9],
            [6, 10],
            [0, 15],
            [-12, 15],
            [11, 16],
        ].slice(0, m)) {
            const x = crown.x + dx;
            const y = crown.y + dy;
            const rr = st === 6 ? 6 : 5.4;
            const d = `M${f(x - rr)} ${f(y)}A${rr} ${rr} 0 1 0 ${f(x + rr)} ${f(y)}A${rr} ${rr} 0 1 0 ${f(x - rr)} ${f(y)}Z`;
            kids.push(P(d, nut, { opacity: 0.7 }), L(d, ctx.wood(nut), W.main * 0.9));
        }
        body.push(G('blooms', kids));
    }
    A.canopyBox = { cx: crown.x, cy: crown.y + 4, rx: Lb, ry: Lb * 0.55 };
    A.crown = { x: crown.x, y: crown.y - 6 };
    A.perch = { x: crown.x - 4, y: crown.y - 4 };
    A.neck = { x: 100, y: base - 30, w: 10 };
    A.drift = { x: crown.x + Lb * 0.5, y: crown.y + 20 };
    return { body };
}
function bonsaiTree(ctx) {
    var _a, _b;
    const { st, lod, TL, pal, W, seed, sc, base, A, kit } = ctx;
    const bark = BARK.bonsai;
    const woodC = ctx.wood(bark);
    const g = GEO[st];
    const k = st / 5;
    const r = kit.rng(seed);
    const wb = { 3: 9, 4: 12, 5: 15, 6: 18 }[st];
    const pC = [104, base - 52 * k - 10];
    const S = cubic([100, base + 1], [112, base - 22 * k], [76, base - 34 * k - 4], pC);
    const t1 = taper([0, 0], [0, 0], [0, 0], wb, wb * 0.4, 24, S);
    const tk = [P(t1.closed, bark, { opacity: TL.washWoodOp }), L(t1.sides, woodC, W.main)];
    const spots = st >= 4
        ? [
            [-0.86, 0.55, 0.42, 0.2],
            [-0.42, -0.05, 0.4, 0.22],
            [0.2, -0.62, 0.42, 0.26],
            [0.56, 0.0, 0.4, 0.22],
            [0.86, 0.5, 0.44, 0.2],
        ]
        : [
            [0.12, -0.5, 0.55, 0.3],
            [-0.6, 0.3, 0.45, 0.24],
        ];
    const hx = Math.min(g.rx, 62);
    const branches = [];
    const groups = [];
    spots.forEach(([ox, oy, sx, sy], i) => {
        const s = st >= 4 ? sc[i] : 1;
        const p = { x: 100 + ox * hx, y: g.cy + 22 * (g.rx / 70) + oy * g.ry, rx: sx * hx * s, ry: Math.max(7, sy * g.ry * s) };
        branches.push(inkLimb([pC[0] + (ox < 0 ? -2 : 2), pC[1] + 10 + oy * 12], [lerp(pC[0], p.x, 0.5), pC[1] + 4 + oy * 10], [p.x, p.y + p.ry * 0.4], 2.6 + st * 0.35, 0.8, woodC));
        const mass = kit.scallop({ cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, n: 8, seed: seed + i * 13, jit: 0.3, bulge: 0.62, flat: 0.5 });
        let topLine = '';
        const n = lod === 'icon' ? 0 : lod === 'full' ? 5 : 4;
        for (let j = 0; j < n; j++) {
            const u = (j + 0.5) / n;
            const x = p.x - p.rx + u * p.rx * 2;
            const y = p.y - p.ry * 0.8 * Math.sin(Math.PI * u) + 1;
            topLine += needles(x, y + 2, lod === 'full' ? 7 : 9, -Math.PI / 2 + (u - 0.5) * 1.2, 3, 1.5);
        }
        const kids = [P(mass, pal[TL.washMass], { opacity: lod === 'icon' ? 0.85 : TL.washMassOp + 0.14 })];
        kids.push(lod === 'icon' ? L(mass, ctx.lineOf(pal), W.main) : L(topLine, ctx.lineOf(pal), lod === 'full' ? W.fine * 1.3 : W.main * 0.8));
        groups.push(G(st >= 4 ? `domain-${i + 1}` : null, kids));
        if (st >= 4)
            A.organs[i] = { x: p.x, y: p.y };
    });
    const body = [G('trunk', tk), G('branches', branches), G('canopy', groups), G('leaves', [])];
    if (st === 6 && lod !== 'icon') {
        const kids = [];
        for (const o of A.organs) {
            const d = blossom(o.x + 4, o.y - 3, 2, r() * 60);
            kids.push(P(d, tokens_1.plantArt.white, { opacity: 0.9 }), L(d, ctx.lineOf(tokens_1.plantLeaf.pearl), W.main * 0.7));
        }
        body.push(G('blooms', kids));
    }
    A.canopyBox = { cx: 100, cy: g.cy + 10 * (g.rx / 70), rx: hx * 1.05, ry: g.ry * 0.75 };
    A.crown = { x: 104, y: g.cy - g.ry * 0.5 };
    A.perch = { x: ((_a = A.organs[0]) !== null && _a !== void 0 ? _a : { x: 60 }).x + 4, y: ((_b = A.organs[0]) !== null && _b !== void 0 ? _b : { y: 120 }).y - 6 };
    A.neck = { x: 92, y: base - 30, w: wb * 0.7 };
    A.drift = { x: 140, y: g.cy + 10 };
    return { body };
}
function stemLine(ctx, p0, pc, p1, w, palette) {
    if (w < 3.2)
        return [L(Q(p0, pc, p1), ctx.lineOf(palette), ctx.W.main)];
    const t = taper(p0, pc, p1, w, w * 0.6);
    return [P(t.closed, palette[ctx.TL.washLeaf], { opacity: ctx.TL.washLeafOp }), L(t.sides, ctx.lineOf(palette), ctx.W.main)];
}
const disc = (x, y, r) => `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`;
function sunflower(ctx) {
    var _a, _b;
    const { st, lod, TL, pal, fol, W, fine, sc, base, A } = ctx;
    const g4 = st;
    const hy = { 3: 114, 4: 82, 5: 70, 6: 62 }[g4];
    const hx = 100 + (st >= 5 ? 4 : 2);
    const p0 = [100, base];
    const pc = [98, base - (base - hy) * 0.45];
    const p1 = [hx, hy];
    const body = [G('stem', stemLine(ctx, p0, pc, p1, { 3: 3, 4: 4, 5: 4.6, 6: 5.4 }[g4], fol))];
    const leaves = [];
    const at = (t) => qpt(p0, pc, p1, t);
    if (st === 3) {
        const list = [
            [-1, 0.2, 20],
            [1, 0.22, 20],
            [-1, 0.48, 15],
            [1, 0.5, 15],
        ].map(([s, t, len]) => {
            const [x, y] = at(t);
            return leaf('banyan', x, y, len, (-90 + s * 58) * D2R, fine);
        });
        leaves.push(leafGroup(ctx, null, list, fol));
    }
    else {
        for (let i = 0; i < 5; i++) {
            const side = i % 2 ? 1 : -1;
            const [x, y] = at(0.1 + i * 0.15);
            const len = (17 + st * 2.4) * sc[i] * (1 - i * 0.05) * (lod === 'small' ? 1.1 : 1);
            leaves.push(leafGroup(ctx, `domain-${i + 1}`, [leaf('banyan', x, y, len, (-90 + side * (62 - i * 3)) * D2R, fine)], fol));
            A.organs[i] = { x: x + side * len * 0.5, y: y - len * 0.3 };
        }
    }
    body.push(G('leaves', leaves));
    const head = [];
    if (st <= 4) {
        const rr = st === 3 ? 9 : 13;
        let sep = '';
        const nS = st === 3 ? 6 : 8;
        for (let i = 0; i < nS; i++)
            sep += xf('M0 0Q0.4 -0.6 0 -1Q-0.4 -0.6 0 0Z', hx, hy, (i / nS) * 2 * Math.PI, rr * 1.15) + ' ';
        head.push(P(sep, fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(sep, ctx.lineOf(fol), W.main));
        if (st === 4) {
            let pet = '';
            for (let i = 0; i < 12; i++)
                pet += xf('M0 0Q0.32 -0.55 0 -1Q-0.32 -0.55 0 0Z', hx + Math.cos(i * 0.5236) * rr * 0.55, hy + Math.sin(i * 0.5236) * rr * 0.55, i * 0.5236 + Math.PI / 2, rr * 0.75) + ' ';
            head.push(P(pet, pal[TL.washLeaf], { opacity: 0.8 }), L(pet, ctx.lineOf(pal), W.main * 0.9));
        }
        const d = disc(hx, hy, rr * 0.6);
        head.push(P(d, fol[TL.washLeaf], { opacity: 0.8 }), L(d, ctx.lineOf(fol), W.main));
        A.canopyBox = { cx: hx, cy: hy, rx: rr * 1.4, ry: rr * 1.4 };
    }
    else {
        const R = st === 5 ? 15 : 19;
        const pl = st === 5 ? 14 : 17;
        const np = st === 5 ? 16 : 20;
        let pet = '';
        let pet2 = '';
        for (let i = 0; i < np; i++) {
            const a = (i / np) * 2 * Math.PI;
            const d = xf('M0 0Q0.36 -0.5 0 -1Q-0.36 -0.5 0 0Z', hx + Math.cos(a) * R * 0.86, hy + Math.sin(a) * R * 0.86, a + Math.PI / 2, pl);
            if (i % 2)
                pet2 += d + ' ';
            else
                pet += d + ' ';
        }
        head.push(P(pet2, pal[TL.washLeaf], { opacity: 0.65 }), L(pet2, ctx.lineOf(pal), W.main * 0.9), P(pet, pal[TL.washLeaf], { opacity: 0.85 }), L(pet, ctx.lineOf(pal), W.main));
        const dc = tokens_1.plantArt.sunflower.discMid;
        const d = disc(hx, hy, R);
        head.push(P(d, dc, { opacity: ctx.dark ? 0.55 : 0.3 }), L(d, ctx.wood(dc), W.main));
        if (lod !== 'icon') {
            let dots = '';
            const n = lod === 'full' ? 34 : 14;
            for (let i = 1; i <= n; i++) {
                const rr = R * 0.82 * Math.sqrt(i / n);
                const a = i * 2.39996;
                dots += `M${f(hx + Math.cos(a) * rr)} ${f(hy + Math.sin(a) * rr)}h0.01`;
            }
            head.push(L(dots, ctx.wood(dc), 1.6));
        }
        A.canopyBox = { cx: hx, cy: hy, rx: R + pl, ry: R + pl };
    }
    body.push(G('head', head));
    A.crown = { x: hx, y: hy - A.canopyBox.ry };
    A.perch = { x: ((_a = A.organs[1]) !== null && _a !== void 0 ? _a : { x: 86 }).x, y: ((_b = A.organs[1]) !== null && _b !== void 0 ? _b : { y: 140 }).y - 4 };
    A.neck = { x: 100, y: hy + 30, w: 5 };
    A.drift = { x: hx + 20, y: hy + 10 };
    return { body };
}
function lotus(ctx) {
    const { st, TL, pal, fol, W, fine, sc, base, A } = ctx;
    const wy = base - 1;
    const pad = (x, y, rx, ry) => {
        const notch = `M${f(x)} ${f(y)}L${f(x + rx * 0.95)} ${f(y - ry * 0.25)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x + rx * 0.95)} ${f(y + ry * 0.25)}Z`;
        let veins = '';
        if (fine)
            for (let i = 1; i < 7; i++) {
                const a = 0.4 + i * 0.85;
                veins += `M${f(x)} ${f(y)}L${f(x + Math.cos(a) * rx * 0.85)} ${f(y + Math.sin(a) * ry * 0.85)}`;
            }
        return { wash: notch, line: notch + veins };
    };
    const petal = (x, y, len, ang, w = 0.34) => xf(`M0 0Q${f(w * 1.4)} -0.5 0 -1Q${f(-w * 1.4)} -0.5 0 0Z`, x, y, ang + Math.PI / 2, len);
    const body = [];
    const behind = [];
    const n = st >= 4 ? 5 : st === 3 ? 2 : 0;
    const spots = [
        [-0.62, 0.0, 13],
        [0.6, 0.05, 12],
        [-0.28, -0.6, 10],
        [0.3, -0.62, 10],
        [0.0, 0.1, 9],
    ];
    for (let i = 0; i < n; i++) {
        const [dx, dy, r0] = spots[i];
        const rr = r0 * (st >= 4 ? sc[i] : 1) * (0.85 + st * 0.08);
        const x = 100 + dx * (30 + st * 6);
        const y = wy - 2 + dy * 10;
        const kids = [];
        let shape;
        let at;
        if (dy < -0.3) {
            const top = y - 18 - st * 4;
            kids.push(L(Q([x, wy], [x - dx * 6, (wy + top) / 2], [x, top]), ctx.lineOf(fol), W.main));
            shape = pad(x, top, rr, rr * 0.42);
            at = [x, top];
        }
        else {
            shape = pad(x, y, rr, rr * 0.34);
            at = [x, y];
        }
        const grp = leafGroup(ctx, st >= 4 ? `domain-${i + 1}` : null, [shape], fol, kids);
        (kids.length ? behind : body).push(grp);
        if (st >= 4)
            A.organs[i] = { x: at[0], y: at[1] };
    }
    const fh = { 3: 30, 4: 44, 5: 50, 6: 54 }[st];
    const fy = wy - fh;
    body.push(G('stem', [L(Q([100, wy], [98, wy - fh * 0.5], [100, fy]), ctx.lineOf(fol), W.main)]));
    const fl = [];
    if (st <= 4) {
        const big = st === 3 ? 16 : 20;
        const side = st === 3 ? 13 : 16;
        const d = petal(100, fy + 2, big, -Math.PI / 2, 0.42) + ' ' + petal(100, fy + 2, side, -Math.PI / 2 - 0.45, 0.3) + ' ' + petal(100, fy + 2, side, -Math.PI / 2 + 0.45, 0.3);
        fl.push(P(d, pal[TL.washLeaf], { opacity: 0.75 }), L(d, ctx.lineOf(pal), W.main));
        A.canopyBox = { cx: 100, cy: fy - 8, rx: 16, ry: 14 };
    }
    else {
        const back = [-1.15, -0.7, -0.25, 0.25, 0.7, 1.15].map((a) => petal(100, fy, 22, -Math.PI / 2 + a, 0.34)).join(' ');
        const front = [-0.85, -0.3, 0.3, 0.85].map((a) => petal(100, fy + 2, 19, -Math.PI / 2 + a * 0.9, 0.36)).join(' ') + ' ' + petal(100, fy + 3, 21, -Math.PI / 2, 0.36);
        fl.push(P(back, pal[TL.washLeaf], { opacity: 0.55 }), L(back, ctx.lineOf(pal), W.main * 0.9), P(front, pal[TL.washLeaf], { opacity: 0.85 }), L(front, ctx.lineOf(pal), W.main));
        if (st === 6) {
            const pod = `M94 ${f(fy - 6)}Q100 ${f(fy - 11)} 106 ${f(fy - 6)}L104 ${f(fy - 1)}Q100 ${f(fy)} 96 ${f(fy - 1)}Z`;
            fl.push(P(pod, tokens_1.plantArt.lotus.podTop, { opacity: 0.85 }), L(pod, ctx.lineOf(fol), W.main * 0.9));
        }
        A.canopyBox = { cx: 100, cy: fy - 10, rx: 26, ry: 18 };
    }
    body.push(G('flower', fl));
    A.crown = { x: 100, y: fy - 24 };
    A.perch = { x: 74, y: wy - 4 };
    A.neck = { x: 100, y: fy + 10, w: 4 };
    A.drift = { x: 124, y: fy };
    return { body, behind };
}
function sampaguita(ctx) {
    const { st, lod, TL, pal, fol, W, fine, sc, base, A, seed, kit } = ctx;
    const r = kit.rng(seed);
    const h = { 3: 34, 4: 52, 5: 62, 6: 70 }[st];
    const n = st >= 4 ? 5 : 3;
    const angs = n === 5 ? [-150, -118, -90, -62, -30] : [-130, -90, -50];
    const stems = [];
    const groups = [];
    for (let i = 0; i < n; i++) {
        const s = st >= 4 ? sc[i] : 1;
        const a = angs[i] * D2R;
        const len = h * s * (i === (n - 1) / 2 ? 1 : 0.86);
        const p0 = [100 + Math.cos(a) * 3, base - 2];
        const p1 = [100 + Math.cos(a) * len * 0.7, base - 2 + Math.sin(a) * len];
        const pc = [lerp(p0[0], p1[0], 0.2), lerp(p0[1], p1[1], 0.6)];
        stems.push(Q(p0, pc, p1));
        const list = [];
        const np = lod === 'full' ? 3 : 2;
        for (let j = 1; j <= np; j++) {
            if (j === 1 && i % 2)
                continue;
            const t = j / (np + 0.6);
            const [x, y] = qpt(p0, pc, p1, t);
            const tan = qtan(p0, pc, p1, t);
            const ll = (lod === 'full' ? 13 : 16) * (1 - t * 0.3);
            list.push(leaf('lens', x, y, ll, tan - 0.8, fine), leaf('lens', x, y, ll, tan + 0.8, fine));
        }
        groups.push(leafGroup(ctx, n === 5 ? `domain-${i + 1}` : null, list, fol));
        if (n === 5)
            A.organs[i] = { x: p1[0], y: p1[1] };
        if (st >= 4 && lod !== 'icon') {
            const fr = st === 6 ? 4.6 : 4;
            const d = star(p1[0], p1[1] - 2, fr * 1.4, r() * 40);
            groups.push(G(null, [P(d, pal.light, { opacity: 0.95 }), L(d, ctx.rest(TL.starLine), W.main * 0.8), C(p1[0], p1[1] - 2, 1, tokens_1.plantArt.sampaguita.core)]));
            if (st === 6 && i % 2 === 0) {
                const [x2, y2] = qpt(p0, pc, p1, 0.6);
                const d2 = star(x2 + 5, y2 - 3, 4.4, r() * 40);
                groups.push(G(null, [P(d2, pal.light, { opacity: 0.95 }), L(d2, ctx.rest(TL.starLine), W.main * 0.8)]));
            }
        }
    }
    A.canopyBox = { cx: 100, cy: base - h * 0.6, rx: h * 0.7, ry: h * 0.55 };
    A.crown = { x: 100, y: base - h - 6 };
    A.perch = { x: 100 - h * 0.45, y: base - h * 0.75 };
    A.neck = { x: 100, y: base - 8, w: 8 };
    A.drift = { x: 100 + h * 0.5, y: base - h * 0.5 };
    return { body: [G('stem', [L(stems.join(' '), ctx.wood(tokens_1.plantArt.seed.sampaguita), W.main)]), G('canopy', groups)] };
}
function cactus(ctx) {
    const { st, lod, TL, pal, fol, W, fine, sc, base, A } = ctx;
    const g4 = st;
    const H = { 3: 34, 4: 50, 5: 60, 6: 66 }[g4];
    const w = { 3: 12, 4: 15, 5: 17, 6: 19 }[g4];
    const col = (x, y0, h, ww) => `M${f(x - ww / 2)} ${f(y0)}L${f(x - ww / 2)} ${f(y0 - h + ww / 2)}A${f(ww / 2)} ${f(ww / 2)} 0 0 1 ${f(x + ww / 2)} ${f(y0 - h + ww / 2)}L${f(x + ww / 2)} ${f(y0)}`;
    const arm = (side, y, len, up, ww) => {
        const x0 = 100 + side * w * 0.45;
        const x1 = 100 + side * (w * 0.5 + len);
        return `M${f(x0)} ${f(y)}L${f(x1 - (side * ww) / 2)} ${f(y)}Q${f(x1 + (side * ww) / 2)} ${f(y)} ${f(x1 + (side * ww) / 2)} ${f(y - ww)}L${f(x1 + (side * ww) / 2)} ${f(y - up)}A${f(ww / 2)} ${f(ww / 2)} 0 0 ${side > 0 ? 0 : 1} ${f(x1 - (side * ww) / 2)} ${f(y - up)}L${f(x1 - (side * ww) / 2)} ${f(y - ww)}L${f(x0)} ${f(y - ww)}`;
    };
    const groups = [];
    const mainH = H * (st >= 4 ? sc[2] : 1);
    const main = col(100, base, mainH, w);
    const ribs = fine ? `M100 ${f(base - 2)}L100 ${f(base - mainH + 4)}M${f(100 - w * 0.25)} ${f(base - 2)}L${f(100 - w * 0.25)} ${f(base - H * 0.86)}M${f(100 + w * 0.25)} ${f(base - 2)}L${f(100 + w * 0.25)} ${f(base - H * 0.86)}` : '';
    groups.push(G(st >= 4 ? 'domain-3' : null, [P(main + 'Z', fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(main, ctx.lineOf(fol), W.main), ribs ? L(ribs, ctx.lineOf(fol), W.fine, { opacity: 0.6 }) : null]));
    const arms = st >= 4
        ? [
            [-1, 0.45, 0, 1],
            [1, 0.62, 3, 3],
            [-1, 0.78, 1, 1],
            [1, 0.35, 4, 0.8],
        ]
        : [[1, 0.5, -1, 0.8]];
    for (const [side, ty, dom, kk] of arms) {
        const s = st >= 4 ? sc[dom === -1 ? 0 : dom] : 1;
        const y = base - H * ty;
        const ww = w * 0.62;
        const d = arm(side, y, w * 0.55 * s * kk + 4, H * 0.28 * s, ww);
        groups.push(G(st >= 4 ? `domain-${dom + 1}` : null, [P(d + 'Z', fol[TL.washLeaf], { opacity: TL.washLeafOp }), L(d, ctx.lineOf(fol), W.main)]));
        if (st >= 4)
            A.organs[dom] = { x: 100 + side * (w + 6), y: y - 8 };
    }
    A.organs[2] = { x: 100, y: base - H * 0.6 };
    if (lod !== 'icon') {
        let sp = '';
        for (let y = base - 8; y > base - H + 6; y -= lod === 'full' ? 7 : 10)
            for (const sd of [-1, 1])
                sp += `M${f(100 + (sd * w) / 2)} ${f(y)}l${f(sd * 2.6)} -1.2`;
        groups.push(G(null, [L(sp, ctx.lineOf(fol), W.main * 0.6, { opacity: 0.75 })]));
    }
    const body = [G('canopy', groups)];
    if (st >= 5 && lod !== 'icon') {
        const top = base - mainH;
        const bl = [0, 1, 2, 3, 4].map((i) => xf('M0 0Q0.42 -0.55 0 -1Q-0.42 -0.55 0 0Z', 100, top + 2, (-90 + (i - 2) * 30) * D2R + Math.PI / 2, st === 6 ? 10 : 8)).join(' ');
        body.push(G('blooms', [P(bl, pal[TL.washLeaf], { opacity: 0.85 }), L(bl, ctx.lineOf(pal), W.main)]));
    }
    A.canopyBox = { cx: 100, cy: base - H * 0.55, rx: w * 2.2, ry: H * 0.55 };
    A.crown = { x: 100, y: base - H - 6 };
    A.perch = { x: 100 - w * 1.8, y: base - H * 0.5 };
    A.neck = { x: 100, y: base - 10, w };
    A.drift = { x: 120, y: base - H * 0.6 };
    return { body };
}
function bamboo(ctx) {
    const { st, lod, TL, W, fine, sc, base, A, seed, kit, pal } = ctx;
    const r = kit.rng(seed);
    const n = st >= 4 ? 5 : 2;
    const H = { 3: 62, 4: 96, 5: 112, 6: 124 }[st];
    const xs = n === 5 ? [-22, -11, 0, 11, 22] : [-6, 7];
    const hs = n === 5 ? [0.66, 0.84, 1, 0.9, 0.72] : [1, 0.78];
    const groups = [];
    const culmLine = tokens_1.plantLeaf.spring;
    for (let i = 0; i < n; i++) {
        const h = H * hs[i] * (st >= 4 ? sc[i] : 1);
        const x = 100 + xs[i];
        const ww = { 3: 6, 4: 6.4, 5: 7, 6: 7.6 }[st] * (i === 2 ? 1.1 : 1);
        const lean = (i - (n - 1) / 2) * 1.6;
        const top = [x + lean, base - h];
        const t = taper([x, base + 1], [x + lean * 0.3, base - h * 0.5], top, ww, ww * 0.8);
        let nodes = '';
        const seg = lod === 'full' ? 14 : 18;
        for (let y = base - seg; y > base - h + 6; y -= seg) {
            const tt = (base - y) / h;
            const cxn = x + lean * tt * tt;
            nodes += `M${f(cxn - ww * 0.55)} ${f(y)}Q${f(cxn)} ${f(y + 1.4)} ${f(cxn + ww * 0.55)} ${f(y)}`;
        }
        const kids = [P(t.closed, tokens_1.plantArt.bamboo.mid, { opacity: TL.washLeafOp * 0.8 }), L(t.sides, ctx.lineOf(culmLine), W.main)];
        if (lod !== 'icon')
            kids.push(L(nodes, ctx.lineOf(culmLine), W.main * 0.9));
        const list = [];
        for (let j = 0; j < 2; j++) {
            const y = base - h * (0.62 + j * 0.15);
            const side = (i + j) % 2 ? 1 : -1;
            const cxn = x + lean * ((base - y) / h) ** 2;
            const tip = [cxn + side * 12, y - 6];
            kids.push(L(Q([cxn + side * ww * 0.4, y], [cxn + side * 7, y - 1], tip), ctx.lineOf(culmLine), W.main * 0.8));
            const ll = lod === 'full' ? 16 : 19;
            list.push(leaf('long', tip[0], tip[1], ll, (side > 0 ? -10 : -170) * D2R + (r() - 0.5) * 0.3, fine), leaf('long', tip[0], tip[1], ll * 0.85, (side > 0 ? 35 : 145) * D2R, fine));
        }
        list.push(leaf('long', top[0], top[1], lod === 'full' ? 12 : 15, -70 * D2R, fine), leaf('long', top[0], top[1], lod === 'full' ? 11 : 14, -120 * D2R, fine));
        groups.push(leafGroup(ctx, n === 5 ? `domain-${i + 1}` : null, list, pal, kids));
        if (n === 5)
            A.organs[i] = { x: top[0], y: top[1] + h * 0.2 };
    }
    const order = n === 5 ? [0, 4, 1, 3, 2].map((k) => groups[k]) : groups;
    A.canopyBox = { cx: 100, cy: base - H * 0.6, rx: 40, ry: H * 0.5 };
    A.crown = { x: 100, y: base - H - 6 };
    A.perch = { x: 72, y: base - H * 0.5 };
    A.neck = { x: 100, y: base - 10, w: 30 };
    A.drift = { x: 130, y: base - H * 0.5 };
    return { body: [G('canopy', order)] };
}
const BUILD = { cloud: cloudTree, pine: pineTree, palm: palmTree, bonsai: bonsaiTree, sunflower, lotus, sampaguita, cactus, bamboo };
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
  links["src/engine/mastery.ts"] = {};
  defs["src/engine/mastery.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_SPACING_MS = void 0;
exports.noteCleanCorrect = noteCleanCorrect;
exports.recordMastery = recordMastery;
exports.MIN_SPACING_MS = 12 * 3600000;
function noteCleanCorrect(entry, day, at) {
    if (!entry)
        return { firstDay: day, firstAt: at };
    if (entry.masteredAt)
        return entry;
    const spaced = entry.firstAt === undefined || Math.abs(at - entry.firstAt) >= exports.MIN_SPACING_MS;
    if (day !== entry.firstDay && spaced)
        return { ...entry, masteredAt: day };
    return entry;
}
function recordMastery(map, subtopic, day, answer, at) {
    if (!subtopic || !answer.correct || answer.assisted)
        return map;
    const prev = map === null || map === void 0 ? void 0 : map[subtopic];
    const next = noteCleanCorrect(prev, day, at);
    if (next === prev)
        return map;
    return { ...map, [subtopic]: next };
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
    { id: 'mindset-shift', kind: 'milestone', name: 'Mindset Shift', rule: 'Pick the tempting runner-up clearly less often than in your first weeks.' },
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
        .replace(/\b(\d+(?:\.\d+)?) h\b/g, (_, n) => `${n} hour${n === '1' ? '' : 's'}`)
        .replace(/\b(\d+(?:\.\d+)?) min\b/g, (_, n) => `${n} minute${n === '1' ? '' : 's'}`);
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
  links["src/engine/plant.ts"] = {"./journey":"src/engine/journey.ts","./examReady":"src/engine/examReady.ts","./readiness":"src/engine/readiness.ts","./readinessRange":"src/engine/readinessRange.ts","./streak":"src/engine/streak.ts","./plantLooks":"src/engine/plantLooks.ts"};
  defs["src/engine/plant.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_REST_LINES = exports.RETURN_DAYS = exports.REST_AFTER_DAYS = exports.FLOWER_DAYS = exports.FLOWER_SCORE = exports.PLANT_SLOTS = exports.organScales = exports.ORGAN_STEP_WORDS = exports.ORGAN_WEIGHT_PULL = exports.ORGAN_SPAN = exports.ORGAN_MIN = exports.MAX_NAME = exports.plantFace = exports.plantHasFace = exports.plantShown = exports.MAX_KEPT = exports.MAX_KEEPSAKES = exports.SPREAD_EXPLAINER = exports.GROWTH_RULES = exports.ELDER_SPREAD = exports.ELDER_DOMAIN_FLOOR = exports.CROWN_MOCK = exports.CROWN_SPREAD = exports.CROWN_LOW = exports.BOUGH_SPREAD = exports.BOUGH_LOW = exports.SHOOT_SPREAD = exports.SHOOT_PER_DOMAIN = exports.SPROUT_ANSWERS = exports.GROWTH_LOOKS = exports.GROWTH_NAMES = exports.MAX_GROWTH = exports.GROWTH_IDS = exports.SPECIES_INFO = exports.PLANT_SPECIES = void 0;
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
exports.growthShort = growthShort;
exports.grewLabel = grewLabel;
exports.organLabel = organLabel;
const journey_1 = require("./journey");
const examReady_1 = require("./examReady");
const readiness_1 = require("./readiness");
const readinessRange_1 = require("./readinessRange");
const streak_1 = require("./streak");
const plantLooks_1 = require("./plantLooks");
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
const GATES = {
    2: (f) => f.cleanAnswered >= exports.SPROUT_ANSWERS,
    3: (f) => f.cleanByDomain.length > 0 && f.cleanByDomain.every((n) => n >= exports.SHOOT_PER_DOMAIN) && f.spread >= exports.SHOOT_SPREAD,
    4: (f) => f.low !== null && f.low >= exports.BOUGH_LOW && f.spread >= exports.BOUGH_SPREAD,
    5: (f) => f.low !== null && f.low >= exports.CROWN_LOW && f.spread >= exports.CROWN_SPREAD && f.mock50,
    6: (f) => f.readyHeld && f.cleanMastery.length > 0 && Math.min(...f.cleanMastery) >= exports.ELDER_DOMAIN_FLOOR && f.spread >= exports.ELDER_SPREAD && f.dress,
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
exports.GROWTH_RULES = {
    1: 'Plant it.',
    2: `Answer ${exports.SPROUT_ANSWERS} questions without a hint or a game (your diagnostic).`,
    3: `Answer ${exports.SHOOT_PER_DOMAIN} or more questions in every domain, and know ${pct(exports.SHOOT_SPREAD)} of the outline.`,
    4: `${CLEAN_LOW} reaches ${exports.BOUGH_LOW}%, and you know ${pct(exports.BOUGH_SPREAD)} of the outline.`,
    5: `${CLEAN_LOW} reaches ${exports.CROWN_LOW}%, you know ${pct(exports.CROWN_SPREAD)} of the outline, and you finish a mock of ${exports.CROWN_MOCK} questions or more.`,
    6: `${READY_RULE}, every domain is at ${pct(exports.ELDER_DOMAIN_FLOOR)} or more, you know ${pct(exports.ELDER_SPREAD)} of the outline, and you finish a full, timed mock with every question answered.`,
};
exports.SPREAD_EXPLAINER = "Subtopics you've answered right, without a hint, on two different days, weighted like the exam.";
function pct(x) {
    return `${Math.round(x * 100)}%`;
}
function nextGrowthSteps(current, f) {
    var _a;
    if (current >= exports.MAX_GROWTH)
        return null;
    const g = (current + 1);
    const frac = (have, need) => (need <= 0 ? 1 : Math.max(0, Math.min(1, have / need)));
    const low = (_a = f.low) !== null && _a !== void 0 ? _a : 0;
    const spread = (need) => ({ label: `Know ${pct(need)} of the outline`, progress: frac(f.spread, need) });
    const lowStep = (need) => ({ label: `${CLEAN_LOW} reaches ${need}%`, progress: f.low === null ? 0 : frac(low, need) });
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
            steps = [lowStep(exports.BOUGH_LOW), spread(exports.BOUGH_SPREAD)];
            break;
        case 5:
            steps = [lowStep(exports.CROWN_LOW), spread(exports.CROWN_SPREAD), { label: `Finish a mock of ${exports.CROWN_MOCK} questions or more`, progress: f.mock50 ? 1 : 0 }];
            break;
        default: {
            const min = f.cleanMastery.length ? Math.min(...f.cleanMastery) : 0;
            steps = [
                { label: READY_RULE, progress: f.readyHeld ? 1 : 0 },
                { label: `Every domain at ${pct(exports.ELDER_DOMAIN_FLOOR)} or more`, progress: frac(min, exports.ELDER_DOMAIN_FLOOR) },
                spread(exports.ELDER_SPREAD),
                { label: 'A full, timed mock with every question answered', progress: f.dress ? 1 : 0 },
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
    if (!onlyKeys(x, ['species', 'name', 'plantedAt', 'replantedAt', 'growth', 'reached', 'pending', 'backfill', 'look', 'kept', 'passedOn']))
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
        if (!isObj(b) || !onlyKeys(b, ['at', 'growth', 'seen']) || !isTs(b.at) || !isGrowthLevel(b.growth) || b.growth > growth)
            return false;
        if (b.seen !== undefined && typeof b.seen !== 'boolean')
            return false;
    }
    if (x.look !== undefined) {
        const l = x.look;
        if (!isObj(l) || !onlyKeys(l, ['style', 'colourway', 'ground', 'planter', 'visitor', 'keepsakes']))
            return false;
        for (const [k, slot] of LOOK_SLOTS)
            if (l[k] !== undefined && !(0, plantLooks_1.isLookOfSlot)(l[k], slot))
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
    return `${who}. Growth: ${exports.GROWTH_NAMES[i.growth]}, ${i.growth} of 6.${extra ? ` ${extra}` : ''}`;
}
function backfillLine(p, growth) {
    return growth > 1 ? `Your study so far grew ${p.name ? shownName(p.name) : `your ${exports.SPECIES_INFO[p.species].lower}`} to ${exports.GROWTH_NAMES[growth]}.` : `Planted. Your first ${exports.SPROUT_ANSWERS} answers give it its first sprout.`;
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
    ['weather-vane', 'Weather vane', 'mindset-shift', 'The weather vane: you fall for the runner-up less often.', 'tall', 'Pick the tempting runner-up less often'],
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
            return o.badgesHidden ? 'Opens as you study.' : `Opens when you finish the ${(_d = SET_NAMES[u.set]) !== null && _d !== void 0 ? _d : u.set} set in Badges.`;
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
  links["src/theme/tokens.ts"] = {};
  defs["src/theme/tokens.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plantLine = exports.plantTheme = exports.plantArt = exports.plantLeaf = exports.badgeGlaze = exports.badgeLeafPip = exports.badgeStruck = exports.badgeMetal = exports.cardInk = exports.badgeEnamel = exports.motion = exports.LARGE_TEXT = exports.grewLine = exports.statWord = exports.cardType = exports.statUnit = exports.numeralUnit = exports.badgeLetter = exports.optionText = exports.maxScale = exports.stemLong = exports.STEM_LONG_CHARS = exports.type = exports.font = exports.radius = exports.space = exports.domainPalette = exports.raisedShadow = exports.cardShadow = exports.forestHighlight = exports.grainOp = exports.scrimOp = exports.pillarGlyph = exports.kaisip = exports.dark = exports.light = void 0;
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
    raised: '#1A211C',
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
    wrongBg: '#3A1A1D',
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
exports.space = { xs: 4, sm: 8, md: 12, lg: 16, gutter: 20, xl: 24, section: 28, xxl: 32, xxxl: 48 };
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
    plant: { breath: 2000, breathOut: 2400, breaths: 1, react: 600, lean: 900, grow: 900, plantIn: 820 },
    rise: 8,
    shift: 16,
    pressScale: 0.98,
    pressOpacity: 0.92,
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
  };
  var cache = {};
  function load(id) {
    if (cache[id]) return cache[id].exports;
    var module = { exports: {} };
    cache[id] = module;
    defs[id].call(module.exports, module, module.exports, function (spec) {
      var to = links[id][spec];
      if (!to) throw new Error("kaisip-plant: " + id + " cannot load " + spec);
      return load(to);
    });
    return module.exports;
  }
  var api = {};
  api["plant"] = load("src/engine/plant.ts");
  api["looks"] = load("src/engine/plantLooks.ts");
  api["art"] = load("src/components/plant/art.ts");
  api["mastery"] = load("src/engine/mastery.ts");
  api["readiness"] = load("src/engine/readiness.ts");
  api["readinessRange"] = load("src/engine/readinessRange.ts");
  api["examReady"] = load("src/engine/examReady.ts");
  api["streak"] = load("src/engine/streak.ts");
  api["outline"] = load("src/engine/outline.ts");
  api["notesPack"] = load("scripts/notes-pack.cjs");
  api.sourceHash = "2ad9a5dab6081727";
  root.KaiSipPlant = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
