# KaiSip Beta Desk

A private tracker for the Android beta: every tester from first signup to
thank you. Only admins can use it. Learners never see it, and nothing links to
it from the site.

**Address:** `https://kaisip.com/beta-desk` (live after the next website deploy).

## Where it lives

| Piece | File | What it does |
|---|---|---|
| The page | `beta-desk.html` | Layout and styles (Grove). Holds no tester data and no secret |
| The page's code | `assets/beta-desk.js` | Sign-in, roster, editor, CSV import/export, date logic |
| The database | `supabase/migrations/20261104000000_beta_desk.sql` | `public.beta_testers`, `public.beta_desk_settings`, the admin list `private.beta_desk_admins`, the row rules |
| Database tests | `supabase/tests/50_beta_desk.sql` | Access (incl. MFA and unusual accounts), saving, duplicates, dates, approval rules (CI runs them) |
| Browser test | `scripts/beta_desk/e2e.mjs` | The real page against a real local Postgres (`scripts/beta_desk/pg_local.sh`) |
| Headers | `_headers` (`/beta-desk`) | No search indexing, no caching, a strict security policy |

## Signing in (two steps)

1. Enter your admin email and complete the human-verification check. The server
   checks eligibility before sending an 8-digit email code. Other addresses
   receive “This is not an admin account” and no code from Beta Desk.
2. A 6-digit code from an authenticator app (Google Authenticator, Microsoft
   Authenticator, 1Password…). The first time, the desk shows a QR code to scan
   once; after that it just asks for the code.

Tester details are personal data, so a stolen everyday KaiSip sign-in (from
the phone or the website) is not enough to open the desk: the database itself
refuses tester rows unless the sign-in included the authenticator step.

The sign-in lives in that browser tab only. Closing the tab signs you out
there. On a shared computer, still press **Sign out** when you finish.

## Adding an admin

Admins are listed by account, not by email. Use an existing confirmed KaiSip
account, or invite the person through Supabase Authentication and have them
complete email verification first. Beta Desk no longer creates accounts or
provides a first-sign-in bootstrap. Then, in the Supabase SQL editor:

```sql
insert into private.beta_desk_admins (user_id)
  select id from auth.users where email = 'someone@example.com' and email_confirmed_at is not null;
-- remove:
delete from private.beta_desk_admins
  where user_id = (select id from auth.users where email = 'someone@example.com');
```

They sign in again and are asked to set up the authenticator.

Keep this order: **list first, then the authenticator.** Since the password
guard (`supabase/migrations/20261128000000_password_guard.sql`), only accounts
in `private.beta_desk_admins` or `private.staff` can set up an authenticator
app, so a learner's account (or a thief holding one) can never use one to lock
the real owner out. Factors already set up keep working; an admin taken off the
list keeps theirs but can't add a new one.

## How privacy works

- The page is public, but it is an empty shell. Tester rows come from the
  database only after an admin's two-step sign-in, and the database's row
  rules check it **on every request**. Someone who isn't an admin sees "No
  access" and reads nothing (and is never asked to set up an authenticator).
- The admin list (`private.beta_desk_admins`) can't be read by any app user and
  is never in a committed file, so no personal email sits in the repository.
  Anonymous, SSO, banned or deleted accounts never count, even if listed.
- Being a Desk admin gives no power on the feedback board, and board staff see
  no tester.
- The CSV import copies only name, email, device and the signup date. The
  form's other answers go into notes only if you tick that box.
- An exported CSV holds names and emails. Keep it private and delete it after
  use. Formulas (`=…`, also after spaces) are neutralised so a spreadsheet
  won't run them.
- Gmail ignores dots and anything after `+`, so `j.o.e+beta@gmail.com` and
  `joe@gmail.com` are caught as the same tester.

## Terms: new testers and earlier sign-ups

Every tester record keeps the exact terms that person was offered (the live
form: "earlier registrants retain the eligibility conditions offered when they
registered"). The desk's default (Settings) is the live form's terms:

> Join the Android closed test before the public Google Play launch, stay opted in for at least 14 consecutive days and try the CISA content and app features. A technical problem that blocks testing does not disqualify you. Reward: 6 months of CISA premium content and mobile app study features, starting when your CISA access is activated. Other certifications are excluded.

Earlier sign-ups were offered more. Before importing their rows, set Settings
to the terms they saw, import, then set it back:

> Stay in the Android test for 14 days, or send at least one piece of feedback during the beta. Reward: 6 months of KaiSip Premium free once paid features launch.

The desk suggests approving "by feedback" only for testers whose terms say
feedback qualifies (their terms mention "or" and "feedback"). The database
accepts either route; you decide, by the terms on record.

## Deleting records on time

The privacy policy (section 3e) and the form promise: routine beta records
are deleted within 90 days after the beta ends; for a tester still owed or
using the reward, only the minimum is kept (email, eligibility and activation
dates), deleted within 3 months after the reward ends. Within 90 days of the
beta ending, trim rewarded testers to that minimum (Supabase SQL editor):

```sql
update public.beta_testers
   set device = '', feedback_summary = '', technical_issues = '', notes = '',
       follow_up_on = null, follow_up_note = ''
 where completion = 'approved';
``` The desk shows a
**Delete their record** step for them, and the **Due for deletion** filter
lists them. Delete one by opening the tester → Delete. To clear every record
whose reward ended more than 3 months ago in one go (Supabase SQL editor):

```sql
-- Reward ended more than 3 months ago
delete from public.beta_testers where reward_ends_on < current_date - interval '3 months';
-- Not eligible or interrupted, decided more than 3 months ago
delete from public.beta_testers
 where (completion = 'not_eligible' or participation = 'interrupted')
   and coalesce(participation_checked_on, registered_on) < current_date - interval '3 months';
```

- When the test ends, mark anyone who never joined as **Not eligible**, so
  they show under **Due for deletion**.
- When you delete a record, also delete that tester's row in the Google Sheet
  and any CSV you exported. Remove them from the Play Console list only after
  the test is over.
- Testers can ask for a copy of their record, notes included. Write notes as
  plain facts about the testing (dates, what broke, what you agreed). Never
  write health, family, religion or money reasons for a gap, even if the
  tester tells you; write "personal reason, accepted".
- Encrypted nightly backups keep a deleted record for up to 30 days (the
  privacy policy says so).
- If you ever add a second admin, update privacy.html section 3e first ("Only
  the maintainer can open it").

## Automatic vs. manual

Nothing here syncs with Google Forms or Google Play.

| Automatic (the database and page work it out) | Manual (you do it) |
|---|---|
| Review date = Google Play opt-in + 14 days (never the signup) | Download the Google Forms CSV and import it |
| Reward end = reward activation + 6 months (31 Aug → 28/29 Feb) | Send the Play invite, then record it |
| Stage, next step, "Needs attention", follow-ups due | Confirm the real opt-in in Play Console, then record it |
| Duplicate emails skipped on import and refused on save | Check continuous participation and technical issues |
| Approval blocked before day 14 or without a passed check | Approve completion |
| A reward can't start before the approval | Switch on CISA premium in the app, then record the date |

The reward is six months of **CISA** premium content and app features. Other
certifications are not included.

## Rules the database enforces

- One record per email (any capitals or spaces).
- An opt-in can't be before the invitation.
- A participation result needs the date it was checked; "Technical gap,
  accepted" needs a note.
- Approval needs: an opt-in date, approval on or after day 14, a passed check
  (continuous, or a technical gap you accepted), and the terms on record.
- A reward needs an approval and starts on or after it.

## Running the tests

```bash
bash scripts/beta_desk/pg_local.sh supabase/tests/01_hardening.sql supabase/tests/50_beta_desk.sql
node scripts/beta_desk/e2e.mjs /tmp/beta-desk-e2e
```

The first needs local Postgres server binaries and pgTAP
(`apt-get install postgresql-16-pgtap`). The second uses the preinstalled
Playwright and writes screenshots to the folder you give it. Neither touches
the hosted project.

## Later improvements (noted by the security audit)

- Serve the desk from its own address (for example `desk.kaisip.com`), so no
  other page of kaisip.com shares its browser storage.
- Turn on Supabase's session time limit or inactivity timeout when the plan
  allows it.
- Cloudflare Web Analytics is blocked on this page on purpose (its policy
  allows no analytics).

## If the sign-in check (captcha) is switched on

Beta Desk always requires Cloudflare Turnstile before checking eligibility,
independently of the general Supabase Auth captcha setting. The hosts are
already allowed in `_headers`.


## Deploying the pre-email admin check (9 Nov 2026)

Deploy the backend BEFORE publishing the new page code:

1. Apply `supabase/migrations/20261109000000_beta_desk_sign_in.sql`.
2. Set `BETA_DESK_TURNSTILE_SECRET` in Supabase Edge Function secrets to the
   secret matching the page's existing Turnstile site key. Never commit it.
3. Deploy `beta-desk-sign-in` with JWT verification disabled, as configured
   in `supabase/config.toml`. It is pre-login; CAPTCHA is checked on the server.
4. Test the function with fresh Turnstile tokens from kaisip.com: a non-admin
   receives `not_admin` and no email; an existing admin receives one code.
5. Publish the page and script; verify email-code sign-in followed by MFA.
   Do not merge the frontend until backend deployment is confirmed. Missing
   configuration fails closed and would otherwise block admin sign-in.

The RPC is executable only by service_role, not by anon or authenticated.
The function returns fixed errors, never admin records or setup instructions.
An explicit rejection necessarily reveals eligibility for the submitted email;
mandatory single-use CAPTCHA limits automated probing. It does not disclose
an admin list. Existing MFA and tester-table RLS remain the authority after
sign-in (including removal of an admin during sign-in).

The shared Supabase Auth endpoint remains available for ordinary KaiSip
accounts; this gate prevents non-admin email delivery through Beta Desk, not
all email authentication across the project.
