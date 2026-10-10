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
| Backup files | **expo-file-system** ~57.0 + **expo-document-picker** ~57.0 (mobile 1.3) | 1 ✅ | Settings → Your data. file-system writes `aurivan-backup-YYYY-MM-DD.json` to the app's cache, and expo-sharing hands it to Files, Drive, email or AirDrop; document-picker lets the learner choose a backup to restore. No account, no server, works offline. Both are native modules with no config plugin needed, but they **need a new dev build** |
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

### Backup and restore (mobile 1.3)
Settings → Your data (and the welcome screen) save and restore ONE JSON file:
`{ app: 'aurivan', schema: 1, exportedAt, appVersion, stores: { settings,
progress } }`, each store as its saved `{ version, state }`. No device ids, no
personal data beyond what the stores already hold. `engine/backup.ts` (pure,
tested) reads a file as untrusted input: 1 MB cap, a leading byte-order mark
stripped, `JSON.parse` in try/catch (a cut-off file of ours is called damaged,
not foreign), app and schema checks, a file from a newer app version asks the
learner to update, known cert ids only, a small hand-written type checker
(real dates and times between 2000 and 2100, scores and minutes in range,
`correct ≤ total`), capped lists and maps (5,000 per map), unknown keys
dropped. Ids that don't exist in the app's content (questions, lessons, notes)
are dropped, and a progress store over 1.5 M characters is refused, so Android
can always read the saved row back. Today's frozen plans (`days`) are never
restored: the planner rebuilds today's plan. The phone keeps its own
`onboarded` (the welcome screen's restore sets it). Older formats upgrade step
by step (`FILE_MIGRATIONS`, and each store's own migration from
`engine/saveMigrations.ts`). The screen previews what changes and asks first.
`lib/backup.ts` then checks that the phone's own data could be restored for
Undo, and writes the undo snapshot (ONE, 7 days, in `store/backup.ts`), the new
settings and progress, and the end of any paused quiz in ONE
`AsyncStorage.multiSet`. Only then are the stores reloaded and success
reported; a failed write puts the old rows back. Reminders are re-applied
(permission asked only if reminders are on and it is missing). A bad file
changes nothing. Restores wait for every store to finish loading (the backup
store is part of the launch hydration gate), and an expired snapshot is
dropped at launch.

### Quiet data (mobile 1.3)
Collected because it can't be back-filled. Since mobile 1.4 the answer times
feed the pace features below; `masteredAt` waits for the mastery badges. Each answer record keeps `ms` (time to answer, with time
in the background left out: `engine/answerClock.ts` + `lib/useAnswerClock.ts`)
and `lastConfidence`. Each study-notes subtopic gets a permanent `masteredAt`
the first time it has unassisted correct answers on two different days at
least 12 hours apart (`engine/mastery.ts`; games and Coach me answers never
count). A mock submitted after its deadline stamps its answers with the
exam's end, and a mock visit that ends without an answer still counts toward
that question's time. Questions map
to notes subtopics through the notes' `practiceIds`. All optional: old saves
load unchanged. It stays on the phone (and in the learner's own backup file).

### Pace (mobile 1.4)
Every pacing number comes from ONE pure module, `engine/pace.ts`, and from
the certification's exam facts, never a number typed on a screen: exam pace
= minutes / questions (CISA 96 s), target pace keeps 15 minutes back to
revisit flags (90 s). Plan estimates keep their own 1.2-minute study pace.
- **Mocks** start from `app/mock-start.tsx`: Standard, +25%, +50% (ISACA
  accommodations, WCAG 2.2.1) or Untimed (no deadline), plus "Hide the
  clock". The session keeps `timing`, `hideClock` and the pace `checkpoints`
  (25 / 50 / 75% of the time, each judged once at its own moment by
  `dueCheckpoints`). Results show a pacing panel (`mockPacing`), and the
  saved `MockResult` keeps timing, minutes allowed, median seconds,
  unanswered and the checkpoint deviations. Untimed mocks are labelled and
  left out of `pacingStats`; readiness still counts their answers.
- **Practice timer** (off by default; Settings → Study defaults; offered
  once by a card close to the exam): counts UP from the Build C answer
  clocks (`practiceElapsedMs`), so it stops while the explanation shows and
  never submits anything. A soft cue appears past 2:00 on one question.
- **Results** always show "Median N s per question · exam pace 96 s" for
  practice, and coaching tags on fast misses and long right answers.
- **Daylight** (`engine/games/daylight.ts`): 5 questions, one time budget,
  tiers as multiples of the exam pace. Timed-out questions go to review
  through `queueForReview` (not counted as answered).
- One shared component, `components/pace.tsx` (`PaceStrip`), draws the
  clock and pace line for all three, and both clocks reuse
  `lib/useAnswerClock.ts` (no second timing system). All new fields are
  optional, so 1.3 saves, sessions and backups load unchanged.

### The content pipeline
```
data/tips_overrides/d{N}.json ─┐
xlsm (maintainer only) ────────┼─► scripts/convert_test_bank.py ─► data/domain{N}.json   (web app reads this)
                               │                                          │
                               │                     mobile/scripts/build-content.mjs
                               │                                          ▼
                               │                     mobile/src/content/generated/cisa/d{N}.json
```
**Study notes.** The same builder reads `data/cisa_notes.json` through
`mobile/scripts/notes-pack.cjs` (CommonJS so Jest can test it) and writes
`src/content/generated/cisa/notes.json` (types: `src/content/notes/types.ts`).
It only accepts `schema_version: 2` (`docs/content/NOTES_SCHEMA_V2.md`); a v1
file gives an empty pack and the Learn → Study notes entry hides itself. Bad
illustrations or compare tables are dropped with a warning; a subtopic missing
a required field, or a duplicate subtopic id, fails the build. Diagram colours
are CSS variables, which `react-native-svg` cannot resolve, so
`src/engine/notesSvg.ts` swaps them for the current theme's tokens at render
time (light and dark). Read ticks live in the progress store (`notesRead`,
subtopic ids). Routes: `notes/index`, `notes/[domain]`, `notes/subtopic/[id]`.

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
   Since mobile 1.3 the learner can also save their own backup file
   (Settings → Your data), which works across iOS and Android. The file goes
   only where the learner sends it, so the store data-safety answers stay
   "no data collected".
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
