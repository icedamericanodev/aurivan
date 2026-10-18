# KaiSip end-to-end architecture (decided 15 Oct 2026)

This page sets out how every part of KaiSip fits together, what each part
costs, and who sets it up. Four expert reviews fed into it (backend, front end,
content size and security). Their full reports live in the session notes. This
is the decision.

**The aim:** launch on Google Play and the App Store for under about 3,000
learners, on free tiers wherever that is safe, without putting learners' data
at risk.

## 1. The picture

```
 Phone app (Android / iOS)              Website (static, no build step)
 ├─ ALL study content built in          ├─ landing page + web practice
 │  (questions, notes, lessons)         ├─ privacy, terms, support pages
 ├─ progress saved on the phone         └─ hosted on Cloudflare Pages (free)
 ├─ content fixes arrive by OTA update
 │  (Expo EAS Update, free tier)
 └─ optional account → sync ─────────►  Supabase (Singapore)
                                         ├─ sign-in: email code, Google, Apple
                                         ├─ sync snapshots (Postgres + RLS)
                                         ├─ account delete / data export
                                         └─ feedback board (closed at launch)
```

## 2. Decisions, one per part

| Part | Decision | Why | Cost now → at 3,000 users |
|---|---|---|---|
| **Backend** | **Supabase**, reusing the owner's existing project in Singapore | About 5,000 lines of server code and 3,000 lines of tests are already written for it. Firebase has no hard spend cap and uses sign-in links instead of codes. Cloudflare D1 has no sign-in built in, so it is the fallback. | $0 → $25/month (Pro) once accounts are public |
| **Website** | **Cloudflare Pages**, free plan, deployed straight from GitHub | Commercial use is allowed. It works with a private repo and actually applies our security headers. Vercel's free plan is for non-commercial use only. GitHub Pages ignores `_headers`. | $0, plus the domain at about $10–14 a year |
| **Study content** | **Built into the app** (offline-first), with fixes sent as over-the-air updates | Content is 3.7 MB of a 9.8 MB JavaScript bundle and loads in about 25 ms. It is not what makes the app big or slow. | $0 → $19/month only in a month with more than about 1,000 updating devices |
| **More certifications** | Each new exam is a downloadable pack (checksum-checked), with CISA always built in | Keeps every install small. A pack adds about 3.5 MB on the phone. | $0 (static files) |
| **App size** | Turn on Android code shrinking (R8) | Unshrunk Android code is about 50 MB, half of it never used. Shrinking takes an estimated 89–96 MB install down to 55–70 MB. | $0 |
| **Sync** | Keep the design already built: each phone holds a full copy, and the server is the meeting point | Merging can't lose offline progress. The first sync shows a preview with a 7-day undo. The first name, theme and reminders never sync. | included |
| **Web sync** | **Later.** Phones sync first; the web joins once it can share the app's exact sync code | A second copy of the merge logic in the static page would drift and could damage progress. | — |
| **Sign-in** | Email code (Brevo free mail), Google, Apple. No passwords, no SMS | Nothing to leak, and no SMS fees | $0 |
| **Abuse protection** | Cloudflare Turnstile on sign-up, plus the rate limits already built | Free, and enough at this size. No Play Integrity or App Attest needed yet. | $0 |
| **Mobile builds** | EAS Build free plan (15 Android + 15 iOS builds a month), EAS Submit | Builds the store apps without a Mac. The GitHub APK workflow stays as a backup for testers. | $0 |
| **Analytics** | Web: Cloudflare Web Analytics (no cookies) instead of Google Analytics. App: none, only the free store-console stats. | Privacy-first, and the cookie banner can go. | $0 |

## 3. When paying becomes necessary

**Recommended launch path ($0):** launch publicly with **accounts switched
OFF**. The app is fully useful without an account: offline study, plus a
backup file to move progress to a new phone. Turn on accounts and sync in a
later update.

Supabase Free is safe only for **invited testers** (fewer than about 100, told
their data can be wiped), and only with three safeguards:
1. a "keep awake" job every 2 days, because free projects pause after about
   7 days of no activity;
2. our own encrypted nightly backup, stored outside GitHub;
3. the public feedback board kept closed.

**Upgrade to Supabase Pro ($25/month) on whichever comes first:**
- the first public (non-tester) account can be created;
- the feedback board opens to the public;
- the free project pauses even once;
- the first paid subscriber;
- usage reaches 60% of a free quota.

The reason: a paused project cannot process an account-deletion request.
Store rules and the Philippine Data Privacy Act both require us to handle
those. The free plan also has no backups of people's accounts.

### Update, 18 Oct 2026 (owner agreed)

- **Free plan first.** At around 3,000 learners KaiSip fits Supabase Free
  (50,000 monthly sign-ins, 500 MB database). The one limit at risk is the
  5 GB monthly transfer if many learners sync two devices; gzip the sync
  snapshots before accounts go public (about 15× smaller,
  `docs/mobile/SCALING.md`). Run Free with the safeguards above (keep-awake
  job, our own encrypted nightly backup).
- **Upgrade to Pro ($25/month)** when KaiSip earns money (a paid tier), when
  usage reaches about 60% of any free quota, or if the project ever pauses.
  This replaces "Pro at the first public account".
- **New-phone restore at $0 already exists:** Android Auto Backup is on
  (`android.allowBackup: true` in `mobile/app.json`) and iOS includes app
  data in iCloud Backup. It is a restore, not live sync. Test it in the
  private preview before promising it.
- **Order of work:** quality phase → private preview (accounts off) →
  store readiness → public launch (accounts off) → optional accounts and
  sync when learners ask for it or a paid tier starts.

## 4. Security, the short version

The server side is already strong. Row-level security is on for every table,
writes go through checked functions only, account deletion and data export
are built, and CI tests all of it. What is missing is mostly free settings:

1. Protect the `main` branch on GitHub: pull request required, checks must
   pass, no force-push. This is the most important one, because anything
   merged to `main` can reach every phone as an update.
2. Switch on GitHub secret scanning, push protection and Dependabot alerts.
3. Keep the update key (`EXPO_TOKEN`) in a GitHub Environment that needs
   approval. Use two-step sign-in (2FA) on GitHub, Expo, Supabase, Google and
   Apple.
4. Dependabot config, and actions pinned to exact versions. (Claude)
5. Turnstile captcha and two-step sign-in for moderators before accounts go
   public. (Claude, plus a site key from the owner)
6. Security headers (HSTS, CSP) on the Cloudflare site. (Claude)
7. A breach runbook: rotate keys, sign everyone out, and notify the Philippine
   National Privacy Commission (NPC) within 72 hours. (Claude drafts, owner
   approves)

## 5. What the owner needs to do

**Now (free, about an hour in total):**
- [ ] GitHub → Settings → Rules: protect `main` (Claude can give the exact
      settings).
- [ ] GitHub → Settings → Code security: turn on secret scanning, push
      protection and Dependabot alerts.
- [ ] Turn on 2FA for GitHub, Expo, Supabase, Google and Apple.
- [x] Create a free Cloudflare account and connect the repository (done
      16 Oct 2026 through the Workers screen; see `docs/WEBSITE_DEPLOY.md`).
- [x] Buy the domain at Cloudflare Registrar: **kaisip.com** (16 Oct 2026),
      live with `www.kaisip.com`.
- [ ] Start recruiting 12+ testers. A new personal Google Play account must
      run a 14-day closed test before it can publish.

**At go-live:**
- [ ] Store accounts: Google Play (one-time fee) and Apple Developer (yearly
      fee). These are unavoidable.
- [ ] When accounts turn on: approve Supabase Pro; set up a Brevo email account
      and add its domain records; create the Google sign-in client IDs and the
      Apple Services ID and key; get a Turnstile site key.
- [ ] Move `EXPO_TOKEN` into the approval-gated GitHub Environment.

**Connectors:**
- Already connected in Claude sessions: **Supabase** and **GitHub**. Claude
  can resume the project, apply migrations and check advisors.
- No connector exists for Cloudflare, Apple or Google, so their dashboard
  steps are the owner's.

## 6. What Claude builds next (no owner action needed)

- Android code shrinking (R8) and a release-build smoke test.
- CI limits on bundle size (about 14 MB) and content per certification
  (about 6 MB).
- `scripts/build_site.sh`, which publishes only an allowlist of files to the
  website. Today the whole repo is public on GitHub Pages.
- `_headers` with HSTS and a strict CSP on the legal pages.
- Dependabot config and actions pinned to exact versions.
- Update channels: production builds listen on `production`, not `preview`.
  The update workflow publishes for iOS too once there is an iOS build.

## 7. What would change these decisions

- Supabase stops counting the keep-awake job as activity → go Pro at launch.
- The owner wants $0 forever with a public board → rebuild on Cloudflare
  Workers + D1.
- Over-the-air update limits start to bite → move content to downloadable
  packs sooner.
- Content for one exam passes about 20 MB, or searching gets slow on low-end
  phones → move content into an on-device SQLite database.
