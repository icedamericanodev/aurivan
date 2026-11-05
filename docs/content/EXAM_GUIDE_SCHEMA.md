# Exam guide and final review week: schema and writing rules

Two shared, learner-facing files under `data/exam/`, read later by both the web
app and the mobile app (mobile through its content build), the same way as
`data/mindset/principles.json`:

| File | Screen |
|---|---|
| `data/exam/cisa_exam_guide.json` | "About the CISA exam" (web: Learn → `#exam-guide`; mobile: Learn → Look it up, and Help → Get help) |
| `data/exam/final_review_week.json` | "Final review week" (web: Learn → `#final-week`; mobile: Learn → Look it up, and Today's exam-week card from 8 days out) |

`scripts/lint_exam_guide.py` enforces this document and runs in
`scripts/verify_repo.sh` as a blocking check. The web app reads both (Learn →
"About the CISA exam" at `#exam-guide`, "Final review week" at `#final-week`),
and both are on the `DATA` allowlist in `scripts/build_site.sh`. The mobile app
reads both through its content build (`mobile/scripts/exam-guide-pack.cjs`,
which also fails on unknown note or principle ids, unknown action kinds and
"stem"; see `docs/mobile/ARCHITECTURE.md`).

## Exam guide (`cisa_exam_guide.json`)

```jsonc
{
  "schema_version": 1,
  "certification": "cisa",
  "title": "About the CISA exam",
  "description": "...",
  "last_checked": "2026-10-19",       // YYYY-MM-DD the facts were last checked at the source
  "disclaimer": "...",                // independent of ISACA; ISACA decides; no pass promise
  "check_before_booking": "...",      // the ONE global "check isaca.org before you book — these change" line
  "sections": [ /* Section */ ]
}
```

### Section
| Field | Type | Rule |
|---|---|---|
| `id` | kebab-case string | Stable; the apps deep-link to it |
| `title` | string | At most 8 words |
| `summary` | string | One or two sentences, at most 40 words |
| `items` | string[] | At least 1 bullet, each at most 45 words |
| `steps` | string[], optional | Ordered steps (at least 2), each at most 40 words |
| `domains` | Domain[], only in `domains` | `{ id, name, weight }` for ids `"1"`..`"5"` in order |
| `sources` | `{ label, url }[]` | At least 1. `https` only, hosts `isaca.org`, `psiexams.com` or `psionline.com` (and their subdomains). No duplicates in a section |
| `as_of` | YYYY-MM-DD | When this section's facts were checked; not after `last_checked` |

Required sections, in this order (others may be added between them):
`at-a-glance`, `domains`, `registering-and-fees`, `test-center-or-online`,
`exam-day`, `after-the-exam`, `becoming-certified`.

**Domain weights** in the `domains` section must sum to 100 and match `DI`
(`CERTS.cisa.domains` in `index.html`, the canonical source per CLAUDE.md hard
rule 2) and the CISA block in `mobile/src/content/certifications.ts`. Names are
the official outline names; DI's short display names may differ.

### Facts policy
- Use only facts verified at the source (ISACA's site and PDFs; PSI's own pages
  for remote-exam computer requirements). Drop anything that cannot be verified.
- Where PSI and ISACA differ, note the difference and send the learner to
  ISACA's guide, the check-in specialist and ISACA support. Don't claim which rule wins.
- Cite each source only for facts it currently supports (for example, ISACA's
  costs article still says 365 days, so cite it for fees, never for the eligibility window).
- Where ISACA's own pages disagree, follow the newest official document and
  give the safer advice (for example, keep records for whichever period is longer).
- Every fee and rule is covered by the single `check_before_booking` line; don't
  repeat the warning on each item.
- When facts are re-checked, update `as_of` per section and `last_checked`. The
  linter warns when a section is older than 180 days.

## Final review week (`final_review_week.json`)

```jsonc
{
  "schema_version": 1,
  "certification": "cisa",
  "title": "Final review week",
  "updated": "2026-10-19",
  "intro": "...",                      // at most 50 words
  "how_it_works": ["..."],             // why the plan works: spacing, retrieval, sleep
  "days": [ /* Day x 7 */ ],
  "checklists": { "eve": ["..."], "morning": ["..."] },   // 3-8 items each, at most 30 words
  "cheat_sheet": { /* CheatSheet */ }
}
```

### Day
Exactly seven, counting down: `days_before` 7, 6, ..., 1.

| Field | Type | Rule |
|---|---|---|
| `id` | string | `day-{days_before}` |
| `days_before` | int | 7..1 in order |
| `title` | string | At most 6 words |
| `goal` | string | At most 25 words |
| `tasks` | Task[] | 1-5 tasks |
| `remember` | string | One calm line, at most 25 words |

### Task
| Field | Type | Rule |
|---|---|---|
| `text` | string | Short and actionable, at most 30 words (room to quote the six Mistakes tags) |
| `action` | `{ kind, target? }`, optional | Opens a part of the app (below) |
| `sheet` | string[], optional | Parts of the cheat sheet to show: `"1"`..`"5"`, `"focus"`, `"next_focus"`, `"principles"`, `"priority_words"`, `"routine"`, `"pace"` |

### Action kinds
| `kind` | `target` |
|---|---|
| `note` | Optional. A topic (`1B3`) or subtopic (`1B3.2`) code that exists in `data/cisa_notes.json`. None opens the notes |
| `principles` | Optional. A principle id, a family id from `data/mindset/principles.json`, or `"top_slip"` (the principles for the learner's most common slip, via `slip_map`). None opens the library |
| `practice_domain` | Required. `"1"`..`"5"`, `"focus"` (largest weighted readiness gap) or `"next_focus"` (the next largest) |
| `mock_mini`, `mock_full`, `mistakes` | None |
| `glossary` | Optional. A term to open |

`focus` and `next_focus` come from the learner's readiness (mobile's `focusId`).
With no data yet, an app should fall back to the heaviest-weighted domain the
learner has practiced least. Never show a pass prediction.

### CheatSheet
| Field | Rule |
|---|---|
| `domains` | Ids `"1"`..`"5"` in order. `name` must match the exam guide's domain name. 5-7 `points`, each `{ text, note? }`, text at most 40 words, `note` a code in the same domain |
| `principles` | `{ intro, ids }`. `ids` lists **every** principle id in `data/mindset/principles.json` exactly once; the apps render the principle's `rule` from that file. Never copy principle text here |
| `priority_words` | Exactly FIRST, BEST, MOST, PRIMARY, GREATEST, MOST LIKELY, LEAST, each `{ word, meaning, cue }`; word in capitals, meaning at most 40 words, cue at most 12 |
| `answering_routine` | 4-6 steps `{ title, text }`: read the last line first, find the priority word, role check, eliminate two, final two |
| `pace` | 2-6 lines, at most 30 words each |

The linter warns when a principle family or a domain sheet is not linked from
any day.

### Plan design rules
- **Recall, then check.** Sheet and note tasks ask the learner to answer from
  memory first ("From memory, list three points. Then open the list and
  check."), not to read, reread or skim. Short principle-family reads may stay reads.
- **Timed work:** one full mock on day 7, one timed mini mock on day 4, and no
  timed tests on days 3 to 1. Never a second full mock in the week.
- **Day 6 is capped** at about 90 minutes and starts with the heaviest-weighted domains (CISA: 4 and 5; AAIA: 2, then 1).
- **One pace number.** Tasks, the morning checklist and `pace` give the target pace the app's pace checks use (exam minutes minus a 15-minute review reserve, divided by the questions: 90 seconds for CISA and AAIA). The exam pace may appear only beside it.
- **Missed-day rule:** skip a missed day and carry on; never double up.
- **Slip names quote the mobile Mistakes tags exactly** (`SLIPS` in
  `mobile/src/app/mistakes.tsx`), including "Didn’t know it". "Runner-up" is
  detected by the slip coach, not a tag, so it never appears in a task.
- **Only ask for what the app records.** Mocks record no confidence and keep
  only wrong answers in the journal, so never ask a learner to review "every guess" from a mock.

## App hooks wanted (not content; for the apps that read these files)
- **Flagged mock answers:** a mock answer that was flagged but correct is lost
  after Results. Queue it for review the way "guessing" answers are queued in
  practice (`mobile/src/engine/srs.ts`). *Mobile: not built yet.*
- **`top_slip` with no thinking slip:** when the top tag is "Didn’t know it"
  (`slip_map.knowledge` is `null`), open the note for the most-missed topic
  instead of an empty principles view. *Mobile: built (`lib/finalWeek.ts`).*
- **Cover mode on the cheat sheet:** tap to reveal each must-remember point, so
  the recall-then-check tasks are one tap. *Mobile: built ("Cover the points").*

## Writing rules (both files)
- **Original wording only.** Never copy ISACA's or PSI's text; paraphrase in plain English.
- **US English** (the linter shares the British-spelling list with `lint_principles.py`,
  plus a few extras). Write "test center", "fiber", "practice" (verb).
- **No "stem"** in learner text; say "question".
- **Number style:** words for one to nine when counting things ("four options",
  "two breaks"); digits for 10 and up and for every unit, fee or percentage
  ("4 hours", "6 months", "5 years", "US$75", "12%").
- **Name the role in full** ("the IS auditor") and expand an abbreviation the
  first time it appears in a section (CPE, UAT, IDS), unless a word limit forbids it.
- **Where ISACA and PSI differ,** tell the learner to follow ISACA's guide and the
  check-in specialist and to ask ISACA support if unsure; don't assert which rule wins.
- **No links in learner text.** Links live only in `sources[].url`.
- **Never state the size of KaiSip's question bank.** The only question counts
  allowed are the official exam length (150) and small session sizes (20 or fewer).
- **Never promise a pass** and no invented statistics. Learning-science claims
  (spacing, retrieval, sleep) stay general and are not given numbers.
- Calm tone: no cramming, no "last chance", no red or overdue language.
- Auditor lens in the cheat sheet: who owns what, what comes first, what the
  IS auditor checks. No emojis, no ISACA logos.

## Lint
```bash
python3 scripts/lint_exam_guide.py                    # both shared files
python3 scripts/lint_exam_guide.py draft_guide.json   # a draft (type detected from content)
```
Errors: schema, required sections and order, https and official hosts, dates,
word limits, weights against DI and mobile, unknown or missing principle ids,
unknown note codes, invalid action kinds or targets, day count and order,
priority word set, British spelling, "stem", links in text, bank-size or
question-count statements, pass promises, emojis. Warnings: stale `as_of`,
unlinked principle families or domain sheets.
