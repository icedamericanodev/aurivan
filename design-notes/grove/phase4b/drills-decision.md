# Drills redesign: decision

Board: /tmp/claude-0/-home-user-aurivan/13ccedaa-f15e-5ff1-9d39-cfdeeaf5ce7f/scratchpad/grove/p4b/board-drills.png (source page board-drills.html beside it; generator in board-tools/make.js).
Design only. No app code was edited and nothing was committed.

## The pick

**Twig (learning-game-designer A), merged with Quiet Round (mobile-ui-designer A).**

| Direction | Look and kit | Learning | Accessibility | Motion | Average |
|---|---|---|---|---|---|
| Twig (LGD A) | 7 | 8 | 8 | 8 | **7.75** |
| Quiet Round (MUI A) | 7.5 | 7 | 7 | 7 | 7.13 |
| Growth rings (LGD C) | 5.5 | 7.5 | 6 | 7 | 6.5 |
| Forest board (LGD B) | 5 | 5.5 | 6 | 5 | 5.38 |
| Trail (MUI B) | 4.5 | 5 | 5 | 5 | 4.88 |
| Clearing (MUI C) | 3 | 5.5 | 3 | 4 | 3.88 |

Why Twig: three of four panels picked it, and the fourth picked a Twig plus Quiet Round merge. It covers the most of today's screens (its rarer-states board alone carries step back, Field notes, the Today plan item, the "as Drills" hint and every end note). It reuses shipped Grove parts (Today's twig, step squares, the Phase 4 answer card, the stage strip), its motion is one signature at a time using only opacity and transform, and every flaw the panels found is a fixable detail, not a structural one. Effort M, no engine change.

Second: Quiet Round. It has the strongest premium read: a drill answer is the approved decision 16 answer screen, and the recap gives the score the one forest panel. It drew too few of today's states to win on its own, so its answer screen and recap are grafted onto Twig.

Not taken forward: Clearing breaks the locked rule "never a plant on game or Results screens" and turns badges into a plant-item chase. Trail's feedback sheet hides the options you need to compare. Forest board spends the hero on every item and breaks at large text. Growth rings reuses the readiness rings for drill levels, which a learner would read as exam readiness; its learning ideas are grafted instead.

## The merged direction (what gets built)

### Round screen
1. Header: close (48pt), the twig with one leaf per item, and the score with a visible "Score" caption (label "Score 2").
2. Twig leaf states, fixed for contrast (WCAG 1.4.11): right = filled accent leaf; missed = solid outline in the `control` token with the midrib and a small cross notch, never red; still to come = dashed `control` outline. The branch stays soil (decorative). The twig is one accessible element: "Question 2 of 5. 1 right, 0 to review."
3. Fallback to numbered tick and cross squares (from Forest board) at text scale 1.3 and up, and for rounds of more than 8 items (Root or Rumor, Canopy Call).
4. Game line: glyph, name, and the skill caption from Growth rings ("Snare Spotter · Beating distractors · 2 of 5"). The ring header is not used.
5. Step squares with the engine copy restored word for word: "Tap the snare", "Tap the BEST answer". The done step uses the kit's ink done state, never accent green before the reveal, and carries its result ("You marked D").
6. Seedling only, first two rounds of each two-step game: one hint line ("A snare is a wrong option built to look right."), then it fades for good.
7. Call It First: options drawn as folded bars under the principle cards ("The options open once you name the principle."). The bars are not pressable and are hidden from TalkBack as one labelled group. Heartwood "Options hidden" stays.
8. Daylight: "Flag & move on" and "Pause" move into the sticky footer row, each 48pt, stacked at text scale 1.3 and up. "Add a minute" is drawn with the same treatment.

### Feedback (one grammar with the main answer screen, decision 16)
1. The stem folds to two lines with "Show question" (48pt). Swap by cross-fade, no height animation.
2. Verdict leaf, verdict headline in ink (never red serif), italic coach line.
3. The two-half reading, one line at the top of the answer card, in Snare Spotter, Signpost and Call It First only (never Forecast, Daylight or one-step games). It names only what was earned, never "No point": "Snare spotted, 1 point. Best answer picked, 1 point." / "Snare spotted, 1 point. The best answer was A." / "The snare was D. The best answer was A."
4. One untinted answer card (Your answer, Best answer, Snare with why it tempts), the other options as a compact tagged list, Final two, then the collapsed "Why A, and the key idea", then the Exam cue under the 3px coach rule. Focus moves to the verdict heading; it is announced once.

### Round recap
1. One forest panel: glyph, "Round complete · Snare Spotter", the 52 score rolling from blank (300 ms, never a visible 0), "out of 10 · best 8", "This round: 4 of 5 snares spotted", and one row of tick and cross squares. "New personal best" is static text.
2. On a level change, an inset band inside the forest panel: the level drawn with the same three-marker control as the intro's "Pick your level" (reached = hairline `line`, current = forest fill with sap leaf, not reached = dashed `ink3`, lighter than reached), then "You've grown to Sapling. Your next round starts there." and "What changes: decoys from nearby ideas." (from each game's existing level line). No "Next, Heartwood: 0 of 2" countdown on that round. A step back uses its existing line and never animates; the lost level is drawn as a plain unfilled marker, not a locked tile.
3. When the round had misses: "What caught you" comes next, then "Missed questions are in your review."
4. Then "Last 5 rounds" with the real glyphs.tsx Sparkline (same sparkPoints maths, straight segments, newest point as the filled leaf), and on rounds with no level change the level line "Seedling · 1 of 2 strong rounds toward Sapling" with two dots.
5. The game's own end note, then Play again and Done in a sticky footer (first viewport), and one "Report a problem".
6. One celebration per round end, as gameRounds.ts already does: on a level-up the badge InviteRow is dropped and the badge waits (You dot, then a quiet InviteRow on the next round end with no level change).

### Drills card and web
1. The Drills card is kit 03 exactly (Twig's version): italic numerals, dotted leaders, the level leaf in the kicker once grown, "best N · N min", the 3-then-unlock line word for word, no count, no lock. No glyph badges on rows and no skill-record numbers on rows.
2. Web 1280: Twig's shell (Kasama K with the lowercase wordmark, sidebar icons, Learn sub-items, the exam-days foot). The feedback sits beside the question with the same order as the phone, plus Quiet Round's "This round" side panel listing each item's result. Keyboard hints match the web question screen, written once. Targets 44px.

### Motion (all opacity and transform, written as motion tokens)
- Right answer, about 600 ms: tap press 0.98 (120 ms); options fade out over 0 to 120 ms while the verdict leaf springs from 0.6 at 120 ms; the answer card fades in from 200 ms, rows 30 ms apart (no empty frame longer than about 80 ms); the twig leaf fills as a stacked layer (opacity 0 to 1, scale 0.85 to 1, 160 ms, no overshoot); gains roll the score over 300 ms, drops set instantly. One success haptic. A miss animates nothing.
- Level-up, under 1.2 s: recap fades in, score rolls, then only the level marker changes: cross-fade of two pre-rendered states plus the TierLeafMorph spring (growAt = celebrate minus LEAF_SETTLE_MS), one light haptic, one spoken line ("Score 8 out of 10. You've grown to Sapling. Your next round starts there."). A tap anywhere skips to the end.
- Reduce Motion: the end state (120 ms cross-fade at most), same words, same haptics. Daylight's pace bar steps once a second with no tween and announces only at start, Pause and when the light sets.

## Fixes still to draw before handoff to engineering
1. Strip 21 redrawn so the level marker is in every frame; strip 20 redrawn without the empty frame.
2. 200% text renders of the round, Leaf Pairs or Term Match (one column at scale 1.3 and up), Forecast (segments stack at 1.5), recap and the level markers; the option letter badge scales with text (30pt times text scale, capped at 1.6).
3. States not drawn by any direction yet: Daylight "Pick your light" intro with "Suggested: ... from your recent answer times."; "Add a minute"; the Daylight end heading restored to "This is where time went"; Signpost step 2 with the word marked and its coaching line; the Root or Rumor reveal with "Read the note"; Forecast's "How scoring works" panel open; Field Guide's Heartwood recall and "First-try matches"; Stepping Stones "Perfect path", the Heartwood missing step, step notes and "Open the lesson"; the "The other drills open after 50 practice questions." variant; a recap with a badge and no level change; a note for the /play redirect (no UI).
4. Copy drift to undo in the grafts: "enough content" goes back to "enough practice questions"; "Pick the best" goes back to "Tap the BEST answer".

## What each direction keeps from today's inventory
- **Twig:** everything, word for word, except the gaps in "Fixes still to draw". Only visible rename: Field Guide shown as "Leaf Pairs".
- **Quiet Round:** the Drills card and unlock line, intros with levels, Snare Spotter, Signpost and Call It First steps, the hint counting half, Options hidden, Daylight paused and Add a minute, How scoring works, What caught you, the review line, level lines, the badge moment, step back, Report a problem, "This game is on the way". Not drawn: most newer-game reveals and end notes, Field notes, the "as Drills" hint, the Today plan item, "Drills arrive once...", "That's the best answer, not the snare". Renames Field Guide "Term Match".
- **Growth rings:** the same coverage as Twig, plus new lines ("N of last 10", "1 of 2 strong rounds in a row", per-item points). Only the plain level-progress line and the two-half reading are kept.
- **Forest board:** the same coverage as Twig; it showed a level-up and a badge on one recap, against the one-celebration rule.
- **Trail:** the same gaps as Quiet Round; adds a one-line entry for every right item in the recap (not kept).
- **Clearing:** the same gaps as Quiet Round, no no-plant variant, and the plant on a Results screen (not allowed).

## Smaller wording calls (panel lean; Sky can override)
- "Field notes" (the badge set and the You levels page) is not banned but sits one word from "Field guide". Lean: keep for now; if Sky wants distance, "Drill levels" for the page.
- The two-half line and "1 of 2 strong rounds toward Sapling" are new lines that read existing data only; the behavioural scientist should confirm the tone before build.

## Claude Design
Not needed. The mockups were drawn from the app's own code, tokens, glyphs and badge art, and what is left to decide is a name and a few lines of copy, not visual exploration. If Sky later wants to feel the timing, a timed HTML prototype from the existing lib/ generator (real duration and spring tokens, with a Reduce Motion toggle) is cheaper and more faithful than a canvas; TalkBack, Dynamic Type and Reduce Motion are checked on a device build.

## Question for Sky
We recommend building Twig with Quiet Round's answer screen, and renaming the game Field Guide to "Term Match" (saved progress unchanged). Go ahead?
