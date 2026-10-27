/**
 * Mobile 1.45: the first five decision lessons (curriculum §4–§5), and decision lessons 6–10 after them.
 * - Each covers a cluster of notes, hands off to them (its `notes`, primary first) and lists real
 *   `prepares` items, so "Take the lesson" can follow a miss on them.
 * - Its trap scene names the one principle it applies, word for word, so the lesson leads into the
 *   principle card. After the learner read (1.45 review), one principle per lesson, in the trap only:
 *   the tip stays a short list of cues with no principle sentence. The test takes a list, so a lesson
 *   could name more than one later (at least one is required).
 * - Both lenses: a technical figure and "The IS auditor's lens", where management decides.
 * - The house shape: 10–11 scenes, 3 checks, and each check's explanation says why the runner-up tempts.
 */
import { findLesson, missLessons } from '../content/lessons';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { findPrinciple } from '../content/principles';

const DECISION: { id: string; domainId: string; topics: string[]; notes: string[]; principles: string[] }[] = [
  {
    id: 'cisa-l-d5-no-patch',
    domainId: '5',
    topics: ['5B2'],
    notes: ['5B2.6', '5B2.5'],
    principles: ['compensating-controls-fallback'],
  },
  {
    id: 'cisa-l-d4-resilience',
    domainId: '4',
    topics: ['4B2', '4A10'],
    notes: ['4B2.3', '4B2.1', '4A10.2'],
    principles: ['proven-not-configured'],
  },
  {
    id: 'cisa-l-d5-breach-notification',
    domainId: '5',
    topics: ['5B5'],
    notes: ['5B5.3', '5B5.2'],
    principles: ['management-owns-risk'],
  },
  {
    id: 'cisa-l-d4-invocation',
    domainId: '4',
    topics: ['4B5'],
    notes: ['4B5.3'],
    principles: ['recover-by-business-priority'],
  },
  {
    id: 'cisa-l-d2-who-decides',
    domainId: '2',
    topics: ['2A2'],
    notes: ['2A2.2', '2A2.5'],
    principles: ['escalate-to-decision-owner'],
  },  // Decision lessons 6–10: built to the 1.45 review rules from the start (one decision and one principle each).
  {
    id: 'cisa-l-d5-exceptions',
    domainId: '5',
    topics: ['5A1', '5A5'],
    notes: ['5A1.3', '5A5.2'],
    principles: ['management-owns-risk'],
  },
  {
    id: 'cisa-l-d4-infrastructure',
    domainId: '4',
    topics: ['4A1'],
    notes: ['4A1.1', '4A1.4'],
    principles: ['prevent-before-detect'],
  },
  {
    id: 'cisa-l-d5-unmanaged-devices',
    domainId: '5',
    topics: ['5A9'],
    notes: ['5A9.1', '5A9.4', '5A9.3'],
    principles: ['proven-not-configured'],
  },
  {
    id: 'cisa-l-d2-it-investment',
    domainId: '2',
    topics: ['2B1'],
    notes: ['2B1.3'],
    principles: ['risk-sets-priority'],
  },
  {
    id: 'cisa-l-d4-euc-batch',
    domainId: '4',
    topics: ['4A5', '4A3'],
    notes: ['4A5.2', '4A3.2'],
    principles: ['risk-sets-priority'],
  },
];

describe.each(DECISION.map((d) => [d.id, d] as const))('%s', (id, d) => {
  const lesson = findLesson(id)!;

  it('exists in its domain, with its topics and notes, primary note first', () => {
    expect(lesson).toBeDefined();
    expect(lesson.domainId).toBe(d.domainId);
    expect(lesson.topics).toEqual(d.topics);
    expect(lesson.notes).toEqual(d.notes);
    for (const n of d.notes) expect(findNote('cisa', n)?.id).toBe(n);
  });

  it('prepares real bank items from its own notes, and a miss on each offers this lesson', () => {
    expect(lesson.prepares!.length).toBeGreaterThanOrEqual(3);
    for (const q of lesson.prepares!) {
      expect(findQuestion('cisa', q)?.id).toBe(q);
      const sub = subtopicOfQuestion('cisa', q);
      expect(sub && d.notes.includes(sub) ? q : `${q} (note ${sub})`).toBe(q);
      expect(missLessons('cisa', q, sub).map((l) => l.id)).toContain(id);
    }
  });

  it('names its principle in the trap scene; the tip stays cues only', () => {
    expect(d.principles.length).toBeGreaterThanOrEqual(1);
    const text = lesson.scenes.flatMap((s) => (s.type === 'trap' ? [s.why, s.trap] : [])).join(' ');
    const tip = lesson.scenes.flatMap((s) => (s.type === 'tip' ? [s.body] : [])).join(' ');
    expect(tip).not.toMatch(/the principle/);
    for (const p of d.principles) {
      const title = findPrinciple('cisa', p)?.title;
      expect(title).toBeTruthy();
      expect(text.includes(`“${title}”`) ? p : `${p} (“${title}” not named)`).toBe(p);
    }
    // One principle sentence per lesson, in the trap only (no second principle elsewhere in the lesson).
    expect(JSON.stringify(lesson.scenes).match(/This is the principle/g) ?? []).toHaveLength(d.principles.length);
  });

  it('keeps the tip to a few short cues', () => {
    const tip = lesson.scenes.find((s) => s.type === 'tip');
    const body = tip && tip.type === 'tip' ? tip.body : '';
    expect(body.split(/\s+/).length).toBeLessThanOrEqual(50);
  });

  it('keeps the house shape: 10–11 scenes, a lens where management decides, 3 checks that name the runner-up', () => {
    expect(lesson.scenes.length).toBeGreaterThanOrEqual(10);
    expect(lesson.scenes.length).toBeLessThanOrEqual(11);
    const lens = lesson.scenes.find((s) => s.type === 'idea' && s.heading === 'The IS auditor’s lens');
    expect(lens && lens.type === 'idea' && /management|executive|board/i.test(lens.body)).toBe(true);
    const checks = lesson.scenes.filter((s) => s.type === 'check');
    expect(checks).toHaveLength(3);
    for (const c of checks) if (c.type === 'check') expect(c.explanation).toMatch(/tempting/);
  });

  it('keeps copy learner-safe: no promises, no counts of the bank, no review-manual citations', () => {
    const copy = JSON.stringify(lesson);
    expect(copy).not.toMatch(/\bpass(es|ed|ing)?\b|guarantee|you’re ready|you're ready/i);
    expect(copy).not.toMatch(/review manual|\bCRM\b/i);
    expect(copy).not.toMatch(/\b\d[\d,]* questions\b/i);
  });
});
