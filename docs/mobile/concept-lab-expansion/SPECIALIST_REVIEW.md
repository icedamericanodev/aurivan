# Independent batch 1 specialist review

Reviewed 9 November 2026 on `codex/concept-lab-expansion`, against the working tree based on main `5e3fad1`. This was an independent code/content review using the repository mobile security, mobile UX/accessibility and ISACA concept-review checklists. No application files were edited by the reviewer.

## Findings and verified corrections

- **Blocking logic error, fixed:** emergency workflow validation originally rejected deferred testing completed before subsequent review and allowed testing after review. The comparison is now `before(3, 6)`; regression tests cover both orderings.
- **Educational precision, fixed:** the governance Explore preview explicitly identifies the intentionally incorrect assignments as a flawed draft. The audit-planning screen now refers to the charter-designated approval authority, rather than implying management universally approves internal audit scope.
- **Accessibility precision, fixed:** numeric increment/decrement actions announce the new labeled value. Existing shared buttons expose selection/disabled state and provide non-drag interaction alternatives. Actual native speech and focus behavior remain device acceptance work.
- **BIA precision, fixed:** financial values use consistent units and explicitly describe prospective unserved exposure after a proposed recovery wave. Copy states that recovery does not erase losses already incurred. Priority ordering is labeled illustrative and preserves the need for business judgment.
- **Related-content precision, fixed:** the change lab replaces the weak source-code-custody practice link `d4_028` with `d4_185`, whose original question concerns emergency changes outside the normal advisory-board cycle. `d4_033` addresses risk-based urgent patch handling.

## Content and security assessment

The five models are explicitly fictional. Segregation-of-duties conflicts are scenario rules rather than universal prohibitions; independent detective review is not presented as preventing loss or eliminating collusion. Governance follows a stated charter and preserves audit independence. Audit priority is an educational ordinal model, not an ISACA formula. Emergency handling permits justified deferred testing without treating urgency as an exemption from authorization and review. BIA connects business needs, dependencies and recovery resources without replacing business-approved RTO/RPO.

Public source checks confirmed the [current CISA outline](https://www.isaca.org/credentialing/cisa/cisa-exam-content-outline), the [ISACA risk-based planning article](https://www.isaca.org/resources/isaca-journal/issues/2017/volume-2/is-audit-basics-risk-based-audit-planning-for-beginners), the [IIA Three Lines paper](https://www.theiia.org/globalassets/documents/resources/the-iias-three-lines-model-an-update-of-the-three-lines-of-defense-july-2020/three-lines-model-updated-english.pdf), and [NIST SP 800-34 Rev. 1](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf). NIST sections 3.2 and 3.4 support BIA and contingency strategy relationships. Domain 3 implementation/release controls overlap Domain 4 operational change controls; the related operational note is relevant despite the different domain label.

No new persistent state, network requests, dependencies, authentication requirements, entitlement changes or progress-writing paths were found in the expansion. Optional practice retains the existing guarded session entry. Registry lookup remains certification scoped; the recovery pilot's content, calculations and stable identifier are preserved. This scoped review does not constitute a repository-wide security audit or dependency vulnerability scan.

## Executed verification and verdict

The reviewer ran:

```sh
cd mobile
npm test -- --runInBand src/__tests__/conceptLabExpansion.test.ts src/__tests__/conceptLabExpansion-content.test.ts
```

Both the initial corrected-code run and final-source rerun passed: **2 suites, 11 tests**. Final local output: `/tmp/specialist-lab-final-tests.log`.

**No further blocking code/content finding in the reviewed scope. Conditional acceptance for a draft PR:** require the implementation team's full automated gates and visual QA, plus owner review. Native Android TalkBack, native 200% font scale, VoiceOver and lower-end device performance were not tested by this reviewer; browser or source review cannot establish those outcomes. This review authorizes no merge, deployment, OTA publication or production package upload.

## Topic-card design correction

Development review correctly identified that the earlier combined checks did not prove the new labs inherited #242's layout. The expansion renderer was separate from the pilot route. This is now corrected using the exact `TopicCard` component from #242 head `3ce4bec` (blob `151d7157114c98b21a3934e65b498ddd47ca2227`). Each expansion stage is one continuous surface; internal sections use dividers and no nested `HubCard`s.

Independent source review verified stable state/reset/heading and scroll refs, separate accessible controls, and byte-identical shared source. The independent screen suite passed 24 tests. Visual inspection covered light Experiment/Apply, light enlarged controls, and dark BIA/Apply captures: consistent surfaces, readable wrapping, no visible clipping in the inspected views. No design-parity blocker remains. This supersedes the earlier merge-compatibility-only assessment; native accessibility remains unverified.
