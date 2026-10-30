/**
 * Key terms (mobile 1.48): the study notes' domain glossaries, as a small
 * bundled file per certification (scripts/terms-pack.cjs writes
 * generated/<cert>/terms.json). Read by the Key term widget's data
 * (lib/widgetData.ts), never by the widget itself.
 */
import { onClearContentCaches, sourceFor } from './packs';

/** One glossary term, its abbreviation (if any), its one-line meaning and the note that teaches it. */
export interface KeyTerm {
  /** "t<domain>_<n>": a plain id (letters, digits and "_"), safe in a widget link. */
  id: string;
  term: string;
  short?: string;
  meaning: string;
  /** A study-notes subtopic id ("4B1.2"), or the domain id when no single note teaches it. */
  note: string;
}

export interface TermsPack {
  certId: string;
  /** Domain id → its terms, in glossary order. */
  domains: Record<string, KeyTerm[]>;
}

const cache = new Map<string, TermsPack | null>();

/** The cert's key terms, or null when its pack has none. */
export function getTerms(certId: string): TermsPack | null {
  if (cache.has(certId)) return cache.get(certId) ?? null;
  const pack = sourceFor(certId).terms?.(certId) ?? null;
  cache.set(certId, pack);
  return pack;
}

/** One domain's terms ([] when there are none). */
export function termsFor(certId: string, domainId: string): KeyTerm[] {
  const d = getTerms(certId)?.domains;
  return d && Object.prototype.hasOwnProperty.call(d, domainId) ? d[domainId] : [];
}

onClearContentCaches(() => cache.clear());
