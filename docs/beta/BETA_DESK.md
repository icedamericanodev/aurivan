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

1. Your email → an 8-digit code arrives by email.
2. A 6-digit code from an authenticator app (Google Authenticator, Microsoft
   Authenticator, 1Password…). The first time, the desk shows a QR code to scan
   once; after that it just asks for the code.

Tester details are personal data, so a stolen everyday KaiSip sign-in (from
the phone or the website) is not enough to open the desk: the database itself
refuses tester rows unless the sign-in included the authenticator step.

The sign-in lives in that browser tab only. Closing the tab signs you out
there. On a shared computer, still press **Sign out** when you finish.

## Adding an admin

Admins are listed by account, not by email. The person signs in at
`kaisip.com/beta-desk` once (they will see "No access"); then, in the
Supabase SQL editor:

```sql
insert into private.beta_desk_admins (user_id)
  select id from auth.users where email = 'someone@example.com' and email_confirmed_at is not null;
-- remove:
delete from private.beta_desk_admins
  where user_id = (select id from auth.users where email = 'someone@example.com');
```

They sign in again and are asked to set up the authenticator.

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

## Deleting records on time

The privacy policy (section 3e) promises deletion within 3 months after a
tester's reward ends, and for testers who are not eligible. The desk shows a
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

When Supabase Auth's captcha is turned on (go-live gate F30), the page shows
the Cloudflare Turnstile check after the first refused attempt. The hosts are
already allowed in `_headers`.
