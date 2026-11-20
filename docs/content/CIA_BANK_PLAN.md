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
| **In progress: round 1 (20 Nov 2026)** | 25 new Part 1 questions on the five Challenge-shared topics are written, reviewed and fixed, and committed: `cia1_d1_021` to `035` (1A2, 1A7, 1A8) and `cia1_d2_021` to `030` (1B2, 1B6). Done: first blind test 25 of 25, two standards audits (0 HARD, 23 PRECISION, 18 OBSERVATION, all applied), cue test 76% then 68% after the fix pass, second blind test of Section B 10 of 10. **Still to do, in this order:** (1) the second blind test of Section A's fifteen and the currency and citation check of all 25 (both were running when the container restarted; results go to the scratchpad, so re-run them if their files are missing); (2) one small fix pass only if an item is ambiguous or a citation is wrong (section 6b, rule 12); (3) the tagging pass, which also writes the two missing principles named in section 7 (competency; confidentiality, "information is for the work only"); (4) because nothing has reached main, delete `data/cia/ciac/id_map.json` and `data/cia/ciac/originals/` and rebuild so the map starts clean, then set each principle's `ciac` practice ids from the new map; (5) the round's row in section 7. |
| **Next step after round 1** | Part 1 toward its sale minimum in further rounds of 20 to 25, on the topics `check_cia.py cia1 --coverage` shows as thinnest. Every round uses the author brief that produced round 1 (kept in the plan, section 6c) and reports the cue test; the target stays at 85% or lower. |
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
| Questions | `originals/d{N}.json` | part expert | Pilot done: 20 per section (section 7) | Not started | Not started | Generated (`build_challenge.py`) from the tagged pilot items |
| Citation library | `data/cia/shared/_framework_library.md` (one for all four) | part experts, cia-currency-checker | Started | | | |
| Dated facts | `data/cia/shared/currency.json` | cia-currency-checker | Started | | | |
| Glossary | `glossary.json`, built from `data/cia/shared/glossary.json` | iia-mindset-coach, part experts | Started: 153 terms, audited (section 7) | Later | Later | Built from the shared terms of its topics |
| Principles | `mindset/principles.json`, built from `data/cia/shared/principles.json` | iia-mindset-coach | Done: 20 principles, pilot questions tagged | Later | Later | Built (same 20) |
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
| 4 | Bank size | Six non-overlapping full mocks is the ceiling (Part 1 about 750, Parts 2 and 3 about 600 each). The sale minimum is four (500, 400, 400), with two full forms held out that practice never serves. Never padding: if a topic runs out of distinct, testable ideas, stop there and say so here. For the Challenge, accept five full mocks rather than write to fill section A. | Product manager, behavioral scientist |
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
     rounds from now on: at or below the CRISC baseline (85%), and falling.**
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

## 7. Round scorecard

Written here after every round. **Blind-test agreement below 90% means the
round does not merge** until the disputed items are fixed or cut. Two rounds
in a row below 90%: stop and tell the owner.

| Round | Date | Pack and sections | Items | Blind agreement | HARD / PRECISION / OBSERVATION per 25 | Pick-longest | Items cut | Sources newly opened |
|---|---|---|---|---|---|---|---|---|
| Pilot | 19 to 20 Nov 2026 | cia1, Sections A to D | 80 (20 each) | 80 of 80 in each of four blind rounds (100%) | 0.3 / 12.8 / 10.9 (1 / 41 / 35 on 80) | 20.0% in every section | 0 | The texts listed in `CIA_RESEARCH_LOG.md` (no new source after the notes) |
| Round 1 | 20 Nov 2026 | cia1, Sections A (1A2, 1A7, 1A8) and B (1B2, 1B6): the Challenge-shared topics | 25 (15 and 10) | 25 of 25 in each of two blind rounds (100%) | 0 / 23 / 18 on 25 | 20.0% in both sections | 0 | None new (the Standards, both statements and the reference list re-downloaded, unchanged) |

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
conditions by name (1D1a), authority levels as preventing fraud (1D4c), and
hotlines, reconciliations and supervisory reviews as detecting it (1D4d).
Nothing beyond those classifications (`docs/content/CIA_LENS.md` says the same).

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
