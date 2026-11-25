# CIA Part 2: syllabus bullet coverage map

Built 25 Nov 2026, after the Part 2 pilot, and updated the same day after Part 2 round 1,
to measure Part 2 against the sale gate
(`docs/content/CIA_BANK_PLAN.md`, section 3, decision 4, revised in round 14): (a) every
syllabus bullet tested at its verb's depth with every gate passing; (b) two full
exam-weighted forms of distinct items per section (Part 2 is 100 questions as A 50, B 40,
C 10, so A 100, B 80, C 20); (c) one full form frozen and held back, and a short mock drawn
per learner from unseen items; a bullet's only item is never held back. Three forms
(Part 2 about 300: A 150, B 120, C 30) stay the target as sources open.

Source: the opened Part 2 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026; each bullet's
leading verb re-read in it on 25 Nov 2026). The "Covers" column is the blueprint's own
wording (`docs/content/CIA_BLUEPRINT.md`), not The IIA's; the verb is the bullet's leading
word. Bank: all 53 items in `data/cia/cia2/originals/d1.json` to `d3.json` as of Part 2
round 1 (the pilot's 37 plus round 1's 16: `d1_015` to `d1_022`, `d2_015` to `d2_021`,
`d3_010`; none retired). Round 1 renumbered some Section A drafts before merge; the map
follows the file. This is an internal working document; it holds no item text. No prep
provider was opened for it.

## 1. How the map was made

- **One primary bullet per item**, read from the stem, the key and the explanation. The
  `subtopic` and `_provenance` fields name the notes sub-topic (Section B's also name a
  bullet), which is not always the bullet the key turns on. For example `d1_006` sits in
  notes 2A3.2 (cyber and IT controls), but its key is assessing every requirement of the
  Cybersecurity Topical Requirement, so it counts for 2A3a; the IT control framework it
  starts from makes it "also touched by" 2A3c. A plain second bullet is listed as "also
  touched by"; it does not count toward that bullet.
- **Ids are short**: `d1_012` means `cia2_d1_012`; Part 1 items keep their full id
  (`cia1_d1_027`). A Challenge tag is shown in brackets (`C1` to `C7`, `D1` to `D10`).
- **Topic-line rows.** No Part 2 item tests its topic line without a lettered bullet, so
  the tables have no "(line)" rows yet.
- **Depth.** The bullet's own verb decides it, by the plan's section 4 classes (recall:
  Describe, Recognize, Identify, Explain; apply: Interpret, Apply, Demonstrate, Maintain;
  judge: Evaluate, Determine, Analyze, Assess, Plan, Complete, Prepare, Summarize). A recall
  bullet is met by any item; an apply bullet needs at least one application or analysis
  item; a judge bullet needs at least one analysis item. Verbs the plan's table does not
  list are read as in the Part 1 map (KaiSip's reading, open to the auditor): Define as
  recall (2B4a); Organize as apply (2B7a: putting given information in order is using a
  skill in a situation, not weighing facts to decide); Appraise as judge (2B6c: to appraise
  factors and set significance is to assess them). Explain is in the plan's recall list
  (2B4c, 2B4d). Bullets 2A3b to 2A3f open with "When planning an engagement, recognize",
  so their verb is Recognize.
- **Bullet verbs often sit below the topic verb.** 26 of Part 2's bullets carry a recall
  verb under a judge topic (2A1a to 2A1c, 2A1e, 2A2a, all six of 2A3, 2A4b, the six 2A5
  recognize bullets, 2A6b, 2A6c, 2A6e, 2B2b, 2B2c, 2B3a, 2B6b, 2B7b), two carry an apply
  verb under one (2B2a, 2B7a), and some go the other way (2B1a and
  2B1b are Determine under an Identify topic; 2B4b, 2B4e, 2B5a and 2B5b are judge verbs
  under Apply topics; 2C2a and 2C2c are Determine under an Apply topic). The topic verb
  still sets each topic's difficulty mix (`check_cia.py`); the bullet verb sets the floor
  for its items, and an item on a recall bullet never needs knowledge deeper than the
  bullet asks for.
- **Mapping is judgment.** Where an item could sit under two bullets, the one its key
  turns on won. `d3_004` (a cosourced firm's work reviewed like staff work) went to 2C1c,
  not 2C1a, because the key is the review of workpapers, not when supervision starts;
  `d2_003` (a full population from a file the audited team keeps) stays at 2B2a, as its
  author set it, because the key weighs coverage against reliability, which is applying
  the quality criteria; its reason (the source) makes it "also touched by" 2B2b. Round 1:
  `d1_016` (a request to add work in the same days) sits at 2A1d, the stakeholder request,
  though its key names a scope limitation (also touched by 2A1c); `d1_017` (who watches
  for emerging cyber threats) sits at 2A3c, planning, not 2A5c; `d2_020` stays at 2B1a as
  an application item after its fix pass relabelled it.

## 2. Where Part 2 stands against the gate

| Section | Items | Two-form bar (gate) | Three-form target | Gap to the bar | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Engagement Planning | 22 | 100, not met | 150 | 78 | 31 | 11 | 18 | 2 |
| B Information Gathering, Analysis, and Evaluation | 21 | 80, not met | 120 | 59 | 22 | 3 | 17 | 5 |
| C Engagement Supervision and Communication | 10 | 20, not met | 30 | 10 | 7 | 0 | 5 | 1 |
| **Part 2** | **53** | **200, not met** | **300** | **147** | **60** | **14** | **40** | **8** |

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 100 as 50/40/10 and 33 as 17/13/3. F/Ap/An by section:
A 2/13/7, B 1/12/8, C 2/6/2. "Below depth" counts bullets that have items but none at their
verb's depth; zero-item bullets are counted on their own. Pilot figures, for comparison:
37 items; 26 zero-item, 32 one-item and 11 below-depth bullets.)

What the counts hide:

- **Gate (a) is not met.** 14 of 60 bullets have no item, and 8 more have items but none
  at their verb's depth, every one a judge bullet with only foundational or application
  items: 2A4a, 2A7c, 2B1a, 2B1b, 2B4b, 2B4e, 2B5a, 2C2a. Of the 14 zero-item bullets, 3
  carry judge verbs (2A7b, 2A7d, 2B7d), so their first item should be an analysis item,
  and one carries an apply verb (2B7a). 38 bullets meet their depth today (pilot: 23):
  A 18 of 31, B 14 of 22, C 6 of 7. Round 1 brought 15 bullets to depth: 2A1c, 2A1d, 2A3c,
  2A4b, 2A6a, 2A6d, 2A6e, 2A7a, 2B3a, 2B4d, 2B5b, 2B6a, 2B6c, 2B7c and 2C1b.
- **Round 1 tried nine slots and left them empty on purpose** (section 5 keeps the
  reasons): 2A2a, 2A5c, 2A5e, 2A5f and 2A6c as first items, and 2A4a and 2A7c as analysis
  items, found no distinct lesson; 2A5a and 2A7d drafts were cut because their keys rested
  only on the Topical Requirements Application Guidance; a 2A7b draft was cut as
  answerable from wording. 2B1a gained `d2_020`, but its fix pass relabelled it
  application, so 2B1a still lacks an analysis item.
- **No full form can be drawn yet.** Every topic now has an item (2B3's first is
  `d2_015`), but 40 of the 46 bullets with items have exactly one, and a bullet's only item
  stays out of the held-back form. Topic 2B3 cannot be sampled by the held-back form until
  2B3a has a second item. Only six bullets have two or more: 2A6a, 2A6d, 2B1a, 2B6c, 2C1c
  and 2C2a.
- **Gate (b) needs about 147 more items.** The pilot kept 37 of 50 written (74%); round 1
  kept 16 of 19 (84%; all three cuts were Section A drafts). At about 80%, a round must
  write about 185 to keep 147. Section A carries more than half of the gap (78), and topic
  2A5 is furthest behind its share (2 of 20).
- **The opened sources cannot reach some bullets at depth** (section 4): 2A3e (finance and
  accounting basics) has no opened source at all; parts of 2A3c, 2A3d, 2A3f, 2A4a, 2B3a,
  2B4b, 2B4d, 2B4e and 2B5a rest on "Common usage" or on members-only guides. Four of the
  judge bullets still below depth (2A4a, 2B4b, 2B4e, 2B5a) are among them, so their
  analysis items must rest on the Standards, not on terms. The owner decided on 25 Nov 2026
  not to join The IIA, so members-only guides are never a source; a textbook purchase is
  still undecided (plan section 9).
- **The Topical Requirements Application Guidance is Background, not a source for a key**
  (ruled 25 Nov 2026, round 1: it is not on the exam's reference list and is labelled
  Supplemental). That closed the round 1 leads for 2A5a and 2A7d. Items that cite it after
  a Verified first part and key on a requirement or its user guide (`d1_006`,
  `cia1_d1_046`, `cia1_d1_061`) were checked in the same ruling and are unaffected.
- **Three Topical Requirements are not testable yet**: Third-Party from 2027-03-01,
  Organizational Behavior from 2027-06-01, Organizational Resilience from 2027-10-01
  (`data/cia/shared/currency.json`). An item that rests on one carries that
  `testable_from` and stays out of mocks, forms and the free sample until the date, so it
  does not count toward the gate before then. No Part 2 item carries a future
  `testable_from` today; the five items on the Cybersecurity requirement (`d1_001`,
  `d1_006`, `d1_007`, `d1_009`, `d1_017`) are testable now.
- **Part 1 already teaches many engagement lessons.** Scope limitations (`cia1_d1_027`,
  `_089`, `_099`, `_105`, `_106`), criteria (`cia1_d1_060`, `cia1_d3_020`, `cia1_d3_064`,
  `cia1_d2_077`), effectiveness against efficiency (`cia1_d3_019`, `cia1_d3_085`),
  significance (`cia1_d2_039`, `cia1_d3_046`, `cia1_d3_056`), root cause (`cia1_d3_017`,
  `cia1_d3_066`, `cia1_d2_076`), records (`cia1_d2_020`, `cia1_d2_027`, `cia1_d2_082`),
  benchmarking (`cia1_d1_050`, `cia1_d1_071`) and process maps (`cia1_d1_062`,
  `cia1_d1_104`). A Part 2 item on the same lesson is a cross-part sibling: new scenario,
  new actor or depth, new runner-up, logged (the pilot cut one repeat of a Part 1 lesson;
  round 1 left 2A5e empty because its lead repeated `cia1_d4_008`).
- **Siblings already logged** (plan section 7): from the pilot, `d1_001` with
  `cia1_d1_061` and `cia1_d1_046`; `d1_007` with `cia1_d2_016`; `d1_009` with
  `cia1_d1_061`; `d1_014` with `cia1_d2_012`; `d3_001` with `cia1_d2_038`; `d3_004` with
  `cia1_d1_065`; `d3_006` with `d3_009`. From round 1, `d1_015` with `cia1_d1_027`
  (transfer pair); `d1_016` with `cia1_d1_105`; `d1_018` with `d1_011`; `d2_020` with
  `d2_001` (transfer pair) and with `d2_003`; `d3_010` with `d3_005` (transfer pair).
- **Challenge tags:** 46 of 53 items carry one; `d1_002`, `d1_007`, `d1_018`, `d2_001`,
  `d2_019`, `d3_003` and `d3_009` carry `null` as too basic for the Challenge candidate.

## 3. The map

### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2A1a | Where Topical Requirements come into setting objectives and scope | Recognize (recall) | 1: d1_001 (C1) | 0/1/0 | yes | one item: cannot be held back. Items on Third-Party, Organizational Behavior or Organizational Resilience need `testable_from` |
| 2A1b | What feeds the objectives: whether the job is assurance or advisory, strategy, regulation, risk appetite, policies, how governance, risk and control are run, earlier audit reports and other providers' work | Recognize (recall) | 1: d1_002 | 1/0/0 | yes | one item: cannot be held back |
| 2A1c | Spotting scope limitations at planning and writing them down | Identify (recall) | 1: d1_015 (C1); also touched by d1_016 | 0/1/0 | yes | one item: cannot be held back; transfer pair with `cia1_d1_027` (Part 1 sits close: 1A7e's five items) |
| 2A1d | Ways to handle and record requests from stakeholders | Evaluate (judge) | 1: d1_016 (C1); also touched by d1_001 | 0/0/1 | yes | one item: cannot be held back; sibling of `cia1_d1_105` |
| 2A1e | Good ways to deal with a change in objectives or scope | Identify (recall) | 1: d1_003 (C1); also touched by d3_005 | 0/1/0 | yes | one item: cannot be held back |
| 2A2a | Picking the criteria that best fit the activity being audited | Identify (recall) | 0 | 0/0/0 | no | zero items; tried in round 1 and left empty (the lead's key was common sense). Part 1 sits close: `cia1_d3_020`, `cia1_d3_064`, `cia1_d1_060` |
| 2A2b | Testing a set of criteria: relevant, specific, practical, in line with objectives, and able to support fair comparisons | Determine (judge) | 1: d1_004 (C2) | 0/0/1 | yes | one item: cannot be held back |
| 2A3a | Where Topical Requirements come into planning | Recognize (recall) | 1: d1_006 (C3) | 0/1/0 | yes | one item: cannot be held back |
| 2A3b | How the area's strategic goals connect to the way it measures and manages performance and to risk management | Recognize (recall) | 1: d1_005 (C3) | 0/1/0 | yes | one item: cannot be held back |
| 2A3c | Current and emerging cyber risks, IT general controls, everyday security controls, why IT control frameworks help, data privacy principles and data security practice | Recognize (recall) | 1: d1_017 (C3); also touched by d1_006 | 0/1/0 | yes | one item: cannot be held back; IT general against application controls is still "Common usage" (no key); named privacy principles need a members-only guide or the textbook |
| 2A3d | Readiness for disruption (continuity and disaster recovery): business impact analysis, resilience, handling incidents, and tests of backup and recovery | Recognize (recall) | 1: d1_007 | 1/0/0 | yes | one item: cannot be held back; business impact analysis and recovery objectives are "Common usage"; the resilience requirement is testable from 2027-10-01 |
| 2A3e | Finance and accounting basics for the area: assets (current and fixed), liabilities (short and long term), capital and investments | Recognize (recall) | 0 | 0/0/0 | no | zero items; blocked: no opened source (textbook) |
| 2A3f | Key risks and controls in everyday business processes and in systems such as CRM, ERP and GRC | Recognize (recall) | 0 | 0/0/0 | no | zero items; process detail is "Common usage" (textbook); third parties rest on the Third-Party requirement (testable 2027-03-01) |
| 2A4a | Weighing approaches (traditional, agile, integrated, remote) and picking the best fit | Evaluate (judge) | 1: d1_008 (C4) | 0/1/0 | no | analysis item (tried in round 1 and left empty: the lead retold the notes' example); one item: cannot be held back; beyond the Standards' general rules needs the members-only integrated approaches guide (never) or the textbook |
| 2A4b | Project management ideas used to plan and run an engagement | Describe (recall) | 1: d1_018 | 0/1/0 | yes | one item: cannot be held back; sibling of `d1_011` |
| 2A5a | Where Topical Requirements come into the risk assessment | Recognize (recall) | 0; also touched by d1_009 | 0/0/0 | no | zero items; tried in round 1 and cut: the draft's key rested only on the Application Guidance (Background). A first item keys on a requirement and its user guide alone |
| 2A5b | Risks that run through the whole activity: regulatory, cyber, IT, operational and financial | Recognize (recall) | 1: d1_009 (C5) | 0/1/0 | yes | one item: cannot be held back |
| 2A5c | How emerging risks affect the organization | Recognize (recall) | 0; also touched by d1_017 | 0/0/0 | no | zero items; tried in round 1 and left empty (sound practice only, thin beyond Standard 13.2 and the Cybersecurity requirement) |
| 2A5d | Methods and criteria for rating and ranking risks and controls | Determine (judge) | 1: d1_010 (C5) | 0/0/1 | yes | one item: cannot be held back |
| 2A5e | How changes to people, processes and systems shift risk | Recognize (recall) | 0 | 0/0/0 | no | zero items; tried in round 1 and left empty (the lead repeated `cia1_d4_008`) |
| 2A5f | How structure and setting matter: remote or in-person work, flat or traditional layers, central or local control | Recognize (recall) | 0 | 0/0/0 | no | zero items; tried in round 1 and left empty (common-sense key; mostly sound practice in the notes) |
| 2A5g | How culture shapes the control environment: how individuals and groups behave, and tone at the top | Recognize (recall) | 0 | 0/0/0 | no | zero items; the Organizational Behavior requirement is testable from 2027-06-01; Part 1 sits close (1C2a, 1D4a) |
| 2A6a | Procedures that test whether a control is well designed | Determine (judge) | 2: d1_012 (C6), d1_019 (C6) | 0/1/1 | yes | - |
| 2A6b | Procedures that test whether controls work | Identify (recall) | 1: d1_013 (C6) | 0/0/1 | yes | one item: cannot be held back |
| 2A6c | Procedures that test whether controls are efficient | Identify (recall) | 0 | 0/0/0 | no | zero items; tried in round 1 and left empty (sound practice only). Part 1 sits close: `cia1_d3_019`, `cia1_d3_085` |
| 2A6d | Judging whether the work program is good enough | Evaluate (judge) | 2: d1_011 (C6), d1_020 (C6); also touched by d1_003, d1_008 | 0/1/1 | yes | - |
| 2A6e | Test methods for engagements that cover accounting, finance, IT systems, operations or cybersecurity | Identify (recall) | 1: d1_021 (C6) | 0/1/0 | yes | one item (IT systems): cannot be held back; methods outside IT and cybersecurity are "May" or "Common usage" in the notes (textbook) |
| 2A7a | Money the engagement needs | Determine (judge) | 1: d1_022 (C7) | 0/0/1 | yes | one item: cannot be held back |
| 2A7b | People the engagement needs | Determine (judge) | 0 | 0/0/0 | no | zero items; first item at analysis. Tried in round 1 and cut: the draft was answerable from wording |
| 2A7c | Technology the engagement needs | Determine (judge) | 1: d1_014 (C7) | 0/1/0 | no | analysis item (tried in round 1 and left empty: common sense); one item: cannot be held back |
| 2A7d | What it means when resources fall short | Evaluate (judge) | 0 | 0/0/0 | no | zero items; first item at analysis. Tried in round 1 and cut: the draft's key rested only on the Application Guidance (Background) |

### Section B table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2B1a | Ways to get information: data analysis, walk-throughs, observation and interviews | Determine (judge) | 2: d2_001, d2_020 (D1); also touched by d1_012 | 1/1/0 | no | analysis item still needed (`d2_020` was relabelled application in round 1's fix pass); `d2_020` is a transfer pair with `d2_001` and a sibling of `d2_003` |
| 2B1b | Documents to draw on: policies, questionnaires on risk and control, checklists and self-assessment surveys | Determine (judge) | 1: d2_002 (D1) | 0/1/0 | no | analysis item; one item: cannot be held back; `d2_002` is a hardening candidate |
| 2B2a | Using the right criteria to judge evidence quality | Apply (apply) | 1: d2_003 (D2) | 0/0/1 | yes | one item: cannot be held back |
| 2B2b | What makes evidence more reliable: corroboration, an independent source, and a system with sound controls behind it | Recognize (recall) | 1: d2_004 (D2); also touched by d2_003 | 0/1/0 | yes | one item: cannot be held back |
| 2B2c | Evidence strong enough that another informed, competent person would come to the same conclusion | Describe (recall) | 1: d2_005 (D2); also touched by d1_013, d3_002 | 0/0/1 | yes | one item: cannot be held back |
| 2B3a | Tools that save time and add insight: dashboards, continuous monitoring, embedded audit modules, robotic process automation, machine learning and AI | Recognize (recall) | 1: d2_015 (D3); also touched by d1_014 | 0/1/0 | yes | one item: cannot be held back, so topic 2B3 cannot enter the held-back form yet; what each tool is rests on "Common usage" and members-only guides; reliance and ownership lessons rest on the Standards |
| 2B4a | Breaking a process workflow into its parts | Define (recall) | 0 | 0/0/0 | no | zero items; thin: sound practice beyond Standard 13.2 |
| 2B4b | Studying workflows with responsibility matrices (such as RACI), walk-throughs and process maps | Analyze (judge) | 1: d2_006 (D4) | 0/1/0 | no | analysis item; one item: cannot be held back; the meaning of each RACI letter is "Common usage" (no key) |
| 2B4c | Data types: structured and unstructured | Explain (recall) | 1: d2_008 (D4) | 0/1/0 | yes | one item: cannot be held back |
| 2B4d | The analytics steps: set the objective, get the data, normalize it, analyze it, report the results | Explain (recall) | 1: d2_019 | 0/1/0 | yes | one item: cannot be held back; keys rest on comparability and Standard 14.1, never on a guide's step detail (members-only data analytics guides: never) |
| 2B4e | When to use each analysis method: diagnostic, predictive, prescriptive, anomaly detection, text analysis | Determine (judge) | 1: d2_007 (D4); also touched by d2_008 | 0/1/0 | no | analysis item; one item: cannot be held back; method definitions are "Common usage", so keys rest on Standards 14.1 and 14.2 |
| 2B5a | Reading ratios, variances, trends, benchmarks, and financial and nonfinancial data | Analyze (judge) | 1: d2_009 (D5) | 0/1/0 | no | analysis item; one item: cannot be held back; ratio formulas need the textbook |
| 2B5b | Choosing the analytical technique that serves the engagement objective | Determine (judge) | 1: d2_018 (D5) | 0/0/1 | yes | one item: cannot be held back |
| 2B6a | Comparing what is (the condition) with what should be (the criteria) | Analyze (judge) | 1: d2_016 (D6); also touched by d2_006, d2_007 | 0/0/1 | yes | one item: cannot be held back (Part 1 sits close: `cia1_d3_023`) |
| 2B6b | Finding root causes and the likely effects of a gap | Identify (recall) | 1: d2_010 (D6) | 0/1/0 | yes | one item: cannot be held back |
| 2B6c | Factors that make a finding more or less significant | Appraise (judge) | 2: d2_011 (D6), d2_021 (D6); also touched by d2_013, d3_007 | 0/1/1 | yes | - |
| 2B7a | Putting workpaper information in order | Organize (apply) | 0 | 0/0/0 | no | zero items; thin: Standard 14.6's considerations are "may" |
| 2B7b | What a complete workpaper with enough evidence looks like | Identify (recall) | 1: d2_012 (D7) | 0/1/0 | yes | one item: cannot be held back |
| 2B7c | Tracing the engagement results back to the workpapers | Analyze (judge) | 1: d2_017 (D7); also touched by d3_002 | 0/0/1 | yes | one item: cannot be held back |
| 2B7d | Organizing and keeping engagement records, given regulation and internal policy | Determine (judge) | 0 | 0/0/0 | no | zero items; first item at analysis (Part 1 sits close: `cia1_d2_020`, `cia1_d2_027`, `cia1_d2_082`) |
| 2B8a | Using professional judgment to weigh findings taken together | Determine (judge) | 1: d2_013 (D8) | 0/0/1 | yes | one item: cannot be held back |
| 2B8b | What goes into a conclusion, such as how well governance, risk management and controls work | Determine (judge) | 1: d2_014 (D8) | 0/0/1 | yes | one item: cannot be held back |

### Section C table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2C1a | Supervision runs through the whole engagement, starting at planning | Describe (recall) | 1: d3_001 (D9); also touched by d3_004 | 0/1/0 | yes | one item: cannot be held back |
| 2C1b | The supervisor's job in coordinating who does what | Describe (recall) | 1: d3_010 (D9) | 0/1/0 | yes | one item: cannot be held back; transfer pair with `d3_005` |
| 2C1c | The supervisor's job in reviewing workpapers and conclusions | Describe (recall) | 2: d3_002 (D9), d3_004 (D9) | 0/1/1 | yes | - |
| 2C1d | The supervisor's job in assessing how auditors performed | Describe (recall) | 1: d3_003 | 1/0/0 | yes | one item: cannot be held back |
| 2C2a | Choosing how to communicate (written or spoken, formal or informal) at planning, fieldwork and reporting | Determine (judge) | 3: d3_005 (D10), d3_006 (D10), d3_009 | 1/2/0 | no | analysis item (`d3_006` and `d3_009` are siblings) |
| 2C2b | Situations that need to be escalated | Identify (recall) | 1: d3_007 (D10) | 0/1/0 | yes | one item: cannot be held back |
| 2C2c | Choosing who should receive engagement communications | Determine (judge) | 1: d3_008 (D10) | 0/0/1 | yes | one item: cannot be held back |

## 4. Section totals and where the remaining items go

Every count below is a ceiling for distinct lessons, not a quota: if no distinct lesson is
left, the slot stays empty (never padding). A second item on one lesson follows the sibling
rule (plan section 3, decision 4: new scenario, new actor or depth, a different runner-up,
no shared key phrase, logged, never in one form or session; at most two per lesson and
about 15% of a section, confirmed by `cia-cross-part-reviewer`). Every Part 2 topic is a
Challenge topic (C1 to C7 for 2A, D1 to D10 for 2B and 2C), so tagged items also feed the
Challenge pool. The split by topic is KaiSip's reading of the plan's section 4 rule (a
little more for topics with more bullets and for judge verbs).

| Section | Now | Bar | Gap | Where the items go (topic: now, then share of the bar) |
|---|---|---|---|---|
| A | 22 | 100 | 78 | 2A1: 5 of 18; 2A2: 1 of 9; 2A3: 4 of 14; 2A4: 2 of 8; 2A5: 2 of 20; 2A6: 6 of 18; 2A7: 2 of 13. First items at analysis on 2A7b and 2A7d (keyed on the Standards), a first item on 2A5a (keyed on a requirement and its user guide), then analysis items on 2A4a and 2A7c, then second lessons. Round 1's empty slots (2A2a, 2A5c, 2A5e, 2A5f, 2A6c) reopen only with a new lead. 2A5 is furthest behind its share; 2A3's is the one most likely to stay short (2A3e blocked, 2A3c, 2A3d and 2A3f partly). |
| B | 21 | 80 | 59 | 2B1: 3 of 8; 2B2: 3 of 11; 2B3: 1 of 5; 2B4: 4 of 14; 2B5: 2 of 8; 2B6: 4 of 12; 2B7: 2 of 13; 2B8: 2 of 9. Analysis items on the 5 below depth (2B1a, 2B1b, 2B4b, 2B4e, 2B5a); a first item on 2B7d at analysis, then 2B7a and 2B4a (both thin); a second 2B3a item so topic 2B3 can enter the held-back form. |
| C | 10 | 20 | 10 | 2C1: 5 of 11; 2C2: 5 of 9. An analysis item on 2C2a; the rest are second lessons on the five one-item bullets. |

**Bullets the opened sources cannot take to depth, and what each needs.** The opened
sources for Part 2 are the Standards (Principles 13 and 14 above all; also 3.1, 4.2, 4.3,
5.2, 8.1, 8.2, 9.3, 10.2, 10.3, 11.2, 11.5, 12.3, 15.1 and the glossary), the four
Topical Requirements with their user guides, the two 2026 Statements of Position, the
Competency Framework and the syllabus. Background only (no key): the COSO summaries, the
Topical Requirements Application Guidance (ruled Background in round 1, 25 Nov 2026: not
on the exam's reference list, labelled Supplemental), and the three sources round 15 read
for the notes (the IIA data analytics paper, the 2024 AI Auditing Framework, the public
pages of two members-only guides), which are not in the citation library. Members-only
guides are never a source (no IIA membership, decided 25 Nov 2026); the textbook is
undecided.

| Bullet | What waits | Needs |
|---|---|---|
| 2A3e | Current and fixed assets, short- and long-term liabilities, capital, investments: no opened source names them | Textbook (for purchase). Until then, no item |
| 2A3c | IT general against application controls; named privacy principles; common security controls beyond the Cybersecurity requirement's own list | Textbook; the members-only IT essentials GTAG and privacy guide are never opened. Items keep to what the Cybersecurity requirement and user guide say (as `d1_017` does) |
| 2A3d | Business impact analysis, recovery time and recovery point as tested terms | Organizational Resilience requirement and user guide (opened; testable from 2027-10-01); textbook for the terms |
| 2A3f | Process-level risks and controls (purchase-to-pay matching, inventory, ERP roles, GRC systems) | Textbook; third-party lessons rest on the Third-Party requirement (opened; testable from 2027-03-01) |
| 2A4a (judge, below depth) | Agile, integrated and remote approaches beyond the Standards' general rules | Textbook; the members-only integrated approaches guide is never opened. The analysis item keeps to Standards 9.3, 13.5, 13.6 and 14.1 |
| 2A5a; 2A7d (judge) | Applicability judged by inherent risk; the board agreeing to a rescope when resources fall short | The Application Guidance is Background, so neither is keyable. 2A5a keys only on a requirement's applicability text and its user guide (documented assessment, reasons for exclusions); 2A7d keys on Standards 13.5 and 13.3 and the chief audit executive's role |
| 2A5g | Culture and behavior in an engagement's risk assessment, beyond Part 1's lessons | Organizational Behavior requirement and user guide (opened; testable from 2027-06-01) |
| 2B3a | What an embedded audit module, continuous monitoring or a bot is and does | Textbook; members-only data analytics guides never opened. Items on reliance and ownership rest on Standards 4.2, 4.3, 10.3 and 14.1 (as `d2_015` does) |
| 2B4b, 2B4e (judge, below depth); 2B4d | RACI letter meanings; definitions of the analysis methods; the detail of each analytics step | Textbook. The syllabus names the steps and methods; keys rest on Standards 14.1, 14.2 and 14.6, never on a definition (`d2_019` keys normalizing on comparability and Standard 14.1) |
| 2B5a (judge, below depth) | Ratio formulas and their reading | Textbook. The analysis item keeps to expectation, comparison and follow-up (Standard 14.2) |

## 5. Gap list in priority order

1. **First items at analysis on the three judge bullets with none:** 2A7b, 2A7d and 2B7d.
   2A7b and 2A7d were tried in round 1 and cut (below), so their next leads must key on
   the Standards (3.1, 13.3, 13.5) with options that do not give the key away by wording.
2. **Analysis items on the 8 judge bullets below depth**, Section A first: 2A4a and 2A7c
   (both tried in round 1 and left empty: new leads needed); then Section B: 2B1a (still,
   after `d2_020` was relabelled application), 2B1b, 2B4b, 2B4e, 2B5a; then Section C: 2C2a.
   2A4a, 2B4b, 2B4e and 2B5a must key on the Standards because their terms rest on
   "Common usage" or unopened guides.
3. **The other reachable zero-item bullets:** 2A5a (a lead keyed on a requirement and its
   user guide alone), then Section B's thin pair, 2B7a at application and 2B4a (recall).
   Section A still holds 11 of the 14 zero-item bullets; 2A5g waits on 2027-06-01 or a
   Part-1-distinct lesson, 2A3e and most of 2A3f wait on the textbook.
4. **Round 1's empty first-item slots**, reopened only with a lead that has a Standards
   distinction and repeats no Part 1 lesson: 2A2a, 2A5c, 2A5e, 2A5f, 2A6c. If none is
   found, they stay empty.
5. **Second lessons on the 40 one-item bullets**, to reach the counts (Section A needs 78)
   and free items for the held-back form, only where a distinct lesson exists, siblings
   logged. 2B3a first: topic 2B3 cannot enter the held-back form until it has two items.
   Blocked until new sources or dates: 2A3e (textbook), the "Common usage" points of 2A3c,
   2A3d, 2A3f, 2B4b, 2B4d, 2B4e and 2B5a (textbook), and lessons resting on the Third-Party
   (2027-03-01), Organizational Behavior (2027-06-01) and Organizational Resilience
   (2027-10-01) requirements.

**Tried in round 1 and left empty on purpose (25 Nov 2026).** Each slot was scaffolded and
dropped rather than padded; reopen it only with a new lead that answers the reason.

| Slot | What happened | Reason |
|---|---|---|
| 2A2a (first item) | Left empty | Common-sense key: a careful non-auditor would pick it |
| 2A5f (first item) | Left empty | Common-sense key |
| 2A5e (first item) | Left empty | Repeats `cia1_d4_008` |
| 2A5c (first item) | Left empty | Sound practice only; no Standards distinction to key on |
| 2A6c (first item) | Left empty | Sound practice only |
| 2A4a (analysis item) | Left empty | The lead retold the notes' example |
| 2A7c (analysis item) | Left empty | Common sense |
| 2A5a (first item) | Draft cut | Key rested only on the Topical Requirements Application Guidance, ruled Background (not on the exam's reference list; labelled Supplemental) |
| 2A7d (first item) | Draft cut | Key rested only on the Application Guidance, as for 2A5a |
| 2A7b (first item) | Draft cut | Answerable from wording |
| 2B1a (analysis item) | `d2_020` kept, relabelled application | Its fix pass reworked the stem and options and judged the result an application item; the bullet still lacks an analysis item |

Two lessons from Part 1 apply to every slot. A thin, common-sense lesson fails the blind
test however it is rebuilt (rounds 12 to 14: the 1B4g trust sibling and the 1C7c "stop the
loss" item were cut; plan section 7), so a lead whose key a careful non-auditor would pick
is dropped, not polished. And a slot with no distinct lesson stays empty (round 14 left 16
of 22 slots empty rather than repeat). Part 2 round 1 held to both: seven slots left empty
and three drafts cut (the table above).

## 6. Leads for first items and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. Each rests on the Part 2 notes and the
Standards; none retells a notes example (the pilot had to replace 2A3.1's example when a
question retold it). "Keep apart" names the nearest existing item, so the new item takes a
different trap (sibling rule). Leads marked **thin** risk the common-sense cut and need a
Standards distinction to survive. On a recall bullet, keep the knowledge at the bullet's
level even when the scenario asks for a choice.

Round 1 (25 Nov 2026) marks each lead in italics: used, not used, tried and left empty, or
tried and cut. A lead not used whose bullet now has an item becomes a sibling lead and
must stay apart from that item.

**Zero-item bullets in the pilot map (first items)**

- **2A1c Scope limitations at planning (Identify).** *Round 1: lesson (1) used by `d1_015`, with withheld files instead of an archive no one can query; lead (2) is now a sibling lead.* (1) During planning the auditor learns
  that half the period's transactions sit in a retired system whose archive the team
  cannot query. Key: raise and document it as a scope limitation, discussed with
  management when identified, aiming to resolve it (Standard 13.3; notes 2A1.3).
  Runner-up: narrow the period to the months that can be queried, which is a scope change
  needing approval and still hides the limitation. (2) A supervisor proposes dropping one
  of five sites to fit the hours. Key: if that site is needed to reach an objective, a
  resource constraint is a scope limitation (Standard 13.3; notes 2A7.3). Keep apart from
  `cia1_d1_027`, `_089`, `_099`, `_105` and `_106`: the Part 2 angle is spotting and
  recording it at planning, from the auditor's seat.
- **2A1d Stakeholder requests (Evaluate; analysis).** *Round 1: lead (2) used by `d1_016`; lead (1) is now a sibling lead (keep it apart from `d1_016` too).* (1) A regional director asks that a
  newly bought branch be left out "while it integrates", and the branch holds a fifth of
  the activity the objectives cover. Key: weigh whether the exclusion would stop the work
  an objective needs, record the request, decision and reason, and treat any scope change
  as one the CAE or delegate approves (Standard 13.3 and its considerations; notes 2A1.3).
  Runner-up: record it as an agreed exclusion, which is right in advisory work. (2) A
  request to add items within the same hours: it too may amount to a scope limitation (the
  lead the Part 1 map left open). Keep apart from `cia1_d1_059` (advisory exclusion) and
  `cia1_d1_105` (shortening).
- **2A2a Picking criteria (Identify).** *Round 1: tried and left empty (common-sense key); reopen only with a new lead.* The objective is compliance with a regulator's
  temperature rule; the plant's own target is stricter. Key: for a compliance objective
  the most relevant criterion is the regulation (Standard 13.4: the most relevant criteria
  for the objectives and scope). Runner-up: management's adequate target, which is right
  when the objective is the plant's own control performance. Keep apart from
  `cia1_d3_020` and `cia1_d3_064` (adequate criteria set by the board and senior
  management must be used): this item turns on the objective, not on adequacy.
- **2A3c Cyber, IT and data protection (Recognize).** *Round 1: not used; `d1_017` took another lesson (who watches for emerging threats). This lead is now a sibling lead; keep it apart from `d1_017`.* A cyber assurance work program tests
  access, patching and encryption only. Key: the requirement also asks about governance and
  about vendors' controls over the organization's systems and data (Cybersecurity
  Topical Requirement, Governance and Risk Management; notes 2A3.2). Runner-up: add more
  technical tests. No key on IT general against application controls or on a named privacy
  principle. Keep apart from `d1_006` (mapping a framework to the requirement) and `d1_007`.
- **2A4b Project management (Describe).** *Round 1: used by `d1_018`.* A supervisor's timeline lists tasks and hours but
  no named auditor per task. Key: the work program must name the auditor assigned (Standard
  13.6); hours per step are a should (Standard 13.5). Runner-up: add a weekly update
  schedule with management (a should, notes 2A4.3). Keep apart from `d1_011` (a missing
  criterion) by the runner-up.
- **2A5a Topical Requirements in the risk assessment (Recognize).** *Round 1: tried and cut: the draft's key rested only on the Application Guidance, now Background. This lead is retired as written; a new one keys on a requirement's own applicability text and its user guide (a documented assessment, a reason for each exclusion), never on inherent risk.* A cyber topic surfaces
  in a payroll engagement but is rated low. Key: document the applicability assessment and
  the reason for each exclusion, rather than apply every requirement (Application Guidance,
  a should, not a Standard; Cybersecurity user guide). Runner-up: apply every requirement
  because the topic surfaced, which is right when the topic is an assurance engagement's
  subject. Keep apart from `d1_009` (a risk that is significant).
- **2A5c Emerging risks (Recognize; thin).** *Round 1: tried and left empty (sound practice only).* A new threat has no loss history in the
  organization. Key: Standard 13.2 asks for the potentially significant risks, so no loss
  history does not rule it out; the Cybersecurity requirement asks whether management
  monitors emerging threats. Runner-up: rate it low on the loss record. Survives only with
  a Standards distinction in the stem.
- **2A5e Change in people, processes and systems (Recognize).** *Round 1: tried and left empty (repeats `cia1_d4_008`).* Half of a team left
  mid-year and one person now runs a key step. Key: the earlier assessment must be
  reviewed and updated, not reused (Standard 13.2), and the risk rated with the change.
  Runner-up: last year's clean result keeps the rating. Keep apart from `cia1_d2_081`
  (rule change, due care) and `d1_010`.
- **2A5f Structure and setting (Recognize; thin).** *Round 1: tried and left empty (common-sense key).* A reorganization removed a review
  layer; the new chart shows approvals with one team lead. Key: confirm through interviews
  and walk-throughs who actually approves before rating the risk (Standard 13.2, may).
  Runner-up: rate from the chart. Keep apart from `d2_006` (map against walk-through) by
  stage and question (planning a rating, not establishing a condition).
- **2A5g Culture (Recognize).** Leave until 2027-06-01 (Organizational Behavior
  requirement, with `testable_from`), unless a lesson distinct from 1C2a and 1D4a appears.
  Keep fraud out.
- **2A6c Efficiency procedures (Identify).** *Round 1: tried and left empty (sound practice only).* A three-signature approval on low-value
  purchases. Key: a procedure that weighs the control's time and cost against the risk it
  covers. Runner-up: reperform a sample of approvals, which tests effectiveness. Keep apart
  from `cia1_d3_019`, `cia1_d3_085`, and `d1_012`, where an efficiency procedure is a
  wrong option.
- **2A6e Test methods by subject (Identify).** *Round 1: not used; `d1_021` took the IT-systems subject (leavers' access). This receivables lead is now a sibling lead.* Receivables in an accounting engagement: key,
  a confirmation from customers as an independent source (Standard 14.1); runner-up, the
  system's ageing report (right where the system's controls are shown to work). Keep apart
  from `d2_004` and `d2_009` (independent sources) by subject and method.
- **2A7a Money (Determine; analysis).** *Round 1: used by `d1_022`.* A specialist's fee and travel exceed the
  engagement's budget, and two of three objectives need site work. Key: identify the
  resources each objective needs and discuss the shortfall with the CAE to obtain them
  (Standard 13.5). Runner-up: replace site visits with documents sent by management, which
  weakens evidence and changes the work program without approval. Keep apart from
  `cia1_d1_016` (the function's budget, the board).
- **2A7b People (Determine; analysis).** *Round 1: tried and cut: a draft was answerable from wording. The lesson stands; rebuild it so no option gives the key away.* No one on the team knows a new revenue rule; one
  auditor has related experience, and a staff member from the revenue team offers help.
  Key: the auditor who can obtain the competency through training and supervised work
  takes it on (Standard 3.1), and the revenue staff member does not test their own area.
  Runner-up: outsource the whole engagement. Keep apart from `cia1_d2_011`.
- **2A7d Resources fall short (Evaluate; analysis).** *Round 1: tried and cut: the draft's key rested only on the Application Guidance (a board agreeing to rescope). Keep to the Standards 13.3 and 13.5 key below.* The CAE cannot obtain the
  specialist. Key: weigh what the gap does to each objective; an unresolved constraint is a
  scope limitation handled under Standard 13.3, and the CAE chooses the response.
  Runner-up: the auditor quietly drops the technical objective, or takes the matter to the
  board. Keep apart from `cia1_d1_103` and the 2A1c lead (2).
- **2B3a Technology tools (Recognize).** *Round 1: neither lead used; `d2_015` took a third lesson (a validated, reconciled model's clean result is relied on). Both leads are now sibling leads; keep (2) apart from `d2_015` as well.* (1) The objective is whether 12 contracts carry
  board approval; a teammate proposes a machine learning model. Key: due care weighs cost
  against benefit, so the simple test answers it (Standard 4.2). Runner-up: the model,
  because it covers the population. (2) A dashboard built by the treasury team shows every
  exception cleared. Key: check the completeness and accuracy of its data feed before
  relying on it (Standards 4.3 and 14.1). Runner-up: rely on the dashboard because it covers
  the whole population. Keep (2) apart from `d2_003` by the actor and the tool.
- **2B4a Workflow segments (Define; thin).** *Round 1: not used.* A purchase-to-pay process mapped only inside
  procurement, while payment sits in finance. Key: the scope covers the processes the
  objectives need, so the handoff to finance is a segment of the workflow (Standards 13.2
  and 13.3). Keep apart from `cia1_d1_062` and `cia1_d1_104`.
- **2B4d Analytics steps (Explain).** *Round 1: neither lead used as written; `d2_019` keyed the normalize step (one supplier list before a duplicate test). Both leads are now sibling leads.* (1) An auditor runs duplicate-payment tests before
  agreeing what the analysis must answer. Key: set the objective first (the syllabus's
  order; Standard 14.1 relevance). Runner-up: normalize the data first. (2) Before analysis,
  key: reconcile the extract's totals to the ledger (Standard 14.1); runner-up: delete
  repeated records as duplicates (the notes say flag, never delete).
- **2B5b Choosing the technique (Determine; analysis).** *Round 1: not used as written; `d2_018` keyed a rate against a count for a quality claim. This lead is now a sibling lead.* The question is whether every
  parking entry is billed. Key: compare revenue with gate entry counts kept apart from
  billing (Standard 14.2 considerations relate financial to nonfinancial data). Runner-up:
  a year-on-year revenue trend, which answers a question about change over time. Keep apart
  from `d2_009` (choosing the source, not the technique).
- **2B6a Condition against criteria (Analyze; analysis).** *Round 1: used by `d2_016`.* Two of ten items differ from the
  criteria, but the evidence is thin. Key: decide with due care on more work, in an
  adjusted and approved work program, before calling it a finding (Standard 14.2).
  Runner-up: report it as a finding now, which is right when the evidence is sufficient.
  Keep apart from `cia1_d3_023` and `d2_007`.
- **2B7a Organizing workpapers (Organize; application; thin).** *Round 1: not used.* Keys on "may" alone are
  weak: build the item on Standard 14.6's must (evidence supporting the results, enough
  for another auditor to repeat the work) against a format preference. Consider leaving
  the slot empty.
- **2B7c Tracing results to workpapers (Analyze; analysis).** *Round 1: used by `d2_017`.* A draft finding states a root
  cause the manager gave in a conversation nobody recorded, and another sentence reaches
  wider than the tests. Key: the unsupported cause is what most needs evidence documented
  before the communication goes out (Standards 14.6 and 14.3). Runner-up: keep it because
  management agreed. Keep apart from `d3_002` (a supervisor's review note).
- **2B7d Keeping records (Determine; analysis).** *Round 1: not used; now Section B's only judge bullet with no item.* A team member wants to delete the
  workpapers once the report is out; a regulator's rule and the organization's policy set
  different periods. Key: retain them as law, regulation and the function's and
  organization's policies require, so the longer applicable period governs (Standard
  14.6). Runner-up: keep only the final report and a summary. Keep apart from
  `cia1_d2_027` (a preservation order), `cia1_d2_020` and `cia1_d2_082` (release).
- **2C1b Coordinating assignments (Describe).** *Round 1: first item `d3_010` (a task moved,
  unchanged, to another auditor during a leave; the supervisor names the new auditor in the
  program and approves the change). Lead fixed by the round 1 targeted audit: the earlier
  lead keyed the auditor assigned to each task, a third item on one lesson with `d1_011`
  and `d1_018`. It is now a sibling lead, and `d3_010` already keys approval of a
  reassignment, so build it on the second half (supervision adjusts to the skill gap) or
  leave it.* A supervisor reassigns a task midway when the work shows the planned auditor
  lacks a skill. Key: the change to the work program is approved promptly (Standard 13.6)
  and supervision adjusts (Standard 12.3). Runner-up: record the change at the closing
  review.

**Bullets below their verb's depth in the pilot map (analysis items)**

- **2A4a (Evaluate).** *Round 1: tried and left empty (the lead retold the notes' example); a new scenario is needed.* Existing: `d1_008` (agile). Lead: stock existence at 30 warehouses
  with central data. Key: remote analysis to rank them and first-hand counts where risk is
  highest (Standards 13.5 and 14.1). Runner-up: video counts done by warehouse staff. Do not
  retell the notes' branch-cash example.
- **2A6a (Determine).** *Round 1: used by `d1_019`; depth met.* Existing: `d1_012` (which procedure judges design). Lead: a
  walk-through shows a reconciliation leaves out manual journals. Key: record the design gap
  as a potential finding and adjust the program, rather than test 25 instances of it
  (Standard 14.2; notes 2A6.1). Runner-up: test operation as planned and report both.
- **2A6d (Evaluate).** *Round 1: not used as written; `d1_020` (a population that cannot hold the exception) met the depth. This lead is now a sibling lead.* Existing: `d1_011` (a missing criterion). Lead: the program's tasks
  cover none of one objective's units. Key: the scope and tasks must reach every objective
  (Standards 13.3 and 13.6). Runner-up: unjustified sample sizes (a consideration).
- **2A7c (Determine).** *Round 1: tried and left empty (common sense); a new lead is needed.* Existing: `d1_014` (training and set-up). Lead: the function's
  analytics tool cannot read the new ERP's format. Key: a direct, read-only extract with IT,
  reconciled to the ledger (Standard 14.1; notes 2B4.3). Runner-up: management's standard
  reports. Keep apart from `d2_003`.
- **2B1a (Determine).** *Round 1: used by `d2_020`, relabelled application in its fix pass; an analysis item is still needed, with a harder final two.* Existing: `d2_001` (observation where no record captures the step).
  Lead, its mirror: the objective is whether a control ran all year, and a system with
  effective controls logs every instance. Key: data analysis of the full year's records
  (Standard 14.1: relevant and sufficient; a system with effective controls strengthens
  reliability). Runner-up: observation, which shows only the moments watched. A transfer
  pair with `d2_001`; log it as a sibling.
- **2B1b (Determine).** Existing: `d2_002` (a questionnaire on what staff know). Lead: a
  unit's self-assessment survey rates every control effective. Key: use it to target the
  tests, not as evidence that controls operate (Standard 14.1: neither obtained directly nor
  independent). Runner-up: rely on it where earlier audits were clean. Keep apart from
  `cia1_d1_010` and `cia1_d1_097` (facilitating a self-assessment as advisory work).
- **2B4b (Analyze).** Existing: `d2_006` (walk-through against the approved map). Lead: a
  responsibility matrix for payroll changes shows one role both entering and approving
  changes and no role owning the check of new bank details. Key: test what the conflicting
  role can and does do, through access rights and records, before calling the condition
  (Standard 14.2: the condition rests on evidence). Runner-up: report the matrix's gaps as
  findings. No key on what a RACI letter means; do not retell the notes' vendor-setup
  example.
- **2B4e (Determine).** Existing: `d2_007` (anomaly flags). Lead: the question is why late
  deliveries rose in one quarter; the data holds routes, carriers and dates. Key: the
  analysis that explains a past result by drilling into its drivers (Standard 14.1:
  information consistent with the objective). Runner-up: a model that forecasts next
  quarter's late deliveries, which answers what may happen. The key must not rest on a
  method's definition (no opened source defines them); keep it apart from `d2_008`.
- **2B5a (Analyze).** Existing: `d2_009` (an independent headcount). Lead: a unit's margin
  rose while a comparable unit's fell. Key: build an expectation from independent drivers,
  then follow up the unexplained difference before calling it a finding (Standard 14.2).
  Runner-up: report the variance as a finding. Keep apart from `d2_009` and `d2_007`; do not
  retell the notes' fuel example.
- **2B6c (Appraise).** *Round 1: used by `d2_021`; depth met.* Existing: `d2_011` (methodology). Lead: weigh a small recurring gap
  with a safety effect against a larger one-off loss (Standard 14.3: likelihood, impact and
  other factors). Keep apart from `cia1_d3_056` and `cia1_d3_046`; do not retell the notes'
  allergen example.
- **2C2a (Determine).** Existing: `d3_005`, `d3_006`, `d3_009`. Lead: mid-fieldwork, a
  control failure needs the manager's immediate attention, and the manager wants only a
  phone call. Key: tell the manager promptly and keep a written record of the communication
  in the workpapers (Standard 13.1; open its considerations before keying the record).
  Runner-up: hold it for the closing meeting. Keep apart from `d3_006` (email instead of a
  meeting) and `d3_008` (who hears it).

**One-item bullets (siblings)**

40 bullets have one item each (32 after the pilot); second lessons come after the first
items and the analysis items above, under the sibling rule, and each first item stays out of the held-back form
until its bullet has a second. Leads written for the earlier draft of this map, now second
lessons rather than depth fixes:

- **2A1a.** Existing `d1_001` (a requested engagement). Sibling: management asks for
  advisory work on a cyber topic, then wants the results given to a regulator as assurance.
  Key: assurance on the topic must conform, so either assess every requirement as assurance
  or keep it advisory with no assurance conclusion (Cybersecurity requirement's scope
  sentence). Runner-up: advisory conformance, recommended only.
- **2A1b.** Existing `d1_002`. Sibling: the risk assessment ranks a regulatory goal low, but
  a law requires it. Key: objectives include any goal a law or regulation requires
  (Standard 13.3). Runner-up: objectives follow the ranking alone.
- **2A1e.** Existing `d1_003`. Sibling: mid-fieldwork, evidence shows a significant risk in a
  process outside scope. Key: the scope change is approved by the CAE or delegate and
  communicated to management (Standards 13.3 and 13.1; notes 2C2.2: no set order between
  them). Runner-up: test it now and tell management at the closing meeting. A transfer pair
  with `d3_005` (timing only).
- **2B2b.** Existing `d2_004`. Sibling: three sources (an outside party's confirmation, the
  auditor's own query of a weakly controlled system, management's reconciliation) against
  the three reliability factors (Standard 14.1). Runner-up: the auditor's own query.
- **2B6b.** Existing `d2_010` (effect). Sibling: many late approvals; one cause explains them
  all (routing to an absent approver with no delegate), another explains a few (training).
  Key: the cause that explains the pattern, identified with management where possible
  (Standard 14.3). Keep apart from `cia1_d3_066` and `cia1_d2_076`.
- **2B7b.** Existing `d2_012` (population and selection). Sibling: a conclusion rests on an
  interview with no record of who said what, or when. Key: the workpaper must let another
  auditor repeat the work (Standard 14.6). Runner-up: the reviewer's sign-off (Standard
  12.3).

## 7. Notes for the next round

- **What round 1 taught.** The Topical Requirements Application Guidance is Background
  only, so applicability judged by inherent risk and a board agreeing to rescope are not
  keyable; a Topical Requirement item keys on the requirement and its user guide alone. A
  key that is the only option naming the people planted in the stem gives itself away:
  name the stem's actors in distractors too.
- **Pick-the-longest after round 1:** A 20.5% (22 items), B 9.5% (21), C 20.0% (10).
  `check_cia.py` enforces 15 to 24% from 40 items per section; Section B's keys run short,
  so set longer B keys in the scaffold before B reaches 40.
- **Difficulty by verb** is enforced per topic, by the topic verb, from 8 items; no Part 2
  topic has 8 yet (2A6 has 6). The judge topics need at least 15% analysis and at most 25%
  foundational, so recall-verb bullets under judge topics (most of 2A1, 2A3, 2A5 and 2A6)
  still need scenario items, not definitions.
- **`d2_002` is a hardening candidate** (the pilot kept it on a split blind verdict); the
  2B1b analysis item can serve as its replacement if the hardening fails.
- **Re-run this map after each round**: set each new item's bullet in the scaffold step,
  before it is written.
