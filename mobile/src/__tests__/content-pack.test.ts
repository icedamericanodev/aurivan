/**
 * Content-pack integrity — the "question and answer tester" in code form.
 * Runs against the REAL generated pack, so a broken question fails CI.
 */
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions, hasContent } from '../content/loader';
import { FIRM_DEEP_ANSWERS } from '../engine/milestones';
import { optionLetters } from '../engine/shuffle';
import { marksFor, tookRootShare } from '../lib/milestones';
import { certOutline, questionExists } from '../lib/outline';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

for (const cert of CERTIFICATIONS.filter((c) => c.status === 'available')) {
  describe(`${cert.name} content pack`, () => {
    const questions = getAllQuestions(cert.id);

    it('has content bundled', () => {
      expect(hasContent(cert.id)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('has unique ids', () => {
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    });

    it('every question has a valid answer key, explanations and tips', () => {
      const problems: string[] = [];
      for (const q of questions) {
        const letters = optionLetters(q);
        if (letters.length < 2) problems.push(`${q.id}: <2 options`);
        if (!letters.includes(q.correct)) problems.push(`${q.id}: answer ${q.correct} not an option`);
        if (!cert.domains.some((d) => d.id === q.domainId)) problems.push(`${q.id}: unknown domain`);
        if (q.tips.length < 3) problems.push(`${q.id}: <3 tips`);
        if (!q.explanation.trim()) problems.push(`${q.id}: no explanation`);
        for (const l of letters) {
          if (l !== q.correct && !q.wrongExplanations[l]) problems.push(`${q.id}: no why-wrong for ${l}`);
        }
        // Tokens may only reference options that exist.
        const all = [q.explanation, ...q.tips, ...Object.values(q.wrongExplanations)].join(' ');
        for (const m of all.matchAll(/\{\{([A-D])\}\}/g)) {
          if (!letters.includes(m[1] as never)) problems.push(`${q.id}: token {{${m[1]}}} not an option`);
        }
      }
      expect(problems).toEqual([]);
    });

    it('every domain has enough questions for a full mock', () => {
      for (const d of cert.domains) {
        const n = questions.filter((q) => q.domainId === d.id).length;
        expect(n).toBeGreaterThanOrEqual(Math.ceil((cert.exam.questions * d.weight) / 100));
      }
    });
  });
}

// Mobile 1.11 (badges_game.md §9.4): Firm Footing · 80% needs 40 of a domain's
// answers. Each available cert's bank must hold at least twice that per domain,
// or the tier would be out of reach (it would have to leave that cert's catalogue).
describe('the bank supports every badge tier', () => {
  it('every domain of every available cert has 2 × 40 questions or more', () => {
    for (const cert of CERTIFICATIONS.filter((c) => c.status === 'available' && hasContent(c.id))) {
      const all = getAllQuestions(cert.id);
      for (const d of cert.domains) {
        const n = all.filter((q) => q.domainId === d.id).length;
        expect([cert.id, d.id, n >= 2 * FIRM_DEEP_ANSWERS]).toEqual([cert.id, d.id, true]);
      }
    }
  });
});

// Mobile 1.11: Took Root (a whole study-notes topic, every part mastered) is
// Evergreen core. An exam whose pack has no topic with questions could never
// earn it, so its Evergreen could never complete: the badge leaves that
// exam's catalogue, decided by the pack itself.
describe('Took Root is offered only where the pack can earn it', () => {
  it('in the catalogue exactly when the exam has a study-notes topic with questions', () => {
    for (const cert of CERTIFICATIONS) {
      const has = questionExists(cert.id);
      const topics = certOutline(cert.id).topics.filter((t) => t.subtopics.some((s) => s.questionIds.some(has)));
      const keys = marksFor(cert.id, selectCert(useProgress.getState(), cert.id)).map((m) => m.key);
      expect([cert.id, keys.includes('took-root')]).toEqual([cert.id, topics.length > 0]);
      expect([cert.id, tookRootShare(cert.id, {})]).toEqual([cert.id, topics.length > 0 ? 0 : null]);
    }
  });

  it('every available exam with content offers it (CISA has its study notes)', () => {
    for (const cert of CERTIFICATIONS.filter((c) => c.status === 'available' && hasContent(c.id))) {
      expect([cert.id, tookRootShare(cert.id, {})]).toEqual([cert.id, 0]);
    }
  });
});
