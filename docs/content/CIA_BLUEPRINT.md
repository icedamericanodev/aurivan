# CIA blueprint: The IIA's Certified Internal Auditor exams

**Status:** facts opened and recorded 19 Nov 2026. Four exams, four KaiSip
packs: `cia1`, `cia2`, `cia3` (the three-part route) and `ciac` (the CIA
Challenge Exam). Plan and resume point: `docs/content/CIA_BANK_PLAN.md`.
Sources and what could not be opened: `docs/content/CIA_RESEARCH_LOG.md`.
The Challenge map: `docs/content/CIA_CHALLENGE_MAP.md`. The long, verified
lens: `docs/content/CIA_LENS.md`.

KaiSip is an independent study aid. It is not affiliated with, sponsored,
endorsed or licensed by The Institute of Internal Auditors (The IIA). This
document uses KaiSip's own short titles and its own wording for every topic.
For the official wording, open The IIA's syllabus files (linked below). The
IIA's text is never pasted here or stored in the repository.

## The four exams

| Pack | Exam | Questions | Minutes | Sections and weights |
|---|---|---|---|---|
| cia1 | CIA Part 1: Internal Audit Fundamentals (also the Internal Audit Practitioner exam) | 125 | 150 | A Foundations of Internal Auditing 35% · B Ethics and Professionalism 20% · C Governance, Risk Management, and Control 30% · D Fraud Risks 15% |
| cia2 | CIA Part 2: Internal Audit Engagement | 100 | 120 | A Engagement Planning 50% · B Information Gathering, Analysis, and Evaluation 40% · C Engagement Supervision and Communication 10% |
| cia3 | CIA Part 3: Internal Audit Function | 100 | 120 | A Internal Audit Operations 25% · B Internal Audit Plan 15% · C Quality of the Internal Audit Function 15% · D Engagement Results and Monitoring 45% |
| ciac | CIA Challenge Exam (one exam for every pathway; current syllabus effective 1 June 2026) | 150 | 180 | A Internal Audit Professionalism and Quality 20% · B Internal Audit Operations and Audit Plan 15% · C Engagement Planning 20% · D Engagement Performance 25% · E Engagement Results and Monitoring 20% |

All four give 1.2 minutes a question. The IIA calls the top level "Sections";
in KaiSip's files a section is a "domain" (Section A is `d1.json`).

**There is no separate Challenge Exam for CISA holders.** The IIA runs one
Challenge Exam with one syllabus (effective 1 June 2026), and every pathway
follows the same content: active CISA holders, approved CPA and CA holders,
and a pilot for professionals with 10 or more years of experience. KaiSip's Challenge pack is that one exam, with
a "coming from CISA" bridge as its own addition.

**40 of the 62 three-part topics are also the Challenge Exam's 40 topics,
word for word** (KaiSip's line-by-line comparison of the opened files, not an
IIA statement): all 17 topics of Part 2, all 18 of Part 3 and 5 of Part 1's
27. One Challenge bullet has no twin in the Part topic it sits beside (fraud
basics, under planning). Details: `docs/content/CIA_CHALLENGE_MAP.md`.

## Exam facts

Every fact below is an entry in `data/cia/shared/currency.json` with its
source and the date it was last checked. `data/cia/tools/check_currency.py`
warns when a fact has not been re-checked for 60 days and fails at 120. This
table is written from that file; when a fact changes, change the file and
rebuild the table.

| Fact | Value | Source (opened unless marked) | Checked |
|---|---|---|---|
| Part 1 has 125 multiple-choice questions | 125 | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| Part 1 allows 150 minutes | 150 | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| Part 1 is titled Internal Audit Fundamentals | Internal Audit Fundamentals | [2025-cia-part-1--syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf) | 2026-11-19 |
| Part 1 section weights in percent | A 35, B 20, C 30, D 15 | [2025-cia-part-1--syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf) | 2026-11-19 |
| Part 1 section names | A Foundations of Internal Auditing, B Ethics and Professionalism, C Governance, Risk Manag | [2025-cia-part-1--syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf) | 2026-11-19 |
| Part 1 numbered topics per section (counted from the file) | A 8, B 6, C 8, D 5 | [2025-cia-part-1--syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf) | 2026-11-19 |
| Part 1 syllabus file is labeled V2.09.2024 FINAL (Expanded Test Specifications, copyright 2024) | V2.09.2024 FINAL | [2025-cia-part-1--syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf) | 2026-11-19 |
| Part 2 has 100 multiple-choice questions | 100 | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| Part 2 allows 120 minutes | 120 | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| Part 2 is titled Internal Audit Engagement | Internal Audit Engagement | [cia-part-2-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf) | 2026-11-19 |
| Part 2 section weights in percent | A 50, B 40, C 10 | [cia-part-2-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf) | 2026-11-19 |
| Part 2 section names | A Engagement Planning, B Information Gathering, Analysis, and Evaluation, C Engagement Sup | [cia-part-2-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf) | 2026-11-19 |
| Part 2 numbered topics per section (counted from the file) | A 7, B 8, C 2 | [cia-part-2-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf) | 2026-11-19 |
| Part 2 syllabus file is labeled V2.09.2024 FINAL (Expanded Test Specifications, copyright 2024) | V2.09.2024 FINAL | [cia-part-2-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf) | 2026-11-19 |
| Part 3 has 100 multiple-choice questions | 100 | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| Part 3 allows 120 minutes | 120 | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| Part 3 is titled Internal Audit Function | Internal Audit Function | [cia-part-3-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf) | 2026-11-19 |
| Part 3 section weights in percent | A 25, B 15, C 15, D 45 | [cia-part-3-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf) | 2026-11-19 |
| Part 3 section names | A Internal Audit Operations, B Internal Audit Plan, C Quality of the Internal Audit Functi | [cia-part-3-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf) | 2026-11-19 |
| Part 3 numbered topics per section (counted from the file) | A 4, B 3, C 3, D 8 | [cia-part-3-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf) | 2026-11-19 |
| Part 3 syllabus file is labeled V2.09.2024 FINAL (Expanded Test Specifications, copyright 2024) | V2.09.2024 FINAL | [cia-part-3-syllabus.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf) | 2026-11-19 |
| The Internal Audit Practitioner exam is CIA Part 1; an active IAP holder gets a waiver for Part 1 and sits Parts 2 and 3 only | True | [iap](https://www.theiia.org/en/certifications/iap/) | 2026-11-19 |
| The Challenge Exam has 150 multiple-choice questions | 150 | [challenge-exam](https://www.theiia.org/en/certifications/cia/challenge-exam/) | 2026-11-19 |
| The Challenge Exam allows 180 minutes | 180 | [challenge-exam](https://www.theiia.org/en/certifications/cia/challenge-exam/) | 2026-11-19 |
| Challenge Exam section weights in percent | A 20, B 15, C 20, D 25, E 20 | [oct-2025-challenge-exam-syllabus-v2.pdf](https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf) | 2026-11-19 |
| Challenge Exam section names | A Internal Audit Professionalism and Quality, B Internal Audit Operations and Audit Plan,  | [oct-2025-challenge-exam-syllabus-v2.pdf](https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf) | 2026-11-19 |
| Challenge Exam numbered topics per section (counted from the file; 40 in all) | A 8, B 7, C 7, D 10, E 8 | [oct-2025-challenge-exam-syllabus-v2.pdf](https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf) | 2026-11-19 |
| The Challenge syllabus file is labeled V2.10.2025 FINAL (copyright 2025) | V2.10.2025 FINAL | [oct-2025-challenge-exam-syllabus-v2.pdf](https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf) | 2026-11-19 |
| The Challenge syllabus page links to the copy whose file name ends in -v2; the other copy differs only by an 'Effective June 2026' header line | https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge- | [cia-challenge-exam-syllabus](https://www.theiia.org/en/content/certifications/cia-challenge-exam-syllabus/) | 2026-11-19 |
| The current Challenge syllabus is effective 1 June 2026 | 2026-06-01 | [information-systems](https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/) | 2026-11-19 |
| Every Challenge pathway uses the same exam content and syllabus | True | [challenge-exam](https://www.theiia.org/en/certifications/cia/challenge-exam/) | 2026-11-19 |
| Challenge pathways: approved CPA and CA holders; active CISA holders; a pilot for professionals with 10 or more years of experience, whose applications are closed | accounting, information_systems, professional_pilot_closed | [challenge-exam](https://www.theiia.org/en/certifications/cia/challenge-exam/) | 2026-11-19 |
| CISA route: an active CISA, proof of good standing from the public registry and a government photo ID; no proof of experience; applications open all year |  | [information-systems](https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/) | 2026-11-19 |
| The Challenge Exam is delivered only in February, June, September and November (mainland China has single test days instead, in 2026 on 8 March, 7 June, 6 September and 6 December) | February, June, September, November | [information-systems](https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/) | 2026-11-19 |
| A Challenge registration is valid for 180 days or until the program expires, whichever is sooner | 180 | [information-systems](https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/) | 2026-11-19 |
| The Challenge Exam has no program or exam extensions | none | [information-systems](https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/) | 2026-11-19 |
| Challenge Exam: up to seven retakes (eight attempts in all) within the three-year program eligibility period, in any testing window | 8 | [information-systems](https://www.theiia.org/en/certifications/cia/challenge-exam/information-systems/) | 2026-11-19 |
| Challenge Exam languages: English, French, Spanish; Simplified Chinese in mainland China only (registration from October 2026, exams from December 2026) | English, French, Spanish, Simplified Chinese (mainland China only) | [challenge-exam](https://www.theiia.org/en/certifications/cia/challenge-exam/) | 2026-11-19 |
| Challenge results arrive within three weeks of the exam date, from the September 2026 window (delayed scoring from 1 September 2026) | 3 | [scoring](https://www.theiia.org/en/certifications/scoring/) | 2026-11-19 |
| Challenge application fee until 3 January 2027, US dollars | member 150, non_member 380 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| Challenge exam fee until 3 January 2027, US dollars | member 845, non_member 1245 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| Challenge application fee from 4 January 2027, US dollars | member 185, non_member 245 | [2027](https://www.theiia.org/en/certifications/new-to-certification/Pricing/2027/) | 2026-11-19 |
| Challenge exam fee from 4 January 2027, US dollars | member 995, non_member 1335 | [2027](https://www.theiia.org/en/certifications/new-to-certification/Pricing/2027/) | 2026-11-19 |
| A scaled score of 600 or higher passes an IIA exam | 600 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| Raw scores are converted to a reporting scale of 250 to 750 | 250, 750 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| A pass report shows no numeric score; a fail report shows a numeric score and the syllabus domain areas that need improvement |  | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| Wrong answers are not penalized, so it pays to answer every question | True | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| No breaks are scheduled; the clock keeps running if a candidate takes one | none scheduled | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| A failed exam can be retaken no sooner than 30 days after the last attempt | 30 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| An exam may be taken at most eight times during the program eligibility window | 8 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| The CIA program must be completed within three years of approval (three-part route and Challenge route) | 3 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| An exam registration is valid for 180 days or until the program expires, whichever comes first | 180 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| Three-part route only: one 75-day exam registration extension (US$100) and one 12-month program extension (US$275) can be bought | exam_days 75, exam_fee 100, program_months 12, program_fee 275 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| An appointment can be changed up to 48 hours before it; Pearson VUE charges US$75 each time | hours 48, fee 75 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| Computer-based exams, sat in person at a Pearson VUE test center | Pearson VUE test center | [certification-candidate-handbook](https://www.theiia.org/en/content/certifications/certification-candidate-handbook/) | 2026-11-19 |
| There is no online testing: The IIA discontinued it on 27 May 2025 | discontinued 2025-05-27 | [certification-candidate-handbook](https://www.theiia.org/en/content/certifications/certification-candidate-handbook/) | 2026-11-19 |
| The IIA's own sample questions have four options, A to D (15 on the sample questions page, 8 in the IAP Guidebook); no opened file states the number in words | 4 | [sample-exam-questions](https://www.theiia.org/en/certifications/cia/exam-prep-resources/exam-review-courses/exam-preparation-and-practice-resources/sample-exam-questions/) | 2026-11-19 |
| The handbook says each question that counts toward the score has been pretested. No opened IIA file says whether an exam form includes unscored pretest questions, or how many |  | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| Official results arrive within three weeks of the exam date (IAP, three-part CIA and CRMA from 1 April 2026); no immediate unofficial score is shown | 3 | [scoring](https://www.theiia.org/en/certifications/scoring/) | 2026-11-19 |
| The IIA does not prescribe the order of the three parts | any order | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| The CIA exam is non-disclosed: current questions and answers are not published | True | [exam-syllabus](https://www.theiia.org/en/certifications/cia/exam-prep-resources/exam-syllabus/) | 2026-11-19 |
| Three-part route: a degree (or an active IAP) is the entry requirement, and candidates may sit the exams before the experience is complete; to be certified they need internal audit experience of 1 year with a master's degree, 2 years with a bachelor's, or 5 years as an active IAP holder (1 or 2 years if the holder has the degree). The handbook also lists 5 years of experience with no degree | masters_years 1, bachelors_years 2, active_iap_years 5, experience_only_years 5 | [certification-candidate-handbook.pdf](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | 2026-11-19 |
| Three-part CIA exam languages: Arabic, Simplified Chinese, Traditional Chinese, English, French, German, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Thai, Turkish, and Vietnamese (registration from 28 August 2026). Caution: Arabic candidates sit the 2019 syllabus through 27 December 2026, and Simplified Chinese (mainland China only) is also still on the 2019 syllabus until the December 2026 window | Arabic, Simplified Chinese, Traditional Chinese, English, French, German, Japanese, Korean | [cia](https://www.theiia.org/en/certifications/cia/) | 2026-11-19 |
| The 2025 syllabus was live in English by 15 July 2025; the reference list is marked Effective May 2025 | 2025-05 | [iia-announces-excellence-and-cia-award-winners](https://www.theiia.org/en/content/communications/press-releases/2025/july/iia-announces-excellence-and-cia-award-winners-unveils-key-academic-and-certification-enhancements-at-international-conference-in-toronto/) | 2026-11-19 |
| The exact English launch day of the 2025 syllabus (28 May 2025) was seen in search results only; no opened IIA page states it | 2025-05-28 | [cia](https://www.theiia.org/en/certifications/cia/) **(search only)** | 2026-11-19 |
| The exam reference list linked from the CIA syllabus page is V5.5.2026.10.15, marked Effective May 2025 | V5.5.2026.10.15 | [cia-exam-references-v5.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v5.pdf) | 2026-11-19 |
| The reference list has 6 primary and 42 secondary references (48 in all) | primary 6, secondary 42 | [cia-exam-references-v5.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v5.pdf) | 2026-11-19 |
| Scored questions on a new Topical Requirement do not appear until at least six months after its effective date | 6 | [topical-requirements](https://www.theiia.org/en/standards/2024-standards/topical-requirements/) | 2026-11-19 |
| The Global Internal Audit Standards were published on 9 January 2024 | 2024-01-09 | [globalinternalauditstandards_2024january9.pdf](https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf) | 2026-11-19 |
| The Global Internal Audit Standards became effective on 9 January 2025 | 2025-01-09 | [complete-global-internal-audit-standards](https://www.theiia.org/en/content/standards/complete-global-internal-audit-standards/) | 2026-11-19 |
| The Standards have 5 domains, 15 principles and 52 standards (counted from the contents pages) | domains 5, principles 15, standards 52 | [globalinternalauditstandards_2024january9.pdf](https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf) | 2026-11-19 |
| Three-part CIA application fee until 3 January 2027, US dollars | member 120, non_member 240 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| Part 1 exam fee until 3 January 2027, US dollars | member 310, non_member 445 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| Part 2 exam fee until 3 January 2027, US dollars | member 280, non_member 415 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| Part 3 exam fee until 3 January 2027, US dollars | member 280, non_member 415 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| The IIA's certification prices change on 4 January 2027 | 2027-01-04 | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |
| Three-part CIA application fee from 4 January 2027, US dollars | member 145, non_member 195 | [2027](https://www.theiia.org/en/certifications/new-to-certification/Pricing/2027/) | 2026-11-19 |
| Part 1 exam fee from 4 January 2027, US dollars | member 355, non_member 475 | [2027](https://www.theiia.org/en/certifications/new-to-certification/Pricing/2027/) | 2026-11-19 |
| Part 2 exam fee from 4 January 2027, US dollars | member 325, non_member 435 | [2027](https://www.theiia.org/en/certifications/new-to-certification/Pricing/2027/) | 2026-11-19 |
| Part 3 exam fee from 4 January 2027, US dollars | member 325, non_member 435 | [2027](https://www.theiia.org/en/certifications/new-to-certification/Pricing/2027/) | 2026-11-19 |
| Listed prices apply in the United States, Canada and select countries; prices may differ where a National Institute runs the exams; all fees are non-refundable and non-transferable |  | [pricing](https://www.theiia.org/en/certifications/new-to-certification/pricing/) | 2026-11-19 |

Rules for learner copy that follow from these facts:

- **Never show a scaled score from a KaiSip mock.** The real exams report a
  scaled score from 250 to 750 with 600 to pass, and a pass report shows no
  number at all. 600 is not a percent. KaiSip shows percent by section and its
  own readiness band, labelled as KaiSip's.
- Fees, windows and languages change. An exam guide states them only with the
  "check theiia.org before you book" line the exam-guide linter requires.
- A fact marked **search only** or **not opened** is not stated to learners
  as checked.

## What the exams are built on

- **The Global Internal Audit Standards** (published 9 January 2024, effective
  9 January 2025): 5 domains, 15 principles, 52 standards, counted from the
  opened file. Domain I Purpose of Internal Auditing; Domain II Ethics and
  Professionalism (Principles 1 to 5); Domain III Governing the Internal Audit
  Function (Principles 6 to 8); Domain IV Managing the Internal Audit Function
  (Principles 9 to 12); Domain V Performing Internal Audit Services
  (Principles 13 to 15). Each standard has Requirements ("must"),
  Considerations for Implementation ("should", "may") and Examples of Evidence
  of Conformance. Domain III also has Essential Conditions for the board and
  senior management. A key that rests on a consideration must say "should",
  never "must".
- **Topical Requirements**, mandatory for assurance work when an engagement's
  scope includes the topic (calendar below).
- **The exam reference list** (table below): six primary references and a
  longer list of secondary ones. Only the opened ones can carry a key.

## The CIA lens (short form)

How the exams think. Every line was checked against the opened Standards on
19 Nov 2026; the long form, with the Standard behind each line and the list of
corrections made to the starting lens, is `docs/content/CIA_LENS.md`. The item
standard built on it is `.claude/agents/cia-standards-auditor.md`.

1. **Who the auditor serves.** The organization as a whole, through the board
   and management: the function tells them, independently and objectively and
   starting from risk, where things really stand, and advises on what comes
   next. (Domain I)
2. **Independence belongs to the function, objectivity to the person.** The
   chief audit executive reports directly to the board; each internal auditor
   keeps an unbiased mindset. Different problems, different remedies: a
   reporting-line problem goes to the board; an individual's impairment is
   disclosed to the chief audit executive or a designated supervisor, and the
   options include reassigning, rescheduling, adjusting the scope or
   outsourcing. An internal auditor must not assess an activity they used to
   be responsible for, and for assurance work objectivity is presumed impaired
   if that responsibility ended within the previous 12 months. (Principles 2
   and 7; Standards 2.2, 2.3, 7.1)
3. **Who approves what.** The board approves the internal audit charter (it
   holds the mandate), the internal audit plan and significant changes to it,
   and the budget and resource plan. Senior management gives input and
   support; it does not approve the charter or the plan. The board's duties
   are "essential conditions", not requirements placed on the board: the chief
   audit executive must discuss them and show what their absence does, and
   must document it when everyone agrees a condition is not needed (writing
   down a refusal is a "should"). (Standards 6.1 to 6.3, 9.4, 10.1; Domain III
   introduction)
4. **Management owns risk, controls and actions.** The internal auditor
   assesses, concludes, and then either recommends, asks management for an
   action plan, or agrees actions with management. The auditor confirms that
   actions were implemented and never implements them. (Standards 14.4, 15.2)
5. **When management accepts too much risk.** The test is a risk beyond the
   organization's risk appetite or risk tolerance, not the auditor's
   preference. The requirement: discuss it with senior management, and if it
   is still unresolved take it to the board. Trying the responsible management
   first is a consideration ("should"), so never key it as a "must". It is not
   the chief audit executive's risk to resolve. (Standard 11.5)
6. **Risk decides the plan and the scope.** The plan rests on a documented
   risk assessment done at least once a year. Each engagement starts with
   understanding the activity and assessing its risks, then objectives and
   scope, criteria, resources and a work program. Plan before testing.
   (Standards 9.4, 13.2 to 13.6)
7. **Evidence and findings.** Information must be relevant, reliable and
   sufficient. A finding is the gap between the criteria and the condition;
   then come the root cause, the effect and the significance. Actions should
   fix the root cause. (Standards 14.1 to 14.4)
8. **Fraud.** Every engagement risk assessment considers fraud risk, and due
   professional care weighs its probability. Violations are reported to those
   with authority to act. The Standards say little more: red flags, the fraud
   triangle and investigation rest on other references, which must be opened
   before a key rests on them. (Standards 1.1 to 1.3, 4.2, 13.2)
9. **Quality.** A quality assurance and improvement program with internal
   assessments (ongoing monitoring and periodic self-assessment) and an
   external assessment at least every five years, and honest disclosure of
   nonconformance. (Standards 4.1, 8.3, 8.4, 12.1, 15.1)
10. **The seat of each exam.** Part 1: an internal auditor who knows the rules
    and who does what. Part 2: the internal auditor running an engagement
    under a supervisor. Part 3: the chief audit executive running the function
    and approving, sending and escalating results. The Challenge Exam asks an
    experienced professional for judgment, and each of its topics takes the
    seat of the Part topic it shares.

What the lens is not: the ISACA lens. A CISA habit ("the IS auditor reports to
the audit committee", ITAF, an IT-first scope) is never the keyed answer here.

## What changed from the 2019 syllabus (the main accuracy risk)

Most older CIA material, and most of what a language model remembers, is the
2019 exam and the 2017 Standards. The stale-syllabus gate
(`data/cia/tools/check_stale_terms.py`, terms and evidence in
`data/cia/shared/stale_terms.json`) refuses the old wording in learner text.

| 2019 exam and 2017 Standards | 2025 exam and 2024 Standards |
|---|---|
| "internal audit activity" | internal audit function |
| Definition of Internal Auditing, Mission of Internal Audit, Core Principles | Purpose of Internal Auditing (Domain I) and 15 principles |
| The IIA's Code of Ethics | Domain II: Ethics and Professionalism (it replaces the former code) |
| Attribute and Performance Standards numbered 1000 to 2600 | Standards numbered by principle: Standard 1.1 to Standard 15.2 |
| "consulting services" | advisory services (the 2024 glossary notes the old name) |
| Three Lines of Defense | Three Lines Model |
| The internal audit plan approved by senior management and the board (the charter's final approval was already the board's) | The plan and the charter are approved by the board; both are discussed with senior management |
| Evidence that is sufficient, reliable, relevant and useful | Relevant, reliable and sufficient |
| Engagement opinion, overall opinion | Engagement conclusion, results of internal audit services |

Two things about the 2025 exam itself, from the opened syllabuses: Part 3 is
about running the internal audit function (the IT, finance and business-process
knowledge sits in Part 2 planning, at recognize level), and no topic carries a
depth label, so each topic line's verb sets the depth. What the 2019 parts and
domains were called is not confirmed from an opened source (open item 5), so
this document does not describe them.

Every row above rests on an opened file: the two-way mapping, the 2024
Standards (glossary and Domain II introduction) and, for the Three Lines
rename, the titles of The IIA's 2020 and 2026 papers.

Translate an old Standard number only with The IIA's two-way mapping
(listed in the research log), and never from memory. "IPPF" alone is still
correct: the 2024 framework holds the Standards, the Topical Requirements and
Global Guidance.


## Codes

A topic code is part, section letter, topic number: `1A1` is Part 1, Section A, topic 1.
Notes sub-topics add a dot: `1A1.1`, `1A1.2`. Inside each pack, the section letter is
also the domain number (A is domain 1, B is domain 2, and so on).

## Verb and depth

The syllabus has no Basic or Proficient labels. The first word of each official topic
line (its verb) is the depth signal, and KaiSip sorts the verbs into three depths:

| Depth | Verbs | What the learner must be able to do |
|---|---|---|
| recall | Describe, Recognize, Identify, Explain | Know it and explain it |
| apply | Interpret, Apply, Demonstrate, Maintain | Use it in a given situation |
| judge | Evaluate, Determine, Analyze, Assess, Plan, Complete, Prepare, Summarize | Weigh the facts and decide |

Topics by depth (counted from the verbs):

| Exam | recall | apply | judge | Topics |
|---|---|---|---|---|
| CIA Part 1: Internal Audit Fundamentals | 15 | 8 | 4 | 27 |
| CIA Part 2: Internal Audit Engagement | 1 | 4 | 12 | 17 |
| CIA Part 3: Internal Audit Function | 16 | 1 | 1 | 18 |

A topic's bullets can ask for more than its verb. For example, 1C5 has an "apply" verb,
but two of its bullets ask the learner to assess and to evaluate. Use the topic verb for
the difficulty mix and the bullets for the range of items.

## CIA Part 1: Internal Audit Fundamentals (cia1)

125 questions, 150 minutes, 4 sections, 27 topics.
Official syllabus (label V2.09.2024 FINAL): https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf

| Section | Name | Weight | Topics |
|---|---|---|---|
| A | Foundations of Internal Auditing | 35% | 8 |
| B | Ethics and Professionalism | 20% | 6 |
| C | Governance, Risk Management, and Control | 30% | 8 |
| D | Fraud Risks | 15% | 5 |

**Section A: Foundations of Internal Auditing (35%, 8 topics)**

### 1A1 Purpose of Internal Auditing

Verb: Describe (depth: recall)

What it covers:

- a. What the function is for and what the organization gains from it
- b. What has to be in place for internal audit to work well

### 1A2 The mandate and who sets it

Verb: Explain (depth: recall)

What it covers:

- a. What internal audit is allowed to do, the part it plays and its duties
- b. How the chief audit executive helps the board set the mandate or refresh it
- c. What senior management and the board each decide about internal audit's authority and duties

Shared with the Challenge Exam: CA1

### 1A3 Internal audit charter requirements

Verb: Recognize (depth: recall)

What it covers:

- a. The parts a charter must have under the Standards
- b. Why the board and senior managers should talk the charter through
- c. Why the board has to approve it

### 1A4 Assurance versus advisory services

Verb: Interpret (depth: apply)

What it covers:

- a. What counts as an assurance service
- b. Limited assurance compared with reasonable assurance
- c. What counts as an advisory service
- d. Who decides what an advisory job covers, and how
- e. Picking the right kind of service for the situation in front of you

### 1A5 Kinds of assurance engagements

Verb: Describe (depth: recall)

What it covers:

- a. Assessments of risks and of the controls over them
- b. Audits of outside parties and of whether contracts are being followed
- c. Audits of IT security and of privacy
- d. Audits of performance and of quality
- e. Audits of operations, of financial matters and of compliance with regulations
- f. Audits of the organization's culture
- g. Audits of how management reports are produced

### 1A6 Kinds of advisory work

Verb: Describe (depth: recall)

What it covers:

- a. Teaching others about risk and control
- b. Advising while a system is being designed and built
- c. Helping with due diligence reviews
- d. Helping keep personal data private
- e. Benchmarking against peers or good practice
- f. Helping management assess its own internal controls
- g. Mapping how a process flows

### 1A7 Threats to internal audit independence

Verb: Identify (depth: recall)

What it covers:

- a. Reporting lines for the chief audit executive that do not fit the role
- b. The board's part in guarding independence
- c. The chief audit executive's part: guarding independence day to day and telling the board when it is, or looks, impaired
- d. Budget limits that hold back internal audit's work
- e. What happens when scope is limited or access is cut off

Shared with the Challenge Exam: CA2

### 1A8 Internal audit and the Three Lines Model

Verb: Recognize (depth: recall)

What it covers:

- a. The Three Lines Model and who sits where in it
- b. First and second line duties that would weaken independence if auditors took them on
- c. Safeguards for when auditors do, or seem to do, first or second line work

Shared with the Challenge Exam: CA3

**Section B: Ethics and Professionalism (20%, 6 topics)**

### 1B1 Acting with integrity

Verb: Demonstrate (depth: apply)

What it covers:

- a. Telling the truth and speaking up when that is uncomfortable
- b. Staying inside the law and the profession's expectations, whatever the setting

### 1B2 Objectivity impairments of individual auditors

Verb: Assess (depth: judge)

What it covers:

- a. How reviewing your own earlier work, or being too close to the people involved, affects an engagement
- b. Situations that can create a conflict of interest

Shared with the Challenge Exam: CA4

### 1B3 Policies and safeguards for objectivity

Verb: Analyze (depth: judge)

What it covers:

- a. When moving an auditor to a different assignment is the right call
- b. When to bring in an outside party to perform or supervise the work
- c. When an impairment has to be disclosed
- d. When to say no to a favor, a gift or a reward

### 1B4 Skills and competencies auditors need

Verb: Apply (depth: apply)

What it covers:

- a. Writing and speaking clearly, from short messages to reports and presentations
- b. Reasoning through a messy problem to a workable, sometimes new, answer
- c. Digging into an unfamiliar subject using more than one kind of source
- d. Winning agreement: persuading, negotiating and settling disagreements with colleagues and stakeholders
- e. Becoming someone people trust and take seriously
- f. Handling change well as things around you shift
- g. Curiosity: asking one more question and learning as a habit
- h. Signs that an auditor needs more professional development

### 1B5 Due professional care and skepticism

Verb: Demonstrate (depth: apply)

What it covers:

- a. Care includes thinking about what the organization is trying to achieve
- b. Care includes judging how well governance, risk management and controls work
- c. Care includes weighing what an engagement costs against what it is likely to deliver
- d. Care includes thinking about how likely major errors, fraud or noncompliance are
- e. Skepticism: an open but questioning mind about whether information can be trusted

### 1B6 Confidentiality and proper use of information

Verb: Maintain (depth: apply)

What it covers:

- a. Following the organization's policies and the laws that apply
- b. Following the function's own methodology for handling information
- c. Respecting privacy and who owns the information
- d. Protecting information in suitable ways

Shared with the Challenge Exam: CA5

**Section C: Governance, Risk Management, and Control (30%, 8 topics)**

### 1C1 Organizational governance basics

Verb: Describe (depth: recall)

What it covers:

- a. Who does what: the board, senior management, internal audit and other assurance providers
- b. Well-known frameworks, principles and models for governance

### 1C2 Culture and the control environment

Verb: Recognize (depth: recall)

What it covers:

- a. The meaning of culture and of the control environment
- b. The meaning of risks and controls at engagement level
- c. How the way decisions get made shapes governance, risk management and control

### 1C3 Ethics and compliance issues

Verb: Recognize (depth: recall)

What it covers:

- a. Ethical, legal and compliance rules an organization must meet
- b. Where the internal auditor fits in the organization's ethics framework

### 1C4 Types of risk

Verb: Interpret (depth: apply)

What it covers:

- a. Telling the main risk types apart: strategic, financial, operational, reputational and compliance risk, plus sustainability, environmental and social responsibility risk
- b. Inherent risk compared with residual risk

### 1C5 The risk management process

Verb: Interpret (depth: apply)

What it covers:

- a. What risk management is
- b. Risk appetite and risk tolerance, and how to spot each
- c. The steps of the risk management cycle, and how sound each one is
- d. Whether the organization's responses to its risks are good ones

### 1C6 Risk management across the organization

Verb: Describe (depth: recall)

What it covers:

- a. Judging how well risk management is designed and how well it works
- b. Why a risk management framework is worth using

### 1C7 Internal control concepts and control types

Verb: Interpret (depth: apply)

What it covers:

- a. What internal controls are for
- b. Control types (preventive, detective, corrective) and how to judge them
- c. Suggesting controls that fit the risk

### 1C8 Control design, effectiveness and efficiency

Verb: Recognize (depth: recall)

What it covers:

- a. Reviewing whether controls are well designed and working
- b. Why an internal control framework is worth using

**Section D: Fraud Risks (15%, 5 topics)**

### 1D1 Fraud triangle, fraud risks and schemes

Verb: Describe (depth: recall)

What it covers:

- a. The three sides of the fraud triangle: opportunity, motivation and rationalization
- b. Spotting where fraud could happen
- c. Fraud schemes that come up often

Not a Challenge topic, but it holds the content of the one Challenge-only bullet,
CC3 g. Items here may carry `challenge_ref` "C3".

### 1D2 Weighing fraud risk in an engagement

Verb: Determine (depth: judge)

What it covers:

- a. Thinking about fraud risk while planning the work
- b. Judging which processes are most exposed to fraud

### 1D3 Fraud risk management and red flags

Verb: Evaluate (depth: judge)

What it covers:

- a. Judging how the organization manages fraud risk
- b. Finding and weighing red flags, organization-wide and inside a process
- c. The auditor's part in reporting red flags found during the work

### 1D4 Controls that prevent and detect fraud

Verb: Describe (depth: recall)

What it covers:

- a. How tone at the top changes the chance of fraud
- b. Using segregation of duties properly
- c. How approval and authority limits help stop fraud
- d. Common detective controls: reconciliations, supervisor reviews and whistleblower hotlines

### 1D5 Fraud investigation techniques and roles

Verb: Recognize (depth: recall)

What it covers:

- a. What internal audit does, and does not do, in a fraud investigation
- b. Ways to interview people
- c. Ways to investigate
- d. Ways to test for fraud
- e. Working alongside fraud investigators and drawing on what they hold: whistleblower complaints, trends, past cases and their risk assessments

## CIA Part 2: Internal Audit Engagement (cia2)

100 questions, 120 minutes, 3 sections, 17 topics.
Official syllabus (label V2.09.2024 FINAL): https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf

| Section | Name | Weight | Topics |
|---|---|---|---|
| A | Engagement Planning | 50% | 7 |
| B | Information Gathering, Analysis, and Evaluation | 40% | 8 |
| C | Engagement Supervision and Communication | 10% | 2 |

**Section A: Engagement Planning (50%, 7 topics)**

### 2A1 Engagement objectives and scope

Verb: Determine (depth: judge)

What it covers:

- a. Where Topical Requirements come into setting objectives and scope
- b. What feeds the objectives: whether the job is assurance or advisory, strategy, regulation, risk appetite, policies, how governance, risk and control are run, earlier audit reports and other providers' work
- c. Spotting scope limitations at planning and writing them down
- d. Ways to handle and record requests from stakeholders
- e. Good ways to deal with a change in objectives or scope

Shared with the Challenge Exam: CC1

### 2A2 Choosing evaluation criteria

Verb: Determine (depth: judge)

What it covers:

- a. Picking the criteria that best fit the activity being audited
- b. Testing a set of criteria: relevant, specific, practical, in line with objectives, and able to support fair comparisons

Shared with the Challenge Exam: CC2

### 2A3 Planning around key risks and controls

Verb: Plan (depth: judge)

What it covers:

- a. Where Topical Requirements come into planning
- b. How the area's strategic goals connect to the way it measures and manages performance and to risk management
- c. Current and emerging cyber risks, IT general controls, everyday security controls, why IT control frameworks help, data privacy principles and data security practice
- d. Readiness for disruption (continuity and disaster recovery): business impact analysis, resilience, handling incidents, and tests of backup and recovery
- e. Finance and accounting basics for the area: assets (current and fixed), liabilities (short and long term), capital and investments
- f. Key risks and controls in everyday business processes, for example procurement, payables, inventory, supply chain, asset management, compliance and third parties, and in systems such as CRM, ERP and GRC

Shared with the Challenge Exam: CC3 (the Challenge version adds a bullet g on
fraud basics; that content lives in 1D1)

### 2A4 Choosing the engagement approach

Verb: Determine (depth: judge)

What it covers:

- a. Weighing approaches (traditional, agile, integrated, remote) and picking the best fit
- b. Project management ideas used to plan and run an engagement

Shared with the Challenge Exam: CC4

### 2A5 Detailed engagement risk assessment

Verb: Complete (depth: judge)

What it covers:

- a. Where Topical Requirements come into the risk assessment
- b. Risks that run through the whole activity: regulatory, cyber, IT, operational and financial
- c. How emerging risks affect the organization
- d. Methods and criteria for rating and ranking risks and controls
- e. How changes to people, processes and systems shift risk
- f. How structure and setting matter: remote or in-person work, flat or traditional layers, central or local control
- g. How culture shapes the control environment: how individuals and groups behave, and tone at the top

Shared with the Challenge Exam: CC5

### 2A6 Procedures and the work program

Verb: Determine (depth: judge)

What it covers:

- a. Procedures that test whether a control is well designed
- b. Procedures that test whether controls work
- c. Procedures that test whether controls are efficient
- d. Judging whether the work program is good enough
- e. Test methods for engagements that cover accounting, finance, IT systems, operations or cybersecurity

Shared with the Challenge Exam: CC6

### 2A7 Resources and skills for the engagement

Verb: Determine (depth: judge)

What it covers:

- a. Money the engagement needs
- b. People the engagement needs
- c. Technology the engagement needs
- d. What it means when resources fall short

Shared with the Challenge Exam: CC7

**Section B: Information Gathering, Analysis, and Evaluation (40%, 8 topics)**

### 2B1 Sources of engagement information

Verb: Identify (depth: recall)

What it covers:

- a. Ways to get information: data analysis, walk-throughs, observation and interviews
- b. Documents to draw on: policies, questionnaires on risk and control, checklists and self-assessment surveys

Shared with the Challenge Exam: CD1

### 2B2 Judging the quality of evidence

Verb: Evaluate (depth: judge)

What it covers:

- a. Using the right criteria to judge evidence quality
- b. What makes evidence more reliable: corroboration, an independent source, and a system with sound controls behind it
- c. Evidence strong enough that another informed, competent person would come to the same conclusion

Shared with the Challenge Exam: CD2

### 2B3 Technology tools for audit work

Verb: Evaluate (depth: judge)

What it covers:

- a. Tools that save time and add insight: dashboards, continuous monitoring, embedded audit modules, robotic process automation, machine learning and AI

Shared with the Challenge Exam: CD3

### 2B4 Analytics and process mapping

Verb: Apply (depth: apply)

What it covers:

- a. Breaking a process workflow into its parts
- b. Studying workflows with responsibility matrices (such as RACI), walk-throughs and process maps
- c. Data types: structured and unstructured
- d. The analytics steps: set the objective, get the data, normalize it, analyze it, report the results
- e. When to use each analysis method: diagnostic, predictive, prescriptive, anomaly detection, text analysis

Shared with the Challenge Exam: CD4

### 2B5 Analytical review techniques

Verb: Apply (depth: apply)

What it covers:

- a. Reading ratios, variances, trends, benchmarks, and financial and nonfinancial data
- b. Choosing the analytical technique that serves the engagement objective

Shared with the Challenge Exam: CD5

### 2B6 Findings and their significance

Verb: Determine (depth: judge)

What it covers:

- a. Comparing what is (the condition) with what should be (the criteria)
- b. Finding root causes and the likely effects of a gap
- c. Factors that make a finding more or less significant

Shared with the Challenge Exam: CD6

### 2B7 Workpapers that support the results

Verb: Prepare (depth: judge)

What it covers:

- a. Putting workpaper information in order
- b. What a complete workpaper with enough evidence looks like
- c. Tracing the engagement results back to the workpapers
- d. Organizing and keeping engagement records, given regulation and internal policy

Shared with the Challenge Exam: CD7

### 2B8 Reaching engagement conclusions

Verb: Summarize (depth: judge)

What it covers:

- a. Using professional judgment to weigh findings taken together
- b. What goes into a conclusion, such as how well governance, risk management and controls work

Shared with the Challenge Exam: CD8

**Section C: Engagement Supervision and Communication (10%, 2 topics)**

### 2C1 Supervising the engagement

Verb: Apply (depth: apply)

What it covers:

- a. Supervision runs through the whole engagement, starting at planning
- b. The supervisor's job in coordinating who does what
- c. The supervisor's job in reviewing workpapers and conclusions
- d. The supervisor's job in assessing how auditors performed

Shared with the Challenge Exam: CD9

### 2C2 Communicating during the engagement

Verb: Apply (depth: apply)

What it covers:

- a. Choosing how to communicate (written or spoken, formal or informal) at planning, fieldwork and reporting
- b. Situations that need to be escalated
- c. Choosing who should receive engagement communications

Shared with the Challenge Exam: CD10

## CIA Part 3: Internal Audit Function (cia3)

100 questions, 120 minutes, 4 sections, 18 topics.
Official syllabus (label V2.09.2024 FINAL): https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf

| Section | Name | Weight | Topics |
|---|---|---|---|
| A | Internal Audit Operations | 25% | 4 |
| B | Internal Audit Plan | 15% | 3 |
| C | Quality of the Internal Audit Function | 15% | 3 |
| D | Engagement Results and Monitoring | 45% | 8 |

**Section A: Internal Audit Operations (25%, 4 topics)**

### 3A1 Running internal audit operations

Verb: Describe (depth: recall)

What it covers:

- a. Managing outside firms that provide internal audit services
- b. Ways to keep watch over internal audit operations
- c. Balancing assurance work with advisory work
- d. When the function's methods should be reviewed and maybe changed

Shared with the Challenge Exam: CB1

### 3A2 Managing money, people and technology

Verb: Describe (depth: recall)

What it covers:

- a. Main steps and choices in budgeting
- b. Steps and choices in recruiting
- c. Who does what on the internal audit team
- d. Ways to train, develop and keep auditors
- e. How the function manages performance
- f. What to think about for the technology used on engagements
- g. People techniques that strengthen the function: coaching, mentoring, constructive feedback, rewards, job design and work schedules

Shared with the Challenge Exam: CB2

### 3A3 Internal audit strategy and its stakeholders

Verb: Describe (depth: recall)

What it covers:

- a. How internal audit strategy backs the business strategy and risk management
- b. What the mission statement and the vision statement of the function are for
- c. Matching resource planning to the internal audit strategy
- d. When the strategy should be reviewed and changed

Shared with the Challenge Exam: CB3

### 3A4 Chief audit executive reporting and relationships

Verb: Recognize (depth: recall)

What it covers:

- a. Why both formal and informal contact with stakeholders matters
- b. Presenting the audit plan, showing its link to the organization's strategy, and reporting changes afterward
- c. Raising concerns about independence and reporting major risk exposures
- d. Pulling themes out of many engagements and giving a prompt overall view of how well risk management and control are working
- e. Sharing performance measures, the results of quality assessments and any plan to close gaps

Shared with the Challenge Exam: CB4

**Section B: Internal Audit Plan (15%, 3 topics)**

### 3B1 Audit universe and engagement sources

Verb: Identify (depth: recall)

What it covers:

- a. How the audit universe is defined
- b. The main parts of an audit universe
- c. Where Topical Requirements apply
- d. How requests from the board and management are weighed
- e. How relevant laws and regulatory mandates are found
- f. How trends, organizational change, and new issues and technologies are tracked, for example AI, blockchain, digital assets, the internet of things and robotic process automation
- g. Why some audits must recur on a set cycle

Shared with the Challenge Exam: CB5

### 3B2 Building the risk-based audit plan

Verb: Describe (depth: recall)

What it covers:

- a. The risk assessment method and how risks are ranked
- b. Keeping the plan in step with what stakeholders expect and with both strategies: the organization's and internal audit's
- c. Events that call for a prompt update so the plan stays current

Shared with the Challenge Exam: CB6

### 3B3 Coordinating with other assurance providers

Verb: Recognize (depth: recall)

What it covers:

- a. Who the internal and external assurance providers are
- b. Examples and methods of coordinating coverage
- c. Criteria for deciding whether another provider's work can be relied on

Shared with the Challenge Exam: CB7

**Section C: Quality of the Internal Audit Function (15%, 3 topics)**

### 3C1 Quality assurance and improvement program

Verb: Describe (depth: recall)

What it covers:

- a. The main parts of quality assurance
- b. Where Topical Requirements apply
- c. What the program is for
- d. The chief audit executive's duty to report program results to the board
- e. Internal assessments compared with external assessments
- f. What qualifies someone to be a quality assessor
- g. What ongoing monitoring covers, and what periodic self-assessments cover

Shared with the Challenge Exam: CA6

### 3C2 Disclosing nonconformance with the Standards

Verb: Identify (depth: recall)

What it covers:

- a. What must be reported: why it happened, the circumstances, what was done about it and the effect
- b. The main steps for telling senior management and the board

Shared with the Challenge Exam: CA7

### 3C3 Performance measures for internal audit

Verb: Recognize (depth: recall)

What it covers:

- a. What key performance indicators are meant to achieve
- b. What to think about when choosing indicators, and why each needs a target
- c. Why both qualitative and quantitative indicators are useful
- d. Analyzing the function's own measures: effectiveness, efficiency, productivity, quality, operational and financial

Shared with the Challenge Exam: CA8

**Section D: Engagement Results and Monitoring (45%, 8 topics)**

### 3D1 Qualities of good results communication

Verb: Recognize (depth: recall)

What it covers:

- a. What seven qualities mean in a final communication: clear, concise, complete, accurate, objective, constructive and timely
- b. Seeing those qualities applied in real results communications
- c. Effective ways of communicating

Shared with the Challenge Exam: CE1

### 3D2 Writing the final engagement communication

Verb: Demonstrate (depth: apply)

What it covers:

- a. The main parts of an audit report: scope, objectives, conclusions, and recommendations or action plans
- b. When the report may say the work followed the Global Internal Audit Standards
- c. When a scope limitation must be written into the report

Shared with the Challenge Exam: CE2

### 3D3 Recommendations and management action plans

Verb: Determine (depth: judge)

What it covers:

- a. What auditors do when they and management disagree on a finding or an action plan
- b. What recommendations and action plans are for, including cost against benefit
- c. Checking that an action plan really fixes the root cause

Shared with the Challenge Exam: CE3

### 3D4 Closing communication and report distribution

Verb: Describe (depth: recall)

What it covers:

- a. What the closing meeting (exit conference) is for and who attends
- b. The chief audit executive's duty to send out the final communication and to report to stakeholders
- c. Why communication differs by audience: the board, senior management, the area's own management, risk management, regulators, external auditors and the public
- d. How to report an issue management fixed before the report went out
- e. The chief audit executive's duty, and the steps, when the final communication has a significant error or omission

Shared with the Challenge Exam: CE4

### 3D5 Residual risk, aggregation and ratings

Verb: Describe (depth: recall)

What it covers:

- a. Ways to judge whether existing controls are well designed and effective, and to set the level of residual risk
- b. Why findings are combined and ranked
- c. Why a rating scale is used to show the overall view of controls

Shared with the Challenge Exam: CE5

### 3D6 When management accepts too much risk

Verb: Describe (depth: recall)

What it covers:

- a. How to tell whether a risk is more than the organization should accept
- b. Who needs to be told, and who does the telling
- c. Which step comes first, and what follows

Shared with the Challenge Exam: CE6

### 3D7 Following up on action plans

Verb: Describe (depth: recall)

What it covers:

- a. Internal audit's duty to follow up and track management's actions
- b. The steps to check, and then confirm, that agreed actions were carried out

Shared with the Challenge Exam: CE7

### 3D8 Escalating actions that were not completed

Verb: Describe (depth: recall)

What it covers:

- a. Who gets told when an agreed action is overdue or poorly done
- b. The order in which the matter moves up the chain

Shared with the Challenge Exam: CE8

## Outline lines for the notes linter

`scripts/lint_notes.py --part N --outline docs/content/CIA_BLUEPRINT.md` and
`data/cia/tools/check_cia.py` read these lines. The titles must equal
`data/cia/shared/outline.json` (the checker fails on any difference). Codes
starting with 4 are the Challenge Exam's topics in the generated Challenge
pack: each has the title of the Part topic it shares.

### CIA Part 1: Internal Audit Fundamentals (cia1)

- 1A1 Purpose of Internal Auditing
- 1A2 The mandate and who sets it
- 1A3 Internal audit charter requirements
- 1A4 Assurance versus advisory services
- 1A5 Kinds of assurance engagements
- 1A6 Kinds of advisory work
- 1A7 Threats to internal audit independence
- 1A8 Internal audit and the Three Lines Model
- 1B1 Acting with integrity
- 1B2 Objectivity impairments of individual auditors
- 1B3 Policies and safeguards for objectivity
- 1B4 Skills and competencies auditors need
- 1B5 Due professional care and skepticism
- 1B6 Confidentiality and proper use of information
- 1C1 Organizational governance basics
- 1C2 Culture and the control environment
- 1C3 Ethics and compliance issues
- 1C4 Types of risk
- 1C5 The risk management process
- 1C6 Risk management across the organization
- 1C7 Internal control concepts and control types
- 1C8 Control design, effectiveness and efficiency
- 1D1 Fraud triangle, fraud risks and schemes
- 1D2 Weighing fraud risk in an engagement
- 1D3 Fraud risk management and red flags
- 1D4 Controls that prevent and detect fraud
- 1D5 Fraud investigation techniques and roles

### CIA Part 2: Internal Audit Engagement (cia2)

- 2A1 Engagement objectives and scope
- 2A2 Choosing evaluation criteria
- 2A3 Planning around key risks and controls
- 2A4 Choosing the engagement approach
- 2A5 Detailed engagement risk assessment
- 2A6 Procedures and the work program
- 2A7 Resources and skills for the engagement
- 2B1 Sources of engagement information
- 2B2 Judging the quality of evidence
- 2B3 Technology tools for audit work
- 2B4 Analytics and process mapping
- 2B5 Analytical review techniques
- 2B6 Findings and their significance
- 2B7 Workpapers that support the results
- 2B8 Reaching engagement conclusions
- 2C1 Supervising the engagement
- 2C2 Communicating during the engagement

### CIA Part 3: Internal Audit Function (cia3)

- 3A1 Running internal audit operations
- 3A2 Managing money, people and technology
- 3A3 Internal audit strategy and its stakeholders
- 3A4 Chief audit executive reporting and relationships
- 3B1 Audit universe and engagement sources
- 3B2 Building the risk-based audit plan
- 3B3 Coordinating with other assurance providers
- 3C1 Quality assurance and improvement program
- 3C2 Disclosing nonconformance with the Standards
- 3C3 Performance measures for internal audit
- 3D1 Qualities of good results communication
- 3D2 Writing the final engagement communication
- 3D3 Recommendations and management action plans
- 3D4 Closing communication and report distribution
- 3D5 Residual risk, aggregation and ratings
- 3D6 When management accepts too much risk
- 3D7 Following up on action plans
- 3D8 Escalating actions that were not completed

### CIA Challenge Exam (ciac)

- 4A1 The mandate and who sets it
- 4A2 Threats to internal audit independence
- 4A3 Internal audit and the Three Lines Model
- 4A4 Objectivity impairments of individual auditors
- 4A5 Confidentiality and proper use of information
- 4A6 Quality assurance and improvement program
- 4A7 Disclosing nonconformance with the Standards
- 4A8 Performance measures for internal audit
- 4B1 Running internal audit operations
- 4B2 Managing money, people and technology
- 4B3 Internal audit strategy and its stakeholders
- 4B4 Chief audit executive reporting and relationships
- 4B5 Audit universe and engagement sources
- 4B6 Building the risk-based audit plan
- 4B7 Coordinating with other assurance providers
- 4C1 Engagement objectives and scope
- 4C2 Choosing evaluation criteria
- 4C3 Planning around key risks and controls
- 4C4 Choosing the engagement approach
- 4C5 Detailed engagement risk assessment
- 4C6 Procedures and the work program
- 4C7 Resources and skills for the engagement
- 4D1 Sources of engagement information
- 4D2 Judging the quality of evidence
- 4D3 Technology tools for audit work
- 4D4 Analytics and process mapping
- 4D5 Analytical review techniques
- 4D6 Findings and their significance
- 4D7 Workpapers that support the results
- 4D8 Reaching engagement conclusions
- 4D9 Supervising the engagement
- 4D10 Communicating during the engagement
- 4E1 Qualities of good results communication
- 4E2 Writing the final engagement communication
- 4E3 Recommendations and management action plans
- 4E4 Closing communication and report distribution
- 4E5 Residual risk, aggregation and ratings
- 4E6 When management accepts too much risk
- 4E7 Following up on action plans
- 4E8 Escalating actions that were not completed

## Reference list

From The IIA's exam reference list (version and link in the facts table) and
the citation library `data/cia/shared/_framework_library.md`. A key may rest
only on a source in a Verified section, which means it was opened on the date
shown. The others are listed so an author knows they exist and does not key on
them from memory.

| Source | Access | Citable entries |
|---|---|---|
| [Global Internal Audit Standards (2024)](https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf) | Opened 2026-11-19 | 76 entries (domains, principles, standards and the glossary) |
| [Cybersecurity Topical Requirement, issued 5 February 2025, effective 5 February 2026](https://www.theiia.org/globalassets/site/standards/topical-requirements/cybersecurity/cybersecurity_topical_requirement.pdf) | Opened 2026-11-19 | Cybersecurity Topical Requirement; Cybersecurity Topical Requirement, Governance; Cybersecurity Topical Requirement, Risk Management; Cybersecurity Topical Requirement, Controls |
| [Cybersecurity Topical Requirement User Guide](https://www.theiia.org/globalassets/site/standards/topical-requirements/cybersecurity/cybersecurity_tr_user_guide.pdf) | Opened 2026-11-19 | Cybersecurity Topical Requirement User Guide |
| [Third-Party Topical Requirement, issued 15 September 2025, effective 15 September 2026](https://www.theiia.org/globalassets/site/standards/topical-requirements/third-party/third_party_topical_requirement_english.pdf) | Opened 2026-11-19 | Third-Party Topical Requirement; Third-Party Topical Requirement, Governance; Third-Party Topical Requirement, Risk Management; Third-Party Topical Requirement, Controls |
| [Third-Party Topical Requirement User Guide](https://www.theiia.org/globalassets/site/standards/topical-requirements/third-party/third_party_tr_user_guide_english.pdf) | Opened 2026-11-19 | Third-Party Topical Requirement User Guide |
| [Organizational Behavior Topical Requirement, issued 15 December 2025, effective 15 December 2026](https://www.theiia.org/globalassets/site/standards/tr/ob/org_behav_topical_requirement_en.pdf) | Opened 2026-11-19 | Organizational Behavior Topical Requirement; Organizational Behavior Topical Requirement, Governance; Organizational Behavior Topical Requirement, Risk Management; Organizational Behavior Topical Requirement, Controls |
| [Organizational Behavior Topical Requirement User Guide](https://www.theiia.org/globalassets/site/standards/tr/ob/org_behav_topical_requirement_ug_en.pdf) | Opened 2026-11-19 | Organizational Behavior Topical Requirement User Guide |
| [Organizational Resilience Topical Requirement, issued 30 April 2026, effective 30 April 2027](https://www.theiia.org/globalassets/site/standards/tr/or/org_resilience_tr_en.pdf) | Opened 2026-11-19 | Organizational Resilience Topical Requirement; Organizational Resilience Topical Requirement, Governance; Organizational Resilience Topical Requirement, Risk Management; Organizational Resilience Topical Requirement, Control Processes |
| [Organizational Resilience Topical Requirement User Guide](https://www.theiia.org/globalassets/site/standards/tr/or/org_resilience_tr_ug_en.pdf) | Opened 2026-11-19 | Organizational Resilience Topical Requirement User Guide |
| [Topical Requirements Application Guidance, issued 29 August 2025](https://www.theiia.org/globalassets/site/standards/topical-requirements/topical_requirements_application_guidance_english.pdf) | Opened 2026-11-19 | Topical Requirements Application Guidance |
| [Three Lines Model Statement of Position, published 8 July 2026](https://www.theiia.org/globalassets/site/resources/statements-of-position/tlm_assurance_advice_support_effective_gov_en.pdf) | Opened 2026-11-19 | IIA Statement of Position: Three Lines Model: Assurance and Advice in Support of Effective Governance |
| [Statement of Position on enterprise risk management, published 8 July 2026](https://www.theiia.org/globalassets/site/resources/statements-of-position/role_of_ia_function_enterprise_risk_mgmt_en.pdf) | Opened 2026-11-19 | IIA Statement of Position: The Role of the Internal Audit Function in Enterprise Risk Management |
| [Internal Auditing Competency Framework, Global Practice Guide issued 10 July 2025, public access](https://www.theiia.org/globalassets/site/content/guidance/recommended/supplemental/practice-guides/global-practice-guide-internal-auditing-competency-framework/gpg_internal_auditing_competency_framework_english.pdf) | Opened 2026-11-19 | IIA Global PG: Internal Auditing Competency Framework |
| [position paper on fraud, April 2019](https://www.theiia.org/globalassets/documents/resources/fraud-and-internal-audit-assurance-over-fraud-controls-fundamental-to-success-april-2019/fraud-and-internal-audit.pdf) | Opened 2026-11-19 | IIA Position Paper: Fraud and Internal Audit: Assurance Over Fraud Controls Fundamental to Success |
| [position paper on governing body and executive committees, November 2019](https://www.theiia.org/globalassets/documents/resources/internal-auditings-role-in-governing-bodyexecutive-committees-november-2019/pp-ias-role-in-governing-body-executive-committees.pdf) | Opened 2026-11-19 | IIA Position Paper: Internal Auditing's Role in Governing Body/Executive Committees |
| [position paper on conformance, May 2018](https://www.theiia.org/globalassets/documents/resources/why-conformance-matters-may-2018/why-conformance-matters.pdf) | Opened 2026-11-19 | IIA Position Paper: Why Conformance Matters |
| [CIA Part 1 syllabus (2025)](https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf) | Opened 2026-11-19 | CIA Part 1 syllabus (2025), Expanded Test Specifications V2.09.2024 FINAL |
| [CIA Part 2 syllabus (2025)](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf) | Opened 2026-11-19 | CIA Part 2 syllabus (2025), Expanded Test Specifications V2.09.2024 FINAL |
| [CIA Part 3 syllabus (2025)](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf) | Opened 2026-11-19 | CIA Part 3 syllabus (2025), Expanded Test Specifications V2.09.2024 FINAL |
| [CIA Challenge Exam syllabus (effective June 2026)](https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf) | Opened 2026-11-19 | CIA Challenge Exam syllabus (effective June 2026), V2.10.2025 FINAL |
| [Certification Candidate Handbook, March 2026](https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf) | Opened 2026-11-19 | IIA Certification Candidate Handbook (March 2026) |
| Not opened | For purchase: the textbook, primary reference 2, sold in the IIA Bookstore | Internal Auditing: Assurance & Advisory Services, 6th edition |
| Not opened | Members only: primary references 3 to 6; eBooks of some are also sold in the IIA Bookstore | IIA Global PG: Developing a Risk-Based Internal Audit Plan, 2nd edition; IIA Global PG: Engagement Planning: Assessing Fraud Risks; IIA Global PG: Integrated Approaches to Internal Auditing; IIA GTAG: IT Essentials for Internal Auditors |
| Not opened | Members only: secondary Global Practice Guides, references 11 to 24 and 26 | IIA Global PG: Assessing the Risk Management Process, 2nd edition; IIA Global PG: Auditing Anti-Corruption Activities, 2nd edition; IIA Global PG: Auditing Culture, 2nd edition; IIA Global PG: Auditing Privacy and Data Protection Risks, 3rd edition; IIA Global PG: Auditing Third-Party Risk Management; IIA Global PG: Communicating Final Engagement Results; IIA Global PG: Communicating Results of Internal Audit Services; IIA Global PG: Coordination and Reliance: Working with Other Assurance Providers; IIA Global PG: Data Analytics Skills for Internal Auditors; IIA Global PG: Developing an Internal Audit Strategy; IIA Global PG: Engagement Planning: Establishing Objectives and Scope, 2nd edition; IIA Global PG: Evaluating the Effectiveness of Ethics Programs; IIA Global PG: Interaction with the Board, 2nd edition; IIA Global PG: Internal Auditing and Fraud, 3rd edition; IIA Global PG: Understanding Data Analytics for Internal Auditors |
| Not opened | Members only: secondary GTAGs, references 27 to 38 | IIA GTAG: Assessing Cybersecurity Risk: The Three Lines Model; IIA GTAG: Auditing Business Applications, 2nd edition; IIA GTAG: Auditing Computing Infrastructure and IT Operations; IIA GTAG: Auditing Cyber Incident Response & Recovery, 2nd edition; IIA GTAG: Auditing Cybersecurity Operations: Prevention and Detection, 2nd edition; IIA GTAG: Auditing Identity and Access Management, 2nd edition; IIA GTAG: Auditing Insider Threat Programs; IIA GTAG: Auditing IT Governance and IT Management, 3rd edition; IIA GTAG: Auditing Mobile Computing, 2nd edition; IIA GTAG: Auditing Network and Communications Management, 2nd edition; IIA GTAG: IT Change Management, 4th edition; IIA GTAG: Understanding and Auditing Big Data, 2nd edition |
| Not opened | Members only: model charter tools, references 39 and 40 | The IIA's Guide to Customizing the Model Internal Audit Charter (General Use version); The IIA's Model Internal Audit Charter Tool (General Use version) |
| Not opened | Access not checked: no page found on theiia.org on 2026-11-19; position papers, references 42, 44 and 45 | IIA Position Paper: Internal Auditing's Role in Corporate Governance; IIA Position Paper: Relationships of Trust: Building Better Connections Between the Audit Committee and Internal Audit; IIA Position Paper: Staffing Considerations for the Internal Audit Activity |

**What the owner may need to supply.** IIA membership opens most Practice
Guides and GTAGs; the textbook is for purchase. Neither blocks the pilot: the
Standards, the Topical Requirements, the Three Lines Model paper and the
syllabuses are open. Topics that lean on unopened references (the fraud
triangle and schemes, control types in depth, the IT, finance and
business-process knowledge of Part 2 planning, limited versus reasonable
assurance) are written only as far as an opened source supports, and
`docs/content/CIA_BANK_PLAN.md` records where a topic stops for that reason.

## Topical Requirements calendar

The IIA does not score questions on a new Topical Requirement until at least
six months after its effective date. The reference list gives the month; where
it gives no day, KaiSip uses the first of the month. That is a few days or
weeks before the six-month mark (5 August 2026, 15 March 2027, 15 June 2027,
30 October 2027), on purpose: a learner should meet a topic slightly early,
not late.

| Topical Requirement | Issued | Effective | Testable on the exam from | Source |
|---|---|---|---|---|
| Cybersecurity Topical Requirement | 2025-02-05 | 2026-02-05 | 2026-08-01 | [cia-exam-references-v4.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v4.pdf) (V5.2.2026.07.27) |
| Third-Party Topical Requirement | 2025-09-15 | 2026-09-15 | 2027-03-01 | [cia-exam-references-v5.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v5.pdf) (V5.5.2026.10.15) |
| Organizational Behavior Topical Requirement | 2025-12-15 | 2026-12-15 | 2027-06-01 | [cia-exam-references-v5.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v5.pdf) (V5.5.2026.10.15) |
| Organizational Resilience Topical Requirement | 2026-04-30 | 2027-04-30 | 2027-10-01 | [cia-exam-references-v5.pdf](https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-references-v5.pdf) (V5.5.2026.10.15) |

An item that rests on a requirement that is not testable yet carries the date
in `testable_from`, and mock and free-sample pools leave it out until then.

Coming next, per The IIA's Topical Requirements page (opened 19 Nov 2026): an
Anti-Corruption requirement (to be issued in the fourth quarter of 2026) and a
Talent Management requirement (public consultation in January 2027). Neither
has an exam date yet; `cia-currency-checker` adds them when they do.

## Copyright, licence and marks: the rule KaiSip follows

Written by `app-store-compliance-reviewer` from The IIA's own pages, opened
19 Nov 2026 (the copyright notice, the licensing page, both licence-terms
pages, the notice inside the Standards PDF, and the United States trademark
search).

1. **Licence position (owner decision: build privately, settle it before
   selling).** The IIA's licensing page says all commercial use of its content
   and trademarks requires a licence, and names exam preparation and inclusion
   in software (including AI) among its examples. It exempts fair use with
   attribution. It lists a Training Provider Licence (US$500 a year for an IIA
   member, US$1,000 otherwise, for a sole proprietor; US$1,250 or US$2,500 for
   2 to 5 users) and a separate Software Developer Licence at a variable
   price, and says licensed content may not go into a publicly available AI
   system. KaiSip holds no licence. Rules 2 to 6 rest on that quote allowance and on general copyright
   law, not on IIA permission. See "Open items".
2. **Cite: yes.** Domain, principle and standard number and title, attributed
   to The IIA and the source document.
3. **Paraphrase only as original teaching**, in KaiSip's own structure, words
   and examples. Never restate a requirement sentence by sentence.
4. **Quote: one short phrase at most**, credited "The IIA, Global Internal
   Audit Standards (2024), Standard X.Y".
5. **Syllabus:** in anything a learner or the public can see, only topic
   codes, KaiSip's own short titles and a link to the official PDF; never the
   bullets or tables. This blueprint is an internal working document in a
   private repository: it lists, in KaiSip's own words, what each bullet is
   about so authors can check coverage. It is never published, never shipped
   in a pack, and never used as learner copy.
6. **Never used:** The IIA's practice questions (they are retired real exam
   questions), recalled exam items, the textbook's text, any prep provider's
   material. No prep provider's question bank is opened at all. No IIA file is
   stored in the repository, and no IIA text goes into any learner-facing AI feature.
7. **Marks, in notices:** "Certified Internal Auditor® (CIA®)", "CIA®
   Challenge Exam", "The IIA®", "Global Internal Audit Standards™". Plain in
   learner copy. No ® on "IPPF". No IIA logo. Never "official", "approved" or
   "IIA-aligned".
8. **Naming:** KaiSip or a generic course name first, the exam after "for".
   Never "Pass", no pass promise, no hint of endorsement, no mark in the app
   name, icon or developer name.
9. **Notice (About, paywall, store listing):** "Certified Internal Auditor®
   and CIA® are registered trademarks, and Global Internal Audit Standards™ is
   a trademark, of The Institute of Internal Auditors, Inc. (The IIA). KaiSip
   is an independent study aid. It is not affiliated with, sponsored, endorsed
   or licensed by The IIA. All notes and questions are written by KaiSip; none
   are actual exam questions." Short form: "Independent study aid. Not
   affiliated with or endorsed by The IIA."
10. **The CISA bridge:** write CISA® (ISACA's own form) and add "CISA® is a
    registered trademark of ISACA. Not affiliated with or endorsed by ISACA."
    No "conversion" or partnership wording.
11. **Stores:** Apple guidelines 5.2.1, 4.1(c), 2.3.7 and 3.1.1; Google Play's
    Impersonation, Intellectual Property, Metadata and Payments policies. Keep
    each item's `_provenance`; a complaint from a rights holder can remove a listing.

Trademark records seen on 19 Nov 2026 (United States search; the status pages
themselves were not opened): CIA 1882539 and IIA 2704273 live; CERTIFIED
INTERNAL AUDITOR 1926790 on the Supplemental Register; CISA 7404619 (ISACA)
live; GLOBAL INTERNAL AUDIT STANDARDS an application, not registered; no
record for "CIA Challenge"; IPPF 4150157 cancelled.

## Open items

1. **Licence (owner).** To settle before any pack goes on sale: ask
   licensing@theiia.org or an intellectual-property lawyer what KaiSip's use
   needs. Until then the course is built privately and nothing is published or
   sold. `docs/content/CIA_BANK_PLAN.md` section 9.
2. **Prices (owner): decide later.** Two expert options on record,
   `docs/content/CIA_BANK_PLAN.md` section 3.
3. **Unscored pretest questions.** No opened IIA file says whether an exam
   includes unscored questions. Do not state either way.
4. **The exact launch day of the 2025 syllabus** was seen in search results only.
5. **The 2019 part and domain names** are not confirmed from an opened source,
   so the stale-syllabus gate does not list them yet. "Implementation
   Guidance" and "Practice Advisory" are listed on the evidence that they
   appear nowhere in the 2024 Standards.
6. **Members-only and for-purchase references** (the table above).
7. **The trademark status pages** were not opened; re-check before the store listing.
8. **App changes before a pack is switched on:** `docs/content/CIA_BANK_PLAN.md` section 11.

## Sources

Every source, the date it was opened, its version label and what it
established: `docs/content/CIA_RESEARCH_LOG.md`. The syllabus files:

- Part 1: https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf
- Part 2: https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf
- Part 3: https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf
- Challenge Exam: the file linked from https://www.theiia.org/en/certifications/cia/challenge-exam/
- Global Internal Audit Standards: https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf
