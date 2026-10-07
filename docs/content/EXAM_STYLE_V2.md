# Exam style v2 — short, ISACA-style questions

**Status:** approved by the maintainer on 2026-10-06 after a 10-question
Domain 1 pilot. The blind tester scored 10/10 and the Domain 1 auditor
signed off.

**Why:** learners said our questions were too long. Real CISA items are one
or two sentences with a priority word (BEST, MOST, FIRST…). Topic knowledge
rules out two of the four options. The last two both look right, and the
ISACA mindset picks one.

## The item

| Field | Rule |
|---|---|
| `question` | ≤ 35 words, at most 2 sentences (harness-checked), ends with `?`, contains a CAPITALISED priority word. Names who acts (IS auditor, audit firm, management…). Keeps at least one concrete fact the candidate must weigh. |
| `scenario_context` | **Removed.** Fold the one fact that matters into the stem. |
| `options` A–D | ≤ 12 words each, grammatically parallel, each a **full plain statement** a learner can read aloud: no "+" lists, arrows or a/b/c shorthand (harness-checked). By words, the key is never uniquely the longest, and its length is 0.67–1.5× the distractor average. By characters, the key is at most 8 longer than the longest distractor, and is the longest option in 15–30% of a domain (chance is 25%; too few is a reverse tell). Test-wise candidates pick the longest answer. |
| `correct_explanation` | 40–75 words. Why the key wins, then why the runner-up loses. |
| `wrong_explanations` | One per distractor, ≤ 30 words. Never call a distractor "true". |
| `tips` | Exactly 3, in this order (below). |
| `key_concept`, `pre_read` | ≤ 25 words each. |
| `_provenance` | Keep the original `Authored from concept:` text and append the v2 note. |
| `style_version` | `2` |
| Unchanged | `id`, `domain`, `subtopic`, `difficulty`, `bloom_level`, `framework_ref`, `related_concepts` |

### The three tips

1. `Eliminate: X … and Y …`: names the two options topic knowledge removes, and why.
2. `Final two: K beats R because …`: the key against the runner-up, by the ISACA principle.
3. `Exam cue: …`: a pattern the learner can reuse on unseen questions.

## Design rules (from the pilot review)

1. **Two eliminable, final two hard.** Exactly two distractors fall to topic knowledge. The runner-up must be genuinely plausible.
2. **No subsets.** The key must not contain another option's idea ("A = B + more" is a giveaway).
3. **Named actor.** The stem says who acts.
4. **No lone absolutes.** Words like "all", "only", "per se" or "inherently" must not be the only reason a distractor falls.
5. **No echo.** The key must not be the only option repeating a word from the stem.
6. **Terms match the source.** Terminology matches the framework cited in `framework_ref`.
7. **Applied over definitional.** Turn "which describes X" into "which report/test/evidence is MOST appropriate for objective Y".
8. **Spread the keys.** Across a batch, no letter holds more than about 35%.
9. **Original wording only.** Never copy or closely paraphrase ISACA QAE items or the Review Manual.

## The loop (how a domain is converted)

```
author batch ──► harness ──► blind tester + domain auditor ──► fix ──► harness ──► merge
   ▲               │ errors                                    │
   └───────────────┘ (author re-runs until clean)              └─ repeat until no FIX items
```

1. **Author.** An agent rewrites a batch of about 25 questions into a scratch file.
2. **Harness.** `python3 scripts/lint_exam_style_v2.py --file <batch>`. The author loops until it reports 0 errors, then reviews each warning by judgement.
3. **Review.** `qa-question-tester` answers blind, and `cisa-d{N}-standards-auditor` checks keys, the final two and wording.
   Also run an **alignment read**: print the batch with `python3 scripts/print_alignment.py --file <batch>` and have an agent confirm each "why-X-wrong" line and tip letter describes the option under that letter. Blind testers cannot see this error (only distractors move, so the key still reads right), and word-overlap lint cannot catch it reliably.
4. **Fix.** Apply every FIX, then re-run the harness.
5. **Merge** into `data/originals/d{N}.json`, then run all the gates:
   ```bash
   python3 scripts/lint_exam_style_v2.py N --progress
   python3 scripts/validate_originals.py
   python3 scripts/lint_originals.py N
   python3 scripts/originals_to_domain.py N
   (cd mobile && npm run check)
   ```
6. **Ship** one domain per PR. The maintainer spot-checks it before the next domain starts.
