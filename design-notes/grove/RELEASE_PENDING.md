# Grove release: pending What's New lines and follow-ups

Batched for the end of the uplift (web v13, mobile 2.0.0; DECISIONS 8). Write the final What's New in the CLAUDE.md style.

## What's New lines (draft)
- Today has a calmer, clearer look: your plant grows full size in the readiness ring, and today's plan shows when you've finished.
- Settings now has its own page, and You opens with your week, your next step and your plant.
- Backups now say when they were saved, and restoring one brings back your exam date.
- Today's plan and the You page now point you to the same area to study next. (Fixed; the panel asked for a PATCH, DECISIONS 14.)
- Backing up now says it worked and shows when you last did it, and a restore tells you what the file holds before it replaces anything.
- Your readiness on You now comes with a simple scale and a plain explanation of your low end.
- Restoring a backup also brings back dark mode, Exam-day rehearsal and your set length when this browser has none set.
- While today's set is unfinished, Today and You name the same area to study next.
- Messages no longer get hidden behind an open sheet, and never block a tap.
- Chart scores under the target now sit clearly below the target line.
- Session summary and Practice now point you to the same area to study next as Today and You.
- Area chart labels no longer run together on phones, and a tip under the target never touches the target line.
- At larger browser text sizes, your plant card on You grows with the rest of the page.
- Restoring a backup in a browser with no progress no longer offers to back up an empty file.
- FAQ answers and a few messages read more clearly.
- Weak spots and Saved questions drills now stay on their own questions.
- Area chart scores no longer run together on phones.
- Practice summary now says plainly that it covers all your practice so far.
- Restoring a backup into a new browser is now a plain restore, in short lines.
- Older What's New entries read more clearly.
- Saving your name, exam date or a backup, and restoring one, now confirm right where you made the change, without a message covering the page.
- Practice summary now fits every area's score on small screens and at larger text sizes.
- The You page now names one area to study next, the same as Today.
- Backing up, restoring, resetting and Today's backup reminder now confirm right under what you tapped, on any screen size, and never cover another button.
- Today's next step now labels your own score, and the Practice summary fits small screens at larger text sizes.
- Text sizes and styles are now consistent across every screen, and all text grows with your browser's text size.

## Follow-ups to do at the release
- `mobile/src/engine/plantLooks.ts` `howToOpen` says "in the Herbarium": change to "in Badges" and rebuild `assets/kaisip-plant.js` in the same commit.
- Old What's New entries (v12.44, v12.49) mention "field guide": release history, leave unless Sky says otherwise.
- Q1, Q2, Q5 on the phone (DECISIONS 13): the low-end sentence under its scale bar, "too few yet" instead of "seed" in its chart, and the ScaleBar range label "67 to 79".
- Dash sweep, web and phone together (on the web the Results line, What's New headings and old entries (round 3), About KaiSip, the FAQ, the toasts, the filter-complete line, the auditor alert, the glossary intro and the empty values on Weak spots, the Practice hub and a mock's Pace are done): `app/results.tsx` "Readiness is 68 to 78%" (an en dash today), the em dashes in `session.tsx` and `game/sprint.tsx`, the en dash in `board.tsx`, `shareCard.ts`, `widgets.ts`, and the bundled `readinessRange.ts`, `domainBand.ts`, `readinessReport.tallyText` (need the bundle rebuild).
- The phone Badges row has no 4th "next" slot (never existed); not added.
- Web seed dots use CSS `r` (older Safari falls back to r=4.6): harmless.
- `todayPlanProgress` counts the day's answers before the plan was saved toward the set step: check in Phase 5 QA.
- Phone tab bar labels are px-based and do not grow at 200% text (pre-existing).
- Phone: the same Q6 follow-up (follow today's unfinished set) if the phone shows the same day-one drift; `mobile/` was not touched.

## Small nits to carry into the next web push (from the confirmations review)
- After a restore reload, screen readers may hear "Restored: N answers" twice (focus on #setRestore, whose description includes the line, plus #setSay). Announce once.
- Today's "Download backup" announcement repeats "Backup saved". Announce it once.
- The long wrong-file message sits inside the Restore button; move failure text to a sibling line linked by aria-describedby so the button stays one row.
- Phone Badges row says "Your badges and field notes": check against DECISIONS 8 at the release sweep.
- Footer wording differs: Today "KaiSip is independent and not affiliated with ISACA." vs You and Settings "Not affiliated with or endorsed by ISACA®..."; pick one at the release.

## Carry into the next push (from the type leftovers review)
- Glossary letter buttons are 28px tall on phones: bring them to the 44px target block.
- Glossary letter grid at 200% text leaves an orphan letter (5,5,5,5,5 then Z): even rows.
- Letter bar spacing off the 4px scale (padding 10px, gap 3px): use the spacing tokens.
- "Mastered" label in the Glossary ring overlaps the ring at 200% text; two labels use --muted where TYPE_SCALE 6 asks for --text2.
- Phone: Results "Continue today's plan" and the widget still count an empty review step's minutes; pass the live due count.
- Phone: "Go to Drills" is a ghost button at meta size; TYPE_SCALE R6 vs row 13 conflict, decide once.

## Phase 4b (added 5 Nov 2026, Sky asked: "did we account the evolving plants animation and the games and badges?")
Runs right after Phase 4, web and phone, presentation only, nothing removed:
- Plant: Your plant page, plant pick and naming, looks and planters, the six growth stages, The Turning (plant evolutions) and every plant moment and animation (growth, breathing, stage-up, reactions). Restyle to Grove; prove every animation still plays, and that Reduce Motion shows the end state.
- Badges: the Badges case (shelves, sheet, ladders, tiers, domain emblems), the unlock moment, "New in", the share card, Show badges. Rename any learner-visible "Herbarium" (including plantLooks howToOpen, with the bundle rebuild).
- Drills (games): every drill screen (Snare Spotter, Signpost, Call It First and the six that open after 50 answers), the round header, recap, level-up and the 3-then-unlock rule. Restyle to Grove and TYPE_SCALE.md; behaviour unchanged.
- Web: the plant on Today and You, the web plant page, and the website's badges message.
- Final QA (Phase 5) walks all three on both platforms.
