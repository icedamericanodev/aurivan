# Scaling the cloud (accounts and sync) on the Supabase Free plan

Rewritten for the accounts beta (27 Oct 2026). **Owner decision:** the beta
runs on the existing Supabase **Free** project in ap-southeast-1
(Singapore), the region nearest the Philippines. This page sizes it, says
what to watch, and what to change, in order, when KaiSip outgrows it. The
plan behind it is `ACCOUNTS_BETA_PLAN.md` (§3.2 sizing, §6 safeguards).

> **Prices and quotas** below were read from the vendors' pages through
> search on 27 Oct 2026 (supabase.com itself could not be opened from the
> build environment). Anything marked *(verify)* must be checked on the
> vendor's own page before it is relied on.

## 1. What "users" means

- **Monthly active learners (MAU)** is what Supabase Auth counts: an account
  that signs in or refreshes its session in a month. Free allows 50,000.
- **Accounts** are what the database grows with.
- Sizing assumes the worst case: **every** learner has an account and syncs.
  Accounts are optional and most learners never make one, so real use will
  be lower.

## 2. The Free plan's limits, and which one runs out first

| Limit | Free plan | Our use at 3,000 accounts | Runs out first? |
|---|---|---|---|
| Database size | 500 MB | about 65 MB typical, 160 MB if every learner is heavy | No |
| **Egress** (data sent out) | **5 GB a month** | **about 3.3 GB at the top end** (§4) | **Yes: the first limit to watch** |
| Monthly active users | 50,000 | 3,000 | No |
| Edge Function calls | 500,000 a month | a few hundred (delete and export are rare) | No |
| Pausing | after 7 days with no activity | prevented by the keep-awake job | Handled |
| Backups | none we can restore from *(verify)* | our own nightly encrypted dump to R2 | Handled |
| Emails (custom SMTP, Resend Free) | 3,000 a month, 100 a day | sign-in codes only; rate limit 20 an hour | Watch on launch days |

## 3. Unit budget per account

Measured in `mobile/src/__tests__/sync-budget.test.ts` on real fitted
payloads (the exact JSON a phone pushes), not guessed. Since the accounts
beta every snapshot is gzipped by the app or the website before upload and
stored as base64 (`state_gz`), so the database and the network carry the
small number, not the big one.

| Item | Size | Notes |
|---|---|---|
| Progress snapshot, **heavy learner** (every CISA question answered, reviews, mistakes, 50 mocks, readiness log, badges, plant) | about 263 KB of JSON → **about 17 KB gzipped, about 23 KB as base64** | The app's cap is 1.5 MB of JSON; the database's 2,000,000 bytes unzipped and 700,000 characters zipped |
| Progress snapshot, typical learner (a few hundred answers) | about 60–80 KB of JSON → **about 6 KB stored** | about 220 bytes of JSON per answered question, plus a few KB fixed |
| Settings snapshot | about 350 bytes of JSON → **about 0.5 KB stored** | capped at 64 KB in the app; 98,304 bytes unzipped and 32,768 zipped in the database |
| Support checkpoint (`private.sync_history`) | **one** earlier copy of the progress row, as stored | at most one new one a day; kept while the synced copy exists |
| Write counter (`private.sync_writes`) | one small row per learner and store | outlives the snapshot rows (so delete + insert can't reset it), goes with the account |
| Auth rows (user, identities, sessions, refresh tokens) | about 6–8 KB | grows with sessions; refresh-token rotation replaces old ones |
| Writes | about 6 a day per store per device | launch, background, session end, at most every 10 minutes after a change; the server allows 60 an hour per store |
| Egress, one device | heads only, about 1 KB per sync | the snapshot is downloaded **only when `rev` changed** (another device wrote) |
| Egress, web + phone | about one snapshot download per sync after the other side changed | about 6–23 KB each, a few a day |

`state_gz` is stored with `storage external`: gzip doesn't compress
further, so Postgres doesn't spend CPU trying, and the size on disk is the
size above.

## 4. Sizing at 500, 3,000 and 5,000 accounts

**Database** (gzip; each account: progress, one checkpoint, settings, auth
rows):

| Accounts | Typical | Every learner heavy |
|---|---|---|
| 500 | about 11 MB | about 27 MB |
| 3,000 | about 65 MB | about 160 MB |
| 5,000 | about 110 MB | about 270 MB |

All under 500 MB. Without gzip (Postgres's own compression, roughly 3–4×),
5,000 heavy learners would reach about 775 MB: gzip is what keeps the
beta on the Free plan.

**Egress at 3,000 accounts**, 40% of them on both the web and a phone, at
the top end (every learner active every day):

| Item | Per month |
|---|---|
| Heads (about 1 KB each, about 10 a day per surface) | about 1.4 GB |
| Snapshot pulls | about 1.4 GB |
| Token refreshes | about 0.5 GB |
| **Total** | **about 3.3 GB (about 66% of 5 GB)** |

Real use is lower, because not every monthly learner studies every day. At
500 accounts it is about 0.5 GB. Without gzip, a learner on two surfaces
pulling about 4 times a day at about 100 KB would take 3,000 learners past
5 GB.

## 5. What we watch, and how

The Free plan has no spend to cap and no automatic egress alert. So:

- **Every night** the backup job (`.github/workflows/db-backup.yml`) prints
  the database size and its largest tables, and **turns red over 300 MB**
  (60%); GitHub emails Sky.
- **Every 2 days** the keep-awake job (`.github/workflows/keep-awake.yml`)
  reads one row; a red run means the project is paused or down.
- **Every week (5 minutes)** Sky opens Supabase → Usage (egress, database,
  MAU), Resend's usage page and Turnstile's analytics.

Act when any of these holds:

- Egress over 60% of the month's 5 GB (3 GB), or on course to pass it.
- Database over 60% (300 MB): the backup job goes red.
- Emails: over 60 a day for several days (Resend Free allows 100 a day).
- `rate_limited` answers from `sync_snapshots` at all (the app needs about
  6 writes a day; 60 an hour means a bug or abuse). The count lives outside
  the row, so a delete + insert loop raises it too.
- Sync conflicts over 2% of pushes (two devices writing at the same moment
  more often than expected: check the sync triggers).
- Snapshots refused as unreadable (a gzip bomb or a broken client): any at
  all is worth a look in the Edge Function and app logs.
- Auth: a spike of failed code checks in the Auth logs (someone guessing
  codes; captcha guards sending, not checking).
- A paused project, or a red keep-awake run.
- Support: more than 15 emails a day for 2 weeks.

## 6. Steps, with what changes and the cost

| Stage | What changes | Cost *(verify)* |
|---|---|---|
| Today, up to about 3,000 accounts | Free plan, gzip snapshots, one checkpoint, keep-awake, nightly encrypted backups to R2 | $0 a month |
| Egress or the database passes 60%, the project pauses, or the beta becomes the launch | **Supabase Pro**: a bigger egress and database allowance, daily backups, no pausing, a spend cap. Change the plan in the dashboard; nothing in the apps changes | about $25 a month |
| Resend's 100 a day is reached | Brevo's free plan (300 a day) or Resend's paid plan | $0–20 a month |
| 10k → 50k | Per-cert snapshot rows, so one exam's change doesn't re-send all. Small compute on Pro. A CDN or HTTP cache for anything public | about $50–70 a month |
| 50k+ | Delta sync (a `rev` per section). A three-way merge against a stored base. A read replica only if reads dominate. Connection pooling for Edge Functions | Re-plan |

## 7. Runbooks

- **The project paused** (the keep-awake run is red): Supabase dashboard →
  the project → Restore. Learners see "Will sync when you're online" until
  it is back; study never stops. Then check why keep-awake didn't run
  (GitHub disables scheduled workflows in a public repo after 60 days with
  no commits: `gh workflow enable keep-awake.yml`).
- **Restore a backup** (a quarterly drill, on Sky's computer, with Claude
  guiding): download the newest `.tar.gz.age` from R2, then
  `age -d -i <your key file> <backup> | tar -xzf -` gives `roles.sql`,
  `schema.sql`, `data.sql` and `stats.txt`. Restore them into a local
  Supabase (`supabase start`) with `psql` in that order, as Supabase's
  "Backup and restore using the CLI" guide describes. Never upload a
  decrypted backup anywhere.
- **One learner's progress:** the support checkpoint in
  `private.sync_history` (service role only; by hand, with the learner's
  request in writing). It is stored gzipped, like the row.
- **Stop sync writes in an emergency** (no app release needed):
  `revoke insert, update on public.sync_snapshots from authenticated;`
  Phones and the web say "We'll try again soon". Grant it back to undo.
- **Stop new sign-ups:** Supabase → Authentication → turn off "Allow new
  users to sign up".
- **The no-password trigger blocks a real sign-in flow:**
  `drop trigger kaisip_refuse_new_password on auth.users;` then fix it in a
  new migration.
- **Rotate keys:** create a new publishable key, ship it in a build (and
  the web constant and the keep-awake variable), then revoke the old one
  after phones have updated. Secret keys, `DELETION_PEPPER` and Apple keys
  are Function secrets: rotate and redeploy the functions. A rotated
  pepper only affects audit rows written after it.
- **Sync under strain:** sync never blocks study. Phones and the web keep
  working offline-first, and a failed sync only changes the status line.

## 8. What never changes with scale

- RLS on every table (`scripts/check_rls.sh`, pgTAP `01_hardening.sql`).
- The build-time flag: nothing on a server can turn a feature on.
- No analytics in the app, no ads, no tracking.
- Content is never stored in Postgres.
- The privacy promises in the published policy, including "deleted data
  leaves our backups within 30 days" (the R2 lifecycle rule).

## 9. Review cadence

Weekly 5-minute check during the beta (§5). Re-measure the unit budget
(`sync-budget.test.ts`) whenever the saved data changes shape, and this page
whenever a plan or price changes.
