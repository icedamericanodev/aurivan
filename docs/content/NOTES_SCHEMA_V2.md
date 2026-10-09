# Topic notes: schema v2 and writing rules

`data/cisa_notes.json` holds the study notes behind the web **Topics** tab and the
mobile **Study notes** screen. Version 2 gives every subtopic the same shape, so a
learner always finds the same parts in the same order. `scripts/lint_notes.py`
enforces this file.

## Why v2
The v1 notes had 33 different field orders across 221 subtopics. Their summaries
named the term in their last sentence, one generic "Categories" box did seven
different jobs, and only 9 subtopics had an example. Learners found them messy.
v2 fixes the structure, not just the wording.

## File
```jsonc
{
  "title": "Aurivan CISA Topic Notes",
  "source": "Original Aurivan study notes ... Not affiliated with or endorsed by ISACA.",
  "description": "...",
  "schema_version": 2,
  "domains": [ /* Domain */ ],
  "cross_domain_connections": [ { "connection": "...", "note": "..." } ],
  "exam_strategy_tips": [ "..." ]
}
```

## Domain
| Field | Type | Rule |
|---|---|---|
| `domain_number` | 1–5 | |
| `domain_name` | string | Keep the official name; `DI` in index.html overrides the display copy |
| `exam_weight` | string, e.g. `"18%"` | Must match `DI` (checked by `verify_repo.sh`) |
| `overview` | string | 2–4 sentences, plain English: what this domain is about and why it matters |
| `analogy` | string | One accurate real-life analogy, 40–110 words |
| `parts` | `[{ part: "A", name, topic_ids: [] }]` | The topic map, matching `docs/content/CISA_ECO.md` |
| `topics` | Topic[] | One per outline code, in outline order |
| `key_terminologies` | `{ term: definition }` | 15–30 terms, one line each |

## Topic
| Field | Type | Rule |
|---|---|---|
| `topic_id` | outline code, e.g. `"4B1"` | |
| `topic_name` | string | The outline title |
| `overview` | string | 2–3 sentences: what the topic covers and why it matters |
| `can_do` | string[2–4] | "You should be able to…" statements. Each starts with a verb ("Tell RPO from RTO in a scenario") |
| `subtopics` | Subtopic[] | Ordered from foundation to application: what it is, then how it works, then how to audit it |

## Subtopic (rendered in this order)
| # | Field | Type | Rule |
|---|---|---|---|
| | `id` | `"4B1.2"` | Topic code, then a running number. Keep existing ids; new ones continue the sequence |
| | `name` | string | Title Case, a noun phrase (not a question) |
| | `legacy_ids` | string[] | Keep as is (it carries learners' reviewed ticks over). New subtopics: `[]` |
| | `practice_ids` | string[] | Optional. Bank question ids (`d4_012`) that test this concept; drives the "Practice this concept" button. Same domain only, each question under one subtopic, never shown as a count of the bank. Omit when empty |
| 1 | `definition` | string | **In one line.** 12–30 words, the term first, plain English, jargon glossed |
| 2 | `why_it_matters` | string | 1–2 sentences on the risk or business purpose, at most 45 words |
| 3 | `how_it_works` | string[3–6] | One idea per bullet, parallel grammar, at most 30 words each |
| 4 | `compare` | `{ columns: [], rows: [{ label, cells: [] }] }` | Optional. Use when 2–4 similar ideas get confused. At most 5 rows. Each row has one cell per column |
| 5 | `types` | `[{ term, meaning }]` | Optional. Only for a true taxonomy (one kind of thing, several variants). 2–6 items |
| 6 | `illustration` | unchanged from v1 | Optional. Must be simple, accurate and labeled. Colors use CSS variables |
| 7 | `example` | string | A realistic scenario with named roles, 30–80 words, ending with what the auditor does |
| 8 | `isaca_rule` | string | **How ISACA thinks.** A reusable principle, at most 50 words |
| 9 | `exam_traps` | `[{ trap, why }]` (1–2) | The tempting wrong instinct (at most 25 words) and why it is wrong (at most 40 words) |
| 10 | `key_terms` | `[{ term, definition }]` (2–5) | One line each, at most 25 words. A term appears in `compare`, `types` or `key_terms`, never in more than one |
| 11 | `analogy` | string | Optional. Never inside the definition |
| 12 | `memory_aid` | string | Optional, at most 20 words |

Target length: 180–380 words per subtopic, counting every text field except
`compare`, `types` and the illustration.

## Writing rules
- **Original wording only.** Never copy or closely paraphrase the ISACA Review
  Manual, QAE or other prep material. Public framework names may be explained in
  our own words.
- **Examples must not retell a bank question.** Teach the same rule with a fresh
  scenario (different industry, roles and numbers), so practice questions still test
  reasoning, not recall. `lint_notes.py` warns above 0.25 word overlap.
- **Agree with the reviewed question bank** (`data/originals/d{N}.json`). Grep it
  for the rule you teach.
- **The auditor recommends and reports; management decides and owns the risk.**
- **US English and plain language** (about grade 9). Define every acronym at first
  use in a subtopic.
- **Formatting:** no emoji, no "Precise term:" closing sentences, no "Trap:"
  prefixes (the renderer adds labels).
- **No bank size.** Never mention how many questions the bank has. No pass
  promises.
