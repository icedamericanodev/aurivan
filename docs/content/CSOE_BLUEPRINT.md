# CSOE blueprint (Certified Sarbanes-Oxley Expert)

**Status: DRAFT, not yet an outline.** 31 Oct 2026. The issuer's site
(`www.sarbanes-oxley-association.com`) and every primary law source were
blocked from the cloud environment, so nothing here has been checked against
an opened page. Per the owner's rule, the outline is never built from search
summaries or third-party pages alone. Until the "Before any content" list
below is done:

- there are **no outline lines**, so `scripts/lint_notes.py --outline` has
  nothing to check CSOE notes against, and
- **no notes or questions** are written.

Sources and their status (PRIMARY-OPENED, PRIMARY-SNIPPET, SECONDARY) are in
`docs/content/CSOE_RESEARCH_LOG.md`. Source codes below (P1, S1 …) refer to it.

## Exam facts (all to verify)

| Fact | Value as reported | Status | Source |
|---|---|---|---|
| Issuer | Sarbanes Oxley Compliance Professionals Association (SOXCPA) | PRIMARY-SNIPPET | P1 |
| Delivery | Online, from home or office, any country | PRIMARY-SNIPPET | P2 |
| Length | 35 questions, 90 minutes (about 2.5 minutes each) | PRIMARY-SNIPPET | P2 |
| Item type | Multiple choice, four responses | PRIMARY-SNIPPET | P2 |
| Open book | Yes | PRIMARY-SNIPPET | P2 |
| Navigation | Cannot stop and resume; cannot skip. "Cannot go back" is in the owner's brief, not yet seen | PRIMARY-SNIPPET (part) | P2 |
| Pass mark | 70% or higher | PRIMARY-SNIPPET | P2 |
| Scope of questions | Only questions clearly answered in the official presentations | PRIMARY-SNIPPET | P2 |
| Retakes | A second opportunity (owner's brief, from the steps PDF). A third-party blog's "three a year" is not used | Unseen | P2 |
| Certificate | PDF by email | SECONDARY | S1 |
| Validity | Once certified, remain certified | SECONDARY | S3 |
| Domain weights | None published, as far as the search shows | — | P1 |

KaiSip's mock exam will copy the navigation rules (forward only, no skip, no
pause) once they are verified, and must say its score is not SOXCPA's.

## SOXCPA's official course parts (to verify)

The exam only tests what these presentations clearly answer, so this list is
the spine of the blueprint. As the search summaries give the program page:

| Part | Topics reported |
|---|---|
| 1 | The Sarbanes-Oxley Act: introduction, the CSOE exam, why the Act was needed, the Act; who it applies to, foreign private issuers, registration and EDGAR, case studies; employees affected; Sections 302, 404 and 906; committees and teams |
| 2 | The frameworks: COSO Internal Control—Integrated Framework (reported as the **1992** edition, cube and five components) and COSO ERM (2017) |
| 3 | The SEC and the Act; the PCAOB and the Act (PCAOB auditing standards) |
| 4 | Scope of Sarbanes-Oxley; E-SOX, the EU 8th Company Law Directive |
| 5 | The Dodd-Frank Act and the Sarbanes-Oxley amendments: SOX in post-crisis reform, the PCAOB under Dodd-Frank, Basel II/III and Dodd-Frank, the amendment to SOX |

## KaiSip's domain grouping (proposal, pending the parts above)

Proposed only to show the direction; **do not author against it.** It follows
the five reported parts, with two moves for teaching clarity. Codes are
withheld until the parts are verified.

| Proposed domain | From part | Core content (from the public law) |
|---|---|---|
| D1 The Act and its key sections | 1 | Titles of the Act; 302, 404(a)/(b), 906; 301 audit committee; 401–409 enhanced disclosures; 802, 806, 807, 1107 records, whistleblowers and penalties; who is affected |
| D2 Internal control frameworks and ICFR in practice | 2 (and 404 practice) | COSO 2013 components and principles (named, not reproduced); COSO ERM (2017) as context; management's top-down, risk-based evaluation (SEC 2007 guidance); deficiency, significant deficiency, material weakness |
| D3 The SEC, the PCAOB and the audit of ICFR | 3 | SEC role, reports (10-K, 10-Q, 8-K), Item 308, Rules 13a-14 and 13a-15; PCAOB creation, registration, inspection, standards, enforcement; AS 2201 integrated audit; auditor independence (Title II) |
| D4 Scope, filers and international issuers | 4 (and FPIs from 1) | Who is an issuer; filer categories and thresholds; smaller reporting and emerging growth companies; foreign private issuers, ADRs, registration and EDGAR; E-SOX at concept level |
| D5 Dodd-Frank and the SOX amendments | 5 | 404(c) for non-accelerated filers (989G); clawbacks (304 versus 954 and Rule 10D-1); whistleblowers; PCAOB and broker-dealer auditors; the JOBS Act's EGC exemption as a later amendment |

**Weights.** SOXCPA publishes none (as far as the search shows). Once the
course parts open, weight each domain by its share of the official course
(for example slides or minutes per part) and record it as **KaiSip's reading,
not SOXCPA's**.

## Question targets (decided 31 Oct 2026)

`product-manager` and `behavioral-scientist` were asked separately and agreed:

| Decision | Value | Why |
|---|---|---|
| Full bank | **about 300** (range 250–350) | About 120–160 distinct rules, two or three angles each. Past that, a fact bank fills with the same question reworded, which trains recognition of wording instead of the rule. At 20 items a day for 3–6 weeks a learner sees each item 3–4 times |
| Pilot | 20 per domain (owner's brief) | Every course part touched at least once |
| Held-out mock items | about 70 (two 35-item forms) | Never shown in practice, so the mock tests transfer to unseen items |
| Difficulty mix | about 30% recall / 55% application / 15% analysis | Open-book, fact-based exam; recall items test telling look-alike rules apart |

Per-domain targets are set from the weights once the parts are verified. Keep
the bank size out of learner copy.

## The CSOE lens

Full standard: `.claude/agents/csoe-standards-auditor.md`. In short: answers
follow the letter of the Act and the SEC and PCAOB rules (which section, of
whom, what, by when, with what consequence), not best practice; management
owns and assesses ICFR, the CEO and CFO certify (302 and 906 differ), the
auditor attests (404(b)) under PCAOB standards, the audit committee oversees
the auditor, the PCAOB oversees audit firms, the SEC oversees issuers and the
PCAOB. Every threshold keyed on is checked at its current primary source.

## Trademarks

- No USPTO record for "Certified Sarbanes-Oxley Expert" or "CSOE" was found
  through aggregators; the USPTO itself was blocked (S6). Until it opens: **no
  ®** on either; use them plainly and only to name the exam ("for the CSOE
  exam").
- Never imply SOXCPA endorsement, never use SOXCPA's logo or the word
  "official" about KaiSip content.
- "CSOX" and "CSOXP" are registered marks of the Sarbanes Oxley Group, a
  different body (S6). Never use them.
- Notice line: "KaiSip is not affiliated with or endorsed by the Sarbanes
  Oxley Compliance Professionals Association (SOXCPA)."

## Before any content (open items)

1. **Allow the hosts** (owner, environment settings): required
   `www.sarbanes-oxley-association.com`; for primary law `www.sec.gov`,
   `pcaobus.org`, `assets.pcaobus.org`, `www.govinfo.gov`, `www.congress.gov`,
   `www.ecfr.gov`, `www.federalregister.gov`, `www.law.cornell.edu`,
   `www.coso.org`; for the trademark check `tmsearch.uspto.gov` and
   `tsdr.uspto.gov`. Optional: `www.aicpa-cima.com`, `eur-lex.europa.eu` (for
   E-SOX).
2. **Open P1, P2 and P3** and replace every PRIMARY-SNIPPET row above with
   PRIMARY-OPENED (or correct it). Confirm the exact list of course parts and
   topics, the navigation rules and the retake rule.
3. **Fix the domains, codes, weights and outline lines** from the verified
   parts, then create the `csoe-d{N}-domain-expert` agents (modelled on
   `cc-d1-domain-expert.md` and `crisc-d1-domain-expert.md`).
4. **Open the primary sources** in `data/csoe/originals/_framework_library.md`
   ("Sources to open first") and list each as Verified with its date.
5. **Owner decisions** (see `docs/content/CSOE_BANK_PLAN.md` section 8): the
   COSO edition if the course keys on 1992 wording; whether KaiSip should
   enrol in the SOXCPA course to see the presentations (a cost); the free
   sample rule for a small bank; where CSOE sits in the roadmap.
