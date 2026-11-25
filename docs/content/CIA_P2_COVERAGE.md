# CIA Part 2: syllabus bullet coverage map

Built 25 Nov 2026, after the Part 2 pilot, and updated the same day after Part 2 rounds 1,
2 and 3, to measure Part 2 against the sale gate
(`docs/content/CIA_BANK_PLAN.md`, section 3, decision 4, revised in round 14): (a) every
syllabus bullet tested at its verb's depth with every gate passing; (b) two full
exam-weighted forms of distinct items per section (Part 2 is 100 questions as A 50, B 40,
C 10, so A 100, B 80, C 20); (c) one full form frozen and held back, and a short mock drawn
per learner from unseen items; a bullet's only item is never held back. Three forms
(Part 2 about 300: A 150, B 120, C 30) stay the target as sources open.

Source: the opened Part 2 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026; each bullet's
leading verb re-read in it on 25 Nov 2026). The "Covers" column is the blueprint's own
wording (`docs/content/CIA_BLUEPRINT.md`), not The IIA's; the verb is the bullet's leading
word. Bank: all 71 items in `data/cia/cia2/originals/d1.json` to `d3.json` as of Part 2
round 3 (the pilot's 37, round 1's 16: `d1_015` to `d1_022`, `d2_015` to `d2_021`,
`d3_010`; round 2's 11: `d1_023` to `d1_026`, `d2_022` to `d2_027`, `d3_011`; and round
3's 7: `d1_027` to `d1_030`, `d2_028` to `d2_030`; none retired). Rounds 1 to 3 renumbered
some drafts before merge (round 2 cut two Section B drafts; round 3 cut two Section A
drafts and one Section B draft, and moved the later items down each time); the map follows
the file and each item's `_provenance`, not the drafts. This is
an internal working document; it holds no item text. No prep provider was opened for it.

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
  the tables have no "(line)" rows yet (`d1_027` also touches the 2A5 topic line, its
  author says, but counts at 2A5d).
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
  an application item after its fix pass relabelled it. Round 2: `d1_026` (advice
  requested, assurance expected) counts at 2A1a, the bullet of the map's lead it used, as
  its key ends on conformance with the Cybersecurity Topical Requirement; the Section A
  file's round 2 note calls it a second lesson on 2A1a and 2A1b (its `_provenance` names
  only notes 2A1.2), so 2A1b logs it as "also touched by" (whether the work is assurance
  or advisory is a 2A1b input). `d1_024` (a regulation-required area no one can assess)
  sits at 2A7d, not 2A1c, because the shortfall is the trigger; `d2_025` (a request for a
  model instead of the approved analysis) sits at 2B4e, also touched by 2A1d; `d2_026`
  (which of four results to follow up) sits at 2B5a, also touched by 2B6c. Round 3: each
  item sits where its `_provenance` puts it. `d1_027` (the plan's risk assessment offered as
  the engagement's own) counts at 2A5d, the second lesson its author named, though its key
  is identifying and ranking the engagement's risks with the plan's assessment as an input;
  `d2_029` (last year's clean result in a repeat engagement) counts at 2B6a, as the
  condition must come from this year's evidence, not at 2A5 (13.2's review-and-update rule
  is its runner-up); `d2_030` (what stays when the final file is organized) counts at 2B7a
  and is also touched by 2C1c, because the key is the evidence of supervision the
  methodology requires (Standard 12.3).

## 2. Where Part 2 stands against the gate

| Section | Items | Two-form bar (gate) | Three-form target | Gap to the bar | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Engagement Planning | 30 | 100, not met | 150 | 70 | 31 | 8 | 16 | 2 |
| B Information Gathering, Analysis, and Evaluation | 30 | 80, not met | 120 | 50 | 22 | 1 | 13 | 1 |
| C Engagement Supervision and Communication | 11 | 20, not met | 30 | 9 | 7 | 0 | 5 | 0 |
| **Part 2** | **71** | **200, not met** | **300** | **129** | **60** | **9** | **34** | **3** |

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 100 as 50/40/10 and 33 as 17/13/3. F/Ap/An by section:
A 3/16/11, B 1/15/14, C 2/6/3. "Below depth" counts bullets that have items but none at their
verb's depth; zero-item bullets are counted on their own. Earlier figures, for comparison:
pilot, 37 items with 26 zero-item, 32 one-item and 11 below-depth bullets; round 1, 53
items with 14, 40 and 8; round 2, 64 items with 10, 39 and 3.)

What the counts hide:

- **Gate (a) is not met.** 9 of 60 bullets have no item, and 3 more have items but none
  at their verb's depth, each a judge bullet with only application items: 2A4a, 2A7c and
  2B4b (all three tried again in round 3 and still empty). All 9 zero-item bullets now
  carry recall verbs (2A2a, 2A3e, 2A3f, 2A5c, 2A5e, 2A5f, 2A5g, 2A6c, 2B4a). 48 bullets
  meet their depth today (round 2: 47; round 1: 38; pilot: 23): A 21 of 31, B 20 of 22,
  C 7 of 7. Round 3 brought one bullet to depth, 2B7a (its first item, `d2_030`, an
  application item on an apply verb); its other six items are second lessons on bullets
  already at depth (2A2b, 2A3a, 2A3c, 2A5d, 2B2a, 2B6a). Round 2 brought 9 bullets to
  depth: first items on 2A5a, 2A7b, 2A7d and 2B7d, and analysis items on 2B1a, 2B1b, 2B4e,
  2B5a and 2C2a.
- **Rounds 1 to 3 left slots empty on purpose** (section 5 keeps the reasons). Round 1
  tried nine slots: 2A2a, 2A5c, 2A5e, 2A5f and 2A6c as first items and 2A4a and 2A7c as
  analysis items found no distinct lesson; the 2A5a and 2A7d drafts were cut for resting
  only on the Topical Requirements Application Guidance; a 2A7b draft was cut as
  answerable from wording (round 2 filled 2A5a, 2A7b and 2A7d on the Standards and the
  Cybersecurity requirement). Round 2 left 2A4a, 2A7c, 2A2a, 2A5c, 2A5e, 2A5f, 2A6c and
  2B7a empty again, found no second lesson on 2A1b, 2A1d, 2A1e or Section C, and cut a
  2B4a draft and a 2B4b analysis draft as answerable from wording. Round 3 tried both with
  new leads and left them empty (every lead keyed on a Sound practice or Common usage line,
  or repeated an existing item), left 2A5a, 2A5b, 2A5c, 2A5e, 2A5f, 2A6b, 2A6c, 2A6e, the
  2A1 second lessons, five Section B second lessons and all of Section C empty, and cut a
  2A4a draft, a 2A7c draft and a 2B2b draft.
- **No full form can be drawn yet.** Every topic has an item, but 34 of the 51 bullets
  with items have exactly one, and a bullet's only item stays out of the held-back form.
  Seventeen bullets have two or more: 2A1a, 2A2b, 2A3a, 2A3c, 2A5d, 2A6a, 2A6d, 2B1a, 2B1b,
  2B2a, 2B3a, 2B4e, 2B5a, 2B6a, 2B6c, 2C1c and 2C2a (round 3 added the six in its second
  lessons). Topics 2A2, 2A3, 2A5 and 2B2 can now be sampled by the held-back form (second
  items on 2A2b, 2A3a and 2A3c, 2A5d and 2B2a); 2B3 could since round 2. Four topics still
  cannot, as every bullet in them has at most one item: 2A4, 2A7, 2B7 and 2B8.
- **Gate (b) needs about 129 more items.** The pilot kept 37 of 50 written (74%); round 1
  kept 16 of 19 (84%; all three cuts Section A drafts); round 2 kept 11 of 13 (85%; both
  cuts Section B drafts); round 3 kept 7 of 10 (70%; two Section A cuts, one Section B).
  At the running rate, 71 of 92 (about 77%), rounds would have to write about 170 to keep
  129, and section 7 explains why the opened sources will not yield that many. Section A
  carries more than half of the gap (70), and topic 2A5 is still furthest behind its share
  (4 of 20).
- **The opened sources cannot reach some bullets at depth** (section 4): 2A3e (finance and
  accounting basics) has no opened source at all; parts of 2A3c, 2A3d, 2A3f, 2A4a, 2B3a,
  2B4b, 2B4d, 2B4e and 2B5a rest on "Common usage" or on members-only guides. The two
  judge bullets still below depth among them (2A4a, 2B4b) need analysis items that rest on
  the Standards, not on terms, as round 2's 2B4e and 2B5a items do (`d2_025` keys on
  relevance to the approved objective, `d2_026` on significance and cost against
  benefit). The owner decided on 25 Nov 2026
  not to join The IIA, so members-only guides are never a source; a textbook purchase is
  still undecided (plan section 9).
- **The Topical Requirements Application Guidance is Background, not a source for a key**
  (ruled 25 Nov 2026, round 1: it is not on the exam's reference list and is labelled
  Supplemental). That closed the round 1 leads for 2A5a and 2A7d; round 2 filled both
  without it (`d1_025` keys on the Cybersecurity requirement and its user guide, `d1_024`
  on Standards 13.3 and 13.5). Items that cite it after a Verified first part and key on a
  requirement or its user guide (`d1_006`, `cia1_d1_046`, `cia1_d1_061`) were checked in
  the same ruling and are unaffected.
- **Three Topical Requirements are not testable yet**: Third-Party from 2027-03-01,
  Organizational Behavior from 2027-06-01, Organizational Resilience from 2027-10-01
  (`data/cia/shared/currency.json`). An item that rests on one carries that
  `testable_from` and stays out of mocks, forms and the free sample until the date, so it
  does not count toward the gate before then. No Part 2 item carries a future
  `testable_from` today; the nine items on the Cybersecurity requirement (`d1_001`,
  `d1_006`, `d1_007`, `d1_009`, `d1_017`, `d1_025`, `d1_026`, and round 3's `d1_028` and
  `d1_029`) are testable now.
- **Part 1 already teaches many engagement lessons.** Scope limitations (`cia1_d1_027`,
  `_089`, `_099`, `_105`, `_106`), criteria (`cia1_d1_060`, `cia1_d3_020`, `cia1_d3_064`,
  `cia1_d2_077`), effectiveness against efficiency (`cia1_d3_019`, `cia1_d3_085`),
  significance (`cia1_d2_039`, `cia1_d3_046`, `cia1_d3_056`), root cause (`cia1_d3_017`,
  `cia1_d3_066`, `cia1_d2_076`), records (`cia1_d2_020`, `cia1_d2_027`, `cia1_d2_082`),
  benchmarking (`cia1_d1_050`, `cia1_d1_071`) and process maps (`cia1_d1_062`,
  `cia1_d1_104`). A Part 2 item on the same lesson is a cross-part sibling: new scenario,
  new actor or depth, new runner-up, logged (the pilot cut one repeat of a Part 1 lesson;
  round 1 left 2A5e empty because its lead repeated `cia1_d4_008`; round 2 left 2A2a,
  2A5c, 2A5e and second lessons on 2A1b, 2A1d and 2A1e empty for the same reason; round 3
  left 2A5a, 2A5b, 2A5c and 2A5e empty as repeats of `cia1_d1_061`, `d1_009`,
  `cia1_d4_036` and `cia1_d2_061`, and the 2A1 second lessons as repeats of `cia1_d1_069`
  and `cia1_d1_070`).
- **Siblings already logged** (plan section 7): from the pilot, `d1_001` with
  `cia1_d1_061` and `cia1_d1_046`; `d1_007` with `cia1_d2_016`; `d1_009` with
  `cia1_d1_061`; `d1_014` with `cia1_d2_012`; `d3_001` with `cia1_d2_038`; `d3_004` with
  `cia1_d1_065`; `d3_006` with `d3_009`. From round 1, `d1_015` with `cia1_d1_027`
  (transfer pair); `d1_016` with `cia1_d1_105`; `d1_018` with `d1_011`; `d2_020` with
  `d2_001` (transfer pair) and with `d2_003`; `d3_010` with `d3_005` (transfer pair).
  From round 2 (each item's `_provenance`; keep apart in one mock): `d1_023` with
  `cia1_d2_011` (transfer pair), `cia1_d2_012` and `d3_001`; `d1_024` with `cia1_d1_070`,
  `d1_015` and `cia1_d1_027`; `d1_025` with `cia1_d1_061`, `d1_001` and `d1_006`;
  `d1_026` with `cia1_d1_046` and `d1_001`; `d2_022` near `cia1_d2_027`, `cia1_d2_020`
  and `cia1_d2_082`; `d2_023` with `d2_004` and `d2_020`; `d2_024` near `d2_002`,
  `cia1_d1_097` and `cia1_d1_010`; `d2_025` near `d2_007`, `d2_008` and `d2_018`;
  `d2_026` with `d2_009` (same payroll drivers); `d2_027` with `d2_015` and `d2_003`;
  `d3_011` near `d3_007` and `d3_006`, and cross-part with Part 3 bullet 3D4b. From round
  3 (each item's `_provenance`; keep apart in one mock): `d1_027` with `cia1_d4_008`
  (transfer pair), `cia1_d3_004`, `cia1_d3_013` and `d1_010`; `d1_028` with `d1_006`,
  `d1_025` and `cia1_d1_116`; `d1_029` with `d1_017`, `cia1_d1_116` and `d1_006`; `d1_030`
  with `d1_004`, `cia1_d3_064`, `cia1_d1_060`, `cia1_d2_077` and `cia1_d3_020`; `d2_028`
  with `d2_003`, `cia1_d2_052` and `cia1_d4_011`; `d2_029` with `cia1_d4_008` (that item's key
  rule is this one's runner-up), `cia1_d2_007` and `d2_006`; `d2_030` near `d3_002` and
  `cia1_d2_068`, and apart from any 2C1 item on clearing review notes.
- **Challenge tags:** 64 of 71 items carry one (all 11 of round 2's and all 7 of round 3's); `d1_002`, `d1_007`, `d1_018`, `d2_001`,
  `d2_019`, `d3_003` and `d3_009` carry `null` as too basic for the Challenge candidate.

## 3. The map

### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2A1a | Where Topical Requirements come into setting objectives and scope | Recognize (recall) | 2: d1_001 (C1), d1_026 (C1) | 0/2/0 | yes | - (`d1_026` is round 2's second lesson: assurance must conform whatever the request is called; sibling of `cia1_d1_046` and `d1_001`). Items on Third-Party, Organizational Behavior or Organizational Resilience need `testable_from`. Round 3 found no further 2A1 lesson (a fourth scope-limitation key, or repeats of `cia1_d1_069` and `cia1_d1_070`) |
| 2A1b | What feeds the objectives: whether the job is assurance or advisory, strategy, regulation, risk appetite, policies, how governance, risk and control are run, earlier audit reports and other providers' work | Recognize (recall) | 1: d1_002; also touched by d1_026 | 1/0/0 | yes | one item: cannot be held back. `d1_026` is logged here (the Section A file's round 2 note names it a second lesson on 2A1a and 2A1b) but counts at 2A1a. Round 2's own 2A1b lead (a regulatory goal ranked low) was left empty: it repeats `cia1_d1_070` |
| 2A1c | Spotting scope limitations at planning and writing them down | Identify (recall) | 1: d1_015 (C1); also touched by d1_016, d1_024 | 0/1/0 | yes | one item: cannot be held back; transfer pair with `cia1_d1_027` (Part 1 sits close: 1A7e's five items). A further "request may be a scope limitation" key would be the fourth: avoid |
| 2A1d | Ways to handle and record requests from stakeholders | Evaluate (judge) | 1: d1_016 (C1); also touched by d1_001, d2_025 | 0/0/1 | yes | one item: cannot be held back; sibling of `cia1_d1_105`. Round 2's second lesson left empty (a fourth "request may be a scope limitation" key) |
| 2A1e | Good ways to deal with a change in objectives or scope | Identify (recall) | 1: d1_003 (C1); also touched by d3_005 | 0/1/0 | yes | one item: cannot be held back. Round 2's second lesson left empty (repeats `cia1_d1_069`) |
| 2A2a | Picking the criteria that best fit the activity being audited | Identify (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 and 2 and left empty (round 1: common-sense key; round 2: repeats a Part 1 lesson). Part 1 sits close: `cia1_d3_020`, `cia1_d3_064`, `cia1_d1_060` |
| 2A2b | Testing a set of criteria: relevant, specific, practical, in line with objectives, and able to support fair comparisons | Determine (judge) | 2: d1_004 (C2), d1_030 (C2) | 0/0/2 | yes | - (`d1_030`, round 3's second lesson: a target the regions measure from different start points cannot give reliable comparisons, so it is inadequate whatever its level; `d1_004` turned on a missing satisfactory level; siblings `cia1_d3_064`, `cia1_d1_060`, `cia1_d2_077`, `cia1_d3_020`) |
| 2A3a | Where Topical Requirements come into planning | Recognize (recall) | 2: d1_006 (C3), d1_028 (C3) | 1/1/0 | yes | - (`d1_028`, round 3's second lesson: a Topical Requirement in scope is a minimum, and the top-ranked risk may need more; keyed on the Cybersecurity requirement and its user guide; siblings `d1_006`, `d1_025`, `cia1_d1_116`) |
| 2A3b | How the area's strategic goals connect to the way it measures and manages performance and to risk management | Recognize (recall) | 1: d1_005 (C3) | 0/1/0 | yes | one item: cannot be held back |
| 2A3c | Current and emerging cyber risks, IT general controls, everyday security controls, why IT control frameworks help, data privacy principles and data security practice | Recognize (recall) | 2: d1_017 (C3), d1_029 (C3); also touched by d1_006 | 0/2/0 | yes | - (`d1_029`, round 3's second lesson: a cloud provider holding the records brings its controls over the organization's data into the cyber program; the vendor half of the map's sibling lead; siblings `d1_017`, `cia1_d1_116`, `d1_006`); IT general against application controls is still "Common usage" (no key); named privacy principles need a members-only guide or the textbook |
| 2A3d | Readiness for disruption (continuity and disaster recovery): business impact analysis, resilience, handling incidents, and tests of backup and recovery | Recognize (recall) | 1: d1_007 | 1/0/0 | yes | one item: cannot be held back; business impact analysis and recovery objectives are "Common usage"; the resilience requirement is testable from 2027-10-01 |
| 2A3e | Finance and accounting basics for the area: assets (current and fixed), liabilities (short and long term), capital and investments | Recognize (recall) | 0 | 0/0/0 | no | zero items; blocked: no opened source (textbook) |
| 2A3f | Key risks and controls in everyday business processes and in systems such as CRM, ERP and GRC | Recognize (recall) | 0 | 0/0/0 | no | zero items; process detail is "Common usage" (textbook); third parties rest on the Third-Party requirement (testable 2027-03-01) |
| 2A4a | Weighing approaches (traditional, agile, integrated, remote) and picking the best fit | Evaluate (judge) | 1: d1_008 (C4) | 0/1/0 | no | analysis item (tried in rounds 1 to 3: left empty in rounds 1 and 2, as every lead retold the notes' example, repeated `d1_009` or `cia1_d3_054`, or rested on "Common usage"; round 3's remote-work draft was cut: it repeated `d2_020` and `d2_003`, with a common-sense key); one item: cannot be held back; beyond the Standards' general rules needs the members-only integrated approaches guide (never) or the textbook |
| 2A4b | Project management ideas used to plan and run an engagement | Describe (recall) | 1: d1_018 | 0/1/0 | yes | one item: cannot be held back; sibling of `d1_011` |
| 2A5a | Where Topical Requirements come into the risk assessment | Recognize (recall) | 1: d1_025 (C5); also touched by d1_009 | 0/1/0 | yes | one item: cannot be held back. Round 2's first item keys on the Cybersecurity requirement and its user guide alone (coverage by an earlier assurance engagement, recorded as the reason for exclusion); sibling of `cia1_d1_061`, `d1_001`, `d1_006`. Round 3's second lesson left empty (repeats `cia1_d1_061`) |
| 2A5b | Risks that run through the whole activity: regulatory, cyber, IT, operational and financial | Recognize (recall) | 1: d1_009 (C5) | 0/1/0 | yes | one item: cannot be held back. Round 3's second lesson left empty (repeats `d1_009`) |
| 2A5c | How emerging risks affect the organization | Recognize (recall) | 0; also touched by d1_017 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (round 1: sound practice only; round 2: repeats `cia1_d2_061`, `cia1_d2_059`, `cia1_d3_055` or common sense; round 3: repeats `cia1_d4_036`) |
| 2A5d | Methods and criteria for rating and ranking risks and controls | Determine (judge) | 2: d1_010 (C5), d1_027 (C5) | 0/0/2 | yes | - (`d1_027`, round 3's second lesson: the plan's risk assessment is an input, and the engagement identifies and ranks its own risks; it also touches the 2A5 topic line; transfer pair with `cia1_d4_008`, siblings `cia1_d3_004`, `cia1_d3_013`, `d1_010`) |
| 2A5e | How changes to people, processes and systems shift risk | Recognize (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (round 1 repeated `cia1_d4_008`; round 2 repeated `cia1_d2_061`, `cia1_d2_059`, `cia1_d3_055` or common sense; round 3 repeated `cia1_d2_061`) |
| 2A5f | How structure and setting matter: remote or in-person work, flat or traditional layers, central or local control | Recognize (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (round 1: common-sense key; rounds 2 and 3: sound practice only) |
| 2A5g | How culture shapes the control environment: how individuals and groups behave, and tone at the top | Recognize (recall) | 0 | 0/0/0 | no | zero items; the Organizational Behavior requirement is testable from 2027-06-01; Part 1 sits close (1C2a, 1D4a) |
| 2A6a | Procedures that test whether a control is well designed | Determine (judge) | 2: d1_012 (C6), d1_019 (C6) | 0/1/1 | yes | - |
| 2A6b | Procedures that test whether controls work | Identify (recall) | 1: d1_013 (C6) | 0/0/1 | yes | one item: cannot be held back. Round 3's second lesson left empty (sound practice, or the independent-source win again) |
| 2A6c | Procedures that test whether controls are efficient | Identify (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (sound practice only). Part 1 sits close: `cia1_d3_019`, `cia1_d3_085` |
| 2A6d | Judging whether the work program is good enough | Evaluate (judge) | 2: d1_011 (C6), d1_020 (C6); also touched by d1_003, d1_008 | 0/1/1 | yes | - |
| 2A6e | Test methods for engagements that cover accounting, finance, IT systems, operations or cybersecurity | Identify (recall) | 1: d1_021 (C6) | 0/1/0 | yes | one item (IT systems): cannot be held back; methods outside IT and cybersecurity are "May" or "Common usage" in the notes (textbook). Round 3's second lesson left empty (sound practice, or the independent-source win again) |
| 2A7a | Money the engagement needs | Determine (judge) | 1: d1_022 (C7) | 0/0/1 | yes | one item: cannot be held back |
| 2A7b | People the engagement needs | Determine (judge) | 1: d1_023 (C7) | 0/0/1 | yes | one item: cannot be held back. Round 2 rebuilt round 1's cut lesson (every option uses a stem actor or fact); transfer pair with `cia1_d2_011`, siblings `cia1_d2_012` and `d3_001` |
| 2A7c | Technology the engagement needs | Determine (judge) | 1: d1_014 (C7) | 0/1/0 | no | analysis item (tried in rounds 1 to 3: left empty in round 1, common sense, and round 2, the technology rules were already keyed in `d1_014`, `d1_022` or `cia1_d2_018`; round 3's draft, a projected sample when the server is too slow, was cut after its fix pass: two independent blind testers chose the option that raises it with the chief audit executive over the key); one item: cannot be held back |
| 2A7d | What it means when resources fall short | Evaluate (judge) | 1: d1_024 (C7) | 0/0/1 | yes | one item: cannot be held back. Round 2 keyed it on Standards 13.3 and 13.5 (a shortfall on required work is a scope limitation discussed with management), replacing round 1's cut draft; siblings `cia1_d1_070`, `d1_015`, `cia1_d1_027` |

### Section B table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2B1a | Ways to get information: data analysis, walk-throughs, observation and interviews | Determine (judge) | 3: d2_001, d2_020 (D1), d2_023 (D1); also touched by d1_012 | 1/1/1 | yes | - (`d2_023`, round 2's analysis item: a second record of the same events corroborates, a rerun of the same weak field does not; siblings `d2_004`, `d2_020`. `d2_020` is a transfer pair with `d2_001` and a sibling of `d2_003`) |
| 2B1b | Documents to draw on: policies, questionnaires on risk and control, checklists and self-assessment surveys | Determine (judge) | 2: d2_002 (D1), d2_024 (D1) | 0/1/1 | yes | - (`d2_024`, round 2's analysis item: current questionnaire answers over an older survey to target visits; near `cia1_d1_097`, `cia1_d1_010`). `d2_002` is a hardening candidate |
| 2B2a | Using the right criteria to judge evidence quality | Apply (apply) | 2: d2_003 (D2), d2_028 (D2) | 0/0/2 | yes | - (`d2_028`, round 3's second lesson: reliable, independent replies are judged for relevance part by part, and they answer only one part of the objective; keep apart from `d2_003`, `cia1_d2_052` and `cia1_d4_011` in one mock) |
| 2B2b | What makes evidence more reliable: corroboration, an independent source, and a system with sound controls behind it | Recognize (recall) | 1: d2_004 (D2); also touched by d2_003, d2_023 | 0/1/0 | yes | one item: cannot be held back. Round 3's second-lesson draft (an outside warehouse co-owned by the logistics manager under review; key, the auditor's own count) was cut after its fix pass: still answerable from wording |
| 2B2c | Evidence strong enough that another informed, competent person would come to the same conclusion | Describe (recall) | 1: d2_005 (D2); also touched by d1_013, d3_002 | 0/0/1 | yes | one item: cannot be held back |
| 2B3a | Tools that save time and add insight: dashboards, continuous monitoring, embedded audit modules, robotic process automation, machine learning and AI | Recognize (recall) | 2: d2_015 (D3), d2_027 (D3); also touched by d1_014 | 0/2/0 | yes | - (`d2_027`, round 2: a dashboard built by the team under review is a lead until its feed and results are tested; topic 2B3 can now enter the held-back form). What each tool is rests on "Common usage" and members-only guides; reliance and ownership lessons rest on the Standards |
| 2B4a | Breaking a process workflow into its parts | Define (recall) | 0 | 0/0/0 | no | zero items; thin: sound practice beyond Standard 13.2. Round 2 draft cut (a map that stopped before the payment made the missing step obvious); round 3 left it empty (no Standards-keyed lead that repeats nothing). Section B's only zero-item bullet |
| 2B4b | Studying workflows with responsibility matrices (such as RACI), walk-throughs and process maps | Analyze (judge) | 1: d2_006 (D4) | 0/1/0 | no | analysis item; one item: cannot be held back. Round 2 analysis draft cut (an interview-built access matrix against system records; the stem's wording pointed at the key); round 3 left it empty (no Standards-keyed lead that repeats nothing: each keyed on Sound practice or Common usage, or repeated `d2_006`, the round 2 cuts, `cia1_d3_039` or `cia1_d3_066`). The meaning of each RACI letter is "Common usage" (no key) |
| 2B4c | Data types: structured and unstructured | Explain (recall) | 1: d2_008 (D4) | 0/1/0 | yes | one item: cannot be held back |
| 2B4d | The analytics steps: set the objective, get the data, normalize it, analyze it, report the results | Explain (recall) | 1: d2_019 | 0/1/0 | yes | one item: cannot be held back; keys rest on comparability and Standard 14.1, never on a guide's step detail (members-only data analytics guides: never) |
| 2B4e | When to use each analysis method: diagnostic, predictive, prescriptive, anomaly detection, text analysis | Determine (judge) | 2: d2_007 (D4), d2_025 (D4); also touched by d2_008 | 0/1/1 | yes | - (`d2_025`, round 2: a request for a model does not change which analysis answers the approved objective; keyed on Standards 14.1 and 13.3, not on a method's definition) |
| 2B5a | Reading ratios, variances, trends, benchmarks, and financial and nonfinancial data | Analyze (judge) | 2: d2_009 (D5), d2_026 (D5) | 0/1/1 | yes | - (`d2_026`, round 2: follow up the unexplained difference that matters most, Standards 14.2 and 4.2; keep apart from `d2_009` in one mock). Ratio formulas need the textbook |
| 2B5b | Choosing the analytical technique that serves the engagement objective | Determine (judge) | 1: d2_018 (D5) | 0/0/1 | yes | one item: cannot be held back |
| 2B6a | Comparing what is (the condition) with what should be (the criteria) | Analyze (judge) | 2: d2_016 (D6), d2_029 (D6); also touched by d2_006, d2_007 | 0/1/1 | yes | - (`d2_029`, round 3's second lesson: last year's clean result shapes planning, not this year's condition; its runner-up is 13.2's review-and-update rule, the key of `cia1_d4_008`; Part 1 sits close: `cia1_d3_023`) |
| 2B6b | Finding root causes and the likely effects of a gap | Identify (recall) | 1: d2_010 (D6) | 0/1/0 | yes | one item: cannot be held back. Round 3's second lesson left empty (the lead repeated an existing item) |
| 2B6c | Factors that make a finding more or less significant | Appraise (judge) | 2: d2_011 (D6), d2_021 (D6); also touched by d2_013, d2_026, d3_007 | 0/1/1 | yes | - |
| 2B7a | Putting workpaper information in order | Organize (apply) | 1: d2_030 (D7) | 0/1/0 | yes | one item: cannot be held back. Round 3's first item: a must against a may when organizing the final file (the evidence of supervision the methodology requires stays, Standard 12.3; cross-referencing is a 14.6 may), apart from `d2_012` and `d2_017`; also touched by 2C1c; near `d3_002`, `cia1_d2_068`. Round 2 had left it empty (14.6's organizing lines are only "may") |
| 2B7b | What a complete workpaper with enough evidence looks like | Identify (recall) | 1: d2_012 (D7) | 0/1/0 | yes | one item: cannot be held back. Round 3's second lesson left empty (the lead repeated an existing item) |
| 2B7c | Tracing the engagement results back to the workpapers | Analyze (judge) | 1: d2_017 (D7); also touched by d3_002 | 0/0/1 | yes | one item: cannot be held back. Round 3's second lesson left empty (the lead repeated an existing item) |
| 2B7d | Organizing and keeping engagement records, given regulation and internal policy | Determine (judge) | 1: d2_022 (D7) | 0/0/1 | yes | one item: cannot be held back. Round 2: retention covers the whole file of an engagement stopped midway (Standards 14.6 and 5.2); near `cia1_d2_027`, `cia1_d2_020`, `cia1_d2_082` |
| 2B8a | Using professional judgment to weigh findings taken together | Determine (judge) | 1: d2_013 (D8) | 0/0/1 | yes | one item: cannot be held back. Round 3's second lesson left empty (the lead repeated an existing item) |
| 2B8b | What goes into a conclusion, such as how well governance, risk management and controls work | Determine (judge) | 1: d2_014 (D8) | 0/0/1 | yes | one item: cannot be held back. Round 3's second lesson left empty (the lead repeated an existing item) |

### Section C table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2C1a | Supervision runs through the whole engagement, starting at planning | Describe (recall) | 1: d3_001 (D9); also touched by d3_004 | 0/1/0 | yes | one item: cannot be held back |
| 2C1b | The supervisor's job in coordinating who does what | Describe (recall) | 1: d3_010 (D9) | 0/1/0 | yes | one item: cannot be held back; transfer pair with `d3_005` |
| 2C1c | The supervisor's job in reviewing workpapers and conclusions | Describe (recall) | 2: d3_002 (D9), d3_004 (D9); also touched by d2_030 | 0/1/1 | yes | - |
| 2C1d | The supervisor's job in assessing how auditors performed | Describe (recall) | 1: d3_003 | 1/0/0 | yes | one item: cannot be held back |
| 2C2a | Choosing how to communicate (written or spoken, formal or informal) at planning, fieldwork and reporting | Determine (judge) | 4: d3_005 (D10), d3_006 (D10), d3_009, d3_011 (D10) | 1/2/1 | yes | - (`d3_011`, round 2's analysis item: the chief audit executive decides the form of the final communication; `d3_006` and `d3_009` are siblings; `d3_011` sits near `d3_007` and Part 3 bullet 3D4b) |
| 2C2b | Situations that need to be escalated | Identify (recall) | 1: d3_007 (D10) | 0/1/0 | yes | one item: cannot be held back |
| 2C2c | Choosing who should receive engagement communications | Determine (judge) | 1: d3_008 (D10); also touched by d3_011 | 0/0/1 | yes | one item: cannot be held back |

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
| A | 30 | 100 | 70 | 2A1: 6 of 18; 2A2: 2 of 9; 2A3: 6 of 14; 2A4: 2 of 8; 2A5: 4 of 20; 2A6: 6 of 18; 2A7: 4 of 13. Analysis items on the two below depth, 2A4a and 2A7c (each tried in rounds 1 to 3, a draft cut in round 3: new leads only), then second lessons, 2A5 first (furthest behind its share). The empty slots (2A2a, 2A5c, 2A5e, 2A5f, 2A6c) and round 3's empty second lessons (2A5a, 2A5b, 2A6b, 2A6e, 2A1) reopen only with a lead that answers every round's reasons. The round 3 author judged the opened sources hold perhaps 3 to 6 more distinct Section A lessons, so most of the 70 waits on a new source (section 7). 2A3's share is the one most likely to stay short (2A3e blocked; 2A3c, 2A3d and 2A3f partly). |
| B | 30 | 80 | 50 | 2B1: 5 of 8; 2B2: 4 of 11; 2B3: 2 of 5; 2B4: 5 of 14; 2B5: 3 of 8; 2B6: 5 of 12; 2B7: 4 of 13; 2B8: 2 of 9. An analysis item on 2B4b and a first item on 2B4a (cut in round 2, left empty in round 3: only a lead keyed on the Standards that repeats nothing); then second lessons, 2B8, 2B7 and 2B2 furthest behind their shares (round 3's leads for 2B6b, 2B7b, 2B7c, 2B8a and 2B8b each repeated an existing item). 2B1 already holds 2 analysis items of 5, so its next items are foundational or application. |
| C | 11 | 20 | 9 | 2C1: 5 of 11; 2C2: 6 of 9. Every bullet is at depth; the rest are second lessons on the five one-item bullets (2C1a, 2C1b, 2C1d, 2C2b, 2C2c), 2C1 first. Rounds 2 and 3 added none: every lead repeated `d3_001`, `d3_007`, `d3_008`, `d3_010` or `d3_011`, a Part 1 item (`cia1_d1_037`, `cia1_d2_013`, `cia1_d2_068`, `cia1_d3_012`) or a Section A resource item (`d1_022`, `d1_024`), or rested on a line the notes mark KaiSip's reading. |

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
| 2A3c | IT general against application controls; named privacy principles; common security controls beyond the Cybersecurity requirement's own list | Textbook; the members-only IT essentials GTAG and privacy guide are never opened. Items keep to what the Cybersecurity requirement and user guide say (as `d1_017` and `d1_029` do) |
| 2A3d | Business impact analysis, recovery time and recovery point as tested terms | Organizational Resilience requirement and user guide (opened; testable from 2027-10-01); textbook for the terms |
| 2A3f | Process-level risks and controls (purchase-to-pay matching, inventory, ERP roles, GRC systems) | Textbook; third-party lessons rest on the Third-Party requirement (opened; testable from 2027-03-01) |
| 2A4a (judge, below depth) | Agile, integrated and remote approaches beyond the Standards' general rules | Textbook; the members-only integrated approaches guide is never opened. The analysis item keeps to Standards 9.3, 13.5, 13.6 and 14.1 (round 2's leads failed on "Common usage" or repeats; round 3's remote-work draft was cut as a repeat of `d2_020` and `d2_003` with a common-sense key) |
| 2A5a (recall); 2A7d (judge) | Applicability judged by inherent risk; the board agreeing to a rescope when resources fall short | The Application Guidance is Background, so neither is keyable. Round 2 met both bullets without it: `d1_025` keys on the Cybersecurity requirement's applicability text and its user guide (a documented reason for each exclusion), `d1_024` on Standards 13.3 and 13.5 and the chief audit executive's role. Second lessons keep to the same sources |
| 2A5g | Culture and behavior in an engagement's risk assessment, beyond Part 1's lessons | Organizational Behavior requirement and user guide (opened; testable from 2027-06-01) |
| 2B3a | What an embedded audit module, continuous monitoring or a bot is and does | Textbook; members-only data analytics guides never opened. Items on reliance and ownership rest on Standards 4.2, 4.3, 10.3 and 14.1 (as `d2_015` and `d2_027` do) |
| 2B4b (judge, below depth); 2B4a (recall, zero items); 2B4e (judge, met); 2B4d | RACI letter meanings; workflow segments; definitions of the analysis methods; the detail of each analytics step | Textbook. The syllabus names the steps and methods; keys rest on Standards 14.1, 14.2 and 14.6, never on a definition (round 3 found no 2B4a or 2B4b lead keyed on the Standards that repeats nothing; `d2_019` keys normalizing on comparability and Standard 14.1; `d2_025` keys 2B4e on relevance to the approved objective, with each method described in plain words) |
| 2B5a (judge, met) | Ratio formulas and their reading | Textbook. Items keep to expectation, comparison and follow-up (Standard 14.2), as `d2_026` does (significance of the unexplained part, cost against benefit) |

## 5. Gap list in priority order

Rounds 1 to 3 have worked through most of what the opened sources hold (section 7), so
items 1 to 5 are ceilings, filled only where a distinct lesson is found; item 6 is what
unlocks most of the gap.

1. **Analysis items on the 3 judge bullets below depth**, each tried in every round and
   still empty: 2B4b (round 2's draft cut as answerable from wording; round 3 found no lead
   keyed on the Standards that repeats nothing), 2A4a (round 3's remote-work draft cut: it
   repeated `d2_020` and `d2_003`, with a common-sense key) and 2A7c (round 3's projected
   sample draft cut: two independent blind testers chose the option that raises it with the
   chief audit executive over the key, so a new lead must not leave an escalation option
   that reads as right). Only a new lead keyed on the Standards (2A4a: 9.3, 13.5, 13.6, 14.1;
   2A7c: a technology rule not already keyed in `d1_014`, `d1_022` or `cia1_d2_018`),
   never "Common usage".
2. **The zero-item bullets.** 2B7a is filled (`d2_030`); 2B4a is Section B's only one left
   (cut in round 2, left empty in round 3: only a Standards-keyed lead that repeats nothing,
   or the textbook). Section A holds 8 of the 9 (2A2a, 2A3e, 2A3f, 2A5c, 2A5e, 2A5f, 2A5g,
   2A6c): 2A5g waits on 2027-06-01 or a Part-1-distinct lesson, 2A3e and most of 2A3f wait
   on the textbook.
3. **The empty first-item slots of rounds 1 to 3**, reopened only with a lead that has a
   Standards distinction, repeats no Part 1 lesson and answers every round's reasons: 2A2a,
   2A5c, 2A5e, 2A5f, 2A6c. If none is found, they stay empty.
4. **Second lessons in Section A** (it needs 70), 2A5 first (4 of its 20), then the 16
   one-item bullets, only where a distinct lesson exists, siblings logged. Round 3 left
   2A5a, 2A5b, 2A6b, 2A6e and the 2A1 bullets empty (repeats or sound practice), and its
   author judged perhaps 3 to 6 distinct Section A lessons remain in the opened sources. No
   second 2A1b, 2A1d or 2A1e lesson unless it avoids `cia1_d1_069`, `cia1_d1_070` and the
   "request may be a scope limitation" key.
5. **Second lessons on Sections B and C's one-item bullets** (B: 13, C: 5), to reach the
   counts and free items for the held-back form. Round 3 filled 3 of 12 Section B and C
   slots: the leads for 2B6b, 2B7b, 2B7c, 2B8a and 2B8b each repeated an existing item, a
   2B2b draft was cut as answerable from wording, and every Section C lead repeated an
   existing item (section 4 names them), so new leads must stay apart from all of those.
6. **A new source.** Blocked until new sources or dates: 2A3e (textbook), the "Common
   usage" points of 2A3c, 2A3d, 2A3f, 2B4a, 2B4b, 2B4d, 2B4e and 2B5a (textbook), and
   lessons resting on the Third-Party (2027-03-01), Organizational Behavior (2027-06-01)
   and Organizational Resilience (2027-10-01) requirements. The textbook on the exam
   reference list (still undecided, plan section 9) and those testable dates are the only
   routes to most of the 129 items the two-form bar needs.

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

**Tried in round 2 and left empty on purpose, or cut (25 Nov 2026).** Same rule: reopen a
slot only with a new lead that answers the reason. Round 2 kept 11 of 13 drafts.

| Slot | What happened | Reason |
|---|---|---|
| 2A4a (analysis item) | Left empty again | Every lead retold the notes' example, repeated `d1_009` or `cia1_d3_054`, or rested on "Common usage" |
| 2A7c (analysis item) | Left empty again | The technology rules were already keyed in `d1_014`, `d1_022` or `cia1_d2_018` |
| 2A2a (first item) | Left empty again | Repeats a Part 1 lesson |
| 2A5e (first item) | Left empty again | Repeats `cia1_d2_061`, `cia1_d2_059` or `cia1_d3_055`, or common sense |
| 2A5c (first item) | Left empty again | Repeats `cia1_d2_061`, `cia1_d2_059` or `cia1_d3_055`, or common sense |
| 2A5f (first item) | Left empty again | Sound practice only |
| 2A6c (first item) | Left empty again | Sound practice only |
| 2A1e (second lesson) | Left empty | Repeats `cia1_d1_069` |
| 2A1b (second lesson) | Left empty (`d1_026` counts at 2A1a, logged at 2A1b) | Repeats `cia1_d1_070` |
| 2A1d (second lesson) | Left empty | Would be a fourth "request may be a scope limitation" key |
| 2B7a (first item) | Left empty | Standard 14.6's organizing lines are only "may"; a must-based item would repeat `d2_012` and `d2_017` |
| 2C1 and 2C2 (second lessons) | Left empty | Each lead repeated `d3_010`, `d3_007` or `cia1_d1_037` |
| 2B4a (first item) | Draft cut after the fix pass | Answerable from wording: the map stopped before the payment, so the missing step was obvious. Round 3, new lead |
| 2B4b (analysis item) | Draft cut after the fix pass | Answerable from wording: an interview-built access matrix against system records, and the stem's wording pointed at the key. Round 3, new lead |
| 2A5a, 2A7b, 2A7d (first items) | Filled (`d1_025`, `d1_023`, `d1_024`) | Round 1's cuts answered: keys on the Cybersecurity requirement and its user guide, and on Standards 3.1, 13.3 and 13.5; every option uses a stem actor or fact |

**Tried in round 3 and left empty on purpose, or cut (25 Nov 2026).** Same rule: reopen a
slot only with a new lead that answers the reason. Round 3 kept 7 of 10 drafts
(`d1_027` to `d1_030`, `d2_028` to `d2_030`; the later items were renumbered after each
cut, as the files' `_meta` and each item's `_provenance` record).

| Slot | What happened | Reason |
|---|---|---|
| 2A4a (analysis item) | Draft cut in review | A remote-work lead that repeated `d2_020` and `d2_003`, with a common-sense key |
| 2A7c (analysis item) | Draft cut after the fix pass | A projected sample when the server is too slow: two independent blind testers chose the option that raises it with the chief audit executive over the key |
| 2A5a (second lesson) | Left empty | Repeats `cia1_d1_061` |
| 2A5b (second lesson) | Left empty | Repeats `d1_009` |
| 2A5c (first item) | Left empty a third time | Repeats `cia1_d4_036` |
| 2A5e (first item) | Left empty a third time | Repeats `cia1_d2_061` |
| 2A5f (first item) | Left empty a third time | Sound practice only |
| 2A6c (first item) | Left empty a third time | Sound practice only |
| 2A6b, 2A6e (second lessons) | Left empty | Sound practice only, or the independent-source win again |
| 2A1 bullets (second lessons) | Left empty | A fourth scope-limitation key, or repeats of `cia1_d1_069` and `cia1_d1_070` |
| 2B2b (second lesson) | Draft cut after the fix pass | An outside warehouse co-owned by the logistics manager under review (key, the auditor's own count): still answerable from wording, as the stated tie ruled out the lures and the auditor's count won on audit lore |
| 2B4a (first item) | Left empty | No lead keyed on the Standards that repeats nothing (each keyed on a Sound practice or Common usage line, or repeated `d2_006`, the round 2 cuts, `cia1_d3_039` or `cia1_d3_066`) |
| 2B4b (analysis item) | Left empty | As for 2B4a |
| 2B6b, 2B7b, 2B7c, 2B8a, 2B8b (second lessons) | Left empty | Each lead repeated an existing item (`cia1_d2_076`, `d2_012`, `cia1_d2_001`, `cia1_d3_063`, `cia1_d2_039` or `cia1_d3_023`) |
| 2C1 and 2C2 (second lessons) | Left empty | Every lead repeated an existing item (`d3_001`, `d3_007`, `d3_008`, `d3_010`, `d3_011`, `cia1_d1_037`, `cia1_d2_013`, `cia1_d2_068`, `cia1_d3_012`, `d1_022` or `d1_024`) or rested on a line the notes mark KaiSip's reading |
| 2B7a (first item) | Filled (`d2_030`) | Round 2's reason answered: the key is a must (the evidence of supervision the methodology requires, Standard 12.3) set against a 14.6 may (cross-referencing) |

Two lessons from Part 1 apply to every slot. A thin, common-sense lesson fails the blind
test however it is rebuilt (rounds 12 to 14: the 1B4g trust sibling and the 1C7c "stop the
loss" item were cut; plan section 7), so a lead whose key a careful non-auditor would pick
is dropped, not polished. And a slot with no distinct lesson stays empty (round 14 left 16
of 22 slots empty rather than repeat). Part 2 held to both: round 1 left seven slots empty
and cut three drafts; round 2 left twelve slots empty and cut two drafts; round 3 left
the slots in its table empty and cut three drafts (the tables above).

## 6. Leads for first items and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. Each rests on the Part 2 notes and the
Standards; none retells a notes example (the pilot had to replace 2A3.1's example when a
question retold it). "Keep apart" names the nearest existing item, so the new item takes a
different trap (sibling rule). Leads marked **thin** risk the common-sense cut and need a
Standards distinction to survive. On a recall bullet, keep the knowledge at the bullet's
level even when the scenario asks for a choice.

Rounds 1 to 3 (25 Nov 2026) mark each lead in italics: used, not used, tried and left
empty, or tried and cut. A lead not used whose bullet now has an item becomes a sibling lead and
must stay apart from that item.

**Zero-item bullets in the pilot map (first items)**

- **2A1c Scope limitations at planning (Identify).** *Round 1: lesson (1) used by `d1_015`, with withheld files instead of an archive no one can query; lead (2) is now a sibling lead. Round 2: lead (2)'s idea (a resource gap that stops needed work is a scope limitation) is keyed at 2A7d by `d1_024`; keep any 2A1c sibling apart from it.* (1) During planning the auditor learns
  that half the period's transactions sit in a retired system whose archive the team
  cannot query. Key: raise and document it as a scope limitation, discussed with
  management when identified, aiming to resolve it (Standard 13.3; notes 2A1.3).
  Runner-up: narrow the period to the months that can be queried, which is a scope change
  needing approval and still hides the limitation. (2) A supervisor proposes dropping one
  of five sites to fit the hours. Key: if that site is needed to reach an objective, a
  resource constraint is a scope limitation (Standard 13.3; notes 2A7.3). Keep apart from
  `cia1_d1_027`, `_089`, `_099`, `_105` and `_106`: the Part 2 angle is spotting and
  recording it at planning, from the auditor's seat.
- **2A1d Stakeholder requests (Evaluate; analysis).** *Round 1: lead (2) used by `d1_016`; lead (1) is now a sibling lead (keep it apart from `d1_016` too). Round 2: a second lesson was tried and left empty (a fourth "request may be a scope limitation" key).* (1) A regional director asks that a
  newly bought branch be left out "while it integrates", and the branch holds a fifth of
  the activity the objectives cover. Key: weigh whether the exclusion would stop the work
  an objective needs, record the request, decision and reason, and treat any scope change
  as one the CAE or delegate approves (Standard 13.3 and its considerations; notes 2A1.3).
  Runner-up: record it as an agreed exclusion, which is right in advisory work. (2) A
  request to add items within the same hours: it too may amount to a scope limitation (the
  lead the Part 1 map left open). Keep apart from `cia1_d1_059` (advisory exclusion) and
  `cia1_d1_105` (shortening).
- **2A2a Picking criteria (Identify).** *Round 1: tried and left empty (common-sense key); reopen only with a new lead. Round 2: tried again and left empty (repeats a Part 1 lesson). Round 3: no item; 2A2b took a second lesson instead (`d1_030`, criteria that cannot give reliable comparisons).* The objective is compliance with a regulator's
  temperature rule; the plant's own target is stricter. Key: for a compliance objective
  the most relevant criterion is the regulation (Standard 13.4: the most relevant criteria
  for the objectives and scope). Runner-up: management's adequate target, which is right
  when the objective is the plant's own control performance. Keep apart from
  `cia1_d3_020` and `cia1_d3_064` (adequate criteria set by the board and senior
  management must be used): this item turns on the objective, not on adequacy.
- **2A3c Cyber, IT and data protection (Recognize).** *Round 1: not used; `d1_017` took another lesson (who watches for emerging threats). This lead is now a sibling lead; keep it apart from `d1_017`. Round 3: its vendor half used by `d1_029` (a cloud provider holding patient records); the governance half stays a sibling lead.* A cyber assurance work program tests
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
- **2A5a Topical Requirements in the risk assessment (Recognize).** *Round 1: tried and cut: the draft's key rested only on the Application Guidance, now Background. This lead is retired as written; a new one keys on a requirement's own applicability text and its user guide (a documented assessment, a reason for each exclusion), never on inherent risk. Round 2: used in that form by `d1_025` (requirements covered by an earlier assurance engagement are excluded, with that coverage recorded as the reason; Cybersecurity requirement and user guide only).* A cyber topic surfaces
  in a payroll engagement but is rated low. Key: document the applicability assessment and
  the reason for each exclusion, rather than apply every requirement (Application Guidance,
  a should, not a Standard; Cybersecurity user guide). Runner-up: apply every requirement
  because the topic surfaced, which is right when the topic is an assurance engagement's
  subject. Keep apart from `d1_009` (a risk that is significant).
- **2A5c Emerging risks (Recognize; thin).** *Round 1: tried and left empty (sound practice only). Round 2: tried again and left empty (repeats `cia1_d2_061`, `cia1_d2_059` or `cia1_d3_055`, or common sense). Round 3: left empty a third time (repeats `cia1_d4_036`).* A new threat has no loss history in the
  organization. Key: Standard 13.2 asks for the potentially significant risks, so no loss
  history does not rule it out; the Cybersecurity requirement asks whether management
  monitors emerging threats. Runner-up: rate it low on the loss record. Survives only with
  a Standards distinction in the stem.
- **2A5e Change in people, processes and systems (Recognize).** *Round 1: tried and left empty (repeats `cia1_d4_008`). Round 2: tried again and left empty (repeats `cia1_d2_061`, `cia1_d2_059` or `cia1_d3_055`, or common sense). Round 3: left empty a third time (repeats `cia1_d2_061`).* Half of a team left
  mid-year and one person now runs a key step. Key: the earlier assessment must be
  reviewed and updated, not reused (Standard 13.2), and the risk rated with the change.
  Runner-up: last year's clean result keeps the rating. Keep apart from `cia1_d2_081`
  (rule change, due care) and `d1_010`.
- **2A5f Structure and setting (Recognize; thin).** *Round 1: tried and left empty (common-sense key). Round 2: tried again and left empty (sound practice only). Round 3: left empty a third time (sound practice only).* A reorganization removed a review
  layer; the new chart shows approvals with one team lead. Key: confirm through interviews
  and walk-throughs who actually approves before rating the risk (Standard 13.2, may).
  Runner-up: rate from the chart. Keep apart from `d2_006` (map against walk-through) by
  stage and question (planning a rating, not establishing a condition).
- **2A5g Culture (Recognize).** Leave until 2027-06-01 (Organizational Behavior
  requirement, with `testable_from`), unless a lesson distinct from 1C2a and 1D4a appears.
  Keep fraud out.
- **2A6c Efficiency procedures (Identify).** *Round 1: tried and left empty (sound practice only). Round 2: tried again and left empty (sound practice only). Round 3: left empty a third time (sound practice only).* A three-signature approval on low-value
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
- **2A7b People (Determine; analysis).** *Round 1: tried and cut: a draft was answerable from wording. The lesson stands; rebuild it so no option gives the key away. Round 2: used, rebuilt, by `d1_023` (a course plus close review by a supervisor who has the skill meets Standard 3.1; every option uses a stem actor or fact; transfer pair with `cia1_d2_011`).* No one on the team knows a new revenue rule; one
  auditor has related experience, and a staff member from the revenue team offers help.
  Key: the auditor who can obtain the competency through training and supervised work
  takes it on (Standard 3.1), and the revenue staff member does not test their own area.
  Runner-up: outsource the whole engagement. Keep apart from `cia1_d2_011`.
- **2A7d Resources fall short (Evaluate; analysis).** *Round 1: tried and cut: the draft's key rested only on the Application Guidance (a board agreeing to rescope). Keep to the Standards 13.3 and 13.5 key below. Round 2: used by `d1_024` (a regulation-required area no one can assess: a scope limitation discussed with management, not an approved cut or elevation now to the board).* The CAE cannot obtain the
  specialist. Key: weigh what the gap does to each objective; an unresolved constraint is a
  scope limitation handled under Standard 13.3, and the CAE chooses the response.
  Runner-up: the auditor quietly drops the technical objective, or takes the matter to the
  board. Keep apart from `cia1_d1_103` and the 2A1c lead (2).
- **2B3a Technology tools (Recognize).** *Round 1: neither lead used; `d2_015` took a third lesson (a validated, reconciled model's clean result is relied on). Both leads are now sibling leads; keep (2) apart from `d2_015` as well. Round 2: lead (2) used by `d2_027` (a treasury-built dashboard; key, test the feed and a sample; runner-up, the full-year view). Lead (1) stays a sibling lead.* (1) The objective is whether 12 contracts carry
  board approval; a teammate proposes a machine learning model. Key: due care weighs cost
  against benefit, so the simple test answers it (Standard 4.2). Runner-up: the model,
  because it covers the population. (2) A dashboard built by the treasury team shows every
  exception cleared. Key: check the completeness and accuracy of its data feed before
  relying on it (Standards 4.3 and 14.1). Runner-up: rely on the dashboard because it covers
  the whole population. Keep (2) apart from `d2_003` by the actor and the tool.
- **2B4a Workflow segments (Define; thin).** *Round 1: not used. Round 2: tried and cut after the fix pass, answerable from wording (the map stopped before the payment, so the missing step was obvious). Retired as written; round 3 needs a new lead whose gap is not visible on the map's face. Round 3: left empty (no lead keyed on the Standards that repeats nothing).* A purchase-to-pay process mapped only inside
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
- **2B7a Organizing workpapers (Organize; application; thin).** *Round 1: not used. Round 2: tried and left empty, as this lead advised (the organizing lines are "may"; a must-based item would repeat `d2_012` and `d2_017`). Round 3: filled by `d2_030` on a must apart from both (the evidence of supervision the methodology requires, Standard 12.3).* Keys on "may" alone are
  weak: build the item on Standard 14.6's must (evidence supporting the results, enough
  for another auditor to repeat the work) against a format preference. Consider leaving
  the slot empty.
- **2B7c Tracing results to workpapers (Analyze; analysis).** *Round 1: used by `d2_017`.* A draft finding states a root
  cause the manager gave in a conversation nobody recorded, and another sentence reaches
  wider than the tests. Key: the unsupported cause is what most needs evidence documented
  before the communication goes out (Standards 14.6 and 14.3). Runner-up: keep it because
  management agreed. Keep apart from `d3_002` (a supervisor's review note).
- **2B7d Keeping records (Determine; analysis).** *Round 1: not used; now Section B's only judge bullet with no item. Round 2: not used as written (which period is longest was cut as common sense in the pilot); `d2_022` met the depth with what retention covers: the whole file of an engagement stopped midway. This lead is retired.* A team member wants to delete the
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
  leave it. Round 2: not used (no Section C second lesson was added; each lead repeated
  `d3_010`, `d3_007` or `cia1_d1_037`).* A supervisor reassigns a task midway when the work shows the planned auditor
  lacks a skill. Key: the change to the work program is approved promptly (Standard 13.6)
  and supervision adjusts (Standard 12.3). Runner-up: record the change at the closing
  review.

**Bullets below their verb's depth in the pilot map (analysis items)**

- **2A4a (Evaluate).** *Round 1: tried and left empty (the lead retold the notes' example); a new scenario is needed. Round 2: tried again and left empty (every lead retold the notes' example, repeated `d1_009` or `cia1_d3_054`, or rested on "Common usage"); this warehouse lead too is retired. Round 3: a remote-work draft was cut (it repeated `d2_020` and `d2_003`, with a common-sense key).* Existing: `d1_008` (agile). Lead: stock existence at 30 warehouses
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
- **2A7c (Determine).** *Round 1: tried and left empty (common sense); a new lead is needed. Round 2: tried again and left empty (the technology rules were already keyed in `d1_014`, `d1_022` or `cia1_d2_018`); this lead is retired. Round 3: a projected-sample draft was cut after its fix pass (two independent blind testers chose the escalation option over the key).* Existing: `d1_014` (training and set-up). Lead: the function's
  analytics tool cannot read the new ERP's format. Key: a direct, read-only extract with IT,
  reconciled to the ledger (Standard 14.1; notes 2B4.3). Runner-up: management's standard
  reports. Keep apart from `d2_003`.
- **2B1a (Determine).** *Round 1: used by `d2_020`, relabelled application in its fix pass; an analysis item is still needed, with a harder final two. Round 2: not used as written (it sits close to `d2_020`); `d2_023` met the depth with corroboration (a second record of the same events, not a rerun of the same weak field). Retired.* Existing: `d2_001` (observation where no record captures the step).
  Lead, its mirror: the objective is whether a control ran all year, and a system with
  effective controls logs every instance. Key: data analysis of the full year's records
  (Standard 14.1: relevant and sufficient; a system with effective controls strengthens
  reliability). Runner-up: observation, which shows only the moments watched. A transfer
  pair with `d2_001`; log it as a sibling.
- **2B1b (Determine).** *Round 2: used in another form by `d2_024` (current questionnaire answers over an older survey to target visits); the "a survey is not evidence that controls operate" half stays a sibling lead.* Existing: `d2_002` (a questionnaire on what staff know). Lead: a
  unit's self-assessment survey rates every control effective. Key: use it to target the
  tests, not as evidence that controls operate (Standard 14.1: neither obtained directly nor
  independent). Runner-up: rely on it where earlier audits were clean. Keep apart from
  `cia1_d1_010` and `cia1_d1_097` (facilitating a self-assessment as advisory work).
- **2B4b (Analyze).** *Round 2: tried (an interview-built access matrix against the system's records) and cut after the fix pass: the stem's wording pointed at the key. This lead sits close to the cut draft; round 3 needs a new lead whose stem does not name the winning evidence. Round 3: left empty (no lead keyed on the Standards that repeats nothing).* Existing: `d2_006` (walk-through against the approved map). Lead: a
  responsibility matrix for payroll changes shows one role both entering and approving
  changes and no role owning the check of new bank details. Key: test what the conflicting
  role can and does do, through access rights and records, before calling the condition
  (Standard 14.2: the condition rests on evidence). Runner-up: report the matrix's gaps as
  findings. No key on what a RACI letter means; do not retell the notes' vendor-setup
  example.
- **2B4e (Determine).** *Round 2: used by `d2_025` (before and after by route; the operations head's request for a model is the trap; keyed on Standards 14.1 and 13.3).* Existing: `d2_007` (anomaly flags). Lead: the question is why late
  deliveries rose in one quarter; the data holds routes, carriers and dates. Key: the
  analysis that explains a past result by drilling into its drivers (Standard 14.1:
  information consistent with the objective). Runner-up: a model that forecasts next
  quarter's late deliveries, which answers what may happen. The key must not rest on a
  method's definition (no opened source defines them); keep it apart from `d2_008`.
- **2B5a (Analyze).** *Round 2: not used as written; `d2_026` met the depth (which of four results to follow up, by significance and cost against benefit). The margin lead is a sibling lead; keep it apart from `d2_026` and `d2_009`.* Existing: `d2_009` (an independent headcount). Lead: a unit's margin
  rose while a comparable unit's fell. Key: build an expectation from independent drivers,
  then follow up the unexplained difference before calling it a finding (Standard 14.2).
  Runner-up: report the variance as a finding. Keep apart from `d2_009` and `d2_007`; do not
  retell the notes' fuel example.
- **2B6c (Appraise).** *Round 1: used by `d2_021`; depth met.* Existing: `d2_011` (methodology). Lead: weigh a small recurring gap
  with a safety effect against a larger one-off loss (Standard 14.3: likelihood, impact and
  other factors). Keep apart from `cia1_d3_056` and `cia1_d3_046`; do not retell the notes'
  allergen example.
- **2C2a (Determine).** *Round 2: not used; `d3_011` met the depth (the chief audit executive decides the form of the final communication). The phone-call lead is a sibling lead.* Existing: `d3_005`, `d3_006`, `d3_009`. Lead: mid-fieldwork, a
  control failure needs the manager's immediate attention, and the manager wants only a
  phone call. Key: tell the manager promptly and keep a written record of the communication
  in the workpapers (Standard 13.1; open its considerations before keying the record).
  Runner-up: hold it for the closing meeting. Keep apart from `d3_006` (email instead of a
  meeting) and `d3_008` (who hears it).

**One-item bullets (siblings)**

34 bullets have one item each (32 after the pilot, 40 after round 1, 39 after round 2); second lessons come after the first
items and the analysis items above, under the sibling rule, and each first item stays out of the held-back form
until its bullet has a second. Leads written for the earlier draft of this map, now second
lessons rather than depth fixes:

- **2A1a.** *Round 2: used by `d1_026`, with a board relying on advisory work instead of a regulator.* Existing `d1_001` (a requested engagement). Sibling: management asks for
  advisory work on a cyber topic, then wants the results given to a regulator as assurance.
  Key: assurance on the topic must conform, so either assess every requirement as assurance
  or keep it advisory with no assurance conclusion (Cybersecurity requirement's scope
  sentence). Runner-up: advisory conformance, recommended only.
- **2A1b.** *Round 2: tried and left empty (repeats `cia1_d1_070`). Round 3: left empty again.* Existing `d1_002`. Sibling: the risk assessment ranks a regulatory goal low, but
  a law requires it. Key: objectives include any goal a law or regulation requires
  (Standard 13.3). Runner-up: objectives follow the ranking alone.
- **2A1e.** *Round 2: tried and left empty (repeats `cia1_d1_069`). Round 3: left empty again.* Existing `d1_003`. Sibling: mid-fieldwork, evidence shows a significant risk in a
  process outside scope. Key: the scope change is approved by the CAE or delegate and
  communicated to management (Standards 13.3 and 13.1; notes 2C2.2: no set order between
  them). Runner-up: test it now and tell management at the closing meeting. A transfer pair
  with `d3_005` (timing only).
- **2B2b.** *Round 3: a draft on another lead (a warehouse co-owned by the manager under review) was cut as answerable from wording; this lead is unused.* Existing `d2_004`. Sibling: three sources (an outside party's confirmation, the
  auditor's own query of a weakly controlled system, management's reconciliation) against
  the three reliability factors (Standard 14.1). Runner-up: the auditor's own query.
- **2B6b.** *Round 3: left empty (the lead repeated an existing item).* Existing `d2_010` (effect). Sibling: many late approvals; one cause explains them
  all (routing to an absent approver with no delegate), another explains a few (training).
  Key: the cause that explains the pattern, identified with management where possible
  (Standard 14.3). Keep apart from `cia1_d3_066` and `cia1_d2_076`.
- **2B7b.** *Round 3: left empty (the lead repeated an existing item).* Existing `d2_012` (population and selection). Sibling: a conclusion rests on an
  interview with no record of who said what, or when. Key: the workpaper must let another
  auditor repeat the work (Standard 14.6). Runner-up: the reviewer's sign-off (Standard
  12.3).

## 7. Notes for the next round

- **What round 1 taught.** The Topical Requirements Application Guidance is Background
  only, so applicability judged by inherent risk and a board agreeing to rescope are not
  keyable; a Topical Requirement item keys on the requirement and its user guide alone. A
  key that is the only option naming the people planted in the stem gives itself away:
  name the stem's actors in distractors too.
- **What round 2 taught.** In evidence items the key is often "test the independent system
  record" while the distractors are testimony, observation or self-certification
  (`d2_023`, `d2_027`), so vary which kind of evidence wins (an observation, a
  confirmation or a current questionnaire can be right for the objective). Options-only
  testers pick the lone rule-following option, so give at least one wrong option the
  key's register (as `d1_024` and `d2_022` do after their fix passes). 2B1 now holds 2
  analysis items of 5 (`d2_023`, `d2_024`), so later 2B1 items should be foundational or
  application.
- **What round 3 taught.** A real rule offered at the wrong step makes a fair runner-up
  (`d2_029` sets 13.2's review-and-update rule, a planning rule, against establishing the
  condition), and a must set against a may opens a bullet that "may" lines had closed
  (`d2_030`). An escalation option reads as right to blind testers unless the stem rules it
  out (the 2A7c cut), and a stated tie in a reliability stem rules out the lures (the 2B2b
  cut).
- **The opened sources are close to exhausted for Part 2.** The round 3 Section A author
  judged the opened sources hold perhaps 3 to 6 more distinct Section A lessons; Sections B
  and C filled 3 of 12 slots, every other lead repeating an existing item or resting on a
  Sound practice, Common usage or KaiSip's-reading line. More items need a new source: the
  textbook on the exam reference list (a purchase, still undecided, plan section 9), or
  the 2027 testable dates of the Third-Party (2027-03-01), Organizational Behavior
  (2027-06-01) and Organizational Resilience (2027-10-01) requirements. Another round on
  the same sources should expect a handful of items at most.
- **Pick-the-longest after round 3:** A 18.3% (30 items), B 16.7% (30), C 22.7% (11)
  (round 2: A 17.3%, B 14.8%, C 22.7%; round 1: A 20.5%, B 9.5%, C 20.0%). `check_cia.py`
  enforces 15 to 24% from 40 items per section; Section B is now inside the band, so keep
  its key lengths varied as it nears 40.
- **Difficulty by verb** is enforced per topic, by the topic verb, from 8 items; no Part 2
  topic has 8 yet (2A1, 2A3, 2A6 and 2C2 have 6). The judge topics need at least 15% analysis and at most 25%
  foundational, so recall-verb bullets under judge topics (most of 2A1, 2A3, 2A5 and 2A6)
  still need scenario items, not definitions.
- **`d2_002` is a hardening candidate** (the pilot kept it on a split blind verdict); the
  2B1b analysis item, `d2_024`, now covers the bullet at depth if the hardening fails and
  `d2_002` is cut.
- **Re-run this map after each round**: set each new item's bullet in the scaffold step,
  before it is written.
