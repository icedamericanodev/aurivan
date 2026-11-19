# Concept Lab expansion source and content review

Reviewed 9 November 2026. All scenarios, assignment rules and numeric models are original fictional teaching examples. None is an official ISACA scoring methodology or a claim that all organizations use these roles or workflows.

## Public references checked

- [ISACA current CISA outline](https://www.isaca.org/credentialing/cisa/cisa-exam-content-outline): Domain 1 risk-based audit planning; Domain 2 organizational structure/governance and enterprise risk; Domain 3 implementation configuration and release management; Domain 4 business impact analysis and resilience; Domain 5 identity/access control. Compared with `docs/content/CISA_ECO.md` (effective 1 August 2024).
- [NIST SP 800-53 Rev. 5](https://doi.org/10.6028/NIST.SP.800-53r5), AC-5 and AC-6: separation of duties and least privilege. CM-3 and CM-4: controlled changes and impact analysis. NIST publication page and public control text checked; these controls inform objectives, while the lab's purchasing conflicts and emergency sequence are explicitly scenario rules.
- [ISACA, Risk-based Audit Planning for Beginners](https://www.isaca.org/resources/isaca-journal/issues/2017/volume-2/is-audit-basics-risk-based-audit-planning-for-beginners): audit universe and risk-based planning. The lab's ordinal formula is original, labeled educational, and does not purport to calculate loss probability or formally approve scope.
- [The IIA Three Lines Model](https://www.theiia.org/globalassets/documents/resources/the-iias-three-lines-model-an-update-of-the-three-lines-of-defense-july-2020/three-lines-model-updated-english.pdf): governing-body oversight, management accountability, internal-audit independence. Fictional charter delegates specific acceptance and funding decisions; this is not a universal organizational structure.
- [NIST SP 800-34 Rev. 1](https://doi.org/10.6028/NIST.SP.800-34r1), §3.2 BIA and §3.4 contingency strategies: requirements, resource dependencies and recovery prioritization. Financial exposure is illustrative linear interruption cost; criticality sorting is a discussion aid, not an objective-setting algorithm.

## Verified related content

Read the lesson records and corresponding note references in the authored CISA packs. Practice references resolve to original KaiSip questions; no proprietary question text was copied into the labs.

| Lab | Lesson and note | Practice | Principles |
| --- | --- | --- | --- |
| Segregation of duties | `cisa-l-d2-sod`, `2A2.6`: splitting duties and compensating controls. Cross-domain D2 material intentionally supports this D5 access-control activity. | `d2_008`, `d2_037`: segregation and related control judgment | `least-privilege-and-sod`, `compensating-controls-fallback` |
| Risk planning | `cisa-l-d1-risk-planning`, `1A3.1`: risk-focused audit planning | `d1_003`: current risk rather than fixed rotation | `risk-sets-priority`, `materiality-judgment` |
| Risk ownership | `cisa-l-d2-governance`, `2A2.1`: governance versus management | `d2_001`, `d2_002` | `management-owns-risk`, `independence-throughout` |
| Change controls | `cisa-l-d3-change`, `4A8.1`: change controls. D4 operational-change notes intentionally support this D3 release workflow. | `d4_033`: patch urgency; `d4_185`: independent emergency-change review. Replaced initially proposed `d4_028` (source-code custody) after relevance review. | `prevent-before-detect`, `proven-not-configured` |
| Business impact | `cisa-l-d4-bia`, `4B1.1`: BIA before strategy | `d4_004`, `d4_020` | `recover-by-business-priority`; existing `cisa-lab-rto-rpo` deep link |

The emergency lab's company requires delegated emergency approval before deployment. Other documented procedures may allow independent approval soon afterward (as discussed in linked question `d4_185`). The lab does not require the normal change-board cycle or normal predeployment testing in every emergency. Final acceptance requires human educational review as well as the recorded automated and specialist checks.
