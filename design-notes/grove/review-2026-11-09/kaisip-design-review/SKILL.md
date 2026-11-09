---
name: kaisip-design-review
description: Audit KaiSip mobile UI and evaluate optional learning rewards using aurivan's product, learner, Grove design, accessibility, engineering and QA review lenses. Use for KaiSip screen simplification, companion or collection concepts, and reviewable prototypes.
---

Use this skill to turn a KaiSip design question into an evidence-backed recommendation and, when requested, a reviewable mockup. The accompanying [review lenses](references/review-lenses.md) adapt the aurivan Claude agent definitions for Codex. They also work as written instructions when supplied to a ChatGPT conversation with the relevant source material.

## Establish the review

Read the requested checkout's AGENTS.md, CLAUDE.md and CONTRIBUTING.md and record its commit. This skill adapts the existing repository workflow and defers to it. Inspect screen implementations, relevant engine/store code, Grove tokens and existing screenshots. Label old marketing images and design reference boards with their provenance. A screenshot is evidence only for the state it actually shows.

An audit or mockup request authorizes the requested deliverables. Keep production implementation, source changes and release actions within the user's stated scope. If another session owns the checkout or emulator, use read-only source inspection and an isolated prototype workspace. Skip repository commands that generate content, caches or screenshots there.

Read `references/review-lenses.md` and select the relevant lenses. Use independent agents when the user asks for a panel or when session instructions authorize delegation. Otherwise apply the lenses in one review. Describe the result as AI review, and distinguish simulated learner reactions from user testing.

## Evaluate and propose

- Identify the learner's main task on each requested surface. Locate competing controls and repeated copy before adding features.
- Preserve the requested Grove identity using actual tokens, fonts, components and marks. Historical agent permissions to replace the theme do not override the current brief.
- Give each finding a code or image reference, observed behavior, design judgment, priority and concrete replacement copy or interaction.
- For rewards, compare the smallest workable alternatives. Define the qualifying study event, when the reward appears, whether it persists, how it can be hidden, and its relationship to current progress data. State untested motivation hypotheses plainly.
- Prefer a clear recommendation with tradeoffs. Preserve dissent when it changes the decision. Do not manufacture consensus, measured engagement gains or expert credentials.
- Cite primary research when making substantive learning-science claims. Proposal-specific predictions remain hypotheses until measured.

## Make the result reviewable

If asked for a prototype, implement meaningful primary interactions and disclose demo data, simplified behaviors and missing production states. Verify typical phone and narrow widths, keyboard navigation, text enlargement, target sizes and overflow using available isolated tooling. Record actual viewport sizes and checks. Native accessibility and performance require their own device validation.

Deliver the requested files, a concise recommendation, exact reviewed commit and verification limits. When implementation is authorized later, reread the current repository instructions and inspect current data contracts before selecting tests and release checks.
