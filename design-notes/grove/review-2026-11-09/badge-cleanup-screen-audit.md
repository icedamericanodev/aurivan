# Badge and screen cleanup audit

Reviewed `icedamericanodev/aurivan` at commit `d92635662e9286f5328ce1c7301752ad9ad7dd0d`. The checkout advanced since the earlier Grove review. This report uses immutable Git reads of that commit, a route and shared-component source scan across 162 files, and targeted reading of the relevant rendering code and copy. It is a design recommendation using the repository’s `mobile-ux-reviewer` lens. No app execution or visual verification was performed.

The requested direction is 23 existing badge types with refreshed Grove artwork and shorter display names, removal of the companion plant experience, and contextual help for secondary feature explanations. Keep stable badge IDs, earned history, tier rules and learning outcomes. The user’s new direction supersedes earlier plant-preservation design decisions. Course content and instructions needed to act safely remain visible.

## P0 · Keep essential information on the screen

| Surface | Keep visible |
| --- | --- |
| Study and drill questions | Stem, choices, confidence prompts, feedback, explanations, learning tips, active task instructions and score consequences. `app/session.tsx:979` and `app/game/callit.tsx:329` explain that a hinted correct answer counts as half. This belongs beside the hint action. |
| Mock setup and session | Timing mode, duration, unanswered count, submit consequences, paused state and answered/flagged legend. `app/mock-start.tsx:147` must retain “The time limit still applies” when the ticking clock is hidden. |
| Readiness and areas | Current range, “A study estimate, not a prediction,” insufficient-data state, answered count and labels required to read a chart. At one answer, show “1 answered” and “Score at 30 answers” rather than an unexplained empty chart. |
| Account, sync, backups and reset | What changes, what is deleted or replaced, which device/account is affected, consent, privacy, review previews, failure states and recovery actions. `content/cloud/copy.ts:96` and `components/yourData.tsx` are critical examples. |
| Notifications, widgets and support | Permission requests, who can see widget information, what support details will be sent, and confirmation that nothing was sent yet. `components/widgetSettings.tsx:87`, `components/support.tsx:855`, `components/beta.tsx:101`. |
| Empty/error/loading states | What happened and the next action. Preserve saved-list guidance when the list is empty, missing-lesson messages, offline sync status, disabled-feature explanations and save failures. |
| Teaching | Entire lessons, study notes, principles, glossary definitions, exam guidance, cheat-sheet recall content and question explanations. Feature help must never absorb these. |

## P1 · Remove plant surfaces completely

| Exact source | Proposed removal or replacement |
| --- | --- |
| `app/(tabs)/home.tsx:329`, `:694`, `:823`, `:870`, `:999`, `:1011`, `:1029`, `:1142` | Remove plant-in-ring art, growth/stage labels, plant tap target, visitor copy, celebration, cleared-day plant, invitation and setup gating tied to that invitation. Retain the readiness measure and study-plan action. A ring should explain readiness only. |
| `app/(tabs)/you.tsx:264`, `:321`; `components/groveYou.tsx` | Remove the plant card, empty picker invitation and related animation choreography. Let the existing study summary and progress lead. Keep the badges entry below progress. |
| `app/plant.tsx`, `app/plant-pick.tsx`, `app/plant-look.tsx`; `app/_layout.tsx:277` | Retire the three plant destinations and registration. Route old incoming plant links to You with a brief retirement message, so saved links remain recoverable. Audit `app/+native-intent.tsx` and widget destinations as part of that change. |
| `app/settings.tsx:603–632` | Rename “Badges and your plant” to “Badges.” Retain badge visibility. Remove “Show my plant” and “Change its look.” Remove plant-specific reset wording and the plant section deep-link target. |
| `app/onboarding.tsx:211`; `components/firstSet.tsx:344–558`; `app/results.tsx` | Remove plant setup bookkeeping, the first-five planting offer, “Choose a different plant,” planted confirmation and “plant later” state in the visible flow. Preserve first-five results, tomorrow’s plan and the reminder choice. Results uses the shared first-set component, so editing Results alone misses the offer. |
| `app/milestones.tsx:120`, `:282`, `:315`, `:334`, `:389`, `:516` | Remove plant album header, plant vignette, planter reward previews and plant/keepsake detail copy. Retain badge shelves, earned state, dates and progress. |
| `components/badges.tsx:363`, `:413`, `:599`, `:727–744` | Remove `planterLine`, planter rows, plant detail props and “On your plant” copy from badge sheets. Badge artwork and achievement evidence become the sole reward presentation. |
| `app/glossary.tsx:133–181` | Remove the optional oak drawing and plant-setting dependency in the title area. Retain glossary search and definitions. |
| `components/widgetSettings.tsx:46`; `lib/widgetData.ts`; `widgets/art.ts`; `widgets/layouts.android.tsx` | Retire the plant widget from new selection. Specify a recoverable replacement for installed plant widgets, such as a compact study-plan widget or a clear “Choose a new widget” state. Removal needs widget lifecycle handling as well as screen cleanup. |
| `content/support/index.ts:74`; `content/cloud/copy.ts:161`, `:228` | Update current feature and sync/reset descriptions after implementation establishes the real data behavior. Keep historical release notes factual, with the new retirement entry above them. |
| `components/plant/*`; `lib/plant.ts`; `engine/plant*.ts`; `app/_layout.tsx:181` | Remove runtime callers after the UI retirement is wired. Review `syncPlanters` and shared badge imports carefully. Legacy backup fields and earned badge history need compatibility handling rather than an incidental data wipe. This report proposes UI retirement, not a destructive migration. |

Botanical line motifs, leaf-shaped brand marks and existing drill names are part of Grove’s style. Removing the companion feature does not automatically require renaming every botanical metaphor or deleting learning-game illustrations.

## P1 · Put recurring secondary explanations behind contextual help

Use one contextual information button per relevant section, with a short sheet title and plain copy. Keep visible values, selected states and action labels. Avoid adding an information icon to every row.

| Source and current copy | Visible proposal | Help content or action |
| --- | --- | --- |
| `app/(tabs)/home.tsx:917`, “Stop any time; your place is saved.” | Start/Continue, remaining time and progress | Under Today’s plan help, “You can stop and continue later.” Preserve any actual unsaved-state warning beside the action. |
| `app/(tabs)/learn.tsx:683`, “Guided pairs each lesson with practice” | Guided | “Guided pairs a lesson with practice on the same topic.” |
| `app/(tabs)/practice.tsx:270`, promotional intro; `:274`, old Games-to-Drills announcement | Practice title and chosen set | Remove evergreen promotional copy. Retire the old announcement into What’s new. |
| `app/(tabs)/practice.tsx:879`, “Pick a domain, topic and difficulty” | Build a set | Explain customization in Practice help. Keep the chosen domain/count/timer values in the chooser. |
| `app/(tabs)/you.tsx:372`, “Each question counts once, at your latest try.” | Answered count | Under Progress help, “Counts use each question’s latest try.” |
| `app/(tabs)/you.tsx:519`, `:526`, `:537`, descriptive study-tool subtitles | Mistakes, Saved, Share progress, with actual counts | Explain each tool in a single Study tools help sheet. Keep the share preview and consent in the share flow. |
| `app/bank/index.tsx:64`, “Browse by domain and topic. Tap any question…” | Question bank, filters and domain rows | “Browse a domain or topic, then open a question to answer it.” |
| `app/field-notes.tsx:57`, `:83`, level advancement and fallback rules | Current level, recent result and changed-level status | “How levels work” sheet with both upward and downward rules. Keep a short visible changed-level notice when a downgrade occurs. |
| `app/milestones.tsx:418–419`, `:494`; `components/badges.tsx:761–799` | Badge name, earned/unearned state, tier and concise current progress | Badge-page help explains earning, permanence and excluded answer types. Detail view keeps the next requirement visible, with full rule and tier mechanics under “How this badge works.” |
| `app/mistakes.tsx:319` | Mistake journal, pattern state and records | Move generic tagging benefit into help. Reuse existing “What do these mean?” explanation at `:197` for tag examples. Keep “Why did you slip?” beside the tag action. |
| `app/glossary.tsx:186`, `:224`; `app/notes/index.tsx:181` | Glossary/Study notes, search and content | Remove redundant page slogans. Put content provenance in About this content or shared Help. Definitions and note prose stay on screen. |
| `app/faq.tsx:46`; `app/help.tsx:54` | FAQ/Help and actual destinations | Remove “Tap a question…” and generic Help intro. Visible affordances should carry this. |
| `app/settings.tsx:490`, `:520`, `:557`, `:567`, `:648` | Haptics, Starting point, Practice mode, Shuffle options, About | Settings-section help can explain their purposes. Retain selected values and direct consequences that would otherwise be surprising. |
| `app/settings.tsx:563` | Practice timer and current On/Off value | Keep “Counts up” beside the control or rename it “Count-up timer.” Move “Practice can change it per set” into help. |
| `app/settings.tsx:884`, `:949`, `:959`, `:970`; `app/fit.tsx:51` | Name, daily time, familiarity and mode fields | Move “You can change this later” repetition into context help. Keep optional/required state and how saving changes Today’s plan when relevant. |
| `app/onboarding.tsx:235`, `:239`, `:287` | “Nickname · optional,” “Exam date · optional,” daily time choice | Shorten repeated reassurance. Keep “Not sure yet” and skip paths visible. Put deeper planning rationale behind a single “About your plan” button. |
| `components/firstSet.tsx:288–289`, habit rationale | Reminder question with time and choice | Put the longer benefit explanation into reminder help. Permission and frequency remain visible at the choice. |
| `components/firstSet.tsx:601–602`; `components/journey.tsx`; `components/youReadiness.tsx`; `components/readinessReport.tsx` | Range, uncertainty qualifier and first-range status | Move the longer explanation of why estimates narrow into readiness help. Preserve sufficient chart labels and an accessible text equivalent. |
| `components/pathChooser.tsx:131`, `:153` | Mode name and actual selection | Put expanded mode rationale in help. Keep a short differentiator where otherwise mode choices are ambiguous. |

## Route coverage and exclusions

All source routes were included in the scan. The following groups cover routes without a recommended standalone help conversion.

- `app/game/{callit,canopy,daylight,field,priority,rumor,sprint,stones,trap}.tsx` and `components/{game,drillKit,drillAnswer,drills}.tsx`. Put reusable scoring methodology in their existing information surface, while preserving live mechanics and learning content. “Tap the steps in order” in Stones, “Root: a sound principle” in Rumor, “Options hidden” in Call it, paused state in Daylight and timing consequences are necessary in context. A separate help button must not be required to discover the active task.
- `app/lesson/[id].tsx`, `app/notes/{index,[domain],subtopic/[id]}.tsx`, `app/principles/{index,[id]}.tsx`, `app/{cheat-sheet,exam-guide,exam-week,glossary,guided}.tsx`, and `components/{lesson,notes,noteFigures,principles,examGuide}.tsx`. Keep course prose, examples, takeaway statements, checklists and recall prompts. Only page navigation tutorials and generic feature introductions are candidates. Keep read/done state and the study action.
- `app/{session,results,mock-start,readiness,caught-up,saved,mistakes}.tsx`, `app/bank/{index,[domain]}.tsx` and `components/{quiz,pace,moments,recovery,bank}.tsx`. Preserve assessment state, errors, empty states and recoverable actions. The untimed-mock exclusion from pacing in `results.tsx:583` is needed beside that result. Keep bookmark empty-state guidance in `saved.tsx:223` until the user has saved questions.
- `app/(cloud)/account/{index,sign-in,email,first-sync,sign-out,switch,delete,delete-synced,what-syncs}.tsx` and `components/{account,sync,webImport,yourData}.tsx`. Keep consent, data handling, merge/switch choices, irreversible consequences and error recovery inline. The dedicated What syncs page already serves as disclosure. Generic account benefits may be shortened on returning visits.
- `app/(cloud)/board/{index,[id],new,activity,blocked,guidelines,moderation}.tsx` and `components/{board,boardLink}.tsx`. Keep posting visibility, guidelines, moderation state, blocked status and destructive-action consequences. Put repeat navigation instructions into board help. Guidelines are the requested content of their own destination and remain visible there.
- `app/{help,faq,reports,whats-new,widget,settings-section}.tsx`, `components/{help,support,beta,widgetSettings,widgetConfig,widgetConfig.android,widgetConfigScreen.android,questionNote,shareCard}.tsx`. Retain report state, sending scope, validation, permissions and data previews. Use information sheets for optional how-to material. Widget installation instructions must remain available when setup fails.
- `app/{index,play,+native-intent,+not-found,_layout,_sitemap}.tsx`, `app/(tabs)/_layout.tsx`, `app/(cloud)/_layout.tsx`. These are routing, redirects, shell or recovery surfaces. Preserve redirects and missing-page recovery. Remove plant destinations safely. They do not need new help icons.
- Shared visual primitives in `components/{ui,settings,groveHub,groveToday,groveYou,today,youTop,studyProfile,displayName,calendar,fit,emptyScreen,skeleton,tabBar,tabSpace,landOnToday,fieldguide/*,leafStrip,pressedTile,medallion,herbarium,milestones,glyphs,icons,brand,motifs,motifPaths,motion}.tsx` or `.ts` should support the policy at callers. Avoid blanket removal of `subtitle`, `intro` or `accessibilityHint` props. These carry essential state in many screens.

## P1 · Information-button specification

Reuse `components/ui.tsx` IconButton and Sheet patterns. Give the small visible information glyph a 48-point target and a spoken label such as “About badge progress.” Keep its hit area separate from the section’s main action. Open a titled sheet, focus its heading, and return focus to the same information button when closed. Support Android Back, VoiceOver/TalkBack, 200% text, scrolling, dark mode and Reduce Motion. Help should remain available offline. Never use hover-only tooltips or remove useful screen-reader hints solely to reduce visible words.

For the badge grid, preserve all 23 stable identities and earned states. A short display name may differ from its persistent ID. Keep the name and earned/tier state readable outside the artwork. Give detailed earning rules a dedicated detail/help surface. Retain one concise next requirement to avoid making users guess what the badge means. Do not encode tier or lock state by color alone.

## Acceptance checks for the later implementation

Check Today, You, badge grid and details at 320 and 390 points and 200% text. Confirm study controls remain reachable after plant removal. Exercise every retired plant deep link and an installed plant widget. Compare fresh, existing-plant, hidden-plant and old-backup users. Confirm badge count remains 23 types and historical earnings survive. Walk through a hinted answer, timed mock, unavailable score, failed backup, account deletion and widget privacy choice to ensure essential explanations remain visible. Validate that course content has not moved behind help and that each information sheet restores focus correctly.
