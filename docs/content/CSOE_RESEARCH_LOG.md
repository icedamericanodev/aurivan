# CSOE research log (Certified Sarbanes-Oxley Expert)

**Status:** 31 Oct 2026, second pass. After the owner allowed the hosts, the
issuer's program page (P1), exam steps PDF (P2) and FAQ PDF (P3) were opened
in full, and the primary law sources were downloaded. Every exam fact in
`docs/content/CSOE_BLUEPRINT.md` now rests on an opened issuer page. The first
pass (search summaries only) is kept below as history, with corrections.

## Second pass: what the opened pages changed

| Earlier lead (first pass) | Opened source says | Source |
|---|---|---|
| "Cannot go back" was in the owner's brief only | Confirmed: no moving backwards to review or change answers | P2 |
| Retakes: "a second opportunity" (owner) vs "three a year" (blog) | Up to 3 attempts a year; after a third failure, wait one year from the first exam, then 3 more. The blog was closer | P1, P2 |
| Certificate lifetime validity (secondary) | Confirmed: lifetime, no renewal or recertification | P3 |
| No list price found | US$147 all-inclusive; full refund within 60 days | P1 |
| Course parts from search summaries | Confirmed, with far more detail: Part 1 walks the Act title by title; Part 4 adds spreadsheets, SAS 70 / SSAE 16 / SSAE 18 and J-SOX; Part 5 adds FSOC, orderly liquidation, the Federal Insurance Office and the Volcker Rule | P1 |
| Course teaches the 1992 COSO framework | It teaches 1992 and the 2013 update, and ERM 2004 and the 2017 update | P1 |
| — | Official presentations: 1,022 slides; about 29 hours of study; SOXCPA sends no sample questions | P1, P2, P3 |
| — | Exam advice: look for the best answer; cross out the options you know are wrong first | P2 |
| — | SOXCPA is wholly owned by Compliance LLC | P3 |
| — | Question format: a stem that is "a question asked, or an incomplete statement to be completed", plus four responses; one template across Compliance LLC's exams; no review of the exam afterwards | P2, P3, P7, P8 |
| No USPTO record found through aggregators | USPTO search opened: no record for "Certified Sarbanes-Oxley Expert", "SOXCPA" or the association's name; "CSOE" has one unrelated live application (serial 99526032, class 42 software, not registered) | tmsearch.uspto.gov |

The owner also attached a copy of P2; its SHA-256 matches the file on the
issuer's site.

## Network (31 Oct 2026, second pass)

| Host | Result |
|---|---|
| www.sarbanes-oxley-association.com, www.sec.gov, www.govinfo.gov, www.law.cornell.edu, www.coso.org, www.aicpa-cima.com, tmsearch.uspto.gov, tsdr.uspto.gov | Open |
| pcaobus.org, www.congress.gov | The site answers with a Cloudflare challenge (not our network). Not worked around |
| www.ecfr.gov, www.federalregister.gov | Redirect automated requests; 17 CFR read from law.cornell.edu instead |
| eur-lex.europa.eu | Bot challenge (202) |
| www.fsa.go.jp, www.japaneselawtranslation.go.jp, op.europa.eu, finance.ec.europa.eu, investor.gov | Still blocked by the network policy |

The web fetcher keeps the allowlist it had when the session started; plain
downloads (curl) see the new allowlist.

## How to read the source labels

| Label | Meaning |
|---|---|
| **PRIMARY-OPENED** | We opened the issuer's or the regulator's own page and read it. Only this label can back a keyed fact. |
| **PRIMARY-SNIPPET** | The issuer's own page appeared in web-search results, but we only saw the search engine's summary of it. It is a lead, not a source: summaries can merge pages or misquote. |
| **SECONDARY** | A third party (vendor blog, reseller, aggregator). Context only, never a source for the outline. |

P1–P3 are PRIMARY-OPENED as of the second pass. The tables under "First pass" keep their first-pass labels as history.

## First pass: network check (31 Oct 2026)

Every host below refused the connection from the cloud environment (proxy
`403` on CONNECT for the shell; "host not allowed" for the web fetcher). Only
`www.isaca.org` answered (200).

| Host | Needed for | Result |
|---|---|---|
| `www.sarbanes-oxley-association.com` | The issuer: program page, steps PDF, FAQ PDF | Blocked (required) |
| `www.sec.gov` | Final rules, interpretive releases, filer definitions | Blocked |
| `pcaobus.org`, `assets.pcaobus.org` | AS 2201 and the other auditing standards | Blocked |
| `www.coso.org` | COSO Internal Control (2013) and ERM (2017) summaries | Blocked |
| `www.govinfo.gov`, `www.congress.gov` | The Act (Pub. L. 107-204), Dodd-Frank, JOBS Act | Blocked |
| `www.ecfr.gov`, `www.federalregister.gov` | 17 CFR (Reg S-K Item 308, Rules 13a-14, 13a-15, 12b-2) | Blocked |
| `www.law.cornell.edu` | Second copy of the U.S. Code and CFR | Blocked |
| `www.aicpa-cima.com` | Context on AU-C and the private-company side | Blocked |
| `tmsearch.uspto.gov`, `tsdr.uspto.gov` | Trademark check for "CSOE" and the full name | Blocked |

## First pass: what the sources said (superseded by the table above)

### Issuer and program

| Fact | Status | Source |
|---|---|---|
| The issuer is the Sarbanes Oxley Compliance Professionals Association (SOXCPA), at sarbanes-oxley-association.com | PRIMARY-SNIPPET | P1 |
| The CSOE is a distance-learning, online certification program | PRIMARY-SNIPPET | P1 |
| SOXCPA also runs sister programs: Certified EU Sarbanes-Oxley Expert (CEUSOE) and Certified Japanese Sarbanes-Oxley Expert (CJSOXE). Not the CSOE: do not mix them in | PRIMARY-SNIPPET | P4, P5 |
| Membership is not a prerequisite; lifetime members pay a reduced price for each program | PRIMARY-SNIPPET | P6 |
| No list price for the CSOE was found. A 2009 press release gave US$147 (outdated) | SECONDARY | S5 |

### Exam format

| Fact | Status | Source |
|---|---|---|
| Online, from home or office, in any country | PRIMARY-SNIPPET | P2 |
| 35 questions in 90 minutes | PRIMARY-SNIPPET (also S1) | P2, S1 |
| Multiple choice, four possible responses | PRIMARY-SNIPPET | P2 |
| Open book | PRIMARY-SNIPPET (also S1) | P2, S1 |
| You cannot stop and resume; you cannot skip questions | PRIMARY-SNIPPET | P2 |
| You cannot go back to an earlier question | Owner's brief only; not seen in any snippet | — |
| Pass mark 70% or higher | PRIMARY-SNIPPET (also S1) | P2, S1 |
| The exam contains only questions clearly answered in the official presentations | PRIMARY-SNIPPET | P2 |
| Certificate by email as a PDF (S1 adds: seven business days after passing, with a QR code) | SECONDARY | S1, S3 |
| Once certified you remain certified (no renewal) | SECONDARY only (S3 says "lifetime validity") | S3 |
| Retakes: SOXCPA's steps PDF gives a second opportunity (owner's brief); a third-party blog says three attempts a year | Unseen | P2 (to open) |
| No formal prerequisites | SECONDARY | S1 |

### Course parts (the official presentations)

The issuer's program page reportedly lists five parts. This is the most
important thing to verify, because the exam only tests what these parts teach.

| Part | Title and topics as the search summaries give them | Status |
|---|---|---|
| Part 1 | The Sarbanes-Oxley Act: introduction, the CSOE exam, the need for the Act, the Act itself; who it applies to, foreign private issuers, registration and EDGAR, case studies; employees affected; Sections 302, 404 and 906; committees and teams | PRIMARY-SNIPPET (merged with S1) |
| Part 2 | The frameworks: COSO Internal Control — Integrated Framework (the summary names the **1992** edition, its cube and five components) and COSO ERM (2017) | PRIMARY-SNIPPET |
| Part 3 | The SEC and the Sarbanes-Oxley Act; the PCAOB and the Sarbanes-Oxley Act (one source adds "PCAOB auditing standards: what we need to know") | PRIMARY-SNIPPET (also S1) |
| Part 4 | Scope of Sarbanes-Oxley; E-SOX, the EU's 8th Company Law Directive | PRIMARY-SNIPPET |
| Part 5 | The Dodd-Frank Act and the Sarbanes-Oxley amendments: SOX within post-crisis regulatory reform, the PCAOB under Dodd-Frank, Basel II/III and Dodd-Frank, the amendment to SOX | PRIMARY-SNIPPET |

Leads from this list, to settle once the page opens:
- **COSO edition.** If the course still teaches the 1992 framework, the 2013
  framework (which superseded it on 15 Dec 2014) is the current one. KaiSip
  must teach the current framework and may note the older one as history. A
  question keyed on 1992-only wording would be outdated. Owner decision if the
  exam itself keys on 1992 wording.
- **E-SOX and Basel.** The 8th Company Law Directive (2006/43/EC) has been
  amended (Directive 2014/56/EU and Regulation (EU) No 537/2014), and EU law
  (eur-lex.europa.eu) is not reachable either. These topics stay at concept
  level until a current source opens.
- **Foreign private issuers** sit in Part 1 (registration) and perhaps Part 4
  (scope). The domain grouping must decide where.

### Not the same credential (do not mix in)

| Credential | Issuer | Source |
|---|---|---|
| CSOX (Certified Sarbanes-Oxley Expert-style program, "CSOX" and "CSOXP" marks) | Sarbanes Oxley Group, sox.org | S4, S6 |
| Sarbanes-Oxley Certified Professional | The Knowledge Academy | S7 |
| Certified Sarbanes-Oxley Professional (CSOP) | Chartered Certifications and others | S8 |

Their domain weights, formats and pass marks do not apply to the CSOE.

### Trademarks

| Fact | Status | Source |
|---|---|---|
| No USPTO record was found in aggregators for "Certified Sarbanes-Oxley Expert" or "CSOE" | SECONDARY (aggregators only; USPTO blocked) | S6 |
| The Sarbanes Oxley Group (a different body) holds registered marks CSOX (Reg. No. 3416451, 22 Apr 2008), CSOXP, CESG and SOX INSTITUTE | SECONDARY | S6 |

Until USPTO opens: no ® on "CSOE" or the full name; use them plainly and only
to name the exam ("for the CSOE exam"), never imply SOXCPA endorsement, never
use SOXCPA's logo, and never use "CSOX" (a registered mark of another body).

## Sources

Primary (the issuer's own pages; P1–P3 opened in full on 31 Oct 2026, second pass; P4–P6 seen only as search summaries):
- P1: Certified Sarbanes-Oxley Expert (CSOE), program page, https://www.sarbanes-oxley-association.com/Distance_Learning_and_Certification.htm
- P2: CSOE Exam (certification steps PDF), https://www.sarbanes-oxley-association.com/CSOE_Certification_Steps_1.pdf
- P3: Questions about the certification and the exams (FAQ PDF), https://www.sarbanes-oxley-association.com/Questions_About_The_Certification_And_The_Exams_1.pdf
- P4: Certified EU Sarbanes-Oxley Expert (CEUSOE), https://www.sarbanes-oxley-association.com/CEUSOE_Distance_Learning_and_Certification.htm
- P5: Certified Japanese Sarbanes-Oxley Expert (CJSOXE), https://www.sarbanes-oxley-association.com/CJSOXE_Distance_Learning_and_Certification.htm
- P7: CEUSOE exam steps PDF, https://www.sarbanes-oxley-association.com/CEUSOE_Certification_Steps_1.pdf (opened 31 Oct 2026; identical to P2 apart from the exam name)
- P8: CJSOXE exam steps PDF, https://www.sarbanes-oxley-association.com/CJSOXE_Certification_Steps_1.pdf (opened 31 Oct 2026; same exam rules and stem description)
- P6: Lifetime membership, https://www.sarbanes-oxley-association.com/Lifetime_Membership.html and https://www.sarbanes-oxley-association.com/How_to_become_member.htm

Secondary (context only; checked 31 Oct 2026 through search summaries):
- S1: Pathlock, "SOX Compliance Certifications & Training Programs", https://pathlock.com/blog/sox-compliance/sox-certifications-and-trainings/
- S2: Lumos, "Is a SOX Certification Worth It?", https://www.lumos.com/topic/sox-compliance-is-a-sox-certification-worth-it (vendor with a commercial interest)
- S3: Guzman Gray, "The Complete SOX Audit Certification Guide", https://guzmangray.com/sox-audit-certification/
- S4: Sarbanes Oxley Group, CSOX, https://www.sox.org/csox (a different credential)
- S5: PR.com press release (2009), https://www.pr.com/press-release/130447
- S6: Trademark aggregators: https://trademarkdir.com/owner/sarbanes-oxley-group, https://markinton.com/trademark/csox-78658358
- S7: The Knowledge Academy, Sarbanes-Oxley Certified Professional, https://www.theknowledgeacademy.com/us/courses/sarbanes-oxley-training/sarbanes-oxley-certified-professional/ (a different credential)
- S8: Chartered Certifications, CSOP, https://charteredcertifications.com/learning/courses/certified-sarbanes-oxley-professional-csop (a different credential)
- S10: IARCP (a sister association under Compliance LLC), CRCMP exam steps, https://www.risk-compliance-association.com/CRCMP_Certification_Steps_1.pdf (search summary only; the host is blocked): same stem description, 35 items, 90 minutes, 70%
- S9: Scribd upload "Certified Sarbanes-Oxley Expert Overview", https://www.scribd.com/document/461801720/1-CSOE-pdf (a user upload of what looks like issuer material; never use it as a source or copy from it)
