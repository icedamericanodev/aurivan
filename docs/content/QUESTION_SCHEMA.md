# Question schema (`data/originals/d{N}.json`)

The question bank's source of truth is `data/originals/d{1..5}.json`. Tips live
inline in each question. `scripts/originals_to_domain.py` turns these files into
the served `data/domain{N}.json` files, which are generated and never edited by
hand.

`scripts/validate_originals.py` enforces this schema (it runs inside
`scripts/verify_repo.sh`). If this page and the validator disagree, the
validator wins: fix this page. The writing rules for the fields (word limits,
tip order, option parity) are in `docs/content/EXAM_STYLE_V2.md` and are checked
by `scripts/lint_exam_style_v2.py`.

Moved here on 26 Oct 2026 from the retired relaunch checklist
(`archive/RELAUNCH_CHECKLIST.md`).

## File shape

```json
{
  "_meta": { "comment": "...", "schema_version": 1 },
  "domain": 4,
  "domain_name": "Information Systems Operations and Business Resilience",
  "weight": 26,
  "questions": [ { ... }, { ... } ]
}
```

- `domain`: the domain number, 1 to 5. The file name must match (`d4.json` holds domain 4).
- `domain_name`, `weight`: informational. `DI` in `index.html` is the canonical
  source for domain names and weights.
- `questions`: a list. An empty list is valid.
- `originals_to_domain.py` drops `_meta` and `domain_name`, adds `title` and
  `count`, and copies every question through unchanged.

## Question fields

### Required

| Field | Type | Rule (validator) |
|---|---|---|
| `id` | string | `d{N}_NNN`: the file's domain number and a 3-digit sequence, e.g. `d4_006` |
| `domain` | number | Must equal the file's domain |
| `subtopic` | string | Free text, e.g. `"Operational Logs. Privileged Activity Logging"`. Reuse a label from `data/originals/_bank_index.md` before inventing one |
| `difficulty` | string | `foundational`, `application` or `analysis` |
| `bloom_level` | string | `Foundational`, `Application` or `Analysis` (matches `difficulty`) |
| `question` | string | The stem |
| `options` | object | Exactly the keys `A`, `B`, `C`, `D`; each a non-empty string |
| `correct` | string | One of `A`, `B`, `C`, `D` |
| `key_concept` | string | At least 20 characters: the general principle tested |
| `pre_read` | string | At least 30 characters: a reading habit, not a reveal of the answer |
| `correct_explanation` | string | Why the key wins. Analysis-tier items that are not `style_version: 2` need 60+ words |
| `wrong_explanations` | object | Exactly the three letters that are not `correct`, one explanation each |
| `tips` | list | 3 or 4 non-empty strings (exam-style v2 items use exactly 3: `Eliminate:`, `Final two:`, `Exam cue:`) |
| `framework_ref` | string | Public framework citation(s). `scripts/lint_originals.py` checks them against `data/originals/_framework_library.md` |
| `_provenance` | string | Must start with `Authored from concept:`. The authoring paper trail |

### Optional

| Field | Type | Rule |
|---|---|---|
| `principle_id` | string | The id of one principle in `data/mindset/principles.json` (see `docs/content/PRINCIPLE_TAGGING.md`). An unknown id is an error; a missing one is only a warning |
| `related_concepts` | list of strings | Linked concepts shown to the learner |
| `scenario_context` | string | Longer setup text. Exam-style v2 removes it (fold the fact into the stem); no current question uses it |
| `style_version` | number | `2` for exam-style v2 items (every current question). Not checked by the validator; `lint_exam_style_v2.py` reads it |

## Example

```json
{
  "id": "d4_006",
  "domain": 4,
  "subtopic": "Operational Logs. Privileged Activity Logging",
  "difficulty": "application",
  "bloom_level": "Application",
  "question": "An IS auditor finds Linux servers log user sign-ins but not the commands run with administrator privileges. What should the auditor recommend as MOST important?",
  "options": {
    "A": "Log privileged commands with the individual user who ran them",
    "B": "Increase retention of the existing sign-in logs to two years",
    "C": "Require administrators to sign in from a dedicated network segment",
    "D": "Alert the security team whenever an administrator signs in"
  },
  "correct": "A",
  "key_concept": "Logging must capture privileged actions tied to individual users, not only authentication events, to provide accountability.",
  "pre_read": "Notice what the logs record and what they miss. Ask what an investigator would need after a harmful change.",
  "correct_explanation": "Sign-in records show who accessed a server, not what they did there. ...",
  "wrong_explanations": {
    "B": "Keeping sign-in logs longer preserves the same gap; they never recorded what administrators did.",
    "C": "A dedicated segment restricts where administrators connect from, not what they do once signed in.",
    "D": "Sign-in alerts flag access but cannot show which privileged commands were run."
  },
  "tips": [
    "Eliminate: B extends logs that miss the actions, and C limits access paths without recording activity.",
    "Final two: A beats D because command logging shows what administrators did; sign-in alerts only show that they arrived.",
    "Exam cue: accountability needs logs of privileged actions tied to an individual, not just logs of sign-ins."
  ],
  "framework_ref": "NIST SP 800-53 Rev 5 AU-2 (Event Logging); ISO/IEC 27002:2022 Control 8.15 (Logging)",
  "related_concepts": ["Privileged activity", "Audit trail content", "Accountability"],
  "_provenance": "Authored from concept: '...'. Public sources: ISACA, NIST. Exam-style v2 rewrite (Oct 2026): ...",
  "style_version": 2
}
```

## Where the fields go

- **Web app:** `data/domain{N}.json` carries every field, including
  `_provenance`. The app ignores the fields it does not show.
- **Mobile app:** `mobile/scripts/build-content.mjs` builds the content pack
  and drops author-only fields such as `_provenance`.

## Editing workflow

1. Edit the question (tips included) in `data/originals/d{N}.json`.
2. `python3 scripts/originals_to_domain.py` (or pass the domain number, e.g. `4`).
3. `bash scripts/verify_repo.sh`, plus `python3 scripts/lint_exam_style_v2.py N`
   and, after touching `data/`, `(cd mobile && npm run check)`.
4. Commit `data/originals/d{N}.json` and `data/domain{N}.json` together.
