/**
 * CISA motion lessons: kept as a thin name so older imports still work.
 *
 * The lessons themselves are DATA now: edit ../data/lessons/cisa.json
 * (schema and house rules: docs/content/LESSONS_SCHEMA.md), then run
 * `npm run content`. They moved there (content packs, Phase A) so a lesson
 * can ship in a downloadable pack like questions and notes; no id, scene
 * order or field changed.
 *
 * CISA_LESSONS is the pack's own list, in file order, retired lessons
 * included: the same lesson objects content/lessons/index.ts serves. App
 * code should call lessonsFor / findLesson there instead.
 */
import { sourceFor } from '../packs';
import type { Lesson } from './types';

export const CISA_LESSONS: Lesson[] = sourceFor('cisa').lessons('cisa') ?? [];
