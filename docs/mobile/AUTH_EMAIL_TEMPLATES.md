# KaiSip sign-in emails (paste into Supabase)

**For:** Sky, step F23 of the accounts beta checklist
(`docs/mobile/ACCOUNTS_BETA_PLAN.md` §9).
**Where:** Supabase dashboard → **Authentication → Emails → Templates**.
**Source of truth:** `supabase/templates/otp_code.html` and
`supabase/templates/email_change_code.html` (the local stack uses them, see
`supabase/config.toml`). If you change the wording here, change those files
in the same pull request.

## Rules these emails follow

- **A code only, never a link.** Every template shows the 6-digit code,
  `{{ .Token }}`, and no button or link. A link in a sign-in email can be
  opened by email scanners and copied by phishing pages; a code has to be
  typed into KaiSip by the learner.
- The code works for **10 minutes** (Email OTP expiry 600 seconds) and is
  **6 digits** (Email OTP length 6). If either setting changes, change the
  text.
- Plain words, no marketing, no images. They say what to do, how long the
  code works, and what to do if you didn't ask for it.
- They work for both places a learner signs in: "the KaiSip app or the
  KaiSip website".

## How to paste

For each template below:
1. Open the template in the dashboard.
2. Replace the **Subject** with the subject below.
3. Switch the body editor to source (`<>`) if it offers one, select
   everything, and paste the body below exactly, including `{{ .Token }}`.
4. Save. Then send yourself a test (sign in with your own email) and check
   the code shows large and the email has no link.

---

## 1. Magic Link (the sign-in code for an existing account)

**Subject:**
```
Your KaiSip sign-in code
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">Your KaiSip code</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">Enter this 6-digit code in the KaiSip app or on the KaiSip website to continue:</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#17231B">{{ .Token }}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">It works for 10 minutes. If you didn’t ask for it, you can ignore this email: nobody can sign in without the code.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#465349">KaiSip never asks for this code by email, chat or phone. Don’t share it with anyone.</p>
```

## 2. Confirm signup (the first code, for a new account)

**Subject:**
```
Your KaiSip sign-in code
```

**Body:** the same as template 1. (A learner signing in for the first time
gets this one; they don't need to know the difference.)

## 3. Reauthentication (a code to confirm it's you)

KaiSip asks for a fresh sign-in before deleting an account, which sends
template 1. This template is only used if a future screen asks Supabase to
re-confirm a signed-in learner. Set it anyway, so it never shows Supabase's
default text.

**Subject:**
```
Your KaiSip confirmation code
```

**Body:** the same as template 1.

## 4. Change Email Address

Sent when a learner changes their account's email (if a screen offers it).
With **Secure email change** on, Supabase sends this email to BOTH the old
and the new address, each with its own code; the change happens only when
both are entered. `{{ .Email }}` is the current address and
`{{ .NewEmail }}` the new one.

**Subject:**
```
Confirm your new email for KaiSip
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">Confirm your new email</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">Someone asked to change the email of a KaiSip account from {{ .Email }} to {{ .NewEmail }}. If it was you, enter this 6-digit code in the KaiSip app or on the KaiSip website:</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#17231B">{{ .Token }}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">It works for 10 minutes. We send a code to both addresses, and the change happens only when both codes are entered.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#465349">If you didn’t ask for this, don’t enter the code and nothing changes. KaiSip never asks for this code by email, chat or phone.</p>
```

## 5. Reset Password (not used, but set it)

KaiSip has no passwords, but anyone can ask Supabase's API for a "reset
password" email, and Supabase's default one carries a **sign-in link**. Make
it a plain code like the others, so no KaiSip email ever carries a link.
(The database refuses any new password on a confirmed account anyway:
`supabase/migrations/20261027000000_beta_hardening.sql`.)

**Subject:**
```
Your KaiSip sign-in code
```

**Body:** the same as template 1.

## 6. Invite user

Not used (KaiSip never invites by email). Leave it as it is.

---

## After pasting: a 2-minute check

1. Sign in on the website or the app with your own email. The email arrives
   from `KaiSip <codes@kaisip.com>` (custom SMTP, step F22), with the code and
   no link.
2. Enter a wrong code once: the screen says it didn't work, calmly.
3. Wait 11 minutes and try the old code: it is refused (expired).
4. In Gmail, open the email's "Show original": SPF, DKIM and DMARC all say
   PASS (the Resend DNS records, steps C8 and C9).
