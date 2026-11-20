# CIA kickoff prompt (paste into a new session)

**Status: done (20 Nov 2026, PR #289).** This prompt was run once; its outputs
are `docs/content/CIA_BLUEPRINT.md`, `docs/content/CIA_BANK_PLAN.md`,
`docs/content/CIA_CHALLENGE_MAP.md`, `docs/content/CIA_LENS.md`,
`docs/content/CIA_RESEARCH_LOG.md`, `docs/content/CIA_CISA_BRIDGE_OUTLINE.md`,
the `cia-*` agents and `iia-mindset-coach`, and `data/cia/` (the harness, the
Part 1 notes and the Part 1 pilot). Don't run it again: continue from the
plan's "Resume here" block (the glossary start is the one Session G item left).
Kept for history. Where the opened sources differed from what this prompt
assumed, the research log lists each difference (its section 1, "What differs from
the kickoff prompt"); the plan and the blueprint carry the checked facts.

Written 19 Nov 2026.

What this starts: KaiSip's course for the **Certified Internal Auditor (CIA)**
exams of The Institute of Internal Auditors (The IIA), as paid, downloadable
packs:

- **Category 1, the three-part exam:** Part 1, Part 2 and Part 3, each its own
  exam and its own pack.
- **Category 2, the CIA Challenge Exam:** one exam for people who already hold
  a qualifying credential, CISA holders included.

How the facts in section 2 were checked (19 Nov 2026): the official files were
**opened** from this environment after the owner allowed `www.theiia.org`,
`theiia.org` and `internalauditor.theiia.org`. Before that, a
`cert-blueprint-researcher` pass could only read search snippets; the lines
marked "search only" below still need opening.

One thing differs from the brief: there is **no separate Challenge Exam for
CISA holders any more**. Since 1 June 2026 The IIA runs one Challenge Exam with
one syllabus for every pathway (CISA holders, qualified accountants, and a
10-year-experience pilot). KaiSip's Category 2 pack is therefore that one exam,
with a "coming from CISA" bridge as its selling point.

```text
Session G: Start KaiSip content for The IIA's Certified Internal Auditor (CIA)
exams, the way we built ISC2 CC, CRISC, AAIA and CSOE. Four exams, four paid
downloadable packs: CIA Part 1, Part 2, Part 3 (the three-part route) and the
CIA Challenge Exam (the one-exam route for CISA holders and other qualified
people). People pay for these, so quality before count. Work autonomously
under the CLAUDE.md PR rules ("experts decide first", the autonomous loop);
ask me only for "major" items, with the experts' recommendation attached.

## 0. How to work: build the harness before the content
"Harness" = everything around the writing that makes a wrong answer hard to
ship: checkers, blind tests, independent reviewers, sources, and a plan file
that survives a session ending. Seven rules for this whole course:
1. Gates before content. A check exists, and is proven to fail on a bad
   example, before the first item it checks is written (section 5).
2. The author never judges their own work. Authoring, blind testing, the
   standards audit and the currency check are separate agents with fresh
   context. The blind tester never sees a key.
3. One hand-written source, everything else generated. Never hand-edit a
   generated file (the Challenge pack, free samples, practice links).
4. State lives in files, not in the chat. docs/content/CIA_BANK_PLAN.md is the
   resume point: every round ends by updating its status table, scorecard and
   "next step" line, so any new session can continue from it alone.
5. Small batches, clean context. 20 to 25 items per round, one section per
   authoring agent, reviews read one section at a time.
6. Every keyed fact has a source that was opened, and a date. Nothing is keyed
   from memory, from a prep provider, or from the 2019 syllabus.
7. Measure each round and stop on a bad number (section 8, "round scorecard").

## 1. Read first
- CLAUDE.md (hard rules, PR self-review loop, autonomous loop, session wrap-up).
- The pattern to copy, newest first:
  docs/content/AAIA_KICKOFF_PROMPT.md (this prompt's ancestor),
  docs/content/CRISC_BLUEPRINT.md and CRISC_BANK_PLAN.md sections 1 to 6
  (pack contents, free sample, pipeline, originality gate, app-ready dry run),
  docs/content/CSOE_BLUEPRINT.md and CSOE_BANK_PLAN.md (a non-ISACA issuer, a
  rules-currency checker, per-course tools in data/csoe/tools/),
  docs/content/CC_STUDY_SUITE.md (the surface-by-surface table: notes,
  glossary, principles, about the exam, final review week, practice, mock).
- Schemas: docs/content/QUESTION_SCHEMA.md, EXAM_STYLE_V2.md, NOTES_SCHEMA_V2.md,
  PRINCIPLES_SCHEMA.md, EXAM_GUIDE_SCHEMA.md, LESSONS_SCHEMA.md.
- Agent files to model the new ones on: .claude/agents/crisc-standards-auditor.md,
  crisc-d1-domain-expert.md, crisc-cross-domain-reviewer.md,
  csoe-rules-currency-checker.md, csoe-mindset-coach.md.
- Pack and app shapes: mobile/src/content/packs/types.ts,
  mobile/src/content/certifications.ts, scripts/crisc_pack_dry_run.cjs,
  scripts/verify_repo.sh (the CRISC and AAIA blocks), scripts/build_free_sample.py.
- Money and naming: docs/business/monetization/RECOMMENDATION.md and
  WEB_GATE_PLAN.md.
- The CISA audit content (data/originals/d1.json, data/cisa_notes.json domain 1,
  docs/content/ITAF_4TH_EDITION.md): CIA is an auditor exam too, but with The
  IIA's vocabulary and a wider, non-IT scope. Reuse the teaching ideas, never
  the wording or the ISACA terms.

## 2. Exam facts (opened on theiia.org, 19 Nov 2026). Re-check, then record
Open each source again, record the file's version label and the date, and put
the result in the blueprints (section 4). If a version label has changed, stop
and re-read the whole file before going on.

Sources (all opened unless marked):
- Part 1 syllabus: https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf
- Part 2 syllabus: https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf
- Part 3 syllabus: https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf
  (all three: "Expanded Test Specifications", label V2.09.2024 FINAL)
- Challenge syllabus, "Effective June 2026", label V2.10.2025 FINAL:
  https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus.pdf
  (a "-v2" copy of the same file also exists; diff them and use the one the
  Challenge page links to)
- Exam reference list, "Effective May 2025", label V5.2.2026.07.27:
  https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v4.pdf
- CIA page (parts, lengths, eligibility, languages): https://www.theiia.org/en/certifications/cia/
- Challenge pages: https://www.theiia.org/en/certifications/cia/challenge-exam/
  and https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/
- Candidate handbook (scoring, retakes): https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf
- Global Internal Audit Standards (2024): https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf
- Topical Requirements: https://www.theiia.org/en/standards/2024-standards/topical-requirements/

The three-part exam (The IIA calls the top level "Sections"):

| Exam | Questions | Minutes | Sections and weights (number of syllabus topics) |
|---|---|---|---|
| Part 1 Internal Audit Fundamentals | 125 | 150 | A Foundations of Internal Auditing 35% (8) · B Ethics and Professionalism 20% (6) · C Governance, Risk Management, and Control 30% (8) · D Fraud Risks 15% (5) |
| Part 2 Internal Audit Engagement | 100 | 120 | A Engagement Planning 50% (7) · B Information Gathering, Analysis, and Evaluation 40% (8) · C Engagement Supervision and Communication 10% (2) |
| Part 3 Internal Audit Function | 100 | 120 | A Internal Audit Operations 25% (4) · B Internal Audit Plan 15% (3) · C Quality of the Internal Audit Function 15% (3) · D Engagement Results and Monitoring 45% (8) |

The Challenge Exam: one exam, 150 multiple-choice questions, 180 minutes, the
same content for every pathway.

| Section | Weight | Topics | Where the same topic lines sit in Parts 1 to 3 (KaiSip's line-by-line match, not an IIA statement) |
|---|---|---|---|
| A Internal Audit Professionalism and Quality | 20% | 8 | Part 1 A2, A7, A8, B2, B6 and Part 3 C1 to C3 |
| B Internal Audit Operations and Audit Plan | 15% | 7 | Part 3 A1 to A4 and B1 to B3 |
| C Engagement Planning | 20% | 7 | Part 2 A1 to A7 |
| D Engagement Performance | 25% | 10 | Part 2 B1 to B8 and C1 to C2 |
| E Engagement Results and Monitoring | 20% | 8 | Part 3 D1 to D8 |

So 40 of the 62 three-part topic lines are also Challenge topics, with the
same wording. Check the match again at the a/b/c bullet level: at least one
Challenge bullet (fraud concepts, the fraud triangle and common schemes, under
planning to assess key risks) is not in the Part 2 bullet it sits beside.

All four exams:
- Scaled score 250 to 750; 600 passes. A pass shows only "passed"; a fail shows
  a score. Never show a learner a scaled score from a KaiSip mock.
- Retake after 30 days; at most 8 attempts in the program window; 3 years to
  finish. Challenge: testing only in February, June, September and November;
  180 days to sit after registering; no extensions.
- Three-part entry: a degree plus internal audit experience (master's 1 year,
  bachelor's 2), or an active Internal Audit Practitioner holder with 5 years.
- Challenge entry for CISA holders: an active CISA, proof of good standing
  from the public registry, a government photo ID. No proof of experience.
  Applications are open all year.
- Delivery: Pearson VUE. Challenge languages: English, French, Spanish
  (Simplified Chinese for mainland China from December 2026).
- Not opened yet, so check before stating them: the number of options per
  question, whether unscored pretest questions are included, any online
  proctoring, current fees (the Pricing page), the exact English launch date
  of the 2025 syllabus (28 May 2025 in search results only).

What the exams are built on:
- The Global Internal Audit Standards (2024): 5 domains and 15 principles.
  Domain I Purpose of Internal Auditing; II Ethics and Professionalism
  (principles 1 to 5); III Governing the Internal Audit Function (6 to 8);
  IV Managing the Internal Audit Function (9 to 12); V Performing Internal
  Audit Services (13 to 15). Count the standards yourself from the file.
- Reference list V5: six primary references (the Standards; the textbook
  "Internal Auditing: Assurance & Advisory Services", 6th edition; three
  Global Practice Guides on the risk-based plan, fraud risks in engagement
  planning, and integrated approaches; the GTAG "IT Essentials for Internal
  Auditors") and 41 secondary ones (Topical Requirements with user guides,
  Practice Guides, GTAGs, the model charter tools, position papers including
  the Three Lines Model). COSO is not on this list by name; coso.org is
  reachable if a note needs it as background.
- Topical Requirements enter the exam on dates: Cybersecurity from August 2026
  (testable now), Third-Party from March 2027, Organizational Behavior from
  May 2027, Organizational Resilience from October 2027.

What changed from the 2019 syllabus (the main accuracy risk, because most
older material and most of what a model remembers is the 2019 exam):
- Part titles and all section names and weights changed. Part 3 no longer has
  stand-alone business, IT, security and finance domains.
- The Standards file opened on 19 Nov 2026 never uses "internal audit
  activity", "Definition of Internal Auditing", "Mission of Internal Audit" or
  "Three Lines of Defense", and uses "advisory services" (24 times) where the
  old Standards said "consulting". The numbered 1000 and 2000 series
  Standards are gone. Use the two-way mapping only to translate:
  https://www.theiia.org/globalassets/site/standards/two-way-mapping-2017-ippf-mandatory-elements-to-2024-global-internal-audit-standards-and-back.pdf
- The syllabus gives no Basic or Proficient labels; depth comes from each
  line's verb (describe, recognize, interpret, apply, evaluate, determine).
  Use the verb to set each topic's difficulty mix.

## 3. Decide these with the experts first, then write them into the plan
Run product-manager, mobile-app-engineer, behavioral-scientist and
growth-marketer (in parallel) on the questions below before any content file
is created. Where they agree, go ahead. Bring me only the money question.
1. Pack shape. My default: each exam is its own pack with its own id (cia1,
   cia2, cia3, ciac) and the standard folder layout, so the shared linters,
   the pack dry run and the mock engine work unchanged; things all four share
   (principles, glossary source, citation library, tools) are written once and
   built into each pack. Outline codes are part + section + topic (1A1 … 3D8),
   which the notes linter's outline pattern already accepts; notes subtopics
   are 1A1.1, 1A1.2 ….
2. The Challenge pack is GENERATED. Every item is written once, in its Part's
   file, and tagged with the Challenge topic it serves; a build script makes
   the Challenge pack from the tagged items, drawn to the Challenge weights,
   with a --check mode that fails on drift. Never hand-edit the Challenge
   pack. The only hand-written Challenge content is the bridge (section 7).
3. Order of work. My default: Part 1 pilot first (sections A and B are the
   foundations every other part cites, so they calibrate the lens), then give
   priority to the 40 shared topics, because each one fills two products.
4. Bank size. My default: six non-overlapping full mocks per exam and never
   padding: Part 1 about 750, Parts 2 and 3 about 600 each, scaled by section
   weight, then by topic. If a topic runs out of distinct, testable ideas
   before its target, stop there (the CSOE padding guard) and say so.
5. When each pack goes on sale, and the free sample (10% of each bank, at
   least 100, weighted by section, every topic touched, plus one diagnostic
   and one short mock), as CRISC.
6. OWNER DECISION (money, so ask me once, with the experts' recommendation):
   price per part, whether there is a three-part bundle, and the Challenge
   price. Never mention any of this in learner copy before it is decided.

## 4. Blueprints (facts with sources), one PR with section 5
- docs/content/CIA_BLUEPRINT.md: the four exams. Exam facts table with a
  source and date per fact; each exam's section table; "Outline lines for the
  notes linter" (- 1A1 …) per exam; the CIA lens (section 6); the 2019-to-2025
  change list; the reference list with each entry marked Opened, Members only,
  or For purchase; the Topical Requirement calendar; trademark notes; open
  items. Use the official code and a SHORT KaiSip title per topic and link the
  official PDF; do not paste The IIA's bullet text (it is copyrighted), put the
  a/b/c bullets in your own words.
- docs/content/CIA_CHALLENGE_MAP.md: the Challenge topic to Part topic map at
  bullet level, and the bullets that exist only in the Challenge syllabus.
- docs/content/CIA_BANK_PLAN.md: what each pack carries (the CRISC section 1
  table, once per exam), targets by section and topic, the free sample, batch
  cadence, the pipeline, the round scorecard, decisions from section 3, and a
  "Resume here" block at the top: status, next step, exact commands.
- docs/content/CIA_RESEARCH_LOG.md: every source, the date opened, its version
  label, and anything that could not be opened.
- Add The IIA as an issuer and the four exams (status coming_soon) to
  mobile/src/content/certifications.ts only if mobile-app-engineer agrees it
  is safe before the paywall; otherwise put the ready-to-paste block in the
  plan, as CC_STUDY_SUITE.md does.

## 5. The harness (build and prove it before the pilot)
Reuse the shared scripts; put CIA-only tools in data/cia/tools/ with a README
(copy the CSOE tools as a start). Add a "CIA course" block to
scripts/verify_repo.sh so every gate runs on every session start.
1. Structure gate (check_cia.py): item shape and ids (cia1_d1_001 …), outline
   code exists, notes and citation-library links, three tips, balanced keys,
   pick-the-longest 15 to 24%, pick-the-shortest at most 30%, difficulty mix
   by the topic's verb, no item without an explanation for every option.
2. Style: scripts/lint_exam_style_v2.py unchanged where possible; a thin
   wrapper only for real CIA exceptions, each one written down.
3. Stale-syllabus gate (new, the most important CIA gate): fails on 2019-era
   and ISACA wording anywhere a learner can read: "IPPF", "Standard 1xxx" or
   "2xxx", "Attribute" or "Performance Standards", "internal audit activity",
   "consulting services" or "consulting engagement", "Definition of Internal
   Auditing", "Mission of Internal Audit", "Core Principles", "Practice
   Advisory", "Implementation Guidance", "Three Lines of Defense", the 2019
   part and domain names, and "IS auditor", "ITAF", "CISA Review Manual" as a
   keyed authority. A note may teach "old term, new term" only inside a field
   the gate is told to skip. Confirm each banned term against the opened
   Standards before adding it.
4. Currency gate: data/cia/shared/currency.json holds every dated fact (file
   version labels, exam lengths, pass mark, retake rule, Topical Requirement
   testing dates) with source and last_checked. The gate warns after 60 days
   and fails after 120. An item on a Topical Requirement not yet testable
   carries its testing date, and the mock and free-sample builders leave it
   out until then.
5. Citation gate: every framework_ref part matches a bullet in
   _framework_library.md, marked Verified (opened, with date) or Likely. A
   key may rest only on a Verified source. The textbook and members-only
   guides cannot be Verified unless I supply them (section 9).
6. Originality gate (copy data/crisc/tools/check_originality.py): compare the
   glossary, notes key terms and topic titles with the Standards' glossary and
   the syllabus text; fail on a 6-word run, 30% shared 3-word phrases or 0.6
   similarity. The reference text is fetched into the scratchpad and never
   committed.
7. Notes gate: scripts/lint_notes.py with --outline docs/content/CIA_BLUEPRINT.md
   and --bank; practice links synced by a sync_practice_ids.py with --check.
8. Principles and exam-guide gates: make scripts/lint_principles.py and
   scripts/lint_exam_guide.py issuer-aware (allowed source hosts, the
   disclaimer and "check before you book" wording per issuer) rather than
   adding a third wrapper; keep CISA, CRISC, AAIA, CC and CSOE output unchanged
   and prove it by running verify_repo.sh before and after.
9. Pack dry run (scripts/cia_pack_dry_run.cjs, copied from CRISC's): feeds
   each exam's files through the phone app's own pack builders into a temp
   folder and draws a full mock (125, 100, 100, 150 items) and a short mock
   without repeats, to each exam's weights.
10. Challenge builder gate: build_challenge.py --check (section 3, point 2).
11. Blind copy tool: id, outline code, stem and options only.
12. PROVE THE HARNESS. Write a small fixture of deliberately bad items and
    notes (one per rule: a 2019 term, a wrong key letter, a missing
    explanation, a citation not in the library, a copied definition, an item
    on a not-yet-testable requirement, an ISACA-lens answer). A test runs
    every gate on it and fails if any planted fault gets through. This runs
    in verify_repo.sh. No content is written until it is green.

## 6. Expert agents in .claude/agents/
The CIA lens for all of them, a starting point only: check every line on the
opened Standards before it goes into an agent file, and cite the principle.
- The internal auditor serves the organization through independent, objective
  assurance and advice. Independence belongs to the function (it reports to
  the board through the chief audit executive); objectivity belongs to the
  individual auditor. Different remedies for each.
- The board approves the mandate, the charter, the plan and the resources and
  oversees the function. Senior management supports it. Management owns risk,
  controls and action plans. The auditor assesses, concludes, recommends and
  monitors, and never takes a management decision or owns a fix.
- When management accepts a risk the chief audit executive believes is beyond
  what the organization should accept: discuss with senior management first,
  then escalate to the board. It is not the auditor's risk to resolve.
- Risk decides the plan and the scope. Plan before testing. Evidence must be
  relevant, reliable and sufficient. A finding compares criteria with the
  condition, then gives the cause and the effect. Root cause before symptom.
- Fraud: assess fraud risk in every engagement and report red flags through
  the right channel; investigation needs the right skills and authority.
- Quality: an internal and external assessment program, and honest disclosure
  of nonconformance.
- Parts differ in seat: Part 1 a new internal auditor who knows the rules;
  Part 2 the auditor running an engagement; Part 3 the chief audit executive
  running the function and reporting results. The Challenge Exam assumes an
  experienced professional and asks for judgment.
Agents to create (model each on its CRISC or CSOE counterpart):
- cia-standards-auditor.md: the shared item-writing standard and auditor.
  Same item rules as the other courses (four options unless section 2's check
  says otherwise, one best answer, two options that topic knowledge rules out,
  the final two decided by the lens, key-longest limits, balanced keys, every
  option explained, three tips: Eliminate, Final two, Exam cue; original
  wording; opened sources only). Hard errors: a 2019-syllabus rule, an ISACA
  lens answer keyed as the internal auditor's move, a key that rests on an
  unopened source, The IIA's wording copied.
- cia-p1-domain-expert.md, cia-p2-domain-expert.md, cia-p3-domain-expert.md:
  one per part, each with its sections, the scope of every topic, and the real
  traps per topic to build distractors from. If a part proves too wide for one
  agent to hold (Part 1 section C and Part 2 section A are the widest), split
  it by section and say so in the plan.
- cia-challenge-bridge-expert.md: owns the Challenge map, the CISA bridge and
  the Challenge-only bullets; reviews tagged items for the experienced-
  candidate level. Knows the CISA bank, so it can say what carries over.
- cia-cross-part-reviewer.md: contradictions between parts, near-duplicates,
  an item in the wrong part or topic, balance against weights, role and term
  consistency, and lens leakage. Final gate before a release.
- cia-currency-checker.md: opens the source behind every keyed fact, updates
  currency.json, and flags anything from the 2019 syllabus or a superseded
  guide.
- iia-mindset-coach.md: principles, exam guides, final review weeks and
  post-mistake coaching in The IIA's lens (the counterpart of
  isaca-mindset-coach and isc2-mindset-coach; never imports the CISA lens).
Reuse as they are: qa-question-tester (blind), cert-blueprint-researcher,
notes-application-tester, learner-reader, cisa-grammar-checker (for prose
only), product-manager, behavioral-scientist, growth-marketer,
app-store-compliance-reviewer, learning-game-designer.

## 7. The study suite: every exam gets all seven surfaces
Each of the four packs must have what CISA has, as data that passes its gate.
Write them in this order per part (notes before questions, as CC did).

| Surface | File (per exam pack) | Owner | Notes |
|---|---|---|---|
| Study notes | notes/d{N}.json, one file per section, schema v2 | part expert | 2 to 4 subtopics per syllabus topic; every a/b/c bullet covered; "can do" lines use the syllabus verb |
| Glossary | glossary.json (the CRISC shape: term, acronym, def, scopeNotes, section, category) | iia-mindset-coach, part expert | One shared source for all four, built into each pack; meaning checked against the Standards' glossary, wording through the originality gate; include the old-term-to-new-term pairs learners will meet in older books |
| Principles | mindset/principles.json (principles schema) | iia-mindset-coach | "How the CIA exam thinks": one shared set in The IIA's lens, each tagged to the parts it serves; every question tagged with a principle_id |
| About the exam | exam/<id>_exam_guide.json | iia-mindset-coach | One per exam (the four differ in length, time, entry rules and windows); facts from section 2 with last_checked; the Challenge guide explains who can sit it and the testing windows |
| Final review week | exam/final_review_week.json | iia-mindset-coach, behavioral-scientist | One per exam: 7 days, a sheet per section, pacing for that exam's minutes per question |
| Practice | originals/d{N}.json | part expert | Pilot of 20 per section first, every topic touched; then rounds of 20 to 25 |
| Mock exam | the bank plus the settings in the plan | part expert, mobile-app-engineer | Full mock at the real length and time, to the section weights; a short mock; held-out items if the experts want fixed forms; the on-screen line says the real exam is scaled and KaiSip's score is not The IIA's |

Also plan, even if they come later: decision lessons (LESSONS_SCHEMA) and game
decks, as CRISC's plan does.

The Challenge pack adds one hand-written piece, the CISA bridge (in its notes
and exam guide): what a CISA holder already knows, what is new (running an
internal audit function, the board and chief audit executive relationship,
quality, the plan, results and monitoring), and what looks the same but is
worded differently (The IIA's terms beside the ISACA terms). It must be
correct for a CISA holder and still useful to an accountant, since the exam is
the same for both. KaiSip's own CISA learners are the first audience for this
pack: have growth-marketer write the in-app and store description with that in
mind, and app-store-compliance-reviewer check it.

## 8. The pipeline every round goes through (don't skip a step)
1. Scaffold: pick the topics from the plan, set key positions and length
   targets up front (scripts/scaffold_batch.py shows the idea).
2. Author with the part expert, from a notes subtopic, sources opened.
3. Self-check: every gate in section 5, 0 errors.
4. Blind test with qa-question-tester on the answer-free copy.
5. Standards audit (cia-standards-auditor) and the part expert's accuracy
   pass, each in fresh context.
6. Currency and citations (cia-currency-checker).
7. Fix every HARD ERROR and PRECISION finding; re-blind-test changed items.
8. Cross-part review after the pilot, then every 100 new items, and before
   any release. notes-application-tester after each part's second round: can
   a learner answer the reviewed items from the notes alone? learner-reader
   on one notes section per part.
9. Regenerate the Challenge pack and the practice links; run verify_repo.sh
   and (cd mobile && npm run check).
10. One PR per round, reviewed and merged under CLAUDE.md, then post-merge
    branch hygiene, then update the "Resume here" block.
Round scorecard, written into the plan each round: blind-test agreement with
the key (below 90% means the round does not merge until the disputed items
are fixed or cut), findings per 25 items by tier, pick-the-longest rate, items
cut, sources newly opened. If two rounds in a row miss 90%, stop and tell me.

## 9. Paid packs: legal and store rules
- Originality is a legal must. Never copy or closely paraphrase the Standards,
  the syllabus bullets, The IIA's practice questions (they are retired real
  exam questions), the textbook, or any prep provider (Becker, Gleim, HOCK,
  Wiley, Surgent and others). Do not open prep providers' question banks at
  all. Cite the Standards by domain, principle and standard number and title;
  quote nothing longer than a short phrase, with attribution.
- The IIA's copyright notice forbids commercial distribution of its text and
  its licensing page says licensed content may not go into a public AI system.
  Have app-store-compliance-reviewer read both pages and write the rule KaiSip
  follows into the blueprint. If it concludes a licence or written permission
  is needed for anything we plan, that is a major item: bring it to me.
- Marks: The IIA writes "Certified Internal Auditor® (CIA®)", "CIA® Challenge
  Exam" and "CISA™ is a trademark of ISACA". Check the current registrations
  (tmsearch.uspto.gov is reachable) and write the notice for the app. Product
  names lead with KaiSip or a generic course name and put the exam after
  "for", within the store length limits in RECOMMENDATION.md. Never "Pass",
  never a pass promise, never a hint of endorsement by The IIA.
- Content only in this work: no paywall, purchase flow or RevenueCat (Phase E).
  Nothing is wired into the apps, so no APP_VERSION bump and no What's New
  entry. Never state a bank size in learner copy.
- Sources I may need to supply. Tell me early, in one message, which of these
  block a key: IIA membership (many Practice Guides and GTAGs are members
  only), the textbook (primary reference 2), and anything else marked
  "Members only" or "For purchase" in the blueprint. Until then, key only on
  what was opened.

## 10. This session's scope, then the loop
Session G delivers, in this order, each as its own reviewed PR:
1. Expert decisions (section 3), the four documents (section 4), the harness
   proven on its fixture (section 5), the agents (section 6), the CLAUDE.md
   rows for data/cia and the new agents.
2. Part 1 notes for all four sections, linted.
3. Part 1 pilot: 20 items per section through the full pipeline, plus the
   shared principles, the glossary start, and the Part 1 exam guide and final
   review week.
4. The Challenge map and the CISA bridge outline.
Then continue under the autonomous loop from the "Resume here" block: Part 1
to target, the shared topics of Parts 2 and 3, the rest of Parts 2 and 3, the
Challenge build and its bridge, the cross-part release gate. A later session
continues from docs/content/CIA_BANK_PLAN.md alone.

## 11. Handoff after each PR
A short, beginner-friendly summary: what The IIA's outline says, which experts
and gates were created, what was written, the round scorecard, what reviewers
found and fixed, two sample questions with answers and tips, sample screens
if the phone app can render the pack (CLAUDE.md screenshot rule), what is
waiting on me, and the next step. Tell me about any blocked host worth
allowing.
```
