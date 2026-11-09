---
name: kaisip-kin
description: Design original collectible organisms for KaiSip's in-app companion pages, with reference-matched Grove artwork, three connected forms, calm motion and reviewable collection prototypes. Use for KaiSip Kin concepts and companion implementation briefs.
---

Create original Kin for the existing KaiSip companion experience. This skill concerns the app's own collection and companion pages. ChatGPT Work pets use a separate product and tool lifecycle.

## Scope and evidence

Read the user's current brief, approved visual reference and relevant source at a recorded commit. Preserve KaiSip's established navigation, surrounding screens, Grove palette and Fraunces/Figtree typography unless the user requests broader changes. A request to simplify the plant area does not authorize a Home redesign.

Adapted from aurivan's `.claude/agents/mascot-character-designer.md`, `mobile-motion-designer.md` and `mobile-performance-engineer.md` at `f4a99e3001aec39cc82fd09f9fafdf6ad27edec7`. Their historical tree-only and five-to-seven-stage instructions yield to the user's three-form Kin direction. Check current `mobile/src/theme/tokens.ts`, `grove.ts`, `docs/mobile/DESIGN_SYSTEM.md` and the companion components before implementation.

For review requests, produce artifacts in the designated output folder. Respect ownership of active checkouts and emulators. Production edits require implementation scope from the user.

## Character system

Use the requested roster size. For a broad collection, include distinct body plans across animals, insects and other organisms such as fungi or plants. A dozen recolours of one silhouette does not create a varied roster.

Give every Kin a stable ID, short name, organism inspiration, silhouette, defining feature, three form names, palette roles, motion anchors and accessible descriptions. Treat fantastical hybrids as invented creatures. Verify biology when making factual species claims.

Keep each Kin recognizable across all three forms. Preserve its defining face, appendage or marking while developing its posture, shape and detail. Prefer continuity over replacing the character with an unrelated adult. Make the middle form visually substantive. Design original art and names, informed by the supplied reference's qualities without copying another product's character.

Let the approved reference determine the medium before optimizing size. Lumi was resolved as the user’s actual custom Dot pet and has dimensional plush texture, large glossy eyes, stitching and pose-specific animation. For this direction, use image generation for original character assets and coherent pose strips grounded in a canonical base. Inspect the actual referenced pet when accessible. A flat procedural SVG must not substitute for an approved plush reference. SVG remains appropriate only for a separately approved vector direction. Crop, align, encode and preview generated pixels deterministically without redrawing the character. Evaluate at thumbnail and hero sizes. State boundaries between final art, style trials and generated references.

## Interaction and rewards

Fit Companion, Collection and form-change detail into the existing companion navigation. Retain a clear return path. Collection cards show earned, selected and upcoming states with words or marks as well as colour. Selecting an earned Kin should visibly update the companion and survive reload in a prototype where persistence is promised.

Expose one next milestone in the companion page. Use short discovery or growth copy and place longer explanations behind a disclosure. Keep rewards optional. Preserve collected Kin through ordinary breaks. Avoid hunger, sickness, guilt, expiring discoveries and random paid rewards.

Identify real qualifying events before proposing production unlock rules. Make repeated completion idempotent. Specify old-plant migration, retained names, species entitlement, growth, earned cosmetics, reset and backup/restore behavior. Label prototype progression as simulated until reconciled with the existing engine.

## Motion

Interpret references such as “like Lumi” through observable qualities in the supplied material. If the reference's actual animation is unavailable, state the assumed qualities, such as breathing, blinking or a brief response to touch.

Use a subtle breathing or sway cycle for the visible selected hero, occasional organism-specific movement and a short earned reaction. Give winged, rooted, crawling and soft-bodied Kin different movement signatures. Collection thumbnails can remain still. Stop recurring motion when the screen is hidden or app is backgrounded.

Keep motion in transforms and opacity where practical. Use the app's installed rendering and animation stack where it can preserve the approved material. Baked plush frames can use a small compressed atlas and frame selection; whole-image transforms alone cannot reproduce eye blinks or articulated poses. Current source declares Reanimated 4.7.1 and react-native-svg 15.16.0. Confirm versions again for implementation. Keep taps responsive during animation and provide the same final state and information with Reduce Motion. A form change can crossfade between full drawings while stable features align.

## Verification and size

Check all requested Kin and all three forms, narrow and typical phone widths, text enlargement, selected/locked states, keyboard focus, reduced motion and persistence. Report what was tested in a browser separately from native validation. Measure release performance on representative hardware before claiming smoothness or battery impact.

Measure raw and compressed prototype code/art with the tool and compression settings named. Count separately bundled assets and embedded fonts. Prototype bytes do not establish the change in installed app size. For app impact, compare release artifacts built with matching platform, architecture, build profile and compression. Report store download, installed size and runtime memory separately when measured. Avoid unsupported megabyte or frame-rate guarantees.

Deliver usable artwork or a clickable prototype as requested, concise character/motion specifications, measured size evidence where available, source revision and remaining fidelity limits.
