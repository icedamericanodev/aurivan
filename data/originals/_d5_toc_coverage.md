# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-4 (d5_061..d5_080).

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       16 |        10 |
| Application   |    130 |       48 |        82 |
| Analysis      |    104 |       16 |        88 |
| **Total**     |    260 |       80 |       180 |

## TOC coverage (D5-1 through D5-4)

| TOC §  | Title                                                    | Authored |
|--------|----------------------------------------------------------|---------:|
| 5.1    | Information Asset Security Frameworks, Standards, Guidelines | 8    |
| 5.2    | Privacy Principles                                       |        9 |
| 5.3    | Physical Access and Environmental Controls               |       12 |
| 5.4    | Identity and Access Management                           |       13 |
| 5.5    | Network and End-Point Security                           |       12 |
| 5.6    | Data Loss Prevention                                     |        6 |
| 5.7    | Data Encryption                                          |       15 |
| 5.8    | Public Key Infrastructure (PKI)                          |        5 |
| 5.9    | Web-Based Communication Techniques                       |        0 |
| 5.10   | Virtualized Environments                                 |        0 |
| 5.11   | Mobile, Wireless, IoT Devices                            |        0 |
| 5.12   | Security Awareness Training and Programs                 |        0 |
| 5.13   | Information System Attack Methods and Techniques         |        0 |
| 5.14   | Security Testing Tools and Techniques                    |        0 |
| 5.15   | Security Monitoring Tools and Techniques                 |        0 |
| 5.16   | Incident Response Management                             |        0 |
| 5.17   | Evidence Collection and Forensics                        |        0 |

## Batch log

### D5-1 (d5_001..d5_020) — 4F + 12A + 4An
§5.1 Security Frameworks/Standards/Baselines (8) + §5.3 Physical & Environmental (12).

### D5-2 (d5_021..d5_040) — 4F + 12A + 4An
§5.2 Privacy Principles (9) + §5.4 Identity and Access Management (11).

### D5-3 (d5_041..d5_060) — 4F + 12A + 4An
§5.5 Network/Endpoint Security (12) + §5.4 IAM closing (2: ABAC, IGA) + §5.6 DLP (6).

### D5-4 (d5_061..d5_080) — 4F + 12A + 4An
§5.7 Data Encryption (15): cryptographic primitives taxonomy, symmetric vs asymmetric,
hash properties, AES modes (GCM/CCM/CBC/ECB), TLS 1.2 vs 1.3, HSM vs software keystore,
key management lifecycle, database encryption layered selection, cloud KMS audit,
post-quantum cryptography readiness (NIST FIPS 203/204/205), tokenization vs encryption
vs hashing for PCI, key escrow and recovery + §5.8 PKI (5): PKI components,
certificate lifecycle, digital signature audit, certificate transparency and pinning,
CA compromise response.

Analysis (4): CA compromise immediate revocation (single-focus); HSM partition failure
mid-transaction (multi-track); PQC migration roadmap defense contractor (multi-track);
backup encryption key destruction (single-focus air-gapped restore).

**Position rotation D5-4:** 5A + 5B + 5C + 5D (perfect).
**Plus-list pattern:** 2/4 analysis (d5_077 CA revocation + d5_080 air-gapped restore
intentionally single-focus surgical-action).
**Citation reuse:** library at 1284 entries (+53 D5-4 citations covering NIST FIPS 180-4/202,
NIST SP 800-38 series, NIST SP 800-57, NIST SP 800-152, IETF RFC 8446/5280/3161/9162/8555,
CA/Browser Forum, NSA CNSA 2.0, DoD CMMC 2.0, HIPAA Security Rule §164.308, OCC Bulletin 2008-13).
