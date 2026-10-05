# Running Aurivan on the Android emulator, with live updates

Written for a beginner. Every step says what it does and why it matters.
Same idea as Salapify's "run it yourself" guide, adapted for Aurivan, which
is built with **Expo (React Native)** instead of Flutter.

The goal: the Aurivan app running on an Android emulator on your MacBook,
updating by itself whenever new code arrives, so you can tap through a
feature instead of looking at a screenshot of it.

---

## What you need

| Tool | Why | You probably have it? |
|---|---|---|
| **Android Studio** | Gives you the **emulator** (the simulated phone) and the Android SDK | Yes, from Salapify |
| **Node.js 20 or newer** | Runs Expo's tools and installs Aurivan's libraries. Aurivan's equivalent of Flutter | Check below |
| **VS Code** (Visual Studio Code) | To open the project and use its built-in Terminal | Yes |
| **Git** | To get the code from GitHub | Yes |

Unlike Salapify, you do **not** need to install Flutter, Java or Xcode for this.

### Check Node.js

Open VS Code → menu **Terminal → New Terminal**, and run:

    node --version

- **A number like `v20.x` or `v22.x`** → good, skip ahead.
- **"command not found"** or a number below 20 → install it:

      brew install node

  (`brew` is Homebrew, the same tool you used for Flutter. If `brew` is
  missing, install it from https://brew.sh first.)

---

## Step 1 — Get the Aurivan code (once)

In the VS Code Terminal, go to where you keep projects and clone:

    cd ~/Projects                      # or wherever you keep code
    git clone https://github.com/icedamericanodev/aurivan.git
    cd aurivan

Then open it in VS Code: **File → Open Folder… → aurivan**.

If you already cloned Aurivan before, just update it instead:

    cd ~/Projects/aurivan
    git checkout main
    git pull

## Step 2 — Install the app's libraries (once, and after library changes)

    cd mobile
    npm install

What this does: downloads every library the app uses into
`mobile/node_modules/`, **and** automatically builds the question pack from
`data/domain*.json`. You should see a line like:

    ✓ content pack built: … questions → src/content/generated/

**The first install takes a few minutes.** Later ones take seconds.

## Step 3 — Start the emulator (same as Salapify)

If you already made a Pixel emulator for Salapify, reuse it. Skip to 5.

1. Open **Android Studio**.
2. Welcome screen → **More Actions → Virtual Device Manager**
   (if a project is open: **Tools → Device Manager**).
3. **Create Device** → pick **Pixel 7** (or any recent Pixel).
4. System image: **API 34 or newer**. Click **Download** if shown, wait.
5. Press the **▶ play** arrow next to the device. A phone appears. Leave it
   running.

## Step 4 — Run Aurivan on the emulator

In the VS Code Terminal, inside the `mobile` folder:

    npx expo start --android

What happens, in order:

1. Expo starts a **dev server** (it bundles the app's code and serves it).
2. It finds your running emulator and installs **Expo Go** on it the first
   time — a free app that runs Expo projects during development.
3. Aurivan opens inside Expo Go on the emulator.

**The first launch takes a minute or two** while the code is bundled. After
that it is near-instant.

You should see the onboarding screen: *"Which exam are you preparing for?"*

### Keys you can press in that Terminal window

| Key | What it does |
|---|---|
| **r** | Reload the app (fresh start, keeps saved progress) |
| **a** | Open the app on Android again (if you closed it) |
| **j** | Open the debugger |
| **m** | Toggle the in-app developer menu |
| **Ctrl-C** | Stop the dev server |

---

## Live updates — the part that saves you time

### Option A: let a script do it (recommended)

When I (Claude) work in a cloud session and **push** commits, run this
instead of Step 4, with the emulator already open:

    cd mobile
    bash scripts/dev-sync.sh

It starts the app **and** watches GitHub. Every 15 seconds it checks for new
commits, pulls them, and prints what changed. It also:

- rebuilds the question pack if questions changed, and
- runs `npm install` and restarts the dev server if libraries changed.

You do not type anything after that. Stop it with **Ctrl-C**.

> **Which branch?** It watches the branch you are on. To test a pull request
> before merging, switch to its branch first:
> `git fetch origin && git checkout claude/jolly-archimedes-p1sklr`
> (the PR page shows the branch name). To test what is live, stay on `main`.

### Option B: by hand

Leave `npx expo start --android` running. In a **second** Terminal tab
(the **+** in VS Code's Terminal panel):

    git pull

The app updates **by itself** within a second or two. Expo's dev server
watches the files and pushes changes to the emulator ("Fast Refresh").

Two exceptions:

| If the pull changed… | Do this |
|---|---|
| Questions (`data/domain*.json`) | `cd mobile && npm run content` |
| Libraries (`mobile/package.json`) | Stop with Ctrl-C, run `npm install`, then `npx expo start --android` again |

I will tell you when either happens. It is rare.

**If a screen still looks old:** press **r** in the dev server window
(full reload). If *that* still shows old code, stop with Ctrl-C and run
`npx expo start --android -c` (the `-c` clears Expo's cache), and check
`git branch --show-current` to confirm you are on the branch you expect.

---

## What to test — a 10-minute tour

1. **Onboarding:** pick CISA (others show "Coming soon"), pick an exam date.
2. **Home:** readiness 0%, domain bars, "Practise IS Audit (10)".
3. **Practice a question:** tap an option → choose Sure/Unsure/Guessing →
   **Submit answer**. Check:
   - the green ✓ / red ✗ marks,
   - "Why X is tempting but wrong" uses the **same letter you tapped**,
   - tips reveal one at a time (Trap → Mindset → Exam-day).
4. **Answer a few wrong on purpose**, end the session → Results → **Practise
   the ones I missed**.
5. **Home → Spaced review** now shows questions due.
6. **Mock tab → Mini mock:** answer a few, **flag** one (⚐), open the grid
   (▦), then **Pause**. Swipe the app away completely, reopen it, and check
   Home shows **Resume** with your answers still there.
7. **Settings:** switch Dark/Light, toggle shuffle off and see options stay
   in A–D order, try the daily reminder.
8. **Android back button** inside a quiz should ask before leaving.

Found something odd? Tell me the screen, what you tapped, and what you
expected. A screenshot (⌘-S in the emulator toolbar) helps a lot.

---

## Things worth knowing before they confuse you

**It starts completely empty.** No answers, 0% readiness, no streak. That is
exactly what a brand-new learner sees, which makes it the most honest test.

**To reset to a brand-new install:** long-press the Expo Go icon → **App
info → Storage → Clear storage**, or in Aurivan: **Settings → Reset CISA
progress**.

**Daily reminders in Expo Go:** Expo Go has limited notification support, so
the reminder toggle may show a warning or not fire. That is an Expo Go
limitation, not an Aurivan bug. Reminders are fully testable in a
"development build" (below).

**Your progress lives on the emulator only.** Accounts and sync come in a
later phase.

---

## Running on your real Android phone instead

Better for judging how it feels in your hand.

**Easiest (no cable):** install **Expo Go** from the Play Store on your phone.
Make sure the phone and Mac are on the **same Wi-Fi**. Run `npx expo start`
(without `--android`) and scan the QR code it prints using the Expo Go app.

**With a USB cable:** turn on Developer options (Settings → About phone → tap
**Build number** 7 times) → turn on **USB debugging** → plug in → trust the
computer → `npx expo start --android`.

If the QR code won't connect (office or hotel Wi-Fi often blocks it), use:

    npx expo start --tunnel

---

## Troubleshooting

| You see… | It means | Fix |
|---|---|---|
| `No Android connected device found` | The emulator isn't running yet | Start it in Android Studio (Step 3), then press **a** |
| `command not found: npx` | Node.js isn't installed | `brew install node` |
| `✗ missing source file … domain1.json` | You ran it outside the repo, or `data/` is missing | Run from `aurivan/mobile` in a full clone |
| Red error screen about a missing module | Libraries changed since your last install | Ctrl-C → `npm install` → start again |
| App is stuck on an old version | Cached bundle | Ctrl-C → `npx expo start --android -c` |
| `Could not fast-forward` from dev-sync | You edited files locally, or a branch was reset after a merge | `git status`; if you have no changes you need: `git fetch origin && git reset --hard origin/<branch>` |

---

## What is NOT set up yet, said plainly

- There is no installable APK file yet. That needs an Expo account and an
  **EAS build** (`npx eas-cli@latest build --profile preview --platform android`),
  which produces a link you can open on any Android phone. It is the next
  milestone on the roadmap (`docs/mobile/ARCHITECTURE.md`, Phase 1).
- A **development build** (a custom version of Expo Go with Aurivan built in,
  needed for full reminder testing) comes with that same step.
