# Your plant: redesign decision (Phase 4b)

Board: `/tmp/claude-0/-home-user-aurivan/13ccedaa-f15e-5ff1-9d39-cfdeeaf5ce7f/scratchpad/grove/p4b/board-plant.png` (source `board-plant.html` beside it).
Design only. No app code was edited and nothing was committed.

## The pick

**Phone: B. Paper garden, merged with grafts from D3. Growth Line and A. Specimen.**
**Web: Web B. The line, with Web A's dialogs and Web A's short Turning order.**

| Direction | Design | Learning | Access | Motion | Average | Picked by |
|---|---|---|---|---|---|---|
| B. Paper garden | 8.5 | 8 | 7.5 | 7 | **7.75** | Design |
| A. Specimen | 7 | 7.5 | 8 | 8 | 7.63 | Access, Motion |
| D3. Growth Line | 7.5 | 8.5 | 7 | 7 | 7.50 | Learning |
| C. Window | 6 | 5.5 | 5.5 | 5 | 5.50 | |
| D2. Glasshouse Arch | 5 | 5 | 6 | 5 | 5.25 | |
| D1. Growth Dial | 4 | 3.5 | 5 | 4 | 4.13 | |
| Web A. The disc | 7 | 7 | 8 | 8 | 7.50 | Access, Motion |
| Web B. The line | 7.5 | 7.5 | 6.5 | 6 | 6.88 | Design, Learning |

The panels split two and two: the design and learning panels chose the stem (B, or D3 which is the same idea), and the accessibility and motion panels chose the disc (A). B has the highest average, and the merged B answers the disc camp's objections with A's own parts (see grafts 4 to 7), so B is the pick. A is a close runner-up (7.63).

**Why B.** Grove has three marks: the forest hero panel, the botanical line art and the growth rings. B is the only direction that makes the real line art the hero (the most premium image in the round). It spends the forest panel once, on "What grows it next", where the action is, and leaves rings to mean readiness only. A and C repeat the forest panel until it reads as wallpaper (Today hero, Your plant hero, Look header, Pick spotlight, You chip); D1 and D2 add a second ring or a trend frame. With D3's facts on each leaf, the stem shows a day-30 learner what earned each growth, which proves the plant cannot be gamed and teaches that spaced retrieval works.

**Why Web B, not the higher-scoring Web A.** The owner rule is web and phone consistent; Web A only matches a Specimen phone. Web B lost points on two fixable faults (it moved Weak spots drill, and it inlined Change plant and Rename, making the page about four screens). With Web A's dialogs and Weak spots drill left in place, it is under two screens and tells the phone's story.

**Claude Design: not needed for the plant.** All four panels agree. Every mockup is drawn from `assets/kaisip-plant.js` and the app's own fonts; a design canvas would bring back invented art. What remains is one merged mockup round and owner decisions, not exploration.

## Grafts the panels agreed

1. **D3:** every stem leaf carries the true fact that earned it (grew facts and FORM_FACTS, already saved). Keep B's order: Seed at the top, Elder at the bottom.
2. **D3:** keepsakes appear on the stem as small dated leaves with their badge skill line, word for word. Fold leaves older than the current form under a closed "Earlier growth" once the stem passes 8 leaves. Next and Now stay open.
3. **D3:** Look as one column of rows with radios (Style, Colour, Ground, Planter, Visitor, final form) and checkboxes (Keepsakes, at most three). Text wraps at 200%, no sideways scroll. "More to find" stays collapsed.
4. **A:** Pick as a 3-column grid of all 13 species at Crown, with the chosen species and its line in a spotlight drawn on B's soil line (not a forest card), and a sticky "Plant it / Not now" bar. Name it is within the first two screens.
5. **A:** The Turning frame layout with the fact on screen from 0 ms, and the waiting state ("See Kai's new form", "It plays when you tap.").
6. **A and C:** as the Turning's name lands, the matching stem leaf fills (one 300 ms fill at nameAt, never during the swaps). The Turning and the record are one gesture.
7. **B:** the specimen label ending (a 1px rule scales in from the plant side 2500 to 2740 ms, the form name fades in 2600 to 3000 ms). Use the same ending on the web.
8. **C:** states are always in words beside the art: "Plan cleared", "Resting", "Rest day" as static chips. Not C's window light or dawn wash.
9. **C and web B:** on the phone, a sticky 160pt soil-line preview at the top of Look and the Elder final-form choice, so every change previews in place.
10. **A:** the Look line "A look is just for you: it never changes your growth."
11. **D1/D2:** the compact six-growth strip on You and web You uses the real species art for reached growths and quiet dashed outlines for later ones, never future forms (replaces the web's generic glyphs).
12. **Web A:** keep today's dialogs for Plant yours, Change plant and Rename; only Look sits inline under the sticky plant bed. Coins differ by shape, the current one has aria-current="step".

## Fixes the panels agreed

1. **Banned copy:** "Pick up whenever you're ready." becomes "Pick up whenever you like." (A, B and C states boards; engine restLine, app/plant.tsx, index.html).
2. **Botanical caption:** "A fine line drawing." on phone and web (not "like a field guide", not "like a botanist's sketch"). Ships with the bundle rebuild.
3. **howToOpen:** "...set in the Herbarium." becomes "...set in Badges."
4. **One word:** "growth", never "stage", in learner text. Today and the chip read "Bough · growth 4 of 6". No count on a line that shows a form name: web You reads "Your oak · Bough".
5. **Dates show when, never how long:** "Now, since 3 Nov" becomes "Now · reached 3 Nov". Dates only on reached leaves. No gaps, ranges or "days since".
6. **Hero steps with growth:** about 180pt at Seed and Sprout, 240pt at Shoot, 300pt from Bough.
7. **Contrast:** the reached stem uses the accent (5.4:1 light, 8.9:1 dark), not soil brown (fails 3:1). Later stem is dashed leaf-line. Leaves differ by shape: filled, ringed, outlined.
8. **Gold on paper:** silGold #C99A3A is 2.3:1 on #F3F1EA. Treat the silhouette as decorative and let the fact and name carry the moment; record that choice in the motion spec.
9. **Today:** one plant only, in the ring disc. Delete B's thumbnail on the Today row (keep the leaf glyph, line and chevron). Do not add A's sap ring round the disc; the readiness ticks stay the only ring.
10. **Sequencing:** when a growth brings a new form, the Turning owns the visit; any stem beat plays inside it at nameAt. One celebration per visit. Reduce Motion and screen readers get the end state and one announcement ("Kai has a new form: the Standard Oak.").
11. **Turning rate:** state it as "at most 2 flash pairs a second" or stretch half-swaps to 334 ms or more; keep the 60% cross-fade.
12. **Exam eve and exam day:** eve shows "Rest day. Sleep and time off help memory settle." Exam day shows only its line. Hide What grows it next on both days.
13. **Web B:** Weak spots drill stays in Review and saved (it may also be linked from the Drills trail). Change plant and Rename go back to dialogs.
14. **Web Turning:** keep 560 ms (under the web 600 ms cap) in the phone's order: fact, gather wash, cross-fade, settle, name with the label rule, leaf fills.
15. **One demo dataset:** Bough reached 3 Nov everywhere; IS Audit one value. Restore the third You stat row (Streak, or This week) in every You mock, same ink and size as the others.
16. **Wire plantIn** (820 ms) to the first "Plant it".

## Still to draw in the merged round (blocking before build)

- Exam eve; the quiet "Your plant grew" line; daily signals first flower, part marks and undergrowth.
- First set closing screen "Kai is planted…" with "Choose a different plant" (the plantIn host).
- Picker modes as their own screens: Change plant ("Same growth, new look."), Rename, Another idea, and the Today-origin Not now that hides Today's row.
- Settings "Badges and your plant" group (Show my plant, Change its look, Quiet look).
- Android home-screen widget: the plant, always awake, no face, static.
- Elder leaf drift and "Storybook with a face" on the soil line.
- Your plant, Look and Pick at 200% text and 320 width.
- Web: the "Plant a companion" invite on Today (Plant yours, No thanks), the study-rail plant and the Glossary plant figure.
- A playable HTML prototype of the Turning on paper and the leaf fill at real timings, so Sky can feel 3000 ms on a phone.

## What each direction keeps from today's inventory

| Direction | Keeps | Drops or changes (needs fixing or Sky) |
|---|---|---|
| B. Paper garden | Everything: hero with name, form, look line, visitor line, keepsakes and wren; What grows it next with both footnotes; domains; look rows; all looks, moods, forms, Turning, waiting state; most states. | Stem replaces the six-tile strip on Your plant (strip stays on You and web You). Missing exam eve and the quiet grew line. |
| A. Specimen | Everything, including exam eve and the waiting state; adds "Its forms so far" (saved dates). | Forest panel on five screens; adds a sap ring on Today (rejected). |
| D3. Growth Line | All data and both footnotes; adds facts on each growth. | Hero drops the look line, visitor line, keepsakes and wren; step bars become %; Today line adds dates (copy for Sky). |
| C. Window | Keepsakes, looks, final form, states. | Drops the "Know the outline" explainer; adds window light as new meaning (rejected). |
| D2. Glasshouse Arch | All features. | Hero drops the look line and visitor line; Today mock drops Accuracy and Exam date tiles. |
| D1. Growth Dial | All features, third You stat row. | Hero drops the look line, visitor line, keepsakes and wren; second ring on Today (rejected). |
| Web B. The line | Steps, look, plant pick, name, What grows it next. | Moved Weak spots drill (reverted); inlined dialogs (reverted). |
| Web A. The disc | Today's dialogs, coins, 560 ms Turning. | "stage 4 of 6" under the form name (fixed by the growth word rule). |

No direction removes a feature or piece of content once the fixes above are applied.

## For Sky

**The question (recommendation first):** We recommend Paper garden, the plant drawn on the page with a stem that shows what earned each growth, on phone and web. Go with it, or keep Specimen (the plant in a forest disc, like Today)?

Smaller items to confirm in the same reply (experts' recommendation given; a "yes" accepts all):
1. Web gets forms, form names and a short (560 ms) Turning, so web matches the phone. Recommended: yes.
2. The stem shows the saved dates each growth was reached ("reached 3 Nov"), never durations. Recommended: yes.
3. Ribbon keepsake wording drops "passed": "Opens when you tell us your exam result." Recommended: yes.
