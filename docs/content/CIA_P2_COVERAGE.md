# CIA Part 2: syllabus bullet coverage map

Built 25 Nov 2026, after the Part 2 pilot, to measure Part 2 against the sale gate
(`docs/content/CIA_BANK_PLAN.md`, section 3, decision 4, revised in round 14): (a) every
syllabus bullet tested at its verb's depth with every gate passing; (b) two full
exam-weighted forms of distinct items per section (Part 2 is 100 questions as A 50, B 40,
C 10, so A 100, B 80, C 20); (c) one full form frozen and held back, and a short mock drawn
per learner from unseen items; a bullet's only item is never held back. Three forms
(Part 2 about 300: A 150, B 120, C 30) stay the target as sources open.

Source: the bullets of the Part 2 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026) as the
blueprint lists them. The "Covers" column is the blueprint's own wording
(`docs/content/CIA_BLUEPRINT.md`), not The IIA's. Bank: all 37 items in
`data/cia/cia2/originals/d1.json` to `d3.json` as of the Part 2 pilot (none retired). This is
an internal working document; it holds no item text. Built from the repository only: no
source was opened for it, and no prep provider.

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
- **The bullet's verb, and where it comes from.** The verb is the bullet's leading word,
  classed by the plan's section 4 (recall: Describe, Recognize, Identify, Explain; apply:
  Interpret, Apply, Demonstrate, Maintain; judge: Evaluate, Determine, Analyze, Assess,
  Plan, Complete, Prepare, Summarize). The repository stores no IIA text, and unlike Part 1
  no record of Part 2's leading words was kept, so each verb carries its source:
  - **E**: the bullet's level as `.claude/agents/cia-p2-domain-expert.md` states it from
    the opened syllabus: every 2A3 bullet is recognize-level; 2A4's project management
    bullet is recall; most 2A5 bullets are recognize-level and one asks the candidate to
    determine (2A5d, which the notes' "can do" line also gives as Determine); 2B3's one
    bullet is recognize-level; both 2B8 bullets ask the candidate to determine; 2C1's
    bullets are describe-level; one 2C2 bullet asks the candidate to determine (2C2c, by
    its "can do" line).
  - **T**: no bullet-level record, so the topic's verb from `data/cia/shared/outline.json`
    stands in. This is the strict reading: most Part 2 topic verbs are judge verbs, so a
    T bullet can only be shown as below depth when it is not, never the reverse. Some
    notes "can do" lines suggest lower verbs (Identify for 2A1c, 2A6b, 2A6c and 2A6e);
    none of those would change a depth verdict today, because each has no item or already
    has an analysis item.
  - Confirm every T verb against the opened syllabus at the next currency check
    (`cia-currency-checker` re-opens S2 each round), and record the leading words here.
- **Depth.** A recall bullet is met by any item; an apply bullet needs at least one
  application or analysis item; a judge bullet needs at least one analysis item. In the
  section table, "below depth" counts bullets that have items but none at their verb's
  depth; zero-item bullets are counted on their own.
- **Mapping is judgment.** Where an item could sit under two bullets, the one its key
  turns on won. `d3_004` (a cosourced firm's work reviewed like staff work) went to 2C1c,
  not 2C1a, because the key is the review of workpapers, not when supervision starts;
  `d2_003` (a full population from a file the audited team keeps) stays at 2B2a, as its
  author set it, because the key weighs coverage against reliability, which is applying
  the three qualities; its reason (the source) makes it "also touched by" 2B2b.

## 2. Where Part 2 stands against the gate

| Section | Items | Two-form bar (gate) | Three-form target | Gap to the bar | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Engagement Planning | 14 | 100, not met | 150 | 86 | 31 | 17 | 14 | 7 |
| B Information Gathering, Analysis, and Evaluation | 14 | 80, not met | 120 | 66 | 22 | 8 | 14 | 4 |
| C Engagement Supervision and Communication | 9 | 20, not met | 30 | 11 | 7 | 1 | 4 | 0 |
| **Part 2** | **37** | **200, not met** | **300** | **163** | **60** | **26** | **32** | **11** |

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 100 as 50/40/10 and 33 as 17/13/3. F/Ap/An by section:
A 2/9/3, B 1/9/4, C 2/5/2.)

What the counts hide:

- **Gate (a) is not met.** 26 of 60 bullets have no item, and 11 more have items but none
  at their verb's depth (all of them judge bullets with only foundational or application
  items). Only 23 bullets meet their depth today: A 7 of 31, B 10 of 22, C 6 of 7.
- **No full form can be drawn yet.** Topic 2B3 has no item at all, and the held-back form
  must sample every topic. Of the 34 bullets with items, 32 have exactly one, and a
  bullet's only item stays out of the held-back form, so almost the whole bank is
  practice-only for now.
- **Gate (b) needs about 163 more items, and the pilot kept 37 of 50 written (74%).** At
  that rate a round must write about 220 to keep 163. Section A carries more than half of
  the gap (86).
- **The opened sources cannot reach some bullets at depth** (section 4): 2A3e (finance and
  accounting basics) has no opened source at all; parts of 2A3c, 2A3d, 2A3f, 2A4a, 2B3a,
  2B4b, 2B4d, 2B4e and 2B5a rest on "Common usage" or on members-only guides. The owner
  decided on 25 Nov 2026 not to join The IIA, so members-only guides are never a source; a
  textbook purchase is still undecided (plan section 9).
- **Three Topical Requirements are not testable yet**: Third-Party from 2027-03-01,
  Organizational Behavior from 2027-06-01, Organizational Resilience from 2027-10-01
  (`data/cia/shared/currency.json`). An item that rests on one carries that
  `testable_from` and stays out of mocks, forms and the free sample until the date, so it
  does not count toward the gate before then. No Part 2 item carries a future
  `testable_from` today; the four items on the Cybersecurity requirement are testable now.
- **Part 1 already teaches many engagement lessons.** Scope limitations (`cia1_d1_027`,
  `_089`, `_099`, `_105`, `_106`), criteria (`cia1_d1_060`, `cia1_d3_020`, `cia1_d3_064`,
  `cia1_d2_077`), effectiveness against efficiency (`cia1_d3_019`, `cia1_d3_085`),
  significance (`cia1_d2_039`, `cia1_d3_046`, `cia1_d3_056`), root cause (`cia1_d3_017`,
  `cia1_d3_066`, `cia1_d2_076`), records (`cia1_d2_020`, `cia1_d2_027`, `cia1_d2_082`),
  benchmarking (`cia1_d1_050`, `cia1_d1_071`) and process maps (`cia1_d1_062`,
  `cia1_d1_104`). A Part 2 item on the same lesson is a cross-part sibling: new scenario,
  new actor or depth, new runner-up, logged (the pilot cut one repeat of a Part 1 lesson).
- **Siblings already logged** (plan section 7, the Part 2 pilot): `d1_001` with
  `cia1_d1_061` and `cia1_d1_046`; `d1_007` with `cia1_d2_016`; `d1_009` with
  `cia1_d1_061`; `d1_014` with `cia1_d2_012`; `d3_001` with `cia1_d2_038`; `d3_004` with
  `cia1_d1_065`; `d3_006` with `d3_009`.
- **Challenge tags:** 32 of 37 items carry one; `d1_002`, `d1_007`, `d2_001`, `d3_003` and
  `d3_009` carry `null` as too basic for the Challenge candidate.

## 3. The map

### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2A1a | Where Topical Requirements come into setting objectives and scope | Determine, T (judge) | 1: d1_001 (C1) | 0/1/0 | no | analysis item; one item: cannot be held back. Items on Third-Party, Organizational Behavior or Organizational Resilience need `testable_from` |
| 2A1b | What feeds the objectives: whether the job is assurance or advisory, strategy, regulation, risk appetite, policies, how governance, risk and control are run, earlier audit reports and other providers' work | Determine, T (judge) | 1: d1_002 | 1/0/0 | no | analysis item; one item: cannot be held back |
| 2A1c | Spotting scope limitations at planning and writing them down | Determine, T (judge) | 0 | 0/0/0 | no | zero items (Part 1 sits close: 1A7e's five items) |
| 2A1d | Ways to handle and record requests from stakeholders | Determine, T (judge) | 0; also touched by d1_001 | 0/0/0 | no | zero items |
| 2A1e | Good ways to deal with a change in objectives or scope | Determine, T (judge) | 1: d1_003 (C1); also touched by d3_005 | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2A2a | Picking the criteria that best fit the activity being audited | Determine, T (judge) | 0 | 0/0/0 | no | zero items (Part 1 sits close: `cia1_d3_020`, `cia1_d3_064`, `cia1_d1_060`) |
| 2A2b | Testing a set of criteria: relevant, specific, practical, in line with objectives, and able to support fair comparisons | Determine, T (judge) | 1: d1_004 (C2) | 0/0/1 | yes | one item: cannot be held back |
| 2A3a | Where Topical Requirements come into planning | Recognize, E (recall) | 1: d1_006 (C3) | 0/1/0 | yes | one item: cannot be held back |
| 2A3b | How the area's strategic goals connect to the way it measures and manages performance and to risk management | Recognize, E (recall) | 1: d1_005 (C3) | 0/1/0 | yes | one item: cannot be held back |
| 2A3c | Current and emerging cyber risks, IT general controls, everyday security controls, why IT control frameworks help, data privacy principles and data security practice | Recognize, E (recall) | 0; also touched by d1_006 | 0/0/0 | no | zero items; IT general against application controls is "Common usage" (no key); named privacy principles need a members-only guide or the textbook |
| 2A3d | Readiness for disruption (continuity and disaster recovery): business impact analysis, resilience, handling incidents, and tests of backup and recovery | Recognize, E (recall) | 1: d1_007 | 1/0/0 | yes | one item: cannot be held back; business impact analysis and recovery objectives are "Common usage"; the resilience requirement is testable from 2027-10-01 |
| 2A3e | Finance and accounting basics for the area: assets (current and fixed), liabilities (short and long term), capital and investments | Recognize, E (recall) | 0 | 0/0/0 | no | zero items; blocked: no opened source (textbook) |
| 2A3f | Key risks and controls in everyday business processes and in systems such as CRM, ERP and GRC | Recognize, E (recall) | 0 | 0/0/0 | no | zero items; process detail is "Common usage" (textbook); third parties rest on the Third-Party requirement (testable 2027-03-01) |
| 2A4a | Weighing approaches (traditional, agile, integrated, remote) and picking the best fit | Determine, T (judge) | 1: d1_008 (C4) | 0/1/0 | no | analysis item; one item: cannot be held back; beyond the Standards' general rules needs the members-only integrated approaches guide (never) or the textbook |
| 2A4b | Project management ideas used to plan and run an engagement | recall, E (leading word not recorded) | 0 | 0/0/0 | no | zero items |
| 2A5a | Where Topical Requirements come into the risk assessment | Recognize, E (recall) | 0; also touched by d1_009 | 0/0/0 | no | zero items |
| 2A5b | Risks that run through the whole activity: regulatory, cyber, IT, operational and financial | Recognize, E (recall) | 1: d1_009 (C5) | 0/1/0 | yes | one item: cannot be held back |
| 2A5c | How emerging risks affect the organization | Recognize, E (recall) | 0 | 0/0/0 | no | zero items; thin beyond Standard 13.2 and the Cybersecurity requirement |
| 2A5d | Methods and criteria for rating and ranking risks and controls | Determine, E (judge) | 1: d1_010 (C5) | 0/0/1 | yes | one item: cannot be held back |
| 2A5e | How changes to people, processes and systems shift risk | Recognize, E (recall) | 0 | 0/0/0 | no | zero items |
| 2A5f | How structure and setting matter: remote or in-person work, flat or traditional layers, central or local control | Recognize, E (recall) | 0 | 0/0/0 | no | zero items; thin: mostly sound practice in the notes |
| 2A5g | How culture shapes the control environment: how individuals and groups behave, and tone at the top | Recognize, E (recall) | 0 | 0/0/0 | no | zero items; the Organizational Behavior requirement is testable from 2027-06-01; Part 1 sits close (1C2a, 1D4a) |
| 2A6a | Procedures that test whether a control is well designed | Determine, T (judge) | 1: d1_012 (C6) | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2A6b | Procedures that test whether controls work | Determine, T (judge) | 1: d1_013 (C6) | 0/0/1 | yes | one item: cannot be held back |
| 2A6c | Procedures that test whether controls are efficient | Determine, T (judge) | 0 | 0/0/0 | no | zero items (Part 1 sits close: `cia1_d3_019`, `cia1_d3_085`) |
| 2A6d | Judging whether the work program is good enough | Determine, T (judge) | 1: d1_011 (C6); also touched by d1_003, d1_008 | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2A6e | Test methods for engagements that cover accounting, finance, IT systems, operations or cybersecurity | Determine, T (judge) | 0 | 0/0/0 | no | zero items; methods outside cybersecurity are "May" or "Common usage" in the notes (textbook) |
| 2A7a | Money the engagement needs | Determine, T (judge) | 0 | 0/0/0 | no | zero items |
| 2A7b | People the engagement needs | Determine, T (judge) | 0 | 0/0/0 | no | zero items |
| 2A7c | Technology the engagement needs | Determine, T (judge) | 1: d1_014 (C7) | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2A7d | What it means when resources fall short | Determine, T (judge) | 0 | 0/0/0 | no | zero items |

### Section B table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2B1a | Ways to get information: data analysis, walk-throughs, observation and interviews | Identify, T (recall) | 1: d2_001; also touched by d1_012 | 1/0/0 | yes | one item: cannot be held back |
| 2B1b | Documents to draw on: policies, questionnaires on risk and control, checklists and self-assessment surveys | Identify, T (recall) | 1: d2_002 (D1) | 0/1/0 | yes | one item: cannot be held back |
| 2B2a | Using the right criteria to judge evidence quality | Evaluate, T (judge) | 1: d2_003 (D2) | 0/0/1 | yes | one item: cannot be held back |
| 2B2b | What makes evidence more reliable: corroboration, an independent source, and a system with sound controls behind it | Evaluate, T (judge) | 1: d2_004 (D2); also touched by d2_003 | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2B2c | Evidence strong enough that another informed, competent person would come to the same conclusion | Evaluate, T (judge) | 1: d2_005 (D2); also touched by d1_013, d3_002 | 0/0/1 | yes | one item: cannot be held back |
| 2B3a | Tools that save time and add insight: dashboards, continuous monitoring, embedded audit modules, robotic process automation, machine learning and AI | Recognize, E (recall) | 0; also touched by d1_014 | 0/0/0 | no | zero items (the only topic with none); what each tool is rests on "Common usage" and members-only guides; reliance and ownership lessons rest on the Standards |
| 2B4a | Breaking a process workflow into its parts | Apply, T (apply) | 0 | 0/0/0 | no | zero items; thin: sound practice beyond Standard 13.2 |
| 2B4b | Studying workflows with responsibility matrices (such as RACI), walk-throughs and process maps | Apply, T (apply) | 1: d2_006 (D4) | 0/1/0 | yes | one item: cannot be held back; the meaning of each RACI letter is "Common usage" (no key) |
| 2B4c | Data types: structured and unstructured | Apply, T (apply) | 1: d2_008 (D4) | 0/1/0 | yes | one item: cannot be held back |
| 2B4d | The analytics steps: set the objective, get the data, normalize it, analyze it, report the results | Apply, T (apply) | 0 | 0/0/0 | no | zero items; the order is the syllabus's, each step's detail is sound practice (members-only data analytics guides: never) |
| 2B4e | When to use each analysis method: diagnostic, predictive, prescriptive, anomaly detection, text analysis | Apply, T (apply) | 1: d2_007 (D4); also touched by d2_008 | 0/1/0 | yes | one item: cannot be held back; method definitions are "Common usage", so keys rest on Standards 14.1 and 14.2 |
| 2B5a | Reading ratios, variances, trends, benchmarks, and financial and nonfinancial data | Apply, T (apply) | 1: d2_009 (D5) | 0/1/0 | yes | one item: cannot be held back; ratio formulas need the textbook |
| 2B5b | Choosing the analytical technique that serves the engagement objective | Apply, T (apply) | 0 | 0/0/0 | no | zero items |
| 2B6a | Comparing what is (the condition) with what should be (the criteria) | Determine, T (judge) | 0; also touched by d2_006, d2_007 | 0/0/0 | no | zero items (Part 1 sits close: `cia1_d3_023`) |
| 2B6b | Finding root causes and the likely effects of a gap | Determine, T (judge) | 1: d2_010 (D6) | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2B6c | Factors that make a finding more or less significant | Determine, T (judge) | 1: d2_011 (D6); also touched by d2_013, d3_007 | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2B7a | Putting workpaper information in order | Prepare, T (judge) | 0 | 0/0/0 | no | zero items; thin: Standard 14.6's considerations are "may" |
| 2B7b | What a complete workpaper with enough evidence looks like | Prepare, T (judge) | 1: d2_012 (D7) | 0/1/0 | no | analysis item; one item: cannot be held back |
| 2B7c | Tracing the engagement results back to the workpapers | Prepare, T (judge) | 0; also touched by d3_002 | 0/0/0 | no | zero items |
| 2B7d | Organizing and keeping engagement records, given regulation and internal policy | Prepare, T (judge) | 0 | 0/0/0 | no | zero items (Part 1 sits close: `cia1_d2_020`, `cia1_d2_027`, `cia1_d2_082`) |
| 2B8a | Using professional judgment to weigh findings taken together | Determine, E (judge) | 1: d2_013 (D8) | 0/0/1 | yes | one item: cannot be held back |
| 2B8b | What goes into a conclusion, such as how well governance, risk management and controls work | Determine, E (judge) | 1: d2_014 (D8) | 0/0/1 | yes | one item: cannot be held back |

### Section C table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2C1a | Supervision runs through the whole engagement, starting at planning | Describe, E (recall) | 1: d3_001 (D9); also touched by d3_004 | 0/1/0 | yes | one item: cannot be held back |
| 2C1b | The supervisor's job in coordinating who does what | Describe, E (recall) | 0 | 0/0/0 | no | zero items |
| 2C1c | The supervisor's job in reviewing workpapers and conclusions | Describe, E (recall) | 2: d3_002 (D9), d3_004 (D9) | 0/1/1 | yes | - |
| 2C1d | The supervisor's job in assessing how auditors performed | Describe, E (recall) | 1: d3_003 | 1/0/0 | yes | one item: cannot be held back |
| 2C2a | Choosing how to communicate (written or spoken, formal or informal) at planning, fieldwork and reporting | Apply, T (apply) | 3: d3_005 (D10), d3_006 (D10), d3_009 | 1/2/0 | yes | - (`d3_006` and `d3_009` are siblings) |
| 2C2b | Situations that need to be escalated | Apply, T (apply) | 1: d3_007 (D10) | 0/1/0 | yes | one item: cannot be held back |
| 2C2c | Choosing who should receive engagement communications | Determine, E (judge) | 1: d3_008 (D10) | 0/0/1 | yes | one item: cannot be held back |

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
| A | 14 | 100 | 86 | 2A1: 3 of 18; 2A2: 1 of 9; 2A3: 3 of 14; 2A4: 1 of 8; 2A5: 2 of 20; 2A6: 3 of 18; 2A7: 1 of 13. First items on the 14 reachable zero-item bullets, then analysis items on the 7 below depth, then second lessons. 2A3's share is the one most likely to stay short (2A3e blocked, 2A3c, 2A3d and 2A3f partly). |
| B | 14 | 80 | 66 | 2B1: 2 of 8; 2B2: 3 of 11; 2B3: 0 of 5; 2B4: 3 of 14; 2B5: 1 of 8; 2B6: 2 of 12; 2B7: 1 of 13; 2B8: 2 of 9. 2B3 first (no item stops any full form), then 2B7 (three zero-item bullets) and 2B6a. |
| C | 9 | 20 | 11 | 2C1: 4 of 11; 2C2: 5 of 9. 2C1b first; the rest are second lessons on one-item bullets. |

**Bullets the opened sources cannot take to depth, and what each needs.** The opened
sources for Part 2 are the Standards (Principles 13 and 14 above all; also 3.1, 4.2, 4.3,
5.2, 8.1, 8.2, 9.3, 10.2, 10.3, 11.2, 11.5, 12.3, 15.1 and the glossary), the four
Topical Requirements with their user guides and the Application Guidance, the two 2026
Statements of Position, the Competency Framework and the syllabus. Background only (no
key): the COSO summaries, and the three sources round 15 read for the notes (the IIA data
analytics paper, the 2024 AI Auditing Framework, the public pages of two members-only
guides), which are not in the citation library. Members-only guides are never a source
(no IIA membership, decided 25 Nov 2026); the textbook is undecided.

| Bullet | What waits | Needs |
|---|---|---|
| 2A3e | Current and fixed assets, short- and long-term liabilities, capital, investments: no opened source names them | Textbook (for purchase). Until then, no item |
| 2A3c | IT general against application controls; named privacy principles; common security controls beyond the Cybersecurity requirement's own list | Textbook; the members-only IT essentials GTAG and privacy guide are never opened. Items keep to what the Cybersecurity requirement and user guide say |
| 2A3d | Business impact analysis, recovery time and recovery point as tested terms | Organizational Resilience requirement and user guide (opened; testable from 2027-10-01); textbook for the terms |
| 2A3f | Process-level risks and controls (purchase-to-pay matching, inventory, ERP roles, GRC systems) | Textbook; third-party lessons rest on the Third-Party requirement (opened; testable from 2027-03-01) |
| 2A4a | Agile, integrated and remote approaches beyond the Standards' general rules | Textbook; the members-only integrated approaches guide is never opened. Items keep to Standards 9.3, 13.5, 13.6 and 14.1 |
| 2A5g | Culture and behavior in an engagement's risk assessment, beyond Part 1's lessons | Organizational Behavior requirement and user guide (opened; testable from 2027-06-01) |
| 2B3a | What an embedded audit module, continuous monitoring or a bot is and does | Textbook; members-only data analytics guides never opened. Items on reliance and ownership rest on Standards 4.2, 4.3, 10.3 and 14.1 |
| 2B4b, 2B4d, 2B4e | RACI letter meanings; the detail of each analytics step; definitions of the analysis methods | Textbook. The syllabus names the steps and methods; keys rest on Standards 14.1, 14.2 and 14.6, never on a definition |
| 2B5a | Ratio formulas and their reading | Textbook. Items keep to expectation, comparison and follow-up (Standard 14.2) |

## 5. Gap list in priority order

1. **Section A's reachable zero-item bullets (14):** 2A1c, 2A1d, 2A2a, 2A3c (Cybersecurity
   requirement only), 2A4b, 2A5a, 2A5c, 2A5e, 2A5f, 2A6c, 2A6e (cybersecurity and evidence
   rules only), 2A7a, 2A7b, 2A7d. Section A is half the exam and holds 17 of the 26
   zero-item bullets; 2A5g waits on 2027-06-01 or a Part-1-distinct lesson, 2A3e and most
   of 2A3f wait on the textbook.
2. **Section A's judge bullets below depth (7 analysis items):** 2A1a, 2A1b, 2A1e, 2A4a,
   2A6a, 2A6d, 2A7c.
3. **Section B's zero-item bullets (8), 2B3a first:** 2B3a (no full form can be drawn while
   2B3 is empty), then 2B6a, 2B7c, 2B7d, 2B5b, 2B4d, 2B7a, 2B4a.
4. **Section B's judge bullets below depth (4) and Section C's zero-item bullet:** 2B2b,
   2B6b, 2B6c, 2B7b; 2C1b.
5. **Second lessons on the 32 one-item bullets**, to reach the counts and free items for
   the held-back form, only where a distinct lesson exists, siblings logged. Blocked until
   new sources or dates: 2A3e (textbook), the "Common usage" points of 2A3c, 2A3d, 2A3f,
   2B4b, 2B4d, 2B4e and 2B5a (textbook), and lessons resting on the Third-Party
   (2027-03-01), Organizational Behavior (2027-06-01) and Organizational Resilience
   (2027-10-01) requirements.

Before step 1, the currency check confirms the T verbs (section 1); if a T bullet's leading
word is a recall or apply verb, it leaves step 2 or 4.

Two lessons from Part 1 apply to every slot. A thin, common-sense lesson fails the blind
test however it is rebuilt (rounds 12 to 14: the 1B4g trust sibling and the 1C7c "stop the
loss" item were cut; plan section 7), so a lead whose key a careful non-auditor would pick
is dropped, not polished. And a slot with no distinct lesson stays empty (round 14 left 16
of 22 slots empty rather than repeat).

## 6. Leads for first items and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. Each rests on the Part 2 notes and the
Standards; none retells a notes example (the pilot had to replace 2A3.1's example when a
question retold it). "Keep apart" names the nearest existing item, so the new item takes a
different trap (sibling rule). Leads marked **thin** risk the common-sense cut and need a
Standards distinction to survive.

**Zero-item bullets (first items)**

- **2A1c Scope limitations at planning.** (1) During planning the auditor learns that
  half the period's transactions sit in a retired system whose archive the team cannot
  query. Key: raise and document it as a scope limitation, discussed with management when
  identified, aiming to resolve it (Standard 13.3; notes 2A1.3). Runner-up: narrow the
  period to the months that can be queried, which is a scope change needing approval and
  still hides the limitation. (2) A supervisor proposes dropping one of five sites to fit
  the hours. Key: if that site is needed to reach an objective, a resource constraint is
  a scope limitation (Standard 13.3; notes 2A7.3). Keep apart from `cia1_d1_027`,
  `_089`, `_099`, `_105` and `_106`: the Part 2 angle is spotting and recording it at
  planning, from the auditor's seat.
- **2A1d Stakeholder requests.** (1) A regional director asks that a newly bought branch
  be left out "while it integrates". Key: judge whether the exclusion would stop the work
  an objective needs, record the request, decision and reason, and treat any scope change
  as one the CAE or delegate approves (Standard 13.3 and its considerations; notes 2A1.3).
  Runner-up: record it as an agreed exclusion, which is right in advisory work. (2) A
  request to add items within the same hours: it too may amount to a scope limitation (the
  lead the Part 1 map left open). Keep apart from `cia1_d1_059` (advisory exclusion) and
  `cia1_d1_105` (shortening).
- **2A2a Picking criteria.** The objective is compliance with a regulator's temperature
  rule; the plant's own target is stricter. Key: for a compliance objective the most
  relevant criterion is the regulation (Standard 13.4: the most relevant criteria for the
  objectives and scope). Runner-up: management's adequate target, which is right when the
  objective is the plant's own control performance. Keep apart from `cia1_d3_020` and
  `cia1_d3_064` (adequate criteria set by the board and senior management must be used):
  this item turns on the objective, not on adequacy.
- **2A3c Cyber, IT and data protection (recognize).** A cyber assurance work program tests
  access, patching and encryption only. Key: the requirement also asks about governance and
  about vendors' controls over the organization's systems and data (Cybersecurity
  Topical Requirement, Governance and Risk Management; notes 2A3.2). Runner-up: add more
  technical tests. No key on IT general against application controls or on a named privacy
  principle. Keep apart from `d1_006` (mapping a framework to the requirement) and `d1_007`.
- **2A4b Project management (recall).** A supervisor's timeline lists tasks and hours but
  no named auditor per task. Key: the work program must name the auditor assigned (Standard
  13.6); hours per step are a should (Standard 13.5). Runner-up: add a weekly update
  schedule with management (a should, notes 2A4.3). Keep apart from `d1_011` (a missing
  criterion) by the runner-up.
- **2A5a Topical Requirements in the risk assessment.** A cyber topic surfaces in a payroll
  engagement but is rated low. Key: document the applicability assessment and the reason
  for each exclusion, rather than apply every requirement (Application Guidance, a should,
  not a Standard; Cybersecurity user guide). Runner-up: apply every requirement because the
  topic surfaced, which is right when the topic is an assurance engagement's subject. Keep
  apart from `d1_009` (a risk that is significant).
- **2A5c Emerging risks (thin).** A new threat has no loss history in the organization.
  Key: Standard 13.2 asks for the potentially significant risks, so no loss history does
  not rule it out; the Cybersecurity requirement asks whether management monitors emerging
  threats. Runner-up: rate it low on the loss record. Survives only with a Standards
  distinction in the stem.
- **2A5e Change in people, processes and systems.** Half of a team left mid-year and one
  person now runs a key step. Key: the earlier assessment must be reviewed and updated, not
  reused (Standard 13.2), and the risk rated with the change. Runner-up: last year's clean
  result keeps the rating. Keep apart from `cia1_d2_081` (rule change, due care) and
  `d1_010`.
- **2A5f Structure and setting (thin).** A reorganization removed a review layer; the new
  chart shows approvals with one team lead. Key: confirm through interviews and
  walk-throughs who actually approves before rating the risk (Standard 13.2, may). Runner-up:
  rate from the chart. Keep apart from `d2_006` (map against walk-through) by stage and
  question (planning a rating, not establishing a condition).
- **2A5g Culture.** Leave until 2027-06-01 (Organizational Behavior requirement, with
  `testable_from`), unless a lesson distinct from 1C2a and 1D4a appears. Keep fraud out.
- **2A6c Efficiency procedures.** A three-signature approval on low-value purchases. Key: a
  procedure that weighs the control's time and cost against the risk it covers. Runner-up:
  reperform a sample of approvals, which tests effectiveness. Keep apart from
  `cia1_d3_019`, `cia1_d3_085`, and `d1_012`, where an efficiency procedure is a wrong
  option.
- **2A6e Test methods by subject.** Receivables in an accounting engagement: key, a
  confirmation from customers as an independent source (Standard 14.1); runner-up, the
  system's ageing report (right where the system's controls are shown to work). Keep apart
  from `d2_004` and `d2_009` (independent sources) by subject and method.
- **2A7a Money.** A specialist's fee and travel exceed the engagement's budget. Key:
  identify the resources needed and discuss the shortfall with the CAE to obtain them
  (Standard 13.5). Runner-up: replace site visits with documents sent by management, which
  weakens evidence and changes the work program without approval. Keep apart from
  `cia1_d1_016` (the function's budget, the board).
- **2A7b People.** No one on the team knows a new revenue rule. Key: an auditor who can
  obtain the competency through training and supervised work takes it on (Standard 3.1).
  Runner-up: outsource the whole engagement. Keep apart from `cia1_d2_011`.
- **2A7d Resources fall short.** The CAE cannot obtain the specialist. Key: the CAE
  weighs the implications and chooses the response; an unresolved constraint is a scope
  limitation handled under Standard 13.3. Runner-up: the auditor quietly drops the
  technical objective, or takes the matter to the board. Keep apart from `cia1_d1_103` and
  the 2A1c lead (2).
- **2B3a Technology tools (recognize).** (1) The objective is whether 12 contracts carry
  board approval; a teammate proposes a machine learning model. Key: due care weighs cost
  against benefit, so the simple test answers it (Standard 4.2). Runner-up: the model,
  because it covers the population. (2) A dashboard built by the treasury team shows every
  exception cleared. Key: check the completeness and accuracy of its data feed before
  relying on it (Standards 4.3 and 14.1). Runner-up: rely on the dashboard because it covers
  the whole population. Keep (2) apart from `d2_003` by the actor and the tool.
- **2B4a Workflow segments (thin).** A purchase-to-pay process mapped only inside
  procurement, while payment sits in finance. Key: the scope covers the processes the
  objectives need, so the handoff to finance is mapped (Standards 13.2 and 13.3). Keep
  apart from `cia1_d1_062` and `cia1_d1_104`.
- **2B4d Analytics steps.** (1) An auditor runs duplicate-payment tests before agreeing
  what the analysis must answer. Key: set the objective first (the syllabus's order;
  Standard 14.1 relevance). Runner-up: normalize the data first. (2) Before analysis, key:
  reconcile the extract's totals to the ledger (Standard 14.1); runner-up: delete repeated
  records as duplicates (the notes say flag, never delete).
- **2B5b Choosing the technique.** The question is whether every parking entry is billed.
  Key: compare revenue with gate entry counts kept apart from billing (Standard 14.2
  considerations relate financial to nonfinancial data). Runner-up: a year-on-year revenue
  trend, which answers a question about change over time. Keep apart from `d2_009`
  (choosing the source, not the technique).
- **2B6a Condition against criteria.** Two of ten items differ from the criteria, but the
  evidence is thin. Key: decide with due care on more work, in an adjusted and approved work
  program, before calling it a finding (Standard 14.2). Runner-up: report it as a finding
  now, which is right when the evidence is sufficient. Keep apart from `cia1_d3_023` and
  `d2_007`.
- **2B7a Organizing workpapers (thin).** Keys on "may" alone are weak: build the item on
  Standard 14.6's must (evidence supporting the results, enough for another auditor to
  repeat the work) against a format preference. Consider leaving the slot empty.
- **2B7c Tracing results to workpapers.** A draft finding states a root cause the manager
  gave in a conversation nobody recorded. Key: document the evidence that supports it before
  the communication goes out (Standards 14.6 and 14.3). Runner-up: keep it because
  management agreed. Keep apart from `d3_002` (a supervisor's review note).
- **2B7d Keeping records.** A team member wants to delete the workpapers once the report is
  out. Key: retain them as law, regulation and the function's and organization's policies
  require (Standard 14.6). Runner-up: keep only the final report and a summary. Keep apart
  from `cia1_d2_027` (a preservation order), `cia1_d2_020` and `cia1_d2_082` (release).
- **2C1b Coordinating assignments.** A supervisor lets the team pick tasks during fieldwork.
  Key: the work program names the auditor assigned to each task before approval (Standard
  13.6), by skill and time (Standard 13.5, should). Runner-up: assign at the kick-off meeting
  and record it later. A sibling of the 2A4b lead and of `d1_011`: use a different
  runner-up from each.

**Bullets below their verb's depth (analysis items)**

- **2A1a.** Existing: `d1_001` (a requested engagement). Lead: management asks for advisory
  work on a cyber topic, then wants to give the results to a regulator as assurance. Key:
  assurance on the topic must conform, so either assess every requirement as assurance or
  keep it advisory with no assurance conclusion (Cybersecurity requirement's scope
  sentence). Runner-up: advisory conformance, recommended only.
- **2A1b.** Existing: `d1_002` (foundational). Lead: the engagement risk assessment ranks a
  regulatory goal low, but a law requires it. Key: objectives include any goal a law or
  regulation requires (Standard 13.3). Runner-up: objectives follow the ranking alone.
- **2A1e.** Existing: `d1_003`. Lead: mid-fieldwork, evidence shows a significant risk in a
  process outside scope. Key: the scope change is approved by the CAE or delegate and
  communicated to management (Standards 13.3 and 13.1; notes 2C2.2: no set order between
  them). Runner-up: test it now and tell management at the closing meeting. A transfer pair
  with `d3_005` (timing only).
- **2A4a.** Existing: `d1_008` (agile). Lead: stock existence at 30 warehouses with central
  data. Key: remote analysis to rank them and first-hand counts where risk is highest
  (Standards 13.5 and 14.1). Runner-up: video counts done by warehouse staff. Do not
  retell the notes' branch-cash example.
- **2A6a.** Existing: `d1_012` (which procedure judges design). Lead: a walk-through shows a
  reconciliation leaves out manual journals. Key: record the design gap as a potential
  finding and adjust the program, rather than test 25 instances of it (Standard 14.2; notes
  2A6.1). Runner-up: test operation as planned and report both.
- **2A6d.** Existing: `d1_011` (a missing criterion). Lead: the program's tasks cover none of
  one objective's units. Key: the scope and tasks must reach every objective (Standards
  13.3 and 13.6). Runner-up: unjustified sample sizes (a consideration).
- **2A7c.** Existing: `d1_014` (training and set-up). Lead: the function's analytics tool
  cannot read the new ERP's format. Key: a direct, read-only extract with IT, reconciled to
  the ledger (Standard 14.1; notes 2B4.3). Runner-up: management's standard reports. Keep
  apart from `d2_003`.
- **2B2b.** Existing: `d2_004`. Lead: rank three sources (an outside party's confirmation,
  the auditor's own query of a weakly controlled system, management's reconciliation) by the
  three reliability factors (Standard 14.1). Runner-up: the auditor's own query.
- **2B6b.** Existing: `d2_010` (effect). Lead: many late approvals; one cause explains them
  all (routing to an absent approver with no delegate), another explains a few (training).
  Key: the cause that explains the pattern, identified with management where possible
  (Standard 14.3). Keep apart from `cia1_d3_066` and `cia1_d2_076`.
- **2B6c.** Existing: `d2_011` (methodology). Lead: weigh a small recurring gap with a
  safety effect against a larger one-off loss (Standard 14.3: likelihood, impact and other
  factors). Keep apart from `cia1_d3_056` and `cia1_d3_046`; do not retell the notes'
  allergen example.
- **2B7b.** Existing: `d2_012` (population and selection). Lead: a conclusion rests on an
  interview with no record of who said what, or when. Key: the workpaper must let another
  auditor repeat the work (Standard 14.6). Runner-up: the reviewer's sign-off (Standard
  12.3).

**One-item bullets.** 32 bullets have one item each; second lessons come after the first
items above, under the sibling rule, and each first item stays out of the held-back form
until its bullet has a second.

## 7. Notes for the next round

- **Confirm the T verbs** against the opened syllabus at the next currency check, and
  record the leading words in section 3, so this map stops depending on the topic verb.
- **Section A's pick-the-longest is 25.0%** (14 items). `check_cia.py` enforces 15 to 24%
  from 40 items per section; set key lengths in the scaffold.
- **Difficulty by verb** is enforced per topic from 8 items; no Part 2 topic has 8 yet. The
  judge topics need at least 15% analysis and at most 25% foundational.
- **`d2_002` is a hardening candidate** (the pilot kept it on a split blind verdict).
- **Re-run this map after each round**: set each new item's bullet in the scaffold step,
  before it is written.
