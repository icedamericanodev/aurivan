# Concept Lab expansion screenshots

Refreshed after the TopicCard alignment: each expansion stage uses the same shared TopicCard reading surface, with section dividers instead of nested panel cards.

Captured from the actual Expo web export with synthetic local learner data, Chromium, reduced motion, and network disabled during each lab's interaction.

Normal screenshots use a 393 × 852 viewport. The `2x` captures use a 320 × 852 viewport and CSS text enlargement as an approximation of 200% text. These are browser screenshots, not native Android accessibility evidence.

Each lab has light/dark experiment controls plus light/dark enlarged application-feedback captures. The complete local run also captures Explore and live consequence feedback for all 20 lab/theme/text combinations.

| Lab | Light controls | Dark controls | Enlarged light feedback | Enlarged dark feedback |
|---|---|---|---|---|
| Separate sensitive duties | [View](cisa-lab-segregation-duties-experiment-controls-light-1x.png) | [View](cisa-lab-segregation-duties-experiment-controls-dark-1x.png) | [View](cisa-lab-segregation-duties-apply-feedback-light-2x.png) | [View](cisa-lab-segregation-duties-apply-feedback-dark-2x.png) |
| Plan an audit by risk | [View](cisa-lab-risk-planning-experiment-controls-light-1x.png) | [View](cisa-lab-risk-planning-experiment-controls-dark-1x.png) | [View](cisa-lab-risk-planning-apply-feedback-light-2x.png) | [View](cisa-lab-risk-planning-apply-feedback-dark-2x.png) |
| Assign risk ownership | [View](cisa-lab-risk-ownership-experiment-controls-light-1x.png) | [View](cisa-lab-risk-ownership-experiment-controls-dark-1x.png) | [View](cisa-lab-risk-ownership-apply-feedback-light-2x.png) | [View](cisa-lab-risk-ownership-apply-feedback-dark-2x.png) |
| Control a software change | [View](cisa-lab-change-controls-experiment-controls-light-1x.png) | [View](cisa-lab-change-controls-experiment-controls-dark-1x.png) | [View](cisa-lab-change-controls-apply-feedback-light-2x.png) | [View](cisa-lab-change-controls-apply-feedback-dark-2x.png) |
| Recover business dependencies | [View](cisa-lab-business-impact-experiment-controls-light-1x.png) | [View](cisa-lab-business-impact-experiment-controls-dark-1x.png) | [View](cisa-lab-business-impact-apply-feedback-light-2x.png) | [View](cisa-lab-business-impact-apply-feedback-dark-2x.png) |

Reproduce: `SHOTS=lab-expansion npm run shots -- /tmp/kaisip-topic-lab-verified-shots` from `mobile/`. Set `PLAYWRIGHT_REQUIRE_FROM` and `CHROME_PATH` for the host. This also executes the existing RTO/RPO browser regression.

Additional proposed plan: [80-hour plan, light](risk-plan-selected-light.png) · [80-hour plan, dark](risk-plan-selected-dark.png). These show Payroll and Online orders selected under the initial budget; they are a browser capture of actual controls, not a prescribed universal audit plan.

Automated expansion results: [20 scenario matrix](results.json). Each includes offline manipulation, reset, application retry and unchanged persisted progress. The final immutable harness also checks exactly one topic surface at each of four captured stages (80 browser assertions); all 20 results explicitly record `topicSurface: single shared card`. Zero browser page errors were recorded.

The same final export also passed the existing RTO/RPO browser regression in light/dark: Learn/catalog navigation, deliberate tap/drag and boundaries, vertical-scroll protection, reset, application feedback, optional practice presence, note link, and approximate 200% reduced-motion capture. Zero page errors. Those 16 pilot screenshots remain in `/tmp/kaisip-topic-lab-verified-shots/`.

Native TalkBack/VoiceOver speech, Android system font scaling, and low-end physical-device responsiveness were not tested in this cloud runtime.

[Source SHA256 fingerprints](source-sha256.txt) were recorded at launch and verified unchanged after the browser run. They identify the executed screenshot harness, expansion component and shared TopicCard.
