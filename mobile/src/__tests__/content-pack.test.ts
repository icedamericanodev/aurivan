/**
 * Content-pack integrity — the "question and answer tester" in code form.
 * Runs against the REAL generated pack, so a broken question fails CI.
 */
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions, hasContent } from '../content/loader';
import { optionLetters } from '../engine/shuffle';

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
