# Web gate plan: free sample, sign-in, paid unlock

**Written:** 4 Nov 2026, from a seven-expert design panel (product, backend,
frontend, compliance, security, growth, behaviour) and a reconciler.
**Audience:** the owner and every Claude Code session working on accounts,
the web app or Premium.

## The goal (owner, 4 Nov 2026)

Anyone who opens kaisip.com must not get the full certification content.
They can use it as a guest or with a free account. When they have used the
free content, they are asked to sign up and buy, and buying happens through
Google Play, because the Android app launches first.

## Owner decisions (4 Nov 2026)

1. **The website stops publishing the full bank now** and serves only a free
   sample (Phase 1 below). A sign-in screen alone protects nothing while the
   question files are public.
2. **Free tier, the same for guests and free accounts:**
   - a fixed sample of questions from every domain, with at least one
     question for every study-notes topic;
   - all study notes, the glossary, lessons, the exam guide, the final review
     week and the principles;
   - spaced review of anything already answered, free forever;
   - the Mini mock. The Full mock is part of the full course.
3. **How big the free sample is:** **CISA 20%** of each domain (the launch
   course, generous on purpose to reach more people). **Every later
   certification (CRISC, AAIA, CC, CSOE and others): 10%.** Set in
   `FREE_SHARE` / `DEFAULT_SHARE` in `scripts/build_free_sample.py`.
4. **Paying happens only inside the Android app** (Google Play Billing via
   RevenueCat). The same account then unlocks the website too. No web
   checkout at launch; revisit only if many iPhone or desktop-only people ask.

Also decided earlier the same day (marketing/BETA_PROGRAM.md): accounts ship
no later than Premium, and beta testers' 6 months are `source = 'manual'`
rows in `public.entitlements`.

## The free sample rules (never break these)

- The list in `data/free/cisa_sample_ids.json` **only grows**. Removing an id
  would take a question away from a learner's progress, bookmarks and review.
  `python3 scripts/build_free_sample.py --check` (run by `verify_repo.sh`)
  fails if an id would disappear.
- The web and the phone must use the **same** free ids (Phase 3).
- No copy ever shows the bank size, the sample size, a percentage or "X of Y".
- `scripts/build_site.sh` fails if the text of any question outside the
  sample appears anywhere in `_site/`.

## Phases

### Phase 0: owner checks (about 20 minutes, $0)
- Open the old GitHub Pages address and confirm it no longer serves the repo
  (it should have stopped when the repo went private on 4 Nov).
- In Cloudflare, confirm no old Pages project still serves the site.
- Decide whether to switch off `kaisip.certprep-support.workers.dev` (it
  serves the same build, so Phase 1 covers it too).

### Phase 1: free sample only on the website (now)
- `scripts/build_free_sample.py` picks the sample; `data/free/cisa_d1..5.json`
  are published instead of `data/domain1..5.json`.
- `index.html` loads the sample; locked items show a calm "full course" line;
  the Full mock is locked and the Mini mock stays open; a "You've worked
  through the free questions" card points to the Android beta.
- After deploy: `https://kaisip.com/data/domain1.json` must return the app
  page, not JSON. Check the body, not the status code (the single-page
  fallback answers 200).

### Phase 2: optional web sign-in and the entitlement gate (with the accounts go-live)
- A one-time, dismissible Welcome card: "Start free, no account" (main) and
  "Sign in free" (Google or an emailed code). No sign-in wall.
- The full bank lives in a **private Cloudflare R2 bucket** (no public r2.dev
  address), served by a small plain-JS Worker on the existing `kaisip`
  Worker at `/packs/v1/*`. It checks `public.entitlements` with the
  learner's own token (Row Level Security), holds no secret, and answers
  `Cache-Control: private, no-store`. Tests for every refusal case.
- Accounts privacy policy, a delete-account page and CSP updates in the same
  release. Manual grant for the owner's own account.
- Prerequisites: the go-live gates in `docs/mobile/ACCOUNTS_BETA_PLAN.md`
  (Turnstile on, redirect URLs, audit logs, restore drill), the R2 bucket and
  a bucket-only token, the Google OAuth consent screen published.

### Phase 3: Premium launch (buy in the Android app, the web unlocks too)
- Sign-in in the Android app with in-app account deletion; RevenueCat with
  one 6-month prepaid plan; a RevenueCat webhook Edge Function that writes
  `public.entitlements` (`source = 'revenuecat'`).
- The public phone build bundles **only the sample**; paid packs download
  through the same Worker after purchase. A public APK with the full bank
  inside gives it away, so the first public production release and the
  Premium release should be the same one if the timeline allows.
- Beta testers' grants: `expires_at` = launch day + 6 months.
- Privacy, terms, Data safety, IARC and store listing updated; Supabase Pro
  from the day paid access depends on it.
- The Android app never mentions the website as a way to get content, a web
  price, another checkout or Ko-fi (Play payments policy).

## Where the experts disagreed, and what was chosen

| Topic | Chosen | Why |
|---|---|---|
| Where the paid bank lives | Cloudflare R2 + Worker (not a Supabase table or Storage) | Matches the 27 Oct content-pack decision, fails closed, no Supabase egress or pausing |
| Build the web gate now or later | Sample-only now; sign-in and the Worker with the accounts go-live | Phase 1 alone meets the security goal; sign-in can't go public before the go-live gates |
| Does a free account unlock more than a guest? | No, the same | Avoids account farming and collecting emails from people who never pay |
| How purchases are checked | RevenueCat | Already set up; handles refunds and renewals |
| Welcome screen | Dismissible card in Phase 2, not a wall | Meets the owner's guest/sign-up flow without blocking first use |

## Known risks

- The full bank was public before (kaisip.com, workers.dev, and the public
  repo and GitHub Pages until 4 Nov), so copies may exist. The gate protects
  new and updated content; marketing must not promise exclusivity.
- A Worker mistake (public bucket address, shared cache on paid responses,
  missing expiry check) leaks content or locks out payers.
- On Supabase Free, a paused project blocks new unlocks. Move to Pro before
  revenue depends on it.
