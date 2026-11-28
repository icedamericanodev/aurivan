# KaiSip sign-in emails (paste into Supabase)

**For:** Sky, step F23 of the accounts beta checklist
(`docs/mobile/ACCOUNTS_BETA_PLAN.md` §9).
**Where:** Supabase dashboard → **Authentication → Emails → Templates**.
**Source of truth:** `supabase/templates/otp_code.html`,
`supabase/templates/password_reset_code.html` and
`supabase/templates/email_change_code.html` (the local stack uses them, see
`supabase/config.toml`). If you change the wording here, change those files
in the same pull request. The two security notices (§7, §8) exist only on the
hosted dashboard.

## Rules these emails follow

- **A code only, never a link.** Every template shows the 8-digit code,
  `{{ .Token }}`, and no button or link. (The two security notices, §7 and
  §8, carry neither a code nor a link.) A link in a sign-in email can be
  opened by email scanners and copied by phishing pages; a code has to be
  typed into KaiSip by the learner.
- The code works for **10 minutes** (Email OTP expiry 600 seconds) and is
  **8 digits** (Email OTP length 8; security audit L7). If either setting changes, change the
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
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">Enter this 8-digit code in the KaiSip app or on the KaiSip website to continue:</p>
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
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">Someone asked to change the email of a KaiSip account from {{ .Email }} to {{ .NewEmail }}. If it was you, enter this 8-digit code in the KaiSip app or on the KaiSip website:</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#17231B">{{ .Token }}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">It works for 10 minutes. We send a code to both addresses, and the change happens only when both codes are entered.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#465349">If you didn’t ask for this, don’t enter the code and nothing changes. KaiSip never asks for this code by email, chat or phone.</p>
```

## 5. Reset Password (the "Forgot password" code)

Sent when a learner taps **Forgot password** (passwords: owner decision,
28 Nov 2026). It is also how someone who signed up with Google or a code adds
a password later. A code, never a link: it works on any device, and email
scanners can't use it up. (Since 28 Nov 2026 this replaces the old "sign-in
code" wording here.) The wording does not claim the reset code is the only way
in: a sign-in code works the same way (password audit MEDIUM-1).

**Subject:**
```
Your KaiSip password reset code
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">Reset your KaiSip password</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">Enter this 8-digit code in the KaiSip app or on the KaiSip website, then choose your new password:</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#17231B">{{ .Token }}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">It works for 10 minutes. If you didn’t ask to reset your password, you can ignore this email: your password stays the same.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#465349">KaiSip never asks for this code by email, chat or phone. Don’t share it with anyone.</p>
```

## 6. Invite user

Not used (KaiSip never invites by email). Leave it as it is.

## 7. Password changed (security notification; a go-live gate)

**Where:** Authentication → Emails → **Security notifications → Password
changed**. Turn it **ON** and paste the text below. It is a HARD go-live gate
(`docs/WEB_LAUNCH_PLAN.md` gate 15): it is how a learner finds out that someone
else set or changed their password. If the dashboard doesn't offer it on the
Free plan with custom SMTP, tell Claude: passwords then wait for an in-app
notice instead.

Sent after a password is added or changed. The Auth server sends it just
before the change is saved, so a change the database refuses can still send
it; the support copy says so.

**Subject:**
```
Your KaiSip password was changed
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">Your KaiSip password was changed</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">A password was just added to, or changed on, the KaiSip account for {{ .Email }}. Your other devices were signed out.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">If this was you, there’s nothing to do.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">If it wasn’t you: open the KaiSip app or website, choose <strong>Forgot password</strong>, and set a new one with the code we email you. Then tell us at the support address in the app.</p>
```

## 8. Sign-in method linked (security notification; turn on if offered)

**Where:** Authentication → Emails → Security notifications → **Identity
linked** (or the nearest name). `{{ .Provider }}` is the method's short name
(for example `google`).

**Subject:**
```
A new sign-in method was added to your KaiSip account
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">A new way to sign in</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">You can now sign in to the KaiSip account for {{ .Email }} with: {{ .Provider }}.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">If this wasn’t you, open the KaiSip app or website, choose <strong>Forgot password</strong> to set a new password, and tell us at the support address in the app.</p>
```

The other security notifications (email changed, phone changed, MFA factor
added or removed), if the dashboard offers them, may stay at Supabase's
defaults for now: KaiSip doesn't offer those changes to learners.

---

## After pasting: a 2-minute check

1. Sign in on the website or the app with your own email. The email arrives
   from `KaiSip <codes@kaisip.com>` (custom SMTP, step F22), with the code and
   no link.
2. Enter a wrong code once: the screen says it didn't work, calmly.
3. Wait 11 minutes and try the old code: it is refused (expired).
4. In Gmail, open the email's "Show original": SPF, DKIM and DMARC all say
   PASS (the Resend DNS records, steps C8 and C9).
5. Tap **Forgot password** with your own address. The email says "password
   reset code", has no link, and comes from `codes@kaisip.com`. Set a new
   password with it: a "Your KaiSip password was changed" email arrives (§7).
