# Grove Kin interactive review

This is the current review direction. It follows the owner's approval of Grove Kin in the existing KaiSip companion layout and supersedes the earlier broader Home redesign.

Open grove-kin-clickable.html in a browser. The file is self-contained and works offline. The inline conversation version uses the same artwork and interaction logic, with conversation state storage instead of browser local storage.

## Try it

- Open Try milestones → Complete a review. Meet a new kin, then choose it as your companion or keep the current one.
- Open Your collection and select an earned kin. Choose as companion updates the companion page and retains each kin's own growth.
- Choose an uncollected kin, then Choose next discovery. The next simulated completed review discovers that chosen kin.
- Open Try milestones → Finish a topic to advance three lesson units and see an evolution. Repeat to reach the third form. Complete one lesson demonstrates partial progress.
- Follow You or See simplified progress to review the replacement for the sparse five-area chart. Each area has a short row with an answer count or Not started. About these scores contains the 30-answer threshold and score bands.
- Rename, turn gentle motion off, or reset the demo from its controls. Device Reduce Motion takes priority.

## Collection

Twelve original vector kin, each with three form renders. Pip, Mossback, Luma, Russet, Rill, Coil, Bramble, Flit, Mori, Spore, Cora and Nori cover plants, woodland animals, insects, fungi and ocean-inspired organisms. The names and fantastical forms are concept work. The vector drawings simplify the earlier generated illustration to demonstrate a lightweight rendering approach.

The demo starts with Pip, Mossback and Luma. The chosen kin's progress is independent of the collection. Switching companions keeps earned forms. New discoveries remain collected. There are no care needs or missed-day losses in this proposal.

## Scope

The companion screen follows the current back-to-You header, paper illustration and soil line, left-aligned name, forest milestone panel and simple rows. Collection and evolution use the same Grove tokens, embedded Fraunces/Figtree fonts and rounded controls. The progress section is a focused redesign of the supplied screenshot, with static early-progress sample data.

The surrounding production app has not been integrated. Sample practice is an authored demonstration question, not reviewed exam content. Completing the sample immediately demonstrates a discovery. Topic completion grants three demo lesson units. Actual earning rules, old-plant migration, backup and cross-device merge require production specifications before implementation.

The proposed short evolution reveal lasts 1.1 seconds and keeps controls available. The selected illustration has two breathing and blinking cycles; winged kin have a brief wing settle. Collection thumbnails are static. Reduced Motion shows the final state. “Like Lumi” was interpreted as gentle presence and responsiveness, since no Lumi animation reference was supplied.

## Verification

The standalone JavaScript syntax checks and bundled Node VM harness pass. Run `node kin-prototype-check.cjs` beside the HTML. Checks cover 12 identities, 36 SVG renders, discovery, chosen next discovery, selection, independent growth, both evolution boundaries, growth cap, replayed-event deduplication, name escaping, saved-state sanitation, completion of the catalogue, five progress rows, invalid routes, dialog and reset. A separate inline harness verified initialization, navigation, host state saves, discovery, companion selection, evolution and progress navigation.

An independent source review found and verified fixes for long-name wrapping, rename field styling, dialog names, focus restoration, inconsistent evolution copy and lost status messages. The final notice fix consumes confirmations after their destination render.

The character atlas was rendered to PNG and visually inspected. Full browser rendering at 320, 375 and 390 px, actual keyboard/screen-reader behavior, and native performance remain unverified. The earlier local-file browser policy rejection was respected. Logic harnesses use a minimal DOM stub and do not establish browser layout or accessibility compliance.

Current read-only source HEAD was 579ee1ffa3292789173e2190394c5bd3e3c1c5ee. The plant page, PlantPage components and theme match the earlier f4a99e3 revision. No commands wrote to the active development checkout or accessed its emulator.

## Size and reuse

Artwork/catalogue source is 9,156 bytes, or 3,589 bytes gzip. The complete single-file prototype including embedded fonts is 119,401 bytes, or 76,740 bytes gzip. Native app install/download size is unmeasured. See kin-motion-and-size.md for the measurement distinctions and official references.

The packaged kaisip-kin/SKILL.md adapts the repository's mascot, motion and performance roles for creating original in-app kin. It is a reviewable skill package, not globally installed. ChatGPT Work pet tools target a different product, so this prototype uses KaiSip-specific vector art and motion.
