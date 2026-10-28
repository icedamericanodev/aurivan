# KaiSip accounts beta: build plan

**Written:** 27 Oct 2026 by the backend architect; tidied into the repo the
same day with ticket 1 ("Accounts beta: database fixes before first apply").
**Audience:** Sky (the owner) and every Claude Code session working on
accounts. Figures not confirmed on the vendor's own page are marked
*(verify)*.

**Owner decisions (Sky, 27 Oct 2026).** Sign-in is optional on the web and
Android. Methods: Google and an emailed code (Sky chose 6 digits; the
security audit of 27 Oct, L7, moved it to 8: confirm with Sky); Apple later. Progress
syncs between the web and the phone. Backend: the Supabase **Free** project
in ap-southeast-1 (Singapore). Priorities: learners' security and database
performance. CISA only for now.

No secret is in this file or anywhere in the repo. Only the project URL and
the publishable key are public, and the repo doesn't need either: workflows
read them from repository variables, apps from their build settings.

## Status

| Ticket | What | State |
|---|---|---|
| 1 | Database fixes before the first apply (§3.1), Edge Function changes (§3.3), workflows (§6), docs, legal drafts, email templates, Data safety answers; then the security audit's fixes (below) | **Done** (PR #141) |
| 2 | MCP apply, SQL checks, advisors, function deploy (§3.3) | **Database applied 28 Oct 2026** (all five migrations, byte-for-byte, checks and advisors clean: see "Hosted apply record" below). Function deploy waits for the `DELETION_PEPPER` secret (§9 step 29) |
| 3 | Web client (§1, web engineer) and mobile go-live (§2, mobile engineer) | Not started |
| 4 | Sky's checklist (§9) | Groups A–E can start now |

### Hosted apply record (28 Oct 2026, Supabase MCP, project `ziadnvepttlgcowvqvom`)

MCP stores its own apply-time version, not the file's. Before any `supabase db push` to the hosted project, run `supabase migration repair` with this mapping (or keep applying through MCP).

| Repo file | Hosted version | md5 of the stored statements (= `md5sum` of the file) |
|---|---|---|
| `20261005000000_init_mobile_sync.sql` | `20261028042845` | `7fa077506232ec575bafea08d299da32` |
| `20261013000000_sync_snapshots.sql` | `20261028044435` | `6ca40d6caa0d443154ec7696dfd69f14` |
| `20261014000000_feedback_board.sql` | `20261028045309` | `b45c8e2a6d36d260a0d66d4127a9d045` |
| `20261027000000_beta_board_paused.sql` | `20261028045341` | `af1be1f0a0904ba010f7a4039f1bea68` |
| `20261027000100_beta_no_passwords.sql` | `20261028045402` | `3a676a49c8ea05a88f0a0678f1dee3a0` |

Checks after the apply:
- 22 tables in `public` and `private`, every one with RLS on.
- No `content_packs`, no SECURITY DEFINER function in `public`, and nothing in `supabase_realtime`.
- `kaisip_clear_password` is enabled on `auth.users`.
- `board_settings` is one row with `posting_open = false`. The four board write entry points are revoked from `service_role`; `svc_board_counts` and `svc_board_export` are still granted.
- anon can execute only `board_feed` and `board_post`. The only `using (true)` is `board_settings_read`.

Advisors (no ERROR, no WARN):
- Security: INFO "RLS enabled, no policy" on 8 `private` tables. This is by design: deny all except the owner and `service_role`.
- Performance: INFO "unused index", because the database is empty.
- Performance: INFO "unindexed foreign keys" on 7 board columns (author_member, parent_id, duplicate_of, official_comment_id, and the notification post and comment ids). Add those indexes in the migration that opens the board; the board is off for the beta.

The Supabase MCP asks the owner to confirm any SQL containing DROP, DELETE, TRUNCATE or an UPDATE without WHERE. Its check is keyword-based, so comments and function bodies set it off. Future applies must run with Sky present.

## Security audit (27 Oct 2026) and the go-live gates

A security audit of ticket 1 found 0 critical, 2 high, 4 medium and 9 low
issues. All were fixed in the repo before anything was applied (see the
git log for the commits). What changed, in short:

| Finding | Fix |
|---|---|
| H1 pre-registration takeover (an attacker signs up with the victim's email and a password; the victim later confirms with a code) | The trigger now **wipes** any password on a confirmed account (insert, confirmation, or a new password) instead of raising: `20261027000100_beta_no_passwords.sql`. Smoke: `cloud_smoke.sh pre-register` and the `EMAIL_A` probe (S9) |
| H2 Auth audit logs keep email, user id and IP after deletion | Go-live gate 2 below; the privacy and deletion drafts name the sign-in event logs and say exactly what the deletion record holds |
| L8 deletion record time | The record keeps the DAY (UTC), the keyed hash and the board counts; purged after 3 years (at each deletion and nightly) |
| M1 the gzip cap might not bound memory | The reader feeds the inflater 1 KB slices from a pull-based stream. Measured on a 500 MB zero bomb: the old single-chunk feed grew memory by about 506 MB, the sliced one by under 2 MB; a test asserts under 64 MB. **The phone's and the website's codecs must slice too** (SECURITY_GATES.md I9) |
| M2 Free-plan exhaustion | Progress `state_gz` capped at 200,000 characters (the app's 1.5 MB fits at 10 to 1; progress measures about 15 to 1); 20 writes per store per hour; captcha before any public link (gate 3) |
| M3 the backup job holds the full `postgres` password | `.github/CODEOWNERS` (the owner reviews `.github/`), gate 4, and the runbook "rotate the password if a workflow changed without review". A read-only dump role is a *(verify)* item: on Supabase, `postgres` may not be able to grant `pg_read_all_data` or read every `auth` table through another role; if it can, the nightly purge moves to pg_cron |
| M4 privacy accuracy | Backups "encrypted on a temporary GitHub build machine before storage"; GitHub listed as a processor; session IP and browser named; "Download my data" now includes the provider's name and picture link, the last sign-in, the 16+ confirmation, each row's rev, device code and time, and the support copy |
| L1 | The board's four write entry points are revoked from `service_role` until the board opens (the board's go-live migration must grant them back) |
| L2 | A cheap read-only export check answers 429 before the document is built |
| L3, L4, L5 | The backup log lists only our own tables; the password is masked on its own and TLS checks Supabase's CA (`sslmode=verify-full`); sessions, tokens, one-time codes, flow state, MFA challenges and the Auth audit log are left out of the dump |
| L6 | Restore runbook: re-delete restored accounts listed in `private.deletions` (SCALING.md §7) |
| L7 | 8-digit codes. **This reverses Sky's "6-digit" decision: Sky must confirm** (one setting and the template wording to revert) |
| L9 | One install-id wording in the privacy draft and STORE_LISTING §7 |

### Go-live gates (all must be ticked before any public sign-in link)

Compiled from the audit's findings; reconcile with the auditor's own list
if it words them differently.

- [ ] 1. **Confirm email = ON** (Authentication → Sign In / Providers →
  Email). HARD gate: with it off, sign-up makes an already-confirmed account.
  Then run `PROBE_EMAIL=… bash scripts/cloud_smoke.sh pre-register`: the
  pre-registered password must be refused (S9).
- [ ] 2. **Auth audit logs not written to the database** (Authentication →
  settings: turn off writing Auth audit logs to the database) *(verify the
  switch's name)*. If it can't be turned off: a nightly pg_cron job
  `delete from auth.audit_log_entries where created_at < now() - interval '30 days'`,
  after checking that `postgres` may delete from that table *(verify)*, and
  the privacy policy says 30 days.
- [ ] 3. **Captcha (Turnstile) ON** before any public sign-in link, and the
  Android email-code flow sends a Turnstile token (through the
  `kaisip.com/human-check` page, §2.1).
- [ ] 4. **"Require review from Code Owners"** on `main` (Settings →
  Branches → main), so `.github/CODEOWNERS` takes effect.
- [ ] 5. `list_edge_functions` shows only `delete-account` and
  `export-my-data` (no board function deployed).
- [ ] 6. `DELETION_PEPPER` set (40 random characters, Function secret)
  before the first real deletion.
- [ ] 7. Auth settings as §4: anonymous sign-ins, manual linking and phone
  OFF; redirect URLs exactly `https://kaisip.com/` and
  `kaisip://auth-callback`; Email OTP length 8, expiry 600.
- [ ] 8. `pg_graphql` off and the Data API exposes `public` only (Gate 5).
- [ ] 9. Enforce SSL ON; the database password reset after setup and kept
  only in the password manager and the `db-backup` environment; the backup
  job green with `sslmode=verify-full`.
- [ ] 10. Advisors: 0 ERROR; the §3.3 SQL checks clean; no sync table in
  realtime (S2, S4).
- [ ] 11. `bash scripts/cloud_smoke.sh` all pass, with `EMAIL_A` set (S3,
  S6, S9).
- [ ] 12. One backup decrypted by Sky and a restore drill done, including
  the re-deletion of deleted accounts (S8, SCALING.md §7).

### What ticket 1 found when it read the real files (corrections to this plan)

1. **The delete order.** §3.3 said `deleteUserFiles` "may throw and block
   deletions". It couldn't: it was already a no-op returning at once (no
   bucket). The real gaps were the order (the account was deleted after the
   board counts and files, not first) and that a failed board count blocked
   the deletion. Ticket 1 deletes the account FIRST, then writes the audit
   row, clears files (retried once) and revokes Apple, each best-effort and
   logged; a failed board count now counts 0.
2. **The password trigger (§3.1, the beta migrations).** "Refuse a newly
   set `encrypted_password`" as written would break first sign-up: the Auth
   server gives every new email-code account a random throwaway password,
   and may set a new one while the first code is pending. After the
   security audit (H1) the trigger WIPES any password once the account is
   confirmed, and never raises. *(verify on the hosted project, acceptance
   test S9 below)*
3. **The board tests.** Pausing posting in the beta migration made the four
   board pgTAP suites fail (they assume posting is open). Each now opens
   posting at its start, inside its own rolled-back transaction.
4. **The smoke test had no sync checks at all** (§3.4 listed only the
   content-pack lines to remove). `scripts/cloud_smoke.sh` now covers the
   snapshot column grants and shape checks, the private sync tables, the
   paused board and CORS (S6).
5. **The deletion audit.** The SQL function hashed the user id itself
   (plain SHA-256). For the pepper HMAC its signature had to change: it now
   takes the 64-character hash and never sees the id.
6. **The snapshot checks.** Ticket 1 also requires whole base64 groups
   (`length % 4 = 0`), checks the length before the pattern, and keeps
   `encoding` server-owned (no client grant), so a client can't pick a
   format another client can't read.
7. **Public backup logs.** §6 said the backup job prints the account and
   session counts. The repo is public, so its Actions logs are too: the job
   prints only the database size and largest tables; the counts go inside
   the encrypted file.
8. **`supabase db dump` needs the repo's `config.toml`** to pick the
   Postgres 17 `pg_dump`, so the backup job checks out the repo (read-only).
9. **The legal drafts had drifted** behind the live `privacy.html` and
   `terms.html` (the beta-tester section, "free during the beta", the
   AI-assistance wording, Play builds without over-the-air updates). Ticket 1
   rebuilt `docs/legal/cloud/` from the live pages before adding the account
   sections, so publishing them later loses nothing.
10. **Unreadable snapshots in "Download my data".** The plan said
    `export-my-data` should refuse them cleanly. It leaves a bad store out of
    the download, names it in `unreadableStores` with a reason, and still
    gives the learner the rest (their right of access shouldn't hang on one
    damaged copy).
11. **No pepper.** If `DELETION_PEPPER` is missing (or under 32 characters),
    accounts are still deleted and the audit row is skipped and logged. It
    never falls back to a plain hash.

## 0. The recommendation

**One backend: the existing Supabase Free project (ap-southeast-1, Singapore), with the schema and the two account Edge Functions already in the repo.** I fix the migrations once before the first apply.

On top of it:
- **Web:** a small fetch-based client, written in TypeScript under `mobile/src/webcloud/`. It is compiled into `assets/kaisip-cloud.js` by the same bundler that already makes `assets/kaisip-plant.js`, so the web runs **the same sync engine, merge rules and checker as the phone**.
- **Android:** supabase-js. Google sign-in goes through the browser (expo-web-browser plus PKCE), **not** the native Google Sign-In module. Email codes use Turnstile, through a small hosted "human check" page.
- **Email:** Resend's free plan over custom SMTP.
- **Backups:** a nightly encrypted dump to Cloudflare R2.
- **Pausing:** a keep-awake GitHub Action.
- **Feedback board:** stays OFF in the beta, behind a new second flag.

**Why this one:**
- It is $0 a month up to about 3,000 users.
- It reuses code that is already built and tested: the ports, the merge engine with its property tests, pgTAP, the RLS guard and the bundler pattern.
- It adds only three small first-party native modules to the phone.
- It keeps one rulebook for sync, so phone and web cannot drift apart.

**What would change my mind:**
1. The project pauses or Supabase egress goes above 60% of the quota. Then move to Supabase Pro ($25 a month).
2. Testers distrust the Google screen that names `ziadnvepttlgcowvqvom.supabase.co`. Then switch to native Google sign-in (Appendix A).
3. The hand-written web auth client shows refresh races we can't fix quickly. Then self-host a pinned supabase-js file in `assets/` with SRI.
4. Resend's 100-a-day cap is reached. Then use Brevo's free plan (300 a day) or Resend's paid plan.

**Cheapest-safe fallback:** if web sync isn't ready, start the beta with accounts in the app only. Keep the web behind its own off switch, and let learners keep using the web export file into the app, which already works (`mobile/src/lib/webImport.ts`).

### At a glance

| Component | Choice | Monthly cost now / at 3,000 users | Who sets it up | Main risk |
|---|---|---|---|---|
| Backend | Supabase **Free** (Auth, Postgres 17, REST, 2 Edge Functions) | $0 / $0 while under 500 MB of database and 5 GB of egress; else Pro $25 | Claude via MCP (schema, functions, checks); Sky (dashboard auth, secrets) | Pauses after 7 days idle; egress is the first limit to run out; no backups on Free (verify) |
| Database | `profiles`, `entitlements`, `sync_snapshots` (gzip), private counters and checkpoints, board schema (paused) | $0 / $0 (about 60–160 MB at 3k, see §3.2) | Claude | Heavy learners without gzip would bust 500 MB and the egress quota |
| Content | Stays in the app bundle (CISA) and Cloudflare static packs. **Never in Postgres** | $0 / $0 | already decided | — |
| Web client | Own TypeScript client, compiled to `assets/kaisip-cloud.js`, loaded only when an account is used | $0 / $0 | web engineer | We own the auth edge cases (refresh across tabs) |
| Mobile client | supabase-js, expo-secure-store, expo-web-browser, expo-crypto | $0 / $0 | mobile engineer | One new native build (shared with widgets) |
| Google sign-in | Google Cloud OAuth "Web" client; the browser flow on both web and Android | $0 / $0 | Sky | The consent screen shows the supabase.co address |
| Email codes | Resend Free over custom SMTP, from `codes@kaisip.com` | $0 / $0 (3,000 a month, 100 a day) | Sky (account, DNS); Claude (templates text) | Daily cap; deliverability |
| Captcha | Cloudflare Turnstile (Managed) | $0 / $0 | Sky (widget); engineers (code) | A brief browser sheet on Android |
| Backups | GitHub Action → age-encrypted dump → R2 `kaisip-db-backups`, kept 30 days | $0 / $0 (10 GB free) | Claude (workflow); Sky (bucket, token, keys) | R2 needs a card on file (verify) |
| Keep-awake and uptime | GitHub Action every 2 days | $0 / $0 | Claude | Scheduled runs stop after 60 days with no repo activity |
| Monitoring | Size check in the backup job (fails at 300 MB = 60%) plus a weekly 5-minute Usage-page look | $0 / $0 | Claude, Sky | Free has no automatic egress alert |
| Secrets | Dashboard and GitHub Environment only, typed by Sky | $0 | Sky | — |
| Exit | Plain Postgres dumps on R2; the client speaks standard GoTrue/PostgREST | — | — | Changing the backend URL needs a Play release (store builds have no OTA) |

**Total: $0 a month now and at 3,000 users if the free limits hold.** The first likely paid step is Supabase Pro at $25 a month.

**Latency:** Singapore is the nearest Supabase region to the Philippines, so sync calls are short trips. Study never waits on the network.

---

## 1. Web client design

### 1.1 Pick: option (a), but compiled from TypeScript (not hand-written inside index.html)

Write `mobile/src/webcloud/` as pure TypeScript with ports for fetch, storage, random, lock and clock. Extend `mobile/scripts/web-plant-bundle.cjs` into a generic builder with a second output, `assets/kaisip-cloud.js` (global `window.KaiSipCloud`, loaded with `?v=<hash>` like the plant). Add `--check` to `npm run check` and `scripts/verify_repo.sh`, and list the file by name in `scripts/build_site.sh`.

What goes into the bundle:
- The auth client, about 250 lines:
  - email code: `POST /auth/v1/otp` and `POST /auth/v1/verify {type:'email'}`;
  - Google PKCE: `GET /auth/v1/authorize?provider=google&redirect_to=…&code_challenge=…&code_challenge_method=s256`, then `POST /auth/v1/token?grant_type=pkce`;
  - refresh: `grant_type=refresh_token`;
  - `POST /auth/v1/logout?scope=local|global`, `GET /auth/v1/user`, and `functions/v1/*`.
- A REST `SyncPort`.
- The snapshot codec (§3.1).
- The real engine: `engine/syncMerge.ts`, `engine/backup.ts readStores`, `engine/syncPlan.ts`, `engine/webImport.ts` and `lib/syncCore.ts`.

**Why (a) over (b), supabase-js from a CDN with SRI:**
- **One rulebook.** The web must run the same merge, checker and cycle as the phone, or two surfaces stop converging. That code is TypeScript in `mobile/`. The bundler already compiles it for the web, and supabase-js doesn't remove the need for it.
- **No new script host in the CSP and no third-party code on the page.** (b) adds `cdn.jsdelivr.net` to `script-src`. SRI pins the bytes, but every version bump is a manual hash update for Sky, and the bundle brings realtime, storage and postgrest code we don't use.
- **Jest-tested.** The web side gets the same test harness as the phone; index.html has none.

**Trade-off:** we own the protocol code. Mitigations:
- use only documented GoTrue/PostgREST endpoints;
- test against a fake server in Jest;
- run the acceptance tests in §7 against the live project.

Fallback (b'): self-host a pinned supabase-js UMD file in `assets/` with SRI (still no CDN host).

**One prerequisite refactor:** `lib/syncCore.ts` imports `SYNC_OFF` and types from `store/sync.ts`, which imports zustand, so it can't be bundled. Move `SYNC_OFF`, `PerStore`, `SyncMeta` and `SyncPause` to a new `engine/syncMeta.ts` and re-export them from `store/sync.ts`. There is no behaviour change. Everything else the engine needs is already bundleable: `engine/backup.ts` → `content/certifications.ts` → `theme/tokens.ts`, which has only a type import of react-native.

### 1.2 Where the session lives

**Decision: localStorage, one new key `kaisip_auth_v1`** (refresh token, access token, expiry). Offer a **"This is a shared computer"** tick on the sign-in sheet; it uses sessionStorage instead, so the session dies with the tab. The PKCE verifier goes in sessionStorage, deleted after the exchange.

Why not memory only:
- The learner would have to sign in with a code on every visit, which defeats sync.
- It also buys little here. With the existing `'unsafe-inline'` CSP, an injected script can use a token held in memory just as easily, by riding the page's own fetch.
- The real defences are the existing escaping at every sink plus the items below.

Honest XSS posture:
- Any XSS on kaisip.com means the session is stolen, whatever the storage. The prize is study progress and the email address.
- Deleting the account still needs a NEW sign-in within 10 minutes: `delete-account` checks `amr`, and a refresh doesn't add an `amr` entry.
- Refresh-token rotation with reuse detection logs the thief or the learner out on the next clash.

Mitigations to build now:
1. `connect-src` names only the exact Supabase host, not `*.supabase.co`.
2. Strip `?code=` and `?error=` from the address in the FIRST inline `<head>` script (`history.replaceState`) before Google Analytics or the Cloudflare beacon can record the page address. Keep the code in a JS variable.
3. Render any OAuth `error_description` as plain text only.
4. Refresh only inside `navigator.locks.request('kaisip-auth')`, re-reading storage inside the lock. Other tabs adopt the new session through the `storage` event. This avoids two tabs spending the same refresh token.
5. Show account UI only when `location.origin === 'https://kaisip.com'`, never from `file://`.

Note for later, not a blocker: the Google Analytics hosts in `img-src` and `connect-src` are a possible exfiltration channel. Removing `'unsafe-inline'` (moving inline handlers into a .js file) is the real long-term fix.

### 1.3 Web progress → the phone's sync stores

The web syncs into **the same two rows** (`progress`, `settings`) as the phone, through `syncCore` with a web `Device` port. It never uses a separate "web" row.

**Writing:**
1. Pull the account's snapshot and check it strictly.
2. Map the web state into the app shape with `readWebState`, the existing tested mapping.
3. Merge with `mergeSides` / `mergeWebProgress`.
4. Push at the rev just seen.

Because the merge starts from the pulled snapshot and only adds (union, max, earliest, newest-by-stamp), **the web can never drop phone-only fields**: lessons, games, badges, the plant, mastery, cards, moments, reports.

**Reading back (new code, `webcloud/toWeb.ts`):**

| Account field (byCert.cisa) | Web field |
|---|---|
| answers | answerLog |
| review | review |
| bookmarks (ids) | bookmarks (question copies rebuilt from the loaded bank; unknown ids skipped on the web, still kept in the account) |
| mistakes | mistakeLog |
| mocks | mockHistory |
| notesRead / notesViewed | topicReviewed / topicViewed (schema 2) |
| qNotes | qNotes |
| streak.recentDays | studyDays |

Then rebuild the web's derived counters (`score`, `ds`, `answeredIds`, `missedQuestions`) from answerLog and mistakeLog in one new function.

**Mock ids round-trip.** Today `readWebState` prefixes every web mock with `web-`. A phone mock arriving on the web must keep its id (store an origin marker), and `web-` ids must be stripped back. Otherwise every sync duplicates mocks. Required test: a property test that `toWeb(fromWeb(x))` and `fromWeb(toWeb(y))` are identities on the mapped fields, plus a two-surface convergence test (memory backend phone plus web device).

**Settings:** the web takes part in `examDates.cisa` only (last writer wins by its stamp; `aurivan_exam_date` on the web). It preserves every other synced setting it pulled.

**Never syncs:**
- from the phone: theme, motion, reminders, haptics, onboarded, displayName, the fit counters, today/days, plantSettings (as today);
- from the web: `cisa_theme`, consent, exam mode, onboarding flags, the mock in progress, the current question position, the web plant (v1; product follow-up), readinessLog, confidenceLog, sessionHistory, cleanLog, finalWeekDone, glossMastered, the name;
- anywhere: the session, the install id, the sync record.

**First sign-in when both sides have progress:** reuse `prepareFirstSync` / `confirmFirstSync`. The preview has three columns: This browser · Account · After, where After is the real merge. The choices:
- **Combine** (default);
- **Use the account's progress here** (this browser's progress is kept in an undo copy and not added);
- **Not now**.

The undo copy goes in `kaisip_sync_undo_v1` for 7 days if it fits in localStorage. If it doesn't, the existing export file downloads first and the screen says so. A different account in the same browser (account hash mismatch) asks first, with Start fresh as the default, like the phone.

**Critical: the version stamp.** `syncPlan` pauses a phone when a snapshot's `app_version` is a newer minor, and calls it "unreadable" when it is more than one major ahead. If the web wrote its own `12.40` / `13.0.0`, **every phone would stop syncing**.

Rule:
- The web writes `app_version` = the mobile `expo.version` the bundle was built from, and `store_version` = that engine's `PROGRESS_VERSION` / `SETTINGS_VERSION`.
- The web engine **follows the Play release and never leads it**. Add `mobile/LIVE_VERSION` (one line, updated after each Play rollout). The bundle builder's `--check` fails if the bundle's version is newer than it.
- A phone on a newer engine than the web makes the web pause with "Refresh the page"; a deploy fixes that within minutes.

**Multi-tab:** run one sync cycle at a time with `navigator.locks.request('kaisip-sync')`. After a pull writes `cisa_profiles_v1`, other tabs must reload state on the `storage` event. Today they only cancel a pending save.

**When the web syncs:** after the banks load, on `visibilitychange` → hidden, after a practice or mock ends, at most every 10 minutes after a change, and on Sync now. Use `keepalive` fetch only if the body is under 64 KB.

---

## 2. Mobile go-live

### 2.1 Packages (add with `npx expo install`, cloud build only)

| Package | Native? | Why |
|---|---|---|
| `@supabase/supabase-js` (same 2.x as the functions, 2.117.x) | no | Auth and REST, as the Phase 9 plan says (`flowType:'pkce'`, `detectSessionInUrl:false`, `lock: processLock`, storage = `cloud/secureSession.ts`) |
| `expo-secure-store` | yes | The session in the Keystore. The plugin keeps `configureAndroidBackup: true` (Gate I3) |
| `expo-web-browser` | yes | Google OAuth and the human check in a Custom Tab |
| `expo-crypto` | yes | `crypto.getRandomValues` for PKCE. Shim `crypto.subtle.digest('SHA-256')` with the tested `engine/sha256.ts` only if it is missing (verify on a dev build: Hermes lacks WebCrypto) |
| `react-native-url-polyfill` | no | Only if a dev build shows supabase-js needs it (verify) |
| `fflate` | no | gzip for snapshots (§3.1); the streaming inflate enforces the size cap |

**Not needed: `@react-native-google-signin/google-signin`.** Use `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo:'kaisip://auth-callback', skipBrowserRedirect:true, queryParams:{prompt:'select_account'}}})`, then `WebBrowser.openAuthSessionAsync(url, 'kaisip://auth-callback')`, then `exchangeCodeForSession(code)`.

Why:
- One native module fewer.
- No Android OAuth client and no SHA-1 fingerprints for Sky to manage.
- No captcha on this path (verify).
- The package's free version uses Google's deprecated legacy Android sign-in SDK; its Credential Manager version is paid.

Cost: a Custom Tab instead of the native account sheet, and Google's screen names the supabase.co address. PKCE protects the `kaisip://` redirect from another app claiming the scheme.

- Re-auth for deletion: a fresh OAuth sign-in with `prompt=select_account`, which adds an `amr` entry.
- Port change: `GoogleSignInPort` (ID token) becomes a `BrowserAuthPort` (`open(url, returnUrl)`) in `cloud/types.ts`. No screen changes.

**Captcha on Android:** Turnstile has no native SDK. Rather than adding react-native-webview, `CaptchaPort.token()` calls `openAuthSessionAsync('https://kaisip.com/human-check', 'kaisip://human-check')`. A tiny new page runs Turnstile and redirects to `kaisip://human-check?t=<token>`. It is only for email codes. Upgrade to react-native-webview later if the brief browser sheet bothers testers.

Also add Expo Router routes `auth-callback` and `human-check` that redirect to Today **without reading parameters**. They are for a cold start from the link, and keep the existing "no route reads link parameters" rule.

### 2.2 Flags, release config, build

- **New flag `EXPO_PUBLIC_KAISIP_BOARD`** (unset = off). Gate every board entry point behind it. Today one flag turns on accounts, sync and the board together, and the board needs moderation duty, staff MFA, the leakprint and Play UGC answers. Extend the `cloud-off` and G2 tests to cover board-off with cloud on.
- `mobile/app.config.js`:
  - port the full `assertCloudConfig` into a plain `.cjs` file, with a Jest test that it equals `configGuard.ts`;
  - when the cloud flag is on, add the `expo-secure-store` plugin (and `expo-web-browser`'s, if it has one);
  - keep the production OTA-off rule.
  - Conflict to note: content-pack Phase C adds custom Android backup rules. When it lands, set `configureAndroidBackup:false` and add the SecureStore `sharedpref` exclusion to the same rules file.
- **Production profile env.** Put these in `eas.json` → production `env`; they are public values:
  - `EXPO_PUBLIC_AURIVAN_CLOUD=1`
  - `EXPO_PUBLIC_SUPABASE_URL=https://ziadnvepttlgcowvqvom.supabase.co`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<sb_publishable_…>`. Use the new publishable key: the legacy anon key is a JWT and trips the repo's secret scanner (`eyJ…`).
  - `EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS=email,google`
  - `EXPO_PUBLIC_PRIVACY_URL=https://kaisip.com/privacy`
  - `EXPO_PUBLIC_TERMS_URL=https://kaisip.com/terms`

  Only `AURIVAN_CLOUD_GO_LIVE_ACK=yes` is set by Sky on expo.dev, on go-live day. Update `check-release-config.mjs` to match.
- **Fingerprint:** new native modules and plugins change the runtime fingerprint, so a new native build is needed. **Ship widgets (1.47) and accounts in ONE native build:** merge both PRs, then make one EAS production build (Play closed testing) and one preview APK. Name it 1.47 if widgets haven't been built yet, else 1.48.
- **Beta testers get the production profile through Play closed testing,** where OTA is off. That meets Gate 1 for signed-in phones without the paid code-signing plan. Preview APKs (unsigned OTA) are for Sky's own phone only.
- **Onboarding:** Sky's decision overrides the old rule that sign-in is never offered at onboarding. Add an optional step: "Keep your progress on every device" with Continue with Google, Email me a code, and Continue without an account. Get a mobile-ux-reviewer pass and update ARCHITECTURE §3.

### 2.3 Adapter rules (Gate 6 and the Phase 9 checklist, still binding)

- Heads select only store, rev, app_version, store_version, device_id and updated_at.
- Push is `update … where rev=$expected` with a head-only `select`. An empty result or `23505` means `conflict`.
- Error mapping: `P0001 rate_limited` → `rate_limited` with Retry-After 3600; `42501` → `invalid`; `23514` → `too_big`.
- Every call aborts after 20 s or less. Never put `error.message` in a detail; no string-built filters.
- A local sign-out calls `removeItem` itself on any error.
- Put the PostgREST error mapping in one pure module (`cloud/errorMap.ts`) used by both the mobile adapter and `webcloud`.

---

## 3. Database

### 3.1 Migration fixes before the first apply (edit in place; nothing is applied yet)

*Done in ticket 1; see Status for what changed from this text.*

**`20261005000000_init_mobile_sync.sql`:**
- Delete `public.content_packs`, `private.content_pack_stats` and the `content_packs_read` policy.
- Update:
  - `supabase/tests/10_accounts.sql` (lines 20–22, 57–61, 85);
  - `supabase/tests/01_hardening.sql` (the allowlist at line 46);
  - `scripts/check_rls.sh` (the allowlist at line 45, and the self-test sample at line 189: use `board_settings_read`);
  - `scripts/cloud_smoke.sh` (lines 68, 76, 95);
  - the ARCHITECTURE §10 table and §2's "Content delivery" row.

**`20261013000000_sync_snapshots.sql`, gzip:**
- Replace `state jsonb` with:
  - `state_gz text not null check (state_gz ~ '^H4sI[A-Za-z0-9+/]+={0,2}$' and octet_length(state_gz) <= 700000)` (built at 200,000 after the security audit, M2; base64 gzip; `H4sI` is the gzip magic number);
  - `raw_bytes int not null check (raw_bytes between 2 and 2000000)`;
  - `encoding text not null default 'gzip+base64' check (encoding = 'gzip+base64')`, which leaves room to change later.
- Change the settings constraint to `store <> 'settings' or (octet_length(state_gz) <= 32768 and raw_bytes <= 98304)`.
- Add `alter table … alter column state_gz set storage external`: base64 gzip doesn't compress further, so Postgres shouldn't spend CPU trying.
- Update the column grants to match.

**`20261013000000_sync_snapshots.sql`, one checkpoint:**
- `private.sync_history` gets the same `state_gz` / `raw_bytes` columns, with storage external.
- Change `limit 2` to `limit 1`, and update the comments.

**Matching changes elsewhere:**
- `supabase/tests/20_sync.sql`: the caps, the prefix check, "at most 1 checkpoint".
- `scripts/sync_sql_mutants.py`: change `limit 2\)` to `limit 1\)`, and add mutants for the prefix and the settings cap.
- Docs that say "two checkpoints": the privacy drafts.

**Gzip on each client:**
- A shared codec `engine/snapshotCodec.ts`: `encode → {state_gz, raw_bytes}`; `decode` checks the `1f8b` header and uses a **streaming inflate that stops at 2,000,000 bytes** (a gzip-bomb guard), then JSON.parse, then the existing strict `readSnapshot`.
- The gzip function is a port: fflate on the phone, `CompressionStream` on the web.
- Use `mtime 0` and no file name, so the output is deterministic.

**Edge Functions:** `export-my-data` (`_shared/supabaseAdmin.ts readSnapshots` / `snapshotsToStores`) decodes with a capped `DecompressionStream`. New `_shared/gz.ts` with deno tests for the bomb, a bad prefix and over-cap input.

**Why gzip is worth it** (it matters more than the earlier report said, because web plus phone doubles the pulls):
- A heavy learner is 263 KB of JSON, or 17 KB gzipped (measured in `sync-budget.test.ts`). That is about 23 KB as base64.
- Without app-level gzip, a learner on web and phone pulling about 4 times a day at about 100 KB means **3,000 learners could pass the 5 GB monthly egress**.
- With it, egress is about 1–3 GB a month at 3,000 (below).

**New beta migrations** (built as two files after the security audit: `20261027000000_beta_board_paused.sql` and `20261027000100_beta_no_passwords.sql`, the trigger wiping passwords rather than refusing them):
1. `update public.board_settings set posting_open = false` (the board stays paused).
2. A free-plan stand-in for the "reject passwords" Auth hook, which is a Teams/Enterprise feature: a `before update` trigger on `auth.users`, with its function in `private`, that refuses a newly set `encrypted_password`. It stops a stolen fresh session from adding a password. Ship it only if Supabase still allows triggers on `auth.users` (verify); otherwise record the residual risk. pgTAP-test it.

### 3.2 Free-plan sizing (estimates; gzip+base64; worst case = every user has an account)

**Per account:**
- progress: about 6 KB typical, 23 KB heavy;
- one checkpoint: the same again;
- settings: about 0.5 KB;
- auth rows and overhead: about 6–8 KB.

**Database:**

| Users | Typical | Heavy |
|---|---|---|
| 500 | about 11 MB | about 27 MB |
| 3,000 | about 65 MB | about 160 MB |
| 5,000 | about 110 MB | about 270 MB |

All under the 500 MB limit. Without gzip (Postgres's own compression, roughly 3–4×), 5,000 heavy learners come to about 775 MB.

**Egress at 3,000** (40% using two surfaces):

| Item | Per month |
|---|---|
| Heads (about 1 KB each, about 10 a day per surface) | about 1.4 GB |
| Pulls | about 1.4 GB |
| Token refreshes | about 0.5 GB |
| **Total** | **about 3.3 GB (about 66% of 5 GB)** |

The real figure is lower, because not every monthly user is active every day. At 500 users it is about 0.5 GB.

**Watch item: egress.** It is the first free limit to run out.

### 3.3 Apply order (Claude, Supabase MCP, after the fix PR is green in CI)

1. **Pre-checks:** `list_migrations` (expect none), `list_tables` (expect none), `list_extensions`.
2. `apply_migration` in this exact order, with names equal to the file names:
   1. `init_mobile_sync`
   2. `sync_snapshots`
   3. `feedback_board` (required even with the board off: `delete-account` and `export-my-data` call `svc_board_counts` / `svc_board_export`)
   4. `beta_board_paused`
   5. `beta_no_passwords` (its own migration: if the hosted project refuses a trigger on `auth.users`, only this one fails and the board pause stays)

   Record the version mapping. Afterwards, never `supabase db push` to the hosted project without `migration repair` (MCP-applied versions are timestamps; verify). Future migrations go through MCP too.
3. **`execute_sql` read-only checks:**
   - every table in `public` and `private` has RLS on;
   - no `using (true)` off the allowlist;
   - nothing granted to `anon` off the allowlist;
   - no `public` function executable by anon or authenticated off the allowlist;
   - `supabase_realtime` holds no sync or board table;
   - `content_packs` is absent.
4. `get_advisors` security and performance: zero ERROR; each WARN either fixed or explained. The leaked-password warning is a Pro feature and is accepted, with passwords blocked by the trigger.
5. **Edge Functions** (`deploy_edge_function` with `_shared/*` included): `delete-account` and `export-my-data`, `verify_jwt = true`.
   - Test with a real token. If the gateway refuses valid tokens under the new signing keys, redeploy with `verify_jwt=false`; the in-function `getUser` is the real check (verify).
   - **Not deployed in the beta:** `board-submit`, `staff-action`, `staff-digest`.
6. `get_project_url` and `get_publishable_keys`, then put the publishable key in `eas.json` and the web constant. It is public, so Sky doesn't need to paste it.

**Function code changes before deploying (Claude's PR; done in ticket 1):**
- **CORS.** `_shared/http.ts` answers 405 to `OPTIONS` and sends no CORS headers, so **the web cannot call delete or export today**. Add an exact-origin allowlist for `https://kaisip.com` only: `OPTIONS` → 204 with `Access-Control-Allow-Origin: https://kaisip.com`, and allowed headers `authorization, apikey, content-type, x-client-info`. Other origins get no header. Add deno tests.
- **Deletion audit hash** as an HMAC with the `DELETION_PEPPER` secret (Phase 9 checklist).
- **`delete-account` order.** `deleteUser` first; then the audit row, the files (retried once) and the Apple revoke, each best-effort and logged (Status, item 1).

### 3.4 Tests

- pgTAP, the SQL mutants, `check_rls.sh`, `db lint` and local advisors already run in `.github/workflows/supabase.yml` on the exact files. That must be green before step 2. Do **not** install pgTAP on the hosted project.
- Hosted evidence = the step-3 SQL checks plus `scripts/cloud_smoke.sh`, which needs two test learners' tokens. Run it **before captcha is switched on**. Two ways:
  - (a) Sky runs a 3-minute local step: two `sky+a`/`sky+b` Gmail addresses, codes, tokens into env;
  - (b) with Sky's explicit OK in their own message, Claude uses the Gmail connector to read the two test codes and runs it end to end.

### 3.5 Emergency brakes (no app release needed)

- Supabase → Auth → turn off "Allow new users to sign up".
- Stop sync writes with `revoke insert, update on public.sync_snapshots from authenticated;`. Claude can apply this through MCP with Sky's OK; phones and the web just say "We'll try again soon".
- The web: set `ACCOUNTS_ON = false` and deploy.

---

## 4. Auth settings, Google, SMTP and Turnstile

**Mirror `supabase/config.toml` on the dashboard:**
- Site URL `https://kaisip.com`.
- Redirect URLs exactly `https://kaisip.com/` and `kaisip://auth-callback`. No wildcards, no `pages.dev`, no `workers.dev`.
- JWT 3600 s. Refresh rotation on, reuse interval 10 s.
- Email: confirmations on, secure email change on, OTP 8 digits (security audit L7), expiry 600 s, resend 60 s.
- Anonymous sign-ins off; manual linking off; phone off.
- TOTP MFA on (for staff later).
- Rate limits:
  - emails 20 an hour (Resend's 100 a day / 5);
  - token verifications 30;
  - sign-ins and sign-ups 30;
  - token refresh 150.
- Email templates: code only (`{{ .Token }}`, no link) for Magic Link, Confirm signup, Reauthentication and Change email. Claude updates `supabase/templates/otp_code.html` to say "in the KaiSip app or website".
- Data API: expose `public` only. Turn off `pg_graphql` (Gate 5).
- Enforce SSL.

**Residual risk:** GoTrue has no per-code try counter; codes are 8 digits since the security audit (L7), which makes a guess 100 times less likely than 6. Captcha guards sending, not `/verify` (verify). Keep `token_verifications` low and look at Auth logs for verify-failure spikes.

**Google Cloud:**
- One **Web application** client, with redirect URI `https://ziadnvepttlgcowvqvom.supabase.co/auth/v1/callback`.
- Scopes: `openid`, `email` and `profile`, all non-sensitive, so no full verification is needed. A logo on the consent screen needs the lighter brand verification.
- Set the app to **In production**; in Testing only listed test users can sign in.
- Google shares the learner's name and photo, which Supabase stores in the user's metadata. The privacy policy must say so; KaiSip doesn't use them.
- No Android client and no SHA-1 needed under this plan (Appendix A if native sign-in is ever chosen).

**SMTP: Resend Free** (3,000 a month, 100 a day). Add domain `kaisip.com` in Resend, pick the region nearest the Philippines (verify which regions are offered), and add on Cloudflare DNS exactly what Resend shows:
- `MX send` → feedback-smtp.<region>.amazonses.com, priority 10;
- `TXT send` → `v=spf1 include:amazonses.com ~all`;
- `TXT resend._domainkey` → the DKIM key;
- DMARC: `TXT _dmarc` = `v=DMARC1; p=none; rua=<Cloudflare DMARC Management address>` for 2 weeks, then `p=quarantine`.

Leave any existing root SPF (for example from Cloudflare Email Routing) untouched. Sender: `KaiSip <codes@kaisip.com>`; SMTP `smtp.resend.com:465`, user `resend`, password = a sending-only API key.

**Turnstile (§11 Gate 3):** a Managed widget with hostname `kaisip.com`. Its secret goes in Supabase → Attack Protection → CAPTCHA (Turnstile). Turnstile's hostname check also stops clone sites from spending our email quota.

Turn captcha on **last**, after both clients send tokens and the smoke test has run. Check with an acceptance test which endpoints need a token: `/otp` yes; `/verify`, `pkce` and refresh should not (verify).

**Site changes before accounts:**
- Redirect `www.kaisip.com` to `kaisip.com` with a 301. localStorage is per address, so a learner on www would have separate progress and a separate session.
- Turn off the `workers.dev` address and retire the old GitHub Pages copy.

---

## 5. Compliance

**Privacy policy:** publish `docs/legal/cloud/privacy.html` over `privacy.html` (done as drafts in ticket 1; web **v13** publishes them with the account UI; until then they are not linked or published), updated:
- The website section now says sign-in is optional and the session is kept in browser storage, and that Turnstile (Cloudflare) runs on the sign-in form.
- `[region]` = Singapore (AWS ap-southeast-1, via Supabase).
- `[Email provider]` = Resend (US).
- Google shares name and photo with us (unused).
- Supabase log retention on Free (verify; fill in the real figure).
- **Encrypted nightly backups kept 30 days in Cloudflare R2**, so deleted data disappears from backups within 30 days.
- One support checkpoint, not two.
- No board in the beta: keep the board paragraphs commented out.
- Fill the developer-name placeholder.

**Philippine Data Privacy Act (RA 10173)**, in the policy:
- who the personal information controller is, and a contact;
- Sky named as Data Protection Officer, with the support email;
- purposes and legal basis (consent, and providing the account);
- the processors (Supabase, Resend, Cloudflare; Google as sign-in provider);
- cross-border transfer to Singapore and the US;
- retention;
- the data-subject rights and how to use them (Download my data, Delete);
- the right to complain to the National Privacy Commission;
- a breach-notification commitment (72 hours where the law requires it).

Registration with the NPC looks **not mandatory** for KaiSip: under 250 staff, no sensitive personal information of 1,000+ people, no automated decisions. Accounts require "16 or older". Two points need checking with the NPC or a lawyer (verify): whether Philippine minors (under 18) need parental consent, and whether to file the optional sworn declaration. Accept Supabase's and Resend's DPAs (verify where to sign).

**Deletion paths:**
- App: Settings → Account → Delete account (built).
- Web: Your data → Account → Delete account, with a re-sign-in within 10 minutes, then type DELETE, then call `delete-account` (needs the CORS fix).
- Publish `delete-account.html` (Play's web deletion resource), adding it to `build_site.sh` and `_headers`.
- Delete synced progress and Download my data on both surfaces.

**Play Data safety** (draft in `STORE_LISTING.md §7`; strip the board and Apple items):

| Data type | Purpose |
|---|---|
| Email address | Account management, App functionality |
| User IDs | App functionality |
| Device or other IDs (install id) | App functionality |
| App activity: App interactions and Other actions (synced progress) | App functionality |

All of these are collected, not shared, **optional** (only with an account), encrypted in transit, and deletable in the app and at `https://kaisip.com/delete-account`.

**Play App access:** "Some functionality is restricted: sign-in is optional; to test sync, use Continue with Google with any Google account" (verify that Play accepts this, or give a test Google account).

**Store rules:**
- Optional sign-in is fine on Play. Play requires in-app deletion plus a web deletion resource once accounts can be created; both are planned.
- No UGC rules apply while the board is off.
- Use Google's sign-in button branding.
- For iOS later: Sign in with Apple (4.8) alongside Google (`configGuard` already blocks Google-only iOS builds), 5.1.1(v) deletion (built), and ask app-store-compliance-reviewer about the hidden board screens (2.3.1).

---

## 6. Free-plan safeguards

**Keep-awake** (`.github/workflows/keep-awake.yml`, Claude):
- Cron `17 3 */2 * *`.
- Runs `curl` on `GET /rest/v1/board_settings?select=read_scope&limit=1` with the publishable key in `apikey`. That is a real database read anon may make.
- It fails if the project is paused, and GitHub emails Sky, so it doubles as an uptime check.
- Public-repo schedules stop after 60 days without commits; re-enable with `gh workflow enable`.
- A paused project can be restored from the dashboard (the restore window is 90 days or a year; verify).

**Backups** (`.github/workflows/db-backup.yml`, Claude; nightly at 18:30 UTC, which is 02:30 in Manila):
1. `pg_dump` 17 from the signed PostgreSQL apt repository (built this way after the audit, instead of the Supabase CLI): the schema of `public` and `private`, and the data of `public`, `private` and `auth` without sessions, tokens, one-time codes, flow state, MFA challenges or the Auth audit log. TLS checks Supabase's CA (`sslmode=verify-full`, repo variable `SUPABASE_DB_CA_CERT`). Use the **session pooler** connection string: the direct connection is IPv6-only and GitHub runners are IPv4 (verify).
2. Encrypt with `age -r $AGE_RECIPIENT`; the private key stays only with Sky.
3. Upload to R2 `kaisip-db-backups` with a token that can only touch that bucket. An R2 lifecycle rule deletes copies after 30 days; add a bucket lock if R2 offers it (verify).
4. Print the database size and our largest tables (`public`, `private`). The account and `auth.refresh_tokens` counts go inside the encrypted file (the Actions log is public). Purge deletion records older than 3 years. **Fail the job if the database is over 300 MB** (60%), so GitHub emails Sky.

The job runs in GitHub Environment `db-backup`, limited to `main`. No artefacts are uploaded. Restore drill: quarterly, on Sky's computer, with Claude guiding, into a local Supabase.

**Usage alerts:** Free has no spend to cap and no egress alert. Sky looks at Supabase → Usage, Resend usage and Turnstile analytics weekly (5 minutes). Act at 60% (SCALING.md §4).

---

## 7. Rollout order and acceptance tests

**Order:**
1. Sky Groups A–E below. Do them now; they don't depend on code.
2. Claude: DB-fix PR (migrations, tests, guard, smoke, function CORS, pepper, delete order, codec), then CI green, then MCP apply, checks, advisors, function deploy, then keep-awake and backup workflows.
3. Smoke test (captcha still off).
4. Web PR (behind `ACCOUNTS_ON=false`, with a local preview switch for testing on kaisip.com) and mobile PR (cloud adapters and board flag), merged with widgets, then ONE native build.
5. Legal pages and Play Console.
6. Sky turns captcha on, sets the go-live ack, and the web flips `ACCOUNTS_ON`.
7. Acceptance tests, then the beta opens.

**Acceptance tests (all must pass):**

*Server*
- S1. Tables as expected; no `content_packs`.
- S2. Advisors: 0 ERROR.
- S3. `cloud_smoke.sh` all pass.
- S4. RLS and grant SQL checks clean; no sync table in realtime.
- S5. A pushed gzip bomb (10 MB of zeros) pauses sync as unreadable on phone and web, and `export-my-data` refuses it cleanly.
- S6. `OPTIONS` from `https://kaisip.com` → 204 with the exact origin; from another origin → no CORS header.
- S7. With captcha on: `/otp` without a token is refused, with one it works; `/verify`, PKCE exchange and refresh work without one.
- S8. Keep-awake and backup runs are green; one backup decrypted by Sky.
- S9. On the hosted project: a new address signs in with an email code (including a second code before the first is used), Google sign-in works; `cloud_smoke.sh` with `EMAIL_A` shows a password set by a session can't be used, and `cloud_smoke.sh pre-register` shows a password set by signUp before the owner confirmed with a code can't be used either (H1).

*Web (Chrome, Firefox, Safari on iPhone)*
- W1. Google sign-in works, and `?code=` is gone before analytics fire.
- W2. Email code with Turnstile works; wrong and expired codes give calm messages.
- W3. Terms and the 16+ tick are required before the first sync.
- W4. Browser-only progress reaches the account; the phone's Combine preview shows it; afterwards both sides are equal (answers, saved questions, mocks, notes read, your notes, study days, exam date).
- W5. Both sides have progress: Combine loses nothing; "use account" keeps an undo copy.
- W6. Two tabs: still signed in after 2 hours or more, no refresh-race sign-outs, the other tab updates after a pull.
- W7. Shared-computer mode, sign out, sign out everywhere, "remove progress from this browser".
- W8. Download my data, Delete synced progress, Delete account (asks for a fresh sign-in after 10 minutes).
- W9. No account UI on `file://` or other addresses.
- W10. No CSP violations; Turnstile loads only on the email form.
- W11. Web writes `app_version` = LIVE_VERSION, and a Play-version phone does not pause.

*Android*
- M1. An OFF build is unchanged (G2/G4).
- M2. Google via Custom Tab works; Cancel shows no error.
- M3. Email code with the human check.
- M4. The session survives a restart; an offline launch works; sign-out clears the secure store.
- M5. Phone and web sync both ways; two devices at once resolve by conflict retry.
- M6. After an Android backup restore, the app is cleanly signed out.
- M7. Delete account works; a second try answers "already deleted"; rows are gone (SQL count = 0).
- M8. No board entry points.
- M9. Airplane mode: "Will sync when you're online"; study is unaffected.

*Compliance*
- C1. Privacy, terms and delete-account pages are live; Data safety, deletion URL and App access are submitted.

---

## 8. Build tickets

### Claude through MCP and repo (no owner secrets needed)

1. PR "Accounts beta: database fixes before first apply":
   - migrations §3.1 and the beta migrations;
   - tests, mutants, `check_rls.sh`, `cloud_smoke.sh`;
   - `_shared/gz.ts`, CORS, pepper HMAC, delete order;
   - docs: ARCHITECTURE §2/§10/§11, SCALING.md rewritten for Free, SECURITY_GATES status, privacy and delete-account drafts.
2. MCP: pre-checks, `apply_migration` ×4, `execute_sql` checks, `get_advisors`, `deploy_edge_function` ×2, `list_edge_functions`, `get_project_url`, `get_publishable_keys`, `get_logs` (auth, api, edge) during the tests.
3. Workflows: `keep-awake.yml` and `db-backup.yml`.
4. The smoke run (option a or b in §3.4).
5. Email template text for Sky to paste; Data safety answers; the App access text.

**Only Sky can do:** Google Cloud; Resend; Cloudflare DNS, Turnstile, R2, redirects; Supabase dashboard auth, providers, SMTP, captcha, rate limits, Edge Function secrets, DB password, extensions; GitHub Environment secrets; the Expo go-live ack; Play Console. MCP has no tools for auth settings or secrets.

**Claude must never receive:** the DB password, secret or service keys, the Google client secret, the Resend key, the Turnstile secret, R2 keys, or the age private key. **Public and fine to share:** the project URL, the publishable key, the Turnstile site key, the age public key.

### Web engineer (`web-app-engineer`; review by `cisa-ux-reviewer`)

1. The `syncMeta.ts` refactor; `mobile/src/webcloud/` (auth client, REST SyncPort, codec on CompressionStream, the web `Device`, `toWeb`/`fromWeb`); the generic bundler and `assets/kaisip-cloud.js` with `--check`; LIVE_VERSION stamping.
2. Jest:
   - PKCE S256 test vector, OTP, refresh under a lock, a 401 → one refresh;
   - error mapping;
   - codec cap;
   - round-trip property tests and the two-surface convergence test.
3. `index.html`:
   - early `<head>` script that strips the code;
   - onboarding step with the nudge and "Continue without an account";
   - an Account section in Your data (status, Sync now, Download my data, Delete synced progress, Delete account, sign out with the remove-from-browser option, the shared-computer tick);
   - Terms and 16+;
   - the first-sync preview and undo;
   - multi-tab reload;
   - derived-counter rebuild;
   - `ACCOUNTS_ON` and the preview switch;
   - origin check.
4. `_headers`:
   - `connect-src` adds `https://ziadnvepttlgcowvqvom.supabase.co`;
   - `script-src` and `frame-src` add `https://challenges.cloudflare.com`;
   - rules for the new pages `human-check.html` (strict own CSP and a hashed inline script) and `delete-account.html`.

   Add both pages and the new script to `build_site.sh`.
5. Web **v13** (MAJOR: architecture change; owner to confirm), What's New and CHANGELOG.

### Mobile engineer (`mobile-app-engineer`; review by `mobile-security-auditor`, `mobile-qa-tester`, `mobile-ux-reviewer`)

1. Packages (§2.1); `cloud/supabase/` adapters (Auth, Sync with codec; board not wired); `BrowserAuthPort`; `CaptchaPort` through the human check; crypto shims; `cloud/errorMap.ts`.
2. `EXPO_PUBLIC_KAISIP_BOARD` with tests; `app.config.js` full guard and plugins; `eas.json` production env; `check-release-config.mjs`; `check_off_bundle.sh` names.
3. The `auth-callback` / `human-check` routes; the onboarding offer; the "What syncs" copy mentions the website.
4. `sync-budget.test.ts` adds the gzip sizes; finalise the `STORE_LISTING.md §7` answers; one native build shared with widgets; `npm run shots` (light and dark) of the sign-in, onboarding and account screens.

---

## 9. Sky's checklist (plain English, in order)

**A. Lock your accounts (15 min)**
1. Turn on two-step sign-in everywhere:
   - Supabase (avatar → Account preferences → Security);
   - Cloudflare (My Profile → Authentication);
   - GitHub (Settings → Password and authentication);
   - Expo (Account settings → Security);
   - your Google account.
2. Supabase → your organisation → Billing: check it says **Free**. Don't add a card; that way Supabase can never charge you by surprise.
2a. GitHub repo → Settings → Branches → `main` → "Require a pull request before merging" → tick **"Require review from Code Owners"** (go-live gate 4: `.github/CODEOWNERS` makes you review every workflow change, because the backup job holds the database password).

**B. One web address (10 min)**

3. Cloudflare → kaisip.com → Rules → Redirect Rules → Create rule → template **"Redirect from WWW to root"** → Deploy.
4. Cloudflare → Workers & Pages → kaisip → Settings → Domains & Routes → workers.dev → **Disable**.
5. GitHub repo → Settings → Pages → set Source to **None** (retires the old copy).

**C. Email sender: Resend (30 min, plus DNS wait)**

6. Sign up at resend.com and turn on two-step sign-in.
7. Domains → Add domain → `kaisip.com` → pick the region nearest the Philippines.
8. Open Cloudflare → kaisip.com → DNS → Records in another tab. Add each record Resend shows (types MX and TXT), copying the Name and Value exactly. Proxy: DNS only.
9. Also add TXT, name `_dmarc`, value `v=DMARC1; p=none`. Or use Cloudflare → Email → DMARC Management, which adds it for you with free reports.
10. Back in Resend, click **Verify**. When it's green: API Keys → Create → "Sending access", domain kaisip.com. Keep this page open for step 22.

**D. Turnstile (5 min)**

11. Cloudflare → Turnstile → Add widget → name "KaiSip sign-in", hostname `kaisip.com`, mode **Managed** → Create.
12. Send Claude the **Site key** (it's public). Keep the **Secret key** for step 30.

**E. Google sign-in (20 min)**

13. Go to console.cloud.google.com → create project **KaiSip**.
14. **Google Auth Platform → Get started:**
    - app name KaiSip, your support email;
    - Audience **External**;
    - contact email.
15. **Branding:**
    - home page `https://kaisip.com`, privacy `https://kaisip.com/privacy`, terms `https://kaisip.com/terms`;
    - authorized domains `kaisip.com` and `ziadnvepttlgcowvqvom.supabase.co`;
    - skip the logo for now; a logo triggers a brand review.
16. **Data access → Add scopes:** `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
17. **Audience → Publish app** (moves it to "In production").
18. **Clients → Create client → Web application:**
    - name "KaiSip (Supabase)";
    - Authorized JavaScript origins `https://kaisip.com`;
    - Authorized redirect URI `https://ziadnvepttlgcowvqvom.supabase.co/auth/v1/callback`;
    - Create.

    Keep the Client ID and Client secret for step 21. **Don't paste them in chat.**

**F. Supabase dashboard (25 min). Start after Claude says the database is applied.**

19. **Authentication → URL Configuration:**
    - Site URL `https://kaisip.com`;
    - Redirect URLs: add `https://kaisip.com/` and `kaisip://auth-callback`;
    - remove anything else.
20. **Authentication → Sign In / Providers → Email:**
    - Enabled; **Confirm email ON** (a HARD go-live gate: never turn it off, see gate 1); Secure email change ON;
    - Email OTP length **8**, expiry **600**.

    Also: Anonymous sign-ins OFF, Manual linking OFF, Phone OFF, Allow new users to sign up ON. Save.
21. **Providers → Google:** Enable, paste the Client ID and Client secret, Save.
22. **Authentication → Emails → SMTP Settings → Enable custom SMTP:**
    - host `smtp.resend.com`, port `465`, username `resend`;
    - password = the Resend API key (paste it directly);
    - sender `codes@kaisip.com`, name `KaiSip`;
    - Save.
23. **Authentication → Emails → Templates:** paste the subject and body Claude gives you for Magic Link, Confirm signup, Reauthentication and Change email address.
24. **Authentication → Rate Limits:** emails sent **20** an hour, token verifications **30**, sign-ups/sign-ins **30**, token refreshes **150**. Save.
25. **Authentication → Sessions / Settings:**
    - refresh-token rotation ON, reuse interval **10** seconds;
    - access-token (JWT) expiry **3600**.
26. **Authentication → Multi-Factor:** TOTP on (for staff later; harmless now).
27. **Database → Extensions:** turn off `pg_graphql`. **Project Settings → Data API:** exposed schemas = `public` only. **Authentication → settings:** turn off writing Auth audit logs to the database (go-live gate 2; tell Claude if you can't find the switch).
28. **Database → Settings:** Enforce SSL ON. **Reset database password**: save the new one in your password manager, nowhere else.
29. **Edge Functions → Secrets → Add:** name `DELETION_PEPPER`, value = a 40-character random password from your password manager.
30. **Go-live day only, last:** **Authentication → Attack Protection → Enable CAPTCHA → Turnstile** → paste the Turnstile Secret key → Save.

**G. Backups (30 min)**

31. Cloudflare → R2 → turn it on (it may ask for a card; verify) → Create bucket `kaisip-db-backups`, location hint Asia-Pacific.
32. In that bucket: Settings → Object lifecycle rules → delete objects after **30 days**.
33. R2 → Manage API tokens → Create:
    - permission **Object Read & Write**, only bucket `kaisip-db-backups`;
    - copy the Access Key ID, Secret and endpoint.

    Then Cloudflare → Notifications → add a **billing / usage alert**.
34. On your computer, install `age`, then run `age-keygen -o kaisip-backup-key.txt`.
    - Save that file in your password manager; it's the only way to read a backup.
    - Send Claude only the line starting `age1…` (the public key).
35. GitHub repo → Settings → Environments → New `db-backup` → Deployment branches: **main** only → Add secrets:
    - `SUPABASE_DB_URL`: Supabase → **Connect → Session pooler** string, with your new DB password;
    - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`.

    Then Settings → Secrets and variables → Actions → **Variables**: `BACKUP_AGE_RECIPIENT` (the `age1…` line) and `SUPABASE_DB_CA_CERT` (Supabase → Database → Settings → SSL Configuration → Download certificate; paste the whole text, it is public). For keep-awake also `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

**H. App and Play (go-live day, 40 min)**

36. expo.dev → KaiSip → Environment variables → **production** → add `AURIVAN_CLOUD_GO_LIVE_ACK` = `yes`. This is your "accounts on" signature.
37. Play Console → App content:
    - **Data safety**: paste Claude's answers;
    - **Data deletion URL**: `https://kaisip.com/delete-account`;
    - **App access**: Claude's text;
    - check that the Privacy policy URL is `https://kaisip.com/privacy`.
38. Play Console → Testing → **Closed testing** → add the new build (Claude or the EAS workflow uploads it) → add testers.
39. Do the acceptance tests in §7 marked W and M, on your phone and computer, with Claude.

**I. Every week (5 min)**

40. Supabase → Usage: database under 300 MB, egress under 3 GB. Glance at Resend usage. Any GitHub "workflow failed" email (keep-awake or backup) means: tell Claude the same day.

**Open owner decisions (short)**
1. Board stays off in the beta (recommended).
2. Web version name v13.
3. Optional: let Claude read the two test sign-in codes through Gmail for the smoke test (say yes in your own message, or run it yourself).
4. Later: one plant across web and phone.

---

## Appendix A: native Google sign-in on Android (only if we switch later)

Add an **Android** OAuth client in Google Cloud with package `com.kaisip.app`, and the SHA-1 of BOTH:
- the EAS keystore (`eas credentials` → Android → production);
- Play Console → Setup → App signing → "App signing key certificate".

Keep the Web client ID as the audience. Then: `signInWithIdToken`; captcha may then apply to the id_token path (verify); and either the free package's deprecated legacy SDK or its paid Credential Manager edition.

## What I checked and what still needs checking

Confirmed via vendor pages (search snippets of official docs):
- **Supabase Free:** 500 MB database, 5 GB egress, 50,000 MAU, 1 GB storage, 2 projects, pauses after 1 week. 500,000 Edge Function invocations. Custom SMTP defaults to 30 emails an hour (built-in sender: 2 an hour). The password-verification hook is Teams/Enterprise only. Direct connections are IPv6; IPv4 networks use the session pooler.
- **Resend Free:** 3,000 a month, 100 a day.
- **Brevo Free:** 300 a day.
- **R2 free:** 10 GB-month, 1M Class A, 10M Class B operations, free egress.
- **GitHub:** public-repo schedules are disabled after 60 days without activity.
- **Play:** in-app plus web deletion are required when accounts can be created.
- **Turnstile:** no native SDK (WebView or browser only).
- **expo-secure-store:** `configureAndroidBackup` excludes its data from backups.
- **google-signin package:** the free version uses the legacy Android SDK; Credential Manager is the premium version.

Still (verify):
- backups on Free;
- the restore window after a pause (90 days or a year);
- Supabase log retention;
- which Auth endpoints need a captcha token;
- `verify_jwt` behaviour with the new signing keys (the docs conflict);
- whether triggers on `auth.users` are allowed;
- MCP migration version stamps;
- Resend regions and paid price;
- whether R2 needs a card, and R2 bucket locks;
- whether GitHub runners lack IPv6;
- whether Brevo adds branding;
- NPC registration thresholds and minors' consent;
- the Play App-access wording;
- Hermes WebCrypto and URL support with supabase-js.

`supabase.com` could not be fetched directly from this environment.

**Sources:**
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase IPv4/IPv6](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP.md)
- [Supabase Edge Function auth](https://supabase.com/docs/guides/functions/auth.md)
- [Supabase new API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys.md)
- [Supabase auth hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Supabase captcha](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase.md)
- [Supabase native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing.md)
- [Brevo free SMTP](https://www.brevo.com/free-smtp-server)
- [Brevo + Supabase](https://developers.brevo.com/docs/supabase-smtp-integration)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/index.md)
- [Turnstile mobile](https://developers.cloudflare.com/turnstile/get-started/mobile-implementation)
- [Expo SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [react-native-google-signin](https://github.com/react-native-google-signin/google-signin)
- [Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [GitHub disabling workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)
- [Google OAuth verification](https://support.google.com/cloud/answer/10311615)
- [NPC Circular 2022-04 summary (Baker McKenzie)](https://insightplus.bakermckenzie.com/bm/data-technology/philippines-new-npc-circular-on-registration-of-data-protection-officers-and-data-processing-systems-takes-effect_1)

## Files to change

Ticket 1 (done): `supabase/migrations/*`, `supabase/tests/*`,
`supabase/functions/_shared/{http,gz,pepper,admin,supabaseAdmin,testing}.ts`,
`supabase/functions/{delete-account,export-my-data}/*`,
`supabase/config.toml`, `supabase/templates/*`, `scripts/check_rls.sh`,
`scripts/cloud_smoke.sh`, `scripts/sync_sql_mutants.py`,
`.github/workflows/{keep-awake,db-backup}.yml`, `docs/legal/cloud/*`,
`docs/mobile/{ARCHITECTURE,SCALING,SECURITY_GATES,STORE_LISTING,AUTH_EMAIL_TEMPLATES}.md`.

Later tickets:
- `mobile/src/cloud/types.ts`, `mobile/src/cloud/runtime.on.ts`, `mobile/src/cloud/configGuard.ts`, `mobile/src/cloud/flag.ts`
- `mobile/src/cloud/memory/backend.ts` (the in-memory server must take the same `state_gz` / `raw_bytes` / `encoding` row and caps)
- `mobile/src/lib/syncCore.ts`, `mobile/src/store/sync.ts` (move `SYNC_OFF` and its types out)
- `mobile/src/engine/webImport.ts` (the `web-` mock prefix round-trip), `mobile/src/engine/syncPlan.ts` (the version pause rule behind the web stamping)
- `mobile/scripts/web-plant-bundle.cjs`, `mobile/app.config.js`, `mobile/eas.json`
- `index.html`, `_headers`, `scripts/build_site.sh` (web v13: the account UI, and publishing the legal pages)

**The snapshot format every client must follow** (from
`20261013000000_sync_snapshots.sql`): `state_gz` = standard base64 (with
padding) of gzip (mtime 0, no file name) of the UTF-8 JSON text;
`raw_bytes` = that text's byte length, exactly; `encoding` is set by the
server (`gzip+base64`) and a reader refuses any other value. A reader
unzips at most 2,000,000 bytes and refuses a size that doesn't match
`raw_bytes` (`supabase/functions/_shared/gz.ts` is the reference).
