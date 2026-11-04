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

## Follow-ups to do at the release
- `mobile/src/engine/plantLooks.ts` `howToOpen` says "in the Herbarium": change to "in Badges" and rebuild `assets/kaisip-plant.js` in the same commit.
- Old What's New entries (v12.44, v12.49) mention "field guide": release history, leave unless Sky says otherwise.
- Q1, Q2, Q5 on the phone (DECISIONS 13): the low-end sentence under its scale bar, "too few yet" instead of "seed" in its chart, and the ScaleBar range label "67 to 79".
- Dash sweep, web and phone together (on the web the Results line, What's New headings, About KaiSip, the FAQ, the toasts, the filter-complete line, the auditor alert, the glossary intro and the empty values on Weak spots, the Practice hub and a mock's Pace are done; old What's New entries are release history): `app/results.tsx` "Readiness is 68–78%", `session.tsx` em dash, `game/sprint.tsx` "—", `board.tsx` "–", `shareCard.ts`, `widgets.ts`, and the bundled `readinessRange.ts`, `domainBand.ts`, `readinessReport.tallyText` (need the bundle rebuild).
- The phone Badges row has no 4th "next" slot (never existed); not added.
- Web seed dots use CSS `r` (older Safari falls back to r=4.6): harmless.
- `todayPlanProgress` counts the day's answers before the plan was saved toward the set step: check in Phase 5 QA.
- Phone tab bar labels are px-based and do not grow at 200% text (pre-existing).
- Phone: the same Q6 follow-up (follow today's unfinished set) if the phone shows the same day-one drift; `mobile/` was not touched.
