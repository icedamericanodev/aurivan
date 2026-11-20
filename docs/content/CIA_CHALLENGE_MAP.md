# CIA Challenge Exam map

How the topics of the CIA Challenge Exam line up with the topics of CIA Parts 1, 2
and 3, down to the lettered bullets.

## What this is

The CIA Challenge Exam is one exam that leads to the CIA for people who come in
through one of The IIA's Challenge pathways (for example, holders of an active CISA).
There is a single Challenge Exam, with one syllabus (effective 1 June 2026), and
every pathway follows the same content: 150 multiple-choice questions in 180 minutes.

This map is KaiSip's own line-by-line match of the syllabus files we opened: the
Challenge syllabus (label V2.10.2025 FINAL) against the three part syllabuses (label
V2.09.2024 FINAL). It was done on 19 Nov 2026 by exact text comparison. It is not a
statement from The IIA.

The short titles are KaiSip's own, taken from `data/cia/shared/outline.json`. For the
official wording, open the PDFs:

- Challenge syllabus: https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf
- CIA Part 1: Internal Audit Fundamentals: https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf
- CIA Part 2: Internal Audit Engagement: https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf
- CIA Part 3: Internal Audit Function: https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf

## Codes

- A Challenge topic is `C`, section letter, topic number: `CA1` is Challenge Section A,
  topic 1.
- A Part topic is part, section letter, topic number: `1A2` is Part 1, Section A, topic 2.
- In question files the field `challenge_ref` drops the leading C: `"A1"` means CA1.

## Challenge Exam sections

| Section | Name | Weight | Topics |
|---|---|---|---|
| A | Internal Audit Professionalism and Quality | 20% | 8 |
| B | Internal Audit Operations and Audit Plan | 15% | 7 |
| C | Engagement Planning | 20% | 7 |
| D | Engagement Performance | 25% | 10 |
| E | Engagement Results and Monitoring | 20% | 8 |
| Total | | 100% | 40 |

## Topic map

"Exact" means the topic line and every bullet have the same text in both syllabuses,
under the same letters.

| Challenge code | Part code | Short title | Bullets in Challenge | Bullets in Part | Match |
|---|---|---|---|---|---|
| CA1 | 1A2 | The mandate and who sets it | 3 | 3 | Exact |
| CA2 | 1A7 | Threats to internal audit independence | 5 | 5 | Exact |
| CA3 | 1A8 | Internal audit and the Three Lines Model | 3 | 3 | Exact |
| CA4 | 1B2 | Objectivity impairments of individual auditors | 2 | 2 | Exact |
| CA5 | 1B6 | Confidentiality and proper use of information | 4 | 4 | Exact |
| CA6 | 3C1 | Quality assurance and improvement program | 7 | 7 | Exact |
| CA7 | 3C2 | Disclosing nonconformance with the Standards | 2 | 2 | Exact |
| CA8 | 3C3 | Performance measures for internal audit | 4 | 4 | Exact |
| CB1 | 3A1 | Running internal audit operations | 4 | 4 | Exact |
| CB2 | 3A2 | Managing money, people and technology | 7 | 7 | Exact |
| CB3 | 3A3 | Internal audit strategy and its stakeholders | 4 | 4 | Exact |
| CB4 | 3A4 | Chief audit executive reporting and relationships | 5 | 5 | Exact |
| CB5 | 3B1 | Audit universe and engagement sources | 7 | 7 | Exact |
| CB6 | 3B2 | Building the risk-based audit plan | 3 | 3 | Exact |
| CB7 | 3B3 | Coordinating with other assurance providers | 3 | 3 | Exact |
| CC1 | 2A1 | Engagement objectives and scope | 5 | 5 | Exact |
| CC2 | 2A2 | Choosing evaluation criteria | 2 | 2 | Exact |
| CC3 | 2A3 | Planning around key risks and controls | 7 | 6 | Topic line and bullets a to f exact; bullet g is in the Challenge syllabus only |
| CC4 | 2A4 | Choosing the engagement approach | 2 | 2 | Exact |
| CC5 | 2A5 | Detailed engagement risk assessment | 7 | 7 | Exact |
| CC6 | 2A6 | Procedures and the work program | 5 | 5 | Exact |
| CC7 | 2A7 | Resources and skills for the engagement | 4 | 4 | Exact |
| CD1 | 2B1 | Sources of engagement information | 2 | 2 | Exact |
| CD2 | 2B2 | Judging the quality of evidence | 3 | 3 | Exact |
| CD3 | 2B3 | Technology tools for audit work | 1 | 1 | Exact |
| CD4 | 2B4 | Analytics and process mapping | 5 | 5 | Exact |
| CD5 | 2B5 | Analytical review techniques | 2 | 2 | Exact |
| CD6 | 2B6 | Findings and their significance | 3 | 3 | Exact |
| CD7 | 2B7 | Workpapers that support the results | 4 | 4 | Exact |
| CD8 | 2B8 | Reaching engagement conclusions | 2 | 2 | Exact |
| CD9 | 2C1 | Supervising the engagement | 4 | 4 | Exact |
| CD10 | 2C2 | Communicating during the engagement | 3 | 3 | Exact |
| CE1 | 3D1 | Qualities of good results communication | 3 | 3 | Exact |
| CE2 | 3D2 | Writing the final engagement communication | 3 | 3 | Exact |
| CE3 | 3D3 | Recommendations and management action plans | 3 | 3 | Exact |
| CE4 | 3D4 | Closing communication and report distribution | 5 | 5 | Exact |
| CE5 | 3D5 | Residual risk, aggregation and ratings | 3 | 3 | Exact |
| CE6 | 3D6 | When management accepts too much risk | 3 | 3 | Exact |
| CE7 | 3D7 | Following up on action plans | 2 | 2 | Exact |
| CE8 | 3D8 | Escalating actions that were not completed | 2 | 2 | Exact |
| Total (40 topics) | | | 148 | 147 | |

## How the match was checked, and the result

A script compared the text of every topic line and every bullet in the Challenge
syllabus with the Part topic it maps to. Two texts count as the same when they are
equal after lowercasing and removing punctuation and extra spaces, so a line break or
a stray period from the PDF is not a difference.

- Topic lines: 40 of 40 Challenge topic lines are the same as their Part topic line.
- Bullets: the Challenge syllabus has 148 bullets. 147 are the same as the bullet
  with the same letter under the matched Part topic. 1 has no match in that topic (CC3 g).
- The other way round: the 40 matched Part topics have 147 bullets, and all 147
  appear in the Challenge syllabus. Nothing was dropped or reworded.
- The IIA hosts two copies of the Challenge PDF (one ends in `-v2`). Both carry the
  label V2.10.2025 FINAL, and their sections, topic lines and bullets are the same word
  for word. They differ in page layout, and only the copy without `-v2` prints
  "Effective June 2026" at the top of each page. The IIA's Challenge syllabus page
  (https://www.theiia.org/en/content/certifications/cia-challenge-exam-syllabus/) links to the
  `-v2` copy, so that is the one recorded in outline.json. The other copy is at
  https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus.pdf

Run the comparison again whenever either version label changes.

## Bullets that exist only in the Challenge syllabus

There is one.

| Challenge bullet | About (our words) | Where the content lives | How KaiSip serves it |
|---|---|---|---|
| CC3 g | Fraud basics: what fraud risk is, the kinds of fraud, the fraud triangle and the schemes seen most often | Part 1 topic 1D1 (Fraud triangle, fraud risks and schemes), which is not a Challenge topic | Items written on 1D1 may carry `challenge_ref` "C3", so the generated Challenge pack can draw them into CC3 |

CC3 maps to Part 2 topic 2A3, whose six bullets (a to f) do not cover fraud basics. In
the three-part exam that material is taught in Part 1. The Challenge syllabus folds it
into engagement planning as a seventh bullet. In outline.json, 1D1 keeps `challenge`
null (it is not a Challenge topic), and the link is recorded under CC3 as an
`extra_bullets` entry with `content_in` "1D1".

## Part topics that are NOT on the Challenge Exam

All 22 are in Part 1. Every topic of Parts 2 and 3 is on the Challenge Exam.

- 1A1 Purpose of Internal Auditing
- 1A3 Internal audit charter requirements
- 1A4 Assurance versus advisory services
- 1A5 Kinds of assurance engagements
- 1A6 Kinds of advisory work
- 1B1 Acting with integrity
- 1B3 Policies and safeguards for objectivity
- 1B4 Skills and competencies auditors need
- 1B5 Due professional care and skepticism
- 1C1 Organizational governance basics
- 1C2 Culture and the control environment
- 1C3 Ethics and compliance issues
- 1C4 Types of risk
- 1C5 The risk management process
- 1C6 Risk management across the organization
- 1C7 Internal control concepts and control types
- 1C8 Control design, effectiveness and efficiency
- 1D1 Fraud triangle, fraud risks and schemes (its content still feeds the Challenge-only bullet CC3 g)
- 1D2 Weighing fraud risk in an engagement
- 1D3 Fraud risk management and red flags
- 1D4 Controls that prevent and detect fraud
- 1D5 Fraud investigation techniques and roles

By Part 1 section: 5 of 8 in Section A, 4 of 6 in Section B, 8 of 8 in Section C, 5 of 5 in Section D.

## Where the Challenge topics come from

| Part | Topics in the part | On the Challenge Exam | Not on it | Share of the 40 Challenge topics |
|---|---|---|---|---|
| CIA Part 1: Internal Audit Fundamentals | 27 | 5 | 22 | 12.5% |
| CIA Part 2: Internal Audit Engagement | 17 | 17 | 0 | 42.5% |
| CIA Part 3: Internal Audit Function | 18 | 18 | 0 | 45% |
| Total | 62 | 40 | 22 | 100% |

The IIA gives a weight for each section, not for each topic. If a section's weight is
spread evenly over its topics (KaiSip's working assumption, not an IIA figure), each
part's share of the Challenge Exam is:

| Challenge section | Weight | Topics from Part 1 | Topics from Part 2 | Topics from Part 3 | Weight by part (percentage points) |
|---|---|---|---|---|---|
| A Internal Audit Professionalism and Quality | 20% | 5 | 0 | 3 | Part 1: 12.5, Part 3: 7.5 |
| B Internal Audit Operations and Audit Plan | 15% | 0 | 0 | 7 | Part 3: 15 |
| C Engagement Planning | 20% | 0 | 7 | 0 | Part 2: 20 |
| D Engagement Performance | 25% | 0 | 10 | 0 | Part 2: 25 |
| E Engagement Results and Monitoring | 20% | 0 | 0 | 8 | Part 3: 20 |
| Total | 100% | 5 | 17 | 18 | Part 1: 12.5, Part 2: 45, Part 3: 42.5 |

On a 150-question exam that is roughly 19 questions on Part 1 topics, 67 on Part 2 topics and 64 on Part 3 topics.
So the Challenge Exam is mostly about doing and managing audit work (Parts 2 and 3), with a
thin slice of Part 1: the mandate, independence, the Three Lines Model, objectivity and
confidentiality, plus fraud basics through CC3 g.

Sections do not line up one to one with part sections:

- Challenge Section A draws on Part 1 Section A, Part 1 Section B and Part 3 Section C.
- Challenge Section B draws on Part 3 Section A and Part 3 Section B.
- Challenge Section C draws on Part 2 Section A.
- Challenge Section D draws on Part 2 Section B and Part 2 Section C.
- Challenge Section E draws on Part 3 Section D.

Depth of the 40 Challenge topics, from the leading verb of each topic line (recall is
Describe, Recognize, Identify, Explain; apply is Interpret, Apply, Demonstrate, Maintain;
judge is the rest, such as Determine and Evaluate):

| Challenge section | recall | apply | judge |
|---|---|---|---|
| A Internal Audit Professionalism and Quality | 6 | 1 | 1 |
| B Internal Audit Operations and Audit Plan | 7 | 0 | 0 |
| C Engagement Planning | 0 | 0 | 7 |
| D Engagement Performance | 1 | 4 | 5 |
| E Engagement Results and Monitoring | 6 | 1 | 1 |
| Total | 20 | 6 | 14 |

## What this means for building

- **Parts 2 and 3 are entirely shared.** All 17 Part 2 topics and all 18 Part 3 topics
  are Challenge topics, so work on them fills two products at once.
- **Part 1 is mostly its own.** Only 5 of its 27 topics are shared: 1A2, 1A7, 1A8, 1B2, 1B6.
  Topic 1D1 also feeds the Challenge through bullet CC3 g.
- **Write once, tag once.** Every question is written a single time, in the file of its
  Part, and tagged with `challenge_ref` (the Challenge topic it serves, or null). The
  tag must equal the `challenge` value that outline.json gives for the item's topic.
  An item on a shared topic may carry null when it is too basic for an experienced
  Challenge candidate. Items on 1D1 may carry "C3".
- **The Challenge pack is generated.** A build script draws the tagged items to the
  Challenge section weights. Nobody edits the generated pack by hand. The only
  hand-written Challenge files are its exam guide, its final review week and the
  bridge notes.
- **Weights differ between the exams.** The same topics carry different weight in each
  exam. For example, engagement planning is 50% of Part 2 but 20% of the Challenge
  Exam. The generator must draw to the Challenge weights, not copy the Part mix.
- **Same lines, same verbs.** A shared topic has the same verb in both syllabuses, so
  its depth (recall, apply or judge) is the same in both products.
- **Keep it current.** If The IIA issues a new label for any of the four syllabuses,
  run the comparison again before trusting this map.
