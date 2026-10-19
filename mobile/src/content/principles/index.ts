/**
 * Exam-mindset principles loader: the only code that knows where they come
 * from. Like the notes, the pack is bundled in the app (works offline) and
 * parsed the first time a screen asks for it.
 *
 * Plain English: a certification with no principles file gets an empty pack,
 * and every helper here then says "nothing" (the Learn row hides).
 */
import { generatedPrinciples } from '../generated';
import type { Principle, PrincipleFamily, PrinciplesPack } from './types';

const cache = new Map<string, PrinciplesPack | null>();

/** The cert's principles pack, or null when it has none. */
export function getPrinciples(certId: string): PrinciplesPack | null {
  if (cache.has(certId)) return cache.get(certId) ?? null;
  // `?.`: a test that stands in its own generated module may leave principles out.
  const load = generatedPrinciples?.[certId];
  const pack = load ? load() : null;
  cache.set(certId, pack);
  return pack;
}

/** True when there is at least one principle to read (the Learn row hides otherwise). */
export function hasPrinciples(certId: string): boolean {
  return (getPrinciples(certId)?.principles.length ?? 0) > 0;
}

/** The families in order, each with its principles in order. Families with none are left out. */
export function principleFamilies(certId: string): { family: PrincipleFamily; principles: Principle[] }[] {
  const pack = getPrinciples(certId);
  if (!pack) return [];
  return pack.families
    .map((family) => ({ family, principles: pack.principles.filter((p) => p.family === family.id) }))
    .filter((g) => g.principles.length > 0);
}

/**
 * One principle from any id a link or saved data may hold (schema
 * "Resolving old ids"): its own id, else an old id it replaced
 * (`legacyIds`, e.g. "CONTAIN-FIRST"), else one of its `aliases`.
 * Undefined when nothing matches (the screen says "not found").
 */
export function findPrinciple(certId: string, id: string): Principle | undefined {
  const list = getPrinciples(certId)?.principles ?? [];
  return (
    list.find((p) => p.id === id) ??
    list.find((p) => p.legacyIds.includes(id)) ??
    list.find((p) => p.aliases.includes(id))
  );
}

/** The family a principle belongs to. */
export function familyOf(certId: string, principle: Principle): PrincipleFamily | undefined {
  return getPrinciples(certId)?.families.find((f) => f.id === principle.family);
}

/**
 * The principle that coaches a slip coach pattern ("role", "runner-up"…),
 * from the shared file's `slip_map`. Undefined for "knowledge" (a content
 * gap, not a thinking slip) or when the cert has no principles.
 */
export function principleForSlip(certId: string, pattern: string): Principle | undefined {
  const id = getPrinciples(certId)?.slipMap[pattern];
  return id ? findPrinciple(certId, id) : undefined;
}

/** Test helper: forget cached packs (tests swap the pack in and out). */
export function clearPrinciplesCache(): void {
  cache.clear();
}
