# Aurivan monetization plan

How Aurivan goes from a free app to a sustainable one without breaking the
trust the free launch was built on. This is a strategy document, not a
spec. It is internal: nothing here is user-facing copy.

## The decision

- **Now, through the custom-domain launch:** stay 100% free. Donations
  (Ko-fi) are the only monetization. This is already live.
- **At the custom-domain launch, once there is real traction:** introduce
  a **Pro unlock**, one payment for one year of access. Not a recurring
  subscription.
- Phase 2, only if Pro proves itself: accounts with cross-device sync,
  and B2B team licenses.

## The constraint that shapes everything

Aurivan is a single static `index.html` plus JSON files. No backend, no
accounts, progress saved in the browser's `localStorage`.

That has one hard consequence: **static content cannot be truly hidden
from the browser.** The question bank ships as `data/domain*.json` and
all of the JavaScript is visible via view-source. So any paywall is
either:

- a soft UI gate that a determined user can bypass, or
- a real gate that needs the protected content encrypted and a key
  delivered only to paying users.

Every choice below is made with that reality in mind.

## Phase 0: donations (now)

Keep the app fully free. Ko-fi is the only monetization. No architecture
change, and the marketing copy ("no signup, no ads, no paywall") stays
honest.

Use this phase to gather signal. Before designing the free vs Pro split,
it helps to know which features learners actually use: mock-exam
completions, spaced-repetition queue usage, study-topic views. GA4 is
already wired and consent-gated, so a few extra events would make the
Phase 1 split evidence-based rather than guessed. This is an optional,
small follow-up, not a blocker.

**Decision gate before Phase 1:** do not build a paywall against a
near-zero audience. Launch Pro only once there is sustained weekly
active usage and qualitative "this is worth paying for" feedback.

## Phase 1: Pro unlock, one payment for one year

### Why a one-year pass and not a subscription

Candidates study for CISA for roughly two to four months, pass, and move
on. A monthly subscription against that lifecycle either churns almost
immediately (little revenue) or quietly keeps billing people after their
exam (predatory, and it would destroy the brand). A single payment for a
year of access fits the study lifecycle, needs no churn management, and
reinforces Aurivan's core position as the affordable alternative to
ISACA's costly official materials.

### Free vs Pro split

Pro is **additive**. The free tier never loses anything today's users
already have. That protects the brand and keeps the launch marketing
honest. Free must stay genuinely useful as a study tool on its own.

| Free (honors the launch promise) | Pro (one year) |
|---|---|
| All illustrated study topics | Full 1,000+ question bank |
| A real sample (~150 to 200 questions, all 5 domains) | Unlimited and timed mock exams |
| One full mock exam | Spaced-repetition review queue |
| Explanations, tips, local progress tracking | Exam-readiness score and weak-domain analytics |

### Pricing

Around $19 to $29 for the year, with an early-bird price near $12 to $15
for the first adopters. The framing writes itself: ISACA's official
question database costs $300 or more for a year of access; Aurivan Pro
is a fraction of that for the same window.

### No accounts needed

The license key is the credential. A learner buys Pro, receives a key,
and pastes it into the app. This preserves the "no signup" promise that
sets Aurivan apart. In v1, moving to a new device means re-entering the
key; "sync" is a manual export and import of a progress file. True cloud
sync is a Phase 2 item because it genuinely needs a backend.

### The gate: technical architecture

**Payment.** Use Lemon Squeezy as the merchant of record. It handles
global VAT and sales tax (so the maintainer never deals with tax
filing), and it issues and validates license keys through an API.
Gumroad is a simpler fallback. On purchase, the buyer receives a license
key valid for one year.

**Protecting Pro content.** Two options:

- **Option A, soft gate (lightest).** Ship the full bank, gate the Pro
  questions and features in the UI, and validate the license with a
  plain `fetch` to Lemon Squeezy's API. No backend of our own. Near-zero
  infrastructure, but the Pro questions still sit in readable static
  JSON, so the gate is bypassable by anyone who looks.

- **Option B, real gate (recommended).** Split the bank: free questions
  stay in public JSON, Pro questions ship encrypted at rest. One tiny
  serverless function (a Cloudflare Worker or Netlify Function, free
  tier) validates the license with Lemon Squeezy server-side and returns
  the decryption key only for a valid license. The static app then
  decrypts the Pro bank in the browser. That function is roughly thirty
  lines of code and external to the app, so the app itself stays a
  static file.

**Recommendation: Option B.** A fully bypassable paywall earns nothing
the moment one person posts the bypass. The tiny serverless function is
the minimum honest gate, and because it lives outside the app's load
path it does not compromise the static-app model.

### Brand and marketing updates at launch

- Revisit `marketing/reddit-posts.md` and any "no paywall" copy. The new
  message: the free tier stays genuinely free and complete enough to
  study with, and Pro is extra value rather than a wall around the
  basics.
- **Grandfather every current free user.** Anyone using Aurivan free
  before Pro launches keeps their access.

## Phase 2: only if Pro proves itself

- Accounts with true cross-device cloud sync. This needs a real backend
  (for example Supabase) and is worth building only once Pro has paying
  users asking for it.
- **B2B and team licenses** for bootcamps and corporate learning teams.
  These buyers have real budgets and there are far fewer of them to
  support, with much less need to gate individual learners. This is
  likely the larger revenue lever, and worth exploring before chasing
  scale on individual unlocks.

## Revenue realism

Freemium conversion for a free study tool is typically 1 to 5 percent.
At roughly $20 a year, a few thousand annual users is modest revenue.
The donation plus one-year-pass hybrid is deliberately low-risk and
low-effort. If meaningful revenue becomes the goal, B2B is the lever to
pull, not a higher consumer price.
