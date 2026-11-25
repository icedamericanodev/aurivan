# CIA Part 1: syllabus bullet coverage map

Built 20 Nov 2026 and updated 21 Nov 2026 after rounds 12 to 14, to measure the sale gate (`docs/content/CIA_BANK_PLAN.md`,
section 3, decision 4, revised in round 14): (a) every syllabus bullet tested at its verb's
depth with every gate passing; (b) two full exam-weighted forms of distinct items per
section (Part 1: A 88, B 50, C 74, D 38); (c) one full form frozen and held back, and a
short mock drawn per learner from unseen items; a bullet's only item is never held back.
Three forms (Part 1 about 375: A 131, B 75, C 113, D 56) stay the target as sources open.

Source: the opened Part 1 syllabus (V2.09.2024 FINAL, opened 19 Nov 2026). The
"Covers" column is the blueprint's own wording (`docs/content/CIA_BLUEPRINT.md`), not
The IIA's; the verb is the bullet's leading word. Bank: all 348 items in
`data/cia/cia1/originals/d1.json` to `d4.json` as of round 15. This is an internal
working document; it holds no item text.

## 1. How the map was made

- **One primary bullet per item**, read from the stem, the key and the explanation. The
  `subtopic` and `_provenance` fields name the notes sub-topic, which is not always the
  bullet (for example `cia1_d1_051` sits in notes 1A6.3 but tests who sets an advisory
  job's scope, bullet 1A4d). A plain second bullet is listed as "also touched by"; it
  does not count toward that bullet.
- **Ids are short**: `d1_012` means `cia1_d1_012`. A Challenge tag is shown in brackets
  (`A1`, `A2`, `A3`, `A4`, `A5`, `C3`).
- **Topic-line rows ("(line)")** hold items that test the topic line but none of its
  lettered bullets (the syllabus says "may include but is not limited to"). They count
  in the section totals, not toward any bullet.
- **Depth.** The bullet's own verb decides it, by the plan's section 4 classes. A recall
  bullet is met by any item; an apply bullet needs at least one application or analysis
  item; a judge bullet needs at least one analysis item. Verbs the plan's table does not
  list are read as follows (KaiSip's reading, open to the auditor): Define as recall;
  Differentiate, Compare and contrast, Review and Recommend as apply; Detect and assess,
  and Describe and evaluate, as judge (each carries a judge verb). Recommend could be
  read as judge; if it is, 1C7c is below depth too (five application items, no analysis).
- **Mapping is judgment.** Where an item could sit under two bullets, the one its key
  turns on won. Three items on the board's "essential conditions" procedure (`d1_005`,
  `d1_023` and `d1_079`) went to 1A2c, not 1A7b, because the key is about
  what the board decides and how the chief audit executive answers a refusal, not about
  independence as such.

## 2. Where Part 1 stands against the gate

The sale gate was revised in round 14 (plan section 3, decision 4): two full forms of
distinct items per section (Part 1: A 88, B 50, C 74, D 38), one of them frozen and held
back, and a short mock drawn per learner from unseen items. Three forms (about 375) stay
the target as sources open. The "Three-form target" columns below track that target.

| Section | Items | Two-form bar (gate) | Three-form target | Gap to target | Bullets | Zero items | One item | Below depth |
|---|---|---|---|---|---|---|---|---|
| A Foundations | 116 | 88, met | 131 | 15 | 35 | 0 | 4 | 0 |
| B Ethics and Professionalism | 85 | 50, met | 75 | 0 (10 over) | 25 | 0 | 3 | 0 |
| C Governance, Risk Management, and Control | 105 | 74, met | 113 | 8 | 20 | 0 | 0 | 0 |
| D Fraud Risks | 42 | 38, met | 56 | 14 | 17 | 0 | 4 | 0 |
| **Part 1** | **348** | **250, met** | **375** | **37** | **97** | **0** | **11** | **0** |

(The full and short mock splits are the app's own sum, `allocate()` in
`data/cia/tools/cia_common.py`: 125 as 44/25/37/19 and 42 as 15/8/13/6.)

What the counts hide (after round 14):

- **Gates (a) and (b) are met.** Every bullet has an item at its verb's depth, and every
  section holds two full forms of distinct items. Gate (c) (the held-back full form and the
  per-learner short mock) is an app rule, checked when the packs are wired in (plan
  section 11).
- **One item (11):** A: 1A5a, 1A5f, 1A5g, 1A6d. B: 1B4e, 1B4f, 1B5b. D: 1D4b, 1D5b, 1D5c,
  1D5d (blocked: they need the IIA's members-only guides, which the owner decided on 25 Nov 2026 not to open, or the textbook). A bullet's only item stays out of
  the held-back form.
- **The opened sources are out of distinct lessons for Part 1.** Round 14 filled 6 of 22
  planned slots (13 written, 7 cut or left as repeats); round 13 kept 19 of 24. A third
  form needs new sources: the owner decided on 25 Nov 2026 not to join The IIA, so the
  members-only fraud guides (14 of D's 15) stay unopened; a textbook remains possible
  (1A4b, and more depth on the limited-source bullets).
- **Section C's bulk sits in four bullets**: 1C1a (10), 1C8a (9), 1C6a (8) and 1C5c (7).
- **Siblings to keep apart in one mock** are logged in each item's `_provenance` and in
  the plan's round write-ups (section 7).
- **No item carries a future `testable_from`**, so every item can enter a form today.

## 3. The map


### Section A table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 1A1a | What the function is for and what the organization gains from it | Explain (recall) | 3: d1_001, d1_053, d1_055 | 2/1/0 | yes | - |
| 1A1b | What has to be in place for internal audit to work well | Describe (recall) | 6: d1_002, d1_036, d1_037, d1_054, d1_065, d1_066 | 3/3/0 | yes | - |
| 1A2a | What internal audit is allowed to do, the part it plays and its duties | Describe (recall) | 4: d1_021, d1_086 (A1), d1_100 (A1), d1_111 | 2/2/0 | yes | - |
| 1A2b | How the chief audit executive helps the board set the mandate or refresh it | Explain (recall) | 4: d1_003 (A1), d1_022 (A1), d1_024 (A1), d1_067 | 1/3/0 | yes | - |
| 1A2c | What senior management and the board each decide about internal audit's authority and duties | Explain (recall) | 7: d1_004, d1_005 (A1), d1_023 (A1), d1_025 (A1), d1_077 (A1), d1_078 (A1), d1_079 (A1) | 2/2/3 | yes | - |
| 1A3a | The parts a charter must have under the Standards | Identify (recall) | 5: d1_006, d1_007, d1_038, d1_056, d1_068 | 3/2/0 | yes | - |
| 1A3b | Why the board and senior managers should talk the charter through | Recognize (recall) | 5: d1_039, d1_057, d1_080, d1_087, d1_088 | 1/4/0 | yes | - |
| 1A3c | Why the board has to approve it | Recognize (recall) | 2: d1_040, d1_058 | 0/2/0 | yes | - |
| 1A4a | What counts as an assurance service | Define (recall) | 3: d1_041, d1_060, d1_069 | 0/3/0 | yes | - |
| 1A4b | Limited assurance compared with reasonable assurance | Differentiate (apply) | 2: d1_009, d1_081 | 1/1/0 | yes | more needs beyond the glossary line: textbook |
| 1A4c | What counts as an advisory service | Define (recall) | 2: d1_043, d1_082 | 1/1/0 | yes | - |
| 1A4d | Who decides what an advisory job covers, and how | Describe (recall) | 3: d1_042, d1_051, d1_059 | 0/3/0 | yes | - |
| 1A4e | Picking the right kind of service for the situation in front of you | Determine (judge) | 3: d1_008, d1_044, d1_112; also touched by d1_014, d1_041, d3_049 | 0/1/2 | yes | - |
| 1A5a | Assessments of risks and of the controls over them | Describe (recall) | 1: d1_012 | 1/0/0 | yes | one item: cannot be held back; more needs detail: textbook |
| 1A5b | Audits of outside parties and of whether contracts are being followed | Describe (recall) | 2: d1_045, d1_099 | 1/1/0 | yes | more needs detail: Third-Party TR (testable 2027-03-01), PG Auditing Third-Party Risk Management |
| 1A5c | Audits of IT security and of privacy | Describe (recall) | 3: d1_046, d1_061, d1_116 | 0/3/0 | yes | - |
| 1A5d | Audits of performance and of quality | Describe (recall) | 2: d1_093, d1_094 | 1/1/0 | yes | more needs detail: textbook |
| 1A5e | Audits of operations, of financial matters and of compliance with regulations | Describe (recall) | 3: d1_011, d1_049, d1_070 | 1/2/0 | yes | - |
| 1A5f | Audits of the organization's culture | Describe (recall) | 1: d1_047 | 0/1/0 | yes | one item: cannot be held back; more needs detail: PG Auditing Culture; Org. Behavior TR (testable 2027-06-01) |
| 1A5g | Audits of how management reports are produced | Describe (recall) | 1: d1_048 | 0/1/0 | yes | one item: cannot be held back |
| 1A6a | Teaching others about risk and control | Describe (recall) | 2: d1_063, d1_096 | 0/2/0 | yes | - |
| 1A6b | Advising while a system is being designed and built | Describe (recall) | 3: d1_013, d1_014, d1_115 | 1/2/0 | yes | - |
| 1A6c | Helping with due diligence reviews | Describe (recall) | 2: d1_052, d1_098 | 1/1/0 | yes | more needs detail: textbook |
| 1A6d | Helping keep personal data private | Describe (recall) | 1: d1_095 | 1/0/0 | yes | one item: cannot be held back; more needs detail: PG Auditing Privacy and Data Protection Risks |
| 1A6e | Benchmarking against peers or good practice | Describe (recall) | 2: d1_050, d1_071 | 1/1/0 | yes | - |
| 1A6f | Helping management assess its own internal controls | Describe (recall) | 2: d1_010, d1_097 | 0/1/1 | yes | - |
| 1A6g | Mapping how a process flows | Describe (recall) | 2: d1_062, d1_104; also touched by d1_051 | 0/2/0 | yes | - |
| 1A7a | Reporting lines for the chief audit executive that do not fit the role | Identify (recall) | 6: d1_017 (A2), d1_026, d1_064 (A2), d1_074 (A2), d1_083 (A2), d1_091 (A2); also touched by d1_087, d2_022 | 1/4/1 | yes | - |
| 1A7b | The board's part in guarding independence | Describe (recall) | 5: d1_015 (A2), d1_029, d1_072, d1_073 (A2), d1_084 (A2); also touched by d1_005, d1_023 | 4/1/0 | yes | - |
| 1A7c | The chief audit executive's part: guarding independence day to day and telling the board when it is, or looks, impaired | Describe (recall) | 5: d1_028 (A2), d1_030 (A2), d1_101 (A2), d1_107 (A2), d1_114 (A2); also touched by d1_064 | 1/4/0 | yes | - |
| 1A7d | Budget limits that hold back internal audit's work | Identify (recall) | 3: d1_016 (A2), d1_090 (A2), d1_103 (A2) | 1/1/1 | yes | - |
| 1A7e | What happens when scope is limited or access is cut off | Describe (recall) | 5: d1_027 (A2), d1_089 (A2), d1_105 (A2), d1_106 (A2), d1_113 (A2); also touched by d1_069 | 0/5/0 | yes | - |
| 1A8a | The Three Lines Model and who sits where in it | Describe (recall) | 7: d1_018 (A3), d1_019 (A3), d1_031 (A3), d1_034 (A3), d1_075 (A3), d1_076, d1_085 (A3) | 1/5/1 | yes | - |
| 1A8b | First and second line duties that would weaken independence if auditors took them on | Identify (recall) | 5: d1_035 (A3), d1_092 (A3), d1_102 (A3), d1_108 (A3), d1_109 (A3); also touched by d1_032, d3_014 | 3/1/1 | yes | - |
| 1A8c | Safeguards for when auditors do, or seem to do, first or second line work | Describe (recall) | 4: d1_020 (A3), d1_032 (A3), d1_033 (A3), d1_110 (A3); also touched by d1_092, d3_098 | 1/3/0 | yes | - |

### Section B table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 1B1a | Telling the truth and speaking up when that is uncomfortable | Describe (recall) | 5: d2_001, d2_031, d2_042, d2_053, d2_054; also touched by d2_036 | 0/5/0 | yes | - |
| 1B1b | Staying inside the law and the profession's expectations, whatever the setting | Describe (recall) | 6: d2_002, d2_003, d2_032, d2_041, d2_043, d2_066 | 1/4/1 | yes | - |
| 1B2a | How reviewing your own earlier work, or being too close to the people involved, affects an engagement | Evaluate (judge) | 7: d2_004, d2_005 (A4), d2_007 (A4), d2_024 (A4), d2_025 (A4), d2_071 (A4), d2_074 (A4); also touched by d3_084 | 1/3/3 | yes | - |
| 1B2b | Situations that can create a conflict of interest | Analyze (judge) | 4: d2_006, d2_023 (A4), d2_056 (A4), d2_067 (A4) | 0/1/3 | yes | - |
| 1B3a | When moving an auditor to a different assignment is the right call | Assess (judge) | 3: d2_033, d2_045, d2_058 | 0/1/2 | yes | - |
| 1B3b | When to bring in an outside party to perform or supervise the work | Assess (judge) | 2: d2_009, d2_046 | 0/0/2 | yes | - |
| 1B3c | When an impairment has to be disclosed | Determine (judge) | 4: d2_010, d2_021 (A4), d2_034, d2_044; also touched by d2_046 | 0/2/2 | yes | - |
| 1B3d | When to say no to a favor, a gift or a reward | Recognize (recall) | 3: d2_008, d2_035, d2_057 | 0/3/0 | yes | - |
| 1B4a | Writing and speaking clearly, from short messages to reports and presentations | Apply (apply) | 3: d2_036, d2_069, d2_072 | 0/2/1 | yes | - |
| 1B4b | Reasoning through a messy problem to a workable, sometimes new, answer | Apply (apply) | 2: d2_076, d2_084; also touched by d2_068 | 0/2/0 | yes | - |
| 1B4c | Digging into an unfamiliar subject using more than one kind of source | Apply (apply) | 2: d2_077, d2_085 | 0/2/0 | yes | - |
| 1B4d | Winning agreement: persuading, negotiating and settling disagreements with colleagues and stakeholders | Apply (apply) | 3: d2_013, d2_048, d2_068 | 0/3/0 | yes | - |
| 1B4e | Becoming someone people trust and take seriously | Apply (apply) | 1: d2_037 | 0/1/0 | yes | one item: cannot be held back |
| 1B4f | Handling change well as things around you shift | Apply (apply) | 1: d2_078; also touched by d2_012 | 0/1/0 | yes | one item: cannot be held back |
| 1B4g | Curiosity: asking one more question and learning as a habit | Demonstrate (apply) | 2: d2_059, d2_083 | 0/2/0 | yes | - |
| 1B4h | Signs that an auditor needs more professional development | Evaluate (judge) | 4: d2_012, d2_049, d2_060, d2_079 | 1/2/1 | yes | - |
| 1B5a | Care includes thinking about what the organization is trying to achieve | Recognize (recall) | 2: d2_061, d2_080 | 0/2/0 | yes | - |
| 1B5b | Care includes judging how well governance, risk management and controls work | Recognize (recall) | 1: d2_075 | 0/1/0 | yes | one item: cannot be held back |
| 1B5c | Care includes weighing what an engagement costs against what it is likely to deliver | Recognize (recall) | 2: d2_014, d2_050; also touched by d2_062 | 1/1/0 | yes | - |
| 1B5d | Care includes thinking about how likely major errors, fraud or noncompliance are | Recognize (recall) | 2: d2_015, d2_081; also touched by d2_039 | 0/2/0 | yes | - |
| 1B5e | Skepticism: an open but questioning mind about whether information can be trusted | Recognize (recall) | 3: d2_016, d2_040, d2_052 | 0/3/0 | yes | - |
| 1B6a | Following the organization's policies and the laws that apply | Apply (apply) | 3: d2_018 (A5), d2_027 (A5), d2_070 (A5); also touched by d2_020 | 0/2/1 | yes | - |
| 1B6b | Following the function's own methodology for handling information | Apply (apply) | 2: d2_020 (A5), d2_082 (A5); also touched by d2_065 | 0/1/1 | yes | - |
| 1B6c | Respecting privacy and who owns the information | Demonstrate (apply) | 4: d2_017, d2_028 (A5), d2_030 (A5), d2_064 (A5) | 1/3/0 | yes | - |
| 1B6d | Protecting information in suitable ways | Apply (apply) | 5: d2_019, d2_026 (A5), d2_029, d2_063 (A5), d2_073 (A5); also touched by d2_018, d2_027 | 1/3/1 | yes | - |
| 1B2 (line) | Topic line only: other bias and the objectivity/independence split | topic line | 2: d2_022 (A4), d2_055 (A4) | 0/2/0 | - | - |
| 1B4 (line) | Topic line only: having or obtaining the competencies (developed or procured) | topic line | 3: d2_011, d2_038, d2_047 | 0/3/0 | - | - |
| 1B5 (line) | Topic line only: other parts of Standard 4.2 (stakeholders, extent and timeliness, relative significance, conformance) | topic line | 4: d2_039, d2_051, d2_062, d2_065 | 0/4/0 | - | - |

### Section C table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 1C1a | Who does what: the board, senior management, internal audit and other assurance providers | Describe (recall) | 10: d3_001, d3_002, d3_021, d3_041, d3_043, d3_053, d3_059, d3_067, d3_076, d3_097; also touched by d1_019, d1_022, d1_034 | 4/6/0 | yes | - |
| 1C1b | Well-known frameworks, principles and models for governance | Recognize (recall) | 6: d3_022, d3_042, d3_071, d3_077, d3_078, d3_096; also touched by d3_025 | 1/5/0 | yes | - |
| 1C2a | The meaning of culture and of the control environment | Define (recall) | 2: d3_003, d3_102 | 2/0/0 | yes | - |
| 1C2b | The meaning of risks and controls at engagement level | Define (recall) | 3: d3_004, d3_024, d3_090 | 2/1/0 | yes | - |
| 1C2c | How the way decisions get made shapes governance, risk management and control | Recognize (recall) | 4: d3_005, d3_023, d3_025, d3_066 | 0/4/0 | yes | - |
| 1C3a | Ethical, legal and compliance rules an organization must meet | Identify (recall) | 5: d3_006, d3_044, d3_065, d3_072, d3_079; also touched by d2_066 | 3/2/0 | yes | - |
| 1C3b | Where the internal auditor fits in the organization's ethics framework | Recognize (recall) | 6: d3_007, d3_026, d3_027, d3_054, d3_068, d3_105; also touched by d2_002, d2_041, d3_044 | 0/6/0 | yes | - |
| 1C4a | Telling the main risk types apart: strategic, financial, operational, reputational and compliance risk, plus sustainability, environmental and social responsibility risk | Differentiate (apply) | 6: d3_008, d3_028, d3_056, d3_070, d3_080, d3_093 | 1/5/0 | yes | - |
| 1C4b | Inherent risk compared with residual risk | Compare and contrast (apply) | 6: d3_009, d3_029, d3_045, d3_046, d3_055, d3_074 | 1/5/0 | yes | - |
| 1C5a | What risk management is | Define (recall) | 3: d3_030, d3_047, d3_082; also touched by d3_081 | 1/2/0 | yes | - |
| 1C5b | Risk appetite and risk tolerance, and how to spot each | Recognize (recall) | 4: d3_010, d3_031, d3_094, d3_104; also touched by d3_001 | 0/4/0 | yes | - |
| 1C5c | The steps of the risk management cycle, and how sound each one is | Assess (judge) | 7: d3_011, d3_081, d3_083, d3_087, d3_095, d3_099, d3_101 | 0/6/1 | yes | - |
| 1C5d | Whether the organization's responses to its risks are good ones | Evaluate (judge) | 6: d3_012, d3_032, d3_033, d3_048, d3_057, d3_092; also touched by d3_030 | 0/3/3 | yes | - |
| 1C6a | Judging how well risk management is designed and how well it works | Evaluate (judge) | 8: d3_013, d3_035, d3_050, d3_058, d3_069, d3_075, d3_091, d3_103; also touched by d3_059 | 3/3/2 | yes | - |
| 1C6b | Why a risk management framework is worth using | Describe (recall) | 2: d3_034, d3_088 | 1/1/0 | yes | - |
| 1C7a | What internal controls are for | Describe (recall) | 4: d3_015, d3_036, d3_061, d3_084; also touched by d3_086 | 1/3/0 | yes | - |
| 1C7b | Control types (preventive, detective, corrective) and how to judge them | Describe and evaluate (judge) | 4: d3_016, d3_037, d3_060, d3_100; also touched by d3_089 | 1/2/1 | yes | - |
| 1C7c | Suggesting controls that fit the risk | Recommend (apply) | 5: d3_017, d3_038, d3_051, d3_062, d3_089 | 0/5/0 | yes | - |
| 1C8a | Reviewing whether controls are well designed and working | Review (apply) | 9: d3_018, d3_019, d3_039, d3_040, d3_052, d3_063, d3_073, d3_085, d3_086 | 3/6/0 | yes | - |
| 1C8b | Why an internal control framework is worth using | Describe (recall) | 2: d3_020, d3_064 | 0/2/0 | yes | - |
| 1C6 (line) | Topic line only: internal audit's own part in risk management (advise, not own) | topic line | 3: d3_014, d3_049, d3_098 | 0/3/0 | - | - |

### Section D table

| Bullet | Covers (our words) | Verb (class) | Items | F/Ap/An | Depth met? | Gap |
|---|---|---|---|---|---|---|
| 1D1a | The three sides of the fraud triangle: opportunity, motivation and rationalization | Describe (recall) | 2: d4_002, d4_021 | 2/0/0 | yes | - |
| 1D1b | Spotting where fraud could happen | Recognize (recall) | 2: d4_001 (C3), d4_004 | 0/2/0 | yes | - |
| 1D1c | Fraud schemes that come up often | Identify (recall) | 2: d4_003 (C3), d4_022 (C3) | 0/2/0 | yes | more needs named schemes: PG Internal Auditing and Fraud (3rd ed.), textbook |
| 1D2a | Thinking about fraud risk while planning the work | Recognize (recall) | 4: d4_005, d4_006, d4_008, d4_039; also touched by d4_004 | 0/3/1 | yes | - |
| 1D2b | Judging which processes are most exposed to fraud | Assess (judge) | 4: d4_007, d4_029, d4_035, d4_036; also touched by d4_023 | 0/2/2 | yes | more needs beyond Standard 13.2: PG Engagement Planning: Assessing Fraud Risks |
| 1D3a | Judging how the organization manages fraud risk | Evaluate (judge) | 4: d4_009, d4_010, d4_030, d4_042 | 0/2/2 | yes | more needs beyond Standard 9.4 and the 2019 position paper: PG Internal Auditing and Fraud |
| 1D3b | Finding and weighing red flags, organization-wide and inside a process | Detect and assess (judge) | 3: d4_011, d4_024, d4_025 | 0/2/1 | yes | more needs red-flag lists: PG Internal Auditing and Fraud |
| 1D3c | The auditor's part in reporting red flags found during the work | Recognize (recall) | 3: d4_012, d4_031, d4_037 | 0/3/0 | yes | - |
| 1D4a | How tone at the top changes the chance of fraud | Recognize (recall) | 3: d4_016, d4_033, d4_040 | 1/2/0 | yes | - |
| 1D4b | Using segregation of duties properly | Recognize (recall) | 1: d4_015; also touched by d4_002 | 0/1/0 | yes | one item: cannot be held back; more needs beyond the syllabus line: PG Internal Auditing and Fraud, textbook |
| 1D4c | How approval and authority limits help stop fraud | Recognize (recall) | 3: d4_014, d4_034, d4_041 | 0/3/0 | yes | - |
| 1D4d | Common detective controls: reconciliations, supervisor reviews and whistleblower hotlines | Recognize (recall) | 2: d4_013, d4_026 | 2/0/0 | yes | - |
| 1D5a | What internal audit does, and does not do, in a fraud investigation | Define (recall) | 3: d4_017, d4_018, d4_020; also touched by d4_010, d4_028 | 2/1/0 | yes | - |
| 1D5b | Ways to interview people | Describe (recall) | 1: d4_027 | 0/1/0 | yes | one item: cannot be held back; more needs PG Internal Auditing and Fraud, textbook |
| 1D5c | Ways to investigate | Describe (recall) | 1: d4_028 | 0/1/0 | yes | one item: cannot be held back; more needs PG Internal Auditing and Fraud, textbook |
| 1D5d | Ways to test for fraud | Describe (recall) | 1: d4_023 | 0/1/0 | yes | one item: cannot be held back; more needs PG Internal Auditing and Fraud, textbook |
| 1D5e | Working alongside fraud investigators and drawing on what they hold: whistleblower complaints, trends, past cases and their risk assessments | Recognize (recall) | 3: d4_019, d4_032, d4_038 | 0/3/0 | yes | - |

## 4. Section totals and where the remaining items go

Fewest items and unmet depth first; Challenge topics (1A2, 1A7, 1A8, 1B2, 1B6) to the
upper end of their share, because the Challenge pack's section A draws only on them
(plan section 4). Every count below is a ceiling for distinct lessons, not a quota: if
no distinct lesson is left, the slot stays empty (never padding), and second items on one
lesson follow the sibling rule (at most two per lesson, about 15% of a section).

| Section | Now | Bar | Gap | Where the items go |
|---|---|---|---|---|
| A | 116 | 131 | 15 | Toward the three-form target only, from new sources or new lessons: round 14 found no lesson left on 1A1a, 1A4e, 1A3c, 1A4c, 1A6e or 1A2a in the opened sources. Leads for later: an independence problem found after an engagement closes (Standard 7.1 considerations); a request to add scope as a possible scope limitation (Standard 13.3 considerations). 1A4b: the textbook. |
| B | 85 | 75 | 0 | Met. 1B4e, 1B4f and 1B5b keep one item each unless a new lesson appears. |
| C | 105 | 113 | 8 | Toward the target only: round 14 found no lesson left on 1C6b, 1C8b, 1C2b, 1C5a, 1C2c, 1C6a or 1C7b, and cut a 1C7c analysis item as a giveaway. |
| D | 42 | 56 | 14 | **From opened sources:** none left (round 15 added the second 1D3a analysis item, `cia1_d4_042`). **Blocked (14):** 1D1c +3, 1D5b +3, 1D5c +3, 1D5d +2, 1D3b +2, 1D4b +1. |

**Section D's blocked bullets and the guide each needs.** The opened sources for D are
the Standards (glossary "fraud", 4.2, 9.4, 13.2, 3.1, 6.1), the syllabus lines (plan 8b:
the triangle's three names, authority levels as preventing fraud, hotlines,
reconciliations and supervisory reviews as detecting it) and the 2019 position paper
on fraud (Verified). The COSO and ACFE Fraud Risk Management Guide summary and the 2026
IIA and Anti-Fraud Collaboration white paper are background only and carry no key.

| Bullet | What waits | Needs |
|---|---|---|
| 1D1c | Named schemes (any scheme past the glossary's "fraud" and the two classification items) | IIA Global PG: Internal Auditing and Fraud, 3rd ed. (members only, reference 24); textbook (for purchase) |
| 1D2b | Exposure factors past Standard 13.2 and 4.2 (which processes are typically most exposed, and why) | IIA Global PG: Engagement Planning: Assessing Fraud Risks (members only, reference 4) |
| 1D3a | Parts of a fraud risk management program past Standard 9.4 and the position paper | IIA Global PG: Internal Auditing and Fraud, 3rd ed. |
| 1D3b | Red-flag lists at organization and process level | IIA Global PG: Internal Auditing and Fraud, 3rd ed. |
| 1D4b | Proper use of segregation of duties past the syllabus line (which duties to split, compensating checks) | IIA Global PG: Internal Auditing and Fraud, 3rd ed.; textbook |
| 1D5b, 1D5c, 1D5d | Interviewing technique, investigation steps, chain of custody, fraud testing methods | IIA Global PG: Internal Auditing and Fraud, 3rd ed.; textbook |

Those two practice guides are members only, and the owner decided on 25 Nov 2026 not to
join The IIA (plan section 9): these bullets stay blocked unless a textbook covers them.

## 5. Gap list in priority order

The sale gate's counts are met (section 2). What is left serves the three-form target:

1. **Section D from opened sources**: done in round 15 (`cia1_d4_042`).
2. **Blocked on sources (14 D items, plus 1A4b)**: 1D1c, 1D3b, 1D4b, 1D5b, 1D5c, 1D5d
   (the IIA's members-only guides, which stay unopened: no IIA membership, decided 25 Nov
   2026); 1A4b (textbook). Only a textbook purchase could open any of them (plan section 9).
3. **Sections A and C**: only from a lesson the bank does not yet teach (the leads in
   section 4), or from new sources.
4. **One-item bullets (11)**: only with a new lesson.

Part 1 authoring now moves to the Part 2 notes and items (plan, "Next step"); log any Part 1
lesson found there for a later round.

## 6. Leads for first items and siblings

Leads only, for the next authors: none is an item, and every one must be checked against
the opened source before a key rests on it. "Existing" names the item already on the
bullet and its runner-up, so the new item takes a different trap (sibling rule).

**Zero-item bullets (first items)**

- **1A5d Performance and quality audits.** (1) An audit committee chair asks for
  confidence that a hospital's discharge times meet the targets management set and
  reports. Key: an assurance engagement on performance, with management's targets as
  criteria if adequate (glossary "assurance services"; Standard 13.4; syllabus line).
  Runner-up: external benchmarking as advisory work (a comparison, not a conclusion
  against criteria). (2) A food plant's quality manager says internal audit need not
  audit quality because the quality team already checks it. Key: internal audit may
  still assure it and relies on the team's work only after evaluating it (Standard 9.5;
  Three Lines Statement of Position, 2026). Runner-up: accept the quality team's reports
  as internal audit's assurance.
- **1A6d Data privacy role.** (1) A project manager asks the internal auditor to confirm,
  before launch, that a loyalty app's consent screens meet the law. Key: advise on
  privacy risks and whether planned controls meet law and policy, giving no conclusion;
  the privacy owner decides (glossary "advisory services"; syllabus line; notes 1A6.2).
  Runner-up: sign off the screens as compliant (assurance under another name). (2) The
  chief audit executive is asked to give an auditor a vote on the privacy project board.
  Key: adviser without a vote; if assurance follows, the chief audit executive confirms
  objectivity first (Standard 2.2). Runner-up: vote, since the charter covers advisory
  work. Mind the overlap with `d1_013`'s lesson: use a different runner-up there.
- **1B4b Critical thinking and problem solving.** (1) A register rates a risk low, but the
  auditor finds the same root cause behind failures in two units. Key: judge significance
  with knowledge, experience and critical thinking, taking management's input (Standard
  13.2, considerations). Runner-up: keep the register's rating because management owns it.
  (2) A finding with no single clear fix: present several options, or suggest management
  research them (Standard 14.4, considerations). Runner-up: the auditor designs the fix.
  Keep it apart from `d3_051` (request an action plan) by actor and facts.
- **1B4c Research.** (1) First engagement on a new kind of activity (drone inspections, say)
  with thin management criteria. Key: research recommended practice, compare with
  other organizations' criteria, then agree criteria with management (Standard 13.4,
  considerations). Runner-up: use the vendor's specifications or the manager's untested
  targets. (2) Actor: the chief audit executive preparing a mandate discussion, sharing
  research into leading practice of internal audit functions (Standard 6.1,
  considerations). Runner-up: cite only the Standards' minimum.
- **1B4f Change management.** (1) A merger is announced mid-year. Key: the chief audit
  executive joins the organization's change communication channels and updates the plan
  in time, with the board (Standard 9.4 requirement, plan dynamic; Standard 11.1,
  considerations: regular communication promotes adaptability). Runner-up: finish the
  approved plan and reflect the merger next year. Keep it at plan level and the chief
  audit executive's seat, apart from `d2_061` (engagement level, strategy change).
- **1B5b Care weighs governance, risk management and control.** (1) Planning a branch
  engagement, the auditor learns the branch's control self-assessment was found
  unreliable last year. Key: due care weighs how adequate those processes are when
  scoping, so no reliance on the self-assessment and more testing (Standard 4.2
  requirement list). Runner-up: use the current self-assessment because it is the latest.
  (2) Actor: the chief audit executive; the board never reviews risk reports. Key: that
  governance weakness belongs in the plan's risk assessment (Standard 4.2,
  considerations; Standard 9.1). Runner-up: governance is the board's own business.

**Bullets below their verb's depth (analysis items)**

- **1B4h.** Existing: `d2_012` (runner-up: certification hours already met), `d2_049`,
  `d2_060`. Lead: four internal auditors' situations, one of which MOST shows a
  development need, including the chief audit executive, whose own competencies Standard
  3.2 also covers. Runner-up: an auditor with a skill gap on work they will not do this
  year.
- **1C5c.** Existing: five single-fault items (`d3_011`, `d3_081`, `d3_083`, `d3_087`,
  `d3_095`). Lead: two real faults, one causing the other (a lapsed response nobody
  monitored, which then never reached the board report). Key: the element where the
  fault starts (monitor), by the five elements of the 2026 Statement of Position on
  enterprise risk management. Runner-up: the visible symptom (report). Differs from
  `d3_087` by asking for a ranking.
- **1C7b.** Existing: `d3_016`, `d3_037`, `d3_060`. Lead: a payment process with a
  preventive limit and a monthly detective review; a loss came through split payments
  under the limit. Key: the fix that reaches that route at a cost in proportion to it,
  weighing both types (glossary "control"; Standard 13.2, considerations). Runner-up:
  "prevention always beats detection". Plan 8b: no key on directive or corrective against
  a plausible preventive or detective.
- **1D2b** (also one item). Existing: `d4_007` (an auditor ranks four processes; runner-up
  untested approvals). Lead: new actor and level: the chief audit executive building the
  plan (Standard 9.4: consider coverage of fraud risk) compares a process where one senior
  manager can override approvals unreviewed with a high-volume process under automated
  checks. Key: the override exposure (Standards 13.2 and 4.2). Runner-up: the biggest
  volume is the biggest exposure.
- **1D3a.** Existing: `d4_009` (response plan), `d4_010` (internal audit's part). Lead:
  policy, hotline and response plan exist, but nobody has looked again at fraud risk since
  a new business line started; which gap MOST weakens the program. Key: rest it on the
  2019 position paper only if it says so (open it first; COSO's guide is background).
  Runner-up: promote the hotline more.

**One-item bullets (siblings)**

- **1A5a.** Existing `d1_012` (runner-up: policy testing). Sibling: a board member wants
  assurance on a process not yet live. Key: only design can be judged yet (Standard 13.2,
  considerations). Runner-up: test operation on test data and call it operating
  effectiveness.
- **1A5b.** Existing `d1_045` (runner-up: market rates). Sibling: the contract has no
  right-to-audit clause and the carrier refuses records. Key: a scope limitation,
  discussed with management and, if unresolved, taken by the chief audit executive to
  the board (Standard 13.3), then explained in the final communication (Standard 15.1).
  Runner-up: conclude from the carrier's own summary. Keep it apart from `d1_027` and
  `d1_089` (internal refusals) by the contract fact. Avoid
  resting it on the Third-Party Topical Requirement (testable 2027-03-01).
- **1A5f.** Existing `d1_047` (runner-up: the near-miss process). Sibling: a director
  proposes a staff survey as "the culture audit". Key: a survey is one source; the
  engagement assesses the processes that set and monitor behavior (glossary; Standard 9.1:
  how the organization promotes an ethical culture). Runner-up: survey alone. Set
  `testable_from` if it leans on the Organizational Behavior Topical Requirement.
- **1A5g.** Existing `d1_048` (runner-up: operational audit). Sibling: a chief financial
  officer says the external audit opinion already covers the board pack's measures. Key:
  nonfinancial measures in management reports sit outside that opinion; an audit of the
  management reporting process answers it (syllabus line; notes 1A5.2 and 1A5.4).
  Runner-up: rely on the external auditor.
- **1A6a.** Existing `d1_063` (runner-up: owning a program). Sibling: during a training
  session a branch manager asks the auditor to write the branch's control procedures.
  Key: explain the principles; management writes and owns them (glossary "advisory
  services": no management responsibility). Runner-up: write them, "as advisory work".
- **1A6c.** Existing `d1_052` (runner-up: concluding on the target's controls). Sibling:
  after the deal closes, the plan includes assurance on the acquired unit, and the same
  auditor did the due diligence. Key: the chief audit executive confirms objectivity and
  staffs it accordingly (Standard 2.2). Runner-up: assurance can never follow. Distinct
  from `d1_014` by service (due diligence, not system design) and actor.
- **1A6f.** Existing `d1_010` (runner-up: a caveated conclusion). Sibling: the chief audit
  executive plans to use the results of a self-assessment internal audit facilitated. Key:
  rely only after evaluating that work (Standard 9.5; notes 1A6.1). Runner-up: rely fully
  because internal audit ran the workshop.
- **1A6g.** Existing `d1_062` (runner-up: map as advisory). Sibling: a map delivered as
  advice shows a missing approval. Key: point it out and report a significant risk;
  management redesigns (glossary; see `d1_043` for the reporting duty). Runner-up: the
  auditor redraws the process with the control in it.
- **1B4e.** Existing `d2_037` (runner-up: keep only formal contact). Sibling: a new
  auditor keeps agreeing with a manager's views to win trust. Key: trust comes from
  open, honest communication and kept commitments (Standard 11.1, requirement to build
  relationships and trust). Runner-up: soften points to keep goodwill.
- **1B4g.** Existing `d2_059` (runner-up: test paid invoices). Sibling: actor the chief
  audit executive, setting team targets. Key: encourage curiosity and invest in learning
  (Standard 3.1, considerations; Standard 4.3, considerations: skepticism needs
  curiosity). Runner-up: rate auditors only on engagements closed on time.
- **1B5a.** Existing `d2_061` (runner-up: keep the approved plan). Sibling: the chief audit
  executive and a new strategic objective (entering a new country). Key: the plan's risk
  assessment takes in strategy and objectives (Standard 4.2, considerations; Standard
  9.1). Runner-up: judge whether the strategy is wise (the board's and management's call).
- **1B5d.** Existing `d2_015` (runner-up: one missed error proves no care). Sibling: the
  period under review includes a system cutover. Key: a higher probability of significant
  errors calls for more testing around it (Standard 4.2). Runner-up: last year's clean
  result shows low probability. Keep fraud out (that is 1D2).
- **1B6b** (Challenge A5). Existing `d2_020` (court order; runner-up: copy at release).
  Sibling: the external auditor asks an internal auditor directly for workpapers. Key:
  release follows the function's methodology for releasing engagement records (Standard
  5.2 requirement). Runner-up: share freely because the chief audit executive
  coordinates with the external auditor (Standard 9.5).
- **1C2a.** Existing `d3_003` (runner-up: a count of reports). Sibling: a strong written
  code and policies sit beside leaders who skip approvals. Key: the control environment
  is weak whatever the documents say (Standard 9.1: how the organization promotes an
  ethical culture; Standard 11.1, considerations, on the control environment).
  Runner-up: rate it strong because the policies are complete. Watch the overlap with
  `d4_016` (tone at the top, fraud) by keeping fraud out.
- **1D3c.** Existing `d4_012` (runner-up: senior management). Sibling: a red flag found
  mid-engagement that cannot wait for the final communication. Key: raise it promptly
  through the chief audit executive (Standard 13.1, considerations: issues needing
  immediate attention). Runner-up: hold it for the final report.
- **1D4a.** Existing `d4_016` (runner-up: a signed code). Sibling: actor the board; a new
  chief executive rewards sales targets and ignores how they are met. Key: raises the
  likelihood of fraud (syllabus line). Runner-up: tone matters only for controls already
  written down.
- **1D4c.** Existing `d4_014` (runner-up: a reconciliation). Sibling: an approval limit
  that exists only in the policy manual, while the payment system lets any clerk release
  any amount. Key: the limit cannot prevent fraud as designed, because nothing enforces
  it (syllabus line; glossary "control"). Runner-up: it is preventive because it is
  written down. Keep it apart from `d3_060` (a board approval classed as preventive).
- **1D5e.** Existing `d4_019` (runner-up: investigators' findings replace assurance).
  Sibling: actor the chief audit executive using hotline complaint trends in the yearly
  plan (Standard 9.4; Standard 11.1, considerations: input on fraud). Runner-up: complaints
  belong to the investigators, so internal audit leaves them alone.

## 7. Notes for the next round

- **Hardening candidates on depth.** 1C5c now has one analysis item (round 12) and 1C7c's
  five are all application; one analysis rewrite in 1C7c would lift depth without a new
  lesson (plan section 6b, rule 12, says hardening comes after new items).
- **Challenge tag check (for `cia-challenge-bridge-expert`).** The Challenge-only bullet
  covers the fraud triangle as well as schemes, but `d4_002` and `d4_021` (triangle) carry
  no `C3` tag; only `d4_001`, `d4_003` and `d4_022` do.
- **Topic-line items.** Nine items (B 9: `d2_011`, `d2_022`, `d2_038`, `d2_039`, `d2_047`,
  `d2_051`, `d2_055`, `d2_062`, `d2_065`) and three in C (`d3_014`, `d3_049`, `d3_098`)
  test their topic line, not a lettered bullet. They are fair game (the bullets are not a
  closed list) but do not close any bullet gap.
- Re-run this map after each round: the item mapping lives in the round's notes, and a
  new item's bullet should be set in the scaffold step before it is written.
