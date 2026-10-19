/**
 * Exam-mindset principles: the content pack (data/mindset/principles.json →
 * src/content/generated/<cert>/principles.json → content/principles).
 *
 * Runs against the REAL generated pack, so a bad practice id, a broken slip
 * map or a principle missing a section fails CI, plus small fakes for the
 * builder's own rules (scripts/principles-pack.cjs).
 */
import { CERTIFICATIONS } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { clearPrinciplesCache, findPrinciple, getPrinciples, hasPrinciples, principleFamilies, principleForSlip } from '../content/principles';
import type { PrinciplesPack } from '../content/principles/types';
import { PATTERN_COPY } from '../engine/slipCoach';

// CommonJS on purpose (see the file header), so Jest loads it untransformed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildPrinciplesPack, emptyPack } = require('../../scripts/principles-pack.cjs') as {
  buildPrinciplesPack: (
    raw: unknown,
    certId?: string,
    opts?: { questions?: { id: string; domainId: string }[] },
  ) => { pack: PrinciplesPack; problems: string[]; warnings: string[]; skipped: string | null };
  emptyPack: (certId: string) => PrinciplesPack;
};

beforeEach(() => clearPrinciplesCache());

describe('CISA principles pack (the real file)', () => {
  const pack = getPrinciples('cisa')!;

  it('is bundled, with six families in order and principles in reading order', () => {
    expect(hasPrinciples('cisa')).toBe(true);
    expect(pack.families.map((f) => f.order)).toEqual([1, 2, 3, 4, 5, 6]);
    const groups = principleFamilies('cisa');
    expect(groups.map((g) => g.family.id)).toEqual(pack.families.map((f) => f.id));
    for (const g of groups) {
      // Each family holds at least two principles (schema), ordered 1..n with no gaps.
      expect(g.principles.length).toBeGreaterThanOrEqual(2);
      expect(g.principles.map((p) => p.order)).toEqual(g.principles.map((_, i) => i + 1));
    }
    // The list shows every principle exactly once.
    expect(groups.flatMap((g) => g.principles).length).toBe(pack.principles.length);
    expect(new Set(pack.principles.map((p) => p.id)).size).toBe(pack.principles.length);
  });

  it('every practice id is a real question in one of the principle’s domains', () => {
    const problems: string[] = [];
    for (const p of pack.principles) {
      for (const id of p.practiceIds) {
        const q = findQuestion('cisa', id);
        if (!q) problems.push(`${p.id}: ${id} not in the bank`);
        else if (!p.domains.includes(q.domainId)) problems.push(`${p.id}: ${id} is Domain ${q.domainId}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('a question belongs to one principle only', () => {
    const owner = new Map<string, string>();
    const twice: string[] = [];
    for (const p of pack.principles) for (const id of p.practiceIds) {
      if (owner.has(id)) twice.push(`${id}: ${owner.get(id)} and ${p.id}`);
      owner.set(id, p.id);
    }
    expect(twice).toEqual([]);
  });

  it('every principle has every section its page shows', () => {
    for (const p of pack.principles) {
      expect([p.id, Boolean(p.title && p.rule && p.why && p.trap.move && p.trap.whyWrong && p.example.scenario && p.example.answer)]).toEqual([p.id, true]);
      expect([p.id, p.triggers.length >= 3]).toEqual([p.id, true]);
    }
  });

  it('the slip map covers every slip coach pattern, and agrees with each principle', () => {
    expect(Object.keys(pack.slipMap).sort()).toEqual(Object.keys(PATTERN_COPY).sort());
    for (const pattern of Object.keys(PATTERN_COPY)) {
      const target = pack.slipMap[pattern];
      if (target === null) {
        expect(principleForSlip('cisa', pattern)).toBeUndefined();
      } else {
        expect(principleForSlip('cisa', pattern)?.id).toBe(target);
      }
    }
    // A principle's own slip_pattern points back at it.
    for (const p of pack.principles.filter((x) => x.slipPattern)) expect(pack.slipMap[p.slipPattern!]).toBe(p.id);
    // "Didn't know it" is a content gap: no principle.
    expect(principleForSlip('cisa', 'knowledge')).toBeUndefined();
    expect(principleForSlip('cisa', 'role')?.id).toBe('recommend-dont-implement');
  });

  it('old ids and aliases open the right principle (schema "Resolving old ids")', () => {
    const legacy: Record<string, string> = {
      'AUDIT-INDEPENDENCE-FIRST': 'independence-throughout',
      'GOVERNANCE-OVER-MANAGEMENT': 'governance-before-technology',
      'RISK-BEFORE-CONTROLS': 'risk-sets-priority',
      'IMPACT-BEFORE-LIKELIHOOD': 'risk-sets-priority',
      'SCOPE-BEFORE-FIELDWORK': 'plan-before-testing',
      'METHODOLOGY-RIGOR-FIRST': 'plan-before-testing',
      'EVIDENCE-BEFORE-CONCLUSION': 'evidence-quality',
      'LEAST-PRIVILEGE-ALWAYS': 'least-privilege-and-sod',
      'SEGREGATION-OF-DUTIES-FIRST': 'least-privilege-and-sod',
      'CONTINUOUS-MONITORING-OVER-PERIODIC': 'proven-not-configured',
      'CONTAIN-FIRST': 'people-contain-preserve',
      'REVOCATION-FIRST': 'people-contain-preserve',
      'CHAIN-OF-CUSTODY-FIRST': 'people-contain-preserve',
      'BUSINESS-CONTINUITY-OVER-RECOVERY': 'recover-by-business-priority',
      'BACKUP-IMMUTABILITY-FIRST': 'recover-by-business-priority',
    };
    for (const [old, now] of Object.entries(legacy)) expect([old, findPrinciple('cisa', old)?.id]).toEqual([old, now]);
    for (const p of pack.principles) {
      expect(findPrinciple('cisa', p.id)?.id).toBe(p.id);
      for (const a of p.aliases) expect(findPrinciple('cisa', a)?.id).toBe(p.id);
    }
    expect(findPrinciple('cisa', 'no-such-principle')).toBeUndefined();
  });

  it('no learner-facing text says "stem" (the app says "question")', () => {
    const words = [
      ...pack.families.flatMap((f) => [f.title, f.question]),
      ...pack.principles.flatMap((p) => [p.title, p.rule, p.why, ...p.triggers, p.trap.move, p.trap.whyWrong, p.example.scenario, p.example.answer, p.nuance ?? '']),
    ];
    expect(words.filter((w) => /\bstem\b/i.test(w))).toEqual([]);
  });

  it('stays small (well under the per-cert content budget)', () => {
    expect(JSON.stringify(pack).length).toBeLessThan(100_000);
  });
});

describe('certs without principles', () => {
  it('have none, and every helper says so calmly', () => {
    for (const cert of CERTIFICATIONS.filter((c) => c.id !== 'cisa')) {
      expect(hasPrinciples(cert.id)).toBe(false);
      expect(principleFamilies(cert.id)).toEqual([]);
      expect(findPrinciple(cert.id, 'recommend-dont-implement')).toBeUndefined();
      expect(principleForSlip(cert.id, 'role')).toBeUndefined();
    }
  });
});

describe('buildPrinciplesPack (scripts/principles-pack.cjs)', () => {
  const principle = (over: Record<string, unknown> = {}) => ({
    id: 'p-one',
    family: 'role',
    order: 1,
    title: 'One',
    rule: 'A rule.',
    why: 'Because.',
    triggers: ['a', 'b', 'c'],
    trap: { move: 'Do it yourself.', why_wrong: 'Wrong role.' },
    example: { scenario: 'Something happens.', answer: 'Report it.' },
    domains: [1],
    subtopics: [],
    practice_ids: ['d1_001'],
    slip_pattern: 'role',
    legacy_ids: [],
    aliases: [],
    ...over,
  });
  const file = (principles: unknown[], slip_map: Record<string, string | null> = { role: 'p-one' }) => ({
    schema_version: 2,
    families: [{ id: 'role', order: 1, title: 'Your role', question: 'Who am I?' }],
    principles,
    slip_map,
  });
  const questions = [
    { id: 'd1_001', domainId: '1' },
    { id: 'd2_001', domainId: '2' },
  ];

  it('a missing file or another schema version gives an empty pack, never a failure', () => {
    for (const raw of [null, { schema_version: 1, principles: [] }]) {
      const out = buildPrinciplesPack(raw, 'cisa', { questions });
      expect(out.pack).toEqual(emptyPack('cisa'));
      expect(out.problems).toEqual([]);
      expect(out.skipped).toBeTruthy();
    }
  });

  it('renames to camelCase and keeps nuance only when there is one', () => {
    const { pack, problems } = buildPrinciplesPack(file([principle(), principle({ id: 'p-two', order: 2, nuance: 'When it bends.', slip_pattern: null })]), 'cisa', { questions });
    expect(problems).toEqual([]);
    expect(pack.principles[0]).toMatchObject({ id: 'p-one', practiceIds: ['d1_001'], trap: { whyWrong: 'Wrong role.' }, domains: ['1'], slipPattern: 'role' });
    expect('nuance' in pack.principles[0]).toBe(false);
    expect(pack.principles[1].nuance).toBe('When it bends.');
    expect(pack.slipMap).toEqual({ role: 'p-one' });
  });

  it('an unknown or other-domain practice id, an unknown family or a broken slip map fails the build', () => {
    const bad = buildPrinciplesPack(
      file([principle({ practice_ids: ['d1_001', 'd9_999', 'd2_001'] }), principle({ id: 'p-x', family: 'nowhere' })], { role: 'p-missing' }),
      'cisa',
      { questions },
    );
    expect(bad.problems.join('\n')).toMatch(/d9_999, which is not in the question bank/);
    expect(bad.problems.join('\n')).toMatch(/d2_001 \(Domain 2\), outside its domains 1/);
    expect(bad.problems.join('\n')).toMatch(/unknown family "nowhere"/);
    expect(bad.problems.join('\n')).toMatch(/slip_map "role" points at an unknown principle/);
    // The bad ids never reach the app.
    expect(bad.pack.principles[0].practiceIds).toEqual(['d1_001']);
  });

  it('"stem" in any learner-facing text fails the build (ids may say it)', () => {
    const raw = file([principle({ id: 'answer-from-the-stem', title: 'Answer from the stem', triggers: ['a', 'the stem asks', 'c'] })], { role: 'answer-from-the-stem' });
    raw.families[0].question = 'What does the stem ask?';
    const { problems } = buildPrinciplesPack(raw, 'cisa', { questions });
    expect(problems).toEqual([
      'family "role" says "stem" in question: learners read "question"',
      'principle "answer-from-the-stem" says "stem" in title: learners read "question"',
      'principle "answer-from-the-stem" says "stem" in triggers: learners read "question"',
    ]);
  });

  it('a principle missing a section the page shows fails the build', () => {
    const { problems } = buildPrinciplesPack(file([principle({ trap: { move: 'x' } })]), 'cisa', { questions });
    expect(problems).toEqual(['principle "p-one" has no trap.why_wrong']);
  });
});
