# Profile React Performance

> **KaiSip note.** Frozen, heavily trimmed copy of Callstack's
> `references/js-profile-react.md` (commit 59e9d17, MIT; see `README.md`).
> Review checklist only; Grove and `mobile/CLAUDE.md` win on conflict. The
> original is built around the `agent-device` CLI, which KaiSip does not have,
> and `@callstack/inspector`, which is not installed. Every `agent-device`
> command, the install commands, an image that was not vendored and links to
> files that were not vendored are cut. What is left is the method: profile the
> exact interaction, then read the results. In KaiSip the first tool is React's
> `<Profiler>` in Jest with a realistic heavy save (see
> `.claude/agents/mobile-performance-engineer.md`); React Native DevTools'
> Profiler tab is the on-device check.

Identify unnecessary re-renders and performance bottlenecks in React Native apps using a React profiler.

## When to Use

- App feels sluggish or janky during interactions
- Need to identify which components re-render unnecessarily
- Investigating slow list scrolling or form inputs
- Before applying memoization or state management changes

## Method

1. Profile the exact interaction or navigation flow under review, nothing wider.
2. On a device: open React Native DevTools from Metro or the Dev Menu, use the Profiler tab, and record that interaction. In tests: wrap the screen in React's `<Profiler>` and record mount time, re-render time and render counts.
3. Baseline output should include the commit timeline, re-render counts, slow components, and a breakdown of the heaviest commit. Record concrete commit times, render counts, and component names.
4. Inspect slow components, re-render counts, and commit timing before proposing fixes.
5. For non-React CPU issues, use the platform CPU profilers (Xcode Instruments, Android Studio) instead of React render profiling.

Release builds do not expose the same React profiling path by default; Expo Go is never a release-build profiling target. Say which numbers come from a dev build and which from a release build.

## Interpreting Results

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Many highlighted components | Cascading re-renders | Add memoization where the profiler shows wasted work |
| "Props changed" on callbacks | Inline functions recreated | Use `useCallback` |
| "Parent component rendered" | State too high in tree | Move state down, or narrow the store subscription (KaiSip: zustand selectors) |
| Long JS thread block | Heavy computation | Move it out of render, cache it, or use `useDeferredValue` |

Only propose callback or dependency-array changes when the profiler or a reproducible bug shows they matter. Do not infer stale closures from a snippet alone.

## Common Pitfalls

- **Using one build type for every question**: Use a development build to identify render causes, commit patterns, and expensive components. Validate timing-sensitive FPS/CPU improvements in production or release-like builds.
- **Not using production builds**: Some issues only appear with minified code
- **Ignoring "Why did this render?"**: This tells you exactly what to fix
- **Using component tree depth or count as the main baseline**: These are secondary context, not the core performance signal

## Related references (this folder)

- `callstack-js-lists-flatlist-flashlist.md` - list rendering
- `callstack-js-animations-reanimated.md` - keeping animation work off the JS thread
