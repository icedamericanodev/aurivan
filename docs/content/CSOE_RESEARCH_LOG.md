# CSOE research log (Certified Sarbanes-Oxley Expert)

**Status:** 31 Oct 2026. Groundwork only. The issuer's site and every primary
law source were blocked from the cloud environment on this date, so **nothing
below is verified yet**. `docs/content/CSOE_BLUEPRINT.md` lists what must be
re-checked before any outline, note or question is written.

## How to read the source labels

| Label | Meaning |
|---|---|
| **PRIMARY-OPENED** | We opened the issuer's or the regulator's own page and read it. Only this label can back a keyed fact. |
| **PRIMARY-SNIPPET** | The issuer's own page appeared in web-search results, but we only saw the search engine's summary of it. It is a lead, not a source: summaries can merge pages or misquote. |
| **SECONDARY** | A third party (vendor blog, reseller, aggregator). Context only, never a source for the outline. |

No source on this page is PRIMARY-OPENED yet.

## Network check (31 Oct 2026)

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

## What the sources say (all unverified)

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

Primary (the issuer's own pages; seen only as search summaries on 31 Oct 2026, not opened):
- P1: Certified Sarbanes-Oxley Expert (CSOE), program page, https://www.sarbanes-oxley-association.com/Distance_Learning_and_Certification.htm
- P2: CSOE Exam (certification steps PDF), https://www.sarbanes-oxley-association.com/CSOE_Certification_Steps_1.pdf
- P3: Questions about the certification and the exams (FAQ PDF), https://www.sarbanes-oxley-association.com/Questions_About_The_Certification_And_The_Exams_1.pdf
- P4: Certified EU Sarbanes-Oxley Expert (CEUSOE), https://www.sarbanes-oxley-association.com/CEUSOE_Distance_Learning_and_Certification.htm
- P5: Certified Japanese Sarbanes-Oxley Expert (CJSOXE), https://www.sarbanes-oxley-association.com/CJSOXE_Distance_Learning_and_Certification.htm
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
- S9: Scribd upload "Certified Sarbanes-Oxley Expert Overview", https://www.scribd.com/document/461801720/1-CSOE-pdf (a user upload of what looks like issuer material; never use it as a source or copy from it)
