# You and Settings polish (Phase 3, web): fixes and expert decisions

Source: the review of commit ec4a41c (rules, UX and accessibility, first-time learner) and an expert panel (product manager, behavioral scientist, UX reviewer, first-time candidate) on 31 Oct 2026. Q1 to Q5 were unanimous. The phone follows the same decisions.

## Fix list (all required)

1. At 390 the area chart's "N answered" labels run together. Make them wrap or stack legibly at 320 to 768 and at 200% text.
2. The chart's own "70 line" label overlaps a stem: on You use `fgStemChart(areas, { label: 'Each area', lineInKey: true })` (the key explains the line).
3. Remove the unlabeled dash that floats at about 20 on low-data areas, or label it if it carries meaning.
4. The Settings row near the bottom of You uses `youGoSettings(event)` so focus lands on the Settings h1 like the cog. The Back link from Settings to You moves focus to the You h1 (tabindex -1).
5. Forced colors: a visible switch (`.set-card .you-switch` border 1.5px solid CanvasText, thumb CanvasText, on state Highlight); `.you-go`, `.you-chip` and the You cards get a 1px CanvasText border.
6. Restore brings back the exam date when this browser has none (the same add-only rule as the name). The "Restore this file?" sheet says what the file holds ("This file: N answers, saved D Mon") and offers "Back up first". After the restore reload, a toast "Restored: N answers".
7. Back up gives feedback: a toast "Backup saved", a dated file name `kaisip-web-progress-YYYY-MM-DD.json`, and "Last backup: D Mon" under the Back up row, read from the existing `aurivan_backup_saved_at` key (never renamed).
8. Toasts never cover buttons in sheets or dialogs: hide or lift the toast while one is open.
9. Loading `index.html#you` directly opens at the top, not 56px down.
10. The readiness range reads "64 to 74" everywhere (Today, You, Your progress, the scale bar), with no en dash.
11. Tokens: replace hard-coded hex in `.you-ready` (`--hero-tick-rng`, `--leaf-line` overrides) and the switch thumb `#FFFFFF` with root tokens; the dark off thumb uses ink2 (DESIGN_SYSTEM.md). SVG plant art may keep its hex.
12. The chip kicker "YOUR PLANT" goes from 0.625rem to 0.6875rem.
13. "Kept in this browser only" appears once on Settings, in the page subtitle.
14. Dead code: prune `railAlign`'s `#screen-you .you-group` query, the unreachable `plantYouHtml` non-rail branch, and CSS that no longer matches anything on You (`.you-stats .stat-num.stat-word`, `.you-group`, `.you-head`, `#youSettingsH` scroll-margin), after checking with grep. The `youRingGrown` comment says once per page load.
15. Rename the ring wrapper state class `td-wait` to `td-ring-wait` (You and Today).
16. DECISIONS.md 12 records the departures already made (1240px column break, Back nav label, tab bar bottom 16px, `--focus-ring` instead of `--focus`); the grove-check comment says `--focus-ring`.

## Expert decisions

**Q1 Readiness words (unanimous).** Keep "study bar" and "low end"; define the low end once.
- Ring key (only once a range exists): "**Gold ticks:** your range, 67 to 79." and "**Clay mark:** 80, this app's study bar."
- One sentence under the key: "Your low end, 67, is the cautious end of your range: we're fairly sure you're at or above it. The study bar asks for a low end of 80, a goal to study toward, not an exam score. Yours is 13 under it." (at or above 80: "... Yours is at or above it.") Numbers come from the range and the study bar.
- Area key, first item: "**Dashed line:** 70, the target for each area." (the parenthesis about the study bar is removed).
- The ring's spoken label stays. Phone: the same low-end sentence under its scale bar, before its study-bar line.

**Q2 "Seed" means the plant only (unanimous).** The low-data area state says "too few yet".
- Area list row, 1 to 29 answers: value "22 of 30", note "answers, too few yet for a score" (with focus: "answers, too few yet for a score, where you'll gain most").
- Spoken: "IT Governance, 22 of 30 answers, too few yet for a score."
- Chart key: "**No stem yet:** fewer than 30 answers, too few yet for a score. The stem and score show at 30."
- The plant stays "Seed · stage 1 of 6". Phone: its chart says "too few yet" (replace the "seed" label added in 26b037f).

**Q3 Area names (unanimous).** Use the DI short names everywhere ("IS Audit", "IT Governance", "IS Acquisition", "IS Operations", "Info Protection"); the button reads "Practice Info Protection".

**Q4 Plant chip and plant card (unanimous).** The chip shows on phones and below 1240px (owner decision 2 holds). From 1240px, where the plant card is in the first view, the chip is hidden only when the learner has a plant (`you-chip-dup`, `@media (min-width:1240px){.you-chip.you-chip-dup{display:none}}`); "Pick your plant" stays at every width. Record beside owner decision 2: "The plant stays on You's first view at every width: as the chip on phones and narrower screens, and as the plant card itself from 1240px." Follow-up, optional: a quieter chip style so it is not a second solid button.

**Q5 Scale numbers (unanimous).** On You only, once a range exists, add the straight scale bar (`fgScaleBar(range, { number: false })`: 0, 50, 80 in clay, 100, with the range bracket) under the ring and before the key. Drop the card's own "A study estimate, not a prediction." caption when the bar shows (the bar prints it). The bar is aria-hidden; the sr sentence carries the facts. Before 40 answers no bar. The bar's range label reads "67 to 79" (fixes Your progress too; same on the phone ScaleBar). Today: no change.

**Q6 Today and You agree on what to study next (two of three panels, 4 Nov 2026).** Re-decided after the first panel's answer was lost in a container restart.

- **Cause.** Two rules picked the next area. You's "Focus next" and its Practice button, Today's "Where you'll gain most" and the Practice hub read `r.focusId` (the area with the largest (1 - mastery) x weight gap; the first area when nothing is answered). Today's plan used `todayPlanDomain`, which took the first area with no answers in outline order (often IS Audit), and only then the gap sort, skipping the last set's area. So the plan named one area while the hero and You named another. The phone already plans on the readiness focus (`mobile/src/lib/useJourney.ts`, `planner.ts` focusPractice). On top of that, the plan's reason is saved once a day but its count is live, so the card could read "10 questions · not started · 3 of 10 answered".
- **Decision.** The plan's set is always `r.focusId`; the skip-the-last-set rule goes. One area name on Today's hero, Today's plan card, You's Focus next and its button, the Practice hub, Read next and the first five's "Tomorrow" line, the same as the phone. The 'new' label becomes "your first set here" (on screen "10 questions · your first set here", mid-set "... · 3 of 10 answered"), which describes the set, not the area, so it stays true next to the live count all day. Plans already saved with 'new' pick up the new words at once (no migration); a plan saved earlier today keeps its area until midnight.
- **Rejected.** Making You follow the saved plan (Today's hero would still disagree with Today's plan, and You would call an area "where you'll gain most" when it is not). Relabelling only (honest, but two "next" areas remain). The other majority version (keep the skip, add a third reason and a sanitizer change): more change, and the surfaces still split whenever the focus area was the set just finished.
- **Given up.** Variety from not repeating yesterday's area. The review queue already mixes areas, and an area's gap shrinks as its mastery grows, so the focus moves on by itself. Untouched areas still come up (no answers counts the full exam weight as gap), now heaviest first instead of in outline order.
- **Unchanged.** Readiness maths, `r.focusId`, You's summary, the hero, the Practice hub, the plan's minutes, the shape of `S.todayPlanV1`, its sanitizer, export and import, the `aurivan_last_session` key (Resume still uses it) and the mobile app.
- **Release.** The panel asked for a PATCH (v12.49.1) with a What's New line under Fixed: "Today's plan and the You page now point you to the same area to study next." This round's brief batches the bump and What's New for the end of the uplift (DECISIONS 8), so the line waits in `RELEASE_PENDING.md`.
- **Follow-up, not now.** The saved plan is frozen for the day while `r.focusId` is recomputed on every render, so in a rare case the two can drift apart during the day. If that is ever seen, You's Focus next could follow `S.todayPlanV1.d` while the plan's set is unfinished.

## Built (4 Nov 2026)

Every fix list item and Q1 to Q6 is in `index.html` on `feature/grove-ui`; DECISIONS 13 and 14 record them. Notes on how:

- Item 1: the phone drawing wraps a label wider than its column at a space ("12" over "answered"); at 130% text and up, or a column under 300px, the visible list replaces the chart as before.
- Item 2: `lineInKey` now drops the "70 line" label in both drawings (You and a mock's areas; both keys name the line at every width).
- Item 3: the floating dash is gone; the dotted sprout over a seed with answers stays (the words under it say "too few yet").
- Item 7: the file carries a new `savedAt` field beside the old ones, which the restore sheet reads ("saved 4 Nov"; a file without it uses the record's last use).
- Item 9: an address opened in a page already loaded (typed, pasted or followed) opens at the top, and a load or reload no longer puts back an old scroll position.
- Item 10: Today, You, Your progress, the scale bar and the set results line ("Readiness is 68 to 78%: a study estimate, not a prediction.") read "64 to 74".
- Q3: You already used the DI short names; Today's "Where you'll gain most" line now does too (it showed the full domain name).


## Round 1 after the strict review (4 Nov 2026)

Every blocking finding is fixed in `index.html`; DECISIONS 13 and 14 record the rule changes. In short:

- Item 8 again: a toast moves to the top edge while a sheet is open (hiding it made "That file isn't a KaiSip progress file" and "Nothing to export yet." silent), and no toast takes a tap anywhere (the "Backup saved" toast sat over Start fresh).
- Item 5 again: the dark off thumb is CanvasText in forced colours (the dark theme rule out-ranked it). Today's Start and every filled Grove button keep a ButtonText edge, and Today's cards a CanvasText edge.
- Q2 for every area chart (Your progress, set and mock results say "No stem yet"), and Today's figure says "Nothing planted yet" when no plant is picked.
- Q5 again: You's scale bar numbers and caption grow with text size (rem); Study tools' values drop under their titles at 200% text (the narrow-card query now follows the root size).
- The chart: each score keeps a clear gap over its tip leaf, and a score under 70 never sits on or above the dashed line (beside the tip, under the line, when it would reach it). When the list replaces the chart, the key gives way to one line for the list.
- The plant chip scrolls the whole plant card into view, so its edge and the heading's focus ring stay on screen.
- Q6 follow-up built (DECISIONS 14): while today's set is unfinished, You, the readiness card and Read next name the set's area, labelled "today's set" where it is not the focus. "Your weakest area" became "Where you'll gain most".
- Focus lands on the page title from Today's avatar, You's detail rows, Settings' FAQ and About rows and after a restore; Help and About opened from Settings go back to Settings.
- Restore brings back dark mode, Exam-day rehearsal and the set length where this browser has none (new `prefs` field in the file).
- What's New headings ("v12.49: title") and About KaiSip have no dashes.
