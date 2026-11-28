# KaiSip emails in Kit: step by step

This folder holds a KaiSip email design for Kit and the first emails that use it.
You paste them into Kit yourself. Nothing here changes the website or the apps.

**Read this first.** Nobody could log in to Kit while this was made, and Kit's help
site could not be opened from here. Kit's menu names below come from Kit's help
articles as search results showed them, so a button may have a slightly different
name on your screen. Everything that could not be checked is listed in
"What could not be checked" at the end. Kit's editor will tell you if a tag name is wrong.

## What is in this folder

| File | What it is |
|---|---|
| `kaisip-kit-template.html` | The KaiSip email design (header, body styles, footer). Pasted into Kit once. |
| `emails/waitlist-confirm.txt` | The "confirm your email" message for the iPhone waitlist: the exact words for each box. |
| `emails/waitlist-welcome.html` and `.txt` | Sent once, right after someone confirms. |
| `emails/iphone-launch.html` and `.txt` | A draft for the day the iPhone app is ready. Has two blanks to fill in. |
| `emails/news-confirm.txt`, `emails/news-welcome.html` and `.txt` | For the "study tips and news" list. That sign-up form is not built yet, so keep these for later. |
| `assets/email/kaisip-email-logo-forest.png` (in the repo's `assets/` folder) | The one picture the emails use. It is published on kaisip.com with the website (step 1). |
| `previews/` | Four pictures of how the emails should look (phone light, desktop light, dark, pictures blocked). |

Each `.html` file is the designed version. Each `.txt` file is the same words as plain text.

## Step 1. Check the logo is on kaisip.com

The emails show one picture, the logo. It is published with the website at:

`https://kaisip.com/assets/email/kaisip-email-logo-forest.png` (336 x 96 pixels, shown at 168 x 48)

How to check: open that address in your browser. If you see the KaiSip logo on a
green tile, go on to step 2. If not, the website update that carries it has not
gone live yet; steps 2 to 4 still work, and the header shows the word "kaisip" in
text on green, which is also what people see when their inbox blocks pictures.

## Step 2. Set who the emails come from

In Kit, click your account name (top right), then **Settings**.

1. **Sender name:** `KaiSip`
2. **Sender email address:** best is an address at your own website, for example
   `hello@kaisip.com`. Kit's help says the address should not be a free one
   ending in @gmail.com, @yahoo.com and so on, because inboxes trust those less
   and more emails land in spam. If you only have the Gmail support address today,
   you can start with it and change it later. Kit sends a link to the address you
   enter; click it to confirm the address is yours.
3. **Postal address:** every marketing email must show a postal address by law.
   Kit asks for one in Settings. If you do not want your home address in emails,
   Kit offers its own address for this (look for that choice beside the address box).
   The template shows whatever you save here.

These are usually under **Settings > Email** (sender) and **Settings > General**
(postal address). The exact place could not be checked.

## Step 3. Create the template and paste the HTML

1. In Kit's top menu, click **Send**, then **Email Templates**.
2. Click **+ New email template**.
3. Scroll down past the ready-made designs and choose the **HTML** option
   (Kit's help calls it **Create HTML Template**).
4. Name it `KaiSip`.
5. Open `kaisip-kit-template.html` on your computer in a plain text editor
   (Notepad on Windows, TextEdit on Mac). Select all, copy.
6. In Kit, delete everything in the code box, then paste.
7. Click **Save**.
8. Back on the Email Templates page, click the **three dots** next to `KaiSip`
   and choose **Set as default**. A green "Default" label appears.

If Kit refuses to save, it says why. The template already contains the three
things Kit requires:

- `{{ message_content }}` : where each email's words go. This name follows Kit's
  usual convention and was not checked in a login. **Kit's editor will tell you if this tag name is wrong.**
- `{{ unsubscribe_url }}` : the unsubscribe link.
- `{{ address }}` : your postal address from step 2.

Do not change these three tags, including the curly brackets.

**If there is no HTML option,** your plan does not allow it. Go to
"Fallback: Kit's visual editor" near the end.

## Step 4. Send yourself a test

Use the welcome email as the test. You will not send it to anyone but yourself.

1. Click **Send**, then **Broadcasts**, then **+ New broadcast**.
2. If Kit asks for a template, choose `KaiSip`.
3. Subject: `You're on the KaiSip iPhone waitlist`
4. Leave Kit's **Preview text** box empty. The file already carries its own hidden preview line.
5. Click in the empty body. Type `/` (or click the **+** at the start of the line)
   and choose **HTML**. A code box appears.
6. Open `emails/waitlist-welcome.html` in your text editor, select all, copy, and
   paste it into that code box.
7. Click **Preview**, then choose to **send a test email** to your own address.
8. Do **not** press Send or Schedule. Close the broadcast. Kit keeps it as a draft.

If the editor has no HTML block: open `emails/waitlist-welcome.txt` instead and
type or paste the words in. Then use the editor's format menu: make "You're on
the list." a **Heading 1**, the short section titles a **Heading 2**, and the
dash lines a bullet list. The template styles them for you. To get the green
italic words, select them inside the heading and press italic.

### What to check on your phone

Open the test email in the **Gmail app** and tick these off. Compare with the
pictures in `previews/`.

Light mode (phone set to light):
- [ ] A dark green header with the KaiSip logo on the left and a soft leaf pattern on the right.
- [ ] Body text is dark and easy to read. The headline is in a serif font, with "the list." in green italics.
- [ ] The green panel "Study now, in Safari." has a pale button, and tapping it opens kaisip.com/app.
- [ ] Nothing runs off the side of the screen. You never need to scroll sideways.
- [ ] The footer shows why they got the email, an **Unsubscribe** link, your postal address, and the ISACA line.

Dark mode (phone Settings > Display > Dark, then reopen the email):
- [ ] All text is still easy to read. No dark text on a dark background.
- [ ] The logo is still clear. Gmail may recolour the header. The logo sits on its
      own green tile so that it stays readable whatever Gmail does. A lighter
      header with a darker green logo tile is expected and fine
      (see `the dark preview in `previews/``).
- [ ] Buttons still look like buttons and their words are readable.

Pictures off (Gmail app > menu > Settings > your account > Images > "Ask before
displaying external images", then reopen the email):
- [ ] The header shows the word "kaisip" in pale text on green. The rest looks
      the same, because nothing else is a picture
      (see `previews/waitlist-welcome-375-images-off.png`).

Also:
- [ ] The grey preview line in the inbox list reads "What we'll email you about, and how to study on your iPhone today."
- [ ] Tap **Unsubscribe**. It should open Kit's unsubscribe page. In a test email Kit may show a notice instead of a real page; that is normal.
- [ ] If you can, look once on a computer (gmail.com) and once in Apple Mail or Outlook.

If something looks wrong, take a screenshot and send it to Claude with the name of the app you used.

## Step 5. The confirmation email for the waitlist (form 10207004)

This is the first email people get: "confirm your email". Kit calls it the
**incentive email**. It has its own short editor.

1. Click **Grow**, then **Landing Pages & Forms**, and open the waitlist form
   (its web address ends in `10207004`).
2. Click **Settings**, then **Incentive**.
3. Keep "Send incentive email" (the confirmation email) **on**. Keep **Auto-confirm off**.
   Do not change the redirect address; it should stay `https://kaisip.com/waitlist-confirmed`.
4. Click **Edit Email Contents**.
5. Type the words from `emails/waitlist-confirm.txt` into each box:

| Box | Type exactly |
|---|---|
| Subject | `Confirm your place on the KaiSip iPhone waitlist` |
| Preview text (if there is a box) | `One tap and you are on the list.` |
| First line, set to Heading 1 (optional) | `Confirm your place` |
| Text above the button | `Tap the button to confirm. We'll email you when the iPhone app is ready and when new KaiSip courses open. Nothing else.` |
| Button label | `Confirm my email` |
| Text below the button | `If you didn't sign up, ignore this email and you won't hear from us.` |

6. **Never delete Kit's button.** It carries the confirm link. Only change its words.
7. Do not paste HTML into this editor, and do not use the name tag
   (`{{ subscriber.first_name }}`). We do not collect names, and Kit's help says
   name tags may not work in this email.
8. Click **Save**.

**Will it wear the KaiSip design?** Kit's help says the confirmation email uses
your **default template**. If step 3 worked and `KaiSip` is the default, it
should look like `previews/waitlist-confirm-375-light-plain-kit-tags.png`. This
could not be checked without a login. If it comes out plain, that is fine: the
words above are complete without the design.

**Button colour.** Kit's help says this button takes the colour of the form's
own button. In the form editor, click the form's button and set its colour to
`#1E4A34` and its text colour to `#F7F5EF`. This does not change kaisip.com,
which has its own form.

**Test it for real:** open kaisip.com in a private browser window, join the
waitlist with a second email address of yours, and check that the email arrives,
looks right in light and dark, and the button lands on "You're on the list".
Then delete that test subscriber in Kit.

## Step 6. The welcome email (once, after confirming)

**Optional, and our advice is to skip it for the iPhone waitlist.** The waitlist
promises emails about two things only (the iPhone app being ready, and new
KaiSip courses) and "Nothing else". The page people land on after confirming
already tells them what happens next, so a welcome email adds nothing they were
promised. Keep the file for the "study tips and news" list later, where a
welcome is expected. The steps below are here in case you decide otherwise.

This needs Kit to send an email automatically when someone confirms.

1. Click **Send**, then **Sequences**, then **+ New sequence**. Name it `iPhone waitlist welcome`.
2. Keep one email only. Set it to send **immediately** (0 days after joining).
3. Subject: `You're on the KaiSip iPhone waitlist`. Template: `KaiSip`.
4. Paste `emails/waitlist-welcome.html` into an HTML block, as in step 4.
5. Set the email's status to **Published**, then save.
6. Click **Automate**, then **Visual Automations**, then **+ New automation**.
   Start: **Joins a form**, pick the waitlist form. Next step: **Email sequence**,
   pick `iPhone waitlist welcome`. Turn the automation on.

Two things to know:

- **Do not send this welcome to people who already confirmed.** They were told
  they would hear about the iPhone app and new courses, "nothing else". The
  automation only reaches people who join from now on.
- Whether your plan includes a sequence and an automation could not be checked.
  If it does not, skip this step. The page people land on after confirming
  already says "You're on the list".

## Step 7. Keep the launch email as a draft

1. Make a new broadcast as in step 4. Subject: `KaiSip for iPhone is ready`.
2. Paste `emails/iphone-launch.html` into an HTML block. Save it as a draft. Do not send.

On launch day, before sending, replace two blanks in the pasted code:

| Find | Replace with |
|---|---|
| `[[LAUNCH DATE]]` (once, in the first paragraph) | The date, for example `12 March 2027`. Or use `today`. |
| `[[APP STORE LINK]]` (once, inside the button: `href="[[APP STORE LINK]]"`) | The full App Store address, starting with `https://apps.apple.com/` |

Then search the code for `[[`. If nothing is found, send yourself a test, tap the
button on your iPhone, and only then send it to the waitlist. Before sending,
re-read the three "What you'll find inside" lines and check each one is true of
the iPhone app on that day.

## Later: the "study tips and news" list

The sign-up tick box "Email me KaiSip study tips and news" needs its own Kit form,
which is not built yet. When it is:

- Confirmation email: use `emails/news-confirm.txt`, the same way as step 5.
- Welcome email: use `emails/news-welcome.html`, the same way as step 6.

One decision is yours: these emails promise **"a few times a month at most"**.
If you want a different promise, change that sentence in both files before using them.
The privacy page will also need a short section about this list before the form goes live.

## Fallback: Kit's visual editor (if your plan has no HTML templates)

You can get close with Kit's own template editor. The green header band and leaf
pattern cannot be made there; the logo tile on a paper background stands in for them.

1. **Send > Email Templates > + New email template**, pick the plainest
   starting design (a "Text only" or "Classic" one), name it `KaiSip`.
2. In the styles panel, enter these. Box names may differ a little.

| Setting | Value |
|---|---|
| Page background | `#F3F1EA` |
| Content (email body) background | `#FCFBF7` |
| Content width | `600` |
| Content border, if offered | 1 px, `#DFDCD1`, corner radius `20` |
| Body font | **Helvetica** or **Arial** (whichever Kit lists) |
| Body text size and colour | `17` px, `#17231B`, line height `1.6` |
| Heading font | **Georgia** |
| Heading 1 | `32` px, normal weight (not bold), `#17231B` |
| Heading 2 | `23` px, normal weight (not bold), `#17231B` |
| Heading 3 | Arial or Helvetica, bold, `12` px, `#24603F` |
| Link colour | `#24603F`, underlined |
| Button background | `#1E4A34` |
| Button text | `#F7F5EF`, bold, `17` px |
| Button corner radius | the highest Kit allows (`999`, or at least `24`) so it is a pill |
| Divider line | 1 px, `#DFDCD1` |
| Footer text | `13` px, `#465349` |

3. **Logo:** add an image block at the top, left aligned. Upload
   `publish/kaisip-email-logo-forest.png`. Set its width to `168`. Alt text:
   `KaiSip`. Link: `https://kaisip.com`. Use this green tile, not the spare light
   logo: the light logo has dark letters that disappear when an inbox turns dark.
4. **Footer text**, in this order (keep Kit's unsubscribe link and address as Kit provides them):

   > Make room for better thinking.
   >
   > You're getting this because this email address was signed up for KaiSip emails, on the iPhone waitlist at kaisip.com or in the KaiSip app.
   >
   > Unsubscribe · Privacy (link to `https://kaisip.com/privacy`) · kaisip.com
   >
   > (your postal address, which Kit adds)
   >
   > KaiSip is independent and not affiliated with or endorsed by ISACA. CISA is a registered trademark of ISACA.

5. If the editor has a **Custom CSS** box, paste this to get the small green labels and the green italics:

```css
h3{letter-spacing:1.8px;text-transform:uppercase;color:#24603F;font-size:12px}
h1 em,h2 em,h1 i,h2 i{color:#24603F;font-style:italic}
h1,h2{font-weight:normal}
```

6. Set it as the default template, then do steps 4 to 7. In this fallback, type
   the `.txt` versions and format them with the editor's menu. The green panel and
   the leaf bullets in the `.html` files will only work if the editor still offers an HTML block.

## What could not be checked

- **Kit's screens.** Menu and button names in steps 2 to 7 and in the fallback
  come from Kit's help articles as summarised by a web search. Kit's help site
  itself could not be opened from here, and nobody logged in.
- **The tag `{{ message_content }}`** (Kit's usual name for the body slot).
  `{{ unsubscribe_url }}` and `{{ address }}` were confirmed from Kit's developer reference.
- **Whether your plan allows HTML templates,** a sequence and an automation.
- **Whether the confirmation email really uses the default template,** and what
  Kit's own confirm button looks like inside it.
- **Whether Kit's editor has an HTML block,** and whether it keeps the code
  exactly as pasted. If Kit strips parts of it, the email still reads correctly
  but some styling (dark mode colours, the leaf bullets) may be lost.
- **Whether Kit adds anything of its own,** such as a "Built with Kit" badge on
  free plans or its own preview-text line.
- **Real inboxes.** The preview pictures were made in a browser with stand-in
  fonts that match Georgia and Arial in size. The dark pictures show apps that
  follow the phone's dark setting (Apple Mail). Gmail and Outlook recolour
  emails in their own way; one picture simulates the strongest case. Only the
  test on your phone (step 4) proves it. Old Outlook on Windows shows square
  corners and small green squares instead of leaves; the email is still correct.
- **The words "a few times a month at most"** in the news emails, and whether a
  welcome email fits the waitlist's "nothing else" promise, are your decisions.
- **The Apple trademark line** in the launch email ("iPhone and App Store are
  trademarks of Apple Inc.") should be checked against Apple's rules at launch.
