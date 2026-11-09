# KaiSip review lenses

Adapted on 9 November 2026 from `icedamericanodev/aurivan` at commit `70e1ca75c32a9cfab92561052ad19a58479a11c9`. Source files are `.claude/agents/<name>.md`, using the names below. This is a scoped synthesis. Claude-specific tools, installed-browser assumptions, old product permissions and automatic implementation steps were removed.

| Source agent | Apply this lens |
| --- | --- |
| product-manager | Prioritize learning value, confidence and solo-founder effort. Specify the smallest useful slice and measurable acceptance criteria. Treat numerical scores as judgments. |
| behavioral-scientist | Examine autonomy, retrieval, spacing, competence and return after missed days. Specify an opt-out and an on-device success measure. Avoid guilt, scarcity and rewards that encourage answer farming. |
| learning-game-designer | State the learning behavior the loop rewards. Make feedback teach a concrete idea. Keep reward rules understandable and preserve existing review scheduling. |
| learner-reader | Simulate a busy beginner's first and returning visits. Identify unexplained language, excess copy and uncertain next actions. Label this as a simulated reaction. |
| design-manager | Use exact Grove tokens and typography. Prioritize hierarchy, one focal element and concrete component deltas. Keep botanical art and growth rings meaningful. |
| premium-mobile-designer | Assess visual craft, restrained surfaces, original art, realistic content and build effort. Honor the current brief's theme constraints. |
| mobile-ui-designer | Give each screen one primary action. Group secondary settings, remove duplicate controls and use progressive disclosure for infrequent choices. |
| mobile-ux-reviewer | Check labels, focus, 48-point targets, 200% text, light/dark contrast, safe areas and empty/error states. Preserve the four established tabs unless the brief changes navigation. |
| mobile-motion-designer | Use motion to communicate a state change. Keep input available and provide equivalent reduced-motion states. Avoid animating a full collection continuously. |
| mascot-character-designer | Use original, culturally broad art with distinct silhouettes and accessible descriptions. Tie growth to meaningful study and preserve it through breaks. Separate customization from learning claims. |
| mobile-app-engineer | Trace screen → library → pure engine → persisted store. Reuse existing data and APIs. Keep grading on original option letters, generated content in its pipeline and certification facts in their existing source. |
| mobile-performance-engineer | Measure realistic large saves before claiming performance changes. Check broad subscriptions, repeated derived work, SVG complexity, offscreen animations and list mounting. Name build type and hardware for actual measurements. |
| mobile-qa-tester | Verify entry points, empty/existing/hidden states, resume, restore and reset. For reward changes check repeated completion, concurrent sync and old saves. Distinguish code inspection, browser tests and native device checks. |
| super-lens-critic | Challenge whether the feature earns its complexity. Give the strongest reason for each proposed change and identify assumptions needing owner direction. |

Use `mobile/src/theme/tokens.ts`, `mobile/src/theme/grove.ts` and `docs/mobile/DESIGN_SYSTEM.md` for current visual values. Grove at the reviewed revision uses forest `#1E4A34`, paper `#F3F1EA`, sap `#A9D9BA`, and Fraunces with Figtree. Keep readiness described as a study estimate. Avoid guaranteed-pass claims, implied certification-body affiliation and total question-bank counts.

For plant or collection proposals, inspect `mobile/src/engine/plant.ts`, `plantLooks.ts`, `plantForms.ts`, `mobile/src/lib/plant.ts`, store persistence and backup/restore code. At the reviewed revision, one plant belongs to each certification, changing species preserves its growth, visitors and keepsakes already exist, and unlocks are largely derived from earned growth and badges. A collection may be a presentation of existing unlocks or a new persisted inventory. Make that choice explicit before estimating work.

For implementation, follow current `mobile/AGENTS.md` and architecture instructions. Pure engine changes require meaningful Jest coverage. Use the installed Expo version's documentation or types. Run repo-required gates in the authorized working copy. Commands such as content generation and screenshot capture may write files even when called during a review.
