/**
 * The exam the app actually studies (security review MEDIUM-1, content packs).
 *
 * Plain English: Settings stores the learner's chosen exam (`activeCertId`).
 * A restore or a sync can bring a choice from another phone, for an exam
 * whose content is NOT on this phone (a pack downloaded there, not here). The
 * stored value is kept as it is (that phone may still want it), but every
 * screen and helper studies `effectiveCertId(...)`: the chosen exam when this
 * app knows it and has its content, otherwise the default exam (CISA).
 */
import { DEFAULT_CERT_ID, getCertification } from '../content/certifications';
import { hasContent } from '../content/loader';
import { useSettings } from '../store/settings';

/** The chosen exam when it is known and its content is on this phone, else the default exam. */
export function effectiveCertId(id: string): string {
  return getCertification(id) && hasContent(id) ? id : DEFAULT_CERT_ID;
}

/** The exam being studied now, live (effectiveCertId of the stored choice). */
export const useActiveCertId = (): string => useSettings((s) => effectiveCertId(s.activeCertId));

/** The same, read once outside React. */
export const activeCertIdNow = (): string => effectiveCertId(useSettings.getState().activeCertId);
