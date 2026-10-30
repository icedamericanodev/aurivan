# KaiSip mobile: dependency audit (Dependabot: 2 high, 3 moderate)

Date: 2026-10-20. Scope: `mobile/` (expo 57.0.26 installed, `~57.0.26` declared).

Updated 2026-10-30 for PR #149: node-forge and zod are now fixed with npm `overrides`; zod, deepmerge and a second decode-uri-component advisory (GHSA-qr28-fpjm-wq7f) are added to the table.

## Method / evidence
- `npm audit --omit=dev --json`, `npm ls <pkg> --all`, `npm explain <pkg>`.
- npm bulk advisory API (`/-/npm/v1/security/advisories/bulk`) for exact vulnerable ranges.
- `npm view` for published versions, the `sdk-57` dist-tags and the dependencies of the newest SDK 57 patches.
- **Shipped-bundle proof:** `EXPO_OFFLINE=1 npx expo export --platform android --platform ios --source-maps` into a scratch folder. I then listed the `sources` of both Hermes source maps (android 2092 modules, ios 2009 modules):
  - braces, micromatch, node-forge, @expo/code-signing-certificates, sprintf-js, xcode, npm `uuid`: **0 modules in either bundle**.
  - decode-uri-component and query-string: **present in both bundles** (via expo-router).
  - The only "uuid" hits are expo-modules-core's own `src/uuid/*`, not the npm `uuid` package.
- Applied in this repo (`mobile/package.json` overrides) after simulating it on a scratch copy of package.json + package-lock.json (`npm install --package-lock-only`). The uuid alert clears and nothing else changes. The ERESOLVE warning about react-native-worklets was already there and is unrelated.

## Key fact: no upstream fix exists for some of these
The advisory ranges cover the **latest published version**, so no override target exists for these:
- braces `<=3.0.3`: latest is 3.0.3.
- sprintf-js `<=1.1.3`: latest is 1.1.3.
- deepmerge: 4.3.1 is the newest release and is affected (GHSA-gcqx-w48m-w2h4).

node-forge was in this list on 2026-10-20 (latest was 1.4.0). GHSA-86w9-cpqp-85rv is now fixed in 1.4.1, and the repo overrides it to 1.4.2 (see the table). zod is fixed in 4.6.6 and is also overridden.

decode-uri-component GHSA-qr28-fpjm-wq7f needs 0.5.1, which is ESM-only and so incompatible with query-string 7 (see below). uuid is fixed in 11.1.1, which is CJS-compatible.

Newest SDK 57 patches (`expo@57.0.30` → `@expo/cli@57.0.31`, `expo-router@57.0.28`, `expo-updates@57.0.26`, `@expo/config-plugins@57.0.10`, `@expo/code-signing-certificates@0.0.7`) **still pull every one of these**:
- query-string ^7.1.3
- @expo/code-signing-certificates ^0.0.6 / 0.0.7 → node-forge ^1.4.0
- xcode ^3.0.1 → uuid ^7
- metro-file-map 0.84.5 → micromatch → braces

The one improvement is `@expo/metro-file-map@57.0.4`, which drops micromatch. braces stays via Meta's `metro-file-map@0.84.5` (pinned by `@expo/metro@56.0.2`; even metro-file-map 0.87.1 still uses micromatch) and via jest 29 (jest-expo).

npm's suggested "fixes" (expo@44, react-native@0.72, expo-updates@0.11) are major downgrades. Reject them.

## Findings table

| Package (installed) | Advisory / severity | Path | In the shipped app (runtime)? | Effective risk | Recommended action | Exact change |
|---|---|---|---|---|---|---|
| braces 3.0.3 | GHSA-vfj7-8cjw-p6xm, High (CVSS 7.5, stack-exhaustion DoS on deeply nested brace patterns) | expo → @expo/cli → @expo/metro-file-map@57.0.3 → micromatch@4.0.8 → braces; also expo → @expo/metro → metro-file-map@0.84.5 → micromatch; jest-expo → jest 29 (jest-haste-map, @jest/transform, jest-config, jest-message-util) → micromatch | **No.** 0 modules in the bundle. Metro file watcher and Jest only, on the developer's machine or CI. The glob patterns are hard-coded (`**/*`) or come from developer config. An attacker cannot supply them. | Low | (c) Accept. No patched braces exists. Optionally refresh the lockfile so @expo/cli picks up @expo/metro-file-map 57.0.4 (removes one of the paths, but not the alert). | None required. Optional: `npm update @expo/metro-file-map` (lockfile-only change, stays inside `^57.0.3`). Dependabot dismiss reason: "Vulnerable code is not actually used" (build tooling). |
| node-forge 1.4.0 (now 1.4.2) | GHSA-86w9-cpqp-85rv, High (CVSS 7.5, RSA PKCS#1 v1.5 signature check accepts extra nested DigestAlgorithm) | expo-updates@57.0.25 → @expo/code-signing-certificates@0.0.6 → node-forge; expo → @expo/cli@57.0.27 → node-forge | **No.** 0 modules in the bundle. Used only by the `expo-updates` CLI scripts (`cli/build/generateCodeSigningAsync.js`, `configureCodeSigningAsync.js`) and the Expo dev server (`@expo/cli/.../utils/codesigning.js`, which checks a self-signed dev certificate). On the phone, expo-updates checks signatures in native code (Swift / Kotlin + Bouncy Castle), not node-forge. The app also does not set `updates.codeSigningCertificate` in app.json, so no signature check happens on the phone. | Low | **Fixed (PR #149).** (b) Override to 1.4.2. The advisory is fixed in 1.4.1, but 1.4.1 broke PEM decoding of Buffer input (`str.charAt is not a function`); 1.4.2 is the one-line fix for that. Both callers need `^1.4.0`, so 1.4.2 stays inside their range. | `"node-forge": "1.4.2"` in the `overrides` block below. Build/dev only (expo CLI, expo-updates signing helpers), not in the phone bundle. Android fingerprint unchanged, so no new native build or OTA. |
| decode-uri-component 0.2.2 | GHSA-qr28-fpjm-wq7f, High (fixed in 0.5.1); GHSA-vcc3-ghjq-m6fr, Moderate (DoS via exponential decoding of malformed percent-encoding) | expo-router@57.0.24 → query-string@7.1.3 → decode-uri-component@0.2.2 | **Bundled: yes. Vulnerable path reached by incoming links: no (by code review).** Expo Router's linking config (`expo-router/build/getLinkingConfig.js:90`) handles incoming links with its fork, `fork/getStateFromPath*.js`. That fork parses the query with WHATWG `URLSearchParams` (`getStateFromPath-forks.js:370-392`), and its `queryString.parse` line is commented out (`node_modules/expo-router/build/fork/getStateFromPath.js`, about line 538). In the router fork, query-string is used only for `stringify` (encoding), which never calls the decoder. The decoding function sits in the bundle through react-navigation's default `core/getStateFromPath.js:499`. Expo Router replaces that default. App code does not import query-string; `src/app/+native-intent.tsx` and `src/lib/legacyLinks.ts` only split strings. Measured cost of the bug (Node 22, `'%E0'` repeated): 300 chars 0.18 s, 1.2 KB 3.5 s, 2.4 KB 17 s. If the code path were ever reached, a crafted `kaisip://…?x=%E0%E0…` link would freeze the app's JS thread. | Low (theoretical self-DoS of the app, needs user to tap a crafted link, and the code path is not used today) | (c) Accept for now. It **cannot be overridden**: (1) the fix (0.5.1) and 0.3.x/0.4.x are `"type":"module"` ESM-only. query-string 7 does `const decodeComponent = require('decode-uri-component')` and calls it as a function, so forcing 0.5.1 throws `decodeComponent is not a function` (tested in PR #149), which would break routing. (2) Overriding query-string instead does not work either: query-string 8, 9 and 10 have only a default export, and expo-router 57 calls `queryString.parse` / `queryString.stringify` by name. Guardrail: do not import `query-string` or call react-navigation's default `getStateFromPath` in app code; read params with Expo Router hooks. | None. Dependabot dismiss reason: "Risk is tolerable". Fixed by the Expo SDK 58 upgrade: expo-router 58 drops query-string (needs a fingerprint change and a new store build). |
| sprintf-js 1.0.3 | GHSA-hp3w-g68c-fv3c, Moderate (CVSS 5.3, DoS through unbounded precision specifiers) | jest-expo → @react-native/jest-preset → babel-jest@29 → @jest/transform → babel-plugin-istanbul → @istanbuljs/load-nyc-config → js-yaml@3.15.2 → argparse@1.0.10 → sprintf-js@1.0.3 (jest 30 also pulls it through babel-plugin-istanbul@8). Shows under `--omit=dev` only because react-native declares `@react-native/jest-preset` as a peerOptional, so npm counts it as prod. | **No.** 0 modules in the bundle. Test coverage instrumentation only. argparse formats only its own help text. | Informational | (c) Accept. No patched sprintf-js exists. | None. Dependabot dismiss reason: "Vulnerable code is not actually used" (test-only). |
| uuid 7.0.3 | GHSA-w5hq-g745-h8pq, Moderate (missing buffer bounds check in v3/v5/v6 when `buf` is passed) | expo-sharing@57.0.22 (and expo → @expo/config / @expo/prebuild-config) → @expo/config-plugins@57.0.9 → xcode@3.0.1 → uuid@7.0.3 | **No.** 0 modules in the bundle. xcode edits the iOS `.pbxproj` during `expo prebuild` / EAS build. It calls only `uuid.v4()` without a buffer (`node_modules/xcode/lib/pbxProject.js:90`), so it never reaches the vulnerable code even at build time. | Informational | (b) Override to 11.1.1, scoped to xcode only. This clears the alert at almost no risk. | Add the `overrides` block below to `mobile/package.json`, then `npm install` and commit the lockfile. |
| zod 3.25.76 (now 4.6.6) | GHSA-mrhx-c7xc-m3w5, High (affects `<4.6.6`) | expo → @expo/cli@57.0.27 (`^3.25.76`); eslint-plugin-react-hooks@7.1.1 (`^3.25.0 \|\| ^4.0.0`, also via zod-validation-error) | **No.** 0 modules in the bundle. Expo CLI and the React hooks ESLint plugin only, on the developer's machine or CI. | Low | **Fixed (PR #149).** (b) Override to 4.6.6, the first fixed version. Going from 3 to 4 is safe here: @expo/cli only builds basic object, string and enum schemas (`DevToolsPlugin.schema.js`, `createMCPDevToolsExtensionSchema.js`) and reads `error.message`; both files were tested under 4.6.6. eslint-plugin-react-hooks officially supports zod `^4`. | `"zod": "4.6.6"` in the `overrides` block below. Remove the override when @expo/cli depends on zod 4, or at the Expo SDK 58 upgrade. |
| deepmerge 4.3.1 | GHSA-gcqx-w48m-w2h4, Low | expo → @expo/config@57.0.9 → deepmerge; jest-expo → jest-config@29/30 → deepmerge | **No.** 0 modules in the bundle. App config loading and Jest config only, with developer-controlled input. | Informational | (c) Accept. 4.3.1 is the newest release and is affected, so no override target exists. | None. Dependabot dismiss reason: "Vulnerable code is not actually used" (build/test only). |

## Exact `overrides` block (as applied in `mobile/package.json`)

```json
"overrides": {
  "xcode": {
    "uuid": "11.1.1"
  },
  "node-forge": "1.4.2",
  "zod": "4.6.6"
}
```

The uuid override came from this audit (2026-10-20). The node-forge and zod overrides came with PR #149 (2026-10-30); see their rows above for why those versions. PR #149 checks: `npm run check` passes, `EXPO_OFFLINE=1 npx expo export --platform android` builds, the Android fingerprint is unchanged, and the lockfile changed only those two entries (registry.npmjs.org, integrity hashes match).

Why 11.1.1 is API-compatible with xcode@3.0.1:
- xcode does `uuid = require('uuid')` and then `uuid.v4()`. uuid 11.1.1 ships a CommonJS build through its `exports.node.require → ./dist/cjs/index.js`, and its named `v4` export is unchanged. I verified that `require('uuid').v4()` returns a v4 string on Node 22.22.
- uuid 11.1.1 has no `engines` limit.
- Do **not** use uuid 12+. Version 12 dropped the CommonJS build (`exports` → ESM `dist/index.js` only).
- The `legacy-11` dist-tag is 11.1.1, the last 11.x release, so pin it exactly.
- The override is scoped under `xcode` so nothing else in the tree changes. A dry run on a scratch lockfile showed only `xcode → uuid@11.1.1 overridden`, and the uuid advisory disappeared from `npm audit`.

After applying:
1. Run `cd mobile && npm install` and then `npm run check`.
2. Run an iOS prebuild smoke test (`EXPO_OFFLINE=1 npx expo prebuild --platform ios --no-install` in a throwaway clone, or the next EAS iOS build), because xcode only runs then.

## Optional housekeeping (does not close alerts)
- Bump to the newest SDK 57 patch with `EXPO_OFFLINE=1 npx expo install expo@~57.0.30 --fix` (or a plain `npm update` inside the `~57.0.x` ranges). This pulls `@expo/cli@57.0.31` → `@expo/metro-file-map@57.0.4`, which removes one micromatch/braces path. It is routine patch hygiene, not a security fix for these advisories.

## Side observation (outside this ticket)
- `mobile/app.json` enables expo-updates (`updates.url` = u.expo.dev, `checkAutomatically: ON_LOAD`) but has no `codeSigningCertificate`. OTA bundles are trusted on HTTPS + Expo account security alone, with no end-to-end signature. That is the Expo default and acceptable for a content app with no accounts. Consider EAS Update code signing before Phase 3 accounts/sync ship, because OTA could then change auth flows. (Low)

## Overall risk statement
- None of the advisories puts learner data or devices at risk in the shipped app.
- All but one (braces, node-forge, sprintf-js, uuid, zod, deepmerge) are **not in the iOS or Android JS bundle at all**. I proved this from the exported Hermes source maps. They run only on developer or CI machines during build, test or dev-server use, with developer-controlled input.
- The exception (decode-uri-component) is bundled. However, Expo Router's deep-link handling does not call the vulnerable decoder; it uses `URLSearchParams`. Its worst case would be the app freezing on a crafted link the user tapped, not data exposure.
- **Release decision: GO.** These are not release blockers.
- Overrides applied: `uuid` (scoped under xcode), `node-forge` 1.4.2 and `zod` 4.6.6. These close 3 alerts.
- Dismiss the rest in Dependabot with the reasons above: braces, sprintf-js and deepmerge × "not used", decode-uri-component (both advisories) × "tolerable risk".
- Re-audit when braces > 3.0.3 or deepmerge > 4.3.1 is published, and at the Expo SDK 58 upgrade (expo-router 58 drops query-string, which fixes decode-uri-component; @expo/cli may move to zod 4, so the zod override can go).

## New dependency: react-native-android-widget (mobile 1.47)

| Package | Why | Cost | Risk and guard rails |
|---|---|---|---|
| `react-native-android-widget` `^0.24.0` (0.24.0 installed; MIT; one maintainer; releases since Jan 2023) | Android home-screen widgets written in TypeScript, with an Expo config plugin. Expo's own `expo-widgets` is iOS-only on SDK 57; a Kotlin/Glance module would be native code to maintain alone | Native Android code (widget providers, an exported read-only image provider, `androidx.work:work-runtime:2.8.1`, `com.caverock:androidsvg-aar:1.4`, `androidx.concurrent:concurrent-futures:1.1.0`); about 0.5 to 1.5 MB of app size (measure on the first APK); a new runtime fingerprint | Pinned to 0.24.x (0.24.0 is the release with unguessable image names). Imported only from `.android.ts(x)` files and mocked in Jest. Our logic lives in `engine/widgets.ts`, so a switch to `expo-widgets` at SDK 58 would replace only the layouts. `npm audit` lists no advisory for it (27 Oct 2026). |

