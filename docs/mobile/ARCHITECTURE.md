# Aurivan Mobile — Architecture & Launch Plan

**Status:** Phase 1 foundation built (`mobile/`) · **Date:** 2026-10-05
**Audience:** the founder (beginner-friendly) and every future Claude Code session.

> **In one paragraph.** Aurivan becomes a native iOS + Android app built with
> **React Native + Expo** (one TypeScript codebase, both stores). Questions ship
> inside the app so it works fully offline. Progress is saved on the phone.
> Cloud builds (EAS) mean **no Mac is needed** to publish to the App Store.
> Later phases add accounts and sync (Supabase), subscriptions (RevenueCat),
> and more certifications (CISM, CRISC, AAIA, CISSP) as downloadable content
> packs — without rewriting the app.

---

## 1. How the stack was chosen

Three specialist reviewers (software engineer, UI/UX designer, product
manager) evaluated the options independently. All three picked **React Native
+ Expo**.

| Option | Engineer score | UX score | Why it lost (or won) |
|---|---|---|---|
| **React Native + Expo** ⭐ | **51** | **38** | Cloud iOS builds with no Mac, instant over-the-air fixes, reuses the web app's JavaScript logic, native text + accessibility |
| Flutter | 40 | 36 | New language (Dart), iOS builds need a Mac or paid CI, custom-drawn widgets feel slightly "off" on iOS |
| Capacitor (wrap the website) | 38 | 32 | Apple often rejects "website in a box" apps (guideline 4.2); feels like a web page |
| Native Swift + Kotlin | 31 | 36 | Best feel, but two codebases for one beginner — one platform always lags |
| Kotlin/Compose Multiplatform | 32 | 29 | Immature on iOS, little beginner/AI support |
| PWA only | — | — | Cannot be listed on the Apple App Store |

## 2. The full stack (end to end)

| Layer | Tool | Phase | Plain-English job |
|---|---|---|---|
| App framework | **Expo SDK 57** (React Native 0.86, TypeScript) | 1 ✅ | One codebase → iPhone + Android apps |
| Navigation | **Expo Router** | 1 ✅ | Every file in `src/app/` is a screen |
| State + offline storage | **Zustand** + AsyncStorage | 1 ✅ | Remembers progress on the phone |
| Reminders | **expo-notifications** (local) | 1 ✅ | Daily study nudge, no server |
| Share cards | **react-native-view-shot** 5.1.0 + **expo-sharing** ~57.0 (owner-approved) | 5 ✅ | view-shot turns the fixed 320 × 400 pt card into a 1080 × 1350 PNG; expo-sharing opens the system share sheet with that image on **both iOS and Android** (RN `Share` is text-only on Android). Where expo-sharing is unavailable (web) the same honest sentence is shared as text. Both are native modules: no config plugin needed for sending shares (expo-sharing's plugin only sets up *receiving* shares, which we don't do), but they **need a new dev build** (`eas build --profile development`) before they work on a phone |
| Tests | **Jest** (`jest-expo`) | 1 ✅ | Proves the grading/SRS/readiness logic is right |
| Builds & store upload | **EAS Build + EAS Submit** | 1 | Builds iOS in the cloud — no Mac needed |
| Instant fixes | **EAS Update** | 1 | Ship JS/content fixes without store review |
| CI | **GitHub Actions** (`.github/workflows/mobile.yml`) | 1 ✅ | Typecheck + tests on every PR |
| Crash reporting | **Sentry** (`@sentry/react-native`) | 2 | Tells you when the app crashes, and where |
| Analytics | **PostHog** (anonymous events first) | 2 | Which features help people study |
| Payments | **RevenueCat** (`react-native-purchases`) | 2 | Apple/Google subscriptions + restore, one SDK |
| Accounts + sync | **Supabase** (Postgres + Auth + RLS) | 3 | Sign in with Apple/Google, progress on every device |
| Content delivery | **Supabase Storage / CDN** content packs | 3 | Add CISM etc. without an app update |
| E2E tests | **Maestro** | 3 | Robot taps through the app before release |

**Cost at launch:** Apple Developer $99/year · Google Play $25 once ·
Expo, Supabase, RevenueCat, Sentry, PostHog all start free.

### Why Supabase (and not the custom backend in `design-notes/BACKEND_ARCHITECTURE.md`)?
That proposal was written for the web app. For a solo beginner shipping
mobile, Supabase gives Sign in with Apple (mandatory if you offer Google
sign-in on iOS), row-level security, backups and storage pre-built. It is
plain Postgres underneath, so the data stays portable — the lock-in risk
that doc worried about is small. **Stripe is not usable for in-app digital
subscriptions** on either store; RevenueCat replaces it.

## 3. How the app is organised

```
mobile/
├── app.json / eas.json        # store identity + cloud build profiles
├── scripts/build-content.mjs  # ../data/*.json → src/content/generated (runs on npm install)
└── src/
    ├── app/                   # SCREENS (Expo Router)
    │   ├── _layout.tsx        #   fonts, splash, saved-data loading
    │   ├── onboarding.tsx     #   pick certification + exam date
    │   ├── (tabs)/            #   Home · Practice · Mock · Progress · Settings
    │   ├── session.tsx        #   answering questions (practice + mock)
    │   └── results.tsx        #   score + review
    ├── components/            # Buttons, cards, option cards, tips reveal
    ├── content/               # WHAT we teach: types, cert registry, loader
    ├── engine/                # HOW it works: pure logic, fully unit-tested
    │   ├── shuffle.ts         #   option shuffling + letter mapping
    │   ├── srs.ts             #   Leitner spaced repetition
    │   ├── readiness.ts       #   blueprint-weighted readiness score
    │   ├── blueprint.ts       #   mock exam builder
    │   ├── queue.ts           #   practice question picker
    │   └── streak.ts
    ├── store/                 # WHAT the learner did: progress, settings, session
    ├── lib/                   # glue: session factory, reminders, config
    └── theme/                 # Aurivan tokens (ported from index.html)
```

**The golden rule of the layers:** screens → lib → store/engine → content.
`engine/` never imports React or storage, which is why it is easy to test
and could be reused by a future web rewrite.

### Data flow of one answer
```
tap option ─► session.tsx ─► engine/shuffle.isCorrect (grades on ORIGINAL letter)
                         ├─► store/session.answer      (resume-safe)
                         └─► store/progress.recordAnswer
                                 ├─ answers[id]   → readiness score
                                 ├─ engine/srs    → review queue
                                 └─ streak/today  → Home
```

### The content pipeline
```
data/tips_overrides/d{N}.json ─┐
xlsm (maintainer only) ────────┼─► scripts/convert_test_bank.py ─► data/domain{N}.json   (web app reads this)
                               │                                          │
                               │                     mobile/scripts/build-content.mjs
                               │                                          ▼
                               │                     mobile/src/content/generated/cisa/d{N}.json
```
The mobile builder renames fields, drops author-only fields (`_provenance`),
validates every answer key, and marks real option-letter references as
`{{B}}` tokens so tips stay correct after shuffling — while words like
"A sample of 25" or "Annex A" are left alone. (The web app replaces every
standalone A–D, which can turn "A high-risk system" into "C high-risk
system" after a shuffle; tracked as a separate fix.)

## 4. Roadmap

| Phase | Scope | Exit gate |
|---|---|---|
| **1 — Store launch (CISA)** · 6–8 wks | ✅ practice, mock, review, readiness, streaks, reminders, offline. ☐ app icon/splash from `design-notes/assets/logo.svg` ☐ privacy/terms URLs ☐ EAS builds ☐ Android closed test (12 testers × 14 days for new personal accounts) ☐ TestFlight | Approved in both stores |
| **2 — Monetise + measure** · +6 wks | RevenueCat paywall (free tier + Premium), Sentry, PostHog, review prompt, Topics/notes tab | D7 retention ≥ 20%, crash-free ≥ 99.5% |
| **3 — Accounts + more certs** · +3 mo | Supabase auth (Apple/Google/email), sync, **in-app account deletion**, downloadable content packs, CISM | Paid conversion ≥ 3% |
| **4 — Scale** | CRISC, AAIA, CISSP, All-Access plan, team licences, AI tutor | Self-reported pass rate ≥ 75% |

## 5. Monetisation (recommendation — your decision)

Freemium with in-app subscriptions (product panel recommendation):
- **Free:** a generous sample of each domain + one diagnostic mini-mock.
- **Premium (per certification):** full bank, full mocks, analytics —
  e.g. $14.99/month, **$34.99 / 3 months** (headline: matches a study cycle), $69.99/year, 7-day trial.
- **All-Access** once there are 3+ certifications.
- Enrol in both stores' 15% small-business programmes.
- Remove external tip/donation links (e.g. Ko-fi) from store builds.

## 6. Legal & store compliance (must-dos)

1. **Trademarks** — app name "Aurivan"; never "CISA"/"CISSP" etc. in the app
   name, icon or developer name. Descriptive use only, with the "not
   affiliated" notice (already in Settings → About and `certifications.ts`).
2. **Original content only** — ship only questions with `_provenance` records.
3. **Privacy** — live privacy-policy URL (`EXPO_PUBLIC_PRIVACY_URL`), Apple
   privacy label + Google Data safety form matching every SDK added.
   Before any store build, set `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`
   and `EXPO_PUBLIC_FEEDBACK_EMAIL` in the EAS **production** environment with
   `eas env:create` (public values, never secrets). Don't put them in
   `eas.json`: its `env` values override EAS variables, an empty value hides the
   matching link in Settings, and `eas.json` rejects comment keys like `"//"`.
4. **Account deletion** — required the moment accounts exist (Phase 3).
5. **Paywall disclosures** — price, period, renewal terms, Restore, Terms + Privacy links.
6. **No "guaranteed pass"** claims anywhere. Readiness is always worded as an
   estimate ("estimated readiness", "A study estimate, not a prediction of
   your exam result."), never a prediction.
7. **Android backup (decision, 2026-10)** — `android.allowBackup` is `true` on
   purpose. The app stores only study progress and settings (no accounts,
   no secrets), and a restore onto a new phone saves learners from starting
   over. Revisit if the app ever stores tokens or personal data on device.
8. **Tablets** — `ios.supportsTablet` is `false` for v1 (no iPad layouts or
   iPad screenshots yet).

Run the `app-store-compliance-reviewer` agent before every submission.

## 7. Success metrics

| Metric | Launch target |
|---|---|
| D7 retention | ≥ 20% |
| Questions per weekly active learner | ≥ 75 |
| Mock exams completed / started | ≥ 40% |
| Paid conversion | ≥ 3% of installs |
| Crash-free sessions | ≥ 99.5% |
| Self-reported pass rate | ≥ 75% (≥ 15% response) |

## 8. Known risks

| Risk | Mitigation |
|---|---|
| AI assistants write code for an older Expo | `mobile/AGENTS.md` + `mobile-app-engineer` agent force version-matched docs; CI typechecks |
| ~5 MB of question JSON inside the app grows with each certification | Phase 3: on-device SQLite + downloadable, versioned content packs |
| A wrong answer key reaches learners | `content-pack.test.ts` blocks broken keys in CI; `qa-question-tester` agent blind-tests content |
| Google's 14-day closed-test rule delays launch | Start the closed test as soon as the first Android build exists |

## 9. The agent team

| Agent | Use it when… |
|---|---|
| `mobile-app-engineer` | building or fixing anything in `mobile/` |
| `mobile-qa-tester` | before every build — gates + journey checklist |
| `mobile-ux-reviewer` | after any screen/component change |
| `mobile-security-auditor` | before release; when auth/payments/analytics change |
| `qa-question-tester` | blind-tests questions to find wrong keys/ambiguity |
| `isaca-concept-reviewer` | reviewing content for CISM/CRISC/AAIA (role lens) |
| `isaca-mindset-coach` | writing mindset lessons; coaching a struggling learner |
| `cert-blueprint-researcher` | before adding a certification; yearly re-check |
| `app-store-compliance-reviewer` | before every store submission |
| `product-manager` | deciding what to build next |
| `growth-marketer` | store listing, launch plan, ASO, social posts |

…plus the 19 existing `cisa-*` content agents (see `CLAUDE.md`).
