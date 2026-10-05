# Aurivan mobile — Claude Code memory

@AGENTS.md

Project-specific rules on top of the Expo rules above:

- Architecture, roadmap and decisions: `../docs/mobile/ARCHITECTURE.md`. Read it first.
- `src/engine/` is pure TypeScript (no React, no storage). Every engine change needs a test in `src/__tests__/`.
- Grade on ORIGINAL option letters; display letters are only for rendering (`src/engine/shuffle.ts`).
- Never edit `src/content/generated/` — run `npm run content` (it reads `../data/domain*.json`).
- CISA domain weights in `src/content/certifications.ts` must match `DI` in `../index.html`.
- This cloud environment blocks the Expo API: use `EXPO_OFFLINE=1 npx expo install <pkg>`.
- Before declaring done: `npm run check` and `EXPO_OFFLINE=1 npx expo export --platform android --output-dir <scratch>`.
- Mobile releases are versioned in `app.json` (`expo.version`), separately from the web app's `APP_VERSION`.
- Delegate: `mobile-app-engineer`, `mobile-qa-tester`, `mobile-ux-reviewer`, `mobile-security-auditor`, `app-store-compliance-reviewer`.
