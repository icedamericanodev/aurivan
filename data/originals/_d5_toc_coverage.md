# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-9 (d5_161..d5_180).

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       26 |         0 ✓ CLOSED |
| Application   |    130 |      100 |        30 |
| Analysis      |    104 |       54 |        50 |
| **Total**     |    260 |      180 |        80 |

## TOC coverage (D5-1 through D5-9)

| TOC §  | Title                                                    | Authored | Status |
|--------|----------------------------------------------------------|---------:|:-------|
| 5.1    | Information Asset Security Frameworks, Standards, Guidelines | 8    | ✓ opened |
| 5.2    | Privacy Principles                                       |        9 | ✓ opened |
| 5.3    | Physical Access and Environmental Controls               |       12 | ✓ opened |
| 5.4    | Identity and Access Management                           |       13 | ✓ opened |
| 5.5    | Network and End-Point Security                           |       12 | ✓ opened |
| 5.6    | Data Loss Prevention                                     |        6 | ✓ opened |
| 5.7    | Data Encryption                                          |       15 | ✓ opened |
| 5.8    | Public Key Infrastructure (PKI)                          |        5 | ✓ opened |
| 5.9    | Web-Based Communication Techniques                       |        5 | ✓ opened |
| 5.10   | Virtualized Environments                                 |        6 | ✓ opened |
| 5.11   | Mobile, Wireless, IoT Devices                            |        9 | ✓ opened |
| 5.12   | Security Awareness Training and Programs                 |        6 | ✓ opened |
| 5.13   | Information System Attack Methods and Techniques         |       14 | ✓ opened |
| 5.14   | Security Testing Tools and Techniques                    |       17 | ✓ opened |
| 5.15   | Security Monitoring Tools and Techniques                 |       23 | ✓ opened |
| 5.16   | Incident Response Management                             |       20 | ✓ opened (D5-9) |
| 5.17   | Evidence Collection and Forensics                        |        0 | pending |

## Remaining coverage plan (D5-10 through D5-13)

80 questions across 4 batches. Mix targets: 0F + 30A + 50An remaining.

| Batch | Mix | TOC focus |
|---|---|---|
| **D5-10** | 0F+10A+10An | §5.16 IR extend + §5.17 Forensics (open) |
| **D5-11** | 0F+10A+10An | §5.17 (extend) |
| **D5-12** | 0F+10A+10An | §5.17 (close) — **A TIER CLOSES at 130** |
| **D5-13 FINAL** | 0F+0A+20An | Capstone analysis spanning all D5 — **An TIER CLOSES at 104** |

After D5-13: all 17 D5 TOC sections covered + all three tier targets met.

## Batch log

### D5-1 through D5-8 (d5_001..d5_160)
§5.1 through §5.15 opened across batches 1-8. See git history.

### D5-9 (d5_161..d5_180) — 1F + 9A + 10An — **F TIER CLOSES at 26**
§5.16 Incident Response Management (full batch, 20 questions):
- IR lifecycle (NIST SP 800-61 Rev 2 four phases) — foundational
- IR plan canonical elements + CSIRT structure
- Incident classification severity matrix + escalation framework
- Tabletop exercise design + External IR retainer engagement
- IR communication framework + Threat intel sharing during IR + Post-incident review
- Multi-region incident coordination (analysis) + Cyber insurance + IR coordination (analysis)
- **SaaS customer material breach** (single-focus NOTIFY-FIRST-FOR-CUSTOMER-PROTECTION — NEW)
- Cross-cloud multi-regulator incident (analysis) + Crisis comms during major incident (analysis)
- IR plan failure analysis (analysis) + Threat actor attribution disclosure (analysis)
- **Major architecture decision during incident** (single-focus DEFER-MAJOR-DECISIONS-DURING-CRISIS — NEW)
- Third-party breach affecting firm (analysis) + IR readiness assessment remediation (analysis)

**Position rotation D5-9:** 5A + 5B + 5C + 5D.
**Plus-list pattern:** 8 multi-track analysis + 2 single-focus (d5_173 NOTIFY-FIRST, d5_178 DEFER-DECISIONS).
**TWO NEW single-focus principles (10 total D5 principles):**
- **NOTIFY-FIRST-FOR-CUSTOMER-PROTECTION** (d5_173): when B2B SaaS confirms material customer-data breach with customer regulatory clocks at stake, customer notification is FIRST action. Customer-clock obligations supersede SaaS-firm coordination convenience.
- **DEFER-MAJOR-DECISIONS-DURING-CRISIS** (d5_178): major architectural / strategic decisions proposed during active incident should DEFER until incident closes. Crisis-context decision quality is degraded.
**Citation reuse:** library at ~1620 entries (+~90 D5-9 citations: NIST SP 800-61 Rev 2, ISO/IEC 27035, CERT CSIRT Handbook, FIRST.org, FEMA HSEEP, Mandiant/CrowdStrike retainer methodologies, GDPR Article 33, SEC Reg S-K Item 1.05, Kahneman cognitive biases, Google SRE blameless postmortems).
