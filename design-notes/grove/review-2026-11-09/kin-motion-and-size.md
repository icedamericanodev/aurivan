# Grove Kin motion and size

Use the current KaiSip companion page as the home for the selected Kin, with a collection subpage. Keep the established paper surface, left-aligned name block, Grove typography and navigation. The approved concept gives each Kin three connected forms and one next milestone.

## Motion recommendation

Give the selected hero a gentle breathing or sway cycle, a blink where its anatomy suits one, and a brief response to selection. Assign each organism one signature action, such as antenna movement, a wing settle, a shell tilt or a soft cap bob. Keep collection thumbnails still so the screen remains easy to scan.

The proposed “Lumi-like” qualities are softness, presence and responsiveness. Exact Lumi timing or choreography has not been measured. Begin with a slow 4–6 second idle cycle, a roughly 150 ms touch response and a 500–800 ms form crossfade. These are proposed art-direction values, to tune against the approved reference and native device behavior.

Use transform and opacity animation where practical. The reviewed app already declares `react-native-reanimated` 4.7.1 and `react-native-svg` 15.16.0, so the initial implementation can reuse its current rendering stack. Reanimated recommends non-layout properties and warns that many simultaneous animations can affect performance. Its release-build guidance also means browser or development smoothness cannot establish native release performance. [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)

Pause recurring motion offscreen and in the background. Reduce Motion should show a still pose and the completed form immediately, with the same copy and controls. Reanimated provides system-preference support, which should be integrated using the app's existing accessibility pattern. [Reanimated reduced-motion API](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/)

## Measured prototype size

The clickable prototype contains 12 Kin with three procedural SVG forms each, giving 36 form renders. Its vector artwork simplifies the approved AI visual concept. The figures below measure the source used to generate that prototype, including its full roster.

| Artifact | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| Artwork and catalogue source | 9,156 | 3,589 |
| Standalone HTML, including embedded Fraunces and Figtree fonts | 119,401 | 76,740 |

Measurements come from the prototype build's UTF-8 byte counts and Python `gzip.compress` with `mtime=0` and the default compression level. These are source-artifact measurements. Native installed size, store download delta, runtime memory and frame rate remain unmeasured.

## Install-size recommendation

Use shared SVG geometry and small per-form variations. Reuse the app's existing fonts and animation dependencies. Measure the artwork separately from standalone prototype fonts and page code. Keeping SVG concise is a practical design choice, but its actual benefit depends on path count, code reuse and compression.

No native app-size increase has been measured for this concept. A compressed HTML or JavaScript figure describes that artifact only. Android App Bundles generate device-specific APKs, so a universal APK, store download and installed app can have different sizes. [Android app-size guidance](https://developer.android.com/topic/performance/reduce-apk-size)

To obtain the production delta, compare baseline and Kin-enabled release builds for the same platform, architecture and build configuration. Record download bytes, installed bytes and startup/runtime memory separately. Include the entire three-form roster, test a realistic large save, and inspect whether hidden companions continue animating. Device profiling and baseline builds belong to a later authorized implementation pass.

Reviewed read-only source `icedamericanodev/aurivan` at `f4a99e3001aec39cc82fd09f9fafdf6ad27edec7`. The follow-up source check recorded HEAD `579ee1ffa3292789173e2190394c5bd3e3c1c5ee` and confirmed that the plant screen, PlantPage components and theme match the earlier revision. Recommendations adapt the repository's mascot-character-designer, mobile-motion-designer and mobile-performance-engineer roles. They are proposed implementation guidance, with no measured frame-rate, battery or installed-size claim.
