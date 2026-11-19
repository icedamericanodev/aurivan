# Mistake DNA ("Your mistake patterns")

**Learner-facing name (phone 2.2, expert review 19 Nov 2026): "Your mistake patterns".** "Mistake DNA" stays the code name only: `behavioral-scientist` advised that "DNA" reads as a fixed trait, against the feature's own "not a diagnosis" copy. The same review kept the card to the cue and one action (the "X of Y classified mistakes" count moved into the opt-in evidence), kept the caveats behind the "i", and pairs a "more frequent recently" trend with its fix ("What helps: …"). A screen test checks that no learner-visible text says "DNA".

Review scope: Mistake Journal only. Initially based independently on main `5382a2ee95fa82404e9b5ee6186d030773cbefe0`, then refreshed onto `5e3fad10c1777e3453dc9f9604ca46fcc46cf687` after the Concept Lab and shared UI updates merged. No Concept Lab dependency, Learn changes, new tab, stored field, dependency, entitlement change or release configuration change.

## What it adds

Slip Coach still provides the existing tag-based all-history pattern for other consumers. The journal now adds a recent evidence summary, provenance-labelled breakdown, honest classified/unclassified coverage, two-window comparison, related notes and a fresh-practice path. Its learner-facing copy describes observations and possible reflection points rather than diagnosing a thinking style.

One labelled “i” control beside “Your mistake patterns” opens the existing scrollable FeatureInfo sheet. Dates and a short practical coaching cue stay visible. Counts, evidence sources, coverage totals and the trend live in expanded evidence. The shared help consolidates sample rules, methodology, retained-miss handling and pattern definitions, with Close/Android Back/escape support and focus restoration. The journal-header help is consolidated here to avoid a second icon.

## Architecture and calculations

- `engine/mistakeDNA.ts` is pure TypeScript. The screen joins the selected certification’s saved mistakes to its existing question pack, then passes the certification and an explicit clock to the engine. All processing is local.
- A rolling **28 × 24 hour** window includes observations with `now - 28 days <= at <= now`. Missing/non-finite dates, future entries, missing ids and other certifications are excluded. Retired questions still resolve through the existing loader; unavailable question ids are skipped by the screen.
- One observation per certification/question id: newest miss wins; equal dates keep the first. The real saved journal is already keyed by question id. Repeated misses replace the previous miss and its date. Existing saved tags can persist across repeated misses; they are reflections, not fresh app diagnoses. A later correct answer marks the entry fixed without erasing the miss or changing its observation date.
- `patternsOf` remains the shared classification foundation. The six valid learner tags retain stable ids. A `misread` tag plus a priority-word stem also contributes to priority, labelled “Your tags and question wording.” Unknown or derived-pattern ids cannot masquerade as tags.
- Final-two evidence requires a wrong original-letter pick and **exactly two distinct authored token letters including the correct key**. The shared `runnerUp` helper now rejects malformed/ambiguous tips, preserving token handling and pick-aware feedback. Confidence evidence requires a valid wrong pick marked `sure`; missing, correct or invalid picks cannot create overconfidence evidence.
- DNA treats a conflicting saved pick equal to the current key as unclassified. A tag without a recorded pick remains a self-reported reflection. Old entries without tags/confidence/usable authored evidence remain unclassified; no inference fills the gap.
- The denominator is **distinct classified mistakes in that window**, never attempts, pattern occurrences, all questions or all incorrect answers. Each pattern’s numerator is the number of those mistakes showing it, counted once. Percentages round to the nearest integer. A question can contribute to multiple different patterns, so percentages need not sum to 100; the UI says this explicitly.
- A leading pattern requires at least **5 classified mistakes** and **3 examples of that pattern**. Counts rank descending; existing `PATTERN_ORDER` breaks ties. Ties are disclosed as “One of your most common patterns.” Details show at most five rows, even below the leading-pattern threshold, without claiming a recurring diagnosis.
- Trend compares the same leading pattern’s share in `[now - 14 days, now]` with `[now - 28 days, now - 14 days)`. Each needs 5 classified distinct questions. Changes **within 10 percentage points inclusive** are “similar”; larger changes are “less” or “more.” Integer cross-products avoid floating-point boundary differences. Both counts/denominators are visible. The copy explicitly warns that question mix and tagging coverage change shares and that this is not mastery or overall error-rate improvement.
- Existing `PATTERN_COPY` maps to the actual registry: final-two → Snare Spotter, priority → Signpost, confidence → Forecast, role → Role Check. Journal links still require both `canPlay` and `useAvailableGames`. Principle and note links use existing selected-certification loaders. Knowledge gaps get a related study note where one exists, including fixed mistakes.
- “Practice other questions” feeds the existing practice factory ids outside the entire saved mistake history, so immediate repeats cannot be mistaken for reassessment. When none exist, the learner can choose an existing Practice activity. Existing journal review controls remain available separately.

No readiness, spaced repetition, planner, Smart Mix, grading, backup, sync, authentication or access rules change. The compiled `assets/kaisip-cloud.js` is regenerated because its existing dependency graph includes the shared Slip Coach/tip helpers; it introduces no DNA data transmission.

## Verification

See `design-notes/mistake-dna/README.md` for screenshots, exact reproduction and final check results. Unit cases cover classification, mixed provenance, invalid/conflicting data, duplicate ids, minimum samples, explicit denominators, ranking/ties, date boundaries, exact trend boundaries and certification isolation. Screen tests cover light/dark themes with 320-point width and font scale 2, real registered drill navigation, fixed knowledge-gap remediation, independent-question practice and certification reset. Existing journal/tag-focus, readiness, SRS, backup and sync regressions remain part of the full suite.

## Limits and performance

The existing journal holds latest misses, not an immutable attempt stream. This feature cannot reconstruct first attempts, deleted/reset observations, historical tag changes or earlier misses overwritten by repeats. Trends describe the retained sample only. No new persistence is introduced; reset, user-controlled backup/deletion and sync keep their current formats.

Analysis is linear in saved mistake count with eight fixed categories and a map keyed by distinct question ids. FlatList and memoised mistake cards remain. There are no runtime dependencies, network calls, permissions or animation additions. Screenshots are review assets and are not bundled into the app. Native Android TalkBack/font scaling needs device acceptance; browser enlargement is supporting layout evidence only.
