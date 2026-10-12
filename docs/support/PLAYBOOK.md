# Aurivan support playbook (maintainer)

How learner emails reach the team, how to sort them, what to reply, and how
a fix closes the loop in the app. Written for mobile 1.7 ("Ask and fix").
Every email comes through the learner's own email app; the app sends nothing.

Inbox: **certprep.support@gmail.com** (built into the app as the default in
`mobile/src/lib/config.ts`; `EXPO_PUBLIC_FEEDBACK_EMAIL` can override it).

> **Promise rule.** User-facing copy says only "We read every report" /
> "We read every message". No reply time and no fix date appears in the app,
> the website or a canned reply until the owner approves the targets below.

---

## 1. What arrives

Every subject starts with `Aurivan ·` and carries tags a filter can read:

| Kind | Subject | Example |
|---|---|---|
| Report a problem | `Aurivan · Report · <CERT> · <item> · <reason>` | `Aurivan · Report · CISA · d4_217 · key` |
| Send feedback | `Aurivan · Feedback · <Idea \| Like \| Other> · <CERT>` | `Aurivan · Feedback · Idea · CISA` |
| Contact support | `Aurivan · Support · <topic> · <CERT>` | `Aurivan · Support · Backup · CISA` |

`<item>` is the question code as learners see it (`d4_217`), or a reference
for everything else: `note:4A2.3`, `lesson:cisa-l-d1-charter#3` (step 3),
`card:rumor:4B1.2:k1x9`, `app:settings`.

**Reason codes** (`mobile/src/engine/support.ts` `REASONS`):

| Item | Codes |
|---|---|
| Question | `key` · `two-right` · `unclear` · `explanation` · `tip-letter` · `typo` · `outdated` · `other` |
| Note | `incorrect` · `unclear` · `diagram` · `missing` · `typo` · `outdated` · `other` |
| Lesson step | `incorrect` · `key` · `order` · `unclear` · `typo` · `other` |
| Game card | `incorrect` · `key` · `unclear` · `typo` · `other` |
| The app | `freeze` · `display` · `score` · `timer` · `reminder` · `other` |

**Support topics:** `Study` · `Backup` · `Reminders` · `Privacy` · `Other`.

**The report body** ends with a block the learner is asked to keep:

```
Item: Question d4_217 (IS Operations)
Part: Answer key
Reason: The marked answer looks wrong
Your pick: A (shown as C)
Suggested answer: B (shown as D)
Shown order (screen = bank): A=C, B=D, C=A, D=B
Where: Practice review · Quick 10
Certification: CISA
App: Aurivan 1.7.0 (iOS 26)
Content reviewed: Oct 2026
Ref: R-7K2Q
```

- **Letters are the bank's original letters**, with the letter the learner
  saw in brackets. Check the claim against `data/domain{N}.json` directly;
  never re-map them.
- **Ref** is a random code made on the phone. Quote it in your reply so the
  learner can match it in Your reports. It links to nothing.
- The email never carries a name, exam date, score, progress, device id or
  question text. The learner's address is visible because they sent it.

---

## 2. Gmail setup (once)

1. **Account hygiene.** A dedicated Google account (not a personal one), with
   2-Step Verification on a passkey or security key, and recovery options
   the business owns. Expect spam: the address ships inside the app.
2. **Labels:** `Aurivan/Report`, `Aurivan/Report/Key`, `Aurivan/Feedback`,
   `Aurivan/Support`, and status labels applied by hand: `Checking`,
   `Fixed vX`, `No change`, `Disputed`, `Exam content`.
3. **Filters** (Settings → Filters → Create). Gmail ignores the `·` dots, so
   the phrase matches. Press **Search** first and confirm a test email shows up.

   | Search | Action |
   |---|---|
   | `subject:"Aurivan Report"` | Label `Aurivan/Report` |
   | `subject:"Aurivan Report" subject:(key OR "two-right")` | Label `Aurivan/Report/Key`, star it, mark important |
   | `subject:"Aurivan Feedback"` | Label `Aurivan/Feedback` |
   | `subject:"Aurivan Support"` | Label `Aurivan/Support` |
   | `subject:"Aurivan"` | Send the auto-acknowledgement template (§4.1) |

4. **Templates:** Settings → Advanced → Templates → On. Save each reply in §4
   as a template.
5. **Triage sheet** (a free Google Sheet), one row per item: item, first
   report date, number of reports, reason, status, fixed in (version), ref(s).
   It is the only metrics source (the app has no analytics). Never record
   learners' addresses in it.
6. **Retention: 12 months** after the issue is resolved (owner decision,
   Phase 1 review), then delete the thread; sooner if the learner asks. This
   is the promise in `privacy.html` (§3c and §6) and `support.html` §4: keep
   them in step if it ever changes.

---

## 3. Triage cadence

Proposed: **two short batches a week (Monday and Thursday), oldest first.**

1. **Group by item.** Search the code (`d4_217`) to find every report about it.
2. **Wrong key or two right answers** (`key`, `two-right`) go first, whatever
   else is waiting: correctness comes first.
   - Check with the content reviewers (root `CLAUDE.md`): `qa-question-tester`
     (blind) and `cisa-d{N}-standards-auditor`.
   - They agree it's wrong → fix (§5).
   - They agree it stands → reply "Checked, no change" (§4.4) with the principle.
   - They still disagree after one fix attempt → **escalate to the
     maintainer** (a "major" issue in `CLAUDE.md`), label `Disputed`, reply §4.6.
3. **Other content** (explanation, tip letter, typo, outdated, notes,
   lessons, cards): fix in the next content batch, or reply why not.
4. **App problems** (`app:` items, `display`, `freeze`, `timer`…): reproduce
   with the App and Display lines; open a fix in the mobile backlog.
5. **Feedback and ideas:** reply §4.8, log the idea in the sheet. If it joins
   the plan, add it to the internal roadmap (kept outside this public repo, never shown
   in the app) in plain words, no dates. Ideas are not listed in the app;
   when one ships, it goes in What's new (`WHATS_NEW` in
   `mobile/src/content/support/index.ts`) as one plain benefit sentence.
6. **Support:** answer from the FAQ where it helps (`FAQ` in the same file);
   if a question keeps coming, improve the FAQ entry.

**Internal targets (proposal, for the owner to approve; never shown to
learners until approved):** a first human reply within 3 working days;
a triage verdict within 72 hours; a confirmed wrong key fixed in the next
release (aim: 7 days). If two months in a row miss a target, change the
target, not the evidence.

Expect most reports to end "checked, no change" (Duolingo reports about 10%
of user reports lead to a fix). The reply is what earns trust then.

---

## 4. Canned replies

Plain words, one idea per sentence, sign off "The Aurivan team". Never quote
the learner's exam date, scores or anything else about them.

### 4.1 Auto-acknowledgement (Gmail filter on `subject:"Aurivan"`)
> Thanks for writing to Aurivan. This is an automatic note to say your message
> arrived. A person reads every one, and if your report leads to a fix it will
> be listed in What's new in the app.
> The Aurivan team. Aurivan is independent and not affiliated with ISACA.

### 4.2 Fixed
> Thank you. You were right about question {code}: {one plain sentence on what
> was wrong}. It's corrected in Aurivan {version}. Once you update, Your reports
> (Settings → Help and feedback) will show it as updated. Reports like yours
> are how the questions get better.

### 4.3 Need more detail
> Thank you for flagging {code}. To check it properly we need a little more:
> which answer do you think is best, and why? A sentence or two is plenty.

### 4.4 Checked, no change (the answer stands)
> Thank you for flagging question {code}. We checked it against
> {framework or reference}, and the marked answer stands: {one-line principle}.
> We've {made the explanation clearer / left it as it is}. If you still see it
> differently, reply and tell us why. We read every reply.

### 4.5 Known issue
> Thank you. We already know about this one and a fix is in progress. When it
> ships, it will be listed in What's new.

### 4.6 Disputed key (escalated)
> Thank you. Two reviewers looked at this and don't agree yet, so it's with the
> maintainer. We'll write again when it's settled.

### 4.7 Data help (backup, restore, new phone)
> Thanks for writing. Your progress lives only on your phone. To move it: on the
> old phone, Settings → Your data → Save a backup, and keep the file somewhere
> the new phone can reach. On the new phone, choose Restore from a backup on the
> welcome screen (or later in Settings). {Answer to their specific question.}

Never ask for a backup file by default. If one is truly needed, ask, explain
what it contains (progress and settings, no name or email), and delete it
once done.

### 4.8 Idea logged
> Thank you, this is a good one. We've added it to our list. We can't promise
> when or whether it ships, but we read every idea, and when it’s ready,
> you’ll see it in What’s new in the app.

### 4.9 Real exam content (delete the content first)
> Thank you for taking the time to write. Your message seems to describe a
> question from the live exam. Candidates agree to keep exam content
> confidential, so we've deleted it and won't use it. If something in one of
> Aurivan's own questions looks wrong, send us its code and we'll review it.

Then: delete the exam content from the thread, never paraphrase it into the
bank, label `Exam content`, and log only "rejected: possible live exam
content" in the sheet.

---

## 5. Closing the loop: shipping a fix

In the **same pull request** as the content fix:

1. Fix the source (`data/tips_overrides/d{N}.json` or the question source),
   regenerate (`python3 scripts/convert_test_bank.py {N}`), and run
   `npm run check` in `mobile/`.
2. Add one entry to `mobile/src/content/support/fixes.json`:

   ```json
   { "ref": "q:d4_217", "cert": "cisa", "date": "2026-11-02", "fixedIn": "1.7.1",
     "kind": "corrected",
     "publicNote": "The answer key was corrected, and the explanation now says why." }
   ```

   - `ref`: the item reference from the report subject (`q:` + the code for
     questions; a lesson without `#step` covers every step).
   - `fixedIn`: the app version the fix ships in (`expo.version` of that
     release, e.g. `1.7.1`). Required. Reports made on an OLDER version are
     credited, including one made on the ship day or on an old build after
     the release (the learner hadn't updated yet). Card reports use the
     stable id from the subject (`card:role:1A1.3:r001`, `card:seq:…`).
   - `date`: the day the release ships (YYYY-MM-DD), shown to learners. Only
     used for matching when a report has no version.
   - `kind`: `corrected`, `clarified` or `removed`.
   - `publicNote`: ONE general sentence. No codes, no question text, no counts.
     `src/__tests__/support-content.test.ts` checks it.
3. Add the release's line to `WHATS_NEW` (same folder), in the What's New
   style, and use the general credit in store release notes:
   "Fixed thanks to learner reports."
4. After the release, reply with §4.2 and label `Fixed vX`.

On the learner's phone, Your reports then shows "Updated after your report"
with the note, and Today (or What's new, if they open it first) shows
"Updated after your report" once; Today's line can be dismissed. Nothing is uploaded: the phone matches the
bundled list against its own reports.

---

## 6. Store and privacy notes

- **App Store Support URL:** `support.html` on the website (address, what to
  include, common questions, not-affiliated line).
- **Privacy labels stay "Data Not Collected"**: the learner's own email app
  sends, and the app transmits nothing. Re-check with
  `app-store-compliance-reviewer` before each submission.
- The privacy policy names Gmail (Google) as the support inbox's provider
  (§5 table and §6), with the 12-month retention.

---

# The feedback board (Uplift Phase 8, built OFF)

Sections 7–12 apply only once the feedback board goes live (Phase 9, owner
go-ahead). Today the board is built and switched off: nobody can post, and
nothing below needs doing yet. Where things are: the staff queue is in the
app, **You → Help and feedback → Feedback board → Moderation** (shown only to
staff accounts; the server checks every action); the rules are
`docs/legal/cloud/community.html`; the server side is
`supabase/migrations/20261014000000_feedback_board.sql` and the
`board-submit`, `staff-action` and `staff-digest` Edge Functions.

## 7. The 24-hour duty (owner decision)

- A named moderator (default: the owner) opens **Moderation at least once
  every 24 hours, 7 days a week**. The daily digest email is the reminder.
- Anything held is invisible to learners, so a wait never exposes anything
  bad. **Reports are the 24-hour clock**: learners are told "We review
  reports within 24 hours".
- **If you can't cover a 24-hour window** (travel, illness), tap **Pause
  posting** in Moderation first (it asks once).
  - Reading and voting continue. New posts and comments are refused with
    "Posting is paused for a short while. Reading and voting still work."
  - **Pausing stops new posts only. Reports still arrive and still need a
    review within the promised time.** A report hides a post only for the
    person who reported it (unless it comes from an established member and
    says "real exam content"), so abuse stays visible to others until you
    act. For a longer absence, also switch the read scope to
    `author_staff` (one SQL line, ARCHITECTURE §10) so posts are seen only by
    their authors and the team.
  - Tap **Reopen posting** when you're back.
- **Go-live reminder:** Phase 9's checklist makes the owner re-confirm this
  duty in writing. Restate it in the merge summary of every PR that touches
  the board.

## 8. Daily queue routine (about 10 minutes at the expected volume)

1. **Reported**, oldest first. **"Shares real exam content" sorts first.**

   | Finding | Action | Learner sees |
   |---|---|---|
   | Real exam content, or a "dump" offer | **Delete exam content** (⋯ menu, it asks once: the text is deleted for good; the log keeps only the action), which also warns. A second offence or a dump seller: **Ban** (it asks why, then once more). | Removal notice: "appears to share real exam content", and the warning |
   | Harassment, hate, threats, sexual content | **Remove + warn**; a serious case: **Suspend 7 days** or **Ban** (each asks why) | Notice |
   | A reported **member** (an offensive or impersonating name, a pattern) | **Suspend**, **Ban**, or **Dismiss reports**; an offensive name: **Members → Rename** (a plain new name, logged) | A suspension notice; nothing for a rename |
   | Personal info (theirs or others') | **Remove** (reason Personal information); no warning for their own details on a first offence | Notice |
   | Spam or ads | **Remove**, then **Ban** (account under 7 days old) or warn | Notice |
   | Copyrighted pages | **Remove + warn** | Notice |
   | Off topic | **Hide** (⋯) or **Remove**, no warning | Notice when removed |
   | Fine | **Approve** (puts it back, dismisses the reports; once you've looked, one report can't hide it again: three established members' can) | Nothing |
   | Talks about a practice question's answer, not folded | ⋯ **Fold it** (readers tap "Show it" first) | Nothing |

   Each report shows the words **as they were when reported**, even if the
   author edited them since.

2. **Held**, oldest first:
   - "new member": approve, or act as above (approving lifts their
     pre-moderation: their later posts appear straight away);
   - "exam recall": read with care. If in doubt, remove it (the risk is
     one-sided), and tune the word lists monthly (§12);
   - "held words": a threat or self-harm content: see §11.
3. **Appeals**: re-read the item as if it were new. **Put back** or **Keep
   removed**. The learner is told either way.
4. **Content concerns that name one of our questions** (a `q:` link): don't
   argue the answer key in public. Move it to the private triage in §3 (the
   reviewers' process) and post the official response: "Thanks. We're
   checking this question privately and will update this post."
5. **Statuses:**
   - every new post gets a status within 7 days (Under review, Answered,
     Duplicate, or Not planned with a reason);
   - each month, give the top 20 by priority (`private.board_priority`) an
     official response;
   - when something ships, set **Shipped** with the version. What's new
     carries the general line "Some of these changes started as ideas on the
     feedback board. Thank you to everyone who posted and voted." (no names,
     no counts).

## 9. Exam content and takedowns

- Never paraphrase removed exam content into the bank or the notes. Log only
  "rejected: possible live exam content".
- **Rights-holder takedowns** (for example from ISACA) arrive at the support
  inbox. Remove the content within 24 hours (Delete exam content, or Remove
  with "Copyrighted material"), reply in writing with §10, and keep the email.
- **DMCA agent:** an owner decision (Phase 9). Without one, remove anything a
  rights holder flags at once.

## 10. Canned board notices and replies

The app writes the removal, warning, suspension and appeal notices itself
(`mobile/src/content/cloud/copy.ts`, `board.notice.*`); nothing to send. Two
email templates:

- **Takedown acknowledgement:** "Thank you. We've removed the post you
  identified and closed the matter on our side. If you see anything else,
  reply to this email."
- **Ban appeal by email:** "Thanks for writing. We looked at your account
  again and {the ban stands / we've restored your access}. Our community
  guidelines are at {url}."

## 11. Escalations

- **A credible threat of violence or harm:** remove it, ban, and keep a
  private record (the log plus a screenshot stored outside the inbox). If
  someone is in immediate danger, contact local emergency services with what
  you know.
- **Self-harm content:** hold or remove it, and email a kind note if you can:
  "We've hidden your post. If you're going through a hard time, please reach
  out to someone you trust or a local support line. You're welcome on the
  board any time."
- **Anything illegal**, or a legal letter: pause posting if it is spreading,
  and escalate to the owner. This is a "major" item (CLAUDE.md).

## 12. Records and metrics (SQL only; no analytics in the app)

- Weekly:
  - time to action at p95 (target under 24 hours);
  - holds, and holds that turned out fine (false positives);
  - removed ÷ total (target under 2%);
  - new posts with a status within 7 days (target at least 90%).
- Monthly: tune `private.moderation_terms` (plain words only, kinds `block`,
  `hold`, `reserved_handle`, `link_domain`: never patterns), review the
  recall weights in `mobile/src/engine/leakGuard.ts`, and compare verified
  votes (accounts 7+ days old) with raw votes on the top 20.
- Retention:
  - `private.moderation_log` keeps 12 months (a pg_cron purge, set at Phase 9);
  - removed bodies are kept 30 days for appeals, then cleared (exam content:
    at once, by Delete exam content);
  - the rate-limit counts (`private.board_events`) keep 2 days;
  - this matches the privacy draft (`docs/legal/cloud/privacy.html`).
- UK OSA / EU DSA: keep the illegal-content and children's-access risk
  assessments (owner and counsel) with this playbook. The moderator is the
  named responsible person.
