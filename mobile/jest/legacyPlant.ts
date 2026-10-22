/**
 * Test helper (mobile 1.40): a plant as it was saved BEFORE 1.40.
 *
 * Plain English: from 1.40 a new plant is written down as botanical
 * (`look.style`). Plants saved earlier have no style, so they keep the
 * storybook art (with its face unless Quiet look is on). The older tests
 * check that storybook behaviour (the face, the wren, the first three
 * keepsakes), so they plant with `legacyPlantNew`: the same plant, without
 * the style field, exactly what an existing learner's save holds.
 */
import { plantNew, type CertPlant } from '../src/engine/plant';

/** The plant without `look.style` (and without an empty `look`). */
export function legacy(p: CertPlant): CertPlant {
  if (p.look?.style === undefined) return p;
  const { style: _style, ...look } = p.look;
  const out: CertPlant = { ...p };
  if (Object.keys(look).length) out.look = look;
  else delete out.look;
  return out;
}

/** plantNew, as an app from before 1.40 planted it (no style: storybook). */
export const legacyPlantNew: typeof plantNew = (...args) => legacy(plantNew(...args));
