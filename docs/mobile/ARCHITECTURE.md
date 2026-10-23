# KaiSip Mobile — Architecture & Launch Plan

**Status:** Phase 1 foundation built (`mobile/`) · **Date:** 2026-10-05
**Audience:** the founder (beginner-friendly) and every future Claude Code session.

> **In one paragraph.** KaiSip becomes a native iOS + Android app built with
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
| Backup files | **expo-file-system** ~57.0 + **expo-document-picker** ~57.0 (mobile 1.3) | 1 ✅ | Settings → Your data. file-system writes `kaisip-backup-YYYY-MM-DD.json` to the app's cache, and expo-sharing hands it to Files, Drive, email or AirDrop; document-picker lets the learner choose a backup to restore. No account, no server, works offline. Both are native modules with no config plugin needed, but they **need a new dev build** |
| Tests | **Jest** (`jest-expo`) | 1 ✅ | Proves the grading/SRS/readiness logic is right |
| Builds & store upload | **EAS Build + EAS Submit** | 1 | Builds iOS in the cloud — no Mac needed |
| Instant fixes | **EAS Update** | 1 | Ship JS/content fixes without store review |
| CI | **GitHub Actions** (`.github/workflows/mobile.yml`) | 1 ✅ | Typecheck + tests on every PR |
| Crash reporting | **Sentry** (`@sentry/react-native`) | 2 | Tells you when the app crashes, and where |
| Analytics | **PostHog** (anonymous events first) | 2 | Which features help people study |
| Payments | **RevenueCat** (`react-native-purchases`) | 2 | Apple/Google subscriptions + restore, one SDK |
| Accounts + sync | **Supabase** (Postgres + Auth + RLS) | Uplift 6–9 (built OFF; see §3 "Cloud (built OFF)") | Sign in with Apple/Google or an email code, progress on every device. Client ports and screens exist behind a build flag; `@supabase/supabase-js`, `expo-secure-store`, `expo-apple-authentication` and `@react-native-google-signin/google-signin` are added only at go-live (Phase 9), cloud build only |
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
    │   ├── _layout.tsx        #   fonts, splash, saved-data loading + recovery screen if it fails (store/useHydrated.ts, store/hydration.ts)
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
    │   ├── outline.ts         #   notes → ordered topic list (study modes)
    │   ├── smartMix.ts        #   Smart mode (mobile 1.5)
    │   ├── studyPath.ts       #   Guided + In order (mobile 1.5)
    │   ├── studyModes.ts      #   mode names, suggestion, Random, topic practice
    │   ├── milestones.ts      #   badges: rules, counters, back-fill (mobile 1.6)
    │   └── games/growth.ts    #   game levels Seedling → Heartwood (mobile 1.6)
    │   └── streak.ts
    ├── store/                 # WHAT the learner did: progress, settings, session
    ├── lib/                   # glue: session factory, reminders, config
    └── theme/                 # KaiSip tokens (ported from index.html)
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
`{ app: 'kaisip', schema: 1, exportedAt, appVersion, stores: { settings,
progress } }`, each store as its saved `{ version, state }`. The file is named
`kaisip-backup-YYYY-MM-DD.json`. Files made by the app's first name, Aurivan
(1.22 and before), say `app: 'aurivan'` and are called `aurivan-backup-…`:
both markers are read, because moving from Aurivan to KaiSip is a backup and
a restore (see "Rename to KaiSip" below). No device ids, no
personal data beyond what the stores already hold. `engine/backup.ts` (pure,
tested) reads a file as untrusted input: 1 MB cap, a leading byte-order mark
stripped, `JSON.parse` in try/catch (a cut-off file of ours is called damaged,
not foreign), app and schema checks, a file from a newer app version asks the
learner to update, known cert ids only, a small hand-written type checker
(real dates and times between 2000 and 2100, scores and minutes in range,
`correct ≤ total`), capped lists and maps (5,000 per map), unknown keys
dropped. Since mobile 1.7 the progress store also carries the optional
"Your reports" list (checked entry by entry, capped at 200, reports about
retired items kept). Ids that don't exist in the app's content (questions, lessons, notes)
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

Since mobile 1.4 the app can never write a backup it would refuse to
restore: `buildBackup` first runs the phone's own data through the SAME
checker in a "fit" mode (`fitForBackup`), which clamps numbers into range,
cuts lists and maps to their caps and repairs broken totals; wrong types
still fail, and the undo-snapshot check still catches them. A property-style
test (`backup-always-restorable.test.ts`) exports 200 random plausible
states and checks each one restores. The write sites are fixed too:
`minutesUsed` (one helper, 1..1440; an untimed mock counts its answer
time) and answer `ms` (capped at 30 minutes).

### Quiet data (mobile 1.3)
Collected because it can't be back-filled. Since mobile 1.4 the answer times
feed the pace features below; since mobile 1.6 `masteredAt`, `lastConfidence`
and the pace data feed the milestones (below). Each answer record keeps `ms` (time to answer, with time
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
- Starting something new over a timed mock whose time already ran out
  records that mock at its deadline first (`guardedStart`), instead of
  offering to discard the learner's answers.

### Choose your path (mobile 1.5)
Four study modes, each for any domain or "All domains" (`engine/studyModes.ts`
holds the names, one-line whys and the stage suggestion). They all group
questions by the study-notes subtopic, through `engine/outline.ts`, which
turns the notes (Build C `practiceIds`) into one ordered topic list
(`lib/outline.ts` caches it per cert).
- **Smart** (`engine/smartMix.ts`, behaviour review §3): 30% due reviews
  (50% when the backlog in the session's scope is over 2× the daily goal;
  a due question is always tagged Due), 40% weak spots drawn by
  `blueprintWeight × (1 − mastery) + exploreBonus` (mastery = credit /
  max(answered, 5), answers over 30 days count half, +0.15 under 3
  answers; a pick from a subtopic never answered is tagged New, not Weak
  spot), 20% new from the most under-sampled domain, 10% refreshers
  (right 14+ days ago, not in review); a short bucket passes its gap on.
  Order: never two from one subtopic in a row, at most 3 weak spots in a
  row, open with a likely success. Over the last 10 answers, above 85%
  prefers analysis items; below 55% prefers foundational ones and a missed
  weak spot offers its note. Each question carries a reason tag.
- **Guided** (`engine/studyPath.ts`, `app/guided.tsx`): one outline topic per
  step: its lesson (or notes), 5 questions foundational-first, 3 interleaved
  from earlier topics. Clear = lesson done (or every note read when the
  topic has no lesson) AND 4 of the last 5 unassisted answers right, read
  from the answer records (no new data). "Next topic" is never locked: it
  names the next uncleared topic and Guided lands exactly there (the saved
  topic always wins). Guided moves on by itself when a step clears its
  topic (`advancePath`). The screen takes `?timed=1|0` from Practice's
  Timed switch and from Results (left out = the Study default).
- **In order**: walks the outline from a saved place and ENDS every session
  with a 2–3 question mixed review tail from earlier topics (blocked-only
  practice is a fluency illusion). The place moves on each answer to a walk
  question (`advancePath`), never on the tail.
- **Random**: blueprint-weighted across the chosen domains; seen items included.
- **Practice this topic** (notes domain page) interleaves a topic's
  subtopics; Build a set gets topic chips.
- Saved: settings `studyMode` (unset = follow the stage: diagnose → Random,
  learn → Guided, later → Smart; the learner's choice always wins),
  `studyDomain`, `studySize`; progress `studyPath.inOrder` / `.guided` per
  scope. All optional and checked by the backup checker (its fit mode
  included); a restored In order place whose question no longer exists is
  dropped, so the scope starts over.
- **Timer default everywhere**: with Settings → Study defaults → Timed
  practice on, every non-mock session (review, Today's plan, concept, topic,
  saved, mistakes, bank, the modes) starts timed (`newSession`). Practice's
  own switch still overrides one set; mocks keep their start sheet.

**Games (mobile 1.5).** *Root or Rumor* (`engine/games/rootOrRumor.ts`) plays
one-line statements from the notes: Rumors are the exam traps; Roots are the
first sentence of "The IS auditor’s lens" and "How it works" lines, kept only
when they are whole standalone sentences of 8–30 words (no questions, no
e.g. fragments, nothing that leans on the line before; the filter runs on
the bundled notes at load and on CI). Each statement is a review *card*
(progress `cards`, same Leitner rules, never readiness or mastery; restored
cards for notes that no longer exist are dropped). The registry counts its
pool from the notes (`notesPool`). *Call It First*
(`engine/games/callItFirst.ts`) shows the stem, asks for the principle from 3
keyConcepts, then shows the options; a keyConcept that repeats over 60% of
the key option's words leaves that question out, decoys are never
near-copies, and the pre-read hint makes the answer assisted. `related`
holds concept names, not ids, so near-topic decoys are matched by name and
topic. Both use `GameIntro` (Seedling / Sapling / Heartwood), the shared
recap and the minPool guard.

### Milestones and game levels (mobile 1.6)
Badges that INFORM about mastery (behaviour review §4, games review §5).
`engine/milestones.ts` holds the 15 milestones and the 7 game skill badges,
each with one plain rule shown before it is earned; `lib/milestones.ts`
works out the facts from saved progress.
- **Rules.** Coach me answers and game answers never count: the facts
  read only answers whose last try had no hint and wasn't in a game
  (`AnswerRecord.lastGame`, written for `mastery: false` answers; older
  saves have none and read as "not a game"). No badge rewards raw counts,
  minutes, taps or a share of the bank: Myth Clearer (20 of the last 25)
  and Signpost Reader (8 of the last 10 FIRST questions) are rolling
  windows of DIFFERENT items, Long Memory counts each question once, and
  Sure-Footed Pace needs 4 of 5 right as well as pace. Once earned, a mark (a badge, a Firm Footing leaf per domain, a
  Rooted tier of 10 / 30 / 60 study days) is never removed.
- **Data.** Most badges are DERIVED: domain mastery from unassisted answers,
  the Build E topic-clear rule (lesson done + 4 of the last 5 unassisted
  right), Build D mock pacing (full timed mock with nothing unanswered;
  every pace check within 10%), the mindset-growth card, tagged mistakes.
  The progress store keeps only what can't be worked out later, in an
  optional `milestones` map per cert: `earned` (mark → time), the
  celebration `queue`, the `backfill` summary, counters (long-gap recalls
  with the questions counted, later-day fixes, graduations, game misses
  fixed, Daylight rounds at pace), the rolling `myths` / `signposts`
  windows, the last 50 unassisted non-game "sure" answers, game misses
  (questions and note cards, each with its miss day) waiting to be fixed
  on a later day, and cumulative study
  days with the day the learner came back after a week away. A logged
  mistake fixed on a later day gets `fixedLater`, so it counts once.
- **Moments.** `finishSession` (and every game's round end, through
  `lib/gameRounds.ts`) saves new marks and queues them; the screen that
  just ended shows at most ONE (Results: `session.milestone`; a game: the
  round news; never after a level-up, which is that round's one
  celebration), with one success haptic, static under Reduce Motion, no
  confetti and no notification. The rest wait for later sessions, and so
  does a mark from an expired mock recorded without its Results
  (`finishSession({ celebrate: false })`).
- **Back-fill.** Once per cert (`_layout.tsx`, also after a restore from an
  older backup; `checkMilestones` runs it first as a guard),
  `ensureBackfill` infers what the cert's own saved data still shows
  (later-day fixes, "sure" answers, visible study days), saves those marks
  QUIETLY and keeps one count for the summary line on You and Milestones
  ("You'd already earned 4 milestones.", shown once). It never reads the
  streak's recent days (shared by every exam, kept by Reset) and never
  awards Fresh Start (earned live only). Reset leaves an empty record with
  the back-fill marked done.
- **Backup.** Every new field goes through the checker and its fit mode.
  On restore `keepSupportedMarks` drops any mark the restored data could
  not have earned (`markSupported`: the plain necessary conditions),
  checked BEFORE retired question ids are trimmed, and
  the queue keeps earned marks only. The always-restorable property test
  generates milestones, game levels and every new card kind.
- **Game levels.** `engine/games/growth.ts`: each game moves Seedling →
  Sapling → Heartwood after 2 rounds in a row at 80%+ on its skill step
  (Daylight's: in time AND right),
  and back one level after 2 rounds under 50% ("Back to Sapling for a few
  rounds"). Only rounds played at the learner's level move it. Stored as
  optional `gameGrowth` per game, with the last 30 skill-step results (Snare
  Spotter's last 10 snares) and a run of "well calibrated" Forecast
  rounds. Game intros start on the learner's level; Play shows it as a
  leaf and a word.
- **Screens.** You → Milestones (earned, the 3 closest with rule and
  progress, the rest with rules), You → Field notes (levels and pressed
  leaves), the Results moment and the round-end lines.

### Help and feedback (mobile 1.7, Uplift Phase 1 "Ask and fix")
Learners report a problem where they see it, and see when it's fixed. No
server: every email goes through the learner's OWN email app.
- **Emails** (`engine/support.ts`, pure, tested): Report a problem, Send
  feedback and Contact support. Subjects carry tags for mail filters
  (`KaiSip · Report · CISA · d4_217 · key`). A report names the bank's
  ORIGINAL letter with the shown one in brackets ("Your pick: A (shown as
  C)", plus the shown order when shuffled), the item code, reason, app and
  OS major version, review month and a random `R-XXXX` ref. Never a name,
  exam date, score, progress, device id or question text. Notes are cleaned
  and capped (1,000 characters); the mailto link is capped at 4,000 and an
  oversized note is shortened with "…".
- **Sending** (`lib/support.ts`): `Linking.openURL('mailto:…')` on both
  platforms, never `canOpenURL` (it needs extra config and answers "no").
  If it fails, the sheet shows the address and the whole message as
  selectable text with "Share details" (RN `Share`). We never claim "sent".
  `expo-mail-composer` (iOS in-app composer) is deferred to a native build.
  The address `certprep.support@gmail.com` is built in (`lib/config.ts`);
  the env var can override it, and an empty or broken value can't disable it.
- **Entry points** (`components/support.tsx` `useReportFlow` + `ReportRow`):
  every practice answer (`TrustLine`), the results review after practice and
  mocks, "Something not working? Report a bug" on Results, the mistake
  journal (`ReportLink`, the link only), every study note, every lesson step
  (a check only after it's answered), every miss in a game recap (cards by
  their stable review-card id, `RecapMiss.reportId`), and Help and feedback
  (one row in Settings and in You). A live mock has none (the navigator says
  to report from the review). Every send runs once at a time (a ref guard);
  "Copy or share instead" and the no-email-app panel show the message to
  copy or share, with "Try again". The link says "Report started 11 Oct".
  Feedback and support sheets stay mounted, so Cancel keeps typed text.
- **Your reports** (progress store `reports`, optional, newest first, 200
  max): `{ ref, item, reason, at, cert, version?, creditSeen? }`, item =
  `q:d4_217`, `note:4A2.3`, `lesson:<id>#<step>`, `card:<id>`, `app:<screen>`;
  `version` = the app version it was made on. It goes through the backup
  checker and its fit mode; reports about retired items are kept. A reset of
  one exam leaves it alone. Restoring a backup from before 1.7 (no list at
  all) keeps the phone's list; a file with a list replaces it.
- **Credit loop**: `content/support/fixes.json` (`{ ref, cert, date, fixedIn,
  kind, publicNote }`, bundled, empty until the first fix ships) is matched
  on the phone: a fix for the same item whose `fixedIn` version is NEWER than
  the version the report was made on (by day when either side has no
  version) shows "Updated after your report" in Your reports, and once, on
  Today (with Dismiss) or What's new, whichever comes first. The plural
  counts different items. No streak, growth or badge for reporting.
- **Screens**: `help` (two groups, Get help and Updates; also
  `kaisip://help?open=support|feedback|idea|report`, read in an effect and
  then cleared, so a second link while Help is open still works),
  `faq`, `reports`, `whats-new` (every mobile release in plain words, plus
  "Fixed after learner reports", ending with a fixed feedback line). The
  read-only `whats-next` list was removed in 1.17.1: the plan is internal
  (kept outside this public repo), and `src/app/+native-intent.tsx` sends old
  `kaisip://whats-next` links to Help (`lib/legacyLinks.ts`). Content
  in `content/support/index.ts`; `support-content.test.ts` enforces the What's
  New style. Maintainer side: `docs/support/PLAYBOOK.md`.

**Games (mobile 1.6).** Three content games, all in the registry with the
minPool guard (`isPlayable` now also counts a cert's decks from
`content/games`; `lib/games.ts` asks it for every screen):
- *Field Guide* (`engine/games/fieldGuide.ts`): the notes' subtopic and
  domain key terms, deduped, with a leak filter (a definition repeating
  the term's head word or acronym is left out). 3 boards of 4: tap a term,
  then its meaning; first-try pairs score. Seedling mixes topics, Sapling
  keeps one topic, Heartwood recalls the term from 6. Cards `kt:<subtopic>:…`
  or `kt:D<domain>:…`.
- *Canopy Call* (`engine/games/canopyCall.ts`): the two-expert reviewed
  roles deck (`content/games/cisa/roles.json`, copied verbatim). 10
  decisions; a card's `exclude_chips` are never offered; levels play the
  deck's card tiers; the end screen shows confusion pairs. The slip
  coach's "wrong role" pattern drills here. Cards `role:<subtopic>:<id>`.
- *Stepping Stones* (`engine/games/steppingStones.ts`): the 28 reviewed
  sequences plus the lesson flows with a strict order, as shipped or as
  corrected in the lesson since (`flows.json` `orderedNow`, the six fixed
  in 1.6; JML excluded; steps read from the lesson). A process never plays
  below its deck tier. 3 processes; tap to place, tap a
  placed stone to take it back; Heartwood finds the missing step. Cards
  `seq:<subtopic>:<id>` or `flow:<lesson>` (a restore keeps a card while its
  note, lesson or domain exists: `cardKnown`).
Games never count toward mastery or readiness: these three only write
review cards. Odd Leaf Out (games review §3.6) is not built.

### Cloud (built OFF) — Uplift Phase 6, accounts
Accounts, sync (Phase 7) and the feedback board (Phase 8) are built and
tested now but switched OFF in every build. Nothing a learner can see
changes until the owner's go-live (Phase 9). Spec: the uplift plan's
PHASE6_8 (§1–2).
- **One build-time switch**, `EXPO_PUBLIC_AURIVAN_CLOUD` (`src/cloud/flag.ts`).
  Unset in every EAS environment = OFF. babel-preset-expo writes it into the
  bundle as a literal, so `CLOUD` is `false` in a store build. Never a
  remote switch: no server value, deep link or saved data can turn it on.
  Sign-in methods: `EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS` (default
  `email,apple,google`).
- **Ports, not SDKs** (`src/cloud/types.ts`). Screens and `lib/account.ts`
  talk to a `CloudBackend` (`auth`, `sync`, `board`); every failure is a
  `CloudError` code, never a raw server message. Device ports for Phase 9's
  native adapters: `SecureKVPort` (Keychain / Keystore), `AppleSignInPort`,
  `GoogleSignInPort`, `RandomPort`, `CaptchaPort`. `src/cloud/memory/` is
  an in-memory backend that plays the server's rules (6-digit codes, 60 s
  resend, 10-minute codes, 5 tries, the 10-minute re-auth window for
  deleting, `gone` for an account already deleted vs `unauthorized` for no
  session, export once an hour with no re-auth, sync `rev` conflicts,
  offline, a reply lost after the work is done) for tests, dev builds and
  `SHOTS=cloud`. Tests swap backends with `setBackendForTests`. It can only
  be created in a dev build or the WEB screenshot export
  (`runtime.on.ts` checks `__DEV__` or `Platform.OS === 'web'`), so no
  phone release binary can run it, whatever an EAS environment sets.
- **Bundle exclusion without new machinery.** `src/cloud/backend.ts`
  requires `runtime.on.ts` behind an INLINE
  `process.env.EXPO_PUBLIC_AURIVAN_CLOUD === '1'` check; with the flag
  unset that is `undefined === '1'`, which Metro folds away before it
  collects dependencies, so the ON runtime and the memory backend are not in
  an OFF bundle at all (`runtime.off.ts` exports `backend = null`). No
  `metro.config.js` was needed. The entry points (`{CLOUD && …}`) and the
  `(cloud)` screens do ship, inert: the screens import no SDK.
- **Session**: `src/cloud/secureSession.ts` splits the session into secure
  store keys of at most 1,800 bytes, in one of two slots that take turns: a
  write clears and fills the OTHER slot, then switches the manifest (slot,
  count, length, checksum), then clears the old slot. A crash or a read
  mid-write sees the old session whole, never a mix; a broken set reads as
  "signed out" and is cleared (only if the manifest didn't change under
  the read); sign-out clears the manifest and both slots, so no piece of a
  refresh token is left in the Keychain. Every write is "this device only,
  after first unlock". Nothing secret in
  AsyncStorage: `store/account.ts` (`aurivan.account.v1`) keeps only
  signed-in, the MASKED email, the methods, the SHA-256 of the account id
  and "sign in again"; it is never hydrated with the flag off, never in a
  backup file, never synced. `deviceId.ts` keeps a random UUID in the secure
  store (a restored phone gets a new one).
- **Screens** (`src/app/(cloud)/`): the group's layout is a `Redirect` to `/`
  unless the build has a backend, so `kaisip://account/delete` lands on
  Today with the flag off. `/account` is the sign-in sheet when signed out
  and the account screen when signed in; `/account/sign-in` (for "sign in
  first" places), `/account/email` (code sign-in), `/account/delete` (step 1
  → re-confirm → done). No route reads link parameters or calls the backend
  on mount. Ways in: You → its own Account section (Help and feedback's first row in Phase 6; moved in Phase 7), and Settings →
  Account; never at launch, onboarding, a session or as a pop-up.
- **Safety asserts** live in `src/cloud/configGuard.ts`
  (`assertCloudConfig(env)`, pure and tested): the flag must be `1` or
  unset; the memory backend fails any EAS profile except `development`
  (G9); the flag on `production` needs `AURIVAN_CLOUD_GO_LIVE_ACK=yes`; an
  https backend URL and a publishable key; https Privacy policy and Terms of
  Use links (the sign-in sheet links both); no secret-looking
  `EXPO_PUBLIC_*` value; no Google on iOS without Apple (App Store 4.8, for
  EAS iOS builds; with no EAS platform the check is skipped, and on iOS the
  app shows Apple whenever it shows Google anyway). **Phase 9 adds
  `mobile/app.config.ts`, which calls `assertCloudConfig(process.env)` and,
  only when the flag is on, adds the native plugins** (`expo-secure-store`,
  `expo-apple-authentication`, `@react-native-google-signin/google-signin`).
  It was not added in Phase 6 on purpose: there were no plugins to add, and
  a config file risks the native fingerprint (§6.9).
- **No new dependency in Phase 6.** SHA-256 (the account hash, the Apple
  nonce) is a small tested TypeScript file (`engine/sha256.ts`) instead of
  `expo-crypto`. `@supabase/supabase-js` and the three native modules above
  arrive at Phase 9, each justified then, in the cloud build only.
- **Guards** (CI): G1 `scripts/check_secrets.sh` runs on EVERY pull
  request (`verify.yml`; the repo is public): the secret shapes in
  `scripts/secret_patterns.txt` in every tracked file but `data/`, the
  app-only words in `scripts/secret_patterns_app.txt` under `mobile/`, a
  narrow `path:pattern` allowlist (`scripts/secret_allowlist.txt`), and no
  tracked key file (`.p8 .p12 .jks .keystore .pem .key .mobileprovision`)
  or `.env` file (the root `.gitignore` ignores them too). In
  `.github/workflows/mobile.yml`: the whole Jest suite a second time
  with the flag ON and the memory backend, signed out; G2
  `mobile/scripts/check_off_bundle.sh` greps the OFF Android export for the
  backend SDK, sign-in SDKs, secure store, `/rest/v1/` and the memory
  backend's demo markers (checked both ways: a flag-ON export trips it).
  Jest: G4 (`cloud-off.test.tsx`: no fetch or XHR on nine screens and a
  session), G5 (the `(cloud)` routes redirect, no backend call), G9
  (`cloud-core.test.ts`). Server-side guards (RLS, pgTAP) live with
  `supabase/`.
- **Screenshots**: `SHOTS=cloud bash scripts/screenshots/run.sh <out>
  <light|dark>` exports the web build with the flag ON and the memory
  backend (`EXPO_PUBLIC_AURIVAN_SHOTS=1`; never a store build) plus the same
  app with the flag OFF for the `off-*` proof shots (DESIGN_SYSTEM §17).

### Cloud (built OFF) — Uplift Phase 7, sync
Optional progress sync between a learner's phones, built and switched OFF
like accounts (same flag; nothing renders, no timer runs and no storage key
is touched with it off: `cloud-off.test.tsx`). Spec: PHASE6_8 §3.
- **One snapshot per store.** Each phone pushes its `settings` and
  `progress` stores as whole snapshots (`public.sync_snapshots`), without
  the device-local fields: reminders, theme, motion, haptics, `onboarded`,
  the fit card's local counters, today's count and plans, and the plant
  display choices never leave the phone. Each snapshot carries `changedAt`,
  a map of "when was this choice last changed" stamps (kept in the sync
  record, never in the stores, so an OFF build saves exactly what it did).
- **Merge, never overwrite** (`engine/syncMerge.ts`, pure). Union for
  things done (answers, reviews, bookmarks, mocks, lessons, notes, badges,
  reports), max for counts, earliest for first times, last-writer-wins by
  stamp for single choices (exam, exam date, study defaults, the plant's
  name and look). Ties go by value, never by side, so phones converge on the
  same bytes; set-like lists are kept sorted for the same reason. Times more
  than a day ahead are pulled back to now; stamps that far ahead count as
  unknown. Evidence for badges never shrinks (windows keep the longer
  history, a slip tag stays, a game never loses a level, readiness keeps the
  higher reading), so `keepSupportedMarks` after a merge can't drop a badge
  either phone earned. Property tests: commutative, idempotent, absorbing,
  associative, monotone, over seeded random states (`sync-engine.test.ts`).
- **One checker** (`engine/backup.ts readStores`). A pulled snapshot goes
  through the same checker as a backup file, plus a strict mode (a
  prototype key anywhere, or a state over the cap before trimming, is
  refused). A refused pull pauses sync; the phone changes nothing and the
  account is never pushed over. Unlike a file, a pull keeps ids this app's
  content doesn't have (bounded by the caps), so two app versions agree
  instead of dropping and re-adding them on every sync.
- **The cycle** (`lib/syncCore.ts`, ports only): heads (rev, write time and
  app version, never the data), `engine/syncPlan.ts` (idle, push, pull,
  merge, first, pause; a rev plus its write time is the write's identity, so
  a copy deleted and made again is never "unchanged"), pull and check, merge,
  ONE storage write through the restore path (`lib/backup.ts writeSynced`:
  keeps today's plans and a paused quiz, and merges in whatever the learner
  did since the cycle read the phone, both when the write starts and after
  it lands; a quiz opened while the pull was on the network still makes it
  wait), then push what the phone now holds at the rev just seen; a
  `conflict` (another phone wrote first) retries after 1 s, 3 s, 9 s. A
  snapshot from a newer minor app pauses ("Update the app"); one claiming an
  app more than one major ahead (no update reaches it) pauses as unreadable;
  an unreadable copy isn't downloaded again until its rev changes or the
  learner taps Try again; an empty phone never pushes over the account's
  progress; a copy deleted from another phone turns sync off here instead of
  re-uploading it.
- **Never into another learner's account; never under the learner**
  (Phase 7 review). The sync record keeps the account's SHA-256
  (`accountHash`), set in the same write that turns sync on. Every cycle
  compares it with the account signed in now (a local session read), not
  only on a sign-in event, which a relaunch never sends: a different account
  never syncs; the switch sheet asks, and its "Not now" turns sync off here.
  Cycles run one at a time (the first sync's own push included); a
  generation counter stops a running cycle before its next write or push,
  and Undo sync, sign out, remove, Delete synced progress, account deletion
  and the account switch wait for it and hold off new cycles while they act.
  A failed run leaves its retry to the backoff.
- **When** (`lib/sync.ts`): at launch (after `initAccount`, which loads who
  is signed in first), on background, when a quiz, lesson or
  game ends (root `_layout` tells it the route; a pull never lands under an
  open session), at most every 10 minutes after a change, and Sync now.
  Failures only change the status line and back off 30 s / 2 min / 10 min /
  1 h; a lost connection says "Will sync when you're online", any other
  failure "We'll try again soon". The record is `aurivan.sync.v1`
  (`store/sync.ts`: on/off, the account's hash, last rev, write time and
  fingerprint per store, stamps, pause reason and the unreadable rev, a
  waiting pull), never in a backup file, never synced, never hydrated with
  the flag off.
- **Choices stay with the learner.** The first sync on a phone shows a
  preview (phone only, account only, or both: This phone · Account · After,
  where After is the real merge) and keeps a 7-day "Undo sync" copy in the
  backup store's undo slot, written in the same storage write, whenever the
  phone holds anything at all (`holdsStudy`: a saved question, a note, a
  plant or an exam date count). A merge keeps an earlier Undo sync copy as it
  is (it still puts back the phone from before it FIRST synced); Start fresh
  always takes a new one. Undo sync turns sync off only when it worked. A
  different account on a shared phone asks first (Start fresh, the default,
  keeps this phone's progress in Undo sync and never adds it to the new
  account); any account other than the last one synced here gets a new
  install id before its first push. Sign out can remove this phone's
  progress (for shared devices): while syncing it sends the latest first,
  warns when something is only on this phone, then puts the phone back to a
  fresh install's study state in one storage write (theme, motion,
  reminders and haptics stay; `lib/backup.ts wipeLocalStudy`), with the
  sync record and link, and renews the install id; account deletion's "also
  remove from this phone" does the same. Delete synced progress removes the
  account's copy (and the server's checkpoints) and turns sync off; the
  other devices stop when they next connect.
- **Two different plants** (each phone planted its own, or one was reset):
  the earlier planting is kept, at the higher growth of the two, so nobody
  re-plants or loses growth; the first sync's Combine keeps the more grown
  plant instead and stamps that choice (`plantId.<cert>`), so a phone still
  holding the other plant never undoes it. A merge whose mocks pass the
  50-mock cap keeps every Dress Rehearsal tier already earned.
- **Known limits (v1), in "What syncs":** removals don't travel (a bookmark
  removed, or progress reset, on one phone comes back from another device
  that still has it; with only one phone syncing, a Reset is simply sent to
  the account, so it is not refilled; the Reset alert says so while syncing,
  and points to Delete synced progress to start fresh everywhere); attempts
  made offline on two phones count as the max, never the sum; a phone whose
  clock is days off keeps its own choices until its clock is right (answers
  are never lost). A compromised account (or a hostile snapshot in the
  learner's own account) can't erase answers, lessons, notes or badges
  (merges only add), but can push local items out of the capped lists
  (newest 50 mocks, 200 reports and study days) and win last-writer-wins
  choices; only the first sync has an undo. Tombstones and a three-way merge
  are later steps (SCALING.md §5).
- **Sizing:** `docs/mobile/SCALING.md` (≤ 5k accounts on Supabase Pro; the
  owner decides plan and region at Phase 9). A heavy learner's progress
  snapshot measures about 263 KB (`sync-budget.test.ts`).

### Cloud (built OFF) — Uplift Phase 8, the feedback board
A board where learners post ideas, app problems, content concerns and
questions, vote, comment and follow, and the team answers with statuses and
an official response. Built and switched OFF with accounts and sync (same
flag; with it off nothing renders, no network, no timer, and neither of the
board's storage keys is touched: `cloud-off.test.tsx`). Spec: PHASE6_8 §4,
with its 12 Oct addendum: **the board does not feed What's next** (What's
next was removed from the app in 1.17.1; the roadmap is kept for developers,
outside the app). Statuses (Open, Under review, Planned, In progress,
Shipped, Answered, Not planned, Duplicate) stay on posts for their authors
and voters, and shipped ideas get one general thank-you line at the end of
What's new (cloud builds only; no names, no counts).
- **Who reads it is ONE server value**, `board_settings.read_scope` (an
  open owner decision, §10): `signed_in` (the default: every signed-in
  learner reads visible posts), `author_staff` (a learner sees only their
  own posts and the team's replies), or `everyone` (signed-out reading too,
  spec B1). Switching is one SQL line; the RLS policies decide, and the app
  only picks its words from `settings().readScope` (the intro line and the
  signed-out hint). Authors always read their own; staff read everything.
- **Screens** (`app/(cloud)/board/*`): the board (Top · New · Shipped, kind
  chips, search, the vote pill, the published contact and the
  not-affiliated line at the foot), a post (the ⋯ menu, the official
  response, the status history, one level of replies, a folded spoiler for a
  Content post about an answer), the composer, the guidelines gate, Your
  activity (your posts, and in-app notices: no push), Blocked learners, and
  Moderation (staff only). Ways in: You → Help and feedback → Feedback
  board, Settings → Feedback board (Your activity, Blocked learners), and
  the Send feedback sheet's "Post publicly instead ›" for an idea, and the
  app-problem report sheet (never on a question's report), which carry what
  was typed into the composer (a prefill only).
- **The gate can't be skipped.** Signed out, Vote, Comment and Post open the
  sign-in sheet; then the guidelines gate (version-stamped; again when the
  version changes) before the first post, comment or vote. Report and Block
  need only an account (reporting must be readily reachable: fix round P8,
  UX H1). The learner appears as a pseudonym ("Quiet Cedar 214",
  `engine/boardNames.ts`) or a name they type (checked on the phone with
  `engine/moderation.ts checkHandle`, again by the server). The email is
  never shown, and neither is the account id: members are named by a
  separate random public id (`Member.memberId`, `PostCard.authorId`).
- **The session** (`lib/board.ts`): settings, the learner's own member facts
  and staff status load in ONE step for the sign-in state they were loaded
  for, and again when it changes. A board screen opened directly waits for
  that, and for the account store's `known` flag, before it redirects
  anyone (fix round P8, CR B1), so an agreed learner is never sent to the
  gate and the gate never renames them. Sign-out and account deletion
  (awaited account events) forget the session, the draft and the outbox;
  any sign-in starts a fresh session.
- **One set of text rules on both sides.** `engine/moderation.ts`
  (normalising, the block and hold word lists, links, reserved names) and
  `engine/leakGuard.ts` (the exam-content leak guard) are pure and copied to
  `supabase/functions/_shared/` by `mobile/scripts/sync-shared.mjs`; guard
  G8 (`--check`, in both workflows and a Jest test) fails if they differ,
  and a 200-string fixture proves the Deno copy gives the same verdicts.
- **The leak guard.** Near-verbatim text from KaiSip's own questions is
  refused (Post is off in the composer; the server answers `bank_text` and
  writes nothing). Two numbers-only fingerprints of the bundled bank: 5-word
  runs over stem, options, explanations and tips, and 3-word runs over stem
  and options (the spec's single 5-word print caught about 85% of stems
  with 1 word in 8 changed; with the second, about 98%), ignoring runs found
  in 3 or more questions. The server adds a third (fix round P8, SEC S5):
  the stem and options squashed to letters (look-alikes folded, leetspeak
  undone, spaces and dots gone) in 24-letter runs, which catches a paste
  with no spaces, in CamelCase, in leetspeak or with a dot inside each word
  (0% → 100% on the real bank). Measured on the real bank in Jest: every
  stem of 12+ words blocked, at least 95% with 1 word in 8 changed, 0 of 60
  ordinary posts, about 1.2% of study-note sentences (the same with and
  without the squashed check), every invisible format character (the tag
  characters U+E0020–E007F included) and look-alike alphabet folded. Built
  on the phone once, when the composer opens and after its animation (CR
  N9; about 0.25 s in Jest; measure on a mid-range Android before go-live),
  from the questions already in the app; the phone never builds the
  squashed one. Nothing about it is shown, and it never reveals the bank's
  size. A recall score (support §10.3: "on my exam I got…" within one
  sentence, dump offers and offers of "real exam questions", an A–D option
  list (+3 with a question), stem phrasing; −2 only when the post links one
  of our PRACTICE questions and has no option list) of 3 or more holds a
  post for a person. A post that talks about a practice question's answer
  is folded ("Show it"; `talksAboutAnswer`).
- **Report and block are immediate on the phone** (`lib/board.ts`): the item
  or the learner disappears before the network answers. Votes, follows,
  reports, blocks and "mark read" made offline wait in the outbox
  (`aurivan.outbox.v1`, `engine/outbox.ts`: idempotent acts only, coalesced
  per target, 50 at most, 7 days, bound to one account by a hash so another
  learner on the phone never sends them). Every read-change-write of the
  list runs under one lock, and a send changes only the entry it sent, so
  two acts at once are never lost (CR B2); offline stops a send, a server
  problem backs off (30 s doubling, dropped after 8 tries) without holding
  up the rest (N8). Opening the board sends what waits before the first
  feed (QA BUG-6). Posts and comments are never queued: offline, the
  composer keeps one draft (`aurivan.boardDraft.v1`, bound to one account
  like the outbox) with its own `clientId`, so a post whose reply was lost
  is posted once when sent again (QA BUG-1). Other learners' posts are
  kept in memory for the session only.
- **Learners' text is plain Text** everywhere: no link detection, no markdown.
- **No reward for board activity**: posting, voting and reporting never touch
  progress, the plant, badges or streaks (compliance 2.4; tested).
- **Memory backend** (`cloud/memory/board.ts`) plays the server's rules for
  tests and the screenshot build; `memory/seed.ts boardSeed` has 12 posts in
  every status, a held post, reports, an appeal and a staff member.

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
subtopic ids); since mobile 1.25 a note open 10 s is also "started"
(`notesViewed`, beside it; rules in `src/engine/noteReadState.ts`), and the
mark fills an empty ring, a half circle or a full disc. Routes: `notes/index`,
`notes/[domain]`, `notes/subtopic/[id]`.

**Exam-mindset principles.** The same builder reads the shared
`data/mindset/principles.json` (schema `docs/content/PRINCIPLES_SCHEMA.md`, one
file for web and mobile) through `mobile/scripts/principles-pack.cjs` and writes
`src/content/generated/cisa/principles.json` (types and loader:
`src/content/principles/`). Each cert names its own file in `PACKS`, so another
exam can add principles later; a missing file gives an empty pack and the Learn
→ Look it up → Principles row hides. A practice id that is not in the bank (or
sits outside the principle's domains), an unknown family, a broken `slip_map`,
or the word "stem" in any learner-facing text (the app says "question") fails
the build. Routes: `principles/index` (the six families) and `principles/[id]` (Rule,
Why it matters, Spot it in the question, The trap, Worked example, Nuance, then
"Practice this principle" on its `practice_ids`, then "Code <id>" and Report a
problem, a `principle` report carrying only its id and title). The Mistake journal's "Your
pattern" links to the principle that coaches it through `slip_map`. Nothing is
saved: there are no new store fields.

**Exam guide and final review week.** The same builder reads the shared
`data/exam/cisa_exam_guide.json` and `data/exam/final_review_week.json`
(schema `docs/content/EXAM_GUIDE_SCHEMA.md`, one pair of files for web and
mobile) through `mobile/scripts/exam-guide-pack.cjs` and writes
`src/content/generated/cisa/exam.json` (types and loader: `src/content/exam/`).
Each cert names its own two files in `PACKS`; a missing file gives a null half
and its rows hide. A note code or principle id that doesn't exist (task targets,
cheat-sheet points and the cheat sheet's principle list), an unknown action
kind or cheat-sheet part, a non-https source, or the word "stem" in learner text
fails the build; the Jest pack test also checks the guide's domain weights
against `certifications.ts`. Mobile CI runs on `data/exam/**`.
- **About the exam** (`app/exam-guide.tsx`, `?section=<id>` deep link): from
  Learn → Look it up (under Principles) and Help → Get help. One calm "check
  isaca.org before you book" notice with the last-checked date, "On this page"
  jump rows, then each section (summary, domain weights, steps, bullets) with a
  quiet Sources line whose links open in the browser. Nothing is saved.
- **Final review week** is the exam-week feature (mobile 1.16), not a second
  screen: `app/exam-week.tsx` shows the plan when the cert has one and the old
  checklist screen when it doesn't. Same route, Today card, readiness-report
  row and saved record (`moments.examWeek`, store `aurivan.progress.v1`); the
  six checklist ticks stay, under "Before the day". New beside them:
  `examWeek.days` (day ids marked done, same exam date; lenient in backups,
  a union in sync). Today's card window with a plan is 8 days out to the eve
  (`FINAL_WEEK_WINDOW`), 7 to 2 without. Day cards (goal, tasks, remember line,
  "Mark this day done"); task buttons resolve in `engine/finalWeek.ts`
  (`resolveAction`, pure) and route in `lib/finalWeek.ts`: note, principle or
  family (`principles?family=`), practice 10 in a domain (`focus` /
  `next_focus` = readiness focus and next weighted gap; heaviest domains with
  no answers), mini (a third of the exam) or full mock start sheet, Mistake
  journal, notes search. `top_slip` uses the Mistake journal's slip coach; a
  "Didn't know it" top slip opens the note behind most open mistakes, and
  fewer than 5 tagged mistakes opens the principles library. The cheat sheet
  (`app/cheat-sheet.tsx`, `?parts=4,5|focus|…`) has a "Cover the points"
  switch (tap to show each point and focus moves onto it; not saved). The week's tasks are the
  learner's choice, not plan items. Review follow-ups: on the eve Today shows
  only the eve card, with a "Tonight's list" link (`/exam-week?section=eve`),
  so the plan card is on Today from 8 to 2 days out; with a plan the weekly
  mini mock and the Fit card also rest from 8 days out (`PlanInput.finalWeek`,
  `FitAskInput.finalWeek`), so day 7's full rehearsal never follows a mock.

**Your note on a question.** Not a study note: the learner's own words on one
question, written after its answer is checked (never in a live mock; in the
mock review). Kept per exam in the progress store as `qNotes: { [questionId]:
{ text, ts } }`, the same name and shape as the web's `S.qNotes`, capped at
1,000 characters (`QNOTE_MAX`). A deleted note stays as `{ text: '', ts }` (a
tombstone) so sync, when it is switched on, can't bring it back; per question
the newer `ts` wins. Rules: `src/engine/questionNotes.ts`; UI:
`src/components/questionNote.tsx`. Saved → Your notes lists the questions
with a note as a marker only, never the note's text (it could give the answer
away before answering). Backed up and restored (cut to the cap, unknown
question ids dropped; tombstones older than 90 days left out of files); reset
with progress; never in a report email, share card or analytics (guarded by
tests). All notes in one exam are capped at 300,000 characters together
(`NOTES_TOTAL_MAX`), and "Save a backup" refuses to make a file over the 1 MB a
restore accepts. Deleting a saved note always asks first (the Delete button,
or closing the sheet with the field emptied); an emptied field is never
autosaved. The sheet's one privacy line (changed from the design spec's "Only
you see it…"): "Kept on this phone and in backups you save. It shows here each
time you answer this question.", and in builds that can sync, "Kept on this
phone, in backups you save, and in your account if sync is on. …". The shared bottom sheet fits above the keyboard on both
platforms (`padding`, and its tallest size minus the keyboard's height).

The mobile builder renames fields, drops author-only fields (`_provenance`),
validates every answer key, and marks real option-letter references as
`{{B}}` tokens so tips stay correct after shuffling — while words like
"A sample of 25" or "Annex A" are left alone. (The web app replaces every
standalone A–D, which can turn "A high-risk system" into "C high-risk
system" after a shuffle; tracked as a separate fix.)

## 4. Roadmap

| Phase | Scope | Exit gate |
|---|---|---|
| **1 — Store launch (CISA)** · 6–8 wks | ✅ practice, mock, review, readiness, streaks, reminders, offline. ✅ app icon/splash (Kasama logo, `design-notes/brand-kaisip/`) ☐ privacy/terms URLs ☐ EAS builds ☐ Android closed test (12 testers × 14 days for new personal accounts) ☐ TestFlight | Approved in both stores |
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

1. **Trademarks** — app name "KaiSip"; never "CISA"/"CISSP" etc. in the app
   name, icon or developer name. Descriptive use only, with the "not
   affiliated" notice (already in Settings → About and `certifications.ts`).
2. **Original content only** — ship only questions with `_provenance` records.
3. **Privacy** — live privacy-policy URL (`EXPO_PUBLIC_PRIVACY_URL`), Apple
   privacy label + Google Data safety form matching every SDK added.
   Before any store build, set `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`
   and (optionally) `EXPO_PUBLIC_FEEDBACK_EMAIL` in the EAS **production** environment with
   `eas env:create` (public values, never secrets). Don't put them in
   `eas.json`: its `env` values override EAS variables, an empty value hides the
   matching link in Settings, and `eas.json` rejects comment keys like `"//"`.
   (Since mobile 1.7 the support address has a built-in default, so an empty
   `EXPO_PUBLIC_FEEDBACK_EMAIL` never hides "Report a problem" or Help.)
4. **Account deletion** — required the moment accounts exist (Phase 3).
5. **Paywall disclosures** — price, period, renewal terms, Restore, Terms + Privacy links.
6. **No "guaranteed pass"** claims anywhere. Readiness is always worded as an
   estimate ("estimated readiness", "A study estimate, not a prediction of
   your exam result."), never a prediction.
7. **Android backup (decision, 2026-10; updated Phase 6)** — `android.allowBackup` is `true` on
   purpose. The app stores only study progress and settings (no accounts,
   no secrets), and a restore onto a new phone saves learners from starting
   over. Accounts (built OFF, "Cloud (built OFF)" in §3) keep this: the
   sign-in session and the device id live ONLY in the secure key store,
   which is excluded from backups ("this device only"; Phase 9 sets
   `expo-secure-store`'s `configureAndroidBackup`). A restored phone has no
   session, so it is quietly signed out and the account row says "Sign in
   again to keep syncing". AsyncStorage holds only non-secret account facts
   (signed in, a masked email), which are safe in a backup.
   Since mobile 1.3 the learner can also save their own backup file
   (Settings → Your data), which works across iOS and Android. The file goes
   only where the learner sends it, so the store data-safety answers stay
   "no data collected".
8. **Tablets** — `ios.supportsTablet` is `false` for v1 (no iPad layouts or
   iPad screenshots yet).
9. **Over-the-air updates and the cloud flag (Phase 6).** `expo-updates`
   uses the `fingerprint` runtime policy (`mobile/fingerprint.config.js`):
   an update reaches only binaries whose native fingerprint matches. Phase 6
   adds no native module and no config file, so the Android fingerprint is
   unchanged (`5e26d4b961113941199b725cff5ff30a66bf0ac1`) and OTA updates
   keep reaching the APKs learners already have. That also means an
   over-the-air update IS a remote channel for JavaScript until a cloud
   build adds its native modules (secure store, Apple, Google sign-in) at
   Phase 9: today an ON bundle would match an OFF binary's fingerprint. So
   two things keep the flag off on phones: `eas-update.yml` refuses to
   publish if the EAS preview environment (or the job) sets any
   `EXPO_PUBLIC_AURIVAN_*` variable, and the memory backend can't run on a
   phone release build at all (`runtime.on.ts`). From Phase 9 the native
   modules change a cloud build's fingerprint, so an ON bundle can never be
   served to an OFF binary, and an OFF bundle never to an ON one (Apple
   2.5.2); the spec's "`runtimeVersion` with a `-cloud` suffix" rule is not
   needed then either. Check
   before every cloud-related PR: `npx expo-updates fingerprint:generate
   --platform android` must print the same hash while the flag is off.
   Don't touch `mobile/.gitignore` or `mobile/eas.json` casually: both are
   fingerprint inputs.

10. **Rename to KaiSip (mobile 1.23, owner decision 15 Oct 2026).** The app
   was called Aurivan. What changed: the display name (`app.json` `name`), the
   icons and splash (rendered from the Kasama masters in
   `design-notes/brand-kaisip/`), the Android `package` and iOS
   `bundleIdentifier` (`com.aurivan.app` → `com.kaisip.app`), the URL scheme
   (`aurivan` → `kaisip`), every learner-visible word, the backup and account
   file names and their `app` marker. What did NOT change, on purpose, because
   changing it loses data or needs an account step: the AsyncStorage keys
   (`aurivan.*`), the notification ids, the `EXPO_PUBLIC_AURIVAN_*` variables
   and `__AURIVAN_*` globals, and the Expo `slug` (`aurivan`), `owner` and
   EAS `projectId` (a new slug needs a new EAS project, an owner step).
   **Consequences.** (a) The name, icon and package id are native, so the
   Android fingerprint changes: an OTA update cannot deliver 1.23, a new APK
   or store build is required, and the old Aurivan APKs (runtime `5e26d4b…`)
   never receive KaiSip updates. (b) Android treats a new package id as a
   different app: KaiSip installs NEXT TO Aurivan and starts empty, so
   progress moves by backup file (old app: Settings → Your data → Save a
   backup; KaiSip: Restore from a backup, on the welcome screen or in
   Settings). `readBackup` accepts both `app` markers and the welcome screen,
   Settings → Your data, About, What's new and Help all say how
   (`MOVING_LINE` in `content/brand.ts`). (c) The first EAS build of
   `com.kaisip.app` creates new signing credentials. The Android fingerprint
   for 1.23.0 computed in the development sandbox is
   `076db17a21d9685df49fdbf3c3e103000ce3445e` (the 1.22 tree gives
   `f067b2788281514c73427ce40e476f0fad20b4da` there; the `5e26d4b…` value in
   point 9 came from CI, and the absolute hash depends on the machine's
   installed packages, so trust what CI or EAS prints for the real build).
11. **What should we call you? (mobile 1.23).** An optional `displayName`
   in the settings store (`store/settings.ts`; save version stays 1: the
   field is optional, so 1.19 to 1.22 saves load as before, and a name read
   from a save is cleaned again). One rule, `engine/displayName.ts`: trim,
   collapse spaces, 24 characters, no control or bidi characters, no web
   addresses or emails, empty = none. Asked on an optional onboarding step,
   edited in Settings → Your name, used for one thing: Today's greeting. It is
   saved in the learner's own backup file (`engine/backup.ts` reads it
   leniently), and is listed as device-only in `engine/syncMerge.ts`, so it
   never syncs. It must never reach a support email, a share card, the board
   handle, a link or a log: `src/__tests__/display-name.test.ts` has a source
   guard listing the only files that may read it.

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

## 10. Cloud (built OFF): server side

Uplift Phase 6 adds the server half of optional accounts. **Nothing is
deployed and no hosted project exists**: no project ref, URL or key is in
the repo. The client half (flag, backend port, screens) is described in
its own section.

| Piece | Path | Job |
|---|---|---|
| Schema | `supabase/migrations/20261005000000_init_mobile_sync.sql` | `profiles`, `entitlements`, `content_packs` in `public`; the bank size, deletion audit and export rate limit in `private` |
| Sync schema (Phase 7) | `supabase/migrations/20261013000000_sync_snapshots.sql` | `public.sync_snapshots` (one row per store per learner; column grants; a trigger sets `rev` (the write time in ms or one more than the store's last rev, never reused even after a delete) and the time, and reverts owner or store changes; writes need a `profiles` row; settings capped at 96 KB of jsonb text, progress at 2,000,000 bytes); `private.sync_writes` (the 60-writes-per-store-per-hour count and last rev, outside the row, so delete + insert can't reset it: deletes count but are never refused); `private.sync_history` (a daily support checkpoint of the progress row, newest 2, kept while the synced copy exists, cleared by "Delete synced progress") |
| Local config | `supabase/config.toml`, `supabase/templates/` | Auth as it will be set on the dashboard at Phase 9: 6-digit codes valid 10 min, code-only emails, empty redirect list, no anonymous sign-in, confirmed emails only, refresh rotation (10 s reuse), JWT 1 h |
| SQL tests | `supabase/tests/01_hardening.sql`, `10_accounts.sql`, `20_sync.sql` | pgTAP: schema-wide rules every later table inherits, plus own-rows-only, anon denied and cascade-on-delete; sync: cross-learner access (the other learner's state unchanged, not just present), server-owned rev/time/keys, revs never reused after delete + re-insert, stale-rev updates, the rate limit (delete + insert can't reset it; a delete over it still works), both size caps, Terms before inserts and updates, checkpoints, the counter's cascade, no sync table in any publication |
| SQL mutants | `scripts/sync_sql_mutants.py` | 15 one-line breaks of the sync migration; the pgTAP suite must fail on each (`PGTAP_RUN` runs it on a plain Postgres with the shim; the default uses the Supabase CLI) |
| Edge Functions | `supabase/functions/{delete-account,export-my-data}` | Pure `handler.ts` with an injected `AdminPort`; `index.ts` only wires env. `deno test` uses a fake admin client, no network |
| Smoke (Phase 9) | `scripts/cloud_smoke.sh` | curl with two learners' JWTs and the publishable key: every cross-user, anon, private and server-only call must fail |
| Static guard | `scripts/check_rls.sh` | G6–G8: RLS in the same file as every `create table` and never turned off, no always-true policy (create or alter) off the allowlist, `security_invoker` views, no `security definer` outside `private` (an unqualified name counts as `public`), nothing granted to `anon` or `public` off the allowlist |
| CI | `.github/workflows/supabase.yml` | On `supabase/**`: the guard, deno fmt/lint/check/test, then a local Supabase (CLI 2.118.0) with `db reset`, `test db`, `db lint` and the advisors |

**Security model.** RLS is on for every table, public and private. Policies
are per command, `to authenticated`, with `(select auth.uid())`. Supabase's
automatic grants to `anon`/`authenticated` on new public objects are revoked
by default privileges, so each table grants only the columns it needs.
`anon` gets nothing. Schema `private` is not exposed by the Data API.

**How the Edge Functions reach `private`.** Through two `security invoker`
functions in `public` (`svc_claim_export`, `svc_record_deletion`) that only
`service_role` may execute. That keeps G7 (no definer in `public`) and
needs no direct database connection. New server-only writes follow the same
pattern; elevated helpers that policies call go in `private` as
`security definer set search_path = ''`.

**The two functions.** Both verify the JWT with the Auth server first:
`401 unauthorized` for a bad, expired or revoked token; `410 gone` for a
genuine token whose account no longer exists (GoTrue's `user_not_found`);
`500 server` when the Auth server can't be asked (never read as signed out
or deleted). No CORS, no database text in responses, logs carry event names
and counts only, and bodies are read with a byte counter that stops at the
cap.
- `delete-account` also reads `amr` and requires a sign-in in the last 10
  minutes (`401 reauth_required` otherwise; `amr` timestamps checked
  against the Supabase Auth source), then `{ confirm: 'DELETE' }`. Revoking
  Sign in with Apple is best-effort: the iPhone app always re-confirms with
  Apple and sends a fresh `appleAuthorizationCode`, which is revoked at
  Apple; without one (Android, the web) the account is still deleted and
  `apple_revoke_skipped` is logged as a count, and a failed revoke is
  logged too, never blocking. Then `auth.admin.deleteUser`, which cascades
  every row, and an audit row holding a SHA-256 of the id. The app treats
  only `410 gone` as "already deleted" (a retry after a lost reply).
- `export-my-data` returns the caller's own account data, at most once an
  hour, with NO recent sign-in needed: everything in it is already readable
  with the same token (the account, and own rows through RLS), so a re-auth
  would add friction and no protection. Revisit if an export ever holds data
  the token can't read (moderation notes, logs, staff fields). The hourly
  slot is claimed last, after the reply is built. `stores` holds the
  learner's synced snapshots (Phase 7) as backup-file stores, with the two
  device-only fields a backup needs (`onboarded`, today's count), so the
  download is also a backup the app can restore; the envelope's
  `appVersion` is the newest app that wrote one of them (else the asking
  app's), so a store from a newer app restores as "update the app", not as
  damaged. The two support checkpoints are copies of the same progress and
  are not included (the privacy notice says so). Phase 8 added `board`
  (below).

### The feedback board, server side (Phase 8)

| Piece | Path | Job |
|---|---|---|
| Board schema | `supabase/migrations/20261014000000_feedback_board.sql` | `board_settings` (the pause valve, the guidelines version, the read scope), `board_members` (handle, consent, standing, the team mark), `board_posts`, `board_comments`, `board_votes`, `board_follows`, `board_status_events`, `board_notifications`, `ugc_reports`, `member_blocks`, `moderation_appeals` in `public`; `staff`, `moderation_log`, `moderation_terms`, `board_events` (rate-limit counts, 2 days) and the `board_priority` view in `private`; the triggers; the reads `board_feed` and `board_post`; the server entry points `svc_board_member`, `svc_board_join`, `svc_board_write`, `svc_moderation_terms`, `svc_is_staff`, `svc_staff_act` (→ `private.staff_act`), `svc_staff_queue`, `svc_staff_digest`, `svc_board_export`, `svc_board_counts` |
| Board tests | `supabase/tests/30_board.sql`, `31_board_review.sql` | 166 + 83 pgTAP checks. `31_board_review.sql` is the fix round's: names checked only when set or changed, no direct name writes, look-alikes and ISACA marks, staff rename; no account ids for readers; a blocked learner can't reply to or notify the blocker; reported words kept for staff; trusted reporters and reviewed posts; member reports and dismiss by target; deletion closes reports; the team's name in `author_staff`; own withdrawn and removed comments; withdrawn stays withdrawn; folding; one post per draft; write attempts counted; one official response after a merge. `30_board.sql`: anon and A/B/staff in each read scope; column grants; withdraw-only (and the other learner's post, comment, vote and notice unchanged after A's attempts); votes (exactly ±1, 100 changes a day, a take-back counts and is never refused); reports (exam content hides at once, 3 reporters 7+ days old, a young reporter doesn't count, rate limits, unseen targets refused); blocks; handles; appeals; private tables and functions; board-submit's writer (holds, pause, guidelines, banned, post and comment limits, one level of replies); staff actions and their log; cascade on account delete; no board table in any publication |
| Board security tests | `supabase/tests/33_board_security.sql` | The 21 Oct 2026 security audit: the moderator / admin split (M2), `board_feed`'s cert id check and 100-character search cut (L2), and no comment edits on a locked or hidden post (L5) |
| Board mutants | `scripts/board_sql_mutants.py` | 68 one-change breaks of the board migration (22 added in the fix round, 6 by the security audit); the suite must fail on each (same `PGTAP_RUN` as the sync mutants) |
| Board functions | `supabase/functions/{board-submit,staff-action,staff-digest}` | Pure handlers on a `BoardDbPort` (`_shared/board.ts`; real adapter `_shared/supabaseBoard.ts`, which maps the SQL's own words to codes and never passes a database message on); `deno test` with `FakeBoardDb` |
| Leak print | `scripts/build-leakprint.mjs` → `supabase/functions/board-submit/leakprint.json` | Built at DEPLOY time from the bundled pack, with the squashed-letters fingerprint (gitignored, numbers only); `board-submit` refuses every post without it, or with a file from before the fix round. Shipped as a static file (`config.toml`). Rebuild it on every content release |

**The read scope (open owner decision, Phase 9).** Whether board posts are
visible to every signed-in learner, or only to their author and the team,
is undecided. It is built as ONE value, `public.board_settings.read_scope`:
- `signed_in` (default, per spec): signed-in learners read visible posts;
- `author_staff`: a learner reads only their own posts (and the team's
  replies on them); the app's intro says "Only you and the team see your
  posts";
- `everyone`: signed-out readers too (spec B1 and decision #6).
Switch it with one statement, no deploy:
`update public.board_settings set read_scope = 'author_staff';`. The anon
and authenticated read policies on posts, comments, members and the status
history all read it; `30_board.sql` tests all three; the app reads it from
`settings()` and only changes its words. Signed-out reading (decision #6)
is the same switch.

**The security model, in short.**
- Posts and comments are written only by `board-submit` (service role,
  through `svc_board_write`) after the filters and the leak guard, with the
  author taken from the verified JWT (a user id in the body is ignored).
  Learners can only withdraw their own (`posts_guard` and
  `comments_guard_upd`: only `visibility` → `withdrawn` from pending or
  visible; updates made one trigger level deeper, such as a vote's count,
  pass).
- Votes, follows, reports, blocks, appeals and read marks are written
  directly under RLS, own rows only, and need a `profiles` row (Terms) and,
  for votes, a member in good standing. The member row (the public name) is
  written only by `board-submit`'s `join` (`svc_board_join`, after the
  app's full name check; one change a day) and by staff `rename`: learners
  have no insert or update grant on it (fix round P8, SEC B1 / CR N3). Name
  checks run only when a name is set or changed, so a word added to a list
  later never blocks a ban, an approval or a same-name re-accept (CR B4).
- Nobody reads another learner's account id (SEC S4): `board_members.
  public_id` is a separate random id, posts and comments carry it as
  `author_member` (set by a trigger), blocks and member reports use it, and
  app roles can't select `user_id`, `author_id` or a member's join date (an
  RLS policy needs no column grant).
- Reports (SEC S1, S3): one "real exam content" report hides an item at
  once only from a trusted reporter (good standing, account a day old, an
  approved post) and only before a person reviewed it (`reviewed_at`, set
  by approve and restore, cleared by an edit); otherwise three trusted
  reporters with accounts 7+ days old hide it. Every report keeps a
  staff-only copy of the reported words (`ugc_reports.snapshot`), which the
  queue shows; deleting the item closes its reports and drops the copy and
  note. A blocked learner can't reply to the blocker's comments, and the
  blocker gets no notice from them (S2).
- Rate limits are counted in `private.board_events`, one row per act
  (deletes too), under a per-user advisory lock, so delete + re-add can't
  reset them and two acts at once can't both slip under.
- Staff come only from `private.staff`. `staff-action` checks it with the
  service role, and `private.staff_act` checks the actor again; every action
  is logged with actor and reason (never the learner's text).
- Two staff roles (security audit M2, 21 Oct 2026). A `moderator` has the
  everyday tools (approve, hide, remove, lock, status, warn, limit,
  suspend, lift a suspension, rename a learner, dismiss, appeals). Only an
  `admin` may pause or reopen the board, ban, lift a ban (directly or by
  restoring a banned member's appeal), or take any member action against a
  staff account; `private.staff_act` refuses the rest with `forbidden`. And
  every staff call except `whoami` needs an MFA session (TOTP, JWT `aal` =
  `aal2`); see `docs/mobile/SECURITY_GATES.md`.
- App roles have **no usage on schema `private`** (hardening test 13 still
  holds): a policy calls a helper by its stored id, which needs only
  EXECUTE. Exactly two helpers are executable by `authenticated`
  (`private.is_staff`, `private.is_active_member`) and none by `anon`; every
  other private function, `private.is_blocked_by` included, is revoked from
  PUBLIC (addendum). Inside a definer trigger, `private.app_role()` reads
  the session's role setting to tell a learner's statement from the service
  role's.
- The reads `board_feed` / `board_post` are `security invoker` plpgsql: RLS
  applies, and the signed-out branch never touches tables anon can't read.
- Allowlists (`01_hardening.sql`, `check_rls.sh`): `board_settings_read`
  (always true: the pause valve, guidelines version and read scope are
  needed before sign-in), anon column reads of the five public-read board
  tables, and execute on the two reads.

**The three functions.**
- `board-submit` `{ op: me | join | post | edit_post | comment | edit_comment }`:
  after the standing check, every write attempt is counted
  (`svc_board_attempt`, 30 an hour and 200 a day, before any filter, so a
  refused text isn't free: SEC S6); normalise, `moderateText` (block → 422
  `rejected_words` `words`; a new member's web address of any ending, a
  shortener or a dump site → `links`; threats, self-harm, contact details,
  "ISACA official" claims and dump offers → hold), `leakMatch` (→ 422
  `bank_text`, nothing written), `recallScore` ≥ 3 → hold `recall`,
  `talksAboutAnswer` → the post is folded, then `svc_board_write`
  (standing → 403 `banned`, consent → 409 `invalid` `guidelines`, pause →
  409 `posting_paused`, 3 posts an hour and 5 a day (1 for an account under
  a day old), 20 comments an hour and 30 a day (5), 30 edits a day → 429
  with Retry-After). A new member's posts wait until one is approved.
  Rejected text is never stored or logged. **Contract (fix round P8):** a
  post carries the draft's `clientId` (a uuid); the same author sending the
  same `clientId` again gets the FIRST post back, unchanged and not counted
  as a post again (QA BUG-1; `BoardPort.submitPost`, `Draft.clientId`).
  `{ op: 'me' }` returns `memberId` (the public id), never the account id.
- `staff-action` `{ action, targetKind, targetId, reason, extra }` or
  `{ action: 'queue', tab }` or `{ action: 'whoami' }`: fixed lists of
  actions per target, rebuilt extras, 403 for anyone not in `private.staff`,
  and 401 `reauth_required` with detail `mfa_required` for staff whose
  session has not passed a second factor (`aal2`; `whoami` stays open so
  the app can ask them to verify first).
  Fix round P8: member `rename` (a neutral pseudonym, logged; the target is
  the member's public id), post `spoiler {on}`, report `dismiss {kind}`
  (every open report on the queue's target), and approve, restore and hide
  refuse an item its author withdrew.
- `staff-digest`: called by pg_cron with `STAFF_DIGEST_SECRET` (not a user
  token); counts of held, reported and appealed items older than 12 hours
  and the queue link, never learner text or handles; a no-op until the
  email provider is chosen.
- `export-my-data` gains `board` (the learner's own member row, posts,
  comments, votes, follows, reports made, blocks, appeals, notices), and
  `delete-account`'s audit row counts real board posts and comments.

**Run it locally** (needs Docker): `supabase start`, `supabase db reset`,
`supabase test db`, `supabase db lint`; functions:
`deno test --no-lock supabase/functions`.

**Rules for Phases 7 and 8.**
- Migrations are append-only from the first `supabase db push`.
- Every new user table cascades from `auth.users`.
- Every new function revokes `execute` from `public, anon, authenticated`
  explicitly: PUBLIC's execute is a global default that per-schema default
  privileges cannot remove. `01_hardening.sql` fails otherwise. (Done in
  Phase 8 for every board function, the policy helpers included.)
- Exceptions go on the allowlists in `01_hardening.sql` and
  `scripts/check_rls.sh`, never by weakening a check.
- `AdminPort.countBoardRows` reads `svc_board_counts` and `readBoard`
  reads `svc_board_export` (Phase 8). `readSnapshots` reads
  `sync_snapshots` (Phase 7).

**At Phase 9 (owner go-ahead).** Mirror the `[auth]` settings on the
dashboard; set the email-send limit to the SMTP quota; turn on Apple and
Google with real client IDs; set Function secrets `APPLE_TEAM_ID`,
`APPLE_KEY_ID`, `APPLE_CLIENT_ID` (the bundle id) and `APPLE_PRIVATE_KEY`
(the `.p8`); run `supabase db push`, then the Security Advisor and the
penetration-style smoke `scripts/cloud_smoke.sh` (two test learners'
JWTs against every table, private table, RPC and function; keep the output
as evidence).

**Phase 9 checklist (from the Phase 6 security and code reviews; not done in
Phase 6 on purpose).**
- Apple revocation from any platform: at Apple sign-in, keep Apple's refresh
  token server-side (schema `private`, service role only), so delete-account
  can revoke it without a fresh code (today Android and web deletions skip
  the revoke and log `apple_revoke_skipped`). Bind a revoke code to the
  user: decode the `id_token` from `/auth/token` and require its `sub` to
  equal the user's Apple identity before revoking.
- Delete order: `deleteUser` first, then the audit row, then storage files
  (retried, logged), then the Apple revoke (best-effort), so a failed
  `deleteUser` never follows a partial clean-up.
- Wrong-code limits on the server: GoTrue has no per-code try counter (the
  app's 5 tries are UX only). Turn on captcha (`CaptchaPort`) or 8-digit
  codes, keep `token_verifications` low, and alert on verify-failure spikes.
  Captcha also guards the email-send quota against sign-in spam.
- Password sign-in off at the provider (a "password verification" Auth hook
  that rejects every attempt), so a stolen fresh session can't add a
  password as a second credential.
- The deletion audit hash as an HMAC with a server pepper (a Function
  secret), so it can't be joined with the phone's `syncedAccountHash`.
- Declare the install id in the store privacy answers (Apple "Device ID",
  Play "Device or other IDs"; drafted in STORE_LISTING.md §7). Done in
  Phase 7: a new id when a different account signs in, and on account
  deletion.
- PR 8 write policies require a `profiles` row (Terms accepted), not only a
  session. Done for `sync_snapshots` in Phase 7 and for the board's report
  and block inserts and `svc_board_join` (the only way to join) in Phase 8.
- The Phase 9 adapter: `reauthenticate` is a NEW sign-in (it adds an `amr`
  entry; `supabase.auth.reauthenticate()` does not); `thisDeviceOnly` maps
  to `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`; `expo-secure-store` with
  `configureAndroidBackup: true` (`allowBackup` is on); a local sign-out
  calls the session store's `removeItem` itself on any error; supabase-js
  `auth.lock: processLock`, `flowType: 'pkce'`, `detectSessionInUrl: false`;
  `CloudError.detail` from an allowlist only.
- `verify_jwt = false` if the new asymmetric signing keys make the gateway
  refuse valid tokens (the in-function `getUser` is the real check).
- Ask `app-store-compliance-reviewer` whether the bundled but unreachable
  `(cloud)` screens in an OFF build raise Apple 2.3.1 ("hidden features").
- Privacy policy: the install id and the backend's request logs are in the
  draft (Phase 7); fill in Supabase's log retention period.
- Sync (Phase 7, security review N1): the Supabase `SyncPort` adapter
  - selects only store, rev, app_version, store_version, device_id and
    updated_at for a head, and returns `updatedAt` as epoch ms (the app
    compares rev AND write time);
  - writes `update … where rev = $expected` with `.select('rev, updated_at, …')`
    and treats an empty result (PostgREST answers 200 with no rows) as
    `conflict`; an insert hitting the primary key (`23505`, two phones' first
    push) is `conflict` too;
  - maps `P0001 rate_limited` to `rate_limited` with Retry-After 3600 s
    (Postgres sends none), `42501` to `invalid` (no profile), and `23514` to
    `too_big` when the state is over the size checks, else `invalid`;
  - never puts `error.message` in `CloudError.detail` (allowlist only);
  - never adds `sync_snapshots` or a private table to the
    `supabase_realtime` publication (`20_sync.sql` checks it);
  - aborts every `SyncPort` call after 20 s or less (AbortController), so a
    hung request never holds a sync cycle open. Actions such as sign-out,
    Remove my progress, Undo and account deletion wait at most 15 s for a
    running cycle and then go ahead; a stopped cycle records nothing after
    its push (`lib/sync.ts` `EXCLUSIVE_WAIT_MS`, `lib/syncCore.ts`).
- Sync: a snapshot whose `app_version` claims an app more than one major
  ahead pauses as unreadable on every device (not "update the app"), and
  the Delete synced progress row stays reachable while paused, so a bad
  write can always be cleared. Re-measure SCALING.md's figures against live
  pricing, and add a DB-size alert at 60% next to the egress alert (with
  captcha on sign-up, the main guard against parked data).
- The feedback board (Phase 8):
  - **owner decisions:** the read scope (above; default signed-in
    learners), signed-out reading (#6, the same switch), the moderator
    cover and the 24-hour duty in writing (PLAYBOOK §7), the email provider
    (the digest), captcha, a DMCA agent, and the age rating (13+, 16+ in
    Australia) with the UGC answers (STORE_LISTING §7);
  - **the 24-hour promise stays only with written cover** (compliance
    review P8, item 6): if the owner doesn't confirm the named moderator
    and 7-day cover in writing, change "We review reports within 24 hours"
    to "We aim to review reports within 24 hours" everywhere it appears
    (`content/cloud/copy.ts` `board.gate.review`, `board.report.done`,
    `board.report.done.member`; `community.html`; `terms.html` 7E, with
    "we aim to act on takedown requests within 24 hours");
  - build `leakprint.json` at deploy (`node scripts/build-leakprint.mjs`
    after `npm run content`) and deploy `board-submit` with it as a static
    file; check the composer's first leak check on a mid-range Android
    (Jest builds the fingerprint in about 0.25 s);
  - set Function secrets `STAFF_DIGEST_SECRET` and `SUPPORT_EMAIL`; schedule
    pg_cron: `staff-digest` daily at 08:45 local and every 6 hours while
    anything waits over 12 hours, the `moderation_log` purge (12 months),
    and the removed-body purge (30 days);
  - add the first staff row (`insert into private.staff …`) and seed
    `private.moderation_terms` (the full block and hold lists, plain words;
    the app ships only a short mild list);
  - the Supabase `BoardPort` adapter: `feed` → `board_feed` with keyset
    paging (`sort_key`, `id`), `post` → `board_post` (null → `not_found`),
    `myPosts` → `board_posts` own rows, votes / follows / reports / blocks /
    appeals / read marks → direct RLS writes where a duplicate (`23505`) is
    success, `me` / `join` / writes → `board-submit`, staff → `staff-action`
    (the queue's JSON mapped to `QueueItem`); `P0001` words and `42501`
    mapped like `_shared/supabaseBoard.ts boardDbCode`; never
    `error.message`;
  - publish `community.html` with the other drafts and link it from
    `support.html` (draft section at the end of `community.html`), and
    re-run `app-store-compliance-reviewer` (Apple 1.2: filter, report,
    block, published contact, zero-tolerance terms) and
    `isaca-language-reviewer` (the guidelines wording) first;
  - **from the P8 security review (recorded, not built in Phase 8):**
    - votes, follows, reports and blocks don't yet need the CURRENT
      guidelines version (SEC N1): add
      `and m.guidelines_version = (select s.guidelines_version from public.board_settings s)`
      to `private.is_active_member()` when the owner wants re-acceptance to
      gate voting too;
    - restore vs withdrawn: done (approve, restore and hide refuse a
      withdrawn item; `31_board_review.sql`), keep it when adding actions;
    - reports after a deletion: open reports are closed and their copies
      and notes dropped (done); add closed reports, and reports about a
      deleted member, to the retention purge;
    - retention jobs, as ONE `private.board_purge()` (revoked from app
      roles, pgTAP-tested) on pg_cron: removed bodies after 30 days (the
      privacy draft promises it), withdrawn post and comment text after N
      days (and tell learners what Withdraw keeps), `moderation_log` after
      12 months, report copies (`snapshot`) and notes once handled plus 90
      days, and `board_events` older than 2 days for idle learners;
    - **rebuild `leakprint.json` on EVERY content release** and redeploy
      `board-submit` with it (a new or edited question isn't guarded
      until then: SEC N9); have CI compare the leakprint's build hash with
      the content pack's;
    - `author_staff` scope: `svc_board_write` lets a learner comment on a
      post they can't read (random ids, Low: SEC N2); refuse it if that
      scope is chosen;
    - hides by reports send no notice (SEC N7, DSA Art. 17): notify on the
      staff decision (done for removals) and say a hide is temporary, or
      add a `hidden` notice kind;
    - optionally log staff queue views (SEC N12), and add notice fan-out
      to SCALING.md (N14: one notice per follower per comment);
    - the adapter: map `23505` on votes, follows, reports and blocks to
      success; `Prefer: return=minimal` for votes; authors are public ids
      (`author_member`, `authorId`); never `error.message` (SEC N10);
    - optionally rotate a member's public id on a name change (SEC S4);
      blocks and reports point at it, so they would need moving too.

## 11. Security: go-live gates

The 21 Oct 2026 security audit (OWASP MASVS v2) found nothing Critical or
High. Today's release, with accounts built OFF, is a go. The gates that must
close first, with plain owner steps, are in
**[`SECURITY_GATES.md`](SECURITY_GATES.md)**:

| Gate | Before | Status |
|---|---|---|
| 1. Signed phone updates (EAS Update code signing; private key off CI; one native build) | first store / `production` build, and Phase 9 | store builds: met by switching updates off (owner decision 22 Oct 2026, done in mobile 1.40.1). Signing itself: open for test builds and Phase 9 (interim: no install scripts in the publishing job) |
| 2. Staff MFA (`aal2`) and the admin / moderator split | Phase 9 | done in code; owner enables TOTP and enrols staff |
| 3. Turnstile captcha + custom SMTP | Phase 9 | open (owner accounts) |
| 4. Own key for the backup-route test APK, or retire it | its next run | open (owner decision) |
| 5. GraphQL off on the hosted project | Phase 9 | open (one switch) |
| 6. Supabase adapter guardrails (no string-built filters, webhook, secure-store backup) | Phase 9 | engineer checklist |

Fixed in code by the audit: outside links can't pre-fill a board post (L1),
the board search is bounded (L2), and no comment edits on a locked or hidden
post (L5).

**Google Play builds have over-the-air updates off (owner decision, 22 Oct
2026; mobile 1.40.1).** Phone updates are not signed yet, and signing needs a
paid Expo plan. So `mobile/app.config.js` builds the EAS `production` profile
with `updates.enabled: false`: a Play install only runs the code in its Play
release and never contacts Expo, and learners get changes through Play
releases. Preview and development builds are built from `app.json` unchanged
and keep their updates. `scripts/check-release-config.mjs` fails CI if a store
profile would resolve to updates on before a code-signing certificate exists,
and the same `app.config.js` stops a production build that sets the cloud
flag without the owner's go-live acknowledgement. Settings hides "Check for
updates" wherever updates are off. Details: `docs/mobile/PLAY_LAUNCH.md` (B1,
section c) and `SECURITY_GATES.md` Gate 1.
