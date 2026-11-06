# Badges: redesign decision (Phase 4b)

Board: `/tmp/claude-0/-home-user-aurivan/13ccedaa-f15e-5ff1-9d39-cfdeeaf5ce7f/scratchpad/grove/p4b/board-badges.png` (source `board-badges.html` beside it; generator `board-tools/make-badges.js`).
Design only. No app code was edited and nothing was committed.

## The pick

**Phone: the pressed paper tile.** It merges "Pressed and kept" (premium-mobile-designer A) with "Leaf Press" (learning-game-designer A), with two grafts from Keepsake Trail.
**Website: Web A, "The disc"**, used as it is.

| Rank | Direction | Designer | Panel score |
|---|---|---|---|
| 1 | The pressed paper tile (merged) | premium A + learning-game A | Panel pick |
| 2 | Keepsake Trail | learning-game C | 6.9 (runner-up) |
| 3 | Tied to the branch | premium C | 6.25 |
| 4 | The cabinet | premium B | 5.4 |
| 5 | Heartwood Drawer | learning-game B | 4.5 |

**In plain English.** Each badge is a small cream paper tile with its real emblem pressed on in botanical inks and taped down, like a flower you pressed and kept yourself. A badge you have not earned yet is a pencilled dashed outline, and the solid part of the line shows how close you are.

**Why this one.** Both designers drew the same idea, and it is the closest to today's badge screens (the last premium round already moved them to pressed specimens). So it lands as polish, not a new look, and it costs the least to build: a restyle of today's parts and a new press animation, no new art. The paper is a fixed object, the same cream in light and dark, like the plant.

**Not taken forward.** The cabinet and Heartwood Drawer bring back struck medals, which an earlier ruling replaced with pressed specimens, and they read as a medal game. Tied to the branch is warm, but its tag swings next to words, the page runs about 15% longer, and thread replaces the tape on You. Keepsake Trail is the runner-up. Its trail of dates and its ledger rows are not used, but two of its plant moments are grafted (below).

## The four changes to the pick

1. **The press replaces the medallion strike on unlock.** Words are there from the first frame. Only the badge moves, inside its own column: a sheet of glassine lays over the dashed mount, the tile presses flat (scale 1.06 to 1), the glassine lifts, then two strips of tape land. Done by about 1080 ms. One success haptic when it presses. Opacity and scale only, no confetti, no sound. Any tap or scroll jumps to the last frame. Reduce Motion: the taped tile at once, the block fades in over 120 ms, and the words never move. The existing limits on moments stay: one full moment a session, then the quiet line.
2. **The roman "Sheet I" numbers go.** "Sheet" becomes "set" everywhere a learner reads it ("Groundwork · 2 of 3 pressed", not "Sheet I · Groundwork"). The italic line becomes "Every set counts on its own." The "Badge sheet" name for the detail view is internal only.
3. **Each set ends with its planter line.** The last row of a set shows its planter drawn small, in the plant's own style, with one line: "Completing Groundwork adds the [planter] to your plant's looks." (from Leaf Press). Once the set is complete, the line says that the planter is in Look. No line on Moments or Field notes, which have no planter.
4. **The after-exam album opens with the learner's plant.** After the exam date the case becomes a keepsake album. It opens on the learner's own plant, as it is now, wearing the keepsakes the learner chose to show. The sets follow, with no Next panel, no progress and no Closest sort (as today).

## Grafts from Keepsake Trail

- **The earned-sheet vignette.** On an earned badge's sheet, the pressed tile sits beside the learner's plant wearing that badge's keepsake, with one line ("On your plant: the jay."). It appears only when the badge gives a keepsake and the learner shows it. Never on Today, which shows no keepsakes.
- **The plant in the after-exam album.** This is change 4 above, drawn from Keepsake Trail's album opening. It uses the real plant art (`kaisip-plant.js`), not a new drawing.

## Fixes before the next mockup round

- US English: "Practice the ones you missed", not "Practise" (the learning-game unlock mockups use the British spelling).
- One date word: "Pressed 4 Nov" on tiles and sheets. Quiet back-fills keep "By 11 Oct".
- Cream tiles on the dark theme are bright. Keep them at 84pt or smaller on the case and no more than four in a row.
- Tape is decoration only: the earned state is also said in words ("Earned 2 Nov") and in the spoken label.
- Dashed mounts and progress lines meet 3:1 against the card in both themes (the `control` and `accent` tokens).
- Never a total count across sets, and never a count of the question bank.

## What stays from today's badge screens

Everything a learner uses today stays. Only the look of the badge and the unlock motion change.

- **The case** (You → Badges): running head, title, italic line, "Earned by what you've mastered. Once earned, a badge stays." The route keeps its old name, so links from Results still work.
- **Shelves**: one per set, in journey order, each with its own "2 of 3" and no grand total. Then Moments (not counted) and Field notes (counted on their own). All / Earned / Not yet, and Sort (by set, recently earned, closest, effort), kept on the phone.
- **The sheet** (the detail view for one badge): name, tier, the earned date, the exact rule, how close you are, and "Study for this". Only the roman number goes (change 2).
- **Ladders and tiers**: Clay, Lichen and Gold leaf, shown as three tiles with the reached ones pressed.
- **Stretch rows**: "Stretch · beyond exam need" stays its own row under each ladder.
- **Domain emblems**: the five domain badges keep their emblems, domain colour dot and "% of the exam" line.
- **Took Root**: kept as it is, now pressed like every other badge.
- **New in**: the "New in your badges" panel and line, once.
- **The catalogue line**: the one-time line telling a learner the new tiers and Took Root their study already earned.
- **The after-exam album**: kept, now opening with the plant (change 4).
- **The unlock moment** on Results: same words, same place, same limits; the press replaces the strike (change 1).
- **The share card**: "Share this badge", only what is on the card is shared, the KaiSip mark, and the line "Not affiliated with or endorsed by ISACA®". The pressed tile replaces the medallion on the card.
- **Show badges** (Settings): turning it off still hides badges everywhere, and You keeps a Field notes row instead.
- **The You badge row**: the three newest pressed tiles, the last-pressed line, the "new" dot (shape and spoken), and the count earned (never "of N"), with one button to the case.

## Website

Web A, "The disc", as drawn: the Badges section on Your progress shows the tile shapes waiting, "Nothing here yet", and says badges are collected in the KaiSip phone app for now, with "Get the KaiSip app". It never shows a count. The tile shape and words match the phone pick.

## Claude Design

**Not needed.** Every mockup in this round is drawn from the app's own badge art (`badgeArt.json`), plant art (`kaisip-plant.js`) and fonts (Fraunces and Figtree). A design canvas would bring back invented art. What remains is one merged mockup round of the pick with the four changes and the fixes above, then an engineering spec.
