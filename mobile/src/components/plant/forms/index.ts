/**
 * The plant forms, by species (mobile 1.50). One entry per species: its four
 * forms (I–IV) and its five Form IV flavours. botanical.ts asks this module
 * for the drawing of a growth; nothing here reads saved data.
 *
 * Growth → drawing (engine/plantForms.ts FORM_OF_GROWTH):
 *   1 Seed    Form I, young: only the seed, its roots, the cutaway and a smaller sprout
 *   2 Sprout  Form I
 *   3 Shoot   Form II
 *   4 Bough   Form III a little smaller, before its flowers and fruit open
 *   5 Crown   Form III
 *   6 Elder   Form IV: the line's own final, or the flavour the learner chose
 */
import type { PlantSpecies } from '../../../engine/plant';
import type { FinalId } from '../../../engine/plantForms';
import { CONIFER_LINES } from './conifers';
import { FLOWER_LINES } from './flowers';
import type { FormCtx, FormKey, FormLine, FormOut } from './kit';
import { TREE_LINES } from './trees';

export const FORM_LINES: Record<PlantSpecies, FormLine> = { ...TREE_LINES, ...CONIFER_LINES, ...FLOWER_LINES };

/** The masters' form for a growth (I = 1–2, II = 3, III = 4–5, IV = 6). */
export const formKeyOf = (growth: number): FormKey => (growth <= 2 ? 'I' : growth === 3 ? 'II' : growth <= 5 ? 'III' : 'IV');

/** One form's parts. `final` matters only at Form IV ('own' = the line's own final). */
export function drawForm(species: PlantSpecies, growth: number, final: FinalId, c: FormCtx): FormOut {
  const line = FORM_LINES[species];
  const key = formKeyOf(growth);
  if (key === 'IV' && final !== 'own') return line.flavours[final](c);
  return line.forms[key](c);
}

export type { FormCtx, FormOut } from './kit';
export { paint } from './kit';
