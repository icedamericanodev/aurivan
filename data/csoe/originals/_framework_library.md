# CSOE Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CSOE question bank
(`data/csoe/originals/d{N}.json`). Started 31 Oct 2026, empty: no primary
source could be opened from the cloud environment on that date (see
`docs/content/CSOE_RESEARCH_LOG.md`, "Network check"). No CSOE question may be
written until the sources it cites are opened and listed here.

**Format** (same as the CC and CRISC libraries):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly
  (`data/csoe/tools/check_csoe.py` does this).
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it.

**Status key:**
- **Verified (opened, DATE):** the section, rule or paragraph was read at the
  primary source on that date. Say what was checked and give the URL.
- There is no "Likely" status for CSOE: thresholds, penalties and deadlines
  change, so an unopened source is not a citation.

**One form everywhere.** `<source> <locator> (<title or short paraphrase>)`,
with no comma before the parenthesis and one citation per `;` part. Forms:
- `Sarbanes-Oxley Act of 2002 Section 404(b) (Internal control evaluation and reporting)`
- `17 CFR 240.13a-15(f) (Definition of internal control over financial reporting)`
- `17 CFR 229.308(a) (Management's annual report on internal control over financial reporting)`
- `SEC Release No. 33-8810 Section II.B.1 (Evaluation of control deficiencies)`
- `PCAOB AS 2201.A7 (Definition of material weakness)`
- `Dodd-Frank Act Section 989G(a) (Exemption for smaller issuers)`
- `COSO Internal Control—Integrated Framework (2013) Principle 10 (Selects and develops control activities)`

(The examples above are in backticks, so the checker never matches them.
Each becomes a citation only when its source is opened and it is listed,
without backticks, under a source heading with a Verified status line.)

## Sources to open first

These are the sources the pilot will need. None is a citation yet.

| Source | Where | What to check |
|---|---|---|
| Sarbanes-Oxley Act of 2002, Pub. L. 107-204 | govinfo.gov (PLAW-107publ204), congress.gov | Section text for 101–109, 201–209, 301–308, 401–409, 802, 806, 807, 906, 1102, 1107 |
| 18 U.S.C. 1350 | govinfo.gov, law.cornell.edu | 906 certification and both penalty tiers |
| 17 CFR 240.12b-2 | ecfr.gov | Accelerated and large accelerated filer, smaller reporting company and emerging growth company definitions, current thresholds |
| 17 CFR 240.13a-14 and 13a-15 (and 15d-14, 15d-15) | ecfr.gov | Certifications; disclosure controls and ICFR evaluation; ICFR definition |
| 17 CFR 229.308 (Reg S-K Item 308) | ecfr.gov | Management's report, auditor's attestation report, quarterly changes |
| 17 CFR 240.10A-3 | ecfr.gov | Audit committee independence and duties; FPI accommodations |
| 17 CFR 240.3b-4 | ecfr.gov | Foreign private issuer definition |
| SEC Release No. 33-8238 (June 2003) | sec.gov | Management's report on ICFR and certification rules |
| SEC Release No. 33-8810 (June 2007) | sec.gov | Interpretive guidance for management's evaluation of ICFR |
| SEC Release No. 34-88365 (March 2020) | sec.gov | Accelerated filer definition amendments |
| Dodd-Frank Act, Pub. L. 111-203 | govinfo.gov | Sections 989G, 954, 922 and the PCAOB broker-dealer provisions |
| JOBS Act, Pub. L. 112-106 | govinfo.gov | Section 103 (EGCs and 404(b)); current EGC revenue cap on sec.gov |
| PCAOB AS 2201, AS 1305 | pcaobus.org | Integrated audit of ICFR; deficiency definitions; communications; current amendments |
| COSO Internal Control—Integrated Framework (2013), executive summary | coso.org | Five components and 17 principle names only |

The release numbers above come from memory and must be confirmed when
sec.gov opens; do not cite them until then.
