/** Presentation selectors only: existing answers and domain evidence, never reconstructed history. */
import type { Certification } from '../content/types';
import { areaFigure } from './domainBand';
import type { Readiness } from './readiness';

/** Count the fixed first set, including an answer still present in its paused session. */
export function firstFiveProgress(ids: readonly string[], answers: Readonly<Record<string, unknown>>, responses: Readonly<Record<string, unknown>> = {}) {
  const total = ids.length;
  const done = ids.filter((id) => Boolean(answers[id]) || Boolean(responses[id])).length;
  return { total, done, left: total - done };
}

/** Same weighted latest-try measure and evidence threshold as the app's existing area figures. */
export function todayDomains(cert: Certification, readiness: Readiness) {
  return cert.domains.map((domain) => {
    const evidence = readiness.domains.find((d) => d.domainId === domain.id);
    const answered = evidence?.answered ?? 0;
    return { domain, answered, figure: areaFigure(answered, Math.round((evidence?.mastery ?? 0) * 100)) };
  });
}
