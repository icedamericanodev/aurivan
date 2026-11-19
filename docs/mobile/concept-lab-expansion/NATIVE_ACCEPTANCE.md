# Native acceptance handoff — PR #244

## Availability checked

This session's cloud instance exposes a Linux workspace and browser/desktop, but no attached Android or iOS device. `adb` and `emulator` are absent from PATH, no Android SDK exists at the usual configured locations, no emulator/ADB process is running, and `/dev/kvm` is absent. No connected Mac execution tool is available in this session. Therefore **native checks below are NOT RUN**, not passed. Installing a software-only emulator would not establish lower-end physical-device performance.

Use the existing authorized Mac/device session to check branch `codex/concept-lab-expansion`. Preserve tester data and coordinate device ownership with Today/Mistake DNA. Do not reset, uninstall, publish an OTA, upload a build or change a production release. Use the existing compatible development client and the repository's normal local Metro workflow. If a new native build is necessary, report that separate requirement before disturbing the shared device.

## Required native checks

Record OS/device, app commit, development/release mode, font scale, screen reader and motion settings. Record original device settings and restore them afterward. Use synthetic data/a separate test profile where available.

| Lab / route | Manipulation and expected evidence |
| --- | --- |
| `/labs/cisa-lab-segregation-duties` | Change vendor/payment assignments; paired conflicts respond. Independent review is only effective when reviewer has no transaction duty. Close assignment options and confirm focus returns to its control. |
| `/labs/cisa-lab-risk-planning` | Select Payroll + Online orders (80/80 hours). Change likelihood/control assumptions; priority changes. Omit mandatory Payroll; warning appears. Increment/decrement buttons announce the new value and stop at boundaries. |
| `/labs/cisa-lab-risk-ownership` | Flawed draft is explicitly labeled. Assign risk acceptance to business owner within delegated limit; audit retains independent assurance. Confirm role labels are spoken in full. |
| `/labs/cisa-lab-change-controls` | Normal sequence passes. Emergency sequence request → assess → authorize → deployment approval → implementation → testing → subsequent review passes. Move testing after review; warning appears. Move/disable/add controls work without drag. |
| `/labs/cisa-lab-business-impact` | Restore Identity + Orders + Dispatch (5 units); dependent business services become supported. Remove Identity; both become unavailable. Change criticality to alter illustrative priority. Confirm prospective exposure language is understandable. |
| `/labs/cisa-lab-rto-rpo` | Pilot tap/drag and precise controls still work. Vertical scroll does not adjust either slider. Reset restores 80-minute recovery/30-minute usable-data age. |

For every new lab, test light/dark and native 100%/200% system text, reduced motion, offline operation, and Explore → Experiment → Apply → retry/reset. Confirm:

- TalkBack/VoiceOver traverses only the visible stage; hidden experiment controls are not reachable.
- Stage changes focus the new heading. Assignment selection, application retry, workflow removal/reorder and reset leave focus at a meaningful reachable location.
- Labels, selected/disabled/expanded states and live consequence feedback are understandable, without duplicate or overwhelming speech.
- All text wraps without clipped horizontal content; all controls remain reachable by scrolling and screen-reader navigation.
- Related lesson/note/principle routes open correctly, back navigation is predictable, and optional practice uses the ordinary guarded flow.
- Exploration does not change existing question/lesson progress, readiness, mistake history or SRS.

## Device-performance evidence

On a representative lower-end physical Android device, record cold lab navigation and repeated interactions after warm-up for each lab. Capture a screen recording and a platform trace/frame-time report if tooling is available. Record visible stalls, frame timing, input response, memory behavior and device thermal/power conditions. Distinguish debug/development-client overhead from a production-equivalent build; do not infer release performance from browser timings or pure-engine microbenchmarks. Repeat the pilot and Learn/practice navigation as controls.

Acceptance remains pending until a native owner supplies actual observations and evidence. The existing 20 browser combinations, 22 committed screenshots and Android export are useful supporting checks, but do not establish native speech, font scaling or device performance.
