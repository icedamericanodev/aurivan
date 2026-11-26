# CIA Part 3: syllabus bullet coverage map

Built 25 Nov 2026, after the Part 3 pilot, re-run the same day after Part 3 round 1, and
re-run on 26 Nov 2026 after Part 3 round 2 (3B1f on the Knowledge sources) and after the
Third-Party items written ahead (3B1c and 3C1b, testable from 2027-03-01), to measure Part 3 against the sale gate (`docs/content/CIA_BANK_PLAN.md`, section 3, decision
4, revised in round 14): (a) every syllabus bullet tested at its verb's depth with every
gate passing; (b) two full exam-weighted forms of distinct items per section (Part 3 is 100
questions as A 25, B 15, C 15, D 45, so A 50, B 30, C 30, D 90); (c) one full form frozen
and held back, and a short mock drawn per learner from unseen items; a bullet's only item
is never held back. Three forms (Part 3 about 300: A 75, B 45, C 45, D 135) stay the target
as sources open.

Source: the opened Part 3 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026; each bullet's
leading verb re-read in it on 25 Nov 2026, and again for round 1's bullets). The "Covers"
column is the blueprint's own wording (`docs/content/CIA_BLUEPRINT.md`), not The IIA's; the
verb is the bullet's own leading word, not the topic's. Bank: all 66 live items in
`data/cia/cia3/originals/d1.json` to `d4.json` as of the Third-Party items written ahead
(A 17, B 15, C 15, D 19; three of them dated 2027-03-01;
`d1_009` was retired in the cross-part review and replaced by `d1_018`, and is left out).
The pilot wrote 53 drafts and cut 8 (A 3, B 1, D 4); round 1 wrote 20 and cut 5 (A 1, C 1,
D 3); round 2 wrote 3 and cut none; the Third-Party items written ahead wrote 3 and cut
none; each cut renumbered the later items. The map follows the files' `_meta`
and each item's `_provenance`, not the drafts. This is an internal working document; it
holds no item text. No prep provider was opened for it.

## 1. How the map was made

- **One primary bullet per item**, read from the stem, the key and the explanation. Every
  round 1 item's `_provenance` names its bullet; the pilot's Sections A to C items name only
  a notes sub-topic, so their bullet was set here. A plain second bullet is listed as "also
  touched by"; it does not count toward that bullet.
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
- **Round 1 mapping calls.** `d1_013` (a first outside provider) sits at 3A1a, the bullet
  its `_provenance` names, though its key is that the provider is a change the
  methodologies must cover (Standard 9.3); it is also touched by 3A1d. `d1_014` (a monitoring
  dashboard silent on conformance) sits at 3A1b and `d3_012` (dropping the periodic
  self-assessment) at 3C1g; each touches the other's bullet, and the two are logged as
  mirror siblings. `d1_016` (a quality report silent on the audit law) sits at 3A4e, also
  touched by 3C1d. `d4_017` (management's own action plans are followed up too) sits at
  3D7a, also touched by 3D7b. All 15 round 1 items sit on recall bullets except `d4_015`
  (3D3c, Determine), which is an analysis item, so every round 1 item meets its bullet's
  depth.
- **Round 2 mapping calls.** All three items sit at 3B1f, the bullet each `_provenance`
  names: `d2_011` (a blockchain record of origin) and `d2_012` (networked sensors and a
  clean control test) are foundational, `d2_013` (an AI engine trained on data without
  names) is an application item; 3B1f is a recall bullet, so all three meet its depth. Each
  keys a fact its first-cited NIST section states (library rule 2b), and the chief audit
  executive's re-rating rests on Standard 9.4. None touches a second bullet.

## 2. Where Part 3 stands against the gate

| Section | Items | Two-form bar (gate) | Three-form target | Gap to the bar | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Internal Audit Operations | 17 | 50, not met | 75 | 33 | 20 | 5 | 13 | 0 |
| B Internal Audit Plan | 15 (2 dated) | 30, not met | 45 | 15 (17 today) | 13 | 3 | 7 (8 today) | 0 |
| C Quality of the Internal Audit Function | 15 (1 dated) | 30, not met | 45 | 15 (16 today) | 13 | 2 | 7 (8 today) | 0 |
| D Engagement Results and Monitoring | 19 | 90, not met | 135 | 71 | 24 | 8 | 13 | 0 |
| **Part 3** | **66 (3 dated)** | **200, not met** | **300** | **134 (137 today)** | **70** | **18** | **40 (42 today)** | **0** |

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 100 as 25/15/15/45 and 33 as 8/5/5/15. F/Ap/An by section:
A 7/8/2 (the retired `d1_009` was an application item, its replacement `d1_018` is
foundational), B 6/7/2, C 4/8/3, D 4/11/4. "Below depth" counts bullets that have items but
none at their verb's depth; zero-item bullets are counted on their own. Bullets with two
items: 3A2a, 3A4d, 3B2c, 3C1f, 3C2a, 3C3d, 3D2a, 3D2b and 3D4e, and from 1 Mar 2027 3C1b.
3B1f has three (round 2); 3B1c has three from 1 Mar 2027.)

**"Dated" and "today".** The three Third-Party items written ahead (`d2_014`, `d2_015`,
`d3_015`) carry `testable_from` 2027-03-01: until then they stay out of the held-back form,
the short mock, the per-learner draw and the free sample, and do not count toward the gate.
The plain figures count them (what the bank holds from 1 Mar 2027); "today" counts only items
testable now. Until that date 3B1c and 3C1b each keep one testable item, `d2_001` and
`d3_004`, which cannot be held back.

What the counts hide:

- **Gate (a) is not met.** 18 of 70 bullets have no item (19 after round 1, 30 after the
  pilot). No bullet with items is below its depth, and both judge bullets now reach it:
  3C3d (Analyze) has two analysis items and **3D3c** (Determine) has its first, `d4_015`.
  Both apply bullets (3C1e, 3D7b) have an application or analysis item. 52 bullets meet
  their depth: A 15 of 20, B 10 of 13, C 11 of 13, D 16 of 24.
- **Every zero-item bullet has now been tried.** Round 1 filled 11 of the pilot's 30 empty
  bullets (3A1a, 3A1b, 3A2b, 3A4e, 3B1e, 3C1a, 3C1g, 3C3a, 3D1a, 3D3c, 3D7a) and added
  second lessons on four (3A2a, 3C1f, 3D2b, 3D4e). Round 2 filled **3B1f** with three items
  on the NIST Knowledge sources (K9, K10, K12, K13). The other 18 were tried in the pilot or
  round 1 and left empty or cut, each for a recorded reason (sections 3 and 7). None has an
  open lead the map can name; each reopens only with a new lead that answers its reason, or
  a new source. No listed Knowledge source reaches any of them (section 6).
- **Round 2 kept 3 of 3 drafts**, all on 3B1f, and left three 3B1f slots empty (section 7).
  **The Third-Party items written ahead kept 3 of 3** (`d2_014` and `d2_015` on 3B1c,
  `d3_015` on 3C1b), all dated 2027-03-01, and left a second 3C1b slot and the other 3B1c
  leads empty as repeats (section 7). They brought no bullet to depth (both were already at
  it). With the pilot and rounds 1 and 2, Part 3 has kept 66 of 79 drafts (84%).
- **Section D is furthest behind.** It holds 19 of 60 items (32%) against its 45% weight,
  8 of its 24 bullets are empty, and it carries 71 of the 140 items the two-form bar needs.
  All three Section D cuts in round 1 repeated a Part 1 or Part 2 item, and most of its
  empty slots repeat one too. Round 1's authors judged that only a few distinct Section D
  lessons remain in the opened sources: Part 1 and Part 2 already teach much of what
  Section D asks, from the internal auditor's seat, and Part 3's distinct ground (the chief
  audit executive's seat and the order of the steps) is largely spent.
- **Round 1 kept 15 of 20 drafts (75%)**: A 5 of 6, B 1 of 1, C 4 of 5, D 5 of 8. With the
  pilot, Part 3 has kept 60 of 73 drafts (82%). The A and C cuts were still answerable from
  the options after the fix pass; the three D cuts repeated Part 1 or Part 2 items.
- **No full form can be drawn yet.** 42 of the 52 bullets with items have exactly one
  testable item today (40 from 1 Mar 2027, when 3B1c and 3C1b gain their dated items), and
  a bullet's only item stays out of the held-back form. Nine topics hold an item that is
  not a bullet's only item (3A2, 3A4, 3B1 since round 2, 3B2, 3C1, 3C2, 3C3, 3D2, 3D4); the
  other nine cannot be sampled by the held-back form, and no section could fill its share
  of one (A 25, B 15, C 15, D 45).
- **Gate (b) needs about 137 more items today, 134 from 1 Mar 2027** (A 33, B 17 then 15,
  C 16 then 15, D 71). The limit is distinct
  lessons, not drafting: round 1 found far fewer than its slots, and round 2's three items
  came only because the owner allowed free Knowledge sources, which reach 3B1 alone in
  Part 3 (section 7). Section 4 splits the bar by topic; the 3D4,
  3A2, 3D3 and 3D5 shares are furthest behind (14, 12, 11 and 10 short).
- **The opened sources cannot reach some bullets, or parts of them** (section 5): job
  design and work schedules (3A2g), titles beyond the Standards' three roles (3A2c), the
  mission statement (3A3b), audit cycles (3B1g), robotic process automation (3B1f; AI,
  blockchain, tokens and connected devices now rest on Knowledge sources K9 to K13), the
  audit universe's parts (3B1b), and lines in Sections C and D that the notes mark KaiSip's
  reading or Sound practice. The owner decided on 25 Nov 2026 not to join The IIA, so
  members-only guides are never a source; the textbook is on hold (owner, 26 Nov 2026, plan
  section 9). The Topical Requirements Application Guidance is Background, never a key
  (ruled in Part 2 round 1).
- **Topical Requirements.** Two items rest on the Cybersecurity requirement (`d2_001`,
  `d3_004`), testable now. Three rest on the Third-Party requirement and carry
  `testable_from` 2027-03-01 (`d2_014`, `d2_015`, `d3_015`, written ahead on 26 Nov 2026),
  as do their Challenge copies; they stay out of mocks, forms and the free sample until then
  (`data/cia/shared/currency.json`). An item on Organizational Behavior (2027-06-01) or
  Organizational Resilience (2027-10-01) would carry that date the same way, but Part 3's
  two Topical Requirement bullets now hold the applicability, prioritization and
  conformance-evidence lessons, so a further requirement is likely to repeat them here
  (section 6).
- **Part 1 and Part 2 already teach many Part 3 lessons.** Plan changes and conflicting
  demands (`cia1_d1_026`, `cia1_d1_032`, `cia1_d1_044`, `cia1_d2_078`), resource limits
  (`cia1_d1_016`, `cia1_d1_090`, `cia1_d1_103`), reliance (`cia1_d1_019`, `cia1_d1_034`),
  disagreements (`cia1_d2_013`), risk acceptance and escalation (`cia1_d3_012`,
  `cia1_d3_048`, `cia1_d3_057`, `cia1_d3_104`, `cia1_d3_038`), root cause and cost against
  benefit (`cia1_d3_017`, `cia1_d2_048`, `cia1_d2_084`, `cia1_d3_033`), ranking findings
  (`cia2_d2_011`), board versions (`cia1_d2_036`), fixed findings (`cia1_d2_001`,
  `cia1_d3_063`), scope limitations (`cia1_d1_089`), the closing meeting (`cia2_d3_006`),
  supervising outside firms (`cia2_d3_004`), technology set-up (`cia2_d1_014`), pay and
  feedback (`cia1_d2_056`, `cia1_d2_060`), the board's private session (`cia1_d1_073`) and
  informal contact (`cia1_d2_037`). A Part 3 item on the same lesson is a cross-part
  sibling: new scenario, new actor or depth, new runner-up, logged (section 6).
- **Challenge tags:** 55 of 66 items carry one (the Third-Party items: `d2_014` and
  `d2_015` serve B5, `d3_015` A6, each Challenge copy dated 2027-03-01; round 2's three all
  serve B5). The Challenge pack holds 213 items, six of them dated (three from Part 2's
  Section A in its Section C, two in Section B, one in Section A); its Section B holds 26,
  24 testable today, against a full mock's 23. It still supports no full mock, as Section E,
  fed by Part 3's Section D, holds 15 of the 30 a mock needs; `d1_002`, `d1_003`, `d1_005`, `d1_006`,
  `d1_008`, `d2_004`, `d3_004`, `d4_002`, `d4_005`, `d4_016` and `d4_017` carry `null` as
  too basic for the Challenge candidate. Every Part 3 topic is a Challenge topic, so new
  items feed the Challenge pool too.

## 3. The map

Round 1 items and outcomes are marked "R1", round 2's "R2"; the pilot's are unmarked or
marked "pilot".

### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3A1a | Managing outside firms that provide internal audit services | Describe (recall) | 1: d1_013 (B1, R1) | 0/1/0 | yes | one item: cannot be held back. Key: a first provider is a change the methodologies must cover (Standard 9.3); runner-up: the contract moves responsibility for quality to the provider. Siblings `d1_002` (keep apart in one mock) and `cia2_d3_004`. The pilot's budget lead (an outsourced fee still needs the board's budget approval) is unused and now sits next to `d1_017` |
| 3A1b | Ways to keep watch over internal audit operations | Describe (recall) | 1: d1_014 (B1, R1); also touched by d3_012 | 0/1/0 | yes | one item: cannot be held back. Key: ongoing monitoring covers conformance (Standard 12.1). Mirror sibling `d3_012` (keep apart in one mock); nearest `d3_001`, `d3_010` |
| 3A1c | Balancing assurance work with advisory work | Describe (recall) | 1: d1_001 (B1); also touched by d2_002, d2_005 | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_044`, `cia1_d1_032`; sibling group with `d1_009` and `d1_010`; sibling of `d2_002` (now logged in both) |
| 3A1d | When the function's methods should be reviewed and maybe changed | Identify (recall) | 1: d1_002; also touched by d1_013, d4_002 | 1/0/0 | yes | one item: cannot be held back. Its key is the training step after a revision; no item yet asks which condition warrants a review (notes 3A1.4: changes in standards, laws, technology, or the team's size or makeup). Not written in round 1 |
| 3A2a | Main steps and choices in budgeting | Outline (recall) | 2: d1_003, d1_017 (B2, R1); also touched by d1_007 | 2/0/0 | yes | - (R1 second lesson `d1_017`: the organization's budget process is followed and the board still approves, Standard 10.1; keep apart from `d1_003`; siblings `cia1_d1_090`, `cia1_d1_016`) |
| 3A2b | Steps and choices in recruiting | Recognize (recall) | 1: d1_015 (B2, R1) | 0/1/0 | yes | one item: cannot be held back. Key: the chief audit executive shapes the job descriptions with human resources and takes part in hiring (Standard 10.2's considerations, a should). Nearest `d1_007`, `d1_004`; no hiring block, so apart from `cia1_d1_016`, `cia1_d1_103` |
| 3A2c | Who does what on the internal audit team | Identify (recall) | 0 | 0/0/0 | no | zero items. Pilot draft cut (specialists staffed away from their work: answerable by test-taking). R1 left empty: titles beyond the Standards' three roles are "Common usage", and no new lead answers the pilot's cut |
| 3A2d | Ways to train, develop and keep auditors | Describe (recall) | 1: d1_004 (B2); also touched by d1_003 | 0/1/0 | yes | one item: cannot be held back; sibling `cia1_d2_056` |
| 3A2e | How the function manages performance | Describe (recall) | 0; also touched by d1_004 | 0/0/0 | no | zero items. R1 left empty: `cia1_d2_056` keys pay per finding and names ratings from audited managers, `cia1_d2_060` keeps survey feedback as a coaching input, and the remaining evaluation duty is `d1_004`'s key |
| 3A2f | What to think about for the technology used on engagements | Explain (recall) | 0 | 0/0/0 | no | zero items; cut twice. Pilot draft cut (tools never evaluated after purchase: answerable by test-taking). R1 draft cut (audit software that cannot read a new system, keyed on Standard 10.3's must to report the limit: the options alone still gave the key after the fix pass). Training and set-up are keyed in `cia2_d1_014`, an unfunded tool in `cia1_d1_090` |
| 3A2g | People techniques: coaching, mentoring, constructive feedback, rewards, job design and work schedules | Recognize (recall) | 0 | 0/0/0 | no | zero items. R1 left empty: job design and work schedules are blocked; mentoring is not required, which `d1_004` teaches; coaching is a definition the blind test would find by common sense; rewards repeat `cia1_d2_056` |
| 3A3a | How internal audit strategy backs the business strategy and risk management | Describe (recall) | 1: d1_005 | 1/0/0 | yes | one item: cannot be held back |
| 3A3b | What the mission and vision statements are for | Explain (recall) | 1: d1_006 | 1/0/0 | yes | one item: cannot be held back. Its key is the strategy's objectives beside its vision (Standard 9.2); the mission statement is "Common usage" and the strategy guide is members-only (never), so no item keys on a mission statement |
| 3A3c | Matching resource planning to the internal audit strategy | Describe (recall) | 1: d1_007 (B3) | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_016`, `cia1_d1_103` |
| 3A3d | When the strategy should be reviewed and changed | Identify (recall) | 1: d1_008 | 1/0/0 | yes | one item: cannot be held back |
| 3A4a | Why formal and informal contact with stakeholders matters | Explain (recall) | 0 | 0/0/0 | no | zero items. Pilot draft cut (news the board's agreed report format leaves out: answerable by test-taking, and it taught a should as a must). R1 left empty: the private-session lead repeats `cia1_d1_073`, informal contact repeats `cia1_d2_037`, and coordinating board reporting with senior management sits next to `cia1_d1_019` |
| 3A4b | Presenting the plan, its link to strategy, and later changes | Describe (recall) | 1: d1_018 (B4); also touched by d1_001, d2_006, d2_009 | 1/0/0 | yes | one item: cannot be held back. Key: the presented plan names the human, financial and technological resources it needs (Standard 9.4). It replaced `d1_009` (the urgent-change rule), retired in the cross-part review as a repeat of `d2_006`; the sibling logs below that name `d1_009` are history |
| 3A4c | Raising independence concerns and major risk exposures | Describe (recall) | 1: d1_010 (B4) | 0/0/1 | yes | one item: cannot be held back; siblings `cia1_d1_089`, `cia1_d1_044` |
| 3A4d | Themes across engagements and a prompt overall view of risk management and control | Describe (recall) | 2: d1_011 (B4), d1_012 (B4) | 0/1/1 | yes | - (`d1_011` sibling of `cia1_d2_072`, and the item Section D's pilot 3D5b draft repeated; `d1_012` names a possible sibling in any 3B3 item on disclosing reliance) |
| 3A4e | Sharing performance measures, quality results and plans to close gaps | Describe (recall) | 1: d1_016 (B4, R1); also touched by d3_003, d3_010 | 0/1/0 | yes | one item: cannot be held back. Key: the quality report also covers compliance with laws relevant to internal auditing (Standard 8.3); also touches 3C1d. Sibling `d3_003` (keep apart in one mock). The pilot's lead (internal results to the board at least yearly, whatever they show) is unused |

### Section B table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3B1a | How the audit universe is defined | Describe (recall) | 1: d2_003 (B5) | 0/1/0 | yes | one item: cannot be held back. The universe itself is a may (Standard 9.4's considerations); the key is the should to weigh risks that span units. Nearest `cia1_d4_036`, `cia1_d4_029`; sibling `cia1_d2_076` |
| 3B1b | The main parts of an audit universe | Identify (recall) | 0 | 0/0/0 | no | zero items. R1 left empty: the units are a may in Standard 9.4's considerations and Sound practice in the notes; the only must angle (the coverage areas the plan must consider) repeats `cia1_d3_026`. The plan guide is members-only (never) |
| 3B1c | Where Topical Requirements apply | Recognize (recall) | 3: d2_001 (B5), d2_014 (B5, dated 2027-03-01), d2_015 (B5, dated 2027-03-01); also touched by d3_004 | 1/1/1 | yes | one testable item until 1 Mar 2027: cannot be held back before then. Written ahead on the Third-Party requirement: `d2_014`, an intragroup service provider is outside the requirement, per its user guide (the requirement's own list stops at regulators, agents, trustees or board members and employees), unless the organization defines third parties more widely; runner-up a vendor's subcontractor, which is inside (`cia2_d1_043`'s key: keep apart in one Challenge mock). `d2_015`, the reassuring key (round 2's lesson): controls work on the vendors the risk ranking prioritizes can conform, shared across engagements; siblings `d2_001`, `cia2_d1_025`, `d3_015`. Siblings of `d2_001`: `cia1_d3_026`, `cia1_d1_046`. Third-Party lessons here: spent (a competency shortfall, a requested topic, advisory conformance, accountability kept, a downstream subcontractor and coverage recorded in the plan each repeat an item: section 6) |
| 3B1d | How requests from the board and management are weighed | Describe (recall) | 1: d2_002 (B5) | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_044`, `cia1_d1_026`; sibling of `d1_001` (now logged in both) |
| 3B1e | How relevant laws and regulatory mandates are found | Describe (recall) | 1: d2_010 (B5, R1) | 0/1/0 | yes | one item: cannot be held back. Key on Standard 9.1's must (understand how the organization identifies and manages compliance), never on the notes' KaiSip's-reading line about low risk scores. Nearest `cia1_d1_070` (engagement level) and `d2_004` (keep apart in one mock) |
| 3B1f | Tracking trends, organizational change, emerging issues and technologies | Describe (recall) | 3: d2_011 (B5, R2), d2_012 (B5, R2), d2_013 (B5, R2) | 2/1/0 | yes | - (R2, on Knowledge sources. `d2_011`: a permissioned blockchain guards entries once published, not their truth at entry (NIST IR 8202 7.3); runner-up a later change by a member's own staff (7.1, tamper evident, not strictly immutable). `d2_012`: a clean patch-and-password test does not show that networked devices are covered (SP 800-213 2.3, IR 8259 Rev. 1); runner-up the clean test itself. `d2_013`: removing names helps privacy, but AI can still infer identity (AI 100-1 3.6); runner-up "no longer personal". Each re-rating rests on Standard 9.4. `d2_012` and `d2_013` share a frame (management vouches for a low rating): keep apart in one mock. Pilot cut (a new AI tool between risk assessments) and R1's empty slot stay history. Still empty: robotic process automation (no source), tokens and wallets (IR 8301, not written), a second AI lesson (repeats)) |
| 3B1g | Why some audits must recur on a set cycle | Explain (recall) | 0 | 0/0/0 | no | zero items; blocked: audit cycles are "Common usage" and KaiSip's reading in the notes. R1 left empty |
| 3B2a | The risk assessment method and how risks are ranked | Describe (recall) | 1: d2_004; also touched by d2_003 | 1/0/0 | yes | one item: cannot be held back; sibling `cia1_d3_013`. Scoring scales are "Common usage" (no key) |
| 3B2b | Keeping the plan in step with stakeholders and both strategies | Describe (recall) | 1: d2_005 (B6) | 0/0/1 | yes | one item: cannot be held back; nearest `cia1_d3_026`, sibling `cia1_d1_044` |
| 3B2c | Events that call for a prompt update of the plan | Recognize (recall) | 2: d2_006 (B6), d2_009 (B6); also touched by d1_009 | 1/1/0 | yes | - (`d2_006` siblings `cia1_d2_078`, `cia1_d1_026` and `d1_009`, now logged in both) |
| 3B3a | Who the internal and external assurance providers are | Identify (recall) | 0 | 0/0/0 | no | zero items. R1 left empty: who counts as a provider rests on lists the notes mark KaiSip's reading, and the coordination duty is keyed in `cia1_d3_043`, `cia1_d1_022` and `cia1_d1_019` |
| 3B3b | Examples and methods of coordinating coverage | Identify (recall) | 1: d2_007 (B7) | 1/0/0 | yes | one item: cannot be held back; nearest `cia1_d3_043`. Assurance map detail sits in the members-only coordination guide (never) |
| 3B3c | Criteria for relying on another provider's work | Identify (recall) | 1: d2_008 (B7); also touched by d1_012 | 0/1/0 | yes | one item: cannot be held back; siblings `cia1_d1_034`, `cia1_d1_019`; pair with `d1_012` not yet logged (section 6) |

### Section C table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3C1a | The main parts of quality assurance | Recognize (recall) | 1: d3_011 (A6, R1) | 0/1/0 | yes | one item: cannot be held back. Key: internal assessments are documented and included in the external evaluation (Standard 12.1). Nearest `d3_001` (its runner-up is eliminated here), `d3_003`. The pilot's lead (a program of external assessments only) is unused and sits next to `d3_012` |
| 3C1b | Where Topical Requirements apply | Recognize (recall) | 2: d3_004, d3_015 (A6, dated 2027-03-01) | 1/1/0 | yes | one testable item until 1 Mar 2027: cannot be held back before then. `d3_015`, written ahead: a self-assessment judges conformance with the Third-Party requirement from the kept evidence of each requirement's applicability and any exclusion's reason (Standards 12.1 and 8.3); kept on Third-Party because a Cybersecurity version would repeat `d3_004`; its option A falls to the same user-guide paragraph as `d2_015`'s A (keep apart in one mock). Nearest `cia1_d1_061`, `cia2_d1_025`, `cia1_d1_046`. A second Third-Party slot left empty (every lead repeated an item: section 6) |
| 3C1c | What the program is for | Explain (recall) | 0 | 0/0/0 | no | zero items. R1 draft cut (a program paused after a clean external assessment, keyed on Standard 8.3 and Principle 12: classed test-taking in two of three reviews). The notes' purpose line is KaiSip's reading |
| 3C1d | The chief audit executive's duty to report program results to the board | Recognize (recall) | 1: d3_003 (A6); also touched by d3_007, d1_016 | 0/1/0 | yes | one item: cannot be held back |
| 3C1e | Internal assessments compared with external assessments | Compare (apply) | 1: d3_001 (A6) | 0/1/0 | yes | one item: cannot be held back |
| 3C1f | What qualifies someone to be a quality assessor | Recognize (recall) | 2: d3_002 (A6), d3_014 (A6, R1) | 0/2/0 | yes | - (R1 second lesson `d3_014`: a rotation among four peers; siblings `d3_002` and `d3_001`; the notes' own example is a two-way swap) |
| 3C1g | What ongoing monitoring and periodic self-assessments cover | Describe (recall) | 1: d3_012 (A6, R1); also touched by d3_001, d3_010, d1_014 | 1/0/0 | yes | one item: cannot be held back. Key: periodic self-assessment is required beside ongoing monitoring (Standard 12.1). Mirror sibling `d1_014` (keep apart in one mock) |
| 3C2a | What must be reported: circumstances, actions taken, impact and reason | Identify (recall) | 2: d3_005 (A7), d3_006 (A7); also touched by d4_003 | 1/1/0 | yes | - (`d3_006` sibling of `cia1_d1_068`) |
| 3C2b | The main steps for telling senior management and the board | Describe (recall) | 1: d3_007 (A7) | 0/0/1 | yes | one item: cannot be held back; sibling `d4_003` |
| 3C3a | What key performance indicators are meant to achieve | Identify (recall) | 1: d3_013 (A8, R1) | 1/0/0 | yes | one item: cannot be held back. Key: objectives consider the board's and senior management's input (Standard 12.2); the board's yearly approval is taught as an essential condition. Nearest `d3_008` |
| 3C3b | Choosing indicators, and why each needs a target | Identify (recall) | 1: d3_008 (A8) | 0/1/0 | yes | one item: cannot be held back |
| 3C3c | Why both qualitative and quantitative indicators are useful | Recognize (recall) | 0; also touched by d3_008 | 0/0/0 | no | zero items. R1 left empty: `d3_008`'s wrong option already teaches that qualitative measures belong in the set, and the merit line is KaiSip's reading |
| 3C3d | Analyzing the function's own measures | Analyze (judge) | 2: d3_009 (A8), d3_010 (A8) | 0/0/2 | yes | - (`d3_009`'s key matches a line notes 3C3.3 marks KaiSip's reading; its `_provenance` rests it on Standard 12.2's considerations and 15.2: section 7) |

### Section D table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 3D1a | What the seven qualities mean in a final communication | Define (recall) | 1: d4_016 (R1); also touched by d4_001 | 1/0/0 | yes | one item: cannot be held back. Key: a loaded word makes a supported draft lack objectivity (Standard 11.2's considerations); accurate is kept out of the options. Nearest `d4_001` (complete), `cia1_d2_069` (clear) |
| 3D1b | Seeing those qualities applied | Recognize (recall) | 1: d4_001 (E1) | 0/1/0 | yes | one item: cannot be held back; nearest `cia1_d2_036`, `cia1_d2_069`. R1: no second lead distinct from `d4_001` |
| 3D1c | Effective ways of communicating | Identify (recall) | 1: d4_002 | 1/0/0 | yes | one item: cannot be held back; sibling `d1_002`. R1: no second lead distinct from `d4_002` |
| 3D2a | The main parts of an audit report | Describe (recall) | 2: d4_004 (E2), d4_005 | 1/1/0 | yes | - (`d4_004` near `cia1_d1_059`, `cia2_d2_014`) |
| 3D2b | When the report may say the work conformed with the Standards | Recognize (recall) | 2: d4_003 (E2), d4_019 (E2, R1) | 0/2/0 | yes | - (R1 second lesson `d4_019`: the statement beside another body's requirements, Standard 4.1; sibling `cia1_d1_068`, keep apart; near `d3_006`. `d4_003` sibling `d3_007`) |
| 3D2c | When a scope limitation must be written into the report | Identify (recall) | 0; also touched by d4_004, d1_012 | 0/0/0 | no | zero items; left empty twice. Repeats `cia1_d1_089` and `cia2_d1_015`; the chief audit executive's only new angle (planned work cut for resources) reopens Part 2 round 1's scope change or scope limitation ambiguity |
| 3D3a | What auditors do when they and management disagree | Recognize (recall) | 1: d4_006 (E3) | 0/0/1 | yes | one item: cannot be held back; its ordinary-dispute twin was cut in the pilot; nearest `cia1_d2_013`. R1: no second lead distinct from `d4_006` |
| 3D3b | What recommendations and action plans are for, with cost against benefit | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty twice. Cost against benefit repeats `cia1_d2_048`, `cia1_d3_017` and `cia1_d3_033`; R1's lead on a methodology that allows only recommendations was arguable under Standard 14.4 |
| 3D3c | Checking that an action plan fixes the root cause | Determine (judge) | 1: d4_015 (E3, R1) | 0/0/1 | yes | one item: cannot be held back. Key: a plan that repairs only the exceptions found misses the agreed root cause, judged by the chief audit executive before approval (Standards 14.3, 14.4). Sibling `cia2_d2_021` (keep apart); near `cia1_d3_017`, `cia1_d3_051`, `cia1_d2_048`. R1's second draft cut (a root cause the auditors settled alone: repeated `cia1_d2_084` almost line for line) |
| 3D4a | What the closing meeting is for and who attends | Describe (recall) | 0 | 0/0/0 | no | zero items; left empty twice. Keys on mays in Standard 13.1's considerations, or repeats `cia2_d3_006` and `cia1_d2_013` |
| 3D4b | The chief audit executive's duty to send out the final communication | Recognize (recall) | 1: d4_008 (E4) | 0/1/0 | yes | one item: cannot be held back; logged cross-part sibling `cia2_d3_011`; near `cia1_d2_020`, `cia1_d2_082`. Pilot delegation draft cut (answerable by test-taking twice); R1's recipient-choice lead had two defensible answers (the chief financial officer or the board) |
| 3D4c | Why communication differs by audience | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty twice. Repeats `cia1_d2_036`; other audience leads rest on mays in Standards 9.5 and 15.1 |
| 3D4d | Reporting an issue management fixed before issue | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty twice. Repeats `cia1_d2_001`, `cia1_d3_063`; the chief audit executive's angle is `cia1_d2_001`'s honesty lesson again. "The finding stays" is KaiSip's reading; only the acknowledgment is a must (Standard 15.1) |
| 3D4e | Correcting a significant error or omission | Describe (recall) | 2: d4_007 (E4), d4_018 (E4, R1) | 0/2/0 | yes | - (R1 second lesson `d4_018`: the threshold, criteria agreed with the board, Standard 11.4; sibling `d4_007`, keep apart; near `cia1_d2_042`, `cia1_d2_036`) |
| 3D5a | Judging control design and effectiveness to set residual risk | Recognize (recall) | 0 | 0/0/0 | no | zero items; left empty twice. Part 1's 1C4 items teach it, and the chief audit executive's part is a line the notes mark KaiSip's reading |
| 3D5b | Why findings are combined and ranked | Describe (recall) | 0; also touched by d1_011 | 0/0/0 | no | zero items; cut twice. Pilot (one cause behind three medium findings: repeated `d1_011`); R1 (one ranking method set by the chief audit executive: repeated `cia2_d2_011`'s Standard 14.3 rule and wrong patterns) |
| 3D5c | Why a rating scale shows the overall view | Describe (recall) | 1: d4_009 (E5) | 0/1/0 | yes | one item: cannot be held back; near `cia2_d2_014`, `cia1_d3_023`. R1: a bargained-rating lead repeats `cia1_d2_013` and `cia1_d2_053` |
| 3D6a | How to tell whether a risk is more than the organization should accept | Recognize (recall) | 1: d4_011 (E6) | 0/1/0 | yes | one item: cannot be held back; second lessons repeat `cia1_d3_104` (pilot) and `cia1_d3_031` (R1) |
| 3D6b | Who is told, and who does the telling | Recognize (recall) | 0; also touched by d4_010, d4_014 | 0/0/0 | no | zero items. R1 draft cut (who decides once the board has an escalated risk: repeated `cia1_d3_048`, and only the key named the audit committee the stem named) |
| 3D6c | Which step comes first, and what follows | Recognize (recall) | 1: d4_010 (E6) | 0/0/1 | yes | one item: cannot be held back; sibling `cia1_d3_038`; near `cia1_d3_057`, `cia1_d3_012`. R1: senior management resolving the risk mirrors `d4_010`; senior management declining is `cia1_d3_012` |
| 3D7a | Internal audit's duty to follow up and track | Recognize (recall) | 1: d4_017 (R1); also touched by d4_012 | 1/0/0 | yes | one item: cannot be held back. Key: management's own action plans are followed up as well as internal audit's recommendations (Standard 15.2). Near `cia1_d1_035`, `d4_012`. The pilot's draft here was cut (open actions in the board report) |
| 3D7b | The steps to check, then confirm, agreed actions | Distinguish (apply) | 1: d4_012 (E7); also touched by d4_017 | 0/0/1 | yes | one item: cannot be held back. Alternative-plan lead left empty (repeats `cia1_d3_038`); R1's lead on criteria for follow-up assessments echoed the Standard's own word in the key |
| 3D8a | Who is told when an action is overdue or poorly done | Recognize (recall) | 1: d4_013 (E8) | 0/1/0 | yes | one item: cannot be held back; near `cia1_d2_053`, `cia1_d3_057`. R1: overdue actions in the board's report is the pilot's retired lead |
| 3D8b | The order in which the matter moves up | Recognize (recall) | 1: d4_014 (E8) | 0/1/0 | yes | one item: cannot be held back; near `cia1_d3_057`, `cia2_d3_007`. R1: a second lead repeats `cia1_d3_057` |

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
| A | 17 | 50 | 33 | 3A1: 4 of 10; 3A2: 4 of 16; 3A3: 4 of 10; 3A4: 5 of 14. All five empty bullets (3A2c, 3A2e, 3A2f, 3A2g, 3A4a) were tried in the pilot or round 1 and left empty or cut; none has an open lead. Then second lessons on the 13 one-item bullets, 3A1d's missing half first (which condition warrants a review). 3A2 holds 4 of its 16 and four of its seven bullets are empty, so its share is the one most likely to stay short. |
| B | 15 (2 dated) | 30 | 15 (17 today) | 3B1: 9 of 14 (two dated); 3B2: 4 of 9; 3B3: 2 of 7. Round 2 filled 3B1f (3 items); the Third-Party items written ahead gave 3B1c two more, and its Third-Party lessons are spent. The three empty bullets (3B1b, 3B1g, 3B3a) were left empty in round 1 (3B1g blocked, the others thin or repeats); second lessons on the eight one-item bullets. 3B1f's Knowledge leads are close to spent (section 6), so 3B1 and 3B3 are still likely to fall short. |
| C | 15 (1 dated) | 30 | 15 (16 today) | 3C1: 8 of 15 (one dated); 3C2: 3 of 6; 3C3: 4 of 9. The Third-Party items written ahead gave 3C1b its second item (`d3_015`); a second Third-Party slot was left empty. Two empty bullets: 3C1c (round 1 draft cut) and 3C3c (left empty); second lessons on the eight one-item bullets. Section C is the closest to its bar. |
| D | 19 | 90 | 71 | 3D1: 3 of 11; 3D2: 4 of 12; 3D3: 2 of 13; 3D4: 3 of 17; 3D5: 1 of 11; 3D6: 2 of 11; 3D7: 2 of 8; 3D8: 2 of 7. All eight empty bullets (3D2c, 3D3b, 3D4a, 3D4c, 3D4d, 3D5a, 3D5b, 3D6b) were tried and left empty or cut, most as repeats of Part 1 or Part 2; round 1 also found no distinct second lesson for ten of the 13 one-item bullets. Round 1's authors judged only a few distinct Section D lessons remain in the opened sources, so most of this gap waits on a new source (section 5, item 5). |

**Difficulty by verb** is enforced per topic, by the topic verb, from 8 items. With the
Third-Party items, 3B1 (9) and 3C1 (8) are the first Part 3 topics it reaches, and both
pass (the check counts dated items). When others reach 8, 3D3 (Determine) needs at least
15% analysis and at most 25% foundational, and 3D2 (Demonstrate) at least 40% application
and at most 35% foundational; the 16 recall topics need 25 to 60% foundational and at most
25% analysis. 3B1 (9 items: 3 foundational, 5 application, 1 analysis) has room either way.
**3C1 (8 items: 2 foundational, 6 application, no analysis) sits on the 25% floor: its
next item must be foundational**, or the gate fails. Watch 3D4 (3 items, none
foundational) and 3A4 (5 items, one foundational since `d1_018`, two analysis): at 8 items
each needs at least two foundational items, and 3A4 can take no more analysis items.

## 5. Gap list in priority order

Items 1 to 4 are ceilings, filled only where a distinct lesson is found; item 5 is what
unlocks the bullets the opened sources cannot reach, and after round 1 it is what most of
the gap waits on.

1. **Section D's eight zero-item bullets**, as Section D carries 71 of the 140-item gap and
   is 45% of the exam. Every one was tried in the pilot or round 1: 3D6b and 3D5b were cut
   in round 1 as repeats (`cia1_d3_048`, `cia2_d2_011`), 3D5b also in the pilot (`d1_011`);
   3D2c, 3D3b, 3D4a, 3D4c, 3D4d and 3D5a were left empty twice. Reopen one only with a lead
   from the chief audit executive's seat or sequence that answers its recorded reason and
   that Part 1 and Part 2 do not hold. 3D6b (Standard 11.5) and 3D5b (Standard 14.3) rest
   on opened musts and are the likeliest.
2. **Second lessons on Section D's 13 one-item bullets** (3D1a, 3D1b, 3D1c, 3D3a, 3D3c,
   3D4b, 3D5c, 3D6a, 3D6c, 3D7a, 3D7b, 3D8a, 3D8b), so each Section D topic can be sampled
   by the held-back form. Round 1 found no distinct lead for ten of them (reasons in the
   table); the three filled in round 1 (3D1a, 3D3c, 3D7a) have not been tried for a second.
3. **Sections A to C's 10 zero-item bullets.** All were tried and left empty or cut: cut
   for test-taking 3A2c, 3A2f (twice), 3A4a and 3C1c; left empty 3A2e, 3A2g, 3B1b, 3B3a and
   3C3c; blocked 3B1g. (3B1f, cut in the pilot and left empty in round 1, was filled in
   round 2 on the Knowledge sources.) 3A2f and 3C1c rest on Standards musts (10.3; 8.3 and
   Principle 12) and fell only to the options-only pass, so a scenario whose runner-up is a
   real rule at the wrong moment is the one route left.
4. **Second lessons on Sections A to C's 29 one-item bullets** (A 13, B 8, C 8). 3A1d's
   missing half (which condition warrants a review of the methodologies, notes 3A1.4) is
   still the clearest; two pilot leads are unused (3A4e: internal results to the board at
   least yearly, whatever they show; 3C1a: a program of external assessments only), each
   now next to a round 1 item (`d1_016`, `d3_012`). Before adding any, log the `d1_012` and
   `d2_008` pair (section 6).
5. **A new source.** The textbook on the exam reference list (on hold, owner, 26 Nov 2026,
   plan section 9) and the 2027 testable dates of the Third-Party (2027-03-01),
   Organizational Behavior (2027-06-01) and Organizational Resilience (2027-10-01)
   requirements. The Third-Party requirement is now spent for Part 3: `d2_014`, `d2_015`
   (3B1c) and `d3_015` (3C1b) were written ahead on 26 Nov 2026, dated 2027-03-01, and
   every other lead repeated an item. Organizational Behavior (opened; 2027-06-01) is
   unlikely to add a Part 3 lesson: on 3B1c and 3C1b it would repeat the applicability,
   prioritization and conformance-evidence lessons now held, and its content (behavior,
   incentives, tone) is organization-level, Part 1 and Part 2 ground. Members-only guides are
   never opened. The free Knowledge sources (owner, 26 Nov 2026) reach only topic 3B1 in
   Part 3, and round 2 has used most of what they give it (section 6). With most of items 1
   to 4 already tried on the opened sources, Part 3's sale gate may become an owner
   decision, as Part 2's did (plan section 9).

**Bullets the opened sources cannot support, or support only in part.** The opened sources
for Part 3 are the Standards (Domains III and IV, Principles 8 to 12 and 15, Standards 2.2,
3.1, 3.2, 4.1, 6.3, 13.1 and 13.3 and the glossary), the Cybersecurity requirement and the
Topical Requirements' user guides, the 2026 Three Lines statement, the Competency
Framework guide (public) and the syllabus. Since round 2, five free public Knowledge sources
(library rule 2b) key knowledge facts in topic 3B1, the only Part 3 topic their library
headings name: NIST AI 100-1 (K9), IR 8202 (K10), IR 8301 (K11), IR 8259 Rev. 1 (K12) and
SP 800-213 (K13). Who acts and every must still rest on the Standards. Guidance only, never
a key: the Topical Requirements Application Guidance (Background) and The IIA's AI Auditing
Framework (read for the notes; Background in the citation library since the pilot).

| Bullet | What waits | Needs |
|---|---|---|
| 3A2g | Job design and work schedules | Textbook; the position paper on staffing is "access not checked" in the citation library. Coaching (Competency Framework guide), mentoring and rewards (Standards 10.2 and 2.2) are keyable, but round 1 found each a definition or a repeat |
| 3A2c | Team roles and titles beyond the Standards' three (internal auditor, engagement supervisor, chief audit executive) | Textbook; the Competency Framework's role profiles are benchmarks only. Items keep to the three roles |
| 3A3b | What a mission statement is for | Members-only strategy guide (never) or the textbook. `d1_006` keys only on Standard 9.2 (vision, objectives, initiatives) |
| 3A4a (detail) | Board relationship practice beyond Standards 8.1, 11.1 and 6.3 | Members-only board interaction guide (never); position paper on trust with the audit committee (access not checked). Items keep to the Standards and state should as should |
| 3B1a, 3B1b | How the audit universe is built and what its units are | Members-only risk-based plan guide, a primary reference (never), or the textbook. The universe is a may in Standard 9.4's considerations, so keys rest on 9.4's musts and shoulds |
| 3B1f (met) | Robotic process automation | No reputable free source on an allowed host (research log: not in NIST, GovInfo, COSO or the four OpenStax books; the GSA and Treasury pages sit on refused hosts). AI (K9), blockchain (K10), tokens and wallets (K11) and connected devices (K12, K13) are opened as Knowledge since 26 Nov 2026 and key `d2_011` to `d2_013`; the CAE's step still rests on Standard 9.4 |
| 3B1g | Audit cycle requirements | Textbook or the members-only plan guide. No item until then |
| 3B2a (met) | Impact and likelihood scales | Textbook ("Common usage"). `d2_004` keys on Standard 9.4's required inputs |
| 3B3a | Who counts as an internal or external provider | Lists the notes mark KaiSip's reading of Standard 9.5 and the 2026 Three Lines statement; textbook |
| 3B3b (met) | Assurance maps and combined assurance in detail | Members-only coordination guide (never). Items keep to Standard 9.5 |
| 3C1c | The program's purpose in words | The notes' line is KaiSip's reading; a key rests on Standard 8.3 and Principle 12 only (round 1's draft did, and fell to the options-only pass) |
| 3C3c | The merit of each kind of indicator | The notes' line is KaiSip's reading; a key rests on Standard 12.2's should (quantitative and qualitative targets), already a wrong option in `d3_008` |
| 3C3d (met) | Sorting measures into the syllabus's categories | KaiSip's reading (the Standards label only productivity and cost efficiency). `d3_009` and `d3_010` key on Standards 12.2, 12.1, 8.3 and 15.2 |
| 3D1, 3D2 (detail) | Report-writing practice beyond Standards 11.2, 11.3, 4.1 and 15.1 | Members-only results-communication guides (never) |
| 3D3c (met), 3D3b | Testing a plan against its cause; counting costs and benefits | The notes' lines are Sound practice; keys rest on Standards 14.3 and 14.4 (`d4_015` does) |
| 3D5a | Methods for design and effectiveness; the chief audit executive's part in residual risk | Sound practice and KaiSip's reading; textbook. Part 1's 1C4 items already teach inherent against residual risk |
| 3D7b, 3D8b (met) | Inquiry alone for minor actions; the factors for judging delay | KaiSip's reading. `d4_012` and `d4_014` avoided both |

**Bullets whose lessons so far repeat an existing item.** A slot here reopens only with a
lead that answers the reason.

| Bullet | Repeats | Outcome |
|---|---|---|
| 3A2e | `cia1_d2_056`, `cia1_d2_060`; the evaluation duty is `d1_004`'s key | R1 left empty |
| 3A2g (rewards, mentoring) | `cia1_d2_056`; `d1_004` | R1 left empty |
| 3A4a | `cia1_d1_073` (private session), `cia1_d2_037` (informal contact), next to `cia1_d1_019` | Pilot draft cut; R1 left empty |
| 3B1b | `cia1_d3_026` (the only must angle) | R1 left empty |
| 3B3a | `cia1_d3_043`, `cia1_d1_022`, `cia1_d1_019` | R1 left empty |
| 3D2c | `cia1_d1_089`, `cia2_d1_015` | Left empty twice |
| 3D3b | `cia1_d2_048`, `cia1_d3_017`, `cia1_d3_033` | Left empty twice |
| 3D3c (second lesson) | `cia1_d2_084` | R1 draft cut |
| 3D4a | `cia2_d3_006`, `cia1_d2_013` (or a may only) | Left empty twice |
| 3D4c | `cia1_d2_036` | Left empty twice |
| 3D4d | `cia1_d2_001`, `cia1_d3_063` | Left empty twice |
| 3D5a | Part 1's 1C4 items | Left empty twice |
| 3D5b | `d1_011` (pilot); `cia2_d2_011` (R1) | Draft cut twice |
| 3D6b | `cia1_d3_048` | R1 draft cut |
| 3D6a (second lesson) | `cia1_d3_104`, `cia1_d3_031` | Left empty twice |
| 3D6c (second lesson) | `d4_010`, `cia1_d3_012` | R1 left empty |
| 3D5c (second lesson) | `cia1_d2_013`, `cia1_d2_053` | R1 left empty |
| 3D7 (alternative plan) | `cia1_d3_038` | Left empty |
| 3D8b (second lesson) | `cia1_d3_057` | R1 left empty |
| 3D3a (second lesson) | `d4_006` | Pilot draft cut; R1 no new lead |

Two lessons from Parts 1 and 2 apply to every slot. A thin, common-sense lesson fails the
blind test however it is rebuilt (the pilot and round 1 cut six drafts on that ground,
including "delegating authority keeps responsibility", which is general management sense),
so a lead whose key a careful non-auditor would pick is dropped, not polished. And a slot
with no distinct lesson stays empty.

## 6. Leads and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. Each rests on the Part 3 notes and the
Standards; none retells a notes example. On a recall bullet, keep the knowledge at the
bullet's level even when the scenario asks for a choice, and name the actor in every stem.

**What happened to the pilot map's leads in round 1.** Written as led: 3D3c (`d4_015`),
3D1a (`d4_016`), 3A1b (`d1_014`), 3A2b (`d1_015`), 3B1e (`d2_010`), 3C1g (`d3_012`), 3C3a
(`d3_013`). Written on a different key: 3A1a (`d1_013`, methodologies, not the budget),
3A4e (`d1_016`, the audit-law element), 3C1a (`d3_011`, documented internal assessments),
3D7a (`d4_017`, management's own plans). Cut: 3D6b, 3D5b, 3A2f, 3C1c. Left empty: 3A2e,
3A2g, 3A4a, 3B1b, 3B1f, 3B3a, 3C3c.

**Leads still open** (each a second lesson; each is thin and sits next to a round 1 item,
so it needs a Standards distinction and a different runner-up to survive):

- **3A1d, the missing half.** Which condition warrants a review of the methodologies
  (Standard 9.3; notes 3A1.4: changes in standards, laws, technology, or the team's size or
  makeup). Keep apart from `d1_002` and `d1_013`.
- **3A1a or 3A2a, an outsourced budget.** An outsourced function on a fixed fee still needs
  the board's budget approval (a should, Standard 10.1's considerations). Keep apart from
  `d1_017` and `cia1_d1_090`; one of the two per mock.
- **3A4e, results whatever they show.** Internal assessment results go to the board at least
  yearly, even when clean (a must, Standard 8.3). Keep apart from `d1_016` and `d3_003`.
- **3C1a, an external-only program.** A program of five-yearly external assessments and
  nothing else lacks the internal assessments (Standards 8.3 and 12.1). Keep apart from
  `d3_012`, `d3_011` and `d1_014`.

**What happened to the Knowledge leads in round 2 (26 Nov 2026).** `cia-p3b-section-expert`
wrote three 3B1f items, one per source family: blockchain (`d2_011`, K10), connected devices
(`d2_012`, K12 and K13) and AI (`d2_013`, K9). Left empty: robotic process automation (no
source), a token and wallet item on IR 8301 (K11; not written, and the file's `_meta` names
no reason for it), and a second AI lesson (each draft repeated `cia2_d2_031`, `cia1_d3_058`
or the pilot cut).

**Knowledge leads after round 2.** Close to spent.

- **3B1f, tokens and custody (K11 only).** The one listed source not yet used in Part 3
  (IR 8301 Sections 2, 3 and 6.2: fungible and non-fungible tokens, wallets and custody,
  tokenized money). Write it only if the source states a fact that decides a final two
  from the chief audit executive's seat, and **key the reassuring view** this time (round
  2's three keys were all the sceptical one; section 7). Keep it apart from `d2_011`.
- **No other Part 3 bullet is opened by a listed Knowledge source.** Library rule 2b lets
  a Knowledge source key only the topics its heading names, and the only Part 3 topic any
  heading names is 3B1 (K9 to K13). The other sources (K1 to K8, K14 to K18) name Part 1
  and Part 2 topics; the nearest sections to Part 3 ground (K18 9.6 on measures against a
  standard, K17 6.8 on dashboards) sit beside what Standard 12.2 already keys in `d3_008`
  and `d3_013`; extending a heading to a Part 3 topic would be `cia-currency-checker`'s
  call after re-reading the section, and no distinct lesson is in view. None of the
  opened sections states job design, work schedules, team titles, mission statements, audit
  cycles or audit universe units, the blocked Part 3 detail (section 5).

**What happened to the Third-Party leads (26 Nov 2026).** `cia-p3b-section-expert` and
`cia-p3c-section-expert` wrote three items on the Third-Party requirement and its user
guide, each dated 2027-03-01: `d2_014` (an intragroup provider is outside it), `d2_015` (controls
work on the prioritized vendors, keyed on the reassuring view) and `d3_015` (a
self-assessment judges conformance from the kept applicability evidence and exclusion
reasons). **Third-Party leads after them: spent.** Each other lead repeated an item: a
competency shortfall on a third-party engagement (`cia1_d1_065`, `cia1_d1_077`,
`cia1_d1_103`, `d1_013`), a requested or surfacing topic and advisory conformance
(`cia2_d1_001`, `cia1_d1_061`, `cia1_d1_046`), accountability kept by the organization
(`cia2_d1_045`), a downstream subcontractor (`cia2_d1_043`), coverage recorded in the plan
(`d3_015`), the chief audit executive answering for conformance however the work is
resourced (`cia2_d3_004`, `cia1_d1_077`) and internal as well as external assessments
(`d3_004`). No Organizational Behavior lead is in view for Part 3 (section 5, item 5).

**Siblings logged in the pilot** (each item's `_provenance`; keep apart in one mock):

- **Inside Part 3:** `d1_001`, `d1_009` and `d1_010` form one group (significant plan
  changes under Standard 9.4; at most two in one mock); `d1_009` with `d2_006` and `d1_001`
  with `d2_002` (both pairs logged in both items); `d4_002` with `d1_002` (training on
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
  `cia1_d1_044`; `d2_006` with `cia1_d2_078` and `cia1_d1_026`; `d2_007` near
  `cia1_d3_043`; `d2_008` with `cia1_d1_034` and `cia1_d1_019`; `d2_009` near
  `cia1_d1_026`.
- **Section C, cross-part:** `d3_004` near `cia1_d1_061` and `cia2_d1_025`; `d3_006` with
  `cia1_d1_068`.
- **Section D, cross-part:** `d4_001` near `cia1_d2_036` and `cia1_d2_069`; `d4_003` near
  `cia1_d1_066` and `cia2_d2_014`; `d4_004` near `cia1_d1_059` and `cia2_d2_014`; `d4_005`
  names `cia1_d1_035` as a different lesson; `d4_006` near `cia1_d2_013`; `d4_007` near
  `cia1_d2_042`; `d4_008` with `cia2_d3_011`, near `cia1_d2_020` and `cia1_d2_082`;
  `d4_009` near `cia2_d2_014`, apart from `cia1_d3_023`; `d4_010` near `cia1_d3_057` and
  `cia1_d3_012`, sibling `cia1_d3_038`; `d4_011` near `cia1_d3_031`, `cia1_d3_104` and
  `cia1_d3_076`; `d4_012` near `cia1_d1_035`; `d4_013` apart from `cia1_d2_053`, near
  `cia1_d3_057`; `d4_014` near `cia1_d3_057` and `cia2_d3_007`.

**Siblings logged in round 1** (each item's `_provenance`; keep apart in one mock):

- **Inside Part 3, across sections:** `d1_014` with `d3_012` (ongoing monitoring and
  periodic self-assessment: mirror lessons, 3A1b and 3C1g); `d1_016` with `d3_003` (what
  the quality report holds).
- **Inside Part 3, one bullet or section:** `d1_013` with `d1_002` (methodologies after a
  change); `d1_017` with `d1_003` (the budget); `d3_014` with `d3_002` and `d3_001`
  (qualified, independent assessors); `d4_018` with `d4_007` (correcting an issued report);
  `d2_010` kept apart from `d2_004` (required plan inputs). Nearest, not siblings:
  `d1_015` near `d1_007` and `d1_004`; `d3_011` near `d3_001` and `d3_003`; `d3_012` and
  `d1_014` near `d3_001` and `d3_010`; `d3_013` near `d3_008`; `d4_016` near `d4_001`;
  `d4_017` near `d4_012`.
- **Cross-part:** `d1_013` with `cia2_d3_004`; `d1_017` with `cia1_d1_090` and
  `cia1_d1_016`; `d2_010` near `cia1_d1_070`; `d4_015` with `cia2_d2_021` (the same
  price-override condition, ranked by significance there), near `cia1_d3_017`,
  `cia1_d3_051` and `cia1_d2_048`; `d4_016` near `cia1_d2_069`; `d4_017` near
  `cia1_d1_035`; `d4_018` near `cia1_d2_042` and `cia1_d2_036`; `d4_019` with
  `cia1_d1_068` (beside, not in place of: the charter there, the final communication
  here), near `d3_006`.

**Siblings logged in round 2** (each item's `_provenance`; keep apart in one mock):
`d2_012` with `d2_013` (the same frame: management vouches for a low rating, and the chief
audit executive weighs it). Nearest, not siblings: `d2_011` near `d2_003` and `d2_010`;
`d2_012` near `cia2_d1_017` (an AI chatbot beside a stale cyber register, engagement level)
and `d2_001`; `d2_013` apart from the pilot cut, `cia2_d2_031`, `cia2_d1_031` and
`cia1_d3_058`. No Part 1 or Part 2 item is on blockchain.

**Siblings logged with the Third-Party items written ahead** (each item's `_provenance`;
keep apart in one mock): `d2_014` with `cia2_d1_043` (that item's key is this item's
runner-up; keep apart in one Challenge mock), `d2_001` and `cia1_d1_099`; `d2_015` with
`d2_001`, `cia2_d1_025` and `d3_015` (both items' option A falls to the same user-guide
paragraph); `d3_015` with `d3_004`, `cia1_d1_061`, `cia2_d1_001`, `cia2_d1_025` and
`cia1_d1_046`. The first drafts of `d2_014` and `d2_015` were re-keyed before hand-off
because `cia2_d1_043` and `d3_015` had taken their first keys.

**Found while mapping, not logged** (for `cia-cross-part-reviewer`; no item was changed):

- `d1_012` logs a possible 3B3 sibling on disclosing reliance; `d2_008` carries that
  disclosure as a wrong option and does not log `d1_012`, nor `d1_012` it. Log the pair.
- The pilot map's two other pairs (`d1_009` with `d2_006`; `d1_001` with `d2_002`) are now
  logged in both items' `_provenance`.

## 7. What the pilot, rounds 1 and 2 and the Third-Party items taught

**Third-Party items written ahead (26 Nov 2026): 3B1c and 3C1b.** From `d2.json`'s and
`d3.json`'s `_meta` and the evidence. Kept 3 of 3 drafts, all dated 2027-03-01; no cut.

| Section | Slot | What happened | Reason |
|---|---|---|---|
| B | 3B1c, intragroup provider (`d2_014`) | Written, kept after the fix pass | First audit: the key rests on the user guide alone (the requirement's own exclusion list does not name intragroup providers), so the user guide is now cited first and the explanation and Exam cue add that the organization's own definition of third party can widen it |
| B | 3B1c, controls work on prioritized vendors (`d2_015`) | Written, kept after the fix pass | Keyed on the reassuring view. First audit: the stem did not say the three vendors were all the ranking prioritized, the fact the controls must turns on (added); the key's "It can conform" hedge was given to a wrong option too. The fresh blind test flagged a mild giveaway, the stem's "prioritizes" echoed only in the key; the re-audit gave option C the same word |
| C | 3C1b, conformance evidence in a self-assessment (`d3_015`) | Written, kept after the fix pass | Kept on Third-Party because a Cybersecurity version would repeat `d3_004`; the fix pass dropped where the evidence is kept from the key (the user guide lets coverage sit in the plan or the workpapers, a may) and made the pre_read neutral |
| B | 3B1c, other Third-Party leads | Left empty | Each repeated an item (section 6) |
| C | 3C1b, a second Third-Party slot | Left empty | Each lead repeated an item or sat on Part 2's scoping ground (section 6) |

**What the Third-Party items taught.** A Topical Requirement opened Part 3 lessons the
Knowledge sources could not, with final twos decided by the requirement's own lines (its
exclusions, a must for prioritized vendors, kept evidence against a may on where it is
kept). Two cautions. Labels must carry the source's own strength: the first audit's
PRECISION findings in notes 3B1.4 and 3C1.1 were a "may" under a "Must" label and an
exact day ("1 March 2027") the source never gives (the exam list says the month). And
items written for two parts at once collide: both 3B1c drafts lost their first key to a
Part 2 or Section C item, so agree one lesson list across the authors before drafting the
next written-ahead set. Part 3's two Topical Requirement bullets now hold the reusable
lessons, so a later requirement is likely to add little here.

**Round 2 (26 Nov 2026): 3B1f on the Knowledge sources.** From `d2.json`'s `_meta` and the
round's evidence. Kept 3 of 3 drafts; no cut.

| Section | Slot | What happened | Reason |
|---|---|---|---|
| B | 3B1f, blockchain (`d2_011`) | Written, kept | NIST IR 8202 7.3 decides the final two; Standard 9.4 carries the re-rating |
| B | 3B1f, connected devices (`d2_012`) | Written, kept after the fix pass | First blind test classed it test-taking (the key was the only doubting option); a second doubting option with a wrong Standard 9.4 reason fixed it |
| B | 3B1f, AI (`d2_013`) | Written, kept | NIST AI 100-1 3.6 decides the final two |
| B | 3B1f, robotic process automation | Left empty | No reputable free source on an allowed host |
| B | 3B1f, tokens and wallets (IR 8301) | Left empty | Not written; the `_meta` records no reason |
| B | 3B1f, a second AI lesson | Left empty | Each draft repeated `cia2_d2_031`, `cia1_d3_058` or the pilot cut |

**What round 2 taught.** A Knowledge source opened a bullet that two rounds could not fill,
and the first audit found no HARD error. But in all three items the key was the sceptical
view of a reassuring claim, so "pick the doubting option" was the cue the testers named;
the next 3B1 item should sometimes key the reassuring answer. The audit also found the
chief audit executive's seat thin: on a knowledge bullet the Knowledge fact decides the
final two, and the Standard 9.4 step is the frame.

**Round 1 (25 Nov 2026): slots left empty on purpose, and cuts.** From each file's
`_meta`; reopen a slot only with a new lead that answers the reason. Round 1 kept 15 of 20
drafts (A 5 of 6, B 1 of 1, C 4 of 5, D 5 of 8).

| Section | Slot | What happened | Reason |
|---|---|---|---|
| A | 3A2f (audit software that cannot read a new system; old `d1_016`) | Draft cut | The options alone still gave its key after the fix pass |
| A | 3A2e (performance management) | Left empty | `cia1_d2_056` and `cia1_d2_060` already key it; the remaining evaluation duty is `d1_004`'s key |
| A | 3A2g (people techniques) | Left empty | Job design and work schedules blocked; mentoring taught by `d1_004`; coaching a common-sense definition; rewards repeat `cia1_d2_056` |
| A | 3A2c (team roles) | Left empty | Titles beyond the Standards' three roles are Common usage; no lead answers the pilot's cut |
| A | 3A4a (formal and informal contact) | Left empty | Repeats `cia1_d1_073` and `cia1_d2_037`; board reporting sits next to `cia1_d1_019` |
| B | 3B1b (the universe's units) | Left empty | A may and Sound practice; the must angle repeats `cia1_d3_026` |
| B | 3B3a (who the providers are) | Left empty | Lists are KaiSip's reading; the duty is keyed in `cia1_d3_043`, `cia1_d1_022`, `cia1_d1_019` |
| B | 3B1f (emerging issues) | Left empty | No lead beyond a common-sense routine; the technology content is blocked |
| B | 3B1g (audit cycles) | Left empty | Blocked |
| C | 3C1c (a program paused after a clean external assessment; old `d3_014`) | Draft cut | Classed test-taking in two of three reviews |
| C | 3C3c (both kinds of indicator) | Left empty | `d3_008`'s wrong option already teaches it; the merit line is KaiSip's reading |
| D | 3D6b (who decides once the board has an escalated risk; old `d4_016`) | Draft cut | Repeated `cia1_d3_048`, and only the key named the audit committee the stem named |
| D | 3D5b (one ranking method set by the chief audit executive; old `d4_018`) | Draft cut | Repeated `cia2_d2_011`'s Standard 14.3 rule and wrong patterns |
| D | 3D3c second (a root cause the auditors settled alone; old `d4_022`) | Draft cut | Repeated `cia1_d2_084` almost line for line |
| D | 3D2c, 3D3b, 3D4a, 3D4c, 3D4d, 3D5a | Left empty again | Repeats of Part 1 or Part 2 items, or mays only, or KaiSip's reading (section 3); 3D3b's new lead was arguable under Standard 14.4 |
| D | Second lessons on 3D1b, 3D1c, 3D3a, 3D4b, 3D5c, 3D6a, 3D6c, 3D7b, 3D8a, 3D8b | Not written | No distinct lead, two defensible answers (3D4b), a Standard's word echoed in the key (3D7b), or a repeat (section 3) |

**What round 1 taught.** Part 3 is near the end of the opened sources: the authors judged
only a few distinct Section D lessons remain (most new leads repeated Part 1 or Part 2
items, including all three Section D cuts), and even after a fix pass the options-only pass
still found most keys in Sections A to C (11 of 12 before it; the two still plainly
answerable were cut). The next round needs a new source or the owner's sale-gate decision,
and every Sections A to C draft needs an options-only test before its blind test.

**Pilot (25 Nov 2026): slots left empty on purpose, and cuts.** The pilot kept 45 of 53
drafts.

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
| D | 3D3c (root cause) | Left empty | Its lead repeated `cia1_d3_017` (filled in round 1 by `d4_015`) |
| D | 3D3b (cost against benefit) | Left empty | `cia1_d2_048`, `cia1_d3_017` and `cia1_d3_033` already teach it |
| D | 3D6a (second lesson, delegated authority) | Left empty | Repeated `cia1_d3_104` |
| D | 3D7 (alternative plan) | Left empty | Repeated `cia1_d3_038` |
| D | 3D2c (scope limitations) | Left empty | Repeated `cia1_d1_089` |
| D | 3D4a (the closing meeting) | Left empty | Repeated `cia2_d3_006` or `cia1_d2_013`, or rested on a may only |
| D | 3D4c (audiences) | Left empty | Repeated `cia1_d2_036` |
| D | 3D4d (a finding already fixed) | Left empty | Repeated `cia1_d2_001` and `cia1_d3_063` |
| D | 3D5a (residual risk) | Left empty | Part 1's 1C4 items teach it, and the chief audit executive's part is a line the notes mark KaiSip's reading |

- **What the pilot taught.** A fix pass does not rescue a draft whose key a test-taker can
  find from the wording, so a lead that needs rewording to survive is dropped, not
  polished; keep must and should apart in the key. Two items on neighboring bullets can
  share a lesson, so check across sections in the scaffold step. Section D's items that
  held turn on who acts next (`d4_010`, `d4_013`, `d4_014`) or on what the chief audit
  executive must do with a report (`d4_007`, `d4_008`). Watch one key: `d3_009` matches a
  line notes 3C3.3 marks KaiSip's reading; its `_provenance` rests it on Standard 12.2's
  considerations and 15.2, and a later audit should confirm it holds on the Standards
  alone.
- **Notes coverage after round 2.** 47 of the 63 notes sub-topics have an item (46 after
  round 1, 38 after the pilot; `check_cia.py --coverage`); round 2 covered 3B1.3, whose
  Knowledge lines it added (375 words after the re-audit's trim). Uncovered: A 3A2.4,
  3A4.1; B 3B3.1; D 3D1.2, 3D1.3, 3D2.2, 3D2.4, 3D3.1, 3D3.2, 3D4.1, 3D4.3, 3D5.1, 3D5.2,
  3D6.2, 3D7.3, 3D8.3. Section C's nine are all covered.
- **Pick-the-longest after round 2:** A 20.6% (17 items), B 15.4% (13), C 21.4% (14), D
  21.1% (19) (`check_cia.py`). It enforces 15 to 24% from 40 items per section; keep key
  lengths varied as each section grows (Section B sits at the floor: its next keys should
  sometimes be the longest option). Keys by letter: A 5/4/4/4, B 3/3/4/3, C 4/4/3/3, D
  4/5/5/5.
- **Re-run this map after each round**: set each new item's bullet in the scaffold step,
  before it is written, and log every sibling across sections, not only within one.
