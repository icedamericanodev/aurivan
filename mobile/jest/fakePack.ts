/**
 * Test helper (content packs): stand in a small pack for an exam that has no
 * content in the app, as a downloaded pack would (Phase C).
 *
 * Since the security review's MEDIUM-1, the app studies an exam only when its
 * content is on the phone (lib/activeCert.ts effectiveCertId). A test that
 * switches to CISM, say, installs a fake CISM pack first: one question per
 * domain, no notes, principles, exam guide, lessons or games.
 */
import { getCertification } from '../src/content/certifications';
import { registerPackSource, type PackSource } from '../src/content/packs';
import type { PackQuestion } from '../src/content/types';

export function fakePack(certId: string, rev = 1): PackSource {
  const domains = (getCertification(certId)?.domains ?? [{ id: '1' }]).map((d) => d.id);
  const question = (domainId: string): PackQuestion => ({
    id: `${certId}_d${domainId}_001`,
    certId,
    domainId,
    subtopic: 'General',
    difficulty: 'application',
    stem: `A ${certId} question?`,
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    correct: 'A',
    explanation: '',
    wrongExplanations: {},
    tips: ['x', 'y', 'z'],
    related: [],
  });
  return {
    name: `fake-${certId}`,
    certIds: () => [certId],
    info: (id) => (id === certId ? { certId, rev, schemaVersion: 1 } : null),
    domainIds: (id) => (id === certId ? domains : []),
    questions: (id, d) => (id === certId && domains.includes(d) ? [question(d)] : null),
    notes: () => null,
    principles: () => null,
    exam: () => null,
    lessons: () => null,
    gameDeck: () => null,
  };
}

/** Install a fake pack for `certId`; returns the function that removes it. */
export const installFakePack = (certId: string): (() => void) => registerPackSource(fakePack(certId));
