# CIA Part 2: syllabus bullet coverage map

Built 25 Nov 2026, after the Part 2 pilot, and updated the same day after Part 2 rounds 1,
2 and 3, and on 26 Nov 2026 after Part 2 round 4 (the first round keyed on free public
Knowledge sources) and round 5 (the second), and after the Third-Party items written
ahead (26 Nov 2026, testable from 2027-03-01) and the Organizational Behavior items written
ahead (26 Nov 2026, testable from 2027-06-01), to measure Part 2 against the sale gate
(`docs/content/CIA_BANK_PLAN.md`, section 3, decision 4, revised in round 14): (a) every
syllabus bullet tested at its verb's depth with every gate passing; (b) two full
exam-weighted forms of distinct items per section (Part 2 is 100 questions as A 50, B 40,
C 10, so A 100, B 80, C 20); (c) one full form frozen and held back, and a short mock drawn
per learner from unseen items; a bullet's only item is never held back. Three forms
(Part 2 about 300: A 150, B 120, C 30) stay the target as sources open.

**Owner decision, 26 Nov 2026: Part 2's own gate.** Part 2 sells at one frozen, held-back
full form (A 50, B 40, C 10) plus one short mock's worth of unseen items per section (A 17,
B 13, C 3): about **A 67, B 53, C 13**. Two forms stay the target as sources open; the gap
counts below still measure against two forms (`CIA_BANK_PLAN.md` section 9).

Source: the opened Part 2 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026; each bullet's
leading verb re-read in it on 25 Nov 2026). The "Covers" column is the blueprint's own
wording (`docs/content/CIA_BLUEPRINT.md`), not The IIA's; the verb is the bullet's leading
word. Bank: all 98 items in `data/cia/cia2/originals/d1.json` to `d3.json` as of the
Organizational Behavior items written ahead (the pilot's 37, round 1's 16: `d1_015` to `d1_022`, `d2_015` to `d2_021`,
`d3_010`; round 2's 11: `d1_023` to `d1_026`, `d2_022` to `d2_027`, `d3_011`; round
3's 7: `d1_027` to `d1_030`, `d2_028` to `d2_030`; round 4's 14: `d1_031` to
`d1_037`, `d2_031` to `d2_037`, none cut; and round 5's 7: `d1_038` to `d1_042`,
`d2_038`, `d2_039`, none cut; the three Third-Party items written ahead, `d1_043`
to `d1_045`, none cut, each with `testable_from` 2027-03-01; and the three Organizational
Behavior items written ahead, `d1_046` to `d1_048`, none cut, each with `testable_from`
2027-06-01; none retired). Rounds 1 to 3 renumbered
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
  methodology requires (Standard 12.3). Round 4: each item sits where its `_provenance`
  puts it. `d1_035` (a real-time stock system run in an ERP) counts at 2A3f for the
  physical count its key turns on, not for the ERP; `d1_036` (a subject redesigned every
  month) counts at 2A4a, keyed on Standard 13.6 with the Knowledge source only saying what
  an adaptive approach suits; `d2_035` (prescriptive analysis on an advisory objective)
  counts at 2B4e, its role half resting on the Glossary's advisory services. `d1_033` is
  labelled analysis on a recall bullet (2A3e); the re-audit accepted it, as the notes now
  teach the classification and the step to the current ratio is one move, and asked that
  the bullet's depth be watched as it grows. Round 5: each item sits where its
  `_provenance` puts it. `d1_038` (a payment approval behind a buyer who orders and
  receives) counts at 2A3f, its key the separation of ordering from receiving, not the
  approval; `d1_041` (developers releasing their own code) counts at 2A3c and is never
  named a general or application control; `d1_042` (hours with no breakdown) counts at
  2A4b, keyed on Standard 13.6 with K16 9.2 for how a schedule is built. `d1_038` is
  labelled analysis on a recall bullet (2A3f), as `d1_033` is on 2A3e; the re-audit
  accepted both.

## 2. Where Part 2 stands against the gate

| Section | Items | Two-form bar (gate) | Three-form target | Gap to the bar | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Engagement Planning | 48 (6 dated) | 100, not met | 150 | 52 (58 today) | 31 | 5 (6 today) | 11 (12 today) | 1 |
| B Information Gathering, Analysis, and Evaluation | 39 | 80, not met | 120 | 41 | 22 | 1 | 9 | 0 |
| C Engagement Supervision and Communication | 11 | 20, not met | 30 | 9 | 7 | 0 | 5 | 0 |
| **Part 2** | **98 (6 dated)** | **200, not met** | **300** | **102 (108 today)** | **60** | **6 (7 today)** | **25 (26 today)** | **1** |

**"Dated" and "today".** The three Third-Party items written ahead (`d1_043` to `d1_045`)
carry `testable_from` 2027-03-01, and the three Organizational Behavior items written ahead
(`d1_046` to `d1_048`) carry 2027-06-01: until then they stay out of the held-back form,
the short mock, the per-learner draw and the free sample, and do not count toward the gate.
The plain figures count them (what the bank holds from 1 Jun 2027); "today" counts only
items testable now. 2A5a is the one bullet whose second item is dated, so it stays a
one-item bullet, never held back, until 1 Mar 2027. 2A5g's three items are all dated, so it
stays a zero-item bullet, below the gate, until 1 Jun 2027.

**Against the owner's gate of 26 Nov 2026** (one held-back full form plus one short mock's
worth of unseen items: about A 67, B 53, C 13): today A is 25 short, B 14, C 2, Part 2 41
in all; from 1 Mar 2027, with the Third-Party items, A is 22 short and Part 2 38; from 1 Jun
2027, with the Organizational Behavior items too, A is 19 short and Part 2 35. Round 5 moved
A from 30 short to 25 and B from 16 to 14 (round 4: A from 37 to 30, B from 23 to 16).

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 100 as 50/40/10 and 33 as 17/13/3. F/Ap/An by section:
A 3/30/15 (the six dated items are application), B 1/19/19, C 2/6/3. "Below depth" counts bullets that have items but none at their
verb's depth; zero-item bullets are counted on their own. Earlier figures, for comparison:
pilot, 37 items with 26 zero-item, 32 one-item and 11 below-depth bullets; round 1, 53
items with 14, 40 and 8; round 2, 64 items with 10, 39 and 3; round 3, 71 items with 9, 34
and 3; round 4, 85 items with 7, 30 and 1; round 5, 92 items with 7, 26 and 1; the
Third-Party items written ahead, 95 items with 7, 25 (26 today) and 1.)

What the counts hide:

- **Gate (a) is not met.** 7 of 60 bullets have no testable item today (6 from 1 Jun 2027,
  when 2A5g's three dated items count), and 1 more has items but none at
  its verb's depth: 2A7c, a judge bullet with only an application item (tried in rounds 1
  to 3; no Knowledge source helps it, as technology resources rest on the Standards). The
  zero-item bullets are 2A2a, 2A5c, 2A5e, 2A5f, 2A5g (until 1 Jun 2027), 2A6c and 2B4a,
  all recall verbs. 52 bullets meet their depth today, 53 from 1 Jun 2027 (round 4: 52;
  round 3: 48; round 2: 47; round 1: 38; pilot: 23): A 24 of 31 (25 from 1 Jun 2027), B 21
  of 22, C 7 of 7. Round 5 brought none to depth: all seven of
  its items went to bullets already at depth, four of them second items on one-item
  bullets (2A3f, 2A4b, 2B4c, 2B5b) and three later lessons (2A3c, 2A3d, 2A3e). The
  Third-Party items written ahead brought none either: `d1_043` (2A1a), `d1_044` (2A3f) and
  `d1_045` (2A5a) went to bullets already at depth. The Organizational Behavior items
  written ahead bring one, 2A5g, to depth from 1 Jun 2027: `d1_046` to `d1_048` are its
  first items, and a recall bullet is met by any item. Round 4
  brought 4 bullets to depth, all on Knowledge sources: first items on 2A3e (`d1_033`,
  `d1_034`) and 2A3f (`d1_035`), and the first analysis items on 2A4a (`d1_036`) and 2B4b
  (`d2_033`). Its other nine items are second or
  later lessons on bullets already at depth (2A3c, 2A3d, 2A6e, 2B3a twice, 2B4d, 2B4e,
  2B5a twice). Round 3 brought one bullet to depth, 2B7a (`d2_030`); round 2 brought 9:
  first items on 2A5a, 2A7b, 2A7d and 2B7d, and analysis items on 2B1a, 2B1b, 2B4e, 2B5a
  and 2C2a.
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
  2A4a draft, a 2A7c draft and a 2B2b draft. Round 4 wrote only to the knowledge bullets
  the Knowledge sources open, kept all 14 drafts, and left seven slots empty for want of a
  source (section 5's round 4 table). Round 5 wrote to seven of its ten leads, kept all
  seven drafts and left three leads empty (section 5's round 5 table). The Third-Party
  items written ahead filled three of four slots, cut none and left 2A3a empty; the
  Organizational Behavior items written ahead filled all three 2A5g slots, cut none and left
  four leads empty as repeats, recall only or follow-up ground (section 5's tables).
- **No full form can be drawn yet.** Every topic has an item, but 26 of the 53 bullets
  with items have exactly one, and a bullet's only item stays out of the held-back form.
  Twenty-seven bullets have two or more: 2A1a, 2A2b, 2A3a, 2A3c, 2A3d, 2A3e, 2A3f, 2A4a,
  2A4b, 2A5d, 2A6a, 2A6d, 2A6e, 2B1a, 2B1b, 2B2a, 2B3a, 2B4b, 2B4c, 2B4d, 2B4e, 2B5a, 2B5b,
  2B6a, 2B6c, 2C1c and 2C2a (round 5 added 2A3f, 2A4b, 2B4c and 2B5b; round 4 added 2A3d,
  2A3e, 2A4a, 2A6e, 2B4b and 2B4d). 2A5a joins them on 1 Mar 2027, when its dated second
  item (`d1_045`) becomes testable; 2A1a and 2A3f gain a third item that day. 2A5g joins
  them on 1 Jun 2027, with three dated items (`d1_046` to `d1_048`). Topic 2A4 can be sampled by the held-back form
  (`d1_008` and `d1_036` on 2A4a, `d1_018` and `d1_042` on 2A4b). Three topics still cannot, as
  every bullet in them has at most one item: 2A7, 2B7 and 2B8, all Standards-only topics
  that no Knowledge source opens.
- **Gate (b) needs about 108 more items today, 105 from 1 Mar 2027 and 102 from 1 Jun 2027;
  the owner's gate about 41 today, 38 and 35 from those dates.** The pilot kept 37 of
  50 written (74%); round 1 kept 16 of 19 (84%); round 2 kept 11 of 13 (85%); round 3 kept
  7 of 10 (70%); round 4 kept 14 of 14 (100%, the first Part 2 round with no cut); round 5
  kept 7 of 7 (100%) but wrote to only seven of ten leads; the Third-Party and the
  Organizational Behavior items written ahead kept 3 of 3 each. The running rate is 98 of
  119 (about 82%). Section A carries more than half of the two-form gap (52 from 1 Jun 2027)
  and 19 of the owner gate's 35 from that date; topic 2A5 now holds 8 of its 20 (4 of them
  dated), so 2A2 (2 of 9) and 2A7 (4 of 13) are furthest behind their shares, and no
  Knowledge source opens either, while topic 2A3 (16) has passed its share of 14.
- **Knowledge sources now open most of the knowledge bullets** (owner decision of 26 Nov
  2026; library rule 2b; research log K1 to K18; section 4 has the table). They key only
  the fact they state, in the topics their library heading names, and the internal
  auditor's step stays on the Standards, cited first. Round 4 used K1, K2, K4, K5, K7, K8,
  K9, K15, K16 and K17; round 5 used K1, K2, K5, K15 and K16. Still blocked: IT general against application controls (2A3c),
  GRC systems and a named three-way match (2A3f), integrated and remote approaches
  (2A4a), test methods outside IT (2A6e) and following up differences (2B5b) (ISA 500 and
  520 sit on a file host not allowed), embedded audit modules and robotic process
  automation (2B3a), anomaly detection and text analysis (2B4e), and a RACI rule to key on
  (2B4b). The owner decided on 25 Nov 2026 not to join The IIA, so members-only guides are
  never a source; the textbook is on hold (owner, 26 Nov 2026).
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
  does not count toward the gate before then. Six Part 2 items carry one: `d1_043`,
  `d1_044` and `d1_045`, the Third-Party items written ahead on 26 Nov 2026 (2027-03-01),
  and `d1_046`, `d1_047` and `d1_048`, the Organizational Behavior items written ahead the
  same day (2027-06-01); their Challenge copies carry the same dates. No Part 2 item rests on
  Organizational Resilience; the nine items on the Cybersecurity requirement (`d1_001`,
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
  `cia1_d2_068`, and apart from any 2C1 item on clearing review notes. From round 4 (each
  item's `_provenance`; keep apart in one mock): `d1_031` with `d1_017` and `d1_029`;
  `d1_032` with `d1_007` and `cia1_d2_016`; `d1_033` with `d1_034` (both 2A3e
  classification); `d1_035` near `cia1_d4_029`; `d1_036` with `d1_008`; `d1_037` with
  `d1_021`; `d2_031` with `d2_015` (transfer pair) and near `d2_027`; `d2_032` near
  `d2_027`, `d2_028` and `cia1_d3_078`; `d2_033` with `d2_006` (its key rule is this item's
  runner-up) and near `cia1_d1_104`; `d2_034` with `d2_019`, near `d2_018`; `d2_035` with
  `d2_025` (transfer pair), near `d2_007` and `d2_008`; `d2_036` with `d2_037` (both read a
  ratio), and both near `d2_026`. From round 5 (each item's `_provenance`; keep apart in
  one mock): `d1_038` with `d1_035` and `cia1_d4_015`; `d1_039` with `d1_007`, `d1_032` and
  `cia1_d2_016`; `d1_040` with `d1_033` and `d1_034` (all three 2A3e classification);
  `d1_041` with `d1_021`, `d1_037` and `d1_031`; `d1_042` with `d1_018` and `d1_011`;
  `d2_038` with `d2_018` (transfer pair), near `d2_036`, `d2_037` and `cia1_d1_050`;
  `d2_039` with `d2_008` (transfer pair; its key method is this item's option B), near
  `d2_019` and `d2_034`. From the Third-Party items written ahead (each item's
  `_provenance`; keep apart in one mock): `d1_043` with `cia3_d2_014` (its key, a vendor's
  subcontractor inside reach, is that item's runner-up; keep apart in one Challenge mock),
  `cia1_d1_099` (an outside party's refusal with no audit clause), `d1_001` and `d1_026`;
  `d1_044` with `d1_029` (vendor controls assessed through management's process), `d1_025`
  and `d1_038`; `d1_045` with `d1_025`, `d1_027` and `d1_029`. The set's first audit found
  one distractor family across all three (leave the vendor or its risks out because of a
  contract fact); the fix pass broke it in `d1_045`, and a later third-party item should not
  bring it back. From the Organizational Behavior items written ahead (each item's
  `_provenance`; keep apart in one mock, and keep the three 2A5g items apart from one
  another): `d1_046` with `cia1_d3_003` (behavior over messages), `cia1_d3_102` and
  `cia1_d4_016`; `d1_047` with `cia1_d3_003` and `cia1_d1_047`, fraud kept out; `d1_048` with
  `cia1_d4_040` and the 2B6 root-cause items, fraud kept out. Part 1's two items on the same
  requirement (`cia1_d3_106`, `cia1_d3_107`, 1C2a) teach other lessons (behavioral risk
  measured against objectives; a formal driver against an informal one, a behavior and an
  outcome); a later 2A5g item stays apart from them too.
- **Challenge tags:** 88 of 98 items carry one (all three Third-Party items written ahead:
  C1, C3 and C5; all three Organizational Behavior items written ahead: C5 each; every
  Challenge copy dated like its Part item; all of round 5's but `d1_040` and `d1_042`;
  all of round 4's but `d1_034`); `d1_002`, `d1_007`, `d1_018`, `d1_034`, `d1_040`, `d1_042`,
  `d2_001`, `d2_019`, `d3_003` and `d3_009` carry `null` as too basic for the Challenge
  candidate.

## 3. The map

### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 2A1a | Where Topical Requirements come into setting objectives and scope | Recognize (recall) | 3: d1_001 (C1), d1_026 (C1), d1_043 (C1, dated 2027-03-01) | 0/3/0 | yes | - (`d1_043`, written ahead on the Third-Party requirement, dated, out of the forms and mocks until 1 Mar 2027: a subcontractor the vendor's contract allows is inside the requirement's reach; a missing right-to-audit clause may limit assurance (user guide), and only access then refused is the Standard 13.3 scope limitation; siblings `cia3_d2_014` (this key is its runner-up), `cia1_d1_099`. `d1_026` is round 2's second lesson: assurance must conform whatever the request is called; sibling of `cia1_d1_046` and `d1_001`). Items on Organizational Behavior or Organizational Resilience need `testable_from`. Round 3 found no further 2A1 lesson (a fourth scope-limitation key, or repeats of `cia1_d1_069` and `cia1_d1_070`). Third-Party lessons here: spent |
| 2A1b | What feeds the objectives: whether the job is assurance or advisory, strategy, regulation, risk appetite, policies, how governance, risk and control are run, earlier audit reports and other providers' work | Recognize (recall) | 1: d1_002; also touched by d1_026 | 1/0/0 | yes | one item: cannot be held back. `d1_026` is logged here (the Section A file's round 2 note names it a second lesson on 2A1a and 2A1b) but counts at 2A1a. Round 2's own 2A1b lead (a regulatory goal ranked low) was left empty: it repeats `cia1_d1_070` |
| 2A1c | Spotting scope limitations at planning and writing them down | Identify (recall) | 1: d1_015 (C1); also touched by d1_016, d1_024 | 0/1/0 | yes | one item: cannot be held back; transfer pair with `cia1_d1_027` (Part 1 sits close: 1A7e's five items). A further "request may be a scope limitation" key would be the fourth: avoid |
| 2A1d | Ways to handle and record requests from stakeholders | Evaluate (judge) | 1: d1_016 (C1); also touched by d1_001, d2_025 | 0/0/1 | yes | one item: cannot be held back; sibling of `cia1_d1_105`. Round 2's second lesson left empty (a fourth "request may be a scope limitation" key) |
| 2A1e | Good ways to deal with a change in objectives or scope | Identify (recall) | 1: d1_003 (C1); also touched by d3_005 | 0/1/0 | yes | one item: cannot be held back. Round 2's second lesson left empty (repeats `cia1_d1_069`) |
| 2A2a | Picking the criteria that best fit the activity being audited | Identify (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 and 2 and left empty (round 1: common-sense key; round 2: repeats a Part 1 lesson). Part 1 sits close: `cia1_d3_020`, `cia1_d3_064`, `cia1_d1_060` |
| 2A2b | Testing a set of criteria: relevant, specific, practical, in line with objectives, and able to support fair comparisons | Determine (judge) | 2: d1_004 (C2), d1_030 (C2) | 0/0/2 | yes | - (`d1_030`, round 3's second lesson: a target the regions measure from different start points cannot give reliable comparisons, so it is inadequate whatever its level; `d1_004` turned on a missing satisfactory level; siblings `cia1_d3_064`, `cia1_d1_060`, `cia1_d2_077`, `cia1_d3_020`) |
| 2A3a | Where Topical Requirements come into planning | Recognize (recall) | 2: d1_006 (C3), d1_028 (C3) | 1/1/0 | yes | - (`d1_028`, round 3's second lesson: a Topical Requirement in scope is a minimum, and the top-ranked risk may need more; keyed on the Cybersecurity requirement and its user guide; siblings `d1_006`, `d1_025`, `cia1_d1_116`). The Third-Party slot written ahead (26 Nov 2026) was left empty: its planning lessons were taken (a minimum by `d1_028`, the life cycle by `d1_044`, reach by `d1_043`) |
| 2A3b | How the area's strategic goals connect to the way it measures and manages performance and to risk management | Recognize (recall) | 1: d1_005 (C3) | 0/1/0 | yes | one item: cannot be held back. K18 OpenStax Principles of Management 9.6 opens it (measures tied to strategic objectives, evaluation against a performance standard), but `d1_005` already keys a measure that misses the strategy's risk and `d1_004` a missing satisfactory level. Round 5 left lead R5-10 empty: each draft key was common sense or repeated `d1_004` or `d1_005`. Spent until a lesson apart from both turns on K18's fact; topic 2A3 has passed its share |
| 2A3c | Current and emerging cyber risks, IT general controls, everyday security controls, why IT control frameworks help, data privacy principles and data security practice | Recognize (recall) | 4: d1_017 (C3), d1_029 (C3), d1_031 (C3), d1_041 (C3); also touched by d1_006 | 0/4/0 | yes | - (`d1_041`, round 5's fourth lesson (lead R5-8): developers who move their own unapproved changes into production put payment logic at risk; K2 SP 800-53 CM-3 (review and approval before a change) and AC-5 (separation of duties), with Standard 13.2; the control is never named general or application; siblings `d1_021`, `d1_037`, `d1_031`. `d1_031`, round 4's third lesson and the first on privacy: personal data put to a new use is a privacy risk even when it is well secured; keyed on K4 NIST Privacy Framework 1.0, Privacy Risk Management, and K2 SP 800-53 PT-3, with Standard 13.2 for the planning step; siblings `d1_017`, `d1_029`. `d1_029`, round 3: a cloud provider's controls over the organization's data; `d1_017`: who watches for emerging threats). IT general against application controls still has no source (K16 1.1 sorts access control and encryption as application controls, against IT audit usage, so it is not listed). Four items and topic 2A3 past its share: give it nothing more. Privacy by Design (K16 6.1) would sit close to `d1_031`; the governance half of the old sibling lead stays on the Cybersecurity requirement |
| 2A3d | Readiness for disruption (continuity and disaster recovery): business impact analysis, resilience, handling incidents, and tests of backup and recovery | Recognize (recall) | 3: d1_007, d1_032 (C3), d1_039 (C3) | 1/1/1 | yes | - (`d1_039`, round 5's third lesson (lead R5-6): a recovery time objective longer than the process's maximum tolerable downtime fails by design, so restore tests against it prove nothing; K1 NIST SP 800-34 3.2 and 3.2.1 with Standard 13.2; its runner-up is untimed restores, not the recovery point. `d1_032`, round 4's second lesson: which recovery objective each piece of evidence answers, the recovery point against the recovery time; K1 NIST SP 800-34 3.2.1 and 3.4.1 with Standard 13.2; siblings `d1_007` (recovery rehearsed, not just backed up) and `cia1_d2_016`). Business impact analysis against risk assessment left empty: no listed K1 section sets the two side by side. Three items: spent for now. The resilience requirement is testable from 2027-10-01 |
| 2A3e | Finance and accounting basics for the area: assets (current and fixed), liabilities (short and long term), capital and investments | Recognize (recall) | 3: d1_033 (C3), d1_034, d1_040 | 0/2/1 | yes | - (`d1_040`, round 5's third lesson (lead R5-7): cash an owner paid for ordinary shares is contributed capital, equity, not a loan; K15 2.2 and 14.4, K5 captions 28 to 31, with Standard 13.2; untagged, too basic for the Challenge; the fresh blind test flagged it TOO EASY, kept as the bullet is recall. Round 4's first items: `d1_033`, analysis, an installment due this year left in long-term debt hides a current liability and flatters the current ratio (K15 OpenStax Principles of Accounting 12.1 and 5.3, K5 Regulation S-X 5-02 captions 19 to 21); `d1_034`, application, bonds management means to hold for years are long-term investments, not available funds, however readily they sell (K15 5.3, K5 captions 12 and 13); keep the two apart in one mock; `d1_034` is untagged, too basic for the Challenge). Watch the recall depth: no ratio computed. Assets, liabilities, capital and investments each now have an item: spent |
| 2A3f | Key risks and controls in everyday business processes and in systems such as CRM, ERP and GRC | Recognize (recall) | 3: d1_035 (C3), d1_038 (C3), d1_044 (C3, dated 2027-03-01) | 0/2/1 | yes | - (`d1_038`, round 5's analysis item (lead R5-1): a payment approval that rests on order and delivery records the same buyer made does not separate ordering from receiving, so goods ordered and kept pass at any amount; K15 8.3 and K2 AC-5 with Standard 13.2 (fraud risks); no three-way match named; near `cia1_d4_015`. Round 4's first item: a real-time (perpetual) stock system still needs a physical count, since theft and damage never post (K15 6.2, K17 10.4 for the ERP, Standard 13.2); near `cia1_d4_029`. Left empty in round 4: GRC systems (no allowed source defines one) and a named three-way match (K15 8.3 separates ordering, receiving and paying and K6 lists the documents matched, but no source names the match as a control). `d1_044`, written ahead on the Third-Party requirement (dated 2027-03-01, out of the forms and mocks until then): a high-risk vendor whose contract has ended opens the offboarding stage, so the bank's own exit steps (access removed, data returned or destroyed) are assessed (Controls I, for third parties prioritized by risk; Standard 13.2); runner-up in both blind tests was monitoring (Controls F, a real must earlier in the life cycle); siblings `d1_029`, `d1_025`, `d1_038`. Third-Party lessons here: spent |
| 2A4a | Weighing approaches (traditional, agile, integrated, remote) and picking the best fit | Evaluate (judge) | 2: d1_008 (C4), d1_036 (C4) | 0/1/1 | yes | - (`d1_036`, round 4's first analysis item: a subject redesigned every month suits short planning cycles, each cycle's program approved before its work; keyed on Standard 13.6 first, with K16 OpenStax Foundations of Information Systems 9.1 and 4.1 for what an adaptive approach suits, and 13.5; sibling `d1_008`. Rounds 1 to 3 had left it empty or cut drafts). Integrated and remote approaches still have no source: audit terms no allowed free source defines, and the members-only integrated approaches guide is never opened |
| 2A4b | Project management ideas used to plan and run an engagement | Describe (recall) | 2: d1_018, d1_042 | 0/2/0 | yes | - (`d1_042`, round 5 (lead R5-2): break each objective's work into tasks before setting end dates; Standards 13.6 and 13.5 first, as they carry the step, then K16 9.2 for the order a schedule is built in (the first audit's HARD ERROR had OpenStax first); both items untagged, too basic for the Challenge; siblings `d1_018`, `d1_011`). Scrum's timeboxes and Definition of Done (K14) stay open, thin (section 6, R6-2) |
| 2A5a | Where Topical Requirements come into the risk assessment | Recognize (recall) | 2: d1_025 (C5), d1_045 (C5, dated 2027-03-01); also touched by d1_009 | 0/2/0 | yes | one testable item until 1 Mar 2027: cannot be held back before then. `d1_045`, written ahead on the Third-Party requirement: a contract that says the vendor owns the billing risks does not move them out of the engagement risk assessment, as the organization keeps accountability for the risks to its objectives, and sharing is a response, not a transfer (user guide); Standard 13.2; siblings `d1_025`, `d1_027`, `d1_029`. Round 2's first item keys on the Cybersecurity requirement and its user guide alone (coverage by an earlier assurance engagement, recorded as the reason for exclusion); sibling of `cia1_d1_061`, `d1_001`, `d1_006`. Round 3's second lesson left empty (repeats `cia1_d1_061`). Third-Party lessons here: spent |
| 2A5b | Risks that run through the whole activity: regulatory, cyber, IT, operational and financial | Recognize (recall) | 1: d1_009 (C5) | 0/1/0 | yes | one item: cannot be held back. Round 3's second lesson left empty (repeats `d1_009`) |
| 2A5c | How emerging risks affect the organization | Recognize (recall) | 0; also touched by d1_017 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (round 1: sound practice only; round 2: repeats `cia1_d2_061`, `cia1_d2_059`, `cia1_d3_055` or common sense; round 3: repeats `cia1_d4_036`) |
| 2A5d | Methods and criteria for rating and ranking risks and controls | Determine (judge) | 2: d1_010 (C5), d1_027 (C5) | 0/0/2 | yes | - (`d1_027`, round 3's second lesson: the plan's risk assessment is an input, and the engagement identifies and ranks its own risks; it also touches the 2A5 topic line; transfer pair with `cia1_d4_008`, siblings `cia1_d3_004`, `cia1_d3_013`, `d1_010`) |
| 2A5e | How changes to people, processes and systems shift risk | Recognize (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (round 1 repeated `cia1_d4_008`; round 2 repeated `cia1_d2_061`, `cia1_d2_059`, `cia1_d3_055` or common sense; round 3 repeated `cia1_d2_061`) |
| 2A5f | How structure and setting matter: remote or in-person work, flat or traditional layers, central or local control | Recognize (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (round 1: common-sense key; rounds 2 and 3: sound practice only) |
| 2A5g | How culture shapes the control environment: how individuals and groups behave, and tone at the top | Recognize (recall) | 3: d1_046 (C5, dated 2027-06-01), d1_047 (C5, dated 2027-06-01), d1_048 (C5, dated 2027-06-01) | 0/3/0 | yes from 1 Jun 2027; no testable item today | zero testable items until 1 Jun 2027, then three, so it can be sampled by the held-back form from that date. Written ahead on the Organizational Behavior requirement and its user guide (26 Nov 2026), each with Standard 13.2: `d1_046`, a tone control is incomplete when nothing checks that staff understand and support the leaders' clear messages (Controls B, structured feedback; runner-up: rate it sound on clear messages through accessible channels); `d1_047`, a credit committee that never questions a proposal, in a year's minutes and two observed meetings, is the behavior risk to rate (the user guide's example indicator, keyed at example strength; runner-up: minutes too thin; A and D fall to the stem's silence, logged for the hardening pass); `d1_048`, thirty fitters each warned once for one shortcut is a shared pattern nobody traces or corrects (Controls A and E, behavioral patterns as recurring; runner-up: warnings too mild to deter, a real user-guide hook the explanation answers). Siblings in section 2; fraud kept out of all three. Left empty: incentives (repeats `cia1_d4_033` and `d1_005`), speak-up channels (repeats `cia1_d3_003`), training lists (recall only) and closing behavior gaps (follow-up ground). Organizational Behavior lessons here: spent |
| 2A6a | Procedures that test whether a control is well designed | Determine (judge) | 2: d1_012 (C6), d1_019 (C6) | 0/1/1 | yes | - |
| 2A6b | Procedures that test whether controls work | Identify (recall) | 1: d1_013 (C6) | 0/0/1 | yes | one item: cannot be held back. Round 3's second lesson left empty (sound practice, or the independent-source win again) |
| 2A6c | Procedures that test whether controls are efficient | Identify (recall) | 0 | 0/0/0 | no | zero items; tried in rounds 1 to 3 and left empty (sound practice only). Part 1 sits close: `cia1_d3_019`, `cia1_d3_085` |
| 2A6d | Judging whether the work program is good enough | Evaluate (judge) | 2: d1_011 (C6), d1_020 (C6); also touched by d1_003, d1_008 | 0/1/1 | yes | - |
| 2A6e | Test methods for engagements that cover accounting, finance, IT systems, operations or cybersecurity | Identify (recall) | 2: d1_021 (C6), d1_037 (C6) | 0/2/0 | yes | - (`d1_037`, round 4's second IT-systems item: only a test that makes the lockout act shows how it behaves, against examining the setting against policy; K7 NIST SP 800-53A 2.4.2 and Appendix C with Standards 14.1 and 13.6; sibling `d1_021`, leavers' access). Both items are IT systems. Methods outside IT and cybersecurity still have no source: ISA 500 and 520 sit on `ifacweb.blob.core.windows.net`, not allowed; AICPA texts are not free; GAO denies access. Round 3's second lesson had been left empty |
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
| 2B3a | Tools that save time and add insight: dashboards, continuous monitoring, embedded audit modules, robotic process automation, machine learning and AI | Recognize (recall) | 4: d2_015 (D3), d2_027 (D3), d2_031 (D3), d2_032 (D3); also touched by d1_014 | 0/4/0 | yes | - (round 4: `d2_031`, a validated machine learning model must be retested once its input data changes, even with its code unchanged (Standard 14.1 first, then K9 NIST AI 100-1 Appendix B; transfer pair with `d2_015`, where the validation was current); `d2_032`, a validated monitoring tool supports only the checks it runs, so a control resting on a manager's judgment needs its own test (Standard 14.1 first, then K8 NIST SP 800-137 2.3; near `d2_027`, `d2_028`, `cia1_d3_078`). `d2_027`, round 2: a dashboard built by the team under review is a lead until its feed is tested). Four items on topic 2B3's share of five: give other bullets priority. Embedded audit modules and robotic process automation still have no source |
| 2B4a | Breaking a process workflow into its parts | Define (recall) | 0 | 0/0/0 | no | zero items; thin: sound practice beyond Standard 13.2. Round 2 draft cut (a map that stopped before the payment made the missing step obvious); round 3 left it empty (no Standards-keyed lead that repeats nothing). Round 4 left it empty again with K16 OpenStax Foundations of Information Systems 2.4 and 4.2 open: the source states what a cross-functional process is, but every draft key was the visibly complete map (round 2's cut) or a walk-through key resting on Sound practice, not on the fact. Round 5 left lead R5-9 empty: every draft key was the widest span of the workflow, the visibly complete map, or a span chosen by the objective's scope, which test-taking finds; none turned on K16 2.4's fact. Section B's only zero-item bullet; tried in four rounds, spent until a new source or a new angle appears |
| 2B4b | Studying workflows with responsibility matrices (such as RACI), walk-throughs and process maps | Analyze (judge) | 2: d2_006 (D4), d2_033 (D4) | 0/1/1 | yes | - (`d2_033`, round 4's first analysis item: a newly approved To-Be map is neither this year's condition nor its criteria; the condition comes from testing calls against bills. Standard 14.2 first, then K16 OpenStax Foundations of Information Systems 4.2 (As-Is against To-Be), Standards 13.4 and 13.3; near `d2_006`, whose key rule is this item's runner-up, and `cia1_d1_104`. Round 2's draft was cut and round 3 left it empty). A RACI lesson stays empty: K16 9.1 shows a RACI chart only as a project planning document, and the notes' RACI lines are Sound practice and Common usage, so no source states a rule to key on |
| 2B4c | Data types: structured and unstructured | Explain (recall) | 2: d2_008 (D4), d2_039 (D4) | 0/2/0 | yes | - (`d2_039`, round 5 (lead R5-4): a tagged event log whose elements vary by event type is semistructured, so it is parsed into fields before the test; K16 3.1 and Table 3.1 with Standard 14.1; its stem asks for a data-handling method; transfer pair with `d2_008`, unstructured contract text, whose keyword search is this item's option B). Spent: each of the three types now has an item |
| 2B4d | The analytics steps: set the objective, get the data, normalize it, analyze it, report the results | Explain (recall) | 2: d2_019, d2_034 (D4) | 0/2/0 | yes | - (`d2_034`, round 4: rescale two measures kept in different units to a common scale before combining them in a ranking; K16 8.1 with Standard 14.1 and the syllabus; its stem asks for a data-handling method, so the Knowledge source keys no auditor's step; near `d2_019` (one supplier list before a duplicate test) and `d2_018`). Round 5 left lead R5-5 (problem definition first, K16 8.1) empty: the key stood alone as the only option that was not a preparation step, and notes 2B4.3 already teach it as a trap. Spent |
| 2B4e | When to use each analysis method: diagnostic, predictive, prescriptive, anomaly detection, text analysis | Determine (judge) | 3: d2_007 (D4), d2_025 (D4), d2_035 (D4); also touched by d2_008 | 0/1/2 | yes | - (`d2_035`, round 4: an agreed advisory objective to recommend one of three options fits prescriptive analysis, and the choice stays with management; K16 8.2, the Glossary's advisory services, Standards 13.3 and 14.1; transfer pair with `d2_025`, where an assurance objective about a past cause made the prescriptive request the runner-up). Anomaly detection and text analysis still have no source |
| 2B5a | Reading ratios, variances, trends, benchmarks, and financial and nonfinancial data | Analyze (judge) | 4: d2_009 (D5), d2_026 (D5), d2_036 (D5), d2_037 (D5) | 0/1/3 | yes | - (round 4, both on K15 OpenStax Principles of Accounting Appendix A with Standard 14.2, figures given and nothing computed: `d2_036`, a steady current ratio beside a falling quick ratio points at inventory or prepaid costs, and a ratio's move is a lead, not a finding; `d2_037`, receivables turnover already allows for sales growth, so growth cannot explain its fall (also Standard 4.3); keep the two apart in one mock and both apart from `d2_026`. `d2_026`, round 2: follow up the unexplained difference that matters most). Four items: give other bullets priority |
| 2B5b | Choosing the analytical technique that serves the engagement objective | Determine (judge) | 2: d2_018 (D5), d2_038 (D5) | 0/0/2 | yes | - (`d2_038`, round 5's analysis item (lead R5-3): whether spending rose each year asks for horizontal (trend) analysis over several years from a base year, not a two-year change or a common-size share; K15 Appendix A with Standards 14.1 and 14.2; transfer pair with `d2_018`, near `d2_036`, `d2_037` and `cia1_d1_050`). Benchmarking against a comparable firm (K18 9.6) would sit close to `cia1_d1_050`, `cia1_d1_071` and `d2_018`'s option D. Following up differences as an audit step still needs ISA 520 (host not allowed) |
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
| A | 48 (6 dated) | 100 | 52 (58 today) | 2A1: 7 of 18; 2A2: 2 of 9; 2A3: 16 of 14; 2A4: 4 of 8; 2A5: 8 of 20; 2A6: 7 of 18; 2A7: 4 of 13 (each count includes its dated items: one Third-Party item each in 2A1, 2A3 and 2A5, and the three Organizational Behavior items in 2A5). Owner's gate: 67, so 25 short today, 22 from 1 Mar 2027 and 19 from 1 Jun 2027. Topic 2A5 (8 items, judge) is now enforced by the difficulty-by-verb check and passes (0 foundational, 2 analysis, both on 2A5d); its next items should not be foundational. Rounds 4 and 5 put nine items into 2A3 and the Third-Party items one more, so it is past its share: give it nothing more (it is a Plan topic with 16 items: foundational 2 (13%), analysis 3 (19%), inside the limits). 2A4 has room (2A4b's Scrum lead, thin; section 6, R6-2), and 2A6e an IT-systems lead (R6-3, thin); the rest of Section A's gap sits in the Standards-only topics: an analysis item on 2A7c (the one bullet below depth), and 2A2, 2A7, 2A1, 2A6b and 2A5, which no Knowledge source opens and whose leads repeated existing items in rounds 2 and 3. 2A5g is filled (three items written ahead, dated 2027-06-01). The empty slots (2A2a, 2A5c, 2A5e, 2A5f, 2A6c) reopen only with a lead that answers every round's reasons. |
| B | 39 | 80 | 41 | 2B1: 5 of 8; 2B2: 4 of 11; 2B3: 4 of 5; 2B4: 9 of 14; 2B5: 6 of 8; 2B6: 5 of 12; 2B7: 4 of 13; 2B8: 2 of 9. Owner's gate: 53, so 14 short. Round 5 gave 2B4c and 2B5b their second items and left 2B4a and the 2B4d lead empty: the Knowledge sources' Section B leads are spent apart from 2B3a's old lead (1), a Standards-decided final two (section 6, R6-1). The rest of the gap sits in the Standards-only topics, 2B8, 2B7 and 2B2 furthest behind their shares (round 3's leads for 2B6b, 2B7b, 2B7c, 2B8a and 2B8b each repeated an existing item). 2B4 (9 items, Apply) passes its mix (0 foundational, 6 application); 2B5 (6) reaches enforcement at 8. 2B1 already holds 2 analysis items of 5, so its next items are foundational or application. |
| C | 11 | 20 | 9 | 2C1: 5 of 11; 2C2: 6 of 9. Owner's gate: 13, so 2 short; no Knowledge source opens Section C (it rests on the Standards alone). Every bullet is at depth; the rest are second lessons on the five one-item bullets (2C1a, 2C1b, 2C1d, 2C2b, 2C2c), 2C1 first. Rounds 2 to 4 added none (round 4 wrote only to knowledge bullets): every lead repeated `d3_001`, `d3_007`, `d3_008`, `d3_010` or `d3_011`, a Part 1 item (`cia1_d1_037`, `cia1_d2_013`, `cia1_d2_068`, `cia1_d3_012`) or a Section A resource item (`d1_022`, `d1_024`), or rested on a line the notes mark KaiSip's reading. |

**What each knowledge bullet rests on after round 5, and what is still blocked.** The IIA
sources opened for Part 2 are the Standards (Principles 13 and 14 above all; also 3.1, 4.2,
4.3, 5.2, 8.1, 8.2, 9.3, 10.2, 10.3, 11.2, 11.5, 12.3, 15.1 and the glossary), the four
Topical Requirements with their user guides, the two 2026 Statements of Position, the
Competency Framework and the syllabus. Background only (no key): the COSO summaries, the
Topical Requirements Application Guidance (ruled Background in round 1, 25 Nov 2026: not
on the exam's reference list, labelled Supplemental), and the three sources round 15 read
for the notes (the IIA data analytics paper, the 2024 AI Auditing Framework, the public
pages of two members-only guides), which are not in the citation library. Members-only
guides are never a source (no IIA membership, decided 25 Nov 2026); the textbook is on hold
(owner, 26 Nov 2026).

**Knowledge sources (owner decision of 26 Nov 2026; library rule 2b).** Eighteen free
public sources were opened on 26 Nov 2026 (`CIA_RESEARCH_LOG.md`, K1 to K18). A Knowledge
source keys only a fact it states, only in the topics its library heading names; who acts
and every must stay on the Standards, cited first when the auditor's step decides the item.
The notes teach each deciding fact as a "Knowledge (source)" line before an item keys on it
(round 4 added them to 2A3.2, 2A3.3, 2A3.4, 2A4.2, 2A6.4, 2B3.1, 2B3.2, 2B4.1, 2B4.3, 2B4.4
and 2B5.1; round 5 added or rewrote lines in 2A3.2 (change control), 2A3.3 (maximum
tolerable downtime against the recovery time objective), 2A3.4 (the capital row and the
ordering and receiving trap), 2A4.3 (the work breakdown structure), 2B4.4 (semistructured
data) and 2B5.3 (horizontal against vertical analysis)).

| Bullet | Open now (K number, section; item that uses it) | Still blocked, and why |
|---|---|---|
| 2A3b | K18 OpenStax Principles of Management 9.6 (measures tied to strategic objectives, a performance standard, benchmarking); no item yet (round 5's R5-10 left empty) | Nothing; a second lesson must stay apart from `d1_005` and `d1_004`, and round 5 found none |
| 2A3c | K4 NIST Privacy Framework 1.0 and K2 SP 800-53 PT-3 (`d1_031`); K2 CM-3 and AC-5 (`d1_041`); K2 AC-2, AC-6, AU-6, CP-9, IR-4, SI-10; K3 CSF 2.0 (what a framework is for, its Functions); K16 6.1 (privacy against security, Privacy by Design's principles) | IT general against application controls as named categories: K16 1.1 sorts access control and encryption as application controls, against IT audit usage, so it is not listed; GAO's FISCAM is denied. Lessons on the Cybersecurity requirement keep to it and its user guide (as `d1_017` and `d1_029` do) |
| 2A3d | K1 NIST SP 800-34: business impact analysis (3.2), maximum tolerable downtime, recovery time and recovery point (3.2.1, `d1_032`, `d1_039`), backup and recovery (3.4.1), testing (3.5.1) | A business impact analysis set against a risk assessment (no listed K1 section draws the line); business resilience as The IIA frames it waits on the Organizational Resilience requirement (testable 2027-10-01) |
| 2A3e | K15 OpenStax Principles of Accounting 2.2, 5.3, 11.1, 12.1, 13.1, 14.4 and K5 Regulation S-X 5-02 captions (`d1_033`, `d1_034`; 2.2, 14.4 and captions 28 to 31 for `d1_040`) | Nothing for the bullet's recall depth; K5 is a US caption list, so items cite it as support, never as the rule that binds a non-US company |
| 2A3f | K15 6.2 (perpetual records still need a physical count, `d1_035`), 7.1 and 8.3 (ordering, receiving and paying separated, `d1_038`, with K2 AC-5); K16 7.4 and K17 10.4, 12.4, 13.2 (ERP, CRM, supply chain systems); K6 Prompt Payment rule (the documents matched before payment; US federal practice, documents only); K2 AC-5 | GRC systems (no allowed source defines one); a three-way match named as a control (no source names it). The third-party life cycle is now keyed on the Third-Party requirement in `d1_044` (dated 2027-03-01), not on a Knowledge source |
| 2A4a, 2A4b | K16 OpenStax Foundations of Information Systems 4.1, 9.1 (predictive, adaptive, incremental, `d1_036`) and 9.2 (project stages, work breakdown structure, `d1_042`, after Standards 13.6 and 13.5); K14 The Scrum Guide 2020 (Scrum terms; it never says agile; no item yet) | Integrated and remote audit approaches (audit terms no allowed free source defines; the members-only guide is never opened). The choice of approach stays on Standards 13.5 and 13.6 |
| 2A5g | Not a Knowledge bullet: the Organizational Behavior requirement and its user guide (Verified), with Standard 13.2 (`d1_046` to `d1_048`, dated 2027-06-01) | Nothing the requirement opens: its lessons for this bullet are in the bank or left empty as repeats (section 5's table) |
| 2A6e | K7 NIST SP 800-53A 2.4.2 and Appendix C: examine, interview, test, for IT systems only (`d1_037`) | Methods outside IT and cybersecurity (inquiry, observation, inspection, confirmation, reperformance, analytical procedures): ISA 500 and 520 are in the IAASB 2026 Handbook, but its files sit on `ifacweb.blob.core.windows.net`, not allowed (an owner decision would open them); AICPA texts are not free; GAO denies access |
| 2B3a | K9 NIST AI 100-1 Appendix B (`d2_031`); K8 NIST SP 800-137 2.3 (`d2_032`); K17 6.8 (dashboards and their drawbacks) and 14.3 (full-population testing, continuous monitoring); K16 8.2 (dashboards in BI reporting) | Embedded audit modules and robotic process automation (no reputable free source on an allowed host) |
| 2B4a, 2B4b | K16 2.4 (process modelling, cross-functional processes), 4.2 (flowcharts, As-Is and To-Be maps, `d2_033`), 9.1 (a RACI chart as a planning document) | A RACI rule to key on (K16 9.1 only shows the chart; the notes' RACI lines are Sound practice and Common usage); 2B4a's key must rest on K16 2.4's fact, not on what the map shows (round 4's drafts did not) |
| 2B4c, 2B4d, 2B4e | K16 3.1 and Table 3.1 (structured, semistructured, unstructured; `d2_039`); 8.1 (the analytics process, normalization, `d2_034`); 8.2 (descriptive, diagnostic, predictive, prescriptive, `d2_035`) | Anomaly detection and text analysis as methods (K16 has only network anomaly detection) |
| 2B5a, 2B5b | K15 Appendix A (liquidity, solvency, efficiency and profitability ratios; trend and common-size analysis; comparison with the industry and the prior year; `d2_036`, `d2_037`; trend against common-size, `d2_038`) and 5.3 (current ratio); K18 9.6 (benchmarking) | Following up unexpected differences as an audit step (ISA 520, host not allowed; K15 shows it only as a management analysis): such items keep to Standard 14.2, as `d2_026`, `d2_036` and `d2_037` do |
| 2A5a (recall); 2A7d (judge) | Not a knowledge bullet | Applicability judged by inherent risk, and the board agreeing to a rescope, rest only on the Application Guidance (Background). Round 2 met both without it (`d1_025` on the Cybersecurity requirement and its user guide; `d1_024` on Standards 13.3 and 13.5) |

## 5. Gap list in priority order

Round 4 showed the Knowledge sources open lessons the IIA sources could not (14 kept of 14,
four bullets brought to depth); round 5 used most of what was left (7 kept of 7, three of
ten leads left empty, topic 2A3 past its share). The Knowledge-source leads are now close to
spent (section 6, "Leads for round 6"), so the order below puts first what still has a
lead and then what would open more. Every item is still a ceiling, filled only where a
distinct lesson is found.

1. **The three thin leads left on Knowledge-source bullets** (section 6, R6-1 to R6-3):
   2B3a's old lead (1), where a Standards distinction (Standard 4.2, cost against benefit)
   decides the final two and K17 14.3 only makes the runner-up real; 2A4b on the Scrum
   Guide (K14); and a third 2A6e item on K7, IT systems only. At most three items.
2. **The one judge bullet below depth: 2A7c** (technology resources), tried in rounds 1 to
   3 and cut in round 3 (two blind testers chose the option that raises it with the chief
   audit executive). No Knowledge source helps: a new lead keys on a technology rule not
   already keyed in `d1_014`, `d1_022` or `cia1_d2_018`, and the stem rules out the
   escalation option.
3. **The zero-item bullets.** 2B4a was tried in rounds 2 to 5 (a cut, then three empty
   slots, the last two with K16 2.4 and 4.2 open): spent until a new source or angle
   appears. 2A2a, 2A5c, 2A5e, 2A5f and 2A6c rest on the Standards alone, were left empty in
   rounds 1 to 3 and reopen only with a lead that answers every round's reasons. 2A5g was
   written ahead on the Organizational Behavior requirement (`d1_046` to `d1_048`, dated
   2027-06-01) and leaves this list on that date.
4. **Second lessons on the Standards-only bullets** (Section A: 2A1, 2A5, 2A6b, 2A7;
   Section B: 2B2b, 2B2c, 2B6b, 2B7, 2B8; Section C: all five one-item bullets, 2 items
   needed for the owner's gate). Rounds 2 and 3 found most leads repeated an existing item
   (section 4 and the round tables below name them); new leads must stay apart from all of
   them. Topics 2A7, 2B7 and 2B8 still cannot be sampled by the held-back form. These are
   also where a Standards distinction can decide a final two, which the round 4 and 5
   audits asked for and the knowledge bullets rarely allow.
5. **Give nothing more to** topic 2A3 (15 of its 14), 2B5a or 2A3c (four items each), nor
   to 2B3a beyond R6-1 (its topic's last slot), and no third item to 2A3d, 2A3e, 2B4c or 2B5b without a lesson apart from
   every sibling logged in section 2.
6. **What would open the rest.** Allowing `ifacweb.blob.core.windows.net` would open ISA
   500 and ISA 520 (test methods outside IT for 2A6e; following up differences for 2B5b and
   2B5a), an owner decision; the IAASB's revisions to both are out for comment until 15 Dec
   2026 (research log watch list). The Third-Party requirement (opened; testable
   2027-03-01) is now spent for Part 2: `d1_043` (2A1a), `d1_044` (2A3f) and `d1_045`
   (2A5a) were written ahead on 26 Nov 2026 and count toward the gate from that date, and
   2A3a was left empty (its lessons were taken). **Organizational Behavior** (opened,
   Verified; testable 2027-06-01) is now spent for Part 2 too: `d1_046` to `d1_048` were
   written ahead on 26 Nov 2026 as 2A5g's first items, and its other areas were left empty
   as repeats or recall only (section 5's table). **Organizational Resilience** (testable
   2027-10-01) is the last requirement that can be written ahead: it reaches only 2A3d in
   Part 2, already three items deep (`d1_007`, `d1_032`, `d1_039`), and topic 2A3
   is past its share, so it is worth a set only if its text opens a lesson apart from all
   three. **The opened sources are now close to spent for Part 2**, as for Parts 1 and 3:
   only ISA 500 and 520 (a host the owner has not allowed) or the textbook (on hold) would
   open more.
   Still no route: GRC systems, a named three-way match, IT general against application
   controls, integrated and remote approaches, embedded audit modules, robotic process
   automation, anomaly detection, text analysis and a RACI rule. The textbook is on hold.

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

**Round 4 (26 Nov 2026): Knowledge-source slots, filled or left empty.** Round 4 wrote
only to the knowledge bullets the Knowledge sources open, through the two section experts
(`cia-p2a-section-expert`, `cia-p2b-section-expert`). It kept all 14 drafts after one fix
pass; no item was renumbered.

| Slot | What happened | Reason |
|---|---|---|
| 2A3e (first items) | Filled (`d1_033`, `d1_034`) | K15 and K5 state the classification facts; round 3's "no opened source" answered |
| 2A3f (first item) | Filled (`d1_035`) | K15 6.2: a perpetual system still needs a physical count |
| 2A4a (analysis item) | Filled (`d1_036`) | Standard 13.6 decides; K16 9.1 and 4.1 say what an adaptive approach suits. Rounds 1 to 3 had failed on "Common usage", repeats or a common-sense key |
| 2B4b (analysis item) | Filled (`d2_033`) | Standard 14.2 decides; K16 4.2 says what a To-Be map shows. Round 2's cut and round 3's empty slot answered |
| 2A3c, 2A3d, 2A6e, 2B3a (2), 2B4d, 2B4e, 2B5a (2) | Filled (`d1_031`, `d1_032`, `d1_037`, `d2_031`, `d2_032`, `d2_034`, `d2_035`, `d2_036`, `d2_037`) | New lessons on facts the sources state; siblings logged in section 2 |
| 2A3c (IT general against application controls) | Left empty | No source: K16 1.1 sorts access control and encryption as application controls, against IT audit usage, so it is not listed |
| 2A3f (ERP roles or GRC systems; a named three-way match) | Left empty | No allowed source defines a GRC system, and none names the match as a control (K15 8.3 separates the duties; K6 lists the documents) |
| 2A3d (business impact analysis against risk assessment) | Left empty | No listed K1 section sets the two side by side |
| 2A4a (integrated and remote approaches) | Left empty | Audit terms no allowed free source defines |
| 2A6e (a method outside IT) | Left empty | ISA 500 and 520 sit on a file host not allowed |
| 2B4a (first item) | Left empty again (round 2 cut a draft; round 3 left it empty) | K16 2.4 states what a cross-functional process is, but each draft key was the visibly complete map (round 2's cut) or a walk-through key resting on Sound practice |
| 2B4b (a RACI lesson) | Left empty | No source states a RACI rule to key on (K16 9.1 only shows the chart) |
| `d2_032` | Kept | Classed test-taking by one of three reviews only (the second blind test); the second options-only tester missed its key, and the re-audit found it not answerable from the options |

**Round 5 (26 Nov 2026): the round 5 leads, filled or left empty.** Round 5 wrote to
leads R5-1 to R5-10 (section 6) through the same two section experts. It kept all 7 drafts
after one fix pass; `d1_042`'s key moved from C to A in the fix pass to balance the round's
keys, and no item was renumbered.

| Slot | What happened | Reason |
|---|---|---|
| 2A3f (second item, R5-1) | Filled (`d1_038`, analysis) | K15 8.3 and K2 AC-5 state the separation; the approval rests on the buyer's own records. The first draft's runner-up (payments up to the threshold) was a cut-down key, replaced in the fix pass |
| 2A4b (second item, R5-2) | Filled (`d1_042`) | Standards 13.6 and 13.5 carry the step; K16 9.2 gives the order a schedule is built in. The first draft cited K16 first: the round's HARD ERROR, fixed |
| 2B5b (second item, R5-3) | Filled (`d2_038`, analysis) | K15 Appendix A: trend over several periods against a two-year change and a common-size share |
| 2B4c (second item, R5-4) | Filled (`d2_039`) | K16 3.1 and Table 3.1: semistructured data are parsed into fields |
| 2A3d, 2A3e, 2A3c (later lessons, R5-6 to R5-8) | Filled (`d1_039`, `d1_040`, `d1_041`) | New lessons on facts K1, K15, K5 and K2 state; siblings logged in section 2 |
| 2B4d (third item, R5-5) | Left empty | Problem definition first stood alone as the only option that was not a preparation step (test-taking finds it), notes 2B4.3 already teach it as a trap, and the bullet holds two items |
| 2B4a (first item, R5-9) | Left empty (fifth try in four rounds) | Every draft key was the widest span of the workflow, the visibly complete map, or a span chosen by the objective's scope, which test-taking finds; none turned on K16 2.4's fact |
| 2A3b (second item, R5-10) | Left empty | Each draft key was common sense or repeated `d1_004` (a missing satisfactory level) or `d1_005` (a measure that misses the strategy's risk) |
| `d1_040` | Kept | Flagged TOO EASY by the fresh blind tester (the stem's "ordinary shares" and the key's "owners' stake"); the bullet is recall, and the item is untagged for the Challenge |

**Third-Party items written ahead (26 Nov 2026): filled or left empty.**
`cia-p2a-section-expert` wrote to four Section A slots on the Third-Party Topical
Requirement and its user guide (both opened and Verified), each item dated 2027-03-01. It
kept all three drafts after one fix pass; none was renumbered.

| Slot | What happened | Reason |
|---|---|---|
| 2A1a (third item) | Filled (`d1_043`) | The requirement reaches subcontracted relationships the vendor's contract allows; the first audit's PRECISION was a missing right-to-audit clause called a scope limitation outright (the user guide says it may limit assurance; only refused access is the Standard 13.3 limitation), fixed in the item and notes 2A1.2 |
| 2A3f (third item) | Filled (`d1_044`) | Controls I (offboarding) for a vendor prioritized by risk; the first draft's key had the auditor check the vendor's own state, now the bank's own exit steps, and the pre_read gave the key away, then (re-audit) presumed the vendor was assessed: both fixed |
| 2A5a (second item) | Filled (`d1_045`) | The organization keeps accountability for the risks to its objectives; the options-only pass found it at high confidence from "outsource the work, not the accountability", so the fix pass made every option rank the risks (B as shared, C as the vendor's but rated low) |
| 2A3a (third item) | Left empty | Its lessons were taken: a minimum (`d1_028`), the life cycle (`d1_044`) and reach (`d1_043`) |

**Organizational Behavior items written ahead (26 Nov 2026): filled or left empty.**
`cia-p2a-section-expert` wrote to three 2A5g slots on the Organizational Behavior Topical
Requirement and its user guide (both opened and Verified), each item dated 2027-06-01,
beside two Part 1 items on 1C2a (`cia1_d3_106`, `cia1_d3_107`; `CIA_P1_COVERAGE.md`). It
kept all three drafts after one fix pass; none was renumbered.

| Slot | What happened | Reason |
|---|---|---|
| 2A5g (first item) | Filled (`d1_046`) | Controls B: the tone control includes structured feedback on staff understanding and support, not only clear messages; the first audit found the stem word "staff" echoed only in the key and an explanation that walked the source's own order, both fixed |
| 2A5g (second item) | Filled (`d1_047`) | The user guide's example indicator (decisions made without effective challenge), keyed at example strength with Standard 13.2; the first draft's thin-minutes option was near a second answer while the minutes were the only evidence (the auditor now also observes two meetings), and its explanation and citation leaned on Governance C's different "challenge", all fixed. Logged for the hardening pass: A and D fall to the stem's silence |
| 2A5g (third item) | Filled (`d1_048`) | Controls A and E with the user guide's behavioral patterns (recurring, not one-off): many people repeating one lapse is a pattern case-by-case warnings leave in place; option A's real hook (discipline too lenient to deter) is now answered in its explanation |
| Incentives with disincentives | Left empty | Repeats `cia1_d4_033` and `d1_005` |
| Speak-up channels with protection | Left empty | Repeats `cia1_d3_003` |
| Training lists | Left empty | Recall only: no final two the requirement decides |
| Closing behavior gaps | Left empty | Follow-up ground, not engagement planning |

Two lessons from Part 1 apply to every slot. A thin, common-sense lesson fails the blind
test however it is rebuilt (rounds 12 to 14: the 1B4g trust sibling and the 1C7c "stop the
loss" item were cut; plan section 7), so a lead whose key a careful non-auditor would pick
is dropped, not polished. And a slot with no distinct lesson stays empty (round 14 left 16
of 22 slots empty rather than repeat). Part 2 held to both: round 1 left seven slots empty
and cut three drafts; round 2 left twelve slots empty and cut two drafts; round 3 left
the slots in its table empty and cut three drafts; round 4 left seven slots empty for want
of a source and cut none; round 5 left three leads empty and cut none; the Third-Party
items written ahead left one slot empty and cut none; the Organizational Behavior items
written ahead left four leads empty and cut none (the tables above).

## 6. Leads for first items and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. Each rests on the Part 2 notes and the
Standards; none retells a notes example (the pilot had to replace 2A3.1's example when a
question retold it). "Keep apart" names the nearest existing item, so the new item takes a
different trap (sibling rule). Leads marked **thin** risk the common-sense cut and need a
Standards distinction to survive. On a recall bullet, keep the knowledge at the bullet's
level even when the scenario asks for a choice.

Rounds 1 to 5 (25 and 26 Nov 2026) mark each lead in italics: used, not used, tried and left
empty, or tried and cut; "spent" means the lead's lesson is now in the bank or its slot is
closed. A lead not used whose bullet now has an item becomes a sibling lead and
must stay apart from that item.

**Leads for round 6 (26 Nov 2026): the Knowledge-source leads are close to spent**

Round 5 used seven of the ten round 5 leads and left three empty for the reasons the
earlier rounds gave (common sense, a repeat, a key that stands alone). Every bullet the
Knowledge sources open now holds two or more items except 2A3b (R5-10 empty) and 2B4a
(zero; five tries in four rounds), and topic 2A3 has passed its share. What is left is
three thin leads, at most three items against a gap of 25 in A and 14 in B. Part 2's
gap now rests on Standards-only lessons, on ISA 500 and 520 (an owner decision on the
`ifacweb.blob.core.windows.net` host) and on the 2027 Topical Requirement dates (section
5, item 6); no further free public source on an allowed host is known that would open
the blocked bullets (research log).

- **R6-1. 2B3a, a fifth item (Recognize; the old lead (1)).** The objective is whether 12
  contracts carry board approval; a teammate proposes a machine learning model over the
  whole contract store. Key: due care weighs the cost of a technique against its benefit,
  so reading the 12 contracts answers the objective (Standard 4.2; open its text before
  keying). Runner-up, in the key's register: the model, as analytics let auditors test a
  full population (K17 14.3 states that fact; it makes the runner-up real and never keys).
  A Standards distinction decides the final two, which the round 4 and 5 audits asked for.
  2B3 holds 4 of its 5: this is its last slot. Keep apart from `d2_015`, `d2_027`,
  `d2_031` and `d2_032`.
- **R6-2. 2A4b, a third item (Describe; thin).** An engagement run in sprints counts a
  test as done once it is run, before its workpaper is reviewed. K14 states that a Sprint is
  a fixed-length event of one month or less and that the Definition of Done states when an
  Increment is complete; the review itself rests on Standards 12.3 and 14.6, cited first.
  Key: the team's definition of done includes the supervisor's review of the workpaper.
  Runner-up, in the key's register: lengthen the sprint to finish the reviews (Sprints are
  fixed length). Common-sense risk; keep apart from `d1_008` and `d1_036` (agile with
  approved programs) and `d3_002` (a review note).
- **R6-3. 2A6e, a third item (Identify; IT systems only; thin).** Only if K7's Appendix C
  states the coverage attribute of a method (which and how many objects are assessed):
  a patch test examines servers in one data centre when the scope covers three. Key:
  widen coverage to every location in scope (K7; Standard 13.3 for the scope). Runner-up:
  deepen the test on the same servers. Keep apart from `d1_021` and `d1_037` (test against
  examine). Drop it if the source does not state the attribute.

Not leads: benchmarking for 2B5b (K18 9.6) sits on `cia1_d1_050`, `cia1_d1_071` and
`d2_018`'s option D; Privacy by Design for 2A3c (K16 6.1) sits on `d1_031`; a business
impact analysis against a risk assessment for 2A3d still has no K1 section; 2A3b, 2B4a and
2B4d are spent as round 5 found.

**Third-Party leads after the items written ahead (26 Nov 2026): spent for Part 2.** The
requirement's Section A lessons are in the bank (`d1_043` reach, `d1_044` offboarding,
`d1_045` accountability kept) or closed (2A3a). Not leads: a fourth third-party item on
2A1a or 2A5a (each would repeat one of them, `d1_025` or `cia1_d1_099`), the life cycle's
other stages on 2A3f without a must that decides the final two (monitoring, Controls F, is
already `d1_044`'s real runner-up), and recording coverage in the plan or the workpapers (a
may, taken in Part 3 by `cia3_d3_015`).

**Organizational Behavior leads after the items written ahead (26 Nov 2026): spent for
Part 2.** 2A5g's lessons are in the bank: the tone control includes staff feedback
(`d1_046`), a committee that never challenges is an example behavior risk (`d1_047`) and
one lapse by many people is a pattern (`d1_048`), each dated 2027-06-01. Not leads:
incentives with disincentives (`cia1_d4_033`, `d1_005`), speak-up channels (`cia1_d3_003`),
training lists (recall only), closing behavior gaps (follow-up ground), and a fourth 2A5g
item on another indicator from the user guide's list (examples only, and it would repeat
`d1_047`'s shape). **No written-ahead lead is left** but Organizational Resilience
(testable 2027-10-01) on 2A3d, and only with a lesson apart from `d1_007`, `d1_032` and
`d1_039` (section 5, item 6).

**Leads the Knowledge sources opened for round 5 (26 Nov 2026), in priority order**

*Round 5 (26 Nov 2026): R5-1 to R5-4 and R5-6 to R5-8 used (`d1_038`, `d1_042`, `d2_038`,
`d2_039`, `d1_039`, `d1_040`, `d1_041`); R5-5, R5-9 and R5-10 tried and left empty (section
5's round 5 table). All ten are spent.*

Each rests on a fact a listed Knowledge source states (research log K1 to K18; library rule
2b) and on the Standards for the auditor's step, cited first when the step decides. Open
the section before keying, write the notes' "Knowledge (...)" line in the same pass, and
give a wrong option the key's register from the start (round 4's options-only lesson). The
first three are the top leads.

- **R5-1. 2A3f, second item (Recognize).** *Round 5: used by `d1_038` (analysis); its first runner-up, payments up to the threshold, was a cut-down key and became payment splitting.* Planning a purchasing engagement, the auditor
  learns that the new ERP lets one buyer role raise an order, record the goods as received
  and release the payment run. Key: the risk to rate is that one person can order, accept
  and pay for goods alone, as ordering, receiving and paying sit with different people (K15
  8.3; K2 AC-5), rated under Standard 13.2. Runner-up, in the key's register: payments over
  a limit need a second approval (one approval exists, yet receipt is not separated from
  ordering). K6 1315.9 may support the documents payment rests on (order, receiving
  report, invoice) as US federal practice, the documents only; never key the name
  "three-way match". Keep apart from `d1_035` (the count) and the notes' 2A3.4 example
  (supplier set-up and payment rights); check Part 1's 1C7 items on separation of duties
  first.
- **R5-2. 2A4b, second item (Describe).** *Round 5: used by `d1_042`, with Standards 13.6 and 13.5 cited first after the audit's HARD ERROR.* A draft plan gives each objective a total of
  hours and a reporting date, with no breakdown of the work. Key: break each objective into
  a work breakdown structure of tasks small enough to estimate, assign and track (K16 9.2),
  which the work program then carries (Standard 13.6). Runner-up, in the key's register: a
  timeline of the objectives against dates (a schedule without the breakdown). Thin: the
  final two must turn on K16 9.2's fact. Keep apart from `d1_018` (the auditor named per
  task) and `d1_011` (a missing criterion): the key must not land on either.
- **R5-3. 2B5b, second item (Determine; analysis).** *Round 5: used by `d2_038`.* The objective is whether a branch's
  maintenance costs have been climbing; the manager offers this year against last year.
  Key: trend (horizontal) analysis over several periods, as two periods rarely show a trend
  (K15 Appendix A; notes 2B5.1 already teach it), chosen because it answers the objective
  (Standard 14.1 relevance; Standard 14.2 for the analytical review). Runner-up, in
  the key's register: common-size (vertical) analysis of this year's costs, a real
  technique that answers a share question, not a direction one. Keep apart from `d2_018`
  (a rate per thousand orders) and `d2_034` (rescaling): no "scale by size" key.
- **R5-4. 2B4c, second item (Explain).** *Round 5: used by `d2_039`.* Event logs arrive as tagged records whose fields
  vary by event type. Key: semistructured data, so the tags are parsed into fields before
  the test (K16 3.1, Table 3.1). Runner-up: load them as fixed fields; other wrong: search
  them as free text. Keep apart from `d2_008` (unstructured contract text).
- **R5-5. 2B4d, the old lead (1) (Explain).** *Round 5: tried and left empty (the key was the only non-preparation option; notes 2B4.3 already teach it). Spent.* Duplicate-payment tests begin before anyone
  has said what the analysis must answer. Key: define the problem first (K16 8.1 puts
  problem definition before data preparation and analysis; Standard 14.1 relevance).
  Runner-up: prepare and normalize the data first. Thin (common-sense risk). Keep apart from
  `d2_019` and `d2_034`, both preparation keys.
- **R5-6. 2A3d, a third lesson (Recognize).** *Round 5: used by `d1_039`, with untimed restores beside a plan with no recovery lead as wrong options.* A system's recovery time objective is set
  longer than the maximum time its process can stay down. Key: the recovery target cannot
  protect the process (K1 3.2.1). Do not make the recovery point the runner-up (that is
  `d1_032`'s final two); use an evidence option, such as restore tests that are not timed.
- **R5-7. 2A3e, a third lesson (Recognize).** *Round 5: used by `d1_040` (ordinary shares, to close the redeemable-share reading).* An owner's cash contribution is recorded as a
  loan payable. Key: liabilities are overstated and owners' equity understated (K15 2.2 and
  14.4). Keep apart from `d1_033` (timing) and `d1_034` (intent).
- **R5-8. 2A3c, a fourth lesson (Recognize).** *Round 5: used by `d1_041`.* Developers can move their own changes into
  production with no approval record. Key: the change control risk to rate (K2 CM-3 and
  AC-5), never named as a "general" or "application" control. Keep apart from `d1_021`
  (leavers' access) and `d1_037` (lockout test). Privacy by Design (K16 6.1) is the
  alternative, but it sits close to `d1_031`.
- **R5-9. 2B4a, first item (Define; thin).** *Round 5: tried and left empty (each key was the widest span, the complete map or a scope-chosen span). Spent.* Only with a key that turns on K16 2.4's fact:
  an order-to-cash workflow crosses sales, warehouse and finance, so its segments meet at
  the handoffs, and a scope set on one department's map misses them (Standard 13.3 for the
  scope). Round 2's cut and round 4's drafts failed because the gap showed on the map's
  face: no visible missing step, no walk-through key.
- **R5-10. 2A3b, second item (Recognize; thin).** *Round 5: tried and left empty (common sense, or a repeat of `d1_004` or `d1_005`). Spent.* K18 9.6 ties performance measures to
  strategic objectives and evaluates them against a performance standard. `d1_005` already
  keys a measure that misses the strategy's risk, and `d1_004` a missing satisfactory
  level: write it only if a third lesson turns on K18's fact and repeats neither.

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
- **2A3c Cyber, IT and data protection (Recognize).** *Round 1: not used; `d1_017` took another lesson (who watches for emerging threats). This lead is now a sibling lead; keep it apart from `d1_017`. Round 3: its vendor half used by `d1_029` (a cloud provider holding patient records); the governance half stays a sibling lead. Round 4: not used; `d1_031` took a third lesson (privacy apart from security, on K4 and K2 PT-3). The governance half is still a sibling lead, behind the round 5 Knowledge leads below. Round 5: not used; `d1_041` took a fourth lesson (change control, K2 CM-3 and AC-5). 2A3c holds four items: this lead waits.* A cyber assurance work program tests
  access, patching and encryption only. Key: the requirement also asks about governance and
  about vendors' controls over the organization's systems and data (Cybersecurity
  Topical Requirement, Governance and Risk Management; notes 2A3.2). Runner-up: add more
  technical tests. No key on IT general against application controls or on a named privacy
  principle. Keep apart from `d1_006` (mapping a framework to the requirement) and `d1_007`.
- **2A4b Project management (Describe).** *Round 1: used by `d1_018`. Round 5: `d1_042` took a second lesson (the work breakdown first, R5-2).* A supervisor's timeline lists tasks and hours but
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
- **2A5g Culture (Recognize).** *Organizational Behavior items written ahead (26 Nov
  2026): used; `d1_046` to `d1_048` filled it, dated 2027-06-01. Spent.* Written on the
  Organizational Behavior requirement with `testable_from` 2027-06-01, with lessons
  distinct from 1C2a and 1D4a. Fraud kept out.
- **2A6c Efficiency procedures (Identify).** *Round 1: tried and left empty (sound practice only). Round 2: tried again and left empty (sound practice only). Round 3: left empty a third time (sound practice only).* A three-signature approval on low-value
  purchases. Key: a procedure that weighs the control's time and cost against the risk it
  covers. Runner-up: reperform a sample of approvals, which tests effectiveness. Keep apart
  from `cia1_d3_019`, `cia1_d3_085`, and `d1_012`, where an efficiency procedure is a
  wrong option.
- **2A6e Test methods by subject (Identify).** *Round 1: not used; `d1_021` took the IT-systems subject (leavers' access). This receivables lead is now a sibling lead. Round 4: still blocked: a confirmation as an accounting test method needs ISA 500 (host not allowed); `d1_037` took a second IT-systems lesson (test against examine, K7).* Receivables in an accounting engagement: key,
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
- **2B3a Technology tools (Recognize).** *Round 1: neither lead used; `d2_015` took a third lesson (a validated, reconciled model's clean result is relied on). Both leads are now sibling leads; keep (2) apart from `d2_015` as well. Round 2: lead (2) used by `d2_027` (a treasury-built dashboard; key, test the feed and a sample; runner-up, the full-year view). Lead (1) stays a sibling lead. Round 4: neither lead used; `d2_031` (a model whose input data changed, K9) and `d2_032` (what a monitoring tool cannot judge, K8) took new lessons. 2B3a now holds four items: lead (1) waits until other bullets catch up.* (1) The objective is whether 12 contracts carry
  board approval; a teammate proposes a machine learning model. Key: due care weighs cost
  against benefit, so the simple test answers it (Standard 4.2). Runner-up: the model,
  because it covers the population. (2) A dashboard built by the treasury team shows every
  exception cleared. Key: check the completeness and accuracy of its data feed before
  relying on it (Standards 4.3 and 14.1). Runner-up: rely on the dashboard because it covers
  the whole population. Keep (2) apart from `d2_003` by the actor and the tool.
- **2B4a Workflow segments (Define; thin).** *Round 1: not used. Round 2: tried and cut after the fix pass, answerable from wording (the map stopped before the payment, so the missing step was obvious). Retired as written; round 3 needs a new lead whose gap is not visible on the map's face. Round 3: left empty (no lead keyed on the Standards that repeats nothing). Round 4: left empty with K16 2.4 and 4.2 open (each draft key was the visible map or a Sound practice walk-through). This lead is spent; see the round 5 2B4a lead below. Round 5: R5-9 left empty too.* A purchase-to-pay process mapped only inside
  procurement, while payment sits in finance. Key: the scope covers the processes the
  objectives need, so the handoff to finance is a segment of the workflow (Standards 13.2
  and 13.3). Keep apart from `cia1_d1_062` and `cia1_d1_104`.
- **2B4d Analytics steps (Explain).** *Round 1: neither lead used as written; `d2_019` keyed the normalize step (one supplier list before a duplicate test). Both leads are now sibling leads. Round 4: neither used; `d2_034` keyed rescaling (K16 8.1). Lead (1) can now key on K16 8.1, which puts problem definition before data preparation and analysis: a round 5 lead. Lead (2) still rests on Standard 14.1 alone. Round 5: lead (1), as R5-5, tried and left empty (the key stood alone as the only non-preparation step). Lead (1) is spent.* (1) An auditor runs duplicate-payment tests before
  agreeing what the analysis must answer. Key: set the objective first (the syllabus's
  order; Standard 14.1 relevance). Runner-up: normalize the data first. (2) Before analysis,
  key: reconcile the extract's totals to the ledger (Standard 14.1); runner-up: delete
  repeated records as duplicates (the notes say flag, never delete).
- **2B5b Choosing the technique (Determine; analysis).** *Round 1: not used as written; `d2_018` keyed a rate against a count for a quality claim. This lead is now a sibling lead. Round 4: not used (no 2B5b item); see the round 5 2B5b lead below, on K15 Appendix A. Round 5: not used; `d2_038` took trend against common-size (R5-3). This lead stays a sibling lead, apart from `d2_018` and `d2_038`.* The question is whether every
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

- **2A4a (Evaluate).** *Round 1: tried and left empty (the lead retold the notes' example); a new scenario is needed. Round 2: tried again and left empty (every lead retold the notes' example, repeated `d1_009` or `cia1_d3_054`, or rested on "Common usage"); this warehouse lead too is retired. Round 3: a remote-work draft was cut (it repeated `d2_020` and `d2_003`, with a common-sense key). Round 4: depth met by `d1_036` (a subject redesigned monthly; short cycles, each approved first; Standard 13.6 with K16 9.1). Spent.* Existing: `d1_008` (agile). Lead: stock existence at 30 warehouses
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
- **2B4b (Analyze).** *Round 2: tried (an interview-built access matrix against the system's records) and cut after the fix pass: the stem's wording pointed at the key. This lead sits close to the cut draft; round 3 needs a new lead whose stem does not name the winning evidence. Round 3: left empty (no lead keyed on the Standards that repeats nothing). Round 4: depth met by `d2_033` (a To-Be map is neither the condition nor this period's criteria; Standard 14.2 with K16 4.2). This RACI lead is spent until a source states a RACI rule.* Existing: `d2_006` (walk-through against the approved map). Lead: a
  responsibility matrix for payroll changes shows one role both entering and approving
  changes and no role owning the check of new bank details. Key: test what the conflicting
  role can and does do, through access rights and records, before calling the condition
  (Standard 14.2: the condition rests on evidence). Runner-up: report the matrix's gaps as
  findings. No key on what a RACI letter means; do not retell the notes' vendor-setup
  example.
- **2B4e (Determine).** *Round 2: used by `d2_025` (before and after by route; the operations head's request for a model is the trap; keyed on Standards 14.1 and 13.3). Round 4: `d2_035` took the mirror (prescriptive analysis for an agreed advisory objective, K16 8.2). 2B4e holds three items: this diagnostic lead is spent.* Existing: `d2_007` (anomaly flags). Lead: the question is why late
  deliveries rose in one quarter; the data holds routes, carriers and dates. Key: the
  analysis that explains a past result by drilling into its drivers (Standard 14.1:
  information consistent with the objective). Runner-up: a model that forecasts next
  quarter's late deliveries, which answers what may happen. The key must not rest on a
  method's definition (no opened source defines them); keep it apart from `d2_008`.
- **2B5a (Analyze).** *Round 2: not used as written; `d2_026` met the depth (which of four results to follow up, by significance and cost against benefit). The margin lead is a sibling lead; keep it apart from `d2_026` and `d2_009`. Round 4: not used; `d2_036` and `d2_037` took two ratio readings on K15 Appendix A. 2B5a holds four items: the margin lead is spent for now.* Existing: `d2_009` (an independent headcount). Lead: a unit's margin
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

26 bullets have one item each after round 5 (32 after the pilot, 40 after round 1, 39 after round 2, 34 after round 3, 30 after round 4); second lessons come after the first
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
- **What round 4 taught (26 Nov 2026).** Knowledge sources open lessons the IIA sources
  could not: 14 of 14 kept, four bullets brought to depth, no cut. Three rules came out of
  its audits. (1) The notes must teach the deciding fact before an item keys on it: the
  first audits found notes 2A3.4, 2B3, 2B4.3 and 2B5.1 taught none of the facts the keys
  needed, and the fix pass added "Knowledge (...)" lines; write the line with the item.
  (2) Cite the Standard first whenever the auditor's step decides the item, and keep a
  Knowledge fact free of "must" (`d1_036`, `d2_031` to `d2_033` were reordered; `d2_034`'s
  stem was reframed as a method question). (3) Knowledge items fall to the options-only
  pass more readily than Standards items: every first-draft key was found from the options
  alone, as the lone option that sought evidence (`d2_037`), the only option on the
  engagement's subject (`d1_034`), the full version of a cut-down runner-up (`d2_032`), or
  the corner of a two-by-two option pattern (`d1_036`). The fix that worked: a wrong option
  in the key's register that also gathers evidence or prepares data, options as concrete as
  the key (`d1_032`), and no shared distractor family across a pair (`d2_036` and `d2_037`
  both had "report it as a finding" at D). After it, the options-only testers still landed
  13 of 14 keys but mostly at low or medium confidence, so read their confidence, not only
  their hits. The Section B audit also noted that a Knowledge fact decided the final two in
  all seven items and a Standards distinction in none: mix the two in round 5.
- **What round 5 taught (26 Nov 2026).** (1) The brief's self-check (read the options with
  the stem covered, before handing over) lowered the options-only testers' confidence, not
  their hits: round 4's first pass found 14 of 14 keys with five at high confidence, round
  5's found 7 of 7 with none at high (5 low, 2 medium), and the fix pass left that
  unchanged. The two medium-confidence keys (`d1_042`, `d2_039`) were "do this, then that"
  sequences: give a wrong option the same shape from the draft. Low-confidence guesses
  still land on the textbook risk, so on a recognize-level item the stem must carry the
  decision; the two items the fresh blind test classed needs-the-Standards (`d1_038`,
  `d1_039`) are those whose runner-up is a real risk in the key's own terms. (2) The
  checklist still missed what it named: a Knowledge source cited first for a step
  (`d1_042`, the HARD ERROR), a cut-down runner-up (`d1_038`), distractor families shared
  with earlier siblings (`d1_039` with `d1_032`, `d2_038` with `d2_018`, `d2_039`'s
  management-prepared list at D for the fourth time in Section B) and a stem word echoed
  only in the key (`d1_038`, caught at the re-audit). The brief checked within the round;
  check each wrong option against the bullet's existing items and the section's
  letter-by-letter families as well. (3) The first audit's rate fell (1 / 8 / 15 on 7, 1.1
  PRECISION an item, against 2.7 in round 4), but all seven final twos again turned on a
  Knowledge fact: on recognize-level knowledge bullets a Standards distinction rarely
  decides, so the mix must come from Standards-only bullets (R6-1 is the one Knowledge-side
  exception).
- **What the Third-Party items written ahead taught (26 Nov 2026).** (1) A Topical
  Requirement gives what the Knowledge rounds lacked: each final two turned on the
  requirement's own line (how far its reach goes, a must for prioritized vendors, the
  accountability the organization keeps against a response that only shares the risk), not
  on a Knowledge fact. (2) Strength labels slip: the first audit's most frequent PRECISION
  was a "may" written as an "is" or under a "Must" label (`d1_043`'s right-to-audit
  clause, notes 2A1.2, and in Part 3 notes 3C1.1 and an exact day the source never gives).
  Write each notes line with the source's own strength. (3) A well-known saying finds a
  key from the options alone ("outsource the work, not the accountability" found `d1_045`
  at high confidence); the fix that worked was making every option accept the saying and
  differ on the response. (4) A set written together shares families: all three first
  drafts had a "leave it out because of a contract fact" option. (5) Two parts written at
  once collide: `cia3_d2_014` and `cia3_d2_015` were re-keyed before hand-off because
  `d1_043` and `cia3_d3_015` had taken their first keys. A write-ahead set that spans parts
  needs one lesson list agreed across the authors before drafting.
- **What the Organizational Behavior items written ahead taught (26 Nov 2026).** (1) A
  requirement whose areas are content, not only applicability, gives final twos the
  requirement itself decides: half of the tone control set against the other half
  (`d1_046`), a pattern against individual cases (`d1_048`). (2) The user guide's indicator
  list gives examples, not musts: `d1_047` keys on one at example strength, and the notes
  file it under "Example only"; the first draft of notes 2A5.3 put it under a "Must" label,
  the Third-Party set's fault again. (3) One source of evidence leaves a near second
  answer: while the minutes were `d1_047`'s only evidence, "minutes too thin" fitted as
  well as a silent committee; a second, corroborating source (two observed meetings) made
  it the runner-up, at the cost of a weaker distractor. (4) A user-guide hook in a wrong
  option must be answered in its explanation (`d1_048`'s deterrence line). (5) Names and
  countries collide across a set written in two parts at once (Camila in Chile, Wanjiru in
  Kenya) and with older items; check settings across the parts, not only keys.
- **The Knowledge sources moved the ceiling, and are now close to spent.** The opened IIA
  sources were close to exhausted after round 3 (its Section A author judged 3 to 6
  distinct Section A lessons were left). The Knowledge sources open 2A3, 2A4, 2A6e (IT
  only), 2B3, 2B4 and 2B5; rounds 4 and 5 drew 21 items from them, and section 6 now lists
  three thin leads. They do nothing for 2A1, 2A2, 2A5, 2A7, 2B1, 2B2, 2B6 to 2B8 or Section
  C. The owner's gate (A 67, B 53, C 13) needs 25, 14 and 2 more. Neither section closes on
  the leads left: the rest needs new Standards-only lessons, ISA 500 and 520 (a host the
  owner would need to allow) or the 2027 testable dates of the Third-Party (2027-03-01),
  Organizational Behavior (2027-06-01) and Organizational Resilience (2027-10-01)
  requirements, whose items can be written ahead with `testable_from`. The Third-Party
  and Organizational Behavior requirements are now spent for Part 2 (three items each; A
  22 short of the owner's gate from 1 Mar 2027 and 19 from 1 Jun 2027); Organizational
  Resilience reaches only 2A3d, already three items deep. **The opened sources are close
  to spent for Part 2**: what would open more is ISA 500 and 520 (a host the owner has not
  allowed) or the textbook (on hold); Organizational Resilience only if its text opens a
  lesson apart from `d1_007`, `d1_032` and `d1_039`.
- **Pick-the-longest after the Organizational Behavior items written ahead:** A 17.7% (48
  items; `d1_048`'s key is the longest option, by two characters); after the Third-Party
  items written ahead: A 16.7% (45 items); after round 5: A 17.9% (42 items), B 16.7% (39), C 22.7% (11)
  (round 4: A 17.6%, B 17.6%; round 3: A 18.3%, B 16.7%; round 2: A 17.3%, B 14.8%; round
  1: A 20.5%, B 9.5%). `check_cia.py` enforces 15 to 24% from 40 items per section: A is
  now enforced and passes; B reaches it with its next item. Pick-shortest: A 11.5%, B 22.6%
  (round 4: B 23.9%), under the 30% ceiling: keep varying key lengths both ways. After the
  Organizational Behavior items, A's pick-shortest is 12.2%.
- **Difficulty by verb** is enforced per topic, by the topic verb, from 8 items. 2A3 (16
  items with `d1_044`, judge: 2 foundational, 3 analysis) and 2B4 (9 items, apply: 0 foundational, 6
  application) are enforced and pass, and 2A5 joins them with the Organizational Behavior
  items (8 items, judge: 0 foundational, 2 analysis, 25%); 2A1 (with `d1_043`) and 2A6 have
  7, 2B5 and 2C2 have 6. The judge topics
  need at least 15% analysis and at most 25% foundational, so recall-verb bullets under
  judge topics (most of 2A1, 2A3, 2A5 and 2A6) still need scenario items, not definitions.
- **`d2_002` is a hardening candidate** (the pilot kept it on a split blind verdict); the
  2B1b analysis item, `d2_024`, now covers the bullet at depth if the hardening fails and
  `d2_002` is cut.
- **Scoring the round 4 and 5 evidence later:** `score_blind.py` now scores round 4's first
  Section B blind and options-only files 6 of 7, because `d2_031`'s key moved from C to A in
  the fix pass, and round 5's first Section A files 4 of 5, because `d1_042`'s key moved
  from C to A; in both rounds the testers had matched the key of the time.
- **Re-run this map after each round**: set each new item's bullet in the scaffold step,
  before it is written.
