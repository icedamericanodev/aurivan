# Grove release: pending What's New lines and follow-ups

Batched for the end of the uplift (web v13, mobile 2.0.0; DECISIONS 8). Write the final What's New in the CLAUDE.md style.

## What's New lines (draft)
- Today has a calmer, clearer look: your plant grows full size in the readiness ring, and today's plan shows when you've finished.
- Settings now has its own page, and You opens with your week, your next step and your plant.
- Backups now say when they were saved, and restoring one brings back your exam date.

## Follow-ups to do at the release
- `mobile/src/engine/plantLooks.ts` `howToOpen` says "in the Herbarium": change to "in Badges" and rebuild `assets/kaisip-plant.js` in the same commit.
- Old What's New entries (v12.44, v12.49) mention "field guide": release history, leave unless Sky says otherwise.
- Dash sweep, web and phone together: Results "Readiness is 68–78%" (web and `app/results.tsx`), `session.tsx` em dash, `game/sprint.tsx` "—", `board.tsx` "–", `shareCard.ts`, `widgets.ts`, and the bundled `readinessRange.ts`, `domainBand.ts`, `readinessReport.tallyText` (need the bundle rebuild).
- The phone Badges row has no 4th "next" slot (never existed); not added.
- Web seed dots use CSS `r` (older Safari falls back to r=4.6): harmless.
- `todayPlanProgress` counts the day's answers before the plan was saved toward the set step: check in Phase 5 QA.
- Phone tab bar labels are px-based and do not grow at 200% text (pre-existing).
