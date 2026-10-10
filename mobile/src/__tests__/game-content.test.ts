/**
 * Build F game content: the reviewed Canopy Call deck (roles.json), the
 * Stepping Stones sequences (sequences.json) and the audited lesson flows
 * (flows.json) load, and every id they point at exists in the app.
 */
import { flowAudit, flowPlays, getRoleDeck, getStepSequences, shortRole, tierForSteps } from '../content/games';
import { findLesson } from '../content/lessons';
import { findNote } from '../content/notes';

const TIERS = ['seedling', 'sapling', 'heartwood'];

describe('Canopy Call deck (roles.json)', () => {
  const deck = getRoleDeck('cisa')!;

  it('loads the reviewed deck: 10 roles and 84 cards with unique ids', () => {
    expect(deck.roles).toHaveLength(10);
    expect(deck.cards).toHaveLength(84);
    expect(new Set(deck.cards.map((c) => c.id)).size).toBe(84);
    expect(new Set(deck.roles.map((r) => r.id)).size).toBe(10);
  });

  it('every card is complete: a known role, a known note, a tier and a why', () => {
    const roles = new Set(deck.roles.map((r) => r.id));
    for (const c of deck.cards) {
      expect(roles.has(c.role)).toBe(true);
      expect(findNote('cisa', c.subtopicId)).toBeDefined();
      expect(TIERS).toContain(c.tier);
      expect(c.decision.length).toBeGreaterThan(10);
      expect(c.why.length).toBeGreaterThan(10);
    }
  });

  it('exclude_chips are known roles and never the key itself', () => {
    const roles = new Set(deck.roles.map((r) => r.id));
    const withExclusions = deck.cards.filter((c) => c.excludeChips.length);
    // r001, r014, r017 and r073 carry the reviewers' exclusions.
    expect(withExclusions.map((c) => c.id).sort()).toEqual(['r001', 'r014', 'r017', 'r073']);
    for (const c of withExclusions) {
      for (const x of c.excludeChips) {
        expect(roles.has(x)).toBe(true);
        expect(x).not.toBe(c.role);
      }
    }
    expect(deck.cards.find((c) => c.id === 'r001')!.excludeChips).toEqual(['board']);
  });

  it('renames the snake_case fields (auditor_move → auditorMove)', () => {
    expect(deck.cards.find((c) => c.id === 'r001')!.auditorMove).toMatch(/CAE drafts the charter/);
    expect(deck.cards.find((c) => c.id === 'r004')!.auditorMove).toBeUndefined();
  });

  it('every tier has enough cards for two 10-card rounds', () => {
    for (const t of TIERS) expect(deck.cards.filter((c) => c.tier === t).length).toBeGreaterThanOrEqual(20);
  });

  it('short role names drop the bracket', () => {
    expect(shortRole('Custodian (IT, data custodian or system administrator)')).toBe('Custodian');
    expect(shortRole('Board of directors')).toBe('Board of directors');
  });

  it('an unknown cert has no deck', () => {
    expect(getRoleDeck('cism')).toBeNull();
  });
});

describe('Stepping Stones (sequences.json + audited lesson flows)', () => {
  const all = getStepSequences('cisa');
  const authored = all.filter((s) => !s.lessonId);
  const flows = all.filter((s) => s.lessonId);

  it('loads the 28 reviewed sequences, each 4–6 steps with a known note', () => {
    expect(authored).toHaveLength(28);
    for (const s of authored) {
      expect(s.steps.length).toBeGreaterThanOrEqual(4);
      expect(s.steps.length).toBeLessThanOrEqual(6);
      expect(findNote('cisa', s.subtopicId!)).toBeDefined();
      expect(TIERS).toContain(s.tier);
      expect(s.caption.length).toBeGreaterThan(0);
      // No duplicate labels inside a process: the order must be checkable.
      expect(new Set(s.steps.map((x) => x.label)).size).toBe(s.steps.length);
    }
  });

  it('adds the lesson flows whose order is strict, as shipped or as corrected since; JML is left out', () => {
    const audit = flowAudit('cisa');
    expect(audit).toHaveLength(19);
    const wanted = audit.filter((f) => f.orderedAsShipped || f.orderedNow).map((f) => f.lessonId);
    expect(flows.map((f) => f.lessonId).sort()).toEqual([...wanted].sort());
    // The six flows corrected in the lessons after the review, each with a note.
    const corrected = audit.filter((f) => f.orderedNow);
    expect(corrected.map((f) => f.lessonId).sort()).toEqual(
      ['cisa-l-d3-release', 'cisa-l-d4-assets', 'cisa-l-d4-bia', 'cisa-l-d4-capacity-sla', 'cisa-l-d5-monitoring', 'cisa-l-d5-pki'],
    );
    for (const f of corrected) {
      expect(f.ordered).toBe(true);
      expect(f.orderedAsShipped).toBe(false);
      expect(f.note).toMatch(/^Corrected in the lesson/);
    }
    expect(flows.some((f) => f.lessonId === 'cisa-l-d5-access')).toBe(false);
    expect(audit.find((f) => f.lessonId === 'cisa-l-d5-access')!.ordered).toBe(false);
  });

  it('every flow that plays resolves to its lesson’s flow scene, with the same steps', () => {
    for (const f of flowAudit('cisa').filter(flowPlays)) {
      const lesson = findLesson(f.lessonId)!;
      const scene = lesson.scenes.find((sc) => sc.type === 'flow' && sc.heading === f.heading);
      expect(scene).toBeDefined();
      const seq = flows.find((x) => x.lessonId === f.lessonId)!;
      expect(seq).toBeDefined();
      if (scene?.type === 'flow') expect(seq.steps).toEqual(scene.steps);
      // A flow is a strict order: at least 4 steps, no repeated label.
      expect(seq.steps.length).toBeGreaterThanOrEqual(4);
      expect(new Set(seq.steps.map((x) => x.label)).size).toBe(seq.steps.length);
    }
  });

  it('every audited flow still matches a flow scene in its lesson (none silently skipped)', () => {
    for (const f of flowAudit('cisa')) {
      const lesson = findLesson(f.lessonId);
      expect(lesson).toBeDefined();
      expect(lesson!.scenes.some((sc) => sc.type === 'flow' && sc.heading === f.heading)).toBe(true);
    }
  });

  it('lesson flows get their tier from their length', () => {
    for (const f of flows) expect(f.tier).toBe(tierForSteps(f.steps.length));
    expect(tierForSteps(4)).toBe('seedling');
    expect(tierForSteps(5)).toBe('sapling');
    expect(tierForSteps(6)).toBe('heartwood');
  });

  it('ids are unique across sequences and flows', () => {
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
  });

  it('an unknown cert has no processes', () => {
    expect(getStepSequences('cism')).toEqual([]);
  });
});
