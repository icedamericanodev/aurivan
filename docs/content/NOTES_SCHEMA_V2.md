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
  "title": "KaiSip CISA Topic Notes",
  "source": "Original KaiSip study notes ... Not affiliated with or endorsed by ISACA.",
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
| 8 | `audit_focus` | `{ review: [], evidence: [], recommend, decides? }` | Optional for now. **Auditing it:** the IS auditor’s process view, right after the story and beside the lens. See [audit_focus](#audit_focus-auditing-it) below |
| 9 | `isaca_rule` | string | **The IS auditor’s lens.** A reusable principle, at most 50 words |
| 10 | `exam_traps` | `[{ trap, why }]` (1–2) | The tempting wrong instinct (at most 25 words) and why it is wrong (at most 40 words) |
| 11 | `key_terms` | `[{ term, definition }]` (2–5) | One line each, at most 25 words. A term appears in `compare`, `types` or `key_terms`, never in more than one |
| 12 | `analogy` | string | Optional. Never inside the definition |
| 13 | `memory_aid` | string | Optional, at most 20 words |

Target length: 180–380 words per subtopic, counting every text field except
`compare`, `types`, the illustration and `audit_focus`. `audit_focus` has its own
limit (at most 95 words), so adding it never pushes a note over the 380-word target.

## audit_focus: Auditing it
A short, checklist-style answer to "how would an IS auditor audit this?" It gives
the process lens that many technical notes otherwise leave to the example alone. It
comes after the example (the story first, then the general audit steps) and sits
beside the IS auditor’s lens, so all the auditor material is together.

```jsonc
"audit_focus": {
  "review":   ["Sample keys from the inventory and compare their age with the approved cryptoperiod", "..."],
  "evidence": ["Key inventory from the HSM or key service, with creation and rotation dates", "..."],
  "recommend": "Have the key management team remove excess key rights, enforce cryptoperiods and require dual control.",
  "decides":   "The data owner accepts any residual risk to the protected data"
}
```

| Key | Type | Label | Rule |
|---|---|---|---|
| `review` | string[2–3] | What to review | Audit steps, 4–14 words each, starting with an audit verb such as Compare, Trace, Sample, Inspect, Observe, Reperform, Confirm, Evaluate, Walk or Follow. Name what is examined and, where it helps, what a bad result looks like. Not "Check that …". **Order matters:** if one step must come first, it is `review[0]`. No closing period |
| `evidence` | string[2–3] | Evidence to ask for | 4–14 words each, a noun phrase naming a record, log, report or test result and what it shows. **Strongest first:** evidence the auditor obtains or reperforms, or that a system produces, comes before documents and statements from the auditee. Aim for 3 where the topic has real ones. Don’t repeat a review step as evidence. No closing period |
| `recommend` | string | Typical recommendation | One imperative sentence, 8–24 words, starting with the action verb ("Have the audit manager define rating scales …"). Don’t start with "The IS auditor recommends": the label says it. Name who acts (management or an owner role). The auditor never implements, approves or accepts |
| `decides` | string | Who decides | Optional, but write it on every note where a decision or risk acceptance follows. A phrase of 4–16 words naming who decides or accepts the risk ("Management accepts the residual risk or funds the fix"). Never the auditor. Rendered on its own line, because it is the exam lesson |

The whole field is at most 95 words. Keys: `review`, `evidence` and `recommend` are
required; `decides` is optional; nothing else is allowed.

**How it differs from the fields around it** (the linter warns when an item repeats them):

| Field | Answers | Example for key management |
|---|---|---|
| `how_it_works` | How does the control or technology work? | Keys have a cryptoperiod |
| `example` | What does it look like in one real case? | One story, named roles, ends with the auditor’s action |
| `audit_focus` | What would I examine, what proves it, and who decides? | Sample keys and compare their age with the cryptoperiod; key inventory with rotation dates |
| `isaca_rule` | Which principle do I apply to a new question? | Every key needs a cryptoperiod, even in an HSM |

Rules:
- **Don’t restate.** Don’t turn a `how_it_works` bullet into "Check that …". Name the
  audit procedure (sample, compare, trace, reperform) and the artifact instead. Keep
  `recommend` general: it is the usual recommendation for this subtopic, not a copy
  of the example’s specific one.
- **Say "who decides" once.** `decides` owns that line. Don’t repeat it in the
  example’s last sentence; the `isaca_rule` may state it as a principle.
- **Agree with the bank.** Read the stems and keys of the note’s `practice_ids` first.
  The recommendation and the first review step must match what the keyed answers say.
- **Auditor recommends, management decides.** `recommend` names the owner who acts;
  `decides` names who decides or accepts the risk. Use ISACA terms: "accepts residual
  risk", "data owner", "process owner", "senior management".
- **Notes about the audit function’s own method** (planning, risk ranking, sampling,
  evidence): make clear the audit function is under review. The actor is audit
  management, and the approver is usually the audit committee.
- **Gloss every term** the rest of the note doesn’t define, in a few plain words.
- **Move, don’t duplicate.** When a note gains `audit_focus`, move any audit bullet in
  `how_it_works` into it, so `how_it_works` stays about the mechanism.
- **Leave it out when it doesn’t fit.** Pure reference subtopics (a model or
  framework with no control to test) may skip it. A missing field is a single lint
  warning, never an error. Roll-out order: `docs/content/AUDIT_FOCUS_PLAN.md`.

Renderers: the web and mobile renderers skip unknown fields, so the field is safe in
the data before either shows it. Display: a section headed "Auditing it" after the
example and before the IS auditor’s lens, with the labels "What to review",
"Evidence to ask for", "Typical recommendation" and "Who decides". Mobile’s
`notes-pack.cjs` copies fields one by one, so it drops `audit_focus` until it adds
an `auditFocus` mapping; the reading-time estimate should count it once it renders.

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
  In `audit_focus`, `recommend` names who acts and `decides` names who decides.
- **US English and plain language** (about grade 9). Define every acronym at first
  use in a subtopic.
- **Formatting:** no emoji, no "Precise term:" closing sentences, no "Trap:"
  prefixes (the renderer adds labels).
- **No bank size.** Never mention how many questions the bank has. No pass
  promises.
