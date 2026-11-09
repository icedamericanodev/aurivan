# Today dashboard review

This change is prepared for review only. No merge, OTA, AAB upload, or release is authorized. The plant remains retired; legacy saved plant data is untouched.

## Scope and source mapping

The existing Today screen retains its planner, session actions, exam-week/rest states, readiness moments, and four-tab navigation. New presentation sits below the primary study action and existing resume route.

| Display | Existing source and meaning |
| --- | --- |
| Greeting and date | Local device time; the current plan day handles midnight rollover. |
| Target/date | Existing exam settings and days-left calculation; Settings remains the editing destination. |
| Plan estimate and completed steps | Existing `planLeft`, `countedDone`, `todayMinutes` and resume calculations. No new time tracking or inferred study hours. |
| First-five segments | Fixed `firstSetIds`, persisted answer records and matching first-set session responses, deduplicated by question ID. Existing start/resume action is retained. |
| Lessons completed | Current certification's `progress.lessonsDone.length`. |
| Questions answered | Sum of existing readiness domain `answered` values: unique questions, not number of attempts. |
| Weekly activity | Existing streak `recentDays` plus `lastDay`, passed to `twigWeek`; Monday–Sunday, future days masked. Each filled bar means a recorded study day. Daily question volumes and study hours cannot be recovered from the stored latest-answer timestamps and are not displayed. |
| Five CISA domains | Certification registry names and `readiness.domains[].mastery` passed to existing `areaFigure`. Correct hinted or quick-retest answers count half. Percentages and Building/Steady/Strong appear only at the established 30-question threshold; thinner evidence says Not started or Too few yet. These are latest-try study indicators, not exam pass probabilities. |
| Suggestions | Existing `useJourney().upNext` lesson and `focus` domain. At most two, using real lesson and guarded focused-practice destinations. No AI service or confidence percentage. |
| Tester prompt | Existing `testerCard` schedule/opt-in/away rules and `useSeen` persistence. Only the scheduled `expect` question adopts the exact requested expectation text; other scheduled questions remain intact under the existing-product-requirements exception. |

## Preserved feedback behavior

Share feedback opens the existing email workflow. The result says only that the email app opened; it never claims submission or delivery. Failed opening keeps the existing share/retry fallback. Maybe later stores the existing local-day dismissal. Help still disables tester questions durably. No duplicate feedback store or new request was added.

## Review and evidence

The current validation results, native screenshot links and remaining acceptance limits are recorded in [draft PR #243](https://github.com/icedamericanodev/aurivan/pull/243). Treat the PR's checked head and CI results as authoritative rather than assuming a screenshot proves a release.

Independent product/accessibility review corrected an initial raw-accuracy mapping to the existing weighted domain measure. Independent security/performance review found no new data/network surface and corrected unstable presentation callbacks: focus render calls on the heavy fixture dropped from 309 to 170 (main baseline 169). These are test render counts, not release-device frame-time measurements. Existing dependency advisories are unchanged (zero high/critical in the local audit).

The native harness is `mobile/scripts/screenshots/today_native_qa.py`. It refuses any AVD not named `KaiSipTodayQA`, uses only synthetic fixtures, and captures actual Android pixels plus accessibility hierarchy. It must never target a learner's device. Tests cover first-five resume, latest-try denominators and evidence gates, local-date activity, real suggestion destinations and stale-action session protection, and feedback dismissal/preferences after rehydration.

The branch was created from `5e3fad1` (Concept Lab #241 already merged). Mistake DNA #240 remains separate; its app changes do not overlap Today. Shared release documentation and screenshot anchors require normal merge reconciliation if other work changes them first.
