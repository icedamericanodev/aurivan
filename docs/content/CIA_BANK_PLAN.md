# CIA course plan: four packs, from the harness to a sellable course

KaiSip's course for The IIA's Certified Internal Auditor exams: **Part 1,
Part 2, Part 3** (the three-part route) and the **CIA Challenge Exam** (the
one-exam route for CISA holders, qualified accountants and other qualified
people). Four paid, downloadable packs. Outline, sources and the lens:
`docs/content/CIA_BLUEPRINT.md`. The Challenge map:
`docs/content/CIA_CHALLENGE_MAP.md`. Sources opened: `docs/content/CIA_RESEARCH_LOG.md`.
Tools: `data/cia/tools/README.md`. Started from `docs/content/CIA_KICKOFF_PROMPT.md`.

## Resume here

| | |
|---|---|
| **Status (20 Nov 2026)** | Session G, steps 1 to 3 done: expert decisions, the documents, the harness (187 planted faults stopped, 43 controls hold; an independent code review's findings are all fixed), the expert agents, the **Part 1 study notes for all four sections** (93 sub-topics, audited and learner-read), and the **Part 1 pilot: 80 questions, 20 per section**, through the full pipeline (scorecard in section 7; calibration rules in section 6b). With them: the 20 shared principles, the Part 1 exam guide and final review week, and a first generated Challenge pack from the tagged items. The **glossary start** is written and audited (153 Part 1 terms in `data/cia/shared/glossary.json`; it reuses the notes' wording, and `check_glossary.py` fails if a term is ever defined two ways). The outline of the CISA bridge is in `docs/content/CIA_CISA_BRIDGE_OUTLINE.md`. Session G is complete. |
| **Owner decisions (19 Nov 2026)** | **Licence: keep building privately; settle the licence before selling.** The owner's reasoning: the packs are downloadable content nobody can open until they pay, and KaiSip does for CIA what it does for CISA (original questions, reviewed against the official framework, never copying it). Note for later: the free sample and the store listing are visible before payment, so the licence question is settled before those go live too. **Prices: decide later.** |
| **Rounds 1 to 12 done (21 Nov 2026)** | Round 12: 30 questions aimed at the coverage map's gaps (A 11, B 9, C 3, D 7). Part 1 stands at **322 questions (A 103, B 83, C 101, D 35)**. **Every one of the 97 syllabus bullets now has a question, and every judge-level bullet an analysis question.** Against the three-form bar of about 375 (A 131, B 75, C 113, D 56), Section B is over its share and the gaps are A about 28, C about 12, D 21 (14 of D's blocked on sources). 15 bullets still have only one question, which cannot be held back. Every question is tagged to one of 24 principles. |
| **Next step** | Toward the revised sale gate (decision 4), from `docs/content/CIA_P1_COVERAGE.md` section 5: (1) a second question on each one-item bullet with opened sources (1B5b, 1B4b, 1B4c, 1B4f, 1B4e, 1C2a, 1A6g, 1A5g), under the sibling rule, so each bullet's only question can be held back; (2) Section A's Challenge topics (1A7e, 1A2a, 1A7c, 1A8b, 1A8c) and Section C's second analysis items; (3) Section D's 7 open slots, then D waits for its sources (the owner's IIA membership and licence decisions, section 9); (4) the Part 2 notes can start in parallel. A sibling whose lesson is common sense fails the blind test however it is built (round 12): cut it rather than polish it. |
| **Then** | Part 2, Part 3, the Challenge build and the CISA bridge notes (from the outline), the cross-part release gate. |
| **Known weak spot** | Difficulty. No pilot key was wrong and all four blind rounds agreed 80 of 80, but the last testers still called 21 of 80 answerable by test-taking alone, most in Sections B and D, and 8 items carry a TOO EASY or GIVEAWAY flag (section 7). New rounds must do better; the pilot items are candidates for a later hardening pass, not for more polishing now (section 6b, rule 12). |

Commands a new session runs first:

```bash
python3 data/cia/tools/prove_harness.py -q      # the harness still catches its planted faults
python3 data/cia/tools/check_cia.py --coverage  # where each pack stands
python3 data/cia/tools/check_currency.py        # are the dated facts still fresh?
bash scripts/verify_repo.sh                     # everything, including the CIA block
```

Every round ends by updating this block, the status table in section 1 and
the scorecard in section 7, so a new session can continue from this file alone.

The CIA packs are not wired into the apps (pack delivery and the paywall come
first), so content work needs no `APP_VERSION` bump and no What's New entry.
Never put a bank size in learner copy.

## 1. What each pack carries

One table per exam would repeat itself, so one table with a status column per
pack. Every surface CISA has, as data that passes its gate.

| Surface | File (per pack) | Owner agents | cia1 | cia2 | cia3 | ciac |
|---|---|---|---|---|---|---|
| Blueprint and outline | `docs/content/CIA_BLUEPRINT.md`, `data/cia/shared/outline.json` | cert-blueprint-researcher | Done | Done | Done | Done |
| Study notes | `notes/d{N}.json`, one file per section, notes schema v2 | part expert | Done: 93 sub-topics, audited (section 8b) | Not started | Not started | Generated later, plus the bridge |
| Questions | `originals/d{N}.json` | part expert | Pilot and rounds 1 to 12 done: 322 (A 103, B 83, C 101, D 35; section 7); every syllabus bullet covered (`CIA_P1_COVERAGE.md`) | Not started | Not started | Generated (`build_challenge.py`) from the tagged pilot items |
| Citation library | `data/cia/shared/_framework_library.md` (one for all four) | part experts, cia-currency-checker | Started | | | |
| Dated facts | `data/cia/shared/currency.json` | cia-currency-checker | Started | | | |
| Glossary | `glossary.json`, built from `data/cia/shared/glossary.json` | iia-mindset-coach, part experts | Started: 153 terms, audited (section 7) | Later | Later | Built from the shared terms of its topics |
| Principles | `mindset/principles.json`, built from `data/cia/shared/principles.json` | iia-mindset-coach | Done: 24 principles, every question tagged | Later | Later | Built (same 24) |
| About the exam | `exam/<pack>_exam_guide.json` | iia-mindset-coach | Done | Not started | Not started | Not started |
| Final review week | `exam/final_review_week.json` | iia-mindset-coach, behavioral-scientist | Done | Not started | Not started | Not started |
| The CISA bridge | `ciac/notes/bridge.json` and a section of the Challenge exam guide | cia-challenge-bridge-expert | | | | Outline done (`docs/content/CIA_CISA_BRIDGE_OUTLINE.md`); notes not started |
| Mock exam | the bank plus the settings in section 4 | part expert, mobile-app-engineer | | | | |
| Decision lessons, game decks | `lessons/` (LESSONS_SCHEMA), game decks | part experts, learning-game-designer | Later | Later | Later | Later |
| Course description and store copy | section 10 | growth-marketer, app-store-compliance-reviewer | Draft names only | | | |

## 2. Layout and formats

```
data/cia/
  shared/   outline.json  currency.json  _framework_library.md  stale_terms.json
            principles.json  glossary.json          (hand-written once for all four)
  tools/    the harness (README.md)
  cia1/     notes/d{1..4}.json   originals/d{1..4}.json
            exam/cia1_exam_guide.json  exam/final_review_week.json
            mindset/principles.json  glossary.json   (GENERATED by build_packs.py)
  cia2/ cia3/   same shape (3 and 4 section files)
  ciac/     originals/d{1..5}.json and id_map.json    (GENERATED by build_challenge.py)
            exam/, notes/bridge.json                  (hand-written)
```

- **Sections are the app's "domains".** Section A is file `d1.json`, B is `d2.json`, and so on.
- **Outline codes** are part + section + topic: `1A1` to `3D8` (62 topics).
  Notes sub-topics are `1A1.1`, `1A1.2`. In the generated Challenge pack the
  same scheme uses `4` for the fourth exam: `4A1` to `4E8` (documents may say
  "Challenge A1").
- **Question ids** are `cia1_d1_001` (pack, section number, running number).
  Challenge ids are `ciac_d3_001`, given once by `build_challenge.py` and never
  moved, because saved progress is keyed by id.
- **Item fields**, in this order: `id, domain, subtopic, principle_id,
  challenge_ref, testable_from, difficulty, bloom_level, question, options,
  correct, key_concept, pre_read, correct_explanation, wrong_explanations,
  tips, framework_ref, related_concepts, _provenance, style_version`, and
  then, only on a retired item, `retired`.
  - `subtopic` is `"1A1 <the outline title>. <item label>"`.
  - `challenge_ref` is the Challenge topic the item serves (`"A1"` to `"E8"`)
    or `null`. An item on a shared topic may carry `null` when it is too basic
    for the experienced Challenge candidate. Items on `1D1` may carry `"C3"`
    (the one Challenge-only bullet).
  - `testable_from` is `null`, or the date from `currency.json` when the item
    rests on a Topical Requirement that is not testable yet. Mock, free-sample
    and Challenge-pool counts leave such items out until that date.
  - `framework_ref` parts are joined by `"; "`. Each is a bullet in the
    citation library, and the first must sit in a Verified (opened) section.
  - `_provenance` starts "Authored from concept: notes 1A1.2 …" and names a
    notes sub-topic of the item's own topic.
  - `retired` is left out of a live item. `"retired": true`, as the last
    field, marks an item that was replaced or dropped: it keeps its id and its
    number in the file for good (it is never deleted or renumbered), and is
    left out of the Challenge build, mock pools, practice links, the key,
    length and difficulty counts and blind copies. The wording gates still
    read it. `check_ids.py` compares ids and the Challenge id map with main.
- **Citation library**: a heading `## Verified: opened YYYY-MM-DD <source> (<url>)`,
  `## Background: opened YYYY-MM-DD <source> (<url>)` (opened, but not an exam
  reference: never carries a key) or `## Likely: not opened (<why>)` sets the
  status of the bullets under it.
  The Standards are cited by number and title, never with quoted text.
- **Dated facts**: `currency.json`, one entry per fact with `source`,
  `last_checked` and `status` (`opened`, `search_only`, `not_opened`).

## 3. Decisions (experts first, 19 Nov 2026)

product-manager, mobile-app-engineer, behavioral-scientist and growth-marketer
answered the six questions in the kickoff prompt, in parallel.

| # | Question | Decision | Who agreed |
|---|---|---|---|
| 1 | Pack shape | Four packs (`cia1`, `cia2`, `cia3`, `ciac`), the standard folder layout, shared things written once and built into each pack. | All four |
| 2 | Challenge pack | Generated from tagged Part items, never hand-edited. Its own stable ids through an append-only id map (the engineer's point: progress is keyed per exam and per id). The tag may be `null` on a shared topic when an item is too basic for the Challenge (the product manager's "level flag"). The one Challenge-only bullet is served by `1D1` items tagged `"C3"`. The only hand-written Challenge content is the bridge, the exam guide and the final review week. | All four |
| 3 | Order of work | **Changed from the kickoff default.** Part 1 pilot, then Part 1 to its sale minimum with its five shared topics early, then Part 2, then Part 3, then the Challenge build. Reason: all 35 topics of Parts 2 and 3 are shared but only 5 of Part 1's 27, so "shared topics first" would leave nothing sellable until two whole banks were done; and Parts 2 and 3 should not sell before Part 1 is complete. | Product manager, marketer, behavioral scientist |
| 4 | Bank size | **Revised 20 Nov 2026 (round 11), as authors ran out of distinct lessons.** A pack may go on sale when (a) every syllabus bullet is tested at its verb's depth with every gate passing; (b) it holds three full exam-weighted forms without repeats (Part 1 about 375: A 131, B 75, C 113, D 56); and (c) one full form and one short mock are held back from practice. Held-back items join practice, with their explanations, once the learner has taken that mock (short mock as a baseline in weeks 2 to 3, the full form in the last 3 weeks); a bullet's only item is never held back. Four forms (Part 1 500) stay the target and six (about 750) the ceiling. Never padding. A second item on one lesson is allowed only with a new scenario and a new actor or depth, a different runner-up trap, no distinctive phrase shared with the first item's key, logged as a sibling and never in the same form or session; at most two per lesson and about 15% of a section, confirmed by `cia-cross-part-reviewer`. Once the apps serve the packs, track how often learners get a practised item right but its held-back sibling wrong; above about 25% the pair teaches wording, and is rewritten. Earlier text: four forms (500, 400, 400) as the sale minimum with two held out. For the Challenge, accept five full mocks rather than write to fill section A. | Product manager, behavioral scientist (round 11 revision: both) |
| 5 | On sale, free sample | A pack goes on sale when it reaches its sale minimum and has passed the cross-part gate, and not before the paywall has run on CISA. Part 1 first, Parts 2 and 3 as they finish, the Challenge when both are done and the bridge is reviewed, ideally 8 to 12 weeks before a testing window (February, June, September, November). Free sample as CRISC: 10% of each bank, at least 100, weighted by section, every topic touched, one diagnostic and one short mock that share no items. The Challenge sample uses only ids already free in their Part. The bridge notes are free. | All four |
| 6 | Prices | **Owner decision: decide later (19 Nov 2026).** The experts differ, so both options stay on record: (a) US$19.99 per part, no bundle, Challenge US$39.99, all 6 months (product manager: three exams rarely fit one 6-month clock, so a lower part price gives everyone the bundle saving with no extra product); (b) US$29.99 per part (the CISA price), Challenge US$39.99, and when Part 3 ships a three-part bundle at US$69.99 for 12 months (marketer: more revenue per learner, at the cost of a fifth product and a new access length). Never mention a price in learner copy before this is decided. | Open, by the owner's choice |

Other points the experts raised, recorded so they are not lost:

- **Who buys the Challenge pack.** KaiSip's CISA learners are candidates, not
  holders, and the Challenge Exam needs an active CISA. So that cross-sell lags
  by months. A one-question waitlist poll would test demand cheaply (marketer).
- **The Challenge pack overlaps Parts 2 and 3**, so a three-part candidate
  could buy it instead. Price it at about two parts (both price options do).
- **Access length against the 180-day window** (behavioral scientist): a
  6-month access nearly equals the 180 days a Challenge candidate has to sit,
  so access could lapse at exam time or before a retake. An owner point when
  the price is set.
- **Maintenance after sale**: three Topical Requirements become testable during
  2027 (section 8), inside buyers' access windows.
- **Honest design** (behavioral scientist): no pass promise or pass-rate claim;
  no "shortcut" framing of the Challenge; no countdowns that use the testing
  windows to push a purchase; diagnostic results never behind the paywall; show
  the entry rules before purchase; no Topical Requirement claimed before its
  exam date.

## 4. Targets, mocks and the difficulty mix

Targets scale by section weight. "Minimum" is the sale minimum (four full
mocks); "ceiling" is six. Inside a section, split by topic, a little more for
topics with more bullets and for the "judge" verbs.

| Pack | Section | Weight | Topics | Minimum | Ceiling |
|---|---|---|---|---|---|
| cia1 | A Foundations of Internal Auditing | 35% | 8 | 175 | 263 |
| | B Ethics and Professionalism | 20% | 6 | 100 | 150 |
| | C Governance, Risk Management, and Control | 30% | 8 | 150 | 225 |
| | D Fraud Risks | 15% | 5 | 75 | 112 |
| | **Part 1** | | 27 | **500** | **750** |
| cia2 | A Engagement Planning | 50% | 7 | 200 | 300 |
| | B Information Gathering, Analysis, and Evaluation | 40% | 8 | 160 | 240 |
| | C Engagement Supervision and Communication | 10% | 2 | 40 | 60 |
| | **Part 2** | | 17 | **400** | **600** |
| cia3 | A Internal Audit Operations | 25% | 4 | 100 | 150 |
| | B Internal Audit Plan | 15% | 3 | 60 | 90 |
| | C Quality of the Internal Audit Function | 15% | 3 | 60 | 90 |
| | D Engagement Results and Monitoring | 45% | 8 | 180 | 270 |
| | **Part 3** | | 18 | **400** | **600** |

The Challenge pool is whatever the tagged items add up to. One full Challenge
mock needs 30 / 23 / 30 / 37 / 30 items in sections A to E (22.5 and 37.5 by
weight; the app deals whole questions, and every tool uses the same split).
`build_challenge.py` prints how many full mocks the pool supports. Section A
is the pinch: it draws on only five Part 1 topics (1A2, 1A7, 1A8, 1B2, 1B6)
and Part 3 section C, so write those five topics to the upper end of their
share, and never pad.

**Mocks.** A full mock at the real length and time, to the section weights
(125 in 150 minutes, 100 in 120, 100 in 120, 150 in 180: 1.2 minutes a
question on all four), and a short mock of one third. Two full forms per exam
are held out and never served by practice; a mock that contains seen items is
labelled and kept out of the readiness band (behavioral scientist: item
exposure inflates scores). **The result screen never shows a scaled score.**
The real exams report 250 to 750 with 600 to pass, and that is a scaled score,
not a percent. KaiSip shows percent by section with item counts, pace against
1.2 minutes, and its own readiness band labelled as KaiSip's, from unseen
mocks only.

**Difficulty by verb.** The 2025 syllabus has no Basic or Proficient labels;
each topic line's verb sets the depth. `check_cia.py` enforces this per topic
once a topic has 8 items:

| Depth class | Verbs | Rule |
|---|---|---|
| recall | Describe, Recognize, Identify, Explain | foundational 25 to 60%, analysis at most 25% |
| apply | Interpret, Apply, Demonstrate, Maintain | foundational at most 35%, application at least 40% |
| judge | Evaluate, Determine, Analyze, Assess, Plan, Complete, Prepare, Summarize | foundational at most 25%, analysis at least 15% |

By count the classes are 15 / 8 / 4 topics in Part 1, 1 / 4 / 12 in Part 2 and
16 / 1 / 1 in Part 3. Bullets often go deeper than their topic's verb, so
"recall" still means scenario questions, not definitions only. These
thresholds are KaiSip's reading; the pilot may tune them, and any change is
recorded here.

## 5. The harness (built and proven before any content)

"Harness" means everything around the writing that makes a wrong answer hard
to ship. The seven rules of the kickoff prompt, and where each lives:

| Rule | Where |
|---|---|
| Gates before content | `data/cia/tools/prove_harness.py`: a clean made-up fixture passes every gate, and each planted fault is stopped by the right gate with the right message. Runs in `scripts/verify_repo.sh`. |
| The author never judges their own work | Separate agents with fresh context (section 6). `blind_copy.py` strips keys for the blind tester. |
| One hand-written source, everything else generated | `build_packs.py`, `build_challenge.py`, `sync_practice_ids.py`, each with `--check`. |
| State lives in files | This file's "Resume here" block, status table and scorecard. |
| Small batches, clean context | 20 to 25 items a round, one section per authoring agent. |
| Every keyed fact has an opened, dated source | `_framework_library.md` (Verified or Likely), `currency.json`, `check_currency.py`. |
| Measure each round and stop on a bad number | The round scorecard (section 7). |

The gates, in the order a round runs them (details in `data/cia/tools/README.md`):

1. `check_cia.py`: structure, links, tips, key balance, length tells, difficulty by verb, the Challenge tag, a lens backstop.
2. `style_cia.py`: the shared exam-style linter, unchanged. CIA has no exceptions.
3. `check_stale_terms.py`: no 2019-syllabus, 2017-Standards or ISACA wording. Each banned term carries its evidence in `shared/stale_terms.json`. "IPPF" alone is not banned: the 2024 Standards still describe the framework. The 2019 part and domain names are not on the list yet because no opened source confirms them (an open item in the blueprint).
4. `check_currency.py`: dated facts, and Topical Requirements that are not testable yet.
5. Citations: inside `check_cia.py` (library bullets; the first citation Verified).
6. `check_originality.py --fetch --require`: own words. The IIA's text is fetched outside the repository and never committed.
7. Notes: `scripts/lint_notes.py <file> --part N --outline docs/content/CIA_BLUEPRINT.md --bank data/cia/cia{N}/originals`, and `sync_practice_ids.py --check`.
8. Principles and exam guides: `scripts/lint_principles.py --cert <pack>` and `scripts/lint_exam_guide.py --cert <pack>` (issuer-aware: The IIA's hosts and wording).
9. `node scripts/cia_pack_dry_run.cjs`: the phone app's own pack builders on each pack, and mock draws to the weights (`--require-full` at release time makes "cannot draw a full mock" an error).
10. `build_challenge.py --check` and `build_packs.py --check`.
11. `check_ids.py`: against main in git, no shipped question id deleted, renumbered or given to another question, and the Challenge id map only ever appended to (a replaced item is marked `"retired": true`).
12. `blind_copy.py`.
13. `prove_harness.py`.

`bash data/cia/tools/run_gates.sh` runs them all and is what `scripts/verify_repo.sh` calls.

An independent code review of the harness on 19 Nov 2026 found gaps (old terms
in dict keys and with odd spacing, glossary entries lost at page breaks, ids
that could be renumbered, a partial reference text passing as complete, and
the rest); each is fixed and each now has a planted fault in `prove_harness.py`.

What the gates cannot judge is in section 6: whether the keyed answer is truly
the internal auditor's best move is a reviewer's call, not a script's.

## 6. The pipeline every round goes through (do not skip a step)

1. **Scaffold.** Pick the topics from section 4, set key positions and length
   targets up front (`scripts/scaffold_batch.py` shows the idea).
2. **Author** with the part expert, from a notes sub-topic, sources opened.
3. **Self-check.** Every gate in section 5, 0 errors.
4. **Blind test** with `qa-question-tester` on the answer-free copy.
5. **Standards audit** (`cia-standards-auditor`) and the part expert's
   accuracy pass, each in fresh context.
6. **Currency and citations** (`cia-currency-checker`).
7. **Fix** every HARD ERROR and PRECISION finding; re-blind-test changed items.
8. **Cross-part review** (`cia-cross-part-reviewer`) after the pilot, then
   every 100 new items, and before any release. `notes-application-tester`
   after each part's second round. `learner-reader` on one notes section per part.
9. **Regenerate** the Challenge pack, the built glossary and principles and the
   practice links; run `bash scripts/verify_repo.sh` and `(cd mobile && npm run check)`.
10. **One pull request per round**, reviewed and merged under CLAUDE.md, then
    post-merge branch hygiene, then update "Resume here".

Agents (in `.claude/agents/`): `cia-standards-auditor` (the shared standard),
`cia-p1-domain-expert`, `cia-p2-domain-expert`, `cia-p3-domain-expert`,
`cia-challenge-bridge-expert`, `cia-cross-part-reviewer`,
`cia-currency-checker`, `iia-mindset-coach`. Reused as they are:
`qa-question-tester`, `cert-blueprint-researcher`, `notes-application-tester`,
`learner-reader`, `cisa-grammar-checker` (prose only), `product-manager`,
`behavioral-scientist`, `growth-marketer`, `app-store-compliance-reviewer`,
`learning-game-designer`.

## 6b. Pilot calibration rules (from the Part 1 pilot, 19 and 20 Nov 2026)

The first blind test agreed with the key on 80 of 80, and the four audits
found no wrong key. What they found instead decides how every later round is
written. These rules are part of the item standard
(`.claude/agents/cia-standards-auditor.md`), and the scaffold of every round
states how it meets them.

1. **Agreement is not difficulty, and difficulty is measured, not judged.** A
   blind tester who gets 20 of 20 with high confidence has shown the keys are
   clear, not that the items are worth paying for. Two measures go in every
   round's scorecard:
   - **The cue test** (`blind_copy.py --options-only`, scored by
     `score_blind.py`): a fresh tester sees only the four options, no stem, and
     guesses the key. Chance is 25%. Measured on 19 and 20 Nov 2026 with the
     same instructions on 80 items each: **CISA 96%, the CIA pilot 94% (91%
     after its final fix), CRISC 85%.** So the pilot sits at the house standard, and the house standard
     leaks: the key is usually the one measured, by-the-book option among
     options that are wrong in general. The tester knows auditing, so this is
     not what an unprepared learner would score; it shows that the wrong
     options do not tempt someone who half-knows the subject. **Target for CIA
     rounds: first set at or below the CRISC baseline (85%) and falling;
     recalibrated after round 3 against The IIA's own public sample questions,
     which score 87% on the same test (section 7, "Two calibration
     measurements"): at or below that level on a mixed 50-item sample.**
     The way down is rule 2: a wrong option should be the right answer to a
     different question, so that only the stem's facts decide.
   - **The tester's own sorting** of each item (needs the Standards, partly
     reachable by test-taking, reachable by test-taking alone). It is a
     judgment and it wobbles between testers (the pilot's last two rounds: 20,
     34 and 26 of 80, then 18, 41 and 21), so it is recorded and read with the
     cue test, not used as a bar on its own.
2. **Every item has a real runner-up, and every wrong option is right
   somewhere.** The runner-up is the answer a careful, half-prepared candidate
   would choose (the right actor at the wrong time, a "should" where a "must"
   applies, the 2017 habit, the individual remedy for a function-level
   problem). The other two are actions or statements that are correct in a
   different situation, which the stem's facts rule out; not actions that are
   wrong everywhere. No straw options ("do nothing", "silent
   observer", "accuse the manager", "call the police").
3. **No distractor family more than 6 times in 20**, and never at the same
   letter more than twice: internal audit does management's job; do nothing or
   defer; overreact.
4. **Break the middle-option pattern.** If the key is always the measured
   option between one that caves and one that overreacts, a candidate learns
   the trick in one mock. In at least 4 of 20 the requirement is the firm
   action (go to the board, decline the work, report although a manager
   objects) or the modest one (the minimum the Standards require and no more).
5. **At least 6 of 20 turn on a distinction the Standards draw** (8 where the
   section's verbs ask for judgment): must against should or may; requirement
   against essential condition; who approves against who is consulted;
   function against person; discuss against escalate; consider against
   document. The stem settles the facts so the key is still the single best answer.
6. **A "should" may support the key; it may never compete with a "must"
   unless the stem settles it.** The one ambiguous item of the pilot keyed the
   "must" (report as policy directs) against a "should" that a well-prepared
   candidate knew (a senior executive's breach goes to the board): knowledge
   was pulled toward the wrong option. Write such items so the two agree.
7. **No giveaways**: the key may not be the only option that echoes a stem
   phrase, the only one of its kind (the only one that declines, that gets
   evidence, that names the policy, that names both the board and senior
   management), the only one carrying its own justification, or the only one
   with a hedge word. A stem does not state the rule and then ask for it.
8. **Use the same modal verb in all four options** when the options are
   statements of duty.
9. **Own words means more than passing the gate.** One explanation sat a
   single inserted word under the 8-word limit. After writing, read each
   explanation beside the Standard it cites and reword anything that follows
   its sentence.
10. **Do not invent rules to gain difficulty.** Where the opened sources are
    thin (most of Section D), a clean application item is better than a
    contrived hard one. The author says which items were left at that level and why.
11. **One lesson, one item per set.** Two items that fall to the same rule
    with the same wrong patterns count as one (and the cross-part reviewer
    checks this across sections: "report as policy directs" was keyed in four
    items of the first draft).
12. **Two fix passes, then stop.** Review, fix, blind test again, one small
    pass, final blind test. What still falls short is recorded in the
    scorecard, not polished forever.

## 6c. The author brief for a round (what made round 1 harder than the pilot)

The pilot's item format stays (section 2). On top of it, every author gets
these instructions, and delivers the scaffold as a table BEFORE writing:
`id | topic and notes sub-topic | the distinction the item turns on | the key's
kind (firm, modest, measured) | the runner-up and why a half-prepared
candidate picks it | for each other wrong option, the situation in which it
WOULD be right | key letter | key longest or shortest`.

1. Every wrong option is right somewhere: correct under the Standards in a
   different situation, which this stem's facts rule out. If the author cannot
   name that situation, the option is replaced.
2. Break the learned patterns: in at least a third of the items the key is the
   firm action or the minimum the Standards require, not the measured middle;
   in at least two the measured option is wrong because the facts make it
   insufficient or unnecessary; in at least one internal audit does take
   something on; in at least one an independence or objectivity option is the
   key; attractive wording ("report to the chief audit executive", "disclose",
   "the board") sits in keys and wrong options about equally.
3. At least half the items turn on a distinction the Standards draw.
4. Cover the stem: reading only the four options, two or three should each
   look like the key to some stem. The key is never the only option of its
   kind, the only one carrying its own "because", or the only hedged one.
5. Difficulty comes from the stem's facts selecting among options that are
   each right somewhere, never from an invented rule, trick wording or two
   defensible answers.
6. After the reviews, the author gets the audit, the blind tester's notes and
   the cue tester's guesses with the cue used for each item, and removes each
   cue that pointed at the key. Changed items are blind-tested again.
7. An item whose key, or the wording of its key, changes in a fix pass gets
   its own standards audit before its final blind test (rounds 3 to 5: three
   of four such items had an error or a weak basis only that audit found).
   When two duties that are both real are the final two, the stem states the
   stage reached, the period in scope and any condition the choice depends
   on (round 5).
8. The second, small pass is the targeted one (round 2): only the items the
   cue tester guessed with high confidence, each with its cue named, and the
   instruction to give one wrong option a reason that is true in general but
   does not fit this stem's facts. Then a final blind test of what changed.

## 7. Round scorecard

Written here after every round. **Blind-test agreement below 90% means the
round does not merge** until the disputed items are fixed or cut. Two rounds
in a row below 90%: stop and tell the owner.

| Round | Date | Pack and sections | Items | Blind agreement | HARD / PRECISION / OBSERVATION per 25 | Pick-longest | Items cut | Sources newly opened |
|---|---|---|---|---|---|---|---|---|
| Pilot | 19 to 20 Nov 2026 | cia1, Sections A to D | 80 (20 each) | 80 of 80 in each of four blind rounds (100%) | 0.3 / 12.8 / 10.9 (1 / 41 / 35 on 80) | 20.0% in every section | 0 | The texts listed in `CIA_RESEARCH_LOG.md` (no new source after the notes) |
| Round 1 | 20 Nov 2026 | cia1, Sections A (1A2, 1A7, 1A8) and B (1B2, 1B6): the Challenge-shared topics | 25 (15 and 10) | 25 of 25 in each of two blind rounds (100%) | 0 / 23 / 18 on 25 | 20.0% in both sections | 0 | None new (the Standards, both statements and the reference list re-downloaded, unchanged) |
| Round 2 | 20 Nov 2026 | cia1, Section C (1C1 to 1C8) | 20 | 20 of 20, 20 of 20, then 8 of 8 on the last changed items (100%) | 1 / 11 / 11 on 20 (1.3 / 13.8 / 13.8 per 25) | 20.0% | 0 cut; 1 replaced before merge (`cia1_d3_040` mirrored pilot 018) | None new (five IIA files re-downloaded, unchanged) |
| Round 3 | 20 Nov 2026 | cia1, Section A (1A1, 1A3, 1A4, 1A5, 1A6) and Section D (1D1 to 1D5) | 25 (17 and 8) | 25 of 25, 25 of 25, then 13 of 13 on the last changed items (100%) | 1 / 21 / 13 on 25, plus 0 / 7 / 8 from the citation check | 19.2% and 21.4% | 0 | None new (eight IIA files re-downloaded, unchanged) |
| Round 4 | 20 Nov 2026 | cia1, Section B (1B1, 1B3, 1B4, 1B5) and Section C (1C1, 1C3 to 1C8) | 22 (10 and 12) | 22 of 22, then 16 of 16 on the changed items, then 8 of 8 on the last changed (100%) | 1 / 48 / 20 on 22 (two audits, one audit of two re-keyed items), plus 0 / 4 / 6 from the citation check | 20.0% and 20.2% | 0 | None new |
| Round 5 | 20 Nov 2026 | cia1, Section A (1A1, 1A3 to 1A7) and Section C (1C1, 1C3 to 1C8) | 24 (12 and 12) | 24 of 24 first round; 18 of 18, then 2 of 2, then 1 of 1 on the changed items (100%) | 1 / 26 / 14 on 24 (two audits), plus 0 / 7 / 6 from the citation check and 0 / 5 / 4 from one re-keyed item's audit | 18.8% and 21.1% | 0 | None new |
| Round 6 | 20 Nov 2026 | cia1, Section B (1B1, 1B3, 1B4, 1B5) and Section A (all eight topics) | 24 (12 and 12) | 24 of 24 first round; 24 of 24 final, after two fix passes (100%) | 3 / 47 / 31 on 24 (two audits), plus 0 / 17 / 10 from the two targeted audits of changed items and 0 / 1 / 2 from the citation check | 19.2% and 17.1% | 0 cut; 2 replaced before merge (`cia1_d2_043`, Part 3 ground; `cia1_d1_072`, a repeated lesson) | None new (the two 2026 statements added to the originality gate's fetch list) |
| Round 7 | 20 Nov 2026 | cia1, Section B (all six topics) and Section C (1C1 to 1C4, 1C6, 1C8) | 23 (12 and 11) | 24 of 24 first round; 23 of 23 final, after two fix passes (100%) | 0 / 38 / 21 on 24 (two audits), plus 0 / 9 / 21 from the two targeted audits and 0 / 0 / 2 from the citation check | 18.8% and 18.4% | 1 (`cia1_d3_070`, twice Part 2 ground; the slot was dropped and 071 to 076 renumbered before reaching main) | None new (the reference list re-downloaded, unchanged) |
| Round 8 | 20 Nov 2026 | cia1, Section A (1A2, 1A3, 1A4, 1A7, 1A8) and Section C (1C1, 1C3, 1C4, 1C5, 1C7, 1C8) | 20 (9 and 11) | 21 of 21 first round; 20 of 20 final, after two fix passes (100%) | 5 / 26 / 17 on 21 (two audits), plus 0 / 9 / 5 from the two targeted audits and 0 / 0 / 0 from the citation check | 17.6% and 17.2% | 1 (`cia1_d1_081`, a defensible runner-up from Standard 6.1's must; removed and 082 to 086 renumbered before reaching main); 2 planned slots left empty | None new (the Standards and both 2026 statements re-downloaded, unchanged) |
| Round 9 | 20 Nov 2026 | cia1, Section B (1B1, 1B2, 1B4, 1B5, 1B6) and Section C (1C2, 1C4 to 1C7) | 17 (10 and 7) | 17 of 17 first round; 17 of 17 final, then 2 of 2 on two reworded stems (100%) | 1 / 41 / 19 on 17 (two audits), plus 1 / 1 / 10 from the targeted audit and 0 / 0 / 1 from the citation check | 19.6% and 15.9% | 0 cut; 7 planned slots left empty (2 in B, 5 in C) | None new (the Standards, the ERM statement, the reference list, the Third-Party Requirement and the Part 1 syllabus re-downloaded, unchanged) |
| Round 10 | 20 Nov 2026 | cia1, Section B hardening: 18 existing items reworked (001, 004, 005, 006, 008, 011, 013, 014, 015, 016, 018, 020, 040, 045, 050, 060, 062, 067) | 0 new (18 reworked) | 18 of 18 final (100%) | 0 / 3 / 3 on 18 | Section B 16.9% (from 19.6%) | 0 | None new |
| Round 11 | 20 Nov 2026 | cia1, Section A (1A2, 1A3, 1A7, 1A8) and Section C (1C1, 1C5, 1C6) | 12 (7 and 5) | 12 of 12 first round; 12 of 12 final (100%) | 0 / 36 / 21 on 12 (two audits), plus 0 / 12 / 6 from the targeted audit and 0 / 2 / 1 from the citation check | 16.3% and 16.2% | 1 replaced before merge (`cia1_d3_098` repeated `cia1_d1_092`); 17 planned slots left empty | None new |
| Round 12 | 21 Nov 2026 | cia1, all four sections, aimed at the coverage map's gaps (zero-item and one-item bullets, judge bullets below depth) | 30 (A 11, B 9, C 3, D 7) | 29 of 30 first round (Section B 8 of 9 scored); 30 of 30 final (100%), after three items were hardened and one cut | 5 / 69 / 34 on 31 (three audits), plus 0 / 14 / 10 from the targeted audits of changed keys, 0 / 9 / 5 on two reworked items and 0 / 1 / 5 from the citation check | A 17.5%, B 18.7%, C 16.7%, D 22.9% | 1 cut before merge (a 1B4g trust sibling, test-taking in three blind tests); the next item took its id | None new; the originality gate now fetches and requires the two 2026 Statements of Position |

**Pilot, in full.** Four standards audits (one per section, with the key):
Section A 0 HARD, 15 PRECISION, 8 OBSERVATION; B 0 / 8 / 5; C 1 / 9 / 12;
D 0 / 9 / 10. The cross-section review of the items added 0 / 16 / 7 and the
currency check 0 / 3 / 9. All were applied or answered with the Standard.
No key was wrong. Two items were found ambiguous by blind testers along the
way and fixed: `cia1_d3_007` (a "must" set against a "should" a prepared
candidate knows; rule 6 of section 6b) and `cia1_d4_007` (a ranking that an
inherent-risk reading could reorder). Two fix passes and one consolidated
final fix, as rule 12 allows; then a last blind round on the final text.

| Measure | Result |
|---|---|
| Blind agreement, rounds 1 to 4 | 80 of 80 each round; round 4 found no ambiguous item and no wrong premise |
| Cue test (options only, chance 25%) | 94% before the final fix, **91% after** (73 of 80). Target for new rounds: 85% or lower |
| Final testers' sorting of the 80 | needs the Standards 18, partly 41, test-taking alone 21 (round 3: 20 / 34 / 26). By section, test-taking alone: A 3, B 8, C 3, D 7 |
| Flags left in the final round (recorded, not polished further) | TOO EASY: `cia1_d1_007`, `cia1_d1_011`, `cia1_d2_006`, `cia1_d3_011`, `cia1_d3_016`. GIVEAWAY: `cia1_d1_019`, `cia1_d2_018`, `cia1_d3_017` |
| Patterns a candidate could learn (final testers) | An option where internal audit decides, operates a control or takes over is wrong; the measured middle option wins; in Section B an option that cites the function's independence is wrong; in Section C "it turned out fine, is legal, is funded, was approved" is wrong; late-timing words mark wrong options |
| Key spread and length | 5 keys per letter in every section; key alone longest in 4 of 20 per section |
| Notes changed because of the items | One example in 1C6.1 (it suggested a reliable risk register could replace the chief audit executive's own assessment) |

**Round 1, in full.** Written to the brief in section 6c. Two standards
audits: Section A 0 HARD, 15 PRECISION, 5 OBSERVATION; Section B 0 / 8 / 13.
Currency and citation check: 0 / 2 / 10. All applied; no key was wrong and no
item was ever flagged ambiguous. One fix pass, a second blind round on the
changed items, one small last pass (citations, and the Three Lines question
anchored to current guidance), as rule 12 allows.

| Measure | Pilot | Round 1 |
|---|---|---|
| Cue test (options only, chance 25%) | 94%, then 91% | **76%, then 68% after the fix pass** (17 of 25). Target 85% or lower: met |
| Cue tester's high-confidence guesses | 34 of 80 | 4 of 25, and only 2 of those 4 right |
| Final testers' sorting: needs the Standards, partly, test-taking alone | 18 / 41 / 21 of 80 | 5 / 15 / 5 of 25 |
| Flags left in the final round | 8 of 80 | 5 of 25: TOO EASY `cia1_d1_021`, `cia1_d1_034`, `cia1_d2_022`, `cia1_d2_027`; GIVEAWAY `cia1_d2_025` |
| Blind agreement | 80 of 80, four rounds | 25 of 25, two rounds |

Tags after round 1: two principles were written for the gaps the pilot
recorded, `have-or-obtain-competency` (Standards 3.1 and 3.2, with 13.5 and
10.2) and `information-for-the-work-only` (Principle 5, Standards 5.1 and
5.2), and seven items moved to them (`cia1_d2_011`, `012`, `017`, `028`,
`029`, `030` and `cia1_d4_018`).

What worked, and stays: the scaffold table with "where would each wrong option
be right" (section 6c), and handing the authors the cue tester's guess and cue
for every item. What did not move: the share a tester calls answerable by
test-taking alone is still about one in five, because a stem that gives enough
facts to settle the key also lets a careful reader discard options; the items
left flagged are classification items whose stem describes the answer.
Patterns the final testers could still learn: the key is often the
board-facing "must" while wrong options are duties from the sibling branch;
an odd clause in the stem exists to rule out one option; "the chief audit
executive approves" and the "assurance against advice" split were wrong each
time they appeared in Section B. The next round's authors get this list.
Twenty-five items is a small sample: read the cue-test trend, not its digit.

Also from round 1: the notes now say who "the board" is where there is none
(1A2.3); the citation library says how The IIA's two 2026 statements may be
cited (rule 7 there); four groups of sibling items can cue each other inside
one mock (pilot 005 with round 1's 023 and 030; 018 with 031; 019 with 022 and
034; 028 with 030), which the app-side mock draw should keep apart (section 11).

**Round 2, in full.** Section C was the thinnest section (30% of the exam,
19% of the bank). Twenty items across all eight topics; every Section C notes
sub-topic now has a question. Standards audit 1 HARD, 11 PRECISION, 11
OBSERVATION; citation check 0 / 6 / 9; all applied. The HARD ERROR was a
second defensible answer: `cia1_d3_027` (presenting at a staff induction) had
an option a candidate could defend from a requirement in Standard 2.2 that the
explanation left out. The blind tester flagged it independently as borderline
ambiguous while still choosing the key, so the scorecard's "blind agreement"
alone would not have shown it: read the flags, not only the percentage.

| Measure | Round 1 | Round 2 |
|---|---|---|
| Cue test (options only, chance 25%) | 76%, then 68% | 75%, 75% after the fix pass, **65% after the last pass** (13 of 20) |
| Cue tester's high-confidence guesses | 4 of 25 | 6, then 4 of 20 (all right) |
| Final testers' sorting: needs the Standards, partly, test-taking alone | 5 / 15 / 5 of 25 | 6 / 10 / 4 of 20 |
| Flags left in the final round | 5 of 25 | 3 of 20, all TOO EASY: `cia1_d3_029` (subtraction settles it), `cia1_d3_033` (numeracy settles it), `cia1_d3_040` |
| Ambiguous items found and fixed | 0 | 1 (`cia1_d3_027`) |

Tags after round 2: a twenty-third principle, `weigh-cost-against-benefit`
(Standard 4.2 for audit work, a must; the considerations to Standard 14.4 for
recommendations and action plans, a should), written only because four items
turn on it in their final two (`cia1_d2_014`, `cia1_d3_019`, `cia1_d3_033`,
`cia1_d3_039`) and five notes sub-topics teach it. The rule for adding one:
at least three existing questions turn on it and the Standards support it.

What round 2 taught. A general fix pass ("remove the cue") did not move the
cue test at all; a pass aimed at the six items the cue tester had guessed with
high confidence, with the cue named, moved it ten points. So the cue tester's
confidence and cue go to the author item by item, and the second pass is
always the targeted one. The leak in Section C was one pattern: in "verdict:
reason" options the key's reason sounded like audit doctrine while the rivals
gave rules; the cure was a wrong option whose reason is true in general but
does not fit the stem's facts. Left unwritten because the opened sources are
too thin to carry a key: new items on 1C2.1 (culture and the control
environment rest on Background sources), 1C5.3 and 1C8.3. Two notes gaps were
found and left, because the notes format has no room in that sub-topic: 1C2.3
does not itself teach the two rules that `cia1_d3_023` and `cia1_d3_025` key
on (their provenance names the sub-topics that do, 1C7.1, 1A4.1 and 1A8.2);
the next notes pass on Section C should rebalance 1C2.3. Sibling groups for
the mock draw (section 11): pilot 018 with 039 and 040; 012 with 031; 020 with
034; 019 with 037; 017 with 033 and 038; 009 with 029 and 032.

**Round 3, in full.** Section A was the section furthest below its exam
weight; Section D had three notes sub-topics without a question. After this
round every Part 1 notes sub-topic in Sections A, C and D has a question.
Standards audits: Section A 0 HARD, 11 PRECISION, 6 OBSERVATION; Section D
1 / 10 / 7. Citation check 0 / 7 / 8. One item rebuilt in the last pass
(`cia1_d1_040`) got its own audit (0 / 4 / 3) before it was final. No key was
wrong and no blind tester flagged an ambiguous item. The HARD ERROR was
forbidden ground, not a wrong answer: `cia1_d4_026` first keyed one detective
control above the other two, which the syllabus line that groups them does
not say; the stem now gives the facts the key follows from, and section 8b
states the limit.

| Measure | Round 2 | Round 3 |
|---|---|---|
| Cue test (options only, chance 25%) | 75%, 75%, 65% | 68%, 68%, **76%** (19 of 25): Section A 12 of 17, Section D 7 of 8 |
| Cue tester's high-confidence guesses | 6, then 4 of 20 | 3, 4, then 2 of 25 |
| Final testers' sorting: needs the Standards, partly, test-taking alone | 6 / 10 / 4 of 20 | 5 / 15 / 5 of 25 |
| Flags left in the final round | 3 of 20 | TOO EASY `cia1_d1_045`, `cia1_d1_049`, `cia1_d4_021`, `cia1_d4_023`, `cia1_d4_026`; mild GIVEAWAY `cia1_d1_043` |
| Ambiguous items found and fixed | 1 | 0 |

What round 3 taught.
- **A 25-item cue test cannot tell 68% from 76%.** The last pass removed the
  cues the tester had named, the tester's confidence fell (two high-confidence
  guesses, fourteen low), and the score still rose, on lucky low-confidence
  guesses. Read the pooled figure and the trend: the three rounds' final
  measurements together are 49 of 70, **70%**, against the pilot's 91%. From
  the next round on, the cue test is also run once on a mixed sample of 50
  items drawn across rounds, so the number means something.
- **The first draft is now where the gain is.** Round 3's first draft scored
  68%, where rounds 1 and 2 started at 76% and 75%: the lessons written into
  the author brief carry over. The fix passes make items correct and
  unambiguous; they do not reliably make them harder.
- **Section D has a ceiling.** Seven of its eight new items were guessed from
  the options in every measurement, and its author dropped a dozen ideas that
  no opened source could carry (named schemes, who interviews, why hotlines
  work). Topic 1D4 has now used each distinct idea its sources support. Until
  The IIA's fraud practice guides are opened (members only; section 9), new
  Section D items will be fair but easy, and its share of the bank should not
  grow past its exam weight.
- **A pattern-breaking fix can itself be a cue.** `cia1_d1_040` was rebuilt so
  that "hold the request" was the key against three options that accept it;
  the cue tester and the final blind tester both named "three Accept, one
  Hold". An option set that breaks a pattern needs two of each kind.
- **A stated fact that makes an item fair can make it easy.** Section D's fix
  pass added the facts two keys needed; the second blind tester then saw the
  key restate the stem's last fact. When a fact is added to a stem, word the
  key differently and do not put the fact last.

Also from round 3: notes 1A4.3, 1A6.3 and 1D3.2 now teach three rules the new
questions key on (one bullet each had to be tightened to stay inside the
notes format); section 8b says what a syllabus line may carry (the engagement
types it lists as assurance or advisory services, classification only) and
that a line grouping several things does not rank them. Sibling groups for
the mock draw (section 11): `cia1_d1_037` with 002; 041 with 008 and 010; 043
with `cia1_d3_005`; 052 with 013; `cia1_d4_011` with 023 and 025 (and
`cia1_d2_016`); 018 with 028; 001 and 003 with 022; 002 with 021; 013 and 014
with 026.

**Two calibration measurements (20 Nov 2026, after round 3).** Both use the
cue test's own instructions and a tester with fresh context.

| Sample | Items | Guessed from the options alone |
|---|---|---|
| The pilot, final | 80 | 91% |
| Rounds 1 to 3 as merged, a random mixed sample | 50 | **78%** (39 of 50): Section A 14 of 23, B 6 of 7, C 12 of 13, D 7 of 7 |
| The IIA's own public sample questions (its sample page, all three parts) | 15 | **87%** (13 of 15), eight of the guesses with high confidence |

What they say. (1) The small per-round tests were optimistic: on 50 items the
rounds stand at 78%, not the pooled 70%, and the tester got 19 of 28
low-confidence guesses right, so the leak is not a phrase to delete: someone
who knows auditing can often tell what the right kind of answer looks like.
Section A's new items resist that (61%); Sections B, C and D do not yet.
(2) The IIA's own sample questions leak at least as much to the same test
(the tester named the same cues: absolutes in the wrong options, the option
that keeps internal audit in role, the option that sounds like the
Standards). Fifteen items is a small sample, two were partly recognized from
memory, and sample questions may be easier than live ones, so this is a
benchmark, not a proof. But it means **KaiSip's items already resist an
expert guesser at least as well as the official samples**, and that chasing
the cue score far below the official level buys little for a learner.

What changes from round 4:
- The cue test stays, read on the mixed 50-item sample after each round; the
  per-round figure is reported but no longer steers a pass by itself.
- The target is "at or below the official samples' level (87%), with Section
  A's level (about 60%) as what good looks like", not a number that must fall
  every round.
- The targeted second pass is no longer automatic. It runs for items a cue
  tester guesses with high confidence and a nameable, cheaply removed cue,
  and for any pattern a blind tester can state. The effort saved goes to what
  the audits keep finding: a second defensible answer, a key that claims
  more than its source, and a rule the notes do not teach.
- How the calibration was done, so it can be repeated: the sample page was
  already an opened source (research log, S22); an options-only copy and its
  keys were kept outside the repository and shown only to the cue tester,
  never to an author. No IIA question text is stored in the repository and
  none is used to write items.

**Round 4, in full.** Section B's two uncovered notes sub-topics now have
questions, so every Part 1 notes sub-topic has at least one. Standards audits:
Section B 0 HARD, 19 PRECISION, 7 OBSERVATION; Section C 0 / 12 / 8. Two
Section B items had their keys changed in the fix pass (to break the patterns
"going to the chief audit executive is always wrong" and "waiting is always
wrong"), so they got their own audit: `cia1_d2_031` sound (0 / 8 / 3);
`cia1_d2_033` one HARD ERROR (the stem gave no time left before the deadline,
so narrowing the scope was as defensible as rescheduling; plan 8b bars
choosing among a Standard's unranked options unless the stem settles it).
Citation check 0 / 4 / 6. No wrong key, and no blind tester flagged an
ambiguous item in any round. The usage limit of the model the session ran on
stopped two reviewers part way; the Section C audit had already saved its
results, and the other was rerun from the start on another model.

| Measure | Result |
|---|---|
| Cue test on the round's 22 (first draft) | 82% (18 of 22); seven high-confidence guesses, all right |
| Mixed 50-item sample across rounds 1 to 4, after the round | **70%** (35 of 50; four high-confidence guesses). By section: A 7 of 15, B 7 of 10, C 19 of 21, D 2 of 4. The round's own items in the sample: 13 of 15 |
| The same test on The IIA's 15 public sample questions (benchmark) | 87% |
| Final testers' sorting of the 22 | needs the Standards 8, partly 12, test-taking alone 2 |
| Flags left | TOO EASY `cia1_d2_040`, `cia1_d3_041`, `cia1_d3_045` (recall); close calls recorded, not ambiguous: `cia1_d3_043`, `044`, `051`, `cia1_d2_033` (option A could read as missing the deadline) |

What round 4 taught.
- **A re-keyed item is a new item.** Both items whose keys changed were
  audited again; one had a real error that neither the author nor the blind
  tester of the earlier form could have seen. The rule from round 3
  (`cia1_d1_040`) now holds twice: when a key changes, the item gets its own
  standards audit before its final blind test.
- **Section C leaks most.** On the mixed sample it stands at 19 of 21, while
  Section A stands near half. Its options often read as statements of
  doctrine, and its sources are thin (round 4's author found three areas with
  no further sourced lesson and dropped them). The next Section C round should
  start from scenarios where two duties are both real and the stem's facts
  pick one, which is the shape that resisted best in Section A.
- **The study notes caught up.** Ten notes lines were added or corrected in
  round 4 so that every rule a new question keys on is taught, and two notes
  that pulled a learner toward a wrong option were fixed.

**Round 5, in full.** Section A's twelve went to its thinnest topics;
Section C's twelve were written to a new brief: every item sets two duties
that are both real against each other, and only the stem's facts pick one.
Standards audits: Section A 0 HARD, 12 PRECISION, 8 OBSERVATION; Section C
1 / 14 / 6. Citation check 0 / 7 / 6. No key was wrong.

| Measure | Result |
|---|---|
| First blind test | Section A 12 of 12, nothing ambiguous; Section C 12 of 12 but **two flagged AMBIGUOUS** (`cia1_d3_057`, `063`), the first since round 2 |
| Final testers' sorting | Section A: needs the Standards 5, partly 5, test-taking 2. Section C first round: 6 / 6 / 0, the best profile of any section in any round |
| Cue test on the round's 24 (first draft) | 83% (20 of 24; two high-confidence guesses) |
| Mixed 50-item sample across rounds 1 to 5, after the round | **72%** (36 of 50): A 9 of 17, B 5 of 8, C 19 of 22, D 3 of 3 (after round 4: 70%; The IIA's own samples: 87%) |
| Flags left | TOO EASY `cia1_d1_055`; mild giveaway `cia1_d3_063` (the key alone uses both stem facts), `cia1_d3_061` |

What round 5 taught.
- **"Two real duties" makes Section C harder to answer but not harder to
  guess, and it raises the ambiguity risk.** Section C's first-draft items
  were the hardest of any round (none answerable by test-taking alone), but
  they produced the round's only HARD ERROR and both ambiguous flags: when both
  final options are real duties, a stem that leaves out the stage, the period
  or the condition makes both defensible. Keep the style, and add a rule to the
  author brief: **the stem states the stage reached, the period in scope and
  any condition the choice depends on.** `cia1_d3_057` (which escalation step
  had passed) and `cia1_d3_063` (the full-year scope, and then the Standard
  15.1 acknowledgment that decided it) needed three passes between them.
- **Section C's cue score is now a property of the subject, not of the
  writing.** Two rounds of changed technique moved it nothing (19 of 21, then
  19 of 22). Governance and control questions reward the measured,
  process-minded answer, and so does the real exam (The IIA's own samples:
  87% on the same test). Further passes aimed at the Section C cue score are
  not worth their cost; the audits' findings (a second defensible answer, a
  missing fact, an overstated rule) are what protects a paying learner.
- **Audit a reworded key before its final blind test, not beside it.** This
  round ran the two side by side on `cia1_d3_063` to save time; the audit then
  changed the item again, so it needed one more blind test. The order in
  section 6c stands.
- **A fixer's checks must cover every file it touched.** A fix to one Section
  A item, made during Section C's pass, exceeded a word limit that the fixer's
  own checks (run on Section C only) did not see; the coordinator caught it.
  Every pass now ends with the style check on all four files.

**Round 6, in full.** Section B's twelve went to its thinnest topics
(1B1, 1B3, 1B4, 1B5); Section A's twelve spread over all eight topics, with
every one now at or past 8 items. Standards audits: Section B 3 HARD (all in
`cia1_d2_044`, one cause), 17 PRECISION, 17 OBSERVATION; Section A 0 / 30 /
14. Targeted audits of the changed and new items: B 0 / 4 / 4, A 0 / 13 / 6.
Citation check 0 / 1 / 2. No key was wrong.

| Measure | Result |
|---|---|
| First blind test | Section B 12 of 12, nothing ambiguous (one UNCLEAR: a period with no year); Section A 12 of 12, nothing ambiguous (one GIVEAWAY) |
| Final blind test | Section B 12 of 12 (needs the Standards 5, partly 6, test-taking 1); Section A 12 of 12 (5 / 7 / 0), no flags in either |
| Cue test on the round's own items | First draft: B 11 of 12, A 10 of 12. After the fix pass: B 10 of 12, A 11 of 12 (most of A's right guesses low or medium confidence) |
| Mixed 50-item sample across rounds 1 to 6, after the round | **80%** (40 of 50): A 14 of 20, B 9 of 11, C 14 of 16, D 3 of 3; all 8 high-confidence guesses right (after round 5: 72%; The IIA's own samples: 87%) |
| Flags left | TOO EASY `cia1_d2_048` (the stem states that the cheaper fix does the same job); cue leaks `cia1_d2_045`, `047`, `050`, `052` (the independent or complete option) |

Replaced before merge (neither id reached main): `cia1_d2_043` first keyed on
Standard 15.1's disclosure of a nonconformance in a final communication, which
is the chief audit executive's seat and Part 3 ground (3C2a, 3D2b). **Parked
for Part 3:** testing began before the work program was approved, so the final
communication names the requirement missed, the reason and the impact instead
of claiming conformance. `cia1_d1_072` first repeated the lesson and the wrong
options of `cia1_d1_010` and `013`; it now keys Standard 7.2 (the chief audit
executive must help the board understand the qualifications the role needs; a
succession plan is a should).

Sibling items to keep apart in one mock (section 11): `cia1_d2_043` with
`cia1_d2_003` and `cia1_d2_041`; `cia1_d1_072` with `cia1_d1_015`;
`cia1_d1_068` with `cia1_d1_006` and `007`; `cia1_d2_042` with `cia1_d2_013`.

What round 6 taught.
- **Section B's leak is the Standards' own register.** After a fix pass that
  made keys share their kind with a rival, the ethics items still leaked where
  the key is the independent, outside or complete option (an independent
  confirmation, an outside actuary, every claim matched), because the Standards
  really do favour it. The mixed sample rose from 72% to 80%, driven by Section
  A's and Section B's new items. The next Section B brief asks for at least one
  wrong option per item in the same Standards-sounding register as the key.
- **A teaching field can carry a false rule while the key is right.** All
  three HARD errors were in `cia1_d2_044`'s tips and explanations, which taught
  that the board hears only the chief audit executive's own impairment;
  Standard 2.3 names the board for a staff auditor's too. Audits read the
  teaching fields as closely as the key.
- **Part 1 depth is a real boundary.** Two items drifted into other parts: a
  conformance disclosure (Part 3) and a sufficiency verdict on evidence (Part 2,
  2B2). The second was kept in Part 1 by asking for the skepticism decision
  (rely or seek more), which bullet 1B5e covers.
- **A stem must not state a doubtful fact about real law.** `cia1_d2_043`'s
  first stem claimed what Indonesian and Singapore data law allow; it now has
  legal counsel confirm the breach, so the item teaches nothing about either
  country's law.
- **Section A is close to its supply of new lessons.** At 76 items the author
  found no new lesson in 1A3 or 1A6, and the audit cut one item that repeated
  an old one. The next Section A round starts from the syllabus bullets with
  the fewest items, not from the topics.
- **The originality gate now reads the 2026 Statements of Position.** Two
  Section A items followed the Three Lines statement's sentences, which the
  gate could not see from its default reference; `--fetch` and a complete
  reference now include both statements.

**Round 7, in full.** Section B's twelve went two to each topic, to a
brief built on round 6's lesson: the independent, outside, complete or
cautious option is wrong in at least three items, and a firm decline is keyed
where the Standards require one. Section C's twelve went mostly to its
thinnest topics, 1C2 and 1C3. Standards audits: Section B 0 HARD, 18
PRECISION, 11 OBSERVATION; Section C 0 / 20 / 10. Targeted audits of the
reworded and new items: B 0 / 3 / 17, C 0 / 6 / 4. Citation check 0 / 0 / 2.
No key was wrong, and no blind test raised an AMBIGUOUS flag.

| Measure | Result |
|---|---|
| First blind test | Section B 12 of 12 (one UNCLEAR: who was offered the favor); Section C 12 of 12 (three GIVEAWAY) |
| Final blind test | Section B 12 of 12 (needs the Standards 2, partly 7, test-taking 3); Section C 11 of 11 (4 / 5 / 2), no AMBIGUOUS flag in either |
| Cue test on the round's own items | First draft: B 10 of 12, C 9 of 12 (Section C's best). After the fix pass: B 10 of 12, C 11 of 12 (the fixes made pairs where the key is the one with the sounder reason) |
| Mixed 50-item sample across rounds 1 to 7, after the round | **74%** (37 of 50): A 11 of 17, B 9 of 13, C 15 of 17, D 2 of 3; all 5 high-confidence guesses right (after round 6: 80%; The IIA's own samples: 87%) |
| Flags left (candidates for the hardening pass) | test-taking alone: `cia1_d2_055`, `060`, `062`; `cia1_d3_069` (only the key breaks the stated rule), `cia1_d3_071` (counsel's advice in the stem, kept so the item states no general claim about a real licence regime) |

Cut: `cia1_d3_070` twice. The first draft repeated `cia1_d3_004`'s lesson and
needed Standard 13.2's review-and-update clause (Part 2, 2A5); the
replacement asked how significant a finding is when no tolerance is set
(Part 2, 2B6c) and mirrored `cia1_d3_056`. **Parked for Part 2:** both
scenarios (2A5: on a first engagement the plan's risk assessment is only an
input; 2B6, challenge code D6: weigh likelihood and impact with or without a
tolerance, the board setting tolerance under the 2026 ERM statement).

Sibling items to keep apart in one mock (section 11): `cia1_d3_065` with
`cia1_d3_006`, `cia1_d3_072` and `cia1_d1_045`; `cia1_d3_071` with
`cia1_d1_020` and `cia1_d1_063`; `cia1_d2_053` with `cia1_d2_001`;
`cia1_d2_057` with `cia1_d2_008` and `035`.

What round 7 taught.
- **Making the cautious option lose worked, and the leak moved.** Round 6's
  cue was "pick the independent or complete option"; with that option wrong in
  six Section B items, the tester switched to "pick the balanced,
  proportionate one" and to "drop the extreme or passive ones". The mixed
  sample fell from 80% to 74%. The next lever is a wrong option that is itself
  measured and proportionate, with a wrong reason.
- **A notes line can teach against a key.** Notes 1C8.3 said a framework binds
  only through a law or regulator; `cia1_d3_065` keys a loan contract making a
  code binding. A learner from the notes would have chosen the wrong option.
  Two blind testers and the audit caught it; the line (and the same wording in
  1C1.3) now names contracts and adopted policy. Every round's audit reads the
  notes beside the key.
- **A principle can teach against a key too.** "Disclose first, then
  safeguard" left out Standard 2.2's avoid step, so read alone it favored
  accepting a favor and disclosing it, `cia1_d2_057`'s wrong option. Its
  nuance now says avoid first, and still tell the right party.
- **Fixing an odd-one-out key can create a pair the tester splits by reason.**
  Giving a rival the key's verdict with a wrong reason removed the "only
  Incomplete" cue but let the tester pick the sounder reason; the cue score on
  the round's own Section C items rose from 9 to 11 of 12, while the mixed
  sample fell. Read the mixed sample, not a 12-item draft.
- **Section C's Part 2 border is engagement evaluation.** Both versions of
  `cia1_d3_070` drifted into how an engagement weighs a finding. A dropped slot
  costs less than a third rewrite; ids not yet on main may be closed up.

**Round 8, in full.** Section A's items went to its thinnest sub-topics and
to syllabus bullets no item tested; Section C's to its sub-topics with one
item. Each author left one planned slot empty rather than repeat a lesson or
cross into Part 2. Standards audits: Section A 4 HARD (in two items), 13
PRECISION, 10 OBSERVATION; Section C 1 / 13 / 7. Targeted audits of the
changed keys: A 0 / 6 / 3, C 0 / 3 / 2. Citation check 0 / 0 / 0, the first
clean one. No key was wrong; no blind test raised an AMBIGUOUS flag.

| Measure | Result |
|---|---|
| First blind test | Section A 10 of 10, no flags; Section C 11 of 11, no flags and no test-taking item (the first such section) |
| Final blind test | Section A 9 of 9 (needs the Standards 3, partly 6, test-taking 0; one NOTES CONFLICT flag, since fixed); Section C 11 of 11 (3 / 7 / 1) |
| Cue test on the round's own items | First draft: A 9 of 10, C 10 of 11. After the fix pass: A 9 of 9 (two high-confidence), C 9 of 11 |
| Mixed 50-item sample across rounds 1 to 8, after the round | **80%** (40 of 50): A 13 of 18, B 10 of 12, C 16 of 18, D 1 of 2; all 8 high-confidence guesses right. Rounds 5 to 8 read 72%, 80%, 74%, 80%: a level, not a trend, with about six points of sampling noise (The IIA's own samples: 87%) |
| Flags left (candidates for the hardening pass) | test-taking alone: `cia1_d3_076` (the reworded key states the principle in plain words) |

Cut: `cia1_d1_081` (a law covering everything may serve as the charter: the key
rested on Standard 6.2's "may", but 6.1 requires the charter to include a mandate
set by law, so the runner-up was defensible; `cia1_d1_007` already teaches the
lesson). Fixed HARD errors: `cia1_d1_080`'s stem said the Standards do not
require a disagreement methodology (Standards 13.1 and 14.4 do); `cia1_d3_086`'s
key rested on COSO's collusion limit, a Background source, and now rests on the
Standards' glossary and Standard 14.2.

Sibling items to keep apart in one mock (section 11): `cia1_d3_083` with
`cia1_d3_011`; `cia1_d3_079` with `cia1_d3_005` and `023`; `cia1_d1_082` with
`cia1_d1_052`; `cia1_d1_078` with `cia1_d1_025`; `cia1_d1_084` with
`cia1_d1_015` and `072`.

What round 8 taught.
- **The supply of new lessons is the limit now, not the writing.** Both authors
  left a slot empty after searching the thinnest sub-topics, and one Section A
  item was cut because an older item already taught it. From here, rounds start
  from syllabus bullets and accept fewer items over repeats; the sale minimum of
  500 may need Part 1's remaining room to come from Sections B and D.
- **Notes and principles keep teaching against keys.** The notes defined the
  board only as the top governing body (pulling to 078's wrong option), a notes
  example gave away `cia1_d3_085`, and three principles read alone favored a
  wrong option (`cia1_d3_084`, `cia1_d1_085`, `cia1_d3_078`). All were fixed;
  reading notes and principles beside every key stays a standing step.
- **A key cannot rest on a Background source even when it is right.** `cia1_d3_086`'s
  lesson (collusion defeats any split of duties) is true, but only COSO says it;
  the item now keys what the glossary says and puts collusion in a wrong option's
  reason.
- **The cue shifted again, to principle against excuse.** With the cautious and
  the textbook-phrase cues removed, testers picked the option stating a real
  principle over options leaning on side conditions. The next lever is a wrong
  option that also cites a real principle, applied wrongly.
- **The mixed sample has settled.** Four rounds read 72% to 80%. Further cue
  work buys little; audits and blind tests still find what matters (two HARD
  stems this round).
- **Design against operation reaches three questions** (`cia1_d3_035`, `073`,
  `085`), the bar for a new principle; it is added only if the standards
  auditor finds Standards support (next round).

**Round 9, in full.** Both authors started from the thinnest sub-topics and
syllabus bullets and left slots empty rather than repeat a lesson: Section B
delivered 10 of 12, Section C 7 of 12. Standards audits: Section B 1 HARD, 19
PRECISION, 8 OBSERVATION; Section C 0 / 22 / 11. Targeted audit of the changed
keys (both sections): 1 / 1 / 10. Citation check 0 / 0 / 1. No key was wrong;
no blind test raised an AMBIGUOUS flag.

| Measure | Result |
|---|---|
| First blind test | Section B 10 of 10 (needs the Standards 1, partly 7, test-taking 2); Section C 7 of 7 (1 / 6 / 0) |
| Final blind test | Section B 10 of 10 (1 / 8 / 1); Section C 7 of 7 (0 / 6 / 1); two UNCLEAR stems (`cia1_d2_066`, `cia1_d3_089`) fixed and re-tested 2 of 2 |
| Cue test on the round's own items | First draft: B 9 of 10, C 7 of 7 (four high-confidence). After the fix pass: B 9 of 10 (two high), C 6 of 7 (none high) |
| Mixed 50-item sample across rounds 1 to 9, after the round | **86%** (43 of 50): A 13 of 16, B 14 of 14, C 14 of 18, D 2 of 2; all 6 high-confidence guesses right. Rounds 5 to 9: 72%, 80%, 74%, 80%, 86% (The IIA's own samples: 87%) |
| Flags left (candidates for the hardening pass) | test-taking alone: `cia1_d2_069` (plain words is the common-sense pick), `cia1_d3_091` (the option pairing gives it away) |

HARD errors fixed: `cia1_d2_070` taught that confidential information goes out
only under a legal duty (Standard 5.2 also allows release to authorized
parties); `cia1_d3_091`'s wrong explanation invented a rule that internal audit
must test the steps itself (Standard 9.5 lets the chief audit executive rely on
other assurance providers).

**A 24th principle, design or operation** ("judge design and operation as two
questions, and name which failed"): the standards auditor found Standards
support (the glossary's control processes are designed and operated; the
considerations to Standards 4.2, 13.2, 13.3, 13.6 and 14.3 judge design
adequacy and operating effectiveness apart), written at should strength, and
three questions that turn on it (`cia1_d3_018`, `066`, `073`; `091` added).
Two of the three first proposed (`035`, `085`) did not turn on it.

Sibling items to keep apart in one mock (section 11): `cia1_d3_090` with
`cia1_d3_060` and `036`; `cia1_d2_071` with `cia1_d2_025`; `cia1_d2_066` with
`cia1_d3_044`; `cia1_d3_087` with `cia1_d3_011` and `083`.

What round 9 taught.
- **The teaching material keeps contradicting keys, and the audits keep
  catching it.** This round: the notes and glossary said controls are what
  management does (`cia1_d3_090`) and that risk management keeps risk within
  appetite (`cia1_d3_092`); six principles, read alone, favored a wrong option
  (`cia1_d2_065`, `066`, `071`; `cia1_d3_090`, `092`). Each was fixed to what the
  Standards say. A built file (the Part 1 glossary) must be rebuilt in the same
  step as its shared source, and the final review week's cheat sheet must list
  every principle (a gate caught both).
- **Section B has reached the cue ceiling.** Every Section B item in the mixed
  sample was guessed; the measured, by-the-rule option wins because the
  Standards are measured. New Section B items will not lower it; reworking the
  most-guessed existing ones might. Round 10 does that before adding more.
- **Lessons are running out in the thinnest sub-topics.** Seven planned slots
  were left empty, and the authors named the existing items each idea would have
  repeated. The remaining room toward 500 is in the syllabus bullets, Section A
  and C topics with depth (risk responses, control types, governance roles), and
  Section D once more sources are opened.
- **A stem's missing condition still shows up late.** Two UNCLEAR stems
  (the cost of the alternative control; whether the buyer stepped aside)
  survived two passes and were caught by the final blind test. The author brief
  already asks for every condition; the blind test remains the net.

**Round 10, in full: hardening Section B.** After round 9's mixed sample
guessed every Section B item, a fresh options-only test of all 74 Section B
items scored 82% (4 high-confidence). Eighteen items were chosen from every cue
file since round 4 (those guessed right most often and most confidently;
`cia1_d2_062` in all seven tests it appeared in), most of them pilot items. Two
authors reworked their options so the key no longer stood alone: a wrong option
given the key's measured, Standards-sounding register with a wrong reason;
absolutes removed; paired verdicts. Lessons, key letters and ids were kept; six
key texts were reworded. Standards audit: 0 HARD, 3 PRECISION, 3 OBSERVATION; no
rewritten option became defensible and nothing was reverted. Final blind test 18
of 18 (needs the Standards 6, partly 10, test-taking 2: `cia1_d2_018` and `020`,
where the stem states the deciding rule).

| Measure | Before | After |
|---|---|---|
| Options-only cue test on the 18 | guessed right in nearly every cue file, often with high confidence | 18 of 18 right, but **1** high-confidence guess (5 low) |
| Pick-longest across Section B | 19.6% | 16.9% |
| Blind tester's "needs the Standards" on the 18 | mostly partly or test-taking in earlier rounds | 6 of 18 |

What round 10 taught.
- **The options-only test measures knowledge as well as cues.** After the
  rework the tester still chose every key, but on knowledge: it named no wording
  cue and was sure of only one item. In Section B each option is a complete
  statement of conduct, so a reader who knows auditing ethics can judge it
  without the stem (the same is why The IIA's own samples score 87%). From here
  the cue test is a giveaway detector (a key alone in its kind or register, an
  absolute on a wrong option, an echoed stem phrase), not a number to push down;
  the blind tests and audits are what protect a paying learner.
- **Hardening is safe when audited like new writing.** Giving wrong options the
  key's register is where defensible second answers come from; a full audit that
  argues every rewritten option found none here, but it found three precision
  slips (a stem that assumed a fact, a tip that overgeneralized, an explanation
  more absolute than its Standard).
- **The pilot items were the weakest and are now in line.** The plan's note
  that pilot items were candidates for a later hardening pass is done for
  Section B; Sections A, C and D pilot items remain candidates.

**Round 12, in full.** The first round written from the bullet coverage map
(`docs/content/CIA_P1_COVERAGE.md`) instead of the notes sub-topics. Each author got
named bullets: the six with no item (1A5d, 1A6d, 1B4b, 1B4c, 1B4f, 1B5b), the five
judge bullets with no analysis item (1B4h, 1C5c, 1C7b, 1D2b, 1D3a), Section A's
Challenge topics, and siblings for one-item bullets under the revised sibling rule.
Standards audits: Section A 0 HARD, 17 PRECISION, 15 OBSERVATION; Section B 0 / 18 /
9; Sections C and D 5 / 34 / 10, all five HARD on one item (`cia1_d3_099`: the cited
2026 risk management statement puts aggregating ratings under its assess element,
so a second answer was defensible; the stem, options, explanations and tip were
rebuilt). Targeted audits of every changed key: A and B 0 / 8 / 2, C and D 0 / 6 / 8.
Citation check 0 / 1 / 5. No key was wrong.

Final blind tests: Section A 11 of 11; Section B 10 of 10; Sections C and D 10 of 10.
Three items were still classed answerable by test-taking: `cia1_d4_033` (the stem's
"however met" echoed the key; rebuilt, then audited again, 0 / 6 / 2, and re-tested
"partly"), `cia1_d2_075` (key reworded so "due care" is named) and a 1B4g trust
sibling of `cia1_d2_059`. That sibling was rebuilt twice and stayed a giveaway each
time: its lesson (regular two-way contact builds trust) is common sense, and the one
angle that needs the Standards (rotating auditors) is already `cia1_d2_037`. It was
cut, and the last Section B item took its id, as neither was on main.

Tagging: two retags (`cia1_d2_076` to management-owns-risk-and-action: the owners'
view is an input to the auditor's judgment of significance; `cia1_d1_101` to
disclose-then-safeguard), and six principle texts fixed where, read alone, they
favored a wrong option. Notes and principles were again read beside every key:
"authority levels are classed as preventive" (note 1D4.3) overstated the syllabus,
which says they may prevent fraud.

Sibling items to keep apart in one mock (section 11): `cia1_d1_096` with
`cia1_d1_063`; `cia1_d1_097` with `cia1_d1_010`; `cia1_d1_098` with `cia1_d1_052`;
`cia1_d1_099` with `cia1_d1_045`; `cia1_d1_103` with `cia1_d1_016`; `cia1_d2_080`
with `cia1_d2_061`; `cia1_d2_081` with `cia1_d2_015`; `cia1_d2_082` with
`cia1_d2_020`; `cia1_d2_083` with `cia1_d2_059`; `cia1_d4_031` with `cia1_d4_012`;
`cia1_d4_032` with `cia1_d4_019`; `cia1_d4_033` with `cia1_d4_016`; `cia1_d4_034`
with `cia1_d4_014`; `cia1_d4_035` with `cia1_d4_004`, `cia1_d4_022` and
`cia1_d4_003`; `cia1_d3_101` with `cia1_d3_011` and `cia1_d3_099`. Section D's sibling
share is 6 of 35 (17%), above the rule's 15% until D passes 40 items;
`cia-cross-part-reviewer` confirms at the next cross-part pass. `cia1_d2_078` overlaps
Part 3 bullet 3B2c (a dynamic plan's timely update): a Part 3 item on a mid-year
trigger is its cross-part sibling.

What round 12 taught.
- **Writing from bullets closes gaps that writing from notes left open.** One round
  took the bank from 6 empty bullets and 5 below depth to none of either.
- **A sibling of a common-sense lesson cannot be hardened.** If the only way to need
  the Standards is a lesson another item already teaches, cut the sibling.
- **Rebuilt options leave stale teaching text behind.** After options change, re-read
  key_concept, pre_read, framework_ref and the tips, not only the explanations.
- **Echo hides in single words.** The blind tester caught "however met" and the
  targeted audit then caught "pays" against "the pay signal"; check the stem's verbs
  and nouns against the key, not only its phrases.
- **A teaching field's strength still slips** ("needs board approval" for a should;
  "classes" for "may"). The targeted audit of changed keys keeps catching it.

**Round 11, in full.** Both authors worked from syllabus bullets and the
thinnest sub-topics; Section A delivered 7 of 12 and Section C 5 of 12, with
every empty slot named against the items or Background sources its ideas would
have repeated. Standards audits: Section A 0 HARD, 22 PRECISION, 11 OBSERVATION;
Section C 0 / 14 / 10. Targeted audit of changed keys (both): 0 / 12 / 6.
Citation check 0 / 2 / 1. No key was wrong; no blind test raised an AMBIGUOUS
flag. Final blind tests: Section A 7 of 7 (needs the Standards 3, partly 4);
Section C 5 of 5 (2 / 2 / 1; `cia1_d3_094` stays answerable by arithmetic once
the limits are added, a hardening candidate). The mixed 50-item cue test was not
run: after round 10 the cue test is a giveaway detector, and the per-section
checks did that job.

`cia1_d3_098` first repeated `cia1_d1_092`'s lesson and wrong options (who
chooses risk responses); it was reworked, and its final two now turns on
supervising a risk team not being owning its decisions. "The weakness sits at the
step that first fails" was not added as a principle: the standards auditor found
it is root-cause-over-symptom applied to a chain, so it went into that principle's
nuance and triggers. Notes and glossary that taught against keys were fixed (the
second line includes targeted assurance and managers' self-assessment is first
line; internal audit may hold a second-line role with safeguards but never choose
a risk response; appetite can be an amount), and six principles that read alone
favored a wrong option.

**The sale gate was revised** (section 3, decision 4): the product manager and
the behavioral scientist agreed that a fixed 500 forces padding once lessons run
out, and replaced it with full syllabus coverage at depth plus three exam-weighted
forms, with held-back items released after their mock and a narrow sibling rule.

Sibling items to keep apart in one mock (section 11): `cia1_d1_087` with
`cia1_d1_058`; `cia1_d3_098` with `cia1_d1_092`; `cia1_d3_096` with
`cia1_d1_075`; `cia1_d3_095` with `cia1_d3_083` and `087`.

What round 11 taught.
- **The thinnest sub-topics are exhausted at one lesson per item.** Seventeen
  of 24 planned slots were left empty. The bank is near the end of distinct
  lessons from the opened sources; growth now comes from the sibling rule, Section
  D's sources, and Parts 2 and 3.
- **Two authors in one round can write the same lesson in two sections.**
  `cia1_d3_098` and `cia1_d1_092` both turned on who chooses risk responses; the
  audit caught it. Rule 11 checks run across sections, not only within one.
- **Every round still finds teaching material that contradicts a key.** This
  round: five notes or glossary lines and six principles. Reading the notes,
  glossary and principles beside each key stays a standing step.

**Principle tags.** After the last fix the mindset coach re-read all 80
items and re-tagged 7 to the principle that decides the final two. Every one
of the 20 principles has at least one Part 1 question. Eleven items have no
principle that fits well and keep a nearest tag: two on competency
(`cia1_d2_012`, `cia1_d4_018`), which points to a **missing principle**
("have the skills, get them, or decline": Standards 3.1 and 8.2; write it with
the next round, with the quality principle planned for Part 3); one on
confidentiality (`cia1_d2_017`); and eight definition items, which turn on
knowing a term, not on a way of thinking (expected at the Describe and
Recognize level; they stay with the nearest reading principle).

**Challenge ids.** The Challenge id map was started clean on 20 Nov 2026,
before anything reached main (the pilot's rewrites had retired three ids that
no learner ever saw). From the first merge on, it is append-only and
`check_ids.py` holds it against main.

**The glossary start** (20 Nov 2026): 140 terms written from the notes, then
an independent audit of every term against the opened Standards: 1 HARD
ERROR (the board's approvals were counted as three; Standard 6.3 also names
the resource plan), 17 PRECISION, 34 OBSERVATION, all applied, and 13 terms
added, for 153. Four definitions changed in the notes too, so that glossary
and notes still say the same thing. The same miscount sat in one line of the
Part 1 exam guide and was corrected. The audit also led to a new gate
(`check_glossary.py`: links, packs, duplicates, older names, and a definition
that differs from the notes) and a fix to the Standards-glossary parser (57
entries, one was being lost).

**The CISA bridge outline** (`docs/content/CIA_CISA_BRIDGE_OUTLINE.md`,
20 Nov 2026) plans 28 bridge sub-topics, 45 contrasts and a term table. Its
section 7 lists what is still open before the bridge notes are written: where
the CISA aside sits in the notes format and how the bridge reaches the phone
(app-side, with section 11), nine proposed additions to the stale-terms gate
(`cia-standards-auditor` and `cia-currency-checker` decide), who writes the
section-level text of the generated Challenge notes, and that no ISACA page
was opened (the bridge cites no ITAF number). Free bridge notes would count as
published, so they wait for the licence question in section 9.

What the next round changes because of this: the scaffold of every round
states how it meets rules 2 to 5 of section 6b before writing starts; the
learnable patterns above are given to the author as patterns to break (some
keys must be the firm action, some wrong options must be the measured one);
Sections B and D get the most attention, because that is where test-taking
alone still works.

## 8. Topical Requirements calendar

Topical Requirements enter the exams on dates. The dates and their sources are
in `data/cia/shared/currency.json` (`topical_requirements`) and the blueprint.
An item that rests on a requirement that is not testable yet carries the date
in `testable_from`; `check_currency.py` enforces it, and the mock and
free-sample pools leave the item out until then. `cia-currency-checker`
re-opens the dates every round.

## 8b. Part 1 notes: what they rest on, and what must not carry a key

The Part 1 notes (`data/cia/cia1/notes/d{1..4}.json`: 28, 22, 25 and 18
sub-topics) were written from opened sources only, then audited by
`cia-standards-auditor` one section at a time (4 real errors, 51 precision
points and 29 suggestions across the four sections, all applied or answered),
read by `learner-reader`, and compared across sections by
`cia-cross-part-reviewer`. Every rule line says whether it is a **must** (a
requirement), a **should** or **may** (a consideration), or sound practice
with no Standards line behind it.

Where the opened sources stop, the notes stay general, and **no question may
be keyed on these points** until The IIA's practice guides or the textbook
are opened (they need IIA membership or a purchase):

| Topic | Do not key on |
|---|---|
| 1A4 | Any definition or ranking of "limited" against "reasonable" assurance beyond: the Standards name both, define neither, the level follows the nature, timing and extent of the procedures, and assurance is never a guarantee |
| 1A5, 1A6 | Detail of performance, quality, privacy and culture audits, due diligence, data privacy work or process mapping (concept level only) |
| 1A8 | Wording from the superseded 2020 Three Lines paper; the model comes from The IIA's 2026 Statement of Position, not the Standards |
| 1B2 | A former responsibility that ended more than 12 months ago (the "must refrain" rule has no time limit; only the presumption for assurance is tied to 12 months) |
| 1B3 | Which of reassign, reschedule, adjust the scope or outsource is "best" unless the stem settles it (Standard 2.3 lists them as options with no ranking) |
| 1B4 | Named negotiation styles, change models or other soft-skill techniques |
| 1C1 | Named governance codes other than the Three Lines Model |
| 1C4 | Borderline risk-category cases |
| 1C5 | Who sets risk tolerance (the sources differ) |
| 1C7 | "Directive" or "corrective" against a plausible "preventive" or "detective"; the definition of a compensating control |
| 1C6, 1C8 | COSO component or principle names (COSO is background only) |
| 1D1 | Named fraud schemes (lapping, kiting, skimming and the like); whether all three sides of the fraud triangle must be present |
| 1D3 | A fixed list of red flags; "never confront" or "bypass anyone involved" as CIA rules (they are sound practice, not Standards lines) |
| 1D5 | Interviewing technique, investigation steps, chain of custody |

Items that rest on the Third-Party or Organizational Behavior Topical
Requirement or its user guide carry `testable_from` (2027-03-01 and
2027-06-01).

**What the syllabus itself may carry (decided 19 Nov 2026, on the Section D
audit).** The Part 1 syllabus is an opened IIA document, so a key may rest on
exactly what one of its lines states, cited first: the three fraud triangle
conditions by name (1D1a), authority levels as preventing fraud (1D4c),
hotlines, reconciliations and supervisory reviews as detecting it (1D4d),
and, decided 20 Nov 2026 on the Section A round 3 audit and citation check,
the engagement types the syllabus lists under topic 1A5 (assurance services)
and topic 1A6 (advisory services), each as that kind of service: for example
an audit of the management reporting process as an assurance service (1A5g)
and due diligence as an advisory service (1A6c). Nothing beyond those
classifications: what the work consists of
still comes from the Standards' glossary or waits for a practice guide, and a
syllabus line that groups several things together does not rank them (round
3's `cia1_d4_026` first keyed one detective control above the other two, which
the line does not say). `docs/content/CIA_LENS.md` says the same.

## 9. Legal position and what waits on the owner

The full rule KaiSip follows is in the blueprint ("Copyright, licence and
marks"). In short: every note and question is KaiSip's own writing; the
Standards are cited by number and title; nothing longer than a short
attributed phrase is quoted; no IIA file is stored in the repository; no IIA
practice question, textbook or prep provider's material is used; no prep
provider's question bank is opened.

**Owner item 1: The IIA's licence position (19 Nov 2026).**
`app-store-compliance-reviewer` opened The IIA's licensing and copyright
pages. The licensing page says that all commercial use of The IIA's content
and trademarks requires a licence, and its examples include exam preparation
and inclusion in software (including AI); it exempts fair use with
attribution; it treats adaptations of its content as needing a licence. The
copyright notice allows quoting small portions with attribution. The Standards
PDF is marked for individual personal use. KaiSip holds no licence.

The owner asked: do we need the licence when the questions are original? The
answer given (not legal advice):

- Copyright protects wording, not ideas or facts. Original questions and
  notes copy nothing; a standard's number and title are facts; naming the exam
  to say what a product is for is descriptive use, as long as no logo is used
  and no approval is implied. So a licence is probably not strictly required
  by law for what KaiSip plans.
- The IIA's stated position is wider than that, and it can act on it. The
  practical risk is a complaint that removes a store listing, not a court case.
- The course is not only practice questions: notes, glossary and exam guides
  sit closer to the grey zone, because explaining a rule can drift into
  restating it. The originality gate guards this, and it is the part to watch.
- A licence would buy permission to use The IIA's content and marks and a
  listing as a licensed provider. Listed prices: Training Provider Licence
  US$500 a year for an IIA member or US$1,000 otherwise for a sole proprietor,
  US$1,250 or US$2,500 for 2 to 5 users; a separate Software Developer Licence
  (content inside software) at a variable price. The page also says licensed
  content may not go into a publicly available AI system.

**What others do (store listings opened 19 Nov 2026).** The IIA's public list
of licensed training providers has 13 names, among them Becker, Gleim and
HOCK; Becker's app says it is built in official partnership with The IIA. The
small CIA prep apps on sale in the App Store and Google Play (from iCert,
Learn-Train Inc, Snap Prep OU, Cargo Teleport Inc, NUPUIT and The Flash Prep)
are not on that list, and most say in their listing that they are not
affiliated with or endorsed by the certifying body, which is the model KaiSip
uses for CISA. They are still on sale, some last updated in 2024 and 2025.
That shows tolerance, not permission, and The IIA does not publish who holds
its separate Software Developer Licence. Several of them put "IIA-CIA" in the
app name and promise a pass, which KaiSip's rules forbid, and at least one
still names the parts as the 2019 exam did, so being right for the 2025
syllabus is a selling point.

**Owner decision (19 Nov 2026):** keep building in the private repository,
the same way as CISA (original content reviewed against the official framework);
publish, sell and show nothing until the licence question is settled. The free
sample and the store listing count as published. **Before any pack goes on sale**
the owner settles this, by asking licensing@theiia.org (expect "yes, you need
one") or with a short consult with an intellectual-property lawyer.

**Owner item 2: prices** (section 3, decision 6): decide later.

**Sources the owner may need to supply** (they block a key only if a question
needs them; until then questions rest on what was opened): IIA membership
(many Practice Guides and GTAGs are members only) and the textbook on the
reference list. The blueprint's reference table marks each one.

## 10. Names and store copy (draft, not approved)

growth-marketer drafted these inside the store length limits;
app-store-compliance-reviewer drafted alternatives. Neither set is final: the
product name is decided with the price.

| Pack | Play product name (55 characters at most) | In-app label |
|---|---|---|
| cia1, cia2, cia3 | "KaiSip Internal Audit, 6 months (for CIA® Part 1)" (and Part 2, Part 3) | CIA® Part 1 |
| ciac | "KaiSip Audit Bridge, 6 months (for CIA® Challenge Exam)" | CIA® Challenge Exam |

Rules: KaiSip or a generic course name first and the exam after "for"; never
"Pass", no pass promise, no hint of endorsement; no mark in the app name or
icon. Bridge line (draft): "From IT audit to the whole internal audit
function: a bridge for CISA® holders preparing for the CIA® Challenge Exam."
The trademark notice and the no-affiliation line are in the blueprint.

## 11. Before the CIA packs are wired into the app

Found by `mobile-app-engineer` on 19 Nov 2026 by reading the app code. None of
this blocks content work; all of it is needed before a pack is switched on.

- `mobile/src/content/certifications.ts`: add The IIA as an issuer and the four
  exams. **Not now**: the file is a hashed source of the website's
  `assets/kaisip-cloud.js` (any edit forces a website bundle rebuild), and
  `trademark-notice.test.ts` asserts exact strings. The ready-to-paste block:

```ts
export const IIA: CertIssuer = { id: 'iia', name: 'The IIA' };
// TO VERIFY before pasting: registration wording (USPTO), mindset wording, difficulty mix, short names.
const IIA_TM = 'Not affiliated with or endorsed by The IIA. CIA is a trademark of The IIA.';
const IIA_MIX = { analysis: 0.3, application: 0.5, foundational: 0.2 };
const IIA_NOTE = 'The IIA reports scaled scores from 250 to 750; 600 is the passing mark.';
const IIA_BASE = { issuer: IIA, mindset: IIA_MINDSET, trademarkNotice: IIA_TM, trademarkRegistered: false, status: 'coming_soon' as const };
  { id: 'cia1', name: 'CIA Part 1', fullName: 'Internal Audit Fundamentals', ...IIA_BASE,
    exam: { questions: 125, minutes: 150, difficultyMix: IIA_MIX, passingNote: IIA_NOTE },
    domains: [
      { id: '1', name: 'Foundations of Internal Auditing', short: 'Foundations', weight: 35, tone: 0 },
      { id: '2', name: 'Ethics and Professionalism', short: 'Ethics', weight: 20, tone: 1 },
      { id: '3', name: 'Governance, Risk Management, and Control', short: 'GRC', weight: 30, tone: 2 },
      { id: '4', name: 'Fraud Risks', short: 'Fraud', weight: 15, tone: 3 } ] },
  { id: 'cia2', name: 'CIA Part 2', fullName: 'Internal Audit Engagement', ...IIA_BASE,
    exam: { questions: 100, minutes: 120, difficultyMix: IIA_MIX, passingNote: IIA_NOTE },
    domains: [
      { id: '1', name: 'Engagement Planning', short: 'Planning', weight: 50, tone: 0 },
      { id: '2', name: 'Information Gathering, Analysis, and Evaluation', short: 'Evidence', weight: 40, tone: 1 },
      { id: '3', name: 'Engagement Supervision and Communication', short: 'Supervision', weight: 10, tone: 2 } ] },
  { id: 'cia3', name: 'CIA Part 3', fullName: 'Internal Audit Function', ...IIA_BASE,
    exam: { questions: 100, minutes: 120, difficultyMix: IIA_MIX, passingNote: IIA_NOTE },
    domains: [
      { id: '1', name: 'Internal Audit Operations', short: 'Operations', weight: 25, tone: 0 },
      { id: '2', name: 'Internal Audit Plan', short: 'Audit Plan', weight: 15, tone: 1 },
      { id: '3', name: 'Quality of the Internal Audit Function', short: 'Quality', weight: 15, tone: 2 },
      { id: '4', name: 'Engagement Results and Monitoring', short: 'Results', weight: 45, tone: 3 } ] },
  { id: 'ciac', name: 'CIA Challenge', fullName: 'CIA Challenge Exam', ...IIA_BASE,
    exam: { questions: 150, minutes: 180, difficultyMix: IIA_MIX, passingNote: IIA_NOTE },
    domains: [
      { id: '1', name: 'Internal Audit Professionalism and Quality', short: 'Professionalism', weight: 20, tone: 0 },
      { id: '2', name: 'Internal Audit Operations and Audit Plan', short: 'Ops & Plan', weight: 15, tone: 1 },
      { id: '3', name: 'Engagement Planning', short: 'Planning', weight: 20, tone: 2 },
      { id: '4', name: 'Engagement Performance', short: 'Performance', weight: 25, tone: 3 },
      { id: '5', name: 'Engagement Results and Monitoring', short: 'Results', weight: 20, tone: 4 } ] },
```

- `mobile/src/engine/readiness.ts` (about line 114): the id pattern `/^d(\d+)_/`
  returns `'?'` for ids like `cia1_d1_001`, so readiness and the domain badge
  stay empty. CRISC and AAIA ids have the same problem.
- `mobile/src/content/scoreNote.ts`: every non-CISSP exam prints ISACA's score
  line. CIA needs The IIA's (250 to 750, 600 to pass), and never as a KaiSip score.
- `mobile/src/content/games/index.ts` and `mobile/src/engine/games/canopyCall.ts`
  take the domain from the first character of the sub-topic id, which under
  `1A1` codes is the part number, not the section.
- "Domain N" is hardcoded in about 27 places; The IIA says "Section A".
- `mobile/src/engine/readySigns.ts` says "Check isaca.org";
  `mobile/src/engine/planner.ts` falls back to 1.6 minutes a question (CIA is 1.2).
- The pack builders accept the two CIA item fields (`challenge_ref`,
  `testable_from`) but leave them out of the pack question, so the app cannot
  see `testable_from` yet: `scripts/cia_pack_dry_run.cjs` applies the date
  itself. The app needs the date before a pack with such items is switched on.
- The phone app has no builder for `<pack>/glossary.json` yet (the dry run
  checks its shape only).
- `scripts/build_free_sample.py` needs the CIA packs, the 100-item floor and
  the rule that the Challenge sample uses only ids already free in their Part.
- The generated Challenge notes (the Part notes for the 40 shared topics,
  re-coded `4A1` and so on, with section-level text written for the Challenge)
  are built with the Challenge pack, after Parts 2 and 3 have notes.
- Sibling items: questions that teach neighboring lessons can cue each other
  when they meet in one mock (section 7 lists round 1's four groups). Before
  mocks are dealt from the CIA packs, the draw needs a way to keep siblings
  apart (a `sibling_group` field on the items, or a list beside the bank),
  and the cross-part reviewer keeps that list.
- A pack glossary entry now carries `formerly` (older names of the term), so
  search can find "consulting services" under "advisory services"; the app's
  glossary screen must read it when a builder for `<pack>/glossary.json` exists.
