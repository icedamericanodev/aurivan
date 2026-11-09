# Concept Lab expansion — batch 1 review

Branch: `codex/concept-lab-expansion`, based on main `5e3fad10c1777e3453dc9f9604ca46fcc46cf687` (PR #241).

## Scope and coordination

Five new original fictional CISA labs: segregation of duties (D5), risk-based audit planning (D1), governance and risk ownership (D2), change management (D3), and business impact analysis (D4). Together with the unchanged recovery pilot they cover all five domains. The pilot retains `cisa-lab-rto-rpo` and its recovery model.

Before editing, reviewed merged #241 and open PRs including Mistake DNA #240 and topic cards #242. The Today sessions were reported stopped before edits by the coordinating conversation. No Today, Mistake Journal, lesson/note presentation, plant companion, progress schema or release configuration is changed here. Learn changes only its Concept Lab summary; catalog and detail changes stay within lab routes. This branch must remain a draft pending owner review and outstanding native acceptance. No merge, OTA, deployment or production package upload is authorized.

## Architecture

The registry is a discriminated union of the existing recovery shape and five concrete scenario shapes. Each scenario owns educational content and configuration. Pure, validated engine functions evaluate assignments, priorities, responsibility, workflow ordering and dependency coverage. A separate expansion renderer reuses Grove controls and the three-stage experience. State exists only in the mounted screen. Reset creates fresh scenario state; leaving and reopening does not save completion.

Related practice uses the existing guarded session starter, so optional real practice retains its normal entitlement/progress semantics. Exploring labs does not write readiness, SRS, mistake history or lesson completion. References describe public sources; the learning experiences themselves require no network, backend, account, new permissions or dependencies.

## Validation record

- Full `npm run check` passed: typecheck, ESLint, 362 Jest suites / 7,173 passed tests / 2 existing skips, and generated web-bundle checks. Aggregate Jest runtime was 301.643 seconds.
- Focused pilot/expansion regression passed 89 tests initially. Final expanded content/UI suites passed 25 tests; engine/content specialist rerun passed 11 tests. See [specialist review](SPECIALIST_REVIEW.md).
- Final Android export passed, along with OFF-cloud bundle, release-channel, shared-source and size guards. Bundle: 11.40 MB / 14 MB; CISA content: 4.68 MB / 6 MB.
- Repository health passed with a writable temporary npm cache. An initial attempt failed because npm tried to create its cache under the unavailable home path; no source change was needed. Expo telemetry was disabled to avoid the same home-directory issue during lint.
- Browser QA passed 20 combinations (five labs × light/dark × normal/320px approximate 200% text), covering offline interaction, reset, retry and progress isolation. Zero browser page errors. Existing RTO/RPO light/dark browser regression passed, including drag/tap bounds and vertical-scroll protection.
- [Screenshots and matrix](screenshots/README.md): 22 selected captures committed; 80 expansion captures plus 16 pilot captures generated locally. Visual inspection confirmed readable wrapped controls and scrollable enlarged text.
- Public source and relevant study-link review is recorded in [SOURCES.md](SOURCES.md). Review corrected emergency testing order, governance-preview labeling, approval-authority wording, screen-reader value feedback, practice relevance and prospective BIA exposure wording.

App-size/performance: approximately 46 KB of new uncompressed production TypeScript across content, engine and renderer, no new binary assets/dependencies. The measured final Android JavaScript bundle is 11.40 MB; this is not an APK/AAB size delta. Small bounded arrays are evaluated on control changes/render; no animation loops or network requests were added. Physical-device startup, frame timing and low-end responsiveness were not benchmarked.

Native Android TalkBack, native 200% font scaling, VoiceOver, and lower-end device performance require a native device/emulator. Browser enlarged text is an approximation, not a substitute. No adb is available in this cloud environment.

## Second batch gate

Labs 07–09 (least privilege/access review, migration/reconciliation, evidence reliability) belong on a separate branch/PR after batch 1 is complete and reviewed. Reuse the same stage shell and resource navigation, but give reconciliation and evidence evaluation their own concrete models. Do not broaden the current five-lab PR or duplicate the recovery timeline. Resolve any batch 1 native acceptance findings before treating the expansion as release ready.

### Proposed Labs 07–09 implementation

| Lab | Concrete interaction | New pure checks | Review emphasis |
| --- | --- | --- | --- |
| Least privilege and access reviews (D5) | Grant/revoke permissions for job roles, temporary privileged work and leavers; inspect review evidence | Scope, expiry, role mismatch and unsupported conclusions | Access appropriate to a task is not universally prohibited; review evidence must support effective removal |
| Data migration and reconciliation (D3) | Map source fields and compare source/target records and monetary totals; repair omissions and duplicates | Unique keys, missing/duplicate records, invalid mappings and control totals | Equal record counts alone do not prove completeness or accuracy |
| Audit evidence reliability (D1) | Assemble an evidence set for a stated assertion, inspect provenance, timeliness and corroboration | Assertion coverage and explicit limitations, not a universal reliability score | Distinguish relevance, reliability and sufficiency; contextual evidence combinations |

Create a separate branch from the reviewed batch-1 baseline (stacked explicitly if batch 1 is still unmerged). Reuse only the stage shell and study-resource actions. Keep each new evaluator small, deterministic and tested, and require original applications with specific feedback and the same offline/accessibility checks. No second-batch implementation has been started while batch-1 acceptance is pending.

## Source files changed

- `mobile/src/content/labs/index.ts`
- `mobile/src/content/labs/expansion.ts`
- `mobile/src/engine/conceptLabExpansion.ts`
- `mobile/src/components/conceptLabExpansion.tsx`
- `mobile/src/app/labs/[id].tsx`
- `mobile/src/app/labs/index.tsx`
- `mobile/src/app/(tabs)/learn.tsx`
- `mobile/src/__tests__/conceptLab.test.ts`
- `mobile/src/__tests__/conceptLab-screens.test.tsx`
- `mobile/src/__tests__/conceptLabExpansion.test.ts`
- `mobile/src/__tests__/conceptLabExpansion-content.test.ts`
- `mobile/src/__tests__/conceptLabExpansion-screens.test.tsx`
- `mobile/scripts/screenshots/run.sh`
- `mobile/scripts/screenshots/shoot_labs.mjs`
- `mobile/scripts/screenshots/shoot_lab_expansion.mjs`

Review documents and selected screenshots are under `docs/mobile/concept-lab-expansion/`.
