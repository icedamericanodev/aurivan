# React Native Best Practices

> **KaiSip note (read first).** Frozen, trimmed copy of Callstack's
> `skills/react-native-best-practices/SKILL.md` (callstackincubator/agent-skills,
> commit 59e9d17, MIT; see `README.md` and `LICENSE-callstack.txt`). It is a
> **review checklist only** for `mobile-performance-engineer`. Grove
> (`docs/mobile/DESIGN_SYSTEM.md`, motion rules in §8) and `mobile/CLAUDE.md`
> always win on conflict, and nothing here changes what a learner sees.
>
> - Measure with the agent's own harness (React `<Profiler>` in Jest with a
>   realistic heavy save) or, on a device, React Native DevTools' Profiler tab.
>   The `agent-device` CLI the original assumes is not installed here.
> - **No new dependencies** without the owner's approval: FlashList, Legend
>   List, Jotai, `react-native-performance`, `@callstack/inspector`. KaiSip
>   uses zustand; prefer narrower selectors before any new state library.
> - Cut from the original: the skill frontmatter; every shell block
>   (`agent-device` profiling, `npx react-native bundle`,
>   `npx source-map-explorer`); the `@callstack/inspector` install pointer;
>   links to the reference files that were not vendored. Only four reference
>   files are kept (listed below). Nothing here tells you to run a command or
>   install a package.

## Overview

Performance optimization guide for React Native applications, covering JavaScript/React, Native (iOS/Android), and bundling optimizations. Based on Callstack's "Ultimate Guide to React Native Optimization".

## When to Apply

Reference these guidelines when:
- Debugging slow/janky UI or animations
- Investigating memory leaks (JS or native)
- Optimizing app startup time (TTI)
- Reducing bundle or app size
- Profiling React Native performance
- Reviewing React Native code for performance

## Security Notes

- Treat third-party libraries and plugins as dependencies that still require normal supply-chain controls: pin versions, verify provenance, and update through your standard review process.
- Treat remote chunk loading as first-party artifact delivery only. (KaiSip loads no remote code.)

## Priority-Ordered Guidelines

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | FPS & Re-renders | CRITICAL |
| 2 | Bundle Size | CRITICAL |
| 3 | TTI Optimization | HIGH |
| 4 | Native Performance | HIGH |
| 5 | Memory Management | MEDIUM-HIGH |
| 6 | Animations | MEDIUM |

Impact labels are triage hints: CRITICAL first, HIGH next, MEDIUM when evidence points there.

## Quick Reference

### Optimization Workflow

Follow this cycle for any performance issue: **Measure → Optimize → Re-measure → Validate**

1. **Measure**: Capture baseline metrics before changes. For runtime issues, prefer commit timeline, re-render counts, slow components, heaviest-commit breakdown, and startup/TTI when available. Component tree depth or count are optional context, not substitutes. Do not recommend memoization, atomic state, or compiler changes without a measured render or FPS problem.
2. **Optimize**: Apply the targeted fix from the relevant reference
3. **Re-measure**: Run the same measurement to get updated metrics
4. **Validate**: Confirm improvement (e.g., FPS 45→60, TTI 3.2s→1.8s, bundle 2.1MB→1.6MB)

If metrics did not improve, revert and try the next suggested fix.

### Review Guardrails

- Check library versions before suggesting API-specific fixes. Example: FlashList v2 deprecates `estimatedItemSize`, so do not flag it as missing there.
- Do not suggest `useMemo` or `useCallback` dependency changes unless behavior is demonstrably incorrect or profiling shows wasted work tied to that value.
- Do not report stale closures speculatively. Show the stale read path, a repro, or profiler evidence before calling it out.
- When profiling a flow, measure the target interaction itself. Do not treat component tree depth or component count as the main performance evidence.

### Critical: FPS & Re-renders

**Profile first:** open React Native DevTools from Metro or the Dev Menu, use the Profiler tab, and record the target interaction; or mount the screen inside React's `<Profiler>` in a test with a realistic save. Record commit times, render counts and component names.

**Common fixes:**
- Replace ScrollView with a virtualized list for long lists (FlatList is built in; others need approval)
- After profiling shows broad store/context updates, narrow the store subscriptions (zustand selectors with primitive or shallow-equal results)
- Use `useDeferredValue` for expensive computations

### Critical: Bundle Size

**Common fixes:**
- Avoid barrel imports (import directly from source)
- Remove unnecessary Intl polyfills only after checking Hermes API and method coverage
- Enable R8 for Android native code shrinking

### High: TTI Optimization

**Measure TTI:**
- Only measure cold starts (exclude warm/hot/prewarm)
- See `callstack-native-measure-tti.md`

**Common fixes:**
- Use native navigation (react-native-screens)
- Preload commonly-used expensive screens before navigating to them

### High: Native Performance

**Profile native:**
- iOS: Xcode Instruments → Time Profiler
- Android: Android Studio → CPU Profiler

**Common fixes:**
- Use background threads for heavy native work
- Prefer async over sync Turbo Module methods

## Vendored references (this folder)

| File | Impact | Description |
|------|--------|-------------|
| `callstack-js-lists-flatlist-flashlist.md` | CRITICAL | Replace ScrollView with virtualized lists |
| `callstack-js-profile-react.md` | MEDIUM | Finding unnecessary re-renders with the React profiler |
| `callstack-js-animations-reanimated.md` | MEDIUM | Reanimated worklets |
| `callstack-native-measure-tti.md` | HIGH | TTI (startup) measurement |

The upstream skill has more reference files (memory leaks, bundle analysis, React Compiler, atomic state, bottom sheets, Turbo Modules and others). They are not vendored; ask the owner before relying on them.

## Problem → Reference

| Problem | Start With |
|---------|------------|
| Too many re-renders, tab or screen feels slow | `callstack-js-profile-react.md` |
| Slow startup (TTI) | `callstack-native-measure-tti.md` |
| Animation drops frames | `callstack-js-animations-reanimated.md` (and `expo-animation.md`) |
| List scroll jank | `callstack-js-lists-flatlist-flashlist.md` |

## Attribution

Based on "The Ultimate Guide to React Native Optimization" by Callstack.
