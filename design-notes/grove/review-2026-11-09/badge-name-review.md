# Badge display-name review

Use one or two words for every badge title, with the exact earning rule available in its detail view. Keep familiar names when they already work. The proposed names below are distinct across all 23 badge types and describe study achievements without suggesting a professional credential.

Reviewed the production checkout read-only at HEAD `d92635662e9286f5328ce1c7301752ad9ad7dd0d`. Sources were `mobile/src/engine/milestones.ts`, `mobile/src/engine/badgeCatalog.ts` and `.claude/agents/behavioral-scientist.md`. This is an AI editorial and behavioral-design review, with no user-testing or engagement claim. The `BADGES` array contains 23 types, comprising 16 milestones and 7 skill badges. Its comment saying 15 milestones is stale.

| Stable ID | Current display name | Proposed display name | Reason |
| --- | --- | --- | --- |
| `first-foothold` | First Foothold | First Foothold | Retain the welcoming, restrained first-step metaphor. |
| `topic-clear` | Topic Clear | Topic Clear | Retain a direct name for the first cleared topic. |
| `ten-topics` | Ten Topics Clear | Ten Topics | Shorten while retaining the meaningful count. |
| `firm-footing` | Firm Footing | Firm Footing | Retain the established domain-progress name. |
| `whole-map` | Whole Map | Whole Map | Retain the breadth-of-coverage metaphor. |
| `loop-closed` | Loop Closed | Loop Closed | Retain a clear image for correcting earlier mistakes. |
| `slip-spotter` | Slip Spotter | Slip Spotter | Retain the link to recognizing thinking slips. |
| `long-memory` | Long Memory | Long Memory | Retain the link to recall after time has passed. |
| `graduate` | Flown the Nest | Beyond Review | Shorten and refer to questions leaving the review sequence. |
| `know-what-you-know` | Know What You Know | Confidence Check | Name the confidence-and-accuracy relationship modestly. |
| `dress-rehearsal` | Dress Rehearsal | Dress Rehearsal | Retain the clear full-mock metaphor. |
| `on-pace` | On Pace | On Pace | Retain the direct timed-mock achievement. |
| `mindset-shift` | Mindset Shift | Mindset Shift | Retain the existing name for improved choice patterns. |
| `rooted` | Rooted | Steady Days | Make cumulative study days clearer and distinguish this badge from topic retention. |
| `took-root` | Took Root | Deep Roots | Keep Grove language while distinguishing lasting topic recall from study-day accumulation. |
| `fresh-start` | Fresh Start | Fresh Start | Retain the gentle return-after-a-break wording. |
| `snare-wise` | Snare-wise | Trap Spotter | Use familiar language that connects directly to identifying a distractor. |
| `even-keel` | Even Keel | Even Keel | Retain the calm calibration metaphor for the drill achievement. |
| `signpost-reader` | Signpost Reader | Priority Reader | Name the skill of reading the deciding priority word. |
| `myth-clearer` | Myth Clearer | Myth Clearer | Retain a concise name that matches clearing false statements. |
| `sure-footed-pace` | Sure-Footed Pace | Measured Pace | Emphasize controlled, accurate drill performance and distinguish it from mock-exam pacing. |
| `whole-grove` | Whole Grove | Trail Sampler | Describe trying every drill without implying mastery of them. |
| `back-on-path` | Back on the Path | Course Corrected | Shorten and connect the title to fixing earlier drill misses. |

These are presentation-only proposals. Stable IDs, earning conditions, thresholds, counters and earned keys keep their existing meanings. Set membership retains its meaning. Plant-only presentation and rewards are retired separately. The full rule remains necessary for titles such as Deep Roots and Confidence Check. “Beyond Review” refers to earned review graduations rather than a promise of permanent recall.

Preserve the catalogue's existing choice to keep Fresh Start in uncounted Moments. Making it a collection target could frame time away as something to earn. Keep drill achievements in their separate shelf and retain the current exam-focused suggestions. The names should provide a quiet acknowledgment of progress.

If implemented later, audit every label source together. `milestones.ts` has both `BADGES[].name` and hard-coded tier labels such as “Rooted · N days”. Update corresponding presentation labels, badges' accessibility names, detail headings and any celebratory copy so one badge has one title throughout the app. The tier qualifier remains separate, for example “Steady Days · 30 days”. Verify restore and historical earned entries still resolve through their stable ID.

## Appwide information disclosures

Use an information button to explain a measure, reward or optional setting when the explanation is secondary to the task. Give it a specific accessible label such as “About estimated readiness” or “How to earn Deep Roots”, with an adequate touch target. A visible short heading and plain-language opening sentence should make the opened panel easy to understand.

| Keep visible in the main flow | Suitable for an information panel |
| --- | --- |
| The next action, selected state and what a control changes | Why a suggested study area was selected |
| A compact next-milestone line and current progress | The full badge rule, calculation and qualifying exclusions |
| “A study estimate” beside a readiness range | How the range is calculated and interpreted |
| Unsaved changes, validation errors and completion confirmation | Optional background on storage or synchronization |
| Destructive consequences and confirmation choices | Additional backup documentation |
| Essential instructions needed to answer the current question | Supplemental navigation help |
| Course content, answer feedback and the learning explanation | Definitions of UI metrics unrelated to the lesson itself |

Keep the information control beside the concept it explains. Use consistent opening and closing behavior, an explicit close control, sensible focus placement and focus return. Support text enlargement, scrolling and screen readers. Avoid hover-only tooltips and nested disclosures. Keep essential information available without requiring the learner to discover an icon.

Test the proposed copy with tasks such as finding an earned badge, explaining why it was earned and returning to study. Observe misunderstandings and extra taps. That would provide evidence for whether shorter names and disclosures help this audience.

Catalogue consistency check confirms that all 23 IDs, current names and proposed names match `grove-badge-catalog.json`. Its earning-rule text matches the inspected badge definitions and referenced constants, including Steady Days at 10, 30 and 60 days and Measured Pace at three qualifying Daylight rounds. The retained rule for Firm Footing still says “One leaf per domain”. If all botanical presentation is retired, this phrase needs a separate copy decision while preserving its per-domain earning rule.
