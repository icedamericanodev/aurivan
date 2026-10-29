/*
 * GENERATED FILE: do not edit. Built by mobile/scripts/build-web-plant.mjs
 * from the mobile app's own plant sources (growth engine, looks, SVG art),
 * so the website and the app grow the same plant. Rebuild after changing
 * any of them: cd mobile && npm run web-plant
 * TypeScript 6.0.3. Modules: 38.
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
const lookKey = (l) => { var _a, _b, _d, _f, _g, _h; return (l ? [(_a = l.palette) !== null && _a !== void 0 ? _a : '', (_b = l.ground) !== null && _b !== void 0 ? _b : '', (_d = l.planter) !== null && _d !== void 0 ? _d : '', (_f = l.visitor) !== null && _f !== void 0 ? _f : '', ((_g = l.keepsakes) !== null && _g !== void 0 ? _g : []).join('+'), (_h = l.final) !== null && _h !== void 0 ? _h : ''].join('/') : ''); };
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
  links["src/components/plant/botanical.ts"] = {"../../engine/plantForms":"src/engine/plantForms.ts","../../theme/tokens":"src/theme/tokens.ts","./forms":"src/components/plant/forms/index.ts","./forms/kit":"src/components/plant/forms/kit.ts"};
  defs["src/components/plant/botanical.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBotanical = buildBotanical;
exports.ink = ink;
const plantForms_1 = require("../../engine/plantForms");
const tokens_1 = require("../../theme/tokens");
const forms_1 = require("./forms");
const kit_1 = require("./forms/kit");
const f = (n) => Math.round(n * 10) / 10;
const LINE_PT = { icon: { main: 1.25, fine: 0 }, small: { main: 1.3, fine: 0.7 }, full: { main: 1.5, fine: 0.75 } };
const P = (d, fill, extra = {}) => ({ t: 'path', d, fill, ...extra });
const C = (cx, cy, r, fill, extra = {}) => ({ t: 'circle', cx: f(cx), cy: f(cy), r: f(r), fill, ...extra });
const G = (id, children, extra = {}) => ({ t: 'g', id, children: children.filter(Boolean), ...extra });
const L = (d, stroke, pt, extra = {}) => ({ t: 'path', d, fill: 'none', stroke, sw: pt, ...extra });
const GROUND_W = [0, 34, 46, 62];
const groundSize = (st) => (st <= 2 ? 1 : st <= 4 ? 2 : 3);
const FORM_BASE = 170;
const SEED_PARTS = new Set(['seed', 'roots', 'sprout', 'stem', 'husk', 'pads', 'pads-front']);
const SEED_SHOOT = new Set(['sprout', 'stem']);
const SEED_K = 0.8;
const BOUGH_K = 0.88;
const BOUGH_DROPS = new Set(['fruit', 'blooms']);
const ORGAN_DEFAULT = 1.011;
const scaleAbout = (k) => `translate(100 ${FORM_BASE}) scale(${k}) translate(-100 ${-FORM_BASE})`;
const idOf = (n) => (n.t === 'g' ? n.id : null);
function buildBotanical(o, kit) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _p, _q;
    const key = o.species;
    const line = forms_1.FORM_LINES[key];
    const st = Math.max(1, Math.min(6, Math.round(o.stage)));
    const lod = o.lod || 'full';
    const theme = o.theme || 'light';
    const TL = tokens_1.plantLine[theme];
    const W = LINE_PT[lod];
    const restMix = o.resting ? TL.restLineMix : 0;
    const rest = (c) => (restMix ? kit.mix(c, TL.woodInk, restMix) : c);
    const lineOf = (p) => rest(p[TL.leaf]);
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
    const inPot = !meadow;
    const gb = inPot ? kit.bounds(groundBack) : null;
    const span = gb ? (gb.maxX - gb.minX) / 2 - 3 : 60;
    const keepsakes = (_b = (_a = o.look) === null || _a === void 0 ? void 0 : _a.keepsakes) !== null && _b !== void 0 ? _b : [];
    const clearDawn = keepsakes.includes('clear-dawn');
    const palKey = ((_d = (_c = o.look) === null || _c === void 0 ? void 0 : _c.palette) !== null && _d !== void 0 ? _d : line.pal);
    const S = (0, forms_1.paint)(theme, lod, {
        pal: palKey,
        fol: (_e = line.fol) !== null && _e !== void 0 ? _e : palKey,
        mix: kit.mix,
        rest,
        sc: [0, 1, 2, 3, 4].map((i) => {
            var _a;
            const v = (_a = o.organs) === null || _a === void 0 ? void 0 : _a[i];
            return typeof v === 'number' && Number.isFinite(v) ? v : ORGAN_DEFAULT;
        }),
    });
    const final = (0, plantForms_1.resolveFinal)(st, (_f = o.look) === null || _f === void 0 ? void 0 : _f.final);
    const out = (0, forms_1.drawForm)(key, st, final, { S, species: key, inPot, span, keeps: keepsakes.filter((k) => k !== 'clear-dawn').length });
    let parts = flatKids(out.body);
    let shoot = [];
    let k = 1;
    if (st === 1) {
        parts = parts.filter((n) => { var _a; return SEED_PARTS.has((_a = idOf(n)) !== null && _a !== void 0 ? _a : ''); });
        shoot = parts.filter((n) => { var _a; return SEED_SHOOT.has((_a = idOf(n)) !== null && _a !== void 0 ? _a : ''); });
        parts = parts.filter((n) => { var _a; return !SEED_SHOOT.has((_a = idOf(n)) !== null && _a !== void 0 ? _a : ''); });
    }
    else if (st === 4) {
        parts = parts.filter((n) => { var _a; return !BOUGH_DROPS.has((_a = idOf(n)) !== null && _a !== void 0 ? _a : ''); });
        k = BOUGH_K;
    }
    const dy = base - FORM_BASE;
    const shift = Math.abs(dy) > 0.01 ? `translate(0 ${f(dy)})` : '';
    const placed = (extra) => [shift, extra].filter(Boolean).join(' ');
    const formT = placed(k !== 1 ? scaleAbout(k) : '');
    const body = G(null, [...parts, shoot.length ? G(null, shoot, { transform: scaleAbout(SEED_K) }) : null], formT ? { transform: formT } : {});
    const at = (p, kk = st === 1 ? SEED_K : k) => (p ? { x: f(100 + (p[0] - 100) * kk), y: f(FORM_BASE + (p[1] - FORM_BASE) * kk + dy) } : undefined);
    const A = { base: { x: 100, y: base }, organs: [] };
    const crownParts = body.children.filter((c) => idOf(c) === 'canopy');
    const cb = measure(crownParts.length ? { ...body, children: crownParts } : body, kit);
    A.canopyBox = { cx: (cb.minX + cb.maxX) / 2, cy: (cb.minY + cb.maxY) / 2, rx: Math.max(8, (cb.maxX - cb.minX) / 2), ry: Math.max(8, (cb.maxY - cb.minY) / 2) };
    const box = A.canopyBox;
    A.crown = { x: box.cx, y: box.cy - box.ry };
    A.perch = (_g = at(out.perch)) !== null && _g !== void 0 ? _g : { x: box.cx - box.rx * 0.5, y: box.cy - box.ry * 0.6 };
    A.branchL = { x: box.cx - box.rx * 0.58, y: box.cy + box.ry * 0.62 };
    A.branchR = { x: box.cx + box.rx * 0.6, y: box.cy + box.ry * 0.62 };
    A.neck = { x: 100, y: base - 12, w: 6 };
    A.drift = { x: box.cx + box.rx * 0.7, y: box.cy + box.ry * 0.4 };
    if (st >= 4)
        for (const org of (_h = out.organs) !== null && _h !== void 0 ? _h : []) {
            const i = org.dom - 1;
            if (i >= 0 && i < 5 && !A.organs[i])
                A.organs[i] = at([org.x, org.y]);
        }
    const drift = o.drift !== false && st === 6 ? [G(null, flatKids((_j = out.drift) !== null && _j !== void 0 ? _j : []), shift ? { transform: shift } : {})] : [];
    const pose = o.resting ? `rotate(1.5 100 ${f(base)})` : null;
    let fx = null;
    if (o.resting && lod !== 'icon') {
        const { cx, cy, rx, ry } = box;
        const mx = Math.min(186, cx + rx * 0.7);
        const my = Math.max(14, cy - ry - 8);
        const moon = `M${f(mx)} ${f(my - 8)}A8 8 0 1 0 ${f(mx + 7)} ${f(my + 4)}A6.4 6.4 0 1 1 ${f(mx)} ${f(my - 8)}Z`;
        fx = G('fx', [P(moon, TL.moon, { opacity: TL.moonWashOp }), L(moon, TL.moon, W.main)]);
    }
    const bird = ((_k = o.look) === null || _k === void 0 ? void 0 : _k.visitor) && o.look.visitor !== 'no-visitor' ? kit.visitor(o.look.visitor, A, lod) : null;
    const visitor = bird ? { ...ink(bird, theme, W.main * 0.9, kit.mix), id: 'visitor' } : null;
    const tree = G('tree', [G('body', [body, visitor], pose ? { transform: pose } : {}), G('drift', drift), fx]);
    const propsBack = G('props-back', [meadow ? ((_l = out.cutaway) !== null && _l !== void 0 ? _l : null) : null, ...flatKids((_m = out.back) !== null && _m !== void 0 ? _m : [])], shift ? { transform: shift } : {});
    const propsFront = G('props-front', flatKids((_p = out.front) !== null && _p !== void 0 ? _p : []), shift ? { transform: shift } : {});
    const tb = measure(G(null, [tree, propsBack, propsFront]), kit);
    const M = 3;
    const fitK = Math.min(1, (base - M) / Math.max(1, base - tb.minY), (100 - M) / Math.max(1, 100 - tb.minX), (100 - M) / Math.max(1, tb.maxX - 100));
    if (fitK < 1) {
        const fit = `translate(100 ${f(base)}) scale(${fitK.toFixed(3)}) translate(-100 ${f(-base)})`;
        for (const g of [tree, propsBack, propsFront])
            g.transform = g.transform ? `${fit} ${g.transform}` : fit;
    }
    const glowNode = st === 6 && out.glow && !o.resting && !clearDawn ? (0, kit_1.glow)(S, out.glow[0], out.glow[1] + dy, out.glow[2]) : null;
    const ks = kit.keepsakes((_q = o.look) === null || _q === void 0 ? void 0 : _q.keepsakes, st, gr, tree, base, potKind, A, lod, theme);
    const keepBack = G('keepsakes-back', ks.back.map((x) => ink(x, theme, W.main * 0.9, kit.mix)));
    const keepFront = G('keepsakes', ks.front.map((x) => ink(x, theme, W.main * 0.9, kit.mix)));
    const kk = Math.min(1, fitK);
    const gbox = kit.bounds(G(null, [groundBack, keepBack, groundFront, keepFront, ks.dawn]));
    const sx = (x) => 100 + (x - 100) * kk;
    const sy = (y) => base + (y - base) * kk;
    const frame = kit.frameFor({
        minX: Math.min(gbox.minX, sx(tb.minX)),
        maxX: Math.max(gbox.maxX, sx(tb.maxX)),
        minY: Math.min(gbox.minY, sy(tb.minY)),
        maxY: Math.max(gbox.maxY, sy(tb.maxY)),
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
    const root = G('mascot', [backdrop, ks.dawn, glowNode, groundBack, propsBack, keepBack, tree, propsFront, groundFront, keepFront]);
    const side = o.fit ? Number(frame.split(' ')[2]) : 200;
    scaleLines(root, side / (o.px || 200), 1);
    return { root, anchors: A, frame };
}
function flatKids(xs, out = []) {
    for (const x of xs) {
        if (Array.isArray(x))
            flatKids(x, out);
        else if (x)
            out.push(x);
    }
    return out;
}
function measure(n, kit) {
    const prune = (x) => (x.t === 'g' ? { ...x, children: x.children.filter((c) => !kit_1.INSIDE.has(c)).map(prune) } : x);
    const b = kit.bounds(prune(n));
    return { minX: b.minX - 1, minY: b.minY - 1, maxX: b.maxX + 1, maxY: b.maxY + 1 };
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
  };
  links["src/components/plant/forms/conifers.ts"] = {"./kit":"src/components/plant/forms/kit.ts","./trees":"src/components/plant/forms/trees.ts"};
  defs["src/components/plant/forms/conifers.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONIFER_LINES = void 0;
const kit_1 = require("./kit");
const trees_1 = require("./trees");
function cones(S, pts) {
    if (S.icon || !pts.length)
        return null;
    let d = '';
    let sc = '';
    for (const [x, y] of pts) {
        d += `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}C${(0, kit_1.f)(x + 3)} ${(0, kit_1.f)(y + 1)} ${(0, kit_1.f)(x + 3.2)} ${(0, kit_1.f)(y + 6)} ${(0, kit_1.f)(x)} ${(0, kit_1.f)(y + 8)}C${(0, kit_1.f)(x - 3.2)} ${(0, kit_1.f)(y + 6)} ${(0, kit_1.f)(x - 3)} ${(0, kit_1.f)(y + 1)} ${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}Z`;
        if (S.full)
            sc += `M${(0, kit_1.f)(x - 2.4)} ${(0, kit_1.f)(y + 3)}L${(0, kit_1.f)(x + 2.4)} ${(0, kit_1.f)(y + 4)}M${(0, kit_1.f)(x - 2.6)} ${(0, kit_1.f)(y + 5.4)}L${(0, kit_1.f)(x + 2.6)} ${(0, kit_1.f)(y + 6.4)}`;
    }
    return (0, kit_1.G)('fruit', [(0, kit_1.P)(d, S.giftFill(kit_1.A0.gift.cone)), (0, kit_1.L)(d + sc, S.gift(kit_1.A0.gift.cone), S.hair * 1.7)]);
}
const PINE = { bark: kit_1.A0.bark.pine, kind: 'lens', ll: 8, aspect: 1, pads: true, needle: true, fruit: (S, ms) => cones(S, (0, kit_1.lowerRim)(ms, 4, 7, 0.3, 0.7)) };
const pineForms = {
    I: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const lp = (0, trees_1.green)(S.pal);
        for (let i = 0; i < 9; i++)
            set.add((0, kit_1.leaf)('long', 100, 140, 13, (-172 + i * 20.5) * kit_1.D2R, S, 0.55));
        return {
            cutaway: (0, kit_1.cutaway)(S, 64, 136, 171, 188, 10),
            body: [
                (0, kit_1.G)('roots', [(0, kit_1.L)('M99 170Q98 178 100 188M99 178l-4 3M100 183l4 2', S.wood(PINE.bark), S.fine * 1.5)]),
                (0, kit_1.seedPart)(S, (0, kit_1.oval)(84, 167, 4.6, 3.2) + ' M87 165C94 160 108 160 114 166C108 170 94 170 87 169Z', kit_1.A0.seedLight, 'M90 166L112 166'),
                (0, kit_1.G)('sprout', [(0, kit_1.L)('M99 170Q98 154 100 140', S.lineOf(lp), S.main), (0, kit_1.P)(set.wash(), S.washOf(lp), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(lp), S.fine * 1.4)]),
            ],
            perch: [70, 170],
        };
    },
    II: (c) => {
        const { S } = c;
        let nd = '';
        let tw = '';
        for (const [y, w] of [
            [140, 18],
            [112, 14],
            [86, 10],
        ])
            for (const s of [-1, 1]) {
                tw += `M100 ${y}Q${100 + s * w * 0.5} ${y - 2} ${100 + s * w} ${y - 6}`;
                nd += (0, kit_1.needles)(100 + s * w, y - 6, 7, -Math.PI / 2 + s * 0.9, 5, 1.4) + (0, kit_1.needles)(100 + s * w * 0.55, y - 3, 6, -Math.PI / 2 + s * 0.6, 4, 1.2);
            }
        nd += (0, kit_1.needles)(100, 58, 7, -Math.PI / 2, 7, 2.6);
        const candle = 'M100 58C102.4 52 102.6 44 100 36C97.4 44 97.6 52 100 58Z';
        return {
            body: [
                (0, kit_1.G)('stem', [(0, kit_1.L)('M100 171L100 58', S.wood(PINE.bark), S.main * 1.6), (0, kit_1.L)(tw, S.wood(PINE.bark), S.fine * 1.4)]),
                (0, kit_1.G)('leaves', [(0, kit_1.L)(nd, S.lineOf(S.pal), S.fine * 1.2)]),
                (0, kit_1.G)('bud', [(0, kit_1.P)(candle, kit_1.LEAF[S.pal].hi), (0, kit_1.L)(candle, S.lineOf(S.pal), S.fine * 1.3)]),
            ],
            perch: [82, 134],
        };
    },
    III: (c) => (0, trees_1.tree)(c, {
        ...(0, trees_1.habitBase)(PINE),
        pal: c.S.pal,
        seed: 25,
        masses: [(0, kit_1.M)(100, 140, 42, 16, 1), (0, kit_1.M)(100, 118, 35, 15, 2), (0, kit_1.M)(100, 96, 28, 14, 3), (0, kit_1.M)(100, 74, 21, 13, 4), (0, kit_1.M)(100, 52, 13, 12, 5)],
        trunk: [[100, 171], [100, 110], [100, 44], 9, 3, { furrows: 0 }],
        extras: () => [
            cones(c.S, [
                [72, 146],
                [124, 124],
            ]),
        ],
        perch: [64, 134],
    }),
    IV: (c) => (0, trees_1.tree)(c, {
        ...(0, trees_1.habitBase)(PINE),
        pal: c.S.pal,
        seed: 35,
        masses: [(0, kit_1.M)(44, 104, 26, 16, 1), (0, kit_1.M)(156, 92, 24, 16, 5), (0, kit_1.M)(64, 72, 26, 16, 2), (0, kit_1.M)(140, 58, 26, 16, 4), (0, kit_1.M)(108, 36, 32, 19, 3)],
        trunk: [[100, 171], [96, 110], [106, 44], 16, 7, { furrows: 6 }],
        limbs: [
            [[99, 130], [70, 114], [46, 106], 5, 1.8],
            [[102, 112], [130, 98], [152, 94], 5, 1.8],
            [[102, 94], [80, 78], [66, 74], 5, 1.8],
            [[104, 74], [124, 62], [140, 60], 5, 1.8],
        ],
        rootD: c.inPot ? null : 'M92 168Q82 171 72 173M108 168Q120 171 130 172',
        extras: () => [
            cones(c.S, [
                [50, 110],
                [70, 78],
                [148, 64],
                [112, 44],
            ]),
        ],
        glow: [104, 80, 80],
        perch: [140, 46],
    }),
};
function pineEspalier(c) {
    const { S } = c;
    const post = kit_1.A0.planter.post;
    const masses = [(0, kit_1.M)(40, 120, 28, 12, 1, { flat: 0.6 }), (0, kit_1.M)(160, 120, 28, 12, 5, { flat: 0.6 }), (0, kit_1.M)(64, 92, 28, 12, 2, { flat: 0.6 }), (0, kit_1.M)(136, 92, 28, 12, 4, { flat: 0.6 }), (0, kit_1.M)(100, 66, 30, 13, 3, { flat: 0.6 })];
    const tops = [
        [22, 116],
        [178, 116],
        [44, 88],
        [156, 88],
        [80, 62],
        [120, 62],
    ];
    const ropes = tops.map(([x, y]) => `M100 14Q${(0, kit_1.f)((100 + x) / 2)} ${(0, kit_1.f)((14 + y) / 2 + 6)} ${x} ${y}`).join('');
    return (0, trees_1.tree)(c, {
        ...(0, trees_1.habitBase)(PINE),
        pal: S.pal,
        seed: 45,
        masses,
        trunk: [[100, 171], [100, 120], [100, 64], 16, 7, { furrows: 5 }],
        limbs: [
            [[100, 128], [64, 124], [24, 120], 6, 2],
            [[100, 128], [136, 124], [176, 120], 6, 2],
            [[100, 100], [76, 96], [46, 92], 5, 1.8],
            [[100, 100], [124, 96], [154, 92], 5, 1.8],
        ],
        afterTrunk: [(0, kit_1.G)('pole', [(0, kit_1.L)('M100 66L100 14', S.wood(post), S.main * 1.3)])],
        extras: () => [
            S.icon ? null : (0, kit_1.G)('ropes', [(0, kit_1.L)(ropes, S.wood(post), S.hair * 1.4, { opacity: 0.9 })]),
            cones(S, [
                [48, 126],
                [152, 126],
            ]),
        ],
        glow: [100, 92, 84],
        perch: [40, 108],
    });
}
const pineFlavours = {
    lookout: (c) => trees_1.RECIPES.lookout(c, PINE, c.S.pal),
    moot: (c) => trees_1.RECIPES.moot(c, PINE, c.S.pal),
    espalier: pineEspalier,
    coppice: (c) => trees_1.RECIPES.coppice(c, PINE, c.S.pal),
    holdfast: (c) => trees_1.RECIPES.holdfast(c, PINE, c.S.pal),
};
const PB = kit_1.A0.bark.coconut;
function frond(S, set, p0, ang, len, droop = 0.36, n, ll) {
    const a = ang * kit_1.D2R;
    const p2 = [p0[0] + Math.cos(a) * len, p0[1] + Math.sin(a) * len * 0.75 + len * 0.12 + Math.abs(Math.cos(a)) * len * droop];
    const p1 = [p0[0] + Math.cos(a) * len * 0.62, p0[1] + Math.sin(a) * len * 0.75 * 0.62 - len * 0.12];
    const k = n !== null && n !== void 0 ? n : (S.full ? 9 : S.small ? 6 : 0);
    for (let i = 1; i <= k; i++) {
        const t = i / (k + 1);
        const p = (0, kit_1.qp)(p0, p1, p2, t);
        const tn = (0, kit_1.qa)(p0, p1, p2, t);
        const l = (ll || len * 0.3) * (1 - t * 0.55);
        const dr = Math.cos(tn) >= 0 ? 0.35 : -0.35;
        set.add((0, kit_1.leaf)('long', p[0], p[1], l, tn + 0.75 + dr, S)).add((0, kit_1.leaf)('long', p[0], p[1], l, tn - 0.75 + dr, S));
    }
    return { d: (0, kit_1.Q)(p0, p1, p2), mid: (0, kit_1.qp)(p0, p1, p2, 0.6), tip: p2, wedge: (0, kit_1.taper)(p0, p1, p2, len * 0.2, 2).closed };
}
function palmCrown(S, at, fr, pal, doms) {
    const organs = [];
    const gs = fr.map(([ang, len, droop], i) => {
        var _a;
        const dom = (_a = doms === null || doms === void 0 ? void 0 : doms[i]) !== null && _a !== void 0 ? _a : null;
        const set = (0, kit_1.leafSet)();
        const r = frond(S, set, at, ang, len * (dom ? S.sc(dom) : 1), droop);
        if (dom)
            organs.push({ dom, x: r.mid[0], y: r.mid[1] });
        return (0, kit_1.G)(dom ? `domain-${dom}` : null, [S.icon ? (0, kit_1.P)(r.wedge, S.washOf(pal), { opacity: 0.85 }) : null, (0, kit_1.P)(set.wash(), S.washOf(pal), { opacity: S.washOp }), (0, kit_1.L)(r.d + ' ' + set.line(), S.lineOf(pal), S.icon ? S.main : S.fine * 1.4)]);
    });
    return { node: (0, kit_1.G)('canopy', gs), organs };
}
function ringTrunk(S, p0, pc, p1, w0, w1) {
    return (0, kit_1.trunk)(S, p0, pc, p1, w0, w1, PB, {
        furrows: 0,
        extra: (t) => {
            let d = '';
            for (let i = 1; i < t.left.length - 1; i++) {
                const a = t.left[i];
                const b = t.right[i];
                d += `M${(0, kit_1.f)(a[0])} ${(0, kit_1.f)(a[1])}Q${(0, kit_1.f)((a[0] + b[0]) / 2)} ${(0, kit_1.f)((a[1] + b[1]) / 2 + 1.6)} ${(0, kit_1.f)(b[0])} ${(0, kit_1.f)(b[1])}`;
            }
            return d;
        },
    });
}
function nuts(S, at, pts, ripe, pal) {
    if (S.icon)
        return null;
    const col = pal === 'golden' ? kit_1.A0.gift.coconutGolden : ripe ? kit_1.A0.gift.coconutRipe : kit_1.A0.gift.coconutGreen;
    const d = pts.map(([dx, dy, r]) => (0, kit_1.disc)(at[0] + dx, at[1] + dy, r || 5.2)).join(' ');
    return (0, kit_1.G)('fruit', [(0, kit_1.P)(d, S.giftFill(col)), (0, kit_1.L)(d, S.gift(col), S.fine * 1.4)]);
}
const FR5 = [
    [-168, 54, 0.36],
    [-130, 58, 0.3],
    [-92, 50, 0.1],
    [-54, 58, 0.3],
    [-12, 54, 0.36],
];
const palmForms = {
    I: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const lp = S.pal;
        set.add((0, kit_1.leaf)('strap', 108, 140, 26, -104 * kit_1.D2R, S, 1.4)).add((0, kit_1.leaf)('strap', 108, 140, 20, -66 * kit_1.D2R, S, 1.4));
        return {
            cutaway: (0, kit_1.cutaway)(S, 60, 140, 171, 188, 11),
            body: [
                (0, kit_1.G)('roots', [(0, kit_1.L)('M96 170Q94 180 97 189M100 170Q104 179 108 186', S.wood(PB), S.fine * 1.5)]),
                (0, kit_1.seedPart)(S, 'M80 164C80 154 92 150 104 152C116 154 120 162 116 168C112 173 86 173 80 164Z', PB, 'M86 160Q98 156 112 158M84 166Q98 162 114 164'),
                (0, kit_1.G)('sprout', [(0, kit_1.L)('M107 154Q106 146 108 140', S.lineOf(lp), S.main * 1.3), (0, kit_1.P)(set.wash(), S.washOf(lp), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(lp), S.main)]),
            ],
            perch: [70, 168],
        };
    },
    II: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        let pleat = '';
        for (const [a, l] of [
            [-134, 50],
            [-110, 58],
            [-84, 58],
            [-58, 50],
        ]) {
            set.add((0, kit_1.leaf)('lens', 100, 162, l, a * kit_1.D2R, S, 0.5));
            if (S.full)
                for (const u of [0.35, 0.55, 0.75]) {
                    const x = 100 + Math.cos(a * kit_1.D2R) * l * u;
                    const y = 162 + Math.sin(a * kit_1.D2R) * l * u;
                    pleat += (0, kit_1.xf)('M-4 2L0 0L4 2', x, y, (a + 90) * kit_1.D2R, 0.9);
                }
        }
        return { body: [(0, kit_1.seedPart)(S, 'M84 171C84 162 92 157 100 158C108 159 114 164 114 171Z', PB), (0, kit_1.leavesNode)(S, 'leaves', set, S.pal, [pleat ? (0, kit_1.L)(pleat, S.lineOf(S.pal), S.hair * 1.4) : null])], perch: [72, 160] };
    },
    III: (c) => {
        const { S } = c;
        const at = [104, 104];
        const cr = palmCrown(S, at, FR5.map(([a, l, d]) => [a, l * 0.92, d]), S.pal, [1, 2, 3, 4, 5]);
        return {
            body: [
                ringTrunk(S, [100, 171], [99, 140], [104, 106], 13, 9),
                cr.node,
                nuts(S, at, [
                    [-5, 8, 4.4],
                    [5, 9, 4.4],
                    [0, 13, 4.4],
                ], false, S.pal),
            ],
            perch: [70, 92],
            organs: cr.organs,
        };
    },
    IV: (c) => {
        const { S } = c;
        const at = [124, 40];
        const cr = palmCrown(S, at, [
            [-172, 66, 0.4],
            [-134, 66, 0.32],
            [-94, 54, 0.1],
            [-54, 66, 0.32],
            [-10, 62, 0.42],
        ], S.pal, [1, 2, 3, 4, 5]);
        const sprout = (0, kit_1.leafSet)();
        sprout.add((0, kit_1.leaf)('strap', 64, 162, 16, -100 * kit_1.D2R, S, 1.3)).add((0, kit_1.leaf)('strap', 64, 162, 12, -70 * kit_1.D2R, S, 1.3));
        const nutD = 'M56 171C56 164 62 162 68 163C74 164 76 168 75 171Z';
        return {
            body: [
                c.inPot || S.icon ? null : (0, kit_1.G)('roots', [(0, kit_1.L)('M88 169Q80 171 74 174M92 170Q88 173 86 177M104 169Q112 171 118 174', S.wood(PB), S.fine * 1.5)]),
                ringTrunk(S, [96, 171], [88, 98], [124, 42], 16, 9),
                cr.node,
                nuts(S, at, [
                    [-7, 9],
                    [5, 10],
                    [-1, 15],
                    [-12, 15],
                    [10, 16],
                    [3, 20],
                ], true, S.pal),
                c.inPot || S.icon
                    ? null
                    : (0, kit_1.G)('sprout', [(0, kit_1.P)(nutD, S.woodFill(PB)), (0, kit_1.L)(nutD, S.wood(PB), S.fine * 1.4), (0, kit_1.P)(sprout.wash(), S.washOf(S.pal), { opacity: S.washOp }), (0, kit_1.L)(sprout.line(), S.lineOf(S.pal), S.fine * 1.4)]),
            ],
            glow: [116, 66, 70],
            perch: [124, 28],
            organs: cr.organs,
        };
    },
};
const palmFlavours = {
    lookout: (c) => {
        const { S } = c;
        const at = [100, 26];
        const cr = palmCrown(S, at, [
            [-176, 46, 0.5],
            [-136, 48, 0.3],
            [-90, 34, 0],
            [-44, 48, 0.3],
            [-4, 46, 0.5],
        ], S.pal, [1, 2, 3, 4, 5]);
        return {
            body: [
                ringTrunk(S, [100, 171], [100, 100], [100, 28], 12, 8),
                cr.node,
                nuts(S, at, [
                    [-5, 8, 4.4],
                    [5, 9, 4.4],
                    [0, 13, 4.4],
                ], true, S.pal),
            ],
            glow: [100, 60, 64],
            perch: [100, 14],
            organs: cr.organs,
        };
    },
    moot: (c) => {
        const { S } = c;
        const at = [100, 70];
        const cr = palmCrown(S, at, [
            [-178, 76, 0.02],
            [-160, 66, 0.04],
            [-90, 30, 0],
            [-20, 66, 0.04],
            [-2, 76, 0.02],
        ], S.pal, [1, 2, 3, 4, 5]);
        const st = c.inPot
            ? { front: [(0, kit_1.stones)(S, 'stones-front', [[88, 171, 2.6], [112, 171, 2.6], [100, 172.5, 2.4]])], back: [] }
            : { back: [(0, kit_1.stones)(S, 'stones', [[54, 167, 7], [146, 167, 7]])], front: [(0, kit_1.stones)(S, 'stones-front', [[72, 175, 6], [128, 175, 6], [100, 179, 5]])] };
        return {
            body: [
                ringTrunk(S, [100, 171], [100, 120], [100, 72], 14, 10),
                cr.node,
                nuts(S, at, [
                    [-6, 8],
                    [6, 8],
                    [0, 13],
                ], true, S.pal),
            ],
            ...st,
            glow: [100, 96, 78],
            perch: [60, 62],
            organs: cr.organs,
        };
    },
    espalier: (c) => {
        const { S } = c;
        const at = [100, 62];
        const post = kit_1.A0.planter.post;
        const cr = palmCrown(S, at, [
            [-162, 56, 0.3],
            [-126, 56, 0.2],
            [-90, 46, 0],
            [-54, 56, 0.2],
            [-18, 56, 0.3],
        ], S.pal, [1, 2, 3, 4, 5]);
        const w = c.inPot ? Math.min(40, c.span + 4) : 40;
        const poles = `M${100 - w} 171L97 112M${100 + w} 171L103 112M100 176L100 112`;
        return {
            body: [
                ringTrunk(S, [100, 171], [100, 116], [100, 64], 12, 9),
                (0, kit_1.G)('frame', [(0, kit_1.L)(poles.replace('M100 176L100 112', ''), S.wood(post), S.main * 1.5), S.icon ? null : (0, kit_1.L)('M95 112L105 112M95 115.5L105 115.5', S.wood(post), S.fine * 1.4)]),
                cr.node,
                nuts(S, at, [
                    [-5, 8, 4.6],
                    [5, 9, 4.6],
                    [0, 13, 4.6],
                ], true, S.pal),
            ],
            glow: [100, 84, 74],
            perch: [100, 50],
            organs: cr.organs,
        };
    },
    coppice: (c) => {
        const { S } = c;
        const main = palmCrown(S, [104, 46], [
            [-140, 52, 0.3],
            [-92, 44, 0.1],
            [-44, 52, 0.3],
        ], S.pal, [2, 3, 4]);
        const lc = palmCrown(S, [66, 100], [
            [-170, 34, 0.4],
            [-120, 34, 0.2],
            [-60, 30, 0.2],
        ], S.pal, [1, null, null]);
        const rc = palmCrown(S, [138, 108], [
            [-120, 30, 0.2],
            [-60, 34, 0.2],
            [-10, 34, 0.4],
        ], S.pal, [null, null, 5]);
        const t = (p0, pc, p1, w0, w1) => ringTrunk(S, p0, pc, p1, w0, w1).children;
        return {
            body: [
                (0, kit_1.G)('trunk', [...t([92, 171], [80, 136], [66, 102], 9, 6), ...t([108, 171], [124, 140], [138, 110], 9, 6), ...t([100, 171], [98, 110], [104, 48], 13, 9)]),
                (0, kit_1.G)('canopy', [lc.node.children, rc.node.children, main.node.children]),
                nuts(S, [104, 46], [
                    [-5, 8, 4.6],
                    [5, 9, 4.6],
                    [0, 13, 4.6],
                ], true, S.pal),
            ],
            glow: [100, 84, 80],
            perch: [66, 88],
            organs: [...main.organs, ...lc.organs, ...rc.organs],
        };
    },
    holdfast: (c) => {
        const { S } = c;
        const sc = c.inPot ? Math.min(1, (c.span + 8) / 44) : 1;
        const X = (x) => 100 + (x - 100) * sc;
        const top = 170 - 30 * sc;
        const rock = `M${(0, kit_1.f)(X(60))} 171C${(0, kit_1.f)(X(56))} ${(0, kit_1.f)(170 - 16 * sc)} ${(0, kit_1.f)(X(70))} ${(0, kit_1.f)(top + 2)} ${(0, kit_1.f)(X(90))} ${(0, kit_1.f)(top)}C${(0, kit_1.f)(X(110))} ${(0, kit_1.f)(top - 2)} ${(0, kit_1.f)(X(136))} ${(0, kit_1.f)(top + 4)} ${(0, kit_1.f)(X(141))} ${(0, kit_1.f)(170 - 12 * sc)}L${(0, kit_1.f)(X(140))} 171Z`;
        const at = [100, 84];
        const cr = palmCrown(S, at, [
            [-170, 46, 0.4],
            [-140, 50, 0.3],
            [-112, 44, 0.15],
            [-90, 36, 0],
            [-68, 44, 0.15],
            [-40, 50, 0.3],
            [-10, 46, 0.4],
        ], S.pal, [1, 2, null, 3, null, 4, 5]);
        return {
            back: [(0, kit_1.boulder)(S, rock, 100, 170 - 15 * sc, 40 * sc, 15 * sc)],
            body: [
                (0, kit_1.rootTapers)(S, [
                    [[96, top + 6], [X(74), top + 8], [X(66), 171], 6, 2.2],
                    [[98, top + 6], [X(88), top + 16], [X(88), 171], 5, 2.2],
                    [[102, top + 6], [X(112), top + 16], [X(114), 171], 5, 2.2],
                    [[104, top + 6], [X(128), top + 8], [X(136), 171], 6, 2.2],
                ], PB),
                ringTrunk(S, [100, top + 8], [100, 112], [100, 86], 20, 13),
                cr.node,
                nuts(S, at, [
                    [-6, 8],
                    [6, 8],
                    [0, 13],
                ], true, S.pal),
            ],
            glow: [100, 76, 72],
            perch: [62, 74],
            organs: cr.organs,
        };
    },
};
const BB = kit_1.A0.bark.bonsai;
function bonsaiTree(c, sp) {
    const { S } = c;
    const body = [];
    if (sp.roots)
        body.push((0, kit_1.rootTapers)(S, sp.roots, BB));
    if (sp.limbs)
        body.push((0, kit_1.limbs)(S, sp.limbs, BB));
    const tr = sp.trunks.map(([p0, pc, p1, w0, w1]) => (0, kit_1.taper)(p0, pc, p1, w0, w1, 14));
    body.push((0, kit_1.G)('trunk', [
        (0, kit_1.P)(tr.map((t) => t.closed).join(' '), S.woodFill(BB)),
        S.full && sp.fur !== false ? (0, kit_1.L)(tr.map((t) => (0, kit_1.furrows)(t.left, t.right, 2, 5)).join(''), S.wood(BB), S.hair * 1.4, { opacity: 0.7 }) : null,
        (0, kit_1.L)(tr.map((t) => t.sides).join(' '), S.wood(BB), S.main),
    ]));
    if (sp.wire && !S.icon)
        body.push((0, kit_1.G)('wire', [(0, kit_1.L)(sp.wire, S.wire, S.hair * 1.5)]));
    const ms = sp.masses.map((m) => { var _a; return ({ ...m, flat: (_a = m.flat) !== null && _a !== void 0 ? _a : 0.62, n: m.n || Math.max(8, Math.round(m.rx / 2.6)) }); });
    if (sp.ids !== false)
        (0, kit_1.scaleMasses)(S, ms);
    const cr = (0, kit_1.crown)(S, ms, { kind: 'lens', ll: 6, pal: S.pal, needle: true, seed: sp.seed || 5, dense: sp.dense, ids: sp.ids, rim: 1.4 });
    body.push(cr.node);
    if (sp.blooms && !S.icon)
        body.push((0, kit_1.blossoms)(S, (0, kit_1.upperRim)(ms, sp.blooms, 3), 2.5, 'pearl'));
    return { body, back: sp.back || [], front: sp.front || [], glow: sp.glow || null, perch: sp.perch, organs: cr.organs };
}
const moss = (S, xs) => S.icon
    ? null
    : (0, kit_1.G)('moss', [(0, kit_1.L)(xs.map((x) => `M${x - 3} 170.5Q${x} 166.5 ${x + 3} 170.5`).join(''), S.lineOf('grove'), S.fine * 1.5), (0, kit_1.P)(xs.map((x) => `M${x - 3} 170.5Q${x} 166.5 ${x + 3} 170.5Z`).join(''), S.washOf('grove'), { opacity: S.washOp })]);
const bonsaiForms = {
    I: (c) => {
        const { S } = c;
        let nd = '';
        for (const [x, y, a] of [
            [104, 128, -90],
            [96, 140, -150],
            [101, 146, -30],
        ])
            nd += (0, kit_1.needles)(x, y, 8, a * kit_1.D2R, 5, 1.6);
        return { body: [(0, kit_1.G)('sprout', [(0, kit_1.L)('M100 171Q92 158 98 148Q104 138 104 128M98 148L96 140M100 150L101 146', S.wood(BB), S.main * 1.3), (0, kit_1.L)(nd, S.lineOf(S.pal), S.fine * 1.3)])], perch: [80, 168] };
    },
    II: (c) => bonsaiTree(c, {
        trunks: [[[100, 171], [100, 130], [100, 82], 11, 3]],
        ids: false,
        seed: 6,
        limbs: [
            [[100, 138], [86, 134], [76, 130], 3, 1.2],
            [[100, 120], [114, 116], [124, 114], 3, 1.2],
        ],
        masses: [(0, kit_1.M)(74, 128, 20, 12, 1), (0, kit_1.M)(126, 112, 18, 12, 2), (0, kit_1.M)(100, 84, 20, 14, 3)],
        perch: [74, 118],
    }),
    III: (c) => bonsaiTree(c, {
        trunks: [
            [[100, 171], [116, 150], [96, 128], 15, 9],
            [[96, 129], [82, 110], [104, 88], 9, 4],
        ],
        seed: 7,
        limbs: [
            [[99, 134], [80, 128], [62, 124], 3.6, 1.2],
            [[92, 112], [80, 102], [70, 96], 3.4, 1.2],
            [[102, 140], [122, 132], [140, 126], 3.6, 1.2],
            [[100, 104], [118, 100], [134, 100], 3.4, 1.2],
        ],
        masses: [(0, kit_1.M)(60, 124, 22, 13, 1), (0, kit_1.M)(70, 96, 20, 13, 2), (0, kit_1.M)(104, 76, 24, 16, 3), (0, kit_1.M)(134, 100, 20, 13, 4), (0, kit_1.M)(140, 126, 20, 13, 5)],
        perch: [60, 112],
    }),
    IV: (c) => bonsaiTree(c, {
        trunks: [
            [[92, 171], [96, 130], [138, 96], 17, 7],
            [[136, 97], [150, 88], [160, 84], 7, 3],
        ],
        seed: 8,
        limbs: [
            [[99, 140], [94, 128], [96, 122], 3.6, 1.2],
            [[110, 120], [116, 110], [124, 108], 3.6, 1.2],
            [[126, 104], [140, 108], [154, 110], 3.6, 1.2],
        ],
        masses: [(0, kit_1.M)(94, 124, 14, 10, 1), (0, kit_1.M)(120, 106, 22, 11, 2), (0, kit_1.M)(156, 82, 30, 14, 3), (0, kit_1.M)(156, 108, 24, 11, 4), (0, kit_1.M)(170, 126, 18, 10, 5)],
        blooms: 6,
        glow: [128, 112, 62],
        perch: [120, 94],
        front: [moss(c.S, [80, 108, 116])],
    }),
};
const bonsaiFlavours = {
    lookout: (c) => bonsaiTree(c, {
        trunks: [
            [[100, 171], [88, 130], [102, 96], 8, 5],
            [[102, 97], [114, 70], [108, 46], 5, 2.4],
        ],
        seed: 9,
        fur: false,
        limbs: [
            [[106, 66], [96, 70], [88, 72], 2.2, 1],
            [[109, 58], [118, 62], [126, 62], 2.2, 1],
        ],
        masses: [(0, kit_1.M)(86, 72, 14, 8, 1), (0, kit_1.M)(96, 56, 13, 8, 2), (0, kit_1.M)(110, 42, 15, 9, 3), (0, kit_1.M)(126, 60, 13, 8, 4), (0, kit_1.M)(120, 76, 11, 7, 5)],
        blooms: 3,
        glow: [104, 96, 64],
        perch: [86, 62],
    }),
    moot: (c) => bonsaiTree(c, {
        trunks: [[[100, 171], [100, 146], [100, 112], 18, 11]],
        seed: 10,
        limbs: [
            [[100, 136], [70, 132], [46, 130], 4, 1.4],
            [[100, 136], [130, 132], [154, 130], 4, 1.4],
            [[100, 120], [80, 114], [66, 112], 3.6, 1.2],
            [[100, 120], [120, 114], [134, 112], 3.6, 1.2],
        ],
        masses: [(0, kit_1.M)(44, 130, 20, 9, 1, { flat: 0.45 }), (0, kit_1.M)(156, 130, 20, 9, 5, { flat: 0.45 }), (0, kit_1.M)(64, 112, 24, 9, 2, { flat: 0.45 }), (0, kit_1.M)(136, 112, 24, 9, 4, { flat: 0.45 }), (0, kit_1.M)(100, 94, 44, 12, 3, { flat: 0.45 })],
        blooms: 4,
        glow: [100, 116, 64],
        perch: [44, 118],
        front: [
            (0, kit_1.stones)(c.S, 'stones-front', [
                [78, 170.5, 2.6],
                [88, 171.5, 2.2],
                [114, 171.5, 2.2],
                [124, 170.5, 2.6],
                [100, 172, 2],
            ]),
        ],
    }),
    espalier: (c) => {
        const lim = [
            [[100, 150], [80, 140], [56, 136]],
            [[100, 132], [76, 116], [62, 104]],
            [[100, 132], [124, 116], [138, 104]],
            [[100, 150], [120, 140], [144, 136]],
        ];
        let wire = '';
        for (const [a, cc, b] of lim)
            for (let t = 0.1; t < 0.95; t += 0.1) {
                const p = (0, kit_1.qp)(a, cc, b, t);
                wire += `M${(0, kit_1.f)(p[0] - 1.4)} ${(0, kit_1.f)(p[1] + 2)}L${(0, kit_1.f)(p[0] + 1.4)} ${(0, kit_1.f)(p[1] - 2)}`;
            }
        for (let y = 168; y > 96; y -= 6)
            wire += `M97 ${y + 2}L103 ${y - 2}`;
        return bonsaiTree(c, {
            trunks: [[[100, 171], [100, 130], [100, 88], 10, 4]],
            seed: 11,
            wire,
            limbs: lim.map(([a, cc, b]) => [a, cc, b, 3.6, 1.2]),
            masses: [(0, kit_1.M)(52, 134, 18, 10, 1), (0, kit_1.M)(60, 100, 18, 10, 2), (0, kit_1.M)(100, 80, 22, 12, 3), (0, kit_1.M)(140, 100, 18, 10, 4), (0, kit_1.M)(148, 134, 18, 10, 5)],
            blooms: 4,
            glow: [100, 112, 62],
            perch: [52, 122],
        });
    },
    coppice: (c) => bonsaiTree(c, {
        trunks: [
            [[94, 171], [86, 140], [78, 102], 9, 3],
            [[100, 171], [102, 128], [102, 78], 11, 3],
            [[106, 171], [116, 142], [124, 108], 8, 3],
        ],
        seed: 12,
        limbs: [
            [[86, 132], [74, 124], [64, 118], 2.6, 1],
            [[112, 140], [128, 132], [140, 122], 2.6, 1],
        ],
        masses: [(0, kit_1.M)(64, 114, 18, 11, 1), (0, kit_1.M)(78, 98, 17, 11, 2), (0, kit_1.M)(102, 76, 22, 13, 3), (0, kit_1.M)(124, 102, 17, 11, 4), (0, kit_1.M)(140, 118, 17, 11, 5)],
        blooms: 4,
        glow: [102, 110, 62],
        perch: [64, 102],
    }),
    holdfast: (c) => {
        const rock = 'M72 171C70 160 76 148 88 144C96 141 106 141 114 144C124 148 130 160 128 171Z';
        return bonsaiTree(c, {
            trunks: [[[100, 146], [98, 126], [100, 104], 15, 8]],
            seed: 13,
            dense: true,
            roots: [
                [[96, 146], [80, 148], [76, 171], 4.4, 1.6],
                [[98, 147], [90, 158], [90, 171], 4, 1.6],
                [[102, 147], [110, 158], [110, 171], 4, 1.6],
                [[104, 146], [120, 148], [124, 171], 4.4, 1.6],
            ],
            limbs: [
                [[99, 116], [86, 110], [76, 106], 3.4, 1.2],
                [[101, 114], [114, 108], [124, 104], 3.4, 1.2],
            ],
            masses: [(0, kit_1.M)(76, 104, 20, 14, 1), (0, kit_1.M)(124, 102, 20, 14, 5), (0, kit_1.M)(84, 88, 20, 14, 2), (0, kit_1.M)(116, 86, 20, 14, 4), (0, kit_1.M)(100, 76, 24, 16, 3)].map((m) => ({ ...m, flat: 0.75 })),
            blooms: 4,
            back: [(0, kit_1.boulder)(c.S, rock, 100, 156, 28, 15)],
            glow: [100, 104, 62],
            perch: [76, 92],
        });
    },
};
exports.CONIFER_LINES = {
    pine: { pal: 'evergreen', forms: pineForms, flavours: pineFlavours },
    'coconut-palm': { pal: 'spring', forms: palmForms, flavours: palmFlavours },
    bonsai: { pal: 'grove', forms: bonsaiForms, flavours: bonsaiFlavours },
};
  };
  links["src/components/plant/forms/flowers.ts"] = {"./kit":"src/components/plant/forms/kit.ts"};
  defs["src/components/plant/forms/flowers.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOWER_LINES = void 0;
const kit_1 = require("./kit");
const POST = kit_1.A0.planter.post;
const groundStones = (c) => c.inPot
    ? {
        back: [],
        front: [
            (0, kit_1.stones)(c.S, 'stones-front', [
                [100 - Math.min(c.span, 28) * 0.8, 170.5, 2.8],
                [100 - Math.min(c.span, 28) * 0.4, 171.5, 2.4],
                [100 + Math.min(c.span, 28) * 0.4, 171.5, 2.4],
                [100 + Math.min(c.span, 28) * 0.8, 170.5, 2.8],
                [100, 172, 2.2],
            ]),
        ],
    }
    : { back: [(0, kit_1.stones)(c.S, 'stones', [[54, 167, 7], [146, 167, 7]])], front: [(0, kit_1.stones)(c.S, 'stones-front', [[72, 175, 6], [128, 175, 6], [100, 179, 5]])] };
const rockAt = (c, w = 42, h = 30) => {
    const sc = c.inPot ? Math.min(1, (c.span + 6) / w) : 1;
    const X = (x) => 100 + (x - 100) * sc;
    const top = 170 - h * sc;
    const d = `M${(0, kit_1.f)(X(100 - w))} 171C${(0, kit_1.f)(X(100 - w - 3))} ${(0, kit_1.f)(170 - h * 0.5 * sc)} ${(0, kit_1.f)(X(100 - w * 0.6))} ${(0, kit_1.f)(top + 2)} ${(0, kit_1.f)(X(96))} ${(0, kit_1.f)(top)}C${(0, kit_1.f)(X(100 + w * 0.5))} ${(0, kit_1.f)(top - 1)} ${(0, kit_1.f)(X(100 + w))} ${(0, kit_1.f)(170 - h * 0.45 * sc)} ${(0, kit_1.f)(X(100 + w - 1))} 171Z`;
    return { node: (0, kit_1.boulder)(c.S, d, 100, 170 - h * 0.5 * sc, w * sc, h * 0.5 * sc), top, X };
};
const ties = (S, pts) => S.icon ? null : (0, kit_1.G)('ties', [(0, kit_1.L)(pts.map(([x0, x1, y]) => `M${x0} ${y}Q${(0, kit_1.f)((x0 + x1) / 2)} ${y - 2.6} ${x1} ${y}Q${(0, kit_1.f)((x0 + x1) / 2)} ${y + 2.6} ${x0} ${y}`).join(''), S.wood(POST), S.hair * 1.6)]);
function stalk(S, p0, pc, p1, w0, w1, pal) {
    if (w0 < 3.2)
        return (0, kit_1.G)('stem', [(0, kit_1.L)((0, kit_1.Q)(p0, pc, p1), S.lineOf(pal), S.main)]);
    const t = (0, kit_1.taper)(p0, pc, p1, w0, w1);
    return (0, kit_1.G)('stem', [(0, kit_1.P)(t.closed, S.massFill(pal, true)), (0, kit_1.L)(t.sides, S.lineOf(pal), S.main)]);
}
function sunHead(S, x, y, R, o = {}) {
    var _a, _b, _c;
    const sx = (_a = o.sx) !== null && _a !== void 0 ? _a : 1;
    const sy = (_b = o.sy) !== null && _b !== void 0 ? _b : 1;
    const rot = (_c = o.rot) !== null && _c !== void 0 ? _c : 0;
    const pal = S.pal;
    const at = (u, v) => [x + u * sx * Math.cos(rot) - v * sy * Math.sin(rot), y + u * sx * Math.sin(rot) + v * sy * Math.cos(rot)];
    const np = R > 16 ? 22 : 16;
    const pl = R * 0.78;
    let back = '';
    let front = '';
    for (let i = 0; i < np; i++) {
        const a = (i / np) * Math.PI * 2;
        const b0 = at(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
        const b1 = at(Math.cos(a) * (R + pl), Math.sin(a) * (R + pl));
        const ang = Math.atan2(b1[1] - b0[1], b1[0] - b0[0]);
        const len = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
        const d = (0, kit_1.xf)('M0 0Q0.36 -0.5 0 -1Q-0.36 -0.5 0 0Z', b0[0], b0[1], ang + Math.PI / 2, len, Math.max(0.55, Math.min(1, len / pl)));
        if (i % 2)
            back += d + ' ';
        else
            front += d + ' ';
    }
    const ring = [];
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        ring.push(at(Math.cos(a) * R, Math.sin(a) * R));
    }
    const discD = (0, kit_1.smooth)(ring);
    let dots = '';
    if (!S.icon) {
        const n = S.full ? Math.round(R * 2.2) : Math.round(R * 0.8);
        for (let i = 1; i <= n; i++) {
            const rr = R * 0.82 * Math.sqrt(i / n);
            const a = i * 2.39996;
            const p = at(Math.cos(a) * rr, Math.sin(a) * rr);
            dots += `M${(0, kit_1.f)(p[0])} ${(0, kit_1.f)(p[1])}h0.01`;
        }
    }
    const dc = kit_1.A0.sunflower.discMid;
    return (0, kit_1.G)('head', [
        (0, kit_1.P)(back.trim(), S.washOf(pal), { opacity: 0.65 }),
        (0, kit_1.L)(back.trim(), S.lineOf(pal), S.fine * 1.3),
        (0, kit_1.P)(front.trim(), S.washOf(pal), { opacity: 0.9 }),
        (0, kit_1.L)(front.trim(), S.lineOf(pal), S.fine * 1.4),
        (0, kit_1.P)(discD, S.giftFill(dc)),
        (0, kit_1.L)(discD, S.wood(dc), S.main),
        dots ? (0, kit_1.L)(dots, S.wood(kit_1.A0.sunflower.seeds), 1.7) : null,
    ]);
}
function sunLeaves(S, p0, pc, p1, spec, fol, o = {}) {
    const organs = [];
    const gs = spec.map(([t, side, len0, ang], i) => {
        const len = len0 * (o.ids === false ? 1 : S.sc(i + 1));
        const p = (0, kit_1.qp)(p0, pc, p1, t);
        const a = (ang !== null && ang !== void 0 ? ang : -90 + side * 60) * kit_1.D2R;
        const pet = [p[0] + Math.cos(a) * 5, p[1] + Math.sin(a) * 5];
        const set = (0, kit_1.leafSet)().add((0, kit_1.leaf)('heart', pet[0], pet[1], len * (S.small ? 1.1 : 1), a, S));
        organs.push({ dom: i + 1, x: pet[0] + Math.cos(a) * len * 0.5, y: pet[1] + Math.sin(a) * len * 0.5 });
        return (0, kit_1.G)(o.ids === false ? null : `domain-${i + 1}`, [(0, kit_1.P)(set.wash(), S.washOf(fol), { opacity: S.washOp }), (0, kit_1.L)(`M${(0, kit_1.f)(p[0])} ${(0, kit_1.f)(p[1])}L${(0, kit_1.f)(pet[0])} ${(0, kit_1.f)(pet[1])} ` + set.line(), S.lineOf(fol), S.fine * 1.4)]);
    });
    return { node: (0, kit_1.G)('leaves', gs), organs };
}
const SEPAL = 'M0 0Q0.4 -0.6 0 -1Q-0.4 -0.6 0 0Z';
const sunflower = {
    pal: 'gold',
    fol: 'spring',
    forms: {
        I: (c) => {
            const { S } = c;
            const set = (0, kit_1.leafSet)();
            const fol = S.fol;
            set.add((0, kit_1.leaf)('ovate', 100, 140, 16, -150 * kit_1.D2R, S, 1.25)).add((0, kit_1.leaf)('ovate', 100, 140, 16, -30 * kit_1.D2R, S, 1.25));
            const sd = kit_1.A0.seed.sunflower;
            const cap = 'M0 -6C3 -6 3.6 -2 3.6 0C3.6 3 2 6 0 6C-2 6 -3.6 3 -3.6 0C-3.6 -2 -3 -6 0 -6Z';
            return {
                cutaway: (0, kit_1.cutaway)(S, 64, 136, 171, 188, 12),
                body: [
                    (0, kit_1.G)('roots', [(0, kit_1.L)('M100 171Q99 179 101 189M100 179l-4 3M100 184l4 2', S.wood(sd), S.fine * 1.5)]),
                    (0, kit_1.G)('sprout', [(0, kit_1.L)('M100 171Q99 156 100 140', S.lineOf(fol), S.main), (0, kit_1.P)(set.wash(), S.washOf(fol), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(fol), S.main)]),
                    (0, kit_1.G)('seed', [
                        (0, kit_1.P)((0, kit_1.xf)(cap, 86, 129, -0.9, 1), S.woodFill(sd)),
                        S.icon ? null : (0, kit_1.L)((0, kit_1.xf)('M-1.4 -4.6L-1.6 4.6M1.4 -4.6L1.6 4.6', 86, 129, -0.9, 1), kit_1.A0.seed.sunflowerStripe, S.hair * 2),
                        (0, kit_1.L)((0, kit_1.xf)(cap, 86, 129, -0.9, 1), S.wood(sd), S.main),
                    ]),
                ],
                perch: [72, 170],
            };
        },
        II: (c) => {
            const { S } = c;
            const fol = S.fol;
            const p0 = [100, 171];
            const pc = [99, 120];
            const p1 = [100, 64];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.2, -1, 24],
                [0.2, 1, 24],
                [0.45, -1, 21],
                [0.45, 1, 21],
                [0.7, -1, 17],
                [0.7, 1, 17],
            ], fol, { ids: false });
            let sep = '';
            for (let i = 0; i < 8; i++)
                sep += (0, kit_1.xf)(SEPAL, 100, 58, (i / 8) * Math.PI * 2, 10) + ' ';
            return { body: [stalk(S, p0, pc, p1, 3.4, 2.6, fol), lv.node, (0, kit_1.G)('head', [(0, kit_1.P)(sep, S.washOf(fol), { opacity: S.washOp }), (0, kit_1.L)(sep + (0, kit_1.disc)(100, 58, 4), S.lineOf(fol), S.fine * 1.4)])], perch: [76, 128] };
        },
        III: (c) => {
            const { S } = c;
            const p0 = [100, 171];
            const pc = [97, 112];
            const p1 = [104, 64];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.12, -1, 26],
                [0.26, 1, 25],
                [0.42, -1, 23],
                [0.56, 1, 21],
                [0.7, -1, 18],
            ], S.fol);
            return { body: [stalk(S, p0, pc, p1, 5, 3.6, S.fol), lv.node, sunHead(S, 110, 52, 14, { sx: 0.6, rot: -0.15 })], perch: [76, 112], organs: lv.organs };
        },
        IV: (c) => {
            const { S } = c;
            const p0 = [100, 171];
            const pc = [95, 104];
            const p1 = [103, 66];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.1, -1, 32],
                [0.24, 1, 31],
                [0.4, -1, 28],
                [0.56, 1, 25],
                [0.72, -1, 21],
            ], S.fol);
            const bud = (0, kit_1.qp)(p0, pc, p1, 0.5);
            let sep = '';
            for (let i = 0; i < 7; i++)
                sep += (0, kit_1.xf)(SEPAL, 80, 100, (i / 7) * Math.PI * 2, 6) + ' ';
            return {
                body: [
                    stalk(S, p0, pc, p1, 7, 5, S.fol),
                    (0, kit_1.G)('stem', [(0, kit_1.L)(`M${(0, kit_1.f)(bud[0])} ${(0, kit_1.f)(bud[1])}Q86 104 80 100`, S.lineOf(S.fol), S.main)]),
                    lv.node,
                    S.icon ? null : (0, kit_1.G)('bud', [(0, kit_1.P)(sep, S.washOf(S.fol), { opacity: S.washOp }), (0, kit_1.L)(sep, S.lineOf(S.fol), S.fine * 1.3)]),
                    sunHead(S, 104, 44, 21),
                ],
                glow: [104, 50, 60],
                perch: [72, 128],
                organs: lv.organs,
            };
        },
    },
    flavours: {
        lookout: (c) => {
            const { S } = c;
            const p0 = [100, 171];
            const pc = [99, 100];
            const p1 = [102, 34];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.06, -1, 24],
                [0.14, 1, 24],
                [0.23, -1, 22],
                [0.31, 1, 21],
                [0.39, -1, 19],
            ], S.fol);
            return { body: [stalk(S, p0, pc, p1, 4.6, 3.2, S.fol), lv.node, sunHead(S, 108, 26, 13, { sx: 0.58, rot: -0.3 })], glow: [104, 40, 40], perch: [80, 132], organs: lv.organs };
        },
        moot: (c) => {
            const { S } = c;
            const p0 = [100, 171];
            const pc = [100, 120];
            const p1 = [100, 70];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.18, -1, 30, -178],
                [0.18, 1, 30, -2],
                [0.46, -1, 26, -176],
                [0.46, 1, 26, -4],
                [0.74, 1, 20, -30],
            ], S.fol);
            return { body: [stalk(S, p0, pc, p1, 6.4, 5, S.fol), lv.node, sunHead(S, 100, 54, 19, { sy: 0.5 })], ...groundStones(c), glow: [100, 76, 66], perch: [64, 136], organs: lv.organs };
        },
        espalier: (c) => {
            const { S } = c;
            const p0 = [100, 171];
            const pc = [100, 110];
            const p1 = [100, 62];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.18, -1, 28, -172],
                [0.18, 1, 28, -8],
                [0.46, -1, 25, -174],
                [0.46, 1, 25, -6],
                [0.72, -1, 20, -166],
            ], S.fol);
            return {
                back: [(0, kit_1.G)('frame', [(0, kit_1.L)('M113 171L113 40', S.wood(POST), S.main * 1.6)])],
                body: [
                    stalk(S, p0, pc, p1, 6, 4.4, S.fol),
                    lv.node,
                    ties(S, [
                        [100, 113, 146],
                        [100, 113, 114],
                        [100, 113, 82],
                    ]),
                    sunHead(S, 100, 46, 17),
                ],
                glow: [100, 66, 60],
                perch: [116, 38],
                organs: lv.organs,
            };
        },
        coppice: (c) => {
            const { S } = c;
            const p0 = [100, 171];
            const pc = [99, 116];
            const p1 = [100, 66];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.1, -1, 26],
                [0.22, 1, 25],
                [0.6, -1, 18],
                [0.72, 1, 17],
                [0.84, -1, 15],
            ], S.fol);
            return {
                body: [
                    stalk(S, p0, pc, p1, 6, 4, S.fol),
                    (0, kit_1.G)('stem', [(0, kit_1.L)('M100 136Q84 120 70 94M100 126Q118 112 132 90', S.lineOf(S.fol), S.main * 1.3)]),
                    lv.node,
                    sunHead(S, 68, 84, 10, { sx: 0.7, rot: 0.35 }),
                    sunHead(S, 134, 80, 10, { sx: 0.7, rot: -0.35 }),
                    sunHead(S, 100, 52, 15),
                ],
                glow: [100, 76, 70],
                perch: [62, 140],
                organs: lv.organs,
            };
        },
        holdfast: (c) => {
            const { S } = c;
            const r = rockAt(c, 40, 28);
            const top = r.top + 4;
            const p0 = [100, top];
            const pc = [98, 104];
            const p1 = [112, 80];
            const lv = sunLeaves(S, p0, pc, p1, [
                [0.06, -1, 32, -168],
                [0.1, 1, 32, -12],
                [0.3, -1, 28, -142],
                [0.34, 1, 28, -38],
                [0.56, -1, 22, -118],
            ], S.fol);
            return {
                back: [r.node],
                body: [
                    (0, kit_1.rootTapers)(S, [
                        [[97, top], [r.X(74), top + 4], [r.X(66), 171], 4, 1.6],
                        [[99, top], [r.X(90), top + 14], [r.X(90), 171], 3.6, 1.6],
                        [[101, top], [r.X(112), top + 14], [r.X(114), 171], 3.6, 1.6],
                        [[103, top], [r.X(128), top + 4], [r.X(134), 171], 4, 1.6],
                    ], kit_1.A0.seed.sunflower),
                    stalk(S, p0, pc, p1, 9, 7, S.fol),
                    lv.node,
                    sunHead(S, 122, 90, 16, { sy: 0.42, rot: 0.75 }),
                ],
                glow: [106, 92, 62],
                perch: [66, 112],
                organs: lv.organs,
            };
        },
    },
};
function floatPad(S, x, y, rx, ry) {
    const d = `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}L${(0, kit_1.f)(x + rx * 0.95)} ${(0, kit_1.f)(y - ry * 0.25)}A${(0, kit_1.f)(rx)} ${(0, kit_1.f)(ry)} 0 1 0 ${(0, kit_1.f)(x + rx * 0.95)} ${(0, kit_1.f)(y + ry * 0.25)}Z`;
    let v = '';
    if (S.full)
        for (let i = 1; i < 7; i++) {
            const a = 0.4 + i * 0.85;
            v += `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}L${(0, kit_1.f)(x + Math.cos(a) * rx * 0.85)} ${(0, kit_1.f)(y + Math.sin(a) * ry * 0.85)}`;
        }
    return { wash: d, line: d + v, stalk: '' };
}
function raisedPad(S, x, top, rx, bend = 0) {
    const ry = rx * 0.42;
    const d = `M${(0, kit_1.f)(x - rx)} ${(0, kit_1.f)(top)}Q${(0, kit_1.f)(x)} ${(0, kit_1.f)(top + ry * 1.5)} ${(0, kit_1.f)(x + rx)} ${(0, kit_1.f)(top)}Q${(0, kit_1.f)(x)} ${(0, kit_1.f)(top - ry * 0.7)} ${(0, kit_1.f)(x - rx)} ${(0, kit_1.f)(top)}Z`;
    const v = S.full ? `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(top + ry * 0.4)}L${(0, kit_1.f)(x - rx * 0.6)} ${(0, kit_1.f)(top + ry * 0.1)}M${(0, kit_1.f)(x)} ${(0, kit_1.f)(top + ry * 0.4)}L${(0, kit_1.f)(x + rx * 0.6)} ${(0, kit_1.f)(top + ry * 0.1)}` : '';
    return { wash: d, line: d + v, stalk: `M${(0, kit_1.f)(x + bend)} 170Q${(0, kit_1.f)(x + bend * 0.4)} ${(0, kit_1.f)((170 + top) / 2)} ${(0, kit_1.f)(x)} ${(0, kit_1.f)(top + ry * 0.55)}` };
}
function pads(S, spec) {
    const organs = [];
    const back = [];
    const front = [];
    for (const [kind, x, y, rx0, dom] of spec) {
        const fol = S.fol;
        const rx = rx0 * (dom ? S.sc(dom) : 1);
        const p = kind === 'f' ? floatPad(S, x, y, rx, rx * 0.32) : raisedPad(S, x, y, rx, (x - 100) * 0.12);
        const g = (0, kit_1.G)(dom ? `domain-${dom}` : null, [p.stalk ? (0, kit_1.L)(p.stalk, S.lineOf(fol), S.fine * 1.5) : null, (0, kit_1.P)(p.wash, S.massFill(fol)), (0, kit_1.P)(p.wash, S.washOf(fol), { opacity: 0.3 }), (0, kit_1.L)(p.line, S.lineOf(fol), S.fine * 1.4)]);
        (kind === 'f' ? front : back).push(g);
        if (dom)
            organs.push({ dom, x, y });
    }
    return { back: (0, kit_1.G)('pads', back), front: (0, kit_1.G)('pads-front', front), organs };
}
const petal = (x, y, len, ang, w = 0.34) => (0, kit_1.xf)(`M0 0Q${(0, kit_1.f)(w * 1.4)} -0.5 0 -1Q${(0, kit_1.f)(-w * 1.4)} -0.5 0 0Z`, x, y, ang + Math.PI / 2, len);
function lotusBloom(S, x, y, R, o = {}) {
    const pal = S.pal;
    if (o.bud) {
        const d = petal(x, y + 2, R * 1.1, -Math.PI / 2, 0.42) + ' ' + petal(x, y + 2, R * 0.85, -Math.PI / 2 - 0.42, 0.3) + ' ' + petal(x, y + 2, R * 0.85, -Math.PI / 2 + 0.42, 0.3);
        return (0, kit_1.G)('flower', [(0, kit_1.P)(d, S.washOf(pal), { opacity: 0.8 }), (0, kit_1.L)(d, S.lineOf(pal), S.fine * 1.5)]);
    }
    const open = o.cup ? 0.55 : 1;
    const back = [-1.2, -0.72, -0.24, 0.24, 0.72, 1.2].map((a) => petal(x, y, R, -Math.PI / 2 + a * open, 0.34)).join(' ');
    const front = [-0.9, -0.32, 0.32, 0.9].map((a) => petal(x, y + 2, R * 0.86, -Math.PI / 2 + a * 0.9 * open, 0.36)).join(' ') + ' ' + petal(x, y + 3, R * 0.95, -Math.PI / 2, 0.36);
    const kids = [(0, kit_1.P)(back, S.washOf(pal), { opacity: 0.55 }), (0, kit_1.L)(back, S.lineOf(pal), S.fine * 1.3), (0, kit_1.P)(front, S.washOf(pal), { opacity: 0.88 }), (0, kit_1.L)(front, S.lineOf(pal), S.fine * 1.5)];
    if (!o.cup && !S.icon) {
        const w = R * 0.26;
        const pod = `M${(0, kit_1.f)(x - w)} ${(0, kit_1.f)(y - R * 0.3)}Q${(0, kit_1.f)(x)} ${(0, kit_1.f)(y - R * 0.46)} ${(0, kit_1.f)(x + w)} ${(0, kit_1.f)(y - R * 0.3)}L${(0, kit_1.f)(x + w * 0.7)} ${(0, kit_1.f)(y - R * 0.06)}Q${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)} ${(0, kit_1.f)(x - w * 0.7)} ${(0, kit_1.f)(y - R * 0.06)}Z`;
        let st = '';
        for (let i = 0; i < 9; i++) {
            const a = -Math.PI + (i / 8) * Math.PI;
            st += `M${(0, kit_1.f)(x + Math.cos(a) * w * 1.1)} ${(0, kit_1.f)(y - R * 0.18)}l${(0, kit_1.f)(Math.cos(a) * 2.4)} ${(0, kit_1.f)(Math.sin(a) * 2.4 - 1)}`;
        }
        kids.push((0, kit_1.L)(st, S.gold, S.fine * 1.2), (0, kit_1.P)(pod, S.giftFill(kit_1.A0.lotus.podTop)), (0, kit_1.L)(pod + (S.full ? `M${(0, kit_1.f)(x - w * 0.4)} ${(0, kit_1.f)(y - R * 0.33)}h0.01M${(0, kit_1.f)(x + w * 0.4)} ${(0, kit_1.f)(y - R * 0.33)}h0.01M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y - R * 0.35)}h0.01` : ''), S.lineOf(S.fol), S.fine * 1.4));
    }
    return (0, kit_1.G)('flower', kids);
}
const stems = (S, list) => (0, kit_1.G)('stem', [(0, kit_1.L)(list.join(''), S.lineOf(S.fol), S.main)]);
function seedHead(S, x, y) {
    if (S.icon)
        return null;
    const d = `M${(0, kit_1.f)(x - 7)} ${(0, kit_1.f)(y)}L${(0, kit_1.f)(x + 7)} ${(0, kit_1.f)(y)}L${(0, kit_1.f)(x + 3.5)} ${(0, kit_1.f)(y + 9)}L${(0, kit_1.f)(x - 3.5)} ${(0, kit_1.f)(y + 9)}Z`;
    return (0, kit_1.G)('fruit', [
        (0, kit_1.P)(d, S.giftFill(kit_1.A0.lotus.pod)),
        (0, kit_1.L)(d + `M${(0, kit_1.f)(x - 3.5)} ${(0, kit_1.f)(y + 3)}h0.01M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y + 3)}h0.01M${(0, kit_1.f)(x + 3.5)} ${(0, kit_1.f)(y + 3)}h0.01M${(0, kit_1.f)(x - 1.8)} ${(0, kit_1.f)(y + 6)}h0.01M${(0, kit_1.f)(x + 1.8)} ${(0, kit_1.f)(y + 6)}h0.01`, S.lineOf(S.fol), S.fine * 1.4),
    ]);
}
const lotus = {
    pal: 'blossom',
    fol: 'grove',
    forms: {
        I: (c) => {
            const { S } = c;
            const pd = pads(S, [['f', 112, 169, 13]]);
            const set = (0, kit_1.leafSet)().add((0, kit_1.leaf)('narrow', 92, 150, 18, -84 * kit_1.D2R, S, 0.6));
            return { body: [pd.back, (0, kit_1.G)('sprout', [(0, kit_1.L)('M92 170Q90 160 92 150', S.lineOf(S.fol), S.main), (0, kit_1.P)(set.wash(), S.washOf(S.fol), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(S.fol), S.main)]), pd.front], perch: [74, 166] };
        },
        II: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 86, 128, 12],
                ['r', 118, 114, 13],
                ['f', 68, 169, 14],
                ['f', 132, 170, 12],
            ]);
            const set = (0, kit_1.leafSet)().add((0, kit_1.leaf)('narrow', 104, 140, 16, -88 * kit_1.D2R, S, 0.6));
            return { body: [pd.back, (0, kit_1.G)('sprout', [(0, kit_1.L)('M104 170Q103 154 104 140', S.lineOf(S.fol), S.main), (0, kit_1.P)(set.wash(), S.washOf(S.fol), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(S.fol), S.main)]), pd.front], perch: [72, 120] };
        },
        III: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 80, 128, 14, 2],
                ['r', 124, 122, 14, 4],
                ['r', 92, 108, 11, 3],
                ['f', 62, 169, 15, 1],
                ['f', 140, 169, 14, 5],
            ]);
            return { body: [pd.back, stems(S, ['M100 170Q98 130 100 94']), lotusBloom(S, 100, 94, 24, { bud: true }), pd.front], perch: [66, 116], organs: pd.organs };
        },
        IV: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 72, 132, 15, 2],
                ['r', 130, 128, 16, 4],
                ['r', 100, 148, 12, 3],
                ['f', 56, 169, 16, 1],
                ['f', 146, 169, 15, 5],
            ]);
            return {
                body: [pd.back, stems(S, ['M100 170Q97 136 100 106', 'M112 170Q122 130 138 96', 'M90 170Q80 140 70 116']), seedHead(S, 138, 90), lotusBloom(S, 70, 116, 16, { bud: true }), lotusBloom(S, 100, 104, 26), pd.front],
                glow: [100, 100, 62],
                perch: [56, 120],
                organs: pd.organs,
            };
        },
    },
    flavours: {
        lookout: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 78, 146, 14, 2],
                ['r', 122, 142, 14, 4],
                ['r', 100, 156, 10, 3],
                ['f', 60, 169, 15, 1],
                ['f', 142, 169, 14, 5],
            ]);
            return { body: [pd.back, stems(S, ['M100 170Q96 104 100 44']), lotusBloom(S, 100, 44, 20), pd.front], glow: [100, 52, 48], perch: [64, 132], organs: pd.organs };
        },
        moot: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 56, 136, 14, 1],
                ['r', 78, 130, 14, 2],
                ['r', 122, 130, 14, 4],
                ['r', 144, 136, 14, 5],
                ['f', 100, 169, 16, 3],
            ]);
            const st = groundStones(c);
            return { body: [pd.back, stems(S, ['M100 170Q99 140 100 114']), lotusBloom(S, 100, 114, 24), pd.front], back: st.back, front: st.front, glow: [100, 112, 62], perch: [56, 124], organs: pd.organs };
        },
        espalier: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 60, 138, 11, 1],
                ['r', 80, 138, 11, 2],
                ['r', 100, 144, 10, 3],
                ['r', 120, 138, 11, 4],
                ['r', 140, 138, 11, 5],
            ]);
            const w = c.inPot ? Math.min(34, c.span) : 34;
            return {
                back: [(0, kit_1.G)('frame', [(0, kit_1.L)(`M${100 - w} 171L${100 - w} 70M${100 + w} 171L${100 + w} 70`, S.wood(POST), S.main * 1.5), S.icon ? null : (0, kit_1.L)(`M${100 - w} 76L${100 + w} 76M${100 - w} 112L${100 + w} 112`, S.wood(POST), S.fine * 1.4)])],
                body: [
                    pd.back,
                    stems(S, ['M100 170Q100 120 100 70']),
                    ties(S, [
                        [100, 100, 76],
                        [100, 100, 112],
                    ]),
                    lotusBloom(S, 100, 70, 22),
                    pd.front,
                ],
                glow: [100, 84, 60],
                perch: [100 - w, 66],
                organs: pd.organs,
            };
        },
        coppice: (c) => {
            const { S } = c;
            const pd = pads(S, [
                ['r', 66, 140, 14, 2],
                ['r', 136, 136, 14, 4],
                ['r', 100, 152, 11, 3],
                ['f', 52, 169, 14, 1],
                ['f', 150, 169, 13, 5],
            ]);
            return {
                body: [
                    pd.back,
                    (0, kit_1.G)('rhizome', [(0, kit_1.L)('M84 170Q100 166 118 170', S.lineOf(S.fol), S.main)]),
                    stems(S, ['M100 168Q97 130 100 92', 'M90 169Q78 140 72 112', 'M112 169Q126 136 130 104']),
                    lotusBloom(S, 72, 112, 15, { bud: true }),
                    lotusBloom(S, 130, 104, 18, { cup: true }),
                    lotusBloom(S, 100, 92, 24),
                    pd.front,
                ],
                glow: [100, 96, 66],
                perch: [52, 128],
                organs: pd.organs,
            };
        },
        holdfast: (c) => {
            const { S } = c;
            const r = rockAt(c, 30, 22);
            const pd = pads(S, [
                ['r', 66, 126, 16, 1],
                ['r', 82, 112, 15, 2],
                ['r', 118, 112, 15, 4],
                ['r', 134, 126, 16, 5],
                ['r', 100, 132, 14, 3],
            ]);
            return {
                back: [r.node],
                body: [
                    (0, kit_1.rootTapers)(S, [
                        [[96, r.top + 2], [r.X(78), r.top + 6], [r.X(72), 171], 3.6, 1.4],
                        [[104, r.top + 2], [r.X(122), r.top + 6], [r.X(128), 171], 3.6, 1.4],
                    ], kit_1.A0.seed.lotus),
                    stems(S, ['M100 150Q99 126 100 100']),
                    pd.back,
                    lotusBloom(S, 100, 100, 22, { cup: true }),
                    pd.front,
                ],
                glow: [100, 104, 60],
                perch: [66, 114],
                organs: pd.organs,
            };
        },
    },
};
const SW = kit_1.A0.seed.sampaguita;
function stars(S, pts, r0 = 4.4, id = 'blooms') {
    if (S.icon || !pts.length)
        return null;
    const R = (0, kit_1.rng)(19);
    let d = '';
    let core = '';
    for (const [x, y, s] of pts) {
        d += (0, kit_1.star)(x, y, r0 * (s || 1) * (S.small ? 1.2 : 1), R() * 40) + ' ';
        core += `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}h0.01`;
    }
    return (0, kit_1.G)(id, [(0, kit_1.P)(d, kit_1.LEAF[S.pal].light, { opacity: 0.95 }), (0, kit_1.L)(d, S.starLine, S.fine * 1.1), (0, kit_1.L)(core, kit_1.A0.sampaguita.core, 2)]);
}
const sprigs = (S, list, id = 'stem') => (0, kit_1.G)(id, [(0, kit_1.L)(list.join(''), S.wood(SW), S.main)]);
function leafPairs(S, curves, n, len, pal, id = 'leaves') {
    const set = (0, kit_1.leafSet)();
    for (const [a, cc, b] of curves)
        for (let j = 1; j <= n; j++) {
            const t = j / (n + 0.4);
            const p = (0, kit_1.qp)(a, cc, b, t);
            const tn = (0, kit_1.qa)(a, cc, b, t);
            set.add((0, kit_1.leaf)('ovate', p[0], p[1], len * (1 - t * 0.3), tn - 0.9, S, 0.8)).add((0, kit_1.leaf)('ovate', p[0], p[1], len * (1 - t * 0.3), tn + 0.9, S, 0.8));
        }
    return (0, kit_1.leavesNode)(S, id, set, pal);
}
function shrub(c, masses, o = {}) {
    const { S } = c;
    const cr = (0, kit_1.crown)(S, masses, { kind: 'ovate', ll: 8, rim: 1.6, pal: S.fol, seed: o.seed || 3, dense: true });
    const nodes = [o.stems ? sprigs(S, o.stems) : null, cr.node, stars(S, o.stars || (0, kit_1.upperRim)(masses, o.nStars || 8, o.seed || 4))];
    return { cr, nodes };
}
const sampaguita = {
    pal: 'pearl',
    fol: 'grove',
    forms: {
        I: (c) => {
            const { S } = c;
            const set = (0, kit_1.leafSet)();
            set
                .add((0, kit_1.leaf)('ovate', 101, 152, 14, -155 * kit_1.D2R, S, 0.8))
                .add((0, kit_1.leaf)('ovate', 101, 152, 14, -25 * kit_1.D2R, S, 0.8))
                .add((0, kit_1.leaf)('ovate', 103, 140, 10, -120 * kit_1.D2R, S, 0.8))
                .add((0, kit_1.leaf)('ovate', 103, 140, 10, -60 * kit_1.D2R, S, 0.8));
            return {
                cutaway: (0, kit_1.cutaway)(S, 64, 136, 171, 190, 13),
                body: [(0, kit_1.G)('roots', [(0, kit_1.L)('M95 180Q90 184 86 188M96 181Q98 186 104 189M95 181L93 189', S.wood(SW), S.fine * 1.4)]), (0, kit_1.G)('stem', [(0, kit_1.L)('M95 181L103 138', S.wood(SW), S.main * 1.7)]), (0, kit_1.leavesNode)(S, 'sprout', set, S.fol)],
                perch: [74, 170],
            };
        },
        II: (c) => {
            const { S } = c;
            const cv = [
                [[100, 171], [86, 124], [70, 96]],
                [[100, 171], [114, 116], [128, 84]],
            ];
            const bud = (0, kit_1.leafSet)()
                .add((0, kit_1.leaf)('narrow', 70, 96, 9, -130 * kit_1.D2R, S))
                .add((0, kit_1.leaf)('narrow', 66, 100, 7, -160 * kit_1.D2R, S))
                .add((0, kit_1.leaf)('narrow', 128, 84, 9, -60 * kit_1.D2R, S))
                .add((0, kit_1.leaf)('narrow', 132, 90, 7, -20 * kit_1.D2R, S));
            return {
                body: [sprigs(S, cv.map(([a, cc, b]) => (0, kit_1.Q)(a, cc, b))), leafPairs(S, cv, 3, 14, S.fol), S.icon ? null : (0, kit_1.G)('bud', [(0, kit_1.P)(bud.wash(), kit_1.LEAF[S.pal].light, { opacity: 0.95 }), (0, kit_1.L)(bud.line(), S.starLine, S.fine * 1.2)])],
                perch: [80, 150],
            };
        },
        III: (c) => {
            const ms = [(0, kit_1.M)(66, 148, 18, 14, 1), (0, kit_1.M)(134, 148, 18, 14, 5), (0, kit_1.M)(80, 128, 20, 16, 2), (0, kit_1.M)(120, 128, 20, 16, 4), (0, kit_1.M)(100, 116, 22, 17, 3)];
            const s = shrub(c, ms, { stems: ['M100 171L80 140M100 171L100 124M100 171L120 140'], nStars: 6 });
            return { body: s.nodes, perch: [62, 136], organs: s.cr.organs };
        },
        IV: (c) => {
            const { S } = c;
            const ms = [(0, kit_1.M)(46, 140, 22, 16, 1), (0, kit_1.M)(154, 140, 22, 16, 5), (0, kit_1.M)(66, 112, 26, 20, 2), (0, kit_1.M)(134, 112, 26, 20, 4), (0, kit_1.M)(100, 96, 30, 22, 3)];
            const s = shrub(c, ms, { stems: ['M100 171L60 140M100 171L100 100M100 171L140 140'], nStars: 12, seed: 5 });
            const sp = (0, kit_1.leafSet)();
            for (const [x, y, a] of [
                [26, 126, -160],
                [174, 126, -20],
                [30, 116, -140],
                [170, 116, -40],
            ])
                sp.add((0, kit_1.leaf)('ovate', x, y, 12, a * kit_1.D2R, S, 0.8));
            const g0 = [58, 132];
            const gc = [100, 168];
            const g1 = [142, 132];
            const gp = [];
            for (let t = 0.08; t < 0.95; t += 0.12)
                gp.push([...(0, kit_1.qp)(g0, gc, g1, t), 0.8]);
            return {
                body: [
                    (0, kit_1.leavesNode)(S, 'sprays', sp, S.fol, [(0, kit_1.L)('M40 136Q32 128 26 126M160 136Q168 128 174 126', S.wood(SW), S.fine * 1.4)]),
                    ...s.nodes,
                    S.icon ? null : (0, kit_1.G)('garland', [(0, kit_1.L)((0, kit_1.Q)(g0, gc, g1) + `M${g0[0]} ${g0[1]}l-1 8M${g1[0]} ${g1[1]}l1 8`, S.starLine, S.fine * 1.2)]),
                    stars(S, gp, 3.4, 'garland-flowers'),
                ],
                glow: [100, 116, 74],
                perch: [100, 72],
                organs: s.cr.organs,
            };
        },
    },
    flavours: {
        lookout: (c) => {
            const ms = [(0, kit_1.M)(78, 78, 16, 13, 1), (0, kit_1.M)(122, 78, 16, 13, 5), (0, kit_1.M)(86, 60, 16, 13, 2), (0, kit_1.M)(114, 60, 16, 13, 4), (0, kit_1.M)(100, 50, 18, 14, 3), (0, kit_1.M)(100, 72, 20, 14, 3)];
            const s = shrub(c, ms, { stems: ['M100 171L100 80'], nStars: 8, seed: 6 });
            s.nodes[0] = (0, kit_1.G)('trunk', [(0, kit_1.L)('M100 171L100 80', c.S.wood(SW), c.S.main * 2.2)]);
            return { body: s.nodes, glow: [100, 68, 52], perch: [100, 34], organs: s.cr.organs };
        },
        moot: (c) => {
            const fl = { flat: 0.45 };
            const ms = [(0, kit_1.M)(62, 150, 28, 12, 1, fl), (0, kit_1.M)(138, 150, 28, 12, 5, fl), (0, kit_1.M)(100, 148, 30, 13, 2, fl), (0, kit_1.M)(86, 112, 22, 10, 3, fl), (0, kit_1.M)(114, 112, 22, 10, 4, fl)];
            const s = shrub(c, ms, { stems: ['M100 160L100 112'], nStars: 7, seed: 7 });
            const st = groundStones(c);
            return { body: s.nodes, back: st.back, front: st.front, glow: [100, 130, 66], perch: [62, 136], organs: s.cr.organs };
        },
        espalier: (c) => {
            const { S } = c;
            const angs = [-154, -122, -90, -58, -26];
            const R0 = c.inPot ? Math.min(78, c.span + 50) : 78;
            const slats = angs.map((a) => `M100 171L${(0, kit_1.f)(100 + Math.cos(a * kit_1.D2R) * R0)} ${(0, kit_1.f)(171 + Math.sin(a * kit_1.D2R) * R0)}`).join('');
            const cv = angs.map((a, i) => {
                const k = S.sc(i + 1);
                return [
                    [100, 171],
                    [100 + Math.cos(a * kit_1.D2R) * R0 * 0.4 * k, 171 + Math.sin(a * kit_1.D2R) * R0 * 0.5 * k],
                    [100 + Math.cos(a * kit_1.D2R) * R0 * 0.86 * k, 171 + Math.sin(a * kit_1.D2R) * R0 * 0.86 * k],
                ];
            });
            const gs = cv.map((cc, i) => leafPairs(S, [cc], 3, 12, S.fol, `domain-${i + 1}`));
            return {
                back: [(0, kit_1.G)('frame', [(0, kit_1.L)(slats, S.wood(POST), S.fine * 1.6)])],
                body: [
                    sprigs(S, cv.map(([a, cc, b]) => (0, kit_1.Q)(a, cc, b))),
                    (0, kit_1.G)('canopy', gs),
                    ties(S, cv.map(([a, cc, b]) => {
                        const p = (0, kit_1.qp)(a, cc, b, 0.6);
                        return [(0, kit_1.f)(p[0] - 3), (0, kit_1.f)(p[0] + 3), (0, kit_1.f)(p[1])];
                    })),
                    stars(S, cv.map(([, , b]) => [b[0], b[1] - 2, 1.1]).concat(cv.map(([a, cc, b]) => [...(0, kit_1.qp)(a, cc, b, 0.7), 0.8]))),
                ],
                glow: [100, 120, 74],
                perch: [40, 120],
                organs: cv.map(([, , b], i) => ({ dom: i + 1, x: b[0], y: b[1] })),
            };
        },
        coppice: (c) => {
            const { S } = c;
            const tips = [
                [64, 106],
                [80, 92],
                [100, 84],
                [120, 92],
                [136, 106],
            ];
            const ms = tips.map(([x, y], i) => (0, kit_1.M)(x, y, 13, 11, i + 1));
            const s = shrub(c, ms, { stems: tips.map(([x, y]) => `M${(0, kit_1.f)(96 + (x - 100) * 0.08)} 160Q${(0, kit_1.f)((x + 100) / 2)} ${(0, kit_1.f)((y + 160) / 2 + 6)} ${x} ${y + 6}`), nStars: 7, seed: 8 });
            const stool = 'M84 171C84 162 90 158 100 158C110 158 116 162 116 171Z';
            const shoot = leafPairs(S, [
                [[90, 162], [84, 148], [78, 136]],
                [[110, 162], [118, 150], [124, 140]],
            ], 2, 10, S.fol, 'shoots');
            return { body: [(0, kit_1.G)('stool', [(0, kit_1.P)(stool, S.woodFill(SW)), (0, kit_1.L)(stool, S.wood(SW), S.main)]), shoot, ...s.nodes], glow: [100, 112, 68], perch: [56, 94], organs: s.cr.organs };
        },
        holdfast: (c) => {
            const { S } = c;
            const r = rockAt(c, 36, 26);
            const ms = [(0, kit_1.M)(72, 116, 22, 16, 1, { dense: true }), (0, kit_1.M)(128, 116, 22, 16, 5, { dense: true }), (0, kit_1.M)(82, 98, 22, 16, 2, { dense: true }), (0, kit_1.M)(118, 98, 22, 16, 4, { dense: true }), (0, kit_1.M)(100, 90, 26, 18, 3, { dense: true }), (0, kit_1.M)(100, 114, 26, 18, 3, { dense: true })];
            const s = shrub(c, ms, { nStars: 6, seed: 9 });
            return {
                back: [r.node],
                body: [
                    (0, kit_1.rootTapers)(S, [
                        [[96, r.top + 2], [r.X(76), r.top + 6], [r.X(70), 171], 4, 1.4],
                        [[99, r.top + 2], [r.X(90), r.top + 14], [r.X(92), 171], 3.4, 1.4],
                        [[101, r.top + 2], [r.X(112), r.top + 14], [r.X(110), 171], 3.4, 1.4],
                        [[104, r.top + 2], [r.X(124), r.top + 6], [r.X(130), 171], 4, 1.4],
                    ], SW),
                    (0, kit_1.G)('trunk', [(0, kit_1.L)(`M100 ${(0, kit_1.f)(r.top + 3)}L100 124`, S.wood(SW), S.main * 2.4)]),
                    ...s.nodes,
                ],
                glow: [100, 104, 64],
                perch: [64, 102],
                organs: s.cr.organs,
            };
        },
    },
};
const colD = (x, y0, h, w) => `M${(0, kit_1.f)(x - w / 2)} ${(0, kit_1.f)(y0)}L${(0, kit_1.f)(x - w / 2)} ${(0, kit_1.f)(y0 - h + w / 2)}A${(0, kit_1.f)(w / 2)} ${(0, kit_1.f)(w / 2)} 0 0 1 ${(0, kit_1.f)(x + w / 2)} ${(0, kit_1.f)(y0 - h + w / 2)}L${(0, kit_1.f)(x + w / 2)} ${(0, kit_1.f)(y0)}Z`;
function armD(cx, cw, side, y, len, up, ww) {
    const x0 = cx + side * cw * 0.4;
    const x1 = cx + side * (cw * 0.5 + len);
    const o = (side * ww) / 2;
    if (up <= ww)
        return `M${(0, kit_1.f)(x0)} ${(0, kit_1.f)(y)}L${(0, kit_1.f)(x1)} ${(0, kit_1.f)(y)}A${(0, kit_1.f)(ww / 2)} ${(0, kit_1.f)(ww / 2)} 0 0 ${side > 0 ? 0 : 1} ${(0, kit_1.f)(x1)} ${(0, kit_1.f)(y - ww)}L${(0, kit_1.f)(x0)} ${(0, kit_1.f)(y - ww)}Z`;
    return `M${(0, kit_1.f)(x0)} ${(0, kit_1.f)(y)}L${(0, kit_1.f)(x1 - o)} ${(0, kit_1.f)(y)}Q${(0, kit_1.f)(x1 + o)} ${(0, kit_1.f)(y)} ${(0, kit_1.f)(x1 + o)} ${(0, kit_1.f)(y - ww)}L${(0, kit_1.f)(x1 + o)} ${(0, kit_1.f)(y - up)}A${(0, kit_1.f)(ww / 2)} ${(0, kit_1.f)(ww / 2)} 0 0 ${side > 0 ? 0 : 1} ${(0, kit_1.f)(x1 - o)} ${(0, kit_1.f)(y - up)}L${(0, kit_1.f)(x1 - o)} ${(0, kit_1.f)(y - ww)}L${(0, kit_1.f)(x0)} ${(0, kit_1.f)(y - ww)}Z`;
}
function spines(S, segs) {
    if (S.icon)
        return '';
    let d = '';
    for (const [x0, y0, x1, y1, side] of segs)
        for (let t = 0.1; t < 0.95; t += S.full ? 0.1 : 0.16) {
            const x = (0, kit_1.lerp)(x0, x1, t);
            const y = (0, kit_1.lerp)(y0, y1, t);
            d += `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}l${(0, kit_1.f)(side * 2.6)} -1.2`;
        }
    return d;
}
function cactusBody(c, H, w, arms, o = {}) {
    const { S } = c;
    const fol = S.fol;
    const base = 171;
    const col = colD(100, base, H, w);
    const gs = [];
    const organs = [{ dom: 3, x: 100, y: base - H * 0.6 }];
    const ribs = S.full ? `M100 ${base - 2}L100 ${(0, kit_1.f)(base - H + 5)}M${(0, kit_1.f)(100 - w * 0.25)} ${base - 2}L${(0, kit_1.f)(100 - w * 0.25)} ${(0, kit_1.f)(base - H + w * 0.5)}M${(0, kit_1.f)(100 + w * 0.25)} ${base - 2}L${(0, kit_1.f)(100 + w * 0.25)} ${(0, kit_1.f)(base - H + w * 0.5)}` : '';
    const sp0 = spines(S, [
        [100 - w / 2, base - 6, 100 - w / 2, base - H + 6, -1],
        [100 + w / 2, base - 6, 100 + w / 2, base - H + 6, 1],
    ]);
    arms.forEach(([side, ty, len0, up0, dom]) => {
        const k = dom ? S.sc(dom) : 1;
        const len = len0 * k;
        const up = up0 * k;
        const ww = w * (o.armW || 0.62);
        const y = base - H * ty;
        const d = armD(100, w, side, y, len, up, ww);
        const x1 = 100 + side * (w * 0.5 + len);
        const sp = spines(S, [[x1 + (side * ww) / 2, y - ww, x1 + (side * ww) / 2, y - up + 2, side]]);
        gs.push((0, kit_1.G)(dom ? `domain-${dom}` : null, [
            (0, kit_1.P)(d, S.massFill(fol, true)),
            (0, kit_1.L)(d + (S.full && up > ww ? `M${(0, kit_1.f)(x1)} ${(0, kit_1.f)(y - ww)}L${(0, kit_1.f)(x1)} ${(0, kit_1.f)(y - up + 2)}` : ''), S.lineOf(fol), S.icon ? S.main : S.fine * 1.5),
            sp ? (0, kit_1.L)(sp, S.lineOf(fol), S.hair * 1.4, { opacity: 0.8 }) : null,
        ]));
        if (dom)
            organs.push({ dom, x: x1, y: y - up * 0.6 });
    });
    const main = (0, kit_1.G)(o.ids === false ? null : 'domain-3', [
        (0, kit_1.P)(col, S.massFill(fol, true)),
        ribs ? (0, kit_1.L)(ribs, S.lineOf(fol), S.hair * 1.4, { opacity: 0.7 }) : null,
        (0, kit_1.L)(col, S.lineOf(fol), S.icon ? S.main : S.fine * 1.6),
        sp0 ? (0, kit_1.L)(sp0, S.lineOf(fol), S.hair * 1.4, { opacity: 0.8 }) : null,
    ]);
    return { node: (0, kit_1.G)('canopy', [main, ...gs]), organs, top: base - H };
}
function cactusBlooms(S, pts, len = 9) {
    if (!pts.length)
        return null;
    let d = '';
    for (const [x, y, a0] of pts)
        for (let i = 0; i < 5; i++)
            d += (0, kit_1.xf)('M0 0Q0.42 -0.55 0 -1Q-0.42 -0.55 0 0Z', x, y, ((a0 || -90) + (i - 2) * 30) * kit_1.D2R + Math.PI / 2, len) + ' ';
    return (0, kit_1.G)('blooms', [(0, kit_1.P)(d, S.washOf(S.pal), { opacity: 0.88 }), (0, kit_1.L)(d, S.lineOf(S.pal), S.fine * 1.4)]);
}
const cactus = {
    pal: 'blossom',
    fol: 'cactus',
    forms: {
        I: (c) => {
            const { S } = c;
            const r = 9;
            const cy = 162;
            const ring = (0, kit_1.disc)(100, cy, r);
            let sp = '';
            if (!S.icon)
                for (let i = 0; i < 7; i++) {
                    const a = (-160 + i * 23) * kit_1.D2R;
                    sp += `M${(0, kit_1.f)(100 + Math.cos(a) * r)} ${(0, kit_1.f)(cy + Math.sin(a) * r)}l${(0, kit_1.f)(Math.cos(a) * 3)} ${(0, kit_1.f)(Math.sin(a) * 3)}`;
                }
            return {
                body: [(0, kit_1.G)('sprout', [(0, kit_1.P)(ring, S.massFill(S.fol, true)), (0, kit_1.L)(ring + (S.full ? `M100 ${cy - r}Q96 ${cy} 100 ${cy + r}M100 ${cy - r}Q104 ${cy} 100 ${cy + r}` : ''), S.lineOf(S.fol), S.main), sp ? (0, kit_1.L)(sp, S.lineOf(S.fol), S.fine * 1.2) : null])],
                perch: [84, 168],
            };
        },
        II: (c) => {
            const b = cactusBody(c, 56, 16, [], { ids: false });
            return { body: [b.node], perch: [86, 150] };
        },
        III: (c) => {
            const { S } = c;
            const b = cactusBody(c, 72, 18, [
                [-1, 0.42, 8, 13, 1],
                [1, 0.56, 8, 14, 4],
                [-1, 0.7, 6, 10, 2],
                [1, 0.3, 7, 10, 5],
            ]);
            const bud = (0, kit_1.leafSet)().add((0, kit_1.leaf)('lens', 100, b.top + 2, 10, -90 * kit_1.D2R, S, 0.7));
            return { body: [b.node, S.icon ? null : (0, kit_1.G)('bud', [(0, kit_1.P)(bud.wash(), S.washOf(S.pal), { opacity: 0.85 }), (0, kit_1.L)(bud.line(), S.lineOf(S.pal), S.fine * 1.4)])], perch: [76, 120], organs: b.organs };
        },
        IV: (c) => {
            const b = cactusBody(c, 98, 20, [
                [-1, 0.32, 16, 46, 1],
                [1, 0.44, 14, 40, 4],
                [-1, 0.6, 11, 30, 2],
                [1, 0.24, 20, 34, 5],
            ]);
            const k1 = c.S.sc(1);
            const tipX = 100 - 18 - 16 * k1;
            const tipY = 171 - 98 * 0.32 - 46 * k1 + 2;
            return {
                body: [
                    b.node,
                    cactusBlooms(c.S, [
                        [94, b.top + 4, -110],
                        [106, b.top + 4, -70],
                        [100, b.top + 1, -90],
                        [tipX, tipY, -90],
                    ], 10),
                ],
                glow: [100, 104, 66],
                perch: [64, 110],
                organs: b.organs,
            };
        },
    },
    flavours: {
        lookout: (c) => {
            const b = cactusBody(c, 122, 16, [
                [-1, 0.2, 6, 10, 1],
                [1, 0.26, 6, 10, 4],
                [-1, 0.33, 5, 8, 2],
                [1, 0.4, 5, 8, 5],
            ]);
            return { body: [b.node, cactusBlooms(c.S, [[100, b.top + 1, -90]], 11)], glow: [100, 72, 52], perch: [86, 64], organs: b.organs };
        },
        moot: (c) => {
            const st = groundStones(c);
            const b = cactusBody(c, 80, 20, [
                [-1, 0.34, 22, 0, 1],
                [1, 0.34, 22, 0, 5],
                [-1, 0.62, 16, 0, 2],
                [1, 0.62, 16, 0, 4],
            ], { armW: 0.6 });
            return { body: [b.node, cactusBlooms(c.S, [[100, b.top + 1, -90]], 10)], back: st.back, front: st.front, glow: [100, 120, 60], perch: [70, 132], organs: b.organs };
        },
        espalier: (c) => {
            const { S } = c;
            const b = cactusBody(c, 96, 18, [
                [-1, 0.36, 14, 44, 1],
                [1, 0.36, 14, 44, 5],
                [-1, 0.62, 8, 22, 2],
                [1, 0.62, 8, 22, 4],
            ]);
            const tipY = (dom) => 171 - 96 * 0.36 - 44 * S.sc(dom) + 2;
            const tipX = (dom, side) => 100 + side * (17 + 14 * S.sc(dom));
            return {
                back: [(0, kit_1.G)('frame', [(0, kit_1.L)('M100 171L100 52', S.wood(POST), S.main * 1.3), (0, kit_1.L)((0, kit_1.oval)(100, 100, 36, 34), S.wood(POST), S.fine * 1.5)])],
                body: [
                    b.node,
                    ties(S, [
                        [66, 72, 114],
                        [128, 134, 114],
                    ]),
                    cactusBlooms(S, [
                        [100, b.top + 1, -90],
                        [tipX(1, -1), tipY(1), -90],
                        [tipX(5, 1), tipY(5), -90],
                    ], 9),
                ],
                glow: [100, 100, 62],
                perch: [64, 110],
                organs: b.organs,
            };
        },
        coppice: (c) => {
            const { S } = c;
            const sp = c.inPot ? Math.min(c.span - 6, 30) : 34;
            const b = cactusBody(c, 64, 18, []);
            const pups = [
                [100 - sp, 9, 1, 'g'],
                [100 - sp * 0.55, 30, 2, 'c'],
                [100 + sp * 0.55, 34, 4, 'c'],
                [100 + sp, 8, 5, 'g'],
            ];
            const gs = pups.map(([x, s0, dom, k]) => {
                const s = s0 * S.sc(dom);
                const d = k === 'g' ? (0, kit_1.disc)(x, 171 - s, s) : colD(x, 171, s, 11);
                const segs = k === 'g'
                    ? [
                        [x - s, 171 - s, x - s * 0.4, 171 - s * 1.8, -1],
                        [x + s, 171 - s, x + s * 0.4, 171 - s * 1.8, 1],
                    ]
                    : [
                        [x - 5.5, 168, x - 5.5, 171 - s + 4, -1],
                        [x + 5.5, 168, x + 5.5, 171 - s + 4, 1],
                    ];
                return (0, kit_1.G)(`domain-${dom}`, [(0, kit_1.P)(d, S.massFill(S.fol, true)), (0, kit_1.L)(d, S.lineOf(S.fol), S.icon ? S.main : S.fine * 1.5), (0, kit_1.L)(spines(S, segs), S.lineOf(S.fol), S.hair * 1.4, { opacity: 0.8 })]);
            });
            return {
                body: [
                    (0, kit_1.G)('canopy', [...b.node.children, ...gs]),
                    cactusBlooms(S, [
                        [96, b.top + 3, -110],
                        [104, b.top + 3, -70],
                    ], 9),
                ],
                glow: [100, 130, 56],
                perch: [100 - sp, 156],
                organs: [...b.organs, ...pups.map(([x, s, dom]) => ({ dom, x, y: 171 - s }))],
            };
        },
        holdfast: (c) => {
            const { S } = c;
            const r = rockAt(c, 30, 26);
            const cx = 92;
            const cy = 140;
            const rx = 26;
            const ry = 26;
            const barrel = (0, kit_1.oval)(cx, cy, rx, ry);
            let ribs = '';
            if (!S.icon)
                for (const u of [-0.6, -0.25, 0.1, 0.45])
                    ribs += `M${(0, kit_1.f)(cx + u * rx)} ${(0, kit_1.f)(cy - ry + 3)}Q${(0, kit_1.f)(cx + u * rx * 1.25)} ${(0, kit_1.f)(cy)} ${(0, kit_1.f)(cx + u * rx)} ${(0, kit_1.f)(cy + ry - 3)}`;
            let sp = '';
            if (!S.icon)
                for (let i = 0; i < (S.full ? 22 : 12); i++) {
                    const a = (-180 + i * (360 / (S.full ? 22 : 12))) * kit_1.D2R;
                    sp += `M${(0, kit_1.f)(cx + Math.cos(a) * rx)} ${(0, kit_1.f)(cy + Math.sin(a) * ry)}l${(0, kit_1.f)(Math.cos(a) * 5)} ${(0, kit_1.f)(Math.sin(a) * 5)}`;
                }
            const dom = (k) => (0, kit_1.G)(`domain-${k}`, []);
            return {
                back: [(0, kit_1.G)('stone', [r.node.children[0], r.node.children[1], r.node.children[2]], { transform: 'translate(22 0)' })],
                body: [
                    (0, kit_1.G)('canopy', [
                        (0, kit_1.G)('domain-3', [(0, kit_1.P)(barrel, S.massFill(S.fol, true)), ribs ? (0, kit_1.L)(ribs, S.lineOf(S.fol), S.hair * 1.4, { opacity: 0.7 }) : null, (0, kit_1.L)(barrel, S.lineOf(S.fol), S.icon ? S.main : S.fine * 1.6), sp ? (0, kit_1.L)(sp, S.lineOf(S.fol), S.hair * 1.6) : null]),
                        dom(1),
                        dom(2),
                        dom(4),
                        dom(5),
                    ]),
                    cactusBlooms(S, [
                        [82, 116, -120],
                        [92, 113, -95],
                        [102, 114, -70],
                    ], 9),
                ],
                glow: [96, 126, 56],
                perch: [124, 130],
                organs: [1, 2, 3, 4, 5].map((d) => ({ dom: d, x: cx, y: cy })),
            };
        },
    },
};
function culm(S, p0, pc, p1, w0, w1, nodes = 8) {
    const t = (0, kit_1.taper)(p0, pc, p1, w0, w1, 12);
    let nd = '';
    if (!S.icon)
        for (let i = 1; i < nodes; i++) {
            const u = i / nodes;
            const p = (0, kit_1.qp)(p0, pc, p1, u);
            const a = (0, kit_1.qa)(p0, pc, p1, u);
            const n = [-Math.sin(a), Math.cos(a)];
            const w = (0, kit_1.lerp)(w0, w1, u) / 2 + 0.5;
            nd += `M${(0, kit_1.f)(p[0] - n[0] * w)} ${(0, kit_1.f)(p[1] - n[1] * w)}L${(0, kit_1.f)(p[0] + n[0] * w)} ${(0, kit_1.f)(p[1] + n[1] * w)}`;
        }
    return { fill: t.closed, sides: t.sides, nodes: nd };
}
function spray(S, set, x, y, deg, n, l, spread = 24) {
    for (let i = 0; i < n; i++) {
        const a = deg + ((i - (n - 1) / 2) * (spread * 2)) / Math.max(1, n - 1);
        set.add((0, kit_1.leaf)('long', x, y, l * (0.85 + (0.15 * (((i * 7) % 3) / 2))), a * kit_1.D2R, S));
    }
}
function culms(S, list, o = {}) {
    const pal = S.pal;
    const organs = [];
    const gs = list.map(([p0, pc0, p10, w0, w1, dom, ts]) => {
        const k = dom ? S.sc(dom) : 1;
        const pc = [p0[0] + (pc0[0] - p0[0]) * k, p0[1] + (pc0[1] - p0[1]) * k];
        const p1 = [p0[0] + (p10[0] - p0[0]) * k, p0[1] + (p10[1] - p0[1]) * k];
        const cm = culm(S, p0, pc, p1, w0, w1, o.nodes || 9);
        const set = (0, kit_1.leafSet)();
        if (!(S.icon && o.iconBare))
            for (const t of ts || [0.66, 0.82, 0.96]) {
                const p = (0, kit_1.qp)(p0, pc, p1, t);
                const out = p[0] < 100 ? -1 : p[0] > 100 ? 1 : t > 0.8 ? 1 : -1;
                spray(S, set, p[0], p[1], out < 0 ? 200 : -20, S.icon ? 2 : 3, S.small ? 17 : 14, 24);
            }
        if (dom)
            organs.push({ dom, x: p1[0], y: p1[1] });
        return (0, kit_1.G)(dom ? `domain-${dom}` : null, [
            (0, kit_1.P)(cm.fill, S.massFill(pal)),
            (0, kit_1.L)(cm.sides, S.lineOf('spring'), S.icon ? S.main : S.fine * 1.5),
            cm.nodes ? (0, kit_1.L)(cm.nodes, S.lineOf('spring'), S.hair * 1.6) : null,
            set.n() ? (0, kit_1.P)(set.wash(), S.washOf(pal), { opacity: S.washOp }) : null,
            set.n() ? (0, kit_1.L)(set.line(), S.lineOf(pal), S.fine * 1.3) : null,
        ]);
    });
    return { node: (0, kit_1.G)('canopy', gs), organs };
}
function sheathCone(S, x, yb, h, w) {
    const d = `M${(0, kit_1.f)(x - w / 2)} ${(0, kit_1.f)(yb)}C${(0, kit_1.f)(x - w / 2)} ${(0, kit_1.f)(yb - h * 0.5)} ${(0, kit_1.f)(x - w * 0.12)} ${(0, kit_1.f)(yb - h * 0.85)} ${(0, kit_1.f)(x)} ${(0, kit_1.f)(yb - h)}C${(0, kit_1.f)(x + w * 0.12)} ${(0, kit_1.f)(yb - h * 0.85)} ${(0, kit_1.f)(x + w / 2)} ${(0, kit_1.f)(yb - h * 0.5)} ${(0, kit_1.f)(x + w / 2)} ${(0, kit_1.f)(yb)}Z`;
    let sc = '';
    if (!S.icon)
        for (let i = 1; i < 4; i++) {
            const y = yb - h * i * 0.23;
            const hw = (w / 2) * (1 - i * 0.2);
            sc += `M${(0, kit_1.f)(x - hw)} ${(0, kit_1.f)(y + 2)}Q${(0, kit_1.f)(x)} ${(0, kit_1.f)(y - 3)} ${(0, kit_1.f)(x + hw * 0.7)} ${(0, kit_1.f)(y - 4)}`;
        }
    return { d, sc };
}
function shoots(S, list, id = 'shoot') {
    let d = '';
    let sc = '';
    for (const [x, h, w] of list) {
        const s = sheathCone(S, x, 171, h, w);
        d += s.d;
        sc += s.sc;
    }
    const col = kit_1.A0.bamboo.sheathMid;
    return (0, kit_1.G)(id, [(0, kit_1.P)(d, S.woodFill(col)), (0, kit_1.L)(d + sc, S.wood(col), S.fine * 1.4)]);
}
const V5 = [
    [[90, 171], [84, 110], [58, 62], 6.5, 4, 1],
    [[95, 171], [90, 100], [80, 42], 6.5, 4, 2],
    [[100, 171], [100, 96], [102, 32], 7, 4, 3],
    [[105, 171], [110, 100], [124, 46], 6.5, 4, 4],
    [[110, 171], [116, 112], [144, 66], 6.5, 4, 5],
];
const bamboo = {
    pal: 'grove',
    forms: {
        I: (c) => {
            const { S } = c;
            const s = sheathCone(S, 100, 171, 40, 26);
            const set = (0, kit_1.leafSet)()
                .add((0, kit_1.leaf)('long', 100, 132, 13, -112 * kit_1.D2R, S))
                .add((0, kit_1.leaf)('long', 100, 132, 11, -70 * kit_1.D2R, S));
            const col = kit_1.A0.bamboo.sheathMid;
            return {
                cutaway: (0, kit_1.cutaway)(S, 62, 138, 171, 190, 14),
                body: [
                    (0, kit_1.G)('roots', [(0, kit_1.L)('M70 180L130 180', S.wood(col), S.main), S.icon ? null : (0, kit_1.L)('M84 177L84 183M100 177L100 183M116 177L116 183M78 180l-3 5M92 180l2 6M108 180l-2 6M124 180l3 5', S.wood(col), S.fine)]),
                    (0, kit_1.G)('sprout', [(0, kit_1.P)(s.d, S.woodFill(col)), (0, kit_1.L)(s.d + s.sc, S.wood(col), S.main)]),
                    (0, kit_1.leavesNode)(S, 'leaves', set, S.pal),
                ],
                perch: [74, 170],
            };
        },
        II: (c) => {
            const { S } = c;
            const cm = culms(S, [[[98, 171], [96, 100], [108, 40], 7, 4.5, null, [0.55, 0.66, 0.77, 0.88, 0.99]]]);
            return { body: [cm.node, shoots(S, [[122, 16, 10]])], perch: [76, 150] };
        },
        III: (c) => {
            const cm = culms(c.S, V5);
            return { body: [cm.node], perch: [62, 96], organs: cm.organs };
        },
        IV: (c) => {
            const { S } = c;
            const Lc = [
                [[58, 171], [26, 44], [99, 26]],
                [[66, 171], [38, 60], [97, 40]],
                [[74, 171], [56, 100], [84, 64]],
            ];
            const Cs = [...Lc, ...Lc.map(([a, cc, b]) => [[200 - a[0], a[1]], [200 - cc[0], cc[1]], [200 - b[0], b[1]]])];
            const doms = [1, 2, 3, 5, 4, 3];
            const cm = culms(S, [0, 3, 1, 4, 2, 5].map((i) => [...Cs[i], 7, 4, doms[i], i % 3 === 2 ? [0.95] : [0.72, 0.86, 0.98]]));
            return {
                body: [S.icon ? null : (0, kit_1.G)('roots', [(0, kit_1.L)('M60 171q6 -4 12 0q6 -4 12 0M116 171q6 -4 12 0q6 -4 12 0', S.wood(kit_1.A0.bamboo.sheathMid), S.fine * 1.4)]), cm.node, shoots(S, [[92, 10, 7], [110, 8, 6]])],
                glow: [100, 104, 52],
                perch: [100, 22],
                organs: cm.organs,
            };
        },
    },
    flavours: {
        lookout: (c) => {
            const cm = culms(c.S, [
                [[90, 171], [86, 130], [72, 88], 6, 4, 1],
                [[95, 171], [92, 124], [86, 72], 6, 4, 2],
                [[105, 171], [108, 124], [114, 72], 6, 4, 4],
                [[110, 171], [114, 130], [128, 88], 6, 4, 5],
                [[100, 171], [100, 90], [102, 14], 7, 4, 3, [0.8, 0.9, 0.99]],
            ]);
            return { body: [cm.node], glow: [100, 76, 58], perch: [102, 6], organs: cm.organs };
        },
        moot: (c) => {
            const { S } = c;
            const xs = [80, 90, 100, 110, 120];
            const cm = culms(S, xs.map((x, i) => [[x, 171], [x, 110], [x, 40 + Math.abs(i - 2) * 6], 6, 4.2, null, []]));
            const fl = { flat: 0.5 };
            const cr = (0, kit_1.crown)(S, [(0, kit_1.M)(58, 102, 24, 9, 1, fl), (0, kit_1.M)(142, 102, 24, 9, 5, fl), (0, kit_1.M)(72, 70, 24, 9, 2, fl), (0, kit_1.M)(128, 70, 24, 9, 4, fl), (0, kit_1.M)(100, 44, 30, 10, 3, fl)], { kind: 'long', ll: 9, pal: S.pal, seed: 17 });
            const st = groundStones(c);
            return {
                body: [(0, kit_1.G)('culms', cm.node.children), (0, kit_1.G)('branches', [(0, kit_1.L)('M80 106L60 102M120 106L140 102M90 74L74 70M110 74L126 70', S.lineOf('spring'), S.fine * 1.4)]), cr.node],
                back: st.back,
                front: st.front,
                glow: [100, 92, 72],
                perch: [58, 90],
                organs: cr.organs,
            };
        },
        espalier: (c) => {
            const { S } = c;
            const w = c.inPot ? Math.min(46, c.span + 14) : 46;
            const xs = [-1, -0.5, 0, 0.5, 1].map((u) => 100 + u * w * 0.85);
            const cm = culms(S, xs.map((x, i) => [[x, 171], [x, 120], [x, 54 - (i === 2 ? 10 : 0)], 6, 4.2, i + 1, [0.8, 0.94]]));
            return {
                back: [(0, kit_1.G)('frame', [(0, kit_1.L)(`M${100 - w} 171L${100 - w} 70M${100 + w} 171L${100 + w} 70`, S.wood(POST), S.main * 1.5), S.icon ? null : (0, kit_1.L)(`M${100 - w} 124L${100 + w} 124M${100 - w} 84L${100 + w} 84`, S.wood(POST), S.fine * 1.5)])],
                body: [cm.node, ties(S, xs.flatMap((x) => [[(0, kit_1.f)(x - 3), (0, kit_1.f)(x + 3), 124], [(0, kit_1.f)(x - 3), (0, kit_1.f)(x + 3), 84]]))],
                glow: [100, 96, 66],
                perch: [100 - w, 66],
                organs: cm.organs,
            };
        },
        coppice: (c) => {
            const { S } = c;
            const L9 = [
                [86, 66, -26],
                [91, 54, -14],
                [96, 76, -6],
                [100, 48, 2],
                [104, 72, 8],
                [109, 58, 16],
                [114, 70, 28],
                [82, 98, -36],
                [118, 96, 36],
            ];
            const doms = [1, 2, 2, 3, 3, 4, 4, 1, 5];
            const cm = culms(S, L9.map(([x, top, lean], i) => [[x, 171], [x + lean * 0.2, (171 + top) / 2], [x + lean, top], 5.4, 3.6, doms[i], [0.8, 0.97]]));
            return {
                body: [
                    cm.node,
                    shoots(S, [
                        [78, 14, 8],
                        [92, 18, 9],
                        [108, 12, 7],
                        [122, 16, 8],
                    ]),
                ],
                glow: [100, 92, 66],
                perch: [64, 80],
                organs: cm.organs,
            };
        },
        holdfast: (c) => {
            const { S } = c;
            const r = rockAt(c, 40, 24);
            const col = kit_1.A0.bamboo.sheathMid;
            const xs = [86, 92, 98, 104, 110, 116];
            const cm = culms(S, xs.map((x, i) => [[x, r.top + 6], [x, 100], [x + (i - 2.5) * 2, 30 + Math.abs(i - 2.5) * 6], 6, 4, [1, 2, 3, 3, 4, 5][i], [0.62, 0.78, 0.94]]));
            const roots = [
                [[88, r.top + 6], [r.X(70), r.top + 8], [r.X(64), 171], 4, 1.6],
                [[96, r.top + 7], [r.X(88), r.top + 18], [r.X(88), 171], 3.6, 1.6],
                [[106, r.top + 7], [r.X(114), r.top + 18], [r.X(114), 171], 3.6, 1.6],
                [[114, r.top + 6], [r.X(132), r.top + 8], [r.X(138), 171], 4, 1.6],
            ];
            return { back: [r.node], body: [(0, kit_1.rootTapers)(S, roots, col), cm.node], glow: [100, 84, 66], perch: [70, 70], organs: cm.organs };
        },
    },
};
exports.FLOWER_LINES = { sunflower, lotus, sampaguita, cactus, bamboo };
  };
  links["src/components/plant/forms/index.ts"] = {"./conifers":"src/components/plant/forms/conifers.ts","./flowers":"src/components/plant/forms/flowers.ts","./trees":"src/components/plant/forms/trees.ts","./kit":"src/components/plant/forms/kit.ts"};
  defs["src/components/plant/forms/index.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paint = exports.formKeyOf = exports.FORM_LINES = void 0;
exports.drawForm = drawForm;
const conifers_1 = require("./conifers");
const flowers_1 = require("./flowers");
const trees_1 = require("./trees");
exports.FORM_LINES = { ...trees_1.TREE_LINES, ...conifers_1.CONIFER_LINES, ...flowers_1.FLOWER_LINES };
const formKeyOf = (growth) => (growth <= 2 ? 'I' : growth === 3 ? 'II' : growth <= 5 ? 'III' : 'IV');
exports.formKeyOf = formKeyOf;
function drawForm(species, growth, final, c) {
    const line = exports.FORM_LINES[species];
    const key = (0, exports.formKeyOf)(growth);
    if (key === 'IV' && final !== 'own')
        return line.flavours[final](c);
    return line.forms[key](c);
}
var kit_1 = require("./kit");
Object.defineProperty(exports, "paint", { enumerable: true, get: function () { return kit_1.paint; } });
  };
  links["src/components/plant/forms/kit.ts"] = {"../../../theme/tokens":"src/theme/tokens.ts"};
  defs["src/components/plant/forms/kit.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootTapers = exports.rootLines = exports.M = exports.oval = exports.disc = exports.SH = exports.Q = exports.qa = exports.qp = exports.G = exports.C = exports.L = exports.P = exports.INSIDE = exports.f = exports.lerp = exports.D2R = exports.LEAF = exports.A0 = void 0;
exports.rng = rng;
exports.inside = inside;
exports.paint = paint;
exports.smooth = smooth;
exports.taper = taper;
exports.massD = massD;
exports.hatchE = hatchE;
exports.furrows = furrows;
exports.xf = xf;
exports.leaf = leaf;
exports.blossom = blossom;
exports.star = star;
exports.needles = needles;
exports.leafSet = leafSet;
exports.leavesNode = leavesNode;
exports.cutaway = cutaway;
exports.glow = glow;
exports.stones = stones;
exports.boulder = boulder;
exports.scaleMasses = scaleMasses;
exports.crown = crown;
exports.limbs = limbs;
exports.trunk = trunk;
exports.lowerRim = lowerRim;
exports.upperRim = upperRim;
exports.acorns = acorns;
exports.samaras = samaras;
exports.goldSprays = goldSprays;
exports.blossoms = blossoms;
exports.hanging = hanging;
exports.drift = drift;
exports.seedPart = seedPart;
const tokens_1 = require("../../../theme/tokens");
exports.A0 = tokens_1.plantArt;
exports.LEAF = tokens_1.plantLeaf;
exports.D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
exports.lerp = lerp;
const f = (n) => Math.round(n * 10) / 10;
exports.f = f;
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function flat(xs, out = []) {
    for (const x of xs) {
        if (Array.isArray(x))
            flat(x, out);
        else if (x)
            out.push(x);
    }
    return out;
}
exports.INSIDE = new WeakSet();
function inside(n) {
    if (n)
        exports.INSIDE.add(n);
    return n;
}
const P = (d, fill, extra = {}) => (d ? { t: 'path', d, fill, ...extra } : null);
exports.P = P;
const L = (d, stroke, pt, extra = {}) => (d ? { t: 'path', d, fill: 'none', stroke, sw: pt, ...extra } : null);
exports.L = L;
const C = (cx, cy, r, fill, extra = {}) => ({ t: 'circle', cx: (0, exports.f)(cx), cy: (0, exports.f)(cy), r: (0, exports.f)(r), fill, ...extra });
exports.C = C;
const G = (id, children = [], extra = {}) => ({ t: 'g', id, children: flat(children), ...extra });
exports.G = G;
const LINE_PT = { icon: { main: 1.25, fine: 0 }, small: { main: 1.3, fine: 0.7 }, full: { main: 1.5, fine: 0.75 } };
function paint(theme, lod, o) {
    var _a, _b;
    const TL = tokens_1.plantLine[theme];
    const F = tokens_1.plantForm[theme];
    const W = LINE_PT[lod];
    const mix = o.mix;
    const rest = (_a = o.rest) !== null && _a !== void 0 ? _a : ((c) => c);
    const lt = theme === 'light';
    const lineOf = (p) => {
        const c = exports.LEAF[p][TL.leaf];
        return rest(TL.paleLineMix && (p === 'pearl' || p === 'snow') ? mix(c, TL.woodInk, TL.paleLineMix) : c);
    };
    const sc = o.sc;
    return {
        theme,
        lod,
        full: lod === 'full',
        icon: lod === 'icon',
        small: lod === 'small',
        main: W.main,
        fine: W.fine || W.main * 0.7,
        hair: lod === 'full' ? 0.5 : 0.6,
        pal: o.pal,
        fol: (_b = o.fol) !== null && _b !== void 0 ? _b : o.pal,
        lightTheme: lt,
        lineOf,
        washOf: (p) => exports.LEAF[p][TL.washLeaf],
        washOp: TL.washLeafOp,
        massFill: (p, dense) => mix(F.page, exports.LEAF[p][F.massTone], dense ? F.massMixDense : F.massMix),
        wood: (c) => mix(c, TL.woodInk, TL.woodMix),
        woodFill: (c) => mix(F.page, c, F.woodFillMix),
        gift: (c) => mix(c, TL.propInk, TL.giftMix),
        giftFill: (c) => mix(F.page, c, F.giftFillMix),
        soil: rest(TL.soil),
        stone: mix(F.stoneBase, F.stoneInk, F.stoneMix),
        stoneFill: mix(F.page, exports.A0.keepsake.stone, F.stoneFillMix),
        glow: exports.LEAF.gold[F.glowTone],
        glowOps: F.glowOps,
        glowRing: exports.LEAF.gold[F.glowRingTone],
        gold: exports.LEAF.gold[F.goldTone],
        goldWash: exports.LEAF.gold[F.goldWashTone],
        wire: F.wire,
        starLine: rest(TL.starLine),
        sc: (dom) => {
            const v = sc === null || sc === void 0 ? void 0 : sc[dom - 1];
            return typeof v === 'number' && Number.isFinite(v) ? Math.max(0.5, Math.min(1.25, v)) : 1;
        },
    };
}
function smooth(pts) {
    const n = pts.length;
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(pts[n - 1], pts[0]);
    let d = `M${(0, exports.f)(s[0])} ${(0, exports.f)(s[1])}`;
    for (let i = 0; i < n; i++) {
        const p = pts[i];
        const q = m(p, pts[(i + 1) % n]);
        d += `Q${(0, exports.f)(p[0])} ${(0, exports.f)(p[1])} ${(0, exports.f)(q[0])} ${(0, exports.f)(q[1])}`;
    }
    return d + 'Z';
}
const qp = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
exports.qp = qp;
const qa = (a, c, b, t) => Math.atan2(2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]), 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]));
exports.qa = qa;
const Q = (a, c, b) => `M${(0, exports.f)(a[0])} ${(0, exports.f)(a[1])}Q${(0, exports.f)(c[0])} ${(0, exports.f)(c[1])} ${(0, exports.f)(b[0])} ${(0, exports.f)(b[1])}`;
exports.Q = Q;
function taper(p0, pc, p1, w0, w1, N = 12) {
    const Lp = [];
    const Rp = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const [x, y] = (0, exports.qp)(p0, pc, p1, t);
        const a = (0, exports.qa)(p0, pc, p1, t);
        const w = (0, exports.lerp)(w0, w1, Math.pow(t, 0.85)) / 2;
        Lp.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
        Rp.push([x - Math.sin(a) * w, y + Math.cos(a) * w]);
    }
    const pl = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${(0, exports.f)(p[0])} ${(0, exports.f)(p[1])}`).join('');
    const ta = (0, exports.qa)(p0, pc, p1, 1);
    const tip = Lp[N];
    const closed = pl(Lp) +
        `Q${(0, exports.f)(tip[0] + (Rp[N][0] - tip[0]) / 2 + Math.cos(ta) * w1 * 0.6)} ${(0, exports.f)(tip[1] + (Rp[N][1] - tip[1]) / 2 + Math.sin(ta) * w1 * 0.6)} ${(0, exports.f)(Rp[N][0])} ${(0, exports.f)(Rp[N][1])}` +
        [...Rp]
            .reverse()
            .slice(1)
            .map((p) => `L${(0, exports.f)(p[0])} ${(0, exports.f)(p[1])}`)
            .join('') +
        'Z';
    return { closed, sides: pl(Lp) + pl(Rp), left: Lp, right: Rp };
}
function massD(cx, cy, rx, ry, n = 9, seed = 1, bulge = 0.2, flatK = 9) {
    const r = rng(seed);
    const ph = r() * Math.PI;
    const Pp = [];
    for (let i = 0; i < n; i++) {
        const a = ph + (i / n) * Math.PI * 2;
        const j = 0.93 + r() * 0.1;
        Pp.push([cx + Math.cos(a) * rx * j, Math.min(cy + ry * flatK, cy + Math.sin(a) * ry * j), a]);
    }
    let d = `M${(0, exports.f)(Pp[0][0])} ${(0, exports.f)(Pp[0][1])}`;
    for (let i = 0; i < n; i++) {
        const p = Pp[(i + 1) % n];
        const a0 = Pp[i][2];
        const a1 = i + 1 < n ? Pp[i + 1][2] : Pp[0][2] + Math.PI * 2;
        const am = (a0 + a1) / 2;
        const k = 1 + bulge * (0.8 + r() * 0.5);
        d += `Q${(0, exports.f)(cx + Math.cos(am) * rx * k)} ${(0, exports.f)(Math.min(cy + ry * flatK + ry * 0.1, cy + Math.sin(am) * ry * k))} ${(0, exports.f)(p[0])} ${(0, exports.f)(p[1])}`;
    }
    return d + 'Z';
}
function hatchE(cx, cy, rx, ry, y0, y1, gap, ang = -14, even = false) {
    const tn = Math.tan(ang * exports.D2R);
    let d = '';
    let y = y0;
    const A = 1 / (rx * rx) + (tn * tn) / (ry * ry);
    while (y < y1) {
        const a = y - cy;
        const B = (2 * a * tn) / (ry * ry);
        const Cc = (a * a) / (ry * ry) - 1;
        const disc = B * B - 4 * A * Cc;
        if (disc > 0) {
            const s = Math.sqrt(disc);
            const u0 = (-B - s) / (2 * A);
            const u1 = (-B + s) / (2 * A);
            if (u1 - u0 > 1.2)
                d += `M${(0, exports.f)(cx + u0)} ${(0, exports.f)(y + u0 * tn)}L${(0, exports.f)(cx + u1)} ${(0, exports.f)(y + u1 * tn)}`;
        }
        const k = (y - y0) / Math.max(1, y1 - y0);
        y += gap * (even ? 1 : 1.3 - 0.6 * k);
    }
    return d;
}
function furrows(left, right, n, seed, side = 1) {
    const r = rng(seed);
    let d = '';
    const N = left.length - 1;
    for (let k = 0; k < n; k++) {
        const u = side > 0 ? 0.55 + (k / n) * 0.38 : 0.07 + (k / n) * 0.38;
        const i0 = 1 + Math.floor(r() * 2);
        const i1 = N - 1 - Math.floor(r() * 3);
        const pt = (i) => [(0, exports.lerp)(left[i][0], right[i][0], u) + (r() - 0.5) * 0.8, (0, exports.lerp)(left[i][1], right[i][1], u)];
        const a = pt(i0);
        const m = pt(Math.floor((i0 + i1) / 2));
        const b = pt(i1);
        d += `M${(0, exports.f)(a[0])} ${(0, exports.f)(a[1])}Q${(0, exports.f)(m[0] + (r() - 0.5) * 2)} ${(0, exports.f)(m[1])} ${(0, exports.f)(b[0])} ${(0, exports.f)(b[1])}`;
    }
    return d;
}
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
function xf(d, x, y, a, s, sx = 1) {
    const c = Math.cos(a);
    const sn = Math.sin(a);
    let out = '';
    for (const g of parse(d)) {
        out += g.c;
        for (let i = 0; i + 1 < g.n.length; i += 2) {
            const u = g.n[i] * s * sx;
            const v = g.n[i + 1] * s;
            out += `${(0, exports.f)(x + u * c - v * sn)} ${(0, exports.f)(y + u * sn + v * c)} `;
        }
    }
    return out.trim();
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
    const pt = (a, r) => [r * Math.cos(a * exports.D2R), -6 + r * Math.sin(a * exports.D2R)];
    let d = 'M0 0L' + pt(-240, 2).map(exports.f).join(' ');
    order.forEach((ti, i) => {
        const [a, r] = tips[ti];
        d += ' L' + pt(a, r).map(exports.f).join(' ');
        if (i < order.length - 1)
            d += ' L' + pt((a + tips[order[i + 1]][0]) / 2, 2.4).map(exports.f).join(' ');
    });
    return { d: d + ' L' + pt(60, 2).map(exports.f).join(' ') + 'Z', h: 13.2, rib: 'M0 -0.5L0 -11M0 -5L-4.6 -9M0 -5L4.6 -9' };
})();
exports.SH = {
    lens: { d: 'M0 0Q0.57 -0.46 0 -1Q-0.57 -0.46 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.86' },
    narrow: { d: 'M0 0Q0.3 -0.46 0 -1Q-0.3 -0.46 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.88' },
    long: { d: 'M0 0Q0.24 -0.5 0 -1Q-0.24 -0.5 0 0Z', h: 1, rib: 'M0 -0.06L0 -0.9' },
    ovate: { d: 'M0 0C0.42 -0.12 0.44 -0.62 0 -1C-0.44 -0.62 -0.42 -0.12 0 0Z', h: 1, rib: 'M0 -0.08L0 -0.86' },
    heart: { d: 'M0 0C0.2 0.04 0.56 -0.1 0.52 -0.4C0.48 -0.68 0.2 -0.82 0 -1C-0.2 -0.82 -0.48 -0.68 -0.52 -0.4C-0.56 -0.1 -0.2 0.04 0 0Z', h: 1, rib: 'M0 -0.04L0 -0.9M0 -0.4L0.3 -0.56M0 -0.4L-0.3 -0.56' },
    oak: {
        d: 'M0 0C-2 -.6 -3.6 -1.6 -2.8 -3.4C-5 -3.4 -5.2 -5.8 -3.2 -6.6C-5.2 -7.6 -4.4 -10.2 -2.2 -10C-2.6 -12.2 -.6 -13 0 -13C.6 -13 2.6 -12.2 2.2 -10C4.4 -10.2 5.2 -7.6 3.2 -6.6C5.2 -5.8 5 -3.4 2.8 -3.4C3.6 -1.6 2 -.6 0 0Z',
        h: 13,
        rib: 'M0 -0.5L0 -11.5',
    },
    petal: { d: 'M0 0Q0.62 -0.55 0 -1Q-0.62 -0.55 0 0Z', h: 1 },
    star: { d: 'M0 0Q0.25 -0.5 0 -1Q-0.25 -0.5 0 0Z', h: 1 },
    strap: { d: 'M-0.07 0C-0.16 -0.4 -0.14 -0.8 0 -1C0.14 -0.8 0.16 -0.4 0.07 0Z', h: 1, rib: 'M0 -0.04L0 -0.94' },
    maple: MAPLE,
};
function leaf(kind, x, y, len, ang, S, sx = 1) {
    var _a;
    const g = (_a = exports.SH[kind]) !== null && _a !== void 0 ? _a : exports.SH.lens;
    const s = len / g.h;
    const a = ang + Math.PI / 2;
    const shape = xf(g.d, x, y, a, s, sx);
    return { wash: shape, line: S.full && g.rib ? shape + ' ' + xf(g.rib, x, y, a, s, sx) : shape };
}
function blossom(x, y, r, rot) {
    let d = '';
    for (let i = 0; i < 5; i++)
        d += xf(exports.SH.petal.d, x, y, (i * 72 + rot) * exports.D2R, r * 1.25) + ' ';
    return d.trim();
}
function star(x, y, r, rot) {
    let d = '';
    for (let i = 0; i < 8; i++)
        d += xf(exports.SH.star.d, x, y, (i * 45 + rot) * exports.D2R, r) + ' ';
    return d.trim();
}
function needles(x, y, len, ang, n = 5, spread = 0.9) {
    let d = '';
    for (let i = 0; i < n; i++) {
        const a = ang + (i / (n - 1) - 0.5) * spread;
        d += `M${(0, exports.f)(x)} ${(0, exports.f)(y)}L${(0, exports.f)(x + Math.cos(a) * len)} ${(0, exports.f)(y + Math.sin(a) * len)}`;
    }
    return d;
}
const disc = (x, y, r) => `M${(0, exports.f)(x - r)} ${(0, exports.f)(y)}A${(0, exports.f)(r)} ${(0, exports.f)(r)} 0 1 0 ${(0, exports.f)(x + r)} ${(0, exports.f)(y)}A${(0, exports.f)(r)} ${(0, exports.f)(r)} 0 1 0 ${(0, exports.f)(x - r)} ${(0, exports.f)(y)}Z`;
exports.disc = disc;
const oval = (x, y, rx, ry) => `M${(0, exports.f)(x - rx)} ${(0, exports.f)(y)}A${(0, exports.f)(rx)} ${(0, exports.f)(ry)} 0 1 0 ${(0, exports.f)(x + rx)} ${(0, exports.f)(y)}A${(0, exports.f)(rx)} ${(0, exports.f)(ry)} 0 1 0 ${(0, exports.f)(x - rx)} ${(0, exports.f)(y)}Z`;
exports.oval = oval;
function leafSet() {
    const w = [];
    const l = [];
    const set = {
        add(lf) {
            w.push(lf.wash);
            l.push(lf.line);
            return set;
        },
        wash: () => w.join(' '),
        line: () => l.join(' '),
        n: () => w.length,
    };
    return set;
}
function leavesNode(S, id, set, p = S.fol, extra = []) {
    return (0, exports.G)(id, [...extra, (0, exports.P)(set.wash(), S.washOf(p), { opacity: S.washOp }), inside((0, exports.L)(set.line(), S.lineOf(p), S.main))]);
}
function cutaway(S, x0, x1, y0 = 171, y1 = 190, seed = 5) {
    if (S.icon)
        return null;
    const r = rng(seed);
    let d = '';
    const n = S.small ? 12 : 30;
    for (let i = 0; i < n; i++) {
        const x = x0 + 6 + r() * (x1 - x0 - 12);
        const y = y0 + 4 + r() * (y1 - y0 - 6);
        d += `M${(0, exports.f)(x)} ${(0, exports.f)(y)}h0.6`;
    }
    const floor = Array.from({ length: Math.floor((x1 - x0) / 4) }, (_, i) => `M${(0, exports.f)(x0 + i * 4)} ${(0, exports.f)(y1)}h2`).join('');
    return (0, exports.G)('cutaway', [(0, exports.L)(d, S.soil, S.hair * 2, { opacity: 0.6 }), (0, exports.L)(floor, S.soil, S.hair, { opacity: 0.45 })]);
}
function glow(S, cx, cy, r0) {
    if (S.icon)
        return null;
    const r = Math.max(20, Math.min(r0, cy - 2, cx - 2, 198 - cx));
    const [a, b, c] = S.glowOps;
    return (0, exports.G)('glow', [
        (0, exports.C)(cx, cy, r, S.glow, { opacity: a }),
        (0, exports.C)(cx, cy, r * 0.74, S.glow, { opacity: b }),
        (0, exports.C)(cx, cy, r * 0.48, S.glow, { opacity: c }),
        S.full ? { t: 'circle', cx: (0, exports.f)(cx), cy: (0, exports.f)(cy), r: (0, exports.f)(r * 0.86), fill: 'none', stroke: S.glowRing, sw: S.hair, opacity: 0.3 } : null,
    ]);
}
function stones(S, id, pts) {
    let d = '';
    let h = '';
    for (const [x, y, r] of pts) {
        d += `M${(0, exports.f)(x - r)} ${(0, exports.f)(y)}Q${(0, exports.f)(x - r)} ${(0, exports.f)(y - r * 0.9)} ${(0, exports.f)(x)} ${(0, exports.f)(y - r * 0.95)}Q${(0, exports.f)(x + r)} ${(0, exports.f)(y - r * 0.9)} ${(0, exports.f)(x + r)} ${(0, exports.f)(y)}Z`;
        if (S.full)
            h += hatchE(x, y - r * 0.4, r * 0.8, r * 0.5, y - r * 0.45, y, 1.4, 0, true);
    }
    return (0, exports.G)(id, [(0, exports.P)(d, S.stoneFill), h ? inside((0, exports.L)(h, S.stone, S.hair, { opacity: 0.6 })) : null, inside((0, exports.L)(d, S.stone, S.fine * 1.6))]);
}
function boulder(S, d, cx, cy, rx, ry) {
    return (0, exports.G)('stone', [(0, exports.P)(d, S.stoneFill), S.icon ? null : inside((0, exports.L)(hatchE(cx, cy, rx * 0.85, ry * 0.8, cy, cy + ry, 1.8, 8), S.stone, S.hair, { opacity: 0.6 })), inside((0, exports.L)(d, S.stone, S.main))]);
}
const M = (x, y, rx, ry, dom, o = {}) => ({ x, y, rx, ry, dom, ...o });
exports.M = M;
function scaleMasses(S, ms) {
    for (const m of ms) {
        if (m.scaled)
            continue;
        const k = S.sc(m.dom);
        m.rx *= k;
        m.ry *= k;
        m.scaled = true;
    }
    return ms;
}
function crown(S, masses, o = {}) {
    var _a;
    const pal = (_a = o.pal) !== null && _a !== void 0 ? _a : S.pal;
    const r = rng(o.seed || 11);
    if (o.ids !== false)
        scaleMasses(S, masses);
    const byDom = new Map();
    for (const m of masses) {
        if (!byDom.has(m.dom))
            byDom.set(m.dom, []);
        byDom.get(m.dom).push(m);
    }
    const lw = S.icon ? S.main : S.fine * 1.45;
    const organs = [];
    const groups = [...byDom.entries()].map(([dom, ms]) => {
        let fill = '';
        let hatch = '';
        const set = leafSet();
        let marks = '';
        let needleD = '';
        ms.forEach((m, k) => {
            var _a, _b, _c, _d, _e, _f;
            const d = massD(m.x, m.y, m.rx, m.ry, m.n || Math.max(7, Math.round(m.rx / 3.4)), (o.seed || 11) + dom * 13 + k * 7, (_a = m.bulge) !== null && _a !== void 0 ? _a : 0.2, (_b = m.flat) !== null && _b !== void 0 ? _b : 9);
            fill += d;
            if (!S.icon) {
                const fy = m.flat !== undefined && m.flat < 1 ? m.y + m.ry * m.flat : m.y + m.ry;
                hatch += hatchE(m.x, m.y + m.ry * 0.05, m.rx * 0.82, m.ry * 0.8, m.y + m.ry * ((_c = m.hatchFrom) !== null && _c !== void 0 ? _c : 0.05), Math.min(fy, m.y + m.ry), S.small ? 3.4 : m.dense || o.dense ? 1.8 : 2.2, (_d = o.hatchAng) !== null && _d !== void 0 ? _d : -14);
                const per = ((_e = o.rim) !== null && _e !== void 0 ? _e : 1.2) * (S.small ? 0.5 : 1);
                const n = Math.max((_f = o.rimMin) !== null && _f !== void 0 ? _f : 2, Math.round((m.rx / 10) * per * 2));
                for (let j = 0; j < n; j++) {
                    const a = (-170 + (j + 0.5) * (160 / n) + (r() - 0.5) * 12) * exports.D2R;
                    const x = m.x + Math.cos(a) * m.rx * 0.95;
                    const y = m.y + Math.sin(a) * m.ry * 0.95;
                    if (m.flat !== undefined && y > m.y + m.ry * m.flat)
                        continue;
                    if (o.needle) {
                        needleD += needles(x, y + 1.5, S.small ? 7 : 6, a + (r() - 0.5) * 0.3, 3, 1.1);
                        continue;
                    }
                    if (o.blossom)
                        marks += blossom(x, y, (o.ll || 9) * 0.32 * (S.small ? 1.25 : 1), r() * 70) + ' ';
                    else
                        set.add(leaf(o.kind || 'lens', x, y, (o.ll || 10) * (S.small ? 1.25 : 1), a + (r() - 0.5) * 0.6, S));
                }
            }
            organs.push({ dom, x: m.x, y: m.y });
        });
        const dense = ms.some((m) => m.dense) || o.dense;
        return (0, exports.G)(o.ids === false ? null : `domain-${dom}`, [
            (0, exports.P)(fill, S.massFill(pal, dense)),
            hatch ? inside((0, exports.L)(hatch, S.lineOf(pal), S.hair, { opacity: 0.5 })) : null,
            set.n() ? (0, exports.P)(set.wash(), S.washOf(pal), { opacity: S.washOp }) : null,
            marks ? (0, exports.P)(marks, S.washOf(pal), { opacity: 0.85 }) : null,
            inside((0, exports.L)(fill + ' ' + set.line() + (marks ? ' ' + marks : ''), S.lineOf(pal), lw)),
            needleD ? (0, exports.L)(needleD, S.lineOf(pal), S.fine * 1.2) : null,
        ]);
    });
    return { node: (0, exports.G)('canopy', groups), organs };
}
function limbs(S, list, bark, id = 'branches') {
    const fills = [];
    for (const [p0, pc, p1, w0, w1] of list)
        fills.push(taper(p0, pc, p1, w0 * (S.icon ? 1.15 : 1), w1, 10).closed);
    return (0, exports.G)(id, [(0, exports.P)(fills.join(' '), S.woodFill(bark)), inside((0, exports.L)(fills.join(' '), S.wood(bark), S.icon ? S.main * 0.9 : S.fine * 1.5))]);
}
function trunk(S, p0, pc, p1, w0, w1, bark, o = {}) {
    const t = taper(p0, pc, p1, w0, w1, 16);
    const fur = S.full && o.furrows !== 0 && w0 > 8 ? furrows(t.left, t.right, o.furrows || 4, o.seed || 3) : '';
    const extra = o.extra && !S.icon ? o.extra(t) : '';
    return (0, exports.G)('trunk', [(0, exports.P)(t.closed, S.woodFill(bark)), fur || extra ? inside((0, exports.L)(fur + extra, S.wood(bark), S.hair * 1.4, { opacity: 0.75 })) : null, inside((0, exports.L)(t.sides, S.wood(bark), S.main))]);
}
const rootLines = (S, d, bark) => (S.icon ? null : (0, exports.G)('roots', [(0, exports.L)(d, S.wood(bark), S.main * 1.1)]));
exports.rootLines = rootLines;
const rootTapers = (S, list, bark) => limbs(S, list, bark, 'roots');
exports.rootTapers = rootTapers;
function lowerRim(masses, n, seed, from = 0.15, to = 0.85) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
        const m = masses[i % masses.length];
        const a = (0, exports.lerp)(from, to, (Math.floor(i / masses.length) + r()) / Math.max(1, Math.ceil(n / masses.length))) * 180 * exports.D2R;
        out.push([m.x + Math.cos(a) * m.rx * 0.7, m.y + Math.sin(a) * m.ry * (m.flat !== undefined && m.flat < 1 ? Math.min(0.9, m.flat) : 0.86)]);
    }
    return out;
}
function upperRim(masses, n, seed) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
        const m = masses[i % masses.length];
        const a = (-160 + r() * 140) * exports.D2R;
        out.push([m.x + Math.cos(a) * m.rx * 0.72, m.y + Math.sin(a) * m.ry * 0.72]);
    }
    return out;
}
function acorns(S, pts) {
    if (S.icon || !pts.length)
        return null;
    let nut = '';
    let cup = '';
    for (const [x, y] of pts) {
        nut += (0, exports.oval)(x, y + 3, 2.3, 3.1);
        cup += `M${(0, exports.f)(x - 2.9)} ${(0, exports.f)(y + 1.4)}Q${(0, exports.f)(x)} ${(0, exports.f)(y - 2.6)} ${(0, exports.f)(x + 2.9)} ${(0, exports.f)(y + 1.4)}Z`;
    }
    const c = exports.A0.gift.acorn;
    return (0, exports.G)('fruit', [(0, exports.P)(nut, S.giftFill(c)), (0, exports.P)(cup, S.woodFill(exports.A0.bark.oak)), (0, exports.L)(nut + cup, S.gift(c), S.hair * 1.8)]);
}
const WING = 'M0 0C1.5 1 4.5 1.8 7 1.2C6 3.4 2.6 3.8 0.6 2.4Z';
function samaras(S, pts) {
    if (S.icon || !pts.length)
        return null;
    let d = '';
    let st = '';
    for (const [x, y] of pts) {
        st += `M${(0, exports.f)(x)} ${(0, exports.f)(y - 4)}L${(0, exports.f)(x)} ${(0, exports.f)(y)}`;
        d += xf(WING, x, y, 0.5, 1) + ' ' + xf(WING, x, y, Math.PI - 0.5, 1, -1) + ' ';
    }
    const c = exports.A0.gift.samara;
    return (0, exports.G)('fruit', [(0, exports.P)(d, S.giftFill(c)), (0, exports.L)(st + d, S.gift(c), S.hair * 1.6)]);
}
function goldSprays(S, pts, s = 1) {
    if (!pts.length)
        return null;
    let stem = '';
    let fl = '';
    const r = rng(77);
    for (const [x, y] of pts) {
        if (S.icon) {
            fl += (0, exports.disc)(x, y, 2.4 * s);
            continue;
        }
        const dir = r() > 0.5 ? 1 : -1;
        const len = 7 * s;
        const tip = [x + dir * len, y - len * 0.35];
        const c = [x + dir * len * 0.4, y - len * 0.75];
        stem += (0, exports.Q)([x, y], c, tip);
        const n = S.small ? 3 : 5;
        for (let i = 0; i < n; i++) {
            const t = 0.2 + (i / (n - 1)) * 0.8;
            const p = (0, exports.qp)([x, y], c, tip, t);
            fl += (0, exports.disc)(p[0] + (i % 2 ? 1.1 : -1.1), p[1] + (i % 2 ? 0.8 : -0.8), (1.5 - t * 0.6) * s);
        }
    }
    return (0, exports.G)('blooms', [(0, exports.P)(fl, S.goldWash, { opacity: 0.85 }), (0, exports.L)(stem + fl, S.gold, S.hair * 1.4)]);
}
function blossoms(S, pts, r0, pal, id = 'blooms') {
    if (S.icon || !pts.length)
        return null;
    const rr = rng(31);
    let d = '';
    for (const [x, y] of pts)
        d += blossom(x, y, r0 * (S.small ? 1.2 : 1), rr() * 70) + ' ';
    return (0, exports.G)(id, [(0, exports.P)(d, S.washOf(pal), { opacity: 0.9 }), (0, exports.L)(d, S.lineOf(pal), S.hair * 1.6)]);
}
function hanging(S, pts, o) {
    if (S.icon || !pts.length)
        return null;
    let st = '';
    let fr = '';
    let blush = '';
    for (const [x, y] of pts) {
        const len = o.stalk || 6;
        st += `M${(0, exports.f)(x)} ${(0, exports.f)(y)}Q${(0, exports.f)(x + 1)} ${(0, exports.f)(y + len * 0.5)} ${(0, exports.f)(x)} ${(0, exports.f)(y + len)}`;
        const cy = y + len + o.ry;
        fr += o.shape ? o.shape(x, cy) : (0, exports.oval)(x, cy, o.rx, o.ry);
        if (o.blush)
            blush += (0, exports.oval)(x + o.rx * 0.3, cy - o.ry * 0.3, o.rx * 0.45, o.ry * 0.4);
    }
    return (0, exports.G)(o.id || 'fruit', [(0, exports.P)(fr, S.giftFill(o.color)), blush && o.blush ? (0, exports.P)(blush, o.blush, { opacity: 0.35 }) : null, (0, exports.L)(st, S.wood(exports.A0.bark.mango), S.hair * 1.4), (0, exports.L)(fr, S.gift(o.color), S.hair * 1.8)]);
}
function drift(S, items, pal, kind = 'lens') {
    if (!S.full)
        return [];
    const set = leafSet();
    let marks = '';
    for (const [x, y, len, a] of items) {
        if (kind === 'blossom')
            marks += blossom(x, y, len * 0.3, a) + ' ';
        else
            set.add(leaf(kind, x, y, len, a * exports.D2R, S));
    }
    return [(0, exports.P)(set.wash() + marks, S.washOf(pal), { opacity: S.washOp }), (0, exports.L)(set.line() + marks, S.lineOf(pal), S.fine * 1.3)];
}
function seedPart(S, d, color, extraLine = '') {
    return (0, exports.G)('seed', [(0, exports.P)(d, S.woodFill(color)), extraLine && !S.icon ? (0, exports.L)(extraLine, S.wood(color), S.hair * 1.6, { opacity: 0.8 }) : null, inside((0, exports.L)(d, S.wood(color), S.main))]);
}
  };
  links["src/components/plant/forms/trees.ts"] = {"./kit":"src/components/plant/forms/kit.ts"};
  defs["src/components/plant/forms/trees.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.habitBase = exports.TREE_LINES = exports.flavoursFor = exports.RECIPES = exports.bands = exports.HABIT = exports.green = void 0;
exports.tree = tree;
exports.young1 = young1;
exports.pinnate = pinnate;
const kit_1 = require("./kit");
const green = (p) => p === 'ember' || p === 'gold' || p === 'golden' || p === 'lemon' ? 'spring' : p === 'blossom' || p === 'snow' || p === 'twilight' || p === 'rosewood' || p === 'pearl' ? 'grove' : p;
exports.green = green;
function tree(c, sp) {
    const { S } = c;
    const body = [];
    if (sp.rootD)
        body.push((0, kit_1.rootLines)(S, sp.rootD, sp.bark));
    if (sp.roots)
        body.push((0, kit_1.rootTapers)(S, sp.roots, sp.bark));
    if (sp.limbs)
        body.push((0, kit_1.limbs)(S, sp.limbs, sp.bark));
    const [p0, pc, p1, w0, w1, to] = sp.trunk;
    body.push((0, kit_1.trunk)(S, p0, pc, p1, w0, w1, sp.bark, to || {}));
    if (sp.afterTrunk)
        body.push(...sp.afterTrunk);
    if (sp.ids !== false)
        (0, kit_1.scaleMasses)(S, sp.masses);
    let masses = sp.masses;
    if (sp.pads)
        masses = masses.map((m) => { var _a; return ({ ...m, ry: Math.max(6.5, m.ry * 0.55), flat: Math.min((_a = m.flat) !== null && _a !== void 0 ? _a : 9, 0.62), n: m.n || Math.max(8, Math.round(m.rx / 3)) }); });
    const cr = (0, kit_1.crown)(S, masses, { kind: sp.kind, ll: sp.ll, pal: sp.pal, rim: sp.rim, blossom: sp.blossom, needle: sp.needle, seed: sp.seed, dense: sp.dense, ids: sp.ids });
    body.push(cr.node);
    if (sp.extras)
        body.push(...sp.extras(cr));
    const left = masses.reduce((a, m) => (m.x < a.x ? m : a));
    return {
        body,
        back: sp.back || [],
        front: sp.front || [],
        drift: sp.drift || [],
        glow: sp.glow || null,
        perch: sp.perch || [left.x + left.rx * 0.2, left.y - left.ry * 0.85],
        organs: cr.organs,
    };
}
function mangoes(S, pts) {
    return (0, kit_1.hanging)(S, pts, {
        color: kit_1.A0.gift.mangoRipe,
        blush: kit_1.A0.gift.mangoBlush,
        stalk: 7,
        rx: 3.2,
        ry: 4.4,
        shape: (x, y) => `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y - 4.6)}C${(0, kit_1.f)(x + 4)} ${(0, kit_1.f)(y - 4)} ${(0, kit_1.f)(x + 3.6)} ${(0, kit_1.f)(y + 4.4)} ${(0, kit_1.f)(x - 0.4)} ${(0, kit_1.f)(y + 4.6)}C${(0, kit_1.f)(x - 3.6)} ${(0, kit_1.f)(y + 4.4)} ${(0, kit_1.f)(x - 3)} ${(0, kit_1.f)(y - 1)} ${(0, kit_1.f)(x)} ${(0, kit_1.f)(y - 4.6)}Z`,
    });
}
exports.HABIT = {
    oak: { bark: kit_1.A0.bark.oak, kind: 'oak', ll: 11, aspect: 1, fruit: (S, ms) => (0, kit_1.acorns)(S, (0, kit_1.lowerRim)(ms, 6, 3)) },
    maple: { bark: kit_1.A0.bark.maple, kind: 'maple', ll: 11, aspect: 0.94, fruit: (S, ms) => (0, kit_1.samaras)(S, (0, kit_1.lowerRim)(ms, 6, 5)) },
    narra: { bark: kit_1.A0.bark.narra, kind: 'ovate', ll: 9, aspect: 1.1, fruit: (S, ms) => (0, kit_1.goldSprays)(S, (0, kit_1.upperRim)(ms, 8, 9), 1.05) },
    'cherry-blossom': { bark: kit_1.A0.bark.cherry, kind: 'lens', ll: 9, aspect: 1.05, blossom: true, bands: true, fruit: () => null },
    mango: { bark: kit_1.A0.bark.mango, kind: 'long', ll: 13, aspect: 1.04, fruit: (S, ms) => mangoes(S, (0, kit_1.lowerRim)(ms, 6, 4)) },
};
const bands = (t) => {
    let d = '';
    const n = t.left.length - 1;
    for (let i = 2; i < n - 1; i += 2) {
        const a = t.left[i];
        const b = t.right[i];
        d += `M${(0, kit_1.f)(a[0] + (b[0] - a[0]) * 0.22)} ${(0, kit_1.f)(a[1] + (b[1] - a[1]) * 0.22)}L${(0, kit_1.f)(a[0] + (b[0] - a[0]) * 0.5)} ${(0, kit_1.f)(a[1] + (b[1] - a[1]) * 0.5)}`;
    }
    return d;
};
exports.bands = bands;
const ax = (H, x) => { var _a; return 100 + (x - 100) * ((_a = H.aspect) !== null && _a !== void 0 ? _a : 1); };
const base = (H) => ({ bark: H.bark, kind: H.kind, ll: H.ll, aspect: H.aspect, blossom: H.blossom, bands: H.bands, pads: H.pads, needle: H.needle });
exports.habitBase = base;
function lookout(c, H, pal) {
    const k = (x) => ax(H, x);
    const masses = [(0, kit_1.M)(k(60), 72, 20, 14, 1), (0, kit_1.M)(k(70), 42, 19, 13, 2), (0, kit_1.M)(k(130), 42, 19, 13, 4), (0, kit_1.M)(k(140), 72, 20, 14, 5), (0, kit_1.M)(100, 20, 17, 11, 3)];
    return tree(c, {
        ...base(H),
        pal,
        seed: 41,
        masses,
        trunk: [[100, 171], [100, 132], [100, 92], 16, 9, { furrows: 5, extra: H.bands ? exports.bands : null }],
        limbs: [
            [[100, 104], [80, 96], [k(62), 76], 6, 2],
            [[100, 104], [120, 96], [k(138), 76], 6, 2],
            [[100, 96], [82, 70], [k(72), 46], 5, 1.8],
            [[100, 96], [118, 70], [k(128), 46], 5, 1.8],
            [[100, 96], [101, 60], [100, 24], 6, 1.6],
        ],
        extras: () => [H.fruit(c.S, masses)],
        glow: [100, 56, 70],
        perch: [100, 60],
        rootD: c.inPot ? null : 'M92 168Q82 171 74 173M108 168Q118 171 126 173',
    });
}
function pebbles(c) {
    const s = Math.min(c.span, 30);
    return {
        back: [],
        front: [
            (0, kit_1.stones)(c.S, 'stones-front', [
                [100 - s * 0.8, 170.5, 3],
                [100 - s * 0.45, 171.5, 2.6],
                [100 + s * 0.45, 171.5, 2.6],
                [100 + s * 0.8, 170.5, 3],
                [100 + s * 0.05, 172, 2.4],
            ]),
        ],
    };
}
function moot(c, H, pal) {
    const k = (x) => { var _a; return 100 + (x - 100) * Math.min(1, (_a = H.aspect) !== null && _a !== void 0 ? _a : 1); };
    const masses = [
        (0, kit_1.M)(100, 66, 44, 11, 3, { flat: 0.55, n: 12 }),
        (0, kit_1.M)(k(58), 88, 30, 10, 2, { flat: 0.55 }),
        (0, kit_1.M)(k(142), 88, 30, 10, 4, { flat: 0.55 }),
        (0, kit_1.M)(100, 86, 30, 11, 3, { flat: 0.55 }),
        (0, kit_1.M)(k(26), 110, 22, 9, 1, { flat: 0.55 }),
        (0, kit_1.M)(k(174), 110, 22, 9, 5, { flat: 0.55 }),
    ];
    masses.sort((a, b) => a.dom - b.dom);
    const one = (d) => masses.find((m) => m.dom === d);
    const order = [one(1), one(5), one(2), one(4), ...masses.filter((m) => m.dom === 3)];
    const st = c.inPot
        ? pebbles(c)
        : {
            back: [(0, kit_1.stones)(c.S, 'stones', [[54, 167, 7], [146, 167, 7]])],
            front: [(0, kit_1.stones)(c.S, 'stones-front', [[72, 175, 6], [128, 175, 6], [100, 179, 5]])],
        };
    return tree(c, {
        ...base(H),
        pal,
        seed: 51,
        masses: order,
        trunk: [[100, 171], [100, 150], [100, 126], 24, 17, { furrows: 6, extra: H.bands ? exports.bands : null }],
        limbs: [
            [[100, 134], [62, 130], [k(22), 116], 8, 2.2],
            [[100, 134], [138, 130], [k(178), 116], 8, 2.2],
            [[100, 130], [76, 112], [k(52), 94], 7, 2],
            [[100, 130], [124, 112], [k(148), 94], 7, 2],
            [[100, 128], [100, 104], [100, 70], 7, 2],
        ],
        extras: () => [H.fruit(c.S, masses.slice(0, 4))],
        back: st.back,
        front: st.front,
        glow: [100, 92, 80],
        perch: [k(52), 80],
    });
}
function espalier(c, H, pal) {
    const { S } = c;
    const w = c.inPot ? Math.min(74, c.span + 34) : c.keeps ? 62 : 74;
    const X = (u) => 100 + u * w;
    const rows = [130, 98, 66];
    const ls = [];
    rows.forEach((y, i) => {
        const reach = 0.94 - i * 0.12;
        for (const s of [-1, 1])
            ls.push([[100, y + 5], [100 + s * 10, y], [X(s * reach), y], 6 - i, 2]);
    });
    const masses = [
        (0, kit_1.M)(X(-0.52), 124, w * 0.36, 7, 1, { flat: 0.6, n: 10 }),
        (0, kit_1.M)(X(-0.46), 92, w * 0.32, 7, 2, { flat: 0.6, n: 10 }),
        (0, kit_1.M)(100, 56, w * 0.46, 10, 3, { flat: 0.6, n: 12 }),
        (0, kit_1.M)(X(0.46), 92, w * 0.32, 7, 4, { flat: 0.6, n: 10 }),
        (0, kit_1.M)(X(0.52), 124, w * 0.36, 7, 5, { flat: 0.6, n: 10 }),
    ];
    const post = kit_1.A0.planter.post;
    const px0 = X(-1);
    const px1 = X(1);
    const frameD = `M${(0, kit_1.f)(px0)} 171L${(0, kit_1.f)(px0)} 52M${(0, kit_1.f)(px1)} 171L${(0, kit_1.f)(px1)} 52`;
    const wires = rows.map((y) => `M${(0, kit_1.f)(px0)} ${y}L${(0, kit_1.f)(px1)} ${y}`).join('') + `M${(0, kit_1.f)(px0)} 58L${(0, kit_1.f)(px1)} 58`;
    const ties = S.icon ? '' : rows.flatMap((y) => [-0.94, -0.5, 0.5, 0.94].map((u) => `M${(0, kit_1.f)(X(u) - 1.4)} ${y - 1.6}L${(0, kit_1.f)(X(u) + 1.4)} ${y + 1.6}`)).join('');
    const posts = frameD.replace(/M(\S+) 171L\S+ 52/g, (_m, x) => `M${(0, kit_1.f)(+x - 1.6)} 171L${(0, kit_1.f)(+x - 1.4)} 52L${(0, kit_1.f)(+x + 1.4)} 52L${(0, kit_1.f)(+x + 1.6)} 171Z`);
    return tree(c, {
        ...base(H),
        pal,
        seed: 61,
        masses,
        trunk: [[100, 171], [100, 110], [100, 52], 12, 5, { furrows: 3, extra: H.bands ? exports.bands : null }],
        limbs: ls,
        extras: () => [H.fruit(S, masses.slice(0, 2).concat(masses.slice(3))), ties ? (0, kit_1.G)('ties', [(0, kit_1.L)(ties, S.wood(post), S.hair * 1.6)]) : null],
        back: [(0, kit_1.G)('frame', [(0, kit_1.P)(posts, S.woodFill(post)), (0, kit_1.L)(frameD, S.wood(post), S.main), S.icon ? null : (0, kit_1.L)(wires, S.wood(post), S.hair * 1.4, { opacity: 0.85 })])],
        glow: [100, 96, 82],
        perch: [X(-0.9), 124],
    });
}
function coppice(c, H, pal) {
    const { S } = c;
    const k = (x) => ax(H, x);
    const masses = [(0, kit_1.M)(k(56), 88, 19, 15, 1), (0, kit_1.M)(k(72), 70, 18, 15, 2), (0, kit_1.M)(100, 42, 22, 17, 3), (0, kit_1.M)(k(128), 70, 18, 15, 4), (0, kit_1.M)(k(144), 88, 19, 15, 5)];
    const stool = 'M80 171C80 160 86 152 100 152C114 152 120 160 120 171Z';
    const shoots = (0, kit_1.leafSet)();
    for (const [x0, x1, y1, s] of [
        [86, 74, 140, -1],
        [114, 128, 142, 1],
    ]) {
        shoots.add((0, kit_1.leaf)(H.kind === 'maple' || H.kind === 'oak' ? H.kind : 'lens', x1, y1, 9, (-90 + s * 40) * kit_1.D2R, S));
        shoots.add((0, kit_1.leaf)('lens', (x0 + x1) / 2, 152, 7, (-90 - s * 30) * kit_1.D2R, S));
    }
    const g = (0, exports.green)(pal);
    return tree(c, {
        ...base(H),
        pal,
        seed: 71,
        masses,
        trunk: [[100, 171], [100, 162], [100, 152], 40, 26, { furrows: 0 }],
        limbs: [
            [[92, 156], [80, 120], [k(64), 82], 10, 4],
            [[100, 154], [98, 100], [100, 46], 11, 4],
            [[108, 156], [120, 120], [k(136), 82], 10, 4],
            [[k(64), 84], [k(68), 78], [k(72), 70], 4, 2],
            [[k(136), 84], [k(132), 78], [k(128), 70], 4, 2],
        ],
        afterTrunk: [
            (0, kit_1.G)('stool', [(0, kit_1.P)(stool, S.woodFill(H.bark)), S.full ? (0, kit_1.L)('M88 158Q100 154 112 158M84 165Q100 160 116 165', S.wood(H.bark), S.hair * 1.4, { opacity: 0.7 }) : null, (0, kit_1.L)(stool.replace('Z', ''), S.wood(H.bark), S.main)]),
            S.icon ? null : (0, kit_1.G)('shoots', [(0, kit_1.L)('M86 160Q82 150 74 140M114 160Q120 152 128 142', S.lineOf(g), S.fine * 1.4), (0, kit_1.P)(shoots.wash(), S.washOf(g), { opacity: S.washOp }), (0, kit_1.L)(shoots.line(), S.lineOf(g), S.fine * 1.4)]),
        ],
        extras: () => [H.fruit(S, masses)],
        glow: [100, 76, 78],
        perch: [k(52), 72],
    });
}
function holdfast(c, H, pal) {
    const { S } = c;
    const sc = c.inPot ? Math.min(1, (c.span + 8) / 44) : 1;
    const X = (x) => 100 + (x - 100) * sc;
    const top = 170 - 32 * sc;
    const rock = `M${(0, kit_1.f)(X(58))} 171C${(0, kit_1.f)(X(54))} ${(0, kit_1.f)(170 - 14 * sc)} ${(0, kit_1.f)(X(62))} ${(0, kit_1.f)(170 - 26 * sc)} ${(0, kit_1.f)(X(76))} ${(0, kit_1.f)(170 - 30 * sc)}C${(0, kit_1.f)(X(86))} ${(0, kit_1.f)(top - 3)} ${(0, kit_1.f)(X(96))} ${(0, kit_1.f)(top + 1)} ${(0, kit_1.f)(X(104))} ${(0, kit_1.f)(top - 1)}C${(0, kit_1.f)(X(120))} ${(0, kit_1.f)(top - 3)} ${(0, kit_1.f)(X(138))} ${(0, kit_1.f)(170 - 24 * sc)} ${(0, kit_1.f)(X(142))} ${(0, kit_1.f)(170 - 10 * sc)}C${(0, kit_1.f)(X(143))} 167 ${(0, kit_1.f)(X(142))} 169 ${(0, kit_1.f)(X(141))} 171Z`;
    const masses = [
        (0, kit_1.M)(72, 72, 26, 20, 1, { dense: true }),
        (0, kit_1.M)(128, 72, 26, 20, 5, { dense: true }),
        (0, kit_1.M)(82, 50, 24, 20, 2, { dense: true }),
        (0, kit_1.M)(118, 50, 24, 20, 4, { dense: true }),
        (0, kit_1.M)(100, 40, 28, 22, 3, { dense: true }),
        (0, kit_1.M)(100, 66, 28, 20, 3, { dense: true }),
    ];
    return tree(c, {
        ...base(H),
        pal,
        seed: 81,
        masses,
        dense: true,
        roots: [
            [[94, top + 2], [X(68), top + 6], [X(62), 171], 7, 2.4],
            [[97, top + 4], [X(86), top + 18], [X(86), 171], 6, 2.4],
            [[103, top + 4], [X(116), top + 18], [X(116), 171], 6, 2.4],
            [[106, top + 2], [X(134), top + 6], [X(140), 171], 7, 2.4],
        ],
        trunk: [[100, top + 4], [99, top - 20], [98, 92], 24, 15, { furrows: 6, extra: H.bands ? exports.bands : null }],
        limbs: [
            [[99, 100], [84, 86], [72, 72], 6, 2],
            [[99, 98], [114, 86], [128, 72], 6, 2],
            [[98, 96], [98, 72], [100, 46], 6, 2],
        ],
        extras: () => [H.fruit(S, masses.slice(0, 2))],
        back: [(0, kit_1.boulder)(S, rock, 100, 170 - 16 * sc, 42 * sc, 16 * sc)],
        glow: [100, 66, 74],
        perch: [74, 52],
    });
}
exports.RECIPES = { lookout, moot, espalier, coppice, holdfast };
const flavoursFor = (H) => ({
    lookout: (c) => lookout(c, H, c.S.pal),
    moot: (c) => moot(c, H, c.S.pal),
    espalier: (c) => espalier(c, H, c.S.pal),
    coppice: (c) => coppice(c, H, c.S.pal),
    holdfast: (c) => holdfast(c, H, c.S.pal),
});
exports.flavoursFor = flavoursFor;
function young1(c, o) {
    const { S } = c;
    const lp = (0, exports.green)(S.pal);
    const set = (0, kit_1.leafSet)();
    for (const [kind, x, y, len, a, sx] of o.leaves)
        set.add((0, kit_1.leaf)(kind, x, y, len, a * kit_1.D2R, S, sx || 1));
    return {
        cutaway: (0, kit_1.cutaway)(S, 64, 136, 171, 190, o.seed || 5),
        body: [
            (0, kit_1.G)('roots', [(0, kit_1.L)(o.root, S.wood(o.seedColor), S.fine * 1.5)]),
            (0, kit_1.seedPart)(S, o.seedD, o.seedColor, o.seedLine),
            ...(o.extra || []),
            (0, kit_1.G)('sprout', [(0, kit_1.L)(o.stem, S.lineOf(lp), S.main), (0, kit_1.P)(set.wash(), S.washOf(lp), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(lp), S.main)]),
        ],
        perch: [74, 170],
    };
}
const oak = {
    I: (c) => young1(c, {
        seedColor: kit_1.A0.gift.acorn,
        seedD: 'M86 163C86 156 92 152 97 152C103 152 107 157 106 163C105 169 100 172 96 172C90 172 86 169 86 163Z M84 160C84 151 104 149 107 158C100 162 90 163 84 160Z',
        seedLine: (0, kit_1.hatchE)(95.5, 156.5, 10.5, 4.4, 151, 162, 1.6, 35, true) + (0, kit_1.hatchE)(95.5, 156.5, 10.5, 4.4, 151, 162, 1.6, -35, true),
        root: 'M97 168Q95 178 99 189M96 176l-5 3M97 182l5 3M98 186l-4 3',
        stem: 'M98 154Q96 140 101 122',
        leaves: [
            ['oak', 101, 122, 16, -150],
            ['oak', 101, 122, 16, -30],
            ['lens', 101, 122, 6, -88],
        ],
    }),
    II: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const lp = (0, exports.green)(S.pal);
        let tw = '';
        for (const [x, y, s] of [
            [100, 146, -1],
            [101, 128, 1],
            [99, 110, -1],
            [101, 94, 1],
        ]) {
            tw += `M${x} ${y}l${s * 8} -5`;
            set.add((0, kit_1.leaf)('oak', x + s * 8, y - 5, 20, (s > 0 ? -28 : -152) * kit_1.D2R, S)).add((0, kit_1.leaf)('oak', x + s * 8, y - 5, 14, (s > 0 ? 18 : 162) * kit_1.D2R, S));
        }
        for (const a of [-60, -120, -90])
            set.add((0, kit_1.leaf)('oak', 100, 70, a === -90 ? 14 : 18, a * kit_1.D2R, S));
        return {
            body: [
                (0, kit_1.G)('stem', [(0, kit_1.L)('M100 171L100 146L101 128L99 110L101 94L100 70', S.wood(kit_1.A0.bark.oak), S.main * 1.5), (0, kit_1.L)(tw, S.wood(kit_1.A0.bark.oak), S.fine * 1.4)]),
                (0, kit_1.leavesNode)(S, 'leaves', set, lp),
                S.icon ? null : (0, kit_1.G)('bud', [(0, kit_1.P)((0, kit_1.oval)(100, 66, 1.8, 2.6), S.woodFill(kit_1.A0.bark.oak)), (0, kit_1.L)((0, kit_1.oval)(100, 66, 1.8, 2.6), S.wood(kit_1.A0.bark.oak), S.fine)]),
            ],
            perch: [80, 150],
        };
    },
    III: (c) => tree(c, {
        ...base(exports.HABIT.oak),
        pal: c.S.pal,
        seed: 51,
        masses: [(0, kit_1.M)(100, 56, 26, 22, 3), (0, kit_1.M)(78, 80, 23, 19, 1), (0, kit_1.M)(122, 80, 23, 19, 5), (0, kit_1.M)(86, 102, 20, 13, 2), (0, kit_1.M)(114, 102, 20, 13, 4)],
        trunk: [[100, 171], [100, 140], [100, 108], 10, 6],
        limbs: [
            [[100, 116], [88, 104], [80, 88], 4, 1.4],
            [[100, 112], [104, 96], [100, 70], 4, 1.4],
            [[100, 116], [114, 104], [122, 88], 4, 1.4],
        ],
        extras: () => [
            (0, kit_1.acorns)(c.S, [
                [84, 106],
                [118, 102],
                [104, 84],
            ]),
        ],
        perch: [76, 62],
    }),
    IV: (c) => {
        const { S } = c;
        const masses = [(0, kit_1.M)(32, 92, 24, 15, 1), (0, kit_1.M)(168, 92, 24, 15, 5), (0, kit_1.M)(58, 66, 26, 19, 2), (0, kit_1.M)(142, 66, 26, 19, 4), (0, kit_1.M)(100, 50, 31, 21, 3)];
        return tree(c, {
            ...base(exports.HABIT.oak),
            pal: S.pal,
            seed: 61,
            masses,
            rootD: c.inPot ? null : 'M86 167Q70 170 52 172M88 168Q80 172 70 176M114 167Q130 170 150 172M112 168Q122 172 132 176',
            limbs: [
                [[100, 124], [62, 120], [30, 98], 8, 2.4],
                [[100, 120], [76, 98], [56, 70], 8, 2.4],
                [[100, 118], [96, 88], [100, 54], 9, 2.4],
                [[100, 120], [124, 98], [144, 70], 8, 2.4],
                [[100, 124], [138, 120], [170, 98], 8, 2.4],
            ],
            trunk: [[100, 171], [100, 144], [100, 118], 28, 18, { furrows: 7, seed: 8 }],
            afterTrunk: S.icon ? [] : [(0, kit_1.G)('burl', [(0, kit_1.L)((0, kit_1.oval)(108, 146, 4.5, 3.4) + (0, kit_1.oval)(108, 146, 2.2, 1.6), S.wood(kit_1.A0.bark.oak), S.fine)])],
            extras: () => [
                (0, kit_1.acorns)(S, [
                    [42, 104],
                    [66, 84],
                    [92, 66],
                    [112, 64],
                    [136, 84],
                    [160, 104],
                    [78, 74],
                    [124, 74],
                ]),
            ],
            drift: (0, kit_1.drift)(S, [
                [180, 126, 9, 60],
                [174, 148, 8, 120],
            ], S.pal, 'oak'),
            glow: [100, 74, 88],
            perch: [52, 52],
        });
    },
};
const WING = 'M0 0C1.5 1 4.5 1.8 7 1.2C6 3.4 2.6 3.8 0.6 2.4Z';
const maple = {
    I: (c) => young1(c, {
        seedColor: kit_1.A0.gift.samara,
        seedD: (0, kit_1.xf)(WING, 92, 168, -0.25, 3.2) + ' ' + (0, kit_1.xf)(WING, 92, 168, Math.PI + 0.35, 3.2, -1),
        seedLine: 'M84 160L98 165M80 172L92 169',
        root: 'M96 168Q95 178 99 188M97 178l-4 3M98 183l4 2',
        stem: 'M96 165Q96 146 100 128',
        leaves: [
            ['narrow', 100, 128, 18, -150],
            ['narrow', 100, 128, 18, -30],
            ['maple', 100, 127, 12, -90],
        ],
        seed: 6,
    }),
    II: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const b = kit_1.A0.bark.maple;
        let tw = '';
        for (const y of [146, 122])
            for (const s of [-1, 1]) {
                tw += `M100 ${y}l${s * 7} -4`;
                set.add((0, kit_1.leaf)('maple', 100 + s * 7, y - 4, 15, (s > 0 ? -30 : -150) * kit_1.D2R, S));
            }
        for (const [x, y, s] of [
            [82, 64, -1],
            [118, 64, 1],
        ])
            for (const a of [-60, -120])
                set.add((0, kit_1.leaf)('maple', x, y, 14, (a + s * 12) * kit_1.D2R, S));
        set.add((0, kit_1.leaf)('maple', 92, 84, 12, -150 * kit_1.D2R, S)).add((0, kit_1.leaf)('maple', 108, 84, 12, -30 * kit_1.D2R, S));
        return {
            body: [(0, kit_1.G)('stem', [(0, kit_1.L)('M100 171L100 96M100 98Q92 86 82 64M100 98Q108 86 118 64', S.wood(b), S.main * 1.5), (0, kit_1.L)(tw + 'M95 88l-3 -4M105 88l3 -4', S.wood(b), S.fine * 1.4)]), (0, kit_1.leavesNode)(S, 'leaves', set, S.pal)],
            perch: [80, 150],
        };
    },
    III: (c) => tree(c, {
        ...base(exports.HABIT.maple),
        pal: c.S.pal,
        seed: 52,
        masses: [(0, kit_1.M)(100, 38, 17, 26, 3), (0, kit_1.M)(84, 64, 20, 21, 2), (0, kit_1.M)(116, 64, 20, 21, 4), (0, kit_1.M)(82, 94, 22, 18, 1), (0, kit_1.M)(118, 94, 22, 18, 5)],
        trunk: [[100, 171], [100, 142], [100, 112], 9, 5],
        limbs: [
            [[100, 118], [90, 106], [82, 94], 4, 1.4],
            [[100, 114], [110, 102], [118, 92], 4, 1.4],
            [[100, 112], [98, 84], [86, 64], 3.6, 1.3],
            [[100, 110], [102, 84], [114, 64], 3.6, 1.3],
            [[100, 108], [101, 70], [100, 40], 3.6, 1.3],
        ],
        extras: () => [
            (0, kit_1.samaras)(c.S, [
                [86, 110],
                [114, 108],
                [94, 80],
            ]),
        ],
        perch: [80, 76],
    }),
    IV: (c) => {
        const { S } = c;
        const masses = [(0, kit_1.M)(38, 90, 26, 15, 1, { flat: 0.7 }), (0, kit_1.M)(162, 90, 26, 15, 5, { flat: 0.7 }), (0, kit_1.M)(64, 60, 30, 19, 2, { flat: 0.75 }), (0, kit_1.M)(136, 60, 30, 19, 4, { flat: 0.75 }), (0, kit_1.M)(100, 44, 32, 21, 3, { flat: 0.8 })];
        return tree(c, {
            ...base(exports.HABIT.maple),
            pal: S.pal,
            seed: 62,
            masses,
            rootD: c.inPot ? null : 'M90 168Q80 171 70 172M110 168Q120 171 130 172',
            trunk: [[100, 171], [100, 152], [100, 132], 20, 14, { furrows: 5 }],
            limbs: [
                [[98, 138], [70, 116], [44, 90], 8, 2.4],
                [[99, 134], [80, 96], [68, 62], 8, 2.4],
                [[101, 134], [120, 96], [132, 62], 8, 2.4],
                [[102, 138], [130, 116], [156, 90], 8, 2.4],
                [[100, 134], [101, 92], [100, 48], 7, 2.2],
            ],
            extras: () => [
                (0, kit_1.samaras)(S, [
                    [28, 102],
                    [46, 104],
                    [58, 76],
                    [76, 74],
                    [124, 74],
                    [142, 76],
                    [154, 104],
                    [172, 102],
                ]),
            ],
            drift: (0, kit_1.drift)(S, [
                [178, 128, 10, 40],
                [24, 140, 9, 150],
            ], S.pal, 'maple'),
            glow: [100, 72, 86],
            perch: [56, 44],
        });
    },
};
function pinnate(S, set, x, y, deg, len, n, ll, droop = 0.25) {
    const a = deg * kit_1.D2R;
    const p0 = [x, y];
    const p1 = [x + Math.cos(a) * len, y + Math.sin(a) * len + len * droop * 0.6];
    const pc = [x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.55 - len * 0.12];
    for (let i = 1; i <= n; i++) {
        const t = 0.18 + (i / n) * 0.78;
        const p = (0, kit_1.qp)(p0, pc, p1, t);
        const ta = (0, kit_1.qa)(p0, pc, p1, t);
        set.add((0, kit_1.leaf)('ovate', p[0], p[1], ll * (0.8 + 0.2 * Math.sin(Math.PI * t)), ta + (i % 2 ? -1 : 1) * 0.9, S, 0.8));
    }
    set.add((0, kit_1.leaf)('ovate', p1[0], p1[1], ll * 0.9, (0, kit_1.qa)(p0, pc, p1, 1), S, 0.8));
    return (0, kit_1.Q)(p0, pc, p1);
}
const narra = {
    I: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const lp = (0, exports.green)(S.pal);
        let veins = '';
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            veins += `M${(0, kit_1.f)(97 + Math.cos(a) * 6)} ${(0, kit_1.f)(160 + Math.sin(a) * 5)}L${(0, kit_1.f)(97 + Math.cos(a) * 14)} ${(0, kit_1.f)(160 + Math.sin(a) * 10)}`;
        }
        set.add((0, kit_1.leaf)('ovate', 101, 126, 13, -160 * kit_1.D2R, S)).add((0, kit_1.leaf)('ovate', 101, 126, 13, -20 * kit_1.D2R, S));
        const rach = pinnate(S, set, 101, 126, -80, 14, 3, 6, 0.1);
        return {
            cutaway: (0, kit_1.cutaway)(S, 64, 136, 171, 188, 7),
            body: [
                (0, kit_1.G)('roots', [(0, kit_1.L)('M98 168Q97 176 100 184M99 177l-4 4M100 181l4 3', S.wood(kit_1.A0.bark.narra), S.fine * 1.5)]),
                (0, kit_1.seedPart)(S, 'M80 166C78 152 92 144 104 148C116 152 116 166 106 171C96 175 82 174 80 166Z ' + (0, kit_1.oval)(97, 160, 6, 4.6), kit_1.A0.seedLight, veins),
                (0, kit_1.G)('sprout', [(0, kit_1.L)('M99 156Q94 140 101 126' + rach, S.lineOf(lp), S.main), (0, kit_1.P)(set.wash(), S.washOf(lp), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(lp), S.main)]),
            ],
            perch: [70, 170],
        };
    },
    II: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const p0 = [100, 171];
        const cc = [93, 112];
        const p1 = [106, 62];
        let r = '';
        for (const [t, a] of [
            [0.3, 200],
            [0.44, -22],
            [0.58, 196],
            [0.72, -28],
            [0.86, 206],
        ]) {
            const p = (0, kit_1.qp)(p0, cc, p1, t);
            r += pinnate(S, set, p[0], p[1], a, 28 + (1 - t) * 14, S.icon ? 2 : 5, 7.5, 0.3);
        }
        r += pinnate(S, set, 120, 50, -10, 18, 3, 6.5, 0.4);
        const husk = 'M76 171C74 163 81 159 88 161C94 163 93 170 89 171Z';
        return {
            body: [
                (0, kit_1.G)('husk', [(0, kit_1.P)(husk, S.woodFill(kit_1.A0.seedLight)), (0, kit_1.L)(husk, S.wood(kit_1.A0.seedLight), S.fine * 1.3)]),
                (0, kit_1.G)('stem', [(0, kit_1.L)('M100 171Q93 112 106 62Q110 52 120 50', S.wood(kit_1.A0.bark.narra), S.main * 1.5)]),
                (0, kit_1.leavesNode)(S, 'leaves', set, S.pal, [(0, kit_1.L)(r, S.lineOf(S.pal), S.fine * 1.2)]),
            ],
            perch: [66, 104],
        };
    },
    III: (c) => tree(c, {
        ...base(exports.HABIT.narra),
        pal: c.S.pal,
        seed: 21,
        masses: [(0, kit_1.M)(44, 86, 26, 13, 1), (0, kit_1.M)(156, 86, 26, 13, 5), (0, kit_1.M)(72, 74, 27, 15, 2), (0, kit_1.M)(128, 74, 27, 15, 4), (0, kit_1.M)(100, 68, 28, 16, 3)],
        trunk: [[100, 171], [100, 142], [100, 112], 11, 6.5],
        limbs: [
            [[100, 116], [70, 104], [42, 90], 5, 1.6],
            [[100, 116], [82, 96], [68, 80], 5, 1.6],
            [[100, 116], [100, 96], [100, 72], 5, 1.6],
            [[100, 116], [118, 96], [132, 80], 5, 1.6],
            [[100, 116], [130, 104], [158, 90], 5, 1.6],
        ],
        extras: () => [
            (0, kit_1.goldSprays)(c.S, [
                [86, 58],
                [112, 56],
                [140, 64],
            ]),
        ],
        perch: [40, 72],
    }),
    IV: (c) => {
        const { S } = c;
        const R = (0, kit_1.rng)(44);
        const set = (0, kit_1.leafSet)();
        let fr = '';
        if (!S.icon) {
            const n = S.small ? 7 : 13;
            for (let i = 0; i < n; i++) {
                const x = 22 + i * (156 / (n - 1));
                const y = 95 + Math.sin((i / (n - 1)) * Math.PI) * 4;
                const l = 10 + R() * 8;
                fr += `M${(0, kit_1.f)(x)} ${(0, kit_1.f)(y)}Q${(0, kit_1.f)(x + 2)} ${(0, kit_1.f)(y + l * 0.6)} ${(0, kit_1.f)(x - 1)} ${(0, kit_1.f)(y + l)}`;
                set.add((0, kit_1.leaf)('ovate', x - 1, y + l, 6, 95 * kit_1.D2R, S, 0.8));
            }
        }
        const bt = c.inPot ? [] : ['M92 140C88 156 76 166 60 171L92 171Z', 'M96 146C95 158 88 166 80 171L96 171Z', 'M108 140C112 156 124 166 142 171L108 171Z', 'M104 148C106 160 112 166 120 171L104 171Z'];
        const masses = [(0, kit_1.M)(30, 84, 26, 13, 1), (0, kit_1.M)(170, 84, 26, 13, 5), (0, kit_1.M)(58, 68, 30, 17, 2), (0, kit_1.M)(142, 68, 30, 17, 4), (0, kit_1.M)(100, 60, 32, 18, 3)];
        let coins = '';
        if (!S.icon)
            for (const [x, y] of [
                [58, 108],
                [140, 104],
                [152, 113],
            ])
                coins += (0, kit_1.disc)(x, y, 3.4);
        const specks = [
            [30, 130],
            [44, 150],
            [150, 136],
            [168, 154],
            [132, 158],
        ];
        const speckD = specks.map(([x, y]) => (0, kit_1.oval)(x, y, 1.6, 1)).join(' ');
        return tree(c, {
            ...base(exports.HABIT.narra),
            pal: S.pal,
            seed: 31,
            masses,
            limbs: [
                [[100, 112], [64, 104], [26, 88], 6.5, 2],
                [[100, 112], [76, 88], [54, 68], 7, 2],
                [[100, 112], [92, 86], [86, 58], 7, 2],
                [[100, 112], [108, 86], [116, 58], 7, 2],
                [[100, 112], [124, 88], [146, 68], 7, 2],
                [[100, 112], [136, 104], [174, 88], 6.5, 2],
            ],
            trunk: [[100, 171], [100, 140], [100, 108], 22, 12, { furrows: 6 }],
            afterTrunk: bt.length
                ? [(0, kit_1.G)('buttress', [(0, kit_1.P)(bt.join(' '), S.woodFill(kit_1.A0.bark.narra)), S.icon ? null : (0, kit_1.L)((0, kit_1.hatchE)(100, 166, 44, 10, 156, 171, 2, 30), S.wood(kit_1.A0.bark.narra), S.hair, { opacity: 0.45 }), (0, kit_1.L)(bt.join(' '), S.wood(kit_1.A0.bark.narra), S.main)])]
                : [],
            extras: () => [
                fr ? (0, kit_1.G)('fringe', [(0, kit_1.L)(fr, S.lineOf(S.pal), S.fine * 1.1), (0, kit_1.P)(set.wash(), S.washOf(S.pal), { opacity: S.washOp }), (0, kit_1.L)(set.line(), S.lineOf(S.pal), S.fine * 1.1)]) : null,
                coins ? (0, kit_1.G)('fruit', [(0, kit_1.L)('M58 101V105M140 97V101M152 106V110', S.wood(kit_1.A0.bark.narra), S.hair * 1.4), (0, kit_1.P)(coins, S.woodFill(kit_1.A0.seedLight)), (0, kit_1.L)(coins, S.wood(kit_1.A0.seedLight), S.fine)]) : null,
                (0, kit_1.goldSprays)(S, [
                    [44, 72],
                    [66, 54],
                    [88, 46],
                    [112, 44],
                    [134, 54],
                    [158, 70],
                    [80, 64],
                    [122, 62],
                    [26, 80],
                    [176, 80],
                    [100, 52],
                ], 1.15),
            ],
            drift: S.full ? [(0, kit_1.P)(speckD, S.goldWash, { opacity: 0.85 }), (0, kit_1.L)(speckD, S.gold, S.hair)] : [],
            glow: [100, 74, 86],
            perch: [36, 70],
        });
    },
};
const cherry = {
    I: (c) => young1(c, {
        seedColor: kit_1.A0.seedLight,
        seedD: (0, kit_1.oval)(96, 163, 8.5, 7.4),
        seedLine: 'M88 162Q96 158 104 164',
        root: 'M98 170Q97 178 100 188M98 178l-4 3M99 183l4 2',
        stem: 'M98 156Q96 142 101 126',
        leaves: [
            ['ovate', 101, 126, 15, -155, 0.75],
            ['ovate', 101, 126, 15, -25, 0.75],
            ['ovate', 101, 126, 7, -90, 0.7],
        ],
        seed: 8,
    }),
    II: (c) => {
        const { S } = c;
        const set = (0, kit_1.leafSet)();
        const lp = (0, exports.green)(S.pal);
        const b = kit_1.A0.bark.cherry;
        let bandD = '';
        for (let y = 160; y > 80; y -= 9)
            bandD += `M98.6 ${y}h2.8`;
        for (const [x, y, s] of [
            [100, 142, -1],
            [101, 124, 1],
            [100, 106, -1],
            [101, 90, 1],
            [101, 76, -1],
        ])
            set.add((0, kit_1.leaf)('ovate', x, y, 15, (-90 + s * 55) * kit_1.D2R, S, 0.7));
        let bd = '';
        for (const [x, y] of [
            [104, 66],
            [96, 70],
            [101, 60],
            [108, 86],
        ])
            bd += (0, kit_1.oval)(x, y, 2.2, 3);
        return {
            body: [
                (0, kit_1.G)('stem', [(0, kit_1.L)('M100 171L100 142L101 124L100 106L101 90L101 70', S.wood(b), S.main * 1.6), S.icon ? null : (0, kit_1.L)(bandD, S.wood(b), S.hair * 1.6)]),
                (0, kit_1.leavesNode)(S, 'leaves', set, lp),
                S.icon ? null : (0, kit_1.G)('blooms', [(0, kit_1.L)('M101 74L104 66M101 74L96 70M101 70L101 60M101 92L108 86', S.wood(b), S.hair * 1.4), (0, kit_1.P)(bd, S.washOf(S.pal), { opacity: 0.9 }), (0, kit_1.L)(bd, S.lineOf(S.pal), S.fine * 1.2)]),
            ],
            perch: [80, 150],
        };
    },
    III: (c) => tree(c, {
        ...base(exports.HABIT['cherry-blossom']),
        pal: c.S.pal,
        seed: 23,
        masses: [(0, kit_1.M)(46, 96, 26, 14, 1), (0, kit_1.M)(154, 96, 26, 14, 5), (0, kit_1.M)(70, 78, 28, 17, 2), (0, kit_1.M)(130, 78, 28, 17, 4), (0, kit_1.M)(100, 70, 28, 17, 3)],
        trunk: [[100, 171], [100, 144], [98, 118], 11, 7, { extra: exports.bands }],
        limbs: [
            [[98, 122], [70, 114], [46, 100], 5, 1.6],
            [[98, 120], [80, 98], [70, 82], 5, 1.6],
            [[98, 120], [98, 96], [100, 74], 5, 1.6],
            [[99, 120], [118, 98], [130, 82], 5, 1.6],
            [[99, 122], [130, 114], [154, 100], 5, 1.6],
        ],
        perch: [44, 80],
    }),
    IV: (c) => {
        const { S } = c;
        const masses = [(0, kit_1.M)(34, 92, 17, 12, 1), (0, kit_1.M)(166, 92, 17, 12, 5), (0, kit_1.M)(62, 70, 21, 15, 2), (0, kit_1.M)(138, 70, 21, 15, 4), (0, kit_1.M)(100, 54, 30, 20, 3)];
        let strands = '';
        const tips = [];
        const R = (0, kit_1.rng)(12);
        if (!S.icon)
            for (const [x0, y0, len] of [
                [22, 98, 50],
                [32, 102, 62],
                [44, 100, 54],
                [52, 80, 70],
                [64, 82, 64],
                [74, 78, 56],
                [86, 70, 48],
                [114, 70, 48],
                [126, 78, 56],
                [136, 82, 64],
                [148, 80, 70],
                [156, 100, 54],
                [168, 102, 62],
                [178, 98, 50],
            ]) {
                const x1 = x0 + (x0 < 100 ? -2 : 2);
                const y1 = Math.min(160, y0 + len);
                strands += `M${x0} ${y0}Q${(0, kit_1.f)(x0 + (x0 < 100 ? 1 : -1))} ${(0, kit_1.f)((y0 + y1) / 2)} ${x1} ${y1}`;
                for (let t = 0.3; t <= 1.01; t += S.small ? 0.35 : 0.22)
                    tips.push([x0 + (x1 - x0) * t + (R() - 0.5) * 2, y0 + (y1 - y0) * t]);
            }
        return tree(c, {
            ...base(exports.HABIT['cherry-blossom']),
            pal: S.pal,
            seed: 33,
            masses,
            rootD: c.inPot ? null : 'M90 168Q82 171 72 172M110 168Q118 171 128 172',
            limbs: [
                [[100, 112], [64, 60], [32, 92], 7, 2],
                [[100, 110], [80, 46], [60, 72], 7, 2],
                [[100, 108], [100, 70], [100, 50], 7, 2],
                [[100, 110], [120, 46], [140, 72], 7, 2],
                [[100, 112], [136, 60], [168, 92], 7, 2],
            ],
            trunk: [[100, 171], [100, 140], [100, 108], 20, 12, { extra: exports.bands, furrows: 0 }],
            extras: () => [strands ? (0, kit_1.G)('fringe', [(0, kit_1.L)(strands, S.wood(kit_1.A0.bark.cherry), S.hair * 1.5)]) : null, (0, kit_1.blossoms)(S, tips, 2.4, S.pal)],
            drift: (0, kit_1.drift)(S, [
                [16, 164, 9, 20],
                [184, 164, 9, 50],
                [150, 166, 8, 10],
            ], S.pal, 'blossom'),
            glow: [100, 84, 84],
            perch: [100, 32],
        });
    },
};
const mango = {
    I: (c) => young1(c, {
        seedColor: kit_1.A0.seedLight,
        seedD: 'M82 166C80 158 88 154 96 155C106 156 110 162 106 168C102 173 86 173 82 166Z',
        seedLine: 'M86 158l3 12M90 156l3 15M95 155l2 16M100 156l1 15M104 158l0 11',
        root: 'M96 170Q95 178 98 188M96 178l-4 3M97 183l4 2',
        stem: 'M97 156Q97 140 100 124',
        leaves: [
            ['long', 100, 124, 22, -140],
            ['long', 100, 124, 22, -40],
            ['long', 100, 124, 18, -90],
        ],
        seed: 9,
    }),
    II: (c) => {
        const { S } = c;
        const old = (0, kit_1.leafSet)();
        const flush = (0, kit_1.leafSet)();
        for (let i = 0; i < 7; i++)
            old.add((0, kit_1.leaf)('long', 100, 112, 26, (-180 + i * 30) * kit_1.D2R + 0.08, S));
        for (let i = 0; i < 5; i++)
            flush.add((0, kit_1.leaf)('long', 100, 64, 22, (55 + i * 17.5) * kit_1.D2R, S));
        flush.add((0, kit_1.leaf)('long', 100, 64, 12, -90 * kit_1.D2R, S));
        return { body: [(0, kit_1.G)('stem', [(0, kit_1.L)('M100 171L100 66', S.wood(kit_1.A0.bark.mango), S.main * 1.6)]), (0, kit_1.leavesNode)(S, 'leaves', old, S.pal), (0, kit_1.leavesNode)(S, 'flush', flush, 'ember')], perch: [72, 112] };
    },
    III: (c) => {
        const { S } = c;
        const masses = [(0, kit_1.M)(68, 98, 24, 18, 1), (0, kit_1.M)(132, 98, 24, 18, 5), (0, kit_1.M)(80, 74, 24, 20, 2), (0, kit_1.M)(120, 74, 24, 20, 4), (0, kit_1.M)(100, 64, 26, 20, 3)];
        let tas = '';
        let dots = '';
        for (const [x, y, h] of [
            [76, 58, 18],
            [96, 46, 22],
            [118, 52, 20],
            [138, 74, 16],
            [60, 80, 15],
        ]) {
            tas += `M${x - 4} ${y}L${x} ${y - h}L${x + 4} ${y}Z`;
            if (S.full)
                for (let i = 0; i < 4; i++)
                    dots += `M${(0, kit_1.f)(x - 2 + (i % 2) * 4)} ${(0, kit_1.f)(y - 3 - i * h * 0.2)}h0.01`;
        }
        return tree(c, {
            ...base(exports.HABIT.mango),
            pal: S.pal,
            seed: 24,
            masses,
            trunk: [[100, 171], [100, 146], [100, 118], 12, 7],
            limbs: [
                [[100, 122], [82, 112], [70, 100], 5, 1.6],
                [[100, 120], [86, 96], [80, 76], 5, 1.6],
                [[100, 118], [100, 92], [100, 66], 5, 1.6],
                [[100, 120], [114, 96], [120, 76], 5, 1.6],
                [[100, 122], [118, 112], [130, 100], 5, 1.6],
            ],
            extras: () => [(0, kit_1.G)('blooms', [(0, kit_1.P)(tas, S.goldWash, { opacity: 0.7 }), (0, kit_1.L)(tas, S.gold, S.fine * 1.2), dots ? (0, kit_1.L)(dots, S.gold, 1.4) : null])],
            perch: [62, 76],
        });
    },
    IV: (c) => {
        const { S } = c;
        const masses = [(0, kit_1.M)(30, 118, 26, 20, 1, { dense: true }), (0, kit_1.M)(170, 118, 26, 20, 5, { dense: true }), (0, kit_1.M)(56, 86, 32, 26, 2, { dense: true }), (0, kit_1.M)(144, 86, 32, 26, 4, { dense: true }), (0, kit_1.M)(100, 66, 40, 30, 3, { dense: true })];
        return tree(c, {
            ...base(exports.HABIT.mango),
            pal: S.pal,
            seed: 34,
            masses,
            dense: true,
            rootD: c.inPot ? null : 'M88 168Q78 171 66 172M112 168Q122 171 134 172',
            limbs: [
                [[100, 146], [62, 140], [34, 124], 9, 3],
                [[100, 144], [74, 116], [58, 92], 9, 3],
                [[100, 142], [100, 104], [100, 70], 9, 3],
                [[100, 144], [126, 116], [142, 92], 9, 3],
                [[100, 146], [138, 140], [166, 124], 9, 3],
            ],
            trunk: [[100, 171], [100, 156], [100, 140], 26, 20, { furrows: 6 }],
            extras: () => [
                mangoes(S, [
                    [24, 134],
                    [44, 134],
                    [66, 108],
                    [86, 92],
                    [114, 92],
                    [134, 108],
                    [156, 134],
                    [176, 134],
                    [100, 94],
                ]),
            ],
            glow: [100, 92, 88],
            perch: [100, 34],
        });
    },
};
exports.TREE_LINES = {
    oak: { pal: 'grove', forms: oak, flavours: (0, exports.flavoursFor)(exports.HABIT.oak) },
    maple: { pal: 'ember', forms: maple, flavours: (0, exports.flavoursFor)(exports.HABIT.maple) },
    narra: { pal: 'spring', forms: narra, flavours: (0, exports.flavoursFor)(exports.HABIT.narra) },
    'cherry-blossom': { pal: 'blossom', forms: cherry, flavours: (0, exports.flavoursFor)(exports.HABIT['cherry-blossom']) },
    mango: { pal: 'evergreen', forms: mango, flavours: (0, exports.flavoursFor)(exports.HABIT.mango) },
};
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
  links["src/engine/domainBand.ts"] = {"./examReady":"src/engine/examReady.ts","./journey":"src/engine/journey.ts"};
  defs["src/engine/domainBand.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YARDSTICK_LINE = exports.AREA_LINE_LABEL = exports.AREAS_CAPTION = exports.STUDY_BAR_LINE = exports.BANDS_LINE = exports.LATEST_TRIES_LABEL = exports.tooFewSpoken = exports.TOO_FEW = exports.STRONG_FROM = exports.STEADY_FROM = exports.BAND_MIN_ANSWERS = void 0;
exports.bandOf = bandOf;
exports.domainFigure = domainFigure;
exports.areaFigure = areaFigure;
const examReady_1 = require("./examReady");
const journey_1 = require("./journey");
exports.BAND_MIN_ANSWERS = 30;
exports.STEADY_FROM = Math.round(journey_1.DOMAIN_TARGET * 100);
exports.STRONG_FROM = examReady_1.READY_LOW;
function bandOf(pct) {
    if (pct >= exports.STRONG_FROM)
        return 'Strong';
    if (pct >= exports.STEADY_FROM)
        return 'Steady';
    return 'Building';
}
function domainFigure(answered, pct) {
    if (answered <= 0)
        return { text: '–', spoken: 'not started', banded: false };
    if (answered < exports.BAND_MIN_ANSWERS)
        return { text: exports.TOO_FEW, spoken: (0, exports.tooFewSpoken)(answered), banded: true };
    return { text: `${pct}%`, spoken: `${pct} percent, latest tries`, banded: false };
}
exports.TOO_FEW = 'Too few yet';
const tooFewSpoken = (answered) => `too few yet, ${answered} answered`;
exports.tooFewSpoken = tooFewSpoken;
exports.LATEST_TRIES_LABEL = 'Percentages count your latest try at each question.';
exports.BANDS_LINE = `Building is under ${exports.STEADY_FROM}, Steady ${exports.STEADY_FROM} to ${exports.STRONG_FROM - 1}, Strong ${exports.STRONG_FROM} and up. A domain is measured from ${exports.BAND_MIN_ANSWERS} answers.`;
exports.STUDY_BAR_LINE = `The tick marks ${examReady_1.READY_LOW}%, this app’s study bar for your low end. Each area has its own ${exports.STEADY_FROM}% line. A study bar, not an exam score.`;
exports.AREAS_CAPTION = 'Right on your latest tries';
exports.AREA_LINE_LABEL = `Area line ${exports.STEADY_FROM}%`;
function areaFigure(answered, pct) {
    if (answered <= 0)
        return { word: 'Not started', pct: null, thin: false, below: false, spoken: 'not started' };
    if (answered < exports.BAND_MIN_ANSWERS)
        return { word: exports.TOO_FEW, pct: null, thin: true, below: false, spoken: (0, exports.tooFewSpoken)(answered) };
    const word = bandOf(pct);
    const below = pct < exports.STEADY_FROM;
    const line = below ? `below the ${exports.STEADY_FROM} line` : `at or above the ${exports.STEADY_FROM} line`;
    return { word, pct, thin: false, below, spoken: `${word}, ${pct} percent on latest tries, ${line}` };
}
exports.YARDSTICK_LINE = `This app’s own yardstick: a low end of ${examReady_1.READY_LOW}% or more, with every domain at ${exports.STEADY_FROM}% or more. It is a study bar for this app, not a promise or a prediction of your exam result.`;
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
  links["src/engine/readinessReport.ts"] = {"./examReady":"src/engine/examReady.ts","./journey":"src/engine/journey.ts","./pace":"src/engine/pace.ts","./readiness":"src/engine/readiness.ts","./srs":"src/engine/srs.ts"};
  defs["src/engine/readinessReport.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATH_NOTE = exports.PATH_REASON = exports.PATH_STEPS = exports.LOW_MIN_DAYS = exports.LOW_DAYS = exports.RAISE_MAX = exports.mockCovers = exports.mockTally = exports.tallySpoken = exports.tallyText = exports.MIXED_NOTE = exports.TREND_WINDOW = exports.LEVEL_POINTS = exports.TREND_MAX = void 0;
exports.mockKind = mockKind;
exports.mockPct = mockPct;
exports.mockTrend = mockTrend;
exports.trendWords = trendWords;
exports.trendSpoken = trendSpoken;
exports.domainBreakdown = domainBreakdown;
exports.readinessLine = readinessLine;
exports.evidenceLine = evidenceLine;
exports.mockLine = mockLine;
exports.domainSpoken = domainSpoken;
exports.raiseLowerBound = raiseLowerBound;
exports.lowSeries = lowSeries;
exports.lowSummary = lowSummary;
exports.lowWords = lowWords;
exports.lowSpoken = lowSpoken;
exports.chartScale = chartScale;
exports.stepLabel = stepLabel;
const examReady_1 = require("./examReady");
const journey_1 = require("./journey");
const pace_1 = require("./pace");
const readiness_1 = require("./readiness");
const srs_1 = require("./srs");
exports.TREND_MAX = 10;
exports.LEVEL_POINTS = 2;
exports.TREND_WINDOW = 3;
function mockKind(total, examQuestions) {
    if (total === examQuestions)
        return 'full';
    if (total === Math.round(examQuestions / 3))
        return 'mini';
    return 'other';
}
function mockPct(m) {
    return m.total > 0 ? Math.round((Math.min(m.correct, m.total) / m.total) * 100) : 0;
}
const newestFirst = (mocks) => [...mocks].sort((a, b) => b.finishedAt - a.finishedAt);
function mockTrend(mocks, examQuestions) {
    return newestFirst(mocks)
        .slice(0, exports.TREND_MAX)
        .reverse()
        .map((m) => ({ id: m.id, at: m.finishedAt, pct: mockPct(m), kind: mockKind(m.total, examQuestions), timed: (0, pace_1.timingOf)(m.timing) !== 'untimed' }));
}
const FALL_NOTE = 'One mock can swing; look at the domains below.';
exports.MIXED_NOTE = 'Mini and full mocks are mixed here; a mini mock swings more.';
function trendWords(points) {
    if (points.length < 2)
        return null;
    const mixed = (window) => window.some((p) => p.kind === 'mini') && window.some((p) => p.kind === 'full') ? ` ${exports.MIXED_NOTE}` : '';
    const last = points[points.length - 1].pct;
    const fall = points[points.length - 2].pct - last;
    if (fall > exports.LEVEL_POINTS)
        return `Down ${fall} points since your last mock. ${FALL_NOTE}${mixed(points.slice(-2))}`;
    const n = Math.min(exports.TREND_WINDOW, points.length);
    const delta = last - points[points.length - n].pct;
    const span = n === 2 ? 'since your last mock' : `over your last ${n} mocks`;
    const note = mixed(points.slice(-n));
    if (delta > exports.LEVEL_POINTS)
        return `Up ${delta} points ${span}.${note}`;
    if (delta < -exports.LEVEL_POINTS)
        return `Down ${-delta} points ${span}. ${FALL_NOTE}${note}`;
    return `About level ${span}.${note}`;
}
function trendSpoken(points) {
    const said = points.map((p) => `${p.pct}${p.kind === 'full' ? ' full' : p.kind === 'mini' ? ' mini' : ''}${p.timed ? '' : ' untimed'}`);
    return `Your last ${points.length} mocks, oldest first, in percent: ${said.join(', ')}.`;
}
const tallyIn = (m, domainId) => (m ? (0, exports.mockTally)(m, domainId) : undefined);
function domainBreakdown(cert, readiness, mocks) {
    const total = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
    const [last, prev] = newestFirst(mocks);
    return cert.domains.map((domain) => {
        var _a, _b;
        const dm = readiness.domains.find((x) => x.domainId === domain.id);
        const answered = (_a = dm === null || dm === void 0 ? void 0 : dm.answered) !== null && _a !== void 0 ? _a : 0;
        const lastMock = tallyIn(last, domain.id);
        const prevMock = tallyIn(prev, domain.id);
        return {
            domain,
            weightPct: Math.round((domain.weight / total) * 100),
            readinessPct: Math.round(((_b = dm === null || dm === void 0 ? void 0 : dm.mastery) !== null && _b !== void 0 ? _b : 0) * 100),
            answered,
            firm: answered >= readiness_1.MIN_SAMPLE,
            ...(lastMock !== undefined ? { lastMock } : {}),
            ...(prevMock !== undefined ? { prevMock } : {}),
        };
    });
}
const tallyPct = (t) => Math.round((Math.min(t.correct, t.total) / t.total) * 100);
const tallyText = (t) => (t ? `${t.correct} of ${t.total} (${tallyPct(t)}%)` : '–');
exports.tallyText = tallyText;
const tallySpoken = (t) => (t ? `${t.correct} of ${t.total}, ${tallyPct(t)} percent` : 'not recorded');
exports.tallySpoken = tallySpoken;
const mockTally = (m, domainId) => {
    var _a;
    const t = (_a = m.byDomain) === null || _a === void 0 ? void 0 : _a[domainId];
    return t && t.total > 0 ? { total: t.total, correct: Math.min(t.correct, t.total) } : null;
};
exports.mockTally = mockTally;
const mockCovers = (r) => Boolean(r.lastMock || r.prevMock);
exports.mockCovers = mockCovers;
function readinessLine(r) {
    return `${r.weightPct}% of the exam · ${r.answered === 0 ? 'not started yet' : `domain readiness ${r.readinessPct}%`}`;
}
function evidenceLine(r) {
    if (r.answered === 0)
        return 'No answers here yet';
    const n = `${r.answered} ${r.answered === 1 ? 'answer' : 'answers'}`;
    return r.firm ? `Based on ${n}` : `Based on ${n}: still firming up`;
}
function mockLine(r) {
    var _a;
    if (!(0, exports.mockCovers)(r))
        return null;
    const last = `Last mock ${(0, exports.tallyText)((_a = r.lastMock) !== null && _a !== void 0 ? _a : null)}`;
    return r.prevMock !== undefined ? `${last} · the one before ${(0, exports.tallyText)(r.prevMock)}` : last;
}
function domainSpoken(r) {
    const mocks = (0, exports.mockCovers)(r) ? ` Last mock ${(0, exports.tallySpoken)(r.lastMock)}.${r.prevMock !== undefined ? ` The one before ${(0, exports.tallySpoken)(r.prevMock)}.` : ''}` : '';
    const n = `${r.answered} ${r.answered === 1 ? 'answer' : 'answers'}`;
    const readiness = r.answered === 0 ? 'Not started yet.' : `Domain readiness ${r.readinessPct} percent, based on ${n}${r.firm ? '' : ', still firming up'}.`;
    return `Domain ${r.domain.id}, ${r.domain.short}, ${r.weightPct} percent of the exam. ${readiness}${mocks}`;
}
exports.RAISE_MAX = 3;
function raiseLowerBound(cert, readiness, range, dueCount) {
    var _a, _b;
    if (!range.enough) {
        const more = range.needed;
        return [{ kind: 'unlock', more, text: `Answer ${more} more ${more === 1 ? 'question' : 'questions'} to see your range`, button: 'Practice a mixed set' }];
    }
    const out = [];
    const short = (id) => { var _a, _b; return (_b = (_a = cert.domains.find((d) => d.id === id)) === null || _a === void 0 ? void 0 : _a.short) !== null && _b !== void 0 ? _b : id; };
    const thin = cert.domains
        .map((d) => { var _a, _b; return ({ id: d.id, answered: (_b = (_a = readiness.domains.find((x) => x.domainId === d.id)) === null || _a === void 0 ? void 0 : _a.answered) !== null && _b !== void 0 ? _b : 0 }); })
        .filter((d) => d.answered < readiness_1.MIN_SAMPLE)
        .reduce((best, d) => (!best || d.answered < best.answered ? d : best), null);
    if (thin) {
        const more = readiness_1.MIN_SAMPLE - thin.answered;
        out.push({ kind: 'answer', domainId: thin.id, more, text: `Answer ${more} more in ${short(thin.id)} to firm up your range`, button: `Practice ${short(thin.id)}` });
    }
    const focusId = readiness.focusDomainId;
    const focus = focusId ? cert.domains.find((d) => d.id === focusId) : undefined;
    const focusMastery = (_b = (_a = readiness.domains.find((x) => x.domainId === focusId)) === null || _a === void 0 ? void 0 : _a.mastery) !== null && _b !== void 0 ? _b : 0;
    if (focus && focus.id !== (thin === null || thin === void 0 ? void 0 : thin.id) && focusMastery < 1) {
        const total = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
        out.push({ kind: 'focus', domainId: focus.id, text: `${focus.short} has the most to gain: ${Math.round((focus.weight / total) * 100)}% of the exam`, button: 'Practice weak spots' });
    }
    if (dueCount > 0) {
        const count = Math.min(dueCount, srs_1.REVIEW_SESSION_CAP);
        out.push({ kind: 'review', count, text: `Clear ${count} ${count === 1 ? 'review' : 'reviews'}: revisiting steadies your range`, button: 'Start review' });
    }
    if (out.length === 0)
        out.push({ kind: 'mix', text: 'Keep a steady mix: reviews first, then your weakest domain.' });
    return out.slice(0, exports.RAISE_MAX);
}
exports.LOW_DAYS = 30;
exports.LOW_MIN_DAYS = 3;
function lowSeries(log, today, days = exports.LOW_DAYS) {
    const sorted = [...(log !== null && log !== void 0 ? log : [])].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    const out = [];
    for (let k = days - 1; k >= 0; k--) {
        const day = (0, examReady_1.shiftDay)(today, k);
        const own = sorted.find((e) => e.day === day);
        if (own) {
            out.push({ day, low: own.last, logged: true });
            continue;
        }
        const before = sorted.filter((e) => e.day < day);
        if (before.length === 0)
            continue;
        out.push({ day, low: before[before.length - 1].last, logged: false });
    }
    return out;
}
function lowSummary(series) {
    var _a, _b, _c, _d;
    const withValue = series.filter((d) => d.low !== null);
    const daysWithData = series.filter((d) => d.logged && d.low !== null).length;
    return {
        values: withValue.map((d) => d.low),
        daysWithData,
        enough: daysWithData >= exports.LOW_MIN_DAYS,
        first: (_b = (_a = withValue[0]) === null || _a === void 0 ? void 0 : _a.low) !== null && _b !== void 0 ? _b : null,
        last: (_d = (_c = withValue[withValue.length - 1]) === null || _c === void 0 ? void 0 : _c.low) !== null && _d !== void 0 ? _d : null,
        span: withValue.length,
    };
}
function lowWords(s) {
    if (!s.enough || s.first === null || s.last === null)
        return null;
    const days = `${s.span} ${s.span === 1 ? 'day' : 'days'}`;
    return s.first === s.last ? `Held at ${s.last}% over ${days}.` : `From ${s.first}% to ${s.last}% over ${days}.`;
}
function lowSpoken(s) {
    if (!s.enough || s.first === null || s.last === null)
        return null;
    const days = `${s.span} ${s.span === 1 ? 'day' : 'days'}`;
    return s.first === s.last
        ? `Your low end held at ${s.last} percent over ${days}.`
        : `Your low end went from ${s.first} to ${s.last} percent over ${days}.`;
}
function chartScale(values, minSpan = 20) {
    if (values.length === 0)
        return { lo: 0, hi: 100 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.min(100, Math.max(minSpan, max - min + 10));
    const lo = Math.max(0, Math.min(100 - span, (min + max) / 2 - span / 2));
    return { lo, hi: lo + span };
}
exports.PATH_STEPS = [
    { stage: 'diagnose', line: 'Your first questions: a short look at where you are.' },
    { stage: 'learn', line: 'Lessons for the domains you need.' },
    { stage: 'practice', line: 'Practice, then revisit what you missed.' },
    { stage: 'mock', line: 'Mocks at exam pace.' },
    { stage: 'ready', line: 'Light review, one mock a week.' },
    { stage: 'examDay', line: 'Rest, a checklist, light review.' },
];
exports.PATH_REASON = {
    diagnose: 'A first look comes before anything else, so the plan knows where to start.',
    learn: 'While the basics are new, lessons come first.',
    practice: 'Until every domain is steady, practice leads.',
    mock: 'Every domain is steady, so mocks build your exam pace.',
    ready: 'Your numbers are steady, so light review keeps them there.',
    examDay: 'The exam is close: rest and light review help more than cramming.',
};
exports.PATH_NOTE = 'The plan moves between these as you go. If a domain slips, practice leads again for a while; mocks and lessons are always one tap away.';
function stepLabel(stage) {
    const i = exports.PATH_STEPS.findIndex((s) => s.stage === stage);
    return i < 0 ? journey_1.STAGE_LABEL[stage] : `Now: ${journey_1.STAGE_LABEL[stage]}`;
}
  };
  links["src/engine/readySigns.ts"] = {"./domainBand":"src/engine/domainBand.ts","./examReady":"src/engine/examReady.ts","./pace":"src/engine/pace.ts"};
  defs["src/engine/readySigns.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISACA_LINE = exports.STUDY_BAR_NOTE = exports.SIGNS_HEADING_DATED = exports.SIGNS_HEADING = exports.SIGN_NOT_YET = exports.SIGN_MET = exports.SIGN_TITLE = exports.MOCKS_NEEDED = void 0;
exports.allMetLine = allMetLine;
exports.domainsMet = domainsMet;
exports.mocksMet = mocksMet;
exports.readySigns = readySigns;
const domainBand_1 = require("./domainBand");
const examReady_1 = require("./examReady");
const pace_1 = require("./pace");
exports.MOCKS_NEEDED = 2;
exports.SIGN_TITLE = {
    low: `Your low end has stayed at ${examReady_1.READY_LOW}% or more for a week`,
    domains: `Every domain at ${domainBand_1.STEADY_FROM}% or more, from ${domainBand_1.BAND_MIN_ANSWERS}+ answers each`,
    mocks: `${exports.MOCKS_NEEDED} mocks, one a full timed mock`,
};
exports.SIGN_MET = 'In place';
exports.SIGN_NOT_YET = 'Not yet';
exports.SIGNS_HEADING = 'Ready to book?';
exports.SIGNS_HEADING_DATED = 'Signs for your exam date';
exports.STUDY_BAR_NOTE = 'This app’s own study bar, not a prediction of your result.';
exports.ISACA_LINE = 'Check isaca.org before you book.';
const COUNT_WORD = { 2: 'Both signs are', 3: 'All three signs are' };
function allMetLine(n) {
    var _a;
    return `${(_a = COUNT_WORD[n]) !== null && _a !== void 0 ? _a : `All ${n} signs are`} in place. This is this app’s own study bar, not a prediction of your result.`;
}
function domainsMet(domains) {
    return domains.length > 0 && domains.every((d) => d.answered >= domainBand_1.BAND_MIN_ANSWERS && d.pct >= domainBand_1.STEADY_FROM);
}
function mocksMet(mocks, examQuestions) {
    return mocks.length >= exports.MOCKS_NEEDED && mocks.some((m) => m.total === examQuestions && (0, pace_1.timingOf)(m.timing) !== 'untimed');
}
function readySigns(input) {
    var _a;
    const signs = [
        { id: 'low', title: exports.SIGN_TITLE.low, met: (0, examReady_1.readyHoldDays)([...((_a = input.readinessLog) !== null && _a !== void 0 ? _a : [])], input.today) >= examReady_1.READY_DAYS },
        { id: 'domains', title: exports.SIGN_TITLE.domains, met: domainsMet(input.domains) },
    ];
    if (input.mockSign !== false)
        signs.push({ id: 'mocks', title: exports.SIGN_TITLE.mocks, met: mocksMet(input.mocks, input.examQuestions) });
    const allMet = signs.every((s) => s.met);
    return { signs, allMet, line: allMet ? allMetLine(signs.length) : exports.STUDY_BAR_NOTE, isacaLine: allMet ? exports.ISACA_LINE : null };
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
exports.fieldInk = exports.plate = exports.fieldMaxScale = exports.fieldType = exports.plantForm = exports.plantLine = exports.plantTheme = exports.plantArt = exports.plantLeaf = exports.badgeGlaze = exports.badgeLeafPip = exports.badgeStruck = exports.badgeMetal = exports.cardInk = exports.badgeEnamel = exports.turnMote = exports.turnTone = exports.motion = exports.LARGE_TEXT = exports.grewLine = exports.statWord = exports.cardType = exports.statUnit = exports.numeralUnit = exports.badgeLetter = exports.optionText = exports.maxScale = exports.stemLong = exports.STEM_LONG_CHARS = exports.type = exports.font = exports.radius = exports.space = exports.domainPalette = exports.raisedShadow = exports.cardShadow = exports.darkCardTopLight = exports.forestHighlight = exports.grainOp = exports.scrimOp = exports.pillarGlyph = exports.kaisip = exports.dark = exports.light = void 0;
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
        medium: { total: 3000, gather: [180, 900], swaps: [380, 300, 240, 200, 180], bloom: 340, nameAt: 2500, inhale: 0.02, motes: 6, moteLife: 1300, glowMax: 0.85, glowR: 0.86, settle: { from: 0.97, duration: 400, dampingRatio: 1 }, halo: false },
        grand: { total: 3600, gather: [200, 1000], swaps: [420, 340, 280, 230, 200, 180, 180], bloom: 360, nameAt: 3100, inhale: 0.025, motes: 8, moteLife: 1500, glowMax: 1, glowR: 1, settle: { from: 0.96, duration: 460, dampingRatio: 0.85 }, halo: true },
        cross: 0.6,
        swapFloor: 180,
        skip: 120,
    },
    rise: 8,
    shift: 16,
    pressScale: 0.98,
    pressOpacity: 0.92,
};
exports.turnTone = {
    light: { sil: '#FFFCF2', glow: '#F6E2A6', glowOps: [0.6, 0.72, 0.9] },
    dark: { sil: '#D8CCA6', glow: '#E9C46A', glowOps: [0.24, 0.29, 0.36] },
};
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
  api["readinessReport"] = load("src/engine/readinessReport.ts");
  api["domainBand"] = load("src/engine/domainBand.ts");
  api["pace"] = load("src/engine/pace.ts");
  api["readySigns"] = load("src/engine/readySigns.ts");
  api.sourceHash = "4c3eea1d5273153a";
  root.KaiSipPlant = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
