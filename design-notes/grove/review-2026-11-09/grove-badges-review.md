# Grove badges and quieter feature guidance

Current design direction, 9 November 2026. This supersedes the six invented sample badges in `kaisip-badges.html` and every earlier plant/Kin/Pocket Grove proposal in this review branch.

## Review this

Open `grove-badges.html`. Change Collection to inspect all 23 existing badge types, tap a badge for its requirement, and use its clearly labeled preview button to see an earned acknowledgment. Tap the information button to expand or collapse secondary guidance. Use You and Your five areas to inspect the same information pattern on progress. Light and dark preview modes are available.

This is a design prototype, not the production app. It shows one representative per badge type; individual domain marks and tier states are simplified, so preview counts are not real learner counts. The study values are sample data. No study session starts and no real badge is awarded.

## Appearance

Keep KaiSip's original emblem artwork, Fraunces/Figtree typography and Grove colors. Use a smooth warm-paper tile, a restrained inset edge, forest and sage emblem inks, and a small amount of depth. Remove specimen tape, ornamental ribbons and persistent animation. Earned badges have a filled paper tile; unearned badges use an outlined muted tile, with state always written below. Keep earned versus unearned distinguishable without color. Botanical marks remain brand artwork, independent of the retired plant companion.

The collection image and all 23 individual SVGs are in `grove-badge-art/`. They reuse the repository's existing vector geometry. There is no generated pet imagery, new image-generation dependency or runtime network request.

## Names and earning rules

`grove-badge-catalog.json` maps every stable ID to the current name, proposed short name, existing set and resolved base earning rule. The proposed names are unique and one or two words. Examples include Confidence Check, Beyond Review, Steady Days, Deep Roots and Measured Pace. Strong existing names such as Long Memory and Whole Map remain.

Preserve all badge IDs, earned keys, dates, counters, requirements, tier thresholds and set memberships. Rooted remains the existing set name; Steady Days is the proposed badge name inside it. Update display labels consistently in badge definitions, tier labels, accessibility labels, Results, share cards and Help when implementing. Do not award new badges merely because titles change. Plant-only rewards and presentation are retired separately; legacy plant fields should remain readable until a compatibility plan is implemented.

Source badge definitions and catalog were fetched from GitHub and verified unchanged at main commit `5382a2ee95fa82404e9b5ee6186d030773cbefe0`:

- `mobile/src/engine/milestones.ts`
- `mobile/src/engine/badgeCatalog.ts`
- Existing art comes from `mobile/src/content/badgeArt.json` and the `EmblemArt` rendering contract in `mobile/src/components/medallion.tsx`.

The engine's actual array contains 16 milestone types plus 7 drill-skill types. Its old 15-milestone comment is stale. This prototype uses the array, not that comment. It preserves the deliberate distinction between mastery badges, uncounted Moments, and separate drill skills.

## Information pattern across screens

Use a single information button beside a section heading when there is useful secondary feature guidance. On mobile, reuse the existing accessible IconButton and Sheet. The glyph can be small; its hit area is at least 48 points. Give it a meaningful spoken name, titled content, explicit dismissal, Back support and focus return. The inline prototype uses an accessible expanded/collapsed region to demonstrate the content hierarchy.

Move repeated feature introductions, metric calculation details, and optional how-to explanations into this surface. Remove redundant slogans and obsolete feature announcements entirely. Keep essential task instructions, selected settings, timer consequences, uncertainty and insufficient-data states, errors, deletion/consent consequences, and all course content visible. Never apply a bulk removal of subtitles or accessibility hints.

`badge-cleanup-screen-audit.md` covers all route groups and the shared components, including concrete text examples, plant dependencies, retirement redirects, widget handling and acceptance checks. It is an implementation handoff, not a claim that all production screens have changed. Its broader local read-only audit is pinned separately at `d92635662e9286f5328ce1c7301752ad9ad7dd0d`.

## Validation and remaining implementation

Node syntax and `node grove-badges-check.cjs` pass. The harness checks all 23 names and rules, unique short labels, help toggles, award preview without duplicates, completed next-milestone state, set selection, dark-mode selection, navigation and state restoration. The badge-art contact sheet was visually inspected. No browser layout, native accessibility, device performance, app bundle, or release tests were run. Final device acceptance must include narrow screens, 200% text, both themes, old backups and existing widgets.

Current artifacts do not edit production application code. No merge, deployment or app release was performed. The open GitHub PR remains a design-review draft.
