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
| Database tests | `supabase/tests/50_beta_desk.sql` | Access, saving, duplicates, dates, approval rules (CI runs them) |
| Browser test | `scripts/beta_desk/e2e.mjs` | The real page against a real local Postgres (`scripts/beta_desk/pg_local.sh`) |
| Headers | `_headers` (`/beta-desk`) | No search indexing, no caching, a strict security policy |

## How privacy works

- The page is public, but it is an empty shell. Tester rows come from the
  database only after you sign in with an emailed code, and the database's row
  rules check **on every request** that your confirmed email is on the admin
  list. Someone who isn't an admin sees "No access" and reads nothing.
- The admin list is in `private.beta_desk_admins`, which no app user can read.
  It is filled in the Supabase SQL editor, never in a committed file, so no
  personal email sits in the repository:
  ```sql
  insert into private.beta_desk_admins (email) values ('someone@example.com');
  delete from private.beta_desk_admins where email = 'someone@example.com';
  ```
- Being a Desk admin gives no power on the feedback board, and board staff see
  no tester.
- The sign-in stays in the browser tab unless you tick "Keep me signed in on
  this device". Use that only on your own devices.
- An exported CSV holds names and emails. Keep it private and delete it after
  use. Formulas in names (`=…`) are neutralised so a spreadsheet won't run them.

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

## If the sign-in check (captcha) is switched on

When Supabase Auth's captcha is turned on (go-live gate F30), the page shows
the Cloudflare Turnstile check after the first refused attempt. The hosts are
already allowed in `_headers`.
