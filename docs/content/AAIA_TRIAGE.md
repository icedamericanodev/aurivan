# AAIA human sign-off triage (28 Nov 2026)

The Human Verification Triage agent (`.claude/agents/human-verification-triage.md`) read all 1,000 AAIA questions as a lead content reviewer preparing them for the owner's final sign-off. It checked domain alignment and current terminology, technical accuracy, a single best answer under the AAIA auditor lens, distractor strength and wording.

| Status | Questions |
|---|---|
| READY_FOR_SIGN_OFF | 991 |
| NEEDS_HUMAN_EDIT | 9 |

Every question now carries five fields in `data/aaia/originals/d{1..3}.json`:

```json
"is_human_verified": false,
"triage_status": "READY_FOR_SIGN_OFF",
"audit_note": "<one line>",
"domain_tag": "AAIA Domain 2: AI Operations",
"verified_date": null
```

**Nothing is marked verified.** Only the certified creator flips `is_human_verified` to `true`, and writes the date in `verified_date` (`YYYY-MM-DD`). `scripts/check_triage.py`, run by `scripts/verify_repo.sh`, fails if a question is marked verified without a date, so no script or agent can pass as a human sign-off. The triage fields never reach learners: the phone app copies only the fields it shows, and the free samples drop them.

## How to sign off

1. **READY_FOR_SIGN_OFF:** read the question, then set `"is_human_verified": true` and `"verified_date": "2026-11-29"` (the day you checked it).
2. **NEEDS_HUMAN_EDIT:** read the note and the suggested fix below, edit the question (or ask Claude to apply the fix), and only then sign it off.

## The 9 questions that need a human edit

### aaia_d1_137

**Why:** Stem implies Türkiye has a workplace emotion-recognition ban in force; none exists. Set it where the EU AI Act ban applies.

**Question today:** A Turkish parcel firm runs warehouses where cameras score workers' emotions for engagement. Counsel confirms that a law now in force there bans emotion recognition at work. What should the IS auditor recommend FIRST?

**Suggested fix, `question`:** A parcel firm runs warehouses in the Netherlands, where cameras score workers' emotions for engagement. Counsel confirms that a law in force there bans emotion recognition at work. What should the IS auditor recommend FIRST?

### aaia_d1_307

**Why:** Stem tests the IS auditor's own work program, which is Domain 3 (3B testing), not 1A; reframe as the owner's test plan.

**Question today:** A Gibraltar marine insurer's new generative assistant drafts claim-decision letters. The IS auditor's work program for it reuses the one for the fraud model: accuracy on a labeled holdout set. Which addition is MOST important?

**Suggested fix, `question`:** A Gibraltar marine insurer's new generative assistant drafts claim-decision letters. Its owner's acceptance plan reuses the fraud model's test: accuracy on a labeled holdout set. Which addition should the IS auditor recommend as MOST important?

**Suggested fix, `correct_explanation`:** A predictive model is tested by comparing its labels with known answers, but a generative assistant writes new text, which can state reasons, dates or amounts that no claim file supports. No holdout label measures that, so the plan needs checks of drafts against the file. Testing on recent claims, option B, refines the predictive test, yet recent labels still cannot show what a letter invents.

**Suggested fix, `tips[2]`:** Exam cue: when a test plan moves from a predictive model to a generative one, add checks of output against source records.

### aaia_d2_129

**Why:** Stem says pilots who caught 11 errors now check less, but the explanation blames growing trust; the cause is unstated.

**Question today:** Pilots at a Maldivian seaplane operator caught 11 weight errors by its load-planning assistant this month. They now check fewer of its figures, and nothing was logged. What should the IS auditor recommend as BEST?

**Suggested fix, `question`:** Pilots at a Maldivian seaplane operator caught 11 weight errors by its load-planning assistant this month. Pressed for time, they now check fewer figures. Nothing was logged. What should the IS auditor recommend as BEST?

**Suggested fix, `correct_explanation`:** An AI output that would have caused harm had a person not caught it is a near miss, and near misses belong in incident management. Eleven in a month shows a pattern whose cause, whether data, prompt or integration, needs finding before a pilot misses one. Counting the pilots' checks as a working control relies on every catch, yet pilots pressed for time already check fewer figures.

**Suggested fix, `wrong_explanations.A`:** Tempting because the checks caught every error so far. But pilots already check fewer figures, and the cause stays in place until one is missed.

### aaia_d2_339

**Why:** Stem's 'They send 99%' could mean incidents or staff; the deciding fact should name staff (plain-stem rule).

**Question today:** An Icelandic fisheries directorate rates incidents in its letter-drafting assistant as low severity because staff review every draft. They send 99% unchanged to vessel owners as quota decisions. What is the IS auditor's GREATEST concern?

**Suggested fix, `question`:** An Icelandic fisheries directorate rates incidents in its letter-drafting assistant as low severity because staff review every draft. Staff send 99% of drafts unchanged to vessel owners as quota decisions. What is the IS auditor's GREATEST concern?

### aaia_d2_343

**Why:** Names a real operator (Medellín's metro) in an invented flawed-approval scenario; make it generic like the rest of the bank.

**Question today:** Medellín's metro AI committee approved weapons-detection gates on accuracy tests lacking medical or mobility devices. Engineers traced insulin-pump false flags to that gap, retrained and closed the problem. What is the IS auditor's BEST recommendation?

**Suggested fix, `question`:** A Colombian metro's AI committee approved weapons-detection gates on accuracy tests lacking medical or mobility devices. Engineers traced insulin-pump false flags to that gap, retrained and closed the problem. What is the IS auditor's BEST recommendation?

### aaia_d2_405

**Why:** Content sound; Exam cue tip starts lowercase after the label, unlike every other tip. Capitalize it.

**Question today:** A Danish job platform's model blocks ads it finds discriminatory, with no appeal. Moderators, who cannot lift blocks, edit the tone of notices that a language model drafts. What is the IS auditor's GREATEST concern?

**Suggested fix, `tips[2]`:** Exam cue: Check where the person sits in the chain; reviewing AI-written wording is not reviewing the AI's decision.

### aaia_d2_455

**Why:** Content sound; Exam cue tip starts lowercase after the label, unlike every other tip. Capitalize it.

**Question today:** A Bolivian tin mine's ventilation model proposes fan speeds; a guard swaps any proposal outside safe limits for a fixed speed, logging each swap silently. What should the IS auditor recommend as BEST?

**Suggested fix, `tips[2]`:** Exam cue: When a safeguard silently replaces AI outputs, its activations are an incident signal, not proof the risk is handled.

### aaia_d3_078

**Why:** Cited AC-6 (Least Privilege) does not match the reported cause, a weight cap the cargo system never validates; SI-10 fits.

**Question today:** A Vanuatu freight airline's AI booking agent accepted 40 shipments above the 70 kg parcel limit in its instructions. The cargo system enforces no weight cap. Which cause should the IS auditor report as PRIMARY?

**Suggested fix, `framework_ref`:** ISACA IT Audit Standard 1401 (Reporting); NIST SP 800-53 Rev. 5 SI-10 (Information Input Validation)

### aaia_d3_184

**Why:** Key has the auditor request a real member's balance; good testing practice targets a second test account so no real data is exposed.

**Question today:** A Moroccan supermarket chain's chatbot answers signed-in members' loyalty-points questions by calling a lookup tool with a member number the model supplies. Which procedure BEST shows the IS auditor whether members could reach others' accounts?

**Suggested fix, `options.C`:** With two test accounts, request the other's balance in varied ways

**Suggested fix, `correct_explanation`:** The model supplies the member number, so a member can steer it toward someone else's number. Sign-in proves who is chatting, not that each lookup is tied to that person. Only asking from one test account, in varied ways, for a second test account's balance shows whether the tool checks the number, without exposing real members' data. Past lookups show only what members did ask, not what the tool allows.

## Owner decisions raised by the reviewers (not flagged per item)

- **Real national bodies.** Some stems name a country's only national body (for example an Icelandic fisheries directorate or a Romanian competition authority), which in effect points to one real organization in an invented scenario. aaia_d2_343 named a real operator outright and is flagged above. Decide whether every AAIA setting should be a made-up or generic organization.
- **Country adjectives.** Many stems keep one possessive with a country adjective ("A Montenegrin probation service's model"). They pass the readability rules, but the plain-stem guide prefers "a probation service in Montenegro". An optional light rewording pass could follow.
- **One cluster to watch.** Several Domain 1 items test erasing data from a trained model from different angles (aaia_d1_014, 044, 103, 134, 152). Each tests a different point; the cross-domain reviewer may want a look.
