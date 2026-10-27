# Motion lessons: schema and house rules

`data/lessons/<cert>.json` holds a certification's motion lessons: short
animated explainers built from data, not video. Today there is one file,
`data/lessons/cisa.json`. Only the mobile app reads it (the web app does not
show lessons, and `scripts/build_site.sh` does not publish it).

Before content packs (Phase A, 27 Oct 2026) the lessons lived in
`mobile/src/content/lessons/cisa.ts`. They moved to JSON so a lesson can ship
in a downloadable content pack, like questions and notes. The move changed no
lesson id, scene order, field or value: a test checked the new pack against the
old TypeScript export before the TypeScript data was deleted.

## How it reaches the app

1. You edit `data/lessons/cisa.json`.
2. `npm run content` (inside `mobile/`, also run on `npm install`) checks it with
   `mobile/scripts/lessons-pack.cjs`, drops the author notes, and writes
   `mobile/src/content/generated/cisa/lessons.json`. A problem fails the build.
3. The app reads that file through the pack registry
   (`mobile/src/content/packs/`), via `mobile/src/content/lessons/index.ts`.
4. `npm run check` runs the deeper house rules in
   `mobile/src/__tests__/lessons.test.ts` (sentence case, fair checks, outline
   codes, note links).

`LESSONS_SRC=/path/to/draft.json npm run content` previews a draft locally
(never in CI).

## File

```jsonc
{
  "schema_version": 1,
  "certification": "cisa",
  "description": "...",          // for people; the app never reads it
  "lessons": [ /* Lesson, in course order */ ]
}
```

A missing file, or another `schema_version`, gives an empty lessons pack (the
app keeps working with no lessons). Bump `schema_version` only for a change an
older app cannot read.

## Lesson

Field names match `mobile/src/content/lessons/types.ts` exactly (camelCase),
so the build never renames anything.

| Field | Type | Rule |
|---|---|---|
| `id` | string | Lower-case words and dashes. **Stable forever**: learner progress is keyed on it. Never reuse or rename one |
| `certId` | string | The file's certification (`"cisa"`) |
| `domainId` | string | One of the exam's domain ids (`"1"`..`"5"` for CISA) |
| `order` | integer | Position inside the domain: 1, 2, 3… with no gaps |
| `title` | string | Sentence case |
| `minutes` | number | Above 0 |
| `provenance` | string | Where it came from, e.g. "Original KaiSip content. Not affiliated with or endorsed by ISACA." |
| `references` | string[] | At least one public framework or standard |
| `outlineVersion` | string | The exam outline it was checked against, e.g. "CISA job practice 2024" |
| `lastReviewed` | `YYYY-MM-DD` | When an expert last checked it |
| `topics` | string[] | Optional. Official outline codes it teaches (`"4B1"`). For CISA each must be in `docs/content/CISA_ECO.md` |
| `prepares` | string[] | Optional. Question ids it prepares a learner for (`"d4_082"`). Each must exist in the bank. Used to offer the lesson after a miss |
| `notes` | string[] | Optional. 1–4 study-note subtopic ids it introduces, primary first. Each must exist in the notes pack and belong to one of `topics` |
| `retired` | boolean | Optional. A retired lesson stays in the file (old progress still resolves) but is never offered again. See "Retiring" below |
| `scenes` | Scene[] | Usually 7–11 scenes. The first is a `title`, the last a `check` |
| `_comment` | string | Optional. Author history (why a scene changed, which review). The build drops it |

Any field whose name starts with `_` is an author note, at any depth (a lesson
or a scene). The build drops all of them, so write freely there.

## Scenes

Each scene type has an animated template in `mobile/src/components/lesson.tsx`.
A type not listed here fails the build: a new type needs an app release first.

| `type` | Fields |
|---|---|
| `title` | `kicker`, `title`, `subtitle` |
| `idea` | `heading`, `body`, optional `list` (see below) |
| `analogy` | `heading`, `body` |
| `stack` | `heading`, `layers` [{`label`, `note`}], optional `caption`, optional `unordered: true` (parallel parts, not a ranking) |
| `flow` | `heading`, `steps` [{`label`, `note`}], optional `caption`, optional `layout`: `"steps"` (default) or `"timeline"` |
| `compare` | `heading`, `left` {`title`, `points`[]}, `right` {`title`, `points`[]}, optional `caption` |
| `trap` | `heading`, `trap`, `why` |
| `tip` | `body` |
| `check` | `question`, `options`[], `correctIndex` (0-based), `explanation` |

`idea.list` (mobile 1.43, opt-in): the body split into `lead`, `items`, optional
`plainAnd` and optional `close`, so parallel items draw as a small figure. Joined
back (`ideaListText` in `mobile/src/content/lessons/ideaList.ts`) it must give
`body` word for word. An item may mark where its label ends with `|`.

A `flow` scene can also be a Stepping Stones round: `mobile/src/content/games/cisa/flows.json`
lists the audited flows by lesson id and scene `heading`. Renaming such a heading
drops the round until that file is updated.

## House rules

Checked by `mobile/src/__tests__/lessons.test.ts` and `lessons-pack.cjs` where
possible.

- **Original writing.** Not copied or paraphrased from any review manual, QAE or
  study guide. Topics follow the public CISA job practice areas; facts are
  anchored to the public frameworks in `references`. Before adding a lesson, run
  it past `isaca-concept-reviewer` and `cisa-citation-*`.
- **`id` is stable forever**: learner progress is keyed on it. That is why the
  change lesson keeps `cisa-l-d3-change` even though it now sits in domain 4.
  A new lesson on the same topic needs a NEW id.
- **`order`** is the position inside the domain: 1, 2, 3… with no gaps. Append
  new lessons after the domain's last one, so earlier lessons keep their numbers.
- **Define jargon** the first time a lesson uses it (a learner may open lessons
  in any order), and keep copy in sentence case.
- **"Stem"** (the question's opening scenario) is defined once per domain, in
  that domain's first lesson by `order`. Later lessons just use the word.
- **Checks are parallel** to the `prepares` bank items, never copies (the test
  measures word overlap). Inside a lesson, vary the answer positions, and never
  let the key be the one option that is clearly longest.

## Retiring

Never delete a lesson that has shipped: set `"retired": true` instead. A retired
lesson is left out of the lesson lists, "next lesson" and every queue, but
`findLesson` still resolves it, so a learner's done list and any old link keep
working. Its `id` can never be used again.

## Review batches

The old TypeScript file named its review dates. They are now plain dates in each
lesson's `lastReviewed`; what each batch was:

| Date | Batch |
|---|---|
| 2026-10-06 / 2026-10-07 | First lessons, after review |
| 2026-10-08 | Phase 2 lessons, after concept, teaching and novice reviews |
| 2026-10-20 | Domain 1 gap lessons (plan items L1 + L2), orders 8–13 |
| 2026-10-21 | Plan items L3–L5: Domain 5, Domain 4, and Domains 2–3 lessons |
| 2026-10-26 | Mobile 1.45 B0: concept-expert and curriculum fixes to existing lessons |
| 2026-10-27 | Decision lessons 1–10 (curriculum §4), appended after each domain's last lesson |
