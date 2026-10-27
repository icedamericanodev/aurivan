/**
 * Content packs, Phase A (one-time gate): the lessons moved from
 * src/content/lessons/cisa.ts to ../data/lessons/cisa.json. The pack the
 * build writes from the JSON must be EXACTLY the old TypeScript export:
 * same lessons, same ids, same scene order, same fields and values.
 * Run once before the TypeScript data was deleted (then removed, since the
 * thin cisa.ts reads the same JSON and the check would compare it to itself).
 */
import { CISA_LESSONS } from '../content/lessons/cisa';
import { generatedLessons } from '../content/generated';

it('the generated lessons pack deep-equals the old TypeScript lessons', () => {
  const fromJson = generatedLessons.cisa();
  // Strict: a dropped optional field, a changed value or an extra key all fail.
  expect(fromJson).toStrictEqual(CISA_LESSONS);
  expect(fromJson.map((l) => l.id)).toEqual(CISA_LESSONS.map((l) => l.id));
  expect(fromJson.map((l) => l.scenes.map((s) => s.type).join(','))).toEqual(CISA_LESSONS.map((l) => l.scenes.map((s) => s.type).join(',')));
  // No author note reached the app.
  expect(JSON.stringify(fromJson)).not.toContain('"_comment"');
});
