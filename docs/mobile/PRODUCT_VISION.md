# Aurivan — Product Vision

**The trusted companion from "I booked my exam" to "I passed."**
Status: direction agreed 2026-10-06 · Built from four specialist reports
(market research, UI/UX design, product management, learning science).

---

## 1. Why learners will choose — and keep — Aurivan

What the market gets wrong (competitive scan, Oct 2026):

| Gap in today's exam-prep apps | Aurivan's answer |
|---|---|
| **Wrong answer keys** — the #1 complaint across third-party banks; nobody shows errors being fixed | A **Trust card** on every question (source, last reviewed, Report issue) and a public "fixed" changelog |
| **Only the right answer is explained** | Every option explained, plus a named **trap** — already in our content |
| **Nobody teaches *how the examiner thinks*** | Mindset-first: role lens, priority words (FIRST/BEST/MOST), governance-before-technology — in tips, games and lessons |
| **Polished-but-shallow or deep-but-dated** | Depth of a serious bank with the calm polish of Brilliant/Headspace |
| **Monthly subscriptions punish slow learners; surprise renewals** | "Until you pass" journey pricing with clear renewal reminders |
| **Guilt-driven streaks, leaderboards, ads** | Private progress, a free weekly rest day, no ads, no guilt copy |

**North star:** learners pass. **Trust is the product.**

---

## 2. The Exam Journey

Every screen knows where the learner is. Home always shows **one next best step**.

| Stage | Goal | What the app does | Moves on when… |
|---|---|---|---|
| **Commit** | Set the target | Pick exam, date, minutes/day → the route map draws itself | Date set (or "not yet") |
| **Diagnose** | Find the gaps | 20-question weighted mini-mock | Diagnostic done |
| **Learn** | Understand | Motion lessons per topic, each ending in a 3-question check | Weak domains covered |
| **Practice** | Make it stick | Practice, spaced review, games, mistake journal | Each domain ≥ 70% |
| **Mock** | Rehearse | Full timed mocks | All domains ≥ 65% + 2 mocks |
| **Ready** | Honest go/no-go | Readiness range + remaining gaps | Readiness ≥ 80% for 7 days → **Exam-ready moment** |
| **Exam day** | Calm & prepared | T-7 checklist, light review, pacing coach | Exam date passes |
| **Passed / Retry** | Close the loop | Celebration + share card, or a kind retry plan | Outcome reported |
| **Recertify / Next** | Keep growing | CPE tracker, next certification on the same map | Next goal set |

---

## 3. Information architecture

Five tabs: **Journey · Learn · Practice · Play · You.**
Lessons, sessions and games open full-screen (tab bar hidden).

- **Journey** — countdown, today's plan, readiness ring, domain route, resume.
- **Learn** — domain → topic → motion lesson.
- **Practice** — quick 10, weak areas, spaced review, saved, mock exams.
- **Play** — game hub (2-minute games).
- **You** — progress, study tools (mistake journal, planner, mindset cards…), settings.

---

## 4. Learn — motion lessons

**Format: in-app animated lessons built from data** (not pre-rendered video
first). Each lesson is 6–10 *scenes* — title, analogy, diagram build-up,
trap, exam tip, quick check — rendered with reusable animated templates.

Why this beats MP4 for a solo founder at many-certification scale:
- Fix an outdated fact by editing one line, shipped instantly — no re-render.
- Kilobytes, not megabytes → works offline, tiny downloads per cert.
- Real text → screen readers, captions and large text work automatically.
- Add MP4 "domain intro" videos later where storytelling adds value.

**Content rule:** lessons are **original Aurivan writing**. The existing
`data/cisa_notes.json` cites a commercial review manual as its source, so it
is used only as a *topic map*, never copied. Every lesson records its
provenance, framework references and a `lastReviewed` date.

---

## 5. Play — games that build real exam skill

Built on existing question data → every new certification gets them free.
Professional tone: no mascots, no confetti per answer.

| Game | Skill trained | Status |
|---|---|---|
| **Trap Spotter** — find the answer built to fool you | Beating distractors | Build first |
| **Calibrated Sprint** — stake your confidence | Calibration (fixing over-confidence) | Build first |
| **Priority Lens** — FIRST vs BEST vs MOST | Reading the question like an examiner | Build first |
| Who Acts? — auditor, management or board | Role lens | Next |
| Term Duel, Root-Cause Ladder, Pre-Read Scanner, Mixed Shift, Concept Chain | Retrieval, root cause, interleaving | Later |

> Calibrated Sprint is the one place the learner rates confidence *before* answering (they stake 1–3 points first). That reversal is deliberate: it is what the game measures.

---

## 6. Tools

Build first: **Adaptive Planner** (from exam date × weak domains × reviews due),
**Mistake Journal** (every miss filed with *why*, tagged by thinking slip),
**Readiness Check-in**. Later: Teach-back, Cheat sheet, Focus timer, Mindset
cards, Concept map, Exam-day pacing coach, Glossary with audio.

---

## 7. Design language

1. **One next step** per screen. 2. **The journey is the interface.**
3. **Calm pace, sharp thinking.** 4. **Reward understanding, never punish absence.**
5. **Built for every certification.**

- "Forest" design system (`docs/mobile/DESIGN_SYSTEM.md`, tokens in
  `mobile/src/theme/tokens.ts`): Plus Jakarta Sans only, tabular figures for
  numbers, Lucide icons (stroke 1.75).
- Cards: 16px radius, 1px border, no shadows in dark mode; one accent-filled
  element per screen.
- Motion: 180ms base / 320ms transitions, ease-out; springs only for
  celebrations; Reduce Motion respected.
- Lesson art: flat geometric systems (doors, ledgers, pipelines, shields) in
  the Forest palette — not cartoon people.

**Signature moments:** the route map drawing itself after onboarding ·
checkpoint clears tinting a domain teal · the Trap → Mindset → Exam-day
reveal · the Exam-ready moment · results day.

**Never:** guilt notifications, hearts/lives, leaderboards by default,
confetti per answer, paywall before the first question, autoplay video,
neon gradients, advertising the bank size.

---

## 8. Trust system

1. **Provenance** on every question and lesson; "Original content — not affiliated with ISACA/ISC2".
2. **Last reviewed** date + exam-outline version on each topic.
3. **Report issue** on every item → triage ≤ 72h, fix ≤ 7 days, public changelog, "fixed — thanks" note.
4. **Expert-review badge** only when a named, credentialed reviewer actually signed off.
5. **Honest readiness**: a range, a "not enough data yet" state, no pass guarantees.

---

## 9. Healthy retention rules

Reward mastery (box promotions, domain bands rising), calibration accuracy,
retrieval after a gap, fixing logged mistakes. XP = correct retrievals ×
difficulty × spacing — never minutes or taps. One free **rest day per week**
keeps a streak alive. Max one reminder a day at a time the learner picks.
After the exam, the app graduates the learner instead of nagging.

---

## 10. Build order

1. **Experience v1 (this milestone):** new tabs, Journey home + daily plan,
   Learn with first original motion lessons, Play with 3 games, Mistake
   Journal, Trust card + Report issue, rest-day streak.
2. Diagnose + Adaptive Planner + Readiness Check-in.
3. Store launch (icons, privacy, EAS, closed test).
4. Monetise + measure (RevenueCat, Sentry, PostHog).
5. All CISA topics as motion lessons; more games.
6. Downloadable content packs + accounts + second certification.

Open decisions for the founder: journey pricing (price points), final tab
naming, and the IP review of all derived notes before launch.
