# Scaling the cloud (accounts, sync, board)

Written in Uplift Phase 7 (sync, built OFF). Nothing here is live: no
hosted project exists until the owner's go-live (Phase 9). This page sizes
the backend for **up to 5,000 accounts**, says what to watch, and what to
change, in order, if Aurivan grows past that. The plan and region are the
**owner's decision** (PHASE6_8 §9 #4); the numbers below are what that
decision rests on.

> **Prices and quotas are from the build spec (11 Oct 2026), not checked
> live:** supabase.com was unreachable from the build environment. Check
> every figure marked *(verify)* against supabase.com/pricing at Phase 9.

## 1. What "users" means

- **Monthly active learners (MAU)** is what Supabase Auth bills: an account
  that signs in or refreshes its session in a month.
- **Accounts** are what storage grows with.
- Sizing assumes the worst case: **every** learner has an account and syncs.
  Today accounts are optional and most learners never make one, so real use
  will be lower.

## 2. Unit budget per account

Measured in `mobile/src/__tests__/sync-budget.test.ts` on real fitted
payloads (the exact JSON a phone pushes), not guessed. The test fails if a
release grows them past its bounds, so this table can't silently go stale.

| Item | Size | Notes |
|---|---|---|
| Progress snapshot, **heavy learner** (every CISA question answered, reviews, mistakes, 50 mocks, readiness log, badges, plant) | **about 263 KB** of JSON; **about 17 KB** gzipped | The app's cap is 1.5 MB (`MAX_PUSH_BYTES`); the database's is 2,000,000 bytes. Postgres stores it TOAST-compressed: expect a few tens of KB on disk |
| Progress snapshot, typical learner (a few hundred answers) | about 60–80 KB | about 220 bytes per answered question, plus a few KB fixed |
| Settings snapshot | **about 350 bytes** | capped at 64 KB in the app and 96 KB in the database (security review P7 S2), so a scripted account can't park 2 MB there |
| Support checkpoints (`private.sync_history`) | 2 earlier copies of the progress row | at most one new one a day; kept while the synced copy exists |
| Write counter (`private.sync_writes`) | one small row per learner and store | the rate window and last rev; outlives the snapshot rows (so delete + insert can't reset it), goes with the account |
| Writes | about 6 a day per store per device | launch, background, session end, at most every 10 minutes after a change; the server allows 60 an hour per store, deletes included |
| Egress, one device | near zero: heads only (about 1 KB per sync) | the state is downloaded **only when `rev` changed** (another device wrote) |
| Egress, two devices | about one progress download per sync that follows the other phone's change: a few downloads a day of 60–260 KB | about 10–50 MB a month for an active two-phone learner |
| Board (Phase 8) | under 5 KB per active poster | posts, comments, votes |

## 3. Today's plan, up to 5,000 accounts

**Supabase Pro** *(verify)*: $25 a month, Micro compute (credit covers it),
8 GB database, 250 GB egress, 100,000 MAU, daily backups.

Expected use at 5,000 accounts, every one syncing:
- **Database:** under 1 GB. Worst case (every learner heavy, three copies
  of progress each): 5,000 × about 3 × the compressed row ≈ under 1 GB;
  typical is a few hundred MB.
- **Egress:** typically under 15 GB a month. Single-device learners cost
  almost nothing (heads only, about 1 GB a month for everyone). If 30% use
  two phones and pull about 4 times a day at about 100 KB, that adds about
  18 GB a month at the very top end: still under 10% of the quota.
- **Edge Function calls:** under 200,000 a month (account deletion and
  "Download my data" are rare; the board's submit function arrives in
  Phase 8).
- **Auth emails:** the sign-in codes. An email provider's free tier covers
  this size (owner decision #2).

**Why not the Free plan** *(verify)*: Free projects pause after 7 days with
no activity (sync would silently stop for everyone), have no backups, and
their 5 GB of egress would be passed at about 1,700 two-phone learners.

**Total:** about $25–27 a month (Pro, plus the email provider's free tier
or a few dollars). Turn on the **spend cap**.

## 4. Triggers to watch

Supabase usage alerts plus a weekly SQL report (row counts, the largest
snapshots, writes per hour). Act when any of these holds:

- Database size over 60% of the plan.
- Egress over 60% of the plan.
- CPU p95 over 70% for an hour.
- Sync p95 latency over 1.5 s.
- Sync conflicts over 2% of pushes (two phones writing at the same moment
  more often than expected: check the triggers in `lib/sync.ts`).
- `rate_limited` answers from `sync_snapshots` at all (the app needs about
  6 writes a day; 60 an hour means a bug or abuse). Since the Phase 7
  review the count lives outside the row, so a delete + insert loop raises
  it too instead of slipping past.
- Auth emails per hour over 60% of the SMTP quota.
- Edge Function invocations over 60% of the plan.
- Moderation (Phase 8): more than 30 items a day, or any 24-hour miss.
- Support: more than 15 emails a day for 2 weeks.

## 5. Steps, with what changes and the cost

| Stage | What changes | Cost *(verify)* |
|---|---|---|
| 5k → 10k | Nothing structural. Raise the spend cap; review the alerts. | About $25–47 a month |
| 10k → 50k | Small compute (about +$5 after the credit). Gzip snapshots before upload (a client and server change, and a schema bump: an `encoding` column; the measured 15× saving above). Per-cert snapshot rows, so one exam's change doesn't re-send all. Keep 1 support checkpoint instead of 2. A CDN or HTTP cache for anonymous board reads. Moderation: a backup moderator, or a paid help desk (owner). | About $50–70 a month |
| 50k+ | Delta sync (a `rev` per section). A three-way merge against a stored base (it would also count attempts made offline on two phones exactly, instead of the max). A read replica only if reads dominate. Supavisor pooling for Edge Functions. A hosted moderation API only with owner approval (App Store 5.1.2(i) disclosure). Board partitioning not before millions of rows. | Re-plan |

## 6. Runbooks

- **Raise compute:** Dashboard → Project Settings → Compute. A short
  restart; phones see `offline` for a minute and retry (30 s, 2 min, …).
- **Change the spend cap:** Dashboard → Organization → Billing.
- **Restore** from a daily backup or PITR (if bought): restores the whole
  database to a point in time. One learner's progress: the support
  checkpoints in `private.sync_history` (service role only; by hand, with
  the learner's request in writing).
- **Rotate keys:** create a new publishable key, ship it in a build, then
  revoke the old one after phones have updated. Service-role and Apple keys
  are Function secrets: rotate and redeploy the functions.
- **Pause posting under load** (Phase 8): `board_settings.posting_open =
  false`. It can only pause; it never adds a feature.
- **Sync under strain:** sync never blocks study. Phones keep working
  offline-first, and a failed sync only changes the status line, so a
  struggling backend degrades to "Will sync when you're online".

## 7. What never changes with scale

- RLS on every table (`scripts/check_rls.sh`, pgTAP `01_hardening.sql`).
- The build-time flag: nothing on a server can turn a feature on.
- No analytics, no ads, no tracking.
- The privacy promises in the published policy.
- The 24-hour moderation duty (Phase 8).

## 8. Review cadence

Monthly while under 10,000 accounts, then fortnightly. Re-measure the unit
budget (`sync-budget.test.ts`) whenever the saved data changes shape.
