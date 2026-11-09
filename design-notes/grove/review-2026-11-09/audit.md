# KaiSip Grove review

Reviewed mobile source at **70e1ca75c32a9cfab92561052ad19a58479a11c9** in icedamericanodev/aurivan on 9 November 2026. The active checkout contained another chat’s uncommitted work, including Settings. Findings below use the committed baseline. GitHub access also confirmed the repository and its current Claude learning-game role. The artifact branch starts from main at fab490421b7c27f8641aaf8bed7daf20eec63287, which is a different baseline from the mobile review.

**Recommendation — put study first and offer a small collection under You.** Mix plants, woodland visitors and objects as permanent keepsakes for existing milestones. The design hypothesis is that this provides a little delight with less explanation. It requires learner validation.

## Evidence and proposed changes

Priorities are design judgments. P1 means resolve before building this direction, P2 means a follow-up simplification.

| Priority / surface | Observed in reviewed source | Recommendation and copy |
|---|---|---|
| P1 · Home / Today | home.tsx lines 819–868 puts the plant stage, ring and readiness caption before the plan. Start follows around 898–933. | Move the study plan first. Retain time, focused area, progress and resume behavior. Use “Today’s plan”, “Practice IS Operations”, “5 questions · about 6 min”, “Start study” or “Continue study”. |
| P1 · Plant distribution | Home has plant entry, growth and cleared-day surfaces. You has a forest plant card before study statistics. There is no separate Plants tab in the current four-tab layout. | Consolidate discovery into You → “Your collection” / “Small keepsakes from your study”. Place it below study progress. Remove plant setup and growth messages from the ordinary Home path. |
| P1 · Your plant | plant.tsx contains growth history, five domain mappings, next growth, final form, style, species and name controls. | Retain the illustration and name. Put editing behind “Edit plant” and explanation behind “How it grows”. Relocate domain performance to study progress. Remove the visible multi-rule growth checklist from the simplified default view. |
| P1 · You | you.tsx lines 321–340 places the plant card before the subsequent statistics and readiness sections. | Prioritize study summary and progress, then one quiet collection row. Retain clear access to Settings. |
| P1 · Onboarding | onboarding.tsx has no current plant-choice step. Comments contain conflicting historical descriptions. The first-five component supplies the actual offer. | Retain the direct study start. Offer the collection through You. Do not add a choice during onboarding. |
| P1 · First-five completion | firstSet.tsx lines 430–479 shows an existing-plant line or planting block after the recap/reminder ask. PlantOffer lines 555–558 offers an oak and Maybe later. | Remove the planting decision from this recap. Keep results and “Done for today”. If an opted-in learner earns a keepsake, add a secondary “Added to your collection · Wren” row after the main handoff. |
| P2 · Settings | settings.tsx lines 584–618 groups badge visibility, plant visibility and appearance editing. | Keep a single visibility control near collection preferences. “Show my collection” / “Your items are kept when hidden.” Put appearance editing inside the optional destination. |
| P2 · Copy | Plant growth explanations involve readiness, domain coverage, recall and mocks. | Keep one next milestone, preferably in a disclosure. “Next keepsake” / “Finish your first topic”. Item detail explains the actual completed action in one sentence. |

Source locations refer to the reviewed commit. [Home source](https://github.com/icedamericanodev/aurivan/blob/70e1ca75c32a9cfab92561052ad19a58479a11c9/mobile/src/app/%28tabs%29/home.tsx), [plant source](https://github.com/icedamericanodev/aurivan/blob/70e1ca75c32a9cfab92561052ad19a58479a11c9/mobile/src/app/plant.tsx), [first-five source](https://github.com/icedamericanodev/aurivan/blob/70e1ca75c32a9cfab92561052ad19a58479a11c9/mobile/src/components/firstSet.tsx).

## Light gamification options

| Option | Appeal | Main tradeoff | Recommendation |
|---|---|---|---|
| Keepsake shelf with plants and animals | Variety, choice and existing milestone links | Can duplicate badges unless reward presentation is consolidated | First experiment |
| Collection of finished plants | Strong Grove identity and favorite-species choice | Multiple growing plants recreate state and copy complexity | Use static collectible illustrations |
| Animal visitors | Warm character and easy-to-recognize silhouettes | Permanent ownership is a new rule for visitors that currently appear on cleared days | Include a few in the same collection |
| Single pet | Naming and emotional attachment | Care, feeding and happiness create extra obligations and art states | Explore later if learners want a companion |

The code already includes Wren and Robin visitors and badge-linked keepsakes such as Jay, Fern, Lantern and Fox. Existing species switching is free and growth-preserving. A future collection must preserve existing choices, named plants and earned cosmetics. Reuse stable IDs and actual milestone events. Award once per milestone, retain rewards through ordinary breaks, and specify reset/backup/merge behavior before promising permanent ownership across resets. [Existing catalogue](https://github.com/icedamericanodev/aurivan/blob/70e1ca75c32a9cfab92561052ad19a58479a11c9/mobile/src/engine/plantLooks.ts).

## Mockup

Open **kaisip-grove.html** in a browser. It is a standalone file with embedded repository fonts and local demo storage.

- Today → Start study → choose an answer → Finish sample → View Wren → collection.
- You → collection → compare the single-plant concept → choose species and name.
- You → Settings → hide/show the collection. Its demo data is retained.
- Learn and Practice offer a compact sample interaction. They are limited concept screens.

The prototype uses Grove paper #F3F1EA, ink #17231B, forest #1E4A34 / #245A40, mint #A9D9BA, Fraunces and Figtree. Original simplified SVG art approximates the botanical feel. Illustration fidelity and the complete dark theme are deferred.

Deliberate simplifications include fictional study metrics, one authored sample question in place of the displayed five-question plan, an immediately available oak, and a Wren reward triggered by completing the sample. These demonstrate navigation and reward placement. Production earning should use an existing verified milestone. The sample question has not received the repository’s exam-content review. Replaying the sample resets its demo reward state.

The manually composed grove-preview.png and SVG show the proposed hierarchy at 390 px and 320 px. They use fallback typography and are visual design boards, not browser screenshots.

## Comparison and validation

Existing store screenshots were inspected. Their Today screen uses an older five-tab layout and a plan-first hero. The stored plant screen shows the dense growth checklist. They are historical visual references. The committed mobile source, which uses four tabs and a ring-first Home, is the current structural evidence. Grove reference boards are design targets, not proof of the current rendered app.

JavaScript syntax and a Node VM interaction harness passed navigation, answer feedback, completion, collection reward, visibility, plant editing, escaped names, demo persistence writes and unknown-route fallback. This is logic verification with a minimal DOM stub.

Actual browser rendering at 390×844, 375×635 and 320×568 remains unverified. A local headless browser launch failed. The in-app browser rejected the local file URL under its security policy. No workaround was attempted. Overflow, first-screen CTA placement, 200% text, keyboard traversal and screen-reader announcements require browser/device validation. Native performance and accessibility were not tested.

Fourteen repository expert definitions were applied across three independent AI review passes, covering product, learning, behavior, learner perspective, design, motion, mascot, criticism, engineering, performance and QA. These are structured AI judgments, not human research or evidence of improved learning outcomes.

The reusable Codex/ChatGPT skill is included in kaisip-design-review. It adapts the existing roles and defers to the repository workflow. YAML validation passed with Ruby. The bundled Python validator could not start because PyYAML is unavailable. The package has not been installed globally.

## Next decision

Review whether the optional collection feels worth keeping. Then test a learner’s ability to start study, explain the next milestone, find the collection, and hide it without fear of loss. Evaluate completed planned sessions and return after a break before expanding the catalogue. The earlier Grove ring-first owner decision is explicitly reconsidered by this study-first concept.
