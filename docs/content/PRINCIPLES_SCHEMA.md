# Mindset principles: schema and writing rules

`data/mindset/principles.json` holds the exam-mindset principles that KaiSip
teaches: the reasoning patterns CISA questions reward. It is one shared file for
the web app and the mobile app (mobile reads it through its content build).
`scripts/lint_principles.py` enforces this document and runs in
`scripts/verify_repo.sh`.

This is Principles v2. It replaces the inline web `PRINCIPLES_LIB` (15 entries)
and absorbs the eight `exam_strategy_tips` rules in `data/cisa_notes.json`.
The web app reads it for the Principles page, Today's principle and the
principle links in question tips (fetched like `data/cisa_notes.json`;
published by `scripts/build_site.sh`). Wiring it into the mobile app is a
separate step.

## File
```jsonc
{
  "schema_version": 2,
  "title": "KaiSip exam mindset principles",
  "updated": "2026-10-19",          // YYYY-MM-DD of the last content change
  "description": "...",
  "families": [ /* Family */ ],
  "principles": [ /* Principle */ ],
  "slip_map": { /* slip pattern id -> principle id or null */ }
}
```

## Family
Six families, each answering one question a candidate asks under pressure.

| Field | Type | Rule |
|---|---|---|
| `id` | kebab-case string | Stable; never renamed |
| `order` | integer | Display order, 1..n with no gaps |
| `title` | string | Short label, e.g. "Your role" |
| `question` | string | The question the family answers; ends with `?` |

Current families: `role`, `priorities`, `assurance`, `remedies`, `response`,
`reading`. Each must hold at least 2 principles.

## Principle
| Field | Type | Rule |
|---|---|---|
| `id` | kebab-case string | **Stable.** Questions will carry it as `principle_id`, and saved learner data may too. Never rename; retire by mapping in `legacy_ids` of the successor |
| `family` | family id | Must exist in `families` |
| `order` | integer | Order within the family, 1..n with no gaps |
| `title` | string | Plain-language name |
| `rule` | string | One line, **at most 20 words** |
| `why` | string | Why ISACA thinks this way: **2–3 sentences, at most 60 words** |
| `triggers` | string[] | At least 3 stem words or phrases that signal the principle |
| `trap` | `{ move, why_wrong }` | The seductive wrong move and why it loses |
| `example` | `{ scenario, answer }` | An **original** mini-scenario and the right move. **At most 80 words** across both parts |
| `nuance` | string, optional | One accuracy boundary (when the rule bends), at most 40 words |
| `domains` | int[] | Sorted, unique, 1–5. Every practice id and subtopic must sit in one of these domains |
| `subtopics` | string[] | Note subtopic codes (e.g. `1A3.6`) from `data/cisa_notes.json` where the principle is taught or applied. May be empty only for the `reading` family |
| `practice_ids` | string[] | Bank question ids from `data/originals/d{N}.json` that truly exercise the principle. Target 3+, spread across domains. **A question belongs to one principle only**, so the list can seed `principle_id` tagging |
| `slip_pattern` | string or null | The mobile slip coach pattern (`mobile/src/engine/slipCoach.ts`, `PATTERN_COPY`) this principle is the primary remedy for. Each pattern is primary for at most one principle |
| `legacy_ids` | string[] | Old `PRINCIPLES_LIB` ids this principle replaces. Every one of the 15 old ids maps to exactly one principle |
| `aliases` | string[], optional | Other principle-style labels found in question data (`related_concepts`, `_provenance`), so those references resolve too. Unique across the file |

### slip_map
Maps every slip coach pattern to the principle that coaches it, or `null` when
no principle fits (`knowledge` is a content gap, not a thinking slip). It is the
lookup for slip pattern to principle. Its keys must equal the `PATTERN_COPY` keys,
and it must agree with each principle's `slip_pattern`. One principle may coach
several patterns: `answer-from-the-stem` coaches both `misread` (its primary
pattern) and `overconfident`.

### Resolving old ids
To open a principle from any stored id:
1. match `id`;
2. else match `legacy_ids`;
3. else match `aliases`;
4. else show the library with a "principle not found" message.

## Writing rules
- **Original wording only.** Never copy or closely paraphrase the ISACA Review
  Manual, the QAE database or other prep material. Examples must be new
  scenarios, not retellings of a bank question.
- **US English** (the linter rejects common British spellings).
- **Never state the size of the question bank** or count questions (the linter
  rejects patterns like "N questions" and "bank of N").
- No emojis, no ISACA logos, no pass promises, no invented statistics.
- **Accuracy over slogans.** No absolutes the exam itself would mark wrong.
  Where a rule has a real boundary, say it in `nuance`. Known boundaries already
  written in:
  - risk = likelihood × impact together; a BIA measures impact on purpose and
    does not replace the risk assessment;
  - independence is reassessed throughout the engagement, not only at acceptance;
  - continuous monitoring is management's control and continuous auditing is the
    auditor's; the auditor relies on monitoring only after testing it;
  - least privilege is a strong default, with approved, time-limited, monitored
    exceptions;
  - in a live outage, restore service first and do root cause afterward;
  - evidence relevance comes first: for a specific past event, a contemporaneous
    system log beats the auditor's later re-creation;
  - recovery follows BIA priority, but shared dependencies (such as the
    directory) are restored before the applications that need them;
  - MOST LIKELY asks about probability, not severity, and LEAST inverts the test;
  - against a stealthy persistent attacker, scope quietly before visible action.
- Voice matches the tips: name the trap, state the principle, give the cue.
  Plain language first, ISACA term second.

## Picking practice_ids
Read the question, its key and its tips before listing it. The key must turn on
the principle, not merely sit in the same topic. Good signs: the wrong options
are the principle's trap, or the "Final two" tip names the principle's logic.
Prefer a spread across domains. When fewer than 3 exist, the linter warns: that
is a gap to write questions for.

## Legacy mapping (v1 to v2)
| Old `PRINCIPLES_LIB` id | v2 principle |
|---|---|
| AUDIT-INDEPENDENCE-FIRST | `independence-throughout` |
| GOVERNANCE-OVER-MANAGEMENT | `governance-before-technology` |
| RISK-BEFORE-CONTROLS | `risk-sets-priority` |
| IMPACT-BEFORE-LIKELIHOOD | `risk-sets-priority` (corrected: likelihood and impact together) |
| SCOPE-BEFORE-FIELDWORK | `plan-before-testing` |
| METHODOLOGY-RIGOR-FIRST | `plan-before-testing` |
| EVIDENCE-BEFORE-CONCLUSION | `evidence-quality` |
| LEAST-PRIVILEGE-ALWAYS | `least-privilege-and-sod` (no longer an absolute) |
| SEGREGATION-OF-DUTIES-FIRST | `least-privilege-and-sod` |
| CONTINUOUS-MONITORING-OVER-PERIODIC | `proven-not-configured` (monitoring vs auditing corrected, now D1) |
| CONTAIN-FIRST | `people-contain-preserve` |
| REVOCATION-FIRST | `people-contain-preserve` |
| CHAIN-OF-CUSTODY-FIRST | `people-contain-preserve` |
| BUSINESS-CONTINUITY-OVER-RECOVERY | `recover-by-business-priority` |
| BACKUP-IMMUTABILITY-FIRST | `recover-by-business-priority` |

The `exam_strategy_tips` in the notes map to the `reading` family
(`priority-word-decides`, `final-two`, `answer-from-the-stem`) and to
`recommend-dont-implement`, `root-cause-over-symptom`,
`governance-before-technology` and `prevent-before-detect`.

## Lint
```bash
python3 scripts/lint_principles.py            # the shared file
python3 scripts/lint_principles.py draft.json # a draft copy
```
Errors: schema, unique ids, unknown practice ids or subtopic codes, a question
used by two principles, word limits, families with fewer than 2 principles,
domains with fewer than 3, unmapped old ids, slip map drift, bank-size
statements, British spelling, emojis. Warnings: fewer than 3 practice ids, all
practice from one domain, or no subtopics.
