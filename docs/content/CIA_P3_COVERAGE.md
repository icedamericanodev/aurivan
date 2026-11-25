# CIA Part 3: syllabus bullet coverage map

Built 25 Nov 2026, after the Part 3 pilot, to measure Part 3 against the sale gate
(`docs/content/CIA_BANK_PLAN.md`, section 3, decision 4, revised in round 14): (a) every
syllabus bullet tested at its verb's depth with every gate passing; (b) two full
exam-weighted forms of distinct items per section (Part 3 is 100 questions as A 25, B 15,
C 15, D 45, so A 50, B 30, C 30, D 90); (c) one full form frozen and held back, and a short
mock drawn per learner from unseen items; a bullet's only item is never held back. Three
forms (Part 3 about 300: A 75, B 45, C 45, D 135) stay the target as sources open.

Source: the opened Part 3 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026; each bullet's
leading verb re-read in it on 25 Nov 2026). The "Covers" column is the blueprint's own
wording (`docs/content/CIA_BLUEPRINT.md`), not The IIA's; the verb is the bullet's own
leading word, not the topic's. Bank: all 45 items in `data/cia/cia3/originals/d1.json` to
`d4.json` as of the pilot (A 12, B 9, C 10, D 14; none retired). The pilot wrote 53 drafts
and cut 8 before merge (A 3, B 1, D 4), renumbering the later items each time; the map
follows the file and each item's `_provenance`, not the drafts. This is an internal
working document; it holds no item text. No prep provider was opened for it.

## 1. How the map was made

- **One primary bullet per item**, read from the stem, the key and the explanation.
  Section D's `_provenance` names a bullet; Sections A to C name only a notes sub-topic, so
  their bullet was set here. A plain second bullet is listed as "also touched by"; it does
  not count toward that bullet.
- **Ids are short**: `d1_012` means `cia3_d1_012`; Part 1 and Part 2 items keep their full
  id (`cia1_d1_044`, `cia2_d3_011`). A Challenge tag is shown in brackets: Part 3's Section
  A serves Challenge B1 to B4, Section B serves B5 to B7, Section C serves A6 to A8 and
  Section D serves E1 to E8 (`docs/content/CIA_CHALLENGE_MAP.md`).
- **Topic-line rows.** No Part 3 item tests its topic line without a lettered bullet, so
  the tables have no "(line)" rows.
- **Depth.** The bullet's own verb decides it, by the plan's section 4 classes (recall:
  Describe, Recognize, Identify, Explain; apply: Interpret, Apply, Demonstrate, Maintain;
  judge: Evaluate, Determine, Analyze, Assess, Plan, Complete, Prepare, Summarize). A recall
  bullet is met by any item; an apply bullet needs at least one application or analysis
  item; a judge bullet needs at least one analysis item. Verbs the plan's table does not
  list are read as in the Part 1 and Part 2 maps (KaiSip's reading, open to the auditor):
  Define as recall (3D1a); Outline as recall (3A2a: setting out the steps of a process, as
  Describe does); Compare as apply (3C1e, as Part 1 read "Compare and contrast"); Distinguish
  as apply (3D7b, as Part 1 read "Differentiate"). If Compare were read as judge, 3C1e would
  be below depth (one application item); reading Distinguish either way changes nothing
  (3D7b's item is an analysis item).
- **Bullet verbs mostly match the recall topics.** 66 of Part 3's 70 bullets carry a recall
  verb, two an apply verb (3C1e Compare and 3D7b Distinguish, both under Describe topics)
  and two a judge verb (3C3d Analyze under a Recognize topic; 3D3c Determine under the
  Determine topic). Some go the other way: 3D2's three bullets (Describe, Recognize,
  Identify) sit under the one apply topic (Demonstrate), and 3D3a and 3D3b (Recognize) under
  the one judge topic. The topic verb still sets each topic's difficulty mix
  (`check_cia.py`); the bullet verb sets the floor for its items, and an item on a recall
  bullet never needs knowledge deeper than the bullet asks for. On a recall bullet, depth
  comes from sequence and role: who does what, in what order.
- **Mapping is judgment.** Where an item could sit under two bullets, the one its key
  turns on won. `d1_002` (training after rewritten methodologies) sits at 3A1d: its key is
  the training step Standard 9.3 attaches to revising the methodologies, and notes 3A1.4
  teaches both; no item yet asks which condition warrants a review, so that half of 3A1d
  waits for a second lesson. `d1_004` (evaluating each auditor's competencies) sits at 3A2d,
  the development duty of Standard 10.2, and is also touched by 3A2e. `d1_005` (reviewing
  the strategy with the board and senior management) sits at 3A3a. `d1_006` sits at 3A3b,
  though its key is the strategy's objectives beside its vision (Standard 9.2) and a
  mission statement is a wrong option: the mission statement half has no keyable source
  (section 5). `d2_003` (a risk that spans three units) sits at 3B1a, also touched by 3B2a.
  `d2_009` (who agrees what a significant change is) sits at 3B2c, also touched by 3A4b.
  `d3_001` (a risk manager runs the self-assessment) sits at 3C1e, as its key is internal
  against external, and is also touched by 3C1g. Items in other sections are logged as
  "also touched by" where their lesson reaches a bullet (`d3_003` and `d3_010` at 3A4e,
  `d1_011` at 3D5b).

## 2. Where Part 3 stands against the gate

| Section | Items | Two-form bar (gate) | Three-form target | Gap to the bar | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Internal Audit Operations | 12 | 50, not met | 75 | 38 | 20 | 9 | 10 | 0 |
| B Internal Audit Plan | 9 | 30, not met | 45 | 21 | 13 | 5 | 7 | 0 |
| C Quality of the Internal Audit Function | 10 | 30, not met | 45 | 20 | 13 | 5 | 6 | 0 |
| D Engagement Results and Monitoring | 14 | 90, not met | 135 | 76 | 24 | 11 | 12 | 0 |
| **Part 3** | **45** | **200, not met** | **300** | **155** | **70** | **30** | **35** | **0** |

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 100 as 25/15/15/45 and 33 as 8/5/5/15. F/Ap/An by section:
A 5/5/2, B 3/4/2, C 2/5/3, D 2/9/3. "Below depth" counts bullets that have items but none
at their verb's depth; zero-item bullets are counted on their own. Bullets with two items:
3A4d, 3B2c, 3C2a, 3C3d and 3D2a.)

What the counts hide:

- **Gate (a) is not met.** 30 of 70 bullets have no item. No bullet with items is below
  its depth: both apply bullets (3C1e, 3D7b) have an application or analysis item, and
  3C3d (Analyze) has two analysis items. The other judge bullet, **3D3c** (Determine: does
  the action plan reach the root cause?), has no item at all, so it is the one judge
  bullet the pilot could not reach. 40 bullets meet their depth: A 11 of 20, B 8 of 13,
  C 8 of 13, D 13 of 24.
- **Section D is furthest behind.** It holds 14 of 45 items (31%) against its 45% weight,
  11 of its 24 bullets are empty, and it carries 76 of the 155 items the two-form bar
  needs. Seven of the pilot's nine empty Section D slots were left empty because the lead
  repeated a Part 1 or Part 2 item (section 7): Part 1 and Part 2 already teach much of
  what Section D asks, from the internal auditor's seat. Part 3's distinct ground is the
  chief audit executive's seat and the order of the steps.
- **The pilot left slots empty on purpose and cut 8 drafts** (section 7 keeps the reasons).
  It kept 45 of 53 drafts (85%): A 12 of 15, B 9 of 10, C 10 of 10, D 14 of 18. Section A's
  three cuts and Section B's one were answerable by test-taking in two of their three
  reviews; Section D cut two repeats and two drafts answerable from wording.
- **No full form can be drawn yet.** 35 of the 40 bullets with items have exactly one, and
  a bullet's only item stays out of the held-back form. Only five topics hold an item that
  is not a bullet's only item (3A4, 3B2, 3C2, 3C3, 3D2); the other 13 cannot be sampled by
  the held-back form, and no section could fill its share of one (A 25, B 15, C 15, D 45).
- **Gate (b) needs about 155 more items** (A 38, B 21, C 20, D 76). At the pilot's keep rate
  (85%) that is about 180 drafts. Section 4 splits the bar by topic; the 3D3, 3D4 and 3A2
  shares are furthest behind.
- **The opened sources cannot reach some bullets, or parts of them** (section 5): job
  design and work schedules (3A2g), titles beyond the Standards' three roles (3A2c), the
  mission statement (3A3b), audit cycles (3B1g), what each emerging technology is (3B1f),
  the audit universe's parts (3B1b), and lines in Sections C and D that the notes mark
  KaiSip's reading or Sound practice. The owner decided on 25 Nov 2026 not to join The IIA,
  so members-only guides are never a source; a textbook purchase is still undecided (plan
  section 9). The Topical Requirements Application Guidance is Background, never a key
  (ruled in Part 2 round 1).
- **Topical Requirements.** Two items rest on the Cybersecurity requirement (`d2_001`,
  `d3_004`), testable now. No Part 3 item carries a future `testable_from`. A 3B1c or 3C1b
  item on Third-Party (testable from 2027-03-01), Organizational Behavior (2027-06-01) or
  Organizational Resilience (2027-10-01) carries that date and stays out of mocks, forms
  and the free sample until then (`data/cia/shared/currency.json`).
- **Part 1 and Part 2 already teach many Part 3 lessons.** Plan changes and conflicting
  demands (`cia1_d1_026`, `cia1_d1_032`, `cia1_d1_044`, `cia1_d2_078`), resource limits
  (`cia1_d1_016`, `cia1_d1_090`, `cia1_d1_103`), reliance (`cia1_d1_019`, `cia1_d1_034`),
  disagreements (`cia1_d2_013`), risk acceptance and escalation (`cia1_d3_012`,
  `cia1_d3_057`, `cia1_d3_104`, `cia1_d3_038`), root cause and cost against benefit
  (`cia1_d3_017`, `cia1_d2_048`, `cia1_d3_033`), board versions (`cia1_d2_036`), fixed
  findings (`cia1_d2_001`, `cia1_d3_063`), scope limitations (`cia1_d1_089`), the closing
  meeting (`cia2_d3_006`), supervising outside firms (`cia2_d3_004`) and technology set-up
  (`cia2_d1_014`). A Part 3 item on the same lesson is a cross-part sibling: new scenario,
  new actor or depth, new runner-up, logged (section 6).
- **Challenge tags:** 36 of 45 items carry one; `d1_002`, `d1_003`, `d1_005`, `d1_006`,
  `d1_008`, `d2_004`, `d3_004`, `d4_002` and `d4_005` carry `null` as too basic for the
  Challenge candidate. Every Part 3 topic is a Challenge topic, so new items feed the
  Challenge pool too.

## 3. The map

### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3A1a | Managing outside firms that provide internal audit services | Describe (recall) | 0 | 0/0/0 | no | zero items; not tried in the pilot. The supervision lesson is keyed in Part 2 (`cia2_d3_004`, a cosourced firm's work reviewed like staff work); a budget lead (Standard 10.1's considerations) is open (section 6) |
| 3A1b | Ways to keep watch over internal audit operations | Describe (recall) | 0 | 0/0/0 | no | zero items; not tried; thin (most monitoring tools are mays in Standard 12.1's considerations); keep apart from `d3_001` and `d3_010` |
| 3A1c | Balancing assurance work with advisory work | Describe (recall) | 1: d1_001 (B1); also touched by d2_002, d2_005 | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_044`, `cia1_d1_032`; sibling group with `d1_009` and `d1_010`; sits close to `d2_002` (not logged: section 6) |
| 3A1d | When the function's methods should be reviewed and maybe changed | Identify (recall) | 1: d1_002; also touched by d4_002 | 1/0/0 | yes | one item: cannot be held back. Its key is the training step after a revision; no item yet asks which condition warrants a review (notes 3A1.4: changes in standards, laws, technology, or the team's size or makeup) |
| 3A2a | Main steps and choices in budgeting | Outline (recall) | 1: d1_003; also touched by d1_007 | 1/0/0 | yes | one item: cannot be held back; sibling `cia1_d1_090` |
| 3A2b | Steps and choices in recruiting | Recognize (recall) | 0 | 0/0/0 | no | zero items; not tried; thin (shoulds in Standard 10.2's considerations). A hiring-block lead would repeat `d1_007`, `cia1_d1_016` and `cia1_d1_103` |
| 3A2c | Who does what on the internal audit team | Identify (recall) | 0 | 0/0/0 | no | zero items; pilot draft cut (specialists staffed away from their work: answerable by test-taking). Titles beyond the Standards' three roles are "Common usage" (no key) |
| 3A2d | Ways to train, develop and keep auditors | Describe (recall) | 1: d1_004 (B2); also touched by d1_003 | 0/1/0 | yes | one item: cannot be held back; sibling `cia1_d2_056` |
| 3A2e | How the function manages performance | Describe (recall) | 0; also touched by d1_004 | 0/0/0 | no | zero items; not tried; pay designs are keyed in `cia1_d2_056` and engagement feedback in `cia2_d3_003`, so a lead needs the function-level angle |
| 3A2f | What to think about for the technology used on engagements | Explain (recall) | 0 | 0/0/0 | no | zero items; pilot draft cut (tools never evaluated after purchase: answerable by test-taking). Training and set-up with IT and information security are keyed in `cia2_d1_014`, an unfunded tool in `cia1_d1_090`; the open must is reporting technology limits (Standard 10.3) |
| 3A2g | People techniques: coaching, mentoring, constructive feedback, rewards, job design and work schedules | Recognize (recall) | 0 | 0/0/0 | no | zero items; not tried. Job design and work schedules are KaiSip's reading (textbook); coaching rests on the Competency Framework guide (opened), mentoring and rewards on Standards 10.2 and 2.2 |
| 3A3a | How internal audit strategy backs the business strategy and risk management | Describe (recall) | 1: d1_005 | 1/0/0 | yes | one item: cannot be held back |
| 3A3b | What the mission and vision statements are for | Explain (recall) | 1: d1_006 | 1/0/0 | yes | one item: cannot be held back. Its key is the strategy's objectives beside its vision (Standard 9.2); the mission statement is "Common usage" and the strategy guide is members-only (never), so no item keys on a mission statement |
| 3A3c | Matching resource planning to the internal audit strategy | Describe (recall) | 1: d1_007 (B3) | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_016`, `cia1_d1_103` |
| 3A3d | When the strategy should be reviewed and changed | Identify (recall) | 1: d1_008 | 1/0/0 | yes | one item: cannot be held back |
| 3A4a | Why formal and informal contact with stakeholders matters | Explain (recall) | 0 | 0/0/0 | no | zero items; pilot draft cut (news the board's agreed report format leaves out: answerable by test-taking, and it taught a should as a must) |
| 3A4b | Presenting the plan, its link to strategy, and later changes | Describe (recall) | 1: d1_009 (B4); also touched by d1_001, d2_006, d2_009 | 0/1/0 | yes | one item: cannot be held back; sibling `cia1_d1_026`; sibling group with `d1_001` and `d1_010`. Near-duplicate of `d2_006` (the same urgent-change rule; not logged: section 6) |
| 3A4c | Raising independence concerns and major risk exposures | Describe (recall) | 1: d1_010 (B4) | 0/0/1 | yes | one item: cannot be held back; siblings `cia1_d1_089`, `cia1_d1_044` |
| 3A4d | Themes across engagements and a prompt overall view of risk management and control | Describe (recall) | 2: d1_011 (B4), d1_012 (B4) | 0/1/1 | yes | - (`d1_011` sibling of `cia1_d2_072`, and the item Section D's 3D5b draft repeated; `d1_012` names a possible sibling in any 3B3 item on disclosing reliance) |
| 3A4e | Sharing performance measures, quality results and plans to close gaps | Describe (recall) | 0; also touched by d3_003, d3_010 | 0/0/0 | no | zero items; not tried. Standard 8.3's must (internal results at least yearly, whatever they show) is open; keep apart from `d3_003` |

### Section B table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3B1a | How the audit universe is defined | Describe (recall) | 1: d2_003 (B5) | 0/1/0 | yes | one item: cannot be held back. The universe itself is a may (Standard 9.4's considerations); the key is the should to weigh risks that span units. Nearest `cia1_d4_036`, `cia1_d4_029`; sibling `cia1_d2_076` |
| 3B1b | The main parts of an audit universe | Identify (recall) | 0 | 0/0/0 | no | zero items; not tried; its units are "Sound practice" in the notes, and the plan guide is members-only (never) |
| 3B1c | Where Topical Requirements apply | Recognize (recall) | 1: d2_001 (B5); also touched by d3_004 | 0/0/1 | yes | one item: cannot be held back; siblings `cia1_d3_026`, `cia1_d1_046`. Items on Third-Party, Organizational Behavior or Organizational Resilience need `testable_from` |
| 3B1d | How requests from the board and management are weighed | Describe (recall) | 1: d2_002 (B5) | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_044`, `cia1_d1_026`; sits close to `d1_001` (not logged: section 6) |
| 3B1e | How relevant laws and regulatory mandates are found | Describe (recall) | 0 | 0/0/0 | no | zero items; not tried. "A low risk score does not remove a legal duty" is KaiSip's reading (no key); Standard 9.1's must and 9.4's should remain; repeat risk `cia1_d1_070` |
| 3B1f | Tracking trends, organizational change, emerging issues and technologies | Describe (recall) | 0 | 0/0/0 | no | zero items; pilot draft cut (a new AI tool between risk assessments: answerable by test-taking in two reviews, and its lesson sat next to `d2_002`). What each technology is, is "Common usage" |
| 3B1g | Why some audits must recur on a set cycle | Explain (recall) | 0 | 0/0/0 | no | zero items; blocked: audit cycles are "Common usage" and KaiSip's reading in the notes |
| 3B2a | The risk assessment method and how risks are ranked | Describe (recall) | 1: d2_004; also touched by d2_003 | 1/0/0 | yes | one item: cannot be held back; sibling `cia1_d3_013`. Scoring scales are "Common usage" (no key) |
| 3B2b | Keeping the plan in step with stakeholders and both strategies | Describe (recall) | 1: d2_005 (B6) | 0/0/1 | yes | one item: cannot be held back; nearest `cia1_d3_026`, sibling `cia1_d1_044` |
| 3B2c | Events that call for a prompt update of the plan | Recognize (recall) | 2: d2_006 (B6), d2_009 (B6); also touched by d1_009 | 1/1/0 | yes | - (`d2_006` siblings `cia1_d2_078`, `cia1_d1_026`, and near-duplicate of `d1_009`, not logged: section 6) |
| 3B3a | Who the internal and external assurance providers are | Identify (recall) | 0 | 0/0/0 | no | zero items; not tried. The provider lists are KaiSip's reading of Standard 9.5 and the 2026 Three Lines statement, so a key rests on the coordination duty, not on a list |
| 3B3b | Examples and methods of coordinating coverage | Identify (recall) | 1: d2_007 (B7) | 1/0/0 | yes | one item: cannot be held back; nearest `cia1_d3_043`. Assurance map detail sits in the members-only coordination guide (never) |
| 3B3c | Criteria for relying on another provider's work | Identify (recall) | 1: d2_008 (B7); also touched by d1_012 | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_034`, `cia1_d1_019` |

### Section C table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3C1a | The main parts of quality assurance | Recognize (recall) | 0 | 0/0/0 | no | zero items; not tried; Standards 8.3, 8.4 and 12.1 musts are open |
| 3C1b | Where Topical Requirements apply | Recognize (recall) | 1: d3_004 | 1/0/0 | yes | one item: cannot be held back; nearest `cia1_d1_061`, `cia2_d1_025` |
| 3C1c | What the program is for | Explain (recall) | 0 | 0/0/0 | no | zero items; not tried; thin: the notes' purpose line is KaiSip's reading, so a key rests on Standard 8.3 and Principle 12 only |
| 3C1d | The chief audit executive's duty to report program results to the board | Recognize (recall) | 1: d3_003 (A6); also touched by d3_007 | 0/1/0 | yes | one item: cannot be held back |
| 3C1e | Internal assessments compared with external assessments | Compare (apply) | 1: d3_001 (A6) | 0/1/0 | yes | one item: cannot be held back |
| 3C1f | What qualifies someone to be a quality assessor | Recognize (recall) | 1: d3_002 (A6) | 0/1/0 | yes | one item: cannot be held back |
| 3C1g | What ongoing monitoring and periodic self-assessments cover | Describe (recall) | 0; also touched by d3_001, d3_010 | 0/0/0 | no | zero items; not tried; Standard 12.1's musts are open |
| 3C2a | What must be reported: circumstances, actions taken, impact and reason | Identify (recall) | 2: d3_005 (A7), d3_006 (A7); also touched by d4_003 | 1/1/0 | yes | - (`d3_006` sibling of `cia1_d1_068`) |
| 3C2b | The main steps for telling senior management and the board | Describe (recall) | 1: d3_007 (A7) | 0/0/1 | yes | one item: cannot be held back; sibling `d4_003` |
| 3C3a | What key performance indicators are meant to achieve | Identify (recall) | 0 | 0/0/0 | no | zero items; not tried; Standard 12.2's musts are open |
| 3C3b | Choosing indicators, and why each needs a target | Identify (recall) | 1: d3_008 (A8) | 0/1/0 | yes | one item: cannot be held back |
| 3C3c | Why both qualitative and quantitative indicators are useful | Recognize (recall) | 0; also touched by d3_008 | 0/0/0 | no | zero items; not tried; the merit line is KaiSip's reading, so a key rests on Standard 12.2's should (targets of both kinds) |
| 3C3d | Analyzing the function's own measures | Analyze (judge) | 2: d3_009 (A8), d3_010 (A8) | 0/0/2 | yes | - (`d3_009`'s key matches a line notes 3C3.3 marks KaiSip's reading; its `_provenance` rests it on Standard 12.2's considerations and 15.2: section 7) |

### Section D table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3D1a | What the seven qualities mean in a final communication | Define (recall) | 0; also touched by d4_001 | 0/0/0 | no | zero items; not tried; Standard 11.2's considerations define each quality (opened) |
| 3D1b | Seeing those qualities applied | Recognize (recall) | 1: d4_001 (E1) | 0/1/0 | yes | one item: cannot be held back; nearest `cia1_d2_036`, `cia1_d2_069` |
| 3D1c | Effective ways of communicating | Identify (recall) | 1: d4_002 | 1/0/0 | yes | one item: cannot be held back; sibling `d1_002` |
| 3D2a | The main parts of an audit report | Describe (recall) | 2: d4_004 (E2), d4_005 | 1/1/0 | yes | - (`d4_004` near `cia1_d1_059`, `cia2_d2_014`) |
| 3D2b | When the report may say the work conformed with the Standards | Recognize (recall) | 1: d4_003 (E2) | 0/1/0 | yes | one item: cannot be held back; sibling `d3_007`; near `cia1_d1_066`, `cia2_d2_014` |
| 3D2c | When a scope limitation must be written into the report | Identify (recall) | 0; also touched by d4_004, d1_012 | 0/0/0 | no | zero items; left empty in the pilot (repeats `cia1_d1_089`) |
| 3D3a | What auditors do when they and management disagree | Recognize (recall) | 1: d4_006 (E3) | 0/0/1 | yes | one item: cannot be held back; its ordinary-dispute twin was cut as the same lesson; nearest `cia1_d2_013` |
| 3D3b | What recommendations and action plans are for, with cost against benefit | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty (repeats `cia1_d2_048`, `cia1_d3_017` and `cia1_d3_033`) |
| 3D3c | Checking that an action plan fixes the root cause | Determine (judge) | 0 | 0/0/0 | no | zero items; left empty (repeats `cia1_d3_017`). Needs an analysis item; the only judge bullet with no item |
| 3D4a | What the closing meeting is for and who attends | Describe (recall) | 0 | 0/0/0 | no | zero items; left empty (repeats `cia2_d3_006` or `cia1_d2_013`, or keys on a may only) |
| 3D4b | The chief audit executive's duty to send out the final communication | Recognize (recall) | 1: d4_008 (E4) | 0/1/0 | yes | one item: cannot be held back; logged cross-part sibling `cia2_d3_011`; near `cia1_d2_020`, `cia1_d2_082`. A delegation draft was cut (answerable by test-taking twice) |
| 3D4c | Why communication differs by audience | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty (repeats `cia1_d2_036`) |
| 3D4d | Reporting an issue management fixed before issue | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty (repeats `cia1_d2_001`, `cia1_d3_063`); "the finding stays" is KaiSip's reading, only the acknowledgment is a must (Standard 15.1) |
| 3D4e | Correcting a significant error or omission | Describe (recall) | 1: d4_007 (E4) | 0/1/0 | yes | one item: cannot be held back; nearest `cia1_d2_042` |
| 3D5a | Judging control design and effectiveness to set residual risk | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty (repeats Part 1's 1C4 items; the chief audit executive's part is a line the notes mark KaiSip's reading) |
| 3D5b | Why findings are combined and ranked | Describe (recall) | 0; also touched by d1_011 | 0/0/0 | no | zero items; draft cut (one cause behind three medium findings: repeated `d1_011`, same runner-up) |
| 3D5c | Why a rating scale shows the overall view | Describe (recall) | 1: d4_009 (E5) | 0/1/0 | yes | one item: cannot be held back; near `cia2_d2_014`, `cia1_d3_023` |
| 3D6a | How to tell whether a risk is more than the organization should accept | Recognize (recall) | 1: d4_011 (E6) | 0/1/0 | yes | one item: cannot be held back; a second lesson on delegated authority was left empty (repeats `cia1_d3_104`) |
| 3D6b | Who is told, and who does the telling | Recognize (recall) | 0; also touched by d4_010, d4_014 | 0/0/0 | no | zero items; not tried |
| 3D6c | Which step comes first, and what follows | Recognize (recall) | 1: d4_010 (E6) | 0/0/1 | yes | one item: cannot be held back; sibling `cia1_d3_038`; near `cia1_d3_057`, `cia1_d3_012` |
| 3D7a | Internal audit's duty to follow up and track | Recognize (recall) | 0; also touched by d4_012 | 0/0/0 | no | zero items; draft cut (open actions in the quarterly board report: answerable by test-taking in all three reviews) |
| 3D7b | The steps to check, then confirm, agreed actions | Distinguish (apply) | 1: d4_012 (E7) | 0/0/1 | yes | one item: cannot be held back; a 3D7 alternative-plan lead was left empty (repeats `cia1_d3_038`) |
| 3D8a | Who is told when an action is overdue or poorly done | Recognize (recall) | 1: d4_013 (E8) | 0/1/0 | yes | one item: cannot be held back; near `cia1_d2_053`, `cia1_d3_057` |
| 3D8b | The order in which the matter moves up | Recognize (recall) | 1: d4_014 (E8) | 0/1/0 | yes | one item: cannot be held back; near `cia1_d3_057`, `cia2_d3_007` |

## 4. Section totals and where the remaining items go

Every count below is a ceiling for distinct lessons, not a quota: if no distinct lesson is
left, the slot stays empty (never padding). A second item on one lesson follows the sibling
rule (plan section 3, decision 4: new scenario, new actor or depth, a different runner-up,
no shared key phrase, logged, never in one form or session; at most two per lesson and
about 15% of a section, confirmed by `cia-cross-part-reviewer`). The split by topic is
KaiSip's reading of the plan's section 4 rule (a little more for topics with more bullets
and for judge verbs, a little less where the notes show a bullet is thin).

| Section | Now | Bar | Gap | Where the items go (topic: now, then share of the bar) |
|---|---|---|---|---|
| A | 12 | 50 | 38 | 3A1: 2 of 10; 3A2: 2 of 16; 3A3: 4 of 10; 3A4: 4 of 14. First items on the nine empty bullets, 3A2 first (5 of its 7 bullets are empty and two pilot drafts there were cut), then 3A4a and 3A4e, then 3A1a and 3A1b. 3A2c and 3A2g are partly blocked (section 5), so 3A2's share is the one most likely to stay short. Then second lessons on the ten one-item bullets; 3A3 already holds its four bullets at one item each. |
| B | 9 | 30 | 21 | 3B1: 3 of 14; 3B2: 4 of 9; 3B3: 2 of 7. First items on 3B1b, 3B1e, 3B1f and 3B3a (3B1g is blocked); then second lessons. 3B1's share assumes about half of its seven bullets can take two items; with 3B1g blocked and 3B1b and 3B1f thin, it may fall short. |
| C | 10 | 30 | 20 | 3C1: 4 of 15; 3C2: 3 of 6; 3C3: 3 of 9. First items on 3C1a, 3C1g and 3C3a (all on Standards musts), then 3C1c and 3C3c (thin: keys on the Standards only, never on the KaiSip's-reading lines); then second lessons on the six one-item bullets. |
| D | 14 | 90 | 76 | 3D1: 2 of 11; 3D2: 3 of 12; 3D3: 1 of 13; 3D4: 2 of 17; 3D5: 1 of 11; 3D6: 2 of 11; 3D7: 1 of 8; 3D8: 2 of 7. An analysis item on 3D3c first; first items on 3D6b and 3D1a (not yet tried); new leads for the two cut slots (3D5b, 3D7a); then the six slots left empty as repeats, only with a lead from the chief audit executive's seat or sequence that Part 1 and Part 2 do not hold. 3D3 (judge topic) and 3D2 (apply topic) need scenario items, not definitions. |

**Difficulty by verb** is enforced per topic, by the topic verb, from 8 items; no Part 3
topic has more than 4 today. When they reach 8, 3D3 (Determine) needs at least 15% analysis
and at most 25% foundational, and 3D2 (Demonstrate) at least 40% application and at most
35% foundational; the 16 recall topics need 25 to 60% foundational and at most 25% analysis.

## 5. Gap list in priority order

Items 1 to 5 are ceilings, filled only where a distinct lesson is found; item 6 is what
unlocks the bullets the opened sources cannot reach.

1. **An analysis item on 3D3c**, the only judge bullet with no item (Determine). The
   pilot's lead repeated `cia1_d3_017` (a system rule as the recommendation). A new lead
   keys on Standard 14.4 (a should: the action deals with the risk satisfactorily under the
   organization's risk tolerance; addressing the root cause is one of the aims) and 14.3
   (root causes identified with management where possible), from the seat that judges a
   plan management wrote, never on the notes' Sound practice lines (3D3.3).
2. **Section D's other ten zero-item bullets**, as Section D carries 76 of the 155-item gap.
   Not yet tried: 3D6b and 3D1a (both on opened Standards: 11.5, and 11.2's considerations).
   Cut in the pilot, new leads only: 3D5b (repeated `d1_011`) and 3D7a (answerable by
   test-taking). Left empty as repeats, reopened only with a chief audit executive or
   sequence angle that Part 1 and Part 2 lack: 3D2c, 3D3b, 3D4a, 3D4c, 3D4d, 3D5a.
3. **Section A's nine zero-item bullets.** Not yet tried: 3A1a, 3A1b, 3A2b, 3A2e, 3A2g,
   3A4e. Cut in the pilot, new leads only: 3A2c, 3A2f, 3A4a (each answerable by test-taking;
   3A4a's also taught a should as a must). 3A2c and 3A2g are partly blocked; 3A1a, 3A2e and
   3A2f sit close to Part 1 and Part 2 keys (table below).
4. **Sections B and C's ten zero-item bullets.** Not yet tried: 3B1b, 3B1e, 3B3a, 3C1a,
   3C1c, 3C1g, 3C3a, 3C3c. Cut: 3B1f (new lead only). Blocked: 3B1g. 3C1a, 3C1g and 3C3a
   rest on Standards musts and are the likeliest to hold.
5. **Second lessons on the 35 one-item bullets** (A 10, B 7, C 6, D 12), Section D first,
   so each topic can be sampled by the held-back form. Before adding any, log or separate
   the near-duplicates found while mapping (`d1_009` with `d2_006`; `d1_001` with `d2_002`:
   section 6).
6. **A new source.** The textbook on the exam reference list (a purchase, still undecided,
   plan section 9) and the 2027 testable dates of the Third-Party (2027-03-01),
   Organizational Behavior (2027-06-01) and Organizational Resilience (2027-10-01)
   requirements. Members-only guides are never opened.

**Bullets the opened sources cannot support, or support only in part.** The opened sources
for Part 3 are the Standards (Domains III and IV, Principles 8 to 12 and 15, Standards 2.2,
3.1, 3.2, 4.1, 6.3, 13.1 and 13.3 and the glossary), the Cybersecurity requirement and the
Topical Requirements' user guides, the 2026 Three Lines statement, the Competency
Framework guide (public) and the syllabus. Guidance only, never a key: the Topical
Requirements Application Guidance (Background) and The IIA's AI Auditing Framework (read
for the notes, not in the citation library).

| Bullet | What waits | Needs |
|---|---|---|
| 3A2g | Job design and work schedules | Textbook; the position paper on staffing is "access not checked" in the citation library. Coaching (Competency Framework guide), mentoring and rewards (Standards 10.2 and 2.2) are keyable now |
| 3A2c | Team roles and titles beyond the Standards' three (internal auditor, engagement supervisor, chief audit executive) | Textbook; the Competency Framework's role profiles are benchmarks only. Items keep to the three roles |
| 3A3b | What a mission statement is for | Members-only strategy guide (never) or the textbook. `d1_006` keys only on Standard 9.2 (vision, objectives, initiatives) |
| 3A4a (detail) | Board relationship practice beyond Standards 8.1, 11.1 and 6.3 | Members-only board interaction guide (never); position paper on trust with the audit committee (access not checked). Items keep to the Standards and state should as should |
| 3B1a, 3B1b | How the audit universe is built and what its units are | Members-only risk-based plan guide, a primary reference (never), or the textbook. The universe is a may in Standard 9.4's considerations, so keys rest on 9.4's musts and shoulds |
| 3B1f | What AI, blockchain, digital assets, the internet of things and robotic process automation are and bring | Textbook ("Common usage" in the notes; the AI Auditing Framework is guidance only). Keys rest on 9.4 (spotting and rating emerging risks; timely plan updates) |
| 3B1g | Audit cycle requirements | Textbook or the members-only plan guide. No item until then |
| 3B2a (met) | Impact and likelihood scales | Textbook ("Common usage"). `d2_004` keys on Standard 9.4's required inputs |
| 3B3b (met) | Assurance maps and combined assurance in detail | Members-only coordination guide (never). Items keep to Standard 9.5 |
| 3C1c | The program's purpose in words | The notes' line is KaiSip's reading; a key rests on Standard 8.3 and Principle 12 only |
| 3C3c | The merit of each kind of indicator | The notes' line is KaiSip's reading; a key rests on Standard 12.2's should (quantitative and qualitative targets) |
| 3C3d (met) | Sorting measures into the syllabus's categories | KaiSip's reading (the Standards label only productivity and cost efficiency). `d3_009` and `d3_010` key on Standards 12.2, 12.1, 8.3 and 15.2 |
| 3D1, 3D2 (detail) | Report-writing practice beyond Standards 11.2, 11.3 and 15.1 | Members-only results-communication guides (never) |
| 3D3c, 3D3b | Testing a plan against its cause; counting costs and benefits | The notes' lines are Sound practice; keys rest on Standards 14.3 and 14.4 |
| 3D5a | Methods for design and effectiveness; the chief audit executive's part in residual risk | Sound practice and KaiSip's reading; textbook. Part 1's 1C4 items already teach inherent against residual risk |
| 3D7b, 3D8b (met) | Inquiry alone for minor actions; the factors for judging delay | KaiSip's reading. `d4_012` and `d4_014` avoided both |

**Bullets whose only lesson so far repeats an existing item.** A slot here reopens only
with a lead that answers the reason.

| Bullet | Repeats | Pilot outcome |
|---|---|---|
| 3D2c | `cia1_d1_089` (and Part 2's 2A1c item `cia2_d1_015`) | Left empty |
| 3D3b | `cia1_d2_048`, `cia1_d3_017`, `cia1_d3_033` | Left empty |
| 3D3c | `cia1_d3_017` | Left empty |
| 3D4a | `cia2_d3_006`, `cia1_d2_013` (or a may only) | Left empty |
| 3D4c | `cia1_d2_036` | Left empty |
| 3D4d | `cia1_d2_001`, `cia1_d3_063` | Left empty |
| 3D5a | Part 1's 1C4 items | Left empty |
| 3D5b | `d1_011` (Part 3 Section A) | Draft cut |
| 3D6a (second lesson) | `cia1_d3_104` | Left empty |
| 3D7 (alternative plan) | `cia1_d3_038` | Left empty |
| 3D3a (second lesson) | `d4_006` | Draft cut |
| Watch, not yet tried | 3A1a (`cia2_d3_004`), 3A2b (`d1_007`, `cia1_d1_016`, `cia1_d1_103`), 3A2e (`cia1_d2_056`, `cia2_d3_003`), 3A2f (`cia2_d1_014`, `cia1_d1_090`), 3B1e (`cia1_d1_070`), 3D6b (`cia1_d3_012`, `d4_013`), 3D7a (`cia1_d1_035`) | Leads in section 6 name the distinct angle |

Two lessons from Parts 1 and 2 apply to every slot. A thin, common-sense lesson fails the
blind test however it is rebuilt (the Part 3 pilot cut four drafts on that ground,
including "delegating authority keeps responsibility", which is general management sense),
so a lead whose key a careful non-auditor would pick is dropped, not polished. And a slot
with no distinct lesson stays empty.

## 6. Leads for first items and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. Each rests on the Part 3 notes and the
Standards; none retells a notes example. "Keep apart" names the nearest existing item, so
the new item takes a different trap (sibling rule). Leads marked **thin** risk the
common-sense cut and need a Standards distinction to survive. On a recall bullet, keep the
knowledge at the bullet's level even when the scenario asks for a choice, and name the
actor in every stem.

**Zero-item bullets (first items)**

- **3D3c Root cause (Determine; analysis).** Management's plan corrects every exception
  found and retrains the clerks, while the cause the engagement identified with management
  lies elsewhere in the process. Key: the plan does not yet deal with the risk under the
  organization's risk tolerance, so internal auditors discuss its adequacy with management,
  who revises and owns it (Standards 14.4 and 14.3). Runner-up: accept it, as every
  exception is corrected. Keep apart from `cia1_d3_017` (a recommendation that blocks the
  cause) by stage and actor: here the plan is management's, and the auditor judges it.
- **3D6b Who takes part (Recognize).** After senior management leaves the matter
  unresolved and the chief audit executive takes it to the board, a board member asks the
  chief audit executive to direct the fix. Key: the chief audit executive does not resolve
  accepted risk; the board decides how to address it with management (Standard 11.5 and its
  considerations). Runner-up: the chief audit executive sets the fix and reports back. Keep
  apart from `cia1_d3_012` (the step to the board), `d4_013` (the auditor brings the facts
  to the chief audit executive) and `d4_014`.
- **3D1a The seven qualities (Define).** A draft is right in every figure but reports only
  the failures, in loaded words. Key: it is not objective (Standard 11.2's considerations
  define each quality). Runner-up: not accurate. Keep apart from `d4_001` (complete) and
  `cia1_d2_069` (clear).
- **3D7a Duty to follow up (Recognize; thin).** The pilot's monitoring-results lead is
  retired. Lead: once the report is out, management says follow-up is its own business.
  Key: internal auditors confirm implementation under the established methodology
  (Standard 15.2). Runner-up: the next engagement in the area picks it up. Keep apart from
  `cia1_d1_035` (follow-up of management's own risk reviews as a second-line duty) and
  `d4_012`.
- **3D5b Aggregating and ranking (Describe).** The cut lead (a theme across hubs) is
  retired. A new lead keys on Standard 14.3 (findings prioritized with the chief audit
  executive's methodology, for consistency across engagements): two teams rank the same
  kind of finding differently. Runner-up: let each team keep its own scale. Keep apart from
  `d1_011` and `d4_009`.
- **3A1a Outside providers (Describe; thin).** The function is outsourced on a fixed fee,
  and the chief financial officer says no budget approval is needed. Key (a should,
  Standard 10.1's considerations): the board still approves an adequate budget, insourced
  or outsourced. Runner-up: the chief audit executive approves the fee within the contract.
  Keep apart from `cia2_d3_004` (supervising a cosourced firm) and `cia1_d1_090`.
- **3A1b Monitoring operations (Describe; thin).** The chief audit executive's monthly view
  tracks spending against budget only. Key: a method for ongoing monitoring (Standard 12.1)
  and progress against the performance objectives (Standard 12.2). Runner-up: the periodic
  self-assessment covers the rest. Keep apart from `d3_001`, `d3_010` and the 3C1g lead.
- **3A2b Recruiting (Recognize; thin).** Human resources drafts two job descriptions from
  generic grades. Key (a should, Standard 10.2's considerations): the chief audit executive
  helps write them, matched to a competency framework, and joins the interviews. Runner-up:
  human resources leads alone under personnel policy. Do not build on a hiring block
  (repeats `d1_007`, `cia1_d1_016`, `cia1_d1_103`).
- **3A2e Performance management (Describe).** Auditors' yearly ratings rest mainly on
  survey scores from the managers they audited. Key (a should, Standard 2.2's
  considerations): avoid ratings resting mainly on reviewed managers' input; supervisors'
  feedback on engagement work against agreed competencies serves instead (Standards 12.3,
  10.2). Keep apart from `cia1_d2_056` (a bonus per finding) and `cia2_d3_003` (rating one
  auditor on one engagement).
- **3A2f Technology (Explain).** The function's tools have not handled the new ERP's volume
  for a year. Key (a must, Standard 10.3): tell the board and senior management how the
  limit affects effectiveness or efficiency. Runner-up: work around it with smaller
  samples. Keep apart from `cia2_d1_014` (training and set-up with IT and information
  security, already keyed), `cia1_d1_090` and the cut draft (tools never evaluated).
- **3A2g People techniques (Recognize).** Coaching as the Competency Framework guide
  describes it: a supervisor discusses an auditor's self-assessment against target
  proficiency and agrees development actions. Runner-up: a course catalog. No key on job
  design or work schedules.
- **3A4a Formal and informal contact (Explain).** After the board's private session with
  the chief audit executive, the chief financial officer asks what was said. Key (a
  should): brief senior management unless that would be inappropriate, as when the matter
  concerns a senior manager's conduct. The key says "should" (the pilot's cut taught a
  should as a must). Keep apart from `d1_010`.
- **3A4e Quality results and measures (Describe).** Internal assessment results are clean,
  and a director suggests waiting for the external assessment. Key (a must, Standard 8.3):
  internal results go to the board at least yearly, whatever they show. Runner-up: report
  only with the external results. Keep apart from `d3_003` (what the report holds).
- **3B1e Laws and mandates (Describe; thin).** A new data-protection law. Key (a must,
  Standard 9.1): the chief audit executive understands how the organization identifies and
  manages compliance with laws and regulations, drawing on the chief compliance officer and
  board minutes (mays). Never key "a low risk score does not remove a legal duty" (KaiSip's
  reading). Keep apart from `cia1_d1_070`.
- **3B1f Emerging issues (Describe; thin).** The AI-tool lead is retired. A new lead keys on
  Standard 9.4's should (a routine for spotting and rating emerging risks) at the yearly
  assessment, not a mid-year event (that is 3B2c, `d2_006`). No key on what a technology is.
- **3B3a Who the providers are (Identify).** A hospital's infection-control unit audits the
  wards. Key: an internal assurance provider the chief audit executive must coordinate with
  (Standard 9.5). Runner-up: a management information source only. Keep apart from `d2_007`
  and `cia1_d3_043`.
- **3C1a Parts of quality assurance (Recognize).** A proposed program is a five-yearly
  external assessment and nothing else. Key: it also needs internal assessments, ongoing and
  periodic (Standards 8.3 and 12.1). Runner-up: a yearly external review. Keep apart from
  `d3_001` and `d3_002`.
- **3C1g Monitoring and self-assessment (Describe).** A function relies on supervisory
  review and drops its periodic self-assessment. Key: both are required internal
  assessments (Standard 12.1). Runner-up: the external assessment covers the gap. Keep apart
  from the 3C1a lead (one per mock) and `d3_010`.
- **3C3a What indicators achieve (Identify).** The chief audit executive sets performance
  objectives alone, to protect independence. Key: they consider the board's and senior
  management's input (Standard 12.2); the board's yearly approval is an essential condition
  for the board, not a requirement on internal audit. Keep apart from `d3_008`.
- **3C1c, 3C3c, 3B1b (thin).** Key only on the Standards (8.3 and Principle 12; 12.2's
  should on both kinds of target; 9.4's musts), never on a KaiSip's-reading or Sound
  practice line. Leave empty if no Standards distinction appears.

**Second lessons (one-item bullets).** None was written in the pilot. 3A1d's missing half
(which condition warrants a review of the methodologies, notes 3A1.4) is the clearest; each
other second lesson follows the sibling rule and keeps apart from the items logged below.

**Siblings logged in the pilot** (each item's `_provenance`; keep apart in one mock):

- **Inside Part 3:** `d1_001`, `d1_009` and `d1_010` form one group (significant plan
  changes under Standard 9.4; at most two in one mock); `d4_002` with `d1_002` (training on
  methodologies); `d4_003` with `d3_007` (one engagement's gap against a function-wide gap);
  `d1_012` names a possible sibling in any 3B3 item on disclosing reliance in a wider
  conclusion.
- **Section A, cross-part:** `d1_001` with `cia1_d1_044` and `cia1_d1_032`; `d1_003` with
  `cia1_d1_090`; `d1_004` with `cia1_d2_056`; `d1_007` with `cia1_d1_016` and
  `cia1_d1_103`; `d1_009` with `cia1_d1_026`; `d1_010` with `cia1_d1_089` and
  `cia1_d1_044`; `d1_011` with `cia1_d2_072`.
- **Section B, cross-part:** `d2_001` with `cia1_d3_026` and `cia1_d1_046`; `d2_002` with
  `cia1_d1_044` and `cia1_d1_026`; `d2_003` near `cia1_d4_036` and `cia1_d4_029`, sibling
  `cia1_d2_076`; `d2_004` with `cia1_d3_013`; `d2_005` near `cia1_d3_026`, sibling
  `cia1_d1_044` (its fix pass removed the repeat of `cia1_d1_016` and `cia1_d1_103`);
  `d2_006` with `cia1_d2_078` and `cia1_d1_026`; `d2_007` near `cia1_d3_043`; `d2_008` with
  `cia1_d1_034` and `cia1_d1_019`; `d2_009` near `cia1_d1_026`.
- **Section C, cross-part:** `d3_004` near `cia1_d1_061` and `cia2_d1_025`; `d3_006` with
  `cia1_d1_068`. The other eight Section C items log no sibling.
- **Section D, cross-part:** `d4_001` near `cia1_d2_036` and `cia1_d2_069`; `d4_003` near
  `cia1_d1_066` and `cia2_d2_014`; `d4_004` near `cia1_d1_059` and `cia2_d2_014`; `d4_005`
  names `cia1_d1_035` as a different lesson; `d4_006` near `cia1_d2_013`; `d4_007` near
  `cia1_d2_042`; `d4_008` with `cia2_d3_011` (the cross-part sibling Part 2's map logged
  against 3D4b), near `cia1_d2_020` and `cia1_d2_082`; `d4_009` near `cia2_d2_014`, apart
  from `cia1_d3_023`; `d4_010` near `cia1_d3_057` and `cia1_d3_012`, sibling `cia1_d3_038`;
  `d4_011` near `cia1_d3_031`, `cia1_d3_104` and `cia1_d3_076`; `d4_012` near
  `cia1_d1_035`; `d4_013` apart from `cia1_d2_053`, near `cia1_d3_057`; `d4_014` near
  `cia1_d3_057` and `cia2_d3_007`.

**Found while mapping, not logged** (for `cia-cross-part-reviewer`; no item was changed):

- `d1_009` (Section A) and `d2_006` (Section B) key the same rule, inform the board now and
  seek formal approval soon after, for an urgent significant change between board meetings,
  with the same wrong patterns (wait for the meeting, tell at year end, an executive
  approves). Neither logs the other. Log them as siblings and keep them out of one form, or
  replace one with a distinct lesson.
- `d1_001` (advice inside the plan's reserve: use it and report routinely) and `d2_002` (a
  request the reserve would cover: weigh risk and benefit first) share a scenario and
  differ in step. Log them as siblings.
- `d1_012` logs a possible 3B3 sibling on disclosing reliance; `d2_008` carries that
  disclosure as a wrong option and does not log `d1_012`. Log the pair.

## 7. What the pilot taught

**Left empty on purpose, or cut, in the pilot (25 Nov 2026).** From each file's `_meta`;
reopen a slot only with a new lead that answers the reason. The pilot kept 45 of 53 drafts.

| Section | Slot | What happened | Reason |
|---|---|---|---|
| A | 3A2c (specialists staffed away from their work) | Draft cut | Answerable by test-taking in two of its three reviews, after the fix pass |
| A | 3A2f (tools never evaluated after purchase) | Draft cut | Answerable by test-taking in two of its three reviews, after the fix pass |
| A | 3A4a (news the board's agreed report format leaves out) | Draft cut | Answerable by test-taking in two of its three reviews, after the fix pass, and it taught a should as a must |
| B | 3B1f (a new AI tool between risk assessments) | Draft cut | Two reviews classed it answerable by test-taking alone, and its lesson sat next to `d2_002`'s |
| C | None | All 10 drafts kept | No slot left empty in the file's `_meta` |
| D | 3D3a (an ordinary dispute over a finding) | Draft cut | The same rule and wrong patterns as `d4_006`, which carries the must |
| D | 3D5b (one cause behind three medium findings) | Draft cut | Repeated Section A's `d1_011`, with the same runner-up |
| D | 3D4b (approval delegated to an audit manager) | Draft cut | Answerable by test-taking in the first blind test and again after its rewrite: delegating authority but not responsibility is general management sense |
| D | 3D7a (open actions in the quarterly board report) | Draft cut | Classed test-taking in all three reviews |
| D | 3D3c (root cause) | Left empty | Its lead repeated `cia1_d3_017` |
| D | 3D3b (cost against benefit) | Left empty | `cia1_d2_048`, `cia1_d3_017` and `cia1_d3_033` already teach it |
| D | 3D6a (second lesson, delegated authority) | Left empty | Repeated `cia1_d3_104` |
| D | 3D7 (alternative plan) | Left empty | Repeated `cia1_d3_038` |
| D | 3D2c (scope limitations) | Left empty | Repeated `cia1_d1_089` |
| D | 3D4a (the closing meeting) | Left empty | Repeated `cia2_d3_006` or `cia1_d2_013`, or rested on a may only |
| D | 3D4c (audiences) | Left empty | Repeated `cia1_d2_036` |
| D | 3D4d (a finding already fixed) | Left empty | Repeated `cia1_d2_001` and `cia1_d3_063` |
| D | 3D5a (residual risk) | Left empty | Part 1's 1C4 items teach it, and the chief audit executive's part is a line the notes mark KaiSip's reading |

- **What Section A taught.** A fix pass does not rescue a draft whose key a test-taker can
  find from the wording: all three cuts were still answerable that way in two of their
  three reviews, so a lead that needs rewording to survive is dropped, not polished. Keep
  must and should apart in the key: a should keyed as a must also cost the 3A4a draft.
- **What Section B taught.** Two items on one bullet's neighbors can share a lesson
  without sharing a bullet (the AI-tool draft sat next to `d2_002`), and Section B's plan
  items sit close to Section A's (`d1_009` and `d2_006`, section 6). Check across sections
  in the scaffold step, not only within one.
- **What Section C taught.** Section C kept all ten drafts, and 3C3d reached depth with two
  analysis items. Watch one key: `d3_009` (action plans completed with the intended result
  reflect management's follow-through as well as internal audit's) matches a line notes
  3C3.3 marks KaiSip's reading; its `_provenance` rests it on Standard 12.2's
  considerations and 15.2, and it passed its Standards audit. A later audit should confirm
  the key holds on the Standards alone.
- **What Section D taught.** Two of four cuts repeated another item (one in Section D, one
  in Section A), and seven of nine empty slots repeated a Part 1 or Part 2 item. Section D's
  syllabus overlaps Part 1's communication, risk acceptance and control lessons and Part 2's
  communication lessons, so its distinct ground is the chief audit executive's seat and the
  order of the steps: the items that held turn on who acts next (`d4_010`, `d4_013`,
  `d4_014`) or on what the chief audit executive must do with a report (`d4_007`,
  `d4_008`). Leads that rest on a general management idea (delegation keeps
  responsibility) fail the blind test.
- **The opened sources thin out fastest in Section D**, the section with the largest gap
  (76). The pilot cannot yet say how many distinct Section D lessons remain; the next round
  should report it, as Part 2's round 3 did for its Section A.
- **Notes coverage.** 38 of the 63 notes sub-topics have an item (`check_cia.py --coverage`).
  Uncovered: A 3A1.1, 3A1.2, 3A2.2, 3A2.4, 3A4.1; B 3B1.3, 3B3.1; C 3C3.1; D 3D1.2, 3D1.3,
  3D2.2, 3D2.4, 3D3.1, 3D3.2, 3D3.3, 3D4.1, 3D4.3, 3D5.1, 3D5.2, 3D6.2, 3D7.1, 3D7.3,
  3D8.3.
- **Pick-the-longest after the pilot:** A 16.7% (12 items), B 22.2% (9), C 20.0% (10), D
  21.4% (14) (`check_cia.py`). It enforces 15 to 24% from 40 items per section; keep key
  lengths varied as each section grows. Keys by letter: A 3/3/3/3, B 2/3/2/2, C 3/2/3/2,
  D 3/3/4/4.
- **Re-run this map after each round**: set each new item's bullet in the scaffold step,
  before it is written, and log every sibling across sections, not only within one.
