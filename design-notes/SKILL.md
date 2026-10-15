---
name: kaisip-design
description: Use this skill to generate well-branded interfaces and assets for KaiSip, a CISA (Certified Information Systems Auditor) exam prep platform. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping across web app, mobile app, and marketing site surfaces.
user-invocable: true
---

Read `docs/mobile/DESIGN_SYSTEM.md` first, then explore `design-notes/brand-kaisip/` for the logo masters.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

**Brand name:** KaiSip (renamed from Aurivan, 15 Oct 2026)
**Tagline:** Master Modern Risk.

**Design system:** Grove. The source of truth is `docs/mobile/DESIGN_SYSTEM.md` and the tokens in `mobile/src/theme/tokens.ts` (mirrored as CSS variables in `index.html`). Read those for colours, type and components; this file keeps no palette of its own, so it cannot drift.

**Fonts:** Fraunces (the moments you read) and Figtree (everything you tap or scan). Self-hosted from `assets/fonts` on the web, no third-party font request.

**Icons:** stroke icons, 1.75px, 18-24px. Brand masters are in `design-notes/brand-kaisip/` (the web icons in `assets/` are copies of `design-notes/brand-kaisip/web/`).

**Tone:** Direct, expert, confidence-building. Second person ("you"). No filler. No emoji in UI.

The old purple/navy handoff and token file are retired. The navy-era handoff is kept for history in `archive/MASTER_HANDOFF.md`.
