/** Lesson integrity — every lesson must be well-formed and trustworthy. */
import fs from 'fs';
import path from 'path';
import { CERTIFICATIONS } from '../content/certifications';
import { lessonPreparing, lessonsFor, nextLesson } from '../content/lessons';
import { getAllQuestions } from '../content/loader';

const all = CERTIFICATIONS.flatMap((c) => lessonsFor(c.id));

describe('lessons', () => {
  it('have unique ids', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
  });
  it.each(all.map((l) => [l.id, l] as const))('%s is well-formed', (_id, l) => {
    const cert = CERTIFICATIONS.find((c) => c.id === l.certId)!;
    expect(cert.domains.some((d) => d.id === l.domainId)).toBe(true);
    expect(l.scenes[0].type).toBe('title');
    expect(l.scenes.at(-1)!.type).toBe('check'); // every lesson ends with retrieval
    expect(l.references.length).toBeGreaterThan(0);
    expect(l.provenance).toMatch(/Original/);
    expect(l.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const s of l.scenes) {
      if (s.type === 'check') {
        expect(s.correctIndex).toBeGreaterThanOrEqual(0);
        expect(s.correctIndex).toBeLessThan(s.options.length);
      }
    }
  });
  it('finds the lesson that prepares a bank question', () => {
    expect(lessonPreparing('cisa', 'd4_082')?.id).toBe('cisa-l-d4-rpo-rto');
    expect(lessonPreparing('cisa', 'no_such_id')).toBeUndefined();
  });
  it('are numbered 1, 2, 3… inside each domain', () => {
    // A clean order keeps the Learn list and "Up next" predictable.
    for (const c of CERTIFICATIONS) {
      for (const d of c.domains) {
        const orders = lessonsFor(c.id, d.id).map((l) => l.order);
        expect(orders).toEqual(orders.map((_, i) => i + 1));
      }
    }
  });
  it.each(all.map((l) => [l.id, l] as const))('%s does not put every key at the same position', (_id, l) => {
    // Within one lesson, "always B" would teach a pattern, not the topic.
    // (Across lessons a repeat is fine: there are only 24 orders of four
    // options, and the app shuffles check options at runtime anyway.)
    const keys = l.scenes.flatMap((s) => (s.type === 'check' ? [s.correctIndex] : []));
    if (keys.length >= 2) expect(new Set(keys).size).toBeGreaterThan(1);
  });
  it('next lesson prefers the weakest domain', () => {
    expect(nextLesson('cisa', [], '4')?.domainId).toBe('4');
    expect(nextLesson('cisa', lessonsFor('cisa').map((l) => l.id))).toBeUndefined();
  });
});

/**
 * Sentence case (DESIGN_SYSTEM.md §2): no uppercase labels or shouting in
 * lessons. Allowed: acronyms, and exam keywords (FIRST, BEST…) inside a
 * check question, where they mirror real exam stems.
 */
const ACRONYMS = new Set([
  'APO', 'BAI', 'BIA', 'CIO', 'CISA', 'CISO', 'COBIT', 'CSF', 'DSS', 'EDM', 'HR', 'IA', 'ID', 'IEC', 'IS', 'ISACA', 'ISO', 'IT',
  'ITAF', 'MEA', 'MFA', 'NIST', 'PIN', 'RPO', 'RTO', 'SMS', 'SP',
  // Added with the Phase 2 lessons.
  'CA', 'CRL', 'CUEC', 'DAST', 'DLP', 'DMZ', 'EDR', 'KCI', 'KPI', 'KRI', 'MDM', 'OCSP', 'PKI', 'SAST', 'SIEM', 'SLA', 'SOC',
  'WAF',
  // Added with the expert-reviewed flow fixes: change advisory board.
  'CAB',
]);
const EXAM_KEYWORDS = new Set(['FIRST', 'BEST', 'MOST', 'GREATEST', 'PRIMARY', 'LEAST', 'NOT', 'MAIN']);
const capsWords = (text: string) => (text.match(/\b[A-Z]{2,}\b/g) ?? []).filter((w) => !ACRONYMS.has(w));

describe('lesson copy is sentence case', () => {
  it.each(all.map((l) => [l.id, l] as const))('%s has no uppercase labels', (_id, l) => {
    const loud: string[] = [];
    for (const s of l.scenes) {
      for (const [key, value] of Object.entries(s)) {
        const texts = JSON.stringify(value).match(/"[^"]*"/g) ?? [];
        for (const t of texts) {
          const words = capsWords(t);
          const allowed = s.type === 'check' && key === 'question' ? words.filter((w) => !EXAM_KEYWORDS.has(w)) : words;
          loud.push(...allowed);
        }
      }
    }
    expect(loud).toEqual([]);
  });
});

/**
 * Lesson metadata and check quality (lessons expansion plan §4).
 * - `topics` codes must be real codes from the official outline, parsed from
 *   the `- 1A1 Title` lines of docs/content/CISA_ECO.md.
 * - `prepares` ids must exist in the bundled question bank.
 * - Checks must not teach "always pick B", and options stay short.
 */

const ECO_FILE = path.join(__dirname, '../../../docs/content/CISA_ECO.md');
const ECO_CODES = new Set(
  [...fs.readFileSync(ECO_FILE, 'utf8').matchAll(/^- ([1-5][AB]\d{1,2}) \S/gm)].map((m) => m[1]),
);
const OUTLINE_FILES: Record<string, Set<string>> = { cisa: ECO_CODES };
const MAX_OPTION_WORDS = 12;

describe('lesson metadata', () => {
  it('parses the CISA outline from first topic to last', () => {
    // Guards the parser: if the file format changes, this fails loudly
    // instead of silently accepting no codes.
    expect(ECO_CODES.size).toBeGreaterThanOrEqual(55);
    for (const code of ['1A1', '2B4', '3B4', '4A11', '4B1', '5B6']) expect(ECO_CODES.has(code)).toBe(true);
  });

  it.each(all.map((l) => [l.id, l] as const))('%s topics and prepares are real', (_id, l) => {
    const outline = OUTLINE_FILES[l.certId];
    for (const code of l.topics ?? []) {
      expect(code).toMatch(/^[1-5][AB]\d{1,2}$/);
      // A cert without an outline file yet cannot carry topics.
      expect(outline?.has(code) ? code : `${code} (not in outline)`).toBe(code);
    }
    const bankIds = new Set(getAllQuestions(l.certId).map((q) => q.id));
    for (const id of l.prepares ?? []) {
      expect(bankIds.has(id) ? id : `${id} (not in content pack)`).toBe(id);
    }
  });

  it.each(all.map((l) => [l.id, l] as const))('%s checks are well-balanced', (_id, l) => {
    const checks = l.scenes.filter((s) => s.type === 'check');
    for (const s of checks) {
      expect(s.options.length).toBeGreaterThanOrEqual(2);
      expect(s.options.length).toBeLessThanOrEqual(4); // letters A–D only
      for (const opt of s.options) {
        const words = opt.trim().split(/\s+/).length;
        expect(words > MAX_OPTION_WORDS ? `${opt} (${words} words)` : opt).toBe(opt);
      }
    }
  });
});

/**
 * Check fairness (Phase 2 review rules).
 * - A test-wise learner must not find the key just by picking the longest
 *   option, so the key may not be the single longest by a clear margin.
 * - A lesson check practises the same idea as its `prepares` bank items but
 *   must never be a copy of one. We measure word overlap (Jaccard: shared
 *   words ÷ all distinct words) and keep it under one half.
 */
const LENGTH_MARGIN = 8; // characters
const MAX_OVERLAP = 0.5;
// Small, common words carry no meaning, so they would only inflate overlap.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'that', 'the', 'their', 'this', 'to', 'was', 'which', 'what', 'with', 'should', 'would', 'will',
]);

/** Lowercased set of meaningful words in a piece of text. */
function wordSet(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+(?:[’'][a-z]+)?/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

/** Jaccard similarity: 0 = no shared words, 1 = identical word sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

describe('lesson checks are fair', () => {
  it.each(all.map((l) => [l.id, l] as const))('%s has no key guessable by length', (_id, l) => {
    for (const s of l.scenes) {
      if (s.type !== 'check') continue;
      const key = s.options[s.correctIndex].length;
      const longestOther = Math.max(...s.options.filter((_, i) => i !== s.correctIndex).map((o) => o.length));
      const margin = key - longestOther;
      // Report the question, so a failure says which check to rewrite.
      expect(margin > LENGTH_MARGIN ? `${s.question} (key longer by ${margin})` : 'ok').toBe('ok');
    }
  });

  // Test-wise learners cross out options with extreme words ("only", "always"…).
  // If several wrong options carry one, that trick finds the key, so at most
  // one option per check may use an absolute word.
  it.each(all.map((l) => [l.id, l] as const))('%s has no key guessable by absolute words', (_id, l) => {
    const ABSOLUTE = /\b(always|never|only|every|all|none|nobody|no one)\b/i;
    for (const s of l.scenes) {
      if (s.type !== 'check') continue;
      const flagged = s.options.filter((o) => ABSOLUTE.test(o));
      expect(flagged.length > 1 ? `${s.question} (${flagged.length} options use absolute words)` : 'ok').toBe('ok');
    }
  });

  it.each(all.map((l) => [l.id, l] as const))('%s does not copy a bank question', (_id, l) => {
    const bank = new Map(getAllQuestions(l.certId).map((q) => [q.id, q]));
    for (const s of l.scenes) {
      if (s.type !== 'check') continue;
      const check = wordSet([s.question, ...s.options].join(' '));
      for (const id of l.prepares ?? []) {
        const q = bank.get(id);
        if (!q) continue; // a missing id is reported by the metadata test above
        const item = wordSet([q.stem, ...Object.values(q.options)].join(' '));
        const overlap = jaccard(check, item);
        expect(overlap >= MAX_OVERLAP ? `${id} vs "${s.question}" (${overlap.toFixed(2)})` : 'ok').toBe('ok');
      }
    }
  });
});
